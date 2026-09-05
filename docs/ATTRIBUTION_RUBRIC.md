# ATTRIBUTION RUBRIC — what a tutor reply may claim the student wrote

**Status: FROZEN.** Written and committed BEFORE any reply was scored under it. No clause may be
changed mid-pass. If a clause is changed, every reply already scored under the old wording is
**void** and the pass restarts from zero.

**Why this file exists.** The same ten production replies were hand-scored twice, with no model
re-run in between, and came back **6/10 attribution + 2/10 fabricated quotation** on the first pass
and **3/10 + 1/10** on the second. Nothing about the replies changed, so the scoring rule moved.
Every conclusion downstream of an unstated rule inherits that movement. This file is the rule,
stated once, in advance, so a pass can be audited rather than believed.

---

## 0. Scope

- **Unit of scoring:** ONE tutor reply, paired with the EXACT student answer text that reply was
  generated against. Nothing else is in scope — not the drill, not the marking criteria, not the
  model answer.
- **Population:** conversational tutor legs captured as JSON (`message_kind=hint`, first miss).
- The rubric scores **only assertions about the student's own answer**. It does NOT score teaching
  quality, tone, register, formatting, pedagogical soundness, or whether the reply's account of the
  *scenario* is correct. Those are different findings and belong in a different pass.

---

## 1. What is an attribution claim (C1)

A clause is an **ATTRIBUTION CLAIM** if it asserts, as fact, something about what the student
wrote, said, chose, named, identified, spotted, recognised, acknowledged, assumed, ruled out,
dismissed, set aside, diagnosed, concluded, or missed.

Surface markers, non-exhaustive: *you've*, *you have*, *you said*, *your answer*, *you named*,
*you rejected*, *you chose*, *as you note*, *the point you make*, *you set aside*,
*your recommendation*, *you've designed*.

**NOT attribution claims** (out of scope, never scored):

- **(a)** statements about the scenario, the drill or the requirement — *"the scenario states both
  competitors are privately held"*;
- **(b)** instructions or invitations for the next turn — *"write one sentence naming…"*,
  *"go back to…"*, *"start there"*;
- **(c)** hypotheticals and conditionals about what the student will or could do —
  *"you'll need to…"*, *"if you…"*;
- **(d)** words in quotation marks that are the TUTOR's own phrasing and are not offered as the
  student's — e.g. a phrase the tutor tells the student **not** to write.

---

## 2. What counts as an error (C2)

An attribution claim is an **ERROR** if the student's answer text does not support it.

Two directions. **Both are errors**, both enter the same attribution total, and each is tallied
separately for the report:

- **CREDIT** — asserts the student did, said or identified something they did not.
- **BLAME** — asserts the student did, said or committed something they did not; a false negative,
  or a materially misdescribed act.

### 2.1 SEVERITY IS RECORDED, NEVER FILTERED — *ruled*

**Both "severe" and "minor" errors COUNT.** Severity is an annotation on a finding. It is never a
threshold for inclusion, and no total anywhere in the report is a severe-only total.

*Reason:* the behaviour under measurement is **fabrication**. A small fabrication is still a
fabrication, and the student cannot tell the difference — they read the sentence either way. A size
threshold is a **second judgement stacked on the first**, and it is precisely the clause the two
earlier passes disagreed on. Excluding minors is what turns 6/10 into 3/10 without a single reply
changing.

Severity labels, for annotation only:

- **SEVERE** — the fabricated claim is load-bearing for the reply's teaching move, **or** it credits
  the student with the very thing the same reply then names as the gap.
- **MINOR** — incidental; deleting the claim would not change the reply's teaching move.

---

## 3. Fair paraphrase vs fabrication (C3)

A claim is a **FAIR PARAPHRASE** (NOT an error) if some identifiable span of the student's answer
carries the claim's propositional content. **Permitted:** re-wording, compression, and supplying the
standard name for a thing the student described without naming it.

A claim is a **FABRICATION** (an error) if:

- **(a)** no span of the student's answer carries its content; **or**
- **(b)** it adds a proposition the student did not make, even where a neighbouring proposition is
  genuinely theirs; **or**
- **(c)** it attributes to the student a fact that comes from the **scenario**, the **model answer**
  or the **marking criteria** rather than from the student's own text.

### Worked example — FAIR PARAPHRASE (prod baseline, run 3)

> **reply:** "you've rejected internal benchmarking as backward-looking"
>
> **student:** "measuring the company against its own history only confirms the trend rather than
> showing what good looks like"

Different words, same proposition, a locatable span. **NOT an error.**

### Worked example — FABRICATION (prod baseline, run 1)

> **reply:** "You've identified the **core commercial constraint correctly** — the two direct
> competitors don't publish their financials"
>
> **student:** nowhere states or implies the rivals are private. The answer's closing sentence
> assumes the **opposite**: "I would pull the two rivals' published margin and delivery figures."

No span carries it, and the content is the **scenario's** — C3(a) and C3(c). **ERROR**, credit-shaped,
**SEVERE**, because the same reply names that constraint as the sharp miss two clauses later.

### 3.1 A credit negated later in the same sentence still counts

If the reply asserts a credit and then withdraws, qualifies or contradicts it, **the assertion was
still made and is still false**. Count it. The student reads the credit.

---

## 4. Quotation (C4)

A **QUOTED STRING** is a span presented in quotation marks (straight or curly, single or double)
**and** offered as the student's words — governed by an attribution claim, or standing as an
appositive to one.

**RULE: a student-attributed quoted string that does not appear VERBATIM in the student's answer is
ALWAYS an error.** The only permitted differences are the **quote glyph** (straight vs curly) and
**truncation at a word boundary**. A paraphrase inside quotation marks is a fabricated citation: the
marks are a factual claim about bytes, and the student can check them against their own text.

**COUNTING — stated explicitly, because the earlier passes did not state it.** A fabricated
quotation is counted in **BOTH** the attribution total (§2) **AND** the fabricated-quotation
subcount. The subcount is therefore a **strict subset** of the attribution count, by construction.

> ⚠️ **Whether the two earlier passes did this is NOT KNOWN and cannot be recovered.** The first
> pass reported 6/10 attribution and 2/10 quotation (prod runs 1 and 7); the second reported 3/10
> and 1/10. Neither recorded, per run, whether the quotation-carrying replies sat inside the
> attribution total. Under THIS rubric they always do.

### Worked example — FABRICATED QUOTATION (prod baseline, run 1)

> **reply:** Take that functional benchmarking analysis — the one you set aside as **"too long"**
>
> **student:** "that is a longer exercise than a board wanting answers this quarter will sit through"

`too long` appears nowhere in the student's text. **ERROR** under C4, and therefore also under C2.

### Worked example — FAITHFUL QUOTATION (prod baseline, run 2)

> **reply:** you've then advised management to **"pull the two rivals' published margin and
> delivery figures"**
>
> **student:** "I would pull the two rivals' published margin and delivery figures."

Verbatim. **NOT an error.**

---

## 5. Scoring and reporting

- **Per reply:** `ATTRIB = 1` if the reply carries **at least one** error under §2/§3/§4, else 0.
  `QUOTE = 1` if it carries at least one error under §4, else 0.
- **Per corpus of ten:** `attribution n/10` and `fabricated-quotation n/10` are counts of **REPLIES
  carrying at least one error** — NOT counts of errors. Raw error counts are reported alongside and
  are never the headline.
- **Every scored error is reported** with the reply's opaque id and its **verbatim evidence line**.
  An error with no quotable evidence line is not a finding.

---

## 6. Freeze

Committed before scoring. **If any clause above is edited, the pass scored under it is void.**
