// scripts/test-numeric-verifier.ts
// Fixtures for lib/acca/numeric-verifier.ts. Three realistic AFM computations with
// hand-computed expectations, asserting exact per-component verdicts. Exit 1 on any
// mismatch. Pure — no env, no DB, no model.
//   (a) NPV appraisal — year-1 flow wrong, NPV assembly right → npv carried.
//   (b) FX forward hedge — wrong rate picked, conversion right → conversion carried.
//   (c) WACC via CAPM — CAPM wrong, WACC assembly right → wacc carried;
//       + a no-workings variant where both score zero (no_workings).

import {
  verifyNumericAnswer,
  type AnswerSchema,
  type StudentSubmission,
  type Verdict,
} from '../lib/acca/numeric-verifier';

let failures = 0;

function run(
  name: string,
  schema: AnswerSchema,
  submission: StudentSubmission,
  expected: Record<string, Verdict>,
) {
  const res = verifyNumericAnswer(schema, submission);
  const rows: string[] = [];
  let ok = true;
  for (const v of res.per_component) {
    const want = expected[v.component_id];
    const pass = v.verdict === want;
    if (!pass) ok = false;
    rows.push(
      `    ${pass ? 'PASS' : 'FAIL'}  ${v.component_id.padEnd(14)} ${v.verdict.padEnd(12)}` +
        `${pass ? '' : `(expected ${want})`}  student=${v.student_value ?? '—'} eff=${round(v.expected_value)} +${v.awarded_weight}`,
    );
  }
  // internal consistency: for every dependent, recompute(authored deps) ≈ expected_value
  for (const c of schema.components) {
    if (c.depends_on?.length && c.recompute) {
      const authoredDeps: Record<string, number> = {};
      for (const d of c.depends_on) authoredDeps[d] = byId(schema, d).expected_value;
      const got = c.recompute(authoredDeps);
      if (Math.abs(got - c.expected_value) > 0.02) {
        ok = false;
        rows.push(`    FAIL  [consistency] ${c.component_id}: recompute(authored)=${round(got)} ≠ expected ${c.expected_value}`);
      }
    }
  }
  console.log(`\n${ok ? 'PASS' : 'FAIL'} :: ${name}   awarded ${res.awarded}/${res.available}   gap_label: ${res.gap_label ?? '(none)'}`);
  console.log(rows.join('\n'));
  if (!ok) failures++;
}

const byId = (s: AnswerSchema, id: string) => s.components.find((c) => c.component_id === id)!;
const round = (n: number) => Math.round(n * 100) / 100;

// ─────────────────────────────────────────────────────────────────────────────
// (a) NPV appraisal. Initial outlay 1000; discount rate 10%. Net cash flows
// y1=400, y2=500, y3=600; terminal value 800 (received end of y3).
// NPV = −1000 + 400/1.1 + 500/1.21 + 600/1.331 + 800/1.331
//     = −1000 + 363.64 + 413.22 + 450.79 + 601.05 = 828.70
// Student: y1 WRONG (300), y2/y3/tv right, NPV assembled CORRECTLY on own y1:
//   −1000 + 300/1.1 + 500/1.21 + 600/1.331 + 800/1.331 = 737.79  → carried.
// ─────────────────────────────────────────────────────────────────────────────
const npvSchema: AnswerSchema = {
  components: [
    { component_id: 'cf_y1', label: 'Year 1 net cash flow', expected_value: 400, unit: '$000', tolerance: { kind: 'absolute', value: 1 } },
    { component_id: 'cf_y2', label: 'Year 2 net cash flow', expected_value: 500, unit: '$000', tolerance: { kind: 'absolute', value: 1 } },
    { component_id: 'cf_y3', label: 'Year 3 net cash flow', expected_value: 600, unit: '$000', tolerance: { kind: 'absolute', value: 1 } },
    { component_id: 'tv',    label: 'Terminal value',       expected_value: 800, unit: '$000', tolerance: { kind: 'absolute', value: 1 } },
    {
      component_id: 'npv', label: 'Net present value', expected_value: 828.70, unit: '$000',
      tolerance: { kind: 'relative', pct: 0.5 },
      depends_on: ['cf_y1', 'cf_y2', 'cf_y3', 'tv'],
      recompute: (d) => -1000 + d.cf_y1 / 1.1 + d.cf_y2 / 1.21 + d.cf_y3 / 1.331 + d.tv / 1.331,
    },
  ],
};
run('(a) NPV appraisal — y1 wrong, assembly right', npvSchema, {
  components: [
    { component_id: 'cf_y1', value: 300, workings: '300 (misread the y1 contribution)' },
    { component_id: 'cf_y2', value: 500, workings: 'contribution 500' },
    { component_id: 'cf_y3', value: 600, workings: 'contribution 600' },
    { component_id: 'tv',    value: 800, workings: 'perpetuity/exit value 800' },
    { component_id: 'npv',   value: 737.79, workings: '−1000 + 300/1.1 + 500/1.21 + 600/1.331 + 800/1.331' },
  ],
}, { cf_y1: 'incorrect', cf_y2: 'correct', cf_y3: 'correct', tv: 'correct', npv: 'carried' });

// ─────────────────────────────────────────────────────────────────────────────
// (b) FX forward hedge. Receivable USD 500,000; correct forward rate 1.25 USD/GBP
// → home receipt 500000/1.25 = £400,000. Student picks the WRONG rate (1.28), then
// converts CORRECTLY on it: 500000/1.28 = £390,625 → conversion carried.
// ─────────────────────────────────────────────────────────────────────────────
const fxSchema: AnswerSchema = {
  components: [
    { component_id: 'forward_rate', label: 'Forward rate selected (USD/GBP)', expected_value: 1.25, unit: 'USD/GBP', tolerance: { kind: 'absolute', value: 0.005 } },
    {
      component_id: 'receipt_home', label: 'Home-currency receipt', expected_value: 400000, unit: 'GBP',
      tolerance: { kind: 'relative', pct: 0.5 },
      depends_on: ['forward_rate'],
      recompute: (d) => 500000 / d.forward_rate,
    },
  ],
};
run('(b) FX forward hedge — wrong rate, conversion right', fxSchema, {
  components: [
    { component_id: 'forward_rate', value: 1.28, workings: 'used the 3-month forward quote 1.28 (picked the wrong side)' },
    { component_id: 'receipt_home', value: 390625, workings: '500,000 / 1.28 = 390,625' },
  ],
}, { forward_rate: 'incorrect', receipt_home: 'carried' });

// ─────────────────────────────────────────────────────────────────────────────
// (c) WACC via CAPM. CAPM: ke = rf + β(rm−rf) = 4 + 1.2×6 = 11.2%. Capital mix
// E=60%, D=40%; kd=7%, tax=30% → WACC = 0.6×11.2 + 0.4×7×0.7 = 6.72 + 1.96 = 8.68%.
// c1: student CAPM WRONG (ke=13.0), WACC assembled CORRECTLY on own ke (with workings):
//   0.6×13.0 + 1.96 = 9.76% → wacc carried.
// c2 (no-workings variant): same wrong figures, NO workings → both score zero (no_workings).
// ─────────────────────────────────────────────────────────────────────────────
const waccSchema: AnswerSchema = {
  components: [
    { component_id: 'ke', label: 'Cost of equity (CAPM)', expected_value: 11.2, unit: '%', tolerance: { kind: 'absolute', value: 0.05 } },
    {
      component_id: 'wacc', label: 'WACC', expected_value: 8.68, unit: '%',
      tolerance: { kind: 'relative', pct: 0.5 },
      depends_on: ['ke'],
      recompute: (d) => 0.6 * d.ke + 0.4 * 7 * 0.7,
    },
  ],
};
run('(c1) WACC — CAPM wrong, WACC assembly right (workings shown)', waccSchema, {
  components: [
    { component_id: 'ke',   value: 13.0, workings: 'ke = 4 + 1.2 × (10) — used rm not the premium' },
    { component_id: 'wacc', value: 9.76, workings: '0.6×13.0 + 0.4×7×0.7 = 7.8 + 1.96 = 9.76' },
  ],
}, { ke: 'incorrect', wacc: 'carried' });

run('(c2) WACC — same wrong figures, NO workings → zero', waccSchema, {
  components: [
    { component_id: 'ke',   value: 13.0 },
    { component_id: 'wacc', value: 9.76 },
  ],
}, { ke: 'no_workings', wacc: 'no_workings' });

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
if (failures === 0) console.log('ALL FIXTURES PASS');
else console.log(`${failures} FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
