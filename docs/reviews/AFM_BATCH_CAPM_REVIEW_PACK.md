# AFM CAPM / cost-of-capital batch — blind adversarial review pack

**Calculator #5: CAPM / cost of capital (`lib/acca/capm.ts`). 4 drills, `status=candidate`, `published=false`, `paper_code=AFM`. CURRENT STATE — regenerated after every fix round.**

Doctrine: code owns EVERY figure AND every figure-vs-figure verdict; the model authored PROSE only — never a beta, a rate, or an inequality. β_d=0; MM-with-tax ungear/regear; CAPM Ke; MV-weighted WACC. Derives the ungeared Keu APV uses (kind `keu_for_apv`). Pure rates family — P6 loss-relief is a structural no-op. Assumptions block + step numbering are KIND-CONDITIONAL. All 6 gates pass.

**Review method:** fresh model, no project context, AFM syllabus PDF attached; FULL hostility on drill 1 (project_specific, first-of-family), spot-check siblings WITH full recomputation.


## ⛔ CLOSED RULINGS — do NOT re-raise (spend hostility on open questions, not settled ones)
- **OFR wording** — "the error is charged once, at its source" is deliberate HOUSE wording tied to the reviewer override log (ACCA P2 Jun 2015 examiner language). Adjudicated closed; do not propose softening it.
- **wrong_hurdle tag** — the `wrong_hurdle` drill is `lo_code` **B3d** by design (it makes B3d's "appropriateness of the cost of capital" clause concrete; the B3e ungear/regear chain is merely the vehicle). B3e coverage is journalled as dual. Not a mistag; do not re-raise a retag.
- **APV/CAPM boundary** — APV *states* Keu; this calculator *derives* it. By design, not a gap.

---

## Drill 1 — project_specific (B3e)  ·  `de8eb7b9-ae9c-4c91-91dc-ef8d16ffd847`
- LO B3e · mode quantitative · command_verb "calculate and evaluate" · marks_guide 15

### question

Calculate the project-specific weighted average cost of capital (WACC) that Indus TowerGrid Limited should use to appraise its proposed entry into passive telecommunications infrastructure leasing, and evaluate whether this rate is appropriate for the board's investment decision, drawing on the capital structure and business-risk characteristics identified in your analysis.

### context_text

SCENARIO — INDUS TOWERGRID LIMITED: ENTRY INTO PASSIVE TELECOM INFRASTRUCTURE LEASING

Indus TowerGrid Limited ("TowerGrid") is a mid-sized Indian conglomerate currently operating in the managed network-services segment — a business characterised by software-driven, service-fee revenue with relatively low asset intensity. The board is evaluating a material strategic pivot: the construction and long-term leasing of passive telecommunications infrastructure (ground-based tower sites, rooftop masts, and associated power systems) to mobile network operators under multi-year tenancy agreements. This business model — commonly called "towerco" — is operationally and economically distinct from TowerGrid's existing activity: it is highly capital-intensive, generates contractually predictable rental cash flows, and carries very different systematic risk.

Because the proposed project lies entirely outside TowerGrid's existing business risk profile, the board's CFO has correctly identified that TowerGrid's own equity beta is not appropriate as the business-risk proxy for the project — though its capital structure and debt cost remain relevant to the WACC. Instead, a project-specific cost of capital must be derived by reference to a listed peer operating in the target business.

PROXY PEER — Zenith Infratel Limited
Zenith Infratel Limited ("Zenith") is a Nifty 500-listed Indian towerco with operations across 18 telecom circles. Its equity beta has been estimated by TowerGrid's treasury team using 24 months of weekly return data against the Nifty 500 index.

CHALLENGEABLE TEXTURE: The equity beta used for Zenith has been estimated from only 24 months of weekly price observations — a relatively short window that may reflect a specific period of market volatility (the post-pandemic capex surge in Indian telecom infrastructure) rather than a through-the-cycle estimate of systematic risk. The board should treat this beta with caution.

RAW INPUTS
- Zenith Infratel equity beta (peer):                  0.88
- Zenith Infratel market value of equity (peer Ve):    INR 84,200 million
- Zenith Infratel market value of debt (peer Vd):      INR 31,500 million
- TowerGrid market value of equity (own Ve):           INR 22,600 million
- TowerGrid market value of debt (own Vd):             INR 17,800 million
- Risk-free rate (rf):                                 6.40%  (Indian 10-year G-Sec yield)
- Equity risk premium (mrp):                          7.20%  (Nifty 500 historical ERP)
- Pre-tax cost of debt (kd):                           8.75%  (TowerGrid's existing borrowing rate)
- Corporate tax rate (T):                              25.17% (Indian statutory rate including surcharge and cess, applicable to both companies)
- Debt beta:                                           0 (risk-free debt assumed, exam-orthodox)

### model_answer

**Cost of capital — CAPM / weighted average cost of capital**

**Assumptions:** a peer's equity beta is **ungeared** to an asset beta and **regeared** to the appraising firm's capital structure using the **Modigliani–Miller with-tax** relationship β_a = β_e × Ve/(Ve+Vd(1−T)), with the debt beta taken as **0 (debt assumed risk-free)**; the WACC weights the cost of equity and the **post-tax** cost of debt (Kd×(1−T)) by **market values**; the cost of equity is priced by CAPM (Ke = Rf + β × market risk premium) with Rf = 6.40% and MRP = 7.20%; the corporate tax rate is 25.17%.


**Step 1 — Ungear the peer's equity beta (strip out the peer's financial risk)**

β_a = β_e × Ve/(Ve + Vd(1−T)) = 0.880 × 84200/(84200 + 31500×(1−0.2517)) = **0.688**

**Step 2 — Regear to YOUR capital structure**

β_e' = β_a × (Ve + Vd(1−T))/Ve = 0.688 × (22600 + 17800×(1−0.2517))/22600 = **1.093**

The regeared equity beta (**1.093**) is **higher** than the peer's equity beta (0.880) because your gearing exceeds the peer's — the asset (business) risk is the same, only the financial risk differs.

**Step 3 — Project cost of equity (CAPM)**

Ke = Rf + β_e' × MRP = 6.40% + 1.093 × 7.20% = **14.27%**

**Step 4 — Project-specific WACC (market-value weights)**

WACC = Ke × We + Kd(1−T) × Wd = 14.27% × 0.559 + 6.55% × 0.441 = **10.87%**

This project rate reflects the **business risk of the peer's activity**, not your firm's own line of business — using your own company WACC would misprice a project of different risk.

**Step 5 — Evaluation / advice to the board**

The central question for the board is whether Zenith Infratel is a genuinely comparable proxy for the business risk TowerGrid is proposing to take on. Zenith operates as a pure-play towerco — deriving its revenue almost entirely from long-term passive infrastructure leasing across 18 telecom circles — and on that dimension the match to the proposed project is strong. However, Zenith's beta has been estimated over only 24 months of weekly observations, a window that the board's own treasury team acknowledges coincided with an atypical period of elevated capex and re-rating in Indian telecom infrastructure; a through-the-cycle estimate derived from five or more years of monthly data would be more reliable, and the board should commission an updated estimate before committing capital. The ungearing step is essential precisely because it separates business risk from financial risk: Zenith carries a materially different debt load than TowerGrid, so using Zenith's equity beta directly would embed Zenith's financial risk into TowerGrid's appraisal — the asset beta strips this away, leaving only the systematic operating risk of the towerco business model. Regearing to TowerGrid's own capital structure then re-introduces TowerGrid's specific financial risk, producing a cost of equity that reflects both the project's business risk and TowerGrid's financing decisions. The resulting project-specific WACC is the appropriate hurdle rate for discounting the project's free cash flows to the firm: because the towerco business is categorically different from TowerGrid's existing managed-services activity, applying the organisation's own WACC would either over- or under-price the risk depending on how TowerGrid's current beta compares to the asset beta derived here, and either error could lead to a materially wrong capital-allocation decision.

*Reconciliation: asset β 0.688 → regeared β 1.093 → Ke 14.27% → WACC 10.87% ✓*

### hint

Check whether you ungeared the peer's equity beta before regearing it to TowerGrid's capital structure — skipping the ungearing step embeds Zenith's financial risk, not just the towerco business risk, into your hurdle rate.

### full_reveal

The dominant misconception here is UNDEVELOPED-ASSUMPTION: candidates complete the ungear-regear mechanics and present a WACC figure, but then treat the proxy beta and the resulting rate as settled facts rather than inputs that carry their own uncertainty and need to be stress-tested against the scenario. The causal problem is this — an asset beta derived from a peer's equity beta is only as reliable as the peer's comparability, and if the board never scrutinises that comparability, the WACC number may look precise while resting on shaky foundations; quoting the rate without evaluating the proxy is advice the boardroom will reject. The correct mental model is to treat the three-step process (ungear → regear → WACC) as generating a rate whose credibility depends on whether the peer genuinely isolates the same systematic operating risk — only after making that argument does the number earn its place as a hurdle rate. On the calculation itself, if your beta chain went wrong at any step, carry your own figure forward consistently through CAPM and into the WACC weights: where your downstream method is correct, those marks still score, and the examiner charges the error once at its source — but OFR credit is conditional on using your own figure correctly at every subsequent step, not automatically awarded. "You've calculated it — now what are you telling the board?" means completing the loop: the project-specific WACC is appropriate precisely because it separates the business risk of the towerco model from TowerGrid's own existing risk profile, and the board needs to hear that distinction stated, not merely implied by the arithmetic.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "kd": 0.0875,
    "rf": 0.064,
    "mrp": 0.072,
    "own_vd": 17800,
    "own_ve": 22600,
    "peer_vd": 31500,
    "peer_ve": 84200,
    "tax_rate": 0.2517,
    "debt_beta": 0,
    "company_vd": 0,
    "company_ve": 0
  },
  "components": [
    {
      "unit": "beta",
      "label": "Ungeared (asset) beta from the peer",
      "tolerance": {
        "kind": "absolute",
        "value": 0.02
      },
      "component_id": "asset_beta",
      "working_steps": [
        "β_a = β_e × Ve/(Ve+Vd(1−T)) on the peer's gearing, β_d=0"
      ],
      "expected_value": 0.6875290255443348
    },
    {
      "unit": "beta",
      "label": "Regeared equity beta (your capital structure)",
      "recompute": "mm_regear",
      "tolerance": {
        "kind": "absolute",
        "value": 0.02
      },
      "depends_on": [
        "asset_beta"
      ],
      "component_id": "regeared_beta",
      "working_steps": [
        "β_e' = β_a × (Ve+Vd(1−T))/Ve on YOUR gearing"
      ],
      "expected_value": 1.092737338053357
    },
    {
      "unit": "%",
      "label": "Project cost of equity (CAPM)",
      "recompute": "capm_ke",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "regeared_beta"
      ],
      "component_id": "ke_project",
      "working_steps": [
        "Ke = Rf + β_e' × MRP"
      ],
      "expected_value": 14.26770883398417
    },
    {
      "unit": "%",
      "label": "Project-specific WACC",
      "recompute": "wacc_mv_weighted",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "ke_project"
      ],
      "component_id": "wacc_project",
      "working_steps": [
        "WACC = Ke×We + Kd(1−T)×Wd on YOUR gearing"
      ],
      "expected_value": 10.866285758614907
    }
  ]
}
```

---

## Drill 2 — org_wacc (B3d)  ·  `810b3893-665c-425e-bcb7-6847e121d152`
- LO B3d · mode quantitative · command_verb "calculate and evaluate" · marks_guide 15

### question

Calculate Maizal Alimentos' weighted average cost of capital (WACC), using market-value weights and CAPM to price the cost of equity, and evaluate the appropriateness of applying this rate to assess project and organisational value for the board of Maizal Alimentos S.A.B. de C.V.

### context_text


Maizal Alimentos S.A.B. de C.V. is a vertically integrated Mexican food and beverage group headquartered in Monterrey. Its operations span maize milling, corn-flour consumer products, and a fast-growing line of branded savoury snacks sold across the MERCOSUR and Andean markets. The board is reviewing its internal hurdle rate ahead of a five-year capital programme and has asked the senior financial adviser to establish the current cost of capital for the organisation.

Maizal Alimentos is listed on the Bolsa Mexicana de Valores and its equity beta has been estimated over a rolling 60-month window using monthly returns against the S&P/BMV IPC index. The finance director notes that this observation covers an unusually turbulent post-pandemic commodity cycle in Mexico and questions whether a single rolling-window estimate reliably represents the company's long-run systematic risk.

The following data have been assembled:

--- RAW INPUTS ---
Maizal Alimentos — equity beta (own, listed): 0.92
Maizal Alimentos — market value of equity (Ve): MXN 18,400 million
Maizal Alimentos — market value of debt (Vd): MXN 6,200 million
Pre-tax cost of debt (kd): 9.8% per annum
Risk-free rate (rf): 9.1% (Mexican government 10-year bond yield)
Equity risk premium (MRP): 5.5%
Mexican corporate tax rate: 30%


### model_answer

**Cost of capital — CAPM / weighted average cost of capital**

**Assumptions:** the company's listed equity beta is used **directly** through CAPM — there is **no ungearing or regearing** (this is an organisation-wide WACC, not a proxy-beta exercise); the WACC weights the cost of equity and the **post-tax** cost of debt (Kd×(1−T)) by **market values**; the cost of equity is priced by CAPM (Ke = Rf + β × market risk premium) with Rf = 9.10% and MRP = 5.50%; the corporate tax rate is 30.00%.


**Step 1 — Cost of equity (CAPM)**

Ke = Rf + β_e × MRP = 9.10% + 0.920 × 5.50% = **14.16%**

**Step 2 — Weighted average cost of capital (market-value weights)**

| Source | Market value | Weight | Cost | Weighted |
|------|------|------|------|------|
| Equity | 18400 | 0.748 | 14.16% | 10.59% |
| Debt (post-tax) | 6200 | 0.252 | 6.86% | 1.73% |
| **WACC** | 24600 | 1.000 | | **12.32%** |

The cost of equity (14.16%) exceeds the post-tax cost of debt (6.86%), as expected — equity holders bear the residual risk and price it higher.

**Step 3 — Evaluation / advice to the board**

Maizal Alimentos operates across maize milling, branded flour, and savoury snacks — a deliberately diversified consumer-staples portfolio whose revenue streams carry meaningfully different demand elasticities and commodity-cost exposures, which the board should recognise when treating a single organisation-wide WACC as representative of every division's business risk. The 60-month rolling beta was estimated through an exceptional commodity-price cycle in Mexico, as the finance director acknowledges; a beta that embeds a structurally abnormal period of maize and energy price volatility may overstate or understate the company's true long-run systematic risk relative to a more stable estimation window, and the board should consider commissioning a cross-check against sector peer betas before anchoring capital allocation decisions on this figure alone. Regarding business risk versus financial risk: the equity beta already reflects Maizal Alimentos' current financial structure, so the derived WACC is conditioned on the company maintaining broadly its present mix of listed equity and debt; any material shift in the MXN 6,200 million debt book — for instance through the planned capital programme — would alter the financial-risk component embedded in the rate and require recalculation. On the appropriateness of this rate for project and organisational valuation, the WACC is a suitable discount rate for firm free cash flows only where a new project carries the same systematic business risk as the existing group; given that the snack segment is growing faster and may command a different risk profile from the legacy milling operations, applying a single organisation-wide rate to project-level appraisals risks misallocating capital, and segment-specific rates derived from comparator betas would produce a more defensible decision.

*Reconciliation: Ke 14.16%, WACC 12.32% ✓*

### hint

You've placed a number in front of the board — now check whether your evaluation actually challenges the assumptions behind it: does your answer address why this single WACC may not be appropriate for Maizal Alimentos' different business segments and the acknowledged beta estimation window?

### full_reveal

The dominant misconception here is UNDEVELOPED-ASSUMPTION: candidates list the inputs — risk-free rate, beta, MRP, tax rate — without interrogating what those inputs actually represent in Maizal Alimentos' specific circumstances, leaving the evaluation section as a generic checklist rather than advice the board can act on. That thinking is wrong because naming an assumption is level 1 work; the level 3 task is to reason through what happens to the WACC's reliability if that assumption is violated — for instance, the finance director's own acknowledgement that the 60-month beta spans an abnormal commodity-price cycle is a direct prompt to ask whether the estimated beta reflects the company's long-run systematic risk, and a candidate who merely notes "beta may not be accurate" without developing that argument scores at the floor. A second pattern is FENCE-SITTING on the appropriateness question: stating that "the WACC has limitations" without committing to a boardroom verdict — whether the rate is suitable, conditionally suitable for some divisions but not others, or in need of supplementation with segment-specific rates derived from comparator betas — leaves the board no better informed than before. The correct mental model is that the WACC is a conditional tool: it is appropriate only where a project or segment shares the systematic business risk already embedded in the group beta and the company maintains its current capital structure; wherever either condition may not hold — as the snack segment's differing risk profile and the planned capital programme both suggest — the board needs to know that explicitly, not infer it. If your WACC calculation contained an arithmetic slip, carry your own Ke and WACC forward into the evaluation consistently; provided your method is sound downstream, those interpretation marks remain available and the error is charged once, at its source.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "kd": 0.098,
    "rf": 0.091,
    "mrp": 0.055,
    "own_vd": 0,
    "own_ve": 0,
    "peer_vd": 0,
    "peer_ve": 0,
    "tax_rate": 0.3,
    "debt_beta": 0,
    "company_vd": 6200,
    "company_ve": 18400
  },
  "components": [
    {
      "unit": "%",
      "label": "Cost of equity (CAPM)",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "component_id": "ke",
      "working_steps": [
        "Ke = Rf + β_e × MRP = 9.10% + 0.920 × 5.50%"
      ],
      "expected_value": 14.16
    },
    {
      "unit": "%",
      "label": "Weighted average cost of capital",
      "recompute": "wacc_mv_weighted",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "ke"
      ],
      "component_id": "wacc",
      "working_steps": [
        "WACC = Ke×We + Kd(1−T)×Wd"
      ],
      "expected_value": 12.320162601626015
    }
  ]
}
```

---

## Drill 3 — keu_for_apv (B3e)  ·  `11c308e5-b2cc-45b7-b2ed-ae1dd31690d2`
- LO B3e · mode quantitative · command_verb "calculate and evaluate" · marks_guide 15

### question

Calculate the ungeared cost of equity (Keu) appropriate for use in an APV appraisal of the Al Majan Resort project, and evaluate whether this rate is an appropriate basis on which Dune Hospitality Group should discount the all-equity base-case cash flows of the project.

### context_text

SCENARIO — DUNE HOSPITALITY GROUP PJSC / AL MAJAN RESORT PROJECT

Dune Hospitality Group PJSC ("DHG") is a UAE-incorporated hotel owner and operator listed on the Abu Dhabi Securities Exchange. The board is appraising the Al Majan Resort, a proposed 350-key luxury beachfront development on the coast of Ras Al Khaimah. Total development cost is estimated at AED 1.4 billion. Because the project will be financed through a bespoke Special Purpose Vehicle (SPV) with a capital structure that differs materially from DHG's own, the CFO has directed the team to use an APV framework. An APV appraisal requires an ungeared (all-equity) cost of equity, Keu, to discount the base-case unlevered free cash flows; the tax shield of the SPV's debt is then valued separately.

DHG does not have a directly observable ungeared beta. The CFO has identified Emirates Leisure Hotels PJSC ("ELH") — an Abu Dhabi–listed hotel operator with resorts concentrated in the UAE and Oman — as the most appropriate listed peer from which to extract an asset beta. The equity beta of ELH has been estimated from 24 months of monthly returns against the ADX General Index.

CHALLENGEABLE TEXTURE — PEER COMPARABILITY:
ELH derives approximately 35% of its revenue from food-and-beverage (F&B) and ancillary retail concessions; the Al Majan Resort is projected to earn roughly 60% of revenue from room nights, with the balance from a marina and spa complex. The board should consider whether ELH's revenue mix introduces a material difference in business-risk profile relative to the Al Majan project.

RAW INPUTS:
- Peer (ELH) equity beta:                     1.18
- Peer (ELH) market value of equity (Ve):      AED 2,840 million
- Peer (ELH) market value of debt (Vd):        AED 960 million
- Risk-free rate (UAE 10-year sovereign bond yield proxy):     4.20%
- Equity risk premium (MRP):                   6.50%
- UAE corporate tax rate:                      9%
(No regearing is required — Keu is the deliverable for the APV base case.)

### model_answer

**Cost of capital — CAPM / ungeared cost of equity**

**Assumptions:** a peer/sector equity beta is **ungeared** to an asset beta using the **Modigliani–Miller with-tax** relationship β_a = β_e × Ve/(Ve+Vd(1−T)), with the debt beta taken as **0 (debt assumed risk-free)**; **no WACC is computed** here — the deliverable is the ungeared, all-equity cost of equity; the cost of equity is priced by CAPM (Ke = Rf + β × market risk premium) with Rf = 4.20% and MRP = 6.50%; the corporate tax rate is 9.00%.


**Step 1 — Ungear the peer / sector equity beta to an asset beta**

β_a = β_e × Ve/(Ve + Vd(1−T)) = 1.180 × 2840/(2840 + 960×(1−0.09)) = **0.902**

**Step 2 — Ungeared cost of equity (Keu)**

Keu = Rf + β_a × MRP = 4.20% + 0.902 × 6.50% = **10.07%**

*This ungeared Keu is the discount rate applied to the all-equity base-case cash flows in an **APV** appraisal; the financing side-effects are valued separately.*

**Step 3 — Evaluation / advice to the board**

The appropriateness of the Keu estimate depends critically on whether Emirates Leisure Hotels PJSC is a genuine business-risk proxy for the Al Majan Resort. ELH's material food-and-beverage and retail concession revenues, which the scenario identifies as approximately 35% of group income, carry different demand elasticity and cost-structure characteristics from the room-night and marina revenues that will dominate the Al Majan project; to the extent this divergence is real, ELH's ungeared beta embeds a blended business risk that may not reflect the project's standalone risk. The distinction between business risk and financial risk is central here: ungearing ELH's beta via the Modigliani–Miller with-tax formula strips out the effect of ELH's own financial leverage, isolating its asset or business risk — but it cannot strip out any sector-composition mismatch between ELH and the project. The board should further note that ELH's equity beta has been derived from only 24 months of monthly observations against the ADX General Index, a relatively short estimation window that may embed cyclical or event-specific noise in a post-pandemic Gulf hospitality recovery period, reducing the statistical reliability of the single-observation beta. In the APV framework, Keu is used exclusively to discount the unlevered base-case free cash flows of the SPV, not the levered cash flows to DHG's equity holders; this is methodologically correct — using DHG's own WACC would conflate the project's business risk with DHG's current financial structure, which is explicitly inappropriate where the SPV's leverage differs from DHG's. The board should therefore treat the computed Keu as a reasonable starting estimate but commission a sensitivity test across a plausible range of asset betas to confirm that the project's APV is robust to peer-comparability uncertainty.

*Reconciliation: peer β_e 1.180 → asset β 0.902 → Keu 10.07% ✓*

### hint

You've ungeared the beta and priced it through CAPM — now check whether your evaluation actually challenges the peer-comparability of Emirates Leisure Hotels as a business-risk proxy for this specific project, or whether it only restates what APV does.

### full_reveal

The classic misconception here is UNDEVELOPED-ASSUMPTION: a candidate lists the assumptions baked into the ungearing calculation — debt beta of zero, MM with-tax formula, CAPM — but never interrogates whether the peer company's asset beta is a valid business-risk proxy for the Al Majan project specifically. That failure matters because the ungearing formula can only strip out ELH's financial leverage; it cannot strip out any mismatch between ELH's revenue mix and the project's, so if the peer's blended beta embeds materially different risk characteristics, the computed Keu may not reflect the project's standalone business risk regardless of how correctly the arithmetic was performed. The correct mental model is that in APV the ungeared cost of equity is the discount rate applied to the all-equity base-case cash flows of the SPV, and its validity stands or falls on the quality of the comparator — which means the evaluation must stress-test the peer's representativeness, the length and reliability of the beta estimation window, and the sensitivity of the APV conclusion to a plausible range of asset betas. If your ungeared beta is wrong because you used a different peer equity beta or capital structure figure, carry your own asset beta and Keu forward consistently into any linked APV step — where the downstream method is correct, those marks still score; OFR credit is conditional on correct subsequent use of your own figure. The boardroom challenge is this: the board is not asking you to confirm that APV uses Keu — they are asking whether they should trust this particular Keu enough to commit capital, and your answer must weigh the evidence for and against that trust.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "kd": 0,
    "rf": 0.042,
    "mrp": 0.065,
    "own_vd": 0,
    "own_ve": 0,
    "peer_vd": 960,
    "peer_ve": 2840,
    "tax_rate": 0.09,
    "debt_beta": 0,
    "company_vd": 0,
    "company_ve": 0
  },
  "components": [
    {
      "unit": "beta",
      "label": "Ungeared (asset) beta",
      "tolerance": {
        "kind": "absolute",
        "value": 0.02
      },
      "component_id": "asset_beta",
      "working_steps": [
        "β_a = β_e × Ve/(Ve+Vd(1−T)) with β_d=0"
      ],
      "expected_value": 0.9024127531236535
    },
    {
      "unit": "%",
      "label": "Ungeared cost of equity Keu",
      "recompute": "capm_keu",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "asset_beta"
      ],
      "component_id": "keu",
      "working_steps": [
        "Keu = Rf + β_a × MRP = 4.20% + β_a × 6.50%"
      ],
      "expected_value": 10.065682895303748
    }
  ]
}
```

---

## Drill 4 — wrong_hurdle (B3d — B3e chain is the vehicle; B3e dual coverage journalled)  ·  `2a145f7d-9957-46e8-893c-15204cb8d444`
- LO B3d · mode quantitative · command_verb "calculate and evaluate" · marks_guide 15

### question

Calculate the appropriate project-specific cost of capital for Meridian Semiconductor's proposed MEMS sensor fabrication line, using the peer-company data provided, and evaluate whether the project should be accepted. Your answer should also explain why applying Meridian's own company-wide weighted average cost of capital as the hurdle rate would be inappropriate in this context.

### context_text

SCENARIO — MERIDIAN SEMICONDUCTOR CORPORATION (MSC), TAIWAN

Meridian Semiconductor Corporation (MSC) is a Hsinchu-based integrated circuit designer and contract fab operator listed on the Taiwan Stock Exchange. MSC's existing operations are concentrated in high-volume logic and memory chip fabrication — a capital-intensive but relatively mature segment of the semiconductor value chain.

MSC's board is evaluating a proposed capital expansion into Micro-Electro-Mechanical Systems (MEMS) sensor fabrication, supplying motion and pressure sensors to the automotive and industrial IoT markets. MEMS fabrication carries a distinctly different demand profile, customer base, and revenue cyclicality from MSC's existing logic/memory work. The board's treasury team has proposed using MSC's own company-wide WACC as the hurdle rate for this project, on the grounds that it is the "established internal benchmark."

A senior director on the investment committee has identified Novatel MicroSystems Co., Ltd. (NMC) — a Taipei-listed pure-play MEMS sensor manufacturer — as a suitable proxy company whose equity beta is observable in the market.

CHALLENGEABLE TEXTURE: NMC's equity beta is derived from a single 24-month observation window covering the COVID-19 recovery period (2021–2022), during which global MEMS sensor demand was unusually elevated by supply-chain restocking and automotive production catch-ups. The board should consider whether this beta estimate is representative of NMC's long-run systematic risk.

The corporate tax rate in Taiwan is 20%.

RAW INPUTS

MSC (the appraising firm):
  Equity beta (observable, own listed shares):     1.15
  Market value of equity (Ve):                     TWD 48,200 million
  Market value of debt (Vd):                       TWD 12,600 million
  Pre-tax cost of debt (Kd):                       7.2%

Novatel MicroSystems Co., Ltd. — MEMS peer proxy:
  Equity beta (NMC, 24-month window):              1.68
  Market value of equity (Ve, NMC):                TWD 9,400 million
  Market value of debt (Vd, NMC):                  TWD 3,800 million

Market / economy-wide:
  Risk-free rate (rf):                             3.8%
  Equity risk premium (ERP / MRP):                 6.5%
  Corporate tax rate:                              20%

Project:
  Expected IRR of MEMS fabrication line:           11.4%

### model_answer

**Cost of capital — CAPM / weighted average cost of capital**

**Assumptions:** a peer's equity beta is **ungeared** to an asset beta and **regeared** to the appraising firm's capital structure using the **Modigliani–Miller with-tax** relationship β_a = β_e × Ve/(Ve+Vd(1−T)), with the debt beta taken as **0 (debt assumed risk-free)**; the WACC weights the cost of equity and the **post-tax** cost of debt (Kd×(1−T)) by **market values**; the cost of equity is priced by CAPM (Ke = Rf + β × market risk premium) with Rf = 3.80% and MRP = 6.50%; the corporate tax rate is 20.00%.


**Step 1 — The company's own WACC (the tempting but WRONG hurdle here)**

Company Ke = Rf + β_company × MRP = 3.80% + 1.150 × 6.50% = 11.27%.

Company WACC = 11.27% × 0.793 + 5.76% × 0.207 = **10.13%**.

**Step 2 — The project-specific rate (ungear the peer, regear to your gearing)**

β_a = 1.680 × 9400/(9400 + 3800×(1−0.2)) = 1.269; β_e' = 1.535.

Project Ke = 3.80% + 1.535 × 6.50% = 13.78%; Project WACC = **12.12%**.

**Step 3 — Decision (code-owned)**

The project's expected return is **11.40%**. Against the correct **project-specific** hurdle of 12.12%, the decision is **REJECT**. Against the company WACC of 10.13%, you would have wrongly **accepted** it — the wrong hurdle **flips the decision**. The project must be judged on its OWN risk, not the firm's average.

**Step 4 — Evaluation / advice to the board**

The central question of appropriateness turns on whether Novatel MicroSystems Co., Ltd. genuinely represents the business risk of MSC's proposed MEMS sensor fabrication line. NMC is described as a pure-play MEMS manufacturer serving automotive and industrial IoT customers — a customer base and demand cycle that differ materially from MSC's existing logic and memory fabrication, which gives some confidence in the proxy selection at the sector level. However, the board should scrutinise whether NMC's revenue mix, geographic sales exposure, and stage of operational maturity are sufficiently aligned with the MEMS fabrication line MSC intends to build before treating NMC's beta as a reliable anchor for business risk. The peer-comparability concern is compounded by the fact that NMC's beta was estimated over the 2021–2022 COVID-19 recovery window — a period of exceptional MEMS demand driven by automotive supply-chain restocking — which may have caused NMC's returns to co-move with the market in a way that does not reflect the sector's long-run systematic characteristics; a longer estimation window, or a Blume-adjusted or industry-average beta, would provide a more robust estimate. The distinction between business risk and financial risk is critical here: by ungearing NMC's beta and then regearing it to MSC's own capital structure, the methodology isolates the systematic operating risk of MEMS fabrication and reattaches only MSC's financial risk, ensuring the hurdle rate prices the specific investment rather than MSC's blended portfolio of activities. Applying MSC's company-wide WACC — which blends the risk of its mature logic/memory operations with any diversification effect across its existing asset base — would be an inappropriate hurdle for a project whose operating risk profile is demonstrably different from that base, potentially distorting the investment decision in a way that misallocates MSC's capital across its strategic portfolio.

*Reconciliation: company WACC 10.13% vs project WACC 12.12%; correct hurdle = project-specific. ✓*

### hint

Check whether your hurdle rate reflects the systematic risk of MEMS fabrication specifically — if you used Meridian's own WACC, ask yourself whose business risk that rate actually prices, and whether the proxy beta has been ungeared and then regeared to Meridian's capital structure before you drew your accept/reject conclusion.

### full_reveal

The classic misconception here is FENCE-SITTING dressed up as a calculation: candidates produce two rates — the company WACC and a project-specific rate — but never state a clear recommendation, or they state results and stop short of explaining why the wrong hurdle would flip the decision. That failure matters because the whole intellectual purpose of the drill is the verdict: which rate is the appropriate hurdle, and what does applying the wrong one do to the capital allocation signal the board receives? The deeper valuation-plumbing error is using Meridian's company-wide WACC as the hurdle for a MEMS project — that rate blends the systematic risk of Meridian's existing logic and memory operations with its current capital structure, so it prices the firm's average risk profile rather than the operating risk embedded in MEMS fabrication; applying it means the project is being judged against the wrong risk benchmark, which may produce an accept/reject signal that misallocates capital. The correct mental model is to ungear the peer's equity beta to strip out the peer's financial risk, leaving only the business risk of MEMS fabrication, and then regear using Meridian's own capital structure so the hurdle rate carries Meridian's financial risk but the peer's operating risk — that is the rate against which the project's expected return must be tested. If your beta arithmetic went wrong, carry your own ungeared and regeared figures forward consistently into the CAPM and WACC steps — where the method is correct downstream, those marks still score and the error is charged once at its source, but that OFR credit is conditional on applying your own figure correctly at each subsequent step.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "kd": 0.072,
    "rf": 0.038,
    "mrp": 0.065,
    "own_vd": 12600,
    "own_ve": 48200,
    "peer_vd": 3800,
    "peer_ve": 9400,
    "tax_rate": 0.2,
    "debt_beta": 0,
    "company_vd": 12600,
    "company_ve": 48200
  },
  "components": [
    {
      "unit": "%",
      "label": "Company cost of equity (CAPM)",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "component_id": "company_ke",
      "working_steps": [
        "Ke = Rf + β_company × MRP"
      ],
      "expected_value": 11.274999999999999
    },
    {
      "unit": "%",
      "label": "Company WACC (the wrong hurdle for this project)",
      "recompute": "wacc_mv_weighted",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "company_ke"
      ],
      "component_id": "company_wacc",
      "working_steps": [
        "WACC = Ke×We + Kd(1−T)×Wd"
      ],
      "expected_value": 10.132088815789473
    },
    {
      "unit": "beta",
      "label": "Project asset beta (from the peer)",
      "tolerance": {
        "kind": "absolute",
        "value": 0.02
      },
      "component_id": "project_asset_beta",
      "working_steps": [
        "β_a = β_e × Ve/(Ve+Vd(1−T)) on the peer's gearing"
      ],
      "expected_value": 1.2694533762057878
    },
    {
      "unit": "beta",
      "label": "Project equity beta (regeared to your gearing)",
      "recompute": "mm_regear",
      "tolerance": {
        "kind": "absolute",
        "value": 0.02
      },
      "depends_on": [
        "project_asset_beta"
      ],
      "component_id": "project_beta",
      "working_steps": [
        "β_e' = β_a × (Ve+Vd(1−T))/Ve"
      ],
      "expected_value": 1.534932422516044
    },
    {
      "unit": "%",
      "label": "Project cost of equity (CAPM)",
      "recompute": "capm_ke",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "project_beta"
      ],
      "component_id": "project_ke",
      "working_steps": [
        "Ke = Rf + β_e' × MRP"
      ],
      "expected_value": 13.777060746354286
    },
    {
      "unit": "%",
      "label": "Project-specific WACC (the correct hurdle)",
      "recompute": "wacc_mv_weighted",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "project_ke"
      ],
      "component_id": "project_wacc",
      "working_steps": [
        "WACC = Ke×We + Kd(1−T)×Wd"
      ],
      "expected_value": 12.11563039431376
    }
  ]
}
```
