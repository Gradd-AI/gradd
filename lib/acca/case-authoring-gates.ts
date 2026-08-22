// lib/acca/case-authoring-gates.ts
//
// Durable, COMMITTED pre-insert gate barrier for CASE/MOCK requirements (Section A/B mock
// papers → acca_case_requirements rows), as distinct from the per-drill gate flow in
// scripts/generate-acca-drills.ts (single practice drills → acca_drills rows, its own
// buildOfrProof + inline gate loop).
//
// Extracted 2026-07-25 (AFM Mock Paper 1 FR review) because GATE 26
// (recommendation-consistency) and P9 (zero-additional-tax-phrasing) — both introduced for
// Mock Paper 1 — previously lived ONLY inside scripts/_author_mock_paper1.ts's local
// gateNumeric(), a gitignored one-off (scripts/_*). A future mock (Paper 2, 3, ...) authored
// by a DIFFERENT script would never call them, and the fence would silently stop applying.
//
// Companion to lib/acca/case-gates.ts (CASE-LEVEL structural gates C1–C4, run once over the
// whole paper's shape). THIS module is the PER-REQUIREMENT barrier: GATE1–3 (numeric
// self-consistency / answer-figure-integrity / seeded-OFR), P4–P9 (prose lints), GATE 26
// (recommendation-consistency), and the calc-family gates keyed by lo_code.
//
// Convention (not a compiler-enforced rule — there is no DB trigger): every mock-authoring
// script MUST call runRequirementGateBarrier() for each requirement and refuse to insert
// unless every line is ok. scripts/_author_mock_paper1.ts is the reference caller.

import type { AnswerSchema, Verdict, StudentSubmission } from './numeric-verifier';
import { fixedHalfUp } from './rounding';
import { runDerivedFigureIntegrity } from './derived-figure-integrity';
import { verifyNumericAnswer } from './numeric-verifier';
import {
  validateSchemaSelfConsistency,
  validateParityConsistency,
  validateCurrencyScale,
  validateDoubleTaxCap,
  validateTaxProse,
  validateBestMethodVerdict,
  validateProbabilitySum,
  validateEnpvConsistency,
  validateDirectionLock,
  validateContractCount,
  validateEffectiveRateReconciliation,
  validateBasisDecayAndScepticism,
  validateHalfwayRounding,
  halfwayBlockingIssues,
  HALFWAY_CODE_BLOCKING,
  validateValuationBridge,
  type ValidationResult,
} from './validate-schema';
import {
  findCorporateTaxRates,
  lintJurisdiction,
  lintFrozenMarketFacts,
  lintCompleteness,
  lintLossRelief,
  lintRatingSymbols,
  lintMisconceptionLead,
  lintZeroAdditionalTaxPhrasing,
  lintRecommendationConsistency,
  lintTaxRateAssignment,
  lintZeroAdditionalTaxScenario,
} from './validate-afm-prose';
import type { IntlNpvInputs, IntlNpvComputed } from './international';
import type { ForwardMmhCompareInputs, ForwardMmhCompareComputed } from './fxhedge';
import type { EnpvInputs, EnpvComputed } from './risk';
import type { IrFuturesInputs, IrFuturesComputed } from './irhedge';
import { divergentEquity, type FcffComputed } from './valuation';
import type { CapmInputs, CapmComputed, CapmKind } from './capm';
import {
  validateCapmBetaRoundTrip, validateCapmTwoRateAssignment, validateCapmWaccBlend, validateCapmHc1Disclosure,
} from './validate-capm';
// capm.ts stores rates as decimals internally but accepts percentages; mirror its own asDec.
const asDecRate = (v: number): number => (v > 1 ? v / 100 : v);
import {
  checkRubricCoverage, checkScenarioAnchor, checkGenericCopy, checkRule23, checkCommittedVerdict,
  checkSkillDemand,
  type NarrativeRubric, type CriterionGrader, type NarrativeCheck, type FailureMode,
} from './narrative-marker';

// ═══════════════════════════════════════════════════════════════════════════════════════
// GATE RESULT MODEL — pass / fail / not_evaluated (2026-07-28)
// ═══════════════════════════════════════════════════════════════════════════════════════
// A gate that CANNOT evaluate its condition must never report `pass`. Before this, a missing
// input produced either a vacuous pass (empty loop, early `return []`) or NO LINE AT ALL, and
// both read as green in a `.every(ok)` roll-up. The audit that prompted this found a re-gate
// run reporting "ALL GATES GREEN" while 13 family-gate lines never executed.
//
//   pass          — condition evaluated, held.
//   fail          — condition evaluated, violated.
//   not_evaluated — condition NOT evaluated. `blocking` decides whether that stops the
//                   barrier. Blocking is the DEFAULT for anything caused by a missing input;
//                   non-blocking is reserved for the named exemptions below, each of which
//                   must carry an `exemption` string saying why it is structurally N/A.
export type GateStatus = 'pass' | 'fail' | 'not_evaluated';
export interface GateLine {
  name: string;
  status: GateStatus;
  /** Only meaningful for not_evaluated: does this stop the barrier? */
  blocking: boolean;
  detail?: string;
  /** Required on a NON-blocking not_evaluated: the named reason it is structurally N/A. */
  exemption?: string;
}

const pass = (name: string, detail = ''): GateLine => ({ name, status: 'pass', blocking: false, detail });
const verdict = (name: string, ok: boolean, detail = ''): GateLine =>
  ok ? pass(name, detail) : { name, status: 'fail', blocking: true, detail };
/** Cannot evaluate, and that is a COVERAGE HOLE — stops the barrier. */
const unevaluated = (name: string, detail: string): GateLine => ({ name, status: 'not_evaluated', blocking: true, detail });
/** Cannot evaluate, and that is STRUCTURALLY EXPECTED — visible, named, does not stop the barrier. */
const exempt = (name: string, reason: string): GateLine => ({ name, status: 'not_evaluated', blocking: false, exemption: reason });

/** The barrier verdict. A blocking not_evaluated is as fatal as a fail — that is the point. */
export function barrierPasses(lines: GateLine[]): boolean {
  return !lines.some((l) => l.status === 'fail' || (l.status === 'not_evaluated' && l.blocking));
}
export function barrierBlockers(lines: GateLine[]): GateLine[] {
  return lines.filter((l) => l.status === 'fail' || (l.status === 'not_evaluated' && l.blocking));
}

const fmt1 = (n: number) => n.toFixed(1);

// buildOfrProof — seeds a wrong-upstream-root submission (own-figures-correct-method
// downstream) and returns the verdict every component MUST get: roots 'incorrect', every
// recomputable dependent 'carried'. Distinct per-root perturbation factors (not a single
// ×0.8) so a dependent that is a scale-invariant ratio of two roots can't cancel the error
// and false-verdict 'correct'. A second, independently-maintained copy of this same seeding
// strategy lives in scripts/generate-acca-drills.ts for the per-drill (acca_drills) gate flow
// — keep the two in sync if the strategy ever changes; they are deliberately not shared
// because the two authoring paths (case requirements vs. single drills) must never depend on
// each other.
function buildOfrProof(schema: AnswerSchema): { submission: StudentSubmission; expected: Record<string, Verdict> } {
  const own = new Map<string, number>();
  const components: StudentSubmission['components'] = [];
  const expected: Record<string, Verdict> = {};
  let rootIdx = 0;
  for (const c of schema.components) {
    const deps = c.depends_on ?? [];
    if (deps.length === 0 || !c.recompute) {
      const factor = Math.max(0.30, 0.85 - rootIdx * 0.06);
      rootIdx++;
      const perturbed = c.expected_value * factor;
      own.set(c.component_id, perturbed);
      components.push({ component_id: c.component_id, value: perturbed, workings: `seeded upstream error (×${factor.toFixed(2)})` });
      expected[c.component_id] = 'incorrect';
    } else {
      const depVals: Record<string, number> = {};
      for (const d of deps) depVals[d] = own.get(d)!;
      const val = c.recompute(depVals);
      own.set(c.component_id, val);
      components.push({ component_id: c.component_id, value: val, workings: `correct method on own upstream figures` });
      expected[c.component_id] = 'carried';
    }
  }
  return { submission: { components }, expected };
}

// The requirement's own prose fields + the flags the prose lints need. `context` is the
// case's scenario text (exhibits joined), shared across every requirement in a case.
export interface RequirementProseFields {
  question: string;
  context: string;
  model_answer: string;
  hint: string;
  full_reveal: string;
  // NOTE `hasLoss` was REMOVED 2026-07-28. It was caller-supplied, so a caller passing a
  // hardcoded `false` silently disabled P6 — which is exactly what happened in the first
  // mock re-gate. It is now DERIVED from the family input by `deriveHasLoss`, and where it
  // cannot be derived P6 reports not_evaluated + BLOCKING rather than passing vacuously.
  zeroAddlTax?: boolean;
  compare?: { selected: string; all: string[] };
  /** The calculator's own input/result objects for this requirement. REQUIRED: omitting them
   *  makes GATE 27 report not_evaluated + BLOCKING (it used to report a silent pass). See the
   *  ENGAGEMENT RULE in lib/acca/derived-figure-integrity.ts. */
  computed?: unknown[];
}

// ── P6's loss-year fact, DERIVED from the calculator result, never caller-supplied ──
// lintLossRelief early-returns [] when hasLossYear is false, so a wrong `false` is an
// invisible no-op. Only the family result object knows whether a taxable loss year exists.
function deriveHasLoss(family: FamilyGateInput): { determined: true; value: boolean; why: string } | { determined: false; why: string } {
  switch (family.lo) {
    case 'B5b':
      return { determined: true, value: family.npvC.years.some((y) => y.taxable_profit < 0), why: 'derived from npvC.years[].taxable_profit' };
    // These families model no taxable-profit period stream at all, so a tax loss year is
    // structurally impossible — not "assumed absent", genuinely not representable.
    case 'E2b': return { determined: true, value: false, why: 'fxhedge models a single-period hedge, no taxable-profit stream exists' };
    case 'E3a': return { determined: true, value: false, why: 'irhedge models interest cash flows only, no taxable-profit stream exists' };
    case 'B1a': return { determined: true, value: false, why: 'risk/ENPV models scenario NPVs, not taxable profits — a negative NPV is not a tax loss' };
    case 'B4a': return { determined: true, value: false, why: 'valuation models a perpetuity flow, no taxable-profit period stream exists' };
    case 'B3e': return { determined: true, value: false, why: 'capm is a RATES-ONLY family — betas, Ke, Kd and WACC; it models no cash flows at all, so no taxable-profit stream and no loss year can exist' };
    case 'NO_FAMILY_GATES':
      return { determined: false, why: `no family result object for lo "${family.forLo}" — the loss-year fact cannot be derived, so P6 cannot be evaluated` };
  }
}

/** Which families REQUIRE `f.compare`. A comparison family without it cannot run GATE 26. */
function familyDeclaresComparison(family: FamilyGateInput): boolean {
  return family.lo === 'E2b'; // forward vs money-market hedge — the recommendation IS the answer
}

// GATE1–3 + P4–P9 + GATE 26 — the part of the barrier that applies to EVERY numeric
// requirement regardless of calc kind. Verbatim port of gateNumeric() from
// scripts/_author_mock_paper1.ts (2f494f5) — behaviour-preserving extraction, not a rewrite.
export function runBaseRequirementGates(schema: AnswerSchema, f: RequirementProseFields, family: FamilyGateInput): GateLine[] {
  const g: GateLine[] = [];

  const v1 = validateSchemaSelfConsistency(schema);
  g.push(verdict('GATE1 self-consistency', v1.ok, v1.issues.map((i) => `${i.gate}/${i.code} ${i.component_id}`).join(' | ')));

  const norm = f.model_answer.replace(/,/g, '');
  // Accept EITHER rendering of a figure: plain toFixed OR the boundary-aware
  // `fixedHalfUp` the calculators now display with (lib/acca/rounding.ts). Without the
  // second form, GATE 2 would fail every value sitting on a half-way boundary — the prose
  // legitimately shows "0.938" while toFixed(3) of the float yields "0.937".
  const present = (n: number) => [1, 2, 3, 4].some((d) =>
    norm.includes(n.toFixed(d)) || norm.includes(Math.abs(n).toFixed(d)) ||
    norm.includes(fixedHalfUp(n, d)) || norm.includes(fixedHalfUp(Math.abs(n), d)));
  const missing = schema.components.filter((c) => !present(c.expected_value)).map((c) => `${c.component_id}=${fmt1(c.expected_value)}`);
  g.push(schema.components.length === 0
    ? unevaluated('GATE2 answer↔schema figures', 'schema has NO components — there are no code-owned figures to look for, so a green here would be vacuous (GATE1 also fails, but GATE2 must not print PASS)')
    : verdict('GATE2 answer↔schema figures', missing.length === 0, missing.join(', ')));

  const { submission, expected } = buildOfrProof(schema);
  const res = verifyNumericAnswer(schema, submission);
  let ofrOk = true;
  const bad: string[] = [];
  for (const pc of res.per_component) if (pc.verdict !== expected[pc.component_id]) { ofrOk = false; bad.push(`${pc.component_id}:${pc.verdict}≠${expected[pc.component_id]}`); }
  const anyCarried = res.per_component.some((p) => p.verdict === 'carried');
  g.push(verdict('GATE3 seeded-OFR', ofrOk && anyCarried, bad.join(' | ') || (anyCarried ? '' : 'no carried')));

  const p4 = [...lintJurisdiction({ question: f.question, context_text: f.context, model_answer: f.model_answer }), ...lintFrozenMarketFacts({ question: f.question, context_text: f.context, model_answer: f.model_answer })];
  g.push(verdict('P4 jurisdiction/frozen', p4.length === 0, p4.map((i) => i.code + ':' + i.message).join(' | ')));

  const p5 = lintCompleteness(f.question, f.model_answer);
  g.push(verdict('P5 completeness', p5.length === 0, p5.map((i) => i.code + ':' + i.message).join(' | ')));

  // P6 — the loss-year fact is DERIVED (deriveHasLoss), never taken from the caller.
  const loss = deriveHasLoss(family);
  if (!loss.determined) {
    g.push(unevaluated('P6 loss-relief', loss.why));
  } else if (!loss.value) {
    g.push(exempt('P6 loss-relief', `no loss year — ${loss.why}`));
  } else {
    const p6 = lintLossRelief(true, f.context);
    g.push(verdict('P6 loss-relief', p6.length === 0, p6.map((i) => i.code).join(', ')));
  }

  const p8 = lintRatingSymbols({ question: f.question, context_text: f.context, model_answer: f.model_answer });
  g.push(verdict('P8 rating-symbols', p8.length === 0, p8.map((i) => i.code).join(', ')));

  const p4r = [...lintJurisdiction({ hint: f.hint, full_reveal: f.full_reveal }, { context: f.context }), ...lintFrozenMarketFacts({ hint: f.hint, full_reveal: f.full_reveal })];
  g.push(verdict('P4 reveal jur/frozen', p4r.length === 0, p4r.map((i) => i.code + ':' + i.message).join(' | ')));

  const p7 = lintMisconceptionLead(f.full_reveal);
  g.push(!f.full_reveal
    ? exempt('P7 misconception-lead', 'no full_reveal on this requirement — the lint has nothing to read (a pre-existing content gap tracked separately, not a coverage hole in the gate)')
    : verdict('P7 misconception-lead', p7.length === 0, p7.map((i) => i.code).join(', ')));

  // P9 zero-additional-tax phrasing (requirement's own prose only — NOT the shared scenario)
  const p9 = lintZeroAdditionalTaxPhrasing(f.zeroAddlTax === true, { model_answer: f.model_answer, hint: f.hint, full_reveal: f.full_reveal });
  g.push(f.zeroAddlTax !== true
    ? exempt('P9 zero-additional-tax phrasing', 'this requirement is not on the nil-additional-tax branch — the misteaching P9 guards against is not reachable here')
    : verdict('P9 zero-additional-tax phrasing', p9.length === 0, p9.map((i) => i.field + ': ' + i.code).join(' | ')));

  // GATE 26 recommendation-consistency (only for comparison requirements)
  if (f.compare) {
    const g26 = lintRecommendationConsistency(f.compare.selected, f.compare.all, { model_answer: f.model_answer, full_reveal: f.full_reveal });
    g.push(verdict('GATE 26 recommendation-consistency', g26.length === 0, g26.map((i) => i.code + ': ' + i.message).join(' | ')));
  } else if (familyDeclaresComparison(family)) {
    // A comparison family with no `compare` block CANNOT have its recommendation checked.
    // Previously this emitted no line at all — the skip was invisible.
    g.push(unevaluated('GATE 26 recommendation-consistency', `family ${family.lo} declares a comparison but no f.compare was supplied — the selected-method-vs-prose check cannot run`));
  } else {
    g.push(exempt('GATE 26 recommendation-consistency', `family ${family.lo} declares no comparison — there is no selected-method claim to check`));
  }

  // P9-SCENARIO — the nil-branch resolved-outcome check on the SHARED scenario/exhibits,
  // the one field P9 proper deliberately does not scan (FR3).
  const p9s = lintZeroAdditionalTaxScenario(f.zeroAddlTax === true, `${f.context}\n${f.question}`);
  g.push(f.zeroAddlTax !== true
    ? exempt('P9-SCENARIO resolved-outcome in scenario', 'not on the nil-additional-tax branch — the resolved-outcome phrasing P9-SCENARIO guards against is not reachable here')
    : verdict('P9-SCENARIO resolved-outcome in scenario', p9s.length === 0, p9s.map((i) => i.code + ': ' + i.message).join(' | ')));

  // TAX_RATE_ASSIGNMENT — runs on the SCENARIO the candidate sees (context/exhibits +
  // question), not the worked answer. Structural no-op unless ≥2 distinct corporate tax
  // rates are in scope, so single-jurisdiction requirements are unaffected.
  const gTax = lintTaxRateAssignment(`${f.context}\n${f.question}`);
  const taxRates = findCorporateTaxRates(`${f.context}
${f.question}`);
  g.push(taxRates.length < 2
    ? exempt('TAX_RATE_ASSIGNMENT multi-rate purposes', `only ${taxRates.length} corporate tax rate(s) in scope — there is nothing to mis-assign between`)
    : verdict('TAX_RATE_ASSIGNMENT multi-rate purposes', gTax.length === 0, gTax.map((i) => i.code + ': ' + i.message).join(' | ')));

  // HALFWAY_ROUNDING_RISK — a code-owned figure rendered at a precision where code and a
  // hand-working student can legitimately disagree on the last digit. ASSESSMENT hazard:
  // answer-locked marking must not be able to mark a correct student wrong.
  // EITHER-RENDERING RULE (FR3-CORRECTED): `gHalf.ok` is false only when NEITHER candidate
  // rendering survives the component's own tolerance. A hit the tolerance absorbs is real but
  // cosmetic — it is surfaced in `detail` (prefixed ADVISORY) and does not fail the barrier.
  // Without this the gate blocked on figures no student could ever be mismarked on, which is
  // what pushed the previous round toward re-authoring drills that were never defective.
  const gHalf = validateHalfwayRounding(schema, f.model_answer);
  const halfBlocking = halfwayBlockingIssues(gHalf);
  const halfAdvisory = gHalf.issues.filter((i) => i.code !== HALFWAY_CODE_BLOCKING);
  // The gate reads the PROSE to decide which rendering is shown; with no prose (or no
  // components) every hit short-circuits and it returns a vacuous ok. That is a coverage hole,
  // not a pass. (Beyond the enumerated brief — same shape as the GATE 2 empty-components case.)
  g.push(schema.components.length === 0 || !f.model_answer.trim()
    ? unevaluated('HALFWAY_ROUNDING_RISK boundary figures',
        schema.components.length === 0
          ? 'schema has NO components — no code-owned figure to test for a boundary rendering'
          : 'model_answer is empty — the gate decides on which rendering the PROSE shows, so with no prose every hit short-circuits and the green is vacuous')
    : verdict('HALFWAY_ROUNDING_RISK boundary figures', gHalf.ok, [
        ...halfBlocking.map((i) => 'BLOCKING ' + i.component_id + ': ' + i.message),
        ...halfAdvisory.map((i) => 'ADVISORY ' + i.component_id + ': ' + i.message),
      ].join(' | ')));

  // GATE 27 DERIVED_FIGURE_INTEGRITY — the reverse of GATE 2. GATE 2 asks "is every code
  // figure in the prose?"; this asks "does every figure in the prose trace back to code?".
  // Derived intermediates (a comparison margin, a Σ, a post-tax Kd) are the exposed class.
  // LOUD, but engaged ONLY when the caller supplies the calculator result object.
  const g27 = runDerivedFigureIntegrity(
    { model_answer: f.model_answer, hint: f.hint, full_reveal: f.full_reveal },
    schema.components.map((c) => c.expected_value),
    `${f.context}\n${f.question}`,
    f.computed,
  );
  // Not engaged = NOT EVALUATED, and blocking. It used to emit `ok: true` with a "(no-op)"
  // suffix, which is green in any boolean roll-up — the single most-reported false green in
  // the corpus. Supplying `computed` is now the caller's obligation.
  g.push(!g27.engaged
    ? unevaluated('GATE 27 derived-figure integrity', `${g27.reason} — supply f.computed (the calculator's input/result objects) or the prose is unchecked against code`)
    : verdict('GATE 27 derived-figure integrity', g27.orphans.length === 0,
        g27.orphans.map((o) => `${o.field} "${o.token}" ${o.excerpt}`).join(' | ')));

  return g;
}

// Calc-family gates keyed off lo_code — mirrors familyGates() from
// scripts/_author_mock_paper1.ts. Add a new lo_code branch HERE (in the committed module,
// never inside an authoring script) when a future mock draws on a calc family not yet
// covered — that is what keeps the barrier durable across scripts. The two
// "sentence-presence" gates (irhedge convention-sentence, fxhedge quote-sentence) are
// drill-generator context-injection checks, N/A to hand-authored case exhibits — skipped
// here as they are in the drill-generator's own equivalent.
export type FamilyGateInput =
  | { lo: 'B5b'; npvIn: IntlNpvInputs; npvC: IntlNpvComputed; modelAnswer: string }
  | { lo: 'E2b'; fxIn: ForwardMmhCompareInputs; fxC: ForwardMmhCompareComputed }
  | { lo: 'B1a'; enpvIn: EnpvInputs; enpvC: EnpvComputed }
  | { lo: 'E3a'; irIn: IrFuturesInputs; irC: IrFuturesComputed; modelAnswer: string }
  | { lo: 'B4a'; fcffC: FcffComputed; debtValue: number; equityWeight: number; modelAnswer: string }
  | { lo: 'B3e'; capmIn: CapmInputs; capmC: CapmComputed; capmKind: CapmKind; modelAnswer: string }
  // The ONLY way to say "this requirement has no calc-family gates" — explicit, named, and
  // it still forces the caller to state the loss-year fact's derivability. Omitting the
  // family argument entirely is now a COMPILE ERROR, which is the primary fix: the previous
  // optional parameter let a caller drop all 13 family-gate lines with no diagnostic.
  | { lo: 'NO_FAMILY_GATES'; forLo: string; reason: string };

export function runFamilyGates(input: FamilyGateInput): GateLine[] {
  const g: GateLine[] = [];
  const add = (name: string, r: ValidationResult) => g.push(verdict(name, r.ok, r.issues.map((i) => i.message).join(' | ')));

  switch (input.lo) {
    case 'B5b': {
      const { npvIn, npvC, modelAnswer } = input;
      add('INTL-12 parity-consistency', validateParityConsistency(npvC.fx_curve, npvIn.base_spot, npvIn.basis, npvIn.rate_home, npvIn.rate_foreign));
      add('INTL-13 currency-scale', validateCurrencyScale(npvC.years.map((y) => ({ fx: y.fx, foreign_remit_net: y.foreign_remit_net, home_cf: y.home_cf }))));
      add('INTL-14 double-tax-cap', validateDoubleTaxCap(npvIn.withholding_rate, npvIn.home_tax_rate, npvIn.foreign_build.tax_rate, npvIn.wht_creditable, npvC.years.map((y) => ({ taxable_profit: y.taxable_profit, fcff: y.foreign_cf, additional_home_tax_foreign: y.additional_home_tax_foreign }))));
      add('INTL-14b tax-prose', validateTaxProse(npvIn.foreign_build.tax_rate, npvIn.home_tax_rate, npvC.add_tax_rate_effective, npvC.has_additional_home_tax, modelAnswer));
      break;
    }
    case 'E2b': {
      const { fxIn, fxC } = input;
      add('FXH-19 best-method-verdict', validateBestMethodVerdict(fxIn.direction, fxC.comparison.results, fxC.comparison.best.method, fxC.comparison.margin));
      break;
    }
    case 'B1a': {
      const { enpvIn, enpvC } = input;
      add('RISK-Ga probability-sum', validateProbabilitySum(enpvIn.scenarios.map((sc) => sc.probability)));
      add('RISK-Gb enpv-consistency', validateEnpvConsistency(enpvC.scenarios.map((sc) => ({ probability: sc.probability, npv: sc.npv })), enpvC.enpv));
      break;
    }
    case 'E3a': {
      const { irIn, irC, modelAnswer } = input;
      add('IRH-20 direction-lock', validateDirectionLock(irIn.direction, 'futures', { futures_side: irC.side }));
      add('IRH-21 contract-count', validateContractCount(irIn.notional, irIn.contract_size, irIn.hedge_months, irIn.contract_months, irC.contracts));
      add('IRH-23 basis-decay+scepticism', validateBasisDecayAndScepticism(irIn.spot_rate0, irIn.futures0, irIn.months_to_expiry, irIn.months_to_transaction, irC.unexpired_basis, irIn.scenarios[0].base_rate, irC.scenarios[0].closing_price, modelAnswer));
      add('IRH-25 effective-rate-reconciliation', validateEffectiveRateReconciliation(irC.scenarios.map((sc) => sc.effective_rate)));
      break;
    }
    case 'B4a': {
      // Valuation family (fcff_enterprise, the CAPM→WACC-composed kind). GATE 11 checks the
      // flow is matched to the right rate and the debt bridge runs the right way; GATE 11b is
      // the FIX-1 pattern rule — a DCF equity diverging >50% from the ESTIMATED equity figure
      // used to weight the WACC must carry the divergence-reconciliation point (the builder
      // injects it; this enforces that it survived). Both mirror the drill generator's own
      // loop in scripts/generate-acca-drills.ts, kept here so a case/mock caller gets them too.
      const { fcffC, debtValue, equityWeight, modelAnswer } = input;
      add('VAL-11 flow/rate/bridge', validateValuationBridge('fcff_enterprise', fcffC, { debt_value: debtValue }));
      const diverges = divergentEquity(fcffC.equity_value, equityWeight);
      const hasRecon = /Reconcile the equity divergence/.test(modelAnswer);
      g.push(!diverges
        ? exempt('VAL-11b equity-divergence reconciliation', 'DCF equity does not diverge >50% from the estimated equity weight — the reconciliation point this gate requires is not owed')
        : verdict('VAL-11b equity-divergence reconciliation', hasRecon, hasRecon ? '' : 'DCF equity diverges >50% from the estimated equity weight but the model answer omits the reconciliation point'));
      break;
    }
    case 'B3e': {
      // capm (calculator #5). CAPM-1/2/4/9 at the authoring-time bar; CAPM-3/5/6/7/8 parked in
      // docs/AFM_SURFACED.md. Each gate is SKIPPED as a named exemption where it is structurally
      // N/A, never run-and-passed vacuously — see P-G1.
      const { capmIn, capmC, capmKind, modelAnswer: capmMa } = input;
      const ptax = capmIn.peer_tax_rate !== undefined ? asDecRate(capmIn.peer_tax_rate) : asDecRate(capmIn.tax_rate);
      const otax = asDecRate(capmIn.tax_rate);
      const twoRate = Math.abs(ptax - otax) > 1e-12;
      const betaD = capmIn.debt_beta ?? 0;
      // The peer chain exists on every kind EXCEPT org_wacc, which uses the company's own listed
      // beta directly and performs no ungear/regear at all.
      const hasPeerChain = capmKind !== 'org_wacc';
      const assetBeta = capmC.asset_beta ?? capmC.project_asset_beta;

      // ── CAPM-1 round-trip ──
      if (!hasPeerChain || assetBeta === undefined || capmC.peer_equity_beta === undefined) {
        g.push(exempt('CAPM-1 ungear/regear round-trip',
          capmKind === 'org_wacc'
            ? 'org_wacc uses the company\'s own listed equity beta directly — there is no ungear/regear pair to invert'
            : 'no peer equity beta / asset beta on this result object — nothing to round-trip'));
      } else {
        add('CAPM-1 ungear/regear round-trip', validateCapmBetaRoundTrip(
          capmC.peer_equity_beta, capmIn.peer_ve!, capmIn.peer_vd!, ptax, betaD, assetBeta));
      }

      // ── CAPM-2 HC1 two-rate lock ──
      if (!twoRate) {
        g.push(exempt('CAPM-2 HC1 two-rate assignment', `single-jurisdiction drill: the peer and the appraising company are both taxed at ${(otax * 100).toFixed(2)}%, so there are no two rates to swap`));
      } else if (!hasPeerChain || assetBeta === undefined || capmC.peer_equity_beta === undefined) {
        g.push(exempt('CAPM-2 HC1 two-rate assignment', 'org_wacc performs no ungearing, so HC1 does not apply'));
      } else {
        const regearBase = capmC.regeared_beta ?? capmC.project_beta;
        const ownVe = capmKind === 'project_specific' ? capmIn.own_ve! : capmIn.company_ve!;
        const ownVd = capmKind === 'project_specific' ? capmIn.own_vd! : capmIn.company_vd!;
        add('CAPM-2 HC1 two-rate assignment', validateCapmTwoRateAssignment(
          capmC.peer_equity_beta, capmIn.peer_ve!, capmIn.peer_vd!, ownVe, ownVd,
          ptax, otax, betaD, assetBeta, regearBase));
      }

      // ── CAPM-4 WACC weight + blend ──
      if (capmC.wacc === undefined && capmC.project_wacc === undefined) {
        g.push(exempt('CAPM-4 WACC weight + blend', 'keu_for_apv computes no WACC — the deliverable is the ungeared Keu'));
      } else {
        const ve = capmKind === 'project_specific' ? capmIn.own_ve! : capmIn.company_ve!;
        const vd = capmKind === 'project_specific' ? capmIn.own_vd! : capmIn.company_vd!;
        const keUsed = capmKind === 'wrong_hurdle' ? capmC.project_ke! : capmC.ke!;
        const waccUsed = capmKind === 'wrong_hurdle' ? capmC.project_wacc! : capmC.wacc!;
        add('CAPM-4 WACC weight + blend', validateCapmWaccBlend(
          keUsed, capmC.kd_after_tax!, capmC.weight_equity!, capmC.weight_debt!, ve, vd, waccUsed));
      }

      // ── CAPM-9 HC1 disclosure ──
      if (!twoRate) {
        g.push(exempt('CAPM-9 HC1 disclosure', 'single-rate drill: there is no house convention to disclose'));
      } else {
        add('CAPM-9 HC1 disclosure', validateCapmHc1Disclosure(
          `${(ptax * 100).toFixed(2)}%`, `${(otax * 100).toFixed(2)}%`, capmKind, capmMa));
      }
      break;
    }
    case 'NO_FAMILY_GATES': {
      // Explicit, named, VISIBLE. The requirement genuinely has no calc-family gates — but it
      // says so on the record with a reason, instead of the previous silent empty array.
      g.push(exempt(`family gates (${input.forLo})`, input.reason));
      break;
    }
    default: {
      // Unreachable at type level; a runtime backstop for an lo_code arriving via a cast.
      // THROWS rather than returning [] — an unregistered family used to mean "no gates ran",
      // reported as green. If you are adding a calc family, add its branch above; if it truly
      // has none, pass { lo: 'NO_FAMILY_GATES', forLo, reason }.
      const unreachable: never = input;
      throw new Error(`runFamilyGates: unregistered lo_code — no family-gate branch and no explicit NO_FAMILY_GATES exemption: ${JSON.stringify(unreachable)}`);
    }
  }
  return g;
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// N1–N5 NARRATIVE BARRIER — the single committed orchestration
// ═══════════════════════════════════════════════════════════════════════════════════════
// Previously N1–N5 were wired ad hoc in TWO scripts (_author_mock_paper1.ts and
// generate-acca-drills.ts). That is precisely how N4 skipped three narrative requirements
// undetected: one caller looked for `rubric.golden_bad` while the rubric stores it at
// `_authoring.golden_bad`, found nothing, and printed a skip line nobody counted.
//
// A missing golden BAD is now not_evaluated + BLOCKING: N4 is the verifier-of-the-verifier,
// the one gate that tests whether the marker can tell a good answer from a bad one. Running
// without it is not "mostly gated".
export interface NarrativeGateInput {
  rubric: NarrativeRubric;
  scenario: string;
  /** The golden GOOD answer — the stored model_answer. */
  reveal: string;
  /** `answer_schema._authoring.golden_bad`. Absent → N4 blocks. */
  goldenBad?: string;
  /** `answer_schema._authoring.designed_bad_flags`. Absent/empty → N4 blocks. */
  designedBadFlags?: FailureMode[];
  /** The DECLARED professional skill (`acca_drills.professional_skill_tag`). Absent → N6 says so
   *  rather than passing: the gate exists to check the rubric against a declared skill and must
   *  not invent one. Non-blocking — most existing narrative rows predate the declaration. */
  skill?: string | null;
  grader: CriterionGrader;
}

export async function runNarrativeGateBarrier(input: NarrativeGateInput): Promise<GateLine[]> {
  const { rubric, scenario, reveal, goldenBad, designedBadFlags, skill, grader } = input;
  const g: GateLine[] = [];

  // A rubric with no criteria makes N1/N2/N4 vacuous — every loop is empty and every
  // aggregate trivially satisfied. Block before spending a single model call.
  if (!rubric.criteria?.length) {
    return [unevaluated('N1–N5 narrative barrier', 'rubric has NO criteria — every narrative gate would iterate an empty set and pass vacuously')];
  }
  if (!rubric.requirement_parts?.length) {
    g.push(unevaluated('N1 rubric-coverage', 'rubric has NO requirement_parts — the part→criterion coverage check has nothing to iterate'));
  }
  if (!rubric.scenario_facts?.length) {
    g.push(unevaluated('N2 scenario-anchor', 'rubric has NO scenario_facts — the anchor check has nothing to iterate, so a green would be vacuous'));
  }

  const toLine = (name: string, r: NarrativeCheck) => verdict(name, r.ok, r.reason ?? '');

  if (rubric.requirement_parts?.length) g.push(toLine('N1 rubric-coverage', await checkRubricCoverage(rubric, reveal, scenario, grader)));
  if (rubric.scenario_facts?.length) g.push(toLine('N2 scenario-anchor', checkScenarioAnchor(rubric, scenario, reveal)));
  g.push(toLine('N3 generic/copy', checkGenericCopy(reveal, scenario)));

  if (!goldenBad) {
    g.push(unevaluated('N4 Rule-23 GOOD/BAD', 'no golden BAD answer supplied (answer_schema._authoring.golden_bad) — N4 is the verifier-of-the-verifier and CANNOT be skipped quietly'));
  } else if (!designedBadFlags?.length) {
    g.push(unevaluated('N4 Rule-23 GOOD/BAD', 'no designed_bad_flags supplied — the raised-failure-mode half of N4 would compare against an empty set and pass vacuously'));
  } else {
    g.push(toLine('N4 Rule-23 GOOD/BAD', await checkRule23(rubric, scenario, reveal, goldenBad, designedBadFlags, grader)));
  }

  // N5 is conditional BY DESIGN: it only bites where the requirement asks for a verdict.
  const wantsVerdict = rubric.requirement_parts.some((p) => /recommend|advise|conclude|evaluate|assess|should/i.test(p))
    || rubric.criteria.some((c) => /recommend|verdict|conclusion/i.test(c.required_point));
  g.push(wantsVerdict
    ? toLine('N5 committed-verdict', checkCommittedVerdict(rubric, reveal))
    : exempt('N5 committed-verdict', 'no requirement part or criterion asks for a recommendation/conclusion — there is no verdict to commit to'));

  // N6 — skill-demand STRUCTURE. Each part reports independently so a part that cannot run is
  // visibly not_evaluated rather than folded into a green.
  //
  // CLAIM CEILING, verbatim: a green N6 means "the scenario admits the act and the rubric names
  // the skill as the marking basis". It NEVER means "the rubric demands the skill" — that is a
  // semantic judgement with no structural discriminator and it stays with N1/N4 and a human
  // reader. See the header of checkSkillDemand.
  //
  // NON-BLOCKING by design: every narrative row authored before 2026-08-02 predates the declared
  // skill reaching the rubric author, so a blocking N6 would refuse to re-gate the existing
  // corpus — which is the very thing you want to be able to measure.
  for (const p of checkSkillDemand(rubric, scenario, skill).parts) {
    g.push(p.status === 'not_evaluated'
      ? exempt(p.name, p.detail)
      : verdict(p.name, p.status === 'pass', p.detail));
  }

  return g;
}

// THE durable pre-insert barrier for any case/mock NUMERIC requirement: base GATE1–3 +
// P4–P9 + GATE 26, plus the calc-family gates keyed off lo_code when family gate inputs are
// supplied. A requirement whose lo_code has no registered family-gate branch above passes
// this stage with zero extra lines (same behaviour as the pre-extraction familyGates()
// returning [] for an unrecognised lo) — narrative requirements are marked entirely by the
// separate N1–N5 narrative-marker gates (lib/acca/narrative-marker.ts), not by this function.
export function runRequirementGateBarrier(schema: AnswerSchema, f: RequirementProseFields, family: FamilyGateInput): GateLine[] {
  // The type makes omission a COMPILE error — but `scripts/` is excluded from tsconfig
  // (tsconfig.json "exclude": ["node_modules","scripts"]) and tsx transpiles without
  // type-checking, so the authoring scripts that actually call this are NOT compile-checked.
  // This runtime guard is the real backstop for them: throw with an actionable message rather
  // than dying on `undefined.lo` three frames down.
  if (!family) {
    throw new Error(
      'runRequirementGateBarrier: `family` is REQUIRED. Omitting it used to silently drop every ' +
      'calc-family gate line (13 of them on AFM Mock Paper 1) with no diagnostic. Pass the ' +
      "family gate input for this requirement's lo_code, or, if it genuinely has no family " +
      "gates, pass { lo: 'NO_FAMILY_GATES', forLo: '<lo_code>', reason: '<why>' }.",
    );
  }
  return [...runBaseRequirementGates(schema, f, family), ...runFamilyGates(family)];
}
