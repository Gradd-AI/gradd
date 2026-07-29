// scripts/test-mock-access.ts
// Fixtures for the mock-content access rule (lib/acca/mocks.ts) and the field-withholding
// constants (lib/acca/mock-access.ts). PURE — no env, no DB, no model, no network.
// Run: npm run test:mock-access
//
// The rule under test: a `mock_only` case is reachable through the id-addressed practice
// routes ONLY while the requester has an OPEN, UNCOMPLETED attempt for the paper THAT CASE
// BELONGS TO. Everything else is a 404 in the route.
//
// Why these fixtures exist: publishing AFM Mock Paper 1 made its three cases fetchable by
// anyone holding a case id (case/list filters mock_only=false, but the id route did not),
// and the same had been true of the three APM mock cases for months. The route-level guard
// is thin on purpose — the DECISION is pure and lives here, where it can be pinned.

import {
  attemptUnlocksCase,
  mockPaperCaseIds,
  MOCK_PAPERS,
  type AttemptRef,
} from '../lib/acca/mocks';
import { MOCK_REQUIREMENT_SELECT, STANDARD_REQUIREMENT_SELECT } from '../lib/acca/mock-access';
import { AFM_MOCK_PAPER_1 } from '../lib/acca/sit-preview';

let failures = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}

const APM = MOCK_PAPERS[0];
const APM_CASE = APM.case_ids[0];              // Halworth, APM mock
const AFM_CASE = AFM_MOCK_PAPER_1.case_ids[0]; // Solenne, AFM mock
const NOT_A_MOCK_CASE = 'a6000000-0000-4000-8000-00000000ffff';

const open = (mock_id: string): AttemptRef => ({ mock_id, completed: false });
const done = (mock_id: string): AttemptRef => ({ mock_id, completed: true });

console.log('\n-- paper resolution across BOTH configs --');
ok('APM mock id resolves to its case list', (mockPaperCaseIds(APM.id) ?? []).length === 3);
ok('AFM sit paper id resolves to its case list', (mockPaperCaseIds(AFM_MOCK_PAPER_1.id) ?? []).length === 3);
ok('an unknown mock_id resolves to null (unlocks nothing)', mockPaperCaseIds('paper-does-not-exist') === null);
ok('an empty mock_id resolves to null', mockPaperCaseIds('') === null);
ok('the two papers share NO case ids',
  APM.case_ids.every((id) => !AFM_MOCK_PAPER_1.case_ids.includes(id)));

console.log('\n-- the access rule --');
// NO ATTEMPT → blocked. This is the leak being closed.
ok('no attempt at all → BLOCKED (APM case)', attemptUnlocksCase([], APM_CASE) === false);
ok('no attempt at all → BLOCKED (AFM case)', attemptUnlocksCase([], AFM_CASE) === false);

// OPEN ATTEMPT, OWN CASE → allowed.
ok('open APM attempt unlocks its OWN case', attemptUnlocksCase([open(APM.id)], APM_CASE) === true);
ok('open AFM attempt unlocks its OWN case', attemptUnlocksCase([open(AFM_MOCK_PAPER_1.id)], AFM_CASE) === true);
ok('open attempt unlocks EVERY case of its own paper',
  APM.case_ids.every((id) => attemptUnlocksCase([open(APM.id)], id)));

// CROSS-PAPER — the tightening: an open attempt on one paper must not unlock the other's.
ok('open APM attempt does NOT unlock an AFM mock case',
  attemptUnlocksCase([open(APM.id)], AFM_CASE) === false);
ok('open AFM attempt does NOT unlock an APM mock case',
  attemptUnlocksCase([open(AFM_MOCK_PAPER_1.id)], APM_CASE) === false);

// COMPLETED ATTEMPT → blocked. Sitting it once is not a permanent key.
ok('completed APM attempt → BLOCKED', attemptUnlocksCase([done(APM.id)], APM_CASE) === false);
ok('completed AFM attempt → BLOCKED', attemptUnlocksCase([done(AFM_MOCK_PAPER_1.id)], AFM_CASE) === false);
ok('completed attempt alongside an open one for the OTHER paper → still BLOCKED',
  attemptUnlocksCase([done(APM.id), open(AFM_MOCK_PAPER_1.id)], APM_CASE) === false);
ok('an open attempt among several completed ones DOES unlock its own case',
  attemptUnlocksCase([done(AFM_MOCK_PAPER_1.id), done(APM.id), open(APM.id)], APM_CASE) === true);

// A case that belongs to no paper is never unlocked, whatever is open.
ok('a case in NO mock paper is never unlocked',
  attemptUnlocksCase([open(APM.id), open(AFM_MOCK_PAPER_1.id)], NOT_A_MOCK_CASE) === false);
ok('an attempt with an unknown mock_id unlocks nothing',
  attemptUnlocksCase([open('paper-does-not-exist')], APM_CASE) === false);

// Malformed / nullable input must DENY, never open the door by omission.
ok('empty case id → BLOCKED', attemptUnlocksCase([open(APM.id)], '') === false);
ok('completed=null is treated as OPEN (only completed===true closes)',
  attemptUnlocksCase([{ mock_id: APM.id, completed: null }], APM_CASE) === true);

console.log('\n-- field withholding for mock content --');
const WITHHELD = ['marks_guide', 'professional_skill_tags', 'intellectual_level', 'command_verb', 'lo_code'];
for (const f of WITHHELD) {
  ok(`mock select does NOT fetch "${f}"`, !MOCK_REQUIREMENT_SELECT.includes(f));
  ok(`standard select still fetches "${f}"`, STANDARD_REQUIREMENT_SELECT.includes(f));
}
for (const f of ['model_answer', 'hint', 'full_reveal', 'answer_schema']) {
  ok(`neither select ever fetches "${f}"`,
    !MOCK_REQUIREMENT_SELECT.includes(f) && !STANDARD_REQUIREMENT_SELECT.includes(f));
}
ok('mock select still carries what a candidate must see (id, order, label, question)',
  ['id', 'requirement_order', 'label', 'question'].every((f) => MOCK_REQUIREMENT_SELECT.includes(f)));

console.log(`\n${failures === 0 ? 'ALL MOCK-ACCESS FIXTURES PASS' : `${failures} FIXTURE(S) FAILED`}\n`);
process.exit(failures === 0 ? 0 : 1);
