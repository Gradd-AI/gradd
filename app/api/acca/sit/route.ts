import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';
import { sitCaseGate, sitDisplayLabel } from '@/lib/acca/sit-preview';
import { resolvePaperConfig, hintUrl, type AttemptRow } from '@/lib/acca/sit-attempt';

// ── SIT read endpoint — BOTH PAPERS (generalised 2026-07-30) ──────────────────
// Serves the lean sit surface for any mock paper in lib/acca/mocks.ts. Authentic exam
// conditions: the scenario, the exhibits, the requirement text and its marks — nothing
// else.
//
// It used to bind `const PAPER = AFM_MOCK_PAPER_1` at module scope, which is what made
// this an AFM-only surface. The paper is now RESOLVED PER REQUEST from `?mock_id=`, or
// from the caller's open attempt, or from `?paper=` — and every query below is scoped to
// the resolved paper, so serving APM can never apply AFM's filter.
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
//   POST {action:'start'}                 → start (or resume) the clock
//   POST {action:'finish'}                → mark the attempt completed (also what the
//                                           auto-submit calls when the clock expires)
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

// The paper/attempt resolution used to live here as three private helpers. It moved to
// lib/acca/sit-attempt.ts (2026-07-31) because the results endpoint must resolve the SAME
// paper from the SAME hints — a second copy is how a student who sat AFM gets handed the
// APM debrief.

export async function GET(request: Request): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;
  const { supabase, userId } = g;

  const resolved = await resolvePaperConfig(supabase, userId, new URL(request.url));
  if (!resolved) return NextResponse.json({ error: 'Paper not available' }, { status: 404 });
  const PAPER = resolved.config;

  // ── Cases (STANDARD gate — approved + published, same as every case route) ──
  // Filters are built BY ITERATING the gate rather than written inline, so the query and
  // the fixtures in scripts/test-sit-preview.ts read the same object. Adding or removing a
  // gate column changes both at once; there is no second copy to drift. The gate is now a
  // FUNCTION of the paper, so an APM sit is filtered on paper_code='APM'.
  let caseQuery = supabase
    .from('acca_cases')
    .select('id, title, section, scenario_intro, total_marks, professional_skills_marks')
    .in('id', PAPER.case_ids);
  for (const [column, value] of Object.entries(sitCaseGate(PAPER.paper))) {
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

  // WITHHELD: model_answer, hint, full_reveal, answer_schema, professional_skill_tags,
  // intellectual_level, command_verb. See the header note.
  // `lo_code` is READ but never SERVED — it only feeds sitDisplayLabel's exact removal
  // of the code from the stored label. Selecting it is not serving it.
  // `marks_guide` IS served (2026-07-30): an integer mark ALLOCATION, which every real
  // paper prints and a candidate needs to pace a 3h15m sit. It replaces the marks that
  // used to ride along inside AFM's label prose — a parity accident APM never had.
  const { data: requirements } = await supabase
    .from('acca_case_requirements')
    .select('id, case_id, requirement_order, label, lo_code, question, marks_guide')
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
        // Candidate-facing form only — the syllabus code AND the marks phrase are stripped
        // here, not in the UI, so the label reduces to the part ("(i)"). The runner
        // recomposes "(i) — 10 marks" from `marks` below, which comes from the column.
        label:            sitDisplayLabel(r.label as string | null, r.lo_code as string | null),
        marks:            (r.marks_guide as number | null) ?? null,
        question:         (r.question as string | null) ?? '',
      }));
  });

  return NextResponse.json({
    paper: { id: PAPER.id, paper: PAPER.paper, title: PAPER.title, duration_minutes: PAPER.duration_minutes },
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
    attempt: resolved.attempt,
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
  const { action, mock_id: mockIdRaw, paper: paperRaw } = body as {
    action?: unknown; mock_id?: unknown; paper?: unknown;
  };

  // Same resolution order as GET, expressed through the same helper so the two verbs can
  // never disagree about which paper is being sat.
  const resolved = await resolvePaperConfig(supabase, userId, hintUrl(request.url, mockIdRaw, paperRaw));
  if (!resolved) return NextResponse.json({ error: 'Paper not available' }, { status: 404 });
  const PAPER = resolved.config;

  // The ACCA clock. `ends_at` USED to be written only because the column is NOT NULL, with
  // nothing reading it — this surface shipped with an elapsed-only clock and no expiry. It is
  // now LOAD-BEARING (2026-07-31): the runner counts DOWN to it and auto-submits at it, and
  // `attemptIsClosed` (lib/acca/sit-preview.ts) reads it server-side so a paper left open past
  // its deadline is over rather than resumable. Set ONCE at start and never moved, so a
  // refresh or a resume counts to the same instant. Taken from the paper config so a paper
  // with a different duration records its own, rather than a constant that matches both today.
  const NOMINAL_MINUTES = PAPER.duration_minutes;

  // ── start / resume the elapsed clock ──
  if (action === 'start') {
    const existing = resolved.attempt;
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
    const existing = resolved.attempt;
    if (existing && !existing.completed) {
      // `completed_at` closes the FINAL requirement's interval. `started_at` opens the first
      // and each submission closes the one before it, but the time after the last submission
      // had no end until this column existed. Written only on the flip, so it stays NULL
      // while an attempt is open and is never moved afterwards.
      await supabase
        .from('acca_mock_attempts')
        .update({ completed: true, completed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('mock_id', PAPER.id)
        .eq('started_at', existing.started_at);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
