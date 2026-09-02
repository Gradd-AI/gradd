// scripts/seed-demo-org.ts
// Seeds the "Demo Advisory LLP" demo org for the coordinator dashboard — the asset
// shown in the pilot demo. Product-neutral shape; ACCA APM content.
//
//   npm run seed-demo-org              # idempotent: teardown → seed → print RAG summary
//   npm run seed-demo-org -- --down    # teardown only (remove all demo data)
//   npm run seed-demo-org -- --dry-run # print the plan AND the predicted bands, touch nothing
//
// ── ⚠️ THE SEEDED ROWS MUST SURVIVE THE DRILL JOIN (rewritten 2026-09-02) ─────
// This script used to write acca_drill_attempts with `drill_id: crypto.randomUUID()`
// and a hand-guessed `lo_code`. Both were wrong, and the coordinator view was wrong
// with them:
//
//   * FK-FREE IDS. 311 of 1,222 attempt rows pointed at drills that do not exist,
//     carrying 191 of the 216 `correct` outcomes — a 61.4% seeded correct rate
//     against 2.7% on real drills. `lib/org/queries.ts` now joins every drill-based
//     read to `acca_drills` (servable = exam_board ACCA + approved + published), so
//     every one of those rows now evaluates to NOTHING and both demo cohorts render
//     12/12 and 14/14 red with zero coverage.
//   * GUESSED LO CODES. `loFor(sub) = sub + 'a'` assumed an 'a' LO is published in
//     every sub-area. It is not — B2's published LOs are B2a and B2e only, and B4's
//     are B4a/b/c/f. A guessed code that no published drill carries buckets into a
//     sub-area the DENOMINATOR does not contain.
//
// So the pool is now READ FROM THE DATABASE and every attempt/progress row carries a
// real drill id and that drill's own lo_code. `assertPool` refuses to seed if any of
// the 12 sub-areas is missing — a seeder that silently drops a sub-area reproduces
// exactly the class of defect this rewrite exists to remove.
//
// SAFE + REVERSIBLE:
//  * Per-trainee acca_* rows are keyed by DETERMINISTIC synthetic user_ids (uid(idx)),
//    so teardown removes exactly them — never a real user.
//  * Trainees are synthetic uuids with NO auth.users row. The readiness/heatmap query
//    path reads only acca_* + org tables and derives names from membership email — no
//    join to profiles/auth.users.
//  * Re-runnable: default mode tears down first, so re-seeding never duplicates.
//
// ── ⚠️ TEARDOWN NO LONGER DELETES THE ORG ────────────────────────────────────
// It used to run `orgs.delete().eq('slug', ORG.slug)` and rely on the cascade to take
// the cohorts and memberships with it. That cascade is now DESTRUCTIVE BEYOND THIS
// SCRIPT'S REMIT: demo-advisory also holds cohort `48b0b9db-cad8-4c61-ae0d-32984af40b03`
// ("Sept-26 APM — live") and a REAL student's org membership, neither of which this
// seeder created. Teardown is therefore scoped to what the seeder owns: the synthetic
// uids, the two seeded cohort LABELS, and the coordinator/invited placeholder emails.
// The org row itself is left in place and reused.

import { createServiceClient } from '@/lib/supabase/server';
import { getCohortReadiness, buildInput } from '@/lib/org/queries';
import { computeReadiness } from '@/lib/org/readiness';
import { MOCK_PAPERS } from '@/lib/acca/mocks';

// Lazy: the client is only built when a seed/teardown actually runs, so the module
// can be imported (e.g. by the offline band-verifier) without Supabase env present.
let _sb: ReturnType<typeof createServiceClient> | null = null;
const db = () => (_sb ??= createServiceClient());

// ── Fixed identity of the demo (stable across re-seeds) ───────────────────────
const ORG = { slug: 'demo-advisory', name: 'Demo Advisory LLP', type: 'employer' as const };
const COORDINATOR_EMAIL = 'coordinator@demo-advisory.example'; // demo login; role gate deferred (pilot)
const INVITED_EMAILS = [ // 4 invited-never-active seats (utilisation view: invited vs active)
  'nina.roy@demo-advisory.example',
  'paul.eze@demo-advisory.example',
  'sara.blum@demo-advisory.example',
  'omar.rashid@demo-advisory.example',
];

// ── KNOWN NON-TRAINEE ACCOUNTS — NEVER PUT THESE IN A COHORT ─────────────────
// `ee07f08c` (erasmoose@outlook.ie) is the RED-TEAM HARNESS: 864 attempts at a median 6.7
// seconds apart, driven by scripts/redteam-tutor.ts replaying canned probe text. It is a
// legitimate org MEMBER (it needs entitlement to exercise the routes) and must keep that
// membership — but a cohort screen that includes it reports machine traffic as a trainee,
// and at 864 attempts it is the largest "trainee" on the board by an order of magnitude.
// `f321935f` (bedewa5090@ezimb.com) is an adversarial PROBE account: 32 real-drill attempts,
// prompt-injection turns, and the only `correct` outcome in the product's non-harness
// history — a false positive on a truncated non-answer.
//
// ⚠️ THIS GUARD EXISTS BECAUSE THE EXCLUSION USED TO BE AN ACCIDENT. The harness left the
// Sept-26 cohort only because teardown DELETED that cohort and seed recreated it with a
// fresh id, so its old cohort_membership cascaded away. Correct outcome, no rule behind it:
// the day this seeder is changed to REUSE cohorts instead of recreating them — which is the
// obvious next refactor, since recreating them churns ids on every run — the harness
// silently returns to the coordinator screen. An exclusion that depends on a delete is not
// an exclusion.
const EXCLUDED_ACCOUNTS = new Set<string>([
  'ee07f08c-9f24-4d77-af28-bbc894635f83', // red-team harness (erasmoose@outlook.ie)
  'f321935f-83a5-4e1c-9dd9-72ce5cbab16a', // adversarial probe account (bedewa5090@ezimb.com)
]);

/** Cohort membership rows, with known non-trainee accounts refused. Applied to the rows this
 *  seeder is ABOUT TO WRITE — it cannot police a membership added by hand, which is why the
 *  post-seed check in `summary()` reports any excluded account it finds in a cohort. */
export function cohortMembershipRows(
  rows: readonly { cohort_id: string; user_id: string }[],
): { cohort_id: string; user_id: string }[] {
  return rows.filter((r) => !EXCLUDED_ACCOUNTS.has(r.user_id));
}

export { EXCLUDED_ACCOUNTS };

// The two cohorts this seeder OWNS. Anything else under the org is somebody else's and
// teardown must not touch it — see the teardown note in the header.
const SEEDED_COHORTS = [
  { key: 'sept' as const, label: 'Sept-26 APM', sitting: 'Sept-26' },
  { key: 'dec' as const, label: 'Dec-26 APM', sitting: 'Dec-26' },
];

// 12 published APM sub-areas — the coverage denominator. Verified against the live pool
// at seed time by assertPool(); this list is the EXPECTATION, the DB is the authority.
const SUBS = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'D1', 'D2'];

// Deterministic synthetic trainee uuid from a 1-based index ('de5e' = demo seed).
const uid = (idx: number) => `de5e0000-0000-4000-8000-${idx.toString(16).padStart(12, '0')}`;

const NOW = Date.now();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();

// ── The real-drill pool ───────────────────────────────────────────────────────
export interface DrillRef { id: string; lo_code: string }
export type DrillPool = Map<string, DrillRef[]>; // sub-area ('D2') → published drills

/** Read the SERVABLE APM pool — the same predicate lib/org/queries.ts joins on, so a row
 *  this seeder writes is a row the coordinator can see. Kept literal rather than imported
 *  because a seeder silently tracking a change to the read path is how they drift apart. */
async function loadPool(): Promise<DrillPool> {
  const { data, error } = await db()
    .from('acca_drills')
    .select('id, lo_code')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('status', 'approved')
    .eq('published', true);
  if (error) throw new Error('pool read: ' + error.message);
  const pool: DrillPool = new Map();
  for (const r of (data as DrillRef[] | null) ?? []) {
    const sub = r.lo_code.slice(0, 2);
    (pool.get(sub) ?? pool.set(sub, []).get(sub)!).push(r);
  }
  // Stable order: the pick is by index, so an unordered fetch would give a different
  // (still valid) seed each run and make a re-seed impossible to diff.
  for (const rows of pool.values()) rows.sort((a, b) => a.id.localeCompare(b.id));
  return pool;
}

/** Refuse to seed a pool that cannot serve the plan. A missing sub-area would silently
 *  produce a demo whose coverage can never reach 12 — the exact failure this rewrite
 *  removes, reintroduced by data rather than by code. */
export function assertPool(pool: DrillPool): void {
  const missing = SUBS.filter((s) => (pool.get(s)?.length ?? 0) === 0);
  if (missing.length > 0) {
    throw new Error(
      `drill pool is missing published APM drills for: ${missing.join(', ')}. ` +
      'Seeding would produce coverage that cannot reach 12/12. Publish drills for those ' +
      'sub-areas, or narrow SUBS to the pool that exists — do not seed around it.',
    );
  }
  const extra = [...pool.keys()].filter((s) => !SUBS.includes(s)).sort();
  if (extra.length > 0) {
    // Not fatal: the denominator is computed from the DB, so a NEW published sub-area
    // simply means the seeded personas cover a smaller fraction than intended. Say so.
    console.warn(`⚠️  pool has sub-areas SUBS does not list: ${extra.join(', ')} — ` +
      `denominator is ${pool.size}, personas are written against ${SUBS.length}.`);
  }
}

/** A synthetic pool for the offline dry-run: real sub-area/LO shape, fake ids. Readiness
 *  never reads the id, so predicted bands from this pool are exact. */
export function offlinePool(): DrillPool {
  const pool: DrillPool = new Map();
  for (const s of SUBS) {
    pool.set(s, ['a', 'b', 'c'].map((suffix) => ({ id: `offline-${s}${suffix}`, lo_code: `${s}${suffix}` })));
  }
  return pool;
}

type Persona = 'never_started' | 'disengaged' | 'struggling' | 'improving' | 'green' | 'flat' | 'steady_amber';
interface Trainee { idx: number; name: string; cohort: 'sept' | 'dec'; persona: Persona; satMock?: boolean }

const emailFor = (name: string) =>
  name.toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/).join('.') + '@demo-advisory.example';

// ── The 25 active trainees ────────────────────────────────────────────────────
// A cohort where everyone is fine shows the coordinator nothing, so the spread is
// deliberately mixed: greens, a majority amber, and four reds arriving by three
// DIFFERENT routes — never-started (override), disengaged (override), and `struggling`,
// which is red ON SCORE while being active today. That third one is the useful card:
// it is the shape of a real student who is working and not landing, and an override-only
// red set would never show it.
//
// Sept-26 (13): collectively WEAK ON D2 — one red column across the cohort.
// Dec-26 (12): earlier in prep, mixed, no forced D2 weakness.
const TRAINEES: Trainee[] = [
  // Sept — 3 green · 7 amber · 3 red (one of each route)
  { idx: 1,  name: 'Priya Nair',      cohort: 'sept', persona: 'never_started' },
  { idx: 2,  name: 'Tom Fitzgerald',  cohort: 'sept', persona: 'disengaged' },
  { idx: 3,  name: 'Marcus Webb',     cohort: 'sept', persona: 'flat' },        // high activity, flat progress
  { idx: 4,  name: 'Aisha Khan',      cohort: 'sept', persona: 'improving' },
  { idx: 5,  name: 'Diego Alvarez',   cohort: 'sept', persona: 'improving' },
  { idx: 6,  name: 'Lena Fischer',    cohort: 'sept', persona: 'improving' },
  { idx: 7,  name: 'Grace O Connor',  cohort: 'sept', persona: 'green', satMock: true },
  { idx: 8,  name: 'Ravi Menon',      cohort: 'sept', persona: 'green' },
  { idx: 9,  name: 'Sofia Rossi',     cohort: 'sept', persona: 'green', satMock: true },
  { idx: 10, name: 'Yusuf Demir',     cohort: 'sept', persona: 'steady_amber' },
  { idx: 11, name: 'Chloe Baker',     cohort: 'sept', persona: 'steady_amber' },
  { idx: 12, name: 'Kwame Mensah',    cohort: 'sept', persona: 'struggling', satMock: true },
  { idx: 13, name: 'Hana Suzuki',     cohort: 'sept', persona: 'steady_amber' },
  // Dec — 4 green · 7 amber · 1 red
  { idx: 14, name: 'Liam Murphy',     cohort: 'dec',  persona: 'improving' },
  { idx: 15, name: 'Noor Haddad',     cohort: 'dec',  persona: 'steady_amber' },
  { idx: 16, name: 'Emma Larsson',    cohort: 'dec',  persona: 'green' },
  { idx: 17, name: 'Omar Farouk',     cohort: 'dec',  persona: 'steady_amber' },
  { idx: 18, name: 'Isabella Conti',  cohort: 'dec',  persona: 'steady_amber' },
  { idx: 19, name: 'Jack Thompson',   cohort: 'dec',  persona: 'improving' },
  { idx: 20, name: 'Mei Lin',         cohort: 'dec',  persona: 'green', satMock: true },
  { idx: 21, name: 'Carlos Mendes',   cohort: 'dec',  persona: 'struggling' },
  { idx: 22, name: 'Fatima Zahra',    cohort: 'dec',  persona: 'improving' },
  { idx: 23, name: 'Daniel Cohen',    cohort: 'dec',  persona: 'steady_amber' },
  { idx: 24, name: 'Ava Robinson',    cohort: 'dec',  persona: 'green' },
  { idx: 25, name: 'Nikolai Petrov',  cohort: 'dec',  persona: 'green' },
];

// ── Row builders ──────────────────────────────────────────────────────────────
interface Attempt { user_id: string; drill_id: string; lo_code: string; outcome: 'correct' | 'miss'; created_at: string }
interface Progress { user_id: string; drill_id: string; miss_count: number; resolved: boolean; counted: boolean; updated_at: string }
interface Mark { user_id: string; case_id: string; professional_marks_awarded: number; professional_marks_available: number; per_skill: unknown[]; model: string; marked_at: string }
interface Mock { user_id: string; mock_id: string; started_at: string; ends_at: string; completed: boolean }

interface Rows { attempts: Attempt[]; progress: Progress[]; marks: Mark[]; mocks: Mock[] }

function buildRows(t: Trainee, pool: DrillPool): Rows {
  const u = uid(t.idx);
  const attempts: Attempt[] = [];
  const progress: Progress[] = [];
  const marks: Mark[] = [];
  const mocks: Mock[] = [];
  const isSept = t.cohort === 'sept';

  // Deterministic rotation through a sub-area's real drills, offset by trainee index so
  // two trainees are not always handed the same drill. Never random: a re-seed must be
  // diffable against the previous one.
  let tick = 0;
  const pick = (sub: string): DrillRef => {
    const rows = pool.get(sub);
    if (!rows || rows.length === 0) throw new Error(`pick(${sub}): empty pool — assertPool should have caught this`);
    return rows[(t.idx + tick++) % rows.length];
  };

  const correct = (sub: string, d: number) => { const r = pick(sub); attempts.push({ user_id: u, drill_id: r.id, lo_code: r.lo_code, outcome: 'correct', created_at: daysAgo(d) }); };
  const miss = (sub: string, d: number) => { const r = pick(sub); attempts.push({ user_id: u, drill_id: r.id, lo_code: r.lo_code, outcome: 'miss', created_at: daysAgo(d) }); };
  const resolvedProg = (sub: string, d: number) => { const r = pick(sub); progress.push({ user_id: u, drill_id: r.id, miss_count: 0, resolved: true, counted: false, updated_at: daysAgo(d) }); };
  const stuckProg = (sub: string, d: number) => { const r = pick(sub); progress.push({ user_id: u, drill_id: r.id, miss_count: 3, resolved: false, counted: true, updated_at: daysAgo(d) }); };
  const satMock = (d: number, awardedOf: (i: number) => [number, number]) => {
    const p = MOCK_PAPERS[0];
    mocks.push({ user_id: u, mock_id: p.id, started_at: daysAgo(d), ends_at: daysAgo(d), completed: true });
    p.case_ids.forEach((cid, i) => {
      const [awarded, available] = awardedOf(i);
      marks.push({ user_id: u, case_id: cid, professional_marks_awarded: awarded, professional_marks_available: available, per_skill: [], model: 'demo-seed', marked_at: daysAgo(d) });
    });
  };

  // Sept cohort weakness: every ACTIVE Sept trainee carries D2 misses so the D2 column
  // reads red across the cohort (Greens stay strong elsewhere).
  const septD2 = (recentDay: number) => { if (isSept) for (let i = 0; i < 3; i++) miss('D2', recentDay); };

  switch (t.persona) {
    case 'never_started':
      break; // no activity at all → readiness override 'never-started'

    case 'disengaged': {
      // THE ONE PERSONA THAT IS DELIBERATELY OLD. Everything > 21 days → override
      // 'disengaged-21d'. Every other persona sits inside the last three weeks.
      SUBS.slice(0, 7).forEach((s, i) => correct(s, 24 + (i % 4)));
      miss('D2', 26); miss('A3', 27);
      resolvedProg('A1', 25); resolvedProg('B1', 26);
      break;
    }

    case 'green': {
      // Broad coverage (all 12 sub-areas), recent, low miss. Strong despite the Sept D2 dip.
      //
      // ⚠️ D1 IS LISTED EXPLICITLY, and that is load-bearing for the DEMO rather than for the
      // score. `getCohortHeatmap` derives its COLUMNS from the sub-areas present in the
      // attempts (`subAreaSet.add(subAreaOf(at.lo_code))`), not from the published pool — so a
      // sub-area no one has touched does not render as an empty column, it does not render AT
      // ALL, while still counting in readiness's 12 denominator. With `SUBS.slice(0, 10)` the
      // seed touched 11 sub-areas and the demo heatmap silently showed 11 columns against a
      // coverage figure out of 12. The seeder cannot fix that mismatch (it is in the query
      // layer, logged separately) — it can only make sure the demo exercises every column.
      SUBS.slice(0, 10).forEach((s, i) => correct(s, 2 + (i % 3)));
      correct('D1', 2);
      correct('D2', 3);  // covers D2 despite the cohort weakness
      septD2(4);         // ...but still shows a couple of D2 misses
      for (let i = 0; i < 6; i++) resolvedProg(SUBS[i], 2 + (i % 3));
      if (t.satMock) satMock(4, (i) => (i === 0 ? [8, 10] : [4, 5]));
      break;
    }

    case 'improving': {
      // Prior window (16–20d): heavy D2 misses. Recent window (3–7d): clearly improving
      // but not perfect, and coverage still narrow → Amber, trending up (visible slope).
      for (let i = 0; i < 6; i++) miss('D2', 16 + (i % 5));
      miss('C1', 19); miss('A3', 18);
      for (let i = 0; i < 3; i++) correct('D2', 4 + i);          // recent: D2 turning around
      SUBS.slice(0, 3).forEach((s, i) => correct(s, 4 + i));     // narrow coverage (~4 sub-areas)
      miss('B1', 5); miss('C1', 6);                              // recent misses remain (not flawless)
      resolvedProg('D2', 5); stuckProg('C1', 5);
      break;
    }

    case 'flat': {
      // High activity, NO improvement: same miss-rate both windows, very recent, but
      // NARROW (grinds the same few sub-areas, never broadens) → Amber despite the effort.
      const window = (d: number) => {
        for (let i = 0; i < 4; i++) correct(SUBS[i], d);
        for (let i = 0; i < 4; i++) miss(i < 2 ? 'D2' : SUBS[4 + i], d);
      };
      window(2); window(3); window(16); window(18);
      septD2(3);
      stuckProg('D2', 2); stuckProg('C1', 3); resolvedProg('A1', 2);
      break;
    }

    case 'steady_amber': {
      // Moderate coverage (~5), moderate misses, active 4–7d.
      SUBS.slice(0, 5).forEach((s, i) => correct(s, 4 + (i % 3)));
      miss('A3', 6); miss(isSept ? 'D2' : 'C1', 5);
      septD2(6);
      resolvedProg('A1', 5); stuckProg('C1', 6);
      break;
    }

    case 'struggling': {
      // ⚠️ RED ON SCORE, NOT ON AN OVERRIDE — and ACTIVE TODAY. Heavy recent effort,
      // almost nothing converting: no correct attempts at all, so coverage is 0/12, and a
      // recent miss-rate of 1.0 flattens M. This is the card an override-only red set
      // cannot produce, and it is the shape of a real struggling student.
      for (let i = 0; i < 6; i++) miss(SUBS[i % 4], 1 + (i % 3));   // recent: 6 misses, 0 correct
      for (let i = 0; i < 5; i++) miss(SUBS[i % 3], 17 + (i % 4));  // prior: also all misses
      septD2(2);
      stuckProg('D2', 1); stuckProg('C1', 2); stuckProg('A3', 2);
      if (t.satMock) satMock(3, () => [1, 5]); // sat a mock and scored badly
      break;
    }
  }
  return { attempts, progress, marks, mocks };
}

// ── Offline band prediction (dry-run) ─────────────────────────────────────────
// buildInput + computeReadiness are the SAME functions the coordinator runs, so a
// dry-run band is the band the dashboard will show — provided the seeded rows survive
// the join, which is what the real-drill pool now guarantees. Predicting the spread
// BEFORE writing is what stops "some green, some amber" being an intention rather than
// a fact.
function predictBands(pool: DrillPool, total = SUBS.length) {
  return TRAINEES.map((t) => {
    const r = buildRows(t, pool);
    const input = buildInput(NOW, total, r.attempts.map((a) => ({ ...a })), r.progress.map((p) => ({ ...p })),
      r.marks.map((m) => ({ user_id: m.user_id, case_id: m.case_id, professional_marks_awarded: m.professional_marks_awarded, professional_marks_available: m.professional_marks_available, marked_at: m.marked_at })),
      r.mocks.map((m) => ({ user_id: m.user_id, mock_id: m.mock_id, completed: m.completed, started_at: m.started_at })));
    const res = computeReadiness(input);
    return { t, res, covered: input.coveredSubAreas, attempts: r.attempts.length };
  });
}

function printPrediction(pool: DrillPool) {
  const rows = predictBands(pool);
  for (const cohort of ['sept', 'dec'] as const) {
    const inC = rows.filter((r) => r.t.cohort === cohort);
    const tally = { green: 0, amber: 0, red: 0 };
    console.log(`\n── ${cohort === 'sept' ? 'Sept-26 APM' : 'Dec-26 APM'} (${inC.length} trainees) ──`);
    for (const { t, res, covered, attempts } of inC) {
      tally[res.band]++;
      console.log(`  ${res.band.toUpperCase().padEnd(6)} ${t.name.padEnd(16)} score=${res.score.toFixed(3)} cov=${covered}/12 att=${String(attempts).padStart(2)} ${res.override ? `[${res.override}]` : ''} (${t.persona})`);
    }
    console.log(`  → G:${tally.green} A:${tally.amber} R:${tally.red}`);
  }
}

// ── Teardown / seed / summary ─────────────────────────────────────────────────
const ALL_UIDS = TRAINEES.map((t) => uid(t.idx));
const PLACEHOLDER_EMAILS = [COORDINATOR_EMAIL, ...INVITED_EMAILS];

/** The demo org, created if absent. NEVER deleted — see the teardown note in the header. */
async function ensureOrg(): Promise<string> {
  const { data: existing } = await db().from('orgs').select('id').eq('slug', ORG.slug).maybeSingle();
  if (existing) return existing.id as string;
  const { data, error } = await db().from('orgs')
    .insert({ slug: ORG.slug, name: ORG.name, type: ORG.type, is_demo: true }).select('id').single();
  if (error) throw new Error('org insert: ' + error.message);
  return data!.id as string;
}

/** Removes ONLY what this seeder owns. The org row, and any cohort/membership this
 *  script did not create, are left untouched. */
async function teardown() {
  const { data: org } = await db().from('orgs').select('id').eq('slug', ORG.slug).maybeSingle();
  await db().from('acca_drill_attempts').delete().in('user_id', ALL_UIDS);
  await db().from('acca_tutor_progress').delete().in('user_id', ALL_UIDS);
  await db().from('acca_mock_attempts').delete().in('user_id', ALL_UIDS);
  await db().from('acca_case_marking').delete().in('user_id', ALL_UIDS);
  if (!org) return;
  const orgId = org.id as string;
  // Cohorts by LABEL, so a cohort added by hand under this org survives.
  await db().from('cohorts').delete().eq('org_id', orgId).in('label', SEEDED_COHORTS.map((c) => c.label));
  await db().from('cohort_memberships').delete().in('user_id', ALL_UIDS);
  await db().from('org_memberships').delete().eq('org_id', orgId).in('user_id', ALL_UIDS);
  await db().from('org_memberships').delete().eq('org_id', orgId).in('email', PLACEHOLDER_EMAILS);
}

async function insertChunked<T>(table: string, rows: T[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db().from(table).insert(rows.slice(i, i + 500));
    if (error) throw new Error(`${table} insert: ${error.message}`);
  }
}

async function seed(pool: DrillPool) {
  const orgId = await ensureOrg();

  const ids: Record<'sept' | 'dec', string> = { sept: '', dec: '' };
  for (const c of SEEDED_COHORTS) {
    const { data, error } = await db().from('cohorts')
      .insert({ org_id: orgId, label: c.label, target_sitting: c.sitting, paper: 'APM' }).select('id').single();
    if (error) throw new Error(`cohort ${c.label}: ${error.message}`);
    ids[c.key] = data!.id as string;
  }

  // memberships — coordinator, active trainees, invited seats
  const memberships: Record<string, unknown>[] = [
    { org_id: orgId, user_id: null, email: COORDINATOR_EMAIL, role: 'coordinator', status: 'active' }, // pilot: claim backfills user_id
    ...TRAINEES.map((t) => ({ org_id: orgId, user_id: uid(t.idx), email: emailFor(t.name), role: 'member', status: 'active' })),
    ...INVITED_EMAILS.map((email) => ({ org_id: orgId, user_id: null, email, role: 'member', status: 'invited' })),
  ];
  await insertChunked('org_memberships', memberships);
  // The guard is applied HERE, at the write, not left to the fact that teardown happens to
  // delete the cohorts first — see EXCLUDED_ACCOUNTS.
  await insertChunked('cohort_memberships',
    cohortMembershipRows(TRAINEES.map((t) => ({ cohort_id: ids[t.cohort], user_id: uid(t.idx) }))));

  const all: Rows = { attempts: [], progress: [], marks: [], mocks: [] };
  for (const t of TRAINEES) {
    const r = buildRows(t, pool);
    all.attempts.push(...r.attempts); all.progress.push(...r.progress);
    all.marks.push(...r.marks); all.mocks.push(...r.mocks);
  }
  await insertChunked('acca_drill_attempts', all.attempts);
  await insertChunked('acca_tutor_progress', all.progress);
  await insertChunked('acca_case_marking', all.marks);
  await insertChunked('acca_mock_attempts', all.mocks);

  return { orgId, septId: ids.sept, decId: ids.dec, counts: { attempts: all.attempts.length, progress: all.progress.length, marks: all.marks.length, mocks: all.mocks.length } };
}

/** Post-seed verification through the REAL query path (getCohortReadiness → the drill
 *  join), not through predictBands. If these two disagree, the seeded rows did not
 *  survive the join and the seed is wrong. */
async function summary(septId: string, decId: string) {
  // The write-side guard cannot see a membership added by hand, so the post-seed read reports
  // one instead of assuming none exists.
  for (const [label, id] of [['Sept-26 APM', septId], ['Dec-26 APM', decId]] as const) {
    const { data: cm } = await db().from('cohort_memberships').select('user_id').eq('cohort_id', id);
    const intruders = ((cm as { user_id: string }[] | null) ?? []).filter((r) => EXCLUDED_ACCOUNTS.has(r.user_id));
    if (intruders.length > 0) {
      console.warn(`⚠️  ${label}: ${intruders.length} EXCLUDED account(s) in this cohort — ${intruders.map((i) => i.user_id).join(', ')}`);
    }
    const rag = await getCohortReadiness(id, NOW);
    const tally = { green: 0, amber: 0, red: 0 };
    console.log(`\n── ${label} (${rag.length} trainees) ──`);
    for (const t of rag) {
      tally[t.readiness.band]++;
      const c = t.readiness.components.coverage;
      console.log(`  ${t.readiness.band.toUpperCase().padEnd(6)} ${(t.name ?? '?').padEnd(16)} score=${t.readiness.score.toFixed(3)} cov=${c.covered}/${c.total} ${t.readiness.override ? `[${t.readiness.override}]` : ''}`);
    }
    console.log(`  → G:${tally.green} A:${tally.amber} R:${tally.red}`);
  }
}

async function main() {
  const arg = process.argv[2];

  if (arg === '--dry-run') {
    const pool = offlinePool();
    const rows = TRAINEES.map((t) => buildRows(t, pool));
    console.log(`PLAN: org "${ORG.name}" (is_demo, REUSED not recreated) | 2 cohorts | ${TRAINEES.length} active + ${INVITED_EMAILS.length} invited`);
    console.log(`  attempts=${rows.reduce((a, r) => a + r.attempts.length, 0)} progress=${rows.reduce((a, r) => a + r.progress.length, 0)} marks=${rows.reduce((a, r) => a + r.marks.length, 0)} mocks=${rows.reduce((a, r) => a + r.mocks.length, 0)}`);
    const byPersona: Record<string, number> = {};
    for (const t of TRAINEES) byPersona[t.persona] = (byPersona[t.persona] ?? 0) + 1;
    console.log('  personas:', byPersona);
    console.log('\nPREDICTED BANDS (offline pool — buildInput + computeReadiness, the real formula):');
    printPrediction(pool);
    return true;
  }

  console.log('teardown…');
  await teardown();
  if (arg === '--down') { console.log('demo data removed (org and non-seeded cohorts left intact).'); return true; }

  console.log('loading published APM drill pool…');
  const pool = await loadPool();
  assertPool(pool);
  console.log(`  pool: ${[...pool.values()].reduce((a, r) => a + r.length, 0)} drills across ${pool.size} sub-areas`);

  console.log('seeding…');
  const { septId, decId, counts } = await seed(pool);
  console.log('inserted:', counts);
  await summary(septId, decId);
  console.log('\nseed complete.');
  return true;
}

// Auto-run ONLY when invoked directly (guarded so the offline band-verifier can
// import buildRows/TRAINEES without triggering a DB seed).
const invokedDirectly = (process.argv[1] ?? '').replace(/\\/g, '/').includes('scripts/seed-demo-org');
if (invokedDirectly) {
  main().then(() => process.exit(0)).catch((e) => { console.error('SEED ERROR:', e.message); process.exit(1); });
}

export { TRAINEES, buildRows, predictBands, NOW, SUBS, type Trainee };
