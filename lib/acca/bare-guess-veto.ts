// lib/acca/bare-guess-veto.ts — the one thing code can decide about the bare-guess guard.
//
// ⚠️ WHAT THIS IS, AND THE HALF IT DELIBERATELY DOES NOT DO.
//
// `call2_diagnose` runs a BARE-GUESS GUARD before the equivalence check, so when it fires,
// correctness is never assessed (P-T3). Whether it applies is a MODEL judgement made fresh each
// turn, and that judgement is the whole ceiling on the label fix shipped 2026-08-23: measured
// n=40, where the guard fired 17% credited a wrong verdict, where it did not fire 94% did, and it
// fired on 57.5% of turns.
//
// The judgement splits into two halves, and only ONE of them is mechanically decidable:
//
//   ✅ DECIDABLE — "the student showed arithmetic, so this is NOT a bare guess." A message
//      containing worked arithmetic is never a value-only guess. Code can say this with
//      certainty, on BOTH papers, with no schema. That is this module: a VETO.
//
//   ❌ NOT DECIDABLE — "no arithmetic, therefore it IS a bare guess." That is where every
//      legitimate narrative answer lives. Measured over the 87 real-student messages in
//      `acca_drill_messages`: 14 contain a digit, and 13 of those 14 contain NO arithmetic —
//      all 13 substantial prose whose digits are SCENARIO figures quoted back (a given 14% WACC,
//      a given ₦12,000m cost, "the 3 further contracts"). A trigger arm keyed on "contains a
//      figure" would fire on 13 of 14 and be wrong on essentially all of them. NOT BUILT.
//
// ⚠️ SO THIS MODULE HAS NO "CONTAINS A FIGURE" ARM, ON PURPOSE. It can only ever STOP the guard,
// never start it. Anyone extending it toward a trigger must re-read the 13-of-14 measurement
// first — the arm was designed, measured, and killed by its own numbers.
//
// ── THE BIAS IS DELIBERATE AND ONE-DIRECTIONAL ───────────────────────────────
// The two error directions cost wildly different amounts, so the detector is tuned to be
// GENEROUS about calling something arithmetic:
//
//   • MISSING real arithmetic (under-veto) → the guard stays able to fire on a student who DID
//     show working, who is then told to "put their reasoning on the page". To someone who wrote
//     340 words of it, that reads as the tutor not having read the answer — the one failure that
//     costs credibility rather than accuracy. And it is silent both ways: the equivalence check
//     is skipped, so a correct answer gets no credit AND a wrong one gets no correction.
//
//   • OVER-vetoing (calling a date range or a bulleted list "arithmetic") → the guard cannot
//     fire on a turn where it might have been right. Costs ONE turn: the answer goes
//     unadjudicated, the student adds working, and miss 2 corrects at 80%.
//
// One is unrecoverable, one self-corrects next turn. **When in doubt, veto.**
//
// ⚠️ NOT KEYED ON `answer_schema`, AND THIS IS THE POINT. All 91 published APM drills have
// `answer_schema` NULL — the paper this defect was MEASURED on. A gate keyed on the schema (or on
// its `params`, as the direction fence is) is structurally inert across the whole of APM. This
// reads the student's own message and nothing else, so it works on both papers today.
//
// Pure: no I/O, no model, no env, no DB. Fixtures: scripts/test-bare-guess-veto.ts.
// Offline dry-run over the live corpus: npm run audit:bare-guess-veto.

// Horizontal whitespace only. A newline must NEVER be crossed: "…up 9%\n- retention fell" would
// otherwise read as "9 - retention" and veto a bulleted narrative for arithmetic it does not have.
const H = String.raw`[^\S\n]`;
// A number, tolerant of thousands separators (comma, thin space, nbsp) and a decimal part.
// 12,880 · 1.5 · 1 800 · 0.14
const NUM = String.raw`\d[\d,\u202F\u00A0]*(?:\.\d+)?`;
// A magnitude or percent suffix written tight against the number: 312M · 14% · 5k · 90bn.
// Capped at 2 letters so it cannot bridge into the next WORD of prose.
const UNIT = String.raw`(?:%|[a-zA-Z]{1,2})?`;
// A currency mark sitting between the operator and the second number: "= ₦12,880m", "= EUR 0.4m".
const CUR = String.raw`(?:[€£$¥₦₹\u20A0-\u20BF]|(?:EUR|USD|GBP|NGN|JPY|CHF|AUD|CAD|ZAR|INR|NZD))`;
// The letter `x` is included as a multiplication sign because students write it that way
// ("14% x 1,800m") and missing it is the EXPENSIVE direction. Bounded by a negative lookahead so
// it can only match a STANDALONE x: "in 2024 xerox" has a letter after the x and does not match.
const OP = String.raw`(?:[-+*/×÷=]|[xX](?![a-zA-Z]))`;
// An optional open paren after the operator: "312M - (0.14*1,800M)". Its own constant rather than
// an inline escape, because a backslash inside the template literal below is one transcription
// slip away from becoming a literal `(` and silently turning the pattern into an invalid group.
const OPEN = String.raw`\(?`;

/**
 * ARITHMETIC = number · operator · number, with the tolerances above.
 *
 * Matches: `EVA=312M-252M` · `312M - (0.14*1,800M)` · `NOPAT = ₦18,400m × (1 − 0.30)` ·
 *          `390M/1,800M` · `= EUR 0.4m`
 * Does not match: `14% cost of capital` · `the 3 further contracts` · `₦12,000m expansion`
 */
const ARITHMETIC = new RegExp(
  `${NUM}${H}*${UNIT}${H}*${OP}${H}*${CUR}?${H}*${OPEN}${H}*${CUR}?${H}*${NUM}`,
);

// U+2212 MINUS SIGN and U+2013/2014 dashes are what a model — and a student pasting from a PDF —
// actually type. Normalised to ASCII before matching rather than widened into the class, so the
// class stays readable and one normalisation covers every future operator test.
const DASHES = /[\u2212\u2013\u2014\u2043]/g;

/** True when the message shows arithmetic: two numbers joined by an operator. */
export function hasArithmetic(message: string): boolean {
  if (!message) return false;
  return ARITHMETIC.test(message.replace(DASHES, '-'));
}

/**
 * THE VETO. True when code can say with certainty that the bare-guess guard must NOT fire.
 *
 * A separate name from `hasArithmetic` on purpose: the caller's question is "may the guard fire?",
 * and routing that through a function named for the EVIDENCE rather than the DECISION is how a
 * later reader talks themselves into adding a second, non-decidable arm to it.
 */
export function bareGuessGuardVetoed(message: string): boolean {
  return hasArithmetic(message);
}
