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
  mockScoreFromMarks,
  type ReadinessInput,
  DAY_MS,
  GREEN_AT,
  AMBER_AT,
} from '../lib/org/readiness';
// Pure exports only. queries.ts imports createServiceClient, but that is a FUNCTION — no client
// is constructed and no env is read at module load, so this stays a pure, env-free fixture.
import { scopeDrillRows, scopeMarkRows, scopeMockRows, cohortPaper } from '../lib/org/queries';
import { MOCK_PAPERS } from '../lib/acca/mocks';

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
    mockScores: [],
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

// ── T11: mockScoreFromMarks — aggregate sum(awarded)/sum(available) ────────────
{
  check('T11 empty marks → null', mockScoreFromMarks([]) === null);
  check('T11 zero available → null', mockScoreFromMarks([{ awarded: 0, available: 0 }]) === null);
  check('T11 aggregate 12/15 = 0.8',
    approx(mockScoreFromMarks([{ awarded: 8, available: 10 }, { awarded: 4, available: 5 }])!, 0.8));
  check('T11 clamps >1 to 1', mockScoreFromMarks([{ awarded: 12, available: 10 }]) === 1);
}

// ── T12: P uses the REAL mock score when present (not the 0.5 floor) ──────────
{
  const res = computeReadiness(base({ mockScores: [0.9], mocksCompleted: 1 }));
  check('T12 assessment = real mock score 0.9', res.components.assessment.score === 0.9,
    `got ${res.components.assessment.score}`);
  check('T12 mockAvg exposed', res.components.assessment.mockAvg === 0.9);
  check('T12 assessment weight present (0.15)', res.weightsUsed.assessment === 0.15);
}

// ── T13: floor survives ONLY for "sat a mock but nothing markable" ────────────
{
  const res = computeReadiness(base({ mockScores: [], caseMarkRatios: [], mocksCompleted: 1 }));
  check('T13 unmarkable completed mock → 0.5 floor', res.components.assessment.score === 0.5);
  check('T13 no marks → mockAvg null', res.components.assessment.mockAvg === null);
}

// ── T14: mock score + standalone case marks averaged together ─────────────────
{
  const res = computeReadiness(base({ caseMarkRatios: [0.6], mockScores: [0.8], mocksCompleted: 1 }));
  check('T14 P = avg(0.6, 0.8) = 0.7', approx(res.components.assessment.score!, 0.7),
    `got ${res.components.assessment.score}`);
  check('T14 caseAvg 0.6 + mockAvg 0.8 both exposed',
    res.components.assessment.caseAvg === 0.6 && res.components.assessment.mockAvg === 0.8);
}


// ── T15–T19: the servable-drill scope (lib/org/queries.ts) ────────────────────
// PURE half of the join fix. `scopeDrillRows` is what stops seeded, unpublished and
// other-paper rows reaching the readiness signal, the heatmap, the trainee drill-down and
// the org cards. The map is supplied here, so no DB is touched.
//
// P-G3: the SHIPPED pre-fix behaviour is pinned as a MUST-FAIL. Before this, the coordinator
// path applied no filter at all and the student path filtered on EXISTENCE only.

const SERVABLE = new Map<string, string>([
  ['d-apm-1', 'APM'],
  ['d-apm-2', 'APM'],
  ['d-afm-1', 'AFM'],
]);

const ROWS = [
  { drill_id: 'd-apm-1', lo_code: 'A1a' },   // servable APM
  { drill_id: 'd-apm-2', lo_code: 'B2c' },   // servable APM
  { drill_id: 'd-afm-1', lo_code: 'A1a' },   // OTHER PAPER — prefixes collide with APM's A1
  { drill_id: 'd-unpub', lo_code: 'C1a' },   // exists but not approved/published → absent from map
  { drill_id: 'seed-99', lo_code: 'D2a' },   // fabricated by seed-demo-org.ts → absent from map
  { drill_id: '',        lo_code: 'E1a' },   // empty id
];

{
  const kept = scopeDrillRows(ROWS, SERVABLE, 'APM');
  check('T15: APM scope keeps only servable APM rows',
    kept.length === 2 && kept.every((r) => r.drill_id.startsWith('d-apm')),
    `got ${JSON.stringify(kept.map((r) => r.drill_id))}`);
}
{
  const kept = scopeDrillRows(ROWS, SERVABLE, 'AFM');
  check('T16: AFM scope keeps the AFM row and NOT the colliding APM A1a',
    kept.length === 1 && kept[0].drill_id === 'd-afm-1',
    `got ${JSON.stringify(kept.map((r) => r.drill_id))}`);
}
{
  // The three excluded classes, named individually so a regression says WHICH one came back.
  const ids = new Set(scopeDrillRows(ROWS, SERVABLE, 'APM').map((r) => r.drill_id));
  check('T17a: seeded drill_id excluded', !ids.has('seed-99'));
  check('T17b: unpublished drill_id excluded', !ids.has('d-unpub'));
  check('T17c: empty drill_id excluded', !ids.has(''));
}
{
  // MUST-FAIL: the shipped coordinator behaviour — no filter whatsoever.
  const LEGACY_coordinator = (rows: typeof ROWS) => rows;
  check('T18: pre-fix coordinator read (no join) is pinned WRONG',
    LEGACY_coordinator(ROWS).length !== scopeDrillRows(ROWS, SERVABLE, 'APM').length,
    'an unjoined read must not equal the scoped read');
}
{
  // MUST-FAIL: the shipped STUDENT behaviour — existence-only, no approved/published filter.
  // Modelled by a map that also resolves the unpublished drill.
  const EXISTS_ONLY = new Map(SERVABLE);
  EXISTS_ONLY.set('d-unpub', 'APM');
  const legacy = scopeDrillRows(ROWS, EXISTS_ONLY, 'APM');
  check('T19: pre-fix student read (existence only) is pinned WRONG',
    legacy.length === 3 && legacy.length !== scopeDrillRows(ROWS, SERVABLE, 'APM').length,
    `existence-only kept ${legacy.length}, servable kept ${scopeDrillRows(ROWS, SERVABLE, 'APM').length}`);
}
{
  // cohortPaper: free-text column → a paper that AGREES with the coverage denominator.
  check('T20a: recognised paper passes through', cohortPaper('AFM') === 'AFM');
  check('T20b: null falls back to APM (= totalSubAreas default)', cohortPaper(null) === 'APM');
  check('T20c: unrecognised free text falls back to APM', cohortPaper('apm ') === 'APM');
}

// ── T21–T29: the CASE-BASED scope (marks + mocks) ─────────────────────────────
// `acca_case_marking` and `acca_mock_attempts` carry no drill_id, so scopeDrillRows above
// never reached them and they fed readiness UNSCOPED until 2026-09-04: a trainee's AFM case
// marks and AFM mock sittings counted into an APM cohort's score, through caseMarkRatios and
// mockScores.
//
// BOTH DIRECTIONS on every rule (P-G3(a)). "The cross-paper row is dropped" passes against a
// filter that drops everything, which deletes the assessment component entirely and is the
// worse failure — a trainee who sat a mock reported as having sat nothing.
{
  const APM_CASE = 'a6000000-0000-4000-8000-0000000000b1';   // Halworth  (APM, real)
  const AFM_CASE = 'aa000000-0000-4000-8000-00000000a001';   // Solenne   (AFM, real)
  const GONE_CASE = 'ffffffff-0000-4000-8000-ffffffffffff';  // a mark whose case no longer exists
  const CASE_PAPERS = new Map<string, string>([[APM_CASE, 'APM'], [AFM_CASE, 'AFM']]);
  const MARKS = [{ case_id: APM_CASE }, { case_id: AFM_CASE }, { case_id: GONE_CASE }];

  const apmMarks = scopeMarkRows(MARKS, CASE_PAPERS, 'APM');
  check('T21: a SAME-paper mark counts', apmMarks.some((m) => m.case_id === APM_CASE));
  check('T22: a CROSS-paper mark does not', !apmMarks.some((m) => m.case_id === AFM_CASE));
  check('T23: an unresolvable mark is dropped, never counted into the asking paper',
    !apmMarks.some((m) => m.case_id === GONE_CASE));
  check('T24: exactly one of the three survives', apmMarks.length === 1,
    `kept ${apmMarks.length}`);

  const afmMarks = scopeMarkRows(MARKS, CASE_PAPERS, 'AFM');
  check('T25: asking for AFM keeps the AFM mark and drops the APM one (the other direction)',
    afmMarks.length === 1 && afmMarks[0].case_id === AFM_CASE);

  // THE PRE-FIX READER, PINNED WRONG. This is what both org readers did, and it is what the
  // measurement caught: 4 completed mocks where 3 were APM, mockAvg 0.8125 against a true 1.0.
  const legacy = MARKS;
  check('T26: pre-fix org read (no scope at all) is pinned WRONG — it kept the AFM mark',
    legacy.length === 3 && legacy.length !== apmMarks.length,
    `unscoped kept ${legacy.length}, scoped kept ${apmMarks.length}`);

  // Mocks resolve through the REAL registry, not a supplied map — an id that is not in
  // MOCK_PAPERS resolves to nothing, and both papers' real ids are exercised.
  const APM_MOCK = MOCK_PAPERS.find((p) => p.paper === 'APM')!.id;
  const AFM_MOCK = MOCK_PAPERS.find((p) => p.paper === 'AFM')!.id;
  const ATTEMPTS = [{ mock_id: APM_MOCK }, { mock_id: AFM_MOCK }, { mock_id: 'paper-99' }];

  const apmMocks = scopeMockRows(ATTEMPTS, 'APM');
  check('T27: a SAME-paper attempt counts, a CROSS-paper one does not',
    apmMocks.length === 1 && apmMocks[0].mock_id === APM_MOCK);
  check('T28: an unregistered mock_id is dropped',
    !scopeMockRows(ATTEMPTS, 'AFM').some((a) => a.mock_id === 'paper-99'));
  check('T29: asking for AFM keeps the AFM attempt (the other direction)',
    scopeMockRows(ATTEMPTS, 'AFM').length === 1
    && scopeMockRows(ATTEMPTS, 'AFM')[0].mock_id === AFM_MOCK);
}

console.log(`
${failures === 0 ? 'ALL PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
