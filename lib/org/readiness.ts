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
//   P is PRESENT-ONLY: when a trainee has no marks and no completed mock, P is null and
//   its weight is redistributed across R/C/M (renormalised) rather than scored as 0.
//
//   M is slope-aware when enough attempt history exists (>= MIN_ATTEMPTS_FOR_SLOPE
//   across the two windows): it blends the recent miss-level with the recent-vs-prior
//   trend, so an improving trainee reads higher than a high-activity-but-flat one. With
//   sparse history it degrades to the point-in-time proxy resolved/(resolved+stuck).
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

  // Miss-rate: slope inputs (two time windows) + proxy fallback inputs -------
  recentAttempts: number; // attempts in the recent window (e.g. last 14d)
  recentMisses: number;
  priorAttempts: number;  // attempts in the prior window (e.g. 14–28d ago)
  priorMisses: number;
  /** Proxy fallback (used when slope history is too sparse). */
  resolvedDrills: number; // acca_tutor_progress.resolved = true
  stuckDrills: number;    // miss_count >= 2 AND resolved = false

  // Assessment (present-only) ----------------------------------------------
  /** professional_marks_awarded / professional_marks_available per marked case. */
  caseMarkRatios: number[];
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
    missRate:   { score: number; recentMissRate: number; priorMissRate: number; usedSlope: boolean };
    assessment: { score: number | null; caseAvg: number | null; mocksCompleted: number };
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

// ── Component R: recency ──────────────────────────────────────────────────────
function recencyScore(now: number, lastActiveAt: number | null): { score: number; days: number | null } {
  if (lastActiveAt == null) return { score: 0, days: null };
  const days = (now - lastActiveAt) / DAY_MS;
  const score = days <= 3 ? 1.0 : days <= 7 ? 0.6 : days <= 14 ? 0.3 : 0;
  return { score, days };
}

// ── Component M: miss-rate (slope-aware, proxy fallback) ──────────────────────
function missRateScore(input: ReadinessInput): { score: number; recent: number; prior: number; usedSlope: boolean } {
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
    return { score, recent, prior, usedSlope: true };
  }
  // Sparse history → point-in-time proxy: conversion of struggles into resolutions.
  const denom = input.resolvedDrills + input.stuckDrills;
  const score = denom > 0 ? clamp01(input.resolvedDrills / denom) : 0.5; // neutral when nothing to judge
  const recent = ratio(input.recentMisses, input.recentAttempts);
  return { score, recent, prior: recent, usedSlope: false };
}

// ── Component P: assessment (present-only → may be null) ──────────────────────
function assessmentScore(input: ReadinessInput): { score: number | null; caseAvg: number | null } {
  if (input.caseMarkRatios.length > 0) {
    const caseAvg = clamp01(input.caseMarkRatios.reduce((a, b) => a + b, 0) / input.caseMarkRatios.length);
    return { score: caseAvg, caseAvg };
  }
  if (input.mocksCompleted > 0) return { score: 0.5, caseAvg: null }; // "has sat a mock" floor
  return { score: null, caseAvg: null };
}

export function computeReadiness(input: ReadinessInput): ReadinessResult {
  const r = recencyScore(input.now, input.lastActiveAt);
  const cScore = clamp01(ratio(input.coveredSubAreas, input.totalSubAreas));
  const m = missRateScore(input);
  const a = assessmentScore(input);

  // Weights: drop P and renormalise the rest when assessment is absent.
  const w = { ...BASE_WEIGHTS };
  if (a.score == null) {
    const kept = w.recency + w.coverage + w.missRate;
    w.recency /= kept; w.coverage /= kept; w.missRate /= kept; w.assessment = 0;
  }
  const score = clamp01(
    w.recency * r.score +
    w.coverage * cScore +
    w.missRate * m.score +
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
      missRate:   { score: m.score, recentMissRate: m.recent, priorMissRate: m.prior, usedSlope: m.usedSlope },
      assessment: { score: a.score, caseAvg: a.caseAvg, mocksCompleted: input.mocksCompleted },
    },
    weightsUsed: w,
  };
}
