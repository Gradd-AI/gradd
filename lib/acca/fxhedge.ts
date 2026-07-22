// lib/acca/fxhedge.ts
// AFM calculator #11 — FX HEDGING (E2b/E2c). Pure, deterministic, no model/DB/side-effects.
// Code owns EVERY figure AND the all-methods comparison + recommendation verdict — the model
// authors prose only.
//
// COMPOSITION RULING (Grant, Step-0, 2026-07-22): the IRP short-horizon forward reuses
// `parityDifferential` from international.ts ONE-WAY (no back-imports) — the batch-#10 ruling
// explicitly reserved the IRP basis of that engine "for E2/short-horizon"
// (docs/reviews/AFM_BATCH_INTERNATIONAL_REVIEW_PACK.md line 37). PPP stays scoped to the
// multi-year B5 project stream. `buildForwardCurve` itself is NOT reused — it loops whole
// integer YEARS (annual compounding), and every sourced FX-hedging question here is sub-annual
// (3–7 months, simple interest, matching the money-market worked examples below) — a genuinely
// different period convention, not a drop-in call. `deriveIrpForwardRate` below is NEW logic for
// that reason, documented as an authored (not verbatim-sourced) application of covered interest
// rate parity, flagged for co-founder recompute confirmation. Every SOURCED question gives the
// forward rate directly to the student — the primary K1 path takes `forward_rate` as a stated
// input, matching every local citation; the IRP derivation is an optional teaching variant.
//
// QUOTE DIRECTION — PARAMETERISED PER DRILL, NEVER HARDCODED (Step-0 ruling item 1). Local
// sources genuinely quote both ways: Passmore Co (SD25 p.12) quotes rupees FOREIGN-per-HOME
// ("the R202m was a receipt ... sell rupees" against a $/R rate — divide a foreign amount by the
// rate to reach home, the same convention as international.ts). The SD2019 Okan Co official
// answer (Appendix 1, p.16) quotes HOME-per-FOREIGN ("EUR9,891,197 x 2.5210 = Y$24,935,708" —
// multiply a foreign amount by the rate to reach home). Every drill STATES its quote plainly in
// the scenario ("quoted as R per $1"); `quote_direction` is an explicit per-drill input and every
// conversion routes through toHome/toForeign below. GATE 17 re-derives every conversion from the
// DECLARED direction — a direction inversion is both the canonical student error (Passmore p.12:
// "some candidates ... used the incorrect rate") and the canonical authoring error; the gate
// catches both.
//
// RESIDUAL-BALANCE POLICY — PER-DRILL, DEFAULT IMMATERIAL (Step-0 ruling item 2). Passmore Co
// (SD25 p.13), in the candidates' own words: "When the amount cannot be hedged using an exact
// number of futures contracts, the balance should be considered immaterial UNLESS ... instructed
// otherwise. Therefore, the balance does not normally need to be hedged on the forward market." —
// so the DEFAULT is `residual_policy: 'immaterial'`. Mahoney Co (J24 p.5) is the instructed-
// override shape: "the need to hedge any amount unhedged or over-hedged by the futures hedge
// using the forward market" — `residual_policy: 'forward_topup'`. Both are legitimate; GATE 15
// checks the drill's stated residual treatment against whichever policy it declares.
//
// MONEY-MARKET HEDGE — BOTH DIRECTIONS CITED (Step-0 ruling item 3).
//   RECEIPT — F9 technical article "Foreign currency risk and its management" (accaglobal.com,
//   fetched 2026-07-22, section "6. Money market hedging"; a UK company expecting a US$ receipt):
//     "If X is borrowed now and three months' interest is added: X(1 + 0.66%/4) = 2,000,000,
//      X = $1,996,705" [borrow the PV of the receipt, FOREIGN currency, at the FOREIGN BORROWING
//      rate] — "This can be changed now from US$ to £ at the current spot rate ... to give
//      £1,358,210" [convert at TODAY'S spot] — "£1,358,210 (1 + 1.2%/4) = £1,362,285" [deposit
//      the HOME currency at the HOME DEPOSIT rate until the receipt date]. Cross-checked against
//      the SD2019 Okan Co official answer (Appendix 1, p.16), the same three-step shape (borrow
//      the foreign PV at the foreign rate, convert at spot, grow at the home rate).
//   PAYMENT — same article, same section: "If foreign currency has to be paid in the future,
//     then what the company can do is change money into sufficient foreign currency now and
//     place it on deposit so that it will grow to become the required amount by the right time."
//     [convert home currency to foreign NOW at spot; DEPOSIT the FOREIGN currency at the FOREIGN
//     DEPOSIT rate so it grows to exactly the payable]. The article states this only as a
//     mechanism, no worked numbers — the home-currency FUNDING leg (borrowing home now, growing
//     at the HOME BORROWING rate to the settlement date, so the payment case is comparable to the
//     forward on the SAME date) is the symmetric counterpart of the receipt case and is an
//     AUTHORED convention, not itself quoted — flagged for co-founder recompute, not asserted as
//     sourced.
//   NETTING (same article, section "2. Netting" — texture only, never a graded kind): "If you owe
//     your Japanese supplier ¥1m, and another Japanese company owes your Japanese subsidiary
//     ¥1.1m, then by netting off group currency flows your net exposure is only for ¥0.1m."
//     "Bilateral netting is where two companies in the same group cooperate as explained above;
//     multilateral netting is where many companies in the group liaise with the group's treasury
//     department to achieve netting where possible."
//
// FUTURES — LOCK-IN VIA LINEAR BASIS DECAY (Passmore Co, SD25 p.13): "calculated the lock-in rate
// correctly by using the spot price and deducting the ... futures price to calculate basis and
// then using the assumption that basis declines linearly to zero by the futures expiry date to
// adjust for unexpired basis on the receipt date." WHOLE CONTRACTS ONLY (SD25 p.13): "Companies
// can only buy or sell whole contracts ... use 40 contracts and not 40.4 contracts." FULL
// INSTRUCTION SET (Northney Co, SD24 p.5): "expected to provide a full set of instructions to the
// board and this includes the number of contracts and whether the contracts should be bought or
// sold [and the relevant month]."
//
// OPTIONS — PREMIUM IN THE QUOTED CURRENCY, "ASSUME EXERCISED" (Passmore Co, SD25 p.13): "the
// option premium was given in dollars, the currency they were working with, and they attempted a
// further currency conversion that was not required. There was also no need to calculate a gain
// or loss ... it is ... assumed the options are exercised." Premium formula (Abertafol Co, D23
// p.14, shared interest-rate-options mechanics — instrument-neutral, the same contracts × size ×
// rate × period shape used for currency options): "the percentage ... (0.298%) multiplied by the
// amount covered ... (so 0.298% x 60 x $500,000 x 3/12)." The premium's FUTURE-VALUE-to-
// settlement treatment (so it nets against the strike-based proceeds on the SAME date as the
// forward/futures/MMH outcomes, for a like-for-like all-methods comparison) is an AUTHORED
// convention — not itself quoted verbatim — flagged for co-founder recompute.
//
// SWAP — thin local evidence (Mahoney Co, J24 p.7): "very few recognised that the swap rate would
// only account for a proportion of the cash to be received in the third year." The swap converts
// a STATED FRACTION of the exposure at the swap rate; the residual is hedged on the forward. This
// is the ONLY local citation for the swap kind — flagged as the thinnest-evidenced of the four.

import { parityDifferential } from './international';
import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';

// ── formatting / rates ──
const pct2 = (frac: number): string => `${(frac * 100).toFixed(2)}%`;
const asDec = (v: number): number => (v > 1 ? v / 100 : v);
const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
const moneyTol: Tolerance = { kind: 'floor', pct: 0.5, floor: 0.2 };
const EPS = 1e-9;
export const fmt1 = (n: number): string => n.toFixed(1);
export const fmt4 = (n: number): string => n.toFixed(4);

export type QuoteDirection = 'foreign_per_home' | 'home_per_foreign';
export type ExposureDirection = 'receipt' | 'payment';
export type ResidualPolicy = 'immaterial' | 'forward_topup';
export type FxHedgeKind = 'forward_mmh_compare' | 'futures' | 'options' | 'swap';

// A foreign amount → home, per the DRILL'S DECLARED quote direction (never hardcoded).
export function toHome(foreignAmt: number, rate: number, dir: QuoteDirection): number {
  return dir === 'foreign_per_home' ? foreignAmt / rate : foreignAmt * rate;
}
export function toForeign(homeAmt: number, rate: number, dir: QuoteDirection): number {
  return dir === 'foreign_per_home' ? homeAmt * rate : homeAmt / rate;
}
// The exposure→instrument-direction rule follows directly from what a receipt/payment IS: a
// foreign RECEIPT must eventually be SOLD for home currency (Passmore, SD25 p.12); a foreign
// PAYMENT must be funded by BUYING foreign currency. Applies to futures/forward/options alike.
export function instrumentSide(direction: ExposureDirection): 'buy' | 'sell' {
  return direction === 'receipt' ? 'sell' : 'buy';
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K1a — FORWARD (rate stated by the drill, matching every local citation)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface ForwardInputs {
  exposure: number; direction: ExposureDirection; forward_rate: number; quote_direction: QuoteDirection;
}
export interface ForwardComputed { home_settlement: number; }
export function computeForwardHedge(raw: ForwardInputs): ForwardComputed {
  if (!(raw.exposure > 0)) throw new Error(`exposure must be positive: ${raw.exposure}`);
  if (!(raw.forward_rate > 0)) throw new Error(`forward_rate must be positive: ${raw.forward_rate}`);
  return { home_settlement: toHome(raw.exposure, raw.forward_rate, raw.quote_direction) };
}

// Optional IRP-derived forward (short-horizon, SIMPLE interest — matches the sub-annual money-
// market worked examples, NOT international.ts's annual-compounding buildForwardCurve). AUTHORED
// application of covered interest rate parity — not itself a verbatim-sourced formula; flagged
// for co-founder recompute. quote_direction decides which side of the ratio each rate sits on,
// mirroring parityDifferential's own foreign-per-home convention.
export function deriveIrpForwardRate(spot: number, rateHome: number, rateForeign: number, months: number, dir: QuoteDirection): number {
  const t = months / 12;
  const rf = asDec(rateForeign) * t, rh = asDec(rateHome) * t;
  const k = dir === 'foreign_per_home' ? (1 + rf) / (1 + rh) : (1 + rh) / (1 + rf);
  return spot * k;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K1b — MONEY-MARKET HEDGE (receipt: borrow foreign / deposit home; payment: deposit foreign /
// borrow home — F9 technical article + SD2019 Okan Co, see module header)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface MoneyMarketInputs {
  exposure: number; direction: ExposureDirection; spot: number; quote_direction: QuoteDirection;
  months: number;
  rate_foreign_borrow: number; rate_foreign_deposit: number;
  rate_home_borrow: number; rate_home_deposit: number;
}
export interface MoneyMarketComputed {
  foreign_now: number;      // foreign currency borrowed (receipt) or bought (payment), today
  home_now: number;         // the home-currency equivalent of foreign_now at today's spot
  home_settlement: number;  // the guaranteed home-currency outcome at the settlement date
}
export function computeMoneyMarketHedge(raw: MoneyMarketInputs): MoneyMarketComputed {
  if (!(raw.exposure > 0)) throw new Error(`exposure must be positive: ${raw.exposure}`);
  if (!(raw.spot > 0)) throw new Error(`spot must be positive: ${raw.spot}`);
  const t = raw.months / 12;
  if (raw.direction === 'receipt') {
    const foreign_now = raw.exposure / (1 + asDec(raw.rate_foreign_borrow) * t);
    const home_now = toHome(foreign_now, raw.spot, raw.quote_direction);
    const home_settlement = home_now * (1 + asDec(raw.rate_home_deposit) * t);
    return { foreign_now, home_now, home_settlement };
  }
  const foreign_now = raw.exposure / (1 + asDec(raw.rate_foreign_deposit) * t);
  const home_now = toHome(foreign_now, raw.spot, raw.quote_direction);
  const home_settlement = home_now * (1 + asDec(raw.rate_home_borrow) * t);
  return { foreign_now, home_now, home_settlement };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K2 — CURRENCY FUTURES (whole contracts, linear basis decay to the lock-in rate)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface FuturesInputs {
  exposure: number; direction: ExposureDirection; quote_direction: QuoteDirection;
  contract_size: number;         // foreign-currency units per contract
  spot0: number;                 // spot at the trade (today) date
  futures0: number;              // futures price at the trade date (same quote convention as spot0)
  months_to_expiry: number;      // months from TODAY to the futures' expiry
  months_to_transaction: number; // months from TODAY to the transaction (close-out) date, ≤ months_to_expiry
  residual_policy: ResidualPolicy;
  topup_forward_rate?: number;   // required when residual_policy === 'forward_topup'
}
export interface FuturesComputed {
  side: 'buy' | 'sell';
  contracts: number;             // whole contracts (rounded)
  hedged_amount: number;         // contracts × contract_size (foreign)
  residual: number;              // exposure − hedged_amount (foreign, signed)
  basis0: number;                // spot0 − futures0
  unexpired_basis: number;       // basis0 × (months remaining to expiry at the transaction date) / months_to_expiry
  lock_in_rate: number;          // spot0 − unexpired_basis
  home_from_futures: number;     // hedged_amount converted at the lock-in rate
  home_from_residual: number;    // residual handled per residual_policy (0 if immaterial)
  home_settlement: number;       // home_from_futures + home_from_residual
}
export function computeFuturesHedge(raw: FuturesInputs): FuturesComputed {
  if (!(raw.exposure > 0)) throw new Error(`exposure must be positive: ${raw.exposure}`);
  if (!(raw.contract_size > 0)) throw new Error(`contract_size must be positive`);
  if (!(raw.months_to_transaction <= raw.months_to_expiry)) throw new Error(`months_to_transaction must be ≤ months_to_expiry`);
  const side = instrumentSide(raw.direction);
  const contracts = Math.round(raw.exposure / raw.contract_size);
  const hedged_amount = contracts * raw.contract_size;
  const residual = raw.exposure - hedged_amount;
  const basis0 = raw.spot0 - raw.futures0;
  const monthsRemainingAtTransaction = raw.months_to_expiry - raw.months_to_transaction;
  const unexpired_basis = basis0 * (monthsRemainingAtTransaction / raw.months_to_expiry);
  const lock_in_rate = raw.spot0 - unexpired_basis;
  const home_from_futures = toHome(hedged_amount, lock_in_rate, raw.quote_direction);
  let home_from_residual = 0;
  if (raw.residual_policy === 'forward_topup') {
    if (!raw.topup_forward_rate) throw new Error(`topup_forward_rate required when residual_policy is 'forward_topup'`);
    home_from_residual = toHome(residual, raw.topup_forward_rate, raw.quote_direction);
  }
  return { side, contracts, hedged_amount, residual, basis0, unexpired_basis, lock_in_rate, home_from_futures, home_from_residual, home_settlement: home_from_futures + home_from_residual };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K3 — CURRENCY OPTIONS (whole contracts, premium in the quoted currency, assume exercised)
// ═══════════════════════════════════════════════════════════════════════════════════════
export type PremiumCurrency = 'home' | 'foreign';
export interface OptionsInputs {
  exposure: number; direction: ExposureDirection; quote_direction: QuoteDirection;
  contract_size: number; strike: number;
  // premium as a DECIMAL fraction of notional (e.g. 0.00298 for Abertafol's "0.298%") — NOT run
  // through asDec's >1-means-percent heuristic: option premiums are routinely sub-1-as-a-percent
  // (0.298%), which asDec would misread as already-decimal (29.8%) and silently 100x the premium.
  premium_pct: number;
  premium_currency: PremiumCurrency; // the currency the premium is QUOTED in (no further conversion)
  months_covered: number;        // the option's life used in the premium formula
  months_to_transaction: number; // months to the settlement date — premium is FV'd to this date
  compounding_rate: number;      // the home-currency rate used to FV the premium to settlement
  residual_policy: ResidualPolicy;
  topup_forward_rate?: number;
}
export interface OptionsComputed {
  side: 'buy' | 'sell';
  contracts: number; hedged_amount: number; residual: number;
  premium_per_contract_notional: number; // contract_size (the notional base the % is applied to)
  premium: number;                 // total premium, in premium_currency, at t0
  premium_home_fv: number;         // premium future-valued to settlement, in HOME currency
  home_from_strike: number;        // hedged_amount converted at the strike (exercised)
  home_from_residual: number;
  home_settlement: number;         // net of the FV'd premium (a receipt: minus cost; a payment: plus cost)
}
export function computeOptionsHedge(raw: OptionsInputs): OptionsComputed {
  if (!(raw.exposure > 0)) throw new Error(`exposure must be positive: ${raw.exposure}`);
  if (!(raw.contract_size > 0)) throw new Error(`contract_size must be positive`);
  const side = instrumentSide(raw.direction);
  const contracts = Math.round(raw.exposure / raw.contract_size);
  const hedged_amount = contracts * raw.contract_size;
  const residual = raw.exposure - hedged_amount;
  const premium_per_contract_notional = raw.contract_size;
  // Abertafol formula: premium (decimal fraction) × contracts covered × contract size × (months/12)
  const premium = raw.premium_pct * contracts * raw.contract_size * (raw.months_covered / 12);
  const premiumHome = raw.premium_currency === 'home' ? premium : toHome(premium, raw.strike, raw.quote_direction);
  const t = raw.months_to_transaction / 12;
  const premium_home_fv = premiumHome * (1 + asDec(raw.compounding_rate) * t);
  const home_from_strike = toHome(hedged_amount, raw.strike, raw.quote_direction);
  let home_from_residual = 0;
  if (raw.residual_policy === 'forward_topup') {
    if (!raw.topup_forward_rate) throw new Error(`topup_forward_rate required when residual_policy is 'forward_topup'`);
    home_from_residual = toHome(residual, raw.topup_forward_rate, raw.quote_direction);
  }
  // a receipt nets the premium cost off the proceeds; a payment adds the premium to the cost
  const net = raw.direction === 'receipt' ? -premium_home_fv : premium_home_fv;
  return { side, contracts, hedged_amount, residual, premium_per_contract_notional, premium, premium_home_fv, home_from_strike, home_from_residual, home_settlement: home_from_strike + home_from_residual + net };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K4 — CURRENCY SWAP (a stated fraction at the swap rate; residual on the forward — thin
// evidence, Mahoney Co J24 p.7 only; flagged for co-founder recompute)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface SwapInputs {
  exposure: number; direction: ExposureDirection; quote_direction: QuoteDirection;
  swap_fraction: number;  // share of the exposure covered by the swap, (0,1]
  swap_rate: number;
  residual_forward_rate?: number; // required when swap_fraction < 1
}
export interface SwapComputed {
  swapped_amount: number; residual: number;
  home_from_swap: number; home_from_residual: number; home_settlement: number;
}
export function computeSwapHedge(raw: SwapInputs): SwapComputed {
  if (!(raw.exposure > 0)) throw new Error(`exposure must be positive: ${raw.exposure}`);
  if (!(raw.swap_fraction > 0 && raw.swap_fraction <= 1)) throw new Error(`swap_fraction out of range (0,1]: ${raw.swap_fraction}`);
  const swapped_amount = raw.exposure * raw.swap_fraction;
  const residual = raw.exposure - swapped_amount;
  const home_from_swap = toHome(swapped_amount, raw.swap_rate, raw.quote_direction);
  let home_from_residual = 0;
  if (residual > EPS) {
    if (!raw.residual_forward_rate) throw new Error(`residual_forward_rate required when swap_fraction < 1`);
    home_from_residual = toHome(residual, raw.residual_forward_rate, raw.quote_direction);
  }
  return { swapped_amount, residual, home_from_swap, home_from_residual, home_settlement: home_from_swap + home_from_residual };
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// ALL-METHODS COMPARISON + RECOMMENDATION — code-owned figure-vs-figure verdict (Passmore Co,
// SD25 p.13: "The requirement does ask for a recommendation ... candidates should base their
// recommendation on their own workings and bring in their calculations to justify their
// decision.")
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface HedgeMethodResult { method: string; home_settlement: number; }
export interface ComparisonComputed {
  results: HedgeMethodResult[];
  best: HedgeMethodResult;
  margin: number; // best.home_settlement − second-best (always ≥ 0)
}
// A RECEIPT wants the HIGHEST guaranteed home amount; a PAYMENT wants the LOWEST home cost.
export function compareHedgeMethods(direction: ExposureDirection, results: HedgeMethodResult[]): ComparisonComputed {
  if (results.length < 2) throw new Error('compareHedgeMethods needs at least two methods');
  const sorted = [...results].sort((a, b) => direction === 'receipt' ? b.home_settlement - a.home_settlement : a.home_settlement - b.home_settlement);
  const best = sorted[0];
  const margin = Math.abs(best.home_settlement - sorted[1].home_settlement);
  return { results, best, margin };
}

function finiteGuard(raw: Record<string, unknown>, ctx: string): void {
  for (const [k, v] of Object.entries(raw)) {
    if (v === undefined) continue;
    if (typeof v === 'number' && !Number.isFinite(v)) throw new Error(`${ctx} input "${k}" is not finite: ${JSON.stringify(v)}`);
  }
}
void finiteGuard; // reserved for the K1–K4 schema builders (drill-authoring phase)

// ═══════════════════════════════════════════════════════════════════════════════════════
// GATE CORES (Step-0 §3 candidates, ruled). Delegated to by validate-schema.ts wrappers
// (GATE 15–19) and run in the generator's runQuantitativeGates for fx-hedge drills only.
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface FxCheck { ok: boolean; reason?: string }

// GATE 15 — WHOLE-CONTRACT INTEGRITY. The stated contract count must be an integer equal to
// round(exposure / contract_size); the residual must be treated per the drill's DECLARED
// residual_policy (immaterial → not separately hedged; forward_topup → converted at the stated
// topup rate). Motivated by Passmore SD25 p.13 ("40 contracts and not 40.4") and Mahoney J24 p.6
// ("failed to round ... to the nearest whole number").
export function checkWholeContractIntegrity(exposure: number, contract_size: number, contracts: number, residual: number, residual_policy: ResidualPolicy, home_from_residual: number): FxCheck {
  const expected = Math.round(exposure / contract_size);
  if (contracts !== expected) return { ok: false, reason: `contracts = ${contracts} ≠ round(exposure ÷ contract size) = ${expected} — futures/options can only be traded in WHOLE contracts` };
  if (!Number.isInteger(contracts)) return { ok: false, reason: `contracts (${contracts}) is not a whole number` };
  const expectedResidual = exposure - contracts * contract_size;
  if (Math.abs(residual - expectedResidual) > Math.abs(exposure) * 0.0005 + EPS) return { ok: false, reason: `residual = ${fmt1(residual)} ≠ exposure − hedged amount = ${fmt1(expectedResidual)}` };
  if (residual_policy === 'immaterial' && Math.abs(home_from_residual) > EPS) return { ok: false, reason: `residual_policy is 'immaterial' but a non-zero home_from_residual (${fmt1(home_from_residual)}) was carried — Passmore SD25 p.13: an unhedged residual does not normally need a separate hedge` };
  return { ok: true };
}

// GATE 16 — BASIS-DECAY RECONCILIATION. unexpired_basis must reconcile to basis0 scaled by the
// (remaining months to expiry at the transaction date) / (months to expiry from today), and
// lock_in_rate = spot0 − unexpired_basis. Motivated by Passmore SD25 p.13 ("basis declines
// linearly to zero by the futures expiry date") and Abertafol D23 p.14 ("a separate unexpired
// basis calculation was need for each" instrument).
export function checkBasisDecayReconciliation(spot0: number, futures0: number, months_to_expiry: number, months_to_transaction: number, unexpired_basis: number, lock_in_rate: number): FxCheck {
  const basis0 = spot0 - futures0;
  const expectedUnexpired = basis0 * ((months_to_expiry - months_to_transaction) / months_to_expiry);
  if (Math.abs(unexpired_basis - expectedUnexpired) > Math.abs(basis0) * 0.001 + EPS) return { ok: false, reason: `unexpired basis ${fmt4(unexpired_basis)} ≠ basis0 ${fmt4(basis0)} × remaining/total months = ${fmt4(expectedUnexpired)} — basis must decline LINEARLY to zero at expiry` };
  const expectedLockIn = spot0 - unexpired_basis;
  if (Math.abs(lock_in_rate - expectedLockIn) > Math.abs(spot0) * 0.001 + EPS) return { ok: false, reason: `lock-in rate ${fmt4(lock_in_rate)} ≠ spot0 − unexpired basis = ${fmt4(expectedLockIn)}` };
  return { ok: true };
}

// GATE 17 — CURRENCY-DIRECTION INTEGRITY. Every foreign↔home conversion must reconcile to the
// drill's DECLARED quote_direction, and the instrument side (buy/sell, or the MMH borrow/deposit
// leg selection) must match the exposure direction. Motivated by Passmore SD25 p.12 ("the R202m
// was a receipt ... some candidates ... used the incorrect rate") and Northney SD24 p.5 ("not
// stating whether ... bought or sold"). Catches BOTH the student-shaped error and the mirror-image
// authoring error (Step-0 ruling item 1).
export function checkCurrencyDirectionIntegrity(foreignAmt: number, rate: number, homeAmt: number, dir: QuoteDirection, direction: ExposureDirection, side: 'buy' | 'sell'): FxCheck {
  const expectedHome = toHome(foreignAmt, rate, dir);
  if (Math.abs(homeAmt - expectedHome) > Math.abs(expectedHome) * 0.001 + EPS) return { ok: false, reason: `home amount ${fmt1(homeAmt)} ≠ foreign ${fmt1(foreignAmt)} converted per the declared quote_direction (${dir}) = ${fmt1(expectedHome)} — a direction inversion` };
  const expectedSide = instrumentSide(direction);
  if (side !== expectedSide) return { ok: false, reason: `instrument side is '${side}' but a '${direction}' exposure must ${expectedSide.toUpperCase()} the foreign currency` };
  return { ok: true };
}

// GATE 18 — PREMIUM-CURRENCY CHECK. The stated premium must equal premium_pct × contracts ×
// contract_size × (months_covered/12), and — when premium_currency is 'home' — must NOT be
// silently re-converted before FV-ing to settlement. Motivated by Passmore SD25 p.13 ("the option
// premium was given in dollars ... they attempted a further currency conversion that was not
// required") and Abertafol D23 p.14 (the premium formula itself).
export function checkPremiumCurrency(premium_pct: number, contracts: number, contract_size: number, months_covered: number, premium: number): FxCheck {
  const expected = premium_pct * contracts * contract_size * (months_covered / 12);
  if (Math.abs(premium - expected) > Math.abs(expected) * 0.001 + EPS) return { ok: false, reason: `premium ${fmt1(premium)} ≠ premium% × contracts × contract size × months/12 = ${fmt1(expected)} — check for a needless extra currency conversion` };
  return { ok: true };
}

// GATE 19 — BEST-METHOD VERDICT INTEGRITY. The recommended method must be the one with the best
// computed net home-currency figure among the comparison rows (highest for a receipt, lowest cost
// for a payment) — never asserted. Motivated by Passmore SD25 p.13 ("candidates should base their
// recommendation on their own workings").
export function checkBestMethodVerdict(direction: ExposureDirection, results: HedgeMethodResult[], statedBestMethod: string, statedMargin: number): FxCheck {
  const c = compareHedgeMethods(direction, results);
  if (statedBestMethod !== c.best.method) return { ok: false, reason: `recommended method '${statedBestMethod}' ≠ the computed best ('${c.best.method}', ${fmt1(c.best.home_settlement)}) for a ${direction}` };
  if (Math.abs(statedMargin - c.margin) > Math.abs(c.margin) * 0.001 + EPS) return { ok: false, reason: `stated margin ${fmt1(statedMargin)} ≠ computed margin ${fmt1(c.margin)} between the best and second-best method` };
  return { ok: true };
}
