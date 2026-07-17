# AFM international-finance batch — blind adversarial review pack

**Calculator #10: international investment & financing (`lib/acca/international.ts`). 4 drills, `status=candidate`, `published=false`, `paper_code=AFM`. AT THE REVIEW GATE (Fix Rounds 1 + 2 applied). Awaiting co-founder independent recompute, THEN a blind GPT round. CURRENT STATE — regenerated after every fix round.**

Doctrine: code owns EVERY figure AND every figure-vs-figure verdict — the forecast FX curve (DERIVED by parity, never asserted), every conversion, the credit-method double-tax, the NPV, the decision FLIP, the sustainability verdict. The model authored PROSE only. The calculator COMPOSES the FCFF build (`fcffFromBuild`, `valuation.ts`) and the discounting (`discountFactor`, `npv.ts`) ONE-WAY, no back-imports.

## Double-tax = the CORPORATE DIFFERENTIAL (Fix Round 1) — THREE branches (Fix Round 2)
Additional home tax = **max(0, home rate − foreign CORPORATE rate) × taxable profit** (the PBIT base), crediting the foreign corporate tax; withholding is a SEPARATE layer with a per-scenario `wht_creditable` flag (if creditable: additional = max(0, home liability − foreign corp − WHT)). Evidence (Rule 22, verbatim, in `international.ts`): *"A bilateral tax treaty exists between the countries of Ayjai and Nuruk — hence, taxable profits earned in Nuruk will be liable to the differential income tax rate on company profits that applies between the two countries."* — ACCA AFM technical article, "International project appraisal (part 2)", accaglobal.com.

**The nil case has TWO distinct causes, told apart with the TRUE inequality direction (Fix Round 2 — the earlier template printed a FALSE "foreign ≥ home" + a false max() for every nil):**
- **(a) nil-by-corporate-credit** — foreign corporate rate ≥ home; the corporate credit alone covers the home liability; the withholding is then a **net cost** (no residual liability to relieve). *(K1)*
- **(b) nil-by-WHT-credit** — home > foreign corporate (a positive residual), but the **creditable withholding** covers the residual → additional tax **nets to nil**. *(K2, K3)*
- **(c) charged** — a positive residual survives after the credits, charged per year. *(K4 — Malaysia levies 0% dividend WHT, so the 6% Australia-vs-Malaysia differential is charged.)*

**This batch demonstrates all three branches.** GATE 14 validates the arithmetic; **GATE 14b** (new) validates the PROSE — the stated branch must match `add_tax_rate_effective` and the true rate ordering, with no false inequality or false max().

Money components carry a **floor tolerance** (max 0.5% relative, 0.2 absolute). **All gates pass** — the 6 base/pattern gates + GATE 12 parity-consistency, GATE 13 currency/unit-scale, GATE 14 double-tax cap (differential base), **GATE 14b tax-prose consistency**.

## Kinds → ids → code-computed verdicts (tax branch noted)
- **home_currency_standard (K1)** `499357f7-466f-4e2d-ab22-cf7175c83968` — MAD→USD NPV = **USD +18.6m** → ACCEPT; additional home tax **NIL** — tax branch **(a) nil-by-corporate-credit** (foreign corporate 28% ≥ US home 21%; the withholding is then a net cost with no residual liability to relieve)
- **exchange_rate_sensitivity (K2)** `fcf14ae8-90ea-4ad5-a23b-9c7423974a67` — base **GBP +9.3m** (accept) → alternative **GBP −1.0m** (reject) — the decision **FLIPS**; additional home tax **NIL** via tax branch **(b) nil-by-WHT-credit** (home 25% exceeds foreign corporate 22.5% — a 2.5% residual — but the creditable 10% withholding covers it)
- **restricted_remittance (K3, B5b + B5c dual)** `eac98c43-9c45-4659-8042-dc608efb7c94` — NPV **EUR +6.8m** with the controls vs **EUR +9.4m** free — restriction costs **EUR −2.6m** (explicit subtraction); additional home tax **NIL** via tax branch **(b) nil-by-WHT-credit** (home 28% exceeds foreign corporate 24% — a 4% residual — covered by the creditable 10% withholding)
- **multinational_dividend_capacity (K4, A6a — DIRECT-LINK-ONLY)** `2b0513a0-7734-4e62-ae1b-54e54d983152` — group capacity **AUD 33.6m** vs proposed **AUD 38.0m** → **NOT sustainable** (subsidiary ~35% of capacity, remitted in year 2); additional home tax **CHARGED** via tax branch **(c)** (Australian home 30% exceeds Malaysian corporate 24% by 6%; Malaysia levies 0% dividend withholding, so the 6% differential is charged)

## Reviewer notes (Fix-Round-2 resolutions + one known interaction)
- Fix Round 1's false-inequality bug (K2/K3/K4 all printed "foreign corporate ≥ home" and "max(0,h−fc)=0" when home actually exceeded the foreign corporate rate) is **fixed** — see the three-branch prose above; GATE 14b now guards it.
- K1 no longer carries a free-zone framing inconsistent with the full corporate rate; the withholding is stated as a net cost.
- **Known interaction (surfaced, not a defect here):** the 0.2 absolute floor tolerance can swallow the seeded-OFR perturbation for a graded money dependent whose magnitude is under ~1.3 (display m) — it verdicts "correct" instead of "carried" and fails GATE 3. Resolved for this batch by SIZING (moderate-denomination currencies, material figures — the AUD/Vietnam K4 draft that tripped it was replaced by AUD/Malaysia). Flagged in `AFM_SURFACED.md` as a thing to weigh in the platform-wide floor-tolerance sweep.

## ⛔ CLOSED RULINGS — do NOT re-raise
- **Credit base = the CORPORATE differential (Fix Round 1, Rule 22 evidence).** Additional home tax = max(0, home − foreign CORPORATE rate) on taxable profit, crediting foreign corporate tax; withholding is a separate creditable-or-not layer. Do NOT re-raise the withholding-only credit model, and do NOT propose taxing the cash flow rather than the taxable profit.
- **Three tax branches (Fix Round 2)** — (a) nil-by-corporate, (b) nil-by-WHT-credit, (c) charged; each with the true inequality. The template + GATE 14b are settled.
- **Parity basis = PPP for B5** (IRP is E2/short-horizon). **Double-tax = credit method only** (exemption journalled as a future kind). **Home-currency method primary.** **A6a (K4) direct-link-only + excluded from B-tier counts.** **Forecast rates DERIVED, never asserted (GATE 12).** **OFR wording** "charged once, at its source" — house wording, closed.

**Review method:** fresh model, no project context, AFM syllabus PDF attached; FULL hostility on drill 1 (K1, first-of-family), spot-check siblings WITH full recomputation of every figure. Hunt for semantic errors a deterministic gate cannot catch: the differential-tax base/branch/credit mis-explained, a parity forecast mis-stated, a conversion inverted, the remittance-blocking story incoherent, the dividend-capacity flow mis-plumbed, scenario-fact drift, an invented statute/treaty.

---

## Drill — home_currency_standard (K1)  ·  `499357f7-466f-4e2d-ab22-cf7175c83968`
- LO B5b · mode quantitative · command_verb "forecast" · marks_guide 10
- CODE-COMPUTED: MAD→USD NPV = **USD +18.6m** → ACCEPT; additional home tax **NIL** — tax branch **(a) nil-by-corporate-credit** (foreign corporate 28% ≥ US home 21%; the withholding is then a net cost with no residual liability to relieve)

### question

Forecast the MAD cash flows of Axion Driveline Maroc SA for each year of the project life, convert them to USD using purchasing-power-parity exchange rates, and determine the USD net present value of the investment for Axion Automotive Group Inc.

### context_text

Axion Automotive Group Inc., a US-based automotive-components manufacturer listed on NASDAQ, is appraising a greenfield stamping and sub-assembly plant — Axion Driveline Maroc SA — to be established near Kenitra, Morocco. The plant will supply aluminium structural components to European OEM customers under a five-year off-take framework, though the board acknowledges that OEM procurement cycles can be renegotiated and the contracted volumes should not be treated as unconditional; in addition, while PPP is used to forecast the MAD/USD rate, Morocco's managed-float regime means the dirham does not always move in line with the inflation differential, and deviations from parity are a genuine appraisal risk. Morocco imposes a withholding tax on profit remittances to the US parent, and the bilateral tax treaty makes that withholding tax creditable against the US parent's home liability. The plant will be a fully-taxed corporate operation subject to Morocco's standard corporate income tax rate.

Raw inputs (at the appraisal date):
- Initial capital outlay: MAD 1,200 million
- Annual PBIT (base year, MAD): MAD 520 million
- Foreign (Morocco) corporate tax rate: 28%
- Parent (US) tax rate on foreign taxable profit: 21%
- Host withholding tax rate on remittances: 8%
- Withholding tax creditable under bilateral treaty: Yes
- Depreciation (annual, MAD): MAD 180 million
- Capital expenditure (annual, MAD): MAD 60 million
- Increase in working capital (annual, MAD): MAD 40 million
- Annual growth of foreign cash flows (money terms): 0%
- Project life: 5 years
- Spot exchange rate at appraisal date (MAD per USD 1): 10.20
- Moroccan inflation rate (assumed): 6%
- US inflation rate (assumed): 2%
- Parent's USD money cost of capital: 11%

### model_answer

**International investment appraisal — net present value to the parent**

**Assumptions:** project cash flows arise in MAD; the maintainable base-year foreign free cash flow is MAD 454.4m on a taxable profit (PBIT) base of MAD 520.0m; forecast spot rates are derived by PPP parity from the stated base spot 10.2000 MAD/USD; converted cash flows are discounted at the parent's 11.00% money cost of capital. The foreign corporate tax rate 28.00% is **at or above** the parent's 21.00% home rate, so the credit for foreign corporate tax already covers the whole home liability and there is **no additional home tax** (max(0, 21.00% − 28.00%) = 0). The 8.00% withholding on remittances is therefore a **net cost** — with no residual home liability, the treaty's creditability gives it no relief.

**Step 1 — Forecast exchange rates (parity, never assumed)**

| Year | Forecast spot (MAD/USD) |
|------|------|
| 1 | 10.6000 |
| 2 | 11.0157 |
| 3 | 11.4477 |
| 4 | 11.8966 |
| 5 | 12.3631 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

**Step 2 — Foreign cash flows, tax, remittance, and conversion**

| Year | Foreign FCFF | Withholding | Additional home tax | Net remitted (MAD) | Spot | Home cash flow |
|------|------|------|------|------|------|------|
| 1 | MAD 454.4m | MAD 36.4m | MAD 0.0m | MAD 418.0m | 10.6000 | USD 39.4m |
| 2 | MAD 454.4m | MAD 36.4m | MAD 0.0m | MAD 418.0m | 11.0157 | USD 38.0m |
| 3 | MAD 454.4m | MAD 36.4m | MAD 0.0m | MAD 418.0m | 11.4477 | USD 36.5m |
| 4 | MAD 454.4m | MAD 36.4m | MAD 0.0m | MAD 418.0m | 11.8966 | USD 35.1m |
| 5 | MAD 454.4m | MAD 36.4m | MAD 0.0m | MAD 418.0m | 12.3631 | USD 33.8m |

*(Additional home tax is **nil** every year: the foreign corporate rate 28.00% is at or above the parent's 21.00% home rate, so the foreign-tax credit already covers the whole home liability. Net remitted = foreign FCFF − withholding; converted at the forecast spot.)*

**Step 3 — Present values and NPV**

| Year | Home cash flow | DF @ 11.00% | Present value |
|------|------|------|------|
| 0 | USD -117.6m | 1.000 | USD -117.6m | *(foreign outlay MAD 1200.0m ÷ 10.2000)*
| 1 | USD 39.4m | 0.901 | USD 35.5m |
| 2 | USD 38.0m | 0.812 | USD 30.8m |
| 3 | USD 36.5m | 0.731 | USD 26.7m |
| 4 | USD 35.1m | 0.659 | USD 23.1m |
| 5 | USD 33.8m | 0.593 | USD 20.1m |

**NPV to the parent = USD 18.6m.**

**Step 4 — Decision**

The NPV of USD 18.6m is **positive**, so on these exchange-rate and fiscal assumptions the project **adds value to the parent and should be accepted**.

**Step 5 — Advice to the board**

The most fragile assumption in this appraisal is that PPP will hold over five years: Morocco operates a managed-float regime, meaning the dirham's path is administered rather than purely market-determined, and deviations from the inflation-implied depreciation path would alter every converted cash flow. The board should stress-test the appraisal against a scenario in which the dirham depreciates faster than PPP implies — for example, a sudden float or a balance-of-payments adjustment — because the MAD cash flows are fixed in local terms while the USD present value is acutely sensitive to the exchange path. The off-take framework with European OEMs is the commercial foundation of the cash-flow forecast, yet the board has acknowledged that procurement cycles are renegotiable; the durability of the MAD 520 million base-year PBIT should therefore be verified against the contracted volumes and the penalties for volume shortfall before the figure is accepted as maintainable. On the fiscal side, the foreign corporate tax rate exceeds the US parent rate, which determines the additional home-tax outcome and is a key teaching point the board should understand — confirming whether the creditable withholding tax treaty treatment will be recognised by the US Internal Revenue Service under current US foreign-tax-credit rules is a matter of legal due diligence. Finally, Morocco's exchange-control framework governs the timing and permissibility of profit remittances; any tightening of those controls after project inception — a political risk that is non-trivial in a managed-currency environment — would defer the USD cash flows and erode the present value computed here.

*Reconciliation: Σ present values USD 136.2m − home outlay USD 117.6m = NPV USD 18.6m ✓*

### hint

Before you convert a single MAD cash flow, check whether the foreign corporate tax rate clears the parent's home rate — that comparison determines whether any additional home tax is owed, and then ask whether the withholding tax has anywhere to shelter once that comparison is made.

### full_reveal

The dominant misconception in cross-border NPV drills is UNDEVELOPED-ASSUMPTION: candidates list the tax treaty, the PPP formula, and the withholding rate as inputs, but never interrogate what each assumption actually produces in this scenario. The critical mechanism is the tax-credit stack — when the foreign corporate rate already meets or exceeds the parent's home rate, the foreign-tax credit extinguishes the entire home liability, leaving withholding tax with no residual home charge to shelter against, which makes it a full net cost on every remittance; candidates who skip that reasoning either double-count relief or omit the withholding deduction entirely, and both errors corrupt every subsequent converted cash flow. On the exchange-rate side, PPP is not a description of what will happen — it is a contractual assumption the appraisal imposes because the scenario provides no forward market data; if your PPP spot rates are wrong, carry them forward consistently into the conversion step, because where the downstream method is sound those marks still score (own-figure relief is conditional on correct subsequent use, not automatic). Finally, a positive NPV is the floor of the board answer, not the ceiling — the board needs to hear which assumption is most fragile (the managed-float regime means the dirham's path is administered, not purely inflation-driven) and what would be verified before committing capital, not just a number with a sign attached.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "base_spot": 10.2,
    "rate_home": 0.02,
    "home_outlay": 117.64705882352942,
    "rate_foreign": 0.06,
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
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 10.2000 × 1.03922 = 10.6000"
      ],
      "expected_value": 10.6
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
        "S2 = S1 × 1.03922 = 11.0157"
      ],
      "expected_value": 11.015686274509806
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
        "S3 = S2 × 1.03922 = 11.4477"
      ],
      "expected_value": 11.447673971549406
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
        "S4 = S3 × 1.03922 = 11.8966"
      ],
      "expected_value": 11.89660236259056
    },
    {
      "unit": "MAD/USD",
      "label": "Forecast spot, year 5 (MAD/USD)",
      "recompute": "parity_step_y5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_4"
      ],
      "component_id": "fx_5",
      "working_steps": [
        "S5 = S4 × 1.03922 = 12.3631"
      ],
      "expected_value": 12.363135788574505
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
        "= foreign remittance 418.0 (net of WHT; no additional home tax) ÷ spot 10.6000"
      ],
      "expected_value": 39.438490566037736
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
        "= foreign remittance 418.0 (net of WHT; no additional home tax) ÷ spot 11.0157"
      ],
      "expected_value": 37.95024563901744
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
        "= foreign remittance 418.0 (net of WHT; no additional home tax) ÷ spot 11.4477"
      ],
      "expected_value": 36.51816089792244
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
        "= foreign remittance 418.0 (net of WHT; no additional home tax) ÷ spot 11.8966"
      ],
      "expected_value": 35.140117090453664
    },
    {
      "unit": "USDm",
      "label": "Home-currency net cash flow, year 5",
      "recompute": "home_cf_convert_y5",
      "tolerance": {
        "pct": 0.5,
        "kind": "floor",
        "floor": 0.2
      },
      "depends_on": [
        "fx_5"
      ],
      "component_id": "home_cf_5",
      "working_steps": [
        "= foreign remittance 418.0 (net of WHT; no additional home tax) ÷ spot 12.3631"
      ],
      "expected_value": 33.81407493609692
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
        "home_cf_4",
        "home_cf_5"
      ],
      "component_id": "npv",
      "working_steps": [
        "= Σ (home cash flow × DF @ 11.00%) − home outlay 117.6"
      ],
      "expected_value": 18.601039315319063
    }
  ]
}
```

---

## Drill — exchange_rate_sensitivity (K2)  ·  `fcf14ae8-90ea-4ad5-a23b-9c7423974a67`
- LO B5a · mode quantitative · command_verb "assess" · marks_guide 15
- CODE-COMPUTED: base **GBP +9.3m** (accept) → alternative **GBP −1.0m** (reject) — the decision **FLIPS**; additional home tax **NIL** via tax branch **(b) nil-by-WHT-credit** (home 25% exceeds foreign corporate 22.5% — a 2.5% residual — but the creditable 10% withholding covers it)

### question

Assess the impact on the sterling NPV of CairoCom Networks' proposed Egyptian mobile-telecoms build under two exchange-rate assumptions — the base PPP-derived EGP depreciation and a sharper EGP devaluation — and advise Albion Telecoms plc's board whether the project should proceed.

### context_text

Albion Telecoms plc, a UK-listed mobile network operator, is evaluating a five-year greenfield build-out of CairoCom Networks, a wholly-owned Egyptian subsidiary that would provide 4G/5G coverage across three governorates. The Egyptian telecoms regulator has approved the licence, but Egypt's history of managed EGP devaluations — including the sharp float of November 2022 — means the board regards exchange-rate risk as the central appraisal risk; whether purchasing-power parity will hold in a managed-currency environment is genuinely uncertain, and Egypt's capital-account controls mean that remittances could be delayed or restricted at short notice. Annual cash flows are projected on the basis of a contracted subscriber base and tower-sharing revenues, but the durability of those flows beyond year three depends on competitive behaviour from two state-backed incumbents, which the board should stress-test.

Raw inputs (at the appraisal date):
- Base spot rate (EGP per GBP): 48.00
- UK (home) inflation assumed: 3%
- Egyptian (foreign) inflation assumed — base case: 9%
- Egyptian (foreign) inflation assumed — alternative (sharper EGP devaluation): 25%
- Annual growth of foreign cash flows (money terms): 4%
- Project life: 5 years
- Initial outlay: EGP 1,200m
- PBIT (base year, maintainable): EGP 620m
- Depreciation (non-cash add-back): EGP 180m
- Capital expenditure (Years 1–5): EGP 95m per year
- Increase in working capital (Years 1–5): EGP 25m per year
- Egyptian corporate tax rate: 22.5%
- UK parent tax rate on foreign taxable profit: 25%
- Host withholding tax on remittances: 10%
- Bilateral treaty: withholding tax IS creditable against UK liability
- Albion's sterling cost of capital (money terms): 11%

### model_answer

**Impact of alternative exchange-rate assumptions on project value**

**Assumptions:** the project's EGP cash flows are unchanged; only the forecast-FX path (the PPP-parity foreign rate) differs between the base case and a sharper devaluation of the Egyptian pound. Both NPVs are to the parent, discounted at 11.00%. The parent's 25.00% home rate **exceeds** the foreign corporate rate 22.50%, a residual differential of 2.50% on taxable profit; but the **creditable** 10.00% withholding covers that residual, so the additional home tax **nets to nil** (max(0, home liability − foreign corporate tax − withholding) = 0).

**Step 1 — Base exchange-rate assumption**

| Year | Forecast spot (EGP/GBP) |
|------|------|
| 1 | 50.7961 |
| 2 | 53.7551 |
| 3 | 56.8865 |
| 4 | 60.2003 |
| 5 | 63.7071 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

NPV under the base assumption = **GBP 9.3m** → accept.

**Step 2 — Alternative exchange-rate assumption (a sharper devaluation of the Egyptian pound)**

| Year | Forecast spot (EGP/GBP) |
|------|------|
| 1 | 58.2524 |
| 2 | 70.6947 |
| 3 | 85.7945 |
| 4 | 104.1196 |
| 5 | 126.3587 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

NPV under the alternative assumption = **GBP -1.0m** → reject.

**Step 3 — Sensitivity of the decision**

Moving from the base assumption to a sharper devaluation of the Egyptian pound changes the NPV by **GBP -10.4m** (from GBP 9.3m to GBP -1.0m); the recommendation **FLIPS**: accept under the base assumption, reject under a sharper devaluation of the Egyptian pound. The decision is **not robust** to the exchange-rate assumption.

**Step 4 — Advice to the board**

The most fragile assumption in this appraisal is whether purchasing-power parity will track EGP depreciation reliably over five years: Egypt operates a managed float overseen by the Central Bank of Egypt, and the authorities have historically allowed the currency to lag inflation differentials before a discrete, discontinuous devaluation event — precisely the pattern that produced the 2022 shock — so the PPP-derived forecast may materially understate the speed and depth of any correction. The durability of CairoCom's projected PBIT is also contested: the revenue base rests on contracted subscribers and tower-sharing income, but two state-backed incumbents retain pricing power and spectrum advantages that could compress margins beyond year three, making the maintainable-PBIT assumption an optimistic anchor. Egypt's capital-account controls represent a separate, non-market risk: even if the project generates strong EGP cash flows, the Central Bank has previously imposed queuing mechanisms and priority rules on foreign-currency remittances, meaning the timing of sterling receipts could be significantly delayed regardless of the exchange-rate scenario. The board should require (i) an independent assessment of EGP convertibility risk from a specialist EM treasury adviser, (ii) a sensitivity analysis on PBIT under competitive-pressure scenarios, and (iii) confirmation that the bilateral treaty's creditability clause covers the full withholding rate applicable to telecoms-sector remittances before committing to the outlay.

*Reconciliation: base NPV GBP 9.3m, alternative NPV GBP -1.0m, swing GBP -10.4m; decision flips ✓*

### hint

Your exchange-rate work may be sound — now check whether your answer tells the board what to do differently under each scenario and why the swing in NPV means the decision cannot safely rest on the base assumption alone.

### full_reveal

The dominant misconception here is FENCE-SITTING: candidates produce two NPV figures, note that one is positive and one is negative, and then stop — treating the calculation as the destination rather than the departure point. That thinking is wrong because the examiner's credit lies not in the arithmetic but in the synthesis: the board cannot act on a pair of numbers without a reasoned verdict on which scenario is more credible and what the magnitude of the swing implies about decision robustness. The correct mental model is to treat the two scenarios as stress-test bookends — the question is not "which NPV is higher?" but "is the base-case recommendation robust enough to survive the alternative, and if not, what conditions must the board verify before committing?" Here, the scenario provides specific evidence — managed-float history, capital-account controls, contracted revenue assumptions — that should be used to challenge the reliability of the PPP path and the durability of projected profits, rather than left as generic EM-risk labels. If your NPV figures differ from the model's, carry them forward consistently into the sensitivity swing and the flip-or-hold verdict; where your method is correct downstream, those marks remain available, with any error charged once at its source.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "base_spot": 48,
    "rate_home": 0.03,
    "home_outlay": 25,
    "rate_foreign": 0.09,
    "discount_rate": 0.11,
    "alt_rate_foreign": 0.25,
    "add_tax_rate_effective": 0.024999999999999994
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
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 48.0000 × 1.05825 = 50.7961"
      ],
      "expected_value": 50.79611650485437
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
        "S2 = S1 × 1.05825 = 53.7551"
      ],
      "expected_value": 53.755113582807056
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
        "S3 = S2 × 1.05825 = 56.8865"
      ],
      "expected_value": 56.88647942258222
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
        "S4 = S3 × 1.05825 = 60.2003"
      ],
      "expected_value": 60.20025492292681
    },
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 5 (EGP/GBP)",
      "recompute": "parity_step_y5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "fx_4"
      ],
      "component_id": "fx_5",
      "working_steps": [
        "S5 = S4 × 1.05825 = 63.7071"
      ],
      "expected_value": 63.7070658893109
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
        "fx_4",
        "fx_5"
      ],
      "component_id": "npv",
      "working_steps": [
        "= Σ (foreign remittance ÷ forecast spot × DF @ 11.00%) − home outlay 25.0"
      ],
      "expected_value": 9.317431728937327
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
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 48.0000 × 1.21359 = 58.2524"
      ],
      "expected_value": 58.252427184466015
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
        "S2 = S1 × 1.21359 = 70.6947"
      ],
      "expected_value": 70.69469318503157
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
        "S3 = S2 × 1.21359 = 85.7945"
      ],
      "expected_value": 85.7945305643587
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
        "S4 = S3 × 1.21359 = 104.1196"
      ],
      "expected_value": 104.11957592761976
    },
    {
      "unit": "EGP/GBP",
      "label": "Forecast spot, year 5 (EGP/GBP)",
      "recompute": "parity_step_y5",
      "tolerance": {
        "pct": 0.5,
        "kind": "relative"
      },
      "depends_on": [
        "alt_fx_4"
      ],
      "component_id": "alt_fx_5",
      "working_steps": [
        "S5 = S4 × 1.21359 = 126.3587"
      ],
      "expected_value": 126.35870865002397
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
        "alt_fx_4",
        "alt_fx_5"
      ],
      "component_id": "alt_npv",
      "working_steps": [
        "= Σ (foreign remittance ÷ forecast spot × DF @ 11.00%) − home outlay 25.0"
      ],
      "expected_value": -1.0499475747678328
    }
  ]
}
```

---

## Drill — restricted_remittance (K3, B5b + B5c dual)  ·  `eac98c43-9c45-4659-8042-dc608efb7c94`
- LO B5b · mode quantitative · command_verb "forecast" · marks_guide 10
- CODE-COMPUTED: NPV **EUR +6.8m** with the controls vs **EUR +9.4m** free — restriction costs **EUR −2.6m** (explicit subtraction); additional home tax **NIL** via tax branch **(b) nil-by-WHT-credit** (home 28% exceeds foreign corporate 24% — a 4% residual — covered by the creditable 10% withholding)

### question

Forecast the annual free cash flows of Luminos Chemicals' Tianjin subsidiary in both CNY and EUR, apply purchasing-power-parity exchange rates for each year, account for the host-country capital controls that block a portion of each year's remittance and reinvest those blocked funds locally until project end, apply the applicable withholding and corporate tax treatments under the bilateral treaty, and determine the EUR net present value of the project both with and without the remittance restriction.

### context_text

Luminos Speciality Chemicals SE, a Frankfurt-listed Eurozone parent, is appraising a four-year greenfield speciality-chemicals facility in Tianjin, China, to be operated by its wholly-owned subsidiary Luminos Tianjin Chemical Co. Ltd. China's capital-control regime requires that a material fraction of each year's free cash flow be retained onshore and reinvested locally at prevailing interbank rates before being released in a lump sum at project end — a restriction that the board recognises could persist or even tighten given the geopolitical climate and Beijing's history of adjusting outward-remittance rules without notice. Purchasing-power parity is assumed to hold between the euro and the renminbi over the appraisal period, though in practice CNY is a managed currency and the actual path of EUR/CNY may diverge from the parity forecast, exposing the project to exchange-rate basis risk that PPP cannot capture. A bilateral double-tax treaty between the EU and China makes the Chinese withholding tax creditable against any residual home-country liability; the additional Eurozone corporate tax on the repatriated profit is therefore the differential between the two headline rates, reduced first by the foreign corporate tax credit and then by the withholding-tax credit, with any excess withholding credit available to extinguish the residual differential entirely.

Raw inputs (at the appraisal date):
- Initial outlay: CNY 360 million
- Maintainable foreign PBIT (base year, money terms): CNY 195 million
- Depreciation (non-cash add-back): CNY 48 million
- Capital expenditure (maintenance): CNY 18 million
- Increase in working capital per year: CNY 12 million
- Annual growth of foreign cash flows (money terms): 0%
- Foreign (China) corporate tax rate: 24%
- Host withholding tax on remittances: 10%
- Bilateral treaty — withholding tax creditable against home liability: yes
- Eurozone parent corporate tax rate on foreign taxable profit: 28%
- Project life: 4 years
- Base spot rate (CNY per EUR, at the appraisal date): 7.80
- Assumed annual inflation — China: 4.5%
- Assumed annual inflation — Eurozone: 1.5%
- Parent's EUR cost of capital: 11%
- Blocked fraction of each year's CNY free cash flow: 30%
- Local reinvestment rate on blocked funds (onshore China): 3%

### model_answer

**International appraisal with a remittance restriction**

**Assumptions:** 30% of each year's CNY cash flow is blocked from remittance and reinvested locally at 3.00%, released in year 4; the free portion is remitted when earned. Forecast spots by PPP parity; home discount rate 11.00%. The parent's 28.00% home rate **exceeds** the foreign corporate rate 24.00%, a residual differential of 4.00% on taxable profit; but the **creditable** 10.00% withholding covers that residual, so the additional home tax **nets to nil** (max(0, home liability − foreign corporate tax − withholding) = 0).

**Step 1 — Forecast exchange rates (parity)**

| Year | Forecast spot (CNY/EUR) |
|------|------|
| 1 | 8.0305 |
| 2 | 8.2679 |
| 3 | 8.5123 |
| 4 | 8.7639 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

**Step 2 — Remitted (free) cash flows converted to home currency**

| Year | Foreign cash flow | Free & remitted net (CNY) | Spot | Home cash flow | PV |
|------|------|------|------|------|------|
| 1 | CNY 116.3m | CNY 104.7m | 8.0305 | EUR 13.0m | EUR 11.7m |
| 2 | CNY 116.3m | CNY 104.7m | 8.2679 | EUR 12.7m | EUR 10.3m |
| 3 | CNY 116.3m | CNY 104.7m | 8.5123 | EUR 12.3m | EUR 9.0m |
| 4 | CNY 116.3m | CNY 104.7m | 8.7639 | EUR 11.9m | EUR 7.9m |

**Step 3 — Blocked funds accumulated and released in year 4**

Blocked cash reinvested locally at 3.00% accumulates to **CNY 208.6m** by year 4; remitted then (net of tax) and converted at 8.7639 = **EUR 21.4m** (PV EUR 14.1m).

**Step 4 — NPV and the cost of the restriction**

NPV with the restriction = **EUR 6.8m** (accept). By comparison the restriction **reduces** the NPV: free-remittance NPV EUR 9.4m − restricted NPV EUR 6.8m = a cost of the restriction of **EUR 2.6m**.

**Step 5 — Advice to the board**

The most fragile assumption is that purchasing-power parity will hold over the four-year horizon: because the renminbi is a managed currency, the People's Bank of China can maintain EUR/CNY at levels that diverge persistently from the inflation-differential path, meaning the actual EUR receipts could be materially lower than the parity-derived forecast — the board should commission a scenario analysis using a range of managed-rate paths rather than relying solely on PPP. The durability of the CNY 195 million PBIT figure also warrants scrutiny, given that speciality-chemicals margins are sensitive to feedstock pricing and domestic regulatory shifts in China that could compress profitability before the project reaches the end of year four. On the remittance restriction, the board should treat the 30 % blocked fraction as a floor rather than a ceiling, since China's outward-remittance rules can be tightened administratively at short notice; the local reinvestment rate of 3 % that the blocked funds are assumed to earn is well below Luminos's EUR cost of capital, confirming that the restriction destroys value relative to free remittance. To mitigate the impact of blocked cash, the board should consider (i) structuring a portion of the subsidiary's funding as an intercompany loan repayable to the parent, allowing principal and interest to flow out as debt service rather than a dividend remittance subject to the cap; (ii) charging the Tianjin entity arm's-length royalties and management-service fees for the parent's intellectual property and technical support, converting trapped operating surplus into deductible fee income that can be remitted under a different regulatory classification; (iii) exploring a parallel back-to-back loan structure with a Chinese counterparty, whereby Luminos SE deposits funds with a third-party bank that simultaneously lends an equivalent amount to the subsidiary, with repayment effectively netting across borders; and (iv) directing the locally reinvested blocked cash into productive capex that reduces future maintenance spend or grows the subsidiary's asset base, preserving value even if cash cannot leave China promptly.

*Reconciliation: free-flow PVs + released-funds PV − home outlay EUR 46.2m = NPV EUR 6.8m; vs free-remittance NPV EUR 9.4m ✓*

### hint

Before you can convert or discount anything, check whether your blocked-funds mechanic is correctly separating each year's free portion from the reinvested portion and accumulating the blocked tranches at the local reinvestment rate through to year 4 — that sequencing error, if present, will cascade into every EUR cash flow and both NPV figures.

### full_reveal

The most common misconception in international project appraisals with remittance restrictions is ABANDONED-AFTER-CALC: candidates correctly compute the free-remittance NPV, then either omit the blocked-funds accumulation altogether or treat the restriction as a simple haircut on each year's cash flow rather than a reinvestment-and-release mechanism — meaning the year-4 terminal inflow from accumulated blocked funds never appears, and the "cost of the restriction" comparison is never made. This matters because the restriction does not destroy the blocked cash permanently; it defers and revalues it, and the difference between what that cash earns locally and what it would have earned at the parent's discount rate is precisely where the value destruction is measured. A second structural error is VALUATION-PLUMBING of a different kind: candidates sometimes apply the home corporate tax rate in full on remitted dividends without working through the bilateral treaty logic — because foreign corporate tax and creditable withholding must be netted against the home liability before any residual is charged, failing to do so overstates the tax drag on remittances in a way the scenario's treaty terms do not support. On own-figure rule: if your PPP spots or your accumulated blocked-funds figure is wrong, carry it forward consistently through the conversion and discounting steps — where your downstream method is correct, those marks remain available and the error is charged once at its source, not repeatedly. The board question the model answer is really asking is whether the restriction is a dealbreaker or a manageable drag, and what financing structures might reclassify trapped cash as debt service or fee income — that advisory layer is where the calculation earns its keep.

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "base_spot": 7.8,
    "rate_home": 0.015,
    "home_outlay": 46.15384615384615,
    "rate_foreign": 0.045,
    "discount_rate": 0.11,
    "blocked_fraction": 0.3,
    "local_reinvest_rate": 0.03,
    "add_tax_rate_effective": 0.040000000000000036
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
        "S₁ = S₀ × (1+r_f)/(1+r_h) = 7.8000 × 1.02956 = 8.0305"
      ],
      "expected_value": 8.030541871921182
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
        "S2 = S1 × 1.02956 = 8.2679"
      ],
      "expected_value": 8.267897789317866
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
        "S3 = S2 × 1.02956 = 8.5123"
      ],
      "expected_value": 8.512269152548937
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
        "S4 = S3 × 1.02956 = 8.7639"
      ],
      "expected_value": 8.76386331469324
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
        "= free remittance 104.7 (net of WHT (differential home tax nil)) ÷ spot 8.0305"
      ],
      "expected_value": 13.038472580051527
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
        "= free remittance 104.7 (net of WHT (differential home tax nil)) ÷ spot 8.2679"
      ],
      "expected_value": 12.664162362442394
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
        "= free remittance 104.7 (net of WHT (differential home tax nil)) ÷ spot 8.5123"
      ],
      "expected_value": 12.300597892707204
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
        "= free remittance 104.7 (net of WHT (differential home tax nil)) ÷ spot 8.7639"
      ],
      "expected_value": 11.947470680476377
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
      "expected_value": 208.59564221999995
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
        "= (released 208.6 − WHT − deferred differential tax) ÷ spot 8.7639"
      ],
      "expected_value": 21.421611823092572
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
        "= Σ (free home cash flow × DF) + released home cash × DF @ year 4 − home outlay 46.2"
      ],
      "expected_value": 6.846383199394226
    }
  ]
}
```

---

## Drill — multinational_dividend_capacity (K4, A6a — DIRECT-LINK-ONLY)  ·  `2b0513a0-7734-4e62-ae1b-54e54d983152`
- LO A6a · mode quantitative · command_verb "determine" · marks_guide 15
- CODE-COMPUTED: group capacity **AUD 33.6m** vs proposed **AUD 38.0m** → **NOT sustainable** (subsidiary ~35% of capacity, remitted in year 2); additional home tax **CHARGED** via tax branch **(c)** (Australian home 30% exceeds Malaysian corporate 24% by 6%; Malaysia levies 0% dividend withholding, so the 6% differential is charged)

### question

Determine the group dividend capacity of Verdant Agri Holdings Ltd and assess whether its proposed total dividend of AUD 38 million is sustainable, given the remittance from its Malaysian palm-oil-processing subsidiary, Kijang Oils Sdn Bhd, is to be made in year 2.

### context_text

Verdant Agri Holdings Ltd (Verdant), an Australian agribusiness group listed on the ASX, owns Kijang Oils Sdn Bhd (Kijang Oils), a palm-oil-processing subsidiary incorporated in Malaysia. Verdant is evaluating its group dividend capacity for the forthcoming distribution cycle; the Kijang Oils remittance is scheduled in year 2, and although Malaysia's single-tier tax system imposes no withholding tax on outbound dividends paid to a foreign corporate parent, the Australian parent's headline corporate tax rate of 30% meaningfully exceeds the Malaysian corporate rate of 24%, giving rise to a charged differential of approximately six percentage points on taxable profit remitted — the board should note that the durability of this favourable gap depends on future Malaysian or Australian fiscal policy, neither of which can be treated as fixed. The MYR/AUD spot rate at the appraisal date is 2.90 MYR per AUD, and whilst purchasing-power parity is assumed to forecast the year-2 exchange rate from the stated inflation differential, the board should be alert to the risk that MYR may not follow PPP precisely given Malaysia's managed-float regime and commodity-export sensitivity, meaning the converted AUD remittance could differ from the parity-derived figure; equally, Kijang Oils' cash flows rest on palm-oil processing margins that can be compressed by feedstock-price volatility and environmental-certification pressures, so the maintainable PBIT figure assumed here warrants stress-testing before the board commits to a recurring dividend level.

Raw inputs at the appraisal date:
• Base spot rate (MYR per AUD): 2.90
• Australian (home) inflation rate (assumed): 3.0%
• Malaysian (foreign) inflation rate (assumed): 5.5%
• Kijang Oils — maintainable PBIT (MYR m): 95.0
• Malaysian corporate tax rate: 24%
• Kijang Oils — depreciation / non-cash add-back (MYR m): 18.0
• Kijang Oils — capital expenditure (MYR m): 22.0
• Kijang Oils — increase in working capital (MYR m): 6.0
• Kijang Oils — market value of debt (MYR m): 120.0
• Kijang Oils — pre-tax cost of debt: 6.5%
• Kijang Oils — net new borrowing in year 2 (MYR m): 0
• Fraction of Kijang Oils FCFE remitted in year 2: 70%
• Host withholding tax on outbound dividends: 0%
• Australian parent corporate tax rate on foreign taxable profit: 30%
• Bilateral treaty: withholding tax is creditable against Australian liability
• Verdant parent own free cash flow to equity (AUD m): 22.0
• Verdant proposed total group dividend (AUD m): 38.0
• Remittance year: 2
• Annual growth of foreign cash flows (money terms): 0%

### model_answer

**Multinational dividend capacity and policy**

**Assumptions:** group dividend capacity is the CASH the parent can pay — its own free cash flow to equity plus the cash the overseas subsidiary can remit. 70% of the subsidiary's FCFE is remitted in year 2 at the PPP forecast spot of 3.0425 MYR/AUD. The parent's 30.00% home rate **exceeds** the foreign corporate rate 24.00% by 6.00%, so an additional home tax is **charged** on the foreign taxable profit — max(0, home 30.00% − foreign corporate 24.00% − creditable withholding 0.00%), shown per year.

**Step 1 — Subsidiary free cash flow to equity (foreign)**

Subsidiary FCFE = FCFF − after-tax interest + net new borrowing = **MYR 56.3m**.

**Step 2 — Remittance to the parent (net of withholding + differential home tax, converted to home)**

Remitted (foreign) = MYR 56.3m × 70% = MYR 39.4m; less withholding MYR 0.0m and differential home tax MYR 4.0m = MYR 35.4m; ÷ 3.0425 = **AUD 11.6m**.

**Step 3 — Group dividend capacity**

Group capacity = parent FCFE AUD 22.0m + remitted subsidiary FCFE AUD 11.6m = **AUD 33.6m**.

**Step 4 — Sustainability of the proposed dividend**

Against the proposed group dividend of AUD 38.0m, the capacity **falls short** of the proposed dividend by AUD 4.4m, so the proposed dividend is **not covered** and would have to draw on reserves or new finance — a red flag on sustainability.

**Step 5 — Advice to the board**

The most fragile assumption in this analysis is whether purchasing-power parity will govern the MYR/AUD exchange rate by year 2: Malaysia operates a managed float influenced by commodity revenues and Bank Negara intervention, so the actual rate at the time of remittance could diverge materially from the parity-derived forecast, directly altering the AUD value of Kijang Oils' contribution to group capacity. The board should also scrutinise the maintainability of Kijang Oils' stated PBIT, since palm-oil processing margins are exposed to feedstock-price volatility and the tightening of sustainability-certification requirements, either of which could erode the MYR cash flows underpinning the remittance. On the fiscal side, the six-percentage-point differential between Australia's 30% corporate rate and Malaysia's 24% rate is assumed stable, but any reduction in the Australian corporate rate — or an increase in the Malaysian rate — would alter the additional home tax charged and change the net AUD receipts; the board should confirm with its tax advisers whether the bilateral treaty's creditability provisions will apply in full to this structure. Finally, the decision to remit only 70% of Kijang Oils' free cash flow to equity reflects a reinvestment discipline that the board should formally link to a documented capital-expenditure plan for the subsidiary; retaining the blocked balance locally without a clear deployment strategy creates an opportunity cost that should be reported to shareholders alongside the dividend decision.

*Reconciliation: parent AUD 22.0m + remitted AUD 11.6m = capacity AUD 33.6m; capacity − proposed AUD 38.0m = a shortfall of AUD 4.4m ✓*

### hint

Before you can assess sustainability, check whether you have correctly sequenced the three tax layers — subsidiary FCFE, withholding tax on remittance, and the differential home tax on foreign taxable profit — and then converted only the net cash actually received by the parent at the PPP-derived year-2 spot rate.

### full_reveal

The most common misconception here is ABANDONED-AFTER-CALC: candidates grind through the subsidiary's FCFF-to-FCFE bridge and the currency conversion, then stop — leaving the board with a number but no verdict on whether the proposed dividend is sustainable. That omission is costly because the sustainability assessment and the board-level advice are precisely where the higher-level marks sit. The causal error is treating the calculation as the deliverable: in reality, the arithmetic is only the evidence base — the board needs to know whether the shortfall (or surplus) requires a cut to the proposed dividend, a draw on reserves, or a reconsideration of the remittance ratio, and it needs to understand which assumption in the model is most likely to move that conclusion. If your FCFE figure differs from the model's, carry it forward consistently through the remittance, conversion, and capacity steps — where your downstream method is sound, those marks remain available, and the error is charged once at its source. At the boardroom bar, the question is never "what is the number?" — it is "given this number and its fragility, what should the board do about the dividend?"

### answer_schema (serialised jsonb)

```json
{
  "params": {
    "parent_fcfe": 22,
    "forecast_spot": 3.042485154114431,
    "remit_fraction": 0.7,
    "proposed_dividend": 38,
    "add_tax_rate_effective": 0.06
  },
  "components": [
    {
      "unit": "MYRm",
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
      "expected_value": 56.272000000000006
    },
    {
      "unit": "AUDm",
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
        "= (FCFE 56.3 × remitted 70% − WHT − differential home tax) ÷ spot 3.0425"
      ],
      "expected_value": 11.635356692579789
    },
    {
      "unit": "AUDm",
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
      "expected_value": 22
    },
    {
      "unit": "AUDm",
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
        "= parent FCFE 22.0 + remitted subsidiary FCFE"
      ],
      "expected_value": 33.63535669257979
    },
    {
      "unit": "AUDm",
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
        "= dividend capacity − proposed dividend 38.0"
      ],
      "expected_value": -4.364643307420209
    }
  ]
}
```

---

