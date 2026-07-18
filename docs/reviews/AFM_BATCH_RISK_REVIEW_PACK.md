# AFM risk & uncertainty batch — blind adversarial review pack

**Calculator #3: risk & uncertainty (`lib/acca/risk.ts`). 4 drills, `status=candidate`, `published=false`, `paper_code=AFM`. AT THE REVIEW GATE. Awaiting co-founder independent recompute, THEN a blind GPT round. Last for the B-section-live tier.**

Doctrine: code owns EVERY figure AND every figure-vs-figure verdict — each scenario NPV, the ENPV, P(negative NPV), the sensitivity margins, the IRR, the RADR (proxy asset-beta ungear→regear via CAPM), both NPVs and the decision FLIP, the durations, the VaR. The model authored PROSE only. The calculator COMPOSES the discounting (`discountFactor`, `npv.ts`) and the RADR derivation (`computeCapm`, `capm.ts`) ONE-WAY, no back-imports.

## Conventions — FETCHED + PAGE-VERIFIED (docs/evidence/AFM_RISK_EVIDENCE.md; do NOT re-derive from memory)
Every convention was verified by reading the cited ACCA page (`pdftotext`), not a model-generated map. S-ids cite the official source:
- **Variable sensitivity %** = 100 × NPV ÷ PV of the affected post-tax stream — **S3** (F9 J16 examiner report, p2: "Sensitivity = 100 x NPV/ PV of project variable") + **S4** (FM SD23 examiner report, pp13–14).
- **Discount-rate sensitivity %** = (IRR − r) ÷ r × 100 — **S4**. The bare **IRR − r is HEADROOM** (percentage points), NEVER labelled sensitivity — ACCA marks that error down ("...shown incorrectly as the discount rate sensitivity itself").
- **Project duration** = Σ(t × PVₜ) ÷ ΣPVₜ (PV-weighted average time) — **S1** (P4 SD16 answers, p5) + **S2** (AFM SD19 answers, p4: "173,254,000/57,005,000 = 3·04 years"). Distinct from bond Macaulay/modified duration (calc #6).
- **RADR** = a project-specific rate from a proxy asset beta ungeared then regeared via CAPM — **S5** (AFM MJ19 answers) + **S6** (FM MJ18 answers: "A proxy company equity beta can be ungeared and the resulting asset [beta] can be regeared…").
- **ENPV** = Σ(pᵢ × NPVᵢ) — **S6** + **S7** (F9 J15 answers, p6). ENPV is a repeated-game mean — for a ONE-SHOT project the per-state NPVs and P(negative NPV) carry the decision ("as the project is not being repeated, the NPVs associated with each future economic state must be calculated").
- **VaR** = z × σ × √N, one-tail z = 1.65 @95% / 2.33 @99% — ACCA technical article "The risks of uncertainty".

## Family gates (beyond the 6 base gates)
- **G-a** probabilities sum to 1 · **G-b** ENPV = Σ(p×NPV) · **G-c** sensitivity reconciliation (applying the margin ZEROES the NPV; the discount-rate figure is (IRR−r)/r×100, and a bare IRR−r labelled "sensitivity" is REJECTED) · **G-d** RADR = the CAPM-recomputed project WACC, higher-risk → higher rate · **G-e** VaR z matches the stated confidence + one-tail (a 1.96/2.58 two-tail z is rejected), each duration ≤ its life. All green on all four drills, alongside GATE 1/2/3 (self-consistency, figure integrity, seeded-OFR) + P4/P5.

## Kinds → ids → code-computed verdicts
- **enpv (K1)** `84ee022a-2901-49da-bfe7-2dda13c6befe` — Reconciliation: Σ(p×NPV) = THB -86.2m; P(NPV<0) = 75% ✓
- **sensitivity (K2)** `3a2e2d1d-cde5-47b7-92ef-2371de7c3412` — Reconciliation: applying the 6.97% margin to ZAR 740.8m removes the ZAR 51.6m NPV ✓
- **radr_compare (K3)** `5a03ee27-1c80-4ff8-96d6-b1e3904c0958` — Reconciliation: same cash flows, two rates — NPV PLN 4.6m at 8.20% vs PLN -32.6m at the 10.90% RADR; decision flips ✓
- **risk_measures (K4)** `f28c2b4c-8943-4bf3-ad33-0732143ac95a` — Reconciliation: duration 3.07 years vs 5.06 years (longer = Concession B — Ramal Sul); VaR BRL 198.0m = 2.33×38.0×√5 ✓

## ⛔ CLOSED RULINGS — do NOT re-raise
- **Conventions are fetched + verified (S1–S7).** The five formulas above are page-verified against official ACCA answers/reports — do NOT dispute a formula or propose a "more standard" one from memory.
- **Project duration = Σ(t×PV)÷ΣPV is DISTINCT from bond Macaulay/modified duration** (calc #6). Do NOT flag the absence of the words "Macaulay/modified" — ACCA calls this "project duration" (S1/S2). It is comparative (which project is more exposed), never a standalone accept/reject.
- **Discount-rate sensitivity = (IRR−r)/r×100; the bare IRR−r is HEADROOM, never sensitivity** [S4]. Do NOT "correct" it to the bare difference — that is the exact error ACCA marks down.
- **K2 overlaps the live batch-#1 NPV `sensitivity` kind BY DESIGN.** This is the cited risk-family home and it ADDS the discount-rate form; the live NPV drills are untouched. Do NOT flag duplication.
- **Sensitivity variable ↔ PV-base pairing (S3, FR2).** A **volume** (or contribution) flex uses the **contribution** PV as the sensitivity base; a **selling-price** flex uses the **post-tax revenue** PV. K2 flexes **sales volume** on the contribution base — correct per S3's own worked example. Do NOT require a revenue base for a volume flex, or a contribution base for a price flex.
- **ENPV one-shot caveat is REQUIRED house content** [S7]: the per-state NPVs and P(negative NPV) sit alongside the mean because a real project is undertaken once. Do NOT flag it as over-hedging.
- **B1 ENTRY-RANK stays NPV** (risk headings ranked 13–16); these are lo_code B1a (B1b ii dual-covered on risk_measures, single-tag). **OFR** "charged once, at its source" — house wording, closed.

**Review method:** fresh model, no project context, AFM syllabus PDF attached; recompute EVERY figure in ALL FOUR drills from the raw inputs. Hunt for a semantic error a gate cannot catch: a scenario NPV mis-discounted, an ENPV not probability-weighted, a sensitivity base that is not the affected stream, the bare-IRR−r error, a RADR mis-ungeared/regeared or applied to the wrong cash flows, a duration that is not PV-weighted, a two-tail z on a one-tail VaR, scenario-fact drift, an invented statute/probability.

---

## Drill — enpv (K1)  ·  `84ee022a-2901-49da-bfe7-2dda13c6befe`
- LO B1a · mode quantitative · command_verb "evaluate and advise" · marks_guide 15

### question

Evaluate the expected net present value (ENPV) of the proposed EV-harness production line for Siam Precision Auto Components Co., Ltd., calculate the probability of a negative NPV across the three demand states, and advise the board whether to proceed with the investment.

### context_text

Siam Precision Auto Components Co., Ltd. (SPAC), headquartered in Rayong, Thailand, assembles high-voltage wiring harnesses for battery-electric vehicles and is considering a dedicated new production line to serve three Thai-based OEM customers under long-term supply agreements. The board has commissioned a market-demand study to assign probabilities to three mutually exclusive economic states — Optimistic, Base, and Pessimistic — reflecting the pace of EV adoption in the ASEAN market, though those probabilities were derived from a single consultant's scenario model rather than from a statistically robust historical dataset, raising legitimate questions about probability provenance. Because this production line is a one-off, capital-irreversible commitment rather than a repeated investment programme, the ENPV (which is a long-run expected-value argument) should be read alongside the individual state NPVs and the probability of a loss, since SPAC cannot rely on the law of large numbers to smooth outcomes across multiple trials. Raw inputs at the appraisal date are as follows:
- Initial outlay: THB 480 million (at t0)
- Discount rate (assumed, post-tax): 12% per annum
- Project life: 5 years
- Optimistic state — probability 0.25; net post-tax cash flows (THB millions): Year 1: 140, Year 2: 160, Year 3: 175, Year 4: 175, Year 5: 160
- Base state — probability 0.50; net post-tax cash flows (THB millions): Year 1: 100, Year 2: 115, Year 3: 120, Year 4: 115, Year 5: 100
- Pessimistic state — probability 0.25; net post-tax cash flows (THB millions): Year 1: 55, Year 2: 60, Year 3: 65, Year 4: 55, Year 5: 45

### model_answer

**Risk & uncertainty — expected net present value (ENPV)**

**Assumptions:** each economic state's cash flows are STATED; every scenario NPV is computed from its own stream discounted at 12.00% (outlay THB 480.0m at t0); probabilities are exhaustive and sum to 1. ENPV is the probability-weighted mean NPV — a **repeated-game** figure. Because this project is undertaken **once**, the individual state NPVs and the probability of a negative NPV carry the decision alongside the mean.

**Step 1 — Scenario NPVs (each from its own stated cash flows)**

| Scenario | Probability | NPV |
|------|------|------|
| Optimistic | 0.25 | THB 99.1m |
| Base | 0.50 | THB -83.8m |
| Pessimistic | 0.25 | THB -276.3m |

**Step 2 — Expected NPV**

ENPV = Σ(pᵢ × NPVᵢ) = **THB -86.2m**. Probability of a negative NPV = **75%**.

**Step 3 — Decision**

On the expected-value criterion the ENPV of THB -86.2m is **not positive**, so the project is **not acceptable on EV terms** as it stands.

**Step 4 — Advice to the board**

The most fragile assumption in this appraisal is the probability assigned to each demand state: because those probabilities were drawn from a single consultant's scenario model, the board should require an independent cross-check — for instance, triangulating against published ASEAN EV-penetration forecasts or OEM capacity plans — before treating them as reliable inputs. The assumed post-tax discount rate of twelve percent should also be interrogated, since SPAC's actual cost of capital will depend on the gearing it takes on to fund the THB 480 million outlay and on the specific operating-risk profile of a dedicated EV-harness line, which may differ materially from the company's blended rate. Even before considering the negative ENPV, the board must weigh the 75% probability and magnitude of a loss under the Pessimistic state, because this is a single, capital-irreversible project: there is no portfolio of repeated trials across which an expected-value argument will self-correct. The post-tax cash-flow estimates for all three states assume that the OEM supply agreements hold for the full five-year life and that input costs (copper, polymer insulation) remain stable, both of which the board should stress-test given commodity-price volatility in the Thai manufacturing supply chain. Finally, the board should confirm whether the THB 480 million outlay captures all commissioning, tooling, and working-capital requirements, as an understatement of the initial investment would render every state NPV optimistic.

*Reconciliation: Σ(p×NPV) = THB -86.2m; P(NPV<0) = 75% ✓*

### hint

You have the ENPV — now check whether you have told the board what to do with it, and whether your advice engages with the 75% probability of a negative NPV as a one-off, capital-irreversible commitment rather than treating the expected value as the only decision-relevant number.

### full_reveal

The classic misconception here is FENCE-SITTING layered on top of ABANDONED-AFTER-CALC: a candidate computes the ENPV and the probability of a negative NPV, then stops — restating the numbers without ever converting them into a boardroom recommendation. This is wrong because the command verb is "evaluate and advise," and the ENPV alone is an incomplete answer: it is a repeated-game statistic that assumes losses and gains average out across many trials, yet this project is undertaken once, so the individual state NPVs and the probability of a negative outcome carry independent decision weight that the expected value cannot capture on its own. The correct mental model is to treat the calculation as the floor — the numbers set the terms of the debate — and then rise to the advice layer: state a clear recommendation, anchor it to this project's one-shot, capital-irreversible nature, and name the specific assumptions (demand-state probabilities, discount rate, completeness of the THB 480 million outlay) that the board should stress-test before committing. If your scenario NPVs contain an arithmetic error, carry your own figures forward consistently into the ENPV and the probability calculation — where your downstream method is correct, those marks remain available, and the error is charged once at its source, not repeatedly; OFR credit is conditional on your own figure being used correctly in every subsequent step.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "hurdle": 0,
    "outlay": 480,
    "p_negative": 0.75,
    "discount_rate": 0.12
  },
  "components": [
    {
      "unit": "THBm",
      "label": "Scenario NPV — Optimistic",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "npv_1",
      "working_steps": [
        "= −outlay 480.0 + Σ (scenario Optimistic cash flow × DF @ 12.00%)"
      ],
      "expected_value": 99.1165244113314
    },
    {
      "unit": "THBm",
      "label": "Scenario NPV — Base",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "npv_2",
      "working_steps": [
        "= −outlay 480.0 + Σ (scenario Base cash flow × DF @ 12.00%)"
      ],
      "expected_value": -83.7960954698936
    },
    {
      "unit": "THBm",
      "label": "Scenario NPV — Pessimistic",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "npv_3",
      "working_steps": [
        "= −outlay 480.0 + Σ (scenario Pessimistic cash flow × DF @ 12.00%)"
      ],
      "expected_value": -276.30780556232156
    },
    {
      "unit": "THBm",
      "label": "Expected net present value (ENPV)",
      "recompute": "enpv_prob_weighted",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "npv_1",
        "npv_2",
        "npv_3"
      ],
      "component_id": "enpv",
      "working_steps": [
        "ENPV = Σ(pᵢ × NPVᵢ) = 0.25×99.1 + 0.5×-83.8 + 0.25×-276.3"
      ],
      "expected_value": -86.19586802269434
    }
  ]
}
```

---


## Drill — sensitivity (K2)  ·  `3a2e2d1d-cde5-47b7-92ef-2371de7c3412`
- LO B1a · mode quantitative · command_verb "evaluate and advise" · marks_guide 15

### question

Evaluate the sensitivity of the proposed Mogalakwena Refinery Expansion Project's NPV to (i) sales volume and (ii) the discount rate, and advise the board on the robustness of the investment decision.

### context_text

Northveld Platinum Processing (Pty) Ltd, headquartered in Limpopo, South Africa, is appraising a four-year expansion of its Mogalakwena refinery that would increase annual refined platinum-group-metals (PGM) output by approximately 18%. The board has adopted a hurdle rate of 12% per annum — assumed at the appraisal date — which reflects the company's blended cost of capital, though it is worth noting that refined-output volumes are inherently uncertain — sensitive to ore grade, recovery rates and processing uptime — and the volume forecasts underlying these cash flows were derived from a single technical consultant's base-case model, raising a question about forecast provenance and whether a downside-throughput scenario has been adequately stress-tested. The project's net post-tax cash flows embed contribution (sales-volume-driven revenue less variable processing costs) as the dominant value driver, and the board should recognise that, because this is a one-shot, long-dated capital commitment rather than a frequently repeated investment, the sensitivity margins computed below are the more decision-relevant risk measure than any expected-value arithmetic alone.

Raw inputs:
- Outlay (t0): ZAR 520 million
- Discount rate (assumed at appraisal date): 12% per annum
- Net post-tax cash flows (years 1–4): ZAR 175m, ZAR 195m, ZAR 200m, ZAR 185m
- Affected cash flows — PGM contribution stream (years 1–4): ZAR 230m, ZAR 250m, ZAR 258m, ZAR 240m
- Flexed variable: sales volume (contribution is the PV base — S3 convention for a volume flex)

### model_answer

**Risk & uncertainty — sensitivity analysis**

**Assumptions:** the base-case NPV and the affected variable's own present value are computed from the stated post-tax cash flows at 12.00%. The sensitivity of a variable is the percentage change in that variable that reduces the NPV to zero; for the discount rate it is measured from the project IRR.

**Step 1 — Base NPV and the affected present value**

Base-case NPV = **ZAR 51.6m**; PV of sales volume (the affected post-tax stream) = **ZAR 740.8m**.

**Step 2 — Sensitivity to sales volume**

Sensitivity = 100 × NPV ÷ PV of sales volume = 100 × 51.6 ÷ 740.8 = **6.97%** [S3, S4]. Sales volume can move by this margin before the decision reverses.

**Step 3 — Sensitivity to the discount rate**

Project IRR = **16.58%** (NPV = 0). The headroom over the 12.00% rate is 4.58 percentage points — but the **sensitivity** is that change expressed as a percentage of the original rate: (IRR − r) ÷ r × 100 = **38.15%** [S4]. (The bare 4.58pp difference is headroom, not sensitivity.)

**Step 4 — Advice to the board**

The most fragile assumption underpinning this appraisal is the refined-output volume forecast: derived from a single consultant's base case, it carries no visible cross-check against independent throughput or off-take projections, and a shortfall in refined volumes — for example from ore-grade variability, recovery-rate slippage or unplanned processing downtime — could erode contribution materially over the project's four-year life. The discount rate assumption is also exposed, because the 12% hurdle was set to reflect Northveld's current blended cost of capital rather than the specific systematic risk of a capacity-expansion project in a cyclical commodity sector, and if South African sovereign spreads or rand volatility widen, the true project cost of capital may be higher. The board should treat a narrow sales-volume sensitivity margin as a strong caution signal, given that refined-output volumes can swing materially with ore grade, recovery rates and unplanned downtime; conversely, a wide discount-rate margin would indicate that the accept decision is insensitive to moderate changes in the hurdle rate, providing some comfort on the financing-cost assumption. Before committing ZAR 520 million, the board should commission an independent volume/throughput-scenario review spanning at least a pessimistic downtime-and-grade path, and should confirm whether the 12% hurdle adequately compensates for the project's commodity-price beta relative to Northveld's broader portfolio.

*Reconciliation: applying the 6.97% margin to ZAR 740.8m removes the ZAR 51.6m NPV ✓*

### hint

You've calculated both sensitivity percentages — now check whether you've distinguished between the *headroom* on the discount rate (the raw percentage-point gap to the IRR) and the *sensitivity* expressed as a proportion of the original hurdle rate, and then ask yourself what each margin is actually telling the board about the fragility of the accept decision.

### full_reveal

The most common misconception here is ABANDONED-AFTER-CALC: candidates produce the sensitivity percentages and stop, treating the arithmetic as the deliverable rather than the starting point. That thinking fails the board because a percentage figure in isolation carries no decision weight — the examiner's marks are waiting on the interpretation of *what that margin means given this project's specific risk profile*. The correct mental model is that sensitivity analysis is a stress-test narrative: a narrow sales-volume margin signals a fragile assumption, and the board needs to know *why* that assumption is fragile — here, because refined-output volumes swing with ore grade, recovery rates and processing uptime, and the forecast rests on a single consultant's base case with no visible downside-throughput cross-check. On the discount-rate sensitivity, a further trap is reporting the raw IRR-minus-hurdle difference as the sensitivity figure; that is headroom, not sensitivity — sensitivity is that gap expressed as a proportion of the original rate, because the question asks how much the *rate itself* can move before the decision reverses. If your base-case NPV or IRR differs from the model answer, carry your own figures forward consistently into the sensitivity ratios and the board narrative — where your method is correct downstream, those marks remain available, and the error is charged once at its source.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "outlay": 520,
    "headroom_pp": 4.577526897239292,
    "discount_rate": 0.12
  },
  "components": [
    {
      "unit": "ZARm",
      "label": "Base-case NPV",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "base_npv",
      "working_steps": [
        "= −outlay 520.0 + Σ (net cash flow × DF @ 12.00%)"
      ],
      "expected_value": 51.62970019002489
    },
    {
      "unit": "ZARm",
      "label": "PV of sales volume (via contribution) (the affected post-tax stream)",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "pv_affected",
      "working_steps": [
        "= Σ (sales volume (contribution stream) cash flow × DF @ 12.00%)"
      ],
      "expected_value": 740.8192549979174
    },
    {
      "unit": "%",
      "label": "Sensitivity of the decision to sales volume (%)",
      "recompute": "sensitivity_100_npv_over_pv",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "base_npv",
        "pv_affected"
      ],
      "component_id": "var_sensitivity",
      "working_steps": [
        "= 100 × NPV ÷ PV of the contribution stream [S3, S4]"
      ],
      "expected_value": 6.969270823039019
    },
    {
      "unit": "%",
      "label": "Project IRR (%)",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "component_id": "irr",
      "working_steps": [
        "the discount rate at which NPV = 0"
      ],
      "expected_value": 16.57752689723929
    },
    {
      "unit": "%",
      "label": "Sensitivity of the decision to the discount rate (%)",
      "recompute": "disc_rate_sensitivity_over_r",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "irr"
      ],
      "component_id": "disc_sensitivity",
      "working_steps": [
        "= (IRR − r) ÷ r × 100 [S4] — NOT the bare IRR − r headroom"
      ],
      "expected_value": 38.1460574769941
    }
  ]
}
```

---


## Drill — radr_compare (K3)  ·  `5a03ee27-1c80-4ff8-96d6-b1e3904c0958`
- LO B1a · mode quantitative · command_verb "evaluate and advise" · marks_guide 15

### question

Evaluate the appropriateness of using Stalmet Group's own weighted average cost of capital as the discount rate for the Wiatr Południe wind-farm project, deriving a project-specific risk-adjusted discount rate from a proxy renewable-energy company and advising the board on whether the project should be accepted.

### context_text

Stalmet Group S.A. is a Warsaw-listed industrials conglomerate whose core operations span heavy-steel fabrication and precision engineering across Central Europe. The board is appraising Wiatr Południe, a proposed 120 MW onshore wind-farm in the Łódź Voivodeship, which sits in a materially different risk class from Stalmet's existing activities owing to renewable-energy-specific regulatory, offtake-pricing and construction-completion risks that the company's own WACC does not capture. The proxy company selected is Energetix Renewables A.S., a Copenhagen-listed pure-play wind-energy developer whose equity beta and capital structure are assumed representative of the project's systematic risk at the appraisal date — though the board should note that a single-peer proxy beta is sensitive to the chosen observation window and to any leverage changes Energetix may have undergone recently, so the asset beta derived from it carries meaningful estimation error. All monetary figures are in PLN millions; all rates are as assumed at the appraisal date.

Outlay (t0): 420
Project net post-tax cash flows (years 1–7, PLN m): 72, 80, 85, 88, 88, 85, 80
Stalmet's own WACC (company rate): 8.2%
Risk-free rate: 3.5%
Equity/market risk premium: 6.0%
Corporate tax rate: 19%
Pre-tax cost of debt: 5.8%
Proxy (Energetix) equity beta: 1.85
Proxy equity market value: 310
Proxy debt market value: 190
Stalmet own equity market value: 950
Stalmet own debt market value: 75

### model_answer

**Risk & uncertainty — risk-adjusted discount rate (RADR)**

**Assumptions:** because the project is in a different risk class from the company's existing operations, a **project-specific** risk-adjusted discount rate is derived from a proxy company's asset beta (ungeared from the proxy's gearing, regeared to this firm's) via CAPM [S5, S6], and applied to the project's stated cash flows. The company's own 8.20% rate is shown for contrast — it is the WRONG hurdle for a different-risk project.

**Step 1 — The project-specific RADR**

Proxy asset beta = 1.236; regeared to this firm = 1.315; project-specific RADR = **10.90%**.

**Step 2 — NPV at each rate (same project cash flows)**

| Discount rate | NPV | Decision |
|------|------|------|
| Company rate 8.20% | PLN 4.6m | accept |
| Project RADR 10.90% | PLN -32.6m | reject |

**Step 3 — Decision**

Comparing the two, the decision **FLIPS**: accept at the company rate, reject at the RADR. Using the company's own rate for a project in a different risk class gives the **wrong** decision.

**Step 4 — Advice to the board**

The most fragile assumption in this analysis is that Energetix Renewables A.S. is a sufficiently close proxy for the Wiatr Południe project: a single-peer beta conflates Energetix's own financing decisions, its geographic market, and its stage of development with Stalmet's specific project, and the board should require at least two or three additional pure-play comparators before treating the derived asset beta as reliable. Stalmet's own WACC reflects the blended risk of steel fabrication and engineering — sectors whose cash-flow cyclicality and regulatory environment differ fundamentally from a wind-energy generation asset operating under Polish renewable support mechanisms — so using the company rate for this project would systematically misrepresent the project's risk to equity holders. The durability of the post-tax cash-flow estimates also deserves scrutiny: wind-energy revenues in Poland depend on both electricity spot prices and the evolving capacity-market and green-certificate regime, neither of which is locked in for the full seven-year horizon modelled, meaning the assumed year-by-year figures may overstate stability. The board should further confirm whether the pre-tax cost of debt assumed for regearing reflects the incremental borrowing rate Stalmet would actually face on ring-fenced project-finance debt for a renewables asset, rather than its corporate bond rate, since these can differ materially. Finally, the board should treat the risk-adjusted NPV as the base-case signal rather than a point forecast and — because this is a one-shot, strategically irreversible commitment Stalmet cannot repeat across many trials to average out — commission downside sensitivities on the project’s key value drivers (support-tariff levels, construction cost and schedule, and output/load factor) before committing capital.

*Reconciliation: same cash flows, two rates — NPV PLN 4.6m at 8.20% vs PLN -32.6m at the 10.90% RADR; decision flips ✓*

### hint

You've derived two NPVs — now ask yourself whether the decision is the same under both discount rates, and if not, tell the board exactly which rate is the appropriate hurdle for a project in a different risk class from Stalmet's existing operations, and why.

### full_reveal

The classic misconception here is FENCE-SITTING wrapped inside UNDEVELOPED-ASSUMPTION: candidates derive the project-specific RADR correctly, present both NPVs side by side, and then stop — as if displaying the numbers is itself the advice. That thinking fails because the board cannot act on a table; they need to know which rate is conceptually correct for this project and what the flip in the decision actually means for capital allocation. The correct mental model is that Stalmet's own WACC reflects the blended risk of its existing steel-fabrication and engineering operations — it is the right hurdle only for projects whose cash-flow risk mirrors that blend; applying it to a wind-energy generation asset in a different regulatory and commercial environment is a rate mismatch, meaning the hurdle may not adequately represent the risk borne by Stalmet's equity holders on this specific investment. The proxy-beta route exists precisely to reassign the discount rate to the risk class of the project rather than the firm, and once that reassignment is made, the decision follows from the RADR NPV — not from the company rate. If your regeared beta or RADR differs from the model, carry your own figure into the NPV calculation and through to the recommendation: provided your method is consistent, the downstream marks for structure and advice remain available, with any error charged once at its source.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "radr": 0.10902083428409191,
    "outlay": 420,
    "asset_beta": 1.2362578141840914,
    "company_rate": 0.082,
    "regeared_beta": 1.3153132480911267
  },
  "components": [
    {
      "unit": "%",
      "label": "Project-specific RADR (%)",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "component_id": "radr",
      "working_steps": [
        "proxy asset beta 1.236 regeared to 1.315 → project WACC [S5, S6]"
      ],
      "expected_value": 10.902083428409192
    },
    {
      "unit": "PLNm",
      "label": "NPV at the company rate 8.20%",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "npv_at_company",
      "working_steps": [
        "= −outlay 420.0 + Σ (project cash flow × DF @ 8.20%)"
      ],
      "expected_value": 4.576711316187357
    },
    {
      "unit": "PLNm",
      "label": "NPV at the project-specific RADR",
      "recompute": "npv_at_radr_rate",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "radr"
      ],
      "component_id": "npv_at_radr",
      "working_steps": [
        "= −outlay 420.0 + Σ (project cash flow × DF @ the RADR)"
      ],
      "expected_value": -32.632147888774455
    }
  ]
}
```

---


## Drill — risk_measures (K4)  ·  `f28c2b4c-8943-4bf3-ad33-0732143ac95a`
- LO B1a · mode quantitative · command_verb "evaluate and advise" · marks_guide 15

### question

Evaluate the project duration and value at risk of Concession A (Expresso Norte) and Concession B (Ramal Sul) for ViaBrasil Infraestrutura S.A., and advise the board on the comparative timing risk and the downside exposure of the chosen project.

### context_text

ViaBrasil Infraestrutura S.A. is a São Paulo-based toll-road and logistics concession operator evaluating two federal highway concessions offered under Brazil's Programme de Parceria de Investimentos. Concession A — Expresso Norte — is structured as a front-loaded revenue concession in which the highest traffic volumes and toll receipts arise in the earliest years of the operating period, reflecting a densely populated corridor whose growth the appraisal team modelled using historical ANTT traffic data; the board should note that extrapolating past traffic counts into a ten-year forward horizon introduces material estimation error, and that the normality assumption underlying the value-at-risk calculation may understate tail risk in a market subject to periodic Brazilian macro shocks. Concession B — Ramal Sul — is a back-loaded concession whose revenues ramp up gradually as a new agribusiness export corridor matures, meaning a larger share of its cash flows is deferred; the annual standard deviation of project value (BRL 38 million) was sourced from a consultant's comparable-transaction regression on only eleven prior Brazilian infrastructure deals, so its precision is limited. Both concessions require the same initial outlay and the appraisal is conducted at a discount rate of 11% assumed at the appraisal date.

Raw inputs:
- Discount rate: 11%
- Concession A (Expresso Norte) cash flows (BRL m, Years 1–8): 95, 90, 80, 65, 50, 40, 30, 20
- Concession B (Ramal Sul) cash flows (BRL m, Years 1–8): 20, 30, 40, 50, 65, 80, 90, 95
- Initial outlay (both concessions): BRL 260 m
- VaR annual sigma: BRL 38 m
- VaR confidence level: 99%
- VaR tail: one-tail
- VaR horizon: 5 years

### model_answer

**Risk & uncertainty — project duration and value at risk**

**Assumptions:** project duration is the PV-weighted average timing of cash inflows, Σ(t × PV) ÷ Σ PV [S1, S2] — a **comparative** risk measure (the longer-duration project is the more exposed), never a standalone accept/reject. Value at risk uses a one-tail 99% confidence (z = 2.33) and scales the annual σ by √N over the 5-year horizon.

**Step 1 — Project duration (compared)**

| Project | Σ PV | Σ (t × PV) | Duration |
|------|------|------|------|
| Concession A — Expresso Norte | BRL 334.1m | 1025.7 | 3.07 years |
| Concession B — Ramal Sul | BRL 270.5m | 1368.9 | 5.06 years |

**Concession B — Ramal Sul** has the **longer duration**, so it is the more exposed to a change in the discount rate / a shift in the timing of cash flows.

**Step 2 — Project value at risk**

VaR = z × σ × √N = 2.33 × BRL 38.0m × √5 = **BRL 198.0m** — the one-tail 99% downside on project value over 5 years.

**Step 3 — Advice to the board**

The most fragile assumption in this appraisal is the annual sigma of project value derived from only eleven comparable transactions — a sample too thin to yield a reliable regression estimate, and the board should require sensitivity testing of the VaR figure across a plausible range of sigma values before treating it as a firm risk budget. The normality assumption embedded in the one-tail VaR is a second structural fragility: Brazilian infrastructure cash flows have historically exhibited fat-tailed downside behaviour driven by exchange-rate dislocations and federal concession renegotiations, so the true tail loss may exceed what the model reports. On duration, the comparison is inherently relative — neither duration figure is a standalone accept/reject criterion, but the concession with the longer duration carries greater exposure to discount-rate movements and to late-period political or regulatory intervention in Brazil's concession framework, both of which the board should weigh explicitly. The traffic-growth extrapolation underpinning Expresso Norte's early cash flows deserves independent validation against ANTT forecasts, since if peak volumes occur later than modelled the front-loaded advantage narrows materially. The board is advised to treat the VaR figure as a minimum stress estimate and to commission a scenario-based Monte Carlo overlay that relaxes the normality constraint before committing capital to either concession.

*Reconciliation: duration 3.07 years vs 5.06 years (longer = Concession B — Ramal Sul); VaR BRL 198.0m = 2.33×38.0×√5 ✓*

### hint

Your duration figures may be mechanically correct, but check whether you have told the board which concession carries the greater timing risk and why that matters in the context of Brazilian concession-framework and discount-rate uncertainty — without that comparative verdict, the calculation is incomplete advice.

### full_reveal

The dominant misconception here is ABANDONED-AFTER-CALC: candidates compute duration and VaR correctly, then treat the numbers as the destination rather than the departure point — producing a calculation that never becomes counsel. Duration is a relative, comparative risk measure, not a standalone accept/reject signal; if you stop after stating the two figures, you have told the board nothing actionable about which concession is more exposed to late-period political intervention, concession renegotiation, or discount-rate shifts. The VaR figure carries its own structural fragility — the thin comparables sample and the normality assumption embedded in a one-tail z-score are not cosmetic caveats, but genuine reasons why the reported figure may understate tail loss, and the board cannot treat it as a firm risk budget without that challenge being made explicit. On own-figure rule: if your duration or VaR inputs are slightly off, carry them forward consistently into your comparative commentary — where the downstream reasoning holds (longer duration → greater exposure; VaR = z × σ × √N), the method marks still score and the error is charged once at its source, provided you use your own figure correctly in every subsequent step. The boardroom test is simple: could the CFO read your three steps and know which concession to be more cautious about, why the VaR figure deserves a stress overlay, and which assumption deserves independent validation before capital is committed?

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "z": 2.33,
    "sigma": 38,
    "horizon": 5,
    "discount_rate": 0.11
  },
  "components": [
    {
      "unit": "BRLm",
      "label": "Σ PV — Concession A — Expresso Norte",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "sum_pv_a",
      "working_steps": [
        "Σ of the positive present values @ 11.00%"
      ],
      "expected_value": 334.13091050021563
    },
    {
      "unit": "BRLm·yr",
      "label": "Σ (t × PV) — Concession A — Expresso Norte",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "sum_t_pv_a",
      "working_steps": [
        "Σ of (year × present value)"
      ],
      "expected_value": 1025.6867467301452
    },
    {
      "unit": "years",
      "label": "Duration — Concession A — Expresso Norte (years)",
      "recompute": "duration_ratio",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "sum_t_pv_a",
        "sum_pv_a"
      ],
      "component_id": "duration_a",
      "working_steps": [
        "= Σ(t × PV) ÷ Σ PV [S1, S2]"
      ],
      "expected_value": 3.069715235847607
    },
    {
      "unit": "BRLm",
      "label": "Σ PV — Concession B — Ramal Sul",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "sum_pv_b",
      "working_steps": [
        "Σ of the positive present values @ 11.00%"
      ],
      "expected_value": 270.4687723140215
    },
    {
      "unit": "BRLm·yr",
      "label": "Σ (t × PV) — Concession B — Ramal Sul",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "sum_t_pv_b",
      "working_steps": [
        "Σ of (year × present value)"
      ],
      "expected_value": 1368.9327435871287
    },
    {
      "unit": "years",
      "label": "Duration — Concession B — Ramal Sul (years)",
      "recompute": "duration_ratio",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "sum_t_pv_b",
        "sum_pv_b"
      ],
      "component_id": "duration_b",
      "working_steps": [
        "= Σ(t × PV) ÷ Σ PV [S1, S2]"
      ],
      "expected_value": 5.061333816377741
    },
    {
      "unit": "BRLm",
      "label": "Project value at risk (99%, one-tail, 5y)",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "var_amount",
      "working_steps": [
        "= z 2.33 × σ 38.0 × √5 [article]"
      ],
      "expected_value": 197.9814587278314
    }
  ]
}
```

---
