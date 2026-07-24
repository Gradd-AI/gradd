# AFM interest-rate-hedging batch — independent-recompute + adversarial review pack

**Calculator #12: interest-rate hedging (`lib/acca/irhedge.ts`). 4 drills, `paper_code=AFM`, `lo_code=E3a`. GATED 2026-07-24, FR1-patched 2026-07-24 (`status=candidate`, `published=false`) — awaiting a co-founder independent recompute FIRST, then blind GPT adversarial review, before any flip. SECOND family in AFM section E (after FX hedging E2b). Shares ZERO premium/basis/lock-in code with `fxhedge.ts` — the two families' conventions are structurally different (see CLOSED RULINGS).**

Doctrine: code owns EVERY figure AND every figure-vs-figure verdict (contract counts, exercise
decisions per scenario, the effective-rate lock reconciliation, the collar-vs-plain-call comparison,
the swap saving split) — the model authored PROSE only (the Step-N advice paragraph, the scenario
framing, hint, full_reveal). Every figure that appears in an advice paragraph is interpolated from the
engine's own compute output, never hand-typed.

## FR1 (2026-07-24) — two wording fixes, NO figures changed
1. **Futures gain/loss convention made position-sensitive** in both the conventions section below and
   the Rule 22 evidence comment in `lib/acca/irhedge.ts` — LONG (buy) = (closing − opening)/100 × ...;
   SHORT (sell) = the MIRROR (opening − closing)/100 × ... . The engine itself was already correct
   (`side === 'buy' ? closing - futures0 : futures0 - closing`, `computeIrFutures`) — this was a
   comment/doc-only fix, no schema or figure changed.
2. **K1 question wording**: "guaranteed effective borrowing cost" → "effective borrowing cost locked
   in" (matching T4's own register, "effective locked rate," rather than "guaranteed," which overstates
   a futures hedge as risk-free when it is a LOCK, not a guarantee against basis risk). Swept all 4
   rows × 5 fields (question/context_text/model_answer/hint/full_reveal) for "guaranteed" — the ONE hit
   was this K1 question phrase; zero hits remain (proof: `TOTAL guaranteed HITS across all 4 rows x 5
   fields: 0`). Model-answer scepticism hooks were not touched (none contained "guaranteed").

## Step-0 source conditions — BOTH resolved favourably (2026-07-24)
- **1a — SWAPS IN, Style A.** The comparative-advantage swap lives in an AFM/P4-tier technical article
  (**T4** "Interest rate risk management", `irrm.html` — page title + breadcrumb both read "P4 Advanced
  Financial Management (AFM)"), under the heading "Suggested swap" (Titans FC / Kendri Co). So the swap
  kind is **Style A** (comparative-advantage saving split + bank fee), NOT the **T7** forward-curve
  NPV-valuation style (that style exists in a 2011 article but is unrelated to the recent examined form).
- **1b — BORROWER COLLAR CONFIRMED (verbatim).** ACCA "Options" (Business Finance) page: *"Collars
  involve simultaneous purchase of a cap and sale of a floor by companies who are borrowing, or purchase
  of a floor and sale of a cap if they are protecting an investment."* Maps exactly onto Northney's
  depositor quote (cap = a put on the future; floor = a call on the future), so the collar kind covers
  **both** directions.
- **FRA — background texture, NOT a kind.** Promotion to a 4th (stated-inputs) kind was contingent on
  swaps FAILING; swaps passed, so FRA is scenario framing only. Consistent with Abertafol E1's own note
  that AFM presents FRA figures pre-computed (*"proving the figures for the forward rate agreements that
  had been presented in the scenario ... wasting time"*).

## Conventions — Rule 22 evidence (verbatim quote + source id + page, all re-fetched 2026-07-24)
Source ids are registered in `docs/evidence/sources.json` (T4–T7 technical articles; E1/E3/E4 examiner
reports, annotated for IR use). PDFs are git-ignored; re-fetch via `docs/evidence/fetch_acca_sources.ps1`.

- **DIRECTION (issuer-perspective, same doctrine as calc #6).** Borrower SELLS futures / buys a PUT (a
  cap); depositor BUYS futures / buys a CALL (a floor). Triple-cited:
  - **T4** (`irrm.html`): *"To create an effective locked rate, Titans FC will SELL March futures"* and
    *"MARCH PUT AT 94.000"* [borrower→sell/put].
  - **T5** (`hedging.html`): *"Buy futures now (go long ...), as the hedge is against a fall in interest
    rates"* and *"Buy call options as need to hedge against a fall in interest rates"* [depositor→buy/call].
  - **Sohbet Co** (E4, MJ25 p.11): *"determine that futures and call options should be bought"*;
    **Abertafol Co** (E1, SD23 p.13): loan hedged with futures, investment with *"traded call options"*.
- **CONTRACT COUNT = notional/size × hedge-period/contract-period.** The #1 examiner-flagged error is the
  WRONG PERIOD (GATE 21 seeds it as a distinct OFR failure):
  - **T5**: *"Number of contracts = D27,000,000 ÷ D500,000 × 5 months ÷ 3 months = 90 contracts."*
  - **T4**: *"$30m/$0.5m x 2mths/3mths = 40."*  **Abertafol E1 p.13**: *"both the amount covered, and the
    period of the loan / investment are relevant."*
- **BASIS = (100 − current rate) − futures price; UNEXPIRED BASIS decays LINEARLY to zero at expiry.**
  - **T5/T6** (`basis-risk.html`): *"(100 – 4.20) – 94.78 = 1.02"*; *"Unexpired basis on 31 January = 2/6
    × 1.02 = 0.34"*; *"basis is often assumed to diminish at a constant rate"* — flagged by ACCA itself as
    a simplifying assumption that *"may not hold true in practice"* (the scepticism-mark hook).
- **CLOSING FUTURES PRICE = 100 − expected rate − unexpired basis.** THIS IS NOT the FX lock-in formula
  (`fxhedge.ts`: opening futures + unexpired basis) — an IR future is quoted as (100 − rate), an FX
  future as a currency rate, so the formulas are structurally different; the non-reuse is deliberate.
  - **T5**: *"Expected futures price: 100 – 5.3 – 0.34 = 94.36"* (rise); *"100 – 3.6 – 0.34 = 96.06"* (fall).
- **FUTURES GAIN/LOSS is POSITION-SENSITIVE: LONG (buy) = (closing − opening)/100 × contract size ×
  contract-months/12 × contracts; SHORT (sell) = the MIRROR (opening − closing)/100 × the same** —
  netted against the money-market actual interest → a single EFFECTIVE ANNUAL RATE that reconciles
  across scenarios:
  - **T5**: *"(0.9436 – 0.9478) × D500,000 × 3/12 × 90 = (47,250)"* → *"Net return = 515,250 ... Effective
    annual interest rate 515,250/27,000,000 × 12/5 = 4.58%"*, the SAME 4.58% under both scenarios.
- **OPTION PREMIUM = premium% × contracts × size × contract-months/12 — PRORATED by the contract period.**
  Structurally separate from `fxhedge.ts`'s ALL-IN currency-option premium (GATE 22 enforces the split):
  - **Abertafol E1 p.14**: *"The total premium should be the percentage presented in the question (0.298%)
    multiplied by the amount covered – that is 60 contracts here, each being $500,000, 3-month contracts
    (so 0.298% x 60 x $500,000 x 3/12)."*
- **OPTION EXERCISE: a depositor's CALL when the expected price is ABOVE the strike; a borrower's PUT when
  BELOW.**  **T5**: *"If the exercise price is LOWER than the expected futures price, EXERCISE"* (a call).
- **COLLAR — borrower buys a cap (put) + sells a floor (call); depositor buys a floor (call) + sells a cap
  (put); net premium = premium bought − premium received.** Northney's 6-step sequence is the collar kind's
  `working_steps`:
  - **Northney Co** (E3, SD24 pp.4-5): a depositor *"needed to demonstrate the purchase of a call option
    and the selling of a put option"*, working *"the number of contracts and the net premium ... basis ...
    expected futures price ... whether the options would be exercised under each of the interest rate
    scenarios ... the effect of the collar on the net receipts."*
- **SWAP (Style A) — saving = fixed differential − floating differential, split after the bank fee.**
  - **T4** ("Suggested swap"): *"A swap can be arranged such that each party will save (3%-1%) x ½ = 1% pa
    excluding fees"*; *"reduced by 0.5% if the swap is undertaken"* (a bank fee per party). Thinnest-
    evidenced kind of the four — flagged, mirroring the FX swap's evidence caveat.

## Family gates (GATES 20–25, beyond the 6 base gates + P4–P8 prose lints)
Cores in `lib/acca/irhedge.ts`; wrappers in `lib/acca/validate-schema.ts`; all exercised pass **and**
seeded-fail in `scripts/test-irhedge.ts` (94 checks, ALL PASS).
- **GATE 20 — direction-lock.** Borrower/depositor × instrument matrix (futures side, option type, both
  collar legs). Seeded fails: depositor+SELL futures, borrower+CALL, depositor collar with legs swapped.
- **GATE 21 — contract-count.** `= round(notional/size × hedge/contract months)`; the wrong-period count
  (`notional/size` with no period ratio) fails as a DISTINCT class (the #1 examiner error), as does a
  fractional count.
- **GATE 22 — premium-separation.** IR premium MUST include the contract-period fraction and MUST NOT
  collapse to the FX all-in shape (`premium% × contracts × size`, no /12). Seeded fail: the 89,400 all-in
  shape for the 22,350 prorated premium.
- **GATE 23 — basis-decay + scepticism hook.** Linear unexpired basis; closing = 100 − rate − unexpired
  (NOT the FX lock-in); AND the model answer carries the basis-risk scepticism hook verbatim. Seeded
  fails: missing hook, non-linear basis, the FX lock-in formula used for the closing price.
- **GATE 24 — convention-sentence presence** (the `{{QUOTE_SENTENCE}}` analogue). The canonical
  code-generated direction sentence is injected into `context_text` via a `{{CONVENTION_SENTENCE}}`
  placeholder and verified present verbatim — a parameter↔prose direction mismatch is structurally
  impossible. **GATE 24b** (authoring guard): the unexpired-basis sentence says *"N months remaining of the
  contract's M-month life"* — never "elapsed" — killing the elapsed/remaining inversion risk flagged at
  Step-0.
- **GATE 25 — effective-rate reconciliation.** A futures hedge must lock ONE effective rate: every scenario
  reconciles within the rate tolerance (the T5 pattern). Options/collars are ranges, exempt.

## Tolerance note
Money figures: plain relative 0.5% (no floor — an IR hedge outcome is never legitimately near-zero).
Effective RATES (%): tight absolute ±0.05 (house doctrine for rate-shaped figures). Futures PRICE / basis:
absolute ±0.01 (a price is rate-like, not money). Contract counts: absolute ±0.5.

## Absolute-units convention (differs from the FX batch — deliberate)
IR drills are authored in **absolute currency units** (£24,000,000; £500,000 contracts; £562,500-scale
interest), NOT the FX batch's millions convention. This matches the ACCA IR sources exactly (T5 uses
D27,000,000 / D500,000 / 90 contracts / 515,250 net), and IR interest/premium figures read naturally in
full. The stored `answer_schema` expected values are therefore absolute; the drill states raw inputs in
full, so a student works and enters figures at the same scale.

## Kinds → ids → code-computed headline figures (all `status=candidate`, `published=false`)
| Kind | id | Company / currency | Direction | marks | Headline verdict (code-owned) |
|---|---|---|---|---|---|
| K1 futures | `56989d69-bc4d-4768-b00f-8f533de2df35` | Brackenmoor Industrial plc / £ | **borrower** (loan) | 12 | 64 contracts (sell); locks **5.70%** under BOTH a rise to 5.90% and a fall to 4.40% |
| K2 options | `1c133573-44b3-4c78-b38e-5d0e0646e0cf` | Rheintal Präzision GmbH / € | **depositor** (deposit) | 10 | 120 call contracts; premium **€30,000**; effective return ranges **2.70%** (floor, rate falls) to **3.15%** (rate rises, lapses) |
| K3 collar | `f088daa5-5107-4d5b-b105-fc4a10a51ad1` | Mesa Verde Logistics Inc / $ | **depositor** (deposit) | 10 | 80 contracts; net premium **$15,000** (25,000 − 10,000); band **3.60%–4.10%** vs plain call **3.50%–4.35%** |
| K4 swap | `26a4167b-0167-4be5-aa57-ac64d09c208f` | Aldbrook / Corvale (both £) | two-party | 8 | net saving **0.80%** after 0.20% fee; Aldbrook → LIBOR+0.00%, Corvale → 7.10% |

**Direction diversity (required):** K1 borrower, K2 depositor, K3 depositor, K4 two-party — ≥1 borrower and
≥1 depositor among K1–K3 ✓.

## ⛔ CLOSED RULINGS — do NOT re-raise (carried forward + new)
1. **Swap = Style A (comparative advantage), NOT the T7 forward-curve NPV valuation.** Ruled at Step-0
   Phase-1 on T4's AFM-tier confirmation. The 2011 T7 NPV-valuation style is a different, older
   presentation not featured in any of the three most-recent examined IR questions (Abertafol/Sohbet/
   Northney contain no swap requirement); Style A is the examined form.
2. **FRA = background texture, never a computed kind.** Contingent-promotion resolved NEGATIVE (swaps
   passed their condition). Do not add an FRA settlement kind.
3. **IR option premium is PRORATED by the contract period (×cm/12); the FX all-in premium is NOT reused.**
   GATE 22 enforces the separation. The memory-bank note that FX's earlier (wrong) prorated premium was
   "an unsourced import from an interest-rate family" is explained: that import was CORRECT for IR, only
   wrong when applied to FX. The two families keep separate premium helpers.
4. **IR closing price = 100 − rate − unexpired basis; the FX lock-in (opening + unexpired) is NOT reused.**
   Structural difference (IR future = 100 − rate; FX future = a currency rate). Deliberate non-reuse.
5. **Direction doctrine (issuer-perspective): borrower sells futures / buys put; depositor buys futures /
   buys call; borrower collar = buy put + sell call; depositor collar = buy call + sell put.** Triple-cited
   for futures/options; Northney + the Options page for the collar. GATE 20 enforces.
6. **Unexpired-basis sentence states months REMAINING of the contract's full life, never "elapsed."** GATE
   24b guard. Kills the inversion risk.
7. **Absolute currency units (not millions).** Matches the ACCA IR sources; a deliberate divergence from the
   FX batch's millions convention.

## Area-picker note (map-before-close — PENDING at flip, not yet done)
E3 is its own browsable area (like E2). The four model-answer headings — `**Interest-rate hedging —
futures**`, `— options on futures**`, `— collar**`, `— swap (comparative advantage)**` — are NOT yet
registered in `lib/acca/area-entry.ts` (which currently ranks E2 fx-hedging at 70–73). **To be registered
at 74–77 in the closing (flip) commit**, alongside the CLAUDE.md CODE-MAP entry for the new family
(map-before-close rule). Candidate/unpublished rows are not served, so this is not blocking for review.

---

## Drill — K1 futures · `56989d69-bc4d-4768-b00f-8f533de2df35`
- LO E3a · mode quantitative · command_verb "evaluate" · marks_guide 12 · UK precision-castings maker,
  a BORROWER hedging a forthcoming loan (sell futures)

**Question:** Evaluate the interest-rate futures hedge available to Brackenmoor Industrial plc for its
forthcoming loan, including the effective borrowing cost locked in under both a rise and a fall in the
base rate, and recommend whether the board should proceed.

**Context:** Brackenmoor Industrial plc (UK, £) draws a £24,000,000 loan in 3 months, held for 4 months.
Base rate 5.00% at the appraisal date; Brackenmoor borrows at base + 0.50%. Three-month futures, size
£500,000, price 94.60, expiring in 6 months. Operations director's sceptical claim (to be tested):
"locking the rate with futures would just cost us if rates fall — we should stay unhedged." Injected
convention sentence (GATE 24): *"As a borrower hedging against a rate rise, the company SELLS interest-rate
futures now (interest-rate futures are quoted as (100 − the annual rate))."* Scenarios: base rises to
5.90%, or falls to 4.40%.

**Model answer (code-computed):** 24,000,000 ÷ 500,000 × 4/3 = **64 contracts** (sell). Basis₀ = (100 −
5.00) − 94.60 = **0.40**; 3 months remaining of the contract's 6-month life → unexpired = 0.40 × 3/6 =
**0.20**. Rise-to-5.90%: actual 6.40%, MM interest **£512,000**, closing 100 − 5.90 − 0.20 = **93.90**,
futures P/L (94.60 − 93.90)/100 × 500,000 × 3/12 × 64 = **+£56,000**, net **£456,000**, effective **5.70%**.
Fall-to-4.40%: actual 4.90%, MM interest **£392,000**, closing **95.40**, futures P/L **−£64,000**, net
**£456,000**, effective **5.70%**. The hedge **locks 5.70%** under both scenarios. Advice rebuts the
"stay unhedged" claim (certainty vs the forgone 4.90% cost if rates fall / the 6.40% risk if they rise),
flags expiry alignment + margin cost + residual basis risk, recommends where predictability is the priority.

**Gates:** 1 PASS (7 components) · 2 PASS · 3 PASS (roots contracts/unexpired_basis/mm_interest → incorrect;
closing_price/futures_profit/net_outcome/effective_rate → carried; awarded 4/7) · 4 PASS · 5 PASS · 6 PASS
(N/A) · 7 PASS · **20 PASS** (borrower→sell) · **21 PASS** (64 = round(24m/0.5m × 4/3); integer, period
applied) · **23 PASS** (linear basis, closing = 100 − rate − unexpired, scepticism hook present) · **24
PASS** (borrower-futures convention sentence verbatim) · **24b PASS** (remaining-life wording) · **25 PASS**
(both scenarios reconcile to 5.70%).

**Recompute anchors:** (notional/size × hedge/cm) = 48 × 4/3 = 64 EXACTLY (integer → a perfect lock, the T5
condition). Reconciliation holds because contracts × size × cm = notional × hedge (64 × 500,000 × 3 =
24m × 4 = 96,000,000).

---

## Drill — K2 options · `1c133573-44b3-4c78-b38e-5d0e0646e0cf`
- LO E3a · mode quantitative · command_verb "evaluate" · marks_guide 10 · German precision-instruments
  maker, a DEPOSITOR hedging a forthcoming deposit (buy call). Direction deliberately OPPOSITE to K1.

**Question:** Evaluate the options-on-futures hedge available to Rheintal Präzision GmbH for its forthcoming
deposit, including the effective return under both a fall and a rise in the base rate, and recommend whether
the board should proceed.

**Context:** Rheintal Präzision GmbH (Germany, €) places €60,000,000 on a 3-month deposit in 3 months. Base
rate 3.00% at the appraisal date; Rheintal earns base − 0.25%. Options on three-month futures, size
€500,000, exercise price 96.75, premium 0.20% (per annum, over the 3-month contract period); futures price
96.80, expiring in 6 months. Board member's sceptical claim: "options are always too expensive to be worth
the premium." Injected convention sentence: *"As a depositor hedging against a rate fall, the company BUYS
CALL options on the futures ..."* Scenarios: base falls to 2.40%, or rises to 3.60%.

**Model answer (code-computed):** Buy **120 call options**. Premium = 0.20% × 120 × 500,000 × 3/12 =
**€30,000** (PRORATED by the contract period — the IR convention, distinct from the FX all-in). Basis₀ =
(100 − 3.00) − 96.80 = **0.20**; unexpired (3 of 6 months remaining) = **0.10**. Fall-to-2.40%: closing 100
− 2.40 − 0.10 = **97.50** > strike 96.75 → **exercise**; option gain (97.50 − 96.75)/100 × 500,000 × 3/12 ×
120 = **€112,500**; net = MM 322,500 + 112,500 − 30,000 = **€405,000**, effective **2.70%** (the floor).
Rise-to-3.60%: closing **96.30** < 96.75 → **lapse**, gain 0; net = MM 502,500 + 0 − 30,000 = **€472,500**,
effective **3.15%**. A RANGE, not a lock — floor 2.70%, upside retained to 3.15% net of premium. Advice
tests and rejects the "always too expensive" claim.

**Gates:** 1 PASS (5 components) · 2 PASS · 3 PASS (roots contracts/closing_price → incorrect; premium/
option_payoff/net_outcome → carried; awarded 3/5) · 4 PASS · 5 PASS · 6 PASS (N/A) · 7 PASS · **20 PASS**
(depositor→buy call) · **21 PASS** (120 = round(60m/0.5m × 3/3)) · **22 PASS** (premium 30,000 = 0.20% × 120
× 500,000 × 3/12; ≠ the all-in 120,000) · **23 PASS** · **24 PASS** (depositor-options sentence verbatim) ·
**24b PASS** · 25 N/A (options are a range, not a lock).

**Recompute anchors:** premium keeps the ×3/12 term (the load-bearing IR/FX separation). Exercise flips
correctly across the two scenarios (ITM at 97.50, OTM at 96.30 vs strike 96.75).

---

## Drill — K3 collar · `f088daa5-5107-4d5b-b105-fc4a10a51ad1`
- LO E3a · mode quantitative · command_verb "evaluate" · marks_guide 10 · US freight-forwarder, a
  DEPOSITOR collar (buy call + sell put — Northney-aligned), compared against a plain purchased call

**Question:** Evaluate the interest-rate collar available to Mesa Verde Logistics Inc for its forthcoming
deposit, including the net premium and the effective return under both a fall and a rise in the base rate,
and compare it with a plain purchased call option, then recommend whether the board should proceed.

**Context:** Mesa Verde Logistics Inc (US, $) holds $40,000,000 on a 3-month deposit in 3 months. Base rate
4.00% at the appraisal date; earns base − 0.20%. Options on three-month futures, size $500,000, futures
price 95.90, expiring in 6 months. Collar: BUY call @ 96.00 (premium 0.25%), SELL put @ 95.50 (premium
0.10%), per-annum premiums over the 3-month contract period. Comparison benchmark: a plain purchased call @
96.00, premium 0.25%. Treasurer's sceptical claim: "a collar is basically a free hedge because the premium
we receive cancels the premium we pay." Injected convention sentence: *"As a depositor's collar, the company
BUYS call options (a floor) and SELLS put options (a cap), so the net premium is the premium bought less the
premium received."* Scenarios: base falls to 3.40%, or rises to 4.80%.

**Model answer (code-computed, Northney 6-step):** (1) options needed: buy call, sell put. (2) **80
contracts** = round(40m/0.5m × 3/3). (3) net premium: paid 0.25% × 80 × 500,000 × 3/12 = **$25,000** −
received 0.10% × ... = **$10,000** → **$15,000** net. (4) basis₀ = (100 − 4.00) − 95.90 = **0.10**; unexpired
(3 of 6 remaining) = **0.05**. (5)/(6) fall-to-3.40%: closing **96.55**, bought call ITM (96.55 > 96.00),
sold put OTM → net = MM 320,000 + 55,000 − 0 − 15,000 = **$360,000**, effective **3.60%**; rise-to-4.80%:
closing **95.15**, bought call OTM, sold put ITM against us (95.15 < 95.50) → net = MM 460,000 + 0 − 35,000 −
15,000 = **$410,000**, effective **4.10%**. Collar band **[3.60%, 4.10%]**. Comparison vs plain call
(code-computed via the plain-option path): plain premium **$25,000**, band **[3.50%, 4.35%]** — the collar
saves **$10,000** premium, buys a HIGHER floor (3.60% vs 3.50%) at the cost of a LOWER cap (4.10% vs 4.35% —
upside surrendered). Advice rejects the "free hedge" framing (net premium is a real $15,000; the received
premium is paid for by the surrendered upside; the sold put is an obligation).

**Gates:** 1 PASS (6 components) · 2 PASS · 3 PASS (roots contracts/closing_price → incorrect; buy_premium/
sell_premium/net_premium/net_outcome → carried; awarded 4/6) · 4 PASS · 5 PASS · 6 PASS (N/A) · 7 PASS ·
**20 PASS** (depositor collar: buy call + sell put) · **21 PASS** (80 contracts) · **22 PASS** (both legs:
25,000 and 10,000 prorated) · **23 PASS** · **24 PASS** (collar convention sentence verbatim) · **24b PASS**
· 25 N/A (collar is a range).

**Recompute anchors:** net premium 25,000 − 10,000 = 15,000. The comparison figures (plain call band
3.50%/4.35%) are ENGINE-derived from `computeIrOptions` on the same inputs with the floor strike and full
premium — they are code-owned discussion figures, not gradeable schema components (the schema grades the
collar itself). Reviewer should confirm the plain-call band independently.

---

## Drill — K4 swap · `26a4167b-0167-4be5-aa57-ac64d09c208f`
- LO E3a · mode quantitative · command_verb "evaluate" · marks_guide 8 · two UK companies, comparative-
  advantage swap; scepticism hook on whether the counterparty rates are real market quotes

**Question:** Evaluate the interest-rate swap proposed between Aldbrook Resources plc and Corvale
Manufacturing Ltd, including the saving to each party after the bank's fee and the effective rate each would
achieve, and recommend whether the arrangement should proceed.

**Context:** Aldbrook (stronger credit) can borrow 6.00% fixed / LIBOR + 0.40% floating; Corvale 7.50%
fixed / LIBOR + 0.90% floating. Aldbrook wants floating, Corvale wants fixed. Bank fee 0.20% p.a. total;
saving split 50/50. Injected convention sentence: *"The swap exploits comparative advantage: the party with
the comparative advantage in the fixed-rate market borrows fixed, the other borrows floating, and they swap
— the total saving is the fixed-rate differential less the floating-rate differential, shared between the
parties after the bank's fee."*

**Model answer (code-computed):** fixed differential = |6.00 − 7.50| = **1.50%**; floating differential =
|0.40 − 0.90| = **0.50%**; total gain = 1.50 − 0.50 = **1.00%**; after the 0.20% fee, net gain = **0.80%**;
split 50/50 → each **0.40%**. Aldbrook wants floating → effective LIBOR + (0.40 − 0.40) = **LIBOR + 0.00%**
(against LIBOR + 0.40% standalone). Corvale wants fixed → effective 7.50 − 0.40 = **7.10%** (against 7.50%
standalone). Advice delivers the scepticism hook: the whole 1.00% gain assumes all four quoted rates are
firm arm's-length market rates; if any is indicative, or a credit standing shifts before drawdown, the
differential and the saving shrink — require firm dated quotations, assess swap counterparty credit risk
over the 5-year life.

**Gates:** 1 PASS (6 components) · 2 PASS · 3 PASS (roots fixed_diff/floating_diff → incorrect; total_gain/
net_gain/a_benefit/b_benefit → carried; awarded 4/6) · 4 PASS · 5 PASS · 6 PASS (N/A) · 7 PASS · 20 N/A
(two-party, no single instrument side) · 21/22/23/25 N/A (no futures/basis) · **24 PASS** (swap comparative-
advantage sentence verbatim).

**Recompute anchors:** reproduces the T4 shape ((3%−1%)×½ there; (1.50%−0.50%) here, less the fee). Thinnest-
evidenced kind — the 50/50 split and the "fee off each party's share" convention are parameterised and
flagged; reviewer should confirm the split convention is acceptable.

---

## NEXT (pipeline)
1. **Co-founder independent recompute** of all 4 figure sets (this pack, CLOSED RULINGS present) — FIRST,
   before GPT sees anything.
2. **Blind GPT adversarial review** (CLOSED RULINGS present).
3. **Adjudicate**, then **flip by EXPLICIT-id SQL** (reconcile approved-set vs journal FIRST; demote any
   un-reviewed `approved` row in the same transaction) — GATE-P permits Claude Code to execute the guarded
   flip once all standing guards hold.

## PENDING at close (not blocking review)
- **area-entry registration** of the 4 E3 headings at 74–77 in `lib/acca/area-entry.ts` (+ test-area-entry).
- **CLAUDE.md CODE-MAP entry** for the `irhedge.ts` family (map-before-close rule) — module path, gates
  20–25, fixtures `test-irhedge.ts` / `npm run test:irhedge`, the FRA-texture / swap-Style-A / premium-
  separation rulings.
- **AFM_SURFACED.md** open-item entry + **APM_BUILD_CONTRACT.md** journal entry.
- Grant's student walk-through (post-flip, non-blocking).
