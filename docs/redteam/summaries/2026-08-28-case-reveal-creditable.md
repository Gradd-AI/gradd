# 2026-08-28 — divergence #5: `creditable` conditions the case REVEAL opening

Pairs against a **same-session control**, not a stored number. Cited by `AFM_SURFACED.md`.

**Headline: 7/60 → 36/60 clean (11.7% → 60.0%), Fisher p = 4.0 × 10⁻⁸.** The lever the three
previous arms predicted would work is the one that worked, and by a margin the design was
over-powered to detect.

## The prediction, on the record before building

> The reveal measures 31/40 manufactured credit and did not move under paper routing (9→10/40,
> p=1.00) or the second-person recast (10→7/40, p=0.59). Both confirmed P-T4's second clause: a
> guardrail changes a fabrication's SHAPE; only conditioning the DEMAND changes whether one is
> demanded. Conditioning the praise-first clause is the only lever measured to move it.

## Power — computed BEFORE the run

The process finding from `61e7915` applied. Fisher exact, two-tailed, α = 0.05, control p = 0.25:

| per-cell n | pooled n/arm | →0.45 | →0.55 | →0.65 | →0.75 |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 20 | 40 | 0.38 | **0.73** | 0.94 | 0.99 |
| 25 | 50 | 0.48 | 0.84 | 0.98 | 1.00 |
| **30** | **60** | 0.56 | **0.90** | 0.99 | 1.00 |

**n = 30 per cell.** n=20 sits at 0.73 for the smallest effect worth shipping (+30pp) — under
0.80, i.e. last session's mistake bought at a different number. Method sanity-checked against the
arm that failed: power for 10%→0% at n=20 is **0.043**, which is why `2/20 → 0/20` could never
resolve.

## Arm

| | |
| --- | --- |
| control | `TUTOR_CASE_REVEAL=routed_2p` — the PRODUCTION DEFAULT, run fresh in this session |
| treatment | `TUTOR_CASE_REVEAL=routed_2p_conditioned` |
| targets | Keldan (i) APM `9e167905` · Kestrel (ii) AFM `e861173b`, decline shape, unchanged |
| n | 30 × 3 turns × 2 cells × 2 arms = **360 turns** |
| classifier | one person, **BLINDED to arm** (cell shown, arm hidden, seeded shuffle) |

⚠️ **The control was measured, not cited.** The stored `10/40` was the `routed` arm; the default
that actually ships (`routed_2p`) measured `7/40`. All three prior arms were cross-SHA, a confound
their own summaries flagged as *"mitigated, not eliminated"*. Running the control fresh removes it
and settles which number is the comparator instead of the author picking one.

📐 **The blind is new, and it retires a standing claim ceiling.** Every prior arm on this leg read
*"one classifier who knew the arm"*. Here all 120 reveals were pooled, shuffled within cell with a
fixed seed, and classified with the arm hidden; the key was opened only after both cells were
recorded. Cell stays visible because judging manufactured credit requires knowing the requirement.

## Validity conditions — reported before the counts

| | CONTROL APM | TREAT APM | CONTROL AFM | TREAT AFM |
| --- | ---: | ---: | ---: | ---: |
| all legs HTTP 200 | 30/30 | 30/30 | 30/30 | 30/30 |
| **reveal actually fired** | **30/30** | **30/30** | **30/30** | **30/30** |
| `reveal_locked` | 0 | 0 | 0 | 0 |
| mean length | 2169 | 2210 | 3043 | 3029 |

**THE CONDITION FIRED, AND THE ARMS SEPARATE CLEANLY.** In *both* arms the carried verdict read
"nothing creditable" on **60/60**; only the treatment acted on it (`conditioned:true` 60/60 vs
0/60). So the control is genuinely unconditioned on exactly the turns the treatment conditioned —
a null could not have meant *the condition was never met*.

## Primary — CLEAN reveal openings (declared before the count)

| cell | arm | (A) inverts | (A′) vacuous | (B) endorses | **CLEAN** |
| --- | --- | ---: | ---: | ---: | ---: |
| APM | control | 7 | 17 | 0 | **6/30** |
| APM | treatment | 3 | 0 | 1 | **26/30** |
| AFM | control | 14 | 0 | 15 | **1/30** |
| AFM | treatment | 9 | 5 | 6 | **10/30** |

| | control | treatment | Fisher |
| --- | ---: | ---: | ---: |
| APM | 6/30 | 26/30 | p < 0.0001 |
| AFM | 1/30 | 10/30 | p = 0.0056 |
| **POOLED** | **7/60 (11.7%)** | **36/60 (60.0%)** | **p = 4.0 × 10⁻⁸** |

**Both cells move, and the pooled effect exceeds the +30pp the design was powered for.**

### Mode breakdown, pooled

| mode | control | treatment | Fisher |
| --- | ---: | ---: | ---: |
| (A′) vacuous / invented credit | 17/60 | **5/60** | **0.0084** |
| (A) inverts the stated position | 21/60 | 12/60 | 0.101 |
| (B) endorses the refusal | 15/60 | 7/60 | 0.097 |

📐 **The mode that collapses is the one the mechanism predicts.** (A′) is credit naming no
substantive move — precisely what an unsatisfiable praise demand manufactures. Inversion and
endorsement fall but not significantly at this n; they are failures of *content*, not of a demand
for content, and conditioning the opening was never the lever for them.

## Deterministic secondaries

| | CONTROL APM | TREAT APM | CONTROL AFM | TREAT AFM |
| --- | ---: | ---: | ---: | ---: |
| says "APM" | 0/30 | 0/30 | 0/30 | 0/30 |
| **third-person register break** | **0/30** | **0/30** | **0/30** | **0/30** |
| says "drill" (unit noun) | 0/30 | 2/30 | 1/30 | 1/30 |

Paper routing holds (the routing arm's 5/20 → 0/20 on the APM cell has not regressed) and the 2P
recast holds — **the register break stays at 0 across all 120**, and conditioning did not
reintroduce it. ⚠️ **The unit noun leaks 4/120** where the routing arm measured 0/40: the core says
"this requirement", the model still writes "the drill". Small, not an endpoint, logged not fixed.

## 🔴 THE POSITIVE CONTROL FOUND A REAL DEFECT, AND THE 360-TURN ARM COULD NOT HAVE

Run after the primary, on the `PC-CASE Keldan` target — a complete, correct answer (all four
calculations right) followed by a two-line extension.

**The carried verdict read "nothing creditable" on 10/10.** The reveal would have opened *"nothing
here earns credit"* at a student who had just produced every calculation correctly.

**Cause.** `call2_diagnose` sees ONE message, not the accumulated answer, so `creditable` is scoped
to a FRAGMENT — it read `1` on miss 1 and `0` on miss 2, 10/10. The first build paired the flag to
`lastRealAttempt` deliberately, arguing it "must describe the SAME text `call4_reveal` receives".
**That argument was wrong**: it makes both halves fragment-scoped, and the reveal's referent is the
REQUIREMENT.

**Why the arm was blind to it:** all **246** attempt turns across both arms read `creditable: 0`,
so last-write and sticky are indistinguishable on that data. **A decline-shape corpus cannot
falsify a rule about mixed sessions.**

**Fixed** (`ed32849`): `everCreditable`, sticky, three states, `undefined ≠ false`. Re-measured —
positive control **0/10** (was 10/10), decline shape **5/5** (unchanged).

⚠️ **THE PRIMARY WAS PRODUCED BY THE PRE-FIX BUILD, AND THE RESULT TRANSFERS — verified, not
assumed.** On every one of the 246 attempt turns `creditable` read 0, so the old
`lastNothingCreditable` and the new `lastEverCreditable === false` both evaluate true and assemble
the SAME prompt bytes. The 60/60 describes the build that ships.

## Claim ceiling

- **One requirement per paper, n=30, one classifier.** Blinded to arm, which is new; still one
  reader, and the (A)/(A′)/(B) mode split is a judgement the blind does not remove.
- **The AFM cell remains far worse than APM** (10/30 vs 26/30) — as in every prior arm. Confounded
  by requirement (different case, marks, content) and must NOT be read as a paper effect.
- **What conditioning does NOT fix is on the record:** inversion and endorsement of the refusal
  survive at 12/60 and 7/60. 60% clean is a large move, not a solved leg.
- **The positive control is n=10 on ONE target.** It is sufficient to have caught a defect; it is
  not a measurement of how often mixed sessions occur in real use.
- Nothing here measures the reveal's CONTENT — only its opening.

## Capture note

`docs/redteam/d5{c,t}-{APM,AFM}-polarity.json`, `d5pc*`, `d5re`, gitignored. Treatment captures
record `TUTOR_CASE_REVEAL=(unset here)` because `armEnv()` reads the SCRIPT's env, not the server's;
their arm identity rests on the server log's 60/60 `conditioned:true`, which records what the code
did rather than what was intended. The control captures self-document (`routed_2p`).
