// lib/acca/credit.ts
// AFM credit-risk calculator (B3h rating agencies / credit spread / cost of debt via the term
// structure; B4a corporate-debt valuation), calculator #7. Pure, deterministic, no model/DB.
// Same doctrine as the other calculators: code owns EVERY figure AND every figure-vs-figure
// verdict (the over/under-valued call); the model authors PROSE only and never states a rate,
// a spread, or an inequality.
//
// Pure rates/bond family (like CAPM/duration): no cash-flow tax schedule → P6 loss-relief is a
// structural no-op; no finance raised → no issue-cost analogue. ALL kinds are ISSUER-framed
// (the entity issues the debt) — a wider spread is higher FUNDING/refinancing cost, never a
// "loss" (GENERATOR_DOCTRINE issuer-perspective pattern).
//
// House conventions (Grant rulings 2026-07-15):
//  • Boundary with duration (#6): duration uses a single FLAT stated YTM per bond, no curve.
//    Credit (#7) introduces the NON-FLAT government spot (zero-coupon) curve — each cash flow is
//    discounted at ITS OWN maturity's spot rate + credit spread. Spot rates are given directly;
//    forward-rate bootstrapping is OUT OF SCOPE (a future kind if ever demanded). #7 does not
//    compute durations.
//  • Spread is a scenario INPUT looked up from a rating→spread table for kinds 1/3/4; DERIVED
//    (corp yield − matched govt yield) only in kind 2. The calculator applies a given spread; it
//    never invents a spread from a rating (no proprietary rating model).
//  • RATE CONVENTION: every rate input (benchmark, spot curve, coupon, trial yields, Ke, govt
//    yield) is a PERCENT number (7.25 = 7.25%, 0.3 = 0.30%); spreads are basis points; weights
//    and tax_rate are decimals in [0,1). All internal yields/spreads are carried as PERCENT
//    numbers and converted to decimals only to discount. Money is in millions.
//  • Tolerances: root-found/interpolated rates (corp_yield, implied_kd) abs ±0.2 pp (IRR
//    precedent — students interpolate); additive/lookup rates (new_kd = benchmark + Δspread; a
//    spread formed by subtracting two toleranced figures inherits) abs ±0.05 pp; prices/fair
//    values rel ±0.5%; the fair-value-vs-market verdict is strict, code-owned, no tolerance.

import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { fmt1, money, normaliseCurrency, type SerializedSchema } from './fcff';

export { normaliseCurrency };

const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
const absTol = (value: number): Tolerance => ({ kind: 'absolute', value });
const D = (pct: number): number => pct / 100;                        // percent number → decimal
const pct2 = (p: number): string => `${p.toFixed(2)}%`;             // p is ALREADY a percent number
const df = (rDec: number, t: number): number => 1 / Math.pow(1 + rDec, t);
const FACE_SCALE_CEILING = 1e6; // faces render with an "m" suffix — reject an unscaled full-nominal face

// ── Rating scales (canonical, single-agency) ───────────────────────────────────
// Shared by the rating-symbol lint (P8) and the spread↔rating monotonicity gate (GATE 9).
export const SP_SCALE = ['AAA', 'AA+', 'AA', 'AA-', 'A+', 'A', 'A-', 'BBB+', 'BBB', 'BBB-', 'BB+', 'BB', 'BB-', 'B+', 'B', 'B-', 'CCC+', 'CCC', 'CCC-', 'CC', 'C', 'D'];
export const MOODYS_SCALE = ['Aaa', 'Aa1', 'Aa2', 'Aa3', 'A1', 'A2', 'A3', 'Baa1', 'Baa2', 'Baa3', 'Ba1', 'Ba2', 'Ba3', 'B1', 'B2', 'B3', 'Caa1', 'Caa2', 'Caa3', 'Ca', 'C'];
const SP_IG_FLOOR = SP_SCALE.indexOf('BBB-');       // investment-grade boundary (inclusive)
const MOODYS_IG_FLOOR = MOODYS_SCALE.indexOf('Baa3');

export interface RatingInfo { agency: 'SP' | 'Moodys'; ordinal: number; investmentGrade: boolean; }
// ordinal: 0 = AAA/Aaa (best); larger = weaker credit. null for an unrecognised symbol.
export function ratingInfo(symbol: string): RatingInfo | null {
  const s = symbol.trim();
  const sp = SP_SCALE.indexOf(s);
  if (sp !== -1) return { agency: 'SP', ordinal: sp, investmentGrade: sp <= SP_IG_FLOOR };
  const mo = MOODYS_SCALE.indexOf(s);
  if (mo !== -1) return { agency: 'Moodys', ordinal: mo, investmentGrade: mo <= MOODYS_IG_FLOOR };
  return null;
}

// Pure monotonicity check for a scenario's rating→spread table: a WEAKER rating (higher ordinal)
// must carry a WIDER spread, and all symbols must be one agency's scale. Returns { ok, reason }.
export function checkSpreadMonotonicity(table: SpreadRow[]): { ok: boolean; reason?: string } {
  if (!table || table.length < 2) return { ok: false, reason: 'spread table needs ≥2 ratings to establish monotonicity' };
  const infos = table.map((r) => ({ r, info: ratingInfo(r.rating) }));
  const bad = infos.find((x) => x.info === null);
  if (bad) return { ok: false, reason: `unrecognised rating symbol "${bad.r.rating}"` };
  const agencies = new Set(infos.map((x) => x.info!.agency));
  if (agencies.size > 1) return { ok: false, reason: 'spread table mixes rating agencies (S&P/Fitch vs Moody\'s)' };
  const sorted = [...infos].sort((a, b) => a.info!.ordinal - b.info!.ordinal); // best → worst
  for (let i = 1; i < sorted.length; i++) {
    if (!(sorted[i].r.spread_bps > sorted[i - 1].r.spread_bps + 1e-9)) {
      return { ok: false, reason: `spread not monotonic in credit quality: ${sorted[i].r.rating} (${sorted[i].r.spread_bps}bp) must exceed ${sorted[i - 1].r.rating} (${sorted[i - 1].r.spread_bps}bp)` };
    }
  }
  return { ok: true };
}

// ── Types ──────────────────────────────────────────────────────────────────────
export type CreditKind = 'downgrade_impact' | 'spread_estimation' | 'kd_term_structure' | 'debt_valuation';

export interface CreditBond { face_value: number; coupon_rate: number; maturity: number; label?: string; }
export interface SpreadRow { rating: string; spread_bps: number; }

export interface CreditInputs {
  currency?: string;
  spread_table?: SpreadRow[];       // rating→spread (bps); the monotonicity gate reads this
  // kind 1 — downgrade_impact
  base_rating?: string;
  new_rating?: string;
  benchmark_rate?: number;          // flat risk-free benchmark for the debt maturity (PERCENT)
  debt_principal?: number;          // millions
  equity_weight?: number;           // optional ΔWACC (all four required together, else prose-only)
  debt_weight?: number;
  ke?: number;                      // cost of equity (PERCENT)
  tax_rate?: number;                // decimal in [0,1)
  // kinds 2/3/4 — the corporate bond
  bond?: CreditBond;
  rating?: string;                  // issuer rating whose spread is looked up (kinds 3/4)
  // kind 2 — spread_estimation
  market_price?: number;            // quoted market price (kind 2 target; kind 4 comparator), millions
  govt_yield?: number;              // matched-maturity government yield (kind 2), PERCENT
  r_lo?: number;                    // interpolation trial rates (kinds 2/3), PERCENT
  r_hi?: number;
  // kinds 3/4 — term structure
  govt_spot?: number[];             // government spot curve by maturity year (PERCENT each)
}

export interface CurveRow { period: number; cash_flow: number; govt_spot: number; corp_spot: number; df: number; pv: number; } // spots in PERCENT

export interface CreditComputed {
  kind: CreditKind;
  currency: string;
  // kind 1 (rates in PERCENT, money in millions)
  base_spread_bps?: number; new_spread_bps?: number;
  base_kd?: number; new_kd?: number;
  delta_kd_bps?: number;
  base_annual_interest?: number; new_annual_interest?: number; delta_annual_interest?: number;
  base_wacc?: number; new_wacc?: number; delta_wacc?: number;   // undefined if inputs absent
  // kind 2
  bond_rows?: { period: number; cash_flow: number }[];
  price_lo?: number; price_hi?: number; r_lo?: number; r_hi?: number; // PVs (money) + trial rates (PERCENT)
  corp_yield?: number;                       // PERCENT (interpolated)
  govt_yield?: number;                       // PERCENT (given)
  spread_bp?: number;                        // = (corp_yield − govt_yield) × 100 (bp)
  market_price?: number;
  // kinds 3/4
  curve_rows?: CurveRow[];
  spread_used_bps?: number;
  price_curve?: number;                      // Σ PV on the corp spot curve (money)
  implied_kd?: number;                       // kind 3 — PERCENT (interpolated flat yield)
  fair_value?: number;                       // kind 4 — = price_curve (money)
  mispricing?: number;                       // kind 4 — fair_value − market_price (money)
  overvalued?: boolean;                       // kind 4 — market_price > fair_value (strict, code-owned)
}

function req<T>(v: T | undefined, name: string): T {
  if (v === undefined) throw new Error(`Credit input "${name}" is required for this kind`);
  return v;
}
function lookupSpread(table: SpreadRow[], rating: string): number {
  const row = table.find((r) => r.rating.trim() === rating.trim());
  if (!row) throw new Error(`rating "${rating}" not found in spread table`);
  return row.spread_bps;
}
function bondCashFlows(b: CreditBond): { period: number; cash_flow: number }[] {
  if (!(b.maturity > 0)) throw new Error(`maturity must be positive: ${b.maturity}`);
  if (b.face_value >= FACE_SCALE_CEILING) throw new Error(`face_value ${b.face_value} looks unscaled — money renders with an "m" (millions) suffix, so face must be expressed in millions.`);
  const c = D(b.coupon_rate);
  const rows: { period: number; cash_flow: number }[] = [];
  for (let t = 1; t <= b.maturity; t++) rows.push({ period: t, cash_flow: b.face_value * c + (t === b.maturity ? b.face_value : 0) });
  return rows;
}
const pvFlat = (rows: { period: number; cash_flow: number }[], rDec: number): number =>
  rows.reduce((s, r) => s + r.cash_flow * df(rDec, r.period), 0);
// Examiner linear interpolation: the flat yield (DECIMAL) at which pvFlat(rows,y) = target.
function interpolateYieldDec(rows: { period: number; cash_flow: number }[], target: number, rLoDec: number, rHiDec: number): number {
  const pLo = pvFlat(rows, rLoDec), pHi = pvFlat(rows, rHiDec);
  if (Math.abs(pLo - pHi) < 1e-12) throw new Error('degenerate interpolation: trial PVs equal');
  return rLoDec + ((pLo - target) / (pLo - pHi)) * (rHiDec - rLoDec);
}

export function computeCredit(raw: CreditInputs, kind: CreditKind): CreditComputed {
  const currency = normaliseCurrency(raw.currency);

  if (kind === 'downgrade_impact') {
    const table = req(raw.spread_table, 'spread_table');
    const baseR = req(raw.base_rating, 'base_rating');
    const newR = req(raw.new_rating, 'new_rating');
    const bench = req(raw.benchmark_rate, 'benchmark_rate');    // PERCENT
    const principal = req(raw.debt_principal, 'debt_principal');
    const baseSpread = lookupSpread(table, baseR);
    const newSpread = lookupSpread(table, newR);
    if (!(newSpread > baseSpread)) throw new Error(`a downgrade must widen the spread: ${newR} (${newSpread}bp) ≤ ${baseR} (${baseSpread}bp)`);
    const baseKd = bench + baseSpread / 100;   // bp → pp (100 bp = 1 pp), PERCENT
    const newKd = bench + newSpread / 100;
    const baseInt = principal * D(baseKd);
    const newInt = principal * D(newKd);
    let baseWacc: number | undefined, newWacc: number | undefined, deltaWacc: number | undefined;
    if (raw.equity_weight !== undefined && raw.debt_weight !== undefined && raw.ke !== undefined && raw.tax_rate !== undefined) {
      const we = raw.equity_weight, wd = raw.debt_weight, ke = raw.ke, t = raw.tax_rate; // ke PERCENT, t decimal
      baseWacc = we * ke + wd * baseKd * (1 - t);
      newWacc = we * ke + wd * newKd * (1 - t);
      deltaWacc = newWacc - baseWacc;
    }
    return {
      kind, currency, base_spread_bps: baseSpread, new_spread_bps: newSpread,
      base_kd: baseKd, new_kd: newKd, delta_kd_bps: newSpread - baseSpread,
      base_annual_interest: baseInt, new_annual_interest: newInt, delta_annual_interest: newInt - baseInt,
      base_wacc: baseWacc, new_wacc: newWacc, delta_wacc: deltaWacc,
    };
  }

  if (kind === 'spread_estimation') {
    const b = req(raw.bond, 'bond');
    const market = req(raw.market_price, 'market_price');
    const govtY = req(raw.govt_yield, 'govt_yield');           // PERCENT
    const rLoP = req(raw.r_lo, 'r_lo'), rHiP = req(raw.r_hi, 'r_hi'); // PERCENT
    if (!(rHiP > rLoP)) throw new Error(`r_hi must exceed r_lo (${rLoP}, ${rHiP})`);
    const rows = bondCashFlows(b);
    const priceLo = pvFlat(rows, D(rLoP)), priceHi = pvFlat(rows, D(rHiP));
    const corpYield = interpolateYieldDec(rows, market, D(rLoP), D(rHiP)) * 100; // PERCENT
    const spreadBp = (corpYield - govtY) * 100;
    return { kind, currency, bond_rows: rows, price_lo: priceLo, price_hi: priceHi, r_lo: rLoP, r_hi: rHiP, corp_yield: corpYield, govt_yield: govtY, spread_bp: spreadBp, market_price: market };
  }

  // kinds 3 & 4 — term structure (spot curve + spread)
  const b = req(raw.bond, 'bond');
  const spotP = req(raw.govt_spot, 'govt_spot');               // PERCENT per maturity
  if (spotP.length !== b.maturity) throw new Error(`govt_spot length ${spotP.length} must equal maturity ${b.maturity}`);
  if (!raw.spread_table || !raw.rating) throw new Error('spread_table and rating are required for the term-structure kinds');
  const spreadBps = lookupSpread(raw.spread_table, raw.rating);
  const cfs = bondCashFlows(b);
  const curveRows: CurveRow[] = cfs.map((r) => {
    const gsP = spotP[r.period - 1];              // PERCENT
    const csP = gsP + spreadBps / 100;            // PERCENT (100 bp = 1 pp)
    const d = df(D(csP), r.period);
    return { period: r.period, cash_flow: r.cash_flow, govt_spot: gsP, corp_spot: csP, df: d, pv: r.cash_flow * d };
  });
  const priceCurve = curveRows.reduce((s, r) => s + r.pv, 0);

  if (kind === 'kd_term_structure') {
    const rLoP = req(raw.r_lo, 'r_lo'), rHiP = req(raw.r_hi, 'r_hi');
    if (!(rHiP > rLoP)) throw new Error(`r_hi must exceed r_lo (${rLoP}, ${rHiP})`);
    const priceLo = pvFlat(cfs, D(rLoP)), priceHi = pvFlat(cfs, D(rHiP));
    const impliedKd = interpolateYieldDec(cfs, priceCurve, D(rLoP), D(rHiP)) * 100; // PERCENT
    return { kind, currency, curve_rows: curveRows, spread_used_bps: spreadBps, price_curve: priceCurve, price_lo: priceLo, price_hi: priceHi, r_lo: rLoP, r_hi: rHiP, implied_kd: impliedKd };
  }

  // debt_valuation
  const market = req(raw.market_price, 'market_price');
  const mispricing = priceCurve - market;
  return { kind, currency, curve_rows: curveRows, spread_used_bps: spreadBps, price_curve: priceCurve, fair_value: priceCurve, market_price: market, mispricing, overvalued: market > priceCurve };
}

// ── Schema (OFR-carrying chains per kind) ───────────────────────────────────────
const yieldTol = absTol(0.2);   // interpolated/root-found rates (pp)
const addTol = absTol(0.05);    // additive/lookup rates (pp)

export function buildCreditSchema(raw: CreditInputs, c: CreditComputed, currency: string, kind: CreditKind): { schema: AnswerSchema; serialized: SerializedSchema } {
  const moneyUnit = `${currency}m`;
  const components: Component[] = [];
  const recomputeIds: Record<string, string> = {};

  if (kind === 'downgrade_impact') {
    const principal = raw.debt_principal!;
    components.push(
      { component_id: 'base_kd', label: `Cost of debt at the current rating (${raw.base_rating})`, expected_value: c.base_kd!, unit: '%', tolerance: addTol, working_steps: [`= benchmark ${pct2(raw.benchmark_rate!)} + ${c.base_spread_bps}bp spread`] },
      { component_id: 'new_kd', label: `Cost of debt after the downgrade (${raw.new_rating})`, expected_value: c.new_kd!, unit: '%', tolerance: addTol, working_steps: [`= benchmark ${pct2(raw.benchmark_rate!)} + ${c.new_spread_bps}bp spread`] },
      { component_id: 'delta_annual_interest', label: 'Increase in annual interest cost', expected_value: c.delta_annual_interest!, unit: moneyUnit, tolerance: rel(0.5), depends_on: ['base_kd', 'new_kd'], recompute: (d) => principal * (D(d.new_kd) - D(d.base_kd)), working_steps: [`= debt principal ${fmt1(principal)} × (new Kd − base Kd)`] },
    );
    recomputeIds['delta_annual_interest'] = 'principal_times_delta_kd';
    if (c.delta_wacc !== undefined) {
      const wd = raw.debt_weight!, t = raw.tax_rate!;
      components.push({ component_id: 'delta_wacc', label: 'Increase in WACC from the higher cost of debt', expected_value: c.delta_wacc!, unit: '%', tolerance: addTol, depends_on: ['base_kd', 'new_kd'], recompute: (d) => wd * (d.new_kd - d.base_kd) * (1 - t), working_steps: [`= debt weight ${wd} × Δ(after-tax Kd)`] });
      recomputeIds['delta_wacc'] = 'wacc_from_delta_kd';
    }
  } else if (kind === 'spread_estimation') {
    const rLo = D(c.r_lo!), rHi = D(c.r_hi!), govtY = c.govt_yield!, market = c.market_price!;
    components.push(
      { component_id: 'price_lo', label: `Bond PV at the low trial yield (${pct2(c.r_lo!)})`, expected_value: c.price_lo!, unit: moneyUnit, tolerance: rel(0.5), working_steps: [`Σ cash flow × DF at ${pct2(c.r_lo!)}`] },
      { component_id: 'price_hi', label: `Bond PV at the high trial yield (${pct2(c.r_hi!)})`, expected_value: c.price_hi!, unit: moneyUnit, tolerance: rel(0.5), working_steps: [`Σ cash flow × DF at ${pct2(c.r_hi!)}`] },
      { component_id: 'corp_yield', label: 'Corporate redemption yield (interpolated to the market price)', expected_value: c.corp_yield!, unit: '%', tolerance: yieldTol, depends_on: ['price_lo', 'price_hi'], recompute: (d) => (rLo + ((d.price_lo - market) / (d.price_lo - d.price_hi)) * (rHi - rLo)) * 100, working_steps: [`interpolate between ${pct2(c.r_lo!)} and ${pct2(c.r_hi!)} for the yield that prices the bond at ${fmt1(market)}`] },
      { component_id: 'credit_spread', label: 'Credit spread over the matched-maturity government yield', expected_value: c.spread_bp!, unit: 'bp', tolerance: absTol(20), depends_on: ['corp_yield'], recompute: (d) => (d.corp_yield - govtY) * 100, working_steps: [`= corporate yield − government yield ${pct2(govtY)}, ×100 to basis points`] },
    );
    recomputeIds['corp_yield'] = 'yield_interpolation';
    recomputeIds['credit_spread'] = 'spread_from_yields';
  } else if (kind === 'kd_term_structure') {
    const rLo = D(c.r_lo!), rHi = D(c.r_hi!);
    components.push(
      { component_id: 'price_curve', label: 'Bond price on the corporate spot curve (govt spot + spread)', expected_value: c.price_curve!, unit: moneyUnit, tolerance: rel(0.5), working_steps: ['Σ cash flow × DF at (govt spot + spread) for each maturity'] },
      { component_id: 'price_lo', label: `Bond PV at the low trial flat yield (${pct2(c.r_lo!)})`, expected_value: c.price_lo!, unit: moneyUnit, tolerance: rel(0.5), working_steps: [`Σ cash flow × DF at flat ${pct2(c.r_lo!)}`] },
      { component_id: 'price_hi', label: `Bond PV at the high trial flat yield (${pct2(c.r_hi!)})`, expected_value: c.price_hi!, unit: moneyUnit, tolerance: rel(0.5), working_steps: [`Σ cash flow × DF at flat ${pct2(c.r_hi!)}`] },
      { component_id: 'implied_kd', label: 'Cost of debt (single flat yield equivalent to the curve + spread)', expected_value: c.implied_kd!, unit: '%', tolerance: yieldTol, depends_on: ['price_curve', 'price_lo', 'price_hi'], recompute: (d) => (rLo + ((d.price_lo - d.price_curve) / (d.price_lo - d.price_hi)) * (rHi - rLo)) * 100, working_steps: [`interpolate the flat yield that reprices the bond to ${fmt1(c.price_curve!)}`] },
    );
    recomputeIds['implied_kd'] = 'kd_interpolation';
  } else {
    // debt_valuation
    const market = c.market_price!;
    components.push(
      { component_id: 'fair_value', label: 'Fair value of the bond (govt spot + credit spread per maturity)', expected_value: c.fair_value!, unit: moneyUnit, tolerance: rel(0.5), working_steps: ['Σ cash flow × DF at (govt spot + spread) for each maturity'] },
      { component_id: 'mispricing', label: 'Fair value less quoted market price', expected_value: c.mispricing!, unit: moneyUnit, tolerance: rel(0.5), depends_on: ['fair_value'], recompute: (d) => d.fair_value - market, working_steps: [`= fair value − market price ${fmt1(market)}`] },
    );
    recomputeIds['mispricing'] = 'fair_minus_market';
  }

  const serialized: SerializedSchema = {
    components: components.map((comp) => {
      const s: SerializedSchema['components'][number] = {
        component_id: comp.component_id, label: comp.label, expected_value: comp.expected_value,
        unit: comp.unit, tolerance: comp.tolerance, working_steps: comp.working_steps, depends_on: comp.depends_on, weight: comp.weight,
      };
      if (recomputeIds[comp.component_id]) s.recompute = recomputeIds[comp.component_id];
      return s;
    }),
    params: {
      kind_marker: 0,
      benchmark_rate: raw.benchmark_rate ?? 0, debt_principal: raw.debt_principal ?? 0,
      market_price: raw.market_price ?? 0, govt_yield: raw.govt_yield ?? 0,
      r_lo: raw.r_lo ?? 0, r_hi: raw.r_hi ?? 0, spread_used_bps: c.spread_used_bps ?? 0,
    },
  };
  return { schema: { components }, serialized };
}

// ── Model answer (code owns every figure + the over/under-valued verdict) ───────
function curveTable(m: (n: number) => string, rows: CurveRow[]): string[] {
  const lines = ['| Year | Cash flow | Govt spot | + spread | Corp spot | DF | PV |', '|------|------|------|------|------|------|------|'];
  for (const r of rows) lines.push(`| ${r.period} | ${m(r.cash_flow)} | ${pct2(r.govt_spot)} | ${pct2(r.corp_spot - r.govt_spot)} | ${pct2(r.corp_spot)} | ${r.df.toFixed(4)} | ${m(r.pv)} |`);
  const total = rows.reduce((s, r) => s + r.pv, 0);
  lines.push(`| **Total** | | | | | | **${m(total)}** |`);
  return lines;
}

export function buildCreditModelAnswer(raw: CreditInputs, c: CreditComputed, prose: string, currency: string, kind: CreditKind): string {
  const m = (n: number) => money(currency, n);
  const lines: string[] = [];
  let step = 0;
  const S = () => ++step;

  lines.push('**Credit risk — rating, spread and the cost of debt**', '');

  if (kind === 'downgrade_impact') {
    lines.push(
      `**Assumptions:** the cost of debt is the risk-free benchmark for the maturity plus the credit spread the market attaches to the issuer's rating; a downgrade widens that spread. Figures are the issuer's own funding cost — a wider spread is higher refinancing cost, not a mark-to-market loss.`, '',
      `**Step ${S()} — Cost of debt at each rating**`, '',
      `| Rating | Credit spread | Benchmark | Cost of debt (Kd) |`,
      `|------|------|------|------|`,
      `| ${raw.base_rating} (current) | ${c.base_spread_bps}bp | ${pct2(raw.benchmark_rate!)} | **${pct2(c.base_kd!)}** |`,
      `| ${raw.new_rating} (downgraded) | ${c.new_spread_bps}bp | ${pct2(raw.benchmark_rate!)} | **${pct2(c.new_kd!)}** |`,
      '',
      `The downgrade widens the spread by **${c.delta_kd_bps}bp**, lifting the cost of debt from ${pct2(c.base_kd!)} to **${pct2(c.new_kd!)}**.`, '',
      `**Step ${S()} — Effect on the annual interest cost**`, '',
      `On ${m(raw.debt_principal!)} of debt, the annual interest cost rises from ${m(c.base_annual_interest!)} to ${m(c.new_annual_interest!)} — an increase of **${m(c.delta_annual_interest!)} a year**.`, '',
    );
    if (c.delta_wacc !== undefined) {
      lines.push(`**Step ${S()} — Effect on WACC**`, '', `Feeding the higher after-tax cost of debt through the given capital-structure weights raises the WACC by **${pct2(c.delta_wacc!)}** (from ${pct2(c.base_wacc!)} to ${pct2(c.new_wacc!)}), which lifts the hurdle every project must clear.`, '');
    } else {
      lines.push(`**Step ${S()} — Effect on WACC (directional)**`, '', `A higher after-tax cost of debt raises the WACC and so the hurdle rate for new investment; the scenario does not supply the equity weight and cost of equity needed to quantify the exact WACC change, so the effect is stated directionally rather than as a figure.`, '');
    }
  } else if (kind === 'spread_estimation') {
    lines.push(
      `**Assumptions:** the credit spread is the corporate bond's redemption yield less the yield on a government bond of the same maturity — the extra return the market demands for the issuer's default and liquidity risk. The redemption yield is found by interpolating between two trial yields.`, '',
      `**Step ${S()} — The bond's cash flows and trial prices**`, '',
      `| Year | Cash flow | DF @ ${pct2(c.r_lo!)} | PV | DF @ ${pct2(c.r_hi!)} | PV |`,
      `|------|------|------|------|------|------|`,
    );
    const rLo = D(c.r_lo!), rHi = D(c.r_hi!);
    for (const r of c.bond_rows!) lines.push(`| ${r.period} | ${m(r.cash_flow)} | ${df(rLo, r.period).toFixed(4)} | ${m(r.cash_flow * df(rLo, r.period))} | ${df(rHi, r.period).toFixed(4)} | ${m(r.cash_flow * df(rHi, r.period))} |`);
    lines.push(`| **PV** | | | **${m(c.price_lo!)}** | | **${m(c.price_hi!)}** |`, '');
    lines.push(
      `**Step ${S()} — Redemption yield (interpolation to the market price ${m(c.market_price!)})**`, '',
      `PV is ${m(c.price_lo!)} at ${pct2(c.r_lo!)} and ${m(c.price_hi!)} at ${pct2(c.r_hi!)}. Interpolating for the yield that prices the bond at ${m(c.market_price!)} gives a redemption yield of **${pct2(c.corp_yield!)}**.`, '',
      `**Step ${S()} — Credit spread (code-owned)**`, '',
      `Credit spread = corporate yield ${pct2(c.corp_yield!)} − government yield ${pct2(c.govt_yield!)} = **${c.spread_bp!.toFixed(0)}bp** (${pct2(c.spread_bp! / 100)}).`, '',
    );
  } else if (kind === 'kd_term_structure') {
    lines.push(
      `**Assumptions:** the cost of debt is built from the government spot (zero-coupon) yield curve, adding the issuer's credit spread at every maturity, then discounting each cash flow at its own maturity's corporate spot rate. The single cost of debt is the flat yield that reprices the bond to that curve-based price (found by interpolation).`, '',
      `**Step ${S()} — Price on the corporate spot curve (govt spot + ${c.spread_used_bps}bp spread)**`, '',
      ...curveTable(m, c.curve_rows!), '',
      `Discounting every cash flow at its own maturity's corporate spot rate gives a bond price of **${m(c.price_curve!)}**.`, '',
      `**Step ${S()} — Cost of debt (single flat-yield equivalent, by interpolation)**`, '',
      `A flat yield of ${pct2(c.r_lo!)} prices the bond at ${m(c.price_lo!)} and ${pct2(c.r_hi!)} at ${m(c.price_hi!)}. Interpolating for the flat yield that reproduces the curve price ${m(c.price_curve!)} gives a cost of debt of **${pct2(c.implied_kd!)}** — the single Kd to carry into the WACC.`, '',
    );
  } else {
    // debt_valuation
    const verdict = c.overvalued! ? 'over-valued by the market' : 'under-valued by the market';
    lines.push(
      `**Assumptions:** the fair value of the debt is each cash flow discounted at its own maturity's government spot rate plus the issuer's credit spread. Comparing that fair value with the quoted market price shows whether the market is pricing the issuer's debt richly or cheaply relative to the curve.`, '',
      `**Step ${S()} — Fair value on the corporate spot curve (govt spot + ${c.spread_used_bps}bp spread)**`, '',
      ...curveTable(m, c.curve_rows!), '',
      `The fair value is **${m(c.fair_value!)}**.`, '',
      `**Step ${S()} — Fair value vs quoted market price (code-owned verdict)**`, '',
      `Fair value ${m(c.fair_value!)} versus a quoted market price of ${m(c.market_price!)} is a difference of **${m(c.mispricing!)}**, so on the spot-curve valuation the bond is **${verdict}**.`, '',
    );
  }

  lines.push(`**Step ${S()} — Evaluation / advice to the board**`, '', prose, '');

  // Reconciliation
  if (kind === 'downgrade_impact') lines.push(`*Reconciliation: base Kd ${pct2(c.base_kd!)} → new Kd ${pct2(c.new_kd!)} (+${c.delta_kd_bps}bp) → +${m(c.delta_annual_interest!)} annual interest${c.delta_wacc !== undefined ? ` → +${pct2(c.delta_wacc!)} WACC` : ''}. ✓*`);
  else if (kind === 'spread_estimation') lines.push(`*Reconciliation: PV ${m(c.price_lo!)}@${pct2(c.r_lo!)} / ${m(c.price_hi!)}@${pct2(c.r_hi!)} → yield ${pct2(c.corp_yield!)} → spread ${c.spread_bp!.toFixed(0)}bp. ✓*`);
  else if (kind === 'kd_term_structure') lines.push(`*Reconciliation: curve price ${m(c.price_curve!)} → interpolated flat Kd ${pct2(c.implied_kd!)}. ✓*`);
  else lines.push(`*Reconciliation: fair value ${m(c.fair_value!)} vs market ${m(c.market_price!)} = ${m(c.mispricing!)} → ${c.overvalued! ? 'over' : 'under'}-valued. ✓*`);

  return lines.join('\n');
}
