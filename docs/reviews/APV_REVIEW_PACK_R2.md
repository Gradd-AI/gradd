# AFM APV batch — review pack R2 (delta of round-1 amendments)

**Round-1 verdict: all 5 findings ACCEPTED and applied cross-field.** All four drills re-gated — now **6 gates** (added **P6 loss-relief**: a negative-taxable year requires a stated loss-relief assumption). This pack shows ONLY the amended fields; unchanged fields are in `AFM_BATCH_APV_REVIEW_PACK.md`.

> ### ⚠ READ FIRST — this is a ROUND-2 DELTA pack, and its bodies have since been REFRESHED past round 2.
>
> The section bodies below are the **current live DB state (verified 2026-07-25)**, not a frozen round-2 artefact. Two later changes have been absorbed into them, and one round-2 amendment that this pack documents no longer appears as a delta because the field moved again afterwards. Read the headings for *what round 2 changed*; read the bodies for *what the row says now*.
>
> **Drill 4 (`B3k dedca530`) CHANGED MATERIALLY on 2026-07-25** — its scenario bullet, arrangement fee, `debt_issue_costs` and `apv_debt` all moved. This pack only ever quoted `dedca530`'s `full_reveal`, which is **unchanged**, so nothing below shows it. The full before/after table is at the top of `AFM_BATCH_APV_REVIEW_PACK.md` — **read that before reviewing Drill 4 anywhere.** Summary: debt arrangement fee 3.0% → 2.0%, `debt_issue_costs` −1.95 → −1.30, `apv_debt` 6.3213 → 6.9713, because −1.95 is a half-way rounding tie its tolerance could not absorb. Debt still wins (7.0 vs 2.5); the verdict did not flip.
>
> **Drill 2 (`B3j 34f9e897`) `model_answer` — cosmetic, same date:** `ncf_1` 449.35 and year-1 taxable 99.35 are 1 dp ties, now printing `BRL 449.4m` / `BRL 99.4m`. No stored value changed.

## Pattern-level outcomes

- **FIX 1 → new gate P6 (`lintLossRelief`, `validate-afm-prose.ts`; wired as GATE 6 in the generator).** Any drill whose computed tax schedule drives taxable profit negative in any year MUST carry a loss-relief line in context, else the gate fails.

- **FIX 1 retrospective (batches 1–2).** Scanned all 8 AFM NPV (B1a) + IRR (B1c) drills. The NPV reject suspect `f2817d06` was CLEAN (already carries a relief line). **3 IRR drills had the gap and were fixed** — `796651c2` (Y4 taxable −7.7), `003ab45c` (Y3 −199.1), `712cf3aa` (Y4 −1.5): a loss-relief line added to each context. All B1a/B1c now pass P6.

---

## Drill 1 — standard (B3j)  ·  `ecb2d89f-f13f-4d96-a3c7-66baccc27810`

### full_reveal — amended (FIX 4 — tax-shield certainty reworded (shield risk tracks the debt; model values only the shield on debt expected to remain outstanding; covenant texture compresses it))

The dominant misconception in APV drills is VALUATION-PLUMBING of the financing side-effects: candidates either discount the debt tax shield at the ungeared cost of equity (Keu) or collapse the whole appraisal into a single WACC-based NPV, which defeats the purpose of the APV framework entirely. The error matters because each cash flow stream must be discounted at the rate that reflects its own systematic risk — the operating base case carries business risk and belongs at Keu, while the tax shield's risk tracks the debt itself, which is why Kd prices it — but the model values only the shield on debt expected to remain outstanding, and the scenario's covenant texture is exactly what would compress it; using the wrong rate is a mismatch between risk and return, not a simple directional inflation or deflation of value. A second failure is FENCE-SITTING: candidates compute a positive APV and then write "the project may be worthwhile" — but the board hired you to make a call, not hedge it; a positive APV means the project adds shareholder value on the stated assumptions, so the recommendation is to accept, conditional on the assumptions surviving scrutiny (peer-derived Keu, covenant headroom, and REIT disposal certainty are the live stress points this scenario surfaces). If your own calculation of the base-case NPV or the tax shield differs from the model, carry your own figures forward consistently into the APV total and the final recommendation — where your method is sound downstream, those marks remain available and the error is charged once at its source.

---

## Drill 2 — subsidised (B3j)  ·  `34f9e897-4de7-4a68-8cf5-5cac2846567b`

### context_text — amended (FIX 3 — ANTT removed as the environmental-licence issuer (ANTT kept in its transport-concession role))


SCENARIO NARRATIVE

Via Planalto Concessões S.A. ("Via Planalto") is a Brazilian transport-infrastructure group that operates four highway concessions across the Centro-Oeste region under regulatory oversight from ANTT (Agência Nacional de Transportes Terrestres). The company currently carries modest financial leverage, and its existing WACC is relatively stable. The board is evaluating a material expansion — the Corredor Norte project — which would widen and resurface a 180 km stretch of federal highway BR-163 between Sinop (Mato Grosso) and Sorriso, adding two express-toll lanes and four new toll plazas.

The project changes Via Planalto's financing structure substantially: a BRL 520 million development loan, tied exclusively to this project, has been offered by the Banco Nacional de Desenvolvimento Econômico e Social (BNDES) at a below-market subsidised coupon. Because the project-specific debt is large, temporary, and extinguished at the end of the concession horizon, the conventional WACC-based NPV — which assumes a constant debt ratio — is an unreliable appraisal tool. APV, which values the financing side-effects explicitly and separately from the project's operating cash flows, is therefore the appropriate methodology.

The Corredor Norte concession runs for four years from the date of first toll collection (the appraisal horizon); the BNDES facility is drawn at project inception and outstanding in full until a single bullet repayment at the end of Year 4. The ungeared (all-equity) cost of equity, Keu, has been assessed by the finance team at 16.0% per annum, reflecting the systematic operating risk of a regulated toll-road in the Brazilian market at the current stage of the concession cycle.

RAW INPUTS (all monetary figures in BRL millions)

- Initial capital outlay (Time 0):                          BRL 1,400m
- Pre-tax operating cash flows (real terms, per year):
    Year 1:  BRL 430m
    Year 2:  BRL 500m
    Year 3:  BRL 570m
    Year 4:  BRL 620m
- Annual inflation rate:                                    4.5%
- Corporate tax rate (IRPJ + CSLL combined):                34%
- Tax-payment lag:                                          1 year (taxes paid one year in arrears)
- Capital qualifying for tax-allowable depreciation:        BRL 1,400m
- Tax-allowable depreciation rate (reducing-balance):       25% per annum
- Scrap / residual value at end of Year 4:                  BRL 180m
- Ungeared cost of equity, Keu (STATED, given):             16.0% per annum
- BNDES subsidised-loan amount:                             BRL 520m
- Market (pre-tax) cost of debt, kd:                        11.5% per annum
- Subsidised coupon actually paid on the BNDES loan:         6.0% per annum
- Loan term:                                                4 years (co-terminus with the appraisal horizon)

ADDITIONAL NOTES
The BNDES facility is project-tied: it cannot be drawn for any other purpose and lapses if the Corredor Norte concession is not granted the required environmental installation licence by the relevant environmental authority before drawdown. The loan carries no prepayment option; the subsidised coupon is fixed for the full four-year term. Interest is calculated on the outstanding principal each year; the principal is repaid in a single bullet at the end of Year 4.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.


### model_answer — amended (FIX 3 — Step-7 licence reference → "the required environmental installation licence")

**Investment appraisal — adjusted present value (APV)**

**Assumptions:** the project is valued in two stages — the base case as if **all-equity financed**, discounted at the ungeared cost of equity Keu of 16.00%, then the present value of the financing side-effects it triggers. Operating cash flows are in money terms, inflated at 4.50%; tax at 34.00% is charged on operating cash flow less tax-allowable depreciation (25.00% reducing balance, balancing allowance/charge in year 4) and paid one year in arrears. The debt tax shield is discounted at the **pre-tax cost of debt Kd** of 11.50%; discounting the shield at the risk-free rate instead is an accepted examiner alternative and would raise its present value slightly.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | BRL 350.0m |
| 2 | BRL 262.5m |
| 3 | BRL 196.9m |
| 4 | BRL 410.6m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | BRL 449.4m | BRL 350.0m | BRL 99.4m | BRL 33.8m |
| 2 | BRL 546.0m | BRL 262.5m | BRL 283.5m | BRL 96.4m |
| 3 | BRL 650.5m | BRL 196.9m | BRL 453.6m | BRL 154.2m |
| 4 | BRL 739.4m | BRL 410.6m | BRL 328.7m | BRL 111.8m |

**Step 3 — Base-case NPV (all-equity, discounted at Keu)**

| Period | Net cash flow | DF @ Keu 16.00% | Present value |
|--------|------|------|------|
| 0 | BRL -1400.0m | 1.000 | BRL -1400.0m |
| 1 | BRL 449.4m | 0.862 | BRL 387.4m |
| 2 | BRL 512.2m | 0.743 | BRL 380.7m |
| 3 | BRL 554.1m | 0.641 | BRL 355.0m |
| 4 | BRL 765.1m | 0.552 | BRL 422.6m |
| 5 | BRL -111.8m | 0.476 | BRL -53.2m |

**Base-case NPV = present value of the operating flows BRL 1492.4m − initial outlay BRL 1400.0m = BRL 92.4m.**

**Step 4 — Financing side-effects**

*Debt tax shield* — interest is tax-deductible, so BRL 520.0m of debt at 6.00% gives annual tax relief of BRL 10.6m, **received one year in arrears (the same lag as trading tax)** and discounted at the pre-tax cost of debt Kd 11.50%:

| Interest year | Interest | Tax relief | Received (period) | DF @ 11.50% | PV |
|------|------|------|------|------|------|
| 1 | BRL 31.2m | BRL 10.6m | 2 | 0.804 | BRL 8.5m |
| 2 | BRL 31.2m | BRL 10.6m | 3 | 0.721 | BRL 7.7m |
| 3 | BRL 31.2m | BRL 10.6m | 4 | 0.647 | BRL 6.9m |
| 4 | BRL 31.2m | BRL 10.6m | 5 | 0.580 | BRL 6.2m |

**PV of the tax shield = BRL 29.2m.**

*Subsidised-loan benefit* — the loan is priced below the market rate, so the firm saves 5.50% of BRL 520.0m = BRL 28.6m of interest each year (a pre-tax cash saving in the interest year); the smaller interest deduction then adds tax of BRL 9.7m **one year later — the same lag as the shield**. Both legs are discounted at the market Kd 11.50%:

| Interest year | Pre-tax saving (period y) | Extra tax (period y+1) | Net PV |
|------|------|------|------|
| 1 | +BRL 28.6m @ 0.897 | −BRL 9.7m @ 0.804 (period 2) | BRL 17.8m |
| 2 | +BRL 28.6m @ 0.804 | −BRL 9.7m @ 0.721 (period 3) | BRL 16.0m |
| 3 | +BRL 28.6m @ 0.721 | −BRL 9.7m @ 0.647 (period 4) | BRL 14.3m |
| 4 | +BRL 28.6m @ 0.647 | −BRL 9.7m @ 0.580 (period 5) | BRL 12.9m |

**PV of the subsidised-loan benefit = BRL 61.0m.**

**Step 5 — Adjusted present value**

| Component | Amount |
|------|------|
| Base-case NPV (all-equity) | BRL 92.4m |
| PV of debt tax shield | BRL 29.2m |
| PV of subsidised-loan benefit | BRL 61.0m |
| **Adjusted present value** | **BRL 182.6m** |

**Step 6 — Decision**

The APV of BRL 182.6m is **positive**, so once the financing side-effects are added to the all-equity base case the project **adds shareholder value and should be accepted**.

**Step 7 — Advice to the board**

On these assumptions the APV is positive; a positive result is a floor, not a mandate, so the recommendation is conditional on the base-case and financing assumptions below holding under scrutiny.

The first question the board must press is whether Keu of 16.0% is a genuinely ungeared rate that reflects only the operating risk of a regulated toll-road concession in Brazil's Centro-Oeste at this point in the concession cycle. If the finance team derived this figure from the observed equity beta of a partially-geared peer group without fully stripping out financial risk, Keu will be overstated, which would systematically penalise the base-case valuation; the board should request the peer-group data and the ungearing methodology before treating 16.0% as definitive. The subsidised financing is central to the case: the BNDES coupon of 6.0% is fixed for four years, but the scenario is explicit that the facility lapses if the concession is not granted the required environmental installation licence, so the subsidy benefit is contingent on that approval landing in time for the drawdown at inception; the board must confirm the licence-approval timeline against the financing schedule, since a lapse would extinguish the subsidy entirely and could force reliance on market-rate finance. The board should also weigh the traffic-volume uncertainty inherent in newly-added express-toll lanes: the operating cash flows are forecasts, and if throughput on the widened corridor builds more slowly than assumed the base case weakens regardless of the financing. Finally, the loan is repaid as a single bullet at the end of Year 4, so Via Planalto must refinance or hold liquid reserves of BRL 520 million at that date; the board should satisfy itself that its liquidity and refinancing access are adequate, particularly given that Brazilian sovereign spreads and domestic credit conditions can shift materially over a four-year horizon.

*Reconciliation: base-case NPV BRL 92.4m + financing side-effects BRL 90.2m = APV BRL 182.6m ✓*

---

## Drill 3 — reject (B3j)  ·  `1b717fd0-8dd8-40c6-81c5-481529716b1a`

### context_text — amended (FIX 1 — loss-relief assumption added (a negative-taxable year takes a tax credit))


HANSUNG HEAVY INDUSTRIES CO., LTD — BOARD ADVISORY MEMORANDUM

Background
Hansung Heavy Industries Co., Ltd ("Hansung" or "the Company") is a mid-tier South Korean shipbuilder headquartered in Geoje, a member of the Korea Shipbuilders' Association. The Company currently carries a conservative balance sheet with a debt-to-total-assets ratio of 12%, well below the industry average. The board is evaluating a proposed investment in a dedicated LNG carrier conversion and retrofitting facility ("the Facility") at its Okpo yard. The Facility would allow Hansung to capture a segment of the growing dual-fuel vessel retrofit market, driven by the International Maritime Organization's (IMO) 2030 sulphur and carbon-intensity regulations.

The project represents a material departure from Hansung's existing capital structure: to fund the Facility, the Company intends to raise a significant tranche of long-term secured debt — bringing its gearing to a level it has not sustained before. Because the financing mix will change substantially alongside the investment decision, the board's finance committee has directed that the appraisal be conducted using the Adjusted Present Value (APV) method rather than the traditional NPV/WACC approach. The ungeared (all-equity) cost of equity appropriate for a project of this risk class has been assessed by the Company's investment bank, Hana Securities, as 16.5% per annum. The project life is four years.

Challengeable textures
1. The stated Keu of 16.5% is provided by Hana Securities on the basis of comparable all-equity shipbuilding and marine-engineering projects in North-East Asia. The board should verify whether this peer-group is genuinely comparable — South Korean shipbuilders engaged in LNG conversion carry different technology-execution risk from conventional new-build yards, and a rate calibrated to standard shipbuilding may understate the true ungeared hurdle for a capital-intensive, specialised retrofit market.
2. The KRW 420,000m secured loan is underwritten against the assessed value of the Okpo yard assets. If Hansung's asset valuations decline — as occurred across Korean shipbuilders during the 2015–2016 industry downturn — the lender's security covenant may be triggered, forcing early repayment and collapsing the interest tax shield before the four-year term is complete.

Raw inputs
• Initial capital outlay: KRW 980,000m (payable at time 0)
• Pre-tax operating cash flows (real terms, before tax):
  – Year 1: KRW 155,000m
  – Year 2: KRW 198,000m
  – Year 3: KRW 215,000m
  – Year 4: KRW 230,000m
• Inflation rate: 2.8% per annum
• Corporate tax rate: 22% (South Korea standard rate)
• Tax-payment lag: 1 year in arrears
• Capital qualifying for tax-allowable depreciation: KRW 910,000m
• Tax-allowable depreciation rate (reducing-balance): 25% per annum
• Scrap / residual value at end of Year 4: KRW 60,000m
• Ungeared cost of equity (Keu): 16.5% per annum
• Debt raised: KRW 420,000m (secured, four-year term)
• Pre-tax market cost of debt (Kd): 7.2% per annum
• Debt issue / transaction costs: 3.5% of gross proceeds

Assume Hansung has sufficient taxable profits from other operations to use any project tax loss immediately, with the tax effect received one year in arrears.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.


### full_reveal — amended (FIX 2 — three lanes stated exactly (base@Keu, shield@Kd, issue costs = t0 undiscounted outflow))

The most common misconception in APV drills is VALUATION PLUMBING crossed with FENCE-SITTING: candidates either collapse the two-stage structure by discounting everything at WACC (destroying the entire point of APV, which is to isolate and value financing side-effects separately), or they complete the arithmetic and then stop — leaving the board without a recommendation. The plumbing error matters because APV works precisely by keeping the lanes exact: the base case is discounted at Keu, the tax shield at Kd, and issue costs are a time-0 outflow deducted undiscounted — merging them into one rate produces a figure that reflects neither correctly. On the fence-sitting side: a negative APV is not a finding to report neutrally; it is the trigger for a clear rejection recommendation, and the marks in Step 7 exist precisely because the examiner expects you to tell the board what to do with that number. If your APV figure is wrong but your downstream method is consistent — financing side-effects added to base-case NPV, decision anchored to the sign of the result — carry your own figure forward; where the method holds, those marks still score, and the error is charged once at its source. The boardroom question is always the same: the numbers are the floor, not the ceiling — you have calculated it, so now tell the board whether to commit KRW 980,000m of capital or walk away, and name the assumptions that could change that verdict.

---

## Drill 4 — financing_compare (B3k)  ·  `dedca530-3bad-4537-9f73-7ffc5631cc5f`

### full_reveal — amended (FIX 5 — typo "ungerated" → "ungeared")

The dominant misconception in APV drills is VALUATION PLUMBING combined with FENCE-SITTING: candidates either misroute the discount rate for the tax shield — applying Keu where Kd belongs — or they produce two APV numbers and stop, leaving the board without a recommendation. The plumbing error matters because the tax shield is a debt-related cash flow whose risk profile tracks the certainty of the interest payment, not the business risk of the ungeared firm; using the wrong rate is a mismatch between the risk of the flow and the rate used to price it, and whether that mismatch overstates or understates the shield's present value depends on the relative size of the rates in this specific scenario. The fence-sitting error is equally costly: APV exists precisely to decompose value by financing source so that a decision between packages can be made — stopping at "Package A APV is X and Package B APV is Y" is the calculation, not the advice; the board needs to hear which package to select and why the financing side-effects drive that ranking. If your base-case NPV is wrong, carry it forward into both APV lines consistently — where your method for adding the shield and deducting issue costs is correct, those downstream marks remain available, but only if you use your own figure without switching back to the model figure mid-calculation. Finally, a positive APV is the floor of the recommendation, not the ceiling: the board also needs to hear what conditions — covenant headroom, Keu appropriateness, rights-issue take-up — could erode the advantage that the preferred package appears to offer.

---

## Round 2 (reviewer saw the stale pre-round-1 pack; 5 repeats confirm round 1)

### FIX 6 — drill `34f9e897` context_text (amended)

APV-rationale sentence corrected — removed the false "the debt level is expected to decline as the loan is repaid" (contradicts the Year-4 bullet repayment). Now reads:

> Because the project-specific debt is large, temporary, and extinguished at the end of the concession horizon, the conventional WACC-based NPV — which assumes a constant debt ratio — is an unreliable appraisal tool.

Re-gated: 6 gates PASS.

### Rejected (journalled)

- **OFR softening** — "the error is charged once, at its source" is house wording tied to the override log; ruling reaffirmed closed, no change.
- **Drill-4 retag** — `dedca530` stays **B3k primary** per the Q3 design ruling (only B3k coverage; question leads with the B3k task). B3j is dual coverage — journalled (single-tag `lo_code`, no secondary-tag column without a migration).

### Process rule (permanent)

After every fix round the FULL pack (`AFM_BATCH_APV_REVIEW_PACK.md`) is regenerated in place and is always current DB state; delta packs like this one are additional, never a substitute.
