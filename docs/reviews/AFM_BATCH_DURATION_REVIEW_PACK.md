# AFM bond-duration batch — blind adversarial review pack

**Calculator #6: bond duration (`lib/acca/duration.ts`). 4 drills, `status=candidate`, `published=false`, `paper_code=AFM`. CURRENT STATE — regenerated after every fix round.**

Doctrine: code owns EVERY figure AND every figure-vs-figure verdict (the interest-rate-exposure ranking; the zero-vs-coupon duration comparison); the model authored PROSE only — never a duration, a rate, or an inequality. House conventions: flat stated YTM per bond (no yield curve — that is B3h/calc #7); annual coupons; **modified = Macaulay ÷ (1+y)**. Graded chain price + Σt·PV → Macaulay → modified → price-sensitivity, OFR carrying. Pure rates/bond family — **P6 loss-relief is a structural no-op**, no issue-cost analogue.

Durations are in years (abs tol ±0.05); price/Σt·PV are money (rel ±0.5%); % price sensitivity abs ±0.1 pp. **All 6 gates pass** (schema self-consistency + tolerance + OFR-wiring; answer↔schema figure integrity at 1/2/3 dp; **distinct-factor** seeded-OFR carry-through [so the scale-invariant Macaulay ratio does not cancel]; P4 jurisdiction; P5 completeness incl. a duration demand; P6 loss-relief).


## ⛔ CLOSED RULINGS — do NOT re-raise (spend hostility on open questions, not settled ones)
- **OFR wording** — "the error is charged once, at its source" is deliberate HOUSE wording tied to the reviewer override log. Adjudicated closed; do not propose softening.
- **B3g convexity placement** — convexity lives SUBSTANTIVELY only in the `limitations` drill (which dual-covers B3g; `lo_code` is single-valued, coverage journalled, no migration). Kinds 1–3 carry a one-line linear-approximation caveat by design — that is intentional, not an omission.
- **Flat YTM (no term structure)** — a single stated YTM per bond is the B3f convention. The yield curve / credit spread is B3h (calc #7), out of scope here by design.
- **Annual coupons** — exam-orthodox default for this batch; the calculator supports a semi-annual frequency param (unused). Not a gap.

**Review method:** fresh model, no project context, AFM syllabus PDF attached; FULL hostility on drill 1 (standard, first-of-family), spot-check siblings WITH full recomputation. Hunt for semantic errors a deterministic gate cannot catch: a duration mis-framed, an exposure ranking inverted, the zero=maturity identity mis-stated, convexity confused (does it help or hurt?), scenario-fact drift.

---

## Drill 1 — standard (B3f)  ·  `f8d9ec20-71f2-44fc-8d2a-5674e0d97670`
- LO B3f · mode quantitative · command_verb "assess" · marks_guide 15

### question

Assess Colbún S.A.'s exposure to interest-rate risk on the CLP-denominated bond described below. Your assessment must include: (i) a PV-weighted cash-flow table showing the present value of each annual cash flow and its time-weighted contribution; (ii) the Macaulay duration; (iii) the modified duration; and (iv) an estimate of the change in the bond's market price for a parallel upward shift of 100 basis points in the yield curve. On the basis of your results, assess the materiality of the interest-rate exposure for the board of Colbún S.A. and advise whether the current duration profile warrants active risk-management action.

### context_text

Colbún S.A. is a major Chilean electricity generation company whose asset base includes hydroelectric and thermoelectric plants serving the Sistema Eléctrico Nacional. To part-finance a CLP 180 billion capacity-expansion programme in its southern hydro portfolio, Colbún's treasury team issued a fixed-rate, CLP-denominated senior unsecured bond in the local capital market. The bond is carried at amortised cost on the company's balance sheet, but the board's risk committee has requested a mark-to-market sensitivity analysis ahead of the upcoming annual review of the company's interest-rate risk policy.

The bond was priced at par at issuance and is now being re-evaluated at the same flat yield to maturity, which represents a single snapshot of current market rates. The sensitivity estimate below assumes a large parallel shift in the yield curve — an assumption the board should recognise may not reflect the actual shape of rate movements in the Chilean fixed-income market, where short and long tenors do not always move in lock-step.

Raw inputs — Colbún S.A. Fixed-Rate Senior Bond:
  • Face value (par):       CLP 100 per unit
  • Annual coupon rate:     7.50%  (i.e. CLP 7.50 paid at end of each year)
  • Maturity:               8 years
  • Flat yield to maturity: 7.50%  (annual, single-rate snapshot)
  • Assumed yield shift:    +100 basis points (i.e. +0.01 in decimal)

### model_answer

**Bond duration — interest-rate exposure**

**Assumptions:** each bond is priced at its stated flat yield to maturity; coupons are annual; the modified duration is Macaulay ÷ (1 + y). Duration measures interest-rate exposure — the modified duration is the approximate % change in price for a 1% (100 bp) change in yield: ΔP/P ≈ −modified × Δy.

**Step 1 — Price, Σ t·PV and duration**

| Year | Cash flow | DF @ 7.50% | PV | t·PV |
|------|------|------|------|------|
| 1 | CLP 7.5m | 0.930 | CLP 7.0m | CLP 7.0m |
| 2 | CLP 7.5m | 0.865 | CLP 6.5m | CLP 13.0m |
| 3 | CLP 7.5m | 0.805 | CLP 6.0m | CLP 18.1m |
| 4 | CLP 7.5m | 0.749 | CLP 5.6m | CLP 22.5m |
| 5 | CLP 7.5m | 0.697 | CLP 5.2m | CLP 26.1m |
| 6 | CLP 7.5m | 0.648 | CLP 4.9m | CLP 29.2m |
| 7 | CLP 7.5m | 0.603 | CLP 4.5m | CLP 31.6m |
| 8 | CLP 107.5m | 0.561 | CLP 60.3m | CLP 482.2m |
| **Totals** | | | **CLP 100.0m** | **CLP 629.7m** |

**Macaulay duration = Σ t·PV ÷ price = CLP 629.7m ÷ CLP 100.0m = 6.297 years.**

**Modified duration = Macaulay ÷ (1 + 7.50%) = 5.857 years.**

**Step 2 — Interest-rate sensitivity**

For a +1.00% (100 bp) shift in the yield, the first-order estimate is ΔP/P ≈ −modified × Δy = **-5.86%** (a fall of about CLP 5.9m on this CLP 100.0m position).

**Step 3 — Evaluation / advice to the board**

Colbún S.A. operates in the Chilean electricity generation sector, where long-horizon infrastructure assets are typically financed with long-dated fixed-rate debt to achieve cash-flow matching — the 8-year maturity of this bond reflects precisely that strategic funding approach. Because the bond carries a fixed coupon set at issuance, the company's interest cost is insulated from rising Chilean market rates on this instrument; however, the mark-to-market value of the liability moves inversely with rates, which is the exposure the risk committee has asked the board to quantify. The sensitivity figure computed above is derived from a linear (first-order) approximation: duration treats the price–yield relationship as a straight line, whereas the true relationship is convex — meaning that for a large parallel shift of 100 basis points, the actual price decline will be slightly less severe than the duration estimate suggests, because convexity causes the price to fall more slowly than the linear model implies; ignoring convexity therefore causes the duration-based estimate to overstate the true mark-to-market loss, a limitation the board should factor into any hedging or covenant headroom analysis. The flat-yield assumption is a further constraint: the yield curve in Chile's fixed-income market does not always shift in a uniform parallel manner, so the stated exposure figure should be treated as an indicative order-of-magnitude rather than a precise forecast. Given Colbún's regulated revenue streams and the long-dated nature of its hydro assets, the board should confirm whether the current duration profile is consistent with the company's stated duration-matching policy before deciding whether interest-rate derivatives are warranted.

*(Modified duration is a linear, small-yield-change approximation; for a large shift the convex price–yield curve makes the true move differ — see the limitations of duration.)*

*Reconciliation: price CLP 100.0m, Σ t·PV CLP 629.7m → Macaulay 6.297y → modified 5.857y → ΔP/P -5.86% ✓*

### hint

Check whether your Macaulay duration divides Σ(t·PV) by the bond's present value — not par or face value — and then ask yourself what the resulting modified duration figure is actually telling the board about the materiality of this exposure and whether action is warranted.

### full_reveal

The dominant misconception here is ABANDONED-AFTER-CALC: candidates complete the duration table, produce a Macaulay and modified duration figure, state the estimated price sensitivity, and then stop — leaving the marks that reward assessment and advice unclaimed. This fails because the calculation is only the evidence base; the board question is whether the exposure is material and whether the duration profile warrants active risk management, and those are judgment calls that require the numbers to be interpreted against Colbún's operating context. The correct mental model is that modified duration is a linear first-order approximation, and a sophisticated board presentation must acknowledge that the true price–yield relationship is convex — meaning the duration estimate may overstate the mark-to-market loss for a large parallel shift — and that a uniform parallel shift is itself an assumption about Chile's yield curve that may not hold in practice. If your duration figures differ from the model answer, carry them forward consistently into the sensitivity estimate and the evaluation: where your downstream method is sound, those marks may still score — but only if you apply your own figure correctly rather than switching to a different number mid-answer. The boardroom question is never "what is the duration?" — it is "given this duration profile and Colbún's long-horizon hydro assets, does the risk committee have enough evidence to act, and what should the board verify before deciding?"

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "ytm": 0.075,
    "freq": 1,
    "maturity": 8,
    "face_value": 100,
    "coupon_rate": 0.075,
    "yield_shift": 0.01
  },
  "components": [
    {
      "unit": "CLPm",
      "label": "Colbún 8-year fixed-rate senior bond — price (Σ PV)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "price",
      "working_steps": [
        "Σ of each cash flow discounted at the YTM"
      ],
      "expected_value": 100.00000000000003
    },
    {
      "unit": "CLPm·yr",
      "label": "Colbún 8-year fixed-rate senior bond — Σ t·PV",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "weighted_sum",
      "working_steps": [
        "Σ (year × discounted cash flow)"
      ],
      "expected_value": 629.6601321361561
    },
    {
      "unit": "years",
      "label": "Colbún 8-year fixed-rate senior bond — Macaulay duration",
      "recompute": "macaulay_ratio",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "weighted_sum",
        "price"
      ],
      "component_id": "macaulay",
      "working_steps": [
        "= Σ t·PV ÷ price"
      ],
      "expected_value": 6.2966013213615595
    },
    {
      "unit": "years",
      "label": "Colbún 8-year fixed-rate senior bond — modified duration",
      "recompute": "modified_from_macaulay",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "macaulay"
      ],
      "component_id": "modified",
      "working_steps": [
        "= Macaulay ÷ (1 + y)"
      ],
      "expected_value": 5.85730355475494
    },
    {
      "unit": "%",
      "label": "Colbún 8-year fixed-rate senior bond — estimated price change for the yield shift",
      "recompute": "price_sensitivity_linear",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "modified"
      ],
      "component_id": "price_sensitivity",
      "working_steps": [
        "ΔP/P ≈ −modified × Δy"
      ],
      "expected_value": -5.85730355475494
    }
  ]
}
```

---

## Drill 2 — compare (B3f)  ·  `7db140ed-eaf5-417e-8683-62769370753c`
- LO B3f · mode quantitative · command_verb "assess" · marks_guide 15

### question

Assess Türkiye Kanatları A.Ş.'s interest-rate exposure on its two outstanding USD-denominated debt facilities by (i) constructing the present-value-weighted cash-flow table for each facility, (ii) calculating the Macaulay duration and modified duration of each, and (iii) assessing which facility exposes the airline to greater interest-rate risk, with a recommendation to the board on the implications for refinancing strategy.

### context_text

Background
Türkiye Kanatları A.Ş. ("TK") is a mid-sized Turkish private airline headquartered in Istanbul, operating scheduled and charter services across Europe, the Middle East, and Central Asia. The airline finances its narrow-body fleet through two USD-denominated fixed-rate debt facilities arranged with an international syndicate; the hard-currency denomination avoids the deep double-digit yields that would apply to Turkish lira borrowings (currently above 40% in the domestic market) and aligns debt service with TK's USD-denominated ticket revenues.

The Chief Financial Officer has flagged to the board that the US Federal Reserve's rate path remains uncertain and that a rise in USD yields would reduce the mark-to-market value of TK's fixed-rate liabilities — an important consideration under IFRS 9 fair-value hedge accounting. Before deciding whether to enter into an interest-rate swap to convert either or both facilities to floating rate, the board has requested a duration-based assessment of each facility's sensitivity to a change in USD yields.

Challengeable texture — limitation to note: the analysis uses a single flat yield to maturity for each facility (a snapshot of today's USD swap curve), and any price-sensitivity estimate assumes a small parallel shift in that yield. Neither condition is guaranteed to hold in practice.

Raw inputs

Facility A — "Short-Haul Fleet Bond"
  Face value:    USD 100 per unit
  Coupon rate:   6.00% per annum (annual, fixed)
  Maturity:      4 years
  Flat YTM:      7.00% per annum

Facility B — "Long-Haul Fleet Bond"
  Face value:    USD 100 per unit
  Coupon rate:   5.00% per annum (annual, fixed)
  Maturity:      9 years
  Flat YTM:      7.00% per annum

Assumed yield shift for sensitivity: +100 basis points (0.01)

### model_answer

**Bond duration — interest-rate exposure**

**Assumptions:** each bond is priced at its stated flat yield to maturity; coupons are annual; the modified duration is Macaulay ÷ (1 + y). Duration measures interest-rate exposure — the modified duration is the approximate % change in price for a 1% (100 bp) change in yield: ΔP/P ≈ −modified × Δy.

**Step 1 — Facility A — Short-Haul Fleet Bond: price, Σ t·PV and duration**

| Year | Cash flow | DF @ 7.00% | PV | t·PV |
|------|------|------|------|------|
| 1 | USD 6.0m | 0.935 | USD 5.6m | USD 5.6m |
| 2 | USD 6.0m | 0.873 | USD 5.2m | USD 10.5m |
| 3 | USD 6.0m | 0.816 | USD 4.9m | USD 14.7m |
| 4 | USD 106.0m | 0.763 | USD 80.9m | USD 323.5m |
| **Totals** | | | **USD 96.6m** | **USD 354.2m** |

Macaulay = USD 354.2m ÷ USD 96.6m = **3.667 years**; modified = 3.667 ÷ (1 + 7.00%) = **3.427 years**.

**Step 2 — Facility B — Long-Haul Fleet Bond: price, Σ t·PV and duration**

| Year | Cash flow | DF @ 7.00% | PV | t·PV |
|------|------|------|------|------|
| 1 | USD 5.0m | 0.935 | USD 4.7m | USD 4.7m |
| 2 | USD 5.0m | 0.873 | USD 4.4m | USD 8.7m |
| 3 | USD 5.0m | 0.816 | USD 4.1m | USD 12.2m |
| 4 | USD 5.0m | 0.763 | USD 3.8m | USD 15.3m |
| 5 | USD 5.0m | 0.713 | USD 3.6m | USD 17.8m |
| 6 | USD 5.0m | 0.666 | USD 3.3m | USD 20.0m |
| 7 | USD 5.0m | 0.623 | USD 3.1m | USD 21.8m |
| 8 | USD 5.0m | 0.582 | USD 2.9m | USD 23.3m |
| 9 | USD 105.0m | 0.544 | USD 57.1m | USD 514.0m |
| **Totals** | | | **USD 87.0m** | **USD 637.8m** |

Macaulay = USD 637.8m ÷ USD 87.0m = **7.334 years**; modified = **6.854 years**.

**Step 3 — Ranking interest-rate exposure (code-owned)**

Facility B — Long-Haul Fleet Bond has the **higher modified duration** (6.854 vs 3.427 years), so it is the **more exposed** to a rise in yields — a 1% rate rise moves its price roughly 6.854% against you, versus 3.427% for the other. Hedge or shorten that exposure first.

**Step 4 — Evaluation / advice to the board**

Türkiye Kanatları A.Ş. has deliberately denominated both facilities in USD to sidestep the acute financing costs that accompany Turkish lira debt in the current high-rate domestic environment, anchoring debt service to the airline's hard-currency revenue stream. The longer tenor of Facility B reflects the extended economic life of the wide-body, long-haul fleet assets it finances — a structurally sound match between asset life and liability maturity, yet one that carries a material duration consequence the board must weigh before committing to any swap. The coupon on Facility B is set below that of Facility A, which compounds the duration differential: lower periodic cash flows push the centre of gravity of repayment further into the future, amplifying sensitivity to any movement in USD yields. The board should recognise that the single flat-yield assumption is a snapshot — if the USD yield curve steepens rather than shifts in parallel, the sensitivity estimate for the longer facility will differ from the linear approximation, because duration cannot capture the curvature (convexity) of the price-yield relationship; for a large upward shift, the true price decline of the longer-dated facility will be less severe than the modified-duration estimate implies, since positive convexity causes the price-yield curve to bow favourably. Before authorising an interest-rate swap on either facility, the board should confirm whether IFRS 9 hedge-effectiveness requirements can be met given TK's cross-currency exposure and the basis risk between the USD swap curve and the specific syndicated-loan pricing grid.

*(Modified duration is a linear, small-yield-change approximation; for a large shift the convex price–yield curve makes the true move differ — see the limitations of duration.)*

*Reconciliation: Facility A — Short-Haul Fleet Bond modified 3.427y vs Facility B — Long-Haul Fleet Bond modified 6.854y — more exposed = Facility B — Long-Haul Fleet Bond. ✓*

### hint

Check whether your Macaulay duration table weights each cash flow by its time period before dividing by total present value — and then ask yourself what the modified duration number is actually telling the board about which facility to address first in any refinancing or hedging conversation.

### full_reveal

The dominant failure here is ABANDONED-AFTER-CALC: candidates complete the duration tables and produce two modified-duration figures, then stop — leaving the board with numbers but no verdict and no strategic direction. That is the wrong mental model because duration is not an end in itself; modified duration is a sensitivity coefficient, and its value lies entirely in the comparison it enables and the hedging or refinancing decision it should drive. A second, related trap is UNDEVELOPED-ASSUMPTION: candidates state that "lower coupons increase duration" or "longer tenor increases duration" as bare assertions, without explaining the causal mechanism — that lower periodic cash flows shift the present-value centre of gravity toward the terminal principal repayment, stretching the weighted-average time to receipt and amplifying price sensitivity to any yield movement. If your duration figures contain an arithmetic slip, carry them forward consistently into the modified-duration step and the ranking — where the downstream method is correct, those marks are still available, but only if your own figure is used correctly and coherently throughout. The boardroom move this drill is testing is the pivot from calculation to recommendation: once you have ranked the two facilities by modified duration, you must tell the board which exposure to hedge or shorten first, and flag that the linear duration approximation may understate or overstate the true price move for a large yield shift because it cannot capture the curvature of the price-yield relationship.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "ytm": 0.07,
    "freq": 1,
    "maturity": 4,
    "face_value": 100,
    "coupon_rate": 0.06,
    "yield_shift": 0
  },
  "components": [
    {
      "unit": "USDm",
      "label": "Facility A — Short-Haul Fleet Bond — price (Σ PV)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "a_price",
      "working_steps": [
        "Σ of each cash flow discounted at the YTM"
      ],
      "expected_value": 96.61278874353604
    },
    {
      "unit": "USDm·yr",
      "label": "Facility A — Short-Haul Fleet Bond — Σ t·PV",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "a_weighted_sum",
      "working_steps": [
        "Σ (year × discounted cash flow)"
      ],
      "expected_value": 354.2496730669785
    },
    {
      "unit": "years",
      "label": "Facility A — Short-Haul Fleet Bond — Macaulay duration",
      "recompute": "macaulay_ratio",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "a_weighted_sum",
        "a_price"
      ],
      "component_id": "a_macaulay",
      "working_steps": [
        "= Σ t·PV ÷ price"
      ],
      "expected_value": 3.666695451751773
    },
    {
      "unit": "years",
      "label": "Facility A — Short-Haul Fleet Bond — modified duration",
      "recompute": "modified_from_macaulay",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "a_macaulay"
      ],
      "component_id": "a_modified",
      "working_steps": [
        "= Macaulay ÷ (1 + y)"
      ],
      "expected_value": 3.4268181792072645
    },
    {
      "unit": "USDm",
      "label": "Facility B — Long-Haul Fleet Bond — price (Σ PV)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "b_price",
      "working_steps": [
        "Σ of each cash flow discounted at the YTM"
      ],
      "expected_value": 86.9695355024042
    },
    {
      "unit": "USDm·yr",
      "label": "Facility B — Long-Haul Fleet Bond — Σ t·PV",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "b_weighted_sum",
      "working_steps": [
        "Σ (year × discounted cash flow)"
      ],
      "expected_value": 637.8185699654762
    },
    {
      "unit": "years",
      "label": "Facility B — Long-Haul Fleet Bond — Macaulay duration",
      "recompute": "macaulay_ratio",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "b_weighted_sum",
        "b_price"
      ],
      "component_id": "b_macaulay",
      "working_steps": [
        "= Σ t·PV ÷ price"
      ],
      "expected_value": 7.333815988333573
    },
    {
      "unit": "years",
      "label": "Facility B — Long-Haul Fleet Bond — modified duration",
      "recompute": "modified_from_macaulay",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "b_macaulay"
      ],
      "component_id": "b_modified",
      "working_steps": [
        "= Macaulay ÷ (1 + y)"
      ],
      "expected_value": 6.854033633956609
    }
  ]
}
```

---

## Drill 3 — zero_coupon (B3f)  ·  `ffe854d1-ff1a-4c0a-96f4-0e9c69e75b66`
- LO B3f · mode quantitative · command_verb "assess" · marks_guide 15

### question

Assess PT Nusantara Graha Properti's interest-rate exposure arising from its two debt instruments. Your assessment should: (i) calculate the Macaulay duration and modified duration for both the zero-coupon Medium-Term Notes and the fixed-rate coupon bonds; (ii) estimate the price sensitivity of each instrument to the stated parallel yield shift; and (iii) assess which instrument exposes the company to greater interest-rate risk, explaining the structural reason for the difference and the implications for the board's debt-management strategy.

### context_text

PT Nusantara Graha Properti (NGP) is a mid-sized Indonesian property developer headquartered in Surabaya, with a project portfolio spanning residential townships in East Java and mixed-use developments in South Kalimantan. To fund the construction pipeline, the company's treasury team raised two separate IDR-denominated debt instruments in the domestic capital market, both now sitting on the balance sheet at carrying value.

The first instrument is a series of zero-coupon Medium-Term Notes (MTNs) — a deep-discount security with no periodic cash payments, redeemable at full face value on maturity. The board's motivation for issuing these was to avoid near-term cash outflows during the construction phase, when project revenues have not yet commenced.

The second instrument is a conventional fixed-rate bond carrying annual coupon payments at a rate set at issuance. It has the same maturity and the same flat yield to maturity as the MTNs, allowing a direct structural comparison between the two instruments.

The Risk and Finance Committee has asked senior management to assess how sensitive each instrument's market value is to a 100-basis-point upward parallel shift in Indonesian government benchmark yields, which would feed through to the YTMs applied to NGP's own paper.

**Challengeable texture — limitations of this analysis:** The YTM applied to each instrument is a single market snapshot taken at one point in time; Indonesian bond markets can move sharply and non-linearly, particularly around Bank Indonesia monetary policy meetings. In addition, the sensitivity estimate assumes a parallel shift across the yield curve — in practice, short- and long-dated segments of the IDR curve move by different magnitudes, and the linear duration approximation becomes increasingly unreliable for large yield movements.

---

**Raw inputs — PT Nusantara Graha Properti**

Zero-coupon Medium-Term Notes (MTNs):
- Face value: IDR 500,000,000 (per note)
- Annual coupon rate: 0% (zero-coupon / deep-discount)
- Years to maturity: 7
- Flat YTM: 9.50% per annum

Fixed-rate coupon bond (same maturity, same YTM):
- Face value: IDR 500,000,000 (per bond)
- Annual coupon rate: 8.00%
- Years to maturity: 7
- Flat YTM: 9.50% per annum

Assumed parallel yield shift: +100 basis points (i.e. +1.00 percentage point)

### model_answer

**Bond duration — interest-rate exposure**

**Assumptions:** each bond is priced at its stated flat yield to maturity; coupons are annual; the modified duration is Macaulay ÷ (1 + y). Duration measures interest-rate exposure — the modified duration is the approximate % change in price for a 1% (100 bp) change in yield: ΔP/P ≈ −modified × Δy.

**Step 1 — Zero-coupon MTNs (zero-coupon): price and duration**

| Year | Cash flow | DF @ 9.50% | PV | t·PV |
|------|------|------|------|------|
| 1 | IDR 0.0m | 0.913 | IDR 0.0m | IDR 0.0m |
| 2 | IDR 0.0m | 0.834 | IDR 0.0m | IDR 0.0m |
| 3 | IDR 0.0m | 0.762 | IDR 0.0m | IDR 0.0m |
| 4 | IDR 0.0m | 0.696 | IDR 0.0m | IDR 0.0m |
| 5 | IDR 0.0m | 0.635 | IDR 0.0m | IDR 0.0m |
| 6 | IDR 0.0m | 0.580 | IDR 0.0m | IDR 0.0m |
| 7 | IDR 500000000.0m | 0.530 | IDR 264893419.8m | IDR 1854253938.4m |
| **Totals** | | | **IDR 264893419.8m** | **IDR 1854253938.4m** |

With a single cash flow at redemption, the Macaulay duration equals the maturity exactly: **7.000 years = 7-year maturity**; modified = **6.393 years**.

**Step 2 — An equivalent 7-year coupon bond, for contrast**

| Year | Cash flow | DF @ 9.50% | PV | t·PV |
|------|------|------|------|------|
| 1 | IDR 40000000.0m | 0.913 | IDR 36529680.4m | IDR 36529680.4m |
| 2 | IDR 40000000.0m | 0.834 | IDR 33360438.7m | IDR 66720877.4m |
| 3 | IDR 40000000.0m | 0.762 | IDR 30466154.1m | IDR 91398462.2m |
| 4 | IDR 40000000.0m | 0.696 | IDR 27822971.7m | IDR 111291887.0m |
| 5 | IDR 40000000.0m | 0.635 | IDR 25409106.6m | IDR 127045533.1m |
| 6 | IDR 40000000.0m | 0.580 | IDR 23204663.6m | IDR 139227981.4m |
| 7 | IDR 540000000.0m | 0.530 | IDR 286084893.4m | IDR 2002594253.5m |
| **Totals** | | | **IDR 462877908.4m** | **IDR 2574808674.8m** |

Macaulay = **5.563 years**, which is **shorter than its 7-year maturity** — the intervening coupons pull the weighted-average time forward.

**Step 3 — What this shows (code-owned)**

A zero-coupon bond's duration is its maturity (7.000 years); a coupon bond of the same maturity always has a **shorter** duration (5.563 years here) and so is **less** exposed to a given yield change, all else equal.

**Step 4 — Evaluation / advice to the board**

PT Nusantara Graha Properti's decision to issue the zero-coupon MTNs was commercially motivated by the desire to preserve cash during the construction phase of its East Java and South Kalimantan projects — but the board must recognise that this same structural feature, the absence of any periodic coupon payment, is precisely what concentrates all economic value at the single redemption date seven years hence, producing the maximum possible duration for a seven-year instrument. By contrast, the fixed-rate coupon bond returns a portion of its economic value to the holder each year through annual IDR coupon payments, which progressively pull the weighted average repayment date forward relative to legal maturity. Because Bank Indonesia's policy rate path remains uncertain — as the scenario itself acknowledges through the single-snapshot caveat — the board should treat the MTN portfolio as the primary source of mark-to-market interest-rate risk on the balance sheet. Furthermore, the linear duration approximation understates the true price recovery the MTNs would enjoy if yields were to fall sharply, and overstates the price loss if yields rise sharply, because the actual price–yield relationship is convex: for a large parallel shift such as a sudden Bank Indonesia tightening cycle, the true price decline will be somewhat less severe than the modified-duration estimate implies, but relying on this convexity cushion without formal convexity measurement would be imprudent at board level. The committee should therefore consider whether the MTN exposure can be partially offset through an interest-rate swap — converting a portion of the fixed-rate exposure into floating-rate obligations linked to the Jakarta Interbank Offered Rate (JIBOR) — or whether the project cash-flow timeline justifies accepting the duration mismatch on the grounds that construction-phase revenues are themselves insensitive to short-term rate movements.

*(Modified duration is a linear, small-yield-change approximation; for a large shift the convex price–yield curve makes the true move differ — see the limitations of duration.)*

*Reconciliation: zero Macaulay 7.000y = 7y maturity; coupon-bond Macaulay 5.563y < maturity. ✓*

### hint

Your duration table may be mechanically correct, but ask yourself: have you explained to the board *why* the structural absence of interim cash flows in a zero-coupon instrument produces a fundamentally different duration outcome than a coupon-paying bond of identical maturity — and what that difference means for PT Nusantara Graha Properti's debt-management choices?

### full_reveal

The classic misconception here is ABANDONED-AFTER-CALC: candidates complete the Macaulay and modified duration workings competently, then stop — as though the numbers speak for themselves — without ever translating the structural finding into a board-level recommendation on debt management. This is wrong because duration is not a self-interpreting statistic; its significance lies in what it implies about the company's risk position and the actions available to manage it, and those implications are where the L3 marks live. The correct mental model is that the duration calculation is the floor, not the ceiling: once you have established which instrument carries the higher duration, you must explain the causal mechanism — that concentrating all cash flows at a single future date removes the dampening effect that periodic coupon receipts provide — and then connect that mechanism to the scenario's specific context, including the uncertainty around Bank Indonesia's policy-rate path and the construction-phase cash-flow profile of the East Java and South Kalimantan projects. If your duration figures differ from the model answer's, apply the own-figure rule: carry your modified duration forward consistently into the price-sensitivity estimate and the comparative assessment — where your method is sound, those downstream marks remain available, and the error is charged once at its source. The boardroom pressure is this: a board does not pay for a duration table — it pays for a verdict on which instrument is the primary source of mark-to-market risk and what, if anything, should be done about it.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "ytm": 0.095,
    "freq": 1,
    "maturity": 7,
    "face_value": 500000000,
    "coupon_rate": 0,
    "yield_shift": 0
  },
  "components": [
    {
      "unit": "IDRm",
      "label": "Zero-coupon MTNs — price (Σ PV)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "price",
      "working_steps": [
        "Σ of each cash flow discounted at the YTM"
      ],
      "expected_value": 264893419.77100623
    },
    {
      "unit": "IDRm·yr",
      "label": "Zero-coupon MTNs — Σ t·PV",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "weighted_sum",
      "working_steps": [
        "Σ (year × discounted cash flow)"
      ],
      "expected_value": 1854253938.3970437
    },
    {
      "unit": "years",
      "label": "Zero-coupon MTNs — Macaulay duration",
      "recompute": "macaulay_ratio",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "weighted_sum",
        "price"
      ],
      "component_id": "macaulay",
      "working_steps": [
        "= Σ t·PV ÷ price"
      ],
      "expected_value": 7.000000000000001
    },
    {
      "unit": "years",
      "label": "Zero-coupon MTNs — modified duration",
      "recompute": "modified_from_macaulay",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "macaulay"
      ],
      "component_id": "modified",
      "working_steps": [
        "= Macaulay ÷ (1 + y)"
      ],
      "expected_value": 6.392694063926942
    },
    {
      "unit": "IDRm",
      "label": "Fixed-rate coupon bond — price (Σ PV)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ref_price",
      "working_steps": [
        "Σ of each cash flow discounted at the YTM"
      ],
      "expected_value": 462877908.3848958
    },
    {
      "unit": "IDRm·yr",
      "label": "Fixed-rate coupon bond — Σ t·PV",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "ref_weighted_sum",
      "working_steps": [
        "Σ (year × discounted cash flow)"
      ],
      "expected_value": 2574808674.822787
    },
    {
      "unit": "years",
      "label": "Fixed-rate coupon bond — Macaulay duration",
      "recompute": "macaulay_ratio",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "ref_weighted_sum",
        "ref_price"
      ],
      "component_id": "ref_macaulay",
      "working_steps": [
        "= Σ t·PV ÷ price"
      ],
      "expected_value": 5.562608688340689
    }
  ]
}
```

---

## Drill 4 — limitations (B3f + B3g convexity; B3g dual coverage journalled)  ·  `0ae79f34-b6ba-46ad-9283-eb5e9d6f3f2e`
- LO B3f · mode quantitative · command_verb "assess" · marks_guide 15

### question

Assess Rheinwerk Automotive AG's exposure to interest-rate risk on its fixed-rate Eurobond by calculating the Macaulay duration and modified duration of the bond, and estimating the impact on its market price of a 300 basis-point upward shift in yields. Evaluate the limitations of this estimate when advising the board on the reliability of the modified-duration measure for a shift of this magnitude.

### context_text

Rheinwerk Automotive AG is a mid-sized German automotive manufacturer headquartered in Stuttgart, specialising in precision drivetrain components for both internal-combustion and hybrid-electric vehicles. The group has recently completed a EUR 400 million fixed-rate Eurobond issuance to finance a new battery-module assembly plant in Saxony. The Chief Financial Officer has requested an independent assessment of the group's interest-rate exposure on this instrument ahead of the next Supervisory Board meeting, in the context of a potentially rising European Central Bank policy-rate environment.

The treasury team has modelled a severe but plausible scenario in which the flat yield on the bond rises by 300 basis points (a parallel shift of the yield curve). The board wishes to understand how much market value could be lost on the instrument under this scenario, and how reliable that estimate is.

**Challengeable texture:** The yield used in this assessment is a single market snapshot at the date of issuance; it does not capture any subsequent ECB policy decisions or changes in Rheinwerk's own credit spread. Furthermore, the 300 bp shift is applied as a uniform parallel movement across all maturities — an assumption that is unlikely to hold precisely in practice, where short- and long-dated yields typically move by different magnitudes.

Raw inputs — Rheinwerk Automotive AG Fixed-Rate Eurobond:
  • Face value (EUR per bond unit):  1,000
  • Annual coupon rate:              6.5% (stated flat)
  • Years to maturity:               8
  • Flat yield to maturity (YTM):    5.8% (single snapshot)
  • Assumed parallel yield shift:    +300 bp

### model_answer

**Bond duration — interest-rate exposure**

**Assumptions:** each bond is priced at its stated flat yield to maturity; coupons are annual; the modified duration is Macaulay ÷ (1 + y). Duration measures interest-rate exposure — the modified duration is the approximate % change in price for a 1% (100 bp) change in yield: ΔP/P ≈ −modified × Δy.

**Step 1 — Price, Σ t·PV and duration**

| Year | Cash flow | DF @ 5.80% | PV | t·PV |
|------|------|------|------|------|
| 1 | EUR 65.0m | 0.945 | EUR 61.4m | EUR 61.4m |
| 2 | EUR 65.0m | 0.893 | EUR 58.1m | EUR 116.1m |
| 3 | EUR 65.0m | 0.844 | EUR 54.9m | EUR 164.7m |
| 4 | EUR 65.0m | 0.798 | EUR 51.9m | EUR 207.5m |
| 5 | EUR 65.0m | 0.754 | EUR 49.0m | EUR 245.2m |
| 6 | EUR 65.0m | 0.713 | EUR 46.3m | EUR 278.1m |
| 7 | EUR 65.0m | 0.674 | EUR 43.8m | EUR 306.6m |
| 8 | EUR 1065.0m | 0.637 | EUR 678.4m | EUR 5426.9m |
| **Totals** | | | **EUR 1043.8m** | **EUR 6806.5m** |

**Macaulay duration = Σ t·PV ÷ price = EUR 6806.5m ÷ EUR 1043.8m = 6.521 years.**

**Modified duration = Macaulay ÷ (1 + 5.80%) = 6.163 years.**

**Step 2 — Interest-rate sensitivity**

For a +3.00% (300 bp) shift in the yield, the first-order estimate is ΔP/P ≈ −modified × Δy = **-18.49%** (a fall of about EUR 193.0m on this EUR 1043.8m position).

**Step 3 — Limitations: why this is only an approximation (convexity)**

Modified duration is a **linear (first-order)** estimate: it assumes price moves in a straight line with yield. Because the true price–yield relationship is **curved (convex)**, over a shift this large the linear estimate **overstates the price fall when yields rise and understates the gain when yields fall** — the second-order convexity term corrects for that curvature. Duration alone is reliable only for small, parallel yield moves; a full assessment adds convexity (and, for non-parallel shifts, the term structure).

**Step 4 — Evaluation / advice to the board**

The board should treat the modified-duration price estimate as a first-order linear approximation of a relationship that is, in reality, curved. The price–yield relationship for a conventional fixed-rate bond is convex: as yields rise, price falls at a decreasing rate, and as yields fall, price rises at an increasing rate. Modified duration captures only the slope of a tangent to that curve at the current yield level — it assumes the rate of price change is constant regardless of how far yields move. For a modest shift of perhaps 25–50 basis points this linearisation introduces only a small error; but Rheinwerk's treasury team has modelled a 300 basis-point move — a shift large enough to make the curvature of the price–yield relationship material. At that distance from the current yield, the true bond price will be higher than the duration estimate suggests: the linear approximation overstates the price decline (or understates the price recovery if yields fall). The board should therefore understand that the figure produced by the modified-duration calculation represents a worst-case overstatement of loss, not a precise mark-to-market — a more complete analysis would incorporate convexity (the second derivative of the price–yield relationship) to correct for this bias. Additionally, the single-snapshot YTM used here embeds Rheinwerk's credit spread at issuance; if the ECB tightening cycle simultaneously widens the group's credit spread — a plausible outcome given the capital-intensive nature of the Saxony plant investment — the true market-value loss could exceed even the (already overstated) linear estimate.

*Reconciliation: price EUR 1043.8m, Σ t·PV EUR 6806.5m → Macaulay 6.521y → modified 6.163y → ΔP/P -18.49% ✓*

### hint

Check whether your answer stops at the duration numbers — the drill asks you to *evaluate the limitations* for the board, which means explaining why modified duration's linear approximation may mislead specifically at a shift of this magnitude, not merely listing that convexity exists.

### full_reveal

The dominant misconception here is ABANDONED-AFTER-CALC: candidates produce Macaulay duration, convert to modified duration, apply the price-sensitivity formula, and then hand the board a percentage figure with nothing more — treating the calculation as the finish line rather than the foundation. This is wrong because the command verb is "assess" and the drill explicitly asks for evaluation of the limitation, meaning the calculation is only level-1 work; the marks for level-2 and level-3 thinking sit in explaining *why* the linear approximation breaks down at a shift of this size, and what that means for how much the board should trust the figure. The correct mental model is that modified duration is the slope of a tangent to the price–yield curve at the current yield — it tells you nothing about the curvature of that relationship, and the further yields move from the starting point, the more the true (curved) price path diverges from that tangent line; for a shift as large as the one modelled here, the direction and magnitude of that divergence is material and needs to be named. If your duration numbers contain an arithmetic slip, carry them forward consistently into the sensitivity calculation — where the method is sound, those downstream marks can still score, though OFR credit is conditional on using your own figure correctly at each subsequent step. At the boardroom bar, the question the chair will ask is not "what is the modified duration?" but "how much should we rely on that loss estimate, and what does it leave out?" — and that answer lives in the evaluation, not the workings.

### answer_schema (persisted jsonb)

```json
{
  "params": {
    "ytm": 0.058,
    "freq": 1,
    "maturity": 8,
    "face_value": 1000,
    "coupon_rate": 0.065,
    "yield_shift": 0.03
  },
  "components": [
    {
      "unit": "EURm",
      "label": "The 8-year Eurobond — price (Σ PV)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "price",
      "working_steps": [
        "Σ of each cash flow discounted at the YTM"
      ],
      "expected_value": 1043.8147302119487
    },
    {
      "unit": "EURm·yr",
      "label": "The 8-year Eurobond — Σ t·PV",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "weighted_sum",
      "working_steps": [
        "Σ (year × discounted cash flow)"
      ],
      "expected_value": 6806.525222670306
    },
    {
      "unit": "years",
      "label": "The 8-year Eurobond — Macaulay duration",
      "recompute": "macaulay_ratio",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "weighted_sum",
        "price"
      ],
      "component_id": "macaulay",
      "working_steps": [
        "= Σ t·PV ÷ price"
      ],
      "expected_value": 6.52081736889096
    },
    {
      "unit": "years",
      "label": "The 8-year Eurobond — modified duration",
      "recompute": "modified_from_macaulay",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "macaulay"
      ],
      "component_id": "modified",
      "working_steps": [
        "= Macaulay ÷ (1 + y)"
      ],
      "expected_value": 6.16334344885724
    },
    {
      "unit": "%",
      "label": "The 8-year Eurobond — estimated price change for the yield shift",
      "recompute": "price_sensitivity_linear",
      "tolerance": {
        "kind": "absolute",
        "value": 0.1
      },
      "depends_on": [
        "modified"
      ],
      "component_id": "price_sensitivity",
      "working_steps": [
        "ΔP/P ≈ −modified × Δy"
      ],
      "expected_value": -18.490030346571718
    }
  ]
}
```
