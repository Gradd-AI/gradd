# AFM BATCH #9 — VALUATION FAMILY — BLIND REVIEW PACK

**ROUND-1 ADJUDICATION CLOSED (2026-07-16) — all 3 findings ACCEPTED (prose/metadata, zero figure impact, no confirm round): FIX 1 K1 advice reframed off "acquisition premium" to a bargain-scepticism reconciliation; FIX 2 K2 retagged B4b→B4c; FIX 3 K4 EV/EBITDA schema working split into EV-then-strip-debt (false equality removed). Figures unchanged throughout.**

**Coverage map:** **B4a** = K1 fcff_enterprise (`0dc970a8`) + K4 valuation_compare (`9cb7d3f3`) · **B4b** = K3 dividend_capacity (`ef746ff0`) · **B4c** = K2 fcfe_equity (`cdef61d5`) + the rehab fcff_enterprise (`0a331272`).

**Calculator #9 `lib/acca/valuation.ts` (was `fcff.ts`, git mv). 5 drills, all `status='candidate'`, `published=false`, all 11 gates green.** Family: FCFF firm valuation / FCFE equity valuation / dividend capacity / two-method valuation compare. Code owns EVERY figure AND every figure-vs-figure verdict (offer test, sustainability, range/position); the model authors PROSE only and never states a number or an inequality.

**Review method (blind, hostile):** you have the AFM syllabus only; no project context. Recompute drill 1 of the family (K1) from scratch with full hostility; spot-check the siblings. Flag anything genuinely wrong — but the CLOSED RULINGS below are settled and MUST NOT be re-raised.

## The five kinds (what each teaches)
- **K1 fcff_enterprise** — derive the discount rate (CAPM → WACC), value the firm by FCFF, strip debt to equity, test the offer. Crux: a firm flow (FCFF) is discounted at **WACC** and you **strip debt**.
- **K2 fcfe_equity** — value the equity DIRECTLY by discounting FCFE at the cost of equity Ke, with **NO debt strip**; a maintainable no-growth perpetuity, so the FCFF route reconciles EXACTLY as a cross-check. Crux: an equity flow (FCFE) is discounted at **Ke** and you do **NOT** strip debt again.
- **K3 dividend_capacity** — dividend capacity is the CASH available to equity (FCFE), not accounting profit; judge whether the proposed dividend is sustainable.
- **K4 valuation_compare** — value by FCFF-DCF (Gordon) AND a relative multiple; the answer is a **range**, not a point; a P/E is an equity multiple, EV/EBITDA an enterprise multiple you must de-lever.

## ⛔ CLOSED RULINGS — do NOT re-raise (settled at Step-0, Grant + co-founder, 2026-07-16)
1. **COMPOSITION (K1).** K1 LIGHT-COMPOSES the CAPM calculator: the firm's OWN geared equity beta + capital structure → Ke = Rf + βe·MRP → MV-weighted WACC → the FCFF chain. **NO peer ungearing/regearing** in this kind (that is the CAPM calculator's own job). The Ke/WACC derivation is a graded chain that carries under OFR into firm value. Deliberate — do not "simplify" to a supplied WACC, and do not add peer ungearing.
2. **K2 INTERNAL RECONCILIATION.** The FCFF-vs-FCFE reconciliation is shown INSIDE K2's own single target (both routes on the same company, proven to reconcile) — NOT across two drills. K2 uses a maintainable **no-growth perpetuity with constant debt (no net new borrowing)** precisely so the two routes reconcile EXACTLY (E = FCFE/Ke = FCFF/WACC_implied − D). The value-weighted WACC is DERIVED for the cross-check; Ke is the supplied primary rate.
3. **DOMESTIC DIVIDEND SCOPE (K3).** Dividend capacity here is DOMESTIC. Remittance-blocked / multinational / transfer-pricing variants (LO A6) belong to batch #10 (international), NOT this batch. Do not flag the absence of remittance blocks.
4. **REHAB FIRST-REVIEW (drill 5).** The B4c drill REHABILITATES the parked pilot drill `d0727187` (regenerated through the hardened calculator). This is its **FIRST** blind review. On approval it SUPERSEDES `d0727187` (deleted/demoted at flip; NOT part of this batch's approved set).
5. **TOLERANCES.** Money: relative ±0.5% (NPV/APV precedent). Rates (Ke/WACC): absolute ±0.05 (CAPM precedent). Per-share: figure-integrity at displayed dp. Verdicts: code-owned booleans, zero tolerance. `g < r` is a hard compute guard.
6. **GATE 11 (new) — valuation flow/rate/bridge.** The deterministic VALUATION-PLUMBING guard: FCFF⇒WACC + one debt bridge; FCFE⇒Ke + no bridge + reconciles; capacity=FCFE + verdict; compare DCF-bridge + coherent range + offer position. All 5 pass it.
7. **OFR is CONDITIONAL** (house wording — "charged once at its source", credit conditional on correct subsequent use). Frozen-market-facts ("at the valuation date") applies. Not re-openable.

*Snapshot generated from the DB. All fields below are the live `acca_drills` rows verbatim.*

---

## K1 · fcff_enterprise (CAPM→WACC composed)
**Pair:** Saudi Arabia / SAR — private hospital & healthcare services  ·  **LO:** B4a  ·  **id:** `0dc970a8-3d60-4fb1-97db-2084e5df97ef`

### Question
Apply the CAPM–WACC framework and a free-cash-flow-to-firm model to value the equity of Nakheel Medical Group, and advise the board of Al-Rawabi Capital whether the vendor's indicative offer price represents fair value.

### Context
```
Nakheel Medical Group (NMG) is a privately owned Saudi Arabian hospital and specialist-clinic operator with four facilities concentrated in the Riyadh metropolitan area; Al-Rawabi Capital is evaluating an acquisition and has received an indicative equity offer from the vendor. NMG derives approximately 80% of its revenue from two large corporate health-insurance contracts, creating material client-concentration risk that the board should weigh against the headline growth assumption. The vendor's financial advisers assert that NMG's current capital-expenditure programme reflects a genuinely sustainable reinvestment rate, but the board should challenge whether the elevated capex reflects a one-off bed-expansion cycle rather than a steady-state maintenance level, given that NMG opened its fourth facility only eighteen months ago.

Raw inputs:
  PBIT (maintainable operating profit): SAR 210 million
  Corporate tax rate: 20% (0.20)
  Depreciation / non-cash add-back: SAR 55 million
  Capital expenditure (reinvestment): SAR 90 million
  Increase in working capital: SAR 18 million
  Market value of debt: SAR 480 million
  Long-term perpetuity growth rate: 3.5% (0.035)
  Risk-free rate (Saudi government sukuk yield): 4.2%
  Equity / market risk premium: 6.5%
  NMG's own (geared) equity beta: 1.15
  Vendor's estimated equity value (used for WACC weighting — a stated simplification for a private target): SAR 620 million
  Market value of debt (weight for WACC): SAR 480 million
  Pre-tax cost of debt: 5.8%
  Vendor's indicative equity offer: SAR 700 million
```

### Model answer

**Firm and equity valuation (FCFF, with the cost of capital derived)**

**Step 0 — Cost of capital (CAPM → WACC)**

Ke = Rf + βe × MRP = 4.20% + 1.15 × 6.50% = **11.68%**
WACC = Ke×We + Kd(1−T)×Wd = 11.68%×0.564 + 5.80%×(1−0.2)×0.436 = **8.61%**  *(the firm-level discount rate)*

**Step 1 — Free cash flow to firm (FCFF)**

FCFF = PBIT×(1−t) + depreciation − capex − ΔWC = 210.0×(1−0.2) + 55.0 − 90.0 − 18.0 = **SAR 115.0m**  *(interest is NOT deducted — the return to debt is in the WACC)*

**Step 2 — Enterprise (firm) value**

Firm value = FCFF×(1+g)/(WACC−g) = 115.0×(1+0.035)/(8.61% − 3.50%) = **SAR 2331.5m**  *(a firm flow is discounted at WACC)*

**Step 3 — Equity value (fair value of the equity)**

Equity value = firm value − market value of debt = 2331.5 − 480.0 = **SAR 1851.5m**  *(strip the debt — this is the fair value of the equity)*

**Step 4 — Offer test (base case)**

The vendor's equity offer of SAR 700.0m is **below** the intrinsic equity value of SAR 1851.5m by **SAR 1151.5m** — on the base case the offer is **supportable**.

**Step 5 — Reconcile the equity divergence (before any bargain claim)**

The model's equity value of SAR 1851.5m is roughly 3.0× the SAR 620.0m estimated equity figure used to weight the WACC. Before treating the offer as a bargain the board must reconcile that gap — through the perpetuity growth-versus-WACC spread, the maintainable capex assumption, or a stale/understated equity estimate. *(Weight circularity: re-weighting the WACC at the model's own equity value would raise the equity weight, lift the WACC and lower the valuation; using the estimated equity for the weights is the standard exam simplification for a private target.)*

**Step 6 — Advice to the board**

The critical discipline in this valuation is matching the cash flow to the correct discount rate: FCFF is a pre-financing flow belonging to all providers of capital, so it must be discounted at WACC — the blended, market-value-weighted cost of both equity and debt — and the resulting figure is enterprise (firm) value, not equity value; debt must then be stripped away to isolate the equity value that is comparable to the vendor's offer. The CAPM derivation uses NMG's own geared beta, which already reflects the financial risk of the company's actual capital structure, so no re-gearing adjustment is needed here. The board should treat the 3.5% perpetuity growth assumption with scepticism: NMG's revenue is heavily concentrated in two corporate insurance contracts, meaning a contract loss or renegotiation could structurally impair long-run cash flows and make the assumed growth rate unsustainable, which would materially compress firm value. Similarly, the board should commission an independent technical review of whether the SAR 90 million capital expenditure figure represents steady-state reinvestment or the tail end of a bed-expansion cycle — overstating sustainable capex depresses FCFF and understates value, while understating it inflates value, so the direction of any bias must be confirmed before proceeding. Finally, the apparent bargain implied by the vendor's offer sitting materially below the model equity value should not be accepted at face value: before treating the price as attractive, the board should reconcile the valuation gap against the perpetuity growth assumption, capex sustainability, client concentration, and the reliability of the equity estimate used in the WACC weighting.

*Reconciliation: WACC 8.61% → firm SAR 2331.5m − debt SAR 480.0m = equity SAR 1851.5m ✓*

### Hint
Before you can compare anything to the vendor's offer price, check whether what you have discounted is a firm flow or an equity flow — and whether you have stripped away the debt that sits between enterprise value and the equity value the board is actually being asked to pay for.

### Full reveal
The classic misconception here is VALUATION PLUMBING: candidates either deduct interest before arriving at FCFF, or they discount the firm flow at the cost of equity rather than WACC, or — having reached a firm value — they forget to strip the debt before comparing to the vendor's equity offer price. Each error matters for a different structural reason: deducting interest double-counts the cost of debt (because the return to debt providers is already embedded in the WACC as the weighted cost of the debt tranche), while mismatching the discount rate produces a mismatch between what the rate prices and what the flow represents — FCFF belongs to all capital providers, so it must be discounted at the blended, market-value-weighted rate that reflects all of them, not just equity holders. If your FCFF or WACC figure is wrong but your downstream method is structurally correct — debt stripped, perpetuity growth applied, offer compared to equity value — carry your own figure forward consistently, because those method marks still score where the logic holds; OFR credit is conditional on correct subsequent use, not automatic. At the boardroom bar, the calculation is the floor: the board needs to know whether the vendor's indicative price is supportable, and that verdict must engage the scenario's specific scepticism points — the concentration of NMG's revenue in two corporate insurance contracts and the sustainability of the perpetuity growth assumption — not merely note that assumptions exist.

### answer_schema (serialized)

```json
{
 "params": {
  "kd": 0.057999999999999996,
  "ke": 11.674999999999999,
  "wd": 0.43636363636363634,
  "we": 0.5636363636363636,
  "wacc": 8.605181818181817,
  "tax_rate": 0.2,
  "company_ve": 620,
  "debt_value": 480,
  "growth_rate": 0.035,
  "offer_price": 700
 },
 "components": [
  {
   "unit": "%",
   "label": "Cost of equity (CAPM)",
   "tolerance": {
    "kind": "absolute",
    "value": 0.05
   },
   "component_id": "ke",
   "working_steps": [
    "Ke = Rf + βe × MRP = 4.20% + 1.15 × 6.50% = 11.68%"
   ],
   "expected_value": 11.674999999999999
  },
  {
   "unit": "%",
   "label": "WACC (MV-weighted)",
   "recompute": "wacc_mv_weighted",
   "tolerance": {
    "kind": "absolute",
    "value": 0.05
   },
   "depends_on": [
    "ke"
   ],
   "component_id": "wacc",
   "working_steps": [
    "WACC = Ke×We + Kd(1−T)×Wd = Ke×0.564 + 5.80%×(1−0.2)×0.436"
   ],
   "expected_value": 8.605181818181817
  },
  {
   "unit": "SARm",
   "label": "Free cash flow to firm (FCFF)",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "component_id": "fcff",
   "working_steps": [
    "FCFF = PBIT×(1−t) + dep − capex − ΔWC = 115.0"
   ],
   "expected_value": 115
  },
  {
   "unit": "SARm",
   "label": "Enterprise (firm) value",
   "recompute": "firm_value_perpetuity_growth",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "fcff",
    "wacc"
   ],
   "component_id": "firm_value",
   "working_steps": [
    "Firm value = FCFF×(1+g)/(WACC−g)  [firm flow @ WACC]"
   ],
   "expected_value": 2331.4546717239173
  },
  {
   "unit": "SARm",
   "label": "Equity value",
   "recompute": "equity_value_strip_debt",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "firm_value"
   ],
   "component_id": "equity_value",
   "working_steps": [
    "Equity = firm value − debt = 2331.5 − 480.0"
   ],
   "expected_value": 1851.4546717239173
  },
  {
   "unit": "SARm",
   "label": "Equity value vs offer (signed)",
   "recompute": "equity_minus_offer",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "equity_value"
   ],
   "component_id": "equity_vs_offer",
   "working_steps": [
    "Equity − offer = 1851.5 − 700.0"
   ],
   "expected_value": 1151.4546717239173
  }
 ]
}
```

---

## K2 · fcfe_equity (no-growth, exact FCFF↔FCFE reconciliation)
**Pair:** Thailand / THB — branded household & personal-care FMCG  ·  **LO:** B4c  ·  **id:** `cdef61d5-0a93-47b2-8aee-724a9c276bf1`

### Question
Forecast Siam Bloom Consumer Products PCL's free cash flow to equity (FCFE) and, using the FCFE-based perpetuity, advise the board of Thanakit Capital on whether the vendor's indicative offer price represents fair value for the equity.

### Context
```
Thanakit Capital is evaluating a controlling-stake acquisition in Siam Bloom Consumer Products PCL, a Bangkok-listed branded household and personal-care FMCG manufacturer whose product lines — fabric conditioners, liquid hand-wash, and facial moisturisers — are sold predominantly through a single modern-trade retailer that accounts for roughly 60% of annual revenue, creating meaningful customer-concentration risk. The board has been provided with a set of maintainable base-year operating figures and has been told to treat debt as constant (no new borrowing), apply a corporate tax rate of 20%, and value the equity as a no-growth perpetuity; capex in the most recent year ran notably above the level management considers sustainably necessary for the existing asset base, and the board should scrutinise whether the higher historical figure or the lower sustainable level is the appropriate reinvestment assumption.

Raw inputs (THB millions, rates in %):
- PBIT (maintainable): THB 480 million
- Corporate tax rate: 20%
- Depreciation: THB 95 million
- Capital expenditure (as reported): THB 140 million
- Increase in working capital: THB 30 million
- Market value of debt: THB 600 million
- Pre-tax cost of debt (Kd): 6%
- Cost of equity (Ke): 13%
- Vendor's indicative equity offer price: THB 2,800 million
```

### Model answer
**Equity valuation (free cash flow to equity)**

**Assumptions:** a maintainable no-growth perpetuity with constant debt (no net new borrowing); FCFE is discounted at the cost of equity Ke = 13.00%; debt is THB 600.0m at market value.

**Step 1 — Free cash flow to firm (FCFF)**

FCFF = PBIT×(1−t) + depreciation − capex − ΔWC = 480.0×(1−0.2) + 95.0 − 140.0 − 30.0 = **THB 309.0m**

**Step 2 — Free cash flow to equity (FCFE)**

FCFE = FCFF − after-tax interest = 309.0 − Kd×D×(1−t) = 309.0 − 6.00%×600.0×(1−0.2) = **THB 280.2m**  *(FCFE nets the financing that FCFF left out)*

**Step 3 — Equity value (fair value of the equity)**

Equity value = FCFE / Ke = 280.2 / 13.00% = **THB 2155.4m**  *(an equity flow is discounted at the cost of equity — and you do NOT strip debt again; FCFE is already an equity number; this is the fair value of the equity)*

**Step 4 — Cross-check: the FCFF route reconciles**

Implied firm value = equity + debt = 2155.4 + 600.0 = THB 2755.4m; the value-weighted WACC = **11.21%**. Discounting FCFF at that WACC and stripping debt gives 309.0 / 11.21% − 600.0 = **THB 2155.4m** — the same equity value. The two routes reconcile.

**Step 5 — Offer test**

The vendor's equity offer of THB 2800.0m is **above** the intrinsic equity value of THB 2155.4m by **THB 644.6m** — the offer is **not supportable at this price**.

**Step 6 — Advice to the board**

The essential valuation discipline here is that FCFE — the cash flow remaining for equity holders after all reinvestment needs and after interest has been serviced on Siam Bloom's THB 600 million debt — is an equity-level flow and must therefore be discounted at the cost of equity of 13%, never at WACC; discounting it at WACC would mismatch the flow to the wrong rate and produce a meaningless result. Equally, because the debt is already serviced within the FCFE build, the board must not subtract the THB 600 million debt a second time when deriving equity value — that would double-count the debt burden. The most fragile input is the capex assumption: management's assertion that recent capital expenditure overstates the sustainable reinvestment requirement should be tested against detailed asset-condition reports and maintenance schedules, because a lower sustainable capex materially increases FCFE and therefore the equity value the board is comparing against the offer. Customer concentration — with approximately 60% of Siam Bloom's revenue flowing through a single modern-trade retailer — means that maintainable PBIT could deteriorate sharply if that relationship is renegotiated or lost, and the board should require visibility of the retailer contract terms and renewal timeline before treating the maintainable PBIT as durable. Finally, the no-growth assumption should be stress-tested: if Siam Bloom can credibly reinvest at returns above its cost of equity, a zero-growth perpetuity understates value, whereas if the personal-care category faces structural volume pressure in Thailand, the perpetuity may overstate it.

*Reconciliation: FCFE THB 280.2m / Ke 13.00% = equity THB 2155.4m = FCFF route THB 2155.4m ✓*

### Hint
Check which flow you are discounting and at which rate — FCFE is already an equity-level number, so ask yourself whether the rate you've applied is the equity holder's required return or something else, and whether you've then subtracted debt a second time when it was already accounted for in the flow build.

### Full reveal
The classic misconception here is VALUATION PLUMBING: candidates either discount FCFE at WACC (a flow-rate mismatch) or, having correctly discounted at the cost of equity, then strip out the THB 600 million debt to reach "equity value" — double-counting the debt burden that was already serviced inside the FCFE build itself. The mismatch matters because WACC blends the cost of debt into the rate precisely to handle the debt claim at the firm level; applying it to FCFE — which has already paid that debt claim — misprices the residual equity cash flow against the wrong hurdle, producing a result that is economically meaningless rather than simply high or low. The correct mental model is a strict pairing rule: firm flow (FCFF) pairs with WACC and you strip debt at the end; equity flow (FCFE) pairs with the cost of equity and you stop there — the debt has already been netted out of the flow. If your FCFE or equity value figure is wrong, carry it forward consistently into the offer comparison — where your method is correct downstream, those marks still score, but that OFR credit is conditional on your own figure being used correctly in the subsequent steps, not automatically awarded. Finally, the calculation is only the floor: the board needs a recommendation, and the advice must name what assumptions are most fragile — at the valuation date, the capex level and the single-retailer concentration risk are the inputs most likely to move the conclusion.

### answer_schema (serialized)
```json
{
 "params": {
  "kd": 0.06,
  "ke": 0.13,
  "tax_rate": 0.2,
  "debt_value": 600,
  "offer_price": 2800,
  "wacc_implied": 0.11214405360134004
 },
 "components": [
  {
   "unit": "THBm",
   "label": "Free cash flow to firm (FCFF)",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "component_id": "fcff",
   "working_steps": [
    "FCFF = PBIT×(1−t) + dep − capex − ΔWC = 309.0"
   ],
   "expected_value": 309
  },
  {
   "unit": "THBm",
   "label": "Free cash flow to equity (FCFE)",
   "recompute": "fcfe_after_tax_interest",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "fcff"
   ],
   "component_id": "fcfe",
   "working_steps": [
    "FCFE = FCFF − after-tax interest = FCFF − Kd×D×(1−t) = 309.0 − 6.00%×600.0×(1−0.2)"
   ],
   "expected_value": 280.2
  },
  {
   "unit": "THBm",
   "label": "Equity value (FCFE @ Ke, no debt bridge)",
   "recompute": "equity_fcfe_perpetuity",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "fcfe"
   ],
   "component_id": "equity_value",
   "working_steps": [
    "Equity = FCFE / Ke  [equity flow @ cost of equity; NO debt strip] = 280.2 / 13.00%"
   ],
   "expected_value": 2155.3846153846152
  },
  {
   "unit": "THBm",
   "label": "Equity value vs offer (signed)",
   "recompute": "equity_minus_offer",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "equity_value"
   ],
   "component_id": "equity_vs_offer",
   "working_steps": [
    "Equity − offer = 2155.4 − 2800.0"
   ],
   "expected_value": -644.6153846153848
  }
 ]
}
```

---

## K3 · dividend_capacity (domestic)
**Pair:** New Zealand / NZD — regulated water & wastewater utility  ·  **LO:** B4b  ·  **id:** `ef746ff0-6d32-4be0-a165-9d7e1d18ef13`

### Question
Forecast Waitaha Waters Limited's free cash flow to equity (FCFE) for the current financial year and advise the board whether the proposed dividend is sustainable.

### Context
```
Waitaha Waters Limited is a regulated water and wastewater utility serving the Canterbury region of New Zealand. The Commerce Commission sets a five-year price path that caps revenue growth, making operating cash flows stable but capital intensity high — the company is mid-way through a NZD 400 million infrastructure-renewal programme that is running materially ahead of its historical average reinvestment rate, raising a genuine question about whether current capex is maintainable or a temporary regulatory-mandated spike. The board has proposed a total dividend of NZD 38 million for the year, citing strong reported net profit, but the chief financial officer has asked for a cash-based assessment before distribution approval.

Raw inputs (NZD millions unless stated):
- PBIT (maintainable operating profit): 74
- Corporate tax rate: 28%
- Depreciation: 31
- Capital expenditure (current year, renewal programme): 62
- Increase in working capital: 4
- Market value of debt: 210
- Pre-tax cost of debt: 5.2%
- Net new borrowing raised this year: 12
- Proposed total dividend: 38
- Shares in issue: 95 million

Challengeable textures: (1) Current capex of NZD 62 million reflects a regulatory renewal spike — sustainable long-run reinvestment is closer to NZD 40 million (matching depreciation plus a modest growth allowance), so a steady-state FCFE would differ materially from the current-year figure. (2) Revenue is capped by the Commerce Commission price path, which suppresses any organic growth beyond regulated inflation adjustments; dividend durability therefore depends entirely on the regulator's next determination.
```

### Model answer
**Dividend capacity and dividend policy**

**Assumptions:** dividend capacity is the CASH available to equity holders this year (free cash flow to equity), not accounting profit; debt is NZD 210.0m; net new borrowing of NZD 12.0m is included as a source.

**Step 1 — Free cash flow to firm (FCFF)**

FCFF = PBIT×(1−t) + depreciation − capex − ΔWC = 74.0×(1−0.28) + 31.0 − 62.0 − 4.0 = **NZD 18.3m**

**Step 2 — Dividend capacity (FCFE)**

Dividend capacity = FCFF − after-tax interest + net new borrowing = 18.3 − 5.20%×210.0×(1−0.28) + 12.0 = **NZD 22.4m**

Dividend capacity per share = 22.4 / 95.0 shares = **0.236** per share.

**Step 3 — Sustainability of the proposed dividend**

Against the proposed dividend of NZD 38.0m, the capacity **falls short** of the proposed dividend by **NZD 15.6m**, so the proposed dividend is **NOT covered by cash generated** and would have to be funded from reserves or new finance — a red flag on sustainability.

**Step 4 — Advice to the board**

The critical discipline here is that dividend capacity is a cash concept, not an accounting one — FCFE measures the cash actually available to shareholders after the business has met its tax obligations, replaced and expanded its asset base, serviced its debt interest in cash, and accounted for any new borrowing that augments the equity pool. Because FCFE is an equity flow, no discounting at a cost of capital is required to test sustainability; the comparison is simply the cash generated against the cash proposed to be distributed. The board should be particularly sceptical of the current capex figure: the renewal programme is a regulatory-mandated spike, and if the Commerce Commission's next price determination requires a further uplift, the sustainable FCFE in subsequent years may contract without a commensurate rise in regulated revenue. The price-path constraint imposed by the Commerce Commission also means that the utility cannot freely grow its way out of a tight dividend-capacity position — any shortfall is structural, not cyclical, and the board should obtain the regulator's indicative capex allowance for the next regulatory period before committing to a recurring dividend level. Finally, the board should confirm whether the NZD 12 million of net new borrowing is a one-off draw to part-fund the renewal programme or the beginning of a sustained gearing trajectory, since repeated reliance on new debt to support distributions would erode the regulated capital structure and potentially attract regulatory scrutiny.

*Reconciliation: capacity NZD 22.4m − proposed NZD 38.0m = surplus NZD -15.6m ✓*

### Hint
Check whether you've treated net new borrowing as a source of funds available to equity holders in your FCFE bridge — and then ask yourself whether your final number actually supports or refutes the proposed dividend, rather than leaving the board to draw their own conclusion.

### Full reveal
The dominant misconception here is VALUATION PLUMBING combined with ABANDONED-AFTER-CALC: candidates either mis-wire the FCFF-to-FCFE bridge — most often by omitting net new borrowing, or by deducting gross interest rather than after-tax interest cost — or they produce a defensible FCFE figure and then stop, leaving the sustainability verdict unspoken. The wiring error matters because FCFE is an equity flow, not a firm flow: it starts from what the whole enterprise generates after tax (FCFF), then adjusts for the cash cost of servicing debt and for any net proceeds from new borrowing that augment the equity pool — miss either adjustment and your FCFE figure misstates the cash that is genuinely available to shareholders. The causal mechanism behind the interest error is a confusion between accounting and cash-flow treatment: interest is already excluded from FCFF (it is captured in the WACC when discounting firm flows), so when you step down to FCFE you deduct after-tax interest as a cash outflow to debt holders — omitting the tax shield means you understate the cash remaining for equity. If your FCFE figure is wrong but your downstream comparison of capacity against the proposed dividend is methodologically sound, carry your own figure forward — those sustainability marks still score where the method holds, and the error is charged once at its source. At the boardroom bar, the number is only the floor: the board needs to know whether the proposed dividend is covered, by how much it may fall short or exceed capacity, and — critically given the regulatory price-path constraint evidenced in the scenario — whether any shortfall is likely structural rather than a one-year anomaly.

### answer_schema (serialized)
```json
{
 "params": {
  "kd": 0.052,
  "tax_rate": 0.28,
  "debt_value": 210,
  "net_borrowing": 12,
  "proposed_dividend": 38
 },
 "components": [
  {
   "unit": "NZDm",
   "label": "Free cash flow to firm (FCFF)",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "component_id": "fcff",
   "working_steps": [
    "FCFF = PBIT×(1−t) + dep − capex − ΔWC = 18.3"
   ],
   "expected_value": 18.28
  },
  {
   "unit": "NZDm",
   "label": "FCFE = dividend capacity (cash available to equity)",
   "recompute": "fcfe_dividend_capacity",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "fcff"
   ],
   "component_id": "fcfe",
   "working_steps": [
    "FCFE = FCFF − Kd×D×(1−t) + net new borrowing = 18.3 − 5.20%×210.0×(1−0.28) + 12.0"
   ],
   "expected_value": 22.4176
  },
  {
   "unit": "NZDm",
   "label": "Capacity surplus over proposed dividend (signed)",
   "recompute": "capacity_minus_proposed",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "fcfe"
   ],
   "component_id": "capacity_surplus",
   "working_steps": [
    "Surplus = dividend capacity − proposed dividend = 22.4 − 38.0"
   ],
   "expected_value": -15.5824
  }
 ]
}
```

---

## K4 · valuation_compare (DCF + relative multiple → range)
**Pair:** Philippines / PHP — IT / business-process-outsourcing services  ·  **LO:** B4a  ·  **id:** `9cb7d3f3-d200-47a6-80ec-f456555fb8c7`

### Question
Apply two independent valuation methods — (1) a free-cash-flow-to-firm (FCFF) Gordon-growth model and (2) an EV/EBITDA market multiple — to estimate the equity value of Meridian BPO Holdings, Inc., establish a valuation range, and advise the board of Archipelago Digital Group on whether the vendor's indicative offer price represents fair value.

### Context
```
Meridian BPO Holdings, Inc. is a Philippines-based IT and business-process-outsourcing services group operating seven delivery centres across Metro Manila, Cebu, and Davao, with long-term contracts servicing four North American financial-services clients that together account for approximately 82% of annual revenues — a concentration that materially elevates renewal risk. Archipelago Digital Group is evaluating a full acquisition of Meridian and has received an indicative vendor offer; the board must determine whether that price is supportable before entering exclusivity. The valuation team notes that Meridian's reported capital expenditure reflects an aggressive infrastructure-expansion programme for a planned eighth centre, which may not reflect the maintainable, steady-state reinvestment level required to sustain the long-run growth rate assumed in the DCF; the board should treat this tension as a key sensitivity.

Raw inputs (PHP millions unless stated):
- PBIT (maintainable base-year): PHP 1,840m
- Corporate tax rate: 25%
- Depreciation: PHP 620m
- Capital expenditure: PHP 780m
- Increase in working capital: PHP 95m
- Market value of debt: PHP 2,100m
- WACC: 11.5%
- Long-run perpetuity growth rate: 4.5%
- EV/EBITDA peer multiple: 9.2×
- EBITDA (base-year): PHP 2,460m
- Vendor's indicative equity offer price: PHP 14,500m
```

### Model answer
**Valuation of the target — two methods and a range**

**Method 1 — Discounted cash flow (FCFF, Gordon growth)**

FCFF = PBIT×(1−t) + depreciation − capex − ΔWC = 1840.0×(1−0.25) + 620.0 − 780.0 − 95.0 = **PHP 1125.0m**
Enterprise value = FCFF×(1+g)/(WACC−g) = 1125.0×(1+0.045)/(11.50% − 4.50%) = **PHP 16794.6m**
Equity (DCF) = EV − debt = 16794.6 − 2100.0 = **PHP 14694.6m**

**Method 2 — Relative (market multiple)**

Enterprise value = 9.2× × EBITDA 2460.0 = PHP 22632.0m; equity = PHP 22632.0m − debt PHP 2100.0m = **PHP 20532.0m**  *(EV/EBITDA is an enterprise multiple — strip debt)*

**Range and offer test**

The two methods bracket a fair value range for the equity of **PHP 14694.6m to PHP 20532.0m** (each method estimates the fair value of the equity). The offer of PHP 14500.0m sits **below** the PHP 14694.6m–PHP 20532.0m range — it looks **cheap**; the board could bid and still leave value on the table.

**Advice to the board**

The critical discipline here is matching each cash flow to its appropriate discount rate and equity derivation: FCFF represents the pre-financing cash surplus available to all capital providers and must therefore be discounted at the blended WACC, after which the market value of debt is subtracted to isolate equity value — interest is deliberately excluded from the FCFF build because the debt-holders' return is already embedded in the WACC denominator. The EV/EBITDA multiple is an enterprise-value multiple applied to a pre-interest, pre-tax earnings measure, so the resulting enterprise value must equally be de-levered by subtracting Meridian's debt before arriving at an equity figure that is comparable to the DCF equity result. Two methods intentionally produce a range rather than a single point, and the board should treat that spread as the zone of rational negotiation rather than seeking false precision from either model alone. The most fragile input in the DCF is the perpetuity growth rate: Meridian's revenue is heavily concentrated in four North American financial-services clients representing over four-fifths of revenues, and any non-renewal or repricing event could suppress sustainable growth well below the assumed rate, compressing the equity value significantly. Equally, the board should scrutinise whether the reported capital expenditure — elevated by a planned eighth delivery centre — overstates the steady-state reinvestment need, since using expansion capex in a perpetuity model implicitly assumes that level of spending recurs forever, which would systematically depress the FCFF and understate equity value relative to a normalised reinvestment assumption.

*Reconciliation: DCF equity PHP 14694.6m and relative equity PHP 20532.0m → range PHP 14694.6m–PHP 20532.0m; offer PHP 14500.0m is below ✓*

### Hint
Both the FCFF model and the EV/EBITDA multiple produce enterprise values first — check whether you subtracted Meridian's debt from each to arrive at an equity value before testing the offer price against your range.

### Full reveal
The classic misconception here is VALUATION PLUMBING: candidates either discount FCFF at the cost of equity rather than WACC, or — crucially — they forget to strip debt from the enterprise value to isolate equity value, and they do this for one method but not the other, making the two outputs incomparable. The error matters because FCFF is the pre-financing surplus available to all capital providers; the WACC already prices the debt-holders' claim in its denominator, so subtracting debt from the resulting enterprise value is the mechanical step that converts a whole-firm value into the equity slice the acquirer is actually buying. EV/EBITDA is an enterprise multiple applied to a pre-interest earnings figure — it has precisely the same logic: the multiple produces an enterprise value, and Meridian's debt must be stripped before that figure can sit alongside the DCF equity result in a coherent range. If your FCFF or multiple figure is off but your de-levering step and offer-price comparison follow consistently from your own number, carry that figure forward — where the downstream method holds, those marks remain in play, and the error is charged once at its source. The board question is where the drill ultimately lives: a range with no verdict on whether the offer looks cheap, full, or within the zone of rational negotiation is fence-sitting — your job is to tell the board what the numbers suggest about negotiating headroom, while flagging the assumptions — particularly the perpetuity growth rate and the normalcy of the elevated capex figure — that could compress or expand that range at the valuation date.

### answer_schema (serialized)
```json
{
 "params": {
  "wacc": 0.115,
  "debt_value": 2100,
  "equity_low": 14694.642857142855,
  "equity_high": 20532,
  "growth_rate": 0.045,
  "offer_price": 14500
 },
 "components": [
  {
   "unit": "PHPm",
   "label": "Free cash flow to firm (FCFF)",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "component_id": "fcff",
   "working_steps": [
    "FCFF = PBIT×(1−t) + dep − capex − ΔWC = 1125.0"
   ],
   "expected_value": 1125
  },
  {
   "unit": "PHPm",
   "label": "Enterprise value (FCFF-DCF, Gordon growth)",
   "recompute": "firm_value_perpetuity_growth",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "fcff"
   ],
   "component_id": "firm_value_dcf",
   "working_steps": [
    "EV = FCFF×(1+g)/(WACC−g)"
   ],
   "expected_value": 16794.642857142855
  },
  {
   "unit": "PHPm",
   "label": "Equity value (DCF method)",
   "recompute": "equity_value_strip_debt",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "firm_value_dcf"
   ],
   "component_id": "equity_dcf",
   "working_steps": [
    "Equity (DCF) = EV − debt = 16794.6 − 2100.0"
   ],
   "expected_value": 14694.642857142855
  },
  {
   "unit": "PHPm",
   "label": "Equity value (EV/EBITDA, less debt)",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "component_id": "equity_multiple",
   "working_steps": [
    "EV = 9.2× × EBITDA 2460.0 = 22632.0",
    "Equity = EV − debt 2100.0 = 20532.0"
   ],
   "expected_value": 20532
  }
 ]
}
```

---

## B4c REHAB · fcff_enterprise (regenerated through the hardened calculator — FIRST blind review)
**Pair:** Australia / AUD — diversified industrial conglomerate  ·  **LO:** B4c  ·  **id:** `0a331272-9346-4e12-be23-2e546e8ce0db`

### Question
Advise the board of Kalgara Holdings Ltd on whether the vendor's indicative equity offer for Ironbark Industrial Group represents fair value, deriving the cost of equity via CAPM, computing the weighted-average cost of capital, valuing the firm using its free cash flow to the firm, and stripping debt to arrive at an equity value.

### Context
```
Kalgara Holdings Ltd, an ASX-listed conglomerate, is evaluating the acquisition of Ironbark Industrial Group, a privately held Australian diversified industrial business with operations spanning mining-equipment fabrication, port-logistics infrastructure, and industrial coatings. Ironbark's revenue is heavily weighted toward two Pilbara-region mining clients (representing approximately 70% of contracted revenue), exposing the group to commodity-cycle risk that may not be fully reflected in the assumed perpetuity growth rate. The board has been presented with a vendor's indicative equity offer and requires an independent valuation grounded in Ironbark's maintainable free cash flow; the board should also note that Ironbark's recent capital expenditure has exceeded any plausible sustainable reinvestment level, raising the question of whether the normalised capex figure supplied is conservative or whether elevated investment will persist.

Raw inputs:
  PBIT (maintainable operating profit):        AUD 184 m
  Corporate tax rate:                          28% (0.28)
  Depreciation (non-cash add-back):            AUD 41 m
  Capital expenditure:                         AUD 55 m
  Increase in working capital:                 AUD 12 m
  Market value of debt:                        AUD 310 m
  Long-term perpetuity growth rate:            2.5% (0.025)
  Risk-free rate:                              4.2%
  Equity / market risk premium:                6.0%
  Ironbark's own geared equity beta:           1.18
  Vendor's estimated equity value (used for WACC weighting — a stated simplification for a private target): AUD 490 m
  Market value of debt (weight / kd base):     AUD 310 m
  Pre-tax cost of debt:                        5.8%
  Vendor's indicative equity offer:            AUD 720 m
```

### Model answer
**Firm and equity valuation (FCFF, with the cost of capital derived)**

**Step 0 — Cost of capital (CAPM → WACC)**

Ke = Rf + βe × MRP = 4.20% + 1.18 × 6.00% = **11.28%**
WACC = Ke×We + Kd(1−T)×Wd = 11.28%×0.613 + 5.80%×(1−0.28)×0.388 = **8.53%**  *(the firm-level discount rate)*

**Step 1 — Free cash flow to firm (FCFF)**

FCFF = PBIT×(1−t) + depreciation − capex − ΔWC = 184.0×(1−0.28) + 41.0 − 55.0 − 12.0 = **AUD 106.5m**  *(interest is NOT deducted — the return to debt is in the WACC)*

**Step 2 — Enterprise (firm) value**

Firm value = FCFF×(1+g)/(WACC−g) = 106.5×(1+0.025)/(8.53% − 2.50%) = **AUD 1810.8m**  *(a firm flow is discounted at WACC)*

**Step 3 — Equity value (fair value of the equity)**

Equity value = firm value − market value of debt = 1810.8 − 310.0 = **AUD 1500.8m**  *(strip the debt — this is the fair value of the equity)*

**Step 4 — Offer test (base case)**

The vendor's equity offer of AUD 720.0m is **below** the intrinsic equity value of AUD 1500.8m by **AUD 780.8m** — on the base case the offer is **supportable**.

**Step 5 — Reconcile the equity divergence (before any bargain claim)**

The model's equity value of AUD 1500.8m is roughly 3.1× the AUD 490.0m estimated equity figure used to weight the WACC. Before treating the offer as a bargain the board must reconcile that gap — through the perpetuity growth-versus-WACC spread, the maintainable capex assumption, or a stale/understated equity estimate. *(Weight circularity: re-weighting the WACC at the model's own equity value would raise the equity weight, lift the WACC and lower the valuation; using the estimated equity for the weights is the standard exam simplification for a private target.)*

**Step 6 — Advice to the board**

The most fragile input is the perpetuity growth rate of 2.5%, which assumes Ironbark can sustain revenue expansion indefinitely despite its stated concentration in two Pilbara mining clients; the board should stress-test this rate against a scenario where commodity-cycle contraction suppresses volumes, because the perpetuity formula amplifies even a modest reduction in growth into a materially lower firm value. The normalised capital expenditure figure also deserves rigorous due diligence: if Ironbark's recent above-trend investment reflects ongoing capacity requirements rather than a one-off catch-up, the true free cash flow available to capital providers will be lower than this model implies, and the board should request audited asset-register and maintenance-capex schedules before relying on the supplied figure. On valuation plumbing, FCFF is a pre-financing flow — it represents cash generated for all capital providers before any interest deduction — and therefore must be discounted at WACC, which blends the returns required by both debt and equity holders; stripping the resulting firm value of debt then isolates the residual claim belonging to equity, which is what the vendor's offer should be compared against. The MV-weighted WACC derived here uses Ironbark's own geared beta, which already embeds the leverage observed in its current capital structure, so no peer-group ungearing adjustment is required; however, the board should confirm whether Kalgara's post-acquisition financing structure would differ materially, since a significant recapitalisation would alter the effective discount rate and therefore the equity value. Finally, the customer-concentration risk inherent in a 70%-revenue exposure to two counterparties is a legitimate basis for demanding a structural discount or earn-out mechanism in any final offer, a factor the Gordon-growth perpetuity model does not capture of its own accord.

*Reconciliation: WACC 8.53% → firm AUD 1810.8m − debt AUD 310.0m = equity AUD 1500.8m ✓*

### Hint
Before you reach for the "accept or reject" verdict, check your plumbing: have you discounted a pre-interest, pre-financing flow at the rate that blends the returns of all capital providers — and then stripped the debt to isolate what equity holders actually own?

### Full reveal
The classic misconception on FCFF drills is VALUATION PLUMBING — typically, a candidate either deducts interest from the free cash flow before discounting, or discounts at the cost of equity rather than WACC, or forgets to strip debt from the resulting firm value before comparing against an equity offer price. This matters because FCFF is a pre-financing flow belonging to all capital providers — debt and equity alike — so the matching discount rate must blend the required returns of both; applying only the cost of equity creates a rate mismatch whose direction and magnitude depend entirely on the numbers in the scenario, not a predictable overstatement or understatement. Once you have a firm value, debt must be stripped to isolate the equity claim, because the vendor's offer is for equity only; skipping that step means you are comparing an equity offer against a firm value — an apples-to-oranges test that the board cannot act on. If your WACC or FCFF figure is off, carry it forward consistently into the firm value and the equity strip — where your downstream method is correct, those marks still score and the error is charged once at its source, but only where you use your own figure correctly throughout. The ultimate boardroom failure here is stopping at a number: the board needs to know whether the offer is supportable and, critically, which assumptions — at the valuation date — are fragile enough to warrant stress-testing or due diligence before any final commitment.

### answer_schema (serialized)
```json
{
 "params": {
  "kd": 0.057999999999999996,
  "ke": 11.279999999999998,
  "wd": 0.3875,
  "we": 0.6125,
  "wacc": 8.527199999999999,
  "tax_rate": 0.28,
  "company_ve": 490,
  "debt_value": 310,
  "growth_rate": 0.025,
  "offer_price": 720
 },
 "components": [
  {
   "unit": "%",
   "label": "Cost of equity (CAPM)",
   "tolerance": {
    "kind": "absolute",
    "value": 0.05
   },
   "component_id": "ke",
   "working_steps": [
    "Ke = Rf + βe × MRP = 4.20% + 1.18 × 6.00% = 11.28%"
   ],
   "expected_value": 11.279999999999998
  },
  {
   "unit": "%",
   "label": "WACC (MV-weighted)",
   "recompute": "wacc_mv_weighted",
   "tolerance": {
    "kind": "absolute",
    "value": 0.05
   },
   "depends_on": [
    "ke"
   ],
   "component_id": "wacc",
   "working_steps": [
    "WACC = Ke×We + Kd(1−T)×Wd = Ke×0.613 + 5.80%×(1−0.28)×0.388"
   ],
   "expected_value": 8.527199999999999
  },
  {
   "unit": "AUDm",
   "label": "Free cash flow to firm (FCFF)",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "component_id": "fcff",
   "working_steps": [
    "FCFF = PBIT×(1−t) + dep − capex − ΔWC = 106.5"
   ],
   "expected_value": 106.47999999999999
  },
  {
   "unit": "AUDm",
   "label": "Enterprise (firm) value",
   "recompute": "firm_value_perpetuity_growth",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "fcff",
    "wacc"
   ],
   "component_id": "firm_value",
   "working_steps": [
    "Firm value = FCFF×(1+g)/(WACC−g)  [firm flow @ WACC]"
   ],
   "expected_value": 1810.8242633395275
  },
  {
   "unit": "AUDm",
   "label": "Equity value",
   "recompute": "equity_value_strip_debt",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "firm_value"
   ],
   "component_id": "equity_value",
   "working_steps": [
    "Equity = firm value − debt = 1810.8 − 310.0"
   ],
   "expected_value": 1500.8242633395275
  },
  {
   "unit": "AUDm",
   "label": "Equity value vs offer (signed)",
   "recompute": "equity_minus_offer",
   "tolerance": {
    "pct": 0.5,
    "kind": "relative"
   },
   "depends_on": [
    "equity_value"
   ],
   "component_id": "equity_vs_offer",
   "working_steps": [
    "Equity − offer = 1500.8 − 720.0"
   ],
   "expected_value": 780.8242633395275
  }
 ]
}
```

---
