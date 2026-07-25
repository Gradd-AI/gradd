// scripts/test-rounding.ts
// Fixtures for the boundary-aware display rounding (lib/acca/rounding.ts) and the
// HALFWAY_ROUNDING_RISK gate (validateHalfwayRounding, lib/acca/validate-schema.ts).
// Pure — no env/DB/model. Exit 1 on any mismatch.
//
// The class under test is an ASSESSMENT hazard, not a numerics nicety: answer-locked
// marking means our rounding and a hand-working student's must not be able to differ.
import { fixedHalfUp, isOnRoundingBoundary, rendersAsWholeNumber } from '../lib/acca/rounding';
import { validateHalfwayRounding } from '../lib/acca/validate-schema';
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

check('FAILS when the prose shows the float artefact ("0.937")',
  validateHalfwayRounding(schema(ASSET_BETA), 'the asset beta is **0.937** and so').issues.map((i) => i.code), ['value-on-rounding-boundary']);
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

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL ROUNDING FIXTURES PASS' : `${failures} ROUNDING FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
