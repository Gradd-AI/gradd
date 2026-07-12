# AFM — Batch 2 (IRR / MIRR, B1c) — ROUND-2 DELTA

**Round-2 delta — verify the round-1 fixes applied cleanly, figures unchanged.** Only the AMENDED fields are shown; everything else in each drill (and Drill 3, non-conventional, entirely) is unchanged from the round-1 pack `docs/reviews/AFM_IRR_BATCH2_REVIEW_PACK.md`. Round-1 findings 1–5 accepted; **finding 6 rejected** (existing text already subordinates the MIRR aside — no change). **All computed figures are identical to round 1** — this pass verifies prose fixes only.

Quick checklist as you read:
- **Drill 4 (conflict):** decision states the FUNDING CHOICE (names the winner), never a bare "should be accepted"; table rows labelled **Line A / Line B**; advice invents no demand assumption (verify residual + same-basis only).
- **Drill 2 (MIRR):** "stated reinvestment rate" everywhere (no "actual"/"realistic rate" phrasing); the context texture and the reveal separate cash-QUANTITY risk from reinvestment-RATE risk.
- **Drill 1 (standard):** hint no longer asks about a sensitivity margin (which isn't graded).

---

## DRILL 1 (standard IRR — UK offshore wind) — `796651c2-8373-4d97-b0dd-58b74e7d7b5e`
**Amended: `hint` (FIX 5 — sensitivity-margin question removed).**

### hint
A return above the hurdle is the start of the advice, not the end — have you challenged whether the operating cash-flow assumptions and the 10% cost of capital are reliable enough before treating the 11.97% IRR as a safe accept signal?

---

## DRILL 2 (MIRR — Australian lithium processing) — `83b537bd-cc75-4307-8d07-d53f921973da`
**Amended: `context_text` (FIX 4 — texture (1) separates the two risks), `model_answer` (FIX 3 — MIRR reinvestment phrasing), `full_reveal` (FIX 3 + FIX 4).**

### context_text
Pilbara Lithium Processing Ltd refines spodumene concentrate into battery-grade lithium hydroxide in Western Australia, selling under a mix of offtake contracts and spot sales. The board is evaluating the Karratha expansion — a new refining train that lifts throughput to meet contracted demand.

Raw inputs (all monetary figures in AUD millions):
- Initial capital outlay (Time 0): AUD 120.0 m; of which capital qualifying for tax-allowable depreciation: AUD 115.0 m at 20% reducing balance
- Pre-tax operating cash flows (REAL, today's purchasing power): Year 1 AUD 42.0 m; Year 2 AUD 54.0 m; Year 3 AUD 57.0 m; Year 4 AUD 50.0 m
- Residual/scrap value (end of Year 4, nominal): AUD 16.0 m — provided by management, not independently valued
- General inflation rate: 3.0%; corporate tax rate: 30%; tax paid in the year the profit arises; cost of capital: 11.0%; assumed reinvestment rate for interim cash flows: 11.0%

Challengeable textures. (1) The strong early cash flows depend partly on spot-exposed volumes in a volatile lithium market, so the cash-flow forecast itself should be stress-tested. Separately, the IRR assumes interim inflows are reinvested at the IRR itself — the reason MIRR uses the stated 11.0% rate instead. (2) The residual value assumes a functioning secondary market for specialised refining plant at the end of the horizon.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.

### model_answer
**Investment appraisal — internal rate of return**

**Assumptions:** cash flows are in money (nominal) terms; operating cash flows are inflated at 3.00% a year; tax at 30.00% is charged on operating cash flow less tax-allowable depreciation and paid in the year the profit arises; tax-allowable depreciation is 20.00% reducing balance with a balancing allowance/charge on disposal in year 4; the cost of capital is 11.00%.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | AUD 23.0m |
| 2 | AUD 18.4m |
| 3 | AUD 14.7m |
| 4 | AUD 42.9m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | AUD 43.3m | AUD 23.0m | AUD 20.3m | AUD 6.1m |
| 2 | AUD 57.3m | AUD 18.4m | AUD 38.9m | AUD 11.7m |
| 3 | AUD 62.3m | AUD 14.7m | AUD 47.6m | AUD 14.3m |
| 4 | AUD 56.3m | AUD 42.9m | AUD 13.4m | AUD 4.0m |

**Step 3 — Net cash flows**

| Period | Net cash flow |
|--------|------|
| 0 | AUD -120.0m |
| 1 | AUD 37.2m |
| 2 | AUD 45.6m |
| 3 | AUD 48.0m |
| 4 | AUD 68.3m |

**Step 4 — Internal rate of return (linear interpolation)**

NPV at 20.00% = AUD 3.4m; NPV at 25.00% = AUD -8.5m.

**IRR ≈ 20.00% + AUD 3.4m/(AUD 3.4m − AUD -8.5m) × (25.00% − 20.00%) = 21.42%.**

**Step 5 — Modified internal rate of return**

Terminal value of inflows, reinvested at 11.00% = AUD 228.6m; PV of outflows = AUD 120.0m.

**MIRR = (AUD 228.6m / AUD 120.0m)^(1/4) − 1 = 17.48%.**

The IRR of 21.42% overstates the return because it implicitly assumes interim cash flows are reinvested at the IRR itself; MIRR reinvests them at the stated 11.00% reinvestment rate — a more realistic assumption than the IRR itself — and is the sounder ranking measure.

**Step 6 — Decision**

The MIRR of 17.48% exceeds the 11.00% cost of capital, so on these assumptions the project **adds shareholder value and should be accepted**.

**Step 7 — Advice to the board**

On these assumptions the return clears the hurdle; a positive signal is a floor, not a mandate, so the recommendation is conditional on the following assumptions holding.

The board should not read the headline internal rate of return as the achievable return: it implicitly assumes every interim cash flow is reinvested at the internal rate itself, which for a project throwing off strong early cash is unrealistic — the modified internal rate of return, which reinvests those flows at the stated reinvestment rate, is the sounder basis for the decision and the figure the board should weigh against the cost of capital. The operating cash flows themselves are the most fragile input: a meaningful share of volume is spot-exposed in a market that has been volatile, so the board should require a downside case at a softer realised price before committing the outlay. The residual value is a management figure resting on a working secondary market for specialised plant, which the board should have independently valued. Before treating the depreciation timing as settled, the board should confirm the correct tax classification of the refining-train assets.

*Reconciliation: NPV at 20.00% AUD 3.4m and at 25.00% AUD -8.5m bracket the IRR 21.42%.*

### full_reveal
The dominant misconception is trusting the internal rate of return as the return the company will actually earn. Its hidden assumption is that every interim cash flow is reinvested at the internal rate — for a project with strong early cash and a high internal rate, that overstates the achievable return. The modified internal rate of return fixes exactly this: it compounds the interim inflows forward to the end of the horizon at the stated reinvestment rate, discounts the outflows to today, and takes the rate that links them — so it is the sounder ranking and decision measure, and it is what the board should compare to the cost of capital. The second trap conflates two distinct risks: the cash-flow forecast is exposed to volatile spot volumes and should be stress-tested for quantity, which is separate from the reinvestment-rate assumption that MIRR corrects — challenging how much cash there is is not the same as challenging the rate it is reinvested at. On the mechanics, if your net cash flows or terminal value differ from the model, carry your own figures consistently into the modified rate — where the method is right the marks still score, and the error is charged once at its source.

---

## DRILL 4 (IRR-vs-NPV conflict — US two-plant) — `712cf3aa-320a-4612-89aa-024537c7cb80`
**Amended: `model_answer` (FIX 1 — Step 6 decision states the funding choice + Step 5 Line A/Line B labels; FIX 2 — Step 7 advice: verify residual + same-basis, no invented demand assumption).**

### model_answer
**Investment appraisal — internal rate of return**

**Assumptions:** cash flows are in money (nominal) terms; operating cash flows are inflated at 2.50% a year; tax at 21.00% is charged on operating cash flow less tax-allowable depreciation and paid one year in arrears; tax-allowable depreciation is 20.00% reducing balance with a balancing allowance/charge on disposal in year 4; the cost of capital is 10.00%.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | USD 5.6m |
| 2 | USD 4.5m |
| 3 | USD 3.6m |
| 4 | USD 10.3m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | USD 15.4m | USD 5.6m | USD 9.8m | USD 2.1m |
| 2 | USD 16.8m | USD 4.5m | USD 12.3m | USD 2.6m |
| 3 | USD 12.9m | USD 3.6m | USD 9.3m | USD 2.0m |
| 4 | USD 8.8m | USD 10.3m | USD -1.5m | USD -0.3m |

**Step 3 — Net cash flows**

| Period | Net cash flow |
|--------|------|
| 0 | USD -30.0m |
| 1 | USD 15.4m |
| 2 | USD 14.8m |
| 3 | USD 10.3m |
| 4 | USD 10.9m |
| 5 | USD 0.3m |

**Step 4 — Internal rate of return (linear interpolation)**

NPV at 25.00% = USD 1.6m; NPV at 30.00% = USD -0.8m.

**IRR ≈ 25.00% + USD 1.6m/(USD 1.6m − USD -0.8m) × (30.00% − 25.00%) = 28.26%.**

**Step 5 — Ranking against the mutually exclusive alternative**

| Project | IRR | NPV @ 10.00% |
|------|------|------|
| Line A | 28.26% | USD 11.6m |
| Line B | 16.00% | USD 28.0m |

IRR and NPV can rank mutually exclusive projects differently; where they conflict, **NPV wins** (it measures absolute value added and assumes reinvestment at the cost of capital, not the IRR). On NPV, **Line B** is preferred.

**Step 6 — Decision**

Line A's NPV of USD 11.6m is positive, so it would be acceptable on a standalone basis. But the two lines are mutually exclusive and Line B adds more value at the cost of capital (USD 28.0m vs USD 11.6m), so the board should fund Line B; Line A, though value-adding in isolation, is displaced.

**Step 7 — Advice to the board**

On these assumptions the return clears the hurdle; a positive signal is a floor, not a mandate, so the recommendation is conditional on the following assumptions holding.

The board is choosing between two mutually exclusive lines, and the two measures point different ways: Line A posts the higher internal rate of return, but Line B adds far more absolute value at the cost of capital. Where internal rate of return and net present value conflict on mutually exclusive projects, net present value should govern the choice — it measures the absolute value added to the company and assumes reinvestment at the cost of capital rather than at a project's own high internal rate, which the smaller line's rate flatters. So the board should prefer the larger line on value grounds, while confirming the two appraisals are on the same basis — same cost of capital and horizon treatment — before finalising. The board should also treat the fast-payback appeal of the smaller line as a behavioural pull, not a financial argument, and verify the management-provided residual value for Line A and confirm Line B's summary appraisal is on the same basis — same cost of capital and horizon treatment — before relying on the ranking.

*Reconciliation: NPV at 25.00% USD 1.6m and at 30.00% USD -0.8m bracket the IRR 28.26%.*

---

*End of round-2 delta. Confirm each fix applied cleanly and that all figures are unchanged from round 1; then adjudicate.*
