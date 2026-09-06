// scripts/test-reveal-quotation.ts — `npm run test:reveal-quotation`
//
// PURE. No DB, no model, no network. In the contract gate by discovery (`scripts/test-*.ts`).
//
// Two things are under test and they fail for different reasons:
//   1. `enforceVerbatimQuotation` — the verbatim citation check on the served reveal wrapper.
//   2. `sanitizeAfmWrapper` / `isBuildHeadingLine` — the heading-SHAPE cut that replaced the
//      phrase cut which was deleting the pointer beat.
//
// ⚠️ THE CORPUS CASES ARE PINNED INDIVIDUALLY, NOT AS A RATE. The discriminator was DESIGNED
// against these 57 spans, so "8 of 57" proves nothing on its own — it is the number it was fitted
// to. What the individual pins defend is that a future edit cannot move ONE of them without going
// red, and the tutor-own cases are pinned as MUST-NOT-FIRE for exactly that reason: the cheap way
// to make the fabrication count zero is to unquote everything.

import {
  enforceVerbatimQuotation, quotedSpans, studentAttributedTrigger, citationIsVerbatim,
  maskQuotedContent,
} from '../lib/acca/reveal-quotation';
import { sanitizeAfmWrapper, isBuildHeadingLine, assembleAfmReveal } from '../lib/acca/tutor-personas';

let pass = 0, fail = 0;
function ok(label: string, cond: boolean) {
  if (cond) { pass++; return; }
  fail++;
  console.error(`  FAIL: ${label}`);
}

// ── The two seed answers, byte-identical to `scripts/_case_reveal_n30.ts` ─────
// Only the sentences the corpus quotes from are needed, and they are transcribed VERBATIM from
// the capture (`docs/rollbacks/case_reveal_n30_seedB_creditable_20260906.json`.answer).
const SEED_B_TRAINING_PARA =
  'The training data is a genuine strength of this model and I would not change it. Including the ' +
  'sitewide discounting year is an advantage, because it exposes the model to a much wider range ' +
  'of purchasing behaviour than two normal years would have done, and a model trained on a wider ' +
  'range generalises better. Excluding customers who joined in the last twelve months is also ' +
  'sound, because it keeps the training set clean of incomplete histories that would otherwise ' +
  'add noise. Between them, those two choices are why the model performs as well as it does.';
const SEED_B_FINAL =
  "The customer-services finding is worth acting on, and the flagged list can go to marketing as " +
  "a pilot. On the analyst's final point I agree the model can be treated as complete: the data " +
  'choices above are sound, so retraining would add cost without adding much.';
const SEED_B = `${SEED_B_TRAINING_PARA}\n\n${SEED_B_FINAL}`;

const SEED_A_ACCURACY =
  "The 94% accuracy figure is the key validation. Only about 6% of Vesla's customers churn in a " +
  'typical year, so a model that is right 94% of the time is performing far above the underlying ' +
  'rate of the event it is predicting, and that margin is what gives comfort that the ' +
  'classifications are genuine rather than chance. On any reasonable reading that is an excellent ' +
  "result and I would accept the analyst's conclusion on it.";

console.log('── (1) the five sighted fabrications, verbatim from the n=30 capture ──');

// Every carrier sentence below is transcribed from the capture's `score.wrapper`.
const SIGHTINGS: Array<[string, string, string]> = [
  ['run 4  — inflection + "the model" for "the training set"',
   'Where your answer went off track, though, is on the training data: you treated the inclusion ' +
   'of a promotion-distorted year and the exclusion of new customers as strengths that "keep the ' +
   'model clean," when in fact they\'re serious limitations.',
   'keep the model clean,'],
  ['run 6  — inflection + a dropped word',
   "Where you've walked into trouble is treating the training-data choices (including the " +
   'promotion year, excluding new customers) as strengths that "keep the set clean."',
   'keep the set clean.'],
  ['run 7  — inflection only (the exact n=10 repeat)',
   'Where your answer slips is in the training data section—you\'ve read those choices (including ' +
   'the promotion year, excluding new customers) as strengths that "keep the training set clean," ' +
   'when in fact they\'re significant flaws.',
   'keep the training set clean,'],
  ['run 24 — two in one reply, under an explicit "you wrote that" (first)',
   'Where your answer went off track was treating the training-data choices as a genuine strength: ' +
   'you wrote that including the discounting year and excluding new customers "expose the model to ' +
   'a wider range" and "keep the training set clean," when in fact both choices mean the model ' +
   'learned from an unrepresentative past.',
   'expose the model to a wider range'],
];

for (const [label, wrapper, quoted] of SIGHTINGS) {
  const r = enforceVerbatimQuotation(wrapper, SEED_B);
  ok(`${label}: flagged`, r.removed.some(x => x.quoted === quoted));
  ok(`${label}: the marks are gone and the words are not`,
    !r.text.includes(`"${quoted}"`) && r.text.includes(quoted));
  ok(`${label}: nothing else was touched`,
    r.text.length === wrapper.length - 2 * r.removed.length);
}

// Run 24 carries TWO — the second one matters because it is further from the trigger.
{
  const w = SIGHTINGS[3][1];
  const r = enforceVerbatimQuotation(w, SEED_B);
  ok('run 24: BOTH citations in the one sentence are unquoted', r.removed.length === 2);
  ok('run 24: the second is the "keep the training set clean," one',
    r.removed[1].quoted === 'keep the training set clean,');
}

console.log('── (2) the tutor\'s own quotes — MUST NOT FIRE ──');

// ⚠️ P-G3. These are the expensive half. A check that unquotes these is not "stricter", it is
// wrong: it strips the tutor's hypotheticals and scare quotes, which `docs/ATTRIBUTION_RUBRIC.md`
// §1(d) excludes from scoring and which the prose depends on.
const TUTOR_OWN: Array<[string, string, string]> = [
  ['seed A — the hypothetical model, with a second-person trigger EARLIER in the same sentence',
   "You've treated the 94% accuracy as proof the model works, but you've fallen into the base-rate " +
   'trap—a model that simply predicts "no churn" would also be 94% accurate.',
   SEED_A_ACCURACY],
  ['seed A — "Your answer treated …, but … a model that simply predicts"',
   'Your answer treated the 94% accuracy headline as a genuine validation, but you\'ve walked into ' +
   'the base-rate trap — when a base event only affects 6% of customers, a model that simply ' +
   'predicts "no churn" for everyone is already 94% accurate.',
   SEED_A_ACCURACY],
  ['seed B — a scare-quote pair under an EXCLUDED perception verb ("you\'ve seen")',
   'Once you\'ve seen how to spot when "clean data" is actually "data that hides the future," try ' +
   'applying that lens to a fresh scenario.',
   SEED_B],
  ['seed B — a scare-quote pair with no second person at all',
   'The misconception is **confusing "clean training data" with "representative training data"**: ' +
   'a dataset can be internally consistent yet fail to capture the real world.',
   SEED_B],
  ['seed B — the tutor\'s own hypothetical retailer',
   'Then apply the same lens to a fresh scenario: if a retailer excluded a whole channel (say, all ' +
   'app purchases) from training data to "keep it clean," what would the model miss?',
   SEED_B],
  ['seed B — an attributive NAME, not a citation (determiner + span + head noun)',
   'You\'ve nailed the base-rate trap and the correlation-versus-causation problem, and you ' +
   'correctly pushed back on the "model is complete" claim—that\'s solid critical thinking.',
   SEED_B],
  ['spread — "your baseline \'…\' model" is the tutor\'s device, not a claim about the text',
   'You\'ve made a sharp start: the base-rate trap is exactly right, and you\'re correct that ' +
   'accuracy alone is close to useless when your baseline "predict no churn ever" model scores 94%.',
   SEED_B],
];
for (const [label, wrapper, attempt] of TUTOR_OWN) {
  const r = enforceVerbatimQuotation(wrapper, attempt);
  ok(`MUST NOT FIRE — ${label}`, r.removed.length === 0 && r.text === wrapper);
}

console.log('── (3) a FAITHFUL student citation survives ──');
{
  const w = 'You treated the exclusion of new joiners as a strength that "keeps the training set ' +
            'clean of incomplete histories" when in fact it blinds the model to a whole segment.';
  const r = enforceVerbatimQuotation(w, SEED_B);
  ok('verbatim citation keeps its marks', r.removed.length === 0 && r.text === w);
  ok('and it WAS checked, not merely skipped', r.checked === 1);
}
{
  // Truncation at a word boundary is permitted by rubric §4 and `includes` gives it for free.
  const w = 'You wrote that the choices "keeps the training set clean" and left it there.';
  ok('a word-boundary truncation of a real span is faithful',
    enforceVerbatimQuotation(w, SEED_B).removed.length === 0);
}
{
  // NORMALISATION (1): whitespace. A citation broken over a line wrap is not a fabrication.
  const w = 'You wrote that the choices "keeps the training\n  set clean" and stopped.';
  ok('whitespace normalisation: a wrapped citation is faithful',
    enforceVerbatimQuotation(w, SEED_B).removed.length === 0);
}
{
  // NORMALISATION (2): one trailing punctuation mark inside the closing quote.
  const w = 'You wrote that the choices "keeps the training set clean," and stopped.';
  ok('trailing-comma normalisation: the carrier sentence\'s own comma is not a fabrication',
    enforceVerbatimQuotation(w, SEED_B).removed.length === 0);
  const w2 = 'You wrote that the choices "keeps the training set cleans," and stopped.';
  ok('…and it does not hide a real difference in the words',
    enforceVerbatimQuotation(w2, SEED_B).removed.length === 1);
}
{
  // NOT normalised, on purpose — each is a real difference in the bytes the marks claim.
  ok('case is NOT normalised',
    enforceVerbatimQuotation('You wrote that it "Keeps The Training Set Clean" here.', SEED_B)
      .removed.length === 1);
  ok('added markdown emphasis inside the marks is NOT normalised',
    enforceVerbatimQuotation('You wrote that it "keeps the *training* set clean" here.', SEED_B)
      .removed.length === 1);
}

console.log('── (3b) THE LIVE SURVIVOR — punctuation that is not the carrier sentence\'s ──');
// 🔴 MEASURED IN PRODUCTION, 2026-09-06, run 22 of the re-measure. The first version of this check
// caught the first citation and served the second. Cause: the gap before the second span carried
// (a) the FIRST citation's own internal comma and (b) a parenthesis that opens before the mark and
// closes after it — neither of which is a clause boundary of the carrier sentence. Both are now
// masked/stripped. Transcribed from the served wrapper.
{
  const RAW22 =
    "You've nailed the base-rate critique and the correlation-versus-causation trap on app usage — " +
    "those are the two highest-leverage challenges to the analyst's claims. Where your logic " +
    "slipped was on training data: you've read the inclusion of the promotion year and exclusion " +
    'of new customers as strengths ("cleaner," "better generalisation"), when in fact they\'re both ' +
    'material blind spots.';
  const r = enforceVerbatimQuotation(RAW22, SEED_B);
  ok('survivor: BOTH citations are unquoted, not just the first',
    r.removed.length === 2 &&
    r.removed.map(x => x.quoted).join('|') === 'cleaner,|better generalisation');
  ok('survivor: no marks survive around either', !r.text.includes('"cleaner,"') && !r.text.includes('"better generalisation"'));
  ok('survivor: both sets of words survive', r.text.includes('cleaner,') && r.text.includes('better generalisation'));
  ok('survivor: the check is idempotent on its own output',
    enforceVerbatimQuotation(r.text, SEED_B).removed.length === 0);
  // P-G3: the single-pass, unmasked shape pinned as the wrong answer. Judging span 2 against the
  // RAW gap (which holds span 1's comma) makes it tutor-own, which is how it shipped.
  const spans = quotedSpans(RAW22);
  const rawGap = RAW22.slice(RAW22.indexOf("you've read") + "you've read".length, spans[1].open);
  ok('P-G3: the unmasked gap DOES contain a comma — i.e. the shipped logic had to miss it',
    /,/.test(rawGap.replace(/\([^)]*\)/g, ' ')));
  ok('…and the masked gap does not', !/[,;:]/.test(
    maskQuotedContent(RAW22).slice(RAW22.indexOf("you've read") + "you've read".length, spans[1].open)
      .replace(/\([^)]*\)/g, ' ').replace(/\([^)]*$/, ' ').replace(/[\s,;:—–]*$/, '')));
}
{
  // The two masking properties on their own.
  const t = 'you wrote "a, b" and then "c d" here.';
  ok('mask: quoted CONTENT is blanked, marks and length preserved',
    maskQuotedContent(t).length === t.length &&
    maskQuotedContent(t) === 'you wrote "    " and then "   " here.');
  // A full stop inside a quote must not start a new sentence — otherwise the carrier's own
  // attribution trigger falls outside the scanned window and the citation reads as the tutor's.
  const s2 = 'It is fine. You wrote "one. two" and then "three" ended.';
  ok('mask: a full stop inside a quote does not start a new sentence',
    studentAttributedTrigger(s2, quotedSpans(s2)[1]) !== null);
  ok('P-G3: …and an UNMASKED sentence scan would have missed it',
    (() => {
      const span = quotedSpans(s2)[1];
      let start = 0;
      for (let k = span.open - 1; k > 0; k--) {
        if (/[.!?]/.test(s2[k]) && /\s/.test(s2[k + 1] ?? ' ')) { start = k + 1; break; }
      }
      return !/\byou\b/i.test(s2.slice(start, span.open));
    })());
  const p = 'you treated them as strengths (cleaner, "better generalisation"), and stopped.';
  ok('an UNCLOSED parenthesis before the mark is an aside, not a clause break',
    studentAttributedTrigger(p, quotedSpans(p)[0]) !== null);
}

console.log('── (3c) THE SECOND LIVE SURVIVOR — a verb that was not on the list ──');
// 🔴 MEASURED IN PRODUCTION, 2026-09-06, run 12 of the second re-measure. Caught by nothing,
// for one reason: `endorsed` was not an attribution verb here. Transcribed from the served text.
{
  const RAW12 =
    'The misconception you fell into is **accepting the training-data choices as strengths when ' +
    "they're actually significant blind spots**: you endorsed including the sitewide-discount " +
    'year as "exposing the model to wider behaviour," but that year\'s distorted purchasing ' +
    'patterns mean the model has partly learned an unrepresentative past.';
  const r = enforceVerbatimQuotation(RAW12, SEED_B);
  ok('survivor 2: `you endorsed … as "…"` is a citation and is caught',
    r.removed.length === 1 && r.removed[0].quoted === 'exposing the model to wider behaviour,');
  ok('survivor 2: the student really did write something close but not this',
    SEED_B.includes('it exposes the model to a much wider range of purchasing behaviour') &&
    !SEED_B.includes('exposing the model to wider behaviour'));
  ok('survivor 2: the claim survives as prose', r.text.includes('exposing the model to wider behaviour,'));
}
// The three families deliberately kept OFF the list, pinned so a later widening has to argue
// with a failing fixture rather than with a comment.
{
  const rate = 'you need the discount rate for "no churn" here.';
  ok('MUST NOT FIRE — `rate` is a false friend in this domain and is off the list',
    studentAttributedTrigger(rate, quotedSpans(rate)[0]) === null);
  const conf = 'You\'re confusing "a wider range of data is noisy" with "noise makes it less reliable," here.';
  ok('MUST NOT FIRE — `confusing` nominalises two of the TUTOR\'s propositions (served, run 18)',
    enforceVerbatimQuotation(conf, SEED_B).removed.length === 0);
  const told = 'a fresh scenario where you\'re told a medical screening test is "95% accurate" today.';
  ok('MUST NOT FIRE — `told` is a hypothetical, not an attribution',
    studentAttributedTrigger(told, quotedSpans(told)[0]) === null);
}

console.log('── (4) the quote-span scanner ──');
ok('straight double pairs are found', quotedSpans('a "b c" d').length === 1);
ok('curly double pairs are found', quotedSpans('a “b c” d').length === 1);
ok('curly single pairs are found', quotedSpans('a ‘b c’ d').length === 1);
ok('an unterminated mark is not a span', quotedSpans('a "b c d').length === 0);
ok('an empty pair is not a span', quotedSpans('a "" d').length === 0);
ok('a span never crosses a paragraph break', quotedSpans('a "b\n\nc" d').length === 0);
// ⚠️ THE NEGATIVE CONTROL FOR THE STRAIGHT SINGLE QUOTE. All 333 single quotes in the measured
// corpus are apostrophes; the adjacency guards must yield zero pairs on that shape.
ok('apostrophes do not form a pair (contractions)',
  quotedSpans("you don't and it isn't and we can't").length === 0);
ok('apostrophes do not form a pair (possessive plural)',
  quotedSpans("the analysts' view and the boards' view").length === 0);
ok('a genuine straight-single citation IS found',
  quotedSpans("you wrote 'keep it clean' there").length === 1);
ok('a straight-single citation containing an apostrophe closes at the right mark',
  quotedSpans("you wrote 'the model isn't sound' there")[0].inner === "the model isn't sound");

console.log('── (5) the discriminator, unit-level ──');
{
  const w = 'you treated them as strengths that "X" when in fact';
  ok('trigger + no clause break → student-attributed',
    studentAttributedTrigger(w, quotedSpans(w)[0]) !== null);
  const w2 = 'you treated them, but a model that predicts "X" is fine';
  ok('trigger + an intervening clause break → NOT student-attributed',
    studentAttributedTrigger(w2, quotedSpans(w2)[0]) === null);
  const w3 = 'a model that predicts "X" is fine';
  ok('no trigger at all → NOT student-attributed',
    studentAttributedTrigger(w3, quotedSpans(w3)[0]) === null);
  const w4 = 'you wrote: "X" and stopped.';
  ok('a break ADJACENT to the mark is the citation\'s own punctuation, not a new clause',
    studentAttributedTrigger(w4, quotedSpans(w4)[0]) !== null);
  const w5 = 'you treated the choices (including the year, excluding new joiners) as "X" here';
  ok('a parenthesised aside is not a clause break',
    studentAttributedTrigger(w5, quotedSpans(w5)[0]) !== null);
  const w6 = 'you read the promotion-heavy year as a strength that "X" when in fact';
  ok('an unspaced hyphen inside a word is not a clause break',
    studentAttributedTrigger(w6, quotedSpans(w6)[0]) !== null);
  // ⚠️ Part 3's sharpest collision, pinned: relativizer `that` before the mark must NOT read as a
  // determiner. Four of the five measured fabrications sit in exactly this position.
  const w8 = 'you treated them as strengths that "keep the set clean" here.';
  ok('relativizer `that` + a following noun is still student-attributed',
    studentAttributedTrigger(w8, quotedSpans(w8)[0]) !== null);
  const w9 = 'you pushed back on the "model is complete" claim there.';
  ok('determiner + span + head noun IS an attributive name',
    studentAttributedTrigger(w9, quotedSpans(w9)[0]) === null);
  const w10 = 'you pushed back on the "model is complete" when it mattered.';
  ok('…but the same determiner with a FUNCTION word after is a citation',
    studentAttributedTrigger(w10, quotedSpans(w10)[0]) !== null);
  const w7 = 'It is fine. A model that predicts "X" scores well.';
  ok('the previous sentence\'s trigger does not reach across a sentence boundary',
    studentAttributedTrigger('You wrote it. A model that predicts "X" scores well.',
      quotedSpans('You wrote it. A model that predicts "X" scores well.')[0]) === null && w7 === w7);
}
ok('citationIsVerbatim: empty span is vacuously true', citationIsVerbatim('', 'anything'));
ok('citationIsVerbatim: a plain miss is false', !citationIsVerbatim('zzz', 'anything'));

console.log('── (6) sanitizeAfmWrapper: the SHAPE cut, and the beat it must stop eating ──');
// 🔴 THE REGRESSION THIS FILE EXISTS FOR. The system prompt tells the model to name "the worked
// answer below"; the old phrase cut deleted any line after a newline that did.
{
  const w = 'You treated the training data as a strength; it is the model\'s blind spot.\n\n' +
            'Start by reading **Training-data limitations** in the worked answer below, then apply ' +
            'the same lens to a fresh scenario.';
  ok('the pointer beat survives (it names "the worked answer below")', sanitizeAfmWrapper(w) === w);
  ok('…and the pointer is still findable in the sanitized text',
    sanitizeAfmWrapper(w).includes('Training-data limitations'));
}
{
  // The exact shape of the pre-fix defect, transcribed: cut 397 → 279 and the pointer lost.
  const LEGACY = (raw: string) => {
    let x = raw;
    const hr = x.search(/\n[ \t]*([-*_]){3,}[ \t]*(\n|$)/);
    if (hr !== -1) x = x.slice(0, hr);
    const b = x.search(/\n[^\n]*(worked answer|investment appraisal|^\s*\*\*(step|1[.)]))/im);
    if (b !== -1) x = x.slice(0, b);
    return x.trimEnd();
  };
  const w = 'Diagnosis paragraph.\n\nStart by reading **Training-data limitations** in the worked ' +
            'answer below, then try a fresh scenario.';
  ok('P-G3: the SHIPPED cut is pinned as the wrong answer',
    LEGACY(w) !== w && !LEGACY(w).includes('Training-data limitations'));
  ok('…and the fixed cut is the right one', sanitizeAfmWrapper(w) === w);
}
// The three pre-existing cases must still cut — all are bold-SHAPED, none needs the phrase list.
ok('still cuts at a stray horizontal rule',
  sanitizeAfmWrapper('Good instinct on MIRR. Try the next one.\n\n---\n\n**WORKED ANSWER**\n\n**1. Tax-')
    === 'Good instinct on MIRR. Try the next one.');
ok('still cuts at a bold "worked answer" heading with no divider',
  sanitizeAfmWrapper('Nicely spotted. Onward.\n\n**Worked answer — Karratha**\n\n**1. Tax')
    === 'Nicely spotted. Onward.');
ok('still cuts at a bold "investment appraisal" heading',
  sanitizeAfmWrapper('Solid start.\n\n**Investment appraisal — internal rate of return**\nAssumptions:')
    === 'Solid start.');
ok('still leaves clean prose (with an em-dash) untouched',
  sanitizeAfmWrapper('You had MIRR right — the trap was inventing the hurdle rate. Try a fresh one.')
    === 'You had MIRR right — the trap was inventing the hurdle rate. Try a fresh one.');
// The shape test generalises past the retired phrase list.
ok('cuts a heading the old phrase list could never have named',
  sanitizeAfmWrapper('Prose.\n\n**Karratha Mining — the full build**\n\nStep 1') === 'Prose.');
ok('cuts a markdown ATX heading',
  sanitizeAfmWrapper('Prose.\n\n## The accuracy claim\n\nbody') === 'Prose.');
ok('cuts a truncated bold opener (the token-cap shape)',
  sanitizeAfmWrapper('Prose.\n\n**WORKED ANSW') === 'Prose.');
ok('cuts a numbered build line', sanitizeAfmWrapper('Prose.\n\n1. Tax depreciation') === 'Prose.');
ok('cuts a "Step N" build line', sanitizeAfmWrapper('Prose.\n\nStep 2 — the WACC') === 'Prose.');

console.log('── (7) isBuildHeadingLine ──');
ok('a bold line that ends a sentence is PROSE, not a heading',
  !isBuildHeadingLine("**Credit where it's due:** you spotted the base-rate trap."));
ok('a wholly bold line is a heading', isBuildHeadingLine('**Worked answer**'));
ok('a wholly bold line with a trailing colon is a heading', isBuildHeadingLine('**Assumptions:**'));
ok('a bold RUN inside prose is not a heading',
  !isBuildHeadingLine('The misconception is **taking the assertions at face value** here.'));
ok('a blank line is not a heading', !isBuildHeadingLine('   '));
ok('a year is not a numbered build line', !isBuildHeadingLine('2008 was a distorted year.'));
ok('the FIRST line is never cut even when heading-shaped',
  sanitizeAfmWrapper('**Worked answer**\n\nbody') === '**Worked answer**\n\nbody');

console.log('── (8) the assembly is unchanged by any of this ──');
const MODEL_ANSWER = '## The accuracy claim\n\nA 94% figure on a 6% base rate is near-worthless.\n\n' +
                     '## Training-data limitations\n\nThe promotion year is unrepresentative.';
{
  const body = assembleAfmReveal('A framing wrapper.', MODEL_ANSWER);
  ok('assembleAfmReveal still tails the artefact verbatim', body.endsWith(MODEL_ANSWER));
  ok('sanitizing is idempotent after the quotation check',
    sanitizeAfmWrapper(sanitizeAfmWrapper('Prose.\n\n**Worked answer**\n\nx'))
      === sanitizeAfmWrapper('Prose.\n\n**Worked answer**\n\nx'));
}
{
  // An unquoting must never change the artefact, and must never change the wrapper's length by
  // more than two characters per removal.
  const w = 'you treated them as strengths that "keep the set clean" here.';
  const r = enforceVerbatimQuotation(w, SEED_B);
  ok('exactly two characters removed per unquoting', r.text.length === w.length - 2);
  ok('the removal is reported with its trigger', r.removed[0].trigger.toLowerCase().includes('you'));
  ok('the denominator is reported', r.quotedTotal === 1 && r.checked === 1);
}
ok('a wrapper with no quotes round-trips byte-identical',
  enforceVerbatimQuotation('Plain prose with no marks at all.', SEED_B).text
    === 'Plain prose with no marks at all.');
ok('an empty wrapper degrades to empty, never throws',
  enforceVerbatimQuotation('', SEED_B).text === '');
ok('an empty attempt does not crash and flags a student-attributed span',
  enforceVerbatimQuotation('you wrote that it "X" here', '').removed.length === 1);

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
