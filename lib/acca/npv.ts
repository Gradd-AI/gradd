// lib/acca/npv.ts
// AFM NPV firm-investment-appraisal calculator (B1a). Pure, deterministic, no model/DB.
// Same doctrine as lib/acca/fcff.ts: code owns EVERY figure, plus every figure-vs-figure
// verdict (accept/reject, project ranking) and every sensitivity — the model states none.
//
// GRADED schema components are the NPV computation chain only: per period `ncf_p` (net
// after-tax cash flow) → `pv_p` (discounted) → `npv`. Inflation, the tax-allowable
// depreciation (WDA) schedule with a final-year balancing allowance, and tax timing are
// shown in the worked answer but are folded into the `ncf_p` line (ACCA's marking
// granularity). PI, the capital-rationing ranking, and the sensitivity % are ENRICHMENT
// (code-owned advice, not marked steps — see AFM_NUMERIC_VERIFICATION_DESIGN.md §9), so
// they are injected into the model answer but are NOT schema components.

import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { fmt1, money, normaliseCurrency, type SerializedSchema } from './valuation';

export { normaliseCurrency };

const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
const pct2 = (frac: number): string => `${(frac * 100).toFixed(2)}%`;
const asDec = (v: number): number => (v > 1 ? v / 100 : v);
const df = (r: number, p: number): number => 1 / Math.pow(1 + r, p);
const EPS = 1e-9;

export type NpvKind = 'standard' | 'rationing' | 'sensitivity' | 'section_a';

// A competing project in a capital-rationing decision. `divisible` defaults to true; the
// appraised project ("this project") is ALWAYS indivisible (a firm's own bespoke facility
// can't be part-built), so the allocation is a small with/without search, not naive greedy.
export interface CompetitorProject { name: string; pi: number; outlay: number; divisible?: boolean; }

export interface NpvInputs {
  initial_outlay:    number;   // t0 capital cost (positive)
  real_operating_cf: number[]; // years 1..N, pre-tax operating cash flow in REAL terms
  inflation_rate:    number;   // decimal, applied to operating cash flows
  tax_rate:          number;   // decimal
  tax_lag:           0 | 1;    // years tax is paid in arrears
  capital_for_wda:   number;   // capital qualifying for tax-allowable depreciation
  wda_rate:          number;   // decimal, reducing-balance rate (e.g. 0.25)
  scrap_value:       number;   // money terms, received end of year N
  discount_rate:     number;   // risk-adjusted discount rate, decimal
  // rationing only:
  competitor_projects?: CompetitorProject[];
  capital_limit?:       number;
  // sensitivity only:
  sensitivity_label?:   string;
}

export interface NpvYear {   // 1..N — tax computation (workings, not graded)
  year: number; money_cf: number; wda: number; taxable: number; tax: number;
}
export interface NpvPeriod { // 1..H — net cash flow + discounting (ncf/pv graded)
  period: number; ncf: number; df: number; pv: number;
}
export interface RankRow { name: string; pi: number; outlay: number; taken: number; divisible: boolean; }

export interface NpvComputed {
  years:       NpvYear[];
  periods:     NpvPeriod[];
  n:           number;
  horizon:     number;
  pv_inflows:  number;   // Σ pv over periods 1..H
  npv:         number;
  accept:      boolean;
  // enrichment (code-owned advice, not graded)
  pi?:              number;
  ranking?:         RankRow[];
  capital_limit?:   number;
  ration_total_npv?: number;   // total NPV of the code-computed optimal feasible allocation
  ration_takes_project?: boolean; // whether the optimal allocation funds THIS (indivisible) project
  ration_npv_with?: number;    // best feasible portfolio NPV that FUNDS this project
  ration_npv_without?: number;  // best feasible portfolio NPV that SKIPS this project
  sensitivity_pct?: number;
  sensitivity_label?: string;
  sensitivity_base?: number;   // the PV base the % is measured against (post-tax operating CF PV)
}

export function computeNpv(raw: NpvInputs, kind: NpvKind): NpvComputed {
  const infl = asDec(raw.inflation_rate);
  const tax  = asDec(raw.tax_rate);
  const r    = asDec(raw.discount_rate);
  const wr   = asDec(raw.wda_rate);
  const N    = Array.isArray(raw.real_operating_cf) ? raw.real_operating_cf.length : 0;

  if (N < 2 || N > 5) throw new Error(`real_operating_cf must have 2–5 entries, got ${N}`);
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`NPV input "${k}" is not finite: ${v}`);
  }
  if (tax < 0 || tax >= 1)   throw new Error(`tax_rate out of range (0,1): ${tax}`);
  if (r <= 0 || r >= 1)      throw new Error(`discount_rate out of range (0,1): ${r}`);
  if (infl < 0 || infl >= 1) throw new Error(`inflation_rate out of range [0,1): ${infl}`);
  if (wr <= 0 || wr >= 1)    throw new Error(`wda_rate out of range (0,1): ${wr}`);
  if (!(raw.initial_outlay > 0))  throw new Error(`initial_outlay must be positive: ${raw.initial_outlay}`);
  if (!(raw.capital_for_wda > 0)) throw new Error(`capital_for_wda must be positive: ${raw.capital_for_wda}`);
  if (raw.tax_lag !== 0 && raw.tax_lag !== 1) throw new Error(`tax_lag must be 0 or 1: ${raw.tax_lag}`);

  // WDA schedule (reducing balance; final year = balancing allowance = WDV b/f − scrap).
  const wda: number[] = [];
  let wdv = raw.capital_for_wda;
  for (let t = 1; t <= N; t++) {
    if (t < N) { const a = wdv * wr; wda.push(a); wdv -= a; }
    else       { wda.push(wdv - raw.scrap_value); wdv = raw.scrap_value; } // balancing allowance/charge
  }

  // Year tax computation.
  const years: NpvYear[] = [];
  for (let t = 1; t <= N; t++) {
    const money_cf = raw.real_operating_cf[t - 1] * Math.pow(1 + infl, t);
    const taxable  = money_cf - wda[t - 1];
    const taxCharge = taxable * tax;
    years.push({ year: t, money_cf, wda: wda[t - 1], taxable, tax: taxCharge });
  }

  // Period net cash flows (1..H), H = N + tax_lag.
  const lag = raw.tax_lag;
  const H = N + lag;
  const ncf = new Array<number>(H + 1).fill(0);
  for (let t = 1; t <= N; t++) {
    ncf[t] += years[t - 1].money_cf;
    if (t === N) ncf[t] += raw.scrap_value;
  }
  for (let t = 1; t <= N; t++) ncf[t + lag] -= years[t - 1].tax;

  const periods: NpvPeriod[] = [];
  let pvInflows = 0;
  for (let p = 1; p <= H; p++) {
    const d = df(r, p);
    const pv = ncf[p] * d;
    pvInflows += pv;
    periods.push({ period: p, ncf: ncf[p], df: d, pv });
  }
  const npv = pvInflows - raw.initial_outlay;

  const out: NpvComputed = {
    years, periods, n: N, horizon: H, pv_inflows: pvInflows, npv, accept: npv > 0,
  };

  if (kind === 'rationing') {
    // CODE owns the allocation (doctrine: the model never authors a capital allocation).
    // "this project" is INDIVISIBLE; competitors default divisible. The feasible optimum
    // under a single-period limit is found by enumerating which indivisible projects to
    // fund, then filling the remainder with divisible projects greedily by PI, and taking
    // the subset that maximises total NPV — NOT by ranking the indivisible project as if it
    // could be part-funded (the bug that gave "this project 15.5 of 18.0").
    const pi = pvInflows / raw.initial_outlay;
    out.pi = pi;
    const limit = raw.capital_limit ?? raw.initial_outlay;
    out.capital_limit = limit;

    interface RProj { name: string; pi: number; outlay: number; divisible: boolean; npvFull: number; }
    // npvFull for a competitor = (PI − 1) × outlay; for this project = its exact NPV
    // (identical, since PI = pvInflows/outlay, but avoids compounding rounding).
    const projects: RProj[] = [
      { name: 'this project', pi, outlay: raw.initial_outlay, divisible: false, npvFull: npv },
      ...(raw.competitor_projects ?? []).map((p) => ({
        name: p.name, pi: p.pi, outlay: p.outlay,
        divisible: p.divisible !== false,
        npvFull: (p.pi - 1) * p.outlay,
      })),
    ];
    const indivisible = projects.filter((p) => !p.divisible);
    const divisible = projects.filter((p) => p.divisible).slice().sort((a, b) => b.pi - a.pi);
    if (indivisible.length > 16) throw new Error(`rationing: ${indivisible.length} indivisible projects is too many to enumerate`);

    let best: { taken: Map<string, number>; npv: number } | null = null;
    // Track the best portfolio that FUNDS this project vs the best that SKIPS it — the
    // with-vs-without comparison is the whole point of an indivisible-project ranking.
    let bestWith = -Infinity, bestWithout = -Infinity;
    const K = indivisible.length;
    for (let mask = 0; mask < (1 << K); mask++) {
      const taken = new Map<string, number>();
      let spent = 0, totNpv = 0, feasible = true;
      for (let b = 0; b < K; b++) {
        const p = indivisible[b];
        if (mask & (1 << b)) {
          if (spent + p.outlay > limit + EPS) { feasible = false; break; }
          spent += p.outlay; totNpv += p.npvFull; taken.set(p.name, p.outlay);
        } else taken.set(p.name, 0);
      }
      if (!feasible) continue;
      let remaining = limit - spent;
      for (const p of divisible) {
        const take = Math.max(0, Math.min(p.outlay, remaining));
        taken.set(p.name, take);
        totNpv += (take / p.outlay) * p.npvFull;
        remaining -= take;
      }
      const fundsThis = (taken.get('this project') ?? 0) > EPS;
      if (fundsThis) bestWith = Math.max(bestWith, totNpv);
      else bestWithout = Math.max(bestWithout, totNpv);
      if (!best || totNpv > best.npv + EPS) best = { taken, npv: totNpv };
    }
    out.ration_total_npv = best!.npv;
    out.ration_npv_with = Number.isFinite(bestWith) ? bestWith : undefined;
    out.ration_npv_without = Number.isFinite(bestWithout) ? bestWithout : undefined;
    out.ration_takes_project = bestWith + EPS >= bestWithout;
    out.ranking = projects
      .slice()
      .sort((a, b) => b.pi - a.pi)
      .map((p) => ({ name: p.name, pi: p.pi, outlay: p.outlay, taken: best!.taken.get(p.name) ?? 0, divisible: p.divisible }));
  }

  if (kind === 'sensitivity') {
    // ACCA-orthodox sensitivity of NPV to the OPERATING cash flows, measured against an
    // EXPLICITLY NAMED base: the post-tax present value of the operating cash flows. Only
    // the operating stream flexes — each year's inflated operating cash flow net of the tax
    // on THAT flow (timed by the lag), discounted. Scrap and the WDA tax shield are fixed,
    // so they are excluded from the base (using total PV of inflows understates the margin).
    let base = 0;
    for (let t = 1; t <= N; t++) {
      const money = years[t - 1].money_cf;
      base += df(r, t) * money;                    // operating inflow at period t
      base -= df(r, t + lag) * (money * tax);      // tax on that operating flow, timed
    }
    out.sensitivity_base = base;
    out.sensitivity_pct = (npv / base) * 100;
    out.sensitivity_label = raw.sensitivity_label ?? 'the projected operating cash flows';
  }

  return out;
}

// ── Schema: graded components ncf_p → pv_p → npv only ──
export function buildNpvSchema(raw: NpvInputs, c: NpvComputed, currency: string): { schema: AnswerSchema; serialized: SerializedSchema } {
  const r = asDec(raw.discount_rate);
  const outlay = raw.initial_outlay;
  const moneyUnit = `${currency}m`;

  const components: Component[] = [];
  for (const per of c.periods) {
    components.push({
      component_id: `ncf_${per.period}`,
      label: `Net after-tax cash flow, year ${per.period}`,
      expected_value: per.ncf,
      unit: moneyUnit,
      tolerance: rel(0.5),
      working_steps: [`Operating cash flow (inflated) − tax (timed) ${per.period === c.n ? '+ scrap ' : ''}for year ${per.period}`],
    });
  }
  for (const per of c.periods) {
    const d = per.df;
    components.push({
      component_id: `pv_${per.period}`,
      label: `Present value, year ${per.period}`,
      expected_value: per.pv,
      unit: moneyUnit,
      tolerance: rel(0.5),
      depends_on: [`ncf_${per.period}`],
      recompute: (dep) => dep[`ncf_${per.period}`] * d,
      working_steps: [`= ncf_${per.period} × ${d.toFixed(3)} (discount factor at ${pct2(r)})`],
    });
  }
  const pvIds = c.periods.map((p) => `pv_${p.period}`);
  components.push({
    component_id: 'npv',
    label: 'Net present value',
    expected_value: c.npv,
    unit: moneyUnit,
    tolerance: rel(0.5),
    depends_on: pvIds,
    recompute: (dep) => pvIds.reduce((s, id) => s + dep[id], 0) - outlay,
    working_steps: [`= Σ present values − initial outlay ${fmt1(outlay)}`],
  });

  const recomputeIds: Record<string, string | undefined> = { npv: 'npv_sum_less_outlay' };
  for (const p of c.periods) recomputeIds[`pv_${p.period}`] = `pv_discount_y${p.period}`;

  const serialized: SerializedSchema = {
    components: components.map((comp) => {
      const s: SerializedSchema['components'][number] = {
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
    params: {
      discount_rate: r, tax_rate: asDec(raw.tax_rate), inflation_rate: asDec(raw.inflation_rate),
      wda_rate: asDec(raw.wda_rate), tax_lag: raw.tax_lag, initial_outlay: outlay,
      capital_for_wda: raw.capital_for_wda, scrap_value: raw.scrap_value,
    },
  };
  return { schema: { components }, serialized };
}

// ── Model answer: code owns figures, decision, ranking, sensitivity; prose is qualitative ──
export function buildNpvModelAnswer(raw: NpvInputs, c: NpvComputed, prose: string, currency: string, kind: NpvKind): string {
  const m = (n: number) => money(currency, n);
  const r = asDec(raw.discount_rate);
  const lines: string[] = [];

  lines.push('**Investment appraisal — net present value**', '');
  lines.push(
    `**Assumptions:** cash flows are in money (nominal) terms; operating cash flows are inflated at ${pct2(asDec(raw.inflation_rate))} a year; tax at ${pct2(asDec(raw.tax_rate))} is charged on operating cash flow less tax-allowable depreciation and is paid ${raw.tax_lag === 0 ? 'in the year the profit arises' : 'one year in arrears'}; tax-allowable depreciation is ${pct2(asDec(raw.wda_rate))} reducing balance with a balancing allowance/charge on disposal in year ${c.n}; flows are discounted at a risk-adjusted rate of ${pct2(r)}.`,
    '',
  );

  // WDA schedule
  lines.push('**Step 1 — Tax-allowable depreciation (reducing balance)**', '');
  lines.push(`| Year | WDA |`, `|------|-----|`);
  for (const y of c.years) lines.push(`| ${y.year} | ${m(y.wda)} |`);
  lines.push('');

  // Tax computation
  lines.push('**Step 2 — Taxable profit and tax**', '');
  lines.push(`| Year | Operating cash flow | WDA | Taxable | Tax |`, `|------|------|------|------|------|`);
  for (const y of c.years) lines.push(`| ${y.year} | ${m(y.money_cf)} | ${m(y.wda)} | ${m(y.taxable)} | ${m(y.tax)} |`);
  lines.push('');

  // Net cash flow & discounting
  lines.push('**Step 3 — Net cash flows and present values**', '');
  lines.push(`| Period | Net cash flow | DF @ ${pct2(r)} | Present value |`, `|--------|------|------|------|`);
  lines.push(`| 0 | ${m(-raw.initial_outlay)} | 1.000 | ${m(-raw.initial_outlay)} |`);
  for (const p of c.periods) lines.push(`| ${p.period} | ${m(p.ncf)} | ${p.df.toFixed(3)} | ${m(p.pv)} |`);
  lines.push('');
  lines.push(`**Present value of future cash flows ${m(c.pv_inflows)}; less initial outlay ${m(raw.initial_outlay)}; NPV ${m(c.npv)}.**`, '');

  // Decision (code-owned)
  lines.push('**Step 4 — Decision**', '');
  lines.push(
    c.accept
      ? `The NPV of ${m(c.npv)} is **positive**, so on these assumptions the project **adds shareholder value and should be accepted**.`
      : `The NPV of ${m(c.npv)} is **negative**, so on these assumptions the project **destroys value and should be rejected** as it stands.`,
    '',
  );

  // Rationing enrichment (code-owned allocation, incl. indivisibility of this project)
  if (kind === 'rationing' && c.ranking && c.pi !== undefined) {
    const limit = c.capital_limit ?? raw.initial_outlay;
    lines.push('**Step 5 — Single-period capital rationing (profitability index)**', '');
    lines.push(`Because this project is **indivisible**, the PI ranking cannot be applied mechanically; the board must compare the best feasible portfolio that funds this project against the best feasible portfolio that skips it. Its profitability index (PV of inflows ÷ outlay) is **${c.pi.toFixed(3)}**; the competing projects are divisible; the capital limit is ${m(limit)}. The remaining capital fills the divisible projects in PI order:`, '');
    lines.push(`| Rank (by PI) | Project | PI | Outlay | Capital allocated |`, `|------|------|------|------|------|`);
    c.ranking.forEach((row, i) => lines.push(`| ${i + 1} | ${row.name}${row.divisible ? '' : ' (indivisible)'} | ${row.pi.toFixed(3)} | ${m(row.outlay)} | ${m(row.taken)} |`));
    if (c.ration_npv_with !== undefined && c.ration_npv_without !== undefined) {
      lines.push('', `Portfolio comparison: the best feasible portfolio that **funds** this project has a total NPV of **${m(c.ration_npv_with)}**, versus **${m(c.ration_npv_without)}** for the best portfolio that **skips** it — so ${c.ration_takes_project ? 'funding it is optimal' : 'skipping it is optimal'}.`);
    }
    const chosen = c.ranking.filter((r) => r.taken > EPS);
    const alloc = chosen.map((r) => `${r.name} ${m(r.taken)}${r.divisible && r.taken + EPS < r.outlay ? ' (partial)' : ''}`).join(', ');
    lines.push('', `Optimal allocation: **${alloc}** — total ${m(limit)} deployed${c.ration_takes_project ? ', funding this project in full' : '; this project is not funded, as backing the divisible projects instead yields a higher total NPV'}. *(Multi-period rationing would require linear programming and is beyond this single-period ranking.)*`, '');
  }

  // Sensitivity enrichment (code-owned figure, base explicitly named)
  if (kind === 'sensitivity' && c.sensitivity_pct !== undefined) {
    lines.push('**Step 5 — Sensitivity of the decision**', '');
    lines.push(`Holding all else equal, ${c.sensitivity_label} can fall by **~${c.sensitivity_pct.toFixed(2)}%** — measured against the post-tax present value of the operating cash flows (${m(c.sensitivity_base ?? 0)}) — before the NPV reaches zero, below which the decision reverses. The smaller this margin, the more the recommendation depends on the reliability of that estimate.`, '');
  }

  // Advice — opener keyed to the CODE-COMPUTED decision (never model-authored), then prose
  lines.push(`**Step ${kind === 'standard' || kind === 'section_a' ? '5' : '6'} — Advice to the board**`, '');
  lines.push(
    c.accept
      ? `On these assumptions the NPV is positive; a positive result is a floor, not a mandate, so the recommendation to proceed is conditional on the following assumptions holding under scrutiny.`
      : `On these assumptions the NPV is negative, so the base-case recommendation is to **reject** the project as it stands; the board should treat rejection as the default unless the assumptions below prove materially conservative.`,
    '',
  );
  lines.push(prose, '');
  lines.push(`*Reconciliation: present value of future cash flows ${m(c.pv_inflows)} − initial outlay ${m(raw.initial_outlay)} = NPV ${m(c.npv)} ✓*`);

  return lines.join('\n');
}
