// lib/acca/case-authoring-gates.ts
//
// Durable, COMMITTED pre-insert gate barrier for CASE/MOCK requirements (Section A/B mock
// papers → acca_case_requirements rows), as distinct from the per-drill gate flow in
// scripts/generate-afm-drills.ts (single practice drills → acca_drills rows, its own
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
  validateValuationBridge,
  type ValidationResult,
} from './validate-schema';
import {
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

export interface GateLine { name: string; ok: boolean; detail?: string }

const fmt1 = (n: number) => n.toFixed(1);

// buildOfrProof — seeds a wrong-upstream-root submission (own-figures-correct-method
// downstream) and returns the verdict every component MUST get: roots 'incorrect', every
// recomputable dependent 'carried'. Distinct per-root perturbation factors (not a single
// ×0.8) so a dependent that is a scale-invariant ratio of two roots can't cancel the error
// and false-verdict 'correct'. A second, independently-maintained copy of this same seeding
// strategy lives in scripts/generate-afm-drills.ts for the per-drill (acca_drills) gate flow
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
  hasLoss: boolean;
  zeroAddlTax?: boolean;
  compare?: { selected: string; all: string[] };
  /** The calculator's own input/result objects for this requirement. Supplying them ENGAGES
   *  GATE 27 (derived-figure integrity); omitting them makes it a silent no-op. See the
   *  ENGAGEMENT RULE in lib/acca/derived-figure-integrity.ts for why. */
  computed?: unknown[];
}

// GATE1–3 + P4–P9 + GATE 26 — the part of the barrier that applies to EVERY numeric
// requirement regardless of calc kind. Verbatim port of gateNumeric() from
// scripts/_author_mock_paper1.ts (2f494f5) — behaviour-preserving extraction, not a rewrite.
export function runBaseRequirementGates(schema: AnswerSchema, f: RequirementProseFields): GateLine[] {
  const g: GateLine[] = [];

  const v1 = validateSchemaSelfConsistency(schema);
  g.push({ name: 'GATE1 self-consistency', ok: v1.ok, detail: v1.issues.map((i) => `${i.gate}/${i.code} ${i.component_id}`).join(' | ') });

  const norm = f.model_answer.replace(/,/g, '');
  // Accept EITHER rendering of a figure: plain toFixed OR the boundary-aware
  // `fixedHalfUp` the calculators now display with (lib/acca/rounding.ts). Without the
  // second form, GATE 2 would fail every value sitting on a half-way boundary — the prose
  // legitimately shows "0.938" while toFixed(3) of the float yields "0.937".
  const present = (n: number) => [1, 2, 3, 4].some((d) =>
    norm.includes(n.toFixed(d)) || norm.includes(Math.abs(n).toFixed(d)) ||
    norm.includes(fixedHalfUp(n, d)) || norm.includes(fixedHalfUp(Math.abs(n), d)));
  const missing = schema.components.filter((c) => !present(c.expected_value)).map((c) => `${c.component_id}=${fmt1(c.expected_value)}`);
  g.push({ name: 'GATE2 answer↔schema figures', ok: missing.length === 0, detail: missing.join(', ') });

  const { submission, expected } = buildOfrProof(schema);
  const res = verifyNumericAnswer(schema, submission);
  let ofrOk = true;
  const bad: string[] = [];
  for (const pc of res.per_component) if (pc.verdict !== expected[pc.component_id]) { ofrOk = false; bad.push(`${pc.component_id}:${pc.verdict}≠${expected[pc.component_id]}`); }
  const anyCarried = res.per_component.some((p) => p.verdict === 'carried');
  g.push({ name: 'GATE3 seeded-OFR', ok: ofrOk && anyCarried, detail: bad.join(' | ') || (anyCarried ? '' : 'no carried') });

  const p4 = [...lintJurisdiction({ question: f.question, context_text: f.context, model_answer: f.model_answer }), ...lintFrozenMarketFacts({ question: f.question, context_text: f.context, model_answer: f.model_answer })];
  g.push({ name: 'P4 jurisdiction/frozen', ok: p4.length === 0, detail: p4.map((i) => i.code + ':' + i.message).join(' | ') });

  const p5 = lintCompleteness(f.question, f.model_answer);
  g.push({ name: 'P5 completeness', ok: p5.length === 0, detail: p5.map((i) => i.code + ':' + i.message).join(' | ') });

  const p6 = lintLossRelief(f.hasLoss, f.context);
  g.push({ name: 'P6 loss-relief', ok: p6.length === 0, detail: p6.map((i) => i.code).join(', ') });

  const p8 = lintRatingSymbols({ question: f.question, context_text: f.context, model_answer: f.model_answer });
  g.push({ name: 'P8 rating-symbols', ok: p8.length === 0, detail: p8.map((i) => i.code).join(', ') });

  const p4r = [...lintJurisdiction({ hint: f.hint, full_reveal: f.full_reveal }, { context: f.context }), ...lintFrozenMarketFacts({ hint: f.hint, full_reveal: f.full_reveal })];
  g.push({ name: 'P4 reveal jur/frozen', ok: p4r.length === 0, detail: p4r.map((i) => i.code + ':' + i.message).join(' | ') });

  const p7 = lintMisconceptionLead(f.full_reveal);
  g.push({ name: 'P7 misconception-lead', ok: p7.length === 0, detail: p7.map((i) => i.code).join(', ') });

  // P9 zero-additional-tax phrasing (requirement's own prose only — NOT the shared scenario)
  const p9 = lintZeroAdditionalTaxPhrasing(f.zeroAddlTax === true, { model_answer: f.model_answer, hint: f.hint, full_reveal: f.full_reveal });
  g.push({ name: 'P9 zero-additional-tax phrasing', ok: p9.length === 0, detail: p9.map((i) => i.field + ': ' + i.code).join(' | ') });

  // GATE 26 recommendation-consistency (only for comparison requirements)
  if (f.compare) {
    const g26 = lintRecommendationConsistency(f.compare.selected, f.compare.all, { model_answer: f.model_answer, full_reveal: f.full_reveal });
    g.push({ name: 'GATE 26 recommendation-consistency', ok: g26.length === 0, detail: g26.map((i) => i.code + ': ' + i.message).join(' | ') });
  }

  // P9-SCENARIO — the nil-branch resolved-outcome check on the SHARED scenario/exhibits,
  // the one field P9 proper deliberately does not scan (FR3).
  const p9s = lintZeroAdditionalTaxScenario(f.zeroAddlTax === true, `${f.context}\n${f.question}`);
  g.push({ name: 'P9-SCENARIO resolved-outcome in scenario', ok: p9s.length === 0, detail: p9s.map((i) => i.code + ': ' + i.message).join(' | ') });

  // TAX_RATE_ASSIGNMENT — runs on the SCENARIO the candidate sees (context/exhibits +
  // question), not the worked answer. Structural no-op unless ≥2 distinct corporate tax
  // rates are in scope, so single-jurisdiction requirements are unaffected.
  const gTax = lintTaxRateAssignment(`${f.context}\n${f.question}`);
  g.push({ name: 'TAX_RATE_ASSIGNMENT multi-rate purposes', ok: gTax.length === 0, detail: gTax.map((i) => i.code + ': ' + i.message).join(' | ') });

  // HALFWAY_ROUNDING_RISK — a code-owned figure rendered at a precision where code and a
  // hand-working student can legitimately disagree on the last digit. ASSESSMENT hazard:
  // answer-locked marking must not be able to mark a correct student wrong.
  const gHalf = validateHalfwayRounding(schema, f.model_answer);
  g.push({ name: 'HALFWAY_ROUNDING_RISK boundary figures', ok: gHalf.ok, detail: gHalf.issues.map((i) => i.component_id + ': ' + i.message).join(' | ') });

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
  g.push({
    name: 'GATE 27 derived-figure integrity' + (g27.engaged ? '' : ' (no-op)'),
    ok: g27.orphans.length === 0,
    detail: g27.engaged
      ? g27.orphans.map((o) => `${o.field} "${o.token}" ${o.excerpt}`).join(' | ')
      : g27.reason,
  });

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
  | { lo: 'B4a'; fcffC: FcffComputed; debtValue: number; equityWeight: number; modelAnswer: string };

export function runFamilyGates(input: FamilyGateInput): GateLine[] {
  const g: GateLine[] = [];
  const add = (name: string, r: ValidationResult) => g.push({ name, ok: r.ok, detail: r.issues.map((i) => i.message).join(' | ') });

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
      // loop in scripts/generate-afm-drills.ts, kept here so a case/mock caller gets them too.
      const { fcffC, debtValue, equityWeight, modelAnswer } = input;
      add('VAL-11 flow/rate/bridge', validateValuationBridge('fcff_enterprise', fcffC, { debt_value: debtValue }));
      const diverges = divergentEquity(fcffC.equity_value, equityWeight);
      const hasRecon = /Reconcile the equity divergence/.test(modelAnswer);
      g.push({
        name: 'VAL-11b equity-divergence reconciliation',
        ok: !diverges || hasRecon,
        detail: !diverges || hasRecon ? '' : 'DCF equity diverges >50% from the estimated equity weight but the model answer omits the reconciliation point',
      });
      break;
    }
  }
  return g;
}

// THE durable pre-insert barrier for any case/mock NUMERIC requirement: base GATE1–3 +
// P4–P9 + GATE 26, plus the calc-family gates keyed off lo_code when family gate inputs are
// supplied. A requirement whose lo_code has no registered family-gate branch above passes
// this stage with zero extra lines (same behaviour as the pre-extraction familyGates()
// returning [] for an unrecognised lo) — narrative requirements are marked entirely by the
// separate N1–N5 narrative-marker gates (lib/acca/narrative-marker.ts), not by this function.
export function runRequirementGateBarrier(schema: AnswerSchema, f: RequirementProseFields, family?: FamilyGateInput): GateLine[] {
  return [...runBaseRequirementGates(schema, f), ...(family ? runFamilyGates(family) : [])];
}
