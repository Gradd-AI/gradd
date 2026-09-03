// lib/org/trainee-sit.ts
// The coordinator's cross-user read of a trainee's sat mock.
//
// ── THIS IS THE FIRST CROSS-USER READER IN THE PRODUCT ───────────────────────
// Everything else that touches a sit derives its user from the session. This one is handed
// a userId, so it is the one place where getting authorisation wrong exposes somebody's
// exam script to another person. It ships only because both gates closed first
// (2026-09-03): `requireCoordinator` is scoped to the org being viewed, and the trainee
// page checks that the userId is in the cohort. This module assumes NEITHER — it re-checks
// the org/cohort link itself, so a future caller that forgets cannot widen it.
//
// ── IT REIMPLEMENTS NOTHING ──────────────────────────────────────────────────
// The debrief already exists. `orderPaper → toPacingInputs → computePacing` and
// `toDebriefRequirements + toDebriefCases → buildDebrief` are the SAME chain, in the same
// order, that app/api/acca/sit/results/route.ts runs for the student. The only genuinely
// new logic here is (a) picking the attempt and (b) refusing practice rows. If the debrief
// a coordinator reads ever differs from the one the student read, it is because the rows
// differ — never because a second implementation drifted.
//
// NOT reused literally: that route's `buildResponse`/`loadPaper` are private to it and
// carry request-shaped concerns (the marking claim, the 409s, the paper resolution from a
// URL). Extracting them would mean editing the student's own results path to serve a
// coordinator screen, which is a bigger change than this reader deserves and would put the
// live sit surface at risk for a read-only feature. The chain is duplicated; the LOGIC is
// not — every function it calls is the same imported function.

import { createServiceClient } from '@/lib/supabase/server';
import { getMockPaper, getMockPapers, type MockPaper } from '@/lib/acca/mocks';
import { sitCaseGate } from '@/lib/acca/sit-preview';
import {
  orderPaper, toPacingInputs, toDebriefRequirements, toDebriefCases,
  type SitResultRow, type SitCaseMarkingRow,
} from '@/lib/acca/sit-results';
import { computePacing, type PacingReport } from '@/lib/acca/pacing';
import { buildDebrief, type DebriefReport } from '@/lib/acca/debrief';
import { getCohortById, cohortPaper } from '@/lib/org/queries';
import { servedPaper } from '@/lib/acca/paper';

/** A progress row as it comes back here — SitResultRow plus the column that proves which
 *  sitting it belongs to. `attempt_id` is selected precisely so the filter below can be a
 *  fact about the row rather than a promise about the query. */
export interface SitProgressRow extends SitResultRow {
  attempt_id: string | null;
}

/**
 * PURE. Keep only the rows belonging to THIS sitting.
 *
 * ── WHY THIS EXISTS WHEN THE QUERY ALREADY SAYS `.eq('attempt_id', id)` ──────
 * A practice row must never reach a sit debrief. `acca_case_progress` carries
 * UNIQUE NULLS NOT DISTINCT (user_id, case_id, requirement_id, attempt_id), so the same
 * requirement legitimately holds a practice row (attempt_id NULL) AND a row per sitting —
 * and practice rows carry a `final_answer` too, written by the teach loop. A practice row
 * that leaked in here would look exactly like a sat answer and would be marked, paced and
 * attributed as one.
 *
 * The `.eq()` in SQL is the primary enforcement and is already sufficient (`= NULL` is
 * never true, so NULL rows cannot match). This is the SECOND line, and it exists because
 * the first one is invisible to a fixture: a test can prove this function drops a practice
 * row, and cannot prove a query builder did. It also survives a caller that widens the
 * select — the rows are re-checked against the attempt after they arrive.
 */
export function rowsForAttempt(
  rows: readonly SitProgressRow[],
  attemptId: string,
): SitProgressRow[] {
  return rows.filter((r) => r.attempt_id != null && r.attempt_id === attemptId);
}

/** PURE. The student's own words, keyed by requirement, for the collapsed expand. Kept
 *  OUT of the debrief structures deliberately: the debrief is a marking artefact, and the
 *  raw script is a separate disclosure the page gates behind an explicit action. */
export function answersByRequirement(
  rows: readonly SitProgressRow[],
): Record<string, string | null> {
  const out: Record<string, string | null> = {};
  for (const r of rows) out[r.requirement_id] = r.final_answer;
  return out;
}

export interface TraineeSitResults {
  attempt: {
    id: string;
    mock_id: string;
    started_at: string;
    ends_at: string | null;
    completed: boolean;
    completed_at: string | null;
  };
  paper: { id: string; paper: string; title: string; duration_minutes: number };
  cases: Array<{ id: string; title: string | null }>;
  debrief: DebriefReport;
  pacing: PacingReport;
  /** requirement_id → the student's submitted answer. '' is a real blank submission. */
  answers: Record<string, string | null>;
  /**
   * ⚠️ HOW MANY OTHER COMPLETED SITS THIS USER HAS ON THIS PAPER.
   *
   * Non-zero means the CASE-LEVEL totals below are not certainly this attempt's.
   * `acca_case_progress` is attempt-scoped (it has `attempt_id`); `acca_case_marking` is
   * keyed (user_id, case_id) with NO attempt_id and is UPSERTed, so it holds whichever
   * sitting was marked most recently. The per-requirement marks, bands and feedback are
   * exact for this attempt; the case PS/technical totals and per-skill feedback are the
   * latest marking of those cases by this user.
   *
   * Zero for every trainee today. Surfaced rather than silently assumed away, because the
   * two halves of one screen would disagree without anyone being told.
   */
  other_completed_attempts: number;
}

/**
 * The trainee's most recent COMPLETED sit on the cohort's paper, assembled into the same
 * debrief the student saw.
 *
 * Returns null — never throws — when there is nothing to show: unknown cohort, cohort not
 * in this org, no completed attempt, or a paper whose cases are not servable. The caller
 * renders an empty state; "this trainee has not sat a mock" is an ordinary fact about a
 * cohort, not an error condition.
 */
export async function getTraineeSitResults(
  orgId: string,
  cohortId: string,
  userId: string,
): Promise<TraineeSitResults | null> {
  const cohort = await getCohortById(cohortId);
  // Re-checked here, not trusted from the caller — see the module header.
  if (!cohort || cohort.org_id !== orgId) return null;

  // `cohortPaper` returns an AccaPaper, which includes SBL — a DECLARED paper with no
  // content, no surface and no mock. `servedPaper` narrows it, and a cohort on an unserved
  // paper falls out here as "nothing to show" rather than indexing a registry that has no
  // entry for it. The compiler enforces the distinction (P-G6, `ServedPaper` vs `AccaPaper`).
  const paper = servedPaper(cohortPaper(cohort.paper));
  if (!paper) return null;
  const mockIds = getMockPapers(paper).map((p) => p.id);
  if (mockIds.length === 0) return null;

  const sb = createServiceClient();

  // ── (2) THE ATTEMPT IS TAKEN EXPLICITLY ─────────────────────────────────────
  // Named by id, from a query that asks for exactly one attempt, and every row below is
  // then scoped to it. It is NOT inferred from whichever progress rows happen to exist —
  // that would make the debrief a function of the data's shape, and a user with two sits
  // would silently get a blend of both.
  //
  // ORDERED BY `started_at`, NOT `completed_at`: completed_at is NULLABLE and is null on
  // real completed rows (four of erasmoose's four, measured 2026-09-02) because it was
  // added after those attempts were written. Ordering by it would sort legitimately
  // completed attempts unpredictably. The most recent sit is the most recently STARTED one.
  const { data: attemptRows } = await sb
    .from('acca_mock_attempts')
    .select('id, mock_id, started_at, ends_at, completed, completed_at')
    .eq('user_id', userId)
    .in('mock_id', mockIds)
    .eq('completed', true)
    .order('started_at', { ascending: false })
    .limit(2);                          // 2, so "is there more than one?" needs no second query

  const attempts = (attemptRows ?? []) as Array<{
    id: string; mock_id: string; started_at: string;
    ends_at: string | null; completed: boolean; completed_at: string | null;
  }>;
  const attempt = attempts[0];
  if (!attempt) return null;            // no completed sit → empty state, not an error

  const PAPER: MockPaper | null = getMockPaper(attempt.mock_id);
  if (!PAPER) return null;

  // How many OTHER completed attempts exist — the caveat on the case-level totals.
  const { count: completedCount } = await sb
    .from('acca_mock_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('mock_id', mockIds)
    .eq('completed', true);
  const otherCompleted = Math.max(0, (completedCount ?? attempts.length) - 1);

  const caseIds = PAPER.case_ids;

  // Cases, through the SAME serving gate the sit route uses — a case that is no longer
  // servable is not silently rendered from a stale id.
  let caseQuery = sb.from('acca_cases').select('id, title').in('id', caseIds as string[]);
  for (const [column, value] of Object.entries(sitCaseGate(PAPER.paper))) {
    caseQuery = caseQuery.eq(column, value as never);
  }
  const { data: caseRows } = await caseQuery;
  const cases = ((caseRows ?? []) as Array<{ id: string; title: string | null }>);
  if (cases.length === 0) return null;

  const { data: reqRows } = await sb
    .from('acca_case_requirements')
    .select('id, case_id, requirement_order, label, lo_code, marks_guide')
    .in('case_id', caseIds as string[])
    .order('requirement_order', { ascending: true });

  // ── (3) SIT ROWS ONLY ───────────────────────────────────────────────────────
  // `.eq('attempt_id', …)` cannot match a NULL, so practice rows are excluded in SQL; the
  // column is selected so `rowsForAttempt` can re-assert it on the rows themselves.
  const { data: progressRows } = await sb
    .from('acca_case_progress')
    .select('requirement_id, case_id, attempt_id, final_answer, submitted_at, band, technical_marks_awarded, technical_feedback')
    .eq('user_id', userId)
    .eq('attempt_id', attempt.id)
    .in('case_id', caseIds as string[]);

  // ── (4) THE MARKING SELECT, WITH THE THREE COLUMNS IT WAS MISSING ───────────
  // `technical_marks_awarded` / `technical_marks_available` / `per_skill` were not selected
  // anywhere on the org path, which is why the coordinator saw 7/20 and not 38/80, and why
  // the per-skill bands and their feedback were invisible.
  const { data: markingRows } = await sb
    .from('acca_case_marking')
    .select('case_id, professional_marks_awarded, professional_marks_available, per_skill, technical_marks_awarded, technical_marks_available')
    .eq('user_id', userId)
    .in('case_id', caseIds as string[]);

  const progressByReq = new Map(
    ((progressRows ?? []) as Array<Record<string, unknown>>).map((p) => [p.requirement_id as string, p]),
  );

  const joined: SitProgressRow[] = ((reqRows ?? []) as Array<Record<string, unknown>>).map((r) => {
    const p = progressByReq.get(r.id as string);
    return {
      requirement_id: r.id as string,
      case_id: r.case_id as string,
      requirement_order: r.requirement_order as number,
      label: (r.label as string | null) ?? null,
      lo_code: (r.lo_code as string | null) ?? null,
      marks_guide: (r.marks_guide as number | null) ?? null,
      attempt_id: (p?.attempt_id as string | null) ?? null,
      submitted_at: (p?.submitted_at as string | null) ?? null,
      final_answer: (p?.final_answer as string | null) ?? null,
      band: (p?.band as string | null) ?? null,
      technical_marks_awarded: (p?.technical_marks_awarded as number | null) ?? null,
      technical_feedback: (p?.technical_feedback as string | null) ?? null,
    };
  });

  // A requirement with no row for this attempt keeps its authored side (label, marks) and a
  // null attempt_id — it was never reached. `rowsForAttempt` would drop it, which would
  // shorten the paper and shift every pacing interval, so it is only the ANSWERED rows that
  // are re-checked; the unanswered ones are re-attached with their submission fields null.
  const sitRowIds = new Set(rowsForAttempt(joined, attempt.id).map((r) => r.requirement_id));
  const rows: SitResultRow[] = joined.map((r) =>
    sitRowIds.has(r.requirement_id)
      ? r
      : { ...r, submitted_at: null, final_answer: null, band: null,
          technical_marks_awarded: null, technical_feedback: null },
  );

  // ── The existing chain, unchanged and in the student's order ────────────────
  const ordered = orderPaper(caseIds, rows);
  const titles = new Map(cases.map((c) => [c.id, c.title]));

  const pacing = computePacing(toPacingInputs(ordered), {
    started_at: attempt.started_at,
    completed_at: attempt.completed_at,
    completed: attempt.completed,
  });
  const debrief = buildDebrief(
    toDebriefRequirements(ordered),
    toDebriefCases(caseIds, titles, (markingRows ?? []) as SitCaseMarkingRow[]),
    pacing,
  );

  return {
    attempt,
    paper: { id: PAPER.id, paper: PAPER.paper, title: PAPER.title, duration_minutes: PAPER.duration_minutes },
    cases: caseIds.map((id) => ({ id, title: titles.get(id) ?? null })),
    debrief,
    pacing,
    answers: answersByRequirement(joined.filter((r) => sitRowIds.has(r.requirement_id))),
    other_completed_attempts: otherCompleted,
  };
}
