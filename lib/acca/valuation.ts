// lib/acca/valuation.ts  (was fcff.ts — renamed batch #9, 2026-07-16, git mv history preserved)
// AFM business-valuation family: FCFF (firm), FCFE (equity), dividend capacity, and a
// two-method valuation compare. Pure, deterministic, no model/DB/side-effects.
// Code owns EVERY figure a drill states — including comparisons between computed figures
// and break-even sensitivities — so the model never asserts a number, an inequality, or a
// break-even in prose (docs/AFM_NUMERIC_VERIFICATION_DESIGN.md §1; adversarial pattern
// fixes 1 & 2). Shared by the generator (scripts/generate-afm-drills.ts) and any patch/
// serve-time caller so there is one source of truth for the arithmetic and the advice glue.

import { fixedHalfUp } from './rounding';
import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';

// ── Formatting / currency ──
export const fmt1 = (n: number): string => fixedHalfUp(n, 1);
const pct2 = (frac: number): string => `${(frac * 100).toFixed(2)}%`;

// Money display honouring the drill's currency: ISO codes read "AUD 179.0m"; bare symbols
// read "$179.0m". Threads the model-set currency through instead of a hardcoded "$".
export function normaliseCurrency(raw: string | undefined): string {
  const c = (raw ?? '$').trim();
  return /^[A-Za-z]{2,4}$/.test(c) ? c.toUpperCase() : (c || '$');
}
export function money(currency: string, n: number): string {
  return /^[A-Za-z]{2,4}$/.test(currency) ? `${currency} ${fmt1(n)}m` : `${currency}${fmt1(n)}m`;
}

// A SIGNED surplus/shortfall, worded by sign — never "surplus -X" (walk-log finding 3, 2026-07-17).
// A positive figure reads "a surplus of X"; a negative reads "a shortfall of |X|". Shared by every
// calculator that displays a signed capacity/margin (dividend capacity here, international K4).
export function signedSurplus(currency: string, n: number): string {
  return n >= 0 ? `a surplus of ${money(currency, n)}` : `a shortfall of ${money(currency, Math.abs(n))}`;
}

// Rates sometimes arrive as percentages (10) rather than decimals (0.10); normalise.
function asDecimalRate(v: number): number {
  return v > 1 ? v / 100 : v;
}
const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });

// The FCFF "build" — the one line every valuation kind (and international.ts, one-way) shares.
// FCFF = PBIT × (1 − t) + depreciation − capex − ΔWorking capital. Extracted so there is ONE
// FCFF-build implementation the whole family (and the international calculator) composes.
export interface FcffBuild {
  pbit: number; tax_rate: number; depreciation: number; capex: number; delta_working_capital: number;
}
export function fcffFromBuild(b: FcffBuild): number {
  const t = asDecimalRate(b.tax_rate);
  return b.pbit * (1 - t) + b.depreciation - b.capex - b.delta_working_capital;
}

// ── Inputs / outputs ──
export interface FcffInputs {
  pbit:                  number; // operating profit before interest and tax ($m)
  tax_rate:              number; // decimal fraction, e.g. 0.25
  depreciation:          number; // non-cash add-back ($m)
  capex:                 number; // capital reinvestment ($m)
  delta_working_capital: number; // increase in working capital ($m)
  wacc:                  number; // decimal fraction, e.g. 0.10
  growth_rate:           number; // perpetuity growth, decimal fraction, e.g. 0.03
  debt_value:            number; // market value of debt ($m)
  offer_price:           number; // vendor's indicative EQUITY offer under test ($m)
}

export interface FcffComputed {
  fcff:         number;
  firm_value:   number;
  equity_value: number;
  // Offer comparison — code owns the inequality (pattern fix 1)
  offer_price:       number;
  equity_vs_offer:   number;  // equity − offer (signed): positive → offer below intrinsic
  offer_supportable: boolean; // equity ≥ offer
  // Break-even sensitivities to the offer — code owns them (pattern fix 2)
  growth_floor: number; // min long-run growth at which equity == offer (all else equal)
  wacc_ceiling: number; // max WACC at which equity == offer
  fcff_floor:   number; // min maintainable FCFF at which equity == offer
}

export function computeFcff(raw: FcffInputs): FcffComputed {
  const tax   = asDecimalRate(raw.tax_rate);
  const wacc  = asDecimalRate(raw.wacc);
  const g     = asDecimalRate(raw.growth_rate);
  const debt  = raw.debt_value;
  const offer = raw.offer_price;

  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`FCFF input "${k}" is not a finite number: ${JSON.stringify(v)}`);
    }
  }
  if (tax < 0 || tax >= 1)   throw new Error(`tax_rate out of range (0,1): ${tax}`);
  if (wacc <= 0 || wacc >= 1) throw new Error(`wacc out of range (0,1): ${wacc}`);
  if (g < 0)                 throw new Error(`growth_rate must be ≥ 0: ${g}`);
  if (wacc - g < 0.005)      throw new Error(`WACC (${wacc}) must exceed growth (${g}) by ≥ 0.5% for a stable perpetuity`);
  if (!(offer > 0))          throw new Error(`offer_price must be positive: ${offer}`);

  const fcff = fcffFromBuild(raw);
  if (!(fcff > 0)) throw new Error(`Computed FCFF must be positive for a coherent valuation drill: ${fcff}`);

  const firm_value = (fcff * (1 + g)) / (wacc - g);
  const equity_value = firm_value - debt;
  if (!(equity_value > 0)) throw new Error(`Equity value must be positive (firm ${firm_value} − debt ${debt})`);

  // Break-evens: the firm value that makes equity == offer is (offer + debt).
  const firmNeeded = offer + debt;
  const growth_floor = (firmNeeded * wacc - fcff) / (fcff + firmNeeded);
  const wacc_ceiling = g + (fcff * (1 + g)) / firmNeeded;
  const fcff_floor   = (firmNeeded * (wacc - g)) / (1 + g);
  for (const [k, v] of Object.entries({ growth_floor, wacc_ceiling, fcff_floor })) {
    if (!Number.isFinite(v)) throw new Error(`Break-even ${k} is not finite: ${v}`);
  }

  return {
    fcff, firm_value, equity_value,
    offer_price: offer,
    equity_vs_offer: equity_value - offer,
    offer_supportable: equity_value >= offer,
    growth_floor, wacc_ceiling, fcff_floor,
  };
}

// ── Answer schema (§2) — live functions for gates/OFR + serialisable projection for jsonb ──
interface SerializedComponent {
  component_id:   string;
  label?:         string;
  expected_value: number;
  unit?:          string;
  tolerance:      Tolerance;
  working_steps?: string[];
  depends_on?:    string[];
  recompute?:     string;   // rule-id, resolved via registry at serve time (design §16)
  weight?:        number;
}
export interface SerializedSchema {
  components: SerializedComponent[];
  params:     Record<string, number>;
}

export function buildFcffSchema(raw: FcffInputs, c: FcffComputed, currency: string): { schema: AnswerSchema; serialized: SerializedSchema } {
  const tax   = asDecimalRate(raw.tax_rate);
  const wacc  = asDecimalRate(raw.wacc);
  const g     = asDecimalRate(raw.growth_rate);
  const debt  = raw.debt_value;
  const offer = raw.offer_price;
  const moneyUnit = `${currency}m`; // "AUDm" / "$m" — classified as money by validate-schema

  const components: Component[] = [
    {
      component_id: 'fcff',
      label: 'Free cash flow to firm (FCFF)',
      expected_value: c.fcff,
      unit: moneyUnit,
      tolerance: rel(0.5),
      working_steps: [
        'FCFF = PBIT × (1 − t) + depreciation − capex − ΔWC',
        `= ${fmt1(raw.pbit)} × (1 − ${tax}) + ${fmt1(raw.depreciation)} − ${fmt1(raw.capex)} − ${fmt1(raw.delta_working_capital)} = ${fmt1(c.fcff)}`,
      ],
    },
    {
      component_id: 'firm_value',
      label: 'Enterprise (firm) value',
      expected_value: c.firm_value,
      unit: moneyUnit,
      tolerance: rel(0.5),
      depends_on: ['fcff'],
      recompute: (d) => (d.fcff * (1 + g)) / (wacc - g),
      working_steps: [
        'Firm value = FCFF × (1 + g) / (WACC − g)   [firm flow discounted at WACC, not Ke]',
        `= ${fmt1(c.fcff)} × (1 + ${g}) / (${wacc} − ${g}) = ${fmt1(c.firm_value)}`,
      ],
    },
    {
      component_id: 'equity_value',
      label: 'Equity value',
      expected_value: c.equity_value,
      unit: moneyUnit,
      tolerance: rel(0.5),
      depends_on: ['firm_value'],
      recompute: (d) => d.firm_value - debt,
      working_steps: [
        'Equity value = firm value − market value of debt',
        `= ${fmt1(c.firm_value)} − ${fmt1(debt)} = ${fmt1(c.equity_value)}`,
      ],
    },
    {
      // The offer test IS a marked step (the question asks whether the offer is justified),
      // so the signed difference is a gradeable component. It carries under OFR from the
      // student's own equity value. (offer_supportable — a boolean — needs the enum verdict
      // kind, and the break-evens are enrichment not marked steps: both banked with E2, see
      // AFM_NUMERIC_VERIFICATION_DESIGN.md §9.)
      component_id: 'equity_vs_offer',
      label: 'Equity value vs vendor offer (signed)',
      expected_value: c.equity_vs_offer,
      unit: moneyUnit,
      tolerance: rel(0.5),
      depends_on: ['equity_value'],
      recompute: (d) => d.equity_value - offer,
      working_steps: [
        "Equity value − vendor's equity offer (justification test)",
        `= ${fmt1(c.equity_value)} − ${fmt1(offer)} = ${fmt1(c.equity_vs_offer)}`,
      ],
    },
  ];

  const recomputeIds: Record<string, string | undefined> = {
    fcff: undefined,
    firm_value: 'firm_value_perpetuity_growth',
    equity_value: 'equity_value_strip_debt',
    equity_vs_offer: 'equity_minus_offer',
  };

  const serialized: SerializedSchema = {
    components: components.map((comp) => {
      const s: SerializedComponent = {
        component_id: comp.component_id,
        label: comp.label,
        expected_value: comp.expected_value,
        unit: comp.unit,
        tolerance: comp.tolerance,
        working_steps: comp.working_steps,
        depends_on: comp.depends_on,
        weight: comp.weight,
      };
      const rid = recomputeIds[comp.component_id];
      if (rid) s.recompute = rid;
      return s;
    }),
    params: { wacc, growth_rate: g, debt_value: debt, tax_rate: tax, offer_price: raw.offer_price },
  };

  return { schema: { components }, serialized };
}

// Build the worked model answer. Code authors every figure AND every figure-vs-figure
// verdict (the offer test, Step 4) and the break-even sensitivities (Step 5); the model's
// `prose` is qualitative reasoning only and is dropped into Step 6. Interest stays OUT of
// FCFF; a wrong discount rate is a mismatch, never a stated directional effect.
export function buildFcffModelAnswer(raw: FcffInputs, c: FcffComputed, prose: string, currency: string): string {
  const tax  = asDecimalRate(raw.tax_rate);
  const wacc = asDecimalRate(raw.wacc);
  const g    = asDecimalRate(raw.growth_rate);
  const m = (n: number) => money(currency, n);

  const verdict = c.offer_supportable
    ? `is **below** the derived intrinsic equity value of ${m(c.equity_value)} by **${m(Math.abs(c.equity_vs_offer))}**, so on the base-case assumptions the offer is **supportable**`
    : `is **above** the derived intrinsic equity value of ${m(c.equity_value)} by **${m(Math.abs(c.equity_vs_offer))}**, so on the base-case assumptions the offer is **not supportable at this price**`;

  const recommendation = c.offer_supportable
    ? 'On the base case the offer is supportable; the board may proceed subject to satisfactory due diligence on the assumptions below — the value has headroom, but that headroom is only as robust as the growth, WACC and reinvestment assumptions that drive it.'
    : 'On the base case the offer exceeds intrinsic value; the board should seek a price reduction or decline, unless the assumptions below can be credibly revised in the vendor\'s favour.';

  return [
    '**Firm and equity valuation (free cash flow to firm)**',
    '',
    `**Assumptions:** the inputs are current maintainable base-year figures; the first forecast free cash flow arises in one year and grows at g = ${pct2(g)} in perpetuity; the ${m(raw.debt_value)} of debt is stated at market value; no surplus cash or non-operating assets are added.`,
    '',
    '**Step 1 — Free cash flow to firm (FCFF)**',
    '',
    'FCFF = PBIT × (1 − t) + depreciation − capex − ΔWorking capital',
    `= ${fmt1(raw.pbit)} × (1 − ${tax}) + ${fmt1(raw.depreciation)} − ${fmt1(raw.capex)} − ${fmt1(raw.delta_working_capital)}`,
    `= **${m(c.fcff)}**  *(FCFF excludes financing flows — interest is NOT deducted here; the return to debt is captured in the WACC)*`,
    '',
    '**Step 2 — Enterprise (firm) value**',
    '',
    'Firm value = FCFF × (1 + g) / (WACC − g)  *(a firm-level flow is discounted at WACC, the blended rate for all capital providers)*',
    `= ${fmt1(c.fcff)} × (1 + ${g}) / (${wacc} − ${g}) = **${m(c.firm_value)}**`,
    '',
    '**Step 3 — Equity value**',
    '',
    'Equity value = firm value − market value of debt',
    `= ${fmt1(c.firm_value)} − ${fmt1(raw.debt_value)} = **${m(c.equity_value)}**  *(strip the debt — the FCFF value is the whole firm)*`,
    '',
    '**Step 4 — Offer test (base case)**',
    '',
    `The vendor's equity offer of ${m(c.offer_price)} ${verdict}.`,
    '',
    '**Step 5 — Sensitivity (break-even to the offer)**',
    '',
    `Holding all else equal, the offer is justified so long as long-run growth holds at or above **~${pct2(c.growth_floor)}** (vs ${pct2(g)} assumed), the WACC stays at or below **~${pct2(c.wacc_ceiling)}** (vs ${pct2(wacc)}), and maintainable FCFF stays at or above **~${m(c.fcff_floor)}** (vs ${m(c.fcff)}).`,
    '',
    '**Step 6 — Advice to the board**',
    '',
    recommendation,
    '',
    prose,
    '',
    `*Reconciliation: firm value ${m(c.firm_value)} − debt ${m(raw.debt_value)} = equity ${m(c.equity_value)} ✓*`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════
// BATCH #9 — the valuation FAMILY (2026-07-16): FCFE (equity), dividend capacity, a
// two-method valuation compare, and the FCFF composition front-end (CAPM-derived WACC).
// Each kind owns its arithmetic AND every figure-vs-figure verdict; the model authors prose
// only. valuation.ts stays CAPM-FREE (capm.ts imports the money helpers from here, so
// importing capm.ts back would be a cycle) — the CAPM-derived (ke, wacc) are computed by the
// GENERATOR via computeCapm('org_wacc') and passed IN (the composition ruling; K1 light-compose).
// ═══════════════════════════════════════════════════════════════════════════════

export type ValuationKind = 'fcff_enterprise' | 'fcfe_equity' | 'dividend_capacity' | 'valuation_compare';

function finiteGuard(raw: Record<string, unknown>, ctx: string): void {
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${ctx} input "${k}" is not finite: ${JSON.stringify(v)}`);
  }
}

// ── K1 composition: the CAPM front-end display block (ke, wacc DERIVED by computeCapm('org_wacc')
//    and passed in; βe + structure supplied for the shown working). No peer ungearing (ruling). ──
export interface CapmFront {
  rf: number; mrp: number; tax_rate: number;           // decimals or %
  company_equity_beta: number; company_ve: number; company_vd: number; kd: number;
  ke: number;   // % — CAPM-derived (Ke = Rf + βe·MRP), passed in
  wacc: number; // % — MV-weighted WACC, passed in
}

// ── K2: FCFE (equity value) — a maintainable NO-GROWTH perpetuity with constant debt (net
//    borrowing = 0), which makes the FCFF-route and FCFE-route equity values reconcile EXACTLY
//    (E = FCFE/Ke = FCFF/WACC_implied − D, proven under g=0, nb=0). The reconciliation is the
//    K2 teaching point and is INTERNAL to this one target (ruling). ──
export interface FcfeInputs {
  pbit: number; tax_rate: number; depreciation: number; capex: number; delta_working_capital: number;
  ke: number;          // SUPPLIED cost of equity (ruling: K2 rate supplied)
  kd: number;          // pre-tax cost of debt (for after-tax interest + the implied WACC cross-check)
  debt_value: number;
  offer_price: number; // vendor equity offer under test
}
export interface FcfeComputed {
  fcff: number; fcfe: number;
  equity_value: number;        // FCFE / Ke — the PRIMARY route, NO debt bridge
  firm_value: number;          // equity + debt (implied)
  wacc_implied: number;        // decimal — from value weights, for the reconciling cross-check
  equity_via_fcff: number;     // FCFF / WACC_implied − debt  (== equity_value by construction)
  reconciliation_gap: number;  // equity_value − equity_via_fcff (== 0)
  equity_vs_offer: number; offer_supportable: boolean;
}
export function computeFcfe(raw: FcfeInputs): FcfeComputed {
  finiteGuard(raw as unknown as Record<string, unknown>, 'FCFE');
  const t = asDecimalRate(raw.tax_rate), ke = asDecimalRate(raw.ke), kd = asDecimalRate(raw.kd);
  const D = raw.debt_value, offer = raw.offer_price;
  if (t < 0 || t >= 1) throw new Error(`tax_rate out of range [0,1): ${t}`);
  if (ke <= 0 || ke >= 1) throw new Error(`ke out of range (0,1): ${ke}`);
  if (kd <= 0 || kd >= 1) throw new Error(`kd out of range (0,1): ${kd}`);
  if (!(D > 0)) throw new Error(`debt_value must be positive: ${D}`);
  if (!(offer > 0)) throw new Error(`offer_price must be positive: ${offer}`);

  const fcff = fcffFromBuild(raw);
  const fcfe = fcff - kd * D * (1 - t);                 // constant debt, no new borrowing (g=0)
  if (!(fcfe > 0)) throw new Error(`Computed FCFE must be positive: ${fcfe}`);

  const equity_value = fcfe / ke;                        // no-growth perpetuity, discounted at Ke
  const firm_value = equity_value + D;
  const we = equity_value / firm_value, wd = D / firm_value;
  const wacc_implied = we * ke + wd * kd * (1 - t);      // value-weighted → exact reconciliation
  const equity_via_fcff = fcff / wacc_implied - D;
  const reconciliation_gap = equity_value - equity_via_fcff;

  return {
    fcff, fcfe, equity_value, firm_value, wacc_implied, equity_via_fcff, reconciliation_gap,
    equity_vs_offer: equity_value - offer,
    offer_supportable: equity_value >= offer,
  };
}

// ── K3: dividend capacity (FCFE-based cash available to equity) + the sustainability verdict.
//    Net borrowing IS allowed here (real dividend capacity can draw on new debt); no discounting. ──
export interface DividendInputs {
  pbit: number; tax_rate: number; depreciation: number; capex: number; delta_working_capital: number;
  kd: number; debt_value: number;
  net_borrowing?: number;   // net new debt raised in the year (default 0)
  proposed_dividend: number; // the board's intended / current total dividend under test
  shares?: number;          // optional — for a per-share capacity figure
}
export interface DividendComputed {
  fcff: number; fcfe: number; dividend_capacity: number;  // capacity == FCFE (cash to equity)
  proposed_dividend: number; capacity_surplus: number;    // capacity − proposed (signed)
  sustainable: boolean;                                   // capacity ≥ proposed
  capacity_per_share: number | null;
}
export function computeDividendCapacity(raw: DividendInputs): DividendComputed {
  finiteGuard(raw as unknown as Record<string, unknown>, 'Dividend');
  const t = asDecimalRate(raw.tax_rate), kd = asDecimalRate(raw.kd);
  const D = raw.debt_value, nb = raw.net_borrowing ?? 0, proposed = raw.proposed_dividend;
  if (t < 0 || t >= 1) throw new Error(`tax_rate out of range [0,1): ${t}`);
  if (kd <= 0 || kd >= 1) throw new Error(`kd out of range (0,1): ${kd}`);
  if (!(D > 0)) throw new Error(`debt_value must be positive: ${D}`);
  if (!(proposed > 0)) throw new Error(`proposed_dividend must be positive: ${proposed}`);

  const fcff = fcffFromBuild(raw);
  const fcfe = fcff - kd * D * (1 - t) + nb;
  if (!(fcfe > 0)) throw new Error(`Computed FCFE (dividend capacity) must be positive: ${fcfe}`);
  const capacity_per_share = raw.shares && raw.shares > 0 ? fcfe / raw.shares : null;

  return {
    fcff, fcfe, dividend_capacity: fcfe, proposed_dividend: proposed,
    capacity_surplus: fcfe - proposed, sustainable: fcfe >= proposed, capacity_per_share,
  };
}

// ── K4: two-method valuation compare → a value RANGE → the offer verdict. Method A = FCFF-DCF
//    (Gordon growth); Method B = a relative multiple (P/E on equity earnings, or EV/EBITDA → strip
//    debt). Code owns both figures, the range, and the offer's position. (Ruling: Gordon default +
//    exit/relative multiple; method inputs supplied.) ──
export type CompareMultiple = 'pe' | 'ev_ebitda';
export interface CompareInputs {
  pbit: number; tax_rate: number; depreciation: number; capex: number; delta_working_capital: number;
  wacc: number; growth_rate: number; debt_value: number;   // DCF method
  multiple_type: CompareMultiple; multiple: number;         // relative method
  earnings?: number;   // pe: equity = multiple × earnings
  ebitda?: number;     // ev_ebitda: EV = multiple × ebitda; equity = EV − debt
  offer_price: number;
}
export interface CompareComputed {
  fcff: number; firm_value_dcf: number; equity_dcf: number;
  equity_multiple: number; method_label: string; enterprise_multiple: number | null;
  equity_low: number; equity_high: number;
  offer_price: number; offer_position: 'below' | 'within' | 'above';
}
export function computeValuationCompare(raw: CompareInputs): CompareComputed {
  finiteGuard(raw as unknown as Record<string, unknown>, 'Compare');
  const t = asDecimalRate(raw.tax_rate), wacc = asDecimalRate(raw.wacc), g = asDecimalRate(raw.growth_rate);
  const D = raw.debt_value, offer = raw.offer_price;
  if (t < 0 || t >= 1) throw new Error(`tax_rate out of range [0,1): ${t}`);
  if (wacc <= 0 || wacc >= 1) throw new Error(`wacc out of range (0,1): ${wacc}`);
  if (g < 0) throw new Error(`growth_rate must be ≥ 0: ${g}`);
  if (wacc - g < 0.005) throw new Error(`WACC (${wacc}) must exceed growth (${g}) by ≥ 0.5%`);
  if (!(D > 0)) throw new Error(`debt_value must be positive: ${D}`);
  if (!(raw.multiple > 0)) throw new Error(`multiple must be positive: ${raw.multiple}`);
  if (!(offer > 0)) throw new Error(`offer_price must be positive: ${offer}`);

  const fcff = fcffFromBuild(raw);
  if (!(fcff > 0)) throw new Error(`Computed FCFF must be positive: ${fcff}`);
  const firm_value_dcf = (fcff * (1 + g)) / (wacc - g);
  const equity_dcf = firm_value_dcf - D;
  if (!(equity_dcf > 0)) throw new Error(`DCF equity must be positive: ${equity_dcf}`);

  let equity_multiple: number, method_label: string, enterprise_multiple: number | null = null;
  if (raw.multiple_type === 'pe') {
    if (!(raw.earnings! > 0)) throw new Error('pe compare needs positive earnings');
    equity_multiple = raw.multiple * raw.earnings!;                 // P/E is an EQUITY multiple — no debt strip
    method_label = `P/E ${fmt1(raw.multiple)}× on earnings ${fmt1(raw.earnings!)}`;
  } else {
    if (!(raw.ebitda! > 0)) throw new Error('ev_ebitda compare needs positive ebitda');
    enterprise_multiple = raw.multiple * raw.ebitda!;               // EV/EBITDA is an ENTERPRISE multiple → strip debt
    equity_multiple = enterprise_multiple - D;
    method_label = `${fmt1(raw.multiple)}× × EBITDA ${fmt1(raw.ebitda!)}`;   // the EV line strips debt separately (below)
  }
  if (!(equity_multiple > 0)) throw new Error(`Relative-method equity must be positive: ${equity_multiple}`);

  const equity_low = Math.min(equity_dcf, equity_multiple);
  const equity_high = Math.max(equity_dcf, equity_multiple);
  const offer_position: 'below' | 'within' | 'above' =
    offer < equity_low ? 'below' : offer > equity_high ? 'above' : 'within';

  return {
    fcff, firm_value_dcf, equity_dcf, equity_multiple, method_label, enterprise_multiple,
    equity_low, equity_high, offer_price: offer, offer_position,
  };
}

// ── The BRIDGE GATE core (calculator #9): asserts the flow↔rate↔bridge invariants the family
//    teaches. Delegated to by validate-schema.ts::validateValuationBridge (GATE-11), the
//    deterministic guard against the VALUATION-PLUMBING failure class. ──
export interface ValuationBridgeCheck { ok: boolean; reason?: string }
export function checkValuationBridge(
  kind: ValuationKind,
  c: FcffComputed | FcfeComputed | DividendComputed | CompareComputed,
  ctx: { debt_value: number },
): ValuationBridgeCheck {
  const EPS = 1e-6;
  const relClose = (a: number, b: number) => Math.abs(a - b) <= Math.abs(b) * 0.001 + EPS;
  if (kind === 'fcff_enterprise') {
    const f = c as FcffComputed;
    if (!relClose(f.firm_value - ctx.debt_value, f.equity_value))
      return { ok: false, reason: `FCFF bridge broken: firm ${f.firm_value} − debt ${ctx.debt_value} ≠ equity ${f.equity_value}` };
    return { ok: true };
  }
  if (kind === 'fcfe_equity') {
    const f = c as FcfeComputed;
    // FCFE route must NOT strip debt (equity is direct) AND must reconcile with the FCFF route.
    if (!relClose(f.equity_value, f.equity_via_fcff))
      return { ok: false, reason: `FCFE↔FCFF reconciliation gap ${f.reconciliation_gap} (equity ${f.equity_value} vs via-FCFF ${f.equity_via_fcff})` };
    if (!(f.wacc_implied > 0 && f.wacc_implied < 1))
      return { ok: false, reason: `implied WACC out of range: ${f.wacc_implied}` };
    return { ok: true };
  }
  if (kind === 'dividend_capacity') {
    const f = c as DividendComputed;
    if (!relClose(f.dividend_capacity, f.fcfe))
      return { ok: false, reason: `dividend capacity ${f.dividend_capacity} ≠ FCFE ${f.fcfe}` };
    if (f.sustainable !== (f.dividend_capacity >= f.proposed_dividend))
      return { ok: false, reason: 'sustainability verdict inconsistent with capacity vs proposed' };
    return { ok: true };
  }
  // valuation_compare
  const f = c as CompareComputed;
  if (!relClose(f.firm_value_dcf - ctx.debt_value, f.equity_dcf))
    return { ok: false, reason: `DCF bridge broken in compare: firm ${f.firm_value_dcf} − debt ${ctx.debt_value} ≠ equity ${f.equity_dcf}` };
  if (!(f.equity_low <= f.equity_high + EPS))
    return { ok: false, reason: `range inverted: low ${f.equity_low} > high ${f.equity_high}` };
  const pos = f.offer_price < f.equity_low ? 'below' : f.offer_price > f.equity_high ? 'above' : 'within';
  if (pos !== f.offer_position)
    return { ok: false, reason: `offer_position ${f.offer_position} inconsistent with range` };
  return { ok: true };
}

// ── Schema helpers ──
const abs = (value: number): Tolerance => ({ kind: 'absolute', value });   // rate/% tolerance (CAPM precedent ±0.05)
function toSerialized(components: Component[], recomputeIds: Record<string, string | undefined>, params: Record<string, number>): SerializedSchema {
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

// ── K1 COMPOSED (fcff_enterprise): the CAPM cost-of-capital front-end (ke → wacc) grafted onto
//    the FCFF chain, so a wrong Ke/WACC carries under OFR into firm value (the composition ruling). ──
export function buildFcffComposedSchema(raw: FcffInputs, c: FcffComputed, capm: CapmFront, currency: string): { schema: AnswerSchema; serialized: SerializedSchema } {
  const g = asDecimalRate(raw.growth_rate), debt = raw.debt_value, offer = raw.offer_price;
  const moneyUnit = `${currency}m`;
  const we = capm.company_ve / (capm.company_ve + capm.company_vd);
  const wd = capm.company_vd / (capm.company_ve + capm.company_vd);
  const kdDec = asDecimalRate(capm.kd), taxDec = asDecimalRate(capm.tax_rate);

  const components: Component[] = [
    { component_id: 'ke', label: 'Cost of equity (CAPM)', expected_value: capm.ke, unit: '%', tolerance: abs(0.05),
      working_steps: [`Ke = Rf + βe × MRP = ${pct2(asDecimalRate(capm.rf))} + ${capm.company_equity_beta} × ${pct2(asDecimalRate(capm.mrp))} = ${capm.ke.toFixed(2)}%`] },
    { component_id: 'wacc', label: 'WACC (MV-weighted)', expected_value: capm.wacc, unit: '%', tolerance: abs(0.05),
      depends_on: ['ke'], recompute: (d) => d.ke * we + kdDec * (1 - taxDec) * 100 * wd,
      working_steps: [`WACC = Ke×We + Kd(1−T)×Wd = Ke×${we.toFixed(3)} + ${pct2(kdDec)}×(1−${taxDec})×${wd.toFixed(3)}`] },
    { component_id: 'fcff', label: 'Free cash flow to firm (FCFF)', expected_value: c.fcff, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`FCFF = PBIT×(1−t) + dep − capex − ΔWC = ${fmt1(c.fcff)}`] },
    { component_id: 'firm_value', label: 'Enterprise (firm) value', expected_value: c.firm_value, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['fcff', 'wacc'], recompute: (d) => (d.fcff * (1 + g)) / (d.wacc / 100 - g),
      working_steps: [`Firm value = FCFF×(1+g)/(WACC−g)  [firm flow @ WACC]`] },
    { component_id: 'equity_value', label: 'Equity value', expected_value: c.equity_value, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['firm_value'], recompute: (d) => d.firm_value - debt,
      working_steps: [`Equity = firm value − debt = ${fmt1(c.firm_value)} − ${fmt1(debt)}`] },
    { component_id: 'equity_vs_offer', label: 'Equity value vs offer (signed)', expected_value: c.equity_vs_offer, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['equity_value'], recompute: (d) => d.equity_value - offer,
      working_steps: [`Equity − offer = ${fmt1(c.equity_value)} − ${fmt1(offer)}`] },
  ];
  const recomputeIds: Record<string, string | undefined> = {
    wacc: 'wacc_mv_weighted', firm_value: 'firm_value_perpetuity_growth', equity_value: 'equity_value_strip_debt', equity_vs_offer: 'equity_minus_offer',
  };
  const params = { ke: capm.ke, wacc: capm.wacc, growth_rate: g, debt_value: debt, tax_rate: taxDec, offer_price: offer, we, wd, kd: kdDec, company_ve: capm.company_ve };
  return { schema: { components }, serialized: toSerialized(components, recomputeIds, params) };
}

// ── K2 FCFE schema — fcff → fcfe → equity(@Ke) → vs offer (the reconciliation is model-answer display) ──
export function buildFcfeSchema(raw: FcfeInputs, c: FcfeComputed, currency: string): { schema: AnswerSchema; serialized: SerializedSchema } {
  const t = asDecimalRate(raw.tax_rate), ke = asDecimalRate(raw.ke), kd = asDecimalRate(raw.kd), D = raw.debt_value, offer = raw.offer_price;
  const moneyUnit = `${currency}m`;
  const components: Component[] = [
    { component_id: 'fcff', label: 'Free cash flow to firm (FCFF)', expected_value: c.fcff, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`FCFF = PBIT×(1−t) + dep − capex − ΔWC = ${fmt1(c.fcff)}`] },
    { component_id: 'fcfe', label: 'Free cash flow to equity (FCFE)', expected_value: c.fcfe, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['fcff'], recompute: (d) => d.fcff - kd * D * (1 - t),
      working_steps: [`FCFE = FCFF − after-tax interest = FCFF − Kd×D×(1−t) = ${fmt1(c.fcff)} − ${pct2(kd)}×${fmt1(D)}×(1−${t})`] },
    { component_id: 'equity_value', label: 'Equity value (FCFE @ Ke, no debt bridge)', expected_value: c.equity_value, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['fcfe'], recompute: (d) => d.fcfe / ke,
      working_steps: [`Equity = FCFE / Ke  [equity flow @ cost of equity; NO debt strip] = ${fmt1(c.fcfe)} / ${pct2(ke)}`] },
    { component_id: 'equity_vs_offer', label: 'Equity value vs offer (signed)', expected_value: c.equity_vs_offer, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['equity_value'], recompute: (d) => d.equity_value - offer,
      working_steps: [`Equity − offer = ${fmt1(c.equity_value)} − ${fmt1(offer)}`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { fcfe: 'fcfe_after_tax_interest', equity_value: 'equity_fcfe_perpetuity', equity_vs_offer: 'equity_minus_offer' };
  const params = { ke, kd, tax_rate: t, debt_value: D, offer_price: offer, wacc_implied: c.wacc_implied };
  return { schema: { components }, serialized: toSerialized(components, recomputeIds, params) };
}

// ── K3 dividend-capacity schema — fcff → fcfe(=capacity) → surplus vs proposed ──
export function buildDividendSchema(raw: DividendInputs, c: DividendComputed, currency: string): { schema: AnswerSchema; serialized: SerializedSchema } {
  const t = asDecimalRate(raw.tax_rate), kd = asDecimalRate(raw.kd), D = raw.debt_value, nb = raw.net_borrowing ?? 0, proposed = raw.proposed_dividend;
  const moneyUnit = `${currency}m`;
  const components: Component[] = [
    { component_id: 'fcff', label: 'Free cash flow to firm (FCFF)', expected_value: c.fcff, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`FCFF = PBIT×(1−t) + dep − capex − ΔWC = ${fmt1(c.fcff)}`] },
    { component_id: 'fcfe', label: 'FCFE = dividend capacity (cash available to equity)', expected_value: c.fcfe, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['fcff'], recompute: (d) => d.fcff - kd * D * (1 - t) + nb,
      working_steps: [`FCFE = FCFF − Kd×D×(1−t) + net new borrowing = ${fmt1(c.fcff)} − ${pct2(kd)}×${fmt1(D)}×(1−${t}) + ${fmt1(nb)}`] },
    { component_id: 'capacity_surplus', label: 'Capacity surplus over proposed dividend (signed)', expected_value: c.capacity_surplus, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['fcfe'], recompute: (d) => d.fcfe - proposed,
      working_steps: [`Surplus = dividend capacity − proposed dividend = ${fmt1(c.fcfe)} − ${fmt1(proposed)}`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { fcfe: 'fcfe_dividend_capacity', capacity_surplus: 'capacity_minus_proposed' };
  const params = { kd, tax_rate: t, debt_value: D, net_borrowing: nb, proposed_dividend: proposed };
  return { schema: { components }, serialized: toSerialized(components, recomputeIds, params) };
}

// ── K4 compare schema — fcff → firm_value_dcf → equity_dcf; equity_multiple (root); range/offer = display ──
export function buildCompareSchema(raw: CompareInputs, c: CompareComputed, currency: string): { schema: AnswerSchema; serialized: SerializedSchema } {
  const g = asDecimalRate(raw.growth_rate), wacc = asDecimalRate(raw.wacc), D = raw.debt_value;
  const moneyUnit = `${currency}m`;
  const components: Component[] = [
    { component_id: 'fcff', label: 'Free cash flow to firm (FCFF)', expected_value: c.fcff, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`FCFF = PBIT×(1−t) + dep − capex − ΔWC = ${fmt1(c.fcff)}`] },
    { component_id: 'firm_value_dcf', label: 'Enterprise value (FCFF-DCF, Gordon growth)', expected_value: c.firm_value_dcf, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['fcff'], recompute: (d) => (d.fcff * (1 + g)) / (wacc - g),
      working_steps: [`EV = FCFF×(1+g)/(WACC−g)`] },
    { component_id: 'equity_dcf', label: 'Equity value (DCF method)', expected_value: c.equity_dcf, unit: moneyUnit, tolerance: rel(0.5),
      depends_on: ['firm_value_dcf'], recompute: (d) => d.firm_value_dcf - D,
      working_steps: [`Equity (DCF) = EV − debt = ${fmt1(c.firm_value_dcf)} − ${fmt1(D)}`] },
    { component_id: 'equity_multiple',
      // FIX 3 (round-1, 2026-07-16): an EV/EBITDA multiple is an ENTERPRISE figure — the working must
      // show EV first, THEN strip debt (a single "= equity" line falsely implied mult×EBITDA = equity).
      label: c.enterprise_multiple !== null ? 'Equity value (EV/EBITDA, less debt)' : `Equity value (${c.method_label})`,
      expected_value: c.equity_multiple, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: c.enterprise_multiple !== null
        ? [`EV = ${c.method_label} = ${fmt1(c.enterprise_multiple)}`, `Equity = EV − debt ${fmt1(D)} = ${fmt1(c.equity_multiple)}`]
        : [`Equity = ${c.method_label} = ${fmt1(c.equity_multiple)}`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { firm_value_dcf: 'firm_value_perpetuity_growth', equity_dcf: 'equity_value_strip_debt' };
  const params = { wacc, growth_rate: g, debt_value: D, offer_price: c.offer_price, equity_low: c.equity_low, equity_high: c.equity_high };
  return { schema: { components }, serialized: toSerialized(components, recomputeIds, params) };
}

// ══ Model answers (code authors every figure + every figure-vs-figure verdict; prose is glue) ══

// K1 composed — CAPM cost-of-capital front-end + the FCFF valuation + offer test.
export function buildFcffComposedModelAnswer(raw: FcffInputs, c: FcffComputed, capm: CapmFront, prose: string, currency: string): string {
  const tax = asDecimalRate(raw.tax_rate), g = asDecimalRate(raw.growth_rate), m = (n: number) => money(currency, n);
  const we = capm.company_ve / (capm.company_ve + capm.company_vd), wd = capm.company_vd / (capm.company_ve + capm.company_vd);
  const verdict = c.offer_supportable
    ? `is **below** the intrinsic equity value of ${m(c.equity_value)} by **${m(Math.abs(c.equity_vs_offer))}** — on the base case the offer is **supportable**`
    : `is **above** the intrinsic equity value of ${m(c.equity_value)} by **${m(Math.abs(c.equity_vs_offer))}** — on the base case the offer is **not supportable at this price**`;
  // FIX 1 (pattern, K1-class, 2026-07-16): when the DCF equity diverges >50% from the ESTIMATED
  // equity figure used to weight the WACC (a private-target simplification), CODE injects the
  // divergence-reconciliation point FIRST — the board must not treat the offer as a bargain until the
  // gap is reconciled. This is a code-owned figure-vs-figure comparison (per the code-owns-verdicts
  // doctrine), not prose. `divergentEquity()` mirrors the generator lint that enforces it.
  const diverges = divergentEquity(c.equity_value, capm.company_ve);
  const ratio = c.equity_value / capm.company_ve;
  const reconBlock = diverges ? [
    '**Step 5 — Reconcile the equity divergence (before any bargain claim)**', '',
    `The model's equity value of ${m(c.equity_value)} is roughly ${ratio.toFixed(1)}× the ${m(capm.company_ve)} estimated equity figure used to weight the WACC. Before treating the offer as a bargain the board must reconcile that gap — through the perpetuity growth-versus-WACC spread, the maintainable capex assumption, or a stale/understated equity estimate. *(Weight circularity: re-weighting the WACC at the model's own equity value would raise the equity weight, lift the WACC and lower the valuation; using the estimated equity for the weights is the standard exam simplification for a private target.)*`, '',
  ] : [];
  const adviceNo = diverges ? 6 : 5;
  return [
    '**Firm and equity valuation (FCFF, with the cost of capital derived)**', '',
    `**Step 0 — Cost of capital (CAPM → WACC)**`, '',
    `Ke = Rf + βe × MRP = ${pct2(asDecimalRate(capm.rf))} + ${capm.company_equity_beta} × ${pct2(asDecimalRate(capm.mrp))} = **${capm.ke.toFixed(2)}%**`,
    `WACC = Ke×We + Kd(1−T)×Wd = ${capm.ke.toFixed(2)}%×${we.toFixed(3)} + ${pct2(asDecimalRate(capm.kd))}×(1−${asDecimalRate(capm.tax_rate)})×${wd.toFixed(3)} = **${capm.wacc.toFixed(2)}%**  *(the firm-level discount rate)*`, '',
    '**Step 1 — Free cash flow to firm (FCFF)**', '',
    `FCFF = PBIT×(1−t) + depreciation − capex − ΔWC = ${fmt1(raw.pbit)}×(1−${tax}) + ${fmt1(raw.depreciation)} − ${fmt1(raw.capex)} − ${fmt1(raw.delta_working_capital)} = **${m(c.fcff)}**  *(interest is NOT deducted — the return to debt is in the WACC)*`, '',
    '**Step 2 — Enterprise (firm) value**', '',
    `Firm value = FCFF×(1+g)/(WACC−g) = ${fmt1(c.fcff)}×(1+${g})/(${capm.wacc.toFixed(2)}% − ${pct2(g)}) = **${m(c.firm_value)}**  *(a firm flow is discounted at WACC)*`, '',
    '**Step 3 — Equity value (fair value of the equity)**', '',
    `Equity value = firm value − market value of debt = ${fmt1(c.firm_value)} − ${fmt1(raw.debt_value)} = **${m(c.equity_value)}**  *(strip the debt — this is the fair value of the equity)*`, '',
    '**Step 4 — Offer test (base case)**', '',
    `The vendor's equity offer of ${m(c.offer_price)} ${verdict}.`, '',
    ...reconBlock,
    `**Step ${adviceNo} — Advice to the board**`, '', prose, '',
    `*Reconciliation: WACC ${capm.wacc.toFixed(2)}% → firm ${m(c.firm_value)} − debt ${m(raw.debt_value)} = equity ${m(c.equity_value)} ✓*`,
  ].join('\n');
}

// FIX 1 lint predicate (pattern rule c): a fcff_enterprise DCF equity that diverges >50% from the
// estimated equity figure used to weight the WACC MUST carry the divergence-reconciliation point.
// Shared by the model-answer builder (injects it) and the generator gate (enforces it).
export const VALUATION_DIVERGENCE_THRESHOLD = 0.5;
export function divergentEquity(dcfEquity: number, equityWeight: number): boolean {
  return equityWeight > 0 && Math.abs(dcfEquity - equityWeight) / equityWeight > VALUATION_DIVERGENCE_THRESHOLD;
}

// K2 FCFE — equity via FCFE @ Ke (no bridge), then the FCFF-route cross-check that reconciles.
export function buildFcfeModelAnswer(raw: FcfeInputs, c: FcfeComputed, prose: string, currency: string): string {
  const t = asDecimalRate(raw.tax_rate), ke = asDecimalRate(raw.ke), kd = asDecimalRate(raw.kd), m = (n: number) => money(currency, n);
  const verdict = c.offer_supportable
    ? `is **below** the intrinsic equity value of ${m(c.equity_value)} by **${m(Math.abs(c.equity_vs_offer))}** — the offer is **supportable**`
    : `is **above** the intrinsic equity value of ${m(c.equity_value)} by **${m(Math.abs(c.equity_vs_offer))}** — the offer is **not supportable at this price**`;
  return [
    '**Equity valuation (free cash flow to equity)**', '',
    `**Assumptions:** a maintainable no-growth perpetuity with constant debt (no net new borrowing); FCFE is discounted at the cost of equity Ke = ${pct2(ke)}; debt is ${m(raw.debt_value)} at market value.`, '',
    '**Step 1 — Free cash flow to firm (FCFF)**', '',
    `FCFF = PBIT×(1−t) + depreciation − capex − ΔWC = ${fmt1(raw.pbit)}×(1−${t}) + ${fmt1(raw.depreciation)} − ${fmt1(raw.capex)} − ${fmt1(raw.delta_working_capital)} = **${m(c.fcff)}**`, '',
    '**Step 2 — Free cash flow to equity (FCFE)**', '',
    `FCFE = FCFF − after-tax interest = ${fmt1(c.fcff)} − Kd×D×(1−t) = ${fmt1(c.fcff)} − ${pct2(kd)}×${fmt1(raw.debt_value)}×(1−${t}) = **${m(c.fcfe)}**  *(FCFE nets the financing that FCFF left out)*`, '',
    '**Step 3 — Equity value (fair value of the equity)**', '',
    `Equity value = FCFE / Ke = ${fmt1(c.fcfe)} / ${pct2(ke)} = **${m(c.equity_value)}**  *(an equity flow is discounted at the cost of equity — and you do NOT strip debt again; FCFE is already an equity number; this is the fair value of the equity)*`, '',
    '**Step 4 — Cross-check: the FCFF route reconciles**', '',
    `Implied firm value = equity + debt = ${fmt1(c.equity_value)} + ${fmt1(raw.debt_value)} = ${m(c.firm_value)}; the value-weighted WACC = **${pct2(c.wacc_implied)}**. Discounting FCFF at that WACC and stripping debt gives ${fmt1(c.fcff)} / ${pct2(c.wacc_implied)} − ${fmt1(raw.debt_value)} = **${m(c.equity_via_fcff)}** — the same equity value. The two routes reconcile.`, '',
    '**Step 5 — Offer test**', '',
    `The vendor's equity offer of ${m(raw.offer_price)} ${verdict}.`, '',
    '**Step 6 — Advice to the board**', '', prose, '',
    `*Reconciliation: FCFE ${m(c.fcfe)} / Ke ${pct2(ke)} = equity ${m(c.equity_value)} = FCFF route ${m(c.equity_via_fcff)} ✓*`,
  ].join('\n');
}

// K3 dividend capacity — cash available to equity + sustainability of the proposed dividend.
export function buildDividendModelAnswer(raw: DividendInputs, c: DividendComputed, prose: string, currency: string): string {
  const t = asDecimalRate(raw.tax_rate), kd = asDecimalRate(raw.kd), nb = raw.net_borrowing ?? 0, m = (n: number) => money(currency, n);
  const verdict = c.sustainable
    ? `capacity **exceeds** the proposed dividend by **${m(Math.abs(c.capacity_surplus))}**, so the dividend is **covered by this year's cash generation** and is sustainable on the base case`
    : `capacity **falls short** of the proposed dividend by **${m(Math.abs(c.capacity_surplus))}**, so the proposed dividend is **NOT covered by cash generated** and would have to be funded from reserves or new finance — a red flag on sustainability`;
  const perShare = c.capacity_per_share !== null ? `\n\nDividend capacity per share = ${fmt1(c.dividend_capacity)} / ${fmt1(raw.shares!)} shares = **${c.capacity_per_share!.toFixed(3)}** per share.` : '';
  return [
    '**Dividend capacity and dividend policy**', '',
    `**Assumptions:** dividend capacity is the CASH available to equity holders this year (free cash flow to equity), not accounting profit; debt is ${m(raw.debt_value)}; net new borrowing of ${m(nb)} is included as a source.`, '',
    '**Step 1 — Free cash flow to firm (FCFF)**', '',
    `FCFF = PBIT×(1−t) + depreciation − capex − ΔWC = ${fmt1(raw.pbit)}×(1−${t}) + ${fmt1(raw.depreciation)} − ${fmt1(raw.capex)} − ${fmt1(raw.delta_working_capital)} = **${m(c.fcff)}**`, '',
    '**Step 2 — Dividend capacity (FCFE)**', '',
    `Dividend capacity = FCFF − after-tax interest + net new borrowing = ${fmt1(c.fcff)} − ${pct2(kd)}×${fmt1(raw.debt_value)}×(1−${t}) + ${fmt1(nb)} = **${m(c.dividend_capacity)}**${perShare}`, '',
    '**Step 3 — Sustainability of the proposed dividend**', '',
    `Against the proposed dividend of ${m(c.proposed_dividend)}, the ${verdict}.`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: capacity ${m(c.dividend_capacity)} − proposed ${m(c.proposed_dividend)} = ${signedSurplus(currency, c.capacity_surplus)} ✓*`,
  ].join('\n');
}

// K4 valuation compare — two methods → a range → the offer's position.
export function buildCompareModelAnswer(raw: CompareInputs, c: CompareComputed, prose: string, currency: string): string {
  const t = asDecimalRate(raw.tax_rate), wacc = asDecimalRate(raw.wacc), g = asDecimalRate(raw.growth_rate), m = (n: number) => money(currency, n);
  const posWord = c.offer_position === 'below' ? `**below** the ${m(c.equity_low)}–${m(c.equity_high)} range — it looks **cheap**; the board could bid and still leave value on the table`
    : c.offer_position === 'above' ? `**above** the ${m(c.equity_low)}–${m(c.equity_high)} range — it looks **full/expensive**; the board should justify the premium with synergies or decline`
    : `**within** the ${m(c.equity_low)}–${m(c.equity_high)} range — it is a **defensible** price on these methods; negotiate around it`;
  const relLine = c.enterprise_multiple !== null
    ? `Enterprise value = ${c.method_label} = ${m(c.enterprise_multiple)}; equity = ${m(c.enterprise_multiple)} − debt ${m(raw.debt_value)} = **${m(c.equity_multiple)}**  *(EV/EBITDA is an enterprise multiple — strip debt)*`
    : `Equity = ${c.method_label} = **${m(c.equity_multiple)}**  *(P/E is already an equity multiple — do NOT strip debt)*`;
  return [
    '**Valuation of the target — two methods and a range**', '',
    '**Method 1 — Discounted cash flow (FCFF, Gordon growth)**', '',
    `FCFF = PBIT×(1−t) + depreciation − capex − ΔWC = ${fmt1(raw.pbit)}×(1−${t}) + ${fmt1(raw.depreciation)} − ${fmt1(raw.capex)} − ${fmt1(raw.delta_working_capital)} = **${m(c.fcff)}**`,
    `Enterprise value = FCFF×(1+g)/(WACC−g) = ${fmt1(c.fcff)}×(1+${g})/(${pct2(wacc)} − ${pct2(g)}) = **${m(c.firm_value_dcf)}**`,
    `Equity (DCF) = EV − debt = ${fmt1(c.firm_value_dcf)} − ${fmt1(raw.debt_value)} = **${m(c.equity_dcf)}**`, '',
    '**Method 2 — Relative (market multiple)**', '', relLine, '',
    '**Range and offer test**', '',
    `The two methods bracket a fair value range for the equity of **${m(c.equity_low)} to ${m(c.equity_high)}** (each method estimates the fair value of the equity). The offer of ${m(c.offer_price)} sits ${posWord}.`, '',
    '**Advice to the board**', '', prose, '',
    `*Reconciliation: DCF equity ${m(c.equity_dcf)} and relative equity ${m(c.equity_multiple)} → range ${m(c.equity_low)}–${m(c.equity_high)}; offer ${m(c.offer_price)} is ${c.offer_position} ✓*`,
  ].join('\n');
}
