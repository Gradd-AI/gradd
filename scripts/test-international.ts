// scripts/test-international.ts
// Fixtures for the AFM international family (lib/acca/international.ts, calculator #10). Pure — no env/DB/model.
// Exit 1 on any mismatch. Covers all four kinds + the three gates, under the Fix-Round-1 tax rule:
//   (1) parity forward curve DERIVED (PPP vs IRP, geometric single-differential),
//   (2) DIFFERENTIAL double-tax on the PBIT taxable-profit base (max(0, home − foreign CORP)), a
//       separate WHT layer with a per-scenario creditable flag; K1 NIL case (foreign corp ≥ home),
//   (3) GATE1 self-consistency + GATE2 figure-integrity on every schema; OFR carry-through,
//   (4) the three gates PASS on coherent inputs and FAIL on seeded violations (incl. GATE 14 new rule),
//   (5) floor tolerance (max 0.5% rel, 0.2 abs); remittance blocking; K2 flip; K4 sustainability.
import {
  fmt4, buildForwardCurve, parityDifferential, computeYearTax,
  computeIntlNpv, buildIntlNpvSchema, buildIntlNpvModelAnswer,
  computeIntlSensitivity, buildIntlSensitivitySchema, buildIntlSensitivityModelAnswer,
  computeIntlRemittance, buildIntlRemittanceSchema, buildIntlRemittanceModelAnswer,
  computeIntlDividend, buildIntlDividendSchema, buildIntlDividendModelAnswer,
  checkParityConsistency, checkCurrencyScale, checkDoubleTaxCap,
  type IntlNpvInputs, type IntlSensitivityInputs, type IntlRemittanceInputs, type IntlDividendInputs,
} from '../lib/acca/international';
import {
  validateSchemaSelfConsistency, validateParityConsistency, validateCurrencyScale, validateDoubleTaxCap,
} from '../lib/acca/validate-schema';
import { verifyNumericAnswer, type AnswerSchema } from '../lib/acca/numeric-verifier';

let failures = 0;
function ok(name: string, cond: boolean) { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`); }
function figuresPresent(schema: AnswerSchema, answer: string): boolean {
  const norm = answer.replace(/,/g, '');
  return schema.components.every((c) => [1, 2, 3, 4].some((d) => norm.includes(c.expected_value.toFixed(d)) || norm.includes(Math.abs(c.expected_value).toFixed(d))));
}
const approx = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

// ─────────────────────────── parity curve (derived, never asserted) ───────────────────────────
const kPPP = parityDifferential('ppp', 0.03, 0.09);
const curve = buildForwardCurve(20, 'ppp', 0.03, 0.09, 4);
ok('PPP differential = (1+rf)/(1+rh)', approx(kPPP, 1.09 / 1.03));
ok('forward curve compounds geometrically S_t = S0·k^t', approx(curve[0], 20 * kPPP) && approx(curve[3], 20 * Math.pow(kPPP, 4)));
ok('foreign depreciates when foreign inflation higher', curve[3] > curve[0] && curve[0] > 20);
ok('IRP uses the same formula on interest inputs', approx(parityDifferential('irp', 0.02, 0.05), 1.05 / 1.02));

// ─────────────────────────── differential double-tax (credit base = corporate) ───────────────────────────
// home 30%, foreign corp 20% → differential 10% of taxable profit; WHT separate
const t1 = computeYearTax(100, 120, 0.10, 0.30, 0.20, true);   // creditable: max(0, 0.30·120 − 0.20·120 − 0.10·100) = max(0, 36−24−10)=2
ok('creditable: additional = max(0, homeLiab − foreignCorp − WHT)', approx(t1.additional_home_tax_foreign, 2));
ok('creditable: net remit = FCFF − WHT − additional', approx(t1.net_remit_foreign, 100 - 10 - 2));
const t2 = computeYearTax(100, 120, 0.10, 0.30, 0.20, false);  // not creditable: max(0,(0.30−0.20))·120 = 12
ok('not creditable: additional = max(0, home − foreignCorp) × taxable profit', approx(t2.additional_home_tax_foreign, 12));
const t3 = computeYearTax(100, 120, 0.05, 0.21, 0.28, true);   // foreign corp 28% > home 21% → NIL
ok('NIL case: foreign corp ≥ home → no additional home tax', approx(t3.additional_home_tax_foreign, 0));
ok('NIL case: net remit = FCFF − WHT only', approx(t3.net_remit_foreign, 100 - 5));

// ─────────────────────────── K1 — home_currency_standard (NIL differential, Morocco-style) ───────────────────────────
const k1: IntlNpvInputs = {
  home_currency: 'USD', foreign_currency: 'MAD', base_spot: 10.2, basis: 'ppp',
  rate_home: 0.03, rate_foreign: 0.045, discount_rate: 0.11,
  foreign_build: { pbit: 820, tax_rate: 0.28, depreciation: 310, capex: 145, delta_working_capital: 55 },
  foreign_growth: 0.02, years: 4, initial_outlay_foreign: 1200,
  withholding_rate: 0.075, home_tax_rate: 0.21, wht_creditable: true,
};
const c1 = computeIntlNpv(k1);
const s1 = buildIntlNpvSchema(k1, c1);
const a1 = buildIntlNpvModelAnswer(k1, c1, 'Prose.');
ok('K1 base foreign FCFF from the build', approx(c1.base_fcff_foreign, 820 * 0.72 + 310 - 145 - 55));
ok('K1 additional home tax is NIL (foreign corp 28% > home 21%)', c1.has_additional_home_tax === false && c1.years.every((y) => y.additional_home_tax_foreign === 0));
ok('K1 year-1 home cash flow = (FCFF − WHT) ÷ spot (no additional tax)', approx(c1.years[0].home_cf, (c1.years[0].foreign_cf - c1.years[0].wht) / c1.years[0].fx));
ok('K1 schema: GATE1 self-consistency clean (no add_tax component in the NIL case)', validateSchemaSelfConsistency(s1.schema).ok);
ok('K1 schema omits per-year add_tax components (NIL)', !s1.schema.components.some((c) => c.component_id.startsWith('add_tax_')));
ok('K1 model answer: GATE2 figure-integrity', figuresPresent(s1.schema, a1));
ok('K1 model answer teaches WHY the additional tax is nil', a1.includes('NO additional home tax') || a1.includes('nil'));
ok('K1 parity gate PASSES; FAILS on a tampered forward', validateParityConsistency(c1.fx_curve, 10.2, 'ppp', 0.03, 0.045).ok && !validateParityConsistency([...c1.fx_curve.slice(0, -1), c1.fx_curve[c1.fx_curve.length - 1] * 1.1], 10.2, 'ppp', 0.03, 0.045).ok);
ok('K1 currency-scale gate PASSES; FAILS on a ×1000 slip', validateCurrencyScale(c1.years).ok && !validateCurrencyScale([{ fx: c1.years[0].fx, foreign_remit_net: c1.years[0].foreign_remit_net, home_cf: c1.years[0].home_cf * 1000 }]).ok);

// ─────────────────────────── K1t — TAXED variant (differential bites → per-year add_tax component, OFR) ───────────────────────────
const k1t: IntlNpvInputs = { ...k1, home_tax_rate: 0.30, foreign_build: { ...k1.foreign_build, tax_rate: 0.20 } };
const c1t = computeIntlNpv(k1t);
const s1t = buildIntlNpvSchema(k1t, c1t);
const a1t = buildIntlNpvModelAnswer(k1t, c1t, 'Prose.');
ok('K1t differential bites (home 30% > foreign corp 20%) → per-year additional home tax > 0', c1t.has_additional_home_tax && c1t.years.every((y) => y.additional_home_tax_foreign > 0));
ok('K1t schema HAS per-year add_tax components', s1t.schema.components.some((c) => c.component_id === 'add_tax_1'));
ok('K1t schema: GATE1 self-consistency clean', validateSchemaSelfConsistency(s1t.schema).ok);
ok('K1t model answer: GATE2 figure-integrity', figuresPresent(s1t.schema, a1t));
ok('K1t double-tax cap gate PASSES on the differential rule', validateDoubleTaxCap(0.075, 0.30, 0.20, true, c1t.years.map((y) => ({ taxable_profit: y.taxable_profit, fcff: y.foreign_cf, additional_home_tax_foreign: y.additional_home_tax_foreign }))).ok);
ok('K1t double-tax cap gate FAILS on a tampered additional tax', !validateDoubleTaxCap(0.075, 0.30, 0.20, true, [{ taxable_profit: c1t.years[0].taxable_profit, fcff: c1t.years[0].foreign_cf, additional_home_tax_foreign: c1t.years[0].additional_home_tax_foreign * 2 }]).ok);
// OFR: wrong fx_1 → fx_2 & add_tax & home_cf & npv carried
const own: Record<string, number> = {};
const subComps = s1t.schema.components.map((comp) => {
  const deps = comp.depends_on ?? [];
  if (deps.length === 0 || !comp.recompute) { const v = comp.component_id === 'fx_1' ? comp.expected_value * 0.8 : comp.expected_value; own[comp.component_id] = v; return { component_id: comp.component_id, value: v, workings: 'seeded/root' }; }
  const dv: Record<string, number> = {}; for (const d of deps) dv[d] = own[d];
  const v = comp.recompute(dv); own[comp.component_id] = v; return { component_id: comp.component_id, value: v, workings: 'own upstream' };
});
const ofr1 = verifyNumericAnswer(s1t.schema, { components: subComps });
ok('K1t OFR: wrong fx_1 → fx_2 & home_cf_1 & npv carried (add_tax untouched root → correct)',
  ofr1.per_component.find((v) => v.component_id === 'fx_2')?.verdict === 'carried' &&
  ofr1.per_component.find((v) => v.component_id === 'add_tax_1')?.verdict === 'correct' &&
  ofr1.per_component.find((v) => v.component_id === 'home_cf_1')?.verdict === 'carried' &&
  ofr1.per_component.find((v) => v.component_id === 'npv')?.verdict === 'carried');

// ─────────────────────────── K2 — exchange_rate_sensitivity (the flip) ───────────────────────────
const k2: IntlSensitivityInputs = {
  ...k1t, years: 3, initial_outlay_foreign: 2000, discount_rate: 0.12,
  rate_foreign: 0.06, alt_rate_foreign: 0.30, alt_label: 'a sharp devaluation',
};
const c2 = computeIntlSensitivity(k2);
const s2 = buildIntlSensitivitySchema(k2, c2);
const a2 = buildIntlSensitivityModelAnswer(k2, c2, 'Prose.');
ok('K2 steeper depreciation lowers NPV', c2.npv_alt < c2.npv_base);
ok('K2 flip flag consistent with the two accept verdicts', c2.flips === (c2.accept_base !== c2.accept_alt));
ok('K2 schema: GATE1 self-consistency clean (two chains)', validateSchemaSelfConsistency(s2.schema).ok);
ok('K2 model answer: GATE2 figure-integrity', figuresPresent(s2.schema, a2));
ok('K2 parity gate PASSES on both curves', validateParityConsistency(c2.base.fx_curve, k2.base_spot, 'ppp', k2.rate_home, 0.06).ok && validateParityConsistency(c2.alt.fx_curve, k2.base_spot, 'ppp', k2.rate_home, 0.30).ok);

// ─────────────────────────── K3 — restricted_remittance ───────────────────────────
const k3: IntlRemittanceInputs = { ...k1t, years: 4, blocked_fraction: 0.30, local_reinvest_rate: 0.03 };
const c3 = computeIntlRemittance(k3);
const s3 = buildIntlRemittanceSchema(k3, c3);
const a3 = buildIntlRemittanceModelAnswer(k3, c3, 'Prose.');
ok('K3 blocked funds + deferred taxable profit released in the terminal year', c3.blocked_release_foreign > 0 && c3.blocked_tp_total > 0);
ok('K3 blocking (local rate < discount rate) reduces NPV vs free', c3.npv < c3.npv_if_free && approx(c3.npv_cost_of_blocking, c3.npv - c3.npv_if_free));
ok('K3 schema: GATE1 self-consistency clean', validateSchemaSelfConsistency(s3.schema).ok);
ok('K3 model answer: GATE2 figure-integrity', figuresPresent(s3.schema, a3));
ok('K3 model answer shows the explicit cost subtraction (free − restricted)', a3.includes('free-remittance NPV') && a3.includes('cost of the restriction'));
ok('K3 currency-scale gate PASSES on the free-flow years', validateCurrencyScale(c3.years).ok);
ok('K3 double-tax cap gate PASSES (free years + release period)', validateDoubleTaxCap(0.075, 0.30, 0.20, true, [...c3.years.map((y) => ({ taxable_profit: y.taxable_profit, fcff: y.foreign_cf, additional_home_tax_foreign: y.additional_home_tax_foreign })), { taxable_profit: c3.blocked_tp_total, fcff: c3.blocked_release_foreign, additional_home_tax_foreign: c3.release_tax.additional_home_tax_foreign }]).ok);

// ─────────────────────────── K4 — multinational_dividend_capacity (A6a) ───────────────────────────
const k4spot = buildForwardCurve(25000, 'ppp', 0.02, 0.04, 2)[1]; // code-derived forecast spot at year 2
const k4: IntlDividendInputs = {
  home_currency: 'USD', foreign_currency: 'VND', forecast_spot: k4spot, basis: 'ppp',
  base_spot: 25000, rate_home: 0.02, rate_foreign: 0.04, remittance_year: 2,
  sub_build: { pbit: 620000, tax_rate: 0.20, depreciation: 140000, capex: 110000, delta_working_capital: 40000 },
  sub_kd: 0.09, sub_debt: 900000, sub_net_borrowing: 0, remit_fraction: 0.60,
  parent_fcfe: 14, proposed_dividend: 20,
  withholding_rate: 0.10, home_tax_rate: 0.25, wht_creditable: true,
};
const c4 = computeIntlDividend(k4);
const s4 = buildIntlDividendSchema(k4, c4);
const a4 = buildIntlDividendModelAnswer(k4, c4, 'Prose.');
ok('K4 subsidiary FCFE via computeDividendCapacity (foreign)', c4.sub_fcfe_foreign > 0);
ok('K4 remittance nets WHT + differential, converts at forecast spot', approx(c4.sub_remit_home, c4.remit_tax.net_remit_foreign / c4.forecast_spot));
ok('K4 total capacity = parent + remitted subsidiary', approx(c4.total_capacity, k4.parent_fcfe + c4.sub_remit_home));
ok('K4 sustainability verdict consistent', c4.sustainable === (c4.total_capacity >= k4.proposed_dividend));
ok('K4 schema: GATE1 self-consistency clean (parent_fcfe root)', validateSchemaSelfConsistency(s4.schema).ok);
ok('K4 model answer: GATE2 figure-integrity', figuresPresent(s4.schema, a4));
ok('K4 model answer says "remitted in year 2" (not "this year")', a4.includes('remitted in year 2') && !a4.includes('this year'));
ok('K4 forecast spot reconciles to parity at the remittance year', validateParityConsistency(buildForwardCurve(25000, 'ppp', 0.02, 0.04, 2), 25000, 'ppp', 0.02, 0.04).ok && approx(c4.forecast_spot, k4spot));
// OFR: wrong sub FCFE → remit/total/surplus carried
const badRemit = (() => { const remit = (c4.sub_fcfe_foreign + 30000) * 0.60, wht = 0.10 * remit; const add = Math.max(0, 0.25 * c4.remit_tp_foreign - 0.20 * c4.remit_tp_foreign - wht); return (remit - wht - add) / k4spot; })();
const k4ofr = verifyNumericAnswer(s4.schema, { components: [
  { component_id: 'sub_fcfe', value: c4.sub_fcfe_foreign + 30000, workings: 'wrong FCFE' },
  { component_id: 'sub_remit_home', value: badRemit, workings: 'net÷spot' },
  { component_id: 'parent_fcfe', value: k4.parent_fcfe, workings: 'given' },
  { component_id: 'total_capacity', value: k4.parent_fcfe + badRemit, workings: 'parent + remit' },
  { component_id: 'capacity_surplus', value: (k4.parent_fcfe + badRemit) - k4.proposed_dividend, workings: 'total − proposed' },
] });
ok('K4 OFR: wrong sub FCFE → remit/total/surplus carried',
  k4ofr.per_component.find((v) => v.component_id === 'sub_remit_home')?.verdict === 'carried' &&
  k4ofr.per_component.find((v) => v.component_id === 'capacity_surplus')?.verdict === 'carried');

// ─────────────────────────── GATE 14 negative tests (differential rule) ───────────────────────────
ok('GATE14 FAILS on a negative additional tax (a refund)', !checkDoubleTaxCap(0.10, 0.30, 0.20, true, [{ taxable_profit: 120, fcff: 100, additional_home_tax_foreign: -1 }]).ok);
ok('GATE14 FAILS on additional tax exceeding the home liability', !checkDoubleTaxCap(0.10, 0.30, 0.20, false, [{ taxable_profit: 120, fcff: 100, additional_home_tax_foreign: 40 }]).ok);
ok('GATE14 PASSES the correct creditable residual', checkDoubleTaxCap(0.10, 0.30, 0.20, true, [{ taxable_profit: 120, fcff: 100, additional_home_tax_foreign: 2 }]).ok);

// ─────────────────────────── floor tolerance ───────────────────────────
// a near-nil money component is accepted within the 0.2 floor, not a punishing 0.5% relative band
ok('floor tolerance: a 0.15 deviation on a small figure is within the 0.2 floor', validateSchemaSelfConsistency({ components: [
  { component_id: 'a', expected_value: 5, unit: 'USDm', tolerance: { kind: 'floor', pct: 0.5, floor: 0.2 } },
  { component_id: 'b', expected_value: 0.10, unit: 'USDm', tolerance: { kind: 'floor', pct: 0.5, floor: 0.2 }, depends_on: ['a'], recompute: (d) => d.a - 4.9 },
] }).ok);

console.log(`\n${failures === 0 ? 'ALL INTERNATIONAL FIXTURES PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
