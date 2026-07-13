// lib/acca/duration.ts
// AFM bond-duration calculator (B3f Macaulay/modified duration; B3g convexity rider on the
// limitations kind), calculator #6. Pure, deterministic, no model/DB. Same doctrine as the
// other calculators: code owns EVERY figure AND every figure-vs-figure verdict (the
// interest-rate-exposure ranking, the zero-vs-coupon duration comparison); the model authors
// PROSE only and never states a duration, a rate, or an inequality.
//
// Pure rates/bond family (like CAPM): no cash-flow tax schedule → P6 loss-relief is a
// structural no-op; no finance raised → no issue-cost analogue. See GENERATOR_DOCTRINE.
//
// House conventions (2026-07-13 rulings): flat stated YTM per bond (term structure is B3h /
// calc #7); annual coupons (a `freq` param is supported for a future semi-annual kind but no
// drill uses it here); modified = Macaulay / (1 + y/freq). Graded chain: price + weighted_sum
// → macaulay → modified → price_sensitivity, OFR carrying. Durations are in YEARS (abs
// tolerance ±0.05); price/weighted_sum are money (relative ±0.5%); the % price sensitivity
// uses abs ±0.1 pp.

import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { fmt1, money, normaliseCurrency, type SerializedSchema } from './fcff';

export { normaliseCurrency };

const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
const absTol = (value: number): Tolerance => ({ kind: 'absolute', value });
const asDec = (v: number): number => (v > 1 ? v / 100 : v);
const pct2 = (frac: number): string => `${(frac * 100).toFixed(2)}%`;
const fmtY = (y: number): string => y.toFixed(3);       // duration in years, 3 dp
const df = (r: number, p: number): number => 1 / Math.pow(1 + r, p);
const EPS = 1e-9;

export type DurationKind = 'standard' | 'compare' | 'zero_coupon' | 'limitations';

export interface DurationBond {
  face_value:  number;   // redemption/par value
  coupon_rate: number;   // annual coupon rate, decimal (0 for a zero-coupon bond)
  maturity:    number;   // whole years to redemption
  ytm:         number;   // flat yield to maturity, decimal
  freq?:       number;   // coupons per year; default 1 (annual). Supported, unused this batch.
  label?:      string;
}

export interface DurationInputs {
  bond?:       DurationBond;   // standard / zero_coupon / limitations — the primary bond
  bond_b?:     DurationBond;   // compare — the second bond
  coupon_ref?: DurationBond;   // zero_coupon — an equivalent coupon bond for the comparison
  yield_shift?: number;        // standard / limitations — Δy (decimal, e.g. 0.01 = +100 bp)
}

export interface BondRow { period: number; year: number; cash_flow: number; df: number; pv: number; t_pv: number; }
export interface BondMetrics {
  label:        string;
  rows:         BondRow[];
  price:        number;   // Σ PV
  weighted_sum: number;   // Σ t·PV  (t in years)
  macaulay:     number;   // years
  modified:     number;   // years
  ytm:          number;
  maturity:     number;
  coupon_rate:  number;
  freq:         number;
}

function bondMetrics(b: DurationBond): BondMetrics {
  const y = asDec(b.ytm);
  const c = asDec(b.coupon_rate);
  const m = b.freq && b.freq > 0 ? b.freq : 1;
  const n = b.maturity;
  if (!(n > 0)) throw new Error(`maturity must be positive: ${n}`);
  if (y <= 0 || y >= 1) throw new Error(`ytm out of range (0,1): ${y}`);
  const perN = Math.round(n * m);
  const perRate = y / m;
  const couponPer = (b.face_value * c) / m;

  const rows: BondRow[] = [];
  let price = 0, weighted = 0;
  for (let p = 1; p <= perN; p++) {
    const cf = couponPer + (p === perN ? b.face_value : 0);
    const d = df(perRate, p);
    const pv = cf * d;
    const yearAtP = p / m;
    const tpv = yearAtP * pv;
    price += pv;
    weighted += tpv;
    rows.push({ period: p, year: yearAtP, cash_flow: cf, df: d, pv, t_pv: tpv });
  }
  const macaulay = weighted / price;          // years
  const modified = macaulay / (1 + perRate);  // years
  return { label: b.label ?? 'the bond', rows, price, weighted_sum: weighted, macaulay, modified, ytm: y, maturity: n, coupon_rate: c, freq: m };
}

export interface DurationComputed {
  kind: DurationKind;
  primary: BondMetrics;
  currency?: string;
  // standard / limitations
  yield_shift?:      number;   // decimal
  price_sensitivity?: number;  // % ΔP/P for the shift (= −modified × Δy × 100)
  // compare
  bond_b?:           BondMetrics;
  more_exposed?:     'primary' | 'bond_b' | 'equal';
  // zero_coupon
  coupon_ref?:       BondMetrics;
  zero_identity_ok?: boolean;  // macaulay == maturity (within EPS)
}

function req<T>(v: T | undefined, name: string): T {
  if (v === undefined) throw new Error(`Duration input "${name}" is required for this kind`);
  return v;
}

export function computeDuration(raw: DurationInputs, kind: DurationKind): DurationComputed {
  if (kind === 'compare') {
    const a = bondMetrics(req(raw.bond, 'bond'));
    const b = bondMetrics(req(raw.bond_b, 'bond_b'));
    const more: 'primary' | 'bond_b' | 'equal' =
      a.modified > b.modified + EPS ? 'primary' : a.modified < b.modified - EPS ? 'bond_b' : 'equal';
    return { kind, primary: a, bond_b: b, more_exposed: more };
  }
  if (kind === 'zero_coupon') {
    const zero = bondMetrics(req(raw.bond, 'bond'));
    const ref = bondMetrics(req(raw.coupon_ref, 'coupon_ref'));
    return { kind, primary: zero, coupon_ref: ref, zero_identity_ok: Math.abs(zero.macaulay - zero.maturity) < 1e-6 };
  }
  // standard / limitations
  const p = bondMetrics(req(raw.bond, 'bond'));
  const dy = asDec(req(raw.yield_shift, 'yield_shift'));
  const sensitivity = -p.modified * dy * 100; // % ΔP/P
  return { kind, primary: p, yield_shift: dy, price_sensitivity: sensitivity };
}

// ── Schema: price + weighted_sum → macaulay → modified → price_sensitivity (OFR carries) ──
function chainFor(prefix: string, bm: BondMetrics, currency: string, withSensitivity: { dy: number; value: number } | null, includeModified = true): { components: Component[]; recomputeIds: Record<string, string> } {
  const moneyUnit = `${currency}m`;
  const components: Component[] = [
    { component_id: `${prefix}price`, label: `${cap(bm.label)} — price (Σ PV)`, expected_value: bm.price, unit: moneyUnit, tolerance: rel(0.5), working_steps: ['Σ of each cash flow discounted at the YTM'] },
    { component_id: `${prefix}weighted_sum`, label: `${cap(bm.label)} — Σ t·PV`, expected_value: bm.weighted_sum, unit: `${currency}m·yr`, tolerance: rel(0.5), working_steps: ['Σ (year × discounted cash flow)'] },
    { component_id: `${prefix}macaulay`, label: `${cap(bm.label)} — Macaulay duration`, expected_value: bm.macaulay, unit: 'years', tolerance: absTol(0.05), depends_on: [`${prefix}weighted_sum`, `${prefix}price`], recompute: (d) => d[`${prefix}weighted_sum`] / d[`${prefix}price`], working_steps: ['= Σ t·PV ÷ price'] },
  ];
  const recomputeIds: Record<string, string> = { [`${prefix}macaulay`]: 'macaulay_ratio' };
  // The reference bond in the zero-coupon comparison needs only its Macaulay (for the
  // duration<maturity contrast), so its modified duration is not graded — it isn't shown.
  if (includeModified) {
    components.push({ component_id: `${prefix}modified`, label: `${cap(bm.label)} — modified duration`, expected_value: bm.modified, unit: 'years', tolerance: absTol(0.05), depends_on: [`${prefix}macaulay`], recompute: (d) => d[`${prefix}macaulay`] / (1 + bm.ytm / bm.freq), working_steps: [`= Macaulay ÷ (1 + y${bm.freq > 1 ? '/' + bm.freq : ''})`] });
    recomputeIds[`${prefix}modified`] = 'modified_from_macaulay';
  }
  if (withSensitivity) {
    components.push({
      component_id: `${prefix}price_sensitivity`, label: `${cap(bm.label)} — estimated price change for the yield shift`, expected_value: withSensitivity.value, unit: '%', tolerance: absTol(0.1),
      depends_on: [`${prefix}modified`], recompute: (d) => -d[`${prefix}modified`] * withSensitivity.dy * 100, working_steps: ['ΔP/P ≈ −modified × Δy'],
    });
    recomputeIds[`${prefix}price_sensitivity`] = 'price_sensitivity_linear';
  }
  return { components, recomputeIds };
}
const cap = (s: string): string => s.charAt(0).toUpperCase() + s.slice(1);

export function buildDurationSchema(raw: DurationInputs, c: DurationComputed, currency: string, kind: DurationKind): { schema: AnswerSchema; serialized: SerializedSchema } {
  let components: Component[] = [];
  let recomputeIds: Record<string, string> = {};
  const sens = c.price_sensitivity !== undefined && c.yield_shift !== undefined ? { dy: c.yield_shift, value: c.price_sensitivity } : null;

  if (kind === 'compare') {
    const a = chainFor('a_', c.primary, currency, null);
    const b = chainFor('b_', c.bond_b!, currency, null);
    components = [...a.components, ...b.components];
    recomputeIds = { ...a.recomputeIds, ...b.recomputeIds };
  } else if (kind === 'zero_coupon') {
    const z = chainFor('', c.primary, currency, null);
    const r = chainFor('ref_', c.coupon_ref!, currency, null, false); // ref: only Macaulay graded
    components = [...z.components, ...r.components];
    recomputeIds = { ...z.recomputeIds, ...r.recomputeIds };
  } else {
    const p = chainFor('', c.primary, currency, sens);
    components = p.components;
    recomputeIds = p.recomputeIds;
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
      ytm: c.primary.ytm, maturity: c.primary.maturity, coupon_rate: c.primary.coupon_rate, freq: c.primary.freq,
      face_value: raw.bond?.face_value ?? 0, yield_shift: c.yield_shift ?? 0,
    },
  };
  return { schema: { components }, serialized };
}

// ── Model answer: code owns every figure + the ranking / zero-vs-coupon verdicts ──
function bondTable(m: (n: number) => string, bm: BondMetrics): string[] {
  const lines = [`| Year | Cash flow | DF @ ${pct2(bm.ytm / bm.freq)} | PV | t·PV |`, `|------|------|------|------|------|`];
  for (const r of bm.rows) lines.push(`| ${r.year} | ${m(r.cash_flow)} | ${r.df.toFixed(3)} | ${m(r.pv)} | ${m(r.t_pv)} |`);
  lines.push(`| **Totals** | | | **${m(bm.price)}** | **${m(bm.weighted_sum)}** |`);
  return lines;
}

export function buildDurationModelAnswer(raw: DurationInputs, c: DurationComputed, prose: string, currency: string, kind: DurationKind): string {
  const m = (n: number) => money(currency, n);
  const p = c.primary;
  const lines: string[] = [];
  let step = 0;
  const S = () => ++step;

  lines.push('**Bond duration — interest-rate exposure**', '');
  lines.push(
    `**Assumptions:** each bond is priced at its stated flat yield to maturity; coupons are annual; the modified duration is Macaulay ÷ (1 + y). Duration measures interest-rate exposure — the modified duration is the approximate % change in price for a 1% (100 bp) change in yield: ΔP/P ≈ −modified × Δy.`,
    '',
  );

  if (kind === 'compare') {
    const b = c.bond_b!;
    lines.push(`**Step ${S()} — ${cap(p.label)}: price, Σ t·PV and duration**`, '', ...bondTable(m, p), '');
    lines.push(`Macaulay = ${m(p.weighted_sum)} ÷ ${m(p.price)} = **${fmtY(p.macaulay)} years**; modified = ${fmtY(p.macaulay)} ÷ (1 + ${pct2(p.ytm)}) = **${fmtY(p.modified)} years**.`, '');
    lines.push(`**Step ${S()} — ${cap(b.label)}: price, Σ t·PV and duration**`, '', ...bondTable(m, b), '');
    lines.push(`Macaulay = ${m(b.weighted_sum)} ÷ ${m(b.price)} = **${fmtY(b.macaulay)} years**; modified = **${fmtY(b.modified)} years**.`, '');
    lines.push(`**Step ${S()} — Ranking interest-rate exposure (code-owned)**`, '');
    const winner = c.more_exposed === 'primary' ? p : c.more_exposed === 'bond_b' ? b : null;
    lines.push(
      winner
        ? `${cap(winner.label)} has the **higher modified duration** (${fmtY(winner.modified)} vs ${fmtY((winner === p ? b : p).modified)} years), so it is the **more exposed** to a rise in yields — a 1% rate rise moves its price roughly ${fmtY(Math.abs(winner.modified))}% against you, versus ${fmtY(Math.abs((winner === p ? b : p).modified))}% for the other. Hedge or shorten that exposure first.`
        : `Both facilities carry the **same modified duration** (${fmtY(p.modified)} years), so they are equally exposed to a yield change.`,
      '',
    );
  } else if (kind === 'zero_coupon') {
    const ref = c.coupon_ref!;
    lines.push(`**Step ${S()} — ${cap(p.label)} (zero-coupon): price and duration**`, '', ...bondTable(m, p), '');
    lines.push(`With a single cash flow at redemption, the Macaulay duration equals the maturity exactly: **${fmtY(p.macaulay)} years = ${p.maturity}-year maturity**; modified = **${fmtY(p.modified)} years**.`, '');
    lines.push(`**Step ${S()} — An equivalent ${ref.maturity}-year coupon bond, for contrast**`, '', ...bondTable(m, ref), '');
    lines.push(`Macaulay = **${fmtY(ref.macaulay)} years**, which is **shorter than its ${ref.maturity}-year maturity** — the intervening coupons pull the weighted-average time forward.`, '');
    lines.push(`**Step ${S()} — What this shows (code-owned)**`, '');
    lines.push(`A zero-coupon bond's duration is its maturity (${fmtY(p.macaulay)} years); a coupon bond of the same maturity always has a **shorter** duration (${fmtY(ref.macaulay)} years here) and so is **less** exposed to a given yield change, all else equal.`, '');
  } else {
    // standard / limitations
    lines.push(`**Step ${S()} — Price, Σ t·PV and duration**`, '', ...bondTable(m, p), '');
    lines.push(`**Macaulay duration = Σ t·PV ÷ price = ${m(p.weighted_sum)} ÷ ${m(p.price)} = ${fmtY(p.macaulay)} years.**`, '');
    lines.push(`**Modified duration = Macaulay ÷ (1 + ${pct2(p.ytm)}) = ${fmtY(p.modified)} years.**`, '');
    lines.push(`**Step ${S()} — Interest-rate sensitivity**`, '');
    const dy = c.yield_shift ?? 0;
    lines.push(`For a ${dy >= 0 ? '+' : ''}${pct2(dy)} (${Math.round(dy * 10000)} bp) shift in the yield, the first-order estimate is ΔP/P ≈ −modified × Δy = **${c.price_sensitivity!.toFixed(2)}%** (a fall of about ${m(Math.abs(p.price * c.price_sensitivity! / 100))} on this ${m(p.price)} position).`, '');
    if (kind === 'limitations') {
      lines.push(`**Step ${S()} — Limitations: why this is only an approximation (convexity)**`, '');
      lines.push(`Modified duration is a **linear (first-order)** estimate: it assumes price moves in a straight line with yield. Because the true price–yield relationship is **curved (convex)**, over a shift this large the linear estimate **overstates the price fall when yields rise and understates the gain when yields fall** — the second-order convexity term corrects for that curvature. Duration alone is reliable only for small, parallel yield moves; a full assessment adds convexity (and, for non-parallel shifts, the term structure).`, '');
    }
  }

  lines.push(`**Step ${S()} — Evaluation / advice to the board**`, '');
  lines.push(prose, '');
  if (kind !== 'limitations') {
    lines.push(`*(Modified duration is a linear, small-yield-change approximation; for a large shift the convex price–yield curve makes the true move differ — see the limitations of duration.)*`, '');
  }

  // Reconciliation
  if (kind === 'compare') lines.push(`*Reconciliation: ${cap(p.label)} modified ${fmtY(p.modified)}y vs ${cap(c.bond_b!.label)} modified ${fmtY(c.bond_b!.modified)}y — more exposed = ${c.more_exposed === 'primary' ? p.label : c.more_exposed === 'bond_b' ? c.bond_b!.label : 'equal'}. ✓*`);
  else if (kind === 'zero_coupon') lines.push(`*Reconciliation: zero Macaulay ${fmtY(p.macaulay)}y = ${p.maturity}y maturity; coupon-bond Macaulay ${fmtY(c.coupon_ref!.macaulay)}y < maturity. ✓*`);
  else lines.push(`*Reconciliation: price ${m(p.price)}, Σ t·PV ${m(p.weighted_sum)} → Macaulay ${fmtY(p.macaulay)}y → modified ${fmtY(p.modified)}y → ΔP/P ${c.price_sensitivity!.toFixed(2)}% ✓*`);

  return lines.join('\n');
}
