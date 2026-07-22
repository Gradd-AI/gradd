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
import { money, normaliseCurrency, type SerializedSchema } from './valuation';
import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';

export { normaliseCurrency };

// ── formatting / rates ──
const pct2 = (frac: number): string => `${(frac * 100).toFixed(2)}%`;
const asDec = (v: number): number => (v > 1 ? v / 100 : v);
const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });
// PLAIN relative tolerance for every money-shaped figure in this family — never a floor. The
// floor-tolerance kind exists (international.ts) specifically to protect a figure that can be
// LEGITIMATELY near-zero (a near-nil additional tax). No fx-hedge money component is ever
// legitimately near-zero — a hedge outcome is always a real conversion of a real exposure — so a
// floor only does harm here: a modest, genuine outcome (a single-contract hedge can easily convert
// to under 2m in home currency) would sit entirely inside a 0.2-floor band, silently swallowing a
// real GATE-3 seeded-OFR error (surfaced during authoring, 2026-07-22, on both home_from_futures
// and the option premium — both structurally small figures relative to international.ts's typical
// multi-million cash flows the floor was calibrated for).
const moneyTol: Tolerance = { kind: 'relative', pct: 0.5 };
// ABSOLUTE tolerance for a rate-shaped figure that is a SUM of a large given constant (spot0) and a
// small graded/perturbable term (the basis adjustment) — e.g. lock_in_rate = spot0 − unexpired_basis.
// A relative band on the SUM barely moves when only the small term is perturbed (the large constant
// dominates), so a genuine upstream error can hide inside a relative tolerance; a tight absolute band
// bounds the deviation directly, regardless of which term contributed it. Matches house doctrine for
// rate-like figures (BSOP's d1/d2 ±0.05, N(d) ±0.01) — never a loose relative band on a rate.
const rateTol: Tolerance = { kind: 'absolute', value: 0.01 };
// Plain relative tolerance for a money figure that is reliably non-trivial in magnitude (an option
// premium is never legitimately near-zero) — moneyTol's 0.2 floor was calibrated for the international
// family's multi-million-scale figures (where a near-nil additional tax needs protecting) and would
// swallow a genuine error in a premium figure that is naturally sub-1 in millions.
const premiumTol: Tolerance = { kind: 'relative', pct: 1 };
const EPS = 1e-9;
export const fmt1 = (n: number): string => n.toFixed(1);
export const fmt4 = (n: number): string => n.toFixed(4);

export type QuoteDirection = 'foreign_per_home' | 'home_per_foreign';
export type ExposureDirection = 'receipt' | 'payment';
// ⚠ KNOWN INTERACTION (surfaced during authoring, 2026-07-22 — same class as the international
// family's documented floor-tolerance × seeded-OFR interaction). Under 'forward_topup', home_settlement
// = home_from_futures + home_from_residual, both fed by the shared root `contracts` but converting at
// TWO DIFFERENT rates (lock_in_rate vs topup_forward_rate). If those two rates sit close together, a
// GATE-3 seeded error in `contracts` redistributes exposure between the two legs without moving the
// TOTAL much — a near-cancellation the generic seeded-OFR proof can misread as 'correct' rather than
// 'carried'. Not a schema bug: keep the topup forward rate MEANINGFULLY different from the lock-in
// rate (a real forward legitimately differs from a futures lock-in) when authoring a forward_topup drill.
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

// ═══════════════════════════════════════════════════════════════════════════════════════
// SERIALIZATION — mirrors valuation.ts's private toSerialized (same SerializedSchema shape,
// duplicated locally per the established per-family convention, e.g. apv.ts/bsop.ts/credit.ts).
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
const intTol: Tolerance = { kind: 'absolute', value: 0.5 };
const t2 = (raw: { months: number }): number => raw.months / 12;

// ═══════════════════════════════════════════════════════════════════════════════════════
// K1 — forward_mmh_compare drill (forward, stated rate, vs the money-market hedge)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface ForwardMmhCompareInputs {
  currency_home: string; currency_foreign: string;
  exposure: number; direction: ExposureDirection; quote_direction: QuoteDirection;
  forward_rate: number; spot: number; months: number;
  rate_foreign_borrow: number; rate_foreign_deposit: number;
  rate_home_borrow: number; rate_home_deposit: number;
}
export interface ForwardMmhCompareComputed {
  forward: ForwardComputed; mmh: MoneyMarketComputed; comparison: ComparisonComputed;
}
export function computeForwardMmhCompare(raw: ForwardMmhCompareInputs): ForwardMmhCompareComputed {
  const forward = computeForwardHedge({ exposure: raw.exposure, direction: raw.direction, forward_rate: raw.forward_rate, quote_direction: raw.quote_direction });
  const mmh = computeMoneyMarketHedge(raw);
  const comparison = compareHedgeMethods(raw.direction, [
    { method: 'the forward', home_settlement: forward.home_settlement },
    { method: 'the money-market hedge', home_settlement: mmh.home_settlement },
  ]);
  return { forward, mmh, comparison };
}
export function buildForwardMmhCompareSchema(raw: ForwardMmhCompareInputs, c: ForwardMmhCompareComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const home = raw.currency_home, foreign = raw.currency_foreign, homeUnit = `${home}m`, foreignUnit = `${foreign}m`;
  const t = t2(raw);
  const borrowLeg = raw.direction === 'receipt' ? 'rate_foreign_borrow' : 'rate_foreign_deposit';
  const growLeg = raw.direction === 'receipt' ? raw.rate_home_deposit : raw.rate_home_borrow;
  const comps: Component[] = [
    { component_id: 'forward_home', label: `Guaranteed ${home} outcome under the forward hedge`, expected_value: c.forward.home_settlement, unit: homeUnit, tolerance: moneyTol,
      working_steps: [`= ${foreign} ${fmt1(raw.exposure)} converted at the forward rate ${fmt4(raw.forward_rate)}`] },
    { component_id: 'mmh_foreign_now', label: `Foreign currency ${raw.direction === 'receipt' ? 'borrowed' : 'bought'} today (money-market hedge)`, expected_value: c.mmh.foreign_now, unit: foreignUnit, tolerance: moneyTol,
      working_steps: [`= ${foreign} ${fmt1(raw.exposure)} ÷ (1 + ${(raw as unknown as Record<string, number>)[borrowLeg]}% × ${raw.months}/12)`] },
    { component_id: 'mmh_home_now', label: `${home} equivalent today`, expected_value: c.mmh.home_now, unit: homeUnit, tolerance: moneyTol,
      depends_on: ['mmh_foreign_now'], recompute: (d) => toHome(d.mmh_foreign_now, raw.spot, raw.quote_direction),
      working_steps: [`= foreign amount converted at today's spot ${fmt4(raw.spot)}`] },
    { component_id: 'mmh_home_settlement', label: `Guaranteed ${home} outcome under the money-market hedge`, expected_value: c.mmh.home_settlement, unit: homeUnit, tolerance: moneyTol,
      depends_on: ['mmh_home_now'], recompute: (d) => d.mmh_home_now * (1 + asDec(growLeg) * t),
      working_steps: [`= ${home} deposited/borrowed at ${growLeg}% for ${raw.months} months`] },
  ];
  const recomputeIds: Record<string, string | undefined> = { mmh_home_now: 'fxh_mmh_convert_spot', mmh_home_settlement: 'fxh_mmh_grow_home' };
  const params = { exposure: raw.exposure, forward_rate: raw.forward_rate, spot: raw.spot, months: raw.months, rate_foreign_borrow: raw.rate_foreign_borrow, rate_foreign_deposit: raw.rate_foreign_deposit, rate_home_borrow: raw.rate_home_borrow, rate_home_deposit: raw.rate_home_deposit };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildForwardMmhCompareModelAnswer(raw: ForwardMmhCompareInputs, c: ForwardMmhCompareComputed, prose: string): string {
  const home = raw.currency_home, foreign = raw.currency_foreign, mH = (n: number) => money(home, n), mF = (n: number) => money(foreign, n);
  const noun = raw.direction === 'receipt' ? 'receipt' : 'payment';
  const legWord = raw.direction === 'receipt' ? 'borrow the foreign currency now and deposit the home proceeds' : 'buy the foreign currency now and deposit it so it grows to the amount payable';
  return [
    '**FX hedging — forward vs money-market hedge**', '',
    `**Assumptions:** a ${foreign} ${fmt1(raw.exposure)} ${noun} is due in ${raw.months} months, quoted ${raw.quote_direction === 'foreign_per_home' ? `${foreign} per 1 ${home}` : `${home} per 1 ${foreign}`}. The forward rate for the period is stated at ${fmt4(raw.forward_rate)}. The money-market hedge would ${legWord}, using today's spot of ${fmt4(raw.spot)}.`, '',
    '**Step 1 — Forward hedge**', '', `${foreign} ${fmt1(raw.exposure)} converted at the forward rate ${fmt4(raw.forward_rate)} = **${mH(c.forward.home_settlement)}**, guaranteed.`, '',
    '**Step 2 — Money-market hedge**', '',
    `${legWord[0].toUpperCase()}${legWord.slice(1)}: ${mF(c.mmh.foreign_now)} today, converted at spot to ${mH(c.mmh.home_now)}, then grown to **${mH(c.mmh.home_settlement)}** by the settlement date.`, '',
    '**Step 3 — All-methods comparison and recommendation**', '',
    `| Method | Guaranteed ${home} outcome |`, `|------|------|`,
    `| Forward | ${mH(c.forward.home_settlement)} |`, `| Money-market hedge | ${mH(c.mmh.home_settlement)} |`, '',
    `${c.comparison.best.method === 'the forward' ? 'The forward' : 'The money-market hedge'} gives the ${raw.direction === 'receipt' ? 'higher' : 'lower-cost'} outcome, by **${mH(c.comparison.margin)}**, and is **recommended**.`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: forward ${mH(c.forward.home_settlement)} vs MMH ${mH(c.mmh.home_settlement)}; margin ${mH(c.comparison.margin)} to ${c.comparison.best.method} ✓*`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K2 — futures drill
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface FuturesDrillInputs extends FuturesInputs { currency_home: string; currency_foreign: string; }
export function buildFuturesSchema(raw: FuturesDrillInputs, c: FuturesComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const home = raw.currency_home, foreign = raw.currency_foreign, homeUnit = `${home}m`;
  const comps: Component[] = [
    { component_id: 'contracts', label: 'Number of futures contracts (whole)', expected_value: c.contracts, unit: 'contracts', tolerance: intTol,
      working_steps: [`= round(${foreign} ${fmt1(raw.exposure)} ÷ contract size ${fmt1(raw.contract_size)}) — whole contracts only`] },
    // unit is a plain 'rate' label (NOT the "foreign/home" pair string) so the tolerance lint's
    // isMoneyUnit heuristic — which flags any unit containing a currency symbol/code — doesn't
    // misclassify an FX RATE as a MONEY magnitude; a rate legitimately wants a tight ABSOLUTE
    // tolerance (house doctrine: BSOP's d1/d2 ±0.05), not a relative band. A relative band on
    // lock_in_rate (= a large given spot₀ + a small perturbable basis term) barely moves when only
    // the small term is wrong — the constant dominates — so it can silently swallow a genuine
    // upstream error; the absolute band bounds the deviation directly regardless of which term it
    // came from (surfaced by the GATE-3 seeded-OFR proof during authoring, 2026-07-22).
    { component_id: 'unexpired_basis', label: 'Unexpired basis at the transaction date', expected_value: c.unexpired_basis, unit: 'rate', tolerance: rateTol,
      working_steps: [`basis₀ = spot₀ ${fmt4(raw.spot0)} − futures₀ ${fmt4(raw.futures0)} = ${fmt4(raw.spot0 - raw.futures0)}; unexpired = basis₀ × (${raw.months_to_expiry - raw.months_to_transaction})/${raw.months_to_expiry} months remaining/total`] },
    { component_id: 'lock_in_rate', label: 'Lock-in rate', expected_value: c.lock_in_rate, unit: 'rate', tolerance: rateTol,
      depends_on: ['unexpired_basis'], recompute: (d) => raw.spot0 - d.unexpired_basis,
      working_steps: [`= spot₀ ${fmt4(raw.spot0)} − unexpired basis`] },
    { component_id: 'home_from_futures', label: `${home} outcome from the futures hedge`, expected_value: c.home_from_futures, unit: homeUnit, tolerance: moneyTol,
      depends_on: ['contracts', 'lock_in_rate'], recompute: (d) => toHome(d.contracts * raw.contract_size, d.lock_in_rate, raw.quote_direction),
      working_steps: [`= hedged amount (contracts × contract size) converted at the lock-in rate`] },
  ];
  if (raw.residual_policy === 'forward_topup') {
    comps.push({ component_id: 'home_from_residual', label: `${home} outcome from the forward-topped-up residual`, expected_value: c.home_from_residual, unit: homeUnit, tolerance: moneyTol,
      depends_on: ['contracts'], recompute: (d) => toHome(raw.exposure - d.contracts * raw.contract_size, raw.topup_forward_rate!, raw.quote_direction),
      working_steps: [`= residual (exposure − hedged amount) converted at the topup forward rate ${fmt4(raw.topup_forward_rate!)}`] });
  }
  comps.push({ component_id: 'home_settlement', label: `Total ${home} outcome`, expected_value: c.home_settlement, unit: homeUnit, tolerance: moneyTol,
    depends_on: raw.residual_policy === 'forward_topup' ? ['home_from_futures', 'home_from_residual'] : ['home_from_futures'],
    recompute: (d) => d.home_from_futures + (raw.residual_policy === 'forward_topup' ? d.home_from_residual : 0),
    working_steps: [raw.residual_policy === 'immaterial' ? '= the futures outcome; the residual is immaterial and not separately hedged' : '= futures outcome + the forward-topped-up residual'] });
  const recomputeIds: Record<string, string | undefined> = { lock_in_rate: 'fxh_lock_in', home_from_futures: 'fxh_futures_convert', home_from_residual: 'fxh_topup_convert', home_settlement: 'fxh_futures_total' };
  const params = { exposure: raw.exposure, contract_size: raw.contract_size, spot0: raw.spot0, futures0: raw.futures0, months_to_expiry: raw.months_to_expiry, months_to_transaction: raw.months_to_transaction, ...(raw.topup_forward_rate ? { topup_forward_rate: raw.topup_forward_rate } : {}) };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildFuturesModelAnswer(raw: FuturesDrillInputs, c: FuturesComputed, prose: string): string {
  const home = raw.currency_home, foreign = raw.currency_foreign, mH = (n: number) => money(home, n);
  return [
    '**FX hedging — currency futures**', '',
    `**Assumptions:** a ${foreign} ${fmt1(raw.exposure)} ${raw.direction} is due in ${raw.months_to_transaction} months; futures of contract size ${fmt1(raw.contract_size)} expire in ${raw.months_to_expiry} months, spot₀ ${fmt4(raw.spot0)}, futures₀ ${fmt4(raw.futures0)}. A ${raw.direction} must **${c.side.toUpperCase()}** the futures.`, '',
    '**Step 1 — Number of contracts (whole contracts only)**', '', `${fmt1(raw.exposure)} ÷ ${fmt1(raw.contract_size)} = ${(raw.exposure / raw.contract_size).toFixed(1)} → rounds to **${c.contracts} contracts** (${c.contracts.toFixed(1)}, ${c.side}), hedging ${fmt1(c.hedged_amount)}; residual ${fmt1(c.residual)} ${raw.residual_policy === 'immaterial' ? 'is immaterial and not separately hedged' : 'is topped up on the forward'}.`, '',
    '**Step 2 — Basis and the lock-in rate**', '', `Basis₀ = ${fmt4(raw.spot0)} − ${fmt4(raw.futures0)} = ${fmt4(raw.spot0 - raw.futures0)}; assumed to decline linearly to zero by expiry, so the unexpired basis at the transaction date = ${fmt4(c.unexpired_basis)}. Lock-in rate = ${fmt4(raw.spot0)} − ${fmt4(c.unexpired_basis)} = **${fmt4(c.lock_in_rate)}**.`, '',
    '**Step 3 — Outcome**', '', `${fmt1(c.hedged_amount)} at the lock-in rate = ${mH(c.home_from_futures)}${raw.residual_policy === 'forward_topup' ? ` + residual on the forward ${mH(c.home_from_residual)}` : ''} = **${mH(c.home_settlement)}**.`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: ${c.contracts} contracts × ${fmt1(raw.contract_size)} = ${fmt1(c.hedged_amount)}; at lock-in ${fmt4(c.lock_in_rate)} → ${mH(c.home_settlement)} ✓*`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K3 — options drill
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface OptionsDrillInputs extends OptionsInputs { currency_home: string; currency_foreign: string; }
export function buildOptionsSchema(raw: OptionsDrillInputs, c: OptionsComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const home = raw.currency_home, foreign = raw.currency_foreign, homeUnit = `${home}m`;
  const premiumUnit = raw.premium_currency === 'home' ? homeUnit : `${foreign}m`;
  const comps: Component[] = [
    { component_id: 'contracts', label: 'Number of option contracts (whole)', expected_value: c.contracts, unit: 'contracts', tolerance: intTol,
      working_steps: [`= round(${foreign} ${fmt1(raw.exposure)} ÷ contract size ${fmt1(raw.contract_size)}) — whole contracts only`] },
    { component_id: 'premium', label: `Total premium (${raw.premium_currency})`, expected_value: c.premium, unit: premiumUnit, tolerance: premiumTol,
      depends_on: ['contracts'], recompute: (d) => raw.premium_pct * d.contracts * raw.contract_size * (raw.months_covered / 12),
      working_steps: [`= premium ${(raw.premium_pct * 100).toFixed(3)}% × ${c.contracts} contracts × ${fmt1(raw.contract_size)} × ${raw.months_covered}/12`] },
    { component_id: 'premium_home_fv', label: `Premium, future-valued to settlement (${home})`, expected_value: c.premium_home_fv, unit: homeUnit, tolerance: premiumTol,
      depends_on: ['premium'], recompute: (d) => (raw.premium_currency === 'home' ? d.premium : toHome(d.premium, raw.strike, raw.quote_direction)) * (1 + asDec(raw.compounding_rate) * (raw.months_to_transaction / 12)),
      working_steps: [`= premium${raw.premium_currency === 'foreign' ? ` converted at the strike ${fmt4(raw.strike)}` : ' (already home currency, no further conversion)'}, grown at ${raw.compounding_rate}% for ${raw.months_to_transaction} months`] },
    { component_id: 'home_from_strike', label: `${home} outcome if exercised (at the strike)`, expected_value: c.home_from_strike, unit: homeUnit, tolerance: moneyTol,
      depends_on: ['contracts'], recompute: (d) => toHome(d.contracts * raw.contract_size, raw.strike, raw.quote_direction),
      working_steps: [`= hedged amount converted at the strike ${fmt4(raw.strike)} (assume exercised)`] },
  ];
  comps.push({ component_id: 'home_settlement', label: `Net ${home} outcome`, expected_value: c.home_settlement, unit: homeUnit, tolerance: moneyTol,
    depends_on: ['home_from_strike', 'premium_home_fv'],
    recompute: (d) => d.home_from_strike + (raw.direction === 'receipt' ? -d.premium_home_fv : d.premium_home_fv),
    working_steps: [`= strike proceeds ${raw.direction === 'receipt' ? '− the FV premium (cost)' : '+ the FV premium (cost)'}`] });
  const recomputeIds: Record<string, string | undefined> = { premium: 'fxh_option_premium', premium_home_fv: 'fxh_premium_fv', home_from_strike: 'fxh_strike_convert', home_settlement: 'fxh_option_net' };
  const params = { exposure: raw.exposure, contract_size: raw.contract_size, strike: raw.strike, premium_pct: raw.premium_pct, months_covered: raw.months_covered, months_to_transaction: raw.months_to_transaction, compounding_rate: raw.compounding_rate };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildOptionsModelAnswer(raw: OptionsDrillInputs, c: OptionsComputed, prose: string): string {
  const home = raw.currency_home, foreign = raw.currency_foreign, mH = (n: number) => money(home, n);
  // Premium figures are naturally small (a fraction of a percent of notional) — money()'s 1dp
  // rounding can display as a misleading "0.0m" even though the underlying value is a real,
  // non-trivial figure. Display premium-scale figures at 4dp instead (matches the project's own
  // convention for other naturally-small computed stats, e.g. BSOP's d1/d2/N(d)).
  const money4 = (currency: string, n: number) => `${currency} ${fmt4(n)}m`;
  const premiumStr = money4(raw.premium_currency === 'home' ? home : foreign, c.premium);
  const premiumFvStr = money4(home, c.premium_home_fv);
  return [
    '**FX hedging — currency options**', '',
    `**Assumptions:** a ${foreign} ${fmt1(raw.exposure)} ${raw.direction} is due in ${raw.months_to_transaction} months; traded options of contract size ${fmt1(raw.contract_size)} at strike ${fmt4(raw.strike)}, premium ${(raw.premium_pct * 100).toFixed(3)}% quoted in ${raw.premium_currency === 'home' ? home : foreign}. A ${raw.direction} must **${c.side.toUpperCase()}** the options. It is assumed the options are **exercised** (no separate gain/loss calculation is needed).`, '',
    '**Step 1 — Number of contracts and the premium**', '', `${fmt1(raw.exposure)} ÷ ${fmt1(raw.contract_size)} = ${(raw.exposure / raw.contract_size).toFixed(1)} → **${c.contracts} contracts** (${c.contracts.toFixed(1)}, ${c.side}). Premium = ${(raw.premium_pct * 100).toFixed(3)}% × ${c.contracts} × ${fmt1(raw.contract_size)} × ${raw.months_covered}/12 = **${premiumStr}**${raw.premium_currency === 'foreign' ? ' — already in the currency being worked with; no further conversion is needed' : ''}.`, '',
    '**Step 2 — Exercise outcome**', '', `${fmt1(c.hedged_amount)} at the strike ${fmt4(raw.strike)} = ${mH(c.home_from_strike)}.`, '',
    '**Step 3 — Net of the premium**', '', `Premium future-valued to settlement = ${premiumFvStr}; ${raw.direction === 'receipt' ? 'deducted from' : 'added to'} the strike outcome = **${mH(c.home_settlement)}**.`, '',
    '**Step 4 — Advice to the board**', '', prose, '',
    `*Reconciliation: strike outcome ${mH(c.home_from_strike)} ${raw.direction === 'receipt' ? '−' : '+'} premium FV ${premiumFvStr} = ${mH(c.home_settlement)} ✓*`,
  ].join('\n');
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// K4 — swap drill (thin evidence — Mahoney J24 p.7 only; flagged for co-founder recompute)
// ═══════════════════════════════════════════════════════════════════════════════════════
export interface SwapDrillInputs extends SwapInputs { currency_home: string; currency_foreign: string; }
export function buildSwapSchema(raw: SwapDrillInputs, c: SwapComputed): { schema: AnswerSchema; serialized: SerializedSchema } {
  const home = raw.currency_home, foreign = raw.currency_foreign, homeUnit = `${home}m`, foreignUnit = `${foreign}m`;
  const comps: Component[] = [
    { component_id: 'swapped_amount', label: `Exposure covered by the swap (${(raw.swap_fraction * 100).toFixed(0)}%)`, expected_value: c.swapped_amount, unit: foreignUnit, tolerance: moneyTol,
      working_steps: [`= ${foreign} ${fmt1(raw.exposure)} × ${(raw.swap_fraction * 100).toFixed(0)}%`] },
    { component_id: 'home_from_swap', label: `${home} outcome from the swapped portion`, expected_value: c.home_from_swap, unit: homeUnit, tolerance: moneyTol,
      depends_on: ['swapped_amount'], recompute: (d) => toHome(d.swapped_amount, raw.swap_rate, raw.quote_direction),
      working_steps: [`= swapped amount converted at the swap rate ${fmt4(raw.swap_rate)}`] },
  ];
  if (raw.swap_fraction < 1) {
    comps.push({ component_id: 'home_from_residual', label: `${home} outcome from the un-swapped residual (forward)`, expected_value: c.home_from_residual, unit: homeUnit, tolerance: moneyTol,
      working_steps: [`= residual ${fmt1(raw.exposure * (1 - raw.swap_fraction))} converted at the forward rate ${fmt4(raw.residual_forward_rate!)} — the swap only covers a proportion of the flow`] });
  }
  comps.push({ component_id: 'home_settlement', label: `Total ${home} outcome`, expected_value: c.home_settlement, unit: homeUnit, tolerance: moneyTol,
    depends_on: raw.swap_fraction < 1 ? ['home_from_swap', 'home_from_residual'] : ['home_from_swap'],
    recompute: (d) => d.home_from_swap + (raw.swap_fraction < 1 ? d.home_from_residual : 0),
    working_steps: [raw.swap_fraction < 1 ? '= swap outcome + the residual hedged on the forward' : '= the swap outcome (the swap covers the full exposure)'] });
  const recomputeIds: Record<string, string | undefined> = { home_from_swap: 'fxh_swap_convert', home_settlement: 'fxh_swap_total' };
  const params = { exposure: raw.exposure, swap_fraction: raw.swap_fraction, swap_rate: raw.swap_rate, ...(raw.residual_forward_rate ? { residual_forward_rate: raw.residual_forward_rate } : {}) };
  return { schema: { components: comps }, serialized: toSerialized(comps, recomputeIds, params) };
}
export function buildSwapModelAnswer(raw: SwapDrillInputs, c: SwapComputed, prose: string): string {
  const home = raw.currency_home, foreign = raw.currency_foreign, mH = (n: number) => money(home, n), mF = (n: number) => money(foreign, n);
  return [
    '**FX hedging — currency swap**', '',
    `**Assumptions:** a ${foreign} ${fmt1(raw.exposure)} ${raw.direction} is due; a currency swap is available at ${fmt4(raw.swap_rate)} but covers only ${(raw.swap_fraction * 100).toFixed(0)}% of the flow${raw.swap_fraction < 1 ? `; the residual is hedged on the forward at ${fmt4(raw.residual_forward_rate!)}` : ''}.`, '',
    '**Step 1 — The swapped portion**', '', `${(raw.swap_fraction * 100).toFixed(0)}% of ${fmt1(raw.exposure)} = ${mF(c.swapped_amount)}, converted at the swap rate ${fmt4(raw.swap_rate)} = **${mH(c.home_from_swap)}**.`, '',
    ...(raw.swap_fraction < 1 ? ['**Step 2 — The residual (not covered by the swap)**', '', `${mF(c.residual)} does not benefit from the swap rate and is hedged on the forward at ${fmt4(raw.residual_forward_rate!)} = **${mH(c.home_from_residual)}**.`, ''] : []),
    `**Step ${raw.swap_fraction < 1 ? 3 : 2} — Total outcome**`, '', `**${mH(c.home_settlement)}**.`, '',
    `**Step ${raw.swap_fraction < 1 ? 4 : 3} — Advice to the board**`, '', prose, '',
    `*Reconciliation: swap ${mH(c.home_from_swap)}${raw.swap_fraction < 1 ? ` + residual ${mH(c.home_from_residual)}` : ''} = ${mH(c.home_settlement)} ✓*`,
  ].join('\n');
}
