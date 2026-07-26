// scripts/test-rounding.ts
// Fixtures for the boundary-aware display rounding (lib/acca/rounding.ts) and the
// HALFWAY_ROUNDING_RISK gate (validateHalfwayRounding, lib/acca/validate-schema.ts).
// Pure — no env/DB/model. Exit 1 on any mismatch.
//
// The class under test is an ASSESSMENT hazard, not a numerics nicety: answer-locked
// marking means our rounding and a hand-working student's must not be able to differ.
import { fixedHalfUp, isOnRoundingBoundary, rendersAsWholeNumber } from '../lib/acca/rounding';
import { validateHalfwayRounding, halfwayBlockingIssues } from '../lib/acca/validate-schema';
import type { AnswerSchema, Tolerance } from '../lib/acca/numeric-verifier';

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} :: ${name}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
}

// ── (1) fixedHalfUp — the canonical instance and its neighbours ──
// 81/86.4 is EXACTLY 0.9375 in arithmetic; the nearest double is 0.9374999999999999.
const ASSET_BETA = 1.35 * 60 / (60 + 40 * (1 - 0.34));
check('the canonical instance really is the float artefact (below the tie)', ASSET_BETA < 0.9375, true);
check('toFixed shows the artefact (documents WHY the fix is needed)', ASSET_BETA.toFixed(3), '0.937');
check('fixedHalfUp renders the MATHEMATICAL value', fixedHalfUp(ASSET_BETA, 3), '0.938');

// half-AWAY-FROM-ZERO, so a negative of the same magnitude rounds the same way
check('fixedHalfUp(-1.95, 1) is half-away-from-zero', fixedHalfUp(-1.95, 1), '-2.0');
check('fixedHalfUp(1.95, 1)', fixedHalfUp(1.95, 1), '2.0');
check('fixedHalfUp never renders "-0.0"', fixedHalfUp(-0.04, 1), '0.0');

// NO-OP for everything not on a boundary — this must not perturb ordinary figures
for (const [v, dp, want] of [[9.590625, 2, '9.59'], [11.933035714285714, 2, '11.93'], [1.2388392857142856, 3, '1.239'], [0.1234, 2, '0.12'], [2.675, 2, '2.68'], [100, 1, '100.0']] as const) {
  check(`fixedHalfUp is a no-op off-boundary: (${v}, ${dp})`, fixedHalfUp(v, dp), want);
}

// ── (2) isOnRoundingBoundary ──
check('0.9375 is on the 3-dp boundary', isOnRoundingBoundary(ASSET_BETA, 3), true);
check('0.9375 is NOT on the 4-dp boundary', isOnRoundingBoundary(ASSET_BETA, 4), false);
check('-1.95 is on the 1-dp boundary', isOnRoundingBoundary(-1.95, 1), true);
check('9.590625 is not on the 2-dp boundary', isOnRoundingBoundary(9.590625, 2), false);

// ── (3) rendersAsWholeNumber — REGRESSION-LOCKS the false alarm FR3's own detector threw.
// A naive includes("96.5") is TRUE for prose printing "96.55" at 2 dp, where the value is
// unambiguous. That false positive manufactured a phantom "live drills are mismarking
// students today" alarm across two published irhedge drills. It must never come back.
check('"96.5" does NOT match inside "96.55" (THE false alarm)', rendersAsWholeNumber('closing price 96.55 today', '96.5'), false);
check('"96.5" matches a real standalone 96.5', rendersAsWholeNumber('closing price 96.5 today', '96.5'), true);
check('"1.2" does not match inside "11.2"', rendersAsWholeNumber('beta 11.2', '1.2'), false);
check('"1.2" does not match inside "1.23"', rendersAsWholeNumber('beta 1.23', '1.2'), false);
check('match at end of string', rendersAsWholeNumber('the figure is 0.938', '0.938'), true);

// ── (4) validateHalfwayRounding — the gate ──
const tol: Tolerance = { kind: 'absolute', value: 0.02 };
const schema = (value: number): AnswerSchema =>
  ({ components: [{ component_id: 'asset_beta', label: 'Ungeared (asset) beta', expected_value: value, unit: 'beta', tolerance: tol }] } as AnswerSchema);

// FR3-CORRECTED (2026-07-26): this assertion previously demanded the BLOCKING code here.
// That was the over-blocking behaviour itself: `tol` is ±0.02 absolute and the display step
// is 0.0005, so the tolerance absorbs it ~40x over and no correct student can be mismarked.
// The hit is real and still reported — as ADVISORY. The blocking path is asserted separately
// below (TRUE POSITIVE, tolerance 0.01% relative, which genuinely cannot absorb it).
check('REPORTS when the prose shows the float artefact ("0.937")',
  validateHalfwayRounding(schema(ASSET_BETA), 'the asset beta is **0.937** and so').issues.map((i) => i.code), ['value-on-rounding-boundary-absorbed']);
check('...but does NOT block, because ±0.02 absorbs a 0.0005 step',
  validateHalfwayRounding(schema(ASSET_BETA), 'the asset beta is **0.937** and so').ok, true);
check('PASSES when the prose shows the hand-working digit ("0.938")',
  validateHalfwayRounding(schema(ASSET_BETA), 'the asset beta is **0.938** and so').issues.length, 0);
check('PASSES when the value is not rendered at the ambiguous precision at all',
  validateHalfwayRounding(schema(ASSET_BETA), 'the asset beta is **0.9375** at four places').issues.length, 0);
check('no-op for an off-boundary value',
  validateHalfwayRounding(schema(1.2388392857142856), 'the beta is 1.239').issues.length, 0);
// severity is reported, not guessed: a tolerance that cannot absorb the step says so
const tightSchema: AnswerSchema = { components: [{ component_id: 'closing_price', label: 'Closing futures price', expected_value: -1.95, unit: 'price', tolerance: { kind: 'relative', pct: 0.5 } }] } as AnswerSchema;
const tightIssues = validateHalfwayRounding(tightSchema, 'the closing price is PLN -1.9m');
check('flags a tolerance-exceeding boundary hit', tightIssues.issues.length, 1);
check('names it as a real mismarking risk', /A STUDENT WHO IS CORRECT WILL BE MARKED WRONG/.test(tightIssues.issues[0]?.message ?? ''), true);
const wideIssues = validateHalfwayRounding(schema(ASSET_BETA), 'the asset beta is 0.937');
check('flags a tolerance-absorbed hit as presentation-only', /presentation\/credibility issue/.test(wideIssues.issues[0]?.message ?? ''), true);

// FAIL CLOSED when BOTH renderings appear. A match on the hand-working string can be an
// UNRELATED figure that happens to render the same — during FR3 that silently cleared a real
// tolerance-exceeding hit on a published drill (an unrelated "-2.0" elsewhere in the prose
// masked debt_issue_costs still printing "-1.9"). Never skip on the hand string alone.
check('fails closed when the artefact AND an unrelated hand-string both appear',
  validateHalfwayRounding(schema(ASSET_BETA), 'some other figure is 0.938 but the asset beta prints 0.937').issues.length, 1);

// ══════════════════════════════════════════════════════════════════════════════════════
// (5) FR3-CORRECTED (2026-07-26) — the four classes the gate must separate.
//
// WHY THESE EXIST: the detector produced TWO false positives that each nearly caused live
// published drills to be re-authored. (i) a substring match reporting "96.5" present in
// prose that prints "96.55"; (ii) a reported `debt_issue_costs = -1.95` that on re-reading
// the live row is -1.3 — a clean value with no boundary at any precision. Every class below
// is pinned so neither shape can return, and so a tolerance-absorbed hit can never again be
// escalated to a blocking one.
// ══════════════════════════════════════════════════════════════════════════════════════

const one = (value: number, tolerance: Tolerance, id = 'c1'): AnswerSchema =>
  ({ components: [{ component_id: id, label: id, expected_value: value, unit: 'x', tolerance }] } as AnswerSchema);

// ── TRUE POSITIVE: 0.9375 at 3 dp snaps to 0.938 AND flags ──
// NOTE the distinction that matters: the literal 0.9375 is EXACTLY representable (15/16), so
// toFixed(3) already returns "0.938" and there is no divergence to flag. The hazard only
// exists for the float artefact — 81/86.4 = 0.9374999999999999 — which is the real live value.
check('TRUE POSITIVE: snaps to 0.938', fixedHalfUp(ASSET_BETA, 3), '0.938');
const truePos = validateHalfwayRounding(one(ASSET_BETA, { kind: 'relative', pct: 0.01 }), 'the asset beta is 0.937');
check('TRUE POSITIVE: flags', truePos.issues.length, 1);
check('TRUE POSITIVE: BLOCKS (tolerance 0.01% cannot absorb)', truePos.ok, false);
check('TRUE POSITIVE: blocking code', truePos.issues[0]?.code, 'value-on-rounding-boundary');
// The exactly-representable literal: formatter still correct, detector correctly silent.
check('exact literal 0.9375 also renders 0.938', fixedHalfUp(0.9375, 3), '0.938');
check('exact literal 0.9375 does NOT flag (no divergence exists)',
  validateHalfwayRounding(one(0.9375, { kind: 'relative', pct: 0.01 }), 'the beta is 0.938').issues.length, 0);

// ── FALSE ALARM 1: prose printing 96.55 at 2 dp must NOT flag on a "96.5" substring ──
check('FALSE ALARM 1: 96.55 in prose does not flag a 96.5 boundary',
  validateHalfwayRounding(one(96.55, { kind: 'relative', pct: 0.5 }), 'the closing price is 96.55 at settlement').issues.length, 0);
check('FALSE ALARM 1: still catches a genuine standalone 96.5',
  validateHalfwayRounding(one(96.55, { kind: 'relative', pct: 0.001 }), 'the closing price is 96.5 at settlement').issues.length, 1);

// ── FALSE ALARM 2: -1.3 at 1 dp must NOT flag. THE dedca530 debt_issue_costs value. ──
// 65 x 2.00% = 1.3 exactly; -1.3 x 10 = -13, fractional part 0. No boundary at any precision.
check('FALSE ALARM 2: -1.3 is on NO boundary at 1 dp', isOnRoundingBoundary(-1.3, 1), false);
check('FALSE ALARM 2: -1.3 renders -1.3', fixedHalfUp(-1.3, 1), '-1.3');
check('FALSE ALARM 2: -1.3 does not flag',
  validateHalfwayRounding(one(-1.3, { kind: 'relative', pct: 0.5 }, 'debt_issue_costs'), 'issue costs of -1.3m are deducted').issues.length, 0);
check('FALSE ALARM 2: clean at every scanned precision',
  [0, 1, 2, 3, 4].map((d) => isOnRoundingBoundary(-1.3, d)), [false, false, false, false, false]);

// ── ABSORBED: real boundary hits whose own tolerance covers the display step. ──
// These are the four LIVE AFM component values (B1c 796651c2, B3d 2a145f7d, B3j 34f9e897,
// B4a 0dc970a8), read from the DB on 2026-07-26. Each MUST classify as pass, not fail.
const ABSORBED: Array<[string, number, number, Tolerance]> = [
  ['B1c 47.15 @ 0.5% relative',    47.15,              1, { kind: 'relative', pct: 0.5 }],
  ['B3d 11.275 @ 0.1 absolute',    11.274999999999999, 2, { kind: 'absolute', value: 0.1 }],
  ['B3j 449.35 @ 0.5% relative',   449.34999999999997, 1, { kind: 'relative', pct: 0.5 }],
  ['B4a 11.675 @ 0.05 absolute',   11.674999999999999, 2, { kind: 'absolute', value: 0.05 }],
];
for (const [name, v, dp, tolerance] of ABSORBED) {
  const naive = v.toFixed(dp);
  const r = validateHalfwayRounding(one(v, tolerance), `the figure is ${naive} as shown`);
  check(`ABSORBED ${name}: is a genuine boundary (not a phantom)`, isOnRoundingBoundary(v, dp), true);
  check(`ABSORBED ${name}: PASSES the gate`, r.ok, true);
  check(`ABSORBED ${name}: reported as advisory, not dropped`,
    r.issues.map((i) => i.code), ['value-on-rounding-boundary-absorbed']);
  check(`ABSORBED ${name}: message says it does not block`,
    /ADVISORY: the verifier still accepts the student/.test(r.issues[0]?.message ?? ''), true);
}

// The either-rendering rule must NOT swallow a real mismarking: same shape, tolerance too tight.
const tight = validateHalfwayRounding(one(47.15, { kind: 'absolute', value: 0.001 }), 'the figure is 47.1 as shown');
check('either-rendering rule still BLOCKS when neither rendering is absorbed', tight.ok, false);
check('...and reports the blocking code', tight.issues[0]?.code, 'value-on-rounding-boundary');
check('...and names the mismarking consequence',
  /A STUDENT WHO IS CORRECT WILL BE MARKED WRONG/.test(tight.issues[0]?.message ?? ''), true);

// A mixed schema: one absorbed + one blocking must FAIL overall (blocking dominates).
const mixed: AnswerSchema = { components: [
  { component_id: 'absorbed', label: 'a', expected_value: 47.15, unit: 'x', tolerance: { kind: 'relative', pct: 0.5 } },
  { component_id: 'blocking', label: 'b', expected_value: ASSET_BETA, unit: 'x', tolerance: { kind: 'relative', pct: 0.01 } },
] } as AnswerSchema;
const mixedRes = validateHalfwayRounding(mixed, 'first 47.1 and then 0.937');
check('mixed schema: blocking dominates advisory', mixedRes.ok, false);
check('mixed schema: both hits reported', mixedRes.issues.length, 2);
check('mixed schema: blockingIssues isolates the real one',
  halfwayBlockingIssues(mixedRes).map((i) => i.component_id), ['blocking']);

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL ROUNDING FIXTURES PASS' : `${failures} ROUNDING FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
