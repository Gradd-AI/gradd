# AFM_SURFACED — the single living open-items list

**This is the ONE place current open items live.** It is rewritten each session (edited in place, not appended). As of 2026-07-11 the `APM_BUILD_CONTRACT.md` journal is **append-only pure chronology** — do not scatter new "STILL OPEN" blocks through per-session banks; update THIS file instead. Standing rulings → `GENERATOR_DOCTRINE.md`; incident rules → `GRADD_BUILD_HARDENING.md`.

*Last refreshed: 2026-07-31 (the SIT LOOP closed end to end on branch `feat/sit-loop-end-to-end`, NOT merged and NOT deployed — Grant's review first. `SitRunner` moved to `components/acca/`; a results endpoint that marks both passes, persists `technical_feedback`, computes pacing and returns the debrief; the debrief rendered with case grouping, per-case subtotals, one headline, and per-requirement band/marks/collapsed-why/next-action with pacing adjacent and never merged; `W_WEAK = 0` closed — `acca_weak_areas` written by a marked sit on weak|competent bands and read by `next-drill` on the LIVE `area=`/`lo=` paths as well as the gated scorer, with PS-tag steering alongside it. Proven on a synthetic user against the real routes, then scoped-deleted with AFM Mock 1 re-proved virgin. Three new open items — see the block below.)*

*Earlier: 2026-07-30 (measurement + debrief presentation. Marker feedback prose measured: 114 of 1,518 asserted figures are owned by no component, 96.5% of them in STRONG-band feedback — the "code owns every figure" claim CORRECTED in `CLAUDE.md`, `AFM_COVERAGE_CONTRACT.md` and `PRODUCT_STRENGTH_STANDARD.md`, and N1–N5 corrected from "marking" to AUTHORING gates. Schema widening STOPPED — see the ⛔ block below: `irhedge` one-leg schema DEFERRED to the next authoring batch, omitted intermediates CLOSED permanently, B5b logged only. NO published row was written. Debrief presentation fixed: LO-code/marks leak closed with a `Q1 (i)` display name used everywhere including the headline, case grouping + per-case subtotals, collapse-headline selection rule, forward-reference removed, strong-band justification collapsed behind an expand with the verbatim guarantee intact.)*

*Earlier: 2026-07-29 (third change-set, `feat/sit-marking-and-gate` **MERGED to main**; `APM_CASES=1` confirmed set in production; walk re-run with a deliberate band spread — 7/7 bands hit target, 6 non-`nothing` bands all scored >0, paper 60/100; the `passed`-is-unset docs claim corrected; allowlist coverage recovered as 17 serving-gate fixtures. **The 3 AFM cases are still NOT flipped — P-DB2, Grant's, and `/acca/afm/mock` is dark until then.** Change-set contents: `sitting` threaded into both mark call sites; per-skill `mark_awarded` no longer returned to the client; the inverted sit gate RETIRED + allowlist deleted + sit writes moved to `case/turn` — the publish-flip trap is closed in code and the flip itself is still owed under P-DB2; `MOCK_SIT_MODE` HELD false, SitRunner generalisation banked as the next change-set. Earlier same day: PS pass exercised — PS pass run on the ordinal contract — 0/30 parse failures, contract holds 0 violations/30 chains, PS spread 17–19 on a 20-mark pool; the per-skill `mark_awarded` apportionment artefact SURFACED, not fixed. Earlier same day: marking parse failures: the per-requirement split REVERTED, the ordinal contract and max_tokens 3000 KEPT, `extractJsonBlock` shipped with 16 fixtures; 10-run harness = 0/30 parse failures, B2(i) competent/6 in 10/10, A(iv) strong/5 in 9/10; doctrine P-M1 added).*

*Earlier: 2026-07-28 (Mock 1 barrier GREEN — capm registered + CAPM-1/2/4/9 built, 0 false positives; gate result model pass/fail/not_evaluated banked + Mock 1 barrier RED on the B3e P6 blocker; P7 misconception-lead fixed across 8 published drills, corpus now 0/57, packs re-audited; earlier: recompute registry built + scoped to the 5 mock numeric requirements; `subsumed` verdict shipped; the 5 mock numeric requirements re-serialised with their discriminants (P-DB2 authorised, post-write verified clean); the 74 published-corpus ids recorded as unresolved status-quo. Earlier same day: blind-candidate QA findings banked as PENDING content edits).*

*Earlier: 2026-07-28 (blind-candidate QA findings banked as PENDING content edits — b101 VaR reference-point ambiguity + paper-wide "guaranteed"→"locked in" register fix; both HELD for the next Mock 1 content write, neither executed).*

*Earlier: 2026-07-26 (FR3-CORRECTED: HALFWAY_ROUNDING_RISK either-rendering absorption shipped; B3k `dedca530` ruled CORRECT — the re-author fixed a phantom, rollback deliberately NOT applied; publish-flip trap on the 3 AFM mock cases recorded; P-DB5 added. Earlier same day: sit-surface artefact audit — LO codes stripped at the serve boundary. Prior: mock-engine Phase-1 preconditions; param-sweep APM scope gap + `?? 0` lossy default logged; AFM Mock Paper 1 lean sit UI shipped preview-gated).*

## ⛔ CLOSED-BY-RULING 2026-07-30 — schema widening STOPS HERE; only ONE real defect shape exists

Measurement session (read-only). The marker's feedback prose asserts figures no schema component
owns — that finding is banked in `CLAUDE.md` ("MARKING DOES NOT EARN THAT CLAIM"). Investigating
it surfaced three separate questions about schema coverage. **Two are closed permanently. One is
deferred with a named trigger. NOTHING was written to a published row.**

### 🟠 DEFERRED (named trigger) — E3a one-leg schema: `irhedge.ts` is the sole outlier

`buildIrFuturesSchema` (`irhedge.ts:542`), `buildIrOptionsSchema` (`:595`) and
`buildIrCollarSchema` (`:648`) each take `c.scenarios[0]` for their components while
`build*ModelAnswer` maps over **every** scenario — so the model answer renders two legs and the
schema owns one. Checked all **28 `build*Schema` functions across 12 family modules**: these three
are the ONLY instances. `buildIrSwapSchema` has no scenarios and is unaffected.

**Affects 4 rows** — published drills `56989d69` (futures), `1c133573` (options), `f088daa5`
(collar), plus the Mock Paper 1 `(i) E3a` requirement. This is the hole the sighted €216,000
fell through: the fall-scenario loss has no `expected_value`, so nothing downstream can check a
restatement of it.

**NOT FIXED, deliberately.** The cost is not "add components":
- `scripts/_author_irhedge_batch.ts` was gitignored (`scripts/_*`) and **has been deleted**. There
  is no `--irhedge-batch` generator wiring either. No supported re-authoring path exists today.
- **Stored `params` carry only leg 0's rate** — `1c133573 base_rate:2.4` · `f088daa5 base_rate:3.4`
  · `56989d69 base_rate:5.9`. The second leg's rate survives ONLY as prose in the rendered
  `model_answer` table. Re-authoring means recovering it by parsing rendered prose, and a wrong
  recovery **moves figures that are currently correct** — on 4 rows, on a paper no student has sat.
- 3 of the 4 `irh_*` recompute fns cannot reach a second leg: `irh_closing_price` is bound to a
  single `params.base_rate`; `irh_futures_profit` and `irh_net` read `d.closing_price` /
  `d.mm_interest` / `d.futures_profit` **by literal component_id**. Only `irh_effective` (which
  resolves through `depends_on` via `soleDep`) generalises. And all seven `irh_opt_*` / `irh_col_*`
  ids sit in `UNRESOLVED_RECOMPUTE_IDS` — unresolvable today, so options/collar need those built
  first.

**Trigger to revisit: the next `irhedge` authoring batch**, when the generator is being touched
anyway and proper `draft*Drill` / `SUBMIT_*_TOOL` wiring is being added. Doing it then costs the
schema change only; doing it now costs a prose-parse recovery with a figure-movement risk.

**CONFORMANCE PATTERN — `risk.ts buildEnpvSchema:361`.** `comps = c.scenarios.map(...)` — one
component per scenario. That is the shape `irhedge` departed from and the shape it must return to.
Every other multi-leg family already conforms and was hand-verified: `buildRadrSchema`
(`npv_at_company` + `npv_at_radr`), `buildRiskMeasuresSchema` (`*_a` + `*_b`), `buildCompareSchema`
(`equity_dcf` + `equity_multiple`), `buildApvSchema` financing_compare (`apv_debt` + `apv_equity`),
`buildIntlSensitivitySchema` (`addChain('')` + `addChain('alt_')`), `buildDurationSchema`
(`a_`/`b_`, `''`/`ref_`), `buildForwardMmhCompareSchema` (both methods).

### ⛔ CLOSED PERMANENTLY — omitted intermediates are OUT OF SCOPE, and 43% is NOT a defect count

A scan of the 49 published numeric AFM drills found **869 of 2,022 rendered figures (43.0%) match
no component `expected_value`**, with 48 of 49 rows carrying at least one.

**READ THAT NUMBER CORRECTLY. It is a measure of how much working the model answers SHOW, not a
count of defects.** The overwhelming majority are **presentational intermediates** — per-year
discount factors, per-year present values, restated input rates — which are displayed so a student
can follow the derivation and which **need no component and never did**. A model answer that
renders its working will always score "high" on this metric; a terser one would score lower while
teaching less. **Nobody should read 43% as a corpus failure, a quality regression, or a backlog.**
It is not any of those, and no work is owed against it.

The scan's own limits, for anyone tempted to re-run it: it sees RENDERED figures only, so a figure
omitted from the model answer *and* absent from `components[]` is invisible to it (Mock `(i) B1a`
scores 0 unowned yet the marker still invented four discount factors from the prose phrase
"discounted at 10.00%"); it counts a `params` match as owned; and it carries an unquantified
false-positive rate (B3e's `0.700`/`0.300` are `own_ve`/`own_vd` 70/30 rendered as fractions).

**The ONLY in-scope defect shape is a whole missing LEG** — a rendered outcome the schema models
zero times, not a step it models once and displays twice.

### 📋 LOGGED, NOT ACTIONED — B5b's unmodelled columns are a DIFFERENT defect shape

Mock `(ii) B5b` renders four columns with no component. Adjudicated:
- **foreign free cash flow** (BRL 211.2m → 230.8m) — **CHAIN STEP.** The student derives it
  (PBIT×(1−t) + depreciation − capex − ΔWC, grown at 3%); it carries its own marks and its own
  error modes, and nothing upstream of it is owned. Would merit modelling.
- **withholding tax** (BRL 31.7m → 34.6m) — **CHAIN STEP.** An independent decision, not glue:
  the marks turn on applying 15% to the right base. Would merit modelling.
- **discount factors** (1.000, 0.912, 0.833, 0.760, 0.693) — **presentational.** No mark attaches
  to the factor itself. Out of scope per the ruling above.
- **present values** (EUR 28.6m, 26.2m, 24.0m, 22.0m) — **presentational.** Sits between two owned
  components (`home_cf_t`, `npv`); the assessed quantity is the NPV. Out of scope.

**This is NOT the `irhedge` fix.** `buildFcffComposedSchema` has no leg array to drop — it never
modelled those columns at all, so it needs its own scoping pass rather than the `scenarios[0]`
conformance change. **Logged. No action authorised.**

## ✅ CLOSED 2026-07-31 — the sit loop runs end to end; the mock carve-out and the label fence are gone

Branch `feat/sit-loop-end-to-end`. This closes, in one pass, everything the two blocks that used to
sit here were waiting on. Recorded rather than deleted, because each was a named risk:

- **The mock-content carve-out is RETIRED.** It existed only because the APM mock loaded and turned
  through `GET /api/acca/case` + `case/turn`. `SitRunner` serves both papers, so `GET /api/acca/case`
  now refuses `mock_only` UNCONDITIONALLY and `case/turn` refuses it in PRACTICE and allows it in SIT
  — `sitting` decides, nothing else. `attemptUnlocksCase` is deleted.
- **`/api/acca/sit` serves `marks_guide`, and the label is reduced to the PART alone.** Parity is now
  by rule rather than by AFM's labels happening to spell their marks in prose.
  `scripts/test-afm-label-marks.ts` and its npm script were **deleted** with the dependency they
  fenced, as that block required.
- **`MockRunner.tsx` and `MOCK_SIT_MODE` are deleted.** The APM "mock" drove the paper through
  `CaseSession` — the PRACTICE teach surface — under a countdown, which is why it coached the
  candidate through every requirement until each was judged correct. No exam does that.
- **`AFM_MOCK_PAPER_1` merged into `MOCK_PAPERS`.** One registry, one place a case id can be wrong.
- **`SitRunner` moved to `components/acca/SitRunner.tsx`.** It was still under `app/acca/afm/mock/`,
  so the APM route imported a component out of the AFM route's folder.
- **The results screen exists** (`app/api/acca/sit/results` + the debrief render). The APM mock's old
  results screen is replaced by it rather than carried over.
- **`acca_case_progress.technical_feedback` is written.** The technical marker's reasoning used to be
  returned and dropped, so the debrief's verbatim `why` had nothing to read on any request that did
  not itself mark.
- **The weakness ledger is live.** `W_WEAK = 0` is closed; `acca_weak_areas` is written by a marked
  sit and read by `next-drill` on the LIVE `area=`/`lo=` paths, not only the flag-gated scorer.

**Proven on a synthetic user against the real routes** (local dev — this branch is not deployed),
then scoped-deleted with AFM Mock 1 re-proved virgin for ALL users: 8 submissions → bands
exemplary/competent/weak/nothing → 3 cases marked in 60s → 8/8 `technical_feedback` persisted →
pacing computed from `submitted_at`/`completed_at` → collapse headline selected → a second results
POST re-marked 0 → GET served the persisted `why` on 8/8 → `lo=B5a` steering 27/40 → **40/40**, PS-only
control `lo=B4a` suppressed the untagged B4d **9/40 → 0/40**.

**NOT deployed and NOT merged** — Grant's review first.

## ✅ CLOSED 2026-07-31 (same day) — the countdown regression and the missing `resolved_at` writer

Both were surfaced by the block below and **fixed before merge, on Grant's instruction**:

**1. The countdown and auto-submit are RESTORED, for both papers.** Ruled a regression, not a port:
a 3h15m paper without a visible countdown is not a rehearsal, because the skill being rehearsed is
finishing inside the time. `acca_mock_attempts.ends_at` stops being a NOT-NULL placeholder and
becomes the deadline — set once at start, never moved. `lib/acca/sit-preview.ts` gains the pure
`remainingMs` / `isExpired` / `clockState` / `attemptIsClosed` (+ a 15-minute warning state, a house
choice, flagged by TEXT as well as colour).

At zero the runner records **the requirement being written** — whatever is in the box — and finishes.
It does **not** back-fill the tail: those requirements keep no row, so they are `not_reached` and not
`blank`, which pacing and the debrief report differently (the next action for an unreached
requirement is about REACHING it). Making the tail blank to satisfy a stricter gate would have
destroyed that distinction to work around a gate, so **the gate moved instead** —
`caseMarkReady(sitting, reqs, attemptClosed)` gains an expiry arm, defaulted false so every existing
caller is unchanged.

Enforcement is split on purpose and the split is the interesting part: the BROWSER runs the clock and
fires the auto-submit (sub-second, and it is the act of submitting); the SERVER decides a paper is
over (`attemptIsClosed` — finished, or past `ends_at`) and `case/turn` refuses further sit writes once
the attempt is **`completed`**. Keyed on `completed` and NOT on `now > ends_at`, deliberately: the
auto-submit's own POST lands milliseconds after the deadline, and refusing on the timestamp would
throw away the answer it exists to rescue. Recording happens first, finishing second — no race.
Closing the tab still buys nothing: the next load sees an expired attempt, closes it, and goes to the
results.

**2. `resolved_at` has a writer.** A subsequent **strong or exemplary** band on the same
`(user, paper, lo_code, source)` closes the open row — the same instrument that opened it, so no
second mastery signal to keep in step. `competent` deliberately does NOT close: its own published
next action says a material point was missed, and a material point still missing is not a resolved
weakness. **OPEN BEATS CLOSE within one marking run** — a paper examining one LO twice can come back
weak on one and strong on the other, and resolving on the strength of the good half would erase the
finding the same paper just produced. Nothing is deleted; the closed row stays as history and the
partial unique index lets a later weak band open a fresh one.

Fixtures: `test-weak-areas` 52 → **76** (close/reopen across three sittings, the open-beats-close
precedence in both arrival orders, the competent boundary), `test-sit-preview` **+26** (the clamp at
zero, a null `ends_at` NOT reading as expiry, the warning boundary, `attemptIsClosed`'s two arms),
`test-case-sit` **+7**. DB-level, against the live partial index: close → reopen → both rows survive
→ the selector sees exactly one open row → a second open row for the same key still 23505s.

## 🔸 OPEN 2026-08-01 — RE-SIT MARKING HAS NO ATTEMPT DIMENSION (submissions do)

Surfaced by the live re-sit walk on `fix/sit-defect-block`, after migration
`20260801120000` landed. **Half the re-sit path works and half does not**, and the half that
does not is structural.

**WORKS, proven live:** a second attempt produces its OWN 8 progress rows; 16 rows coexist,
8 per attempt; **attempt 1's rows are byte-identical after the re-sit**; attempt 2's answers are
its own. That is what the migration was for and it is done.

**DOES NOT WORK:** attempt 2 is **never marked**. `acca_case_marking` has
`PRIMARY KEY (user_id, case_id)` and **no attempt column**, so it cannot hold two markings for
two sittings of one case. `casesNeedingMarking` sees attempt 1's marking row, reports the case
as already marked, and the re-sit's `marked_now` is **0** — measured: 3 marking rows where 6
would be needed, 0/8 attempt-2 rows banded.

**What it does NOT do, and this is the part that matters:** attempt 2 does **not** inherit
attempt 1's marks. Its debrief reports `technical_awarded: null` — honestly unmarked — rather
than a false 80/80. So the failure mode is a missing debrief, not a wrong one.

**NOT student-reachable today.** There is no "sit again" control: `SitRunner` goes to the
results screen once the paper is complete and offers no way to start a second attempt. The gap
is reachable only by POSTing `action:'start'` directly. **Do not add a re-sit control until this
is fixed** — that is the one change that would turn a latent gap into a live defect.

**Fix:** a second migration — `attempt_id` on `acca_case_marking`, PK widened the same way
`acca_case_progress` just was (surrogate id + `UNIQUE NULLS NOT DISTINCT`), then scope
`casesNeedingMarking`, `claimCase` and the marking upsert by attempt. Pinned in the harness
(`scripts/_verify_afm_sit_serve.ts`, re-sit walk) as a KNOWN LIMITATION asserted against current
behaviour, so it **fails the day someone fixes it** and prompts an update rather than sitting
permanently red.

## ⛔ RULING 2026-08-01 (Grant) — STANDALONE AFM CASES ARE **NUMERIC-HEAVY**, not a mirror of APM

**The scope question is closed before the build starts.** AFM practice cases are built around
CALCULATION requirements. **Narrative requirements are the EXCEPTION in an AFM case, not the main
path.** Do not reproduce APM's discursive shape (all 18 APM case requirements are `evaluate` /
`assess` / `advise` / `prepare`, 0 `calculate`, 0 `answer_schema`) — that shape is right for APM
and wrong for AFM.

**Rationale, in the order it decides the design:**

1. **The calculator moat.** Numeric requirements get deterministic, code-owned figures and the
   full 37-line gate barrier. That is the thing competitors cannot copy, and it is worth nothing
   on a requirement that carries no figures.
2. **The 6-LO family-gate union is the real ceiling.** `FamilyGateInput`
   (`lib/acca/case-authoring-gates.ts:342`) is a CLOSED union over **`B5b, E2b, B1a, E3a, B4a,
   B3e`**, plus an explicit `NO_FAMILY_GATES` escape that forces the author to NAME the omission.
   A numeric requirement outside those six gets GATE1–3 and the prose lints but **no family
   gates**. So case authoring should target the six first; extending the union is per-family work
   and should be a deliberate decision, not a side effect of wanting a particular scenario.
3. **The narrative leg's per-requirement cost does not amortise.** Every narrative requirement
   needs a hand-authored `NarrativeRubric` (criteria with `required_point` / `anchor_facts` /
   `disqualifiers` / `development_required`, plus `scenario_facts` and `requirement_parts`), a
   golden GOOD *and* a golden BAD (the live ones run 1,200–1,800ch each), designed failure modes
   the BAD must actually trigger, and **a live model grader** — N1 and N4 are the only gates in
   the system that need an API key and are non-deterministic. None of that gets cheaper on the
   tenth case. The numeric leg, by contrast, is inputs → calculator → gates, and the marginal
   cost of the eleventh numeric requirement is close to the second.

**What this does NOT license.** GATE **C2** still holds: an AFM Section B case must contain ≥1
`calc`-kind requirement, and the syllabus rule it encodes ("there will not be any wholly
narrative questions") is a floor, not a target. Numeric-heavy means numeric-led, not
numeric-only — a case of pure calculation with no evaluation is not exam-faithful either.

**Consequence for the corpus gap below:** numeric-heavy case authoring does **not** close the
professional-skill gap. PS tags live on requirements and will pass C4, but the drill corpus that
a weak PS band routes into is unchanged. That remains an authoring gap on `acca_drills`.

## 🔸 OPEN 2026-07-31 — THREE COPY DEFECTS ARE LIVE ON THE AFM LANDING PAGE

All three in `components/landing/product-landing-config.ts`, verified 2026-07-31, **not yet
fixed**. Full reasoning and the permitted replacements are in
`docs/APM_MARKETING_POSITIONING.md` → REQUIRED COPY FIXES; recorded here because this file is
the one place open items live, and these are shipped-to-students defects rather than notes.

1. **`:40` — the code-owned-marking overclaim.** *"Every figure and every accept/reject verdict is
   computed and verified deterministically, so the marking is exact."* True of DRILL GENERATION,
   false of MARKING — the same claim already corrected in `CLAUDE.md`,
   `AFM_COVERAGE_CONTRACT.md` and `PRODUCT_STRENGTH_STANDARD.md`. Marking is answer-locked and
   **model-graded**. **Highest risk of the three**: falsifiable by one student noticing a figure
   in their feedback that no schema component owns (measured: 114 of 1,518).
2. **`:44` — drill count says 16; actual published AFM is 57.** Wrong in our own disfavour.
3. **`:49` — "One ACCA pass covers every paper you sit" vs the APM-named Stripe SKUs**
   (`STRIPE_APM_PASS_90D`, `STRIPE_APM_MONTHLY`). The claim is FUNCTIONALLY TRUE —
   `hasActiveACCAAccess` is bundle-wide — so **the fix is renaming the Stripe objects, not
   retracting the copy**. Retracting would understate a real entitlement.

## 🔸 OPEN 2026-07-31 — the AFM professional-skill corpus is skewed (authoring, not routing)

**Logged on Grant's instruction 2026-07-31. Rides the next AFM authoring batch.**

**PS-tag steering is effectively a no-op on AFM while working properly on APM.** This is an
**authoring gap, not a routing defect** — the selection code is correct and paper-agnostic; AFM
simply has almost nothing to steer between. Counted 2026-07-31 over published drills:
   - **AFM (57):** `analysis_and_evaluation` **48** · null **8** · `communication` **1** ·
     `scepticism` **0** · `commercial_acumen` **0**.
   - **APM (91):** `analysis_and_evaluation` 36 · `scepticism` 21 · `commercial_acumen` 17 ·
     `communication` 17 · null 0.

On APM the PS term genuinely steers toward a named weak skill: all four skills are represented and
none is dominant. On AFM, **84% of the corpus carries one tag and two of the four skills do not
appear at all**, so the term can only separate "tagged" from "untagged" — which is exactly what the
live measurement showed (`lo=B4a`: B4d, the sub-area's only untagged drill, 9/40 → **0/40**). A real
effect, but not the one the term is for.

**Consequence to state plainly:** a student marked weak on scepticism or commercial acumen in an AFM
sit gets **no AFM drill that specifically exercises it**, because none is tagged. The LO term still
steers them (that half works on both papers, measured 27/40 → 40/40); only the professional-skill
half is inert on AFM.

### ROOT CAUSE FOUND 2026-08-01 — it was NOT "the batches landed on one tag"

The 2026-07-31 entry above said the fix was authoring-only and **no code change was owed**. That
was wrong, and the correction matters because the same defect would have silently re-applied to
every future batch.

`buildSpecsForList` (`scripts/generate-afm-drills.ts`) declares `sectionIdx` **local to each
call**, and every batch caller invokes `buildSpecsForList([oneLo])[0]` — **one LO at a time**. So
the rotation index is always `0` and `deriveSkillTag` always returns `pool[0]`:
`analysis_and_evaluation` for sections B and E, `communication` for section A. That single fact
explains the whole distribution — 48 quantitative drills tagged `analysis_and_evaluation` and the
one section-A drill tagged `communication`. **The rotation was never bypassed; it was defeated by
the call shape.** Separately, `runNarrativeBatch` hardcoded `professional_skill_tag: null`, which
is where all 8 nulls came from.

**Fixed 2026-08-01 (`86765ec`), narrative path only.** `NarrativePlan` now carries a **declared**
`skill`, set per plan from what its rubric demands, and the same value both lands in the row and
steers the Ezra reveal prompt. Hoisting `sectionIdx` to module scope was **rejected**: it would
make the tag depend on generation ORDER, so re-running a batch could silently re-tag its drills. A
professional skill is a property of what a drill demands, not of when it ran.

**Still owed, in order:**
1. **The 8 published narrative rows are still `null`** — the generator fix is forward-only. Per-drill
   assessment done 2026-08-01 from each rubric's own criteria: `08044fb6` B3a, `32ef124c` B5c,
   `55181aa8` E1a, `d0be009d` E1a → **commercial_acumen**; `fda46d99` B3i → **scepticism**;
   `d413fbe7` B4d → **scepticism** (borderline: only 4–5 of 12 marks are the limitations part);
   `cb9b411c` B1b and `f9f4f3d4` E2a → stay **analysis_and_evaluation**, correctly. A DB write on
   published rows (P-DB2, Grant's).
2. **The 48 quantitative tags are unexamined, not verified.** They may each be right — a calculator
   drill genuinely is appraisal — but nobody decided that; the defect defaulted them. Declaring a
   skill per calculator family is the remaining generator work.
3. **Nothing gates the tag.** No check verifies that a drill's declared skill matches what its
   rubric demands. The case-authoring path has C4 for PS coverage; the drill path has no analogue.

**Sharpest statement of the consequence:** AFM Mock 1 grades all four skills — `scepticism` on 3
requirements (**28 marks**) and `commercial_acumen` on 2 (**14 marks**). `psScore` returns 0 unless
a drill's tag matches, so a student marked weak on either gets a boost on **zero drills in the
entire AFM corpus**. The PS half of the steering is inert for exactly the two skills the sit
weights most heavily.


## 🔸 OPEN 2026-07-29 — the per-skill PS `mark_awarded` is an apportionment artefact, not a per-skill score

> **PARTLY ADDRESSED 2026-07-29** (branch `feat/sit-marking-and-gate`, unmerged): the field is no
> longer RETURNED to the client — `app/api/acca/case/mark` sends band + feedback per skill plus the
> case total, and `CaseSession` renders the band. The apportionment is unchanged and still persisted
> in full to `acca_case_marking.per_skill`, verified in the synthetic-user walk. What remains open is
> only whether the internal apportionment should change at all (option 2 below); the client-facing
> exposure that made it urgent is closed.

**Surfaced by the 10-run PS harness; deliberately NOT fixed** (the brief was report-don't-fix, and this
is marking semantics, not plumbing). `apportion()` is largest-remainder over a **case-level rounded
total**, so a per-skill mark is not a function of that skill's own band:

- **Same band, different marks, in the SAME run.** Case A run 1: `analysis_and_evaluation` exemplary →
  **3**, `commercial_acumen` exemplary → **2**. Both sit at ceiling 2.5; the rounding surplus is handed
  out by fractional part and runs out.
- **Same band, different marks, ACROSS runs.** B1 `analysis_and_evaluation` is exemplary in 10/10 and
  scores 2 or 3 **depending on what SCEPTICISM did** — a skill's displayed mark moves when a *different*
  skill's band moves.
- **Different band, same mark.** A `commercial_acumen` scores 2 whether judged strong or exemplary.
- **Full pool with a non-exemplary band present.** B2 run 2: 1.6667 + 1.25 + 1.6667 = 4.583 → `round` →
  **5/5**. Any B2 combination reaching 4.5 takes the whole pool.

Arithmetically correct at case level — **the case totals are right and every integrity check passes.**
It matters only because `per_skill[].mark_awarded` is **returned to the client**, where it reads as a
per-skill score it is not. **Grant's call**, three options: show bands only and drop the per-skill
number; show the unrounded per-skill figure; or leave it and document it. No code change made.

## ✅ CLOSED 2026-07-29 — PS pass exercised on the ordinal contract (harness only)

10 runs × 3 cases = **30 chains**, 90 skill-cells, PS pool Σ20 (A 10 · B1 5 · B2 5). **0/30 parse
failures**, 30/30 chains returned, 90/90 cells evaluated. **Ordinal contract HOLDS — 0 violations /
30 chains** across entry count, skill-set identity, duplicates, band legality, Σ per-skill == awarded,
available == pool, and the pool cap. PS paper total **17–19 on 20** (range 2). Every band movement is a
single step; A `communication`, B1/B2 `analysis_and_evaluation` and B2 `scepticism` never moved at all.
**Observability limit recorded rather than glossed:** the core returns MAPPED skill names, so the raw
`index` is unreadable from outside — a bad index is rejected in-core and surfaces as a *parse capture*,
never as a bad row. Harness `scripts/_run10_ps_marking.ts` (gitignored). Full matrices in the journal.

## ✅ CLOSED 2026-07-29 — technical-marking parse failures: split reverted, parser fixed, 0/30

**22.9% → 0/30.** The root cause was never the batch: the captured raw text showed **valid, correct,
complete JSON behind the model's own prose preamble** on 20 of ~50 calls, and `JSON.parse(trimmed)`
required the response to BEGIN with the JSON. Fixed at the parser — `extractJsonBlock()` pulls the
first BALANCED block out of a response (fences anywhere, leading prose, trailing commentary;
string-aware brace matching so a `}` inside feedback cannot close the object early), and still
returns `null` on a truncated or malformed body so those keep failing. 16 fixtures,
`npm run test:marking-json-extract`.

**The per-requirement split is REVERTED** — it moved the mark (A(iv) `strong`→`exemplary` in 5/5
runs judged alone). **The ordinal contract and `max_tokens` 3000 are KEPT** — they stand on their own
evidence and the ordinal is now on BOTH cores, PS included. Doctrine **P-M1** banked: a reliability
fix to a marking call must be re-calibrated on a fixed reference script over N runs, band matrix
reported, not merely re-run.

**10-run harness** (`scripts/_run10_technical_marking.ts`, gitignored, read-only): 30 chains, 30
returned, **0 parse failures / 30 model attempts**, 80/80 cells evaluated. **B2(i) competent/6 in
10/10** · **A(iv) strong/5 in 9/10**. Rate stated against its denominator per P-G2 — 0/30 bounds the
true rate near ≤10% at 95%, it does not establish 0%.

### 🔸 OPEN (calibration, non-blocking) — two soft cells in the band matrix

- **A(iii) E2b (8 marks) is the least stable cell: `strong` 7/10, `exemplary` 3/10.** Not a defect —
  the candidate answer genuinely sits on that boundary — but it is the widest spread in the paper and
  the first place to look if mock totals start wobbling.
- **A(iv) E1a (6 marks) reads `exemplary` in 1/10 runs** (run 8, itself a whole-case outlier that
  totalled 40/40). Batching restores `strong` as the dominant band; it is a tendency, not determinism.
- Both are **marking-calibration** items, not plumbing. Neither blocks the sit surface (marking and
  debrief remain out of the `/acca/afm/mock` build). Revisit alongside the PS pass, which has **not**
  been put through an equivalent repeated-run matrix yet — the ordinal contract landed on
  `judgeCaseMarking` this session on the technical pass's evidence, not on its own.

## ✅ CLOSED 2026-07-28 — Mock 1 barrier is GREEN; capm registered; CAPM-1/2/4/9 built

**The B3e blocker below is CLOSED.** `deriveHasLoss` gained a `B3e` case (capm is a RATES-ONLY
family — betas, Ke, Kd, WACC — modelling no cash flows, so no taxable-profit stream and no loss
year can exist), shipped as its own atomic commit ahead of any gate work. Mock 1 now reads
**106 lines · 86 pass · 0 fail · 20 not_evaluated (BLOCKING 0, named exemption 20) — GREEN.**

**`lib/acca/validate-capm.ts`** then added CAPM-1/2/4/9 at the authoring-time bar (the same bar
every other family gate runs at — input+result objects, never a stored row). Fixtures:
`npm run test:capm-gates`, 15 checks, each gate with a passing case AND a deliberately-broken
case that must fail; CAPM-2's break is the swapped peer/own tax rate.

**False-positive run: 0 hits on known-good content** (4 published capm drills + mock A(i)).

### ⛔ PARKED — CAPM-3 / 5 / 6 / 7 / 8, full spec so they are recoverable without re-deriving

- **CAPM-3 — regear-target lock.** `project_specific` regears onto `own_ve`/`own_vd`;
  `wrong_hurdle`'s `project_beta` onto `company_ve`/`company_vd`. Assert the beta matches the
  declared basis **and not** the other pair. *Catches:* regearing onto the peer's own structure —
  a silent no-op that hands back the peer beta. *Blocked by:* `gearing_basis` exists only on rows
  serialised since 2026-07-28; at authoring time it is fully runnable.
- **CAPM-5 — post-tax Kd consistency.** `kd_after_tax == kd(1−T)×100`. *Catches:* the Kd quoted
  in prose diverging from the one used in the blend. *Note:* `kd_after_tax` is a result field,
  not a component or param, so this is authoring-time only.
- **CAPM-6 — `beta_direction` verdict integrity.** `beta_direction` must agree with
  `regeared_beta` vs `peer_equity_beta` at the same EPS capm.ts uses. *Catches:* prose asserting
  the project beta is higher/lower than the peer's when it is not — a figure-vs-figure verdict
  doctrine says code owns. Same shape as FXH-19. *Needs:* `peer_equity_beta` (not persisted).
- **CAPM-7 — wrong-hurdle FLIP integrity.** `accept == (project_return > project_wacc)`,
  `would_accept_on_company == (project_return > company_wacc)`,
  `flips == (accept !== would_accept_on_company)`; and when `flips` is true the model answer must
  SAY so. *Catches:* a drill whose entire teaching point is the flip where the figures do not
  flip, or where they do and the prose never names it.
  **⚠ CAPM-7 HAS A REAL CLAIM ON THE NEXT CAPM AUTHORING BATCH: published drill `B3d 2a145f7d`
  uses `wrong_hurdle`** (components `company_ke, company_wacc, project_asset_beta, project_beta,
  project_ke, project_wacc`), so this is live content with no verdict gate over it today.
  *Needs:* `project_return` and the kind — neither persisted.
- **CAPM-8 — rate-ordering sanity.** `ke > rf`; `regeared_beta > asset_beta` when Vd>0;
  `kd_after_tax < ke`; `wacc` strictly between `kd_after_tax` and `ke`. *Catches:* sign
  inversions and transpositions that survive tolerance but are financially impossible. Same shape
  as RISK's `validateRadrOrdering`. Partially runnable from stored components.

### 🟡 What the false-positive run also measured (published capm coverage)

| drill | kind | CAPM-1 | CAPM-2 | CAPM-4 | CAPM-9 |
|---|---|---|---|---|---|
| `2a145f7d` B3d | wrong_hurdle | not runnable | exempt | **not runnable** | exempt |
| `810b3893` B3d | org_wacc | not runnable | exempt | **PASS** | exempt |
| `de8eb7b9` B3e | project_specific | not runnable | exempt | **PASS** | exempt |
| `11c308e5` B3e | keu_for_apv | not runnable | exempt | exempt | exempt |
| mock `A(i)` B3e | project_specific (two-rate) | **PASS** | **PASS** | **PASS** | **PASS** |

Two findings worth carrying:
1. **No published capm drill is a two-rate drill** — none carries `peer_tax_rate`. HC1 exposure is
   confined to mock A(i), so CAPM-2 and CAPM-9 have **zero published surface** today.
2. **`2a145f7d`'s gearing pair is ambiguous from the row**: `own_ve/own_vd` and
   `company_ve/company_vd` are both `48200/12600`, so the run cannot tell which pair weights the
   WACC without `gearing_basis`. It reports NOT RUNNABLE rather than guessing. (For
   `wrong_hurdle` both are in fact the company pair, so the check would be safe — but the row
   does not say that, and inferring it is the habit this whole workstream exists to break.)

## ~~⛔ OPEN BLOCKER~~ — CLOSED, see above: `A(i) B3e · P6 loss-relief`

**Logged 2026-07-28. The paper does NOT pass its own barrier. Do not describe Mock 1 as gated.**

Under the pass/fail/not_evaluated model the full matrix is **106 lines · 86 pass · 0 fail · 20
not_evaluated (1 BLOCKING, 19 named exemptions)**. The single blocker:

```
A (i) B3e · P6 loss-relief — no family result object for lo "B3e";
            the loss-year fact cannot be derived, so P6 cannot be evaluated
```

**Root cause: `capm` (calculator #5) has NO registered calc-family gate branch.** It is the only
family in the paper without one, so `familyFor('B3e')` must pass `NO_FAMILY_GATES`, and
`deriveHasLoss` then has no result object to read the loss-year fact from. The matrix also
surfaces this directly as `family gates (B3e) → named exemption`.

**Two separable fixes — do not conflate them:**
1. **Narrow (unblocks the paper):** give `deriveHasLoss` a `B3e` case returning
   `determined:true, value:false` with the reason capm is a rates-only family with no
   taxable-profit stream — the same treatment E2b/E3a/B1a/B4a already have. One case, and P6
   becomes a named exemption rather than a blocker.
2. **Full (closes the real gap):** register a capm family-gate branch. Spec drafted 2026-07-28
   (CAPM-1…CAPM-9, report-only, nothing built) — the HC1 two-rate ungearing convention is the
   highest-value target because it is **house-authored, not examiner-sourced**, and decides the
   entire Section-A chain.

Everything else in the paper now runs and passes, including every previously-invisible family
line (INTL-12/13/14/14b · FXH-19 · RISK-Ga/Gb · IRH-20/21/23/25) and all N1–N5 on the real
grader with N4 included. C1–C4 pass.

## ✅ SHIPPED 2026-07-28 — gate result model: pass / fail / not_evaluated

Canonical rule: **`GENERATOR_DOCTRINE.md` → P-G1**. Summary of what changed in code:

- `GateStatus = 'pass' | 'fail' | 'not_evaluated'` + a `blocking` flag, with `barrierPasses` /
  `barrierBlockers` (`lib/acca/case-authoring-gates.ts`). A blocking `not_evaluated` is as fatal
  as a `fail`.
- **`family` is REQUIRED** on `runRequirementGateBarrier`; `runFamilyGates` has a `default:` that
  **throws** on an unregistered `lo_code`; "no family gates" must be declared explicitly as
  `{ lo: 'NO_FAMILY_GATES', forLo, reason }`.
- **`deriveHasLoss` replaces caller-supplied `hasLoss`**, which is removed from
  `RequirementProseFields`.
- **`runNarrativeGateBarrier`** is the single committed N1–N5 orchestration; a missing golden BAD
  or empty `designed_bad_flags` BLOCKS.
- BLOCKING when unevaluable: missing `family` · unregistered `lo_code` · GATE 26 where the family
  declares a comparison but no `f.compare` · GATE 27 without `computed` · GATE 2 on empty
  components · HALFWAY on empty components or empty `model_answer` · P6 when the loss fact is
  underivable.
- NAMED, NON-BLOCKING exemptions (reason in code): TAX_RATE_ASSIGNMENT (<2 corporate rates) ·
  P6 (no loss year) · P7 (no `full_reveal`) · P9 + P9-SCENARIO (not the nil-tax branch) ·
  GATE 26 (family declares no comparison) · N5 (no verdict wanted) · VAL-11b (non-divergent) ·
  NO_FAMILY_GATES.

**⚠ The compile-enforcement claim is bounded.** `tsconfig.json` excludes `scripts/` and `tsx`
does not typecheck, so the required `family` param is compiler-enforced only for `lib/` and
`app/`. The authoring scripts rely on a **runtime guard**. State it that way; do not say the
compiler makes omission impossible.

## 🟡 OPEN (INERT, MEASURED) — the 49-drill matrix: 43 cannot hydrate, so GATE1/GATE3 cannot run

**Measured 2026-07-28 (not assumed).** Running the barrier over the 49 published AFM numeric
drills produces **221 blocking `not_evaluated` lines**:

| gate | pass | fail | BLOCKING | exempt |
|---|---|---|---|---|
| GATE1 self-consistency | 0 | 43\* | **43** | 0 |
| GATE3 seeded-OFR | 0 | 43\* | **43** | 0 |
| GATE2 · P4 · P5 · P8 · P4-reveal · HALFWAY | 43 | 0 | 0 | 0 |
| P6 loss-relief | 0 | 0 | **43** | 0 |
| GATE 27 derived-figure integrity | 0 | 0 | **43** | 0 |
| family gates | 0 | 0 | **43** | 0 |
| P9 · P9-SCENARIO · GATE 26 · TAX_RATE | 0 | 0 | 0 | 43 each |
| barrier threw outright | — | — | **6** | — |

\*GATE1/GATE3's `fail` on an unhydrated schema is a MEASUREMENT ARTEFACT, not a content verdict.

**Cause: only 6 of 49 schemas hydrate.** 43 hit one of the 74 deliberately-unresolved recompute
ids, so GATE1/GATE3 have no live recompute to exercise. 6 rows threw outright — including
`51163dac` (`fxh_mmh_convert_spot`: no `params.quote_direction`) and `56989d69`
(`irh_futures_profit`: no `params.side`) — because only the mock rows were re-serialised with
discriminants.

**STATUS QUO, not a regression.** None of this was evaluable before either; it was simply
reported green. Fixed **per-family at next authoring**, exactly as the unresolved-id item below
prescribes. **No backfill of published rows.**

## ✅ SHIPPED 2026-07-28 — P7 misconception-lead: 8 published AFM drills fixed, corpus now 0/57

**Live-content write (P-DB1: it shipped the moment it ran). P-DB2 satisfied — dry run shown,
Grant authorised `--apply`. P-DB3 snapshot committed BEFORE the write:
`docs/rollbacks/AFM_p7_misconception_leads_20260728.json`.**

`extractMisconceptionLead` (`tutor-grounding.ts`) only returns a real fact when `full_reveal`
carries a literal `…misconception…:` sentence; otherwise it silently falls back to the first
sentence, and that fallback is injected into the HINT leg (`route.ts:372`, the only call site)
as *"MISCONCEPTION (this drill's designed failure pattern)"*. 8 of 57 published AFM drills were
on the fallback path — **the exact set measured when P7 was introduced (AFM 8/54, 2026-07-24)**,
grandfathered because the gate landed at 12:04 that day, ~3½h after the four E3a rows were
created. Not a leak; the fix-on-touch set, now touched.

| drill | class | lead before → after |
|---|---|---|
| `f088daa5` E3a collar | MISDIRECTED | *"A collar answer earns its marks…"* → **"…is that a collar is a free hedge:"** |
| `26a4167b` E3a swap | MISDIRECTED + **leaked method detail into a hint** | *"The comparative-advantage calculation is the easy part: the total gain available is the fixed-rate differential minus…"* → **"…is treating the quoted borrowing rates as gospel:"** |
| `56989d69` E3a futures | VACUOUS | *"Two failure modes dominate…"* (names none) → **"…is the contract count:"** |
| `f2817d06` B1a · `7db140ed` B3f · `51163dac` E2b | minimal | `failure` → `misconception`, one word each |
| `1c133573` E3a options | minimal | reframed as a named misconception, same point |
| `003ab45c` B1c | **gate FALSE POSITIVE** | lead **byte-identical before and after** — the row always led correctly at runtime; only the regex's colon requirement failed it |

**`51163dac` also carries the parked `guaranteed` → `locked in` register fix**, folded so the
row is touched once. Those 4 strings are CODE-OWNED (`fxhedge.ts` :615/:622 labels, :637 Step-1,
:641 header); the library was already corrected, so patching the row **converges** it with the
code rather than drifting — a regeneration now emits exactly these strings.

**`MISCONCEPTION_PATTERN` and `extractMisconceptionLead` were NOT touched** — the byte-identical
gate/runtime split is deliberate and stays.

**Post-verified under the corrected P-DB4** (baseline read from the pre-write snapshot,
key-order-insensitive): all 8 still `approved`/`published`; P7 passes on all 8 with a real regex
match; **every `expected_value` byte-identical (`Object.is`)**; component counts, ids and order
unchanged; **params untouched** on all 8; `model_answer` untouched on 7, changed only on
`51163dac`; exactly 2 labels changed, both to `Locked-in`. **Real post-write sweep: 57 drills,
P7 failures = 0.**

**Review packs re-audited by BODY, not by id-grep** (the standing rule). Three carried a stale
quoted opening and were corrected to match the DB: `AFM_BATCH1_NPV_ROUND2_REVIEW_PACK.md`,
`AFM_BATCH_DURATION_REVIEW_PACK.md`, `AFM_IRR_BATCH2_REVIEW_PACK.md`. The irhedge pack quotes
none of the four changed E3a bodies — 0 stale.

### 🟠 OPEN — fxhedge pack register drift (NOT stale-by-quote, so left alone deliberately)

`docs/reviews/AFM_BATCH_FXHEDGE_REVIEW_PACK.md` carries 3 `guarantee*` hits (L221, L346, L364).
**None of them quote a changed string** — the changed `model_answer` strings appear 0 times — so
the pack is not stale in the quoted-body sense. But L221/L364 describe the K1 outcome as "the
guaranteed outcome" while the live row now says "locked in", and **L346 is the unrelated verb
"structurally guarantees"**, which must NOT be swept. Deciding which line describes which of
K1–K4 needs a proper audit against each drill's own question; not done, not guessed.

## 🟡 OPEN (INERT, STATUS QUO) — the 49 published drills' recompute ids are UNRESOLVED and WRITE-ONLY

**Logged 2026-07-28, on building `lib/acca/recompute-registry.ts`. State it this way and do not
soften it:**

> **74 of the corpus's 92 recompute ids cannot be resolved from stored data. This is the
> UNCHANGED STATUS QUO, not a new defect — they were write-only before the registry existed
> too. No published row's behaviour changed. Nothing regressed.**

### The measurement (the gap map, banked — `numeric-verifier.ts` cites this section)

| fact | value |
|---|---|
| OFR carry-through engine | `lib/acca/numeric-verifier.ts` → `verifyNumericAnswer` — pure, paper-agnostic, **not APM/`acca_case_requirements`-specific** |
| Live wiring | **NONE.** Zero `verifyNumericAnswer` call sites in `app/`. Its only non-test caller is `case-authoring-gates.ts:141` (GATE 3) |
| Published AFM drills with a numeric schema | **49** (356 components) — all 49 carry `depends_on` AND a `recompute` id |
| Mock numeric case requirements | **5** — likewise. Every APM case requirement has **no `answer_schema` at all** |
| Distinct recompute ids corpus-wide | **92** |
| Resolvable today | **18** (the 5 mock requirements' ids) |
| Unresolved | **74**, listed by name in `UNRESOLVED_RECOMPUTE_IDS` |

**Why they cannot be resolved — two structural facts, not an oversight:**

1. **The family lambdas are CLOSURES over per-drill inputs**, not pure functions of `deps`
   (`irhedge.ts:562` closes over `raw.notional`/`raw.hedge_months`; `risk.ts:369` over a
   `probs` array). So a registry entry can never be `(deps) => number` — the signature is
   `(deps, params)`.
2. **`SerializedSchema.params` was typed `Record<string, number>`**, so it could not carry the
   non-numeric discriminants the maths branches on — irhedge `side`/`direction`, fxhedge
   `quote_direction`/`residual_policy`/`premium_currency`, capm `gearing_basis` — nor the
   array/map state `risk`, `apv`/`npv` and `international` need. **Now widened to
   `number | string`** (`ParamValue`, valuation.ts), flat scalars only: collections flatten to
   indexed numeric keys (`prob_1`, `remit_net_3`), component-id lists are read from
   `depends_on` and never duplicated into params, so P-DB4's drift sweep stays a flat
   exact-equality check.

**Why INERT:** nothing parses a stored schema at serve time. The verifier runs only in the
authoring barrier, against the freshly-built IN-MEMORY schema where the lambda is live — which
is why GATE 3 has always worked and still does.

**The fix path, per family:** a family becomes resolvable when it is **next authored** — add
its discriminants to its `params` block and register its ids. **No backfill of the 49
published rows** (a DB write to live rows, P-DB1..3, to remove an ambiguity that is inert
today — the same reasoning as the `?? 0` serialiser item above). Ordering is whatever the next
batch happens to need.

**Do NOT let an unresolved id degrade silently.** `resolveRecompute` throws
`UnresolvedRecomputeError` for a known-but-unresolved id and a distinct error for an unknown
one; `hydrateAnswerSchema` throws on the first one it hits rather than returning a schema with
a missing `recompute`. A silent drop would fall back to the authored expected value, which
**disables carry-through** — a correct method on an own wrong input would be marked
`incorrect`. `scripts/test-recompute-registry.ts` asserts registry ∪ unresolved covers the
measured 92 with no overlap, so a new id nobody registered fails the suite.

## ✅ SHIPPED 2026-07-28 — recompute registry + `subsumed` verdict (the mock-params WRITE is still PENDING)

- **`lib/acca/recompute-registry.ts`** — 18 scoped ids, `(deps, params)`, each transcribed from
  the family module that writes it and calling that family's own exported helpers
  (`regearBeta`, `parityDifferential`, `toHome`, `discountFactor`, `asDec`, `t2`). Maths is not
  re-derived. Resolution happens at LOAD (`hydrateAnswerSchema`), not at call.
- **`subsumed` verdict** (`numeric-verifier.ts`) — **Grant ruling 2026-07-28**: an omitted
  intermediate whose error is already charged at a dependent `incorrect` is CREDITED, not
  charged twice. Bounded deliberately: an `absent` with no charged dependent stays `absent` and
  stays zero, and `subsumed` is excluded from `all_correct`. Blast radius nil — `buildOfrProof`
  fills every component, so `absent` never fired in GATE 3, and the verdict appeared nowhere
  else in `lib/` or `scripts/`.
- **✅ WRITTEN 2026-07-28 — the 5 mock numeric requirements now carry their discriminants.**
  P-DB2 satisfied (shown as a dry run, then Grant authorised `--apply`). Rows are candidate /
  `published=false` / `mock_only=true`; **no published row was touched**. Post-write verified
  independently (`scripts/_verify_mock_params.ts`): params key set exact on all 5, **no
  pre-existing param value moved**, component counts unchanged, **every `expected_value`
  byte-identical to pre-write**, prose intact, and all 5 hydrate with every recompute
  round-tripping to its stored figure. Added: `gearing_basis` · `parity_basis` +
  `remit_net_1..4` · `quote_direction` + `direction` · `prob_1..3` · `side` + `direction`.
  Every added value is **round-trip proven**: the
  registry recomputes each dependent from its authored upstream figures and reproduces the
  stored `expected_value` exactly, so a wrong discriminant fails the write. `parity_basis` is
  the one exception — `parityDifferential` uses the same formula for `ppp` and `irp`, so the
  round trip cannot discriminate it; it is asserted from the exhibit text instead (the scenario
  states INFLATION differentials), guarded in the script.
- **Acceptance:** `npm run test:mock1-acceptance` — b201 (i) × the blind-candidate script
  (`docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md`), hand-transcribed figures, real
  registry: `contracts` correct, `mm_interest` correct, `closing_price` **incorrect**,
  `futures_profit`/`net_outcome`/`effective_rate` **carried**, `unexpired_basis` **subsumed**,
  **awarded 6/7**, `gap_label` names `closing_price`. Tolerance-only marking scores that script
  2/7; one conceptual error now costs one mark.
- **Still nothing wired into `app/`.** The marking route and its inverse publish gate are
  untouched, and free-text → `StudentSubmission` extraction remains unbuilt — the acceptance
  fixture transcribes by hand for exactly that reason.

**🔻 TWO VERIFICATION LESSONS from this write — both cost a false alarm, both are reusable.**

1. **A `JSON.stringify` equality check is NOT a valid P-DB4 post-verify.** The apply script's
   own read-back compared stringified jsonb and reported `stored-matches-intent=false` on all
   5 rows. **Postgres `jsonb` does not preserve key order** — it normalises — so a byte
   comparison cannot tell a reordering from a real change. It reported a mismatch on 5 rows
   that were in fact correct. A P-DB4 check must compare **key sets and values**, not
   serialised bytes.
2. **P-DB5 again, and it caught me.** The order-insensitive re-check then flagged
   `asset_beta 0.9375 → 0.9374999999999999` and `forward_home …92 → …913` as drift. Both were
   **FALSE**: neither figure was in the pre-write dump, and I had typed the baseline from hand
   arithmetic rather than reading the row. Reconciled by recomputing from the stored inputs —
   `ungearBeta(1.35, 60, 40, 0.34, 0)` **is** `0.9374999999999999` and `179.5/5.66` **is**
   `31.713780918727913`, so the stored values were the authored values all along and the write
   changed neither. **A baseline you did not read is not a baseline.** This is the fourth
   false positive of this shape in the workstream; P-DB5's rule — reconcile against real data
   before calling a detector hit a defect — is what stopped it being reported as drift.

## 🟠 OPEN (PENDING WRITE) — two Mock 1 content edits, HELD for the next Mock 1 content write

**Logged 2026-07-28, from the blind-candidate QA sit against `AFM_MOCK1_CANDIDATE_VIEW.md`.**
Both are **deliberately NOT standalone changes** (Grant's ruling): they ride the next Mock 1
content write. **P-DB2 applies — the exact statements below are shown before anything executes.**
Nothing has been written. Field values verified against the LIVE rows on 2026-07-28, not read off
the review pack (packs are snapshots).

**Source evidence for both edits:** `docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md` — the
authentic blind-candidate script, banked 2026-07-28 as a **marking test fixture** (script body
verbatim and frozen; hand-maintained framing preamble above it). It is also the standing fixture
for the heavy-partial-credit marking case: Q3(i) carries ONE conceptual error (unexpired basis
ignored → 4.95% vs a code-owned 4.80%) that fails **5 of 7** components on tolerance while the
contract count, hedge direction, scenario reconciliation and committed advice are all correct.
**The requirement's own self-check does not discriminate** — the candidate got 4.95% under BOTH
rate scenarios and read the consistency as confirmation, because the omitted 0.15 basis applies
identically to both legs. Marking must catch it; the candidate's internal check never will.

### EDIT 1 — b101 Exhibit 2: the VaR reference point is not stated

**Evidence (not a hypothesis):** the blind candidate stated outright that the paper does not say
whether the GBP 52m VaR is a loss against a zero NPV or a shortfall below the GBP 44m mean, and
had to **guess**. It guessed the intended reading. That is luck, not design — the same script
under the other reading would have been marked wrong for a defect in the exhibit.

Target: `acca_case_exhibits`, `case_id = aa000000-0000-4000-8000-00000000b101`,
`exhibit_order = 3` ("Exhibit 2 — Monte Carlo simulation output"), column `body`.

- **FROM:** `…and a project Value-at-Risk of GBP 52 million at the 95% confidence level.`
- **TO:** `…and a project Value-at-Risk of GBP 52 million at the 95% confidence level (expressed
  as a loss against a zero NPV, not as a shortfall below the mean NPV).`

**Which convention, and why it is not a free choice.** The absolute-loss reading is the one the
paper's own figures already imply, so this edit makes the exhibit say what the rubric already
assumes — it does not change the intended answer:
- The stored model answer reads it that way: *"a 5% chance that the downside loss will exceed GBP
  52 million"*, *"the tail loss the balance sheet has to be able to absorb."*
- Internal consistency confirms it: mean 44, σ 60 ⇒ the 5th percentile is ≈ **−54.7m** (against a
  stated VaR of 52m, close), and P(NPV<0) ≈ **23.2%** (against a stated 22%, close). Under the
  mean-shortfall reading the 5th percentile would be 44 − 52 = **−8m**, which is flatly
  inconsistent with both stated statistics.

**Rubric impact: none required.** All 7 `scenario_facts` key on bare figures (`"GBP 52 million"`,
`"95%"`), so the added clause breaks no fact key. **N1–N5 must still be re-run on the REAL grader
after the edit** (E-narrative FR1 precedent), not assumed.

### EDIT 2 — paper-wide register: apply the irhedge FR1 ruling to fxhedge content

**Evidence it matters:** "guaranteed" propagated out of the exhibit into the blind candidate's own
answer **twice**. The leak reaches student output, which is exactly what the irhedge FR1 ruling
("guaranteed" overstates a hedge outcome; T4's register is "locked in") was written to stop.

**The sweep found 11 hits on `a001`, not 2** — the requirement and exhibit Grant named are 2 of
them. Full sweep of all 3 mock cases × every text field + `answer_schema`:

| location | field | hits | owner |
|---|---|---|---|
| `a001` exhibit_order **4** ("Exhibit 3 — Managing the first remittance") | `body` | 1 | stored literal |
| `a001` req (iii) E2b | `question` | 1 | stored literal |
| `a001` req (iii) E2b | `hint` | 2 | stored literal |
| `a001` req (iii) E2b | `full_reveal` | 2 | stored literal |
| `a001` req (iii) E2b | `model_answer` Step-4 advice `prose` | 1 | stored literal |
| `a001` req (iii) E2b | `model_answer` Step-1 + Step-3 table header | 2 | **CODE** `fxhedge.ts:637,641` |
| `a001` req (iii) E2b | `answer_schema` component labels ×2 | 2 | **CODE** `fxhedge.ts:615,622` |

**⚠ TRAP 1 — "Exhibit 3" is `exhibit_order = 4`.** The "Company background" row occupies
`exhibit_order = 1`, so every printed exhibit number is offset by one. Keying the update on
`exhibit_order = 3` would patch **Exhibit 2 (Cost of capital data)** — the wrong row.

**⚠ TRAP 2 — `b101` contains "guarantees" and it MUST NOT be swept.** `b101` req (ii)
`answer_schema` `required_point` reads *"…mitigations (phased build, revenue **guarantees**) that
cut the 22% downside probability…"* — an ordinary commercial noun, unrelated to hedging register.
A blind `guarantee*` replace corrupts it. Match on the hedging sense only.

**⚠ TRAP 3 — PROSE OWNERSHIP: 4 of the 11 hits are CODE-OWNED and a DB patch would drift.**
`lib/acca/fxhedge.ts` generates them:
- `:615` `` label: `Guaranteed ${home} outcome under the forward hedge` ``
- `:622` `` label: `Guaranteed ${home} outcome under the money-market hedge` ``
- `:637` `` `… = **${mH(...)}**, guaranteed.` ``
- `:641` `` `| Method | Guaranteed ${home} outcome |` ``

Per the PROSE OWNERSHIP RULE these need a **library change + rebuild through the calculator**, not
a row patch — patching only the row re-drifts on the next regeneration. Step-4's sentence is the
model-authored `prose` arg and IS a row patch. Wording-only throughout: **zero figures change.**

**🔻 KNOWN SIDE EFFECT of the library change — surfaced, not hidden.** `buildForwardMmhCompare*`
also serves the **LIVE published** fxhedge K1 drill `51163dac`. Changing the code does **not**
touch that row (stored rows are what serve, so this is inert today), but it leaves live K1's
stored prose saying "guaranteed" while the code says "locked in" — a divergence that would
materialise if K1 were ever regenerated. **Sweeping live K1 is a write to a published row
(P-DB1..3) and is therefore OUT of this scope and Grant's call**, not folded in silently.

## 🟡 OPEN (INERT) — the param-drift sweep was AFM-ONLY; APM is UNMEASURED, not clean

**Logged 2026-07-25.** State the scope every time the sweep result is cited, and never let the
headline travel without it:

> **the 2026-07-25 param-drift sweep covered AFM ONLY. It says NOTHING about APM. The APM
> published corpus is UNMEASURED, not clean.**

The sweep ran over **365 params across the 49 published AFM drills**, reading
`acca_drills.answer_schema`. The **91 published APM drills carry no `answer_schema` at all** — APM
numeric content lives in **`acca_case_requirements`**, a different table with a different shape,
which the sweep never looked at. So an empty APM finding would have measured the absence of a
column, not the quality of the data. It was not run on APM, and as written it could not have been.

**Why INERT today:** nothing parses APM figures at serve time, so an undetected APM param defect
has no live blast radius right now.

**What it blocks:** an equivalent sweep over `acca_case_requirements` is a **precondition for APM
exact-figure parsing** (the APM analogue of Piece 2). Verifying a student's own figures against an
unmeasured numeric corpus would be checking them against numbers nobody has checked. **The AFM
CLEAN result is not transferable evidence** — it is evidence about AFM, and the two corpora share
neither a table nor an authoring path. Same discipline as GATE 27's "unmeasured, not clean".

## 🟡 OPEN (INERT) — the `?? 0` serialiser default is LOSSY; fix FORWARD-ONLY, folded into the next batch

**Logged 2026-07-25.** Every calculator family serialises ONE param block across all of its kinds
with a `?? 0` default, so a kind that does not use a key stores `0` instead of omitting it.
**32 params corpus-wide are zero purely because their kind does not use them.** The cost: a stored
`0` is **indistinguishable from "not applicable"** — and that ambiguity is **the exact mechanism
that hid the B3d defect** (`own_ve`/`own_vd` silently rewritten 48200/12600 → 0, invisible precisely
because a legitimate not-applicable zero looks identical to a wrongly-written one).

**Structural fix: OMIT the key rather than serialise it as `0`.** An absent key is unambiguous; a
zero is not.

**Scope discipline — this is deliberately NOT its own change:**
- **FORWARD-ONLY — new authoring only. NO backfill of published rows.** Rewriting 32 params across
  the published corpus is a DB write to live rows (process rules **P-DB1..3**) to remove an
  ambiguity that is currently harmless; the rewrite would carry more risk than the thing it fixes.
- **Fold it into the NEXT authoring batch**, as part of that batch's own serialiser/gate work. Do
  not raise it as a standalone refactor, and do not let it grow into a corpus migration.

**Harmless today:** nothing reads these params at serve time, and GATE 27 merely loses a few
allowed-set entries. This is a latent-ambiguity log, not a defect report.

## 🟡 OPEN (INERT) — GATE 27 published-corpus coverage gap

**Logged 2026-07-25 on wiring GATE 27 (DERIVED_FIGURE_INTEGRITY).** State it exactly this way
and do not soften it:

> **the published corpus is UNMEASURED, not clean — the 259 unmatchable tokens were a
> measurement artefact proven by control experiment, not verified content.**

GATE 27 is now LOUD in the authoring barrier, but it only ENGAGES when a caller supplies the
calculator result object (`lib/acca/derived-figure-integrity.ts`, ENGAGEMENT RULE). Published
`acca_drills` rows store only the serialized schema — the result object is gone — so the
report-only sweep over them could not see derived intermediates and reported 259 "orphans"
that are overwhelmingly working-table cells, not defects. The control experiment: the SAME 8
gate-green mock requirements yield **2** orphans WITH result objects and **29** WITHOUT — a
14.5× inflation on identical, correct content. That measures the instrument, not the corpus.

**INERT** because the gate is authoring-time only and touches no serving path; published rows
are unaffected today. To actually MEASURE the published corpus, each drill must be re-run
through its calculator. Until then no claim may be made in either direction about derived
figures in published drills.

**UPDATE 2026-07-25 (boundary re-author): 5 of the 49 published numeric drills ARE now measured,
and the gate was RIGHT.** The re-derivation FR3 thought impossible turned out to be possible
(the missing inputs are stated in each drill's own `context_text`, not its stored params — see
the RESOLVED section below), so `B1c 796651c2` / `B3d 2a145f7d` / `B3j 34f9e897` / `B3k
dedca530` / `B4a 0dc970a8` were run through GATE 27 **with** their calculator result objects.
Four genuine orphans surfaced across three families — the WACC market-value weights (capm +
valuation), the subsidy spread and the financing-side-effects total (apv), and the
equity-divergence multiple (valuation) — every one a derived figure asserted in prose with no
code-owned value behind it. All four are fixed at source (named result fields / a shared
exported helper), not exempted. **The remaining 44 stay UNMEASURED, and the 14.5× measurement-
artefact caveat above still governs any sweep run without result objects.** The method is now
proven, though: re-derive from `context_text`, not from `answer_schema.params`.

## 🟢 PARAM-DRIFT SWEEP (2026-07-25, REPORT-ONLY) — CLEAN in the P-DB4 classes; one inert observation

Ordered after P-DB4 to answer: **did earlier writes leave param drift nobody has looked for?**
Scope: **365 params across all 49 published AFM drills.** Result:

| class | count |
|---|---|
| null / non-numeric | **0** |
| zero disagreeing with a same-kind sibling (the B3d shape) | **0** |
| float-drift not explained by `x/100` normalisation (the B4a shape) | **0** |
| param not locatable in its own `context_text` | **0** |
| key absent vs same-kind siblings | **0** |

**Scope: AFM ONLY.** APM is structurally out of scope, not "checked and clean" — all 91 published
APM drills carry **no `answer_schema` at all** (APM numeric content lives in
`acca_case_requirements`). An empty result there would measure the schema, not the data.
**→ tracked as its own OPEN item at the top of this file** ("the param-drift sweep was AFM-ONLY;
APM is UNMEASURED, not clean"), which is the canonical statement of the gap and of what it blocks.

**What the sweep can and cannot prove.** Full re-derivation of every drill is a per-drill hand job
(5 took a session). This ran the mechanical check that *would* have caught both P-DB4 defects: for
every param mirroring a stated input, is the stored value exactly the clean decimal, and does that
figure appear in the drill's own scenario? `own_ve: 0` fails it; `kd: 0.057999999999999996` fails
it. So CLEAN here is real evidence against that specific drift class — **it is not proof every
param is correct**, because a param that is wrong but plausible (a figure transcribed off the
wrong scenario line) is invisible to it. Same discipline as GATE 27's "unmeasured, not clean": do
not upgrade this to a correctness claim.

**Three detector corrections made before trusting the output** — the first pass reported 36
findings and every one was false:
- A bare **zero is not drift**. Every family serialises ONE param block across all its kinds with
  `?? 0`, so a kind that doesn't use a key stores 0 — verified by inspection (the `org_wacc` drill
  has no peer in its scenario at all; the `keu_for_apv` drill has no company Ve/Vd). The sharp test
  is a zero disagreeing with a **same-kind** sibling.
- **"Same kind" must be fingerprinted by COMPONENT IDs, not param keys.** Because `?? 0` makes every
  kind serialise the same keys, a param-key signature groups `org_wacc` with `wrong_hurdle` and then
  reports `org_wacc`'s legitimately-unused `peer_ve` as drift.
- A rate stated as a percentage and normalised by `asDecimalRate` (`5.8/100` →
  0.057999999999999996) is the **correct** value, not drift — flagging it would have condemned the
  very figure restored under P-DB4. And `yield_shift 0.03` is stated as "300 basis points", so the
  scenario matcher needs a ×10000 form.

**🔹 INERT observation — the `?? 0` serialiser default is LOSSY.** 32 params across the corpus are
zero purely because their kind does not use them. Harmless today (nothing reads them; GATE 27 just
loses a few allowed-set entries), but it is the same mechanism that hid the B3d defect: a zero is
indistinguishable from "not applicable". The fix is to OMIT an unused key rather than serialise it
as 0. **No code change made — log only. → tracked as its own OPEN item at the top of this file**
("the `?? 0` serialiser default is LOSSY"), which carries the binding scope ruling: FORWARD-ONLY,
no backfill of published rows, folded into the next authoring batch rather than done standalone.

## ⛔ CLOSED RULING — B3k `dedca530` VALUES ARE CORRECT; THE RE-AUTHOR WAS UNNECESSARY. DO NOT RE-LITIGATE, DO NOT ROLL BACK.

**Ruled 2026-07-26. This entry exists so nobody re-opens it in either direction.**

**The current live values are CORRECT.** `dedca530` B3k was re-authored on 2026-07-25 to fix a
boundary defect that **did not exist**. Re-read from the live row on 2026-07-26:
`debt_issue_costs` = **-1.3** (gross debt principal 65 × 2.00% = 1.3 exactly), tolerance
`{relative, 0.5%}` — on **no rounding boundary at any precision**, and the row has **zero**
boundary occurrences across all 16 components. The reported `-1.95` **never existed in the
database**. The `-1.9` the detector matched in the prose belongs to **`ncf_5 = -1.878919424`**,
a clean non-boundary value that legitimately renders `-1.9` at 1 dp; the `-1.95` `expected_value`
was back-inferred from that misattributed string. See `GENERATOR_DOCTRINE.md` **P-DB5** — this is
the third string-misattribution false positive in this workstream and the only one that reached
published content.

**A rollback snapshot exists and is DELIBERATELY NOT APPLIED:**
`docs/rollbacks/AFM_boundary_rounding_20260725.json`.

**Why it is not applied — the reasoning, so this is not re-argued:** the re-author was
*unnecessary*, not *wrong*. Every rebuilt component matched its stored `expected_value` exactly,
the full authoring barrier passed, and the prose now renders the hand-working digit, which is the
state the display invariant wants regardless. Rolling back would be a **second** unjustified write
to published rows — same class of risk as the first, with no defect to fix at the end of it, and
it would re-introduce the `answer_schema.params` drift that P-DB4 was written to catch. The
snapshot is retained solely as the P-DB3 audit artefact. **Leave the rows alone. Do not
re-derive, do not touch `answer_schema`, do not change `created_at`.**

The cost was real and is recorded as such: published content was changed on a detector's first
pass, with no reconciliation step. That is what P-DB5 now prohibits, and what
`npm run scan:halfway` now enforces structurally.

## ✅ PUBLISH-FLIP TRAP — RESOLVED IN CODE 2026-07-29 (branch `feat/sit-marking-and-gate`, unmerged)

> ## ✅✅ FULLY CLOSED 2026-07-29 — THE FLIP IS DONE AND THE PAPER IS LIVE
>
> **P-DB2 write executed on Grant's explicit approval.** All three cases flipped
> `status: candidate → approved`, `published: false → true`, by EXPLICIT ID, `mock_only`
> untouched. **P-DB4 post-verify PASS:** 15 columns × 3 rows = 45 fields compared with a
> recursive key-sorted canonicaliser (jsonb key order cannot cause a false alarm); key sets
> identical; **the only fields that moved were `status` and `published`, on all 3 rows.**
> Pre-flip reconcile: the AFM approved-set was **0** — nothing un-reviewed to demote.
> Snapshot: `docs/rollbacks/AFM_mock1_publish_flip_20260729.json`, committed BEFORE the write,
> and the write refused to run until it reconciled byte-for-byte with the live rows.
>
> **Serve proven END-TO-END** through the deployed production route with a real authenticated
> session (not a replication): `GET /api/acca/sit` → **200** (was 404 pre-flip), 3 cases in
> paper order, **8 requirement slots** grouped by case with ascending order within each,
> **every LO code stripped** at the serve boundary (`(i) B3e — 10 marks` → `(i) — 10 marks`,
> all 8 shown against their stored form), and `marks_guide` / `professional_skill_tags` /
> `intellectual_level` / `model_answer` / `hint` / `full_reveal` / `answer_schema` / `lo_code` /
> `command_verb` **absent from the whole payload**.
>
> **THE PAPER IS VIRGIN.** 0 progress rows, 0 attempt rows, 0 marking rows across the three
> cases for ALL users — verified before AND after the synthetic user was deleted. The proof used
> GETs only; the sit GET writes nothing, so **the clock has never started**. The paper has not
> been sat.
>
> **✅ THE EXPOSURE BELOW IS CLOSED (same day).** Both id-addressed routes now refuse `mock_only`
> unless the requester holds an OPEN, UNCOMPLETED attempt **for that case's own paper**, and serve
> it with the sit route's full withholding even then. See the section immediately below for the
> transitional carve-out and the one open decision (`marks_guide`).
>
> **⚠ KNOWN EXPOSURE, pre-existing and NOT introduced by this flip.** `mock_only=true` keeps the
> three cases out of `case/list` (verified live: AFM list 0 cases, APM list 5, zero mock ids in
> either). But the **id-addressed `GET /api/acca/case` has no `mock_only` filter**, so an entitled
> user holding a case id can fetch the mock's requirements *with* `marks_guide`,
> `professional_skill_tags` and `lo_code`, and practice mode would teach on them. Verified
> identical on the APM mock cases, published for months — this is how `mock_only` has always
> worked. Worth a decision at some point (a `mock_only` guard on the id-addressed route, or
> accepting it since ids are not discoverable from the list); **not** a blocker and **not** a
> regression from this change-set.
>
> ---
>
> **Historic status line, retained:** the trap below was CLOSED as a code problem and OPEN as a content step. The inverted
> gate is retired — `app/api/acca/sit/route.ts` now gates on `mock_only=true AND status='approved'
> AND published=true`, the same gate as `app/api/acca/case/*`, behind the same `APM_CASES` flag and
> `hasActiveACCAAccess` entitlement. The email allowlist is deleted. Answer writes moved to
> `app/api/acca/case/turn` with `sitting:true`, taking the immutability rule with them (409
> `already_submitted`). Option (a) of the two below was taken, in the form Grant ruled.
>
> **The flip is now a normal P-DB2 content step, and is still NOT DONE.** Nothing in that branch
> writes to the DB. **Until the flip, `/acca/afm/mock` serves nothing** — the standard gate finds no
> approved+published row and the route returns 404 "Paper not available". That is the intended
> intermediate state, not a regression: the surface is dark until the content it serves is live.
>
> **PRE-FLIP CHECKLIST (all must hold before the three rows are flipped):**
> 1. ~~`feat/sit-marking-and-gate` is **merged and deployed**~~ — **DONE 2026-07-29, merged to
>    `main`.** Flipping before this would have published a paper whose only surface still ran the
>    inverted gate, i.e. the original trap. Verified pre-merge: band→marks mapping exercised with a
>    real denominator (6 non-`nothing` bands, none scoring 0) and the retired inverted combination
>    pinned as a must-fail fixture, so the trap cannot silently return.
> 2. ~~`APM_CASES=1` is confirmed set in **production**.~~ **DONE 2026-07-29 — CONFIRMED SET.**
>    Measured behaviourally (no Vercel CLI; the MCP project payload carries no env): the flag check
>    is the FIRST statement in all five flagged routes and 404s *before* auth, so unauthenticated
>    404 = off and 401 = on. Production returned **401 on all five**; the control
>    `GET /api/acca/sit` returned **404** (current prod still runs the allowlist gate), proving the
>    probe separates the two rather than a blanket auth wall answering 401. The literal dashboard
>    value was not read — `vercel env ls production` if that is ever wanted on the record.
> 3. The flip is by **EXPLICIT id** for the three cases, reconciled against the journal first, per
>    the standing publish-flip rule. Marking is live from the moment they publish: `case/mark` with
>    `sitting:true` will serve them.
> 4. The three cases stay `mock_only=true` — the practice library lists `mock_only=false`, so this
>    is what keeps a mock case out of the practice catalogue once published.

**Original entry, recorded 2026-07-26. Retained verbatim as the record of what the trap was.**

The three AFM Mock Paper 1 cases — `aa000000-…-a001` Solenne Industries SA (A, 50),
`aa000000-…-b101` Brecon Renewables plc (B, 25), `aa000000-…-b201` Aldebrino SpA (B, 25) — are
currently `status='candidate'`, `published=false`, `mock_only=true`.

**The sit surface's gate is INVERTED.** `app/api/acca/sit/route.ts` serves a case only while it
is `paper_code='AFM' AND mock_only=true AND published=false AND status='candidate'`. Being
**unpublished is what makes these rows servable there** — the inversion is deliberate, so the sit
surface and every live route have disjoint servable sets by construction (see
`lib/acca/sit-preview.ts`).

**Therefore a normal publish flip does not "go live" — it BREAKS the sit page.** The moment these
rows flip to `approved`/`published=true` they stop matching the inverted gate, and
`/acca/afm/mock` starts returning 404 "Paper not available" (the route requires all three cases to
resolve). This is the opposite of the usual flip risk: the danger is not that unpublished content
leaks, it is that **publishing silently removes the only surface that serves it**.

**The flip is therefore not a status change — it is a change-set.** It must, in the SAME
change-set, either (a) retire the sit surface in favour of the standard case routes, or (b) change
the sit gate to match the new publish state. Deciding which is Grant's call and has not been made.
**GATE-P does NOT authorise this flip**: GATE-P covers a status change on already-reviewed content
whose serving behaviour is unaffected, which is precisely not the case here. Do not flip.

## ✅ RESOLVED — HALFWAY_ROUNDING_RISK is GREEN; PIECE 2 (exact-figure parsing) IS UNBLOCKED

**Closed 2026-07-25 (FR3 follow-up). Branch `fix/afm-boundary-rounding-reauthor` — NOT merged,
awaiting Grant's review; the DB rows are already written (see the write-vs-merge note below).**

> **⚠ SUPERSEDED IN PART (2026-07-26).** The re-author described below was driven by a detector
> finding that did not reconcile against live data — see the B3k CLOSED RULING above. The work
> itself was sound and the resulting rows are correct; the *justification* for doing it was not.
> The gate has since been corrected (`absorbs` now classifies advisory vs blocking rather than
> only changing the message text), so a tolerance-absorbed hit no longer fails the barrier.

The gate that blocked Piece 2 — `validateHalfwayRounding` (GATE HALFWAY_ROUNDING_RISK,
`lib/acca/validate-schema.ts`) — now reports **0 rendered boundary hits across all 49 published
AFM numeric drills** (was 5). Piece 2 — live parsing of the student's OWN figures and verdicting
them against `answer_schema` tolerances — **is no longer blocked on this**. Piece 2 itself is
untouched by this work.

**What was done.** All 5 drills re-authored end-to-end through their live calculator family
(`apv` / `irr` / `capm` / `valuation`) and the durable barrier in
`lib/acca/case-authoring-gates.ts` (GATE1–3, P4–P9, GATE 26, TAX_RATE_ASSIGNMENT,
HALFWAY_ROUNDING_RISK, GATE 27 + family gates) — **no hand-edited prose, no SQL patching**. The
FR3 note said none of the 5 was re-derivable from `answer_schema.params`; that was true of the
params, but every missing input (the per-year operating cash-flow build, the betas,
`project_return`) is stated verbatim in each drill's OWN `context_text`, so full re-derivation
was possible. Every rebuilt component matched its stored `expected_value` **exactly**, which is
what proves the recovered inputs were right — the only figure changes are the ones below.

| drill | figure | exact value | was printed | now printed |
|---|---|---|---|---|
| `B1c 796651c2` | `ncf_1` | 47.15 | `47.1` | `47.2` |
| `B3d 2a145f7d` | `company_ke` | 11.275 | `11.27%` | `11.28%` |
| `B3j 34f9e897` | `ncf_1` | 449.35 | `449.3` | `449.4` |
| `B4a 0dc970a8` | `ke` | 11.675 | `11.67%` | `11.68%` |
| `B3k dedca530` | `debt_issue_costs` | −1.95 → **−1.30** | `-1.9` | `-1.3` (input re-picked) |

**`B3k` is the one drill that needed a PARAM re-pick, and the reason is worth keeping.** Rendered
through `fixedHalfUp` it correctly prints `-2.0` and the real hazard is gone — but the gate still
FAILS CLOSED, rightly: the unsigned artefact string `1.9` also appears in that answer as the
year-4 tax charge (`PLN 1.9m`), so the gate cannot attribute the two from text alone. Rather
than weaken a safety gate to pass a change, the remedy the gate message itself offers was taken —
debt arrangement fee **3.0% → 2.0%** (65 × 2.0% = 1.30, exact at every display precision). The
pedagogical target is unchanged (gross-vs-net issue-cost convention; debt-vs-equity APV ranking)
and the code-owned `financing_choice` does **not** flip — debt still wins, APV 7.0 vs 2.5 (was
6.3 vs 2.5). The scenario's own raw-input bullet was updated to match (`context_text` is a
stored literal — PROSE OWNERSHIP RULE).

**LATENT hits: 4 confirmed unchanged, all inert.** `B1a 4e6df0b6` `ncf_2` (4dp) · `B1c 712cf3aa`
`ncf_1` (2dp) / `ncf_2` (4dp) · `B3j 34f9e897` `ncf_2` (3dp). None fell out naturally and none
needed to: every one is a tie at a precision the prose **never renders** (all four display at
1dp, where they are unambiguous), so no code-vs-student disagreement is reachable. `B1a
4e6df0b6` and `B1c 712cf3aa` were not re-authored — nothing in them required it. (`E3a
f088daa5` `closing_price` remains the known FR3 non-issue: a 1dp tie rendered at 2dp.)

**Library fixes this surfaced — the FR3 conversion was incomplete.** `capm.ts` / `npv.ts` /
`apv.ts` routed rate display through `fixedHalfUp`; **`valuation.ts` and `irr.ts` did not**, and
that raw `toFixed(2)` is exactly what printed `B4a`'s Ke as `11.67%`. Both now use it. GATE 27
also fired on four genuine orphan derived figures never previously checked (it has never run on
these drills), each fixed the way `capm.ts`'s `kd_after_tax` already established — promote the
derived value to a NAMED field rather than compute it inline: `CapmComputed.weight_equity` /
`.weight_debt`, `ApvComputed.subsidy_spread` / `.side_effects_total`, and the exported
`equityDivergenceRatio()` in `valuation.ts` (it spans two objects, so it is a shared helper
rather than a result field). `runFamilyGates` gained a **`B4a`** branch (VAL-11 flow/rate/bridge
+ VAL-11b equity-divergence reconciliation), per that module's own extension rule.

**WRITE-vs-MERGE, stated plainly:** the 5 `acca_drills` rows are **already updated in the live
DB** — a DB write is not branch-scoped, and the "0 rendered hits" sweep above is a measurement of
production, not of the branch. `status`/`published` were NOT touched (all still
`approved`/`true`); no publish flip occurred. Rollback snapshot of the exact pre-write
`model_answer` / `answer_schema` / `context_text` for all 5 rows:
`ClaudeSend_boundary_rollback.json` (repo root, untracked).

**✅ CLOSED — review packs regenerated and AUDITED (2026-07-25).** All 34 declared per-drill
section bodies across the six packs now match the live DB byte-for-byte (verified by a
section-level audit, not by eye). Two things the audit changed about the story:

- **One of the six was never stale.** `AFM_IRR_BATCH2_REVIEW_PACK_R2.md` came out **0/1
  diverging** — the "six stale packs" claim came from a grep for drill ids, which proves a pack
  MENTIONS a row, not that it quotes a body that moved. That pack quotes only `796651c2`'s
  `hint`, which this work never touched. **Standing lesson: audit the bodies, never infer
  staleness from an id grep.**
- **Two divergences PREDATED this work**, in `AFM_IRR_BATCH2_REVIEW_PACK.md` DRILL 1: its
  `context_text` was missing the loss-relief line added by the APV batch's own FIX 1
  retrospective, and its `hint` still had the pre-FIX-5 wording. Both were amendments made in
  earlier rounds and never back-copied into the round-1 pack. Now current, and flagged in-pack.

`B3k dedca530`'s delta (scenario bullet, arrangement fee, `debt_issue_costs`, `apv_debt`) carries
a before/after banner at the TOP of both APV packs so a cold reviewer sees it without diffing.
The two R2 delta packs carry a banner saying their bodies are current-state, not frozen-at-round-2.

**🔻 FOUND BY THE PACK AUDIT — my own re-author silently drifted two `answer_schema.params`
(now corrected).** The first write reported "all components as stored" and that was true, but it
checked COMPONENTS ONLY: `B3d 2a145f7d` had `own_ve`/`own_vd` rewritten 48200/12600 **→ 0** (the
`wrong_hurdle` maths never reads them, so `buildCapmSchema`'s `?? 0` default silently won when the
re-author omitted them), and `B4a 0dc970a8` had `kd` rewritten 0.057999999999999996 **→ 0.058**
(the scenario states 5.8%, and the original generator passed `5.8` for `asDecimalRate` to
normalise). Neither moved a component enough to trip the drift check. Both restored to the
originally-published values in a second write; `model_answer` diff was 0 lines, all gates
re-passed. **The re-author script now checks params with EXACT equality alongside components** —
that gap is the reason a downstream audit, not the write's own verification, caught this.

**✅ toFixed AUDIT — the FR3 sweep WAS incomplete; the invariant is now total, not judged.**
FR3 claimed 24 formatters converted; `valuation.ts` and `irr.ts` were missed, which is what
shipped `B4a`'s `11.67%`. Rather than re-judge site by site (the method that failed), **59
further call sites across 9 calculator modules** were converted so that *every figure a student
sees* renders through `fixedHalfUp` — discount factors, credit spreads in bp, computed
percentages, profitability indices, betas, probabilities, BSOP d1/d2 + N(d), stated fractions
rendered as whole percentages, contract counts and the pre-rounding contract quotient. **27 raw
`toFixed` code-line sites remain and every one is intentional:** 10 are THE DETECTORS (the naive
rendering is the thing being detected — `validate-schema.ts`, `derived-figure-integrity.ts`,
GATE 2's dual-form check, and `fixedHalfUp`'s own final render) and 17 are author-facing
diagnostics (`throw` text, validator `reason:` strings, a lookup key). The invariant and the
exact two permitted classes are written into the header of `lib/acca/rounding.ts`, so the audit
is a one-line grep: `grep -rn "toFixed(" lib/acca/*.ts | grep -v fixedHalfUp`. Behaviour-neutral
by construction and proven so — all 18 calculator fixture suites pass unchanged, `tsc --noEmit`
clean, `next build` green.

**🔹 INERT / GATE-HARDENING — HALFWAY_ROUNDING_RISK cannot attribute a shared artefact string.**
The `B3k` case above is the general form: when the naive rendering of component A's value also
appears in the prose as an unrelated figure B, the gate fails closed and the author cannot clear
it except by re-picking inputs. That is the safe default and no change was made, but it means a
correctly-rendered figure can still block. If it recurs often enough to be a nuisance, the fix is
attribution (match the token in its own row/sentence context), not relaxing the check.


## ✅ MOCK ENGINE — PHASE 1 PRECONDITIONS DONE (2026-07-25); RULINGS CLOSED; NO CASE CONTENT AUTHORED YET
**Phantom-spec finding (Step-0, 2026-07-25):** `AFM_COVERAGE_CONTRACT.md` and `PRODUCT_STRENGTH_STANDARD.md` both asserted mocks are *"generated by the exam-rehearsal engine specced in AFM_SURFACED"* — no such spec ever existed in this file; the only mock content here was the bare gap note + the EXAM REHEARSAL product-roadmap entry (positioning/pricing, not an engine architecture). Both docs corrected 2026-07-25 to the ruled doctrine below; this entry is the log of that correction, not a new spec.

**RULINGS (CLOSED, Grant, 2026-07-25):** mocks are **case-native authored content** (matches APM's own live, proven pattern — atomic drills can't compose into a coherent multi-requirement case, per the design note in `20260701120000_acca_cases.sql:15`) with **fully code-owned marking per requirement** (calc engine owns numeric figures/verdicts, `narrative-marker.ts` owns discursive verdicts, `case-marking.ts` owns the PS band→apportion conversion) — **reusing the live, paper-agnostic APM case/mock orchestration as-is**. **NO parallel/generative case engine.** Section B PS gate = ≥2 of {Analysis & Evaluation, Scepticism, Commercial Acumen} (Communication is Section-A-only per the syllabus's own §7 wording — confirmed verbatim, see below).

**Phase-1 precondition work completed this session (ground cleared; still zero AFM case content authored):**
1. **Paper-leak fix, live APM routes** — `app/api/acca/case/{route,turn,mark,list}.ts` + `lib/acca/mocks.ts`/`app/api/acca/mock/route.ts` now filter by `paper_code`/`paper` (via the shared `resolvePaper`, default `'APM'` — no existing entry point changes behaviour). Proven: the new APM-scoped list query returns the byte-identical 5-row set (same ids, same order) as the old unscoped query; a temp AFM stub row (inserted, tested, deleted — 0 rows post-delete verified) correctly excluded from an APM-scoped fetch and correctly included in an AFM-scoped fetch. `next build`-equivalent `tsc --noEmit` clean.
2. **`mock_only` untracked-migration debt — BACKFILLED (5th instance of this debt class, logged in `memory/project_migration_hygiene`).** `acca_cases.mock_only boolean not null default false` existed live with no tracked file (`20260701120000_acca_cases.sql` didn't add it; `20260708120000_reconcile_apm_case_publish_state.sql` already assumed it). New file `supabase/migrations/20260703140000_acca_cases_mock_only.sql` (idempotent `ADD COLUMN IF NOT EXISTS`, column def confirmed against live `information_schema.columns`) — **written, NOT applied to prod** (verified no-op there; the point is fresh-env parity).
3. **PS-descriptor page-verification (AFM's OWN syllabus, §7/"F Professional skills", p.13, S26-J27 PDF) vs `case-marking.ts`'s `SKILL_DESCRIPTORS` — MATERIALLY DIFFERENT, not just paraphrase drift.** `case-marking.ts`'s text is confirmed APM-specific (contains APM-only concepts absent from AFM's syllabus entirely — "measurement and management of objectives", "behavioural, process and system-related issues" — and AFM's own "Analysis and evaluation" descriptor has a 4th sub-point (d) with no analogue in the current text). **No edit made — awaiting Grant's ruling** on whether AFM needs its own descriptor set (`case-marking.ts` currently has no paper parameter on `SKILL_DESCRIPTORS` at all — a structural change, not a wording patch, if AFM gets its own).
4. **Contract-doc reconcile done** — `AFM_COVERAGE_CONTRACT.md` "Mock exams" section + `PRODUCT_STRENGTH_STANDARD.md` non-negotiable #4 rewritten to the ruled doctrine above (no more "generated"/"do not hand-author" language).

**NEXT (not started, awaiting Grant):** (a) rule on the PS-descriptor diff — reuse APM's wording as-is, or author an AFM-specific `SKILL_DESCRIPTORS` set (page-verified quotes ready, see journal); (b) rule on the assembly-model choice already closed above (case-native authored — no further ruling needed, noted here for continuity); (c) once (a) is ruled, Phase 2 = actual AFM case content authoring (Section A + 2× Section B, per §7's exact structure) can begin.

**🔹 INERT / GATE-HARDENING (not a new numbered category) — GATE3 SEEDED-OFR BLIND SPOT, found in Mock Paper 1 co-founder recompute (2026-07-25).** When a component's magnitude is small versus its ABSOLUTE tolerance, the ×0.85 OFR perturbation can stay within tolerance → GATE3 verdicts the seeded-wrong root `'correct'` (should be `'incorrect'`) and the dependent's `'carried'` path goes untested. Trigger condition: `0.15 × magnitude < absolute_tolerance` (e.g. `unexpired_basis` below ~0.067 at the family's ±0.01 tolerance). **Not a figure defect anywhere shipped** — the mock's B2(i) IR-futures scenario was sized around it during authoring (basis widened to 0.45→0.15 specifically to clear GATE3; see `docs/reviews/AFM_MOCK_PAPER1_REVIEW_PACK.md`) — but it is a **latent gate gap across every calc family**, not scoped to irhedge. **Harden:** scale the OFR perturbation to guarantee it exceeds the component's own tolerance (perturb by `max(15%, tolerance × k / magnitude)`) rather than a flat ×0.85. No code change made — log only.

**🔹 INERT / SIT-SURFACE HYGIENE — CANDIDATE-FACING ARTEFACT AUDIT, `/acca/afm/mock` (2026-07-26).** Full sweep of everything the sit surface can put in front of a candidate. **FIXED this session:** requirement labels leaked the internal syllabus code — the stored label is `"(i) B3e — 10 marks"` and was rendered verbatim. Now derived to `"(i) — 10 marks"` by `sitDisplayLabel()` (`lib/acca/sit-preview.ts`), applied at the **serve boundary** in `app/api/acca/sit/route.ts` rather than in the component, so the code never reaches the browser at all (UI-only stripping would still ship it in the JSON payload). `lo_code` is now READ by the route to make the removal exact and is then discarded — never served. **Nothing stored changed**: the `label`/`lo_code` columns are untouched, so marking and debrief still read the code straight off the row, and `docs/reviews/AFM_MOCK_PAPER1_REVIEW_PACK.md` (which quotes the stored labels) remains accurate and was not touched. 25 new fixtures in `scripts/test-sit-preview.ts` (35→60), pinning all 8 real labels verbatim plus the property-level assertion that no candidate-facing label matches the syllabus-code shape. **Body content swept CLEAN** — all 3 `scenario_intro`s, 11 exhibit titles/bodies and 8 question bodies checked for syllabus codes, mode words (quantitative/mixed/discursive), gate names, PS tags, status strings (`candidate`/`mock_only`) and UUIDs: zero hits. Confirmed never selected: `marks_guide`, `professional_skill_tags`, `intellectual_level`, `command_verb`, `model_answer`, `hint`, `full_reveal`, `answer_schema`.

**🔹 CANDIDATE-VIEW PACK EXPORTED — `docs/reviews/AFM_MOCK1_CANDIDATE_VIEW.md` (2026-07-27).** A blind-answerer QA artefact: the 3 `scenario_intro`s, all 11 exhibit titles/bodies in `exhibit_order`, and the 8 requirements in paper order (label + question body + marks), plus section headers and case `total_marks`. Nothing else. Read-only export — no DB writes, and a throwaway exporter that selects candidate-facing columns by EXPLICIT name (never `*`), so the answer side cannot leak by accident. Verified by grep at zero hits for every excluded field name, for the syllabus-code shape, for UUIDs, and for the six answer-side figures Grant named (0.937 / 0.938 / 1.239 / 11.93 / 9.59 / 15.1). Two candidate-facing derivations, both display-only: the stored label's syllabus code is stripped via `sitDisplayLabel()` (as the live sit surface does), and the question body's own leading part marker + trailing "(N marks)" are removed ONLY where they exactly duplicate the label and `marks_guide` already printed alongside. **This is a DB SNAPSHOT** — it quotes all 3 cases' bodies, so any content write to Mock Paper 1 makes it stale and it must be re-exported alongside `AFM_MOCK_PAPER1_REVIEW_PACK.md`.

**→ TWO OPEN ITEMS, REPORT-ONLY, AWAITING GRANT'S CALL (no change made).** Both are shipped in the API payload but rendered by nothing — devtools-visible only, not on-screen: (a) **`professional_skills_marks`** — the per-case PS mark split is an internal authoring figure; a real paper states "professional marks will be awarded" (which `scenario_intro` already does) without a per-question number. Recommend dropping from the response. (b) **`attempt.ends_at`** — the nominal 3h15m stamp, written only to satisfy the NOT NULL column and read by nothing; shipping it implies a countdown this surface deliberately does not have. Recommend dropping from the response, keeping the column write. Case/requirement **UUIDs stay** — the submit POST addresses a requirement by id, so they are structurally required.

## LOCKED — POST-COVERAGE PRODUCT LAYER (ruled 2026-07-22, `docs/GRADD_PRODUCT_ROADMAP_POST_COVERAGE.md`)
Next product layer once AFM is EXAM-READY (drills + mocks + the marking engine — not merely
"content complete"): **PS-skills coaching (top priority)**, spaced return to weak areas, and
time-pressure/timing practice. A kill list of rejected ideas is on file in the roadmap doc. **Do
NOT build any of this pre-coverage** — it is strictly gated on AFM reaching exam-ready, not a
parallel workstream. Calculator #11 (FX hedging) is coverage work and precedes this gate.

## ✅ CALCULATOR #11 FX HEDGING (E2b) — LIVE (GATE-P flip, 2026-07-23)
Step-0 evidence → `lib/acca/fxhedge.ts` (engine + GATES 15–19) → FIX ROUND 1 (3 majors: K2 lock-in
one-sided formula, K3 premium unsourced interest-rate import, K4 quote-direction inversion) → FIX
ROUND 2 (GPT adjudication, all 4 figure sets accepted unchanged) → co-founder recompute + blind GPT
review → adjudicated → **flipped**: all 4 drills (K1 `51163dac`/K2 `1528e10f`/K3 `359207f6`/K4
`ba811dd0`) approved+published — the first-ever AFM section E rows. Pack:
`docs/reviews/AFM_BATCH_FXHEDGE_REVIEW_PACK.md`. Full detail: `APM_BUILD_CONTRACT.md` 2026-07-22/23
entries. Grant's student walk still owed (post-flip, non-blocking).

## ✅ CALCULATOR #12 INTEREST-RATE HEDGING (E3a) — LIVE (GATE-P flip, 2026-07-24)
Step-0 evidence (T4–T7 technical articles + Abertafol/Sohbet/Northney examiner reports, registered in
`docs/evidence/sources.json`) → both Phase-1 source conditions resolved favourably (swap = Style A per
T4's AFM-tier "Suggested swap"; borrower collar confirmed verbatim via ACCA's "Options" page) →
`lib/acca/irhedge.ts` built (4 kinds: futures/options/collar/swap; GATES 20–25; SHARES ZERO CODE with
`fxhedge.ts` — the premium/basis/lock-in conventions are structurally different by design) →
`test-irhedge.ts` (94 checks, reproduces T5's own worked futures example + Abertafol's premium +
T4's swap arithmetic exactly) → 4 drills authored direct-to-DB via a one-off gitignored script
(`scripts/_author_irhedge_batch.ts` — **no `--irhedge-batch` generator wiring exists yet**, a future
batch needs either a repeat of that script or proper generator wiring) → all gates 1/2/3 + P4–P8 +
20–25 PASS → FR1 (2 wording-only fixes: position-sensitive futures gain/loss convention;
K1 "guaranteed" → "locked in" register fix, zero-hit sweep proof) → co-founder recompute + GPT
adjudication → **flipped**: all 4 drills (K1 `56989d69`/K2 `1c133573`/K3 `f088daa5`/K4 `26a4167b`)
approved+published — the second AFM section E family. Pack:
`docs/reviews/AFM_BATCH_IRHEDGE_REVIEW_PACK.md`. area-entry ranked 74–77 (K1 futures = entry).
Coverage-contract synced same session. Grant's student walk owed (post-flip, non-blocking).

## ✅ E-NARRATIVE CLUSTER (E1a×2 + E2a×1) — LIVE (GATE-P flip, 2026-07-24)
Step-0 evidence (SD24 p.4 Northney, SD25 pp.13-14/p.13 Passmore, F9 J16 p.5 — registered **S3** —
for the E2a "named-but-not-described" mode) → both ambiguities ruled (E1a takes 2 of the 3 slots —
establishing/relocating + positive-financial-contribution, each independently evidenced; E1b
deferred to exam-ready; "internal vs external hedging" confirmed NOT ACCA vocabulary) →
hand-authored rubrics (not generator-drafted) via a one-off gitignored script
(`scripts/_author_enarrative_batch.ts`) so every criterion carries a cited `evidence_anchor`
(RE-ENABLED for this batch, provenance-only, never served) → all gates N1–N5 PASS on the REAL
constrained grader + P4/P7 lints → FR1 (GPT-requested: EN3's translation-priority sentence
softened from "warrants little more than awareness" to name a concrete reason it still matters —
reported gearing / loan covenants — while keeping the committed transaction-first priority; one
further hit found + fixed in `full_reveal`; re-gated N1+N4 clean before the write) → co-founder
review + GPT adjudication → **flipped**: all 3 drills (EN1 `55181aa8`/EN2 `d0be009d`/EN3
`f9f4f3d4`) approved+published — the first narrative content in Section E. Pack:
`docs/reviews/AFM_BATCH_E_NARRATIVE_REVIEW_PACK.md`. **area-entry ranked 80–82** (strictly above
the E-calculators 70–77, not merely above fxhedge K1 — the ordering subtlety this cluster needed
its own rule for; proven with real mixed data in `test-area-entry.ts` AND against live post-flip
rows: E2's `pickEntryDrill` still returns fxhedge K1 with EN3 in the same area fetch). **Narrative
cluster's VIABLE-TIER quota now MET: 8/8 (5 B + 3 E) — only the mock-rehearsal engine remains to
close that tier.** Coverage-contract synced same session. Grant's student walk owed (post-flip,
non-blocking, same pattern as calc #11/#12).

## ✅ AD-MEASUREMENT BLIND SPOT — FIXED + LIVE-FIRE VERIFIED 21/07 (was: blocks the December campaign)
Ad autopsy (07/07–21/07) found the app could not see ad-driven traffic AT ALL: all-time, zero of 11
profiles had a non-null `signup_attribution`, and the only `resit_runs` row that had ever existed was a
manual test. Root cause: `AttributionCapture` (the `gradd_attr` first-touch cookie capture) was wired
into `ACCALandingPage.tsx` + `ProductLandingPage.tsx` but **not** `app/acca/resit/page.tsx` — the free
resit diagnostic `app/sitemap.ts` itself calls the "primary CTA" (priority 0.9). **Fixed same day**:
`AttributionCapture` added to `/acca/resit` (commit `992a2fb`) — plus a full sweep of every
campaign-reachable page (resit/afm/acca/apm/ib-landing/proof) surfaced TWO more real gaps, `/ib`
(`IBLandingPage.tsx`) and `/acca/afm/proof`, both fixed the same session (commit `36e8e6e`). **Live-fire
proved end-to-end**: a real browser hit `gradd.ai/acca/resit?utm_source=livefire&utm_campaign=gate_check_v2`,
walked the full diagnostic, and a `resit_runs` row landed with the correct attribution
(`3af6daa0-cbcb-4b1e-aead-be9ca75465ab`) — not just "the code looks right." **July verdict revised**:
that spend (if it ran) was unmeasurable, not failed — no traffic-quality/landing-page/offer conclusion
can be drawn from a zero-attribution dataset. December inherits "instrument, live-fire, then spend."
Funnel-entry event (pre-signup, anon_id-keyed, mirroring `acca_funnel_events`) remains a nice-to-have,
not fixed. Full detail: `APM_BUILD_CONTRACT.md` 2026-07-21 "ATTRIBUTION FIX + LIVE-FIRE" entry.

**Standing rule (instrumentation discipline):** an instrumentation claim requires a live-fire DB row,
never code presence. First-touch cookie logic, ad-blockers, consent gates, and stale browser state can
silently no-op a structurally-correct implementation — code review or "the import is there" is not
proof. Re-verify per landing page before spend, not just once at the mechanism level.

## BACKLOG — session history / revision review (December-window candidate feature)
**Gap:** `/acca/progress` is an aggregate stats dashboard (activity sparkline, weak areas, stuck-drill
resume links, a 12-row recent-attempts table) — every "Revisit"/"Resume" link re-enters the LIVE tutor
chat; there is **no read-only past-conversation review** anywhere in ACCA. IB has exactly this feature,
proven and working: `/sessions` (list, `SessionListClient`) → `/sessions/[id]` (read-only transcript,
`TranscriptRenderer` built on the same `MessageRenderer` the ACCA proof-transcript page + live tutor
chat already share), reading `sessions`+`session_messages`+`session_events`+`lessons`.
**Portability: HIGH.** `acca_drill_messages` already carries everything needed per (user_id, drill_id) —
role/content/call_type/outcome/created_at, chronologically orderable, reveals included verbatim
(confirmed directly this session — the D5 walk transcript pulled for the proof page came straight from
this table). `TranscriptRenderer` needs only its IB-specific diagram-signal parsing stripped (ACCA
drills carry no diagrams) and its header adapted from lesson/session metadata to the drill's own
question/context_text.
**Size: M.** Two new routes mirroring `/sessions`→`/sessions/[id]` (a history list + a per-drill
transcript detail) + one adapted component + a paid/free gate decision (consistent with
`/acca/progress`'s existing locked-slot pattern). No new tables, no schema change — this is wiring +
UI, not a new data model. **Recommended slot:** December-window feature (revision/exam-prep framing —
"review what Ezra told you" — fits the sitting-window narrative already anchoring the ads timeline).

## BACKLOG — PASTE-RESOLUTION GUARD (December-window candidate, ruled 2026-07-22 off the X1 diagnosis)
**Gap:** the attempt/diagnose pipeline has no check for near-verbatim overlap between a student's
"attempt" and the drill's own `model_answer`/golden content — on the X1 red-team probe's founding run
(2026-07-15, `docs/redteam/prod-autoscan.md`) a pasted model-answer excerpt was once judged a **correct**
attempt (`call_type=correct`). No figures leaked and the check was retired as a stale expectation (see
the X1/X2 ruling above), but the underlying gap is real: a student who pastes model-answer prose (their
own, a friend's, or lifted from the new public `/acca/afm/proof` transcript page — the exact mechanism
that makes this live, not hypothetical) risks being credited as having solved it themselves.
**Fix direction:** reuse the narrative pipeline's existing overlap detectors —
`scenarioCopyOverlap`/`longestVerbatimRun` (`lib/acca/narrative-marker.ts`, already deterministic,
already fixtured) — against `model_answer` (not `scenario` as in the narrative case) to flag a
near-verbatim attempt BEFORE it reaches `call2_diagnose`. A flagged attempt must not be judged
correct/resolving; the leg should ask for the student's own-words working instead, same spirit as the
existing gibberish/noise handling. **Size:** small-to-medium — the detector functions exist and are
proven; the new work is the model-answer-vs-attempt overlap wiring + a guard state before the diagnose
call + the redirect copy. **Recommended slot:** December-window, batched with the session-history
feature above (both touch the same read/attempt surfaces).

## PERSONA-HARDENING SLOT — consolidated (7 categories, spans batches #9/#10/#3/narrative)

**⛔ AD-SPEND BLOCKER — MECHANISM SHIPPED 2026-07-21, VERIFICATION (Grant + co-founder spot-walk) STILL OWED.** Design-then-build session delivered the grounding mechanism ("Rule 24 triangulation," `lib/acca/tutor-grounding.ts` + wiring — CLAUDE.md code map has the full entry) targeting all 7 categories below. **RED-GREEN discipline applied:** 7 new red-team probes (PH1–PH7, one per category, `scripts/redteam-probes.ts`) fired against the UNMODIFIED prompts first — 4 showed reliable, reproducible failures (PH1 false-complete, PH2 hint-base-wobble, PH4 convention-softening, PH6 fog-retraction); PH3 (invented-inventory) and PH5 (false-positive-diagnosis) did NOT reproduce a reliable failure despite multiple good-faith redesigns — documented honestly as a lower-frequency/probabilistic risk rather than forced. Post-fix: all 7 probes GREEN, `next build` green, zero regression on the existing 45-probe suite (2 pre-existing unrelated flakes on X1/X2 confirmed via git-stash to predate this session entirely) and the 75-check offline fixture suite. **Claim discipline: this is an LLM-prompted behavioural improvement, not a deterministic code gate** — PH4/PH6 repeated-sampling showed ~80–90% clean, a large improvement over the RED baseline but not a hard 100% guarantee (unlike the numeric figure-withholding moat, which IS structural). **STOP called per the task's own instruction — no live walk performed by the builder; Grant + co-founder spot-walk verifies before the ad-spend condition is considered cleared.**

**✅ X1/X2 RULED 2026-07-22 — CLOSED (`APM_BUILD_CONTRACT.md` same-date entry — full detail there).** Both were stale probe expectations from the suite's founding commit (`85ba57c`, 2026-07-15) — never a regression. **Ruling:** `is-earn-redirect` dropped from both probes' `autoChecks` in `scripts/redteam-probes.ts`; each now checks only what actually matters (`no-figure-leak` / `no-reveal-content`, X1 keeps `humanEye`). Probe `expect` text rewritten to the two legitimate not-yet-earned behaviours. **"just tell me" → conceptual teach + counter burn is RULED INTENDED behaviour** (X2) — not a bug, not to be changed. One residual watch-item carried into the PASTE-RESOLUTION GUARD backlog item below (X1's founding-run "correct" verdict on a pasted excerpt).

Every conversational-leg quality issue found across walks lands here, not scattered per-batch. **Fix mechanism (ONE fix, not per-category patches):** inject a rubric/key-facts-in-context payload into ALL conversational legs (diagnose/confirm/hint/close), so the persona is grounded against the drill's OWN criteria, scenario facts, and failure-mode list rather than reasoning about the student's answer from scratch each turn. **Lands narrative-first** — narrative rubrics already carry the exact shape needed (`criteria[]`, `scenario_facts[]`, `disqualifiers[]`) with zero extraction work; **numeric families are a follow-on retrofit phase** (they have no equivalent rubric object yet — would need a key-facts extraction step per calculator family before the same mechanism applies). **Scope as ONE focused session** — do not attempt to patch categories piecemeal across future batches; the next persona-hardening session builds the mechanism once and it should collapse all 7 categories below, not just the newest ones.

1. **⬆⬆ TOP SEVERITY — FALSE-POSITIVE DIAGNOSIS (persona-hardening, sighting #1 — narrative D1 walk 2026-07-21).** The conversational leg flagged a CORRECT student statement as wrong during the walk — the worst class of persona failure seen to date (every prior sighting was a leg being too LENIENT — missing a real error, softening a convention, inventing a follow-up; this is the first sighting of the leg actively CONTRADICTING a correct answer). Directly motivates the rubric/key-facts-in-context fix: a leg reasoning from the actual criteria + scenario facts, not from an ungrounded read of the student's prose, cannot mistake a correct VaR-threshold statement for an error.
2. **⬆ HIGH — FOG-RETRACTION WITHOUT OWNERSHIP (persona-hardening, sighting #2 — narrative D1 walk 2026-07-21).** When corrected (following finding 1's false-positive), the leg retracted but without clearly OWNING the error — the retraction reads as vague ("let me reconsider") rather than an explicit "I was wrong, your statement was correct because X." A student who didn't push back would be left with the false diagnosis unresolved. Same root cause as finding 1 — grounding in the rubric would prevent the error in the first place, but the retraction protocol itself also needs hardening for when a leg IS wrong.
3. **FALSE-COMPLETE (pattern, moderate — batch #9 walk 2026-07-17).** The leg certified a correct-arithmetic-but-missing-signature-insight attempt as complete. Fix direction: per-drill key-insight list → completeness check before resolution → one teaching beat if the signature insight is missing.
4. **HINT-BASE-WOBBLE (batch unspecified in original sighting).** The hint/close layer wobbles on which base a convention should be checked against, letting an error pass uncorrected.
5. **⬆ HIGH — INVENTED-INVENTORY OUTRO (pattern — THREE independent sightings, three batches, sighting #3 2026-07-21).** Persona outros recommend follow-up drills by description that do not exist in inventory. (i) batch #9 walk (2026-07-17) — "capital-intensive lessee", "dividended-out subsidiary"; (ii) batch #10 walk (2026-07-18, K3 `eac98c43`) — "hard-repatriation cap", "mandatory local-equity stake"; (iii) **narrative D1 walk (2026-07-21)** — the D1 outro named a follow-up drill by description that isn't in inventory. Three sightings across three DIFFERENT pipelines (calculator batches #9/#10 AND now the narrative pipeline) confirms this is a persona-prompt-level defect, not scoped to any one family. Fix: outros reference REAL inventory only — resolve to a published `lo_code`/topic or speak generically.
6. **⬆ HIGH — CONVENTION-SOFTENING (batch #3 walk 2026-07-18).** A code-owned convention ((IRR−r)/r×100, an ACCA-marked hard rule) was presented as merely "equally valid" against an inferior approach. Fix: a close/persona must present a code-owned convention as THE method, never one of several equally-valid styles.
7. **K3-HINT DIVERSIFICATION-FALLACY (minor — batch #3 walk 2026-07-18).** The K3 hint let a diversification fallacy pass uncorrected; the student self-corrected and the close credited it (acceptable that time), but the hint should challenge the fallacy rather than staying silent on it.

**Also noted, not a new category (narrative D1 walk 2026-07-21):** an initial F4/fence-sitting miss against the drill's own stored hint — the leg's first pass didn't flag a fence-sitting attempt the hint text was explicitly written to warn against. Folds into finding 4 (hint-base-wobble) rather than a standalone category — same failure shape (the hint/close layer not enforcing what it already knows).

**🔹 INERT / GROUNDING-PASS (not a new numbered category) — PERSONA POLISH, E3 K1 futures walk 2026-07-24 (`56989d69`).** Hint leg correctly caught the #1 examiner error (missing 4/3 contract-count multiplier) — core PASS. Two defects: (1) **credit-opener contradicts body** — "You've nailed the contract count" then explains the count is the error. SECOND occurrence this session (cf. history-loss teach leg). Hypothesis for the pass: the opening-credit template fires regardless of whether the credited item is correct; condition the opener on what the student actually got right. (2) The 4/3 rationale conflates tick mechanics with period-scaling and says "under-hedged by one-third" (it's a quarter of the needed count). Convention/direction correct; explanation loose. **Non-compounding; batch to the numeric-families grounding-pass retrofit** (this section's own follow-on phase, above) rather than opened as its own fix session.

**🔹 INERT / GROUNDING-PASS (not a new numbered category) — PERSONA FABRICATES SCENARIO FACTS, EN1 walk 2026-07-24 (`55181aa8`, E1a group-treasury).** Teach leg correctly REJECTED the generic-centralisation essay (core disqualifier PASS) but grounded its redirect in INVENTED scenario specifics — asserted "the Peru and Chile subsidiaries", "a bank in Lima or Santiago", Colombian peso / Peruvian sol, when the scenario names only São Paulo + "four South American subsidiaries" (countries undecided). Slid from hypothetical ("or") into asserting un-given facts. **SECOND fabrication-class finding in the tutor layer** (cf. REVEAL_SYSTEM invented-figures, logged 3×) — hypothesis: systemic persona tendency to generate plausible specifics and assert them as given. **Grounding-pass candidate:** a NO_INVENTED_FACTS discipline (frame illustrations as explicitly hypothetical; never assert un-given scenario specifics), generalising the existing NO_INVENTED_REVEAL_REFUSAL guardrail across all conversational legs. **Non-compounding, not launch-blocking**; concept/marking behaviour correct. EN1 rubric is sound — no drill change. Batch to the grounding-pass retrofit rather than opened as its own fix session. **ROOT-CAUSE REFINEMENT (EN3 walk, 2026-07-25):** EN3 (`f9f4f3d4`, fully-specified scenario) produced NO fabrication; EN1 (undecided subsidiary countries) did. Trigger narrowed — the persona fabricates to fill an OPEN scenario slot when the teaching wants a concrete example, NOT indiscriminately. The grounding-pass fix should therefore target **open-slot handling** (detect the un-given slot, flag illustrations as explicitly hypothetical) rather than a blanket anti-invention rule.

## BATCH #9 STUDENT-WALK FINDINGS (2026-07-17) — walk PASSED, batch #9 CLOSED
The walk (`ef746ff0` Waitaha via B4b serve, `0dc970a8` Nakheel direct) PASSED all exit criteria: serve, marking, OFR carry, figure integrity (all reveal figures = independent recompute exactly), solved-path reveal, NO_COMPUTED_OUTPUTS (zero leaks). Exit criterion met — **batch #9 fully closed.** Five items surfaced, priority order:

1. **FALSE-COMPLETE (pattern, moderate).** The Nakheel leg certified a correct-arithmetic attempt as complete despite the attempt MISSING the drill's signature insight (equity-divergence reconciliation, model-answer Step 5). Waitaha behaved correctly (one teaching beat before resolution). **Fix direction:** per-drill key-insight list available to the leg → completeness check before resolution → one teaching beat if the signature insight is missing. **Prompt-side change** — Rule 24 triangulation + a new red-team probe (polished-but-incomplete attempt) required. **Scope into the next build session.**
2. **Waitaha `ef746ff0` internal label leaks student-facing.** Scenario renders the internal label "Challengeable textures:" to the student (Nakheel clean — textures woven into prose). Corrective edit: weave into prose, kill the label.
3. **Reconciliation template prints "surplus NZD -15.6m" for a negative.** Should flip the label to "shortfall" when the figure is negative. Check whether the template is shared across calculators — if so, fix at the shared layer.
4. **INVENTED-INVENTORY OUTRO — see the consolidated PERSONA-HARDENING SLOT section above (finding 5, now 3 sightings across 3 batches incl. narrative D1).**
5. **OPEN — Grant to rule:** add a quantified steady-state reforecast (capex 40 → FCFE ~44.4) to the Waitaha model answer, or leave as prose.
6. **CONVENTION-SOFTENING + K3-HINT DIVERSIFICATION-FALLACY — see the consolidated PERSONA-HARDENING SLOT section above (findings 6 and 7).**

## AFM GO-LIVE — delivery layer (IN FLIGHT, 2026-07-12)
Audit found the 8 approved AFM drills are **unreachable** if published — every student-facing ACCA route hardcodes `paper_code='APM'`. Sequenced plan APPROVED (full artefact: `ClaudeSend.txt`; decision bank: `APM_BUILD_CONTRACT.md` session 2026-07-12 pt.2). Build order **0 → G3 → G1 → G4 → G2** (G5 interleaved). **G3/G1/G4/G5/G2 DONE + pushed to main (2026-07-12).** Only **G7 (publish flip) remains** — gated on Grant's explicit confirm + `next build` green + the mandatory post-flip authenticated HTTP AFM transcript. **APV-batch precondition RESCINDED (Grant + adjudicator, 2026-07-12): no dependency — the 8 drills (batch 1 NPV + batch 2 IRR/MIRR) are fully verified and stand on their own; content batches continue in parallel and never gate the flip.**
- **Billing = BUNDLE** (ruled): one ACCA entitlement covers all papers; `apm_*` columns stay as the ACCA flag (no entitlement migration); free counter goes PER-PAPER (new `profiles.afm_teach_throughs_used` — the one migration). No AFM Stripe SKU (G6 skipped) — APM payers get AFM = zero-cost beta cohort for demand data.
- **G3 (teaching branch) = v1-LITE** (ruled): paper-aware system prompt + pre-baked verified reveal. **HOLD: persona string + sample transcript to Grant before commit.**
- **G5a/G5b DONE (2026-07-12):** `hasActiveAPMAccess`→`hasActiveACCAAccess` (bundle; old name kept as `@deprecated` alias for the APM case/mock routes); 3 inline copies collapsed. Per-paper counter live: `profiles.afm_teach_throughs_used` migration applied + verified (integer/default 0/NOT NULL; 9 profiles all 0). APM payer now unlocks AFM (beta cohort). Stripe/checkout untouched (G6 skipped).
  - **SURFACED DEBT — `capColumn` ternary.** The `paper === 'AFM' ? 'afm_teach_throughs_used' : 'apm_teach_throughs_used'` ternary is duplicated in 3 files (tutor route, tutor page, dashboard). Fine for 2 papers; at **paper #3 it must become a lookup map** (e.g. `TEACH_THROUGH_COL: Record<AccaPaper,string>`) in `lib/acca/paper.ts`, referenced everywhere — before adding the third paper's counter, not after.
- **G7 (publish flip) DONE — AFM IS LIVE (2026-07-12).** Flipped the 8 reviewed drills → `published=true` (SQL Editor, guarded, `published_afm=8`/`approved_unpublished_afm=0`). All exit criteria passed on the LIVE production route (authenticated): 3a AFM transcript (bundle proof — paid erasmoose got AFM teaching) acked by Grant; 3b discovery (switcher/areas/tutor load, demoted A3/B4 absent); 3c APM regression clean; 3d per-paper counter (`afm_` 0→1, `apm_` 0, via reversible free-toggle, pass restored).
  - **Pipeline leak found + demoted → 2 candidates QUEUED for review:** DB had 10 approved AFM rows vs 8 reviewed — `47c9d5ce` (A3a ESG) + `d0727187` (B4c valuation), early 07-09 pilot exemplars set `approved` manually with NO review record, were DEMOTED to `candidate` (not deleted). **PARKED (Grant 2026-07-13) — own mixed-family idle-session pass through the FULL pipeline (gates → blind GPT → adjudication); never rides a calculator batch.** They do not ride the go-live. Reconcile-before-flip rule now in `CLAUDE.md`.
  - **Follow-ups (not blockers):** (a) optional explicit "early access / new drills weekly" framing on the AFM view (today: no coverage claim, 1 area shown — honest by construction); (b) `/acca/subscribe` is APM-branded ("Full APM drill bank") — AFM free user at the cap sees APM copy; neutralise to ACCA under the bundle; (c) **`AreaPicker.tsx` `APM_SECTIONS` map is APM-only (SCOPE-DEBT, surfaced 2026-07-14 student-walk)** — the tutor page's "Change area" picker labels sections with the APM A/B/C/D names; an AFM student sees APM section titles over their B1/B3 areas. Make section-name lookup paper-aware (AFM has its own section structure) before AFM areas beyond B are shown prominently. (The `Ezra — {paper} tutor` label + scenario-pane markdown were fixed this session.)
- **PRE-EXISTING GAP — coordinator/org layer is paper-BLIND.** G4 made the STUDENT `/acca/progress` view paper-aware (JOIN-based, no migration); the COORDINATOR functions (`getCohortReadiness` / `getCohortHeatmap` / `getTraineeDetail` in `lib/org/queries.ts`) were deliberately left paper-blind — they read `acca_drill_attempts` unfiltered and bucket by the 2-char LO prefix, which collides across papers. **Harmless today (KPMG demo + any real cohort is APM-only), becomes real the DAY a mixed APM+AFM cohort exists** — a trainee's AFM attempts would blend into APM cells under APM labels. `cohorts` already has a `paper` column to key the fix off. Close at pilot-time when a mixed cohort is actually on the table; not a go-live blocker.
- **DEFERRED post-launch — v1-FULL live numeric grader.** Wire `lib/acca/numeric-verifier.ts` live (parse student figures → per-component verdicts → diagnosis). Needs a jsonb→runtime registry (serialized `answer_schema` has string refs; runtime `AnswerSchema` needs function-valued `recompute` — `numeric-verifier.ts:16-20`), a figure-entry UI, verdict plumbing. Not needed for go-live: numbers are already frozen in the prose fields at generation. Revisit once real AFM attempts exist (ties into EXAM REHEARSAL phase 4 workings grid).

## AFM build track (live)
- **B-NARRATIVE CLUSTER (pipeline #2, discursive D1–D5) — LIVE + WALKED. BATCH CLOSED 2026-07-21.** Grant-ruled FLIP (published AFM 41→46, reconcile clean throughout, browse deltas B1+1/B3+2/B4+1/B5+1, area-entry integrity verified live) then the **student walk**: D1 full loop (incl. a golden-BAD-shaped attempt + a push-back probe) + D5 compressed — **FROZEN LAYER PASS across both**: scenarios, rubric-tracked resolution, FR-patched reveals served verbatim, correct level tags, zero computed-figure issues (n/a class, conceptual-only holds). **D1 close-out patch:** an internal "GIVEN" convention-vocabulary word had leaked into the served `context_text`; fixed + re-gated N2/N3 clean (`scripts/_patch_afm_narrative_d1_leak.ts`), row stayed `approved`/`published=true` throughout. **Conversational-layer findings are SYSTEMIC, not narrative-pipeline-specific** — journalled to the PERSONA-HARDENING SLOT section above (now 7 categories): a false-positive VaR diagnosis on a CORRECT statement (TOP severity, worst class to date), fog-retraction without ownership, plus a 3rd invented-inventory sighting (D1 outro) and a hint-enforcement miss folded into the existing hint-base-wobble category. **B-SECTION-LIVE TIER: CONTENT COMPLETE (46 published, 11 calculators + pipeline #2) AND WALKED — this claim STANDS.** **AD SPEND RULING (Grant, 21/07/2026): the ads trigger is conditioned on the persona-hardening slot (7 categories, above) SHIPPING and VERIFYING before any ad spend — tier-content-complete alone does NOT unlock it.** The December-sitting-window ads timeline is unaffected by this condition — there is still runway. Both `docs/AFM_COVERAGE_CONTRACT.md` status-line mirrors + `docs/reviews/AFM_BATCH_NARRATIVE_REVIEW_PACK.md` synced.
- **CURRENT (2026-07-21):** **46 published AFM drills · 11 calculators + narrative pipeline #2 (5 drills) LIVE AND WALKED · areas B1 + B2 + B3 + B4 + B5.** B-section-live tier CONTENT COMPLETE AND WALKED (claim stands). **Ad spend is Grant-ruled conditional on the persona-hardening slot shipping + verifying first** — not a further build gate on content, a deliberate quality bar before spend. Browsable area map {B1:13,B2:4,B3:17,B4:7,B5:4}; parked = `47c9d5ce` A3a ONLY (candidate, never rides a batch). **Next: the persona-hardening session (consolidated, 7 categories, scoped as ONE session — see above) — this is now the ad-spend blocker, not a nice-to-have.**
- **Risk & uncertainty (calculator #3, B1a iv/v/vi + B1b ii) — LIVE + WALKED, batch #3 FULLY CLOSED 2026-07-18 (ALL 10 B-section-tier calculators complete; AFM = 41 published).** `status='approved'`, `published=true` for all 4. FR1 (outlay distractor) + FR2 (GPT round 1, 4 accepts) + FR3 (residual relabel, sweep-all-fields) + close-out (S-id citation strip from student surfaces, full-row negative proven). Reconcile-before-flip clean (parked A3a `47c9d5ce` untouched); B1 entry verified still NPV (risk ranks 13–16). **Student walk: K2 + K3 both PASS** (seeded convention error + company-WACC error both caught + taught; OFR carry incl. rounded-IRR 38.3 accepted; reveals verbatim; zero computed-figure leaks). **Tier remaining: the 5-drill B-narrative cluster only.** Engine `lib/acca/risk.ts` composes `discountFactor` (npv.ts) + `computeCapm` (capm.ts) ONE-WAY. 4 kinds → ids: **enpv** `84ee022a` (Thailand/THB, ENPV −86.2m, P(neg)=75% → EV-reject + one-shot caveat [S6,S7]) · **sensitivity** `3a2e2d1d` (South Africa/ZAR, variable margin 6.97% [S3,S4] + discount-rate (IRR−r)/r×100 [S4]) · **radr_compare** `5a03ee27` (Poland/PLN, NPV +4.6m@8.20% → −32.6m@10.90% RADR — the FLIP [S5,S6]) · **risk_measures** `f28c2b4c` (Brazil/BRL, duration 3.07y vs 5.06y comparative [S1,S2] + one-tail VaR). **Conventions FETCHED + page-verified (S1–S7, `docs/evidence/AFM_RISK_EVIDENCE.md`).** Gates G-a…G-e + GATE 1/2/3 + P4/P5 all green. Fixtures `npm run test:risk` (52 checks). Pack `docs/reviews/AFM_BATCH_RISK_REVIEW_PACK.md`. **NEXT: co-founder recompute → blind GPT round → flip (LAST calculator of the B-section-live tier → then B narrative cluster).**
  - **VND enpv draft regenerated to THB** (huge-denomination lesson from batch #10). **RADR flip** needed a strengthened sizing steer (marginal project at company rate + peer beta 1.6–2.0). **P5 lint widened:** "duration" is satisfied by a PROJECT duration Σ(t×PV)/ΣPV, not only bond Macaulay/modified. **Minor robustness note:** `irrOfStream` throws on a non-conventional stream (no NPV sign change on [1e-4,5]) — the generator retries; consider widening the bracket / handling if it recurs at scale.
- **International (B5 + A6a) batch #10 — FLIPPED LIVE 2026-07-18 (GPT round 1 = 2 accepts / 0 rejects; batch #10 CLOSED pending student walk).** `status='approved'`, `published=true` for all 4 (`499357f7`/`fcf14ae8`/`eac98c43` B5 browsable + `2b0513a0` A6a/K4 direct-link-only). Calculator #10 `lib/acca/international.ts` — composes the FCFF build (`fcffFromBuild`, valuation.ts) + discounting (`discountFactor`, npv.ts) ONE-WAY (both extracted; test:npv + test:valuation unchanged). Forward FX DERIVED by **PPP** (never asserted). **Double-tax = the CORPORATE DIFFERENTIAL** (FR1): additional home tax = max(0, home − foreign CORPORATE rate) × taxable profit (PBIT base), crediting foreign corporate tax; withholding = separate layer, per-scenario `wht_creditable`. **FR2 THREE-BRANCH tax prose** (the FR1 template printed a FALSE "foreign ≥ home" + false max() for every nil): **(a)** nil-by-corporate-credit (foreign corp ≥ home; WHT then a net cost) · **(b)** nil-by-WHT-credit (home > foreign corp, creditable WHT covers the residual → nil) · **(c)** charged (residual survives). **GATE 14b** (new) guards the prose vs params + true ordering. Kinds → ids (FR2 regen, all three branches shown): **home_currency_standard** `499357f7` (B5b, Morocco/US, NPV +18.6m accept; **branch a** NIL) · **exchange_rate_sensitivity** `fcf14ae8` (B5a, Egypt/UK, base +9.3m → alt −1.0m **FLIPS**; **branch b** NIL-via-WHT) · **restricted_remittance** `eac98c43` (B5b + **B5c dual**, China/EUR, +6.8m vs free +9.4m cost −2.6m; **branch b**) · **multinational_dividend_capacity** `2b0513a0` (**A6a, DIRECT-LINK-ONLY**, Australia AUD / Malaysia MYR, remitted year 2; capacity 33.6 vs 38.0 **not sustainable**, sub 35%; **branch c CHARGED** — 30% vs 24%, MYR 0% dividend WHT). **All gates green** — 6 base/pattern + GATE 12 parity, GATE 13 currency-scale, GATE 14 double-tax cap (differential), **GATE 14b tax-prose**. **Floor tolerance** kind (max 0.5% rel, 0.2 abs) on money components. **Export pack:** `docs/reviews/AFM_BATCH_INTERNATIONAL_REVIEW_PACK.md` (FR1+FR2 sections; CLOSED RULINGS incl. corporate-differential + Rule 22 + three-branch). DB reconciled: 4 rows, candidate/unpublished, 0 approved.
  - **HARD RULE (Grant Step-0 #5):** K4 (A6a) is Section-A — direct-link-only serve, **EXCLUDED from all B-tier / coverage counts + public claims until Section A surfaces.** Batch #10 adds **3 B-area (B5) candidates**, not 4.
  - **FR2 resolutions:** the false-inequality/false-max() bug (K2/K3/K4 all misprinted case a) is FIXED via the three-branch template + GATE 14b; K1 free-zone framing dropped (WHT stated as a net cost); K3 working-step labels branch-aware; K2 schema params now carry `add_tax_rate_effective`. Batch now DEMONSTRATES all three branches.
  - **FR3 resolutions (prose-only, figures frozen — verified byte-identical):** K3 `eac98c43` context → **Germany–China** treaty / German parent rate (all EU/Eurozone framing killed; EUR unchanged); K4 `2b0513a0` charged differential stated on **"the remitted share of the foreign taxable profit"** (assumption + Step 2 — a LIB change in `international.ts`, survives regen). New CLOSED RULING banked: scenario-stated fiscal regimes are the AFM exam device; real-world participation-exemption / CFC / treaty-article regimes are out of scope — do not flag. **Pattern fix (close-out):** the dividend Step-2 **nil** parenthetical is now branch-accurate (a foreign-corp-≥-home / b residual-covered-by-WHT) like the assumption line, and **GATE 14b extended to scan the answer BODY** (step/nil notes), not just the assumption line, so a false "foreign ≥ home" can't recur silently anywhere; (b)-nil dividend case fixtured (`test:international`). No live drill hit the nil branch (live K4 is charged), so no re-patch.
  - **FR4 = GPT round-1 adjudication (2 accepts / 0 rejects; prose-only, figures byte-identical):** (1) K3 `eac98c43` restricted-remittance Step 2 now opens "Total foreign FCFF = CNY 166.2m; 70% immediately remittable, 30% blocked." + first column "Free portion before WHT (70% of FCFF)" — honest split, fixed in the FAMILY builder so every future restricted-remittance drill inherits it. (2) K4 `2b0513a0` context "favourable gap" clause → "the remitted share of foreign taxable profit — an additional tax drag that reduces the AUD cash available for group dividends." Guarded byte-identical (11 comp + 8 params + all 8 K3 table rows; K4 context single-clause diff); all gates + `test:international` green; pack regenerated (DB↔pack parity verified).
  - **GATE-P FLIP DONE (2026-07-18, Grant-ruled).** Reconcile: pre published 33, approved-unpublished 0; candidate = 5 (4 batch-#10 + parked A3a `47c9d5ce`) — surfaced, Grant ruled "flip the 4, park A3a." Guarded explicit-id flip (`_flip_intl_batch10.ts`: ids IN + `status='candidate'` guard). POST: published 37, candidate 1 (A3a), approved-unpublished 0, A3a untouched. **COUNTS-RULE fix (same push):** publishing A6a surfaced it in the browse listings (`app/acca/page.tsx` + `app/api/acca/areas/route.ts` bucket by `slice(0,2)`) — an "A6" area appeared and `firstDrillArea = areas[0]` (A6 sorts before B1) would have defaulted zero-attempt AFM students to K4. Fixed with `isDirectLinkOnlyArea(paper, loCode)` in `lib/acca/paper.ts` (AFM Section A direct-link-only until Section A launches), applied at both bucketing sites → browse = B1:8/B2:4/B3:15/B4:6/B5:3, A6 excluded, firstDrillArea=B1; direct-link serve (`next-drill ?area=A6`) still returns A6a. **Remove the AFM Section-A clause when Section A intentionally launches.**
  - **✓ RESOLVED — SERVE-ORDER (walk-support, 2026-07-18).** The area serve was a uniform random pick (every area, incl. batch #9's B4) → a zero-attempt B5 open could serve K3 (hardest) not K1 (entry). Now: zero-attempt first serve in an area = deterministic ENTRY drill (foundational kind), random "try another" unchanged. Entry keyed on the stable model_answer heading via `lib/acca/area-entry.ts` (`AREA_ENTRY_RANK` + `pickEntryDrill`) — NOT created_at/id (regen-safe), no schema change; credit ranked above valuation so it can't steal B4's entry. `model_answer` stripped from the serve payload (fetched for ranking only). Fixtures `npm run test:area-entry`. **New families MUST add their heading to `AREA_ENTRY_RANK` (map-before-close).**
  - **⚠ KNOWN INTERACTION (surfaced — floor tolerance × seeded-OFR):** the 0.2 absolute floor can swallow the GATE-3 perturbation for a graded money dependent under ~1.3 (display m) → verdicts "correct" not "carried" → GATE 3 FAIL. Hit by the AUD/Vietnam K4 draft (VND huge-denomination → tiny AUD remittance); fixed by re-pairing to AUD/**Malaysia** (moderate MYR → material figure). **Weigh this in the platform-wide floor-tolerance sweep** (the floor helps small nil-tax figures but must not be so large it defeats OFR on a small graded dependent — consider excluding roots-only or scaling the floor).
  - **NEXT: co-founder independent recompute → blind GPT round (CLOSED RULINGS present) → adjudicate → flip by explicit-id SQL (reconcile-before-flip; A6a stays out of the B count).** Then **#3 risk & uncertainty (B1 depth) → closes the B-section-live tier → AFM ads trigger.**
- **AFM batch-1 (NPV/B1a) — 4 drills PUBLISHED (2026-07-12, G7).** `status='approved'`, `published=true`, live on `/acca` (AFM). Round-2 fix-verification cleared; P1 portfolio-NPV line + D2 teaching sentence + D4 "overseas"→"North American" applied; all five gates green.
- **IRR/MIRR (B1c) batch 2 — 4 drills PUBLISHED (2026-07-12, G7).** `status='approved'`, `published=true`, live. Two hostile rounds (blind GPT) to convergence: round-1 findings 1–5 accepted (FIX 1 conflict fund-choice decision [pattern-level] · FIX 2 · FIX 3 "stated reinvestment rate" · FIX 4 · FIX 5) / 6 rejected; round-2 cleared with one tidy (712cf3aa same-basis dedupe). All gates green.
- **APV (B3j/B3k) batch 3 — 4 drills PUBLISHED + LIVE (2026-07-13).** `status='approved'`, `published=true`, live on `/acca` (AFM, area B3). Cleared 2 hostile blind rounds + independent recompute + 6 gates; flip executed (published_afm 8→12, 0 approved-unpublished, parked pair intact); exit criteria all passed (live authenticated areas→B1+B3, live serve of `1b717fd0`, reveal byte-equality fixture, APM/AFM-B1 regression clean). **AFM now serves B1 + B3; 12 live AFM drills; 3 calculators shipped (NPV · IRR/MIRR · APV).** Calculator #4 `lib/acca/apv.ts` (mirrors npv/irr; reuses the NPV engine for the base case at Keu). Code owns every figure + the accept/reject and financing-choice verdicts. Kinds → ids (after the FLAG-fix regen): **standard** `ecb2d89f` (Malaysia data-centre/MYR, base +5.5 → APV +18.3 accept) · **subsidised** `34f9e897` (Brazil BNDES toll-road/BRL, base +92.4, shield +29.2 + subsidy +61.0 → APV +182.6 accept; financing ≈ base so the subsidy is material) · **reject** `1b717fd0` (South Korea shipbuilding/KRW, financing can't rescue a −369bn base) · **financing_compare** `dedca530` (B3k, Poland logistics/PLN, base +5.5 → debt APV 6.3 vs equity 2.5, debt preferred + gearing overlay). All 5 gates green on all four. **Export pack:** `docs/reviews/AFM_BATCH_APV_REVIEW_PACK.md` (all fields incl. answer_schema). DB reconciled: 4 B3j/B3k rows, all candidate/unpublished, 0 approved.
  - **TWO PRE-REVIEW SELF-FLAGS — FIXED (Grant ruled fix-before-blind-pass, batch-2 precedent):** (1) **FLAG 1** subsidised loan-term — context now states the BNDES facility is drawn/amortised over the appraisal horizon (co-terminous four-year term), `debt_term` = operating years; text and maths agree (five-field re-gate). Generator subsidised block + `debt_term` schema description enforce term=horizon. (2) **FLAG 2 (pattern-level)** one tax-timing per drill — the calculator now lags EVERY financing side-effect's tax consequence identically to trading tax: the shield relief lands at interest-year+lag, and the subsidy is split into a pre-tax in-year saving less its tax at year+lag (was collapsed in-year). Tables label each row with its receipt period. Fixture `test-apv.ts` proves it (lag0 vs lag1: shield 1.242→1.150, subsidy 6.210→6.364; both tax legs move to year+lag).
  - **Calibration debt (generator):** the subsidised base-case near-zero target can't be hit by a pre-tax-CF multiplier (tax/Keu/inflation erosion the model can't see). `draftApvDrill` now runs **best-of-4 with a per-kind verdict penalty** (standard/compare→accept, reject→reject on a negative base, subsidised→decision-relevant) and ships the least-bad, so verdicts stop flipping across regens. Watch at scale: a persistent best-of-N warning = the band is wrong for that parameter regime.
  - **SECOND pre-review pass — FIX A/B/C/D applied (Grant's independent recompute, 2026-07-13; drills patched in place, all 5 gates re-passed, local-only).** **FIX A (pattern):** issue-cost convention was self-inconsistent — the loan amount is the GROSS principal (interest+shield run on it), so debt issue costs = gross × f, NOT net×f/(1−f). Two calculator helpers now pin it (gross-stated→gross×f, net-stated→net×f/(1−f)); `issue_amount` removed so a drill can't use one figure as both; fixture pins the convention. Recomputed exactly: D3 `1b717fd0` issue −14,700.0 → **apv −363,159.65**; D4 `dedca530` debt_issue −1.95 → **apv_debt 6.3213** (equity 65 stays net gross-up, unchanged); D1 numerically unchanged (its net = gross×(1−f)). **FIX B/C/D (prose):** D2 `34f9e897` Step-7 de-contaminated (removed soy/agricultural "scenario evidences" claim + invented ANTT-penalty/covenant mechanics; grounded in licence-lapse timing, Year-4 bullet refinancing, traffic-volume uncertainty), context "fully amortised" → single bullet at end of Year 4, "concessão"→"licença de instalação"; D3 context "supervision of"→"a member of" KSA; D4 Step-7 "stated strategic ambition"→softened. Pack regenerated.
  - **ROUND-1 BLIND REVIEW — all 5 findings ACCEPTED + applied cross-field (2026-07-13); drills re-gated (now 6 gates), local-only.** FIX 1 (pattern) loss-relief: `1b717fd0` context gains a relief line (Y1/Y4 taxable negative → tax credit) + **new gate P6** (`lintLossRelief`, GATE 6). **Retrospective batches 1–2:** NPV suspect `f2817d06` was clean; **3 IRR drills fixed** (`796651c2`/`003ab45c`/`712cf3aa` — relief line added to each). FIX 2 `1b717fd0` reveal — three lanes stated exactly (base@Keu, shield@Kd, issue costs = t0 undiscounted). FIX 3 `34f9e897` — ANTT removed as the environmental-licence issuer (kept in its transport-concession role), context + Step-7 prose. FIX 4 `ecb2d89f` reveal — "as certain as the debt" reworded (shield risk tracks the debt; model values only the shield on debt expected to remain outstanding). FIX 5 `dedca530` reveal — "ungerated"→"ungeared". Delta pack: `docs/reviews/APV_REVIEW_PACK_R2.md`.
  - **ROUND-2 BLIND REVIEW (reviewer saw the STALE pre-round-1 pack — its 5 findings were already applied, confirming round 1). Three new items ruled (2026-07-13, local-only):** **FIX 6** `34f9e897` context — APV-rationale sentence corrected: removed the false "debt level is expected to decline as the loan is repaid" (contradicts the bullet repayment) → "because the project-specific debt is large, temporary, and extinguished at the end of the concession horizon…" (consistent with the Year-4 bullet); re-gated (6 gates). **REJECTED:** (a) OFR softening — "charged once at its source" is house wording, ruling reaffirmed closed; (b) drill-4 retag — `dedca530` stays **B3k primary** (Q3 design), B3j is dual coverage journaled (single-tag schema, no migration). **PROCESS RULE (permanent → doctrine):** regenerate the FULL pack in place after every round; the on-disk `AFM_BATCH_APV_REVIEW_PACK.md` is always current (done this round); deltas are additional.
  - **Next calculator: cost-of-capital/CAPM — BUILT (see below).**
- **CAPM / cost-of-capital (B3d/B3e) batch 4 — 4 drills PUBLISHED + LIVE (2026-07-13).** `status='approved'`, `published=true`, live on `/acca` (AFM, area B3). Cleared confirm-pass + 1 hostile round + 6 gates; flip executed (published_afm 12→**16**, 0 approved-unpublished, parked pair intact); exit criteria all passed (live authenticated `areas?paper=AFM`→B1:8+B3:8; live serve of CAPM `2a145f7d`; 3-dp betas intact; APM/AFM-B1 regression clean). **AFM now serves B1 + B3; 16 live AFM drills; 4 calculators shipped (NPV · IRR/MIRR · APV · CAPM).** Calculator #5 `lib/acca/capm.ts` — pure rates family (MM-with-tax ungear/regear, CAPM Ke, MV-weighted WACC; β_d=0). Code owns every beta/rate + comparison + the wrong-hurdle flip. Kinds → ids: **project_specific** `de8eb7b9` (B3e, India telecom/INR, first-of-family; assetβ 0.688 → regeared 1.093 → Ke 14.27% → WACC 10.87%) · **org_wacc** `810b3893` (B3d, Mexico F&B/MXN; Ke 14.16% WACC 12.32%) · **keu_for_apv** `11c308e5` (B3e, UAE hospitality/AED, tax 9%; asset β 0.902 → **Keu 10.07% — the rate APV states; boundary closed**) · **wrong_hurdle** `2a145f7d` (B3d, Taiwan semis/TWD; company WACC 10.13% < return 11.40% < project WACC 12.12% → **REJECT, decision FLIPS**, code-owned). All 6 gates green on all four (P6 loss-relief is a structural no-op — pure rates, no cash flows). **Export pack:** `docs/reviews/AFM_BATCH_CAPM_REVIEW_PACK.md` (full pack, regenerate-every-round hygiene). DB reconciled: 4 B3d/B3e candidates, 0 approved. Fixtures: `npm run test:capm`.
  - **Figure-integrity gate generalised:** GATE 2 now checks 1/2/3 dp (betas display at 3 dp); backward-compatible (money still matches at 1 dp).
  - **β_d=0 across the batch** (exam-orthodox); calculator supports non-zero β_d — journalled as a **future kind** if risky debt is ever demanded.
  - **ROUND-1 BLIND REVIEW — FIX 1–5 accepted + applied (2026-07-13, local-only); drills re-gated (6 gates).** **FIX 1 (pattern)** kind-conditional assumptions block + heading in `buildCapmModelAnswer` (org_wacc = no ungear/regear; keu_for_apv = no WACC, heading "ungeared cost of equity"); **FIX 2 (pattern)** dynamic step numbering (org_wacc had a 2→5 jump); **FIX 5 (pattern)** verb-interpolation bug `**${verb}**ed` → full past-tense word (grep: artifact was ONLY in `capm.ts` + drill `2a145f7d`, no APV/IRR/NPV contamination). All three are now doctrine "model-answer template hygiene" + `test:capm` fixtures. **FIX 3** `de8eb7b9` context ("beta is irrelevant" → "not appropriate as the business-risk proxy … capital structure/debt cost remain relevant to the WACC"); **FIX 4** `11c308e5` ("a Abu Dhabi"→"an", "10-yr T-bill"→"10-year sovereign bond yield proxy") + `810b3893` un-gendered finance director. **REJECTED:** OFR-softening (reaffirmed closed, 3rd time) + drill-4 retag (B3d primary stands per Q1; B3e dual coverage journalled). Full pack regenerated in place.
  - **CONFIRM-PASS — BATCH CLEARED (2026-07-13).** One accepted polish: `11c308e5` keu_for_apv boundary line reworded to student content ("this ungeared Keu is the discount rate applied to the all-equity base-case cash flows in an APV appraisal; the financing side-effects are valued separately"), 6 gates re-passed. OFR-softening (4th) + retag (2nd) re-rejected. **NEW pack-hygiene rule:** every review pack now carries a `⛔ CLOSED RULINGS — do not re-raise` section. **FLIP EXECUTED + VERIFIED (2026-07-13):** published_afm 12→16, 0 approved-unpublished, parked pair intact; exit criteria all passed (live authenticated areas B1:8+B3:8, live CAPM serve `2a145f7d`, 3-dp betas, APM/AFM regression clean).
  - **Next calculator: duration (calc #6, B3f) — BUILT (see below).**
- **Bond duration (B3f, + B3g convexity rider) batch 5 — 4 drills PUBLISHED + LIVE (2026-07-14).** `status='approved'`, `published=true`, live on `/acca` (AFM, area B3). Calculator #6 `lib/acca/duration.ts` — pure rates/bond family (flat YTM, annual coupons; modified = Macaulay/(1+y)). Code owns every duration + the exposure ranking + the zero-vs-coupon comparison. Kinds → ids: **standard** `f8d9ec20` (Chile utilities/CLP, first-of-family; Macaulay 6.30y → modified 5.86y → ΔP/P −5.86%/100bp) · **compare** `7db140ed` (Turkey aviation, **USD facilities** — TRY guard honoured, lira 40%+ acknowledged; short mod 3.43y vs long 6.85y → long more exposed) · **zero_coupon** `ffe854d1` (Indonesia property/IDR; zero Macaulay 7.0 = maturity, coupon-ref 5.56 < 7) · **limitations** `0ae79f34` (Germany automotive/EUR, **+B3g convexity**; +300bp linear ΔP/P −18.5%, convexity carries the marks). All 6 gates green; cleared co-founder recompute + 1 blind round (issuer-perspective pattern + FIX 1–6) + confirm-pass; CLOSED RULINGS proven twice. **FLIP EXECUTED + VERIFIED (2026-07-14):** published_afm 16→**20**, approved_unpub 0, parked pair intact; exit criteria (DB/content) passed (areas B1:8+B3:12, duration serve-content intact, APM/AFM-B1 regression clean). **AFM now serves B1 + B3; 20 live AFM drills; 5 calculators (NPV · IRR/MIRR · APV · CAPM · duration).** **Export pack:** `docs/reviews/AFM_BATCH_DURATION_REVIEW_PACK.md`. Fixtures: `npm run test:duration`.
  - **Gate hardening (pattern):** `buildOfrProof` now perturbs roots by DISTINCT factors so a scale-invariant ratio (Macaulay = Σt·PV/price) doesn't cancel to 'correct'; affine chains unaffected. P5 gained a duration demand. `zero_coupon` ref bond grades only its Macaulay.
  - **B3g dual coverage** journalled on the `limitations` kind (single-tag `lo_code`, no migration; CAPM/wrong_hurdle precedent).
  - **PIPELINE PROGRESS (2026-07-14):** (1) co-founder independent recompute → **round-0 FIX A/B/C applied** (question realign, unit-scale basis + unscaled-face guard, narrow-body prose); (2) **round-1 blind adjudication → all findings ACCEPTED + applied** (FIX 1 issuer-aware ranking [pattern+doctrine], FIX 2 fair-value + anti-fence-sitting verdict, FIX 3 swap trade-off, FIX 4 JIBOR→generic benchmark, FIX 5 worst-case contradiction removed, FIX 6 frozen-market-facts lint [pattern]); reviewer respected CLOSED RULINGS. **(3) confirm-pass clean → RECONCILE → FLIP EXECUTED + VERIFIED (2026-07-14): published_afm 16→20, live on B3.** Next calculator = credit risk (#7, B3h).
  - **✓ CLOSED — frozen-market-facts lint (from duration FIX 6; ruling (a)+(b) applied 2026-07-14).** `lintFrozenMarketFacts` **narrowed** to fire only on "current market …" or "currently" near a market-qualified term (scenario-state "currently uses ROI" / "utilisation rate (currently 71%)" no longer flags; "current yield level" no longer flags). Live-bank sweep re-run: **59 → 7 genuine hits** (all "current market <X>" in 5 published APM WACC drills), all **additively re-frozen** to "at the valuation date" (journalled, class=additive; `APM_BUILD_CONTRACT` 2026-07-14). Residual sweep = 0. 4 duration drills re-verified: all 6 gates green, no field changed. `test-afm-prose` covers must-flag + must-not-flag.
  - **Next calculator = credit risk (calc #7, B3h — rating agencies / credit spread / cost of debt via term structure)**, per the coverage contract. The **FCFF-first idea is NOT ruled** — raise as a Step-0 steer next session if it makes a case (e.g. unlocking the parked B4c rehab). Then E2 verifier extension → FX/IR hedging.
  - **APV/CAPM boundary (ruled 2026-07-13, journal so CAPM's batch doesn't re-litigate):** the APV base case discounts at a STATED ungeared cost of equity Keu; deriving Keu by ungearing an equity beta is the CAPM calculator's job (next roadmap item), NOT APV's. `apv.ts` takes Keu as an input; the CAPM calculator will own the beta-ungearing. Do not add ungearing to `apv.ts`.
  - **Demoted-2 (A3a ESG / B4c FCFF) — PARKED (Grant 2026-07-13).** Not run alongside APV (different families → breaks one-calculator-per-review discipline; B4c's calculator already shipped + reviewed twice). Run as their own tiny mixed-family pass in an idle session; never rides a calculator batch.
- Round-2 review pack (`docs/reviews/AFM_BATCH1_NPV_ROUND2_REVIEW_PACK.md`) — delete when stale.
- **Generator IRR path (`draftIrrDrill` + prompt + `--irr-batch`) unbuilt** — build when IRR volume justifies it (batch 2 authored by hand via the shipped calculator, Option A).
- **Generator APV path IS built** — `--apv-batch` (`draftApvDrill` + `SUBMIT_APV_SCENARIO_TOOL` + `buildApvUserPrompt`), 4 kinds mapped standard/subsidised/reject→B3j, financing_compare→B3k. Gate-guard now keys off `drill._liveSchema` (not `mode==='quantitative'`) so the B3k 'mixed' compare drill still passes all 5 gates. Fixtures: `npm run test:apv`.
- Banked idle-session: exhaustive journal-lesson-vs-rulebook reconciliation (audit item (c)).
- **BACKLOG — floor tolerance platform-wide (from international Fix Round 1, 2026-07-17).** The `floor` tolerance kind (effective band = max(relative%, absolute floor)) is live in `numeric-verifier.ts` + `validate-schema.ts` and used by the international family's money components (protects small-magnitude figures — a near-nil additional tax, a thin converted flow — from a punishing relative band). **Consider applying it to the money components of the OTHER calculator families** (npv/apv/valuation/credit/bsop) so a small money figure is never held to an unfair relative-only band. Not urgent; do as a deliberate cross-family sweep with re-gate, not piecemeal.

## APM content + launch
- **APM §1a-style provenance trace NOT DONE — one confirmed defect found + PURGED (2026-07-20).** `scripts/apm-framework.ts` `INTELLECTUAL_LEVELS` carried an editorial gloss presented as guide text: all eight tail phrases ('explain mechanisms', 'perform calculations', 'evaluate appropriateness', 'assess trade-offs', 'apply frameworks strategically', 'recall facts'…) scored **ZERO hits** in `docs/apm_s26_j27_syllabus_and_study_guide.pdf`; the guide gives only the bare labels. Same defect class as AFM G1. It was latent (quoted by no document; 0 hits across all 133 `acca_drills` rows) and has been **purged to the bare labels at source**. Open work remaining: (a) register the APM guide in `sources.json` alongside AFM's E6, (b) run the full anchor trace over any APM doc that quotes the framework before it grounds a marketing/coverage claim.
- Professional-skills marking = biggest exam-readiness gap (~20% of the paper currently unassessed).
- Timed mock / exam-craft mode — none exists (examiner reports cite time management as a failure cause).
- APM content thin: Section A one-drill-per-LO (11/12 live-untested); Section B sub-areas; compound-verb LOs untested.
- **PAYWALL on the case path** — `APM_CASES` must NOT reach Production without it (auth + flag only today; counted tracked but unconsumed).

## Data capture & persistence
- **APM/AFM tutor transcript persistence — WRITE LIVE** (Horizon-1 gap closed 2026-07-11). `acca_drill_messages` migration applied + 7-check verified (`6f5d143`) + §10 two-row append shipped (`e94a6ec`) — every response-producing leg logged (attempt/hint/teach/correct/warm/reveal), swallowed like the attempt-log, RLS student-reads-own.
  - **Look-back UI on `/acca/progress` = normal-queue build (STILL OPEN).**
  - **Production proof — CLOSED (2026-07-12, during G7 exit criteria).** Live authenticated erasmoose runs wrote `acca_drill_messages`=10 (hint/teaching), `acca_drill_attempts`=5, `acca_tutor_progress`=3 (counted=true on the free teach-through) — transcript + attempt-log + progress writes all confirmed in production together.

## Enterprise / pilot-ready
- **Enterprise transcript visibility — TIERED design** (decided in principle 2026-07-11; built at pilot-contract stage):
  - **Tier 1 (default, exists today):** coordinator dashboard shows verdicts / heatmaps / readiness / activity — about the work, never the words.
  - **Tier 2 (the sellable middle, NOT YET BUILT):** per-trainee evidence view — attempt-level outcomes with Ezra's content-neutral diagnosis labels ("evaluated the company, not the report — scepticism gap") repurposed as manager-readable evidence. Coachable specifics without raw transcripts. The `acca_drill_messages` schema (`call_type`, `outcome`, `drill_id`) already carries what this needs.
  - **Tier 3 (full transcripts):** contract-level toggle ONLY, disclosed-by-design at org enrolment (trainee told at invite that sessions are visible to firm L&D), positioned as exam-prep support not performance management. Never a silent default — surveillance kills the practise-badly-in-private signal the product depends on.
  - **Privacy:** employer transcript access = new third-party disclosure; the privacy-page line (flagged in the persistence diagnosis) ships WITH whichever tier is built, shown to Grant before commit.
  - **KPMG discovery question** to add to the pitch set: *"When a trainee is flagged at-risk, what evidence does your L&D team want to see — the verdict, the diagnosed gaps, or the actual practice sessions?"*

## Product / roadmap
- **EXAM REHEARSAL — flagship** (upgraded from "fidelity strategy" 2026-07-11, Grant's call). The differentiator is the COMPLETE experience nobody else offers — a full paper under true exam conditions in a faithful interface + instant descriptor-marked results + per-requirement pacing diagnosis + coached debrief. ACCA's platform = empty shell, no marking; Kaplan = human-marked, days turnaround. We already own the hard 80% (marking engine, mock runner, descriptors, Ezra debrief). Positioning: **"Sit APM before you sit APM."** Anchors the €99 pass (B2C) and pre-exam-entry readiness verdicts (enterprise).
  - **Phased build** (~3–6 weeks of sessions; starts after AFM batch momentum, NOT now):
    1. Timed shell + exhibits split-pane (reading fidelity, clock pressure, no pause).
    2. Per-requirement pacing capture + pacing feedback in the marked debrief (time-starvation failure class — unique, we mark inside our own runner).
    3. Coached debrief surface: descriptor bands rendered student-visible (**closes the existing "bands invisible in UI" surfaced item** inside this build), Ezra walks the mark loss.
    4. Structured workings grid for AFM calc answers (doubles as verifier / OFR per-component capture).
    5. Spreadsheet response area LAST — built properly or not at all; until then, openly advise ACCA's free platform for spreadsheet-interface familiarity.
  - **Quality bar:** a janky exam shell is worse than none — each phase ships at house standard or holds.
  - **Pricing (decided in principle 2026-07-11):** NO per-try charging — metering rehearsal attempts taxes the practise-failing behaviour we sell and poisons subscription psychology. Structure: free tier = ONE full rehearsal sitting (the conversion taste; "sit APM before you sit APM, free, marked" = ad / results-day hook); pass + subscription = unlimited rehearsals (reserved mock cases stay reserved per attempt window). The free-single + unlimited-on-paid structure stands as the working model. **OPEN QUESTION** (downgraded from decided-in-principle): a one-off "Rehearsal + coached debrief" downsell SKU (~€25–29 on €99-checkout abandonment) — Grant reconsidering; may not want any standalone charge at all. If ever built, a fixed product for the check-before-the-real-exam buyer, never a per-attempt meter. Final call deferred to flagship build time, with conversion data in hand.
  - **Content / IP position (decided 2026-07-11):** all scenarios are ORIGINAL works built to the public syllabus structure — never reproduce or derive from ACCA past papers, specimens, or marking schemes (copyright + brand-fatal for enterprise). Exam FORMAT facts (timing, sections, marks splits, descriptors as marking criteria) are uncopyrightable facts; the rehearsal interface is exam-SHAPED in house design, never a pixel-clone of ACCA's CBE trade dress. Marketing: "exam-standard conditions", never "real ACCA questions"; non-affiliation line everywhere. Adversarial generation from the framework = provably original by construction. Solicitor blessing of the content position when enterprise contracts arrive — procurement may request it.
  - **Conversion design — free rehearsal gate placement (decided 2026-07-11):** the VERDICT is fully free and ungated — score, per-requirement marks, pacing diagnosis, descriptor bands (the proof-of-power moment; a fuzzy verdict reads as a demo). The gate is the REPAIR: Ezra's coached debrief per weakness + drill-back into each flagged area = paid. Conversion line pattern: *"You'd have scored 41 today. Here are the six habits that cost you 23 marks — Ezra can coach every one before [sitting]."* Same structural split as the resit diagnostic: diagnosis free, cure paid. Secondary: retake-in-30-days framing (improvement measurement needs the coaching). NEVER: gated scores, pay-to-see-marks, countdown pressure — converts by being genuinely revealing, then charging for the fix.

## Banked — product-scoping Phase 2 (from the /dashboard leak fix)
- Per-account nullable `exam_date` + student-settable affordance (replaces the baked `LC_EXAM_DATE`/`IB_EXAM_DATE` constants).
- `subject`-default retirement with onboarding (retire the `LC_BUSINESS` masquerade at the schema).
- Name capture for non-onboarded (magic-link / admin-seeded) accounts.

## KPMG demo (near-term)
- **Coffee message to the KPMG contact — NOTHING GATES IT; highest-value action on the board.**
- One-pager final export; demo dry-run on Grant's device the day before the meeting.

## GTM + campaign (mostly hands-off)
- Core campaign (UK/IE/UAE @ €10/day) judgement **~24/07** — hands-off until then; metric = core-market signups.
- **Ads geo-split diagnosis CLOSED (2026-07-13):** the cheap-market spend skew (PK/NG/KE/MY absorbing budget without converting) vindicated the WTP-tier geo-split thesis — the core-market campaign is the right structure. **OPEN (optional):** a results-week budget bump on the core markets — Grant's call, not blocking.
- **Funnel state (handover):** first-run F3 banner LIVE (zero-attempt users get one unmissable first-drill CTA); UTM capture F4 built + migration applied (cookie→`profiles.signup_attribution`; resit_runs proves the cookie read — signup-write path exercised once real UTM'd signups arrive). Nurture route still deferred (build after email pipeline proven + volume).
- Blog post 1 self-publishes Sun 13/07; partner sends; redpen ad (Canva); Search Console; Reddit karma (r/ACCA ~5-comment-karma gate — build in r/Accounting first).
- Demand test: r/ACCA + OpenTuition; free-drill + paid-tutor simultaneous launch; Stripe ~€49–69/mo.

## Cross-product
- IB a generation behind: Mia/Aoife still on the leaky instructed-withholding engine (APM proved the structural fix — now unblocked to rebuild); IB Econ Layer 2 hybrid generator broken (~75% reject, needs pattern-level regen); IB BM Layer 2 ungenerated.
- W_WEAK weakness-steering session after ~2 weeks of real attempt-log data (`memory/project_wweak_unblocked`).

## Funnel & signup ops — DIAGNOSED 2026-07-13 (diagnose-only; fixes ruled after)
Triggered by the 13/07 00:26 signup (maphosaan@gmail.com, profile `dd786100`) that bounced with zero activity and never alerted Grant.
- **Admin signup notify SILENT — INSTRUMENTED + fixed, awaiting the definitive log (2026-07-13).** *(Correction: I first headlined "NOTIFY_EMAIL unset in prod" — WRONG. Grant confirmed it IS set. Unverified inference; see `memory/feedback_verify_before_headline`.)* Empirically, the old 5-min gate did NOT trip this signup: maphosaan's `last_sign_in_at` is **0.2s** after `created_at` (fresh signups ~0min, returning users thousands of min), so `Date.now − created_at < 5min` PASSED. Remaining suspects for the pre-fix skip: (a) the `next==='/acca'` condition (if the entry set a different `next`); (b) a swallowed Resend send error; (c) the env var scoped to the wrong Vercel environment (Grant to verify the Production checkbox). **FIX shipped (F1):** removed BOTH the 5-min gate and the `next==='/acca'` scoping — new-signup is now keyed off the profile-just-created signal (`last_sign_in − created < 10min`), which also drives the Meta `signup=1` flag (`app/auth/callback/route.ts`). `notifyGrant` (`lib/notify.ts`) now returns a skip/failure REASON and `console.error`s it (missing config / send error / thrown), and the callback logs sent-vs-skipped-with-reason. Fixture `scripts/test-notify.ts` covers the config-skip branches. **RESOLVED (2026-07-13):** the alert **fired on a post-deploy test signup** (Grant: "nothing more required") — gate removal + instrumentation fixed it; no further branch-hunt.
- **Supabase email confirmation OFF (auto-confirm live).** `email_confirmed_at` ≈ `created_at` (maphosaan: +147ms). Belongs ON per GRADD_BUILD_HARDENING rule 11, but NOT during results week; today a typo'd email is accepted silently (no deliverable address, no bounce). Turn ON after results week + once the nurture pipeline needs a real inbox.
- **Nurture route ABSENT.** No post-signup email sequence exists. Spec (build after the email pipeline is proven live AND signup volume justifies): 3 Resend touches via Vercel cron — day-0 welcome/first-drill, day-1 if counters still 0/0, day-3 resit-plan. Not now.
- **"No sign-up" copy vs auth-wall mismatch — FIXED (copy truth, F2).** Hero microcopy (`components/landing/ACCALandingPage.tsx`) was "Free, 3 minutes, no sign-up" under BOTH CTAs — true for the resit diagnosis, false for "Start free — every drill". Reworded to scope the no-sign-up claim to the resit diagnosis ("Resit diagnosis: free, 3 minutes, no sign-up. Drills: free to start with a quick email sign-in."). **RULING (Grant 2026-07-13): anonymous drill/tutor access is PERMANENTLY OUT — an unenforceable cap, and non-signers were never converting. Never re-propose adding an anonymous drill experience.** The only anonymous surface is (and stays) the resit diagnostic; the fix is copy-truth, not access.
- **Post-auth first-action — FIXED (F3).** A zero-attempt user now gets ONE unmissable primary action on `/acca` (`ACCADashboard` first-run banner → `/acca/tutor?area=<default>`), deep-linked to the resit-diagnosed area if they arrived with `?area=<prefix>` (threaded from the resit CTA, validated against published areas), else the first area. The "Pick your area" grid stays below (retitled "Or pick your area"). Zero-attempt detected via an `acca_drill_attempts` count.
- **UTM capture — BUILT (F4; migration pending apply).** `components/AttributionCapture.tsx` writes first-touch `utm_*`+`fbclid` to a `gradd_attr` cookie on the landing; the auth callback persists it to `profiles.signup_attribution` for a new signup (best-effort, service client) and consumes the cookie. Meta CompleteRegistration still additionally requires cookie-consent granted (`MetaTrackSignup.tsx:27`).
- **Anonymous resit runs — LOGGED (F5·2; migration pending apply).** `/api/acca/resit` `action:'plan'` now best-effort inserts a `resit_runs` row (score, sitting, attempts, weak_prefixes, completed, attribution from the cookie) per completed diagnosis — ends the top-of-funnel blindness on the primary ad CTA (most runs never leave an email). Resit result CTA now threads the weakest area into `?next=/acca?area=<prefix>` (F5·3) so F3's first drill matches the diagnosis.
- **⚠ ONE MANUAL STEP — apply migration `supabase/migrations/20260713120000_signup_attribution_and_resit_runs.sql`** in the Supabase SQL Editor (adds `profiles.signup_attribution jsonb` + the `resit_runs` table). Until applied, F4/F5·2 writes silently no-op (best-effort/swallowed) — code is safe, but nothing persists. Verification queries are in the migration footer.

## Security & ops
- **Rotate the Supabase secret API key** (pasted in chat 04/07 — live security item).
- Migration hygiene backfill — 4 missing Supabase migrations (`memory/project_migration_hygiene`).
- **ENV-MANIFEST / dark-feature self-announce (PATTERN, spec only — build next idle session; Grant-ruled 2026-07-14).** Two silent env-flag failures in one week — (1) `NOTIFY_EMAIL`/signup-alert scoping, (2) `APM_EARNED_REVEAL` dark in prod → the earned reveal fell through to `call_warm` and served a truncated persona refusal instead of the verbatim answer, undiagnosable from the surface (looked like a leg-selection bug; only the message-log `call_type=answer` vs never-`reveal` exposed it). **Spec:** a lightweight env-manifest — a required-flags/keys list (e.g. `APM_EARNED_REVEAL`, `APM_INTENT_LAYER`, `APM_COMPLETENESS_GATE`, `NOTIFY_EMAIL`, `TUTOR_SESSION_SECRET`, Supabase/Stripe/Anthropic keys) asserted at boot AND/OR exposed via a `/api/health` (or `/api/_env-manifest`) endpoint returning each flag's set/unset + intended-state, so a dark feature ANNOUNCES itself instead of failing as persona prose. Small build. Do NOT leak secret VALUES — presence + intended-state only.
- **Reveal wrapper reads STALE diagnosis state (SPEC-ONLY, surfaced 2026-07-14 student-walk; build next idle).** `call4_reveal`'s AFM wrapper (`REVEAL_AFM_WRAPPER_SYSTEM`) is passed the `diagnosis` (the last gap) and told to "name and correct the misconception" — but on the **success path** (a student who SOLVED the drill, now `resolved=true`, then clicks "View the model answer") that diagnosis is stale (from an earlier miss, or absent), so the wrapper can assert a figures-slip the student didn't make. **Fix:** thread the confirm/resolved state into the wrapper prompt — when the reveal is reached from a solved state, credit the student and frame it as comparison ("here's the full layout for comparison / how a full-marks version is laid out"), not correction. When reached from the struggle path (miss ≥ 2), keep the current name-and-correct framing. Small prompt-shape change + a `reachedFrom: 'solved' | 'struggle'` param to `call4_reveal`.
- **PROMPT CACHING cost-note follow-up — PENDING (mechanism shipped 2026-07-23, cost note owed once a day of traffic accrues).** `cache_control` breakpoints wired across the tutor route (all legs), the narrative `CriterionGrader`, `generate-afm-drills.ts`, and `redteam-judge.ts` (see `lib/acca/prompt-cache.ts` + the 2026-07-23 journal entry) — content byte-identical, live-fire verified. **Next session with a day of post-deploy traffic:** pull the Anthropic console's before/after spend and append the comparison to that journal entry (task's own step 5). Also flagged there, out of scope for that task: **X6·APM (typo'd reveal, `REVEAL_SYSTEM`) reproduced invented illustrative figures/percentages twice across independent live-fire redteam runs** — a genuine, pre-existing content-quality gap in the APM reveal wrapper (not caused by caching — proven via a byte-equality check that cache_control never alters prompt bytes), worth a NO_INVENTED_NUMBERS-style tightening pass on `REVEAL_SYSTEM`/`REVEAL_SYSTEM_SOLVED` when convenient.

## 🔸 OPEN 2026-07-29 — debrief built and unwired; two things owed before it can be shown

**Built:** `lib/acca/debrief.ts` (pure, unwired) + `npm run test:debrief`. It joins marking
output to the pacing report, quotes the marker's reasoning verbatim as the "why", derives one
next action per requirement from the band definition, and leads with a single headline —
collapse first, else the largest single mark loss.

**⚠ SURFACED WHILE BUILDING IT — the collapse headline names ordinals, not labels.**
`computePacing`'s collapse statement is built from `paper_order`, so it reads *"Between
submitting requirement 6 and finishing…"* where the rest of the debrief says *"B1(ii)"*. The
debrief reuses that statement VERBATIM (deliberately — re-wording it would let the headline
drift out of the language constraints the pacing fixtures enforce), so the infelicity is
inherited, not introduced. **Not fixed here:** `pacing.ts` is shipped and fixture-locked, and
changing its statement text touches those fixtures. Fix by passing labels into the collapse
statement when the debrief is wired, and update `test-pacing.ts`'s expected strings in the
same change.

**⚠ NOT PROVEN END TO END.** Every fixture uses SYNTHETIC marker feedback shaped like real
output. The real `judgeTechnicalMarking` feedback has never been fed through `buildDebrief`,
because no sit has been marked — `acca_case_marking` carries **0 rows with technical marks**.
The verbatim-quote guarantee is proven; the READABILITY of real marker prose in a
student-facing debrief is not. Do that with the first real sit before any wiring is designed.

**Wiring is NOT started** and remains Grant's call. The marketing block stands: the rehearsal
loop is not student-reachable, and `docs/APM_MARKETING_POSITIONING.md`'s inventory needs
re-dating when it moves.
