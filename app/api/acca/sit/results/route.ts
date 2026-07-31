import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';
import { sitCaseGate, attemptIsClosed } from '@/lib/acca/sit-preview';
import { resolvePaperConfig, hintUrl, type AttemptRow } from '@/lib/acca/sit-attempt';
import type { AccaPaper } from '@/lib/acca/paper';
import type { MockPaper } from '@/lib/acca/mocks';
import { runCaseMarking } from '@/lib/acca/case-mark-run';
import { computePacing } from '@/lib/acca/pacing';
import { buildDebrief } from '@/lib/acca/debrief';
import {
  orderPaper,
  toPacingInputs,
  toDebriefRequirements,
  toDebriefCases,
  paperFullySubmitted,
  casesNeedingMarking,
  type SitResultRow,
  type SitCaseMarkingRow,
} from '@/lib/acca/sit-results';

// ── SIT RESULTS — mark the paper, then debrief it ─────────────────────────────
// The terminal screen of a sit, for BOTH papers. It is the only place the three halves
// meet: marking (lib/acca/case-mark-run), pacing (lib/acca/pacing) and the coached debrief
// (lib/acca/debrief). Every one of those is written elsewhere and is pure or already
// shared; this route fetches rows, calls them in order, and returns what they produced.
//
//   POST   → mark any unmarked case, then build and return the debrief
//   GET    → return the debrief from what is already persisted; NEVER marks
//
// ── WHY POST MARKS AND GET DOES NOT ──────────────────────────────────────────
// Marking is a paid model call whose output measurably moves run to run. A GET that marked
// would mean a refresh could change a student's marks, and a link-preview fetch could spend
// money. So the write verb marks, and the read verb reports. The client POSTs once when the
// paper is finished and GETs on every subsequent visit.
//
// ── AND WHY POST IS STILL IDEMPOTENT IN PRACTICE ─────────────────────────────
// It marks only the cases that are NOT yet marked (`casesNeedingMarking`). A second POST
// after a successful first one does no model work and returns the same debrief, because the
// bands, the marks and the marker's reasoning are all persisted — the last of those is what
// acca_case_progress.technical_feedback was added for. Without that column this endpoint
// could only show the `why` on the same request that produced it.
//
// ── WHEN IS A PAPER MARKABLE? ────────────────────────────────────────────────
// Either every requirement carries a recorded answer, OR the attempt is CLOSED —
// `attemptIsClosed` (lib/acca/sit-preview.ts): finished, or past its `ends_at`.
//
// The second arm arrived with the countdown and is not a loosening for convenience. When the
// clock expires, the auto-submit records the requirement being written and nothing else, so
// everything after it has no progress row at all. That is the truth of what happened, and
// `not_reached` is a materially different finding from `blank` — pacing and the debrief both
// distinguish them, and the debrief's next action for an unreached requirement is about
// REACHING it, not about its method. Back-filling empty strings across the tail to satisfy a
// stricter gate would have destroyed that distinction to work around a gate, so the gate
// moved instead.
//
// Marking a half-sat paper that is still RUNNING remains refused (409 `paper_not_finished`):
// it would score work in progress as missing work, and those marks are then persisted.
//
// This route NEVER writes completed_at. A student opening their results an hour later must
// not have that hour recorded as time spent finishing the paper — which is also why
// `attemptIsClosed` reads the expiry rather than inferring one.
//
// ── WITHHOLD DISCIPLINE ──────────────────────────────────────────────────────
// The paper is over, so the answer side is no longer sealed — but only what the DEBRIEF
// needs crosses the wire, and the debrief's `why` is the marker's reasoning, never the
// model answer. This route selects `model_answer` NOWHERE. `lo_code` is not selected here
// either; the debrief derives its student-facing `display_name` ("Q1 (i)") from the case
// position and the label's roman-numeral part, and drops the stored label's syllabus code
// on the floor. `label` IS returned inside each line for traceability and the renderer does
// not print it — same rule as the sit route, one layer later.

const CASES_ENABLED = process.env.APM_CASES === '1';

interface GateOk {
  userId: string;
  supabase: ReturnType<typeof createServiceClient>;
}

// Identical to the sit route's gate — same flag, same auth, same entitlement, same codes.
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

/** Everything the debrief is built from, read in one place so GET and POST cannot disagree
 *  about what "the paper" is. */
async function loadPaper(
  supabase: GateOk['supabase'],
  userId: string,
  caseIds: readonly string[],
  paperCode: AccaPaper,
) {
  // The SAME serving gate as the sit route, built by iterating the shared gate object.
  // `title` is the only case field the debrief needs — it names the group ("Q1 — Solenne").
  // The PS marks come from acca_case_marking (what was AWARDED against what was available at
  // marking time), not from the case row, so acca_cases.professional_skills_marks is
  // deliberately not selected: two sources for one number is how they disagree.
  let caseQuery = supabase
    .from('acca_cases')
    .select('id, title')
    .in('id', caseIds as string[]);
  for (const [column, value] of Object.entries(sitCaseGate(paperCode))) {
    caseQuery = caseQuery.eq(column, value as never);
  }
  const { data: caseRows } = await caseQuery;
  const cases = (caseRows ?? []) as Array<{ id: string; title: string | null }>;

  const { data: reqRows } = await supabase
    .from('acca_case_requirements')
    .select('id, case_id, requirement_order, label, marks_guide')
    .in('case_id', caseIds as string[])
    .order('requirement_order', { ascending: true });

  const { data: progressRows } = await supabase
    .from('acca_case_progress')
    .select('requirement_id, case_id, final_answer, submitted_at, band, technical_marks_awarded, technical_feedback')
    .eq('user_id', userId)
    .in('case_id', caseIds as string[]);

  const { data: markingRows } = await supabase
    .from('acca_case_marking')
    .select('case_id, professional_marks_awarded, professional_marks_available, per_skill, technical_marks_awarded, technical_marks_available')
    .eq('user_id', userId)
    .in('case_id', caseIds as string[]);

  const progressByReq = new Map(
    ((progressRows ?? []) as Array<Record<string, unknown>>).map((p) => [p.requirement_id as string, p]),
  );

  const rows: SitResultRow[] = ((reqRows ?? []) as Array<Record<string, unknown>>).map((r) => {
    const p = progressByReq.get(r.id as string);
    return {
      requirement_id: r.id as string,
      case_id: r.case_id as string,
      requirement_order: r.requirement_order as number,
      label: (r.label as string | null) ?? null,
      lo_code: null,                                    // deliberately not selected — see header
      marks_guide: (r.marks_guide as number | null) ?? null,
      submitted_at: (p?.submitted_at as string | null) ?? null,
      final_answer: (p?.final_answer as string | null) ?? null,
      band: (p?.band as string | null) ?? null,
      technical_marks_awarded: (p?.technical_marks_awarded as number | null) ?? null,
      technical_feedback: (p?.technical_feedback as string | null) ?? null,
    };
  });

  return {
    cases,
    rows,
    marking: (markingRows ?? []) as Array<SitCaseMarkingRow & {
      technical_marks_awarded: number | null; technical_marks_available: number | null;
    }>,
  };
}

/** Assemble the response from already-loaded rows. Pure apart from the two pure modules it
 *  calls, and shared by both verbs so GET and POST return the same shape. */
function buildResponse(
  paper: MockPaper,
  loaded: Awaited<ReturnType<typeof loadPaper>>,
  attempt: AttemptRow | null,
) {
  const ordered = orderPaper(paper.case_ids, loaded.rows);
  const titles = new Map(loaded.cases.map((c) => [c.id, c.title]));

  const pacing = computePacing(toPacingInputs(ordered), {
    started_at: attempt?.started_at ?? null,
    completed_at: attempt?.completed_at ?? null,
    completed: attempt?.completed ?? null,
  });

  const debrief = buildDebrief(
    toDebriefRequirements(ordered),
    toDebriefCases(paper.case_ids, titles, loaded.marking),
    pacing,
  );

  return {
    paper: { id: paper.id, paper: paper.paper, title: paper.title, duration_minutes: paper.duration_minutes },
    attempt,
    debrief,
    pacing,
  };
}

// ── GET — report what is persisted. Never marks, never spends. ────────────────
export async function GET(request: Request): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;
  const { supabase, userId } = g;

  const resolved = await resolvePaperConfig(supabase, userId, new URL(request.url));
  if (!resolved) return NextResponse.json({ error: 'Paper not available' }, { status: 404 });
  const PAPER = resolved.config;

  const loaded = await loadPaper(supabase, userId, PAPER.case_ids, PAPER.paper);
  if (loaded.cases.length !== PAPER.case_ids.length) {
    return NextResponse.json({ error: 'Paper not available' }, { status: 404 });
  }
  if (!paperFullySubmitted(loaded.rows) && !attemptIsClosed(resolved.attempt, Date.now())) {
    return NextResponse.json({ error: 'paper_not_finished' }, { status: 409 });
  }

  return NextResponse.json({
    ...buildResponse(PAPER, loaded, resolved.attempt ?? null),
    marked: casesNeedingMarking(PAPER.case_ids, loaded.marking).length === 0,
  });
}

// ── POST — mark whatever is unmarked, then debrief. ───────────────────────────
export async function POST(request: Request): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;
  const { supabase, userId } = g;

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // A body is optional here — the paper resolves from the open attempt when none is sent.
  }
  const { mock_id: mockIdRaw, paper: paperRaw } = (body ?? {}) as { mock_id?: unknown; paper?: unknown };

  const resolved = await resolvePaperConfig(supabase, userId, hintUrl(request.url, mockIdRaw, paperRaw));
  if (!resolved) return NextResponse.json({ error: 'Paper not available' }, { status: 404 });
  const PAPER = resolved.config;

  let loaded = await loadPaper(supabase, userId, PAPER.case_ids, PAPER.paper);
  if (loaded.cases.length !== PAPER.case_ids.length) {
    return NextResponse.json({ error: 'Paper not available' }, { status: 404 });
  }
  // Refuse to mark a paper that is still running and not fully submitted: it would score work
  // in progress as missing work, and those marks are then persisted and immutable-in-effect.
  // A CLOSED attempt (finished, or past ends_at) is markable as it stands — see the header.
  const closed = attemptIsClosed(resolved.attempt, Date.now());
  if (!paperFullySubmitted(loaded.rows) && !closed) {
    return NextResponse.json({ error: 'paper_not_finished' }, { status: 409 });
  }

  // ── Mark the cases that are not marked yet ──
  // SEQUENTIALLY, not in parallel: each case is two model calls, and the three cases share
  // one request's time budget. Running them concurrently would triple peak token pressure on
  // the same account for no wall-clock guarantee worth having on a screen the student is
  // already waiting on.
  const pending = casesNeedingMarking(PAPER.case_ids, loaded.marking);
  const marked: string[] = [];
  let weaknessRows = 0;
  for (const caseId of pending) {
    const run = await runCaseMarking({
      supabase, userId, caseId, paper: PAPER.paper, sitting: true, attemptClosed: closed,
    });
    if (!run.ok) {
      // Report the failure with the cases that DID mark, rather than 502-ing the lot: a
      // student whose Q1 and Q2 marked must not lose them because Q3's call timed out. A
      // second POST retries only what is still unmarked.
      return NextResponse.json(
        { error: run.error, marked_cases: marked, failed_case: caseId },
        { status: run.status },
      );
    }
    marked.push(caseId);
    weaknessRows += run.weakness_rows;
  }

  // Re-read: the marking just written is what the debrief is built from.
  if (pending.length > 0) {
    loaded = await loadPaper(supabase, userId, PAPER.case_ids, PAPER.paper);
  }

  return NextResponse.json({
    ...buildResponse(PAPER, loaded, resolved.attempt ?? null),
    marked: true,
    marked_now: marked.length,
    weakness_rows: weaknessRows,
  });
}
