// scripts/test-weak-areas.ts   —   npm run test:weak-areas
//
// PURE fixtures for lib/acca/weak-areas.ts: which bands write a ledger row, what a row is
// worth to the selector, and what the selector does with no ledger at all. No DB, no model,
// no network.
//
// P-G3: every failure path here is EXERCISED, not merely described. The cases that matter
// most are the negative ones — 'nothing' writing no row, an unrelated LO scoring zero, and
// the zero-signal rollback — because those are the ones a future change would break
// silently.

import {
  shouldRecordWeakness,
  weaknessScore,
  weaknessWritesFor,
  psScore,
  isWeakSkillBand,
  selectionBoost,
  pickWeighted,
  MAX_WEAKNESS_SCORE,
  W_WEAK,
  W_PS,
  NO_SIGNALS,
  type WeakAreaRow,
  type SelectionSignals,
} from '../lib/acca/weak-areas';

let checks = 0;
let failures = 0;
const line = (t = '') => console.log(t);
const rule = (c = '=') => console.log(c.repeat(100));

function ok(name: string, cond: boolean, detail = '') {
  checks++;
  if (!cond) failures++;
  line(`  ${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}
function eq(name: string, actual: unknown, expected: unknown) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected), `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

const row = (lo: string, band: string, occ = 1): WeakAreaRow =>
  ({ lo_code: lo, band, occurrence_count: occ, source: 'sit' });

rule();
line('  WEAK AREAS — ledger rules + selection steering (pure)');
rule();

// ── 1. Which bands record ────────────────────────────────────────────────────
line('\n  1. WHICH BANDS RECORD A WEAKNESS');
ok("'weak' records", shouldRecordWeakness('weak'));
ok("'competent' records", shouldRecordWeakness('competent'));
ok("'strong' does NOT record", !shouldRecordWeakness('strong'));
ok("'exemplary' does NOT record", !shouldRecordWeakness('exemplary'));
// THE LOAD-BEARING NEGATIVE. 'nothing' is what a BLANK answer scores with no model call;
// treating it as an LO weakness would steer practice on work never attempted.
ok("'nothing' does NOT record (a blank is a pacing finding, not evidence)", !shouldRecordWeakness('nothing'));
ok('null does not record', !shouldRecordWeakness(null));
ok('an unknown band does not record', !shouldRecordWeakness('middling'));

// ── 2. What the writer emits ─────────────────────────────────────────────────
line('\n  2. WHAT A MARKED CASE WRITES');
eq('a strong-only case writes nothing',
  weaknessWritesFor([
    { requirement_id: 'r1', lo_code: 'E3a', band: 'strong' },
    { requirement_id: 'r2', lo_code: 'B1a', band: 'exemplary' },
  ]), []);

eq('a weak requirement writes one row',
  weaknessWritesFor([{ requirement_id: 'r1', lo_code: 'E3a', band: 'weak' }]),
  [{ lo_code: 'E3a', band: 'weak', case_id: '', requirement_id: 'r1' }]);

eq('a blank (nothing) requirement writes NO row',
  weaknessWritesFor([{ requirement_id: 'r1', lo_code: 'E3a', band: 'nothing' }]), []);

eq('a requirement with no lo_code writes no row (the ledger is keyed by LO)',
  weaknessWritesFor([{ requirement_id: 'r1', lo_code: null, band: 'weak' }]), []);

eq('an empty-string lo_code writes no row',
  weaknessWritesFor([{ requirement_id: 'r1', lo_code: '   ', band: 'weak' }]), []);

// The open-row unique key is (user, paper, lo, source) — two requirements on ONE lo are one
// finding, and the worse band must win regardless of which order they arrive in.
eq('two requirements on the same LO collapse to one row, worse band wins (competent then weak)',
  weaknessWritesFor([
    { requirement_id: 'r1', lo_code: 'E3a', band: 'competent' },
    { requirement_id: 'r2', lo_code: 'E3a', band: 'weak' },
  ]),
  [{ lo_code: 'E3a', band: 'weak', case_id: '', requirement_id: 'r2' }]);

eq('...and in the other order too (weak then competent)',
  weaknessWritesFor([
    { requirement_id: 'r1', lo_code: 'E3a', band: 'weak' },
    { requirement_id: 'r2', lo_code: 'E3a', band: 'competent' },
  ]),
  [{ lo_code: 'E3a', band: 'weak', case_id: '', requirement_id: 'r1' }]);

eq('different LOs produce different rows',
  weaknessWritesFor([
    { requirement_id: 'r1', lo_code: 'E3a', band: 'weak' },
    { requirement_id: 'r2', lo_code: 'B1a', band: 'competent' },
  ]).map((w) => `${w.lo_code}:${w.band}`),
  ['E3a:weak', 'B1a:competent']);

// A realistic 8-requirement paper: mixed bands, one blank, two on the same LO.
eq('an 8-requirement paper emits one row per distinct weak/competent LO',
  weaknessWritesFor([
    { requirement_id: 'a1', lo_code: 'B1a', band: 'strong' },
    { requirement_id: 'a2', lo_code: 'B3e', band: 'competent' },
    { requirement_id: 'a3', lo_code: 'E2b', band: 'weak' },
    { requirement_id: 'a4', lo_code: 'B5b', band: 'nothing' },
    { requirement_id: 'b1', lo_code: 'B3e', band: 'weak' },
    { requirement_id: 'b2', lo_code: 'C1a', band: 'exemplary' },
    { requirement_id: 'b3', lo_code: 'E3a', band: 'competent' },
    { requirement_id: 'b4', lo_code: 'D2a', band: 'strong' },
  ]).map((w) => `${w.lo_code}:${w.band}`),
  ['B3e:weak', 'E2b:weak', 'E3a:competent']);

// ── 3. What a row is worth ───────────────────────────────────────────────────
line('\n  3. WHAT AN OPEN ROW IS WORTH TO THE SELECTOR');
eq('exact LO, weak, first sighting', weaknessScore('E3a', [row('E3a', 'weak')]), 1);
eq('exact LO, competent, first sighting', weaknessScore('E3a', [row('E3a', 'competent')]), 0.5);
eq('same sub-area (E3b vs E3a) is half', weaknessScore('E3b', [row('E3a', 'weak')]), 0.5);
eq('an unrelated area scores 0', weaknessScore('B1a', [row('E3a', 'weak')]), 0);
eq('an empty lo_code scores 0', weaknessScore('', [row('E3a', 'weak')]), 0);
eq('case is ignored (e3a matches E3a)', weaknessScore('e3a', [row('E3a', 'weak')]), 1);

eq('repeat sightings escalate (occurrence 2)', weaknessScore('E3a', [row('E3a', 'weak', 2)]), 1.5);
eq('repeat sightings escalate (occurrence 3)', weaknessScore('E3a', [row('E3a', 'weak', 3)]), 2);
eq('escalation is CAPPED (occurrence 10 = occurrence 3)', weaknessScore('E3a', [row('E3a', 'weak', 10)]), MAX_WEAKNESS_SCORE);

eq('rows are MAXed, not summed (three rows in one sub-area do not outrank one exact weak)',
  weaknessScore('E3a', [row('E3b', 'weak'), row('E3c', 'weak'), row('E3d', 'weak')]), 0.5);
eq('the best matching row wins when several match',
  weaknessScore('E3a', [row('E3b', 'weak'), row('E3a', 'competent'), row('B1a', 'weak')]), 0.5);
eq('an exact weak beats a sibling weak',
  weaknessScore('E3a', [row('E3b', 'weak'), row('E3a', 'weak')]), 1);
eq('an empty ledger scores 0', weaknessScore('E3a', []), 0);
// A band that could never have been written still scores nothing if one ever appeared.
eq('an unrecordable band in the ledger contributes nothing', weaknessScore('E3a', [row('E3a', 'strong')]), 0);

// ── 4. Professional skills ───────────────────────────────────────────────────
line('\n  4. PROFESSIONAL-SKILL STEERING');
ok("PS 'weak' is a weak band", isWeakSkillBand('weak'));
ok("PS 'competent' is a weak band", isWeakSkillBand('competent'));
ok("PS 'strong' is not", !isWeakSkillBand('strong'));
eq('a matching tag scores 1', psScore('scepticism', new Set(['scepticism'])), 1);
eq('a non-matching tag scores 0', psScore('commercial_acumen', new Set(['scepticism'])), 0);
eq('a null tag scores 0', psScore(null, new Set(['scepticism'])), 0);
eq('a blank tag scores 0', psScore('  ', new Set(['scepticism'])), 0);
eq('whitespace around a tag still matches', psScore(' scepticism ', new Set(['scepticism'])), 1);
eq('no weak skills → 0', psScore('scepticism', new Set()), 0);

// ── 5. The combined boost ────────────────────────────────────────────────────
line('\n  5. THE COMBINED BOOST');
const signals: SelectionSignals = {
  openWeaknesses: [row('E3a', 'weak', 2), row('B1a', 'competent')],
  weakSkills: new Set(['scepticism']),
};
eq('exact weak LO + matching PS tag',
  selectionBoost({ lo_code: 'E3a', professional_skill_tag: 'scepticism' }, signals),
  W_WEAK * 1.5 + W_PS * 1);
eq('exact weak LO, no PS match',
  selectionBoost({ lo_code: 'E3a', professional_skill_tag: 'commercial_acumen' }, signals),
  W_WEAK * 1.5);
eq('PS match only',
  selectionBoost({ lo_code: 'D1a', professional_skill_tag: 'scepticism' }, signals),
  W_PS * 1);
eq('no match at all', selectionBoost({ lo_code: 'D1a', professional_skill_tag: null }, signals), 0);
ok('the LO term outweighs the PS term at equal strength', W_WEAK > W_PS);

// ── 6. The rollback property ─────────────────────────────────────────────────
// THE SAFETY CASE FOR TURNING THIS ON. A student who has never sat a mock must see exactly
// the previous uniform-random behaviour. Proved over the whole pool, not sampled.
line('\n  6. ZERO SIGNAL IS AN EXACT ROLLBACK TO UNIFORM RANDOM');
const pool = ['A1a', 'B1a', 'B3e', 'C1a', 'D2a', 'E2b', 'E3a', 'E3b']
  .map((lo, i) => ({ id: `d${i}`, lo_code: lo, professional_skill_tag: i % 2 ? 'scepticism' : null }));

const allZero = pool.every((c) => selectionBoost(c, NO_SIGNALS) === 0);
ok('every candidate scores 0 with no signals', allZero);

// With every score equal, pickWeighted's tiebreak is the whole selection — so a uniform rnd
// must reach EVERY candidate, which is what "unchanged behaviour" means.
const reached = new Set<string>();
for (let i = 0; i < pool.length; i++) {
  const p = pickWeighted(pool, (c) => selectionBoost(c, NO_SIGNALS), () => i / pool.length);
  if (p) reached.add(p.id);
}
eq('a uniform rnd reaches every candidate (uniform random pick preserved)', reached.size, pool.length);

// And WITH a signal, the steered candidate is the only one reachable.
const steered: SelectionSignals = { openWeaknesses: [row('E3a', 'weak', 3)], weakSkills: new Set() };
const steerReached = new Set<string>();
for (let i = 0; i < pool.length; i++) {
  const p = pickWeighted(pool, (c) => selectionBoost(c, steered), () => i / pool.length);
  if (p) steerReached.add(p.lo_code);
}
eq('a weak-E3a ledger makes E3a the only pick', [...steerReached], ['E3a']);

// A sub-area signal reaches BOTH E3 drills and nothing else — the sibling rule, end to end.
const subOnly: SelectionSignals = { openWeaknesses: [row('E3z', 'weak', 3)], weakSkills: new Set() };
const subReached = new Set<string>();
for (let i = 0; i < pool.length; i++) {
  const p = pickWeighted(pool, (c) => selectionBoost(c, subOnly), () => i / pool.length);
  if (p) subReached.add(p.lo_code);
}
eq('a sibling-LO signal reaches every E3 drill and nothing else', [...subReached].sort(), ['E3a', 'E3b']);

// ── 7. pickWeighted edges ────────────────────────────────────────────────────
line('\n  7. pickWeighted EDGES');
eq('an empty pool returns null', pickWeighted([], () => 0), null);
eq('a single candidate is returned', pickWeighted([{ id: 'x' }], () => 0)?.id, 'x');
eq('rnd returning exactly 1 does not fall off the end',
  pickWeighted([{ id: 'a' }, { id: 'b' }], () => 0, () => 1)?.id !== undefined, true);
eq('negative scores still rank (a resolved-deprioritised candidate loses)',
  pickWeighted([{ id: 'lo', s: -3 }, { id: 'hi', s: 0 }], (c) => c.s, () => 0)?.id, 'hi');

rule();
line(`  ${failures === 0 ? `ALL ${checks} CHECKS PASS` : `${failures} of ${checks} CHECKS FAILED`}`);
rule();
if (failures) process.exit(1);
