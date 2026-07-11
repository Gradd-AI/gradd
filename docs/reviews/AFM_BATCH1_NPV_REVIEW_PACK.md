# AFM — Batch 1 (NPV calculator, syllabus B1a) — Adversarial Review Pack

**4 drills, all `status = candidate`, `paper_code = AFM`, `lo_code = B1a`, intellectual level 3, 15 marks, command verb "advise".** One NPV calculator family, four kinds: standard, capital-rationing, sensitivity, Section-A (reject case).

---

## REVIEWER INSTRUCTIONS — read before you start

You are a hostile external examiner-reviewer. Your job is to try to **break** these drills, not to approve them. A drill you cannot break is one worth publishing. Assume nothing is correct until you have reproved it yourself.

This is a **BATCH** review of one calculator family. Two tiers of scrutiny:

- **Drill 1 (STANDARD) — FULL HOSTILITY.** It is the family exemplar; every structural, pedagogic, realism and contamination decision made here is inherited by its siblings. Attack it on every dimension below, exhaustively.
- **Drills 2–4 (rationing / sensitivity / Section-A) — SIBLING SPOT-CHECKS,** with **ONE non-negotiable exception: recompute EVERY figure in ALL FOUR drills from the raw inputs, in full.** Numeric integrity is never spot-checked. On the non-numeric dimensions, focus your fire on what each sibling does *differently* from Drill 1 (the PI ranking; the sensitivity margin; the negative-NPV reject logic and its prose) rather than re-deriving shared structure.

### Dimensions (apply all to Drill 1; apply numeric to all four; apply the rest to what each sibling does differently)

1. **Numeric recomputation — from raw inputs, every figure, all four drills.** Rebuild each appraisal yourself from the scenario's raw inputs only. Independently derive: the inflated (nominal) operating cash flows; the reducing-balance tax-allowable depreciation schedule INCLUDING the year-4 balancing allowance/charge on disposal; taxable profit and tax with the **one-year-in-arrears** lag (note tax therefore lands in a **year 5** period); net after-tax cash flows including scrap; discount factors at the stated rate; present values; and the NPV. Then check the **profitability index** (drill 2), the **sensitivity margin** (drill 3), and the **decision sign** (all four; drill 4 is a reject). Flag any figure you cannot reproduce to the stated tolerance, any internal inconsistency between the model answer's tables and its stated NPV, and any mismatch between the model answer and the answer-schema `expected_value`s.
2. **Syllabus fit at intellectual level 3 ("advise").** Level 3 demands application + evaluation + a judgement, not recall. Does each drill actually require the candidate to *advise a board*, or could it be answered by mechanical calculation alone? Is the marks weighting (15) and the calc/judgement split defensible for B1a? Is anything out-of-syllabus for B1a specifically (as opposed to elsewhere in AFM Section B/E)?
3. **Scenario realism.** Are the numbers, sector, jurisdiction and institutional details internally coherent and true to a real AFM case? Watch specifically for: tax rates, depreciation mechanics and named tax classes that don't match the jurisdiction; cash-flow magnitudes implausible for the stated business; residual values, discount-rate derivations, and market-share/contract assumptions that a real board would not accept. If the drill names a specific real-world mechanism (a tax class, a rule), verify it is *correctly* named for the numbers used.
4. **Pedagogy.** Does the `hint` point at the *thinking gap* without leaking the answer? Does the `full_reveal` diagnose the dominant misconception and give the correct mental model, rather than restating the method? Is the teaching consistent across the four `full_reveal`s? Is the model answer's *advice* section a genuine board-level evaluation, or does it fence-sit / list undeveloped assumptions?
5. **Contamination check.** Does any drill import facts, figures, risk factors, premia or named entities into the model answer / reveal / hint that are **not present in that drill's own scenario**? Evaluative prose may name only risks the scenario itself states. Also check cross-drill contamination (these four share a sector and a template — confirm no scenario's specifics have bled into another's answer). Recompute-blind prose that contradicts the drill's own computed result is a contamination-class failure.

### How to report

For every issue: name the drill, the field (`question` / `context_text` / `model_answer` / `hint` / `full_reveal` / `answer_schema`), quote the exact text, state the defect, and — for numeric issues — show your recomputation. Rank findings by severity. A correction that touches one claim must be applied across **all five drill fields** (question, context, model answer, hint, reveal), so flag every field a given defect appears in. Do not soften a finding because the rest of the drill is strong.

---

## BATCH OVERVIEW

| # | Kind | ID (short) | Company / project | Headline result |
|---|------|-----------|-------------------|-----------------|
| 1 | Standard | `4e6df0b6` | NorthStar Biogenics — GenFlex-7 | NPV **+CAD 0.7m** → accept |
| 2 | Capital rationing | `716f69f8` | NorthStar Biogenics — GlycoSynth-7 | NPV **+CAD 2.6m**, PI **1.144** |
| 3 | Sensitivity | `6eac82e4` | NorthernRx Biosciences — Veldora | NPV **+CAD 5.0m**, margin **~10.67%** |
| 4 | Section-A (reject) | `f2817d06` | NovaBiologics — Montréal fill-finish | NPV **−CAD 3.6m** → reject |

Shared assumptions across the family: real pre-tax operating cash flows inflated to nominal; tax on (operating cash flow − tax-allowable depreciation), paid one year in arrears; reducing-balance depreciation with a year-4 balancing item on disposal; nominal flows discounted at a nominal risk-adjusted rate. Graded numeric chain per drill: `ncf_p → pv_p → npv`; decision, PI-ranking and sensitivity are code-owned enrichment.

---

# DRILL 1 — STANDARD — `4e6df0b6-f59f-4f34-92c0-792ac1ea30b4` — FULL HOSTILITY

**Metadata:** ACCA / AFM / B1a "Discounted cash flow techniques" · command verb **advise** · level **3** · professional skill **analysis_and_evaluation** · calculation required · 15 marks · mode **quantitative**.

### Question
> Advise the board of NorthStar Biogenics Inc. whether it should proceed with the GenFlex-7 manufacturing expansion, supporting your recommendation with a net present value (NPV) appraisal that explicitly treats inflation, taxation (including tax-allowable depreciation), and sensitivity analysis.

### Context (`context_text`)
> NorthStar Biogenics Inc. is a mid-sized Canadian pharmaceutical company headquartered in Mississauga, Ontario. The company specialises in biosimilar drug manufacturing and holds a federal Health Canada licence to produce four biosimilar compounds. Following the expiry of a competitor's patent on a high-volume autoimmune therapy in early 2026, the board is evaluating whether to expand its Mississauga fill-and-finish facility — a project internally designated GenFlex-7.
>
> The expansion requires the immediate installation of a dedicated sterile filling line and cleanroom suite. The board's investment committee has presented the following data to you as senior financial adviser.
>
> **--- RAW PROJECT INPUTS (all monetary figures in CAD millions) ---**
> - Initial capital outlay (Time 0): **CAD 38.0 m**
>   - Of which, capital qualifying for CCA (Capital Cost Allowance — Canada's tax-allowable depreciation): **CAD 36.0 m**
>   - CCA reducing-balance rate: **25%**
> - Pre-tax operating cash flows (REAL terms, i.e. today's purchasing power): Year 1 **CAD 9.2 m**, Year 2 **CAD 12.8 m**, Year 3 **CAD 13.5 m**, Year 4 **CAD 11.4 m**
> - Residual / scrap value of equipment (end of Year 4, nominal terms): **CAD 4.5 m**
> - General inflation rate: **3.5%**
> - Corporate tax rate: **26.5%**
> - Tax payment lag: **1 year in arrears**
> - Risk-adjusted discount rate (nominal): **11.0%**
>
> **--- CHALLENGEABLE TEXTURES ---**
> 1. FORECAST OPTIMISM: The real cash-flow forecasts for Years 2–4 were produced by the commercial team and assume NorthStar captures a 14% market share of the Canadian autoimmune biosimilar market within 18 months of launch. This share estimate has no published comparable and relies on management's assertion that competitor capacity will be constrained. The board should treat this assumption with scepticism.
> 2. DISCOUNT-RATE RELIABILITY: The 11.0% nominal discount rate was derived using a peer-group beta from three comparable US biologics manufacturers. Because NorthStar is unlisted and the Canadian biosimilar market differs structurally from the US market, the beta transfer may introduce material estimation error; the board should confirm whether this rate adequately reflects NorthStar's specific risk profile.

### Model answer (`model_answer`)
> **Investment appraisal — net present value**
>
> **Assumptions:** cash flows are in money (nominal) terms; operating cash flows are inflated at 3.50% a year; tax at 26.50% is charged on operating cash flow less tax-allowable depreciation and is paid one year in arrears; tax-allowable depreciation is 25.00% reducing balance with a balancing allowance/charge on disposal in year 4; flows are discounted at a risk-adjusted rate of 11.00%.
>
> **Step 1 — Tax-allowable depreciation (reducing balance)** — WDA: Y1 CAD 9.0m · Y2 CAD 6.8m · Y3 CAD 5.1m · Y4 CAD 10.7m
>
> **Step 2 — Taxable profit and tax**
> | Year | Operating CF | WDA | Taxable | Tax |
> |---|---|---|---|---|
> | 1 | 9.5 | 9.0 | 0.5 | 0.1 |
> | 2 | 13.7 | 6.8 | 7.0 | 1.8 |
> | 3 | 15.0 | 5.1 | 9.9 | 2.6 |
> | 4 | 13.1 | 10.7 | 2.4 | 0.6 |
>
> **Step 3 — Net cash flows and present values**
> | Period | Net CF | DF @ 11.00% | PV |
> |---|---|---|---|
> | 0 | −38.0 | 1.000 | −38.0 |
> | 1 | 9.5 | 0.901 | 8.6 |
> | 2 | 13.6 | 0.812 | 11.0 |
> | 3 | 13.1 | 0.731 | 9.6 |
> | 4 | 15.0 | 0.659 | 9.9 |
> | 5 | −0.6 | 0.593 | −0.4 |
>
> **NPV = Σ present values − initial outlay = CAD 0.7m**
>
> **Step 4 — Decision.** The NPV of CAD 0.7m is **positive**, so on these assumptions the project **adds shareholder value and should be accepted**.
>
> **Step 5 — Advice to the board.** The board should approach this appraisal with structured scepticism across three dimensions before treating the NPV as a firm signal.
> First, the cash-flow forecast is the single most fragile input. The commercial team's assertion of a 14% biosimilar market-share capture within 18 months rests on an unverified assumption that competitor fill-and-finish capacity will be constrained — a factor NorthStar does not control and which Health Canada licensing timelines could rapidly change. If additional domestic manufacturers obtain licences sooner than assumed, Year 2 and Year 3 revenues could deteriorate materially, and the board should require independent market intelligence to validate this share estimate before committing CAD 38.0 m.
> Second, the discount rate deserves scrutiny. Deriving a beta from three US biologics peers and applying it to an unlisted Canadian biosimilar manufacturer introduces a structural mismatch: the Canadian market has fewer large institutional buyers, tighter provincial drug-formulary negotiation cycles, and different systemic risk characteristics than the US reference group. The board should commission a sensitivity test around the 11.0% rate to understand how the decision changes if NorthStar's true risk-adjusted cost of capital is higher.
> Third, the residual value of CAD 4.5 m assumed at Year 4 for the sterile filling line presupposes an active secondary market for specialised cleanroom equipment — an assumption that may not hold if the equipment is highly bespoke or if regulatory requirements make it difficult to transfer to a third party; the board should obtain an independent equipment valuation to underpin this figure.
> Finally, the board must confirm that the 25% Capital Cost Allowance rate correctly reflects the CCA class applicable to pharmaceutical cleanroom and filling-line assets under the Income Tax Act (Canada), and should verify whether the half-year rule applies at acquisition, as this would reduce the first-year CCA claim and marginally affect the tax-shield timing.
>
> *Reconciliation: Σ present values CAD 38.7m − initial outlay CAD 38.0m = NPV CAD 0.7m ✓*

### Hint (`hint`)
> Check whether your advice to the board goes beyond restating the NPV sign — have you challenged the fragility of at least one specific input (the market-share assumption, the discount rate derivation, or the residual value premise) and told the board what to verify before committing CAD 38.0m?

### Full reveal (`full_reveal`)
> The dominant misconception here is FENCE-SITTING fused with UNDEVELOPED-ASSUMPTION: candidates complete the NPV mechanics, note that the result is positive, and stop — as if a positive number is itself the advice. That thinking fails because the NPV is only as reliable as its weakest input, and a board committing CAD 38.0m needs to know which assumption, if wrong, flips the decision — not just that the arithmetic currently clears zero. The correct mental model is that the calculation is the floor, not the ceiling: once you have the number, your job is to stress-test the inputs that are most contestable in this specific scenario — the commercial team's market-share projection, the peer-group beta transplanted from US biologics firms to an unlisted Canadian manufacturer, and the assumed resale market for bespoke cleanroom equipment — and tell the board what independent verification is required before the capital is committed. On the mechanics, if your reducing-balance CCA schedule or your one-year-in-arrears tax timing differs from the model, carry your own figures forward consistently through the net cash flow and discounting steps — where your downstream method is correct, those marks still score, because the examiner charges the error once at its source; OFR credit is conditional on your own figure being used correctly in each subsequent step, not granted automatically. The 11% discount rate in this drill is a given risk-adjusted nominal rate applied to nominal (money-terms) flows — mixing real flows with a nominal rate, or deducting a financing cost from the operating cash flows before discounting, would be a flow-rate mismatch that distorts every present value in the schedule.

### Answer-schema summary (`answer_schema`)
**Params:** initial_outlay 38 · capital_for_wda 36 · wda_rate 0.25 · inflation_rate 0.035 · tax_rate 0.265 · tax_lag 1 · discount_rate 0.11 · scrap_value 4.5.
Every component: unit **CADm**, tolerance **relative ±0.5%**.

| component_id | label | expected_value | depends_on | recompute |
|---|---|---|---|---|
| ncf_1 | Net after-tax cash flow, year 1 | 9.521999999999998 | — | — |
| ncf_2 | Net after-tax cash flow, year 2 | 13.57335 | — | — |
| ncf_3 | Net after-tax cash flow, year 3 | 13.122846112499996 | — | — |
| ncf_4 | Net after-tax cash flow, year 4 (incl. scrap) | 14.956886509312497 | — | — |
| ncf_5 | Net after-tax cash flow, year 5 (tax tail) | −0.6344794848881243 | — | — |
| pv_1 | Present value, year 1 | 8.578378378378376 | ncf_1 | pv_discount_y1 |
| pv_2 | Present value, year 2 | 11.01643535427319 | ncf_2 | pv_discount_y2 |
| pv_3 | Present value, year 3 | 9.595311975598676 | ncf_3 | pv_discount_y3 |
| pv_4 | Present value, year 4 | 9.852564420455632 | ncf_4 | pv_discount_y4 |
| pv_5 | Present value, year 5 | −0.37653269293276753 | ncf_5 | pv_discount_y5 |
| npv | Net present value | 0.6661574357731013 | pv_1..pv_5 | npv_sum_less_outlay |

---

# DRILL 2 — CAPITAL RATIONING — `716f69f8-863f-421d-977c-44c64d5ab7ea` — SIBLING (recompute all figures)

**Metadata:** as Drill 1 (B1a, advise, level 3, 15 marks, quantitative).

### Question
> Advise the board of NorthStar Biogenics Inc. whether to proceed with the GlycoSynth-7 manufacturing expansion, given the company's capital rationing position, by appraising the project using net present value and profitability index, and ranking it against the competing investment proposals to determine the optimal allocation of available capital.

### Context (`context_text`)
> NorthStar Biogenics Inc. is a mid-sized Canadian pharmaceutical manufacturer headquartered in Mississauga, Ontario. The company specialises in biosimilar drug substances for the domestic and export markets. The board is evaluating a capital investment in the GlycoSynth-7 active pharmaceutical ingredient (API) production line — a dedicated facility to manufacture a biosimilar monoclonal antibody currently imported at high cost from contract manufacturers in South Korea.
>
> The project requires a CAD 18.0m capital outlay at time 0. The pre-tax operating cash flows, expressed in real (today's money) terms, are forecast by the commercial team as follows: Year 1 CAD 5.2m, Year 2 CAD 6.8m, Year 3 CAD 7.4m, Year 4 CAD 6.1m. The board's head of commercial has acknowledged that these forecasts were constructed during a period of strong order-book visibility and may reflect a degree of optimism — the two largest hospital-group clients have contracts expiring at the end of Year 2, and renewal is not guaranteed.
>
> General inflation is running at 3.0% per annum and is applied to operating cash flows. The corporate tax rate is 26.5%. Tax is paid one year in arrears. The entire capital cost of CAD 18.0m qualifies for tax-allowable depreciation (capital cost allowance) on a reducing-balance basis at 25% per annum. The scrap/residual value of the facility at the end of Year 4 is estimated at CAD 2.5m. The risk-adjusted discount rate is 11.0% per annum. The board should be aware that the Bank of Canada's forward guidance on interest rates has been volatile, and the 11.0% discount rate — derived partly from current financing costs — may not remain stable over a four-year horizon.
>
> The capital rationing constraint: NorthStar's treasury function has confirmed that the maximum capital available for new investment this period is CAD 32.0m. Three other divisible investment proposals are competing for the same pool of funds:
> - Project Helix (analytical laboratory automation): outlay CAD 9.0m, profitability index 1.18
> - Project ColdChain (temperature-controlled logistics hub): outlay CAD 14.0m, profitability index 1.09
> - Project NovaDerm (topical dermatology line expansion): outlay CAD 7.5m, profitability index 1.22
>
> The board must allocate capital optimally across all proposals (including GlycoSynth-7) within the CAD 32.0m limit. All projects other than GlycoSynth-7 are assumed divisible.
> [Raw inputs restated: outlay 18.0 · real OCF 5.2/6.8/7.4/6.1 · inflation 3.0% · tax 26.5% · lag 1yr · capital for WDA 18.0 · WDA 25% · scrap 2.5 · rate 11.0% · capital limit 32.0]

### Model answer (`model_answer`)
> **Investment appraisal — net present value.** Assumptions as standard (nominal flows; OCF inflated 3.00%; tax 26.50% on OCF less 25.00% reducing-balance depreciation, one year in arrears, year-4 balancing item; discount 11.00%).
>
> **Step 1 — WDA:** Y1 4.5 · Y2 3.4 · Y3 2.5 · Y4 5.1.
>
> **Step 2 — Taxable profit and tax:** Y1 OCF 5.4 / WDA 4.5 / taxable 0.9 / tax 0.2 · Y2 7.2 / 3.4 / 3.8 / 1.0 · Y3 8.1 / 2.5 / 5.6 / 1.5 · Y4 6.9 / 5.1 / 1.8 / 0.5.
>
> **Step 3 — Net cash flows and PVs:** P0 −18.0 (PV −18.0) · P1 5.4 ×0.901 = 4.8 · P2 7.0 ×0.812 = 5.7 · P3 7.1 ×0.731 = 5.2 · P4 7.9 ×0.659 = 5.2 · P5 −0.5 ×0.593 = −0.3.
>
> **NPV = Σ PV − outlay = CAD 2.6m.**
>
> **Step 4 — Decision.** NPV CAD 2.6m positive → adds shareholder value, accept.
>
> **Step 5 — Single-period capital rationing (profitability index).** This project's PI (PV of inflows ÷ outlay) is **1.144**. Ranked against the divisible projects within the CAD 32.0m limit:
> | Rank | Project | PI | Outlay | Capital allocated |
> |---|---|---|---|---|
> | 1 | Project NovaDerm | 1.220 | 7.5 | 7.5 |
> | 2 | Project Helix | 1.180 | 9.0 | 9.0 |
> | 3 | this project | 1.144 | 18.0 | 15.5 |
> | 4 | Project ColdChain | 1.090 | 14.0 | 0.0 |
>
> *(Multi-period rationing would require linear programming and is beyond this single-period ranking — a discussion point, not a computation.)*
>
> **Step 6 — Advice to the board.** The most fragile input is the real operating cash-flow forecast, which the head of commercial has himself flagged as potentially optimistic: the two largest hospital-group contracts expire at the end of Year 2, and if those clients do not renew, the Year 3 and Year 4 cash flows — which carry the heaviest weight in justifying the outlay — could deteriorate materially. The board should require a downside scenario reflecting non-renewal before any funding commitment. The 11.0% rate deserves equal scrutiny: derived partly from current financing conditions at a time when the Bank of Canada's rate path is volatile, a meaningful upward shift over the four-year horizon would compress the present value of later cash flows disproportionately given the project's back-weighted profile. The residual value of CAD 2.5m should be stress-tested — biosimilar manufacturing equipment is highly specialised and the secondary market is thin, so obtain an independent valuation. From a capital-rationing perspective, the board must satisfy itself that the CAD 32.0m ceiling is genuinely binding and not artificial, since a divisibility assumption applied to NorthStar's own bespoke facility would be commercially unrealistic — GlycoSynth-7 must be treated as indivisible, which affects how residual capital is deployed across the competing proposals. Due diligence should additionally encompass Health Canada regulatory-approval timelines for the biosimilar line, because any delay to commissioning would defer the first cash inflows and weaken the project's value profile relative to the ranking produced by this analysis.
>
> *Reconciliation: Σ present values CAD 20.6m − initial outlay CAD 18.0m = NPV CAD 2.6m ✓*

### Hint (`hint`)
> Check whether your NPV calculation feeds directly into a profitability index ranking — and whether that ranking then drives an explicit, reasoned recommendation to the board about how much of the CAD 18.0m outlay to fund within the CAD 32.0m constraint, including a challenge to the divisibility assumption applied to NorthStar's own bespoke facility.

### Full reveal (`full_reveal`)
> The dominant misconception in capital-rationing drills is ABANDONED-AFTER-CALC: candidates compute NPV and even construct a PI table, then stop — as if the ranking were the conclusion rather than the input to a recommendation. This is wrong because the PI table is a prioritisation tool, not a decision; its output only becomes advice when the analyst interrogates the assumptions that could invalidate the ranking — in this scenario, the divisibility assumption is the most commercially fragile, since a bespoke biosimilar manufacturing facility is unlikely to be partially funded in the way a financial model treats a divisible project, and treating it as divisible may misstate the true capital allocation. The correct mental model is to move from calculation, to ranking, to a board-level verdict that names the binding constraint, challenges the weakest inputs (here, the commercial cash flow forecast flagged as potentially optimistic and the residual value of specialised equipment in a thin secondary market), and states clearly what the board must verify before committing capital. If your NPV or PI figure differs from the model answer, carry your own figure forward consistently into the ranking and advice — where your downstream method is sound, those marks remain available, and the error is charged once at its source. The boardroom test is simple: would a finance director reading your answer know exactly what to approve, what to stress-test first, and why the capital ceiling itself deserves scrutiny before it is treated as genuinely binding?

### Answer-schema summary
**Params:** initial_outlay 18 · capital_for_wda 18 · wda_rate 0.25 · inflation_rate 0.03 · tax_rate 0.265 · tax_lag 1 · discount_rate 0.11 · scrap_value 2.5. All components CADm, tolerance relative ±0.5%.

| component_id | expected_value | depends_on | recompute |
|---|---|---|---|
| ncf_1 | 5.356000000000001 | — | — |
| ncf_2 | 6.987279999999999 | — | — |
| ncf_3 | 7.0688130000000005 | — | — |
| ncf_4 (incl. scrap) | 7.893547344000001 | — | — |
| ncf_5 (tax tail) | −0.4695412413650001 | — | — |
| pv_1 | 4.825225225225226 | ncf_1 | pv_discount_y1 |
| pv_2 | 5.671033195357518 | ncf_2 | pv_discount_y2 |
| pv_3 | 5.168655141628114 | ncf_3 | pv_discount_y3 |
| pv_4 | 5.1997241313727995 | ncf_4 | pv_discount_y4 |
| pv_5 | −0.2786498732663235 | ncf_5 | pv_discount_y5 |
| npv | 2.585987820317335 | pv_1..pv_5 | npv_sum_less_outlay |

*(Note: the PI 1.144 and the four-project ranking are code-owned enrichment on top of the graded chain — recompute them independently: PI = Σ PV of inflows ÷ 18.0, and verify the ranking and the CAD 15.5m partial allocation to this project under the CAD 32.0m ceiling.)*

---

# DRILL 3 — SENSITIVITY — `6eac82e4-3730-4495-83d7-f15417edcecc` — SIBLING (recompute all figures)

**Metadata:** as Drill 1.

### Question
> Advise the board of NorthernRx Biosciences Inc. whether it should proceed with the Veldora manufacturing expansion project, supporting your recommendation with a net present value (NPV) appraisal and an assessment of how sensitive the decision is to the reliability of the projected annual operating cash flows.

### Context (`context_text`)
> NorthernRx Biosciences Inc. is a mid-sized Canadian pharmaceutical manufacturer headquartered in Mississauga, Ontario. The company specialises in generic oncology formulations and supplies hospitals and pharmacy chains across Canada and the northern United States. Following the expiry of a competitor's patent on the high-demand chemotherapy compound Veldora, the board is evaluating a four-year manufacturing expansion to capture an estimated 18% share of the Canadian generic market before further generic entrants are expected to erode margins.
>
> The proposed project requires the immediate construction of a dedicated cleanroom production wing and the installation of specialised blending and encapsulation equipment. The board's chief commercial officer has submitted a cash-flow forecast based on a contracted supply arrangement with two large provincial hospital networks, which management regards as conservative. However, an independent market consultant has noted that the contracted volumes contain a minimum-purchase clause that was not stress-tested against a scenario in which one provincial network renegotiates upon renewal — introducing material forecast risk.
>
> A second texture concerns the discount rate: the board's CFO has applied a risk-adjusted rate derived from a domestic peer-group beta. Given that a meaningful portion of forecast revenue is denominated in USD (cross-border hospital sales), the CFO's rate may not fully reflect currency and regulatory risk on those flows.
>
> Raw inputs (CAD millions): outlay 42.0 · real pre-tax OCF Year 1 13.5 / Year 2 15.8 / Year 3 16.4 / Year 4 14.2 · inflation 3.0% · tax 26.5% · one year in arrears · capital qualifying for WDA 38.0 · WDA reducing-balance 25% · scrap (end Year 4) 4.5 · risk-adjusted discount rate 11.0%.

### Model answer (`model_answer`)
> **Investment appraisal — net present value.** Assumptions as standard (nominal; OCF inflated 3.00%; tax 26.50% on OCF less 25.00% reducing-balance depreciation, one year in arrears, year-4 balancing item; discount 11.00%).
>
> **Step 1 — WDA:** Y1 9.5 · Y2 7.1 · Y3 5.3 · Y4 11.5.
>
> **Step 2 — Taxable profit and tax:** Y1 OCF 13.9 / WDA 9.5 / taxable 4.4 / tax 1.2 · Y2 16.8 / 7.1 / 9.6 / 2.6 · Y3 17.9 / 5.3 / 12.6 / 3.3 · Y4 16.0 / 11.5 / 4.5 / 1.2.
>
> **Step 3 — Net cash flows and PVs:** P0 −42.0 (PV −42.0) · P1 13.9 ×0.901 = 12.5 · P2 15.6 ×0.812 = 12.7 · P3 15.4 ×0.731 = 11.2 · P4 17.1 ×0.659 = 11.3 · P5 −1.2 ×0.593 = −0.7.
>
> **NPV = Σ PV − outlay = CAD 5.0m.**
>
> **Step 4 — Decision.** NPV CAD 5.0m positive → adds shareholder value, accept.
>
> **Step 5 — Sensitivity of the decision.** Holding all else equal, the annual operating cash flows can fall by **~10.67%** (in present-value terms) before the NPV reaches zero — below that the decision reverses. The smaller this margin, the more the recommendation depends on the reliability of that estimate.
>
> **Step 6 — Advice to the board.** Treat the computed NPV as a base-case estimate rather than a reliable point forecast, for two reasons grounded in the scenario. First, the annual operating cash flows are built on contracted volumes with provincial hospital networks whose minimum-purchase clauses have not been stress-tested against renegotiation: if even one network exercises a break-clause at renewal, actual receipts could fall materially below forecast, and the sensitivity analysis reveals precisely how much margin for error exists before the decision reverses — compare that margin against the probability assigned to a renegotiation event. Second, the 11.0% risk-adjusted rate was calibrated to a domestic peer-group beta, yet a meaningful share of revenues is USD-denominated; commission an explicit currency-risk premium to confirm whether 11.0% is adequate, bearing in mind a higher warranted rate would reduce every discounted cash flow and could alter the sign of the NPV. On tax, the 26.5% federal-plus-provincial blended rate and the one-year lag are consistent with Canadian practice, but confirm with tax advisers that the full CAD 38.0m qualifies for the Class 43 (or equivalent) capital-cost allowance pool, since any reclassification to a lower CCA class would reduce the tax-shield benefit and depress the NPV. The scrap value of CAD 4.5m should be validated against a specialist equipment valuer, as pharmaceutical cleanroom assets can suffer rapid obsolescence if regulatory standards are upgraded — do not treat this residual as certain. Before committing CAD 42.0m, require: an updated cash-flow model stress-tested for single-network renegotiation, a currency-adjusted discount-rate analysis, written confirmation of the applicable CCA class, and an independent residual-value appraisal.
>
> *Reconciliation: Σ present values CAD 47.0m − initial outlay CAD 42.0m = NPV CAD 5.0m ✓*

### Hint (`hint`)
> Your sensitivity figure is a number without a verdict — ask yourself what the computed margin tells the board about the reliability of the contracted hospital-network volumes, and whether the 11.0% discount rate fully reflects the currency exposure the scenario flags before you sign off the recommendation.

### Full reveal (`full_reveal`)
> The dominant failure pattern here is FENCE-SITTING layered on UNDEVELOPED-ASSUMPTION: candidates compute the NPV and the sensitivity percentage, then stop — presenting results as if the arithmetic is the advice. That is the floor, not the ceiling; a board cannot act on a number that is never connected to a decision. The correct mental model is that sensitivity analysis exists to stress-test a specific assumption — here the projected annual operating cash flows — and the recommendation must explicitly state what that margin means in the context of the scenario facts (contracted hospital-network volumes and the break-clause renegotiation risk) and how confident the board can be that the assumption will hold. The second misconception is leaving the 11.0% discount rate unchallenged: the scenario indicates USD-denominated revenue exposure, so a candidate who simply accepts the peer-group rate without noting that it may not capture currency risk is listing an assumption rather than interrogating it — an UNDEVELOPED-ASSUMPTION error that matters because a rate inadequate to the project's risk profile is a mismatch that may alter the sign of the NPV. If your tax-shield or cash-flow figures differ from the model answer, carry your own numbers forward consistently into the sensitivity calculation and the recommendation — where your downstream method is sound, those marks remain available and the error is charged once at its source.

### Answer-schema summary
**Params:** initial_outlay 42 · capital_for_wda 38 · wda_rate 0.25 · inflation_rate 0.03 · tax_rate 0.265 · tax_lag 1 · discount_rate 0.11 · scrap_value 4.5. All components CADm, tolerance relative ±0.5%.

| component_id | expected_value | depends_on | recompute |
|---|---|---|---|
| ncf_1 | 13.905000000000001 | — | — |
| ncf_2 | 15.594895 | — | — |
| ncf_3 | 15.3668595 | — | — |
| ncf_4 (incl. scrap) | 17.14932731 | — | — |
| ncf_5 (tax tail) | −1.1795084020300004 | — | — |
| pv_1 | 12.527027027027026 | ncf_1 | pv_discount_y1 |
| pv_2 | 12.657166626085543 | ncf_2 | pv_discount_y2 |
| pv_3 | 11.23611522406263 | ncf_3 | pv_discount_y3 |
| pv_4 | 11.296793084847755 | ncf_4 | pv_discount_y4 |
| pv_5 | −0.699980827640932 | ncf_5 | pv_discount_y5 |
| npv | 5.017121134382023 | pv_1..pv_5 | npv_sum_less_outlay |

*(The ~10.67% sensitivity margin is code-owned enrichment: recompute it as NPV ÷ (PV of the operating-cash-flow stream the analysis flexes) and confirm both the value and the base it is taken over.)*

---

# DRILL 4 — SECTION-A (REJECT) — `f2817d06-8500-41c0-89ed-6e910f6b0d83` — SIBLING (recompute all figures)

**Metadata:** as Drill 1.

### Question
> Advise the board of NovaBiologics Inc. whether to proceed with the proposed acquisition and commissioning of the Montréal fill-finish facility, presenting a fully worked NPV appraisal and an integrated strategic recommendation that addresses the key assumptions underlying the forecast.

### Context (`context_text`)
> **Background.** NovaBiologics Inc. ("NovaBiologics") is a mid-sized Canadian specialty-pharmaceutical company headquartered in Toronto, Ontario, listed on the Toronto Stock Exchange (TSX). The company develops and distributes biosimilar injectable therapies. Its current fill-finish operations are entirely outsourced to a contract-manufacturing organisation (CMO) in Québec, which has notified NovaBiologics that it will not renew the supply agreement beyond 2026. The board is evaluating whether to acquire and commission a dedicated in-house fill-finish facility in Montréal ("the Montréal Project") to secure long-run manufacturing independence and capture the margin currently paid to the CMO.
>
> **The Montréal Project.** The facility would be acquired at the start of Year 1 for a total capital cost of CAD 52.0 million, covering the building fit-out, sterile filling lines, and isolator technology. The entire capital cost qualifies for Canada Revenue Agency (CRA) tax-allowable depreciation under the declining-balance Class 10 rate. The asset is expected to have a residual/scrap value of CAD 4.5 million at the end of the four-year appraisal horizon, reflecting the re-sale value of the sterile-filling equipment to a secondary market.
>
> The chief commercial officer (CCO) has submitted pre-tax operating cash-flow projections expressed in real (today's money) terms: Year 1 CAD 10.2m · Year 2 CAD 14.8m · Year 3 CAD 17.5m · Year 4 CAD 16.0m. The CCO's projections assume that NovaBiologics will win three new biosimilar supply contracts in Years 2 and 3. These contracts have not yet been signed, and the board should treat this concentration of revenue growth as a material forecast risk.
>
> **Economic and Tax Assumptions.** General inflation 3.0% p.a. (Bank of Canada medium-term target corridor) · corporate tax rate (federal + Québec provincial blended) 26.5% · tax paid one year in arrears · CRA declining-balance depreciation rate 30% p.a. (reducing balance) · risk-adjusted discount rate 11.0% p.a., set by treasury using a comparable-company beta drawn from a peer group of North American biosimilar manufacturers.
>
> **Challengeable textures.** (1) *Forecast optimism*: real cash flows embed revenue from three unsigned biosimilar supply contracts; if even one is delayed or lost, Year 2–3 inflows could be materially lower, and the board should request a probability-weighted or scenario-adjusted forecast before committing capital. (2) *Discount-rate reliability*: the 11.0% rate is derived from a North American peer-group beta, yet NovaBiologics operates exclusively in Canadian provincial markets with distinct reimbursement and regulatory risks (Health Canada approval timelines, provincial formulary-listing delays) not fully reflected in a broad North American peer set; treasury has not disclosed whether any country- or regulatory-specific premium was added.
>
> **Raw inputs:** outlay 52.0 · real OCF 10.2/14.8/17.5/16.0 · inflation 3.0% · tax 26.5% · lag 1yr · capital for WDA 52.0 · WDA declining-balance 30% · scrap 4.5 · rate 11.0%.

### Model answer (`model_answer`)
> **Investment appraisal — net present value.** Assumptions as standard EXCEPT tax-allowable depreciation is **30.00%** reducing balance (year-4 balancing item); OCF inflated 3.00%; tax 26.50% one year in arrears; discount 11.00%.
>
> **Step 1 — WDA:** Y1 15.6 · Y2 10.9 · Y3 7.6 · Y4 13.3.
>
> **Step 2 — Taxable profit and tax:** Y1 OCF 10.5 / WDA 15.6 / taxable **−5.1** / tax **−1.3** · Y2 15.7 / 10.9 / 4.8 / 1.3 · Y3 19.1 / 7.6 / 11.5 / 3.0 · Y4 18.0 / 13.3 / 4.7 / 1.2.
>
> **Step 3 — Net cash flows and PVs:** P0 −52.0 (PV −52.0) · P1 10.5 ×0.901 = 9.5 · P2 17.1 ×0.812 = 13.8 · P3 17.9 ×0.731 = 13.1 · P4 19.5 ×0.659 = 12.8 · P5 −1.2 ×0.593 = −0.7.
>
> **NPV = Σ PV − outlay = CAD −3.6m.**
>
> **Step 4 — Decision.** NPV CAD −3.6m **negative**, so on these assumptions the project **destroys value and should be rejected** as it stands.
>
> **Step 5 — Advice to the board.** The board should approach this appraisal with **cautious optimism** tempered by two structural risks that the raw figures alone cannot resolve. First, the CCO's real cash-flow forecast is built on biosimilar supply contracts that remain unsigned at the appraisal date; the board should require either a probability-weighted scenario set or, at minimum, a base case that excludes unsigned-contract revenue before treating the central projection as a basis for a CAD 52.0 million commitment. Second, the treasury team's 11.0% discount rate is drawn from a broad North American peer-group beta, yet NovaBiologics operates exclusively within Canadian provincial reimbursement frameworks subject to Health Canada approval timelines and provincial formulary-listing lags — regulatory frictions that a pan-North-American comparator set may systematically underweight; the board should require the treasury team to confirm whether any jurisdiction-specific premium has been incorporated, and if not, to model the sensitivity of the decision to a modestly higher rate. Third, the CAD 4.5 million residual value rests on the assumption of a functioning secondary market for sterile fill-finish equipment at the end of the appraisal horizon; the board should obtain at least one independent equipment valuation before relying on this figure, as a lower scrap realisation would reduce the project's terminal-year cash inflow. Finally, even if the NPV is computed to be positive, the board must weigh whether the capital commitment forecloses other growth options — the strategic value of manufacturing independence after the CMO contract expires in 2026 provides a qualitative floor that pure NPV arithmetic will not capture, but it cannot substitute for a rigorous, contract-by-contract revenue validation before the investment decision is formally approved.
>
> *Reconciliation: Σ present values CAD 48.4m − initial outlay CAD 52.0m = NPV CAD −3.6m ✓*

### Hint (`hint`)
> Check whether your advice to the board goes beyond restating the NPV sign — have you interrogated the unsigned supply contracts, the peer-group discount rate, and the residual value assumption, and have you told the board what to do about each of them?

### Full reveal (`full_reveal`)
> The classic failure here is a combination of FENCE-SITTING and UNDEVELOPED-ASSUMPTION: candidates compute the NPV, note that it is negative, write "reject the project," and stop — as if the arithmetic were the advice. That is the floor of the answer, not the ceiling. A board committing CAD 52 million needs to know *which* assumptions are fragile and *what action* to take on each, not merely what the central-case number implies. The second trap is listing assumptions — unsigned contracts, the discount rate, the residual value — without developing why each one is structurally uncertain in this scenario: unsigned biosimilar contracts mean the revenue base has not been contractually locked in, a pan-North-American beta may not price Canadian regulatory and formulary-listing risk, and a quoted residual value is only as reliable as an independent secondary-market valuation. The correct mental model is to treat every major assumption as a decision gate: for each one, tell the board what evidence it should require before the assumption can be relied upon, because an assumption that cannot be verified before commitment is a risk that the NPV arithmetic silently absorbs. Finally, if your tax-allowable depreciation schedule or inflation of cash flows went wrong, carry your own figures forward consistently into the NPV and the recommendation — where your downstream method is sound, those marks remain available, and the error is charged once at its source.

### Answer-schema summary
**Params:** initial_outlay 52 · capital_for_wda 52 · wda_rate **0.3** · inflation_rate 0.03 · tax_rate 0.265 · tax_lag 1 · discount_rate 0.11 · scrap_value 4.5. All components CADm, tolerance relative ±0.5%.

| component_id | expected_value | depends_on | recompute |
|---|---|---|---|
| ncf_1 | 10.506 | — | — |
| ncf_2 | 17.05123 | — | — |
| ncf_3 | 17.855672700000003 | — | — |
| ncf_4 (incl. scrap) | 19.4662794975 | — | — |
| ncf_5 (tax tail) | −1.238117354400001 | — | — |
| pv_1 | 9.464864864864865 | ncf_1 | pv_discount_y1 |
| pv_2 | 13.839160782404024 | ncf_2 | pv_discount_y2 |
| pv_3 | 13.055913985570669 | ncf_3 | pv_discount_y3 |
| pv_4 | 12.82304125636702 | ncf_4 | pv_discount_y4 |
| pv_5 | −0.7347623882610297 | ncf_5 | pv_discount_y5 |
| npv | −3.5517814990544565 | pv_1..pv_5 | npv_sum_less_outlay |

*(Note the year-1 negative taxable profit / tax credit: confirm the sign convention and the timing of that credit in year 2 are correct. This is the family's reject case — verify the negative NPV is genuine and not a schedule error.)*

---

*End of review pack. Return findings ranked by severity, drill-by-drill, with recomputations shown.*
