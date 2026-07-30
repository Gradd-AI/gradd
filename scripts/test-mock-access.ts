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

import { mockPaperCaseIds, isMockCase, MOCK_PAPERS, getMockPaper } from '../lib/acca/mocks';
import { mockContentAllowed, caseIsReserved, STANDARD_REQUIREMENT_SELECT } from '../lib/acca/mock-access';

let failures = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}

const APM = getMockPaper('paper-1')!;
const AFM = getMockPaper('afm-paper-1')!;
const APM_CASE = APM.case_ids[0];              // Halworth, APM mock
const AFM_CASE = AFM.case_ids[0];              // Solenne, AFM mock
const NOT_A_MOCK_CASE = 'a6000000-0000-4000-8000-00000000ffff';

// ── The merged registry ──────────────────────────────────────────────────────
console.log('\n-- one registry, both papers --');
ok('both papers are in MOCK_PAPERS', MOCK_PAPERS.length >= 2);
ok('the APM paper resolves', APM.paper === 'APM' && APM.case_ids.length === 3);
ok('the AFM paper resolves', AFM.paper === 'AFM' && AFM.case_ids.length === 3);
ok('paper ids are unique', new Set(MOCK_PAPERS.map((p) => p.id)).size === MOCK_PAPERS.length);
ok('no case id appears in two papers',
  new Set(MOCK_PAPERS.flatMap((p) => p.case_ids)).size === MOCK_PAPERS.flatMap((p) => p.case_ids).length);
ok('mockPaperCaseIds resolves the APM paper', (mockPaperCaseIds('paper-1') ?? []).includes(APM_CASE));
ok('mockPaperCaseIds resolves the AFM paper', (mockPaperCaseIds('afm-paper-1') ?? []).includes(AFM_CASE));
ok('an unknown mock_id resolves to NULL, never to a case list', mockPaperCaseIds('nope') === null);

// ── isMockCase ───────────────────────────────────────────────────────────────
console.log('\n-- reserved-content membership --');
ok('an APM mock case is reserved', isMockCase(APM_CASE) === true);
ok('an AFM mock case is reserved', isMockCase(AFM_CASE) === true);
ok('a library case is NOT reserved', isMockCase(NOT_A_MOCK_CASE) === false);
ok('the empty string is not reserved', isMockCase('') === false);

// ── THE RULE (unconditional on practice, open on sit) ────────────────────────
// This is the change: there is no attempt, no paper match and no entitlement that makes
// reserved content reachable in practice mode. The only key is the MODE.
console.log('\n-- mock content: practice REFUSED, sit ALLOWED --');
ok('reserved content is REFUSED in practice mode', mockContentAllowed(true, 'practice') === false);
ok('reserved content is ALLOWED in sit mode',      mockContentAllowed(true, 'sit') === true);
ok('library content is allowed in practice',        mockContentAllowed(false, 'practice') === true);
ok('library content is allowed in a sit',           mockContentAllowed(false, 'sit') === true);

console.log('\n-- caseIsReserved: either signal is enough --');
ok('the mock_only column alone marks it reserved', caseIsReserved(NOT_A_MOCK_CASE, true) === true);
ok('registry membership alone marks it reserved',  caseIsReserved(APM_CASE, false) === true);
ok('registry membership with a null column',       caseIsReserved(AFM_CASE, null) === true);
ok('neither signal → not reserved',                caseIsReserved(NOT_A_MOCK_CASE, false) === false);
ok('a library case with an undefined column',      caseIsReserved(NOT_A_MOCK_CASE, undefined) === false);

// The two signals disagreeing must land on the REFUSING side, not the serving side.
console.log('\n-- disagreement fails closed --');
ok('in-registry but column=false is still refused in practice',
  mockContentAllowed(caseIsReserved(APM_CASE, false), 'practice') === false);
ok('column=true but not in registry is still refused in practice',
  mockContentAllowed(caseIsReserved(NOT_A_MOCK_CASE, true), 'practice') === false);

// ── Select strings ───────────────────────────────────────────────────────────
// MOCK_REQUIREMENT_SELECT is RETIRED: app/api/acca/case serves no mock content in any
// mode, so there is no reduced payload left to pin. What must stay pinned is that the
// standard select still carries marks_guide — the APM marks chip renders from it.
console.log('\n-- the standard select --');
ok('standard select carries marks_guide', STANDARD_REQUIREMENT_SELECT.includes('marks_guide'));
ok('standard select carries lo_code',     STANDARD_REQUIREMENT_SELECT.includes('lo_code'));
ok('standard select never carries model_answer', !STANDARD_REQUIREMENT_SELECT.includes('model_answer'));
ok('standard select never carries answer_schema', !STANDARD_REQUIREMENT_SELECT.includes('answer_schema'));

console.log(`\n${failures === 0 ? 'ALL MOCK-ACCESS FIXTURES PASS' : `${failures} FIXTURE(S) FAILED`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
