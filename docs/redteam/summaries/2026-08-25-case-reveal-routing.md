# 2026-08-25 — the case reveal, paper-routed: PREDICTION CONFIRMED (null on credit, paper defect closed)

Pairs against `2026-08-25-case-reveal-baseline.md` (9/40 clean). Cited by `AFM_SURFACED.md`.

## The prediction, on the record before building

> It fixes the paper defect and does NOT fix the manufactured credit. Expected — the "an APM
> board" class goes to 0, and 9/40 clean moves little. A large move in clean openings would refute
> P-T4's second clause.

**Both halves held.**

## ⚠️ THE BUILD IS NOT `caseSystemFor(paper)` — the literal fix would have broken the leg

The conversational persona ends with **"Never complete the student's answer."** (`EZRA_SYSTEM`,
`EZRA_AFM_SYSTEM`) and carries `NO_COMPUTED_OUTPUTS` — *"WITHHOLD COMPUTED OUTPUTS — this is the
moat, hold it … never STATE such a computed figure yourself"* — a block whose own header scopes it
to *"the CONVERSATIONAL legs (warm/hint/teach/confirm)"*. The reveal says the opposite in the same
breath: *"INCLUDING the figures and the conclusion (withholding is over)"*. `route.ts`'s own
`call4_reveal` comment states the rule outright: it *"uses its OWN system prompt — NOT the
conversational persona, whose 'never complete the student's answer' guardrail is exactly what the
student has earned past here."*

Injecting it would have put a refusal instruction on the one leg that must reveal — the X1
invented-refusal failure, prompted rather than accidental.

**Guardrails taken selectively, four of seven:**

| block | verdict |
| --- | --- |
| `NO_INVENTED_NUMBERS` | ✅ its last clause AUTHORISES this leg (*"verified figures live only in the earned worked answer"*) |
| `NO_INVENTED_REVEAL_REFUSAL` | ✅ on point, already reveal-aware |
| `RETRACTION_PROTOCOL` | ✅ paper-neutral |
| `METHOD_FITS_THE_GIVEN_INPUTS` | ✅ kept LAST (its own text claims anchor position) |
| `NO_COMPUTED_OUTPUTS` | ⛔ direct contradiction |
| `DIGNITY_ON_DISTRESS` | ⛔ *"you never hand over the answer"*, *"do NOT offer to reveal the answer"* |
| `GROUNDING_DISCIPLINE` | ⛔ `call4_reveal` receives no grounding data — antecedent ALWAYS false, pure token cost (P-T4 corollary) |

Also collapsed the duplicate (`caseRevealSystemFor` is now the one definition; the engine's local
copy is deleted) and changed **"this drill" → "this requirement"** on both papers. ⚠️ **That is a
bundled wording change** — neither endpoint turns on the unit noun, but the arm moves two things
and cannot attribute between them.

**`creditable` was NOT extended to the reveal**, as directed.

## Arm

| | |
| --- | --- |
| control | the 9/40 baseline at `f8ac756` — `shipped` is **fixture-pinned byte-identical** (542 chars) to the deleted literal, so the baseline describes the string that actually ran |
| treatment | `TUTOR_CASE_REVEAL=routed`, this build |
| targets | Keldan (i) APM `9e167905` · Kestrel (ii) AFM `e861173b`, decline shape, unchanged |
| n | 20 × 3 turns × 2 cells = 120 turns |
| classifier | same person, same rubric, same day as the baseline |

⚠️ Cross-SHA rather than a same-session paired arm — mitigated by the byte pin, not eliminated.

## Validity condition — reported before the counts

| | APM | AFM |
| --- | ---: | ---: |
| miss 1 / miss 2 registered | 20/20 | 20/20 |
| **reveal actually fired (`kind=reveal`)** | **20/20** | **20/20** |
| `reveal_locked` | 0 | 0 |

**The reveal did not break** — which was the live risk of this change. Independently:
**invented-refusal 0/40**, and mean response length essentially unchanged (APM 2229 → 2186, AFM
3042 → 3050 chars). The exclusions did their job.

## Primary — CLEAN reveal openings

| | baseline | routed | Fisher |
| --- | ---: | ---: | ---: |
| APM (Keldan) | 7/20 | 6/20 | p = 1.00 |
| AFM (Kestrel) | 2/20 | 4/20 | p = 0.66 |
| **pooled** | **9/40** | **10/40** | **p = 1.00** |

Breakdown — routed APM: (A) 6 · (A′) 5 · (B) 3 · clean 6. Routed AFM: (A) 3 · (A′) 2 · (B) 11 ·
clean 4. **AFM remains dominated by (B) endorses-the-refusal at 11/20**, still affirming *"forwards
are part of the answer"* — the exact proposition used to decline.

**The null is confirmed, not assumed. P-T4's second clause survives:** guardrails change a
fabrication's shape, not its rate; only conditioning the DEMAND moves it. Nothing here conditions
the praise-first clause, and nothing moved.

## Secondary — the paper defect is closed

| | baseline | routed |
| --- | ---: | ---: |
| AFM cell says "an APM board" etc. | 1/20 | **0/20** |
| APM cell echoes "APM" | 5/20 | **0/20** |
| either cell says "this drill" | 0/40 | 0/40 |

The AFM system prompt is now AFM-voiced on 100% of AFM reveals. ⚠️ **The observable leak was only
1/20 to begin with**, so `p = 1.00` — this is a **100% wrong input corrected**, not a demonstrated
harm reduction. Do not report it as one.

📐 **Unpredicted: the APM cell stopped echoing "APM" too (5/20 → 0/20)**, although its core still
says *"an APM tutor"*. The added blocks appear to have changed the output register. Not an endpoint,
noted rather than explained.

## 🔴 A REGRESSION THE ARM FOUND — third-person register break

| | baseline | routed |
| --- | ---: | ---: |
| AFM reveal talks ABOUT the student (*"the student"*, *"their last attempt"*, *"they concluded"*) | 0/20 | **2/20** |

Two AFM reveals addressed a third party about the candidate — *"You've identified the core problem
with **their** last attempt: **they** concluded without doing the work"*. The student is reading a
message about themselves in the third person.

**Plausible mechanism, and it is the codebase's own P-M4 shape:** the injected blocks are written
ABOUT the student — `NO_INVENTED_REVEAL_REFUSAL` opens *"If **the student's** message reads as…"*,
`RETRACTION_PROTOCOL` *"if **the student's** message challenges…"*. Third-person guardrail prose
appears to prime third-person output. **Not proven** — `p = 0.49` at n=20, and the mechanism is
inferred from the strings, not tested.

Worth an arm of its own before this ships: rewriting the four blocks in second person for the
reveal would test it directly, and the blocks' own severity anchors would have to be preserved
(the P-M3/P-M4 constraint).

## Claim ceiling

- **The routing fix is safe and does what it claims**: paper correct, duplicate collapsed, reveal
  still reveals. It buys **no measured improvement in manufactured credit**, and must not be
  described as if it did.
- n = 20 per cell, one requirement per paper, one classifier who knew the arm.
- The unit-noun change rides along and is unattributed.
- The third-person regression is a **finding, not a result** at this n.
- **What would actually move 10/40 is conditioning the praise-first demand** — `creditable` on this
  leg — deliberately out of scope here, and the same clause also sits in
  `REVEAL_AFM_WRAPPER_SYSTEM` on the drill route, which is a separate surface with its own
  measurement.

## Capture note

`docs/redteam/rv2-{APM,AFM}-polarity.json`, gitignored; both carry an `arm` object recording
`TUTOR_CASE_REVEAL=routed`.
