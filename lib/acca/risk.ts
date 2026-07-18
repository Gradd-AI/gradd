// lib/acca/risk.ts
// AFM calculator #3 — RISK & UNCERTAINTY (B1a iv/v/vi + B1b ii). Pure, deterministic, no model/DB/
// side-effects. Code owns EVERY figure AND every figure-vs-figure verdict (EV-max accept/reject, the
// RADR decision FLIP, which project is longer-duration, P(negative NPV)); the model authors prose only.
//
// CONVENTIONS ARE FETCHED, NOT REMEMBERED — every convention below is page-verified against official
// ACCA answers/reports (see docs/evidence/AFM_RISK_EVIDENCE.md; S-ids cited inline, international Rule-22
// style). Source PDFs git-ignored, re-fetchable via docs/evidence/fetch_acca_sources.ps1.
//
// COMPOSITION (Grant Step-0 ruling): this module OWNS the risk-specific logic and COMPOSES the existing
// engines ONE-WAY, no back-imports:
//   • discounting / NPV of a stated stream ← npv.ts (discountFactor)
//   • the project-specific RADR (proxy asset-beta ungear→regear via CAPM) ← capm.ts (computeCapm)
// npv.ts and capm.ts are unchanged in behaviour.
//
// The four kinds:
//   K1 enpv           — ENPV = Σ(pᵢ × NPVᵢ), each NPVᵢ COMPUTED from stated per-scenario cash flows;
//                       code owns ENPV, the EV-max decision, and P(negative NPV). [S6, S7 + article]
//   K2 sensitivity    — variable sensitivity % = 100 × NPV ÷ PV of the affected post-tax flows [S3, S4];
//                       discount-rate sensitivity % = (IRR − r) ÷ r × 100 — bare IRR − r is HEADROOM,
//                       never labelled sensitivity [S4, examiner warning].
//   K3 radr_compare   — company WACC vs a project-specific RADR (proxy asset beta ungear/regear, CAPM);
//                       the SAME stated project cash flows discounted at each rate → the decision FLIPS
//                       when the project's risk class differs from the company's. [S5, S6]
//   K4 risk_measures  — project duration = Σ(t × PVₜ) ÷ ΣPVₜ, COMPARATIVE across two projects [S1, S2];
//                       project VaR = z × σ × √N, z one-tail (1.65 @95% / 2.33 @99%) [technical article].

import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { discountFactor } from './npv';
import { computeCapm } from './capm';
import { money, fmt1, normaliseCurrency, type SerializedSchema } from './valuation';

export { normaliseCurrency };

// ── formatting / rates ──
const asDec = (v: number): number => (v > 1 ? v / 100 : v);
const pct2 = (frac: number): string => `${(frac * 100).toFixed(2)}%`;
// rate/% and years figures take a TIGHT ABSOLUTE tolerance (validate-schema requires it for rate units;
// capm RATE_TOL = 0.1pp and duration.ts year-tol = 0.05 are the precedents).
const absTol = (value: number): Tolerance => ({ kind: 'absolute', value });
const RATE_TOL: Tolerance = absTol(0.1);    // % — percentage points
const YEAR_TOL: Tolerance = absTol(0.05);   // years
// Money components carry the family FLOOR tolerance (0.5% relative, 0.2 absolute) so a small figure
// (a near-nil scenario NPV, a thin VaR) is not held to a punishing relative-only band.
const moneyTol: Tolerance = { kind: 'floor', pct: 0.5, floor: 0.2 };
const EPS = 1e-9;

export type RiskKind = 'enpv' | 'sensitivity' | 'radr_compare' | 'risk_measures';

// ── shared primitives (compose npv.ts discountFactor one-way) ──
// PV of a year-indexed cash-flow stream (cfs[0] = year 1) at rate r.
export function pvOfStream(cfs: number[], r: number): number {
  return cfs.reduce((s, cf, i) => s + cf * discountFactor(r, i + 1), 0);
}
// NPV of a conventional project: −outlay at t0 + PV of the year-1..N stream.
export function npvOfStream(outlay: number, cfs: number[], r: number): number {
  return -outlay + pvOfStream(cfs, r);
}
// IRR of a conventional stream by bisection (the rate where NPV = 0). Robust on a sign-changing,
// conventional cash-flow profile (one outflow then inflows). Used for the discount-rate sensitivity —
// ACCA computes the IRR by spreadsheet then measures the change from the original rate [S4].
export function irrOfStream(outlay: number, cfs: number[], lo = 1e-4, hi = 5): number {
  const f = (r: number) => npvOfStream(outlay, cfs, r);
  let a = lo, b = hi, fa = f(a), fb = f(b);
  if (fa === 0) return a;
  if (fa * fb > 0) throw new Error(`IRR: no sign change on [${lo},${hi}] (fa=${fa.toFixed(2)}, fb=${fb.toFixed(2)}) — not a conventional project?`);
  for (let i = 0; i < 200; i++) {
    const m = (a + b) / 2, fm = f(m);
    if (Math.abs(fm) < 1e-9 || (b - a) / 2 < 1e-12) return m;
    if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
  }
  return (a + b) / 2;
}
// Macaulay-style PROJECT duration = Σ(t × PVₜ) ÷ Σ PVₜ, over the positive present values [S1, S2].
export function projectDuration(cfs: number[], r: number): { pvs: number[]; sum_pv: number; sum_t_pv: number; duration: number } {
  const pvs = cfs.map((cf, i) => cf * discountFactor(r, i + 1));
  let sum_pv = 0, sum_t_pv = 0;
  pvs.forEach((pv, i) => { if (pv > 0) { sum_pv += pv; sum_t_pv += (i + 1) * pv; } });
  if (!(sum_pv > 0)) throw new Error('projectDuration: no positive present values to weight');
  return { pvs, sum_pv, sum_t_pv, duration: sum_t_pv / sum_pv };
}
// One-tail / two-tail z for a confidence level. One-tail 95→1.65, 99→2.33 (the article convention);
// two-tail values (1.96 / 2.58) exist ONLY so GATE G-e can reject a two-tail z on a one-tail VaR.
export function zForConfidence(conf: number, tail: 'one' | 'two'): number {
  const c = conf > 1 ? conf / 100 : conf;
  const table: Record<string, number> = { 'one-0.95': 1.65, 'one-0.99': 2.33, 'two-0.95': 1.96, 'two-0.99': 2.58 };
  const key = `${tail}-${c.toFixed(2)}`;
  const z = table[key];
  if (z === undefined) throw new Error(`zForConfidence: no tabulated z for ${tail}-tail ${(c * 100).toFixed(0)}% (support 95/99)`);
  return z;
}

function finiteGuard(raw: Record<string, unknown>, ctx: string): void {
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${ctx} input "${k}" is not finite: ${JSON.stringify(v)}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K1 — enpv (B1a iv). ENPV = Σ(pᵢ × NPVᵢ); each NPVᵢ computed from a stated per-scenario stream.
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface EnpvScenario { label: string; probability: number; cash_flows: number[]; }
export interface EnpvInputs {
  currency: string;
  outlay: number;                 // common initial outlay (t0)
  discount_rate: number;          // the (risk-adjusted) discount rate applied to every scenario
  scenarios: EnpvScenario[];      // probabilities must sum to 1
  hurdle?: number;                // ENPV decision hurdle (default 0)
}
export interface EnpvScenarioResult { label: string; probability: number; npv: number; }
export interface EnpvComputed {
  scenarios: EnpvScenarioResult[];
  enpv: number;
  p_negative: number;             // Σ pᵢ where NPVᵢ < 0
  accept: boolean;                // enpv > hurdle
  hurdle: number;
  discount_rate: number;
}
export function computeEnpv(raw: EnpvInputs): EnpvComputed {
  finiteGuard({ outlay: raw.outlay, discount_rate: raw.discount_rate, hurdle: raw.hurdle ?? 0 }, 'Enpv');
  const r = asDec(raw.discount_rate), hurdle = raw.hurdle ?? 0;
  if (r <= 0 || r >= 1) throw new Error(`discount_rate out of range (0,1): ${r}`);
  if (!(raw.scenarios.length >= 2)) throw new Error('enpv needs ≥2 scenarios');
  if (!(raw.outlay > 0)) throw new Error('outlay must be positive');
  const scenarios = raw.scenarios.map((s) => {
    if (!(s.probability > 0 && s.probability <= 1)) throw new Error(`scenario "${s.label}" probability out of (0,1]: ${s.probability}`);
    return { label: s.label, probability: s.probability, npv: npvOfStream(raw.outlay, s.cash_flows, r) };
  });
  const enpv = scenarios.reduce((s, x) => s + x.probability * x.npv, 0);
  const p_negative = scenarios.reduce((s, x) => s + (x.npv < 0 ? x.probability : 0), 0);
  return { scenarios, enpv, p_negative, accept: enpv > hurdle, hurdle, discount_rate: r };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K2 — sensitivity (B1a iv). Variable margin = 100 × NPV ÷ PV(affected post-tax stream) [S3,S4];
// discount-rate margin = (IRR − r) ÷ r × 100 [S4]. Bare IRR − r is HEADROOM (pp), never sensitivity.
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface SensitivityInputs {
  currency: string;
  outlay: number;
  net_cash_flows: number[];       // total net post-tax cash flow per year (base NPV + IRR)
  affected_cash_flows: number[];  // the flexed variable's own post-tax stream (e.g. contribution) — the PV base
  variable_label: string;         // e.g. "the selling price" / "contribution"
  discount_rate: number;
}
export interface SensitivityComputed {
  base_npv: number;
  pv_affected: number;
  variable_sensitivity_pct: number;   // 100 × NPV ÷ PV(affected)
  irr: number;                        // decimal
  headroom_pp: number;                // IRR − r (percentage POINTS) — never the sensitivity
  disc_rate_sensitivity_pct: number;  // (IRR − r) ÷ r × 100
  discount_rate: number;
}
export function computeSensitivity(raw: SensitivityInputs): SensitivityComputed {
  finiteGuard({ outlay: raw.outlay, discount_rate: raw.discount_rate }, 'Sensitivity');
  const r = asDec(raw.discount_rate);
  if (r <= 0 || r >= 1) throw new Error(`discount_rate out of range (0,1): ${r}`);
  const base_npv = npvOfStream(raw.outlay, raw.net_cash_flows, r);
  const pv_affected = pvOfStream(raw.affected_cash_flows, r);
  if (!(pv_affected > 0)) throw new Error('PV of the affected stream must be positive (it is the sensitivity base)');
  const irr = irrOfStream(raw.outlay, raw.net_cash_flows, r);
  return {
    base_npv, pv_affected,
    variable_sensitivity_pct: 100 * base_npv / pv_affected,
    irr,
    headroom_pp: (irr - r) * 100,
    disc_rate_sensitivity_pct: ((irr - r) / r) * 100,
    discount_rate: r,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K3 — radr_compare (B1a v). Company rate vs a project-specific RADR (proxy asset-beta ungear/regear
// via CAPM); the SAME stated project cash flows discounted at each → the decision FLIPS. [S5, S6]
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface RadrInputs {
  currency: string;
  outlay: number;
  project_cash_flows: number[];   // stated post-tax project stream
  company_rate: number;           // the company's own cost of capital (the WRONG hurdle for a different risk class)
  // CAPM inputs to DERIVE the project-specific RADR (composed via computeCapm 'project_specific'):
  rf: number; mrp: number; tax_rate: number; kd: number;
  peer_equity_beta: number; peer_ve: number; peer_vd: number;   // proxy company (different industry)
  own_ve: number; own_vd: number;                               // the appraising firm's structure to regear into
}
export interface RadrComputed {
  radr: number;                   // decimal — the project-specific risk-adjusted rate (regeared project WACC)
  asset_beta: number;
  regeared_beta: number;
  company_rate: number;
  npv_at_company: number;
  npv_at_radr: number;
  accept_company: boolean;
  accept_radr: boolean;
  flips: boolean;
}
export function computeRadr(raw: RadrInputs): RadrComputed {
  finiteGuard({ outlay: raw.outlay, company_rate: raw.company_rate, rf: raw.rf, mrp: raw.mrp, tax_rate: raw.tax_rate, kd: raw.kd }, 'Radr');
  const companyRate = asDec(raw.company_rate);
  if (companyRate <= 0 || companyRate >= 1) throw new Error(`company_rate out of range (0,1): ${companyRate}`);
  // COMPOSE capm.ts one-way: proxy equity beta ungeared (peer gearing) → regeared (own gearing) → project WACC [S5, S6].
  const capm = computeCapm({
    rf: raw.rf, mrp: raw.mrp, tax_rate: raw.tax_rate, kd: raw.kd,
    peer_equity_beta: raw.peer_equity_beta, peer_ve: raw.peer_ve, peer_vd: raw.peer_vd,
    own_ve: raw.own_ve, own_vd: raw.own_vd,
  }, 'project_specific');
  if (capm.wacc === undefined || capm.asset_beta === undefined || capm.regeared_beta === undefined) throw new Error('CAPM project_specific did not return a WACC/beta');
  const radr = capm.wacc / 100;   // capm returns %; RADR applied to project cash flows
  const npv_at_company = npvOfStream(raw.outlay, raw.project_cash_flows, companyRate);
  const npv_at_radr = npvOfStream(raw.outlay, raw.project_cash_flows, radr);
  return {
    radr, asset_beta: capm.asset_beta, regeared_beta: capm.regeared_beta, company_rate: companyRate,
    npv_at_company, npv_at_radr,
    accept_company: npv_at_company > 0, accept_radr: npv_at_radr > 0,
    flips: (npv_at_company > 0) !== (npv_at_radr > 0),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K4 — risk_measures (B1a vi + B1b ii). Comparative project duration across two projects [S1, S2];
// project VaR = z × σ × √N (one-tail z) [technical article]. Read together as two risk measures.
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface RiskProject { label: string; cash_flows: number[]; }
export interface RiskMeasuresInputs {
  currency: string;
  discount_rate: number;
  project_a: RiskProject; project_b: RiskProject;   // compared on duration
  var_sigma_annual: number;        // annual σ (money terms) of the project value
  var_confidence: number;          // 0.95 | 0.99
  var_tail: 'one' | 'two';         // scenario states ONE-tail (downside VaR)
  var_horizon_years: number;       // N — VaR scales annual σ by √N
}
export interface RiskMeasuresComputed {
  duration_a: number; duration_b: number;
  longer: string;                  // label of the longer-duration (more exposed) project
  sum_pv_a: number; sum_t_pv_a: number; sum_pv_b: number; sum_t_pv_b: number;
  z: number; var_amount: number;
  discount_rate: number;
}
export function computeRiskMeasures(raw: RiskMeasuresInputs): RiskMeasuresComputed {
  finiteGuard({ discount_rate: raw.discount_rate, var_sigma_annual: raw.var_sigma_annual, var_confidence: raw.var_confidence, var_horizon_years: raw.var_horizon_years }, 'RiskMeasures');
  const r = asDec(raw.discount_rate);
  if (r <= 0 || r >= 1) throw new Error(`discount_rate out of range (0,1): ${r}`);
  if (!(raw.var_horizon_years >= 1)) throw new Error('var_horizon_years must be ≥1');
  if (!(raw.var_sigma_annual > 0)) throw new Error('var_sigma_annual must be positive');
  const A = projectDuration(raw.project_a.cash_flows, r);
  const B = projectDuration(raw.project_b.cash_flows, r);
  const z = zForConfidence(raw.var_confidence, raw.var_tail);
  const var_amount = z * raw.var_sigma_annual * Math.sqrt(raw.var_horizon_years);
  return {
    duration_a: A.duration, duration_b: B.duration,
    longer: A.duration >= B.duration ? raw.project_a.label : raw.project_b.label,
    sum_pv_a: A.sum_pv, sum_t_pv_a: A.sum_t_pv, sum_pv_b: B.sum_pv, sum_t_pv_b: B.sum_t_pv,
    z, var_amount, discount_rate: r,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// FAMILY GATE CORES (G-a … G-e). validate-schema.ts wraps these; the generator runs them for
// risk-family drills only. Each returns { ok, reason? }.
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface RiskCheck { ok: boolean; reason?: string }

// G-a — probabilities sum to 1 (K1; joint-probability rows reconcile to 1).
export function checkProbabilitySum(probs: number[]): RiskCheck {
  const sum = probs.reduce((s, p) => s + p, 0);
  if (Math.abs(sum - 1) > 1e-6) return { ok: false, reason: `probabilities sum to ${sum.toFixed(6)}, not 1 — a scenario set must be exhaustive and mutually exclusive` };
  return { ok: true };
}

// G-b — ENPV internal consistency: enpv == Σ(pᵢ × NPVᵢ), recomputed independently.
export function checkEnpvConsistency(scenarios: { probability: number; npv: number }[], enpv: number): RiskCheck {
  const recomputed = scenarios.reduce((s, x) => s + x.probability * x.npv, 0);
  if (Math.abs(recomputed - enpv) > Math.abs(enpv) * 1e-6 + 1e-6) return { ok: false, reason: `stated ENPV ${fmt1(enpv)} ≠ Σ(p×NPV) ${fmt1(recomputed)}` };
  return { ok: true };
}

// G-c — sensitivity reconciliation: applying the variable margin to the affected PV base must ZERO the
// NPV (NPV − sensitivity_frac × PV_affected ≈ 0), proving the base is the affected stream and the % is
// the margin. AND the discount-rate figure LABELLED sensitivity must be (IRR−r)/r×100, NEVER the bare
// (IRR−r) headroom — ACCA marks the bare difference down [S4].
export function checkSensitivityReconciliation(c: { base_npv: number; pv_affected: number; variable_sensitivity_pct: number; irr: number; discount_rate: number; disc_rate_sensitivity_pct: number; headroom_pp: number }): RiskCheck {
  const residual = c.base_npv - (c.variable_sensitivity_pct / 100) * c.pv_affected;
  if (Math.abs(residual) > Math.abs(c.base_npv) * 1e-6 + 1e-6) return { ok: false, reason: `applying the ${c.variable_sensitivity_pct.toFixed(2)}% margin to the affected PV base ${fmt1(c.pv_affected)} does not zero the NPV (residual ${fmt1(residual)}) — wrong base or wrong margin` };
  const expectedDisc = ((c.irr - c.discount_rate) / c.discount_rate) * 100;
  if (Math.abs(c.disc_rate_sensitivity_pct - expectedDisc) > Math.abs(expectedDisc) * 1e-6 + 1e-6) return { ok: false, reason: `discount-rate sensitivity ${c.disc_rate_sensitivity_pct.toFixed(2)}% ≠ (IRR−r)/r×100 = ${expectedDisc.toFixed(2)}%` };
  // reject the bare-difference error: the sensitivity % must NOT equal the headroom in percentage points
  if (Math.abs(c.disc_rate_sensitivity_pct - c.headroom_pp) < 1e-6 && Math.abs(c.discount_rate - 1) > 1e-9) return { ok: false, reason: `discount-rate sensitivity equals the bare headroom (IRR−r = ${c.headroom_pp.toFixed(2)}pp) — that is headroom, not sensitivity [S4]` };
  return { ok: true };
}

// G-d — RADR composition + ordering: the RADR must equal the CAPM-recomputed project WACC (composition
// integrity), be applied to the PROJECT cash flows, and a riskier project (regeared beta above the
// company's) must carry the HIGHER rate. Validates the compose, not a re-implementation.
export function checkRadrOrdering(raw: RadrInputs, c: RadrComputed): RiskCheck {
  const capm = computeCapm({
    rf: raw.rf, mrp: raw.mrp, tax_rate: raw.tax_rate, kd: raw.kd,
    peer_equity_beta: raw.peer_equity_beta, peer_ve: raw.peer_ve, peer_vd: raw.peer_vd,
    own_ve: raw.own_ve, own_vd: raw.own_vd,
  }, 'project_specific');
  if (capm.wacc === undefined) return { ok: false, reason: 'CAPM did not return a project WACC' };
  if (Math.abs(c.radr - capm.wacc / 100) > 1e-6) return { ok: false, reason: `RADR ${pct2(c.radr)} ≠ the CAPM-recomputed project WACC ${capm.wacc.toFixed(2)}% — composition drift` };
  if (!(c.radr > 0)) return { ok: false, reason: 'RADR must be positive' };
  // ordering: the NPV at the higher rate must be the lower NPV (monotonic discounting sanity)
  const higherRate = Math.max(c.radr, c.company_rate);
  const npvAtHigher = higherRate === c.radr ? c.npv_at_radr : c.npv_at_company;
  const npvAtLower = higherRate === c.radr ? c.npv_at_company : c.npv_at_radr;
  if (npvAtHigher > npvAtLower + Math.abs(npvAtLower) * 1e-6 + 1e-6) return { ok: false, reason: 'the NPV at the higher discount rate exceeds the NPV at the lower rate — a discounting inconsistency' };
  return { ok: true };
}

// G-e — VaR tail + duration bounds: z must match the STATED confidence AND one-tail (1.65/2.33), so a
// two-tail z (1.96/2.58) on a one-tail VaR fails; and each project duration must be ≤ its cash-flow life.
export function checkVarAndDuration(raw: RiskMeasuresInputs, c: RiskMeasuresComputed): RiskCheck {
  const expectedZ = zForConfidence(raw.var_confidence, raw.var_tail);
  if (Math.abs(c.z - expectedZ) > 1e-9) return { ok: false, reason: `z ${c.z} ≠ the ${raw.var_tail}-tail z for ${(asDec(raw.var_confidence) * 100).toFixed(0)}% (${expectedZ})` };
  if (raw.var_tail === 'one' && (Math.abs(c.z - 1.96) < 1e-9 || Math.abs(c.z - 2.58) < 1e-9)) return { ok: false, reason: `a two-tail z (${c.z}) is used for a one-tail downside VaR` };
  const expectedVar = c.z * raw.var_sigma_annual * Math.sqrt(raw.var_horizon_years);
  if (Math.abs(c.var_amount - expectedVar) > Math.abs(expectedVar) * 1e-6 + 1e-6) return { ok: false, reason: `VaR ${fmt1(c.var_amount)} ≠ z×σ×√N = ${fmt1(expectedVar)}` };
  const lifeA = raw.project_a.cash_flows.length, lifeB = raw.project_b.cash_flows.length;
  if (c.duration_a > lifeA + 1e-6) return { ok: false, reason: `duration A ${c.duration_a.toFixed(2)} exceeds its ${lifeA}-year life` };
  if (c.duration_b > lifeB + 1e-6) return { ok: false, reason: `duration B ${c.duration_b.toFixed(2)} exceeds its ${lifeB}-year life` };
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// SCHEMAS + MODEL ANSWERS — code owns every figure + verdict; the model authors PROSE only (the
// scenario, the Step-5 advice, the hint/reveal). Headings are the AREA_ENTRY_RANK keys (verbatim).
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface SerializedComponent {
  component_id: string; label?: string; expected_value: number; unit?: string; tolerance: Tolerance;
  working_steps?: string[]; depends_on?: string[]; recompute?: string; weight?: number;
}
export interface RiskSerializedSchema { components: SerializedComponent[]; params: Record<string, number>; }
function toSerialized(components: Component[], recomputeIds: Record<string, string | undefined>, params: Record<string, number>): RiskSerializedSchema {
  return {
    components: components.map((comp) => {
      const s: SerializedComponent = { component_id: comp.component_id, label: comp.label, expected_value: comp.expected_value, unit: comp.unit, tolerance: comp.tolerance, working_steps: comp.working_steps, depends_on: comp.depends_on, weight: comp.weight };
      const rid = recomputeIds[comp.component_id];
      if (rid) s.recompute = rid;
      return s;
    }),
    params,
  };
}
const fmtPct = (v: number): string => `${v.toFixed(2)}%`;   // v already a percentage number
const fmtY = (v: number): string => `${v.toFixed(2)} years`;

export const RISK_HEADINGS: Record<RiskKind, string> = {
  enpv: '**Risk & uncertainty — expected net present value (ENPV)**',
  sensitivity: '**Risk & uncertainty — sensitivity analysis**',
  radr_compare: '**Risk & uncertainty — risk-adjusted discount rate (RADR)**',
  risk_measures: '**Risk & uncertainty — project duration and value at risk**',
};

// ── K1 ENPV: scenario NPVs (roots) → ENPV (dep). OFR: wrong scenario NPV → ENPV carried. ──
export function buildEnpvSchema(raw: EnpvInputs, c: EnpvComputed): { schema: AnswerSchema; serialized: RiskSerializedSchema } {
  const cur = normaliseCurrency(raw.currency), unit = `${cur}m`;
  const comps: Component[] = c.scenarios.map((s, i) => ({
    component_id: `npv_${i + 1}`, label: `Scenario NPV — ${s.label}`, expected_value: s.npv, unit, tolerance: moneyTol,
    working_steps: [`= −outlay ${fmt1(raw.outlay)} + Σ (scenario ${s.label} cash flow × DF @ ${pct2(c.discount_rate)})`],
  }));
  const ids = c.scenarios.map((_, i) => `npv_${i + 1}`);
  const probs = c.scenarios.map((s) => s.probability);
  comps.push({
    component_id: 'enpv', label: 'Expected net present value (ENPV)', expected_value: c.enpv, unit, tolerance: moneyTol,
    depends_on: ids, recompute: (d) => ids.reduce((s, id, i) => s + probs[i] * d[id], 0),
    working_steps: [`ENPV = Σ(pᵢ × NPVᵢ) = ${c.scenarios.map((s) => `${s.probability}×${fmt1(s.npv)}`).join(' + ')}`],
  });
  const recomputeIds: Record<string, string | undefined> = { enpv: 'enpv_prob_weighted' };
  const params = { discount_rate: c.discount_rate, outlay: raw.outlay, hurdle: c.hurdle, p_negative: c.p_negative };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildEnpvModelAnswer(raw: EnpvInputs, c: EnpvComputed, prose: string): string {
  const cur = normaliseCurrency(raw.currency), m = (n: number) => money(cur, n);
  const lines: string[] = [
    RISK_HEADINGS.enpv, '',
    `**Assumptions:** each economic state's cash flows are STATED; every scenario NPV is computed from its own stream discounted at ${pct2(c.discount_rate)} (outlay ${m(raw.outlay)} at t0); probabilities are exhaustive and sum to 1. ENPV is the probability-weighted mean NPV — a **repeated-game** figure. Because this project is undertaken **once**, the individual state NPVs and the probability of a negative NPV carry the decision alongside the mean.`, '',
    '**Step 1 — Scenario NPVs (each from its own stated cash flows)**', '',
    `| Scenario | Probability | NPV |`, `|------|------|------|`,
    ...c.scenarios.map((s) => `| ${s.label} | ${s.probability.toFixed(2)} | ${m(s.npv)} |`), '',
    '**Step 2 — Expected NPV**', '',
    `ENPV = Σ(pᵢ × NPVᵢ) = **${m(c.enpv)}**. Probability of a negative NPV = **${(c.p_negative * 100).toFixed(0)}%**.`, '',
    '**Step 3 — Decision**', '',
    c.accept
      ? `On the expected-value criterion the ENPV of ${m(c.enpv)} is **positive**, so the project is **acceptable on EV terms** — subject to the one-shot caveat below.`
      : `On the expected-value criterion the ENPV of ${m(c.enpv)} is **not positive**, so the project is **not acceptable on EV terms** as it stands.`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: Σ(p×NPV) = ${m(c.enpv)}; P(NPV<0) = ${(c.p_negative * 100).toFixed(0)}% ✓*`,
  ];
  return lines.join('\n');
}

// ── K2 sensitivity: base_npv + pv_affected (roots) → variable margin (dep); irr (root) → disc-rate margin (dep). ──
export function buildSensitivitySchema(raw: SensitivityInputs, c: SensitivityComputed): { schema: AnswerSchema; serialized: RiskSerializedSchema } {
  const cur = normaliseCurrency(raw.currency), unit = `${cur}m`;
  const r = c.discount_rate;
  const comps: Component[] = [
    { component_id: 'base_npv', label: 'Base-case NPV', expected_value: c.base_npv, unit, tolerance: moneyTol, working_steps: [`= −outlay ${fmt1(raw.outlay)} + Σ (net cash flow × DF @ ${pct2(r)})`] },
    { component_id: 'pv_affected', label: `PV of ${raw.variable_label} (the affected post-tax stream)`, expected_value: c.pv_affected, unit, tolerance: moneyTol, working_steps: [`= Σ (${raw.variable_label} cash flow × DF @ ${pct2(r)})`] },
    { component_id: 'var_sensitivity', label: `Sensitivity of the decision to ${raw.variable_label} (%)`, expected_value: c.variable_sensitivity_pct, unit: '%', tolerance: RATE_TOL,
      depends_on: ['base_npv', 'pv_affected'], recompute: (d) => 100 * d.base_npv / d.pv_affected, working_steps: [`= 100 × NPV ÷ PV of ${raw.variable_label} [S3, S4]`] },
    { component_id: 'irr', label: 'Project IRR (%)', expected_value: c.irr * 100, unit: '%', tolerance: RATE_TOL, working_steps: [`the discount rate at which NPV = 0`] },
    { component_id: 'disc_sensitivity', label: 'Sensitivity of the decision to the discount rate (%)', expected_value: c.disc_rate_sensitivity_pct, unit: '%', tolerance: RATE_TOL,
      depends_on: ['irr'], recompute: (d) => ((d.irr / 100 - r) / r) * 100, working_steps: [`= (IRR − r) ÷ r × 100 [S4] — NOT the bare IRR − r headroom`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { var_sensitivity: 'sensitivity_100_npv_over_pv', disc_sensitivity: 'disc_rate_sensitivity_over_r' };
  const params = { discount_rate: r, outlay: raw.outlay, headroom_pp: c.headroom_pp };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildSensitivityModelAnswer(raw: SensitivityInputs, c: SensitivityComputed, prose: string): string {
  const cur = normaliseCurrency(raw.currency), m = (n: number) => money(cur, n);
  return [
    RISK_HEADINGS.sensitivity, '',
    `**Assumptions:** the base-case NPV and the affected variable's own present value are computed from the stated post-tax cash flows at ${pct2(c.discount_rate)}. The sensitivity of a variable is the percentage change in that variable that reduces the NPV to zero; for the discount rate it is measured from the project IRR.`, '',
    '**Step 1 — Base NPV and the affected present value**', '',
    `Base-case NPV = **${m(c.base_npv)}**; PV of ${raw.variable_label} (the affected post-tax stream) = **${m(c.pv_affected)}**.`, '',
    `**Step 2 — Sensitivity to ${raw.variable_label}**`, '',
    `Sensitivity = 100 × NPV ÷ PV of ${raw.variable_label} = 100 × ${fmt1(c.base_npv)} ÷ ${fmt1(c.pv_affected)} = **${fmtPct(c.variable_sensitivity_pct)}** [S3, S4]. ${raw.variable_label} can move by this margin before the decision reverses.`, '',
    '**Step 3 — Sensitivity to the discount rate**', '',
    `Project IRR = **${fmtPct(c.irr * 100)}** (NPV = 0). The headroom over the ${pct2(c.discount_rate)} rate is ${c.headroom_pp.toFixed(2)} percentage points — but the **sensitivity** is that change expressed as a percentage of the original rate: (IRR − r) ÷ r × 100 = **${fmtPct(c.disc_rate_sensitivity_pct)}** [S4]. (The bare ${c.headroom_pp.toFixed(2)}pp difference is headroom, not sensitivity.)`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: applying the ${fmtPct(c.variable_sensitivity_pct)} margin to ${m(c.pv_affected)} removes the ${m(c.base_npv)} NPV ✓*`,
  ].join('\n');
}

// ── K3 RADR: radr + npv_at_company (roots) → npv_at_radr (dep on radr). OFR: wrong radr → npv_at_radr carried. ──
export function buildRadrSchema(raw: RadrInputs, c: RadrComputed): { schema: AnswerSchema; serialized: RiskSerializedSchema } {
  const cur = normaliseCurrency(raw.currency), unit = `${cur}m`;
  const outlay = raw.outlay, cfs = raw.project_cash_flows;
  const comps: Component[] = [
    { component_id: 'radr', label: 'Project-specific RADR (%)', expected_value: c.radr * 100, unit: '%', tolerance: RATE_TOL, working_steps: [`proxy asset beta ${c.asset_beta.toFixed(3)} regeared to ${c.regeared_beta.toFixed(3)} → project WACC [S5, S6]`] },
    { component_id: 'npv_at_company', label: `NPV at the company rate ${pct2(c.company_rate)}`, expected_value: c.npv_at_company, unit, tolerance: moneyTol, working_steps: [`= −outlay ${fmt1(outlay)} + Σ (project cash flow × DF @ ${pct2(c.company_rate)})`] },
    { component_id: 'npv_at_radr', label: 'NPV at the project-specific RADR', expected_value: c.npv_at_radr, unit, tolerance: moneyTol,
      depends_on: ['radr'], recompute: (d) => npvOfStream(outlay, cfs, d.radr / 100), working_steps: [`= −outlay ${fmt1(outlay)} + Σ (project cash flow × DF @ the RADR)`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { npv_at_radr: 'npv_at_radr_rate' };
  const params = { radr: c.radr, company_rate: c.company_rate, outlay, asset_beta: c.asset_beta, regeared_beta: c.regeared_beta };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildRadrModelAnswer(raw: RadrInputs, c: RadrComputed, prose: string): string {
  const cur = normaliseCurrency(raw.currency), m = (n: number) => money(cur, n);
  const verdict = c.flips
    ? `the decision **FLIPS**: ${c.accept_company ? 'accept' : 'reject'} at the company rate, ${c.accept_radr ? 'accept' : 'reject'} at the RADR. Using the company's own rate for a project in a different risk class gives the **wrong** decision.`
    : `the decision does **not** change (${c.accept_radr ? 'accept' : 'reject'} at both rates), though the NPV is lower at the risk-adjusted rate.`;
  return [
    RISK_HEADINGS.radr_compare, '',
    `**Assumptions:** because the project is in a different risk class from the company's existing operations, a **project-specific** risk-adjusted discount rate is derived from a proxy company's asset beta (ungeared from the proxy's gearing, regeared to this firm's) via CAPM [S5, S6], and applied to the project's stated cash flows. The company's own ${pct2(c.company_rate)} rate is shown for contrast — it is the WRONG hurdle for a different-risk project.`, '',
    '**Step 1 — The project-specific RADR**', '',
    `Proxy asset beta = ${c.asset_beta.toFixed(3)}; regeared to this firm = ${c.regeared_beta.toFixed(3)}; project-specific RADR = **${fmtPct(c.radr * 100)}**.`, '',
    '**Step 2 — NPV at each rate (same project cash flows)**', '',
    `| Discount rate | NPV | Decision |`, `|------|------|------|`,
    `| Company rate ${pct2(c.company_rate)} | ${m(c.npv_at_company)} | ${c.accept_company ? 'accept' : 'reject'} |`,
    `| Project RADR ${fmtPct(c.radr * 100)} | ${m(c.npv_at_radr)} | ${c.accept_radr ? 'accept' : 'reject'} |`, '',
    '**Step 3 — Decision**', '',
    `Comparing the two, ${verdict}`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: same cash flows, two rates — NPV ${m(c.npv_at_company)} at ${pct2(c.company_rate)} vs ${m(c.npv_at_radr)} at the ${fmtPct(c.radr * 100)} RADR; decision ${c.flips ? 'flips' : 'holds'} ✓*`,
  ].join('\n');
}

// ── K4 risk measures: sum_pv + sum_t_pv (roots) → duration (dep) per project; VaR (root). ──
export function buildRiskMeasuresSchema(raw: RiskMeasuresInputs, c: RiskMeasuresComputed): { schema: AnswerSchema; serialized: RiskSerializedSchema } {
  const cur = normaliseCurrency(raw.currency), unit = `${cur}m`;
  const comps: Component[] = [
    { component_id: 'sum_pv_a', label: `Σ PV — ${raw.project_a.label}`, expected_value: c.sum_pv_a, unit, tolerance: moneyTol, working_steps: [`Σ of the positive present values @ ${pct2(c.discount_rate)}`] },
    { component_id: 'sum_t_pv_a', label: `Σ (t × PV) — ${raw.project_a.label}`, expected_value: c.sum_t_pv_a, unit: `${cur}m·yr`, tolerance: moneyTol, working_steps: [`Σ of (year × present value)`] },
    { component_id: 'duration_a', label: `Duration — ${raw.project_a.label} (years)`, expected_value: c.duration_a, unit: 'years', tolerance: YEAR_TOL, depends_on: ['sum_t_pv_a', 'sum_pv_a'], recompute: (d) => d.sum_t_pv_a / d.sum_pv_a, working_steps: [`= Σ(t × PV) ÷ Σ PV [S1, S2]`] },
    { component_id: 'sum_pv_b', label: `Σ PV — ${raw.project_b.label}`, expected_value: c.sum_pv_b, unit, tolerance: moneyTol, working_steps: [`Σ of the positive present values @ ${pct2(c.discount_rate)}`] },
    { component_id: 'sum_t_pv_b', label: `Σ (t × PV) — ${raw.project_b.label}`, expected_value: c.sum_t_pv_b, unit: `${cur}m·yr`, tolerance: moneyTol, working_steps: [`Σ of (year × present value)`] },
    { component_id: 'duration_b', label: `Duration — ${raw.project_b.label} (years)`, expected_value: c.duration_b, unit: 'years', tolerance: YEAR_TOL, depends_on: ['sum_t_pv_b', 'sum_pv_b'], recompute: (d) => d.sum_t_pv_b / d.sum_pv_b, working_steps: [`= Σ(t × PV) ÷ Σ PV [S1, S2]`] },
    { component_id: 'var_amount', label: `Project value at risk (${(asDec(raw.var_confidence) * 100).toFixed(0)}%, one-tail, ${raw.var_horizon_years}y)`, expected_value: c.var_amount, unit, tolerance: moneyTol, working_steps: [`= z ${c.z} × σ ${fmt1(raw.var_sigma_annual)} × √${raw.var_horizon_years} [article]`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { duration_a: 'duration_ratio', duration_b: 'duration_ratio' };
  const params = { discount_rate: c.discount_rate, z: c.z, sigma: raw.var_sigma_annual, horizon: raw.var_horizon_years };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildRiskMeasuresModelAnswer(raw: RiskMeasuresInputs, c: RiskMeasuresComputed, prose: string): string {
  const cur = normaliseCurrency(raw.currency), m = (n: number) => money(cur, n);
  const conf = (asDec(raw.var_confidence) * 100).toFixed(0);
  return [
    RISK_HEADINGS.risk_measures, '',
    `**Assumptions:** project duration is the PV-weighted average timing of cash inflows, Σ(t × PV) ÷ Σ PV [S1, S2] — a **comparative** risk measure (the longer-duration project is the more exposed), never a standalone accept/reject. Value at risk uses a one-tail ${conf}% confidence (z = ${c.z}) and scales the annual σ by √N over the ${raw.var_horizon_years}-year horizon.`, '',
    '**Step 1 — Project duration (compared)**', '',
    `| Project | Σ PV | Σ (t × PV) | Duration |`, `|------|------|------|------|`,
    `| ${raw.project_a.label} | ${m(c.sum_pv_a)} | ${fmt1(c.sum_t_pv_a)} | ${fmtY(c.duration_a)} |`,
    `| ${raw.project_b.label} | ${m(c.sum_pv_b)} | ${fmt1(c.sum_t_pv_b)} | ${fmtY(c.duration_b)} |`, '',
    `**${c.longer}** has the **longer duration**, so it is the more exposed to a change in the discount rate / a shift in the timing of cash flows.`, '',
    '**Step 2 — Project value at risk**', '',
    `VaR = z × σ × √N = ${c.z} × ${m(raw.var_sigma_annual)} × √${raw.var_horizon_years} = **${m(c.var_amount)}** — the one-tail ${conf}% downside on project value over ${raw.var_horizon_years} years.`, '',
    '**Step 3 — Advice to the board**', '', prose, '',
    `*Reconciliation: duration ${fmtY(c.duration_a)} vs ${fmtY(c.duration_b)} (longer = ${c.longer}); VaR ${m(c.var_amount)} = ${c.z}×${fmt1(raw.var_sigma_annual)}×√${raw.var_horizon_years} ✓*`,
  ].join('\n');
}
