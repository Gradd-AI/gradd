# AFM_NUMERIC_VERIFICATION_DESIGN.md

**Status:** DESIGN ONLY (AFM Phase 2A). No code. Architecture for the numeric-verification layer that AFM needs and APM never did. **GATED:** build nothing here until the first paying APM user (per `docs/APM_BUILD_CONTRACT.md` → "AFM Phase 1 CLOSED"). This doc is the spec that ports when the gate opens.

**Why AFM needs this and APM didn't.** APM drills are pass/fail on *technique* — a calc is a means to a judgement, and the moat is the diagnosis of the argument, not the arithmetic. AFM is a genuinely numeric paper: NPV/APV, cost of capital, hedging, business valuation. A student can produce a *number*, and that number is either right, right-by-method-wrong-by-input, or wrong. The teaching engine must know which — deterministically — before it can teach. That is the gap this layer fills. It sits alongside the existing structural-withholding drill engine (`lib/acca/teach-engine.ts`) and the case-marking core (`lib/acca/case-marking.ts`); it does not replace either.

---

## 1. Doctrine — code decides the number, the model never does

This layer is a direct extension of two doctrines already proven in the repo:

- **Case-marking core (`lib/acca/case-marking.ts`):** "the code owns every number." The model assigns a *band*; deterministic code converts bands → marks via largest-remainder apportionment. Instructing a model to "mark to absolute quality" lost to its priors twice; removing the number from the model's hands fixed it.
- **Drill withhold engine (`lib/acca/teach-engine.ts`):** the model answer is structurally absent from the student-facing calls; the model teaches from a *gap label*, never from the answer.

The numeric layer applies the same separation to arithmetic:

> **The model NEVER decides whether a computed value is correct.** A deterministic verifier compares the student's figure(s) to authored expected value(s) within an authored tolerance and emits a per-component verdict. The model receives that verdict and bands/narrates the **workings and judgement only** — it never re-checks, re-derives, or asserts the number.

This is non-negotiable and is the whole reason the layer exists: LLMs are unreliable arithmetic graders (documented in `APM_BUILD_CONTRACT.md` — "numbers correct ≠ explanation correct", and the D2e regression disaster where a model reconciled against a wrong supplied stat). The verifier is code; the teacher is the model; the two never swap jobs.

**Corollary — deterministic extraction.** Because the model cannot decide the number, it also cannot be trusted to *extract* the student's number from free text (a hallucinated extraction is a decided number by the back door). Two options, in preference order:

1. **Structured entry (recommended for `quantitative`):** the drill presents labelled numeric fields per computed component ("NPV (\$m):", "WACC (%):"). Extraction is trivial and exact. Costs a small UX change from the pure-chat flow.
2. **Deterministic parse (fallback):** a regex/label extractor pulls named figures from the student's text. No model in the path. Less reliable on messy input; only for `mixed` drills where a full structured form is overkill.

The UX tension (structured fields vs the conversational chat surface) is an open decision — see §9.

---

## 2. Answer schema — per computed component

Every verifiable numeric drill carries an **answer schema**: an ordered list of *components*, one per figure the student is expected to produce. Authored alongside the drill (same gate discipline as `model_answer`: authored, source-checked, never model-generated at serve time).

```
Component {
  component_id:   string      // stable id, e.g. "wacc", "base_npv", "apv"
  label:          string      // human label shown / logged, e.g. "Adjusted present value"
  expected_value: number      // the authored correct figure (full precision)
  unit:           string      // "%", "$m", "$", "years", "ratio" — drives display + tolerance mode
  tolerance:      Tolerance   // see §4
  working_steps:  string[]    // the method, in order — for teaching + carry-through, NOT shown pre-attempt
  depends_on?:    string[]    // component_ids this value is computed FROM (carry-through DAG — see §6)
  recompute?:     string      // reference to the deterministic recompute rule for carry-through (§6)
  weight?:        number      // optional mark weight for partial-credit reporting; default equal
}
```

`working_steps` is the sealed method (the AFM analogue of `full_reveal`) — it is the earned-reveal content, not shown before a genuine attempt. It is also what the carry-through recompute (§6) walks.

A drill's schema is the array of components plus a small header:

```
AnswerSchema {
  mode:        'quantitative' | 'mixed'   // never 'discursive'
  components:  Component[]
  // 'mixed' only: whether THIS drill's scenario actually supplies figures (see §3)
  scenario_supplies_figures: boolean
}
```

---

## 3. How the three-state `mode` field routes

The `mode` field on each LO in `scripts/afm-framework.ts` (`QUANTITATIVE_LOS` / `MIXED_LOS` / `DISCURSIVE_LOS`) is the routing hook, currently dormant. Routing at drill-generation and at verify time:

| LO `mode` | Answer schema | Verify behaviour |
|---|---|---|
| `quantitative` (21 LOs) | **required** — generation MUST produce a schema; a quantitative drill with no schema is rejected at the QA gate | every attempt runs the deterministic verifier before the model teaches |
| `mixed` (6 LOs: A2a, B3k, C4b, C4c, D2b, E2c) | **optional, per drill** — the generator decides based on `scenario_supplies_figures`: if the authored scenario hands the student numbers to compute with → schema required; if the drill is framed narratively (no figures given) → no schema, treated as discursive for that instance | schema present → verify; absent → skip verifier, teach as discursive |
| `discursive` (53 LOs) | **none** — no schema ever | never invokes the verifier; uses the existing APM-style teach-engine path unchanged |

The `mixed` state is the reason `mode` is three-valued rather than a boolean: the *same LO* (e.g. C4b "evaluate a financial offer") can be a pure numeric exercise or a narrative judgement depending on whether the scenario supplies the figures. Generation resolves this per drill and stamps `scenario_supplies_figures`; verification honours it. **The mode field decides the ceiling (can this LO ever be numeric?); the per-drill flag decides the instance.**

---

## 4. Tolerance philosophy — rounding vs method

Two error classes must be told apart, because they mean opposite things pedagogically:

- **Rounding / presentation slack (ACCEPT):** the student's method and inputs are right; they rounded intermediate figures, used 2dp vs 3dp, or presented \$m vs \$000. This is correct and must score full. Encoded as a per-component `tolerance`.
- **Method / conceptual error (REJECT → teach):** a wrong formula, a wrong input, a mis-applied tax shield. The figure is outside tolerance because the *thinking* was wrong. This is what the teach-engine then diagnoses.

```
Tolerance =
  | { kind: 'absolute';  value: number }   // ±value in the component's unit (e.g. ±0.05 $m)
  | { kind: 'relative';  pct: number }      // ±pct% of expected (e.g. ±0.5%) — default for large money figures
  | { kind: 'decimals';  places: number }   // round both to N dp then compare exactly (rates/ratios)
```

Authoring rules (to be enforced at the QA gate):
- Rates/percentages (WACC, cost of equity, IRR) → `decimals` (typically 1–2 dp) — a WACC of 9.4% vs 9.38% is a rounding artefact, not an error.
- Money values (NPV, APV, valuation) → `relative` (~0.5–1%) so scale-appropriate rounding passes without letting a genuinely wrong figure through.
- Tolerance is **authored per component, never inferred by the model.** A too-wide tolerance lets method errors score; a too-tight one fails correct rounding. This is a human/QA calibration, same discipline as the `marks_guide` audit.

Tolerance is deliberately *not* a single global epsilon: AFM figures span rates (~0–20%), ratios (~0–3), and money (\$m to \$bn). One epsilon can't serve all three.

---

## 5. Verification algorithm (deterministic)

Per attempt, for a drill with a schema:

1. Extract the student's figure for each `component_id` (structured field or deterministic parse — §1). Missing figure → component verdict `absent`.
2. For each component **in dependency order** (topological, per `depends_on`):
   - Determine the **effective expected value**: the authored `expected_value` for roots; for dependents, the value **recomputed from the student's own upstream figures** (carry-through, §6) if those were wrong-but-present.
   - Compare student figure to effective expected within `tolerance` → `correct` | `incorrect` | `carried` (correct given own upstream error) | `absent`.
3. Emit a `VerificationResult`: per-component verdicts + an overall (all-correct / partial / none), plus, for each `incorrect`, the *first* upstream step where the student and the method diverge (from `working_steps`) — this is the gap label the model teaches from.

The verifier outputs **no prose.** It is pure comparison. All narration is the model's job (§7).

---

## 6. Wrong number, right method — the own-figure / carry-through rule

**The requirement.** ACCA marking does not penalise a correct method twice. If a student computes WACC wrongly, then applies NPV *correctly using their own wrong WACC*, the NPV step still earns. This is commonly called the **own-figure rule** (a.k.a. own-figure-carried-forward / follow-through). It MUST be designed in, not bolted on, because AFM answers are chains: WACC → discount factors → NPV → APV, valuation → offer → EPS impact.

**The design.** The schema is a **DAG**, not a flat list: `depends_on` links each component to the ones it is computed from, and `recompute` names the deterministic rule to re-derive it. The verifier (§5, step 2) walks the DAG in topological order and, for any dependent component, computes its expected value **from the student's own upstream figures** rather than from the authored roots. Result:

- Right method + right inputs → `correct`.
- Right method + own wrong upstream input → `carried` (full credit for this step; the upstream error is charged once, at its source).
- Wrong method (figure off even after carry-through) → `incorrect` → teach.

This makes the number-check *method-aware* without the model ever touching the arithmetic: the recompute rules are authored deterministic code, the DAG is authored, the walk is deterministic.

**OFR credit rules — VERIFIED (08/07/2026).** Sources: ACCA P2 examiner report (June 2015), the ACCA FR own-figure technical article, and the AFM specimen marking resource. The rules the verifier and the authoring gate must implement:

- **(a) A correctly-carried step earns full marks for that step, assessed against the student's own figure.** A `carried` verdict (§5) scores 100% of the component's `weight` — the method is right, so the method marks are awarded on the student's own input, not the authored one.
- **(b) A source error is charged once, at the erring step, and never again downstream.** The erring component loses its marks; every downstream component that correctly uses that wrong figure is `carried` and full. The penalty does not propagate — the DAG walk (§5) charges it exactly once at the root of the error.
- **(c) No workings ⇒ OFR cannot be applied ⇒ a wrong final answer scores zero.** Carry-through can only be granted where the method is visible to be credited. A bare wrong number with no working is unmarkable and scores nil.

**(c) makes working-step capture a HARD REQUIREMENT of the answer flow, not an optional nicety — this upgrades the §1 recommendation.** A `quantitative` drill MUST capture the student's per-component workings (structured per-step entry, or an equivalent deterministic capture), because without them the verifier cannot distinguish "correct method, wrong input" (which OFR must credit) from "wrong answer, no method" (which scores zero). The schema already carries the *authored* method (`working_steps`, `depends_on`, `recompute`); (c) means the *student's* corresponding steps must be captured too, not just their final figures. A flow that captures only final figures cannot honour OFR and would wrongly zero correct-method answers — so it is out of spec.

---

## 7. Integration seam — teach-engine and case-marking core

The verifier is a **pre-step that produces the gap label**, slotting into the existing engines without changing their withhold guarantees.

**Drill teach-engine (`lib/acca/teach-engine.ts`).** Today `call2_diagnose` (Sonnet) produces a gap label from question + attempt + model answer. For a numeric drill:

- Run the **verifier first**. Its `VerificationResult` (per-component verdicts + first divergent step) becomes a *structured, code-authored gap label* fed into the same `call3_hint` / `call3_teach` slot the diagnosis currently fills.
- `call2_diagnose` is then **bypassed for the numeric components** (the code already decided correctness — the model must not re-litigate it) and retained only for the **narrative/judgement layer** of the answer (the "evaluate" half of a "calculate and evaluate" LO). This mirrors the completeness-gate pattern (`APM_COMPLETENESS_GATE`): the numeric verdict is the calc-branch, the model handles the judgement branch.
- The earned-reveal (`call4_reveal`) reveals `working_steps` — the authored method — exactly as it reveals `model_answer` today. Same gate (miss_count ≥ 2), same "sole moat-lift" discipline.
- **Withhold invariant preserved:** `expected_value` and `working_steps` are the numeric analogue of `model_answer` — they go to the verifier (code) and to `call4_reveal` only, never into a student-facing generative call.

**Case-marking core (`lib/acca/case-marking.ts`).** AFM Section A/B cases will have both technical (numeric) marks and professional-skills marks. The seam:

- Professional-skills marking is **unchanged** — `judgeCaseMarking` already bands the four skills and code apportions. AFM's Section F skills map onto the same structure (Communication / Analysis & Evaluation / Scepticism / Commercial Acumen — note AFM's are Section F, not APM's Section E).
- Technical (numeric) marks are a **new parallel path**: the verifier scores the computed components against the case's answer schema; code sums the technical marks; the model never scores arithmetic. The two paths (numeric verifier + skills bander) are summed in code into the case total — neither reaches into the other, exactly as the APM case-marking core keeps skills isolated from content.
- The `judgeCaseMarking` return shape extends additively: alongside `per_skill`, a `per_component` numeric block. No change to the existing skills logic.

**One core, two callers.** Both the drill flow and the case flow call the *same* verifier module (mirror of how `judgeCaseMarking` is shared by the mark route and the calibration script). Single source of truth for the arithmetic doctrine.

---

## 8. What this does NOT change

- APM drills, cases, and the teach-engine: untouched. `discursive` AFM LOs use the existing APM path verbatim.
- The structural-withholding primitive: preserved — numbers join `model_answer` as sealed, code-only content.
- Scoping: AFM drills live in `acca_drills` under `paper_code='AFM'` (see the Phase-2A scoping diagnosis); the verifier keys off the drill's authored schema, not the LO code, so the APM/AFM code collision is irrelevant to this layer.

## 9. Open decisions (for review before Phase 2B build)

1. **Structured numeric entry vs deterministic parse** on the conversational surface (§1) — recommended: structured for `quantitative`, parse for `mixed`. Note: OFR rule (c) in §6 makes per-component **working-step capture mandatory** for `quantitative` drills, so the entry design must capture workings, not just final figures. Confirm the UX within that constraint.
2. **Carry-through credit weighting** (§6) — **RESOLVED (08/07/2026).** OFR rules verified against the ACCA P2 examiner report (June 2015), the ACCA FR own-figure technical article, and the AFM specimen marking resource: carried step = full marks on own figure; source error charged once; no workings = zero (workings capture is a hard requirement). §4/§6 authoring rules are unblocked.
3. **Schema storage** — **RESOLVED (2B-2 migration `20260708130000_afm_drill_schema_extensions.sql`):** `answer_schema jsonb` column added (nullable; null for APM + discursive AFM). The pilot (`scripts/generate-afm-drills.ts`) persists the **serialised projection**: components + tolerances + `depends_on` + `working_steps`, with `recompute` written as a **rule-id string** plus a per-drill `params` block (the live `(deps)=>number` functions cannot serialise). This is the concrete form of the `recompute?: string` registry note in `lib/acca/numeric-verifier.ts`; string→function resolution at serve time is Phase 2B-later and nothing reads `answer_schema` at serve time yet (routing dormant), so persistence is forward-compatible, not load-bearing.
4. **`mode` persistence** — **RESOLVED (2B-2 migration):** `mode text` column added (three-state CHECK) and the AFM generator writes `mode` + `calculation_required` per instance. Serve/verify can route without re-deriving from the framework.
5. Tolerance calibration is a **human QA gate**, like `marks_guide`. **Partly automated (pilot):** `lib/acca/validate-schema.ts` now hard-lints tolerances (money→relative in a sane band, rate/%→tight absolute) as a blocking gate before insert; the residual human step is per-component *calibration* of the chosen bands, not presence/shape.
6. **E2 forex hedging (pilot #2) — GATED on a verifier extension. DO NOT BUILD YET.** The pilot proved the quantitative *generation* path on a purely-numeric valuation LO (B4c FCFF) that the Phase-2B-1 verifier fully supports. E2b's signature failure-catalogue components (docs/TEACHING_PRINCIPLES_EZRA_AFM.md #4) are **not numeric** and cannot be graded by the current `Tolerance = absolute | relative` engine: **direction (buy/sell)** and **contract month** are *categorical*, and **whole number of contracts** needs an *integer/discrete* check (a `±0.5 absolute` tolerance would wrongly pass `40.4`). Before E2 can be a drill, `lib/acca/numeric-verifier.ts` must gain **`kind: 'enum'`** (exact-match categorical component + verdict) and **`kind: 'integer'`** (discrete whole-number component + verdict), and `lib/acca/validate-schema.ts` must lint them. Integration Note (a) in the teaching doc *claims* these are schema components; this item records that the *engine* does not implement them yet. E2b (futures-with-basis hedge) is the deliberate driver for that extension once approved.
