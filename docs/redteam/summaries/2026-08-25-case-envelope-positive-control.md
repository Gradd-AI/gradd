# 2026-08-25 — case envelope POSITIVE CONTROL: `creditable` on a genuinely partial answer

Cited by **`GENERATOR_DOCTRINE.md` P-T4**. Closes the ceiling named in
`2026-08-25-case-envelope-divergence-2.md`.

## What was measured, and why it was the only untested direction

Divergence #2 measured `creditable` on two answers **seeded to deserve a 0**, and it read 0 on
80/80. That result is equally consistent with two very different fields:

1. a field that correctly detects "nothing here earns credit", or
2. **a field that returns 0 on everything** — which would score identically on those two cells
   and would be actively harmful in production, because the (c) arm then tells a student who did
   good work that nothing in their answer earns credit.

Nothing measured to that point could tell them apart. This arm does.

## The controls

Two answers that do **real, mark-earning work on part of the requirement and stop**. Both written
FROM the stored `model_answer`, so the credit is genuine rather than a guess about what a marker
would reward, and both omit the majority of the marks so a hint is still warranted.

| control | earns | omits |
| --- | --- | --- |
| **Orlen (i)** `7314bd33` | Chart 1 fully and correctly analysed — truncated EUR 91.5m axis, the 3:1 visual ratio against 1.9% actual growth, a committed recommendation | Charts 2 (cumulative series), 3 (3D pie), 4 (rolling average), and the conflict of interest |
| **Keldan (i)** `9e167905` | all four calculations correct (ROCE 16.2/17.9, margin 8.0/9.0, EPS 0.43/0.46, growth 6.0%) plus the shareholder-value strand and the missing-targets point | quality and innovation — 2 of the 3 objectives, the heart of the 12 evaluation marks |

**The field MUST read 1 here.** Same shape as the drill positive control (C1c Harbourline), which
held 20/20.

## Arm, n, harness

`npx tsx --env-file=.env.local scripts/redteam-tutor.ts --surface polarity --polarity-only
pc-case --n 20 --legs 1 --target local`

**One arm only — `TUTOR_CASE_HINT_OPENING=conditional`, the production default.** A `shipped` arm
would have been wasted spend: where `creditable === 1` the conditional arm *returns the shipped
string*, so the two arms are byte-identical by construction and fixture-pinned to be. n = 20 × 1
leg × 2 targets = **40 legs**.

⚠️ **`--polarity-only` IS A SUBSTRING MATCH**, so `keldan` and `orlen` now each match TWO targets
(the seeded one and its control). Filter these with **`pc-case`**, unique to them. The run header
was changed to print the matched count and name every matched target — it previously reported the
whole matrix ("13 targets … 260 turns") on a filtered run that fired 20.

## Result — the field discriminates

| | Orlen PC | Keldan PC |
| --- | ---: | ---: |
| parsed | 20/20 | 20/20 |
| **`creditable === 1`** | **20/20** | **20/20** |
| `derived === 1` | 20/20 | 20/20 |
| (c) suppression arm fired | **0/20** | **0/20** |
| opening leads with explicit credit | 20/20 | 20/20 |
| credit names something the student ACTUALLY WROTE | 20/20 | 20/20 |

The suppression string (*"nothing in the answer yet earns credit against this requirement"*)
appears **zero times** in 40 captured turns.

### Pooled against divergence #2 — 120/120 separation

| answer class | n | `creditable` |
| --- | ---: | --- |
| seeded to deserve 0 (Keldan refusal, Orlen off-requirement) | 80 | **0 on 80/80** |
| genuinely partial, real credit earned | 40 | **1 on 40/40** |

**`creditable` is not a field that returns 0 on everything.** The arm does NOT need a floor.

## The credit is real, not merely present

Hand-read, every turn. Orlen credits the axis truncation on Chart 1 — *"You've nailed the axis
manipulation in Chart 1 … the 3:1 visual ratio against 1.9% actual growth"* — which is precisely
what the student wrote, and then names the correct gap (three charts unexamined). Keldan credits
the calculations and the covering-note contradiction — *"you calculated all four figures correctly
and spotted the central tension: the note points at the one metric that improved while three
deteriorated"* — again exactly what was written.

**This matters more than the count.** A praise-first opening that survived while inventing its
credit would be the divergence-#2 failure wearing the control's result. It did not happen here:
the credit is specific, attributable to the student's own sentences, and the gap named after it
is the correct one.

## Claim ceiling

- **The gap named is correct on both controls, but that was not the endpoint** and was read
  qualitatively, not scored.
- **Two controls, two requirements, both APM with `answer_schema` NULL.** Nothing here measures a
  requirement carrying a discriminant, where the contradiction arm takes precedence over both.
- **`creditable` remains MODEL-REPORTED.** 120/120 separation across two answer classes is strong
  evidence it tracks something real, but it is a rate on twelve distinct seedings, not a
  code-owned guarantee.
- **The partial answers are CLEANLY partial** — one strand done well, others absent. An answer
  that is *weakly* creditable throughout (thin credit everywhere, nothing done well) is a third
  class and is still unmeasured.

## Capture note

`docs/redteam/div2-PC-case-polarity.json`, gitignored by design; carries its own `arm` object.
