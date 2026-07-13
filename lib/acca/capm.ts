// lib/acca/capm.ts
// AFM cost-of-capital / CAPM calculator (B3d organisation WACC, B3e project-specific),
// calculator #5. Pure, deterministic, no model/DB. Same doctrine as npv/irr/apv: code owns
// EVERY figure AND every figure-vs-figure verdict (which rate is higher and why, and the
// wrong-hurdle accept/reject flip); the model authors PROSE only and never states a rate or
// an inequality.
//
// This is the calculator that OWNS the ungearing the APV calculator deliberately does not:
// APV states Keu; here we DERIVE it (keu_for_apv kind) by ungearing a peer/sector equity
// beta to an asset beta. See docs/GENERATOR_DOCTRINE.md (APV/CAPM boundary ruling).
//
// House conventions (2026-07-13 rulings): debt beta = 0 across this batch (exam-orthodox;
// the calculator supports a non-zero β_d for a future kind); Modigliani–Miller WITH-TAX
// ungearing, regear by inversion; betas are unitless (abs tolerance ±0.02); rates (ke/keu/
// wacc) are stored as PERCENTAGES (abs tolerance ±0.1 pp — ±0.05 would punish legitimate
// 2-dp beta rounding through the chain). No cash flows: purely a rates family (P6 loss-relief
// is a structural no-op; the issue-cost convention has no analogue).

import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import type { SerializedSchema } from './fcff';

const absTol = (value: number): Tolerance => ({ kind: 'absolute', value });
const BETA_TOL = () => absTol(0.02);   // unitless beta
const RATE_TOL = () => absTol(0.1);    // percentage points
const asDec = (v: number): number => (v > 1 ? v / 100 : v);     // rates only, NEVER betas
const pct2 = (frac: number): string => `${(frac * 100).toFixed(2)}%`;
const fmtB = (b: number): string => b.toFixed(3);               // beta, 3 dp
const fmtR = (rPct: number): string => `${rPct.toFixed(2)}%`;   // rate already in %, 2 dp
const EPS = 1e-9;

export type CapmKind = 'project_specific' | 'org_wacc' | 'keu_for_apv' | 'wrong_hurdle';

// ── MM with-tax ungearing / regearing (β_d default 0) ──
// ungear:  β_a = [β_e·Ve + β_d·Vd(1−T)] / [Ve + Vd(1−T)]
// regear:  β_e = β_a + (β_a − β_d)·Vd(1−T)/Ve         (inverse of the above)
function ungearBeta(betaE: number, ve: number, vd: number, tax: number, betaD: number): number {
  const geared = vd * (1 - tax);
  return (betaE * ve + betaD * geared) / (ve + geared);
}
function regearBeta(betaA: number, ve: number, vd: number, tax: number, betaD: number): number {
  return betaA + (betaA - betaD) * (vd * (1 - tax)) / ve;
}
const capmKe = (rf: number, beta: number, mrp: number): number => rf + beta * mrp;                 // decimal
const waccPct = (kePct: number, kd: number, ve: number, vd: number, tax: number): number => {       // %
  const total = ve + vd;
  return kePct * (ve / total) + kd * (1 - tax) * 100 * (vd / total);
};

export interface CapmInputs {
  rf:        number;   // risk-free rate
  mrp:       number;   // market / equity risk premium
  tax_rate:  number;   // corporate tax rate (STATED in every scenario — needed to ungear)
  debt_beta?: number;  // default 0 (exam-orthodox); supported non-zero for a future kind
  kd?:       number;   // pre-tax cost of debt (WACC kinds)

  // company (org_wacc / wrong_hurdle):
  company_equity_beta?: number;
  company_ve?: number;
  company_vd?: number;

  // peer (project_specific / keu_for_apv / wrong_hurdle):
  peer_equity_beta?: number;
  peer_ve?: number;
  peer_vd?: number;

  // appraising firm's own capital structure to regear into (project_specific):
  own_ve?: number;
  own_vd?: number;

  // wrong_hurdle: the project's expected return (%) tested against both hurdles:
  project_return?: number;
}

export interface CapmComputed {
  kind: CapmKind;
  rf: number; mrp: number; tax: number; debt_beta: number;

  asset_beta?:    number;   // ungeared peer/sector beta
  regeared_beta?: number;   // regeared to the appraising firm
  peer_equity_beta?: number;
  ke?:            number;   // % — organisation cost of equity (org_wacc) or project (project_specific)
  keu?:           number;   // % — ungeared cost of equity (keu_for_apv)
  wacc?:          number;   // % — headline WACC (org_wacc / project_specific)

  // enrichment / comparisons (code-owned)
  beta_direction?: 'higher' | 'lower' | 'equal';   // regeared vs peer equity beta

  // wrong_hurdle:
  company_ke?:    number;
  company_wacc?:  number;
  project_asset_beta?: number;
  project_beta?:  number;   // regeared to the COMPANY's gearing (project financed as the firm)
  project_ke?:    number;
  project_wacc?:  number;
  project_return?: number;
  accept?:        boolean;  // correct decision (project_return vs the PROJECT-specific rate)
  would_accept_on_company?: boolean;
  flips?:         boolean;  // the wrong (company) hurdle flips the decision
}

function req(v: number | undefined, name: string): number {
  if (v === undefined || !Number.isFinite(v)) throw new Error(`CAPM input "${name}" is required for this kind and must be finite`);
  return v;
}

export function computeCapm(raw: CapmInputs, kind: CapmKind): CapmComputed {
  const rf = asDec(raw.rf), mrp = asDec(raw.mrp), tax = asDec(raw.tax_rate);
  const betaD = raw.debt_beta ?? 0;
  if (rf <= 0 || rf >= 1)  throw new Error(`rf out of range (0,1): ${rf}`);
  if (mrp <= 0 || mrp >= 1) throw new Error(`mrp out of range (0,1): ${mrp}`);
  if (tax < 0 || tax >= 1) throw new Error(`tax out of range [0,1): ${tax}`);

  const out: CapmComputed = { kind, rf, mrp, tax, debt_beta: betaD };

  if (kind === 'org_wacc') {
    const beta = req(raw.company_equity_beta, 'company_equity_beta');
    const ve = req(raw.company_ve, 'company_ve'), vd = req(raw.company_vd, 'company_vd');
    const kd = asDec(req(raw.kd, 'kd'));
    out.ke = capmKe(rf, beta, mrp) * 100;
    out.wacc = waccPct(out.ke, kd, ve, vd, tax);
    return out;
  }

  if (kind === 'keu_for_apv') {
    const betaE = req(raw.peer_equity_beta, 'peer_equity_beta');
    const ve = req(raw.peer_ve, 'peer_ve'), vd = req(raw.peer_vd, 'peer_vd');
    out.asset_beta = ungearBeta(betaE, ve, vd, tax, betaD);
    out.keu = capmKe(rf, out.asset_beta, mrp) * 100;
    out.peer_equity_beta = betaE;
    return out;
  }

  if (kind === 'project_specific') {
    const betaE = req(raw.peer_equity_beta, 'peer_equity_beta');
    const pve = req(raw.peer_ve, 'peer_ve'), pvd = req(raw.peer_vd, 'peer_vd');
    const ove = req(raw.own_ve, 'own_ve'), ovd = req(raw.own_vd, 'own_vd');
    const kd = asDec(req(raw.kd, 'kd'));
    out.asset_beta = ungearBeta(betaE, pve, pvd, tax, betaD);
    out.regeared_beta = regearBeta(out.asset_beta, ove, ovd, tax, betaD);
    out.ke = capmKe(rf, out.regeared_beta, mrp) * 100;
    out.wacc = waccPct(out.ke, kd, ove, ovd, tax);
    out.peer_equity_beta = betaE;
    out.beta_direction = out.regeared_beta > betaE + EPS ? 'higher' : out.regeared_beta < betaE - EPS ? 'lower' : 'equal';
    return out;
  }

  // wrong_hurdle: company WACC (company's own beta) vs project WACC (peer risk regeared to the
  // company's gearing — same financing, different business risk). Code owns the flip.
  const cBeta = req(raw.company_equity_beta, 'company_equity_beta');
  const cve = req(raw.company_ve, 'company_ve'), cvd = req(raw.company_vd, 'company_vd');
  const kd = asDec(req(raw.kd, 'kd'));
  out.company_ke = capmKe(rf, cBeta, mrp) * 100;
  out.company_wacc = waccPct(out.company_ke, kd, cve, cvd, tax);

  const pBetaE = req(raw.peer_equity_beta, 'peer_equity_beta');
  const pve = req(raw.peer_ve, 'peer_ve'), pvd = req(raw.peer_vd, 'peer_vd');
  out.project_asset_beta = ungearBeta(pBetaE, pve, pvd, tax, betaD);
  out.project_beta = regearBeta(out.project_asset_beta, cve, cvd, tax, betaD); // financed at the firm's gearing
  out.project_ke = capmKe(rf, out.project_beta, mrp) * 100;
  out.project_wacc = waccPct(out.project_ke, kd, cve, cvd, tax);

  const ret = req(raw.project_return, 'project_return'); // stated %, e.g. 12.5
  out.project_return = ret;
  out.accept = ret > out.project_wacc + EPS;                          // correct: use the project-specific rate
  out.would_accept_on_company = ret > out.company_wacc + EPS;         // the wrong hurdle
  out.flips = out.accept !== out.would_accept_on_company;
  return out;
}

// ── Schema: graded rate/beta chains (OFR carries through) ──
export function buildCapmSchema(raw: CapmInputs, c: CapmComputed, kind: CapmKind): { schema: AnswerSchema; serialized: SerializedSchema } {
  const rf = c.rf, mrp = c.mrp, tax = c.tax, betaD = c.debt_beta;
  const kd = raw.kd !== undefined ? asDec(raw.kd) : 0;
  const components: Component[] = [];
  const recomputeIds: Record<string, string | undefined> = {};

  const beta = (id: string, label: string, value: number, deps?: string[], recompute?: (d: Record<string, number>) => number, steps?: string[]) => {
    components.push({ component_id: id, label, expected_value: value, unit: 'beta', tolerance: BETA_TOL(), depends_on: deps, recompute, working_steps: steps });
  };
  const rate = (id: string, label: string, value: number, deps?: string[], recompute?: (d: Record<string, number>) => number, steps?: string[]) => {
    components.push({ component_id: id, label, expected_value: value, unit: '%', tolerance: RATE_TOL(), depends_on: deps, recompute, working_steps: steps });
  };

  if (kind === 'keu_for_apv') {
    beta('asset_beta', 'Ungeared (asset) beta', c.asset_beta!, undefined, undefined,
      [`β_a = β_e × Ve/(Ve+Vd(1−T)) with β_d=${betaD}`]);
    rate('keu', 'Ungeared cost of equity Keu', c.keu!, ['asset_beta'],
      (d) => (rf + d.asset_beta * mrp) * 100, [`Keu = Rf + β_a × MRP = ${pct2(rf)} + β_a × ${pct2(mrp)}`]);
    recomputeIds.keu = 'capm_keu';
  } else if (kind === 'org_wacc') {
    rate('ke', 'Cost of equity (CAPM)', c.ke!, undefined, undefined,
      [`Ke = Rf + β_e × MRP = ${pct2(rf)} + ${fmtB(raw.company_equity_beta ?? 0)} × ${pct2(mrp)}`]);
    rate('wacc', 'Weighted average cost of capital', c.wacc!, ['ke'],
      (d) => d.ke * (raw.company_ve! / (raw.company_ve! + raw.company_vd!)) + kd * (1 - tax) * 100 * (raw.company_vd! / (raw.company_ve! + raw.company_vd!)),
      [`WACC = Ke×We + Kd(1−T)×Wd`]);
    recomputeIds.wacc = 'wacc_mv_weighted';
  } else if (kind === 'project_specific') {
    beta('asset_beta', 'Ungeared (asset) beta from the peer', c.asset_beta!, undefined, undefined,
      [`β_a = β_e × Ve/(Ve+Vd(1−T)) on the peer's gearing, β_d=${betaD}`]);
    beta('regeared_beta', 'Regeared equity beta (your capital structure)', c.regeared_beta!, ['asset_beta'],
      (d) => regearBeta(d.asset_beta, raw.own_ve!, raw.own_vd!, tax, betaD),
      [`β_e' = β_a × (Ve+Vd(1−T))/Ve on YOUR gearing`]);
    rate('ke_project', 'Project cost of equity (CAPM)', c.ke!, ['regeared_beta'],
      (d) => (rf + d.regeared_beta * mrp) * 100, [`Ke = Rf + β_e' × MRP`]);
    rate('wacc_project', 'Project-specific WACC', c.wacc!, ['ke_project'],
      (d) => d.ke_project * (raw.own_ve! / (raw.own_ve! + raw.own_vd!)) + kd * (1 - tax) * 100 * (raw.own_vd! / (raw.own_ve! + raw.own_vd!)),
      [`WACC = Ke×We + Kd(1−T)×Wd on YOUR gearing`]);
    recomputeIds.regeared_beta = 'mm_regear';
    recomputeIds.ke_project = 'capm_ke';
    recomputeIds.wacc_project = 'wacc_mv_weighted';
  } else {
    // wrong_hurdle — two chains, both graded terminals.
    rate('company_ke', 'Company cost of equity (CAPM)', c.company_ke!, undefined, undefined, [`Ke = Rf + β_company × MRP`]);
    rate('company_wacc', 'Company WACC (the wrong hurdle for this project)', c.company_wacc!, ['company_ke'],
      (d) => d.company_ke * (raw.company_ve! / (raw.company_ve! + raw.company_vd!)) + kd * (1 - tax) * 100 * (raw.company_vd! / (raw.company_ve! + raw.company_vd!)),
      [`WACC = Ke×We + Kd(1−T)×Wd`]);
    beta('project_asset_beta', 'Project asset beta (from the peer)', c.project_asset_beta!, undefined, undefined, [`β_a = β_e × Ve/(Ve+Vd(1−T)) on the peer's gearing`]);
    beta('project_beta', 'Project equity beta (regeared to your gearing)', c.project_beta!, ['project_asset_beta'],
      (d) => regearBeta(d.project_asset_beta, raw.company_ve!, raw.company_vd!, tax, betaD), [`β_e' = β_a × (Ve+Vd(1−T))/Ve`]);
    rate('project_ke', 'Project cost of equity (CAPM)', c.project_ke!, ['project_beta'],
      (d) => (rf + d.project_beta * mrp) * 100, [`Ke = Rf + β_e' × MRP`]);
    rate('project_wacc', 'Project-specific WACC (the correct hurdle)', c.project_wacc!, ['project_ke'],
      (d) => d.project_ke * (raw.company_ve! / (raw.company_ve! + raw.company_vd!)) + kd * (1 - tax) * 100 * (raw.company_vd! / (raw.company_ve! + raw.company_vd!)),
      [`WACC = Ke×We + Kd(1−T)×Wd`]);
    recomputeIds.company_wacc = 'wacc_mv_weighted';
    recomputeIds.project_beta = 'mm_regear';
    recomputeIds.project_ke = 'capm_ke';
    recomputeIds.project_wacc = 'wacc_mv_weighted';
  }

  const serialized: SerializedSchema = {
    components: components.map((comp) => {
      const s: SerializedSchema['components'][number] = {
        component_id: comp.component_id, label: comp.label, expected_value: comp.expected_value,
        unit: comp.unit, tolerance: comp.tolerance, working_steps: comp.working_steps, depends_on: comp.depends_on, weight: comp.weight,
      };
      const rid = recomputeIds[comp.component_id];
      if (rid) s.recompute = rid;
      return s;
    }),
    params: {
      rf, mrp, tax_rate: tax, debt_beta: betaD, kd,
      company_ve: raw.company_ve ?? 0, company_vd: raw.company_vd ?? 0,
      peer_ve: raw.peer_ve ?? 0, peer_vd: raw.peer_vd ?? 0, own_ve: raw.own_ve ?? 0, own_vd: raw.own_vd ?? 0,
    },
  };
  return { schema: { components }, serialized };
}

// ── Model answer: code owns every figure + the rate-comparison and wrong-hurdle verdicts ──
export function buildCapmModelAnswer(raw: CapmInputs, c: CapmComputed, prose: string, kind: CapmKind): string {
  const lines: string[] = [];
  const rf = c.rf, mrp = c.mrp, tax = c.tax;
  const kd = raw.kd !== undefined ? asDec(raw.kd) : 0;

  // Dynamic step numbering — never hardcode; the label is the running count of steps rendered.
  let step = 0;
  const S = () => ++step;
  const commonCapm = `the cost of equity is priced by CAPM (Ke = Rf + β × market risk premium) with Rf = ${pct2(rf)} and MRP = ${pct2(mrp)}; the corporate tax rate is ${pct2(tax)}`;

  // Heading + assumptions — KIND-CONDITIONAL: name only the operations this chain performs.
  lines.push(kind === 'keu_for_apv'
    ? '**Cost of capital — CAPM / ungeared cost of equity**'
    : '**Cost of capital — CAPM / weighted average cost of capital**', '');
  if (kind === 'org_wacc') {
    lines.push(`**Assumptions:** the company's listed equity beta is used **directly** through CAPM — there is **no ungearing or regearing** (this is an organisation-wide WACC, not a proxy-beta exercise); the WACC weights the cost of equity and the **post-tax** cost of debt (Kd×(1−T)) by **market values**; ${commonCapm}.`, '');
  } else if (kind === 'keu_for_apv') {
    lines.push(`**Assumptions:** a peer/sector equity beta is **ungeared** to an asset beta using the **Modigliani–Miller with-tax** relationship β_a = β_e × Ve/(Ve+Vd(1−T)), with the debt beta taken as **${c.debt_beta} (debt assumed risk-free)**; **no WACC is computed** here — the deliverable is the ungeared, all-equity cost of equity; ${commonCapm}.`, '');
  } else {
    lines.push(`**Assumptions:** a peer's equity beta is **ungeared** to an asset beta and **regeared** to the appraising firm's capital structure using the **Modigliani–Miller with-tax** relationship β_a = β_e × Ve/(Ve+Vd(1−T)), with the debt beta taken as **${c.debt_beta} (debt assumed risk-free)**; the WACC weights the cost of equity and the **post-tax** cost of debt (Kd×(1−T)) by **market values**; ${commonCapm}.`, '');
  }
  lines.push('');

  if (kind === 'keu_for_apv') {
    const pv = raw.peer_ve!, pd = raw.peer_vd!;
    lines.push(`**Step ${S()} — Ungear the peer / sector equity beta to an asset beta**`, '');
    lines.push(`β_a = β_e × Ve/(Ve + Vd(1−T)) = ${fmtB(c.peer_equity_beta!)} × ${pv}/(${pv} + ${pd}×(1−${tax})) = **${fmtB(c.asset_beta!)}**`, '');
    lines.push(`**Step ${S()} — Ungeared cost of equity (Keu)**`, '');
    lines.push(`Keu = Rf + β_a × MRP = ${pct2(rf)} + ${fmtB(c.asset_beta!)} × ${pct2(mrp)} = **${fmtR(c.keu!)}**`, '');
    lines.push(`*This ungeared Keu is the discount rate applied to the all-equity base-case cash flows in an **APV** appraisal; the financing side-effects are valued separately.*`, '');
  } else if (kind === 'org_wacc') {
    const ve = raw.company_ve!, vd = raw.company_vd!, tot = ve + vd;
    lines.push(`**Step ${S()} — Cost of equity (CAPM)**`, '');
    lines.push(`Ke = Rf + β_e × MRP = ${pct2(rf)} + ${fmtB(raw.company_equity_beta!)} × ${pct2(mrp)} = **${fmtR(c.ke!)}**`, '');
    lines.push(`**Step ${S()} — Weighted average cost of capital (market-value weights)**`, '');
    lines.push(`| Source | Market value | Weight | Cost | Weighted |`, `|------|------|------|------|------|`);
    lines.push(`| Equity | ${ve} | ${(ve / tot).toFixed(3)} | ${fmtR(c.ke!)} | ${(c.ke! * ve / tot).toFixed(2)}% |`);
    lines.push(`| Debt (post-tax) | ${vd} | ${(vd / tot).toFixed(3)} | ${pct2(kd * (1 - tax))} | ${(kd * (1 - tax) * 100 * vd / tot).toFixed(2)}% |`);
    lines.push(`| **WACC** | ${tot} | 1.000 | | **${fmtR(c.wacc!)}** |`, '');
    lines.push(`The cost of equity (${fmtR(c.ke!)}) exceeds the post-tax cost of debt (${pct2(kd * (1 - tax))}), as expected — equity holders bear the residual risk and price it higher.`, '');
  } else if (kind === 'project_specific') {
    const pv = raw.peer_ve!, pd = raw.peer_vd!, ov = raw.own_ve!, od = raw.own_vd!, tot = ov + od;
    lines.push(`**Step ${S()} — Ungear the peer's equity beta (strip out the peer's financial risk)**`, '');
    lines.push(`β_a = β_e × Ve/(Ve + Vd(1−T)) = ${fmtB(c.peer_equity_beta!)} × ${pv}/(${pv} + ${pd}×(1−${tax})) = **${fmtB(c.asset_beta!)}**`, '');
    lines.push(`**Step ${S()} — Regear to YOUR capital structure**`, '');
    lines.push(`β_e' = β_a × (Ve + Vd(1−T))/Ve = ${fmtB(c.asset_beta!)} × (${ov} + ${od}×(1−${tax}))/${ov} = **${fmtB(c.regeared_beta!)}**`, '');
    lines.push(`The regeared equity beta (**${fmtB(c.regeared_beta!)}**) is **${c.beta_direction}** than the peer's equity beta (${fmtB(c.peer_equity_beta!)}) because your gearing ${c.beta_direction === 'higher' ? 'exceeds' : c.beta_direction === 'lower' ? 'is below' : 'matches'} the peer's — the asset (business) risk is the same, only the financial risk differs.`, '');
    lines.push(`**Step ${S()} — Project cost of equity (CAPM)**`, '');
    lines.push(`Ke = Rf + β_e' × MRP = ${pct2(rf)} + ${fmtB(c.regeared_beta!)} × ${pct2(mrp)} = **${fmtR(c.ke!)}**`, '');
    lines.push(`**Step ${S()} — Project-specific WACC (market-value weights)**`, '');
    lines.push(`WACC = Ke × We + Kd(1−T) × Wd = ${fmtR(c.ke!)} × ${(ov / tot).toFixed(3)} + ${pct2(kd * (1 - tax))} × ${(od / tot).toFixed(3)} = **${fmtR(c.wacc!)}**`, '');
    lines.push(`This project rate reflects the **business risk of the peer's activity**, not your firm's own line of business — using your own company WACC would misprice a project of different risk.`, '');
  } else {
    // wrong_hurdle
    const ve = raw.company_ve!, vd = raw.company_vd!, tot = ve + vd, pv = raw.peer_ve!, pd = raw.peer_vd!;
    lines.push(`**Step ${S()} — The company's own WACC (the tempting but WRONG hurdle here)**`, '');
    lines.push(`Company Ke = Rf + β_company × MRP = ${pct2(rf)} + ${fmtB(raw.company_equity_beta!)} × ${pct2(mrp)} = ${fmtR(c.company_ke!)}.`, '');
    lines.push(`Company WACC = ${fmtR(c.company_ke!)} × ${(ve / tot).toFixed(3)} + ${pct2(kd * (1 - tax))} × ${(vd / tot).toFixed(3)} = **${fmtR(c.company_wacc!)}**.`, '');
    lines.push(`**Step ${S()} — The project-specific rate (ungear the peer, regear to your gearing)**`, '');
    lines.push(`β_a = ${fmtB(raw.peer_equity_beta!)} × ${pv}/(${pv} + ${pd}×(1−${tax})) = ${fmtB(c.project_asset_beta!)}; β_e' = ${fmtB(c.project_beta!)}.`, '');
    lines.push(`Project Ke = ${pct2(rf)} + ${fmtB(c.project_beta!)} × ${pct2(mrp)} = ${fmtR(c.project_ke!)}; Project WACC = **${fmtR(c.project_wacc!)}**.`, '');
    lines.push(`**Step ${S()} — Decision (code-owned)**`, '');
    const correct = c.accept ? 'ACCEPT' : 'REJECT';
    const wrong = c.would_accept_on_company ? 'accepted' : 'rejected'; // full past-tense — never split a verb with bold markers
    lines.push(
      c.flips
        ? `The project's expected return is **${fmtR(c.project_return!)}**. Against the correct **project-specific** hurdle of ${fmtR(c.project_wacc!)}, the decision is **${correct}**. Against the company WACC of ${fmtR(c.company_wacc!)}, you would have wrongly **${wrong}** it — the wrong hurdle **flips the decision**. The project must be judged on its OWN risk, not the firm's average.`
        : `The project's expected return is **${fmtR(c.project_return!)}**. It clears (or fails) both the company WACC (${fmtR(c.company_wacc!)}) and the project-specific rate (${fmtR(c.project_wacc!)}) the same way, so the decision is **${correct}** — but the board must still use the project-specific rate ${fmtR(c.project_wacc!)}, because relying on the company average is only safe by coincidence here.`,
      '',
    );
  }

  lines.push(`**Step ${S()} — Evaluation / advice to the board**`, '');
  lines.push(prose, '');

  // Reconciliation
  if (kind === 'keu_for_apv') lines.push(`*Reconciliation: peer β_e ${fmtB(c.peer_equity_beta!)} → asset β ${fmtB(c.asset_beta!)} → Keu ${fmtR(c.keu!)} ✓*`);
  else if (kind === 'org_wacc') lines.push(`*Reconciliation: Ke ${fmtR(c.ke!)}, WACC ${fmtR(c.wacc!)} ✓*`);
  else if (kind === 'project_specific') lines.push(`*Reconciliation: asset β ${fmtB(c.asset_beta!)} → regeared β ${fmtB(c.regeared_beta!)} → Ke ${fmtR(c.ke!)} → WACC ${fmtR(c.wacc!)} ✓*`);
  else lines.push(`*Reconciliation: company WACC ${fmtR(c.company_wacc!)} vs project WACC ${fmtR(c.project_wacc!)}; correct hurdle = project-specific. ✓*`);

  return lines.join('\n');
}
