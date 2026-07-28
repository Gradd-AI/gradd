// lib/acca/validate-capm.ts
// CAPM family gates (calculator #5) — CAPM-1 / CAPM-2 / CAPM-4 / CAPM-9. Added 2026-07-28.
//
// capm was the ONLY family in AFM Mock Paper 1 with no registered gate branch. These four are
// the AUTHORING-TIME subset — the same bar every other family gate runs at: they take the
// calculator's input + result objects, never a stored row. The stored-row bar is deliberately
// NOT attempted; that is the 43/49 finding in docs/AFM_SURFACED.md and is not capm-specific.
//
// CAPM-3 / 5 / 6 / 7 / 8 are specced and parked in docs/AFM_SURFACED.md.
//
// FALSE-POSITIVE DISCIPLINE (a build condition, not a nicety): every threshold and every string
// match below is calibrated to what capm.ts ACTUALLY computes and what buildCapmModelAnswer
// ACTUALLY emits. Where the builder's behaviour varies by kind, the gate varies with it. A gate
// that fires on known-good content is wrong until proven otherwise.

import type { ValidationResult, ValidationIssue } from './validate-schema';

// Betas are unitless and the algebra is exact, so the round-trip tolerance is TIGHT — three
// orders tighter than the ±0.02 display tolerance a beta component carries. A round trip that
// only closes to ±0.02 has a real formula defect hiding inside it.
const CAPM_EXACT = 1e-9;

// MM with-tax ungear/regear, RE-DERIVED here rather than imported from capm.ts. A gate must not
// be "verified" by the very function it checks — if these are imported, a sign error in capm.ts
// cancels itself and CAPM-1 passes on broken content. If capm.ts's forms change, re-derive these
// from the source algebra; do not copy them across.
//   ungear: β_a = [β_e·Ve + β_d·Vd(1−T)] / [Ve + Vd(1−T)]
//   regear: β_e = β_a + (β_a − β_d)·Vd(1−T)/Ve
const ungear = (betaE: number, ve: number, vd: number, tax: number, betaD: number): number => {
  const geared = vd * (1 - tax);
  return (betaE * ve + betaD * geared) / (ve + geared);
};
const regear = (betaA: number, ve: number, vd: number, tax: number, betaD: number): number =>
  betaA + (betaA - betaD) * (vd * (1 - tax)) / ve;

/**
 * CAPM-1 — ungear/regear round-trip.
 * Regearing the asset beta back onto the PEER's own gearing at the PEER's own tax must return
 * the peer's original equity beta: the two operations are algebraic inverses.
 * Catches: transposed Ve/Vd, an inverted formula, the wrong tax inside the ungear step.
 */
export function validateCapmBetaRoundTrip(
  peerEquityBeta: number, peerVe: number, peerVd: number, peerTax: number, debtBeta: number, assetBeta: number,
): ValidationResult {
  const back = regear(assetBeta, peerVe, peerVd, peerTax, debtBeta);
  const diff = Math.abs(back - peerEquityBeta);
  if (diff <= CAPM_EXACT) return { ok: true, issues: [] };
  return {
    ok: false,
    issues: [{
      component_id: 'asset_beta', gate: 'capm-1-round-trip', code: 'ungear-regear-not-inverse',
      message: `regearing the asset beta ${assetBeta} onto the PEER's own gearing (Ve ${peerVe} / Vd ${peerVd}, T ${peerTax}) returns ${back}, not the peer's stated equity beta ${peerEquityBeta} (diff ${diff}). Ungear and regear are algebraic inverses — if the round trip does not close, one of them is mis-parameterised: transposed Ve/Vd, the wrong tax, or an inverted formula.`,
    }],
  };
}

/**
 * CAPM-2 — HC1 two-rate assignment lock.  ⭐ the highest-value check in this family.
 * HC1 (Grant ruling 25/07/2026) puts the PEER's own rate on the ungear — the shield being
 * stripped is the peer's — and the appraising company's rate on the regear. It is
 * HOUSE-AUTHORED, NOT examiner-sourced, and it moves every figure in the Section-A chain. A
 * silent swap passes every other gate in the suite.
 *
 * Asserts the assignment BOTH ways: the computed beta matches the correct rate AND does not
 * match the swapped one. The negative half is what catches a swap whose result happens to sit
 * inside a display tolerance.
 *
 * CALLER MUST SKIP when the two rates are equal — nothing can be swapped, and running it there
 * would fire on every correct single-jurisdiction drill.
 */
export function validateCapmTwoRateAssignment(
  peerEquityBeta: number, peerVe: number, peerVd: number, ownVe: number, ownVd: number,
  peerTax: number, ownTax: number, debtBeta: number,
  assetBeta: number, regearedBeta: number | undefined,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const correctAsset = ungear(peerEquityBeta, peerVe, peerVd, peerTax, debtBeta);
  const swappedAsset = ungear(peerEquityBeta, peerVe, peerVd, ownTax, debtBeta);
  if (Math.abs(assetBeta - correctAsset) > CAPM_EXACT) {
    issues.push({
      component_id: 'asset_beta', gate: 'capm-2-hc1', code: 'ungear-not-at-peer-rate',
      message: `asset beta ${assetBeta} does not match the ungear at the PEER's rate ${peerTax} (${correctAsset}). HC1 requires the peer's own rate to strip the peer's shield.`,
    });
  }
  if (Math.abs(assetBeta - swappedAsset) <= CAPM_EXACT) {
    issues.push({
      component_id: 'asset_beta', gate: 'capm-2-hc1', code: 'ungear-at-own-rate-SWAPPED',
      message: `asset beta ${assetBeta} matches the ungear at the APPRAISING COMPANY's rate ${ownTax} (${swappedAsset}) — the two HC1 rates are swapped. This moves every downstream figure and no other gate detects it.`,
    });
  }
  if (regearedBeta !== undefined) {
    const correctRegear = regear(assetBeta, ownVe, ownVd, ownTax, debtBeta);
    const swappedRegear = regear(assetBeta, ownVe, ownVd, peerTax, debtBeta);
    if (Math.abs(regearedBeta - correctRegear) > CAPM_EXACT) {
      issues.push({
        component_id: 'regeared_beta', gate: 'capm-2-hc1', code: 'regear-not-at-own-rate',
        message: `regeared beta ${regearedBeta} does not match the regear at the appraising company's rate ${ownTax} (${correctRegear}).`,
      });
    }
    if (Math.abs(regearedBeta - swappedRegear) <= CAPM_EXACT) {
      issues.push({
        component_id: 'regeared_beta', gate: 'capm-2-hc1', code: 'regear-at-peer-rate-SWAPPED',
        message: `regeared beta ${regearedBeta} matches the regear at the PEER's rate ${peerTax} (${swappedRegear}) — the two HC1 rates are swapped.`,
      });
    }
  }
  return { ok: issues.length === 0, issues };
}

/**
 * CAPM-4 — WACC weight + blend reconciliation.
 * `weight_equity`, `weight_debt` and `kd_after_tax` were promoted to NAMED result fields by the
 * FR3 / GATE-27 orphan sweep; this is the gate that makes that promotion load-bearing.
 * Catches: weights computed off the wrong Ve/Vd pair, and a WACC line whose own quoted weights
 * do not reproduce its own WACC.
 */
export function validateCapmWaccBlend(
  ke: number, kdAfterTax: number, weightEquity: number, weightDebt: number,
  ve: number, vd: number, wacc: number,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const tot = ve + vd;
  if (tot <= 0) {
    return { ok: false, issues: [{ component_id: 'wacc', gate: 'capm-4-wacc', code: 'empty-gearing-pair', message: `Ve+Vd is ${tot} — the gearing pair is empty, so no weight is computable.` }] };
  }
  if (Math.abs(weightEquity + weightDebt - 1) > 1e-9) {
    issues.push({ component_id: 'wacc', gate: 'capm-4-wacc', code: 'weights-do-not-sum-to-one', message: `We ${weightEquity} + Wd ${weightDebt} = ${weightEquity + weightDebt}, not 1.` });
  }
  if (Math.abs(weightEquity - ve / tot) > 1e-9 || Math.abs(weightDebt - vd / tot) > 1e-9) {
    issues.push({
      component_id: 'wacc', gate: 'capm-4-wacc', code: 'weights-off-the-wrong-pair',
      message: `We ${weightEquity} / Wd ${weightDebt} do not match Ve/(Ve+Vd) = ${ve / tot} and Vd/(Ve+Vd) = ${vd / tot} for the declared gearing pair (Ve ${ve}, Vd ${vd}) — the weights were computed off a different pair.`,
    });
  }
  // 1e-6 (not CAPM_EXACT): ke and kd_after_tax are percentages in the tens, so the blend
  // accumulates ~1e-13 relative error; 1e-6pp is still far tighter than any display precision.
  const blended = ke * weightEquity + kdAfterTax * weightDebt;
  if (Math.abs(blended - wacc) > 1e-6) {
    issues.push({
      component_id: 'wacc', gate: 'capm-4-wacc', code: 'blend-does-not-reproduce-wacc',
      message: `Ke ${ke} × We ${weightEquity} + Kd(1−T) ${kdAfterTax} × Wd ${weightDebt} = ${blended}, but the stated WACC is ${wacc}.`,
    });
  }
  return { ok: issues.length === 0, issues };
}

/**
 * CAPM-9 — HC1 disclosure in prose.
 * When the two rates DIFFER the model answer must say which rate ungears and attribute it to
 * the peer — the convention is house-authored, so a reader cannot otherwise tell it apart from
 * examiner doctrine.
 *
 * SCOPED TO WHAT THE BUILDER ACTUALLY EMITS. Every two-rate kind renders the `(T = the peer's
 * X)` marker, but the one-sentence WHY (`shieldWhy` in capm.ts) is pushed ONLY in the
 * project_specific branch. Requiring the WHY of all kinds would fire on correct keu_for_apv and
 * wrong_hurdle content, so it is required only where it is emitted.
 *
 * The "must not claim ACCA authority" half of the original spec is NOT enforced here. It is a
 * review judgement, not a mechanical string property, and a regex for it would manufacture
 * exactly the false positives this gate exists to avoid. Recorded rather than approximated.
 *
 * CALLER MUST SKIP when the two rates are equal.
 */
export function validateCapmHc1Disclosure(
  peerTaxPct: string, ownTaxPct: string, kind: string, modelAnswer: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const ma = modelAnswer ?? '';
  if (!ma.includes(`the peer's ${peerTaxPct}`)) {
    issues.push({
      component_id: '(prose)', gate: 'capm-9-hc1-disclosure', code: 'ungear-rate-not-attributed-to-peer',
      message: `the model answer never attributes the ungearing rate to the peer (expected the marker "the peer's ${peerTaxPct}"). HC1 is house-authored, not examiner-sourced — a two-rate drill that does not say which rate ungears is indistinguishable from an error.`,
    });
  }
  if (!ma.includes(ownTaxPct)) {
    issues.push({
      component_id: '(prose)', gate: 'capm-9-hc1-disclosure', code: 'own-rate-not-stated',
      message: `the appraising company's rate ${ownTaxPct} does not appear in the model answer, so the two-rate treatment is not visible to the student.`,
    });
  }
  if (kind === 'project_specific' && !/shield being stripped out is the peer/i.test(ma)) {
    issues.push({
      component_id: '(prose)', gate: 'capm-9-hc1-disclosure', code: 'why-sentence-missing',
      message: `a project_specific two-rate answer must carry the one-sentence WHY (the shield being stripped out is the peer's own). Other kinds are exempt — buildCapmModelAnswer only renders it here.`,
    });
  }
  return { ok: issues.length === 0, issues };
}
