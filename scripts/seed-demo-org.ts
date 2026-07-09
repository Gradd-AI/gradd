// scripts/seed-demo-org.ts
// Seeds the "Demo Advisory LLP" demo org for the coordinator dashboard — the asset
// shown in the pilot demo. Product-neutral shape; ACCA APM content.
//
//   npm run seed-demo-org              # idempotent: teardown → seed → print RAG summary
//   npm run seed-demo-org -- --down    # teardown only (remove all demo data)
//   npm run seed-demo-org -- --dry-run # print the plan (counts), touch nothing
//
// SAFE + REVERSIBLE:
//  * Everything hangs off an is_demo=true org; real-metric queries exclude is_demo,
//    and the whole graph deletes in one statement (org delete cascades cohorts +
//    memberships). Per-trainee acca_* rows are keyed by DETERMINISTIC synthetic
//    user_ids (uid(idx)), so teardown removes exactly them — never a real user.
//  * Trainees are synthetic uuids with NO auth.users row. Proven safe end-to-end:
//    the readiness/heatmap query path reads only acca_* + org tables and derives
//    names from membership email — no join to profiles/auth.users (suspicion #3
//    check, executed 2026-07-09).
//  * Re-runnable: default mode tears down first, so re-seeding never duplicates.
//
// Writes backdated acca_drill_attempts (the M-slope), acca_tutor_progress
// (resolved/stuck), and selected acca_case_marking + acca_mock_attempts (the P
// signal, incl. the real mock-score path).

import { createServiceClient } from '@/lib/supabase/server';
import { getCohortReadiness } from '@/lib/org/queries';
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

// 12 real published APM sub-areas (recon 2026-07-09). Coverage denominator = 12.
const SUBS = ['A1', 'A2', 'A3', 'A4', 'A5', 'B1', 'B2', 'B3', 'B4', 'C1', 'D1', 'D2'];
const D2_LOS = ['D2a', 'D2b', 'D2c', 'D2d', 'D2e'];
const loFor = (sub: string) => `${sub}a`; // representative published LO per sub-area

// Deterministic synthetic trainee uuid from a 1-based index ('de5e' = demo seed).
const uid = (idx: number) => `de5e0000-0000-4000-8000-${idx.toString(16).padStart(12, '0')}`;

const NOW = Date.now();
const daysAgo = (d: number) => new Date(NOW - d * 86_400_000).toISOString();
const drillId = () => crypto.randomUUID(); // FK-free; value irrelevant, teardown is by user_id

type Persona = 'never_started' | 'disengaged' | 'improving' | 'green' | 'flat' | 'steady_amber';
interface Trainee { idx: number; name: string; cohort: 'sept' | 'dec'; persona: Persona; satMock?: boolean }

const emailFor = (name: string) =>
  name.toLowerCase().replace(/[^a-z ]/g, '').trim().split(/\s+/).join('.') + '@demo-advisory.example';

// ── The 25 active trainees (personas per Grant's approved spec) ───────────────
// Sept-26 cohort (13): collectively WEAK ON D2. 3 reds total (1 never-started, 2
// disengaged), improving Ambers with backdated slopes, Greens, 1 high-activity-flat.
// Dec-26 cohort (12): earlier in prep, mixed, no forced D2 weakness.
const TRAINEES: Trainee[] = [
  // Sept
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
  { idx: 12, name: 'Kwame Mensah',    cohort: 'sept', persona: 'steady_amber' },
  { idx: 13, name: 'Hana Suzuki',     cohort: 'sept', persona: 'green' },
  // Dec
  { idx: 14, name: 'Liam Murphy',     cohort: 'dec',  persona: 'improving' },
  { idx: 15, name: 'Noor Haddad',     cohort: 'dec',  persona: 'steady_amber' },
  { idx: 16, name: 'Emma Larsson',    cohort: 'dec',  persona: 'green' },
  { idx: 17, name: 'Omar Farouk',     cohort: 'dec',  persona: 'steady_amber' },
  { idx: 18, name: 'Isabella Conti',  cohort: 'dec',  persona: 'steady_amber' },
  { idx: 19, name: 'Jack Thompson',   cohort: 'dec',  persona: 'improving' },
  { idx: 20, name: 'Mei Lin',         cohort: 'dec',  persona: 'green', satMock: true },
  { idx: 21, name: 'Carlos Mendes',   cohort: 'dec',  persona: 'steady_amber' },
  { idx: 22, name: 'Fatima Zahra',    cohort: 'dec',  persona: 'improving' },
  { idx: 23, name: 'Daniel Cohen',    cohort: 'dec',  persona: 'steady_amber' },
  { idx: 24, name: 'Ava Robinson',    cohort: 'dec',  persona: 'green' },
  { idx: 25, name: 'Nikolai Petrov',  cohort: 'dec',  persona: 'disengaged' },
];

// ── Row builders ──────────────────────────────────────────────────────────────
interface Attempt { user_id: string; drill_id: string; lo_code: string; outcome: 'correct' | 'miss'; created_at: string }
interface Progress { user_id: string; drill_id: string; miss_count: number; resolved: boolean; counted: boolean; updated_at: string }
interface Mark { user_id: string; case_id: string; professional_marks_awarded: number; professional_marks_available: number; per_skill: unknown[]; model: string; marked_at: string }
interface Mock { user_id: string; mock_id: string; started_at: string; ends_at: string; completed: boolean }

interface Rows { attempts: Attempt[]; progress: Progress[]; marks: Mark[]; mocks: Mock[] }

function buildRows(t: Trainee): Rows {
  const u = uid(t.idx);
  const attempts: Attempt[] = [];
  const progress: Progress[] = [];
  const marks: Mark[] = [];
  const mocks: Mock[] = [];
  const isSept = t.cohort === 'sept';

  const correct = (lo: string, d: number) => attempts.push({ user_id: u, drill_id: drillId(), lo_code: lo, outcome: 'correct', created_at: daysAgo(d) });
  const miss = (lo: string, d: number) => attempts.push({ user_id: u, drill_id: drillId(), lo_code: lo, outcome: 'miss', created_at: daysAgo(d) });
  const resolvedProg = (d: number) => progress.push({ user_id: u, drill_id: drillId(), miss_count: 0, resolved: true, counted: false, updated_at: daysAgo(d) });
  const stuckProg = (d: number) => progress.push({ user_id: u, drill_id: drillId(), miss_count: 3, resolved: false, counted: true, updated_at: daysAgo(d) });

  // Sept cohort weakness: every ACTIVE Sept trainee carries D2 misses so the D2
  // column reads red across the cohort (Greens stay strong elsewhere).
  const septD2 = (recentDay: number) => { if (isSept) { for (let i = 0; i < 3; i++) miss(D2_LOS[i % D2_LOS.length], recentDay); } };

  switch (t.persona) {
    case 'never_started':
      break; // no activity at all → readiness override 'never-started'

    case 'disengaged': {
      // Real history but everything > 21 days ago → override 'disengaged-21d'.
      SUBS.slice(0, 7).forEach((s, i) => correct(loFor(s), 24 + (i % 4)));
      miss('D2b', 26); miss('A3a', 27);
      resolvedProg(25); resolvedProg(26);
      break;
    }

    case 'green': {
      // Broad coverage (10 sub-areas), recent, low miss. Strong despite Sept D2 dip.
      SUBS.slice(0, 10).forEach((s, i) => correct(loFor(s), 2 + (i % 5)));
      correct('D2a', 3); // covers D2 despite the cohort weakness
      septD2(4);         // ...but still shows a couple D2 misses
      for (let i = 0; i < 6; i++) resolvedProg(2 + (i % 4));
      if (t.satMock) {
        const p = MOCK_PAPERS[0];
        mocks.push({ user_id: u, mock_id: p.id, started_at: daysAgo(4), ends_at: daysAgo(4), completed: true });
        p.case_ids.forEach((cid, i) => marks.push({ user_id: u, case_id: cid, professional_marks_awarded: i === 0 ? 8 : 4, professional_marks_available: i === 0 ? 10 : 5, per_skill: [], model: 'demo-seed', marked_at: daysAgo(4) }));
      }
      break;
    }

    case 'improving': {
      // Prior window (16–22d): heavy D2 misses. Recent window (5–8d): clearly improving
      // but not perfect, and coverage still narrow → Amber, trending up (visible slope).
      for (let i = 0; i < 6; i++) miss(D2_LOS[i % D2_LOS.length], 16 + (i % 6));
      miss('C1a', 20); miss('A3a', 18);
      for (let i = 0; i < 3; i++) correct(D2_LOS[i], 5 + i);       // recent: D2 turning around
      SUBS.slice(0, 3).forEach((s, i) => correct(loFor(s), 5 + i));// narrow coverage (~4 sub-areas)
      miss('B1a', 6); miss('C1a', 7);                              // recent misses remain (not flawless)
      resolvedProg(6); stuckProg(6);
      break;
    }

    case 'flat': {
      // High activity, NO improvement: same miss-rate both windows, very recent, but
      // NARROW (grinds the same 4 sub-areas, never broadens) → Amber despite the effort.
      const window = (d: number) => { for (let i = 0; i < 4; i++) correct(loFor(SUBS[i]), d); for (let i = 0; i < 4; i++) miss(i < 2 ? D2_LOS[i] : loFor(SUBS[4 + i]), d); };
      window(2); window(3); window(16); window(18);
      septD2(3);
      stuckProg(2); stuckProg(3); resolvedProg(2);
      break;
    }

    case 'steady_amber': {
      // Moderate coverage (~6), moderate misses, active ~4–8d.
      SUBS.slice(0, 6).forEach((s, i) => correct(loFor(s), 4 + (i % 4)));
      miss('A3a', 6); miss(isSept ? 'D2a' : 'C1a', 5);
      septD2(6);
      resolvedProg(5); stuckProg(6);
      break;
    }
  }
  return { attempts, progress, marks, mocks };
}

// ── Teardown / seed / summary ─────────────────────────────────────────────────
const ALL_UIDS = TRAINEES.map((t) => uid(t.idx));

async function teardown() {
  await db().from('acca_drill_attempts').delete().in('user_id', ALL_UIDS);
  await db().from('acca_tutor_progress').delete().in('user_id', ALL_UIDS);
  await db().from('acca_mock_attempts').delete().in('user_id', ALL_UIDS);
  await db().from('acca_case_marking').delete().in('user_id', ALL_UIDS);
  await db().from('orgs').delete().eq('slug', ORG.slug); // cascades cohorts + memberships
}

async function insertChunked<T>(table: string, rows: T[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await db().from(table).insert(rows.slice(i, i + 500));
    if (error) throw new Error(`${table} insert: ${error.message}`);
  }
}

async function seed() {
  // 1. org + cohorts
  const { data: org, error: oErr } = await db().from('orgs')
    .insert({ slug: ORG.slug, name: ORG.name, type: ORG.type, is_demo: true }).select('id').single();
  if (oErr) throw new Error('org insert: ' + oErr.message);
  const orgId = org!.id as string;

  const mkCohort = async (label: string, sitting: string) => {
    const { data } = await db().from('cohorts')
      .insert({ org_id: orgId, label, target_sitting: sitting, paper: 'APM' }).select('id').single();
    return data!.id as string;
  };
  const septId = await mkCohort('Sept-26 APM', 'Sept-26');
  const decId = await mkCohort('Dec-26 APM', 'Dec-26');
  const cohortIdFor = (c: 'sept' | 'dec') => (c === 'sept' ? septId : decId);

  // 2. memberships — coordinator, active trainees, invited seats
  const memberships: Record<string, unknown>[] = [
    { org_id: orgId, user_id: null, email: COORDINATOR_EMAIL, role: 'coordinator', status: 'active' }, // pilot: claim backfills user_id
    ...TRAINEES.map((t) => ({ org_id: orgId, user_id: uid(t.idx), email: emailFor(t.name), role: 'member', status: 'active' })),
    ...INVITED_EMAILS.map((email) => ({ org_id: orgId, user_id: null, email, role: 'member', status: 'invited' })),
  ];
  await insertChunked('org_memberships', memberships);

  // 3. cohort memberships (active trainees only)
  await insertChunked('cohort_memberships', TRAINEES.map((t) => ({ cohort_id: cohortIdFor(t.cohort), user_id: uid(t.idx) })));

  // 4. per-trainee activity
  const all: Rows = { attempts: [], progress: [], marks: [], mocks: [] };
  for (const t of TRAINEES) {
    const r = buildRows(t);
    all.attempts.push(...r.attempts); all.progress.push(...r.progress);
    all.marks.push(...r.marks); all.mocks.push(...r.mocks);
  }
  await insertChunked('acca_drill_attempts', all.attempts);
  await insertChunked('acca_tutor_progress', all.progress);
  await insertChunked('acca_case_marking', all.marks);
  await insertChunked('acca_mock_attempts', all.mocks);

  return { orgId, septId, decId, counts: { attempts: all.attempts.length, progress: all.progress.length, marks: all.marks.length, mocks: all.mocks.length } };
}

async function summary(septId: string, decId: string) {
  for (const [label, id] of [['Sept-26 APM', septId], ['Dec-26 APM', decId]] as const) {
    const rag = await getCohortReadiness(id, NOW);
    const tally = { green: 0, amber: 0, red: 0 };
    console.log(`\n── ${label} (${rag.length} trainees) ──`);
    for (const t of rag) {
      tally[t.readiness.band]++;
      console.log(`  ${t.readiness.band.toUpperCase().padEnd(6)} ${t.name.padEnd(16)} score=${t.readiness.score.toFixed(2)} ${t.readiness.override ? `[${t.readiness.override}]` : ''}`);
    }
    console.log(`  → G:${tally.green} A:${tally.amber} R:${tally.red}`);
  }
}

async function main() {
  const arg = process.argv[2];

  if (arg === '--dry-run') {
    const rows = TRAINEES.map(buildRows);
    console.log(`PLAN: org "${ORG.name}" (is_demo) | 2 cohorts | ${TRAINEES.length} active + ${INVITED_EMAILS.length} invited`);
    console.log(`  attempts=${rows.reduce((a, r) => a + r.attempts.length, 0)} progress=${rows.reduce((a, r) => a + r.progress.length, 0)} marks=${rows.reduce((a, r) => a + r.marks.length, 0)} mocks=${rows.reduce((a, r) => a + r.mocks.length, 0)}`);
    const byPersona: Record<string, number> = {};
    for (const t of TRAINEES) byPersona[t.persona] = (byPersona[t.persona] ?? 0) + 1;
    console.log('  personas:', byPersona);
    return true;
  }

  console.log('teardown…');
  await teardown();
  if (arg === '--down') { console.log('demo data removed.'); return true; }

  console.log('seeding…');
  const { septId, decId, counts } = await seed();
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

export { TRAINEES, buildRows, NOW, SUBS, type Trainee };
