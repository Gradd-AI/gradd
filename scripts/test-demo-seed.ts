// scripts/test-demo-seed.ts
// Unit tests for the demo-org seeder's PURE half (scripts/seed-demo-org.ts).
// PURE — no env, no DB, no model, no clock beyond the module's fixed NOW. Exit 1 on any fail.
//
// Run: npm run test:demo-seed
//
// ── WHY THIS FIXTURE EXISTS ──────────────────────────────────────────────────
// The seeder wrote `drill_id: crypto.randomUUID()` and a guessed `lo_code` for its entire
// life. Nothing caught it, because nothing joined those rows to acca_drills until
// lib/org/queries.ts started doing so — at which point 311 rows carrying 191 `correct`
// outcomes evaluated to nothing and both demo cohorts rendered fully red.
//
// The defect was never in the readiness formula and it was never in the personas. It was
// that THE SEEDER'S OUTPUT WAS NEVER CHECKED AGAINST THE POOL IT CLAIMED TO DRAW FROM.
// T1–T3 below are that check. Importing the seeder is safe: its DB client is lazy and its
// auto-run guard keys on argv[1] containing 'scripts/seed-demo-org'.

import {
  TRAINEES, buildRows, predictBands, assertPool, offlinePool, SUBS,
  cohortMembershipRows, EXCLUDED_ACCOUNTS,
  type DrillPool, type DrillRef,
} from './seed-demo-org';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${cond ? '' : `  ${detail}`}`);
  if (!cond) failures++;
}

const POOL = offlinePool();
const poolIds = new Set([...POOL.values()].flat().map((d) => d.id));
const poolByLo = new Map([...POOL.values()].flat().map((d) => [d.id, d.lo_code] as const));

// ── T1: EVERY emitted drill_id comes from the pool ────────────────────────────
// The single check that would have caught the original defect on the day it shipped.
{
  let attemptRows = 0, progressRows = 0, foreign = 0;
  for (const t of TRAINEES) {
    const r = buildRows(t, POOL);
    attemptRows += r.attempts.length;
    progressRows += r.progress.length;
    for (const a of r.attempts) if (!poolIds.has(a.drill_id)) foreign++;
    for (const p of r.progress) if (!poolIds.has(p.drill_id)) foreign++;
  }
  check('T1a: every attempt + progress drill_id is drawn from the pool', foreign === 0, `${foreign} foreign ids`);
  check('T1b: the seed actually emits rows', attemptRows > 200 && progressRows > 40, `att=${attemptRows} prog=${progressRows}`);
}

// ── T2: lo_code always matches the drill it was drawn from ────────────────────
// A row whose lo_code disagrees with its drill buckets into the wrong sub-area, which is
// how a guessed code ('B2b', 'D1a') lands outside the published pool.
{
  let mismatched = 0;
  for (const t of TRAINEES) {
    for (const a of buildRows(t, POOL).attempts) {
      if (poolByLo.get(a.drill_id) !== a.lo_code) mismatched++;
    }
  }
  check('T2: lo_code equals the drawn drill\'s own lo_code', mismatched === 0, `${mismatched} mismatched`);
}

// ── T3: MUST-FAIL — the shipped pre-fix behaviour (P-G3) ──────────────────────
{
  const LEGACY_drillId = () => crypto.randomUUID();
  const legacyIds = Array.from({ length: 50 }, LEGACY_drillId);
  check('T3: random uuids are pinned as NOT in any pool',
    legacyIds.every((id) => !poolIds.has(id)),
    'a random uuid must never resolve — this is the shipped defect');
}

// ── T4: assertPool refuses a pool that cannot serve the plan ──────────────────
{
  const short: DrillPool = new Map(POOL);
  short.delete('B2');
  let threw = false, msg = '';
  try { assertPool(short); } catch (e) { threw = true; msg = (e as Error).message; }
  check('T4a: a missing sub-area throws', threw);
  check('T4b: the error NAMES the missing sub-area', msg.includes('B2'), msg);
  const empty: DrillPool = new Map(POOL);
  empty.set('D1', [] as DrillRef[]);
  let threw2 = false;
  try { assertPool(empty); } catch { threw2 = true; }
  check('T4c: a PRESENT-but-empty sub-area also throws', threw2);
  let threwOnGood = false;
  try { assertPool(POOL); } catch { threwOnGood = true; }
  check('T4d: a complete pool passes', !threwOnGood);
}

// ── T5: determinism — a re-seed must be diffable, never random ────────────────
{
  const a = TRAINEES.map((t) => buildRows(t, POOL).attempts.map((x) => x.drill_id).join(','));
  const b = TRAINEES.map((t) => buildRows(t, POOL).attempts.map((x) => x.drill_id).join(','));
  check('T5: buildRows is deterministic for a fixed pool', a.join('|') === b.join('|'));
}

// ── T6: the spread is actually mixed ──────────────────────────────────────────
// "Some green, some amber, a couple red." A cohort where everyone is fine shows the
// coordinator nothing, so the mix is a REQUIREMENT and is asserted, not hoped for.
{
  const rows = predictBands(POOL, SUBS.length);
  const tally = { green: 0, amber: 0, red: 0 };
  for (const r of rows) tally[r.res.band]++;
  check('T6a: greens present', tally.green >= 3, JSON.stringify(tally));
  check('T6b: ambers present', tally.amber >= 5, JSON.stringify(tally));
  check('T6c: reds present but not dominant', tally.red >= 3 && tally.red <= 6, JSON.stringify(tally));
  check('T6d: every trainee is banded', tally.green + tally.amber + tally.red === TRAINEES.length);

  // Each cohort must be mixed on its OWN — an org-wide mix with one uniform cohort is
  // still a cohort screen that shows nothing.
  for (const cohort of ['sept', 'dec'] as const) {
    const inC = rows.filter((r) => r.t.cohort === cohort);
    const bands = new Set(inC.map((r) => r.res.band));
    check(`T6e: ${cohort} cohort spans all three bands`, bands.size === 3, [...bands].join(','));
  }
}

// ── T7: the reds arrive by THREE different routes ─────────────────────────────
// An override-only red set cannot show a trainee who is active today and still failing,
// which is the most useful card on the screen and the shape of a real struggling student.
{
  const rows = predictBands(POOL, SUBS.length);
  const reds = rows.filter((r) => r.res.band === 'red');
  const overrides = new Set(reds.map((r) => r.res.override ?? 'on-score'));
  check('T7a: never-started is one route', overrides.has('never-started'), [...overrides].join(','));
  check('T7b: disengaged-21d is one route', overrides.has('disengaged-21d'), [...overrides].join(','));
  check('T7c: at least one red is red ON SCORE, no override', overrides.has('on-score'), [...overrides].join(','));

  const onScore = reds.filter((r) => r.res.override == null);
  check('T7d: the on-score reds are RECENTLY ACTIVE (recency 1.0)',
    onScore.length > 0 && onScore.every((r) => r.res.components.recency.score === 1),
    onScore.map((r) => `${r.t.name}:${r.res.components.recency.score}`).join(' '));
}

// ── T8: only the disengaged persona is stale ──────────────────────────────────
// "Activity across the last 3 weeks, not 59 days ago — so nobody renders as disengaged or
// never-started unless that persona is meant to."
{
  const DAY = 86_400_000;
  let staleNonDisengaged = 0;
  const staleNames: string[] = [];
  for (const t of TRAINEES) {
    if (t.persona === 'disengaged' || t.persona === 'never_started') continue;
    const r = buildRows(t, POOL);
    const stamps = [...r.attempts.map((a) => a.created_at), ...r.progress.map((p) => p.updated_at)];
    for (const s of stamps) {
      if (Date.now() - Date.parse(s) > 21 * DAY) { staleNonDisengaged++; staleNames.push(t.name); break; }
    }
  }
  check('T8a: no non-disengaged persona has activity older than 21 days',
    staleNonDisengaged === 0, [...new Set(staleNames)].join(', '));

  const dis = TRAINEES.filter((t) => t.persona === 'disengaged');
  check('T8b: exactly ONE disengaged persona', dis.length === 1, `${dis.length}`);
  const disRows = buildRows(dis[0], POOL);
  check('T8c: the disengaged persona IS older than 21 days (deliberately)',
    disRows.attempts.every((a) => Date.now() - Date.parse(a.created_at) > 21 * DAY));
}

// ── T9: every published sub-area is exercised ─────────────────────────────────
// getCohortHeatmap derives its COLUMNS from the sub-areas present in the attempts, not
// from the pool — so a sub-area nobody touches does not render as an empty column, it does
// not render at all, while still counting in readiness's denominator. The seeder cannot
// fix that mismatch; it can only refuse to ship a demo that exhibits it.
{
  const touched = new Set<string>();
  for (const t of TRAINEES) for (const a of buildRows(t, POOL).attempts) touched.add(a.lo_code.slice(0, 2));
  const untouched = SUBS.filter((s) => !touched.has(s));
  check('T9: all 12 sub-areas appear in seeded activity (heatmap renders 12 columns)',
    untouched.length === 0, `untouched: ${untouched.join(', ')}`);
}

// ── T10: heatmap columns come from the POOL, not from the attempts ────────────
// P-G3(a) POSITIVE CONTROL. A test that only asserted "12 columns appear" would pass on an
// implementation that returned the 12 column headers and dropped every count — so it asserts
// BOTH halves: the untouched sub-areas appear AS EMPTY COLUMNS, and the touched ones still
// carry their real numbers. One without the other is not the fix.
//
// SIGHTED INSTANCE: the first re-seed of demo-advisory touched 11 of 12 sub-areas and D1 —
// the only one carrying "nobody has started this" — did not render at all.
//
// Pure re-implementation of getCohortHeatmap's cell arithmetic. It is NOT the live function
// (that one needs a DB), so this pins the RULE; the live column source is a one-line read of
// allSubAreas(paper) verified against cohort 48b0b9db in the same session.
{
  type Cell = { attempts: number; misses: number; missRate: number; covered: boolean };
  const buildCells = (rows: { lo_code: string; outcome: string }[]): Record<string, Cell> => {
    const cells: Record<string, Cell> = {};
    for (const at of rows) {
      const sa = at.lo_code.slice(0, 2);
      const c = (cells[sa] ??= { attempts: 0, misses: 0, missRate: 0, covered: false });
      c.attempts++;
      if (at.outcome === 'miss') c.misses++;
      if (at.outcome === 'correct') c.covered = true;
    }
    for (const sa of Object.keys(cells)) cells[sa].missRate = cells[sa].attempts > 0 ? cells[sa].misses / cells[sa].attempts : 0;
    return cells;
  };

  // A cohort that has touched only 5 of the 12 published sub-areas — the real shape of
  // cohort 48b0b9db, and of any cohort early in its prep.
  const attempts = [
    ...Array.from({ length: 7 }, () => ({ lo_code: 'A1b', outcome: 'miss' })),
    ...Array.from({ length: 2 }, () => ({ lo_code: 'A3c', outcome: 'miss' })),
    { lo_code: 'B1a', outcome: 'miss' },
    ...Array.from({ length: 2 }, () => ({ lo_code: 'B3b', outcome: 'miss' })),
    { lo_code: 'C1e', outcome: 'miss' }, { lo_code: 'C1e', outcome: 'correct' },
  ];
  const cells = buildCells(attempts);
  const TOUCHED = ['A1', 'A3', 'B1', 'B3', 'C1'];
  const UNTOUCHED = SUBS.filter((s) => !TOUCHED.includes(s));

  // FIXED: columns are the published pool.
  const columns = [...SUBS].sort();
  check('T10a: all 12 published sub-areas render as columns', columns.length === 12, `${columns.length}`);
  check('T10b: the 7 untouched sub-areas are AMONG the columns',
    UNTOUCHED.every((s) => columns.includes(s)), UNTOUCHED.join(','));
  check('T10c: an untouched column has NO cell (renders empty, not zero-filled)',
    UNTOUCHED.every((s) => cells[s] === undefined),
    'a zero-filled cell would read as a 0% miss rate, the opposite of "no data"');

  // The other half of the control: the touched columns must still carry real counts.
  check('T10d: A1 keeps its 7 attempts at a 1.0 miss rate',
    cells.A1?.attempts === 7 && cells.A1?.missRate === 1 && cells.A1?.covered === false,
    JSON.stringify(cells.A1));
  check('T10e: C1 keeps 2 attempts, 0.5 miss rate, covered',
    cells.C1?.attempts === 2 && cells.C1?.missRate === 0.5 && cells.C1?.covered === true,
    JSON.stringify(cells.C1));
  check('T10f: every touched sub-area carries a cell',
    TOUCHED.every((s) => cells[s] !== undefined && cells[s].attempts > 0), TOUCHED.join(','));
  check('T10g: attempts across the cells sum to the input',
    TOUCHED.reduce((a, s) => a + (cells[s]?.attempts ?? 0), 0) === attempts.length);

  // MUST-FAIL: the SHIPPED behaviour — columns derived from the attempts present.
  const LEGACY_columns = [...new Set(attempts.map((a) => a.lo_code.slice(0, 2)))].sort();
  check('T10h: shipped column derivation is pinned WRONG (5 columns, not 12)',
    LEGACY_columns.length === 5 && LEGACY_columns.length !== columns.length,
    `legacy=${LEGACY_columns.join(',')}`);
  check('T10i: the shipped derivation DROPS D1 specifically — the sighted instance',
    !LEGACY_columns.includes('D1') && columns.includes('D1'));
}



// ── T11: the harness exclusion is a GUARD, not a side-effect ──────────────────
// It used to hold only because teardown deleted the cohort and seed recreated it with a
// fresh id, cascading the old membership away. The day the seeder reuses cohorts instead of
// recreating them, that accident stops working — so the rule is asserted at the write.
{
  const rows = [
    { cohort_id: 'c1', user_id: 'de5e0000-0000-4000-8000-000000000001' },
    { cohort_id: 'c1', user_id: 'ee07f08c-9f24-4d77-af28-bbc894635f83' }, // red-team harness
    { cohort_id: 'c1', user_id: 'f321935f-83a5-4e1c-9dd9-72ce5cbab16a' }, // adversarial probe
    { cohort_id: 'c2', user_id: 'de5e0000-0000-4000-8000-000000000002' },
  ];
  const kept = cohortMembershipRows(rows);
  check('T11a: the harness is refused a cohort membership',
    !kept.some((r) => r.user_id === 'ee07f08c-9f24-4d77-af28-bbc894635f83'));
  check('T11b: the probe account is refused too',
    !kept.some((r) => r.user_id === 'f321935f-83a5-4e1c-9dd9-72ce5cbab16a'));
  check('T11c: real seeded trainees are untouched', kept.length === 2, String(kept.length));
  // The guard must not eat a real persona: no synthetic trainee uid may collide with an
  // excluded account. Vacuous-pass check first — a set that is empty, or a uid builder that
  // returns undefined, would make the assertion below true while proving nothing (P-G1).
  const seededUids = TRAINEES.map((t) => `de5e0000-0000-4000-8000-${t.idx.toString(16).padStart(12, '0')}`);
  check('T11d(pre): the control has something to check',
    EXCLUDED_ACCOUNTS.size === 2 && seededUids.length === TRAINEES.length && seededUids.every((u) => /^de5e0000-/.test(u)),
    `excluded=${EXCLUDED_ACCOUNTS.size} uids=${seededUids.length}`);
  check('T11d: no seeded trainee uid is in the exclusion set',
    seededUids.every((u) => !EXCLUDED_ACCOUNTS.has(u)));
  // MUST-FAIL: the shipped behaviour was no filter at all.
  check('T11e: the unguarded write is pinned WRONG', rows.length !== kept.length);
}


console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
