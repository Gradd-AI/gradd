// lib/org/readiness.ts
// Deterministic Green/Amber/Red readiness signal (v1) for a coordinator dashboard.
// PURE — no DB, no model calls, no clock read: `now` is injected so the same inputs
// always yield the same result (unit-testable; see scripts/test-org-readiness.ts).
//
// FORMULA (approved diagnose-and-propose report, §3):
//   Four component scores in [0,1], weighted mean, banded, with hard overrides.
//     R Recency     0.30  — how recently the trainee was active
//     C Coverage    0.30  — breadth of syllabus sub-areas with a correct attempt
//     M Miss-rate   0.25  — current miss level + improving/worsening slope
//     P Assessment  0.15  — case professional-marks avg / mock-sat floor (present-only)
//   M AND P ARE BOTH PRESENT-ONLY. When a component has no data it is null, its weight is
//   zeroed, and the remaining weights are renormalised to sum to 1 — never scored as 0, and
//   never given a neutral stand-in. A 0 says "measured, and bad"; a 0.5 says "measured, and
//   middling"; both are claims about a trainee nobody has measured.
//     P is absent when there are no marks and no completed mock.
//     M is absent when fewer than MIN_ATTEMPTS_FOR_SLOPE attempts fall in the two windows.
//
//   M, when present, blends the recent miss-level with the recent-vs-prior trend, so an
//   improving trainee reads higher than a high-activity-but-flat one.
//   It used to DEGRADE below that threshold to a proxy — resolved/(resolved+stuck) — which
//   was DELETED on 2026-09-04 rather than repaired. See the block above missRateScore.
//
//   OVERRIDES beat the composite (an at-risk trainee is never painted green by history):
//     never-started    — no activity of any kind            → Red
//     disengaged-21d   — last active > 21 days ago           → Red
//
// Everything is explainable one click deep: the result carries every sub-score and the
// raw inputs that produced it, plus the exact weights used.

export interface ReadinessInput {
  /** Injected wall-clock (ms epoch). Never read the clock inside this module. */
  now: number;
  /** Most recent activity across all sources (ms epoch), or null if never active. */
  lastActiveAt: number | null;

  // Coverage ---------------------------------------------------------------
  /** Distinct syllabus sub-areas with >= 1 CORRECT attempt. */
  coveredSubAreas: number;
  /** Total sub-areas in the paper (denominator; derived from the drill pool). */
  totalSubAreas: number;

  // Miss-rate: the two time windows -----------------------------------------
  recentAttempts: number; // attempts in the recent window (e.g. last 14d)
  recentMisses: number;
  priorAttempts: number;  // attempts in the prior window (e.g. 14–28d ago)
  priorMisses: number;

  // ⚠️ NO LONGER SCORED — DISPLAY CONTEXT ONLY (2026-09-04).
  // These two were the deleted miss-rate proxy's numerator and denominator. They are kept on
  // the input because the coordinator screen still SHOWS them (how many drills stalled, how
  // many are marked resolved) and because removing them would silently drop the only surviving
  // description of a sparse trainee's engagement. Nothing in this module reads them any more:
  // if you are about to score with `resolvedDrills`, read the block above `missRateScore`
  // first — the flag does not mean what its name implies.
  /** acca_tutor_progress.resolved = true. Set BOTH by a correct answer AND by the earned
   *  reveal (app/api/acca/tutor/route.ts:1704 and :1576), so it cannot distinguish them. */
  resolvedDrills: number;
  stuckDrills: number;    // miss_count >= 2 AND resolved = false

  // Assessment (present-only) ----------------------------------------------
  /** STANDALONE (non-mock) case ratios: professional_marks_awarded / available. */
  caseMarkRatios: number[];
  /** Per completed mock: aggregated professional-marks ratio across the mock's
   *  cases (sum awarded / sum available). Real mock score — replaces the old floor. */
  mockScores: number[];
  mocksCompleted: number;

  /** True if the trainee has ANY recorded activity (attempts/progress/mock/mark). */
  hasAnyActivity: boolean;
}

export type Band = 'green' | 'amber' | 'red';
export type Override = 'never-started' | 'disengaged-21d' | null;

export interface ReadinessResult {
  band: Band;
  score: number;        // 0..1 composite (the value banded, pre-override)
  override: Override;   // when set, band is forced to red regardless of score
  components: {
    recency:    { score: number; daysSinceActive: number | null };
    coverage:   { score: number; covered: number; total: number };
    /** NULL when there were fewer than MIN_ATTEMPTS_FOR_SLOPE attempts in the 28-day
     *  window — the component has no data and takes no weight. Never 0, never a stand-in.
     *  `windowedAttempts` is what explains the null to a reader. */
    missRate:   { score: number | null; recentMissRate: number; priorMissRate: number; usedSlope: boolean; windowedAttempts: number };
    assessment: { score: number | null; caseAvg: number | null; mockAvg: number | null; mocksCompleted: number };
  };
  weightsUsed: { recency: number; coverage: number; missRate: number; assessment: number };
}

// ── Tunables (single source of truth; the tests pin these) ────────────────────
export const DAY_MS = 86_400_000;
export const DISENGAGED_DAYS = 21;
export const MIN_ATTEMPTS_FOR_SLOPE = 4;
export const GREEN_AT = 0.66;
export const AMBER_AT = 0.40;
const BASE_WEIGHTS = { recency: 0.30, coverage: 0.30, missRate: 0.25, assessment: 0.15 };

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);
const ratio = (num: number, den: number) => (den > 0 ? num / den : 0);
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

// ── Mock score (pure) ─────────────────────────────────────────────────────────
// Aggregate a user's professional-marks across ONE mock's cases into a single
// ratio: sum(awarded) / sum(available). Null when the mock has no marked cases
// (no score exists — do not invent one). Callers pass the case_marking rows that
// belong to the mock's case_ids (see lib/org/queries.ts + lib/acca/mocks.ts).
// Fixes data-audit gap #3: mocks store no score, so we compute one at query time.
export function mockScoreFromMarks(marks: { awarded: number; available: number }[]): number | null {
  let a = 0, v = 0;
  for (const m of marks) { a += m.awarded; v += m.available; }
  return v > 0 ? clamp01(a / v) : null;
}

// ── Component R: recency ──────────────────────────────────────────────────────
function recencyScore(now: number, lastActiveAt: number | null): { score: number; days: number | null } {
  if (lastActiveAt == null) return { score: 0, days: null };
  const days = (now - lastActiveAt) / DAY_MS;
  const score = days <= 3 ? 1.0 : days <= 7 ? 0.6 : days <= 14 ? 0.3 : 0;
  return { score, days };
}

// ── Component M: miss-rate (slope-aware; ABSENT below the threshold) ─────────
//
// ── THE PROXY IS DELETED, NOT REPAIRED (2026-09-04) ──────────────────────────
// Below MIN_ATTEMPTS_FOR_SLOPE this used to fall back to
// `resolvedDrills / (resolvedDrills + stuckDrills)` — "conversion of struggles into
// resolutions". It now returns NULL and its weight redistributes, the same way an absent
// assessment already did.
//
// It was removed rather than fixed because its numerator cannot be repaired in place.
// `acca_tutor_progress.resolved` is written true at BOTH app/api/acca/tutor/route.ts:1704
// (a correct answer) AND :1576 (call4_reveal — the earned reveal), so the metric scored a
// student for ASKING TO BE TOLD. On real students it is ENTIRELY reveals: the correct-gate
// has never fired for one (P-V4, fifth instance), so every `resolved` row on a live account
// came from the reveal path. dd786100 scored 0.6667 on it holding 14 attempts, 14 misses and
// zero correct outcomes, and it carried him from red to amber.
//
// The deeper reason is the one that outlives the numerator: A COMPONENT THAT CHANGES MEANING
// AT A THRESHOLD UNDER ONE NAME IS WORSE THAN ONE THAT ADMITS IT HAS NO DATA. Above the
// threshold "miss-rate" meant a miss rate; below it, it meant a resolution ratio — and the
// composite averaged that against COVERAGE, which reads the correct-gate and disagreed
// (0.00 on 0/12 for the same student in the same render, against a miss-rate of 0.67).
// Nothing reconciled them, and nothing on screen said the two numbers were answering
// different questions. See docs/AFM_SURFACED.md, P-V4 sixth instance.
//
// `usedSlope` is now equivalent to `score != null`. It is KEPT because it names the branch
// that a reader (and the trainee page) asks about, and because dropping a field to save a
// boolean churns every consumer for nothing.
function missRateScore(input: ReadinessInput): {
  score: number | null; recent: number; prior: number; usedSlope: boolean; windowed: number;
} {
  const windowed = input.recentAttempts + input.priorAttempts;
  if (windowed >= MIN_ATTEMPTS_FOR_SLOPE) {
    // Recent miss-rate drives the LEVEL; recent-vs-prior drives the TREND.
    // Fall back a window to the other when one is empty so a one-sided history
    // still yields a defined level and a neutral (0) trend.
    const recent = input.recentAttempts > 0
      ? ratio(input.recentMisses, input.recentAttempts)
      : ratio(input.priorMisses, input.priorAttempts);
    const prior = input.priorAttempts > 0
      ? ratio(input.priorMisses, input.priorAttempts)
      : recent;
    const level = 1 - recent;                       // fewer recent misses → higher
    const trend = clamp01((prior - recent + 1) / 2); // improving (prior>recent) → >0.5
    const score = clamp01(0.75 * level + 0.25 * trend);
    return { score, recent, prior, usedSlope: true, windowed };
  }
  // Sparse history → NO SCORE. Not a proxy, and not a neutral 0.5 either: a 0.5 stand-in is
  // still a number the composite averages, and it asserts "middling" about a student nobody
  // has measured. The ratios are still reported for context — they are what a reader needs to
  // see that the windows are empty — but they carry no weight.
  const recent = ratio(input.recentMisses, input.recentAttempts);
  return { score: null, recent, prior: recent, usedSlope: false, windowed };
}

// ── Component P: assessment (present-only → may be null) ──────────────────────
// Uses REAL scores when present: standalone case ratios + per-mock aggregated
// scores, averaged together. The 0.5 floor now survives ONLY for the degenerate
// "sat a mock but nothing markable yet" case — never when a real score exists.
function assessmentScore(input: ReadinessInput): { score: number | null; caseAvg: number | null; mockAvg: number | null } {
  const caseAvg = input.caseMarkRatios.length > 0 ? clamp01(avg(input.caseMarkRatios)) : null;
  const mockAvg = input.mockScores.length > 0 ? clamp01(avg(input.mockScores)) : null;
  const ratios = [...input.caseMarkRatios, ...input.mockScores];
  if (ratios.length > 0) return { score: clamp01(avg(ratios)), caseAvg, mockAvg };
  if (input.mocksCompleted > 0) return { score: 0.5, caseAvg: null, mockAvg: null }; // sat but unmarkable
  return { score: null, caseAvg: null, mockAvg: null };
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const r = recencyScore(input.now, input.lastActiveAt);
  const cScore = clamp01(ratio(input.coveredSubAreas, input.totalSubAreas));
  const m = missRateScore(input);
  const a = assessmentScore(input);

  // Weights: zero every ABSENT component, then renormalise what is left so the kept weights
  // still sum to 1. Generalised from the assessment-only version (2026-09-04) now that
  // miss-rate can also be absent — one rule for both, rather than a second special case that
  // would have to agree with the first. With both present `kept` is 1 and nothing moves, so
  // the arithmetic for a fully-measured trainee is untouched.
  const w = { ...BASE_WEIGHTS };
  if (m.score == null) w.missRate = 0;
  if (a.score == null) w.assessment = 0;
  const kept = w.recency + w.coverage + w.missRate + w.assessment;
  w.recency /= kept; w.coverage /= kept; w.missRate /= kept; w.assessment /= kept;

  const score = clamp01(
    w.recency * r.score +
    w.coverage * cScore +
    w.missRate * (m.score ?? 0) +
    w.assessment * (a.score ?? 0),
  );

  // Overrides beat the composite. never-started is the more specific of the two.
  let override: Override = null;
  if (!input.hasAnyActivity) override = 'never-started';
  else if (r.days == null || r.days > DISENGAGED_DAYS) override = 'disengaged-21d';

  const band: Band = override
    ? 'red'
    : score >= GREEN_AT ? 'green'
    : score >= AMBER_AT ? 'amber'
    : 'red';

  return {
    band,
    score,
    override,
    components: {
      recency:    { score: r.score, daysSinceActive: r.days == null ? null : Math.floor(r.days) },
      coverage:   { score: cScore, covered: input.coveredSubAreas, total: input.totalSubAreas },
      missRate:   { score: m.score, recentMissRate: m.recent, priorMissRate: m.prior, usedSlope: m.usedSlope, windowedAttempts: m.windowed },
      assessment: { score: a.score, caseAvg: a.caseAvg, mockAvg: a.mockAvg, mocksCompleted: input.mocksCompleted },
    },
    weightsUsed: w,
  };
}
