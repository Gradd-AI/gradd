// scripts/test-irr.ts
// Fixtures for the IRR/MIRR calculator (lib/acca/irr.ts) against the numeric verifier.
// Pure — no env/DB/model. Exit 1 on any mismatch.
//   self-consistency gate (both schemas) · all-correct · ncf_1 wrong→carry through
//   npv_lo/npv_hi/irr (the classic wrong-trial-NPV OFR case) · no-workings poisons ·
//   IRR brackets between the trial rates · MIRR < IRR (reinvest below IRR) · MIRR carry.
import { computeIrr, buildIrrSchema, type IrrInputs } from '../lib/acca/irr';
import { verifyNumericAnswer, type AnswerSchema, type StudentSubmission, type Verdict } from '../lib/acca/numeric-verifier';
import { validateSchemaSelfConsistency } from '../lib/acca/validate-schema';

let failures = 0;

const INPUTS: IrrInputs = {
  initial_outlay: 1000, real_operating_cf: [400, 450, 500, 480], inflation_rate: 0.03,
  tax_rate: 0.25, tax_lag: 0, capital_for_wda: 1000, wda_rate: 0.25, scrap_value: 100,
  cost_of_capital: 0.10, r_lo: 0.20, r_hi: 0.30,  // straddle the true IRR (~24.7%) so the two NPVs bracket zero
};

function build(schema: AnswerSchema, overrides: Record<string, { value: number; workings: boolean }>): StudentSubmission {
  const own = new Map<string, number>();
  const comps: StudentSubmission['components'] = [];
  for (const c of schema.components) {
    const ov = overrides[c.component_id];
    let value: number;
    if (ov) value = ov.value;
    else if (!c.depends_on?.length || !c.recompute) value = c.expected_value;
    else { const deps: Record<string, number> = {}; for (const d of c.depends_on) deps[d] = own.get(d)!; value = c.recompute(deps); }
    own.set(c.component_id, value);
    const showWorkings = ov ? ov.workings : true;
    comps.push({ component_id: c.component_id, value, workings: showWorkings ? c.working_steps?.[0] ?? 'shown' : '' });
  }
  return { components: comps };
}

function run(schema: AnswerSchema, name: string, submission: StudentSubmission, expected: Record<string, Verdict>) {
  const res = verifyNumericAnswer(schema, submission);
  let ok = true; const rows: string[] = [];
  for (const pc of res.per_component) {
    const want = expected[pc.component_id]; const pass = pc.verdict === want;
    if (!pass) ok = false;
    rows.push(`   ${pass ? 'PASS' : 'FAIL'} ${pc.component_id.padEnd(10)} ${pc.verdict.padEnd(11)}${pass ? '' : `(want ${want})`}`);
  }
  console.log(`${ok ? 'PASS' : 'FAIL'} :: ${name}  awarded ${res.awarded}/${res.available}`);
  if (!ok) { failures++; console.log(rows.join('\n')); }
}

function selfConsistency(schema: AnswerSchema, label: string) {
  const v = validateSchemaSelfConsistency(schema);
  console.log(`${v.ok ? 'PASS' : 'FAIL'} :: self-consistency (${label})`);
  if (!v.ok) { failures++; for (const i of v.issues) console.log(`   ✗ [${i.gate}/${i.code}] ${i.component_id}: ${i.message}`); }
}

// ── STANDARD IRR ──
const cS = computeIrr(INPUTS, 'standard');
const { schema: schemaS } = buildIrrSchema(INPUTS, cS, 'AUD', 'standard');
selfConsistency(schemaS, 'standard');

const loPct = INPUTS.r_lo * 100, hiPct = INPUTS.r_hi * 100;
const bracketOk = cS.npv_lo > 0 && cS.npv_hi < 0 && cS.irr > loPct && cS.irr < hiPct;
console.log(`${bracketOk ? 'PASS' : 'FAIL'} :: IRR brackets — npv_lo=${cS.npv_lo.toFixed(1)}>0, npv_hi=${cS.npv_hi.toFixed(1)}<0, irr=${cS.irr.toFixed(2)}% in (${loPct},${hiPct})`);
if (!bracketOk) failures++;

const allCorrectS: Record<string, Verdict> = {}; for (const c of schemaS.components) allCorrectS[c.component_id] = 'correct';
run(schemaS, '(1) all correct', build(schemaS, {}), allCorrectS);

const ncf1 = schemaS.components.find((c) => c.component_id === 'ncf_1')!;
run(schemaS, '(2) ncf_1 wrong+workings → npv_lo/npv_hi/irr carry',
  build(schemaS, { ncf_1: { value: ncf1.expected_value * 0.8, workings: true } }),
  { ...allCorrectS, ncf_1: 'incorrect', npv_lo: 'carried', npv_hi: 'carried', irr: 'carried' });

run(schemaS, '(3) ncf_1 wrong, NO workings → no_workings',
  build(schemaS, { ncf_1: { value: ncf1.expected_value * 0.8, workings: false } }),
  { ...allCorrectS, ncf_1: 'no_workings', npv_lo: 'carried', npv_hi: 'carried', irr: 'carried' });

// ── MIRR ──
const cM = computeIrr(INPUTS, 'mirr');
const { schema: schemaM } = buildIrrSchema(INPUTS, cM, 'AUD', 'mirr');
selfConsistency(schemaM, 'mirr');

const mirrOk = Number.isFinite(cM.mirr) && cM.tv_inflows > 0 && cM.mirr < cM.irr;
console.log(`${mirrOk ? 'PASS' : 'FAIL'} :: MIRR ${cM.mirr.toFixed(2)}% < IRR ${cM.irr.toFixed(2)}% (reinvest at ${(cM.reinvest * 100).toFixed(0)}% below IRR), tv=${cM.tv_inflows.toFixed(1)}`);
if (!mirrOk) failures++;

const allCorrectM: Record<string, Verdict> = {}; for (const c of schemaM.components) allCorrectM[c.component_id] = 'correct';
run(schemaM, '(4) MIRR all correct', build(schemaM, {}), allCorrectM);
run(schemaM, '(5) ncf_1 wrong → tv_inflows/mirr carry',
  build(schemaM, { ncf_1: { value: ncf1.expected_value * 0.8, workings: true } }),
  { ...allCorrectM, ncf_1: 'incorrect', npv_lo: 'carried', npv_hi: 'carried', irr: 'carried', tv_inflows: 'carried', mirr: 'carried' });

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL IRR FIXTURES PASS' : `${failures} IRR FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
