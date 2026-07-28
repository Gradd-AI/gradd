# AFM — Batch 1 (NPV / B1a) — ROUND 2: fix-verification review

**All four drills are `status = candidate` (source of truth: the database).** This is a
FOCUSED second pass, not a fresh review. Round 1 returned 10 findings, all accepted; the
fixes were applied at the calculator/generator (pattern) level and to the drills. Your job
here is narrow and adversarial:

1. **Confirm each of your 10 round-1 findings is resolved** — one line per finding: resolved / not resolved / partially. Do not re-open findings that were adjudicated closed with cited examiner authority (OFR "charged once at source, conditional on the own figure being used correctly").
2. **Recompute from the raw inputs, do not trust the numbers:**
   - **Drill 2 (rationing):** independently derive the feasible optimal allocation under the CAD 32.0m limit with GlycoSynth-7 INDIVISIBLE. Confirm funding it in full (18.0) + NovaDerm (7.5) + Helix (6.5 partial) beats skipping it, and that ColdChain is excluded. State the total NPV of your allocation.
   - **Drill 3 (sensitivity):** independently recompute the ~13.24% margin as NPV ÷ (post-tax present value of the operating cash flows) — confirm the base excludes scrap and the depreciation tax shield, and reproduce the CAD 37.9m base.
3. **Flag anything the FIXES introduced** — new inconsistency, a claim the rescoped jurisdiction rule now permits that shouldn't be there, a decision-frame mismatch, or prose that no longer reads cleanly.

Below: **Drill 2 and Drill 4 in FULL** (the hold-hard pair — full recomputation + full read),
then **only the CHANGED fields** of Drill 1 and Drill 3 (everything else in those two is
unchanged from round 1).

---

# DRILL 2 (capital rationing) — FULL — `716f69f8-863f-421d-977c-44c64d5ab7ea`

**Metadata:** ACCA / AFM / B1a · advise · L3 · 15 marks · quantitative

### Question
Advise the board of NorthStar Biogenics Inc. whether to proceed with the GlycoSynth-7 manufacturing expansion, given the company’s capital rationing position, by appraising the project using net present value and profitability index, and determining the optimal allocation of the available capital across GlycoSynth-7 (which is indivisible) and the competing divisible proposals.

### Context (`context_text`)
NorthStar Biogenics Inc. is a mid-sized Canadian pharmaceutical manufacturer headquartered in Mississauga, Ontario, specialising in biosimilar drug substances for the domestic and export markets. The board is evaluating the GlycoSynth-7 active pharmaceutical ingredient production line — a dedicated facility to manufacture a biosimilar monoclonal antibody currently imported at high cost from contract manufacturers in South Korea. The facility is a bespoke asset and cannot be part-built: it is an all-or-nothing (indivisible) commitment.

Raw inputs for GlycoSynth-7 (CAD millions): initial outlay CAD 18.0 m; pre-tax operating cash flows in REAL terms — Year 1 CAD 5.2 m, Year 2 CAD 6.8 m, Year 3 CAD 7.4 m, Year 4 CAD 6.1 m; inflation 3.0%; corporate tax 26.5%; tax paid one year in arrears; entire CAD 18.0 m qualifies for tax-allowable depreciation at 25% reducing balance; residual/scrap value (end Year 4) CAD 2.5 m; risk-adjusted discount rate 11.0%. The head of commercial has acknowledged the forecasts were built during strong order-book visibility and may be optimistic — the two largest hospital-group contracts expire at the end of Year 2 and renewal is not guaranteed. The board should also note that the Bank of Canada's forward guidance on interest rates has been volatile, so the 11.0% discount rate — derived partly from current financing costs — may not remain stable over the four-year horizon.

Capital rationing constraint: the treasury function confirms the maximum capital available for new investment this period is CAD 32.0 m. Three other DIVISIBLE proposals compete for the same pool: Project Helix (laboratory automation) — outlay CAD 9.0 m, profitability index 1.18; Project ColdChain (temperature-controlled logistics) — outlay CAD 14.0 m, profitability index 1.09; Project NovaDerm (dermatology line expansion) — outlay CAD 7.5 m, profitability index 1.22. The board must allocate capital optimally across all proposals (GlycoSynth-7 indivisible, the other three divisible) within the CAD 32.0 m limit.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.

### Model answer (`model_answer`)
**Investment appraisal — net present value**

**Assumptions:** cash flows are in money (nominal) terms; operating cash flows are inflated at 3.00% a year; tax at 26.50% is charged on operating cash flow less tax-allowable depreciation and is paid one year in arrears; tax-allowable depreciation is 25.00% reducing balance with a balancing allowance/charge on disposal in year 4; flows are discounted at a risk-adjusted rate of 11.00%.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | CAD 4.5m |
| 2 | CAD 3.4m |
| 3 | CAD 2.5m |
| 4 | CAD 5.1m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | CAD 5.4m | CAD 4.5m | CAD 0.9m | CAD 0.2m |
| 2 | CAD 7.2m | CAD 3.4m | CAD 3.8m | CAD 1.0m |
| 3 | CAD 8.1m | CAD 2.5m | CAD 5.6m | CAD 1.5m |
| 4 | CAD 6.9m | CAD 5.1m | CAD 1.8m | CAD 0.5m |

**Step 3 — Net cash flows and present values**

| Period | Net cash flow | DF @ 11.00% | Present value |
|--------|------|------|------|
| 0 | CAD -18.0m | 1.000 | CAD -18.0m |
| 1 | CAD 5.4m | 0.901 | CAD 4.8m |
| 2 | CAD 7.0m | 0.812 | CAD 5.7m |
| 3 | CAD 7.1m | 0.731 | CAD 5.2m |
| 4 | CAD 7.9m | 0.659 | CAD 5.2m |
| 5 | CAD -0.5m | 0.593 | CAD -0.3m |

**Present value of future cash flows CAD 20.6m; less initial outlay CAD 18.0m; NPV CAD 2.6m.**

**Step 4 — Decision**

The NPV of CAD 2.6m is **positive**, so on these assumptions the project **adds shareholder value and should be accepted**.

**Step 5 — Single-period capital rationing (profitability index)**

This project is **indivisible** (a bespoke facility cannot be part-funded); the competing projects are divisible. Its profitability index (PV of inflows ÷ outlay) is **1.144**. The optimal feasible allocation within the capital limit of CAD 32.0m is found by comparing funding this project — then filling the remaining capital with the divisible projects in PI order — against not funding it, and taking whichever yields the higher total NPV:

| Rank (by PI) | Project | PI | Outlay | Capital allocated |
|------|------|------|------|------|
| 1 | Project NovaDerm | 1.220 | CAD 7.5m | CAD 7.5m |
| 2 | Project Helix | 1.180 | CAD 9.0m | CAD 6.5m |
| 3 | this project (indivisible) | 1.144 | CAD 18.0m | CAD 18.0m |
| 4 | Project ColdChain | 1.090 | CAD 14.0m | CAD 0.0m |

Optimal allocation: **Project NovaDerm CAD 7.5m, Project Helix CAD 6.5m (partial), this project CAD 18.0m** — total CAD 32.0m deployed, funding this project in full. *(Multi-period rationing would require linear programming and is beyond this single-period ranking.)*

**Step 6 — Advice to the board**

On these assumptions the NPV is positive; a positive result is a floor, not a mandate, so the recommendation to proceed is conditional on the following assumptions holding under scrutiny.

The most fragile input is the operating cash-flow forecast, which the head of commercial has flagged as potentially optimistic: the two largest hospital-group contracts expire at the end of Year 2, and if they are not renewed the later cash flows — which carry most of the value — could fall materially, so the board should require a downside scenario reflecting non-renewal. On the allocation, the board should hold to the indivisibility of this facility: it cannot be part-funded the way the competing divisible projects can, so it must be funded in full or not at all, and the board should confirm the capital ceiling is genuinely binding this period rather than an internal constraint. The residual value should be tested against an independent valuation, given the thin secondary market for specialised equipment. Before committing capital the board should confirm the correct tax classification of the assets and require confirmation of the commissioning timeline, since any delay defers the first inflows and weakens the project's standing in the ranking.

*Reconciliation: present value of future cash flows CAD 20.6m − initial outlay CAD 18.0m = NPV CAD 2.6m ✓*

### Hint (`hint`)
Check that your NPV feeds a profitability-index ranking, and that the ranking respects GlycoSynth-7 as INDIVISIBLE — it is funded in full or not at all, with the remaining capital filling the divisible projects by PI — before you advise the board how the CAD 32.0m is best deployed.

### Full reveal (`full_reveal`)
The dominant misconception in capital-rationing drills is ABANDONED-AFTER-CALC: candidates compute NPV, build a PI table, then stop — as if the ranking were the conclusion rather than the input to a recommendation. The ranking is a prioritisation tool, and here it must respect a structural fact: this facility is indivisible. A bespoke manufacturing line cannot be part-funded, so the optimal single-period allocation is found by comparing funding it in full — then filling the remaining capital with the divisible projects in PI order — against not funding it, and taking whichever yields the higher total NPV. Funding GlycoSynth-7 in full and topping up with the strongest divisible projects is the better plan here; treating it as divisible (part-funding the outlay) would misstate the true allocation. The correct mental model moves from calculation, to a ranking that honours divisibility, to a board-level verdict that names the binding constraint, challenges the weakest inputs (the commercial forecast the head of commercial himself flagged, and the residual value in a thin secondary market), and states what must be verified before capital is committed. If your NPV or PI differs from the model, carry your own figure forward consistently into the ranking and advice — where your downstream method is sound those marks remain available, and the error is charged once at its source.

### Answer-schema summary
**Params:** tax_lag 1 · tax_rate 0.265 · wda_rate 0.25 · scrap_value 2.5 · discount_rate 0.11 · inflation_rate 0.03 · initial_outlay 18 · capital_for_wda 18

| component_id | expected_value | unit | tolerance | depends_on | recompute |
|---|---|---|---|---|---|
| ncf_1 | 5.356000000000001 | CADm | rel ±0.5% | — | — |
| ncf_2 | 6.987279999999999 | CADm | rel ±0.5% | — | — |
| ncf_3 | 7.0688130000000005 | CADm | rel ±0.5% | — | — |
| ncf_4 | 7.893547344000001 | CADm | rel ±0.5% | — | — |
| ncf_5 | -0.4695412413650001 | CADm | rel ±0.5% | — | — |
| pv_1 | 4.825225225225226 | CADm | rel ±0.5% | ncf_1 | pv_discount_y1 |
| pv_2 | 5.671033195357518 | CADm | rel ±0.5% | ncf_2 | pv_discount_y2 |
| pv_3 | 5.168655141628114 | CADm | rel ±0.5% | ncf_3 | pv_discount_y3 |
| pv_4 | 5.1997241313727995 | CADm | rel ±0.5% | ncf_4 | pv_discount_y4 |
| pv_5 | -0.2786498732663235 | CADm | rel ±0.5% | ncf_5 | pv_discount_y5 |
| npv | 2.585987820317335 | CADm | rel ±0.5% | pv_1, pv_2, pv_3, pv_4, pv_5 | npv_sum_less_outlay |

---

# DRILL 4 (Section-A / reject) — FULL — `f2817d06-8500-41c0-89ed-6e910f6b0d83`

**Metadata:** ACCA / AFM / B1a · advise · L3 · 15 marks · quantitative

### Question
Advise the board of NovaBiologics Inc. whether to proceed with the proposed acquisition and commissioning of the Montréal fill-finish facility, presenting a fully worked NPV appraisal and an integrated strategic recommendation that addresses the key assumptions underlying the forecast.

### Context (`context_text`)
NovaBiologics Inc. ("NovaBiologics") is a mid-sized Canadian specialty-pharmaceutical company headquartered in Toronto, Ontario, listed on the Toronto Stock Exchange, developing and distributing biosimilar injectable therapies. Its fill-finish operations are entirely outsourced to a contract-manufacturing organisation whose supply agreement will not be renewed beyond 2026. The board is evaluating whether to acquire and commission a dedicated in-house fill-finish facility in Montréal (the "Montréal Project") to secure long-run manufacturing independence and capture the margin currently paid to the contractor.

Raw inputs (CAD millions): total capital cost CAD 52.0 m at the start of Year 1; pre-tax operating cash flows in REAL terms — Year 1 CAD 10.2 m, Year 2 CAD 14.8 m, Year 3 CAD 17.5 m, Year 4 CAD 16.0 m; general inflation 3.0% (the Bank of Canada medium-term target corridor); corporate tax rate 26.5%; tax paid one year in arrears; assume the entire CAD 52.0 m qualifies for Canada Revenue Agency tax-allowable depreciation at 30% reducing balance; residual/scrap value (end of the four-year horizon) CAD 4.5 m; risk-adjusted discount rate 11.0%, set by treasury from a comparable-company beta drawn from a peer group of North American biosimilar manufacturers. Assume the company has sufficient taxable profits from its other operations to relieve any project tax loss, with the effect felt one year in arrears.

Challengeable textures. (1) Forecast optimism: the real cash flows embed revenue from three biosimilar supply contracts that remain unsigned at the appraisal date; if even one is delayed or lost, Year 2–3 inflows could be materially lower. (2) Discount-rate reliability: the 11.0% rate is drawn from a broad North American peer beta, yet the company operates only in domestic provincial markets whose distinct reimbursement and regulatory risks — Health Canada approval timelines and provincial formulary-listing delays — such a peer set may underweight; treasury has not disclosed whether any jurisdiction-specific premium has been added.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.

### Model answer (`model_answer`)
**Investment appraisal — net present value**

**Assumptions:** cash flows are in money (nominal) terms; operating cash flows are inflated at 3.00% a year; tax at 26.50% is charged on operating cash flow less tax-allowable depreciation and is paid one year in arrears; tax-allowable depreciation is 30.00% reducing balance with a balancing allowance/charge on disposal in year 4; flows are discounted at a risk-adjusted rate of 11.00%.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | CAD 15.6m |
| 2 | CAD 10.9m |
| 3 | CAD 7.6m |
| 4 | CAD 13.3m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | CAD 10.5m | CAD 15.6m | CAD -5.1m | CAD -1.3m |
| 2 | CAD 15.7m | CAD 10.9m | CAD 4.8m | CAD 1.3m |
| 3 | CAD 19.1m | CAD 7.6m | CAD 11.5m | CAD 3.0m |
| 4 | CAD 18.0m | CAD 13.3m | CAD 4.7m | CAD 1.2m |

**Step 3 — Net cash flows and present values**

| Period | Net cash flow | DF @ 11.00% | Present value |
|--------|------|------|------|
| 0 | CAD -52.0m | 1.000 | CAD -52.0m |
| 1 | CAD 10.5m | 0.901 | CAD 9.5m |
| 2 | CAD 17.1m | 0.812 | CAD 13.8m |
| 3 | CAD 17.9m | 0.731 | CAD 13.1m |
| 4 | CAD 19.5m | 0.659 | CAD 12.8m |
| 5 | CAD -1.2m | 0.593 | CAD -0.7m |

**Present value of future cash flows CAD 48.4m; less initial outlay CAD 52.0m; NPV CAD -3.6m.**

**Step 4 — Decision**

The NPV of CAD -3.6m is **negative**, so on these assumptions the project **destroys value and should be rejected** as it stands.

**Step 5 — Advice to the board**

On these assumptions the NPV is negative, so the base-case recommendation is to **reject** the project as it stands; the board should treat rejection as the default unless the assumptions below prove materially conservative.

The operating cash flows embed revenue from supply contracts that remain unsigned at the appraisal date; if even one is delayed or lost the Year 2–3 inflows could fall well below forecast, so the board should require either a probability-weighted scenario set or a base case that excludes unsigned-contract revenue before reconsidering. The discount rate is drawn from a broad overseas peer beta, yet the company operates only in domestic provincial markets with distinct reimbursement and regulatory risks such a peer set may underweight; the board should require confirmation of whether any jurisdiction-specific premium has been added and, if not, model the decision at a modestly higher rate. The residual value assumes a functioning secondary market for specialised equipment at the end of the horizon; the board should obtain at least one independent valuation before relying on it, as a lower realisation would further weaken the terminal-year inflow. The strategic value of securing in-house manufacturing after the current supply agreement lapses is a genuine consideration, but it does not offset a negative NPV on its own and cannot substitute for contract-by-contract revenue validation before any commitment.

*Reconciliation: present value of future cash flows CAD 48.4m − initial outlay CAD 52.0m = NPV CAD -3.6m ✓*

### Hint (`hint`)
The NPV is negative — so your advice must own that verdict, not soften it: have you told the board which specific assumptions (the unsigned contracts, the overseas peer-group rate, the residual value) are fragile and what action to take on each before the project could be reconsidered?

### Full reveal (`full_reveal`)
The classic misconception here is FENCE-SITTING fused with UNDEVELOPED-ASSUMPTION: candidates compute the NPV, note it is negative, write "reject," and stop — as if the arithmetic were the advice. A board committing CAD 52m needs to know which assumptions are fragile and what action to take on each, not merely what the central case implies. The second trap is listing assumptions — unsigned contracts, the discount rate, the residual value — without developing why each is structurally uncertain here: unsigned contracts mean the revenue base is not contractually locked in, a broad overseas peer beta may not price the domestic regulatory and reimbursement risk, and a quoted residual value is only as reliable as an independent secondary-market valuation. The correct mental model treats every major assumption as a decision gate: for each, tell the board what evidence it must require before the assumption can be relied upon, because an assumption that cannot be verified before commitment is a risk the NPV silently absorbs. Finally, if your depreciation schedule or your inflation of the cash flows went wrong, carry your own figures forward consistently into the NPV and the recommendation — where your downstream method is sound those marks remain available, and the error is charged once at its source.

### Answer-schema summary
**Params:** tax_lag 1 · tax_rate 0.265 · wda_rate 0.3 · scrap_value 4.5 · discount_rate 0.11 · inflation_rate 0.03 · initial_outlay 52 · capital_for_wda 52

| component_id | expected_value | unit | tolerance | depends_on | recompute |
|---|---|---|---|---|---|
| ncf_1 | 10.506 | CADm | rel ±0.5% | — | — |
| ncf_2 | 17.05123 | CADm | rel ±0.5% | — | — |
| ncf_3 | 17.855672700000003 | CADm | rel ±0.5% | — | — |
| ncf_4 | 19.4662794975 | CADm | rel ±0.5% | — | — |
| ncf_5 | -1.238117354400001 | CADm | rel ±0.5% | — | — |
| pv_1 | 9.464864864864865 | CADm | rel ±0.5% | ncf_1 | pv_discount_y1 |
| pv_2 | 13.839160782404024 | CADm | rel ±0.5% | ncf_2 | pv_discount_y2 |
| pv_3 | 13.055913985570669 | CADm | rel ±0.5% | ncf_3 | pv_discount_y3 |
| pv_4 | 12.82304125636702 | CADm | rel ±0.5% | ncf_4 | pv_discount_y4 |
| pv_5 | -0.7347623882610297 | CADm | rel ±0.5% | ncf_5 | pv_discount_y5 |
| npv | -3.5517814990544565 | CADm | rel ±0.5% | pv_1, pv_2, pv_3, pv_4, pv_5 | npv_sum_less_outlay |

---

# DRILL 1 (standard) — CHANGED FIELDS ONLY — `4e6df0b6-f59f-4f34-92c0-792ac1ea30b4`

*(Round-1 fixes: removed "and sensitivity analysis" from the question so P5 passes; stripped invented market-structure facts from the advice; residual value tagged as management-provided; jurisdiction specifics removed. Context otherwise unchanged bar the factual-naming restoration + simplification line.)*

### Question (changed — sensitivity demand removed)
Advise the board of NorthStar Biogenics Inc. whether it should proceed with the GenFlex-7 manufacturing expansion, supporting your recommendation with a net present value (NPV) appraisal that explicitly treats inflation and taxation (including tax-allowable depreciation).

### Model answer — Advice section (changed)
**Step 5 — Advice to the board**

On these assumptions the NPV is positive; a positive result is a floor, not a mandate, so the recommendation to proceed is conditional on the following assumptions holding under scrutiny.

The cash-flow forecast is the most fragile input: the assumed market-share capture rests on management's unverified assertion that competitor capacity will be constrained — a factor the company does not control — so the board should require independent market intelligence to validate the share estimate before committing the outlay. The discount rate is the second concern; a beta lifted from listed overseas peers and applied to an unlisted domestic manufacturer may not reflect this company's specific risk, so the board should commission a check of whether 11.0% adequately captures that profile. The residual value is provided by management and has not been independently valued, and a bespoke sterile filling line has a thin secondary market, so the board should obtain an independent equipment valuation before relying on it. Before treating the depreciation timing as settled, the board should also confirm the correct tax classification of the cleanroom and filling-line assets.

### Hint (changed)
Check whether your advice to the board goes beyond restating the NPV sign — have you challenged the fragility of at least one specific input (the market-share assumption, the discount-rate derivation, or the management-provided residual value) and told the board what to verify before committing CAD 38.0m?

---

# DRILL 3 (sensitivity) — CHANGED FIELDS ONLY — `6eac82e4-3730-4495-83d7-f15417edcecc`

*(Round-1 fixes: sensitivity now measured against the NAMED post-tax operating-CF base (~13.24%, was an unnamed 10.67%); "Class 43 (or equivalent)" replaced with "the assumed 25% tax-allowable depreciation pool".)*

### Model answer — Sensitivity section (changed)
**Step 5 — Sensitivity of the decision**

Holding all else equal, the projected annual operating cash flows can fall by **~13.24%** — measured against the post-tax present value of the operating cash flows (CAD 37.9m) — before the NPV reaches zero, below which the decision reverses. The smaller this margin, the more the recommendation depends on the reliability of that estimate.

### Model answer — Advice section (contains the Class-43 replacement)
**Step 6 — Advice to the board**

On these assumptions the NPV is positive; a positive result is a floor, not a mandate, so the recommendation to proceed is conditional on the following assumptions holding under scrutiny.

The board should treat the computed NPV as a base case rather than a point forecast. The operating cash flows rest on contracted volumes whose minimum-purchase clauses have not been stress-tested against a single network renegotiating at renewal; the sensitivity margin shows how much room exists before the decision reverses, and the board should weigh that margin against the probability it assigns to a renegotiation. The discount rate was calibrated to a domestic peer beta, yet a meaningful share of revenue is denominated in a foreign currency, so the board should require an explicit currency-risk premium and test whether a modestly higher rate would change the decision. The residual value should be validated by a specialist valuer, as specialised cleanroom assets can lose value quickly. Before committing capital the board should confirm the correct tax classification of the assumed 25% tax-allowable depreciation pool, since a change would reduce the tax shield and depress the NPV.

### Hint (changed — sensitivity base named)
Your sensitivity figure needs a verdict, not just a number — ask what the computed margin, measured against the post-tax present value of the operating cash flows, tells the board about the reliability of the contracted hospital-network volumes, and whether the 11.0% rate reflects the currency exposure the scenario flags before you sign off.

### Full reveal — sensitivity passage (changed)
The dominant failure here is FENCE-SITTING layered on UNDEVELOPED-ASSUMPTION: candidates compute the NPV and the sensitivity percentage, then stop — presenting the arithmetic as the advice. Sensitivity analysis exists to stress-test a specific assumption — here the projected annual operating cash flows — and the recommendation must state what the margin means in the context of the scenario facts (contracted hospital-network volumes and the break-clause renegotiation risk) and how confident the board can be that the assumption holds. Note the base the margin is measured against: the post-tax present value of the operating cash flows, not the present value of all inflows — scrap and the depreciation tax shield do not flex with operations, so including them would understate the true margin. The second misconception is leaving the 11.0% rate unchallenged when the scenario flags foreign-currency revenue exposure: accepting the peer-group rate without noting it may not capture that risk is listing an assumption rather than interrogating it. If your tax-shield or cash-flow figures differ from the model, carry your own numbers forward consistently into the sensitivity calculation and the recommendation — where your downstream method is sound those marks remain available and the error is charged once at its source.

---

*End of round-2 pack. Return: 10-finding resolution checklist, your two recomputations, and any new issues.*
