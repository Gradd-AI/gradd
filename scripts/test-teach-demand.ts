// scripts/test-teach-demand.ts — fixtures for the teaching-loop taxonomy fence.
// Pure: no DB, no model, no network. Run: npm run test:teach-demand
//
// P-G3: the break modes are NAMED. Each assertion below states what defect it would catch if the
// fence regressed, so a future edit that "simplifies" describeDemand fails loudly rather than
// silently reintroducing the leak.

import {
  describeDemand, isTaxonomyFree, TAXONOMY_TOKENS, REGISTERED_VERBS, REGISTERED_LEVELS,
  verbResolves, nextMoveContract,
} from '../lib/acca/teach-demand';

// ── THE LIVE CORPUS, SNAPSHOTTED ─────────────────────────────────────────────
// Every distinct `command_verb` on an approved+published `acca_drills` row, with its drill count,
// measured 2026-08-03 (154 live drills, 35 distinct verbs, APM + AFM).
//
// WHY THE SNAPSHOT EXISTS. The suite used to assert the taxonomy fence over `REGISTERED_VERBS` —
// the table's OWN keys. A table is trivially complete over itself, so the assertion was green
// while 68 of those 154 drills carried a verb the table could not resolve. The fixtures could not
// see the hole because they were looking at the wrong denominator.
//
// This list is the RIGHT denominator, and it is committed so the check stays pure (no DB, runs in
// CI). Its one weakness is drift: authoring a batch with a new verb spelling makes the snapshot
// stale without failing anything here. `npm run audit:verb-coverage` is the live counterpart that
// catches exactly that, and the FIX line it prints points back at this constant.
const LIVE_CORPUS_VERBS: ReadonlyArray<readonly [string, number]> = [
  ['assess', 27], ['evaluate', 25], ['advise', 21], ['calculate and evaluate', 13],
  ['apply and evaluate', 7], ['evaluate and advise', 5], ['explain', 5], ['apply and advise', 4],
  ['assess and advise', 4], ['evaluate and recommend', 4], ['assess, value and advise', 3],
  ['forecast', 3], ['assess and recommend', 3], ['prepare', 3],
  ['calculate and evaluate and advise', 2], ['calculate', 2], ['assess and evaluate', 2],
  ['analyse', 2], ['apply', 2], ['explain and advise', 2], ['apply and assess', 1],
  ['evaluate, assess and recommend', 1], ['forecast and advise', 1], ['determine', 1],
  ['evaluate and apply', 1], ['interpret and explain', 1], ['assess and conclude', 1],
  ['evaluate, explain, advise, assess', 1], ['discuss', 1], ['identify and assess', 1],
  ['explain and evaluate', 1], ['evaluate and assess', 1], ['compare and assess', 1],
  ['explain, evaluate and advise', 1], ['identify, distinguish and assess', 1],
];
const CORPUS_DRILLS = LIVE_CORPUS_VERBS.reduce((n, [, c]) => n + c, 0);

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\nteach-demand — the taxonomy fence\n');

// ── BREAK MODE 1: the raw taxonomy reaches the prompt ────────────────────────
// This is the defect measured on 2026-08-01 (two sightings, two cases). Asserted over the WHOLE
// table, not a sample: every verb × every level.
let leaks = 0;
for (const v of REGISTERED_VERBS) {
  for (const l of REGISTERED_LEVELS) {
    const d = describeDemand(v, l);
    if (!isTaxonomyFree(d)) { leaks++; console.log(`       leak: verb=${v} level=${l} → ${d}`); }
  }
}
ok(`no taxonomy token in ANY of ${REGISTERED_VERBS.length} verbs × ${REGISTERED_LEVELS.length} levels`, leaks === 0, `${leaks} leaked`);

// The level NUMBER itself must not survive, in any spelling.
ok('the level number never appears as a bare digit', REGISTERED_LEVELS.every((l) =>
  !new RegExp(`\\b${l}\\b`).test(describeDemand('calculate', l))));

// ── BREAK MODE 2: an unregistered verb falls through raw ─────────────────────
// The tempting fallback is `parts.push(verb)`. That reintroduces the leak for exactly the verbs
// nobody thought about, which is the worst possible coverage.
const weird = describeDemand('discombobulate', 3);
ok('an UNREGISTERED verb is not echoed into the output', !weird.toLowerCase().includes('discombobulate'), weird);
ok('an unregistered verb still yields a usable demand line', weird.length > 20);
ok('an unregistered verb output is taxonomy-free', isTaxonomyFree(weird));

// ── BREAK MODE 3: empty input stops producing an empty string ────────────────
// Callers build their prompt line as `demand ? line : ''`. If this ever returned a placeholder
// instead of '', every requirement with no authored verb would gain a spurious prompt section.
ok('both fields absent → empty string', describeDemand(null, null) === '');
ok('both fields undefined → empty string', describeDemand(undefined, undefined) === '');
ok('verb only still produces a line', describeDemand('evaluate', null).length > 0);
ok('level only still produces a line', describeDemand(null, 3).length > 0);

// ── BREAK MODE 4: the demand stops discriminating depth ──────────────────────
// If levels 2 and 3 ever collapse to the same text the fence still passes the leak test while
// silently destroying the calibration it exists to preserve — a quiet regression.
ok('level 2 and level 3 demand different things', describeDemand('evaluate', 2) !== describeDemand('evaluate', 3));
ok('different verbs demand different things', describeDemand('calculate', 3) !== describeDemand('explain', 3));
ok('level 3 names judgement', /judgement/i.test(describeDemand('evaluate', 3)));
ok('level 2 names application', /application/i.test(describeDemand('evaluate', 2)));

// ── BREAK MODE 5: THE COVERAGE HOLE REOPENS ──────────────────────────────────
// Asserted over the CORPUS, not the table — the check that would have caught the original defect.
// Every live drill's verb must resolve to a real demand; a fallback shrug is a coverage failure,
// not an acceptable degradation, because the leg it feeds is then calibrating against nothing.
let unresolvedVerbs = 0, unresolvedDrills = 0;
for (const [verb, n] of LIVE_CORPUS_VERBS) {
  if (!verbResolves(verb)) { unresolvedVerbs++; unresolvedDrills += n; console.log(`       unresolved: "${verb}" (${n} drills)`); }
}
ok(`every verb in the LIVE corpus resolves — ${LIVE_CORPUS_VERBS.length} verbs / ${CORPUS_DRILLS} drills`,
  unresolvedVerbs === 0, `${unresolvedVerbs} verbs, ${unresolvedDrills} drills fall through`);

// The fallback must still EXIST and still be reachable — proving the corpus passes because every
// verb resolves, not because the fallback silently became indistinguishable from a real demand.
ok('an unknown verb still falls through to the fallback', !verbResolves('discombobulate'));
ok('an empty verb does not resolve', !verbResolves('') && !verbResolves(null));

// Corpus-wide taxonomy sweep: the fence must hold on the strings actually served, not just on
// table keys. 35 verbs × 3 levels.
let corpusLeaks = 0;
for (const [verb] of LIVE_CORPUS_VERBS) {
  for (const l of REGISTERED_LEVELS) {
    if (!isTaxonomyFree(describeDemand(verb, l))) { corpusLeaks++; console.log(`       leak: ${verb} @ ${l}`); }
  }
}
ok(`no taxonomy token across the LIVE corpus × every level`, corpusLeaks === 0, `${corpusLeaks} leaked`);

// ── BREAK MODE 6: a compound collapses to one half ───────────────────────────
// The whole point of registering compounds is that BOTH parts survive and the JOIN is named. A
// composer that silently dropped the tail would still "resolve" and still read fluently.
const cc = describeDemand('calculate and evaluate', 3);
ok('a compound names the FLOOR part', /produce the figures/i.test(cc), cc);
ok('a compound names the MARKS part', /weigh the considerations/i.test(cc), cc);
ok('a compound names the JOIN as the thing tested', /JOIN is what is being tested/i.test(cc), cc);
ok('a compound says doing the floor alone is the easy half', /easy half/i.test(cc), cc);
ok('a 3-part compound puts the LAST verb in the marks position',
  /marks are in what comes after it: give a recommendation/i.test(describeDemand('assess, value and advise', 3)));
ok('a compound differs from either part alone',
  cc !== describeDemand('calculate', 3) && cc !== describeDemand('evaluate', 3));
// A single registered verb must NOT be routed through the compound composer.
ok('a single verb keeps its solo phrasing', !/JOIN is what is being tested/i.test(describeDemand('evaluate', 3)));

// ── BREAK MODE 7: the next-move contract stops discriminating by level ───────
// If levels 2 and 3 ever return the same contract, the level-3 decomposition silently reverts to
// the level-2-sized edit that made a struggling candidate abandon three drills after one attempt.
const l2 = nextMoveContract(2), l3 = nextMoveContract(3);
ok('level 2 and level 3 get DIFFERENT closing contracts', l2 !== l3 && l2.length > 0 && l3.length > 0);
ok('the level-3 contract forbids restating the whole demand', /do not restate/i.test(l3), l3);
ok('the level-3 contract forbids asking for a rebuild/recalculation', /rebuild|recalculate/i.test(l3), l3);
ok('the level-3 contract demands ONE first step of the marks-carrying part', /FIRST concrete step/i.test(l3), l3);
ok('every contract forbids closing on an open question',
  [1, 2, 3].every((l) => /never end on a question/i.test(nextMoveContract(l))));
ok('every next-move contract is taxonomy-free',
  REGISTERED_LEVELS.every((l) => isTaxonomyFree(nextMoveContract(l))));
ok('an unknown level yields an empty contract (callers keep prior behaviour)',
  nextMoveContract(null) === '' && nextMoveContract(undefined) === '' && nextMoveContract(9) === '');

// ── The detector itself must work, or every count above is meaningless ───────
// Same lesson as the register sweep whose printer had never executed: a clean result from an
// unexercised detector is not a result.
ok('isTaxonomyFree CATCHES a known-bad string',
  !isTaxonomyFree('At ACCA intellectual level 3, where calculate sits'));
ok('isTaxonomyFree catches every token it declares',
  TAXONOMY_TOKENS.every((t) => !isTaxonomyFree(`prefix ${t} suffix`)));
ok('isTaxonomyFree passes clean prose', isTaxonomyFree('Work the figures and then say what they mean for the board.'));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} teach-demand: ${pass} passed, ${fail} failed\n`);
process.exitCode = fail === 0 ? 0 : 1;
