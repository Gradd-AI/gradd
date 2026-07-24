// lib/acca/irhedge.ts
// AFM calculator #12 — INTEREST-RATE HEDGING (Section E). Pure, deterministic, no model/DB/
// side-effects. Code owns EVERY figure AND every figure-vs-figure verdict (exercise decisions,
// effective-rate reconciliation, the futures-vs-options recommendation); the model authors PROSE
// only. Sibling of fxhedge.ts (calc #11) but SHARES NO premium / basis / lock-in code — the two
// families' conventions are structurally DIFFERENT and were deliberately kept separate (see below).
//
// ── PHASE-1 SOURCE CONDITIONS (resolved 2026-07-24, both favourable) ──────────────────────────
//   1a. SWAPS IN, Style A. The comparative-advantage swap lives in an AFM/P4-tier technical article
//       (T4 "Interest rate risk management", irrm.html — page title + breadcrumb both read "P4
//       Advanced Financial Management (AFM)"), under the heading "Suggested swap" (Titans FC /
//       Kendri Co). So the swap kind is Style A (comparative advantage + bank fee split), NOT the
//       T7 forward-curve NPV-valuation style.
//   1b. BORROWER COLLAR CONFIRMED (verbatim). ACCA "Options" (Business Finance) page: "Collars
//       involve simultaneous purchase of a cap and sale of a floor by companies who are borrowing,
//       or purchase of a floor and sale of a cap if they are protecting an investment." This maps
//       exactly onto Northney's depositor quote (a cap = a put on the future; a floor = a call on
//       the future), so the collar kind covers BOTH directions, not depositor-only.
//   FRA stays BACKGROUND TEXTURE, not a kind — the promotion-to-a-4th-kind was contingent on swaps
//   FAILING their condition; swaps passed, so FRA is scenario framing only (Abertafol E1 itself
//   notes the FRA figures are given pre-computed: "proving the figures for the forward rate
//   agreements that had been presented in the scenario ... wasting time").
//
// ── RULE 22 EVIDENCE (verbatim quote + source id + page for every convention the engine encodes) ─
// DIRECTION (borrower SELLS futures / buys PUTs; depositor BUYS futures / buys CALLs) — issuer-
// perspective doctrine, same as calc #6. Triple-cited:
//   • T4 "Interest rate risk management" (irrm.html, P4/AFM): "To create an effective locked rate,
//     Titans FC will SELL March futures at the current price of 93.790%" [borrower→sell] and
//     "MARCH PUT AT 94.000" [borrower→put].
//   • T5 "How to answer an interest rate risk management question" (hedging.html, P4/AFM): "Buy
//     futures now (go long in the futures market), as the hedge is against a fall in interest rates"
//     and "Buy call options as need to hedge against a fall in interest rates" [depositor→buy/call].
//   • Sohbet Co (E4, AFM MJ25 p.11): "determine that futures and call options should be bought"
//     [depositor deposit → buy futures + buy calls]; Abertafol Co (E1, AFM SD23 p.13): loan hedged
//     with futures, investment hedged with "traded call options".
// CONTRACT COUNT = notional / contract_size × hedge_period / contract_period. The #1 examiner-
// flagged error is the WRONG PERIOD (GATE 21 seeds it as a distinct OFR failure):
//   • T5: "Number of contracts = D27,000,000 ÷ D500,000 × 5 months ÷ 3 months = 90 contracts."
//   • T4: "the number of contracts needed will be $30m/$0.5m x 2mths/3mths = 40."
//   • Abertafol E1 p.13: "both the amount covered, and the period of the loan / investment are
//     relevant"; Sohbet E4 p.11: timing "often calculated incorrectly as a three month deposit
//     rather than as a deposit for four months ... gave an incorrect foundation ... number of
//     contracts."
// BASIS = (100 − current rate) − futures price; UNEXPIRED BASIS decays LINEARLY to zero by expiry:
//   • T5 / T6 "Basis risk" (basis-risk.html, P4/AFM): "Current price (1 October) – futures price =
//     basis (100 – 4.20) – 94.78 = 1.02"; "Unexpired basis on 31 January = 2/6 × 1.02 = 0.34";
//     "basis is often assumed to diminish at a constant rate" — flagged by ACCA itself as a
//     simplifying assumption that "may not hold true in practice" (the scepticism-mark hook the
//     Abertafol/Sohbet/Northney examiner reports all reward — see BASIS_SCEPTICISM_HOOK below).
// CLOSING FUTURES PRICE = 100 − expected rate − unexpired basis. THIS IS NOT THE FX LOCK-IN FORMULA
// (fxhedge.ts: opening futures + unexpired basis). The two are structurally different because an IR
// future is quoted as (100 − rate) while an FX future is quoted as a currency rate directly — a
// deliberate non-reuse, NOT an oversight:
//   • T5: "Expected futures price: 100 – 5.3 – 0.34 = 94.36" (rate rises to 5.3%); "100 – 3.6 – 0.34
//     = 96.06" (rate falls to 3.6%).
// FUTURES GAIN/LOSS IS POSITION-SENSITIVE: a LONG position (buyer) gains (closing − opening)/100 ×
// contract size × contract months/12 × contracts; a SHORT position (seller) gains the MIRROR
// (opening − closing)/100 × the same — a buyer profits when the price rises, a seller when it falls
// — netted against the money-market actual interest, giving a single EFFECTIVE ANNUAL RATE that
// reconciles across rate scenarios:
//   • T5: "Loss on the futures market: (0.9436 – 0.9478) × D500,000 × 3/12 × 90 = (47,250)" then
//     "Net return = 515,250 ... Effective annual interest rate 515,250/27,000,000 × 12/5 = 4.58%",
//     and the SAME 4.58% under the rate-fall scenario — the hedge locks one effective rate (the
//     GATE 25 reconciliation; test-irhedge.ts reproduces every one of these figures exactly).
// OPTION PREMIUM = premium% × contracts × contract size × contract months/12 — PRORATED BY THE
// CONTRACT PERIOD. THIS IS STRUCTURALLY SEPARATE FROM fxhedge.ts's ALL-IN currency-option premium
// (which has NO time term) — the divergence is the whole point of GATE 22:
//   • Abertafol E1 p.14: "The total premium should be the percentage presented in the question
//     (0.298%) multiplied by the amount covered – that is 60 contracts here, each being $500,000,
//     3-month contracts (so 0.298% x 60 x $500,000 x 3/12)."
//   The memory bank records that fxhedge's earlier (wrong) all-in-with-proration bug was "an
//   unsourced import from an interest-rate family" — that import was CORRECT for IR and only wrong
//   when applied to FX. GATE 22 asserts the IR premium keeps its period fraction and never collapses
//   to the FX all-in shape.
// OPTION EXERCISE: a depositor's CALL is exercised when the expected futures price is ABOVE the
// strike; a borrower's PUT when it is BELOW:
//   • T5: "If the exercise price is LOWER than the expected futures price, EXERCISE" (a call).
// COLLAR — a borrower buys a cap (a put on the future) and sells a floor (a call); a depositor buys
// a floor (a call) and sells a cap (a put); net premium = premium bought − premium received:
//   • Northney Co (E3, AFM SD24 pp.4-5): a depositor "needed to demonstrate the purchase of a call
//     option and the selling of a put option" and to work "the number of contracts and the net
//     premium ... basis ... expected futures price ... whether the options would be exercised under
//     each of the interest rate scenarios ... the effect of the collar on the net receipts" (the
//     6-step sequence used as this kind's working_steps).
//   • ACCA "Options" (Business Finance): "Collars involve simultaneous purchase of a cap and sale of
//     a floor by companies who are borrowing, or purchase of a floor and sale of a cap if they are
//     protecting an investment."
// SWAP (Style A) — comparative-advantage saving = fixed-rate differential − floating-rate
// differential, split between the parties, with the bank's fee netted off:
//   • T4 (irrm.html, "Suggested swap"): "A swap can be arranged such that each party will save
//     (3%-1%) x ½ = 1% pa excluding fees"; "Titans FC would pay an annual floating rate of LIBOR +
//     1% without undertaking the swap and this is reduced by 0.5% if the swap is undertaken" (a 0.5%
//     bank fee per party). Thinnest-evidenced kind of the four — flagged, mirroring fxhedge's swap.

import { normaliseCurrency, type SerializedSchema } from './valuation';
import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';

// NOTE: this module imports NOTHING from ./fxhedge — the FX family's premium, basis and lock-in
// helpers use different conventions and must never be reused here (GATE 22 enforces the premium
// separation structurally). Only the shared valuation formatting + the schema types are imported.

export { normaliseCurrency };

// ── formatting / tolerances (LOCAL — not shared with fxhedge) ──
export const fmt1 = (n: number): string => n.toFixed(1);
export const fmt2 = (n: number): string => n.toFixed(2);
export const fmt4 = (n: number): string => n.toFixed(4);
const pctStr = (p: number): string => `${p.toFixed(2)}%`;
// Money display helper — prints the RAW figure (absolute units, exact source reproduction) at 1dp
// with thousands separators. Kept at 1dp so the generator's figure-integrity check (which matches
// expected_value.toFixed(1)) always finds every money figure; commas are stripped by that check
// before matching, so they are free readability. NOT fxhedge's money() (which appends a millions
// "m" and would break the figure match against absolute-unit expected values).
function amt(currency: string, n: number): string {
  return `${currency} ${n.toLocaleString('en-US', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}`;
}
// Raw quantity (notional, contract size) with thousands separators — a whole-number amount displayed
// honestly ("24,000,000" not "24000000.0"). Not a schema figure, so its format is free; commas are
// stripped by the figure-integrity check regardless.
function qty(n: number): string {
  return n.toLocaleString('en-US');
}
const EPS = 1e-9;
// Money-shaped figures: plain relative band, no floor — an IR hedge outcome (interest earned/paid,
// a futures P&L, a premium) is never legitimately near-zero, so a floor would only mask a genuine
// seeded-OFR error (same reasoning fxhedge.ts records for its moneyTol).
const moneyTol: Tolerance = { kind: 'relative', pct: 0.5 };
// Effective annual RATE (a percentage) — tight ABSOLUTE band, house doctrine for rate-shaped
// figures (BSOP d1/d2 ±0.05). A relative band on a small percent (4.58%) is punishingly tight AND a
// rate that is a difference of larger money figures can hide an upstream error inside a relative
// band; the absolute band bounds the deviation directly.
const rateTol: Tolerance = { kind: 'absolute', value: 0.05 };
// Futures PRICE / basis (94.36, 1.02, 0.34) — tight absolute band; a price is rate-like, not money.
const priceTol: Tolerance = { kind: 'absolute', value: 0.01 };
const intTol: Tolerance = { kind: 'absolute', value: 0.5 };

// ── domain types ──
export type IrDirection = 'borrower' | 'depositor';
export type IrHedgeKind = 'futures' | 'options' | 'collar' | 'swap';
export interface RateScenario { label: string; base_rate: number } // base_rate in percent (e.g. 5.3)

// A BORROWER fears a rate RISE (its loan gets dearer) → SELLS futures / buys a PUT (a cap).
// A DEPOSITOR fears a rate FALL (its deposit earns less) → BUYS futures / buys a CALL (a floor).
export function futuresSide(dir: IrDirection): 'buy' | 'sell' {
  return dir === 'borrower' ? 'sell' : 'buy';
}
export type OptionType = 'put' | 'call';
export function optionToBuy(dir: IrDirection): OptionType {
  return dir === 'borrower' ? 'put' : 'call';
}
export function riskDirectionWord(dir: IrDirection): 'rise' | 'fall' {
  return dir === 'borrower' ? 'rise' : 'fall';
}

// ── shared IR futures-price mechanics (used by futures / options / collar; NOT fxhedge's) ──
export function futuresPriceFromRate(rate: number): number { return 100 - rate; }
export function computeBasis0(spot_rate0: number, futures0: number): number {
  return (100 - spot_rate0) - futures0;
}
export function computeUnexpiredBasis(basis0: number, months_to_expiry: number, months_to_transaction: number): number {
  if (!(months_to_expiry > 0)) throw new Error(`months_to_expiry must be positive: ${months_to_expiry}`);
  if (!(months_to_transaction <= months_to_expiry)) throw new Error(`months_to_transaction must be ≤ months_to_expiry`);
  return basis0 * ((months_to_expiry - months_to_transaction) / months_to_expiry);
}
// THE RULED IR CLOSING-PRICE FORMULA (NOT the FX lock-in): 100 − expected rate − unexpired basis.
export function expectedClosingPrice(expected_rate: number, unexpired_basis: number): number {
  return 100 - expected_rate - unexpired_basis;
}
// contracts = round( notional/size × hedge_months/contract_months ) — BOTH the amount and the
// period matter (Abertafol E1: "both the amount covered, and the period ... are relevant").
export function contractCount(notional: number, contract_size: number, hedge_months: number, contract_months: number): number {
  if (!(contract_size > 0)) throw new Error(`contract_size must be positive`);
  if (!(contract_months > 0)) throw new Error(`contract_months must be positive`);
  return Math.round((notional / contract_size) * (hedge_months / contract_months));
}
// IR OPTION PREMIUM — PRORATED by the contract period (Abertafol E1: "0.298% x 60 x $500,000 x
// 3/12"). Structurally separate from fxhedge's all-in premium; the /12 term is load-bearing (GATE 22).
export function irOptionPremium(premium_pct: number, contracts: number, contract_size: number, contract_months: number): number {
  return (premium_pct / 100) * contracts * contract_size * (contract_months / 12);
}
// The money-market ("actual") interest on the underlying loan/deposit at the company's own rate
// (the base rate ± the company's spread). A borrower pays base+spread; a depositor earns base−spread.
export function actualRate(base_rate: number, company_spread: number, dir: IrDirection): number {
  return dir === 'borrower' ? base_rate + company_spread : base_rate - company_spread;
}
function mmInterest(actual_rate: number, hedge_months: number, notional: number): number {
  return (actual_rate / 100) * (hedge_months / 12) * notional;
}
function effectiveAnnualPct(net: number, notional: number, hedge_months: number): number {
  return (net / notional) * (12 / hedge_months) * 100;
}

// The one canonical scepticism hook every futures/collar model answer must carry (T6 + the
// examiner reports reward it). GATE 23 checks it is present verbatim.
export const BASIS_SCEPTICISM_HOOK =
  'Basis is assumed to fall to zero at a constant (linear) rate by expiry — a simplifying assumption that may not hold in practice, so the outcome is exposed to basis risk.';

// The canonical unexpired-basis sentence — code-injected so the elapsed/remaining split can never
// be inverted by hand (the inversion risk flagged at Step-0). It ALWAYS phrases the fraction as the
// months REMAINING of the contract's full life (never "elapsed"): unexpired basis scales with the
// UNEXPIRED (remaining) fraction, so stating "remaining" keeps the direction unambiguous.
export function unexpiredBasisSentence(months_to_expiry: number, months_to_transaction: number, basis0: number, unexpired_basis: number): string {
  const remaining = months_to_expiry - months_to_transaction;
  return `With ${remaining} months remaining of the contract's ${months_to_expiry}-month life, the unexpired basis = basis₀ ${fmt4(basis0)} × ${remaining}/${months_to_expiry} months remaining = ${fmt4(unexpired_basis)}.`;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K1 — INTEREST-RATE FUTURES (borrower sells / depositor buys; locks ONE effective rate)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IrFuturesInputs {
  currency: string; notional: number; direction: IrDirection;
  hedge_months: number;          // the loan / deposit period
  contract_months: number;       // the future's underlying period (e.g. 3)
  contract_size: number;
  spot_rate0: number;            // base rate today (%)
  futures0: number;              // futures price today
  months_to_expiry: number;      // today → futures expiry
  months_to_transaction: number; // today → loan/deposit start (close-out), ≤ months_to_expiry
  company_spread: number;        // company rate = base ± spread (pp); 0 if none
  scenarios: RateScenario[];     // 1 or 2 (typically a rise and a fall)
}
export interface IrFuturesScenarioResult {
  label: string; base_rate: number; actual_rate: number; mm_interest: number;
  closing_price: number; futures_profit: number; net: number; effective_rate: number;
}
export interface IrFuturesComputed {
  side: 'buy' | 'sell'; contracts: number;
  basis0: number; unexpired_basis: number;
  scenarios: IrFuturesScenarioResult[];
  locked_effective_rate: number; // scenarios[0]'s effective rate — GATE 25 checks the rest agree
}
export function computeIrFutures(raw: IrFuturesInputs): IrFuturesComputed {
  if (!(raw.notional > 0)) throw new Error(`notional must be positive: ${raw.notional}`);
  if (!(raw.scenarios.length >= 1)) throw new Error(`at least one rate scenario is required`);
  const side = futuresSide(raw.direction);
  const contracts = contractCount(raw.notional, raw.contract_size, raw.hedge_months, raw.contract_months);
  const basis0 = computeBasis0(raw.spot_rate0, raw.futures0);
  const unexpired_basis = computeUnexpiredBasis(basis0, raw.months_to_expiry, raw.months_to_transaction);
  const scenarios = raw.scenarios.map((s) => {
    const a_rate = actualRate(s.base_rate, raw.company_spread, raw.direction);
    const mm = mmInterest(a_rate, raw.hedge_months, raw.notional);
    const closing = expectedClosingPrice(s.base_rate, unexpired_basis);
    // buyer profits when the price rises; seller when it falls
    const priceMove = side === 'buy' ? closing - raw.futures0 : raw.futures0 - closing;
    const futures_profit = (priceMove / 100) * raw.contract_size * (raw.contract_months / 12) * contracts;
    // depositor: net RETURN = interest earned + futures profit; borrower: net COST = interest paid − futures profit
    const net = raw.direction === 'depositor' ? mm + futures_profit : mm - futures_profit;
    const effective_rate = effectiveAnnualPct(net, raw.notional, raw.hedge_months);
    return { label: s.label, base_rate: s.base_rate, actual_rate: a_rate, mm_interest: mm, closing_price: closing, futures_profit, net, effective_rate };
  });
  return { side, contracts, basis0, unexpired_basis, scenarios, locked_effective_rate: scenarios[0].effective_rate };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K2 — OPTIONS ON IR FUTURES (borrower buys PUT / depositor buys CALL; a floor/cap, not a lock)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IrOptionsInputs {
  currency: string; notional: number; direction: IrDirection;
  hedge_months: number; contract_months: number; contract_size: number;
  spot_rate0: number; futures0: number; months_to_expiry: number; months_to_transaction: number;
  company_spread: number;
  strike_price: number;   // the option strike, expressed as a futures price
  premium_pct: number;    // annual premium %, e.g. 0.298
  scenarios: RateScenario[];
}
export interface IrOptionsScenarioResult {
  label: string; base_rate: number; actual_rate: number; mm_interest: number;
  closing_price: number; exercised: boolean; option_payoff: number; net: number; effective_rate: number;
}
export interface IrOptionsComputed {
  option_type: OptionType; side: 'buy'; contracts: number; premium: number;
  unexpired_basis: number; scenarios: IrOptionsScenarioResult[];
}
export function computeIrOptions(raw: IrOptionsInputs): IrOptionsComputed {
  if (!(raw.notional > 0)) throw new Error(`notional must be positive: ${raw.notional}`);
  const option_type = optionToBuy(raw.direction);
  const contracts = contractCount(raw.notional, raw.contract_size, raw.hedge_months, raw.contract_months);
  const premium = irOptionPremium(raw.premium_pct, contracts, raw.contract_size, raw.contract_months);
  const basis0 = computeBasis0(raw.spot_rate0, raw.futures0);
  const unexpired_basis = computeUnexpiredBasis(basis0, raw.months_to_expiry, raw.months_to_transaction);
  const scenarios = raw.scenarios.map((s) => {
    const a_rate = actualRate(s.base_rate, raw.company_spread, raw.direction);
    const mm = mmInterest(a_rate, raw.hedge_months, raw.notional);
    const closing = expectedClosingPrice(s.base_rate, unexpired_basis);
    // a CALL is exercised when the price is ABOVE the strike; a PUT when it is BELOW (T5).
    const exercised = option_type === 'call' ? closing > raw.strike_price : closing < raw.strike_price;
    const intrinsic = option_type === 'call' ? closing - raw.strike_price : raw.strike_price - closing;
    const option_payoff = exercised ? (intrinsic / 100) * raw.contract_size * (raw.contract_months / 12) * contracts : 0;
    // depositor return = interest + option gain − premium; borrower cost = interest − option gain + premium
    const net = raw.direction === 'depositor' ? mm + option_payoff - premium : mm - option_payoff + premium;
    const effective_rate = effectiveAnnualPct(net, raw.notional, raw.hedge_months);
    return { label: s.label, base_rate: s.base_rate, actual_rate: a_rate, mm_interest: mm, closing_price: closing, exercised, option_payoff, net, effective_rate };
  });
  return { option_type, side: 'buy', contracts, premium, unexpired_basis, scenarios };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K3 — INTEREST-RATE COLLAR (Northney 6-step; borrower buys put+sells call, depositor buys
// call+sells put; net premium = premium bought − premium received)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IrCollarInputs {
  currency: string; notional: number; direction: IrDirection;
  hedge_months: number; contract_months: number; contract_size: number;
  spot_rate0: number; futures0: number; months_to_expiry: number; months_to_transaction: number;
  company_spread: number;
  buy_strike: number;         // strike of the BOUGHT leg (put for a borrower, call for a depositor)
  sell_strike: number;        // strike of the SOLD leg (call for a borrower, put for a depositor)
  buy_premium_pct: number;    // premium PAID on the bought leg (%)
  sell_premium_pct: number;   // premium RECEIVED on the sold leg (%)
  scenarios: RateScenario[];
}
export interface IrCollarScenarioResult {
  label: string; base_rate: number; actual_rate: number; mm_interest: number; closing_price: number;
  bought_exercised: boolean; bought_payoff: number;   // received when the bought leg is in the money
  sold_exercised: boolean; sold_payoff: number;        // PAID OUT when the counterparty exercises the sold leg
  net: number; effective_rate: number;
}
export interface IrCollarComputed {
  bought_type: OptionType; sold_type: OptionType; contracts: number;
  buy_premium: number; sell_premium: number; net_premium: number;
  unexpired_basis: number; scenarios: IrCollarScenarioResult[];
}
export function computeIrCollar(raw: IrCollarInputs): IrCollarComputed {
  if (!(raw.notional > 0)) throw new Error(`notional must be positive: ${raw.notional}`);
  // depositor: buy CALL + sell PUT; borrower: buy PUT + sell CALL
  const bought_type: OptionType = raw.direction === 'depositor' ? 'call' : 'put';
  const sold_type: OptionType = raw.direction === 'depositor' ? 'put' : 'call';
  const contracts = contractCount(raw.notional, raw.contract_size, raw.hedge_months, raw.contract_months);
  const buy_premium = irOptionPremium(raw.buy_premium_pct, contracts, raw.contract_size, raw.contract_months);
  const sell_premium = irOptionPremium(raw.sell_premium_pct, contracts, raw.contract_size, raw.contract_months);
  const net_premium = buy_premium - sell_premium; // premium bought − premium received (Northney)
  const basis0 = computeBasis0(raw.spot_rate0, raw.futures0);
  const unexpired_basis = computeUnexpiredBasis(basis0, raw.months_to_expiry, raw.months_to_transaction);
  const payoff = (type: OptionType, strike: number, closing: number, exercised: boolean): number =>
    exercised ? ((type === 'call' ? closing - strike : strike - closing) / 100) * raw.contract_size * (raw.contract_months / 12) * contracts : 0;
  const scenarios = raw.scenarios.map((s) => {
    const a_rate = actualRate(s.base_rate, raw.company_spread, raw.direction);
    const mm = mmInterest(a_rate, raw.hedge_months, raw.notional);
    const closing = expectedClosingPrice(s.base_rate, unexpired_basis);
    const bought_exercised = bought_type === 'call' ? closing > raw.buy_strike : closing < raw.buy_strike;
    const bought_payoff = payoff(bought_type, raw.buy_strike, closing, bought_exercised);
    // the counterparty exercises the SOLD leg against us: a sold call is exercised when price is
    // above its strike; a sold put when price is below its strike.
    const sold_exercised = sold_type === 'call' ? closing > raw.sell_strike : closing < raw.sell_strike;
    const sold_payoff = payoff(sold_type, raw.sell_strike, closing, sold_exercised);
    // depositor return = interest + bought gain − sold payout − net premium
    // borrower cost   = interest − bought gain + sold payout + net premium
    const net = raw.direction === 'depositor'
      ? mm + bought_payoff - sold_payoff - net_premium
      : mm - bought_payoff + sold_payoff + net_premium;
    const effective_rate = effectiveAnnualPct(net, raw.notional, raw.hedge_months);
    return { label: s.label, base_rate: s.base_rate, actual_rate: a_rate, mm_interest: mm, closing_price: closing, bought_exercised, bought_payoff, sold_exercised, sold_payoff, net, effective_rate };
  });
  return { bought_type, sold_type, contracts, buy_premium, sell_premium, net_premium, unexpired_basis, scenarios };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K4 — INTEREST-RATE SWAP (Style A, comparative advantage; thin evidence — T4 only)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IrSwapInputs {
  party_a: string; party_b: string;
  a_fixed: number; a_floating_margin: number; // A borrows fixed at a_fixed, or floating at LIBOR + a_floating_margin
  b_fixed: number; b_floating_margin: number;
  a_wants: 'fixed' | 'floating';              // which rate A actually wants (B wants the other)
  bank_fee_total: number;                     // total bank fee (pp), split per savings_split
  savings_split: number;                      // A's share of the NET saving, (0,1); 0.5 = equal
}
export interface IrSwapComputed {
  fixed_diff: number; floating_diff: number;
  total_gain: number; net_gain: number;
  a_benefit: number; b_benefit: number;
  a_effective_fixed?: number; a_effective_floating_margin?: number;
  b_effective_fixed?: number; b_effective_floating_margin?: number;
}
export function computeIrSwap(raw: IrSwapInputs): IrSwapComputed {
  if (!(raw.savings_split > 0 && raw.savings_split < 1)) throw new Error(`savings_split out of range (0,1): ${raw.savings_split}`);
  const fixed_diff = Math.abs(raw.a_fixed - raw.b_fixed);
  const floating_diff = Math.abs(raw.a_floating_margin - raw.b_floating_margin);
  const total_gain = fixed_diff - floating_diff; // must be > 0 for a swap to be worthwhile
  if (!(total_gain > 0)) throw new Error(`no comparative-advantage gain: fixed_diff ${fixed_diff} ≤ floating_diff ${floating_diff}`);
  const net_gain = total_gain - raw.bank_fee_total;
  const a_benefit = net_gain * raw.savings_split;
  const b_benefit = net_gain * (1 - raw.savings_split);
  const out: IrSwapComputed = { fixed_diff, floating_diff, total_gain, net_gain, a_benefit, b_benefit };
  // each party's effective rate for what they WANT = their standalone rate for it minus their benefit
  if (raw.a_wants === 'floating') out.a_effective_floating_margin = raw.a_floating_margin - a_benefit;
  else out.a_effective_fixed = raw.a_fixed - a_benefit;
  if (raw.a_wants === 'floating') out.b_effective_fixed = raw.b_fixed - b_benefit;      // B wants fixed
  else out.b_effective_floating_margin = raw.b_floating_margin - b_benefit;             // B wants floating
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ALL-METHODS COMPARISON — code-owned recommendation (futures lock vs option floor/cap). A
// depositor wants the HIGHEST effective return; a borrower the LOWEST effective cost.
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IrMethodResult { method: string; effective_rate: number }
export interface IrComparisonComputed { results: IrMethodResult[]; best: IrMethodResult; margin: number }
export function compareIrMethods(direction: IrDirection, results: IrMethodResult[]): IrComparisonComputed {
  if (results.length < 2) throw new Error('compareIrMethods needs at least two methods');
  const sorted = [...results].sort((a, b) => direction === 'depositor' ? b.effective_rate - a.effective_rate : a.effective_rate - b.effective_rate);
  return { results, best: sorted[0], margin: Math.abs(sorted[0].effective_rate - sorted[1].effective_rate) };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// CONVENTION SENTENCES — code-injected, the {{QUOTE_SENTENCE}} analogue (GATE 24). The generator
// injects the canonical sentence into context_text via a placeholder so a direction/convention
// mismatch between the parameter and the prose is impossible by construction; the gate is the
// regression lock that verifies the sentence is present verbatim.
// ═══════════════════════════════════════════════════════════════════════════════════════
export function conventionSentence(direction: IrDirection, kind: IrHedgeKind): string {
  const role = direction === 'borrower' ? 'borrower' : 'depositor';
  const risk = riskDirectionWord(direction);
  const priceNote = 'interest-rate futures are quoted as (100 − the annual rate)';
  if (kind === 'futures') {
    const side = futuresSide(direction).toUpperCase();
    return `As a ${role} hedging against a rate ${risk}, the company ${side}S interest-rate futures now (${priceNote}).`;
  }
  if (kind === 'options') {
    const t = optionToBuy(direction).toUpperCase();
    return `As a ${role} hedging against a rate ${risk}, the company BUYS ${t} options on the futures (${priceNote}).`;
  }
  if (kind === 'collar') {
    const legs = direction === 'depositor'
      ? 'BUYS call options (a floor) and SELLS put options (a cap)'
      : 'BUYS put options (a cap) and SELLS call options (a floor)';
    return `As a ${role}'s collar, the company ${legs}, so the net premium is the premium bought less the premium received.`;
  }
  return `The swap exploits comparative advantage: the party with the comparative advantage in the fixed-rate market borrows fixed, the other borrows floating, and they swap — the total saving is the fixed-rate differential less the floating-rate differential, shared between the parties after the bank's fee.`;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// GATE CORES (delegated to by validate-schema.ts wrappers GATE 20–25; run in the generator's
// runQuantitativeGates for ir-hedge drills only).
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface IrCheck { ok: boolean; reason?: string }

// GATE 20 — DIRECTION-LOCK. The observed instrument side/type must match the borrower/depositor ×
// instrument matrix (Rule 22 direction citations). `observed` is the actual coded side/type.
export function checkDirectionLock(direction: IrDirection, kind: IrHedgeKind, observed: { futures_side?: 'buy' | 'sell'; option_type?: OptionType; collar_bought?: OptionType; collar_sold?: OptionType }): IrCheck {
  if (kind === 'futures') {
    const want = futuresSide(direction);
    if (observed.futures_side !== want) return { ok: false, reason: `a ${direction} must ${want.toUpperCase()} interest-rate futures, not ${String(observed.futures_side).toUpperCase()}` };
  } else if (kind === 'options') {
    const want = optionToBuy(direction);
    if (observed.option_type !== want) return { ok: false, reason: `a ${direction} hedges with a BOUGHT ${want.toUpperCase()} option, not a ${String(observed.option_type).toUpperCase()}` };
  } else if (kind === 'collar') {
    const wantBought = direction === 'depositor' ? 'call' : 'put';
    const wantSold = direction === 'depositor' ? 'put' : 'call';
    if (observed.collar_bought !== wantBought || observed.collar_sold !== wantSold) return { ok: false, reason: `a ${direction}'s collar must BUY a ${wantBought.toUpperCase()} and SELL a ${wantSold.toUpperCase()} (got buy ${String(observed.collar_bought).toUpperCase()} / sell ${String(observed.collar_sold).toUpperCase()})` };
  }
  return { ok: true };
}

// GATE 21 — CONTRACT-COUNT. contracts = round(notional/size × hedge_months/contract_months). The
// seeded wrong-period variant (dropping the period ratio, or using the contract period as the
// hedge period) is a DISTINCT failure — the #1 examiner-flagged error (Abertafol/Sohbet).
export function checkContractCount(notional: number, contract_size: number, hedge_months: number, contract_months: number, contracts: number): IrCheck {
  const expected = contractCount(notional, contract_size, hedge_months, contract_months);
  if (!Number.isInteger(contracts)) return { ok: false, reason: `contracts (${contracts}) is not a whole number` };
  if (contracts !== expected) return { ok: false, reason: `contracts ${contracts} ≠ round(notional/size × hedge/contract months) = ${expected} — BOTH the amount covered and the loan/deposit period are relevant` };
  // guard the specific wrong-period mistake: the count that ignores the period ratio
  const wrongNoPeriod = Math.round(notional / contract_size);
  if (hedge_months !== contract_months && contracts === wrongNoPeriod && expected !== wrongNoPeriod) {
    return { ok: false, reason: `contracts ${contracts} equals notional/size with NO period adjustment — the loan/deposit period (${hedge_months}m) differs from the contract period (${contract_months}m) and must scale the count` };
  }
  return { ok: true };
}

// GATE 22 — PREMIUM-SEPARATION. The IR option premium MUST include the contract-period fraction
// (premium% × contracts × size × contract_months/12) and MUST NOT collapse to fxhedge's ALL-IN
// currency-option shape (premium% × contracts × size, i.e. no time term). Asserts the two families
// stay structurally separate.
export function checkPremiumSeparation(premium_pct: number, contracts: number, contract_size: number, contract_months: number, premium: number): IrCheck {
  const expected = irOptionPremium(premium_pct, contracts, contract_size, contract_months);
  if (Math.abs(premium - expected) > Math.abs(expected) * 0.001 + EPS) return { ok: false, reason: `premium ${fmt1(premium)} ≠ premium% × contracts × size × contract months/12 = ${fmt1(expected)} — the IR premium is prorated by the contract period` };
  const fxAllIn = (premium_pct / 100) * contracts * contract_size; // fxhedge's shape — must NOT match
  if (contract_months !== 12 && Math.abs(premium - fxAllIn) <= Math.abs(fxAllIn) * 0.001 + EPS) {
    return { ok: false, reason: `premium ${fmt1(premium)} equals the ALL-IN (no-proration) shape ${fmt1(fxAllIn)} borrowed from the FX-options family — the IR premium must keep its contract-period fraction (×${contract_months}/12)` };
  }
  return { ok: true };
}

// GATE 23 — BASIS-DECAY + SCEPTICISM HOOK. unexpired basis decays linearly; the closing price is
// 100 − expected rate − unexpired basis (the ruled IR formula, NOT the FX lock-in); and the model
// answer carries the basis-risk scepticism hook verbatim.
export function checkBasisDecayAndScepticism(spot_rate0: number, futures0: number, months_to_expiry: number, months_to_transaction: number, unexpired_basis: number, base_rate: number, closing_price: number, model_answer: string): IrCheck {
  const basis0 = computeBasis0(spot_rate0, futures0);
  const expectedUnexpired = computeUnexpiredBasis(basis0, months_to_expiry, months_to_transaction);
  if (Math.abs(unexpired_basis - expectedUnexpired) > Math.abs(basis0) * 0.001 + 1e-6) return { ok: false, reason: `unexpired basis ${fmt4(unexpired_basis)} ≠ basis0 ${fmt4(basis0)} × remaining/total months = ${fmt4(expectedUnexpired)} — basis must decline LINEARLY to zero at expiry` };
  const expectedClosing = expectedClosingPrice(base_rate, unexpired_basis);
  if (Math.abs(closing_price - expectedClosing) > 0.01 + 1e-6) return { ok: false, reason: `closing price ${fmt2(closing_price)} ≠ 100 − expected rate ${fmt2(base_rate)} − unexpired basis ${fmt4(unexpired_basis)} = ${fmt2(expectedClosing)} (the IR convention, NOT the FX lock-in 'opening + unexpired')` };
  if (!model_answer.includes(BASIS_SCEPTICISM_HOOK)) return { ok: false, reason: `the model answer does not carry the basis-risk scepticism hook verbatim — every futures/collar answer must flag that linear basis decay may not hold in practice` };
  return { ok: true };
}

// GATE 24 — CONVENTION-SENTENCE PRESENCE (the {{QUOTE_SENTENCE}} analogue). The canonical
// code-generated direction/convention sentence must be present verbatim in context_text.
export function checkConventionSentencePresence(context_text: string, direction: IrDirection, kind: IrHedgeKind): IrCheck {
  const expected = conventionSentence(direction, kind);
  if (!context_text.includes(expected)) return { ok: false, reason: `context_text does not contain the canonical convention sentence for a ${direction} ${kind} (expected verbatim: "${expected}") — the generator's placeholder injection did not run, or the sentence was altered` };
  return { ok: true };
}

// GATE 25 — EFFECTIVE-RATE RECONCILIATION. A futures hedge locks ONE effective rate: every rate
// scenario must reconcile to the same effective annual rate within the rate tolerance (the T5
// pattern — 4.58% under both a rise and a fall). Options/collars are NOT locks and are exempt.
export function checkEffectiveRateReconciliation(effectiveRates: number[]): IrCheck {
  if (effectiveRates.length < 2) return { ok: true };
  const first = effectiveRates[0];
  for (const r of effectiveRates) {
    if (Math.abs(r - first) > 0.05 + 1e-6) return { ok: false, reason: `effective rates do not reconcile across scenarios (${effectiveRates.map((x) => x.toFixed(3)).join(', ')}%) — a futures hedge must lock a SINGLE effective rate; a spread means the basis/gain arithmetic is inconsistent` };
  }
  return { ok: true };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// SERIALIZATION — local copy of the per-family toSerialized (same SerializedSchema shape).
// ═══════════════════════════════════════════════════════════════════════════════════════
function toSerialized(components: Component[], recomputeIds: Record<string, string | undefined>, params: Record<string, number>): SerializedSchema {
  return {
    components: components.map((comp) => {
      const s: SerializedSchema['components'][number] = {
        component_id: comp.component_id, label: comp.label, expected_value: comp.expected_value,
        unit: comp.unit, tolerance: comp.tolerance, working_steps: comp.working_steps,
        depends_on: comp.depends_on, weight: comp.weight,
      };
      const rid = recomputeIds[comp.component_id];
      if (rid) s.recompute = rid;
      return s;
    }),
    params,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K1 — FUTURES: schema + model answer
// ═══════════════════════════════════════════════════════════════════════════════════════
export function buildIrFuturesSchema(raw: IrFuturesInputs, c: IrFuturesComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const cur = raw.currency, moneyUnit = cur;
  const s0 = c.scenarios[0];
  const comps: Component[] = [
    { component_id: 'contracts', label: 'Number of futures contracts (whole)', expected_value: c.contracts, unit: 'contracts', tolerance: intTol,
      working_steps: [`= round(${qty(raw.notional)} ÷ ${qty(raw.contract_size)} × ${raw.hedge_months}/${raw.contract_months} months) — amount AND period`] },
    { component_id: 'unexpired_basis', label: 'Unexpired basis at the transaction date', expected_value: c.unexpired_basis, unit: 'price', tolerance: priceTol,
      working_steps: [`basis₀ = (100 − ${fmt2(raw.spot_rate0)}) − ${fmt2(raw.futures0)} = ${fmt2(c.basis0)}; unexpired = basis₀ × ${raw.months_to_expiry - raw.months_to_transaction}/${raw.months_to_expiry}`] },
    { component_id: 'closing_price', label: `Expected closing futures price (${s0.label})`, expected_value: s0.closing_price, unit: 'price', tolerance: priceTol,
      depends_on: ['unexpired_basis'], recompute: (d) => 100 - s0.base_rate - d.unexpired_basis,
      working_steps: [`= 100 − ${fmt2(s0.base_rate)} − unexpired basis`] },
    { component_id: 'mm_interest', label: `Money-market interest (${s0.label})`, expected_value: s0.mm_interest, unit: moneyUnit, tolerance: moneyTol,
      working_steps: [`= ${fmt2(s0.actual_rate)}% × ${raw.hedge_months}/12 × ${qty(raw.notional)}`] },
    { component_id: 'futures_profit', label: `Futures profit/(loss) (${s0.label})`, expected_value: s0.futures_profit, unit: moneyUnit, tolerance: moneyTol,
      depends_on: ['contracts', 'closing_price'],
      recompute: (d) => ((c.side === 'buy' ? d.closing_price - raw.futures0 : raw.futures0 - d.closing_price) / 100) * raw.contract_size * (raw.contract_months / 12) * d.contracts,
      working_steps: [`= (${c.side === 'buy' ? 'closing − opening' : 'opening − closing'})/100 × ${qty(raw.contract_size)} × ${raw.contract_months}/12 × contracts`] },
    { component_id: 'net_outcome', label: `Net ${raw.direction === 'depositor' ? 'return' : 'cost'} (${s0.label})`, expected_value: s0.net, unit: moneyUnit, tolerance: moneyTol,
      depends_on: ['mm_interest', 'futures_profit'],
      recompute: (d) => raw.direction === 'depositor' ? d.mm_interest + d.futures_profit : d.mm_interest - d.futures_profit,
      working_steps: [`= money-market interest ${raw.direction === 'depositor' ? '+' : '−'} futures profit`] },
    { component_id: 'effective_rate', label: `Effective annual ${raw.direction === 'depositor' ? 'return' : 'cost'} rate (locked)`, expected_value: s0.effective_rate, unit: '%', tolerance: rateTol,
      depends_on: ['net_outcome'], recompute: (d) => (d.net_outcome / raw.notional) * (12 / raw.hedge_months) * 100,
      working_steps: [`= net ÷ ${qty(raw.notional)} × 12/${raw.hedge_months} × 100`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { closing_price: 'irh_closing_price', futures_profit: 'irh_futures_profit', net_outcome: 'irh_net', effective_rate: 'irh_effective' };
  const params = { notional: raw.notional, contract_size: raw.contract_size, hedge_months: raw.hedge_months, contract_months: raw.contract_months, spot_rate0: raw.spot_rate0, futures0: raw.futures0, months_to_expiry: raw.months_to_expiry, months_to_transaction: raw.months_to_transaction, company_spread: raw.company_spread, base_rate: s0.base_rate };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildIrFuturesModelAnswer(raw: IrFuturesInputs, c: IrFuturesComputed, prose: string): string {
  const cur = raw.currency, m = (n: number) => amt(cur, n);
  const scenLines = c.scenarios.map((s) =>
    `| ${s.label} (base ${pctStr(s.base_rate)}) | ${pctStr(s.actual_rate)} | ${m(s.mm_interest)} | ${fmt2(s.closing_price)} | ${m(s.futures_profit)} | ${m(s.net)} | ${pctStr(s.effective_rate)} |`);
  return [
    '**Interest-rate hedging — futures**', '',
    `**Assumptions:** a ${cur} ${qty(raw.notional)} ${raw.direction === 'depositor' ? 'deposit' : 'loan'} runs for ${raw.hedge_months} months from a start date ${raw.months_to_transaction} months away; ${raw.contract_months}-month futures of size ${qty(raw.contract_size)} expire in ${raw.months_to_expiry} months, base rate today ${pctStr(raw.spot_rate0)}, futures price ${fmt2(raw.futures0)}. A ${raw.direction} must **${c.side.toUpperCase()}** the futures.`, '',
    '**Step 1 — Number of contracts (amount AND period)**', '', `${qty(raw.notional)} ÷ ${qty(raw.contract_size)} × ${raw.hedge_months}/${raw.contract_months} = **${c.contracts} contracts** (${c.contracts.toFixed(1)}, ${c.side}).`, '',
    '**Step 2 — Basis and the expected closing price**', '', `Basis₀ = (100 − ${fmt2(raw.spot_rate0)}) − ${fmt2(raw.futures0)} = ${fmt2(c.basis0)}. ${unexpiredBasisSentence(raw.months_to_expiry, raw.months_to_transaction, c.basis0, c.unexpired_basis)} Expected closing futures price = 100 − expected rate − unexpired basis. ${BASIS_SCEPTICISM_HOOK}`, '',
    '**Step 3 — Outcome under each scenario**', '',
    `| Scenario | Actual rate | MM interest | Closing price | Futures P/(L) | Net | Effective |`, `|---|---|---|---|---|---|---|`,
    ...scenLines, '',
    `The hedge **locks an effective annual ${raw.direction === 'depositor' ? 'return' : 'cost'} of ${pctStr(c.locked_effective_rate)}** — the same under every scenario.`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: ${c.contracts} contracts; effective rate ${pctStr(c.locked_effective_rate)} reconciles across all ${c.scenarios.length} scenario(s) ✓*`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K2 — OPTIONS: schema + model answer
// ═══════════════════════════════════════════════════════════════════════════════════════
export function buildIrOptionsSchema(raw: IrOptionsInputs, c: IrOptionsComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const cur = raw.currency, moneyUnit = cur;
  const s0 = c.scenarios[0];
  const comps: Component[] = [
    { component_id: 'contracts', label: 'Number of option contracts (whole)', expected_value: c.contracts, unit: 'contracts', tolerance: intTol,
      working_steps: [`= round(${qty(raw.notional)} ÷ ${qty(raw.contract_size)} × ${raw.hedge_months}/${raw.contract_months})`] },
    { component_id: 'premium', label: `Total premium (${c.option_type} options bought)`, expected_value: c.premium, unit: moneyUnit, tolerance: moneyTol,
      depends_on: ['contracts'], recompute: (d) => irOptionPremium(raw.premium_pct, d.contracts, raw.contract_size, raw.contract_months),
      working_steps: [`= ${pctStr(raw.premium_pct)} × contracts × ${qty(raw.contract_size)} × ${raw.contract_months}/12 (prorated by the contract period)`] },
    { component_id: 'closing_price', label: `Expected closing futures price (${s0.label})`, expected_value: s0.closing_price, unit: 'price', tolerance: priceTol,
      working_steps: [`= 100 − ${fmt2(s0.base_rate)} − unexpired basis ${fmt4(c.unexpired_basis)}`] },
    { component_id: 'option_payoff', label: `Option gain if exercised (${s0.label})`, expected_value: s0.option_payoff, unit: moneyUnit, tolerance: moneyTol,
      depends_on: ['contracts', 'closing_price'],
      // max(0, intrinsic) — a bought option is exercised iff its intrinsic value is positive; writing
      // it this way (rather than an if that returns 0 on lapse) ALWAYS reads both declared edges, so
      // the OFR-wiring lint never sees `contracts` as an unused edge when the option happens to lapse.
      recompute: (d) => {
        const intr = c.option_type === 'call' ? d.closing_price - raw.strike_price : raw.strike_price - d.closing_price;
        return (Math.max(0, intr) / 100) * raw.contract_size * (raw.contract_months / 12) * d.contracts;
      },
      working_steps: [`${c.option_type} exercised iff price ${c.option_type === 'call' ? '>' : '<'} strike ${fmt2(raw.strike_price)}; gain = |price − strike|/100 × size × ${raw.contract_months}/12 × contracts`] },
    { component_id: 'net_outcome', label: `Net ${raw.direction === 'depositor' ? 'return' : 'cost'} (${s0.label})`, expected_value: s0.net, unit: moneyUnit, tolerance: moneyTol,
      depends_on: ['option_payoff', 'premium'],
      recompute: (d) => {
        const mm = s0.mm_interest;
        return raw.direction === 'depositor' ? mm + d.option_payoff - d.premium : mm - d.option_payoff + d.premium;
      },
      working_steps: [`= money-market interest ${raw.direction === 'depositor' ? '+ option gain − premium' : '− option gain + premium'}`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { premium: 'irh_opt_premium', option_payoff: 'irh_opt_payoff', net_outcome: 'irh_opt_net' };
  const params = { notional: raw.notional, contract_size: raw.contract_size, hedge_months: raw.hedge_months, contract_months: raw.contract_months, strike_price: raw.strike_price, premium_pct: raw.premium_pct, base_rate: s0.base_rate };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildIrOptionsModelAnswer(raw: IrOptionsInputs, c: IrOptionsComputed, prose: string): string {
  const cur = raw.currency, m = (n: number) => amt(cur, n);
  const scenLines = c.scenarios.map((s) =>
    `| ${s.label} (base ${pctStr(s.base_rate)}) | ${fmt2(s.closing_price)} | ${s.exercised ? 'exercise' : 'lapse'} | ${m(s.option_payoff)} | ${m(s.net)} | ${pctStr(s.effective_rate)} |`);
  return [
    '**Interest-rate hedging — options on futures**', '',
    `**Assumptions:** a ${cur} ${qty(raw.notional)} ${raw.direction === 'depositor' ? 'deposit' : 'loan'} for ${raw.hedge_months} months; ${raw.contract_months}-month options of size ${qty(raw.contract_size)} at strike ${fmt2(raw.strike_price)}, premium ${pctStr(raw.premium_pct)}. A ${raw.direction} **BUYS ${c.option_type.toUpperCase()} options** — never sells/writes options.`, '',
    '**Step 1 — Contracts and premium**', '', `Buy **${c.contracts} ${c.option_type} options** (${c.contracts.toFixed(1)}). Premium = ${pctStr(raw.premium_pct)} × ${c.contracts} × ${qty(raw.contract_size)} × ${raw.contract_months}/12 = **${m(c.premium)}** (prorated by the contract period — an option premium, unlike a currency-option premium, carries the contract-period fraction).`, '',
    '**Step 2 — Basis and exercise decision per scenario**', '', `Basis₀ = (100 − ${fmt2(raw.spot_rate0)}) − ${fmt2(raw.futures0)} = ${fmt2(computeBasis0(raw.spot_rate0, raw.futures0))}. ${unexpiredBasisSentence(raw.months_to_expiry, raw.months_to_transaction, computeBasis0(raw.spot_rate0, raw.futures0), c.unexpired_basis)} Each scenario's expected closing price = 100 − expected rate − unexpired basis; a ${c.option_type} is exercised when the price is ${c.option_type === 'call' ? 'ABOVE' : 'BELOW'} the strike ${fmt2(raw.strike_price)}. ${BASIS_SCEPTICISM_HOOK}`, '',
    `| Scenario | Closing price | Decision | Option gain | Net | Effective |`, `|---|---|---|---|---|---|`,
    ...scenLines, '',
    `Unlike a futures lock, the option leaves a **range** of outcomes — it caps the downside while preserving the upside if rates move favourably. ${BASIS_SCEPTICISM_HOOK}`, '',
    '**Step 3 — Advice to the board**', '', prose, '',
    `*Reconciliation: premium ${m(c.premium)} = ${pctStr(raw.premium_pct)} × ${c.contracts} × ${qty(raw.contract_size)} × ${raw.contract_months}/12 ✓*`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K3 — COLLAR: schema + model answer (Northney 6-step)
// ═══════════════════════════════════════════════════════════════════════════════════════
export function buildIrCollarSchema(raw: IrCollarInputs, c: IrCollarComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const cur = raw.currency, moneyUnit = cur;
  const s0 = c.scenarios[0];
  const comps: Component[] = [
    { component_id: 'contracts', label: 'Number of option contracts (whole)', expected_value: c.contracts, unit: 'contracts', tolerance: intTol,
      working_steps: [`= round(${qty(raw.notional)} ÷ ${qty(raw.contract_size)} × ${raw.hedge_months}/${raw.contract_months})`] },
    { component_id: 'buy_premium', label: `Premium PAID on the ${c.bought_type} bought`, expected_value: c.buy_premium, unit: moneyUnit, tolerance: moneyTol,
      depends_on: ['contracts'], recompute: (d) => irOptionPremium(raw.buy_premium_pct, d.contracts, raw.contract_size, raw.contract_months),
      working_steps: [`= ${pctStr(raw.buy_premium_pct)} × contracts × ${qty(raw.contract_size)} × ${raw.contract_months}/12`] },
    { component_id: 'sell_premium', label: `Premium RECEIVED on the ${c.sold_type} sold`, expected_value: c.sell_premium, unit: moneyUnit, tolerance: moneyTol,
      depends_on: ['contracts'], recompute: (d) => irOptionPremium(raw.sell_premium_pct, d.contracts, raw.contract_size, raw.contract_months),
      working_steps: [`= ${pctStr(raw.sell_premium_pct)} × contracts × ${qty(raw.contract_size)} × ${raw.contract_months}/12`] },
    { component_id: 'net_premium', label: 'Net premium (bought − received)', expected_value: c.net_premium, unit: moneyUnit, tolerance: moneyTol,
      depends_on: ['buy_premium', 'sell_premium'], recompute: (d) => d.buy_premium - d.sell_premium,
      working_steps: [`= premium bought − premium received`] },
    { component_id: 'closing_price', label: `Expected closing futures price (${s0.label})`, expected_value: s0.closing_price, unit: 'price', tolerance: priceTol,
      working_steps: [`= 100 − ${fmt2(s0.base_rate)} − unexpired basis ${fmt4(c.unexpired_basis)}`] },
    { component_id: 'net_outcome', label: `Net ${raw.direction === 'depositor' ? 'return' : 'cost'} (${s0.label})`, expected_value: s0.net, unit: moneyUnit, tolerance: moneyTol,
      depends_on: ['net_premium', 'closing_price'],
      recompute: (d) => {
        const bx = c.bought_type === 'call' ? d.closing_price > raw.buy_strike : d.closing_price < raw.buy_strike;
        const bpay = bx ? ((c.bought_type === 'call' ? d.closing_price - raw.buy_strike : raw.buy_strike - d.closing_price) / 100) * raw.contract_size * (raw.contract_months / 12) * c.contracts : 0;
        const sx = c.sold_type === 'call' ? d.closing_price > raw.sell_strike : d.closing_price < raw.sell_strike;
        const spay = sx ? ((c.sold_type === 'call' ? d.closing_price - raw.sell_strike : raw.sell_strike - d.closing_price) / 100) * raw.contract_size * (raw.contract_months / 12) * c.contracts : 0;
        return raw.direction === 'depositor' ? s0.mm_interest + bpay - spay - d.net_premium : s0.mm_interest - bpay + spay + d.net_premium;
      },
      working_steps: [`= money-market interest ${raw.direction === 'depositor' ? '+ bought gain − sold payout − net premium' : '− bought gain + sold payout + net premium'}`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { buy_premium: 'irh_col_buyprem', sell_premium: 'irh_col_sellprem', net_premium: 'irh_col_netprem', net_outcome: 'irh_col_net' };
  const params = { notional: raw.notional, contract_size: raw.contract_size, hedge_months: raw.hedge_months, contract_months: raw.contract_months, buy_strike: raw.buy_strike, sell_strike: raw.sell_strike, buy_premium_pct: raw.buy_premium_pct, sell_premium_pct: raw.sell_premium_pct, base_rate: s0.base_rate };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildIrCollarModelAnswer(raw: IrCollarInputs, c: IrCollarComputed, prose: string): string {
  const cur = raw.currency, m = (n: number) => amt(cur, n);
  const scenLines = c.scenarios.map((s) =>
    `| ${s.label} (base ${pctStr(s.base_rate)}) | ${fmt2(s.closing_price)} | ${s.bought_exercised ? 'yes' : 'no'} | ${s.sold_exercised ? 'yes' : 'no'} | ${m(s.net)} | ${pctStr(s.effective_rate)} |`);
  return [
    '**Interest-rate hedging — collar**', '',
    `**Assumptions:** a ${cur} ${qty(raw.notional)} ${raw.direction === 'depositor' ? 'deposit' : 'loan'} for ${raw.hedge_months} months. As a ${raw.direction}'s collar, the company **BUYS ${c.bought_type.toUpperCase()} options (strike ${fmt2(raw.buy_strike)}) and SELLS ${c.sold_type.toUpperCase()} options (strike ${fmt2(raw.sell_strike)})**.`, '',
    '**Step 1 — Options needed**', '', `Buy ${c.bought_type} (the protection) and sell ${c.sold_type} (to fund it) — the collar confines the outcome to a range.`, '',
    '**Step 2 — Number of contracts**', '', `round(${qty(raw.notional)} ÷ ${qty(raw.contract_size)} × ${raw.hedge_months}/${raw.contract_months}) = **${c.contracts} contracts** (${c.contracts.toFixed(1)}).`, '',
    '**Step 3 — Net premium**', '', `Premium paid ${m(c.buy_premium)} − premium received ${m(c.sell_premium)} = **${m(c.net_premium)}** (each prorated by the ${raw.contract_months}/12 contract period).`, '',
    '**Step 4 — Basis and expected price**', '', `Basis₀ = (100 − ${fmt2(raw.spot_rate0)}) − ${fmt2(raw.futures0)} = ${fmt2(computeBasis0(raw.spot_rate0, raw.futures0))}. ${unexpiredBasisSentence(raw.months_to_expiry, raw.months_to_transaction, computeBasis0(raw.spot_rate0, raw.futures0), c.unexpired_basis)} Expected closing price = 100 − base rate − unexpired basis. ${BASIS_SCEPTICISM_HOOK}`, '',
    '**Step 5 — Exercise decision per leg, and Step 6 — net effect**', '',
    `| Scenario | Closing price | Bought exercised | Sold exercised | Net | Effective |`, `|---|---|---|---|---|---|`,
    ...scenLines, '',
    '**Step 7 — Advice to the board**', '', prose, '',
    `*Reconciliation: net premium ${m(c.buy_premium)} − ${m(c.sell_premium)} = ${m(c.net_premium)} ✓*`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K4 — SWAP: schema + model answer (Style A)
// ═══════════════════════════════════════════════════════════════════════════════════════
export function buildIrSwapSchema(raw: IrSwapInputs, c: IrSwapComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const comps: Component[] = [
    { component_id: 'fixed_diff', label: 'Fixed-rate differential', expected_value: c.fixed_diff, unit: '%', tolerance: rateTol,
      working_steps: [`= |${fmt2(raw.a_fixed)} − ${fmt2(raw.b_fixed)}|`] },
    { component_id: 'floating_diff', label: 'Floating-rate differential', expected_value: c.floating_diff, unit: '%', tolerance: rateTol,
      working_steps: [`= |${fmt2(raw.a_floating_margin)} − ${fmt2(raw.b_floating_margin)}|`] },
    { component_id: 'total_gain', label: 'Total comparative-advantage gain', expected_value: c.total_gain, unit: '%', tolerance: rateTol,
      depends_on: ['fixed_diff', 'floating_diff'], recompute: (d) => d.fixed_diff - d.floating_diff,
      working_steps: [`= fixed differential − floating differential`] },
    { component_id: 'net_gain', label: 'Net gain after the bank fee', expected_value: c.net_gain, unit: '%', tolerance: rateTol,
      depends_on: ['total_gain'], recompute: (d) => d.total_gain - raw.bank_fee_total,
      working_steps: [`= total gain − bank fee ${pctStr(raw.bank_fee_total)}`] },
    { component_id: 'a_benefit', label: `${raw.party_a}'s benefit`, expected_value: c.a_benefit, unit: '%', tolerance: rateTol,
      depends_on: ['net_gain'], recompute: (d) => d.net_gain * raw.savings_split,
      working_steps: [`= net gain × ${(raw.savings_split * 100).toFixed(0)}%`] },
    { component_id: 'b_benefit', label: `${raw.party_b}'s benefit`, expected_value: c.b_benefit, unit: '%', tolerance: rateTol,
      depends_on: ['net_gain'], recompute: (d) => d.net_gain * (1 - raw.savings_split),
      working_steps: [`= net gain × ${((1 - raw.savings_split) * 100).toFixed(0)}%`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { total_gain: 'irh_swap_gain', net_gain: 'irh_swap_netgain', a_benefit: 'irh_swap_abenefit', b_benefit: 'irh_swap_bbenefit' };
  const params = { a_fixed: raw.a_fixed, a_floating_margin: raw.a_floating_margin, b_fixed: raw.b_fixed, b_floating_margin: raw.b_floating_margin, bank_fee_total: raw.bank_fee_total, savings_split: raw.savings_split };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildIrSwapModelAnswer(raw: IrSwapInputs, c: IrSwapComputed, prose: string): string {
  const aResult = raw.a_wants === 'floating' ? `LIBOR + ${pctStr(c.a_effective_floating_margin!)}` : pctStr(c.a_effective_fixed!);
  const bResult = raw.a_wants === 'floating' ? pctStr(c.b_effective_fixed!) : `LIBOR + ${pctStr(c.b_effective_floating_margin!)}`;
  return [
    '**Interest-rate hedging — swap (comparative advantage)**', '',
    `**Assumptions:** ${raw.party_a} can borrow fixed at ${pctStr(raw.a_fixed)} or floating at LIBOR + ${pctStr(raw.a_floating_margin)}; ${raw.party_b} fixed at ${pctStr(raw.b_fixed)} or floating at LIBOR + ${pctStr(raw.b_floating_margin)}. ${raw.party_a} wants ${raw.a_wants}, ${raw.party_b} wants the other. A bank intermediates for ${pctStr(raw.bank_fee_total)}.`, '',
    '**Step 1 — The differentials**', '', `Fixed differential = ${pctStr(c.fixed_diff)}; floating differential = ${pctStr(c.floating_diff)}.`, '',
    '**Step 2 — The saving to share**', '', `Total gain = ${pctStr(c.fixed_diff)} − ${pctStr(c.floating_diff)} = **${pctStr(c.total_gain)}**; after the bank's ${pctStr(raw.bank_fee_total)} fee, net gain = **${pctStr(c.net_gain)}**.`, '',
    "**Step 3 — Each party's benefit and effective rate**", '', `${raw.party_a}: ${pctStr(c.a_benefit)} → effective **${aResult}**. ${raw.party_b}: ${pctStr(c.b_benefit)} → effective **${bResult}**.`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: ${pctStr(c.fixed_diff)} − ${pctStr(c.floating_diff)} − ${pctStr(raw.bank_fee_total)} = ${pctStr(c.net_gain)}, split ${(raw.savings_split * 100).toFixed(0)}/${((1 - raw.savings_split) * 100).toFixed(0)} ✓*`,
  ].join('\n');
}
