// scripts/test-capm-gates.ts
// Fixtures for lib/acca/validate-capm.ts (CAPM-1 / CAPM-2 / CAPM-4 / CAPM-9).
// PURE — no DB, no network, no model. Run: npm run test:capm-gates
//
// Each gate gets BOTH a passing case built from the real calculator and a deliberately-broken
// case that MUST fail. A gate with only a passing fixture is untested: it would still pass if
// the body were `return { ok: true, issues: [] }`.
//
// CAPM-2's broken case is the swapped peer/own tax rate — the specific defect the gate exists
// for, and the one no other gate in the suite can see.

import { computeCapm, buildCapmModelAnswer } from '../lib/acca/capm';
import {
  validateCapmBetaRoundTrip, validateCapmTwoRateAssignment, validateCapmWaccBlend, validateCapmHc1Disclosure,
} from '../lib/acca/validate-capm';

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); }
}
const mustPass = (label: string, r: { ok: boolean; issues: { code: string }[] }) =>
  ok(label, r.ok, r.issues.map((i) => i.code).join(', '));
const mustFail = (label: string, r: { ok: boolean; issues: { code: string }[] }, code?: string) =>
  ok(label, !r.ok && (!code || r.issues.some((i) => i.code === code)),
    r.ok ? 'gate PASSED on deliberately-broken input' : `codes: ${r.issues.map((i) => i.code).join(', ')}`);

// ── The real Mock 1 A(i) inputs: a genuine TWO-RATE project_specific drill ──
const raw = { rf: 4.5, mrp: 6.0, tax_rate: 25, peer_tax_rate: 34, kd: 5.5, peer_equity_beta: 1.35, peer_ve: 60, peer_vd: 40, own_ve: 70, own_vd: 30 };
const c = computeCapm(raw, 'project_specific');
const ma = buildCapmModelAnswer(raw, c, 'Advice prose.', 'project_specific');
const PTAX = 0.34, OTAX = 0.25, BETAD = 0;

console.log('\n-- CAPM-1 ungear/regear round-trip --');
mustPass('real A(i) asset beta round-trips to the peer equity beta',
  validateCapmBetaRoundTrip(c.peer_equity_beta!, 60, 40, PTAX, BETAD, c.asset_beta!));
mustFail('BROKEN: Ve/Vd transposed in the round-trip',
  validateCapmBetaRoundTrip(c.peer_equity_beta!, 40, 60, PTAX, BETAD, c.asset_beta!), 'ungear-regear-not-inverse');
mustFail('BROKEN: asset beta nudged by 0.01 (inside the ±0.02 DISPLAY tolerance, outside this gate)',
  validateCapmBetaRoundTrip(c.peer_equity_beta!, 60, 40, PTAX, BETAD, c.asset_beta! + 0.01), 'ungear-regear-not-inverse');

console.log('\n-- CAPM-2 HC1 two-rate assignment --');
mustPass('real A(i) uses the PEER rate to ungear and the OWN rate to regear',
  validateCapmTwoRateAssignment(c.peer_equity_beta!, 60, 40, 70, 30, PTAX, OTAX, BETAD, c.asset_beta!, c.regeared_beta!));
// THE canonical break: author the whole chain with the two HC1 rates swapped.
const swapped = computeCapm({ ...raw, tax_rate: 34, peer_tax_rate: 25 }, 'project_specific');
mustFail('BROKEN: peer/own tax rates SWAPPED end-to-end',
  validateCapmTwoRateAssignment(c.peer_equity_beta!, 60, 40, 70, 30, PTAX, OTAX, BETAD, swapped.asset_beta!, swapped.regeared_beta!),
  'ungear-at-own-rate-SWAPPED');
mustFail('BROKEN: ungeared at the own rate only (regear left correct)',
  validateCapmTwoRateAssignment(c.peer_equity_beta!, 60, 40, 70, 30, PTAX, OTAX, BETAD, swapped.asset_beta!, undefined),
  'ungear-at-own-rate-SWAPPED');
ok('the swap moves the asset beta materially (proves the fixture is a real defect)',
  Math.abs(swapped.asset_beta! - c.asset_beta!) > 0.02,
  `delta ${Math.abs(swapped.asset_beta! - c.asset_beta!)}`);

console.log('\n-- CAPM-4 WACC weight + blend --');
mustPass('real A(i) weights sum to 1, match own_ve/own_vd, and reproduce the WACC',
  validateCapmWaccBlend(c.ke!, c.kd_after_tax!, c.weight_equity!, c.weight_debt!, 70, 30, c.wacc!));
mustFail('BROKEN: weights taken from the PEER pair (60/40) instead of own (70/30)',
  validateCapmWaccBlend(c.ke!, c.kd_after_tax!, 0.6, 0.4, 70, 30, c.wacc!), 'weights-off-the-wrong-pair');
mustFail('BROKEN: weights do not sum to 1',
  validateCapmWaccBlend(c.ke!, c.kd_after_tax!, 0.7, 0.4, 70, 30, c.wacc!), 'weights-do-not-sum-to-one');
mustFail('BROKEN: stated WACC does not match its own quoted blend',
  validateCapmWaccBlend(c.ke!, c.kd_after_tax!, c.weight_equity!, c.weight_debt!, 70, 30, c.wacc! + 0.5), 'blend-does-not-reproduce-wacc');

console.log('\n-- CAPM-9 HC1 disclosure --');
mustPass('real A(i) model answer attributes the ungear rate to the peer and carries the WHY',
  validateCapmHc1Disclosure('34.00%', '25.00%', 'project_specific', ma));
mustFail('BROKEN: the "(T = the peer\'s ...)" attribution stripped out',
  validateCapmHc1Disclosure('34.00%', '25.00%', 'project_specific', ma.split("the peer's 34.00%").join('34.00%')),
  'ungear-rate-not-attributed-to-peer');
mustFail('BROKEN: the WHY sentence removed from a project_specific answer',
  validateCapmHc1Disclosure('34.00%', '25.00%', 'project_specific',
    ma.split('shield being stripped out is the peer').join('shield is generic')), 'why-sentence-missing');
// CALIBRATION: the WHY is only emitted for project_specific, so other kinds must NOT be
// required to carry it. This asserts the gate does not false-positive on correct content.
mustPass('CALIBRATION: wrong_hurdle is NOT required to carry the WHY sentence',
  validateCapmHc1Disclosure('34.00%', '25.00%', 'wrong_hurdle',
    ma.split('shield being stripped out is the peer').join('shield is generic')));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} capm-gates: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
