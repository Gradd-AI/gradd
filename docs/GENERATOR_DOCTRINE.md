# GENERATOR_DOCTRINE.md

**Canonical home for the drill-generation doctrine and every standing ruling generation must obey.** Extracted from the `APM_BUILD_CONTRACT.md` journal so the rules live in one place; the journal keeps the narrative, this keeps the law. When a new ruling is adjudicated in a session bank, add it here.

Companions: `AFM_NUMERIC_VERIFICATION_DESIGN.md` (the numeric layer's full design), `TEACHING_ARCHITECTURE.md` (structural withholding), and the code — `scripts/generate-afm-drills.ts` (generator), `lib/acca/{npv,numeric-verifier,validate-schema,validate-afm-prose}.ts` (calculator + gates).

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

### Batch discipline
One calculator → full batch → one batched adversarial review → approval flip → next calculator. **Generation never outpaces review.** Reviews are by calculator family; the **first-of-family gets FULL hostility**, siblings get spot-checks **with full recomputation of every figure**. Drills sit `status='candidate'`, `published=false` until the approval flip.

### Review-pack hygiene — full pack is always current (PERMANENT, 2026-07-13)
**After every fix round, regenerate the FULL review pack in place** — the on-disk canonical pack (e.g. `docs/reviews/AFM_BATCH_APV_REVIEW_PACK.md`) must ALWAYS reflect current DB state. Delta packs (`*_R2.md`, …) are ADDITIONAL, never a substitute. *(Origin: APV round 2 — the reviewer was handed the stale pre-round-1 pack and re-raised five already-fixed findings, wasting a review cycle.)*

### APV round-2 rulings (2026-07-13)
- **B3k drill dual coverage (dedca530).** `financing_compare` is tagged **B3k primary** per the Q3 design ruling — it is the batch's only B3k coverage and the question leads with the B3k "impact under alternative financing strategies" task. It ALSO exercises B3j APV mechanics (base + shield + issue costs). `acca_drills.lo_code` is single-valued and no secondary-tag column exists (adding one = migration), so the **dual coverage is journaled here, not schema-tagged**.
- **OFR wording — REJECTED softening (ruling reaffirmed).** "The error is charged once, at its source" is house wording, tied to the override log; it is NOT softened. The OFR ruling above stays **closed**.

### BSOP — spreadsheet-inputs ruling
Black-Scholes option pricing is taught **spreadsheet-inputs style** — the exam supplies the calculator (J24 Littlebredy). Marked components = the **five input identifications + interpretation**, NOT manual option maths. (Pilot #2 / E2 extension gets its own fixtures and full hostility.)

### Roadmap order (AFM Phase 1, calculator by calculator)
NPV → IRR/MIRR → APV → cost-of-capital/CAPM → duration → FCFF-extension → **then** the E2 verifier extension (enum/integer component types) → **then** FX + interest-rate hedging. B + E deep first (~45 drills toward ~101 total AFM).

---

*New rulings: append here when a session bank adjudicates one; note the source bank date. The full journal-lesson-vs-rulebook reconciliation is banked as an idle-session sweep.*
