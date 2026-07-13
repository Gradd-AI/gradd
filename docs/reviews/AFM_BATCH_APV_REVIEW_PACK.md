# AFM APV batch — blind adversarial review pack

**Calculator #4: Adjusted Present Value (`lib/acca/apv.ts`). 4 drills, `status=candidate`, `published=false`, `paper_code=AFM`. CURRENT STATE — regenerated after every fix round (through round 2).**

Doctrine: deterministic code owns every figure AND every figure-vs-figure verdict; the model authored PROSE only. Base case = the all-equity project at STATED Keu; financing side-effects: debt tax shield at pre-tax Kd (relief at interest-year+lag), **debt issue costs = gross principal × f**, subsidised-loan saving (pre-tax in-year less its tax at year+lag), and — rights-issue package only — equity issue costs grossed up from NET proceeds. **6 gates** pass on all four: schema self-consistency + tolerance + OFR-wiring; answer↔schema figure integrity; seeded-OFR carry-through; P4 jurisdiction; P5 completeness; **P6 loss-relief** (a negative-taxable year requires a stated relief line).

**Review method:** fresh model, no project context, AFM syllabus PDF attached; FULL hostility on drill 1, spot-check siblings WITH full recomputation. Hunt for semantic errors a deterministic gate cannot catch.

---

## Drill 1 — standard (B3j)  ·  `ecb2d89f-f13f-4d96-a3c7-66baccc27810`
- LO B3j · mode quantitative · command_verb "apply and advise" · marks_guide 15

### question

Apply the adjusted present value (APV) technique to appraise DataNexus Berhad's proposed Cyberjaya Edge Campus project, and advise the board whether to proceed with the investment.

### context_text

**DataNexus Berhad — Cyberjaya Edge Campus: APV Appraisal**

**Background**

DataNexus Berhad ("DataNexus" or "the Group") is a Kuala Lumpur-listed digital infrastructure operator providing colocation, cloud-interconnect, and managed hosting services across Peninsular Malaysia. The Group currently carries a conservative debt-to-total-assets ratio of 18%, consistent with its investment-grade Bursa Malaysia credit profile.

The board is evaluating the Cyberjaya Edge Campus ("the Project"), a purpose-built, carrier-neutral data-centre facility in the Cyberjaya Technology Hub. The Project requires a substantial initial capital outlay and is to be financed partly through a new syndicated term loan arranged via CIMB Investment Bank, which would increase Group gearing materially — from 18% to an estimated 41% of total assets on a pro-forma basis. Because this financing shift is significant, the CFO has correctly directed that the appraisal be conducted using the adjusted present value (APV) method rather than a WACC-based NPV, so that the base-case project value and the financing side-effects are evaluated transparently and separately.

The Project has a five-year economic life after which the facility will be sold to a domestic real-estate investment trust (REIT) at an agreed residual value. Operating cash flows are stated in real (today's) terms and must be inflated at the prevailing Malaysian CPI assumption before discounting. Corporate income tax is payable one year in arrears. The syndicated loan will be drawn in full at financial close (Time 0) and will remain outstanding for the full five-year project term.

The ungeared (all-equity) cost of equity applicable to this project is **Keu = 13.5%**, reflecting the systematic risk of Malaysian data-centre infrastructure assessed against comparable regional operators. Issue costs on the debt are incurred at Time 0.

**Challengeable textures for the board to consider:**
1. *Is Keu = 13.5% the right ungeared rate?* DataNexus benchmarked Keu against listed regional peers (Singapore and Thailand colocation operators). Those peers operate in more liquid markets with longer track records of contracted capacity; Malaysia's digital-infrastructure sector remains at an earlier stage of institutional adoption, which may warrant a higher Keu — the board should confirm whether a sovereign-risk and market-liquidity overlay is appropriate.
2. *Will the MYR 380 million debt capacity be sustained over the full five-year term?* The syndicated term loan is structured as a bullet repayment facility. If operating cash flows disappoint in Years 1–2 (a realistic risk given the ramp-up of hyperscaler tenants), CIMB may invoke financial-covenant provisions, compressing the tax shield below the assumed level.

**Raw inputs for the APV appraisal**

| Item | Value |
|---|---|
| Initial capital outlay | MYR 620 million |
| Pre-tax operating cash flows — real terms: | |
| — Year 1 | MYR 128 million |
| — Year 2 | MYR 155 million |
| — Year 3 | MYR 178 million |
| — Year 4 | MYR 196 million |
| — Year 5 | MYR 210 million |
| Inflation rate (Malaysian CPI assumption) | 3.0% p.a. |
| Corporate income tax rate | 24% |
| Tax-payment lag | 1 year in arrears |
| Capital qualifying for tax-allowable depreciation | MYR 580 million |
| Tax-allowable depreciation rate (reducing-balance) | 20% p.a. |
| Residual / scrap value (Year 5 REIT sale proceeds) | MYR 95 million |
| Ungeared cost of equity (Keu) | 13.5% |
| Syndicated term loan (drawn at Time 0) | MYR 380 million |
| Pre-tax market cost of debt (Kd) | 6.2% |
| Debt issue / transaction cost rate | 2.5% of gross proceeds |
| Net finance raised (after issue costs) | MYR 370.5 million |

*For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.*

### model_answer

**Investment appraisal — adjusted present value (APV)**

**Assumptions:** the project is valued in two stages — the base case as if **all-equity financed**, discounted at the ungeared cost of equity Keu of 13.50%, then the present value of the financing side-effects it triggers. Operating cash flows are in money terms, inflated at 3.00%; tax at 24.00% is charged on operating cash flow less tax-allowable depreciation (20.00% reducing balance, balancing allowance/charge in year 5) and paid one year in arrears. The debt tax shield is discounted at the **pre-tax cost of debt Kd** of 6.20%; discounting the shield at the risk-free rate instead is an accepted examiner alternative and would raise its present value slightly.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | MYR 116.0m |
| 2 | MYR 92.8m |
| 3 | MYR 74.2m |
| 4 | MYR 59.4m |
| 5 | MYR 142.6m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | MYR 131.8m | MYR 116.0m | MYR 15.8m | MYR 3.8m |
| 2 | MYR 164.4m | MYR 92.8m | MYR 71.6m | MYR 17.2m |
| 3 | MYR 194.5m | MYR 74.2m | MYR 120.3m | MYR 28.9m |
| 4 | MYR 220.6m | MYR 59.4m | MYR 161.2m | MYR 38.7m |
| 5 | MYR 243.4m | MYR 142.6m | MYR 100.9m | MYR 24.2m |

**Step 3 — Base-case NPV (all-equity, discounted at Keu)**

| Period | Net cash flow | DF @ Keu 13.50% | Present value |
|--------|------|------|------|
| 0 | MYR -620.0m | 1.000 | MYR -620.0m |
| 1 | MYR 131.8m | 0.881 | MYR 116.2m |
| 2 | MYR 160.6m | 0.776 | MYR 124.7m |
| 3 | MYR 177.3m | 0.684 | MYR 121.3m |
| 4 | MYR 191.7m | 0.603 | MYR 115.5m |
| 5 | MYR 299.8m | 0.531 | MYR 159.1m |
| 6 | MYR -24.2m | 0.468 | MYR -11.3m |

**Base-case NPV = present value of the operating flows MYR 625.5m − initial outlay MYR 620.0m = MYR 5.5m.**

**Step 4 — Financing side-effects**

*Debt tax shield* — interest is tax-deductible, so MYR 380.0m of debt at 6.20% gives annual tax relief of MYR 5.7m, **received one year in arrears (the same lag as trading tax)** and discounted at the pre-tax cost of debt Kd 6.20%:

| Interest year | Interest | Tax relief | Received (period) | DF @ 6.20% | PV |
|------|------|------|------|------|------|
| 1 | MYR 23.6m | MYR 5.7m | 2 | 0.887 | MYR 5.0m |
| 2 | MYR 23.6m | MYR 5.7m | 3 | 0.835 | MYR 4.7m |
| 3 | MYR 23.6m | MYR 5.7m | 4 | 0.786 | MYR 4.4m |
| 4 | MYR 23.6m | MYR 5.7m | 5 | 0.740 | MYR 4.2m |
| 5 | MYR 23.6m | MYR 5.7m | 6 | 0.697 | MYR 3.9m |

**PV of the tax shield = MYR 22.3m.**

*Issue costs* — raising the MYR 380.0m of debt incurs 2.50% of transaction costs on the gross principal, a t0 outflow of **MYR -9.5m**.

**Step 5 — Adjusted present value**

| Component | Amount |
|------|------|
| Base-case NPV (all-equity) | MYR 5.5m |
| PV of debt tax shield | MYR 22.3m |
| Issue costs | MYR -9.5m |
| **Adjusted present value** | **MYR 18.3m** |

**Step 6 — Decision**

The APV of MYR 18.3m is **positive**, so once the financing side-effects are added to the all-equity base case the project **adds shareholder value and should be accepted**.

**Step 7 — Advice to the board**

On these assumptions the APV is positive; a positive result is a floor, not a mandate, so the recommendation is conditional on the base-case and financing assumptions below holding under scrutiny.

The APV framework is the appropriate tool here precisely because the Cyberjaya Edge Campus financing materially restructures DataNexus's balance sheet: separating the base-case project value from the financing side-effects allows the board to see clearly whether the project stands on its own operational merits and then whether the debt package adds further value — a transparency that a blended WACC-based NPV would obscure given the step-change in gearing.

The benchmark of Keu = 13.5% deserves direct scrutiny: DataNexus derived this rate from Singapore and Thailand colocation peers, which benefit from deeper institutional capital markets, longer contracted-revenue histories, and stronger secondary-market liquidity for data-centre assets than currently exist in Malaysia; if Malaysian-specific illiquidity or earlier-cycle risk is not already embedded in that rate, the true ungeared required return for this project could be higher, which would reduce the base-case present value — the board should commission an independent cross-check of the peer-selection methodology before financial close.

On the financing side, the tax shield is computed on the assumption that the MYR 380 million bullet loan remains fully drawn for all five years; however, the scenario itself notes the risk of hyperscaler tenant ramp-up shortfalls in Years 1 and 2, and if CIMB's covenant package includes an interest-cover or debt-service-coverage trigger, the Group could be forced into early partial repayment, reducing the outstanding debt balance and compressing the tax shield below its modelled level — the board must confirm with CIMB the precise covenant thresholds and the headroom under the Year 1 and Year 2 projected cash flows before relying on the full shield.

The residual value of MYR 95 million, representing a negotiated sale to a domestic REIT, is treated as a certainty in this model, yet REIT acquisition activity in Malaysian digital infrastructure is nascent and pricing is sensitive to prevailing interest rates at Year 5; the board should satisfy itself that the REIT's indicative offer is legally committed (or at minimum heads-of-terms binding) rather than a provisional expression of interest, and should stress-test the appraisal against a materially lower disposal price.

*Reconciliation: base-case NPV MYR 5.5m + financing side-effects MYR 12.8m = APV MYR 18.3m ✓*

### hint

Check which discount rate governs each cash flow stream — the base-case operating flows and the debt tax shield are not the same type of cash flow and should not share the same rate; ask yourself what risk each stream carries and which rate reflects that risk.

### full_reveal

The dominant misconception in APV drills is VALUATION-PLUMBING of the financing side-effects: candidates either discount the debt tax shield at the ungeared cost of equity (Keu) or collapse the whole appraisal into a single WACC-based NPV, which defeats the purpose of the APV framework entirely. The error matters because each cash flow stream must be discounted at the rate that reflects its own systematic risk — the operating base case carries business risk and belongs at Keu, while the tax shield's risk tracks the debt itself, which is why Kd prices it — but the model values only the shield on debt expected to remain outstanding, and the scenario's covenant texture is exactly what would compress it; using the wrong rate is a mismatch between risk and return, not a simple directional inflation or deflation of value. A second failure is FENCE-SITTING: candidates compute a positive APV and then write "the project may be worthwhile" — but the board hired you to make a call, not hedge it; a positive APV means the project adds shareholder value on the stated assumptions, so the recommendation is to accept, conditional on the assumptions surviving scrutiny (peer-derived Keu, covenant headroom, and REIT disposal certainty are the live stress points this scenario surfaces). If your own calculation of the base-case NPV or the tax shield differs from the model, carry your own figures forward consistently into the APV total and the final recommendation — where your method is sound downstream, those marks remain available and the error is charged once at its source.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "kd": 0.062,
    "keu": 0.135,
    "tax_lag": 1,
    "tax_rate": 0.24,
    "wda_rate": 0.2,
    "debt_term": 5,
    "debt_amount": 380,
    "scrap_value": 95,
    "inflation_rate": 0.03,
    "initial_outlay": 620,
    "capital_for_wda": 580
  },
  "components": [
    {
      "unit": "MYRm",
      "label": "Net after-tax cash flow, year 1",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_1",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 1"
      ],
      "expected_value": 131.84
    },
    {
      "unit": "MYRm",
      "label": "Net after-tax cash flow, year 2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_2",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 2"
      ],
      "expected_value": 160.63789999999997
    },
    {
      "unit": "MYRm",
      "label": "Net after-tax cash flow, year 3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_3",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 3"
      ],
      "expected_value": 177.311926
    },
    {
      "unit": "MYRm",
      "label": "Net after-tax cash flow, year 4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_4",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 4"
      ],
      "expected_value": 191.73602932000003
    },
    {
      "unit": "MYRm",
      "label": "Net after-tax cash flow, year 5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_5",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) + scrap for year 5"
      ],
      "expected_value": 299.7577011806
    },
    {
      "unit": "MYRm",
      "label": "Net after-tax cash flow, year 6",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_6",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 6"
      ],
      "expected_value": -24.211093344720005
    },
    {
      "unit": "MYRm",
      "label": "Base-case present value, year 1",
      "recompute": "pv_discount_keu_y1",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_1"
      ],
      "component_id": "pv_1",
      "working_steps": [
        "= ncf_1 × 0.881 (discount factor at Keu 13.50%)"
      ],
      "expected_value": 116.15859030837004
    },
    {
      "unit": "MYRm",
      "label": "Base-case present value, year 2",
      "recompute": "pv_discount_keu_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_2"
      ],
      "component_id": "pv_2",
      "working_steps": [
        "= ncf_2 × 0.776 (discount factor at Keu 13.50%)"
      ],
      "expected_value": 124.69708319587026
    },
    {
      "unit": "MYRm",
      "label": "Base-case present value, year 3",
      "recompute": "pv_discount_keu_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_3"
      ],
      "component_id": "pv_3",
      "working_steps": [
        "= ncf_3 × 0.684 (discount factor at Keu 13.50%)"
      ],
      "expected_value": 121.26915813113406
    },
    {
      "unit": "MYRm",
      "label": "Base-case present value, year 4",
      "recompute": "pv_discount_keu_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_4"
      ],
      "component_id": "pv_4",
      "working_steps": [
        "= ncf_4 × 0.603 (discount factor at Keu 13.50%)"
      ],
      "expected_value": 115.53678626260586
    },
    {
      "unit": "MYRm",
      "label": "Base-case present value, year 5",
      "recompute": "pv_discount_keu_y5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_5"
      ],
      "component_id": "pv_5",
      "working_steps": [
        "= ncf_5 × 0.531 (discount factor at Keu 13.50%)"
      ],
      "expected_value": 159.14428298821753
    },
    {
      "unit": "MYRm",
      "label": "Base-case present value, year 6",
      "recompute": "pv_discount_keu_y6",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_6"
      ],
      "component_id": "pv_6",
      "working_steps": [
        "= ncf_6 × 0.468 (discount factor at Keu 13.50%)"
      ],
      "expected_value": -11.32502665719371
    },
    {
      "unit": "MYRm",
      "label": "Base-case NPV (all-equity, discounted at Keu)",
      "recompute": "base_npv_sum_less_outlay",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "pv_1",
        "pv_2",
        "pv_3",
        "pv_4",
        "pv_5",
        "pv_6"
      ],
      "component_id": "base_npv",
      "working_steps": [
        "= Σ base-case present values − initial outlay 620.0"
      ],
      "expected_value": 5.480874229004144
    },
    {
      "unit": "MYRm",
      "label": "PV of the debt tax shield",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "tax_shield",
      "working_steps": [
        "Σ debt × 6.20% × 24.00% tax relief, received at year+1 and discounted at Kd 6.20%"
      ],
      "expected_value": 22.306361032315394
    },
    {
      "unit": "MYRm",
      "label": "Issue costs (on the gross debt principal)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "issue_costs",
      "working_steps": [
        "−(gross debt principal × f) at 2.50%"
      ],
      "expected_value": -9.5
    },
    {
      "unit": "MYRm",
      "label": "Adjusted present value",
      "recompute": "apv_sum",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "base_npv",
        "tax_shield",
        "issue_costs"
      ],
      "component_id": "apv",
      "working_steps": [
        "= base-case NPV + tax shield + issue costs"
      ],
      "expected_value": 18.287235261319537
    }
  ]
}
```

---

## Drill 2 — subsidised (B3j)  ·  `34f9e897-4de7-4a68-8cf5-5cac2846567b`
- LO B3j · mode quantitative · command_verb "apply and advise" · marks_guide 15

### question

Apply the adjusted present value (APV) technique to appraise the Corredor Norte toll-road expansion and advise the board of Via Planalto Concessões S.A. whether to proceed with the investment.

### context_text


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


### model_answer

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
| 1 | BRL 449.3m | BRL 350.0m | BRL 99.3m | BRL 33.8m |
| 2 | BRL 546.0m | BRL 262.5m | BRL 283.5m | BRL 96.4m |
| 3 | BRL 650.5m | BRL 196.9m | BRL 453.6m | BRL 154.2m |
| 4 | BRL 739.4m | BRL 410.6m | BRL 328.7m | BRL 111.8m |

**Step 3 — Base-case NPV (all-equity, discounted at Keu)**

| Period | Net cash flow | DF @ Keu 16.00% | Present value |
|--------|------|------|------|
| 0 | BRL -1400.0m | 1.000 | BRL -1400.0m |
| 1 | BRL 449.3m | 0.862 | BRL 387.4m |
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

### hint

Check which discount rate you applied to each financing side-effect: the debt tax shield and the subsidised-loan benefit each have a specific, theoretically grounded rate — using the ungeared cost of equity (Keu) for either leg mismatches the risk of those cash flows and corrupts the financing side-effects before you even reach the APV sum.

### full_reveal

The classic misconception in APV drills is VALUATION-PLUMBING: candidates conflate the three discount rates the technique demands and apply Keu across all stages, or — equally damaging — stop after computing the base-case NPV and never build the financing side-effects at all, presenting a raw all-equity NPV as if it were the APV. This matters because the whole intellectual purpose of APV is to isolate operating value from financing value; collapsing them into a single WACC-style discount hides exactly the subsidised-loan benefit the scenario is testing, meaning the board receives a systematically incomplete picture of what the BNDES facility actually contributes. The correct mental model has three distinct rates doing three distinct jobs: Keu prices only operating risk in the base case, the pre-tax cost of debt (or risk-free rate as an accepted alternative) prices the near-certain tax shield, and the market cost of debt prices the subsidised-loan saving relative to what arm's-length financing would have cost. If your base-case NPV is wrong but your method is sound, carry it forward consistently into Steps 4 and 5 — where the downstream structure holds, those marks still score, and the error is charged once at its source; OFR credit is conditional on correct subsequent use. Then take the final APV number to the board: a positive result is a floor, not a mandate — your job in the boardroom is to stress-test the assumptions (Keu derivation, the BNDES coupon holding for the full four years, the bullet refinancing at Year 4) before converting the arithmetic into a conditional recommendation to proceed.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "kd": 0.115,
    "keu": 0.16,
    "tax_lag": 1,
    "tax_rate": 0.34,
    "wda_rate": 0.25,
    "debt_term": 4,
    "debt_amount": 520,
    "scrap_value": 180,
    "inflation_rate": 0.045,
    "initial_outlay": 1400,
    "capital_for_wda": 1400
  },
  "components": [
    {
      "unit": "BRLm",
      "label": "Net after-tax cash flow, year 1",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_1",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 1"
      ],
      "expected_value": 449.34999999999997
    },
    {
      "unit": "BRLm",
      "label": "Net after-tax cash flow, year 2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_2",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 2"
      ],
      "expected_value": 512.2334999999999
    },
    {
      "unit": "BRLm",
      "label": "Net after-tax cash flow, year 3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_3",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 3"
      ],
      "expected_value": 554.0704412499999
    },
    {
      "unit": "BRLm",
      "label": "Net after-tax cash flow, year 4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_4",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) + scrap for year 4"
      ],
      "expected_value": 765.1410373624998
    },
    {
      "unit": "BRLm",
      "label": "Net after-tax cash flow, year 5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_5",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 5"
      ],
      "expected_value": -111.77042101174993
    },
    {
      "unit": "BRLm",
      "label": "Base-case present value, year 1",
      "recompute": "pv_discount_keu_y1",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_1"
      ],
      "component_id": "pv_1",
      "working_steps": [
        "= ncf_1 × 0.862 (discount factor at Keu 16.00%)"
      ],
      "expected_value": 387.3706896551724
    },
    {
      "unit": "BRLm",
      "label": "Base-case present value, year 2",
      "recompute": "pv_discount_keu_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_2"
      ],
      "component_id": "pv_2",
      "working_steps": [
        "= ncf_2 × 0.743 (discount factor at Keu 16.00%)"
      ],
      "expected_value": 380.67293400713436
    },
    {
      "unit": "BRLm",
      "label": "Base-case present value, year 3",
      "recompute": "pv_discount_keu_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_3"
      ],
      "component_id": "pv_3",
      "working_steps": [
        "= ncf_3 × 0.641 (discount factor at Keu 16.00%)"
      ],
      "expected_value": 354.9694798692546
    },
    {
      "unit": "BRLm",
      "label": "Base-case present value, year 4",
      "recompute": "pv_discount_keu_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_4"
      ],
      "component_id": "pv_4",
      "working_steps": [
        "= ncf_4 × 0.552 (discount factor at Keu 16.00%)"
      ],
      "expected_value": 422.5805835583404
    },
    {
      "unit": "BRLm",
      "label": "Base-case present value, year 5",
      "recompute": "pv_discount_keu_y5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_5"
      ],
      "component_id": "pv_5",
      "working_steps": [
        "= ncf_5 × 0.476 (discount factor at Keu 16.00%)"
      ],
      "expected_value": -53.215352182019195
    },
    {
      "unit": "BRLm",
      "label": "Base-case NPV (all-equity, discounted at Keu)",
      "recompute": "base_npv_sum_less_outlay",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "pv_1",
        "pv_2",
        "pv_3",
        "pv_4",
        "pv_5"
      ],
      "component_id": "base_npv",
      "working_steps": [
        "= Σ base-case present values − initial outlay 1400.0"
      ],
      "expected_value": 92.37833490788262
    },
    {
      "unit": "BRLm",
      "label": "PV of the debt tax shield",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "tax_shield",
      "working_steps": [
        "Σ debt × 6.00% × 34.00% tax relief, received at year+1 and discounted at Kd 11.50%"
      ],
      "expected_value": 29.204002855470364
    },
    {
      "unit": "BRLm",
      "label": "PV of the interest saving vs the market rate (subsidised loan)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "subsidy_benefit",
      "working_steps": [
        "Σ [ debt × (Kd 11.50% − 6.00%) in-year − its tax at year+1 ], discounted at Kd"
      ],
      "expected_value": 61.020618711491394
    },
    {
      "unit": "BRLm",
      "label": "Adjusted present value",
      "recompute": "apv_sum",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "base_npv",
        "tax_shield",
        "subsidy_benefit"
      ],
      "component_id": "apv",
      "working_steps": [
        "= base-case NPV + tax shield + subsidy benefit"
      ],
      "expected_value": 182.60295647484438
    }
  ]
}
```

---

## Drill 3 — reject (B3j)  ·  `1b717fd0-8dd8-40c6-81c5-481529716b1a`
- LO B3j · mode quantitative · command_verb "apply and advise" · marks_guide 15

### question

Apply the adjusted present value (APV) technique to appraise Hansung Heavy Industries' proposed investment in the LNG carrier conversion facility, and advise the board whether the project should proceed.

### context_text


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


### model_answer

**Investment appraisal — adjusted present value (APV)**

**Assumptions:** the project is valued in two stages — the base case as if **all-equity financed**, discounted at the ungeared cost of equity Keu of 16.50%, then the present value of the financing side-effects it triggers. Operating cash flows are in money terms, inflated at 2.80%; tax at 22.00% is charged on operating cash flow less tax-allowable depreciation (25.00% reducing balance, balancing allowance/charge in year 4) and paid one year in arrears. The debt tax shield is discounted at the **pre-tax cost of debt Kd** of 7.20%; discounting the shield at the risk-free rate instead is an accepted examiner alternative and would raise its present value slightly.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | KRW 227500.0m |
| 2 | KRW 170625.0m |
| 3 | KRW 127968.8m |
| 4 | KRW 323906.3m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | KRW 159340.0m | KRW 227500.0m | KRW -68160.0m | KRW -14995.2m |
| 2 | KRW 209243.2m | KRW 170625.0m | KRW 38618.2m | KRW 8496.0m |
| 3 | KRW 233570.4m | KRW 127968.8m | KRW 105601.6m | KRW 23232.4m |
| 4 | KRW 256862.3m | KRW 323906.3m | KRW -67044.0m | KRW -14749.7m |

**Step 3 — Base-case NPV (all-equity, discounted at Keu)**

| Period | Net cash flow | DF @ Keu 16.50% | Present value |
|--------|------|------|------|
| 0 | KRW -980000.0m | 1.000 | KRW -980000.0m |
| 1 | KRW 159340.0m | 0.858 | KRW 136772.5m |
| 2 | KRW 224238.4m | 0.737 | KRW 165218.3m |
| 3 | KRW 225074.4m | 0.632 | KRW 142347.0m |
| 4 | KRW 293629.9m | 0.543 | KRW 159403.0m |
| 5 | KRW 14749.7m | 0.466 | KRW 6873.1m |

**Base-case NPV = present value of the operating flows KRW 610614.0m − initial outlay KRW 980000.0m = KRW -369386.0m.**

**Step 4 — Financing side-effects**

*Debt tax shield* — interest is tax-deductible, so KRW 420000.0m of debt at 7.20% gives annual tax relief of KRW 6652.8m, **received one year in arrears (the same lag as trading tax)** and discounted at the pre-tax cost of debt Kd 7.20%:

| Interest year | Interest | Tax relief | Received (period) | DF @ 7.20% | PV |
|------|------|------|------|------|------|
| 1 | KRW 30240.0m | KRW 6652.8m | 2 | 0.870 | KRW 5789.2m |
| 2 | KRW 30240.0m | KRW 6652.8m | 3 | 0.812 | KRW 5400.3m |
| 3 | KRW 30240.0m | KRW 6652.8m | 4 | 0.757 | KRW 5037.6m |
| 4 | KRW 30240.0m | KRW 6652.8m | 5 | 0.706 | KRW 4699.3m |

**PV of the tax shield = KRW 20926.4m.**

*Issue costs* — raising the KRW 420000.0m of debt incurs 3.50% of transaction costs on the gross principal, a t0 outflow of **KRW -14700.0m**.

**Step 5 — Adjusted present value**

| Component | Amount |
|------|------|
| Base-case NPV (all-equity) | KRW -369386.0m |
| PV of debt tax shield | KRW 20926.4m |
| Issue costs | KRW -14700.0m |
| **Adjusted present value** | **KRW -363159.7m** |

**Step 6 — Decision**

The APV of KRW -363159.7m is **negative**: the financing side-effects (KRW 6226.4m in total) are **not enough to rescue the negative base case** of KRW -369386.0m, so the project **destroys value and should be rejected** as it stands.

**Step 7 — Advice to the board**

On these assumptions the APV is negative, so the base-case recommendation is to **reject** as structured; the board should treat rejection as the default unless the assumptions below prove materially conservative.

Even setting aside the arithmetic outcome, the board must scrutinise three qualitative dimensions before committing to this investment. First, the appropriateness of the 16.5% ungeared cost of equity deserves independent challenge: Hana Securities derived this rate from North-East Asian shipbuilding comparables, but the LNG conversion retrofit segment involves specialised cryogenic engineering, a narrower customer base confined largely to international shipping majors, and a regulatory-driven demand cycle tied to IMO deadlines — a risk profile that is arguably more volatile and less diversified than conventional new-build activity, suggesting the true ungeared hurdle rate could be higher than stated. Second, the debt capacity assumption embedded in the APV structure warrants stress-testing: the KRW 420,000m loan is secured against Okpo yard assets, but Korean shipbuilding asset values have historically been procyclical and subject to sharp revaluation in downturns, as the 2015–2016 industry contraction demonstrated; if a lender covenant is triggered before Year 4, the tax shield modelled over the full term will not materialise, and the financing side-effect will be overstated. Third, regarding the balance between gearing and shareholder interest, the board should note that raising secured debt of this scale will bring Hansung's gearing to a level it has not previously sustained — this concentrates financial risk on existing shareholders, reduces headroom for counter-cyclical investment if retrofit demand disappoints following the initial IMO compliance rush, and may constrain dividend policy in the medium term in a manner that the APV framework alone does not capture.

*Reconciliation: base-case NPV KRW -369386.0m + financing side-effects KRW 6226.4m = APV KRW -363159.7m ✓*

### hint

Check which rate you used to discount the debt tax shield — APV keeps the base-case operating flows and the financing side-effects in separate lanes, each discounted at the rate that matches the risk of that specific cash flow stream, not a single blended rate.

### full_reveal

The most common misconception in APV drills is VALUATION PLUMBING crossed with FENCE-SITTING: candidates either collapse the two-stage structure by discounting everything at WACC (destroying the entire point of APV, which is to isolate and value financing side-effects separately), or they complete the arithmetic and then stop — leaving the board without a recommendation. The plumbing error matters because APV works precisely by keeping the lanes exact: the base case is discounted at Keu, the tax shield at Kd, and issue costs are a time-0 outflow deducted undiscounted — merging them into one rate produces a figure that reflects neither correctly. On the fence-sitting side: a negative APV is not a finding to report neutrally; it is the trigger for a clear rejection recommendation, and the marks in Step 7 exist precisely because the examiner expects you to tell the board what to do with that number. If your APV figure is wrong but your downstream method is consistent — financing side-effects added to base-case NPV, decision anchored to the sign of the result — carry your own figure forward; where the method holds, those marks still score, and the error is charged once at its source. The boardroom question is always the same: the numbers are the floor, not the ceiling — you have calculated it, so now tell the board whether to commit KRW 980,000m of capital or walk away, and name the assumptions that could change that verdict.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "kd": 0.072,
    "keu": 0.165,
    "tax_lag": 1,
    "tax_rate": 0.22,
    "wda_rate": 0.25,
    "debt_term": 4,
    "debt_amount": 420000,
    "scrap_value": 60000,
    "inflation_rate": 0.028,
    "initial_outlay": 980000,
    "capital_for_wda": 910000
  },
  "components": [
    {
      "unit": "KRWm",
      "label": "Net after-tax cash flow, year 1",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_1",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 1"
      ],
      "expected_value": 159340
    },
    {
      "unit": "KRWm",
      "label": "Net after-tax cash flow, year 2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_2",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 2"
      ],
      "expected_value": 224238.432
    },
    {
      "unit": "KRWm",
      "label": "Net after-tax cash flow, year 3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_3",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 3"
      ],
      "expected_value": 225074.38864000002
    },
    {
      "unit": "KRWm",
      "label": "Net after-tax cash flow, year 4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_4",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) + scrap for year 4"
      ],
      "expected_value": 293629.89428128005
    },
    {
      "unit": "KRWm",
      "label": "Net after-tax cash flow, year 5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_5",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 5"
      ],
      "expected_value": 14749.678413606389
    },
    {
      "unit": "KRWm",
      "label": "Base-case present value, year 1",
      "recompute": "pv_discount_keu_y1",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_1"
      ],
      "component_id": "pv_1",
      "working_steps": [
        "= ncf_1 × 0.858 (discount factor at Keu 16.50%)"
      ],
      "expected_value": 136772.5321888412
    },
    {
      "unit": "KRWm",
      "label": "Base-case present value, year 2",
      "recompute": "pv_discount_keu_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_2"
      ],
      "component_id": "pv_2",
      "working_steps": [
        "= ncf_2 × 0.737 (discount factor at Keu 16.50%)"
      ],
      "expected_value": 165218.31825968425
    },
    {
      "unit": "KRWm",
      "label": "Base-case present value, year 3",
      "recompute": "pv_discount_keu_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_3"
      ],
      "component_id": "pv_3",
      "working_steps": [
        "= ncf_3 × 0.632 (discount factor at Keu 16.50%)"
      ],
      "expected_value": 142346.9948756998
    },
    {
      "unit": "KRWm",
      "label": "Base-case present value, year 4",
      "recompute": "pv_discount_keu_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_4"
      ],
      "component_id": "pv_4",
      "working_steps": [
        "= ncf_4 × 0.543 (discount factor at Keu 16.50%)"
      ],
      "expected_value": 159403.02813293898
    },
    {
      "unit": "KRWm",
      "label": "Base-case present value, year 5",
      "recompute": "pv_discount_keu_y5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_5"
      ],
      "component_id": "pv_5",
      "working_steps": [
        "= ncf_5 × 0.466 (discount factor at Keu 16.50%)"
      ],
      "expected_value": 6873.104146347728
    },
    {
      "unit": "KRWm",
      "label": "Base-case NPV (all-equity, discounted at Keu)",
      "recompute": "base_npv_sum_less_outlay",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "pv_1",
        "pv_2",
        "pv_3",
        "pv_4",
        "pv_5"
      ],
      "component_id": "base_npv",
      "working_steps": [
        "= Σ base-case present values − initial outlay 980000.0"
      ],
      "expected_value": -369386.022396488
    },
    {
      "unit": "KRWm",
      "label": "PV of the debt tax shield",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "tax_shield",
      "working_steps": [
        "Σ debt × 7.20% × 22.00% tax relief, received at year+1 and discounted at Kd 7.20%"
      ],
      "expected_value": 20926.369558330487
    },
    {
      "unit": "KRWm",
      "label": "Issue costs (on the gross debt principal)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "issue_costs",
      "working_steps": [
        "−(gross debt principal × f) at 3.50%"
      ],
      "expected_value": -14700.000000000002
    },
    {
      "unit": "KRWm",
      "label": "Adjusted present value",
      "recompute": "apv_sum",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "base_npv",
        "tax_shield",
        "issue_costs"
      ],
      "component_id": "apv",
      "working_steps": [
        "= base-case NPV + tax shield + issue costs"
      ],
      "expected_value": -363159.6528381575
    }
  ]
}
```

---

## Drill 4 — financing_compare (B3k — also exercises B3j APV mechanics; single-tag schema, dual coverage journaled)  ·  `dedca530-3bad-4537-9f73-7ffc5631cc5f`
- LO B3k · mode mixed · command_verb "assess" · marks_guide 12

### question

Assess the impact of the proposed Łódź Regional Hub development on Vistula Freight Partners S.A.'s reported financial position and performance under each of the two financing packages described below. Using the Adjusted Present Value (APV) method, appraise the project and advise the board which financing package it should select.

### context_text

BACKGROUND
Vistula Freight Partners S.A. (VFP) is a mid-sized Polish logistics and warehousing group headquartered in Warsaw, listed on the Warsaw Stock Exchange (GPW). The group operates a network of cross-dock and bonded-warehouse facilities serving e-commerce retailers and automotive-parts distributors across Central Europe. Following a surge in near-shoring demand from German manufacturers, VFP's board has approved a strategic expansion: the construction of a 42,000 m² temperature-controlled distribution hub on the outskirts of Łódź (the "Łódź Regional Hub" or "the Project"). The Project represents the single largest capital commitment in VFP's history and will materially alter the group's financing structure — the primary reason why APV, rather than a WACC-based NPV, is the appropriate appraisal technique here.

CURRENT CAPITAL STRUCTURE (market values)
- Existing market value of debt:   PLN 180m
- Existing market value of equity:  PLN 320m

PROJECT DETAILS
- Initial capital outlay (Time 0):       PLN 95m
- Capital qualifying for tax-allowable depreciation: PLN 88m
- Tax-allowable depreciation method:      Reducing-balance at 20% p.a.
- Residual / scrap value at end of Year 4: PLN 14m
- Project life:                 4 years
- Pre-tax operating cash flows (REAL terms, PLN m):
    Year 1: PLN 27m
    Year 2: PLN 30m
    Year 3: PLN 33m
    Year 4: PLN 35m
- Inflation rate:                4.0% p.a.
- Corporate income tax rate (CIT):        19%
- Tax payment lag:               1 year in arrears
- Ungeared (all-equity) cost of equity, Keu:  13.5% p.a.

FINANCING — TWO PACKAGES UNDER CONSIDERATION
The board is evaluating two mutually exclusive financing packages. In both cases the remainder of the initial outlay not covered by external finance is funded from existing cash reserves.

Package A — Secured Term Loan (Debt)
- Term loan amount:                 PLN 65m
- Pre-tax market cost of debt, Kd:         7.0% p.a.
- Loan term:                     4 years (matches project life)
- Debt issue / arrangement costs:          3.0% of gross proceeds

Package B — Rights Issue (Equity)
- Net proceeds of rights issue (after underwriting): PLN 65m
- Rights issue cost rate (gross-up basis):       4.5% of gross proceeds
- No new debt is raised under this package; Kd remains 7.0% for tax-shield purposes on existing debt (no incremental tax shield applies under Package B)

NOTE: Under Package A the full PLN 65m term loan is outstanding throughout the 4-year project life and generates an annual interest tax shield. Under Package B no incremental debt is raised, so no incremental tax shield arises; only the equity issue costs are relevant.

ADDITIONAL CONTEXT
VFP's existing debt comprises a PLN 180m syndicated facility arranged through Bank Pekao S.A. and mBank S.A. The board has received indicative credit terms for Package A from PKO Bank Polski, subject to VFP maintaining a minimum interest-cover ratio of 2.5× on a consolidated basis. VFP's finance director notes that the near-shoring trend driving Project revenues is an external demand factor that may not persist at current rates beyond the four-year horizon. VFP's treasury team has benchmarked Keu at 13.5% by reference to listed European logistics peers with comparable asset-intensity and geographic exposure; the board should consider whether this benchmark is truly appropriate for a property-heavy, long-duration warehousing asset of this specific type.

For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.

### model_answer

**Investment appraisal — adjusted present value (APV)**

**Assumptions:** the project is valued in two stages — the base case as if **all-equity financed**, discounted at the ungeared cost of equity Keu of 13.50%, then the present value of the financing side-effects it triggers. Operating cash flows are in money terms, inflated at 4.00%; tax at 19.00% is charged on operating cash flow less tax-allowable depreciation (20.00% reducing balance, balancing allowance/charge in year 4) and paid one year in arrears. The debt tax shield is discounted at the **pre-tax cost of debt Kd** of 7.00%; discounting the shield at the risk-free rate instead is an accepted examiner alternative and would raise its present value slightly.

**Step 1 — Tax-allowable depreciation (reducing balance)**

| Year | WDA |
|------|-----|
| 1 | PLN 17.6m |
| 2 | PLN 14.1m |
| 3 | PLN 11.3m |
| 4 | PLN 31.1m |

**Step 2 — Taxable profit and tax**

| Year | Operating cash flow | WDA | Taxable | Tax |
|------|------|------|------|------|
| 1 | PLN 28.1m | PLN 17.6m | PLN 10.5m | PLN 2.0m |
| 2 | PLN 32.4m | PLN 14.1m | PLN 18.4m | PLN 3.5m |
| 3 | PLN 37.1m | PLN 11.3m | PLN 25.9m | PLN 4.9m |
| 4 | PLN 40.9m | PLN 31.1m | PLN 9.9m | PLN 1.9m |

**Step 3 — Base-case NPV (all-equity, discounted at Keu)**

| Period | Net cash flow | DF @ Keu 13.50% | Present value |
|--------|------|------|------|
| 0 | PLN -95.0m | 1.000 | PLN -95.0m |
| 1 | PLN 28.1m | 0.881 | PLN 24.7m |
| 2 | PLN 30.5m | 0.776 | PLN 23.6m |
| 3 | PLN 33.6m | 0.684 | PLN 23.0m |
| 4 | PLN 50.0m | 0.603 | PLN 30.1m |
| 5 | PLN -1.9m | 0.531 | PLN -1.0m |

**Base-case NPV = present value of the operating flows PLN 100.5m − initial outlay PLN 95.0m = PLN 5.5m.**

**Step 4 — Financing side-effects**

*Debt tax shield* — interest is tax-deductible, so PLN 65.0m of debt at 7.00% gives annual tax relief of PLN 0.9m, **received one year in arrears (the same lag as trading tax)** and discounted at the pre-tax cost of debt Kd 7.00%:

| Interest year | Interest | Tax relief | Received (period) | DF @ 7.00% | PV |
|------|------|------|------|------|------|
| 1 | PLN 4.6m | PLN 0.9m | 2 | 0.873 | PLN 0.8m |
| 2 | PLN 4.6m | PLN 0.9m | 3 | 0.816 | PLN 0.7m |
| 3 | PLN 4.6m | PLN 0.9m | 4 | 0.763 | PLN 0.7m |
| 4 | PLN 4.6m | PLN 0.9m | 5 | 0.713 | PLN 0.6m |

**PV of the tax shield = PLN 2.7m.**

**Step 5 — Adjusted present value under each financing package**

| | Debt package | Equity (rights) package |
|------|------|------|
| Base-case NPV | PLN 5.5m | PLN 5.5m |
| Tax shield | PLN 2.7m | — |
| Issue costs | PLN -1.9m | PLN -3.1m |
| **APV** | **PLN 6.3m** | **PLN 2.5m** |

*Debt issue costs = 3.00% of the PLN 65.0m gross principal; the rights issue is stated net, so its 4.50% cost is grossed up.*

*Reported-position overlay:* the debt package lifts gearing (D/(D+E), market values) to **43.36%** and adds PLN 4.6m of annual interest (reducing interest cover), whereas the rights issue lowers gearing to **31.86%** but dilutes existing shareholders.

**Step 6 — Decision**

Both packages fund the same base case, so the ranking turns on the financing side-effects. The **debt** package is **preferred** — it gives the higher APV (PLN 6.3m vs PLN 2.5m), so on these assumptions the board should **fund the project using debt finance**; the project adds value and the debt route captures more of it.

**Step 7 — Advice to the board**

On these assumptions the APV is positive; a positive result is a floor, not a mandate, so the recommendation is conditional on the base-case and financing assumptions below holding under scrutiny.

The board should first scrutinise whether the finance director's peer-benchmarked Keu of 13.5% is genuinely appropriate for this project: listed European logistics peers may operate predominantly in leased, lighter-weight assets, whereas the Łódź Regional Hub is a purpose-built, temperature-controlled warehousing property — an inherently less liquid, longer-duration asset class that may warrant a higher ungeared rate; if Keu is understated, the base-case NPV is overstated and the project may appear more attractive than it truly is. Turning to the financing side-effects, the board must satisfy itself that the PLN 65m term loan under Package A will remain fully outstanding for the entire four-year term, since any early repayment or covenant-triggered accelerated repayment would reduce the interest tax shield and erode Package A's advantage; PKO Bank Polski's minimum interest-cover covenant of 2.5× on a consolidated basis is a real constraint, and if operating cash flows disappoint — a plausible risk given the finance director's own caveat that near-shoring demand may not persist — VFP could breach this threshold, triggering renegotiation costs or forced early repayment. Under Package B, shareholder dilution is the primary concern: a rights issue of PLN 65m against a current equity market value of PLN 320m represents a material enlargement of the share register, and if the rights are not fully taken up, the underwriting cost embedded in the 4.5% issue-cost rate will be incurred in full while the project's revenue assumptions remain unproven. The qualitative trade-off is therefore between the discipline and tax efficiency of geared financing under Package A — which materially increases VFP's consolidated leverage and tightens interest-cover headroom — and the balance-sheet resilience of Package B, which preserves debt capacity for future acquisitions but dilutes existing shareholders and signals to the market that VFP's free cash flow cannot fund growth organically; the board should weigh both outcomes against any intention VFP may have to expand the hub network further across Central Europe, since a heavily geared structure today may foreclose the next transaction.

*Reconciliation: base-case NPV PLN 5.5m; debt APV PLN 6.3m vs equity APV PLN 2.5m — higher is debt. ✓*

### hint

Your APV structure may be sound, but check whether you have discounted the debt tax shield at the pre-tax cost of debt rather than the ungeared cost of equity — and then ask yourself what the board should actually do with the two APV figures you have computed.

### full_reveal

The dominant misconception in APV drills is VALUATION PLUMBING combined with FENCE-SITTING: candidates either misroute the discount rate for the tax shield — applying Keu where Kd belongs — or they produce two APV numbers and stop, leaving the board without a recommendation. The plumbing error matters because the tax shield is a debt-related cash flow whose risk profile tracks the certainty of the interest payment, not the business risk of the ungeared firm; using the wrong rate is a mismatch between the risk of the flow and the rate used to price it, and whether that mismatch overstates or understates the shield's present value depends on the relative size of the rates in this specific scenario. The fence-sitting error is equally costly: APV exists precisely to decompose value by financing source so that a decision between packages can be made — stopping at "Package A APV is X and Package B APV is Y" is the calculation, not the advice; the board needs to hear which package to select and why the financing side-effects drive that ranking. If your base-case NPV is wrong, carry it forward into both APV lines consistently — where your method for adding the shield and deducting issue costs is correct, those downstream marks remain available, but only if you use your own figure without switching back to the model figure mid-calculation. Finally, a positive APV is the floor of the recommendation, not the ceiling: the board also needs to hear what conditions — covenant headroom, Keu appropriateness, rights-issue take-up — could erode the advantage that the preferred package appears to offer.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "kd": 0.07,
    "keu": 0.135,
    "tax_lag": 1,
    "tax_rate": 0.19,
    "wda_rate": 0.2,
    "debt_term": 4,
    "debt_amount": 65,
    "scrap_value": 14,
    "inflation_rate": 0.04,
    "initial_outlay": 95,
    "capital_for_wda": 88
  },
  "components": [
    {
      "unit": "PLNm",
      "label": "Net after-tax cash flow, year 1",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_1",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 1"
      ],
      "expected_value": 28.080000000000002
    },
    {
      "unit": "PLNm",
      "label": "Net after-tax cash flow, year 2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_2",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 2"
      ],
      "expected_value": 30.4568
    },
    {
      "unit": "PLNm",
      "label": "Net after-tax cash flow, year 3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_3",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 3"
      ],
      "expected_value": 33.63059200000001
    },
    {
      "unit": "PLNm",
      "label": "Net after-tax cash flow, year 4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_4",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) + scrap for year 4"
      ],
      "expected_value": 50.03231232
    },
    {
      "unit": "PLNm",
      "label": "Net after-tax cash flow, year 5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ncf_5",
      "working_steps": [
        "Operating cash flow (inflated) − tax (timed) for year 5"
      ],
      "expected_value": -1.878919424
    },
    {
      "unit": "PLNm",
      "label": "Base-case present value, year 1",
      "recompute": "pv_discount_keu_y1",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_1"
      ],
      "component_id": "pv_1",
      "working_steps": [
        "= ncf_1 × 0.881 (discount factor at Keu 13.50%)"
      ],
      "expected_value": 24.740088105726873
    },
    {
      "unit": "PLNm",
      "label": "Base-case present value, year 2",
      "recompute": "pv_discount_keu_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_2"
      ],
      "component_id": "pv_2",
      "working_steps": [
        "= ncf_2 × 0.776 (discount factor at Keu 13.50%)"
      ],
      "expected_value": 23.64245376389994
    },
    {
      "unit": "PLNm",
      "label": "Base-case present value, year 3",
      "recompute": "pv_discount_keu_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_3"
      ],
      "component_id": "pv_3",
      "working_steps": [
        "= ncf_3 × 0.684 (discount factor at Keu 13.50%)"
      ],
      "expected_value": 23.0010111067862
    },
    {
      "unit": "PLNm",
      "label": "Base-case present value, year 4",
      "recompute": "pv_discount_keu_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_4"
      ],
      "component_id": "pv_4",
      "working_steps": [
        "= ncf_4 × 0.603 (discount factor at Keu 13.50%)"
      ],
      "expected_value": 30.148598545827973
    },
    {
      "unit": "PLNm",
      "label": "Base-case present value, year 5",
      "recompute": "pv_discount_keu_y5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "ncf_5"
      ],
      "component_id": "pv_5",
      "working_steps": [
        "= ncf_5 × 0.531 (discount factor at Keu 13.50%)"
      ],
      "expected_value": -0.9975366215694306
    },
    {
      "unit": "PLNm",
      "label": "Base-case NPV (all-equity, discounted at Keu)",
      "recompute": "base_npv_sum_less_outlay",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "pv_1",
        "pv_2",
        "pv_3",
        "pv_4",
        "pv_5"
      ],
      "component_id": "base_npv",
      "working_steps": [
        "= Σ base-case present values − initial outlay 95.0"
      ],
      "expected_value": 5.534614900671556
    },
    {
      "unit": "PLNm",
      "label": "PV of the debt tax shield",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "tax_shield",
      "working_steps": [
        "Σ debt × 7.00% × 19.00% tax relief, discounted at Kd 7.00%"
      ],
      "expected_value": 2.73667675814305
    },
    {
      "unit": "PLNm",
      "label": "Issue costs — debt package (gross principal × f)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "debt_issue_costs",
      "working_steps": [
        "−(gross debt principal × f) at 3.00%"
      ],
      "expected_value": -1.95
    },
    {
      "unit": "PLNm",
      "label": "Issue costs — equity (rights) package (net, grossed up)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "equity_issue_costs",
      "working_steps": [
        "−(net proceeds × f/(1−f)) at 4.50%"
      ],
      "expected_value": -3.06282722513089
    },
    {
      "unit": "PLNm",
      "label": "APV — debt financing package",
      "recompute": "apv_sum",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "base_npv",
        "tax_shield",
        "debt_issue_costs"
      ],
      "component_id": "apv_debt",
      "working_steps": [
        "= base-case NPV + tax shield + debt issue costs"
      ],
      "expected_value": 6.321291658814606
    },
    {
      "unit": "PLNm",
      "label": "APV — equity (rights) financing package",
      "recompute": "apv_sum",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "base_npv",
        "equity_issue_costs"
      ],
      "component_id": "apv_equity",
      "working_steps": [
        "= base-case NPV + equity issue costs (no tax shield)"
      ],
      "expected_value": 2.4717876755406665
    }
  ]
}
```
