// scripts/test-risk.ts
// Fixtures for the AFM risk & uncertainty family (lib/acca/risk.ts, calculator #3). Pure — no env/DB/model.
// Anchors to the page-verified ACCA conventions (docs/evidence/AFM_RISK_EVIDENCE.md): ENPV=Σ(p×NPV) [S6,S7],
// sensitivity=100×NPV/PV-affected [S3,S4] + disc-rate=(IRR−r)/r×100 [S4], duration=Σ(t×PV)/ΣPV [S1,S2],
// VaR=z×σ×√N one-tail 1.65/2.33 [article]. Proves compute + the five family gates (G-a…G-e).
import {
  computeEnpv, computeSensitivity, computeRadr, computeRiskMeasures,
  pvOfStream, npvOfStream, irrOfStream, projectDuration, zForConfidence,
  checkProbabilitySum, checkEnpvConsistency, checkSensitivityReconciliation, checkRadrOrdering, checkVarAndDuration,
  type EnpvInputs, type SensitivityInputs, type RadrInputs, type RiskMeasuresInputs,
} from '../lib/acca/risk';

let failures = 0;
function ok(name: string, cond: boolean) { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`); }
const approx = (a: number, b: number, tol = 1e-2) => Math.abs(a - b) < tol;

// ─────────────────────── primitives ───────────────────────
ok('pvOfStream discounts correctly ([600,600]@10% = 1041.32)', approx(pvOfStream([600, 600], 0.10), 1041.3223, 1e-3));
ok('npvOfStream = −outlay + PV', approx(npvOfStream(1000, [600, 600], 0.10), 41.3223, 1e-3));
ok('irrOfStream finds NPV=0 rate', approx(npvOfStream(1000, [600, 600], irrOfStream(1000, [600, 600])), 0, 1e-4));

// ─────────────────────── K1 — ENPV [S6, S7] ───────────────────────
const k1: EnpvInputs = { currency: 'GBP', outlay: 100, discount_rate: 0.10, scenarios: [
  { label: 'Upside', probability: 0.5, cash_flows: [80, 80] },
  { label: 'Downside', probability: 0.5, cash_flows: [20, 20] },
] };
const c1 = computeEnpv(k1);
// npv_up = −100 + 80/1.1 + 80/1.21 = 38.843 ; npv_dn = −100 + 20/1.1 + 20/1.21 = −65.289 ; ENPV = −13.223
ok('K1 scenario NPVs computed from stated streams', approx(c1.scenarios[0].npv, 38.843, 1e-2) && approx(c1.scenarios[1].npv, -65.289, 1e-2));
ok('K1 ENPV = Σ(p×NPV) = −13.22', approx(c1.enpv, -13.223, 1e-2));
ok('K1 P(negative NPV) = 0.5 (one-shot risk measure)', approx(c1.p_negative, 0.5, 1e-9));
ok('K1 EV-max decision: ENPV<0 → reject', c1.accept === false);
ok('K1 GATE G-a probabilities sum to 1', checkProbabilitySum(k1.scenarios.map((s) => s.probability)).ok);
ok('K1 GATE G-a FAILS on probs that do not sum to 1', !checkProbabilitySum([0.5, 0.4]).ok);
ok('K1 GATE G-b ENPV consistency', checkEnpvConsistency(c1.scenarios, c1.enpv).ok);
ok('K1 GATE G-b FAILS on a tampered ENPV', !checkEnpvConsistency(c1.scenarios, c1.enpv + 10).ok);

// ─────────────────────── K2 — sensitivity [S3, S4] ───────────────────────
const k2: SensitivityInputs = { currency: 'GBP', outlay: 1000, net_cash_flows: [600, 600], affected_cash_flows: [600, 600], variable_label: 'contribution', discount_rate: 0.10 };
const c2 = computeSensitivity(k2);
ok('K2 variable sensitivity % = 100×NPV/PV-affected [S3]', approx(c2.variable_sensitivity_pct, 100 * 41.3223 / 1041.3223, 1e-3));
ok('K2 disc-rate sensitivity % = (IRR−r)/r×100 [S4]', approx(c2.disc_rate_sensitivity_pct, ((c2.irr - 0.10) / 0.10) * 100, 1e-6));
ok('K2 headroom (IRR−r) is DISTINCT from the sensitivity % (not the bare difference)', Math.abs(c2.headroom_pp - c2.disc_rate_sensitivity_pct) > 1e-3);
ok('K2 GATE G-c reconciliation (margin zeros the NPV; disc-rate is /r, not bare)', checkSensitivityReconciliation(c2).ok);
// bare-difference error: label the headroom as the sensitivity → G-c must reject
ok('K2 GATE G-c FAILS when disc-rate sensitivity is the bare IRR−r headroom [S4 error]',
  !checkSensitivityReconciliation({ ...c2, disc_rate_sensitivity_pct: c2.headroom_pp }).ok);
// wrong PV base → margin no longer zeros the NPV
ok('K2 GATE G-c FAILS on a wrong affected-PV base', !checkSensitivityReconciliation({ ...c2, pv_affected: c2.pv_affected * 1.5 }).ok);
// S4 anchor: IRR 18.4%, r 11% → 67.3%
ok('K2 S4 anchor: (18.4−11)/11×100 = 67.3%', approx(((0.184 - 0.11) / 0.11) * 100, 67.27, 1e-1));

// ─────────────────────── K3 — RADR compare [S5, S6] ───────────────────────
const k3: RadrInputs = {
  currency: 'GBP', outlay: 100, project_cash_flows: [40, 40, 40],
  company_rate: 0.09,
  rf: 0.04, mrp: 0.06, tax_rate: 0.25, kd: 0.06,
  peer_equity_beta: 1.6, peer_ve: 60, peer_vd: 40,   // riskier, different-industry proxy
  own_ve: 70, own_vd: 30,
};
const c3 = computeRadr(k3);
ok('K3 RADR = the CAPM-composed project-specific WACC (composition, one-way)', c3.radr > 0);
ok('K3 discounts the SAME project cash flows at company rate and RADR', approx(c3.npv_at_company, npvOfStream(100, [40, 40, 40], 0.09), 1e-6) && approx(c3.npv_at_radr, npvOfStream(100, [40, 40, 40], c3.radr), 1e-6));
ok('K3 riskier proxy → RADR above the company rate', c3.radr > c3.company_rate);
ok('K3 GATE G-d composition + ordering', checkRadrOrdering(k3, c3).ok);
ok('K3 GATE G-d FAILS on a drifted RADR (not the CAPM WACC)', !checkRadrOrdering(k3, { ...c3, radr: c3.radr + 0.05 }).ok);
// engineer a FLIP: a company_rate below breakeven (accept) with a RADR above it (reject)
const k3flip: RadrInputs = { ...k3, company_rate: 0.05, project_cash_flows: [38, 38, 38] };
const c3f = computeRadr(k3flip);
ok('K3 decision FLIPS when the wrong (company) rate is used for a different-risk project',
  c3f.flips && c3f.accept_company !== c3f.accept_radr);

// ─────────────────────── K4 — risk measures: duration + VaR [S1, S2, article] ───────────────────────
// duration hand-check: [100,100,100] @0% → (1+2+3)/3 = 2.0 ; @10% → 1.937
ok('K4 duration = Σ(t×PV)/ΣPV; flat @0% = 2.00 [S1,S2]', approx(projectDuration([100, 100, 100], 0).duration, 2.0, 1e-9));
ok('K4 duration discounted @10% = 1.94', approx(projectDuration([100, 100, 100], 0.10).duration, 1.9366, 1e-3));
// S2 arithmetic anchor: 173,254,000 / 57,005,000 = 3.04
ok('K4 S2 anchor: 173254000/57005000 = 3.04y', approx(173254000 / 57005000, 3.04, 1e-2));
ok('K4 z one-tail 95% = 1.65, 99% = 2.33 [article]', zForConfidence(0.95, 'one') === 1.65 && zForConfidence(0.99, 'one') === 2.33);
const k4: RiskMeasuresInputs = {
  currency: 'GBP', discount_rate: 0.10,
  project_a: { label: 'Project A (front-loaded)', cash_flows: [200, 100, 50] },
  project_b: { label: 'Project B (back-loaded)', cash_flows: [50, 100, 200] },
  var_sigma_annual: 12, var_confidence: 0.95, var_tail: 'one', var_horizon_years: 4,
};
const c4 = computeRiskMeasures(k4);
ok('K4 comparative duration: back-loaded project is longer (more exposed)', c4.duration_b > c4.duration_a && c4.longer === 'Project B (back-loaded)');
ok('K4 VaR = z×σ×√N = 1.65×12×√4 = 39.6', approx(c4.var_amount, 1.65 * 12 * 2, 1e-6));
ok('K4 GATE G-e VaR tail + duration bounds', checkVarAndDuration(k4, c4).ok);
ok('K4 GATE G-e FAILS on a two-tail z (1.96) for a one-tail VaR', !checkVarAndDuration(k4, { ...c4, z: 1.96 }).ok);
ok('K4 GATE G-e FAILS on a duration exceeding project life', !checkVarAndDuration(k4, { ...c4, duration_a: 9.9 }).ok);

console.log(failures === 0 ? '\nALL RISK FIXTURES PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
