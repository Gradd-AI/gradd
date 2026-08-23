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
  /**
   * Nothing in the answer earns credit against this requirement (`creditable === 0`).
   *
   * A THIRD state, not a rename of the second. `nothingEstablished` is numeric-shaped — its
   * replacement text talks about a figure being unchecked and about putting reasoning on the page
   * — and it is MEASURED at 10% credited, so it keeps precedence wherever it applies. This arm
   * exists for the branch that had no opening at all: a discursive answer where `derived` cannot
   * fire (the scope's interpretive carve-out exempts all 73 APM discursive drills, P-T3(m)) and
   * the praise-first opening therefore has nothing legitimate to lead with — the exact condition
   * under which it was measured inventing one (8/20 on D2a, ~19/20 once grounding gave it richer
   * material to invent from, P-T3(o)).
   */
  nothingCreditable = false,
): string {
  const SHIPPED =
    'First miss. Lead with the ONE specific thing they got right — name the real move, not ' +
    'vague praise — then name the single sharpest gap (just one, not a list) and one next ' +
    'move. ';
  if (variant === 'shipped') return SHIPPED;
  // (c) NOTHING CREDITABLE — the branch that previously had no opening at all.
  //
  // ⚠️ PRECEDENCE: (b) WINS WHERE IT APPLIES. Its wording is numeric-shaped and it is MEASURED at
  // 10% credited; this arm is reached only when `derived` did NOT fire, so nothing measured
  // changes shape. Ordering it the other way would silently re-word the one opening whose rate
  // we know.
  //
  // ⚠️ SAME P-T2 DISCIPLINE AS (b): purely positive, nothing named that we do not want. It does
  // not mention praise, what they got right, or correctness — it states what the diagnosis found
  // and hands over a different, SATISFIABLE job. It is also SHAPE-NEUTRAL: unlike (b) it says
  // nothing about figures or arithmetic, because this arm serves discursive drills where a
  // "put the working on the page" instruction would misdescribe the requirement entirely.
  if (!nothingEstablished && nothingCreditable) {
    return (
      'First miss, and the gap diagnosis above reports that nothing in the answer yet earns ' +
      'credit against this requirement. Open on the first thing that would: name the single ' +
      'specific move this requirement turns on, and what they would have to put on the page to ' +
      'make it. Then name the single sharpest gap (just one, not a list) and one next move. '
    );
  }
  if (!nothingEstablished) return SHIPPED;
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

// ── THE TRIGGER'S WRITTEN SCOPE (2026-08-23) ─────────────────────────────────
//
// ⚠️ THE SCOPE DOES NOT DESCRIBE THE HARM, AND THAT IS THE REMAINING DEFECT.
// The shipped guard says it fires when the message `states ONLY a final answer VALUE ... a lone
// number`. The turn that produced the 95% baseline is 72 words of reasoned prose that states no
// numeric answer at all: it asserts a POLARITY ("Zitel's EVA is negative"), carries a method
// sentence ("the capital charge comes out above NOPAT"), and its only two figures are the
// scenario's OWN given 14% WACC and given ₦12,000m cost.
//
// By the shipped text the guard should fire ~0% of the time on it. **It fired 57.5%.** So the
// 57.5% is not a guard performing unreliably — it is a model applying a rule well outside the
// rule's written scope, which is what a judgement with no matching predicate does. That is why
// mechanising the guard AS WRITTEN would have been WORSE than leaving it (P-T3(d)): a faithful
// pre-check fires on almost none of the harm turns.
//
// P-T2 — CHANGE THE INSTRUCTION, DO NOT BOLT ON A PROHIBITION. The scope sentence is REPLACED
// with the predicate that matches the harm. Nothing is added alongside the old one.
//
// ⚠️ THE CARVE-OUT HAD TO MOVE TOO, and this is the load-bearing part. The shipped carve-out
// exempts "a narrative/discursive claim ... even when terse", on the reasoning that narrative
// claims carry no numeric working to show. Under the NEW predicate that exemption would swallow
// the harm turn whole — it is discursive prose. So the carve-out is re-cut along the axis that
// actually matters: whether the REQUIREMENT asks for something to be DERIVED. An interpretive
// requirement has no derivation to withhold; a computational one does, whatever prose it is
// dressed in.
//
// ⚠️ DECLARED CONFOUND: this variant moves the trigger AND its label together. They cannot be
// separated — the label is the trigger's output, and the shipped label ("states a figure but
// shows no working") would misdescribe a figure-less assertion the moment the trigger starts
// catching one. The firing rate is the measurement; the label change rides with it and is stated
// rather than hidden. `UNVERIFIED_MARKER` is preserved verbatim so the code-selected opening
// branch keeps working unchanged.

/** Which wording of the guard's TRIGGER (its scope sentence + label) call2 is given. */
export type GuardScopeVariant = 'shipped' | 'unsubstantiated';

/**
 * The full bare-guess / unsubstantiated-verdict guard block for call2_diagnose's system prompt.
 *
 * Returned as ONE string so the trigger and the label it emits cannot drift apart in the route.
 * `shipped` is BYTE-IDENTICAL to the pre-2026-08-23 inline text (with the label variant applied
 * exactly as it was) and is pinned as such by the fixtures.
 */
export function guardBlock(scope: GuardScopeVariant, label: GuardLabelVariant): string {
  if (scope === 'shipped') {
    return 'BARE-GUESS GUARD (do this before the equivalence check) — NUMERIC drills only: if the message ' +
      'states ONLY a final answer VALUE or asks whether a value is right ("is it about 51 million?", ' +
      '"the answer is X, yes?", a lone number) with NO working, method, or reasoning shown, it is NOT ' +
      'a markable correct answer even if the value matches. This guard does NOT apply to a narrative/ ' +
      'discursive claim — a short but substantively correct interpretive statement (e.g. "VaR is a ' +
      'threshold, not a ceiling") is a genuine claim to equivalence-check, not a bare guess, even when ' +
      'terse; narrative claims carry no numeric "working" to show. When the bare-guess guard genuinely ' +
      'fires (a numeric value-only guess), output the gap label: ' +
      `"${guardLabel(label)}" (NEVER the correct sentinel). `;
  }
  return 'UNSUBSTANTIATED-VERDICT GUARD (do this before the equivalence check) — NUMERIC drills only: ' +
    'if the message asserts a CONCLUSION, or states a FIGURE, that this requirement asks the ' +
    'candidate to DERIVE, without deriving it — no calculation performed, no quantities combined, ' +
    'nothing a reader could check the assertion against — then it is NOT a markable correct answer ' +
    'even if the assertion happens to match. Naming the method in words ("I discounted the flows", ' +
    '"the capital charge comes out above NOPAT") is a DESCRIPTION of working, not working: if no ' +
    'quantities are actually combined, the claim is underived. Figures the SCENARIO supplied and the ' +
    'candidate merely quoted back are not a derivation either. This guard applies to the REQUIREMENT ' +
    'kind, not to the register the answer is written in — discursive prose on a computational ' +
    'requirement is squarely in scope. It does NOT apply where the requirement asks for ' +
    'INTERPRETATION rather than computation (e.g. "VaR is a threshold, not a ceiling"): an ' +
    'interpretive claim has nothing to derive, and is a genuine claim to equivalence-check. When ' +
    'this guard genuinely fires, output the gap label: ' +
    `"${unsubstantiatedLabel(label)}" (NEVER the correct sentinel). `;
}

/**
 * The label the rewritten trigger emits. Generalised off "states a figure" — the harm turn states
 * no figure — while preserving UNVERIFIED_MARKER verbatim so `gapEstablishesNothingCorrect`, and
 * therefore the code-selected opening, behave identically.
 */
export function unsubstantiatedLabel(label: GuardLabelVariant): string {
  return label === 'unverified'
    ? 'asserts a conclusion without deriving it — the claim itself is NOT verified, so it cannot be credited'
    : 'asserts a conclusion without deriving it — cannot be credited';
}
