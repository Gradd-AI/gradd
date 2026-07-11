// lib/org/queries.ts
// Service-role org data-access + readiness assembly for the coordinator dashboard.
//
// These reads are SERVICE-ROLE (bypass RLS) and are gated UPSTREAM by the coordinator
// check (demo cut: hardcoded coordinator; pilot: is_coordinator_of via the /api/org
// route). They are always scoped to a single cohort/org, so demo data never leaks into
// product-wide metrics — the is_demo exclusion only matters for cross-org analytics.
//
// The clock is read at THIS boundary and passed as `now` into the pure formula
// (lib/org/readiness.ts), which never reads the clock itself.

import { createServiceClient } from '@/lib/supabase/server';
import { getMockPaper, MOCK_PAPERS } from '@/lib/acca/mocks';
import { computeReadiness, mockScoreFromMarks, DAY_MS, type ReadinessInput, type ReadinessResult } from './readiness';

const WINDOW_MS = 14 * DAY_MS; // recent = last 14d; prior = 14–28d ago

// Every case_id that belongs to ANY mock paper — used to split a user's case
// markings into mock-case scores vs standalone practice (avoids double-counting).
const MOCK_CASE_IDS = new Set(MOCK_PAPERS.flatMap((p) => p.case_ids));

/** Sub-area = first two chars of an APM lo_code (e.g. 'D2b' → 'D2'). Product-neutral. */
export const subAreaOf = (loCode: string): string => loCode.slice(0, 2);

/** Fictional demo emails encode the name in the local part: derive "Alex Chen". */
export function displayNameFromEmail(email: string | null): string {
  if (!email) return 'Unknown trainee';
  const local = email.split('@')[0] ?? email;
  return local
    .split(/[._-]+/)
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export interface Cohort {
  id: string;
  org_id: string;
  label: string;
  target_sitting: string | null;
  paper: string | null;
  subject: string | null;
}

export interface Org {
  id: string;
  slug: string;
  name: string;
  type: string;
  is_demo: boolean;
}

export interface TraineeReadiness {
  userId: string;
  email: string | null;
  name: string;
  readiness: ReadinessResult;
}

export interface HeatmapCell {
  attempts: number;
  misses: number;
  missRate: number;
  covered: boolean; // >= 1 correct attempt in this sub-area
}

export interface CohortHeatmap {
  subAreas: string[];
  rows: { userId: string; email: string | null; name: string; cells: Record<string, HeatmapCell> }[];
}

// ── Org / cohort lookups ──────────────────────────────────────────────────────

export async function getOrgBySlug(slug: string): Promise<Org | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('orgs')
    .select('id, slug, name, type, is_demo')
    .eq('slug', slug)
    .maybeSingle();
  return (data as Org | null) ?? null;
}

export async function listCohorts(orgId: string): Promise<Cohort[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('cohorts')
    .select('id, org_id, label, target_sitting, paper, subject')
    .eq('org_id', orgId)
    .order('label', { ascending: true });
  return (data as Cohort[] | null) ?? [];
}

export async function getCohortById(cohortId: string): Promise<Cohort | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('cohorts')
    .select('id, org_id, label, target_sitting, paper, subject')
    .eq('id', cohortId)
    .maybeSingle();
  return (data as Cohort | null) ?? null;
}
const getCohort = getCohortById; // internal alias

async function cohortUserIds(cohortId: string): Promise<string[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('cohort_memberships')
    .select('user_id')
    .eq('cohort_id', cohortId);
  return ((data as { user_id: string }[] | null) ?? []).map((r) => r.user_id);
}

async function emailsForOrg(orgId: string): Promise<Map<string, string>> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('org_memberships')
    .select('user_id, email')
    .eq('org_id', orgId)
    .not('user_id', 'is', null);
  const map = new Map<string, string>();
  for (const r of (data as { user_id: string; email: string }[] | null) ?? []) map.set(r.user_id, r.email);
  return map;
}

/** Distinct paper sub-areas from the published drill pool, sorted. The coverage
 *  denominator (and, for the student view, the set to diff against for "not yet
 *  attempted" areas — so the uncovered list only ever offers drillable areas). */
async function allSubAreas(): Promise<string[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('acca_drills')
    .select('lo_code')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('status', 'approved')
    .eq('published', true);
  const set = new Set<string>();
  for (const r of (data as { lo_code: string }[] | null) ?? []) set.add(subAreaOf(r.lo_code));
  return [...set].sort();
}

/** Count of distinct sub-areas — the coverage denominator. */
async function totalSubAreas(): Promise<number> {
  return (await allSubAreas()).length;
}

// ── Raw per-user rows, batched ────────────────────────────────────────────────

interface RawRows {
  attempts: { user_id: string; lo_code: string; outcome: string; created_at: string }[];
  progress: { user_id: string; resolved: boolean; miss_count: number; updated_at: string }[];
  marks: { user_id: string; case_id: string; professional_marks_awarded: number; professional_marks_available: number; marked_at: string }[];
  mocks: { user_id: string; mock_id: string; completed: boolean; started_at: string }[];
}

async function rawRowsForUsers(userIds: string[]): Promise<RawRows> {
  if (userIds.length === 0) return { attempts: [], progress: [], marks: [], mocks: [] };
  const sb = createServiceClient();
  const [a, p, m, k] = await Promise.all([
    sb.from('acca_drill_attempts').select('user_id, lo_code, outcome, created_at').in('user_id', userIds),
    sb.from('acca_tutor_progress').select('user_id, resolved, miss_count, updated_at').in('user_id', userIds),
    sb.from('acca_case_marking').select('user_id, case_id, professional_marks_awarded, professional_marks_available, marked_at').in('user_id', userIds),
    sb.from('acca_mock_attempts').select('user_id, mock_id, completed, started_at').in('user_id', userIds),
  ]);
  return {
    attempts: (a.data as RawRows['attempts'] | null) ?? [],
    progress: (p.data as RawRows['progress'] | null) ?? [],
    marks: (m.data as RawRows['marks'] | null) ?? [],
    mocks: (k.data as RawRows['mocks'] | null) ?? [],
  };
}

function groupBy<T>(rows: T[], key: (r: T) => string): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const k = key(r);
    (map.get(k) ?? map.set(k, []).get(k)!).push(r);
  }
  return map;
}

/** Assemble the pure ReadinessInput for one user from that user's raw rows.
 *  Exported so the demo seeder can offline-verify persona bands without a DB. */
export function buildInput(
  now: number,
  total: number,
  attempts: RawRows['attempts'],
  progress: RawRows['progress'],
  marks: RawRows['marks'],
  mocks: RawRows['mocks'],
): ReadinessInput {
  const recentCut = now - WINDOW_MS;
  const priorCut = now - 2 * WINDOW_MS;

  // Coverage: distinct sub-areas with >= 1 correct attempt.
  const coveredSet = new Set<string>();
  let recentAttempts = 0, recentMisses = 0, priorAttempts = 0, priorMisses = 0;
  let lastActiveAt: number | null = null;
  const touch = (ts: string) => {
    const t = Date.parse(ts);
    if (!Number.isNaN(t) && (lastActiveAt == null || t > lastActiveAt)) lastActiveAt = t;
  };

  for (const at of attempts) {
    const t = Date.parse(at.created_at);
    touch(at.created_at);
    if (at.outcome === 'correct') coveredSet.add(subAreaOf(at.lo_code));
    const isMiss = at.outcome === 'miss';
    if (t >= recentCut) { recentAttempts++; if (isMiss) recentMisses++; }
    else if (t >= priorCut) { priorAttempts++; if (isMiss) priorMisses++; }
  }

  let resolvedDrills = 0, stuckDrills = 0;
  for (const pr of progress) {
    touch(pr.updated_at);
    if (pr.resolved) resolvedDrills++;
    else if ((pr.miss_count ?? 0) >= 2) stuckDrills++;
  }

  // Partition case markings: mock-case marks feed per-mock aggregate scores;
  // standalone (non-mock) case marks feed caseMarkRatios directly. Splitting avoids
  // double-counting the same marking row in both P inputs.
  const marksByCase = new Map<string, { awarded: number; available: number }>();
  const caseMarkRatios: number[] = [];
  for (const mk of marks) {
    touch(mk.marked_at);
    marksByCase.set(mk.case_id, {
      awarded: mk.professional_marks_awarded,
      available: mk.professional_marks_available,
    });
    if (!MOCK_CASE_IDS.has(mk.case_id) && mk.professional_marks_available > 0) {
      caseMarkRatios.push(mk.professional_marks_awarded / mk.professional_marks_available);
    }
  }

  let mocksCompleted = 0;
  const mockScores: number[] = [];
  for (const mo of mocks) {
    touch(mo.started_at);
    if (!mo.completed) continue;
    mocksCompleted++;
    const paper = getMockPaper(mo.mock_id);
    if (!paper) continue;
    // Real mock score: aggregate this user's marks across the paper's cases.
    const paperMarks = paper.case_ids
      .map((cid) => marksByCase.get(cid))
      .filter((v): v is { awarded: number; available: number } => v != null);
    const score = mockScoreFromMarks(paperMarks);
    if (score != null) mockScores.push(score);
  }

  const hasAnyActivity =
    attempts.length > 0 || progress.length > 0 || marks.length > 0 || mocks.length > 0;

  return {
    now,
    lastActiveAt,
    coveredSubAreas: coveredSet.size,
    totalSubAreas: total,
    recentAttempts, recentMisses, priorAttempts, priorMisses,
    resolvedDrills, stuckDrills,
    caseMarkRatios, mockScores, mocksCompleted,
    hasAnyActivity,
  };
}

// ── Public: per-trainee readiness for a cohort ────────────────────────────────

export async function getCohortReadiness(cohortId: string, now: number): Promise<TraineeReadiness[]> {
  const cohort = await getCohort(cohortId);
  if (!cohort) return [];
  const [userIds, total] = await Promise.all([cohortUserIds(cohortId), totalSubAreas()]);
  const [rows, emails] = await Promise.all([rawRowsForUsers(userIds), emailsForOrg(cohort.org_id)]);

  const byUserA = groupBy(rows.attempts, (r) => r.user_id);
  const byUserP = groupBy(rows.progress, (r) => r.user_id);
  const byUserM = groupBy(rows.marks, (r) => r.user_id);
  const byUserK = groupBy(rows.mocks, (r) => r.user_id);

  return userIds.map((userId) => {
    const input = buildInput(
      now, total,
      byUserA.get(userId) ?? [],
      byUserP.get(userId) ?? [],
      byUserM.get(userId) ?? [],
      byUserK.get(userId) ?? [],
    );
    const email = emails.get(userId) ?? null;
    return { userId, email, name: displayNameFromEmail(email), readiness: computeReadiness(input) };
  });
}

// ── Public: sub-area × trainee heatmap for a cohort ───────────────────────────

export async function getCohortHeatmap(cohortId: string): Promise<CohortHeatmap> {
  const cohort = await getCohort(cohortId);
  if (!cohort) return { subAreas: [], rows: [] };
  const userIds = await cohortUserIds(cohortId);
  const [rows, emails] = await Promise.all([rawRowsForUsers(userIds), emailsForOrg(cohort.org_id)]);

  const byUserA = groupBy(rows.attempts, (r) => r.user_id);
  const subAreaSet = new Set<string>();
  for (const at of rows.attempts) subAreaSet.add(subAreaOf(at.lo_code));
  const subAreas = [...subAreaSet].sort();

  const outRows = userIds.map((userId) => {
    const cells: Record<string, HeatmapCell> = {};
    for (const at of byUserA.get(userId) ?? []) {
      const sa = subAreaOf(at.lo_code);
      const cell = (cells[sa] ??= { attempts: 0, misses: 0, missRate: 0, covered: false });
      cell.attempts++;
      if (at.outcome === 'miss') cell.misses++;
      if (at.outcome === 'correct') cell.covered = true;
    }
    for (const sa of Object.keys(cells)) {
      const c = cells[sa];
      c.missRate = c.attempts > 0 ? c.misses / c.attempts : 0;
    }
    const email = emails.get(userId) ?? null;
    return { userId, email, name: displayNameFromEmail(email), cells };
  });

  return { subAreas, rows: outRows };
}

// ── Org overview (cohort cards screen) ────────────────────────────────────────

export interface CohortOverview {
  cohort: Cohort;
  memberCount: number;
  rag: { green: number; amber: number; red: number };
  lastActiveDays: number | null; // most-recent trainee (min days since active)
}
export interface OrgOverview {
  org: Org;
  cohorts: CohortOverview[];
  utilisation: { active: number; invited: number };
}

export async function getOrgUtilisation(orgId: string): Promise<{ active: number; invited: number }> {
  const sb = createServiceClient();
  const [{ count: active }, { count: invited }] = await Promise.all([
    sb.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'active'),
    sb.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'invited'),
  ]);
  return { active: active ?? 0, invited: invited ?? 0 };
}

export async function getOrgOverview(slug: string, now: number): Promise<OrgOverview | null> {
  const org = await getOrgBySlug(slug);
  if (!org) return null;
  const cohorts = await listCohorts(org.id);
  const overviews: CohortOverview[] = await Promise.all(
    cohorts.map(async (c) => {
      const rag = await getCohortReadiness(c.id, now);
      const tally = { green: 0, amber: 0, red: 0 };
      let lastActiveDays: number | null = null;
      for (const t of rag) {
        tally[t.readiness.band]++;
        const d = t.readiness.components.recency.daysSinceActive;
        if (d != null && (lastActiveDays == null || d < lastActiveDays)) lastActiveDays = d;
      }
      return { cohort: c, memberCount: rag.length, rag: tally, lastActiveDays };
    }),
  );
  const sb = createServiceClient();
  const [{ count: active }, { count: invited }] = await Promise.all([
    sb.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', org.id).eq('status', 'active'),
    sb.from('org_memberships').select('*', { count: 'exact', head: true }).eq('org_id', org.id).eq('status', 'invited'),
  ]);
  return { org, cohorts: overviews, utilisation: { active: active ?? 0, invited: invited ?? 0 } };
}

// ── Trainee drill-down (explainability screen) ────────────────────────────────

export interface RecentAttempt { lo_code: string; outcome: string; created_at: string }
export interface TraineeDetail {
  userId: string;
  email: string | null;
  name: string;
  readiness: ReadinessResult;
  coveredSubAreas: string[];
  totalSubAreas: number;
  stuckDrills: number;
  daysSinceActive: number | null;
  recentAttempts: RecentAttempt[];
  marks: { case_id: string; awarded: number; available: number; marked_at: string }[];
  mocks: { mock_id: string; completed: boolean; started_at: string }[];
}

// ── Student self-view (student-facing /acca/progress) ─────────────────────────
// A session-scoped variant of getTraineeDetail: the SAME readiness machinery, but
// scoped to the signed-in user (no org / no email join — a self-serve student may
// have no org row at all). Reads are still SERVICE-ROLE (the four data tables have
// RLS on with no permissive student SELECT policy), gated UPSTREAM by the page's own
// auth guard passing ONLY auth.getUser().id as `userId` — never a client-supplied id.
//
// The readiness result is computed but its band/score are NEVER rendered to the
// student: the student view is a doorway (what to do next), not a verdict.

/** One weak sub-area, ranked so the student sees the biggest lever first. */
export interface WeakArea {
  subArea: string;
  attempts: number;
  misses: number;
  missRate: number;
}

export interface MyProgress {
  /** Computed but band/score are NOT shown to students — kept for internal derivation. */
  readiness: ReadinessResult;
  hasAnyActivity: boolean;
  lastActiveAt: number | null;
  daysSinceActive: number | null;
  coveredSubAreas: string[];
  uncoveredSubAreas: string[]; // drillable areas with no correct attempt yet
  totalSubAreas: number;
  weakAreas: WeakArea[];       // sub-areas with a miss, worst miss-rate first
  recentAttempts: RecentAttempt[];
}

const MAX_WEAK_AREAS = 6;

export async function getMyProgress(userId: string, now: number): Promise<MyProgress> {
  const [subAreas, rows] = await Promise.all([allSubAreas(), rawRowsForUsers([userId])]);
  const total = subAreas.length;
  const input = buildInput(now, total, rows.attempts, rows.progress, rows.marks, rows.mocks);
  const readiness = computeReadiness(input);

  // Per-sub-area tallies drive both coverage (>= 1 correct) and the weak-area ranking.
  const covered = new Set<string>();
  const tally = new Map<string, { attempts: number; misses: number }>();
  for (const a of rows.attempts) {
    const sa = subAreaOf(a.lo_code);
    const t = (tally.get(sa) ?? tally.set(sa, { attempts: 0, misses: 0 }).get(sa)!);
    t.attempts++;
    if (a.outcome === 'miss') t.misses++;
    if (a.outcome === 'correct') covered.add(sa);
  }

  // Weak = a sub-area the student has actually missed in. Worst miss-rate first,
  // ties broken by volume (a 60% over 10 attempts outranks 60% over 2).
  const weakAreas: WeakArea[] = [...tally.entries()]
    .map(([subArea, t]) => ({ subArea, attempts: t.attempts, misses: t.misses, missRate: t.misses / t.attempts }))
    .filter((w) => w.misses > 0)
    .sort((a, b) => b.missRate - a.missRate || b.attempts - a.attempts)
    .slice(0, MAX_WEAK_AREAS);

  // Uncovered = drillable areas with no correct attempt yet — the "start here" list.
  const uncoveredSubAreas = subAreas.filter((sa) => !covered.has(sa));

  // Enough history for the 25-day activity ribbon, the streak, and the recent-attempts
  // list — a single student's full attempt set is small, so no server-side cap needed.
  const recentAttempts = [...rows.attempts]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 40)
    .map((a) => ({ lo_code: a.lo_code, outcome: a.outcome, created_at: a.created_at }));

  return {
    readiness,
    hasAnyActivity: input.hasAnyActivity,
    lastActiveAt: input.lastActiveAt,
    daysSinceActive: readiness.components.recency.daysSinceActive,
    coveredSubAreas: [...covered].sort(),
    uncoveredSubAreas,
    totalSubAreas: total,
    weakAreas,
    recentAttempts,
  };
}

export async function getTraineeDetail(orgId: string, userId: string, now: number): Promise<TraineeDetail | null> {
  const [total, rows, emails] = await Promise.all([totalSubAreas(), rawRowsForUsers([userId]), emailsForOrg(orgId)]);
  const input = buildInput(now, total, rows.attempts, rows.progress, rows.marks, rows.mocks);
  const readiness = computeReadiness(input);

  const covered = new Set<string>();
  for (const a of rows.attempts) if (a.outcome === 'correct') covered.add(subAreaOf(a.lo_code));
  const stuckDrills = rows.progress.filter((p) => !p.resolved && (p.miss_count ?? 0) >= 2).length;
  const recentAttempts = [...rows.attempts]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 15)
    .map((a) => ({ lo_code: a.lo_code, outcome: a.outcome, created_at: a.created_at }));
  const email = emails.get(userId) ?? null;

  return {
    userId, email, name: displayNameFromEmail(email), readiness,
    coveredSubAreas: [...covered].sort(), totalSubAreas: total,
    stuckDrills, daysSinceActive: readiness.components.recency.daysSinceActive,
    recentAttempts,
    marks: rows.marks.map((m) => ({ case_id: m.case_id, awarded: m.professional_marks_awarded, available: m.professional_marks_available, marked_at: m.marked_at })),
    mocks: rows.mocks.map((m) => ({ mock_id: m.mock_id, completed: m.completed, started_at: m.started_at })),
  };
}
