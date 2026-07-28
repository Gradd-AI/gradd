# AFM MOCK PAPER 1 — REVIEW PACK

**Status: candidate / unpublished / mock_only=true. DB snapshot regenerated from the LIVE `acca_case_*` rows on 2026-07-28 (bodies below are the rows verbatim, not a transcription). Authored via `scripts/_author_mock_paper1.ts` through the live calculators + narrative rubric engine. FOR BLIND GPT DELTA-CONFIRM.**

**WARNING — CHANGED 2026-07-28, wording-only, ZERO figures moved.** (1) b101 Exhibit 2 now discloses the VaR reference point (expressed as a loss against a zero NPV, not as a shortfall below the mean NPV) — the blind-candidate sit proved the paper did not state it and the candidate had to guess. (2) The irhedge FR1 register ruling applied to fxhedge content: 11 guaranteed hits became locked in across a001 Exhibit 3 and A(iii) — 7 stored literals plus 4 code-owned in lib/acca/fxhedge.ts, landed by rebuilding A(iii) through its calculator. Post-verified under the amended P-DB4 (key-order-insensitive, baseline read pre-write): every expected_value byte-identical, params untouched, component counts unchanged. b101 (ii) revenue guarantees is an ordinary commercial noun and was deliberately NOT swept; published fxhedge K1 51163dac was NOT touched. Full gate suite + N1-N5 on the REAL grader re-run green across all three cases.

## ▶ READ FIRST — what a cold reviewer is being asked to confirm

This is a **delta-confirm** pass, not a first review. The figures in this paper were adjudicated across FR1 (prose-only), FR2 (tax-rate ambiguity — figures moved in A(i)/A(ii) only) and FR3 (display rounding — zero figure movement). Everything below is the current DB state. Four things carry a specific claim you should test rather than accept:

1. **HC1, the two-rate ungearing convention, is HOUSE-AUTHORED — not examiner-sourced.** It decides A(i) and therefore the whole Section-A chain. The caveat is stated in full in the FR2 section; the corpus was searched and found silent. **Do not treat it as ACCA doctrine, and do challenge it on the merits** — but challenge the convention, not its provenance, which is already conceded.
2. **The A(i) asset beta renders `0.938`, not `0.937`.** 81/86.4 is exactly 0.9375 in arithmetic; the nearest double is 0.9374999999999999, so a naive formatter prints 0.937 while every hand-working student gets 0.938. The stored `expected_value` is unchanged — this is display only. **`0.937` appearing anywhere in this pack would be a defect.**
3. **The claim ceiling is "answer-locked, model-graded".** Code owns the band→marks conversion; the MODEL owns the band, judged against the code-correct `model_answer`. It is **NOT** "code owns the technical marks", and it is **NOT** live exact-figure verification (that is Piece 2, deferred platform-wide). Any sentence in this pack implying otherwise is a defect.
4. **Exhibit 1's double-tax sentence is the APPROVED capped-relief wording**, and it is load-bearing: it passes P9-SCENARIO precisely because it states the MECHANISM (credited against, capped at that French charge) and stops short of asserting a RESOLVED outcome ("no further tax"). A resolved-outcome rewrite of the same sentence fails the gate loudly. Do not "tidy" it in that direction.

## Doctrine (carried)

- **Case-native authored content, code-owned marking per requirement** (ruled 2026-07-25). Every numeric `model_answer` + `answer_schema` is built by its calculator family (`capm`/`international`/`fxhedge`/`risk`/`irhedge`) — NO figure hand-typed; narrative requirements carry an authored `NarrativeRubric` graded by the constrained model layer. **Claim ceiling: "answer-locked, model-graded"** for the /100 technical band-marking — code owns the band→marks conversion, the model owns the band, judged against the code-correct model_answer. NOT "code owns the technical marks", NOT live exact-figure verification (deferred, platform-wide).
- **Gates run in-process before insert:** GATE1 (schema self-consistency) · GATE2 (every code-computed figure present in `model_answer` at 1/2/3/4 dp) · GATE3 (seeded distinct-factor OFR carry) · P4 jurisdiction/frozen-facts · P5 completeness · P6 loss-relief · P8 rating-symbols · P7 misconception-lead — per numeric requirement. **N1–N5** (rubric-coverage, scenario-anchor, generic-copy, Rule-23 golden BAD/GOOD, committed-verdict) on the **REAL constrained grader** + P7 — per narrative requirement. **C1–C4** case-structure gates across the assembled paper.
- **Exam structure (AFM Syllabus & Study Guide §7, verbatim):** Section A = one 50-mark case (40 technical + 10 PS, all four PS skills, spans ≥2 sections); Section B = two 25-mark scenario questions (20 + 5 PS each, never wholly narrative, ≥2 of {Analysis & Evaluation, Scepticism, Commercial Acumen} — Communication is Section-A-only). B and E represented across the paper. Paper = 80 technical + 20 PS = 100.

## ⛔ CLOSED RULINGS — do not re-raise

- **Mocks are case-native authored, not engine-generated** (the "generative mock engine" was a phantom spec; corrected in `AFM_COVERAGE_CONTRACT.md` + `PRODUCT_STRENGTH_STANDARD.md`, 2026-07-25).
- **Marking-kind is code-config in the authoring script, not a DB column.** `answer_schema` stores the calculator schema (numeric) or the rubric (narrative).
- **Technical marking is model-graded against the code-correct answer** — the standard is code-generated + gated (Piece 1); live student-figure parsing is Piece 2, deferred platform-wide. The zero-credit `nothing` band handles blank/wrong requirements.
- **The IR-futures basis (0.45 → unexpired 0.15) is sized to clear the seeded-OFR absolute rate tolerance** (±0.01) — a smaller residual basis verdicts "correct" under perturbation and fails GATE3; this is the known small-rate × absolute-tolerance interaction, not a figure error.

## ✅ FR1 (adjudicated blockers) — APPLIED 2026-07-25, ZERO figure movement

All five numeric requirements are **confirmed correct by two independent recomputes**; FR1 is prose-only. Proven: `answer_schema` (the canonical figure store) is **byte-identical** on all 5 requirements before/after — no computed figure moved.
- **FIX 1 (hard blocker) — A(iii) recommendation contradicted the comparison.** The Step-4 advice recommended the money-market hedge while the code selected the forward (a `=== 'forward'` ternary that never matched the actual `selected_method` label `"the forward"`). Rewritten to recommend the **forward contract** explicitly, stating the modest margin (EUR 0.4m on ~EUR 31.7m) and weighing operational simplicity, counterparty exposure and balance-sheet effect. Swept all fields; the only occurrence was Step 4 (the code-generated Step 3 already said "forward … recommended").
- **FIX 2 (blocker) — A(ii) tax-credit wording.** Hint + reveal + Exhibit 1 said the withholding was "credited against" the French charge. Because Brazil 34% > France 25%, there is **no** additional French tax; reworded to the three-branch rule (home > host → additional tax on the differential; home ≤ host → no additional tax, excess credit unusable; withholding a net cost regardless) and states plainly the 15% WHT is a **net remittance cost**. (The code-generated model_answer already carried the correct branch-a nil template.)
- **FIX 3 — A Exhibit 1:** "Real cash flows … grow by 3%" → "The BRL-denominated cash flows … grow by 3%".
- **FIX 4 — B1(ii) VaR:** "below the expected level" → the risk-family downside-loss-threshold register ("the one-tail downside … a 5% chance the downside loss will exceed GBP 52m … a threshold, not a ceiling on the maximum possible loss"), matched to the published risk drill `f28c2b4c`.
- **FIX 5 (polish) — A(iv):** "no capability in real management" → "no capability in group risk management".

## 🆕 NEW AUTHORING GATES (both compounding-class, fenced this session)

- **GATE 26 — recommendation-consistency** (`lib/acca/validate-afm-prose.ts` `lintRecommendationConsistency`; the calculator exposes the winner via `ComparisonComputed.selected_method` in `lib/acca/fxhedge.ts`). Where code computes a comparison verdict, the authored advice MUST name that method in a recommendation-position sentence (should/recommend/advise/opt for) and MUST NOT name a losing method in one. Wired into the mock authoring insert path (`scripts/_author_mock_paper1.ts`, per-requirement gate loop that runs immediately before insert, the same barrier as C1–C4) for any requirement carrying a `compare` payload. LOUD FAIL. Proven: on the original A(iii) advice it fires with 2 issues (losing-method-in-recommendation + selected-method-not-recommended).
- **GATE P9 — zero-additional-tax phrasing** (`lib/acca/validate-afm-prose.ts` `lintZeroAdditionalTaxPhrasing`, alongside P7). Fires only when the computed additional home tax == 0; fails on credit/offset/set-off-against language in the requirement's own prose (model_answer / hint / full_reveal — NOT the shared scenario). Self-contained regex, zero coupling to the tutor path. LOUD FAIL. Proven: on the original A(ii) "credit the Brazilian withholding against the French charge" it fires with 1 issue.

## ✅ FR2 (tax-rate ambiguity) — APPLIED 2026-07-25. FIGURES MOVED in A(i)/A(ii) only.

**RULING (Grant/co-founder, 25/07/2026) — ALT-B:** when a FOREIGN proxy's equity beta is ungeared, the `(1−T)` takes the **proxy's own (host) tax rate** — the debt tax shield being stripped is the proxy's; **regearing** to the investing company's structure takes the **investing company's (home) rate**, as does the post-tax cost of debt in its WACC.

**⚠ CAVEAT — HOUSE CONVENTION, NOT EXAMINER-SOURCED.** A full corpus search (AFM syllabus + all five registered AFM examiner reports D23/J24/SD24/MJ25/SD25 + the ACCA technical articles) found **NO source that disambiguates this**. Every worked ungear/regear ACCA publishes legislates ONE tax rate for all companies (P4 SD2016 Morada at 20%; AFM MJ2019 *"Both Honua Co and Talam Co pay corporation tax at an annual rate of 20%"*, which also hands over the finished 11%; CAPM-part-2's example at 25% throughout), and every cross-border AFM question (McKeever/Erat, Drimpton/Edricer, Washi/Airone, Penn/Zanadia) **gives** the discount rate and applies its two rates to cash flows only. The formula sheet prints `Vd(1 – T)` with `T` undefined. **Directional support only:** ACCA "The capital asset pricing model – part 2" gathers proxy *"gearings and tax rates"* (plural, per proxy) as an input to the ungearing step — a wording lean, not a worked determination. **Do not cite this as ACCA-sourced.** Recorded at `docs/GENERATOR_DOCTRINE.md` → Standing rulings → HOUSE CONVENTIONS → **HC1**.

**Engine:** `lib/acca/capm.ts` gains an optional `peer_tax_rate` (ungear uses it; regear keeps `tax_rate`). It **defaults to `tax_rate`**, so every single-jurisdiction caller is byte-identical — proven over **20,736 input combinations** across all four CAPM kinds (identical MD5 before/after), plus `test:capm`/`test:apv`/`test:risk` and all other calculator suites green.

**Old → new (A(i) B3e chain, and A(ii) which consumes its WACC):**

| Figure | Before (home 25% both steps) | After (ALT-B: peer 34% ungears) |
|---|---|---|
| Peer equity beta (given) | 1.350 | 1.350 |
| **Asset beta** (ungeared) | 0.900 | **0.9375** *(renders **0.938** at 3 dp — see FR3; the stored value is unchanged)* |
| **Regeared beta** | 1.189 | **1.239** |
| **Project Ke** | 11.64% | **11.93%** |
| **Project WACC** | 9.38% | **9.59%** |
| Kd(1−T) in the WACC | 4.13% | 4.13% *(unchanged — Solenne's OWN debt, at Solenne's own 25%)* |
| **A(ii) NPV** | +EUR 15.6m ACCEPT | **+EUR 15.1m ACCEPT** *(decision unchanged)* |
| A(iii) FX exposure | BRL 179.5m | BRL 179.5m *(unchanged — a year-1 PRE-discounting remittance)* |

**Scope of movement — proven at the figure level, not argued.** `answer_schema` diffed before/after for all 8 requirements: **A(i) B3e and A(ii) B5b CHANGED; A(iii) E2b, A(iv) E1a, B1(i) B1a, B1(ii) B1b, B2(i) E3a, B2(ii) E2a all BYTE-IDENTICAL.** A(iii) is insulated because its exposure is the NPV's year-1 net remittance, which is computed before discounting.

**Exhibit changes (stated as company/treaty FACT, never as an instruction):** Exhibit 2 now records that the Brazilian producer's own 34% is carried into the ungearing of its equity beta (the shield removed is the producer's), that Solenne's French 25% applies when regearing to its 70:30 structure and when weighting its post-tax cost of debt, and that Rio Verde's operating cash flows are taxed in Brazil at 34%. Exhibit 1's double-tax sentence now names the comparison itself — Brazilian corporate tax of 34% credited against the French corporate tax of 25% on remitted profits, with the 15% withholding deducted on remittance — which is what the new TAX_RATE_ASSIGNMENT gate requires for the remittance purpose. The A(i) model answer and reveal now SHOW each rate at its own step and carry one sentence saying why.

## 🆕 GATE TAX_RATE_ASSIGNMENT (FR2 — the durable fence for this class)

- **`lintTaxRateAssignment`** (`lib/acca/validate-afm-prose.ts`), wired into the durable barrier `runBaseRequirementGates` in **`lib/acca/case-authoring-gates.ts`** alongside GATE 26 and P9 — so it survives to mocks #2/#3 and to FM, not just this script.
- **Trigger:** ≥2 distinct **corporate** tax rates in the scenario/exhibits (withholding, inflation and risk-free percentages deliberately do not count). **Rule:** the scenario must explicitly assign a rate to every purpose the requirement puts in play — **ungearing the proxy beta · regearing to the investor's structure · constructing the discount rate · taxing operating cash flows · remittance/withholding**. Absent an assignment: LOUD FAIL naming the rates found and the unassigned purposes. Single-rate scenarios are a structural no-op. Checks the SCENARIO the candidate sees, never the worked answer — finding the assignment only in the solution is the failure being fenced.
- **Proven both ways:** with the FR2 sentences stripped it fails loudly naming 34% and 25% and the unassigned purposes; with them present it passes; a single-rate scenario is a no-op. Regression fixtures in `scripts/test-afm-prose.ts` (`npm run test:afm-prose`), including the "cost of debt is 5.5%" false-positive found while building it.

## ✅ FR3 (half-way rounding divergence) — APPLIED 2026-07-25. DISPLAY-ONLY; zero figure movement.

**The instance.** A(i)'s asset beta is 81/86.4, which in ARITHMETIC is exactly **0.9375**; the nearest IEEE-754 double is **0.9374999999999999** — genuinely below the tie — so `toFixed(3)` correctly returned **"0.937"** while every student who works it by hand gets **"0.938"**. Answer-locked marking must not be able to disagree with a correct student on the last digit.

**Tolerance carry-through (measured, not argued).** A student carrying 0.938 and re-rounding at EVERY step survives the whole chain with large headroom, so the verifier never mismarked them: asset β 0.938 (97.5% headroom) → regeared 1.24 (94.2%) → Ke 11.94% (93.0%) → WACC 9.60% (90.6%), all **CORRECT**. Two further facts bound the severity: `verifyNumericAnswer` is **not wired into any live route** (`grep` over `app/` returns nothing — mock marking is `case-marking.ts`, explicitly model-graded), and case marking judges quality-of-match against the model answer rather than parsing figures. So this was a **presentation/credibility** defect, not live mismarking.

**Ruling (Grant, 25/07/2026):** boundary-aware formatter APPROVED; re-picking the peer inputs and widening tolerance both REJECTED.

**Fix.** New `lib/acca/rounding.ts` — `fixedHalfUp(value, dp)` epsilon-snaps a value within 1e-9 of a half-way boundary TO the boundary, then rounds half-AWAY-FROM-ZERO. Note a plain half-up formatter does **not** fix this: the float really is below .5, so any correct rounder returns 0.937 — the snap is the necessary part. Every display formatter across the 12 calculator modules now routes through it. **DISPLAY ONLY** — no `expected_value`, tolerance or marking decision is touched. Proven: `answer_schema` diffed before/after across the re-author, **all 8 requirements BYTE-IDENTICAL** (A(i) included — only its rendered prose moved, 0.937 → 0.938). All 18 calculator/gate fixture suites green.

**FR3 sweep completed (2026-07-25).** The original conversion was case-by-case and MISSED `valuation.ts` and `irr.ts`, which is what shipped a published drill printing "11.67%" for an exact 11.675 tie. The invariant is now TOTAL rather than per-site judged — **every figure a student sees renders through `fixedHalfUp`**, across all 12 calculator modules; the only raw `toFixed` calls left in `lib/acca` are the DETECTORS (where the naive rendering is the thing being detected) and author-facing diagnostics (`throw` text, validator `reason:` strings). The audit is a one-line grep, documented in `lib/acca/rounding.ts`'s header. Behaviour-neutral by construction and proven so — all 18 fixture suites pass unchanged.

**GATE HALFWAY_ROUNDING_RISK** (`validateHalfwayRounding`, `lib/acca/validate-schema.ts`), wired into the durable barrier `runBaseRequirementGates` alongside GATE 26, P9 and TAX_RATE_ASSIGNMENT. Flags a code-owned figure rendered at a precision where the exact value is a tie, naming both candidate renderings and whether the component's tolerance absorbs the difference (a tolerance-absorbed hit is a presentation issue; one that is not is a genuine mismarking risk). Detector and fix share the same boundary predicate so they cannot drift. Two self-inflicted bugs were caught and regression-locked while building it: a substring match reported "96.5" present when the prose actually prints "96.55" (which manufactured a phantom "live drills are mismarking" alarm on two irhedge drills), and skipping on the hand-working string alone let an UNRELATED figure mask a real hit — the gate now **fails closed** when both renderings appear. Fixtures: `scripts/test-rounding.ts`.

**✅ The 5 published boundary-hit drills are RESOLVED (2026-07-25) — Piece 2 is UNBLOCKED.** They were briefly thought un-re-derivable from stored `answer_schema.params`; the missing inputs turned out to be stated verbatim in each drill's own `context_text`, so all five were re-authored end-to-end through their calculator family and the durable barrier in `lib/acca/case-authoring-gates.ts`. Published sweep: **5 rendered hits → 0** across all 49 published AFM numeric drills. Only `B3k dedca530` needed a param re-pick (debt arrangement fee 3.0% → 2.0%, moving `debt_issue_costs` off the −1.95 tie; the code-owned financing verdict did not flip). **None of this touches the mock** — its requirements were already authored post-FR3 and are byte-identical throughout. Recorded in `docs/AFM_SURFACED.md`.

**P9-SCENARIO** (`lintZeroAdditionalTaxScenario`) — P9 proper deliberately scans only the requirement's own prose, which left the shared scenario free to assert a RESOLVED tax outcome on the nil branch, in the one field P9 does not watch and the field students trust most. The variant fires only on the nil branch and only on resolved-outcome language: *no further/additional/residual tax*, *no further charge or liability*, *fully/wholly relieved, covered, offset*, *extinguishes / eliminates / wipes out / cancels the charge*, *the charge is reduced to nil/zero*, *nil further/additional*. Bare "credited against" and bare "capped at" are deliberately NOT in the set — they are mechanism, not outcome. Exhibit 1 was rewritten to the approved capped-relief wording, which the gate passes while a resolved-outcome variant of the same sentence fails loudly.

## ⛓ SECTION A INTEGRATED DEPENDENCY CHAIN (the load-bearing "real case" proof)

Section A is ONE company (Solenne Industries SA), ONE shared exhibit set, with a REAL cross-requirement chain — not four independent drills:

1. **A(i) CAPM (B3e)** ungears the Brazilian peer beta (1.35) **at the peer's own 34%** → asset β **0.9375** → regears to Solenne's 70:30 **at Solenne's 25%** → equity β **1.239** → Ke **11.93%** → **project WACC 9.59%** (FR2 / HC1).
2. **A(ii) NPV (B5b)** discounts the Rio Verde reais cash flows at **that exact 9.59%** (the CAPM output is fed straight into `discount_rate`) → **NPV +EUR 15.1m → ACCEPT**.
3. **A(iii) FX hedge (E2b)** hedges the **year-1 net remittance of BRL 179.5m** produced by A(ii) (the NPV's own `years[0].foreign_remit_net`) — forward vs money-market → the **forward** secures the higher locked-in euro receipt.
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

The Rio Verde plant requires an upfront capital outlay of BRL 480 million, paid at the start of the project, and would operate for four years. In a normal year it is expected to generate profit before interest and tax (PBIT) of BRL 320 million, with depreciation of BRL 80 million, capital reinvestment of BRL 60 million and an increase in working capital of BRL 20 million. The BRL-denominated cash flows are expected to grow by 3% a year. The Brazilian corporate tax rate is 34%. Dividends remitted to France suffer Brazilian withholding tax of 15%. The France–Brazil treaty provides relief from double taxation: relief is given for the Brazilian corporate tax of 34% suffered on those profits, credited against the French corporate tax of 25% that would otherwise be due on the same profits and capped at that French charge; the 15% Brazilian withholding tax is deducted separately as the profits are remitted. The current spot exchange rate is BRL 5.60 per EUR 1. Brazilian inflation is expected to run at 4.5% and eurozone inflation at 2.0% over the horizon.

**Exhibit 2 — Cost of capital data**

Solenne intends to appraise Rio Verde at a project-specific discount rate. A listed Brazilian bioethanol producer of comparable business risk has an equity beta of 1.35 and a capital structure of 60% equity and 40% debt by market value. Solenne's own capital structure is 70% equity and 30% debt by market value. The risk-free rate is 4.5%, the market risk premium is 6.0%, and Solenne's pre-tax cost of debt is 5.5%. Debt is assumed to carry a beta of zero. Solenne's treasury manual records that the Brazilian producer's own corporate tax rate of 34% is the rate carried into the ungearing of that company's equity beta, since the debt tax shield being removed is the Brazilian producer's; the French corporate tax rate of 25% is the rate Solenne applies when regearing the resulting asset beta to its own 70:30 structure and when weighting its post-tax cost of debt. Rio Verde's own operating cash flows are taxed in Brazil at the Brazilian corporate tax rate of 34%.

**Exhibit 3 — Managing the first remittance**

Rio Verde's first net remittance to France, expected to be BRL 179.5 million, is due in three months. The treasury team must decide how to fix the euro value of that receipt. The current spot rate is BRL 5.60 per EUR 1 and the three-month forward rate is BRL 5.66 per EUR 1. Annual money-market rates are: BRL deposit 10.0% and BRL borrowing 12.0%; EUR deposit 2.0% and EUR borrowing 3.5%. The board has asked which hedge secures the better locked-in euro receipt.

**Exhibit 4 — Treasury organisation**

Solenne has never operated a central treasury. Each of its four European subsidiaries runs its own treasury desk, negotiating its own bank facilities and managing its own cash and currency positions locally; the head office in Lyon coordinates nothing beyond consolidated reporting. The finance director argues that the new Brazilian exposure is the moment to establish a group treasury function at Lyon. A non-executive director is sceptical, warning that a central function "just adds a head-office layer that slows the subsidiaries down." The board wants an evaluation of the issues in establishing a group treasury and the likely impact on the existing subsidiary desks.

### Requirements


#### (i) B3e — 10 marks — calc (code-owned figures) — PS: analysis_and_evaluation

**Gate results:** GATE1/2/3 + P4–P9 + TAX_RATE_ASSIGNMENT + P9-SCENARIO + HALFWAY_ROUNDING_RISK ALL PASS

**Question:**

(i) Calculate the project-specific discount rate the board should use to appraise the Rio Verde project, and explain why this rate — rather than Solenne's own group cost of capital — is appropriate. (10 marks)

**answer_schema:** numeric AnswerSchema — 4 components: `asset_beta`=0.9374999999999999, `regeared_beta`=1.2388392857142856, `ke_project`=11.933035714285714, `wacc_project`=9.590625

**model_answer:**

**Cost of capital — CAPM / weighted average cost of capital**

**Assumptions:** a peer's equity beta is **ungeared** to an asset beta and **regeared** to the appraising firm's capital structure using the **Modigliani–Miller with-tax** relationship β_a = β_e × Ve/(Ve+Vd(1−T)), with the debt beta taken as **0 (debt assumed risk-free)**; the WACC weights the cost of equity and the **post-tax** cost of debt (Kd×(1−T)) by **market values**; the cost of equity is priced by CAPM (Ke = Rf + β × market risk premium) with Rf = 4.50% and MRP = 6.00%; the peer is taxed at 34.00% and the appraising company at 25.00%.


**Step 1 — Ungear the peer's equity beta (strip out the peer's financial risk)**

β_a = β_e × Ve/(Ve + Vd(1−T)) = 1.350 × 60/(60 + 40×(1−0.34)) = **0.938**  *(T = the peer's 34.00%)*

**Step 2 — Regear to YOUR capital structure**

β_e' = β_a × (Ve + Vd(1−T))/Ve = 0.938 × (70 + 30×(1−0.25))/70 = **1.239**  *(T = the appraising company's 25.00%)*

The ungearing uses the **peer's** 34.00% because the debt tax shield being stripped out is the peer's own; the regearing uses the appraising company's 25.00% because the shield being added back is the one its own capital structure creates.

The regeared equity beta (**1.239**) is **lower** than the peer's equity beta (1.350) because your gearing is below the peer's — the asset (business) risk is the same, only the financial risk differs.

**Step 3 — Project cost of equity (CAPM)**

Ke = Rf + β_e' × MRP = 4.50% + 1.239 × 6.00% = **11.93%**

**Step 4 — Project-specific WACC (market-value weights)**

WACC = Ke × We + Kd(1−T) × Wd = 11.93% × 0.700 + 4.13% × 0.300 = **9.59%**

This project rate reflects the **business risk of the peer's activity**, not your firm's own line of business — using your own company WACC would misprice a project of different risk.

**Step 5 — Evaluation / advice to the board**

The board should discount the Rio Verde cash flows at this project-specific rate, which reflects the business risk of Brazilian bioethanol production; using Solenne's group cost of capital would misprice a venture whose business risk differs from the group's existing chemicals operations.

*Reconciliation: asset β 0.938 → regeared β 1.239 → Ke 11.93% → WACC 9.59% ✓*

**hint:**

Don't reach for Solenne's own group WACC — Rio Verde is a differently-risked business. Ungear the Brazilian peer's equity beta to strip out its financial risk, then regear to Solenne's own gearing before pricing the cost of equity and blending the WACC.

**full_reveal:**

The dominant misconception here is using the group's own cost of capital as the project hurdle: candidates apply Solenne's average WACC to Rio Verde, ignoring that the Brazilian bioethanol business carries different business risk.

The fix is the ungear-regear route: strip the peer's financial risk to an asset beta, regear to Solenne's 70:30 structure, price the cost of equity through CAPM, then blend the project WACC. That project-specific rate — not the group average — is the correct hurdle.


#### (ii) B5b — 16 marks — calc (code-owned figures) — PS: communication,analysis_and_evaluation

**Gate results:** GATE1/2/3 + P4–P9 + TAX_RATE_ASSIGNMENT + P9-SCENARIO + HALFWAY_ROUNDING_RISK + INTL-12/13/14/14b family gates ALL PASS

**Question:**

(ii) Using the project-specific discount rate from requirement (i), calculate the net present value of the Rio Verde project in euros and advise the board whether, on financial grounds, the project should proceed. (16 marks)

**answer_schema:** numeric AnswerSchema — 9 components: `fx_1`=5.7372549019607835, `fx_2`=5.877873894655901, `fx_3`=6.021939431289623, `fx_4`=6.169535985978094, `home_cf_1`=31.290225563909775, `home_cf_2`=31.457905241572835, `home_cf_3`=31.626483489757344, `home_cf_4`=31.795965123769445, `npv`=15.102610562423546

**model_answer:**

**International investment appraisal — net present value to the parent**

**Assumptions:** project cash flows arise in BRL; the maintainable base-year foreign free cash flow is BRL 211.2m growing at 3.00% a year on a taxable profit (PBIT) base of BRL 320.0m; forecast spot rates are derived by PPP parity from the stated base spot 5.6000 BRL/EUR; converted cash flows are discounted at the parent's 9.59% money cost of capital. The foreign corporate tax rate 34.00% is **at or above** the parent's 25.00% home rate, so the credit for foreign corporate tax already covers the whole home liability and there is **no additional home tax** (max(0, 25.00% − 34.00%) = 0). The 15.00% withholding on remittances is therefore a **net cost** — with no residual home liability, the treaty's creditability gives it no relief.

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

| Year | Home cash flow | DF @ 9.59% | Present value |
|------|------|------|------|
| 0 | EUR -85.7m | 1.000 | EUR -85.7m | *(foreign outlay BRL 480.0m ÷ 5.6000)*
| 1 | EUR 31.3m | 0.912 | EUR 28.6m |
| 2 | EUR 31.5m | 0.833 | EUR 26.2m |
| 3 | EUR 31.6m | 0.760 | EUR 24.0m |
| 4 | EUR 31.8m | 0.693 | EUR 22.0m |

**NPV to the parent = EUR 15.1m.**

**Step 4 — Decision**

The NPV of EUR 15.1m is **positive**, so on these exchange-rate and fiscal assumptions the project **adds value to the parent and should be accepted**.

**Step 5 — Advice to the board**

On the project-specific discount rate of 9.59%, the appraisal returns a positive net present value, so on financial grounds Rio Verde should proceed; the board should nonetheless stress-test the assumed BRL depreciation path and the remittance timing, since both materially affect the euro value.

*Reconciliation: Σ present values EUR 100.8m − home outlay EUR 85.7m = NPV EUR 15.1m ✓*

**hint:**

Work in reais first, then convert. Build the project's free cash flow and apply Brazilian corporate tax; then get the double-tax rule right — because Brazil's 34% corporate rate is above France's 25%, the foreign-tax credit already covers the whole home liability, so no additional French tax arises and the 15% withholding is simply a net cost of remitting. Translate each year at the forward rate implied by the inflation differential, and discount at the project rate from (i) — don't discount reais at a euro rate.

**full_reveal:**

The classic misconception here is discounting foreign-currency cash flows at the home-currency rate: candidates leave the reais cash flows undiscounted-for-currency, or convert at today's spot for every year, mismatching the cash flows and the discount rate.

The fix is consistency: translate each year's remittance at the PPP-implied forward rate so the euro cash flows and the euro discount rate are on the same basis, and get the tax branch right. The double-tax rule has three cases: where the home rate exceeds the host rate, additional home tax is due on the differential; where the home rate is at or below the host rate — as here, France 25% against Brazil 34% — no additional home tax arises and the excess foreign credit is simply unusable; and the withholding tax on the remittance is a net cost regardless. So here the 15% withholding is a net remittance cost, not a recoverable credit. Only then discount. The resulting NPV is positive, so proceed on financial grounds.


#### (iii) E2b — 8 marks — calc (code-owned figures) — PS: scepticism

**Gate results:** GATE1/2/3 + P4–P9 + TAX_RATE_ASSIGNMENT + P9-SCENARIO + HALFWAY_ROUNDING_RISK + GATE 26 recommendation-consistency + FXH-19 best-method-verdict ALL PASS

**Question:**

(iii) Evaluate whether a forward contract or a money-market hedge secures the better locked-in euro value for the first BRL 179.5 million remittance, and recommend which Solenne should use. (8 marks)

**answer_schema:** numeric AnswerSchema — 4 components: `forward_home`=31.713780918727913, `mmh_foreign_now`=174.27184466019418, `mmh_home_now`=31.119972260748963, `mmh_home_settlement`=31.275572122052704

**model_answer:**

**FX hedging — forward vs money-market hedge**

**Assumptions:** a BRL 179.5 receipt is due in 3 months, quoted BRL per 1 EUR. The forward rate for the period is stated at 5.6600. The money-market hedge would borrow the foreign currency now and deposit the home proceeds, using today's spot of 5.6000.

**Step 1 — Forward hedge**

BRL 179.5 converted at the forward rate 5.6600 = **EUR 31.7m**, locked in.

**Step 2 — Money-market hedge**

Borrow the foreign currency now and deposit the home proceeds: BRL 174.3m today, converted at spot to EUR 31.1m, then grown to **EUR 31.3m** by the settlement date.

**Step 3 — All-methods comparison and recommendation**

| Method | Locked-in EUR outcome |
|------|------|
| Forward | EUR 31.7m |
| Money-market hedge | EUR 31.3m |

The forward gives the higher outcome, by **EUR 0.4m**, and is **recommended**.

**Step 4 — Advice to the board**

The forward contract secures the higher locked-in euro receipt, EUR 31.7m against EUR 31.3m — a modest margin of about EUR 0.4m on roughly EUR 31.7m. Solenne should therefore opt for the forward contract: on so slim a margin the qualitative factors decide it, and the forward wins on operational simplicity — a single dealt rate, with none of the borrow-and-deposit legs the alternative requires — while the board should weigh the counterparty credit exposure a forward carries and confirm the balance-sheet treatment before dealing.

*Reconciliation: forward EUR 31.7m vs MMH EUR 31.3m; margin EUR 0.4m to the forward ✓*

**hint:**

Price both hedges to a locked-in euro figure and compare like with like. For the money-market hedge on a receipt, borrow reais now against the future receipt, convert at spot, and deposit euros — then set the two locked-in euro amounts side by side and pick the higher.

**full_reveal:**

The common misconception here is judging the hedge on the headline forward rate rather than the locked-in euro outcome: candidates compare the forward rate to spot instead of computing the euro amount each hedge actually locks.

The fix is to convert both routes to a locked-in euro receipt and compare those figures directly; the forward secures the higher euro amount here, so it is preferred, though the margin is modest.


#### (iv) E1a — 6 marks — narrative (rubric-graded) — PS: commercial_acumen

**Gate results:** N1–N5 + P7 ALL PASS (real grader)

**Question:**

(iv) Evaluate the issues Solenne should consider in establishing a group treasury function at Lyon, and assess the likely impact on the existing subsidiary treasury desks. (6 marks)

**answer_schema:** narrative rubric — 3 criteria, 5 scenario_facts, total 6 marks, designed BAD flags ["F1","F5","F4"]

**model_answer:**

Establishing a group treasury at Lyon is worth doing, but only if it is designed to add control without smothering the subsidiaries.

The case for it is strongest precisely because of the Brazilian exposure. A central treasury pools scarce expertise and scale: it can raise group funding more cheaply than four desks bidding separately, net intra-group balances rather than each subsidiary hedging in isolation, and impose one consistent FX and risk policy. Solenne has never operated a central treasury, so the local desks have built no capability in group risk management — and none of the four European subsidiaries has ever handled a Brazilian exposure. Concentrating that judgement in one place is the point.

But the cost and disruption are real and should not be waved away. A treasury at Lyon needs systems, dealing lines and skilled staff, and it strips the four European subsidiaries of decisions they currently make locally. The non-executive director's warning that it "slows the subsidiaries down" has genuine substance: a badly-configured central function that insists on approving every local payment would indeed add a head-office layer without adding value.

For the subsidiary desks the concrete impact is a loss of autonomy over their own bank facilities and their local cash and currency positions. The right answer is not all-or-nothing. Lyon should own group funding, intra-group netting and the FX and risk policy — including the new Brazilian remittances — while the subsidiaries keep operational local cash management within that policy. On balance, on that hybrid basis the board should establish the group treasury: it captures the control and scale benefits the Brazilian venture needs, while leaving the subsidiaries responsive to their own markets.

**hint:**

Don't write a generic essay on the pros and cons of centralisation — anchor every point to Solenne: the four separate subsidiary desks, the absent central function, and above all the new Brazilian exposure none of them has handled. Then take the non-executive director's objection seriously and commit to a recommendation.

**full_reveal:**

The dominant misconception here is substituting a generic "centralisation is good" essay for an analysis of THIS group: candidates recite textbook treasury advantages and disadvantages without ever engaging with Solenne's four separate desks, the absent central function, or the specific new Brazilian exposure that prompts the question.

Establishing a group treasury at Lyon is worth doing, but only if it is designed to add control without smothering the subsidiaries.

The case for it is strongest precisely because of the Brazilian exposure. A central treasury pools scarce expertise and scale: it can raise group funding more cheaply than four desks bidding separately, net intra-group balances rather than each subsidiary hedging in isolation, and impose one consistent FX and risk policy. Solenne has never operated a central treasury, so the local desks have built no capability in group risk management — and none of the four European subsidiaries has ever handled a Brazilian exposure. Concentrating that judgement in one place is the point.

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

Separately, the advisers ran a Monte Carlo simulation of the same Firth Array project with 10,000 iterations, allowing electricity price, turbine availability and construction cost to vary continuously. The simulation produced a mean (expected) NPV of GBP 44 million, a standard deviation of NPV of GBP 60 million, a probability of a negative NPV of 22%, and a project Value-at-Risk of GBP 52 million at the 95% confidence level (expressed as a loss against a zero NPV, not as a shortfall below the mean NPV). The board must decide whether Firth Array's risk profile is acceptable before committing the GBP 500 million.

### Requirements


#### (i) B1a — 12 marks — calc (code-owned figures) — PS: analysis_and_evaluation

**Gate results:** GATE1/2/3 + P4–P9 + TAX_RATE_ASSIGNMENT + P9-SCENARIO + HALFWAY_ROUNDING_RISK + RISK-Ga/Gb family gates ALL PASS

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

The Value-at-Risk figure sharpens the downside. A project VaR of GBP 52 million at the 95% confidence level is the one-tail downside on the project over the period: there is a 5% chance that the downside loss will exceed GBP 52 million. It is a threshold, not a ceiling on the maximum possible loss — it measures the tail, not the worst case that could ever occur. Set against the GBP 500 million Brecon must commit, the board should treat that GBP 52 million as the tail loss the balance sheet has to be able to absorb.

On balance, Brecon should approve Firth Array only if it can withstand that tail loss without distress, or should first require mitigations — phased construction, or contracted revenue floors — that pull the 22% probability of a negative NPV down to a level the board is willing to accept. A positive mean is a reason to consider the project, not a reason to commit GBP 500 million to it unconditionally.

**hint:**

Reporting the statistics correctly is only half the job — the board needs to know what they mean for the GBP 500 million decision. Translate the probability of a negative NPV and the VaR into an explicit recommendation on whether to commit, and on what conditions.

**full_reveal:**

The classic misconception here is fence-sitting: candidates report the mean NPV, the standard deviation and the VaR figure accurately, then stop — leaving the board a table of numbers but no steer on the GBP 500 million decision. Reporting is not interpretation.

The simulation gives the board a distribution, not a verdict, and it should be read as one.

On the central outcome, the expected NPV of GBP 44 million is positive, so the typical result of the simulation creates value and there is a prima facie case to build Firth Array. That reading cannot stand alone, though: a 22% probability of a negative NPV means more than one simulated run in five ends in value destruction, which is a materially high failure rate for a project of this scale.

The risk profile is dominated by dispersion. The standard deviation of GBP 60 million is actually larger than the mean of GBP 44 million — a coefficient of variation above one — so the range of possible outcomes is very wide and the project is highly uncertain. Reporting the positive mean without that context would badly mislead the board.

The Value-at-Risk figure sharpens the downside. A project VaR of GBP 52 million at the 95% confidence level is the one-tail downside on the project over the period: there is a 5% chance that the downside loss will exceed GBP 52 million. It is a threshold, not a ceiling on the maximum possible loss — it measures the tail, not the worst case that could ever occur. Set against the GBP 500 million Brecon must commit, the board should treat that GBP 52 million as the tail loss the balance sheet has to be able to absorb.

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

**Gate results:** GATE1/2/3 + P4–P9 + TAX_RATE_ASSIGNMENT + P9-SCENARIO + HALFWAY_ROUNDING_RISK + IRH-20/21/23/25 family gates ALL PASS

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
