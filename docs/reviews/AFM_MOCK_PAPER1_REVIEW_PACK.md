# AFM MOCK PAPER 1 — REVIEW PACK

**Status: candidate / unpublished / mock_only=true. DB snapshot, authored 2026-07-25 via `scripts/_author_mock_paper1.ts` through the LIVE calculators + narrative rubric engine. Awaiting Grant recompute → blind GPT.**

## Doctrine (carried)

- **Case-native authored content, code-owned marking per requirement** (ruled 2026-07-25). Every numeric `model_answer` + `answer_schema` is built by its calculator family (`capm`/`international`/`fxhedge`/`risk`/`irhedge`) — NO figure hand-typed; narrative requirements carry an authored `NarrativeRubric` graded by the constrained model layer. **Claim ceiling: "answer-locked, model-graded"** for the /100 technical band-marking — code owns the band→marks conversion, the model owns the band, judged against the code-correct model_answer. NOT "code owns the technical marks", NOT live exact-figure verification (deferred, platform-wide).
- **Gates run in-process before insert:** GATE1 (schema self-consistency) · GATE2 (every code-computed figure present in `model_answer` at 1/2/3/4 dp) · GATE3 (seeded distinct-factor OFR carry) · P4 jurisdiction/frozen-facts · P5 completeness · P6 loss-relief · P8 rating-symbols · P7 misconception-lead — per numeric requirement. **N1–N5** (rubric-coverage, scenario-anchor, generic-copy, Rule-23 golden BAD/GOOD, committed-verdict) on the **REAL constrained grader** + P7 — per narrative requirement. **C1–C4** case-structure gates across the assembled paper.
- **Exam structure (AFM Syllabus & Study Guide §7, verbatim):** Section A = one 50-mark case (40 technical + 10 PS, all four PS skills, spans ≥2 sections); Section B = two 25-mark scenario questions (20 + 5 PS each, never wholly narrative, ≥2 of {Analysis & Evaluation, Scepticism, Commercial Acumen} — Communication is Section-A-only). B and E represented across the paper. Paper = 80 technical + 20 PS = 100.

## ⛔ CLOSED RULINGS — do not re-raise

- **Mocks are case-native authored, not engine-generated** (the "generative mock engine" was a phantom spec; corrected in `AFM_COVERAGE_CONTRACT.md` + `PRODUCT_STRENGTH_STANDARD.md`, 2026-07-25).
- **Marking-kind is code-config in the authoring script, not a DB column.** `answer_schema` stores the calculator schema (numeric) or the rubric (narrative).
- **Technical marking is model-graded against the code-correct answer** — the standard is code-generated + gated (Piece 1); live student-figure parsing is Piece 2, deferred platform-wide. The zero-credit `nothing` band handles blank/wrong requirements.
- **The IR-futures basis (0.45 → unexpired 0.15) is sized to clear the seeded-OFR absolute rate tolerance** (±0.01) — a smaller residual basis verdicts "correct" under perturbation and fails GATE3; this is the known small-rate × absolute-tolerance interaction, not a figure error.

## ⛓ SECTION A INTEGRATED DEPENDENCY CHAIN (the load-bearing "real case" proof)

Section A is ONE company (Solenne Industries SA), ONE shared exhibit set, with a REAL cross-requirement chain — not four independent drills:

1. **A(i) CAPM (B3e)** ungears the Brazilian peer beta (1.35) → asset β **0.900** → regears to Solenne's 70:30 → equity β **1.189** → Ke **11.64%** → **project WACC 9.38%**.
2. **A(ii) NPV (B5b)** discounts the Rio Verde reais cash flows at **that exact 9.38%** (the CAPM output is fed straight into `discount_rate`) → **NPV +EUR 15.6m → ACCEPT**.
3. **A(iii) FX hedge (E2b)** hedges the **year-1 net remittance of BRL 179.5m** produced by A(ii) (the NPV's own `years[0].foreign_remit_net`) — forward vs money-market → the **forward** secures the higher guaranteed euro receipt.
4. **A(iv) Treasury (E1a, narrative)** advises on the group treasury for **this** expansion — the Brazilian exposure the appraisal + hedge concern.

The chain is verified in code: CAPM `c.wacc` is the literal argument to the NPV `discount_rate`; the NPV `years[0].foreign_remit_net` is the literal argument to the FX `exposure`. Change one input and all three move together.


---

# SECTION A — Solenne Industries SA (50 marks: 40 technical + 10 PS)

**id** `aa000000-0000-4000-8000-00000000a001` · section A · anchor_area (spans) · response_format "report" · status candidate · published false · mock_only true

### Scenario

It is now 1 September 20X5. You are a financial adviser engaged by Solenne Industries SA ("Solenne"), a France-based specialty-chemicals group that reports in euros (EUR). Write a report to the board of Solenne responding to its instructions in the requirements below, using the information in the exhibits provided. Professional marks will be awarded for the demonstration of skill in communication, analysis and evaluation, scepticism and commercial acumen in your answer.

### Exhibits

**Company background**

Solenne Industries SA (Solenne) manufactures specialty chemicals from four European subsidiaries and is evaluating its first venture in South America: a bioethanol plant, "Rio Verde", in Brazil. Solenne reports in euros; the Brazilian operation would transact and be taxed in Brazilian reais (BRL). The board wants a euro appraisal of Rio Verde, a view on how to manage the currency and treasury consequences, and a recommendation.

**Exhibit 1 — Rio Verde project data (in BRL)**

The Rio Verde plant requires an upfront capital outlay of BRL 480 million, paid at the start of the project, and would operate for four years. In a normal year it is expected to generate profit before interest and tax (PBIT) of BRL 320 million, with depreciation of BRL 80 million, capital reinvestment of BRL 60 million and an increase in working capital of BRL 20 million. Real cash flows are expected to grow by 3% a year. The Brazilian corporate tax rate is 34%. Dividends remitted to France suffer Brazilian withholding tax of 15%; under the France–Brazil treaty this withholding tax is creditable against French tax. The French corporate tax rate is 25%. The current spot exchange rate is BRL 5.60 per EUR 1. Brazilian inflation is expected to run at 4.5% and eurozone inflation at 2.0% over the horizon.

**Exhibit 2 — Cost of capital data**

Solenne intends to appraise Rio Verde at a project-specific discount rate. A listed Brazilian bioethanol producer of comparable business risk has an equity beta of 1.35 and a capital structure of 60% equity and 40% debt by market value. Solenne's own capital structure is 70% equity and 30% debt by market value. The risk-free rate is 4.5%, the market risk premium is 6.0%, and Solenne's pre-tax cost of debt is 5.5%. Debt is assumed to carry a beta of zero.

**Exhibit 3 — Managing the first remittance**

Rio Verde's first net remittance to France, expected to be BRL 179.5 million, is due in three months. The treasury team must decide how to fix the euro value of that receipt. The current spot rate is BRL 5.60 per EUR 1 and the three-month forward rate is BRL 5.66 per EUR 1. Annual money-market rates are: BRL deposit 10.0% and BRL borrowing 12.0%; EUR deposit 2.0% and EUR borrowing 3.5%. The board has asked which hedge secures the better guaranteed euro receipt.

**Exhibit 4 — Treasury organisation**

Solenne has never operated a central treasury. Each of its four European subsidiaries runs its own treasury desk, negotiating its own bank facilities and managing its own cash and currency positions locally; the head office in Lyon coordinates nothing beyond consolidated reporting. The finance director argues that the new Brazilian exposure is the moment to establish a group treasury function at Lyon. A non-executive director is sceptical, warning that a central function "just adds a head-office layer that slows the subsidiaries down." The board wants an evaluation of the issues in establishing a group treasury and the likely impact on the existing subsidiary desks.

### Requirements


#### (i) B3e — 10 marks — calc (code-owned figures) — PS: analysis_and_evaluation

**Gate results:** GATE1/2/3 + P4–P8 ALL PASS

**Question:**

(i) Calculate the project-specific discount rate the board should use to appraise the Rio Verde project, and explain why this rate — rather than Solenne's own group cost of capital — is appropriate. (10 marks)

**answer_schema:** numeric AnswerSchema — 4 components: `asset_beta`=0.9, `regeared_beta`=1.1892857142857143, `ke_project`=11.635714285714286, `wacc_project`=9.3825

**model_answer:**

**Cost of capital — CAPM / weighted average cost of capital**

**Assumptions:** a peer's equity beta is **ungeared** to an asset beta and **regeared** to the appraising firm's capital structure using the **Modigliani–Miller with-tax** relationship β_a = β_e × Ve/(Ve+Vd(1−T)), with the debt beta taken as **0 (debt assumed risk-free)**; the WACC weights the cost of equity and the **post-tax** cost of debt (Kd×(1−T)) by **market values**; the cost of equity is priced by CAPM (Ke = Rf + β × market risk premium) with Rf = 4.50% and MRP = 6.00%; the corporate tax rate is 25.00%.


**Step 1 — Ungear the peer's equity beta (strip out the peer's financial risk)**

β_a = β_e × Ve/(Ve + Vd(1−T)) = 1.350 × 60/(60 + 40×(1−0.25)) = **0.900**

**Step 2 — Regear to YOUR capital structure**

β_e' = β_a × (Ve + Vd(1−T))/Ve = 0.900 × (70 + 30×(1−0.25))/70 = **1.189**

The regeared equity beta (**1.189**) is **lower** than the peer's equity beta (1.350) because your gearing is below the peer's — the asset (business) risk is the same, only the financial risk differs.

**Step 3 — Project cost of equity (CAPM)**

Ke = Rf + β_e' × MRP = 4.50% + 1.189 × 6.00% = **11.64%**

**Step 4 — Project-specific WACC (market-value weights)**

WACC = Ke × We + Kd(1−T) × Wd = 11.64% × 0.700 + 4.13% × 0.300 = **9.38%**

This project rate reflects the **business risk of the peer's activity**, not your firm's own line of business — using your own company WACC would misprice a project of different risk.

**Step 5 — Evaluation / advice to the board**

The board should discount the Rio Verde cash flows at this project-specific rate, which reflects the business risk of Brazilian bioethanol production; using Solenne's group cost of capital would misprice a venture whose business risk differs from the group's existing chemicals operations.

*Reconciliation: asset β 0.900 → regeared β 1.189 → Ke 11.64% → WACC 9.38% ✓*

**hint:**

Don't reach for Solenne's own group WACC — Rio Verde is a differently-risked business. Ungear the Brazilian peer's equity beta to strip out its financial risk, then regear to Solenne's own gearing before pricing the cost of equity and blending the WACC.

**full_reveal:**

The dominant misconception here is using the group's own cost of capital as the project hurdle: candidates apply Solenne's average WACC to Rio Verde, ignoring that the Brazilian bioethanol business carries different business risk.

The fix is the ungear-regear route: strip the peer's financial risk to an asset beta, regear to Solenne's 70:30 structure, price the cost of equity through CAPM, then blend the project WACC. That project-specific rate — not the group average — is the correct hurdle.


#### (ii) B5b — 16 marks — calc (code-owned figures) — PS: communication,analysis_and_evaluation

**Gate results:** GATE1/2/3 + P4–P8 ALL PASS

**Question:**

(ii) Using the project-specific discount rate from requirement (i), calculate the net present value of the Rio Verde project in euros and advise the board whether, on financial grounds, the project should proceed. (16 marks)

**answer_schema:** numeric AnswerSchema — 9 components: `fx_1`=5.7372549019607835, `fx_2`=5.877873894655901, `fx_3`=6.021939431289623, `fx_4`=6.169535985978094, `home_cf_1`=31.290225563909775, `home_cf_2`=31.457905241572835, `home_cf_3`=31.626483489757344, `home_cf_4`=31.795965123769445, `npv`=15.562378658751907

**model_answer:**

**International investment appraisal — net present value to the parent**

**Assumptions:** project cash flows arise in BRL; the maintainable base-year foreign free cash flow is BRL 211.2m growing at 3.00% a year on a taxable profit (PBIT) base of BRL 320.0m; forecast spot rates are derived by PPP parity from the stated base spot 5.6000 BRL/EUR; converted cash flows are discounted at the parent's 9.38% money cost of capital. The foreign corporate tax rate 34.00% is **at or above** the parent's 25.00% home rate, so the credit for foreign corporate tax already covers the whole home liability and there is **no additional home tax** (max(0, 25.00% − 34.00%) = 0). The 15.00% withholding on remittances is therefore a **net cost** — with no residual home liability, the treaty's creditability gives it no relief.

**Step 1 — Forecast exchange rates (parity, never assumed)**

| Year | Forecast spot (BRL/EUR) |
|------|------|
| 1 | 5.7373 |
| 2 | 5.8779 |
| 3 | 6.0219 |
| 4 | 6.1695 |

*Forecast spots derived by purchasing-power parity (relative inflation): Sₜ = S₀ × ((1 + r_foreign)/(1 + r_home))ᵗ.*

**Step 2 — Foreign cash flows, tax, remittance, and conversion**

| Year | Foreign FCFF | Withholding | Additional home tax | Net remitted (BRL) | Spot | Home cash flow |
|------|------|------|------|------|------|------|
| 1 | BRL 211.2m | BRL 31.7m | BRL 0.0m | BRL 179.5m | 5.7373 | EUR 31.3m |
| 2 | BRL 217.5m | BRL 32.6m | BRL 0.0m | BRL 184.9m | 5.8779 | EUR 31.5m |
| 3 | BRL 224.1m | BRL 33.6m | BRL 0.0m | BRL 190.5m | 6.0219 | EUR 31.6m |
| 4 | BRL 230.8m | BRL 34.6m | BRL 0.0m | BRL 196.2m | 6.1695 | EUR 31.8m |

*(Additional home tax is **nil** every year: the foreign corporate rate 34.00% is at or above the parent's 25.00% home rate, so the foreign-tax credit already covers the whole home liability. Net remitted = foreign FCFF − withholding; converted at the forecast spot.)*

**Step 3 — Present values and NPV**

| Year | Home cash flow | DF @ 9.38% | Present value |
|------|------|------|------|
| 0 | EUR -85.7m | 1.000 | EUR -85.7m | *(foreign outlay BRL 480.0m ÷ 5.6000)*
| 1 | EUR 31.3m | 0.914 | EUR 28.6m |
| 2 | EUR 31.5m | 0.836 | EUR 26.3m |
| 3 | EUR 31.6m | 0.764 | EUR 24.2m |
| 4 | EUR 31.8m | 0.699 | EUR 22.2m |

**NPV to the parent = EUR 15.6m.**

**Step 4 — Decision**

The NPV of EUR 15.6m is **positive**, so on these exchange-rate and fiscal assumptions the project **adds value to the parent and should be accepted**.

**Step 5 — Advice to the board**

On the project-specific discount rate of 9.38%, the appraisal returns a positive net present value, so on financial grounds Rio Verde should proceed; the board should nonetheless stress-test the assumed BRL depreciation path and the remittance timing, since both materially affect the euro value.

*Reconciliation: Σ present values EUR 101.3m − home outlay EUR 85.7m = NPV EUR 15.6m ✓*

**hint:**

Work in reais first, then convert. Build the project's free cash flow, apply Brazilian tax and the additional French tax after crediting the withholding, translate each year at the forward rate implied by the inflation differential, and discount at the project rate from (i) — don't discount reais at a euro rate.

**full_reveal:**

The classic misconception here is discounting foreign-currency cash flows at the home-currency rate: candidates leave the reais cash flows undiscounted-for-currency, or convert at today's spot for every year, mismatching the cash flows and the discount rate.

The fix is consistency: translate each year's remittance at the PPP-implied forward rate so the euro cash flows and the euro discount rate are on the same basis, credit the Brazilian withholding against the French charge, and only then discount. The resulting NPV is positive, so proceed on financial grounds.


#### (iii) E2b — 8 marks — calc (code-owned figures) — PS: scepticism

**Gate results:** GATE1/2/3 + P4–P8 ALL PASS

**Question:**

(iii) Evaluate whether a forward contract or a money-market hedge secures the better guaranteed euro value for the first BRL 179.5 million remittance, and recommend which Solenne should use. (8 marks)

**answer_schema:** numeric AnswerSchema — 4 components: `forward_home`=31.713780918727913, `mmh_foreign_now`=174.27184466019418, `mmh_home_now`=31.119972260748963, `mmh_home_settlement`=31.275572122052704

**model_answer:**

**FX hedging — forward vs money-market hedge**

**Assumptions:** a BRL 179.5 receipt is due in 3 months, quoted BRL per 1 EUR. The forward rate for the period is stated at 5.6600. The money-market hedge would borrow the foreign currency now and deposit the home proceeds, using today's spot of 5.6000.

**Step 1 — Forward hedge**

BRL 179.5 converted at the forward rate 5.6600 = **EUR 31.7m**, guaranteed.

**Step 2 — Money-market hedge**

Borrow the foreign currency now and deposit the home proceeds: BRL 174.3m today, converted at spot to EUR 31.1m, then grown to **EUR 31.3m** by the settlement date.

**Step 3 — All-methods comparison and recommendation**

| Method | Guaranteed EUR outcome |
|------|------|
| Forward | EUR 31.7m |
| Money-market hedge | EUR 31.3m |

The forward gives the higher outcome, by **EUR 0.4m**, and is **recommended**.

**Step 4 — Advice to the board**

Solenne should hedge the first remittance with the money-market hedge, which secures the higher guaranteed euro receipt; the margin over the alternative is modest, so the treasury should also weigh operational simplicity and any balance-sheet effect before dealing.

*Reconciliation: forward EUR 31.7m vs MMH EUR 31.3m; margin EUR 0.4m to the forward ✓*

**hint:**

Price both hedges to a guaranteed euro figure and compare like with like. For the money-market hedge on a receipt, borrow reais now against the future receipt, convert at spot, and deposit euros — then set the two guaranteed euro amounts side by side and pick the higher.

**full_reveal:**

The common misconception here is judging the hedge on the headline forward rate rather than the guaranteed euro outcome: candidates compare the forward rate to spot instead of computing the euro amount each hedge actually locks.

The fix is to convert both routes to a guaranteed euro receipt and compare those figures directly; the forward secures the higher euro amount here, so it is preferred, though the margin is modest.


#### (iv) E1a — 6 marks — narrative (rubric-graded) — PS: commercial_acumen

**Gate results:** N1–N5 + P7 ALL PASS (real grader)

**Question:**

(iv) Evaluate the issues Solenne should consider in establishing a group treasury function at Lyon, and assess the likely impact on the existing subsidiary treasury desks. (6 marks)

**answer_schema:** narrative rubric — 3 criteria, 5 scenario_facts, total 6 marks, designed BAD flags ["F1","F5","F4"]

**model_answer:**

Establishing a group treasury at Lyon is worth doing, but only if it is designed to add control without smothering the subsidiaries.

The case for it is strongest precisely because of the Brazilian exposure. A central treasury pools scarce expertise and scale: it can raise group funding more cheaply than four desks bidding separately, net intra-group balances rather than each subsidiary hedging in isolation, and impose one consistent FX and risk policy. Solenne has never operated a central treasury, so the local desks have built no capability in real management — and none of the four European subsidiaries has ever handled a Brazilian exposure. Concentrating that judgement in one place is the point.

But the cost and disruption are real and should not be waved away. A treasury at Lyon needs systems, dealing lines and skilled staff, and it strips the four European subsidiaries of decisions they currently make locally. The non-executive director's warning that it "slows the subsidiaries down" has genuine substance: a badly-configured central function that insists on approving every local payment would indeed add a head-office layer without adding value.

For the subsidiary desks the concrete impact is a loss of autonomy over their own bank facilities and their local cash and currency positions. The right answer is not all-or-nothing. Lyon should own group funding, intra-group netting and the FX and risk policy — including the new Brazilian remittances — while the subsidiaries keep operational local cash management within that policy. On balance, on that hybrid basis the board should establish the group treasury: it captures the control and scale benefits the Brazilian venture needs, while leaving the subsidiaries responsive to their own markets.

**hint:**

Don't write a generic essay on the pros and cons of centralisation — anchor every point to Solenne: the four separate subsidiary desks, the absent central function, and above all the new Brazilian exposure none of them has handled. Then take the non-executive director's objection seriously and commit to a recommendation.

**full_reveal:**

The dominant misconception here is substituting a generic "centralisation is good" essay for an analysis of THIS group: candidates recite textbook treasury advantages and disadvantages without ever engaging with Solenne's four separate desks, the absent central function, or the specific new Brazilian exposure that prompts the question.

Establishing a group treasury at Lyon is worth doing, but only if it is designed to add control without smothering the subsidiaries.

The case for it is strongest precisely because of the Brazilian exposure. A central treasury pools scarce expertise and scale: it can raise group funding more cheaply than four desks bidding separately, net intra-group balances rather than each subsidiary hedging in isolation, and impose one consistent FX and risk policy. Solenne has never operated a central treasury, so the local desks have built no capability in real management — and none of the four European subsidiaries has ever handled a Brazilian exposure. Concentrating that judgement in one place is the point.

But the cost and disruption are real and should not be waved away. A treasury at Lyon needs systems, dealing lines and skilled staff, and it strips the four European subsidiaries of decisions they currently make locally. The non-executive director's warning that it "slows the subsidiaries down" has genuine substance: a badly-configured central function that insists on approving every local payment would indeed add a head-office layer without adding value.

For the subsidiary desks the concrete impact is a loss of autonomy over their own bank facilities and their local cash and currency positions. The right answer is not all-or-nothing. Lyon should own group funding, intra-group netting and the FX and risk policy — including the new Brazilian remittances — while the subsidiaries keep operational local cash management within that policy. On balance, on that hybrid basis the board should establish the group treasury: it captures the control and scale benefits the Brazilian venture needs, while leaving the subsidiaries responsive to their own markets.


---

# SECTION B — Brecon Renewables plc (25 marks: 20 technical + 5 PS)

**id** `aa000000-0000-4000-8000-00000000b101` · section B · anchor_area B1 · response_format "briefing note" · status candidate · published false · mock_only true

### Scenario

It is now 1 September 20X5. You are a financial adviser to Brecon Renewables plc ("Brecon"), a UK renewable-energy developer reporting in pounds sterling (GBP). Write a briefing note to the board responding to the requirements below, using the information in the exhibits. Professional marks will be awarded for the demonstration of skill in analysis and evaluation and scepticism in your answer.

### Exhibits

**Company background**

Brecon Renewables plc (Brecon) develops offshore wind farms in UK waters and is appraising the "Firth Array" project, which requires an upfront capital commitment of GBP 500 million and would run for four years before a planned refinancing. Electricity prices, turbine availability and construction costs are all uncertain, so the board has asked for both a scenario appraisal and an interpretation of a simulation the advisers have run.

**Exhibit 1 — Scenario analysis**

Brecon's advisers built three demand scenarios for Firth Array, each with its own four-year net cash-flow profile (GBP million), discounted at the project cost of capital of 10%. Strong demand (probability 0.30): 210, 230, 250, 270. Base case (probability 0.50): 150, 160, 170, 180. Weak demand (probability 0.20): 85, 90, 95, 100. The upfront outlay of GBP 500 million is common to all three scenarios.

**Exhibit 2 — Monte Carlo simulation output**

Separately, the advisers ran a Monte Carlo simulation of the same Firth Array project with 10,000 iterations, allowing electricity price, turbine availability and construction cost to vary continuously. The simulation produced a mean (expected) NPV of GBP 44 million, a standard deviation of NPV of GBP 60 million, a probability of a negative NPV of 22%, and a project Value-at-Risk of GBP 52 million at the 95% confidence level. The board must decide whether Firth Array's risk profile is acceptable before committing the GBP 500 million.

### Requirements


#### (i) B1a — 12 marks — calc (code-owned figures) — PS: analysis_and_evaluation

**Gate results:** GATE1/2/3 + P4–P8 ALL PASS

**Question:**

(i) Calculate the expected net present value (ENPV) of the Firth Array project and the probability of a negative NPV from the scenario analysis, and advise the board what they indicate about the project. (12 marks)

**answer_schema:** numeric AnswerSchema — 4 components: `npv_1`=253.23406871115344, `npv_2`=19.26097944129492, `npv_3`=-208.67085581585968, `enpv`=43.866539170821554

**model_answer:**

**Risk & uncertainty — expected net present value (ENPV)**

**Assumptions:** each economic state's cash flows are STATED; every scenario NPV is computed from its own stream discounted at 10.00% (outlay GBP 500.0m at t0); probabilities are exhaustive and sum to 1. ENPV is the probability-weighted mean NPV — a **repeated-game** figure. Because this project is undertaken **once**, the individual state NPVs and the probability of a negative NPV carry the decision alongside the mean.

**Step 1 — Scenario NPVs (each from its own stated cash flows)**

| Scenario | Probability | NPV |
|------|------|------|
| Strong demand | 0.30 | GBP 253.2m |
| Base case | 0.50 | GBP 19.3m |
| Weak demand | 0.20 | GBP -208.7m |

**Step 2 — Expected NPV**

ENPV = Σ(pᵢ × NPVᵢ) = **GBP 43.9m**. Probability of a negative NPV = **20%**.

**Step 3 — Decision**

On the expected-value criterion the ENPV of GBP 43.9m is **positive**, so the project is **acceptable on EV terms** — subject to the one-shot caveat below.

**Step 4 — Advice to the board**

The expected NPV is positive, but the 20% chance of a negative outcome means the board should not treat Firth Array as a safe bet; it should proceed only with measures that cut the weak-demand downside, or with a balance sheet able to absorb it.

*Reconciliation: Σ(p×NPV) = GBP 43.9m; P(NPV<0) = 20% ✓*

**hint:**

Compute each scenario's NPV first, then probability-weight them for the ENPV — and separately add up the probability of the scenarios whose NPV is negative. A positive ENPV alone doesn't tell the board how often the project loses money.

**full_reveal:**

The frequent misconception here is treating a positive expected NPV as a safe decision: candidates report the ENPV and stop, ignoring how much probability sits on value-destroying outcomes.

The fix is to report both the ENPV and the probability of a negative NPV, and to read them together — a positive average with a material downside probability calls for mitigation, not automatic approval.


#### (ii) B1b — 8 marks — narrative (rubric-graded) — PS: scepticism

**Gate results:** N1–N5 + P7 ALL PASS (real grader)

**Question:**

(ii) Interpret the Monte Carlo simulation output for Firth Array.

(a) Explain what the results indicate about the likelihood of success and the overall risk profile of the project.
(b) Explain what the Value-at-Risk figure means in this context and how the board should use it when deciding whether to commit the capital. (8 marks)

**answer_schema:** narrative rubric — 4 criteria, 7 scenario_facts, total 8 marks, designed BAD flags ["F1","F5","F4"]

**model_answer:**

The simulation gives the board a distribution, not a verdict, and it should be read as one.

On the central outcome, the expected NPV of GBP 44 million is positive, so the typical result of the simulation creates value and there is a prima facie case to build Firth Array. That reading cannot stand alone, though: a 22% probability of a negative NPV means more than one simulated run in five ends in value destruction, which is a materially high failure rate for a project of this scale.

The risk profile is dominated by dispersion. The standard deviation of GBP 60 million is actually larger than the mean of GBP 44 million — a coefficient of variation above one — so the range of possible outcomes is very wide and the project is highly uncertain. Reporting the positive mean without that context would badly mislead the board.

The Value-at-Risk figure sharpens the downside. A project VaR of GBP 52 million at the 95% confidence level means there is only a 5% chance of an NPV outcome more than GBP 52 million below the expected level; it measures the tail, and is explicitly not the worst case that could ever occur. Set against the GBP 500 million Brecon must commit, the board should treat that GBP 52 million as the tail loss the balance sheet has to be able to absorb.

On balance, Brecon should approve Firth Array only if it can withstand that tail loss without distress, or should first require mitigations — phased construction, or contracted revenue floors — that pull the 22% probability of a negative NPV down to a level the board is willing to accept. A positive mean is a reason to consider the project, not a reason to commit GBP 500 million to it unconditionally.

**hint:**

Reporting the statistics correctly is only half the job — the board needs to know what they mean for the GBP 500 million decision. Translate the probability of a negative NPV and the VaR into an explicit recommendation on whether to commit, and on what conditions.

**full_reveal:**

The classic misconception here is fence-sitting: candidates report the mean NPV, the standard deviation and the VaR figure accurately, then stop — leaving the board a table of numbers but no steer on the GBP 500 million decision. Reporting is not interpretation.

The simulation gives the board a distribution, not a verdict, and it should be read as one.

On the central outcome, the expected NPV of GBP 44 million is positive, so the typical result of the simulation creates value and there is a prima facie case to build Firth Array. That reading cannot stand alone, though: a 22% probability of a negative NPV means more than one simulated run in five ends in value destruction, which is a materially high failure rate for a project of this scale.

The risk profile is dominated by dispersion. The standard deviation of GBP 60 million is actually larger than the mean of GBP 44 million — a coefficient of variation above one — so the range of possible outcomes is very wide and the project is highly uncertain. Reporting the positive mean without that context would badly mislead the board.

The Value-at-Risk figure sharpens the downside. A project VaR of GBP 52 million at the 95% confidence level means there is only a 5% chance of an NPV outcome more than GBP 52 million below the expected level; it measures the tail, and is explicitly not the worst case that could ever occur. Set against the GBP 500 million Brecon must commit, the board should treat that GBP 52 million as the tail loss the balance sheet has to be able to absorb.

On balance, Brecon should approve Firth Array only if it can withstand that tail loss without distress, or should first require mitigations — phased construction, or contracted revenue floors — that pull the 22% probability of a negative NPV down to a level the board is willing to accept. A positive mean is a reason to consider the project, not a reason to commit GBP 500 million to it unconditionally.


---

# SECTION B — Aldebrino SpA (25 marks: 20 technical + 5 PS)

**id** `aa000000-0000-4000-8000-00000000b201` · section B · anchor_area E3 · response_format "report" · status candidate · published false · mock_only true

### Scenario

It is now 1 September 20X5. You are a financial adviser to Aldebrino SpA ("Aldebrino"), an Italy-based industrial exporter reporting in euros (EUR). Write a report to the board responding to the requirements below, using the information in the exhibits. Professional marks will be awarded for the demonstration of skill in analysis and evaluation, scepticism and commercial acumen in your answer.

### Exhibits

**Company background**

Aldebrino SpA (Aldebrino) manufactures in Italy, borrows at floating rates, and sells extensively to customers in the United States and the United Kingdom. It also owns a US sales subsidiary whose results are consolidated into Aldebrino's euro accounts. The board wants both its interest-rate exposure on a forthcoming loan and its foreign-exchange exposures addressed.

**Exhibit 1 — Interest-rate hedge on the new borrowing**

Aldebrino will draw a EUR 48 million loan in six months' time, for a six-month period, at the prevailing base rate plus a company margin of 0.5%. The current base rate is 4.0%. To hedge, the treasury will use three-month euro interest-rate futures, contract size EUR 1,000,000, currently priced at 95.55; the futures expire in nine months. The board wants the effective borrowing cost locked in, tested against a rate that rises to 5.0% and a rate that falls to 3.2%.

**Exhibit 2 — Foreign-exchange exposures**

Aldebrino invoices its US customers in US dollars and its UK customers in pounds sterling, and settles those receivables 60–90 days after sale — a transaction exposure. Its US subsidiary's dollar-denominated net assets are retranslated into euros at each year-end for the consolidated balance sheet — a translation exposure. Separately, a sustained strengthening of the euro against the dollar would make Aldebrino's euro-cost products less competitive against US-based rivals over the longer term, independent of any single invoice — an economic exposure. The board has asked the adviser to identify and distinguish these exposures and assess how each can be managed.

### Requirements


#### (i) E3a — 12 marks — calc (code-owned figures) — PS: analysis_and_evaluation

**Gate results:** GATE1/2/3 + P4–P8 ALL PASS

**Question:**

(i) Using the interest-rate futures described in Exhibit 1, calculate the effective borrowing cost Aldebrino locks in on the EUR 48 million loan, showing that the same rate results whether the base rate rises to 5.0% or falls to 3.2%, and advise the treasury. (12 marks)

**answer_schema:** numeric AnswerSchema — 7 components: `contracts`=96, `unexpired_basis`=0.15000000000000094, `closing_price`=94.85, `mm_interest`=1320000, `futures_profit`=168000.0000000007, `net_outcome`=1151999.9999999993, `effective_rate`=4.799999999999997

**model_answer:**

**Interest-rate hedging — futures**

**Assumptions:** a EUR 48,000,000 loan runs for 6 months from a start date 6 months away; 3-month futures of size 1,000,000 expire in 9 months, base rate today 4.00%, futures price 95.55. A borrower must **SELL** the futures.

**Step 1 — Number of contracts (amount AND period)**

48,000,000 ÷ 1,000,000 × 6/3 = **96 contracts** (96.0, sell).

**Step 2 — Basis and the expected closing price**

Basis₀ = (100 − 4.00) − 95.55 = 0.45. With 3 months remaining of the contract's 9-month life, the unexpired basis = basis₀ 0.4500 × 3/9 months remaining = 0.1500. Expected closing futures price = 100 − expected rate − unexpired basis. Basis is assumed to fall to zero at a constant (linear) rate by expiry — a simplifying assumption that may not hold in practice, so the outcome is exposed to basis risk.

**Step 3 — Outcome under each scenario**

| Scenario | Actual rate | MM interest | Closing price | Futures P/(L) | Net | Effective |
|---|---|---|---|---|---|---|
| Rates rise (base 5.00%) | 5.50% | EUR 1,320,000.0 | 94.85 | EUR 168,000.0 | EUR 1,152,000.0 | 4.80% |
| Rates fall (base 3.20%) | 3.70% | EUR 888,000.0 | 96.65 | EUR -264,000.0 | EUR 1,152,000.0 | 4.80% |

The hedge **locks an effective annual cost of 4.80%** — the same under every scenario.

**Step 4 — Advice to the board**

The futures hedge locks Aldebrino's effective borrowing cost close to 4.80% across both the rising- and falling-rate scenarios; the small residual basis risk remains, and the treasury should confirm the contract count matches the six-month exposure before dealing.

*Reconciliation: 96 contracts; effective rate 4.80% reconciles across all 2 scenario(s) ✓*

**hint:**

Get the number of contracts right first: scale the notional by the ratio of the loan period to the contract period, or you will under-hedge. As a borrower, sell the futures; then reconcile the locked effective rate across both the rise and fall scenarios.

**full_reveal:**

The signature misconception here is the contract count: candidates divide the notional by the contract size but forget to scale by the six-month loan over the three-month contract, and so hedge only half the exposure.

The fix is contracts = (notional ÷ contract size) × (loan months ÷ contract months); as a borrower Aldebrino sells the futures, and the futures gain or loss offsets the cash-market move so the same effective rate is locked whether rates rise or fall.


#### (ii) E2a — 8 marks — narrative (rubric-graded) — PS: scepticism,commercial_acumen

**Gate results:** N1–N5 + P7 ALL PASS (real grader)

**Question:**

(ii) Identify and distinguish the foreign-exchange exposures Aldebrino faces, and assess how each type can be managed. (8 marks)

**answer_schema:** narrative rubric — 4 criteria, 5 scenario_facts, total 8 marks, designed BAD flags ["F1","F5","F4"]

**model_answer:**

Aldebrino faces three distinct kinds of currency risk, and separating them matters because each is managed differently.

The first is transaction exposure. Aldebrino sells to US and UK customers and collects those receivables 60 to 90 days after the sale, so between invoice and settlement the euro value of a known, contracted cash flow can move. This is a genuine cash-flow risk: if the dollar weakens before the customer pays, the euros actually received fall.

The second is translation exposure. Aldebrino's US subsidiary holds dollar net assets that are retranslated into euros at each year-end for the consolidated accounts. A weaker dollar reduces their reported euro value, which moves the consolidated balance sheet and gearing — but it does not, in itself, move any cash. That accounting-versus-cash distinction is exactly what separates it from transaction exposure.

The third is economic exposure. If the euro strengthens on a sustained basis, Aldebrino's euro-cost products become dearer relative to US-based competitors regardless of any single invoice, eroding future, uncontracted sales. It is the broadest of the three and the hardest to quantify because it bites on cash flows that have not yet arisen.

Management should follow the type. The transaction exposure is the one to hedge financially and first — forward contracts, money-market hedges or currency options fix the euro value of the receivables. Translation exposure is usually better matched than hedged: financing the US subsidiary with dollar borrowings offsets its dollar assets, so a derivative overlay is rarely worth the cost. Economic exposure cannot be hedged with a forward at all; it calls for operational answers — diversifying markets, sourcing some costs in dollars, or pricing flexibility. On balance, the board should hedge the transaction exposure as the priority, manage translation by matching, and treat the economic exposure as a strategic rather than a treasury problem.

**hint:**

Naming the three exposures earns little — the marks are in distinguishing them (which is a cash-flow risk, which is only accounting) and matching each to the right tool. Say clearly which one Aldebrino should hedge first, and which cannot be hedged with a forward at all.

**full_reveal:**

The signature misconception here is naming the exposures without describing them: candidates list transaction, translation and economic exposure as three labels, then explain "transaction exposure arises from transactions," never distinguishing a cash-flow risk from an accounting one or matching each to the right management tool.

Aldebrino faces three distinct kinds of currency risk, and separating them matters because each is managed differently.

The first is transaction exposure. Aldebrino sells to US and UK customers and collects those receivables 60 to 90 days after the sale, so between invoice and settlement the euro value of a known, contracted cash flow can move. This is a genuine cash-flow risk: if the dollar weakens before the customer pays, the euros actually received fall.

The second is translation exposure. Aldebrino's US subsidiary holds dollar net assets that are retranslated into euros at each year-end for the consolidated accounts. A weaker dollar reduces their reported euro value, which moves the consolidated balance sheet and gearing — but it does not, in itself, move any cash. That accounting-versus-cash distinction is exactly what separates it from transaction exposure.

The third is economic exposure. If the euro strengthens on a sustained basis, Aldebrino's euro-cost products become dearer relative to US-based competitors regardless of any single invoice, eroding future, uncontracted sales. It is the broadest of the three and the hardest to quantify because it bites on cash flows that have not yet arisen.

Management should follow the type. The transaction exposure is the one to hedge financially and first — forward contracts, money-market hedges or currency options fix the euro value of the receivables. Translation exposure is usually better matched than hedged: financing the US subsidiary with dollar borrowings offsets its dollar assets, so a derivative overlay is rarely worth the cost. Economic exposure cannot be hedged with a forward at all; it calls for operational answers — diversifying markets, sourcing some costs in dollars, or pricing flexibility. On balance, the board should hedge the transaction exposure as the priority, manage translation by matching, and treat the economic exposure as a strategic rather than a treasury problem.


---

## Case-structure gates (C1–C4) — ALL PASS

- **C1 Section-A span:** requirement lo_codes {B3e, B5b, E2b, E1a} touch sections **B + E** (≥2). ✓
- **C2 not-wholly-narrative:** each Section B case has ≥1 calc requirement (B1: B1a; B2: E3a). ✓
- **C3 B+E represented:** B present (B3e/B5b/B1a), E present (E2b/E1a/E3a/E2a) across the paper. ✓
- **C4 PS-skill-set:** Section A examines all four PS skills; each Section B case draws ≥2 of {A&E, scepticism, commercial acumen}, none tags communication. ✓

## Marks arithmetic

| Case | Technical | PS | Total |
|---|---|---|---|
| Section A — Solenne | 10+16+8+6 = 40 | 10 | 50 |
| Section B1 — Brecon | 12+8 = 20 | 5 | 25 |
| Section B2 — Aldebrino | 12+8 = 20 | 5 | 25 |
| **Paper** | **80** | **20** | **100** |

## Next

Grant independent recompute (each numeric requirement's figures) → blind GPT adversarial review (CLOSED RULINGS present) → adjudicate → wire an AFM `MockPaper` into `lib/acca/mocks.ts` (references these 3 case ids) → flip candidate→approved/published by explicit id → student sit-walk.
