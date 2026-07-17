# AFM international-finance batch — blind adversarial review pack

**Calculator #10: international investment & financing (`lib/acca/international.ts`). 4 drills, `status=candidate`, `published=false`, `paper_code=AFM`. AT THE REVIEW GATE — nothing flips without co-founder recompute + this blind round + adjudication. CURRENT STATE — regenerated after every fix round.**

Doctrine: code owns EVERY figure AND every figure-vs-figure verdict — the forecast FX curve (DERIVED by parity, never asserted), every conversion, the credit-method double-tax, the NPV, the decision FLIP under an alternative FX path, the sustainability verdict. The model authored PROSE only — never a forecast rate, a converted figure, an NPV, a capacity, or an inequality. The calculator COMPOSES the FCFF build (`fcffFromBuild`, `valuation.ts`) and the discounting (`discountFactor`, `npv.ts`) ONE-WAY, no back-imports (composition ruling).

House conventions (Grant-ruled Step-0, 2026-07-17):
- **Forward FX curve = PPP** (relative INFLATION) for every B5 drill — the exam-orthodox route for translating a multi-year cash-flow stream. `Sₜ = S₀ · ((1+r_foreign)/(1+r_home))ᵗ`, geometric single-differential. IRP (interest) is reserved for short-horizon forwards (E2) and is engine-supported + fixture-tested only. Rate quote: FOREIGN units per 1 HOME unit; convert foreign→home by DIVISION.
- **Double-tax = credit method, home-liability cap.** Additional home tax rate = **max(0, home − withholding)** — the credit never exceeds the home liability, never a refund of excess host withholding. Net-of-both-taxes remittance factor = (1−w) − max(0, h−w).
- **Home-currency method** (convert-then-discount) is the taught primary.
- **A6a (K4) is a Section-A LO — DIRECT-LINK-ONLY serve, EXCLUDED from all B-tier / coverage counts and every public claim until Section A surfaces (HARD RULE, Grant).**

Money components use relative tolerance ±0.5%; forecast spots display at 4 dp (relative ±0.5%). **All gates pass** — the 6 base/pattern gates (schema self-consistency + tolerance + OFR-wiring; answer↔schema figure integrity at 1/2/3/4 dp; **distinct-factor** seeded-OFR carry-through; P4 jurisdiction + frozen-market-facts; P5 completeness; P6 loss-relief) **PLUS the three NEW family gates**: **GATE 12 parity-consistency** (every forecast spot reconciles to the STATED PPP basis from S₀ + the inflation differential — a forward that does not derive from stated inputs fails), **GATE 13 currency/unit-scale integrity** (home × spot = foreign, consistent scale — the IDR-rendering failure class), **GATE 14 double-tax cap** (additional home tax = max(0, h−w), never negative).

## Kinds → ids → code-computed verdicts
- **home_currency_standard (K1)** `6f23f2eb-6759-4c16-8f90-faf68b2138c9` — MAD→USD NPV = **USD +49.5m** → ACCEPT (additional home tax 13.5%)
- **exchange_rate_sensitivity (K2)** `f3ee86e4-286e-4af9-b6dd-4aae64ddcb72` — base **GBP +0.1m** (accept) → alternative **GBP −6.4m** (reject) — the decision **FLIPS**
- **restricted_remittance (K3, B5b + B5c dual)** `27b37313-652d-454f-88c2-047106145f28` — NPV **EUR +2.8m** with the controls vs **EUR +5.6m** free — the restriction costs **EUR −2.8m** (half the value)
- **multinational_dividend_capacity (K4, A6a — DIRECT-LINK-ONLY)** `36928bae-82a8-467d-a672-a44f94e8cc5f` — group capacity **USD 25.2m** vs proposed **USD 34.0m** → **NOT sustainable** (subsidiary contributes 26%)

## ⚠ SELF-FLAGS (surfaced for the reviewers — decide these)
- **K2 (Egypt) base NPV is thin (+0.1m).** It is comfortably above zero and the alternative FX path flips it clearly negative (−6.4m), so the sensitivity teaching point (a modest change in the exchange-rate assumption reverses the decision) lands sharply — but a reviewer may prefer a larger positive base for the accept case. Judge whether the razor-thin base helps (a sharper flip) or should be widened.
- **K3 (China) is positive both ways (+2.8m with controls, +5.6m free).** Ruled acceptable: the exchange controls strip HALF the value (−2.8m), a material B5c illustration; the earlier Argentina attempt (marginal reject, trivial cost) was rejected in favour of this "good project the controls make materially worse" framing. Confirm the framing is the one wanted, or ask for the stronger flip (free-accept → blocked-reject).

## ⛔ CLOSED RULINGS — do NOT re-raise (spend hostility on open questions, not settled ones)
- **Parity basis = PPP for B5** — relative inflation is the orthodox multi-year-translation route; IRP is E2/short-horizon and deliberately not used here. Adjudicated (Step-0 #1); do not propose switching a B5 drill to IRP.
- **Double-tax = credit method only** — exemption method is journalled as a future kind, deliberately out of scope (Step-0 #4).
- **Home-currency method primary** — the foreign-currency route reconciles by construction and is not separately graded this batch (Step-0 #2).
- **A6a (K4) direct-link-only + excluded from B-tier counts** — a Section-A LO riding batch #10 by design; not a coverage claim (Step-0 #5, HARD RULE).
- **OFR wording** — "the error is charged once, at its source" is deliberate HOUSE wording tied to the reviewer override log. Closed; do not propose softening.
- **Forecast rates are DERIVED, never asserted** — the model never states a forward; GATE 12 enforces it. Not a gap.

**Review method:** fresh model, no project context, AFM syllabus PDF attached; FULL hostility on drill 1 (K1, first-of-family), spot-check siblings WITH full recomputation of every figure. Hunt for semantic errors a deterministic gate cannot catch: a parity forecast mis-stated, a conversion inverted (multiply vs divide), the credit-method cap mis-explained, the remittance-blocking story incoherent, the dividend-capacity flow mis-plumbed (subsidiary FCFE → remittance → group capacity), a scenario-fact drift, an invented statute/treaty.

---

## Drill — home_currency_standard (K1)  ·  `6f23f2eb-6759-4c16-8f90-faf68b2138c9`
- LO B5b · mode quantitative · command_verb "forecast" · marks_guide 10
- CODE-COMPUTED: MAD→USD NPV = **USD +49.5m** → ACCEPT (additional home tax 13.5%)

### question

Forecast the annual free cash flows of the Casablanca plant in MAD, convert them to USD using PPP-derived exchange rates, and determine the USD net present value of the investment for Vertex Driveline Corporation's board, applying the credit method to eliminate double taxation.

### context_text

Vertex Driveline Corporation, a US-based automotive-components group listed on NASDAQ, is evaluating a greenfield stamping-and-assembly plant — to be operated through its Moroccan subsidiary, Atlas Driveline SARL — in the Casablanca–Settat industrial zone. The plant will supply precision driveshaft housings to European OEMs under a four-year off-take agreement, though the board acknowledges that OEM contract renewals in North Africa carry real execution risk and that the assumed real growth may not persist if customer sourcing strategies shift. Morocco imposes a withholding tax on remitted profits and, while the dirham has historically been managed within a band, the board should not assume that relative purchasing-power parity will hold precisely — the dirham's band regime may cause the realised spot to diverge from the PPP forecast, creating additional exchange risk.

Raw inputs (at the appraisal date):
• Base spot rate (MAD per USD): 10.20
• Home (USD) inflation assumed: 3.0%
• Foreign (MAD) inflation assumed: 4.5%
• Parent money cost of capital (discount rate): 11.0%
• Foreign corporate tax rate (Morocco): 28.0%
• Host withholding tax rate: 7.5%
• US parent tax rate: 21.0%
• Project life: 4 years
• Initial outlay (MAD millions): 1,200
• Base-year PBIT (MAD millions): 820
• Depreciation / non-cash add-back (MAD millions): 310
• Capital expenditure (MAD millions): 145
• Increase in working capital (MAD millions): 55
• Real annual growth of foreign cash flows: 2.0%

### model_answer

**International investment appraisal — net present value to the parent**

**Assumptions:** project cash flows arise in MAD; the maintainable base-year foreign free cash flow is MAD 700.4m growing at 2.00% a year; forecast spot rates are derived by PPP parity from the stated base spot 10.2000 MAD/USD; converted cash flows are discounted at the parent's 11.00% money cost of capital. Remittances suffer host withholding at 7.50%; the parent's 21.00% home tax is charged with a credit for the host tax, so the additional home tax is max(0, 21.00% − 7.50%) = **13.50%** (credit method, capped at the home liability).

**Step 1 — Forecast exchange rates (parity, never assumed)**

| Year | Forecast spot (MAD/USD) |
|------|------|
| 1 | 10.3485 |
| 2 | 10.4993 |
| 3 | 10.6522 |
| 4 | 10.8073 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

**Step 2 — Foreign cash flows, remittance, and conversion to home currency**

| Year | Foreign cash flow | Remitted net of tax (MAD) | Spot | Home cash flow |
|------|------|------|------|------|
| 1 | MAD 700.4m | MAD 553.3m | 10.3485 | USD 53.5m |
| 2 | MAD 714.4m | MAD 564.4m | 10.4993 | USD 53.8m |
| 3 | MAD 728.7m | MAD 575.7m | 10.6522 | USD 54.0m |
| 4 | MAD 743.3m | MAD 587.2m | 10.8073 | USD 54.3m |

*(Remitted net of tax = foreign cash flow × the net-of-both-taxes factor 0.7900; converted at that year's forecast spot.)*

**Step 3 — Present values and NPV**

| Year | Home cash flow | DF @ 11.00% | Present value |
|------|------|------|------|
| 0 | USD -117.6m | 1.000 | USD -117.6m | *(foreign outlay MAD 1200.0m ÷ 10.2000)*
| 1 | USD 53.5m | 0.901 | USD 48.2m |
| 2 | USD 53.8m | 0.812 | USD 43.6m |
| 3 | USD 54.0m | 0.731 | USD 39.5m |
| 4 | USD 54.3m | 0.659 | USD 35.8m |

**NPV to the parent = USD 49.5m.**

**Step 4 — Decision**

The NPV of USD 49.5m is **positive**, so on these exchange-rate and fiscal assumptions the project **adds value to the parent and should be accepted**.

**Step 5 — Advice to the board**

The most fragile assumption in this appraisal is whether relative purchasing-power parity will track the MAD/USD rate with the precision the model requires: Morocco's managed-band exchange regime means the dirham may not depreciate in line with the inflation differential, so the realised spot could be appreciably stronger or weaker than the PPP forecast, directly altering each year's converted cash flow. The board should also scrutinise the durability of the base-year PBIT, which rests on a four-year OEM off-take agreement whose renewal is explicitly uncertain; if European OEM customers reassign sourcing at the end of the contract window, the real growth assumption embedded in the MAD cash flows will not materialise. Morocco's withholding tax on remitted profits, combined with the US credit method, creates a residual fiscal drag on every remittance, and any future revision to the host withholding rate — upward — would erode returns without any offsetting credit against US corporate tax. The board should therefore require a sensitivity run on both the spot rate and the PBIT growth rate, and should confirm that Atlas Driveline SARL's financing structure allows full and timely remittance of dividends without exchange-control restriction.

*Reconciliation: Σ present values USD 167.1m − home outlay USD 117.6m = NPV USD 49.5m ✓*

### hint

Check whether you derived each year's forecast exchange rate from PPP — using the inflation differential, not a flat assumption — before applying the credit-method tax calculation to confirm the net-of-both-taxes factor you used to convert MAD remittances into USD.

### full_reveal

The dominant misconception in international NPV drills is UNDEVELOPED-ASSUMPTION: candidates list the credit method and PPP as inputs but never interrogate what they actually do to the cash flows, leaving the board with a number and no steer on how fragile it is. PPP is not a guarantee — it is a parity condition that may diverge materially from realised spots when the host currency operates within a managed band, so treating forecast exchange rates as settled facts rather than assumptions to be stress-tested is likely to mislead the board about the reliability of each year's converted cash flow. The credit-method tax layer compounds this: the net-of-both-taxes factor is mechanically derived from the interaction of host withholding and home corporate rates, and candidates who list those rates without working through the credit cap (home liability less the withholding already suffered) will mis-state every post-tax remittance. If your exchange rates or tax factor differ from the model answer, carry your own figures forward consistently into the discounting step — where the NPV method is applied correctly downstream, those marks may still score, with any error charged once at its source. The boardroom move is then to name the two most fragile assumptions — the PPP track and the PBIT growth rate — and tell the board what sensitivity runs are needed before the decision is final.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "base_spot": 10.2,
    "rate_home": 0.03,
    "net_factor": 0.79,
    "home_outlay": 117.64705882352942,
    "add_tax_rate": 0.135,
    "rate_foreign": 0.045,
    "discount_rate": 0.11
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
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 10.2000 × 1.01456 = 10.3485"
      ],
      "expected_value": 10.348543689320387
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
        "S2 = S1 × 1.01456 = 10.4993"
      ],
      "expected_value": 10.499250636252238
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
        "S3 = S2 × 1.01456 = 10.6522"
      ],
      "expected_value": 10.652152344547172
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
        "S4 = S3 × 1.01456 = 10.8073"
      ],
      "expected_value": 10.807280776749318
    },
    {
      "unit": "USDm",
      "label": "Home-currency net cash flow, year 1",
      "recompute": "home_cf_convert_y1",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_1"
      ],
      "component_id": "home_cf_1",
      "working_steps": [
        "= foreign remittance 553.3 (net of withholding + home tax) ÷ spot 10.3485"
      ],
      "expected_value": 53.46800637958534
    },
    {
      "unit": "USDm",
      "label": "Home-currency net cash flow, year 2",
      "recompute": "home_cf_convert_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_2"
      ],
      "component_id": "home_cf_2",
      "working_steps": [
        "= foreign remittance 564.4 (net of withholding + home tax) ÷ spot 10.4993"
      ],
      "expected_value": 53.7545334951123
    },
    {
      "unit": "USDm",
      "label": "Home-currency net cash flow, year 3",
      "recompute": "home_cf_convert_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_3"
      ],
      "component_id": "home_cf_3",
      "working_steps": [
        "= foreign remittance 575.7 (net of withholding + home tax) ÷ spot 10.6522"
      ],
      "expected_value": 54.04259606695214
    },
    {
      "unit": "USDm",
      "label": "Home-currency net cash flow, year 4",
      "recompute": "home_cf_convert_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_4"
      ],
      "component_id": "home_cf_4",
      "working_steps": [
        "= foreign remittance 587.2 (net of withholding + home tax) ÷ spot 10.8073"
      ],
      "expected_value": 54.33220232338747
    },
    {
      "unit": "USDm",
      "label": "Net present value (to the parent, home currency)",
      "recompute": "intl_npv_sum_less_outlay",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
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
      "expected_value": 49.456486597628505
    }
  ]
}
```

---

## Drill — exchange_rate_sensitivity (K2)  ·  `f3ee86e4-286e-4af9-b6dd-4aae64ddcb72`
- LO B5a · mode quantitative · command_verb "assess" · marks_guide 15
- CODE-COMPUTED: base **GBP +0.1m** (accept) → alternative **GBP −6.4m** (reject) — the decision **FLIPS**

### question

Assess the impact on the home-currency NPV of the Egyptian mobile-telecoms project under both the base exchange-rate assumption and a sharper EGP devaluation scenario, and assess whether the investment decision changes between the two cases.

### context_text

CrestWave Communications plc, a UK-headquartered mobile-telecoms group, is appraising a four-year greenfield network build in Egypt through its wholly owned subsidiary, CrestWave Egypt S.A.E. The Egyptian mobile market offers strong subscriber-growth prospects, yet the EGP has a history of administrative devaluation under IMF-linked reform programmes, raising genuine doubt about whether purchasing-power parity will faithfully track the actual exchange-rate path — the board must decide whether the project survives a materially sharper depreciation. Egypt's foreign-exchange control environment also means that any future restriction on profit remittances cannot be ruled out, making the durability of repatriated cash flows a second fragility the board should stress-test before committing capital.

Raw inputs (at the appraisal date):
- Base spot rate: EGP 48.50 per GBP 1
- UK (home) inflation: 3% p.a.
- Egypt (foreign) inflation — BASE assumption: 9% p.a.
- Egypt (foreign) inflation — ALTERNATIVE assumption (sharper EGP devaluation): 25% p.a.
- Project life: 4 years
- Initial outlay: EGP 1,200 m
- Annual PBIT (maintainable base-year): EGP 720 m
- Annual depreciation (non-cash add-back): EGP 180 m
- Annual capital expenditure: EGP 90 m
- Annual increase in working capital: EGP 45 m
- Foreign corporate tax rate: 22.5%
- Egyptian withholding tax on remittances: 10%
- UK parent tax rate: 25%
- Parent's home money cost of capital (discount rate): 12%
- Real growth of foreign cash flow: 0%

### model_answer

**Impact of alternative exchange-rate assumptions on project value**

**Assumptions:** the project's EGP cash flows are unchanged; only the forecast-FX path (the PPP-parity foreign rate) differs between the base case and a sharper devaluation of the Egyptian pound. Both NPVs are to the parent, discounted at 12.00%. Remittances suffer host withholding at 10.00%; the parent's 25.00% home tax is charged with a credit for the host tax, so the additional home tax is max(0, 25.00% − 10.00%) = **15.00%** (credit method, capped at the home liability).

**Step 1 — Base exchange-rate assumption**

| Year | Forecast spot (EGP/GBP) |
|------|------|
| 1 | 51.3252 |
| 2 | 54.3151 |
| 3 | 57.4790 |
| 4 | 60.8273 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

NPV under the base assumption = **GBP 0.1m** → accept.

**Step 2 — Alternative exchange-rate assumption (a sharper devaluation of the Egyptian pound)**

| Year | Forecast spot (EGP/GBP) |
|------|------|
| 1 | 58.8592 |
| 2 | 71.4311 |
| 3 | 86.6882 |
| 4 | 105.2042 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

NPV under the alternative assumption = **GBP -6.4m** → reject.

**Step 3 — Sensitivity of the decision**

Moving from the base assumption to a sharper devaluation of the Egyptian pound changes the NPV by **GBP -6.5m** (from GBP 0.1m to GBP -6.4m); the recommendation **FLIPS**: accept under the base assumption, reject under a sharper devaluation of the Egyptian pound. The decision is **not robust** to the exchange-rate assumption.

**Step 4 — Advice to the board**

The most fragile assumption in this appraisal is that the EGP will depreciate in line with purchasing-power parity: Egypt's history of managed devaluation events — rather than smooth, inflation-driven drift — means the actual exchange-rate path could diverge sharply and suddenly from any parity-derived forecast, eroding the GBP value of remittances far faster than the base case implies. The board should also scrutinise the maintainability of the base-year PBIT figure of EGP 720 million across all four years: subscriber growth assumptions embedded in that figure are vulnerable to competitive entry, regulatory tariff caps, and macroeconomic deterioration in Egypt, any of which would reduce the EGP cash flows before the exchange-rate effect is even applied. Egypt's foreign-exchange control environment introduces a remittance-blockage risk that the model does not capture — the board should require confirmation that the relevant Egyptian regulatory authority permits full annual profit remittances for the project's duration, and should model the effect of even partial blockage. Finally, given that the decision flips under the alternative inflation scenario, the board should commission independent country-risk and currency forecasts from an Egyptian investment bank before approving the capital commitment, and should consider whether a phased capital outlay rather than a single upfront EGP 1,200 million commitment would reduce exposure if the devaluation trajectory deteriorates early in the project life.

*Reconciliation: base NPV GBP 0.1m, alternative NPV GBP -6.4m, swing GBP -6.5m; decision flips ✓*

### hint

You've converted the EGP cash flows into GBP and computed two NPVs — now check whether your advice to the board changes between those two cases, and if it does, say so explicitly and explain what that flip tells a decision-maker about the fragility of the base-case assumption.

### full_reveal

The classic misconception here is FENCE-SITTING: candidates compute both NPVs diligently, note that one is positive and one is negative, and then stop — leaving the board with two numbers and no instruction. That is a calculation report, not financial advice. The error is structural: the command verb "assess" demands a verdict on whether the investment decision is robust across scenarios, not merely a side-by-side display of results. The correct mental model is that sensitivity analysis only earns its marks when the analyst names whether the decision flips, calls the base assumption the source of fragility, and tells the board what that means for the capital commitment — here, Egypt's history of managed devaluation events suggests the actual exchange-rate path may diverge sharply from any smooth PPP-derived forecast, making the remittance-value assumption the most exposed variable in the model. If your own PPP spots or tax computation differed from the model answer, carry your figures forward consistently into the swing calculation and the recommendation: where your downstream method is correct — comparing the two NPVs, identifying a flip, advising on robustness — those marks still score, and the arithmetic error is charged once at its source.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "base_spot": 48.5,
    "rate_home": 0.03,
    "home_outlay": 24.742268041237114,
    "rate_foreign": 0.09,
    "discount_rate": 0.12,
    "alt_rate_foreign": 0.25
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
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 48.5000 × 1.05825 = 51.3252"
      ],
      "expected_value": 51.3252427184466
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
        "S2 = S1 × 1.05825 = 54.3151"
      ],
      "expected_value": 54.31506268262796
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
        "S3 = S2 × 1.05825 = 57.4790"
      ],
      "expected_value": 57.47904691656745
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
        "S4 = S3 × 1.05825 = 60.8273"
      ],
      "expected_value": 60.827340911707296
    },
    {
      "unit": "GBPm",
      "label": "NPV under the base exchange-rate assumption",
      "recompute": "intl_npv_from_fx",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_1",
        "fx_2",
        "fx_3",
        "fx_4"
      ],
      "component_id": "npv",
      "working_steps": [
        "= Σ (foreign remittance ÷ forecast spot × DF @ 12.00%) − home outlay 24.7"
      ],
      "expected_value": 0.08828272820027827
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
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 48.5000 × 1.21359 = 58.8592"
      ],
      "expected_value": 58.85922330097087
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
        "S2 = S1 × 1.21359 = 71.4311"
      ],
      "expected_value": 71.4310962390423
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
        "S3 = S2 × 1.21359 = 86.6882"
      ],
      "expected_value": 86.68822359107077
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
        "S4 = S3 × 1.21359 = 105.2042"
      ],
      "expected_value": 105.20415484353248
    },
    {
      "unit": "GBPm",
      "label": "NPV under the alternative exchange-rate assumption",
      "recompute": "intl_npv_from_fx",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "alt_fx_1",
        "alt_fx_2",
        "alt_fx_3",
        "alt_fx_4"
      ],
      "component_id": "alt_npv",
      "working_steps": [
        "= Σ (foreign remittance ÷ forecast spot × DF @ 12.00%) − home outlay 24.7"
      ],
      "expected_value": -6.389374657184831
    }
  ]
}
```

---

## Drill — restricted_remittance (K3, B5b + B5c dual)  ·  `27b37313-652d-454f-88c2-047106145f28`
- LO B5b · mode quantitative · command_verb "forecast" · marks_guide 10
- CODE-COMPUTED: NPV **EUR +2.8m** with the controls vs **EUR +5.6m** free — the restriction costs **EUR −2.8m** (half the value)

### question

Forecast the annual free cash flows in CNY and EUR, convert at parity-derived exchange rates, apply the restricted-remittance rules and double-tax credit method, and determine the home-currency NPV of the project under both free-remittance and restricted-remittance conditions.

### context_text

Veridian Chemie AG, a Frankfurt-headquartered speciality-chemicals group, is appraising a four-year greenfield project in Zhejiang Province, China, to be operated through a wholly-owned subsidiary, Veridian Zhejiang Chemicals Co. Ltd. The project is structurally attractive — proprietary adhesive formulations command stable industrial demand — but China's cross-border capital-account rules give the board pause: the Chinese authorities currently reserve the right to block a material share of each year's remittable profit, and there is no guarantee that the purchasing-power-parity assumption underlying the EUR/CNY forecast will hold if the People's Bank of China manages the renminbi band more tightly than the inflation differential would imply. The durability of the adhesive margins is also uncertain, given that domestic Chinese competitors are expanding capacity aggressively, threatening the pricing power on which the cash-flow projections rest.

Raw inputs (appraisal date):
- Initial outlay: CNY 480 m
- Annual PBIT (base, maintainable): CNY 310 m
- Depreciation (annual, non-cash add-back): CNY 48 m
- Capital expenditure (annual maintenance): CNY 20 m
- Increase in working capital (annual): CNY 8 m
- Project life: 4 years
- Foreign (CNY) corporate tax rate: 25%
- Host withholding tax on remittances: 10%
- Parent (EUR) tax rate: 30%
- Base spot rate at appraisal date: CNY 7.80 per EUR 1
- Home (EUR) inflation assumed: 2.5%
- Foreign (CNY) inflation assumed: 4.5%
- Foreign real cash-flow growth: 0%
- Parent's EUR money cost of capital (discount rate): 11%
- Blocked fraction (share of each year's cash flow blocked): 30%
- Local reinvestment rate on blocked funds: 3%

### model_answer

**International appraisal with a remittance restriction**

**Assumptions:** 30% of each year's CNY cash flow is blocked from remittance and reinvested locally at 3.00%, released in year 4; the free portion is remitted when earned. Forecast spots by PPP parity; home discount rate 11.00%. Remittances suffer host withholding at 10.00%; the parent's 30.00% home tax is charged with a credit for the host tax, so the additional home tax is max(0, 30.00% − 10.00%) = **20.00%** (credit method, capped at the home liability).

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
| 1 | CNY 252.5m | CNY 123.7m | 7.9522 | EUR 15.6m | EUR 14.0m |
| 2 | CNY 252.5m | CNY 123.7m | 8.1074 | EUR 15.3m | EUR 12.4m |
| 3 | CNY 252.5m | CNY 123.7m | 8.2656 | EUR 15.0m | EUR 10.9m |
| 4 | CNY 252.5m | CNY 123.7m | 8.4268 | EUR 14.7m | EUR 9.7m |

**Step 3 — Blocked funds accumulated and released in year 4**

Blocked cash reinvested locally at 3.00% accumulates to **CNY 316.9m** by year 4; remitted then (net of tax) and converted at 8.4268 = **EUR 26.3m** (PV EUR 17.3m).

**Step 4 — NPV and the cost of the restriction**

NPV with the restriction = **EUR 2.8m** (accept). By comparison the restriction **reduces** the NPV by EUR 2.8m versus free remittance (EUR 5.6m).

**Step 5 — Advice to the board**

The most fragile assumption is that the EUR/CNY rate will track the inflation differential faithfully: if the People's Bank of China manages the renminbi within a tight administrative band, the actual spot rate at each remittance date could differ materially from the parity forecast, and the board should require a sensitivity check across a range of managed-rate scenarios before committing capital. The 30% blocking fraction is a regulatory fact at the appraisal date, but exchange-control regimes can tighten without notice, so the board should stress-test the NPV at a higher blocked fraction and a longer release horizon. The maintainable PBIT assumption rests on pricing power that domestic Chinese competitors are actively challenging, meaning the cash flows could erode before the project recovers its outlay; the board should require a downside case with a lower PBIT. To extract value from the blocked funds, Veridian Chemie should consider charging Veridian Zhejiang Chemicals a market-rate management fee or technology royalty — flows that are typically classified as services income and not subject to the same capital-account restrictions as profit remittances — or routing intercompany financing through a parallel loan structure so that equivalent value is released to the parent without a direct cross-border transfer. Local reinvestment of blocked funds into capacity or working capital within the subsidiary may also create option value, provided the board is satisfied that the Chinese operation's growth prospects justify it.

*Reconciliation: free-flow PVs + released-funds PV − home outlay EUR 61.5m = NPV EUR 2.8m; vs free-remittance NPV EUR 5.6m ✓*

### hint

Before you discount anything, check whether you have applied the double-tax credit method correctly to the free portion — specifically, have you worked out what additional home tax is payable after crediting the host withholding tax, and have you then separately accumulated the blocked funds at the local reinvestment rate and converted them at the year-4 parity spot rather than the year they were earned?

### full_reveal

The classic misconception here is ABANDONED-AFTER-CALC: candidates grind through the PPP exchange-rate forecasts and convert the cash flows, then stop — handing in a table of home-currency figures without a recommendation on whether the project should proceed and without addressing what the remittance restriction actually costs the parent. That is only the floor of the answer, not the ceiling. The deeper plumbing error sits in the blocked-funds treatment: many candidates either discount the blocked amount at the home rate as though it were received in the year it was earned, or forget to accumulate it at the local reinvestment rate before converting and discounting — both mistakes mis-state the timing of value recovery, which is the entire economic point of the restriction. On the tax side, the double-tax credit method caps the additional home liability at the excess of the home rate over the withholding rate; candidates who apply home tax to the gross remittance without crediting the host tax are double-counting the tax burden, which is why the credit mechanism exists. If your parity rates or accumulated-funds figure is slightly off, carry it forward consistently into your NPV — where your discounting method is sound, those marks still score, because the examiner charges the error once at its source; that credit is conditional on correct subsequent use of your own figure, not automatic. Finally, the board needs to hear a verdict: the parity assumption is the most fragile input in this appraisal, and the advice should name what would have to be stress-tested — managed exchange-rate scenarios, a higher blocked fraction, a lower PBIT — before capital is committed.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "base_spot": 7.8,
    "rate_home": 0.025,
    "net_factor": 0.7000000000000001,
    "home_outlay": 61.53846153846154,
    "add_tax_rate": 0.19999999999999998,
    "rate_foreign": 0.045,
    "discount_rate": 0.11,
    "blocked_fraction": 0.3,
    "local_reinvest_rate": 0.03
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
        "kind": "relative"
      },
      "depends_on": [
        "fx_1"
      ],
      "component_id": "home_cf_1",
      "working_steps": [
        "= free remittance 123.7 (net of tax) ÷ spot 7.9522"
      ],
      "expected_value": 15.558597104649737
    },
    {
      "unit": "EURm",
      "label": "Home cash flow from the remitted (free) portion, year 2",
      "recompute": "home_cf_convert_y2",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_2"
      ],
      "component_id": "home_cf_2",
      "working_steps": [
        "= free remittance 123.7 (net of tax) ÷ spot 8.1074"
      ],
      "expected_value": 15.260824911259311
    },
    {
      "unit": "EURm",
      "label": "Home cash flow from the remitted (free) portion, year 3",
      "recompute": "home_cf_convert_y3",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_3"
      ],
      "component_id": "home_cf_3",
      "working_steps": [
        "= free remittance 123.7 (net of tax) ÷ spot 8.2656"
      ],
      "expected_value": 14.968751707216072
    },
    {
      "unit": "EURm",
      "label": "Home cash flow from the remitted (free) portion, year 4",
      "recompute": "home_cf_convert_y4",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_4"
      ],
      "component_id": "home_cf_4",
      "working_steps": [
        "= free remittance 123.7 (net of tax) ÷ spot 8.4268"
      ],
      "expected_value": 14.682268420953562
    },
    {
      "unit": "CNYm",
      "label": "Blocked funds released in year 4 (foreign, accumulated locally)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "blocked_release",
      "working_steps": [
        "Σ blocked cash × (1 + local rate)^(4 − t) accumulated to year 4"
      ],
      "expected_value": 316.90974525
    },
    {
      "unit": "EURm",
      "label": "Home cash flow from the released blocked funds, year 4",
      "recompute": "home_cf_release_convert",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "blocked_release",
        "fx_4"
      ],
      "component_id": "home_cf_release",
      "working_steps": [
        "= released 316.9 × net-of-tax factor 0.7000 ÷ spot 8.4268"
      ],
      "expected_value": 26.325057680206584
    },
    {
      "unit": "EURm",
      "label": "Net present value with the remittance restriction (home currency)",
      "recompute": "intl_remit_npv",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
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
        "= Σ (free home cash flow × DF) + released home cash × DF @ year 4 − home outlay 61.5"
      ],
      "expected_value": 2.82213856450851
    }
  ]
}
```

---

## Drill — multinational_dividend_capacity (K4, A6a — DIRECT-LINK-ONLY)  ·  `36928bae-82a8-467d-a672-a44f94e8cc5f`
- LO A6a · mode quantitative · command_verb "determine" · marks_guide 15
- CODE-COMPUTED: group capacity **USD 25.2m** vs proposed **USD 34.0m** → **NOT sustainable** (subsidiary contributes 26%)

### question

Determine whether Apex Circuits Inc.'s proposed group dividend is sustainable, given the free cash flow to equity of both the parent and its Vietnamese subsidiary, the remittance fraction, the forecast VND/USD exchange rate derived from purchasing power parity, and the credit-method double-tax treatment applicable to the remittance.

### context_text

Apex Circuits Inc. (USD) is a US-listed electronics holding company that sources the majority of its operating profit from its wholly owned Vietnamese subsidiary, Hanoi Precision Electronics Co. Ltd. ("HPE"), which manufactures printed circuit boards for export. At the appraisal date the VND/USD spot rate is 25,200 VND per USD, and the assumed annual inflation rates are 1.8% (US) and 5.6% (Vietnam); the board has acknowledged that sustained Vietnamese dong depreciation could erode remittance value more sharply than PPP implies if the State Bank of Vietnam intervenes to manage the exchange rate, yet the treasurer has proceeded on PPP alone without scenario-testing. The Vietnamese government imposes a 10% withholding tax on dividend remittances by foreign-invested enterprises, and Apex is subject to a 21% US federal corporate tax rate on foreign-sourced income under the credit method. HPE's finance director has projected the PCB-segment operating profit on the basis of a three-year contract with a single Taiwanese OEM client, raising questions about the durability of the cash flows beyond that horizon.

Raw inputs:
• Base spot rate (VND per USD) at appraisal date: 25,200
• US (home) inflation: 1.8%
• Vietnamese (foreign) inflation: 5.6%
• Remittance year: 2
• HPE PBIT: VND 520,000 million
• Vietnamese corporate tax rate: 20%
• Depreciation (non-cash add-back): VND 85,000 million
• Capital expenditure: VND 110,000 million
• Increase in working capital: VND 42,000 million
• HPE pre-tax cost of debt: 7.5%
• HPE market value of debt: VND 380,000 million
• HPE net new borrowing this year: VND 0 million
• Remittance fraction: 70%
• Withholding tax rate: 10%
• US home tax rate: 21%
• Apex Circuits parent FCFE: USD 18.5 million
• Proposed group dividend: USD 34.0 million

### model_answer

**Multinational dividend capacity and policy**

**Assumptions:** group dividend capacity is the CASH the parent can pay this year — its own free cash flow to equity plus the cash the overseas subsidiary can remit. 70% of the subsidiary's FCFE is remitted this year at a forecast spot of 27116.4493 VND/USD (PPP parity). Remittances suffer host withholding at 10.00%; the parent's 21.00% home tax is charged with a credit for the host tax, so the additional home tax is max(0, 21.00% − 10.00%) = **11.00%** (credit method, capped at the home liability).

**Step 1 — Subsidiary free cash flow to equity (foreign)**

Subsidiary FCFE = FCFF − after-tax interest + net new borrowing = **VND 326200.0m**.

**Step 2 — Remittance to the parent (net of double-tax, converted to home)**

Remitted = VND 326200.0m × 70% × net-of-tax factor 0.7900 ÷ 27116.4493 = **USD 6.7m**.

**Step 3 — Group dividend capacity**

Group capacity = parent FCFE USD 18.5m + remitted subsidiary FCFE USD 6.7m = **USD 25.2m**.

**Step 4 — Sustainability of the proposed dividend**

Against the proposed group dividend of USD 34.0m, the capacity **falls short** of the proposed dividend by USD 8.8m, so the proposed dividend is **not covered** and would have to draw on reserves or new finance — a red flag on sustainability.

**Step 5 — Advice to the board**

The most fragile assumption in this appraisal is that purchasing power parity will faithfully predict the VND/USD rate over the remittance horizon: as the scenario notes, the State Bank of Vietnam has historically managed the dong within an administrative band, meaning the actual rate at remittance could deviate materially from the PPP forecast and either erode or augment the USD equivalent of HPE's remittance. The board should require sensitivity analysis around at least two alternative exchange-rate paths — a managed-rate scenario and a sharp-devaluation scenario — before treating the PPP-derived figure as a planning baseline. The durability of HPE's operating profit is a second critical fragility: the PBIT projection rests on a contract with a single Taiwanese OEM client, so the board must confirm whether that contract contains renewal clauses, volume-guarantee provisions, or termination penalties before capitalising those flows into a multi-year dividend programme. On the remittance and political-risk dimension, the board should note that the Vietnamese foreign-investment regime can restrict profit repatriation through administrative delays even where the statutory withholding rate is published, and Apex should confirm with local legal counsel that no additional approval or queuing requirement applies to the proposed remittance fraction. Finally, the credit-method calculation depends on the withholding tax being formally creditable against US federal liability; the board's tax advisers should confirm that HPE's Vietnamese tax compliance is fully up to date, since any deficiency could jeopardise the credit and increase the effective double-tax burden on the remittance.

*Reconciliation: parent USD 18.5m + remitted USD 6.7m = capacity USD 25.2m; − proposed USD 34.0m = surplus USD -8.8m ✓*

### hint

Before you can judge sustainability, check whether you have applied the credit-method double-tax correctly to the remittance — the withholding tax and the additional home-country tax are two distinct deductions, and conflating or omitting either one will distort the USD cash that actually reaches the parent.

### full_reveal

The most common misconception here is ABANDONED-AFTER-CALC: candidates grind through the PPP rate and the FCFE arithmetic but then stop at a number, never delivering the sustainability verdict or the boardroom advice — yet those linked marks are precisely where Level 3 credit lives. The calculation is the floor, not the ceiling; the board needs to know whether the proposed dividend is covered and, critically, which assumptions could cause that conclusion to flip. A second cluster of errors falls under UNDEVELOPED-ASSUMPTION: candidates note that PPP drives the exchange rate or that the credit method applies, but treat those as settled facts rather than fragilities to interrogate — the correct mental model is to identify what would have to be true for the assumption to hold, then name what the board should verify before relying on it. If your subsidiary FCFE or your tax-adjusted remittance figure is wrong, carry it forward consistently into the capacity comparison and the sustainability verdict — where your downstream method is correct, those marks still score; own-figure relief is conditional on correct subsequent use, not automatic. The boardroom test here is simple: "You've run the numbers — is this dividend safe to declare, and what should the board check before it commits?"

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "net_factor": 0.79,
    "parent_fcfe": 18.5,
    "add_tax_rate": 0.10999999999999999,
    "forecast_spot": 27116.449295780083,
    "remit_fraction": 0.7,
    "proposed_dividend": 34
  },
  "components": [
    {
      "unit": "VNDm",
      "label": "Subsidiary free cash flow to equity (foreign)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "sub_fcfe",
      "working_steps": [
        "FCFE = FCFF − Kd·D(1−t) + net new borrowing (subsidiary, foreign)"
      ],
      "expected_value": 326200
    },
    {
      "unit": "USDm",
      "label": "Subsidiary remittance received by the parent (home, net of double-tax)",
      "recompute": "sub_remit_convert",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "sub_fcfe"
      ],
      "component_id": "sub_remit_home",
      "working_steps": [
        "= FCFE 326200.0 × remitted 70% × net-of-tax 0.7900 ÷ spot 27116.4493"
      ],
      "expected_value": 6.652368015899207
    },
    {
      "unit": "USDm",
      "label": "Parent free cash flow to equity (home currency)",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "component_id": "parent_fcfe",
      "working_steps": [
        "the parent's own dividend capacity (home currency)"
      ],
      "expected_value": 18.5
    },
    {
      "unit": "USDm",
      "label": "Group dividend capacity (home currency)",
      "recompute": "capacity_add_parent",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "sub_remit_home",
        "parent_fcfe"
      ],
      "component_id": "total_capacity",
      "working_steps": [
        "= parent FCFE 18.5 + remitted subsidiary FCFE"
      ],
      "expected_value": 25.152368015899206
    },
    {
      "unit": "USDm",
      "label": "Capacity surplus over the proposed dividend (signed)",
      "recompute": "capacity_minus_proposed",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "total_capacity"
      ],
      "component_id": "capacity_surplus",
      "working_steps": [
        "= dividend capacity − proposed dividend 34.0"
      ],
      "expected_value": -8.847631984100794
    }
  ]
}
```

---

