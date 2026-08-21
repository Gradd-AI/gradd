// scripts/test-certainty-lint.ts — fixtures for the P-N3 certainty lint.
// Pure: no DB, no model, no network. Run: npm run test:certainty-lint
//
// ── P-G3: THE FAILURE PATHS ARE PROVEN ON SYNTHETIC STRINGS BEFORE THE LINT IS RUN ───
// This lint is ADVISORY, so it can never go red in production and tell us it is broken. A
// lint nobody can see fail is a lint that silently reports zero — which reads exactly like
// a clean corpus. So every one of the 17 ruled terms is driven through its flagging path on
// a synthetic string here, and four plausible-but-wrong implementations are transcribed and
// pinned MUST-FAIL:
//
//   WRONG-1  substring matching with no word boundaries — flags `approved` as "proves" and
//            `commonly` as "only". Both appear in this corpus; both would be pure noise.
//   WRONG-2  whole-TEXT hedge scope — one "may" anywhere in a 900-word reveal suppresses
//            every certainty word in it. This is claim ceiling (c) in its worst form.
//   WRONG-3  case-sensitive matching — misses "Every", "Only", "Absent" at sentence start,
//            which is where an absolute most often sits in this corpus.
//   WRONG-4  a naive split on "." — cuts `COP 4.2 billion` and `55.3%` in half, so the
//            reported sentence is unfindable and the hedge scope is wrong on both halves.
//
// ── WHAT THIS FIXTURE DOES NOT CLAIM ─────────────────────────────────────────────────
// It proves the DETECTOR behaves. It says nothing about whether a hit is a real P-N3 defect
// — that is a human reading against the exhibit, and no fixture can stand in for it.

import {
  CERTAINTY_TERMS,
  HEDGES,
  splitSentences,
  hedgesIn,
  lintCertainty,
  lintDrillCertainty,
  noteFor,
} from '../lib/acca/certainty-lint';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

const terms = (text: string) =>
  lintCertainty(text, 'required_point').filter((h) => !h.hedged).map((h) => h.term);

// ── 1. EVERY RULED TERM FLAGS, UNHEDGED ──────────────────────────────────────────────
// One synthetic sentence per term, each written the way the defect actually appears.
console.log('\n  all 17 ruled terms flag on an unhedged sentence');
const MUST_FLAG: [string, string][] = [
  ['proves', 'The survey proves the board lost confidence in the plan.'],
  ['confirms', 'The consultants report confirms that 55% of mains are unusable.'],
  ['demonstrates', 'Episode B demonstrates a transformational style.'],
  ['ensures', 'Recusal ensures the conflict is removed from the decision.'],
  ['prevents', 'The authority limit prevents a conflicted renewal.'],
  ['no one', 'No one outside finance was told about the revision.'],
  ['every', 'Every renewal over eight years was distorted by that interest.'],
  ['only', 'A tariff increase is the only available lever.'],
  ['absent', 'Absent any competitive check, the retainer is above market.'],
  ['primary', 'The primary driver of the shortfall is the delayed migration.'],
  ['directly', 'Her removal directly followed the hotline submission.'],
  ['certainly', 'The officer has almost certainly lost critical distance.'],
  ['must have', 'The committee must have known the figure was revised.'],
  ['cannot be verified', 'His assertion cannot be verified from inside the group.'],
  ['will fail', 'The bid will fail without the migration budget.'],
  ['will leave', 'Exit will leave the network without a supplier.'],
  ['was shut down', 'The control was shut down before the review began.'],
];
ok('the fixture covers the whole list, with nothing left untested',
  MUST_FLAG.length === CERTAINTY_TERMS.length
  && CERTAINTY_TERMS.every((t) => MUST_FLAG.some(([n]) => n === t.term)));
for (const [term, sentence] of MUST_FLAG) {
  ok(`"${term}" flags`, terms(sentence).includes(term), `got [${terms(sentence).join(', ')}]`);
}
ok('every term carries a note explaining why it is the tell',
  CERTAINTY_TERMS.every((t) => noteFor(t.term).length > 10));

// ── 2. INFLECTIONS FOLD INTO THE CANONICAL TERM ──────────────────────────────────────
// The defect is the certainty claim, not the tense.
console.log('\n  inflections fold into the canonical term');
for (const [word, canon] of [
  ['proved', 'proves'], ['proven', 'proves'], ['prove', 'proves'],
  ['confirmed', 'confirms'], ['demonstrating', 'demonstrates'],
  ['ensured', 'ensures'], ['preventing', 'prevents'], ['absence', 'absent'],
] as const) {
  ok(`"${word}" reports as "${canon}"`,
    terms(`The exhibit ${word} the position beyond argument.`).includes(canon));
}

// ── 3. WRONG-1 — SUBSTRING MATCHING, PINNED MUST-FAIL ────────────────────────────────
// `approved` contains "prove"; `commonly` contains "only"; `improvement` contains "prove".
// All three are ordinary words in this corpus. A boundary-free matcher buries the signal.
console.log('\n  WRONG-1 substring matching is pinned MUST-FAIL');
const NEAR_MISSES = [
  'The board approved the retainer at the March meeting.',
  'The practice is commonly adopted across the sector.',
  'The improvement programme ran for eighteen months.',
  'An absentee director missed four consecutive meetings.',
  'Everyone in the division received the memo.',
];
for (const s of NEAR_MISSES) {
  ok(`no false hit: "${s.slice(0, 38)}…"`, terms(s).length === 0, `got [${terms(s).join(', ')}]`);
}
/** The wrong implementation, transcribed: the stem matched anywhere, word boundaries ignored. */
const WRONG1 = (text: string) =>
  ['prove', 'confirm', 'only', 'absent', 'every'].filter((stem) => text.toLowerCase().includes(stem));
ok('WRONG-1 would flag "approved" and the real lint does not',
  WRONG1('The board approved it.').includes('prove') && terms('The board approved it.').length === 0);
ok('WRONG-1 would flag "commonly" and the real lint does not',
  WRONG1('It is commonly done.').includes('only') && terms('It is commonly done.').length === 0);
ok('WRONG-1 would flag "absentee" and the real lint does not',
  WRONG1('An absentee director.').includes('absent') && terms('An absentee director.').length === 0);

// ── 4. HEDGES SUPPRESS — AND ONLY WITHIN THEIR OWN SENTENCE ──────────────────────────
console.log('\n  a same-sentence hedge suppresses; a neighbouring one does not');
ok('a modal in the same sentence suppresses',
  terms('The survey may prove the board lost confidence.').length === 0);
ok('an exhibit-limit hedge suppresses',
  terms('Management asserts that every renewal was properly made.').length === 0);
ok('"the case is silent" suppresses',
  terms('The case is silent on whether a tariff increase is the only lever.').length === 0);
{
  // WRONG-2: whole-text scope. The hedge is in sentence one; the absolute is in sentence two.
  const text = 'The consultants report may overstate the position. Every renewal was distorted.';
  const hits = lintCertainty(text, 'required_point');
  ok('WRONG-2 whole-text hedge scope is pinned MUST-FAIL — the second sentence still flags',
    hits.filter((h) => !h.hedged).map((h) => h.term).includes('every'));
  ok('and the hedge is not attributed to the sentence that does not contain it',
    hits.filter((h) => h.term === 'every').every((h) => h.hedges.length === 0));
}

// ── 5. HEDGED OCCURRENCES ARE RETURNED, NEVER DISCARDED — CLAIM CEILING (c) ──────────
// Proximity is not attachment. A hedge attached to a different clause suppresses the hit,
// so the suppressed ones must stay visible or the false negative is invisible too.
console.log('\n  hedged occurrences are returned and separately counted');
{
  const text = 'The delay may be temporary, but every hub closure was directed from the centre.';
  const r = lintDrillCertainty({ label: 'synthetic', criteria: [{ id: 'c1', required_point: text }] });
  ok('the hedge suppresses the hit', r.unhedged.length === 0);
  ok('but the occurrence is still returned', r.hits.length > 0);
  ok('and is counted as hedged, not as clean', r.hedged.length === r.hits.length);
  ok('hits.length is never less than unhedged.length', r.hits.length >= r.unhedged.length);
  ok('the suppressing hedge is named on the hit', r.hedged.some((h) => h.hedges.includes('may')));
}

// ── 6. WRONG-3 — CASE SENSITIVITY, PINNED MUST-FAIL ──────────────────────────────────
console.log('\n  WRONG-3 case-sensitive matching is pinned MUST-FAIL');
for (const s of ['Every renewal was distorted.', 'Only a tariff increase remains.',
                 'Absent a competitive check, the price is high.',
                 'Directly after the submission, she was removed.']) {
  ok(`sentence-initial capital still flags: "${s.slice(0, 26)}…"`, terms(s).length > 0);
}
{
  const CS = /\bevery\b/g;   // no `i` flag — the wrong implementation
  ok('WRONG-3 would miss "Every" and the real lint catches it',
    CS.test('Every renewal was distorted.') === false
    && terms('Every renewal was distorted.').includes('every'));
}

// ── 7. WRONG-4 — SENTENCE SPLITTING, PINNED MUST-FAIL ────────────────────────────────
// A naive split on "." cuts every figure in this corpus in half.
console.log('\n  WRONG-4 naive "." splitting is pinned MUST-FAIL');
{
  const text = 'The retainer of COP 4.2 billion is the only contract of its kind. It may be justified.';
  const parts = splitSentences(text);
  ok('a decimal does not split the sentence', parts[0].text.includes('COP 4.2 billion'));
  ok('the corpus figure survives intact', parts.length === 2, `got ${parts.length} parts`);
  const NAIVE = text.split('.');
  ok('WRONG-4 would cut the figure and the real split does not',
    NAIVE.some((p) => p.trim() === '2 billion is the only contract of its kind')
    && parts.every((p) => !p.text.trim().startsWith('2 billion')));
  ok('the unhedged "only" is attributed to the first sentence, not the hedged second',
    lintCertainty(text, 'model_answer').filter((h) => h.term === 'only').every((h) => !h.hedged));
}
{
  const text = 'A: the plan is fixed; B: only one route remains.';
  ok('a semicolon and a colon both terminate a claim', splitSentences(text).length >= 2);
}
{
  const text = '- Every hub was closed.\n- The board may review it.';
  const hits = lintCertainty(text, 'full_reveal');
  ok('a markdown bullet is its own claim, so the neighbour\'s hedge does not reach it',
    hits.filter((h) => h.term === 'every').every((h) => !h.hedged));
}

// ── 8. OFFSETS POINT AT THE MATCH, SO A HIT IS FINDABLE ──────────────────────────────
console.log('\n  offsets locate the match in the original text');
{
  const text = 'The board met in March. Every renewal was distorted by that interest.';
  const h = lintCertainty(text, 'model_answer').find((x) => x.term === 'every')!;
  ok('the offset lands on the matched word', text.slice(h.offset, h.offset + 5) === 'Every');
  ok('the matched text is reported verbatim, preserving case', h.matched === 'Every');
  ok('the sentence is the containing sentence', h.sentence.startsWith('Every renewal'));
}

// ── 9. THE DRILL-LEVEL REPORT ────────────────────────────────────────────────────────
console.log('\n  the drill report separates the three fields');
{
  const r = lintDrillCertainty({
    label: 'SBL-TEST',
    criteria: [
      { id: 'c1', required_point: 'Episode A demonstrates a directive style.' },
      { id: 'c2', required_point: 'The style may have been appropriate.' },
    ],
    model_answer: 'Every hub closure was directed from the centre.',
    full_reveal: 'The candidate confirms the finding and commits.',
  });
  ok('required_point hits carry the criterion id as their locator',
    r.unhedged.some((h) => h.field === 'required_point' && h.locator === 'c1'));
  ok('a hedged criterion contributes nothing to the work list',
    !r.unhedged.some((h) => h.locator === 'c2'));
  ok('model_answer is linted', r.byField.model_answer === 1);
  ok('full_reveal is linted', r.byField.full_reveal === 1);
  ok('required_point is linted', r.byField.required_point === 1);
  ok('byTerm tallies the work list', r.byTerm.every === 1 && r.byTerm.demonstrates === 1);
  ok('a missing field is not an error', lintDrillCertainty({ label: 'x' }).hits.length === 0);
}

// ── 10. IT REPORTS, IT DOES NOT REFUSE ───────────────────────────────────────────────
// The advisory contract, asserted structurally rather than trusted to a comment.
console.log('\n  the advisory contract holds');
{
  const worst = 'Every renewal proves the point and only recusal prevents it; no one dissented.';
  let threw = false;
  let r;
  try { r = lintDrillCertainty({ label: 'worst', model_answer: worst }); } catch { threw = true; }
  ok('a field dense with certainty words does not throw', !threw);
  ok('and the return value carries no pass/fail verdict',
    r !== undefined && !('ok' in r) && !('blocking' in r) && !('passed' in r));
  ok('it found them all the same', (r?.unhedged.length ?? 0) >= 4);
}
ok('the hedge list is non-empty and every entry is case-insensitive and global',
  HEDGES.length > 0 && HEDGES.every((h) => h.flags.includes('i') && h.flags.includes('g')));
ok('hedgesIn deduplicates', hedgesIn('It may be that it may hold.').filter((h) => h === 'may').length === 1);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} certainty-lint: ${pass}/${pass + fail} checks\n`);
// P-G4: never process.exit() — let the runtime flush stdout first.
process.exitCode = fail === 0 ? 0 : 1;
