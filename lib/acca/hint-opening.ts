// lib/acca/hint-opening.ts — the gap label's honesty, and the opening instruction that reads it.
//
// ⚠️ WHY THIS EXISTS. Measured 2026-08-22, n=40 pooled, hand-read: on the FIRST miss, a seeded
// wrong verdict ("Zitel's EVA is negative" when the model answer computes it positive) was
// CREDITED AS CORRECT in 38 of 40 turns. The tutor was not short of data — `call2_diagnose` held
// the full model answer, and `call3_hint`'s own prompt named the correct figure via the grounding
// pack's misconception lead. It read past both.
//
// THE CHAIN, proven by two gap labels from one run on one drill:
//   • miss 1 (figure asserted, no working) → call2's BARE-GUESS GUARD fires. Its own prompt runs
//     that guard "before the equivalence check", so CORRECTNESS IS NEVER ASSESSED, and the label
//     returned is `states a figure but shows no working — cannot be credited` — a criticism of
//     FORM that is SILENT about the figure.
//   • miss 2 (working shown) → the guard does not fire, the equivalence check runs, and the label
//     is `Student computed EVA as negative when it is actually positive`. The leg then corrects.
//
// `call3_hint` takes no `modelAnswer` parameter, so the gap label is its ONLY signal about answer
// quality — and it is instructed to "Lead with the ONE specific thing they got right." Handed a
// gap that mentions only missing working, crediting the conclusion is the reasonable reading.
//
// ── THE TWO CHANGES, SEPARATED SO THEY CAN BE MEASURED SEPARATELY ────────────
// (a) P-T3 — THE LABEL STATES WHAT WAS NOT ESTABLISHED. A guard that terminates a pipeline early
//     owns the downstream reader's belief about everything the pipeline did not reach. Silence
//     about the figure is read as the figure being fine.
// (b) P-T2 — CHANGE THE INSTRUCTION, NEVER ADD A PROHIBITION. Given a label saying nothing was
//     verified, "lead with the ONE specific thing they got right" is UNSATISFIABLE, and a model
//     facing an unsatisfiable instruction invents something to satisfy it — the mechanism measured
//     in August on the PS descriptor leak, where an added prohibition doubled the rate it was
//     written to cut. So the opening instruction is REPLACED on that branch, not fenced.
//
// ⚠️ (b) IS CODE-SELECTED, NOT MODEL-JUDGED. The branch is chosen by matching the guard's own
// sentinel in the returned label (`gapEstablishesNothingCorrect`), so the leg never has to decide
// whether its gap "establishes something correct" — it is told which opening to use.
//
// ⚠️ NOT BUILT ON `misconceptionLead`. That path reaches 14 of 91 published APM drills, and it was
// present and ignored in the measured failure. `model_answer` is on 154 of 154, and `call2`
// already receives it — the fix stays on that path.
//
// Pure: no I/O, no model, no env. Fixtures: scripts/test-hint-opening.ts.

/** Which wording of the bare-guess gap label call2 is told to emit. */
export type GuardLabelVariant = 'shipped' | 'unverified';
/** Which opening instruction call3_hint is given. */
export type HintOpeningVariant = 'shipped' | 'conditional';

/**
 * The stable substring the route matches to know the guard fired and nothing was verified.
 * Deliberately short and distinctive: the label is model-echoed, so an exact-string match would
 * be brittle, while this phrase appears in no other label the gap-labeller can produce.
 */
export const UNVERIFIED_MARKER = 'NOT verified';

/** The label call2 emits when the bare-guess guard fires. */
export function guardLabel(variant: GuardLabelVariant): string {
  return variant === 'unverified'
    // (a): names the form problem AND the dimension the guard skipped. "cannot be credited" is
    // kept — it is the part that was already true — and the silence after it is what closes.
    ? 'states a figure but shows no working — the figure itself is NOT verified, so it cannot be credited'
    : 'states a figure but shows no working — cannot be credited';
}

/** True when the gap label says the guard fired and correctness was never established. */
export function gapEstablishesNothingCorrect(diagnosis: string): boolean {
  return diagnosis.includes(UNVERIFIED_MARKER);
}

/**
 * The opening instruction for call3_hint.
 *
 * `shipped` is BYTE-IDENTICAL to the pre-2026-08-22 string and is pinned as such by the fixtures,
 * so the historical baseline survives and this refactor cannot silently reword the live prompt.
 */
export function hintOpeningInstruction(
  variant: HintOpeningVariant,
  nothingEstablished: boolean,
): string {
  const SHIPPED =
    'First miss. Lead with the ONE specific thing they got right — name the real move, not ' +
    'vague praise — then name the single sharpest gap (just one, not a list) and one next ' +
    'move. ';
  if (variant === 'shipped' || !nothingEstablished) return SHIPPED;
  // (b): the opening is REPLACED, and the replacement is PURELY POSITIVE.
  //
  // ⚠️ A FIRST DRAFT OF THIS SAID "do NOT open by naming something they got right", and that is
  // exactly the move P-T2/P-M4 forbid. Adding a clause that NAMES the unwanted output primes it —
  // measured in August, where restating a ban doubled the leak it was written to cut (z = −3.65).
  // Nothing here mentions praise, correctness, or what they got right. The demanded opening is
  // simply a different, SATISFIABLE job, and the original instruction is gone rather than fenced.
  return (
    'First miss, and the gap diagnosis above reports that the answer has not been verified — the ' +
    'figure is unchecked. Open on what would make it checkable: the single concrete step that ' +
    'puts their reasoning on the page. Then name the single sharpest gap (just one, not a list) ' +
    'and one next move. '
  );
}
