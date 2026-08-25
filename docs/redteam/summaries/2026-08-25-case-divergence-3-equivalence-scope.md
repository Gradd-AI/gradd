# 2026-08-25 — divergence #3: the equivalence check's scope. **NULL RESULT — the predicted defect does not reproduce.**

Cited by `GENERATOR_DOCTRINE.md` P-T4 (as a prediction that FAILED) and `AFM_SURFACED.md`.

## The prediction, stated before the run

`call2_diagnose` on the case surface asks whether *"the student's **numerical result** is
**mathematically** equivalent to the model's"*. The drill route has asked about *"the student's
claim (numerical OR narrative) … substantively equivalent"* since the grounding work.

**Predicted:** on a discursive requirement there is no numerical result, so the check cannot
return equivalent, and the only branch left open to the call is *"name an error"* — the P-T4
shape, a demand the input cannot satisfy being answered with the nearest permitted thing.
Expected: the shipped arm falsely names gaps on correct discursive answers; the narrative arm
raises the correct-sentinel rate.

**This prediction was WRONG.**

## Seed class

Targets chosen by **digit density across all 23 published non-mock case requirements** — both
have **ZERO digits in the model answer**, so there is no numerical result for the shipped check to
bind to at all. This is the strongest possible form of the predicted trap.

| target | case_id | requirement_id | marks | digits in model answer |
| --- | --- | --- | ---: | ---: |
| Torfin Build Supplies (i) D1b | `a3000000-…-0000000000d2` | `0374e966-ff7c-4368-93a7-b1efcecb849b` | 13 | 0 |
| Vesla Retail (ii) D1d | `a2000000-…-0000000000d1` | `04d353dd-cece-43df-8c52-c43b878ee730` | 7 | 0 |

**Both seeded answers are CORRECT** — each covers every substantive point of its stored
`model_answer`, and each is deliberately **worded differently throughout**, because substantive
equivalence under different wording is exactly what the narrative arm protects and what the
numeric-only arm has no way to see. A gap named on these would be a false positive.

## Arms, n, harness

`… --surface polarity --polarity-only dc-case --n 20 --legs 1 --target local`

| arm | `TUTOR_CASE_EQUIV` |
| --- | --- |
| BEFORE | `shipped` — numeric-only, today's behaviour |
| AFTER | `narrative` — numeric OR narrative, substantive |

`TUTOR_CASE_HINT_OPENING=conditional` held constant across both arms so divergence #2 cannot
confound this. **`APM_COMPLETENESS_GATE` UNSET** — that gate can demote a correct verdict for a
missing component, which would score as a gap and confound call2's own behaviour. n = 20 × 1 leg
× 2 targets × 2 arms = **80 legs**.

## Validity conditions — reported before the counts

| | shipped | narrative |
| --- | ---: | ---: |
| envelope parsed | 40/40 | 40/40 |
| correct-sentinel REACHABLE (the branch is live) | **yes — 40/40** | **yes — 40/40** |

The second condition is the one that decides whether a null is readable. It is satisfied in the
strongest way possible: the branch is not merely reachable, it is saturated.

## Primary endpoint — declared before the count

**The fraction of turns on which `call2_diagnose` returns the correct-sentinel
(`messageKind === 'correct'`) rather than manufacturing a gap label.** Machine-readable, not
hand-classified.

## Result

| | Torfin shipped | Torfin narrative | Vesla shipped | Vesla narrative |
| --- | ---: | ---: | ---: | ---: |
| `kind: 'correct'` | 20/20 | 20/20 | 20/20 | 20/20 |
| gap manufactured | **0/20** | **0/20** | **0/20** | **0/20** |

**Every one of the 80 legs emitted the sentinel verbatim** — `"answer correct — convention differs
from model only"`, the only distinct label observed in either arm. `creditable` read 1 on 80/80,
independently consistent with answers that are genuinely correct.

**The shipped numeric-only check does NOT manufacture a gap on a correct discursive answer, even
where the model answer contains no digits whatsoever.** The model reads the check's intent —
*"only name an error if the answer is genuinely WRONG"* — rather than being trapped by its numeric
framing. The narrative arm is exactly **non-inferior**: identical on every cell.

## What this does and does not license

- ✅ **#3 is safe to ship on CONVERGENCE grounds** — 80 legs show it changes nothing observable.
- ⛔ **#3 must NOT be described as a fix.** There is no measured harm for it to have fixed. Calling
  a code convergence a fabrication fix is precisely the stage-6 error P-T4 exists to prevent.
- ⚠️ **CEILING EFFECT — this arm had no room to show benefit.** BEFORE was already at 40/40, so a
  benefit could not have been detected had one existed. The null is strong evidence about *this*
  seed class and weak evidence about the divergence in general.
- ⚠️ **UNTESTED REGION:** an answer that is correct but *thin*, or correct but expressed so
  unusually that equivalence is genuinely arguable. My seeds are comprehensive and unambiguous;
  the closer call is where a scope difference could still bite. Note that on a *partial* answer a
  named gap is CORRECT, so the false-positive endpoint only has meaning on a fully correct one —
  which is exactly where the ceiling sits.

## A process finding, and it is the second time

**`TUTOR_CASE_EQUIV` was added to the engine and NOT to the driver's `ARM_VARS`**, so the first
shipped-arm run printed and stored an ARM line that did not mention the variable under test — the
identical failure fixed one day earlier for `TUTOR_CASE_HINT_OPENING`. **That capture was
discarded and the arm re-run** rather than annotated after the fact.

It recurs because the list lives in `redteam-tutor.ts` while the variant is declared in
`teach-engine.ts`. **Adding a prompt variant means adding it to `ARM_VARS` in the same commit.**
A variant absent from that list is invisible to every capture, and a capture that cannot name its
own arm is not evidence.

## Capture note

`docs/redteam/d3-{SHIPPED,NARRATIVE}-polarity.json`, gitignored by design; both carry their own
`arm` object naming all five variant variables.
