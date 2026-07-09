// scripts/test-org-readiness.ts
// Unit tests for the deterministic readiness formula (lib/org/readiness.ts).
// PURE — no env, no DB, no model, no clock read (`now` is injected). Exit 1 on any fail.
//
// Run: npm run test:org-readiness
//
// Covers: the pinned green composite, both hard overrides, the recency mapping,
// slope-isolation (improving > flat at equal recent level), the proxy fallback,
// present-only assessment + weight renormalisation, coverage clamp, and band edges.

import {
  computeReadiness,
  type ReadinessInput,
  DAY_MS,
  GREEN_AT,
  AMBER_AT,
} from '../lib/org/readiness';

let failures = 0;
const T = 1_700_000_000_000; // fixed "now" (arbitrary fixed epoch — determinism, not date-sensitive)

function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${cond ? '' : `  ${detail}`}`);
  if (!cond) failures++;
}
const approx = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) <= eps;

// A baseline input with no activity signal; individual tests override fields.
function base(overrides: Partial<ReadinessInput> = {}): ReadinessInput {
  return {
    now: T,
    lastActiveAt: T,
    coveredSubAreas: 0,
    totalSubAreas: 20,
    recentAttempts: 0,
    recentMisses: 0,
    priorAttempts: 0,
    priorMisses: 0,
    resolvedDrills: 0,
    stuckDrills: 0,
    caseMarkRatios: [],
    mocksCompleted: 0,
    hasAnyActivity: true,
    ...overrides,
  };
}

// ── T1: pinned green composite (every component present) ──────────────────────
// R=1.0 (0d), C=18/20=0.9, M: recent 2/20=0.1, prior 6/20=0.3 → level .9 trend .6 → .825,
// P=avg(.8,.7)=.75. score = .30*1 + .30*.9 + .25*.825 + .15*.75 = 0.88875.
{
  const res = computeReadiness(base({
    lastActiveAt: T,
    coveredSubAreas: 18,
    recentAttempts: 20, recentMisses: 2,
    priorAttempts: 20, priorMisses: 6,
    caseMarkRatios: [0.8, 0.7],
  }));
  check('T1 pinned green score = 0.88875', approx(res.score, 0.88875), `got ${res.score}`);
  check('T1 band green', res.band === 'green', `got ${res.band}`);
  check('T1 usedSlope true', res.components.missRate.usedSlope);
  check('T1 M = 0.825', approx(res.components.missRate.score, 0.825), `got ${res.components.missRate.score}`);
}

// ── T2: never-started override → red regardless of any score ──────────────────
{
  const res = computeReadiness(base({ hasAnyActivity: false, lastActiveAt: null }));
  check('T2 override never-started', res.override === 'never-started', `got ${res.override}`);
  check('T2 band red', res.band === 'red');
}

// ── T3: disengaged-21d override (active but 25 days ago, otherwise strong) ─────
{
  const res = computeReadiness(base({
    lastActiveAt: T - 25 * DAY_MS,
    coveredSubAreas: 20,
    recentAttempts: 0, recentMisses: 0,
    priorAttempts: 0, priorMisses: 0,
    resolvedDrills: 10, stuckDrills: 0,
    caseMarkRatios: [0.9],
  }));
  check('T3 override disengaged-21d', res.override === 'disengaged-21d', `got ${res.override}`);
  check('T3 band red', res.band === 'red');
}

// ── T4: recency mapping table ─────────────────────────────────────────────────
{
  const at = (daysAgo: number | null) =>
    computeReadiness(base({ lastActiveAt: daysAgo == null ? null : T - daysAgo * DAY_MS, hasAnyActivity: daysAgo != null }))
      .components.recency.score;
  check('T4 recency 0d = 1.0', at(0) === 1.0);
  check('T4 recency 5d = 0.6', at(5) === 0.6);
  check('T4 recency 10d = 0.3', at(10) === 0.3);
  check('T4 recency 20d = 0', at(20) === 0);   // 20d: score 0 but NOT yet disengaged (<=21)
  check('T4 recency null = 0', at(null) === 0);
}

// ── T5: slope isolation — improving > flat at IDENTICAL recent level ───────────
// Both: recent 12 att / 3 miss (recent rate 0.25). A prior 9/12 (0.75, improving); B prior 3/12 (flat).
{
  const improving = computeReadiness(base({
    recentAttempts: 12, recentMisses: 3, priorAttempts: 12, priorMisses: 9,
  }));
  const flat = computeReadiness(base({
    recentAttempts: 12, recentMisses: 3, priorAttempts: 12, priorMisses: 3,
  }));
  check('T5 both usedSlope', improving.components.missRate.usedSlope && flat.components.missRate.usedSlope);
  check('T5 equal recent miss-rate', approx(improving.components.missRate.recentMissRate, flat.components.missRate.recentMissRate));
  check('T5 improving M (0.75) > flat M (0.6875)',
    approx(improving.components.missRate.score, 0.75) && approx(flat.components.missRate.score, 0.6875),
    `imp=${improving.components.missRate.score} flat=${flat.components.missRate.score}`);
  check('T5 improving composite > flat composite', improving.score > flat.score);
}

// ── T6: proxy fallback when windowed attempts < MIN_ATTEMPTS_FOR_SLOPE ─────────
// windowed = 2 (<4) → usedSlope false; M = resolved/(resolved+stuck) = 3/4 = 0.75.
{
  const res = computeReadiness(base({
    recentAttempts: 1, recentMisses: 0, priorAttempts: 1, priorMisses: 1,
    resolvedDrills: 3, stuckDrills: 1,
  }));
  check('T6 usedSlope false', res.components.missRate.usedSlope === false);
  check('T6 proxy M = 0.75', approx(res.components.missRate.score, 0.75), `got ${res.components.missRate.score}`);
}

// ── T7: present-only assessment + weight renormalisation ──────────────────────
{
  const absent = computeReadiness(base({ caseMarkRatios: [], mocksCompleted: 0 }));
  check('T7 assessment null when absent', absent.components.assessment.score === null);
  check('T7 assessment weight 0 when absent', absent.weightsUsed.assessment === 0);
  const sum = absent.weightsUsed.recency + absent.weightsUsed.coverage + absent.weightsUsed.missRate;
  check('T7 remaining weights renormalise to 1', approx(sum, 1), `sum=${sum}`);

  const mockOnly = computeReadiness(base({ caseMarkRatios: [], mocksCompleted: 1 }));
  check('T7 mock-only assessment = 0.5 floor', mockOnly.components.assessment.score === 0.5);
  check('T7 mock-only assessment weight restored', mockOnly.weightsUsed.assessment === 0.15);
}

// ── T8: coverage clamp (covered > total must not exceed 1) ─────────────────────
{
  const res = computeReadiness(base({ coveredSubAreas: 25, totalSubAreas: 20 }));
  check('T8 coverage clamped to 1', res.components.coverage.score === 1);
}

// ── T9: coverage monotonicity (more coverage → higher composite, all else equal) ─
{
  const lo = computeReadiness(base({ coveredSubAreas: 4, caseMarkRatios: [0.6] }));
  const hi = computeReadiness(base({ coveredSubAreas: 16, caseMarkRatios: [0.6] }));
  check('T9 more coverage → higher score', hi.score > lo.score, `lo=${lo.score} hi=${hi.score}`);
}

// ── T10: band thresholds are honoured at/above the cut points ─────────────────
{
  // Sanity: the constants order correctly and banding uses >=.
  check('T10 thresholds ordered', GREEN_AT > AMBER_AT && AMBER_AT > 0);
  const red = computeReadiness(base({ lastActiveAt: T - 20 * DAY_MS, coveredSubAreas: 0, resolvedDrills: 0, stuckDrills: 4 }));
  check('T10 weak profile bands red', red.band === 'red', `score=${red.score}`);
}

console.log(`\n${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
