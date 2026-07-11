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
- **P1 — allocation.** Capital-rationing allocation is CODE-computed under divisibility: the appraised project is INDIVISIBLE (a bespoke facility can't be part-built); competitors default divisible. The feasible optimum is a with/without enumeration over indivisibles + PI-greedy fill of the remainder. The model never authors an allocation.
- **P2 — sensitivity.** Computed against an EXPLICITLY NAMED base — the post-tax present value of the operating cash flows (scrap and the depreciation tax shield excluded, as neither flexes). Never emit a margin whose base is unstated.
- **P3 — advice frame.** The advice opener is injected from the code-computed accept/reject decision. A reject drill emits reject language — never "cautious optimism", never "even if the NPV is positive".
- **P4 — jurisdiction** (above).
- **P5 — completeness.** Every element the question demands (NPV / sensitivity / PI-ranking) has a delivered component in the model answer. A standard NPV drill must not demand "sensitivity analysis" (that is the sensitivity variant).

### Batch discipline
One calculator → full batch → one batched adversarial review → approval flip → next calculator. **Generation never outpaces review.** Reviews are by calculator family; the **first-of-family gets FULL hostility**, siblings get spot-checks **with full recomputation of every figure**. Drills sit `status='candidate'`, `published=false` until the approval flip.

### BSOP — spreadsheet-inputs ruling
Black-Scholes option pricing is taught **spreadsheet-inputs style** — the exam supplies the calculator (J24 Littlebredy). Marked components = the **five input identifications + interpretation**, NOT manual option maths. (Pilot #2 / E2 extension gets its own fixtures and full hostility.)

### Roadmap order (AFM Phase 1, calculator by calculator)
NPV → IRR/MIRR → APV → cost-of-capital/CAPM → duration → FCFF-extension → **then** the E2 verifier extension (enum/integer component types) → **then** FX + interest-rate hedging. B + E deep first (~45 drills toward ~101 total AFM).

---

*New rulings: append here when a session bank adjudicates one; note the source bank date. The full journal-lesson-vs-rulebook reconciliation is banked as an idle-session sweep.*
