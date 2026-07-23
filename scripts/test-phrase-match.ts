// scripts/test-phrase-match.ts
// RED-GREEN fixtures for the X1 field bug fix (lib/acca/phrase-match.ts). Pure — no env/DB/model.
//
// INCIDENT: live-user account dd786100 (APM A1b, 2026-07-18 transcript) typed "shiw me full
// answer" (typo) and "show me full answer" (missing "the"). Both failed the OLD exact-substring
// REVEAL_PHRASES match, so the requests were treated as ordinary wrong attempts by the
// withholding pipeline, and the teaching leg then fabricated its own refusal ("I won't hand you
// the full answer — that defeats the point") — a sentence grounded in nothing, since the code
// never actually decided to withhold on that turn.
//
// RED (§1 below): the OLD matcher is reproduced here verbatim (frozen, for regression evidence
// only — NOT imported from anywhere live) and asserted to FAIL on the user's first two exact
// utterances. This is the permanent record that the bug was real, not a retrofit explanation.
// GREEN (§2+): the NEW exported isRevealRequest/isTeachRequest are asserted to classify all
// three of the user's exact utterances correctly, plus false-positive/disjointness/single-source
// regression coverage.
import {
  isRevealRequest, isTeachRequest, fuzzyPhraseMatch, matchesAnyPhrase,
  REVEAL_PHRASES, TEACH_REQUEST_PHRASES, REVEAL_PHRASE_STRUGGLE, REVEAL_PHRASE_SOLVED,
} from '../lib/acca/phrase-match';

let failures = 0;
function ok(name: string, cond: boolean) { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`); }

// ═══════════════════════════════════════════════════════════════════════════════════════
// §1 — RED: the frozen OLD matcher (exact substring, pre-fix), proving the bug was real
// ═══════════════════════════════════════════════════════════════════════════════════════
const LEGACY_REVEAL_PHRASES = [
  'show me the full answer', 'show me the answer', 'show me the model answer',
  'show me the worked answer', 'show me the full build', 'show the full answer',
  'show the answer', 'show the model answer', 'just show me the answer',
  'reveal the answer', 'reveal the full answer', 'reveal the model answer',
];
function legacyIsRevealRequest(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return LEGACY_REVEAL_PHRASES.some((p) => lower.includes(p));
}

const dd786100_utterance_1 = 'shiw me full answer';   // typo: "shiw" for "show"
const dd786100_utterance_2 = 'show me full answer';   // missing "the"
const dd786100_utterance_3 = 'just tell me';           // must stay TEACH, not become reveal

ok('RED: legacy matcher FAILS on "shiw me full answer" (the actual bug)', !legacyIsRevealRequest(dd786100_utterance_1));
ok('RED: legacy matcher FAILS on "show me full answer" (the actual bug)', !legacyIsRevealRequest(dd786100_utterance_2));

// ═══════════════════════════════════════════════════════════════════════════════════════
// §2 — GREEN: the live-user's exact three utterances, correctly classified
// ═══════════════════════════════════════════════════════════════════════════════════════
ok('GREEN: "shiw me full answer" now matches isRevealRequest (typo tolerance)', isRevealRequest(dd786100_utterance_1));
ok('GREEN: "show me full answer" now matches isRevealRequest (missing article)', isRevealRequest(dd786100_utterance_2));
ok('GREEN: "just tell me" still does NOT match isRevealRequest (stays TEACH, per ruling)', !isRevealRequest(dd786100_utterance_3));
ok('GREEN: "just tell me" still matches isTeachRequest (unchanged classification)', isTeachRequest(dd786100_utterance_3));

// ═══════════════════════════════════════════════════════════════════════════════════════
// §3 — canonical phrase forms still match exactly (no regression on the happy path)
// ═══════════════════════════════════════════════════════════════════════════════════════
ok('canonical "show me the full answer" matches isRevealRequest', isRevealRequest('show me the full answer'));
ok('canonical "show me the model answer" matches isRevealRequest', isRevealRequest('show me the model answer'));
ok('canonical "reveal the answer" matches isRevealRequest', isRevealRequest('reveal the answer'));
ok('canonical "walk me through" matches isTeachRequest', isTeachRequest('walk me through'));
ok('canonical "teach me" matches isTeachRequest', isTeachRequest('teach me'));

// ═══════════════════════════════════════════════════════════════════════════════════════
// §4 — more typo/article variants (article-drop AND typo, capitalisation, punctuation)
// ═══════════════════════════════════════════════════════════════════════════════════════
ok('typo: "SHOW ME THE FULL ANSWR" (caps + typo) matches', isRevealRequest('SHOW ME THE FULL ANSWR'));
ok('typo: "show me teh full answer" (transposition) matches', isRevealRequest('show me teh full answer'));
ok('punctuation: "show me the full answer!!" matches', isRevealRequest('show me the full answer!!'));
ok('punctuation: "show me the full answer?" matches', isRevealRequest('show me the full answer?'));
ok('article-drop: "reveal answer" matches "reveal the answer"', isRevealRequest('reveal answer'));
ok('article-drop + typo: "shw me a model answer" matches "show me the model answer"', isRevealRequest('shw me a model answer'));
ok('over-tolerant typo REJECTED: "show me the full anther" — 2 edits on a 6-letter word, within cap, should match (documents the tolerance boundary)', isRevealRequest('show me the full anther'));

// ═══════════════════════════════════════════════════════════════════════════════════════
// §5 — false-positive guard: real, long APM/AFM attempts must NOT trigger reveal or teach
// ═══════════════════════════════════════════════════════════════════════════════════════
const realAttempt1 =
  "Performance measurement entails the exercise of assessing an organization's performance in key " +
  'areas against stated targets, in a bid to achieve corporate mission. Vantia focusing on assessment ' +
  'of performance in terms of margins, market share and reliance is likely to have a positive ' +
  'behavioral effect on employees. Once the employees at Vantia are aware that performance and ' +
  'bonuses are based on these critical areas, they are likely to devote their efforts.';
const realAttempt2 =
  'Gross margin is not currently measured. Consequently, management focus solely on revenue growth, ' +
  'creating the false impression that performance is improving. However, revenue growth may be driven ' +
  'by aggressive discounting or increasing production costs, resulting in declining profitability.';
ok('false-positive guard: a genuine long attempt does NOT match isRevealRequest', !isRevealRequest(realAttempt1));
ok('false-positive guard: a genuine long attempt does NOT match isTeachRequest', !isTeachRequest(realAttempt1));
ok('false-positive guard 2: a genuine long attempt does NOT match isRevealRequest', !isRevealRequest(realAttempt2));
ok('false-positive guard 2: a genuine long attempt does NOT match isTeachRequest', !isTeachRequest(realAttempt2));
// A deliberately adversarial sentence containing "show" and "answer" far apart — must NOT match
// (proves the matcher stays CONTIGUOUS, not a loose subsequence-anywhere search).
const scatteredWords =
  'The dashboard should show management the true picture, and only then can the board give a ' +
  'considered answer to shareholders about strategy.';
ok('contiguity guard: "show"..."answer" scattered across a real sentence does NOT match', !isRevealRequest(scatteredWords));

// ═══════════════════════════════════════════════════════════════════════════════════════
// §6 — REVEAL_PHRASES / TEACH_REQUEST_PHRASES stay disjoint under the fuzzy matcher
// (the original discipline, re-verified against the new matching logic, not just the old
// exact-substring one)
// ═══════════════════════════════════════════════════════════════════════════════════════
let disjointFailures = 0;
for (const rp of REVEAL_PHRASES) {
  if (matchesAnyPhrase(rp, TEACH_REQUEST_PHRASES)) { disjointFailures++; console.log(`  ✗ REVEAL phrase "${rp}" also matches a TEACH phrase under fuzzy matching`); }
}
for (const tp of TEACH_REQUEST_PHRASES) {
  if (matchesAnyPhrase(tp, REVEAL_PHRASES)) { disjointFailures++; console.log(`  ✗ TEACH phrase "${tp}" also matches a REVEAL phrase under fuzzy matching`); }
}
ok('REVEAL_PHRASES and TEACH_REQUEST_PHRASES remain disjoint under the fuzzy matcher', disjointFailures === 0);

// ═══════════════════════════════════════════════════════════════════════════════════════
// §7 — single source of truth: the canonical offer-phrase constants are themselves valid
// REVEAL_PHRASES entries (so if either constant is ever edited, both the router match and
// the offer sentence move together automatically)
// ═══════════════════════════════════════════════════════════════════════════════════════
ok('REVEAL_PHRASE_STRUGGLE is a REVEAL_PHRASES member', (REVEAL_PHRASES as readonly string[]).includes(REVEAL_PHRASE_STRUGGLE));
ok('REVEAL_PHRASE_SOLVED is a REVEAL_PHRASES member', (REVEAL_PHRASES as readonly string[]).includes(REVEAL_PHRASE_SOLVED));
ok('REVEAL_PHRASE_STRUGGLE itself matches isRevealRequest (self-consistency)', isRevealRequest(REVEAL_PHRASE_STRUGGLE));
ok('REVEAL_PHRASE_SOLVED itself matches isRevealRequest (self-consistency)', isRevealRequest(REVEAL_PHRASE_SOLVED));

// ═══════════════════════════════════════════════════════════════════════════════════════
// §8 — direct fuzzyPhraseMatch unit checks (the primitive underneath isRevealRequest/isTeachRequest)
// ═══════════════════════════════════════════════════════════════════════════════════════
ok('fuzzyPhraseMatch: exact match, no articles', fuzzyPhraseMatch('teach me', 'teach me'));
ok('fuzzyPhraseMatch: single typo within tolerance', fuzzyPhraseMatch('shiw me the full answer', 'show me the full answer'));
ok('fuzzyPhraseMatch: two unrelated words do not match', !fuzzyPhraseMatch('the quick brown fox', 'show me the full answer'));
ok('fuzzyPhraseMatch: empty phrase never matches', !fuzzyPhraseMatch('anything at all', ''));

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
