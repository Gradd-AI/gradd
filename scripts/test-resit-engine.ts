// scripts/test-resit-engine.ts
// Fixtures for the free resit diagnostic's structural engine (lib/acca/resit-engine.ts).
// PURE — no env, no DB, no model, no network. Run: npm run test:resit-engine
//
// WHY THIS FILE EXISTS. resit-engine.ts described itself as "pure and unit-testable" from the
// day it was written and had NO fixture, so it was reachable from no automatic path — the same
// hole doctrine P-G5 closed for 44 other scripts. It was written and proven GREEN against the
// SINGLE-PAPER engine before the paper-keying refactor, then extended here, so what it pins is
// behaviour that already existed rather than behaviour introduced alongside the change. P-G3:
// it was also proven to FAIL — two deliberate breaks (a shifted score boundary and an inverted
// rating sort) produced 4 distinct failures and exit 1 before the engine was restored.
//
// THE RULE THAT MATTERS MOST is the cross-paper one. AFM and APM lo_code prefixes COLLIDE
// EXACTLY — A3, B1, B2, B3, B4 are live in both papers, and APM's B1 (budgetary control) is a
// different subject from AFM's B1 (discounted cash flow). A group id accepted against the wrong
// paper does not 404; it silently serves the other paper's drills.

import {
  TOPIC_GROUPS_BY_PAPER,
  HABITS_BY_PAPER,
  HABIT_QUESTIONS_BY_PAPER,
  getTopicGroups,
  getTopicGroupIds,
  getHabits,
  getHabitQuestions,
  computeProfile,
  type Rating,
  type ResitInputs,
} from '../lib/acca/resit-engine';
import { ACCA_PAPERS, type AccaPaper } from '../lib/acca/paper';

let failures = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}

function allStrong(paper: AccaPaper): Record<string, 'a' | 'b' | 'c'> {
  const out: Record<string, 'a' | 'b' | 'c'> = {};
  for (const q of getHabitQuestions(paper)) out[q.habit] = 'c';
  return out;
}

function inputs(paper: AccaPaper, over: Partial<ResitInputs> = {}): ResitInputs {
  return {
    score: 42,
    sitting: 'Jun 2026',
    attempts: 1,
    topic_ratings: {},
    habit_answers: allStrong(paper),
    ...over,
  };
}

// ── Shape invariants, both papers ────────────────────────────────────────────
console.log('\n-- data constants: shape, per paper --');
ok('both papers keyed in TOPIC_GROUPS_BY_PAPER',
  ACCA_PAPERS.every((p) => Array.isArray(TOPIC_GROUPS_BY_PAPER[p])));
ok('both papers keyed in HABITS_BY_PAPER',
  ACCA_PAPERS.every((p) => typeof HABITS_BY_PAPER[p] === 'object'));
ok('both papers keyed in HABIT_QUESTIONS_BY_PAPER',
  ACCA_PAPERS.every((p) => Array.isArray(HABIT_QUESTIONS_BY_PAPER[p])));

for (const paper of ACCA_PAPERS) {
  const groups = getTopicGroups(paper);
  const questions = getHabitQuestions(paper);
  const habits = getHabits(paper);
  const ids = getTopicGroupIds(paper);

  ok(`${paper}: at least one topic group`, groups.length > 0, `${groups.length}`);
  ok(`${paper}: group ids are unique`, new Set(groups.map((g) => g.id)).size === groups.length);
  ok(`${paper}: every group has a label and a hint`,
    groups.every((g) => g.label.length > 0 && g.hint.length > 0));
  ok(`${paper}: every group carries at least one lo_code prefix`,
    groups.every((g) => g.prefixes.length > 0));
  ok(`${paper}: no group carries a duplicate prefix internally`,
    groups.every((g) => new Set(g.prefixes).size === g.prefixes.length));
  ok(`${paper}: no prefix is claimed by two groups`,
    new Set(groups.flatMap((g) => g.prefixes)).size === groups.flatMap((g) => g.prefixes).length);
  ok(`${paper}: getTopicGroupIds matches the group list`,
    ids.size === groups.length && groups.every((g) => ids.has(g.id)));

  ok(`${paper}: six habit questions`, questions.length === 6, `${questions.length}`);
  ok(`${paper}: every question's habit has a HABITS entry`,
    questions.every((q) => habits[q.habit] !== undefined));
  ok(`${paper}: every HABITS entry carries a label and a fix`,
    Object.values(habits).every((h) => h.label.length > 0 && h.fix.length > 0));
  ok(`${paper}: every HABITS entry's id matches its key`,
    Object.entries(habits).every(([k, h]) => h.id === k));
  ok(`${paper}: question habits are unique`,
    new Set(questions.map((q) => q.habit)).size === questions.length);
  ok(`${paper}: every question offers exactly a/b/c`,
    questions.every((q) => q.options.map((o) => o.value).join('') === 'abc'));
  ok(`${paper}: option scores are exactly 2/1/0 in a/b/c order`,
    questions.every((q) => q.options.map((o) => o.score).join('') === '210'));
  ok(`${paper}: every option has text`,
    questions.every((q) => q.options.every((o) => o.text.trim().length > 0)));
  ok(`${paper}: every prompt is non-empty`, questions.every((q) => q.prompt.trim().length > 0));
}

// ── Score banding ────────────────────────────────────────────────────────────
console.log('\n-- score band (pass is 50; a fail is 0-49) --');
const band = (s: number) => computeProfile('APM', inputs('APM', { score: s })).score_band;
ok('49 is narrow', band(49) === 'narrow');
ok('45 is narrow (boundary)', band(45) === 'narrow');
ok('44 is moderate (boundary)', band(44) === 'moderate');
ok('35 is moderate (boundary)', band(35) === 'moderate');
ok('34 is broad (boundary)', band(34) === 'broad');
ok('0 is broad', band(0) === 'broad');
ok('banding is paper-independent',
  computeProfile('AFM', inputs('AFM', { score: 45 })).score_band === 'narrow');

// ── Ranking rules ────────────────────────────────────────────────────────────
console.log('\n-- weak groups: what is kept, and in what order --');
{
  const g = getTopicGroups('APM');
  const p = computeProfile('APM', inputs('APM', {
    topic_ratings: { [g[0].id]: 'mixed', [g[1].id]: 'weak', [g[2].id]: 'ok', [g[3].id]: 'weak' } as Record<string, Rating>,
  }));

  ok('an "ok" rating is dropped entirely', !p.weak_groups.some((w) => w.id === g[2].id));
  ok('un-rated groups are dropped', p.weak_groups.length === 3, `${p.weak_groups.length}`);
  ok('weak ranks above mixed', p.weak_groups[0].rating === 'weak' && p.weak_groups[2].rating === 'mixed');
  ok('ties inside a rating keep group order (stable)',
    p.weak_groups[0].id === g[1].id && p.weak_groups[1].id === g[3].id);
  ok('weak_groups never contains "ok"', p.weak_groups.every((w) => w.rating !== 'ok'));
  ok('prefixes are flattened in rank order', p.weak_prefixes[0] === g[1].prefixes[0]);
  ok('prefixes are de-duped', new Set(p.weak_prefixes).size === p.weak_prefixes.length);
}

console.log('\n-- no ratings at all --');
{
  const p = computeProfile('AFM', inputs('AFM'));
  ok('no ratings gives no weak groups', p.weak_groups.length === 0);
  ok('no ratings gives no prefixes', p.weak_prefixes.length === 0);
}

console.log('\n-- habits: severity, ranking, and the 0 floor --');
{
  const qs = getHabitQuestions('AFM');
  const a = allStrong('AFM');
  a[qs[0].habit] = 'b'; // severity 1
  a[qs[1].habit] = 'a'; // severity 2
  a[qs[2].habit] = 'c'; // severity 0 -> dropped

  const p = computeProfile('AFM', inputs('AFM', { habit_answers: a }));
  ok('a "c" answer is not flagged', !p.habits.some((h) => h.id === qs[2].habit));
  ok('two habits flagged', p.habits.length === 2, `${p.habits.length}`);
  ok('severity 2 ranks above severity 1', p.habits[0].severity === 2 && p.habits[1].severity === 1);
  ok('the severity-2 habit is the one answered "a"', p.habits[0].id === qs[1].habit);
  ok('every flagged habit carries its fix', p.habits.every((h) => h.fix.length > 0));
  ok('severity is never 0 in the output', p.habits.every((h) => h.severity >= 1));
}

console.log('\n-- all-worst and all-best --');
{
  const worst: Record<string, 'a' | 'b' | 'c'> = {};
  for (const q of getHabitQuestions('AFM')) worst[q.habit] = 'a';
  const pw = computeProfile('AFM', inputs('AFM', { habit_answers: worst }));
  ok('all-worst flags all six at severity 2',
    pw.habits.length === 6 && pw.habits.every((h) => h.severity === 2));
  ok('all-best flags nothing', computeProfile('AFM', inputs('AFM')).habits.length === 0);
}

// ── Determinism ──────────────────────────────────────────────────────────────
console.log('\n-- determinism --');
{
  const g = getTopicGroups('AFM');
  const qs = getHabitQuestions('AFM');
  const a = allStrong('AFM');
  a[qs[0].habit] = 'a';
  const i = inputs('AFM', { topic_ratings: { [g[0].id]: 'weak' } as Record<string, Rating>, habit_answers: a });
  ok('same inputs give an identical profile',
    JSON.stringify(computeProfile('AFM', i)) === JSON.stringify(computeProfile('AFM', i)));
}

// ── THE CROSS-PAPER RULE ─────────────────────────────────────────────────────
console.log('\n-- cross-paper: the collision, and the refusal --');
{
  const apmIds = getTopicGroupIds('APM');
  const afmIds = getTopicGroupIds('AFM');
  const sharedIds = [...apmIds].filter((id) => afmIds.has(id));
  ok('the two papers share NO topic group id', sharedIds.length === 0, sharedIds.join(',') || 'none');

  const apmPrefixes = new Set(getTopicGroups('APM').flatMap((g) => g.prefixes));
  const afmPrefixes = new Set(getTopicGroups('AFM').flatMap((g) => g.prefixes));
  const collide = [...apmPrefixes].filter((p) => afmPrefixes.has(p)).sort();
  ok('lo_code prefixes DO collide across papers (the hazard this guards)',
    collide.length > 0, collide.join(','));

  const apmOnly = getTopicGroups('APM')[0].id;
  const p = computeProfile('AFM', inputs('AFM', {
    topic_ratings: { [apmOnly]: 'weak' } as Record<string, Rating>,
  }));
  ok('an APM group id scored against AFM yields no weak group', p.weak_groups.length === 0);
  ok('an APM group id scored against AFM yields no prefixes', p.weak_prefixes.length === 0);

  const afmOnly = getTopicGroups('AFM')[0].id;
  const q = computeProfile('APM', inputs('APM', {
    topic_ratings: { [afmOnly]: 'weak' } as Record<string, Rating>,
  }));
  ok('an AFM group id scored against APM yields no weak group', q.weak_groups.length === 0);

  // A colliding PREFIX must still resolve through the paper's own group, never the other's.
  const afmB1 = getTopicGroups('AFM').find((g) => g.prefixes.includes('B1'))!;
  const apmB1 = getTopicGroups('APM').find((g) => g.prefixes.includes('B1'))!;
  ok('B1 is a live prefix in BOTH papers', !!afmB1 && !!apmB1);
  ok('B1 means different things in each paper', afmB1.label !== apmB1.label,
    `${afmB1.label} vs ${apmB1.label}`);
  const r = computeProfile('AFM', inputs('AFM', { topic_ratings: { [afmB1.id]: 'weak' } as Record<string, Rating> }));
  ok('AFM B1 resolves to the AFM group', r.weak_groups[0].label === afmB1.label);

  // Habit ids are disjoint too — an APM habit answer must not score under AFM.
  const apmHabits = new Set(getHabitQuestions('APM').map((x) => x.habit));
  const afmHabits = new Set(getHabitQuestions('AFM').map((x) => x.habit));
  ok('the two papers share NO habit id',
    [...apmHabits].filter((h) => afmHabits.has(h)).length === 0);
  const crossed: Record<string, 'a' | 'b' | 'c'> = allStrong('AFM');
  crossed['pacing'] = 'a'; // an APM habit, worst answer
  ok('an APM habit answered "a" does not flag under AFM',
    computeProfile('AFM', inputs('AFM', { habit_answers: crossed })).habits.length === 0);
}

// ── Unknown ids contribute nothing ───────────────────────────────────────────
console.log('\n-- unknown ids --');
{
  const p = computeProfile('AFM', inputs('AFM', { topic_ratings: { not_a_group: 'weak' } as Record<string, Rating> }));
  ok('an unknown group id yields no weak group', p.weak_groups.length === 0);
  ok('an unknown group id yields no prefixes', p.weak_prefixes.length === 0);

  const a = allStrong('AFM');
  a['not_a_habit'] = 'a';
  ok('an unknown habit id is not flagged',
    computeProfile('AFM', inputs('AFM', { habit_answers: a })).habits.length === 0);
}

// ── AFM corpus rulings ───────────────────────────────────────────────────────
console.log('\n-- AFM: the corpus rulings --');
{
  const afm = getTopicGroups('AFM');
  const prefixes = afm.flatMap((g) => g.prefixes);
  ok('AFM offers exactly eight groups', afm.length === 8, `${afm.length}`);
  ok('AFM offers no section C group (zero published C drills)',
    !prefixes.some((p) => p.startsWith('C')));
  ok('AFM offers no section D group (zero published D drills)',
    !prefixes.some((p) => p.startsWith('D')));
  ok('AFM offers NO section A group at all (isDirectLinkOnlyArea excludes every AFM "A" lo_code)',
    !prefixes.some((p) => p.startsWith('A')));
  ok('AFM covers the B-section spine', ['B1', 'B2', 'B3', 'B4', 'B5'].every((p) => prefixes.includes(p)));
  ok('AFM covers the E-section spine', ['E1', 'E2', 'E3'].every((p) => prefixes.includes(p)));

  const habitIds = getHabitQuestions('AFM').map((q) => q.habit);
  ok('AFM does NOT carry a pacing habit (no AFM examiner-report evidence)',
    !habitIds.includes('pacing'));
  ok('AFM leads on own-figure carry (F9) — the strongest, uniquely-AFM mode',
    habitIds[0] === 'own_figures');
  ok('AFM carries exactly the six ruled modes',
    habitIds.join(',') === 'own_figures,scenario_repetition,lists_without_development,undeveloped_assumptions,state_the_figure,breadth_and_conclusion');
}

console.log('\n-- APM is unchanged by the refactor --');
{
  const apm = getTopicGroups('APM');
  ok('APM still has ten topic groups', apm.length === 10, `${apm.length}`);
  ok('APM still carries the pacing habit',
    getHabitQuestions('APM').map((q) => q.habit).includes('pacing'));
  ok('APM prefixes are byte-identical to pre-refactor',
    apm.flatMap((g) => g.prefixes).join(',') === 'A3,A4,A1,A2,A5,B1,B2,B3,B4,C1,D1,D2');
  ok('APM group ids are byte-identical to pre-refactor',
    apm.map((g) => g.id).join(',') === 'kpis,strategy,sustainability,budgeting,reward,improvement,complex,reports,tech,data');
  ok('APM habit order is byte-identical to pre-refactor',
    getHabitQuestions('APM').map((q) => q.habit).join(',') === 'describe_vs_apply,verb_object_drift,scepticism,prof_skills,pacing,requirement_planning');
}

console.log(`\n${failures === 0 ? 'ALL RESIT-ENGINE FIXTURES PASS' : `${failures} FIXTURE(S) FAILED`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
