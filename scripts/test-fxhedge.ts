// scripts/test-fxhedge.ts
// Fixtures for the AFM FX-hedging family (lib/acca/fxhedge.ts, calculator #11, Phase 1: engine +
// gates). Pure — no env/DB/model. Exit 1 on any mismatch.
//
// Where possible, fixtures reproduce the ACTUAL sourced worked numbers (Step-0 evidence, ruled
// 2026-07-22) so the engine is checked against real ACCA figures, not just internal consistency:
//   - Money-market hedge (receipt): SD2019 Okan Co official answer, Appendix 1, printed p.16.
//   - Option premium formula: Abertafol Co (D23), printed p.14 ("0.298% x 60 x $500,000 x 3/12").
// Futures/swap fixtures are synthetic (mechanism-only) — no local source gives a full numeric
// futures/swap worked example with every input reproducible from the citation alone.
import {
  toHome, toForeign, instrumentSide,
  computeForwardHedge, deriveIrpForwardRate,
  computeMoneyMarketHedge,
  computeFuturesHedge,
  computeOptionsHedge,
  computeSwapHedge,
  compareHedgeMethods,
  checkWholeContractIntegrity, checkBasisDecayReconciliation, checkCurrencyDirectionIntegrity,
  checkPremiumCurrency, checkBestMethodVerdict,
  computeForwardMmhCompare, buildForwardMmhCompareSchema, buildForwardMmhCompareModelAnswer,
  buildFuturesSchema, buildFuturesModelAnswer,
  buildOptionsSchema, buildOptionsModelAnswer,
  buildSwapSchema, buildSwapModelAnswer,
  type ForwardMmhCompareInputs, type FuturesDrillInputs, type OptionsDrillInputs, type SwapDrillInputs,
} from '../lib/acca/fxhedge';
import {
  validateWholeContractIntegrity, validateBasisDecayReconciliation, validateCurrencyDirectionIntegrity,
  validatePremiumCurrency, validateBestMethodVerdict, validateSchemaSelfConsistency,
} from '../lib/acca/validate-schema';
import type { AnswerSchema } from '../lib/acca/numeric-verifier';

let failures = 0;
function ok(name: string, cond: boolean) { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`); }
const approx = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;
const approxRel = (a: number, b: number, relTol = 0.001) => Math.abs(a - b) <= Math.abs(b) * relTol + 1e-6;
function figuresPresent(schema: AnswerSchema, answer: string): boolean {
  const norm = answer.replace(/,/g, '');
  return schema.components.every((c) => [1, 2, 3, 4].some((d) => norm.includes(c.expected_value.toFixed(d)) || norm.includes(Math.abs(c.expected_value).toFixed(d))));
}

// ─────────────────────────── quote direction — both ways, evidenced ───────────────────────────
// foreign_per_home (Passmore-style, R per $1 with $ home): home = foreign / rate
ok('foreign_per_home: toHome divides', approx(toHome(1000, 14.5, 'foreign_per_home'), 1000 / 14.5));
ok('foreign_per_home: toForeign multiplies', approx(toForeign(100, 14.5, 'foreign_per_home'), 100 * 14.5));
// home_per_foreign (Okan-style, Y$ per €1 with Y$ home): home = foreign × rate
ok('home_per_foreign: toHome multiplies', approx(toHome(1000, 2.521, 'home_per_foreign'), 1000 * 2.521));
ok('home_per_foreign: toForeign divides', approx(toForeign(100, 2.521, 'home_per_foreign'), 100 / 2.521));
ok('instrumentSide: a receipt must SELL the foreign currency', instrumentSide('receipt') === 'sell');
ok('instrumentSide: a payment must BUY the foreign currency', instrumentSide('payment') === 'buy');

// ─────────────────────────── forward (stated rate — the sourced convention) ───────────────────────────
const fwd = computeForwardHedge({ exposure: 202, direction: 'receipt', forward_rate: 14.2, quote_direction: 'foreign_per_home' });
ok('forward: home_settlement = exposure / forward_rate (foreign_per_home)', approx(fwd.home_settlement, 202 / 14.2));

const irp = deriveIrpForwardRate(2.5, 5, 8, 6, 'home_per_foreign');
// home_per_foreign: k = (1+rh·t)/(1+rf·t); t=0.5 → (1+0.025)/(1+0.04) = 1.025/1.04
ok('deriveIrpForwardRate: home_per_foreign inverse-scales by the differential', approx(irp, 2.5 * (1.025 / 1.04)));

// ─────────────────────────── money-market hedge — RECEIPT, reproducing Okan Co (SD2019, p.16) ───────────────────────────
// EUR10,000,000 receipt in 6 months; home = Y$ (home_per_foreign, rate 2.5210); foreign borrow 2.2% pa;
// home deposit 2.4% pa. Sourced: foreign_now = EUR9,891,197; home_now = Y$24,935,708;
// home_settlement = Y$25,234,936.
const mmhReceipt = computeMoneyMarketHedge({
  exposure: 10_000_000, direction: 'receipt', spot: 2.5210, quote_direction: 'home_per_foreign',
  months: 6, rate_foreign_borrow: 2.2, rate_foreign_deposit: 0, rate_home_borrow: 0, rate_home_deposit: 2.4,
});
ok('MMH receipt: foreign_now matches Okan Co (EUR9,891,197 ± rounding)', approxRel(mmhReceipt.foreign_now, 9_891_197, 0.0001));
ok('MMH receipt: home_now matches Okan Co (Y$24,935,708 ± rounding)', approxRel(mmhReceipt.home_now, 24_935_708, 0.0001));
ok('MMH receipt: home_settlement matches Okan Co (Y$25,234,936 ± rounding)', approxRel(mmhReceipt.home_settlement, 25_234_936, 0.0001));

// PAYMENT — symmetric construction (F9 article mechanism, no worked numbers sourced; internal-
// consistency check only): buy foreign now, deposit foreign to grow to the exact payable.
const mmhPayment = computeMoneyMarketHedge({
  exposure: 1_000_000, direction: 'payment', spot: 1.4701, quote_direction: 'home_per_foreign',
  months: 3, rate_foreign_borrow: 0, rate_foreign_deposit: 4, rate_home_borrow: 6, rate_home_deposit: 0,
});
ok('MMH payment: foreign deposited now grows to exactly the payable', approx(mmhPayment.foreign_now * (1 + 0.04 * 0.25), 1_000_000));
ok('MMH payment: home funding leg grows at the home borrowing rate to settlement', approx(mmhPayment.home_settlement, mmhPayment.home_now * (1 + 0.06 * 0.25)));

// ─────────────────────────── futures — whole contracts + linear basis decay (mechanism-only) ───────────────────────────
const fut = computeFuturesHedge({
  exposure: 2_020_000, direction: 'receipt', quote_direction: 'foreign_per_home',
  contract_size: 50_000, spot0: 14.20, futures0: 14.05,
  months_to_expiry: 6, months_to_transaction: 3,
  residual_policy: 'immaterial',
});
ok('futures: side derives from exposure direction', fut.side === 'sell');
ok('futures: contracts is a whole number = round(exposure/contract_size)', fut.contracts === Math.round(2_020_000 / 50_000) && Number.isInteger(fut.contracts));
ok('futures: basis0 = spot0 − futures0', approx(fut.basis0, 0.15));
ok('futures: unexpired basis decays linearly (half the life remaining → half the basis)', approx(fut.unexpired_basis, 0.15 * 0.5));
ok('futures: lock-in rate = spot0 − unexpired basis', approx(fut.lock_in_rate, 14.20 - fut.unexpired_basis));
ok('futures: residual carries no home value under the immaterial policy', fut.home_from_residual === 0);

const futTopup = computeFuturesHedge({
  exposure: 2_035_000, direction: 'payment', quote_direction: 'foreign_per_home',
  contract_size: 50_000, spot0: 14.20, futures0: 14.05,
  months_to_expiry: 6, months_to_transaction: 3,
  residual_policy: 'forward_topup', topup_forward_rate: 14.10,
});
ok('futures: forward_topup policy converts the residual at the stated topup rate', futTopup.residual !== 0 && futTopup.home_from_residual !== 0);
ok('futures: forward_topup residual reconciles to toHome(residual, topup_rate)', approx(futTopup.home_from_residual, futTopup.residual / 14.10));

// ─────────────────────────── options — premium formula reproducing Abertafol Co (D23, p.14) ───────────────────────────
// "0.298% x 60 x $500,000 x 3/12" = 22,350 (premium currency = the notional's own currency here).
const opt = computeOptionsHedge({
  exposure: 30_000_000, direction: 'receipt', quote_direction: 'foreign_per_home',
  contract_size: 500_000, strike: 14.10,
  premium_pct: 0.00298, premium_currency: 'foreign', months_covered: 3, months_to_transaction: 3,
  compounding_rate: 5, residual_policy: 'immaterial',
});
ok('options: premium reproduces the Abertafol formula (0.298% × 60 × $500,000 × 3/12 = 22,350)', approx(opt.premium, 22_350) && opt.contracts === 60);
ok('options: side derives from exposure direction', opt.side === 'sell');
ok('options: FV premium ≥ the raw premium (positive compounding rate)', opt.premium_home_fv >= toHome(opt.premium, 14.10, 'foreign_per_home') - 1e-6);
ok('options: a receipt nets the FV premium OFF the strike proceeds', opt.home_settlement < opt.home_from_strike);

const optPayment = computeOptionsHedge({
  exposure: 30_000_000, direction: 'payment', quote_direction: 'foreign_per_home',
  contract_size: 500_000, strike: 14.10,
  premium_pct: 0.00298, premium_currency: 'home', months_covered: 3, months_to_transaction: 3,
  compounding_rate: 5, residual_policy: 'immaterial',
});
ok('options: a payment ADDS the FV premium to the strike cost', optPayment.home_settlement > optPayment.home_from_strike);
ok('options: premium_currency=home skips the strike re-conversion (premium already home)', approx(optPayment.premium_home_fv, optPayment.premium * (1 + 0.05 * 0.25)));

// ─────────────────────────── swap — thin evidence (Mahoney J24 p.7), mechanism-only ───────────────────────────
const swap = computeSwapHedge({ exposure: 5_000_000, direction: 'receipt', quote_direction: 'foreign_per_home', swap_fraction: 0.7, swap_rate: 14.0, residual_forward_rate: 14.15 });
ok('swap: covers only the stated fraction (Mahoney: "only account for a proportion")', approx(swap.swapped_amount, 3_500_000) && approx(swap.residual, 1_500_000));
ok('swap: residual converts at the stated forward rate, not the swap rate', approx(swap.home_from_residual, 1_500_000 / 14.15));
const swapFull = computeSwapHedge({ exposure: 5_000_000, direction: 'receipt', quote_direction: 'foreign_per_home', swap_fraction: 1, swap_rate: 14.0 });
ok('swap: a full-coverage swap needs no residual_forward_rate', swapFull.residual === 0 && swapFull.home_from_residual === 0);

// ─────────────────────────── all-methods comparison — code-owned recommendation ───────────────────────────
const cmpReceipt = compareHedgeMethods('receipt', [
  { method: 'forward', home_settlement: 100 }, { method: 'mmh', home_settlement: 105 }, { method: 'futures', home_settlement: 98 },
]);
ok('comparison: a receipt picks the HIGHEST home settlement', cmpReceipt.best.method === 'mmh' && approx(cmpReceipt.margin, 5));
const cmpPayment = compareHedgeMethods('payment', [
  { method: 'forward', home_settlement: 100 }, { method: 'mmh', home_settlement: 95 }, { method: 'options', home_settlement: 103 },
]);
ok('comparison: a payment picks the LOWEST home cost', cmpPayment.best.method === 'mmh' && approx(cmpPayment.margin, 5));

// ═══════════════════════════════════════════════════════════════════════════════════════
// GATES 15–19 — pass on coherent inputs, FAIL on seeded violations
// ═══════════════════════════════════════════════════════════════════════════════════════
// GATE 15 — whole-contract integrity
ok('GATE15 passes on the real futures fixture', validateWholeContractIntegrity(2_020_000, 50_000, fut.contracts, fut.residual, 'immaterial', fut.home_from_residual).ok);
ok('GATE15 FAILS on a fractional contract count', !checkWholeContractIntegrity(2_020_000, 50_000, 40.4, fut.residual, 'immaterial', 0).ok);
ok('GATE15 FAILS when an immaterial residual still carries home value', !checkWholeContractIntegrity(2_020_000, 50_000, fut.contracts, fut.residual, 'immaterial', 500).ok);

// GATE 16 — basis-decay reconciliation
ok('GATE16 passes on the real futures fixture', validateBasisDecayReconciliation(14.20, 14.05, 6, 3, fut.unexpired_basis, fut.lock_in_rate).ok);
ok('GATE16 FAILS on a non-linear (asserted) basis figure', !checkBasisDecayReconciliation(14.20, 14.05, 6, 3, 0.15, 14.20 - 0.15).ok);

// GATE 17 — currency-direction integrity (catches an inversion, both quote directions)
ok('GATE17 passes on a correct foreign_per_home conversion', validateCurrencyDirectionIntegrity(202, 14.2, 202 / 14.2, 'foreign_per_home', 'receipt', 'sell').ok);
ok('GATE17 FAILS on an inverted foreign_per_home conversion (× instead of ÷)', !checkCurrencyDirectionIntegrity(202, 14.2, 202 * 14.2, 'foreign_per_home', 'receipt', 'sell').ok);
ok('GATE17 FAILS when the instrument side contradicts the exposure direction', !checkCurrencyDirectionIntegrity(202, 14.2, 202 / 14.2, 'foreign_per_home', 'receipt', 'buy').ok);
ok('GATE17 passes on a correct home_per_foreign conversion', validateCurrencyDirectionIntegrity(10_000_000, 2.521, 10_000_000 * 2.521, 'home_per_foreign', 'payment', 'buy').ok);

// GATE 18 — premium-currency check
ok('GATE18 passes on the Abertafol-reproduced premium', validatePremiumCurrency(0.00298, 60, 500_000, 3, opt.premium).ok);
ok('GATE18 FAILS on a premium that silently applied an extra ×100', !checkPremiumCurrency(0.00298, 60, 500_000, 3, opt.premium * 100).ok);

// GATE 19 — best-method verdict integrity
ok('GATE19 passes when the stated recommendation matches the computed best', validateBestMethodVerdict('receipt', cmpReceipt.results, 'mmh', cmpReceipt.margin).ok);
ok('GATE19 FAILS when a worse method is recommended', !checkBestMethodVerdict('receipt', cmpReceipt.results, 'forward', cmpReceipt.margin).ok);
ok('GATE19 FAILS when the stated margin does not match', !checkBestMethodVerdict('receipt', cmpReceipt.results, 'mmh', 999).ok);

// ═══════════════════════════════════════════════════════════════════════════════════════
// SCHEMAS + MODEL ANSWERS — GATE1 self-consistency + GATE2-style figure-integrity, all 4 kinds
// ═══════════════════════════════════════════════════════════════════════════════════════
const k1Inputs: ForwardMmhCompareInputs = {
  currency_home: '$', currency_foreign: 'R', exposure: 202, direction: 'receipt', quote_direction: 'foreign_per_home',
  forward_rate: 14.20, spot: 14.35, months: 6, rate_foreign_borrow: 8, rate_foreign_deposit: 6, rate_home_borrow: 5, rate_home_deposit: 3,
};
const k1Computed = computeForwardMmhCompare(k1Inputs);
const k1Schema = buildForwardMmhCompareSchema(k1Inputs, k1Computed);
const k1Answer = buildForwardMmhCompareModelAnswer(k1Inputs, k1Computed, 'Given the guaranteed-outcome margin, take the better-paying hedge and lock in certainty over the exposed period.');
ok('K1 forward+MMH: GATE1 self-consistency passes', validateSchemaSelfConsistency(k1Schema.schema).ok);
ok('K1 forward+MMH: every schema figure appears in the model answer', figuresPresent(k1Schema.schema, k1Answer));
ok('K1 forward+MMH: model answer carries the Step N — Label headers (grounding-pack parseable)', /\*\*Step 1 — /.test(k1Answer) && /\*\*Step 4 — Advice to the board\*\*/.test(k1Answer));

const k2Inputs: FuturesDrillInputs = {
  currency_home: '$', currency_foreign: 'R', exposure: 2_020_000, direction: 'payment', quote_direction: 'foreign_per_home',
  contract_size: 50_000, spot0: 14.20, futures0: 14.05, months_to_expiry: 6, months_to_transaction: 3, residual_policy: 'forward_topup', topup_forward_rate: 14.10,
};
const k2Computed = computeFuturesHedge(k2Inputs);
const k2Schema = buildFuturesSchema(k2Inputs, k2Computed);
const k2Answer = buildFuturesModelAnswer(k2Inputs, k2Computed, 'The futures hedge fixes the bulk of the exposure; the residual is small and cleanly topped up on the forward.');
ok('K2 futures: GATE1 self-consistency passes', validateSchemaSelfConsistency(k2Schema.schema).ok);
ok('K2 futures: every schema figure appears in the model answer', figuresPresent(k2Schema.schema, k2Answer));

const k3Inputs: OptionsDrillInputs = {
  currency_home: '$', currency_foreign: 'R', exposure: 30_000_000, direction: 'receipt', quote_direction: 'foreign_per_home',
  contract_size: 500_000, strike: 14.10, premium_pct: 0.00298, premium_currency: 'foreign', months_covered: 3, months_to_transaction: 3, compounding_rate: 5, residual_policy: 'immaterial',
};
const k3Computed = computeOptionsHedge(k3Inputs);
const k3Schema = buildOptionsSchema(k3Inputs, k3Computed);
const k3Answer = buildOptionsModelAnswer(k3Inputs, k3Computed, 'The option preserves upside if the currency moves favourably, at the cost of the premium — worth it given the uncertainty over the period.');
ok('K3 options: GATE1 self-consistency passes', validateSchemaSelfConsistency(k3Schema.schema).ok);
ok('K3 options: every schema figure appears in the model answer', figuresPresent(k3Schema.schema, k3Answer));

const k4Inputs: SwapDrillInputs = {
  currency_home: '$', currency_foreign: 'R', exposure: 5_000_000, direction: 'receipt', quote_direction: 'foreign_per_home',
  swap_fraction: 0.7, swap_rate: 14.0, residual_forward_rate: 14.15,
};
const k4Computed = computeSwapHedge(k4Inputs);
const k4Schema = buildSwapSchema(k4Inputs, k4Computed);
const k4Answer = buildSwapModelAnswer(k4Inputs, k4Computed, 'The swap covers the bulk of the flow at a known rate; hedge the uncovered residual on the forward rather than leave it exposed.');
ok('K4 swap: GATE1 self-consistency passes', validateSchemaSelfConsistency(k4Schema.schema).ok);
ok('K4 swap: every schema figure appears in the model answer', figuresPresent(k4Schema.schema, k4Answer));

const k4FullInputs: SwapDrillInputs = { ...k4Inputs, swap_fraction: 1, residual_forward_rate: undefined };
const k4FullComputed = computeSwapHedge(k4FullInputs);
const k4FullSchema = buildSwapSchema(k4FullInputs, k4FullComputed);
ok('K4 swap (full coverage): GATE1 self-consistency passes with no residual component', validateSchemaSelfConsistency(k4FullSchema.schema).ok && k4FullSchema.schema.components.every((c) => c.component_id !== 'home_from_residual'));

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
