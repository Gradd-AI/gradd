import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';
import { AFM_MOCK_PAPER_1, SIT_CASE_GATE, sitDisplayLabel } from '@/lib/acca/sit-preview';

// ── AFM Mock Paper 1 — SIT read endpoint (standard gate, real product surface) ─
// Serves the lean sit surface at /acca/afm/mock. Authentic exam conditions: the
// scenario, the exhibits and the requirement text — nothing else.
//
// ── SERVING GATE IS NOW THE STANDARD ONE (inverted gate retired 2026-07-29) ───
// This route used to gate on the OPPOSITE of every other case route — `published=false
// AND status='candidate'` — so that it could serve the unadjudicated mock and nothing
// else. That was right for pre-release content and had a fatal end-state: publishing the
// paper would have stopped the gate matching and 404'd the surface. The publish-flip trap.
//
// It now gates on `paper_code='AFM' AND mock_only=true AND status='approved' AND
// published=true`, identical in kind to app/api/acca/case/*. `mock_only` is retained (it
// was never the inverted part) so the paper's cases stay out of the practice library and
// a non-paper case cannot be addressed through this surface.
//
// CONSEQUENCE, deliberate: until the three cases are flipped to approved/published this
// endpoint serves nothing (404 "Paper not available"). The flip is a separate,
// P-DB2-governed step taken after the end-to-end walk — this code never performs it.
//
// ── ACCESS ────────────────────────────────────────────────────────────────────
// The email allowlist is DELETED. Access is now exactly what every other case route
// requires: the APM_CASES flag, auth, and an active ACCA entitlement
// (hasActiveAPMAccess → 402). The sit surface is the real product surface, so it is
// reachable by any entitled student and gated like the rest of the product.
//
// ── WITHHOLD DISCIPLINE (stricter than the live case route) ──────────────────
// Never selects model_answer / hint / full_reveal / answer_schema — the same rule the live
// case route follows. Those are the ANSWER; serving any of them during a sit is feedback.
//
// It ALSO withholds fields the live case route does serve, each for its own reason:
//   • professional_skill_tags — names which professional skill the requirement examines.
//                               A steer no real exam gives: it tells the candidate which
//                               behaviour to perform rather than leaving them to judge it.
//   • intellectual_level      — the authored difficulty tier. Internal calibration data;
//                               knowing a requirement is "level 3" changes how it is read.
//   • command_verb            — the authored verb classification. Internal; the real verb
//                               is already in the question text where the candidate reads it.
//   • lo_code                 — the internal syllabus code. No real paper prints it, and it
//                               identifies the exact area being tested. Also removed from
//                               the LABEL by sitDisplayLabel (see below) — withholding the
//                               column alone would leak it through the label anyway.
//
// CORRECTED 2026-07-29 — this block previously justified withholding `marks_guide` as "the
// authored criteria that earn marks: a mark scheme, and therefore feedback". That is WRONG
// ABOUT THE COLUMN: `marks_guide` is an INTEGER mark allocation (16, 13, 7…), not criteria.
// Marks per requirement are authentic exam information — every real paper prints them, and a
// candidate needs them to pace a 3h15m sit.
//
// This route does not currently SELECT marks_guide, and today nothing is lost by that: AFM's
// stored labels carry the marks in prose ("(i) B3e — 10 marks" → "(i) — 10 marks"), so the
// candidate still sees them. That parity is an accident of label formatting rather than a
// rule, and it is fragile — re-authoring a label without its marks would silently remove
// them. Flagged for a decision; see docs/AFM_SURFACED.md. The sibling carve-out on
// app/api/acca/case DOES serve marks_guide for mock content (lib/acca/mock-access.ts),
// because APM labels carry no marks and withholding it blanked the APM mock's marks display.
// `label` IS served, but only in its CANDIDATE-FACING form. The stored label carries the
// internal syllabus code — "(i) B3e — 10 marks" — which no real paper prints, so
// sitDisplayLabel() derives "(i) — 10 marks" here at the serve boundary. Marks per
// requirement ARE authentic and stay. The `lo_code` column is read to make that removal
// exact and is then DISCARDED — it is never part of the response, so the code never
// reaches the browser at all. Nothing stored is modified: marking and debrief read
// `lo_code` and the raw `label` off the row exactly as before.
//
//   GET                                   → the whole paper + which requirements are
//                                           already submitted + the open attempt
//   POST {action:'start'}                 → start (or resume) the elapsed clock
//   POST {action:'finish'}                → mark the attempt completed
//
// ── ANSWER WRITES ARE NOT HERE ANY MORE ──────────────────────────────────────
// `action:'submit'` is REMOVED. One requirement's answer is now recorded by the
// standard app/api/acca/case/turn route with `sitting:true` — the same write path the
// APM sit uses — so there is one sit write path, one serving gate and one immutability
// rule instead of two implementations that could drift. The immutable-submission
// guarantee moved with it (case/turn returns 409 `already_submitted` on a recorded
// answer). What is left here is the paper-level READ and the attempt clock, neither of
// which the per-case routes model.
//
// MARKING AND DEBRIEF ARE STILL OUT OF SCOPE FOR THIS ROUTE. It never marks, never
// scores and never returns a verdict. Answers land in acca_case_progress.final_answer,
// which app/api/acca/case/mark reads when marking runs.

const CASES_ENABLED = process.env.APM_CASES === '1';

interface GateOk {
  userId: string;
  supabase: ReturnType<typeof createServiceClient>;
}

// Flag → 404. Unauthenticated → 401. No entitlement → 402. The uniform-404 posture is
// deliberately GONE with the allowlist: it existed to hide unpublished content, and
// this surface no longer serves any. It now answers like every other case route, so a
// lapsed student sees the upsell instead of a surface that appears not to exist.
async function gate(): Promise<{ error: Response } | GateOk> {
  if (!CASES_ENABLED) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) };
  }
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();
  if (!hasActiveAPMAccess(profile ?? {})) {
    return { error: NextResponse.json({ error: 'subscription_required' }, { status: 402 }) };
  }
  return { userId: user.id, supabase };
}

const PAPER = AFM_MOCK_PAPER_1;

// The nominal ACCA AFM clock (3h15m). Written ONLY because acca_mock_attempts.ends_at
// is NOT NULL in the schema, so the column has to hold something honest. NOTHING reads
// it on this surface: there is no countdown, no expiry branch and no auto-submit by
// spec. The sit's clock counts UP from started_at.
const NOMINAL_MINUTES = 195;

interface AttemptRow {
  mock_id: string;
  started_at: string;
  ends_at: string;
  completed: boolean;
}

async function openAttempt(
  supabase: GateOk['supabase'],
  userId: string,
): Promise<AttemptRow | null> {
  const { data } = await supabase
    .from('acca_mock_attempts')
    .select('mock_id, started_at, ends_at, completed')
    .eq('user_id', userId)
    .eq('mock_id', PAPER.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AttemptRow | null) ?? null;
}

export async function GET(): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;
  const { supabase, userId } = g;

  // ── Cases (STANDARD gate — approved + published, same as every case route) ──
  // Filters are built BY ITERATING SIT_CASE_GATE rather than written inline, so the query
  // and the fixtures in scripts/test-sit-preview.ts read the same object. Adding or
  // removing a gate column changes both at once; there is no second copy to drift.
  let caseQuery = supabase
    .from('acca_cases')
    .select('id, title, section, scenario_intro, total_marks, professional_skills_marks')
    .in('id', PAPER.case_ids);
  for (const [column, value] of Object.entries(SIT_CASE_GATE)) {
    caseQuery = caseQuery.eq(column, value as never);
  }
  const { data: caseRows } = await caseQuery;

  const byId = new Map((caseRows ?? []).map((c) => [c.id as string, c]));
  // Order by the paper's own sequence, not by whatever order the DB returned.
  const orderedCases = PAPER.case_ids.map((id) => byId.get(id)).filter(Boolean);
  if (orderedCases.length !== PAPER.case_ids.length) {
    return NextResponse.json({ error: 'Paper not available' }, { status: 404 });
  }

  const { data: exhibits } = await supabase
    .from('acca_case_exhibits')
    .select('case_id, exhibit_order, title, body')
    .in('case_id', PAPER.case_ids)
    .order('exhibit_order', { ascending: true });

  // WITHHELD: model_answer, hint, full_reveal, answer_schema, marks_guide,
  // professional_skill_tags, intellectual_level. See the header note.
  // `lo_code` is READ but never SERVED — it only feeds sitDisplayLabel's exact removal
  // of the code from the stored label. Selecting it is not serving it.
  const { data: requirements } = await supabase
    .from('acca_case_requirements')
    .select('id, case_id, requirement_order, label, lo_code, question')
    .in('case_id', PAPER.case_ids)
    .order('requirement_order', { ascending: true });

  // Which requirements this user has already submitted. A recorded answer is FINAL —
  // blank '' counts as submitted (a deliberately unanswered requirement).
  const { data: progress } = await supabase
    .from('acca_case_progress')
    .select('requirement_id, final_answer')
    .eq('user_id', userId)
    .in('case_id', PAPER.case_ids);

  const submitted = (progress ?? [])
    .filter((p) => p.final_answer != null)
    .map((p) => p.requirement_id as string);

  // Flatten to the paper-ordered slot list the UI walks: Section A's requirements in
  // order, then each Section B case's, in case_ids order.
  const slots = PAPER.case_ids.flatMap((caseId) => {
    const c = byId.get(caseId)!;
    return (requirements ?? [])
      .filter((r) => r.case_id === caseId)
      .map((r) => ({
        requirement_id:   r.id as string,
        case_id:          caseId,
        case_title:       (c.title as string | null) ?? null,
        case_section:     (c.section as string | null) ?? null,
        requirement_order: r.requirement_order as number,
        // Candidate-facing form only — the syllabus code is stripped here, not in the UI.
        label:            sitDisplayLabel(r.label as string | null, r.lo_code as string | null),
        question:         (r.question as string | null) ?? '',
      }));
  });

  return NextResponse.json({
    paper: { id: PAPER.id, title: PAPER.title },
    cases: orderedCases.map((c) => ({
      id:                        c!.id,
      title:                     c!.title ?? null,
      section:                   c!.section ?? null,
      scenario_intro:            c!.scenario_intro ?? null,
      total_marks:               c!.total_marks ?? null,
      professional_skills_marks: c!.professional_skills_marks ?? null,
      exhibits: (exhibits ?? [])
        .filter((e) => e.case_id === c!.id)
        .map((e) => ({
          exhibit_order: e.exhibit_order as number,
          title:         (e.title as string | null) ?? null,
          body:          (e.body  as string | null) ?? null,
        })),
    })),
    slots,
    submitted,
    attempt: await openAttempt(supabase, userId),
  });
}

export async function POST(request: Request): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;
  const { supabase, userId } = g;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { action } = body as { action?: unknown };

  // ── start / resume the elapsed clock ──
  if (action === 'start') {
    const existing = await openAttempt(supabase, userId);
    // Resume rather than restart: a refresh or a double-click must never reset the
    // clock. Only a COMPLETED attempt starts a fresh one.
    if (existing && !existing.completed) {
      return NextResponse.json({ attempt: existing, resumed: true });
    }
    const now = Date.now();
    const { data, error } = await supabase
      .from('acca_mock_attempts')
      .insert({
        user_id:    userId,
        mock_id:    PAPER.id,
        started_at: new Date(now).toISOString(),
        ends_at:    new Date(now + NOMINAL_MINUTES * 60_000).toISOString(),
        completed:  false,
      })
      .select('mock_id, started_at, ends_at, completed')
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Failed to start' }, { status: 500 });
    }
    return NextResponse.json({ attempt: data as AttemptRow, resumed: false });
  }

  // `action:'submit'` is intentionally absent — recording an answer moved to
  // app/api/acca/case/turn with `sitting:true`, which owns the immutability rule. A
  // client still posting 'submit' here falls through to the 400 below rather than
  // silently succeeding, which is the honest failure for a caller writing to a path
  // that no longer records anything.

  // ── finish ──
  if (action === 'finish') {
    const existing = await openAttempt(supabase, userId);
    if (existing && !existing.completed) {
      await supabase
        .from('acca_mock_attempts')
        .update({ completed: true })
        .eq('user_id', userId)
        .eq('mock_id', PAPER.id)
        .eq('started_at', existing.started_at);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
