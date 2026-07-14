# GENERATOR_DOCTRINE.md

**Canonical home for the drill-generation doctrine and every standing ruling generation must obey.** Extracted from the `APM_BUILD_CONTRACT.md` journal so the rules live in one place; the journal keeps the narrative, this keeps the law. When a new ruling is adjudicated in a session bank, add it here.

Companions: `AFM_NUMERIC_VERIFICATION_DESIGN.md` (the numeric layer's full design), `TEACHING_ARCHITECTURE.md` (structural withholding), and the code — `scripts/generate-afm-drills.ts` (generator), `lib/acca/{npv,numeric-verifier,validate-schema,validate-afm-prose}.ts` (calculator + gates).

Cross-reference: `PRODUCT_STRENGTH_STANDARD.md` sets the paper-agnostic strength bar every subject must meet — the pipeline mechanics here implement the strength standard.

---

## Core doctrine — code decides the number, the model never does

Deterministic code owns **every figure AND every figure-vs-figure verdict** — the WDA/tax/cash-flow schedule, discount factors, present values, NPV, the accept/reject decision, project ranking/allocation, and the sensitivity margin. The model authors **prose only** (scenario, question, qualitative advice, hint, reveal) and never states, re-checks, or re-derives a computed number. LLMs are unreliable arithmetic graders; removing the number from the model's hands is the whole reason the numeric layer exists.

**Structural, not instructed** (`TEACHING_ARCHITECTURE.md`): the teaching call never possesses the model answer — its absence is architected. The same principle governs generation: the model cannot author a decision it is not given the numbers to author.

## The gate suite — the enforcement

Every quantitative drill passes ALL gates before it is persisted; a failing schema is unmarkable and MUST NOT ship. Gates live in `lib/acca/validate-schema.ts` (numeric) and `lib/acca/validate-afm-prose.ts` (prose):

1. **Schema self-consistency** — every dependent's `recompute(authored upstream)` lands within its own tolerance of its authored `expected_value`.
2. **Tolerance lint** — money uses relative tolerance in a sane band; rate/% uses tight absolute.
3. **OFR-wiring lint** — every dependent has a recompute rule; the formula reads only declared edges; the DAG is acyclic with no dangling refs.
4. **Answer↔schema figure integrity** — every `expected_value` appears in the worked model answer.
5. **Seeded-OFR proof** — a seeded wrong-upstream submission yields `carried` verdicts on dependents (carry-through actually fires).
6. **P4 jurisdiction** and **P5 completeness** (see rulings below).

## THE 5-FIELD SWEEP RULE (operationalised)

A correction that touches one claim must be applied across **all five drill fields** (`question`, `context_text`, `model_answer`, `hint`, `full_reveal`) — a residual in one field once slipped past an adversarial reviewer. **Operationalised the cheap way: any drill edit re-runs ALL gates on ALL fields before the DB write. The gates are the enforcement** — a claim fixed in only some fields fails figure-integrity or a prose lint, so the write is blocked. No edit reaches the DB without a full re-gate.

## Standing rulings

### OFR — own-figure rule (conditional, charged once at source)
Where a downstream method is correct on the student's own wrong upstream figure, it scores in full; the error is charged **once, at its source**, never again downstream. Credit is **conditional on the own figure being used correctly in each subsequent step** — not granted automatically. Authority: **ACCA examiner report, P2 June 2015** ("…if the own figure is subsequently used correctly"). This ruling is **closed** — do not re-open it in review. Encoded in `numeric-verifier.ts` (`carried` verdict) and taught verbatim in every drill `full_reveal`.

### Named-risk / invented-fact rule → P4 jurisdiction lint
Evaluative prose (advice, hint, reveal) may name **only risks/premia/factors the scenario itself states** — it must not invent risk premia, discounts, named risk factors, tax classes, statutes, or regulator/market-structure specifics of its own. Born from the pilot's third "invented-fact" instance (a "key-person premium" the scenario never mentioned). Now enforced by the **P4 jurisdiction lint**, rescoped: factual regulator/institution NAMES are legitimate scenario framing and are allowed in `context_text`/`question`; named tax/CCA classes and statutes are banned everywhere (scenarios state RATES); regulator behaviour/timeline claims and market-structure specifics are flagged in evaluative fields when NOT stated in the scenario. Scenarios end with the standard simplification line: *"For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated."*

### Code-owns-decisions inventory (P1–P5)
The regression classes proven at the calculator/generator level (batch-1 review). Each is a permanent rule:
- **P1 — allocation.** Capital-rationing allocation is CODE-computed under divisibility: the appraised project is INDIVISIBLE (a bespoke facility can't be part-built); competitors default divisible. The feasible optimum is a with/without enumeration over indivisibles + PI-greedy fill of the remainder. The model never authors an allocation. The answer **always emits the with-vs-without portfolio-NPV comparison line** (best portfolio funding this project vs best portfolio skipping it) plus the teaching sentence that an indivisible project can't be PI-ranked mechanically — both code-injected, not authored.
- **P2 — sensitivity.** Computed against an EXPLICITLY NAMED base — the post-tax present value of the operating cash flows (scrap and the depreciation tax shield excluded, as neither flexes). Never emit a margin whose base is unstated.
- **P3 — advice frame.** The advice opener is injected from the code-computed accept/reject decision. A reject drill emits reject language — never "cautious optimism", never "even if the NPV is positive".
- **P4 — jurisdiction** (above).
- **P5 — completeness.** Every element the question demands (NPV / sensitivity / PI-ranking) has a delivered component in the model answer. A standard NPV drill must not demand "sensitivity analysis" (that is the sensitivity variant).
- **P6 — loss relief** (APV round-1 FIX 1, 2026-07-13). When the computed tax schedule drives taxable profit **negative** in any year, the worked answer takes a NEGATIVE tax (a credit) that year — valid ONLY if the firm can use the loss immediately (relief against other profits). Such a drill MUST state a loss-relief assumption in its context (e.g. *"assume sufficient taxable profits from other operations to use any project tax loss immediately, with the tax effect received one year in arrears"*), else the negative tax is an unstated assumption. Enforced by `lintLossRelief` (`validate-afm-prose.ts`), wired as GATE 6: `taxable < 0` in the schedule AND no relief line in context = FAIL. **Retrospective (batches 1–2):** 3 IRR drills (`796651c2`/`003ab45c`/`712cf3aa`) had the gap and were fixed; the NPV reject drill `f2817d06` was already clean.

### APV — base-case basis, financing side-effects, and the APV/CAPM boundary (2026-07-13)
Calculator #4 (`lib/acca/apv.ts`). APV = base-case NPV (the project as if all-equity funded) + PV of financing side-effects. Rulings:
- **Base case discounts at a STATED ungeared cost of equity Keu.** The scenario gives Keu directly; the calculator takes it as an input. **Deriving Keu by ungearing an equity beta (asset beta via MM/Hamada) is the cost-of-capital/CAPM calculator's job — the NEXT roadmap item — NOT APV's.** Do not add ungearing to `apv.ts`; CAPM's batch must not re-litigate this boundary.
- **Tax shield discounted at the pre-tax cost of debt Kd**, and the basis is NAMED in the model answer, with a one-line note that a risk-free basis is an accepted examiner alternative (the P2 sensitivity-base discipline — no unstated-basis figures — extended to financing).
- **Issue costs are grossed up from net proceeds** (net × f/(1−f)); a t0 outflow, stored as a negative side-effect.
- **Subsidised-loan benefit = PV of the interest saving vs the market rate** — a pre-tax cash saving debt × (Kd − rs) in the interest year, LESS its tax effect debt × (Kd − rs) × t charged at year + lag; discounted at Kd. The tax shield is taken on the ACTUAL (subsidised) interest paid. The tax treatment + timing of the saving is code-owned.
- **ONE tax-timing per drill (2026-07-13 fix).** Every financing side-effect that carries a tax consequence lags it IDENTICALLY to the trading tax (`tax_lag`): the shield relief lands at the interest year + lag; the subsidy's tax leg at year + lag. Never collapse a tax effect in-year while another lags it. Tables label each row with its receipt period. Fixture-proven in `test-apv.ts` (lag0 vs lag1). *(Prior collapse-in-year subsidy treatment was FLAG-2, fixed pre-review.)*
- **Subsidised-loan term = appraisal horizon** — the facility is drawn/amortised over the operating-cash-flow horizon; the scenario's stated term MUST equal `debt_term` MUST equal the number of operating years (text and maths agree; five-field re-gate). *(A "15-year loan" shielded over 5 years was FLAG-1, fixed pre-review.)*
- **Decision-relevance is a generation quality bar, not a gate.** The subsidised base case can't be steered near-zero by a pre-tax-CF multiplier (tax/Keu/inflation erosion is invisible to the model), so `draftApvDrill` runs best-of-N against a per-kind verdict penalty (standard/compare→accept, reject→reject-on-negative-base, subsidised→decision-relevant) and ships the least-bad. Numbers are still code-owned and gate-verified regardless of which draft wins.
- **Graded chain carries OFR to the verdict:** ncf_p → pv_p (at Keu) → base_npv → each side-effect (own graded root) → apv. Because apv depends on base_npv, a wrong base-case figure carried correctly through the financing steps still flips the apv sign — the reject kind's direction is code-owned (same guard as the NPV reject drill `f2817d06`). The `financing_compare` kind (B3k, 'mixed') grades two terminals (apv_debt, apv_equity); code owns which package is preferred; gearing/interest-cover is code-owned enrichment.
- **Gate-guard fix:** the generator's quantitative-gate block keys off `drill._liveSchema`, not `mode==='quantitative'`, so the B3k 'mixed' compare drill (which carries a full schema) passes all five gates.

### CAPM / cost-of-capital rulings (calculator #5, B3d/B3e, 2026-07-13)
`lib/acca/capm.ts`. Pure **rates family** — no cash-flow chain, so **P6 loss-relief is a structural no-op and there is no issue-cost analogue** (all 6 gates still run). Rulings:
- **This calculator OWNS the ungearing** the APV batch deliberately does not: APV *states* Keu; CAPM *derives* it (kind `keu_for_apv` ungears a peer β → asset β → Keu). The APV/CAPM boundary is thereby closed — do not re-litigate it.
- **Debt beta = 0 across the batch** (exam-orthodox; debt assumed risk-free). The calculator *supports* a non-zero β_d (full MM formula) — **journalled as a future kind** if a drill ever needs risky debt; no drill uses it this batch.
- **Modigliani–Miller WITH-TAX ungearing** is house standard: β_a = β_e·Ve/(Ve+Vd(1−T)); regear by inversion β_e = β_a + (β_a−β_d)·Vd(1−T)/Ve. CAPM prices Ke; WACC uses **market-value** weights and **post-tax** debt.
- **Graded chains carry OFR to the verdict:** project_specific `asset_beta → regeared_beta → ke_project → wacc_project`; org_wacc `ke → wacc`; keu_for_apv `asset_beta → keu`; wrong_hurdle two chains (`company_ke → company_wacc`, `project_asset_beta → project_beta → project_ke → project_wacc`) + the **code-owned accept/reject flip** (return tested against the project-specific hurdle; company WACC is the wrong hurdle). Code owns every rate-vs-rate comparison; the model never states a beta, a rate, or an inequality.
- **Tolerances:** betas are unitless → abs **±0.02**; rates (ke/keu/wacc) stored as PERCENTAGES → abs **±0.1 pp** (±0.05 would punish legitimate 2-dp beta rounding through the chain).
- **Figure-integrity gate now checks 1/2/3 dp** (was 1 dp only): money displays at 1 dp, rates at 2 dp, **betas at 3 dp** — a value is "present" if any rounding is a substring. Backward-compatible (money still matches at 1 dp).
- **Every scenario states its corporate tax rate explicitly** (needed to ungear); the UAE drill states CT = 9% (distinctive, verifiable).

### Model-answer template hygiene (PATTERN, from CAPM round-1, 2026-07-13)
A code-built model answer serves multiple kinds from one function — three template traps, all now fixture-guarded:
- **Kind-conditional assumptions + heading.** The assumptions block (and heading) must name ONLY the operations the kind's chain actually performs — never a boilerplate superset. (CAPM `org_wacc` said "ungeared and regeared" though it does neither; `keu_for_apv` implied a WACC it never computes.) Fixture: each kind's assumptions names only its chain's operations.
- **Dynamic step numbering.** Number steps from a running counter over the steps actually rendered — never hardcode per kind (a `2 → 5` jump leaked when a 4-step template was reused for a 2-step kind). Fixture: `Step N` labels are 1..K consecutive.
- **No verb split across bold markers.** Interpolating a stem + suffix (`**${verb}**ed`) renders a broken word ("accept'ed"). Interpolate the FULL word (`accepted`/`rejected`), bold the whole thing. Fixture: no `**word**ed` artifact. *(Round-1 grep: the artifact existed only in `capm.ts` + the one wrong_hurdle drill; no APV/IRR/NPV contamination.)*

### CAPM round-1 rulings (2026-07-13)
- **Verdict:** FIX 1–5 accepted + applied (the three template fixes above + context/prose one-liners: business-risk-proxy wording, "an Abu Dhabi", sovereign-bond-yield not T-bill, un-gendered finance director). Drills re-gated (6 gates).
- **B3d drill dual coverage (`2a145f7d` wrong_hurdle).** Tagged **B3d primary** per the Q1 design ruling — the kind exists to make B3d's *appropriateness* clause concrete; the B3e ungear/regear chain is the vehicle. `lo_code` is single-valued (no secondary tag without a migration), so the **B3e dual coverage is journalled**, as with APV/B3k.
- **OFR wording — REJECTED softening (third review running).** "Charged once, at its source" is house wording tied to the override log; the OFR ruling stays **closed**.
- **Confirm-pass (2026-07-13, batch CLEARED).** One accepted polish — the `keu_for_apv` boundary line reworded to student content ("this ungeared Keu is the discount rate applied to the all-equity base-case cash flows in an APV appraisal; the financing side-effects are valued separately"), dropping the internal consumes/derives architecture language (which stays in the doctrine note). OFR-softening (4th) + wrong_hurdle retag (2nd) re-rejected — now both in the pack's CLOSED RULINGS section.

### Bond duration rulings (calculator #6, B3f + B3g rider, 2026-07-13)
`lib/acca/duration.ts`. Pure rates/bond family (like CAPM) — **P6 loss-relief is a structural no-op, no issue-cost analogue**; all 6 gates still run. Rulings:
- **Flat stated YTM per bond** (no yield curve — that is B3h / calc #7). Annual coupons (a `freq` param supports semi-annual for a future kind; unused). **Modified = Macaulay ÷ (1 + y/freq)**.
- **Graded chain: price + Σt·PV → Macaulay → modified → price_sensitivity**, OFR carrying. Code owns every duration + the **exposure ranking** (higher modified duration = more exposed, `compare` kind) and the **zero-vs-coupon** comparison (`zero_coupon`: Macaulay = maturity exactly; a coupon bond's is shorter). The model never states a duration, a rate, or an inequality.
- **Tolerances:** durations in years → abs **±0.05**; price/Σt·PV money → rel **±0.5%**; % price-sensitivity → abs **±0.1 pp**.
- **B3g convexity** lives SUBSTANTIVELY only in the `limitations` kind (which **dual-covers B3g** — single-tag `lo_code`, journalled, no migration; CAPM/wrong_hurdle precedent). Kinds 1–3 carry a **one-line linear-approximation caveat** by design.
- **The `zero_coupon` reference bond grades only its Macaulay** (its modified duration is not shown, so not graded — figure-integrity would otherwise fail on an undisplayed figure).
- **CURRENCY REALISM (TRY):** a Turkish-lira bond's stated yield must be deep double-digit (18–24%+), OR the facilities are hard-currency (USD/EUR) with the scenario saying so and acknowledging the lira rate environment. Never a single-digit TRY yield. (Generalise: state a yield realistic for the currency.)
- **ISSUER PERSPECTIVE (PATTERN, round-1 2026-07-14).** When the entity is the **ISSUER** of the instrument, duration prose frames sensitivity as **liability FAIR-VALUE movement**, never as "loss": a rise in yields *reduces* the liability's fair value (adverse to a bondholder, **not** an automatic issuer loss). The issuer's genuine exposures are **refinancing, hedge-accounting volatility, covenant/disclosure optics, and future funding cost**. The `compare` ranking template says "moves its **fair value** by roughly X%" (not "against you"). "Loss" language is reserved for **investor-framed** scenarios only. The evaluation must also **take a position** on any advice the question demands (anti-fence-sitting, per Code-owns-decisions P1–P5): e.g. "whether hedging is warranted" ends with a verdict + the trigger tests, never at "confirm whether …".

### Frozen market facts → P4b lint (PATTERN, from duration round-1, 2026-07-14)
A scenario is a **dated snapshot, not a live feed.** Present-tense real-world market claims ("currently above 40%", "current market yield") age the instant a rate moves. Freeze every market fact as a dated scenario assumption ("assumed at the valuation date to be …"). Enforced by `lintFrozenMarketFacts` (`lib/acca/validate-afm-prose.ts`), folded into **GATE 4 (P4)** and run across all fields incl. the reveal. Paper-agnostic — applies to every bank; sweep live banks (APM + AFM) when the rule is added and freeze any hits (additive rewording, journal post-publish edits per the edit-class protocol).

### Seeded-OFR gate hardening — distinct-factor perturbation (PATTERN, from duration 2026-07-13)
`buildOfrProof` (the generator's GATE 3) now perturbs each root by a **DISTINCT** factor (`0.85 − 0.06·index`, floored) instead of a uniform ×0.8. A dependent that is a scale-invariant **ratio** of two roots (Macaulay = Σt·PV ÷ price) recomputes to the CORRECT value under uniform scaling — the error cancels — and would wrongly verdict `correct` instead of `carried`, failing the gate. Distinct factors break the cancellation while staying well outside every tolerance; affine chains (NPV/APV/CAPM) carry exactly as before. Any future ratio-based calculator inherits the fix.
- **P5 completeness** gained a `duration` demand: a question asking for "modified/Macaulay duration" must deliver one in the answer.

### Batch discipline
One calculator → full batch → one batched adversarial review → approval flip → next calculator. **Generation never outpaces review.** Reviews are by calculator family; the **first-of-family gets FULL hostility**, siblings get spot-checks **with full recomputation of every figure**. Drills sit `status='candidate'`, `published=false` until the approval flip.

### Review-pack hygiene — full pack is always current (PERMANENT, 2026-07-13)
**After every fix round, regenerate the FULL review pack in place** — the on-disk canonical pack (e.g. `docs/reviews/AFM_BATCH_APV_REVIEW_PACK.md`) must ALWAYS reflect current DB state. Delta packs (`*_R2.md`, …) are ADDITIONAL, never a substitute. *(Origin: APV round 2 — the reviewer was handed the stale pre-round-1 pack and re-raised five already-fixed findings, wasting a review cycle.)*

**Every review pack carries a `⛔ CLOSED RULINGS — do NOT re-raise` section** in its reviewer instructions (PERMANENT, from CAPM confirm-pass 2026-07-13): list the settled house calls with one-line rationales — the OFR wording (override-log, closed), any adjudicated `lo_code` tag decisions, the APV/CAPM boundary. Reviewers then spend hostility on OPEN questions. *(Origin: OFR-softening was raised on 4 consecutive reviews; the wrong_hurdle retag twice — all already adjudicated.)*

### APV round-2 rulings (2026-07-13)
- **B3k drill dual coverage (dedca530).** `financing_compare` is tagged **B3k primary** per the Q3 design ruling — it is the batch's only B3k coverage and the question leads with the B3k "impact under alternative financing strategies" task. It ALSO exercises B3j APV mechanics (base + shield + issue costs). `acca_drills.lo_code` is single-valued and no secondary-tag column exists (adding one = migration), so the **dual coverage is journaled here, not schema-tagged**.
- **OFR wording — REJECTED softening (ruling reaffirmed).** "The error is charged once, at its source" is house wording, tied to the override log; it is NOT softened. The OFR ruling above stays **closed**.

### BSOP — spreadsheet-inputs ruling
Black-Scholes option pricing is taught **spreadsheet-inputs style** — the exam supplies the calculator (J24 Littlebredy). Marked components = the **five input identifications + interpretation**, NOT manual option maths. (Pilot #2 / E2 extension gets its own fixtures and full hostility.)

### Roadmap order (AFM Phase 1, calculator by calculator)
NPV → IRR/MIRR → APV → cost-of-capital/CAPM → duration → FCFF-extension → **then** the E2 verifier extension (enum/integer component types) → **then** FX + interest-rate hedging. B + E deep first (~45 drills toward ~101 total AFM).

---

*New rulings: append here when a session bank adjudicates one; note the source bank date. The full journal-lesson-vs-rulebook reconciliation is banked as an idle-session sweep.*
