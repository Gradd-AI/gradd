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
}

/** The instruction appended to call2's system prompt. The ONLY place the output shape is stated. */
export const GAP_VERDICT_FORMAT =
  'OUTPUT FORMAT — return ONLY a JSON object, no prose before or after, no code fence: ' +
  '{"derived": 0 or 1, "label": "<the gap label>"}. ' +
  'Set "derived" to 0 when the guard above applies (a conclusion or figure asserted without being ' +
  'derived); set it to 1 when there is actual working to judge. The NUMBER carries the decision — ' +
  'the label is prose for the student-facing leg and is never parsed for meaning. ' +
  'The 12–15 word limit applies to "label" only. ';

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
  return { derived, label: label.trim() };
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
