# §2(b) regression — the four banked axes, after the prior-attempt fix

Run 2026-09-07 on `fix/case-engine-prior-attempt`, local dev against the live DB, real model
calls. Harness `scripts/_case_reveal_n30.ts`, unchanged. Raw:
`regress_vesla_seedA_postfix_20260907.json`, `regress_vesla_seedB_postfix_20260907.json`.

Case: Vesla Retail (APM), requirement (i) The churn model output. Three legs per run —
miss 1 → hint, miss 2 → teach, then `show me the answer` → reveal.

## Seed A — the confidently wrong answer, n = 10

| axis | baseline (n=30) | post-fix (n=10) | moved |
|---|---|---|---|
| pointer in-list | 30/30, all section #1 | **10/10, all section #1** | no |
| truncation (artefact tail intact) | 0/30 truncated | **0/10 truncated** | no |
| attribution (fabricated citations surviving) | 0/30 | **0/10** | no |
| opens-on-credit / suppression armed | 0/30 opened on credit | **`nothingCreditable` 10/10, `conditioned` 10/10** | no |
| separator present | — | 10/10 | — |
| wrapper ends mid-sentence · carries a heading | — | 0/10 · 0/10 | — |

## Seed B — the creditable answer, n = 10

| axis | baseline (n=10) | post-fix (n=10) | moved |
|---|---|---|---|
| pointer | moved to section #3, 10/10 | **10/10, all section #3** | no |
| suppression correctly NOT arming | 10/10 not armed | **`nothingCreditable` 0/10, `conditioned` 0/10** | no |
| truncation | 0/10 | **0/10** | no |
| attribution | 0/10 | **0/10** | no |

**Prediction 3 — "no axis moves more than 1/10" — met. Nothing moved at all, on either seed.**

## ⚠️ HOW MUCH THIS IS WORTH, STATED PLAINLY

**This regression exercises the COLLAPSE branch of the change, by construction.**
`_case_reveal_n30.ts` sends the identical `ANSWER` on turn 1 and turn 2. At the teach leg that
makes `priorAttempt === attempt`, so `buildStudentAnswerBlock` returns the single-block form and
**the prompt bytes are identical to pre-fix**. The turn-3 reveal still varies, because it is
handed turn 2's reply, which is a fresh sample.

So a clean result here says **"nothing broke"** and does *not* say "nothing could have broken".
It is the right regression to run — these are the axes banked this week and they are what a
change to the diagnose leg would damage — but the honest reading is that it rules out sampling
drift and prompt-shape accidents, not that it stress-tested the new branch. The new branch is
tested by §2(a), where turn 2 is a genuinely different message.

Attribution is a real check rather than a vacuous one: the quotation scorer found 0–2 quoted
spans per run and classified every one `tutor-own`, so it ran on real spans and found no
student-attributed citation that was not verbatim.
