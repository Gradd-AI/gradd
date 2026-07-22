# AFM FX-hedging batch — blind adversarial review pack

**Calculator #11: FX hedging (`lib/acca/fxhedge.ts`). 4 drills, `paper_code=AFM`, `lo_code=E2b`. GENERATED + GATED 2026-07-22 (`status=candidate`, `published=false`) — awaiting co-founder independent recompute + blind adversarial review before any flip. FIRST family in AFM section E.**

Doctrine: code owns EVERY figure AND every figure-vs-figure verdict (including which hedge method
wins, and by how much) — the model authored PROSE only. The calculator composes
`parityDifferential` from `international.ts` ONE-WAY (no back-imports) for the optional IRP-derived
forward; every sourced example gives the forward rate directly, so the primary K1 path takes
`forward_rate` as a stated input. `quote_direction` (foreign-per-home vs home-per-foreign) and
`residual_policy` (immaterial vs forward-topup) are parameterised PER DRILL and code-decided (never
model-chosen) — see Step-0 ruling below.

## Conventions — FETCHED, page-verified against local sources (2026-07-22)
Evidence gathered by a dedicated research pass (see `ClaudeSend.txt` in that session, and
`APM_BUILD_CONTRACT.md` 2026-07-22 entries) before any code was written:
- **Lock-in rate via linear basis decay** — Passmore Co (AFM SD25 examiner's report, printed p.13):
  "calculated the lock-in rate correctly by using the spot price and deducting the futures price to
  calculate basis and then using the assumption that basis declines linearly to zero by the futures
  expiry date to adjust for unexpired basis."
- **Whole contracts only, residual immaterial by default** — Passmore Co (SD25 p.13): "Companies can
  only buy or sell whole contracts... use 40 contracts and not 40.4 contracts... the balance should
  be considered immaterial UNLESS... instructed otherwise." The instructed-override shape (forward
  top-up) is evidenced separately — Mahoney Co (AFM J24 examiner's report, p.5).
- **Full instruction set (direction + count + month)** — Northney Co (AFM SD24 examiner's report,
  p.5): "expected to provide a full set of instructions to the board and this includes the number of
  contracts and whether the contracts should be bought or sold."
- **Option premium formula, quoted-currency discipline, assume-exercised** — Passmore Co (SD25 p.13,
  premium/currency discipline) + Abertafol Co (AFM D23 examiner's report, p.14, the formula:
  "0.298% x 60 x $500,000 x 3/12" — instrument-neutral interest-rate-options mechanics, shared with
  currency options).
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
  home-per-foreign. `quote_direction` is therefore a per-drill parameter, never hardcoded.

## Family gates (GATES 15–19, beyond the 6 base gates)
- **GATE 15** whole-contract integrity — contract count = round(exposure ÷ contract size); residual
  matches the drill's declared `residual_policy`.
- **GATE 16** basis-decay reconciliation — unexpired basis = basis₀ × (remaining/total months); lock-in
  = spot₀ − unexpired basis.
- **GATE 17** currency-direction integrity — every conversion reconciles to the DECLARED
  `quote_direction`; the instrument side (buy/sell) matches the exposure direction. Catches a
  direction inversion either way (the canonical student error AND the canonical authoring error).
- **GATE 18** premium-currency check — premium = premium% × contracts × contract size × months/12,
  no needless extra conversion.
- **GATE 19** best-method verdict integrity — the recommended method is the computed best (highest
  guaranteed receipt / lowest cost), with the stated margin matching exactly.
All green on all four drills, alongside GATE 1/2/3 (self-consistency, figure integrity, seeded-OFR)
and P4/P5/P6/P8.

## Tolerance note (a genuine authoring-time finding, not a live defect)
Two tolerance-scale bugs were found and fixed DURING generation (before any drill was inserted),
both from the same root cause — a tolerance calibrated for a different family's typical magnitudes
being reused without checking whether it fits this family's naturally SMALL figures:
1. `lock_in_rate`/`unexpired_basis` were briefly given a relative tolerance that a large constant
   (`spot0`) dominates, letting a real error in the small perturbable term hide — fixed with a tight
   ABSOLUTE tolerance and a `unit: 'rate'` label (so the tolerance lint's currency-symbol heuristic
   doesn't misclassify a rate as money and force a relative band).
2. `premium`/`premium_home_fv` were briefly given `international.ts`'s floor tolerance (0.2 floor,
   calibrated for that family's multi-million cash flows) — an fx-hedge premium is legitimately
   sub-1 in "millions" units, so the floor swallowed a genuine seeded error. Fixed with a plain
   relative tolerance (no floor) — no fx-hedge money component is ever legitimately near-zero.
Both are now `lib/acca/fxhedge.ts`-local (`rateTol`, `premiumTol`, and a relative-only `moneyTol`),
proven by GATE 1 (self-consistency) AND a manual seeded-OFR replay for every kind during authoring.

## Kinds → ids → code-computed verdicts
- **forward_mmh_compare (K1)** `fd0ba548-1b5c-4311-87ee-40b57e4018bf` — PEN 8.5m receipt; forward
  USD 2.3m vs MMH USD 2.2m; **forward wins by USD 0.1m** (a real, non-razor-thin margin).
- **futures (K2)** `93fc30f7-87c1-4341-a328-acc6951e999c` — GHS 8.5m payment; 43 contracts (buy),
  lock-in 15.5200, residual −0.1 immaterial; outcome **GBP 0.6m**.
- **options (K3)** `001c8b07-f193-47ee-a4cd-bcf211451e7d` — USD 8.5m receipt; 12 contracts (sell),
  premium JOD 0.0100m (0.285%), net outcome **JOD 5.9m**.
- **swap (K4)** `13882862-b16a-4713-a4b5-fa9a27b552b2` — JPY 1,800m payment; 72% swapped at 0.7240
  (LKR 1790.1m) + 28% residual on the forward at 0.7510 (LKR 671.1m) = **LKR 2461.2m**.

## ⛔ CLOSED RULINGS — do NOT re-raise
- **Quote direction is per-drill, never a single house convention.** K1/K2/K4 are foreign-per-home;
  K3 is home-per-foreign, DELIBERATELY, to exercise both sourced conventions. Do not flag the
  inconsistency across drills as an error.
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
- **Premium precision is 4dp, not the family-standard 1dp** (`money4` helper in
  `buildOptionsModelAnswer`) — a deliberate display fix, not an inconsistency with other families'
  1dp money display. A sub-1 premium at 1dp reads as a misleading "0.0m"; do not "fix" it back to 1dp.
- **E2b is the correct LO** (SYLLABUS_MAP, `scripts/afm-framework.ts`) — the quantitative FX-hedging
  outcome, covering (i) forward+MMH, (ii) SAFEs [not built], (iii) futures, (iv) swaps, (v) FOREX
  swaps [not built], (vi) options. SAFEs/FOREX swaps are named in the descriptor but not separately
  built — out of scope for this batch, not a gap in K1–K4's own coverage.
- **Netting is scenario TEXTURE only** (E2c, a separate mixed-mode LO, not wired) — do not ask why
  netting isn't a fifth kind.

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
banking regulation or named statute.

---

## Drill — forward_mmh_compare (K1) · `fd0ba548-1b5c-4311-87ee-40b57e4018bf`
- LO E2b · mode quantitative · command_verb "evaluate" · marks_guide 15 · Peru / USD-functional
  agricultural trader with a PEN receipt

**Question:** Evaluate the forward exchange hedge and the money-market hedge available to Andean
Harvest Corp for its PEN 8.5 million receipt due in five months, and recommend which strategy the
board should adopt.

**Context:** Andean Harvest Corp is a US-incorporated agricultural-commodities trading house that
exports premium quinoa and amaranth grain to Peruvian processors, invoicing in Peruvian sol (PEN).
Its largest Peruvian buyer, Grupo Alimentario del Sur SAC, is contractually obliged to remit PEN 8.5
million in five months' time, creating a PEN receipt exposure on Andean Harvest Corp's USD-functional
books. All exchange rates at the appraisal date are quoted as PEN per USD 1, so a higher rate means
more sol per dollar. The Chief Financial Officer has asserted that "the forward contract is always
the simpler and superior instrument for a receipt of this size — the money-market route introduces
unnecessary counterparty risk from a Peruvian bank and should be dismissed without calculation";
this claim is accepted here as a testable proposition, not a settled conclusion, since basis risk
and counterparty risk also attach to OTC forward contracts with the same Peruvian banking
counterparty, and the money-market hedge effectively replicates a forward at market-implied rates
that may differ materially from the quoted forward.

Raw inputs: exposure PEN 8.5m receipt, 5 months; spot PEN 3.72/USD1; forward PEN 3.68/USD1 (5-month,
stated); PEN borrow 9.0% / deposit 6.5%; USD borrow 5.5% / deposit 3.8%.

**Model answer** (Steps 1–4 + reconciliation): Forward = USD 2.3097...m ≈ **USD 2.3m**. MMH: borrow
PEN 8.1928m today → convert at spot to USD 2.2024m → grow at 3.8% for 5 months → **USD 2.2372m ≈
USD 2.2m**. Forward wins by USD 0.07m ≈ **USD 0.1m** — recommended. Advice challenges the CFO's
counterparty-risk dismissal (the OTC forward carries the SAME counterparty risk with the same bank),
flags non-resident PEN-borrowing access, and raises single-obligor payment risk.

**Gates:** 1 PASS (4 components, OFR-wired) · 2 PASS · 3 PASS (seeded-OFR: forward_home/mmh_foreign_now
verdict incorrect as roots; mmh_home_now/mmh_home_settlement verdict carried) · 4–7 PASS · 17 PASS
(×2, forward leg + MMH spot leg) · 19 PASS (best method = forward, margin reconciles).

---

## Drill — futures (K2) · `93fc30f7-87c1-4341-a328-acc6951e999c`
- LO E2b · mode quantitative · command_verb "evaluate" · marks_guide 15 · Ghana / UK cocoa importer
  with a GHS payment

**Question:** Evaluate the currency futures hedge available to Crestmoor Foods plc for its GHS
payment obligation to Asante Cocoa Processors Ltd, stating the full hedge instruction (direction,
number of contracts, and contract month), the resulting guaranteed outcome, and a recommendation on
whether the board should proceed with this hedge.

**Context:** Crestmoor Foods plc (UK, GBP-functional) sources cocoa paste from Asante Cocoa
Processors Ltd (Ghana). In three months, Crestmoor must pay GHS 8.5 million — an outgoing GHS
obligation funded from GBP cash flows. The Finance Director asserts futures "eliminate all risk,"
ignoring basis risk and daily margin calls. Rates quoted GHS per GBP 1.

Raw inputs: exposure GHS 8.5m payment; spot 15.42; futures (December contract) 15.67; contract size
GHS 0.2m; months to expiry 5; months to transaction 3.

**Model answer:** 8.5 ÷ 0.2 = 42.5 → **43 contracts** (buy — a payment must buy), hedging GHS 8.6m;
residual −GHS 0.1m immaterial. Basis₀ = 15.42 − 15.67 = −0.25; unexpired at month 3 (2 of 5 months
remaining) = −0.25 × 2/5 = −0.10; lock-in = 15.42 − (−0.10) = **15.52**. Outcome: GHS 8.6m ÷ 15.52 =
**GBP 0.554m ≈ GBP 0.6m**. Advice: basis-decay is an assumption not a certainty (directly rebuts the
FD's "eliminates all risk"), thin-market execution risk, margin-call liquidity, and a call for the
equivalent forward quote as a cross-check.

**Gates:** 1 PASS (5 components) · 2 PASS · 3 PASS (contracts/unexpired_basis seeded roots verdict
incorrect; lock_in_rate/home_from_futures/home_settlement verdict carried) · 4–7 PASS · 15 PASS
(43 = round(8.5/0.2); residual policy immaterial, home_from_residual = 0) · 16 PASS (unexpired basis
and lock-in reconcile to the linear-decay formula) · 17 PASS (buy matches payment exposure) · 19 N/A
(single-method drill, no comparison table).

---

## Drill — options (K3) · `001c8b07-f193-47ee-a4cd-bcf211451e7d`
- LO E2b · mode quantitative · command_verb "evaluate and recommend" · marks_guide 15 · Jordan /
  JOD-functional pharma manufacturer with a USD receipt (home-per-foreign quote — exercises the
  Okan-sourced direction)

**Question:** Evaluate the currency options hedge available to Hayat Pharma Co for its forthcoming
USD receipt from MedBridge Distribution, compute the guaranteed outcome net of the option premium,
and recommend whether the board should adopt this strategy.

**Context:** Hayat Pharma Co (Jordan, JOD-functional) expects USD 8.5 million in ~5 months from
MedBridge Distribution LLC (US). The CFO asserts options are "never optimal" because the premium
always outweighs the flexibility benefit. Rates quoted JOD per USD 1 (home per foreign). Premium
denominated in JOD (home).

Raw inputs: exposure USD 8.5m receipt; contract size USD 0.7m; strike JOD 0.7080/USD1; premium
0.00285 (decimal fraction); months to transaction/covered 5; compounding rate 5.8%.

**Model answer:** 8.5 ÷ 0.7 = 12.1 → **12 contracts** (sell — a receipt must sell). Premium =
0.285% × 12 × 0.7 × 5/12 = **JOD 0.00998m ≈ JOD 0.0100m** (displayed at 4dp — a sub-1 premium at 1dp
would misleadingly read "0.0m"). Exercise outcome: 12×0.7 = USD 8.4m at strike 0.7080 = **JOD
5.9472m**. Premium FV to settlement (5.8%, 5 months) = **JOD 0.01022m**; deducted (receipt) =
**JOD 5.9370m ≈ JOD 5.9m**. Advice: residual from contract rounding, exchange-traded margin-call
liquidity, tests the CFO's claim against the scenario's own optionality-vs-premium trade-off,
counterparty timing risk on the underlying USD receipt itself.

**Gates:** 1 PASS (5 components) · 2 PASS (genuinely — 4dp premium display, not a coincidental
substring match) · 3 PASS (contracts verdict incorrect as root; premium/premium_home_fv/
home_from_strike/home_settlement verdict carried) · 4–7 PASS · 18 PASS (premium formula reconciles
exactly) · 17 PASS (sell matches receipt exposure; home-per-foreign strike conversion reconciles).

---

## Drill — swap (K4) · `13882862-b16a-4713-a4b5-fa9a27b552b2`
- LO E2b · mode quantitative · command_verb "evaluate" · marks_guide 15 · Sri Lanka / LKR-functional
  tea exporter with a JPY equipment-financing payment

**Question:** Evaluate the currency swap offered to Dilmah Highland Exports Ltd for its JPY
equipment-financing payment, including the treatment of the un-swapped residual, and recommend
whether the board should accept the swap arrangement.

**Context:** Dilmah Highland Exports Ltd ("DHE", Sri Lanka, LKR-functional) must pay Kyoto
Agri-Machinery Co. Ltd (Japan) in JPY in three months for new processing equipment. Rates quoted LKR
per JPY 1. The CFO asserts the swap is "unquestionably superior because it locks in a known rate for
the entire payment" — directly contradicted by the swap covering only a stated proportion (the
Mahoney Co teaching point).

Raw inputs: exposure JPY 1,800m payment; swap fraction 72%; swap rate LKR 0.7240/JPY1; residual
forward rate LKR 0.7510/JPY1 (three-month).

**Model answer:** 72% × 1,800 = **JPY 1,296m** swapped, converted at 0.7240 = **LKR 1790.06m ≈ LKR
1790.1m**. Residual JPY 504m (28%) does not benefit from the swap rate, hedged on the forward at
0.7510 = **LKR 671.11m ≈ LKR 671.1m**. Total = **LKR 2461.16m ≈ LKR 2461.2m**. Advice directly rebuts
the CFO's "entire payment" claim, flags OTC counterparty risk on the swap leg (no collateral
mentioned), timing/execution risk on the residual forward, and a tenor-mismatch check against the
actual invoice date.

**Gates:** 1 PASS (4 components) · 2 PASS · 3 PASS (swapped_amount verdict incorrect as root;
home_from_swap/home_settlement verdict carried) · 4–7 PASS · 17 PASS (×2, swap leg + residual leg) ·
19 N/A (single-method drill with a residual, not an all-methods comparison table).

---

## NEXT
Co-founder independent recompute → blind adversarial review (this pack, CLOSED RULINGS present) →
adjudicate → flip by explicit-id SQL (reconcile-before-flip; E2b is a brand-new LO so the reconcile
is trivially clean — 0 prior E-section rows of any status). **STOP called here per the task's own
instruction — no flip, no publish, no student walk performed. This is the pack.**
