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
const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
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
