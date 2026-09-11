// lib/acca/gap-verdict.ts — the gap labeller's steer, carried as a FIELD instead of a phrase.
//
// ⚠️ WHY THIS EXISTS — P-T3(i), DISTINCTIVE IS NOT STABLE.
// `call2_diagnose` produces a gap label. `call3_hint` chooses its opening from that label, and
// until now the choice was made by matching the substring `NOT verified` in the label's prose.
// Measured 2026-08-23, n=40 on the shipped trigger: the guard's JUDGEMENT applied on 40 of 40
// turns, and the model reproduced the canonical phrase on **22 (55%)**. Credited split on the
// echo, not the judgement — branch armed 2 of 22 (9%), branch disarmed 16 of 18 (89%).
//
// Rewriting the trigger raised the echo to 40/40 and cut credited 45% → 10%. **But an echo rate
// is a property of one target's phrasing.** Generalising a string-dependent mitigation to further
// drills would measure string luck per drill, not the mechanism. So the dependency on bytes is
// removed here, and the generalisation measures something stable.
//
// ── THE ORDINAL CONTRACT (P-M1), APPLIED ─────────────────────────────────────
// The model echoes a NUMBER; CODE owns number → meaning. `derived: 0 | 1`, never a word like
// "underived"/"asserted" — a string code is the same failure one level down, and the whole point
// of this module is that a model paraphrases every string it is asked to reproduce. A number has
// no paraphrase.
//
// ⚠️ THE FALLBACK IS LOAD-BEARING AND IT IS THE MEASURED BEHAVIOUR, NOT A GUESS. If the response
// will not parse after `withParseRetry` exhausts, the caller falls back to the substring match on
// the raw text — i.e. exactly today's shipped behaviour, whose rate we know. That is the floor:
// this change can be no worse than the arm currently in production, whatever the model does.
//
// Pure: no I/O, no model, no env. Fixtures: scripts/test-gap-verdict.ts.

import { extractJsonBlock } from './case-marking';
import { gapEstablishesNothingCorrect } from './hint-opening';

/**
 * What the gap labeller returns.
 *
 * `derived` — 0 = the student asserted a conclusion or figure the requirement asks them to DERIVE
 * without deriving it (the guard applies, nothing about correctness was established);
 * 1 = there is working to judge.
 */
export interface GapVerdict {
  derived: 0 | 1;
  label: string;
  /**
   * MEASUREMENT ONLY (2026-08-23) — NOT WIRED TO ANY BEHAVIOUR.
   *
   * "Did the answer contain anything this requirement credits?" The conditional opening already
   * works, but on discursive drills it never arms: `derived` cannot fire there (the scope's
   * interpretive carve-out exempts all 73 APM discursive drills, P-T3(m)) and nothing else sets
   * the condition. This field is the candidate for that condition.
   *
   * ⚠️ OPTIONAL IN THE PARSER, ON PURPOSE. `derived` IS wired to production behaviour; a required
   * field the model sometimes omits would fail the parse, burn four retries through
   * withParseRetry, and degrade the live path to measure something. An absent value reads as
   * "not stated" and changes nothing.
   *
   * ⚠️ THE EVIDENCE GOING IN IS AGAINST IT, which is why it is measured before it is wired. On
   * the C1c cell all 20 replies credited a TRUE but OFF-REQUIREMENT point ("aggregates are a
   * practical necessity for board reporting") against a requirement asking how averages
   * MISREPRESENT; on D2a, 8 of 20 credited content not in the answer at all. So the model's prose
   * conflates "true" with "creditable by this requirement", and P-T3(j) says the field inherits
   * whatever the judgement does.
   */
  creditable?: 0 | 1;
  /**
   * "Is this answer, as written, a correct answer to this requirement?"
   *
   * ⚠️ THE FIELD THE CORRECT GATE HAS NEVER HAD. `isCorrectVerdict` matches ONE phrase —
   * `/\banswer correct\b/i` — inside a 12–15 word model-authored label. Measured 2026-09-11 on the
   * T34 Vesla run (n = 60 labels): 4 matched, and **6 more asserted the answer was correct in
   * words the regex does not contain** ("Answer is correct — convention and emphasis differ from
   * model only", "answer is substantively correct throughout", "no genuine error remains here").
   * Every one of those six was scored a MISS. The regex is a phrase table and P-V4 already rules
   * that it defends the STRING, not the judgement.
   *
   * ⚠️ OPTIONAL, STRICT, AND IT CANNOT FAIL THE PARSE — the same contract `creditable` carries and
   * for the same reason: `derived` IS wired to production behaviour on the drill route, and a
   * required field the model sometimes omits would fail `parseGapVerdict`, burn four calls through
   * `withParseRetry`, and degrade a live guard in order to measure a new one.
   *
   * ⚠️ READ ONLY UNDER `APM_CORRECT_VERDICT=on`. Under `off` it is never asked for (the prompt
   * bytes are unchanged) and under `shadow` it is asked for, parsed and logged while the REGEX
   * still decides. See `resolveCorrect`.
   */
  correct?: 0 | 1;
}

/** The instruction appended to call2's system prompt. The ONLY place the output shape is stated. */
export const GAP_VERDICT_FORMAT =
  'OUTPUT FORMAT — return ONLY a JSON object, no prose before or after, no code fence: ' +
  '{"derived": 0 or 1, "label": "<the gap label>"}. ' +
  // ⚠️ SELF-CONTAINED ON PURPOSE — corrected 2026-08-23 before the two-drill sweep.
  // The first version read "set derived to 0 when THE GUARD ABOVE applies". The arithmetic veto
  // DELETES that guard block from the prompt whenever the student showed working, so on exactly
  // the turns where the answer IS derived the instruction pointed at nothing and the model had to
  // infer the field's meaning from its name. A definition that evaporates on half the inputs is
  // not a definition; it is the string-dependency defect again, wearing a field's clothes.
  'Set "derived" to 0 when the student ASSERTS a conclusion, or states a figure, that this ' +
  'requirement asks them to DERIVE, without deriving it — no calculation performed, no quantities ' +
  'combined. Naming a method in words is a description of working, not working. Figures the ' +
  'SCENARIO supplied and the student merely quoted back are not a derivation. ' +
  'Set "derived" to 1 when there is actual working on the page to judge. ' +
  // MEASUREMENT FIELD (2026-08-23) — asked for, recorded, WIRED TO NOTHING. Same ordinal
  // contract: a number, never a word. The definition names the exact conflation the prose was
  // measured making — a true statement that does not answer THIS requirement is not creditable.
  'Also return "creditable": 0 or 1 — did the answer contain anything THIS REQUIREMENT credits? ' +
  'Judge it against what the requirement actually asks for, not against whether a statement is ' +
  'true in general: a correct remark that does not address the requirement scores 0, and so does ' +
  'a conclusion with nothing behind it. Score 1 only if some part of the answer would earn credit ' +
  'against this requirement as written. ' +
  'The NUMBERS carry the decisions — the label is prose for the student-facing leg and is never ' +
  'parsed for meaning. The 12–15 word limit applies to "label" only. ';

/**
 * THE CORRECT FIELD (2026-09-11). APPENDED to `GAP_VERDICT_FORMAT`, never interleaved with it, so
 * that `APM_CORRECT_VERDICT=off` sends the pre-change bytes EXACTLY — the same discipline the
 * structured steer itself shipped under (P-T3(i)). A fixture pins the byte-identity.
 *
 * ⚠️ THE DEFINITION IS DELIBERATELY ASYMMETRIC, and that asymmetry is the whole safety argument.
 * Telling a WRONG answer it is right is the dangerous failure — it ends the teaching, sets
 * `resolved`, unlocks the worked answer and writes `outcome='correct'`, which is the column the
 * org readiness panel reads. Missing a right answer costs one more turn of coaching. So `1` is
 * defined by what must ALL be true and `0` collects every doubt, including the "true as far as it
 * goes" case that is exactly what the six missed labels were arguing about in prose.
 *
 * Same ordinal contract as the rest of the envelope (P-M1): a NUMBER, never a word.
 */
export const CORRECT_VERDICT_FORMAT =
  'Also return "correct": 0 or 1 — is the student\'s answer, AS WRITTEN, a correct and complete ' +
  'answer to this requirement? ' +
  'Score 1 only when ALL of these hold: every substantive point the requirement asks for is ' +
  'present; nothing the student states is wrong; and any figure or conclusion the requirement ' +
  'asks them to DERIVE has been derived rather than asserted. A different but equivalent ' +
  'convention, wording, ordering or layout is still correct — judge the substance, not the format. ' +
  'Score 0 whenever any required point is missing, any stated figure or claim is wrong, or the ' +
  'answer is true as far as it goes but leaves out part of what was asked. ' +
  'If you are unsure, score 0. ';

/**
 * Where the correct verdict came from. Recorded so a measurement can tell the two apart, and so a
 * DISAGREEMENT between them is visible rather than silently resolved.
 */
export type CorrectSource = 'field' | 'phrase';

export interface CorrectResolution {
  /** The decision the caller acts on. */
  correct: boolean;
  source: CorrectSource;
  /** What the OLD regex said, always, whatever decided. */
  phrase: boolean;
  /** What the model's field said, or null when absent / not asked for. */
  field: 0 | 1 | null;
  /** `field` was present and disagreed with `phrase`. Read by the logs; never by a branch. */
  disagreed: boolean;
}

/** The three states of `APM_CORRECT_VERDICT`. */
export type CorrectVerdictMode = 'off' | 'shadow' | 'on';

/**
 * Resolve the env var to a mode. Anything unrecognised — a typo, an empty string, `'1'` — is
 * `off`, the state that changes nothing. A mode is not a boolean and must not be spelled as one:
 * `shadow` sends DIFFERENT PROMPT BYTES from `off` while making the SAME decision as `off`, and a
 * two-state flag would have to lie about one of those halves.
 */
export function correctVerdictMode(raw: string | undefined | null): CorrectVerdictMode {
  return raw === 'on' || raw === 'shadow' ? raw : 'off';
}

/** Does the format block carry the `correct` field for this mode? `off` is the pre-change bytes. */
export function gapVerdictFormat(mode: CorrectVerdictMode): string {
  return mode === 'off' ? GAP_VERDICT_FORMAT : GAP_VERDICT_FORMAT + CORRECT_VERDICT_FORMAT;
}

/**
 * THE CORRECT-ANSWER SENTINEL — one definition, both surfaces.
 *
 * `call2_diagnose` is instructed to emit the fixed sentinel "answer correct — convention differs
 * from model only" when the answer is right. The word-boundary guard is deliberate: bare
 * `answer correct` also matches `answer correctly`, which appears in WRONG-answer labels
 * ("computes the answer correctly but omits evaluation") — telling a wrong answer it is right is
 * the dangerous failure, so this anchors on the sentinel phrase only, never bare /correct/.
 *
 * ⚠️ THIS IS A PHRASE TABLE AND IT IS A FLOOR, NOT A MEASUREMENT (P-V4). It was duplicated
 * byte-for-byte in `app/api/acca/tutor/route.ts` and `lib/acca/teach-engine.ts` until 2026-09-11;
 * it lives here now so the two teaching surfaces cannot drift on the one predicate that decides
 * whether a student is told they got it right.
 */
export function isCorrectVerdict(diagnosis: string): boolean {
  return /\banswer correct\b/i.test(diagnosis.trim());
}

/**
 * Did this turn produce a correct answer?
 *
 * `off` / `shadow` → the REGEX decides, exactly as it does today. Under `shadow` the field has
 * been asked for and parsed, so the disagreement is in the log and can be read offline, but no
 * branch moves. That is the only honest way to observe a prompt change: the bytes differ from
 * `off` and the decision does not.
 *
 * `on` → THE FIELD DECIDES IN BOTH DIRECTIONS when it is present. A `correct: 0` alongside a label
 * containing the sentinel is a DISAGREEMENT TO HAND-READ, not a reason to fall back to the regex:
 * falling back on one side only would build a gate that can be talked into `true` by either
 * channel and into `false` by neither, which is strictly more permissive than the regex it
 * replaces — the wrong direction for the failure that matters.
 *
 * An ABSENT field falls back to the regex, which is the measured floor. `undefined` means the
 * model did not answer, never that the answer was wrong.
 */
export function resolveCorrect(
  mode: CorrectVerdictMode,
  verdict: GapVerdict | null,
  rawLabel: string,
): CorrectResolution {
  const phrase = isCorrectVerdict(rawLabel);
  const field = verdict?.correct === 0 || verdict?.correct === 1 ? verdict.correct : null;
  const disagreed = field !== null && (field === 1) !== phrase;
  if (mode === 'on' && field !== null) {
    return { correct: field === 1, source: 'field', phrase, field, disagreed };
  }
  return { correct: phrase, source: 'phrase', phrase, field, disagreed };
}

/**
 * Parse a gap-verdict response. Returns null when the payload is absent or malformed, which the
 * caller converts into `Error('parse')` so `withParseRetry` retries it.
 *
 * STRICT IN BOTH DIRECTIONS, deliberately. `derived` must be exactly 0 or 1 — not `true`, not
 * `"0"`, not `2`. A coerced value is a guess about what the model meant, and the one thing this
 * module exists to stop is inferring a decision from something the model merely happened to emit.
 */
export function parseGapVerdict(raw: string): GapVerdict | null {
  const block = extractJsonBlock(raw);
  if (!block) return null;
  let obj: unknown;
  try { obj = JSON.parse(block); } catch { return null; }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const { derived, label } = obj as Record<string, unknown>;
  if (derived !== 0 && derived !== 1) return null;
  if (typeof label !== 'string' || !label.trim()) return null;
  // `creditable` is OPTIONAL and never fails the parse — see the field's doc comment. A malformed
  // or absent value is dropped, not coerced: a measurement must not invent the data it measures,
  // and it must not be able to break `derived`, which IS wired.
  const { creditable, correct } = obj as Record<string, unknown>;
  const c = creditable === 0 || creditable === 1 ? creditable : undefined;
  // `correct` carries the identical contract, for the identical reason. NEVER COERCED: `true`,
  // `"1"` and `2` are all dropped to undefined rather than read as 1. A coerced value here would
  // be a guess about what the model meant on the one field that can tell a student they are done.
  const k = correct === 0 || correct === 1 ? correct : undefined;
  const out: GapVerdict = { derived, label: label.trim() };
  if (c !== undefined) out.creditable = c;
  if (k !== undefined) out.correct = k;
  return out;
}

/**
 * Did the diagnosis establish nothing about correctness?
 *
 * STRUCTURED FIRST, string second. With a parsed verdict the answer is a field read and no phrase
 * matters. Without one, this degrades to the substring match that is in production today — the
 * measured floor, not a new behaviour.
 */
export function nothingEstablished(verdict: GapVerdict | null, rawLabel: string): boolean {
  if (verdict) return verdict.derived === 0;
  return gapEstablishesNothingCorrect(rawLabel);
}

/**
 * Nothing in the answer earns credit against this requirement.
 *
 * WIRED 2026-08-23 on 60/60 agreement with a hand-read, including a POSITIVE CONTROL that read 1
 * on 20/20 — the arm that distinguishes a working field from one that reads 0 on everything and
 * would suppress every opening while scoring perfectly. None of the three failed wording changes
 * ever had that evidence.
 *
 * ⚠️ INDEPENDENT OF `derived`, DELIBERATELY. They answer different questions — "was the figure
 * derived" and "is there anything here worth leading with" — and a numeric answer can show real
 * working that earns nothing, while a discursive answer can earn credit with no arithmetic at all.
 * Neither is computed from the other, and `derived`'s arm is unchanged by this.
 *
 * An ABSENT value returns false: unknown must mean "no claim", never "nothing creditable", because
 * this arm suppresses praise and the failure it would cause is telling a student who did good work
 * that there was nothing to lead with.
 */
export function nothingCreditable(verdict: GapVerdict | null): boolean {
  return verdict?.creditable === 0;
}

/** Where the answer came from. Recorded so a measurement can tell the three apart. */
export type DerivedSource = 'code' | 'field' | 'phrase';

export interface DerivedResolution {
  /** True when nothing about correctness was established on this turn. */
  nothingEstablished: boolean;
  source: DerivedSource;
}

/**
 * THE PRECEDENCE, in one place: CODE > FIELD > PHRASE.
 *
 * `codeOwnsUnderived` comes from `computationDemandedButAbsent` — a drill that demands a
 * computation, and no arithmetic on the page. On those turns the model is NOT consulted about
 * `derived` at all: it was measured getting this wrong 9 times in 10 when the answer merely named
 * method components (P-T3(j)), and code can see the thing the model was talked out of seeing.
 * Its label is still used — that is prose for the student-facing leg, which the model is good at.
 *
 * ⚠️ CODE ONLY EVER FORCES **UNDERIVED**, NEVER **DERIVED**. There is no symmetric arm, and there
 * must not be: "arithmetic present" is decidable, so it already suppresses the guard through the
 * veto, but "arithmetic present therefore something correct was established" is a different and
 * false claim. This function can only ever move a turn TOWARD not-adjudicated, which is the
 * direction that withholds credit rather than granting it.
 */
export function resolveNothingEstablished(
  codeOwnsUnderived: boolean,
  verdict: GapVerdict | null,
  rawLabel: string,
): DerivedResolution {
  if (codeOwnsUnderived) return { nothingEstablished: true, source: 'code' };
  if (verdict) return { nothingEstablished: verdict.derived === 0, source: 'field' };
  return { nothingEstablished: gapEstablishesNothingCorrect(rawLabel), source: 'phrase' };
}

/**
 * The label to show downstream: the parsed one when present, else the raw text.
 *
 * ⚠️ The raw text may be a whole JSON blob when parsing failed — `call3_hint` and the transcript
 * must never receive that. Callers strip it with `safeLabel`, never by trusting `raw`.
 */
export function safeLabel(verdict: GapVerdict | null, raw: string): string {
  if (verdict) return verdict.label;
  const trimmed = raw.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) return trimmed;
  // A JSON-shaped body that would not parse. Recover a label if one is visibly in there; a
  // half-parsed blob reaching a student is worse than an empty gap, so fall back to empty and
  // let the caller's existing empty-diagnosis handling take over.
  const m = trimmed.match(/"label"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  return m ? m[1].replace(/\\"/g, '"').trim() : '';
}
