// lib/acca/recompute-registry.ts
// Resolves a PERSISTED schema's `recompute` STRING id back to the deterministic function the
// owning family module wrote. Pure: no DB, no model, no side effects.
//
// WHY THIS EXISTS. `numeric-verifier.ts` takes `recompute?: (deps) => number` — a live lambda.
// A stored `answer_schema` can only carry a string. Until this module existed the ids were
// WRITE-ONLY: every family declared a local `recomputeIds` map at serialisation time and
// nothing ever read one back, so a stored schema could not carry OFR at all.
//
// TWO RULES THIS MODULE ENFORCES, both deliberate:
//
//   1. RESOLVE AT LOAD, NOT AT CALL. `hydrateAnswerSchema` resolves every id up front and
//      THROWS on the first one it cannot. A schema that silently dropped an unresolvable
//      `recompute` would fall back to the authored expected value, which quietly DISABLES
//      carry-through — a correct method on an own wrong input would be marked `incorrect`
//      instead of `carried`. Failing loudly is the whole point; never soften this to a warn.
//
//   2. NO GUESSED DISCRIMINANTS. Where the maths branches (irhedge `side`/`direction`,
//      fxhedge `quote_direction`, capm `gearing_basis`), the branch is READ FROM PARAMS. If
//      the param is absent the entry throws. Inferring a branch — "own_ve is non-zero so it
//      must be project_specific", "assume borrower" — would silently mismark every row that
//      went the other way.
//
// SOURCING RULE: each function below is transcribed from the family module that WRITES the
// id, and calls that family's own exported helpers (`regearBeta`, `parityDifferential`,
// `toHome`, `discountFactor`, `asDec`, `t2`) rather than restating their bodies. The maths is
// NOT re-derived here. Each entry cites its source file and line.
//
// SCOPE (Grant ruling 2026-07-28): the 18 ids used by the 5 numeric requirements of AFM Mock
// Paper 1 — NOT all 92 in the corpus. The other 74 are listed in UNRESOLVED_RECOMPUTE_IDS,
// explicitly unresolved rather than silently absent, and their families are fixed when next
// authored. See docs/AFM_SURFACED.md.

import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { regearBeta } from './capm';
import { parityDifferential, type ParityBasis } from './international';
import { toHome, asDec as fxAsDec, t2 as fxT2, type QuoteDirection } from './fxhedge';
import { discountFactor } from './npv';
import type { ParamValue } from './valuation';

export type RecomputeParams = Record<string, ParamValue>;
/** A resolved recompute: the student's own upstream figures + the drill's stored params. */
export type RecomputeFn = (deps: Record<string, number>, params: RecomputeParams) => number;

// ── Param accessors. Absent or wrong-typed is an ERROR, never a default. ──
function num(params: RecomputeParams, key: string, id: string): number {
  const v = params[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`recompute "${id}": params.${key} must be a finite number, got ${JSON.stringify(v)}`);
  }
  return v;
}
function str(params: RecomputeParams, key: string, id: string): string {
  const v = params[key];
  if (typeof v !== 'string' || v.length === 0) {
    throw new Error(`recompute "${id}": params.${key} must be a non-empty string discriminant, got ${JSON.stringify(v)} — this row predates the widened params and cannot be verified; re-serialise it rather than guessing the branch`);
  }
  return v;
}
/** The single upstream figure of a one-dependency component (the dep id varies by kind). */
function soleDep(deps: Record<string, number>, id: string): number {
  const vals = Object.values(deps);
  if (vals.length !== 1) throw new Error(`recompute "${id}": expected exactly 1 dependency, got ${vals.length}`);
  return vals[0];
}
/** Trailing integer of a component id (`home_cf_3` → 3, `fx_2` → 2, `npv_1` → 1). */
function idIndex(componentId: string, id: string): number {
  const m = /(\d+)$/.exec(componentId);
  if (!m) throw new Error(`recompute "${id}": cannot read a trailing index off component id "${componentId}"`);
  return Number(m[1]);
}
/** capm/valuation share `wacc_mv_weighted` but weight on different gearing — read, never infer. */
function gearingPair(params: RecomputeParams, id: string): { ve: number; vd: number } {
  const basis = str(params, 'gearing_basis', id);
  if (basis === 'own') return { ve: num(params, 'own_ve', id), vd: num(params, 'own_vd', id) };
  if (basis === 'company') return { ve: num(params, 'company_ve', id), vd: num(params, 'company_vd', id) };
  throw new Error(`recompute "${id}": unknown gearing_basis "${basis}" (expected "own" or "company")`);
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// THE REGISTRY — 18 scoped ids
// ═══════════════════════════════════════════════════════════════════════════════════════
export const RECOMPUTE_REGISTRY: Readonly<Record<string, RecomputeFn>> = Object.freeze({
  // ── capm.ts (calculator #5) ──
  // capm.ts:268 — regearBeta(d.asset_beta, raw.own_ve, raw.own_vd, tax, betaD)
  mm_regear: (d, p) => {
    const { ve, vd } = gearingPair(p, 'mm_regear');
    return regearBeta(soleDep(d, 'mm_regear'), ve, vd, num(p, 'tax_rate', 'mm_regear'), num(p, 'debt_beta', 'mm_regear'));
  },
  // capm.ts:271 — (rf + d.regeared_beta * mrp) * 100
  capm_ke: (d, p) => (num(p, 'rf', 'capm_ke') + soleDep(d, 'capm_ke') * num(p, 'mrp', 'capm_ke')) * 100,
  // capm.ts:273 — d.ke * (Ve/(Ve+Vd)) + kd(1−T)×100 × (Vd/(Ve+Vd))
  wacc_mv_weighted: (d, p) => {
    const { ve, vd } = gearingPair(p, 'wacc_mv_weighted');
    const total = ve + vd;
    if (total === 0) throw new Error('recompute "wacc_mv_weighted": Ve+Vd is zero — the gearing_basis names an empty pair');
    return soleDep(d, 'wacc_mv_weighted') * (ve / total)
      + num(p, 'kd', 'wacc_mv_weighted') * (1 - num(p, 'tax_rate', 'wacc_mv_weighted')) * 100 * (vd / total);
  },

  // ── international.ts (calculator #10, K1) ──
  // international.ts:447 — d[prev] * k, k = parityDifferential(basis, rate_home, rate_foreign)
  parity_step_y2: parityStep('parity_step_y2'),
  parity_step_y3: parityStep('parity_step_y3'),
  parity_step_y4: parityStep('parity_step_y4'),
  // international.ts:486 — y.foreign_remit_net / d[fx_t]   (UNTAXED branch only; see homeCfConvert)
  home_cf_convert_y1: homeCfConvert('home_cf_convert_y1', 1),
  home_cf_convert_y2: homeCfConvert('home_cf_convert_y2', 2),
  home_cf_convert_y3: homeCfConvert('home_cf_convert_y3', 3),
  home_cf_convert_y4: homeCfConvert('home_cf_convert_y4', 4),
  // international.ts:497 — Σ (d[home_cf_t] × df_t) − home_outlay, df_t = discountFactor(r, t)
  // (international.ts:180 sets y.df = discountFactor(r, t), so no stored factors are needed.)
  intl_npv_sum_less_outlay: (d, p) => {
    const id = 'intl_npv_sum_less_outlay';
    const r = num(p, 'discount_rate', id);
    let sum = 0;
    for (const [cid, v] of Object.entries(d)) sum += v * discountFactor(r, idIndex(cid, id));
    return sum - num(p, 'home_outlay', id);
  },

  // ── fxhedge.ts (calculator #11, K1 forward-vs-MMH) ──
  // fxhedge.ts:620 — toHome(d.mmh_foreign_now, raw.spot, raw.quote_direction)
  fxh_mmh_convert_spot: (d, p) => toHome(soleDep(d, 'fxh_mmh_convert_spot'), num(p, 'spot', 'fxh_mmh_convert_spot'), str(p, 'quote_direction', 'fxh_mmh_convert_spot') as QuoteDirection),
  // fxhedge.ts:623 — d.mmh_home_now * (1 + asDec(growLeg) * t); growLeg picked by direction
  fxh_mmh_grow_home: (d, p) => {
    const id = 'fxh_mmh_grow_home';
    const dir = str(p, 'direction', id);
    if (dir !== 'receipt' && dir !== 'payment') throw new Error(`recompute "${id}": unknown direction "${dir}" (expected "receipt" or "payment")`);
    const growLeg = dir === 'receipt' ? num(p, 'rate_home_deposit', id) : num(p, 'rate_home_borrow', id);
    return soleDep(d, id) * (1 + fxAsDec(growLeg) * fxT2({ months: num(p, 'months', id) }));
  },

  // ── risk.ts (calculator #3, K1 ENPV) ──
  // risk.ts:369 — ids.reduce((s, id, i) => s + probs[i] * d[id], 0)
  // The probability vector is flattened to prob_1..prob_n, indexed to npv_1..npv_n.
  enpv_prob_weighted: (d, p) => {
    const id = 'enpv_prob_weighted';
    let sum = 0;
    for (const [cid, v] of Object.entries(d)) sum += num(p, `prob_${idIndex(cid, id)}`, id) * v;
    return sum;
  },

  // ── irhedge.ts (calculator #12, K1 futures) ──
  // irhedge.ts:549 — 100 − s0.base_rate − d.unexpired_basis
  irh_closing_price: (d, p) => 100 - num(p, 'base_rate', 'irh_closing_price') - soleDep(d, 'irh_closing_price'),
  // irhedge.ts:555 — ((side==='buy' ? closing−opening : opening−closing)/100) × size × months/12 × contracts
  irh_futures_profit: (d, p) => {
    const id = 'irh_futures_profit';
    const side = str(p, 'side', id);
    if (side !== 'buy' && side !== 'sell') throw new Error(`recompute "${id}": unknown side "${side}" (expected "buy" or "sell")`);
    const f0 = num(p, 'futures0', id);
    const move = side === 'buy' ? d.closing_price - f0 : f0 - d.closing_price;
    return (move / 100) * num(p, 'contract_size', id) * (num(p, 'contract_months', id) / 12) * d.contracts;
  },
  // irhedge.ts:559 — depositor ? mm + profit : mm − profit
  irh_net: (d, p) => {
    const id = 'irh_net';
    const dir = str(p, 'direction', id);
    if (dir !== 'borrower' && dir !== 'depositor') throw new Error(`recompute "${id}": unknown direction "${dir}" (expected "borrower" or "depositor")`);
    return dir === 'depositor' ? d.mm_interest + d.futures_profit : d.mm_interest - d.futures_profit;
  },
  // irhedge.ts:562 — (d.net_outcome / raw.notional) × (12 / raw.hedge_months) × 100
  irh_effective: (d, p) => (soleDep(d, 'irh_effective') / num(p, 'notional', 'irh_effective')) * (12 / num(p, 'hedge_months', 'irh_effective')) * 100,
});

function parityStep(id: string): RecomputeFn {
  return (d, p) => soleDep(d, id) * parityDifferential(str(p, 'parity_basis', id) as ParityBasis, num(p, 'rate_home', id), num(p, 'rate_foreign', id));
}
function homeCfConvert(id: string, year: number): RecomputeFn {
  return (d, p) => {
    // The TAXED branch of the same id (international.ts:479) uses a different numerator
    // (remittance-pre-additional-tax, net of an `add_tax_t` dependency) and is NOT in scope.
    // depends_on tells the two apart: untaxed depends on fx_t alone.
    const cids = Object.keys(d);
    if (cids.length !== 1 || !/^fx_\d+$/.test(cids[0])) {
      throw new Error(`recompute "${id}": only the UNTAXED branch is in scope (depends_on must be exactly [fx_${year}]); this row has [${cids.join(', ')}] — the additional-home-tax branch is unresolved, see UNRESOLVED_RECOMPUTE_IDS`);
    }
    return num(p, `remit_net_${year}`, id) / d[cids[0]];
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// OUT OF SCOPE — measured against the live corpus 2026-07-28
// ═══════════════════════════════════════════════════════════════════════════════════════
// The 74 ids written by the 49 published AFM drills that this registry does NOT resolve.
// Listed explicitly so an unresolvable id is a NAMED gap, never a silent absence: a caller
// hitting one gets a "known unresolved" error rather than "unknown id", and the enumeration
// test asserts REGISTRY ∪ UNRESOLVED covers the whole measured corpus with no overlap.
//
// STATUS QUO, NOT A NEW DEFECT: these ids have never been resolvable — they were write-only
// before this module existed too. No published row's behaviour changed. Each family becomes
// resolvable when it is next authored and re-serialised with its discriminants.
//
// NOTE `wacc_mv_weighted` is IN the registry but is also written by valuation.ts:545 with a
// different closure (weights stored directly as `we`/`wd`). The entry above reads
// `gearing_basis`, which only capm writes, so a valuation-authored row throws rather than
// being silently weighted on the wrong pair.
export const UNRESOLVED_RECOMPUTE_IDS: readonly string[] = Object.freeze([
  'apv_sum', 'base_npv_sum_less_outlay', 'base_plus_call', 'base_plus_put', 'bsop_call',
  'bsop_d1', 'bsop_d2', 'capacity_add_parent', 'capacity_minus_proposed', 'capm_keu',
  'disc_rate_sensitivity_over_r', 'duration_ratio', 'equity_fcfe_perpetuity',
  'equity_minus_offer', 'equity_value_strip_debt', 'fair_minus_market',
  'fcfe_after_tax_interest', 'fcfe_dividend_capacity', 'firm_value_perpetuity_growth',
  'fxh_futures_convert', 'fxh_futures_total', 'fxh_lock_in', 'fxh_option_net',
  'fxh_option_premium', 'fxh_premium_convert', 'fxh_strike_convert', 'fxh_swap_convert',
  'fxh_swap_total', 'home_cf_convert_y5', 'home_cf_release_convert', 'intl_npv_from_fx',
  'intl_remit_npv', 'irh_col_buyprem', 'irh_col_net', 'irh_col_netprem', 'irh_col_sellprem',
  'irh_opt_net', 'irh_opt_payoff', 'irh_opt_premium', 'irh_swap_abenefit', 'irh_swap_bbenefit',
  'irh_swap_gain', 'irh_swap_netgain', 'irr_interpolate', 'kd_interpolation', 'macaulay_ratio',
  'mirr_from_tv', 'modified_from_macaulay', 'norm_cdf_d1', 'norm_cdf_d2', 'npv_at_radr_rate',
  'npv_at_rate', 'npv_sum_less_outlay', 'parity_step_y5', 'price_sensitivity_linear',
  'principal_times_delta_kd', 'put_call_parity', 'pv_discount_keu_y1', 'pv_discount_keu_y2',
  'pv_discount_keu_y3', 'pv_discount_keu_y4', 'pv_discount_keu_y5', 'pv_discount_keu_y6',
  'pv_discount_y1', 'pv_discount_y2', 'pv_discount_y3', 'pv_discount_y4', 'pv_discount_y5',
  'sensitivity_100_npv_over_pv', 'spread_from_yields', 'sub_remit_convert', 'terminal_value',
  'wacc_from_delta_kd', 'yield_interpolation',
]);

/** Every recompute id observed across the published AFM corpus + the mock, measured
 *  2026-07-28 (49 published `acca_drills` + 5 numeric `acca_case_requirements`). The
 *  enumeration test pins REGISTRY ∪ UNRESOLVED against this. */
export const MEASURED_CORPUS_RECOMPUTE_IDS: readonly string[] = Object.freeze(
  [...Object.keys(RECOMPUTE_REGISTRY), ...UNRESOLVED_RECOMPUTE_IDS].sort(),
);

export class UnresolvedRecomputeError extends Error {}

/** Resolve one id. Throws — never returns undefined, never degrades to "no recompute". */
export function resolveRecompute(id: string): RecomputeFn {
  const fn = RECOMPUTE_REGISTRY[id];
  if (fn) return fn;
  if (UNRESOLVED_RECOMPUTE_IDS.includes(id)) {
    throw new UnresolvedRecomputeError(`recompute id "${id}" is KNOWN but deliberately unresolved (out of the Mock Paper 1 scope). Its family must be re-serialised with its discriminants before a stored schema using it can be verified. See lib/acca/recompute-registry.ts and docs/AFM_SURFACED.md.`);
  }
  throw new UnresolvedRecomputeError(`recompute id "${id}" is UNKNOWN — it is in neither the registry nor the measured corpus list. A family has started writing an id nobody registered.`);
}

/** A stored component as it comes back off `answer_schema` jsonb. */
export interface StoredComponent {
  component_id: string;
  label?: string;
  expected_value: number;
  unit?: string;
  tolerance: Tolerance;
  working_steps?: string[];
  depends_on?: string[];
  recompute?: string;
  weight?: number;
}
export interface StoredSchema {
  components: StoredComponent[];
  params?: RecomputeParams;
}

/**
 * RESOLVE AT LOAD. Turn a stored schema into one `verifyNumericAnswer` can consume, binding
 * each `recompute` id to its registry function and the row's own params.
 *
 * Throws on the FIRST unresolvable id. It must never return a schema with a silently missing
 * recompute: that would disable carry-through for that component and mark a correct method
 * `incorrect`. A partial hydration is worse than no hydration, because it looks like it worked.
 */
export function hydrateAnswerSchema(stored: StoredSchema): AnswerSchema {
  const params = stored.params ?? {};
  const components: Component[] = stored.components.map((sc) => {
    const c: Component = {
      component_id: sc.component_id,
      label: sc.label,
      expected_value: sc.expected_value,
      unit: sc.unit,
      tolerance: sc.tolerance,
      working_steps: sc.working_steps,
      depends_on: sc.depends_on,
      weight: sc.weight,
    };
    if (sc.recompute) {
      const fn = resolveRecompute(sc.recompute);          // throws loudly; no fallback
      c.recompute = (deps) => fn(deps, params);
    }
    return c;
  });
  return { components };
}
