# Predictions — the ship candidate, banked before the first run

**Branch:** `feat/case-reveal-design-b` (commits `952a479` design B on the case reveal,
`aba4e40` credit-demand deletion).
**Banked:** 2026-09-06, by Grant, BEFORE any arm ran. Written down because a prediction that
lives in a transcript is a prediction that gets cleared, and an unbanked prediction is
indistinguishable afterwards from a rationalisation of whatever came back.

**What is being measured:** the same Vesla (i) wrong answer, full case session
(hint → teach → reveal), ten runs, frozen rubric, hand-read. Plus a positive control on the
drill hint leg. The Sonnet arms are NOT run — they are the fallback if this fails.

---

## The reveal leg (design B + every listed demand removed)

| # | Prediction | Value |
|---|---|---|
| R1 | Truncation | **0/10** |
| R2 | The student sees all six heads | **10/10** |
| R3 | Headers / dividers surviving the sanitizer | **0/10** |
| R4 | Credit fabrication | **≤ 2/10** |

**R4 is a LOW prediction on a defect called low three times running.** What makes it
different this time is stated in advance rather than after: it is the first arm with every
listed demand removed AND an anchored artefact underneath — the marker's conditions.

> **The decision rule, fixed now:** if R4 comes in **≥ 5/10**, the fabrication is not
> instruction-driven at all, and the span mechanism moves to the critical path.

## The hint and teach legs (deletion only, unanchored)

| # | Prediction | Value |
|---|---|---|
| H1 | Hint-leg credit fabrication | **≥ 4/10** |
| T1 | Teach-leg credit fabrication | **≥ 4/10** |

Deliberately a prediction of FAILURE: deletion alone is expected NOT to be enough where
there is no artefact to anchor against.

## The positive control (drill hint leg, ANSWER-3, declared professional-scepticism strength)

| # | Prediction | Value |
|---|---|---|
| C1 | Real strength named with no instruction to credit | **≥ 5/10** |

Reported as credited-intended / other-real / none.

---

## Recorded against these predictions

Reported per leg: attribution strict and clear-cut, credit-fabrication, quotation, blame,
headers/dividers, truncation, latency; for the reveal, whether the student sees all six heads.

## ⚠️ Two things the ship candidate carries that the predictions do not name

Recorded here, before the run, so neither can be discovered afterwards and read as a result.

1. **The reveal is NOT demand-free.** `REVEAL_AFM_WRAPPER_SYSTEM` — the shared wrapper system
   design B routes to — opens with an UNCONDITIONED *"first credit, specifically, what they
   already had right"*. The ruling deliberately left the reveal's credit clause alone to be
   measured, so R4's premise ("every demand removed") holds for the four listed sites and NOT
   for the wrapper. R4 measures a credit demand over an anchored artefact, not the absence of
   one.
2. **A measured win was dropped to get here.** `routed_2p_conditioned` suppressed the
   praise-first clause when nothing in the attempt earned credit — clean reveal openings
   7/60 → 36/60, Fisher p = 4.0e-8 (2026-08-28). Design B replaces the whole opening rather
   than conditioning it, so that suppression is off the serving path. If R4 lands badly, this
   is the first thing to look at, and it is not evidence for the span mechanism.
