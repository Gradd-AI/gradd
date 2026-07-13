// scripts/test-apv.ts
// Fixtures for the APV calculator (lib/acca/apv.ts) against the numeric verifier.
// Pure — no env, no DB, no model. Exit 1 on any mismatch.
//   For each kind (standard/subsidised/reject/financing_compare):
//     • schema self-consistency gate passes.
//     • all-correct submission → every component correct.
//     • base-case ncf_1 wrong (workings shown) → ncf_1 incorrect; pv_1 + base_npv + the
//       APV terminal(s) carry — an OFR error reaches the verdict.
//     • same but NO workings on ncf_1 → no_workings at source.
//   Plus targeted numeric checks: subsidy benefit + tax shield figures; the REJECT verdict
//   is code-owned (apv < 0, accept false); the financing_compare CHOICE is code-owned.

import { computeApv, buildApvSchema, type ApvInputs, type ApvKind } from '../lib/acca/apv';
import { verifyNumericAnswer, type AnswerSchema, type StudentSubmission, type Verdict } from '../lib/acca/numeric-verifier';
import { validateSchemaSelfConsistency } from '../lib/acca/validate-schema';

let failures = 0;
const near = (a: number, b: number, eps = 0.02) => Math.abs(a - b) < eps;

// Base operating core shared by the single-package kinds.
const CORE = {
  real_operating_cf: [30, 32, 34, 36], inflation_rate: 0.03, tax_rate: 0.25, tax_lag: 0 as const,
  wda_rate: 0.25, keu: 0.12,
};

const INPUTS: Record<ApvKind, ApvInputs> = {
  standard: {
    ...CORE, initial_outlay: 100, capital_for_wda: 100, scrap_value: 10,
    debt_amount: 40, kd: 0.06, debt_term: 4, issue_cost_rate: 0.03,
  },
  subsidised: {
    ...CORE, initial_outlay: 100, capital_for_wda: 100, scrap_value: 10,
    debt_amount: 50, kd: 0.08, subsidised_rate: 0.03, debt_term: 4,
  },
  reject: {
    ...CORE, initial_outlay: 200, real_operating_cf: [30, 30, 30, 30], capital_for_wda: 200, scrap_value: 10,
    debt_amount: 60, kd: 0.06, debt_term: 4,
  },
  financing_compare: {
    ...CORE, initial_outlay: 120, capital_for_wda: 120, scrap_value: 12,
    debt_amount: 60, kd: 0.07, debt_term: 4, issue_cost_rate: 0.02,
    equity_amount: 60, equity_issue_cost_rate: 0.05,
    existing_debt: 80, existing_equity: 220,
  },
};

// Build a submission by walking the schema; overrides set a raw value + whether to show
// workings. Non-overridden dependents recompute from the student's OWN upstream (exact
// carried values). Mirrors scripts/test-npv.ts.
function makeBuild(schema: AnswerSchema) {
  return function build(overrides: Record<string, { value: number; workings: boolean }>): StudentSubmission {
    const own = new Map<string, number>();
    const comps: StudentSubmission['components'] = [];
    for (const c of schema.components) {
      const ov = overrides[c.component_id];
      let value: number;
      if (ov) value = ov.value;
      else if (!c.depends_on?.length || !c.recompute) value = c.expected_value;
      else {
        const deps: Record<string, number> = {};
        for (const d of c.depends_on) deps[d] = own.get(d)!;
        value = c.recompute(deps);
      }
      own.set(c.component_id, value);
      const showWorkings = ov ? ov.workings : true;
      comps.push({ component_id: c.component_id, value, workings: showWorkings ? c.working_steps?.[0] ?? 'shown' : '' });
    }
    return { components: comps };
  };
}

function run(name: string, schema: AnswerSchema, submission: StudentSubmission, expected: Record<string, Verdict>) {
  const res = verifyNumericAnswer(schema, submission);
  let ok = true;
  const rows: string[] = [];
  for (const pc of res.per_component) {
    const want = expected[pc.component_id];
    const pass = pc.verdict === want;
    if (!pass) ok = false;
    rows.push(`   ${pass ? 'PASS' : 'FAIL'} ${pc.component_id.padEnd(18)} ${pc.verdict.padEnd(11)}${pass ? '' : `(want ${want})`}`);
  }
  console.log(`\n${ok ? 'PASS' : 'FAIL'} :: ${name}  awarded ${res.awarded}/${res.available}`);
  console.log(rows.join('\n'));
  if (!ok) failures++;
}

// The APV terminal component id(s) per kind — the point the verdict lives on.
const TERMINALS: Record<ApvKind, string[]> = {
  standard: ['apv'], subsidised: ['apv'], reject: ['apv'], financing_compare: ['apv_debt', 'apv_equity'],
};

for (const kind of Object.keys(INPUTS) as ApvKind[]) {
  console.log(`\n${'═'.repeat(64)}\nKIND: ${kind}`);
  const c = computeApv(INPUTS[kind], kind);
  const { schema } = buildApvSchema(INPUTS[kind], c, 'MYR', kind);
  const build = makeBuild(schema);
  const byId = new Map(schema.components.map((x) => [x.component_id, x]));

  // Gate: self-consistency.
  const v = validateSchemaSelfConsistency(schema);
  console.log(`SELF-CONSISTENCY GATE: ${v.ok ? 'PASS' : 'FAIL'}  (APV=${c.apv.toFixed(2)}, base=${c.base_npv.toFixed(2)}, accept=${c.accept})`);
  if (!v.ok) { failures++; for (const i of v.issues) console.log(`   ✗ [${i.gate}/${i.code}] ${i.component_id}: ${i.message}`); }

  // (1) all correct.
  const allCorrect: Record<string, Verdict> = {};
  for (const x of schema.components) allCorrect[x.component_id] = 'correct';
  run(`(1) ${kind} all correct`, schema, build({}), allCorrect);

  // (2) ncf_1 wrong, workings → ncf_1 incorrect; pv_1, base_npv, terminal(s) carry.
  const ncf1 = byId.get('ncf_1')!;
  const carry: Record<string, Verdict> = { ...allCorrect, ncf_1: 'incorrect', pv_1: 'carried', base_npv: 'carried' };
  for (const t of TERMINALS[kind]) carry[t] = 'carried';
  run(`(2) ${kind} ncf_1 wrong (workings) → base_npv + APV carry`, schema, build({ ncf_1: { value: ncf1.expected_value * 0.8, workings: true } }), carry);

  // (3) ncf_1 wrong, NO workings → no_workings at source; downstream still carry from own.
  const noWork: Record<string, Verdict> = { ...carry, ncf_1: 'no_workings' };
  run(`(3) ${kind} ncf_1 wrong (NO workings) → no_workings at source`, schema, build({ ncf_1: { value: ncf1.expected_value * 0.8, workings: false } }), noWork);
}

// ── Targeted numeric checks ──
console.log(`\n${'═'.repeat(64)}\nNUMERIC CHECKS`);

// Subsidised, tax_lag 0: with no lag, the subsidy collapses to the in-year after-tax saving.
// shield = Σ 50×0.03×0.25 × df(0.08,y)  y=1..4 = 0.375 × 3.31213 = 1.2420
// subsidy = Σ 50×(0.08−0.03)×0.75 × df(0.08,y) = 1.875 × 3.31213 = 6.2102
{
  const c = computeApv(INPUTS.subsidised, 'subsidised');
  const ok = near(c.tax_shield!, 1.2420) && near(c.subsidy_benefit!, 6.2102)
    && c.shield_rows!.every((r) => r.receipt_period === r.interest_year)           // lag 0 → in-year
    && c.subsidy_rows!.every((r) => r.tax_period === r.year);
  console.log(`${ok ? 'PASS' : 'FAIL'} :: subsidised lag0 tax_shield≈1.2420 (got ${c.tax_shield!.toFixed(4)}), subsidy_benefit≈6.2102 (got ${c.subsidy_benefit!.toFixed(4)}); receipt periods in-year`);
  if (!ok) failures++;
}

// FLAG-2 pattern: ONE tax-timing per drill. With tax_lag 1, the shield relief AND the
// subsidy's tax leg both land one year later than the interest — identical lag. Deferring
// the tax raises both PVs vs lag 0.
//   shield  = Σ 0.375 × df(0.08, y+1)                       = 0.375 × 3.066784 = 1.1500
//   subsidy = Σ [ 2.5 × df(0.08,y) − 0.625 × df(0.08,y+1) ] = 8.280318 − 1.916740 = 6.3636
{
  const lag1: ApvInputs = { ...INPUTS.subsidised, tax_lag: 1 };
  const c = computeApv(lag1, 'subsidised');
  const shieldLagged = c.shield_rows!.every((r) => r.receipt_period === r.interest_year + 1);
  const subsidyLagged = c.subsidy_rows!.every((r) => r.tax_period === r.year + 1);
  const perRowOk = c.subsidy_rows!.every((r) => near(r.pv, r.saving_pv - r.tax_pv, 1e-6));
  const ok = near(c.tax_shield!, 1.1500) && near(c.subsidy_benefit!, 6.3636)
    && shieldLagged && subsidyLagged && perRowOk
    && c.subsidy_benefit! > 6.2102 && c.tax_shield! < 1.2420; // deferring tax moves both the right way
  console.log(`${ok ? 'PASS' : 'FAIL'} :: subsidised lag1 — shield≈1.1500 (got ${c.tax_shield!.toFixed(4)}), subsidy≈6.3636 (got ${c.subsidy_benefit!.toFixed(4)}); shield+subsidy tax both lag to year+1 [${shieldLagged && subsidyLagged}]`);
  if (!ok) failures++;
}

// Standard: debt is GROSS-stated → issue costs = debt × f = 40 × 0.03 = 1.2 (stored negative).
{
  const c = computeApv(INPUTS.standard, 'standard');
  const ok = near(c.issue_costs!, -1.2) && near(c.apv, c.base_npv + c.tax_shield! + c.issue_costs!);
  console.log(`${ok ? 'PASS' : 'FAIL'} :: standard issue_costs≈-1.2 (gross×f) (got ${c.issue_costs!.toFixed(4)}), APV = base + shield + issue (${c.apv.toFixed(3)})`);
  if (!ok) failures++;
}

// FIX-A: the two issue-cost conventions never collide. Debt is GROSS-stated (interest +
// shield run on it) → gross × f, NOT grossed up. Rights proceeds are NET-stated → net gross-up.
{
  const g = computeApv(INPUTS.standard, 'standard');            // debt 40 @ 3%  → gross×f = 1.2
  const cmp = computeApv(INPUTS.financing_compare, 'financing_compare'); // debt 60 @ 2%, equity 60 @ 5%
  const grossDebtOk = near(g.issue_costs!, -(40 * 0.03));                // 1.2 (not 40×.03/.97)
  const compareDebtOk = near(cmp.debt_issue_costs!, -(60 * 0.02));       // 1.2 gross
  const equityNetOk = near(cmp.equity_issue_costs!, -(60 * 0.05 / 0.95)); // 3.1579 net gross-up
  const ok = grossDebtOk && compareDebtOk && equityNetOk;
  console.log(`${ok ? 'PASS' : 'FAIL'} :: FIX-A convention — debt gross×f (${(-g.issue_costs!).toFixed(3)}, ${(-cmp.debt_issue_costs!).toFixed(3)}), equity net gross-up (${(-cmp.equity_issue_costs!).toFixed(4)})`);
  if (!ok) failures++;
}

// Reject: code owns the direction — apv < 0 and accept === false, even with side-effects.
{
  const c = computeApv(INPUTS.reject, 'reject');
  const ok = c.apv < 0 && c.accept === false && c.base_npv < 0;
  console.log(`${ok ? 'PASS' : 'FAIL'} :: reject verdict code-owned — base ${c.base_npv.toFixed(2)}, shield +${c.tax_shield!.toFixed(2)}, APV ${c.apv.toFixed(2)} < 0, accept=${c.accept}`);
  if (!ok) failures++;
}

// financing_compare: choice is argmax of the two APVs; headline apv is the chosen one.
{
  const c = computeApv(INPUTS.financing_compare, 'financing_compare');
  const expectChoice = c.apv_debt! >= c.apv_equity! ? 'debt' : 'equity';
  const ok = c.financing_choice === expectChoice
    && near(c.apv, Math.max(c.apv_debt!, c.apv_equity!))
    && c.gearing_debt! > c.gearing_equity!; // debt raises gearing, equity lowers it
  console.log(`${ok ? 'PASS' : 'FAIL'} :: compare choice=${c.financing_choice} (debt APV ${c.apv_debt!.toFixed(2)} vs equity ${c.apv_equity!.toFixed(2)}); gearing debt ${(c.gearing_debt! * 100).toFixed(1)}% > equity ${(c.gearing_equity! * 100).toFixed(1)}%`);
  if (!ok) failures++;
}

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL APV FIXTURES PASS' : `${failures} APV FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
