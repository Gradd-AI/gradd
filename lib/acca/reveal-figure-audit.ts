// lib/acca/reveal-figure-audit.ts
// Deterministic post-hoc check on a SERVED reveal: every number in it must already exist in the
// scenario, the stored worked answer, or the student's own attempt. PURE — no DB, no model, no
// env, no clock.
//
// ── WHAT THIS IS FOR, AND WHAT IT IS NOT ─────────────────────────────────────
// It is a BACKSTOP to a structural fix, not the fix. The reveal is now a figure-free wrapper
// plus the stored `model_answer` appended verbatim by code, so on the happy path this should
// find nothing. Its job is to say so, and to notice the day that stops being true — a reworded
// wrapper prompt, a new leg, a paper routed somewhere new.
//
// ⚠️ FLAG FOR REVIEW, NEVER A BLOCKER. The caller logs and serves. A student who has EARNED a
// reveal must never lose it because an audit disagreed with a number, and a false positive here
// costs a log line while a false refusal costs the thing they worked for.
//
// ── THE CEILING, STATED PLAINLY ──────────────────────────────────────────────
// 1. IT CANNOT CATCH A CORRECTLY-SOURCED FIGURE USED WRONGLY. "your WACC of 9.59%" passes
//    whether 9.59% is the right number in the right place or the right number in the wrong one.
//    Sourcing is not correctness.
// 2. IT TOLERATES DERIVED ARITHMETIC, WHICH IS A REAL HOLE AND A DELIBERATE ONE. A legitimate
//    reveal computes: Aotea's incremental EVA of −NZD 1.8m (10.2 − 8.4) is SOUND and appears in
//    no source. The tolerance is a READING-ORDER CHAIN (see `oneStepFrom`), and the width was
//    not guessed — a transitive closure over the same sources was measured REACHING 600 and
//    excusing the very invention this exists to catch. Widen it and this reports nothing;
//    remove it and it reports every reveal.
// 2b. A COINCIDENCE PASSES. Aotea's invented EVA of "−NZD 9m" is not flagged, because the
//    scenario states a 9% ROCE target and this compares magnitudes, not units or roles. The
//    invented 600m and 42m ARE flagged, so the finding surfaces — but a single fabricated
//    figure that happens to collide with an unrelated sourced number is invisible here.
// 3. IT IS BLIND TO A FABRICATED NON-NUMBER. "the scenario specifies THREE adjustments" fires
//    (see NUMBER_WORDS) but "the scenario specifies several adjustments" does not.
// 4. IT SEES THE SERVED STRING ONLY. It cannot know whether the sources it was handed were the
//    right ones — a caller passing the wrong drill's `model_answer` gets a clean report.
//
// So: unsourced findings are worth reading, and a clean report means "nothing obviously
// invented", NEVER "every figure is right".
//
// ── COUNTS ARE FIGURES TOO ───────────────────────────────────────────────────
// The Marmara turn said "the scenario specifies THREE EVA™ adjustments" where the scenario
// specifies two, and "three" appears nowhere in the drill. `NO_INVENTED_NUMBERS` did not cover
// it: a COUNT is not "a specific value, an illustrative numeric range, a market level, or a
// rule-of-thumb percentage". So number-WORDS are checked alongside digits. The precedent is
// `assertNarrativeNumbers` in scripts/authoring/build-sbl-crosswalk-ledger.ts, which checks
// number-words in prose for the same reason: a hand-typed count is a claim.

export interface RevealSources {
  /** The drill's `context_text` — the scenario as the student sees it. */
  context: string;
  /** The stored `model_answer`. On the current path this IS the tail of the served reveal. */
  modelAnswer: string;
  /** The student's own last attempt — their figures are theirs to have quoted back. */
  attempt: string;
}

export interface RevealFigureAudit {
  /** Distinct numeric tokens found in the reveal, after normalisation. */
  checked: number;
  /** Tokens present in no source and not reachable by one operation on two sourced values. */
  unsourced: string[];
  /** Sourced directly. Reported so a caller can see the check had something to work with. */
  sourced: number;
  /** Absent from every source but arithmetically reachable — tolerated, counted, not flagged. */
  derived: number;
}

// Number-words that carry a COUNT claim. Deliberately small: 'one' and 'a'/'an' are excluded
// because they are overwhelmingly articles and pronouns in this prose ("one of the divisions",
// "one sentence"), and flagging them would bury every real finding under noise.
const NUMBER_WORDS: Record<string, number> = {
  two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
};

/** Digits with optional thousands separators and decimals. Percent/currency are stripped by
 *  normalisation, so "NZD 600m", "600m" and "600" collapse to the same token. */
const NUMERIC = /\d[\d,]*(?:\.\d+)?/g;

/**
 * Canonical numeric form: strip separators, drop a trailing zero-decimal, and expand a
 * magnitude suffix so "0.4m" and "400,000" compare equal. Returns null for something that is
 * not a usable number.
 */
export function normaliseNumber(raw: string, suffix = ''): number | null {
  const n = Number(raw.replace(/,/g, ''));
  if (!Number.isFinite(n)) return null;
  const mult = /^m$/i.test(suffix) ? 1e6 : /^bn?$/i.test(suffix) ? 1e9 : /^k$/i.test(suffix) ? 1e3 : 1;
  return n * mult;
}

/**
 * Every number in a string, canonicalised. Digits AND count-words.
 *
 * `expandAmbiguous` is for the SOURCE side only. "600m" and "600,000,000" are the same figure
 * written two ways, so a source records BOTH readings and matches either. The SERVED side must
 * not: recording the bare 600 there would make every suffixed figure carry a phantom second
 * token that no source has, and the checker would flag its own normalisation.
 */
export function numbersIn(text: string, expandAmbiguous = false): number[] {
  const out: number[] = [];
  for (const m of text.matchAll(NUMERIC)) {
    const after = text.slice(m.index! + m[0].length, m.index! + m[0].length + 3);
    const suffix = /^\s?(m|bn|b|k)\b/i.exec(after)?.[1] ?? '';
    const v = normaliseNumber(m[0], suffix);
    if (v !== null) out.push(v);
    if (suffix && expandAmbiguous) {
      const bare = normaliseNumber(m[0], '');
      if (bare !== null) out.push(bare);
    }
  }
  out.push(...countWordsIn(text));
  return out;
}

/** Count-words present, as values. Separated because they are checked more strictly — see
 *  `auditRevealFigures`. Sign is ignored throughout: magnitudes are what is compared. */
export function countWordsIn(text: string): number[] {
  const lower = text.toLowerCase();
  const out: number[] = [];
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`).test(lower)) out.push(value);
  }
  return out;
}

const eq = (a: number, b: number) => Math.abs(a - b) <= Math.max(0.01, Math.abs(b) * 1e-4);

/**
 * Is `target` ONE arithmetic step from two values already established?
 *
 * ── WHY A CHAIN IN READING ORDER, AND NOT A CLOSURE ─────────────────────────
 * A one-step rule against the sources alone is too tight: the sound incremental EVA of −1.8 is
 * 10.2 − 8.4, and NEITHER operand appears in any source — they are themselves 120 × 8.5% and
 * 120 × 7%. So legitimate working flags from the second line onward.
 *
 * A transitive CLOSURE over the sources is too loose, and it was measured being too loose: at
 * three rounds over Aotea's ten source figures the closure reached 600, and the audit waved
 * through the exact invention it exists to catch. That is the tolerance eating the signal.
 *
 * The rule that holds is the one that matches how a reveal actually computes: a figure may be
 * derived from the sources PLUS the figures the reveal has already legitimately established,
 * IN READING ORDER. 8.4 follows from the scenario; 10.2 follows from the scenario; −1.8 then
 * follows from those two. An invented 600 follows from nothing that came before it, and neither
 * does anything built on it afterwards — the contamination does not launder itself.
 */
function oneStepFrom(target: number, known: readonly number[]): boolean {
  for (const a of known) for (const b of known) {
    if (eq(target, a + b) || eq(target, a - b) || eq(target, a * b)) return true;
    if (b !== 0 && eq(target, a / b)) return true;
    if (eq(target, a * b / 100)) return true;   // percentage-of — the commonest step here
  }
  return false;
}

/**
 * Audit a served reveal against its sources.
 *
 * `sourced` is built from all three inputs together — a figure the student quoted is as
 * legitimate as one the scenario states, because the reveal is entitled to credit their working.
 */
export function auditRevealFigures(served: string, sources: RevealSources): RevealFigureAudit {
  const sourced = [
    ...numbersIn(sources.context ?? '', true),
    ...numbersIn(sources.modelAnswer ?? '', true),
    ...numbersIn(sources.attempt ?? '', true),
  ];
  const sourcedSet = new Set(sourced);
  // Grows as the reveal establishes figures legitimately — see `oneStepFrom`.
  const established: number[] = [...sourcedSet];
  const near = (set: Iterable<number>, n: number) => [...set].some((k) => eq(k, n));

  // ⚠️ COUNTS ARE HELD TO THE STRICTER RULE, and the Marmara case is why. "the scenario
  // specifies THREE adjustments" is a claim about what the scenario CONTAINS, not a computed
  // quantity — so arithmetic tolerance must not excuse it. It nearly did: the drill states
  // TRY 180m and TRY 60m, and 180 ÷ 60 = 3, so the derivation rule would have waved the
  // fabricated count straight through. A count must be DIRECTLY present in a source.
  const countsInServed = new Set(countWordsIn(served));

  const seen = new Set<number>();
  const unsourced: string[] = [];
  let sourcedCount = 0, derivedCount = 0;

  for (const n of numbersIn(served)) {
    if (seen.has(n)) continue;
    seen.add(n);
    if (near(sourcedSet, n)) { sourcedCount++; continue; }
    if (countsInServed.has(n)) { unsourced.push(String(n)); continue; }  // no derivation for counts
    if (oneStepFrom(n, established)) { derivedCount++; established.push(n); continue; }
    unsourced.push(String(n));   // NOT added to `established` — an invention launders nothing
  }

  return { checked: seen.size, unsourced, sourced: sourcedCount, derived: derivedCount };
}
