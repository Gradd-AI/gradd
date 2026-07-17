// scripts/test-international.ts
// Fixtures for the AFM international family (lib/acca/international.ts, calculator #10). Pure — no env/DB/model.
// Exit 1 on any mismatch. Covers all four kinds + the three new gates:
//   (1) parity forward curve DERIVED (PPP vs IRP, geometric single-differential),
//   (2) GATE1 self-consistency + GATE2 figure-integrity on every schema,
//   (3) OFR carry-through (right method on own wrong upstream → 'carried'),
//   (4) credit-method double-tax cap (h>w bites to home rate; w>=h => no top-up, no refund),
//   (5) remittance blocking (blocked-vs-free NPV delta), K2 flip, K4 dividend sustainability,
//   (6) the three new gates PASS on coherent inputs and FAIL on seeded violations.
import {
  fmt4, buildForwardCurve, parityDifferential, remitNetFactor, additionalHomeTaxRate,
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
// GATE2: every MONEY component's value appears in the model answer at 1dp; fx (relative-tol) at 4dp.
function figuresPresent(schema: AnswerSchema, answer: string): boolean {
  const norm = answer.replace(/,/g, '');
  return schema.components.every((c) => [1, 2, 3, 4].some((d) => norm.includes(c.expected_value.toFixed(d)) || norm.includes(Math.abs(c.expected_value).toFixed(d))));
}
const approx = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;

// ─────────────────────────── parity curve (derived, never asserted) ───────────────────────────
const kPPP = parityDifferential('ppp', 0.03, 0.09); // home 3%, foreign 9% inflation → foreign depreciates
ok('PPP differential = (1+rf)/(1+rh)', approx(kPPP, 1.09 / 1.03));
const curve = buildForwardCurve(20, 'ppp', 0.03, 0.09, 4);
ok('forward curve compounds geometrically S_t = S0·k^t', approx(curve[0], 20 * kPPP) && approx(curve[3], 20 * Math.pow(kPPP, 4)));
ok('foreign depreciates (rising foreign-per-home spot) when foreign inflation higher', curve[3] > curve[0] && curve[0] > 20);
// IRP is the same shape on interest inputs
ok('IRP uses the same formula on interest inputs', approx(parityDifferential('irp', 0.02, 0.05), 1.05 / 1.02));

// ─────────────────────────── double-tax credit-method cap ───────────────────────────
ok('double-tax: h>w → additional rate = h−w (home rate bites)', approx(additionalHomeTaxRate(0.10, 0.25), 0.15));
ok('double-tax: net factor when h>w equals (1−h)', approx(remitNetFactor(0.10, 0.25), 1 - 0.25));
ok('double-tax: w≥h → no additional tax (capped) and net = (1−w)', additionalHomeTaxRate(0.30, 0.25) === 0 && approx(remitNetFactor(0.30, 0.25), 1 - 0.30));
ok('double-tax: cap gate PASSES on the correct rate, FAILS on a negative/over-credit',
  checkDoubleTaxCap(0.10, 0.25, 0.15, [1, 2, 3]).ok && !checkDoubleTaxCap(0.10, 0.25, 0.20, [1]).ok && !checkDoubleTaxCap(0.10, 0.25, 0.15, [-0.5]).ok);

// ─────────────────────────── K1 — home_currency_standard ───────────────────────────
const k1: IntlNpvInputs = {
  home_currency: 'USD', foreign_currency: 'MXN', base_spot: 20, basis: 'ppp',
  rate_home: 0.03, rate_foreign: 0.09, discount_rate: 0.11,
  foreign_build: { pbit: 900, tax_rate: 0.30, depreciation: 200, capex: 150, delta_working_capital: 60 },
  foreign_growth: 0.04, years: 4, initial_outlay_foreign: 3600,
  withholding_rate: 0.10, home_tax_rate: 0.25,
};
const c1 = computeIntlNpv(k1);
const s1 = buildIntlNpvSchema(k1, c1);
const a1 = buildIntlNpvModelAnswer(k1, c1, 'Prose.');
ok('K1 base foreign FCFF from the build (reused one-way)', approx(c1.base_fcff_foreign, 900 * 0.7 + 200 - 150 - 60));
ok('K1 home outlay = foreign outlay ÷ S0', approx(c1.home_outlay, 3600 / 20));
ok('K1 year-1 home cash flow = foreign net remittance ÷ forecast spot', approx(c1.years[0].home_cf, c1.years[0].foreign_remit_net / c1.years[0].fx));
ok('K1 net factor = (1−h) since h>w', approx(c1.net_factor, 0.75) && approx(c1.add_tax_rate, 0.15));
ok('K1 schema: GATE1 self-consistency clean (fx chain → home_cf → npv)', validateSchemaSelfConsistency(s1.schema).ok);
ok('K1 model answer: GATE2 figure-integrity (every component present)', figuresPresent(s1.schema, a1));
ok('K1 parity gate PASSES on the derived curve', validateParityConsistency(c1.fx_curve, 20, 'ppp', 0.03, 0.09).ok);
ok('K1 parity gate FAILS on a tampered forward (asserted, not derived)', !validateParityConsistency([...c1.fx_curve.slice(0, -1), c1.fx_curve[c1.fx_curve.length - 1] * 1.1], 20, 'ppp', 0.03, 0.09).ok);
ok('K1 currency-scale gate PASSES (home × spot = foreign remittance)', validateCurrencyScale(c1.years).ok);
ok('K1 currency-scale gate FAILS on a ×1000 scale slip', !validateCurrencyScale([{ fx: c1.years[0].fx, foreign_remit_net: c1.years[0].foreign_remit_net, home_cf: c1.years[0].home_cf * 1000 }]).ok);
ok('K1 double-tax cap gate PASSES', validateDoubleTaxCap(0.10, 0.25, c1.add_tax_rate, c1.years.map((y) => y.additional_home_tax_home)).ok);
// OFR carry: wrong fx_1 (shown) → fx_2.. + home_cf.. + npv all carried
const badFx1 = c1.fx_curve[0] * 0.8;
const own: Record<string, number> = {};
const subComps = s1.schema.components.map((comp) => {
  const deps = comp.depends_on ?? [];
  if (deps.length === 0 || !comp.recompute) { const v = comp.component_id === 'fx_1' ? badFx1 : comp.expected_value; own[comp.component_id] = v; return { component_id: comp.component_id, value: v, workings: 'seeded/root' }; }
  const dv: Record<string, number> = {}; for (const d of deps) dv[d] = own[d];
  const v = comp.recompute(dv); own[comp.component_id] = v; return { component_id: comp.component_id, value: v, workings: 'correct method on own upstream' };
});
const ofr1 = verifyNumericAnswer(s1.schema, { components: subComps });
ok('K1 OFR: wrong fx_1 → fx_2 & home_cf & npv all carried (error charged once)',
  ofr1.per_component.find((v) => v.component_id === 'fx_1')?.verdict === 'incorrect' &&
  ofr1.per_component.find((v) => v.component_id === 'fx_2')?.verdict === 'carried' &&
  ofr1.per_component.find((v) => v.component_id === 'npv')?.verdict === 'carried');

// ─────────────────────────── K2 — exchange_rate_sensitivity (the flip) ───────────────────────────
// Choose a base where NPV is positive and an alt (steeper depreciation) that flips it negative.
const k2base: IntlSensitivityInputs = {
  ...k1, years: 3, initial_outlay_foreign: 2600, discount_rate: 0.12,
  rate_foreign: 0.07, alt_rate_foreign: 0.28, alt_label: 'a sharp devaluation of the peso',
};
const c2 = computeIntlSensitivity(k2base);
const s2 = buildIntlSensitivitySchema(k2base, c2);
const a2 = buildIntlSensitivityModelAnswer(k2base, c2, 'Prose.');
ok('K2 base and alt NPV computed; steeper depreciation lowers NPV', c2.npv_alt < c2.npv_base);
ok('K2 flip flag consistent with the two accept verdicts', c2.flips === (c2.accept_base !== c2.accept_alt));
ok('K2 schema: GATE1 self-consistency clean (two chains)', validateSchemaSelfConsistency(s2.schema).ok);
ok('K2 model answer: GATE2 figure-integrity', figuresPresent(s2.schema, a2));
ok('K2 parity gate PASSES on both curves', validateParityConsistency(c2.base.fx_curve, k1.base_spot, 'ppp', k1.rate_home, 0.07).ok && validateParityConsistency(c2.alt.fx_curve, k1.base_spot, 'ppp', k1.rate_home, 0.28).ok);

// ─────────────────────────── K3 — restricted_remittance ───────────────────────────
const k3: IntlRemittanceInputs = {
  ...k1, years: 4, blocked_fraction: 0.40, local_reinvest_rate: 0.05,
};
const c3 = computeIntlRemittance(k3);
const s3 = buildIntlRemittanceSchema(k3, c3);
const a3 = buildIntlRemittanceModelAnswer(k3, c3, 'Prose.');
ok('K3 blocked funds released in the terminal year (positive)', c3.blocked_release_foreign > 0);
ok('K3 blocking with local rate < discount rate reduces NPV vs free remittance', c3.npv < c3.npv_if_free && approx(c3.npv_cost_of_blocking, c3.npv - c3.npv_if_free));
ok('K3 schema: GATE1 self-consistency clean (fx → free home_cf → blocked_release → release → npv)', validateSchemaSelfConsistency(s3.schema).ok);
ok('K3 model answer: GATE2 figure-integrity', figuresPresent(s3.schema, a3));
ok('K3 currency-scale gate PASSES on the free-flow years', validateCurrencyScale(c3.years).ok);

// ─────────────────────────── K4 — multinational_dividend_capacity (A6a) ───────────────────────────
const k4: IntlDividendInputs = {
  home_currency: 'GBP', foreign_currency: 'INR', forecast_spot: 105, basis: 'ppp',
  base_spot: 100, rate_home: 0.02, rate_foreign: 0.07, remittance_year: 1,
  sub_build: { pbit: 4200, tax_rate: 0.25, depreciation: 900, capex: 700, delta_working_capital: 300 },
  sub_kd: 0.08, sub_debt: 6000, sub_net_borrowing: 0, remit_fraction: 0.60,
  parent_fcfe: 140, proposed_dividend: 160,
  withholding_rate: 0.15, home_tax_rate: 0.25,
};
const c4 = computeIntlDividend(k4);
const s4 = buildIntlDividendSchema(k4, c4);
const a4 = buildIntlDividendModelAnswer(k4, c4, 'Prose.');
ok('K4 subsidiary FCFE via computeDividendCapacity (reused, foreign)', c4.sub_fcfe_foreign > 0);
ok('K4 remittance = FCFE × remit% × net-of-tax ÷ spot (home)', approx(c4.sub_remit_home, (c4.sub_fcfe_foreign * 0.60 * c4.net_factor) / 105));
ok('K4 total capacity = parent + remitted subsidiary', approx(c4.total_capacity, k4.parent_fcfe + c4.sub_remit_home));
ok('K4 sustainability verdict consistent with capacity vs proposed', c4.sustainable === (c4.total_capacity >= k4.proposed_dividend));
ok('K4 schema: GATE1 self-consistency clean (sub_fcfe → remit → total → surplus)', validateSchemaSelfConsistency(s4.schema).ok);
ok('K4 model answer: GATE2 figure-integrity', figuresPresent(s4.schema, a4));
ok('K4 parity gate PASSES on the forecast spot (single-period)', validateParityConsistency([c4.forecast_spot], k4.base_spot, 'ppp', k4.rate_home, k4.rate_foreign).ok);
// OFR: wrong subsidiary FCFE, correct method downstream → carried
const badRemit = ((c4.sub_fcfe_foreign + 300) * 0.60 * c4.net_factor) / 105;
const k4ofr = verifyNumericAnswer(s4.schema, { components: [
  { component_id: 'sub_fcfe', value: c4.sub_fcfe_foreign + 300, workings: 'wrong FCFE' },
  { component_id: 'sub_remit_home', value: badRemit, workings: 'FCFE×rf×net÷spot' },
  { component_id: 'parent_fcfe', value: k4.parent_fcfe, workings: 'given parent FCFE' },
  { component_id: 'total_capacity', value: k4.parent_fcfe + badRemit, workings: 'parent + remit' },
  { component_id: 'capacity_surplus', value: (k4.parent_fcfe + badRemit) - k4.proposed_dividend, workings: 'total − proposed' },
] });
ok('K4 OFR: wrong sub FCFE → remit/total/surplus all carried',
  k4ofr.per_component.find((v) => v.component_id === 'sub_remit_home')?.verdict === 'carried' &&
  k4ofr.per_component.find((v) => v.component_id === 'capacity_surplus')?.verdict === 'carried');

// ─────────────────────────── K4 remit_fraction=1 forecast spot must be derived (parity) ───────────────────────────
ok('K4 forecast spot reconciles to parity of base_spot at the remittance year',
  approx(k4.forecast_spot, k4.base_spot * Math.pow(parityDifferential('ppp', k4.rate_home, k4.rate_foreign), k4.remittance_year), 0.6));

console.log(`\n${failures === 0 ? 'ALL INTERNATIONAL FIXTURES PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
