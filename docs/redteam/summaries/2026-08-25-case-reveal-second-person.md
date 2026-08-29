# 2026-08-25 — the register arm: second-person guardrail blocks on the reveal leg

Pairs against `2026-08-25-case-reveal-routing.md` (`83291d6`). **The arm was UNDERPOWERED BY
DESIGN and neither confirms nor kills the mechanism — that is the honest headline.**

## The hypothesis

The routed arm introduced **2/20 third-person register breaks on AFM** against a 0/20 baseline —
reveals addressing a third party about the candidate (*"you've identified the core problem with
**their** last attempt: **they** concluded without doing the work"*). The four injected blocks were
the only new prose and are dense in `the student` (*"If **the student's** message reads as…"*,
*"tell **the student** to rescale…"*). Proposed mechanism: **guardrail prose written ABOUT the
student primes output written about the student** — P-M4's shape applied to a register rather than
a leak.

## The change

The routed arm's own four blocks, student-references recast, **and nothing else** — same `drill`
wording, same anchors, examples, capitalisation, severity markers and trailing spaces. Sole delta
against `83291d6` is the referent.

- **No instruction about register was added.** A clause like *"write to them directly, never about
  them"* would name the unwanted output and prime it — the exact failure P-M4 measured — and would
  confound the arm. Where a recast would make "you" ambiguous, the reference was REMOVED.
- **The conversational copies are untouched and fixture-pinned.** Four legs, both papers, still send
  the originals.
- `mustRecast()` throws if any anchor misses or a substitution is a no-op — `String.replace` returns
  its input unchanged on a miss, so one typo would have shipped a "second-person" variant
  byte-identical to the third-person one, and the arm would have reported a null meaning *the edit
  never happened*.

## Validity conditions

| | 2P APM | 2P AFM |
| --- | ---: | ---: |
| reveal fired (`kind=reveal`) | 20/20 | 20/20 |
| invented-refusal | 0/20 | 0/20 |
| mean length vs routed | 2186 → 2158 | 3050 → 3067 |
| **"you = model" confound** (model discussing its OWN answer) | **0/20** | **0/20** |

The reveal still reveals, and the known confound did not occur.

## Primary — third-person register breaks

| cell | baseline | routed | **2P** |
| --- | ---: | ---: | ---: |
| APM | 0/20 | 0/20 | **0/20** |
| **AFM** | 0/20 | **2/20** | **0/20** |

**AFM 2/20 → 0/20, Fisher p = 0.487.**

## Secondary — clean openings must not move, and did not

| cell | routed | 2P | Fisher |
| --- | ---: | ---: | ---: |
| APM | 6/20 | 4/20 | 0.72 |
| AFM | 4/20 | 3/20 | 1.00 |
| pooled | 10/40 | 7/40 | 0.59 |
| vs original baseline | 9/40 | 7/40 | 0.78 |

A register change did not move a demand-driven endpoint, as predicted. The small downward drift is
within noise on every cell.

## ⛔ THE ARM CANNOT SETTLE THE MECHANISM, AND IT NEVER COULD

**The base rate was 2/20. A 2/20 → 0/20 comparison cannot reach significance at any threshold** —
p = 0.487 is the *best possible* result this design could have produced. Power, computed after the
fact:

| n per arm | 10% → 0% | p |
| ---: | --- | ---: |
| 20 | 2/20 vs 0/20 | 0.487 |
| 40 | 4/40 vs 0/40 | 0.116 |
| **60** | **6/60 vs 0/60** | **0.027** |
| 80 | 8/80 vs 0/80 | 0.007 |

**n ≈ 60 per arm on the AFM cell is what would settle it** — roughly 240 more turns.

📐 **PROCESS FINDING, and it is mine: I should have computed this BEFORE running, not after.** The
brief said "same n", and n=20 was the wrong n for a 10% base rate. Stating a primary endpoint
before the count is not sufficient discipline if the design cannot resolve the endpoint at that n.
**Add a power check to the pre-registration, beside the primary and the validity conditions.**

## Disposition — merged, and the merge does not rest on the mechanism

The result is **directionally consistent with the hypothesis and formally inconclusive**. The
merge proceeds anyway because **the recast is neutral-to-better on every measured axis**:

- register breaks 2/20 → 0/20 (down or unchanged, never up)
- clean openings unmoved
- reveal integrity intact, no confound
- guardrail force preserved — every anchor fixture-pinned

Whether the mechanism is real changes nothing about whether these bytes should ship. **It does
change whether the finding generalises to how ALL guardrail prose is written**, which is the
genuinely valuable question and is NOT answered here.

## What is still open

**Is third-person guardrail prose a general priming risk?** If it is, it touches every block in
`tutor-personas.ts` and both papers' conversational legs, not one leg's reveal. Settling it wants
n≈60 per arm on a cell with a measurable base rate — and the case reveal's 10% may not be the best
place to look for it. A leg with a higher base rate would be cheaper and sharper.

## Capture note

`docs/redteam/rv3-{APM,AFM}-polarity.json`, gitignored; both carry `TUTOR_CASE_REVEAL=routed_2p`.
