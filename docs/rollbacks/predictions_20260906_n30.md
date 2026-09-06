# Predictions — the two wiring fixes, banked before the n=30 run

**Branch:** `feat/case-reveal-design-b`.
**Banked:** 2026-09-06, by Grant, BEFORE the run. Same discipline as
`predictions_20260906.md`: a prediction that lives only in a transcript is indistinguishable
afterwards from a rationalisation of whatever came back.

**What changed since the 10-run capture.** Two wiring fixes, plus one small one:

1. **The wrapper is handed the artefact's `## ` heading NAMES** and told to copy one. The
   previous 0/10 was STRUCTURAL, not a wording problem — the model was told to point into a
   document it had never been shown, so every pointer was a guess, and 9 of 10 guessed the
   opening section of six. A heading is not a figure, so the figure-free guarantee is intact.
2. **The credit demand is CONDITIONED again** when the diagnose leg reported nothing
   creditable. This is the trade commit `8eb92db` flagged and asked to have measured; it was
   measured at 10/10 opens and 6/10 fabricated.
3. `full_reveal` (the authored misconception reframe) now reaches the case reveal, and the
   `[CASEREVEAL]` log carries the floor/conditioned fields again.

---

## The gate (set where the instrument can see it)

| # | Endpoint | Gate |
|---|---|---|
| G1 | Pointer beat names a heading from the list | **≥ 27/30** |
| G2 | Attribution | **≤ 2/30** |
| G3 | Truncation | **0/30** |
| G4 | Opens on credit when `creditable = 0` | **≤ 3/30** |

## The predictions (Grant's, deliberately not the gate)

| # | Prediction | Value | Why it is stated at this confidence |
|---|---|---|---|
| P1 | Pointer in-list | **≥ 28/30** | Mechanical — SELECTION from a supplied list, not generation. Confident where I have not been. |
| P2 | Attribution | **≤ 4/30** | Looser than the gate. I have missed low four times; I expect a pass but would not be shocked by a marginal fail. |
| P3 | Opens-on-credit when `creditable = 0` | **≤ 2/30** | |

---

## ⚠️ WHY n = 30 AND NOT n = 10 (the instrument, banked as doctrine)

Tuesday's run scored the same code, the same prompt and the same seed answer at **2/10**;
Friday's scored it at **6/10**. Nothing between them changed what the model sees. Fisher's
exact test puts that pair at **p ≈ 0.17** — i.e. n = 10 cannot distinguish those two results,
and every `≤ 2/10` gate set in this workstream has been finer than the instrument that reads
it. Thirty runs, one arm, hand-read.

## ⚠️ THINGS THIS RUN CARRIES THAT THE PREDICTIONS DO NOT NAME

Recorded before the run so neither can be found afterwards and read as a result.

1. **Three changes move at once** — the heading list, the credit conditioning, and the
   authored reframe now reaching the prompt. G1 is attributable (nothing else touches the
   pointer); **G2 and G4 are NOT cleanly attributable between the conditioning and the
   reframe**, because the reframe changes what the wrapper is diagnosing FROM at the same
   time. Stated rather than glossed. If G2/G4 pass, the run does not say which of the two did it.
2. **The suppression only arms when the flag says so.** `creditable` is read per turn from the
   diagnose leg and carried, sticky, in the sealed blob; the reveal fires the conditioned
   opening only on `lastRealAttempt != null && everCreditable === false`. If the seed answer
   ever reads `creditable = 1`, that run's reveal is UNCONDITIONED by design and G4 does not
   apply to it. The per-run `creditable` value is reported for exactly this reason.
3. **The empty-list branch is not exercised by this run.** All 18 published APM case
   `model_answer`s carry `## ` headings; **none of the 20 AFM ones do**. Vesla (i) is APM, so
   every run here takes the list branch, and the omit branch ships on fixtures alone.
