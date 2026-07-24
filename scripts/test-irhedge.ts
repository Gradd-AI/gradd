// scripts/test-irhedge.ts
// Fixtures for the AFM interest-rate-hedging family (lib/acca/irhedge.ts, calculator #12). Pure —
// no env/DB/model. Exit 1 on any mismatch.
//
// The K1 futures fixture reproduces the ACTUAL sourced worked numbers from T5 "How to answer an
// interest rate risk management question" (accaglobal.com, P4/AFM) EXACTLY — every figure below is
// the article's own (D27,000,000 deposit, 90 contracts, basis 1.02 → 0.34, closing 94.36/96.06,
// futures P&L (47,250)/144,000, net 515,250, effective 4.58% under BOTH scenarios). The premium
// figure in the options/collar fixtures reproduces Abertafol Co's own worked premium (E1, AFM SD23
// p.14: 0.298% × 60 × $500,000 × 3/12). The swap fixture reproduces T4's Titans/Kendri saving
// arithmetic ((3%−1%)×½, less a 0.5% bank fee). Direction branches, per-kind schema self-consistency,
// figure integrity, and every family gate (20–25) pass/fail are exercised.
import {
  futuresSide, optionToBuy, riskDirectionWord,
  futuresPriceFromRate, computeBasis0, computeUnexpiredBasis, expectedClosingPrice,
  contractCount, irOptionPremium, actualRate,
  computeIrFutures, computeIrOptions, computeIrCollar, computeIrSwap, compareIrMethods,
  conventionSentence, BASIS_SCEPTICISM_HOOK,
  checkDirectionLock, checkContractCount, checkPremiumSeparation,
  checkBasisDecayAndScepticism, checkConventionSentencePresence, checkEffectiveRateReconciliation,
  buildIrFuturesSchema, buildIrFuturesModelAnswer,
  buildIrOptionsSchema, buildIrOptionsModelAnswer,
  buildIrCollarSchema, buildIrCollarModelAnswer,
  buildIrSwapSchema, buildIrSwapModelAnswer,
  type IrFuturesInputs, type IrOptionsInputs, type IrCollarInputs, type IrSwapInputs,
} from '../lib/acca/irhedge';
import {
  validateDirectionLock, validateContractCount, validatePremiumSeparation,
  validateBasisDecayAndScepticism, validateConventionSentencePresence, validateEffectiveRateReconciliation,
  validateSchemaSelfConsistency,
} from '../lib/acca/validate-schema';
import type { AnswerSchema } from '../lib/acca/numeric-verifier';

let failures = 0;
function ok(name: string, cond: boolean) { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`); }
const approx = (a: number, b: number, tol = 1e-6) => Math.abs(a - b) < tol;
const approxRel = (a: number, b: number, relTol = 0.0005) => Math.abs(a - b) <= Math.abs(b) * relTol + 1e-6;
function figuresPresent(schema: AnswerSchema, answer: string): boolean {
  const norm = answer.replace(/,/g, '');
  return schema.components.every((c) => [1, 2, 3, 4].some((d) => norm.includes(c.expected_value.toFixed(d)) || norm.includes(Math.abs(c.expected_value).toFixed(d))));
}

// ─────────────────────────── direction doctrine (issuer-perspective, Rule 22) ───────────────────────────
ok('futuresSide: a borrower SELLS futures', futuresSide('borrower') === 'sell');
ok('futuresSide: a depositor BUYS futures', futuresSide('depositor') === 'buy');
ok('optionToBuy: a borrower buys a PUT (a cap)', optionToBuy('borrower') === 'put');
ok('optionToBuy: a depositor buys a CALL (a floor)', optionToBuy('depositor') === 'call');
ok('riskDirectionWord: a borrower fears a rate RISE', riskDirectionWord('borrower') === 'rise');
ok('riskDirectionWord: a depositor fears a rate FALL', riskDirectionWord('depositor') === 'fall');

// ─────────────────────────── shared IR mechanics ───────────────────────────
ok('futuresPriceFromRate: price = 100 − rate', approx(futuresPriceFromRate(4.20), 95.80));
ok('computeBasis0: (100 − spot rate) − futures price (T5/T6: (100−4.20)−94.78 = 1.02)', approx(computeBasis0(4.20, 94.78), 1.02));
ok('computeUnexpiredBasis: linear decay (T5: 2/6 × 1.02 = 0.34)', approx(computeUnexpiredBasis(1.02, 6, 4), 0.34, 1e-9));
ok('expectedClosingPrice: 100 − rate − unexpired (T5 rise: 100−5.3−0.34 = 94.36)', approx(expectedClosingPrice(5.3, 0.34), 94.36, 1e-9));
ok('expectedClosingPrice: NOT the FX lock-in (opening + unexpired) — a distinct convention', !approx(expectedClosingPrice(5.3, 0.34), 94.78 + 0.34));
ok('contractCount: amount AND period (T5: 27m/0.5m × 5/3 = 90)', contractCount(27_000_000, 500_000, 5, 3) === 90);
ok('contractCount: T4 figure (30m/0.5m × 2/3 = 40)', contractCount(30_000_000, 500_000, 2, 3) === 40);
ok('irOptionPremium: PRORATED by the contract period (Abertafol: 0.298% × 60 × 500k × 3/12 = 22,350)', approx(irOptionPremium(0.298, 60, 500_000, 3), 22_350, 1e-6));
ok('irOptionPremium: is NOT the FX all-in shape (which would be 89,400 with no /12 term)', !approx(irOptionPremium(0.298, 60, 500_000, 3), 0.00298 * 60 * 500_000));
ok('actualRate: a borrower pays base + spread', approx(actualRate(5.0, 0.3, 'borrower'), 5.3));
ok('actualRate: a depositor earns base − spread (T5: 5.3 − 0.3 = 5.0)', approx(actualRate(5.3, 0.3, 'depositor'), 5.0));

// ═══════════════════════════════════════════════════════════════════════════════════════
// K1 — FUTURES: reproduce T5 EXACTLY (depositor, D27m, both rate scenarios reconcile to 4.58%)
// ═══════════════════════════════════════════════════════════════════════════════════════
const t5: IrFuturesInputs = {
  currency: '$', notional: 27_000_000, direction: 'depositor',
  hedge_months: 5, contract_months: 3, contract_size: 500_000,
  spot_rate0: 4.20, futures0: 94.78, months_to_expiry: 6, months_to_transaction: 4,
  company_spread: 0.3,
  scenarios: [{ label: 'rate rises', base_rate: 5.3 }, { label: 'rate falls', base_rate: 3.6 }],
};
const t5c = computeIrFutures(t5);
ok('T5 futures: side is BUY (depositor)', t5c.side === 'buy');
ok('T5 futures: 90 contracts', t5c.contracts === 90);
ok('T5 futures: basis0 = 1.02', approx(t5c.basis0, 1.02));
ok('T5 futures: unexpired basis = 0.34', approx(t5c.unexpired_basis, 0.34, 1e-9));
// scenario 1 (rise to 5.3%)
ok('T5 futures: rise — actual deposit rate 5.0%', approx(t5c.scenarios[0].actual_rate, 5.0));
ok('T5 futures: rise — MM interest 562,500', approx(t5c.scenarios[0].mm_interest, 562_500, 1e-3));
ok('T5 futures: rise — closing price 94.36', approx(t5c.scenarios[0].closing_price, 94.36, 1e-9));
ok('T5 futures: rise — futures LOSS (47,250)', approx(t5c.scenarios[0].futures_profit, -47_250, 1e-3));
ok('T5 futures: rise — net return 515,250', approx(t5c.scenarios[0].net, 515_250, 1e-3));
ok('T5 futures: rise — effective annual 4.58%', approxRel(t5c.scenarios[0].effective_rate, 4.5833, 0.001));
// scenario 2 (fall to 3.6%)
ok('T5 futures: fall — actual deposit rate 3.3%', approx(t5c.scenarios[1].actual_rate, 3.3));
ok('T5 futures: fall — MM interest 371,250', approx(t5c.scenarios[1].mm_interest, 371_250, 1e-3));
ok('T5 futures: fall — closing price 96.06', approx(t5c.scenarios[1].closing_price, 96.06, 1e-9));
ok('T5 futures: fall — futures GAIN 144,000', approx(t5c.scenarios[1].futures_profit, 144_000, 1e-3));
ok('T5 futures: fall — net return 515,250 (SAME as the rise)', approx(t5c.scenarios[1].net, 515_250, 1e-3));
ok('T5 futures: BOTH scenarios lock the same 4.58% (the reconciliation)', approx(t5c.scenarios[0].effective_rate, t5c.scenarios[1].effective_rate, 1e-9));

// borrower futures branch (synthetic, mechanism-only): a loan hedged by SELLING futures
const borrowFut: IrFuturesInputs = {
  currency: '$', notional: 24_000_000, direction: 'borrower',
  hedge_months: 4, contract_months: 3, contract_size: 500_000,
  spot_rate0: 5.0, futures0: 94.60, months_to_expiry: 6, months_to_transaction: 3,
  company_spread: 0.5,
  scenarios: [{ label: 'rate rises', base_rate: 5.9 }, { label: 'rate falls', base_rate: 4.2 }],
};
const borrowFutC = computeIrFutures(borrowFut);
ok('borrower futures: side is SELL', borrowFutC.side === 'sell');
ok('borrower futures: a borrower pays base + spread', approx(borrowFutC.scenarios[0].actual_rate, 5.9 + 0.5));
ok('borrower futures: both scenarios reconcile to one effective cost', approx(borrowFutC.scenarios[0].effective_rate, borrowFutC.scenarios[1].effective_rate, 1e-6));

// ═══════════════════════════════════════════════════════════════════════════════════════
// K2 — OPTIONS: depositor (buy call) + borrower (buy put), prorated premium
// ═══════════════════════════════════════════════════════════════════════════════════════
const depOpt: IrOptionsInputs = {
  currency: '$', notional: 30_000_000, direction: 'depositor',
  hedge_months: 3, contract_months: 3, contract_size: 500_000,
  spot_rate0: 4.5, futures0: 95.20, months_to_expiry: 6, months_to_transaction: 3,
  company_spread: 0.2, strike_price: 95.50, premium_pct: 0.298,
  scenarios: [{ label: 'rate falls', base_rate: 4.5 }, { label: 'rate rises', base_rate: 5.5 }],
};
const depOptC = computeIrOptions(depOpt);
ok('depositor options: buys a CALL', depOptC.option_type === 'call' && depOptC.side === 'buy');
ok('depositor options: premium prorated (0.298% × 60 × 500k × 3/12 = 22,350)', approx(depOptC.premium, 22_350, 1e-3) && depOptC.contracts === 60);
ok('depositor options: a call is exercised when the price is ABOVE the strike', depOptC.scenarios.every((s) => s.exercised === (s.closing_price > 95.50)));

const borrowOpt: IrOptionsInputs = { ...depOpt, direction: 'borrower', strike_price: 95.00 };
const borrowOptC = computeIrOptions(borrowOpt);
ok('borrower options: buys a PUT', borrowOptC.option_type === 'put');
ok('borrower options: a put is exercised when the price is BELOW the strike', borrowOptC.scenarios.every((s) => s.exercised === (s.closing_price < 95.00)));

// ═══════════════════════════════════════════════════════════════════════════════════════
// K3 — COLLAR: depositor (buy call + sell put) + borrower (buy put + sell call), net premium
// ═══════════════════════════════════════════════════════════════════════════════════════
const depCollar: IrCollarInputs = {
  currency: '$', notional: 20_000_000, direction: 'depositor',
  hedge_months: 3, contract_months: 3, contract_size: 500_000,
  spot_rate0: 4.5, futures0: 95.30, months_to_expiry: 6, months_to_transaction: 3,
  company_spread: 0.2, buy_strike: 95.50, sell_strike: 95.00,
  buy_premium_pct: 0.30, sell_premium_pct: 0.12,
  scenarios: [{ label: 'rate falls', base_rate: 4.6 }, { label: 'rate rises', base_rate: 5.4 }],
};
const depCollarC = computeIrCollar(depCollar);
ok('depositor collar: buys a CALL and sells a PUT (Northney)', depCollarC.bought_type === 'call' && depCollarC.sold_type === 'put');
ok('depositor collar: net premium = premium bought − premium received', approx(depCollarC.net_premium, depCollarC.buy_premium - depCollarC.sell_premium));
ok('depositor collar: net premium is positive (protection costs more than the funding leg here)', depCollarC.net_premium > 0);

const borrowCollar: IrCollarInputs = { ...depCollar, direction: 'borrower', buy_strike: 95.00, sell_strike: 95.50 };
const borrowCollarC = computeIrCollar(borrowCollar);
ok('borrower collar: buys a PUT and sells a CALL (buy a cap, sell a floor)', borrowCollarC.bought_type === 'put' && borrowCollarC.sold_type === 'call');

// ═══════════════════════════════════════════════════════════════════════════════════════
// K4 — SWAP (Style A): reproduce T4's Titans/Kendri saving arithmetic
// ═══════════════════════════════════════════════════════════════════════════════════════
const swap: IrSwapInputs = {
  party_a: 'Titans FC', party_b: 'Kendri Co',
  a_fixed: 10, a_floating_margin: 1, b_fixed: 13, b_floating_margin: 2,
  a_wants: 'floating', bank_fee_total: 1, savings_split: 0.5,
};
const swapC = computeIrSwap(swap);
ok('swap: fixed differential = 3%', approx(swapC.fixed_diff, 3));
ok('swap: floating differential = 1%', approx(swapC.floating_diff, 1));
ok('swap: total comparative-advantage gain = 2% (T4: (3%−1%))', approx(swapC.total_gain, 2));
ok('swap: net gain after the 1% bank fee = 1%', approx(swapC.net_gain, 1));
ok('swap: each party benefits 0.5% at a ½ split (T4: "reduced by 0.5%")', approx(swapC.a_benefit, 0.5) && approx(swapC.b_benefit, 0.5));
ok('swap: A wants floating → effective floating margin reduced by its benefit', approx(swapC.a_effective_floating_margin!, 1 - 0.5));
ok('swap: B wants fixed → effective fixed rate reduced by its benefit', approx(swapC.b_effective_fixed!, 13 - 0.5));
let swapThrew = false;
try { computeIrSwap({ ...swap, a_fixed: 10, b_fixed: 10.5 }); } catch { swapThrew = true; }
ok('swap: throws when there is no comparative-advantage gain (fixed_diff ≤ floating_diff)', swapThrew);

// ═══════════════════════════════════════════════════════════════════════════════════════
// COMPARISON — code-owned recommendation
// ═══════════════════════════════════════════════════════════════════════════════════════
const cmpDep = compareIrMethods('depositor', [{ method: 'futures', effective_rate: 4.58 }, { method: 'options', effective_rate: 4.71 }]);
ok('comparison: a depositor picks the HIGHEST effective return', cmpDep.best.method === 'options' && approx(cmpDep.margin, 0.13, 1e-6));
const cmpBor = compareIrMethods('borrower', [{ method: 'futures', effective_rate: 6.10 }, { method: 'options', effective_rate: 5.95 }]);
ok('comparison: a borrower picks the LOWEST effective cost', cmpBor.best.method === 'options' && approx(cmpBor.margin, 0.15, 1e-6));

// ═══════════════════════════════════════════════════════════════════════════════════════
// GATES 20–25 — pass on coherent inputs, FAIL on seeded violations
// ═══════════════════════════════════════════════════════════════════════════════════════
// GATE 20 — direction-lock
ok('GATE20 passes: depositor + buy futures', validateDirectionLock('depositor', 'futures', { futures_side: 'buy' }).ok);
ok('GATE20 FAILS: depositor + SELL futures (wrong)', !checkDirectionLock('depositor', 'futures', { futures_side: 'sell' }).ok);
ok('GATE20 passes: borrower + buy put', validateDirectionLock('borrower', 'options', { option_type: 'put' }).ok);
ok('GATE20 FAILS: borrower + call (wrong)', !checkDirectionLock('borrower', 'options', { option_type: 'call' }).ok);
ok('GATE20 passes: depositor collar buys call + sells put', validateDirectionLock('depositor', 'collar', { collar_bought: 'call', collar_sold: 'put' }).ok);
ok('GATE20 FAILS: depositor collar with the legs swapped', !checkDirectionLock('depositor', 'collar', { collar_bought: 'put', collar_sold: 'call' }).ok);

// GATE 21 — contract-count (the #1 examiner-flagged error: the wrong period)
ok('GATE21 passes on the T5 count (90)', validateContractCount(27_000_000, 500_000, 5, 3, 90).ok);
ok('GATE21 FAILS on the wrong-period count (54 — notional/size with NO period ratio)', !checkContractCount(27_000_000, 500_000, 5, 3, 54).ok);
ok('GATE21 FAILS on a fractional count', !checkContractCount(27_000_000, 500_000, 5, 3, 90.4).ok);

// GATE 22 — premium-separation (IR keeps its period fraction; must not collapse to the FX all-in shape)
ok('GATE22 passes on the prorated premium (22,350)', validatePremiumSeparation(0.298, 60, 500_000, 3, 22_350).ok);
ok('GATE22 FAILS on the FX ALL-IN shape (89,400 — no /12 term)', !checkPremiumSeparation(0.298, 60, 500_000, 3, 89_400).ok);

// GATE 23 — basis-decay + scepticism hook
const futAns = buildIrFuturesModelAnswer(t5, t5c, 'Lock the deposit rate to hit the board target of 4% with certainty.');
ok('GATE23 passes on T5 basis/closing + the scepticism hook present in the model answer', validateBasisDecayAndScepticism(4.20, 94.78, 6, 4, 0.34, 5.3, 94.36, futAns).ok);
ok('GATE23 FAILS when the model answer omits the scepticism hook', !checkBasisDecayAndScepticism(4.20, 94.78, 6, 4, 0.34, 5.3, 94.36, 'no hook here').ok);
ok('GATE23 FAILS on a non-linear unexpired basis', !checkBasisDecayAndScepticism(4.20, 94.78, 6, 4, 0.50, 5.3, 94.20, futAns).ok);
ok('GATE23 FAILS when the closing price uses the FX lock-in formula (opening + unexpired) instead of 100 − rate − unexpired', !checkBasisDecayAndScepticism(4.20, 94.78, 6, 4, 0.34, 5.3, 94.78 + 0.34, futAns).ok);
ok('BASIS_SCEPTICISM_HOOK is actually embedded in the futures model answer', futAns.includes(BASIS_SCEPTICISM_HOOK));

// GATE 24 — convention-sentence presence (the {{QUOTE_SENTENCE}} analogue)
const injected = `Some scenario framing. ${conventionSentence('depositor', 'futures')} More prose.`;
ok('GATE24 passes when the canonical convention sentence is present verbatim', validateConventionSentencePresence(injected, 'depositor', 'futures').ok);
ok('GATE24 FAILS when the prose states the WRONG direction (borrower)', !checkConventionSentencePresence(injected, 'borrower', 'futures').ok);
ok('GATE24 FAILS when the sentence is entirely absent', !checkConventionSentencePresence('no convention sentence at all', 'depositor', 'futures').ok);
ok('conventionSentence: a borrower futures sentence says SELL', conventionSentence('borrower', 'futures').includes('SELLS'));
ok('conventionSentence: a depositor options sentence says BUYS CALL', conventionSentence('depositor', 'options').includes('BUYS CALL'));
ok('conventionSentence: a borrower collar says buy put / sell call', conventionSentence('borrower', 'collar').includes('BUYS put options (a cap) and SELLS call options'));

// GATE 25 — effective-rate reconciliation (a futures lock must reconcile across scenarios)
ok('GATE25 passes when the T5 scenarios reconcile to one rate', validateEffectiveRateReconciliation(t5c.scenarios.map((s) => s.effective_rate)).ok);
ok('GATE25 FAILS when the scenario effective rates diverge (not a lock)', !checkEffectiveRateReconciliation([4.58, 5.10]).ok);

// ═══════════════════════════════════════════════════════════════════════════════════════
// SCHEMAS + MODEL ANSWERS — GATE1 self-consistency + figure integrity, all 4 kinds
// ═══════════════════════════════════════════════════════════════════════════════════════
const futSchema = buildIrFuturesSchema(t5, t5c);
ok('K1 futures: GATE1 self-consistency passes', validateSchemaSelfConsistency(futSchema.schema).ok);
ok('K1 futures: every schema figure appears in the model answer', figuresPresent(futSchema.schema, futAns));
ok('K1 futures: model answer carries Step N — headers (grounding-pack parseable)', /\*\*Step 1 — /.test(futAns) && /\*\*Step 4 — Advice to the board\*\*/.test(futAns));

const depOptSchema = buildIrOptionsSchema(depOpt, depOptC);
const depOptAns = buildIrOptionsModelAnswer(depOpt, depOptC, 'The option keeps the upside if rates rise while capping the downside — worth the premium given recent volatility.');
ok('K2 options: GATE1 self-consistency passes', validateSchemaSelfConsistency(depOptSchema.schema).ok);
ok('K2 options: every schema figure appears in the model answer', figuresPresent(depOptSchema.schema, depOptAns));
ok('K2 options: model answer says "buy N call options", never sells/writes', /buy \*\*60 call options\*\*/i.test(depOptAns) && !/sell \d+ (call|put|options|contracts)/i.test(depOptAns));

const depCollarSchema = buildIrCollarSchema(depCollar, depCollarC);
const depCollarAns = buildIrCollarModelAnswer(depCollar, depCollarC, 'The collar funds most of the protection by giving up extreme upside — a sensible trade for a predictable return.');
ok('K3 collar: GATE1 self-consistency passes', validateSchemaSelfConsistency(depCollarSchema.schema).ok);
ok('K3 collar: every schema figure appears in the model answer', figuresPresent(depCollarSchema.schema, depCollarAns));
ok('K3 collar: model answer carries the Northney 6-step structure', /Step 1 — Options needed/.test(depCollarAns) && /Step 5 — Exercise decision per leg/.test(depCollarAns));

const swapSchema = buildIrSwapSchema(swap, swapC);
const swapAns = buildIrSwapModelAnswer(swap, swapC, 'Both parties gain from the swap; the split is fair and the bank fee is modest relative to the saving.');
ok('K4 swap: GATE1 self-consistency passes', validateSchemaSelfConsistency(swapSchema.schema).ok);
ok('K4 swap: every schema figure appears in the model answer', figuresPresent(swapSchema.schema, swapAns));

// borrower-direction schema branches also self-consistent
ok('K1 futures (borrower branch): GATE1 self-consistency passes', validateSchemaSelfConsistency(buildIrFuturesSchema(borrowFut, borrowFutC).schema).ok);
ok('K2 options (borrower branch): GATE1 self-consistency passes', validateSchemaSelfConsistency(buildIrOptionsSchema(borrowOpt, borrowOptC).schema).ok);
ok('K3 collar (borrower branch): GATE1 self-consistency passes', validateSchemaSelfConsistency(buildIrCollarSchema(borrowCollar, borrowCollarC).schema).ok);

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
