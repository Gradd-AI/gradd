# GENERATOR_DOCTRINE.md

**Canonical home for the drill-generation doctrine and every standing ruling generation must obey.** Extracted from the `APM_BUILD_CONTRACT.md` journal so the rules live in one place; the journal keeps the narrative, this keeps the law. When a new ruling is adjudicated in a session bank, add it here.

Companions: `AFM_NUMERIC_VERIFICATION_DESIGN.md` (the numeric layer's full design), `TEACHING_ARCHITECTURE.md` (structural withholding), and the code — `scripts/generate-acca-drills.ts` (generator), `lib/acca/{npv,numeric-verifier,validate-schema,validate-afm-prose}.ts` (calculator + gates).

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
- **P-G3** — a check's *failure path* must be proven (a branch that has never run is untested).
  Corollary **P-G3(a)** — a render assertion must strip what the markup carries (inlined CSS
  matches every class name), and every negative suite needs a POSITIVE CONTROL.
- **P-G5** — a check's *arming* must be automatic (a fixture nobody runs is not a guard).
  Corollary **P-G5(a)** — a flaky fixture is moved to `EXCLUDED` with a reason and an owner the
  SAME DAY; never worked around, commented out in place, or made to pass by loosening it.
- **P-G6** — a check's *input* must be the shape production builds (a fixture that constructs an
  input production never produces tests a function that is never called).

P-DB5 governs the numerator's meaning, P-G2 the denominator's extent, P-G1 the honesty of the
individual result, P-G6 the fidelity of the input. A report that satisfies one and not the
others is still misleading.

## P-G3 — A CHECK THAT HAS NEVER FAILED IS AN UNTESTED BRANCH (ruled 2026-07-29)

**Observing a gate pass on real data proves the PASS path. It proves nothing about the FAIL path**
— and the fail path is the only reason the gate exists. A check whose failure branch has never
executed is untested code that everyone downstream is trusting.

**The operational rule.** Every gate, fence and scan must prove its own failure path:
1. **The assertion logic is a PURE function** over the rows/values, separated from the I/O that
   fetches them. A check that can only run against the live DB cannot be shown to fail without
   corrupting live data — which is why the separation is the rule and not a style preference.
2. **A `--selftest` mode** feeds that pure function SYNTHETIC break modes and asserts each one
   produces a failure, plus the known-good set producing none. No DB, no writes.
3. **Enumerate the break modes deliberately**, including the boring ones: absent value, null,
   empty string, short read, **empty result set** (an empty set must never read as "all fine" —
   that is the P-G1 failure with a different mask), and *drift* (a present-but-wrong value, which
   is worse than an absent one because it is believed).

**Reference implementation: `scripts/test-afm-label-marks.ts`.** Pure `evaluate(rows, …)`; live path
and `--selftest` share it; **7 break modes** — label tidied to `"(i) B3e"`, marks removed, marks
disagreeing with the column, empty label, null label, short read, empty result set — plus the real
label set passing. Written that way because the fence guards a CONTENT edit: it could not otherwise
be shown to fire without re-authoring a live requirement label to break it.

**This is the same family as P-G1 and P-G2** — all three are ways an instrument reports success
while proving less than it claims. P-G1: it cannot evaluate and says nothing. P-G2: it evaluated
less than the population and did not say so. **P-G3: its failure branch has never run at all.**

### P-G3(a) — A RENDER ASSERTION MUST BE ISOLATED FROM WHAT THE MARKUP CARRIES (ruled 2026-08-03)

**Same family, one layer out: the detector runs, the branch executes, and it still proves nothing
— because it is matching against the wrong text.**

**The sighting.** `components/landing/ProductLandingPage.tsx` inlines its entire stylesheet in a
`<style>` block. A suite proving that an OMITTED section renders nothing did the obvious thing:

```ts
ok('MINIMAL renders no tier grid', !html.includes('plp-tier-grid'));   // ← always false
```

**Every class name the template knows appears in the markup whether or not the section rendered**,
because the CSS naming those classes is part of the output. `plp-tier-grid`, `plp-faq-list`,
`plp-totop` — all present in a config that renders none of them. The assertion would have been
green while asserting the opposite of the truth. Caught only because the probe printed the
substring hits alongside the length and the numbers did not make sense.

**The rule.** Before asserting on rendered markup, **strip everything the markup carries that is
not the markup**: `<style>`, `<script>`, inlined JSON, and any serialised props blob. Assert
against the body, not the document.

```ts
const bodyOf = (cfg) => renderToStaticMarkup(...).replace(/<style[\s\S]*?<\/style>/g, '');
```

**⚠️ AND ALWAYS INCLUDE A POSITIVE CONTROL — this half matters more.** A suite made entirely of
negative assertions (`!html.includes(...)`) passes **trivially and completely** against a
component that rendered nothing at all: an empty string satisfies every one of them. A broken
import, a thrown-and-swallowed error, a guard that accidentally wraps the whole page — all report
as a clean sweep.

So every negative suite must assert, in the same run, that the thing **is** rendering:

```ts
ok('MINIMAL still renders the REQUIRED sections',
  html.includes('plp-hero') && html.includes('plp-price-card') && html.includes(cfg.headline));
```

**Generalises past rendering.** Any absence check needs a presence check beside it, or it cannot
distinguish "correctly absent" from "nothing happened". It is the same defect as an empty result
set reading as "all fine" (P-G1), and the same as a detector whose own detection was never
exercised — `isTaxonomyFree` is asserted against a known-bad string for exactly this reason, and
the bundle-claim regex in `scripts/test-product-landing.ts` is asserted against both retired
strings. **A detector that matches nothing passes every test you give it.**

## P-G4 — NEVER `process.exit()` IN A DB-TOUCHING SCRIPT (ruled 2026-07-29)

**Set `process.exitCode` and let the process end naturally.** Calling `process.exit()` while a
Supabase client still holds an open handle trips a libuv assertion on Windows
(`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c`) and **replaces the
script's exit code with a crash code**.

**Measured 2026-07-29.** The first version of `scripts/test-afm-label-marks.ts` ended with
`process.exit(0)` on a run where **all 27 checks passed** — and the shell saw **`-1073740791`**. A
gate, CI step or wrapper reading that exit code would have acted on a **false red**: the check
succeeded and reported catastrophic failure.

**Why this is doctrine and not a footnote.** It inverts the meaning of the one signal an automated
caller reads. It fires only on the *success* path (a failing run often exits before the client is
idle), so it is exactly the shape that survives testing and breaks in the pipeline. And the fix is
free: `main().then((failures) => { process.exitCode = failures === 0 ? 0 : 1 })`.

Applies to every `scripts/*.ts` that constructs a Supabase client — checks, scans, patches and
one-off authoring scripts alike.

## P-G5 — A FIXTURE ARMED ONLY BY SOMEONE REMEMBERING TO RUN IT IS NOT A GUARD (ruled 2026-08-05)

P-G1/G2/G3 govern whether a check *means* what it reports. P-G5 governs whether it ever *runs*.
A check that is correct, scoped, failure-path-proven and never executed contributes nothing, and
is worse than no check at all — because the file's existence is read, by the next person, as
coverage.

**Measured 2026-08-05, and the number is the whole ruling: 44 of 44 `test:*` scripts were
reachable from NO automatic path.** Verified exhaustively, not sampled — no `.github/`
workflows, no `.husky/`, no non-sample `.git/hooks`, no `test`/`pretest`/`prebuild`/
`postinstall`/`prepare` npm lifecycle script, no `buildCommand` override in `vercel.json`
(only crons and one `maxDuration`), no fixture spawning another, and no hooks in
`.claude/settings.local.json`. `next build` never executes anything under `scripts/`. Every one
of those 44 suites — including `test:risk` (94 checks), `test:irhedge` (94), `test:fxhedge` (68)
and the MUST-FAIL formula regressions locked in after FX/IR Fix Round 1 — was armed by nothing
but a human choosing to type the command.

**What it cost, concretely.** Both landing-page SHA-256 pins (AFM and APM) broke in `5afef1d`,
a commit that touched **neither config** — it changed one href in the SHARED nav of
`ProductLandingPage.tsx` (`/acca` → `/`, −4 bytes on every landing body) on a branch about
root-identity links, where running a landing fixture would have looked irrelevant. `main` then
carried **two failing pins for a day** while every session honestly reported green, because
green meant `next build`, and `next build` cannot see a fixture. The staleness surfaced only by
accident, during unrelated work, and was refreshed without diagnosis — a pin that goes stale
silently is worse than no pin, since its entire purpose is that the thing cannot change without
someone noticing.

**The rule.** A check intended as a guard must be reachable from a path that runs whether or not
anyone remembers it. Attach it to a gate the project already obeys rather than inventing a second
discipline: here, `prebuild` → `npm run test:contracts`, hanging off the standing rule that
`next build` must be green before any push to `main`. Prefer a committed mechanism
(`package.json`) over an uncommitted one (`.git/hooks`), which silently protects only the machine
it was installed on — this repo is cloned on two.

**DISCOVER, DO NOT LIST.** `scripts/run-contracts.ts` globs `scripts/test-*.ts` and runs
everything it finds; keeping a fixture out requires an `EXCLUDED` entry **with a reason**. An
explicit include-list would reproduce the original failure the first time someone writes a
fixture and forgets to register it. Fail safe: new fixtures are armed by default.

**SCOPE IT, AND THAT IS NOT TIMIDITY.** Only fixtures that need no DB, no env and no model call
belong in a deploy gate. A gate that blocks deploys for reasons unrelated to the change being
deployed teaches people to bypass it, and a bypassed gate is P-G5 again with extra steps. Two
fixtures are excluded on this ground (`test-exam-questions`, `test-sit-timing`; both need a live
database) and both are named in the runner's own output on every run, including every Vercel
build log — the exclusion is advertised, never silent.

**PURITY IS ESTABLISHED BY RUNNING, NOT BY READING — and this is not a nicety.** All 48 fixture
files were run twice: once in a clean `git worktree` with no `.env.local` and every secret-shaped
variable scrubbed from the environment, and again with `.env.local` fully loaded (what Vercel's
build environment actually looks like). **46 passed identically in both directions; 2 failed
without a database.** A grep for `process.env`/`supabase`/`Anthropic` had flagged **six** as
impure and **was wrong on four of them** — they use mock clients, or set a dummy key that is
never used to make a request, or (`test-notify`) delete the keys themselves and assert the
unset-config branch. Trusting the grep would have left four real guards outside the gate. Both
directions must be checked: passing *without* env is not sufficient evidence if the fixture
behaves differently *with* env, because Vercel has env.

**INVISIBLE IS WORSE THAN UNARMED.** Four fixtures had no npm script at all
(`test-afm-prose`, `test-apm-framework`, `test-ib-bm-framework`, `test-exam-questions`) — they
could not be run by remembering a command, only by knowing a file path. All four were given npm
scripts; the three pure ones now run in the gate. When auditing coverage, enumerate the FILES,
never the script list — the script list cannot show you what it omits.

**Cost, measured.** The gate runs 46 fixtures in **2.3s** wall clock at concurrency 8 (slowest
single fixture 891ms), against a `next build` whose own run-to-run variance on the same machine
spans 12.9s–22.2s. The gate is inside the noise. Report this number whenever the gate grows: a
slow build gets bypassed, and a bypassed gate guards nothing.

### P-G5(a) — A FLAKY FIXTURE IS EXCLUDED THE SAME DAY, NEVER WORKED AROUND (ruled 2026-08-05, Grant)

`scripts/run-contracts.ts` now sits between **every build and every deploy**. That is the point of
it, and it is also its one real hazard: a fixture that fails intermittently stops production, and
the predictable human response to a red gate blocking an urgent deploy is a WORKAROUND rather than
a fix. Every workaround returns the repo to the exact state P-G5 exists to end — a check that no
longer runs, or no longer means anything, while everyone still reads its presence as coverage.

**The rule.** A fixture that fails intermittently is **moved to `EXCLUDED` with a stated reason and
a named owner, the same day it is noticed.** Not next session, not after one more look.

It is **never**:
- worked around at the call site, or bypassed with a flag, or a build run some other way;
- commented out in place — a commented assertion is invisible to `EXCLUDED`, prints in no build
  log, and is precisely the silent non-coverage this doctrine was written about;
- made to pass by LOOSENING its assertion. Widening a tolerance, deleting the failing case or
  weakening a matcher converts a red gate into a green one that guards less, which is worse than
  the red — the red was at least telling the truth.

**Using `EXCLUDED` is the CORRECT behaviour, not an admission.** It is a visible, reviewed,
reasoned act: the entry states why, the runner prints the exclusion in every build log including
Vercel's, and the named owner carries the debt. An excluded fixture is a known gap being tracked.
A worked-around fixture is an unknown gap being hidden, and there is no version of the second that
is better than the first.

**Why the same day.** A flaky gate is only tolerated for as long as it takes someone to learn a
workaround. Once learned, the workaround outlives the flake and generalises to the next red gate —
including the true ones. The window in which excluding is cheap is the window before anybody has
had to ship around it.

### P-G5(b) — A GREEN CONTRACT GATE DOES NOT MEAN THE TREE COMPILES (ruled 2026-08-21)

**`npm run verify` (`scripts/verify.ts`) = `tsc --noEmit` THEN the contract gate, in that order,
because they answer DIFFERENT QUESTIONS — does the tree COMPILE, and do the FIXTURES pass. Wired to
`prebuild`, so it runs on every build.**

**The gap, found by shipping a broken deploy.** `certainty-lint.ts` was written with
`locator = field`, which TypeScript infers as `CertaintyField` rather than `string`, so
`lintDrillCertainty` passing a criterion id (`c1`) does not compile. It reached `origin` and killed
the preview build at the type-check stage. **Nothing in the local loop could have caught it:** `tsx`
does not typecheck (it strips types), and the contract gate runs FIXTURES, not `tsc`. Both were
green. `next build` typechecks `lib/`, and that is where it surfaced — on Vercel.

📐 **DEMONSTRATED, NOT ASSERTED.** The exact shipped bug was re-introduced and both paths run
against the same tree:

| on the identical broken tree | result |
|---|---|
| `npm run test:contracts` | **PASS contract gate: 62/62** ← the false green |
| `npm run verify` | `error TS2345`, **exit 2** |

⚠️ **THIS IS THE SESSION'S FALSE-GREEN SHAPE, AND IT IS THE WORST INSTANCE OF IT** — worse than an
n/a gate counted as pass (P-G5's `applicable:false`), worse than an N6a share read as coverage —
because it lives **in the loop rather than in a test**. Every other false green in this catalogue is
a check reporting more confidence than it earned. This one is a check reporting on a *different
question than the one being asked*: "do the fixtures pass" answered where "does this compile" was
meant. A person reading `62/62` is not being misled about the fixtures; they are being misled about
what the fixtures were ever about.

**IT IS ARMED, NOT MERELY AVAILABLE (Grant-ruled 2026-08-21).** `prebuild: npm run verify`, so it
runs on every build rather than on memory. The duplicate-work objection is handled by the runner
(`scripts/verify.ts`) rather than by declining to wire it: **the typecheck half is SKIPPED when
`VERCEL` is set**, because `next build` typechecks there anyway — which is MEASURED, not assumed
(*"Failed to type check."* is the literal deploy log that caught the original error). The gate half
always runs. Locally nothing is skipped, so `npm run build` now fails in ~2s on a type error instead
of after a full compile.

📐 **ALL THREE BRANCHES PROVEN (P-G3), not just the happy one:**

| branch | result |
|---|---|
| `VERCEL` set, clean tree | typecheck SKIPPED, gate runs, `PASS verify — 1 step` |
| broken tree, local | `error TS2345`, **exit 1**, short-circuits — the gate never runs |
| **broken tree, `VERCEL` set** | **`verify` goes GREEN** |

⚠️ **THAT THIRD ROW IS A CONDITIONAL FALSE GREEN AND IT IS WRITTEN DOWN RATHER THAN GLOSSED.** On
Vercel, `verify` passes a tree that does not compile. It is safe ONLY because a LATER step catches
it, and if `next build` ever stopped typechecking — a `typescript.ignoreBuildErrors` in
`next.config`, a framework change — this skip would silently become the hole it was designed around.
The skip's safety is a **dependency on another step**, not a property of `verify`.

⚠️ **AND IT STILL DOES NOT GUARD A PUSH.** Nothing in this repo runs on `git push` — no hooks, no
husky. `prebuild` arms it on every BUILD. The guarantee that a broken tree cannot SHIP green remains
Vercel's own typecheck, which already existed and already worked. So P-G5's "armed only by memory"
objection is **reduced, not eliminated**; a pre-push hook is the only thing that would eliminate it.

## P-G6 — A FIXTURE'S INPUT MUST BE THE SHAPE PRODUCTION BUILDS (ruled 2026-08-09)

P-G5 governs whether a check *runs*. P-G6 governs whether what it runs *on* is real. A fixture
can be correct, scoped, failure-path-proven and automatically armed, and still guard nothing —
because the input it hand-constructs is not the input the code receives in production. It is
then testing a function that is never called with that argument.

**What it cost, concretely.** `judgeCaseMarking` has always had a blank-answer guard that
returns 0 with no model call, and `test-case-marking-technical` asserted it — passing `''`,
`'   '` and `'-'` as `wholeAnswer`. Every one of those is a string production never builds.
`lib/acca/case-mark-run.ts` assembles `wholeAnswer` as `${label}\n${answer}` per requirement, so
a sit with every box empty still carries the requirement labels: 22–46 alphanumerics on the
three AFM Mock Paper 1 cases, against `isBlankAnswer`'s 3-character threshold. The guard could
therefore never fire on a real paper. The model was handed a "candidate's whole answer"
consisting only of requirement headings, and — the PS ladder having no band below `weak` (25%)
— banded it `weak` across the board. **A completely blank AFM sit scored 5/20 on professional
skills**, against a correctly-computed technical 0/80, with the fixture green throughout.

The fixture was not weak on any axis P-G1/G2/G3/G5 measures. It ran, in the gate, and its
assertion was true. It asserted a true thing about an input that does not occur.

**The tell, and it generalises.** The fixture built its input with a *literal*; production built
it with an *assembler*. Wherever those differ, the fixture is describing a shape the author
imagined rather than the one the code meets. The same asymmetry is visible inside the same
module and is what makes it diagnosable: the TECHNICAL pass tests `isBlankAnswer(r.final_answer)`
— the raw stored field, uncontaminated — and correctly banded that blank sit `nothing` on all 8
requirements. Same predicate, same paper, different input purity, opposite verdicts.

**The rule.** A fixture asserting behaviour on an assembled input must build that input with the
SAME assembler production uses, or with a literal copied from a captured production value — never
with a hand-written approximation of it. Where the assembler is not importable, paste real stored
data (the AFM labels are now pasted verbatim into the fixture) and say in a comment where it came
from. When a guard exists to catch a degenerate case, the fixture must feed it the degenerate case
*as production would present it*, which is rarely the empty string.

**Corollary P-G6(a) — a fix is not proven by the fixture that missed it.** The fixture that
stayed green is evidence about the fixture, not about the code. Prove the fix against the real
assembled shape (here: capture the serialized model-call payload before and after, and diff),
then repair the fixture so it would have caught it. Both, in that order.

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

## P-M2 — THE MARKING BASELINE IS NOT GROUND TRUTH (ruled 2026-08-01, Grant)

**The recorded baseline is a 10-run MODAL READING of the pre-register marker. It has never been
validated against a human marker, an ACCA published mark scheme, or any external standard.**

P-M1 requires a band matrix against the baseline, and that requirement stands — it is how a marking
change is *detected*. What P-M1 did not say, and what three rounds of `fix/marker-feedback-register`
got wrong, is what the matrix **means**. All three rounds treated the baseline as the correct answer
and tuned toward it. That is a method error, not merely a bad outcome: **a prompt change that moves
a cell off an unvalidated baseline has not been shown to be wrong, only to be different.** The
baseline could as easily have been under-marking.

**The rule.** A band matrix against the baseline is EVIDENCE OF CHANGE, never evidence of error.
**Do not re-litigate a marking change against the baseline without an external referee.** Any round
that proposes to "restore" a baseline cell must first name the referee — a human marker, a published
ACCA mark scheme, a worked example with a stated mark — that establishes the baseline cell was right.
Absent a referee, the decision is a judgement call about product behaviour, and it is Grant's, not a
measurement.

**Corollary — what a matrix IS still good for.** Cells that hold across every round are the load-
bearing ones: mock B2(i) `competent/6` held **10/10 in all three rounds**, which is what licensed
shipping a change that moved two other cells. **Error detection holding is the bar; exact agreement
with an unvalidated baseline is not.**

## P-M3 — A MARKER'S COMPARISON DECIDES THE BAND; FENCE IT STRUCTURALLY (ruled 2026-08-01)

**Measured finding, two independent degradations.** `judgeTechnicalOnce` is given the code-correct
`model_answer` as a reference. Two attempts to stop the marker citing that reference in
student-facing prose worked by DEGRADING it in the prompt — round 1 retitled it "Correct treatment",
round 2 stripped its name entirely and forbade the word "matches". **Both cleaned up the prose and
both moved bands in the same direction: more generous.** A(iv) `strong` 9/10 → `exemplary` 7/10;
A(iii) `strong` 7/10 → `exemplary` 9/10.

**So the marker uses the comparison to DECIDE the band, not merely to explain it.** "Matches the
marking standard in full" is a harder claim to make than "this looks right", and taking the standard
away removes the harder claim.

**The rule.** Where a model both judges against a reference AND writes something a user reads, do
not weaken the reference to protect the user — **separate the fields and drop the private one where
model output becomes the result.** The marker now writes `judgement` first (private, names the
standard, compares freely, decides the band), then `band`, then `feedback` (derived, class-banned).
`judgement` is dropped in `judgeTechnicalMarking` at the single line where the model's array becomes
`bandById`, and `PerRequirementMark` has no field it could travel in — so there is no path to
`acca_case_progress.technical_feedback` for it to leak along. **Structural beats instructed**, the
same discipline as the withhold engine (`docs/TEACHING_ARCHITECTURE.md`).

**Corollary.** A missing `judgement` is a PARSE FAILURE, not a tolerated omission. A band reached
without the comparison written down is exactly the ungrounded band the split exists to prevent.

**Corollary — this did NOT restore the drifting cells.** Round 3 kept them where round 2 left them.
Restoring the comparative words was necessary-looking and insufficient; the likeliest remaining cause
is the "compare in full, quote both figures" instruction inviting a completeness check rather than a
quality judgement. Recorded as open, not blocking, under P-M2 — it needs a referee, not another round.

## P-M4 — A LEAKED REFERENT IS FIXED BY REMOVING THE MODEL'S NEED FOR THE WORD, NEVER BY FORBIDDING IT (ruled 2026-08-13)

**The instance.** ~1 in 10 PS feedback strings named *"the descriptor"* to the candidate — a
document they have never seen. Rule 2 **already** forbade it, in capitals, as an explicit CLASS ban,
*"HOWEVER NAMED"*. It was losing at 12.9%.

**Why it was losing.** The ban sat UNDER the thing that created the need. FIVE of the prompt's NINE
`descriptor` mentions were the BAND DEFINITIONS — *"meets the descriptor in full"*, *"meets the
descriptor well"*, *"broadly meets the descriptor"*, *"falls short of the descriptor"*, and the
lead-in framing all four. Rule 4 demands *"no band without a named reason"*, so the model warranted
the band by restating the band's own definition — and the definition names the referent. Every
observed leak was one construction: *"[their evidence] is exactly what the descriptor requires"*.
**No wording of a downstream rule can outrun the definitions above it.**

**MEASURED, THREE ARMS × 264 PAIRED SKILL-CELLS, interleaved on identical content:**

| arm | band shift vs control | leak | exemplary | strong |
|---|---|---|---|---|
| control (ban only) | — | 12.9% | 19% | 8% |
| **band definitions rewritten** | +0.019 bands (t=0.66) | **6.4%** (z = 2.50) | 13% | 2% |
| definitions + restated rule 2 + carve-out | −0.030 bands (t=−1.13) | **25.4%** (z = −3.65) | 25% | 26% |

**The rule.** When a model leaks a referent into user-facing prose, find WHERE THE PROMPT MAKES IT
NEED THE WORD and remove that need. Adding any instruction — a ban, a restatement, a carve-out —
that itself names the referent **raises** the rate, because it primes what it discusses.

**TWO INDEPENDENT FAILURES ARE THE EVIDENCE, both on the same day, both the same shape:**
- **The judgement/feedback split** (P-M3's fix, ported here): took `descriptor` from 9 → 22
  mentions and **roughly doubled the leak, 8.7% → 18.5%**, while moving bands harsher (`competent`
  7/92 → 17/92). Dropped.
- **The P-T2 half** (rule 2 restated + an `exemplary` carve-out on rule 4): **z = −3.65, twice the
  control**. It did not even fix the band it was written for — exemplary **19% → 25%**, worse than
  doing nothing.

**Relation to P-T2.** P-T2 says change the instruction, do not add a prohibition. This is the case
P-T2 does not reach: **here the instruction that had to change was not in the rules at all — it was
in the DEFINITIONS the rules operate on.** A restatement is still an addition when the thing
creating the demand sits above it, and P-T2's own remedy measured WORSE than the control. Read the
two together: remove the demand, and check where the demand actually lives before rewriting the
rule that merely inherits it.

**Relation to P-M3, which still stands for its own case.** P-M3's field split works when the
reference has CONCRETE RESIDUE that survives the rewrite: *"the standard requires WACC 9.59%; the
candidate got 9.59%"* → *"your WACC of 9.59% is correct"* — content survives, referent drops. **A
descriptor has no such residue**: its content IS abstract behavioural criteria, so nothing is left
to state once the referent goes. Do not port a fix across on the strength of a matching SYMPTOM;
check that the thing being fenced is the same KIND of thing.

**Corollary — preserve every severity anchor verbatim when rewriting a band ladder.** A band shift
outranks the prose (P-M2, P-M3). The rewrite moved only the OBJECT of the comparison ("meets the
descriptor" → "demonstrates the skill") and kept *"nothing material to fault"*, *"only minor and
immaterial gaps"*, *"a material weakness in depth, register or format"*, *"superficial, poorly
communicated"* and *"There IS writing to judge here; it is not good enough"* word for word. Result:
78% of cells identical, one (case, skill) pair moved ≥0.34 of a band. The attempt that did not
preserve them moved bands and was dropped.

**Corollary — fence the OUTPUT, never the INPUT.** The descriptor block, its `(the standard)`
header and all three instructions to judge against it are UNTOUCHED. Degrading the reference moved
bands twice on the technical pass (P-M3) and is settled.

**Corollary — a calibration arm must drive the production core, not a copy of it.** The first round
transcribed the shipped prompt into its harness to get a control, putting a hand copy of the one
string the measurement is about at the centre of the measurement. The prompt is now a pure builder
(`buildPsSystemPrompt(paper, variant)`) taking a `promptVariant`, with the historical control pinned
BYTE-IDENTICAL by fixture, so the refactor cannot silently reword the live prompt.

## P-T1 — A FACT THREADED TO A CALL THAT DOES NOT SPEAK IS NOT A FIX (ruled 2026-08-01)

**The instance, measured.** The tutor was affirming the inverse rule on a seeded wrong-direction
answer — "a borrower hedges rising rates by BUYING futures", when a borrower sells — in **4 of 20**
fresh turns. The cause was found: `answer_schema.params` carries `side` and `direction` as
code-owned discriminants and nothing read them. The fence was built and threaded into
**`call2_diagnose`**. The rate went to **12/20. WORSE.**

`call2_diagnose` emits a **12–15 word gap LABEL**. The legs that write what the student actually
reads — `call3_hint`, `call3_teach` — never saw the discriminant, and with only a terse label to
work from they **confabulated the rule**. The fence was present, correct, and inert.

**The rule.** In a multi-call pipeline, identify the leg that PRODUCES THE USER-FACING TEXT and
verify the fact reaches THAT leg. A fact delivered to a classifier, a labeller, a router or any
call whose output is structurally content-neutral changes nothing a user will ever see. **Then
measure.** "The fence is wired" is not a claim about behaviour; only a re-measured rate is.

**Corollary.** A rate that moves the WRONG WAY after a fix is the most informative result available
and must be reported as such, not re-run until it looks better. 4/20 → 12/20 is what located the
real cause; a second opinion on the same wiring would have located nothing.

## P-T2 — A PROMPT INSTRUCTION OUTRANKS A SUPPLIED FACT (ruled 2026-08-01)

**The instance.** With the fence correctly reaching the speaking leg, the tutor STILL manufactured
credit: "you've correctly identified the direction — borrowers do buy futures". It was not ignoring
the fact. The same prompt said:

> "Lead with the ONE specific thing they got right — name the real move, not vague praise"

That **compels** an opening credit on every turn. Handed an answer wrong on the side of the trade,
the model produced one — by inventing the only thing that would satisfy the instruction. It was
obeying something stronger than the fact it had been given.

**The rule.** When a supplied fact and a prompt instruction conflict, **CHANGE THE INSTRUCTION. Do
not add a prohibition.** A prohibition is one more instruction competing with the one already
winning, and the helpfulness prior breaks the tie against you. Here the praise instruction became
CONDITIONAL: where code has established a contradiction, the prompt stops asking for an opening
credit on that axis. Nothing was forbidden; the demand was removed.

**Corollary — removing a leaked label does not close a leak when a PERSONA instructs the model to
reason in the leaked terms.** The internal taxonomy fix (`lib/acca/teach-demand.ts`) replaced the
raw `command_verb` / `intellectual_level` strings with a plain-English demand, and the labels stopped
appearing. It was incomplete: two `call3_*` instruction lines still said "work in the command verb
and ACCA intellectual level", and `EZRA_SYSTEM` itself told the model that candidates fail "by
stopping at intellectual level 2 when the verb demanded level 3". **A persona built on a vocabulary
will reach for that vocabulary** whatever a downstream line says. Sweep the persona and every
instruction line, not just the data.

### Recorded with them — the hole that made both necessary

`buildGroundingPack` (`lib/acca/tutor-grounding.ts`) read **`components[].working_steps` and
component labels ONLY**. It never touched **`answer_schema.params`**, which is precisely where the
calculator puts its settled choices (`side`, `direction`, `quote_direction`). So the drill tutor
inferred the side of a trade from `model_answer` prose across **57 published AFM drills and 91 APM
drills**, and the case teach route did not select `answer_schema` at all. The defect was SIGHTED on
one case; **both paths were fixed together**, because fixing only the sighted path would have left
the far larger surface exposed and quietly passing.

**Measured after, n=20 fresh turns, hand-read** (the classifier conflates "affirmed the inverse
rule" with "praised then corrected in one sentence", and that distinction IS the measurement):
inverse-rule affirmation **4/20 → 0/20** · direction corrected **~6/20 → 17/20** · never adjudicated
**~10/20 → 3/20** · taxonomy leak **1 sighting → 0/20**.

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

**P-DB6 — AN AUTHORING PATH THAT EXISTS ONLY AS AN UNTRACKED SCRIPT IS ONE MACHINE FAILURE FROM
GONE (ruled 2026-07-31).** `scripts/_*` is gitignored. That is right for a throwaway and wrong
for anything the project depends on, and the distinction is not "how it was written" — every
one of these started as a throwaway — but **what it is the only copy of**.

**The rule.** Any script that (a) **WRITES CONTENT** — authors, patches or rebuilds a
`acca_drills` / `acca_cases` / `acca_case_requirements` row through a calculator or rubric
engine — or (b) is the **SOLE CALLER of a gate barrier**, gets **COMMITTED**, out of
`scripts/_*`, under `scripts/authoring/`. Not because it is clean; because losing it costs
content that cannot be rebuilt. Commit it with a header stating plainly that it is a one-off
with hardcoded inputs, so nobody mistakes retention for endorsement.

**This is not hypothetical. It has cost us twice, and the second loss is still open.**

1. **`scripts/_author_irhedge_batch.ts` — LOST.** It authored the four live E3a
   interest-rate-hedging drills (`56989d69` / `1c133573` / `f088daa5` / `26a4167b`), was never
   committed, and has been deleted. Consequence, recorded in `docs/AFM_SURFACED.md` and still
   open: the E3a one-leg schema defect **cannot be fixed**, because "no supported re-authoring
   path exists today". Stored `params` carry only leg 0's rate; the second leg's rate survives
   ONLY as prose in the rendered `model_answer`, so recovery means parsing rendered prose on
   four published rows — with a wrong recovery moving figures that are currently correct. **A
   published defect is un-fixable because a script was untracked.**
2. **`scripts/_author_mock_paper1.ts` — CAUGHT, and committed 2026-07-31** as
   `scripts/authoring/author-afm-mock-paper-1.ts`. It was the ONLY working AFM case-authoring
   path in existence, untracked, on a project cloned at two different paths on two machines.

**The corollary that matters more than the rule: committed is not the same as REPRODUCIBLE, and
only a measurement can tell you which you have.** When committing an authoring path, prove it
rebuilds the live rows — do not infer it from reading the code, in either direction.

**Worked example, and a correction (2026-08-01).** The recompute DISCRIMINANT params
(`gearing_basis`, `parity_basis`, `quote_direction`, `direction`, `side`) were added to the 5
live numeric mock requirements by a SECOND untracked script, `_reserialise_mock_params.ts`.
From that fact it was asserted here that the `build*Schema` functions must not emit them, and
therefore that re-authoring would silently produce rows `lib/acca/recompute-registry.ts` could
not resolve. **That assertion was WRONG.** `scripts/verify-schema-discriminants.ts` rebuilds
every numeric schema from the authoring inputs and diffs it against the live rows: **48/48
checks pass** — every discriminant is emitted by the current library (`capm.ts:318`,
`international.ts:510`, `fxhedge.ts:630`, `irhedge.ts:569`), every param value and every
`expected_value` is identical. The backfill script existed because the ROWS predated the
library change, not because the library lacks it. Nothing was owed and nothing was folded in.

**Two rules come out of that, and the second is the expensive one:**
- **Prove reproducibility with a harness, and keep the harness.**
  `scripts/verify-schema-discriminants.ts` is read-only and should be run before any
  re-author, and after any library change to a `build*Schema`.
- **A full-field diff MUST be key-order-insensitive, and P-DB4 says so for a reason.** The
  first version of that harness compared with `JSON.stringify` and reported all 20 money
  components as tolerance-drifted. They were not: Postgres `jsonb` does not preserve authoring
  key order, so `{kind, pct, floor}` reads back as `{pct, kind, floor}`. A **detector bug**
  presenting as 20 content defects on published rows — the exact P-DB5 shape, caught only
  because the values were printed in full rather than the field names alone. **Print the
  values. A diff that names fields without showing them cannot be adjudicated.**

This composes with **P-DB3** (a rollback snapshot must be COMMITTED, for the same reason: the
scratchpad is outside the repo, and untracked files do not survive a `git clean` or a machine
switch). P-DB3 protects the ability to undo a write; P-DB6 protects the ability to make it again.

---

**P-DB7 — REFERENCE DATA THAT GATES A TRANSACTION MUST BE VERIFIED AGAINST ITS OWN AUTHORITY,
NOT AGAINST A PATTERN (ruled 2026-08-03).** When a stored value decides whether something can
be SOLD, the only acceptable provenance is the authority that publishes it. A value inferred
from how that authority *usually* behaves is a guess, and a guess in that position takes money
for something that cannot be delivered.

**The sighting.** `acca_sittings` was seeded with six ACCA sittings derived from ACCA's usual
pattern — exams in the first full week of the month, late entry roughly two weeks out, results
roughly five weeks after. On the two rows that then went live, the exam windows and results
dates were **correct**. The late entry deadlines were not:

| Sitting | Seeded | Actual (accaglobal.com) | Error |
|---|---|---|---|
| SEP26 | `2026-08-24` | **`2026-08-03`** | 21 days late |
| DEC26 | `2026-11-23` | **`2026-11-09`** | 14 days late |

A €99 pass is sitting-dated, and `late_entry_deadline` is what decides whether a sitting can
still be entered. Selling on either wrong date would have taken payment for a sitting the
student **could no longer enter** — for three weeks and two weeks respectively, from exactly
the buyers who leave it latest.

**WHY NO STRUCTURAL CHECK COULD HAVE CAUGHT IT — this is the load-bearing part.** Both wrong
dates sat in the correct month. Both satisfied every constraint on the table, including
`late_entry_deadline <= exam_start`, which held comfortably for both. They were internally
consistent with their own row, ordered correctly against every neighbouring date, and passed
review. **The failure was PLAUSIBLE, not obvious — which is precisely the property that lets it
survive a careful reader.** No schema constraint, no fixture and no diff can distinguish a
well-shaped guess from the truth, because the guess is well-shaped by construction. Only
reading the authority's own page distinguishes them.

**THE RULE.** Reference data in a gating position carries an explicit **verified flag that gates
the sale, defaulting to false** — not a comment, not a TODO, not a reminder to check. The
serving predicate reads the flag, so unverified data is *structurally unsellable* rather than
merely *known to be unchecked*. Record the source URL and the verification date on the row or
beside it, so a fresh environment inherits the provenance and not just the values.

Implemented here as `acca_sittings.dates_verified` (default false) + the `acca_sittings_open`
view computing `is_open = dates_verified AND now() < late_entry_deadline`. Nothing can be
offered at checkout that has not been read off ACCA's page. This is the same structural-beats-
instructed discipline as the withhold engine and the taxonomy fence: **architect the absence,
never instruct the check.**

**⚠️ THE COROLLARY, AND IT IS THE HALF THAT GETS FORGOTTEN: A VERIFIED FLAG ASSERTS ONLY WHAT
IT NAMES.** `dates_verified` says the DATES are right. It says **nothing** about whether the
CONTENT still matches the syllabus that sitting examines. Those are independent facts with
independent expiry, and a single green flag reads as general safety unless the boundary is
written down.

Concretely: JUN27 is the last sitting under the current ACCA syllabus — from September 2027 the
redesigned 11-exam qualification begins, which is also the edge of the **S26–J27** content this
product is verified against. A DEC27 row could be perfectly `dates_verified` and still sell
access to a bank written for a syllabus that sitting no longer examines. **Never offer a sitting
beyond the syllabus year the CONTENT is verified for**, and treat verifying any post-JUN27
sitting as a syllabus decision first and a calendar check second.

**Generalised:** name a verified flag after the narrow thing it checks, and state in the same
place what it does *not* cover. A flag called `verified` invites the reading that everything
about the row is; a flag called `dates_verified` with its limits recorded does not.

**P-DB8 — A FLIP CARRIES STATUS, NOT CONTENT (ruled 2026-08-21, SBL batch A).**

`candidate → approved → published` is an UPDATE of two columns. **Nothing in GATE-P has ever
carried a reviewed draft into its row, and until now no gate compared them.** A flip publishes
whatever the row already says.

GATE-P's reconcile compares the DB's approved-set against the journal's reviewed-set. That is a
comparison of **two sets of identifiers** — it answers "is every approved row one a review
record exists for, and is every reviewed row approved?" It never opens a row.

**So a row can be correctly `candidate`, correctly journalled as reviewed with every finding
applied, and still hold text superseded days ago — BECAUSE THE REVIEWING HAPPENED SOMEWHERE THE
RECONCILE DOES NOT LOOK.** Both halves of the status arm pass while the flip ships the old text.

Found when an export was requested "from the live DB rows" and the premise was checked before
acting: the five SBL rows held the batch exactly as inserted on 2026-08-19, with every fix from
cold reads 2, 3 and 4 living only in `docs/rollbacks/*.json`. Flipping them would have published
two named publication blockers (`"score nothing"`, the invented `"set the parameters"`) and a
live arithmetic error (`"33% of the 280,000"` where the reviewed draft says `"approximately
34%"`). Nothing was looking, and nothing *could* look — there was no such check to fail.

**THE RULE.** A publish flip requires a **third reconcile arm** that compares the row's CONTENT
against the reviewed draft, field by field, and blocks on any difference. Status is not a proxy
for content and a journal entry is not a proxy for either.

Implemented: `lib/acca/reconcile-content.ts` (pure, 61 fixtures) + `scripts/authoring/
reconcile-sbl-content.ts` (the runner) + `scripts/authoring/sync-sbl-content.ts` (the sync that
makes it green, under P-DB3/P-DB4).

Four things the implementation had to decide, each of which is the rule in miniature:

- **`CONTENT_FIELDS` is shared by the CHECK and the SYNC.** If the sync wrote a field the check
  did not compare, the check would go green over unreviewed text — the same failure one level
  down. One list, both sides, structurally unable to disagree.
- **Object KEY order is not a difference; ARRAY order is.** jsonb does not preserve key order, so
  a raw stringify diff cries phantom drift on a row that round-tripped unchanged (the P-DB4(a)
  lesson). But `criteria` is an ordered rubric, and sorting arrays "for consistency" would blind
  the check to a reordered one.
- **Strings compare BYTE-EXACT.** "It is only whitespace" is still a row that is not the reviewed
  text. Deciding the gap is small enough to publish past is not the check's call.
- **Unpaired blocks in BOTH directions, and an ambiguous pairing key is refused rather than
  guessed.** A row the check could not pair is a row it cannot make its claim about, and passing
  it silently rebuilds the status arm's blind spot.

**P-DB8(a) — THE ARM MUST BE WATCHED GOING RED BEFORE IT IS TRUSTED GREEN (P-G3, applied).**
Build the check BEFORE the sync, precisely so it can be run against the broken state. This one
reported **4 of 5 rows mismatched** on first run and independently reproduced markers recorded
days earlier in `a60f38d`. A5 reported GREEN and correctly so — its own read was applied BEFORE
the insert, so its row already held reviewed content. **An expectation of "all five red" was
itself wrong**, and tuning the check until it matched would have been the worst available move:
the arm's job is to report the state, not to confirm the prediction.

**P-DB8(b) — CODE HARDENING AND A FLIP HAVE DIFFERENT SHIPPING CLOCKS, AND THE FLIP'S IS
INSTANT.** Where a flip is gated on a code change (here: scoping the id-addressed tutor fetches
so an unserved paper's row cannot be served), the code must be **merged and DEPLOYED** first —
not merely committed. Per P-DB1 a DB write is not branch-scoped: the flip ships the moment it
runs, while the guard sits on a branch. Committing the guard and then flipping inverts the order
they were sequenced in and opens exactly the leak the guard was written to close.

**P-DB9 — THE TWO-STEP GATE MAY BE RUN HALF-WAY, DELIBERATELY (ruled 2026-08-22, SBL batch A).**

`approved` and `published` are two columns because they record **two different claims**, and this
batch is the case that separates them:

> `approved` = the content passed review. `published` = intent to serve.

SBL batch A cleared five cold reads, a content sync and all three reconcile arms, while SBL had no
surface, no Stripe price and no entitlement — and every served surface had just been hardened to
refuse the paper. Both columns being true is the normal case; **it is not the only legitimate one.**
Grant ruled step one alone: `candidate → approved`, `published` untouched.

**Why this is a rule and not a one-off.** Leaving reviewed-and-not-servable content at `candidate`
**costs `candidate` its meaning.** A reader who finds the most-reviewed content in the repo sitting
in the same state as an ungated draft can no longer tell "not reviewed" from "reviewed, deliberately
not served" — and the reconcile cannot either, because both arms compare identifier sets and neither
records intent. The two-step gate already had the vocabulary to say this. It just had never been
asked to.

**Three consequences, each of which bit immediately:**

- **AN INVARIANT DIES, AND IT WAS LOAD-BEARING.** `acca_drills` had `approved == published == 154`,
  so "approved but unpublished" read as a leak signal on sight. **It no longer does.** A future
  reconcile MUST allow-list a deliberately-unpublished set BY ID — the same disposition
  `47c9d5ce` (the permanent candidate) already has. An *unregistered* approved-but-unpublished row
  still hard-stops; the register is what separates a decision from a leak, and an unregistered
  decision is indistinguishable from one.
- **STEP TWO INHERITS A RE-READ OBLIGATION, AND IT MUST BE WRITTEN DOWN WHERE ITS OWNER WILL LAND.**
  Step two is performed later, by someone else, with the reviewer's context gone and the content
  months old. **All three arms will go green on stale-but-unchanged rows** — green means the row
  still holds what was reviewed, NEVER that the review is still right. State the obligation in
  `AFM_SURFACED.md` beside the surface item, not only in the batch's own block.
- **THE ARMS MUST BE RE-RUNNABLE READ-ONLY, BY THE NEXT PERSON.** A gate whose evidence exists only
  in one session's scrollback cannot be re-run at step two. `scripts/authoring/
  approve-sbl-batch-a.ts` defaults to a DRY RUN that reports all three arms and writes nothing.

**P-DB9(a) — THE JOURNAL ARM: CHECK THE THING THE STATUS ARM ASSUMES.** The status arm compares the
DB's approved-set against the journal's reviewed-set — but the reviewed-set is supplied to it, as a
`--journalled` flag or a literal. **It takes on trust the very thing it appears to verify.** A
reviewed-set asserted by a literal in a script is a literal in a script. So a third arm opens
`APM_BUILD_CONTRACT.md` and the review packs on disk and asserts a review record **exists** and
**names the row in full**. ⚠️ **CEILING, verbatim: it proves a record exists and names the row. It
cannot prove the review was good, and it is not a substitute for reading the pack.**

**P-DB9(b) — SAY "NOT A TRANSACTION" RATHER THAN IMPLYING IT IS.** The doctrine wants an un-reviewed
`approved` row demoted in the SAME transaction as the flip. supabase-js has no transaction wrapper
and cannot give that. The script therefore **refuses to write** when a demotion is required, and
prints the exact `BEGIN`/`COMMIT` block for the SQL editor. A sequenced pair of writes described as
a transaction is a worse answer than a refusal that names its own limit.

**P-V1 — A VERIFICATION RECORDED AS A JUSTIFICATION MUST NAME THE ROUTE IT ACTUALLY TESTED
(ruled 2026-08-22, the free-tier defect).**

The pillar's free pricing card carried a comment justifying its own copy:

> *"The drill serve (`app/api/acca/next-drill/route.ts`) gates on AUTHENTICATION ONLY — 401 for a
> signed-out request and no entitlement check of any kind after it … **So a free account can
> attempt all 154 drills on both papers.**"*

Every clause about `next-drill` was true. The conclusion was false. **`next-drill` is the
SELECTOR** — it decides which drill to show. **Attempting one goes through `POST
/api/acca/tutor`**, which was never checked, and which `403`d `cap_hit` before a free student
past three teach-throughs could submit anything. The offer was false for exactly the users it
was written to attract, and it stayed false because the comment told every later reader the
question was settled.

**THE RULE.** A comment of the form *"I checked X, therefore Y"* spends its credibility on **Y**
while only ever evidencing **X**. Name the file, name what it proves, and name what it does NOT
reach. A verification that cannot state its own boundary should not be recorded as a
justification at all — an unverified claim invites a check; a wrongly-verified one forbids it.

**P-V1(a) — THE SELECTOR IS NOT THE ACTION.** Where a capability spans a route that CHOOSES and a
route that DOES, the entitlement question belongs to the second. `next-drill`, `areas`, `case/list`
and the tutor PAGE all select; `tutor`, `case/turn`, `case/mark` and `sit` all act. Verifying a
"can they?" claim against a selector is the specific mistake above, and the shape recurs.

**P-V1(b) — ONE COLUMN, ONE MEANING.** The root defect underneath was that
`profiles.<paper>_teach_throughs_used` counted **coaching delivered** (correctly — §8 increments
only on `teachThroughDelivered`) and was then read as **entitlement to enter**. Where a stored
count is used by two gates, the second use is where the product breaks. Split it into named
decisions in a pure module and fixture the property that was violated, INCLUDING the field that is
constant: `teachAccessFor` returns `attemptAllowed: true` always, and it is asserted across the
whole input space precisely because "we never refuse an attempt" was previously true only by
accident. A comment saying so is not checkable; a field is.

**P-V1(c) — A WIRING TICK IN A CAPABILITY COLUMN IS A FALSE GREEN (ruled 2026-08-22).**

P-V1 one level down. The teaching-surface matrix marked the code-owned direction fence **✅** for
the exam-case tutor. That was true and checkable: `case/turn` imports and calls
`extractDiscriminants` / `detectContradictions` / `renderDiscriminants`. It was also **false about
everything a reader uses that column for** — all 18 APM case requirements have `answer_schema`
NULL and 0 of 91 APM drills carry `params`, so the fence returns `[]` and renders the empty string
across the entire paper. A tick meaning *"the call exists"* sat in a column meaning *"this is
covered"*, and the next reader budgets against the second meaning.

**THE RULE.** In any coverage table, a cell answers the question the COLUMN asks, not the question
that was easiest to check. If the column is capability, a wired-but-inert mechanism is **⚠️ with
its reach stated**, never ✅. Where wiring and reach differ, show both — the wiring fact is real and
worth keeping; it just is not the answer.

**P-V1(d) — MEASURE THE RATE BEFORE DESIGNING THE FIX, AND HAND-READ IT.** The plan built on the
✅→⚠️ correction was *"design a conclusion-polarity discriminant, then backfill APM schemas"*.
Measuring first (n=20 per surface, `--surface polarity`) said the case surface **corrects the wrong
polarity 20/20** — the discriminant would have solved a problem that surface does not have — while
the drill surface **credits it 20/20**, and for a different reason than the fence: a student-asserted
FIGURE is accepted as computed. That is the numeric-verification moat, not the direction fence.
**A fix designed from the diagnosis rather than the rate would have been built in the wrong module,
for the wrong surface.** ⚠️ And it must be HAND-read: 17 of the 20 correcting replies OPEN with
praise for a secondary point before reversing the polarity, so a detector keyed on *"You've
correctly"* inverts the result — which is how the August measurement inverted.

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
`scripts/generate-acca-drills.ts`.
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

## P-N1 — A NARRATIVE BRIEF THAT CARRIES RAW NUMERIC DRIVERS HAS NO GATE BEHIND IT (ruled 2026-08-02)

**N1–N6 grade rubric coverage, GOOD-vs-BAD separation and skill-demand STRUCTURE. None of them
reads a number. The narrative pipeline has no numeric verifier — that moat is the CALCULATOR
families' (`numeric-verifier.ts`, `validate-schema.ts`, GATE1–3), and it does not extend here.**

**The instance, measured.** D7 v1 (`--narrative-only D7`, E2c, commercial_acumen) passed **all six
gates** with a rubric requiring the candidate to conclude that a netting centre's payback was
*"achievable well within 18 months"* and that the board *"should proceed"*. Its scenario supplied the
raw drivers: 240 intra-group invoices, USD 180,000 average value, a 0.45% per-settlement banking
cost, a 62% volume reduction, USD 190,000 annual running cost, USD 280,000 set-up, an 18-month board
threshold. Worked through: annual banking cost USD 194,400 → saving USD 120,528 → **annual net
benefit −USD 69,472, and payback never occurs.** Every commercial verdict in that rubric was false on
its own figures.

**Why nothing caught it.** N1 asks whether the golden GOOD makes every required point; N4 asks
whether the marker can separate GOOD from BAD; both are satisfied by an internally coherent rubric
that happens to be arithmetically wrong. The pass-1 prompt's COHERENCE rule covers **statistical
shape claims only** (fat tails, skew, VaR-as-a-threshold) — it was written for D1's simulation output
and says nothing about a cost-benefit chain. The failure is structural, not an author lapse: a
CONCEPTUAL-ONLY drill forbids the candidate from computing, so the derived figure exists nowhere the
gates can compare it against.

**The rule. State derived economics as GIVEN analysis outputs in the brief, and forbid the raw
drivers they came from — leaving at most ONE arithmetic step for a human to check before insert.**
This is the same device D1 and D8 already use for simulation output: the scenario PRINTS the mean,
the standard deviation and the VaR as given, and nobody derives them. D7's rewritten brief requires
the scenario to state the annual net saving, the set-up cost and the resulting payback, and bans
invoice counts, per-transaction percentages and volume-reduction percentages. The one surviving step
is `set-up ÷ annual net saving`, checked by hand: 4.55m ÷ 2.1m = 26.00 months against a stated 26 and
a 24-month threshold.

**Corollary — set the given figures so the judgement is real.** Removing the derivation must not
remove the decision. Put the stated outcome CLOSE to the stated threshold (D7 misses by two months),
or the recommendation collapses into an arithmetic formality and the commercial_acumen the drill
exists to exercise never gets exercised.

**Corollary — never describe the gate suite as covering this.** A pack, journal entry or commit
message that says "all gates green" about a numerically-loaded narrative drill is making a claim the
suite does not support. Say which figures were checked and by whom.

### THIS IS THE THIRD INSTANCE OF AUTHOR-PROSE-VS-COMPUTED-FIGURES

1. **Kestrel — tax branch.** Prose named a tax treatment the computed object had not taken; the
   branch that actually fired was never stated in the model answer, so the prose guessed.
2. **Halvard — scenario count.** `buildEnpvModelAnswer` stated the verdict and P(negative NPV) but
   never how many scenarios destroy value; the advice slot beneath it asserted "the only one" against
   a computed set containing two.
3. **D7 — payback.** No computed object at all: the narrative pipeline has none, and the rubric's
   asserted verdict contradicted figures nobody had worked through.

The first two share a cause the third does not — a builder gap, where the computed object knew
something the model answer never stated (see `AFM_SURFACED.md`, and `advice-checks.ts` for the
backstop). **D7 is the harder version: there is no computed object to have known it.** So the fix
cannot be "state more of what code knows"; it has to be "do not create the derivation in the first
place". Both remedies are now standing — the builder-gap audit for calculator families, and this rule
for narrative briefs.

## P-N4 — PRESERVE EVIDENCE STATUS (ruled 2026-08-21, GPT cold read 4)

> **A claim reported by the exhibit remains a claim; an opinion remains an opinion; a survey
> attribution remains an attribution; an absence of recorded evidence remains an absence of recorded
> evidence. Do not promote any of them to established fact without independent exhibit support.**

Also called **EPISTEMIC-STATUS COLLAPSE**, or plainly **CLAIM → FACT LAUNDERING**. The exhibit
contains something only as someone's assertion, opinion, justification, allegation, forecast or
survey attribution — and the rubric or the GOOD silently promotes *the content of that statement*
into an established case fact.

**THE CLEANEST INSTANCE, A4.** The exhibit establishes that Camacho **stated** *"the annual retainer
of COP 4.2 billion sits below my authority limit"*. That establishes **Camacho claims it is below
his limit**. It does **not** establish **it is below his limit**. c1 then said *"sitting below an
authority threshold demonstrates formal approval authority"*, and the GOOD said *"it confirms that
the mechanical rule was not broken"* — the CFO's own assertion, laundered into a verified fact. This
matters more here than anywhere, because **the requirement expressly tells the candidate to CHALLENGE
that assertion**, and the model answer had already conceded it. The permitted form is *"even if
Camacho is correct that the amount falls within his authority limit, that does not resolve the
conflict."*

### ⚠️ WHY A LEXICAL LINT CANNOT REACH THIS, MEASURED

P-N3(a) happened to flag A4's two sentences via `demonstrates` and `confirms`. **That is incidental,
and relying on it would be a false green.** The identical defect written without any red-flag word
evades both existing checks — probed 2026-08-21 against the real modules, with A4 c3's real warning
supplied to the drift check:

| laundered sentence | certainty lint | warning-drift |
|---|---|---|
| *"The authority limit gives Camacho formal authority to approve the COP 4.2bn retainer, but…"* | **NO HIT** | **NO HIT** |
| *"Given that the retainer falls below his authority limit…"* | **NO HIT** | **NO HIT** |
| *"The retainer sits below his authority limit, so the procedural rule was observed."* | **NO HIT** | **NO HIT** |

Both lints operate on **linguistic surface form**. This defect is not grammatical certainty at all —
it is that **the source-status of the evidence was lost during reasoning**. No enlargement of a word
list reaches it, because there is no word to add: the sentence is restrained, and wrong.

**THE FIX IS GENERATION-SIDE, NOT A THIRD LINT** (Grant-ruled 2026-08-21, agreeing with the read).
See the evidence-status ledger scoped in `docs/AFM_SURFACED.md`. A third vocabulary-based lint is
diminishing returns; the remaining failures depend on **who said what, and how firmly the exhibit
establishes it**.

## P-N3 — NEVER LET THE RUBRIC OR THE GOLDEN GOOD KNOW MORE THAN THE EXHIBIT KNOWS (ruled 2026-08-20)

A `required_point` is the point a full-marks answer makes, and a golden GOOD is that answer. Both
are written by someone who can see the whole design — the intent behind the scenario, the reading
the drill was built to reward. **The candidate can see only the exhibit.** Whenever the rubric or
the GOOD states something the exhibit does not support, the drill stops marking reasoning and starts
marking agreement with its author — and the candidate who reads the exhibit correctly is the one who
loses.

**Every defect found in SBL batch A reduces to this, in one of five disguises:**

| disguise | instance | what the exhibit actually said |
|---|---|---|
| asserted DIRECTION | A1 c4 — non-response bias runs one way, so 68% is "a floor, not a ceiling" | nothing at all about who declined to respond |
| manufactured ALTERNATIVES | A5 c2 — the tariff rise is "the only available lever" | the covenant restricts DEBT; the remedy's necessity is management's assertion |
| absolute from a hedge | A2 c4 — "PCG has **no** organisational learning loop" | reviews "**rarely** record" planning failures |
| population from a sample | A2 c2 — the senior pipeline "carries no warehousing competence", leaders "structurally absent" | three promotions |
| proof from correlation | A3 c6 — the shortfall "maps directly onto" the missing roles, "**confirming**" the barrier | a shortfall across six regions, with nothing isolating a cause |

⚠️ **THE OVER-CORRECTION IS THE SAME DEFECT, AND IT IS THE EASIEST ONE TO MISS.** A5 c2's first fix
replaced *"the only available lever"* with a list of routes the case *"leaves open"* — equity, a
commercial tariff band, phasing, disposals. **None of those is in the exhibit either**, and one
rested on reading 310,000 *household* connections as a commercial customer base. Inventing options
to refute an overclaim knows more than the exhibit exactly as the overclaim did, and it marked down
a candidate who declined to invent them. The correct frame was neither: **separate what the exhibits
PROVE from what management ASSERTS, and say the papers are silent on the rest.**

**The test, applied to any criterion or golden-GOOD sentence:** *could a careful candidate holding
only the exhibit reach this, and is the opposite reading closed to them?* If they could not reach
it, the criterion marks the author's knowledge. If the opposite reading is open and the criterion
forecloses it, the criterion marks agreement. Either way it moves.

**No gate catches this and none realistically can.** N1/N4 grade coverage and GOOD-vs-BAD
separation; N6 explicitly declines to read `required_point` semantics; P4 checks jurisdiction and
frozen facts. It is a reader's finding — which is why an adversarial cold read of the exhibit
against the rubric belongs in the batch lifecycle, not beside it.

### THE FIRST OPERATIONAL TEST — CERTAINTY (GPT, cold read 2, 2026-08-21)

The test above (*could a careful candidate holding only the exhibit reach this?*) is the right
question and it is hard to apply to 60 sentences in a row. This is the form that can actually be
run over a draft, sentence by sentence:

> **Every verb stronger than *suggests* / *risks* / *is consistent with* needs an exhibit fact that
> closes the weaker alternative.**

It works because it puts the burden in the right place. The author does not have to prove the
sentence is defensible in the abstract; they have to **name the fact** — and the moment there isn't
one to name, the sentence is the defect. *Demonstrates* needs a fact that rules out coincidence.
*Only* needs a fact that rules out the other routes. *Confirms* needs a fact that rules out the
alternative cause. Where no such fact exists, the verb drops back to the register the exhibit
supports, which is what the three named verbs mark out: the floor is not silence, it is *suggests*.

**`lib/acca/certainty-lint.ts` is its MECHANISED HALF, and only half.** It finds the verbs; it
cannot look for the fact. So:

- **A hit is not a defect.** The verb may be exactly right, with the closing fact sitting in the
  exhibit one sentence away. Only a reader holding the exhibit can tell.
- **A clean field is NOT P-N3 clean.** The term list is CLOSED. An over-strong verb phrased outside
  it — *"the pipeline has none"*, *"there is no route but"* — passes silently. A green run means
  "no listed verb is unhedged here", never "this rubric knows only what the exhibit knows".

The half the lint cannot do is the half that matters, and it stays with a human cold read.

### THE SECOND OPERATIONAL TEST — WARNING DRIFT (GPT, cold read 3, 2026-08-21)

The certainty rule above governs a criterion in isolation. This one governs the drill as a whole,
and by cold read 3 it was the defect class that remained:

> **Whenever a criterion contains an explicit evidential warning — *"the case does not say…"*,
> *"do not infer…"*, *"either reading earns…"* — search the GOOD and the reveal for the very
> proposition that warning forbids.**

**RUBRIC → GOOD → REVEAL DRIFT IS WORSE THAN THE OVERCLAIM IT REPLACES**, and that is the reason it
earns doctrine. A criterion that names its own evidential limit reads as *proof the drill has been
disciplined*. A reviewer who sees it relaxes. Meanwhile the model answer — the thing the student
actually reads and imitates — quietly reintroduces the forbidden fact, so the repair is invisible
where it matters most and the drill teaches the error its rubric refuses to mark.

📐 **IT CAUGHT THREE PUBLICATION BLOCKERS IN ONE READ, ONE PER DRILL:** A2 c6 forbids inventing
organisational routes and named three; its GOOD reasoned with *"any new division"* and *"buying
capability"*. A3 c5 says the case does not reveal what the pilot report contained; its GOOD and
reveal built the whole counter-reading from *"no role design, no named owner, no launch gate"*. A4
c3 was REBUILT to refuse exactly two facts; its GOOD still opened with both, **verbatim**.

**THE STANDING RULE THAT FOLLOWS: A CRITERION IS NEVER FIXED ALONE.** When a criterion's evidential
boundary moves, the GOOD and the reveal move with it in the same edit, or the drill is left
contradicting itself. Both earlier fix rounds in this batch produced exactly this state by repairing
criteria and leaving the model answers behind.

`lib/acca/warning-drift.ts` mechanises the search half — see **P-N3(b)** below for what it can and
cannot do. As with the certainty lint, it finds candidates; only a reader holding the exhibit can
say whether a sentence asserts the forbidden proposition.

### P-N3(a) — THE CERTAINTY LINT: IT CANNOT FIND THE DEFECT, BUT IT CAN SAY WHERE TO LOOK

`lib/acca/certainty-lint.ts` (pure) · fixtures `npm run test:certainty-lint` (71 checks, in the
contract gate) · runner `npm run lint:sbl-certainty` (reads the drafts through the shared
`scripts/authoring/sbl-drafts.ts`, so it can never lint a superseded `.json` while the pack renders
a `.2.json`).

**All five disguises above surface in the PROSE as a certainty word doing work the exhibit cannot
support** — *demonstrates* what it can only make plausible, the *only* lever, *confirming* what is
correlation, *every* renewal from three promotions. So the lint reports the 17 ruled certainty terms
(Grant's list, 2026-08-21) across `required_point`, `model_answer` and `full_reveal`, and classifies
each occurrence by whether its own sentence already hedges it.

⚠️ **IT IS ADVISORY AND IT MUST STAY ADVISORY.** No `ok` boolean, no `blocking` field, nothing
throws, exit code always 0. Every term is legitimate prose where an exhibit fact closes the weaker
reading — A1 c4's *"the CFO's conclusion holds **only** if the employees who opted out were
systematically less anxious … and nothing in the case establishes that"* is P-N3 done **correctly**
and the lint flags it. Whether the exhibit closes the reading is a semantic judgement with no
structural discriminator, and a gate refusing on a word list would be written-around by an author
inside a week (P-DB5).

**Claim ceiling, verbatim:** *(a)* a hit is not a defect, it is a sentence to read against the
exhibit · *(b)* a clean field is **not** P-N3 clean — the term list is CLOSED, so an absolute
phrased outside it passes silently · *(c)* the hedge test is **proximity, not attachment**: a hedge
anywhere in the sentence suppresses, including one attached to a different clause. (c) is the
false-NEGATIVE direction, which is why suppressed occurrences are still returned and still printed,
and why **the unhedged count must never be reported as the number of occurrences.**

📐 **THE HEDGE LIST IS WHERE THE JUDGEMENT LIVES, AND FIVE CANDIDATES WERE DROPPED AFTER MEASURING
THEM AGAINST THIS CORPUS** — every hedge is a potential suppressed defect. `would` (counterfactual,
not epistemic: *"the process that WOULD have verified his claim was shut down"* — it suppressed a
real hit in A4 c3) · `can` · `risk(s)` (the SUBJECT of every governance drill here, not a hedge on
it) · `assertion` (A4 is ABOUT an assertion, so the noun is in nearly every sentence of it; the
attributing VERBS are kept) · `states`. An extra sentence to read costs ten seconds; a suppressed
defect ships.

### P-N3(b) — THE WARNING-DRIFT CHECK: A RECALL TOOL, AND ONLY THAT

`lib/acca/warning-drift.ts` (pure) · fixtures `npm run test:warning-drift` (34 checks, in the
contract gate) · runner `npm run lint:sbl-drift`.

Two stages. **Stage 1 finds the warning** by lead form — reliable, because these criteria are
house-authored in a narrow register. **Stage 2 must name what is FORBIDDEN**, and what makes that
tractable is that a well-written warning SAYS THE FORBIDDEN THING OUT LOUD in order to forbid it: a
negative exemplar (*"rather than asserting that X"*), an enumeration of invented routes, the
complement of *"does not establish that…"*, and the SANCTIONED FORM in the preceding sentence.

📐 **THE NEGATIVE-EXEMPLAR CLAUSE IS LOAD-BEARING, NOT A REFINEMENT.** Plain overlap against the
warning SENTENCE misses A4 c3 — the clearest known failure — because its first clause (*"the case
does not record what happened to Ríos's report"*) shares NO vocabulary with the breach (*"the
mechanism by which his claim would have been TESTED"*). The overlap lives only in the clause that
follows: *"rather than asserting that the arrangement cannot be TESTED from inside CA at all"*.
Pinned in the fixture, so deleting the sub-form goes red.

📐 **FOUR REAL BUGS THE ACCEPTANCE TEST FOUND BEFORE THE CHECK COULD PASS**, one of them
instructive beyond this module: **document frequency was computed over the text being scanned**,
which INVERTS the check — the more often a GOOD breaches a warning, the commoner its term becomes
and the less distinctive it scores, so a triple breach hides better than a single one. A2's three
*"new division"* sentences pushed the term to 57% and silenced it. Also: the stemmer turned `roles`
into `rol` while `role` stayed `role`; `own` was in the stoplist when it is the signal; and a
document-frequency filter needs a document (a term used once in a 3-sentence corpus sits at 33%).

⚠️ **THERE IS NO THRESHOLD THAT BOTH CUTS THE NOISE AND KEEPS ALL THREE KNOWN FAILURES.** A3's
breach scores 4, A4's 3, and **A2's scores 1** — so raising the bar to 2 halves the batch from 186
pairs to 92 and drops a known defect. It ships at min-score 1, deduplicated and ranked, read
top-down. Tidiness bought by losing a real finding is the false green this catalogue is about.

⚠️ **THE PAIR COUNT IS NOT A QUALITY SCORE, AND IT MOVES THE WRONG WAY.** Fixing all three
blockers took the batch from **186 pairs to 234**, because the repairs ADD explicit evidential
warnings (A3 4 → 5, A4 3 → 5) and every new warning generates new candidate pairs. A drill that
states its limits carefully scores WORSE on this number than one that states none. Report the
findings; never report the count as progress.

**Claim ceiling:** a RECALL tool. Blind to **synonym drift** (*"a separate business unit"* scores
zero against a warning that says *"division"*), blind to a warning with **no lead form**, blind to
**drift by implication**, and unable to tell an ALLOWED mention from a FORBIDDEN one — A3 c5
legitimately discusses roles and so does its GOOD. **A clean report is NOT evidence that a drill has
no drift.**

## P-N2 — THE TEACHING PAIR CAN COACH A DIFFERENT SKILL FROM THE ONE THE RUBRIC MARKS (ruled 2026-08-02)

**`hint` and `full_reveal` are the only fields a student actually READS as teaching. No gate checks
that they teach the skill the criteria PENALISE.** N1–N6 read the rubric and the golden pair and never
touch either field. P4 checks for invented facts. **P7 checks that a `"…misconception…: "` sentence
EXISTS — not that it names the failure the criteria actually mark.** So a teaching leg can be fluent,
factually clean, gate-green, and pointed at the wrong skill.

**The instance, measured.** D9 (`36edda4f`, B5c, declared skill **communication**) led its reveal with:

> *"The dominant misconception here is FENCE-SITTING: candidates … present both sides of the expansion
> argument without ever resolving them into a verdict … it fails the command verb 'advise' at level 3."*

Fence-sitting is a **commitment** failure (F4). This rubric carries F4 on **ONE criterion worth 2 of
12 marks**. Its **four F10 criteria — 8 of 12 marks — are every one of them about the READER**:
translate the mechanism out of treasury language; address the trust breach constructively; name a
route the audience can champion locally; close addressed to them by name. The teaching leg was
coaching 2 marks' worth of a different skill as though it were the drill's point. Its `hint` carried
the identical lean. **Both were found by READING, not by any gate.**

**The rule. When a drill declares a skill, the teaching pair must lead on the failure mode that the
SKILL-CARRYING criteria penalise — not merely on a real failure mode the answer might exhibit.**
Check it against the rubric's own arithmetic: identify which criteria carry the skill's disqualifier
and what share of the marks they hold, then read `hint` and `full_reveal` and ask which failure they
name. If the reveal's headline failure is carried by a minority of the marks, it is teaching the wrong
thing, however true it is.

**Anchor the reframe on the drill's own golden BAD.** D9's BAD is technically accurate throughout and
closes by tasking *"BalticPack's treasury team … engage with local counsel"* — handing the only action
item to a party the two named recipients do not control, in a treasury register, never once naming
them. That is the drill's designed failure made concrete, and it is what the reveal should have been
built on. The golden BAD is the authored answer to "what does failing THIS drill look like"; a reveal
that names a different failure is contradicting an artefact that is already in the row.

**Corollary — a claim ceiling for P7.** P7's green means *"a misconception sentence is present, so
`extractMisconceptionLead` will find a real fact rather than falling back"*. It has never meant *"the
named misconception is the right one"*, and no automated check can mean that: which failure a rubric
principally penalises is a reading of the criteria, not a property of the text. Do not describe P7 as
covering it.

### The related fix, recorded because the gap was the same shape

**`--narrative-regate-from` ran N1–N6 ONLY — and none of N1–N6 reads `hint` or `full_reveal`.** So a
hand edit to a TEACHING field could be reported "re-gated GREEN" by a set of checks that had never
looked at the field that changed. That is the P-G1 family again: the instrument reports success while
measuring something else. **It now runs `lintJurisdiction` + `lintFrozenMarketFacts` (P4) and
`lintMisconceptionLead` (P7) over the draft's teaching fields**, prints both lines, and folds them into
the pass/fail. Any future re-gate path that touches a field must run the checks that read it.
