// lib/acca/apv.ts
// AFM Adjusted Present Value calculator (B3j quantitative / B3k mixed), calculator #4.
// Pure, deterministic, no model/DB. Same doctrine as npv.ts / irr.ts: code owns EVERY
// figure AND every figure-vs-figure verdict (accept/reject, which financing package wins);
// the model authors PROSE only and never states or re-checks a number.
//
// APV = base-case NPV (the project as if ALL-EQUITY funded) + the PV of the financing
// side-effects it triggers. The base case is discounted at the UNGEARED cost of equity
// (Keu), which the scenario STATES — deriving Keu by ungearing an equity beta is the
// cost-of-capital/CAPM calculator's job (next on the roadmap); APV does not front-run it.
// See docs/GENERATOR_DOCTRINE.md (APV/CAPM boundary ruling, 2026-07-13).
//
// Financing side-effects owned here (per the 2026-07-13 rulings):
//   • tax_shield     — tax relief on the debt interest, discounted at the PRE-TAX cost of
//                      debt Kd. The basis is NAMED in the answer, with a one-line note that a
//                      risk-free basis is an accepted examiner alternative (no unstated-basis
//                      figures — the P2 sensitivity-base discipline, applied to financing).
//   • issue_costs    — transaction costs of raising the finance, GROSSED-UP from net proceeds
//                      (net × f/(1−f)); a t0 outflow (stored as a negative side-effect).
//   • subsidy_benefit— for a below-market (subsidised) loan: the PV of the AFTER-TAX interest
//                      saving versus borrowing at the market rate. The tax treatment of the
//                      saving is owned here (× (1−t)); tax_shield is then taken on the ACTUAL
//                      (subsidised) interest paid.
//
// GRADED chain (so an OFR error carries all the way to the verdict): the base-case
// ncf_p → pv_p → base_npv, then each financing side-effect as its OWN graded root, then
// apv = base_npv + Σ side-effects. Because apv depends on base_npv, a wrong base-case
// figure carried correctly through the financing steps still reaches — and correctly flips
// — the apv verdict under OFR. The financing_compare kind grades TWO terminals (apv_debt,
// apv_equity); the code owns which financing package is preferred. Gearing/interest-cover
// effects are code-owned ENRICHMENT (like NPV's PI/sensitivity), not graded steps.

import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { fmt1, money, normaliseCurrency, type SerializedSchema } from './fcff';
import { computeNpv, type NpvInputs, type NpvComputed } from './npv';

export { normaliseCurrency };

const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
const pct2 = (frac: number): string => `${(frac * 100).toFixed(2)}%`;
const asDec = (v: number): number => (v > 1 ? v / 100 : v);
const df = (r: number, p: number): number => 1 / Math.pow(1 + r, p);
const EPS = 1e-9;

export type ApvKind = 'standard' | 'subsidised' | 'reject' | 'financing_compare';

export interface ApvInputs {
  // ── base case (as if all-equity) — identical to the NPV operating core ──
  initial_outlay:    number;   // t0 capital cost (positive)
  real_operating_cf: number[]; // years 1..N, pre-tax operating cash flow in REAL terms
  inflation_rate:    number;   // decimal
  tax_rate:          number;   // decimal
  tax_lag:           0 | 1;    // years tax (and the interest tax shield) are paid in arrears
  capital_for_wda:   number;   // capital qualifying for tax-allowable depreciation
  wda_rate:          number;   // decimal, reducing-balance
  scrap_value:       number;   // money terms, end of year N
  keu:               number;   // UNGEARED (all-equity) cost of equity — the base-case rate (STATED)

  // ── financing side-effects ──
  debt_amount?:      number;   // debt raised to help fund the project
  kd?:               number;   // pre-tax MARKET cost of debt (tax-shield + subsidy discount basis)
  debt_term?:        number;   // years the debt (and its shield) is outstanding; default = project life N
  subsidised_rate?:  number;   // below-market coupon actually paid (subsidised kind); market rate = kd
  issue_cost_rate?:  number;   // debt issue/transaction cost as a fraction of the GROSS principal (debt_amount)

  // ── financing_compare (B3k) only — a debt package vs an equity (rights) package ──
  equity_issue_cost_rate?: number; // issue cost fraction on the rights issue (gross)
  equity_amount?:          number; // NET equity to be raised under the equity package
  existing_debt?:          number; // current market value of debt (for the gearing overlay)
  existing_equity?:        number; // current market value of equity (for the gearing overlay)
}

// One tax-timing per drill: every financing side-effect that carries a tax consequence lags
// it identically to the trading tax (a pre-tax cash item in-year, its tax effect at t+lag).
// The tax shield is a pure tax effect → received wholly at the interest year + lag. The
// subsidy is a pre-tax interest saving in-year, whose tax effect (a smaller interest
// deduction) is charged at year + lag — so it is discounted in two timed halves, not
// collapsed to an in-year after-tax figure. Rows carry their receipt period(s) explicitly.
export interface ShieldRow { interest_year: number; interest: number; shield: number; receipt_period: number; df: number; pv: number; }
export interface SubsidyRow { year: number; saving: number; saving_df: number; saving_pv: number; tax: number; tax_period: number; tax_df: number; tax_pv: number; pv: number; }

export interface ApvComputed {
  base:        NpvComputed;   // the all-equity base case (NPV engine at Keu)
  n:           number;
  horizon:     number;
  keu:         number;
  base_npv:    number;        // base-case (all-equity) NPV

  // financing side-effect figures (undefined when the kind does not use them)
  shield_rows?:    ShieldRow[];
  tax_shield?:     number;
  subsidy_rows?:   SubsidyRow[];
  subsidy_benefit?: number;
  issue_costs?:    number;    // NEGATIVE (a cost); grossed-up from net proceeds
  coupon?:         number;    // interest rate actually paid (subsidised_rate ?? kd)
  kd?:             number;    // market cost of debt
  debt_term?:      number;

  apv:         number;        // headline APV (the chosen package for compare)
  accept:      boolean;       // apv > 0

  // financing_compare enrichment (code-owned, not graded)
  apv_debt?:        number;
  apv_equity?:      number;
  debt_issue_costs?:   number; // negative
  equity_issue_costs?: number; // negative
  financing_choice?: 'debt' | 'equity';
  gearing_debt?:    number;   // post-project D/(D+E) under the debt package
  gearing_equity?:  number;   // post-project D/(D+E) under the equity package
  extra_interest?:  number;   // annual pre-tax interest added by the debt package
}

// Issue costs, two conventions — a drill states EITHER the gross principal OR the net
// proceeds, and NEVER uses one figure as both:
//   GROSS-stated (a loan principal — interest and the tax shield run on it): cost = gross × f.
//     The debt tranche is always gross-stated (debt_amount is the principal borrowed).
//   NET-stated (the proceeds the firm must net, e.g. a rights issue sized to a funding need):
//     cost = net × f/(1−f) — gross up to net `amount` after a fee f on gross proceeds.
// Using the loan principal as gross for interest/shield AND as net for a grossed-up issue
// cost double-counts the fee; that inconsistency was FIX-A (2026-07-13).
function issueCostFromGross(gross: number, feeRate: number): number {
  if (feeRate <= 0 || feeRate >= 1) throw new Error(`issue cost rate out of range (0,1): ${feeRate}`);
  return gross * feeRate;
}
function issueCostFromNet(net: number, feeRate: number): number {
  if (feeRate <= 0 || feeRate >= 1) throw new Error(`issue cost rate out of range (0,1): ${feeRate}`);
  return (net * feeRate) / (1 - feeRate);
}

// PV of the debt tax shield: interest = debt × coupon each year 1..term, tax relief =
// interest × t, RECEIVED at the interest year + the trading-tax lag, discounted at Kd.
function computeTaxShield(debt: number, coupon: number, tax: number, kd: number, term: number, lag: 0 | 1): { rows: ShieldRow[]; total: number } {
  const rows: ShieldRow[] = [];
  let total = 0;
  for (let y = 1; y <= term; y++) {
    const interest = debt * coupon;
    const shield = interest * tax;
    const receipt = y + lag;
    const d = df(kd, receipt);
    const pv = shield * d;
    total += pv;
    rows.push({ interest_year: y, interest, shield, receipt_period: receipt, df: d, pv });
  }
  return { rows, total };
}

export function computeApv(raw: ApvInputs, kind: ApvKind): ApvComputed {
  const tax = asDec(raw.tax_rate);
  const keu = asDec(raw.keu);
  if (keu <= 0 || keu >= 1) throw new Error(`keu out of range (0,1): ${keu}`);

  // Base case: the operating project discounted at the ungeared cost of equity.
  const core: NpvInputs = {
    initial_outlay: raw.initial_outlay, real_operating_cf: raw.real_operating_cf,
    inflation_rate: raw.inflation_rate, tax_rate: raw.tax_rate, tax_lag: raw.tax_lag,
    capital_for_wda: raw.capital_for_wda, wda_rate: raw.wda_rate, scrap_value: raw.scrap_value,
    discount_rate: keu,
  };
  const base = computeNpv(core, 'standard');
  const base_npv = base.npv;

  const out: ApvComputed = {
    base, n: base.n, horizon: base.horizon, keu, base_npv, apv: base_npv, accept: base_npv > 0,
  };

  const lag = raw.tax_lag;
  const term = raw.debt_term ?? base.n;

  if (kind === 'financing_compare') {
    // Two financing packages for the SAME project. Debt: tax shield − debt issue costs.
    // Equity (rights): no shield, only equity issue costs. Code owns which wins.
    const debt = req(raw.debt_amount, 'debt_amount');
    const kd = asDec(req(raw.kd, 'kd'));
    const { rows: shieldRows, total: taxShield } = computeTaxShield(debt, kd, tax, kd, term, lag);
    // Debt principal is GROSS (interest + shield run on it) → issue cost = gross × f.
    const debtIssue = -issueCostFromGross(debt, asDec(req(raw.issue_cost_rate, 'issue_cost_rate')));
    // Rights-issue proceeds are stated NET of costs → gross up.
    const equityNet = req(raw.equity_amount, 'equity_amount');
    const equityIssue = -issueCostFromNet(equityNet, asDec(req(raw.equity_issue_cost_rate, 'equity_issue_cost_rate')));

    const apvDebt = base_npv + taxShield + debtIssue;
    const apvEquity = base_npv + equityIssue;
    const choice: 'debt' | 'equity' = apvDebt + EPS >= apvEquity ? 'debt' : 'equity';

    out.shield_rows = shieldRows;
    out.tax_shield = taxShield;
    out.coupon = kd; out.kd = kd; out.debt_term = term;
    out.debt_issue_costs = debtIssue;
    out.equity_issue_costs = equityIssue;
    out.apv_debt = apvDebt;
    out.apv_equity = apvEquity;
    out.financing_choice = choice;
    out.apv = choice === 'debt' ? apvDebt : apvEquity;
    out.accept = out.apv > 0;

    // Gearing overlay (enrichment): D/(D+E) after the project under each package.
    const exD = raw.existing_debt, exE = raw.existing_equity;
    if (exD !== undefined && exE !== undefined) {
      out.gearing_debt = (exD + debt) / (exD + debt + exE);
      out.gearing_equity = exD / (exD + exE + equityNet);
      out.extra_interest = debt * kd;
    }
    return out;
  }

  // standard / subsidised / reject — one financing package.
  const debt = req(raw.debt_amount, 'debt_amount');
  const kd = asDec(req(raw.kd, 'kd'));
  const coupon = raw.subsidised_rate !== undefined ? asDec(raw.subsidised_rate) : kd;
  if (coupon > kd + EPS) throw new Error(`subsidised_rate (${coupon}) must be below the market kd (${kd})`);

  const { rows: shieldRows, total: taxShield } = computeTaxShield(debt, coupon, tax, kd, term, lag);
  out.shield_rows = shieldRows;
  out.tax_shield = taxShield;
  out.coupon = coupon; out.kd = kd; out.debt_term = term;

  let apv = base_npv + taxShield;

  if (raw.subsidised_rate !== undefined) {
    // Interest saving vs the market rate: a PRE-TAX cash saving in year y, whose tax effect
    // (a smaller interest deduction ⇒ more tax) is charged at year y + lag — the SAME lag as
    // the shield and trading tax. Discounted in two timed halves, not collapsed in-year.
    const subsidyRows: SubsidyRow[] = [];
    let subsidyTotal = 0;
    for (let y = 1; y <= term; y++) {
      const saving = debt * (kd - coupon);
      const savingDf = df(kd, y);
      const savingPv = saving * savingDf;
      const taxAmt = saving * tax;
      const taxPeriod = y + lag;
      const taxDf = df(kd, taxPeriod);
      const taxPv = taxAmt * taxDf;
      const pv = savingPv - taxPv;
      subsidyTotal += pv;
      subsidyRows.push({ year: y, saving, saving_df: savingDf, saving_pv: savingPv, tax: taxAmt, tax_period: taxPeriod, tax_df: taxDf, tax_pv: taxPv, pv });
    }
    out.subsidy_rows = subsidyRows;
    out.subsidy_benefit = subsidyTotal;
    apv += subsidyTotal;
  }

  if (raw.issue_cost_rate !== undefined) {
    // Debt principal is GROSS (interest + shield run on it) → issue cost = gross × f.
    out.issue_costs = -issueCostFromGross(debt, asDec(raw.issue_cost_rate));
    apv += out.issue_costs;
  }

  out.apv = apv;
  out.accept = apv > 0;
  return out;
}

function req(v: number | undefined, name: string): number {
  if (v === undefined || !Number.isFinite(v)) throw new Error(`APV input "${name}" is required for this kind and must be finite`);
  return v;
}

// ── Schema: graded ncf_p → pv_p → base_npv → [side-effects] → apv (OFR carries to verdict) ──
export function buildApvSchema(raw: ApvInputs, c: ApvComputed, currency: string, kind: ApvKind): { schema: AnswerSchema; serialized: SerializedSchema } {
  const keu = c.keu;
  const outlay = raw.initial_outlay;
  const moneyUnit = `${currency}m`;
  const components: Component[] = [];

  // ncf_p (base-case operating net cash flows) — roots.
  for (const per of c.base.periods) {
    components.push({
      component_id: `ncf_${per.period}`,
      label: `Net after-tax cash flow, year ${per.period}`,
      expected_value: per.ncf, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`Operating cash flow (inflated) − tax (timed) ${per.period === c.n ? '+ scrap ' : ''}for year ${per.period}`],
    });
  }
  // pv_p — discounted at Keu (the ungeared cost of equity).
  for (const per of c.base.periods) {
    const d = per.df;
    components.push({
      component_id: `pv_${per.period}`,
      label: `Base-case present value, year ${per.period}`,
      expected_value: per.pv, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: [`ncf_${per.period}`],
      recompute: (dep) => dep[`ncf_${per.period}`] * d,
      working_steps: [`= ncf_${per.period} × ${d.toFixed(3)} (discount factor at Keu ${pct2(keu)})`],
    });
  }
  const pvIds = c.base.periods.map((p) => `pv_${p.period}`);
  components.push({
    component_id: 'base_npv',
    label: 'Base-case NPV (all-equity, discounted at Keu)',
    expected_value: c.base_npv, unit: moneyUnit, tolerance: rel(0.5),
    depends_on: pvIds,
    recompute: (dep) => pvIds.reduce((s, id) => s + dep[id], 0) - outlay,
    working_steps: [`= Σ base-case present values − initial outlay ${fmt1(outlay)}`],
  });

  const recomputeIds: Record<string, string | undefined> = { base_npv: 'base_npv_sum_less_outlay' };
  for (const p of c.base.periods) recomputeIds[`pv_${p.period}`] = `pv_discount_keu_y${p.period}`;

  if (kind === 'financing_compare') {
    // tax_shield + two issue-cost roots → two terminal APVs (debt vs equity package).
    components.push({
      component_id: 'tax_shield', label: 'PV of the debt tax shield',
      expected_value: c.tax_shield!, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`Σ debt × ${pct2(c.coupon!)} × ${pct2(asDec(raw.tax_rate))} tax relief, discounted at Kd ${pct2(c.kd!)}`],
    });
    components.push({
      component_id: 'debt_issue_costs', label: 'Issue costs — debt package (gross principal × f)',
      expected_value: c.debt_issue_costs!, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`−(gross debt principal × f) at ${pct2(asDec(raw.issue_cost_rate!))}`],
    });
    components.push({
      component_id: 'equity_issue_costs', label: 'Issue costs — equity (rights) package (net, grossed up)',
      expected_value: c.equity_issue_costs!, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`−(net proceeds × f/(1−f)) at ${pct2(asDec(raw.equity_issue_cost_rate!))}`],
    });
    components.push({
      component_id: 'apv_debt', label: 'APV — debt financing package',
      expected_value: c.apv_debt!, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['base_npv', 'tax_shield', 'debt_issue_costs'],
      recompute: (dep) => dep.base_npv + dep.tax_shield + dep.debt_issue_costs,
      working_steps: ['= base-case NPV + tax shield + debt issue costs'],
    });
    components.push({
      component_id: 'apv_equity', label: 'APV — equity (rights) financing package',
      expected_value: c.apv_equity!, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['base_npv', 'equity_issue_costs'],
      recompute: (dep) => dep.base_npv + dep.equity_issue_costs,
      working_steps: ['= base-case NPV + equity issue costs (no tax shield)'],
    });
    recomputeIds.tax_shield = undefined;
    recomputeIds.debt_issue_costs = undefined;
    recomputeIds.equity_issue_costs = undefined;
    recomputeIds.apv_debt = 'apv_sum';
    recomputeIds.apv_equity = 'apv_sum';
  } else {
    // tax_shield (+ subsidy_benefit) (+ issue_costs) → apv.
    const apvDeps: string[] = ['base_npv', 'tax_shield'];
    components.push({
      component_id: 'tax_shield', label: 'PV of the debt tax shield',
      expected_value: c.tax_shield!, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`Σ debt × ${pct2(c.coupon!)} × ${pct2(asDec(raw.tax_rate))} tax relief, received at year+${raw.tax_lag} and discounted at Kd ${pct2(c.kd!)}`],
    });
    recomputeIds.tax_shield = undefined;

    if (c.subsidy_benefit !== undefined) {
      components.push({
        component_id: 'subsidy_benefit', label: 'PV of the interest saving vs the market rate (subsidised loan)',
        expected_value: c.subsidy_benefit, unit: moneyUnit, tolerance: rel(0.5),
        working_steps: [`Σ [ debt × (Kd ${pct2(c.kd!)} − ${pct2(c.coupon!)}) in-year − its tax at year+${raw.tax_lag} ], discounted at Kd`],
      });
      recomputeIds.subsidy_benefit = undefined;
      apvDeps.push('subsidy_benefit');
    }
    if (c.issue_costs !== undefined) {
      components.push({
        component_id: 'issue_costs', label: 'Issue costs (on the gross debt principal)',
        expected_value: c.issue_costs, unit: moneyUnit, tolerance: rel(0.5),
        working_steps: [`−(gross debt principal × f) at ${pct2(asDec(raw.issue_cost_rate!))}`],
      });
      recomputeIds.issue_costs = undefined;
      apvDeps.push('issue_costs');
    }

    components.push({
      component_id: 'apv', label: 'Adjusted present value',
      expected_value: c.apv, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: apvDeps,
      recompute: (dep) => apvDeps.reduce((s, id) => s + dep[id], 0),
      working_steps: [`= base-case NPV + ${apvDeps.slice(1).join(' + ').replace(/_/g, ' ')}`],
    });
    recomputeIds.apv = 'apv_sum';
  }

  const serialized: SerializedSchema = {
    components: components.map((comp) => {
      const s: SerializedSchema['components'][number] = {
        component_id: comp.component_id, label: comp.label, expected_value: comp.expected_value,
        unit: comp.unit, tolerance: comp.tolerance, working_steps: comp.working_steps,
        depends_on: comp.depends_on, weight: comp.weight,
      };
      const rid = recomputeIds[comp.component_id];
      if (rid) s.recompute = rid;
      return s;
    }),
    params: {
      keu, tax_rate: asDec(raw.tax_rate), inflation_rate: asDec(raw.inflation_rate),
      wda_rate: asDec(raw.wda_rate), tax_lag: raw.tax_lag, initial_outlay: outlay,
      capital_for_wda: raw.capital_for_wda, scrap_value: raw.scrap_value,
      debt_amount: raw.debt_amount ?? 0, kd: c.kd ?? 0, debt_term: c.debt_term ?? base_term(c),
    },
  };
  return { schema: { components }, serialized };
}

function base_term(c: ApvComputed): number { return c.debt_term ?? c.n; }

// ── Model answer: code owns every figure, the APV bridge, and the accept/reject (or
// financing-choice) verdict; the model's prose is qualitative reasoning only ──
export function buildApvModelAnswer(raw: ApvInputs, c: ApvComputed, prose: string, currency: string, kind: ApvKind): string {
  const m = (n: number) => money(currency, n);
  const keu = c.keu;
  const lines: string[] = [];

  lines.push('**Investment appraisal — adjusted present value (APV)**', '');
  lines.push(
    `**Assumptions:** the project is valued in two stages — the base case as if **all-equity financed**, discounted at the ungeared cost of equity Keu of ${pct2(keu)}, then the present value of the financing side-effects it triggers. Operating cash flows are in money terms, inflated at ${pct2(asDec(raw.inflation_rate))}; tax at ${pct2(asDec(raw.tax_rate))} is charged on operating cash flow less tax-allowable depreciation (${pct2(asDec(raw.wda_rate))} reducing balance, balancing allowance/charge in year ${c.n}) and paid ${raw.tax_lag === 0 ? 'in the year the profit arises' : 'one year in arrears'}. The debt tax shield is discounted at the **pre-tax cost of debt Kd** of ${pct2(c.kd ?? 0)}; discounting the shield at the risk-free rate instead is an accepted examiner alternative and would raise its present value slightly.`,
    '',
  );

  // Step 1 — WDA
  lines.push('**Step 1 — Tax-allowable depreciation (reducing balance)**', '', `| Year | WDA |`, `|------|-----|`);
  for (const y of c.base.years) lines.push(`| ${y.year} | ${m(y.wda)} |`);
  lines.push('');
  // Step 2 — tax
  lines.push('**Step 2 — Taxable profit and tax**', '', `| Year | Operating cash flow | WDA | Taxable | Tax |`, `|------|------|------|------|------|`);
  for (const y of c.base.years) lines.push(`| ${y.year} | ${m(y.money_cf)} | ${m(y.wda)} | ${m(y.taxable)} | ${m(y.tax)} |`);
  lines.push('');
  // Step 3 — base case at Keu
  lines.push('**Step 3 — Base-case NPV (all-equity, discounted at Keu)**', '', `| Period | Net cash flow | DF @ Keu ${pct2(keu)} | Present value |`, `|--------|------|------|------|`);
  lines.push(`| 0 | ${m(-raw.initial_outlay)} | 1.000 | ${m(-raw.initial_outlay)} |`);
  for (const p of c.base.periods) lines.push(`| ${p.period} | ${m(p.ncf)} | ${p.df.toFixed(3)} | ${m(p.pv)} |`);
  lines.push('');
  lines.push(`**Base-case NPV = present value of the operating flows ${m(c.base.pv_inflows)} − initial outlay ${m(raw.initial_outlay)} = ${m(c.base_npv)}.**`, '');

  // Step 4 — financing side-effects (one tax-timing throughout: tax effects land at year+lag)
  const debt = raw.debt_amount ?? 0;
  const coupon = c.coupon ?? 0;
  const kd = c.kd ?? 0;
  const taxRate = asDec(raw.tax_rate);
  const lag = raw.tax_lag;
  lines.push('**Step 4 — Financing side-effects**', '');

  if (c.shield_rows && c.tax_shield !== undefined) {
    lines.push(`*Debt tax shield* — interest is tax-deductible, so ${m(debt)} of debt at ${pct2(coupon)} gives annual tax relief of ${m(debt * coupon * taxRate)}, **received ${lag === 0 ? 'in the year the interest is charged' : 'one year in arrears (the same lag as trading tax)'}** and discounted at the pre-tax cost of debt Kd ${pct2(kd)}:`, '');
    lines.push(`| Interest year | Interest | Tax relief | Received (period) | DF @ ${pct2(kd)} | PV |`, `|------|------|------|------|------|------|`);
    for (const r of c.shield_rows) lines.push(`| ${r.interest_year} | ${m(r.interest)} | ${m(r.shield)} | ${r.receipt_period} | ${r.df.toFixed(3)} | ${m(r.pv)} |`);
    lines.push('', `**PV of the tax shield = ${m(c.tax_shield)}.**`, '');
  }

  if (c.subsidy_rows && c.subsidy_benefit !== undefined) {
    lines.push(`*Subsidised-loan benefit* — the loan is priced below the market rate, so the firm saves ${pct2(kd - coupon)} of ${m(debt)} = ${m(debt * (kd - coupon))} of interest each year (a pre-tax cash saving in the interest year); the smaller interest deduction then adds tax of ${m(debt * (kd - coupon) * taxRate)} **${lag === 0 ? 'in the same year' : 'one year later — the same lag as the shield'}**. Both legs are discounted at the market Kd ${pct2(kd)}:`, '');
    lines.push(`| Interest year | Pre-tax saving (period ${lag === 0 ? 'y' : 'y'}) | Extra tax (period y+${lag}) | Net PV |`, `|------|------|------|------|`);
    for (const r of c.subsidy_rows) lines.push(`| ${r.year} | +${m(r.saving)} @ ${r.saving_df.toFixed(3)} | −${m(r.tax)} @ ${r.tax_df.toFixed(3)} (period ${r.tax_period}) | ${m(r.pv)} |`);
    lines.push('', `**PV of the subsidised-loan benefit = ${m(c.subsidy_benefit)}.**`, '');
  }

  if (c.issue_costs !== undefined) {
    lines.push(`*Issue costs* — raising the ${m(debt)} of debt incurs ${pct2(asDec(raw.issue_cost_rate ?? 0))} of transaction costs on the gross principal, a t0 outflow of **${m(c.issue_costs)}**.`, '');
  }

  // Step 5 — APV bridge + decision
  if (kind === 'financing_compare') {
    lines.push('**Step 5 — Adjusted present value under each financing package**', '');
    lines.push(`| | Debt package | Equity (rights) package |`, `|------|------|------|`);
    lines.push(`| Base-case NPV | ${m(c.base_npv)} | ${m(c.base_npv)} |`);
    lines.push(`| Tax shield | ${m(c.tax_shield ?? 0)} | — |`);
    lines.push(`| Issue costs | ${m(c.debt_issue_costs ?? 0)} | ${m(c.equity_issue_costs ?? 0)} |`);
    lines.push(`| **APV** | **${m(c.apv_debt ?? 0)}** | **${m(c.apv_equity ?? 0)}** |`);
    lines.push('', `*Debt issue costs = ${pct2(asDec(raw.issue_cost_rate ?? 0))} of the ${m(debt)} gross principal; the rights issue is stated net, so its ${pct2(asDec(raw.equity_issue_cost_rate ?? 0))} cost is grossed up.*`, '');
    if (c.gearing_debt !== undefined && c.gearing_equity !== undefined) {
      lines.push(`*Reported-position overlay:* the debt package lifts gearing (D/(D+E), market values) to **${pct2(c.gearing_debt)}** and adds ${m(c.extra_interest ?? 0)} of annual interest (reducing interest cover), whereas the rights issue lowers gearing to **${pct2(c.gearing_equity)}** but dilutes existing shareholders.`, '');
    }
    lines.push('**Step 6 — Decision**', '');
    const choice = c.financing_choice ?? 'debt';
    const chosenApv = choice === 'debt' ? (c.apv_debt ?? 0) : (c.apv_equity ?? 0);
    const otherApv = choice === 'debt' ? (c.apv_equity ?? 0) : (c.apv_debt ?? 0);
    lines.push(
      chosenApv > 0
        ? `Both packages fund the same base case, so the ranking turns on the financing side-effects. The **${choice}** package is **preferred** — it gives the higher APV (${m(chosenApv)} vs ${m(otherApv)}), so on these assumptions the board should **fund the project using ${choice} finance**; the project adds value and the ${choice} route captures more of it.`
        : `On these assumptions the **preferred** (higher) of the two packages, **${choice}**, still gives a negative APV of ${m(chosenApv)}, so the project **destroys value under either financing structure and should be rejected** as it stands.`,
      '',
    );
  } else {
    lines.push('**Step 5 — Adjusted present value**', '');
    lines.push(`| Component | Amount |`, `|------|------|`);
    lines.push(`| Base-case NPV (all-equity) | ${m(c.base_npv)} |`);
    lines.push(`| PV of debt tax shield | ${m(c.tax_shield ?? 0)} |`);
    if (c.subsidy_benefit !== undefined) lines.push(`| PV of subsidised-loan benefit | ${m(c.subsidy_benefit)} |`);
    if (c.issue_costs !== undefined) lines.push(`| Issue costs | ${m(c.issue_costs)} |`);
    lines.push(`| **Adjusted present value** | **${m(c.apv)}** |`);
    lines.push('');
    lines.push('**Step 6 — Decision**', '');
    lines.push(
      c.accept
        ? `The APV of ${m(c.apv)} is **positive**, so once the financing side-effects are added to the all-equity base case the project **adds shareholder value and should be accepted**.`
        : `The APV of ${m(c.apv)} is **negative**: the financing side-effects (${m((c.tax_shield ?? 0) + (c.subsidy_benefit ?? 0) + (c.issue_costs ?? 0))} in total) are **not enough to rescue the negative base case** of ${m(c.base_npv)}, so the project **destroys value and should be rejected** as it stands.`,
      '',
    );
  }

  // Advice — opener keyed to the code decision, then prose
  const advStep = kind === 'financing_compare' ? '7' : '7';
  lines.push(`**Step ${advStep} — Advice to the board**`, '');
  lines.push(
    c.accept
      ? `On these assumptions the APV is positive; a positive result is a floor, not a mandate, so the recommendation is conditional on the base-case and financing assumptions below holding under scrutiny.`
      : `On these assumptions the APV is negative, so the base-case recommendation is to **reject** as structured; the board should treat rejection as the default unless the assumptions below prove materially conservative.`,
    '',
  );
  lines.push(prose, '');
  const sideTotal = (c.tax_shield ?? 0) + (c.subsidy_benefit ?? 0) + (c.issue_costs ?? 0);
  lines.push(
    kind === 'financing_compare'
      ? `*Reconciliation: base-case NPV ${m(c.base_npv)}; debt APV ${m(c.apv_debt ?? 0)} vs equity APV ${m(c.apv_equity ?? 0)} — higher is ${c.financing_choice}. ✓*`
      : `*Reconciliation: base-case NPV ${m(c.base_npv)} + financing side-effects ${m(sideTotal)} = APV ${m(c.apv)} ✓*`,
  );

  return lines.join('\n');
}
