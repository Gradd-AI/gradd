// scripts/test-fxhedge.ts
// Fixtures for the AFM FX-hedging family (lib/acca/fxhedge.ts, calculator #11). Pure — no env/DB/model.
// Exit 1 on any mismatch.
//
// Where possible, fixtures reproduce the ACTUAL sourced worked numbers (Step-0 evidence, ruled
// 2026-07-22) so the engine is checked against real ACCA figures, not just internal consistency:
//   - Money-market hedge (receipt): SD2019 Okan Co official answer, Appendix 1, printed p.16.
// Futures/options/swap fixtures are synthetic (mechanism-only) — no local source gives a full
// numeric worked example with every input reproducible from the citation alone. FIX ROUND 1
// (2026-07-22, co-founder recompute): the SD25 sample-answers PDF that would settle the K2 lock-in
// direction and the K3 premium/FV conventions from Passmore Co's own worked figures could not be
// located publicly (searched multiple ways; only the examiner's REPORT is public, and it carries
// no worked numbers) — the K2 fix is applied on the co-founder's own independent-recompute
// authority (the established mechanism in this project); the K3 fix uses Grant's documented
// fallback convention. Neither is claimed here as independently source-verified.
import {
  toHome, toForeign, instrumentSide, optionType,
  computeForwardHedge, deriveIrpForwardRate,
  computeMoneyMarketHedge,
  computeFuturesHedge,
  computeOptionsHedge,
  computeSwapHedge,
  compareHedgeMethods,
  checkWholeContractIntegrity, checkBasisDecayReconciliation, checkCurrencyDirectionIntegrity,
  checkPremiumCurrency, checkBestMethodVerdict, checkQuoteSentencePresence, quoteDirectionSentence,
  computeForwardMmhCompare, buildForwardMmhCompareSchema, buildForwardMmhCompareModelAnswer,
  buildFuturesSchema, buildFuturesModelAnswer,
  buildOptionsSchema, buildOptionsModelAnswer,
  buildSwapSchema, buildSwapModelAnswer,
  type ForwardMmhCompareInputs, type FuturesDrillInputs, type OptionsDrillInputs, type SwapDrillInputs,
} from '../lib/acca/fxhedge';
import {
  validateWholeContractIntegrity, validateBasisDecayReconciliation, validateCurrencyDirectionIntegrity,
  validatePremiumCurrency, validateBestMethodVerdict, validateQuoteSentencePresence, validateSchemaSelfConsistency,
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
ok('optionType: a receipt is hedged with a PUT', optionType('receipt') === 'put');
ok('optionType: a payment is hedged with a CALL', optionType('payment') === 'call');

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
// FIX ROUND 1 (2026-07-22): lock-in rate = futures0 + unexpired_basis (NOT spot0 - unexpired_basis,
// the one-sided error co-founder recompute found against Passmore Co's own worked figure).
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
ok('futures: lock-in rate = futures0 + unexpired basis (FIX ROUND 1)', approx(fut.lock_in_rate, 14.05 + fut.unexpired_basis));
ok('futures: lock-in rate ALSO equals spot0 − expired basis (the two-route identity)', approx(fut.lock_in_rate, 14.20 - (fut.basis0 - fut.unexpired_basis)));
ok('futures: residual carries no home value under the immaterial policy', fut.home_from_residual === 0);

const futTopup = computeFuturesHedge({
  exposure: 2_035_000, direction: 'payment', quote_direction: 'foreign_per_home',
  contract_size: 50_000, spot0: 14.20, futures0: 14.05,
  months_to_expiry: 6, months_to_transaction: 3,
  residual_policy: 'forward_topup', topup_forward_rate: 14.10,
});
ok('futures: forward_topup policy converts the residual at the stated topup rate', futTopup.residual !== 0 && futTopup.home_from_residual !== 0);
ok('futures: forward_topup residual reconciles to toHome(residual, topup_rate)', approx(futTopup.home_from_residual, futTopup.residual / 14.10));

// ─────────────────────────── options — all-in premium (FIX ROUND 1, no time proration/FV) ───────────────────────────
// FIX ROUND 1 (2026-07-22): premium = premium_pct × contracts × contract_size, ALL-IN — the
// Abertafol-borrowed (months/12) proration was unsourced for currency options and is removed.
// Premium is deducted as paid, NOT future-valued. spot DELIBERATELY DIFFERS from strike below (14.05
// vs 14.10) — FIX ROUND 2 (2026-07-23): the premium leg must convert at SPOT, never the strike; using
// distinct values makes this a genuine regression lock (the old strike-based bug would fail it).
const opt = computeOptionsHedge({
  exposure: 30_000_000, direction: 'receipt', quote_direction: 'foreign_per_home',
  contract_size: 500_000, strike: 14.10, spot: 14.05,
  premium_pct: 0.00298, premium_currency: 'foreign', months_to_transaction: 3, residual_policy: 'immaterial',
});
ok('options: premium is all-in, no time proration (0.298% × 60 × $500,000 = 89,400)', approx(opt.premium, 89_400) && opt.contracts === 60);
ok('options: option_type derives from exposure direction (receipt → put)', opt.option_type === 'put');
ok('options: premium_home has NO future-value growth (deducted as paid)', approx(opt.premium_home, toHome(opt.premium, 14.05, 'foreign_per_home')));
ok('FIX ROUND 2: premium converts at SPOT (14.05), not the strike (14.10) — the exact GPT-adjudication regression lock', !approx(opt.premium_home, toHome(opt.premium, 14.10, 'foreign_per_home')));
ok('options: a receipt nets the premium OFF the strike proceeds', opt.home_settlement < opt.home_from_strike);

const optPayment = computeOptionsHedge({
  exposure: 30_000_000, direction: 'payment', quote_direction: 'foreign_per_home',
  contract_size: 500_000, strike: 14.10, spot: 14.05,
  premium_pct: 0.00298, premium_currency: 'home', months_to_transaction: 3, residual_policy: 'immaterial',
});
ok('options: option_type derives from exposure direction (payment → call)', optPayment.option_type === 'call');
ok('options: a payment ADDS the premium to the strike cost', optPayment.home_settlement > optPayment.home_from_strike);
ok('options: premium_currency=home skips ALL conversion — spot and strike both irrelevant (premium already home, no FV)', approx(optPayment.premium_home, optPayment.premium));

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
// GATES 15–19 + 17b — pass on coherent inputs, FAIL on seeded violations
// ═══════════════════════════════════════════════════════════════════════════════════════
// GATE 15 — whole-contract integrity
ok('GATE15 passes on the real futures fixture', validateWholeContractIntegrity(2_020_000, 50_000, fut.contracts, fut.residual, 'immaterial', fut.home_from_residual).ok);
ok('GATE15 FAILS on a fractional contract count', !checkWholeContractIntegrity(2_020_000, 50_000, 40.4, fut.residual, 'immaterial', 0).ok);
ok('GATE15 FAILS when an immaterial residual still carries home value', !checkWholeContractIntegrity(2_020_000, 50_000, fut.contracts, fut.residual, 'immaterial', 500).ok);

// GATE 16 — basis-decay reconciliation + the two-route self-check (FIX ROUND 1)
ok('GATE16 passes on the real futures fixture (corrected formula)', validateBasisDecayReconciliation(14.20, 14.05, 6, 3, fut.unexpired_basis, fut.lock_in_rate).ok);
ok('GATE16 FAILS on a non-linear (asserted) basis figure', !checkBasisDecayReconciliation(14.20, 14.05, 6, 3, 0.15, 14.05 + 0.15).ok);
// The elapsed/remaining split must be ASYMMETRIC (3 of 6 months is symmetric — old and new formulas
// coincide there) for the old-vs-new formula distinction to actually bite: 2 of 5 months remaining.
const asymUnexpired = (14.20 - 14.05) * (2 / 5);
ok('GATE16 FAILS on the OLD (one-sided) formula spot0 − unexpired_basis — the exact FIX ROUND 1 regression', !checkBasisDecayReconciliation(14.20, 14.05, 5, 3, asymUnexpired, 14.20 - asymUnexpired).ok);
ok('GATE16 passes on the corrected formula with the same asymmetric split', checkBasisDecayReconciliation(14.20, 14.05, 5, 3, asymUnexpired, 14.05 + asymUnexpired).ok);

// GATE 17 — currency-direction integrity (catches an inversion, both quote directions)
ok('GATE17 passes on a correct foreign_per_home conversion', validateCurrencyDirectionIntegrity(202, 14.2, 202 / 14.2, 'foreign_per_home', 'receipt', 'sell', 'sell').ok);
ok('GATE17 FAILS on an inverted foreign_per_home conversion (× instead of ÷)', !checkCurrencyDirectionIntegrity(202, 14.2, 202 * 14.2, 'foreign_per_home', 'receipt', 'sell', 'sell').ok);
ok('GATE17 FAILS when the instrument side contradicts the expected side', !checkCurrencyDirectionIntegrity(202, 14.2, 202 / 14.2, 'foreign_per_home', 'receipt', 'sell', 'buy').ok);
ok('GATE17 passes on a correct home_per_foreign conversion', validateCurrencyDirectionIntegrity(10_000_000, 2.521, 10_000_000 * 2.521, 'home_per_foreign', 'payment', 'buy', 'buy').ok);
ok('GATE17 an option ALWAYS expects buy, even for a receipt (never sell) — FIX ROUND 1', validateCurrencyDirectionIntegrity(opt.hedged_amount, 14.10, opt.home_from_strike, 'foreign_per_home', 'receipt', 'buy', 'buy').ok);
ok('GATE17 FAILS if an option is described as sell (the old, wrong terminology)', !checkCurrencyDirectionIntegrity(opt.hedged_amount, 14.10, opt.home_from_strike, 'foreign_per_home', 'receipt', 'sell', 'buy').ok);

// GATE 18 — premium-currency check (FIX ROUND 1: no months proration)
ok('GATE18 passes on the all-in premium', validatePremiumCurrency(0.00298, 60, 500_000, opt.premium).ok);
ok('GATE18 FAILS on a premium that silently applied an extra ×100', !checkPremiumCurrency(0.00298, 60, 500_000, opt.premium * 100).ok);
ok('GATE18 FAILS on the OLD (proration) formula — the exact FIX ROUND 1 regression', !checkPremiumCurrency(0.00298, 60, 500_000, 0.00298 * 60 * 500_000 * (3 / 12)).ok);

// GATE 19 — best-method verdict integrity
ok('GATE19 passes when the stated recommendation matches the computed best', validateBestMethodVerdict('receipt', cmpReceipt.results, 'mmh', cmpReceipt.margin).ok);
ok('GATE19 FAILS when a worse method is recommended', !checkBestMethodVerdict('receipt', cmpReceipt.results, 'forward', cmpReceipt.margin).ok);
ok('GATE19 FAILS when the stated margin does not match', !checkBestMethodVerdict('receipt', cmpReceipt.results, 'mmh', 999).ok);

// GATE 17b — quote-sentence structural integrity (FIX ROUND 1, new)
const injectedForeignPerHome = `Some scenario prose. ${quoteDirectionSentence('foreign_per_home', 'R', '$')} More prose.`;
ok('GATE17b passes when the canonical sentence is present verbatim', validateQuoteSentencePresence(injectedForeignPerHome, 'foreign_per_home', 'R', '$').ok);
ok('GATE17b FAILS when the prose states the OPPOSITE direction', !checkQuoteSentencePresence(injectedForeignPerHome, 'home_per_foreign', 'R', '$').ok);
ok('GATE17b FAILS when the canonical sentence is entirely absent', !checkQuoteSentencePresence('Some scenario prose with no quote sentence at all.', 'foreign_per_home', 'R', '$').ok);
ok('quoteDirectionSentence renders the correct direction words (foreign_per_home)', quoteDirectionSentence('foreign_per_home', 'R', '$').includes('R per $ 1'));
ok('quoteDirectionSentence renders the correct direction words (home_per_foreign)', quoteDirectionSentence('home_per_foreign', 'R', '$').includes('$ per R 1'));

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
ok('K2 futures: model answer prose uses the corrected lock-in formula wording', k2Answer.includes('futures₀') && !k2Answer.includes('spot₀ − unexpired'));

const k3Inputs: OptionsDrillInputs = {
  currency_home: '$', currency_foreign: 'R', exposure: 30_000_000, direction: 'receipt', quote_direction: 'foreign_per_home',
  contract_size: 500_000, strike: 14.10, spot: 14.05, premium_pct: 0.00298, premium_currency: 'foreign', months_to_transaction: 3, residual_policy: 'immaterial',
};
const k3Computed = computeOptionsHedge(k3Inputs);
const k3Schema = buildOptionsSchema(k3Inputs, k3Computed);
const k3Answer = buildOptionsModelAnswer(k3Inputs, k3Computed, 'The option preserves upside if the currency moves favourably, at the cost of the premium — worth it given the uncertainty over the period.');
ok('K3 options: GATE1 self-consistency passes', validateSchemaSelfConsistency(k3Schema.schema).ok);
ok('K3 options: every schema figure appears in the model answer', figuresPresent(k3Schema.schema, k3Answer));
// "the right to SELL R" is CORRECT put-option terminology (a put IS the right to sell) — the bug
// class this guards is the INSTRUMENT SIDE being described as "sell N options/contracts", never a
// bare ban on the word "sell" (which legitimately appears describing what a put's right IS).
ok('K3 options: model answer says "buy N put options", never "sell N options/contracts" (FIX ROUND 1)', /buy \*\*60 put options\*\*/.test(k3Answer) && !/sell \d+ (options|contracts)/i.test(k3Answer));
ok('K3 options: model answer states the premium PER UNIT, never as a bare "%" (FIX ROUND 2)', k3Answer.includes('R 0.0030 per unit of contract size') && !/0\.298%|0\.30%/.test(k3Answer));
ok('K3 options: model answer names spot (not strike) as the premium conversion rate (FIX ROUND 2)', k3Answer.includes("converted at today's spot 14.0500, not the strike"));

const k3Payment: OptionsDrillInputs = { ...k3Inputs, direction: 'payment' };
const k3PaymentComputed = computeOptionsHedge(k3Payment);
const k3PaymentAnswer = buildOptionsModelAnswer(k3Payment, k3PaymentComputed, 'A call locks in the maximum cost while leaving room to benefit from favourable moves.');
ok('K3 options (payment): model answer says "buy N call options", never sell N options/contracts', /buy \*\*\d+ call options\*\*/.test(k3PaymentAnswer) && !/sell \d+ (options|contracts)/i.test(k3PaymentAnswer));

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
