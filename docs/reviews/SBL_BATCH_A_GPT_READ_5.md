# Cold read 5 — SBL Batch A

**⚠️ PROVENANCE, AND THE CEILING ON THIS PACK.** Reads 2, 3 and 4 are banked as GPT's own text.
**This one is not.** Read 5's findings reached the drafts through chat and were applied straight to
`docs/rollbacks/SBL_narrative_draft_*.json` in commit `179db83`; no transcript was saved at the
time. What follows is reconstructed from the applied edits, the drafts themselves and that commit's
message — so the **substance** of each finding is evidenced by the diff it produced, and the
**wording** attributed to GPT below is a paraphrase, not a quotation. Every string quoted from a
draft IS verbatim. Written 2026-08-22 to close the gap named as open item 2 in `AFM_SURFACED.md`:
GATE-P's status arm reconciles the DB's approved-set against the journal's reviewed-set, and until
now read 5 had nothing journalled to reconcile against.

**Where the content lives now.** The read-5 edits were applied to the drafts on 2026-08-21, and the
content sync (`2efd64d`, P-DB3/P-DB4) then carried the reviewed drafts into the DB rows. Verified
2026-08-22 by `npm run reconcile:sbl-content`: **all 5 rows green across all 5 content fields.**

| Drill | Row id | `lo_code` | Draft resolved | Status |
| --- | --- | --- | --- | --- |
| SBL-A1 | `9d414a87` | A2b | `SBL_narrative_draft_SBL-A1.json` | `candidate` / unpublished |
| SBL-A2 | `5bd47a79` | A2d | `SBL_narrative_draft_SBL-A2.json` | `candidate` / unpublished |
| SBL-A3 | `46e10662` | A1a | `SBL_narrative_draft_SBL-A3.json` | `candidate` / unpublished |
| SBL-A4 | `80b4918b` | A3d | `SBL_narrative_draft_SBL-A4.2.json` | `candidate` / unpublished |
| SBL-A5 | `2fbb2902` | A3a | `SBL_narrative_draft_SBL-A5.json` | `candidate` / unpublished |

---

## What read 5 found

Read 4 had closed with a taxonomy claim: the six named shapes were mature, the one genuinely new
class was **EPISTEMIC-STATUS COLLAPSE / CLAIM→FACT LAUNDERING**, and the remaining work was
provenance discipline in generation rather than another word lint.

Read 5 tested that claim against the post-read-4 drafts and produced **one shape the six do not
cover**, plus **two residuals that are instances of shapes already named** — and, separately, a
short list it explicitly declined to hold publication for.

### SHAPE 7 — FIXED-PREMISE VIOLATION (new; A2)

**Not** an instance of certainty overclaim, invented specifics, or rubric→GOOD drift. Those are all
defects in how strongly a claim is stated or where it came from. This one is a defect in **which
question is being marked.**

A2's requirement stipulates a premise: assess whether the 40% warehousing aim is achievable
**without changing that culture**. Both `c6` and the model answer built the credible-opposing-case
half — the half the criterion requires be *answered* — on PCG's **capacity to change that culture
over four years**. That is a coherent argument about a different question, and one the premise has
already closed. A criterion that admits an out-of-premise route is not marking the judgement it says
it marks, and a candidate who takes that route can satisfy the criterion while never engaging the
stipulation.

The repair is not to delete the opposing case — a criterion with no reachable counter-verdict marks
agreement with its author. It is to rebuild the opposing case **inside** the premise. The exhibit
supports one: the five artefacts establish the constraints are significant, but the case supplies no
financials, no client pipeline, no competitor position and no warehousing revenue figures, so
**impossibility cannot be established from what the candidate holds**. That is an evidential-limits
argument, available with the culture held constant, and it leaves both verdicts reachable on the
same exhibit.

### Residual 1 — the authority claim was still laundered, in the TEACHING field (A4)

Read 4's cleanest instance of claim→fact laundering was A4: the exhibit records only that Camacho
*stated* the retainer sits below his authority limit, and `c1` plus the GOOD had promoted that
statement into an established fact. Read 4 repaired `c1` and the GOOD.

**It did not repair `full_reveal`**, which still asserted the same laundered fact as the worked
consequence it teaches. This is an instance of a named shape, not a new one — but it carries a rule
worth stating on its own: **a criterion is never fixed alone. The teaching fields are part of the
criterion**, and a reveal that models the defect teaches it to every student who reaches it.

### Residual 2 — the hotline given a function the exhibit never gives it (A4)

`c3` and the GOOD both described the ethics hotline as *"the channel for testing"* Camacho's
assertion. The exhibit establishes it as the channel through which concerns are **raised**. Calling
it a testing channel is an imported mechanic of the kind read 2 named — small, but it changes what
the candidate is told the hotline is for, and the criterion's whole point is what Salazar's response
did to the weight of an assurance.

---

## What was applied

Five edits across three sites, in `179db83`. Applied through an assert-exactly-one-occurrence patch
— a zero-match could not report success and a two-match could not edit an unread sentence — and all
five read back verified. Drafts round-trip through `JSON.stringify(_, null, 2)`, so the diff is 5
insertions / 5 deletions and not a reformat.

### A2 `c6` — the opposing case moved inside the premise

**Was:**
> Four years is a material horizon, and the exhibit describes PCG's PRESENT culture rather than its
> ability to alter that culture over that period — the case gives no financials, no competitor
> position and no client pipeline. So a candidate who argues the target is reachable is arguing from
> the same evidence as one who says the constraints are mutually reinforcing and decisive.

**Now:**
> THE REQUIREMENT FIXES THE PREMISE — the judgement asked for is whether the aim is achievable
> WITHOUT changing that culture — so a case resting on PCG's capacity to reform the culture over four
> years answers a different question and cannot carry this criterion. The opposing case has to be
> made INSIDE that premise, and the exhibit leaves room for it: the five artefacts establish that the
> constraints are significant, but the case gives no financials, no client pipeline, no competitor
> position and no warehousing revenue figures, so impossibility cannot be established from what the
> candidate has been given. A candidate who holds the culture constant, weighs the constraints as
> serious, and concludes that the evidence does not establish the target is out of reach is arguing
> from the same exhibit as one who concludes the constraints are mutually reinforcing and decisive.

Everything else in `c6` is unchanged, including the four full-mark conditions, the invented-route
disqualifier and the 1-mark and no-mark arms.

### A2 `model_answer` — the same rebuild in the GOOD

**Was:**
> The opposing case is real and I have weighed it: four years is a material horizon, and what these
> artefacts describe is PCG's present culture, not its capacity to change that culture over that
> period — the case gives no financials, no competitor position and no client pipeline.

**Now:**
> The opposing case is real and I have weighed it: the question is whether the aim is reachable with
> this culture as it stands, and the papers before me do not establish that it is out of reach —
> there are no financials here, no client pipeline, no competitor position and no warehousing revenue
> figures against which four years could be tested.

The GOOD still lands the same committed verdict. What changed is the route by which it earns the
right to it.

### A4 `full_reveal` — the laundered consequence replaced

**Was:**
> follow it to a consequence (sitting below an authority threshold shows formal approval authority,
> not freedom from conflict, so the assertion cannot settle the question it is offered to settle)

**Now:**
> follow it to a consequence (even if Camacho is correct that the amount sits below his authority
> threshold, that establishes only procedural authority and does not resolve the conflict)

The *"even if"* is the anti-laundering move: it concedes the claim arguendo without ever recording
it as verified.

### A4 `c3` and `model_answer` — the hotline restored to a reporting channel

**Was** (identically in both):
> an assurance that the arrangement is 'entirely within the rules' carries less weight when the
> channel for testing it has been treated this way

**Now:**
> an assurance that the arrangement is 'entirely within the rules' carries less weight when the
> formal channel for raising concerns about the arrangement has been treated this way

### Lints re-run after the hand edit

A hand edit is otherwise unchecked, so both advisory lints were re-run. Both exit 0 by design —
they report, they do not refuse.

- **Certainty lint:** A2 3 unhedged, A4 4. All pre-existing except **one introduced by the new
  reveal wording** — *"establishes only procedural authority"*, which the closed term list reads as
  a route declared the sole one. It is the opposite: it **limits** what the fact establishes, which
  is the anti-laundering move itself. Named here rather than left for the next reader to re-find.
- **Warning-drift:** reports only recall pairs, including the GOOD's own *"I do not claim it"* —
  the correct handling rather than drift.

---

## What was deliberately left as grinding

Read 5 named these and did not hold publication for them. Recorded because a finding that is not
written down gets re-found, and the next reader is entitled to know it was seen and dispositioned
rather than missed. **Each is a real over-reach in the lead sentence of its site; each is bounded by
a fence already present in the same field, which is why the marking basis is not the over-general
reading.**

### 1. A2 `c2` — *"the credential that wins senior advancement"*

**Site:** `c2`, A2d, 2 marks, requirement part (i). Also present in the A2 GOOD's *Leadership
pipeline* paragraph.

**The objection, in substance:** the exhibit records three promotion announcements each citing years
behind the wheel. *"the credential that wins senior advancement at PCG"* converts three observations
into a standing organisational rule — the sample→population move read 2 named.

**Why it was left:** the criterion fences itself in its own body, in capitals:

> THE CASE DESCRIBES THREE PROMOTIONS, NOT THE WHOLE SENIOR COHORT: a candidate who says the three
> most recent promotions suggest a pattern while noting that the case does not describe the wider
> cohort is reading the evidence correctly and earns full marks. This criterion does NOT require the
> stronger claim that no senior manager holds commercial or warehousing competence — the case does
> not establish it.

and the GOOD carries the matching fence verbatim: *"It does not tell us that nobody in the wider
senior cohort has commercial or warehousing experience, and I do not claim it."* A candidate cannot
lose marks for declining the over-general reading, and cannot gain them for asserting it. The
grinding item is that the lead sentence still states more firmly than the exhibit supports something
the next three sentences withdraw.

### 2. A3 `c4` — *"the people who would have to carry the launch"*

**Site:** `c4`, A1a, 2 marks, requirement part (ii).

**The objection, in substance:** the exhibit establishes that regional managers in four of six
regions received no advance briefing. It does not establish that they were the people the launch
**had to** run through — that is a necessity the criterion supplies.

**Why it was left:** read 4's warning-drift repair already put the fence in the same criterion —

> the case does not record whether other prepared staff, trainers or local champions existed, and a
> candidate need not assume there were none

— and the operative marking demand is stated in terms of *"regional-management preparedness in four
of the six regions"*, a fact the exhibit does supply, not in terms of the launch depending on them.
The criterion also holds the survey link at exactly the right strength (*"CONSISTENT with"*, *"does
not prove"*), which was the blocker read 3 raised here.

### 3. A3 `model_answer` — *"synthesised it correctly"*

**Site:** the *What the Comparison Reveals* paragraph:

> the evidence does not suggest Kilimo's leadership lacked strategic capability. The board
> commissioned rigorous analysis, synthesised it correctly, and generated a well-evidenced
> opportunity.

**The objection, in substance:** the exhibit records what the study **did** — eight months of farmer
surveys, cash-handling cost mapping, benchmarking — and what it **concluded**. It does not establish
that the synthesis was *correct*. That is a quality verdict on the analysis, and the one hard
outcome the case does report (34% against a 280,000 target) is not obviously a vindication of it.

**Why it was left:** the load-bearing claim of that paragraph is the **contrast** — formulation
strong, implementation weak — and the contrast survives without the correctness verdict; the
surrounding sentences are properly hedged (*"the evidence does not suggest… lacked strategic
capability"*); and **no criterion marks on whether the synthesis was correct**, so the phrase steers
a reader without moving a mark. It remains a place where the GOOD asserts a judgement the exhibit
does not underwrite, and a future pass over A3 should reword it — most likely to what the exhibit
does support, that the study was rigorous in method and its conclusions were endorsed unanimously by
the board.

---

## What read 5 did NOT reopen

- **A1 and A5 were untouched.** No read-5 edit reaches either draft.
- The read-4 repairs to A4 `c1` and the A4 GOOD stood; read 5's A4 findings are the sites read 4
  did not reach, not a reversal of what it did.
- Read 4's engineering conclusion — that the two lints are surface-form checks and the next real
  improvement is provenance discipline in the generation loop, banked as the **P-N4 / preserve
  evidence status** proposal — was not superseded. Read 5's SHAPE 7 is orthogonal to it: an evidence
  ledger would not have caught the fixed-premise violation, because no proposition's epistemic status
  was misstated. The premise was simply not the one being answered.

---

## Standing position

**All five rows remain `candidate` / `published=false`.** The content arm passes; the status arm has
not been run, because **GATE-P is not gated on content alone**:

1. **P-DB8(b) — the guard must be deployed, not merely committed.** Satisfied 2026-08-22:
   `feat/sbl-foundation` merged to `main` at `4918b17`, contract gate 65/65 on the Vercel build,
   `Build Completed` / `Deployment completed`. `SERVED_PAPERS` scoping is live.
2. **Read 5 must be journalled.** Satisfied by this pack.
3. **Grant's ruling, outstanding.** SBL is DECLARED but NOT SERVED. Publishing these rows makes them
   live for a paper no surface serves — and every surface was just hardened to refuse it. Whether the
   flip lands now (content ready, surface later) or waits until SBL becomes served is not a technical
   question and is not Claude Code's to answer.
