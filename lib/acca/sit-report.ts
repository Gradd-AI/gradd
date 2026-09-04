// lib/acca/sit-report.ts
// ONE assembly of a sat mock paper, for every reader of one.
//
// ── WHY THIS MODULE EXISTS ───────────────────────────────────────────────────
// The debrief a student reads at the end of a paper is built by
// app/api/acca/sit/results/route.ts. The debrief a COORDINATOR reads was built by a second
// copy of the same chain in lib/org/trainee-sit.ts. A third reader — the student's own
// permanent results page — would have been a third copy, and at three copies the question
// stops being "do these agree today" and becomes "which one is right".
//
// So the chain lives here once. `buildSitReport` takes a user id and an attempt id and
// returns the whole report; every caller supplies its own AUTHORISATION and nothing else.
// The org path re-checks the org/cohort link and picks the cohort's paper; the student path
// checks the session and the entitlement. Neither owns any part of the assembly.
//
//   orderPaper → toPacingInputs → computePacing
//   toDebriefRequirements + toDebriefCases → buildDebrief
//
// That is the same chain, in the same order, that the sit-results route runs. It is still
// not literally shared with that route: `buildResponse`/`loadPaper` there are private and
// carry request-shaped concerns (the marking claim, the 409s, paper resolution from a URL),
// and extracting them would mean editing the live sit write path to serve a read-only
// screen. Two call sites of the chain, not three; and if the reports ever differ it is
// because the rows differ, never because a second implementation drifted.
//
// ── THIS MODULE NEVER MARKS, AND CANNOT ─────────────────────────────────────
// It reads `acca_case_marking`; it never writes it, never claims a case, and imports
// neither `runCaseMarking` nor anything that reaches a model. A paper that was never marked
// reports `technical_awarded: null` — honestly unmarked — rather than being marked on
// sight. Marking is a paid model call whose output moves run to run, and it has exactly one
// trigger: the client POSTing sit/results from the `done` phase. A revisit is a read.
//
// There is deliberately NO `paperFullySubmitted || attemptIsClosed` gate here. That gate
// exists in sit/results to protect MARKING — refusing to score work in progress. A read has
// nothing to protect, so a half-sat or unmarked attempt renders as it is: null bands, null
// marks, `not_reached` tails intact.
//
// ── ⚠️ WITHHOLD DISCIPLINE — `model_answer` IS NOT SELECTED HERE ─────────────
// Three routes already state this and none of them is an accident to be routed around:
// app/api/acca/case ("deliberately does NOT select model_answer / hint / full_reveal"),
// app/api/acca/sit ("never selects model_answer …"), and app/api/acca/sit/results ("this
// route selects `model_answer` NOWHERE"). This module is the fourth, and the reason is
// stronger here than on any of them, because this is the surface a student KEEPS:
//
//   • A mock case is `mock_only` RESERVED content and there is exactly ONE mock per paper.
//     Disclosure is per-student irreversible, and a re-sit cannot be marked anyway
//     (acca_case_marking has no attempt dimension — open item, AFM_SURFACED.md 2026-08-01),
//     so a paper whose model answers have been read is a paper that is spent.
//   • The withhold is ARCHITECTURAL, not instructed (docs/TEACHING_ARCHITECTURE.md, LOCKED):
//     the tutor cannot reveal an answer because the answer is never in reach. A permanent
//     page holding the model answer builds the surface that design deliberately never built.
//   • A case requirement's `model_answer` is a hand-typed literal unless it was built by a
//     calculator's build*ModelAnswer() (the Piece-1 rule; `answer_schema` is NULL wherever
//     it was not), so most of them have never been code-verified against anything.
//
// `full_reveal` IS selected and IS shown (ruled by Grant, 2026-09-04). It is the TEACHING
// field — authored to teach the method and to name the misconception (P7) without handing
// over the answer — and it is what the drill loop's own earned reveal serves. It gives the
// revision value the model answer was wanted for, and spends nothing.
//
// `question` is selected too, and that is not a disclosure at all: the student read every
// question during the paper. An answer printed with no question is not revisable.

import { getMockPaper, getMockPapers, type MockPaper } from '@/lib/acca/mocks';
import { sitCaseGate } from '@/lib/acca/sit-preview';
import {
  orderPaper, toPacingInputs, toDebriefRequirements, toDebriefCases,
  type SitResultRow, type SitCaseMarkingRow,
} from '@/lib/acca/sit-results';
import { computePacing, type PacingReport } from '@/lib/acca/pacing';
import { buildDebrief, type DebriefReport } from '@/lib/acca/debrief';
import type { ServedPaper } from '@/lib/acca/paper';

/** The minimum surface of the Supabase client this module uses. Typed structurally so
 *  callers pass their own service client without this module creating one — the same shape
 *  lib/acca/sit-attempt.ts uses, and for the same reason. */
type Queryable = {
  from: (table: string) => any;   // eslint-disable-line @typescript-eslint/no-explicit-any
};

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

/** The authored side of a requirement that is safe to show AFTER the paper: what was asked,
 *  and the teaching reveal. Deliberately a SIBLING map rather than a field on
 *  `DebriefRequirementLine` — `buildDebrief` produces a marking artefact and knows nothing
 *  about teaching content; threading these through it would make it the carrier of a
 *  disclosure decision it has no business holding. */
export interface RequirementStudyNote {
  /** What was asked. Not a disclosure — the student read it during the paper. */
  question: string | null;
  /** The TEACHING reveal. NOT `model_answer` — see the withhold block in this file's header. */
  full_reveal: string | null;
}

export interface SitReport {
  attempt: {
    id: string;
    mock_id: string;
    started_at: string;
    ends_at: string | null;
    completed: boolean;
    completed_at: string | null;
  };
  paper: { id: string; paper: ServedPaper; title: string; duration_minutes: number };
  cases: Array<{ id: string; title: string | null }>;
  debrief: DebriefReport;
  pacing: PacingReport;
  /** requirement_id → the submitted answer. '' is a real blank submission, not a missing one. */
  answers: Record<string, string | null>;
  /** requirement_id → what was asked, and the teaching reveal. */
  study: Record<string, RequirementStudyNote>;
  /**
   * ⚠️ HOW MANY OTHER COMPLETED SITS THIS USER HAS ON THIS PAPER.
   *
   * Non-zero means the CASE-LEVEL totals are not certainly this attempt's.
   * `acca_case_progress` is attempt-scoped (it has `attempt_id`); `acca_case_marking` is
   * keyed (user_id, case_id) with NO attempt_id and is UPSERTed, so it holds whichever
   * sitting was marked most recently. The per-requirement marks, bands and feedback are
   * exact for this attempt; the case PS/technical totals and per-skill feedback are the
   * latest marking of those cases by this user.
   *
   * Live and non-zero today — one real account holds five completed attempts across the two
   * papers. Surfaced rather than silently assumed away, because the two halves of one screen
   * would otherwise disagree without anyone being told.
   */
  other_completed_attempts: number;
}

/**
 * Assemble ONE completed sit into its report. Returns null — never throws — when there is
 * nothing to show: an attempt id that does not exist, is not this user's, names an
 * unregistered mock, or whose cases are not servable.
 *
 * ── AUTHORISATION IS THE CALLER'S, WITH ONE FLOOR ───────────────────────────
 * `userId` is applied to EVERY query here, including the attempt lookup, and the attempt
 * row is re-checked against it after it arrives — the same discipline as `rowsForAttempt`:
 * a fact about the row, not a promise about the query. So a caller that takes an attempt id
 * from a URL cannot read someone else's paper by forgetting a filter. That is a FLOOR, not
 * the whole gate: whether this user may see any of it (session, entitlement, cohort
 * membership) is decided above.
 */
export async function buildSitReport(
  sb: Queryable,
  userId: string,
  attemptId: string,
): Promise<SitReport | null> {
  const { data: attemptRow } = await sb
    .from('acca_mock_attempts')
    .select('id, user_id, mock_id, started_at, ends_at, completed, completed_at')
    .eq('id', attemptId)
    .eq('user_id', userId)
    .maybeSingle();

  const attempt = (attemptRow ?? null) as
    | { id: string; user_id: string; mock_id: string; started_at: string;
        ends_at: string | null; completed: boolean; completed_at: string | null }
    | null;
  // Re-asserted on the ROW, not trusted from the query. See the authorisation note above.
  if (!attempt || attempt.user_id !== userId) return null;

  const PAPER: MockPaper | null = getMockPaper(attempt.mock_id);
  if (!PAPER) return null;

  return assembleSitReport(sb, userId, PAPER, {
    id: attempt.id,
    mock_id: attempt.mock_id,
    started_at: attempt.started_at,
    ends_at: attempt.ends_at,
    completed: attempt.completed,
    completed_at: attempt.completed_at,
  });
}

/**
 * The assembly proper, once the attempt and its paper are known and authorised. Separate
 * from `buildSitReport` so a caller that has ALREADY selected an attempt — the coordinator
 * picks the most recent completed one on the cohort's paper, in one query that also answers
 * "is there more than one?" — does not re-fetch the row it just read.
 */
export async function assembleSitReport(
  sb: Queryable,
  userId: string,
  PAPER: MockPaper,
  attempt: SitReport['attempt'],
): Promise<SitReport | null> {
  const caseIds = PAPER.case_ids;

  // How many OTHER completed attempts exist ON THIS PAPER — the caveat on the case-level
  // totals. Scoped to this paper's mock ids: two sittings of ONE paper collide in
  // acca_case_marking, an APM sit and an AFM sit never do.
  const mockIds = getMockPapers(PAPER.paper).map((p) => p.id);
  const { count: completedCount } = await sb
    .from('acca_mock_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .in('mock_id', mockIds)
    .eq('completed', true);
  const otherCompleted = Math.max(0, (completedCount ?? 1) - 1);

  // Cases, through the SAME serving gate the sit route uses — a case that is no longer
  // servable is not silently rendered from a stale id.
  let caseQuery = sb.from('acca_cases').select('id, title').in('id', caseIds as string[]);
  for (const [column, value] of Object.entries(sitCaseGate(PAPER.paper))) {
    caseQuery = caseQuery.eq(column, value as never);
  }
  const { data: caseRows } = await caseQuery;
  const cases = ((caseRows ?? []) as Array<{ id: string; title: string | null }>);
  if (cases.length === 0) return null;

  // `question` and `full_reveal` ARE selected; `model_answer` is NOT, and must not be —
  // read the withhold block in this file's header before adding a column to this line.
  const { data: reqRows } = await sb
    .from('acca_case_requirements')
    .select('id, case_id, requirement_order, label, lo_code, marks_guide, question, full_reveal')
    .in('case_id', caseIds as string[])
    .order('requirement_order', { ascending: true });

  // ── SIT ROWS ONLY ───────────────────────────────────────────────────────────
  // `.eq('attempt_id', …)` cannot match a NULL, so practice rows are excluded in SQL; the
  // column is selected so `rowsForAttempt` can re-assert it on the rows themselves.
  const { data: progressRows } = await sb
    .from('acca_case_progress')
    .select('requirement_id, case_id, attempt_id, final_answer, submitted_at, band, technical_marks_awarded, technical_feedback')
    .eq('user_id', userId)
    .eq('attempt_id', attempt.id)
    .in('case_id', caseIds as string[]);

  const { data: markingRows } = await sb
    .from('acca_case_marking')
    .select('case_id, professional_marks_awarded, professional_marks_available, per_skill, technical_marks_awarded, technical_marks_available')
    .eq('user_id', userId)
    .in('case_id', caseIds as string[]);

  const progressByReq = new Map(
    ((progressRows ?? []) as Array<Record<string, unknown>>).map((p) => [p.requirement_id as string, p]),
  );

  const authored = (reqRows ?? []) as Array<Record<string, unknown>>;

  const joined: SitProgressRow[] = authored.map((r) => {
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

  const study: Record<string, RequirementStudyNote> = {};
  for (const r of authored) {
    study[r.id as string] = {
      question: (r.question as string | null) ?? null,
      full_reveal: (r.full_reveal as string | null) ?? null,
    };
  }

  return {
    attempt,
    paper: { id: PAPER.id, paper: PAPER.paper, title: PAPER.title, duration_minutes: PAPER.duration_minutes },
    cases: caseIds.map((id) => ({ id, title: titles.get(id) ?? null })),
    debrief,
    pacing,
    answers: answersByRequirement(joined.filter((r) => sitRowIds.has(r.requirement_id))),
    study,
    other_completed_attempts: otherCompleted,
  };
}

// ── THE INDEX — which of my papers can I open? ───────────────────────────────

export interface SitAttemptSummary {
  attempt_id: string;
  mock_id: string;
  paper: ServedPaper;
  title: string;
  started_at: string;
  completed_at: string | null;
  /** Requirements with a recorded answer for THIS attempt (a blank submission counts). */
  answered: number;
  /** Requirements the technical marker has banded. 0 = this paper was never marked. */
  banded: number;
  /** Requirements on the paper — the denominator, from the authored rows. */
  total: number;
}

/** One attempt row as the index reads it. */
export interface SitAttemptRow {
  id: string;
  mock_id: string;
  started_at: string;
  completed_at: string | null;
}

/** One progress row as the index reads it — the two columns that answer "was this sat" and
 *  "was it marked", and nothing else. */
export interface SitAttemptProgressRow {
  attempt_id: string | null;
  band: string | null;
}

/**
 * PURE. Which sittings can be opened, and what each one says on the index.
 *
 * ⚠️ AN ATTEMPT IS NOT LISTED JUST BECAUSE IT IS `completed`, and the difference is not
 * academic. Measured against production 2026-09-04: 13 of 15 attempt rows are `completed`,
 * and only 3 have a single progress row between them. The empty ones are pre-`attempt_id`
 * APM sittings whose work went through the practice path — those rows carry a NULL
 * attempt_id and by doctrine can never reach a sit debrief, so the attempt genuinely holds
 * nothing. One real account has five completed attempts of which one has content. Listing on
 * `completed` alone would show that student four blank papers with no way to tell which one
 * was theirs, and every link would open a report with eight empty requirements.
 *
 * So a sitting is listed when it has at least one progress row OF ITS OWN. Nothing is said
 * about the rest: they are not errors, and an empty-state row per abandoned sitting would be
 * noise about the product's own history.
 *
 * A NULL `attempt_id` is dropped before counting, for the same reason `rowsForAttempt`
 * re-checks its rows: a practice row carries a `final_answer` too, and counting one here
 * would make a paper that was never sat look sat.
 *
 * Order is the CALLER'S — the query sorts by `started_at` and this preserves it. Sorting
 * again here on `completed_at` would scatter the list: that column is NULL on real completed
 * rows written before it existed.
 */
export function summariseSittings(
  attempts: readonly SitAttemptRow[],
  papersById: ReadonlyMap<string, MockPaper>,
  progress: readonly SitAttemptProgressRow[],
  requirementsPerCase: ReadonlyMap<string, number>,
): SitAttemptSummary[] {
  const answered = new Map<string, number>();
  const banded = new Map<string, number>();
  for (const p of progress) {
    if (!p.attempt_id) continue;      // a practice row can never be counted into a sitting
    answered.set(p.attempt_id, (answered.get(p.attempt_id) ?? 0) + 1);
    if (p.band) banded.set(p.attempt_id, (banded.get(p.attempt_id) ?? 0) + 1);
  }

  const out: SitAttemptSummary[] = [];
  for (const a of attempts) {
    const config = papersById.get(a.mock_id);
    if (!config) continue;            // an attempt on an unregistered mock opens nothing
    if ((answered.get(a.id) ?? 0) === 0) continue;
    out.push({
      attempt_id: a.id,
      mock_id: a.mock_id,
      paper: config.paper,
      title: config.title,
      started_at: a.started_at,
      completed_at: a.completed_at,
      answered: answered.get(a.id) ?? 0,
      banded: banded.get(a.id) ?? 0,
      total: config.case_ids.reduce((n, cid) => n + (requirementsPerCase.get(cid) ?? 0), 0),
    });
  }
  return out;
}

/**
 * The student's own openable sittings on one paper, newest first. Three reads, then
 * `summariseSittings` decides everything — the filter that keeps blank papers off the index
 * is pure and fixtured, because a query builder's `.eq()` cannot be tested and this rule can.
 */
export async function listSitAttempts(
  sb: Queryable,
  userId: string,
  paper: ServedPaper,
): Promise<SitAttemptSummary[]> {
  const papers = getMockPapers(paper);
  if (papers.length === 0) return [];
  const papersById = new Map(papers.map((p) => [p.id, p]));

  const { data: attemptRows } = await sb
    .from('acca_mock_attempts')
    .select('id, mock_id, started_at, completed_at')
    .eq('user_id', userId)
    .in('mock_id', [...papersById.keys()])
    .eq('completed', true)
    .order('started_at', { ascending: false });

  const attempts = (attemptRows ?? []) as SitAttemptRow[];
  if (attempts.length === 0) return [];

  const caseIds = [...new Set(papers.flatMap((p) => p.case_ids))];

  // Two counts per attempt from ONE read of the progress rows: how much was answered, and
  // how much was marked. `band` is what separates "sat but never marked" from "marked" —
  // and marking is a paid model call this page cannot make, so the index says which it is
  // and sends the student to the surface that owns the retry.
  const [{ data: progressRows }, { data: reqRows }] = await Promise.all([
    sb.from('acca_case_progress')
      .select('attempt_id, band')
      .eq('user_id', userId)
      .in('attempt_id', attempts.map((a) => a.id)),
    sb.from('acca_case_requirements').select('id, case_id').in('case_id', caseIds),
  ]);

  const requirementsPerCase = new Map<string, number>();
  for (const r of (reqRows ?? []) as Array<{ id: string; case_id: string }>) {
    requirementsPerCase.set(r.case_id, (requirementsPerCase.get(r.case_id) ?? 0) + 1);
  }

  return summariseSittings(
    attempts,
    papersById,
    (progressRows ?? []) as SitAttemptProgressRow[],
    requirementsPerCase,
  );
}
