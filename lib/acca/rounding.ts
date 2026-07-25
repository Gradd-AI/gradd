// lib/acca/rounding.ts
// THE ONE display-rounding primitive for every AFM calculator (FR3 ruling, 2026-07-25).
//
// WHY THIS EXISTS — it is an ASSESSMENT requirement, not a numerics nicety.
// The A(i) asset beta is 81/86.4, which in ARITHMETIC is exactly 0.9375. The nearest
// IEEE-754 double is 0.9374999999999999 — genuinely BELOW the tie — so `(0.9375).toFixed(3)`
// correctly returns "0.937". Every student who works it by hand gets 0.9375 and rounds
// (half-up and half-to-even agree here) to "0.938". Answer-locked marking means our
// rounding and the student's must not be able to differ, so we render the MATHEMATICAL
// value, not the float artefact.
//
// Note this is why a plain half-away-from-zero formatter does NOT fix the problem: the
// float really is below .5, so any correct rounder returns 0.937. The fix has to
// EPSILON-SNAP a value sitting within ~1e-9 of a half-way boundary TO that boundary first,
// and only then round half-away-from-zero. That snap predicate is deliberately the same one
// `validateHalfwayRounding` (GATE HALFWAY_ROUNDING_RISK, validate-schema.ts) uses to detect
// the hazard, so the detector and the fix can never drift apart.
//
// DISPLAY ONLY. Component `expected_value`s keep full precision — nothing here touches a
// stored figure, a tolerance, or a marking decision.

/** Half-way boundary tolerance. A value within this of a `.5` boundary at the target
 *  precision is treated as sitting ON the boundary. Shared with validate-schema.ts. */
export const BOUNDARY_EPS = 1e-9;

/**
 * Fixed-precision rendering with boundary-aware half-away-from-zero rounding.
 * Behaviour is IDENTICAL to `Number.prototype.toFixed` for every value that is not within
 * BOUNDARY_EPS of a half-way boundary — so this is a no-op for the overwhelming majority of
 * figures and only bites on exact ties.
 *
 * Half-AWAY-FROM-ZERO (not half-toward-+infinity) is the exam/accounting convention: a
 * magnitude of 1.95 renders "2.0" whether it is positive or negative, so -1.95 -> "-2.0".
 */
export function fixedHalfUp(value: number, dp: number): string {
  if (!Number.isFinite(value)) return value.toFixed(dp);
  const p = Math.pow(10, dp);
  let scaled = value * p;
  // Epsilon-snap to the mathematical tie, so the rounding below sees 937.5 rather than
  // 937.4999999999999.
  const frac = scaled - Math.floor(scaled);
  if (Math.abs(frac - 0.5) < BOUNDARY_EPS) scaled = Math.floor(scaled) + 0.5;
  const rounded = scaled >= 0 ? Math.floor(scaled + 0.5) : Math.ceil(scaled - 0.5);
  // `|| 0` normalises -0 to 0 so a rounded-to-zero negative never renders "-0.0".
  return ((rounded || 0) / p).toFixed(dp);
}

/** True when `value` sits on (within BOUNDARY_EPS of) a half-way boundary at `dp` places —
 *  i.e. code and a hand-working student could legitimately disagree on the last digit. */
export function isOnRoundingBoundary(value: number, dp: number): boolean {
  if (!Number.isFinite(value)) return false;
  const scaled = Math.abs(value) * Math.pow(10, dp);
  const frac = scaled - Math.floor(scaled);
  return Math.abs(frac - 0.5) < BOUNDARY_EPS;
}

/** Is `shown` present in `text` as a COMPLETE number rather than the prefix of a longer one?
 *  "96.5" must NOT match inside "96.55", and "1.2" must not match inside "11.2". This guard
 *  exists because a naive substring test manufactured a false "live drills are mismarking"
 *  alarm during FR3 — two `closing_price` values that are rendered at 2 dp (where they are
 *  unambiguous) looked like 1-dp boundary hits. */
export function rendersAsWholeNumber(text: string, shown: string): boolean {
  const esc = shown.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\d.])${esc}(?!\\d)`).test(text);
}
