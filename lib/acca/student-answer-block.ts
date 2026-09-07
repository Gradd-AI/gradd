// lib/acca/student-answer-block.ts
//
// ONE definition of "what the teaching legs are shown about what the student wrote", imported by
// BOTH surfaces: the drill route (app/api/acca/tutor/route.ts) and the case engine
// (lib/acca/teach-engine.ts). It was a module-private function in the drill route until
// 2026-09-07; it is here because the two surfaces held the same defect and only one was fixed.
//
// ── THE HISTORY, BECAUSE IT IS THE ARGUMENT FOR THIS FILE EXISTING ──────────────────────────
// Presents the student's most recent FULL attempt (if any, and distinct from the current
// message) alongside their latest message. FIX (2026-07-23, investigation confirmed live):
// the standard withholding-pipeline turn (call2_diagnose + call3_teach's second-miss branch)
// previously read ONLY `student_message` — no prior-attempt context at all — unlike the
// reveal/burn/fast-teach paths, which already fell back to `lastRealAttempt`. A short, natural
// follow-up ("so which one should I recommend?") was diagnosed and taught as if the student had
// submitted NOTHING, because from the model's point of view they genuinely had submitted nothing
// else. Collapses to the plain single-block form when there is nothing new to show (turn 1, or an
// unchanged re-send) — no duplicate block, no empty label.
//
// ⚠️ THAT FIX REACHED ONE OF THE TWO SURFACES. Commit 4f1ee2c (2026-07-23) changed exactly one
// file, `app/api/acca/tutor/route.ts`. `lib/acca/teach-engine.ts` — the CASE engine, created
// 2026-07-01 with its own `call2_diagnose` — already carried the identical defect and was not
// touched. The commit body says "the standard withholding pipeline" as though there were one;
// there were two. MEASURED on the case surface 2026-09-07, n=30, before this module existed:
// turn-1 diagnoses asserting the working was absent 0/30, turn-2 diagnoses 30/30, every one with
// `creditable: 0`, against an answer whose first lines were three scenario NPVs and the weighted
// sum written out. The drill route, with the fix, measured 0/10 on the same shape.
//
// ⚠️ EVERY LEG THAT NEEDS IT MUST BE PASSED IT — importing this file is not the fix, calling it
// is. The legs that take a prior attempt are `call2_diagnose` and `call3_teach`, on BOTH
// surfaces, and that pair is deliberate rather than an oversight: see `HINT_IS_EXCLUDED` below.
//
// ⚠️ ALWAYS PER-TURN VARIABLE. Callers must place the returned block in the UNCACHED remainder of
// a `cachePrefix` split, never inside the cached stable prefix. Both current callers do.

/**
 * The student's most recent full attempt alongside their latest message.
 *
 * Collapses to the single-block form when `priorAttempt` is null or identical to `attempt` —
 * which is what turn 1 and an unchanged re-send both look like — so the pre-2026-07-23 bytes are
 * reproduced exactly on those paths and nothing that used to work sees a new shape.
 */
export function buildStudentAnswerBlock(attempt: string, priorAttempt: string | null): string {
  if (!priorAttempt || priorAttempt === attempt) {
    return `Student answer: ${attempt}\n\n`;
  }
  return (
    `Student's most recent full attempt: ${priorAttempt}\n\n` +
    `Student's latest message: ${attempt}\n\n`
  );
}

/**
 * WHY `call3_hint` IS NOT GIVEN A PRIOR ATTEMPT, on either surface.
 *
 * Not an omission and not an inconsistency: on every path that reaches the hint leg the prior
 * attempt is provably null, so passing it would be a no-op that only makes the two legs LOOK
 * like they differ for a reason.
 *
 * The hint fires on `newMissCount === 1` — the first turn classified as an attempt.
 * `lastRealAttempt` is written ONLY in the attempt branch (on a correct answer or on a miss), so
 * before that first attempt-classified turn it is still null. A student who opens with a question
 * or an expression of confusion routes to `call_warm`, which increments nothing and writes
 * nothing, so the count and the stored attempt both stay where they were. By the time a prior
 * attempt exists, `newMissCount >= 2` and the turn goes to `call3_teach`, which does take it.
 *
 * Stated as a constant rather than a comment so that a reader who greps for why the two legs
 * differ lands on the reasoning instead of concluding the hint was forgotten.
 */
export const HINT_IS_EXCLUDED =
  'call3_hint fires only on the first attempt-classified turn, where lastRealAttempt is still ' +
  'null; buildStudentAnswerBlock would collapse to the single-block form regardless.';
