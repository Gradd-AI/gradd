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

## P-G1 — A GATE THAT CANNOT EVALUATE MUST SAY SO DISTINGUISHABLY (ruled 2026-07-28)

**A gate result is `pass` | `fail` | `not_evaluated` — never a silent absence, never a vacuous
pass.** A gate that cannot evaluate its condition (missing input, absent sub-object, empty
collection, unresolved id, wrong shape) MUST emit a `not_evaluated` line carrying a `blocking`
flag. Blocking is the DEFAULT; non-blocking is reserved for exemptions that are **structurally**
N/A, and each must name its reason in code. `lib/acca/case-authoring-gates.ts` holds the model
(`GateStatus`, `barrierPasses`, `barrierBlockers`).

**Why this is a rule and not a preference.** A skipped gate used to be invisible in two ways —
an early `return []` that read as a clean pass, or *no line at all* — and both are green under a
`.every(ok)` roll-up. A 2026-07-28 re-gate of AFM Mock Paper 1 reported **"ALL GATES GREEN"
while 13 calc-family gate lines never executed**, GATE 26 emitted nothing, P6 was disabled by a
caller-supplied `hasLoss: false`, and GATE 27 printed `ok: true` behind a `(no-op)` suffix.

**This is the SAME SHAPE as two failures already in this doctrine**, and that is the point:
- the **N4 skip** — `checkRule23` was skipped on three narrative requirements because one caller
  read `rubric.golden_bad` while the rubric stores `_authoring.golden_bad`; it printed a skip
  line nobody counted;
- the **empty-sweep artefacts** — a detector run whose result set is empty because the *harness*
  filtered everything out, reported as a clean corpus (see P-DB5 and the 14.5× GATE-27
  measurement artefact).

In all three the instrument reported success while measuring nothing. **Silence is not
evidence.** A sweep, a gate and a post-verify must each be able to say "I did not run".

**Structural consequences, all shipped 2026-07-28:**
- `family` is a **REQUIRED** parameter on `runRequirementGateBarrier` — omission was the single
  largest hole. `runFamilyGates` gains a `default:` that **THROWS** on an unregistered `lo_code`;
  "this requirement has no family gates" must be said explicitly via
  `{ lo: 'NO_FAMILY_GATES', forLo, reason }`.
- `deriveHasLoss` replaces the caller-supplied `hasLoss`, which is REMOVED from
  `RequirementProseFields`. A gate's engagement condition must be **derived from the artefact**,
  never taken on trust from the caller — a wrong `false` is an invisible no-op.
- `runNarrativeGateBarrier` is the **single committed N1–N5 orchestration**. Ad-hoc wiring in two
  scripts is how the N4 skip happened. A missing golden BAD or empty `designed_bad_flags` now
  BLOCKS: N4 is the verifier-of-the-verifier and cannot be skipped quietly.

**KNOWN LIMITATION — compile-enforcement does not reach the authoring scripts.**
`tsconfig.json` excludes `scripts/`, and `tsx` transpiles without type-checking, so the required
`family` parameter is compiler-enforced only for `lib/` and `app/`. The authoring scripts — the
actual callers — rely on a **runtime guard** that throws with an actionable message. Do not
describe this fix as "the compiler makes it impossible"; it does not, for the code that matters
most. Closing it properly means bringing `scripts/` into a typecheck.

## P-G2 — A DETECTOR'S SCOPE MUST BE PROVEN, NOT ASSUMED (ruled 2026-07-28)

**Before reporting a count, prove the DENOMINATOR.** State what the detector scanned, what it
could not reach, and why. **A count without a stated denominator is not a measurement** — it is
an assertion with a number attached, and it reads as coverage it does not have.

Three instances in a single session, all mine, all caught only because something downstream
disagreed:

1. **The capm drill filter missed a real drill.** The capm-family filter matched on component
   ids, but the `org_wacc` kind emits exactly `ke, wacc` and neither was in the id list. It
   reported **3** capm drills; there are **4**. `810b3893` was silently outside the denominator.
2. **The blast-radius query flagged a published APM row.** A post-write check queried *every*
   `acca_case_requirements` row instead of the three AFM mock cases, and also failed to select
   `id`, so its self-exclusion was a no-op. It reported a "stale" hit on Bexley Grocers — a
   published APM case entirely outside the change-set.
3. **The P7 harness undercounted by 6.** It tallied gate lines per drill, but 6 rows **threw
   before emitting any line**, so their P7 result was never counted. It reported **6** failures;
   there were **8** — and the 8 exactly matched the set measured when the gate was introduced.

**The operational rule.** Every sweep, gate run and post-verify must report, alongside its
result: the population it drew from, the filter it applied, the rows it could not evaluate, and
the reason for each. Rows that **error** are part of the denominator — a row that throws is
`not_evaluated`, never absent. Prefer widening a filter and tolerating noise over narrowing it
and reporting a clean number.

**These are the same family as P-DB5 and P-G1** — in every case **the instrument reported
success while measuring less than it claimed**:
- **P-DB5** — a detector *finding* is not a defect until re-derived from the row (a matched
  string proves some figure renders that way, never which one).
- **P-G1** — a gate that cannot evaluate must say so distinguishably (silent absence reads green).
- **P-G2** — a detector's *scope* must be proven (an unstated denominator reads as full coverage).

P-DB5 governs the numerator's meaning, P-G2 the denominator's extent, P-G1 the honesty of the
individual result. A report that satisfies one and not the others is still misleading.

## P-M1 — A RELIABILITY FIX TO A MARKING CALL MUST BE RE-CALIBRATED, NOT MERELY RE-RUN (ruled 2026-07-29)

**Changing the SHAPE of a marking call changes the MARK.** Reliability and calibration are not
independent axes, and a fix that makes the marker fail less often is not thereby a safe fix.

The instance. `judgeTechnicalOnce` was throwing `parse` on ~22.9% of calls, each failure binning a
whole case's judgements. Two changes were made together: the model contract moved from echoing a
36-character `requirement_id` to echoing a **short ordinal** (killing a one-character transcription
slip class), and the batched per-case call was **split into one call per requirement** (shrinking the
blast radius of any remaining failure). Both are sound-sounding reliability moves. The split also
**moved the marks**: judged alone, mock A(iv) inflated `strong → exemplary` in **5/5** runs, because
with no sibling answers in view the marker has nothing to calibrate "less analytically sharp than the
standard" against. Isolation also made the hardest requirement *more* likely to think aloud before
answering — so it did not even buy the reliability it was for.

**The rule.** Any change to a marking call's shape — batching, isolation, prompt contract, token
ceiling, model — is re-measured on a **fixed reference script** over **N repeated runs**, and the
BAND MATRIX is reported per requirement, not just the pass rate. A change that alters a band
distribution is a **marking change** and needs the same scrutiny as a content edit, whatever
engineering problem it was aimed at.

**Corollaries.**
- **Sibling context is load-bearing; batching is a marking decision, not a cost one.** Splitting a
  batched marker is never "just plumbing".
- **Separate the two fixes and keep the one that stands alone.** The ordinal contract survives on its
  own evidence (the slip class went to zero across 50 calls, no band moved). The split does not.
- **Fix the parse at the PARSER when the judgement was sound.** The measured failure was a valid,
  correct JSON body behind a prose preamble — discarding it was failing on presentation, not
  substance. Widening the extractor keeps the batch AND the judgement (`extractJsonBlock`, string-aware
  brace matching, `scripts/test-marking-json-extract.ts`). It must still reject a genuinely malformed
  or truncated body — a "repair anything" extractor is worse than the bug it fixes.
- **Report the rate against a declared denominator** (P-G2), and never state a zero-failure run as a
  zero rate: 0/30 bounds the true rate near ≤10% at 95%, it does not establish 0%.

## THE 5-FIELD SWEEP RULE (operationalised)

A correction that touches one claim must be applied across **all five drill fields** (`question`, `context_text`, `model_answer`, `hint`, `full_reveal`) — a residual in one field once slipped past an adversarial reviewer. **Operationalised the cheap way: any drill edit re-runs ALL gates on ALL fields before the DB write. The gates are the enforcement** — a claim fixed in only some fields fails figure-integrity or a prose lint, so the write is blocked. No edit reaches the DB without a full re-gate.

## PROCESS RULES — DB writes to published content (ruled 2026-07-25)

Banked after the FR3 boundary re-author, where five **published** `acca_drills` rows were
rewritten on a feature branch that was then handed back unmerged "for review". The content was
already live; only the code was gated. That gap is now closed by rule.

**P-DB1 — A DB write is NOT branch-scoped.** There is one Supabase. Committing a write script to
a branch, or holding the branch back from `main`, gates the CODE and gates NOTHING about the
DATA. The moment the script runs, production content has changed — for every student, on every
host, regardless of what `git status` says. Never describe a branch as "not merged, so nothing
has shipped" when that branch's work included a DB write; say what landed and when. A sweep run
after such a write measures **production**, not the branch.

**P-DB2 — Show the write BEFORE it happens, not at review time.** Any generator or authoring run
that writes to **`acca_case_requirements`** (and the same discipline for `acca_cases` /
`acca_drills` rows that are already `published`) must be presented for approval **before the
write executes** — the dry-run output, the old-vs-new figure table, the gate results, and the
exact rows and fields to be touched. "Here is what I already wrote, please review" is the wrong
order and is not acceptable for published content. A dry run that ends in a decision point is
the deliverable; the write is a separate, approved step. This is stricter than GATE-P, which
authorises Claude Code to execute a *publish flip* unattended once the standing guards hold —
GATE-P governs a status change on already-reviewed content; **P-DB2 governs a CONTENT change to
already-published rows, and it is not self-authorising.**

**P-DB4 — Verifying a write to a published row means a FULL-FIELD DIFF, not a component match.**
Components matching their `expected_value` proves the MATHS. It does not prove the ROW IS INTACT.
Proven the hard way on the FR3 boundary re-author: `answer_schema.params` drifted silently on
two published drills while **every component matched and every gate passed** — `B3d 2a145f7d`
had `own_ve`/`own_vd` rewritten 48200/12600 → **0** (masked by a `?? 0` serialiser default for
inputs the `wrong_hurdle` calc path never reads, so nothing downstream could notice), and
`B4a 0dc970a8` had `kd` rewritten 0.057999999999999996 → 0.058 (the scenario states 5.8%; the
original generator passed `5.8` for `asDecimalRate` to normalise, and the re-author passed the
decimal directly). Neither moved a component far enough to trip a tolerance. Both were caught
downstream by a review-pack audit — i.e. by accident, days later, not by the write's own
verification.

So: **read the row back after the write and compare EVERY field to the intended value with
EXACT equality** (`Object.is`, not a tolerance) — `question`, `context_text`, `model_answer`,
`hint`, `full_reveal`, and every key of `answer_schema` including `params`, not just
`components`. Anything that changed and was not declared in advance as an intended change is a
defect, however inert it looks. A field the calculator never reads is exactly the field nothing
else will catch. `scripts/_reauthor_boundary_drills.ts` is the reference implementation: it
declares expected component AND param drift up front and refuses to write on anything else.

**P-DB4(a) — the comparison must be KEY-ORDER-INSENSITIVE. `JSON.stringify` equality is an
INVALID post-verify.** PostgreSQL `jsonb` does not preserve key order — it normalises on
storage — so a byte comparison of serialised JSON cannot distinguish a reordering from a real
change, and reports a mismatch on rows that are perfectly correct. Compare **key sets and
values**: assert the key set is exactly what was intended (no missing, no extra) and compare
each value with `Object.is`. Never diff serialised bytes.
*Evidence (2026-07-28, mock-params re-serialisation):* the apply script's own read-back used
`JSON.stringify` and reported `stored-matches-intent=false` on **all 5** rows. Every one was
correct; the only difference was jsonb key order. A verifier that cries wolf on a clean write
is worse than none — the next real defect gets waved through as "probably the ordering thing".

**P-DB4(b) — the baseline must be READ FROM THE ROW pre-write. A transcribed figure is not a
baseline.** Never take an expected value from a document, a review pack, a candidate script, a
model answer's rendered prose, or hand arithmetic. Snapshot the row itself before the write and
diff against that snapshot. A pack is a stale copy, rendered prose is rounded, and hand
arithmetic silently disagrees with IEEE-754 in the last bits — each produces a **false** drift
report indistinguishable from a real one.
*Evidence (same write):* the corrected order-insensitive check then flagged two figures as
drift — `asset_beta 0.9375 → 0.9374999999999999` and `forward_home …872792 → …8727913`. **Both
were FALSE.** Neither figure had been in the pre-write dump; the baseline was typed from the
candidate script's exact-rational hand arithmetic. Reconciled by recomputing from the stored
inputs: `ungearBeta(1.35, 60, 40, 0.34, 0)` **is** `0.9374999999999999` (float: `40×0.66 =
26.400000000000002`) and `179.5 / 5.66` **is** `31.713780918727913`. Those were the authored
values all along; the write changed neither.

**This is the FOURTH false positive of the bad-baseline / string-misattribution shape** in this
workstream — after the `96.5`/`96.55` hit, the 259 unmatchable GATE-27 tokens, and the B3k
`dedca530` re-author (the only one that reached published content). The common mechanism every
time: **a figure was compared against something other than the row it came from.** P-DB5 is the
general rule (reconcile a detector hit against real data before calling it a defect); P-DB4(a)
and (b) are the two concrete ways a *post-verify* manufactures the same false positive.

**P-DB3 — A rollback snapshot is mandatory, and it must be COMMITTED.** Before any write to a
published row, snapshot every field the write touches, for every affected id, and commit it to
`docs/rollbacks/<TOPIC>_<YYYYMMDD>.json` **on the branch that made the change**. Never leave it
untracked in the repo root or in the scratchpad: the scratchpad is outside the repo and
machine-local, untracked files do not survive a `git clean` or a machine switch (this repo is
cloned at different paths on two machines), and a rollback you cannot find is not a rollback.
The file carries a `_README` first key naming what it snapshots, which rows, which fields, the
date, and the restore procedure. Reference implementation:
`docs/rollbacks/AFM_boundary_rounding_20260725.json`.

**P-DB5 — A DETECTOR FINDING IS NOT A DEFECT UNTIL ITS OWNING COMPONENT IS CONFIRMED BY
RE-DERIVATION FROM THE ROW.** A detector that matches a *string in prose* has not identified a
*component*. Prose is a shared namespace: many components render to the same digits, so a
matched token proves only that SOME figure renders that way — never WHICH one, and never what
that component's stored `expected_value` actually is. Before a finding may be called a defect,
re-read the owning component from the live row and confirm, by re-derivation, that its stored
value genuinely exhibits the reported property. A finding that cannot be reconciled that way is
a **detector bug** and must be reported as one — never as a content defect.

**This has now produced THREE false positives in one workstream, all the same shape — a string
matched to the wrong owner:**
1. **`96.5` / `96.55`** — a naive substring test reported `96.5` present in prose that prints
   `96.55` at 2 dp, where the value is unambiguous. Manufactured a phantom "live drills are
   mismarking students today" alarm across two published irhedge drills.
2. **The 259 unmatchable tokens** — bulk token-level matching that could not attribute what it
   found to any owning component.
3. **B3k `dedca530` — the expensive one, because it reached published content.** FR3 reported
   `debt_issue_costs = -1.95`, outside tolerance, and five published drills were re-authored on
   the strength of it. Re-read from the live row (2026-07-26), `debt_issue_costs` is **-1.3**
   (gross debt principal 65 × 2.00% = 1.3 exactly), tolerance `{relative, 0.5%}` — sitting on
   **no rounding boundary at any precision**, and that row has **zero** boundary occurrences
   across all 16 of its components. The `-1.9` the detector matched in the prose is
   **`ncf_5 = -1.878919424`**, a clean non-boundary value that legitimately renders `-1.9` at
   1 dp. The `-1.95` `expected_value` was **back-inferred from the misattributed string** — it
   never existed in the database. Published content was changed to fix a phantom.

**Therefore: NEVER approve a write to published rows on a detector's FIRST PASS.** A first pass
is a hypothesis. The write is authorised only after each hit has been reconciled against live
data, component by component, and survived. This composes with P-DB2 (show the write before it
happens) and P-DB4 (verify with a full-field diff): P-DB5 governs whether there is anything to
write **at all**.

**Reconciliation must be STRUCTURAL, not remembered.** A rule that depends on a future session
recalling to double-check is the rule that failed three times. Build the reconcile step into the
detector's own sweep so an unreconciled hit cannot be emitted as a defect. Reference
implementation: `scripts/scan-halfway-rounding.ts` (`npm run scan:halfway`) — it re-derives every
reported hit from the raw row JSON (component exists · stored value equals the reported value ·
the boundary claim holds · the artefact is present as a COMPLETE number) and emits anything that
fails as a **DETECTOR BUG** in a separate section from content defects.

**Claim discipline.** Green gates prove internal consistency, never correctness against the
world; a detector's output is evidence, not a verdict. State findings as "the detector reports
X — reconciled/unreconciled against live row Y", never as "drill Z is defective", until the
reconciliation has actually been run.

## Standing rulings

### ⚠ HOUSE CONVENTIONS — house-authored, NOT examiner-sourced (read this before citing any of them)

Everything else in this section is settled by a fetched ACCA quote (the Step-0 gate immediately
below). The rulings in **this** subsection are different in kind: the corpus was searched and
found **SILENT**, so Grant ruled and we recorded the choice. They are binding on our content and
must **never** be presented to a student, a reviewer, or a review pack as "ACCA says". Where a
house convention is encoded in code it carries a `HOUSE CONVENTION` comment naming the ruling
date and stating that no source disambiguates it. Examiner-sourced constants live in
`docs/evidence/sources.json` + the Rule-22 in-file evidence comments; these do not.

**HC1 — Which tax rate ungears a foreign proxy's beta (Grant ruling 25/07/2026).**
The `(1−T)` in **ungearing** prices the **proxy's** debt tax shield, so it takes the **proxy's own
(host) tax rate**; **regearing** applies the **investing company's (home) rate** to its own capital
structure. Encoded as the optional `peer_tax_rate` input in `lib/acca/capm.ts` (defaults to
`tax_rate`, so every single-jurisdiction drill is byte-identical — proven over 20,736 input
combinations).
*Evidence position:* **NO ACCA SOURCE DISAMBIGUATES THIS.** The corpus never poses a two-rate
ungear — every worked ungear/regear ACCA publishes legislates one rate for all companies (P4
SD2016 Morada at 20%; AFM MJ2019 Talam/Honua *"Both Honua Co and Talam Co pay corporation tax at
an annual rate of 20%"*, which also hands over the finished 11%; the CAPM-part-2 worked example at
25% throughout), and every cross-border AFM question (McKeever/Erat, Drimpton/Edricer,
Washi/Airone, Penn/Zanadia) **gives** the discount rate and applies its two tax rates to cash flows
only. The formula sheet prints `Vd(1 – T)` with `T` undefined. **Directional support only:** ACCA
*"The capital asset pricing model – part 2"* method statement gathers proxy *"gearings and tax
rates"* (plural, per proxy) as an input to the ungearing step. That is a wording lean, not a
worked determination — do not upgrade it to a citation.

### CONVENTIONS ARE FETCHED, NOT REMEMBERED (Step-0 gate, PATTERN — batch #10 lesson, 2026-07-18)
Any new calculator family with a **convention layer** — tax treatment, marking convention, regulatory
mechanics, an accounting-standard rule, anything where the "right" behaviour is an external convention
rather than pure arithmetic — must **cite the authoritative ACCA source verbatim (Rule 22 style) AT
STEP-0, before the engine is built.** The convention is settled by a fetched quote from the ACCA
syllabus / examiner report / technical article, pasted into the calculator as an evidence comment and
into the review pack — never ruled from memory and never "it's probably X." **Why:** batch #10's
double-tax base was ruled from memory as a withholding-only credit; it was wrong (the exam-orthodox base
is the CORPORATE differential), and the miss cost **two full regeneration cycles** (Fix Rounds 1–2) to
unwind across four drills. The evidence fetch that finally settled it — the "International project
appraisal (part 2)" technical-article quote, now Rule 22 in `international.ts` — took **five minutes**.
Five minutes at Step-0 beats two regen cycles at review. This is a **hard Step-0 gate**: a family whose
convention layer has no cited source is not ready to build. Reference implementation: the international
double-tax evidence (Rule 22) + the three-branch ruling below.

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
A scenario is a **dated snapshot, not a live feed.** Present-tense real-world MARKET claims ("current market rates/inputs", "currently yields 6%") age the instant a rate moves. Freeze every market fact as a dated scenario assumption ("at the valuation date"). Enforced by `lintFrozenMarketFacts` (`lib/acca/validate-afm-prose.ts`), folded into **GATE 4 (P4)** and run across all fields incl. the reveal. Paper-agnostic — applies to every bank.
- **NARROWED (lint ruling 2026-07-14).** Triggers ONLY on (1) "current market …" (a live market claim by construction) or (2) "**currently**" (the adverb) within proximity of a **market-qualified** term (yield / inflation / credit spread / exchange·interest·policy·market·swap·discount·coupon·benchmark rate / benchmark yield / basis points / a named reference rate / market price·level·data·input). Fictional scenario-**STATE** is legitimate exam framing and must NOT flag: bare "rate"/"benchmark" (so "utilisation rate", "sector benchmark" are fine), the adjective "current" (so "current yield level" = the evaluation point, "current duration profile"), and "currently uses ROI" / "currently at 71% utilisation". Fixture: `test-afm-prose` (must-flag + must-not-flag).
- **Live-bank sweep (done 2026-07-14):** the narrowed lint found **7 genuine hits across 5 published APM drills** (all "current market inputs/data/rates/risk-premium" in WACC-methodology drills); all additively re-frozen to "at the valuation date" and journalled per the edit-class protocol (`APM_BUILD_CONTRACT` 2026-07-14). Residual sweep = 0.

### Seeded-OFR gate hardening — distinct-factor perturbation (PATTERN, from duration 2026-07-13)
`buildOfrProof` (the generator's GATE 3) now perturbs each root by a **DISTINCT** factor (`0.85 − 0.06·index`, floored) instead of a uniform ×0.8. A dependent that is a scale-invariant **ratio** of two roots (Macaulay = Σt·PV ÷ price) recomputes to the CORRECT value under uniform scaling — the error cancels — and would wrongly verdict `correct` instead of `carried`, failing the gate. Distinct factors break the cancellation while staying well outside every tolerance; affine chains (NPV/APV/CAPM) carry exactly as before. Any future ratio-based calculator inherits the fix.
- **P5 completeness** gained a `duration` demand: a question asking for "modified/Macaulay duration" must deliver one in the answer.

### Batch discipline
One calculator → full batch → one batched adversarial review → approval flip → next calculator. **Generation never outpaces review.** Reviews are by calculator family; the **first-of-family gets FULL hostility**, siblings get spot-checks **with full recomputation of every figure**. Drills sit `status='candidate'`, `published=false` until the approval flip.

**STUDENT FRONT-DOOR WALK — PERMANENT FLIP EXIT CRITERION (from the duration-batch walk, 2026-07-14).** A batch is not "live" until a real drill has been walked **end-to-end on the actual student route** (`/acca/tutor`) — not just DB/gate checks. The walk surfaced six front-door defects that every green gate and passing fixture missed: raw-markdown scenario pane, collapsed single-`\n` contexts, a hardcoded `Ezra — APM tutor` label, APM area-name lookup on AFM, a **dark env flag** (`APM_EARNED_REVEAL` unset in prod → the earned reveal served a truncated persona refusal), and a **trap affordance** (a "View the model answer" button that appeared while the reveal was dark). Gates verify the DATA; the walk verifies what the STUDENT actually sees. Confirmation is observable in `acca_drill_messages` (per-leg `call_type`) — e.g. the first-ever `call_type=reveal` row is the reveal go-live proof.

### Bucket-B reveal-access ruling — the earned reveal IS the burn (Grant-ruled 2026-07-14)
The **reveal artifact** (the full verbatim worked answer) is the gated, paid asset; the **teaching stays free** (the 3 free teach-throughs are the taste). This instantiates the locked Bucket-B doctrine (`FUNNEL_DESIGN.md`) on the ACCA tutor. Single source of truth = `revealDecision({ wantsReveal, missCount, resolved, paid })` in `lib/acca/tutor-personas.ts`; the route (`app/api/acca/tutor/route.ts`) consumes its verdict to route `call4_reveal` vs `call_burn`:
- **SOLVED** (`resolved`) → **reveal** for FREE and PAID alike — you earned it by producing the answer.
- **STRUGGLE** (`missCount >= 2`, not solved) → PAID: **reveal**; FREE: **burn** — a figure-free diagnosis-framing wrapper (`call_burn`, which by construction NEVER receives `model_answer`, so the artifact cannot leak) + the locked conversion copy ("this is where I take you from 'sort of get it' to 'got it'") + an upgrade CTA to `/acca/subscribe`.
- **Neither** (`missCount < 2`, not solved) → the "attempt first" moat (`EARN_REDIRECT`), for free AND paid — the moat is pedagogical, not just monetization.

This is the **peak-end burn**: the free user hits it exactly when the full answer would resolve the struggle — maximum felt value, minimum resentment (the teaching that got them there was free). Backstops, not DRM: a copyright **footer** on every served reveal (`REVEAL_FOOTER`, sits in the wrapper above the verbatim tail so the byte-equality invariant holds); a **reveal-velocity alert** (`intent==='reveal'` crossing `REVEAL_VELOCITY_N=5`/24h → `notifyGrant`, best-effort — detection beats prevention: a human harvester at 3-free-per-account velocity is slow and visible); ToS naming model answers/reveals + an anti-harvest clause (`app/terms/page.tsx`). Gated behind `APM_EARNED_REVEAL` (the same flag that gates the reveal itself — a dark flag routes reveal requests to `none`, so the burn cannot fire while the reveal is dark). **Walked end-to-end on the live route 2026-07-15** (free-struggle→`reveal_burn` figure-free+CTA, free-solved→`reveal`, paid-struggle→`reveal`; `call_type` confirmed in `acca_drill_messages`; the real `call_burn` LLM body verified figure-free across runs on a figure-rich NPV/IRR drill).

**Rejected approaches — content protection (Grant-ruled 2026-07-14, do NOT revisit without new evidence).** The following were considered to protect the reveal artifact and REJECTED as user-hostile — they degrade the product for the 99% who are honest students to inconvenience the few who aren't, and each is trivially defeated:
- **Copy/print/right-click blocking** — defeated by a screenshot or the browser dev tools; punishes legitimate note-taking and accessibility tooling; screams "we don't trust you" on a product whose whole pitch is a supportive tutor.
- **Per-account watermarking of answers** — real cost to build/maintain, near-zero deterrence (a paraphrase or retype strips it), and it makes the teaching feel surveilled.
- **Partial-answer paywalls** (truncate the worked answer, "unlock the rest") — insults the paying student who earned the reveal and cheapens the artifact; the value is the COMPLETE chain of reasoning, so half an answer is worse than none.

The doctrine instead is **withhold-not-cripple**: the free user never sees a degraded artifact, they see the *teaching* (free) and a *figure-free burn* (honest about what's paid); the paying/earning user gets the complete answer, unencumbered. Abuse is handled by **detection** (velocity alert) + **record** (footer, ToS), not by DRM that taxes every honest user.

### Review-pack hygiene — full pack is always current (PERMANENT, 2026-07-13)
**After every fix round, regenerate the FULL review pack in place** — the on-disk canonical pack (e.g. `docs/reviews/AFM_BATCH_APV_REVIEW_PACK.md`) must ALWAYS reflect current DB state. Delta packs (`*_R2.md`, …) are ADDITIONAL, never a substitute. *(Origin: APV round 2 — the reviewer was handed the stale pre-round-1 pack and re-raised five already-fixed findings, wasting a review cycle.)*

**Every review pack carries a `⛔ CLOSED RULINGS — do NOT re-raise` section** in its reviewer instructions (PERMANENT, from CAPM confirm-pass 2026-07-13): list the settled house calls with one-line rationales — the OFR wording (override-log, closed), any adjudicated `lo_code` tag decisions, the APV/CAPM boundary. Reviewers then spend hostility on OPEN questions. *(Origin: OFR-softening was raised on 4 consecutive reviews; the wrong_hurdle retag twice — all already adjudicated.)*

### APV round-2 rulings (2026-07-13)
- **B3k drill dual coverage (dedca530).** `financing_compare` is tagged **B3k primary** per the Q3 design ruling — it is the batch's only B3k coverage and the question leads with the B3k "impact under alternative financing strategies" task. It ALSO exercises B3j APV mechanics (base + shield + issue costs). `acca_drills.lo_code` is single-valued and no secondary-tag column exists (adding one = migration), so the **dual coverage is journaled here, not schema-tagged**.
- **OFR wording — REJECTED softening (ruling reaffirmed).** "The error is charged once, at its source" is house wording, tied to the override log; it is NOT softened. The OFR ruling above stays **closed**.

### BSOP — spreadsheet-inputs ruling
Black-Scholes option pricing is taught **spreadsheet-inputs style** — the exam supplies the calculator (J24 Littlebredy). Marked components = the **five input identifications + interpretation**, NOT manual option maths. (Pilot #2 / E2 extension gets its own fixtures and full hostility.)

### Roadmap order (AFM Phase 1, calculator by calculator)
NPV → IRR/MIRR → APV → cost-of-capital/CAPM → duration → FCFF/valuation → **international NPV
(B5 + A6a, calc #10)** → risk & uncertainty (B1) → **then** the E2 verifier extension (enum/integer
component types) → **then** FX + interest-rate HEDGING (E2 derivatives — distinct from B5 appraisal).
B + E deep first (~45 drills toward ~101 total AFM). *(International NPV named explicitly per Step-0
ruling #6, 2026-07-17 — it is B5 project appraisal, NOT the E2 hedging item.)*

### International investment & financing rulings (calculator #10, B5 + A6a, 2026-07-17)
`lib/acca/international.ts`. COMPOSES the FCFF build (`fcffFromBuild`, `valuation.ts`) and the
discounting (`discountFactor`, `npv.ts`) ONE-WAY — no back-imports; the two shared primitives were
extracted so there is a single build/discount implementation. Grant-ruled Step-0 (8 items):
- **Parity basis = PPP for every B5 drill** (relative INFLATION — the exam-orthodox route for
  translating a multi-year project cash-flow stream). IRP (relative interest) is reserved for
  short-horizon forwards/hedging (E2) and stays engine-supported + fixture-tested only; no B5 drill
  uses it. The forward curve is **DERIVED, never asserted**: Sₜ = S₀ · ((1+r_foreign)/(1+r_home))ᵗ,
  geometric single-differential compounding. Basis is CODE-OWNED in the generator (not model-chosen).
- **Home-currency method is the taught primary** (convert-then-discount); the foreign-currency route
  reconciles by construction and is not separately graded this batch.
- **Double-tax = credit method on the CORPORATE DIFFERENTIAL (Fix Round 1, 2026-07-17 — supersedes the
  earlier withholding-only wording).** Additional home tax = **max(0, home rate − foreign CORPORATE rate)
  × taxable profit** (the PBIT base the FCFF build taxes), crediting the foreign corporate tax — its own
  per-year schema component. Withholding is a SEPARATE layer on the remitted cash; each scenario STATES
  whether the treaty makes it creditable (`wht_creditable`: if so, additional = max(0, home liability −
  foreign corp tax − WHT)). Never negative, never a refund; never exceeds the home liability. The K1 NIL
  case (foreign corporate ≥ home) is taught explicitly, not a silent zero. Evidence: Rule 22 quote (ACCA
  AFM technical article "International project appraisal (part 2)") in `international.ts`. Exemption method
  journalled as a future kind. GATE 14 validates this rule.
  - **THREE tax branches (Fix Round 2, 2026-07-17)** — the nil case has TWO causes and must be told apart
    with the TRUE inequality direction (the FR1 template printed a false "foreign ≥ home" + false max()
    for every nil): **(a) nil-by-corporate-credit** (foreign corporate ≥ home; the WHT is then a net cost,
    no residual liability to relieve) · **(b) nil-by-WHT-credit** (home > foreign corporate — a positive
    residual — but the creditable WHT covers it → nets to nil) · **(c) charged** (residual survives, shown
    per year). `taxBranch()` selects; **GATE 14b (`checkTaxProse`)** guards the code-generated prose vs the
    params — the stated branch must match `add_tax_rate_effective` + the true ordering, with no false
    inequality or false max(). A batch should aim to demonstrate all three (batch #10: K1=a, K2/K3=b, K4=c).
  - **⚠ Floor tolerance × seeded-OFR (surfaced):** the 0.2 absolute floor can swallow the GATE-3
    perturbation for a graded MONEY dependent under ~1.3 (display m) → it verdicts 'correct' not 'carried'
    → GATE 3 fails. Size drills so graded dependents are material (moderate-denomination currencies), OR
    weigh the floor value in the platform-wide floor-tolerance sweep. (Hit by an AUD/Vietnam K4 draft; fixed
    by re-pairing to AUD/Malaysia.)
- **Remittance blocking (K3):** blocked funds reinvested at a STATED local rate (never derived),
  released + converted at the terminal-year forecast spot; code owns the NPV and the cost-of-blocking
  delta vs free remittance. B5c (strategies for restricted remittance) rides as discursive dual
  coverage on the B5b remittance kind (single-tag `lo_code`, journalled — APV/B3k precedent).
- **A6a (K4) multinational dividend capacity** reuses `computeDividendCapacity` (batch #9) for the
  subsidiary FCFE. `parent_fcfe` is graded as a ROOT so the seeded-OFR proof carries even when the
  parent contribution dominates group capacity. **HARD RULE (Grant):** A6a is a Section-A LO —
  **direct-link-only serve, EXCLUDED from all B-tier / coverage counts and every public claim until
  Section A surfaces.**
- **THREE NEW GATES** (`validate-schema.ts`, run for international-family drills only):
  **GATE 12 parity-consistency** (every forecast spot reconciles to the drill's STATED basis — not a
  hard-coded formula), **GATE 13 currency/unit-scale integrity** (home × spot = foreign, consistent
  scale — the IDR-rendering failure class), **GATE 14 double-tax cap** (additional home tax = the
  credit-method residual on the corporate differential; ≥ 0; ≤ home liability — Fix Round 1). Plus a new
  **`floor` tolerance kind** (max rel%, abs floor) for money components. All existing gates + pattern
  gates (distinct-factor OFR, figure-integrity 1/2/3 dp, P4 frozen-market-facts, P5, P6) apply unchanged.
- **Decision-relevance is a generation quality bar, not a gate** (APV/CAPM precedent): `draft` runs
  best-of-4 with a per-kind penalty (K1/K3 → accept; K2 → base-accept + alt-reject flip; K4 →
  decisive surplus + material subsidiary share) and ships the least-bad. Numbers stay code-owned.

### Risk & uncertainty rulings (calculator #3, B1a iv/v/vi + B1b ii — Step-0 evidence VERIFIED 2026-07-18)
Convention layer FETCHED and page-verified against official ACCA answers/reports (CONVENTIONS ARE
FETCHED, NOT REMEMBERED). Evidence + verbatim quotes + citations: `docs/evidence/AFM_RISK_EVIDENCE.md`
(source PDFs git-ignored, re-fetchable via `docs/evidence/fetch_acca_sources.ps1`). Every convention
below carries its S-id; the engine's code comments must cite the S-id + PDF page + accaglobal URL
(international Rule 22 style). All seven claims verified on their stated page — zero memory substitution.
- **Variable sensitivity % = 100 × NPV ÷ PV of the affected post-tax cash-flow stream** (the variable's
  own PV base, after relevant tax). Evidence **S3** (F9 J16 examiner report, p2, verbatim "Sensitivity =
  100 x NPV/ PV of project variable") + **S4** (FM SD23 examiner report, pp13–14). This is the SAME
  convention already shipped in `npv.ts` (batch #1) — now CITED, no longer house-remembered.
- **Discount-rate sensitivity % = (IRR − r) ÷ r × 100** (r = original discount rate). The bare `IRR − r`
  is **headroom** in percentage points, and must NEVER be labelled sensitivity — ACCA marks that error
  down explicitly. Evidence **S4** (verbatim "= (7.4 / 11) x 100%" + the examiner warning that the bare
  difference "was sometimes shown incorrectly as the discount rate sensitivity itself").
- **Project duration = Σ(t × PVₜ) ÷ ΣPVₜ** (PV-weighted average time). Evidence **S1** (P4 SD16 answers,
  p5, "2·78 years") + **S2** (AFM SD19 answers, p4, "173,254,000/57,005,000 = 3·04 years"). This is a
  DIFFERENT application from `duration.ts` (that is bond Macaulay/modified) — new engine logic.
- **RADR = a project-specific rate from a proxy asset beta, ungeared then regeared** to the investing
  company's financial risk (CAPM), applied as the discount rate to the project's relevant cash flows.
  Evidence **S5** (AFM MJ19 answers, pp2–3) + **S6** (FM MJ18 answers, pp3–4, verbatim ungear/regear).
  **Composes `capm.ts` ONE-WAY** (that engine already owns MM ungear/regear) — no re-implementation.
- **ENPV = Σ(pᵢ × NPVᵢ)** (probability-weighted; joint probabilities when independent variables combine).
  Evidence **S6** (FM MJ18 ENPV table + negative-NPV probability) + **S7** (F9 J15 answers, p6). ENPV is
  a repeated-game mean — **for a one-shot project the per-state NPVs and P(negative NPV) carry the
  decision** (S7 verbatim: "as the project is not being repeated, the NPVs associated with each future
  economic state must be calculated"). That caveat is the family's core L3 scepticism texture.
- **VaR** stays covered by the existing technical-article citation ("The risks of uncertainty"): one-tail
  z = 1.65 (95%) / 2.33 (99%); σ scales √T; project VaR scales annual σ by √N. Not re-fetched (already cited).

### Narrative-marking rulings (pipeline #2, B narrative cluster D1–D5, 2026-07-20)
The second pipeline marks **discursive** drills against an authored rubric. Canonical design +
claim ceiling: `docs/NARRATIVE_MARKING_DESIGN.md`; detection targets (F1–F12, page-VERIFIED):
`docs/evidence/AFM_NARRATIVE_EVIDENCE.md` §1b; marker + gates: `lib/acca/narrative-marker.ts`; the
constrained model grader: `lib/acca/narrative-grader.ts`; generator wiring: `--narrative-batch` in
`scripts/generate-afm-drills.ts`.
- **CLAIM CEILING binds every surface (Grant 2026-07-18).** Narrative marking is *constrained-model
  marking with a code-owned rubric + code-owned aggregation + deterministic copy/anchor/coverage
  checks + Rule-23 consistency*. The per-criterion QUALITY verdict (developed? applied?) is
  MODEL-graded under constraint — **NEVER write "code owns the marks" for narrative** (that claim is
  the calculators' alone). The honest verb is *structured / consistency-checked*.
- **OFR analog = graduated per-criterion partial credit, code-owned (ruling 2).** There is no figure
  to carry; the analog is **0 / ½ / full per criterion** (`aggregate()` owns the met→marks mapping,
  the F1 hard-zero, and the disqualifier ½-cap). An **F9 (own-figure) criterion is required ONLY where
  the scenario actually gives the student data to use** in the discussion — its anchor is the ACCA
  examiner statement of the rule verbatim (**J24 p.14**, AFM_NARRATIVE_EVIDENCE.md §1b F9: *"…using
  their own calculations… as long as their recommendation is consistent with their own workings"*).
  A pure-conceptual drill with no supplied data carries no F9 criterion.
- **CONCEPTUAL-ONLY — a narrative drill NEVER computes (overlap ruling, Grant 2026-07-20).** The
  narrative cluster interprets / evaluates / discusses a **GIVEN** output; it never runs a calculation
  that a calculator family already owns. Two explicit boundaries: **D1 (Monte Carlo, B1b) interprets a
  GIVEN simulation output** (mean/σ/P(loss)/VaR figures printed in the scenario) — it does **NOT**
  compute VaR, which is calculator #3's `risk_measures` kind. **D5 (exchange controls, B5c/d)
  evaluates restricted-remittance strategy CONCEPTUALLY** — it does **NOT** compute the blocked-funds
  NPV, which is calculator #10's K3. Any figure a narrative scenario shows is a **GIVEN driver** (free
  to restate, never a leak — the GIVEN-vs-COMPUTED distinction from the red-team ruling); the drill has
  no code-derived figure at all.
- **F12 (required output format ignored) is documented but UNWIRED in v1.** Added to the F-catalogue
  from SD24 p.7 (page-verified); a rubric criterion keys it only when a drill's requirement names an
  output format (report/memo to a named board). Most narrative drills impose no format, so F12 stays
  detected-but-off pending a format-criterion ruling. See NARRATIVE_MARKING_DESIGN.md CLOSED RULINGS.
- **Provenance gate (STILL BINDING).** §1b evidence is now page-VERIFIED (2026-07-20), but **no
  coverage / tier-complete / ads claim on narrative until the pipeline is WALKED** (design §7). v1 is
  authoring-time only — the marker is a gate, live per-student marking is Horizon-2.

---

*New rulings: append here when a session bank adjudicates one; note the source bank date. The full journal-lesson-vs-rulebook reconciliation is banked as an idle-session sweep.*

### Tutor red-team battery — standing regression + weekly production judge (2026-07-15)
The conversational tutor (`/api/acca/tutor`, all papers) has an adversarial regression suite: `scripts/redteam-probes.ts` (45-probe matrix × 14 classes — concept/invented-figures, wrong-drill, partial, gibberish, answer-extraction incl. "verify this: <pasted answer>", prompt-injection, regurgitation, right/wrong-method, currency-scale, hint-fishing, emotional, persona-boundary, free-cap/burn edges, long-conversation drift), `scripts/redteam-tutor.ts` (driver — minted free/paid sessions, real route, machine auto-checks: figure-leak / invented-range / cutoff / CTA / call_type / unearned-reveal), `scripts/redteam-judge.ts` (reviewer-model pass → FLAGGED-ONLY). **STANDING RULES:** (1) **re-run the battery after ANY tutor prompt / persona / leg change** — it is a regression gate, not a one-off; (2) **run the judge's `--prod-sample` weekly over `acca_drill_messages`** — real student behaviour is the probe source no manufactured matrix invents (the matrix is the floor, production is the well). Prod firing is guarded (`--target prod --yes-production`); default target is local. Cost ≈ USD 2–6 per full prod run (haiku-heavy).

**RULING — the DETERMINISTIC auto-scan is the authoritative regression signal; the LLM judge is an advisory candidate-surfacer, not a metric (2026-07-16).** The sonnet judge is nondeterministic run-to-run (the same transcripts + rubric flagged 16 then 15 with a shifted composition) and persistently miscodes legitimate GIVEN-driver restatement as a leak no matter how emphatic the rubric. So: read the auto-scan + the target transcripts directly to decide pass/fail; treat the judge's flag list as leads to verify, never a raw count to compare. **GIVEN-vs-COMPUTED is the load-bearing distinction:** a figure the scenario PRINTS for the student (drivers, and any aggregate it states as "supplied to the model") may be restated freely — the student already sees it — and is NEVER a leak; only a figure the CODE derives (intermediate / answer / verdict / intrinsic floor) is withheld, and confirming/validating a *guess* at one (even its magnitude — "right ballpark") leaks too. The auto-scan encodes this structurally: `computedLeakForms` reads COMPUTED = schema components with a `recompute` step (given = the rest), so it never flags a given driver. The judge is fed the seeded session-state (account + miss-count) so it stops flagging EARNED reveals (paid + ≥2 misses, or resolved) as unearned when the misses were seeded and not shown.
