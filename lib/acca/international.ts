// lib/acca/international.ts
// AFM calculator #10 — INTERNATIONAL investment & financing decisions (B5) + multinational
// dividend capacity (A6a). Pure, deterministic, no model/DB/side-effects. Code owns EVERY
// figure AND every figure-vs-figure verdict (accept/reject, the decision FLIP under an
// alternative exchange-rate path, the sustainability verdict) — the model authors prose only.
//
// COMPOSITION RULING (Grant, 2026-07-17, Step-0 #7): this module OWNS only the genuinely new
// logic — the forward-FX curve, remittance blocking, and the credit-method double-tax overlay —
// and COMPOSES the two existing engines ONE-WAY, with NO back-imports:
//   • the FCFF/FCFE build  ← valuation.ts (fcffFromBuild, computeDividendCapacity)
//   • the discounting       ← npv.ts (discountFactor)
// npv.ts and valuation.ts are never imported back into and are unchanged in behaviour.
//
// FORWARD FX CURVE — DERIVED, NEVER ASSERTED (Step-0 #1/#8, ruled). Every forecast spot is
// computed from a stated base spot S0 and a stated rate DIFFERENTIAL, geometric single-
// differential compounding:  S_t = S0 · ((1 + r_foreign) / (1 + r_home))^t.  The BASIS is
// stated per drill: PPP (relative INFLATION — the default for translating a multi-year project
// cash-flow stream) or IRP (relative INTEREST/yield — reserved for short-horizon forwards).
// The engine supports both; each drill fixes ONE basis, and the parity-consistency gate
// re-derives the curve from THAT basis (not a hard-coded formula).
//
// RATE CONVENTION: S0 and every forecast spot are quoted FOREIGN units per 1 HOME unit
// (e.g. MXN per USD). A foreign amount converts to home by DIVISION: home = foreign / S_t.
// A foreign currency that depreciates (higher foreign inflation/interest) has a RISING spot.
//
// DOUBLE-TAX — CREDIT METHOD, HOME-LIABILITY CAP (Step-0 #4, ruled). A remittance suffers host
// WITHHOLDING at w; the home country taxes the same income at h and grants a CREDIT for the
// host tax, capped at the home liability. The ADDITIONAL home tax rate is therefore
//   max(0, h − w)  — never negative (no refund of excess host tax when w ≥ h).
// So the fraction of a foreign remittance that reaches the parent, net of BOTH taxes, is
//   remitNetFactor(w, h) = (1 − w) − max(0, h − w)  =  min(1 − w, 1 − h).

import { fixedHalfUp } from './rounding';
import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { fcffFromBuild, computeDividendCapacity, money, signedSurplus, fmt1, normaliseCurrency, type FcffBuild, type ParamValue } from './valuation';
import { discountFactor } from './npv';

export { normaliseCurrency };

// ── formatting / rates ──
const pct2 = (frac: number): string => `${fixedHalfUp(frac * 100, 2)}%`;
const asDec = (v: number): number => (v > 1 ? v / 100 : v);
const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
// Money components carry a FLOOR tolerance: a 0.5% relative band with a 0.2 (display-currency m)
// absolute floor, so a small-magnitude figure (a near-nil additional tax, a thin converted flow) is
// not held to a punishingly tight relative band. Scoped to this family now (Fix Round 1, 2026-07-17).
const moneyTol: Tolerance = { kind: 'floor', pct: 0.5, floor: 0.2 };
const EPS = 1e-9;
// Forecast spots display at 4 dp so GATE2 figure-integrity always finds them (present() checks 1–4 dp).
export const fmt4 = (n: number): string => fixedHalfUp(n, 4);
// FX unit "MXN/USD" — foreign per home. Contains a 3-letter code, so validate-schema classifies
// it as MONEY and (correctly) wants a relative tolerance; a relative band is right for an FX rate.
function fxUnit(foreign: string, home: string): string { return `${foreign}/${home}`; }

export type ParityBasis = 'ppp' | 'irp';
export type InternationalKind =
  | 'home_currency_standard'         // K1 — B5b: forecast-FX translate → home NPV, with double-tax
  | 'exchange_rate_sensitivity'      // K2 — B5a: base vs an alternative FX path → the decision FLIP
  | 'restricted_remittance'          // K3 — B5b primary / B5c dual: blocked funds reinvested + released
  | 'multinational_dividend_capacity'; // K4 — A6a: parent + remitted subsidiary FCFE → dividend policy

// ── the parity forward curve (never asserted) ──
export function parityDifferential(basis: ParityBasis, rateHome: number, rateForeign: number): number {
  return (1 + asDec(rateForeign)) / (1 + asDec(rateHome));
}
// S_t for t = 1..years (index 0 = year 1). S0 is NOT included (it is the stated base spot).
export function buildForwardCurve(s0: number, basis: ParityBasis, rateHome: number, rateForeign: number, years: number): number[] {
  const k = parityDifferential(basis, rateHome, rateForeign);
  const curve: number[] = [];
  for (let t = 1; t <= years; t++) curve.push(s0 * Math.pow(k, t));
  return curve;
}

// ── DOUBLE-TAX — the exam-orthodox CREDIT base is the CORPORATE DIFFERENTIAL (Fix Round 1, ruled) ──
// Rule 22 evidence (ACCA AFM technical article, "International project appraisal (part 2)",
// accaglobal.com — P4/AFM technical articles:
// https://www.accaglobal.com/gb/en/student/exam-support-resources/professional-exams-study-resources/p4/technical-articles.html):
//   "A bilateral tax treaty exists between the countries of Ayjai and Nuruk — hence, taxable profits
//    earned in Nuruk will be liable to the differential income tax rate on company profits that
//    applies between the two countries."
// So the parent's ADDITIONAL home tax is charged on the foreign TAXABLE PROFIT (the same PBIT-based
// tax base the FCFF build already taxes), crediting the foreign CORPORATE tax already paid:
//   additional home tax = max(0, home_rate − foreign_CORPORATE_rate) × taxable profit.
// Withholding tax (WHT) is a SEPARATE layer on the remitted amount. Whether the treaty makes WHT
// creditable is STATED per scenario; if creditable, the credit extends to the WHT too:
//   additional home tax = max(0, home_liability − foreign_corp_tax − WHT paid).
// Never negative, never a refund of excess foreign tax.
export interface YearTax {
  wht: number;                       // withholding on the remittance (foreign)
  home_liability: number;            // home_rate × taxable profit (foreign)
  foreign_corp_tax: number;          // foreign_corp_rate × taxable profit (foreign) — the credit base
  additional_home_tax_foreign: number; // the residual additional home tax (foreign), ≥ 0
  net_remit_foreign: number;         // FCFF − WHT − additional home tax (foreign)
}
export function computeYearTax(fcff: number, taxable_profit: number, withholding: number, homeTax: number, foreignCorp: number, whtCreditable: boolean): YearTax {
  const w = asDec(withholding), h = asDec(homeTax), fc = asDec(foreignCorp);
  const wht = w * fcff;                                   // WHT on the remittance
  const home_liability = h * taxable_profit;
  const foreign_corp_tax = fc * taxable_profit;
  const additional_home_tax_foreign = whtCreditable
    ? Math.max(0, home_liability - foreign_corp_tax - wht)  // treaty credits the WHT too
    : Math.max(0, home_liability - foreign_corp_tax);       // WHT not creditable — a pure cost
  const net_remit_foreign = fcff - wht - additional_home_tax_foreign;
  return { wht, home_liability, foreign_corp_tax, additional_home_tax_foreign, net_remit_foreign };
}

// Shared fiscal inputs (host withholding + home tax; the foreign CORPORATE rate is the FCFF build's
// tax_rate; whether WHT is treaty-creditable is stated per scenario).
interface FiscalInputs {
  withholding_rate: number;  // host withholding on remittances, decimal or %
  home_tax_rate: number;     // parent-country tax on foreign taxable profit, decimal or %
  wht_creditable: boolean;   // does the bilateral treaty make the WHT creditable against home tax?
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K1 — home_currency_standard (B5b)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IntlNpvInputs extends FiscalInputs {
  home_currency: string; foreign_currency: string;
  base_spot: number;                 // S0, foreign per home
  basis: ParityBasis;
  rate_home: number; rate_foreign: number;   // the parity differential inputs (inflation for PPP, interest for IRP)
  discount_rate: number;             // home money cost of capital, decimal or %
  foreign_build: FcffBuild;          // reused one-way: base-year maintainable foreign FCFF
  foreign_growth?: number;           // real growth of the foreign FCFF, decimal (default 0)
  years: number;                     // project life (2..6)
  initial_outlay_foreign: number;    // t0 capital cost in FOREIGN currency (converted at S0)
}
export interface IntlYear {
  year: number; fx: number; foreign_cf: number; taxable_profit: number;
  wht: number; foreign_corp_tax: number; home_liability: number;
  additional_home_tax_foreign: number; additional_home_tax_home: number; // the differential home tax (foreign / converted)
  foreign_remit_net: number; home_cf: number; df: number; pv: number;
}
export interface IntlNpvComputed {
  years: IntlYear[];
  fx_curve: number[];
  home_outlay: number;
  base_fcff_foreign: number;
  base_pbit_foreign: number;
  npv: number; accept: boolean;
  /** Σ years[].pv — the present value of the future cash flows, BEFORE the initial outlay.
   *  Exposed as a named field (FR3/GATE 27 ruling) because the model answer quotes it in the
   *  reconciliation line ("Σ present values EUR 101.3m − home outlay …"). Computed inline it
   *  was an ORPHAN: a derived figure in prose with no code-owned value for the
   *  derived-figure-integrity gate to match it against. */
  sum_pv: number;
  has_additional_home_tax: boolean;  // false when foreign corporate rate ≥ home rate (K1 NIL case)
  add_tax_rate_effective: number;    // max(0, home − foreign_corp) — for display/teaching (0 = nil)
}
export function computeIntlNpv(raw: IntlNpvInputs): IntlNpvComputed {
  finiteGuard(raw as unknown as Record<string, unknown>, 'IntlNpv');
  const r = asDec(raw.discount_rate);
  const g = asDec(raw.foreign_growth ?? 0);
  const N = raw.years;
  if (!(N >= 2 && N <= 6)) throw new Error(`years must be 2..6, got ${N}`);
  if (r <= 0 || r >= 1) throw new Error(`discount_rate out of range (0,1): ${r}`);
  if (!(raw.base_spot > 0)) throw new Error(`base_spot must be positive: ${raw.base_spot}`);
  if (!(raw.initial_outlay_foreign > 0)) throw new Error(`initial_outlay_foreign must be positive`);
  const w = asDec(raw.withholding_rate), h = asDec(raw.home_tax_rate), fc = asDec(raw.foreign_build.tax_rate);
  if (w < 0 || w >= 1) throw new Error(`withholding_rate out of range [0,1): ${w}`);
  if (h < 0 || h >= 1) throw new Error(`home_tax_rate out of range [0,1): ${h}`);

  const baseFcff = fcffFromBuild(raw.foreign_build);
  const basePbit = raw.foreign_build.pbit;                            // the taxable-profit base (PBIT)
  if (!(baseFcff > 0)) throw new Error(`base foreign FCFF must be positive: ${baseFcff}`);
  const fx_curve = buildForwardCurve(raw.base_spot, raw.basis, raw.rate_home, raw.rate_foreign, N);
  const home_outlay = raw.initial_outlay_foreign / raw.base_spot;

  const years: IntlYear[] = [];
  let npv = -home_outlay;
  for (let t = 1; t <= N; t++) {
    const fx = fx_curve[t - 1];
    const scale = Math.pow(1 + g, t - 1);
    const foreign_cf = baseFcff * scale;                             // FCFF (cash to remit), foreign
    const taxable_profit = basePbit * scale;                        // taxable profit (PBIT base), foreign
    const tax = computeYearTax(foreign_cf, taxable_profit, w, h, fc, raw.wht_creditable);
    const home_cf = tax.net_remit_foreign / fx;
    const additional_home_tax_home = tax.additional_home_tax_foreign / fx;
    const d = discountFactor(r, t);
    const pv = home_cf * d;
    npv += pv;
    years.push({ year: t, fx, foreign_cf, taxable_profit, wht: tax.wht, foreign_corp_tax: tax.foreign_corp_tax, home_liability: tax.home_liability, additional_home_tax_foreign: tax.additional_home_tax_foreign, additional_home_tax_home, foreign_remit_net: tax.net_remit_foreign, home_cf, df: d, pv });
  }
  const has_additional_home_tax = years.some((y) => y.additional_home_tax_foreign > EPS);
  const sum_pv = years.reduce((s, y) => s + y.pv, 0);
  return { years, fx_curve, home_outlay, base_fcff_foreign: baseFcff, base_pbit_foreign: basePbit, npv, accept: npv > 0, sum_pv, has_additional_home_tax, add_tax_rate_effective: Math.max(0, h - fc) };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K2 — exchange_rate_sensitivity (B5a): the SAME project under a BASE and an ALTERNATIVE FX
// path (a steeper foreign depreciation). Code owns both NPVs and whether the decision FLIPS.
// The named "base" the impact is measured against is the FX ASSUMPTION being flexed (P2-analogue).
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IntlSensitivityInputs extends IntlNpvInputs {
  alt_rate_foreign: number;          // the alternative foreign parity rate (higher → faster depreciation)
  alt_label: string;                 // e.g. "a sharper devaluation of the peso"
}
export interface IntlSensitivityComputed {
  base: IntlNpvComputed; alt: IntlNpvComputed;
  npv_base: number; npv_alt: number; npv_swing: number;   // alt − base (signed; normally negative)
  accept_base: boolean; accept_alt: boolean; flips: boolean;
}
export function computeIntlSensitivity(raw: IntlSensitivityInputs): IntlSensitivityComputed {
  const base = computeIntlNpv(raw);
  const alt = computeIntlNpv({ ...raw, rate_foreign: raw.alt_rate_foreign });
  return {
    base, alt,
    npv_base: base.npv, npv_alt: alt.npv, npv_swing: alt.npv - base.npv,
    accept_base: base.accept, accept_alt: alt.accept, flips: base.accept !== alt.accept,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K3 — restricted_remittance (B5b primary, B5c dual): a fraction of each year's foreign cash is
// BLOCKED, reinvested locally at a stated rate, and released in the terminal year. Code owns the
// NPV and the NPV DELTA vs the freely-remitted counterfactual (the teaching figure).
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IntlRemittanceInputs extends IntlNpvInputs {
  blocked_fraction: number;          // share of each year's foreign cash blocked from remittance
  local_reinvest_rate: number;       // rate the blocked funds earn locally, decimal or %
}
export interface IntlRemittanceComputed {
  years: IntlYear[];                 // the FREE (remitted) portion per year
  fx_curve: number[]; home_outlay: number; base_fcff_foreign: number;
  has_additional_home_tax: boolean; add_tax_rate_effective: number;
  blocked_release_foreign: number;   // accumulated blocked funds released in year N (foreign, pre-tax)
  blocked_tp_total: number;          // total blocked taxable profit (deferred, taxed at release)
  release_tax: YearTax;              // WHT + differential on the release
  home_cf_release: number;           // release converted + net of double-tax, HOME currency (year N)
  npv: number; accept: boolean;
  npv_if_free: number;               // the freely-remitted counterfactual NPV (no blocking)
  npv_cost_of_blocking: number;      // npv − npv_if_free (signed; ≤ 0 unless local rate beats the home rate)
}
export function computeIntlRemittance(raw: IntlRemittanceInputs): IntlRemittanceComputed {
  finiteGuard(raw as unknown as Record<string, unknown>, 'IntlRemittance');
  const b = raw.blocked_fraction, rho = asDec(raw.local_reinvest_rate);
  if (!(b > 0 && b < 1)) throw new Error(`blocked_fraction out of range (0,1): ${b}`);
  if (rho < 0 || rho >= 1) throw new Error(`local_reinvest_rate out of range [0,1): ${rho}`);
  const r = asDec(raw.discount_rate), N = raw.years, g = asDec(raw.foreign_growth ?? 0);
  const w = asDec(raw.withholding_rate), h = asDec(raw.home_tax_rate), fc = asDec(raw.foreign_build.tax_rate);

  const baseFcff = fcffFromBuild(raw.foreign_build), basePbit = raw.foreign_build.pbit;
  const fx_curve = buildForwardCurve(raw.base_spot, raw.basis, raw.rate_home, raw.rate_foreign, N);
  const home_outlay = raw.initial_outlay_foreign / raw.base_spot;

  const years: IntlYear[] = [];
  let npv = -home_outlay;
  let blocked_release_foreign = 0, blocked_tp_total = 0;
  for (let t = 1; t <= N; t++) {
    const fx = fx_curve[t - 1];
    const scale = Math.pow(1 + g, t - 1);
    const foreign_cf = baseFcff * scale, taxable_profit = basePbit * scale;
    // FREE share: taxed and remitted this year (differential on its share of taxable profit)
    const free_fcff = foreign_cf * (1 - b), free_tp = taxable_profit * (1 - b);
    const tax = computeYearTax(free_fcff, free_tp, w, h, fc, raw.wht_creditable);
    const home_cf = tax.net_remit_foreign / fx;
    const d = discountFactor(r, t);
    const pv = home_cf * d;
    npv += pv;
    years.push({ year: t, fx, foreign_cf: free_fcff, taxable_profit: free_tp, wht: tax.wht, foreign_corp_tax: tax.foreign_corp_tax, home_liability: tax.home_liability, additional_home_tax_foreign: tax.additional_home_tax_foreign, additional_home_tax_home: tax.additional_home_tax_foreign / fx, foreign_remit_net: tax.net_remit_foreign, home_cf, df: d, pv });
    // BLOCKED share: accumulates locally to year N; its taxable profit is deferred to release
    blocked_release_foreign += foreign_cf * b * Math.pow(1 + rho, N - t);
    blocked_tp_total += taxable_profit * b;
  }
  const fxN = fx_curve[N - 1];
  const release_tax = computeYearTax(blocked_release_foreign, blocked_tp_total, w, h, fc, raw.wht_creditable);
  const home_cf_release = release_tax.net_remit_foreign / fxN;
  const pv_release = home_cf_release * discountFactor(r, N);
  npv += pv_release;

  const has_additional_home_tax = years.some((y) => y.additional_home_tax_foreign > EPS) || release_tax.additional_home_tax_foreign > EPS;
  // the freely-remitted counterfactual (no blocking): every year's whole cash remitted when earned
  const free = computeIntlNpv(raw);
  return {
    years, fx_curve, home_outlay, base_fcff_foreign: baseFcff, has_additional_home_tax, add_tax_rate_effective: Math.max(0, h - fc),
    blocked_release_foreign, blocked_tp_total, release_tax, home_cf_release,
    npv, accept: npv > 0,
    npv_if_free: free.npv, npv_cost_of_blocking: npv - free.npv,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K4 — multinational_dividend_capacity (A6a). Parent dividend capacity = the parent's own FCFE
// + the overseas subsidiary's remitted FCFE (net of withholding + credit-method double-tax,
// converted at the forecast spot). Reuses computeDividendCapacity (batch #9) for the subsidiary.
// Code owns the total capacity, the surplus vs the proposed dividend, and the sustainability verdict.
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IntlDividendInputs extends FiscalInputs {
  home_currency: string; foreign_currency: string;
  forecast_spot: number;             // the spot at the remittance date, foreign per home (DERIVED, passed in)
  basis: ParityBasis;                // basis stated in the scenario (for the parity gate on forecast_spot)
  base_spot: number; rate_home: number; rate_foreign: number; remittance_year: number; // to re-derive forecast_spot
  // subsidiary (foreign) FCFE build:
  sub_build: FcffBuild; sub_kd: number; sub_debt: number; sub_net_borrowing?: number;
  remit_fraction: number;            // share of the subsidiary's FCFE remitted this year (timing of central remittances)
  // parent (home) dividend capacity, already in HOME currency:
  parent_fcfe: number;
  proposed_dividend: number;         // the group's proposed TOTAL dividend under test (HOME currency)
}
export interface IntlDividendComputed {
  sub_fcfe_foreign: number;          // subsidiary FCFE (foreign)
  sub_remit_foreign: number;         // fraction remitted (foreign, pre-tax)
  remit_tp_foreign: number;          // taxable profit attributable to the remitted portion (PBIT × remit%)
  remit_tax: YearTax;                // WHT + differential on the remittance
  sub_remit_home: number;            // remitted, net of double-tax, converted to HOME
  parent_fcfe: number;
  total_capacity: number;            // parent + remitted subsidiary (HOME)
  proposed_dividend: number; capacity_surplus: number; sustainable: boolean;
  has_additional_home_tax: boolean; add_tax_rate_effective: number; forecast_spot: number;
}
export function computeIntlDividend(raw: IntlDividendInputs): IntlDividendComputed {
  finiteGuard(raw as unknown as Record<string, unknown>, 'IntlDividend');
  const w = asDec(raw.withholding_rate), h = asDec(raw.home_tax_rate), fc = asDec(raw.sub_build.tax_rate);
  const rf = raw.remit_fraction;
  if (!(rf > 0 && rf <= 1)) throw new Error(`remit_fraction out of range (0,1]: ${rf}`);
  if (!(raw.forecast_spot > 0)) throw new Error(`forecast_spot must be positive`);
  if (!(raw.parent_fcfe > 0)) throw new Error(`parent_fcfe must be positive`);
  if (!(raw.proposed_dividend > 0)) throw new Error(`proposed_dividend must be positive`);

  // subsidiary FCFE via the batch-#9 dividend-capacity engine (foreign currency)
  const sub = computeDividendCapacity({
    ...raw.sub_build, kd: raw.sub_kd, debt_value: raw.sub_debt,
    net_borrowing: raw.sub_net_borrowing ?? 0, proposed_dividend: 1, // proposed unused here; capacity = FCFE
  });
  const sub_fcfe_foreign = sub.fcfe;
  const sub_remit_foreign = sub_fcfe_foreign * rf;                    // remitted cash (foreign, pre-tax)
  const remit_tp_foreign = raw.sub_build.pbit * rf;                  // taxable profit behind the remitted portion
  const remit_tax = computeYearTax(sub_remit_foreign, remit_tp_foreign, w, h, fc, raw.wht_creditable);
  const sub_remit_home = remit_tax.net_remit_foreign / raw.forecast_spot;
  const total_capacity = raw.parent_fcfe + sub_remit_home;
  const capacity_surplus = total_capacity - raw.proposed_dividend;
  return {
    sub_fcfe_foreign, sub_remit_foreign, remit_tp_foreign, remit_tax, sub_remit_home,
    parent_fcfe: raw.parent_fcfe, total_capacity, proposed_dividend: raw.proposed_dividend,
    capacity_surplus, sustainable: total_capacity >= raw.proposed_dividend,
    has_additional_home_tax: remit_tax.additional_home_tax_foreign > EPS, add_tax_rate_effective: Math.max(0, h - fc), forecast_spot: raw.forecast_spot,
  };
}

function finiteGuard(raw: Record<string, unknown>, ctx: string): void {
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${ctx} input "${k}" is not finite: ${JSON.stringify(v)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE THREE NEW GATE CORES (Step-0 §3, ruled). Delegated to by validate-schema.ts wrappers
// (validateParityConsistency / validateCurrencyScale / validateDoubleTaxCap) and run in the
// generator's runQuantitativeGates for international-family drills only.
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IntlCheck { ok: boolean; reason?: string }

// GATE 12 — PARITY CONSISTENCY. Every forecast spot must reconcile to the parity formula from the
// drill's STATED basis + base spot + rate differential (never asserted). Validates against the
// basis the drill declares — not one hard-coded formula (Grant ruling).
export function checkParityConsistency(
  fx_curve: number[], base_spot: number, basis: ParityBasis, rate_home: number, rate_foreign: number,
): IntlCheck {
  const k = parityDifferential(basis, rate_home, rate_foreign);
  for (let t = 1; t <= fx_curve.length; t++) {
    const expected = base_spot * Math.pow(k, t);
    const got = fx_curve[t - 1];
    if (Math.abs(got - expected) > Math.abs(expected) * 0.001 + EPS) {
      return { ok: false, reason: `forecast spot year ${t} = ${fmt4(got)} does not reconcile to ${basis.toUpperCase()} parity (expected ${fmt4(expected)} = ${fmt4(base_spot)}·${k.toFixed(5)}^${t}) — a forward must derive from stated inputs, never be asserted` };
    }
  }
  return { ok: true };
}

// GATE 13 — CURRENCY / UNIT-SCALE INTEGRITY. Every figure that crosses a currency boundary must
// reconcile: home_cf · fx == foreign_remit_net, at a consistent scale (no ×1000 slip). Motivated
// by the IDR rendering history + the duration unit-scale guard.
export function checkCurrencyScale(years: { fx: number; foreign_remit_net: number; home_cf: number }[]): IntlCheck {
  for (const y of years) {
    const back = y.home_cf * y.fx;
    if (Math.abs(back - y.foreign_remit_net) > Math.abs(y.foreign_remit_net) * 0.001 + EPS) {
      return { ok: false, reason: `currency-scale mismatch: home ${fmt1(y.home_cf)} × spot ${fmt4(y.fx)} = ${fmt1(back)} ≠ the foreign remittance ${fmt1(y.foreign_remit_net)} — a cross-currency conversion or a unit scale (thousands vs millions) is inconsistent` };
    }
  }
  return { ok: true };
}

// GATE 14 — DOUBLE-TAX CAP (differential credit base). The additional home tax each period must equal
// the credit-method residual on the TAXABLE PROFIT — max(0, home_liability − foreign_corp_tax [− WHT
// if the treaty makes it creditable]) — must be ≥ 0 (never a refund of excess foreign tax), and must
// never exceed the home liability on that profit. Validates the NEW rule (Fix Round 1). Each period:
//   { taxable_profit, fcff (the remitted base for WHT), additional_home_tax_foreign }.
export function checkDoubleTaxCap(withholding: number, homeTax: number, foreignCorp: number, whtCreditable: boolean, periods: { taxable_profit: number; fcff: number; additional_home_tax_foreign: number }[]): IntlCheck {
  const w = asDec(withholding), h = asDec(homeTax), fc = asDec(foreignCorp);
  for (let i = 0; i < periods.length; i++) {
    const p = periods[i];
    const homeLiab = h * p.taxable_profit;
    const wht = w * p.fcff;
    const expected = whtCreditable ? Math.max(0, homeLiab - fc * p.taxable_profit - wht) : Math.max(0, (h - fc) * p.taxable_profit);
    if (Math.abs(p.additional_home_tax_foreign - expected) > Math.abs(expected) * 0.001 + 1e-6) {
      return { ok: false, reason: `additional home tax in period ${i + 1} = ${fmt1(p.additional_home_tax_foreign)} ≠ the credit-method residual ${fmt1(expected)} (home liab ${fmt1(homeLiab)} − foreign corp ${fmt1(fc * p.taxable_profit)}${whtCreditable ? ` − WHT ${fmt1(wht)}` : ''}, floored at 0)` };
    }
    if (p.additional_home_tax_foreign < -EPS) {
      return { ok: false, reason: `additional home tax in period ${i + 1} is negative (${fmt1(p.additional_home_tax_foreign)}) — the credit method never refunds excess foreign tax` };
    }
    if (p.additional_home_tax_foreign > homeLiab + Math.abs(homeLiab) * 0.001 + 1e-6) {
      return { ok: false, reason: `additional home tax in period ${i + 1} = ${fmt1(p.additional_home_tax_foreign)} exceeds the home liability ${fmt1(homeLiab)} — the credit cannot make the tax larger than the home charge` };
    }
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// SCHEMAS (graded chains — code owns every figure; OFR carries)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface SerializedComponent {
  component_id: string; label?: string; expected_value: number; unit?: string; tolerance: Tolerance;
  working_steps?: string[]; depends_on?: string[]; recompute?: string; weight?: number;
}
export interface SerializedSchema { components: SerializedComponent[]; params: Record<string, ParamValue>; }
function toSerialized(components: Component[], recomputeIds: Record<string, string | undefined>, params: Record<string, ParamValue>): SerializedSchema {
  return {
    components: components.map((comp) => {
      const s: SerializedComponent = {
        component_id: comp.component_id, label: comp.label, expected_value: comp.expected_value,
        unit: comp.unit, tolerance: comp.tolerance, working_steps: comp.working_steps,
        depends_on: comp.depends_on, weight: comp.weight,
      };
      const rid = recomputeIds[comp.component_id];
      if (rid) s.recompute = rid;
      return s;
    }),
    params,
  };
}

// Build the FX-curve graded components (fx_1 root; fx_t = fx_{t-1} × k). Returns the component list
// (in topological order) and the differential k for the recompute closures.
function fxComponents(prefix: string, fx_curve: number[], k: number, foreign: string, home: string): Component[] {
  const unit = fxUnit(foreign, home);
  const comps: Component[] = [];
  fx_curve.forEach((fx, i) => {
    const t = i + 1;
    if (t === 1) {
      comps.push({ component_id: `${prefix}fx_1`, label: `Forecast spot, year 1 (${unit})`, expected_value: fx, unit, tolerance: rel(0.5),
        working_steps: [`S₁ = S₀ × (1+r_f)/(1+r_h) = ${fmt4(fx_curve[0] / k)} × ${fixedHalfUp(k, 5)} = ${fmt4(fx)}`] });
    } else {
      const prev = `${prefix}fx_${t - 1}`;
      comps.push({ component_id: `${prefix}fx_${t}`, label: `Forecast spot, year ${t} (${unit})`, expected_value: fx, unit, tolerance: rel(0.5),
        depends_on: [prev], recompute: (d) => d[prev] * k,
        working_steps: [`S${t} = S${t - 1} × ${fixedHalfUp(k, 5)} = ${fmt4(fx)}`] });
    }
  });
  return comps;
}

// ── K1 schema: fx curve → [additional home tax_t (when non-nil)] → home_cf_t → npv ──
// The additional home tax is its OWN component when the differential bites (home > foreign corp); when
// it is NIL (foreign corp ≥ home, the K1 case) no per-year tax component is emitted — the teaching is
// in the prose (WHY it is nil), and home_cf converts the remittance net of WHT only.
export function buildIntlNpvSchema(raw: IntlNpvInputs, c: IntlNpvComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const home = raw.home_currency, foreign = raw.foreign_currency, homeUnit = `${home}m`;
  const r = asDec(raw.discount_rate);
  const k = parityDifferential(raw.basis, raw.rate_home, raw.rate_foreign);
  const comps: Component[] = [...fxComponents('', c.fx_curve, k, foreign, home)];
  const taxed = c.has_additional_home_tax;

  for (const y of c.years) {
    const remitPreAddTax = y.foreign_cf - y.wht;    // foreign remittance net of WHT (before the differential home tax)
    if (taxed) {
      // the additional home tax is the FOREIGN figure shown in the Step-2 table (differential on the
      // taxable profit) — a ROOT (its inputs are the stated rates + taxable profit, not graded edges);
      // home_cf nets it and the WHT, then converts at the forecast spot, carrying OFR from both roots.
      comps.push({
        component_id: `add_tax_${y.year}`, label: `Additional home tax, year ${y.year} (foreign, on taxable profit)`,
        expected_value: y.additional_home_tax_foreign, unit: `${foreign}m`, tolerance: moneyTol,
        working_steps: [`= max(0, home liability − foreign corporate tax${raw.wht_creditable ? ' − withholding' : ''}) on the year's taxable profit`],
      });
      comps.push({
        component_id: `home_cf_${y.year}`, label: `Home-currency net cash flow, year ${y.year}`,
        expected_value: y.home_cf, unit: homeUnit, tolerance: moneyTol,
        depends_on: [`fx_${y.year}`, `add_tax_${y.year}`], recompute: (d) => (remitPreAddTax - d[`add_tax_${y.year}`]) / d[`fx_${y.year}`],
        working_steps: [`= (remittance net of WHT ${fmt1(remitPreAddTax)} − additional home tax ${fmt1(y.additional_home_tax_foreign)}) ÷ spot ${fmt4(y.fx)}`],
      });
    } else {
      comps.push({
        component_id: `home_cf_${y.year}`, label: `Home-currency net cash flow, year ${y.year}`,
        expected_value: y.home_cf, unit: homeUnit, tolerance: moneyTol,
        depends_on: [`fx_${y.year}`], recompute: (d) => y.foreign_remit_net / d[`fx_${y.year}`],
        working_steps: [`= foreign remittance ${fmt1(y.foreign_remit_net)} (net of WHT; no additional home tax) ÷ spot ${fmt4(y.fx)}`],
      });
    }
  }
  const homeIds = c.years.map((y) => `home_cf_${y.year}`);
  const dfById: Record<string, number> = {};
  for (const y of c.years) dfById[`home_cf_${y.year}`] = y.df;
  comps.push({
    component_id: 'npv', label: 'Net present value (to the parent, home currency)',
    expected_value: c.npv, unit: homeUnit, tolerance: moneyTol,
    depends_on: homeIds, recompute: (d) => homeIds.reduce((s, id) => s + d[id] * dfById[id], 0) - c.home_outlay,
    working_steps: [`= Σ (home cash flow × DF @ ${pct2(r)}) − home outlay ${fmt1(c.home_outlay)}`],
  });

  const recomputeIds: Record<string, string | undefined> = { npv: 'intl_npv_sum_less_outlay' };
  for (const y of c.years) { recomputeIds[`home_cf_${y.year}`] = `home_cf_convert_y${y.year}`; if (taxed) recomputeIds[`add_tax_${y.year}`] = `add_tax_convert_y${y.year}`; }
  for (let t = 2; t <= c.years.length; t++) recomputeIds[`fx_${t}`] = `parity_step_y${t}`;
  // `parity_basis` is the family's own ppp/irp discriminant, carried for provenance so the
  // registry can call parityDifferential() with the same argument the builder used.
  // `remit_net_t` flattens the per-year foreign remittance `home_cf_convert_yN` divides by —
  // a genuine per-year INPUT that lives nowhere else in the stored row. The npv step needs no
  // stored discount factors: `y.df` is `discountFactor(r, t)`, recomputed from `discount_rate`
  // and the year parsed off the component id.
  const params: Record<string, ParamValue> = { discount_rate: r, base_spot: raw.base_spot, rate_home: asDec(raw.rate_home), rate_foreign: asDec(raw.rate_foreign), home_outlay: c.home_outlay, add_tax_rate_effective: c.add_tax_rate_effective, parity_basis: raw.basis };
  for (const y of c.years) params[`remit_net_${y.year}`] = y.foreign_remit_net;
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}

// ── K2 schema: base FX chain → base NPV, alt FX chain → alt NPV (two independent FX roots → two
//    NPV terminals). The NPV depends directly on its FX curve; the per-year conversion is folded
//    into the NPV recompute (the marked crux for B5a is the two FX paths and the two NPVs). ──
export function buildIntlSensitivitySchema(raw: IntlSensitivityInputs, c: IntlSensitivityComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const home = raw.home_currency, foreign = raw.foreign_currency, homeUnit = `${home}m`;
  const r = asDec(raw.discount_rate);
  const kBase = parityDifferential(raw.basis, raw.rate_home, raw.rate_foreign);
  const kAlt = parityDifferential(raw.basis, raw.rate_home, raw.alt_rate_foreign);
  const comps: Component[] = [];

  const addChain = (prefix: string, comp: IntlNpvComputed, k: number) => {
    comps.push(...fxComponents(prefix, comp.fx_curve, k, foreign, home));
    const fxIds = comp.years.map((y) => `${prefix}fx_${y.year}`);
    // constants per year for the NPV recompute: foreign remittance (net of tax) and the discount factor
    const remit: Record<string, number> = {}, dfBy: Record<string, number> = {};
    for (const y of comp.years) { remit[`${prefix}fx_${y.year}`] = y.foreign_remit_net; dfBy[`${prefix}fx_${y.year}`] = y.df; }
    comps.push({
      component_id: `${prefix}npv`, label: `NPV under the ${prefix === 'alt_' ? 'alternative' : 'base'} exchange-rate assumption`,
      expected_value: comp.npv, unit: homeUnit, tolerance: moneyTol,
      depends_on: fxIds, recompute: (d) => fxIds.reduce((s, id) => s + (remit[id] / d[id]) * dfBy[id], 0) - comp.home_outlay,
      working_steps: [`= Σ (foreign remittance ÷ forecast spot × DF @ ${pct2(r)}) − home outlay ${fmt1(comp.home_outlay)}`],
    });
  };
  addChain('', c.base, kBase);
  addChain('alt_', c.alt, kAlt);

  const recomputeIds: Record<string, string | undefined> = { npv: 'intl_npv_from_fx', alt_npv: 'intl_npv_from_fx' };
  for (let t = 2; t <= c.base.years.length; t++) { recomputeIds[`fx_${t}`] = `parity_step_y${t}`; recomputeIds[`alt_fx_${t}`] = `parity_step_y${t}`; }
  const params = { discount_rate: r, base_spot: raw.base_spot, rate_home: asDec(raw.rate_home), rate_foreign: asDec(raw.rate_foreign), alt_rate_foreign: asDec(raw.alt_rate_foreign), home_outlay: c.base.home_outlay, add_tax_rate_effective: c.base.add_tax_rate_effective };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}

// ── K3 schema: fx curve → free home_cf_t → blocked_release (root) → home_cf_release → npv ──
export function buildIntlRemittanceSchema(raw: IntlRemittanceInputs, c: IntlRemittanceComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const home = raw.home_currency, foreign = raw.foreign_currency, homeUnit = `${home}m`, foreignUnit = `${foreign}m`;
  const r = asDec(raw.discount_rate), N = raw.years;
  const w = asDec(raw.withholding_rate), h = asDec(raw.home_tax_rate), fc = asDec(raw.foreign_build.tax_rate);
  const blockedTp = c.blocked_tp_total, creditable = raw.wht_creditable;
  const k = parityDifferential(raw.basis, raw.rate_home, raw.rate_foreign);
  const comps: Component[] = [...fxComponents('', c.fx_curve, k, foreign, home)];
  // label the deduction by the ACTUAL tax branch (Fix Round 2 item 4): only name "differential home
  // tax" when it is actually charged; when nil, say so rather than implying a deduction that is zero.
  const taxNote = c.has_additional_home_tax ? 'net of WHT + differential home tax' : 'net of WHT (differential home tax nil)';

  for (const y of c.years) {
    const remitForeign = y.foreign_remit_net;
    comps.push({
      component_id: `home_cf_${y.year}`, label: `Home cash flow from the remitted (free) portion, year ${y.year}`,
      expected_value: y.home_cf, unit: homeUnit, tolerance: moneyTol,
      depends_on: [`fx_${y.year}`], recompute: (d) => remitForeign / d[`fx_${y.year}`],
      working_steps: [`= free remittance ${fmt1(remitForeign)} (${taxNote}) ÷ spot ${fmt4(y.fx)}`],
    });
  }
  // blocked funds accumulate at the LOCAL rate to year N — a root (its inputs are stated params)
  comps.push({
    component_id: 'blocked_release', label: `Blocked funds released in year ${N} (foreign, accumulated locally)`,
    expected_value: c.blocked_release_foreign, unit: foreignUnit, tolerance: moneyTol,
    working_steps: [`Σ blocked cash × (1 + local rate)^(${N} − t) accumulated to year ${N}`],
  });
  // release net of WHT + the deferred differential home tax on the blocked taxable profit, converted
  comps.push({
    component_id: 'home_cf_release', label: `Home cash flow from the released blocked funds, year ${N}`,
    expected_value: c.home_cf_release, unit: homeUnit, tolerance: moneyTol,
    depends_on: ['blocked_release', `fx_${N}`],
    recompute: (d) => {
      const rel = d.blocked_release, wht = w * rel;
      const add = creditable ? Math.max(0, h * blockedTp - fc * blockedTp - wht) : Math.max(0, (h - fc) * blockedTp);
      return (rel - wht - add) / d[`fx_${N}`];
    },
    working_steps: [`= (released ${fmt1(c.blocked_release_foreign)} − WHT − deferred differential tax) ÷ spot ${fmt4(c.fx_curve[N - 1])}`],
  });
  const homeIds = c.years.map((y) => `home_cf_${y.year}`);
  const dfById: Record<string, number> = {};
  for (const y of c.years) dfById[`home_cf_${y.year}`] = y.df;
  const dfN = discountFactor(r, N);
  comps.push({
    component_id: 'npv', label: 'Net present value with the remittance restriction (home currency)',
    expected_value: c.npv, unit: homeUnit, tolerance: moneyTol,
    depends_on: [...homeIds, 'home_cf_release'],
    recompute: (d) => homeIds.reduce((s, id) => s + d[id] * dfById[id], 0) + d.home_cf_release * dfN - c.home_outlay,
    working_steps: [`= Σ (free home cash flow × DF) + released home cash × DF @ year ${N} − home outlay ${fmt1(c.home_outlay)}`],
  });

  const recomputeIds: Record<string, string | undefined> = { npv: 'intl_remit_npv', home_cf_release: 'home_cf_release_convert' };
  for (const y of c.years) recomputeIds[`home_cf_${y.year}`] = `home_cf_convert_y${y.year}`;
  for (let t = 2; t <= N; t++) recomputeIds[`fx_${t}`] = `parity_step_y${t}`;
  const params = { discount_rate: r, base_spot: raw.base_spot, rate_home: asDec(raw.rate_home), rate_foreign: asDec(raw.rate_foreign), blocked_fraction: raw.blocked_fraction, local_reinvest_rate: asDec(raw.local_reinvest_rate), home_outlay: c.home_outlay, add_tax_rate_effective: c.add_tax_rate_effective };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}

// ── K4 schema: sub_fcfe (root) → sub_remit_home (dep on sub_fcfe) → total_capacity (dep) → surplus ──
export function buildIntlDividendSchema(raw: IntlDividendInputs, c: IntlDividendComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const home = raw.home_currency, foreign = raw.foreign_currency, homeUnit = `${home}m`, foreignUnit = `${foreign}m`;
  const S = raw.forecast_spot, rf = raw.remit_fraction;
  const w = asDec(raw.withholding_rate), h = asDec(raw.home_tax_rate), fc = asDec(raw.sub_build.tax_rate);
  const remitTp = c.remit_tp_foreign, creditable = raw.wht_creditable;
  // parent_fcfe is a graded ROOT (a figure the answer states and sums), so total_capacity depends on
  // BOTH the subsidiary chain and the parent figure — the seeded-OFR proof then carries even when the
  // parent contribution dominates (perturbing either root moves total_capacity out of tolerance).
  const comps: Component[] = [
    { component_id: 'sub_fcfe', label: 'Subsidiary free cash flow to equity (foreign)', expected_value: c.sub_fcfe_foreign, unit: foreignUnit, tolerance: moneyTol,
      working_steps: [`FCFE = FCFF − Kd·D(1−t) + net new borrowing (subsidiary, foreign)`] },
    { component_id: 'sub_remit_home', label: 'Subsidiary remittance received by the parent (home, net of WHT + differential home tax)', expected_value: c.sub_remit_home, unit: homeUnit, tolerance: moneyTol,
      depends_on: ['sub_fcfe'],
      recompute: (d) => {
        const remit = d.sub_fcfe * rf, wht = w * remit;
        const add = creditable ? Math.max(0, h * remitTp - fc * remitTp - wht) : Math.max(0, (h - fc) * remitTp);
        return (remit - wht - add) / S;
      },
      working_steps: [`= (FCFE ${fmt1(c.sub_fcfe_foreign)} × remitted ${fixedHalfUp(rf * 100, 0)}% − WHT − differential home tax) ÷ spot ${fmt4(S)}`] },
    { component_id: 'parent_fcfe', label: 'Parent free cash flow to equity (home currency)', expected_value: raw.parent_fcfe, unit: homeUnit, tolerance: moneyTol,
      working_steps: [`the parent's own dividend capacity (home currency)`] },
    { component_id: 'total_capacity', label: 'Group dividend capacity (home currency)', expected_value: c.total_capacity, unit: homeUnit, tolerance: moneyTol,
      depends_on: ['sub_remit_home', 'parent_fcfe'], recompute: (d) => d.sub_remit_home + d.parent_fcfe,
      working_steps: [`= parent FCFE ${fmt1(raw.parent_fcfe)} + remitted subsidiary FCFE`] },
    { component_id: 'capacity_surplus', label: 'Capacity surplus over the proposed dividend (signed)', expected_value: c.capacity_surplus, unit: homeUnit, tolerance: moneyTol,
      depends_on: ['total_capacity'], recompute: (d) => d.total_capacity - raw.proposed_dividend,
      working_steps: [`= dividend capacity − proposed dividend ${fmt1(raw.proposed_dividend)}`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { sub_remit_home: 'sub_remit_convert', total_capacity: 'capacity_add_parent', capacity_surplus: 'capacity_minus_proposed' };
  const params = { forecast_spot: S, remit_fraction: rf, parent_fcfe: raw.parent_fcfe, proposed_dividend: raw.proposed_dividend, add_tax_rate_effective: c.add_tax_rate_effective };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// MODEL ANSWERS — code authors every figure + every figure-vs-figure verdict; prose is glue.
// ═══════════════════════════════════════════════════════════════════════════════════════
// The THREE tax branches (Fix Round 2, 2026-07-17). The nil case has TWO distinct causes and they
// must be told apart with the TRUE inequality direction — never a false "foreign ≥ home" or a false
// max():  (a) nil_corporate — foreign corporate rate ≥ home, so the corporate credit alone covers the
// whole home liability;  (b) nil_wht_credit — home > foreign corporate (a positive residual), but the
// creditable withholding covers the residual so the additional tax nets to nil;  (c) charged — a
// positive residual survives and is charged per year.
export type TaxBranch = 'nil_corporate' | 'nil_wht_credit' | 'charged';
export function taxBranch(foreignCorp: number, homeTax: number, addRateEffective: number, hasAddTax: boolean): TaxBranch {
  if (addRateEffective <= 1e-9) return 'nil_corporate';       // home ≤ foreign corporate
  return hasAddTax ? 'charged' : 'nil_wht_credit';            // home > foreign corporate
}
// chargedBase names the base the charged differential bites on. It defaults to the full foreign
// taxable profit (K1/K2 remit the whole year's profit); the dividend kind (K4) remits only a
// FRACTION, so it passes "the remitted share of the foreign taxable profit" (Fix Round 3 item 2).
function fiscalAssumptionLine(raw: FiscalInputs, foreignCorp: number, hasAddTax: boolean, addRate: number, chargedBase = 'the foreign taxable profit'): string {
  const w = asDec(raw.withholding_rate), h = asDec(raw.home_tax_rate), fc = asDec(foreignCorp);
  const branch = taxBranch(fc, h, addRate, hasAddTax);
  if (branch === 'nil_corporate') {
    // (a) foreign corporate ≥ home. The WHT credit has NOTHING to offset (no residual home liability),
    // so the withholding is a NET COST regardless of treaty creditability (Fix Round 2 item 3).
    return `The foreign corporate tax rate ${pct2(fc)} is **at or above** the parent's ${pct2(h)} home rate, so the credit for foreign corporate tax already covers the whole home liability and there is **no additional home tax** (max(0, ${pct2(h)} − ${pct2(fc)}) = 0). The ${pct2(w)} withholding on remittances is therefore a **net cost** — with no residual home liability, the treaty's creditability gives it no relief.`;
  }
  if (branch === 'nil_wht_credit') {
    // (b) home > foreign corporate, but the creditable WHT covers the residual → nets to nil.
    return `The parent's ${pct2(h)} home rate **exceeds** the foreign corporate rate ${pct2(fc)}, a residual differential of ${pct2(Math.max(0, h - fc))} on taxable profit; but the **creditable** ${pct2(w)} withholding covers that residual, so the additional home tax **nets to nil** (max(0, home liability − foreign corporate tax − withholding) = 0).`;
  }
  // (c) charged: positive residual survives after the credits, shown per year.
  return `The parent's ${pct2(h)} home rate **exceeds** the foreign corporate rate ${pct2(fc)} by ${pct2(Math.max(0, h - fc))}, so an additional home tax is **charged** on ${chargedBase} — max(0, home ${pct2(h)} − foreign corporate ${pct2(fc)}${raw.wht_creditable ? ` − creditable withholding ${pct2(w)}` : ''}), shown per year${raw.wht_creditable ? '' : `; the ${pct2(w)} withholding is a separate cost`}.`;
}

// GATE-14 sub-check: the tax PROSE must match the params (Fix Round 2 item 1). The stated branch must
// agree with add_tax_rate_effective and the TRUE rate ordering, and the model answer must never assert
// a false inequality or a false max(). Runs on the assumption line the code generates (a regression guard).
export function checkTaxProse(foreignCorp: number, homeTax: number, addRateEffective: number, hasAddTax: boolean, modelAnswer: string): IntlCheck {
  const fc = asDec(foreignCorp), h = asDec(homeTax);
  const homeGt = h > fc + 1e-9;                               // TRUE ordering: home > foreign corporate
  const branch = taxBranch(fc, h, addRateEffective, hasAddTax);
  const claimsForeignGe = /foreign corporate tax rate [\d.]+% is \*\*at or above\*\*/i.test(modelAnswer);
  const claimsHomeGt = /home rate [\d.]+% \*\*exceeds\*\* the foreign corporate rate/i.test(modelAnswer);
  if (homeGt && claimsForeignGe) return { ok: false, reason: `false inequality: home ${pct2(h)} > foreign corporate ${pct2(fc)}, but the model answer states the foreign corporate rate is "at or above" the home rate` };
  if (!homeGt && claimsHomeGt) return { ok: false, reason: `false inequality: home ${pct2(h)} ≤ foreign corporate ${pct2(fc)}, but the model answer states the home rate "exceeds" the foreign corporate rate` };
  // Fix Round 3 close-out: the same false inequality can hide in a STEP working / nil parenthetical
  // ("no additional home tax — foreign corporate rate ≥ home rate") rather than the bold assumption
  // line. Catch it ANYWHERE in the body: a nil cause that asserts foreign corporate ≥ / at-or-above
  // home while home actually exceeds the foreign corporate rate (the (b) nil case mislabelled as (a)).
  const claimsForeignGeBody = /foreign corporate rate\b[^\n]{0,60}?(≥|at or above)[^\n]{0,25}?home rate/i.test(modelAnswer);
  if (homeGt && claimsForeignGeBody) return { ok: false, reason: `false inequality in the answer body: home ${pct2(h)} > foreign corporate ${pct2(fc)}, but a step/nil note states the foreign corporate rate is at or above the home rate (the residual is covered by the creditable withholding — that is the (b) nil cause, not (a))` };
  // a false max(0, home − foreign) = 0 when home actually exceeds foreign corporate
  if (homeGt && new RegExp(`max\\(0, ${pct2(h).replace('.', '\\.')} − ${pct2(fc).replace('.', '\\.')}\\) = 0`).test(modelAnswer))
    return { ok: false, reason: `false max(): the answer writes max(0, ${pct2(h)} − ${pct2(fc)}) = 0, but home exceeds foreign corporate so the differential is positive` };
  // branch ↔ charged-language consistency
  const saysCharged = /is \*\*charged\*\*/i.test(modelAnswer);
  if (branch === 'charged' && !saysCharged) return { ok: false, reason: 'positive residual (charged branch) but the model answer does not state the additional tax is charged' };
  if (branch !== 'charged' && saysCharged) return { ok: false, reason: `nil branch (${branch}) but the model answer states the tax is charged` };
  return { ok: true };
}
function fxTable(fx_curve: number[], foreign: string, home: string, basis: ParityBasis): string[] {
  const lines = [`| Year | Forecast spot (${foreign}/${home}) |`, `|------|------|`];
  fx_curve.forEach((fx, i) => lines.push(`| ${i + 1} | ${fmt4(fx)} |`));
  lines.push('', `*Forecast spots derived by ${basis === 'ppp' ? 'purchasing-power parity (relative inflation)' : 'interest-rate parity (relative interest rates)'}: Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*`);
  return lines;
}

export function buildIntlNpvModelAnswer(raw: IntlNpvInputs, c: IntlNpvComputed, prose: string): string {
  const home = raw.home_currency, foreign = raw.foreign_currency;
  const mH = (n: number) => money(home, n), mF = (n: number) => money(foreign, n);
  const r = asDec(raw.discount_rate);
  const lines: string[] = [
    '**International investment appraisal — net present value to the parent**', '',
    `**Assumptions:** project cash flows arise in ${foreign}; the maintainable base-year foreign free cash flow is ${mF(c.base_fcff_foreign)}${(raw.foreign_growth ?? 0) > 0 ? ` growing at ${pct2(asDec(raw.foreign_growth ?? 0))} a year` : ''} on a taxable profit (PBIT) base of ${mF(c.base_pbit_foreign)}; forecast spot rates are derived by ${raw.basis.toUpperCase()} parity from the stated base spot ${fmt4(raw.base_spot)} ${foreign}/${home}; converted cash flows are discounted at the parent's ${pct2(r)} money cost of capital. ${fiscalAssumptionLine(raw, raw.foreign_build.tax_rate, c.has_additional_home_tax, c.add_tax_rate_effective)}`, '',
    '**Step 1 — Forecast exchange rates (parity, never assumed)**', '',
    ...fxTable(c.fx_curve, foreign, home, raw.basis), '',
    '**Step 2 — Foreign cash flows, tax, remittance, and conversion**', '',
    `| Year | Foreign FCFF | Withholding | Additional home tax | Net remitted (${foreign}) | Spot | Home cash flow |`, `|------|------|------|------|------|------|------|`,
  ];
  for (const y of c.years) lines.push(`| ${y.year} | ${mF(y.foreign_cf)} | ${mF(y.wht)} | ${mF(y.additional_home_tax_foreign)} | ${mF(y.foreign_remit_net)} | ${fmt4(y.fx)} | ${mH(y.home_cf)} |`);
  const npvBranch = taxBranch(asDec(raw.foreign_build.tax_rate), asDec(raw.home_tax_rate), c.add_tax_rate_effective, c.has_additional_home_tax);
  lines.push('', c.has_additional_home_tax
    ? `*(Net remitted = foreign FCFF − withholding − the differential additional home tax; converted at that year's forecast spot.)*`
    : npvBranch === 'nil_corporate'
      ? `*(Additional home tax is **nil** every year: the foreign corporate rate ${pct2(asDec(raw.foreign_build.tax_rate))} is at or above the parent's ${pct2(asDec(raw.home_tax_rate))} home rate, so the foreign-tax credit already covers the whole home liability. Net remitted = foreign FCFF − withholding; converted at the forecast spot.)*`
      : `*(Additional home tax is **nil** every year: the residual differential (home ${pct2(asDec(raw.home_tax_rate))} − foreign corporate ${pct2(asDec(raw.foreign_build.tax_rate))}) is covered by the creditable withholding. Net remitted = foreign FCFF − withholding; converted at the forecast spot.)*`, '');
  lines.push('**Step 3 — Present values and NPV**', '', `| Year | Home cash flow | DF @ ${pct2(r)} | Present value |`, `|------|------|------|------|`);
  lines.push(`| 0 | ${mH(-c.home_outlay)} | 1.000 | ${mH(-c.home_outlay)} | *(foreign outlay ${mF(raw.initial_outlay_foreign)} ÷ ${fmt4(raw.base_spot)})*`);
  for (const y of c.years) lines.push(`| ${y.year} | ${mH(y.home_cf)} | ${fixedHalfUp(y.df, 3)} | ${mH(y.pv)} |`);
  lines.push('', `**NPV to the parent = ${mH(c.npv)}.**`, '');
  lines.push('**Step 4 — Decision**', '', c.accept
    ? `The NPV of ${mH(c.npv)} is **positive**, so on these exchange-rate and fiscal assumptions the project **adds value to the parent and should be accepted**.`
    : `The NPV of ${mH(c.npv)} is **negative**, so on these exchange-rate and fiscal assumptions the project **destroys value for the parent and should be rejected** as it stands.`, '');
  lines.push('**Step 5 — Advice to the board**', '', prose, '',
    `*Reconciliation: Σ present values ${mH(c.npv + c.home_outlay)} − home outlay ${mH(c.home_outlay)} = NPV ${mH(c.npv)} ✓*`);
  return lines.join('\n');
}

export function buildIntlSensitivityModelAnswer(raw: IntlSensitivityInputs, c: IntlSensitivityComputed, prose: string): string {
  const home = raw.home_currency, foreign = raw.foreign_currency, mH = (n: number) => money(home, n);
  const r = asDec(raw.discount_rate);
  const verdict = c.flips
    ? `the recommendation **FLIPS**: ${c.accept_base ? 'accept' : 'reject'} under the base assumption, ${c.accept_alt ? 'accept' : 'reject'} under ${raw.alt_label}. The decision is **not robust** to the exchange-rate assumption.`
    : `the recommendation does **not** change (${c.accept_base ? 'accept' : 'reject'} under both), though the NPV moves by ${mH(Math.abs(c.npv_swing))}. The decision is **robust** to this exchange-rate assumption over the range tested.`;
  return [
    '**Impact of alternative exchange-rate assumptions on project value**', '',
    `**Assumptions:** the project's ${foreign} cash flows are unchanged; only the forecast-FX path (the ${raw.basis.toUpperCase()}-parity foreign rate) differs between the base case and ${raw.alt_label}. Both NPVs are to the parent, discounted at ${pct2(r)}. ${fiscalAssumptionLine(raw, raw.foreign_build.tax_rate, c.base.has_additional_home_tax, c.base.add_tax_rate_effective)}`, '',
    '**Step 1 — Base exchange-rate assumption**', '',
    ...fxTable(c.base.fx_curve, foreign, home, raw.basis), '',
    `NPV under the base assumption = **${mH(c.npv_base)}** → ${c.accept_base ? 'accept' : 'reject'}.`, '',
    `**Step 2 — Alternative exchange-rate assumption (${raw.alt_label})**`, '',
    ...fxTable(c.alt.fx_curve, foreign, home, raw.basis), '',
    `NPV under the alternative assumption = **${mH(c.npv_alt)}** → ${c.accept_alt ? 'accept' : 'reject'}.`, '',
    '**Step 3 — Sensitivity of the decision**', '',
    `Moving from the base assumption to ${raw.alt_label} changes the NPV by **${mH(c.npv_swing)}** (from ${mH(c.npv_base)} to ${mH(c.npv_alt)}); ${verdict}`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: base NPV ${mH(c.npv_base)}, alternative NPV ${mH(c.npv_alt)}, swing ${mH(c.npv_swing)}; decision ${c.flips ? 'flips' : 'holds'} ✓*`,
  ].join('\n');
}

export function buildIntlRemittanceModelAnswer(raw: IntlRemittanceInputs, c: IntlRemittanceComputed, prose: string): string {
  const home = raw.home_currency, foreign = raw.foreign_currency, N = raw.years;
  const mH = (n: number) => money(home, n), mF = (n: number) => money(foreign, n);
  const r = asDec(raw.discount_rate);
  const blockedPct = fixedHalfUp(raw.blocked_fraction * 100, 0);
  const freePct = fixedHalfUp((1 - raw.blocked_fraction) * 100, 0);
  // explicit subtraction so the reader sees free NPV, restricted NPV, and the cost as DISTINCT roles
  // (they can share a magnitude — e.g. free 5.6 − restricted 2.8 = cost 2.8 — so the subtraction is shown)
  const costWord = c.npv_cost_of_blocking < 0
    ? `the restriction **reduces** the NPV: free-remittance NPV ${mH(c.npv_if_free)} − restricted NPV ${mH(c.npv)} = a cost of the restriction of **${mH(Math.abs(c.npv_cost_of_blocking))}**`
    : `the restriction **adds** value: restricted NPV ${mH(c.npv)} − free-remittance NPV ${mH(c.npv_if_free)} = **${mH(c.npv_cost_of_blocking)}**, because the local reinvestment rate exceeds the parent's discount rate`;
  return [
    '**International appraisal with a remittance restriction**', '',
    `**Assumptions:** ${fixedHalfUp(raw.blocked_fraction * 100, 0)}% of each year's ${foreign} cash flow is blocked from remittance and reinvested locally at ${pct2(asDec(raw.local_reinvest_rate))}, released in year ${N}; the free portion is remitted when earned. Forecast spots by ${raw.basis.toUpperCase()} parity; home discount rate ${pct2(r)}. ${fiscalAssumptionLine(raw, raw.foreign_build.tax_rate, c.has_additional_home_tax, c.add_tax_rate_effective)}`, '',
    '**Step 1 — Forecast exchange rates (parity)**', '',
    ...fxTable(c.fx_curve, foreign, home, raw.basis), '',
    '**Step 2 — Remitted (free) cash flows converted to home currency**', '',
    // Honest split (GPT round-1, Fix Round 4): state the TOTAL foreign FCFF and the free/blocked split
    // up front, and label the first column as the free portion (before WHT). The table shows only the
    // remittable slice, so a bare "Foreign cash flow" header (implying the whole FCFF) mislabelled it.
    // Applies to the FAMILY template — every restricted-remittance drill inherits the honest label.
    `Total foreign FCFF = ${mF(c.base_fcff_foreign)}; ${freePct}% immediately remittable, ${blockedPct}% blocked.`, '',
    `| Year | Free portion before WHT (${freePct}% of FCFF) | Free & remitted net (${foreign}) | Spot | Home cash flow | PV |`, `|------|------|------|------|------|------|`,
    ...c.years.map((y) => `| ${y.year} | ${mF(y.foreign_cf)} | ${mF(y.foreign_remit_net)} | ${fmt4(y.fx)} | ${mH(y.home_cf)} | ${mH(y.pv)} |`), '',
    `**Step 3 — Blocked funds accumulated and released in year ${N}**`, '',
    `Blocked cash reinvested locally at ${pct2(asDec(raw.local_reinvest_rate))} accumulates to **${mF(c.blocked_release_foreign)}** by year ${N}; remitted then (net of tax) and converted at ${fmt4(c.fx_curve[N - 1])} = **${mH(c.home_cf_release)}** (PV ${mH(c.home_cf_release * discountFactor(r, N))}).`, '',
    '**Step 4 — NPV and the cost of the restriction**', '',
    `NPV with the restriction = **${mH(c.npv)}** (${c.accept ? 'accept' : 'reject'}). By comparison ${costWord}.`, '',
    '**Step 5 — Advice to the board**', '', prose, '',
    `*Reconciliation: free-flow PVs + released-funds PV − home outlay ${mH(c.home_outlay)} = NPV ${mH(c.npv)}; vs free-remittance NPV ${mH(c.npv_if_free)} ✓*`,
  ].join('\n');
}

export function buildIntlDividendModelAnswer(raw: IntlDividendInputs, c: IntlDividendComputed, prose: string): string {
  const home = raw.home_currency, foreign = raw.foreign_currency;
  const mH = (n: number) => money(home, n), mF = (n: number) => money(foreign, n);
  const yr = raw.remittance_year;
  const verdict = c.sustainable
    ? `capacity **exceeds** the proposed dividend by ${mH(Math.abs(c.capacity_surplus))}, so the group dividend is **covered** by the year's cash generation and is sustainable on the base case`
    : `capacity **falls short** of the proposed dividend by ${mH(Math.abs(c.capacity_surplus))}, so the proposed dividend is **not covered** and would have to draw on reserves or new finance — a red flag on sustainability`;
  const remitTax = c.remit_tax;
  // The nil parenthetical must name the TRUE cause (Fix Round 3 close-out), exactly as the assumption
  // line does: (a) foreign corporate ≥ home, or (b) home > foreign corporate but the creditable
  // withholding covers the residual — never a blanket "foreign ≥ home" (a false inequality in the (b)
  // case). GATE 14b now guards this class in the answer BODY, not only the assumption line.
  const nilNote = taxBranch(asDec(raw.sub_build.tax_rate), asDec(raw.home_tax_rate), c.add_tax_rate_effective, c.has_additional_home_tax) === 'nil_corporate'
    ? ' (no additional home tax — the foreign corporate rate is at or above the home rate)'
    : ' (no additional home tax — the residual differential is covered by the creditable withholding)';
  return [
    '**Multinational dividend capacity and policy**', '',
    `**Assumptions:** group dividend capacity is the CASH the parent can pay — its own free cash flow to equity plus the cash the overseas subsidiary can remit. ${fixedHalfUp(raw.remit_fraction * 100, 0)}% of the subsidiary's FCFE is remitted in year ${yr} at the ${raw.basis.toUpperCase()} forecast spot of ${fmt4(c.forecast_spot)} ${foreign}/${home}. ${fiscalAssumptionLine(raw, raw.sub_build.tax_rate, c.has_additional_home_tax, c.add_tax_rate_effective, 'the remitted share of the foreign taxable profit')}`, '',
    '**Step 1 — Subsidiary free cash flow to equity (foreign)**', '',
    `Subsidiary FCFE = FCFF − after-tax interest + net new borrowing = **${mF(c.sub_fcfe_foreign)}**.`, '',
    '**Step 2 — Remittance to the parent (net of withholding + differential home tax, converted to home)**', '',
    `Remitted (foreign) = ${mF(c.sub_fcfe_foreign)} × ${fixedHalfUp(raw.remit_fraction * 100, 0)}% = ${mF(c.sub_remit_foreign)}; less withholding ${mF(remitTax.wht)}${c.has_additional_home_tax ? ` and differential home tax ${mF(remitTax.additional_home_tax_foreign)} (${pct2(c.add_tax_rate_effective)} on the remitted share of the foreign taxable profit)` : nilNote} = ${mF(remitTax.net_remit_foreign)}; ÷ ${fmt4(c.forecast_spot)} = **${mH(c.sub_remit_home)}**.`, '',
    '**Step 3 — Group dividend capacity**', '',
    `Group capacity = parent FCFE ${mH(c.parent_fcfe)} + remitted subsidiary FCFE ${mH(c.sub_remit_home)} = **${mH(c.total_capacity)}**.`, '',
    '**Step 4 — Sustainability of the proposed dividend**', '',
    `Against the proposed group dividend of ${mH(c.proposed_dividend)}, the ${verdict}.`, '',
    '**Step 5 — Advice to the board**', '', prose, '',
    `*Reconciliation: parent ${mH(c.parent_fcfe)} + remitted ${mH(c.sub_remit_home)} = capacity ${mH(c.total_capacity)}; capacity − proposed ${mH(c.proposed_dividend)} = ${signedSurplus(home, c.capacity_surplus)} ✓*`,
  ].join('\n');
}
