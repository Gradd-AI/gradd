# RESULT — the creditable seed, n = 30. Three of five gates fail. No merge.

Run 2026-09-06 against `main` at `8ab08cf` (no code change — see §1). Seed `CASE_SEED=b`,
byte-identical to the n=10 spread control. Capture:
`docs/rollbacks/case_reveal_n30_seedB_creditable_20260906.json`. Predictions banked at `fc8430a`
BEFORE the run. Rehearsal account torn down, 0 rows left on all five tables.

Scored against `docs/ATTRIBUTION_RUBRIC.md`, FROZEN, unedited. Every finding carries its verbatim
evidence line.

---

## The gate

| axis | gate | measured | |
|---|---|---|---|
| fabricated quotation | ≤ 2/30 | **4/30** | ❌ |
| attribution | ≤ 3/30 | **6/30** (5/30 if run 19 is judged fair) | ❌ |
| credit accuracy | every credit names something the student wrote | **29/30** | ❌ |
| closing-beat unsourced figures | ≤ 6/30 | **12/30** | ❌ |
| wrong-answer tripwire | 0/10 | **not run — moot** | — |

**Three of the four runnable gates fail. Stopped, not merged.**

## Predictions vs outcome

| | predicted | measured | |
|---|---|---|---|
| Grant — fabricated quotation | 3–6/30, expected to FAIL | 4/30, failed | ✅ held |
| Grant — attribution | ≤ 4/30 | 6/30 | ❌ missed low |
| Grant — credits accurate | yes | 29/30 | ❌ one wrong |
| Grant — closing-beat figures | ≤ 4/30 | 12/30 | ❌ — and see §1 |
| Grant — pointer spread ≥ 3 sections | ≥ 3 | **1 section (#3 × 29)** | ❌ |
| Claude — closing-beat 10–20/30, gate fails | 10–20 | 12/30 | ✅ held |
| Claude — pointer 25–30 on #3, does not reach 3 | 25–30 | 29 on #3 | ✅ held |
| Claude — suppression arms 0/30 | 0 | **0/30** | ✅ held |

---

## 1. Fabricated quotation — 4/30 (5 raw errors)

All four are the same mechanism and it is the one the n=10 sighting named: the student's sentence
is **re-inflected inside the quotation marks**. In every case the underlying credit is TRUE — the
student did treat those choices as strengths. The defect is at the marks, which are a factual
claim about bytes the student can check.

Student's source spans, verbatim:
> "it exposes the model to a much wider range of purchasing behaviour than two normal years would
> have done" · "it keeps the training set clean of incomplete histories that would otherwise add
> noise"

| run | the invented string | the student's actual words | what moved |
|---|---|---|---|
| 4 | `"keep the model clean,"` | "it **keeps** the **training set** clean of incomplete histories" | inflection + **"the model" for "the training set"** |
| 6 | `"keep the set clean."` | "it **keeps** the **training set** clean of incomplete histories" | inflection + dropped word (not a boundary truncation) |
| 7 | `"keep the training set clean,"` | "it **keeps** the training set clean of incomplete histories" | inflection only — the exact repeat of the n=10 run-2 sighting |
| 24 | `"expose the model to a wider range"` **and** `"keep the training set clean,"` | "it **exposes** the model to a **much** wider range of purchasing behaviour" / "it **keeps** the training set clean" | two in one reply, under an explicit **"you wrote that"** |

Run 24 is the sharpest: *"**you wrote that** including the discounting year and excluding new
customers "expose the model to a wider range" and "keep the training set clean,""* — a direct
claim about what is on the page, wrong twice.

**Not counted** (C4(d) — the tutor's own phrasing, not offered as the student's words): `"model is
complete"` (run 12, the analyst's claim and a section title), `"soundness"` / `"what isn't this
model seeing?"` (16), `"clean data"` / `"data that hides the future"` (18), `"clean training data"`
/ `"representative training data"` (20), `"keep it clean"` inside the hypothetical (23), `"what
signal is the model missing?"` (29). Two student-attributed quotes ARE verbatim and are correctly
not errors: `"sound"` (25), `"complete"` (30).

📐 **The n=10 sighting is now a rate: 2/10 → 4/30, same shape, same source sentence.** Every one of
the four quotes the SAME clause of the student's answer — the "keeps the training set clean"
sentence. It is the only sentence in the answer short and quotable enough to tempt a citation, and
the model re-inflects it to fit the surrounding grammar (`you treated … as strengths that "keep
…"` needs the bare infinitive). **That is a grammatical pressure, not a memory failure**, which is
why it survives at n=30 and why it will not be fixed by an instruction not to misquote.

## 2. Attribution — 6/30 (credit 5, blame 1; severe 1, minor 5)

The four quotation errors above enter this total by construction (rubric §4). Two more:

**Run 12 — CREDIT, SEVERE, and the only inaccurate credit in the run:**
> reply: *"you correctly pushed back on the **"model is complete"** claim—that's solid critical
> thinking."*
> student: *"On the analyst's final point **I agree the model can be treated as complete**: the
> data choices above are sound, so retraining would add cost without adding much."*

No span carries it and the nearest span carries the opposite (C3(a)). The student **agreed** with
the claim; the reply congratulates them for challenging it.

**Run 19 — BLAME/misdescription, MINOR, and the marginal call in this pass:**
> reply: *"you've read the inclusion of the promotion year and exclusion of new joiners as
> *safeguards*"*
> student's reason for the **inclusion** was breadth — *"it exposes the model to a much wider range
> of purchasing behaviour"* — not safeguarding. Only the exclusion was framed as keeping the set
> clean.

C3(b): a proposition compressed across a conjunction. Counted because §2.1 forbids filtering
minors; **flagged as the one call that could go the other way.** At 5/30 the gate still fails.

## 3. Credit accuracy — 29/30

Every credit except run 12's is accurate and locatable: the base-rate trap, correlation-vs-
causation, the demand for recall/precision/false-positive cost, the bare flagged/not-flagged list
blocking prioritisation, the pilot-instead-of-mandate. **The failure is not that credit is
fabricated wholesale — it is that one reply in thirty credits the student for the exact move they
declined to make.**

## 4. Pointer beat — 29/30 in-list, ALL on #3, and the 1 miss is a CODE defect

`#3 Training-data limitations` × 29. `#1 The accuracy claim` × 0. Nothing else named.

**Grant's ≥3-sections prediction fails, and the criterion is nonetheless working.** Seed B's
diagnosis is single-valued in the same way seed A's was — its one surviving error is the
training-data claim — and #3 is where the answer resolves it. Seed A concentrated 30/30 on #1;
seed B concentrates 29/30 on #3. **The two seeds together are the evidence that #1 was never a
positional default**; a third section would require a seed whose diagnosis is genuinely split, and
no sample size substitutes for that.

🔴 **RUN 13's off-list is NOT the model failing to point. `sanitizeAfmWrapper` DELETED the pointer
beat, and the audit cannot see it.** Proof, and it is two-part:

- The server logged **`[reveal:pointer-off-list]` zero times** while the served reply carries no
  heading. The audit runs on `wrapper` (raw model output, `teach-engine.ts:1111`); the student
  reads `served`, which is `sanitizeAfmWrapper(wrapper)`. The two disagreed, which means the raw
  wrapper DID name a listed section.
- Reproduced directly: `sanitizeAfmWrapper` cuts at `\n[^\n]*worked answer`. A two-paragraph
  wrapper whose second paragraph is *"Start by reading **Training-data limitations** in the worked
  answer below…"* is cut from 397 bytes to 279, and `wrapperNamesAListedSection` goes
  **true → false**. The single-paragraph control is untouched (396 → 396, still true).

**So the system prompt instructs the model to name *"the worked answer below"*, and the sanitizer
deletes any line after a newline that says it.** The other 29 runs escaped only because they are
one paragraph. Run 13 lost BOTH its pointer and its closing beat — two of four beats — and served
a reveal that stops on the diagnosis.

⚠️ **`assembleAfmReveal` is SHARED WITH THE DRILL ROUTE, whose prompt uses the same phrase and
which has no pointer audit at all.** The same cut there is silent by construction. Not measured
this session.

## 5. Closing-beat unsourced figures — 12/30, and the audit sees half of them

Twelve wrappers close on a hypothetical carrying a figure that is not the case's own: run 1
(`2025`), 2 (`2008–2009`), 4 (`£20`), 5 (`six months`), 7 (`2008–2009`), 11 (`six months`), 15
(`six months`), 20 (`three years`), 21 (`2008`, `five years`, `two years`), 24 (`40%`, `six
months`), 27 (`18 months`), 30 (`2008–2009`, `under 25`).

Runs 10 and 19 close on `twelve months`, which IS the case's own exclusion window, and are NOT
counted. Counting them gives 14/30; the gate fails either way.

**`[reveal:unsourced-figures]` flagged 6 of the 12** — and the six misses split into two causes,
which the seed-A pass recorded as one:
- **3 by collision** (`£20`, `40%`, `18`) — the documented ceiling 2b, the value appears somewhere
  in context ∪ model_answer ∪ attempt.
- **3 by construction** (`six months` × 3, plus run 24's) — **the audit reads DIGITS. A number
  written as a word is invisible to it.** Never quote its count as a census.

📐 **Against seed A's 23/30 on the identical prompt: 12/30. Per P-M6 these two are NOT claimed to
differ** — but the direction is what a creditable seed predicts, and the mechanism is visible: seed
B's answer already contains the correct base-rate reasoning, so the closing beat has less headroom
to invent a fresh imbalanced-data hypothetical and reaches instead for a plausible date range.

**None of this is evidence about the wire.** See §1 of the predictions doc: `resolvableTopics` is
`[]` on APM and the prompt was byte-identical with and without it.

## 6. Everything else — clean

| | |
|---|---|
| truncation (artefact tail cut) | **0/30** |
| wrapper heading or horizontal rule | **0/30** |
| wrapper ends mid-sentence | **0/30** |
| `creditable` per attempt turn | **`[1,1]` on all 30** |
| suppression armed | **0/30 — correctly** |
| reveal latency | min 4456 · p50 7855 · max 8360 ms |
| HTTP | 200 on all 90 turns |

**The suppression's negative arm is the positive control and it holds at n=30.** The seed earns
genuine credit on two heads, the diagnose leg reported `creditable = 1` on every turn, and the
conditioned opening never fired. Combined with seed A's 30/30 armed, both arms are demonstrated at
n=30.

---

## What this run does not claim

One requirement (Vesla Retail (i), D2g), one seed answer, APM. Nothing here transfers to AFM cases,
where the pointer beat is omitted on all 20 published requirements.
