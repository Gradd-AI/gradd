// lib/acca/phrase-match.ts
// Fuzzy, normalized phrase matching for the tutor's reveal/teach fast-path detection
// (app/api/acca/tutor/route.ts §7). Extracted 2026-07-23 as a fix for a live-user field bug
// (account dd786100, APM A1b, 2026-07-18 transcript): a student's genuine reveal requests —
// "shiw me full answer" (typo) and "show me full answer" (missing "the") — fell through
// REVEAL_PHRASES' exact substring match, were treated as ordinary WRONG ATTEMPTS by the
// withholding pipeline, and the teaching leg then ad-libbed a fabricated refusal ("I won't hand
// you the full answer — that defeats the point") that is not grounded in any actual system
// instruction — the code never decided to withhold on that turn; the model invented a reason.
// Two failure classes closed here:
//   (1) typos — per-word Levenshtein distance tolerance (capped, see wordTolerance);
//   (2) optional articles ("the"/"a"/"an"/"my") — stripped from both phrase and input before
//       matching, so "show me full answer" (missing "the") matches the same as the canonical form.
// Deliberately CONTIGUOUS matching (with input-side articles freely skippable as filler), not a
// loose subsequence-anywhere search — a genuine multi-paragraph attempt could otherwise scatter
// "show" ... "the answer" far apart across unrelated sentences and false-trigger a reveal. This
// keeps the false-positive profile close to today's plain substring match while tolerating a typo
// or a missing/extra article.
//
// SINGLE SOURCE OF TRUTH (the second half of the same fix, X1 item 2): the exact sentence a
// teaching/confirm leg offers the student ("say 'show me the full answer' to unlock...") is now
// built from the SAME canonical constant the router matches on (REVEAL_PHRASE_STRUGGLE /
// REVEAL_PHRASE_SOLVED, exported below) — offer and router can never diverge again, because there
// is only one string, not two independently-typed copies.
//
// KNOWN RESIDUAL: `lib/acca/teach-engine.ts` (the case-session path, `app/api/acca/case/*`) still
// carries its OWN pre-fix inline copy of REVEAL_PHRASES/TEACH_REQUEST_PHRASES with the old exact
// substring matcher — deliberately NOT touched here. Its own header documents that it is a
// "faithful copy...kept byte-for-byte" of the tutor route by design, with consolidation reserved
// as "a separate, deliberate follow-up once cases have proven out" — this fix respects that
// standing decision rather than silently folding the case route into it. Flag for that follow-up
// pass: teach-engine.ts's matcher is now BEHIND this one and should adopt it when cases graduate.

// ── Optimal-string-alignment distance (bounded — every word in these phrases is short) ──
// Classic Levenshtein PLUS an adjacent-transposition operation at cost 1 ("teh" → "the" is
// distance 1, not 2) — transposed-adjacent-letters is one of the single most common human typo
// patterns (fat-finger key swaps), and treating it as a double-substitution under plain
// Levenshtein made a very ordinary typo ("teh" for "the") fail the tolerance check even though
// it reads as an obvious one-key slip. Full O(m·n) 2D table — fine at this scale (every word here
// is well under 15 characters).
function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        dp[i][j] = Math.min(dp[i][j], dp[i - 2][j - 2] + 1);
      }
    }
  }
  return dp[m][n];
}

// Per-word typo tolerance: the task specifies "edit-distance ≤2 per word", applied as an upper
// bound here — but an UNCAPPED ≤2 on a very short word (e.g. "me", 2 letters) would treat almost
// any 2–4 letter word as a plausible "typo" of it, which is a real false-positive risk. Words of
// ≤3 letters tolerate 1; words of 4+ letters get the full ≤2 the task specifies.
function wordTolerance(phraseWord: string): number {
  return phraseWord.length <= 3 ? 1 : 2;
}

const OPTIONAL_ARTICLES = new Set(['the', 'a', 'an', 'my']);

// A typo'd article ("teh") should still be treated as skippable filler on the INPUT side, not
// forced to align against a phrase content word (where it would simply break the match) — a
// one-edit near-miss of "the" is overwhelmingly more likely to be a slip of "the" than a
// coincidental unrelated word. SCOPED TO "the" ONLY, with a length window: 'a'/'an'/'my' are too
// short (2–3 letters) for a fuzzy check to be safe at any distance — an edit-distance-1 net around
// a 2-letter article catches ordinary content words too easily (e.g. "me" is exactly 1 edit from
// "my", and "me" is one of the most common words in these very phrases — an earlier version of
// this function fuzzy-matched every article and silently ate "me" out of "just tell me" /
// "teach me" / "walk me through", breaking isTeachRequest entirely; caught by the fixture suite
// before shipping). Phrase-side article stripping stays EXACT (REVEAL_PHRASES/TEACH_REQUEST_PHRASES
// are authored strings — no typos to tolerate there).
function isArticleLike(word: string): boolean {
  if (OPTIONAL_ARTICLES.has(word)) return true;
  return Math.abs(word.length - 3) <= 1 && editDistance(word, 'the') <= 1;
}

// Lowercase, strip punctuation to spaces, collapse whitespace, split into words.
function normalizeWords(input: string): string[] {
  return input.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
}

// CONTIGUOUS fuzzy match: does `input` contain the CONTENT words of `phrase` (articles stripped
// from the phrase itself) in order, back-to-back except for input-side articles the matcher
// freely skips over? See module header for why this stays contiguous rather than a loose
// subsequence search.
export function fuzzyPhraseMatch(input: string, phrase: string): boolean {
  const inputWords = normalizeWords(input);
  const phraseWords = normalizeWords(phrase).filter((w) => !OPTIONAL_ARTICLES.has(w));
  if (phraseWords.length === 0) return false;
  for (let start = 0; start < inputWords.length; start++) {
    let ii = start, pi = 0;
    while (ii < inputWords.length && pi < phraseWords.length) {
      const iw = inputWords[ii];
      if (isArticleLike(iw)) { ii++; continue; }
      if (editDistance(iw, phraseWords[pi]) <= wordTolerance(phraseWords[pi])) { ii++; pi++; continue; }
      break;
    }
    if (pi === phraseWords.length) return true;
  }
  return false;
}

export function matchesAnyPhrase(input: string, phrases: readonly string[]): boolean {
  return phrases.some((p) => fuzzyPhraseMatch(input, p));
}

// ── Canonical offer phrases — the single source of truth (X1 fix item 2) ───────
// These EXACT strings are what the router matches on (via REVEAL_PHRASES below) AND what every
// "say ___ to unlock" offer sentence in the teaching/confirm legs is built from.
export const REVEAL_PHRASE_STRUGGLE = 'show me the full answer';
export const REVEAL_PHRASE_SOLVED = 'show me the model answer';

// REVEAL_PHRASES MUST stay disjoint from TEACH_REQUEST_PHRASES under the fuzzy matcher too
// (regression-checked in scripts/test-phrase-match.ts) — otherwise "show me how" could dump the
// answer. Phrases stay imperative-anchored so they cannot appear inside a teach-style message.
export const REVEAL_PHRASES = [
  REVEAL_PHRASE_STRUGGLE,
  'show me the answer',
  REVEAL_PHRASE_SOLVED,
  'show me the worked answer',
  'show me the full build',
  'show the full answer',
  'show the answer',
  'show the model answer',
  'just show me the answer',
  'reveal the answer',
  'reveal the full answer',
  'reveal the model answer',
] as const;

export const TEACH_REQUEST_PHRASES = [
  'just tell me',
  'show me how',
  'walk me through',
  'talk me through',
  'teach me',
  'how would a full-marks',
  'how would a full marks',
  'what would a full-marks',
  'what would a full marks',
] as const;

// ── PLAIN ANSWER REQUESTS — a THIRD list, and deliberately a SUBSET of the teach list ──
//
// "just tell me" is the plainest possible request for the answer. It sits in
// TEACH_REQUEST_PHRASES by INHERITANCE — it was the first entry under `// capitulation` in the
// route's older STOP_PHRASES block and moved across wholesale when the intent layer split the
// list. It was never reasoned about as a reveal-vs-teach boundary case. The disjointness ruling
// above was made about "show me how", which is genuinely teach-shaped; "just tell me" is not.
//
// Measured cost, on a real paid account (dd786100): "just tell me" four times across three weeks,
// four figure-free teaches, zero reveals — on a student carrying miss_count 7 and an active pass,
// i.e. one who had earned the artifact three times over.
//
// THE DISJOINTNESS RULING IS UNTOUCHED. This list does not move a phrase between the two, and it
// is asserted disjoint from REVEAL_PHRASES like everything else. What it does is let the ROUTE
// treat a plain answer request as a reveal request FOR A PAID USER WHO HAS ALREADY EARNED THE
// REVEAL — the one case where routing it to a figure-free teach serves nobody. Below the earn
// threshold, or for a free user, it stays exactly what it is today: a teach request. That
// asymmetry is the whole point and it lives at the call site, not here.
export const PLAIN_ANSWER_REQUEST_PHRASES = [
  'just tell me',
  'just tell me the answer',
  'tell me the answer',
] as const;

export function isRevealRequest(input: string): boolean {
  return matchesAnyPhrase(input, REVEAL_PHRASES);
}

export function isTeachRequest(input: string): boolean {
  return matchesAnyPhrase(input, TEACH_REQUEST_PHRASES);
}

/** A bare request to be told the answer. See PLAIN_ANSWER_REQUEST_PHRASES for why this is
 *  separate from both other lists, and why the caller must gate it on paid + earned. */
export function isPlainAnswerRequest(input: string): boolean {
  return matchesAnyPhrase(input, PLAIN_ANSWER_REQUEST_PHRASES);
}

// ── THE REVEAL OFFER — DETERMINISTIC, not model-emitted ──────────────────────
// The offer used to be an INSTRUCTION inside the teach/confirm prompt ("As the alternative next
// move, tell them they can say …"). Three things were wrong with that:
//   1. It competed with WRAP_UP ("if you are near the length limit, wrap up the current point
//      cleanly rather than starting a new one") under a 600-token cap, and it is instructed to
//      sit LAST — so it is structurally the first thing sacrificed under length pressure.
//   2. `finishClean` trims to the last complete sentence on `max_tokens`, which trims from the
//      END — again, the offer.
//   3. A model may simply not say it. An entitlement the student cannot discover is not an
//      entitlement, and this one is the single most valuable thing a paid account buys.
// It is now appended by CODE after the model returns. Same canonical phrases, so offer and router
// still cannot diverge (the X1 fix item-2 property is preserved — there is still one string).
export type RevealOfferKind = 'struggle' | 'solved';

export function revealOfferLine(kind: RevealOfferKind): string {
  return kind === 'solved'
    ? `\n\nYou've earned this one — say **"${REVEAL_PHRASE_SOLVED}"** and I'll show you how a full-marks version is laid out, so you can compare.`
    : `\n\nWhenever you want it, say **"${REVEAL_PHRASE_STRUGGLE}"** and I'll show you exactly how a full-marks answer is built.`;
}
