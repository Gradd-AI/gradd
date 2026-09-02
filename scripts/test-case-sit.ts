// scripts/test-case-sit.ts
// Fixtures for the pure sit-vs-practice decision logic (lib/acca/case-sit.ts). Pure —
// no env/DB/model. Proves: the SIT completion gate passes when every requirement has
// a recorded final_answer (blank '' counts); the PRACTICE gate is UNCHANGED (still
// requires every requirement judged correct) — the teach-until-pass regression.

import { caseMarkReady, shouldRunTeachLoop, progressModeFilter, progressRowMatches, type ReqGateState } from '../lib/acca/case-sit';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
}

// A SIT-submitted requirement: it carries the sit's own timestamp. `submitted_at` is written
// ONLY by the sit write path, which is what makes it the discriminator.
const r = (final_answer: string | null, passed: boolean): ReqGateState =>
  ({ final_answer, passed, submitted_at: final_answer === null ? null : '2026-08-01T09:00:00Z' });

// A PRACTICE requirement: real work, real final_answer, judged correct — and NO submitted_at,
// because it was never submitted to a sitting. This is the row that used to satisfy the sit
// gate and mark an unsat paper 80/80.
const practice = (final_answer: string): ReqGateState =>
  ({ final_answer, passed: true, submitted_at: null });

// ── shouldRunTeachLoop — practice teaches, a sit does not ──
ok('practice (sitting=false) runs the teach loop', shouldRunTeachLoop(false) === true);
ok('sit (sitting=true) does NOT run the teach loop', shouldRunTeachLoop(true) === false);

// ── SIT gate: ready iff every requirement has a recorded final_answer ──
ok('sit: all answers recorded → ready', caseMarkReady(true, [r('answer one', false), r('answer two', false)]).ready === true);
ok('sit: a BLANK recorded answer still counts as recorded', caseMarkReady(true, [r('answer', false), r('', false)]).ready === true);
ok('sit: an all-blank paper is still ready (marks as it stands, all zero)', caseMarkReady(true, [r('', false), r('', false)]).ready === true);
{
  const g = caseMarkReady(true, [r('answer', false), r(null, false)]);
  ok('sit: a requirement with NO recorded answer (null) blocks', g.ready === false);
  ok('sit: the block reason names the missing count', /1 requirement\(s\) were not submitted in this sitting/.test(g.reason ?? ''));
}

// ── THE ROOT DEFECT (fixed 2026-08-01) — PRACTICE WORK IS NOT A SAT PAPER ────
// The gate used to test `final_answer != null`, which the practice teach loop satisfies: it
// writes the accepted answer on a pass. A user who had practised the three APM mock cases in
// July opened the mock and it marked itself 80/80 technical and 20/20 PS on a paper never sat.
// These are the assertions that would have caught it.
ok('sit: PRACTICE work (final_answer, passed, no submitted_at) does NOT satisfy the sit gate',
  caseMarkReady(true, [practice('a real 2,674-character answer'), practice('another')]).ready === false);
ok('sit: ONE practice requirement among submitted ones still blocks',
  caseMarkReady(true, [r('answer', false), practice('practised earlier')]).ready === false);
ok('sit: the reason says NOT SUBMITTED, not "no recorded answer" — the answer exists',
  /were not submitted in this sitting/.test(
    caseMarkReady(true, [r('a', false), practice('x')]).reason ?? ''));
ok('sit: a blank SUBMISSION is still ready — it was submitted, it just says nothing',
  caseMarkReady(true, [r('', false), r('', false)]).ready === true);
ok('sit: `passed` is IRRELEVANT to the sit gate (unset everywhere, still ready)', caseMarkReady(true, [r('a', false), r('b', false)]).ready === true);

// ── PRACTICE gate: UNCHANGED — every requirement must be judged correct ──
ok('practice: all passed → ready', caseMarkReady(false, [r('a', true), r('b', true)]).ready === true);
{
  const g = caseMarkReady(false, [r('a', true), r('b', false)]);
  ok('practice: one unpassed requirement blocks', g.ready === false);
  ok('practice: the block reason is the original "case not complete"', g.reason === 'case not complete');
}
ok('practice: recorded final_answers do NOT satisfy the practice gate (passed is what matters)', caseMarkReady(false, [r('a', false), r('b', false)]).ready === false);

// ── empty requirement list never marks ──
ok('empty requirements → not ready (sit)', caseMarkReady(true, []).ready === false);
ok('empty requirements → not ready (practice)', caseMarkReady(false, []).ready === false);

// ── attemptClosed: the expiry arm (added 2026-07-31 with the countdown) ──────
// When the clock runs out the auto-submit records ONLY the requirement being written, so
// everything after it has no row at all. Those requirements must stay `not_reached` — a
// different finding from a blank the candidate chose to submit — so the gate had to move
// rather than the data being back-filled with empty strings.
ok('sit + CLOSED attempt: an unreached requirement no longer blocks',
  caseMarkReady(true, [r('answer', false), r(null, false)], true).ready === true);
ok('sit + CLOSED attempt: a wholly unstarted case is markable as it stands',
  caseMarkReady(true, [r(null, false), r(null, false)], true).ready === true);
ok('sit + OPEN attempt: an unreached requirement STILL blocks (unchanged)',
  caseMarkReady(true, [r('answer', false), r(null, false)], false).ready === false);
ok('attemptClosed defaults FALSE, so existing callers are unchanged',
  caseMarkReady(true, [r('answer', false), r(null, false)]).ready === false);
ok('an empty case is not markable even when the attempt is closed',
  caseMarkReady(true, [], true).ready === false);
// PRACTICE ignores it entirely — there is no attempt and no clock to close.
ok('practice ignores attemptClosed (a failed requirement still blocks)',
  caseMarkReady(false, [r('a', true), r('b', false)], true).ready === false);
ok('practice + attemptClosed still passes when everything passed',
  caseMarkReady(false, [r('a', true), r('b', true)], true).ready === true);

// ── progressModeFilter — WHICH ROW DOES A MODE'S WRITE OWN? ───────────────────
// P-G3(a) POSITIVE CONTROL. `acca_case_progress` carries UNIQUE NULLS NOT DISTINCT
// (user_id, case_id, requirement_id, attempt_id), so ONE (user, case, requirement) holds
// BOTH a practice row (attempt_id NULL) and a sit row. The shipped per-requirement update
// in case-mark-run.ts filtered on the three columns only — a SET, not a row — so a sit's
// technical marking wrote band / technical_marks_* / technical_feedback onto the practice
// row as well as its own.
//
// BOTH HALVES ARE ASSERTED. A test that only checked "the practice row is untouched" would
// pass on a filter that matches NOTHING, which loses the marking entirely — the failure
// mode that is worse than the bug. So each case also asserts the intended row IS matched.
{
  const PRACTICE = { attempt_id: null } as const;
  const SIT_A    = { attempt_id: 'attempt-A' } as const;
  const SIT_B    = { attempt_id: 'attempt-B' } as const;
  const BOTH = [PRACTICE, SIT_A];

  // SIT MODE — owns its own attempt's row, and only that one.
  {
    const f = progressModeFilter(true, 'attempt-A');
    ok('sit filter targets attempt_id', f.op === 'eq' && f.column === 'attempt_id' && f.value === 'attempt-A');
    ok('sit write LANDS on the sit row', progressRowMatches(SIT_A, f) === true);
    ok('sit write does NOT touch the practice row', progressRowMatches(PRACTICE, f) === false);
    ok('sit write does NOT touch another sitting', progressRowMatches(SIT_B, f) === false);
    ok('sit write matches EXACTLY ONE of the two coexisting rows',
      BOTH.filter((r) => progressRowMatches(r, f)).length === 1);
  }

  // PRACTICE MODE — owns the NULL row, and only that one.
  {
    const f = progressModeFilter(false, null);
    ok('practice filter is IS NULL', f.op === 'is' && f.column === 'attempt_id' && f.value === null);
    ok('practice write LANDS on the practice row', progressRowMatches(PRACTICE, f) === true);
    ok('practice write does NOT touch the sit row', progressRowMatches(SIT_A, f) === false);
    ok('practice write matches EXACTLY ONE of the two coexisting rows',
      BOTH.filter((r) => progressRowMatches(r, f)).length === 1);
    // An attemptId in practice mode is ignored, never honoured — practice has no sitting.
    const g = progressModeFilter(false, 'attempt-A');
    ok('practice ignores a stray attemptId', g.op === 'is' && progressRowMatches(PRACTICE, g) === true);
  }

  // MUST-FAIL: the SHIPPED behaviour — no attempt scoping at all.
  {
    const LEGACY_matches = (_row: { attempt_id: string | null }) => true;  // user+case+requirement only
    const hit = BOTH.filter(LEGACY_matches).length;
    ok('shipped write is pinned WRONG — it matched BOTH rows', hit === 2);
    ok('shipped write differs from the sit-scoped write',
      hit !== BOTH.filter((r) => progressRowMatches(r, progressModeFilter(true, 'attempt-A'))).length);
  }

  // A sit without an attempt_id must THROW, never widen to every row. runCaseMarking
  // already 409s first; this is the second line, so a bypass cannot silently overwrite.
  {
    let threw = false;
    try { progressModeFilter(true, null); } catch { threw = true; }
    ok('sit mode with no attemptId throws rather than matching everything', threw);
  }
}


console.log(failures === 0 ? '\nALL CASE-SIT FIXTURES PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
