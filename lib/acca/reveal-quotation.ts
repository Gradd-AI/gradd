// ── THE VERBATIM QUOTATION CHECK ON THE SERVED WRAPPER ───────────────────────
// Grant-ruled 2026-09-06, after the creditable seed measured 4/30 replies carrying a fabricated
// citation at n = 30 (`docs/rollbacks/result_20260906_creditable_n30.md` §1).
//
// THE DEFECT, AND WHY AN INSTRUCTION CANNOT FIX IT. Every one of the five raw errors re-inflected
// the SAME clause of the student's answer to fit the tutor's surrounding grammar —
// `you treated … as strengths that "keep the training set clean,"` against a student who wrote
// *"it keeps the training set clean of incomplete histories"*. The bare infinitive is what the
// carrier sentence REQUIRES; the model is not misremembering, it is conjugating. That pressure
// survives at n = 30 and it survives a prompt that says "quote exactly", which is why this is code
// (P-M4(a): change the structure, never add a prohibition).
//
// WHAT IT DOES, AND WHAT IT DELIBERATELY DOES NOT DO. A student-attributed quoted span that does
// not appear in the attempt loses its QUOTATION MARKS and stays in the sentence as prose. The
// clause is never deleted, never rewritten, and the student's actual wording is never substituted:
// the underlying claim in all five sightings was TRUE — the student did treat those choices as
// strengths — and only the citation's precision was false. Deleting the clause would remove a true
// credit; substituting would put the tutor's editorial hand inside the student's sentence.
//
// ⚠️ WHAT `attempt` MUST BE, AND WHY IT IS RIGHT AT BOTH CALL SITES. Both reveal legs pass
// `lastRealAttempt ?? studentMessage` — the SAME text handed to the model in the user prompt as
// "Their last attempt". That identity is the check's whole basis: it compares the citation against
// the bytes the model was actually shown, not against some other record of the student. The
// fallback arm is correct rather than merely tolerable — when no attempt has been adjudicated the
// model is shown the reveal REQUEST ("show me the answer"), so a citation it produces is not in
// the text it was given and unquoting it is the honest outcome. (Same reasoning the conditioned
// opening's `lastRealAttempt != null` half already turns on.) Never pass the model_answer, the
// scenario or a marking record here: those are not the student's words and a match against them
// would license exactly the C3(c) fabrication the rubric names.
//
// ⚠️ CLAIM CEILING, verbatim. Green means: no span this check CLASSIFIED AS STUDENT-ATTRIBUTED
// survives in quotation marks without appearing in the attempt. It does NOT mean the reply contains
// no fabricated attribution — an unquoted false claim is a §2/§3 error under
// `docs/ATTRIBUTION_RUBRIC.md` and this check cannot see it. It measures citations, not honesty.
//
// ── NORMALISATION, STATED IN FULL (Grant: "state exactly what you normalise") ──
// TWO normalisations are applied to BOTH sides before comparison, and nothing else:
//   (1) WHITESPACE — every run of whitespace (spaces, tabs, CR, LF) collapses to one space, and
//       both sides are trimmed. A citation broken across a line wrap is not a fabrication.
//   (2) ONE TRAILING `, . ; :` immediately inside the closing mark is ignored — and this is a
//       DELIBERATE SECOND NORMALISATION beyond the brief. Reason: American typographic convention
//       puts the carrier sentence's own comma inside the marks (`… that "keep the set clean," when
//       in fact …`), so a faithful citation of a student who wrote *clean* would fail a byte
//       compare on the sentence's punctuation. It is provably safe in the direction that matters:
//       dropping a trailing punctuation mark can only turn a non-match into a match when that mark
//       is the SOLE difference, which is a typographic difference and not a different word. It
//       cannot hide a fabrication. Measured: it changes NONE of the five known sightings.
// NOT normalised, on purpose: letter case, quote glyph inside the span, apostrophe shape
// (straight `'` vs curly `’`), markdown emphasis (`*` / `**`) the model added inside the marks,
// and every other byte. Each of those is a real difference between what the student wrote and what
// the reply put in quotation marks, and the marks are a factual claim about bytes.
//
// ── HOW A STUDENT-ATTRIBUTED SPAN IS TOLD FROM THE TUTOR'S OWN ────────────────
// This matters more than the byte compare: over the three case captures (70 wrappers) there are
// 57 quoted spans and only 9 of them are offered as the student's words. A check that unquoted all
// 57 would strip the tutor's hypotheticals (`a model that simply predicts "no churn"`) and its
// scare quotes (`confusing "clean training data" with "representative training data"`) — the
// exclusions `docs/ATTRIBUTION_RUBRIC.md` §1(d) names, and prose that is worse for the loss.
//
// TWO PARTS, both structural, and the SECOND is the one that does the work:
//
//   1. TRIGGER — somewhere before the opening mark, in the same sentence, a SECOND-PERSON
//      ATTRIBUTION trigger: `you`/`you've`/`you had` + up to 30 characters of plain words +
//      an attribution verb, or `your` + an attribution noun (`answer`, `attempt`, …). The NEAREST
//      such trigger wins — a later one overrides an earlier one.
//
//   2. GOVERNOR — between that trigger and the opening mark there is NO NEW CLAUSE. Part 1 alone
//      is not enough and the corpus is unambiguous about why: 34 of the 57 spans sit in sentences
//      that OPEN with `You've treated the 94% accuracy …` and then hand the quote to a different
//      subject — `… but you've fallen into the base-rate trap—a model that simply predicts "no
//      churn"`. The trigger is present and the quote is not the student's. What separates
//      `you treated X and Y as strengths that "…"` (student's) from `You've treated X, but … a
//      model that predicts "…"` (the tutor's) is that the second crosses a clause boundary and the
//      first does not. So: parenthesised asides are removed (they carry commas that are not clause
//      breaks), a break character ADJACENT to the opening mark is treated as the citation's own
//      punctuation (`you wrote: "…"` is still the student's), and any remaining `, ; : — –` or
//      spaced hyphen means a new clause took over.
//
//   3. NOT AN ATTRIBUTIVE NAME — a span sitting between a DETERMINER and a HEAD NOUN is naming a
//      thing, not citing the student: `you correctly pushed back on the "model is complete" claim`
//      names the ANALYST'S claim, and the frozen rubric scores it §1(d), the tutor's own phrasing.
//      Grammatical, not a phrase table: determiner + quote + common noun is a pre-modifier
//      position. The student-attributed spans in the corpus are all verb-phrase complements and
//      are followed by a function word (`when`, `and`, `as`) or by the end of the wrapper.
//
// 📐 MEASURED on all 57 spans of the three case captures, hand-classified against the frozen
// rubric. See `scripts/test-reveal-quotation.ts`, which pins the corpus cases individually.
//
// ⚠️ THE RESIDUALS, NAMED. (a) A student-attributed quote whose carrier sentence puts a clause
// break between the attribution verb and the mark is MISSED (`you wrote that the data was fine,
// and called it "sound"`). That is the hole to watch, because a miss ships a fabricated citation.
// (b) A tutor-own quote governed by a second-person attribution verb with no intervening clause
// (`Once you've spotted when "clean data" is …`) is unquoted needlessly — costs a scare quote,
// nothing else. (c) BARE STRAIGHT SINGLE QUOTES are read as citations only under strict adjacency
// guards (opener preceded by whitespace and followed by a word character; closer preceded by a
// word character and followed by whitespace or punctuation), because `'` is overwhelmingly an
// apostrophe: all 333 single quotes in the measured corpus are apostrophes and the guards yield
// ZERO pairs on it, which is the negative control.

/** One citation that lost its quotation marks. */
export interface UnquotedCitation {
  /** The span exactly as it stood inside the marks, before removal. */
  quoted: string;
  /** The attribution trigger that made it student-attributed — so a log line is auditable. */
  trigger: string;
}

export interface QuotationCheckResult {
  /** The wrapper with every fabricated student-attributed citation unquoted. */
  text: string;
  /** Every removal, in document order. Empty when the wrapper was already sound. */
  removed: UnquotedCitation[];
  /** Spans classified student-attributed and therefore compared against the attempt. */
  checked: number;
  /** Every quoted span found, student-attributed or not — the denominator for the rate. */
  quotedTotal: number;
}

// ── The attribution verb list ────────────────────────────────────────────────
// PROVENANCE, because a phrase table with no stated source is one the next reader cannot audit:
// this is `docs/ATTRIBUTION_RUBRIC.md` §1's OWN enumeration ("wrote, said, chose, named,
// identified, spotted, recognised, acknowledged, assumed, ruled out, dismissed, set aside,
// diagnosed, concluded, missed" + its surface markers "you rejected", "the point you make",
// "you've designed"), plus verbs of the same type observed governing a student-attributed quote in
// the measured corpus (treated, read, framed, called, described, pushed back, argued, claimed,
// agreed, accepted, praised, flagged).
//
// EXCLUDED ON PURPOSE — perception, instruction and future-tense verbs, which take a quote as a
// THING TO LOOK AT rather than as the student's words: seen/see/spot/look, need, told, realise,
// absorbed, want, try, apply, demand, ask, start, understand, learn, know. `Once you've seen how
// to spot when "clean data" is actually "data that hides the future,"` is the tutor teaching, and
// three of the corpus's tutor-own spans depend on this exclusion.
const ATTRIBUTION_VERBS = [
  'wrote', 'write', 'writes', 'written', 'writing',
  'said', 'say', 'says', 'saying',
  'named', 'name', 'names', 'naming',
  'chose', 'choose', 'chosen', 'choosing',
  'identified', 'identify', 'identifies', 'identifying',
  'spotted', 'recognised', 'recognized', 'acknowledged',
  'assumed', 'assume', 'assumes', 'assuming',
  'dismissed', 'dismisses', 'dismissing',
  'diagnosed', 'concluded', 'concludes', 'concluding',
  'missed', 'misses', 'missing',
  'rejected', 'rejects', 'rejecting',
  'noted', 'notes',
  'treated', 'treats', 'treat', 'treating',
  'read', 'reads', 'reading',
  'framed', 'frames', 'framing',
  'called', 'calls', 'calling',
  'described', 'describes', 'describing',
  'argued', 'argues', 'arguing',
  'claimed', 'claims', 'claiming',
  'agreed', 'agrees', 'agreeing',
  'accepted', 'accepts', 'accepting',
  'praised', 'praises', 'praising',
  'flagged', 'flags', 'flagging',
  'designed', 'designs', 'designing',
  'made', 'make', 'makes', 'making',
  'set aside', 'ruled out', 'pushed back', 'push back', 'pushes back',
  // ── WIDENED 2026-09-06, BECAUSE THE LIST ITSELF WAS THE HOLE ────────────────
  // The n=30 re-measure served `you endorsed including the sitewide-discount year as "exposing
  // the model to wider behaviour,"` — a fabricated citation under an explicit attribution verb,
  // missed for one reason only: `endorsed` was not on this list. That is the residual this
  // module's header names, caught in production rather than in argument. The whole ENDORSEMENT /
  // STANCE family is added, because "you <stance verb> X as Y" is the same construction as
  // "you treated X as Y" and picking them off one sighting at a time is how the next one ships.
  'endorse', 'endorsed', 'endorses', 'endorsing',
  'backed', 'backing', 'defend', 'defended', 'defends', 'defending',
  'championed', 'embrace', 'embraced', 'embraces', 'embracing',
  'welcomed', 'welcomes', 'approved', 'approves', 'approving',
  'credited', 'credits', 'crediting',
  'characterised', 'characterized', 'characterises', 'characterizes',
  'characterising', 'characterizing',
  'label', 'labelled', 'labeled', 'labels', 'labelling', 'labeling', 'branded',
  'view', 'viewed', 'views', 'viewing', 'regard', 'regarded', 'regards',
  'judge', 'judged', 'judges', 'judging', 'deem', 'deemed', 'deems',
  'presented', 'presents', 'presenting', 'portrayed', 'portrays',
  'assert', 'asserted', 'asserts', 'asserting', 'insisted', 'insists',
  'maintained', 'maintains', 'suggest', 'suggested', 'suggests', 'suggesting',
  'propose', 'proposed', 'proposes', 'proposing',
  'recommend', 'recommended', 'recommends', 'recommending',
  'advise', 'advised', 'advises', 'advising', 'state', 'stated', 'states', 'stating',
  'downplayed', 'downplays', 'overlook', 'overlooked', 'overlooks', 'overlooking',
  'ignore', 'ignored', 'ignores', 'ignoring', 'glossed',
  'believe', 'believed', 'believes',
  'interpret', 'interpreted', 'interprets', 'interpreting',
  'took', 'taken', 'put', 'puts',
  'justified', 'justifies', 'justifying', 'equated', 'equates', 'equating',
  'conclude', 'call', 'frame',
];

// ⚠️ THREE FAMILIES WERE CONSIDERED AND LEFT OUT, each for a stated reason — a list is only
// auditable if its ABSENCES are too.
//   • `rate` / `rated` / `rates` — a false friend in this domain. `you need the discount rate`
//     would match `you` + 19 plain characters + `rate` and turn every rate sentence into a trigger.
//   • `confuse` / `confused` / `confusing` / `conflate` — the tutor's own device, not a citation.
//     `You're confusing "a wider range of data is noisy" with "noise in the training data makes the
//     model less reliable,"` (served, run 18) puts quotation marks around two PROPOSITIONS the
//     tutor has formulated; the marks are doing grammatical work, nominalising two clauses, and
//     removing them produces an unreadable sentence. The frozen rubric scores the same shape
//     (`confusing "clean training data" with "representative training data"`) as §1(d), the
//     tutor's own phrasing.
//   • `see` / `seen` / `spot` / `absorbed` / `realise` / `told` / `need` / `demand` / `asked` —
//     perception, instruction and future tense. Six of the corpus's tutor-own spans depend on
//     these staying out; `Once you've seen how to spot when "clean data" is …` is teaching, and
//     `a fresh scenario where you're told a test is "95% accurate"` is a hypothetical.

/** Nouns that make `your <noun>` an attribution ("your answer treated …"). Deliberately NOT
 *  every noun: `your baseline "predict no churn ever" model` is the tutor's device, not a claim
 *  about the student's text, and the corpus contains exactly that sentence. */
const ATTRIBUTION_NOUNS = [
  'answer', 'answers', 'attempt', 'attempts', 'response', 'responses',
  'reply', 'write-up', 'writeup', 'wording', 'words', 'point', 'points',
  'recommendation', 'recommendations', 'conclusion', 'conclusions',
];

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// `you` (+ contraction) → up to 30 characters of PLAIN material (letters, digits, spaces,
// apostrophes, hyphens — deliberately no comma, colon, dash, asterisk or bracket, each of which
// is a clause break) → an attribution verb. Or `your` + an attribution noun.
const TRIGGER_SOURCE =
  '\\byou(?:\u2019ve|\'ve|\'d|\'ll|\'re| have| had)?\\b[A-Za-z0-9 \'\u2019-]{0,30}?\\b(?:' +
    ATTRIBUTION_VERBS.map(esc).join('|') +
  ')\\b' +
  '|\\byour\\b[A-Za-z0-9 \'\u2019-]{0,20}?\\b(?:' + ATTRIBUTION_NOUNS.map(esc).join('|') + ')\\b';

/** Clause-break characters. A SPACED hyphen only — `promotion-distorted` is one word. */
const CLAUSE_BREAK_RE = /[,;:\u2014\u2013]|\s-\s/;

/** Part 3 \u2014 a determiner immediately before the opening mark.
 *  \u26a0\ufe0f `that` IS DELIBERATELY ABSENT. It is a relativizer far more often than a demonstrative here
 *  \u2014 `as strengths that "keep the training set clean"` is the exact shape of four of the five
 *  measured fabrications \u2014 and part 3 EXCLUDES a span from being checked at all, so a collision
 *  costs a shipped fabricated citation. The demonstrative reading (`that "model is complete"
 *  claim`) loses its exclusion; that costs one needless unquoting. Wrong direction, cheap side. */
const DETERMINER_BEFORE_RE = /(?:^|[\s(])(?:the|this|these|those|a|an|its|their|his|her|our)\s*$/i;
/** Function words that CANNOT be the head noun of a pre-modified noun phrase. If one of these
 *  follows the closing mark, the span was a verb-phrase complement, not an attributive name.
 *  Closed and small on purpose: anything NOT listed counts as a head noun, and a head noun
 *  EXCLUDES the span from checking \u2014 so the exclusion must be hard to reach, not easy. */
const FUNCTION_WORD_AFTER = new Set([
  'and', 'or', 'but', 'when', 'while', 'as', 'if', 'so', 'because', 'though', 'although',
  'which', 'that', 'who', 'whom', 'whose', 'than', 'then', 'yet', 'for', 'nor',
  'in', 'on', 'to', 'into', 'with', 'without', 'at', 'by', 'from', 'of', 'over', 'under',
  'is', 'was', 'are', 'were', 'be', 'been', 'being', 'would', 'will', 'can', 'could',
  'rather', 'instead', 'despite', 'unless', 'until', 'before', 'after',
]);

/** The two normalisations, stated in the header. Applied to both sides, nothing else. */
function normaliseWhitespace(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}
function dropOneTrailingPunctuation(s: string): string {
  return s.replace(/[,.;:]$/, '');
}

export interface QuotedSpan { open: number; close: number; inner: string }

/**
 * Every quoted span in the text, in document order, non-overlapping.
 * Straight double, curly double, curly single, and — under adjacency guards — straight single.
 */
export function quotedSpans(text: string): QuotedSpan[] {
  const out: QuotedSpan[] = [];
  let i = 0;
  const isWord = (c: string | undefined) => c !== undefined && /[A-Za-z0-9]/.test(c);
  while (i < text.length) {
    const ch = text[i];
    let closer: string | null = null;
    if (ch === '"') closer = '"';
    else if (ch === '\u201C') closer = '\u201D';
    else if (ch === '\u2018') closer = '\u2019';
    else if (ch === "'") {
      // STRICT: an opener must follow whitespace/start/bracket AND precede a word character,
      // or it is an apostrophe. `don't`, `analysts'`, `'90s` all fail this.
      const before = i === 0 ? ' ' : text[i - 1];
      if (/[\s([]/.test(before) && isWord(text[i + 1])) closer = "'";
    }
    if (closer === null) { i++; continue; }
    // Find the closing mark. For the straight single, the closer must end a word and be followed
    // by whitespace, punctuation or end — otherwise it is an apostrophe inside the span.
    let j = i + 1;
    let found = -1;
    while (j < text.length) {
      if (text[j] === '\n' && text[j + 1] === '\n') break;  // never cross a paragraph break
      if (text[j] === closer) {
        if (closer !== "'") { found = j; break; }
        const after = text[j + 1];
        if (isWord(text[j - 1]) && (after === undefined || /[\s.,;:!?)\]\u2014\u2013-]/.test(after))) { found = j; break; }
      }
      j++;
    }
    if (found === -1 || found === i + 1) { i++; continue; }   // unterminated, or empty
    out.push({ open: i, close: found, inner: text.slice(i + 1, found) });
    i = found + 1;
  }
  return out;
}

/**
 * Every quoted span's CONTENT replaced by spaces, marks and length preserved so every index into
 * the original still points at the same place. What is inside quotation marks is somebody else's
 * punctuation: a comma there is not a clause boundary, a full stop there is not a sentence end,
 * and `you wrote` there is the quoted person's words and not the carrier's attribution trigger.
 */
export function maskQuotedContent(text: string): string {
  const chars = text.split('');
  for (const s of quotedSpans(text)) {
    for (let k = s.open + 1; k < s.close; k++) chars[k] = ' ';
  }
  return chars.join('');
}

/** Start index of the sentence containing `at` — bounded by a sentence terminator followed by
 *  whitespace, and by a paragraph break. `0.5%` and `~6%` are safe: the terminator must be
 *  followed by whitespace. */
function sentenceStart(text: string, at: number): number {
  for (let k = at - 1; k > 0; k--) {
    if (text[k] === '\n' && text[k - 1] === '\n') return k + 1;
    if (/[.!?]/.test(text[k]) && /\s/.test(text[k + 1] ?? ' ')) return k + 1;
  }
  return 0;
}

/**
 * Is this quoted span offered as the STUDENT'S words? Returns the governing trigger, or null.
 * See the module header for the two parts and for what each residual costs.
 */
export function studentAttributedTrigger(text: string, span: QuotedSpan): string | null {
  // ⚠️ EVERY SCAN BELOW RUNS ON THE MASKED TEXT, AND THAT IS LOAD-BEARING (added 2026-09-06 after
  // a live survivor). The model wrote `you've read … as strengths ("cleaner," "better
  // generalisation"), when in fact …`. The first citation was caught; the second was not, because
  // the gap before it contained the FIRST citation's own internal comma. That comma is inside
  // quotation marks — it is not a clause boundary of the carrier sentence, and neither is a full
  // stop inside a quoted span, which would otherwise make `sentenceStart` begin the sentence in
  // the middle of someone else's words. Masking the CONTENTS of every quoted span (marks kept,
  // indices preserved) makes the carrier prose the only thing any of these tests can see.
  const masked = maskQuotedContent(text);
  const from = sentenceStart(masked, span.open);
  const before = masked.slice(from, span.open);

  // Part 1 — the NEAREST second-person attribution trigger before the mark.
  // A fresh RegExp per call: a module-level /g regex carries `lastIndex` across calls, and this
  // function is called once per span.
  const re = new RegExp(TRIGGER_SOURCE, 'gi');
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(before)) !== null) last = m;
  if (last === null) return null;

  // Part 2 — no new clause between the trigger and the mark.
  let gap = before.slice(last.index + last[0].length);
  gap = gap.replace(/\([^)]*\)/g, ' ');                       // a parenthesised aside is not a break
  // \u2026and neither is one that OPENS before the citation and closes AFTER it. The same live
  // survivor sat inside `as strengths ("cleaner," "better generalisation")`: the closing bracket
  // is past the mark, so the complete-pair strip above can never reach it.
  gap = gap.replace(/\([^)]*$/, ' ');
  gap = gap.replace(/[\s,;:\u2014\u2013]*$/, '');             // punctuation adjacent to the mark is
                                                              // the citation's own (`you wrote: "…"`)
  if (CLAUSE_BREAK_RE.test(gap)) return null;

  // Part 3 — determiner + span + head noun is an attributive NAME, not a citation.
  if (DETERMINER_BEFORE_RE.test(before)) {
    const after = text.slice(span.close + 1).match(/^\s*([A-Za-z][A-Za-z-]*)/);
    if (after && !FUNCTION_WORD_AFTER.has(after[1].toLowerCase())) return null;
  }
  return last[0];
}

/** Does this span appear in the attempt, under the two stated normalisations? */
export function citationIsVerbatim(inner: string, attempt: string): boolean {
  const hay = normaliseWhitespace(attempt);
  const needle = normaliseWhitespace(inner);
  if (needle === '') return true;
  return hay.includes(needle) || hay.includes(dropOneTrailingPunctuation(needle));
}

/**
 * Remove the quotation marks from every student-attributed span that does not appear in the
 * attempt. The span's own bytes are untouched; only the two marks are dropped.
 */
export function enforceVerbatimQuotation(wrapper: string, attempt: string): QuotationCheckResult {
  const quotedTotal = quotedSpans(wrapper).length;
  const removed: UnquotedCitation[] = [];
  let checked = 0;
  let text = wrapper;

  // ── RUN TO A FIXED POINT, AND THAT IS THE GUARANTEE ─────────────────────────
  // One pass is not enough, and the reason is measured rather than imagined: removing a pair of
  // marks UNMASKS whatever was inside it, so the carrier prose a later span is judged against can
  // change. The live survivor was the mirror of this — a second citation judged against a comma
  // that belonged to the first one — and while masking fixes that direction, iterating to a fixed
  // point makes the claim a CONSTRUCTION rather than an argument about which direction the
  // residual falls. Terminating: every pass either removes at least one pair of marks or stops,
  // and the number of marks strictly decreases. The cap is belt-and-braces, never reached.
  for (let pass = 0; pass < 8; pass++) {
    const spans = quotedSpans(text);
    let out = '';
    let cursor = 0;
    let removedThisPass = 0;
    for (const span of spans) {
      const trigger = studentAttributedTrigger(text, span);
      if (trigger === null) continue;
      if (pass === 0) checked++;
      if (citationIsVerbatim(span.inner, attempt)) continue;
      out += text.slice(cursor, span.open) + span.inner;
      cursor = span.close + 1;
      removed.push({ quoted: span.inner, trigger });
      removedThisPass++;
    }
    if (removedThisPass === 0) break;
    text = out + text.slice(cursor);
  }
  return { text, removed, checked, quotedTotal };
}
