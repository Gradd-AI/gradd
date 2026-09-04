// lib/org/trainee-sit.ts
// The coordinator's cross-user read of a trainee's sat mock: AUTHORISATION, then which
// attempt, then `lib/acca/sit-report.ts` does the rest.
//
// ── THIS IS THE FIRST CROSS-USER READER IN THE PRODUCT ───────────────────────
// Everything else that touches a sit derives its user from the session. This one is handed
// a userId, so it is the one place where getting authorisation wrong exposes somebody's
// exam script to another person. It ships only because both gates closed first
// (2026-09-03): `requireCoordinator` is scoped to the org being viewed, and the trainee
// page checks that the userId is in the cohort. This module assumes NEITHER — it re-checks
// the org/cohort link itself, so a future caller that forgets cannot widen it.
//
// ── IT REIMPLEMENTS NOTHING, AND NOW IT DOESN'T EVEN COPY ────────────────────
// This file used to hold its own copy of the assembly: four queries and the
// `orderPaper → computePacing → buildDebrief` chain, duplicated from the sit-results route
// with a header explaining why duplicating it was acceptable. That reasoning held at two
// copies. The student's own permanent results page (2026-09-04) would have been a third,
// and at three the question stops being "do these agree" and becomes "which is right".
//
// The assembly moved to `lib/acca/sit-report.ts` and BOTH readers call it. What is left
// here is what was always genuinely this module's: proving the caller may see this
// trainee's paper, and choosing which sitting to show.

import { createServiceClient } from '@/lib/supabase/server';
import { getMockPaper, getMockPapers, type MockPaper } from '@/lib/acca/mocks';
import { assembleSitReport, type SitReport } from '@/lib/acca/sit-report';
import { getCohortById, cohortPaper } from '@/lib/org/queries';
import { servedPaper } from '@/lib/acca/paper';

// Re-exported so the trainee page and its fixtures keep one name for one thing. The pure
// sit/practice boundary (`rowsForAttempt`) and the answer map moved with the assembly; they
// are exported from `lib/acca/sit-report.ts` and re-exported here rather than copied.
export {
  rowsForAttempt,
  answersByRequirement,
  type SitProgressRow,
} from '@/lib/acca/sit-report';

/** The coordinator's view of a trainee's sit IS the report every reader gets — same fields,
 *  same caveats, same chain. The alias is kept because call sites read better for it. */
export type TraineeSitResults = SitReport;

/**
 * The trainee's most recent COMPLETED sit on the cohort's paper, assembled into the same
 * report the student reads.
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

  // ── THE ATTEMPT IS TAKEN EXPLICITLY ─────────────────────────────────────────
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
    .limit(1);

  const attempt = ((attemptRows ?? []) as Array<{
    id: string; mock_id: string; started_at: string;
    ends_at: string | null; completed: boolean; completed_at: string | null;
  }>)[0];
  if (!attempt) return null;            // no completed sit → empty state, not an error

  const PAPER: MockPaper | null = getMockPaper(attempt.mock_id);
  if (!PAPER) return null;

  // The attempt is already in hand, so the assembly is entered below the re-fetch — the
  // ownership floor `buildSitReport` applies is satisfied here by the `.eq('user_id', …)`
  // above plus the org/cohort re-check at the top of this function.
  return assembleSitReport(sb, userId, PAPER, attempt);
}
