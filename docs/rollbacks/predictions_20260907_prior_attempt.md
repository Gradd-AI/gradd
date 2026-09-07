# Predictions — the case engine's missing prior attempt

**Banked by Grant in the instruction, written down here BEFORE the §2(a) run started and before
any post-fix false-absence number existed.** The §2(b) regression was already running when this
was written; its results were not read until after this file was saved.

Fix under test: `fix/case-engine-prior-attempt` — `buildStudentAnswerBlock(attempt, priorAttempt)`
extracted to `lib/acca/student-answer-block.ts` and wired into the case engine's `call2_diagnose`
and `call3_teach`, mirroring the drill route's 2026-07-23 fix (commit `4f1ee2c`).

## Grant's predictions, verbatim

1. **False absence: strict ≤ 3/30 case pooled, loose ≤ 6/30.**
   Stated rationale: *"Precedent is 0/10 on the drill route with this exact fix, which is why I am
   confident where I have not been."*
2. **The length effect disappears.** Stated rationale: *"you showed the diagnosis is 30/30
   regardless of length, so length was acting on how call3_teach wrote around a wrong diagnosis.
   If the length effect SURVIVES a correct diagnosis, that is a separate mechanism and I want it
   called out."*
3. **Regression: no axis moves more than 1/10.**

## The pre-fix baseline these are measured against

| | strict | loose |
|---|---|---|
| case · long, working first | 5/10 | 9/10 |
| case · long, working last | 4/10 | 9/10 |
| case · short, working first | 2/10 | 2/10 |
| case pooled (3 cells) | **11/30** | **20/30** |
| drill · matched seed | 0/10 | 0/10 |

call2_diagnose itself, pre-fix: turn-1 diagnoses asserting absence **0/30**; turn-2 **30/30**,
`creditable: 0` on all 30.

Regression baseline (banked this week, `docs/rollbacks/` + CLAUDE.md): seed A n=30 — pointer
in-list 30/30, attribution 0/30, truncation 0/30, opens-on-credit 0/30. Seed B n=10 — pointer
moved to section #3, 10/10.

## Two things the design of this test cannot decide, recorded in advance

- ⚠️ **The 2×2 is new.** Run 1 had three cells; `short_last` is added here to close it. There is
  no pre-fix number for that cell, so the length and position contrasts are comparable
  cell-by-cell against run 1 but the pooled figure is over **four** cells post-fix and **three**
  pre-fix. The per-cell comparison is the one that carries; the pooled numbers are quoted against
  prediction 1 because that is how the prediction was framed, and the three shared cells are
  reported separately so the like-for-like is visible.
- ⚠️ **The §2(b) regression exercises the COLLAPSE branch only, by construction.**
  `_case_reveal_n30.ts` sends the identical `ANSWER` on turn 1 and turn 2, so at the teach leg
  `priorAttempt === attempt` and `buildStudentAnswerBlock` returns the single-block form —
  **byte-identical to pre-fix**. Any movement in (b) is therefore model sampling noise and not
  this change; a clean (b) confirms nothing broke but is weak evidence that nothing *could* have.
  The turn-3 reveal still varies because it is handed turn 2's reply.
