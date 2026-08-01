// scripts/test-case-authoring-spec.ts   —   npm run test:case-authoring-spec
//
// P-G3 fixtures for the standalone AFM case-authoring path (lib/acca/case-authoring-spec.ts).
// PURE — no DB, no model, no network.
//
// P-G3: a check whose FAILURE path has never run is an untested branch. So every gate this path
// adds is exercised in BOTH directions — a spec that passes, and four DELIBERATE break modes
// that must fail, each isolated so it cannot pass for the wrong reason.
//
// THE FIXTURE SPEC IS TEST DATA, NOT CASE CONTENT. "Fixture Industries" is synthetic, is never
// inserted, and must not be mistaken for an authored case. It exists to drive the gates.

import {
  validateCaseSpec, toGateCase, standaloneCaseGates, corpusBandERepresented,
  checkExhibitsStateInputs, composeFullReveal, composeHint, buildNumericRequirement,
  flattenNumbers, renderingsOf, familyGateCoverage, SUPPORTED_NUMERIC_LOS,
  type AfmCaseSpec, type NumericRequirementSpec,
} from '../lib/acca/case-authoring-spec';
import { lintMisconceptionLead } from '../lib/acca/validate-afm-prose';

let checks = 0;
let failures = 0;
const line = (t = '') => console.log(t);
const rule = (c = '=') => console.log(c.repeat(100));
function ok(name: string, cond: boolean, detail = '') {
  checks++;
  if (!cond) failures++;
  line(`  ${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}
function eq(name: string, actual: unknown, expected: unknown) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected),
    `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

// ── The prose block every requirement needs ──────────────────────────────────
const prose = (topic: string) => ({
  question: `Calculate the ${topic} and advise the board. (12 marks)`,
  advice: `On these figures the board should proceed, subject to the risks noted.`,
  misconception: `treating the headline figure as the decision`,
  symptom: `candidates report the ${topic} and stop.`,
  fix: `The fix is to carry the figure into the decision the board actually faces and commit to a recommendation.`,
  hint_lead: `Don't stop at the arithmetic.`,
  hint_method: `Work the method through in order, then say what the number means for the decision.`,
});

// ── A VALID SPEC ─────────────────────────────────────────────────────────────
// Section B, 25 marks (20 technical + 5 PS), one calc + one narrative, two PS skills from the
// Section-B set, and exhibits that state every calculator input.
const ENPV_INPUTS = {
  currency: 'GBP', outlay: 500, discount_rate: 10.0, hurdle: 0,
  scenarios: [
    { label: 'Strong demand', probability: 0.30, cash_flows: [210, 230, 250, 270] },
    { label: 'Base case', probability: 0.50, cash_flows: [150, 160, 170, 180] },
    { label: 'Weak demand', probability: 0.20, cash_flows: [85, 90, 95, 100] },
  ],
};

const EXHIBIT_BODY =
  'The project requires an upfront outlay of GBP 500 million and is appraised at a discount rate of 10.0%. ' +
  'Three scenarios were built. Strong demand (probability 0.30): 210, 230, 250, 270. ' +
  'Base case (probability 0.50): 150, 160, 170, 180. ' +
  'Weak demand (probability 0.20): 85, 90, 95, 100. ' +
  'The board applies a hurdle of 0.';

const NUMERIC_REQ: NumericRequirementSpec = {
  requirement_order: 1, marks: 12, ps_tags: ['analysis_and_evaluation'], intellectual_level: 3,
  calc: { lo: 'B1a', inputs: ENPV_INPUTS },
  prose: prose('expected net present value'),
};

const VALID: AfmCaseSpec = {
  frame: {
    id: 'ff000000-0000-4000-8000-0000000000f1', section: 'B', anchor_area: 'B1',
    title: 'Fixture Industries', scenario_intro: 'You are an adviser to Fixture Industries.',
    response_format: 'report', total_marks: 25, professional_skills_marks: 5,
  },
  exhibits: [{ title: 'Exhibit 1 — Project data', body: EXHIBIT_BODY }],
  numeric: [NUMERIC_REQ],
  narrative: [{
    requirement_order: 2, lo: 'B1b', marks: 8, ps_tags: ['scepticism'], intellectual_level: 3,
    question: 'Interpret the simulation output. (8 marks)',
    rubric: { mode: 'narrative', requirement_parts: ['a'], scenario_facts: [{ id: 'f1', text: 'x' }], criteria: [{ id: 'c1' }], total_marks: 8, bands: [] },
    golden_good: 'A good answer.', golden_bad: 'A bad answer.',
    misconception: 'reporting the statistics without interpreting them',
    symptom: 'candidates restate the mean and standard deviation and stop.',
    fix: 'The fix is to translate each statistic into a decision.',
    hint_lead: "Reporting the numbers is half the job.", hint_method: 'Say what they mean for the commitment.',
  }],
};

const clone = (s: AfmCaseSpec): AfmCaseSpec => JSON.parse(JSON.stringify(s)) as AfmCaseSpec;

rule();
line('  STANDALONE AFM CASE AUTHORING — spec, gates and break modes (pure)');
rule();

// ── 1. The valid spec passes everything ──────────────────────────────────────
line('\n  1. THE VALID SPEC PASSES');
const v = validateCaseSpec(VALID);
ok('spec validation passes', v.pass, v.violations.join(' | '));
const gc = standaloneCaseGates(toGateCase(VALID));
ok('C1 (vacuous for Section B) passes', gc.results['C1-section-a-span'].pass);
ok('C2 not-wholly-narrative passes (the case has a calc requirement)', gc.results['C2-not-wholly-narrative'].pass);
ok('C4 PS skill set passes (2 skills from the Section-B set)', gc.results['C4-ps-skill-set'].pass);
ok('all standalone case gates pass', gc.pass);
const chk = checkExhibitsStateInputs(EXHIBIT_BODY, flattenNumbers(ENPV_INPUTS), {});
ok(`exhibits state all ${chk.checked} calculator inputs`, chk.ok,
  chk.missing.map((m) => `${m.path}=${m.value}`).join(', '));

// ── 2. BREAK MODE 1 — no calc requirement (C2) ───────────────────────────────
line('\n  2. BREAK MODE — a Section B case with NO calculation requirement (C2)');
const noCalc = clone(VALID);
noCalc.numeric = [];
noCalc.narrative[0].marks = 20;
noCalc.narrative[0].requirement_order = 1;
// ISOLATION: dropping the numeric requirement also drops its PS tag, which would fail C4 as a
// side effect and let this break mode "pass" for the wrong reason. The narrative requirement
// carries both skills here so C2 is the ONLY gate that can block.
noCalc.narrative[0].ps_tags = ['analysis_and_evaluation', 'scepticism'];
const gcNoCalc = standaloneCaseGates(toGateCase(noCalc));
ok('C2 FAILS on a wholly narrative Section B case', gcNoCalc.results['C2-not-wholly-narrative'].pass === false,
  gcNoCalc.results['C2-not-wholly-narrative'].violations.join(' | '));
ok('...and the aggregate blocks', gcNoCalc.pass === false);
// Isolation: the ONLY thing wrong is the missing calc requirement.
ok('...while C1 and C4 still pass, so C2 is what blocked',
  gcNoCalc.results['C1-section-a-span'].pass && gcNoCalc.results['C4-ps-skill-set'].pass);

// ── 3. BREAK MODE 2 — Section B with only ONE PS skill (C4) ──────────────────
line('\n  3. BREAK MODE — a Section B case with only ONE professional skill (C4)');
const onePs = clone(VALID);
onePs.narrative[0].ps_tags = ['analysis_and_evaluation'];   // same skill as the numeric one
const gcOnePs = standaloneCaseGates(toGateCase(onePs));
ok('C4 FAILS with a single Section-B skill', gcOnePs.results['C4-ps-skill-set'].pass === false,
  gcOnePs.results['C4-ps-skill-set'].violations.join(' | '));
ok('...and the aggregate blocks', gcOnePs.pass === false);
ok('...while C2 still passes, so C4 is what blocked', gcOnePs.results['C2-not-wholly-narrative'].pass);
// The Section-A-only skill, in Section B.
const commsInB = clone(VALID);
commsInB.narrative[0].ps_tags = ['communication'];
ok('C4 also FAILS when Section B tags communication (Section-A-only)',
  standaloneCaseGates(toGateCase(commsInB)).results['C4-ps-skill-set'].pass === false);

// ── 4. BREAK MODE 3 — an exhibit omitting a stated calculator input ──────────
line('\n  4. BREAK MODE — exhibits omit a calculator input');
// Remove ONE number (the 0.20 weak-demand probability) and nothing else.
const holed = EXHIBIT_BODY.replace('probability 0.20', 'a low probability');
const chkHoled = checkExhibitsStateInputs(holed, flattenNumbers(ENPV_INPUTS), {});
ok('the check FAILS when an input is not stated', chkHoled.ok === false,
  chkHoled.missing.map((m) => `${m.path}=${m.value}`).join(', '));
ok('...and it names the missing input, not just "something is missing"',
  chkHoled.missing.some((m) => m.value === 0.2), JSON.stringify(chkHoled.missing.map((m) => m.path)));
// A NAMED exemption is the only way past it, and it is recorded rather than silent.
const chkExempt = checkExhibitsStateInputs(holed, flattenNumbers(ENPV_INPUTS), {
  'scenarios[2].probability': 'stated in prose as "a low probability" — deliberate, the figure is in the requirement',
});
ok('a NAMED exemption lets it pass', chkExempt.ok);
ok('...and the exemption is REPORTED, not silent', chkExempt.exempted.length === 1,
  chkExempt.exempted.map((e) => e.path).join(','));
// The exemption must not be a blanket pass for everything else.
const chkWrongExempt = checkExhibitsStateInputs(holed, flattenNumbers(ENPV_INPUTS), { 'outlay': 'wrong key' });
ok('an exemption on the WRONG key does not rescue the real omission', chkWrongExempt.ok === false);

// ── 5. BREAK MODE 4 — a requirement whose family gates cannot run ────────────
line('\n  5. BREAK MODE — a numeric LO outside the family-gate union');
ok('every supported LO reports full cover',
  SUPPORTED_NUMERIC_LOS.every((lo) => familyGateCoverage(lo).supported));
const unsupported = familyGateCoverage('B3f');
ok('an unsupported LO reports NO family cover', unsupported.supported === false);
ok('...and says what is lost, not merely that it is unsupported',
  /BASE barrier only/.test(unsupported.note) && /NO_FAMILY_GATES/.test(unsupported.note), unsupported.note);
// The type system is the real gate here: `{ lo: 'B3f', ... }` is not assignable to
// NumericCalcSpec, so an unsupported family cannot reach the builder at all. Asserted at
// runtime as well, because a cast would bypass the compiler.
let threw = false;
try {
  buildNumericRequirement({
    ...NUMERIC_REQ,
    calc: { lo: 'B3f', inputs: {} } as unknown as NumericRequirementSpec['calc'],
  });
} catch { threw = true; }
ok('the builder REFUSES an LO outside the union rather than emitting an ungated requirement', threw);

// ── 6. Composers produce gate-compliant prose ────────────────────────────────
line('\n  6. COMPOSED FIELDS ARE GATE-COMPLIANT BY CONSTRUCTION');
const fr = composeFullReveal('treating the ENPV as the decision', 'candidates report it and stop.', 'The fix is to read it with the downside probability.');
eq('P7 accepts the composed full_reveal', lintMisconceptionLead(fr).length, 0);
ok('...and the misconception sentence is present verbatim', /misconception/i.test(fr.split('\n')[0]));
// THE COLON IS THE POINT — P7 matches /misconception[^:]*:/ and a wrapper without one fails.
ok('...and the composed lead carries the COLON P7 requires', /misconception[^:]*:/i.test(fr), fr.split('\n')[0]);
// An author-supplied trailing full stop must not defeat the frame.
const frDot = composeFullReveal('treating the ENPV as the decision.', 'candidates stop there.', 'Fix.');
eq('a trailing full stop on the misconception does not break P7', lintMisconceptionLead(frDot).length, 0);
// An author who already writes the frame is not double-wrapped.
const fr2 = composeFullReveal('The dominant misconception here is X: candidates stop at the number.', '', 'The fix is Y.');
ok('an author-supplied misconception frame is not double-wrapped',
  (fr2.match(/misconception/gi) ?? []).length === 1, fr2.split('\n')[0]);
eq('P7 accepts that one too', lintMisconceptionLead(fr2).length, 0);
ok('composeHint joins the two parts into one line', composeHint(' A. ', ' B. ') === 'A. B.');

// ── 7. Spec validation catches its own failure modes ─────────────────────────
line('\n  7. SPEC VALIDATION FAILURE PATHS');
const badMarks = clone(VALID);
badMarks.frame.total_marks = 30;
ok('marks that do not reconcile FAIL', validateCaseSpec(badMarks).pass === false,
  validateCaseSpec(badMarks).violations.join(' | '));
const badOrder = clone(VALID);
badOrder.narrative[0].requirement_order = 3;
ok('a gap in requirement_order FAILS', validateCaseSpec(badOrder).pass === false);
const noExhibits = clone(VALID);
noExhibits.exhibits = [];
ok('a case with no exhibits FAILS', validateCaseSpec(noExhibits).pass === false);
const noPs = clone(VALID);
noPs.numeric[0].ps_tags = [];
ok('a requirement with no PS tags FAILS', validateCaseSpec(noPs).pass === false);

// ── 8. C1 is CONDITIONAL on section ──────────────────────────────────────────
line('\n  8. C1 IS CONDITIONAL ON SECTION');
ok('C1 is vacuous for a standalone Section B case', standaloneCaseGates(toGateCase(VALID)).results['C1-section-a-span'].pass);
const sectionA = clone(VALID);
sectionA.frame.section = 'A';
sectionA.frame.anchor_area = null;
// Both requirements are section B (B1a, B1b) → one letter → C1 must fail.
ok('C1 FAILS for a Section A case spanning ONE syllabus section',
  standaloneCaseGates(toGateCase(sectionA)).results['C1-section-a-span'].pass === false,
  standaloneCaseGates(toGateCase(sectionA)).results['C1-section-a-span'].violations.join(' | '));
const sectionASpanning = clone(sectionA);
sectionASpanning.narrative[0].lo = 'E2a';       // now spans B and E
sectionASpanning.numeric[0].ps_tags = ['communication', 'analysis_and_evaluation'];
sectionASpanning.narrative[0].ps_tags = ['scepticism', 'commercial_acumen'];
ok('C1 PASSES once the Section A case spans two sections',
  standaloneCaseGates(toGateCase(sectionASpanning)).results['C1-section-a-span'].pass);
ok('...and C4 then demands all FOUR skills in Section A',
  standaloneCaseGates(toGateCase(sectionASpanning)).results['C4-ps-skill-set'].pass);

// ── 9. The corpus invariant (C3's replacement) ───────────────────────────────
line('\n  9. CORPUS INVARIANT — B AND E ACROSS THE LIBRARY (C3 replacement)');
eq('an empty library plus a B-only case is still missing E',
  corpusBandERepresented([], ['B1a', 'B1b']), { pass: false, missing: ['E'], afterAdd: ['B'] });
eq('an empty library plus a case spanning B and E passes',
  corpusBandERepresented([], ['B1a', 'E2b']), { pass: true, missing: [], afterAdd: ['B', 'E'] });
eq('a library already covering E plus a B-only case passes',
  corpusBandERepresented(['E3a'], ['B1a']), { pass: true, missing: [], afterAdd: ['B', 'E'] });
eq('a library of only B, plus another B-only case, still fails',
  corpusBandERepresented(['B1a', 'B5b'], ['B3e']), { pass: false, missing: ['E'], afterAdd: ['B'] });
eq('neither letter present → both reported',
  corpusBandERepresented(['A1a'], ['C1a']), { pass: false, missing: ['B', 'E'], afterAdd: ['A', 'C'] });
// This is the property C3 could NOT express: one case, on its own, need not carry both.
ok('a single case is never required to carry both letters itself',
  corpusBandERepresented(['E3a'], ['B1a']).pass && !corpusBandERepresented([], ['B1a']).pass);

// ── 10. Rendering helper — the exhibit check's own edge cases ────────────────
line('\n  10. INPUT RENDERINGS');
ok('5.6 matches a "5.60" exhibit', renderingsOf(5.6).includes('5.60'));
ok('5.60 matches a "5.6" exhibit', renderingsOf(5.6).includes('5.6'));
ok('48000000 offers a "48 million" rendering', renderingsOf(48_000_000).includes('48 million'));
ok('48000000 offers a "48m" rendering', renderingsOf(48_000_000).includes('48m'));
ok('a non-round large number offers no million form', !renderingsOf(48_000_001).some((r) => r.includes('million')));
ok('thousands separators in the exhibit still match',
  checkExhibitsStateInputs('the outlay is 48,000,000', { outlay: 48_000_000 }, {}).ok);
ok('flattenNumbers reaches into arrays',
  'scenarios[0].cash_flows[3]' in flattenNumbers(ENPV_INPUTS), Object.keys(flattenNumbers(ENPV_INPUTS)).length + ' leaves');
ok('flattenNumbers skips non-numeric leaves', !('currency' in flattenNumbers(ENPV_INPUTS)));

// ── 11. The builder builds — nothing is passed through ───────────────────────
line('\n  11. EVERY CODE-OWNED FIELD IS BUILT, NOT SUPPLIED');
const b = buildNumericRequirement(NUMERIC_REQ);
ok('model_answer is produced by the calculator, not the spec', b.model_answer.length > 200);
ok('...and it is not the advice prose verbatim', b.model_answer !== NUMERIC_REQ.prose.advice);
ok('...but it DOES contain the advice prose the spec supplied', b.model_answer.includes(NUMERIC_REQ.prose.advice));
ok('answer_schema carries components', (b.schema.components ?? []).length > 0, `${b.schema.components?.length} components`);
ok('full_reveal is P7-compliant', lintMisconceptionLead(b.full_reveal).length === 0);
ok('the family gate input is the B1a arm', b.family.lo === 'B1a');
ok('computed carries both the inputs and the result (GATE 27 needs them)', b.computed.length === 2);
ok('inputNumbers are extracted for the exhibit check', Object.keys(b.inputNumbers).length > 0);

rule();
line(`  ${failures === 0 ? `ALL ${checks} CHECKS PASS` : `${failures} of ${checks} CHECKS FAILED`}`);
rule();
if (failures) process.exitCode = 1;
