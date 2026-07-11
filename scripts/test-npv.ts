// scripts/test-npv.ts
// Fixtures for the NPV calculator (lib/acca/npv.ts) against the numeric verifier.
// Pure — no env, no DB, no model. Exit 1 on any mismatch.
//   (1) all-correct submission → every component correct.
//   (2) ncf_1 wrong (workings shown) → ncf_1 incorrect; pv_1 + npv carried; others correct.
//   (3) same but NO workings on ncf_1 → no_workings (zero) and it poisons npv to no-credit.
//   + schema self-consistency gate must pass.

import { computeNpv, buildNpvSchema, type NpvInputs } from '../lib/acca/npv';
import { verifyNumericAnswer, type AnswerSchema, type StudentSubmission, type Verdict } from '../lib/acca/numeric-verifier';
import { validateSchemaSelfConsistency } from '../lib/acca/validate-schema';

let failures = 0;

const INPUTS: NpvInputs = {
  initial_outlay: 1000,
  real_operating_cf: [500, 520, 540, 560],
  inflation_rate: 0.03,
  tax_rate: 0.25,
  tax_lag: 0,
  capital_for_wda: 1000,
  wda_rate: 0.25,
  scrap_value: 100,
  discount_rate: 0.10,
};

const computed = computeNpv(INPUTS, 'standard');
const { schema } = buildNpvSchema(INPUTS, computed, 'AUD');
const byId = new Map(schema.components.map((c) => [c.component_id, c]));

// Gate: schema self-consistency (recompute(authored) ≈ expected, tolerance + OFR wiring).
const v = validateSchemaSelfConsistency(schema);
console.log(`SELF-CONSISTENCY GATE: ${v.ok ? 'PASS' : 'FAIL'}`);
if (!v.ok) { failures++; for (const i of v.issues) console.log(`   ✗ [${i.gate}/${i.code}] ${i.component_id}: ${i.message}`); }

// Build a submission by walking the schema; `overrides` sets a raw student value + whether
// to show workings. Dependents not overridden are computed from the student's OWN upstream
// via the schema recompute (so carried values are exact).
function build(overrides: Record<string, { value: number; workings: boolean }>): StudentSubmission {
  const own = new Map<string, number>();
  const comps: StudentSubmission['components'] = [];
  for (const c of schema.components) {
    const ov = overrides[c.component_id];
    let value: number;
    if (ov) value = ov.value;
    else if (!c.depends_on?.length || !c.recompute) value = c.expected_value;         // root → correct
    else {
      const deps: Record<string, number> = {};
      for (const d of c.depends_on) deps[d] = own.get(d)!;
      value = c.recompute(deps);                                                        // carry from own upstream
    }
    own.set(c.component_id, value);
    const showWorkings = ov ? ov.workings : true;
    comps.push({ component_id: c.component_id, value, workings: showWorkings ? c.working_steps?.[0] ?? 'shown' : '' });
  }
  return { components: comps };
}

function run(name: string, submission: StudentSubmission, expected: Record<string, Verdict>) {
  const res = verifyNumericAnswer(schema, submission);
  let ok = true;
  const rows: string[] = [];
  for (const pc of res.per_component) {
    const want = expected[pc.component_id];
    const pass = pc.verdict === want;
    if (!pass) ok = false;
    rows.push(`   ${pass ? 'PASS' : 'FAIL'} ${pc.component_id.padEnd(8)} ${pc.verdict.padEnd(11)}${pass ? '' : `(want ${want})`}`);
  }
  console.log(`\n${ok ? 'PASS' : 'FAIL'} :: ${name}  awarded ${res.awarded}/${res.available}`);
  console.log(rows.join('\n'));
  if (!ok) failures++;
}

const allCorrect: Record<string, Verdict> = {};
for (const c of schema.components) allCorrect[c.component_id] = 'correct';
run('(1) all correct', build({}), allCorrect);

const ncf1 = byId.get('ncf_1')!;
const carryExpected: Record<string, Verdict> = { ...allCorrect, ncf_1: 'incorrect', pv_1: 'carried', npv: 'carried' };
run('(2) ncf_1 wrong, workings shown → pv_1 + npv carry', build({ ncf_1: { value: ncf1.expected_value * 0.8, workings: true } }), carryExpected);

const noWorkExpected: Record<string, Verdict> = { ...allCorrect, ncf_1: 'no_workings' };
// pv_1 recomputes from own (wrong) ncf_1 with workings → still carried; npv carried.
noWorkExpected.pv_1 = 'carried';
noWorkExpected.npv = 'carried';
run('(3) ncf_1 wrong, NO workings → no_workings at source', build({ ncf_1: { value: ncf1.expected_value * 0.8, workings: false } }), noWorkExpected);

// ── P1: capital-rationing allocation is CODE-COMPUTED under indivisibility ──
// This project is indivisible; funding it in full (18.0) + divisibles by PI beats skipping
// it. Expect: NovaDerm 7.5 full, Helix 6.5 partial, this project 18.0 full, ColdChain 0.
{
  const rInp: NpvInputs = {
    initial_outlay: 18, real_operating_cf: [5.2, 6.8, 7.4, 6.1], inflation_rate: 0.03,
    tax_rate: 0.265, tax_lag: 1, capital_for_wda: 18, wda_rate: 0.25, scrap_value: 2.5,
    discount_rate: 0.11, capital_limit: 32,
    competitor_projects: [
      { name: 'Project Helix', pi: 1.18, outlay: 9 },
      { name: 'Project ColdChain', pi: 1.09, outlay: 14 },
      { name: 'Project NovaDerm', pi: 1.22, outlay: 7.5 },
    ],
  };
  const rc = computeNpv(rInp, 'rationing');
  const take = (n: string) => rc.ranking!.find((r) => r.name === n)!.taken;
  const near = (a: number, b: number) => Math.abs(a - b) < 1e-6;
  const ok =
    rc.ration_takes_project === true &&
    near(take('this project'), 18) && near(take('Project NovaDerm'), 7.5) &&
    near(take('Project Helix'), 6.5) && near(take('Project ColdChain'), 0) &&
    !rc.ranking!.find((r) => r.name === 'this project')!.divisible;
  console.log(`\n${ok ? 'PASS' : 'FAIL'} :: (P1) rationing indivisible allocation — this 18.0 / NovaDerm 7.5 / Helix 6.5 / ColdChain 0`);
  if (!ok) { failures++; console.log('   got:', rc.ranking!.map((r) => `${r.name}=${r.taken.toFixed(1)}`).join(', '), 'takesProject=', rc.ration_takes_project); }
}

// ── P2: sensitivity measured against the NAMED post-tax operating-CF PV base ──
// NOT PV of all inflows (which includes scrap + WDA shield). Expect ~13.24%, base ~37.88.
{
  const sInp: NpvInputs = {
    initial_outlay: 42, real_operating_cf: [13.5, 15.8, 16.4, 14.2], inflation_rate: 0.03,
    tax_rate: 0.265, tax_lag: 1, capital_for_wda: 38, wda_rate: 0.25, scrap_value: 4.5,
    discount_rate: 0.11, sensitivity_label: 'the projected annual operating cash flows',
  };
  const sc = computeNpv(sInp, 'sensitivity');
  const ok = Math.abs(sc.sensitivity_pct! - 13.24) < 0.05 && Math.abs(sc.sensitivity_base! - 37.88) < 0.05;
  console.log(`\n${ok ? 'PASS' : 'FAIL'} :: (P2) sensitivity vs post-tax op-CF base — ~13.24% on base ~37.88`);
  if (!ok) { failures++; console.log('   got:', sc.sensitivity_pct!.toFixed(2) + '%', 'base', sc.sensitivity_base!.toFixed(3)); }
}

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL NPV FIXTURES PASS' : `${failures} NPV FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
