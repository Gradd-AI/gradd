# RESULT — the verbatim quotation check and the sanitizer cut. Four axes pass, the tripwire fails. No merge.

Branch `fix/reveal-quotation-and-sanitizer-cut`, cut from `measure/case-reveal-creditable-n30`,
which carries **zero code delta from `main`** (`git diff main HEAD --stat` → four docs files, no
code). The two doc commits are carried so the record this work answers resolves.

Seed `CASE_SEED=b`, byte-frozen and byte-identical to `case_reveal_n30_seedB_creditable_20260906.json`.
Same harness (`scripts/_case_reveal_n30.ts`), same requirement (Vesla Retail (i), D2g), same
account lifecycle, all rehearsal accounts torn down with 0 rows left on all five tables.
Attribution scored against `docs/ATTRIBUTION_RUBRIC.md`, **FROZEN, unedited**.

---

## The gate

| axis | gate | measured | |
|---|---|---|---|
| fabricated quotation, served | **0/30** | **0/30** | ✅ |
| attribution | ≤ 3/30 | **3/30** | ✅ *(at the boundary — read §5)* |
| pointer beat present and in-list | 30/30 | **30/30** | ✅ |
| truncation | 0/30 | **0/30** | ✅ |
| wrong-answer tripwire, seed A, n=10 | **0 attribution errors** | **1/10** | ❌ |
| drill reveal n=10 — sanitizer serves the same thing | (confirm) | **10/10 cuts identical old vs new** | ✅ |

**One axis fails. Stopped at the report, not merged, per §6 of the brief.**

⚠️ **THE TRIPWIRE FAILURE IS NOT SEPARABLE FROM THE PRE-CHANGE BASELINE, AND IT IS NOT ATTRIBUTED
TO THIS BRANCH.** 1/10 against 0/30 on the banked pre-change seed-A capture is Fisher p ≈ 0.25.
Nothing in either change touches the credit beat. It fails the gate as Grant set it; it is not
evidence of a regression, and saying otherwise would be the third wrong diagnosis in a row.

## Predictions vs outcome

| | predicted | measured | |
|---|---|---|---|
| Grant — quotation **0/30**, mechanical; above 0 means a hole | 0/30 | 0/30, **after two holes were found and named** | ✅ held, §2 |
| Grant — attribution **2–4/30**; the inversion survives | 2–4 | 3/30 | ✅ held |
| Grant — pointer **30/30** | 30/30 | 30/30 | ✅ held |

Grant asked that his confidence on §1 be treated as resting on it being a byte comparison rather
than on judgement. **That was the right place to put it.** The byte comparison never failed. Both
holes were in the *classifier that decides which spans get byte-compared* — which is judgement,
implemented in code, and it was wrong twice.

---

## 1. THE PROCESS, STATED FIRST, BECAUSE IT IS THE THING A SCEPTICAL READER SHOULD CHECK

**This is run 3 of 3.** Each re-run followed a CODE CHANGE that closed a hole the previous run
exposed — not a dislike of the number. All three captures are banked so the sequence is auditable:

| run | capture | quotation surviving | what it exposed |
|---|---|---|---|
| 1 | `quotefix_n30_run1_masking_hole_20260906.json` | **1/30** | punctuation inside an earlier citation, and an unclosed bracket, read as clause breaks |
| 2 | `quotefix_n30_run2_verblist_hole_20260906.json` | **1/30** | `endorsed` was not on the attribution-verb list |
| 3 | `quotefix_n30_run3_gate_20260906.json` | **0/30** | the gate run |

⚠️ **RE-RUNNING UNTIL A NUMBER PASSES IS HOW A GATE GETS MANUFACTURED, AND THE DEFENCE HERE IS NOT
THE COUNT.** It is that both fixes are structural and both carry a MUST-FAIL fixture transcribing
the served text that broke them, so a later edit that reopens either hole goes red without a run.
Judge the residual on the mechanism in §3, never on 0/30.

---

## 2. THE TWO HOLES, WITH THE SERVED TEXT THAT FOUND THEM

### Hole 1 — punctuation that is not the carrier sentence's (run 1, run 22)

Served, verbatim:

> …you've read the inclusion of the promotion year and exclusion of new customers as strengths
> (**"cleaner," "better generalisation"**), when in fact they're both material blind spots.

The check removed the marks from `"cleaner,"` and **served `"better generalisation"` with its marks
intact**. Cause, two parts, both the same class:

- the gap the second citation was judged against contained **the first citation's own comma**, and
- the bracket **opens before the mark and closes after it**, so a complete-pair strip could never
  reach it.

Neither is a clause boundary of the carrier sentence. Fixed by masking the CONTENT of every quoted
span (marks kept, indices preserved) before any scan, stripping an unclosed `(`, and running the
whole check **to a fixed point** so the guarantee is a construction rather than an argument about
which direction the residual falls.

### Hole 2 — a verb that was not on the list (run 2, run 12)

Served, verbatim:

> …**you endorsed** including the sitewide-discount year as **"exposing the model to wider
> behaviour,"** but that year's distorted purchasing patterns mean…

against the student's *"it exposes the model to a much wider range of purchasing behaviour"*.
Missed for one reason: **`endorsed` was not an attribution verb.** The whole endorsement/stance
family is now on the list, because picking these off one sighting at a time is how the next one
ships. **This is the module's named residual, caught in production rather than in argument.**

---

## 3. THE RESIDUAL, NAMED — this is what to judge, not the 0/30

The check is two parts: a **byte comparison** (sound) and a **classifier** deciding which spans are
offered as the student's words (judgement, and the thing that failed twice). Its holes:

1. **THE VERB LIST IS A PHRASE TABLE.** An attribution verb not on it is a miss. Hole 2 was exactly
   this. The list now carries its provenance and its three deliberate ABSENCES (`rate` — a false
   friend in this domain; `confuse`/`conflate` — the tutor's own device; perception and instruction
   verbs), so an absence can be argued with rather than guessed at.
2. **A CLAUSE BREAK BETWEEN THE VERB AND THE MARK IS A MISS** — `you wrote that the data was fine,
   and called it "sound"`. Not observed in 137 measured spans; still the shape to watch.
3. **STRAIGHT SINGLE QUOTES** are read as citations only under strict adjacency guards. Negative
   control: all 333 single quotes in the pre-change corpus are apostrophes and the guards yield
   **zero** pairs on them.

⚠️ **CLAIM CEILING, verbatim, and it is in the module header in these words:** a green run means
*no span this check classified as student-attributed survives in quotation marks without appearing
in the attempt*. It does **NOT** mean the reply contains no fabricated attribution — an unquoted
false claim is a §2/§3 error under the rubric and this check cannot see one. **It measures
citations, not honesty.** Three of the 30 replies in the gate run carry a fabricated attribution
with no quotation marks anywhere near it (§5).

📐 **THE MODEL'S RATE IS UNCHANGED; ONLY THE SERVED RATE MOVED.** The gate run unquoted **8
citations across 7 of 30 replies** — every one a re-inflection of the same two student sentences,
**zero over-firing**. Against the pre-change hand read of 4/30 replies, that is the same behaviour
(Fisher p = 0.51). **Do not report this fix as reducing fabrication. It removes the citation claim
and leaves the sentence, which is all it was asked to do.**

Every removal, gate run:

| run | unquoted | trigger |
|---|---|---|
| 7 | `expose the model to a wider range` | `you've read` |
| 14 | `keep the training set clean,` | `you've treated` |
| 18 | `keep the model clean,` | `you've read` |
| 19 | `expose the model to wider behaviour` · `keep training clean,` | `you framed` |
| 20 | `keep the set clean,` | `you've read` |
| 24 | `keep the training set clean,` | `you've read` |
| 29 | `expose the model to wider range` | `you read` |

Student's source spans, for comparison: *"it exposes the model to a much wider range of purchasing
behaviour"* · *"it keeps the training set clean of incomplete histories"*. **All eight are the
grammatical pressure the last result named** — the carrier needs a bare infinitive where the
student wrote the third person — and it is undiminished at n=30.

### The discriminator, measured

Over **137 quoted spans** (57 in the three banked pre-change captures + 14 + 17 + 9 + 5 in the four
new ones): **the historic corpus classification is byte-identical before and after both fixes** —
8 student-attributed, all 8 fabricated, **0 false positives on the 49 tutor-own spans**. The
tutor's hypotheticals (`a model that simply predicts "no churn"`) and scare quotes (`confusing
"clean training data" with "representative training data"`) are untouched, which is what the brief
asked for and what `ATTRIBUTION_RUBRIC.md` §1(d) excludes from scoring.

**How they are told apart, in three structural parts** (module header carries this in full):

1. **TRIGGER** — a second-person attribution trigger before the mark in the same sentence.
2. **GOVERNOR** — no new clause between that trigger and the mark. **This is the part that does the
   work**: 34 of the 57 pre-change spans sit in sentences that OPEN `You've treated the 94%
   accuracy …` and then hand the quote to a different subject (`… but you've fallen into the
   base-rate trap—a model that simply predicts "no churn"`). The trigger is present and the quote
   is not the student's; what separates them is a crossed clause boundary.
3. **NOT AN ATTRIBUTIVE NAME** — determiner + span + head noun names a thing rather than citing
   (`you correctly pushed back on the "model is complete" claim`), which the frozen rubric scores
   §1(d). `that` is deliberately absent from the determiner set: it is a relativizer in four of the
   five original sightings, and part 3 EXCLUDES a span from being checked at all.

### Normalisation, stated exactly as asked

**Whitespace** — every run collapses to one space, both sides, then trim. **And one deliberate
second normalisation beyond the brief: ONE trailing `, . ; :` immediately inside the closing mark
is ignored**, because American typographic convention puts the carrier sentence's own comma inside
the marks. It is provably safe in the direction that matters — dropping a trailing punctuation mark
can only turn a non-match into a match when that mark is the sole difference, which is typography
and not a different word — and **it changes none of the five original sightings**, checked.
**NOT normalised, on purpose:** letter case, apostrophe shape, markdown emphasis the model added
inside the marks, and every other byte.

---

## 4. THE SANITIZER — the cut condition was wrong in BOTH directions

### It ate the pointer beat (fixed)

The cut fired on `\n[^\n]*(worked answer|investment appraisal)` — **any** line after a newline
containing those words. `REVEAL_AFM_WRAPPER_SYSTEM` instructs the model to *"say WHICH PART of the
worked answer below to read first"*, so the sentence the pointer beat exists to produce is exactly
the sentence it deleted. Replaced with a **heading SHAPE test** — markdown `#`, a wholly bold line,
a bold opener that never closes (the token-cap stub), a numbered/`Step N` line — with a deliberate
escape: **a bold line ending in sentence punctuation is prose, never a heading**, because
under-cutting leaves a stray line and over-cutting deletes a beat the student needed.

### 📐 IT WAS ALSO MISSING 30 OF 38 BUILD RESTATEMENTS, WHICH IS THE FINDING NOBODY WAS LOOKING FOR

Measured across the gate run and the drill run: with the model's `---` divider removed, the OLD
phrase cut stops **8 of 38** restatement headings; the new shape test stops **38/38**. Thirty of
them open `**The accuracy claim**` or `**Benchmarking Programme for Viña del Sol: Evaluation and
Assessment**` — real build headings naming neither phrase. **The old cut's coverage rested entirely
on the model happening to write a divider first.**

### 🔴 AND THE GUARD IS LOAD-BEARING, NOT BELT-AND-BRACES

`[reveal:wrapper-cut]` is new, and the first thing it shows is that **the wrapper model restates
the worked answer on 29 of 30 case reveals and 10 of 10 drill reveals** — 33,634 characters on the
case surface, 9,451 on the drill surface, ~1,000 per reveal. Every cut removed a divider followed
by a build restatement; **zero removed a beat**. The prompt says *"do NOT begin the worked answer"*
and is disobeyed essentially always; `sanitizeAfmWrapper` is the only thing standing between a
student and a duplicated, model-authored, figure-unverified second answer. **Nothing logged this
until now.**

### How often the old cut fired on existing captures — asked, and answered with its limits

**Case surface: 1 detectable fire in 80 served wrappers.** The signature is mechanical and is the
run-13 proof — the pointer absent from the served wrapper while `[reveal:pointer-off-list]` logged
nothing, because the audit read the raw string and the student read the cut one. Exposure is low
for a structural reason: **79 of 80 model wrappers are a single paragraph**, and the cut needed the
phrase on a line after a newline. 20 of 80 name the worked answer; all 20 do it in the first
paragraph.

⚠️ **THE RATE CANNOT BE RECOVERED FROM STORED DATA, AND SAYING SO IS THE ANSWER.** Every capture
holds the SERVED wrapper, i.e. post-cut, so the corpus of raw wrappers available is exactly the
ones that were NOT cut — biased by construction. 1/80 is a **lower bound** detectable only where
the cut removed the pointer; a cut that removed only the closing beat leaves no signature at all.

**Drill surface: existing captures cannot answer it — there are ZERO drill-reveal captures in
`docs/rollbacks/`** (measured: every capture with a reveal leg is a case capture). So it was
measured directly instead, `quotefix_drill_n10_20260906.json`: **the fix changed nothing that
surface serves.** All 10 cuts fire at a `---` divider, where the old and new conditions are
identical; the buggy phrase half never fired, because 9 of 10 drill wrappers are a single paragraph
and the one multi-paragraph wrapper did not name the worked answer in a later paragraph. Truncation
0/10, separator 10/10, headings 0/10, **`legacy_would_cut` 0/10 on the served text**.

### The audit now reads what the student reads

`wrapperNamesAListedSection` ran on the raw model output while the student read the sanitized
string, so on the one run where the cut ate the pointer the log said nothing was wrong. It now runs
on the served wrapper, pinned MUST-FAIL in `test-case-reveal-routing.ts`.

---

## 5. ATTRIBUTION — 3/30, one shape, and the boundary pass is not a fix

All three are the same compression, and it is systematic rather than random:

> **run 3** *"Your instinct to pilot the customer-services finding is sound."*
> **run 6** *"Your instinct to pilot the customer-services signal is also sound."*
> **run 21** *"Your instinct to pilot the customer-services flagged list is also sound."*

against the student's *"The customer-services finding is worth acting on, **and the flagged list
can go to marketing as a pilot**."* The pilot attaches to the flagged list; the tutor moves it onto
the customer-services finding. **C3(b)** — a proposition compressed across a conjunction, the same
clause the previous pass's run 19 was counted under. MINOR in all three; §2.1 forbids filtering
minors.

⚠️ **A BOUNDARY PASS ON A RATE AXIS IS NOT EVIDENCE THE AXIS IS FIXED**, and this workstream's own
`P-M6` is the reason: n=30 cannot separate 3/30 from the pre-change 6/30 (Fisher p = 0.47), and the
95% upper bound on 3/30 is 22%. **Nothing in this branch addresses invented credit.**
Grant's prediction that "the inversion survives; nothing here addresses it" is the correct reading
of this number.

**The marginal call, recorded and NOT counted:** run 12's *"A year dominated by sitewide
discounting doesn't expose the model to **"wider behaviour"**"*. The subject is *a year*, not
*you*; the marks scare-quote a disputed term inside the tutor's own negated predication — the same
construction the frozen pass scored §1(d) for `"clean data"`, `"soundness"` and `"clean training
data"`. Counted, attribution is 4/30 and the gate FAILS.

**Clean of the severe class this time:** no reply credits the student with rejecting the *"model is
complete"* claim they explicitly agreed with. That error was 1/30 in the pre-change run; 0/30 here
is not a distinguishable improvement (Fisher p = 1.00).

---

## 6. THE TRIPWIRE — 1/10, and it is the severe class

Seed A, the confidently wrong answer, suppression correctly **ARMED 10/10**, pointer **10/10 on
#1** (seed B concentrates 30/30 on #3 — the two seeds together are what shows the pointer criterion
SELECTS rather than defaulting), quotation **0/10 student-attributed spans**, truncation 0/10.

🔴 **Run 9, verbatim:**

> *"**You've done the work to spot that 94% accuracy needs hard scrutiny against the base rate,
> which is exactly right** — but then you've used that insight to *accept* the analyst's
> conclusions rather than to *dismantle* them."*

The student wrote the opposite: *"a model that is right 94% of the time is performing **far above
the underlying rate** of the event it is predicting, and that margin is what gives **comfort**"*.
They did compare accuracy to the base rate and concluded it was good. **C3(a)** — no span carries
it and the nearest carries the reverse — and **SEVERE** by the rubric's own definition: it credits
the student with the very thing the same reply then names as the gap.

🔴 **AND THE CONDITIONED OPENING WAS ARMED WHEN IT HAPPENED.** With `nothingCreditable = true` the
wrapper is told to *"open on the first move the answer turns on"* and carries **no credit demand at
all**. It still opened on an invented credit. **Removing the demand does not remove the behaviour**
— which is a finding about the suppression, not about this branch.

**Not counted, recorded as the marginal call the other way:** run 3's *"You've spotted that 94% is
a headline figure"*. The pre-change seed-A capture contains two openings of the identical shape
(runs 26 and 30: *"You've spotted that 94% accuracy sounds reassuring"* / *"…is impressive on its
face"*) which are plainly true, and *"headline figure"* describes the number's role rather than
claiming the student judged it superficial. Counted, the tripwire is 2/10, and 2/10 against 0/30 is Fisher p = 0.058 — still not significant at 0.05, but no longer comfortably inside the baseline.

**Baseline, checked rather than assumed:** the 30 pre-change seed-A openings carry **0** of the
run-9 inversion (read individually, not grepped). 1/10 against 0/30 is **Fisher p = 0.250 — not
separable**, so this is a rate that was never measured on this arm rather than a rate that moved.
⚠️ It is close: the 95% upper bound on 0/30 is 9.5%, and the observation is 10%. **A second
tripwire at n=30 is what would settle it**, and it is cheap — the same harness, `CASE_SEED=a
CASE_RUNS=30`. Not run here because the axis fails either way and §6 says stop.

---

## 7. Everything else — clean

| | gate run (n=30) | tripwire (n=10) | drill (n=10) |
|---|---|---|---|
| truncation (artefact tail cut) | 0/30 | 0/10 | 0/10 |
| wrapper heading or horizontal rule | 0/30 | 0/10 | 0/10 |
| wrapper ends mid-sentence | 0/30 | 0/10 | 0/10 |
| separator present | 30/30 | 10/10 | 10/10 |
| `creditable` per attempt turn | `[1,1]` ×30 | `[0,0]` ×10 | — |
| suppression armed | 0/30 — correctly | 10/10 — correctly | — |
| HTTP | 200 on all 90 turns | 200 on all 30 | 200 on all 30 |
| reveal latency ms | min 4119 · p50 7861 · max 8814 | 7140 · 7645 · 7918 | 5350 · 7853 · 8473 |

**Both arms of the suppression are demonstrated again, unchanged.**

`[reveal:unsourced-figures]` flagged 4/30 on the gate run against 12/30 pre-change. **Per P-M6
these are NOT claimed to differ** (Fisher p = 0.039 — nominally significant, but this is one of
several axes read off the same run and nothing in this branch touches the closing beat; treat it as
the seed's own variance until something is built for it). See `AFM_SURFACED.md` item (h).

---

## What this run does not claim

One requirement (Vesla Retail (i), D2g) and one drill (APM A1g), two seed answers, APM only.
Nothing here transfers to AFM cases, where the pointer beat is omitted on all 20 published
requirements. The quotation check is live on **both** surfaces; only the case surface's fabrication
rate has been measured at n=30.
