# AFM international-finance batch — blind adversarial review pack

**Calculator #10: international investment & financing (`lib/acca/international.ts`). 4 drills, `status=candidate`, `published=false`, `paper_code=AFM`. AT THE REVIEW GATE (Fix Round 1 applied). Awaiting co-founder independent recompute, THEN a blind GPT round. CURRENT STATE — regenerated after every fix round.**

Doctrine: code owns EVERY figure AND every figure-vs-figure verdict — the forecast FX curve (DERIVED by parity, never asserted), every conversion, the credit-method double-tax, the NPV, the decision FLIP under an alternative FX path, the sustainability verdict. The model authored PROSE only. The calculator COMPOSES the FCFF build (`fcffFromBuild`, `valuation.ts`) and the discounting (`discountFactor`, `npv.ts`) ONE-WAY, no back-imports.

## Fix Round 1 (ruled 2026-07-17) — applied in this pack
- **DOUBLE-TAX credit base = the CORPORATE DIFFERENTIAL (major).** Additional home tax = **max(0, home rate − foreign CORPORATE rate) × taxable profit** (the PBIT base the FCFF build already taxes), crediting the foreign corporate tax — its OWN per-year schema component. Withholding is a SEPARATE layer on the remitted amount; each scenario STATES whether the treaty makes it creditable (if so: additional = max(0, home liability − foreign corp tax − WHT)). Never negative, never a refund. Evidence (Rule 22, verbatim, in `international.ts`): *"A bilateral tax treaty exists between the countries of Ayjai and Nuruk — hence, taxable profits earned in Nuruk will be liable to the differential income tax rate on company profits that applies between the two countries."* — ACCA AFM technical article, "International project appraisal (part 2)", accaglobal.com. **K1 shows the NIL case** (foreign corporate ≥ home → the credit covers the whole home liability) and teaches WHY.
- **GATE 14 rewritten** to validate the new rule (each period: additional = the credit-method residual; ≥ 0; ≤ home liability).
- **Floor tolerance** on money components: max(0.5% relative, 0.2 absolute) — a small-magnitude figure is not held to a punishing relative band.
- **K2 re-sized** so the base NPV is meaningfully positive (not razor-thin) and the alternative clearly flips it.
- **K1 growth input** relabelled "Annual growth of foreign cash flows (money terms)". **K4** says "remitted in year 2". **K3** prints the explicit free − restricted = cost subtraction. **Reconciliation template** prints "a shortfall of X" for a negative surplus (was "surplus −X"; clears walk-log item 3).

Money components carry the floor tolerance; forecast spots display at 4 dp. **All gates pass** — the 6 base/pattern gates (schema self-consistency + tolerance + OFR-wiring; answer↔schema figure integrity at 1/2/3/4 dp; distinct-factor seeded-OFR; P4 jurisdiction + frozen-market-facts; P5 completeness; P6 loss-relief) PLUS **GATE 12 parity-consistency**, **GATE 13 currency/unit-scale integrity**, **GATE 14 double-tax cap (differential base)**.

## Kinds → ids → code-computed verdicts
- **home_currency_standard (K1)** `52bf38ce-c7cf-4037-8283-6d32eb37c6da` — MAD→USD NPV = **USD +16.4m** → ACCEPT; additional home tax is **NIL** (foreign corporate rate 31% > US home rate 21%, so the foreign-tax credit covers the whole home liability — taught explicitly, not a silent zero)
- **exchange_rate_sensitivity (K2)** `e911d20f-83c9-4be2-8454-ec0aafc3d54e` — base **GBP +1.8m** (accept) → alternative **GBP −5.4m** (reject) — the decision **FLIPS**; base is meaningfully positive (Fix-Round-1 re-size)
- **restricted_remittance (K3, B5b + B5c dual)** `3f24d830-f090-4c3e-98e7-f45af4340fa3` — NPV **EUR +11.2m** with the controls vs **EUR +13.3m** free — the restriction costs **EUR −2.1m** (shown as an explicit free − restricted subtraction)
- **multinational_dividend_capacity (K4, A6a — DIRECT-LINK-ONLY)** `39a0fbd6-100a-41ab-877e-af00f3108697` — group capacity **USD 45.2m** vs proposed **USD 55.0m** → **NOT sustainable** (a shortfall of 9.8m; subsidiary remits in year 2 and contributes ~16%)

## ⛔ CLOSED RULINGS — do NOT re-raise (spend hostility on open questions, not settled ones)
- **Credit base = the CORPORATE differential (Fix Round 1, Rule 22 evidence).** Additional home tax = max(0, home − foreign CORPORATE rate) on taxable profit, crediting foreign corporate tax; withholding is a separate creditable-or-not layer. This is the exam-orthodox base per the ACCA technical article. Do NOT re-raise the earlier withholding-only credit model, and do NOT propose taxing the cash flow rather than the taxable profit.
- **Parity basis = PPP for B5** — relative inflation is the orthodox multi-year-translation route; IRP is E2/short-horizon and deliberately not used here.
- **Double-tax = credit method only** — exemption method is journalled as a future kind, out of scope.
- **Home-currency method primary** — the foreign-currency route reconciles by construction and is not separately graded.
- **A6a (K4) direct-link-only + excluded from B-tier counts** — a Section-A LO riding batch #10 by design; not a coverage claim.
- **Forecast rates are DERIVED, never asserted** — GATE 12 enforces it. **OFR wording** — "charged once, at its source" is house wording, closed.

**Review method:** fresh model, no project context, AFM syllabus PDF attached; FULL hostility on drill 1 (K1, first-of-family), spot-check siblings WITH full recomputation of every figure. Hunt for semantic errors a deterministic gate cannot catch: the differential-tax base or credit mis-explained, a parity forecast mis-stated, a conversion inverted (multiply vs divide), the remittance-blocking story incoherent, the dividend-capacity flow mis-plumbed, scenario-fact drift, an invented statute/treaty.

---

## Drill — home_currency_standard (K1)  ·  `52bf38ce-c7cf-4037-8283-6d32eb37c6da`
- LO B5b · mode quantitative · command_verb "forecast" · marks_guide 10
- CODE-COMPUTED: MAD→USD NPV = **USD +16.4m** → ACCEPT; additional home tax is **NIL** (foreign corporate rate 31% > US home rate 21%, so the foreign-tax credit covers the whole home liability — taught explicitly, not a silent zero)

### question

Forecast the annual free cash flows of the Moroccan plant in MAD, convert them to USD using PPP-derived exchange rates, and determine the USD net present value of the investment for Apex Driveline Corporation's board.

### context_text

Apex Driveline Corporation (ADC), a US-headquartered automotive-components manufacturer listed on the NYSE, is appraising the construction of a precision-forging plant in Kenitra, Morocco, to be operated through its wholly owned subsidiary, Atlas Forgetech SARL. The Kenitra Free Zone offers a stable operating environment, yet Morocco's exchange-control framework occasionally imposes administrative delays on profit remittances — a risk the board should weigh against the attractive labour-cost base — and it is unclear whether purchasing power parity will hold closely given that the dirham is managed against a currency basket rather than allowed to float freely. ADC's treasury has assembled the following appraisal inputs at the appraisal date:

- Base spot rate (MAD per USD) at appraisal date: 10.20
- Home (USD) inflation rate, assumed: 2.5%
- Foreign (MAD) inflation rate, assumed: 4.5%
- Annual growth of foreign cash flows (money terms): 0%
- Project life: 4 years
- Initial outlay (MAD millions): 1,200
- Foreign (MAD) PBIT, base year (MAD millions): 520
- Foreign corporate tax rate (Morocco): 31%
- Parent-country (US) tax rate on foreign taxable profit: 21%
- Depreciation / non-cash add-back (MAD millions): 300
- Capital expenditure (MAD millions): 120
- Increase in working capital (MAD millions): 40
- Host withholding tax on remittances: 7.5%
- Bilateral treaty: the US–Morocco bilateral arrangement makes the withholding tax creditable against the US liability (wht_creditable = true)
- ADC's home money cost of capital (USD): 11%

### model_answer

**International investment appraisal — net present value to the parent**

**Assumptions:** project cash flows arise in MAD; the maintainable base-year foreign free cash flow is MAD 498.8m on a taxable profit (PBIT) base of MAD 520.0m; forecast spot rates are derived by PPP parity from the stated base spot 10.2000 MAD/USD; converted cash flows are discounted at the parent's 11.00% money cost of capital. The foreign corporate tax rate 31.00% is **at or above** the parent's 21.00% home rate, so the credit for foreign corporate tax covers the whole home liability and there is **NO additional home tax** (max(0, 21.00% − 31.00%) = 0); withholding tax at 7.50% on remittances is creditable against the home liability under the bilateral treaty.

**Step 1 — Forecast exchange rates (parity, never assumed)**

| Year | Forecast spot (MAD/USD) |
|------|------|
| 1 | 10.3990 |
| 2 | 10.6019 |
| 3 | 10.8088 |
| 4 | 11.0197 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

**Step 2 — Foreign cash flows, tax, remittance, and conversion**

| Year | Foreign FCFF | Withholding | Additional home tax | Net remitted (MAD) | Spot | Home cash flow |
|------|------|------|------|------|------|------|
| 1 | MAD 498.8m | MAD 37.4m | MAD 0.0m | MAD 461.4m | 10.3990 | USD 44.4m |
| 2 | MAD 498.8m | MAD 37.4m | MAD 0.0m | MAD 461.4m | 10.6019 | USD 43.5m |
| 3 | MAD 498.8m | MAD 37.4m | MAD 0.0m | MAD 461.4m | 10.8088 | USD 42.7m |
| 4 | MAD 498.8m | MAD 37.4m | MAD 0.0m | MAD 461.4m | 11.0197 | USD 41.9m |

*(Additional home tax is **nil** every year: the foreign corporate rate 31.00% exceeds the parent's 21.00% home rate, so the foreign-tax credit already covers the whole home liability. Net remitted = foreign FCFF − withholding; converted at the forecast spot.)*

**Step 3 — Present values and NPV**

| Year | Home cash flow | DF @ 11.00% | Present value |
|------|------|------|------|
| 0 | USD -117.6m | 1.000 | USD -117.6m | *(foreign outlay MAD 1200.0m ÷ 10.2000)*
| 1 | USD 44.4m | 0.901 | USD 40.0m |
| 2 | USD 43.5m | 0.812 | USD 35.3m |
| 3 | USD 42.7m | 0.731 | USD 31.2m |
| 4 | USD 41.9m | 0.659 | USD 27.6m |

**NPV to the parent = USD 16.4m.**

**Step 4 — Decision**

The NPV of USD 16.4m is **positive**, so on these exchange-rate and fiscal assumptions the project **adds value to the parent and should be accepted**.

**Step 5 — Advice to the board**

The most fragile assumption in this appraisal is the PPP-based exchange-rate forecast: because Morocco manages the dirham against a currency basket, the actual depreciation path may diverge materially from the inflation-differential prediction, and the board should commission a scenario analysis using both a managed-peg and a free-float depreciation assumption before committing capital. The durability of the MAD cash flows rests on the Kenitra Free Zone's continued cost advantages and on automotive-sector demand remaining stable over the four-year horizon — neither of which can be treated as certain given global supply-chain realignment pressures that the scenario acknowledges through its zero real-growth assumption. Morocco's exchange-control framework introduces remittance risk: administrative delays could defer cash conversions to periods of less favourable rates, so the board should require a contractual comfort letter or an escrow mechanism from the Moroccan regulatory authority as a condition precedent to approval. On the tax side, the Moroccan corporate rate exceeds ADC's US statutory rate, meaning the foreign tax credit is expected to shelter the full US liability on the project's taxable profit — but the board should confirm that the treaty creditability of the withholding tax is operative under current bilateral arrangements and has not been modified by recent protocol changes.

*Reconciliation: Σ present values USD 134.1m − home outlay USD 117.6m = NPV USD 16.4m ✓*

### hint

Check whether you've correctly isolated the tax layer that falls away — specifically, when the foreign corporate rate exceeds the parent's home rate, what happens to the additional home tax charge on remittances, and whether you've then applied the withholding tax to the right base before converting at PPP-derived spots rather than the base-year spot.

### full_reveal

The classic misconception in cross-border NPV drills is VALUATION-PLUMBING applied to the tax and conversion sequence: candidates either apply a flat spot rate throughout (ignoring PPP-derived forecasts) or double-count the tax burden by levying additional home tax even when the foreign rate already exceeds the parent's statutory rate — producing a remittance figure that is too small and a present value that is correspondingly misstated. The causal mechanism is a misunderstanding of how foreign-tax credits operate: the credit extinguishes the home liability up to the amount of foreign tax already paid, so when the foreign corporate rate exceeds the home rate the additional home tax is nil by construction, not a matter of judgment. A wrong number at the remittance stage is not fatal to your mark if you carry it forward consistently into the conversion and discounting steps — where your downstream method is correct, own-figure credit is available, charged once at the source error and not again; that credit is conditional on you actually using your own figure correctly rather than switching to a different number mid-table. And once the arithmetic is done, the board still needs a recommendation and a scepticism challenge: PPP assumes freely floating rates, but because Morocco manages the dirham against a currency basket the actual depreciation path may diverge from the inflation-differential forecast — that tension is what the advice section must surface, not leave implicit in the numbers.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "base_spot": 10.2,
    "rate_home": 0.025,
    "home_outlay": 117.64705882352942,
    "rate_foreign": 0.045,
    "discount_rate": 0.11,
    "add_tax_rate_effective": 0
  },
  "components": [
    {
      "unit": "MAD/USD",
      "label": "Forecast spot, year 1 (MAD/USD)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "fx_1",
      "working_steps": [
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 10.2000 × 1.01951 = 10.3990"
      ],
      "expected_value": 10.399024390243902
    },
    {
      "unit": "MAD/USD",
      "label": "Forecast spot, year 2 (MAD/USD)",
      "recompute": "parity_step_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_1"
      ],
      "component_id": "fx_2",
      "working_steps": [
        "S2 = S1 × 1.01951 = 10.6019"
      ],
      "expected_value": 10.601932183224271
    },
    {
      "unit": "MAD/USD",
      "label": "Forecast spot, year 3 (MAD/USD)",
      "recompute": "parity_step_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_2"
      ],
      "component_id": "fx_3",
      "working_steps": [
        "S3 = S2 × 1.01951 = 10.8088"
      ],
      "expected_value": 10.808799152653037
    },
    {
      "unit": "MAD/USD",
      "label": "Forecast spot, year 4 (MAD/USD)",
      "recompute": "parity_step_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_3"
      ],
      "component_id": "fx_4",
      "working_steps": [
        "S4 = S3 × 1.01951 = 11.0197"
      ],
      "expected_value": 11.019702550753584
    },
    {
      "unit": "USDm",
      "label": "Home-currency net cash flow, year 1",
      "recompute": "home_cf_convert_y1",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_1"
      ],
      "component_id": "home_cf_1",
      "working_steps": [
        "= foreign remittance 461.4 (net of WHT; no additional home tax) ÷ spot 10.3990"
      ],
      "expected_value": 44.368585233136315
    },
    {
      "unit": "USDm",
      "label": "Home-currency net cash flow, year 2",
      "recompute": "home_cf_convert_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_2"
      ],
      "component_id": "home_cf_2",
      "working_steps": [
        "= foreign remittance 461.4 (net of WHT; no additional home tax) ÷ spot 10.6019"
      ],
      "expected_value": 43.51942570714328
    },
    {
      "unit": "USDm",
      "label": "Home-currency net cash flow, year 3",
      "recompute": "home_cf_convert_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_3"
      ],
      "component_id": "home_cf_3",
      "working_steps": [
        "= foreign remittance 461.4 (net of WHT; no additional home tax) ÷ spot 10.8088"
      ],
      "expected_value": 42.68651803810704
    },
    {
      "unit": "USDm",
      "label": "Home-currency net cash flow, year 4",
      "recompute": "home_cf_convert_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_4"
      ],
      "component_id": "home_cf_4",
      "working_steps": [
        "= foreign remittance 461.4 (net of WHT; no additional home tax) ÷ spot 11.0197"
      ],
      "expected_value": 41.86955118570308
    },
    {
      "unit": "USDm",
      "label": "Net present value (to the parent, home currency)",
      "recompute": "intl_npv_sum_less_outlay",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "home_cf_1",
        "home_cf_2",
        "home_cf_3",
        "home_cf_4"
      ],
      "component_id": "npv",
      "working_steps": [
        "= Σ (home cash flow × DF @ 11.00%) − home outlay 117.6"
      ],
      "expected_value": 16.43876609730053
    }
  ]
}
```

---

## Drill — exchange_rate_sensitivity (K2)  ·  `e911d20f-83c9-4be2-8454-ec0aafc3d54e`
- LO B5a · mode quantitative · command_verb "assess" · marks_guide 15
- CODE-COMPUTED: base **GBP +1.8m** (accept) → alternative **GBP −5.4m** (reject) — the decision **FLIPS**; base is meaningfully positive (Fix-Round-1 re-size)

### question

Assess the impact on the GBP net present value of Meridian Telecoms plc's proposed Egyptian network build under the base exchange-rate assumption and under a scenario of a sharper devaluation of the Egyptian pound, and assess whether the investment decision changes between the two scenarios.

### context_text

Meridian Telecoms plc, a UK-listed mobile-network operator, is evaluating a four-year greenfield build-out for its Egyptian subsidiary, MerTel Egypt LLC, which would deploy 4G/5G infrastructure across three urban governorates. The Egyptian pound has been under sustained pressure following successive IMF programme reviews, and the Egyptian Central Bank's managed-float regime means that the parity assumption — that purchasing-power parity will govern the EGP/GBP path — may understate the speed of any future step-devaluation, particularly if foreign-exchange reserves deteriorate; the board must therefore stress-test the appraisal against a materially faster depreciation. Subscriber revenue growth is projected in money terms at the rate below, but analysts have questioned whether competitive entry from a third operator — whose licence application is pending at the National Telecommunications Regulatory Authority — could erode volumes, making the stated growth rate a ceiling rather than a central estimate. A bilateral tax treaty between the UK and Egypt makes the Egyptian withholding tax creditable against Meridian's UK corporation tax liability.

Raw inputs (at the appraisal date):
- Base spot rate (EGP per GBP): 49.00
- UK (home) inflation: 3.0%
- Egyptian (foreign) inflation: 14.0%
- Annual growth of foreign cash flows (money terms): 0.0%
- Project life: 4 years
- Initial capital outlay: EGP 980 million
- Foreign PBIT (maintainable base year): EGP 560 million
- Depreciation (non-cash add-back): EGP 180 million
- Capital expenditure (years 1–4): EGP 90 million
- Increase in working capital (years 1–4): EGP 30 million
- Egyptian corporate tax rate: 22.5%
- UK corporation tax rate on foreign taxable profit: 25.0%
- Egyptian withholding tax on remittances: 10.0%
- Withholding tax creditable under bilateral treaty: Yes
- UK parent's money cost of capital (discount rate): 12.0%
- Alternative scenario: a sharper devaluation of the Egyptian pound, assumed Egyptian inflation: 38.0%

### model_answer

**Impact of alternative exchange-rate assumptions on project value**

**Assumptions:** the project's EGP cash flows are unchanged; only the forecast-FX path (the PPP-parity foreign rate) differs between the base case and a sharper devaluation of the Egyptian pound. Both NPVs are to the parent, discounted at 12.00%. The foreign corporate tax rate 22.50% is **at or above** the parent's 25.00% home rate, so the credit for foreign corporate tax covers the whole home liability and there is **NO additional home tax** (max(0, 25.00% − 22.50%) = 0); withholding tax at 10.00% on remittances is creditable against the home liability under the bilateral treaty.

**Step 1 — Base exchange-rate assumption**

| Year | Forecast spot (EGP/GBP) |
|------|------|
| 1 | 54.2330 |
| 2 | 60.0249 |
| 3 | 66.4353 |
| 4 | 73.5303 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

NPV under the base assumption = **GBP 1.8m** → accept.

**Step 2 — Alternative exchange-rate assumption (a sharper devaluation of the Egyptian pound)**

| Year | Forecast spot (EGP/GBP) |
|------|------|
| 1 | 65.6505 |
| 2 | 87.9589 |
| 3 | 117.8479 |
| 4 | 157.8932 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

NPV under the alternative assumption = **GBP -5.4m** → reject.

**Step 3 — Sensitivity of the decision**

Moving from the base assumption to a sharper devaluation of the Egyptian pound changes the NPV by **GBP -7.3m** (from GBP 1.8m to GBP -5.4m); the recommendation **FLIPS**: accept under the base assumption, reject under a sharper devaluation of the Egyptian pound. The decision is **not robust** to the exchange-rate assumption.

**Step 4 — Advice to the board**

The most fragile assumption in this appraisal is whether purchasing-power parity will hold as the governing mechanism for the EGP/GBP path: Egypt's managed-float regime has historically produced discrete, politically-timed step-devaluations rather than the smooth, inflation-differential depreciation that PPP implies, so the base-case forecast exchange rates may materially overstate the sterling value of EGP remittances in each of the four project years. The creditability of the Egyptian withholding tax under the bilateral treaty limits — but does not eliminate — the fiscal drag on remitted cash flows; the board should confirm that treaty benefits remain available for a newly incorporated subsidiary and that repatriation of dividends is not subject to Central Bank approval queues, which have in practice blocked timely remittance for foreign investors during prior foreign-currency shortage episodes. Subscriber revenue durability is a second structural risk: the NTRA's pending licence decision for a third operator could intensify price competition across the three target governorates, meaning the maintainable PBIT figure and the zero-growth assumption in money terms could prove optimistic if average revenue per user declines. The board should require a minimum internal approval threshold — such as a positive GBP NPV under the alternative devaluation scenario — before committing the EGP 980 million outlay, and should also explore whether the capital structure of MerTel Egypt LLC can be weighted towards inter-company debt (subject to thin-capitalisation rules) to reduce reliance on dividend remittances as the primary repatriation route.

*Reconciliation: base NPV GBP 1.8m, alternative NPV GBP -5.4m, swing GBP -7.3m; decision flips ✓*

### hint

Your exchange-rate forecasts and NPVs may be technically sound, but the board needs to know whether the decision flips between the two scenarios — and why the PPP-based base-case path may be the less reliable of the two assumptions given Egypt's managed-float history.

### full_reveal

The classic misconception here is FENCE-SITTING: candidates produce two NPV figures and annotate them "accept" and "reject" respectively, then stop — as if laying two numbers side by side constitutes advice. That is the floor, not the ceiling. The boardroom question is not "what are the two NPVs?" but "is this investment decision robust, and what should the board do about the uncertainty?" — which demands an explicit verdict on whether the swing between scenarios is large enough to change the recommendation and why the more pessimistic exchange-rate path deserves weight alongside the base case. The reason fence-sitting produces the wrong conclusion is structural: a decision-maker reading two numbers without a recommendation cannot act, so the analytical work has failed its commercial purpose regardless of arithmetic accuracy. The correct mental model is scenario-resolution: state which assumption is more fragile (here, whether PPP-driven smooth depreciation is a reliable proxy for a managed-float currency that has historically moved in discrete, politically-timed steps), then translate that fragility into a concrete board instruction — such as a minimum approval threshold or an alternative repatriation structure — so the recommendation survives scrutiny even under the adverse scenario. If your own NPV figures differ from the model's, carry them forward consistently into the flip-or-no-flip verdict and the board advice; where your downstream reasoning is sound, those marks remain in reach — OFR credit is conditional on correct subsequent use of your own figures, not automatic.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "base_spot": 49,
    "rate_home": 0.03,
    "home_outlay": 20,
    "rate_foreign": 0.14,
    "discount_rate": 0.12,
    "alt_rate_foreign": 0.38
  },
  "components": [
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 1 (EGP/GBP)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "fx_1",
      "working_steps": [
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 49.0000 × 1.10680 = 54.2330"
      ],
      "expected_value": 54.233009708737875
    },
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 2 (EGP/GBP)",
      "recompute": "parity_step_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_1"
      ],
      "component_id": "fx_2",
      "working_steps": [
        "S2 = S1 × 1.10680 = 60.0249"
      ],
      "expected_value": 60.02488453200115
    },
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 3 (EGP/GBP)",
      "recompute": "parity_step_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_2"
      ],
      "component_id": "fx_3",
      "working_steps": [
        "S3 = S2 × 1.10680 = 66.4353"
      ],
      "expected_value": 66.4353090936712
    },
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 4 (EGP/GBP)",
      "recompute": "parity_step_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_3"
      ],
      "component_id": "fx_4",
      "working_steps": [
        "S4 = S3 × 1.10680 = 73.5303"
      ],
      "expected_value": 73.53034210367493
    },
    {
      "unit": "GBPm",
      "label": "NPV under the base exchange-rate assumption",
      "recompute": "intl_npv_from_fx",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_1",
        "fx_2",
        "fx_3",
        "fx_4"
      ],
      "component_id": "npv",
      "working_steps": [
        "= Σ (foreign remittance ÷ forecast spot × DF @ 12.00%) − home outlay 20.0"
      ],
      "expected_value": 1.8304068460136351
    },
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 1 (EGP/GBP)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "alt_fx_1",
      "working_steps": [
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 49.0000 × 1.33981 = 65.6505"
      ],
      "expected_value": 65.65048543689319
    },
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 2 (EGP/GBP)",
      "recompute": "parity_step_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "alt_fx_1"
      ],
      "component_id": "alt_fx_2",
      "working_steps": [
        "S2 = S1 × 1.33981 = 87.9589"
      ],
      "expected_value": 87.95890281836175
    },
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 3 (EGP/GBP)",
      "recompute": "parity_step_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "alt_fx_2"
      ],
      "component_id": "alt_fx_3",
      "working_steps": [
        "S3 = S2 × 1.33981 = 117.8479"
      ],
      "expected_value": 117.84785037799921
    },
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 4 (EGP/GBP)",
      "recompute": "parity_step_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "alt_fx_3"
      ],
      "component_id": "alt_fx_4",
      "working_steps": [
        "S4 = S3 × 1.33981 = 157.8932"
      ],
      "expected_value": 157.89323642877565
    },
    {
      "unit": "GBPm",
      "label": "NPV under the alternative exchange-rate assumption",
      "recompute": "intl_npv_from_fx",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "alt_fx_1",
        "alt_fx_2",
        "alt_fx_3",
        "alt_fx_4"
      ],
      "component_id": "alt_npv",
      "working_steps": [
        "= Σ (foreign remittance ÷ forecast spot × DF @ 12.00%) − home outlay 20.0"
      ],
      "expected_value": -5.449031429613022
    }
  ]
}
```

---

## Drill — restricted_remittance (K3, B5b + B5c dual)  ·  `3f24d830-f090-4c3e-98e7-f45af4340fa3`
- LO B5b · mode quantitative · command_verb "forecast" · marks_guide 10
- CODE-COMPUTED: NPV **EUR +11.2m** with the controls vs **EUR +13.3m** free — the restriction costs **EUR −2.1m** (shown as an explicit free − restricted subtraction)

### question

Forecast the annual free cash flows for Lumière Chimie SA's proposed Shenyang speciality-chemicals project in CNY and EUR, incorporating the Chinese capital-control restriction, and determine the project's EUR net present value under both free-remittance and restricted-remittance assumptions.

### context_text

Lumière Chimie SA, a Eurozone-based speciality-chemicals group headquartered in Lyon, France, is appraising a greenfield manufacturing project to be operated by its proposed Chinese subsidiary, Shenyang Lumi Chemicals Co. Ltd., in Liaoning Province. The project will produce high-purity solvents for the Chinese industrial market, and although the underlying demand outlook is considered robust, the board is aware that Chinese capital-account regulations have historically restricted the proportion of after-tax profits that foreign-owned subsidiaries may freely remit offshore — a constraint that has tightened unpredictably in periods of renminbi depreciation pressure, raising genuine doubts about whether the blocked fraction stated at appraisal will remain stable across the four-year project life. A further concern is that the PPP-implied depreciation path assumes Chinese consumer-price conditions remain anchored at appraisal-date levels, yet any structural shift in Chinese monetary policy could cause the CNY to move independently of the inflation differential, undermining the parity forecast entirely.

Raw inputs (at the appraisal date):
- Base spot rate (CNY per EUR 1): 7.80
- Home (EUR) inflation rate: 2.5%
- Foreign (CNY) inflation rate: 4.5%
- Annual growth of foreign cash flows (money terms): 0%
- Project life: 4 years
- Initial outlay (CNY millions): 280
- Foreign PBIT (maintainable, CNY millions): 165
- Depreciation (CNY millions per year): 35
- Capital expenditure (CNY millions per year): 10
- Increase in working capital (CNY millions per year): 5
- Foreign corporate tax rate: 25%
- Parent (EUR) tax rate on foreign taxable profit: 28%
- Host withholding tax rate on remittances: 10%
- Withholding tax creditable under bilateral treaty: Yes
- Fraction of annual cash flow blocked from remittance: 30%
- Local reinvestment rate on blocked funds: 3%
- Parent's EUR discount rate (money cost of capital): 11%

### model_answer

**International appraisal with a remittance restriction**

**Assumptions:** 30% of each year's CNY cash flow is blocked from remittance and reinvested locally at 3.00%, released in year 4; the free portion is remitted when earned. Forecast spots by PPP parity; home discount rate 11.00%. The foreign corporate tax rate 25.00% is **at or above** the parent's 28.00% home rate, so the credit for foreign corporate tax covers the whole home liability and there is **NO additional home tax** (max(0, 28.00% − 25.00%) = 0); withholding tax at 10.00% on remittances is creditable against the home liability under the bilateral treaty.

**Step 1 — Forecast exchange rates (parity)**

| Year | Forecast spot (CNY/EUR) |
|------|------|
| 1 | 7.9522 |
| 2 | 8.1074 |
| 3 | 8.2656 |
| 4 | 8.4268 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

**Step 2 — Remitted (free) cash flows converted to home currency**

| Year | Foreign cash flow | Free & remitted net (CNY) | Spot | Home cash flow | PV |
|------|------|------|------|------|------|
| 1 | CNY 100.6m | CNY 90.6m | 7.9522 | EUR 11.4m | EUR 10.3m |
| 2 | CNY 100.6m | CNY 90.6m | 8.1074 | EUR 11.2m | EUR 9.1m |
| 3 | CNY 100.6m | CNY 90.6m | 8.2656 | EUR 11.0m | EUR 8.0m |
| 4 | CNY 100.6m | CNY 90.6m | 8.4268 | EUR 10.7m | EUR 7.1m |

**Step 3 — Blocked funds accumulated and released in year 4**

Blocked cash reinvested locally at 3.00% accumulates to **CNY 180.4m** by year 4; remitted then (net of tax) and converted at 8.4268 = **EUR 19.3m** (PV EUR 12.7m).

**Step 4 — NPV and the cost of the restriction**

NPV with the restriction = **EUR 11.2m** (accept). By comparison the restriction **reduces** the NPV: free-remittance NPV EUR 13.3m − restricted NPV EUR 11.2m = a cost of the restriction of **EUR 2.1m**.

**Step 5 — Advice to the board**

The most fragile assumption is that the blocked fraction of 30% remains fixed throughout the project life: the scenario explicitly notes that Chinese capital-account restrictions have tightened unpredictably during periods of CNY depreciation pressure, so the board should stress-test the NPV against a materially higher blocked fraction before committing capital. The PPP-based exchange-rate path is equally vulnerable — if the CNY diverges from its inflation-implied trajectory due to a policy shift by the People's Bank of China, the EUR-converted cash flows will differ substantially from the appraisal forecast, and the board should require sensitivity analysis around the parity assumption. On the revenue side, the zero real-growth assumption for CNY cash flows is conservative but not guaranteed to be so: the solvent-demand outlook is described as robust, yet any competitive or regulatory disruption to the Chinese industrial market could erode PBIT below the maintainable level used here, so the board should require independent market validation of the demand forecast. To mitigate the drag from blocked cash, Lumière Chimie should explore structuring intra-group royalty payments and management-service fees payable by Shenyang Lumi Chemicals to the Lyon parent, thereby legally extracting value prior to the remittance-restriction point; alternatively, a parallel loan or back-to-back structure — whereby the parent lends to a Chinese counterpart onshore while a mirroring loan is extended offshore — could effectively repatriate value without triggering the blocked-remittance rule. Any residual blocked balances that cannot be extracted by these mechanisms should be directed into high-quality CNY-denominated financial assets or reinvested in capacity that reduces future capex, since the 3% local reinvestment rate cited at appraisal substantially understates what a well-managed treasury deployment could achieve.

*Reconciliation: free-flow PVs + released-funds PV − home outlay EUR 35.9m = NPV EUR 11.2m; vs free-remittance NPV EUR 13.3m ✓*

### hint

Before you convert anything to EUR, check whether you have applied the capital-control split correctly: the blocked 30% is not lost — it earns a local reinvestment return and is released in year 4, so your free-remittance and restricted-remittance NPVs should differ by the present-value drag of that delay, and if they do not, the most likely culprit is that you have either omitted the accumulated blocked-fund release or forgotten to strip withholding tax from the remitted flows before discounting.

### full_reveal

The classic misconception here is ABANDONED-AFTER-CALC: candidates grind through the exchange-rate parity table and the CNY cash flows, then treat the NPV number as the finish line — never telling the board what the restriction actually costs the business or whether the project should proceed on those terms. That thinking is wrong because the NPV differential between the two remittance scenarios is itself a decision-relevant figure: it quantifies the monetary drag imposed by capital-account policy, which is precisely what a board needs to weigh before committing an irreversible capital outlay. The correct mental model is that a quantitative international-appraisal drill has two outputs, not one — the NPV and the structured advice that follows from it, including the scepticism drill on the assumptions most likely to move the number (the blocked fraction, the PPP path, and the local reinvestment rate). Where your exchange-rate forecast or blocked-fund accumulation figure is wrong, carry your own number forward consistently into both NPV calculations: provided the method is correct downstream, those marks are recoverable — OFR credit is conditional on correct subsequent use of your own figure, not granted automatically. Finally, on tax: the question of whether additional home-country tax arises is determined by comparing the foreign effective rate against the home rate, and collapsing that comparison into a single step — rather than addressing withholding-tax creditability separately — is the second most common place marks are dropped in this type of drill.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "base_spot": 7.8,
    "rate_home": 0.025,
    "home_outlay": 35.8974358974359,
    "rate_foreign": 0.045,
    "discount_rate": 0.11,
    "blocked_fraction": 0.3,
    "local_reinvest_rate": 0.03,
    "add_tax_rate_effective": 0.030000000000000027
  },
  "components": [
    {
      "unit": "CNY/EUR",
      "label": "Forecast spot, year 1 (CNY/EUR)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "fx_1",
      "working_steps": [
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 7.8000 × 1.01951 = 7.9522"
      ],
      "expected_value": 7.9521951219512195
    },
    {
      "unit": "CNY/EUR",
      "label": "Forecast spot, year 2 (CNY/EUR)",
      "recompute": "parity_step_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_1"
      ],
      "component_id": "fx_2",
      "working_steps": [
        "S2 = S1 × 1.01951 = 8.1074"
      ],
      "expected_value": 8.10735990481856
    },
    {
      "unit": "CNY/EUR",
      "label": "Forecast spot, year 3 (CNY/EUR)",
      "recompute": "parity_step_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_2"
      ],
      "component_id": "fx_3",
      "working_steps": [
        "S3 = S2 × 1.01951 = 8.2656"
      ],
      "expected_value": 8.265552293205264
    },
    {
      "unit": "CNY/EUR",
      "label": "Forecast spot, year 4 (CNY/EUR)",
      "recompute": "parity_step_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_3"
      ],
      "component_id": "fx_4",
      "working_steps": [
        "S4 = S3 × 1.01951 = 8.4268"
      ],
      "expected_value": 8.426831362340977
    },
    {
      "unit": "EURm",
      "label": "Home cash flow from the remitted (free) portion, year 1",
      "recompute": "home_cf_convert_y1",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_1"
      ],
      "component_id": "home_cf_1",
      "working_steps": [
        "= free remittance 90.6 (net of WHT + differential home tax) ÷ spot 7.9522"
      ],
      "expected_value": 11.388364924549135
    },
    {
      "unit": "EURm",
      "label": "Home cash flow from the remitted (free) portion, year 2",
      "recompute": "home_cf_convert_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_2"
      ],
      "component_id": "home_cf_2",
      "working_steps": [
        "= free remittance 90.6 (net of WHT + differential home tax) ÷ spot 8.1074"
      ],
      "expected_value": 11.17040578723719
    },
    {
      "unit": "EURm",
      "label": "Home cash flow from the remitted (free) portion, year 3",
      "recompute": "home_cf_convert_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_3"
      ],
      "component_id": "home_cf_3",
      "working_steps": [
        "= free remittance 90.6 (net of WHT + differential home tax) ÷ spot 8.2656"
      ],
      "expected_value": 10.956618116668057
    },
    {
      "unit": "EURm",
      "label": "Home cash flow from the remitted (free) portion, year 4",
      "recompute": "home_cf_convert_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_4"
      ],
      "component_id": "home_cf_4",
      "working_steps": [
        "= free remittance 90.6 (net of WHT + differential home tax) ÷ spot 8.4268"
      ],
      "expected_value": 10.746922076157663
    },
    {
      "unit": "CNYm",
      "label": "Blocked funds released in year 4 (foreign, accumulated locally)",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "blocked_release",
      "working_steps": [
        "Σ blocked cash × (1 + local rate)^(4 − t) accumulated to year 4"
      ],
      "expected_value": 180.41891437499999
    },
    {
      "unit": "EURm",
      "label": "Home cash flow from the released blocked funds, year 4",
      "recompute": "home_cf_release_convert",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "blocked_release",
        "fx_4"
      ],
      "component_id": "home_cf_release",
      "working_steps": [
        "= (released 180.4 − WHT − deferred differential tax) ÷ spot 8.4268"
      ],
      "expected_value": 19.269048584875396
    },
    {
      "unit": "EURm",
      "label": "Net present value with the remittance restriction (home currency)",
      "recompute": "intl_remit_npv",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "home_cf_1",
        "home_cf_2",
        "home_cf_3",
        "home_cf_4",
        "home_cf_release"
      ],
      "component_id": "npv",
      "working_steps": [
        "= Σ (free home cash flow × DF) + released home cash × DF @ year 4 − home outlay 35.9"
      ],
      "expected_value": 11.212338576803138
    }
  ]
}
```

---

## Drill — multinational_dividend_capacity (K4, A6a — DIRECT-LINK-ONLY)  ·  `39a0fbd6-100a-41ab-877e-af00f3108697`
- LO A6a · mode quantitative · command_verb "determine" · marks_guide 15
- CODE-COMPUTED: group capacity **USD 45.2m** vs proposed **USD 55.0m** → **NOT sustainable** (a shortfall of 9.8m; subsidiary remits in year 2 and contributes ~16%)

### question

Determine the group dividend capacity of Crestline Electronics Inc and assess whether its proposed dividend is sustainable, given the year-2 remittance from its Vietnamese subsidiary, VinaCircuit Manufacturing Co., the applicable credit-method double taxation, and the parent's own free cash flow to equity.

### context_text

Crestline Electronics Inc is a US-domiciled electronics group whose principal offshore manufacturing operation, VinaCircuit Manufacturing Co., is incorporated in Vietnam and produces printed circuit board assemblies for export. The board is evaluating whether the group's proposed dividend can be met from sustainable cash flows: Vietnam's exchange-control environment has periodically restricted profit repatriations, and the board should treat any assumed remittance timing as contingent on regulatory approval — a material political risk given the subsidiary's size relative to group earnings. The assumed PPP-based forecast of the VND/USD rate rests on inflation-differential parity, yet Vietnam's inflation has historically been more volatile than the assumed rate, meaning the converted remittance in year 2 could differ materially if parity does not hold.

Raw inputs (appraisal date):
- Base spot rate (VND per USD) at appraisal date: 25,000
- US (home) inflation rate (assumed): 2.5%
- Vietnam (foreign) inflation rate (assumed): 6.0%
- Subsidiary PBIT: VND 520,000 million
- Vietnamese corporate tax rate: 20%
- Depreciation (non-cash add-back): VND 85,000 million
- Capital expenditure: VND 110,000 million
- Increase in working capital: VND 30,000 million
- Subsidiary pre-tax cost of debt: 7.5%
- Subsidiary market value of debt: VND 400,000 million
- Subsidiary net new borrowing in year 2: VND 0 million
- Fraction of subsidiary FCFE remitted in year 2: 60%
- Annual growth of foreign cash flows (money terms): 0%
- Remittance made in year 2
- Host withholding tax on remittances: 5%
- US parent tax rate on foreign taxable profit: 21%
- Bilateral treaty makes withholding tax creditable: Yes
- Parent's own FCFE (USD million): 38
- Proposed group total dividend (USD million): 55

### model_answer

**Multinational dividend capacity and policy**

**Assumptions:** group dividend capacity is the CASH the parent can pay — its own free cash flow to equity plus the cash the overseas subsidiary can remit. 60% of the subsidiary's FCFE is remitted in year 2 at the PPP forecast spot of 26736.4664 VND/USD. The foreign corporate tax rate 20.00% is **at or above** the parent's 21.00% home rate, so the credit for foreign corporate tax covers the whole home liability and there is **NO additional home tax** (max(0, 21.00% − 20.00%) = 0); withholding tax at 5.00% on remittances is creditable against the home liability under the bilateral treaty.

**Step 1 — Subsidiary free cash flow to equity (foreign)**

Subsidiary FCFE = FCFF − after-tax interest + net new borrowing = **VND 337000.0m**.

**Step 2 — Remittance to the parent (net of withholding + differential home tax, converted to home)**

Remitted (foreign) = VND 337000.0m × 60% = VND 202200.0m; less withholding VND 10110.0m (no additional home tax — foreign corporate rate ≥ home rate) = VND 192090.0m; ÷ 26736.4664 = **USD 7.2m**.

**Step 3 — Group dividend capacity**

Group capacity = parent FCFE USD 38.0m + remitted subsidiary FCFE USD 7.2m = **USD 45.2m**.

**Step 4 — Sustainability of the proposed dividend**

Against the proposed group dividend of USD 55.0m, the capacity **falls short** of the proposed dividend by USD 9.8m, so the proposed dividend is **not covered** and would have to draw on reserves or new finance — a red flag on sustainability.

**Step 5 — Advice to the board**

The most fragile assumption in this analysis is whether PPP-based parity will hold for the VND over the two-year horizon: Vietnam's inflation has historically been subject to sudden policy-driven spikes, and a sharper-than-assumed depreciation of the VND would reduce the USD value of VinaCircuit's remittance materially, eroding the group's dividend capacity. Equally challenging is the timing and regulatory certainty of the remittance itself — Vietnam's State Bank has previously invoked exchange-control powers to defer or cap profit repatriations, and the board should require written confirmation from Vietnamese legal counsel that no such restriction is in force before committing to the proposed dividend. The durability of VinaCircuit's operating profit rests on sustained export orders for printed circuit board assemblies, a demand base that is sensitive to global electronics-cycle downturns, and the board should stress-test the PBIT against a demand-contraction scenario. On the tax side, the creditability of the withholding tax under the bilateral treaty reduces the double-tax burden, but the board should confirm the treaty's current operative status and that VinaCircuit's profit classification qualifies for credit treatment. Finally, the board should consider whether consistently paying out close to the full group capacity leaves insufficient retained liquidity to fund VinaCircuit's capital expenditure programme without recourse to additional external borrowing.

*Reconciliation: parent USD 38.0m + remitted USD 7.2m = capacity USD 45.2m; capacity − proposed USD 55.0m = a shortfall of USD 9.8m ✓*

### hint

Before you can compare capacity to the proposed dividend, check whether you have applied the credit method correctly — specifically, whether the relationship between the foreign corporate tax rate and the parent's home rate means any additional home tax is actually owed on the grossed-up remittance, or whether the withholding tax alone is what remains to reduce the cash received.

### full_reveal

The misconception this drill exposes is ABANDONED-AFTER-CALC: candidates often work through the remittance arithmetic and then stop, leaving the sustainability verdict — and the board-level advice — unwritten, surrendering the linked marks that the question is actually rewarding. The deeper technical trap is treating the credit method as a simple withholding-tax deduction, without first checking whether the foreign corporate rate already extinguishes the home liability; failing to run that comparison means the cash remittance figure is wrong before you ever reach the capacity total, and every downstream number inherits that error at its source — so if your remittance figure is wrong, carry it forward consistently, because where your subsequent method holds, those marks still score, but OFR credit is conditional on correct use, not automatic. At the boardroom bar, a calculated capacity figure is the floor, not the ceiling: the board needs to know whether the proposed dividend is covered, what the shortfall or surplus implies for reserves or new finance, and which assumptions — PPP parity, remittance regulatory freedom, treaty status — are fragile enough to warrant stress-testing before the dividend is committed. The correct mental model is: credit method → resolve the grossing-up and offset sequence first; then build group capacity as parent FCFE plus net remittance; then deliver a recommendation with the assumption challenges that a senior adviser would insist the board confront.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "parent_fcfe": 38,
    "forecast_spot": 26736.46638905415,
    "remit_fraction": 0.6,
    "proposed_dividend": 55,
    "add_tax_rate_effective": 0.009999999999999981
  },
  "components": [
    {
      "unit": "VNDm",
      "label": "Subsidiary free cash flow to equity (foreign)",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "sub_fcfe",
      "working_steps": [
        "FCFE = FCFF − Kd·D(1−t) + net new borrowing (subsidiary, foreign)"
      ],
      "expected_value": 337000
    },
    {
      "unit": "USDm",
      "label": "Subsidiary remittance received by the parent (home, net of WHT + differential home tax)",
      "recompute": "sub_remit_convert",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "sub_fcfe"
      ],
      "component_id": "sub_remit_home",
      "working_steps": [
        "= (FCFE 337000.0 × remitted 60% − WHT − differential home tax) ÷ spot 26736.4664"
      ],
      "expected_value": 7.18456946422214
    },
    {
      "unit": "USDm",
      "label": "Parent free cash flow to equity (home currency)",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "component_id": "parent_fcfe",
      "working_steps": [
        "the parent's own dividend capacity (home currency)"
      ],
      "expected_value": 38
    },
    {
      "unit": "USDm",
      "label": "Group dividend capacity (home currency)",
      "recompute": "capacity_add_parent",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "sub_remit_home",
        "parent_fcfe"
      ],
      "component_id": "total_capacity",
      "working_steps": [
        "= parent FCFE 38.0 + remitted subsidiary FCFE"
      ],
      "expected_value": 45.184569464222136
    },
    {
      "unit": "USDm",
      "label": "Capacity surplus over the proposed dividend (signed)",
      "recompute": "capacity_minus_proposed",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "total_capacity"
      ],
      "component_id": "capacity_surplus",
      "working_steps": [
        "= dividend capacity − proposed dividend 55.0"
      ],
      "expected_value": -9.815430535777864
    }
  ]
}
```

---

