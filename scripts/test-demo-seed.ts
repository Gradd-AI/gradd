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

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
