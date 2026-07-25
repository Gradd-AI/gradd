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

console.log(failures === 0 ? '\nALL CASE-SIT FIXTURES PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
