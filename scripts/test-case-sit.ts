// scripts/test-case-sit.ts
// Fixtures for the pure sit-vs-practice decision logic (lib/acca/case-sit.ts). Pure —
// no env/DB/model. Proves: the SIT completion gate passes when every requirement has
// a recorded final_answer (blank '' counts); the PRACTICE gate is UNCHANGED (still
// requires every requirement judged correct) — the teach-until-pass regression.

import { caseMarkReady, shouldRunTeachLoop, type ReqGateState } from '../lib/acca/case-sit';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
}

const r = (final_answer: string | null, passed: boolean): ReqGateState => ({ final_answer, passed });

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
  ok('sit: the block reason names the missing count', /1 requirement\(s\) have no recorded answer/.test(g.reason ?? ''));
}
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

console.log(failures === 0 ? '\nALL CASE-SIT FIXTURES PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
