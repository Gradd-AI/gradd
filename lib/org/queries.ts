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
import { computeReadiness, DAY_MS, type ReadinessInput, type ReadinessResult } from './readiness';

const WINDOW_MS = 14 * DAY_MS; // recent = last 14d; prior = 14–28d ago

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

async function getCohort(cohortId: string): Promise<Cohort | null> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('cohorts')
    .select('id, org_id, label, target_sitting, paper, subject')
    .eq('id', cohortId)
    .maybeSingle();
  return (data as Cohort | null) ?? null;
}

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

/** Distinct paper sub-areas from the published drill pool — the coverage denominator. */
async function totalSubAreas(): Promise<number> {
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
  return set.size;
}

// ── Raw per-user rows, batched ────────────────────────────────────────────────

interface RawRows {
  attempts: { user_id: string; lo_code: string; outcome: string; created_at: string }[];
  progress: { user_id: string; resolved: boolean; miss_count: number; updated_at: string }[];
  marks: { user_id: string; professional_marks_awarded: number; professional_marks_available: number; marked_at: string }[];
  mocks: { user_id: string; completed: boolean; started_at: string }[];
}

async function rawRowsForUsers(userIds: string[]): Promise<RawRows> {
  if (userIds.length === 0) return { attempts: [], progress: [], marks: [], mocks: [] };
  const sb = createServiceClient();
  const [a, p, m, k] = await Promise.all([
    sb.from('acca_drill_attempts').select('user_id, lo_code, outcome, created_at').in('user_id', userIds),
    sb.from('acca_tutor_progress').select('user_id, resolved, miss_count, updated_at').in('user_id', userIds),
    sb.from('acca_case_marking').select('user_id, professional_marks_awarded, professional_marks_available, marked_at').in('user_id', userIds),
    sb.from('acca_mock_attempts').select('user_id, completed, started_at').in('user_id', userIds),
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

/** Assemble the pure ReadinessInput for one user from that user's raw rows. */
function buildInput(
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

  const caseMarkRatios: number[] = [];
  for (const mk of marks) {
    touch(mk.marked_at);
    if (mk.professional_marks_available > 0) {
      caseMarkRatios.push(mk.professional_marks_awarded / mk.professional_marks_available);
    }
  }

  let mocksCompleted = 0;
  for (const mo of mocks) {
    touch(mo.started_at);
    if (mo.completed) mocksCompleted++;
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
    caseMarkRatios, mocksCompleted,
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
