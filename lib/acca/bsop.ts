// lib/acca/bsop.ts
// AFM Black-Scholes option-pricing calculator (B2a BSOP financial-product/asset valuation + the
// five drivers; B2c real options to delay / expand / withdraw; B2b archetype classification woven
// as prose), calculator #8. Pure, deterministic, no model/DB. Code owns EVERY figure AND the
// code-owned decision; the model authors PROSE only (the five-driver interpretation + the BSOP
// assumptions/limitations) and never states a value, a probability, or an inequality.
//
// SPREADSHEET-INPUTS ruling (banked, J24 Littlebredy) — EXTENDED for our marking (Grant 2026-07-15,
// "Design B"): the exam supplies the calculator, so the marked skill is the FIVE driver
// identifications + (for real options) the Pₐ/Pₑ MAPPING + interpretation. We still GRADE the BSOP
// chain, but tolerances are set to the student's legitimate exam apparatus — the NORMAL TABLES —
// never to code precision: N(d1)/N(d2) abs ±0.01 (a 2-dp table read), d1/d2 abs ±0.05; the option
// value carries from the student's OWN N(d) under OFR (rel ±0.5%). N(d) displays at 4 dp (table
// convention, e.g. 0.7357). The five drivers + interpretation carry the weight (workings light).
//
// Conventions: money in MILLIONS (money() m-suffix); volatility s and risk-free r are PERCENT
// numbers; time t in years. Real options: Pₐ = PV of the underlying (project/asset value), Pₑ =
// exercise (investment cost / salvage floor); delay & expand = CALLS, withdraw/abandon = a PUT via
// put-call parity (redeploy = the switch-texture within the put family, not a calculated kind).

import { fixedHalfUp } from './rounding';
import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { fmt1, money, normaliseCurrency, type SerializedSchema } from './valuation';

export { normaliseCurrency };

const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
const absTol = (value: number): Tolerance => ({ kind: 'absolute', value });
const D = (pct: number): number => pct / 100;               // percent → decimal
const pct2 = (p: number): string => `${fixedHalfUp(p, 2)}%`;     // p is a PERCENT number
const d4 = (x: number): string => fixedHalfUp(x, 4);             // d1/d2 and N(d) at 4 dp (table convention)

// Exact cumulative standard normal via Abramowitz-Stegun 7.1.26 erf (max error ~1.5e-7 — far finer
// than the 4-dp tables). N(x) = ½(1 + erf(x/√2)).
function erf(x: number): number {
  const t = 1 / (1 + 0.3275911 * Math.abs(x));
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return x >= 0 ? y : -y;
}
export function normCdf(x: number): number { return 0.5 * (1 + erf(x / Math.SQRT2)); }

export type BsopKind = 'financial_product_valuation' | 'option_to_delay' | 'option_to_expand' | 'option_to_withdraw';

export interface BsopInputs {
  currency?: string;
  underlying: number;    // Pₐ — value of the underlying asset (millions)
  exercise: number;      // Pₑ — exercise price / investment cost / salvage floor (millions)
  volatility: number;    // s — PERCENT (e.g. 30 = 30%)
  risk_free: number;     // r — PERCENT
  time: number;          // t — years
  base_npv?: number;     // real options — the project NPV WITHOUT the option (millions), for the decision
  issuer_label?: string;
  underlying_label?: string; // what Pₐ maps to in the scenario (mapping prose)
  exercise_label?: string;   // what Pₑ maps to
}

export interface BsopComputed {
  kind: BsopKind;
  currency: string;
  Pa: number; Pe: number; s: number; r: number; t: number;   // s,r PERCENT
  d1: number; d2: number; Nd1: number; Nd2: number;
  call: number;
  put?: number; put_check?: number;   // withdraw — via parity + a direct cross-check
  pv_exercise: number;                // Pₑ·e^(−rt)
  value: number;                      // the option value the kind reports (call, or put for withdraw)
  base_npv?: number;
  expanded_npv?: number;              // expand/withdraw — base_npv + value (code-owned decision figure)
  accept?: boolean;                   // expand/withdraw — expanded_npv > 0 (strict, code-owned)
  defer?: boolean;                    // delay — option value exceeds the immediate NPV
}

function guard(raw: BsopInputs): void {
  if (!(raw.underlying > 0)) throw new Error(`underlying (Pa) must be > 0: ${raw.underlying}`);
  if (!(raw.exercise > 0)) throw new Error(`exercise (Pe) must be > 0: ${raw.exercise}`);
  if (!(raw.volatility > 0)) throw new Error(`volatility (s) must be > 0: ${raw.volatility}`);
  if (!(raw.time > 0)) throw new Error(`time (t) must be > 0: ${raw.time}`);
  if (raw.risk_free < 0) throw new Error(`risk_free (r) must be ≥ 0: ${raw.risk_free}`);
  if (raw.underlying >= 1e6 || raw.exercise >= 1e6) throw new Error(`Pa/Pe look unscaled — money renders with an "m" (millions) suffix; express in millions.`);
}

export function computeBsop(raw: BsopInputs, kind: BsopKind): BsopComputed {
  guard(raw);
  const currency = normaliseCurrency(raw.currency);
  const Pa = raw.underlying, Pe = raw.exercise;
  const s = D(raw.volatility), r = D(raw.risk_free), t = raw.time;
  const d1 = (Math.log(Pa / Pe) + (r + (s * s) / 2) * t) / (s * Math.sqrt(t));
  const d2 = d1 - s * Math.sqrt(t);
  const Nd1 = normCdf(d1), Nd2 = normCdf(d2);
  const pvExercise = Pe * Math.exp(-r * t);
  const call = Pa * Nd1 - pvExercise * Nd2;
  const put = call - Pa + pvExercise;                          // put-call parity
  const putCheck = pvExercise * normCdf(-d2) - Pa * normCdf(-d1); // independent cross-check

  const base: BsopComputed = {
    kind, currency, Pa, Pe, s: raw.volatility, r: raw.risk_free, t,
    d1, d2, Nd1, Nd2, call, pv_exercise: pvExercise, value: call, base_npv: raw.base_npv,
  };
  if (kind === 'option_to_withdraw') {
    const value = put;
    const expanded = raw.base_npv !== undefined ? raw.base_npv + value : undefined;
    return { ...base, put, put_check: putCheck, value, expanded_npv: expanded, accept: expanded !== undefined ? expanded > 0 : undefined };
  }
  if (kind === 'option_to_expand') {
    const expanded = raw.base_npv !== undefined ? raw.base_npv + call : undefined;
    return { ...base, expanded_npv: expanded, accept: expanded !== undefined ? expanded > 0 : undefined };
  }
  if (kind === 'option_to_delay') {
    return { ...base, defer: raw.base_npv !== undefined ? call > raw.base_npv : undefined };
  }
  return base; // financial_product_valuation
}

// ── GATE 10 helper — no-arbitrage bounds + put-call parity (pure) ────────────────
export function checkOptionBounds(c: BsopComputed): { ok: boolean; reason?: string } {
  const eps = Math.max(1e-4, c.Pa * 1e-6);
  if (!(c.Nd1 > 0 && c.Nd1 < 1)) return { ok: false, reason: `N(d1)=${c.Nd1} not in (0,1)` };
  if (!(c.Nd2 > 0 && c.Nd2 < 1)) return { ok: false, reason: `N(d2)=${c.Nd2} not in (0,1)` };
  const callFloor = Math.max(0, c.Pa - c.pv_exercise);
  if (c.call < callFloor - eps || c.call > c.Pa + eps) return { ok: false, reason: `call ${c.call} outside no-arbitrage bounds [${callFloor}, ${c.Pa}]` };
  if (c.put !== undefined) {
    const putFloor = Math.max(0, c.pv_exercise - c.Pa);
    if (c.put < putFloor - eps || c.put > c.pv_exercise + eps) return { ok: false, reason: `put ${c.put} outside no-arbitrage bounds [${putFloor}, ${c.pv_exercise}]` };
    if (Math.abs((c.call - c.put) - (c.Pa - c.pv_exercise)) > 1e-3) return { ok: false, reason: `put-call parity broken: c−p=${c.call - c.put} vs Pa−PVe=${c.Pa - c.pv_exercise}` };
    if (c.put_check !== undefined && Math.abs(c.put - c.put_check) > 1e-3) return { ok: false, reason: `put (parity) ${c.put} disagrees with the direct formula ${c.put_check}` };
  }
  return { ok: true };
}

// ── Schema — graded chain: 5 drivers → d1 → d2 → N(d1),N(d2) → value (→ expanded) ──
const dTol = absTol(0.05);   // d1/d2 (table-driver rounding)
const nTol = absTol(0.01);   // N(d) — a 2-dp table read
const wDriver = 2, wWork = 1, wValue = 3, wDecision = 3;

export function buildBsopSchema(raw: BsopInputs, c: BsopComputed, currency: string, kind: BsopKind): { schema: AnswerSchema; serialized: SerializedSchema } {
  const moneyUnit = `${currency}m`;
  const sDec = D(c.s), rDec = D(c.r), t = c.t, Pa = c.Pa, Pe = c.Pe, pvE = c.pv_exercise;
  const components: Component[] = [
    { component_id: 'Pa', label: 'Underlying asset value (Pₐ)', expected_value: Pa, unit: moneyUnit, tolerance: rel(0.5), weight: wDriver, working_steps: ['identify the value of the underlying'] },
    { component_id: 'Pe', label: 'Exercise price (Pₑ)', expected_value: Pe, unit: moneyUnit, tolerance: rel(0.5), weight: wDriver, working_steps: ['identify the exercise price'] },
    { component_id: 'volatility', label: 'Volatility (s)', expected_value: c.s, unit: '%', tolerance: absTol(0.05), weight: wDriver, working_steps: ['identify the volatility of the underlying'] },
    { component_id: 'risk_free', label: 'Risk-free rate (r)', expected_value: c.r, unit: '%', tolerance: absTol(0.05), weight: wDriver, working_steps: ['identify the risk-free rate'] },
    { component_id: 'time', label: 'Time to expiry (t, years)', expected_value: c.t, unit: 'years', tolerance: absTol(0.05), weight: wDriver, working_steps: ['identify the time to expiry'] },
    { component_id: 'd1', label: 'd1', expected_value: c.d1, unit: '', tolerance: dTol, weight: wWork, depends_on: ['Pa', 'Pe', 'volatility', 'risk_free', 'time'], recompute: (d) => (Math.log(d.Pa / d.Pe) + (D(d.risk_free) + (D(d.volatility) ** 2) / 2) * d.time) / (D(d.volatility) * Math.sqrt(d.time)), working_steps: ['d1 = [ln(Pₐ/Pₑ) + (r + s²/2)t] / (s√t)'] },
    { component_id: 'd2', label: 'd2', expected_value: c.d2, unit: '', tolerance: dTol, weight: wWork, depends_on: ['d1', 'volatility', 'time'], recompute: (d) => d.d1 - D(d.volatility) * Math.sqrt(d.time), working_steps: ['d2 = d1 − s√t'] },
    { component_id: 'Nd1', label: 'N(d1)', expected_value: c.Nd1, unit: '', tolerance: nTol, weight: wWork, depends_on: ['d1'], recompute: (d) => normCdf(d.d1), working_steps: ['N(d1) from the normal tables'] },
    { component_id: 'Nd2', label: 'N(d2)', expected_value: c.Nd2, unit: '', tolerance: nTol, weight: wWork, depends_on: ['d2'], recompute: (d) => normCdf(d.d2), working_steps: ['N(d2) from the normal tables'] },
    { component_id: 'call', label: 'Call value (c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2))', expected_value: c.call, unit: moneyUnit, tolerance: rel(0.5), weight: wValue, depends_on: ['Pa', 'Pe', 'risk_free', 'time', 'Nd1', 'Nd2'], recompute: (d) => d.Pa * d.Nd1 - d.Pe * Math.exp(-D(d.risk_free) * d.time) * d.Nd2, working_steps: ['c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2)'] },
  ];
  const recomputeIds: Record<string, string> = { d1: 'bsop_d1', d2: 'bsop_d2', Nd1: 'norm_cdf_d1', Nd2: 'norm_cdf_d2', call: 'bsop_call' };

  if (kind === 'option_to_withdraw') {
    components.push({ component_id: 'put', label: 'Put value via put-call parity (p = c − Pₐ + Pₑ·e^(−rt))', expected_value: c.put!, unit: moneyUnit, tolerance: rel(0.5), weight: wValue, depends_on: ['call', 'Pa', 'Pe', 'risk_free', 'time'], recompute: (d) => d.call - d.Pa + d.Pe * Math.exp(-D(d.risk_free) * d.time), working_steps: ['p = c − Pₐ + Pₑ·e^(−rt)'] });
    recomputeIds['put'] = 'put_call_parity';
    if (c.expanded_npv !== undefined) {
      const bn = c.base_npv!;
      components.push({ component_id: 'expanded_npv', label: 'Project value with the abandonment option (base NPV + put)', expected_value: c.expanded_npv, unit: moneyUnit, tolerance: rel(0.5), weight: wDecision, depends_on: ['put'], recompute: (d) => bn + d.put, working_steps: [`= base NPV ${fmt1(bn)} + abandonment put`] });
      recomputeIds['expanded_npv'] = 'base_plus_put';
    }
  } else if (kind === 'option_to_expand' && c.expanded_npv !== undefined) {
    const bn = c.base_npv!;
    components.push({ component_id: 'expanded_npv', label: 'Expanded value (base NPV + expansion call)', expected_value: c.expanded_npv, unit: moneyUnit, tolerance: rel(0.5), weight: wDecision, depends_on: ['call'], recompute: (d) => bn + d.call, working_steps: [`= base NPV ${fmt1(bn)} + expansion call`] });
    recomputeIds['expanded_npv'] = 'base_plus_call';
  }

  const serialized: SerializedSchema = {
    components: components.map((comp) => {
      const sc: SerializedSchema['components'][number] = { component_id: comp.component_id, label: comp.label, expected_value: comp.expected_value, unit: comp.unit, tolerance: comp.tolerance, working_steps: comp.working_steps, depends_on: comp.depends_on, weight: comp.weight };
      if (recomputeIds[comp.component_id]) sc.recompute = recomputeIds[comp.component_id];
      return sc;
    }),
    params: { Pa, Pe, volatility: c.s, risk_free: c.r, time: t, pv_exercise: pvE, base_npv: c.base_npv ?? 0 },
  };
  void sDec; void rDec;
  return { schema: { components }, serialized };
}

// ── Model answer (code owns every figure + the decision; five-driver + limitations prose) ──
export function buildBsopModelAnswer(raw: BsopInputs, c: BsopComputed, prose: string, currency: string, kind: BsopKind): string {
  const m = (n: number) => money(currency, n);
  const lines: string[] = [];
  let step = 0; const S = () => ++step;
  const uLbl = raw.underlying_label ?? 'the value of the underlying asset';
  const eLbl = raw.exercise_label ?? 'the exercise price';
  const archetype =
    kind === 'option_to_delay' ? 'an **option to delay** (a call option on the deferred investment)'
    : kind === 'option_to_expand' ? 'an **option to expand** (a call option on the follow-on investment)'
    : kind === 'option_to_withdraw' ? 'an **option to withdraw / abandon** (a put option on the recoverable value; a redeploy/switch option sits in the same put family)'
    : 'a financial option valued directly with BSOP';

  lines.push('**Option valuation — Black-Scholes (BSOP)**', '');
  lines.push(`**Assumptions:** the option is valued with the Black-Scholes model on the five drivers below. BSOP prices a EUROPEAN option; N(d1) and N(d2) are computed exactly here, and a normal-table read at the 2-dp rounding of d1/d2 scores within the marking tolerance. ${kind === 'financial_product_valuation' ? 'The underlying is traded, so the model applies directly.' : `This is ${archetype}; the marked judgement is mapping the scenario to the five drivers.`}`, '');

  lines.push(`**Step ${S()} — The five drivers (identification${kind === 'financial_product_valuation' ? '' : ' + mapping'})**`, '',
    `| Driver | Maps to | Value |`,
    `|------|------|------|`,
    `| Underlying, Pₐ | ${uLbl} | ${m(c.Pa)} |`,
    `| Exercise, Pₑ | ${eLbl} | ${m(c.Pe)} |`,
    `| Volatility, s | annual volatility | ${pct2(c.s)} |`,
    `| Risk-free, r | risk-free rate | ${pct2(c.r)} |`,
    `| Time, t | time to expiry | ${fixedHalfUp(c.t, 1)} years |`,
    '');

  // The illustrative table-read pair for THIS drill's own d-values: N at d rounded to 2 dp (what
  // a student reading the printed normal tables would get). Injected so the claim matches the
  // display — the exact computed N is shown, and the table read is given as "either scores".
  const d1r = Math.round(c.d1 * 100) / 100, d2r = Math.round(c.d2 * 100) / 100;
  const nd1Table = normCdf(d1r), nd2Table = normCdf(d2r);
  lines.push(`**Step ${S()} — d1, d2 and the cumulative normals**`, '',
    `d1 = [ln(Pₐ/Pₑ) + (r + s²/2)·t] / (s·√t) = **${d4(c.d1)}**; d2 = d1 − s·√t = **${d4(c.d2)}**.`, '',
    `**N(d1) = ${d4(c.Nd1)}**, **N(d2) = ${d4(c.Nd2)}** (computed exactly; a normal-table read at d1 = ${fixedHalfUp(d1r, 2)} / d2 = ${fixedHalfUp(d2r, 2)} gives ${d4(nd1Table)} / ${d4(nd2Table)} — either scores in full).`, '');

  lines.push(`**Step ${S()} — Option value**`, '',
    `c = Pₐ·N(d1) − Pₑ·e^(−rt)·N(d2) = ${m(c.Pa)}×${d4(c.Nd1)} − ${m(c.pv_exercise)}×${d4(c.Nd2)} = **${m(c.call)}**.`, '');
  if (kind === 'option_to_withdraw') {
    lines.push(`By put-call parity, the abandonment (put) value = c − Pₐ + Pₑ·e^(−rt) = ${m(c.call)} − ${m(c.Pa)} + ${m(c.pv_exercise)} = **${m(c.put!)}**.`, '');
  }

  if (kind !== 'financial_product_valuation') {
    lines.push(`**Step ${S()} — The option and the decision (code-owned)**`, '');
    if (kind === 'option_to_delay') {
      lines.push(c.base_npv !== undefined
        ? `The option to delay is worth **${m(c.value)}**${c.defer ? `, which exceeds the immediate NPV of ${m(c.base_npv)} — the flexibility to wait for uncertainty to resolve adds more value than committing now, so **defer** and preserve the option.` : `, versus an immediate NPV of ${m(c.base_npv)}; the immediate NPV is the larger, so committing now is not dominated by waiting — invest, but price the option value into the timing.`}`
        : `The option to delay is worth **${m(c.value)}** — the value the flexibility to wait adds over a now-or-never decision.`, '');
    } else if (kind === 'option_to_expand') {
      lines.push(c.expanded_npv !== undefined
        ? `The expansion (growth) option is worth **${m(c.call)}**; the expanded value = base NPV ${m(c.base_npv!)} + ${m(c.call)} = **${m(c.expanded_npv)}**, so with the growth option the project **${c.accept ? 'is value-creating and should proceed' : 'still does not clear — the growth option alone does not justify it'}**.`
        : `The expansion (growth) option is worth **${m(c.call)}** — the value of the right, not the obligation, to scale up.`, '');
    } else if (kind === 'option_to_withdraw') {
      lines.push(c.expanded_npv !== undefined
        ? `The abandonment put is worth **${m(c.put!)}**; the project value WITH the option to withdraw = base NPV ${m(c.base_npv!)} + ${m(c.put!)} = **${m(c.expanded_npv)}**, so the downside protection **${c.accept ? 'turns the project value-positive and it should proceed' : 'improves but does not by itself rescue the project'}**.`
        : `The abandonment put is worth **${m(c.put!)}** — the value of the right to exit for the recoverable amount.`, '');
    }
  }

  lines.push(`**Step ${S()} — Interpretation, assumptions and limitations**`, '', prose, '');

  // Reconciliation
  const recon = kind === 'option_to_withdraw'
    ? `d1 ${d4(c.d1)} / d2 ${d4(c.d2)} → N ${d4(c.Nd1)}/${d4(c.Nd2)} → call ${m(c.call)} → put ${m(c.put!)}${c.expanded_npv !== undefined ? ` → with-option ${m(c.expanded_npv)}` : ''}`
    : kind === 'option_to_expand'
    ? `d1 ${d4(c.d1)} / d2 ${d4(c.d2)} → N ${d4(c.Nd1)}/${d4(c.Nd2)} → call ${m(c.call)}${c.expanded_npv !== undefined ? ` → expanded ${m(c.expanded_npv)}` : ''}`
    : `d1 ${d4(c.d1)} / d2 ${d4(c.d2)} → N ${d4(c.Nd1)}/${d4(c.Nd2)} → value ${m(c.value)}`;
  lines.push(`*Reconciliation: ${recon}. ✓*`);
  return lines.join('\n');
}
