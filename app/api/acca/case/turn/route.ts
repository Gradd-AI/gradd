import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import {
  sealPayload,
  openPayload,
  call1_generate,
  runTeachTurn,
  type ClientSessionState,
} from '@/lib/acca/teach-engine';
import { hasPaperAccess } from '@/lib/acca/access';
import { resolvePaper, strictPaper } from '@/lib/acca/paper';
import { shouldRunTeachLoop } from '@/lib/acca/case-sit';
import { mockContentAllowed, caseIsReserved } from '@/lib/acca/mock-access';
import { paperForCase } from '@/lib/acca/mocks';
import { describeDemand, nextMoveContract } from '@/lib/acca/teach-demand';
import { extractDiscriminants, detectContradictions, renderDiscriminants } from '@/lib/acca/tutor-discriminants';

// ── APM case-turn handler (redesign P0 item 1 — case-scope construct) ──────────
// Behind APM_CASES (default OFF). Flag off → 404. Runs the EXISTING withhold engine
// (lib/acca/teach-engine → runTeachTurn, a faithful copy of the tutor route's §7)
// scoped to ONE active requirement. The proven single-drill route is untouched.
//
// Seal discipline (item 2): the active requirement's model_answer is sealed exactly
// as a drill's is — its OWN per-requirement AES-256-GCM blob {answer, counted}. Each
// requirement carries its own seal; no seal is shared across requirements. The shared
// scenario (intro + exhibits) is passed as `context` to every call but is NEVER sealed.
//
// v1 scope: each requirement is completed in turn on the shared scenario. NO synthesis
// across requirements (that is v2). final_answer is POPULATED on pass but not consumed.
//
// SIT MODE (`sitting: true`, mock-engine Phase 2b): records the student's SINGLE
// submitted answer as final_answer and returns — NO runTeachTurn (no hint/diagnose/
// miss churn), `passed` never written (a sit is graded later by the technical band pass,
// not by turn-time correctness). A blank submission ('' — an unanswered requirement
// at move-on or timeout) is a valid, final, zero-credit answer, recorded as ''.
// PRACTICE mode (sitting=false, the default) is entirely unchanged.
//
// PAPER SCOPING: `paper` (body field, resolvePaper, default 'APM') is checked when
// the case is fetched, so a cross-paper case_id/requirement_id pairing 404s. Once
// the case fetch is correctly paper-scoped, the requirement fetch (scoped by both
// requirement_id AND case_id below) is transitively correct — no separate filter
// needed on acca_case_requirements.
const CASES_ENABLED = process.env.APM_CASES === '1';

export async function POST(request: Request): Promise<Response> {
  if (!CASES_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!process.env.TUTOR_SESSION_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // ── 1. Auth ──
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // ── 2. Parse body ──
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { case_id, requirement_id, session_state, student_message, last_ezra_message, paper: paperRaw, sitting: sittingRaw } = body as {
    case_id?: unknown;
    requirement_id?: unknown;
    session_state?: unknown;
    student_message?: unknown;
    last_ezra_message?: unknown;
    paper?: unknown;
    sitting?: unknown;
  };

  const caseId        = typeof case_id === 'string' && case_id ? case_id : null;
  const requirementId = typeof requirement_id === 'string' && requirement_id ? requirement_id : null;
  const lastEzraMessage = typeof last_ezra_message === 'string' ? last_ezra_message : '';
  const paper = resolvePaper(paperRaw);
  // Strict paper for the entitlement gate — no default. See app/api/acca/case/route.ts
  // for why the gate must not inherit resolvePaper's APM fallback. SitRunner already
  // sends `paper` explicitly on every sit write; CaseSession now does too.
  const gatePaper = strictPaper(paperRaw);
  const sitting = sittingRaw === true;

  if (!caseId || !requirementId) {
    return NextResponse.json({ error: 'case_id and requirement_id required' }, { status: 400 });
  }
  if (!gatePaper) {
    return NextResponse.json({ error: 'paper is required (APM or AFM)' }, { status: 400 });
  }
  // A sit may record a BLANK answer (an unanswered requirement at move-on/timeout);
  // practice needs a real turn to teach against, so it still requires non-empty text.
  if (typeof student_message !== 'string') {
    return NextResponse.json({ error: 'student_message required' }, { status: 400 });
  }
  if (!sitting && !student_message.trim()) {
    return NextResponse.json({ error: 'student_message required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── 2b. Subscription gate (hard) ──
  // Exam cases require an active APM subscription / unexpired pass. 402 → the
  // client shows the upsell inline (edge: lapse mid-session).
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  if (!(await hasPaperAccess(supabase, user.id, gatePaper, profile))) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 402 });
  }

  // ── MOCK CONTENT: MODE-KEYED, not attempt-scoped (2026-07-30) ──
  // This route is BOTH the practice teach loop and the sit's single write path, so the
  // rule here cannot be the flat refusal app/api/acca/case now applies.
  //
  //   • PRACTICE (sitting=false) — refused. Teaching on a mock requirement is the same
  //     leak as fetching one, through a different door: without this, a case id was enough
  //     to run the teach loop over reserved exam content — hints, diagnosis and all.
  //   • SIT (sitting=true) — allowed. This is how a sit records an answer. The previous
  //     change-set deliberately collapsed the two sit write implementations into this one
  //     route so there is a single immutability rule; refusing here would break the sit
  //     this route exists to record.
  //
  // The attempt-scoped carve-out that used to gate BOTH modes is gone: it existed because
  // the APM mock loaded through app/api/acca/case, which no longer happens. Note the
  // asymmetry is deliberate and is the whole rule — `sitting` decides, nothing else.
  //
  // The case is fetched here purely for `mock_only`; each branch below still performs its
  // own gated fetch, unchanged. Refusal is the same 404 both branches already return for an
  // unservable case, so nothing distinguishes "reserved" from "does not exist".
  {
    const { data: mockCheck } = await supabase
      .from('acca_cases')
      .select('mock_only')
      .eq('id', caseId)
      .eq('paper_code', paper)
      .eq('status', 'approved')
      .eq('published', true)
      .maybeSingle();
    const reserved = caseIsReserved(caseId, mockCheck?.mock_only as boolean | null | undefined);
    if (!mockContentAllowed(reserved, sitting ? 'sit' : 'practice')) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
  }

  // ── SIT MODE — record the single submitted answer, no teach loop ──
  // Skips the engine entirely: no model call, no seal, no hint/diagnose/miss churn.
  // Records final_answer (blank '' allowed) and NEVER WRITES `passed`. The column carries
  // a NOT NULL DEFAULT FALSE, so the row reads back `passed = false`, not null (measured
  // 2026-07-29, 7/7 sit rows) — never probe this path with a null check. A sit is graded
  // by the technical band pass at case/mark, not by turn-time correctness.
  if (!shouldRunTeachLoop(sitting)) {
    // Validate the requirement belongs to this (subscription-gated) case, and that
    // the case is servable + paper-scoped — same serving gate as the practice path.
    const { data: sitCase } = await supabase
      .from('acca_cases')
      .select('id')
      .eq('id', caseId)
      .eq('paper_code', paper)
      .eq('status', 'approved')
      .eq('published', true)
      .single();
    if (!sitCase) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 });
    }
    const { data: sitReq } = await supabase
      .from('acca_case_requirements')
      .select('id')
      .eq('id', requirementId)
      .eq('case_id', caseId)
      .single();
    if (!sitReq) {
      return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
    }

    // ── A FINISHED PAPER TAKES NO MORE ANSWERS (added 2026-07-31 with the countdown) ──
    // The clock is enforced in two places for two different reasons. The BROWSER runs the
    // countdown and fires the auto-submit — that needs sub-second resolution and is the act of
    // submitting, so it belongs there. This is the SERVER half: once the attempt for this
    // case's own paper is `completed`, no further answer is accepted, so closing the tab and
    // posting later cannot add work to a finished paper.
    //
    // KEYED ON `completed`, NOT ON `now > ends_at`, and that is deliberate. The auto-submit's
    // own POST lands milliseconds AFTER the deadline; refusing on the timestamp would throw
    // away the answer the candidate had just written, which is a worse failure than the one it
    // prevents. The auto-submit records first and finishes second, so there is no race to lose.
    //
    // Scoped to the case's OWN paper via `paperForCase`: a finished APM attempt must not block
    // an AFM sit. A case that belongs to no mock paper has no attempt to be closed and is
    // unaffected.
    // ── WHICH SITTING IS THIS? ──
    // A sit answer belongs to an attempt, structurally — that is what makes it distinguishable
    // from practice work on the same requirement. Resolved here once and used for both the
    // closed check and the write.
    const ownPaper = paperForCase(caseId);
    let attemptId: string | null = null;
    if (ownPaper) {
      const { data: attempt } = await supabase
        .from('acca_mock_attempts')
        .select('id, completed')
        .eq('user_id', user.id)
        .eq('mock_id', ownPaper.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (attempt?.completed === true) {
        return NextResponse.json({ error: 'attempt_closed' }, { status: 409 });
      }
      // No open attempt at all → this is not a sitting. Refusing is the honest answer: the
      // alternative is writing an unattributable row, which is the ambiguity being removed.
      if (!attempt) {
        return NextResponse.json({ error: 'no_open_attempt' }, { status: 409 });
      }
      attemptId = (attempt as { id: string }).id;
    }

    const finalAnswer = typeof student_message === 'string' ? student_message : '';

    // ── A SUBMITTED SIT ANSWER IS IMMUTABLE ──
    // Enforced SERVER-SIDE, not by hiding a back button: once a requirement has a
    // recorded answer it can never be rewritten, so a replayed or hand-crafted POST
    // cannot overwrite submitted work either. This guarantee previously lived in
    // app/api/acca/sit/route.ts; it moved HERE when the AFM sit stopped using its own
    // endpoint and started writing through this route, and it must not be weakened —
    // the upsert below would otherwise silently overwrite a committed answer.
    //
    // Note `final_answer != null` is the test, not truthiness: a BLANK answer ('') is a
    // valid, final, zero-credit submission (a requirement moved past on purpose) and is
    // just as immutable as a written one.
    //
    // ── SCOPED TO THIS ATTEMPT (corrected 2026-08-01) ──
    // It used to look up the row by (user, case, requirement) alone, which matched a PRACTICE
    // row too — so a student who had practised a case could NEVER sit it: every submission
    // 409'd against their own practice answer, permanently. Any user who met a mock case
    // through the old MockRunner (which ran at sitting=false) was in exactly that position.
    // "Already submitted" now means already submitted IN THIS SITTING.
    const { data: recorded } = await supabase
      .from('acca_case_progress')
      .select('final_answer')
      .eq('user_id', user.id)
      .eq('case_id', caseId)
      .eq('requirement_id', requirementId)
      .eq('attempt_id', attemptId)
      .maybeSingle();
    if (recorded && recorded.final_answer != null) {
      return NextResponse.json({ error: 'already_submitted' }, { status: 409 });
    }

    try {
      // `submitted_at` is the SIT TIMING RECORD and is written here, once, explicitly.
      //
      // NOT created_at: that is a DB default, so it lands whenever the ROW was first inserted
      // — and a practice turn on this requirement inserts it early with a NULL final_answer,
      // which the immutability check then lets this submit update. created_at would point at
      // the practice turn, not the submission.
      // NOT updated_at: the marking pass rewrites it on every requirement, so after marking it
      // is the marking time.
      // Nothing else writes submitted_at, and submissions are immutable (a recorded
      // final_answer 409s above), so this value is written once and never moves.
      const submittedAt = new Date().toISOString();
      await supabase.from('acca_case_progress').upsert(
        {
          user_id: user.id,
          case_id: caseId,
          requirement_id: requirementId,
          // The link that makes this row a SIT row rather than practice work. NULL would mean
          // practice, so it is never omitted here.
          attempt_id: attemptId,
          final_answer: finalAnswer,
          submitted_at: submittedAt,
          updated_at: submittedAt,
        },
        // Targets the UNIQUE NULLS NOT DISTINCT constraint from migration 20260801120000.
        // It is a real constraint rather than a partial index precisely so PostgREST can name
        // it here and the upsert keeps working.
        { onConflict: 'user_id,case_id,requirement_id,attempt_id' },
      );
    } catch {
      return NextResponse.json({ error: 'Failed to record answer' }, { status: 500 });
    }

    // Advance metadata (same ordering the practice path computes at step 11).
    let isLastRequirement = false;
    let nextRequirement: { id: string; requirement_order: number } | null = null;
    try {
      const { data: allReqs } = await supabase
        .from('acca_case_requirements')
        .select('id, requirement_order')
        .eq('case_id', caseId)
        .order('requirement_order', { ascending: true });
      const ordered = (allReqs ?? []) as Array<{ id: string; requirement_order: number }>;
      const idx = ordered.findIndex((r) => r.id === requirementId);
      isLastRequirement = idx >= 0 && idx === ordered.length - 1;
      nextRequirement = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
    } catch {
      // advance metadata best-effort — omit rather than 500
    }

    return NextResponse.json({
      recorded: true,
      sitting: true,
      requirement_passed: false,   // a sit never judges correctness at turn time
      is_last_requirement: isLastRequirement,
      next_requirement: nextRequirement,
      case_complete: false,        // completion is decided by the mark gate, not here
    });
  }

  // ── 3. Fetch the case (gated) + its exhibits → the shared scenario context ──
  // Same serving gate as drills: status='approved' AND published=true. The active
  // requirement is only servable if its parent case passes this gate.
  const { data: caseRow, error: caseErr } = await supabase
    .from('acca_cases')
    .select('id, scenario_intro, status, published')
    .eq('id', caseId)
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (caseErr || !caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  const { data: exhibits } = await supabase
    .from('acca_case_exhibits')
    .select('exhibit_order, title, body')
    .eq('case_id', caseId)
    .order('exhibit_order', { ascending: true });

  // Compose the shared scenario context (NOT sealed). Explicitly title + body per
  // exhibit in exhibit_order — no created_at or other columns leak into the model context.
  const scenarioIntro = (caseRow.scenario_intro as string | null) ?? '';
  const exhibitText = (exhibits ?? [])
    .map((ex) => {
      const title = (ex.title as string | null) ?? '';
      const body  = (ex.body  as string | null) ?? '';
      return [title, body].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
  const context = [scenarioIntro, exhibitText].filter(Boolean).join('\n\n');

  // ── 4. Fetch the ACTIVE requirement (server-side, includes withheld fields) ──
  const { data: req, error: reqErr } = await supabase
    .from('acca_case_requirements')
    // `answer_schema` added 2026-08-01. It was NEVER selected on this path, which is why the
    // tutor had no access to `params.side` / `params.direction` and inferred the side of the
    // trade from model_answer prose — measured at 4/20 affirming the inverse rule and ~10/20
    // never adjudicating direction at all. Selecting is not serving: it is read here and only a
    // derived statement of fact reaches the prompt.
    .select('id, requirement_order, question, model_answer, marks_guide, command_verb, intellectual_level, answer_schema')
    .eq('id', requirementId)
    .eq('case_id', caseId)
    .single();

  if (reqErr || !req) {
    return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
  }

  const question          = req.question as string;
  // Requirements carry no own-context column — the shared scenario + exhibits IS the context.
  const fullContext       = context;
  const storedModelAnswer = (req.model_answer as string | null) ?? '';

  // TAXONOMY FENCE (2026-08-01). This used to build "Command verb (authored): calculate" +
  // "ACCA intellectual level demanded (authored): 3" and hand them to the engine, whose prompt
  // then told the model to NAME them. It did, and students were shown "At ACCA intellectual
  // level 3, where 'calculate' sits…" — twice, on two different cases. The sit route already
  // withholds both fields because a real exam gives no such steer; the teaching loop was
  // speaking them aloud.
  //
  // The raw labels now never enter the prompt: describeDemand translates them into what the
  // requirement DEMANDS, in plain words. Structural, not instructed — there is no code left to
  // leak, so no instruction is needed to stop it leaking. The fields are still READ, because the
  // demand is real calibration; reading is not serving.
  const verbLevel = describeDemand(
    req.command_verb as string | null,
    req.intellectual_level as number | null,
  );

  // ── THE LEVEL-AWARE CLOSING CONTRACT (ported from the drill route, 2026-08-07) ──
  // Same field, second use, and the two uses are independent: describeDemand says WHAT the
  // requirement asks for, nextMoveContract says what SHAPE the teaching leg must close on.
  //
  // It was built for drills on 2026-08-03 and wired only there, so cases — the longer, heavier
  // surface, and the one a student moves to after drills — kept the single un-levelled contract
  // ("the single next move that unblocks it"). That is a level-2-sized repair, and applied at
  // level 3 it produces a restatement of the whole requirement: a second task the size of the
  // first, which is where students stop.
  //
  // Taxonomy-free like its sibling, and '' for a null level, which leaves the engine's prompts
  // byte-identical for any requirement that has no authored level.
  const nextMove = nextMoveContract(req.intellectual_level as number | null);

  // `marks_guide` on a CASE requirement is an INTEGER allocation (13), not a list of criteria.
  // The old label said "criteria that earn marks" and then printed a bare number, which told the
  // model to look for criteria that were never there. Describe it as what it is.
  // ── DIRECTION FENCE (2026-08-01) ──
  // The code-owned discriminants are surfaced as STATED FACTS, and any contradiction between the
  // student's own words and a code-owned value is computed HERE, in code, and handed to the model
  // as a finding. The tutor is never asked to notice it and never instructed to check it first —
  // it simply arrives, first, as the largest fact in the block. Structural, not instructed.
  const discriminants  = extractDiscriminants(req.answer_schema);
  const contradictions = detectContradictions(student_message, discriminants);
  const directionBlock = renderDiscriminants(discriminants, contradictions);

  const markScheme = [
    verbLevel,
    req.marks_guide ? `Marks available for this requirement: ${req.marks_guide as number} — use this to judge how much depth is expected, and do not state it to the candidate.` : '',
  ].filter(Boolean).join('\n');

  // ── 5. Establish model answer + seal continuity (per-requirement seal) ──
  let modelAnswer: string;
  let teachThroughCounted = false;
  // DIVERGENCE #5 (2026-08-28) — the reveal leg's carried `creditable === 0`, carried in the
  // SEALED blob rather than `acca_case_progress`: a column is a hand-applied production migration
  // for a measurement field, and the DRILL route already carries `plainAsked` exactly this way.
  // Defaults false on a first turn, which is also every session sealed before this shipped.
  let carriedNothingCreditable = false;

  if (!session_state) {
    if (storedModelAnswer) {
      modelAnswer = storedModelAnswer;
    } else {
      try {
        modelAnswer = await call1_generate(question, fullContext);
      } catch {
        return NextResponse.json({ error: 'Failed to generate model answer' }, { status: 500 });
      }
    }
  } else {
    const s = session_state as ClientSessionState;
    if (typeof s.enc !== 'string') {
      return NextResponse.json({ error: 'Invalid session state' }, { status: 400 });
    }
    try {
      const payload       = openPayload(s.enc);
      modelAnswer         = payload.answer;
      teachThroughCounted = payload.counted;
      // Sealed, so a client cannot set it; absent on any pre-existing blob, which reads as false.
      carriedNothingCreditable = payload.nothingCreditable === true;
    } catch {
      return NextResponse.json({ error: 'Session state corrupted' }, { status: 400 });
    }
  }

  // ── 5b. Durable per-requirement progress (parallels acca_tutor_progress) ──
  // Keyed (user_id, case_id, requirement_id). Authoritative for miss_count / last_*
  // and the earned-reveal `resolved` flag; degrades to defaults on any read error.
  let missCount        = 0;
  let lastDiagnosis:   string | null = null;
  let lastRealAttempt: string | null = null;
  let resolved         = false;
  let alreadyPassed    = false;

  try {
    const { data: progress } = await supabase
      .from('acca_case_progress')
      .select('miss_count, last_diagnosis, last_real_attempt, counted, resolved, passed')
      .eq('user_id', user.id)
      .eq('case_id', caseId)
      .eq('requirement_id', requirementId)
      .maybeSingle();
    if (progress) {
      missCount           = typeof progress.miss_count === 'number' ? progress.miss_count : 0;
      lastDiagnosis       = (progress.last_diagnosis    as string | null) ?? null;
      lastRealAttempt     = (progress.last_real_attempt as string | null) ?? null;
      teachThroughCounted = teachThroughCounted || progress.counted === true;
      resolved            = progress.resolved === true;
      alreadyPassed       = progress.passed === true;
    }
  } catch {
    // never 500 on a progress read — fall through to defaults (miss_count = 0)
  }

  // ── 6. Run the engine (unchanged), scoped to the active requirement ──
  let result;
  try {
    result = await runTeachTurn({
      question,
      context: fullContext,
      modelAnswer,
      verbLevel,
      markScheme,
      groundedFacts: directionBlock,
      nextMove,
      studentMessage: student_message,
      lastEzraMessage,
      missCount,
      lastDiagnosis,
      lastRealAttempt,
      lastNothingCreditable: carriedNothingCreditable,
      resolved,
      // PERSONA ROUTING (2026-08-23, stage 5). Safe to use the request paper here: every
      // acca_cases fetch above is `.eq('paper_code', paper)`, so a case belonging to another
      // paper is never loaded and the persona cannot be scoped to a paper the content is not from.
      paper,
    });
  } catch {
    return NextResponse.json({ error: 'Teaching engine error' }, { status: 500 });
  }

  // ── 7. Cap accounting ──
  // Cases are NOT wired to the free-drill teach-through cap in v1 (that is the drill
  // funnel's monetisation). `counted` is still tracked so the seal shape is preserved
  // and a follow-up on an already-taught requirement stays structurally free; no
  // profiles.apm_teach_throughs_used increment happens on the case path.
  const newTeachThroughCounted = teachThroughCounted || result.teachThroughDelivered;

  // ── 8. Pass / final_answer (item 3) ──
  // A requirement passes when the completeness gate clears (result.passed). Once passed,
  // it stays passed. final_answer stores the accepted answer (v2 hook — populated, not
  // consumed yet).
  const newPassed     = alreadyPassed || result.passed;
  const finalAnswer   = result.passed ? result.acceptedAnswer : null;

  // ── 9. Seal updated session state (this requirement's own blob) ──
  const updatedSessionState: ClientSessionState = {
    enc:               sealPayload(modelAnswer, newTeachThroughCounted, result.newNothingCreditable),
    miss_count:        result.newMissCount,
    last_diagnosis:    result.newLastDiagnosis,
    last_real_attempt: result.newLastRealAttempt,
  };

  // ── 10. Persist per-requirement progress (best-effort) ──
  // Only write final_answer when a pass was just earned; never overwrite a stored
  // final_answer with null on a later follow-up turn.
  try {
    const row: Record<string, unknown> = {
      user_id:           user.id,
      case_id:           caseId,
      requirement_id:    requirementId,
      miss_count:        result.newMissCount,
      last_diagnosis:    result.newLastDiagnosis,
      last_real_attempt: result.newLastRealAttempt,
      counted:           newTeachThroughCounted,
      resolved:          result.newResolved,
      passed:            newPassed,
      updated_at:        new Date().toISOString(),
    };
    if (result.passed && finalAnswer != null) row.final_answer = finalAnswer;
    // attempt_id stays NULL: this is the PRACTICE path. Stated explicitly rather than omitted,
    // because the conflict target now includes the column and an absent key would be ambiguous
    // to read. NULL is what makes this row practice work, and NULLS NOT DISTINCT is what keeps
    // it to exactly one row per requirement.
    row.attempt_id = null;
    await supabase
      .from('acca_case_progress')
      .upsert(row, { onConflict: 'user_id,case_id,requirement_id,attempt_id' });
  } catch {
    // non-fatal: per-requirement persistence is best-effort, never blocks the response
  }

  // ── 11. Requirement advance / case completion (item 4) ──
  // v1 advances one requirement at a time on the shared scenario — NO cross-requirement
  // synthesis. Compute the next requirement from the ordered list; the case session is
  // complete when the LAST requirement (max requirement_order) has just passed. Voluntary
  // "move on" is client-driven off next_requirement — no server state needed for it.
  let isLastRequirement = false;
  let nextRequirement: { id: string; requirement_order: number } | null = null;
  try {
    const { data: allReqs } = await supabase
      .from('acca_case_requirements')
      .select('id, requirement_order')
      .eq('case_id', caseId)
      .order('requirement_order', { ascending: true });
    const ordered  = (allReqs ?? []) as Array<{ id: string; requirement_order: number }>;
    const idx      = ordered.findIndex(r => r.id === requirementId);
    isLastRequirement = idx >= 0 && idx === ordered.length - 1;
    nextRequirement   = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  } catch {
    // advance metadata is best-effort — omit rather than 500
  }

  const caseComplete = newPassed && isLastRequirement;

  return NextResponse.json({
    ezra_response:           result.ezraResponse,
    session_state:           updatedSessionState,
    teach_through_delivered: result.teachThroughDelivered,
    intent:                  result.intent,
    message_kind:            result.messageKind,
    requirement_passed:      result.passed,
    is_last_requirement:     isLastRequirement,
    next_requirement:        nextRequirement,
    case_complete:           caseComplete,
  });
}
