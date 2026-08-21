## Answer: there is **one genuinely new shape**

Most of what remains is still an instance of the shapes you've already named:

* **certainty overclaim** — converting “risk/suggests” into “does/will”;
* **rubric → GOOD drift** — criterion repairs the inference, GOOD quietly reintroduces it;
* **invented specifics / imported knowledge** — adding roles, processes, industry mechanics or consequences the exhibit never supplies;
* plus already-named subtypes such as hidden ranking and sample→population.

But I think there is **one distinct shape that isn't adequately named yet**:

# NEW SHAPE: **EPISTEMIC-STATUS COLLAPSE**

### Or, more plainly: **CLAIM → FACT LAUNDERING**

This is where the exhibit contains something only as:

* someone's assertion;
* someone's opinion;
* management's justification;
* a survey respondent's attribution;
* an allegation;
* a forecast;

and the rubric/GOOD silently promotes the **content of that statement into an established case fact**.

That is different from ordinary certainty overclaim.

---

## The cleanest instance is A4

The exhibit says only that Camacho **stated**:

> “The annual retainer of COP 4.2 billion sits below my authority limit...” 

That establishes:

**Camacho claims it is below his authority limit.**

It does **not independently establish**:

**It is in fact below his authority limit.**

But c1 says:

> “sitting below an authority threshold demonstrates formal approval authority...” 

And the GOOD says:

> “it confirms that the mechanical rule was not broken...” 

That has laundered the CFO's assertion into a verified fact.

This is particularly important because the requirement expressly tells the candidate to **challenge Camacho's assertion**. The model may perfectly reasonably say:

> “Even if Camacho is correct that the amount falls within his authority limit, that does not resolve the ethical conflict.”

It may **not** say the exhibit has confirmed that the authority rule was complied with.

That's a different epistemic status.

---

# Why this is not just “certainty overclaim”

The certainty lint might happen to catch **“confirms”** in that sentence.

But that's incidental.

I could write the same defect without any obvious certainty word:

> “The authority limit gives Camacho formal authority to approve the COP 4.2bn retainer, but…”

That sounds restrained. It still commits the error because **the authority-limit fact originated only in Camacho's own assertion**.

Similarly:

> “Given that the retainer falls below his authority limit…”

No flashy red-flag verb. Still wrong.

So the actual defect isn't grammatical certainty.

It's:

> **the source-status of evidence has been lost during reasoning.**

---

# I see three other residuals, but they're OLD shapes

### 1. A3 GOOD/reveal: classic warning-drift

c4 now explicitly says the case does **not** establish whether other prepared staff, trainers or local champions existed. 

Yet the GOOD still says the failure:

> “left four of the six regions without prepared support in the field...” 

That's not new.

That's precisely:

**rubric-to-GOOD drift + certainty overclaim.**

Your warning-drift lint is aimed directly at this.

---

### 2. A2: invented specifics/imported mechanics

For example the GOOD says:

> “Moving into contract warehousing requires commercial and finance input into decisions the operations function has historically made alone...” 

The exhibit shows operations dominates meetings.

It does **not** say the operations function historically made those decisions alone.

That's the already-known:

**invented specific / inference strengthened into fact.**

Likewise, “commercially skilled hires leave” is properly framed as a risk now, so that isn't a new class. 

---

### 3. A4 c3 → GOOD: hidden ranking + drift

The repaired criterion deliberately says procurement staff are:

> “among those likely to hold relevant information”. 

The GOOD goes back to:

> “The people best placed to raise a concern ... are procurement staff...” 

That's already named:

**hidden ranking + rubric-to-GOOD drift.**

No new doctrine needed for that one.

---

# So: are the two lints enough for Batch B?

## **No.**

Not because you're discovering lots of new defect families. You're not.

The taxonomy is becoming stable.

The problem is that **the two lints operate mainly on linguistic surface form**, whereas P-N3 is fundamentally an **evidence-provenance problem**.

The current two checks are useful:

1. **certainty lint**
   catches suspicious strength;

2. **warning-drift check**
   catches a criterion explicitly forbidding X followed by GOOD/reveal asserting X.

Keep both.

But Batch B needs one additional control in the **generation loop**, not merely another word lint.

# Add an evidence-status ledger

Every scenario proposition should carry something like:

| Evidence status                  | Example                                            |
| -------------------------------- | -------------------------------------------------- |
| **FACT**                         | Wife owns 34%                                      |
| **OBSERVED EVENT**               | Ríos removed within one week                       |
| **ACTOR ASSERTION**              | Camacho says retainer is below his authority limit |
| **OPINION/INTERPRETATION**       | CFO thinks 68% overstates concern                  |
| **SURVEY FINDING**               | 61% cite lack of support                           |
| **EXTERNAL/INDEPENDENT FINDING** | Engineers confirm 55% mains risk                   |
| **ABSENCE OF EVIDENCE**          | No VFM review is recorded                          |
| **AUTHOR INFERENCE**             | Familiarity may reduce objectivity                 |

Then make generation obey:

> **A derived statement cannot have stronger epistemic status than its strongest supporting exhibit proposition unless the reasoning explicitly makes it an inference.**

For Camacho:

`ACTOR ASSERTION: below authority limit`

can generate:

> “Camacho says the amount is within his authority.”

or:

> “Even if that assertion is correct…”

It cannot generate:

> “The mechanical rule was not broken.”

---

# I would actually make this Doctrine P-N4

> **P-N4 — PRESERVE EVIDENCE STATUS.**
> A claim reported by the exhibit remains a claim; an opinion remains an opinion; a survey attribution remains an attribution; an absence of recorded evidence remains an absence of recorded evidence. Do not promote any of them to established fact without independent exhibit support.

That catches a family of errors P-N3 identifies only after the fact.

## Decision for Batch B

**Keep the two lints, but change the generation loop.**

I wouldn't spend time building a third vocabulary-based lint. You're hitting diminishing returns there. The remaining failures increasingly depend on **who said what and how firmly the exhibit establishes it**, not on whether the generated sentence contains “proves”, “only”, “best” or another lexical flag.

So my diagnosis is:

> **Taxonomy: mostly mature, with one new class — EPISTEMIC-STATUS COLLAPSE / CLAIM→FACT LAUNDERING.**
>
> **Engineering implication: the two existing lints aren't enough on their own. Add provenance/evidence-status discipline to generation.**

That is the next meaningful improvement rather than another larger red-word list.
