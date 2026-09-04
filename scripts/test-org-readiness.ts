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

// ── T6: BELOW THE THRESHOLD, MISS-RATE IS ABSENT — NOT PROXIED, NOT ZEROED ────
// This test used to assert the proxy: windowed = 2 (<4) → M = resolved/(resolved+stuck)
// = 3/4 = 0.75. The proxy is DELETED (2026-09-04), so the same input now yields NULL and the
// 0.25 weight redistributes. The old expectation is kept below as a MUST-FAIL pin — it is the
// exact number the deleted branch produced, and it must never be reachable again.
//
// P-G3(a) BOTH DIRECTIONS: absence is asserted here, PRESENCE at/above the threshold in T6b,
// and T1/T5 still pin the slope arithmetic unchanged. A suite that only proved "M is null
// when sparse" passes against a component that is always null, which silently deletes 25% of
// the composite for everyone.
{
  const sparse = base({
    recentAttempts: 1, recentMisses: 0, priorAttempts: 1, priorMisses: 1,
    resolvedDrills: 3, stuckDrills: 1,
  });
  const res = computeReadiness(sparse);
  check('T6 usedSlope false below the threshold', res.components.missRate.usedSlope === false);
  check('T6 M is NULL, not a number', res.components.missRate.score === null,
    `got ${res.components.missRate.score}`);
  check('T6 M is not zeroed (a 0 would read as "all misses")',
    res.components.missRate.score !== 0);
  check('T6 windowedAttempts explains the null', res.components.missRate.windowedAttempts === 2);
  check('T6 miss-rate weight drops to 0', res.weightsUsed.missRate === 0);

  // THE REDISTRIBUTION IS THE POINT: the kept weights must still sum to 1, or the composite is
  // silently scaled down and every sparse trainee reads worse than they are.
  const sum = res.weightsUsed.recency + res.weightsUsed.coverage
            + res.weightsUsed.missRate + res.weightsUsed.assessment;
  check('T6 remaining weights renormalise to 1', approx(sum, 1), `sum=${sum}`);
  // `base()` carries no assessment either, so BOTH are absent here and the two survivors split
  // it evenly. That is the double-absent case, and it is worth pinning on its own: the
  // renormalisation has to compose, not special-case one component.
  check('T6 both absent → recency and coverage split it 50/50',
    approx(res.weightsUsed.recency, 0.50) && approx(res.weightsUsed.coverage, 0.50)
    && res.weightsUsed.assessment === 0,
    JSON.stringify(res.weightsUsed));

  // THE SHAPE dd786100 ACTUALLY HAS: miss-rate absent, assessment PRESENT. 0.25 redistributes
  // across three, not two — 0.30/0.75, 0.30/0.75, 0.15/0.75.
  const withAssessment = computeReadiness(base({
    recentAttempts: 1, recentMisses: 1, priorAttempts: 1, priorMisses: 1,
    resolvedDrills: 2, stuckDrills: 1, mockScores: [0.35], mocksCompleted: 1,
  }));
  check('T6 miss-rate absent + assessment present → 0.40/0.40/0.20',
    approx(withAssessment.weightsUsed.recency, 0.40)
    && approx(withAssessment.weightsUsed.coverage, 0.40)
    && approx(withAssessment.weightsUsed.assessment, 0.20)
    && withAssessment.weightsUsed.missRate === 0,
    JSON.stringify(withAssessment.weightsUsed));
  const sum2 = withAssessment.weightsUsed.recency + withAssessment.weightsUsed.coverage
             + withAssessment.weightsUsed.missRate + withAssessment.weightsUsed.assessment;
  check('T6 ...and those renormalise to 1 too', approx(sum2, 1), `sum=${sum2}`);

  // MUST-FAIL: the deleted proxy, transcribed exactly as it was. If this ever matches again,
  // resolved/(resolved+stuck) is back — and with it a metric that scores a student for asking
  // to be told the answer (P-V4, docs/AFM_SURFACED.md).
  const DELETED_PROXY = sparse.resolvedDrills / (sparse.resolvedDrills + sparse.stuckDrills);
  check('T6 MUST-FAIL: the deleted proxy no longer produces the score',
    DELETED_PROXY === 0.75 && res.components.missRate.score !== DELETED_PROXY);

  // The other deleted arm: with nothing to judge the proxy returned a NEUTRAL 0.5. A neutral
  // stand-in is still a claim about an unmeasured trainee, so it is gone too.
  const nothing = computeReadiness(base({
    recentAttempts: 0, recentMisses: 0, priorAttempts: 0, priorMisses: 0,
    resolvedDrills: 0, stuckDrills: 0,
  }));
  check('T6 MUST-FAIL: the neutral 0.5 fallback is gone',
    nothing.components.missRate.score === null && nothing.components.missRate.score !== 0.5);
  check('T6 zero windowed attempts is reported as 0, not hidden',
    nothing.components.missRate.windowedAttempts === 0);
}

// ── T6b: AT the threshold the slope still computes — the other direction ──────
// windowed === MIN_ATTEMPTS_FOR_SLOPE exactly. This is the boundary dd786100 sat on, and it
// is where an off-by-one would silently delete the component for a measured trainee.
{
  const atThreshold = computeReadiness(base({
    recentAttempts: 2, recentMisses: 2, priorAttempts: 2, priorMisses: 2,
    resolvedDrills: 2, stuckDrills: 1,
  }));
  check('T6b at exactly MIN_ATTEMPTS_FOR_SLOPE the slope runs',
    atThreshold.components.missRate.usedSlope === true);
  check('T6b M is a number at the threshold', typeof atThreshold.components.missRate.score === 'number');
  // All-miss on both windows: level 0, trend 0.5 → 0.75*0 + 0.25*0.5 = 0.125. The exact value
  // dd786100 carried on 2026-09-02, pinned so the slope arithmetic cannot drift with this change.
  check('T6b all-miss flat slope is still 0.125', approx(atThreshold.components.missRate.score!, 0.125),
    `got ${atThreshold.components.missRate.score}`);
  // `base()` has no assessment, so the full 0.30/0.30/0.25 shape is not what this input yields
  // — miss-rate is PRESENT and takes its renormalised share of the three. The claim being
  // pinned is that it takes a share at all, i.e. that it did not fall out.
  check('T6b miss-rate carries weight at the threshold',
    atThreshold.weightsUsed.missRate > 0 && approx(atThreshold.weightsUsed.missRate, 0.25 / 0.85),
    JSON.stringify(atThreshold.weightsUsed));
  // With EVERY component present the authored weights must survive untouched — kept === 1, so
  // the renormalisation is a no-op and a fully-measured trainee's arithmetic is byte-identical
  // to before this change.
  const complete = computeReadiness(base({
    recentAttempts: 2, recentMisses: 1, priorAttempts: 2, priorMisses: 1,
    mockScores: [0.5], mocksCompleted: 1,
  }));
  check('T6b all four present → the authored weights are untouched',
    complete.weightsUsed.recency === 0.30 && complete.weightsUsed.coverage === 0.30
    && complete.weightsUsed.missRate === 0.25 && complete.weightsUsed.assessment === 0.15,
    JSON.stringify(complete.weightsUsed));
  // And the resolved/stuck inputs are IGNORED: same counts as T6, different result, because
  // nothing reads them any more.
  check('T6b resolvedDrills does not influence the score',
    approx(computeReadiness(base({
      recentAttempts: 2, recentMisses: 2, priorAttempts: 2, priorMisses: 2,
      resolvedDrills: 99, stuckDrills: 0,
    })).components.missRate.score!, 0.125));
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
  // ⚠️ WAS `=== 0.15`. `base()` carries NO attempts, so since the miss-rate proxy was deleted
  // (2026-09-04) this input has miss-rate ABSENT too — 0.25 redistributes and assessment lands
  // at 0.15/0.75 = 0.20. The old constant encoded an assumption that miss-rate is always
  // present, which stopped being true the day absence became expressible. The CLAIM is
  // unchanged: an assessment that exists carries weight.
  check('T7 mock-only assessment carries weight (0.15 renormalised over the 3 present)',
    approx(mockOnly.weightsUsed.assessment, 0.15 / 0.75), `got ${mockOnly.weightsUsed.assessment}`);
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
  // Same correction as T7: this fixture has no windowed attempts, so miss-rate is absent and
  // the 0.15 renormalises to 0.20. The claim under test is 'present assessment is weighted'.
  check('T12 assessment carries weight', res.weightsUsed.assessment > 0
    && approx(res.weightsUsed.assessment, 0.15 / 0.75), `got ${res.weightsUsed.assessment}`);
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
