# AFM FX-hedging batch — blind adversarial review pack

**Calculator #11: FX hedging (`lib/acca/fxhedge.ts`). 4 drills, `paper_code=AFM`, `lo_code=E2b`. REGENERATED + GATED 2026-07-22/23 after FIX ROUND 1 (`status=candidate`, `published=false`) — awaiting a FRESH co-founder independent recompute + blind adversarial review before any flip. FIRST family in AFM section E. Superseded the original 2026-07-22 batch (ids `fd0ba548`/`93fc30f7`/`001c8b07`/`13882862`, all deleted) — see FIX ROUND 1 below for what changed and why.**

Doctrine: code owns EVERY figure AND every figure-vs-figure verdict (including which hedge method
wins, and by how much) — the model authored PROSE only. The calculator composes
`parityDifferential` from `international.ts` ONE-WAY (no back-imports) for the optional IRP-derived
forward; every sourced example gives the forward rate directly, so the primary K1 path takes
`forward_rate` as a stated input. `quote_direction` (foreign-per-home vs home-per-foreign) and
`residual_policy` (immaterial vs forward-topup) are parameterised PER DRILL and code-decided (never
model-chosen) — see Step-0 ruling below.

## ⚠ FIX ROUND 1 (2026-07-22/23) — 3 MAJORS from co-founder independent recompute
The first-ever independent recompute against this batch found three genuine defects, none of which
any of the 24 automated gates caught (all gate classes explained below, per finding). **None of the
underlying source PDFs that would independently confirm the K2/K3 conventions could be located
publicly** — searched multiple ways for a September/December 2025 (SD25) official/sample-answers
document; only the examiner's REPORT is public, and it carries commentary, not worked figures. Per
standing discipline, these two fixes are applied on the co-founder's own independent-recompute
authority (the established mechanism in this project for exactly this situation), NOT claimed as
independently source-verified — flagged honestly rather than self-certified.

1. **K2 lock-in rate — misencoded convention (gate-invisible: GATE 16 checked internal
   self-consistency of a wrong formula, not the formula's correctness against a real source).**
   The engine computed `lock_in_rate = spot0 − unexpired_basis`, which is algebraically ONE-SIDED —
   it equals `futures0 + EXPIRED_basis`, not `futures0 + unexpired_basis`. Co-founder recompute
   against Passmore Co's own worked treatment found the correct convention is
   **`lock_in_rate = futures0 + unexpired_basis`** (≡ `spot0 − expired_basis`). Fixed in
   `computeFuturesHedge` + the K2 schema/model-answer. **GATE 16 hardened**: it now verifies BOTH
   algebraic routes to the lock-in rate (`futures0 + unexpired` and `spot0 − expired`) agree with
   each other AND with the stated figure — a one-sided reimplementation can no longer silently pass,
   because the two routes are built from different given constants and only coincide when the
   formula itself is right. New fixture: `GATE16 FAILS on the OLD (one-sided) formula` regression-locks
   this exact class.
2. **K3 option premium — unsourced formula import (gate-invisible: GATE 18 checked the premium
   against its OWN stated formula, not whether that formula was the right one to use).** The engine
   prorated the premium by `(months_covered/12)`, borrowed from Abertafol Co's INTEREST-RATE-options
   formula (D23, "0.298% x 60 x $500,000 x 3/12") — but that proration is UNSOURCED for CURRENCY
   options (Abertafol is interest-rate-specific; no local currency-options source states or
   contradicts a time-proration). Per Grant's documented fallback (used because the settling SD25
   source is unfetchable): **the premium is now an ALL-IN per-unit charge** —
   `premium = premium_pct × contracts × contract_size`, no time proration — and it is **deducted/added
   AS PAID, not future-valued to settlement** (the FV-to-settlement compounding step is removed
   entirely; a real financing-cost point belongs in PROSE, not a computed figure). `compounding_rate`
   is dropped from the K3 input schema. Instruction wording fixed too: the model answer now says
   **"buy N put/call options"**, never "sell N contracts" — an option HEDGE always BUYS (a put for a
   receipt, a call for a payment); selling/writing options is a different, higher-risk strategy.
   GATE 17 (currency-direction integrity) now takes an explicit CALLER-SUPPLIED `expectedSide`
   rather than deriving it from `instrumentSide()` internally, because options don't follow the
   futures/forward/swap buy-sell-by-direction convention — a hedge always buys an option regardless
   of receipt/payment.
3. **K4 direction + realism — parameter↔prose inversion (gate-invisible: no prior gate checked
   prose against the parameter at all; this is a NEW gate, not a hardened one).** The live K4 drill's
   scenario prose stated "LKR per JPY 1" while the code's `quote_direction` parameter was actually
   `foreign_per_home` (JPY per LKR) — the two didn't match, and the resulting rate (~0.72) was also
   unrealistic for LKR/JPY (real-world ≈ 2.0). Fixed by **re-homing K4's quote_direction to
   `home_per_foreign`** (matching the prose direction, LKR per JPY) with realistic magnitudes (swap
   2.03, residual forward 2.08). **NEW GATE 17b — quote-sentence structural integrity**: the
   scenario's quote-direction sentence is no longer authored freely by the model. `buildFxHedgeUserPrompt`
   now requires the model to place a literal `{{QUOTE_SENTENCE}}` placeholder in `context_text`;
   `draftFxHedgeOnce` REJECTS the response outright if the placeholder is missing, then injects the
   ONE canonical, code-generated sentence (`quoteDirectionSentence(dir, foreign, home)`) at that
   point — a parameter↔prose mismatch is now structurally impossible, not just detected. GATE 17b
   verifies the canonical sentence is present verbatim in the FINAL context_text (a regression lock
   on the injection MECHANISM itself, e.g. a missing placeholder slipping through).
   **A fourth, self-found issue surfaced while regenerating**: K1's original currency pairing (a
   US/USD company receiving a PEN receipt, quoted `foreign_per_home`) produced an inverted ~14×-wrong
   conversion once the model wrote the realistic framing (a Peruvian PEN-functional exporter
   receiving USD). Re-homed to `home_per_foreign` (PEN per USD — PEN is the objectively weaker
   currency, matching the pattern in both sourced conventions: Passmore's weak-R-per-strong-$ and
   Okan's weak-Y$-per-strong-€). **No gate caught this either** — GATE 17b only proves the sentence
   matches the parameter, not that the parameter is economically sane for the chosen pairing; this
   remains a HUMAN judgment call at authoring time (region/currency plan design), not a candidate for
   automation. Noted here for the reviewer's awareness, not journaled as a fourth numbered fix.

**All four drills regenerated from scratch after these fixes** (old ids fully deleted, not patched
in place — a schema-shape change, not a content edit). `test-fxhedge.ts` re-anchored: 5 new
regression-lock fixtures pin the OLD (wrong) formulas as MUST-FAIL cases, so neither defect class can
silently recur. 68/68 fixtures pass; tsc clean; `next build` green.

## Conventions — FETCHED, page-verified against local sources (2026-07-22), AS AMENDED by Fix Round 1
Evidence gathered by a dedicated research pass (see `ClaudeSend.txt` in that session, and
`APM_BUILD_CONTRACT.md` 2026-07-22/23 entries) before any code was written; two conventions revised
per Fix Round 1 above (marked ⚠):
- ⚠ **Lock-in rate via linear basis decay** — Passmore Co (AFM SD25 examiner's report, printed p.13):
  "calculated the lock-in rate correctly by using the spot price and deducting the futures price to
  calculate basis and then using the assumption that basis declines linearly to zero by the futures
  expiry date to adjust for unexpired basis." **Formula = `futures0 + unexpired_basis`** (Fix Round 1
  correction; the examiner's-report language alone doesn't disambiguate the two algebraic routes —
  the correction came from co-founder recompute, not a re-read of this same report).
- **Whole contracts only, residual immaterial by default** — Passmore Co (SD25 p.13): "Companies can
  only buy or sell whole contracts... use 40 contracts and not 40.4 contracts... the balance should
  be considered immaterial UNLESS... instructed otherwise." The instructed-override shape (forward
  top-up) is evidenced separately — Mahoney Co (AFM J24 examiner's report, p.5).
- **Full instruction set (direction + count + month)** — Northney Co (AFM SD24 examiner's report,
  p.5): "expected to provide a full set of instructions to the board and this includes the number of
  contracts and whether the contracts should be bought or sold."
- ⚠ **Option premium — ALL-IN, no time proration** (Fix Round 1: the previous `× months/12` was an
  unsourced import from Abertafol Co's interest-rate-options formula, D23 p.14 — instrument-neutral
  mechanics were assumed to transfer to currency options without a currency-options source
  confirming it). Passmore Co (SD25 p.13) sources the quoted-currency discipline and assume-exercised
  convention, but not the proration question. **Grant's documented fallback convention** (the SD25
  source that would settle this definitively is unfetchable): premium = premium% × contracts ×
  contract size, deducted/added as paid, undiscounted.
- **Money-market hedge, both directions** — F9 technical article "Foreign currency risk and its
  management" (accaglobal.com, section "6. Money market hedging", fetched 2026-07-22): receipt =
  borrow foreign at the foreign borrowing rate / convert at spot / deposit home at the home deposit
  rate ("X(1 + 0.66%/4) = 2,000,000... £1,358,210 (1 + 1.2%/4) = £1,362,285"), cross-checked against
  the SD2019 Okan Co official answer (Appendix 1, p.16, same three-step shape, receipt case). Payment
  = convert now / deposit foreign at the foreign deposit rate so it grows to the payable (mechanism
  only, no worked numbers sourced — the home-currency funding leg is an AUTHORED symmetric
  convention, flagged for recompute).
- **Swap covers only a stated proportion** — Mahoney Co (J24 p.7): "very few recognised that the
  swap rate would only account for a proportion of the cash to be received." Thinnest-evidenced kind
  of the four — flagged for recompute.
- **Quote direction genuinely varies** — Passmore quotes foreign-per-home; SD2019 Okan quotes
  home-per-foreign. `quote_direction` is therefore a per-drill parameter, never hardcoded, and is now
  STRUCTURALLY tied to the scenario prose (GATE 17b / `{{QUOTE_SENTENCE}}` injection — Fix Round 1).

## Family gates (GATES 15–19 + 17b, beyond the 6 base gates)
- **GATE 15** whole-contract integrity — contract count = round(exposure ÷ contract size); residual
  matches the drill's declared `residual_policy`.
- **GATE 16** basis-decay reconciliation (Fix Round 1 hardened) — unexpired basis = basis₀ ×
  (remaining/total months); lock-in = `futures0 + unexpired_basis`, cross-checked against the
  algebraically-equivalent `spot0 − expired_basis` route — the two must independently agree.
- **GATE 17** currency-direction integrity — every conversion reconciles to the DECLARED
  `quote_direction`; the instrument side matches an explicit, caller-supplied EXPECTED side (Fix
  Round 1: no longer derived internally via `instrumentSide()` for every kind — options always
  expect 'buy'). Catches a direction inversion either way (the canonical student error AND the
  canonical authoring error).
- **GATE 17b (NEW, Fix Round 1)** quote-sentence structural integrity — the canonical, code-generated
  quote-direction sentence must be present verbatim in `context_text`; a parameter↔prose mismatch is
  structurally prevented by the `{{QUOTE_SENTENCE}}` injection mechanism this gate regression-locks.
- **GATE 18** premium-currency check (Fix Round 1 corrected) — premium = premium% × contracts ×
  contract size, ALL-IN, no time proration; no needless extra currency conversion.
- **GATE 19** best-method verdict integrity — the recommended method is the computed best (highest
  guaranteed receipt / lowest cost), with the stated margin matching exactly.
All green on all four regenerated drills, alongside GATE 1/2/3 (self-consistency, figure integrity,
seeded-OFR) and P4/P5/P6/P8.

## Tolerance note (from the original authoring session, still current)
Two tolerance-scale bugs were found and fixed DURING generation (before any drill was inserted),
both from the same root cause — a tolerance calibrated for a different family's typical magnitudes
being reused without checking whether it fits this family's naturally SMALL figures:
1. `lock_in_rate`/`unexpired_basis` were briefly given a relative tolerance that a large constant
   (`spot0`/`futures0`) dominates, letting a real error in the small perturbable term hide — fixed
   with a tight ABSOLUTE tolerance and a `unit: 'rate'` label (so the tolerance lint's
   currency-symbol heuristic doesn't misclassify a rate as money and force a relative band).
2. `premium`/`premium_home` (renamed from `premium_home_fv` in Fix Round 1 — no FV step remains)
   were briefly given `international.ts`'s floor tolerance (0.2 floor, calibrated for that family's
   multi-million cash flows) — an fx-hedge premium is legitimately sub-1 in "millions" units, so the
   floor swallowed a genuine seeded error. Fixed with a plain relative tolerance (no floor) — no
   fx-hedge money component is ever legitimately near-zero.
Both are `lib/acca/fxhedge.ts`-local (`rateTol`, `premiumTol`, and a relative-only `moneyTol`),
proven by GATE 1 (self-consistency) AND a manual seeded-OFR replay for every kind during authoring.

## Kinds → ids → code-computed verdicts (POST-FIX ROUND 1 — all ids are NEW)
- **futures (K2)** `1528e10f-7106-44ad-a8b6-cb5bad57c855` — GHS 18.4m payment; 37 contracts (buy),
  lock-in **15.7580** (`futures0 + unexpired_basis`, the corrected formula), residual −0.1
  immaterial; outcome **GBP 1.2m**.
- **options (K3)** `359207f6-bb0a-41a8-904c-27c38dbf408e` — USD 8.4m receipt; **buy 17 put options**
  (never "sell"), premium JOD 0.0408m (0.48%, all-in, NO time proration, NOT future-valued), net
  outcome **JOD 6.0m**.
- **swap (K4)** `ba811dd0-7bf1-41fb-a467-f1ad82b6da2d` — JPY 480m payment; 72% swapped at LKR 2.03
  per JPY1 (LKR 701.6m) + 28% residual on the forward at LKR 2.08 per JPY1 (LKR 279.6m) = **LKR
  981.1m**. Quote direction re-homed to `home_per_foreign` to match the prose (Fix Round 1).
- **forward_mmh_compare (K1)** `51163dac-3b7b-4c5c-bd43-b2e362279a23` — USD 8.5m receipt; forward
  PEN 31.8m vs MMH PEN 32.7m; **MMH wins by PEN 0.9m**. Quote direction re-homed to `home_per_foreign`
  (PEN per USD) — the self-found currency-pairing fix.

## ⛔ CLOSED RULINGS — do NOT re-raise
- **Fix Round 1's three formula/direction corrections are RULED, not open questions** — do not
  re-propose the old lock-in formula, the old premium proration, or re-flag the K4/K1 quote
  directions as inconsistent with each other (K1/K4 are now `home_per_foreign`; K2 is
  `foreign_per_home` — DELIBERATELY, exercising both sourced conventions across the batch).
- **K2's residual policy is 'immaterial' (Passmore's default), not 'forward_topup'.** A known
  interaction (documented in `fxhedge.ts` next to `ResidualPolicy`) means `forward_topup` can
  near-cancel in GATE 3's generic seeded-OFR proof when the topup rate sits close to the lock-in
  rate — fixture-proven (`test-fxhedge.ts`) but not exercised in this live batch. Not a defect; a
  scoped decision. A future forward_topup drill needs a topup rate meaningfully different from the
  lock-in rate.
- **Forward rate (K1) is STATED, never IRP-derived by the student.** Matches every local citation —
  none of the sourced questions require the candidate to derive the forward. `deriveIrpForwardRate`
  exists in the engine as an optional teaching variant, not used in this batch.
- **Money-market hedge's home-currency funding leg on the PAYMENT side is an AUTHORED convention**
  (borrow home now, grow at the home borrowing rate to settlement, for a like-for-like comparison
  with the forward) — the F9 article states only the foreign-deposit mechanism, not this leg. Flagged
  for recompute confirmation, not asserted as independently sourced. (Not exercised as the PRIMARY
  path in K1 of this batch — K1 is a receipt, exercising the sourced/cross-checked receipt shape.)
- **Swap kind (K4) has the thinnest local evidence** (one Mahoney Co sentence). The mechanism
  (stated fraction × swap rate + residual × forward rate) is a direct, literal reading of that
  sentence, not an extrapolation — but flag any swap-market convention BEYOND that sentence
  (day-count, settlement mechanics) as unsourced if raised.
- **Option premium precision is 4dp, not the family-standard 1dp** — a deliberate display fix, not
  an inconsistency with other families' 1dp money display. A sub-1 premium at 1dp reads as a
  misleading "0.0m"; do not "fix" it back to 1dp.
- **E2b is the correct LO** (SYLLABUS_MAP, `scripts/afm-framework.ts`) — the quantitative FX-hedging
  outcome, covering (i) forward+MMH, (ii) SAFEs [not built], (iii) futures, (iv) swaps, (v) FOREX
  swaps [not built], (vi) options. SAFEs/FOREX swaps are named in the descriptor but not separately
  built — out of scope for this batch, not a gap in K1–K4's own coverage.
- **Netting is scenario TEXTURE only** (E2c, a separate mixed-mode LO, not wired) — do not ask why
  netting isn't a fifth kind.
- **The K2/K3 formula corrections are NOT independently source-verified** — flagged honestly above.
  If the reviewer has access to the SD25 sample-answers PDF (or any other primary source with
  Passmore Co's actual worked lock-in/premium figures), that would be the definitive confirmation;
  absent that, these stand on the co-founder's independent-recompute authority per standing project
  discipline, not as a closed factual question.

## Area-picker note (verified 2026-07-22, before authoring)
E is a brand-new top-level syllabus section for AFM. `isDirectLinkOnlyArea` (`lib/acca/paper.ts`)
only excludes Section A; the browse bucket/sort (`app/api/acca/areas/route.ts`,
`app/acca/page.tsx`) has no hardcoded section list — E2 buckets and sorts cleanly. Entry ranks added
to `lib/acca/area-entry.ts` (70–73, forward+MMH first) — MAP-BEFORE-CLOSE done.

**Review method:** fresh model, no project context, AFM syllabus PDF attached; recompute EVERY
figure in ALL FOUR drills from the raw inputs. Hunt for a semantic error a gate cannot catch: a
lock-in rate computed from the wrong basis sign, a premium in the wrong currency despite GATE 18, a
swap residual converted at the swap rate instead of the forward rate, a money-market leg using the
wrong currency's rate, a recommendation that doesn't match the board's actual best interest given
the direction (receipt wants highest, payment wants lowest), scenario-fact drift, an invented
banking regulation or named statute, AND — the class Fix Round 1 surfaced — whether a stated rate is
economically realistic for the actual currency pairing (check real-world FX magnitude, not just
internal arithmetic consistency).

---

## Drill — futures (K2) · `1528e10f-7106-44ad-a8b6-cb5bad57c855`
- LO E2b · mode quantitative · command_verb "evaluate" · marks_guide 15 · Ghana / UK cocoa importer
  with a GHS payment

**Question:** Evaluate the currency-futures hedge available to Thornfield Cocoa Processing plc for
its forthcoming GHS payment to Adinkra Agri-Exports Ltd, providing full trading instructions and a
justified recommendation on whether to proceed with the futures hedge.

**Context:** Thornfield Cocoa Processing plc (UK, GBP-functional) sources cocoa mass from Adinkra
Agri-Exports Ltd (Ghana). In three months, Thornfield must pay GHS 18.4 million — an outgoing GHS
obligation. The Finance Director asserts futures "always the safest hedge because they eliminate
basis risk entirely," a claim the scenario itself contradicts (settlement falls before futures
expiry, so unexpired basis genuinely remains). Rates quoted GHS per GBP 1.

Raw inputs: exposure GHS 18.4m payment; spot 15.62; futures 15.85; contract size GHS 0.5m; months to
expiry 5; months to transaction 3.

**Model answer:** 18.4 ÷ 0.5 = 36.8 → **37 contracts** (buy — a payment must buy), hedging GHS 18.5m;
residual −GHS 0.1m immaterial. Basis₀ = 15.62 − 15.85 = −0.23; unexpired at month 3 (2 of 5 months
remaining) = −0.23 × 2/5 = −0.092; **lock-in = futures₀ 15.85 + (−0.092) = 15.758** (Fix Round 1
formula). Outcome: GHS 18.5m ÷ 15.758 = **GBP 1.174m ≈ GBP 1.2m**. Advice: basis-decay is an
assumption not a certainty (directly rebuts the FD's "eliminates basis risk entirely" — the scenario
itself structurally guarantees unexpired basis remains, since settlement precedes expiry), margin-call
liquidity risk, thin-market execution risk, a call for the equivalent forward quote as a cross-check.

**Gates:** 1 PASS (5 components) · 2 PASS · 3 PASS (contracts/unexpired_basis seeded roots verdict
incorrect; lock_in_rate/home_from_futures/home_settlement verdict carried) · 4–7 PASS · 15 PASS
(37 = round(18.4/0.5); residual policy immaterial, home_from_residual = 0) · 16 PASS (unexpired basis
and lock-in reconcile to the CORRECTED linear-decay formula; the two-route self-check agrees) · 17
PASS (buy matches payment exposure) · 17b PASS (canonical GHS-per-GBP sentence present verbatim) · 19
N/A (single-method drill, no comparison table).

---

## Drill — options (K3) · `359207f6-bb0a-41a8-904c-27c38dbf408e`
- LO E2b · mode quantitative · command_verb "evaluate" · marks_guide 15 · Jordan / JOD-functional
  pharma manufacturer with a USD receipt (home-per-foreign quote — exercises the Okan-sourced
  direction)

**Question:** Evaluate the currency options hedge available to Najoom Pharma for its USD export
receipt, including a calculation of the guaranteed outcome, and recommend whether the board should
proceed with this strategy.

**Context:** Najoom Pharma JOD (Jordan, JOD-functional) expects a USD-denominated settlement in ~5
months from Gulf Pharma Distribution LLC (UAE). The CFO asserts a forward is always superior because
"options premiums make them uncompetitive." Rates quoted JOD per USD 1 (home per foreign). Premium
stated in JOD (home), all-in for the option's life, no time proration, undiscounted at trade date —
consistent with the FIX ROUND 1 corrected convention.

Raw inputs: exposure USD 8.4m receipt; spot 0.7085; strike JOD 0.7120/USD1; contract size USD 0.5m;
premium 0.48% (decimal fraction, all-in); months to transaction 5.

**Model answer:** 8.4 ÷ 0.5 = 16.8 → **buy 17 put options** (never "sell N contracts" — Fix Round 1
wording fix; a put gives the right to SELL USD, which is what a USD receipt needs). Premium = 0.48% ×
17 × 0.5 = **JOD 0.0408m**, all-in, NO time proration, deducted as paid (NOT future-valued — Fix
Round 1). Exercise outcome: 17×0.5 = USD 8.5m at strike 0.7120 = **JOD 6.052m**. Net = 6.052 − 0.0408
= **JOD 6.0112m ≈ JOD 6.0m**. Advice: tests the CFO's blanket claim against the actual optionality-vs-
premium trade-off (options preserve upside a forward forecloses), exchange-traded margin/clearing
mechanics, expiry-vs-settlement alignment risk.

**Gates:** 1 PASS (5 components) · 2 PASS (4dp premium display, genuinely present, not a coincidental
substring match) · 3 PASS (contracts verdict incorrect as root; premium/premium_home/home_from_strike/
home_settlement verdict carried) · 4–7 PASS · 18 PASS (all-in premium formula reconciles exactly, NO
proration factor) · 17 PASS (option ALWAYS expects 'buy', explicitly — Fix Round 1's `expectedSide`
parameter, not derived from `instrumentSide`) · 17b PASS (canonical JOD-per-USD sentence present
verbatim).

---

## Drill — swap (K4) · `ba811dd0-7bf1-41fb-a467-f1ad82b6da2d`
- LO E2b · mode quantitative · command_verb "evaluate" · marks_guide 15 · Sri Lanka / LKR-functional
  tea exporter with a JPY equipment-financing payment (quote direction RE-HOMED to `home_per_foreign`
  in Fix Round 1, to match the prose and produce a realistic LKR/JPY magnitude)

**Question:** Evaluate the currency swap hedge available to Ceylonica Tea Group for its JPY
equipment-financing payment, including treatment of the un-swapped residual at the prevailing forward
rate, and recommend whether the board should proceed with the arrangement.

**Context:** Ceylonica Tea Group (Sri Lanka, LKR-functional) must pay Miyamoto Agricultural Equipment
Co. (Japan) JPY 480 million in six months. A Colombo bank offers a swap covering only a proportion of
the flow; the finance director asserts the swap is "unquestionably the optimal hedge in all
circumstances" — directly contradicted by the bank's own acknowledged partial coverage. Rates quoted
LKR per JPY 1 (realistic magnitude, ≈2.0).

Raw inputs: exposure JPY 480m payment; swap fraction 72%; swap rate LKR 2.03/JPY1; residual forward
rate LKR 2.08/JPY1.

**Model answer:** 72% × 480 = **JPY 345.6m** swapped, converted at 2.03 = **LKR 701.568m ≈ LKR
701.6m**. Residual JPY 134.4m (28%) hedged on the forward at 2.08 = **LKR 279.552m ≈ LKR 279.6m**.
Total = **LKR 981.12m ≈ LKR 981.1m**. Advice directly rebuts the FD's "optimal in all circumstances"
claim (only 72% is actually covered), flags OTC counterparty risk on the swap leg, residual-forward
firmness, and calls for the alternative structures (full forward, MMH) to be tested before
authorisation.

**Gates:** 1 PASS (4 components) · 2 PASS · 3 PASS (swapped_amount verdict incorrect as root;
home_from_swap/home_settlement verdict carried) · 4–7 PASS · 17 PASS (×2, swap leg + residual leg,
`home_per_foreign` direction) · 17b PASS (canonical LKR-per-JPY sentence present verbatim, matching
the re-homed parameter) · 19 N/A (single-method drill with a residual, not an all-methods comparison
table).

---

## Drill — forward_mmh_compare (K1) · `51163dac-3b7b-4c5c-bd43-b2e362279a23`
- LO E2b · mode quantitative · command_verb "evaluate and recommend" · marks_guide 15 · Peru /
  PEN-functional agricultural exporter with a USD receipt (quote direction RE-HOMED to
  `home_per_foreign` — the self-found currency-pairing fix, see Fix Round 1 above)

**Question:** Evaluate the forward exchange contract and the money-market hedge as alternative
strategies for managing Campiña Andina S.A.'s USD 8.5 million export receipt, and recommend which
strategy the board should adopt.

**Context:** Campiña Andina S.A. (Peru, PEN-functional) will receive USD 8.5 million in five months
from AgriSource LLC (US). The Finance Director asserts the forward is "always the simpler and
superior hedge," a claim the board should test rather than accept given the PEN/USD interest-rate
differential. Rates quoted PEN per USD 1 (realistic magnitude, ≈3.7–3.8).

Raw inputs: exposure USD 8.5m receipt; spot PEN 3.82/USD1; forward PEN 3.74/USD1 (5-month, stated);
USD borrow 5.5% / deposit 4.0%; PEN borrow 9.5% / deposit 7.5%.

**Model answer:** Forward: USD 8.5 × 3.74 = **PEN 31.79m ≈ PEN 31.8m**. MMH: borrow USD 8.3096m today
(USD 8.5 ÷ (1+5.5%×5/12)) → convert at spot 3.82 to PEN 31.743m → grow at PEN deposit 7.5% for 5
months → **PEN 32.735m ≈ PEN 32.7m**. **MMH wins by PEN 0.945m ≈ PEN 0.9m** — recommended. Advice
tests the FD's blanket claim against the actual interest-differential-driven outcome, OTC-forward
counterparty risk (indicative until a master agreement is signed), USD-borrowing-access risk for a
non-resident, and PEN deposit-rate achievability.

**Gates:** 1 PASS (4 components, OFR-wired) · 2 PASS · 3 PASS (seeded-OFR: forward_home/
mmh_foreign_now verdict incorrect as roots; mmh_home_now/mmh_home_settlement verdict carried) · 4–7
PASS · 17 PASS (×2, forward leg + MMH spot leg, `home_per_foreign` direction) · 17b PASS (canonical
PEN-per-USD sentence present verbatim, matching the re-homed parameter) · 19 PASS (best method = MMH,
margin reconciles).

---

## NEXT
A FRESH co-founder independent recompute against THIS regenerated pack (the ids above are new; the
previous review cycle's ids no longer exist) → blind adversarial review (this pack, CLOSED RULINGS
present) → adjudicate → flip by explicit-id SQL (reconcile-before-flip; E2b is a brand-new LO so the
reconcile is trivially clean — 0 prior E-section rows of any status). **STOP called here per the
task's own instruction — no flip, no publish, no student walk performed. This is the pack.**
