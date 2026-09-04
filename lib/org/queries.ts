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
import { ACCA_PAPERS, type AccaPaper } from '@/lib/acca/paper';
import { computeReadiness, mockScoreFromMarks, DAY_MS, type ReadinessInput, type ReadinessResult } from './readiness';

const WINDOW_MS = 14 * DAY_MS; // recent = last 14d; prior = 14–28d ago

// Every case_id that belongs to ANY mock paper — used to split a user's case
// markings into mock-case scores vs standalone practice (avoids double-counting).
const MOCK_CASE_IDS = new Set(MOCK_PAPERS.flatMap((p) => p.case_ids));

/** Sub-area = first two chars of an ACCA lo_code (e.g. 'D2b' → 'D2'). Product-neutral in
 *  shape, but AFM and APM prefixes COLLIDE (both use A1/B1/…) — so any per-paper view must
 *  scope its rows to one paper BEFORE bucketing, and label via subAreaName(paper, …). */
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

// EXPORTED (2026-09-03) so the trainee drill-down can check that the user id in the URL is
// actually in the cohort it is being viewed under. It was private, and the page never asked.
export async function cohortUserIds(cohortId: string): Promise<string[]> {
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
async function allSubAreas(paper: AccaPaper = 'APM'): Promise<string[]> {
  const sb = createServiceClient();
  const { data } = await sb
    .from('acca_drills')
    .select('lo_code')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true);
  const set = new Set<string>();
  for (const r of (data as { lo_code: string }[] | null) ?? []) set.add(subAreaOf(r.lo_code));
  return [...set].sort();
}

/** Count of distinct sub-areas — the coverage denominator. */
async function totalSubAreas(paper: AccaPaper = 'APM'): Promise<number> {
  return (await allSubAreas(paper)).length;
}

// ── THE DRILL JOIN, AND WHY EVERY DRILL-BASED READ MUST GO THROUGH IT ─────────
// `acca_drill_attempts` and `acca_tutor_progress` carry a `drill_id` and NO paper column,
// and NOTHING constrains that id to a drill that exists. Three row classes therefore reach
// an unjoined read, and all three are wrong for a coverage/readiness number:
//
//   1. SEEDED rows — scripts/seed-demo-org.ts writes fabricated `drill_id`s. Measured
//      2026-09-02: 311 of 1,222 attempt rows, carrying 191 of the 216 `correct` outcomes
//      (a 61.4% correct rate against 2.7% on real drills). An unjoined coordinator view
//      reported demo fiction as product performance.
//   2. UNPUBLISHED / unapproved drills — the coverage DENOMINATOR (`allSubAreas`) filters
//      `status='approved' AND published=true`, so a numerator that does not is counting
//      into a denominator that excludes it. That is what produced 13 covered sub-areas
//      against a total of 12, which `computeReadiness` then CLAMPED to 1.0 rather than
//      rejecting — a saturated 0.30-weight component built out of rows nobody can serve.
//   3. THE OTHER PAPER — AFM and APM lo_code prefixes collide exactly (both use A1/B1/…),
//      so an AFM attempt buckets into an APM sub-area silently. `subAreaOf`'s own comment
//      has said "scope its rows to one paper BEFORE bucketing" since it was written.
//
// The map is therefore SERVABLE drills only, and the filter is an EQUALITY on paper_code:
// an unresolved id (seeded, deleted, unpublished, other paper) is absent from the map, and
// `undefined === paper` is false, so it drops. Failure direction is exclusion, never
// silent inclusion.
//
// ⚠️ TRADE-OFF, ACCEPTED AND FLAGGED: unpublishing a drill retroactively removes a genuine
// past attempt from these numbers. That is the correct direction while the denominator is
// published-only — a covered sub-area a student can no longer be served is not coverage —
// but it does mean a coverage figure is a statement about the CURRENT pool, not a
// historical record. Do not describe it as "what they have done".
async function servableDrills(drillIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (drillIds.length === 0) return map;
  const sb = createServiceClient();
  const { data } = await sb
    .from('acca_drills')
    .select('id, paper_code')
    .in('id', drillIds)
    .eq('exam_board', 'ACCA')
    .eq('status', 'approved')
    .eq('published', true);
  for (const r of (data as { id: string; paper_code: string }[] | null) ?? []) map.set(r.id, r.paper_code);
  return map;
}

/** Keep only rows whose drill resolves, through `servable`, to THIS paper. PURE — the map is
 *  supplied, so the rule is fixtured without a DB (scripts/test-org-readiness.ts T15–T19). */
export function scopeDrillRows<T extends { drill_id: string }>(
  rows: readonly T[],
  servable: ReadonlyMap<string, string>,
  paper: AccaPaper,
): T[] {
  return rows.filter((r) => servable.get(r.drill_id) === paper);
}

/** A cohort's paper, resolved for bucketing. `cohorts.paper` is free text (`string | null`),
 *  so an unrecognised or absent value falls back to 'APM' — DELIBERATELY the same default as
 *  `totalSubAreas()`/`allSubAreas()`, because the numerator and the denominator must agree on
 *  which paper they are counting or the ratio is meaningless. */
export function cohortPaper(paper: string | null | undefined): AccaPaper {
  return (ACCA_PAPERS as readonly string[]).includes(paper ?? '') ? (paper as AccaPaper) : 'APM';
}

// ── Raw per-user rows, batched ────────────────────────────────────────────────

interface RawRows {
  attempts: { user_id: string; drill_id: string; lo_code: string; outcome: string; created_at: string }[];
  progress: { user_id: string; drill_id: string; resolved: boolean; miss_count: number; updated_at: string }[];
  marks: { user_id: string; case_id: string; professional_marks_awarded: number; professional_marks_available: number; marked_at: string }[];
  mocks: { user_id: string; mock_id: string; completed: boolean; started_at: string }[];
}

/** Raw rows for a set of users, drill-based rows SCOPED to `paper` through the servable-drill
 *  join. `paper` is required at every call site rather than defaulted here: the caller always
 *  knows which paper its denominator is for, and a default would silently hand an AFM view
 *  APM-scoped rows. */
async function rawRowsForUsers(userIds: string[], paper: AccaPaper): Promise<RawRows> {
  if (userIds.length === 0) return { attempts: [], progress: [], marks: [], mocks: [] };
  const sb = createServiceClient();
  const [a, p, m, k] = await Promise.all([
    sb.from('acca_drill_attempts').select('user_id, drill_id, lo_code, outcome, created_at').in('user_id', userIds),
    sb.from('acca_tutor_progress').select('user_id, drill_id, resolved, miss_count, updated_at').in('user_id', userIds),
    sb.from('acca_case_marking').select('user_id, case_id, professional_marks_awarded, professional_marks_available, marked_at').in('user_id', userIds),
    sb.from('acca_mock_attempts').select('user_id, mock_id, completed, started_at').in('user_id', userIds),
  ]);
  const attempts = (a.data as RawRows['attempts'] | null) ?? [];
  const progress = (p.data as RawRows['progress'] | null) ?? [];

  // ONE join for both drill-based tables — see servableDrills' header for the three row
  // classes this excludes and why an unjoined read is wrong.
  const servable = await servableDrills(
    [...new Set([...attempts.map((r) => r.drill_id), ...progress.map((r) => r.drill_id)])].filter(Boolean),
  );

  // marks/mocks are CASE-based (acca_case_marking / acca_mock_attempts): they carry their own
  // real foreign keys and no drill_id, so the join does not apply to them. Both are returned
  // UNSCOPED here and each caller scopes them — `getMyProgress` resolves mocks through the
  // registry and marks through `casePaperCodes` (2026-09-04). The ORG readers still take them
  // unscoped, which is unchanged behaviour and remains a separate open item: scoping them
  // there moves live coordinator readiness scores and is not a change to make in passing.
  return {
    attempts: scopeDrillRows(attempts, servable, paper),
    progress: scopeDrillRows(progress, servable, paper),
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
  const paper = cohortPaper(cohort.paper);
  const [userIds, total] = await Promise.all([cohortUserIds(cohortId), totalSubAreas(paper)]);
  const [rows, emails] = await Promise.all([rawRowsForUsers(userIds, paper), emailsForOrg(cohort.org_id)]);

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
  const paper = cohortPaper(cohort.paper);
  const userIds = await cohortUserIds(cohortId);
  const [rows, emails, subAreas] = await Promise.all([
    rawRowsForUsers(userIds, paper), emailsForOrg(cohort.org_id), allSubAreas(paper),
  ]);

  const byUserA = groupBy(rows.attempts, (r) => r.user_id);
  // ── COLUMNS COME FROM THE PUBLISHED POOL, NOT FROM THE ATTEMPTS ─────────────
  // This used to be `for (const at of rows.attempts) subAreaSet.add(subAreaOf(at.lo_code))`,
  // which meant a sub-area NOBODY IN THE COHORT HAD TOUCHED did not render as an empty
  // column — it did not render at all. Meanwhile `getCohortReadiness` divides coverage by
  // `totalSubAreas(paper)`, the published pool, so the two halves of one screen disagreed
  // about how many sub-areas exist.
  //
  // ⚠️ SIGHTED, NOT THEORISED (2026-09-02). The first re-seed of demo-advisory touched 11 of
  // the 12 published APM sub-areas — D1 was never selected — and the heatmap rendered 11
  // columns beside coverage figures reading "/12". THE DROPPED COLUMN WAS THE ONE CARRYING
  // THE INFORMATION: nobody has started D1. A screen whose entire job is to show a
  // coordinator where a cohort is weak was structurally incapable of showing the weakest
  // state a sub-area can be in — untouched. A cohort that has genuinely not begun an area is
  // the normal early-prep case, not an edge case.
  //
  // `cells` stays SPARSE on purpose: an untouched sub-area has no key, and both render sites
  // already read it as "no data" (`r.cells[sa]` → `cellTone(null)`; the roll-up filters on
  // `!= null` and shows null when no trainee has data). Writing a zero-filled cell instead
  // would make "0 attempts" indistinguishable from "0% miss rate", which is the opposite
  // reading. Nothing in computeReadiness or the coverage definition is touched.

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

export interface RecentAttempt { lo_code: string; outcome: string; created_at: string; drill_id: string }
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
}
// No `marks`/`mocks` here BY DECISION: the raw case-marking and mock-attempt rows still feed
// readiness via buildInput(), but the trainee page renders the sat mock in full through
// getTraineeSitResults() — with real case titles. Re-exposing them invites a second, thinner
// rendering of the same facts keyed by truncated UUIDs, which is what was removed.

// ── Student self-view (student-facing /acca/progress) ─────────────────────────
// A session-scoped variant of getTraineeDetail: the SAME readiness machinery, but
// scoped to the signed-in user (no org / no email join — a self-serve student may
// have no org row at all). Reads are still SERVICE-ROLE (the four data tables have
// RLS on with no permissive student SELECT policy), gated UPSTREAM by the page's own
// auth guard passing ONLY auth.getUser().id as `userId` — never a client-supplied id.
//
// The readiness result is computed but its band/score are NEVER rendered to the
// student: the student view is a doorway (what to do next), not a verdict.

/** Recent-vs-earlier direction within a sub-area (null = too little history to call). */
export type AreaTrend = 'improving' | 'declining' | 'flat' | null;

/** One weak sub-area, ranked so the student sees the biggest lever first. */
export interface WeakArea {
  subArea: string;
  attempts: number;
  misses: number;
  missRate: number;
  trend: AreaTrend; // recent (≤14d) miss-rate vs prior (14–28d) — the trajectory nudge
}

/** A drill the student stalled on (miss_count ≥ 2, unresolved) — resumable by id. */
export interface StuckDrill {
  drillId: string;
  loCode: string;
  topic: string;
  missCount: number;
}

export interface MyProgress {
  /** Computed but band/score are NOT shown to students — kept for internal derivation. */
  readiness: ReadinessResult;
  hasAnyActivity: boolean;
  lastActiveAt: number | null;
  daysSinceActive: number | null;        // cross-source (attempts + progress + marks + mocks)
  daysSinceLastAttempt: number | null;   // attempt-log ONLY — drives the recency nudge so it
                                         // can never contradict the (attempt-log) activity ribbon
  streakDays: number;          // consecutive active days up to today (1-day grace)
  coveredSubAreas: string[];
  uncoveredSubAreas: string[]; // drillable areas with no correct attempt yet
  totalSubAreas: number;
  weakAreas: WeakArea[];       // sub-areas with a miss, worst miss-rate first
  stuckDrills: StuckDrill[];   // resumable stalled drills, most-missed first
  recentAttempts: RecentAttempt[];
  marks: { case_id: string; awarded: number; available: number; marked_at: string }[];
  /** Attempt rows for the readiness inputs and the "has this student sat anything" test.
   *  NOT the list the student's results index is built from — that is `listSitAttempts`
   *  (lib/acca/sit-report.ts), which is the one definition of an OPENABLE sitting and
   *  refuses the many completed-but-empty attempts these rows include. */
  mocks: { mock_id: string; completed: boolean; started_at: string }[];
}

/** Which paper each case belongs to. id-addressed, so no paper predicate — the point of the
 *  lookup is to LEARN the paper, and constraining it to one would answer the question by
 *  assuming it. Returns only the ids that resolve; a mark on a deleted case drops out, which
 *  is the safe direction (an unattributable mark is not silently counted into a paper). */
async function casePaperCodes(caseIds: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (caseIds.length === 0) return map;
  const sb = createServiceClient();
  const { data } = await sb.from('acca_cases').select('id, paper_code').in('id', caseIds);
  for (const r of ((data ?? []) as Array<{ id: string; paper_code: string | null }>)) {
    if (r.paper_code) map.set(r.id, r.paper_code);
  }
  return map;
}

/** Topic (and lo_code) for a set of drill ids — used to label stuck drills by title
 *  rather than a bare uuid. id-addressed (globally unique), so NOT paper-scoped — the
 *  caller's rows are already scoped to one paper. Only currently-published drills resolve;
 *  a stale/unpublished id is dropped (no resume that would dead-end). */
async function drillTitles(drillIds: string[]): Promise<Map<string, { topic: string; loCode: string }>> {
  const map = new Map<string, { topic: string; loCode: string }>();
  if (drillIds.length === 0) return map;
  const sb = createServiceClient();
  const { data } = await sb
    .from('acca_drills')
    .select('id, topic, lo_code')
    .in('id', drillIds)
    .eq('exam_board', 'ACCA')
    .eq('status', 'approved')
    .eq('published', true);
  for (const r of (data as { id: string; topic: string; lo_code: string }[] | null) ?? []) {
    map.set(r.id, { topic: r.topic, loCode: r.lo_code });
  }
  return map;
}

const MAX_WEAK_AREAS = 6;
const TREND_MIN_ATTEMPTS = 2;  // per window, before we'll call a direction
const TREND_EPS = 0.15;        // miss-rate delta below this reads as flat (noise guard)

export async function getMyProgress(userId: string, now: number, paper: AccaPaper = 'APM'): Promise<MyProgress> {
  const [subAreas, rows] = await Promise.all([allSubAreas(paper), rawRowsForUsers([userId], paper)]);
  const total = subAreas.length;

  // Drill-based rows arrive ALREADY scoped to `paper` (rawRowsForUsers → servableDrills), which is
  // where the local drill_id → paper_code filter that used to live here has moved. That is a
  // behaviour change, deliberate, and in the SAME class as the coordinator fix: the old filter
  // tested EXISTENCE only, so this page's numerator counted attempts on unpublished drills into a
  // denominator (allSubAreas) that already filtered `approved`+`published`. Same bug, same file,
  // 300 lines apart.
  const attempts = rows.attempts;
  const progress = rows.progress;

  // ── 🔴 FIXED 2026-09-04 — THIS WAS `paper === 'APM' ? rows.mocks : []` ──────
  // The comment that justified it read "marks/mocks are APM-only artefacts today (no AFM
  // cases/mocks exist)". That was true when written and FALSE from 2026-07-29, the day AFM
  // Mock 1 was published — so for five weeks every AFM student's progress page showed no
  // mock and no case marks at all, and the one account holding real banded sit data is the
  // AFM one. A stale premise in a comment kept a live surface empty.
  //
  // Scoped properly now rather than re-defaulted. A mock resolves to its paper through the
  // registry, which is exact and pure — `mock_id`s are unique across both papers by
  // construction, which is the same fact `mockPaperCaseIds` relies on.
  const mocks = rows.mocks.filter((m) => getMockPaper(m.mock_id)?.paper === paper);

  // Case marks resolve through the case's own `paper_code`. Mock cases could have come from
  // the registry, but standalone practice cases are not in it, and a rule that covers half
  // the rows is how the next reader concludes the other half do not exist. One id-addressed
  // lookup, scoped to the ids actually present.
  const casePapers = await casePaperCodes([...new Set(rows.marks.map((m) => m.case_id))]);
  const marks = rows.marks.filter((m) => casePapers.get(m.case_id) === paper);

  const input = buildInput(now, total, attempts, progress, marks, mocks);
  const readiness = computeReadiness(input);

  const recentCut = now - WINDOW_MS;
  const priorCut = now - 2 * WINDOW_MS;

  // Per-sub-area tallies drive coverage (>= 1 correct), the weak-area ranking, and the
  // trajectory (recent vs prior miss-rate within the same area).
  const covered = new Set<string>();
  interface SA { attempts: number; misses: number; rA: number; rM: number; pA: number; pM: number }
  const tally = new Map<string, SA>();
  const activeDays = new Set<number>();
  for (const a of attempts) {
    const sa = subAreaOf(a.lo_code);
    const t = (tally.get(sa) ?? tally.set(sa, { attempts: 0, misses: 0, rA: 0, rM: 0, pA: 0, pM: 0 }).get(sa)!);
    const ts = Date.parse(a.created_at);
    const isMiss = a.outcome === 'miss';
    t.attempts++;
    if (isMiss) t.misses++;
    if (a.outcome === 'correct') covered.add(sa);
    if (ts >= recentCut) { t.rA++; if (isMiss) t.rM++; }
    else if (ts >= priorCut) { t.pA++; if (isMiss) t.pM++; }
    const di = Math.floor((now - ts) / DAY_MS);
    if (di >= 0) activeDays.add(di);
  }

  const trendOf = (t: SA): AreaTrend => {
    if (t.rA < TREND_MIN_ATTEMPTS || t.pA < TREND_MIN_ATTEMPTS) return null;
    const delta = t.pM / t.pA - t.rM / t.rA; // prior misses − recent misses; >0 = fewer now
    if (delta > TREND_EPS) return 'improving';
    if (delta < -TREND_EPS) return 'declining';
    return 'flat';
  };

  // Weak = a sub-area the student has actually missed in. Worst miss-rate first,
  // ties broken by volume (a 60% over 10 attempts outranks 60% over 2).
  const weakAreas: WeakArea[] = [...tally.entries()]
    .map(([subArea, t]) => ({ subArea, attempts: t.attempts, misses: t.misses, missRate: t.misses / t.attempts, trend: trendOf(t) }))
    .filter((w) => w.misses > 0)
    .sort((a, b) => b.missRate - a.missRate || b.attempts - a.attempts)
    .slice(0, MAX_WEAK_AREAS);

  // Streak: consecutive active days up to today, with a 1-day grace so "haven't drilled
  // yet today" doesn't read as a broken streak. Free off the same day-bucketing.
  let streakDays = 0;
  if (activeDays.has(0) || activeDays.has(1)) {
    let d = activeDays.has(0) ? 0 : 1;
    while (activeDays.has(d)) { streakDays++; d++; }
  }

  // Uncovered = drillable areas with no correct attempt yet — the "start here" list.
  const uncoveredSubAreas = subAreas.filter((sa) => !covered.has(sa));

  // Stuck = unresolved drills the student has missed ≥2×. Resolve titles so we can show
  // them by name and deep-link a resume (?drill_id=). Drills that no longer resolve as a
  // published APM drill are dropped (can't offer a resume that would dead-end).
  const stuckRows = progress
    .filter((pr) => !pr.resolved && (pr.miss_count ?? 0) >= 2)
    .sort((a, b) => (b.miss_count ?? 0) - (a.miss_count ?? 0));
  const titles = await drillTitles(stuckRows.map((pr) => pr.drill_id));
  const stuckDrills: StuckDrill[] = stuckRows
    .map((pr) => {
      const meta = titles.get(pr.drill_id);
      return meta ? { drillId: pr.drill_id, loCode: meta.loCode, topic: meta.topic, missCount: pr.miss_count ?? 0 } : null;
    })
    .filter((d): d is StuckDrill => d != null);

  // Enough history for the 25-day activity ribbon, the streak, and the recent-attempts
  // list — a single student's full attempt set is small, so no server-side cap needed.
  const recentAttempts = [...attempts]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 40)
    .map((a) => ({ lo_code: a.lo_code, outcome: a.outcome, created_at: a.created_at, drill_id: a.drill_id }));

  // Attempt-log recency, independent of tutor_progress/marks/mocks. With zero attempts
  // this is null → the page shows the first-drill nudge, matching the empty ribbon (a
  // user with pre-log tutor_progress rows but no logged attempts must not read as "active").
  const lastAttemptAt = attempts.reduce<number | null>((mx, a) => {
    const t = Date.parse(a.created_at);
    return Number.isNaN(t) ? mx : mx == null || t > mx ? t : mx;
  }, null);
  const daysSinceLastAttempt = lastAttemptAt == null ? null : Math.floor((now - lastAttemptAt) / DAY_MS);

  return {
    readiness,
    hasAnyActivity: input.hasAnyActivity,
    lastActiveAt: input.lastActiveAt,
    daysSinceActive: readiness.components.recency.daysSinceActive,
    daysSinceLastAttempt,
    streakDays,
    coveredSubAreas: [...covered].sort(),
    uncoveredSubAreas,
    totalSubAreas: total,
    weakAreas,
    stuckDrills,
    recentAttempts,
    marks: marks.map((m) => ({ case_id: m.case_id, awarded: m.professional_marks_awarded, available: m.professional_marks_available, marked_at: m.marked_at })),
    mocks: mocks.map((m) => ({ mock_id: m.mock_id, completed: m.completed, started_at: m.started_at })),
  };
}

export async function getTraineeDetail(orgId: string, userId: string, now: number): Promise<TraineeDetail | null> {
  // No cohort is in scope on this route, so the paper is STATED rather than defaulted inside the
  // helper — and it is the same 'APM' that totalSubAreas() already assumed here, so numerator and
  // denominator agree. A per-paper trainee drill-down is an open item, not a silent default.
  const paper: AccaPaper = 'APM';
  const [total, rows, emails] = await Promise.all([totalSubAreas(paper), rawRowsForUsers([userId], paper), emailsForOrg(orgId)]);
  const input = buildInput(now, total, rows.attempts, rows.progress, rows.marks, rows.mocks);
  const readiness = computeReadiness(input);

  const covered = new Set<string>();
  for (const a of rows.attempts) if (a.outcome === 'correct') covered.add(subAreaOf(a.lo_code));
  const stuckDrills = rows.progress.filter((p) => !p.resolved && (p.miss_count ?? 0) >= 2).length;
  const recentAttempts = [...rows.attempts]
    .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
    .slice(0, 15)
    .map((a) => ({ lo_code: a.lo_code, outcome: a.outcome, created_at: a.created_at, drill_id: a.drill_id }));
  const email = emails.get(userId) ?? null;

  return {
    userId, email, name: displayNameFromEmail(email), readiness,
    coveredSubAreas: [...covered].sort(), totalSubAreas: total,
    stuckDrills, daysSinceActive: readiness.components.recency.daysSinceActive,
    recentAttempts,
  };
}
