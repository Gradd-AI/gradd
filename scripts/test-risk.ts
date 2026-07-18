// scripts/test-risk.ts
// Fixtures for the AFM risk & uncertainty family (lib/acca/risk.ts, calculator #3). Pure — no env/DB/model.
// Anchors to the page-verified ACCA conventions (docs/evidence/AFM_RISK_EVIDENCE.md): ENPV=Σ(p×NPV) [S6,S7],
// sensitivity=100×NPV/PV-affected [S3,S4] + disc-rate=(IRR−r)/r×100 [S4], duration=Σ(t×PV)/ΣPV [S1,S2],
// VaR=z×σ×√N one-tail 1.65/2.33 [article]. Proves compute + the five family gates (G-a…G-e).
import {
  computeEnpv, computeSensitivity, computeRadr, computeRiskMeasures,
  pvOfStream, npvOfStream, irrOfStream, projectDuration, zForConfidence,
  checkProbabilitySum, checkEnpvConsistency, checkSensitivityReconciliation, checkRadrOrdering, checkVarAndDuration,
  buildEnpvSchema, buildEnpvModelAnswer, buildSensitivitySchema, buildSensitivityModelAnswer,
  buildRadrSchema, buildRadrModelAnswer, buildRiskMeasuresSchema, buildRiskMeasuresModelAnswer,
  type EnpvInputs, type SensitivityInputs, type RadrInputs, type RiskMeasuresInputs,
} from '../lib/acca/risk';
import { validateSchemaSelfConsistency } from '../lib/acca/validate-schema';
import { verifyNumericAnswer, type AnswerSchema, type StudentSubmission, type Verdict } from '../lib/acca/numeric-verifier';

// GATE2 figure-integrity: every component expected_value present in the worked answer (1–4 dp, abs too).
function figuresPresent(schema: AnswerSchema, answer: string): boolean {
  const n = answer.replace(/,/g, '');
  return schema.components.every((c) => [1, 2, 3, 4].some((d) => n.includes(c.expected_value.toFixed(d)) || n.includes(Math.abs(c.expected_value).toFixed(d))));
}
// GATE3 seeded-OFR (distinct-factor root perturbation), mirroring the generator.
function ofrCarries(schema: AnswerSchema): boolean {
  const own = new Map<string, number>(); const components: StudentSubmission['components'] = []; const expected: Record<string, Verdict> = {};
  let rootIdx = 0;
  for (const c of schema.components) {
    const deps = c.depends_on ?? [];
    if (deps.length === 0 || !c.recompute) { const f = Math.max(0.30, 0.85 - rootIdx * 0.06); rootIdx++; const v = c.expected_value * f; own.set(c.component_id, v); components.push({ component_id: c.component_id, value: v, workings: 'seeded' }); expected[c.component_id] = 'incorrect'; }
    else { const dv: Record<string, number> = {}; for (const d of deps) dv[d] = own.get(d)!; const v = c.recompute(dv); own.set(c.component_id, v); components.push({ component_id: c.component_id, value: v, workings: 'ofr' }); expected[c.component_id] = 'carried'; }
  }
  const res = verifyNumericAnswer(schema, { components });
  return res.per_component.every((p) => p.verdict === expected[p.component_id]) && res.per_component.some((p) => p.verdict === 'carried');
}

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

// ─────────────────────── schema gates GATE1/2/3 per kind (code owns every figure; OFR carries) ───────────────────────
const s1 = buildEnpvSchema(k1, c1), a1 = buildEnpvModelAnswer(k1, c1, 'Board advice prose.');
ok('K1 GATE1 self-consistency', validateSchemaSelfConsistency(s1.schema).ok);
ok('K1 GATE2 figure-integrity (every figure in the model answer)', figuresPresent(s1.schema, a1));
ok('K1 GATE3 OFR: wrong scenario NPV → ENPV carried', ofrCarries(s1.schema));
ok('K1 model answer carries the ENPV heading + one-shot caveat', a1.includes('expected net present value (ENPV)') && a1.includes('once'));

const s2 = buildSensitivitySchema(k2, c2), a2 = buildSensitivityModelAnswer(k2, c2, 'Board advice prose.');
ok('K2 GATE1 self-consistency', validateSchemaSelfConsistency(s2.schema).ok);
ok('K2 GATE2 figure-integrity', figuresPresent(s2.schema, a2));
ok('K2 GATE3 OFR: wrong base_npv/pv/irr → margins carried', ofrCarries(s2.schema));
ok('K2 model answer distinguishes headroom (pp) from sensitivity (%)', a2.includes('headroom') && a2.includes('not sensitivity'));

const s3 = buildRadrSchema(k3flip, c3f), a3 = buildRadrModelAnswer(k3flip, c3f, 'Board advice prose.');
ok('K3 GATE1 self-consistency', validateSchemaSelfConsistency(s3.schema).ok);
ok('K3 GATE2 figure-integrity', figuresPresent(s3.schema, a3));
ok('K3 GATE3 OFR: wrong RADR → NPV-at-RADR carried', ofrCarries(s3.schema));
ok('K3 model answer states the FLIP', a3.includes('FLIPS'));

const s4 = buildRiskMeasuresSchema(k4, c4), a4 = buildRiskMeasuresModelAnswer(k4, c4, 'Board advice prose.');
ok('K4 GATE1 self-consistency', validateSchemaSelfConsistency(s4.schema).ok);
ok('K4 GATE2 figure-integrity', figuresPresent(s4.schema, a4));
ok('K4 GATE3 OFR: wrong Σ(t×PV) → duration carried', ofrCarries(s4.schema));
ok('K4 model answer names the longer-duration project + one-tail VaR', a4.includes(c4.longer) && a4.includes('one-tail'));
ok('K4 duration phrased as "PV-weighted average timing of cash inflows" (FR2, not "time to recover value")',
  a4.includes('PV-weighted average timing of cash inflows') && !a4.includes('time to recover value'));

// ─── citations are builder/reviewer artefacts — NO S-id / [article] tag in student-facing output ───
const TAG = /\[S[0-9]|\[article\]/;
for (const [name, ma] of [['K1', a1], ['K2', a2], ['K3', a3], ['K4', a4]] as const)
  ok(`${name} model answer carries NO S-id/[article] citation tag (student-facing)`, !TAG.test(ma));
for (const [name, sc] of [['K1', s1], ['K2', s2], ['K3', s3], ['K4', s4]] as const)
  ok(`${name} schema working_steps carry NO citation tag`, !sc.schema.components.some((c) => (c.working_steps ?? []).some((w) => TAG.test(w))));

console.log(failures === 0 ? '\nALL RISK FIXTURES PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
