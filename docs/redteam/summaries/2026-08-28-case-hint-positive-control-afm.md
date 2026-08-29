# 2026-08-28 — case HINT leg positive control: the AFM cell it never had

Extends `2026-08-25-case-envelope-positive-control.md`. Cited by `AFM_SURFACED.md`.

## ⚠️ FIRST, A CORRECTION TO THE PREMISE THAT MOTIVATED THIS

**The case hint leg's positive control already existed, and it was run on the CASE surface, not
the drill leg.** `8e3646d` (2026-08-25) ran `--legs 1` on two genuinely-partial case answers and
measured `creditable === 1` on 40/40, the (c) suppression arm firing 0/40, and credit naming
something the student actually wrote on 40/40. That is the same primary and the same secondary
asked for here.

**The real gap was narrower and is about the PAPER, not the leg.** Both existing controls —
Orlen (i) and Keldan (i) — are `paper: 'APM'`. Kestrel is the only AFM case target on this entire
surface and it is a DECLINE shape, so **no AFM case leg had ever been shown a genuinely creditable
answer.** That is what this arm closes.

📐 **Why the gap was worth closing rather than waved through on symmetry:** divergence #5 measured
the AFM reveal cell at 10/30 clean against APM's 26/30. *"APM held, therefore AFM holds"* is
precisely the inference this surface has already falsified once.

## The seed — authored from E2a's own `answer_schema`

Kestrel (ii) carries four criteria over 7 marks. The control **earns `c_transaction` (2 marks) in
full and on the criterion's own terms** — names transaction exposure, anchors it on the peso
remittances (`f_remit`), states the cash-flow-not-accounting distinction the criterion demands, and
gives the forward/money-market management — then stops and says so. `c_translation`, `c_economic`
and the recommendation (5 of 7 marks) are absent.

⚠️ **`development_required: true` on that criterion is why the mechanism is spelled out rather than
named.** A bare *"there is transaction exposure"* would trip F2 (named-but-not-described) and would
NOT be creditable — which would have made this control measure the wrong thing entirely.

## Power — computed BEFORE the run

The primary is a **zero-event endpoint** (the arm must not fire), so the statistic is the rule of
three, not a two-proportion test. 0 events in n ⇒ 95% upper bound 3/n.

| n/cell | 95% UB on 0 events | P(catch a true 5% rate) | turns |
| ---: | ---: | ---: | ---: |
| 20 (`8e3646d`) | 15.0% | 64.2% | 40 |
| 40 | 7.5% | 87.1% | 80 |
| **60** | **5.0%** | **95.4%** | **120** |

**n = 60 per cell.** The hint leg is ONE turn per repeat, so tripling the existing control's n costs
120 turns total.

## Arm

`TUTOR_CASE_HINT_OPENING=conditional` — the production default, set on **both** the server and the
script so the capture self-documents (`arm: "conditional"` in both files). One arm only, for the
reason `8e3646d` gives: where `creditable === 1` the conditional arm *returns the shipped string*,
so a `shipped` arm would measure identical bytes, and that identity is fixture-pinned.

## Validity conditions — before the counts

| | AFM (Kestrel) | APM (Keldan) |
| --- | ---: | ---: |
| all legs HTTP 200 | 60/60 | 60/60 |
| **`kind = hint`** | **60/60** | **60/60** |
| `kind = correct` | 0/60 | 0/60 |
| arm recorded in capture | `conditional` | `conditional` |

**The seeds are treated as INCOMPLETE, so the hint leg actually ran.** A `correct` verdict would
have routed to `call3_confirm` and the arm would never have been exercised — the failure mode that
would have made a clean result meaningless.

## Primary — `creditable` reads 1 and the praise-first opening SURVIVES

| | result |
| --- | ---: |
| `creditable === 1` | **122/122** (120 + 2 pilot) |
| **(c) suppression arm fired** | **0/120** |
| 95% upper bound on the fire-rate | **≤5.0% per cell, ≤2.5% pooled** |

⚠️ **THE 0/120 IS DETERMINISTIC, NOT AN OUTPUT SCAN.** The arm's condition IS `creditable === 0`
(`nothingCreditable(gapVerdict)`), and its only carve-out (`completenessGap`) can suppress further
but never fire it. `creditable === 1` on every turn therefore *entails* the arm did not fire.
Scanning replies for the suppression string would test whether the model ECHOED an instruction,
which is a weaker and different claim; that scan also returns 0/120 and is reported as corroboration
only.

## Secondary — is the credit SPECIFIC or generic?

**SPECIFIC on 120/120. Zero generic, zero misattributed by the declared rubric.** Every opening
names a substantive move the student actually made — AFM: *"the remittance of reported profits from
Mexico to the UK parent is a known future cash flow in pesos"*; APM: *"three of the four measures
you calculated actually deteriorated"*.

⚠️ **"BLIND" IS NOT CLAIMED HERE, AND THE REASON MATTERS.** There is ONE arm, so blinding to arm is
vacuous, and cell must stay visible because judging specificity requires knowing what the student
wrote. What was actually done: all 120 pooled and shuffled on a fixed seed so the two cells do not
read as blocks (guarding drift and fatigue from lining up with the cell boundary), with
classifications recorded before any per-cell tally. That is weaker than divergence #5's blind and
is stated as such.

## 📐 INCIDENTAL — AFM OVERSTATES WHAT THE STUDENT COVERED, 5/60. APM 0/60.

Not the declared endpoint, found in the read, reported because it is the reveal arm's (A) inversion
mode appearing on the hint leg in a milder form:

| rep | claim |
| ---: | --- |
| 16 | invents a FOURTH exposure — *"the financing/tax exposure that arises because Monterrey's peso profits are taxed in Mexico at 20%"* |
| 17 | *"you've identified the right three types and then stopped"* — the student identified ONE |
| 27, 47 | *"separated transaction exposure from the other two"* — they declined the other two |
| 60 | *"you've walked away after naming the other two"* — they never named them |

**AFM 5/60 vs APM 0/60, Fisher p = 0.057** — not significant, and the APM cell is a genuine control
rather than an assumption (the same scan for credit on the OMITTED objectives returns 0/60 there).
**The direction matches divergence #5's AFM/APM gap exactly**, on a different leg, with a different
seed shape. Two independent sightings of the same asymmetry is worth more than either alone, and
neither is yet attributable to the paper rather than the requirement — the confound is unchanged.

## Verdict

**The case surface's demand-side work is now measured in BOTH directions on BOTH papers.** The arm
fires where it should (0/40 → 38/40 on decline seeds, divergence #2) and does not fire where it
should not (0/120 here, ≤2.5% pooled upper bound), and the credit it preserves is specific rather
than generic. No live defect.

## Claim ceiling

- One requirement per paper, one seed shape per requirement, one classifier.
- The 5/60 overstatement is an INCIDENTAL finding at p = 0.057 on a rubric written during the read.
  It is a candidate to pre-register, not a result.
- The AFM seed earns ONE criterion of four. A seed earning three of four might behave differently,
  and nothing here measures that.

## Capture note

`docs/redteam/pc2-{AFM,APM}-polarity.json`, gitignored; both carry `TUTOR_CASE_HINT_OPENING=conditional`.
