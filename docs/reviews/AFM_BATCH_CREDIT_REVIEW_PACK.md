# AFM credit-risk batch — blind adversarial review pack

**Calculator #7: credit risk (`lib/acca/credit.ts`). 4 drills, `status=candidate`, `published=false`, `paper_code=AFM`. CURRENT STATE — regenerated in full after every fix round (round-1 adjudication applied 2026-07-15).**

Doctrine: code owns EVERY figure AND the over/under-valued verdict; the model authored PROSE only — never a rate, a spread, a price, a cost of debt, or an inequality. ALL kinds are **issuer-framed** (the entity ISSUES the debt): a wider spread / downgrade is higher FUNDING and refinancing cost, **never a "loss"** (loss language is for investors). Pure rates/bond family — **P6 loss-relief is a structural no-op**, no issue-cost analogue.

**The four kinds** (three B3h sub-points + B4a; the three B3h kinds share the single `lo_code='B3h'`, sub-point coverage journalled — CAPM/duration dual-cover precedent, no migration):
- **kd_term_structure** (B3h(iii)) — cost of debt built from the government spot curve + credit spread at every maturity, then the single flat Kd by interpolation. FIRST-OF-FAMILY.
- **spread_estimation** (B3h(ii)) — the credit spread DERIVED as the corporate redemption yield (interpolated to the market price, = the effective cost of debt) less the matched-maturity government yield; code also owns the **spread-vs-rated-band comparison** (tighter/wider than the issuer's rating).
- **downgrade_impact** (B3h(i), MIXED) — a downgrade widens the spread → higher Kd → higher REFINANCING interest (the existing fixed coupon is INSULATED); ΔWACC only when the scenario supplies weights + Ke, else directional. The marks are in the agencies'-role evaluation.
- **debt_valuation** (B4a) — fair value = each cash flow discounted at its own maturity's (govt spot + spread); code owns the over/under-valued verdict vs the quoted market price.

**Boundary with duration (#6):** duration uses a single FLAT stated YTM per bond. Credit (#7) is the CURVE world — the non-flat government spot curve, each cash flow at its own maturity's spot + spread. Credit does not compute durations.

**Interpolation bracketing (FIX 3):** every interpolation chain is guarded — the target price MUST lie strictly inside the trial-price bracket (price(r_lo) > target > price(r_hi)); the calculator throws otherwise, so a batch cannot ship an unbracketed (extrapolated) chain.

**Tolerances:** interpolated/root-found rates (corp_yield, implied_kd) abs ±0.2 pp (IRR precedent); additive/lookup rates abs ±0.05 pp; prices/fair values rel ±0.5%; the fair-value-vs-market verdict is strict, code-owned, no tolerance. **All 9 gates pass** (schema self-consistency + tolerance + OFR-wiring; answer↔schema figure integrity at 1/2/3 dp; **distinct-factor** seeded-OFR carry-through; P4 jurisdiction + frozen-market-facts; P5 completeness incl. credit demands; P6 loss-relief [no-op]; **P8 rating-symbol realism**; **GATE 9 spread↔rating monotonicity**).

## ⛔ CLOSED RULINGS — do NOT re-raise (spend hostility on open questions, not settled ones)
- **OFR wording** — "the error is charged once, at its source" is deliberate HOUSE wording tied to the reviewer override log. Adjudicated closed; do not propose softening.
- **Issuer perspective (not "loss")** — every kind frames a wider spread / rate rise as the issuer's FUNDING / refinancing cost, covenant/disclosure optics, and future funding cost — NOT a mark-to-market "loss". Ruled house framing (duration issuer-pattern), not an error.
- **Spread as input vs derived** — the credit spread is a scenario INPUT looked up from the rating→spread table for kinds 1/3/4; DERIVED (corp yield − govt yield) ONLY in kind 2. No proprietary rating model. Deliberate.
- **Spot rates given; no forward-rate bootstrapping** — the government spot (zero-coupon) curve is supplied directly; bootstrapping forwards is out of scope by design (a future kind if ever demanded).
- **Single-tag `lo_code`** — the three B3h sub-points share `lo_code='B3h'`; coverage journalled (no migration). B4a is its own tag.
- **downgrade ΔWACC conditional; existing coupon insulated** — the ΔWACC figure appears ONLY when weights+Ke+tax are supplied (else directional); the downgrade's Δ is a REFINANCING cost — the existing FIXED coupon is unchanged by a rating move (fixed-rate insulation). Both are ruled guards, not omissions.

**Review method:** fresh model, no project context, AFM syllabus PDF attached; FULL hostility on **Drill 1 (kd_term_structure, first-of-family)**, spot-check siblings WITH full recomputation of every figure. Hunt for semantic errors a deterministic gate cannot catch: a spot rate applied to the wrong maturity, the spread added in the wrong units (bp vs pp), the over/under-valued verdict inverted, issuer framing slipping into investor "loss" language, a rating symbol or spread ordering that is unrealistic, scenario-fact drift.

---

---

## Drill 1 — kd_term_structure (B3h(iii)) — FIRST-OF-FAMILY  ·  `803d916a-0a6b-42b0-908c-e37e18ff21ea`
- LO B3h · mode quantitative · command_verb "assess" · L3 · marks_guide 15

### question

Assess Hokusei Freight Railway's cost of debt on its Series 7 fixed-rate bond by: (i) pricing the bond using the term structure of government spot rates and the rated credit spread at the valuation date; (ii) estimating the single flat cost of debt that reprices the bond via linear interpolation between the two trial yields; and (iii) advising the board on what the derived cost of debt implies for Hokusei's refinancing risk and future funding strategy, having regard to the point-in-time nature of the credit rating and the dated spread table.

### context_text

SCENARIO — HOKUSEI FREIGHT RAILWAY CO., LTD. (北西貨物鉄道株式会社)

Hokusei Freight Railway Co., Ltd. ("Hokusei") is a Sapporo-based rail freight operator running bulk-commodity trains (coal, timber, agricultural produce) across Hokkaido. The company is majority-owned by a consortium of regional prefectural governments and two large trading houses, and its balance sheet carries a mix of government-subsidised project loans and publicly placed corporate bonds. Hokusei's treasury team is preparing a medium-term financing review to be presented to the board ahead of the company's next bond maturity.

The focus of the current review is the Series 7 fixed-rate bond, issued three years ago and now with four years remaining to maturity. The bond pays an annual coupon and redeems at par. Hokusei holds a rating of A- on the S&P/Fitch scale, reflecting its stable regional monopoly franchise, predictable government freight volumes, and moderate leverage — but the rating was last affirmed fourteen months ago and has not been reviewed since the company announced a large capital expenditure programme for electrification and track renewal across the Hokkaido corridor.

CHALLENGEABLE TEXTURE: The rating of A- is a point-in-time view assigned fourteen months ago; it does not reflect the announced capex programme or any change in leverage since affirmation. Equally, the credit spread table below represents a dated snapshot sourced from the secondary market at the valuation date and may not capture rating-migration risk or the widening that could follow a leverage review. The government spot curve is likewise a dated snapshot as at the valuation date — JPY government yields are structurally low relative to other major economies, consistent with the Bank of Japan's long-standing yield-curve-management policy — and should not be read as a forward rate forecast.

ALL RAW INPUTS (valuation date assumptions):

Bond — Hokusei Series 7:
  Face value:       JPY 20,000 million
  Annual coupon:    1.85% of face value (paid annually, end of each year)
  Maturity:         4 years (years 1 through 4)
  Redemption:       at par

Government spot curve (JPY, % per annum, dated snapshot at valuation date):
  Year 1:  0.25%
  Year 2:  0.42%
  Year 3:  0.61%
  Year 4:  0.78%

Credit spread table (S&P/Fitch scale, basis points, dated secondary-market snapshot):
  AA-  :  55 bps
  A+   :  75 bps
  A    :  95 bps
  A-   : 120 bps
  BBB+ : 155 bps
  BBB  : 195 bps

Hokusei's rating: A- (spread: 120 bps)

Trial flat yields for interpolation:
  r_lo: 1.75%
  r_hi: 2.20%

### model_answer

**Credit risk — rating, spread and the cost of debt**

**Assumptions:** the cost of debt is built from the government spot (zero-coupon) yield curve, adding the issuer's credit spread at every maturity, then discounting each cash flow at its own maturity's corporate spot rate. The single cost of debt is the flat yield that reprices the bond to that curve-based price (found by interpolation).

**Step 1 — Price on the corporate spot curve (govt spot + 120bp spread)**

| Year | Cash flow | Govt spot | + spread | Corp spot | DF | PV |
|------|------|------|------|------|------|------|
| 1 | JPY 370.0m | 0.25% | 1.20% | 1.45% | 0.9857 | JPY 364.7m |
| 2 | JPY 370.0m | 0.42% | 1.20% | 1.62% | 0.9684 | JPY 358.3m |
| 3 | JPY 370.0m | 0.61% | 1.20% | 1.81% | 0.9476 | JPY 350.6m |
| 4 | JPY 20370.0m | 0.78% | 1.20% | 1.98% | 0.9246 | JPY 18833.5m |
| **Total** | | | | | | **JPY 19907.1m** |

Discounting every cash flow at its own maturity's corporate spot rate gives a bond price of **JPY 19907.1m**.

**Step 2 — Cost of debt (single flat-yield equivalent, by interpolation)**

A flat yield of 1.75% prices the bond at JPY 20076.6m and 2.20% at JPY 19734.7m. Interpolating for the flat yield that reproduces the curve price JPY 19907.1m gives a cost of debt of **1.97%** — the single Kd to carry into the WACC.

**Step 3 — Evaluation / advice to the board**

Hokusei's Series 7 bond was placed when the company's leverage profile was materially different from its post-announcement position, and the board should treat the A- rating as a ceiling rather than a floor given the unreviewed capex commitment across the Hokkaido corridor. The structurally low JPY government spot curve amplifies the relative weight of the credit spread in the all-in funding cost, meaning even a one-notch migration to BBB+ — as reflected in the dated spread table — would represent a proportionally significant step-up in Hokusei's refinancing cost on the sizable Series 7 notional. The board should not assume that the spread table as dated is conservative; secondary-market spreads for infrastructure-adjacent rail credits in Japan have been sensitive to fiscal policy signals, and a leverage-driven rating review could coincide with a wider spread environment. The treasury team is therefore advised to accelerate pre-funding or to engage rating agency analysts ahead of the formal capex disclosure, so as to anchor market expectations before any downward migration is signalled. Waiting until the next formal affirmation cycle to act on refinancing strategy would expose Hokusei to simultaneous rating-migration and spread-widening risk on a material outstanding notional.

*Reconciliation: curve price JPY 19907.1m → interpolated flat Kd 1.97%. ✓*

### hint

Check whether you discounted each cash flow at its own maturity's corporate spot rate (government spot plus the rated credit spread at that tenor) before using the resulting curve price as the target for your interpolation — applying a single flat rate across all maturities at this stage conflates the term-structure pricing with the flat-yield search.

### full_reveal

The dominant misconception here is ABANDONED-AFTER-CALC: candidates produce a bond price and an interpolated yield, then hand the board a number rather than advice — the calculation becomes the destination rather than the launchpad. That is the wrong mental model because the examiner's credit for Step 3 is not a reward for arithmetic; it tests whether you can translate a point-in-time cost-of-debt estimate into a forward-looking funding decision, which requires you to challenge the snapshot assumptions explicitly. A second, subtler misconception is UNDEVELOPED-ASSUMPTION: many candidates note that credit ratings are "point-in-time" without developing what that means here — specifically, that the spread table as dated may not reflect the leverage position post-capex announcement, and that a rating migration could coincide with a wider spread environment on a material outstanding notional, compounding refinancing risk in a way a single Kd figure cannot capture. The correct mental model is to treat the derived cost of debt as a floor estimate under the stated assumptions, then advise the board on what would have to hold for that estimate to remain valid — and what pre-emptive action is warranted if those conditions look fragile. If your curve price or interpolated yield differs from the model answer, carry your own figure consistently into the Step 3 discussion; where your evaluation method is sound — challenging the rating, the dated spread, and the timing of refinancing — those marks remain accessible and the numerical error is charged once, at its source.

### answer_schema

```json
{
  "params": {
    "r_hi": 2.2,
    "r_lo": 1.75,
    "govt_yield": 0,
    "kind_marker": 0,
    "market_price": 0,
    "benchmark_rate": 0,
    "debt_principal": 0,
    "spread_used_bps": 120
  },
  "components": [
    {
      "unit": "JPYm",
      "label": "Bond price on the corporate spot curve (govt spot + spread)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "price_curve",
      "working_steps": [
        "Σ cash flow × DF at (govt spot + spread) for each maturity"
      ],
      "expected_value": 19907.122112314955
    },
    {
      "unit": "JPYm",
      "label": "Bond PV at the low trial flat yield (1.75%)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "price_lo",
      "working_steps": [
        "Σ cash flow × DF at flat 1.75%"
      ],
      "expected_value": 20076.61885079116
    },
    {
      "unit": "JPYm",
      "label": "Bond PV at the high trial flat yield (2.20%)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "price_hi",
      "working_steps": [
        "Σ cash flow × DF at flat 2.20%"
      ],
      "expected_value": 19734.747598695434
    },
    {
      "unit": "%",
      "label": "Cost of debt (single flat yield equivalent to the curve + spread)",
      "recompute": "kd_interpolation",
      "tolerance": {
        "kind": "absolute",
        "value": 0.2
      },
      "depends_on": [
        "price_curve",
        "price_lo",
        "price_hi"
      ],
      "component_id": "implied_kd",
      "working_steps": [
        "interpolate the flat yield that reprices the bond to 19907.1"
      ],
      "expected_value": 1.9731060138772225
    }
  ]
}
```

---

## Drill 2 — spread_estimation (B3h(ii))  ·  `94fc2262-e759-4373-9f3d-f0c0d25f1721`
- LO B3h · mode quantitative · command_verb "assess" · L3 · marks_guide 15

### question

Assess Meridian Gateway's exposure to credit risk by: (i) estimating the credit spread implied by the market price of the SGD 200 million 4.10% senior notes due 2030 using linear interpolation between the two trial yields provided; (ii) deriving the issuer's effective cost of debt at the valuation date; and (iii) advising the board on the refinancing-cost implications of the estimated spread relative to the rated peer benchmarks in the dated spread table.

### context_text

SCENARIO — MERIDIAN GATEWAY TERMINALS PTE. LTD. (SINGAPORE)

Meridian Gateway Terminals Pte. Ltd. ("Meridian" or "the Company") is a Singapore-incorporated port and container-terminal operator with deep-water berths at Tuas and Pasir Panjang. The Company handles approximately 8.4 million TEUs annually and derives the majority of its revenue from long-term throughput agreements denominated in SGD and USD. Meridian's capital structure is predominantly fixed-rate SGD debt issued into the Singapore dollar bond market.

SITUATION
In preparation for a planned SGD 350 million green-bond refinancing in the next fiscal year, the board has asked senior management to assess the Company's current cost of fixed-rate debt and the credit spread implied by the secondary-market trading of its outstanding five-year senior unsecured notes (the "2030 Notes"). The treasury team has sourced a secondary-market price and the Singapore Government Securities ("SGS") spot curve as at the valuation date.

BOND DETAILS — 2030 NOTES
  Face value:     SGD 200 million
  Coupon rate:    4.10% per annum (annual coupons, paid in arrears)
  Maturity:       5 years (from valuation date)

SECONDARY-MARKET PRICE (at the valuation date)
  Quoted price:   SGD 198.35 million (i.e. expressed as a present-value amount on SGD 200m face)

SINGAPORE GOVERNMENT SECURITIES SPOT CURVE (at the valuation date — dated snapshot, not a live feed)
  Year 1:  3.02%
  Year 2:  3.18%
  Year 3:  3.29%
  Year 4:  3.38%
  Year 5:  3.44%

MERIDIAN'S CREDIT RATING (point-in-time view, sourced from S&P as at the valuation date)
  Rating:  BBB+

RATED-PEER CREDIT SPREAD TABLE (S&P scale — dated snapshot; spreads reflect SGD investment-grade issuances observed at the valuation date)
  AAA:    28 bps
  AA+:    35 bps
  AA:     42 bps
  AA-:    52 bps
  A+:     65 bps
  A:      80 bps
  A-:    100 bps
  BBB+:  128 bps
  BBB:   155 bps
  BBB-:  185 bps

TRIAL YIELDS FOR INTERPOLATION
  r_lo:  4.10%   (produces a price above SGD 198.35 million)
  r_hi:  4.50%   (produces a price below SGD 198.35 million)

CHALLENGEABLE TEXTURES
1. RATING IS POINT-IN-TIME: Meridian's BBB+ rating was affirmed at the most recent annual review. Any deterioration in throughput volumes or a significant increase in leverage from the planned green-bond issuance could prompt a review; the spread table must be treated as a dated peer benchmark, not a guarantee of achievable pricing on the forthcoming refinancing.
2. SGS SPOT CURVE IS A DATED SNAPSHOT: The five-point SGS curve was sourced at the valuation date. SGD rates are sensitive to MAS policy signalling and global USD rate moves; the curve may shift materially before the planned refinancing, altering the absolute cost of debt even if the credit spread remains stable.

RAW INPUTS SUMMARY
  Bond face value:           200   (SGD millions)
  Coupon rate:               4.10  (%)
  Maturity:                  5     (years)
  Market price:              198.35 (SGD millions)
  Govt spot Year 1:          3.02  (%)
  Govt spot Year 2:          3.18  (%)
  Govt spot Year 3:          3.29  (%)
  Govt spot Year 4:          3.38  (%)
  Govt spot Year 5:          3.44  (%)
  Issuer rating:             BBB+
  Spread at BBB+:            128   (bps)
  Spread at BBB:             155   (bps)
  r_lo:                      4.10  (%)
  r_hi:                      4.50  (%)


### model_answer

**Credit risk — rating, spread and the cost of debt**

**Assumptions:** the credit spread is the corporate bond's redemption yield less the yield on a government bond of the same maturity — the extra return the market demands for the issuer's default and liquidity risk. The redemption yield is found by interpolating between two trial yields.

**Step 1 — The bond's cash flows and trial prices**

| Year | Cash flow | DF @ 4.10% | PV | DF @ 4.50% | PV |
|------|------|------|------|------|------|
| 1 | SGD 8.2m | 0.9606 | SGD 7.9m | 0.9569 | SGD 7.8m |
| 2 | SGD 8.2m | 0.9228 | SGD 7.6m | 0.9157 | SGD 7.5m |
| 3 | SGD 8.2m | 0.8864 | SGD 7.3m | 0.8763 | SGD 7.2m |
| 4 | SGD 8.2m | 0.8515 | SGD 7.0m | 0.8386 | SGD 6.9m |
| 5 | SGD 208.2m | 0.8180 | SGD 170.3m | 0.8025 | SGD 167.1m |
| **PV** | | | **SGD 200.0m** | | **SGD 196.5m** |

**Step 2 — Redemption yield (interpolation to the market price SGD 198.3m)**

PV is SGD 200.0m at 4.10% and SGD 196.5m at 4.50%. Interpolating for the yield that prices the bond at SGD 198.3m gives a redemption yield of **4.29%** — the issuer's effective (pre-tax) cost of debt at the valuation date.

**Step 3 — Credit spread (code-owned)**

Credit spread = corporate yield 4.29% − government yield 3.44% = **84.8bp** (0.85%).

**Step 4 — Derived spread vs the rated peer benchmark (code-owned)**

The derived spread of 84.8bp is **tighter** than the BBB+ rated benchmark of 128bp and sits between the A and A- points in the dated spread table. On this snapshot, the market is pricing Meridian **materially inside its formal BBB+ rating level**.

**Step 5 — Evaluation / advice to the board**

The estimated spread tells the board something the rating alone does not: the secondary market is pricing Meridian's credit appreciably tighter than its BBB+ rating band, and closer to the single-A cohort, which admits two readings the board must weigh rather than choose between prematurely. The favourable reading is that strong throughput coverage and the long-term USD/SGD contract base have earned Meridian a funding cost inside its formal rating band — a genuine window to bring forward the planned green-bond refinancing and lock terms while the market's implied spread is benign. The cautious reading is that the spread table is a dated snapshot and may simply lag a market that has since repriced, in which case the tight secondary level overstates what a primary new issue would actually clear, especially once the additional leverage from the green bond is absorbed. On balance the board should treat the tight secondary spread as an opportunity to act on rather than a level to rely on: firm the green-bond timetable to exploit the pricing now, but stress-test the achievable new-issue spread against a reversion toward the rated band before committing size.

*Reconciliation: PV SGD 200.0m@4.10% / SGD 196.5m@4.50% → yield 4.29% → spread 84.8bp. ✓*

### hint

Check whether your interpolation is anchored to the market price of the bond — not to par — and then ask yourself what the spread is actually telling the board about the cost of the planned green-bond refinancing relative to the rated peer benchmarks in the scenario.

### full_reveal

The classic misconception here is ABANDONED-AFTER-CALC: candidates complete the interpolation, state the redemption yield and spread, and then stop — leaving the highest-value marks on the table because they treat the calculation as the finish line rather than the launchpad. The spread is not the answer; it is the evidence from which boardroom advice must be constructed. If your interpolation produced a different yield, carry it forward consistently — where your method for deriving the spread and framing the refinancing implications is sound, those marks remain accessible, and the arithmetic error is charged once at its source, not compounded through every downstream sentence. The mental-model correction is this: credit spread analysis in an AFM context is a diagnostic tool, not an end in itself — the examiner is testing whether you can translate a market-implied number into a specific, scenario-grounded recommendation about leverage discipline, rating-migration risk, and the interaction between the risk-free SGD curve and the issuer's own credit quality at the valuation date. At the boardroom bar, the interpolated spread is the floor of a conversation, not the ceiling: your job is to tell the board what the spread means for the SGD 350 million green-bond structure, what could widen it before launch, and what the rated peer table reveals about the cost of a one-notch downgrade — that is the advice a senior adviser is paid to give.

### answer_schema

```json
{
  "params": {
    "r_hi": 4.5,
    "r_lo": 4.1,
    "govt_yield": 3.44,
    "kind_marker": 0,
    "market_price": 198.35,
    "benchmark_rate": 0,
    "debt_principal": 0,
    "spread_used_bps": 0
  },
  "components": [
    {
      "unit": "SGDm",
      "label": "Bond PV at the low trial yield (4.10%)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "price_lo",
      "working_steps": [
        "Σ cash flow × DF at 4.10%"
      ],
      "expected_value": 200.00000000000006
    },
    {
      "unit": "SGDm",
      "label": "Bond PV at the high trial yield (4.50%)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "price_hi",
      "working_steps": [
        "Σ cash flow × DF at 4.50%"
      ],
      "expected_value": 196.48801860445664
    },
    {
      "unit": "%",
      "label": "Corporate redemption yield (interpolated to the market price)",
      "recompute": "yield_interpolation",
      "tolerance": {
        "kind": "absolute",
        "value": 0.2
      },
      "depends_on": [
        "price_lo",
        "price_hi"
      ],
      "component_id": "corp_yield",
      "working_steps": [
        "interpolate between 4.10% and 4.50% for the yield that prices the bond at 198.3"
      ],
      "expected_value": 4.287928102591188
    },
    {
      "unit": "bp",
      "label": "Credit spread over the matched-maturity government yield",
      "recompute": "spread_from_yields",
      "tolerance": {
        "kind": "absolute",
        "value": 20
      },
      "depends_on": [
        "corp_yield"
      ],
      "component_id": "credit_spread",
      "working_steps": [
        "= corporate yield − government yield 3.44%, ×100 to basis points"
      ],
      "expected_value": 84.7928102591188
    }
  ]
}
```

---

## Drill 3 — downgrade_impact (B3h(i), mixed)  ·  `879a3eea-244e-4ef3-902b-b68b6154fff5`
- LO B3h · mode quantitative · command_verb "assess" · L3 · marks_guide 15

### question

Assess the likely increase in Cementos Andino's annual interest cost and the directional impact on its WACC following the one-notch downgrade, and advise the board on the issuer-side exposures this creates. Your answer should also explain how the rating agency's assessment of leverage, liquidity and operating outlook affects the issuer's market access and refinancing spread.

### context_text

SCENARIO — CEMENTOS ANDINO S.A. (COLOMBIA)

Cementos Andino S.A. is a mid-sized Colombian cement and building-materials producer headquartered in Bogotá. The company finances a significant portion of its capital base through a COP-denominated senior unsecured fixed-rate bond issued in the local capital market. Colombia's high-rate environment means government benchmark yields sit in the deep double-digit range, making credit-spread management especially consequential for Cementos Andino's funding cost.

In its most recent annual credit review, Fitch Ratings downgraded Cementos Andino one notch, from BBB to BBB−, citing rising leverage from a greenfield clinker-capacity expansion and softer domestic construction activity. The board has asked for an assessment of the cost and financing implications before the company approaches the market to refinance the bond at maturity.

CHALLENGEABLE TEXTURE: The Fitch rating is a point-in-time assessment based on the most recently filed annual accounts; it does not capture intra-year shifts in leverage or liquidity. Equally, the credit-spread table below is a dated snapshot of secondary-market pricing and may not reflect the spreads Cementos Andino would actually achieve on a new issue at the time of refinancing.

RAW INPUTS (all figures as at the valuation date):

Government benchmark yield (10-year COP TES, risk-free proxy):
  11.40% per annum

Fitch credit-spread table (dated snapshot, monotonic — wider spread for weaker rating):
  BBB+  →  210 bp
  BBB   →  265 bp
  BBB−  →  340 bp
  BB+   →  445 bp

Debt instrument:
  Cementos Andino senior unsecured bond
  Face value (principal): COP 800,000 million
  Coupon rate: 13.80% per annum (fixed)
  Maturity: 10 years (whole years remaining)

Capital-structure data (for WACC impact):
  Equity weight:  0.45
  Debt weight:    0.55
  Cost of equity (Ke): 17.20%
  Corporate tax rate:  35% (0.35)

### model_answer

**Credit risk — rating, spread and the cost of debt**

**Assumptions:** the cost of debt is the risk-free benchmark for the maturity plus the credit spread the market attaches to the issuer's rating; a downgrade widens that spread. Figures are the issuer's own funding cost — a wider spread is higher refinancing cost, not a mark-to-market loss.

**Step 1 — Cost of debt at each rating**

| Rating | Credit spread | Benchmark | Cost of debt (Kd) |
|------|------|------|------|
| BBB (current) | 265bp | 11.40% | **14.05%** |
| BBB- (downgraded) | 340bp | 11.40% | **14.80%** |

The downgrade widens the spread by **75bp**, lifting the market cost of debt from 14.05% to **14.80%**.

**Step 2 — Effect on the cost of REFINANCING (not the existing coupon)**

The existing bond's coupon is **fixed at 13.80%** (COP 110400.0m a year) and is **unchanged by the downgrade** — a fixed-rate liability is insulated from a rating move until it matures. What the downgrade changes is the cost of **new** debt: refinancing the COP 800000.0m principal at the current rating would cost COP 112400.0m a year, but after the downgrade **COP 118400.0m** — an increase of **COP 6000.0m a year on refinancing**.

**Step 3 — Effect on WACC**

Feeding the higher after-tax cost of debt through the given capital-structure weights raises the WACC by **0.27%** (from 12.76% to 13.03%), which lifts the hurdle every project must clear.

**Step 4 — Evaluation / advice to the board**

The rating agency does not set Cementos Andino's coupon; it supplies the independent default assessment from which investors price the spread. Fitch's stated drivers — the rising leverage of the greenfield clinker expansion, tighter liquidity headroom, and a softer domestic construction outlook — are exactly the leverage, liquidity and operating-outlook judgements that move the applicable spread, so the downgrade is a market-access signal as much as a spread input: it narrows the pool of investors and mandates able to hold the bond at the same time as it widens the price they require, and both effects bear directly on the refinancing.

The one-notch downgrade to BBB− reflects Fitch's concern about the leverage trajectory created by the greenfield clinker expansion — a project the board has already committed to — meaning the rating pressure is structural rather than transient and is unlikely to reverse quickly. Cementos Andino's refinancing exposure is heightened precisely because Colombia's high-rate environment amplifies even a modest spread widening into a material absolute funding cost; the board should treat the dated spread table as a floor, not a ceiling, given that market conditions may have tightened since the snapshot was taken. Beyond the refinancing-cost effect, a BBB− rating sits one notch above speculative grade, so any further deterioration in leverage during the expansion would risk a BB+ classification that pushes the bond outside many domestic institutional mandates, severely constraining the investor base at refinancing. The board should also examine whether any existing facility documentation contains ratings-based step-up clauses or covenant triggers that could accelerate the cost impact before the bond even matures. Given the combination of a committed capital programme, a weakened credit standing, and a high base-rate environment, the board is advised to explore pre-funding or liability-management options rather than waiting passively for the bond's maturity date.

*Reconciliation: base Kd 14.05% → new Kd 14.80% (+75bp) → +COP 6000.0m annual interest on refinancing → +0.27% WACC. ✓*

### hint

Your spread arithmetic is the floor, not the ceiling — now tell the board what the wider spread and higher WACC mean for the refinancing decision and the structural rating pressure created by the already-committed expansion.

### full_reveal

The dominant misconception here is ABANDONED-AFTER-CALC: candidates diligently compute the new cost of debt and the WACC movement, then stop — handing the board a number when it needed a verdict. That thinking is wrong because the calculation is evidence, not the conclusion; a spread widening only becomes advice when you explain what it means for the issuer's funding decisions, covenant exposure, and investor-base risk. The correct mental model is to treat the quantitative steps as a diagnostic chain — each figure should open a question the board must act on, not close the analysis. A second, subtler error is UNDEVELOPED-ASSUMPTION: candidates note that "a downgrade raises the cost of debt" without probing why the downgrade happened (the leverage trajectory of the greenfield expansion), which means they miss that the rating pressure may be structural and unlikely to self-correct quickly. If your spread or WACC figure is off, carry it forward consistently into the interest-cost and WACC steps — where your downstream method is correct, those marks remain live and the error is charged once at its source, provided you use your own figure rigorously throughout. Remember too that the agency's role is diagnostic, not mechanical: it supplies the independent leverage-liquidity-outlook assessment investors price the spread from, so a downgrade signals narrower market access, not merely a wider number.

### answer_schema

```json
{
  "params": {
    "r_hi": 0,
    "r_lo": 0,
    "govt_yield": 0,
    "kind_marker": 0,
    "market_price": 0,
    "benchmark_rate": 11.4,
    "debt_principal": 800000,
    "spread_used_bps": 0
  },
  "components": [
    {
      "unit": "%",
      "label": "Cost of debt at the current rating (BBB)",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "base_kd",
      "working_steps": [
        "= benchmark 11.40% + 265bp spread"
      ],
      "expected_value": 14.05
    },
    {
      "unit": "%",
      "label": "Cost of debt after the downgrade (BBB-)",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "component_id": "new_kd",
      "working_steps": [
        "= benchmark 11.40% + 340bp spread"
      ],
      "expected_value": 14.8
    },
    {
      "unit": "COPm",
      "label": "Increase in annual interest cost",
      "recompute": "principal_times_delta_kd",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "base_kd",
        "new_kd"
      ],
      "component_id": "delta_annual_interest",
      "working_steps": [
        "= debt principal 800000.0 × (new Kd − base Kd)"
      ],
      "expected_value": 6000
    },
    {
      "unit": "%",
      "label": "Increase in WACC from the higher cost of debt",
      "recompute": "wacc_from_delta_kd",
      "tolerance": {
        "kind": "absolute",
        "value": 0.05
      },
      "depends_on": [
        "base_kd",
        "new_kd"
      ],
      "component_id": "delta_wacc",
      "working_steps": [
        "= debt weight 0.55 × Δ(after-tax Kd)"
      ],
      "expected_value": 0.2681249999999995
    }
  ]
}
```

---

## Drill 4 — debt_valuation (B4a)  ·  `77c0d445-4c6a-4e2f-b5c9-db71fb34ae31`
- LO B4a · mode quantitative · command_verb "apply and assess" · L3 · marks_guide 15

### question

Apply the term structure of interest rates and the dated credit-spread table to value Handelsboden Nordic AB's SEK 500 million senior unsecured bond as at the valuation date, and assess — from the issuer's perspective — whether the bond's quoted market price implies a funding cost above or below the credit-curve fair value, stating what this signals for Handelsboden's near-term refinancing strategy.

### context_text

SCENARIO — HANDELSBODEN NORDIC AB (GROCERY RETAIL, SWEDEN)

Handelsboden Nordic AB is a mid-market Swedish grocery retailer operating approximately 340 stores across Sweden and southern Norway. To fund a three-year distribution-centre expansion programme, the group issued a SEK 500 million senior unsecured fixed-rate bond six months ago; the bond now has exactly four years remaining to maturity and pays an annual coupon of 4.20% on a face value of SEK 500 million.

At the valuation date, Handelsboden carries an S&P issuer credit rating of BBB. The treasury team has obtained a snapshot of the Swedish government spot curve and an investment-grade credit-spread table from a Nordic fixed-income desk. Both data sources are dated — the spot curve is a single-day closing extract and the spread table was compiled at the same valuation date; neither reflects intraday movements or any subsequent central-bank communication.

The bond is quoted in the secondary market at SEK 489.50 million (clean price on face value of SEK 500 million, accrued interest excluded for this exercise). The board wishes to understand whether the market is pricing the bond above or below the credit-curve fair value implied by Handelsboden's current rating, and what that gap means for the cost of future debt issuance.

CHALLENGEABLE TEXTURE: The BBB rating is a point-in-time view assigned before the distribution-centre capital expenditure programme reached its peak draw-down phase. As leverage rises during construction, the rating agency may revise the outlook to negative, which would widen the applicable spread and compress the bond's fair value. The spread table as dated may therefore understate the market's forward-looking risk perception.

--- RAW INPUTS ---

Bond:
  Face value         : SEK 500 million
  Annual coupon rate : 4.20%
  Maturity           : 4 years (annual coupons, bullet redemption)
  Label              : Handelsboden Nordic 4.20% 2029

Issuer rating (S&P): BBB

Swedish government spot curve (at valuation date, percent per annum):
  Year 1 : 2.85%
  Year 2 : 3.10%
  Year 3 : 3.30%
  Year 4 : 3.45%

Credit-spread table (at valuation date, S&P scale, investment-grade):
  AAA  :  45 bps
  AA+  :  55 bps
  AA   :  65 bps
  AA-  :  80 bps
  A+   :  95 bps
  A    : 115 bps
  A-   : 135 bps
  BBB+ : 160 bps
  BBB  : 185 bps
  BBB- : 220 bps

Quoted market price: SEK 489.50 million

### model_answer

**Credit risk — rating, spread and the cost of debt**

**Assumptions:** the fair value of the debt is each cash flow discounted at its own maturity's government spot rate plus the issuer's credit spread. Comparing that fair value with the quoted market price shows whether the market is pricing the issuer's debt richly or cheaply relative to the curve.

**Step 1 — Fair value on the corporate spot curve (govt spot + 185bp spread)**

| Year | Cash flow | Govt spot | + spread | Corp spot | DF | PV |
|------|------|------|------|------|------|------|
| 1 | SEK 21.0m | 2.85% | 1.85% | 4.70% | 0.9551 | SEK 20.1m |
| 2 | SEK 21.0m | 3.10% | 1.85% | 4.95% | 0.9079 | SEK 19.1m |
| 3 | SEK 21.0m | 3.30% | 1.85% | 5.15% | 0.8601 | SEK 18.1m |
| 4 | SEK 521.0m | 3.45% | 1.85% | 5.30% | 0.8134 | SEK 423.8m |
| **Total** | | | | | | **SEK 481.0m** |

The fair value is **SEK 481.0m**.

**Step 2 — Fair value vs quoted market price (code-owned verdict)**

Fair value SEK 481.0m versus a quoted market price of SEK 489.5m is a difference of **SEK -8.5m**, so on the spot-curve valuation the bond is **over-valued by the market**.

**Step 3 — Evaluation / advice to the board**

The board should read the valuation gap from the issuer's seat: the market is pricing the bond above its credit-curve fair value, which means the spread investors are actually accepting is tighter than the dated rating table implies — Handelsboden is, for now, funded inside its BBB band. That is a favourable signal, and the board's response should be to exploit it rather than admire it: with the distribution-centre programme still drawing down and leverage set to peak, the pricing window is unlikely to persist, so accelerating the next issuance to lock terms while the market prices the credit richly is the prudent move. The board should hold one caveat in view: the same gap could instead mean the dated spread table overstates today's spread environment, so the favourable read is against a benchmark that may itself be stale — the achievable new-issue level should be confirmed against live pricing before size is committed. Either way the direction of travel points to acting sooner: a rating-outlook revision as capex peaks would widen the applicable spread and close the window, turning today's rich secondary pricing into tomorrow's costlier primary. Handelsboden's treasury team is therefore advised to firm the refinancing timetable now, using the inside-the-curve pricing as the reason to move, not a reason to wait.

*Reconciliation: fair value SEK 481.0m vs market SEK 489.5m = SEK -8.5m → over-valued. ✓*

### hint

Check whether you used a single flat discount rate for every cash flow — the term structure requires each year's coupon and principal to be discounted at its own maturity-matched government spot rate plus the issuer's credit spread, not a blended or par yield.

### full_reveal

The dominant misconception here is ABANDONED-AFTER-CALC: candidates complete the present-value table, note the gap between fair value and the quoted market price, and then stop — leaving the board-level marks entirely on the table. The calculation is the floor, not the ceiling; from the issuer's perspective, the direction and magnitude of that gap is a direct signal about where the market-implied spread sits relative to the spread table as dated, and that signal has immediate consequences for the timing and pricing of any near-term refinancing — consequences the board needs articulated, not implied. A second, related error is VALUATION-PLUMBING in the discount-rate mechanics: applying a single composite yield to every cash flow treats the yield curve as flat, which violates the term-structure assumption — each cash flow must be discounted at its own maturity-matched spot rate plus the dated credit spread, because the government curve as at the valuation date is upward-sloping and a flat rate will produce a different fair value for a different reason at every maturity. If your fair-value total differs from the model answer's, carry your own figure forward consistently into the over- or under-valuation verdict and the refinancing assessment — where the downstream reasoning is sound, those marks still score; OFR credit is conditional on applying your figure correctly in the subsequent steps, not automatic. The boardroom test is simple: you have told the board what the bond is worth at the valuation date — now tell them what to do about it before the next capital-markets window opens.

### answer_schema

```json
{
  "params": {
    "r_hi": 0,
    "r_lo": 0,
    "govt_yield": 0,
    "kind_marker": 0,
    "market_price": 489.5,
    "benchmark_rate": 0,
    "debt_principal": 0,
    "spread_used_bps": 185
  },
  "components": [
    {
      "unit": "SEKm",
      "label": "Fair value of the bond (govt spot + credit spread per maturity)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "fair_value",
      "working_steps": [
        "Σ cash flow × DF at (govt spot + spread) for each maturity"
      ],
      "expected_value": 480.9503198462917
    },
    {
      "unit": "SEKm",
      "label": "Fair value less quoted market price",
      "recompute": "fair_minus_market",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fair_value"
      ],
      "component_id": "mispricing",
      "working_steps": [
        "= fair value − market price 489.5"
      ],
      "expected_value": -8.549680153708323
    }
  ]
}
```

---
