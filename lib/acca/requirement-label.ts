// lib/acca/requirement-label.ts
// ONE RULE, TWO READERS: what a requirement's stored `label` becomes for anybody who is
// not the authoring system. Pure — no I/O, no model, no DB.
//
// A stored label carries internal authoring data. On AFM Mock Paper 1 it is
// "(i) B3e — 10 marks": an ordinal, the internal syllabus code, and the TECHNICAL mark
// allocation. Two different readers must not see that, for two different reasons:
//
//   • THE CANDIDATE (serve boundary, app/api/acca/sit/route.ts). A real ACCA paper never
//     prints a syllabus code. Marks are served separately from the `marks_guide` COLUMN
//     and the runner composes "(i) — 10 marks", so both papers show marks for the same
//     reason instead of AFM's labels happening to spell them in prose.
//
//   • THE MARKER (lib/acca/case-mark-run.ts, PS pass). The label is interleaved with the
//     candidate's text inside a block captioned "Candidate's whole answer". So the PS
//     marker — scoring a SEPARATE 5- or 10-mark professional-skills pool — reads an
//     internal code and a technical mark allocation as part of what the student wrote.
//     The student never wrote it and never saw it.
//
// WHY THIS IS A MODULE AND NOT TWO STRIPS. The same rule with two implementations is the
// failure class this codebase has already banked and fixed once (lib/acca/paper-url.ts:
// one rule, two ends, one module). Two regex copies that must agree, where disagreement
// is silent, is strictly worse than one function with a named parameter.
//
// WHY IT IS NOT sit-preview's JOB EITHER. `sitDisplayLabel` lives in a serve-boundary
// module holding the sit clock, the phase machine and the refusal mapping. Marking runs
// on the PRACTICE route too, which has no sit in it at all, so importing that module from
// the marking path would couple two boundaries with no reason to move together.
//
// ── THE ASYMMETRY, STATED (Grant-ruled 2026-08-13) ────────────────────────────
// `sweepCodeShape` is the ONE axis on which the two readers differ, and it is a parameter
// rather than a default because the right answer genuinely inverts between them.
//
// The exact-`lo_code` removal is safe everywhere: it deletes the row's own code and
// nothing else. The GENERIC sweep is a SHAPE, not a code list — `<A-E><digit(s)><letter?>`
// — and it is a backstop for a row whose code is absent or disagrees with its label.
//
//   sweepCodeShape: TRUE  at the serve boundary. A leaked syllabus code on a candidate's
//                         screen is the worse failure; over-deleting costs a UI chip.
//   sweepCodeShape: FALSE in marking. Over-deleting is the worse failure: an APM label
//                         naming a division "B2", a product line "C3" or a site "A1"
//                         matches the shape, and the sweep would SILENTLY DELETE that
//                         token from what the marker reads before it bands the candidate
//                         on the result. Today's four real APM labels are clear of it —
//                         checked, and pinned in the fixtures — but the shape is a
//                         standing hazard for any label ever authored with one, and the
//                         backstop buys marking nothing: every AFM row that carries a
//                         code carries a `lo_code` that agrees with it, which the exact
//                         removal already handles.
//
// There is no third behaviour and no default. Both call sites name their choice.

const LO_CODE_SHAPE = /\b[A-E][0-9]{1,2}[a-z]?\b/g;
// "— 10 marks", "- 1 mark", "(12 marks)" — the marks phrase in any authored form.
const MARKS_PHRASE = /[([]?\s*\d+\s*marks?\s*[)\]]?/gi;

function escapeForRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface StrippedLabelOptions {
  /** Apply the generic `<A-E><digit(s)><letter?>` backstop sweep. See the asymmetry note
   *  above — true at the serve boundary, false in marking. Required: a caller that has
   *  not thought about it must not compile. */
  sweepCodeShape: boolean;
}

/**
 * The stored label reduced to what a non-authoring reader should see: the syllabus code
 * and the marks phrase removed, separators tidied.
 *
 * Returns `null` when nothing is left — either the input was not a string, or the label
 * was ONLY a code and/or a marks phrase. Each caller defines its own fallback for that:
 * the serve boundary renders no chip; the marking join substitutes `Requirement N`.
 */
export function strippedLabel(
  label: string | null | undefined,
  loCode: string | null | undefined,
  opts: StrippedLabelOptions,
): string | null {
  if (typeof label !== 'string') return null;

  let out = label;
  if (typeof loCode === 'string' && loCode.trim()) {
    out = out.replace(new RegExp(`\\b${escapeForRegExp(loCode.trim())}\\b`, 'gi'), '');
  }
  if (opts.sweepCodeShape) out = out.replace(LO_CODE_SHAPE, '');
  out = out.replace(MARKS_PHRASE, '');

  // Tidy what the removal left behind: doubled spaces, and a separator now dangling at
  // either end (a label of "B3e — 10 marks" would otherwise render as "— 10 marks").
  out = out.replace(/\s+/g, ' ').trim();
  out = out.replace(/^[—–\-·:|]+\s*/, '').trim();
  out = out.replace(/\s*[—–\-·:|]+$/, '').trim();

  return out === '' ? null : out;
}

/**
 * The marking-path form: what the PS marker reads in place of the stored label.
 *
 * `sweepCodeShape: false` — see the asymmetry note. Named rather than inlined at the call
 * site so the choice is greppable from this module, which is where the reasoning lives.
 */
export function markerLabel(
  label: string | null | undefined,
  loCode: string | null | undefined,
): string | null {
  return strippedLabel(label, loCode, { sweepCodeShape: false });
}
