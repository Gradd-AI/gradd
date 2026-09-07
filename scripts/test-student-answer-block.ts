// scripts/test-student-answer-block.ts
// Fixtures for lib/acca/student-answer-block.ts. PURE — no env, DB, model or network.
//   npm run test:student-answer-block
//
// TWO JOBS, and the first is the reason this file exists at all.
//
// (1) THE MOVE MUST BE INERT. `buildStudentAnswerBlock` was module-private in
//     app/api/acca/tutor/route.ts from 2026-07-23 until it moved here on 2026-09-07. The drill
//     surface is the CONTROL in the false-absence measurement, so its prompt bytes must not have
//     changed by a character. All three branches are pinned against the strings the route
//     produced before the move — transcribed from the pre-move source, not from the new one, so
//     this cannot pass by describing whatever the code now does.
//
// (2) THE CASE ENGINE MUST ACTUALLY CALL IT. Importing the module is not the fix; passing the
//     prior attempt is. A static check reads lib/acca/teach-engine.ts and asserts that
//     call2_diagnose and call3_teach both take a priorAttempt and both build their student block
//     through this function — because the defect being closed was precisely a leg that had the
//     value available one frame up the stack and did not use it.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildStudentAnswerBlock, HINT_IS_EXCLUDED } from '../lib/acca/student-answer-block';

let failures = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}
const show = (s: string) => JSON.stringify(s);
const read = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8');

// ── (1) THE THREE BRANCHES, PINNED BYTE-FOR-BYTE ─────────────────────────────
console.log('-- the pre-move bytes, transcribed from the 2026-07-23 implementation --');

const ATTEMPT = 'ENPV = (0.30 x 331) + (0.45 x 6) + (0.25 x -320) = NOK 22m.';
const PRIOR   = 'Strong 331m, central 6m, delayed (320)m.';

ok('null prior collapses to the single block',
  buildStudentAnswerBlock(ATTEMPT, null) === `Student answer: ${ATTEMPT}\n\n`,
  show(buildStudentAnswerBlock(ATTEMPT, null)));

ok('an UNCHANGED re-send collapses too — no duplicate block, no empty label',
  buildStudentAnswerBlock(ATTEMPT, ATTEMPT) === `Student answer: ${ATTEMPT}\n\n`,
  show(buildStudentAnswerBlock(ATTEMPT, ATTEMPT)));

ok('a DIFFERENT prior produces the two labelled blocks, in this order',
  buildStudentAnswerBlock(ATTEMPT, PRIOR) ===
    `Student's most recent full attempt: ${PRIOR}\n\n` +
    `Student's latest message: ${ATTEMPT}\n\n`,
  show(buildStudentAnswerBlock(ATTEMPT, PRIOR)));

// The empty string is FALSY and must collapse — a stored `last_real_attempt` of '' is a row that
// has never carried an attempt, and rendering "most recent full attempt: " with nothing after it
// would tell the model the student submitted a blank, which is a different claim from silence.
ok('an EMPTY prior collapses, it does not render an empty labelled block',
  buildStudentAnswerBlock(ATTEMPT, '') === `Student answer: ${ATTEMPT}\n\n`,
  show(buildStudentAnswerBlock(ATTEMPT, '')));

// P-G3: the shapes this must NOT produce.
ok('MUST FAIL: it never emits the two-block form when the prior equals the attempt',
  !buildStudentAnswerBlock(ATTEMPT, ATTEMPT).includes('most recent full attempt'));
ok('MUST FAIL: it never drops the latest message when a prior exists',
  buildStudentAnswerBlock(ATTEMPT, PRIOR).includes(ATTEMPT));
ok('MUST FAIL: it never drops the prior when the two differ',
  buildStudentAnswerBlock(ATTEMPT, PRIOR).includes(PRIOR));

// ── (2) BOTH SURFACES CALL IT, ON BOTH LEGS ──────────────────────────────────
console.log('\n-- the two surfaces, and the legs that must be passed a prior attempt --');

const engine = read('lib/acca/teach-engine.ts');
const drill  = read('app/api/acca/tutor/route.ts');

for (const [label, src] of [['case engine', engine], ['drill route', drill]] as const) {
  ok(`${label} imports the shared block builder`,
    /from '(\.|@\/lib\/acca)\/student-answer-block'/.test(src));
  ok(`${label} defines no local copy of it`,
    !/function buildStudentAnswerBlock/.test(src));
}

// The signature check is on the PARAMETER, not on the call, because a leg can be handed the value
// and ignore it — which is exactly the state the case engine was in for ten weeks.
function fnHead(src: string, name: string): string {
  const i = src.indexOf(`async function ${name}(`);
  if (i === -1) return '';
  const j = src.indexOf('): Promise', i);
  return j === -1 ? '' : src.slice(i, j);
}
for (const leg of ['call2_diagnose', 'call3_teach']) {
  ok(`case engine ${leg} takes a priorAttempt`,
    /priorAttempt: string \| null/.test(fnHead(engine, leg)), fnHead(engine, leg).slice(0, 60));
  ok(`drill route ${leg} takes a priorAttempt`,
    /priorAttempt: string \| null/.test(fnHead(drill, leg)), fnHead(drill, leg).slice(0, 60));
}

// Both engines must BUILD their student block through the shared function on those legs. Counted
// rather than merely present: the case engine has five `Student answer:` sites and only two of
// them are the withholding pipeline, so a bare `.includes()` would pass while the wrong two moved.
const engineCalls = (engine.match(/buildStudentAnswerBlock\(attempt, priorAttempt\)/g) ?? []).length;
const drillCalls  = (drill.match(/buildStudentAnswerBlock\(attempt, priorAttempt\)/g) ?? []).length;
ok('case engine builds the block on exactly the two legs', engineCalls === 2, `${engineCalls} sites`);
ok('drill route builds the block on exactly the two legs', drillCalls === 2, `${drillCalls} sites`);

// ── (3) THE LEGS DELIBERATELY LEFT ALONE ─────────────────────────────────────
// Stated so that "call3_hint does not get one" is a recorded decision with an argument rather
// than something a later reader fixes by accident.
console.log('\n-- the legs that are deliberately NOT given a prior attempt --');
ok('call3_hint takes no priorAttempt, on either surface',
  !/priorAttempt/.test(fnHead(engine, 'call3_hint')) && !/priorAttempt/.test(fnHead(drill, 'call3_hint')));
ok('the reason is recorded in the module, not left to inference',
  HINT_IS_EXCLUDED.includes('first attempt-classified turn') && HINT_IS_EXCLUDED.includes('null'));
ok('call3_confirm and completenessCheck are untouched — both judge the CURRENT answer',
  !/priorAttempt/.test(fnHead(engine, 'call3_confirm')) && !/priorAttempt/.test(fnHead(engine, 'completenessCheck')));

// The substitution paths pass null and stay byte-identical. If one of them ever starts passing a
// real prior, the two-block form appears on a path that was never measured with it.
const nullCalls = (engine.match(/call3_teach\(question, context, contextAttempt, null,/g) ?? []).length;
ok('the case fast-teach path still passes null (substitution shape, unchanged)', nullCalls === 1);

console.log(`\n${failures === 0 ? 'ALL STUDENT-ANSWER-BLOCK FIXTURES PASS' : `${failures} FIXTURE(S) FAILED`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
