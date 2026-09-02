// lib/acca/case-sit.ts
// Pure decision logic for the timed-SIT flow vs the practice TEACH flow. No DB, no
// model, no I/O — case/turn, case/mark and case (GET) import these so the mode
// decision is tested in isolation and identical across all three routes.
//
// The two modes differ in ONE place each:
//   • case/turn: PRACTICE runs the teach loop (runTeachTurn — hint/diagnose/retry
//     until a requirement is judged correct); a SIT records the single submitted
//     final_answer and does NOT run the engine or set `passed`.
//   • case/mark: PRACTICE gates on every requirement judged correct (passed===true);
//     a SIT gates on every requirement having a RECORDED final_answer (blank '' is a
//     valid, final, zero-credit answer), then marks whatever was written.
//
// `passed` is NEVER overloaded: it keeps meaning "judged correct" and is NEVER SET TO
// TRUE in a sit (a sit is graded by the technical band pass, not by turn-time
// correctness).
//
// PRECISELY, because the looser wording misled: the sit write path never mentions the
// column, but `acca_case_progress.passed` carries a NOT NULL DEFAULT FALSE, so the row
// READS BACK `false`, not null. Measured 2026-07-29 — 7/7 sit rows came back false.
// Every gate below therefore tests `passed !== true` rather than "is it null", and must
// keep doing so: a null check would be wrong against the actual column.

// PRACTICE (sitting=false) runs the teach loop; a SIT (sitting=true) does not.
export function shouldRunTeachLoop(sitting: boolean): boolean {
  return !sitting;
}

export interface ReqGateState {
  final_answer: string | null;   // null = no progress row / never submitted
  passed: boolean;               // "judged correct" — only ever set in practice mode
  /** The sit's own timing record, written ONLY by the sit write path. Present ⇒ this row was
   *  submitted in a sitting. The caller must already have scoped its rows to one attempt; this
   *  is the second, independent check that the row is sit-shaped. */
  submitted_at?: string | null;
}

export interface CaseGateResult {
  ready: boolean;
  reason?: string;
}

// Can this case be marked yet?
//   • SIT: ready when EVERY requirement has a recorded final_answer (blank '' counts;
//     only a genuinely absent row — never submitted, never skipped — blocks) — OR when the
//     ATTEMPT IS CLOSED, see below.
//   • PRACTICE: ready when EVERY requirement is judged correct (unchanged from the
//     original inline `allPassed` gate). `attemptClosed` is ignored in practice — there is
//     no attempt and no clock, so nothing can close one.
//
// ── WHY `attemptClosed` EXISTS (added 2026-07-31 with the countdown) ─────────
// Before auto-submit, a sit could only end by the candidate submitting all eight
// requirements, so "every requirement recorded" and "the paper is over" were the same
// statement. They are not any more. When the clock expires, the auto-submit records the
// requirement being written and NOTHING ELSE — every requirement after it has no row at all,
// which is exactly right: `not_reached` is a different fact from `blank`, and pacing and the
// debrief both say so ("No answer was recorded", and a next action about reaching it rather
// than about the method). Writing empty strings across the tail to satisfy this gate would
// have destroyed that distinction to work around a gate.
//
// So the gate takes the OTHER honest route: an expired or finished attempt is markable as it
// stands. Defaulted false, so app/api/acca/case/mark and the client call sites are unchanged.
export function caseMarkReady(
  sitting: boolean,
  reqs: ReqGateState[],
  attemptClosed = false,
): CaseGateResult {
  if (reqs.length === 0) return { ready: false, reason: 'case not complete' };
  if (sitting) {
    if (attemptClosed) return { ready: true };
    // ── KEYS ON submitted_at, NOT final_answer (corrected 2026-08-01) ──
    // `final_answer` is written by the practice teach loop as well as the sit, so testing it
    // meant a case the student had merely PRACTISED read as a sat paper: it marked itself
    // 80/80 on work done a month earlier, in a different mode, that was never submitted to a
    // sitting. `submitted_at` is written only by the sit write path.
    //
    // The caller is ALSO expected to have scoped its rows to one attempt (see
    // case-mark-run.ts). This is the second, independent check — belt and braces, because the
    // cost of getting it wrong is marking work that was never sat.
    const missing = reqs.filter((r) => r.submitted_at == null).length;
    return missing === 0
      ? { ready: true }
      : { ready: false, reason: `${missing} requirement(s) were not submitted in this sitting` };
  }
  const unpassed = reqs.filter((r) => r.passed !== true).length;
  return unpassed === 0 ? { ready: true } : { ready: false, reason: 'case not complete' };
}

// ── WHICH acca_case_progress ROW DOES THIS MODE OWN? ──────────────────────────
// `acca_case_progress` carries `UNIQUE NULLS NOT DISTINCT (user_id, case_id,
// requirement_id, attempt_id)` (migration 20260801120000), so ONE (user, case,
// requirement) legitimately holds BOTH a practice row (attempt_id NULL) and one row per
// sitting. `(user_id, case_id, requirement_id)` alone therefore does NOT identify a row —
// it identifies a SET — and any statement using only those three touches every mode's row
// at once.
//
// ⚠️ THE BUG THIS CLOSES. `case-mark-run.ts` scoped its progress READ by mode but its
// per-requirement WRITE did not: the update filtered on user/case/requirement only, so a
// sit's technical marking wrote `band` / `technical_marks_awarded` /
// `technical_marks_available` / `technical_feedback` onto the PRACTICE row for the same
// requirement as well as its own. Invisible today only because practice never sets those
// columns and nothing reads them on a practice row — a latent overwrite waiting for the
// first path that does.
//
// The rule is expressed ONCE, here, and consumed by the read and the write, so they cannot
// drift again. It is a DESCRIPTOR rather than a query-builder helper on purpose: both call
// sites apply it in one line, and a pure descriptor is testable against real row shapes
// without a DB or a mock client.
export type ProgressModeFilter =
  | { column: 'attempt_id'; op: 'eq'; value: string }
  | { column: 'attempt_id'; op: 'is'; value: null };

/**
 * The attempt scoping for a mode. A SIT owns exactly its own attempt's row; PRACTICE owns
 * the NULL row. `attemptId` is required in sit mode — `runCaseMarking` already refuses a
 * sit without one (409 'sit marking requires an attempt_id'), so this throws rather than
 * silently widening to every row if that guard is ever bypassed.
 */
export function progressModeFilter(sitting: boolean, attemptId: string | null): ProgressModeFilter {
  if (!sitting) return { column: 'attempt_id', op: 'is', value: null };
  if (!attemptId) throw new Error('progressModeFilter: sit mode requires an attempt_id');
  return { column: 'attempt_id', op: 'eq', value: attemptId };
}

/** Does this row fall inside the filter? The predicate the DB applies, in code, so a
 *  fixture can assert which of two real rows a statement would touch. */
export function progressRowMatches(
  row: { attempt_id: string | null },
  f: ProgressModeFilter,
): boolean {
  return f.op === 'eq' ? row.attempt_id === f.value : row.attempt_id === null;
}
