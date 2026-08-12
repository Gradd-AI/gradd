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
  ledgerActionsFor,
  shouldResolveWeakness,
  psScore,
  isWeakSkillBand,
  selectionBoost,
  pickWeighted,
  MAX_WEAKNESS_SCORE,
  W_WEAK,
  W_PS,
  NO_SIGNALS,
  drillBandFor,
  drillLedgerAction,
  SOURCE_WEIGHT,
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

// ── 2. What a marked case does to the ledger ────────────────────────────────
line('\n  2. WHAT A MARKED CASE OPENS');
const opensOf = (reqs: Parameters<typeof ledgerActionsFor>[0]) => ledgerActionsFor(reqs).opens;
const closesOf = (reqs: Parameters<typeof ledgerActionsFor>[0]) =>
  ledgerActionsFor(reqs).closes.map((c) => c.lo_code);

eq('a strong-only case opens nothing',
  opensOf([
    { requirement_id: 'r1', lo_code: 'E3a', band: 'strong' },
    { requirement_id: 'r2', lo_code: 'B1a', band: 'exemplary' },
  ]), []);

eq('a weak requirement opens one row',
  opensOf([{ requirement_id: 'r1', lo_code: 'E3a', band: 'weak' }]),
  [{ lo_code: 'E3a', band: 'weak', case_id: '', requirement_id: 'r1' }]);

eq('a blank (nothing) requirement opens NO row',
  opensOf([{ requirement_id: 'r1', lo_code: 'E3a', band: 'nothing' }]), []);

eq('a requirement with no lo_code opens no row (the ledger is keyed by LO)',
  opensOf([{ requirement_id: 'r1', lo_code: null, band: 'weak' }]), []);

eq('an empty-string lo_code opens no row',
  opensOf([{ requirement_id: 'r1', lo_code: '   ', band: 'weak' }]), []);

// The open-row unique key is (user, paper, lo, source) — two requirements on ONE lo are one
// finding, and the worse band must win regardless of which order they arrive in.
eq('two requirements on the same LO collapse to one row, worse band wins (competent then weak)',
  opensOf([
    { requirement_id: 'r1', lo_code: 'E3a', band: 'competent' },
    { requirement_id: 'r2', lo_code: 'E3a', band: 'weak' },
  ]),
  [{ lo_code: 'E3a', band: 'weak', case_id: '', requirement_id: 'r2' }]);

eq('...and in the other order too (weak then competent)',
  opensOf([
    { requirement_id: 'r1', lo_code: 'E3a', band: 'weak' },
    { requirement_id: 'r2', lo_code: 'E3a', band: 'competent' },
  ]),
  [{ lo_code: 'E3a', band: 'weak', case_id: '', requirement_id: 'r1' }]);

eq('different LOs produce different rows',
  opensOf([
    { requirement_id: 'r1', lo_code: 'E3a', band: 'weak' },
    { requirement_id: 'r2', lo_code: 'B1a', band: 'competent' },
  ]).map((w) => `${w.lo_code}:${w.band}`),
  ['E3a:weak', 'B1a:competent']);

// A realistic 8-requirement paper: mixed bands, one blank, two on the same LO.
const PAPER = [
  { requirement_id: 'a1', lo_code: 'B1a', band: 'strong' },
  { requirement_id: 'a2', lo_code: 'B3e', band: 'competent' },
  { requirement_id: 'a3', lo_code: 'E2b', band: 'weak' },
  { requirement_id: 'a4', lo_code: 'B5b', band: 'nothing' },
  { requirement_id: 'b1', lo_code: 'B3e', band: 'weak' },
  { requirement_id: 'b2', lo_code: 'C1a', band: 'exemplary' },
  { requirement_id: 'b3', lo_code: 'E3a', band: 'competent' },
  { requirement_id: 'b4', lo_code: 'D2a', band: 'strong' },
];
eq('an 8-requirement paper opens one row per distinct weak/competent LO',
  opensOf(PAPER).map((w) => `${w.lo_code}:${w.band}`),
  ['B3e:weak', 'E2b:weak', 'E3a:competent']);
eq('...and closes every distinct strong/exemplary LO',
  closesOf(PAPER).sort(), ['B1a', 'C1a', 'D2a']);

// ── 2b. What a marked case CLOSES (the resolved_at writer) ──────────────────
line('\n  2b. WHAT A MARKED CASE RESOLVES');
ok("'strong' resolves", shouldResolveWeakness('strong'));
ok("'exemplary' resolves", shouldResolveWeakness('exemplary'));
// THE BOUNDARY. 'competent' is the band whose own next action says a material point was
// missed — a material point still missing is not a resolved weakness.
ok("'competent' does NOT resolve (its own next action names something still to fix)",
  !shouldResolveWeakness('competent'));
ok("'weak' does not resolve", !shouldResolveWeakness('weak'));
// And 'nothing' resolves nothing either — it opens no row AND closes none.
ok("'nothing' does not resolve", !shouldResolveWeakness('nothing'));
ok('null does not resolve', !shouldResolveWeakness(null));
ok('an unknown band does not resolve', !shouldResolveWeakness('mastered'));

eq('a strong requirement closes its LO',
  closesOf([{ requirement_id: 'r1', lo_code: 'E3a', band: 'strong' }]), ['E3a']);
eq('an exemplary requirement closes its LO',
  closesOf([{ requirement_id: 'r1', lo_code: 'E3a', band: 'exemplary' }]), ['E3a']);
eq('a nothing-band requirement closes nothing',
  closesOf([{ requirement_id: 'r1', lo_code: 'E3a', band: 'nothing' }]), []);
eq('a strong requirement with no lo_code closes nothing',
  closesOf([{ requirement_id: 'r1', lo_code: null, band: 'strong' }]), []);
eq('two strong requirements on one LO close it once',
  closesOf([
    { requirement_id: 'r1', lo_code: 'E3a', band: 'strong' },
    { requirement_id: 'r2', lo_code: 'E3a', band: 'exemplary' },
  ]), ['E3a']);

// OPEN BEATS CLOSE — the precedence rule, in BOTH arrival orders. A paper that examines one
// LO twice can come back weak on one and strong on the other; resolving on the strength of
// the good half would erase the finding the same paper just produced.
const mixedA = ledgerActionsFor([
  { requirement_id: 'r1', lo_code: 'E3a', band: 'strong' },
  { requirement_id: 'r2', lo_code: 'E3a', band: 'weak' },
]);
eq('same LO weak+strong: the row OPENS (strong first)', mixedA.opens.map((o) => o.lo_code), ['E3a']);
eq('same LO weak+strong: and is NOT closed (strong first)', mixedA.closes, []);
const mixedB = ledgerActionsFor([
  { requirement_id: 'r1', lo_code: 'E3a', band: 'weak' },
  { requirement_id: 'r2', lo_code: 'E3a', band: 'strong' },
]);
eq('same LO weak+strong: the row OPENS (weak first)', mixedB.opens.map((o) => o.lo_code), ['E3a']);
eq('same LO weak+strong: and is NOT closed (weak first)', mixedB.closes, []);
// Competent + strong on one LO opens too — competent is an open band, and open beats close.
const mixedC = ledgerActionsFor([
  { requirement_id: 'r1', lo_code: 'E3a', band: 'competent' },
  { requirement_id: 'r2', lo_code: 'E3a', band: 'strong' },
]);
eq('same LO competent+strong: opens, does not close',
  [mixedC.opens.map((o) => o.lo_code), mixedC.closes], [['E3a'], []]);
// A DIFFERENT LO going strong in the same paper is unaffected by the open elsewhere.
const mixedD = ledgerActionsFor([
  { requirement_id: 'r1', lo_code: 'E3a', band: 'weak' },
  { requirement_id: 'r2', lo_code: 'B1a', band: 'strong' },
]);
eq('an open on one LO does not block a close on another',
  [mixedD.opens.map((o) => o.lo_code), mixedD.closes.map((c) => c.lo_code)], [['E3a'], ['B1a']]);

// ── 2c. CLOSE THEN REOPEN — the whole point of the partial unique index ─────
// The sequence a real student produces across three sittings. Each call is one marked paper;
// the DB behaviour that makes it work (a resolved row not blocking a fresh open one) is
// exercised against the live index in scripts/_verify_afm_sit_serve.ts, because an index is
// not something a pure fixture can prove.
line('\n  2c. CLOSE THEN REOPEN');
const sitting1 = ledgerActionsFor([{ requirement_id: 'r1', lo_code: 'E3a', band: 'weak' }]);
const sitting2 = ledgerActionsFor([{ requirement_id: 'r2', lo_code: 'E3a', band: 'strong' }]);
const sitting3 = ledgerActionsFor([{ requirement_id: 'r3', lo_code: 'E3a', band: 'weak' }]);
eq('sitting 1 (weak) opens E3a and closes nothing',
  [sitting1.opens.map((o) => o.lo_code), sitting1.closes], [['E3a'], []]);
eq('sitting 2 (strong) closes E3a and opens nothing',
  [sitting2.opens, sitting2.closes.map((c) => c.lo_code)], [[], ['E3a']]);
eq('sitting 3 (regressed to weak) opens E3a AGAIN',
  [sitting3.opens.map((o) => o.lo_code), sitting3.closes], [['E3a'], []]);
// The steering consequence, end to end: a resolved row is not read (the selector queries
// `resolved_at IS NULL`), so after sitting 2 the area stops pulling — and after sitting 3 it
// pulls again at full strength.
eq('a closed area no longer steers (the selector reads open rows only)',
  weaknessScore('E3a', []), 0);
eq('and the reopened row steers again', weaknessScore('E3a', [row('E3a', 'weak')]), 1);

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

// ═════════════════════════════════════════════════════════════════════════════
// 8. THE DRILL PATH (added 2026-08-12)
// ═════════════════════════════════════════════════════════════════════════════
line('\n  8. DRILL PATH — threshold, band mapping, and what closes a row');

// ── 8a. One miss is NOT a weakness ──
// The drill loop is a TEACH loop and a miss is a designed beat of it. Measured over the live
// table when this shipped: 83 of the 115 miss-carrying (user, LO) pairs were a SINGLE miss.
eq('0 misses maps to no band', drillBandFor(0), null);
eq('ONE miss maps to no band — the load-bearing negative', drillBandFor(1), null);
eq('two misses map to competent', drillBandFor(2), 'competent');
eq('three misses map to weak', drillBandFor(3), 'weak');
eq('many misses stay weak (no third band)', drillBandFor(167), 'weak');
ok('a non-finite miss count opens nothing', drillBandFor(NaN as unknown as number) === null);

// ⛔ MUST-FAIL — a threshold of 1. Pinned so lowering it is a deliberate act with a failing
// fixture attached, not a one-character edit.
ok('⛔ MUST-FAIL: a single miss must never produce a band', drillBandFor(1) !== 'competent');

// ── 8b. What a turn does ──
const turn = (outcome: 'correct' | 'miss' | null, missCount: number, resolved = false) =>
  drillLedgerAction({ missCount, resolved, outcome });

eq('a second miss OPENS at competent', turn('miss', 2), { kind: 'open', band: 'competent' });
eq('a third miss OPENS at weak', turn('miss', 3), { kind: 'open', band: 'weak' });
eq('a first miss does nothing', turn('miss', 1), { kind: 'none' });
eq('a correct attempt CLOSES', turn('correct', 5), { kind: 'close' });
eq('a correct attempt closes even with no misses behind it', turn('correct', 0), { kind: 'close' });
// Warm / teach / reveal turns are not scored attempts and must move the ledger neither way.
eq('a non-attempt turn does nothing', turn(null, 9), { kind: 'none' });

// ── 8c. THE DECISIVE ONE: `resolved` does NOT close, and does not open either ──
// acca_tutor_progress.resolved is set on TWO paths in the tutor route: an accepted attempt
// AND an EARNED REVEAL — the student asking for the answer after two misses. Closing on it
// would resolve a weakness at the exact moment a struggling student gave up.
eq('a resolved drill missing again opens nothing (stuckDrills predicate, verbatim)',
  turn('miss', 4, true), { kind: 'none' });
ok('⛔ MUST-FAIL: `resolved` is not a close — only an outcome=correct is',
  turn('miss', 4, true).kind !== 'close');
// The failure this prevents, stated as a case: a student misses twice, asks for the answer
// (resolved := true via the reveal), and misses a third time. Nothing may be CLOSED by that.
ok('the earned-reveal sequence never closes a row',
  [turn('miss', 2), turn('miss', 3, true), turn('miss', 4, true)]
    .every((a) => a.kind !== 'close'));

// ── 8d. SOURCE_WEIGHT is explicit, and a sit outweighs a stuck drill ──
line('\n  8d. SOURCE_WEIGHT');
const drillRow = (lo: string, band: string, occ = 1): WeakAreaRow =>
  ({ lo_code: lo, band, occurrence_count: occ, source: 'drill' });

eq('sit weight is 1', SOURCE_WEIGHT.sit, 1);
eq('drill weight is 0.6', SOURCE_WEIGHT.drill, 0.6);
ok('a sit row outscores a drill row of the SAME band and count',
  weaknessScore('E3a', [row('E3a', 'weak')]) > weaknessScore('E3a', [drillRow('E3a', 'weak')]),
  `sit=${weaknessScore('E3a', [row('E3a', 'weak')])} drill=${weaknessScore('E3a', [drillRow('E3a', 'weak')])}`);
eq('a drill weak row scores 0.6 of a sit one', weaknessScore('E3a', [drillRow('E3a', 'weak')]), 0.6);
eq('a drill competent row scores 0.3', weaknessScore('E3a', [drillRow('E3a', 'competent')]), 0.3);
// A row with NO source is every row written before 2026-08-12 — it must keep scoring as a sit.
eq('a source-less row still scores as a sit (no silent devaluation of history)',
  weaknessScore('E3a', [{ lo_code: 'E3a', band: 'weak', occurrence_count: 1 }]), 1);
eq('an unknown source falls back to the sit weight rather than zeroing the row',
  weaknessScore('E3a', [{ lo_code: 'E3a', band: 'weak', occurrence_count: 1, source: 'mystery' }]), 1);

// MAX takes precedence over SUM — the property that stops a sit row and a drill row on one
// LO compounding into a score no single finding could reach.
eq('a sit row and a drill row on the SAME LO do not compound — the sit wins outright',
  weaknessScore('E3a', [row('E3a', 'weak'), drillRow('E3a', 'weak')]), 1);
ok('⛔ MUST-FAIL: they would sum to 1.6 if the rule were addition',
  weaknessScore('E3a', [row('E3a', 'weak'), drillRow('E3a', 'weak')]) !== 1.6);
eq('the ceiling is still the SIT ceiling', MAX_WEAKNESS_SCORE, 2);
ok('a maxed-out DRILL row cannot reach the ceiling',
  weaknessScore('E3a', [drillRow('E3a', 'weak', 9)]) < MAX_WEAKNESS_SCORE,
  `drill max=${weaknessScore('E3a', [drillRow('E3a', 'weak', 9)])}`);
eq('a maxed-out drill row scores 1.2 (0.6 × the 2× occurrence cap)',
  weaknessScore('E3a', [drillRow('E3a', 'weak', 9)]), 1.2);

// The sub-area half-pull still applies on top of the source weight, in that order.
eq('a drill row reaches a sibling LO at half its own pull',
  weaknessScore('E3b', [drillRow('E3a', 'weak')]), 0.3);
eq('and reaches an unrelated LO not at all', weaknessScore('B1a', [drillRow('E3a', 'weak')]), 0);

// The rollback property must survive the new term: no rows → every candidate still 0.
eq('zero-signal rollback is intact for drill rows too',
  selectionBoost({ lo_code: 'E3a' }, NO_SIGNALS), 0);

rule();
line(`  ${failures === 0 ? `ALL ${checks} CHECKS PASS` : `${failures} of ${checks} CHECKS FAILED`}`);
rule();
process.exitCode = failures === 0 ? 0 : 1;   // P-G4: exitCode, never process.exit()
