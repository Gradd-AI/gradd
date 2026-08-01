// scripts/test-teach-demand.ts — fixtures for the teaching-loop taxonomy fence.
// Pure: no DB, no model, no network. Run: npm run test:teach-demand
//
// P-G3: the break modes are NAMED. Each assertion below states what defect it would catch if the
// fence regressed, so a future edit that "simplifies" describeDemand fails loudly rather than
// silently reintroducing the leak.

import {
  describeDemand, isTaxonomyFree, TAXONOMY_TOKENS, REGISTERED_VERBS, REGISTERED_LEVELS,
} from '../lib/acca/teach-demand';

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

// ── The detector itself must work, or every count above is meaningless ───────
// Same lesson as the register sweep whose printer had never executed: a clean result from an
// unexercised detector is not a result.
ok('isTaxonomyFree CATCHES a known-bad string',
  !isTaxonomyFree('At ACCA intellectual level 3, where calculate sits'));
ok('isTaxonomyFree catches every token it declares',
  TAXONOMY_TOKENS.every((t) => !isTaxonomyFree(`prefix ${t} suffix`)));
ok('isTaxonomyFree passes clean prose', isTaxonomyFree('Work the figures and then say what they mean for the board.'));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} teach-demand: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
