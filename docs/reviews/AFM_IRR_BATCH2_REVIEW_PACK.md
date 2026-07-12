# AFM — Batch 2 (IRR / MIRR, syllabus B1c) — Adversarial Review Pack

**4 drills, all `status = candidate`, `paper_code = AFM`, `lo_code = B1c`, intellectual level 3, 15 marks, command verb "advise".** One IRR/MIRR calculator family (calculator #2, after the NPV batch), four kinds: **standard IRR** (UK offshore wind, GBP), **MIRR reinvestment critique** (Australian lithium processing, AUD), **non-conventional / multiple-IRR** (South African gold mine with a mid-life pit-cutback outflow, ZAR), **IRR-vs-NPV ranking conflict** (US mutually-exclusive two-plant choice, USD).

Same doctrine as batch 1: **code owns every figure and the accept/reject verdict; the model authored prose only.** Graded numeric chain per drill: `ncf_p` (net after-tax cash flow, same as NPV) → `npv_lo`, `npv_hi` (NPV at two trial rates — GRADED, so the classic wrong-trial-NPV error carries) → `irr` (linear interpolation). The MIRR kind adds `tv_inflows` → `mirr`. `pv_outflows` is the t0 outlay param for these conventional flows.

---

## REVIEWER INSTRUCTIONS — read before you start

You are a hostile external examiner-reviewer. Try to **break** these drills, not approve them. Assume nothing is correct until you have reproved it from the raw inputs. This is a **BATCH** review, two tiers:

- **KIND 1 (standard IRR) — FULL HOSTILITY.** It is the family exemplar; every structural, pedagogic, realism and contamination decision here is inherited by the siblings. Attack it on every dimension, exhaustively.
- **KINDS 2–4 — SIBLING SPOT-CHECKS on the non-numeric dimensions, with ONE non-negotiable exception: recompute EVERY figure in ALL FOUR drills from the raw inputs, in full.**

### Dimensions
1. **Numeric recomputation — every figure, all four, from raw inputs.** Independently rebuild: the inflated (nominal) operating cash flows; the reducing-balance tax-allowable depreciation schedule with the year-4 balancing item; tax with the one-year lag (→ a year-5 tail where lag applies); net after-tax cash flows including scrap; **the two trial-rate NPVs (`npv_lo`, `npv_hi`); the interpolated IRR** = r_lo + npv_lo/(npv_lo − npv_hi) × (r_hi − r_lo). For **KIND 2** also recompute the **terminal value of inflows** (reinvested at the stated rate) and **MIRR** = (TV / PV of outflows)^(1/n) − 1; confirm MIRR < IRR and that pv_outflows = the outlay (conventional). For **KIND 3** confirm the net cash flows **change sign more than once**, that a single interpolated IRR is therefore unreliable, and that **NPV at the cost of capital governs** (reproduce it). For **KIND 4** reproduce Line A's IRR and NPV, confirm the **conflict** (IRR favours the given ranking one way, NPV the other, against Line B's given IRR 16% / NPV USD 28m), and that the verdict is **NPV wins → the larger line**.
2. **Syllabus fit at L3 ("advise").** Does each drill require an evaluative board-level recommendation, not mechanical calculation? Is anything out-of-syllabus for B1c?
3. **Scenario realism.** Sector, jurisdiction, magnitudes, rates, residuals — internally coherent and true to an AFM case? Flag any figure a real board wouldn't accept.
4. **Pedagogy.** Does the `hint` point at the thinking gap without leaking? Does the `full_reveal` diagnose the dominant misconception (mechanical-IRR / IRR's reinvestment assumption / multiple-IRR under sign changes / IRR-ranking of mutually exclusive projects) and give the correct mental model? Is the advice a genuine evaluation or does it fence-sit?
5. **Contamination check.** Does any drill import figures, risks, or **jurisdiction specifics** (tax classes, statutes, regulator behaviour, market-structure claims) into the evaluative fields that the scenario does not state? Evaluative prose may engage only what the scenario raises.

### How to report
Per issue: name the drill, the field, quote the exact text, state the defect, and — for numeric issues — show your recomputation. Rank by severity. A correction that touches one claim must be applied across all five fields. Do not soften a finding because the rest of the drill is strong.

### Code-computed values you are checking against (recompute, do not trust)
- KIND 1 (standard): IRR ≈ 11.97% on trial rates 10%/15%; NPV @ 10% ≈ GBP 7.9m → accept (a marginal clear-the-hurdle case).
- KIND 2 (MIRR): IRR ≈ 21.42%, MIRR ≈ 17.48% (reinvest 11%) on trial rates 20%/25%; NPV @ 11% ≈ AUD 30.6m → accept.
- KIND 3 (non-conventional): single interpolated IRR ≈ 9.48% (trial 5%/10%) is UNRELIABLE; NPV @ 14% ≈ ZAR −32.7m → **reject on NPV**.
- KIND 4 (conflict): Line A IRR ≈ 28.26% (trial 25%/30%), NPV @ 10% ≈ USD 11.6m; vs Line B (given) IRR 16% / NPV USD 28m → IRR favours A, NPV favours B → **NPV wins → Line B**.

---

# DRILL 1 (standard IRR — UK offshore wind) — `796651c2-8373-4d97-b0dd-58b74e7d7b5e`  — FULL HOSTILITY

**Metadata:** ACCA / AFM / B1c · advise · L3 · 15 marks · quantitative

### Question
Advise the board of Brecon Offshore Renewables plc whether it should proceed with the Meridian Array offshore wind expansion, supporting your recommendation with an internal rate of return (IRR) appraisal and a comparison of the IRR against the company’s cost of capital.

### Context (`context_text`)
Brecon Offshore Renewables plc develops and operates offshore wind capacity off the coast of the United Kingdom, selling generation into the wholesale market under a mix of fixed-price and merchant arrangements. The board is evaluating the Meridian Array — an expansion adding turbines and a shared export cable to an existing site.

Raw inputs (all monetary figures in GBP millions):
- Initial capital outlay (Time 0): GBP 180.0 m; of which capital qualifying for tax-allowable depreciation: GBP 170.0 m at 18% reducing balance
- Pre-tax operating cash flows (REAL, today's purchasing power): Year 1 GBP 46.0 m; Year 2 GBP 60.0 m; Year 3 GBP 64.0 m; Year 4 GBP 58.0 m
- Residual/scrap value (end of Year 4, nominal): GBP 22.0 m — provided by management, not independently valued
- General inflation rate: 2.5%; corporate tax rate: 25%; tax paid one year in arrears; cost of capital: 10.0%

Challengeable textures. (1) The operating cash flows assume a load factor and a wholesale price that the commercial team has set at the upper end of its own range; neither is contracted for the full horizon, and a softer merchant price would erode the later years most. (2) The 10.0% cost of capital predates the current rate environment and has not been re-derived for a project whose merchant exposure is higher than the existing fleet's.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.

### Model answer (`model_answer`)
**Investment appraisal — internal rate of return**

**Assumptions:** cash flows are in money (nominal) terms; operating cash flows are inflated at 2.50% a year; tax at 25.00% is charged on operating cash flow less tax-allowable depreciation and paid one year in arrears; tax-allowable depreciation is 18.00% reducing balance with a balancing allowance/charge on disposal in year 4; the cost of capital is 10.00%.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | GBP 30.6m |
| 2 | GBP 25.1m |
| 3 | GBP 20.6m |
| 4 | GBP 71.7m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | GBP 47.1m | GBP 30.6m | GBP 16.6m | GBP 4.1m |
| 2 | GBP 63.0m | GBP 25.1m | GBP 37.9m | GBP 9.5m |
| 3 | GBP 68.9m | GBP 20.6m | GBP 48.3m | GBP 12.1m |
| 4 | GBP 64.0m | GBP 71.7m | GBP -7.7m | GBP -1.9m |

**Step 3 — Net cash flows**

| Period | Net cash flow |
|--------|------|
| 0 | GBP -180.0m |
| 1 | GBP 47.1m |
| 2 | GBP 58.9m |
| 3 | GBP 59.4m |
| 4 | GBP 73.9m |
| 5 | GBP 1.9m |

**Step 4 — Internal rate of return (linear interpolation)**

NPV at 10.00% = GBP 7.9m; NPV at 15.00% = GBP -12.2m.

**IRR ≈ 10.00% + GBP 7.9m/(GBP 7.9m − GBP -12.2m) × (15.00% − 10.00%) = 11.97%.**

**Step 5 — Decision**

The IRR of 11.97% exceeds the 10.00% cost of capital, so on these assumptions the project **adds shareholder value and should be accepted**.

**Step 6 — Advice to the board**

On these assumptions the return clears the hurdle; a positive signal is a floor, not a mandate, so the recommendation is conditional on the following assumptions holding.

The single most fragile input is the operating cash-flow forecast: it rests on a load factor and a wholesale price both set at the top of the commercial team's range and neither contracted for the full horizon, so the board should require a downside case at a softer merchant price before committing the outlay — the later years, which carry the most weight, are where a price fall bites hardest. The cost of capital is the second concern; it predates the current rate environment and was not re-derived for a project with more merchant exposure than the existing fleet, so the board should confirm the rate genuinely reflects this project's risk before treating a return above it as sufficient. The residual value is a management figure with no independent valuation and rests on a working secondary market for used offshore plant, which the board should verify. Before treating the depreciation timing as settled, the board should confirm the correct tax classification of the turbine and export-cable assets.

*Reconciliation: NPV at 10.00% GBP 7.9m and at 15.00% GBP -12.2m bracket the IRR 11.97%.*

### Hint (`hint`)
A return above the hurdle is the start of the advice, not the end — have you asked how far the operating cash flows could fall before the IRR drops through the 10% cost of capital, and challenged whether that 10% still reflects this project's merchant risk, before you sign off?

### Full reveal (`full_reveal`)
The dominant misconception is treating IRR mechanically: candidates interpolate a rate, note it beats the cost of capital, and stop — as if clearing the hurdle were the recommendation. It is the floor. The correct mental model is that the IRR is only as reliable as the cash flows that generate it, so the board needs to know which assumption, if wrong, pulls the return back below the hurdle — here the top-of-range load factor and merchant price, uncontracted for the full horizon. On the mechanics, IRR is found by linear interpolation between two trial rates that bracket a zero NPV: pick a lower rate giving a positive NPV and a higher rate giving a negative one, then interpolate. If your net cash flows differ from the model, carry your own figures consistently into both trial-rate NPVs and the interpolation — where the method is right the marks still score, and the error is charged once at its source. Comparing IRR to the cost of capital only decides acceptance if that cost of capital genuinely reflects the project's risk; an outdated or too-low hurdle flatters every marginal project.

### Answer-schema summary
**Params:** r_hi 0.15 · r_lo 0.1 · tax_lag 1 · tax_rate 0.25 · wda_rate 0.18 · scrap_value 22 · reinvest_rate 0.1 · inflation_rate 0.025 · initial_outlay 180 · capital_for_wda 170 · cost_of_capital 0.1

| component_id | expected_value | unit | tolerance | depends_on | recompute |
|---|---|---|---|---|---|
| ncf_1 | 47.15 | GBPm | rel ±0.5% | — | — |
| ncf_2 | 58.89999999999999 | GBPm | rel ±0.5% | — | — |
| ncf_3 | 59.43462499999998 | GBPm | rel ±0.5% | — | — |
| ncf_4 | 73.93475765624999 | GBPm | rel ±0.5% | — | — |
| ncf_5 | 1.9278530859375067 | GBPm | rel ±0.5% | — | — |
| npv_lo | 7.890915149742881 | GBPm | rel ±0.5% | ncf_1, ncf_2, ncf_3, ncf_4, ncf_5 | npv_at_rate |
| npv_hi | -12.152985934714764 | GBPm | rel ±0.5% | ncf_1, ncf_2, ncf_3, ncf_4, ncf_5 | npv_at_rate |
| irr | 11.968408025087896 | % | abs ±0.2 | npv_lo, npv_hi | irr_interpolate |

---

# DRILL 2 (MIRR — Australian lithium processing) — `83b537bd-cc75-4307-8d07-d53f921973da`  — sibling (recompute all figures)

**Metadata:** ACCA / AFM / B1c · advise · L3 · 15 marks · quantitative

### Question
Advise the board of Pilbara Lithium Processing Ltd whether to proceed with the Karratha refining expansion, supporting your recommendation with both an internal rate of return (IRR) and a modified internal rate of return (MIRR), and explaining which is the sounder basis for the decision.

### Context (`context_text`)
Pilbara Lithium Processing Ltd refines spodumene concentrate into battery-grade lithium hydroxide in Western Australia, selling under a mix of offtake contracts and spot sales. The board is evaluating the Karratha expansion — a new refining train that lifts throughput to meet contracted demand.

Raw inputs (all monetary figures in AUD millions):
- Initial capital outlay (Time 0): AUD 120.0 m; of which capital qualifying for tax-allowable depreciation: AUD 115.0 m at 20% reducing balance
- Pre-tax operating cash flows (REAL, today's purchasing power): Year 1 AUD 42.0 m; Year 2 AUD 54.0 m; Year 3 AUD 57.0 m; Year 4 AUD 50.0 m
- Residual/scrap value (end of Year 4, nominal): AUD 16.0 m — provided by management, not independently valued
- General inflation rate: 3.0%; corporate tax rate: 30%; tax paid in the year the profit arises; cost of capital: 11.0%; assumed reinvestment rate for interim cash flows: 11.0%

Challengeable textures. (1) The strong early cash flows assume the offtake price holds; a meaningful share of volume is spot-exposed, and lithium prices have been volatile, so the reinvestment of interim cash flows at a high rate cannot be taken for granted. (2) The residual value assumes a functioning secondary market for specialised refining plant at the end of the horizon.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.

### Model answer (`model_answer`)
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

The IRR of 21.42% overstates the return because it implicitly assumes interim cash flows are reinvested at the IRR itself; MIRR reinvests them at the realistic 11.00% rate and is the sounder ranking measure.

**Step 6 — Decision**

The MIRR of 17.48% exceeds the 11.00% cost of capital, so on these assumptions the project **adds shareholder value and should be accepted**.

**Step 7 — Advice to the board**

On these assumptions the return clears the hurdle; a positive signal is a floor, not a mandate, so the recommendation is conditional on the following assumptions holding.

The board should not read the headline internal rate of return as the achievable return: it implicitly assumes every interim cash flow is reinvested at the internal rate itself, which for a project throwing off strong early cash is unrealistic — the modified internal rate of return, which reinvests those flows at the company's actual reinvestment rate, is the sounder basis for the decision and the figure the board should weigh against the cost of capital. The operating cash flows themselves are the most fragile input: a meaningful share of volume is spot-exposed in a market that has been volatile, so the board should require a downside case at a softer realised price before committing the outlay. The residual value is a management figure resting on a working secondary market for specialised plant, which the board should have independently valued. Before treating the depreciation timing as settled, the board should confirm the correct tax classification of the refining-train assets.

*Reconciliation: NPV at 20.00% AUD 3.4m and at 25.00% AUD -8.5m bracket the IRR 21.42%.*

### Hint (`hint`)
The internal rate of return and the modified rate answer different questions — have you said which one the board should act on and why, connecting the reinvestment assumption to the volatile spot exposure the scenario flags, rather than just reporting two percentages?

### Full reveal (`full_reveal`)
The dominant misconception is trusting the internal rate of return as the return the company will actually earn. Its hidden assumption is that every interim cash flow is reinvested at the internal rate — for a project with strong early cash and a high internal rate, that overstates the achievable return. The modified internal rate of return fixes exactly this: it compounds the interim inflows forward to the end of the horizon at a realistic reinvestment rate, discounts the outflows to today, and takes the rate that links them — so it is the sounder ranking and decision measure, and it is what the board should compare to the cost of capital. The second trap is leaving the cash flows unchallenged when the scenario flags volatile spot exposure: a reinvestment assumption is only as good as the cash there is to reinvest. On the mechanics, if your net cash flows or terminal value differ from the model, carry your own figures consistently into the modified rate — where the method is right the marks still score, and the error is charged once at its source.

### Answer-schema summary
**Params:** r_hi 0.25 · r_lo 0.2 · tax_lag 0 · tax_rate 0.3 · wda_rate 0.2 · scrap_value 16 · reinvest_rate 0.11 · inflation_rate 0.03 · initial_outlay 120 · capital_for_wda 115 · cost_of_capital 0.11

| component_id | expected_value | unit | tolerance | depends_on | recompute |
|---|---|---|---|---|---|
| ncf_1 | 37.182 | AUDm | rel ±0.5% | — | — |
| ncf_2 | 45.62202 | AUDm | rel ±0.5% | — | — |
| ncf_3 | 48.0158073 | AUDm | rel ±0.5% | — | — |
| ncf_4 | 68.25680835 | AUDm | rel ±0.5% | — | — |
| npv_lo | 3.3709403501157453 | AUDm | rel ±0.5% | ncf_1, ncf_2, ncf_3, ncf_4 | npv_at_rate |
| npv_hi | -8.514225162239995 | AUDm | rel ±0.5% | ncf_1, ncf_2, ncf_3, ncf_4 | npv_at_rate |
| irr | 21.41812932542308 | % | abs ±0.2 | npv_lo, npv_hi | irr_interpolate |
| tv_inflows | 228.61650113700003 | AUDm | rel ±0.5% | ncf_1, ncf_2, ncf_3, ncf_4 | terminal_value |
| mirr | 17.484772958550664 | % | abs ±0.2 | tv_inflows | mirr_from_tv |

---

# DRILL 3 (non-conventional — South African gold mine) — `003ab45c-a529-4ec4-b28a-651b5ea8b525`  — sibling (recompute all figures)

**Metadata:** ACCA / AFM / B1c · advise · L3 · 15 marks · quantitative

### Question
Advise the board of Witwater Gold Mining Ltd whether to proceed with the Ncandu pit extension, supporting your recommendation with a net present value and internal rate of return appraisal, and explaining how the mid-life cash outflow affects the reliability of the internal rate of return.

### Context (`context_text`)
Witwater Gold Mining Ltd operates an open-pit gold mine in South Africa. The board is evaluating the Ncandu pit extension, which requires a large capital outlay now and — crucially — a substantial mid-life pit-cutback (waste-stripping) programme in Year 3 that produces a net cash OUTFLOW that year before production resumes.

Raw inputs (all monetary figures in ZAR millions):
- Initial capital outlay (Time 0): ZAR 400.0 m; of which capital qualifying for tax-allowable depreciation: ZAR 380.0 m at 20% reducing balance
- Pre-tax operating cash flows (REAL, today's purchasing power): Year 1 ZAR 190.0 m; Year 2 ZAR 220.0 m; Year 3 ZAR −130.0 m (net outflow — the pit-cutback programme); Year 4 ZAR 170.0 m
- Residual/scrap value (end of Year 4, nominal): ZAR 30.0 m — provided by management, not independently valued
- General inflation rate: 5.0%; corporate tax rate: 27%; tax paid one year in arrears; cost of capital: 14.0%

Challengeable textures. (1) The Year 3 cutback cost is an engineering estimate that has overrun on comparable programmes before; a larger cutback pushes the year further negative and reshapes the return. (2) The gold price underpinning the production years is a management assumption, not a hedged floor.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.

### Model answer (`model_answer`)
**Investment appraisal — internal rate of return**

**Assumptions:** cash flows are in money (nominal) terms; operating cash flows are inflated at 5.00% a year; tax at 27.00% is charged on operating cash flow less tax-allowable depreciation and paid one year in arrears; tax-allowable depreciation is 20.00% reducing balance with a balancing allowance/charge on disposal in year 4; the cost of capital is 14.00%.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | ZAR 76.0m |
| 2 | ZAR 60.8m |
| 3 | ZAR 48.6m |
| 4 | ZAR 164.6m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | ZAR 199.5m | ZAR 76.0m | ZAR 123.5m | ZAR 33.3m |
| 2 | ZAR 242.6m | ZAR 60.8m | ZAR 181.8m | ZAR 49.1m |
| 3 | ZAR -150.5m | ZAR 48.6m | ZAR -199.1m | ZAR -53.8m |
| 4 | ZAR 206.6m | ZAR 164.6m | ZAR 42.1m | ZAR 11.4m |

**Step 3 — Net cash flows**

| Period | Net cash flow |
|--------|------|
| 0 | ZAR -400.0m |
| 1 | ZAR 199.5m |
| 2 | ZAR 209.2m |
| 3 | ZAR -199.6m |
| 4 | ZAR 290.4m |
| 5 | ZAR -11.4m |

**Step 4 — Internal rate of return (linear interpolation)**

NPV at 5.00% = ZAR 37.4m; NPV at 10.00% = ZAR -4.4m.

**IRR ≈ 5.00% + ZAR 37.4m/(ZAR 37.4m − ZAR -4.4m) × (10.00% − 5.00%) = 9.48%.**

Because the net cash flows change sign more than once, this project can have **multiple IRRs** (or none), so a single interpolated IRR is unreliable here. The NPV at the 14.00% cost of capital is ZAR -32.7m — **NPV governs the decision**, not IRR.

**Step 5 — Decision**

The NPV of ZAR -32.7m is negative, so on these assumptions the project **destroys value and should be rejected** as it stands.

**Step 6 — Advice to the board**

On these assumptions the return is below the hurdle, so the base-case recommendation is to **reject**; the board should treat rejection as the default unless the assumptions below prove materially conservative.

The board should treat the internal rate of return with caution here, not as the headline it usually is: because the net cash flows change sign more than once — outflow now, inflows, a mid-life outflow for the pit-cutback, then inflows again — the project can have more than one internal rate of return (or none), so a single quoted rate is unreliable and the net present value at the cost of capital should govern the decision. On the inputs, the Year 3 cutback cost is an engineering estimate that has overrun before, and a larger overrun pushes that year further negative and reshapes the whole profile, so the board should require a sensitivity on the cutback cost and a downside gold-price case before committing. The residual value is a management figure that should be independently valued. Before treating the depreciation timing as settled, the board should confirm the correct tax classification of the mining assets.

*Reconciliation: NPV at 5.00% ZAR 37.4m and at 10.00% ZAR -4.4m bracket the IRR 9.48%.*

### Hint (`hint`)
Before you quote an internal rate of return, look at how many times the net cash flows change sign — what does a mid-life outflow do to the reliability of a single internal rate of return, and which measure should therefore carry the board's decision?

### Full reveal (`full_reveal`)
The dominant misconception is quoting one internal rate of return for a project whose cash flows change sign more than once. An internal rate of return is a root of the net-present-value equation; when the sign of the net cash flows flips more than once — here an initial outflow, inflows, a mid-life cutback outflow, then inflows — that equation can have several roots or none, so a single interpolated rate is not a reliable decision signal. The correct mental model is that net present value at the cost of capital is well-behaved regardless of sign changes and should govern the decision; the modified internal rate of return, which collapses the flows to one terminal value and one present value, is the sounder single rate if a rate is wanted. The second trap is taking the Year 3 cutback cost as fixed when it is an engineering estimate with a history of overruns — the board should see a sensitivity on it. On the mechanics, if your net cash flows differ from the model, carry your own figures consistently into the net present value and any interpolation — the method still scores, and the error is charged once at its source.

### Answer-schema summary
**Params:** r_hi 0.1 · r_lo 0.05 · tax_lag 1 · tax_rate 0.27 · wda_rate 0.2 · scrap_value 30 · reinvest_rate 0.14 · inflation_rate 0.05 · initial_outlay 400 · capital_for_wda 380 · cost_of_capital 0.14

| component_id | expected_value | unit | tolerance | depends_on | recompute |
|---|---|---|---|---|---|
| ncf_1 | 199.5 | ZARm | rel ±0.5% | — | — |
| ncf_2 | 209.205 | ZARm | rel ±0.5% | — | — |
| ncf_3 | -199.56375000000003 | ZARm | rel ±0.5% | — | — |
| ncf_4 | 290.40150000000006 | ZARm | rel ±0.5% | — | — |
| ncf_5 | -11.36053687500001 | ZARm | rel ±0.5% | — | — |
| npv_lo | 37.37718631346286 | ZARm | rel ±0.5% | ncf_1, ncf_2, ncf_3, ncf_4, ncf_5 | npv_at_rate |
| npv_hi | -4.3807361487976095 | ZARm | rel ±0.5% | ncf_1, ncf_2, ncf_3, ncf_4, ncf_5 | npv_at_rate |
| irr | 9.475460476660832 | % | abs ±0.2 | npv_lo, npv_hi | irr_interpolate |

---

# DRILL 4 (IRR-vs-NPV conflict — US two-plant choice) — `712cf3aa-320a-4612-89aa-024537c7cb80`  — sibling (recompute all figures)

**Metadata:** ACCA / AFM / B1c · advise · L3 · 15 marks · quantitative

### Question
Advise the board of Cascade Industrial Inc. which of two mutually exclusive production lines to build, given that only one can be funded, by appraising the smaller line (Line A) using net present value and internal rate of return and ranking it against the larger alternative (Line B), and explaining which measure should govern the choice where they conflict.

### Context (`context_text`)
Cascade Industrial Inc. manufactures specialised components at a single US site and can build only ONE of two mutually exclusive production lines on the available floor space. The board has full figures for the smaller, fast-payback Line A (below) and a summary appraisal of the larger Line B.

Raw inputs for Line A (all monetary figures in USD millions):
- Initial capital outlay (Time 0): USD 30.0 m; of which capital qualifying for tax-allowable depreciation: USD 28.0 m at 20% reducing balance
- Pre-tax operating cash flows (REAL, today's purchasing power): Year 1 USD 15.0 m; Year 2 USD 16.0 m; Year 3 USD 12.0 m; Year 4 USD 8.0 m
- Residual/scrap value (end of Year 4, nominal): USD 4.0 m — provided by management, not independently valued
- General inflation rate: 2.5%; corporate tax rate: 21%; tax paid one year in arrears; cost of capital: 10.0%

The larger alternative, Line B, is a bigger, longer-dated investment. Its summary appraisal is given as scenario facts: internal rate of return 16.0%; net present value at the 10.0% cost of capital USD 28.0 m.

Challengeable textures. (1) Line A pays back fast and posts a high internal rate of return, which is attractive to a board focused on quick returns — but the two lines are mutually exclusive and very different in scale. (2) Line B's summary figures are given; the board should still confirm the assumptions behind them are on the same basis (same cost of capital, same horizon treatment) before ranking.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.

### Model answer (`model_answer`)
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
| This project | 28.26% | USD 11.6m |
| the large-scale Line B | 16.00% | USD 28.0m |

IRR and NPV can rank mutually exclusive projects differently; where they conflict, **NPV wins** (it measures absolute value added and assumes reinvestment at the cost of capital, not the IRR). On NPV, **the large-scale Line B** is preferred.

**Step 6 — Decision**

The NPV of USD 11.6m is positive, so on these assumptions the project **adds shareholder value and should be accepted**.

**Step 7 — Advice to the board**

On these assumptions the return clears the hurdle; a positive signal is a floor, not a mandate, so the recommendation is conditional on the following assumptions holding.

The board is choosing between two mutually exclusive lines, and the two measures point different ways: Line A posts the higher internal rate of return, but Line B adds far more absolute value at the cost of capital. Where internal rate of return and net present value conflict on mutually exclusive projects, net present value should govern the choice — it measures the absolute value added to the company and assumes reinvestment at the cost of capital rather than at a project's own high internal rate, which the smaller line's rate flatters. So the board should prefer the larger line on value grounds, while confirming the two appraisals are on the same basis — same cost of capital and horizon treatment — before finalising. The board should also treat the fast-payback appeal of the smaller line as a behavioural pull, not a financial argument, and challenge the management residual value and the demand assumption behind each line's cash flows before committing.

*Reconciliation: NPV at 25.00% USD 1.6m and at 30.00% USD -0.8m bracket the IRR 28.26%.*

### Hint (`hint`)
Two mutually exclusive projects, and the internal rate of return favours one while net present value favours the other — which measure should decide, and why does the smaller line's high internal rate of return not settle it?

### Full reveal (`full_reveal`)
The dominant misconception is ranking mutually exclusive projects by internal rate of return. A high internal rate of return on a small, fast-payback project is real, but it does not mean the project adds the most value — internal rate of return is a percentage on the capital committed and implicitly assumes interim cash is reinvested at that same high rate, which is unrealistic. The correct mental model is that for mutually exclusive projects where the measures conflict, net present value governs: it measures the absolute value added and assumes reinvestment at the cost of capital, so it correctly prefers the larger line here even though its internal rate of return is lower. The second trap is being pulled by fast payback — a behavioural preference, not a financial one. Before ranking, the board must also confirm the two appraisals are on the same basis. On the mechanics, if your net cash flows or internal rate of return for the smaller line differ from the model, carry your own figures consistently into the ranking — the method still scores, and the error is charged once at its source.

### Answer-schema summary
**Params:** r_hi 0.3 · r_lo 0.25 · tax_lag 1 · tax_rate 0.21 · wda_rate 0.2 · scrap_value 4 · reinvest_rate 0.1 · inflation_rate 0.025 · initial_outlay 30 · capital_for_wda 28 · cost_of_capital 0.1

| component_id | expected_value | unit | tolerance | depends_on | recompute |
|---|---|---|---|---|---|
| ncf_1 | 15.374999999999998 | USDm | rel ±0.5% | — | — |
| ncf_2 | 14.757249999999999 | USDm | rel ±0.5% | — | — |
| ncf_3 | 10.333387499999995 | USDm | rel ±0.5% | — | — |
| ncf_4 | 10.869378749999997 | USDm | rel ±0.5% | — | — |
| ncf_5 | 0.31615434375000045 | USDm | rel ±0.5% | — | — |
| npv_lo | 1.5910293913599958 | USDm | rel ±0.5% | ncf_1, ncf_2, ncf_3, ncf_4, ncf_5 | npv_at_rate |
| npv_hi | -0.846747085522761 | USDm | rel ±0.5% | ncf_1, ncf_2, ncf_3, ncf_4, ncf_5 | npv_at_rate |
| irr | 28.263279891424837 | % | abs ±0.2 | npv_lo, npv_hi | irr_interpolate |

---

*End of pack. Return findings ranked by severity, drill-by-drill, with recomputations shown.*
