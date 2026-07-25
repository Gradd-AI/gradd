// lib/acca/irr.ts
// AFM IRR / MIRR calculator (B1c), calculator #2. Pure, deterministic, no model/DB.
// Same doctrine as npv.ts: code owns EVERY figure AND the accept/reject verdict; the model
// authors prose only. Reuses the NPV cash-flow engine for the graded `ncf_p` line (net
// after-tax cash flows are pre-discount, so identical to NPV), then branches:
//   IRR  — linear interpolation between two trial-rate NPVs (npv_lo, npv_hi) → the examiner
//          method; interpolation result is the authored expected value, so self-consistency
//          holds. npv_lo/npv_hi are GRADED (design answer i) — ACCA marks the trial NPVs,
//          and grading them buys OFR carry on the classic wrong-trial-NPV error.
//   MIRR — terminal value of inflows (reinvested) ÷ PV of outflows, ^(1/n) − 1. For a
//          conventional project pv_outflows = the t0 outlay PARAM (design answer ii); it is
//          promoted to a graded component only when a drill has multi-period outflows.

import { fixedHalfUp } from './rounding';
import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { fmt1, money, normaliseCurrency, type SerializedSchema } from './valuation';
import { computeNpv, type NpvInputs, type NpvComputed } from './npv';

export { normaliseCurrency };

const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
const absTol = (value: number): Tolerance => ({ kind: 'absolute', value });
const pct2 = (frac: number): string => `${fixedHalfUp(frac * 100, 2)}%`;
const asDec = (v: number): number => (v > 1 ? v / 100 : v);
const df = (r: number, p: number): number => 1 / Math.pow(1 + r, p);

export type IrrKind = 'standard' | 'mirr' | 'nonconventional' | 'conflict';

export interface IrrCompetitor { name: string; irr: number; npv: number; }

export interface IrrInputs {
  // ── NPV core (identical to NpvInputs; ncf_p is shared) ──
  initial_outlay:    number;
  real_operating_cf: number[];
  inflation_rate:    number;
  tax_rate:          number;
  tax_lag:           0 | 1;
  capital_for_wda:   number;
  wda_rate:          number;
  scrap_value:       number;
  // ── IRR/MIRR ──
  cost_of_capital:   number;   // hurdle for accept/reject (decimal or %)
  r_lo:              number;   // low trial rate for interpolation
  r_hi:              number;   // high trial rate for interpolation
  reinvest_rate?:    number;   // MIRR reinvestment rate (default cost_of_capital)
  finance_rate?:     number;   // MIRR outflow discount rate (default cost_of_capital)
  // ── conflict only ──
  competitor?:       IrrCompetitor;  // a mutually-exclusive rival with GIVEN irr + npv
  project_label?:    string;         // label for THIS project in the conflict comparison (e.g. "Line A"); default "This project"
}

export interface IrrComputed {
  base:       NpvComputed;   // the shared NPV computation (WDA/tax/ncf + npv at cost of capital)
  n:          number;
  horizon:    number;
  npv_lo:     number;        // NPV at r_lo
  npv_hi:     number;        // NPV at r_hi
  irr:        number;        // % (interpolation result)
  npv_at_coc: number;        // NPV at the cost of capital (the sound decision metric)
  tv_inflows: number;        // MIRR terminal value of inflows
  pv_outflows: number;       // MIRR PV of outflows (= outlay for conventional)
  mirr:       number;        // %
  r_lo_dec:   number;
  r_hi_dec:   number;
  coc:        number;
  reinvest:   number;
  accept:     boolean;       // kind-dependent: irr>coc | mirr>coc | npv_at_coc>0
}

export function computeIrr(raw: IrrInputs, kind: IrrKind): IrrComputed {
  const coc = asDec(raw.cost_of_capital);
  const rLo = asDec(raw.r_lo);
  const rHi = asDec(raw.r_hi);
  if (!(rHi > rLo)) throw new Error(`r_hi must exceed r_lo (got ${rLo}, ${rHi})`);
  if (coc <= 0 || coc >= 1) throw new Error(`cost_of_capital out of range (0,1): ${coc}`);

  // Shared NPV engine for the ncf line (ncf is pre-discount → discount_rate here is only
  // used for base.npv = NPV at the cost of capital).
  const core: NpvInputs = {
    initial_outlay: raw.initial_outlay, real_operating_cf: raw.real_operating_cf,
    inflation_rate: raw.inflation_rate, tax_rate: raw.tax_rate, tax_lag: raw.tax_lag,
    capital_for_wda: raw.capital_for_wda, wda_rate: raw.wda_rate, scrap_value: raw.scrap_value,
    discount_rate: coc,
  };
  const base = computeNpv(core, 'standard');
  const H = base.horizon;

  const npvAt = (r: number) => base.periods.reduce((s, p) => s + p.ncf * df(r, p.period), 0) - raw.initial_outlay;
  const npvLo = npvAt(rLo);
  const npvHi = npvAt(rHi);
  const irr = (rLo + (npvLo / (npvLo - npvHi)) * (rHi - rLo)) * 100; // %

  // MIRR — terminal value of positive net cash flows (reinvested), PV of negative flows +
  // outlay (financed). Conventional project → pv_outflows = outlay.
  const reinvest = asDec(raw.reinvest_rate ?? raw.cost_of_capital);
  const finance = asDec(raw.finance_rate ?? raw.cost_of_capital);
  let tvInflows = 0, pvNegExtra = 0;
  for (const p of base.periods) {
    if (p.ncf > 0) tvInflows += p.ncf * Math.pow(1 + reinvest, H - p.period);
    else if (p.ncf < 0) pvNegExtra += (-p.ncf) * df(finance, p.period);
  }
  const pvOutflows = raw.initial_outlay + pvNegExtra;
  const mirr = (Math.pow(tvInflows / pvOutflows, 1 / H) - 1) * 100; // %

  const accept = kind === 'mirr' ? mirr > coc * 100
    : kind === 'standard' ? irr > coc * 100
    : base.npv > 0; // nonconventional / conflict decided on NPV (the sound metric)

  return {
    base, n: base.n, horizon: H, npv_lo: npvLo, npv_hi: npvHi, irr, npv_at_coc: base.npv,
    tv_inflows: tvInflows, pv_outflows: pvOutflows, mirr, r_lo_dec: rLo, r_hi_dec: rHi,
    coc, reinvest, accept,
  };
}

// ── Schema: graded components ncf_p → npv_lo/npv_hi → irr (+ tv_inflows → mirr on mirr kind) ──
export function buildIrrSchema(raw: IrrInputs, c: IrrComputed, currency: string, kind: IrrKind): { schema: AnswerSchema; serialized: SerializedSchema } {
  const moneyUnit = `${currency}m`;
  const outlay = raw.initial_outlay;
  const rLo = c.r_lo_dec, rHi = c.r_hi_dec, H = c.horizon, reinvest = c.reinvest, pvOut = c.pv_outflows;
  const ncfIds = c.base.periods.map((p) => `ncf_${p.period}`);
  const positiveNcfIds = c.base.periods.filter((p) => p.ncf > 0).map((p) => `ncf_${p.period}`);

  const components: Component[] = [];
  for (const per of c.base.periods) {
    components.push({
      component_id: `ncf_${per.period}`,
      label: `Net after-tax cash flow, year ${per.period}`,
      expected_value: per.ncf, unit: moneyUnit, tolerance: rel(0.5),
      working_steps: [`Operating cash flow (inflated) − tax (timed) ${per.period === c.n ? '+ scrap ' : ''}for year ${per.period}`],
    });
  }
  components.push({
    component_id: 'npv_lo', label: `NPV at ${pct2(rLo)}`, expected_value: c.npv_lo,
    unit: moneyUnit, tolerance: rel(0.5), depends_on: ncfIds,
    recompute: (d) => ncfIds.reduce((s, id) => s + d[id] * df(rLo, Number(id.slice(4))), 0) - outlay,
    working_steps: [`Σ ncf_p × discount factor at ${pct2(rLo)} − outlay ${fmt1(outlay)}`],
  });
  components.push({
    component_id: 'npv_hi', label: `NPV at ${pct2(rHi)}`, expected_value: c.npv_hi,
    unit: moneyUnit, tolerance: rel(0.5), depends_on: ncfIds,
    recompute: (d) => ncfIds.reduce((s, id) => s + d[id] * df(rHi, Number(id.slice(4))), 0) - outlay,
    working_steps: [`Σ ncf_p × discount factor at ${pct2(rHi)} − outlay ${fmt1(outlay)}`],
  });
  components.push({
    component_id: 'irr', label: 'Internal rate of return', expected_value: c.irr,
    unit: '%', tolerance: absTol(0.2), depends_on: ['npv_lo', 'npv_hi'],
    recompute: (d) => (rLo + (d.npv_lo / (d.npv_lo - d.npv_hi)) * (rHi - rLo)) * 100,
    working_steps: [`= ${pct2(rLo)} + npv_lo/(npv_lo − npv_hi) × (${pct2(rHi)} − ${pct2(rLo)})`],
  });

  if (kind === 'mirr') {
    components.push({
      component_id: 'tv_inflows', label: `Terminal value of inflows (reinvested at ${pct2(reinvest)})`,
      expected_value: c.tv_inflows, unit: moneyUnit, tolerance: rel(0.5), depends_on: positiveNcfIds,
      recompute: (d) => positiveNcfIds.reduce((s, id) => s + d[id] * Math.pow(1 + reinvest, H - Number(id.slice(4))), 0),
      working_steps: [`Σ positive ncf_p × (1+${pct2(reinvest)})^(${H}−p)`],
    });
    components.push({
      component_id: 'mirr', label: 'Modified internal rate of return', expected_value: c.mirr,
      unit: '%', tolerance: absTol(0.2), depends_on: ['tv_inflows'],
      recompute: (d) => (Math.pow(d.tv_inflows / pvOut, 1 / H) - 1) * 100,
      working_steps: [`= (tv_inflows / PV of outflows ${fmt1(pvOut)})^(1/${H}) − 1`],
    });
  }

  const recomputeIds: Record<string, string> = {
    npv_lo: 'npv_at_rate', npv_hi: 'npv_at_rate', irr: 'irr_interpolate',
    tv_inflows: 'terminal_value', mirr: 'mirr_from_tv',
  };
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
      cost_of_capital: c.coc, r_lo: rLo, r_hi: rHi, reinvest_rate: reinvest,
      tax_rate: asDec(raw.tax_rate), inflation_rate: asDec(raw.inflation_rate), wda_rate: asDec(raw.wda_rate),
      tax_lag: raw.tax_lag, initial_outlay: outlay, capital_for_wda: raw.capital_for_wda, scrap_value: raw.scrap_value,
    },
  };
  return { schema: { components }, serialized };
}

// ── Model answer: code owns figures, IRR, MIRR, and the accept/reject verdict ──
export function buildIrrModelAnswer(raw: IrrInputs, c: IrrComputed, prose: string, currency: string, kind: IrrKind): string {
  const m = (n: number) => money(currency, n);
  const lines: string[] = [];

  lines.push('**Investment appraisal — internal rate of return**', '');
  lines.push(`**Assumptions:** cash flows are in money (nominal) terms; operating cash flows are inflated at ${pct2(asDec(raw.inflation_rate))} a year; tax at ${pct2(asDec(raw.tax_rate))} is charged on operating cash flow less tax-allowable depreciation and paid ${raw.tax_lag === 0 ? 'in the year the profit arises' : 'one year in arrears'}; tax-allowable depreciation is ${pct2(asDec(raw.wda_rate))} reducing balance with a balancing allowance/charge on disposal in year ${c.n}; the cost of capital is ${pct2(c.coc)}.`, '');

  // Step 1 — WDA
  lines.push('**Step 1 — Tax-allowable depreciation (reducing balance)**', '', `| Year | WDA |`, `|------|-----|`);
  for (const y of c.base.years) lines.push(`| ${y.year} | ${m(y.wda)} |`);
  lines.push('');
  // Step 2 — tax
  lines.push('**Step 2 — Taxable profit and tax**', '', `| Year | Operating cash flow | WDA | Taxable | Tax |`, `|------|------|------|------|------|`);
  for (const y of c.base.years) lines.push(`| ${y.year} | ${m(y.money_cf)} | ${m(y.wda)} | ${m(y.taxable)} | ${m(y.tax)} |`);
  lines.push('');
  // Step 3 — net cash flows (no discounting yet)
  lines.push('**Step 3 — Net cash flows**', '', `| Period | Net cash flow |`, `|--------|------|`, `| 0 | ${m(-raw.initial_outlay)} |`);
  for (const p of c.base.periods) lines.push(`| ${p.period} | ${m(p.ncf)} |`);
  lines.push('');

  // Step 4 — IRR by interpolation
  lines.push('**Step 4 — Internal rate of return (linear interpolation)**', '');
  lines.push(`NPV at ${pct2(c.r_lo_dec)} = ${m(c.npv_lo)}; NPV at ${pct2(c.r_hi_dec)} = ${m(c.npv_hi)}.`, '');
  lines.push(`**IRR ≈ ${pct2(c.r_lo_dec)} + ${m(c.npv_lo)}/(${m(c.npv_lo)} − ${m(c.npv_hi)}) × (${pct2(c.r_hi_dec)} − ${pct2(c.r_lo_dec)}) = ${c.irr.toFixed(2)}%.**`, '');

  if (kind === 'nonconventional') {
    lines.push(`Because the net cash flows change sign more than once, this project can have **multiple IRRs** (or none), so a single interpolated IRR is unreliable here. The NPV at the ${pct2(c.coc)} cost of capital is ${m(c.npv_at_coc)} — **NPV governs the decision**, not IRR.`, '');
  }

  if (kind === 'mirr') {
    lines.push('**Step 5 — Modified internal rate of return**', '');
    lines.push(`Terminal value of inflows, reinvested at ${pct2(c.reinvest)} = ${m(c.tv_inflows)}; PV of outflows = ${m(c.pv_outflows)}.`, '');
    lines.push(`**MIRR = (${m(c.tv_inflows)} / ${m(c.pv_outflows)})^(1/${c.horizon}) − 1 = ${c.mirr.toFixed(2)}%.**`, '');
    lines.push(`The IRR of ${c.irr.toFixed(2)}% overstates the return because it implicitly assumes interim cash flows are reinvested at the IRR itself; MIRR reinvests them at the stated ${pct2(c.reinvest)} reinvestment rate — a more realistic assumption than the IRR itself — and is the sounder ranking measure.`, '');
  }

  if (kind === 'conflict' && raw.competitor) {
    const projLabel = raw.project_label ?? 'This project';
    lines.push('**Step 5 — Ranking against the mutually exclusive alternative**', '');
    lines.push(`| Project | IRR | NPV @ ${pct2(c.coc)} |`, `|------|------|------|`);
    lines.push(`| ${projLabel} | ${c.irr.toFixed(2)}% | ${m(c.npv_at_coc)} |`);
    lines.push(`| ${raw.competitor.name} | ${asDec(raw.competitor.irr) >= 1 ? raw.competitor.irr.toFixed(2) : (raw.competitor.irr * 100).toFixed(2)}% | ${m(raw.competitor.npv)} |`);
    const thisWins = c.npv_at_coc >= raw.competitor.npv;
    lines.push('', `IRR and NPV can rank mutually exclusive projects differently; where they conflict, **NPV wins** (it measures absolute value added and assumes reinvestment at the cost of capital, not the IRR). On NPV, **${thisWins ? projLabel : raw.competitor.name}** is preferred.`, '');
  }

  // Decision (code-owned). Conflict kind states the FUNDING CHOICE — never a bare accept —
  // because with mutually exclusive projects a positive standalone NPV does not settle it.
  const stepNo = kind === 'mirr' || kind === 'conflict' ? '6' : '5';
  lines.push(`**Step ${stepNo} — Decision**`, '');
  if (kind === 'conflict' && raw.competitor) {
    const projLabel = raw.project_label ?? 'This project';
    const winnerIsComp = raw.competitor.npv >= c.npv_at_coc;
    const winnerName = winnerIsComp ? raw.competitor.name : projLabel;
    const loserName = winnerIsComp ? projLabel : raw.competitor.name;
    const winnerNpv = winnerIsComp ? raw.competitor.npv : c.npv_at_coc;
    const loserNpv = winnerIsComp ? c.npv_at_coc : raw.competitor.npv;
    lines.push(c.npv_at_coc > 0
      ? `${projLabel}'s NPV of ${m(c.npv_at_coc)} is positive, so it would be acceptable on a standalone basis. But the two lines are mutually exclusive and ${winnerName} adds more value at the cost of capital (${m(winnerNpv)} vs ${m(loserNpv)}), so the board should fund ${winnerName}; ${loserName}, though value-adding in isolation, is displaced.`
      : `${projLabel}'s NPV of ${m(c.npv_at_coc)} is negative, so it should be rejected outright; on value grounds the board should fund ${winnerName} (${m(winnerNpv)}).`, '');
  } else {
    const metric = kind === 'mirr' ? `MIRR of ${c.mirr.toFixed(2)}%` : kind === 'standard' ? `IRR of ${c.irr.toFixed(2)}%` : `NPV of ${m(c.npv_at_coc)}`;
    lines.push(c.accept
      ? `The ${metric} ${kind === 'standard' || kind === 'mirr' ? `exceeds the ${pct2(c.coc)} cost of capital` : 'is positive'}, so on these assumptions the project **adds shareholder value and should be accepted**.`
      : `The ${metric} ${kind === 'standard' || kind === 'mirr' ? `is below the ${pct2(c.coc)} cost of capital` : 'is negative'}, so on these assumptions the project **destroys value and should be rejected** as it stands.`, '');
  }

  // Advice — opener keyed to the code decision, then prose
  lines.push(`**Step ${Number(stepNo) + 1} — Advice to the board**`, '');
  lines.push(c.accept
    ? `On these assumptions the return clears the hurdle; a positive signal is a floor, not a mandate, so the recommendation is conditional on the following assumptions holding.`
    : `On these assumptions the return is below the hurdle, so the base-case recommendation is to **reject**; the board should treat rejection as the default unless the assumptions below prove materially conservative.`, '');
  lines.push(prose, '');
  lines.push(`*Reconciliation: NPV at ${pct2(c.r_lo_dec)} ${m(c.npv_lo)} and at ${pct2(c.r_hi_dec)} ${m(c.npv_hi)} bracket the IRR ${c.irr.toFixed(2)}%.*`);

  return lines.join('\n');
}
