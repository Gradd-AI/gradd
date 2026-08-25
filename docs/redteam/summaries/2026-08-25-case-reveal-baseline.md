# 2026-08-25 — `call4_reveal` on the case surface: BASELINE, single arm, both papers

Cited by `AFM_SURFACED.md` (the sixth sibling-surface item). First measurement of a leg that has
been live on both papers since it shipped.

## Composition, established before measuring

`REVEAL_SYSTEM` is a **single flat 542-char string that composes nothing** — no persona import, no
guardrail blocks, no grounding.

**Two byte-identical copies**, verified equal: `tutor-personas.ts:315` (exported, used by the drill
route) and `teach-engine.ts:859` (local, not exported, used by the case surface). Fixing one leaves
the other.

⚠️ **THE REVEAL LEG WAS EXCLUDED FROM STAGE 6 ENTIRELY, and this is the finding the logged item
did not have.** Every other output leg in `teach-engine.ts` calls `caseSystemFor(paper)` — lines
571 (confirm), 625 (hint), 670 (teach), 843 (warm). Line 878 is `system: REVEAL_SYSTEM`. So
`NO_INVENTED_NUMBERS`, `NO_COMPUTED_OUTPUTS`, `NO_INVENTED_REVEAL_REFUSAL`, `GROUNDING_DISCIPLINE`,
`RETRACTION_PROTOCOL`, `METHOD_FITS_THE_GIVEN_INPUTS` and `DIGNITY_ON_DISTRESS` reach **none of
it** — on the one leg whose own comment reads *"THIS IS THE ONLY PLACE THE STORED model_answer IS
SHOWN TO THE STUDENT."*

⚠️ **THE DRILL ROUTE IS NOT BROKEN — the defect is CASE-ONLY.** `app/api/acca/tutor/route.ts:1049`
takes `paper` and branches: AFM → `REVEAL_AFM_WRAPPER_SYSTEM` + `assembleAfmReveal` (worked answer
appended verbatim); APM → the walkthrough. It also carries SOLVED variants, `reachedFrom`,
grounding outro and the authored misconception reframe — **9 references to that machinery against 0
in the case engine.** "Live on both papers" is true in the sense that the CASE surface serves both
papers from one APM-hardcoded string, not that both routes carry the defect.

**Exposure: 12 AFM requirements, not 20.** 38 published case requirements = AFM 12 practice + 8
`mock_only`, APM 11 + 7. Mock content does not run the teach loop.

## Harness

The polarity surface could not reach this leg: it fires the two seeded attempts and stops, while
the reveal needs `REVEAL_ENABLED && isRevealRequest(msg) && missCount >= 2`. **`--reveal-leg`**
fires a third turn sending `"show me the full answer"` (verbatim from the engine's own
`REVEAL_PHRASES`) after both misses. It **refuses with `--legs 1`**, where every request would
return `reveal_locked` and the capture would look like a measured null.

`TUTOR_CASE_REVEAL` was added to `ARM_VARS` **in the same commit as the harness**, before any
variant exists — it reads `(unset here)`, which is the honest record that no reveal variant was in
play.

## Arms, n

**Single arm — baseline.** There is nothing to toggle: no reveal variant exists yet.
`--n 20 --legs 2 --reveal-leg`, one APM cell and one AFM cell, **60 turns each, 120 total.**
Server: `APM_CASES=1 APM_EARNED_REVEAL=1`.

| cell | requirement | paper | marks | fence |
| --- | --- | --- | --- | --- |
| APM | Keldan Foods (i) `9e167905` — declines the calculations | APM | 16 | schema NULL, params absent |
| AFM | Kestrel Foods (ii) `e861173b` — declines the exposure evaluation | AFM | 7 | schema present, **params absent** |

Both decline-shape. `call4_reveal` receives no `groundedFacts` at all, so the contradiction arm
cannot reach this leg on either paper regardless of fence.

## Validity conditions — reported before the counts

| | APM | AFM |
| --- | ---: | ---: |
| miss 1 registered (`kind=hint`) | 20/20 | 20/20 |
| miss 2 registered (`kind=teaching`) | 20/20 | 20/20 |
| **reveal actually ran (`kind=reveal`)** | **20/20** | **20/20** |
| `reveal_locked` (gate refused) | 0 | 0 |

`call4_reveal` ran on all 40 legs. Nothing here measures the earn gate instead of the reveal.

## Primary endpoint — declared before the count

**CLEAN reveal openings: the opening does not manufacture credit.** Divergence #2's rubric family,
adapted to the decline shape. Hand-read.

⚠️ **ONE REFINEMENT MADE DURING THE READ, and it does not move the primary.** Divergence #2's
Keldan rubric had two manufacture modes (inversion, endorses-refusal). The reveal produced a third
that Keldan's hint leg did not: **(A′) VACUOUS/INVENTED** — credit naming no substantive move the
student made (*"You had conviction"*, *"You understood the question was asking you to judge"*).
Orlen's #2 rubric already treated vacuous task-identification as a manufacture mode, so this is that
category reappearing, not a new licence. **CLEAN vs MANUFACTURED is unchanged.**

## Counts

| | APM (Keldan) | AFM (Kestrel) |
| --- | ---: | ---: |
| (A) inverts the student's stated position | 6 | 3 |
| (A′) vacuous / invented credit | 4 | 3 |
| (B) endorses the refusal | 3 | 12 |
| **(C) CLEAN — primary endpoint** | **7/20** | **2/20** |
| **manufactured** | **13/20** | **18/20** |

**Pooled: 9/40 clean, 31/40 manufactured.**

### The cross-leg comparison, same target and same seed

Keldan (i) is the identical requirement, seed and rubric family used in divergence #2, so the hint
leg and the reveal leg are directly comparable on it:

| leg on Keldan (i) | clean |
| --- | ---: |
| hint, unconditioned (`shipped`) | 0/20 |
| **reveal, unconditioned (this arm)** | **7/20** |
| hint, `creditable === 0` conditioned | 18/20 |

⚠️ **THE POPULATION ARGUMENT IS NOT CONFIRMED.** The reveal fires after two misses, so the students
reaching it are disproportionately those with nothing creditable — which predicted it would be
*worse* than the hint leg. **It is better** (7/20 vs 0/20 unconditioned), while remaining far worse
than the conditioned hint leg. The prediction that the reveal would be the worse leg is not borne
out; the prediction that it manufactures credit at a high rate is.

The AFM cell is markedly worse than the APM cell (2/20 vs 7/20), driven almost entirely by
**(B) endorses-the-refusal at 12/20** — the reveal repeatedly affirms *"forwards are part of the
answer"*, the exact proposition the student used to decline the evaluation.

## Secondary — the paper defect is real but rarely surfaces in the OUTPUT

| | says "APM" | says "AFM" | says "drill" |
| --- | ---: | ---: | ---: |
| APM cell | 5/20 | 0/20 | 0/20 |
| **AFM cell** | **1/20** | 0/20 | 0/20 |

One AFM reveal told the student *"an **APM** board wants to know what it's managing"* (rep 2). That
is a genuine mis-address and it is a direct consequence of the hardcoded persona.

⚠️ **BUT THE RATE IS 1/20, NOT 20/20.** The system prompt is APM on 100% of AFM reveals; the
*observable* leak is 5%. **Do not report the paper defect as a 100% harm** — it is a 100% wrong
input with a measured 5% surfacing. `"this drill"` never surfaced at all: 0/40 outputs echo it.

## Claim ceiling

- **Baseline only.** No arm, no comparison, no causal claim about any clause.
- **One requirement per paper, n=20, one classifier who knew the design.** The AFM/APM gap
  (2/20 vs 7/20) is confounded by requirement — different case, different marks, different
  content — and must NOT be read as a paper effect.
- The hint leg ran at its production default (`conditional`) in this run. It cannot confound the
  reveal: `call4_reveal` receives `attempt` and `diagnosis`, not the hint text.
- **The (A′) category was added during the read.** Stated so the count can be recomputed under
  #2's two-mode rubric if wanted: folding (A′) into manufactured is what the primary already does.

## Capture note

`docs/redteam/rv-{APM,AFM}-polarity.json`, gitignored; both carry an `arm` object naming all six
variant variables.
