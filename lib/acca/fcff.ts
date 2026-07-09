// lib/acca/fcff.ts
// AFM FCFF firm-valuation calculator. Pure, deterministic, no model/DB/side-effects.
// Code owns EVERY figure a drill states — including comparisons between computed figures
// and break-even sensitivities — so the model never asserts a number, an inequality, or a
// break-even in prose (docs/AFM_NUMERIC_VERIFICATION_DESIGN.md §1; adversarial pattern
// fixes 1 & 2). Shared by the generator (scripts/generate-afm-drills.ts) and any patch/
// serve-time caller so there is one source of truth for the arithmetic and the advice glue.

import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';

// ── Formatting / currency ──
export const fmt1 = (n: number): string => n.toFixed(1);
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

// Rates sometimes arrive as percentages (10) rather than decimals (0.10); normalise.
function asDecimalRate(v: number): number {
  return v > 1 ? v / 100 : v;
}
const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });

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

  const fcff = raw.pbit * (1 - tax) + raw.depreciation - raw.capex - raw.delta_working_capital;
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
  const tax  = asDecimalRate(raw.tax_rate);
  const wacc = asDecimalRate(raw.wacc);
  const g    = asDecimalRate(raw.growth_rate);
  const debt = raw.debt_value;
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
  ];

  const recomputeIds: Record<string, string | undefined> = {
    fcff: undefined,
    firm_value: 'firm_value_perpetuity_growth',
    equity_value: 'equity_value_strip_debt',
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
