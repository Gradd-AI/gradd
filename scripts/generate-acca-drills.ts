#!/usr/bin/env tsx
/**
 * generate-acca-drills.ts  (was generate-afm-drills.ts until 2026-08-19)
 *
 * Drafts ACCA practice drills and inserts them into `acca_drills` with status='candidate'.
 *
 * ⚠️ THE TWO HALVES OF THIS FILE HAVE DIFFERENT PAPER REACH, AND THE ASYMMETRY IS DELIBERATE.
 *
 *   • The CALCULATOR half (`--*-batch`, `buildSpecsForList`, every `draft*Drill`) is
 *     **AFM-ONLY BY CONSTRUCTION**, not by omission. It reads `LoMode` off AFM's
 *     SYLLABUS_MAP to route numeric verification, and every calculator family it dispatches
 *     to lives in `lib/acca/<family>.ts` against AFM conventions. SBL has no calculator
 *     families and no per-LO mode judgement (see scripts/sbl-framework.ts's DELIBERATELY
 *     ABSENT block), so there is nothing to parameterise — inventing a mode for 138 SBL
 *     outcomes would be fabricated routing data. `NUMERIC_BATCH_PAPER` names the constraint.
 *
 *   • The NARRATIVE half (pipeline #2 — `runNarrativeBatch` and everything it calls) IS
 *     paper-parameterised, because a discursive drill needs a syllabus map, a professional-
 *     skill vocabulary and a failure catalogue, and nothing else. Papers are registered in
 *     `PAPER_FRAMEWORKS` below; a `NarrativePlan` DECLARES its paper.
 *
 * AFM's output is pinned byte-for-byte across this parameterisation by
 * `npm run test:narrative-paper-pins` — see that file's header for which pins are genuine
 * pre-change captures and which are derived.
 *
 * The AFM divergences from the pilot gap analysis, unchanged:
 *
 *   • mode is READ from SYLLABUS_MAP (three-state: quantitative | mixed | discursive),
 *     never derived from a CALCULATION_LOS set (AFM has none).
 *   • calculation_required is resolved per INSTANCE: quantitative → true, discursive →
 *     false, mixed → scenario_supplies_figures (decided at spec time; no 'mixed' drill
 *     is generated in this pilot).
 *   • Pass-2 persona is EZRA (senior financial adviser to the board), not APM's Mia.
 *   • The APM examiner's nine content rules are REPLACED by the AFM failure catalogue
 *     (docs/TEACHING_PRINCIPLES_EZRA_AFM.md): fence-sitting, scenario-free discussion,
 *     hedging-specification, valuation-plumbing, undeveloped-assumption, and
 *     own-figure/abandoned-after-calc.
 *   • Quantitative drills follow the code-computes path (the D2e regression precedent),
 *     NOT the free-form model_answer path: the model supplies scenario + labelled raw
 *     inputs + evaluative prose ONLY; code (computeFcff) owns every figure, the answer
 *     schema, and the worked model answer. Doctrine: the model never decides the number
 *     (docs/AFM_NUMERIC_VERIFICATION_DESIGN.md §1).
 *
 * Every quantitative drill passes three HARD gates before insert (lib/acca/validate-schema.ts
 * + the OFR proof below): schema self-consistency, answer↔schema figure integrity, and a
 * seeded wrong-upstream carry-through proof through lib/acca/numeric-verifier.ts.
 *
 * PILOT SCOPE (2 drills): A3a (discursive) + B4c (quantitative, FCFF firm value). Only the
 * FCFF calculator is registered; other quantitative LOs throw "no calculator registered".
 * E2 forex hedging is pilot #2, gated on adding kind:'enum'/'integer' component types to
 * the numeric verifier (see AFM_NUMERIC_VERIFICATION_DESIGN.md §9).
 *
 * Usage:
 *   npm run generate-acca-drills -- --los A3a,B4c [--dry-run]
 *   npm run generate-acca-drills -- --lo A3a [--dry-run]
 *   npm run generate-acca-drills -- --narrative-batch --narrative-paper SBL --dry-run
 *
 * Reads .env.local for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.
 */

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fixedHalfUp } from '../lib/acca/rounding';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
// The AFM framework stays a DIRECT import, not a registry lookup. The calculator half needs
// `LoMode` / `LoCode` as compile-time types and reads `lo.mode` off this exact map; routing that
// through a widened registry record would erase the very types that keep the numeric batches
// honest. The registry below exists for the NARRATIVE half, which needs none of that.
import {
  SYLLABUS_MAP,
  COMMAND_VERBS,
  PROFESSIONAL_SKILLS,
  type LoCode,
  type LoMode,
  type ProfessionalSkillTag,
} from './afm-framework';
import {
  SYLLABUS_MAP as SBL_SYLLABUS_MAP,
  PROFESSIONAL_SKILLS as SBL_PROFESSIONAL_SKILLS,
  type ProfessionalSkillTag as SblProfessionalSkillTag,
} from './sbl-framework';
import {
  verifyNumericAnswer,
  type AnswerSchema,
  type StudentSubmission,
  type Verdict,
} from '../lib/acca/numeric-verifier';
import { validateSchemaSelfConsistency, validateSpreadTable, validateOptionBounds, validateValuationBridge } from '../lib/acca/validate-schema';
import { lintJurisdiction, lintCompleteness, lintLossRelief, lintFrozenMarketFacts, lintRatingSymbols, lintMisconceptionLead } from '../lib/acca/validate-afm-prose';
// Narrative pipeline (#2) — the discursive-drill marker + constrained model grader (authoring-time gate).
import {
  checkRubricCoverage, checkScenarioAnchor, checkGenericCopy, checkRule23, checkCommittedVerdict,
  checkSkillDemand,
  scenarioCopyOverlap, hasConclusion, missingAnchors, longestVerbatimRun,
  type NarrativeRubric, type Criterion, type ScenarioFact, type FailureMode as NarrativeFailureMode,
} from '../lib/acca/narrative-marker';
import { makeAnthropicCriterionGrader } from '../lib/acca/narrative-grader';
import { cacheBlock } from '../lib/acca/prompt-cache';
import {
  computeFcff,
  buildFcffSchema,
  buildFcffModelAnswer,
  normaliseCurrency,
  money,
  fmt1,
  computeFcfe,
  buildFcfeSchema,
  buildFcfeModelAnswer,
  computeDividendCapacity,
  buildDividendSchema,
  buildDividendModelAnswer,
  computeValuationCompare,
  buildCompareSchema,
  buildCompareModelAnswer,
  buildFcffComposedSchema,
  buildFcffComposedModelAnswer,
  divergentEquity,
  type FcffInputs,
  type FcffComputed,
  type SerializedSchema,
  type ValuationKind,
  type CapmFront,
  type FcfeInputs,
  type FcfeComputed,
  type DividendInputs,
  type DividendComputed,
  type CompareInputs,
  type CompareComputed,
} from '../lib/acca/valuation';
import {
  computeNpv,
  buildNpvSchema,
  buildNpvModelAnswer,
  type NpvInputs,
  type NpvComputed,
  type NpvKind,
} from '../lib/acca/npv';
import {
  computeApv,
  buildApvSchema,
  buildApvModelAnswer,
  type ApvInputs,
  type ApvComputed,
  type ApvKind,
} from '../lib/acca/apv';
import {
  computeCapm,
  buildCapmSchema,
  buildCapmModelAnswer,
  type CapmInputs,
  type CapmComputed,
  type CapmKind,
} from '../lib/acca/capm';
import {
  computeDuration,
  buildDurationSchema,
  buildDurationModelAnswer,
  type DurationInputs,
  type DurationComputed,
  type DurationKind,
} from '../lib/acca/duration';
import {
  computeCredit,
  buildCreditSchema,
  buildCreditModelAnswer,
  type CreditInputs,
  type CreditComputed,
  type CreditKind,
} from '../lib/acca/credit';
import {
  computeBsop,
  buildBsopSchema,
  buildBsopModelAnswer,
  type BsopInputs,
  type BsopComputed,
  type BsopKind,
} from '../lib/acca/bsop';
import {
  computeIntlNpv, buildIntlNpvSchema, buildIntlNpvModelAnswer,
  computeIntlSensitivity, buildIntlSensitivitySchema, buildIntlSensitivityModelAnswer,
  computeIntlRemittance, buildIntlRemittanceSchema, buildIntlRemittanceModelAnswer,
  computeIntlDividend, buildIntlDividendSchema, buildIntlDividendModelAnswer,
  buildForwardCurve,
  type InternationalKind,
  type ParityBasis,
} from '../lib/acca/international';
import { validateParityConsistency, validateCurrencyScale, validateDoubleTaxCap, validateTaxProse } from '../lib/acca/validate-schema';
import {
  computeEnpv, buildEnpvSchema, buildEnpvModelAnswer,
  computeSensitivity, buildSensitivitySchema, buildSensitivityModelAnswer,
  computeRadr, buildRadrSchema, buildRadrModelAnswer,
  computeRiskMeasures, buildRiskMeasuresSchema, buildRiskMeasuresModelAnswer,
  type RiskKind, type EnpvComputed, type SensitivityComputed, type RadrComputed, type RiskMeasuresComputed,
  type RadrInputs, type RiskMeasuresInputs,
} from '../lib/acca/risk';
import { validateProbabilitySum, validateEnpvConsistency, validateSensitivityReconciliation, validateRadrOrdering, validateVarAndDuration } from '../lib/acca/validate-schema';
import {
  computeForwardMmhCompare, buildForwardMmhCompareSchema, buildForwardMmhCompareModelAnswer,
  computeFuturesHedge, buildFuturesSchema, buildFuturesModelAnswer,
  computeOptionsHedge, buildOptionsSchema, buildOptionsModelAnswer,
  computeSwapHedge, buildSwapSchema, buildSwapModelAnswer,
  instrumentSide, fmt4, quoteDirectionSentence,
  type FxHedgeKind, type ForwardMmhCompareInputs, type ForwardMmhCompareComputed,
  type FuturesDrillInputs, type FuturesComputed, type OptionsDrillInputs, type OptionsComputed,
  type SwapDrillInputs, type SwapComputed, type QuoteDirection, type ExposureDirection, type ResidualPolicy,
} from '../lib/acca/fxhedge';
import {
  validateWholeContractIntegrity, validateBasisDecayReconciliation, validateCurrencyDirectionIntegrity,
  validatePremiumCurrency, validateBestMethodVerdict, validateQuoteSentencePresence,
} from '../lib/acca/validate-schema';

// ─────────────────────────────────────────────────────────────────────────────
// PAPERS
//
// `GeneratorPaper` is the set of papers THIS SCRIPT can author for. It is deliberately NOT
// `AccaPaper` from lib/acca/paper.ts and NOT `ServedPaper` either: those answer "what
// vocabulary exists" and "what a customer can reach". This one answers a third question —
// "what can be generated here" — and the three sets are allowed to differ. APM has its own
// generator (scripts/generate-apm-drills.ts) and is absent for that reason, not by oversight.
// ─────────────────────────────────────────────────────────────────────────────

type GeneratorPaper = 'AFM' | 'SBL';

/**
 * The CALCULATOR half's paper, as a named constant rather than a literal at the insert.
 *
 * This is not a parameter waiting for a second value. The numeric batches read `LoMode` off
 * AFM's SYLLABUS_MAP, dispatch to AFM calculator families, and gate through the AFM numeric
 * verifier; SBL has no calculator families and no per-LO mode. The constant exists so the
 * `paper_code` written by that half NAMES its constraint instead of being an unexplained
 * string at the bottom of a 200-line insert.
 */
const NUMERIC_BATCH_PAPER: GeneratorPaper = 'AFM';

/** The slice of a framework module the NARRATIVE pipeline actually reads. Both
 *  scripts/afm-framework.ts and scripts/sbl-framework.ts already export this shape; the
 *  widened records are what let one code path read either without an `any`. */
interface PaperFramework {
  /** How the paper names itself in an authoring prompt. */
  label:     string;
  /** The study-guide edition the LO descriptors are quoted from, verbatim. */
  guide:     string;
  syllabus:  Record<string, { section: string; sub_area: string; topic: string; intellectual_level: 2 | 3; descriptor: string }>;
  skills:    Record<string, { label: string; sub_descriptors: readonly string[] }>;
}

const PAPER_FRAMEWORKS: Record<GeneratorPaper, PaperFramework> = {
  AFM: {
    label:    'AFM',
    guide:    'S26–J27',
    syllabus: SYLLABUS_MAP as unknown as PaperFramework['syllabus'],
    skills:   PROFESSIONAL_SKILLS as unknown as PaperFramework['skills'],
  },
  SBL: {
    label:    'SBL',
    guide:    'S26–J27',
    syllabus: SBL_SYLLABUS_MAP as unknown as PaperFramework['syllabus'],
    skills:   SBL_PROFESSIONAL_SKILLS as unknown as PaperFramework['skills'],
  },
};

/** The LO's `mode`, where the paper's framework records one. AFM does (three-state, read never
 *  derived); SBL deliberately does not — see the DELIBERATELY ABSENT block in sbl-framework.ts.
 *  Falls back to 'discursive', which is what the narrative pipeline produces by construction. */
function loModeFor(paper: GeneratorPaper, loCode: string): string {
  const row = frameworkFor(paper).syllabus[loCode] as { mode?: string } | undefined;
  return row?.mode ?? 'discursive';
}

function frameworkFor(paper: GeneratorPaper): PaperFramework {
  const f = PAPER_FRAMEWORKS[paper];
  // A throw, not a fallback. Falling back to AFM would author an SBL drill against AFM's
  // syllabus map and skill vocabulary and write `paper_code` from the plan regardless — a
  // row that is wrong in a way nothing downstream could detect.
  if (!f) throw new Error(`No framework registered for paper "${paper}" — register it in PAPER_FRAMEWORKS`);
  return f;
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario diversity pools — international, non-UK/Ireland (AFM sat in 100+ countries)
// ─────────────────────────────────────────────────────────────────────────────

const SYLLABUS_KEYS = Object.keys(SYLLABUS_MAP) as LoCode[];

const SCENARIO_REGIONS = [
  'Vietnam', 'Brazil', 'Germany', 'Kenya', 'Singapore',
  'Mexico', 'South Korea', 'Nigeria', 'Australia', 'Canada',
  'India', 'South Africa', 'Japan', 'Colombia', 'Poland',
  'Indonesia', 'Turkey', 'Saudi Arabia', 'Argentina', 'Thailand',
];

const SCENARIO_SECTORS = [
  'manufacturing', 'retail', 'telecoms', 'logistics', 'financial services',
  'energy', 'agriculture', 'technology', 'construction', 'hospitality',
  'mining', 'pharmaceuticals',
];

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AfmDrillSpec {
  lo_code:                 LoCode;
  section:                 'A' | 'B' | 'C' | 'D' | 'E';
  sub_area:                string;
  topic:                   string;
  descriptor:              string;
  command_verb:            string;
  intellectual_level:      2 | 3;
  mode:                    LoMode;   // read from SYLLABUS_MAP, not derived
  calculation_required:    boolean;  // resolved per instance (see deriveCalcRequired)
  professional_skill_tag?: ProfessionalSkillTag;
  marks_guide:             number;
  region_hint:             string;
  sector_hint:             string;
  npv_kind?:               NpvKind;   // B1a batch only — selects the NPV drill variant
  apv_kind?:               ApvKind;   // B3j/B3k batch only — selects the APV drill variant
  capm_kind?:              CapmKind;  // B3d/B3e batch only — selects the CAPM drill variant
  duration_kind?:          DurationKind; // B3f batch only — selects the duration drill variant
  credit_kind?:            CreditKind;   // B3h/B4a batch only — selects the credit-risk drill variant
  bsop_kind?:              BsopKind;     // B2a/B2c batch only — selects the BSOP / real-option variant
  valuation_kind?:         ValuationKind; // B4a/B4b/A6 batch only — selects the valuation-family variant
  international_kind?:      InternationalKind; // B5/A6a batch only — selects the international-family variant
  risk_kind?:              RiskKind;     // B1a/B1b risk & uncertainty batch only — selects the risk-family variant
  fxhedge_kind?:           FxHedgeKind;  // E2b FX-hedging batch only — selects the fx-hedge family variant
  // fx-hedge family CONVENTIONS — code-decided per drill (never model-chosen), same doctrine as
  // international.ts hardcoding basis='ppp': the model is TOLD which convention to narrate in
  // prose, it never picks one. Varies per drill (unlike basis, which is uniform), so these ride
  // the spec rather than a literal inside the draft function.
  fx_quote_direction?:     QuoteDirection;
  fx_exposure_direction?:  ExposureDirection;
  fx_residual_policy?:     ResidualPolicy;
  fx_premium_currency?:    'home' | 'foreign';
}

// ─────────────────────────────────────────────────────────────────────────────
// FCFF calculator lives in lib/acca/fcff.ts (pure, no side-effects) so it can be shared
// by this generator, the numeric verifier's callers, and content-patch scripts without
// importing this file's main(). Code owns every figure AND every figure-vs-figure verdict
// (offer test) and break-even sensitivity — the model never states a number/inequality.
// Only B4b/B4c (FCFF firm value) are wired for the pilot.
// ─────────────────────────────────────────────────────────────────────────────

const FCFF_LOS = new Set<LoCode>(['B4b', 'B4c']);
// Valuation FAMILY (batch #9): FCFF-enterprise / FCFE-equity / dividend-capacity / two-method compare
// + the B4c rehab. Keyed off spec.valuation_kind (set by --valuation-batch). B4a = equity valuation,
// B4b = which-flows-which-rate, A6 = dividend capacity/policy, B4c = the parked-drill rehab.
const VALUATION_LOS = new Set<LoCode>(['B4a', 'B4b', 'B4c']);
const NPV_LOS  = new Set<LoCode>(['B1a']);
// APV (B3j quantitative / B3k mixed). B3k is 'mixed' in SYLLABUS_MAP, so the APV route is
// keyed off spec.apv_kind (set by --apv-batch), NOT off mode — the compare kind carries
// figures and must not fall through the mixed-mode throw.
const APV_LOS  = new Set<LoCode>(['B3j', 'B3k']);
// CAPM / cost-of-capital (B3d organisation WACC, B3e project-specific). Pure rates family —
// no cash-flow chain, so P6 loss-relief is a structural no-op and there is no issue-cost analogue.
const CAPM_LOS = new Set<LoCode>(['B3d', 'B3e']);
// Bond duration (B3f Macaulay/modified; B3g convexity rider on the limitations kind). Pure
// rates/bond family — P6 loss-relief no-op, no issue-cost analogue.
const DURATION_LOS = new Set<LoCode>(['B3f']);
// Credit risk (B3h rating agencies / credit spread / cost of debt via the term structure; B4a
// corporate-debt valuation). Pure rates/bond family, ALL issuer-framed — P6 loss-relief no-op,
// no issue-cost analogue. The non-flat govt spot curve opens here (duration's flat-YTM boundary).
const CREDIT_LOS = new Set<LoCode>(['B3h', 'B4a']);
// BSOP / real options (B2a BSOP financial-product/asset valuation + the five drivers; B2c options
// to delay/expand/withdraw; B2b archetype classification woven as prose). Spreadsheet-inputs
// ruling EXTENDED (Design B): code grades the BSOP chain but tolerances are set to the normal
// TABLES (N(d) ±0.01, d1/d2 ±0.05), never code precision. redeploy = the switch-texture in withdraw.
const BSOP_LOS = new Set<LoCode>(['B2a', 'B2c']);
// International investment & financing (B5b forecast-FX NPV / B5a exchange-rate sensitivity;
// B5c restricted-remittance rides the B5b remittance kind as discursive dual) + A6a multinational
// dividend capacity. Calculator #10 (lib/acca/international.ts) composes the FCFF build + npv
// discounting one-way. HARD RULE (Grant 2026-07-17): A6a is a Section-A LO — direct-link-only
// serve, EXCLUDED from all B-tier/coverage counts and public claims until Section A surfaces.
const INTERNATIONAL_LOS = new Set<LoCode>(['B5a', 'B5b', 'A6a']);
// FX hedging (calculator #11). E2b is the QUANTITATIVE LO ("Evaluate ... the forward exchange
// market and money market hedge / SAFEs / currency futures / currency swaps / FOREX swaps /
// currency options" — SYLLABUS_MAP, scripts/afm-framework.ts). E2a (translation/transaction/
// economic risk, discursive) and E2c (netting/matching, mixed) are NOT wired here — E2c's netting
// is woven as scenario TEXTURE only, per the Step-0 ruling. E section, first family to surface it —
// the browse bucket/sort (app/api/acca/areas/route.ts, app/acca/page.tsx) needs no code change
// (verified 2026-07-22, no hardcoded section list).
const FXHEDGE_LOS = new Set<LoCode>(['E2b']);
// Risk & uncertainty (calculator #3, B1a iv/v/vi + B1b ii). Keyed off spec.risk_kind (set by
// --risk-batch), NOT off lo_code — B1a is shared with the NPV family, so the risk route must key on
// the kind (routed BEFORE the NPV_LOS mode check). Conventions verified: docs/evidence/AFM_RISK_EVIDENCE.md.
const RISK_LOS = new Set<LoCode>(['B1a', 'B1b']);

// ─────────────────────────────────────────────────────────────────────────────
// THE BOARDROOM BAR — the universal documented AFM failure (every examiner report
// 2023–2025): a calculation that never became a recommendation. Woven into both passes.
// ─────────────────────────────────────────────────────────────────────────────

const BOARDROOM_BAR_PASS1 =
  'THE BOARDROOM BAR — NON-NEGOTIABLE. The universal AFM failure the examiners name every ' +
  "sitting is the calculation that never became advice: the candidate computes a figure and stops. " +
  'AFM candidates\' arithmetic is usually competent — what fails is the ADVICE, the SPECIFICATION, and ' +
  'the VALUATION PLUMBING. Every drill must train the jump from a computed/analysed result to a ' +
  'recommendation a board could act on. The candidate answers as the senior financial adviser to the board.';

const BOARDROOM_BAR_PASS2 =
  'THE BOARDROOM BAR. Ezra speaks as the senior financial adviser; the student is his junior adviser — ' +
  'the numbers are usually competent, the advice would not yet survive a boardroom. Signature pressure: ' +
  '"You\'ve calculated it — now what are you telling the board to do?" Numbers are the floor, not the ' +
  'ceiling: credit a correct computation quickly and move the pressure to interpretation, scepticism and ' +
  'recommendation. Treat the work, never the person.';

// ─────────────────────────────────────────────────────────────────────────────
// AFM CATALOGUE RULES — replace APM's nine content rules. Written from the five examiner
// reports via docs/TEACHING_PRINCIPLES_EZRA_AFM.md. Numbering follows the catalogue.
// ─────────────────────────────────────────────────────────────────────────────

const AFM_CATALOGUE_RULES =
  'AFM CONTENT RULES — mandatory, grounded in the AFM examiner reports (D23–D25): ' +
  '(#2 NO FENCE-SITTING) Every calculative or analytic part MUST end in a clear recommendation drawn ' +
  "from the answer's own figures — state the decision and why, never just present two numbers and stop. " +
  '(#3 APPLY TO THIS SCENARIO) Every discussion point must name a SPECIFIC scenario fact (its currency, ' +
  "its base rate, a director's stated constraint or target) and what it implies HERE. A generic " +
  'advantage/disadvantage list, or restating the exhibit, scores limited credit. ' +
  '(#1 SCEPTICISM) For every director assertion and every stated assumption (no basis risk, no margin, a ' +
  'growth rate, a required return), state it, question it, and say what changes if it does not hold; do not ' +
  'accept assertions at face value; where the scenario states a board target or required return, the answer ' +
  'must compare results to it. ' +
  '(#4 HEDGING SPECIFICATION) For a hedging drill the answer is an executable instruction to the board — ' +
  'direction (buy/sell), contract month, whole number of contracts, correct unexpired-basis period — stated ' +
  'BEFORE the outcome figure. ' +
  '(#5 VALUATION PLUMBING) Match the flow to the rate: a firm flow (FCFF) is discounted at WACC, an equity ' +
  'flow (FCFE / dividends) at the cost of equity; interest stays OUT of FCFF (the return to debt is captured ' +
  'in the WACC, NOT deducted from the flow); strip debt to get equity value; add growth to a perpetuity ONLY ' +
  'where the scenario supports it; compute any growth rate from the data given. A wrong discount rate is a ' +
  'MISMATCH, never a stated directional effect — do NOT claim it "inflates" or "deflates" the value; whether ' +
  'it overstates or understates depends on the numbers. ' +
  '(PATTERN — CODE OWNS NUMBERS) In evaluative/advice prose, NEVER state a computed figure, an inequality ' +
  'between computed figures (e.g. that an offer is above/below the value), or a break-even value — these are ' +
  'inserted deterministically by code. Prose is qualitative reasoning only. ' +
  '(PATTERN — ONLY SCENARIO FACTS) Evaluative prose may reference ONLY facts present in the scenario/context — ' +
  'never invent events, cost savings, or risks not stated (e.g. do not assert "near-term cost savings" the ' +
  'scenario never gives). ' +
  '(PATTERN — NAMED RISKS ONLY FROM SCENARIO) Any risk premium, discount, or named risk factor cited in ' +
  'evaluative prose (an illiquidity premium, a key-person premium, a customer-concentration premium, a ' +
  'country/political risk) may name ONLY risks the scenario evidences — do not introduce a named risk the ' +
  'context does not state (e.g. do not invoke "key-person" risk where the scenario never mentions it). ' +
  '(#6 DEVELOP ASSUMPTIONS) Each assumption → why it might not hold → its effect on the figure/decision; ' +
  'never a bare list of assumption headings. ' +
  '(#9 OWN-FIGURE / DO NOT ABANDON) A wrong upstream figure still earns the downstream method and the ' +
  'recommendation WHERE THE OWN FIGURE IS SUBSEQUENTLY USED CORRECTLY — carry it forward consistently, do not ' +
  'restart. OFR credit is conditional on the downstream method holding; it is not automatic. ' +
  '(#8 FINISH WITH A CONCLUSION) A report-style answer ends with a brief concluding recommendation, and ' +
  'honours every clause of the requirement (including "suggest additional information", "identify omissions"). ' +
  'ASSERTION DISCIPLINE: state as fact ONLY what the scenario provides; any risk, threshold or cause not ' +
  'evidenced (covenant thresholds, delays, input-cost changes) is phrased conditionally ("the board should ' +
  'confirm whether…", "if X, then…"), never asserted. Scepticism challenges the data and names what to ' +
  'verify; it does not invent the answer. ' +
  'INTELLECTUAL LEVEL: ALWAYS use levels 1/2/3 — NEVER AO framing (AO1, AO5), which is IB, not ACCA.';

// ─────────────────────────────────────────────────────────────────────────────
// Personas
// ─────────────────────────────────────────────────────────────────────────────

const AFM_EXAMINER_PERSONA =
  'You are an ACCA Advanced Financial Management (AFM) examiner. You write wholly original practice ' +
  'drills — never from any ACCA past paper. AFM is a professional strategic exam (3h15m, 100 marks): ' +
  'Section A is a single 50-mark case study (40 technical + 10 professional-skills marks) requiring a ' +
  'response to the board (e.g. a report); Section B has two 25-mark scenario questions (20 technical + 5 ' +
  'professional-skills each), and every exam has questions focused on syllabus sections B and E. ' +
  'The candidate responds as the senior financial adviser to the board. ' +
  'All AFM drills must: ' +
  '(1) Be scenario-based — name a real-world-style organisation and a specific financial-management ' +
  'situation with enough context to engage professionally. ' +
  '(2) Use a professional advisory register — advice to the board, not a student answering a school question. ' +
  '(3) L2 drills: apply a specific technique — explain a mechanism, advise on a defined situation, perform a ' +
  'bounded computation. (4) L3 drills: synthesise and evaluate — assess appropriateness, weigh trade-offs, ' +
  'recommend with justified reasoning. ' +
  'DIVERSITY — MANDATORY: (A) Geography — scenarios MUST be international; NEVER set in the UK or Ireland. ' +
  'Rotate across global regions. (B) Sector — vary across manufacturing, retail, telecoms, logistics, ' +
  'financial services, energy, agriculture, technology, construction, hospitality; NEVER default to one sector. ' +
  '\n\n' + BOARDROOM_BAR_PASS1 + '\n\n' + AFM_CATALOGUE_RULES;

/**
 * THE TEACHING LIST WAS CLOSED, AND TWO OF THE THREE MOST-MARKED MODES WERE NOT ON IT.
 *
 * The `full_reveal` catalogue below is a CLOSED disjunction ("drawn from the AFM failure
 * catalogue: A, B, C, D, or E") — not an `e.g.` list the model generalises from, which is what
 * APM's persona uses. Measured over the 14 published AFM narrative rows: 10 of the 11 reveals
 * produced by `draftReveal` open with one of these names in capitals; the 3 that do not never
 * went through this prompt (hand-written literals in `scripts/_author_enarrative_batch.ts`) and
 * the 4th was hand-rewritten under P-N2. The list was operating as closed.
 *
 * 📐 THE GAP, measured against the same 14 rows' criterion disqualifiers (74 criteria):
 *   F6 superficial figure-commentary  33 criteria, 10/14 rows — NO NAME on this list
 *   F10 no scepticism/comm. acumen    24 criteria,  6/14 rows — NO NAME on this list
 *   F3 undeveloped assumption          0 criteria,  0/14 rows — named UNDEVELOPED-ASSUMPTION
 * The two most-marked modes after F1/F5/F4 were unsayable, and the one name available for a
 * development failure is marked on nothing. Three rows headline UNDEVELOPED-ASSUMPTION because
 * it was the nearest available word, not because the rubric penalises it.
 *
 * The two additions are examiner-anchored, not invented:
 *   SUPERFICIAL-COMMENTARY — "explain and challenge the figures calculated, rather than simply
 *     stating what the figures show" [MJ25 p.17, GCR]
 *   UNCHALLENGED-ASSERTION — "challenging information relating to the assumptions, directors'
 *     views, decisions and/or techniques and PROVIDING REASONS for such challenges" [SD24 p.7,
 *     Northney]. The "with reasons" clause is load-bearing: a bare challenge is not creditable.
 *
 * ⚠️ UNCHALLENGED-ASSERTION NAMES THE SCEPTICISM ACT ONLY. F10's own text covers scepticism AND
 * commercial acumen, and its six live rows span THREE skill tags (scepticism ×3, communication
 * ×2, commercial_acumen ×1). No single name can carry that, and one that tried would be as
 * unusable as F10's generic map text — which a dry run showed produces a FENCE-SITTING headline.
 * The communication and commercial-acumen halves stay unnameable until F10 is split. Do not
 * describe this as closing the gap.
 *
 * ADDITIVE ONLY: the existing five names and glosses are byte-identical. Nothing pins this
 * string — it is neither exported nor covered by test-narrative-paper-pins — so a change here
 * is invisible to the gate suite and affects EVERY future AFM reveal, calculator batches
 * included. That is the reason to append rather than restructure.
 */
const EZRA_TEACHING_PERSONA_AFM =
  "You are Ezra, Gradd's AI tutor for ACCA AFM. Your job is to generate the teaching reveal shown to a " +
  'candidate after they attempt a practice drill. You receive the drill question and the model answer. ' +
  'Your output has two parts: ' +
  'hint: One sentence only. A targeted nudge for a candidate who answered incorrectly on the first attempt. ' +
  'Point at the specific gap — the missing recommendation, the un-challenged assumption, the mismatched ' +
  'discount rate, the un-stripped debt, the un-developed assumption — WITHOUT giving the answer. Precise to ' +
  'this drill, not generic. ' +
  'full_reveal: 3–5 sentences. Name the specific AFM misconception a typical candidate brings to this type of ' +
  'drill — drawn from the AFM failure catalogue: FENCE-SITTING (states results but never recommends), ' +
  'SCENARIO-FREE discussion (generic lists, no scenario facts), VALUATION-PLUMBING (firm flow discounted at ' +
  'the cost of equity, interest wrongly deducted from FCFF, debt not stripped, growth added to a flat ' +
  'perpetuity), UNDEVELOPED-ASSUMPTION (assumptions listed not discussed), or ABANDONED-AFTER-CALC (giving up ' +
  'the linked marks after a wrong number). The catalogue also carries two modes the five above do not cover: ' +
  'SUPERFICIAL-COMMENTARY (says what a figure or a given output shows without explaining or challenging it) ' +
  'and UNCHALLENGED-ASSERTION (takes a named director\'s or officer\'s claim, or a stated assumption, at face ' +
  'value — describing how the technique works instead of testing whether the claim survives, with reasons). ' +
  'Where the LO asks to RESOLVE a conflict (e.g. between ESG criteria), ' +
  'the reveal must teach the resolution move — how the competing criteria are weighed and reconciled — not only ' +
  'that a verdict is needed. Then give the diagnosis-led reframe: why that thinking is wrong and ' +
  'what the correct mental model is. This is NOT a restated model answer — it is a mental-model correction. ' +
  '\n\n' + BOARDROOM_BAR_PASS2 + '\n\n' +
  'TEACHING RULES: ' +
  '(1) When explaining why a claim is wrong, state the correct causal mechanism — reason WHY the misconception ' +
  'produces the wrong conclusion, do not merely restate the right answer. ' +
  '(2) VALUATION PLUMBING: firm flow (FCFF) → WACC; equity flow (FCFE/dividends) → cost of equity; strip debt ' +
  'for equity value; growth on a perpetuity only where the scenario supports it. Interest stays OUT of FCFF — ' +
  'the return to debt is captured in the WACC, NOT deducted from the flow (do NOT say interest must "stay in ' +
  'the flow"). A wrong discount rate is a MISMATCH, not a directional effect: do NOT say it "inflates" or ' +
  '"deflates" value — whether it overstates or understates depends on the numbers. ' +
  '(3) OWN-FIGURE: where a calculation goes wrong, teach the student to carry their own figure forward ' +
  'consistently — where the downstream method holds, those marks still score and the error is charged once, at ' +
  'its source. OFR credit is CONDITIONAL on the own figure being used correctly downstream; never promise it ' +
  'unconditionally. ' +
  '(4) Avoid over-absolute causal language ("directly causes", "depends entirely on"); use "may", "is likely ' +
  'to", "suggests" for chains the scenario does not prove. ' +
  '(5) ASSERTION DISCIPLINE: reference as fact ONLY what the scenario provides — never invent events, savings ' +
  'or risks; phrase un-evidenced risks/causes conditionally. Any risk premium, discount, or named risk factor ' +
  '(illiquidity, key-person, customer-concentration, country risk) may name ONLY risks the scenario evidences — ' +
  'do not introduce one the context does not state. Do NOT state any computed figure or any inequality ' +
  'between computed figures (the model answer already carries them). Scepticism challenges the data and names ' +
  'what to verify, it does not invent the answer. ' +
  'INTELLECTUAL LEVEL: ALWAYS 1/2/3, NEVER AO framing (AO1, AO5).';

/**
 * SBL's teaching persona — a FIFTH paper-coupled site, and it was not on the blocker list.
 *
 * Worth stating because it is the kind of coupling a four-item list misses: nothing about the
 * teaching reveal is typed, named or imported per paper, so an SBL drill would have run
 * silently through the AFM persona and come back teaching valuation plumbing, FCFF-versus-WACC
 * and own-figure discipline on a leadership question. It would have passed every gate — P4 and
 * P7 check invented facts and the presence of a misconception sentence, not whether the
 * misconception belongs to the paper.
 *
 * The misconceptions here are the failure catalogue's, cited: undeveloped points (M3, the
 * examiners' own two-mark rule, 7/7), copy-paste with nothing added (M1, 7/7), generic theory
 * unapplied (M4, 7/7), answering the adjacent question (M2, 7/7) and scepticism performed as
 * questions rather than an assessment (M7, 3/7 and zero-credit at MJ26 p.9).
 */
const EZRA_TEACHING_PERSONA_SBL =
  "You are Ezra, Gradd's AI tutor for ACCA SBL. Your job is to generate the teaching reveal shown to a " +
  'candidate after they attempt a practice drill. You receive the drill question and the model answer. ' +
  'Your output has two parts: ' +
  'hint: One sentence only. A targeted nudge for a candidate who answered incorrectly on the first attempt. ' +
  'Point at the specific gap — the point left at identification, the assertion accepted unchallenged, the ' +
  'paragraph that would fit any organisation, the requirement that was not the one answered — WITHOUT giving ' +
  'the answer. Precise to this drill, not generic. ' +
  'full_reveal: 3–5 sentences. Name the specific SBL misconception a typical candidate brings to this type of ' +
  'drill — drawn from the SBL failure catalogue: UNDEVELOPED POINTS (a correct point identified and then left, ' +
  'earning one mark where two were available, because it was never weighed for significance, never linked to ' +
  'this organisation by the information given, never followed to a consequence and never illustrated from the ' +
  'case), COPY-PASTE (reproducing the case material, sometimes without even changing the pronouns, and adding ' +
  'nothing), GENERIC THEORY (a model or a list of advantages described correctly and never applied to this ' +
  'organisation), THE ADJACENT QUESTION (answering about the noun in the requirement rather than the act it ' +
  'asked for — most often reaching for a familiar framework the requirement merely evoked), or SCEPTICISM AS ' +
  'QUESTIONS (asking the reader whether something is reliable instead of assessing it and committing, which ' +
  'the examiners say earns no marks at all). Then give the diagnosis-led reframe: why that thinking is wrong ' +
  'and what the correct mental model is. This is NOT a restated model answer — it is a mental-model correction. ' +
  '\n\n' +
  'TEACHING RULES: ' +
  '(1) When explaining why an approach is wrong, state the correct causal mechanism — reason WHY it loses the ' +
  'marks, do not merely restate the right answer. ' +
  '(2) THE TWO-MARK RULE IS THE SPINE. Where the failure is under-development, teach the four moves that turn ' +
  'a one-mark point into a two-mark one: say how significant it is, use the information given to tie it to ' +
  'this organisation, follow it to a consequence for the organisation, and support it with an example from ' +
  'the case. Teach it as arithmetic the candidate can do under time pressure, not as a style note. ' +
  '(3) MORE POINTS IS NOT THE FIX. A candidate whose points are all undeveloped has to find twice as many of ' +
  'them to reach the same mark, in the same time. Say so. ' +
  '(4) SCEPTICISM IS A COMMITTED ASSESSMENT, professionally expressed. Challenging on the evidence is the ' +
  'skill; posing questions to the reader is not, and neither is an accusation the case material does not ' +
  'support — over-reaching reads as poor judgement to the person receiving the document. ' +
  '(5) Reference ONLY facts present in the scenario — never invent events, figures or risks. ' +
  '(6) The answer is a document for a named reader. Never refer to material as "the pre-seen"; the recipient ' +
  'would not know the term. ' +
  '(7) INTELLECTUAL LEVEL: ALWAYS 1/2/3, NEVER AO framing (AO1, AO5).';

const EZRA_TEACHING_PERSONA: Record<GeneratorPaper, string> = {
  AFM: EZRA_TEACHING_PERSONA_AFM,
  SBL: EZRA_TEACHING_PERSONA_SBL,
};

// ─────────────────────────────────────────────────────────────────────────────
// Professional-skill pools by section — AFM sections A–E. Section A examines all four;
// Sections B/D/E examine the three non-communication skills (min two per Section-B q);
// Section C keeps all four (case-adjacent). Derived from EXAM_STRUCTURE.
// ─────────────────────────────────────────────────────────────────────────────

const SKILLS_BY_SECTION: Record<string, ProfessionalSkillTag[]> = {
  A: ['communication', 'analysis_and_evaluation', 'scepticism', 'commercial_acumen'],
  B: ['analysis_and_evaluation', 'scepticism', 'commercial_acumen'],
  C: ['communication', 'analysis_and_evaluation', 'scepticism', 'commercial_acumen'],
  D: ['analysis_and_evaluation', 'scepticism', 'commercial_acumen'],
  E: ['analysis_and_evaluation', 'scepticism', 'commercial_acumen'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Spec builder
// ─────────────────────────────────────────────────────────────────────────────

function extractPrimaryVerb(descriptor: string): string {
  const desc = descriptor.toLowerCase();
  const compounds = Object.keys(COMMAND_VERBS).filter((k) => k.includes(' '));
  for (const cv of compounds) {
    if (desc.startsWith(cv)) return cv;
  }
  return desc.split(/\s/)[0].replace(/[^a-z]/g, '');
}

// marks_guide is PROVISIONAL for AFM — recalibration is a human/QA gate (mirrors the APM
// marks_guide audit). AFM Section-A sub-parts and Section-B parts differ from APM's fixed
// 6/12/15. These defaults are a starting point, flagged for the marks audit.
function deriveMarksGuide(level: 2 | 3, mode: LoMode): number {
  if (mode === 'quantitative') return level === 3 ? 15 : 10;
  if (mode === 'mixed')        return 12;
  return level === 3 ? 12 : 6; // discursive
}

function deriveSkillTag(section: string, indexWithinSection: number): ProfessionalSkillTag {
  const pool = SKILLS_BY_SECTION[section] ?? SKILLS_BY_SECTION['A'];
  return pool[indexWithinSection % pool.length];
}

// mixed → scenario_supplies_figures decides calc; this pilot generates no mixed drill, so
// mixed defaults to false (narrative) and would be a spec-time authorial decision.
function deriveCalcRequired(mode: LoMode, scenarioSuppliesFigures = false): boolean {
  if (mode === 'quantitative') return true;
  if (mode === 'discursive')   return false;
  return scenarioSuppliesFigures;
}

/**
 * KNOWN DEFECT — the skill rotation here is DEAD IN PRACTICE (diagnosed 2026-08-01).
 *
 * `sectionIdx` is local to each CALL. Every batch caller invokes `buildSpecsForList([oneLo])[0]`
 * — one LO at a time — so `si` is always 0 and `deriveSkillTag` always returns pool[0]:
 * `analysis_and_evaluation` for sections B and E, `communication` for section A. That is the
 * whole explanation for the published AFM corpus being 47 quantitative drills tagged
 * analysis_and_evaluation and one A6a tagged communication, with zero scepticism and zero
 * commercial_acumen. Nothing bypassed the rotation; it was defeated by the call shape.
 *
 * NOT fixed by hoisting `sectionIdx` to module scope. That would make the tag depend on
 * generation ORDER — the same LO would tag differently depending on which batch ran first,
 * and re-running a batch would silently re-tag its drills. A professional skill is a property
 * of what the drill DEMANDS, not of when it was generated.
 *
 * The narrative path now DECLARES its skill per plan (see `NarrativePlan.skill`). The
 * calculator batches still carry the rotation's pool[0] output; declaring theirs per family is
 * the open remediation (docs/AFM_SURFACED.md).
 */
function buildSpecsForList(loCodes: LoCode[]): AfmDrillSpec[] {
  const sectionIdx: Record<string, number> = {};
  return loCodes.map((lo_code) => {
    const lo = SYLLABUS_MAP[lo_code];
    const si = sectionIdx[lo.section] ?? 0;
    sectionIdx[lo.section] = si + 1;
    const mode = lo.mode; // READ, not derived
    const baseIdx = SYLLABUS_KEYS.indexOf(lo_code);
    return {
      lo_code,
      section:                lo.section,
      sub_area:               lo.sub_area,
      topic:                  lo.topic,
      descriptor:             lo.descriptor,
      command_verb:           extractPrimaryVerb(lo.descriptor),
      intellectual_level:     lo.intellectual_level,
      mode,
      calculation_required:   deriveCalcRequired(mode),
      professional_skill_tag: deriveSkillTag(lo.section, si),
      marks_guide:            deriveMarksGuide(lo.intellectual_level, mode),
      region_hint:            SCENARIO_REGIONS[baseIdx % SCENARIO_REGIONS.length],
      sector_hint:            SCENARIO_SECTORS[(baseIdx * 7) % SCENARIO_SECTORS.length],
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────────────────────────────────────

function buildDiscursiveUserPrompt(spec: AfmDrillSpec): string {
  const verb = spec.command_verb;
  const capitalised = verb.charAt(0).toUpperCase() + verb.slice(1);
  const levelInstruction = spec.intellectual_level === 2
    ? `- L2 (Application and analysis): apply a specific concept — explain a mechanism or advise on a defined situation. Bounded, not a full strategic evaluation.`
    : `- L3 (Synthesis and evaluation): require judgement and evaluation — weigh options, assess appropriateness, recommend with justified reasoning.`;
  const skillLine = spec.professional_skill_tag
    ? `- Professional skill: ${spec.professional_skill_tag.replace(/_/g, ' ')} — the model_answer should demonstrate it (scepticism: challenge a stated assumption; commercial_acumen: anchor to business consequences).`
    : '';

  return `Write one original ACCA AFM practice drill.

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks${spec.professional_skill_tag ? `\n- Professional skill: ${spec.professional_skill_tag}` : ''}

Requirements:
- Begin the question with "${capitalised}" (the lead command verb, capitalised).
- command_verb (metadata): report the verb(s) the question ACTUALLY demands (e.g. "assess and recommend"), not just "${verb}".
- Wholly original — never replicate any ACCA past paper question.
- Scenario-based: name an organisation, set a realistic financial-management context; the candidate answers as adviser to the board.
${levelInstruction}
- context_text: 2–4 sentences naming the organisation and the situation, with specific, usable detail (a named figure, a stated board target or director's assertion, a decision at stake) the model_answer is FORCED to reference. A generic textbook answer must NOT fit.${skillLine ? `\n${skillLine}` : ''}
- DIVERSITY (MANDATORY): set the scenario in ${spec.region_hint}. Sector: ${spec.sector_hint}. Use both unless the technique genuinely would not arise there — then substitute any non-UK, non-Ireland alternative.
- model_answer: a ${spec.marks_guide}-mark top-band response (140–320 words). It MUST: (a) apply each point to a SPECIFIC scenario fact; (b) CHALLENGE at least one stated assumption or director assertion (scepticism), saying what changes if it does not hold; (c) end with a CLEAR concluding recommendation to the board (no fence-sitting). Develop assumptions (why it might not hold → effect), never list them.`;
}

function buildFcffUserPrompt(spec: AfmDrillSpec): string {
  return `Write one original ACCA AFM firm-valuation drill using free cash flow to firm (FCFF).

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: advise
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks

CODE-COMPUTES-STATS PROTOCOL — MANDATORY. Code owns EVERY figure and EVERY comparison. It
computes FCFF, firm value, equity value, the offer-vs-value verdict, and the break-even
sensitivities. Your job: supply the scenario, the raw input figures (including the offer), and
qualitative prose. DO NOT state anywhere: FCFF, firm value, equity value, any discount factor,
any inequality between computed figures (e.g. "the offer is below the value"), or any break-even.
Those are ALL inserted by code.

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name an organisation the board is valuing (an acquisition target, a division being valued, or the company itself), and a vendor/asking price for its equity.
- question: begins with "Advise" — ask the candidate to value the firm and its equity using FCFF and ADVISE the board whether the stated offer price for the equity is justified.
- context_text: 2–3 sentences of scenario narrative + a clean labelled list of the raw inputs (money figures in millions of the LOCAL currency, rates in %): PBIT, tax rate, depreciation/non-cash, capex, the increase in working capital, the WACC, the long-term growth rate, the market value of debt, and the vendor's indicative equity offer/asking price. Use the local currency for ${spec.region_hint} (e.g. AUD, ZAR, BRL) consistently, and report its ISO code in the currency field. Add 1–2 challengeable textures (capex vs sustainable reinvestment; customer/contract concentration or cyclicality) so scepticism has something to bite. Give figures a candidate could compute from — do NOT pre-compute FCFF or value.
- Provide the SAME figures as the structured raw_inputs object (including offer_price). Rates (tax_rate, wacc, growth_rate) as DECIMAL FRACTIONS (0.25 for 25%). WACC must exceed the growth rate by at least 1 percentage point. Choose figures so FCFF and equity value are positive and debt is below firm value; set the offer realistically so "is it justified?" is a genuine judgement.
- interpretation_prose: qualitative advice ONLY (3–5 sentences), following the tool rules — NO numbers, NO inequalities between computed figures, NO break-evens, NO directional claim about a wrong discount rate, and ONLY facts present in context_text. Interest stays OUT of FCFF (financing is captured by the WACC and the debt strip). Cover which inputs are most fragile and why, and the due diligence the board should require.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildValuationUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.valuation_kind ?? 'fcff_enterprise';
  const kindBlock =
    kind === 'fcff_enterprise'
      ? `- DRILL TYPE: FCFF FIRM VALUATION with the DISCOUNT RATE DERIVED. The candidate must first derive the cost of capital (CAPM → WACC), then value the firm by FCFF, strip debt to reach equity, and advise on the vendor's equity offer. In raw_inputs supply the FCF build (pbit, tax_rate [decimal], depreciation, capex, delta_working_capital), debt_value, growth_rate [decimal], offer_price, AND the CAPM front-end: rf [%], mrp [%], company_equity_beta (the firm's OWN geared beta — NO peer/ungearing here), company_ve, company_vd (=debt_value), kd [%]. context_text lists all of these as scenario facts. Code computes Ke = Rf+βe·MRP, the MV-weighted WACC, FCFF, firm value, equity value and the offer verdict — state NONE of them.`
      : kind === 'fcfe_equity'
      ? `- DRILL TYPE: FCFE EQUITY VALUATION (a maintainable NO-GROWTH perpetuity, constant debt — no new borrowing). The candidate values the equity DIRECTLY by discounting FCFE at the cost of equity Ke, with NO debt strip, then shows the FCFF route reconciles. In raw_inputs supply the FCF build (pbit, tax_rate [decimal], depreciation, capex, delta_working_capital), debt_value, ke [DECIMAL, e.g. 0.13], kd [DECIMAL, e.g. 0.06], offer_price. Do NOT supply growth_rate or a wacc (there is no growth; code derives the reconciling WACC). Code computes FCFF, FCFE = FCFF−Kd·D(1−t), equity = FCFE/Ke, the reconciliation, and the offer verdict — state NONE. The teaching crux: FCFE goes at Ke and you do NOT strip debt again.`
      : kind === 'dividend_capacity'
      ? `- DRILL TYPE: DIVIDEND CAPACITY + POLICY. The candidate computes the CASH available to equity this year (FCFE) and judges whether the board's proposed dividend is sustainable. In raw_inputs supply the FCF build (pbit, tax_rate [decimal], depreciation, capex, delta_working_capital), debt_value, kd [DECIMAL], net_borrowing (net new debt raised this year, may be 0), proposed_dividend, and optionally shares (millions) for a per-share figure. Do NOT supply a discount rate — there is no discounting here. Code computes FCFF, dividend capacity (=FCFE), the surplus/shortfall vs the proposed dividend, and the sustainability verdict — state NONE. The crux: dividend capacity is CASH, not accounting profit.`
      : `- DRILL TYPE: TWO-METHOD VALUATION COMPARE → a value RANGE and a bid verdict. Value the target by (1) FCFF-DCF (Gordon growth) and (2) a relative market multiple, then advise on the offer against the range. In raw_inputs supply the FCF build (pbit, tax_rate [decimal], depreciation, capex, delta_working_capital), wacc [DECIMAL], growth_rate [DECIMAL, < wacc by ≥0.01], debt_value, offer_price, AND the relative method: multiple_type ("pe" or "ev_ebitda"), multiple, and either earnings (for pe — an EQUITY multiple, NO debt strip) or ebitda (for ev_ebitda — an ENTERPRISE multiple, code strips debt). Code computes both equity values, the range and the offer's position — state NONE. The crux: a P/E is an equity multiple; EV/EBITDA is an enterprise multiple you must de-lever; the answer is a range, not a point.`;
  return `Write one original ACCA AFM business-valuation drill (kind: ${kind}).

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks

CODE-COMPUTES-STATS PROTOCOL — MANDATORY. Code owns EVERY figure and EVERY figure-vs-figure verdict.
Your job: supply the scenario, the raw input figures, and qualitative prose. DO NOT state anywhere any
computed figure (FCFF, FCFE, firm/equity value, a derived Ke/WACC, dividend capacity, a multiple result),
any inequality between computed figures, or any verdict. Those are ALL inserted by code.

${kindBlock}

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name the organisation being valued (an acquisition target, a division, or the company itself).
- TAX: state the applicable corporate tax rate cleanly as ONE scenario fact (a single decimal). Do NOT introduce tax-regime mechanics, mixed-ownership rules, zakat, or multi-rate structures — one stated rate, kept simple.
- question: begins with the command verb and asks for EXACTLY what this kind delivers — no more (P5). Do NOT ask for an NPV, IRR, sensitivity, or anything outside this kind.
- context_text: 2–3 sentences of narrative + a clean labelled list of the raw inputs (money in millions of the LOCAL ${spec.region_hint} currency; rates in %). Report the ISO code in the currency field. Add 1–2 challengeable textures (capex vs sustainable reinvestment; concentration/cyclicality; durability of the growth or dividend) for scepticism. Do NOT pre-compute anything.
- Provide the SAME figures in raw_inputs (supply ONLY the fields this kind needs, per the DRILL TYPE block). Choose figures so every computed value is positive and coherent.
- interpretation_prose: qualitative advice ONLY (3–5 sentences), tool rules — NO numbers, NO inequalities, NO derived rate, NO verdict, ONLY context facts. Teach the flow-to-rate logic in WORDS.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildInternationalUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.international_kind ?? 'home_currency_standard';
  const kindBlock =
    kind === 'home_currency_standard'
      ? `- DRILL TYPE: INTERNATIONAL NPV (home-currency method). A ${spec.region_hint} parent appraises a foreign project whose cash flows arise in the FOREIGN currency. The candidate forecasts the exchange rate by PURCHASING POWER PARITY (relative inflation), converts each year's foreign cash flow to the parent's currency, discounts at the parent's money cost of capital, and advises. In raw_inputs supply: home_currency + foreign_currency (ISO codes), base_spot (S₀, FOREIGN units per 1 HOME unit), home_inflation + foreign_inflation (DECIMALS — the PPP differential), discount_rate (DECIMAL, home money cost of capital), the foreign FCFF build (pbit, tax_rate [decimal, the FOREIGN corporate tax], depreciation, capex, delta_working_capital — all in FOREIGN millions), foreign_growth (DECIMAL real growth, may be 0), years (3–5), initial_outlay_foreign (FOREIGN millions), withholding_rate + home_tax_rate (DECIMALS — the host withholding and the parent-country tax; credit method). Code derives the FX curve, converts, taxes, discounts, and decides — state NONE of it.
  - SIZING (IMPORTANT): the foreign currency DEPRECIATES over time, withholding removes ~5–10% of each remittance, and cash flows are discounted — so a domestically-marginal project turns NEGATIVE in the parent's currency. Choose a CLEARLY value-adding project: the SUM of the foreign annual cash flows over the project life must be about 2.5–3× the initial_outlay_foreign (e.g. base-year FCFF ≈ PBIT×(1−t)+dep−capex−ΔWC ≈ 900 with a ~1200 outlay over 4 years). The base-case NPV must come out comfortably POSITIVE.
  - TAX TEACHING POINT (K1, branch a): set the FOREIGN corporate tax rate ABOVE the parent's home rate (e.g. foreign 28% > home 21%), so the additional home tax is **NIL** — the credit for foreign corporate tax already covers the whole home liability. The model answer teaches WHY the additional tax is zero; do NOT present it as a silent zero. Do NOT frame the subsidiary as being in a tax-incentive or FREE-ZONE regime (e.g. "Free Zone", "SEZ") — that contradicts the full corporate rate you state; describe a plainly-taxed operation at the stated rate.`
      : kind === 'exchange_rate_sensitivity'
      ? `- DRILL TYPE: EXCHANGE-RATE SENSITIVITY (B5a). The SAME foreign project is appraised under a BASE exchange-rate assumption AND an ALTERNATIVE one (a sharper depreciation of the foreign currency). The question asks the candidate to assess how the project's value — and the decision — change. Supply the full home-currency-NPV inputs (as above) PLUS: alt_foreign_inflation (DECIMAL, HIGHER than foreign_inflation → faster depreciation) and alt_label (a short phrase, e.g. "a sharper devaluation of the rupiah"). Code owns both NPVs and whether the decision flips — state NEITHER.
  - SIZING (CRITICAL — the flip is the whole point): the BASE case must be MEANINGFULLY positive (aim ~+2 to +4 on a ~25-scale outlay — a clear accept, NOT razor-thin), so the SUM of the foreign annual cash flows must be about 3× the initial_outlay_foreign. The ALTERNATIVE foreign inflation must be MUCH higher — about 2.5–3× the base foreign inflation (e.g. base 8% → alt 22%) — so the sharper depreciation pushes the NPV clearly NEGATIVE and the decision FLIPS from accept to reject. If the base is not clearly positive or the alternative does not flip it, the drill fails its purpose.`
      : kind === 'restricted_remittance'
      ? `- DRILL TYPE: RESTRICTED REMITTANCE (B5b, ALSO covers B5c). A host government BLOCKS part of the project's cash from being remitted; the blocked funds are reinvested locally and released at the end of the project. Supply the full home-currency-NPV inputs PLUS: blocked_fraction (DECIMAL 0–1, share of each year's cash blocked) and local_reinvest_rate (DECIMAL, the rate blocked funds earn locally). Code owns the NPV and the cost of the restriction versus free remittance — state NEITHER. Your interpretation_prose MUST develop STRATEGIES FOR RESTRICTED REMITTANCE (the B5c content): transfer pricing, royalty/management fees, parallel/back-to-back loans, local reinvestment, counter-trade — as ways to unlock or use blocked cash. Do NOT invent a specific statute or a named exchange-control regulation.
  - SIZING (the teaching case is the FLIP): the project must be value-adding IF cash can be freely remitted — so size it so the FREE-remittance NPV (no blocking) is comfortably POSITIVE: the SUM of the foreign annual cash flows over the life ≈ 3× the initial_outlay_foreign, with only MODERATE host inflation (~3–5%, so parity depreciation is mild). Then make the restriction MATERIAL — blocked_fraction ≈ 0.25–0.35 and local_reinvest_rate WELL BELOW the parent's discount_rate (e.g. local 3% vs discount 11%) — large enough that the exchange controls REDUCE the NPV. The story: a good project that the capital controls make materially worse.
  - TAX BRANCH (K3, branch b — demonstrate the withholding credit): set the parent's home rate ABOVE the foreign corporate rate (a residual differential of ~3–5 points, e.g. home 28% vs foreign corporate 24%) with wht_creditable = true and a withholding rate high enough (≈ 10%) to COVER that residual — so the additional home tax nets to NIL via the withholding credit (not by the corporate credit alone). This exercises the middle branch.`
      : `- DRILL TYPE: MULTINATIONAL DIVIDEND CAPACITY (A6a). A ${spec.region_hint} parent's dividend capacity draws on both its OWN free cash flow to equity and the cash its overseas subsidiary can REMIT (net of host withholding and the differential home tax, converted at the forecast spot). The candidate judges whether the group's proposed dividend is sustainable. Supply: home_currency + foreign_currency, base_spot (S₀, foreign per home), home_inflation + foreign_inflation (DECIMALS, for the PPP forecast spot), **remittance_year = 2** (the remittance is made and converted in year 2 — code derives year 2's forecast spot by parity), the SUBSIDIARY FCFE build (pbit, tax_rate [foreign corporate rate], depreciation, capex, delta_working_capital in FOREIGN millions), sub_kd (DECIMAL, subsidiary pre-tax cost of debt), sub_debt (FOREIGN millions), sub_net_borrowing (FOREIGN millions, may be 0), remit_fraction (DECIMAL 0–1, share of the subsidiary FCFE remitted in year 2 — the timing of central remittances), parent_fcfe (HOME millions, the parent's own dividend capacity), proposed_dividend (HOME millions, the group's proposed total dividend), withholding_rate + home_tax_rate + wht_creditable. Say the remittance is made IN YEAR 2 (not "this year"). TAX BRANCH (K4, branch c — demonstrate a CHARGED residual): set withholding_rate = 0 (jurisdictionally accurate — the host levies no withholding on outbound dividends to a foreign corporate parent) and the parent home rate MEANINGFULLY ABOVE the foreign corporate rate (a residual of ~6–12 points, e.g. home 30% vs foreign corporate 24%), so a positive additional home tax is CHARGED on the remitted taxable profit and shown. SIZE the subsidiary and the parent so the remitted subsidiary cash is a MATERIAL share of group capacity (≥ ~15%) and a clearly non-trivial home-currency figure (tens of millions), NOT a rounding-scale sliver — keep parent_fcfe modest relative to the subsidiary's remittable cash. Code owns the subsidiary FCFE, the remittance, the group capacity, and the sustainability verdict — state NONE.`;
  return `Write one original ACCA AFM international-finance drill (kind: ${kind}).

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks

CODE-COMPUTES-STATS PROTOCOL — MANDATORY. Code owns EVERY figure and EVERY figure-vs-figure verdict.
Supply the scenario, the raw input figures, and qualitative prose ONLY. DO NOT state anywhere any
forecast exchange rate, any converted cash flow, any NPV, any dividend capacity, any inequality
between computed figures, or any accept/reject/sustainability verdict — code inserts ALL of those.
Forecast exchange rates are DERIVED by parity from the stated inflation differential; NEVER state a
forecast rate yourself.

${kindBlock}

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name the parent and the foreign project/subsidiary and the two countries/currencies involved.
- CURRENCIES: state the base spot rate as ONE clean scenario fact (foreign units per 1 home unit) and the home + foreign INFLATION rates (for the parity forecast). For a foreign project, ALSO label the growth input as "Annual growth of foreign cash flows (money terms)". Report BOTH ISO codes.
- FISCAL (DIFFERENTIAL CREDIT BASE): state the foreign CORPORATE tax rate (raw_inputs.tax_rate), the parent-country tax rate on foreign taxable profit (home_tax_rate), the host withholding rate, and whether a bilateral treaty makes the withholding CREDITABLE (wht_creditable). A bilateral tax treaty makes taxable profits earned abroad liable to the DIFFERENTIAL income tax between the two countries — additional home tax = max(0, home − foreign corporate) on taxable profit, crediting the foreign corporate tax. Do NOT introduce a named treaty article, a specific statute, or exemption-method mechanics — state the RATES and the treaty's creditability only.
- question: begins with the command verb and asks for EXACTLY what this kind delivers — no more (P5). Do NOT ask for an IRR, a WACC derivation, a sensitivity table, or anything outside this kind.
- context_text: 2–3 sentences of narrative + a clean labelled list of the raw inputs (money in millions; rates as %). Weave 1–2 challengeable textures INTO THE PROSE (political/exchange-control risk realism; whether parity will hold; the durability of the cash flows) — do NOT print a labelled "textures" list. Do NOT pre-compute anything.
- FROZEN FACTS (P4b) — a scenario is a DATED snapshot: NEVER write "current market rate" or "currently" next to a spot/inflation/interest rate. State the base spot and inflation rates as "at the appraisal date" / "assumed".
- interpretation_prose: qualitative advice ONLY (3–5 sentences) — NO numbers, NO forecast rates, NO inequalities, NO verdict, ONLY context facts. Cover which assumptions are most fragile (will parity hold? is the remittance/political risk real? is the growth durable?) and what the board should require.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildRiskUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.risk_kind ?? 'enpv';
  const kindBlock =
    kind === 'enpv'
      ? `- DRILL TYPE: EXPECTED NPV (B1a iv). A project has several mutually-exclusive economic states (e.g. optimistic / most-likely / pessimistic), each with a STATED probability and its OWN net post-tax cash-flow stream. The candidate computes each state's NPV, the probability-weighted ENPV, and the probability of a negative NPV, then advises. In raw_inputs supply: outlay (millions), discount_rate (DECIMAL), and scenarios (2–4 items, each {label, probability, cash_flows[]}). Probabilities MUST sum to 1. Code computes each scenario NPV, the ENPV, P(negative NPV) and the decision — state NONE of it.
  - SIZING: make at least one state give a clearly NEGATIVE NPV (so P(negative NPV) is a real risk measure) and the ENPV DECISIVE (not razor-thin). The one-shot caveat is the teaching point.`
      : kind === 'sensitivity'
      ? `- DRILL TYPE: SENSITIVITY ANALYSIS (B1a iv). A project's NPV is tested for how far a variable can move before the decision reverses, AND for its sensitivity to the discount rate. Supply: outlay (millions), discount_rate (DECIMAL), net_cash_flows[] (the TOTAL net post-tax cash flow per year — the base NPV and the IRR come from this), affected_cash_flows[] (the FLEXED variable's OWN post-tax stream, e.g. contribution — the PV base of the variable sensitivity), and variable_label. Code computes the base NPV, the affected PV, the variable sensitivity % = 100 × NPV ÷ PV-affected [S3, S4], the IRR, and the discount-rate sensitivity % = (IRR − r) ÷ r × 100 [S4] — state NONE. Do NOT ask for the bare IRR − r as a "sensitivity"; the model answer teaches that the bare difference is headroom, the sensitivity divides by the original rate.
  - SIZING: base NPV clearly POSITIVE; affected_cash_flows a genuine SUBSET/component of the net cash flows (e.g. the contribution stream), so the variable sensitivity is a sensible single-digit-to-low-double-digit %.`
      : kind === 'radr_compare'
      ? `- DRILL TYPE: RISK-ADJUSTED DISCOUNT RATE (B1a v). The firm is appraising a project in a DIFFERENT risk class from its own operations, so a project-specific RADR is derived from a PROXY (different-industry) company's equity beta — ungeared from the proxy's gearing and regeared to this firm's — via CAPM [S5, S6], and the SAME project cash flows are discounted at the company's own rate vs the project RADR. Supply: outlay, discount_rate (DECIMAL, used only for display context), project_cash_flows[] (net post-tax, millions), company_rate (DECIMAL, the firm's own cost of capital — the WRONG hurdle here), rf, mrp, tax_rate, kd (DECIMALS), peer_equity_beta, peer_ve, peer_vd (the proxy, for ungearing), own_ve, own_vd (this firm, to regear). Code derives the RADR, both NPVs, and whether the decision FLIPS — state NONE.
  - SIZING (the FLIP is the point — be deliberate; you cannot see the computed rates, so engineer BOTH sides): (1) make the RADR clearly ABOVE company_rate — set peer_equity_beta HIGH (1.6–2.0, a genuinely riskier industry than the firm's), keep the proxy's gearing moderate and the appraising firm's gearing LOW (own_vd small vs own_ve), and set company_rate LOW (0.07–0.09); aim for a RADR ~3–6 points above the company rate. (2) make the project MARGINAL at the company rate — choose project_cash_flows whose UNDISCOUNTED SUM is only about 1.08–1.18× the outlay, so the NPV at the company rate is SMALL and positive; the higher RADR then pushes it NEGATIVE. Both together deliver the accept→reject flip. If it does not flip, the drill fails its purpose.`
      : `- DRILL TYPE: PROJECT DURATION & VALUE AT RISK (B1a vi + B1b ii). TWO risk measures read together: (1) the COMPARATIVE project duration of two projects — Σ(t × PV) ÷ Σ PV [S1, S2], the PV-weighted average time; the longer-duration project is more exposed. (2) the project value at risk — z × σ × √N, one-tail. Supply: discount_rate (DECIMAL), project_a {label, cash_flows[]} and project_b {label, cash_flows[]} (make ONE front-loaded and ONE back-loaded so the durations differ materially), var_sigma_annual (the annual σ of project value, MILLIONS — STATED), var_confidence (0.95 or 0.99), var_tail ("one"), var_horizon_years (N). Code owns both durations, which is longer, the z, and the VaR — state NONE. Duration is COMPARATIVE (never a standalone accept/reject).
  - SIZING: the two projects should have the SAME (or similar) total cash but DIFFERENT timing, so the duration comparison is clean; σ and N chosen so the VaR is a material money figure.`;
  return `Write one original ACCA AFM risk & uncertainty drill (kind: ${kind}).

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks

CODE-COMPUTES-STATS PROTOCOL — MANDATORY. Code owns EVERY figure and EVERY figure-vs-figure verdict.
Supply the scenario, the raw input figures, and qualitative prose ONLY. DO NOT state anywhere any NPV,
ENPV, sensitivity %, IRR, RADR, duration, VaR, probability of a negative NPV, any inequality between
computed figures, or any accept/reject/sustainability verdict — code inserts ALL of those.

CONVENTIONS ARE FETCHED — these are page-verified ACCA conventions (do NOT re-derive from memory): the
variable sensitivity is 100 × NPV ÷ PV of the affected post-tax stream; discount-rate sensitivity is
(IRR − r) ÷ r × 100 (the bare IRR − r is headroom, not sensitivity); project duration is Σ(t × PV) ÷ Σ PV;
the RADR is a proxy asset beta ungeared then regeared via CAPM; ENPV is Σ(p × NPV); VaR uses a one-tail z.

${kindBlock}

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name an organisation and the specific project(s) / decision at stake.
- question: begins with the command verb and asks for EXACTLY what this kind delivers — no more (P5). Do NOT ask for anything outside this kind.
- context_text: 2–3 sentences of narrative + a clean labelled list of the raw inputs (money in millions; probabilities and rates as stated). Weave 1–2 challengeable textures INTO THE PROSE (where the probabilities came from; the quality of the σ estimate; whether the normality assumption holds; that EV is a repeated-game argument for a one-shot project) — do NOT print a labelled "textures" list. Do NOT pre-compute anything.
- FROZEN FACTS (P4b): a scenario is a DATED snapshot — never write "current market rate" / "currently" next to a rate; state figures as "assumed" / "at the appraisal date".
- interpretation_prose: qualitative advice ONLY (3–5 sentences) — NO numbers, NO inequalities, NO verdict, ONLY context facts. Cover which assumptions are most fragile and what the board should require.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildFxHedgeUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.fxhedge_kind ?? 'forward_mmh_compare';
  const dir = spec.fx_exposure_direction ?? 'receipt';
  const qd = spec.fx_quote_direction ?? 'foreign_per_home';
  const qdWords = qd === 'foreign_per_home' ? '1 unit of the HOME currency per FOREIGN currency amount stated (foreign per home — e.g. "quoted as R14.20 per $1")' : '1 unit of the FOREIGN currency per HOME currency amount stated (home per foreign — e.g. "quoted as Y$2.52 per €1")';
  const noun = dir === 'receipt' ? 'RECEIPT (an incoming foreign-currency cash flow)' : 'PAYMENT (an outgoing foreign-currency obligation)';
  const kindBlock =
    kind === 'forward_mmh_compare'
      ? `- DRILL TYPE: FORWARD vs MONEY-MARKET HEDGE (E2b, i). A ${spec.region_hint} company has a foreign-currency ${noun} due in a few months and must choose between a forward contract (a rate is STATED — do not derive it) and a money-market hedge (borrow/deposit in the two currencies). In raw_inputs supply: exposure (foreign millions), months (3–7), forward_rate (STATED, quoted ${qdWords}), spot (today's rate, same quote direction), rate_foreign_borrow, rate_foreign_deposit, rate_home_borrow, rate_home_deposit (annual %, e.g. 8 for 8% — give ALL FOUR even though only two are used, as a real rate table would). Code computes both methods' guaranteed outcome and recommends the better one — state NEITHER outcome nor the recommendation.
  - SIZING: pick rates so the money-market hedge and the forward give a CLEAR (not razor-thin) margin — a difference of at least a few percent of the exposure, so the recommendation is decisive.`
      : kind === 'futures'
      ? `- DRILL TYPE: CURRENCY FUTURES (E2b, iii). A ${spec.region_hint} company has a foreign-currency ${noun} and hedges with exchange-traded currency futures. In raw_inputs supply: exposure (foreign millions), contract_size (foreign millions per contract — pick a size so exposure ÷ contract_size is NOT a round number, e.g. 40.4, so the whole-contract rounding is a real teaching point), spot0 (today's spot, quoted ${qdWords}), futures0 (today's futures price, same quote direction — should differ from spot0 by a modest basis), months_to_expiry (the futures' expiry, 4–8 months), months_to_transaction (when the exposure actually settles — STRICTLY LESS than months_to_expiry, so there is a real unexpired basis to compute)${spec.fx_residual_policy === 'forward_topup' ? ', topup_forward_rate (a forward rate for the un-hedged residual — the scenario must EXPLICITLY instruct the residual to be hedged on the forward, per Passmore Co\'s own wording: "unless instructed otherwise" the residual is immaterial, so this drill is the INSTRUCTED-OVERRIDE case)' : ' (do NOT supply topup_forward_rate — this drill uses the DEFAULT policy: the residual after whole-contract rounding is immaterial and is NOT separately hedged, per Passmore Co\'s own examiner wording)'}. Code owns the whole-contract count, the basis decay, the lock-in rate, and the final outcome — state NONE.
  - TEACHING POINT: the question must be answerable with a FULL SET OF INSTRUCTIONS — how many contracts, buy or sell, and the contract month — do not let context_text pre-state any of these.`
      : kind === 'options'
      ? `- DRILL TYPE: CURRENCY OPTIONS (E2b, vi). A ${spec.region_hint} company has a foreign-currency ${noun} and hedges by BUYING traded currency options — a ${dir === 'receipt' ? 'PUT (the right to sell the foreign currency)' : 'CALL (the right to buy the foreign currency)'} — assumed EXERCISED (no gain/loss calculation is needed — state this explicitly in context_text, matching Passmore Co's own examiner note). NEVER describe this as "selling" options — selling/writing options is a different, higher-risk strategy, not the standard corporate hedge; the instruction is always "buy N ${dir === 'receipt' ? 'put' : 'call'} options". In raw_inputs supply: exposure (foreign millions), contract_size (foreign millions per contract — again NOT a round multiple of exposure), strike (quoted ${qdWords}), spot (today's spot rate, same quote direction — REQUIRED even when premium_currency is home; used to convert the premium, never the strike), premium_pct (a DECIMAL FRACTION PER UNIT of contract size, ALL-IN for the option's whole life, e.g. 0.0048 — realistic option premiums are well under 1% of notional expressed this way; do NOT prorate by time, code applies it as a flat per-unit charge — and STATE IT in context_text as a per-unit rate, e.g. "premium JOD 0.0048 per USD 1 of contract size", NEVER as a bare percentage like "0.48%"), premium_currency is fixed to '${spec.fx_premium_currency ?? 'foreign'}' by the drill design — state the premium in ${spec.fx_premium_currency === 'home' ? 'the HOME' : 'the SAME (foreign/quoted) currency the company is working with — and note in context_text that no further conversion is needed for it, matching Passmore Co\'s own examiner point'}, months_to_transaction (3–7, display only — the premium is NOT prorated by this). The premium is deducted/added AS PAID, undiscounted (no future-value step) — if you want to note its financing cost, do so QUALITATIVELY in interpretation_prose, never as a computed figure. Code owns the whole-contract count, the premium, and the net outcome — state NONE.`
      : `- DRILL TYPE: CURRENCY SWAP (E2b, iv). A ${spec.region_hint} company has a foreign-currency ${noun} and is offered a currency swap that covers only PART of the exposure — the classic Mahoney Co teaching point ("the swap rate would only account for a proportion of the cash"). In raw_inputs supply: exposure (foreign millions), swap_fraction (a DECIMAL below 1, e.g. 0.65–0.8 — the swap does NOT cover the whole flow), swap_rate (quoted ${qdWords}), residual_forward_rate (a forward rate for the un-swapped residual — MUST differ from swap_rate so the residual's treatment is a genuine distinct step, not a copy). Code owns the swapped amount, the residual, and the total outcome — state NONE.`;
  return `Write one original ACCA AFM FX-hedging drill (kind: ${kind}).

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks

CODE-COMPUTES-STATS PROTOCOL — MANDATORY. Code owns EVERY figure AND every figure-vs-figure verdict
(including which hedge method wins and by how much). Supply the scenario, the raw input figures, and
qualitative prose ONLY. DO NOT state anywhere any guaranteed outcome, any contract count, any premium
figure, any basis/lock-in rate, any swap split, or any recommendation — code inserts ALL of those.

QUOTE DIRECTION — MANDATORY, DO NOT AUTHOR IT YOURSELF. Every rate in this drill (spot, forward,
futures, strike, swap) is quoted ${qdWords}. You MUST place the literal placeholder token
{{QUOTE_SENTENCE}} on its own at the exact point in context_text where the quote-direction sentence
belongs — code replaces it afterwards with the exact canonical sentence for this drill's
quote_direction. Do NOT write your own version of this sentence anywhere in context_text; a
model-authored quote sentence has previously drifted from the actual parameter (a direction
inversion is the single most common student AND authoring error in this topic) — the placeholder
makes that structurally impossible. Every numeric RATE you supply must still be internally
consistent with the direction stated in the prompt above (${qdWords}) even though you don't write
the sentence yourself.

EXPOSURE DIRECTION: this drill's exposure is a ${noun}. State this plainly in context_text.

CURRENCY-LABELLING CHECK (MANDATORY, re-read before you submit): raw_inputs.exposure is denominated
in currency_foreign, NEVER currency_home. The company whose board you are advising holds
currency_home as its OWN operating currency and is exposed to a cash flow denominated in
currency_foreign — every mention of the exposure amount anywhere in context_text and the question
MUST use the currency_foreign code, never the currency_home code. Before you call the tool, verify:
(1) which company's board you are advising — that company's OWN currency is currency_home; (2) which
currency the exposure/counterparty payment is actually denominated in — that is currency_foreign,
and that is what raw_inputs.exposure must be; (3) that context_text never swaps the two, and never
states the exposure amount using the currency_home code. A scenario that labels the exposure in
currency_home is unusable — code will silently compute a nonsense conversion.

CONVENTIONS (source-verified, ACCA P4/AFM technical articles + official answers — see
docs/evidence/sources.json T1/T2/T3/S8/S9) — futures/options trade in WHOLE contracts only,
rounded to the nearest whole number; the unexpired basis at the transaction date = basis₀ ×
(months remaining to expiry) ÷ (months to expiry from today), assumed to decline LINEARLY to zero
by expiry; the lock-in rate = futures₀ + unexpired basis (NOT spot₀ − unexpired basis); an option
premium is a PER-UNIT rate × contracts × contract size, ALL-IN for the option's life, NO time
proration, converted to the home currency at SPOT if quoted in a different currency (never at the
strike, which prices exercise on a later date); a swap may cover only a STATED PROPORTION of the flow, with the residual hedged
separately. An option hedge always BUYS (a put for a receipt, a call for a payment) — never sells.

${kindBlock}

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name the company and the counterparty/trading relationship giving rise to the exposure.
- question: begins with the command verb and asks for EXACTLY what this kind delivers, including a recommendation where the kind compares methods — no more (P5).
- context_text: 2–3 sentences of narrative + a clean labelled list of the raw inputs (money in millions; rates as %). Weave 1–2 challengeable textures INTO THE PROSE (basis risk; counterparty/margin risk on an OTC or exchange-traded instrument; an overconfident claim from a director about which hedge is best, in the style of Abertafol Co's "options should never be the best choice" — a claim the model answer must rebut WITH the computed figures, never just assert against) — do NOT print a labelled "textures" list. Do NOT pre-compute anything.
- FROZEN FACTS (P4b): a scenario is a DATED snapshot — never write "current market rate" / "currently" next to a rate; state figures as "assumed" / "at the appraisal date".
- interpretation_prose: qualitative advice ONLY (3–5 sentences) — NO numbers, NO contract counts, NO recommendation, ONLY context facts. Cover which assumptions are most fragile and what the board should require before committing to the hedge.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildNpvUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.npv_kind ?? 'standard';
  const kindBlock =
    kind === 'rationing'
      ? `- DRILL TYPE: single-period CAPITAL RATIONING. The company has limited capital this period. In raw_inputs, ALSO give competitor_projects (2–3 other divisible projects, each with a GIVEN profitability index and outlay) and capital_limit. context_text must state those competitor PIs and the capital limit as scenario facts. Code computes THIS project's NPV and PI and ranks all projects by PI within the limit — do NOT rank or select in your prose.`
      : kind === 'sensitivity'
      ? `- DRILL TYPE: SENSITIVITY. Give sensitivity_label (the variable whose reliability is in doubt, e.g. "the annual sales volume"). The question asks for the NPV AND how sensitive the decision is to that variable. Code computes the break-even % fall — do NOT state any sensitivity figure in prose.`
      : kind === 'section_a'
      ? `- DRILL TYPE: SECTION-A style. Write a richer board-report scenario (a strategic acquisition/expansion the board is deciding on) and phrase the question as a report to the board. The model answer will do the NPV then an integrated recommendation with an assumption challenge — longer, advisory register, professional-skills weighted.`
      : `- DRILL TYPE: STANDARD focused NPV appraisal (Section-B style): tight, single-technique "appraise and advise".`;

  return `Write one original ACCA AFM investment-appraisal drill using net present value (NPV).

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: advise
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks
${kindBlock}

CODE-COMPUTES PROTOCOL — MANDATORY. Code owns EVERY figure: the tax-allowable depreciation
(WDA) schedule, taxable profit, tax, inflated cash flows, discount factors, present values, NPV,
the accept/reject decision, and any PI/ranking/sensitivity. Supply the scenario, the raw inputs,
and qualitative prose only. DO NOT state any of those computed figures, any inequality between
them, or any sensitivity/PI value.

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name an organisation and a specific capital project the board must decide on.
- question: begins with the command verb; asks the candidate to appraise the project by NPV and advise the board whether to proceed.
- context_text: scenario narrative + a clean labelled list of the raw inputs (money in millions of the LOCAL currency, rates in %): initial capital cost, the pre-tax operating cash flows per year IN REAL TERMS (3–5 years), the inflation rate, the tax rate, the tax-payment lag (same year or one year in arrears), the capital qualifying for tax-allowable depreciation and its reducing-balance rate, the scrap/residual value, and the discount rate. Add 1–2 challengeable textures (forecast optimism; reliability of the inflation or discount-rate estimate). Do NOT pre-compute anything.
- JURISDICTION RULE (P4): factual regulator/institution NAMES are fine in context_text as scenario framing (e.g. "holds a Health Canada licence", "listed on the TSX", a central-bank rate texture). But state a tax-allowable depreciation RATE only — NEVER a tax/CCA class number or a statute ("Income Tax Act") anywhere. In the ADVICE (interpretation_prose), do NOT invent jurisdiction-specific claims the scenario did not state — no regulator timeline/behaviour claims, no formulary specifics — unless context_text raised them; recommend "confirm the correct tax classification" generically. End context_text with EXACTLY this line: "For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated."
- Provide the SAME figures in raw_inputs. Rates as DECIMAL FRACTIONS (0.25 for 25%). The discount rate must exceed inflation; choose figures that give a realistic (not trivially huge) NPV so the decision is a genuine judgement.
- interpretation_prose: qualitative advice ONLY, per the tool rules — no computed numbers, no inequalities, no PI/sensitivity values, only context facts. Do NOT open with a verdict frame or restate accept/reject — code injects the decision-keyed opener (P3). Do NOT use "cautious optimism" or "even if the NPV is positive". Develop WHY each fragile assumption matters and what the board must verify. Obey the JURISDICTION RULE (P4): recommend "confirm the correct tax classification" generically, never a class number or named statute/regulator.
- QUESTION-COMPLETENESS (P5): the question must demand ONLY what the model answer delivers. A standard NPV drill must NOT ask for "sensitivity analysis" (that is the sensitivity variant); only the sensitivity kind asks for it, only the rationing kind asks for a profitability-index ranking.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildApvUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.apv_kind ?? 'standard';
  const kindBlock =
    kind === 'subsidised'
      ? `- DRILL TYPE: APV with a SUBSIDISED loan. The project is part-funded by a below-market (development-bank / government-backed) loan. In raw_inputs give debt_amount, kd (the MARKET cost of debt), subsidised_rate (the below-market coupon actually paid, strictly < kd), and debt_term. Do NOT give issue_cost_rate. context_text must state the market rate, the subsidised rate, and that the loan is tied to this project. Code computes the tax shield on the ACTUAL interest and the after-tax interest saving vs the market rate — do NOT state either in prose. DECISION-RELEVANCE (important): the classic APV lesson is that cheap, project-tied financing turns a MARGINAL project positive, so the all-equity base case must sit NEAR BREAK-EVEN. CALIBRATE the figures concretely (tax AND discounting at Keu erode the pre-tax flows, so aim for a base case near break-even — small in magnitude relative to the outlay, either sign): the SUM of the pre-tax real operating cash flows should be roughly 1.4–1.9× the initial outlay (lean to the higher end when the tax rate is 30%+). The subsidised debt should be a MEANINGFUL share of the outlay (a third to a half) so its shield + subsidy can plausibly tip the decision. Do NOT make operating cash flows tiny relative to the outlay — a base case so deeply negative that no financing could rescue it defeats the drill. Code owns the final sign; do not state it. LOAN TERM = APPRAISAL HORIZON: the subsidised facility is drawn for and repaid over the project's appraisal horizon — in context_text state the loan's term as EQUAL to the number of operating-cash-flow years (do NOT describe, say, a "15-year loan" while the appraisal runs 5 years), and set debt_term to that same horizon. The stated term and the years you shield MUST agree.`
      : kind === 'reject'
      ? `- DRILL TYPE: APV where the financing side-effects do NOT rescue a weak project. Choose operating figures so the all-equity base case is clearly value-DESTROYING (a negative base-case NPV), and a modest debt tax shield is not enough to lift the APV above zero. Give debt_amount and kd (optionally issue_cost_rate). Do NOT state the base-case NPV or the APV or their signs — code owns the reject verdict. Your prose must NOT pre-empt the decision or use "cautious optimism".`
      : kind === 'financing_compare'
      ? `- DRILL TYPE: APV comparing TWO financing packages for the SAME project (B3k — impact on the reported financial position under alternative financing strategies). The board is choosing between a DEBT package and an EQUITY (rights issue) package. In raw_inputs give: debt_amount (GROSS principal → debt issue cost = debt_amount × f), kd, issue_cost_rate, equity_amount (NET rights proceeds → grossed up), equity_issue_cost_rate, existing_debt and existing_equity (current market values). State the debt as gross and the equity proceeds as net — never one figure as both. Choose figures so the base case is POSITIVE and the two packages give genuinely close APVs (a real judgement). Code computes each package's APV, picks the higher, and computes the post-project gearing under each — do NOT state any APV, gearing figure or which package wins. Your prose must weigh the impact on the reported financial position: higher gearing and lower interest cover (debt) vs shareholder dilution (rights), tied to the scenario.`
      : `- DRILL TYPE: STANDARD APV appraisal (Section-B style): base case at Keu + debt tax shield + issue costs. Give debt_amount, kd (market cost of debt), and issue_cost_rate. Code computes the tax shield (discounted at Kd), the issue costs (a % of the gross debt principal = debt_amount × f), the APV, and the accept/reject decision. context_text should present the debt_amount as the GROSS principal borrowed (do NOT also state a separate "net proceeds" figure for the same debt — one figure, not both bases). Choose figures so the all-equity base case is already POSITIVE (a viable project) and the financing side-effects add further value, giving a clearly POSITIVE APV — a clean ACCEPT exemplar, distinct from the separate reject variant. Code owns the sign; do not state it.`;

  return `Write one original ACCA AFM investment-appraisal drill using the ADJUSTED PRESENT VALUE (APV) technique.

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks
${kindBlock}

APV METHOD — the base case is valued as if ALL-EQUITY financed, discounted at the ungeared
cost of equity Keu (a STATED scenario fact), then the present value of the financing
side-effects is added. Deriving Keu by ungearing an equity beta is OUT OF SCOPE here — state
Keu directly; a separate cost-of-capital drill covers the ungearing.

CODE-COMPUTES PROTOCOL — MANDATORY. Code owns EVERY figure: the WDA schedule, tax, inflated
cash flows, the base-case NPV at Keu, the debt tax shield, any subsidised-loan benefit, the
grossed-up issue costs, the APV, and the accept/reject (or financing-choice) verdict. Supply
the scenario, the raw inputs, and qualitative prose only. DO NOT state any of those computed
figures, any present value, any discount factor, any inequality between computed figures, or
the APV/base-case NPV or its sign.

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name an organisation and a specific capital project that MATERIALLY changes the firm's financing structure (the reason APV, not NPV/WACC, is the right tool).
- question: begins with the command verb; asks the candidate to appraise the project using APV and advise the board${kind === 'financing_compare' ? ' which financing package to use' : ' whether to proceed'}.
- context_text: scenario narrative + a clean labelled list of the raw inputs (money in millions of the LOCAL currency, rates in %): initial capital cost, the pre-tax operating cash flows per year IN REAL TERMS (3–5 years), the inflation rate, the tax rate, the tax-payment lag, the capital qualifying for tax-allowable depreciation and its reducing-balance rate, the scrap/residual value, the ungeared cost of equity Keu, and the financing facts for this variant. Do NOT pre-compute anything.
- JURISDICTION RULE (P4): factual regulator/institution NAMES are fine in context_text as scenario framing, but state a tax-allowable depreciation RATE only — NEVER a tax/CCA class number or a statute anywhere. In the ADVICE, do not invent jurisdiction-specific claims the scenario did not state. End context_text with EXACTLY this line: "For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated."
- Provide the SAME figures in raw_inputs. Rates as DECIMAL FRACTIONS (0.25 for 25%). Keu must exceed inflation and exceed Kd. ${kind === 'subsidised' ? 'subsidised_rate must be strictly below kd.' : kind === 'reject' ? 'Pick figures giving a clearly NEGATIVE base-case NPV.' : 'Pick figures giving a realistic, non-trivial APV so the decision is a genuine judgement.'}
- interpretation_prose: qualitative advice ONLY, per the tool rules — no computed numbers, no present values, no inequalities, only context facts. Do NOT open with a verdict frame. Develop WHY the key assumptions matter (is Keu the right ungeared rate here; will the debt capacity / subsidy hold over the term) and what the board must verify.
- QUESTION-COMPLETENESS (P5): the question must demand ONLY what the model answer delivers — an APV appraisal${kind === 'financing_compare' ? ' comparing the two financing packages' : ''}. Do NOT ask for a sensitivity analysis or a profitability-index ranking (those are other variants).
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildCapmUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.capm_kind ?? 'project_specific';
  const kindBlock =
    kind === 'org_wacc'
      ? `- DRILL TYPE: ORGANISATION WACC (B3d). Compute the company's OWN overall WACC. In raw_inputs give company_equity_beta, company_ve, company_vd (market values), kd, rf, mrp, tax_rate. Code prices Ke via CAPM on the company's own beta and weights it with post-tax debt by MARKET VALUES. No ungearing here (the company's own beta is used directly).`
      : kind === 'keu_for_apv'
      ? `- DRILL TYPE: UNGEARED COST OF EQUITY / Keu (B3e). UNGEAR a peer/sector equity beta to an asset beta, then price the ungeared (all-equity) cost of equity Keu = Rf + β_asset × MRP. In raw_inputs give peer_equity_beta, peer_ve, peer_vd, rf, mrp, tax_rate (NO kd, NO regearing). Frame the ask as deriving the ungeared rate that an APV appraisal would use for its all-equity base case — this calculator DERIVES Keu; APV states it.`
      : kind === 'wrong_hurdle'
      ? `- DRILL TYPE: WRONG-HURDLE (B3d appropriateness). A firm is appraising a project whose BUSINESS RISK differs from its own. Give the COMPANY's data (company_equity_beta, company_ve, company_vd, kd) AND a PEER in the project's line of business (peer_equity_beta, peer_ve, peer_vd) AND the project's expected return (project_return, as a %). Code computes the company WACC and the project-specific WACC (ungear the peer, regear to the firm's gearing) and owns the accept/reject decision + whether the wrong hurdle FLIPS it. CHOOSE project_return so it sits BETWEEN the two WACCs (so the decision flips — the teaching point). Do NOT state any rate or the decision in prose.`
      : `- DRILL TYPE: PROJECT-SPECIFIC WACC (B3e), first-of-family. UNGEAR a PEER's equity beta to an asset beta (strip the peer's financial risk), then REGEAR to the appraising firm's OWN capital structure, price the project Ke via CAPM, and compute the project-specific WACC. Give peer_equity_beta, peer_ve, peer_vd, own_ve, own_vd (the appraising firm's gearing), kd, rf, mrp, tax_rate. The project is in the peer's line of business, DIFFERENT from the appraising firm's own — that is why a project-specific rate is needed.`;

  return `Write one original ACCA AFM cost-of-capital drill.

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks
${kindBlock}

HOUSE CONVENTIONS — MANDATORY. Debt beta = 0 (debt assumed risk-free, exam-orthodox). Betas
are ungeared/regeared with the Modigliani–Miller WITH-TAX relationship β_a = β_e × Ve/(Ve+Vd(1−T)).
The cost of equity is priced by CAPM. WACC uses MARKET-VALUE weights and a post-tax cost of debt.

CODE-COMPUTES PROTOCOL — MANDATORY. Code owns EVERY figure: every asset/regeared beta, every
Ke/Keu, every WACC, every rate-vs-rate comparison, and the accept/reject decision + flip. Supply
the scenario, the raw inputs, and qualitative prose only. DO NOT state any beta, any rate, any
inequality between rates, or the decision.

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name an organisation and (where the kind needs it) a named listed PEER whose beta is observable.
- question: begins with the command verb; asks for the relevant cost of capital and an evaluation/advice.
- context_text: scenario narrative + a clean labelled list of the raw inputs. STATE THE CORPORATE TAX RATE EXPLICITLY (needed to ungear) — for the UAE use 9%, distinctive and correct. Give market values of equity and debt in millions of the LOCAL currency; betas as decimals; rf, mrp, kd as %. Add 1 challengeable texture (peer comparability; single-observation beta reliability). Do NOT pre-compute anything.
- Provide the SAME figures in raw_inputs. Rates as DECIMAL FRACTIONS (0.04 for 4%); betas as decimals; project_return (wrong_hurdle) as a PERCENTAGE number.
- interpretation_prose: qualitative evaluation ONLY, per the tool rules — no betas, no rates, no inequalities, only context facts. Cover peer comparability, business-vs-financial risk, and the appropriateness of the rate for project/organisational value.
- QUESTION-COMPLETENESS (P5): the question must demand ONLY what the model answer delivers (a cost-of-capital derivation + evaluation). Do NOT ask for an NPV, a sensitivity, or a PI ranking.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildDurationUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.duration_kind ?? 'standard';
  const kindBlock =
    kind === 'compare'
      ? `- DRILL TYPE: COMPARE two debt facilities (e.g. a shorter-dated vs a longer-dated bond). In raw_inputs give BOTH \`bond\` and \`bond_b\` (each with face_value, coupon_rate, maturity, ytm, label). Code computes each duration and OWNS the RANKING of interest-rate exposure (higher modified duration = more exposed). Choose maturities/coupons so the ranking is clear. Do NOT rank or state any duration in prose.`
      : kind === 'zero_coupon'
      ? `- DRILL TYPE: ZERO-COUPON / deep-discount. The primary \`bond\` has coupon_rate 0 (a zero). ALSO give \`coupon_ref\`: an equivalent-maturity COUPON bond (same maturity + ytm, a normal coupon). Code shows the zero's Macaulay duration EQUALS its maturity, and the coupon bond's is shorter — the intuition anchor. Do NOT state any duration in prose.`
      : kind === 'limitations'
      ? `- DRILL TYPE: LIMITATIONS + CONVEXITY (this kind ALSO covers B3g). Give one \`bond\` and a LARGE \`yield_shift\` (e.g. 0.03 = +300 bp). The calculation is light (one duration + the first-order price estimate); the MARKS are in the evaluation. Your interpretation_prose must develop CONVEXITY: the modified-duration estimate is linear, so for a large shift it overstates the price fall (and understates the rise) because the true price–yield curve is convex. Do NOT state the duration or the estimate in prose — code injects them; develop the WHY.`
      : `- DRILL TYPE: STANDARD single-bond duration (first-of-family). Give one \`bond\` and a \`yield_shift\` (e.g. 0.01 = +100 bp). Code builds the PV-weighted table, Macaulay, modified = Macaulay/(1+y), and the price sensitivity. The full mechanics.`;

  return `Write one original ACCA AFM bond-duration drill.

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks
${kindBlock}

HOUSE CONVENTIONS — MANDATORY. Each bond is priced at its stated flat yield to maturity (a
single YTM — no yield curve). Coupons are ANNUAL. Modified duration = Macaulay ÷ (1 + y).

CODE-COMPUTES PROTOCOL — MANDATORY. Code owns EVERY figure: every discounted cash flow,
price, Σ t·PV, Macaulay and modified duration, price sensitivity, and every duration-vs-
duration ranking/comparison. Supply the scenario, the raw inputs, and qualitative prose only.
DO NOT state any duration, any price, any rate, any inequality between durations, or the ranking.

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name an organisation and its debt instrument(s) — a bond issue, a term loan, a facility.
- question: begins with the command verb; asks for the relevant duration(s) and an assessment of interest-rate exposure.
- context_text: scenario narrative + a clean labelled list of the raw inputs. STATE EACH BOND'S FLAT YTM EXPLICITLY, plus face value, coupon rate and maturity. Add 1 challengeable texture (the yield is a single snapshot; a parallel shift is assumed). Do NOT pre-compute anything.
- CURRENCY REALISM: if the currency is TRY (Turkish lira), the stated yield MUST be realistic for lira debt — deep double-digit (e.g. 18–24%) — with one line acknowledging the high-rate environment; OR denominate the facilities in a hard currency (USD/EUR) and say so in the scenario. NEVER a single-digit TRY yield.
- Provide the SAME figures in raw_inputs. Coupons and yields as DECIMAL FRACTIONS (0.08 for 8%). yield_shift (where used) as a decimal (0.01 = 100 bp).
- interpretation_prose: qualitative evaluation ONLY, per the tool rules — no durations, no prices, no rates, no inequalities, only context facts.${kind === 'limitations' ? ' DEVELOP the convexity limitation (why the linear estimate is unreliable for a large shift).' : ''}
- QUESTION-COMPLETENESS (P5): the question must demand ONLY what the model answer delivers (a Macaulay/modified duration assessment). Do NOT ask for an NPV, IRR or a WACC.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildCreditUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.credit_kind ?? 'kd_term_structure';
  const kindBlock =
    kind === 'downgrade_impact'
      ? `- DRILL TYPE: DOWNGRADE IMPACT (rating-agency role, B3h(i)). The issuer is downgraded one or two notches. In raw_inputs give: \`spread_table\` (a rating→spread map, bp), \`base_rating\`, \`new_rating\` (the new one MUST be weaker → wider spread), \`benchmark_rate\` (the risk-free benchmark for the debt's maturity, PERCENT), \`debt_principal\` (millions), and \`existing_coupon_rate\` (the existing bond's FIXED coupon, PERCENT — the calculator frames the Δ as a REFINANCING cost and states the existing coupon is insulated). OPTIONALLY give \`equity_weight\`, \`debt_weight\`, \`ke\` (PERCENT), \`tax_rate\` (decimal) — ONLY if you want the exact ΔWACC computed; if you omit ANY of the four, code states the WACC effect DIRECTIONALLY (never an unsupported figure). Code owns the cost of debt at each rating, the refinancing Δ, and the ΔWACC. The MARKS are in the evaluation: the agencies' role in pricing default risk, and the issuer's real exposure (refinancing cost, covenant/disclosure optics, funding cost) — NOT a "loss". The existing fixed coupon is INSULATED from the downgrade.`
      : kind === 'spread_estimation'
      ? `- DRILL TYPE: CREDIT-SPREAD ESTIMATION (B3h(ii)). Give a corporate \`bond\` (face_value in millions, coupon_rate PERCENT, maturity), its quoted \`market_price\` (millions), the matched-maturity \`govt_yield\` (PERCENT), two trial yields \`r_lo\` / \`r_hi\` (PERCENT) that STRICTLY BRACKET the market price (price at r_lo ABOVE the market price, price at r_hi BELOW it), and the issuer's \`rating\` + a \`spread_table\` (so code can compare the derived spread to the rated-peer band). Code interpolates the corporate redemption yield, DERIVES the spread = corporate yield − government yield, and OWNS the spread-vs-band comparison (tighter/wider than the rating). Do NOT state any yield or spread in prose.`
      : kind === 'debt_valuation'
      ? `- DRILL TYPE: CORPORATE-DEBT VALUATION (B4a). Give a corporate \`bond\`, the issuer's \`rating\`, a \`spread_table\` containing that rating, the government \`govt_spot\` curve (an array of spot rates by maturity year, PERCENT, length = maturity), and a quoted \`market_price\` (millions). Code discounts each cash flow at its own maturity's (govt spot + spread), sums to the FAIR VALUE, and OWNS the over/under-valued verdict vs the market price. Do NOT state any price, rate, or the verdict in prose.`
      : `- DRILL TYPE: COST OF DEBT VIA THE TERM STRUCTURE (B3h(iii), first-of-family). Give a corporate \`bond\`, the issuer's \`rating\`, a \`spread_table\` containing that rating, the government \`govt_spot\` curve (array of spot rates by maturity year, PERCENT, length = maturity), and two trial flat yields \`r_lo\` / \`r_hi\` (PERCENT). Code discounts each cash flow at its own maturity's (govt spot + spread) for the curve price, then interpolates the single flat cost of debt that reprices the bond. Do NOT state any rate or price in prose.`;

  return `Write one original ACCA AFM credit-risk drill.

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks
${kindBlock}

HOUSE CONVENTIONS — MANDATORY.
- ISSUER PERSPECTIVE: the entity ISSUES the debt. A wider spread / downgrade is higher FUNDING and refinancing cost, NEVER a "loss" (loss language is for investors). The issuer's genuine exposures are refinancing cost, covenant/disclosure optics, hedge-accounting, and future funding cost.
- RATE CONVENTION: every rate — benchmark, spot curve, coupon, trial yields, Ke, govt yield — is a PERCENT NUMBER (7.25 for 7.25%, 0.30 for 0.30%). Spreads are BASIS POINTS (integers). Weights and tax_rate are DECIMALS in [0,1). Money is in MILLIONS.
- TERM STRUCTURE: the government spot curve is a genuine curve (rates DIFFER by maturity) — this is the point of the family. Each cash flow discounts at its OWN maturity's spot + spread. No forward-rate bootstrapping.
- RATING REALISM: use REAL agency symbols from ONE scale only — S&P/Fitch (AAA, AA+, …, BBB-, BB+, …, D) OR Moody's (Aaa, Aa1, …, Baa3, Ba1, …, C). Never invent a symbol, never mix agencies. The spread_table MUST be MONOTONIC: a weaker rating carries a WIDER spread.

CODE-COMPUTES PROTOCOL — MANDATORY. Code owns EVERY figure: every discounted cash flow, price, yield, spread, cost of debt, fair value, the Δ figures, and the over/under-valued verdict. Supply the scenario, the raw inputs, and qualitative prose only. DO NOT state any rate, spread, price, yield, cost of debt, or verdict in prose.

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name an organisation and its debt instrument(s) — a bond issue, a term loan, a facility — as the ISSUER.
- CURRENCY REALISM: state a government/benchmark yield level realistic for the currency. If the currency is COP (Colombian peso), yields are DEEP (high single / low double digit) — acknowledge the high-rate environment in one line. Never a currency-implausible rate.
- question: begins with the command verb; asks for the relevant figure(s) and an issuer-framed assessment.
- context_text: scenario narrative + a clean labelled list of ALL raw inputs — STATE the full government spot curve and the spread table EXPLICITLY. Add 1 challengeable texture (the rating is a point-in-time view; the spread table is dated; the curve is a snapshot). Do NOT pre-compute anything.
- Provide the SAME figures in raw_inputs (rates as PERCENT numbers, spreads as bp, money in millions).
- interpretation_prose: qualitative evaluation ONLY (3–5 sentences) — issuer-framed, takes a POSITION (anti-fence-sitting), NO figures/rates/spreads/verdict. Reference ONLY context facts.
- FROZEN FACTS (P4b) — MANDATORY in EVERY field: a scenario is a DATED snapshot, not a live feed. NEVER write "current market …", nor "currently" next to a yield/spread/rate/curve/basis-points/market price. Freeze every market fact as a dated assumption — "at the valuation date", "as assumed in the scenario", "the spread table as dated". (Say "the spread table is dated", NOT "current market spreads".)
- QUESTION-COMPLETENESS (P5): the question must demand ONLY what the model answer delivers. Do NOT ask for an NPV, IRR, duration or a full WACC build.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildBsopUserPrompt(spec: AfmDrillSpec): string {
  const kind = spec.bsop_kind ?? 'financial_product_valuation';
  const kindBlock =
    kind === 'financial_product_valuation'
      ? `- DRILL TYPE: BSOP FINANCIAL-PRODUCT VALUATION (B2a, first-of-family). Value a TRADED option — a listed-equity warrant tranche or an executive-share-option grant valued in aggregate. In raw_inputs give the five drivers: \`underlying\` (Pₐ, aggregate value of the underlying shares, MILLIONS), \`exercise\` (Pₑ, aggregate exercise price, MILLIONS), \`volatility\` (s, PERCENT), \`risk_free\` (r, PERCENT), \`time\` (t, years). Code owns d1/d2/N(d)/the call value. The marks are the FIVE-DRIVER identification + interpretation.`
      : kind === 'option_to_delay'
      ? `- DRILL TYPE: REAL OPTION TO DELAY (B2c, a CALL). A firm can DEFER an irreversible investment. MAP the scenario: \`underlying\` (Pₐ = PV of the project's future cash flows, MILLIONS), \`exercise\` (Pₑ = the development/investment cost, MILLIONS), \`volatility\` (s of the project value, PERCENT), \`risk_free\` (r, PERCENT), \`time\` (t = the deferral window, years), and \`base_npv\` (the project's NPV WITHOUT the option, MILLIONS — make it modestly NEGATIVE so the option-to-wait keeps it alive). Also set \`underlying_label\`/\`exercise_label\` naming what Pₐ/Pₑ map to. Code owns the call value + the defer decision. CLASSIFY the archetype (option to delay) in prose.`
      : kind === 'option_to_expand'
      ? `- DRILL TYPE: REAL OPTION TO EXPAND (B2c, a CALL). A pilot/first phase carries a follow-on GROWTH option to scale up. MAP: \`underlying\` (Pₐ = PV of the full-scale expansion's cash flows, MILLIONS), \`exercise\` (Pₑ = the scale-up investment, MILLIONS), \`volatility\` (s, PERCENT), \`risk_free\` (r, PERCENT), \`time\` (t = time to the expand decision, years), \`base_npv\` (the base project NPV, MILLIONS — modestly NEGATIVE so the growth option can justify it), + labels. Code owns the call + expanded value (base + call) + the decision. CLASSIFY (option to expand) in prose.`
      : `- DRILL TYPE: REAL OPTION TO WITHDRAW / ABANDON (B2c, a PUT via put-call parity). A project/asset can be ABANDONED (or REDEPLOYED) for a recoverable amount. MAP: \`underlying\` (Pₐ = PV of CONTINUING to operate, MILLIONS), \`exercise\` (Pₑ = the salvage / resale / redeployment value received on exit, MILLIONS), \`volatility\` (s, PERCENT), \`risk_free\` (r, PERCENT), \`time\` (t, years), \`base_npv\` (MILLIONS), + labels. Code values the abandonment PUT via put-call parity + the project value with the option. CLASSIFY (option to withdraw/abandon; note redeploy is the same put/switch family) in prose.`;

  return `Write one original ACCA AFM Black-Scholes (BSOP) / real-options drill.

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA S26–J27 study guide): "${spec.descriptor}"
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks
${kindBlock}

HOUSE CONVENTIONS — MANDATORY.
- The EXAM SUPPLIES the BSOP calculator (spreadsheet-inputs style): the marked skill is IDENTIFYING the five drivers${kind === 'financial_product_valuation' ? '' : ' and MAPPING the scenario to Pₐ (underlying) and Pₑ (exercise) — this mapping is the crux'} and INTERPRETING the result. Do NOT ask the student to derive d1/d2 by hand as the marked task.
- UNITS: money in MILLIONS; volatility s and risk-free r are PERCENT NUMBERS (e.g. 30 = 30%, 2.5 = 2.5%); time t in years.
- CALIBRATION — MANDATORY: choose the five drivers so the option is roughly AT-THE-MONEY — Pₐ within about ±25% of Pₑ, with a moderate s·√t (roughly 0.3–0.9) — so d1 and d2 land in roughly [−1.5, 1.5]. Deep in-/out-of-the-money cases (|d| > ~2) are less instructive AND make N(d) insensitive; avoid them.
- STATE ALL FIVE DRIVERS EXPLICITLY as labelled scenario inputs. ${kind === 'financial_product_valuation' ? 'The underlying is traded, so BSOP applies directly.' : 'For the real option, ALSO state the base-case NPV (without the option).'}
- LIMITATIONS: BSOP prices a EUROPEAN option; real options are often American (approximation). The LOUDEST limitation is VOLATILITY ESTIMATION${kind === 'financial_product_valuation' ? '' : ' — a non-traded real-asset underlying has no traded history, so s is a proxy/subjective, and the no-arbitrage replication that underpins BSOP breaks for a non-traded underlying, making the value INDICATIVE'}.

CODE-COMPUTES PROTOCOL — MANDATORY. Code owns EVERY figure: d1, d2, N(d1), N(d2), the call/put value, the expanded value and the decision. Supply the scenario, the raw inputs, and qualitative prose only. DO NOT state any d-value, probability, option value, or inequality in prose.

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name an organisation and the option/decision at stake.
- question: begins with the command verb; asks to value the option using BSOP and ${kind === 'financial_product_valuation' ? 'discuss the five drivers' : 'advise on the real option, having identified the archetype'}.
- context_text: scenario narrative + a clean labelled list of the FIVE DRIVERS${kind === 'financial_product_valuation' ? '' : ' + the base-case NPV'}. Do NOT pre-compute d1/d2/N(d)/the value.
- Provide the SAME figures in raw_inputs (money MILLIONS; s, r PERCENT; t years).
- interpretation_prose: qualitative ONLY (3–5 sentences) — the five-driver interpretation${kind === 'financial_product_valuation' ? '' : ' + the archetype classification'} + BSOP limitations, VOLATILITY-ESTIMATION the loudest. NO figures, NO probabilities, NO option value, NO inequality. Take a position on the decision.
- FROZEN FACTS (P4b): never "current market …"/"currently" near a rate/price — dated-snapshot framing.
- QUESTION-COMPLETENESS (P5): demand ONLY what the answer delivers (a BSOP option valuation${kind === 'financial_product_valuation' ? '' : ' + the real-option advice'}). Do NOT ask for an NPV build, IRR, duration or WACC.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

/**
 * What the reveal prompt actually reads off a spec — five fields.
 *
 * Narrowed from `AfmDrillSpec` so the SBL narrative path does not have to fabricate one.
 * `AfmDrillSpec` carries `mode: LoMode`, `section: 'A'|…|'E'` and a rotation-derived skill tag,
 * none of which exist for SBL; synthesising them to satisfy a type would have put invented
 * routing data into a row-adjacent object for no gain. `AfmDrillSpec` satisfies this
 * structurally, so the calculator half passes its spec unchanged.
 */
interface RevealInput {
  lo_code: string;
  topic: string;
  command_verb: string;
  intellectual_level: 2 | 3;
  mode: string;
  /**
   * THE FAILURE THIS DRILL WAS BUILT TO TEACH — the seam this field closes.
   *
   * ⚠️ THIS IS A TEACHING-LEG DEFECT, NOT AN SBL ONE. SBL merely exposed it. The rubric knew its
   * designed failure mode (it is a criterion disqualifier and it shapes the golden BAD), and the
   * teaching call was never told — exactly the seam `SKILL_DEMAND` closed for rubrics on
   * 2026-08-02 and which nobody closed for `full_reveal`. So pass 2 chose a misconception from a
   * list, and the list has a first item.
   *
   * 📐 MEASURED 2026-08-19, SBL batch A: 5 of 5 reveals opened with "undeveloped points" — the
   * first entry in the SBL persona's catalogue — when only ONE drill was designed to teach it.
   * SBL-A2's golden BAD is a textbook description of a cultural model with no reference to the
   * company, and its reveal never once said "generic". Doctrine `P-N2` predicted this in writing
   * and was not consulted.
   *
   * Optional, and absent means the previous behaviour EXACTLY — the author picks from the
   * catalogue. That is what keeps AFM's eleven reveal prompts byte-identical (PIN4) while the
   * mechanism is available to every paper. AFM plans do not declare a mode yet; whether they
   * should is downstream of measuring the published AFM corpus, not assumed here.
   */
  designed_failure?: string;
}

/**
 * F-code → the misconception a reveal must headline when the drill declares that mode.
 *
 * PAPER-AGNOSTIC BY CONSTRUCTION: the F-vocabulary is shared (F1 is the SBL catalogue's M1 and
 * AFM's scenario-restating alike), so this map serves any paper whose plan declares a mode.
 * Phrased as the CANDIDATE'S BELIEF rather than the marker's label — a reveal that names a code
 * teaches nothing, and the tutor broadcasts this sentence to a student who has never seen our
 * failure catalogue.
 */
const FAILURE_MODE_TEACHING: Record<string, string> = {
  F1: 'reproducing the case material — quoting or lightly rewording what the scenario already says, and believing that restating a fact is the same as using it',
  F2: 'undeveloped points — identifying a correct point and stopping there, treating identification as the finished task when it is the first of two steps',
  F4: 'never committing — setting out considerations on both sides, or posing questions to the reader, and leaving the decision to the person who asked for it',
  F5: 'generic theory — explaining a model, or listing advantages, correctly and in the abstract, without ever making the answer about THIS organisation',
  F6: 'superficial figure-commentary — saying what a given figure shows without saying what it means or whether it can be relied on',
  F7: 'answering the adjacent question — responding to the noun in the requirement rather than the act it asked for, most often by reaching for a familiar model the wording merely evoked',
  F9: 'not using the figures supplied — arguing in general terms when the scenario has already given the numbers that would settle the point',
  F10: 'never performing the skill — covering the topic accurately while doing none of the challenging, weighing or deciding the marks are actually for',
  F11: 'no breadth or no close — over-working one point at the expense of the rest, or ending without drawing the answer together',
};

/** The mode a plan's reveal must headline: the evidenced catalogue mode where the drill declares
 *  one (it is the failure the drill exists to teach), otherwise the first deterministic mode. */
function designedFailureFor(plan: NarrativePlan): string | undefined {
  const db = plan.designed_bad;
  if (!db) return undefined;                       // AFM today — unchanged behaviour
  if (db.teaches) return db.teaches;               // explicit beats derived — see `teaches`
  const code = db.evidenced ?? db.flags[0];
  return code ? FAILURE_MODE_TEACHING[code] : undefined;
}

/**
 * THE CATALOGUE IS NOW THE `else` OF `designed_failure`, WHICH IS `buildRevealPromptSbl`'S SHAPE.
 *
 * Before this, the five-name enumeration was UNCONDITIONAL and the override was appended as one
 * extra bullet at the bottom — so a call declaring a mode outside the five handed the model a
 * closed list three times (system block, this parenthetical, and the tool schema) against one
 * line telling it to ignore them. It resolved that the only way it could: by picking the nearest
 * name on the list. Measured — `f6426c06` returned UNDEVELOPED-ASSUMPTION on three consecutive
 * attempts under an explicit instruction not to. SBL's builder never had this defect because its
 * catalogue was always the `else`.
 *
 * ⚠️ THE CONDITIONAL IS WHAT KEEPS PIN4 GREEN, and that is not incidental. No AFM plan declares
 * `designed_bad`, so `designedFailureFor` returns undefined for all eleven and the `else` branch
 * renders — byte-identical to the pre-change string, which is what
 * `test-narrative-paper-pins.ts` PIN4 asserts. Making the enumeration unconditional-plus-append
 * would have moved eleven pinned shas, and that fixture's terms are explicit: a moved pin kills
 * the claim rather than being re-captured. Do not "simplify" this back into one branch.
 */
function buildRevealPromptAfm(spec: RevealInput, question: string, modelAnswer: string): string {
  return `Generate the teaching reveal for this AFM practice drill.

Drill:
- LO: ${spec.lo_code} — ${spec.topic}
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Mode: ${spec.mode}

Question:
${question}

Model answer (mark-scheme level):
${modelAnswer}

Produce:
1. hint — one sentence: a targeted nudge pointing at the specific gap for a candidate who answered incorrectly. Precise to this drill — not generic. Do not give the answer.
2. full_reveal — 3–5 sentences: name the specific AFM misconception a typical candidate brings to this type of question${spec.designed_failure ? '' : ` (fence-sitting / scenario-free / valuation-plumbing / undeveloped-assumption / abandoned-after-calc)`}, then give the diagnosis-led reframe (why that thinking is wrong, the correct mental model). Not a restatement of the model answer.${spec.designed_failure ? `
   ⚠️ THE MISCONCEPTION IS NOT YOURS TO CHOOSE. This drill was built to teach ONE failure and its
   golden BAD commits it deliberately: ${spec.designed_failure}.
   Name THAT failure and no other. Do not headline a different, more general weakness, and do NOT
   substitute the nearest name from a catalogue — a reveal that teaches a failure the rubric does
   not penalise sends the candidate to fix the wrong thing, and is worse than no reveal. You may
   mention other weaknesses later, but the headline is fixed.
   ⚠️ THE VERY FIRST SENTENCE must contain the word "misconception" followed later in that SAME
   sentence by a colon — "The misconception this drill exposes is <short name>: <what the
   candidate wrongly believes>." Keep everything before the colon SHORT: it is extracted verbatim
   and broadcast on its own by the live tutor, so a lead that runs past about thirty words arrives
   as a paragraph where a headline was needed. The placement is load-bearing, not a style note:
   the extractor's pattern does not match across newlines, so a misconception first named in a
   later sentence is not found at all and the tutor silently falls back to the opening line as
   though that were the failure mode.` : ''}

Anchor the reveal to the BOARDROOM BAR: the universal AFM failure is a calculation that never became advice. Where the drill is calculative, teach the own-figure move (carry a wrong figure forward consistently — where the downstream method holds, those marks still score; OFR credit is conditional on correct subsequent use, not automatic).

Quality rules (mandatory):
- State the correct causal mechanism when reframing a misconception — WHY it produces the wrong conclusion, not just the right answer.
- Valuation plumbing: firm flow (FCFF) → WACC; equity flow (FCFE/dividends) → cost of equity; strip debt for equity value. Interest stays OUT of FCFF — the return to debt is captured in the WACC, not deducted from the flow (do NOT say interest must "stay in the flow"). A wrong discount rate is a MISMATCH, not a stated directional effect: do NOT claim it "inflates" or "deflates" value — whether it overstates or understates depends on the numbers.
- Use "may", "is likely to", "suggests" for causal chains; avoid "directly", "depends entirely on" where the scenario shows only plausibility.
- Reference ONLY facts present in the scenario/context — never invent events, savings, or risks; phrase un-evidenced risks conditionally.
- Do not state any computed figure or any inequality between computed figures — the model answer already carries them.
- FROZEN FACTS (P4b): the scenario is a DATED snapshot. NEVER write "current market …" or "currently" next to a rate/yield/spread/curve/price — say "at the valuation date" / "the assumptions as dated" instead.
- Intellectual level: ALWAYS 1/2/3, NEVER AO framing (AO1, AO5).`;
}

function buildRevealPromptSbl(spec: RevealInput, question: string, modelAnswer: string): string {
  return `Generate the teaching reveal for this SBL practice drill.

Drill:
- LO: ${spec.lo_code} — ${spec.topic}
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}

Question:
${question}

Model answer (mark-scheme level):
${modelAnswer}

Produce:
1. hint — one sentence: a targeted nudge pointing at the specific gap for a candidate who answered incorrectly. Precise to this drill — not generic. Do not give the answer.
2. full_reveal — 3–5 sentences. THE VERY FIRST SENTENCE must contain the word "misconception" followed later in that same sentence by a colon. For example: "The misconception this drill exposes is <name>: <what the candidate wrongly believes>." Then give the diagnosis-led reframe (why that thinking is wrong, the correct mental model). Not a restatement of the model answer.
${spec.designed_failure ? `   ⚠️ THE MISCONCEPTION IS NOT YOURS TO CHOOSE. This drill was built to teach ONE failure and its
   golden BAD commits it deliberately: ${spec.designed_failure}.
   The opening sentence must name THAT failure and no other. Do not headline a different, more
   general weakness — a reveal that teaches a failure the rubric does not penalise sends the
   candidate to fix the wrong thing, and is worse than no reveal. You may mention other weaknesses
   later, but the headline is fixed.` : `   Name the specific SBL misconception a typical candidate brings to this type of question
   (undeveloped points / copy-paste / generic theory / the adjacent question / scepticism as questions).`}
   ⚠️ THE FIRST-LINE PLACEMENT IS LOAD-BEARING, NOT A STYLE NOTE. The live tutor extracts this sentence with a pattern whose "." does not match newlines, so a misconception named in a later sentence is not found at all and the tutor silently falls back to the opening line as though it were the failure mode. Naming it anywhere but first fails the P7 gate and the drill is discarded.

Anchor the reveal to THE TWO-MARK RULE, which is the bar this paper is actually marked against: two marks are earned only where a point is identified AND developed — its significance weighed, tied to this organisation by the information given, followed to a consequence, and illustrated from the case material. A point identified and left there earns one. The candidate who writes only single-mark points must find twice as many of them, in the same time, to reach the same total.

Quality rules (mandatory):
- State the correct causal mechanism when reframing a misconception — WHY it loses the marks, not just what the right answer was.
- Where the drill's failure is under-development, teach the four development moves as something the candidate can execute under time pressure, not as a style preference.
- Scepticism is a COMMITTED assessment expressed professionally. Posing questions to the reader earns nothing; so does an accusation the case material does not support — over-reaching reads as poor judgement to the recipient.
- Use "may", "is likely to", "suggests" for causal chains; avoid "directly", "depends entirely on" where the scenario shows only plausibility.
- Reference ONLY facts present in the scenario/context — never invent events, savings, or risks; phrase un-evidenced risks conditionally.
- Do not state any computed figure — this drill credits none.
- The answer is a document for a named reader: never call the case material "the pre-seen".
- Do NOT name a theoretical model or framework as the thing the candidate should have reached for. Teach the ACT the requirement asked for; reaching for a named model is the failure this paper punishes most often.
- Intellectual level: ALWAYS 1/2/3, NEVER AO framing (AO1, AO5).`;
}

const REVEAL_PROMPT_BUILDER: Record<GeneratorPaper, (spec: RevealInput, question: string, modelAnswer: string) => string> = {
  AFM: buildRevealPromptAfm,
  SBL: buildRevealPromptSbl,
};

// ─────────────────────────────────────────────────────────────────────────────
// Claude API — structured output via tool use
// ─────────────────────────────────────────────────────────────────────────────

const SUBMIT_DRILL_TOOL: Anthropic.Tool = {
  name: 'submit_drill',
  description: 'Submit the drafted AFM discursive practice drill',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: 'Drill question starting with the capitalised command verb. Scenario-based, advisory register. Must demand a judgement/recommendation applied to the scenario.' },
      context_text: { type: 'string', description: 'Organisational scenario. 2–4 sentences with specific usable detail (a named figure, a stated board target or director assertion, a decision at stake) the model_answer is forced to reference. A generic textbook answer must NOT fit.' },
      model_answer: { type: 'string', description: 'Top-band answer (140–320 words). Applies each point to a specific scenario fact; challenges at least one stated assumption (scepticism); ends with a clear concluding recommendation to the board (no fence-sitting).' },
      command_verb: { type: 'string', description: 'The verb(s) the question ACTUALLY demands, lowercase (e.g. "assess and recommend"). Match the question text.' },
    },
    required: ['question', 'context_text', 'model_answer', 'command_verb'],
  },
};

const SUBMIT_FCFF_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_fcff_scenario',
  description: 'Submit an FCFF valuation drill scenario — raw inputs only; code computes FCFF, firm value and equity value',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: 'Drill question starting with "Advise". Asks the candidate to value the firm and its equity using FCFF and advise the board.' },
      context_text: { type: 'string', description: 'Scenario narrative + a labelled list of the raw inputs, INCLUDING the vendor\'s indicative equity offer/asking price. NO computed FCFF, firm value, equity value or discount factors. Add 1–2 challengeable textures (e.g. whether reported capex reflects sustainable reinvestment; customer/contract concentration or cyclicality) so the scepticism has something to bite on.' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase (e.g. "advise", "calculate and advise").' },
      currency: { type: 'string', description: 'The ISO 4217 currency code used for the money figures in context_text, e.g. "AUD", "ZAR", "USD". Must match the currency you wrote in the scenario. Code, not symbol.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'The raw figures, matching context_text exactly. Code uses these for ALL arithmetic, the offer-vs-value comparison, and the break-even sensitivities.',
        properties: {
          pbit:                  { type: 'number', description: 'Operating profit before interest and tax, current maintainable base-year, in $m' },
          tax_rate:              { type: 'number', description: 'Corporate tax rate as a decimal fraction, e.g. 0.25' },
          depreciation:          { type: 'number', description: 'Depreciation / non-cash add-back, $m' },
          capex:                 { type: 'number', description: 'Capital expenditure (reinvestment), $m' },
          delta_working_capital: { type: 'number', description: 'Increase in working capital, $m' },
          wacc:                  { type: 'number', description: 'WACC as a decimal fraction, e.g. 0.10 — must exceed growth_rate by ≥ 0.01' },
          growth_rate:           { type: 'number', description: 'Long-term perpetuity growth as a decimal fraction, e.g. 0.03' },
          debt_value:            { type: 'number', description: 'Market value of debt, $m — must be below firm value' },
          offer_price:           { type: 'number', description: 'The vendor\'s indicative EQUITY offer/asking price under test, $m. Set it realistically near a plausible equity value so "is it justified?" is a genuine judgement (roughly within ±40% of PBIT×(1−t)/(WACC−g)), not a trivial yes/no.' },
        },
        required: ['pbit', 'tax_rate', 'depreciation', 'capex', 'delta_working_capital', 'wacc', 'growth_rate', 'debt_value', 'offer_price'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative advice ONLY (3–5 sentences). State NO computed numbers, NO inequality between computed figures (e.g. do not say the offer is above/below the value), and NO break-even values — code owns all of those. Do NOT claim a directional valuation effect from a wrong discount rate (a rate mismatch is the error; the direction depends on the numbers). Reference ONLY facts stated in context_text — never invent events, savings or risks. Any named risk premium/discount (illiquidity, key-person, customer-concentration, country risk) may name ONLY risks the scenario evidences. Cover: which inputs are most fragile and WHY (growth vs the sector; WACC vs a private-company premium; capex vs sustainable reinvestment); what due diligence the board should require; and that interest stays OUT of FCFF (financing is captured by the WACC and the debt strip).' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

// Valuation FAMILY (batch #9). One tool; raw_inputs is a UNION across the four kinds — the prompt
// (buildValuationUserPrompt, keyed off spec.valuation_kind) tells the model which fields to supply,
// and the calculator throws loud on a bad/missing field → retry. Code owns EVERY figure and verdict.
const SUBMIT_VALUATION_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_valuation_scenario',
  description: 'Submit a business-valuation drill (FCFF firm / FCFE equity / dividend capacity / two-method compare) — raw inputs only; code computes every figure, the discount-rate composition, the reconciliation, and every verdict.',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: 'Drill question starting with the command verb (usually "Advise" / "Calculate and advise"). Asks the candidate to do exactly what this kind delivers — no more.' },
      context_text: { type: 'string', description: 'Scenario narrative (2–3 sentences) + a clean labelled list of the raw inputs (money in millions of the local currency; rates in %). NO computed figure (no FCFF, FCFE, firm/equity value, WACC where derived, dividend capacity, or multiple result). Add 1–2 challengeable textures (capex vs sustainable reinvestment; concentration/cyclicality; the durability of the growth or the dividend) so scepticism has something to bite.' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase.' },
      currency: { type: 'string', description: 'ISO 4217 code for the money figures (e.g. "SAR", "THB", "NZD", "PHP", "AUD"). Code, not symbol; must match the scenario.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'Raw figures matching context_text exactly. Supply ONLY the fields this kind needs (the prompt says which). Code does ALL arithmetic + verdicts.',
        properties: {
          // Common FCF build (all kinds except a pure compare use these):
          pbit:                  { type: 'number', description: 'Operating profit before interest and tax, maintainable base-year, in millions.' },
          tax_rate:              { type: 'number', description: 'Corporate tax rate as a DECIMAL fraction, e.g. 0.20. State the rate cleanly as a scenario fact — no tax-regime mechanics.' },
          depreciation:          { type: 'number', description: 'Depreciation / non-cash add-back, millions.' },
          capex:                 { type: 'number', description: 'Capital expenditure (reinvestment), millions.' },
          delta_working_capital: { type: 'number', description: 'Increase in working capital, millions.' },
          debt_value:            { type: 'number', description: 'Market value of debt, millions — below firm value.' },
          offer_price:           { type: 'number', description: 'FCFF/FCFE/COMPARE kinds: the vendor\'s indicative EQUITY offer under test, millions — set near a plausible equity value so the judgement is genuine.' },
          // K1 fcff_enterprise — CAPM cost-of-capital front-end (βe + structure; NO peer ungearing):
          rf:                    { type: 'number', description: 'K1 only: risk-free rate, PERCENT (e.g. 4).' },
          mrp:                   { type: 'number', description: 'K1 only: equity/market risk premium, PERCENT (e.g. 6).' },
          company_equity_beta:   { type: 'number', description: 'K1 only: the firm\'s OWN equity beta (already geared — no peer ungearing in this kind).' },
          company_ve:            { type: 'number', description: 'K1 only: market value of equity (weight), millions.' },
          company_vd:            { type: 'number', description: 'K1 only: market value of debt (weight), millions — normally = debt_value.' },
          kd:                    { type: 'number', description: 'K1/K2/K3: pre-tax cost of debt, PERCENT for K1 (e.g. 6); DECIMAL for K2/K3 (e.g. 0.06).' },
          growth_rate:           { type: 'number', description: 'K1/K4 only: long-term perpetuity growth, DECIMAL (e.g. 0.025) — must be below the discount rate.' },
          // K2 fcfe_equity — supplied Ke; no-growth maintainable perpetuity, constant debt:
          ke:                    { type: 'number', description: 'K2 only: SUPPLIED cost of equity, DECIMAL (e.g. 0.13).' },
          // K3 dividend_capacity:
          net_borrowing:         { type: 'number', description: 'K3 only: net NEW borrowing raised this year, millions (may be 0).' },
          proposed_dividend:     { type: 'number', description: 'K3 only: the board\'s proposed/current TOTAL dividend under test, millions.' },
          shares:                { type: 'number', description: 'K3 only (optional): number of shares (millions) for a per-share capacity figure.' },
          // K4 valuation_compare — DCF (uses the FCFF build + wacc + growth_rate + debt) + a relative multiple:
          wacc:                  { type: 'number', description: 'K4 only: WACC as a DECIMAL (e.g. 0.10) — must exceed growth_rate by ≥ 0.01.' },
          multiple_type:         { type: 'string', enum: ['pe', 'ev_ebitda'], description: 'K4 only: "pe" (an EQUITY multiple on earnings) or "ev_ebitda" (an ENTERPRISE multiple → strip debt).' },
          multiple:              { type: 'number', description: 'K4 only: the applied multiple (e.g. 12 for P/E, 8 for EV/EBITDA).' },
          earnings:              { type: 'number', description: 'K4 pe only: the equity earnings the P/E applies to, millions.' },
          ebitda:                { type: 'number', description: 'K4 ev_ebitda only: the EBITDA the EV/EBITDA applies to, millions.' },
        },
        required: ['pbit', 'tax_rate', 'depreciation', 'capex', 'delta_working_capital', 'debt_value'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative advice ONLY (3–5 sentences). State NO computed number, NO inequality between computed figures, NO discount rate you derived, NO verdict — code owns all of those. Reference ONLY facts stated in context_text; name only risks the scenario evidences. Cover which inputs are most fragile and WHY, the due-diligence the board should require, and (per kind) the flow-to-rate logic in WORDS — a firm flow (FCFF) belongs at WACC and strips debt; an equity flow (FCFE/dividends) belongs at the cost of equity and does not; dividend capacity is CASH not accounting profit; two methods bracket a range, not a point.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

// International FAMILY (batch #10). One tool; raw_inputs is a UNION across the four kinds — the prompt
// (buildInternationalUserPrompt, keyed off spec.international_kind) tells the model which fields to
// supply. Code owns EVERY figure: the forecast FX curve (derived by parity), the conversions, the
// double-tax, the NPV/capacity, and every verdict. The model NEVER states a forecast rate or a number.
const SUBMIT_INTERNATIONAL_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_international_scenario',
  description: 'Submit an international-finance drill (home-currency NPV / exchange-rate sensitivity / restricted remittance / multinational dividend capacity) — raw inputs only; code derives the forecast FX curve by parity, converts, applies the credit-method double-tax, and computes every figure and verdict.',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: 'Drill question starting with the command verb. Asks for exactly what this kind delivers — no more.' },
      context_text: { type: 'string', description: 'Scenario narrative (2–3 sentences) + a clean labelled list of the raw inputs (money in millions; rates as %). NO computed figure and NO forecast exchange rate. Weave 1–2 challengeable textures (political/exchange-control risk; will parity hold; durability of the cash flows) INTO THE PROSE — never a labelled "textures" list.' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase.' },
      home_currency: { type: 'string', description: 'ISO 4217 code of the PARENT currency (e.g. "USD", "GBP", "EUR").' },
      foreign_currency: { type: 'string', description: 'ISO 4217 code of the PROJECT/SUBSIDIARY currency (e.g. "MXN", "INR", "IDR").' },
      raw_inputs: {
        type: 'object' as const,
        description: 'Raw figures matching context_text exactly. Supply ONLY the fields this kind needs (the prompt says which). Code does ALL arithmetic, the parity FX forecast, the double-tax, and every verdict.',
        properties: {
          // Common FX + fiscal:
          base_spot:        { type: 'number', description: 'Base spot exchange rate S₀ — FOREIGN units per 1 HOME unit (e.g. 20 means 20 foreign = 1 home).' },
          home_inflation:   { type: 'number', description: 'Home (parent) inflation rate, DECIMAL (e.g. 0.03) — the PPP differential numerator-denominator input.' },
          foreign_inflation:{ type: 'number', description: 'Foreign (project) inflation rate, DECIMAL (e.g. 0.09). Higher than home → the foreign currency depreciates.' },
          withholding_rate: { type: 'number', description: 'Host withholding tax on remittances, DECIMAL (e.g. 0.10) — a SEPARATE layer on the remitted cash.' },
          home_tax_rate:    { type: 'number', description: 'Parent-country tax rate on foreign TAXABLE PROFIT, DECIMAL (e.g. 0.25). The additional home tax is the DIFFERENTIAL: max(0, home − foreign CORPORATE rate [= raw_inputs.tax_rate]) on the taxable profit, crediting the foreign corporate tax. NOTE: pick home_tax_rate vs tax_rate deliberately per the drill (K1 wants foreign corporate ≥ home so the additional tax is NIL — the teaching point).' },
          wht_creditable:   { type: 'boolean', description: 'Does the bilateral treaty make the withholding tax CREDITABLE against the home liability? true = the differential credits the WHT too (additional = max(0, home liab − foreign corp − WHT)); false = WHT is a separate cost. State it in context_text.' },
          // Foreign FCFF build (K1/K2/K3 project; K4 subsidiary):
          pbit:                  { type: 'number', description: 'Foreign operating profit before interest and tax, maintainable base-year, FOREIGN millions.' },
          tax_rate:              { type: 'number', description: 'FOREIGN corporate tax rate, DECIMAL (e.g. 0.30).' },
          depreciation:          { type: 'number', description: 'Depreciation / non-cash add-back, FOREIGN millions.' },
          capex:                 { type: 'number', description: 'Capital expenditure, FOREIGN millions.' },
          delta_working_capital: { type: 'number', description: 'Increase in working capital, FOREIGN millions.' },
          // K1/K2/K3 project NPV:
          discount_rate:         { type: 'number', description: 'K1/K2/K3: the parent\'s home MONEY cost of capital, DECIMAL (e.g. 0.11).' },
          foreign_growth:        { type: 'number', description: 'K1/K2/K3: real growth of the foreign cash flow, DECIMAL (e.g. 0.04, may be 0).' },
          years:                 { type: 'number', description: 'K1/K2/K3: project life in years (3–5).' },
          initial_outlay_foreign:{ type: 'number', description: 'K1/K2/K3: t0 capital cost in FOREIGN millions (code converts at S₀).' },
          // K2 sensitivity:
          alt_foreign_inflation: { type: 'number', description: 'K2 only: the ALTERNATIVE foreign inflation, DECIMAL — HIGHER than foreign_inflation (a sharper depreciation).' },
          alt_label:             { type: 'string', description: 'K2 only: short phrase for the alternative, e.g. "a sharper devaluation of the peso".' },
          // K3 restricted remittance:
          blocked_fraction:      { type: 'number', description: 'K3 only: share of each year\'s foreign cash BLOCKED from remittance, DECIMAL 0–1.' },
          local_reinvest_rate:   { type: 'number', description: 'K3 only: rate the blocked funds earn locally until release, DECIMAL.' },
          // K4 multinational dividend capacity:
          remittance_year:       { type: 'number', description: 'K4 only: the year the subsidiary remittance is converted (integer ≥ 1) — code derives that year\'s forecast spot by parity.' },
          sub_kd:                { type: 'number', description: 'K4 only: subsidiary pre-tax cost of debt, DECIMAL.' },
          sub_debt:              { type: 'number', description: 'K4 only: subsidiary market value of debt, FOREIGN millions.' },
          sub_net_borrowing:     { type: 'number', description: 'K4 only: subsidiary net new borrowing this year, FOREIGN millions (may be 0).' },
          remit_fraction:        { type: 'number', description: 'K4 only: share of the subsidiary FCFE remitted this year, DECIMAL 0–1.' },
          parent_fcfe:           { type: 'number', description: 'K4 only: the parent\'s OWN free cash flow to equity, HOME millions.' },
          proposed_dividend:     { type: 'number', description: 'K4 only: the group\'s proposed TOTAL dividend under test, HOME millions.' },
        },
        required: ['base_spot', 'home_inflation', 'foreign_inflation', 'withholding_rate', 'home_tax_rate', 'pbit', 'tax_rate', 'depreciation', 'capex', 'delta_working_capital'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative advice ONLY (3–5 sentences). State NO forecast rate, NO converted figure, NO NPV, NO capacity, NO inequality, NO verdict — code owns all of those. Reference ONLY facts in context_text; name only risks the scenario evidences. Cover which assumptions are most fragile (whether parity holds; the political/remittance risk; the durability of the cash flows) and what the board should require. For the restricted-remittance kind, ALSO develop strategies for dealing with blocked cash (transfer pricing, royalties/fees, parallel loans, local reinvestment).' },
    },
    required: ['question', 'context_text', 'command_verb', 'home_currency', 'foreign_currency', 'raw_inputs', 'interpretation_prose'],
  },
};

// RISK & UNCERTAINTY FAMILY (calculator #3). One tool; raw_inputs is a UNION across the four kinds —
// buildRiskUserPrompt (keyed off spec.risk_kind) tells the model which fields to supply. Code owns
// EVERY figure: each scenario NPV, the ENPV, the sensitivity margins, the IRR, the RADR, both NPVs and
// the flip, the durations, the VaR — and every verdict. The model NEVER states a computed number.
// Conventions page-verified (docs/evidence/AFM_RISK_EVIDENCE.md): S1/S2 duration, S3/S4 sensitivity,
// S5/S6 RADR, S6/S7 ENPV, the technical article for VaR.
const SUBMIT_RISK_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_risk_scenario',
  description: 'Submit a risk & uncertainty drill (expected NPV / sensitivity analysis / risk-adjusted discount rate / project duration & value at risk) — raw inputs only; code computes every scenario NPV, the ENPV, the sensitivity margins, the IRR, the RADR (via CAPM ungear/regear), the durations and the VaR, and every verdict.',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: 'Drill question starting with the command verb. Asks for exactly what this kind delivers — no more (P5).' },
      context_text: { type: 'string', description: 'Scenario narrative (2–3 sentences) + a clean labelled list of the raw inputs (money in millions; rates/probabilities as stated). NO computed figure and NO verdict. Weave 1–2 challengeable textures (probability provenance; σ estimation quality; the normality assumption; EV vs a one-shot decision) INTO THE PROSE — never a labelled "textures" list.' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase (e.g. "calculate and advise", "assess").' },
      currency: { type: 'string', description: 'ISO 4217 currency code used in context_text, e.g. "GBP", "EUR". Code, not symbol.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'Raw figures matching context_text exactly. Supply ONLY the fields this kind needs (the prompt says which). Code does ALL arithmetic and every verdict. Money in millions; rates DECIMAL (0.10 = 10%); probabilities DECIMAL summing to 1.',
        properties: {
          discount_rate: { type: 'number', description: 'The discount / risk-adjusted rate applied, DECIMAL (e.g. 0.10). Common to all kinds.' },
          // K1 enpv:
          outlay: { type: 'number', description: 'K1/K2/K3: the initial outlay at t0, millions (positive).' },
          scenarios: { type: 'array', description: 'K1 enpv ONLY: 2–4 mutually-exclusive economic states. Probabilities MUST sum to 1. Design so at least one state gives a NEGATIVE NPV (so P(negative NPV) is a live risk measure) — the ENPV can be positive or negative; make the decision DECISIVE, not razor-thin.',
            items: { type: 'object' as const, properties: {
              label: { type: 'string', description: 'e.g. "Optimistic", "Most likely", "Pessimistic".' },
              probability: { type: 'number', description: 'DECIMAL in (0,1]; all scenario probabilities sum to 1.' },
              cash_flows: { type: 'array', items: { type: 'number' }, description: 'That state\'s net post-tax cash flow per year (year 1..N), millions.' },
            }, required: ['label', 'probability', 'cash_flows'] } },
          // K2 sensitivity:
          net_cash_flows: { type: 'array', items: { type: 'number' }, description: 'K2 sensitivity ONLY: the project\'s TOTAL net post-tax cash flow per year (year 1..N), millions — the base NPV and the IRR come from this. Make the base NPV clearly POSITIVE so the margins are meaningful.' },
          affected_cash_flows: { type: 'array', items: { type: 'number' }, description: 'K2 sensitivity ONLY: the FLEXED variable\'s OWN post-tax cash-flow stream per year (e.g. the contribution or the revenue), millions — this is the PV BASE of the variable sensitivity [S3, S4]. It is a SUBSET/component of the net cash flows, not the whole.' },
          variable_label: { type: 'string', description: 'K2 sensitivity ONLY: the variable being flexed, e.g. "the selling price", "contribution", "sales volume".' },
          // K3 radr_compare:
          project_cash_flows: { type: 'array', items: { type: 'number' }, description: 'K3 RADR ONLY: the project\'s net post-tax cash flow per year, millions. Discounted at BOTH the company rate and the project RADR; size so the decision FLIPS between them.' },
          company_rate: { type: 'number', description: 'K3 RADR ONLY: the company\'s OWN cost of capital, DECIMAL — the WRONG hurdle for a project in a different risk class.' },
          rf: { type: 'number', description: 'K3 RADR ONLY: risk-free rate, DECIMAL.' },
          mrp: { type: 'number', description: 'K3 RADR ONLY: equity/market risk premium, DECIMAL.' },
          tax_rate: { type: 'number', description: 'K3 RADR ONLY: corporate tax rate, DECIMAL (needed to ungear/regear).' },
          kd: { type: 'number', description: 'K3 RADR ONLY: pre-tax cost of debt, DECIMAL.' },
          peer_equity_beta: { type: 'number', description: 'K3 RADR ONLY: the proxy (different-industry) company\'s EQUITY beta.' },
          peer_ve: { type: 'number', description: 'K3 RADR ONLY: proxy equity market value (for ungearing).' },
          peer_vd: { type: 'number', description: 'K3 RADR ONLY: proxy debt market value (for ungearing).' },
          own_ve: { type: 'number', description: 'K3 RADR ONLY: the appraising firm\'s equity market value (to regear into).' },
          own_vd: { type: 'number', description: 'K3 RADR ONLY: the appraising firm\'s debt market value (to regear into).' },
          // K4 risk_measures:
          project_a: { type: 'object' as const, description: 'K4 ONLY: the FIRST project for the comparative duration.', properties: { label: { type: 'string' }, cash_flows: { type: 'array', items: { type: 'number' }, description: 'net cash flow per year, millions' } }, required: ['label', 'cash_flows'] },
          project_b: { type: 'object' as const, description: 'K4 ONLY: the SECOND project. Make one clearly FRONT-loaded and one BACK-loaded so the durations differ materially (the comparative point).', properties: { label: { type: 'string' }, cash_flows: { type: 'array', items: { type: 'number' }, description: 'net cash flow per year, millions' } }, required: ['label', 'cash_flows'] },
          var_sigma_annual: { type: 'number', description: 'K4 ONLY: the annual standard deviation (σ) of project value, MILLIONS (money terms) — STATED, never derived.' },
          var_confidence: { type: 'number', description: 'K4 ONLY: VaR confidence level, 0.95 or 0.99.' },
          var_tail: { type: 'string', description: 'K4 ONLY: "one" — a downside VaR is one-tail (z = 1.65 @95% / 2.33 @99%).' },
          var_horizon_years: { type: 'number', description: 'K4 ONLY: the VaR horizon N in years (σ scales by √N).' },
        },
        required: ['discount_rate'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative advice ONLY (3–5 sentences). State NO computed number, NO inequality between computed figures, NO verdict — code owns all of those. Reference ONLY facts in context_text; name only risks the scenario evidences. Cover which assumptions are most fragile and WHY (probability provenance; σ / normality; the durability of the estimates). For the ENPV kind, MAKE the one-shot point: ENPV is a repeated-game mean, so for a single project the individual state NPVs and the probability of a negative NPV matter alongside the mean [S7]. For sensitivity, distinguish a small margin (fragile) from a large one. For RADR, note that using the company rate for a different-risk project misprices it.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

// FX HEDGING FAMILY (calculator #11, E2b). One tool; raw_inputs is a UNION across the four kinds —
// buildFxHedgeUserPrompt (keyed off spec.fxhedge_kind) tells the model which fields to supply.
// quote_direction / direction / residual_policy / premium_currency are CODE-DECIDED (spec.fx_*
// fields, never model-chosen — same doctrine as international.ts hardcoding basis='ppp'); the
// prompt tells the model which convention to narrate, it never picks one. Code computes every
// figure: the forward/MMH outcomes, the whole-contract count, the basis decay + lock-in rate, the
// premium, the swap split, and the all-methods comparison + recommendation verdict.
const SUBMIT_FXHEDGE_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_fxhedge_scenario',
  description: 'Submit an FX-hedging drill (forward vs money-market hedge / currency futures / currency options / currency swap) — raw inputs only; code computes the guaranteed outcome under each method, the whole-contract count, the basis decay and lock-in rate, the premium, the swap split, and the all-methods comparison + recommendation.',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: { type: 'string', description: 'Drill question starting with the command verb. Asks for exactly what this kind delivers, incl. a recommendation where the kind is a comparison — no more.' },
      context_text: { type: 'string', description: 'Scenario narrative (2–3 sentences) + a clean labelled list of the raw inputs (money in millions; rates as %). NO computed figure, NO guaranteed rate/outcome, NO contract count. MANDATORY: include the LITERAL placeholder token {{QUOTE_SENTENCE}} on its own, at the exact point where you would state the quote direction — DO NOT write the quote-direction sentence yourself; code replaces the placeholder with the canonical sentence afterwards (this is a structural fix: a model-authored quote sentence previously drifted from the actual quote_direction parameter). Every rate you supply (spot, forward, futures, strike, swap) MUST be REALISTIC for the actual real-world magnitude of the stated currency pair (e.g. LKR/JPY is around 2, not under 1) — an unrealistic rate is a P8-class defect. Weave 1–2 challengeable textures (basis risk; counterparty/margin risk; an overconfident claim about which hedge is best) INTO THE PROSE — never a labelled "textures" list.' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase.' },
      currency_home: { type: 'string', description: 'ISO 4217 code (or a short symbol) of the HOME currency, as given in the prompt.' },
      currency_foreign: { type: 'string', description: 'ISO 4217 code (or a short symbol) of the FOREIGN currency, as given in the prompt.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'Raw figures matching context_text exactly. Supply ONLY the fields this kind needs (the prompt says which). Code does ALL arithmetic and every verdict.',
        properties: {
          exposure: { type: 'number', description: 'The exposure amount, millions (positive), DENOMINATED IN currency_foreign — NEVER currency_home. In context_text you MUST label this figure with the currency_foreign code (e.g. "PEN 8.5 million"), never the currency_home code — labelling the exposure in the wrong currency is the single most common authoring error in this family.' },
          months: { type: 'number', description: 'K1 (forward+MMH) ONLY: months to the transaction/settlement date.' },
          forward_rate: { type: 'number', description: 'K1 ONLY: the forward rate for the period, STATED (never derived by the student in the sourced questions).' },
          spot: { type: 'number', description: 'K1 and K3: today\'s spot rate, in the DECLARED quote direction. K3 uses this to convert the option premium to the home currency when premium_currency is foreign (never the strike — the premium is paid today, not at exercise) — supply it even when premium_currency is home (the field is always required).' },
          rate_foreign_borrow: { type: 'number', description: 'K1 ONLY: annual foreign-currency borrowing rate, % (e.g. 8 for 8%).' },
          rate_foreign_deposit: { type: 'number', description: 'K1 ONLY: annual foreign-currency deposit rate, %.' },
          rate_home_borrow: { type: 'number', description: 'K1 ONLY: annual home-currency borrowing rate, %.' },
          rate_home_deposit: { type: 'number', description: 'K1 ONLY: annual home-currency deposit rate, %.' },
          contract_size: { type: 'number', description: 'K2/K3 ONLY: foreign-currency units per futures/option contract, millions.' },
          spot0: { type: 'number', description: 'K2 ONLY: spot rate today (the trade date), in the declared quote direction.' },
          futures0: { type: 'number', description: 'K2 ONLY: futures price today, same quote direction as spot0.' },
          months_to_expiry: { type: 'number', description: 'K2 ONLY: months from today to the futures\' expiry.' },
          months_to_transaction: { type: 'number', description: 'K2/K3 ONLY: months from today to the transaction (close-out/settlement) date, ≤ months_to_expiry for K2.' },
          topup_forward_rate: { type: 'number', description: 'K2 ONLY, when told the residual is topped up on the forward: the forward rate for the residual leg.' },
          strike: { type: 'number', description: 'K3 ONLY: the option strike, in the declared quote direction.' },
          premium_pct: { type: 'number', description: 'K3 ONLY: the option premium as a DECIMAL FRACTION PER UNIT of contract size, ALL-IN for the option\'s whole life (e.g. 0.0048 — state this in context_text as "premium X per unit", never as a bare percentage like "0.48%") — NOT an annualised rate; do NOT suggest or imply a time-proration, code applies it as a flat per-unit charge.' },
          swap_fraction: { type: 'number', description: 'K4 ONLY: share of the exposure covered by the swap, DECIMAL (0,1]. Use < 1 (Mahoney Co: "the swap rate would only account for a proportion of the cash") unless told to use 1.' },
          swap_rate: { type: 'number', description: 'K4 ONLY: the currency swap rate, in the declared quote direction.' },
          residual_forward_rate: { type: 'number', description: 'K4 ONLY, when swap_fraction < 1: the forward rate for the un-swapped residual.' },
        },
        required: ['exposure'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative advice ONLY (3–5 sentences). State NO computed outcome, NO contract count, NO premium figure, NO recommendation — code owns all of those. Reference ONLY facts in context_text; name only risks the scenario evidences. Cover which assumptions are most fragile (whether the rates/quotes hold; basis risk for K2; counterparty/OTC risk; margin calls) and what the board should require before committing to the hedge.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency_home', 'currency_foreign', 'raw_inputs', 'interpretation_prose'],
  },
};

const SUBMIT_NPV_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_npv_scenario',
  description: 'Submit an NPV investment-appraisal drill — raw inputs only; code computes the WDA schedule, tax, net cash flows, discounting, NPV, the accept/reject decision, and any ranking/sensitivity',
  input_schema: {
    type: 'object' as const,
    properties: {
      question:     { type: 'string', description: 'Drill question. Asks the candidate to appraise the project by NPV and advise the board whether to proceed.' },
      context_text: { type: 'string', description: 'Scenario narrative + a labelled list of the raw inputs. NO computed NPV, tax, present values, WDA amounts, PI or sensitivity — code computes all of them. Add 1–2 challengeable textures (e.g. optimism in the cash-flow forecast, the reliability of the inflation or discount-rate estimate).' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase (e.g. "advise", "calculate and advise").' },
      currency:     { type: 'string', description: 'ISO 4217 currency code used in context_text, e.g. "AUD", "ZAR". Code, not symbol.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'The raw figures, matching context_text exactly. Code uses these for ALL arithmetic.',
        properties: {
          initial_outlay:    { type: 'number', description: 'Capital cost at time 0, $m (positive)' },
          real_operating_cf: { type: 'array', items: { type: 'number' }, description: 'Pre-tax operating cash flows in REAL (today\'s money) terms, one per year, 3–5 entries', minItems: 3, maxItems: 5 },
          inflation_rate:    { type: 'number', description: 'Annual inflation applied to operating cash flows, decimal e.g. 0.03' },
          tax_rate:          { type: 'number', description: 'Corporate tax rate, decimal e.g. 0.25' },
          tax_lag:           { type: 'number', description: 'Years tax is paid in arrears: 0 (same year) or 1' },
          capital_for_wda:   { type: 'number', description: 'Capital qualifying for tax-allowable depreciation, $m' },
          wda_rate:          { type: 'number', description: 'Reducing-balance tax-depreciation rate, decimal e.g. 0.25' },
          scrap_value:       { type: 'number', description: 'Disposal/scrap proceeds at the end of the final year, $m' },
          discount_rate:     { type: 'number', description: 'Risk-adjusted discount rate, decimal e.g. 0.10 — must exceed inflation' },
          competitor_projects: { type: 'array', description: 'RATIONING drills only: other divisible projects the board is weighing, each with a GIVEN profitability index. Omit for non-rationing drills.', items: { type: 'object' as const, properties: { name: { type: 'string' }, pi: { type: 'number' }, outlay: { type: 'number' } }, required: ['name', 'pi', 'outlay'] } },
          capital_limit:     { type: 'number', description: 'RATIONING drills only: the total capital available this period, $m.' },
          sensitivity_label: { type: 'string', description: 'SENSITIVITY drills only: short label for the variable being sensitised, e.g. "the annual sales volume". Optional.' },
        },
        required: ['initial_outlay', 'real_operating_cf', 'inflation_rate', 'tax_rate', 'tax_lag', 'capital_for_wda', 'wda_rate', 'scrap_value', 'discount_rate'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative advice ONLY (3–5 sentences). State NO computed numbers, NO inequality between computed figures (e.g. do not say the NPV is positive/negative or rank the projects), and NO sensitivity/PI values — code owns all of those. Reference ONLY facts in context_text; any named risk may name only risks the scenario evidences. Cover: which inputs are most fragile and why (the cash-flow forecast, the inflation or discount-rate estimate, the residual/scrap assumption); and the due diligence the board should require.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

const SUBMIT_APV_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_apv_scenario',
  description: 'Submit an APV investment-appraisal drill — raw inputs only; code computes the base-case NPV at Keu, the debt tax shield, any subsidised-loan benefit, issue costs, the APV, and the accept/reject (or financing-choice) verdict',
  input_schema: {
    type: 'object' as const,
    properties: {
      question:     { type: 'string', description: 'Drill question. Asks the candidate to appraise the project using APV and advise the board (whether to proceed, or — for the compare variant — which financing package to use).' },
      context_text: { type: 'string', description: 'Scenario narrative + a labelled list of the raw inputs. NO computed base-case NPV, tax shield, subsidy benefit, issue costs, APV, present values or discount factors — code computes all of them. State the ungeared (all-equity) cost of equity Keu as a GIVEN scenario fact. Add 1–2 challengeable textures (e.g. is Keu the right ungeared rate for this project; will the debt capacity be sustained; is the subsidy conditional).' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase (e.g. "advise", "calculate and recommend").' },
      currency:     { type: 'string', description: 'ISO 4217 currency code used in context_text, e.g. "MYR", "BRL", "PLN", "KRW". Code, not symbol.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'The raw figures, matching context_text exactly. Code uses these for ALL arithmetic — the base case at Keu, the financing side-effects, and the APV.',
        properties: {
          initial_outlay:    { type: 'number', description: 'Capital cost at time 0, $m (positive)' },
          real_operating_cf: { type: 'array', items: { type: 'number' }, description: 'Pre-tax operating cash flows in REAL terms, one per year, 3–5 entries', minItems: 3, maxItems: 5 },
          inflation_rate:    { type: 'number', description: 'Annual inflation on operating cash flows, decimal e.g. 0.03' },
          tax_rate:          { type: 'number', description: 'Corporate tax rate, decimal e.g. 0.25' },
          tax_lag:           { type: 'number', description: 'Years tax (and the interest tax shield) are paid in arrears: 0 or 1' },
          capital_for_wda:   { type: 'number', description: 'Capital qualifying for tax-allowable depreciation, $m' },
          wda_rate:          { type: 'number', description: 'Reducing-balance tax-depreciation rate, decimal e.g. 0.25' },
          scrap_value:       { type: 'number', description: 'Disposal/scrap proceeds at the end of the final year, $m' },
          keu:               { type: 'number', description: 'UNGEARED (all-equity) cost of equity — the base-case discount rate, decimal e.g. 0.12. STATED in the scenario; do NOT ask the candidate to derive it by ungearing a beta (that is a separate cost-of-capital drill).' },
          debt_amount:       { type: 'number', description: 'Debt raised to help fund the project, $m' },
          kd:                { type: 'number', description: 'Pre-tax MARKET cost of debt, decimal e.g. 0.06 — the tax-shield (and subsidy) discount basis. For the subsidised variant this is the market rate the subsidised loan is compared against.' },
          debt_term:         { type: 'number', description: 'Years the debt (and its tax shield) is outstanding. Optional — defaults to the project life. If context_text states a loan term, this MUST equal it AND the number of operating-cash-flow years (text and maths must agree).' },
          subsidised_rate:   { type: 'number', description: 'SUBSIDISED variant only: the below-market coupon actually paid on the loan, decimal (must be < kd). Omit for other variants.' },
          issue_cost_rate:   { type: 'number', description: 'STANDARD / COMPARE (debt) variants: debt issue/transaction cost as a fraction of the GROSS debt principal (debt_amount), decimal e.g. 0.03 → cost = debt_amount × f. Omit for the subsidised variant.' },
          equity_issue_cost_rate: { type: 'number', description: 'COMPARE variant only: issue cost fraction on the rights issue, decimal e.g. 0.05.' },
          equity_amount:     { type: 'number', description: 'COMPARE variant only: NET equity raised under the equity (rights) package, $m.' },
          existing_debt:     { type: 'number', description: 'COMPARE variant only: current market value of debt, $m (for the gearing overlay).' },
          existing_equity:   { type: 'number', description: 'COMPARE variant only: current market value of equity, $m (for the gearing overlay).' },
        },
        required: ['initial_outlay', 'real_operating_cf', 'inflation_rate', 'tax_rate', 'tax_lag', 'capital_for_wda', 'wda_rate', 'scrap_value', 'keu', 'debt_amount', 'kd'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative advice ONLY (3–5 sentences). State NO computed numbers, NO inequality between computed figures (e.g. do not say the APV is positive/negative or which package wins), NO present values and NO discount factors — code owns all of those. Reference ONLY facts in context_text; any named risk may name only risks the scenario evidences. Do NOT open with a verdict frame or restate accept/reject — code injects the decision-keyed opener. Cover: whether the stated Keu is the right ungeared rate for THIS project; whether the debt capacity / subsidy will be sustained over the term; and (compare variant) the qualitative trade-off between higher gearing and interest cover vs shareholder dilution.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

const SUBMIT_CAPM_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_capm_scenario',
  description: 'Submit a CAPM / cost-of-capital drill — raw inputs only; code ungears/regears betas (MM with-tax), prices Ke via CAPM, computes market-value-weighted WACC, and owns every rate comparison and the wrong-hurdle accept/reject flip',
  input_schema: {
    type: 'object' as const,
    properties: {
      question:     { type: 'string', description: 'Drill question. Asks the candidate to compute the relevant cost of capital and evaluate/advise.' },
      context_text: { type: 'string', description: 'Scenario narrative + a labelled list of the raw inputs. State the corporate tax rate EXPLICITLY (needed to ungear). NO computed betas/Ke/WACC — code computes them all. Give market values of equity and debt for each entity in the local currency; give betas and rates as usual. Add a challengeable texture (e.g. is the peer group truly comparable; is the single-period beta stable).' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase (e.g. "calculate and evaluate", "calculate and advise").' },
      currency:     { type: 'string', description: 'ISO 4217 currency code for the market-value figures in context_text, e.g. "INR", "MXN", "AED", "TWD". Code, not symbol.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'The raw figures, matching context_text exactly. Rates as DECIMAL fractions (0.04 for 4%). Betas as decimals (~1.0). Market values Ve/Vd in millions of the local currency.',
        properties: {
          rf:        { type: 'number', description: 'Risk-free rate, decimal e.g. 0.04' },
          mrp:       { type: 'number', description: 'Market / equity risk premium, decimal e.g. 0.06' },
          tax_rate:  { type: 'number', description: 'Corporate tax rate, decimal e.g. 0.25 — STATE IT in context_text too (needed to ungear)' },
          kd:        { type: 'number', description: 'Pre-tax cost of debt, decimal — for the WACC kinds (org_wacc, project_specific, wrong_hurdle)' },
          company_equity_beta: { type: 'number', description: 'The COMPANY\'s own equity beta (org_wacc, wrong_hurdle)' },
          company_ve: { type: 'number', description: 'Company market value of equity (org_wacc, wrong_hurdle)' },
          company_vd: { type: 'number', description: 'Company market value of debt (org_wacc, wrong_hurdle)' },
          peer_equity_beta: { type: 'number', description: 'A PEER / proxy company\'s equity beta to ungear (project_specific, keu_for_apv, wrong_hurdle)' },
          peer_ve:   { type: 'number', description: 'Peer market value of equity' },
          peer_vd:   { type: 'number', description: 'Peer market value of debt' },
          own_ve:    { type: 'number', description: 'The appraising firm\'s OWN market value of equity to regear into (project_specific)' },
          own_vd:    { type: 'number', description: 'The appraising firm\'s OWN market value of debt (project_specific)' },
          project_return: { type: 'number', description: 'wrong_hurdle only: the project\'s expected return / IRR as a PERCENTAGE (e.g. 9.5 for 9.5%), tested against both hurdles.' },
        },
        required: ['rf', 'mrp', 'tax_rate'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative evaluation ONLY (3–5 sentences). State NO computed beta, NO rate, NO inequality between rates — code owns all of those. Reference ONLY facts in context_text. Cover: whether the peer group is genuinely comparable (same business risk); why business risk vs financial risk matters here; and the appropriateness of the rate for establishing project/organisational value (the B3d/B3e discussion). Do NOT restate the accept/reject decision — code injects it.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

const BOND_PROPS = {
  type: 'object' as const,
  properties: {
    face_value:  { type: 'number', description: 'Redemption / par value (e.g. 100 per unit, or the facility principal in millions)' },
    coupon_rate: { type: 'number', description: 'Annual coupon rate as a DECIMAL (0.06 for 6%); 0 for a zero-coupon / deep-discount instrument' },
    maturity:    { type: 'number', description: 'Whole years to redemption' },
    ytm:         { type: 'number', description: 'Flat yield to maturity as a DECIMAL (0.08 for 8%). State it in context_text.' },
    label:       { type: 'string', description: 'Short label used in the worked answer, e.g. "the 8-year bond"' },
  },
  required: ['face_value', 'coupon_rate', 'maturity', 'ytm'],
};

const SUBMIT_DURATION_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_duration_scenario',
  description: 'Submit a bond-duration drill — raw inputs only; code builds the PV-weighted cash-flow table, Macaulay and modified duration, the price sensitivity, and owns the exposure ranking / zero-vs-coupon comparison',
  input_schema: {
    type: 'object' as const,
    properties: {
      question:     { type: 'string', description: 'Drill question. Asks the candidate to compute the relevant duration(s) and assess/rank the interest-rate exposure.' },
      context_text: { type: 'string', description: 'Scenario narrative + a labelled list of the raw inputs. State each bond\'s flat YTM EXPLICITLY. NO computed price/duration/sensitivity — code computes them all. Add a challengeable texture (e.g. the yield is a single snapshot; a large parallel shift is assumed).' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase (e.g. "calculate and assess", "calculate and rank").' },
      currency:     { type: 'string', description: 'ISO 4217 currency code for the money figures, e.g. "CLP", "TRY", "IDR", "EUR". Code, not symbol.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'The raw figures, matching context_text exactly. Rates/coupons as DECIMAL fractions.',
        properties: {
          bond:        BOND_PROPS,
          bond_b:      { ...BOND_PROPS, description: 'COMPARE kind only: the second bond/facility to rank against the first.' },
          coupon_ref:  { ...BOND_PROPS, description: 'ZERO_COUPON kind only: an equivalent-maturity COUPON bond, for the duration<maturity contrast.' },
          yield_shift: { type: 'number', description: 'STANDARD / LIMITATIONS kinds: the assumed parallel yield shift as a DECIMAL (e.g. 0.01 = +100 bp; the limitations kind uses a LARGE shift like 0.03).' },
        },
        required: ['bond'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative evaluation ONLY (3–5 sentences). State NO duration, NO price, NO rate, NO inequality between durations — code owns all of those. Reference ONLY facts in context_text. For the limitations kind, develop the CONVEXITY point (why the linear duration estimate over/understates the true price move for a large shift). Do NOT restate the exposure ranking — code injects it.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

const CREDIT_BOND_PROPS = {
  type: 'object' as const,
  description: 'A corporate bond: face_value (millions), coupon_rate (PERCENT number, e.g. 3.5), maturity (whole years).',
  properties: {
    face_value:  { type: 'number', description: 'Redemption/par value in MILLIONS (e.g. 100).' },
    coupon_rate: { type: 'number', description: 'Annual coupon rate as a PERCENT number (3.5 = 3.5%).' },
    maturity:    { type: 'number', description: 'Whole years to redemption.' },
    label:       { type: 'string', description: 'Optional short label for the instrument.' },
  },
  required: ['face_value', 'coupon_rate', 'maturity'],
};

const SUBMIT_CREDIT_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_credit_scenario',
  description: 'Submit a credit-risk drill — raw inputs only; code builds the cost of debt / spread / curve-priced fair value and owns every figure and the over/under-valued verdict. Issuer-framed.',
  input_schema: {
    type: 'object' as const,
    properties: {
      question:     { type: 'string', description: 'Drill question. Begins with the command verb; asks for the relevant figure(s) and an issuer-framed assessment.' },
      context_text: { type: 'string', description: 'Scenario narrative + a labelled list of ALL raw inputs. STATE the full government spot curve and the spread table EXPLICITLY. NO computed rate/spread/price/verdict — code computes them all. Add a challengeable texture (rating is point-in-time; the curve/table is a dated snapshot).' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase (e.g. "calculate and assess", "estimate and advise").' },
      currency:     { type: 'string', description: 'ISO 4217 currency code, e.g. "JPY", "SEK", "SGD", "COP". Code, not symbol.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'The raw figures, matching context_text exactly. RATES as PERCENT numbers, SPREADS as basis points, MONEY in millions, weights/tax as decimals.',
        properties: {
          spread_table: { type: 'array', description: 'Rating→spread map (MONOTONIC: weaker rating → wider spread; ONE agency scale). Include the issuer\'s rating and ≥1 neighbour.', items: { type: 'object', properties: { rating: { type: 'string', description: 'A real S&P/Fitch or Moody\'s symbol.' }, spread_bps: { type: 'number', description: 'Credit spread in basis points.' } }, required: ['rating', 'spread_bps'] } },
          // kind 1
          base_rating:    { type: 'string', description: 'downgrade_impact: the current rating.' },
          new_rating:     { type: 'string', description: 'downgrade_impact: the weaker post-downgrade rating (wider spread).' },
          benchmark_rate: { type: 'number', description: 'downgrade_impact: risk-free benchmark for the maturity, PERCENT.' },
          debt_principal: { type: 'number', description: 'downgrade_impact: debt principal, MILLIONS.' },
          existing_coupon_rate: { type: 'number', description: 'downgrade_impact OPTIONAL: the existing bond\'s FIXED coupon, PERCENT — insulated from the downgrade; the calculator frames the Δ as a REFINANCING cost, not a change to the existing coupon.' },
          equity_weight:  { type: 'number', description: 'downgrade_impact OPTIONAL: equity weight (decimal). Give all of equity_weight/debt_weight/ke/tax_rate for an exact ΔWACC, or none.' },
          debt_weight:    { type: 'number', description: 'downgrade_impact OPTIONAL: debt weight (decimal).' },
          ke:             { type: 'number', description: 'downgrade_impact OPTIONAL: cost of equity, PERCENT.' },
          tax_rate:       { type: 'number', description: 'downgrade_impact OPTIONAL: tax rate, decimal in [0,1).' },
          // kinds 2/3/4
          bond:           CREDIT_BOND_PROPS,
          rating:         { type: 'string', description: 'kinds 3/4: the issuer\'s rating (must be in spread_table).' },
          market_price:   { type: 'number', description: 'spread_estimation (target) / debt_valuation (comparator): quoted market price, MILLIONS.' },
          govt_yield:     { type: 'number', description: 'spread_estimation: matched-maturity government yield, PERCENT.' },
          r_lo:           { type: 'number', description: 'spread_estimation / kd_term_structure: low trial yield, PERCENT (bracket below the answer).' },
          r_hi:           { type: 'number', description: 'spread_estimation / kd_term_structure: high trial yield, PERCENT (bracket above).' },
          govt_spot:      { type: 'array', description: 'kinds 3/4: government spot curve by maturity year, PERCENT each, length = maturity (rates DIFFER by year).', items: { type: 'number' } },
        },
      },
      interpretation_prose: { type: 'string', description: 'Qualitative evaluation ONLY (3–5 sentences), issuer-framed, takes a position (anti-fence-sitting). State NO rate, NO spread, NO price, NO yield, NO verdict — code owns all of those. Reference ONLY facts in context_text.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

const SUBMIT_BSOP_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_bsop_scenario',
  description: 'Submit a BSOP / real-options drill — raw inputs (the five drivers) only; code builds d1/d2/N(d), the call/put value, the expanded value and the decision. The exam supplies the calculator; the marked skill is the five-driver identification + mapping + interpretation.',
  input_schema: {
    type: 'object' as const,
    properties: {
      question:     { type: 'string', description: 'Drill question. Begins with the command verb; asks to value the option using BSOP + advise.' },
      context_text: { type: 'string', description: 'Scenario narrative + a labelled list of the FIVE DRIVERS (and the base-case NPV for a real option). NO computed d/N/value — code computes them. Dated-snapshot framing.' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase (e.g. "calculate and advise", "value and evaluate").' },
      currency:     { type: 'string', description: 'ISO 4217 currency code, e.g. "CHF", "NOK", "DKK", "HKD". Code, not symbol.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'The five drivers + (real options) the base NPV. Money in MILLIONS; volatility & risk-free are PERCENT numbers; time in years.',
        properties: {
          underlying:       { type: 'number', description: 'Pₐ — value of the underlying asset (MILLIONS): traded shares (financial), or PV of the project/asset cash flows (real option).' },
          exercise:         { type: 'number', description: 'Pₑ — exercise price (MILLIONS): the strike (financial), investment cost (delay/expand), or salvage/resale value (withdraw).' },
          volatility:       { type: 'number', description: 'Volatility s as a PERCENT number (e.g. 30 = 30%).' },
          risk_free:        { type: 'number', description: 'Risk-free rate r as a PERCENT number (e.g. 2.5 = 2.5%).' },
          time:             { type: 'number', description: 'Time to expiry t, in years.' },
          base_npv:         { type: 'number', description: 'Real options only: the project NPV WITHOUT the option (MILLIONS; make it modestly negative so the option is decision-relevant).' },
          underlying_label: { type: 'string', description: 'Real options: what Pₐ maps to in the scenario (e.g. "the PV of the field\'s production cash flows").' },
          exercise_label:   { type: 'string', description: 'Real options: what Pₑ maps to (e.g. "the development capex", "the vessel\'s resale value").' },
        },
        required: ['underlying', 'exercise', 'volatility', 'risk_free', 'time'],
      },
      interpretation_prose: { type: 'string', description: 'Qualitative ONLY (3–5 sentences): the five-driver interpretation (+ the archetype classification for a real option) + BSOP limitations with VOLATILITY-ESTIMATION the loudest. State NO d-value, NO probability, NO option value, NO inequality — code owns all of those. Take a position on the decision.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

/**
 * ⚠️ THIS TOOL IS SHARED BY BOTH PAPERS AND WAS WRITTEN FOR ONE — an EIGHTH paper-coupled site,
 * missed by the seven-site sweep because nothing about it is typed or named per paper.
 * `draftReveal` passes it on every call regardless of `paper`, so every SBL reveal was handed a
 * schema instructing it to name "the specific AFM misconception" and then enumerating AFM's five
 * — including valuation plumbing — on a leadership question. The `hint` gloss carried the same
 * leak (mismatched discount rate, un-stripped debt).
 *
 * Both fields are now PAPER-NEUTRAL, and the enumeration is gone rather than duplicated per
 * paper: the catalogue belongs in ONE place (each paper's persona plus its reveal prompt, where
 * `designed_failure` can override it), and a third copy in a tool schema is a copy that cannot
 * be overridden and will drift. Unpinned — no fixture reads this object — so the change is
 * invisible to the gate suite and reaches every future reveal call on both papers.
 */
const SUBMIT_REVEAL_TOOL: Anthropic.Tool = {
  name: 'submit_reveal',
  description: 'Submit the Ezra teaching reveal for a completed practice drill',
  input_schema: {
    type: 'object' as const,
    properties: {
      hint: { type: 'string', description: 'One sentence: targeted nudge for a wrong first attempt — points at the specific gap this drill exposes, without giving the answer. Precise to this drill, not generic.' },
      full_reveal: { type: 'string', description: '3–5 sentences: names the specific misconception this drill was built to teach, then the diagnosis-led reframe. Not a restated model answer.' },
    },
    required: ['hint', 'full_reveal'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Unified drill output type
// ─────────────────────────────────────────────────────────────────────────────

interface DrillOutput {
  question:       string;
  context_text:   string;
  model_answer:   string;
  command_verb:   string;
  answer_schema?: SerializedSchema;  // quantitative only — persisted to acca_drills.answer_schema
  _liveSchema?:   AnswerSchema;      // quantitative only — functions, for gates + OFR proof (not persisted)
  _rawInputs?:    FcffInputs;        // FCFF only — dry-run inspection
  _computed?:     FcffComputed;      // FCFF only — dry-run inspection
  _npvInputs?:    NpvInputs;         // NPV only — dry-run inspection
  _npvComputed?:  NpvComputed;       // NPV only — dry-run inspection
  _apvInputs?:    ApvInputs;         // APV only — dry-run inspection
  _apvComputed?:  ApvComputed;       // APV only — dry-run inspection
  _capmInputs?:   CapmInputs;        // CAPM only — dry-run inspection
  _capmComputed?: CapmComputed;      // CAPM only — dry-run inspection
  _durationInputs?:   DurationInputs;    // duration only — dry-run inspection
  _durationComputed?: DurationComputed;  // duration only — dry-run inspection
  _creditInputs?:     CreditInputs;      // credit only — dry-run inspection + spread-table gate
  _creditComputed?:   CreditComputed;    // credit only — dry-run inspection
  _bsopInputs?:       BsopInputs;        // bsop only — dry-run inspection
  _bsopComputed?:     BsopComputed;      // bsop only — dry-run inspection + option-bounds gate
  _valuationKind?:    ValuationKind;     // valuation family — selects the bridge-gate branch
  _valuationComputed?: FcffComputed | FcfeComputed | DividendComputed | CompareComputed; // valuation — bridge gate + dry-run
  _valuationDebt?:    number;            // valuation — debt value for the bridge gate
  _valuationEquityWeight?: number;       // fcff_enterprise — estimated equity weight, for the FIX-1 divergence lint
  _intlKind?:     InternationalKind;     // international family — dry-run + gate branch
  _intlSummary?:  string;                // international family — dry-run one-liner
  _intlPenalty?:  number;                // international family — decision-relevance penalty (best-of-N)
  _intlGate?: {                          // international family — data for GATES 12/13/14
    parity: { fx_curve: number[]; base_spot: number; basis: ParityBasis; rate_home: number; rate_foreign: number }[];
    scaleYears: { fx: number; foreign_remit_net: number; home_cf: number }[];
    doubleTax: { withholding: number; home_tax: number; foreign_corp: number; wht_creditable: boolean; periods: { taxable_profit: number; fcff: number; additional_home_tax_foreign: number }[] };
  };
  _riskKind?:     RiskKind;              // risk & uncertainty family — dry-run + gate branch
  _riskSummary?:  string;                // risk family — dry-run one-liner
  _riskPenalty?:  number;                // risk family — decision-relevance penalty (best-of-N)
  _riskGate?: {                          // risk family — data for the kind's gate (G-a…G-e); only one is set
    probabilities?: number[];                                                                     // G-a (enpv)
    enpv?: { scenarios: { probability: number; npv: number }[]; value: number };                  // G-b (enpv)
    sensitivity?: { base_npv: number; pv_affected: number; variable_sensitivity_pct: number; irr: number; discount_rate: number; disc_rate_sensitivity_pct: number; headroom_pp: number }; // G-c
    radr?: { raw: RadrInputs; computed: RadrComputed };                                           // G-d
    varDur?: { raw: RiskMeasuresInputs; computed: RiskMeasuresComputed };                         // G-e
  };
  _fxKind?:       FxHedgeKind;       // fx-hedge family — dry-run + gate branch
  _fxSummary?:    string;            // fx-hedge family — dry-run one-liner
  _fxPenalty?:    number;            // fx-hedge family — decision-relevance penalty (best-of-N)
  _fxGate?: {                        // fx-hedge family — data for GATES 15–19 + 17b; only the fields the kind used are set
    wholeContract?: { exposure: number; contract_size: number; contracts: number; residual: number; residual_policy: ResidualPolicy; home_from_residual: number };
    basisDecay?: { spot0: number; futures0: number; months_to_expiry: number; months_to_transaction: number; unexpired_basis: number; lock_in_rate: number };
    currencyDirection: { foreignAmt: number; rate: number; homeAmt: number; dir: QuoteDirection; direction: ExposureDirection; side: 'buy' | 'sell'; expectedSide: 'buy' | 'sell' }[];
    premiumCurrency?: { premium_pct: number; contracts: number; contract_size: number; premium: number };
    bestMethod?: { direction: ExposureDirection; results: { method: string; home_settlement: number }[]; statedBestMethod: string; statedMargin: number };
    quoteSentence: { context_text: string; dir: QuoteDirection; foreign: string; home: string };
  };
  _currency?:     string;            // quantitative only — dry-run display
}

function assertNonEmpty(obj: Record<string, unknown>, fields: string[], pass: string): void {
  for (const f of fields) {
    const v = obj[f];
    if (typeof v !== 'string' || v.trim() === '') {
      throw new Error(`${pass}: field "${f}" came back empty/undefined (likely truncated mid-tool-use) — regenerating`);
    }
  }
}

async function draftDiscursiveDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_DRILL_TOOL],
    tool_choice: { type: 'tool', name: 'submit_drill' },
    messages: [{ role: 'user', content: buildDiscursiveUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in discursive Pass 1 response');
  const inp = block.input as { question: string; context_text: string; model_answer: string; command_verb: string };
  assertNonEmpty(inp, ['question', 'context_text', 'model_answer', 'command_verb'], 'Pass 1 (discursive)');
  return {
    question:     inp.question,
    context_text: inp.context_text,
    model_answer: inp.model_answer,
    command_verb: inp.command_verb.trim().toLowerCase(),
  };
}

async function draftFcffDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1600,
    system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_FCFF_SCENARIO_TOOL],
    tool_choice: { type: 'tool', name: 'submit_fcff_scenario' },
    messages: [{ role: 'user', content: buildFcffUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in FCFF Pass 1 response');
  const inp = block.input as {
    question: string; context_text: string; command_verb: string; currency?: string;
    raw_inputs: FcffInputs; interpretation_prose: string;
  };
  assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'interpretation_prose'], 'Pass 1 (FCFF)');
  if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (FCFF): raw_inputs missing');

  const currency = normaliseCurrency(inp.currency);
  const computed = computeFcff(inp.raw_inputs);              // throws loud on bad data → retry loop regenerates
  const { schema, serialized } = buildFcffSchema(inp.raw_inputs, computed, currency);
  const model_answer = buildFcffModelAnswer(inp.raw_inputs, computed, inp.interpretation_prose, currency);

  return {
    question:      inp.question,
    context_text:  inp.context_text,
    command_verb:  inp.command_verb.trim().toLowerCase(),
    model_answer,
    answer_schema: serialized,
    _liveSchema:   schema,
    _rawInputs:    inp.raw_inputs,
    _computed:     computed,
    _currency:     currency,
  };
}

async function draftNpvDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: NpvKind = spec.npv_kind ?? 'standard';
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1800,
    system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_NPV_SCENARIO_TOOL],
    tool_choice: { type: 'tool', name: 'submit_npv_scenario' },
    messages: [{ role: 'user', content: buildNpvUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in NPV Pass 1 response');
  const inp = block.input as {
    question: string; context_text: string; command_verb: string; currency?: string;
    raw_inputs: NpvInputs; interpretation_prose: string;
  };
  assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'interpretation_prose'], 'Pass 1 (NPV)');
  if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (NPV): raw_inputs missing');

  const currency = normaliseCurrency(inp.currency);
  const computed = computeNpv(inp.raw_inputs, kind);            // throws loud on bad data → retry regenerates
  const { schema, serialized } = buildNpvSchema(inp.raw_inputs, computed, currency);
  const model_answer = buildNpvModelAnswer(inp.raw_inputs, computed, inp.interpretation_prose, currency, kind);

  return {
    question:      inp.question,
    context_text:  inp.context_text,
    command_verb:  inp.command_verb.trim().toLowerCase(),
    model_answer,
    answer_schema: serialized,
    _liveSchema:   schema,
    _npvInputs:    inp.raw_inputs,
    _npvComputed:  computed,
    _currency:     currency,
  };
}

// Each APV kind has an intended pedagogical verdict; the model can't see the base case it
// authors (and "base near zero" depends on tax/Keu/inflation it can't self-calibrate), so we
// score each draft against its kind's target and keep the BEST of N attempts (never ship the
// worst). penalty 0 = on-target. standard/compare want an ACCEPT (so the method — and, for
// compare, the package CHOICE — is what's exercised); reject wants the financing to FAIL to
// rescue a negative base; subsidised wants the shield+subsidy to be DECISION-RELEVANT (the
// decision flips, or |base| is within reach of the financing so the subsidy plausibly tips it).
function apvKindPenalty(kind: ApvKind, c: ApvComputed): number {
  if (kind === 'standard')          return c.apv > 0 ? 0 : 9;
  if (kind === 'financing_compare') return c.apv > 0 ? 0 : 9;
  if (kind === 'reject')            return (c.apv < 0 && c.base_npv < 0) ? 0 : 9;
  // subsidised
  const financing = (c.tax_shield ?? 0) + (c.subsidy_benefit ?? 0);
  if (financing <= 0) return Infinity;
  const flips = (c.base_npv < 0) !== (c.apv < 0);
  return flips ? 0 : Math.abs(c.base_npv) / financing;
}

async function draftApvDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: ApvKind = spec.apv_kind ?? 'standard';
  // Best-of-N: keep the attempt closest to the kind's intended verdict; accept early once
  // one is on-target. All kinds get retries — generation variance flips verdicts otherwise.
  const MAX_ATTEMPTS = 4;
  const ACCEPT_PENALTY = 1.3;   // on-target (0) or, for subsidised, |base| within ~1.3× the financing
  let best: DrillOutput | null = null;
  let bestPenalty = Infinity;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3200,   // APV scenarios carry many raw inputs + long prose; 2000 truncated the compare tool-use
      system: cacheBlock(AFM_EXAMINER_PERSONA),
      tools: [SUBMIT_APV_SCENARIO_TOOL],
      tool_choice: { type: 'tool', name: 'submit_apv_scenario' },
      messages: [{ role: 'user', content: buildApvUserPrompt(spec) }],
    });
    const block = res.content.find((b) => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in APV Pass 1 response');
    const inp = block.input as {
      question: string; context_text: string; command_verb: string; currency?: string;
      raw_inputs: ApvInputs; interpretation_prose: string;
    };
    assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'interpretation_prose'], 'Pass 1 (APV)');
    if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (APV): raw_inputs missing');

    const currency = normaliseCurrency(inp.currency);
    const computed = computeApv(inp.raw_inputs, kind);         // throws loud on bad data → retry regenerates
    const { schema, serialized } = buildApvSchema(inp.raw_inputs, computed, currency, kind);
    const model_answer = buildApvModelAnswer(inp.raw_inputs, computed, inp.interpretation_prose, currency, kind);

    const candidate: DrillOutput = {
      question:      inp.question,
      context_text:  inp.context_text,
      command_verb:  inp.command_verb.trim().toLowerCase(),
      model_answer,
      answer_schema: serialized,
      _liveSchema:   schema,
      _apvInputs:    inp.raw_inputs,
      _apvComputed:  computed,
      _currency:     currency,
    };
    const penalty = apvKindPenalty(kind, computed);
    if (penalty <= bestPenalty) { best = candidate; bestPenalty = penalty; }
    if (penalty <= ACCEPT_PENALTY) return candidate;
    if (attempt < MAX_ATTEMPTS - 1) console.warn(`  ↻ ${spec.lo_code} [APV/${kind}] off-target verdict (base ${computed.base_npv.toFixed(1)}, APV ${computed.apv.toFixed(1)}, penalty ${penalty.toFixed(2)}) — retrying (${attempt + 1}/${MAX_ATTEMPTS})`);
  }
  if (bestPenalty > ACCEPT_PENALTY) console.warn(`  ⚠ ${spec.lo_code} [APV/${kind}] best-of-${MAX_ATTEMPTS} penalty ${bestPenalty.toFixed(2)} (>${ACCEPT_PENALTY}) — shipping least-bad; self-flag for review`);
  return best!;
}

async function draftCapmDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: CapmKind = spec.capm_kind ?? 'project_specific';
  // wrong_hurdle must come back with the decision FLIPPING (the teaching point); the model
  // can't see the two WACCs it produces, so run best-of-4 and keep a flipping draft.
  const MAX_ATTEMPTS = kind === 'wrong_hurdle' ? 4 : 1;
  let best: DrillOutput | null = null;
  let bestFlips = false;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const res = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2600,
      system: cacheBlock(AFM_EXAMINER_PERSONA),
      tools: [SUBMIT_CAPM_SCENARIO_TOOL],
      tool_choice: { type: 'tool', name: 'submit_capm_scenario' },
      messages: [{ role: 'user', content: buildCapmUserPrompt(spec) }],
    });
    const block = res.content.find((b) => b.type === 'tool_use');
    if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in CAPM Pass 1 response');
    const inp = block.input as {
      question: string; context_text: string; command_verb: string; currency?: string;
      raw_inputs: CapmInputs; interpretation_prose: string;
    };
    assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'interpretation_prose'], 'Pass 1 (CAPM)');
    if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (CAPM): raw_inputs missing');

    const currency = normaliseCurrency(inp.currency);
    const computed = computeCapm(inp.raw_inputs, kind);          // throws loud on bad data → retry
    const { schema, serialized } = buildCapmSchema(inp.raw_inputs, computed, kind);
    const model_answer = buildCapmModelAnswer(inp.raw_inputs, computed, inp.interpretation_prose, kind);

    const candidate: DrillOutput = {
      question: inp.question, context_text: inp.context_text, command_verb: inp.command_verb.trim().toLowerCase(),
      model_answer, answer_schema: serialized, _liveSchema: schema, _capmInputs: inp.raw_inputs, _capmComputed: computed, _currency: currency,
    };
    if (kind !== 'wrong_hurdle') return candidate;
    if (computed.flips) return candidate;
    best = candidate; bestFlips = computed.flips ?? false;
    if (attempt < MAX_ATTEMPTS - 1) console.warn(`  ↻ ${spec.lo_code} [CAPM/wrong_hurdle] decision did not flip (return ${computed.project_return}, company ${computed.company_wacc?.toFixed(2)}, project ${computed.project_wacc?.toFixed(2)}) — retrying (${attempt + 1}/${MAX_ATTEMPTS})`);
  }
  if (!bestFlips) console.warn(`  ⚠ ${spec.lo_code} [CAPM/wrong_hurdle] best-of-${MAX_ATTEMPTS} still not flipping — shipping least-bad; self-flag for review`);
  return best!;
}

async function draftDurationDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: DurationKind = spec.duration_kind ?? 'standard';
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2600,
    system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_DURATION_SCENARIO_TOOL],
    tool_choice: { type: 'tool', name: 'submit_duration_scenario' },
    messages: [{ role: 'user', content: buildDurationUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in duration Pass 1 response');
  const inp = block.input as {
    question: string; context_text: string; command_verb: string; currency?: string;
    raw_inputs: DurationInputs; interpretation_prose: string;
  };
  assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'interpretation_prose'], 'Pass 1 (duration)');
  if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (duration): raw_inputs missing');

  const currency = normaliseCurrency(inp.currency);
  const computed = computeDuration(inp.raw_inputs, kind);       // throws loud on bad data → retry
  const { schema, serialized } = buildDurationSchema(inp.raw_inputs, computed, currency, kind);
  const model_answer = buildDurationModelAnswer(inp.raw_inputs, computed, inp.interpretation_prose, currency, kind);

  return {
    question: inp.question, context_text: inp.context_text, command_verb: inp.command_verb.trim().toLowerCase(),
    model_answer, answer_schema: serialized, _liveSchema: schema, _durationInputs: inp.raw_inputs, _durationComputed: computed, _currency: currency,
  };
}

async function draftCreditDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: CreditKind = spec.credit_kind ?? 'kd_term_structure';
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2800,
    system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_CREDIT_SCENARIO_TOOL],
    tool_choice: { type: 'tool', name: 'submit_credit_scenario' },
    messages: [{ role: 'user', content: buildCreditUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in credit Pass 1 response');
  const inp = block.input as {
    question: string; context_text: string; command_verb: string; currency?: string;
    raw_inputs: CreditInputs; interpretation_prose: string;
  };
  assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'interpretation_prose'], 'Pass 1 (credit)');
  if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (credit): raw_inputs missing');

  const currency = normaliseCurrency(inp.currency);
  const rawInputs: CreditInputs = { ...inp.raw_inputs, currency };
  const computed = computeCredit(rawInputs, kind);              // throws loud on bad data → retry
  const { schema, serialized } = buildCreditSchema(rawInputs, computed, currency, kind);
  const model_answer = buildCreditModelAnswer(rawInputs, computed, inp.interpretation_prose, currency, kind);

  return {
    question: inp.question, context_text: inp.context_text, command_verb: inp.command_verb.trim().toLowerCase(),
    model_answer, answer_schema: serialized, _liveSchema: schema, _creditInputs: rawInputs, _creditComputed: computed, _currency: currency,
  };
}

async function draftBsopDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: BsopKind = spec.bsop_kind ?? 'financial_product_valuation';
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2600,
    system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_BSOP_SCENARIO_TOOL],
    tool_choice: { type: 'tool', name: 'submit_bsop_scenario' },
    messages: [{ role: 'user', content: buildBsopUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in BSOP Pass 1 response');
  const inp = block.input as {
    question: string; context_text: string; command_verb: string; currency?: string;
    raw_inputs: BsopInputs; interpretation_prose: string;
  };
  assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'interpretation_prose'], 'Pass 1 (bsop)');
  if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (bsop): raw_inputs missing');

  const currency = normaliseCurrency(inp.currency);
  const rawInputs: BsopInputs = { ...inp.raw_inputs, currency };
  const computed = computeBsop(rawInputs, kind);               // throws loud on bad data → retry
  const { schema, serialized } = buildBsopSchema(rawInputs, computed, currency, kind);
  const model_answer = buildBsopModelAnswer(rawInputs, computed, inp.interpretation_prose, currency, kind);

  return {
    question: inp.question, context_text: inp.context_text, command_verb: inp.command_verb.trim().toLowerCase(),
    model_answer, answer_schema: serialized, _liveSchema: schema, _bsopInputs: rawInputs, _bsopComputed: computed, _currency: currency,
  };
}

// Valuation FAMILY draft (batch #9). Dispatches by spec.valuation_kind. K1 LIGHT-COMPOSES the CAPM
// calculator (computeCapm 'org_wacc' → Ke/WACC) then feeds the derived WACC into the FCFF chain — the
// composition ruling; valuation.ts stays CAPM-free, the composition happens HERE. Code owns every figure.
async function draftValuationDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: ValuationKind = spec.valuation_kind ?? 'fcff_enterprise';
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2600,
    system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_VALUATION_SCENARIO_TOOL],
    tool_choice: { type: 'tool', name: 'submit_valuation_scenario' },
    messages: [{ role: 'user', content: buildValuationUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in valuation Pass 1 response');
  const inp = block.input as { question: string; context_text: string; command_verb: string; currency?: string; raw_inputs: Record<string, number & string>; interpretation_prose: string };
  assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'interpretation_prose'], 'Pass 1 (valuation)');
  if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (valuation): raw_inputs missing');
  const r = inp.raw_inputs as Record<string, number>;
  const currency = normaliseCurrency(inp.currency);
  const base = { command_verb: inp.command_verb.trim().toLowerCase(), question: inp.question, context_text: inp.context_text, _currency: currency, _valuationKind: kind, _valuationDebt: r.debt_value };

  if (kind === 'fcff_enterprise') {
    // Light-compose: derive Ke → WACC from the firm's OWN geared beta + structure (no peer ungearing).
    const capmComputed = computeCapm({ rf: r.rf, mrp: r.mrp, tax_rate: r.tax_rate, company_equity_beta: r.company_equity_beta, company_ve: r.company_ve, company_vd: r.company_vd, kd: r.kd }, 'org_wacc');
    const capm: CapmFront = { rf: r.rf, mrp: r.mrp, tax_rate: r.tax_rate, company_equity_beta: r.company_equity_beta, company_ve: r.company_ve, company_vd: r.company_vd, kd: r.kd, ke: capmComputed.ke!, wacc: capmComputed.wacc! };
    const fcffInputs: FcffInputs = { pbit: r.pbit, tax_rate: r.tax_rate, depreciation: r.depreciation, capex: r.capex, delta_working_capital: r.delta_working_capital, wacc: capm.wacc, growth_rate: r.growth_rate, debt_value: r.debt_value, offer_price: r.offer_price };
    const computed = computeFcff(fcffInputs);
    const { schema, serialized } = buildFcffComposedSchema(fcffInputs, computed, capm, currency);
    const model_answer = buildFcffComposedModelAnswer(fcffInputs, computed, capm, inp.interpretation_prose, currency);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema, _valuationComputed: computed, _valuationEquityWeight: capm.company_ve };
  }
  if (kind === 'fcfe_equity') {
    const fi: FcfeInputs = { pbit: r.pbit, tax_rate: r.tax_rate, depreciation: r.depreciation, capex: r.capex, delta_working_capital: r.delta_working_capital, ke: r.ke, kd: r.kd, debt_value: r.debt_value, offer_price: r.offer_price };
    const computed = computeFcfe(fi);
    const { schema, serialized } = buildFcfeSchema(fi, computed, currency);
    const model_answer = buildFcfeModelAnswer(fi, computed, inp.interpretation_prose, currency);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema, _valuationComputed: computed };
  }
  if (kind === 'dividend_capacity') {
    const di: DividendInputs = { pbit: r.pbit, tax_rate: r.tax_rate, depreciation: r.depreciation, capex: r.capex, delta_working_capital: r.delta_working_capital, kd: r.kd, debt_value: r.debt_value, net_borrowing: r.net_borrowing, proposed_dividend: r.proposed_dividend, shares: r.shares };
    const computed = computeDividendCapacity(di);
    const { schema, serialized } = buildDividendSchema(di, computed, currency);
    const model_answer = buildDividendModelAnswer(di, computed, inp.interpretation_prose, currency);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema, _valuationComputed: computed };
  }
  // valuation_compare
  const ci: CompareInputs = { pbit: r.pbit, tax_rate: r.tax_rate, depreciation: r.depreciation, capex: r.capex, delta_working_capital: r.delta_working_capital, wacc: r.wacc, growth_rate: r.growth_rate, debt_value: r.debt_value, multiple_type: (r.multiple_type as unknown as CompareInputs['multiple_type']) ?? 'pe', multiple: r.multiple, earnings: r.earnings, ebitda: r.ebitda, offer_price: r.offer_price };
  const computed = computeValuationCompare(ci);
  const { schema, serialized } = buildCompareSchema(ci, computed, currency);
  const model_answer = buildCompareModelAnswer(ci, computed, inp.interpretation_prose, currency);
  return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema, _valuationComputed: computed };
}

// RISK & UNCERTAINTY FAMILY draft (calculator #3). Dispatches by spec.risk_kind. Code owns every
// figure + verdict; the model authors prose only. Decision-relevance is a generation quality bar
// (best-of-N), not a gate: K1 wants a decisive ENPV + a live negative-NPV state; K2 a positive base +
// a sensible margin; K3 the FLIP; K4 a material duration difference.
async function draftRiskDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: RiskKind = spec.risk_kind ?? 'enpv';
  const MAX_ATTEMPTS = 4, ACCEPT_PENALTY = 0.5;
  let best: DrillOutput | null = null, bestPenalty = Infinity;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = await draftRiskOnce(anthropic, spec, kind);
    const penalty = candidate._riskPenalty ?? 5;
    if (penalty < bestPenalty) { best = candidate; bestPenalty = penalty; }
    if (penalty <= ACCEPT_PENALTY) return candidate;
    if (attempt < MAX_ATTEMPTS - 1) console.warn(`  ↻ ${spec.lo_code} [RISK/${kind}] off-target (${candidate._riskSummary}, penalty ${penalty.toFixed(2)}) — retrying (${attempt + 1}/${MAX_ATTEMPTS})`);
  }
  if (bestPenalty > ACCEPT_PENALTY) console.warn(`  ⚠ ${spec.lo_code} [RISK/${kind}] best-of-${MAX_ATTEMPTS} penalty ${bestPenalty.toFixed(2)} — shipping least-bad; self-flag for review`);
  return best!;
}

async function draftRiskOnce(anthropic: Anthropic, spec: AfmDrillSpec, kind: RiskKind): Promise<DrillOutput> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 2600, system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_RISK_SCENARIO_TOOL], tool_choice: { type: 'tool', name: 'submit_risk_scenario' },
    messages: [{ role: 'user', content: buildRiskUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in risk Pass 1 response');
  const inp = block.input as { question: string; context_text: string; command_verb: string; currency: string; raw_inputs: Record<string, unknown>; interpretation_prose: string };
  assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'currency', 'interpretation_prose'], 'Pass 1 (risk)');
  if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (risk): raw_inputs missing');
  const r = inp.raw_inputs as Record<string, unknown>;
  const cur = normaliseCurrency(inp.currency);
  const base = { command_verb: inp.command_verb.trim().toLowerCase(), question: inp.question, context_text: inp.context_text, _currency: cur, _riskKind: kind };

  if (kind === 'enpv') {
    const ins = { currency: cur, outlay: r.outlay as number, discount_rate: r.discount_rate as number, scenarios: r.scenarios as unknown as { label: string; probability: number; cash_flows: number[] }[], hurdle: r.hurdle as number | undefined };
    const c = computeEnpv(ins);
    const { schema, serialized } = buildEnpvSchema(ins, c);
    const model_answer = buildEnpvModelAnswer(ins, c, inp.interpretation_prose);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
      _riskSummary: `ENPV=${money(cur, c.enpv)} ${c.accept ? 'ACCEPT' : 'REJECT'} P(neg)=${(c.p_negative * 100).toFixed(0)}%`,
      _riskPenalty: (Math.abs(c.enpv) / ins.outlay >= 0.05 ? 0 : 1) + (c.p_negative > 0 ? 0 : 1),
      _riskGate: { probabilities: c.scenarios.map((s) => s.probability), enpv: { scenarios: c.scenarios.map((s) => ({ probability: s.probability, npv: s.npv })), value: c.enpv } } };
  }
  if (kind === 'sensitivity') {
    const ins = { currency: cur, outlay: r.outlay as number, net_cash_flows: r.net_cash_flows as unknown as number[], affected_cash_flows: r.affected_cash_flows as unknown as number[], variable_label: r.variable_label as string, discount_rate: r.discount_rate as number };
    const c = computeSensitivity(ins);
    const { schema, serialized } = buildSensitivitySchema(ins, c);
    const model_answer = buildSensitivityModelAnswer(ins, c, inp.interpretation_prose);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
      _riskSummary: `base NPV=${money(cur, c.base_npv)} var-sens=${c.variable_sensitivity_pct.toFixed(1)}% disc-sens=${c.disc_rate_sensitivity_pct.toFixed(1)}%`,
      _riskPenalty: (c.base_npv > 0 ? 0 : 1) + (c.variable_sensitivity_pct > 0 && c.variable_sensitivity_pct < 100 ? 0 : 1),
      _riskGate: { sensitivity: { base_npv: c.base_npv, pv_affected: c.pv_affected, variable_sensitivity_pct: c.variable_sensitivity_pct, irr: c.irr, discount_rate: c.discount_rate, disc_rate_sensitivity_pct: c.disc_rate_sensitivity_pct, headroom_pp: c.headroom_pp } } };
  }
  if (kind === 'radr_compare') {
    const ins: RadrInputs = { currency: cur, outlay: r.outlay as number, project_cash_flows: r.project_cash_flows as unknown as number[], company_rate: r.company_rate as number, rf: r.rf as number, mrp: r.mrp as number, tax_rate: r.tax_rate as number, kd: r.kd as number, peer_equity_beta: r.peer_equity_beta as number, peer_ve: r.peer_ve as number, peer_vd: r.peer_vd as number, own_ve: r.own_ve as number, own_vd: r.own_vd as number };
    const c = computeRadr(ins);
    const { schema, serialized } = buildRadrSchema(ins, c);
    const model_answer = buildRadrModelAnswer(ins, c, inp.interpretation_prose);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
      _riskSummary: `RADR=${(c.radr * 100).toFixed(2)}% company=${(c.company_rate * 100).toFixed(2)}% flips=${c.flips}`,
      _riskPenalty: c.flips ? 0 : 2,
      _riskGate: { radr: { raw: ins, computed: c } } };
  }
  // risk_measures
  const ins: RiskMeasuresInputs = { currency: cur, discount_rate: r.discount_rate as number, project_a: r.project_a as unknown as { label: string; cash_flows: number[] }, project_b: r.project_b as unknown as { label: string; cash_flows: number[] }, var_sigma_annual: r.var_sigma_annual as number, var_confidence: r.var_confidence as number, var_tail: (r.var_tail as string) === 'two' ? 'two' : 'one', var_horizon_years: r.var_horizon_years as number };
  const c = computeRiskMeasures(ins);
  const { schema, serialized } = buildRiskMeasuresSchema(ins, c);
  const model_answer = buildRiskMeasuresModelAnswer(ins, c, inp.interpretation_prose);
  return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
    _riskSummary: `dur ${c.duration_a.toFixed(2)}y vs ${c.duration_b.toFixed(2)}y (longer=${c.longer}) VaR=${money(cur, c.var_amount)}`,
    _riskPenalty: Math.abs(c.duration_a - c.duration_b) >= 0.3 ? 0 : 1,
    _riskGate: { varDur: { raw: ins, computed: c } } };
}

// International FAMILY draft (batch #10). Dispatches by spec.international_kind. Basis is PPP for
// every B5 drill (multi-year translation — Grant ruling #1; IRP is reserved for short-horizon
// forwards and stays engine-supported/fixture-tested only). Code derives the FX curve, converts,
// applies the credit-method double-tax, and owns every figure and verdict.
// Decision-relevance is a generation quality bar, not a gate (APV/CAPM precedent). The model cannot
// see the figures it produces, so we run best-of-N and keep the draft whose CODE-COMPUTED verdict
// best matches the kind's intent: K1/K3 → accept; K2 → base-accept + alt-reject (the flip); K4 → a
// decisive surplus AND a materially-sized subsidiary contribution. The penalty is set at build time
// on _intlPenalty (from the computed object), not parsed back off a string.
async function draftInternationalDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: InternationalKind = spec.international_kind ?? 'home_currency_standard';
  const MAX_ATTEMPTS = 4;
  const ACCEPT_PENALTY = 0.5;
  let best: DrillOutput | null = null;
  let bestPenalty = Infinity;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = await draftInternationalOnce(anthropic, spec, kind);
    const penalty = candidate._intlPenalty ?? 5;
    if (penalty < bestPenalty) { best = candidate; bestPenalty = penalty; }   // strict: keep the FIRST best, not the last equal-penalty (worse) one
    if (penalty <= ACCEPT_PENALTY) return candidate;
    if (attempt < MAX_ATTEMPTS - 1) console.warn(`  ↻ ${spec.lo_code} [INTL/${kind}] off-target verdict (${candidate._intlSummary}, penalty ${penalty.toFixed(2)}) — retrying (${attempt + 1}/${MAX_ATTEMPTS})`);
  }
  if (bestPenalty > ACCEPT_PENALTY) console.warn(`  ⚠ ${spec.lo_code} [INTL/${kind}] best-of-${MAX_ATTEMPTS} penalty ${bestPenalty.toFixed(2)} (>${ACCEPT_PENALTY}) — shipping least-bad; self-flag for review`);
  return best!;
}

async function draftInternationalOnce(anthropic: Anthropic, spec: AfmDrillSpec, kind: InternationalKind): Promise<DrillOutput> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2600,
    system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_INTERNATIONAL_SCENARIO_TOOL],
    tool_choice: { type: 'tool', name: 'submit_international_scenario' },
    messages: [{ role: 'user', content: buildInternationalUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in international Pass 1 response');
  const inp = block.input as { question: string; context_text: string; command_verb: string; home_currency: string; foreign_currency: string; raw_inputs: Record<string, number>; interpretation_prose: string };
  assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'home_currency', 'foreign_currency', 'interpretation_prose'], 'Pass 1 (international)');
  if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (international): raw_inputs missing');
  const r = inp.raw_inputs;
  const home = normaliseCurrency(inp.home_currency), foreign = normaliseCurrency(inp.foreign_currency);
  const basis: ParityBasis = 'ppp'; // code owns the basis (PPP for multi-year translation) — never model-chosen
  const build = { pbit: r.pbit, tax_rate: r.tax_rate, depreciation: r.depreciation, capex: r.capex, delta_working_capital: r.delta_working_capital };
  const whtCreditable = (inp.raw_inputs as Record<string, unknown>).wht_creditable !== false; // stated per scenario; default creditable
  const fiscal = { withholding_rate: r.withholding_rate, home_tax_rate: r.home_tax_rate, wht_creditable: whtCreditable };
  // GATE-14 period tuples from an IntlYear-shaped list (differential-tax validation input)
  const periodsOf = (ys: { taxable_profit: number; foreign_cf: number; additional_home_tax_foreign: number }[]) =>
    ys.map((y) => ({ taxable_profit: y.taxable_profit, fcff: y.foreign_cf, additional_home_tax_foreign: y.additional_home_tax_foreign }));
  const base = { command_verb: inp.command_verb.trim().toLowerCase(), question: inp.question, context_text: inp.context_text, _currency: home, _intlKind: kind };

  if (kind === 'home_currency_standard') {
    const ins = { home_currency: home, foreign_currency: foreign, base_spot: r.base_spot, basis, rate_home: r.home_inflation, rate_foreign: r.foreign_inflation, discount_rate: r.discount_rate, foreign_build: build, foreign_growth: r.foreign_growth, years: r.years, initial_outlay_foreign: r.initial_outlay_foreign, ...fiscal };
    const c = computeIntlNpv(ins);
    const { schema, serialized } = buildIntlNpvSchema(ins, c);
    const model_answer = buildIntlNpvModelAnswer(ins, c, inp.interpretation_prose);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
      _intlSummary: `${foreign}→${home} NPV=${money(home, c.npv)} ${c.accept ? 'ACCEPT' : 'REJECT'} (add-tax ${(c.add_tax_rate_effective * 100).toFixed(1)}%${c.has_additional_home_tax ? '' : ' NIL'})`,
      _intlPenalty: c.accept ? 0 : 2,   // K1: want a positive (accept) standard case
      _intlGate: { parity: [{ fx_curve: c.fx_curve, base_spot: r.base_spot, basis, rate_home: r.home_inflation, rate_foreign: r.foreign_inflation }], scaleYears: c.years, doubleTax: { withholding: r.withholding_rate, home_tax: r.home_tax_rate, foreign_corp: r.tax_rate, wht_creditable: whtCreditable, periods: periodsOf(c.years) } } };
  }
  if (kind === 'exchange_rate_sensitivity') {
    const ins = { home_currency: home, foreign_currency: foreign, base_spot: r.base_spot, basis, rate_home: r.home_inflation, rate_foreign: r.foreign_inflation, discount_rate: r.discount_rate, foreign_build: build, foreign_growth: r.foreign_growth, years: r.years, initial_outlay_foreign: r.initial_outlay_foreign, ...fiscal, alt_rate_foreign: r.alt_foreign_inflation, alt_label: (inp.raw_inputs.alt_label as unknown as string) ?? 'a sharper depreciation of the foreign currency' };
    const c = computeIntlSensitivity(ins);
    const { schema, serialized } = buildIntlSensitivitySchema(ins, c);
    const model_answer = buildIntlSensitivityModelAnswer(ins, c, inp.interpretation_prose);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
      _intlSummary: `base=${money(home, c.npv_base)} alt=${money(home, c.npv_alt)} flips=${c.flips}`,
      // K2: want a MEANINGFUL positive base (≥ 1.0m, not razor-thin) AND the flip to reject under the alt
      _intlPenalty: (c.accept_base && !c.accept_alt && c.npv_base >= 1.0) ? 0 : (c.accept_base && !c.accept_alt) ? 0.7 : (c.flips ? 1 : 2),
      _intlGate: { parity: [
        { fx_curve: c.base.fx_curve, base_spot: r.base_spot, basis, rate_home: r.home_inflation, rate_foreign: r.foreign_inflation },
        { fx_curve: c.alt.fx_curve, base_spot: r.base_spot, basis, rate_home: r.home_inflation, rate_foreign: r.alt_foreign_inflation },
      ], scaleYears: [...c.base.years, ...c.alt.years], doubleTax: { withholding: r.withholding_rate, home_tax: r.home_tax_rate, foreign_corp: r.tax_rate, wht_creditable: whtCreditable, periods: periodsOf([...c.base.years, ...c.alt.years]) } } };
  }
  if (kind === 'restricted_remittance') {
    const ins = { home_currency: home, foreign_currency: foreign, base_spot: r.base_spot, basis, rate_home: r.home_inflation, rate_foreign: r.foreign_inflation, discount_rate: r.discount_rate, foreign_build: build, foreign_growth: r.foreign_growth, years: r.years, initial_outlay_foreign: r.initial_outlay_foreign, ...fiscal, blocked_fraction: r.blocked_fraction, local_reinvest_rate: r.local_reinvest_rate };
    const c = computeIntlRemittance(ins);
    const { schema, serialized } = buildIntlRemittanceSchema(ins, c);
    const model_answer = buildIntlRemittanceModelAnswer(ins, c, inp.interpretation_prose);
    const releaseScale = { fx: c.fx_curve[c.years.length - 1], foreign_remit_net: c.release_tax.net_remit_foreign, home_cf: c.home_cf_release };
    const releasePeriod = { taxable_profit: c.blocked_tp_total, fcff: c.blocked_release_foreign, additional_home_tax_foreign: c.release_tax.additional_home_tax_foreign };
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
      _intlSummary: `NPV=${money(home, c.npv)} vs free ${money(home, c.npv_if_free)} (cost ${money(home, c.npv_cost_of_blocking)})`,
      // K3 ideal = the FLIP: free-remittance NPV positive, blocked NPV negative (the controls are what
      // make it uneconomic — the strongest B5c story). Positive base with a material cost is acceptable.
      // Continuous so best-of-N breaks ties toward the least-negative free NPV (no worst-of-ties bug).
      _intlPenalty: (c.npv_if_free > 0 && c.npv < 0) ? 0 : (c.npv > 0 ? 0.3 : 1 + Math.max(0, -c.npv_if_free) / 20),
      _intlGate: { parity: [{ fx_curve: c.fx_curve, base_spot: r.base_spot, basis, rate_home: r.home_inflation, rate_foreign: r.foreign_inflation }], scaleYears: [...c.years, releaseScale], doubleTax: { withholding: r.withholding_rate, home_tax: r.home_tax_rate, foreign_corp: r.tax_rate, wht_creditable: whtCreditable, periods: [...periodsOf(c.years), releasePeriod] } } };
  }
  // multinational_dividend_capacity (A6a)
  const remitYear = Math.max(1, Math.round(r.remittance_year ?? 1));
  const forecastCurve = buildForwardCurve(r.base_spot, basis, r.home_inflation, r.foreign_inflation, remitYear);
  const forecast_spot = forecastCurve[remitYear - 1]; // code-derived — never model-asserted
  const ins = { home_currency: home, foreign_currency: foreign, forecast_spot, basis, base_spot: r.base_spot, rate_home: r.home_inflation, rate_foreign: r.foreign_inflation, remittance_year: remitYear, sub_build: build, sub_kd: r.sub_kd, sub_debt: r.sub_debt, sub_net_borrowing: r.sub_net_borrowing, remit_fraction: r.remit_fraction, parent_fcfe: r.parent_fcfe, proposed_dividend: r.proposed_dividend, ...fiscal };
  const c = computeIntlDividend(ins);
  const { schema, serialized } = buildIntlDividendSchema(ins, c);
  const model_answer = buildIntlDividendModelAnswer(ins, c, inp.interpretation_prose);
  return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
    _intlSummary: `capacity=${money(home, c.total_capacity)} vs proposed ${money(home, c.proposed_dividend)} sustainable=${c.sustainable} (sub share ${(c.sub_remit_home / c.total_capacity * 100).toFixed(0)}%)`,
    // K4: want a DECISIVE verdict (|surplus| ≥ 5% of proposed) AND a MATERIAL subsidiary share (≥ 12%)
    _intlPenalty: (Math.abs(c.capacity_surplus) / c.proposed_dividend >= 0.05 ? 0 : 1) + (c.sub_remit_home / c.total_capacity >= 0.12 ? 0 : 1),
    _intlGate: { parity: [{ fx_curve: forecastCurve, base_spot: r.base_spot, basis, rate_home: r.home_inflation, rate_foreign: r.foreign_inflation }], scaleYears: [{ fx: forecast_spot, foreign_remit_net: c.remit_tax.net_remit_foreign, home_cf: c.sub_remit_home }], doubleTax: { withholding: r.withholding_rate, home_tax: r.home_tax_rate, foreign_corp: r.tax_rate, wht_creditable: whtCreditable, periods: [{ taxable_profit: c.remit_tp_foreign, fcff: c.sub_remit_foreign, additional_home_tax_foreign: c.remit_tax.additional_home_tax_foreign }] } } };
}

// FX HEDGING family draft (calculator #11, E2b). Dispatches by spec.fxhedge_kind. quote_direction /
// exposure direction / residual_policy / premium_currency are CODE-DECIDED (spec.fx_* fields) —
// never model-chosen, same doctrine as international.ts hardcoding basis='ppp'.
async function draftFxHedgeDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  const kind: FxHedgeKind = spec.fxhedge_kind ?? 'forward_mmh_compare';
  const MAX_ATTEMPTS = 4;
  const ACCEPT_PENALTY = 0.5;
  let best: DrillOutput | null = null;
  let bestPenalty = Infinity;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const candidate = await draftFxHedgeOnce(anthropic, spec, kind);
    const penalty = candidate._fxPenalty ?? 5;
    if (penalty < bestPenalty) { best = candidate; bestPenalty = penalty; }
    if (penalty <= ACCEPT_PENALTY) return candidate;
    if (attempt < MAX_ATTEMPTS - 1) console.warn(`  ↻ ${spec.lo_code} [FX/${kind}] off-target margin (${candidate._fxSummary}, penalty ${penalty.toFixed(2)}) — retrying (${attempt + 1}/${MAX_ATTEMPTS})`);
  }
  if (bestPenalty > ACCEPT_PENALTY) console.warn(`  ⚠ ${spec.lo_code} [FX/${kind}] best-of-${MAX_ATTEMPTS} penalty ${bestPenalty.toFixed(2)} (>${ACCEPT_PENALTY}) — shipping least-bad; self-flag for review`);
  return best!;
}

async function draftFxHedgeOnce(anthropic: Anthropic, spec: AfmDrillSpec, kind: FxHedgeKind): Promise<DrillOutput> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2200,
    system: cacheBlock(AFM_EXAMINER_PERSONA),
    tools: [SUBMIT_FXHEDGE_SCENARIO_TOOL],
    tool_choice: { type: 'tool', name: 'submit_fxhedge_scenario' },
    messages: [{ role: 'user', content: buildFxHedgeUserPrompt(spec) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in fx-hedge Pass 1 response');
  const inp = block.input as { question: string; context_text: string; command_verb: string; currency_home: string; currency_foreign: string; raw_inputs: Record<string, number>; interpretation_prose: string };
  assertNonEmpty(inp, ['question', 'context_text', 'command_verb', 'currency_home', 'currency_foreign', 'interpretation_prose'], 'Pass 1 (fx-hedge)');
  if (!inp.raw_inputs || typeof inp.raw_inputs !== 'object') throw new Error('Pass 1 (fx-hedge): raw_inputs missing');
  const r = inp.raw_inputs;
  const home = normaliseCurrency(inp.currency_home), foreign = normaliseCurrency(inp.currency_foreign);
  const direction: ExposureDirection = spec.fx_exposure_direction ?? 'receipt';
  const quote_direction: QuoteDirection = spec.fx_quote_direction ?? 'foreign_per_home';
  // GATE 17b (FIX ROUND 1, 2026-07-22): the quote-direction sentence is CODE-GENERATED and
  // INJECTED at a placeholder token, never authored freely by the model — a parameter↔prose
  // mismatch (the K4 live-batch defect this fix closes) becomes structurally impossible. If the
  // model dropped the placeholder, that is itself a Pass-1 failure (matching assertNonEmpty's
  // retry-on-malformed-response discipline).
  if (!inp.context_text.includes('{{QUOTE_SENTENCE}}')) throw new Error('Pass 1 (fx-hedge): context_text is missing the {{QUOTE_SENTENCE}} placeholder — cannot inject the code-generated quote-direction sentence');
  const context_text = inp.context_text.replace('{{QUOTE_SENTENCE}}', quoteDirectionSentence(quote_direction, foreign, home));
  const base = { command_verb: inp.command_verb.trim().toLowerCase(), question: inp.question, context_text, _currency: home, _fxKind: kind };
  const currencyDirCheck = (foreignAmt: number, rate: number, homeAmt: number, side: 'buy' | 'sell', expectedSide: 'buy' | 'sell') => ({ foreignAmt, rate, homeAmt, dir: quote_direction, direction, side, expectedSide });
  const quoteSentence = { context_text, dir: quote_direction, foreign, home };

  if (kind === 'forward_mmh_compare') {
    const ins: ForwardMmhCompareInputs = { currency_home: home, currency_foreign: foreign, exposure: r.exposure, direction, quote_direction, forward_rate: r.forward_rate, spot: r.spot, months: r.months, rate_foreign_borrow: r.rate_foreign_borrow, rate_foreign_deposit: r.rate_foreign_deposit, rate_home_borrow: r.rate_home_borrow, rate_home_deposit: r.rate_home_deposit };
    const c: ForwardMmhCompareComputed = computeForwardMmhCompare(ins);
    const { schema, serialized } = buildForwardMmhCompareSchema(ins, c);
    const model_answer = buildForwardMmhCompareModelAnswer(ins, c, inp.interpretation_prose);
    const side = instrumentSide(direction);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
      _fxSummary: `forward=${money(home, c.forward.home_settlement)} mmh=${money(home, c.mmh.home_settlement)} margin=${money(home, c.comparison.margin)} best=${c.comparison.best.method}`,
      // want a clearly decisive margin (≥ 2% of the exposure's home equivalent) so the recommendation is not razor-thin
      _fxPenalty: c.comparison.margin >= 0.02 * c.forward.home_settlement ? 0 : 1,
      _fxGate: {
        currencyDirection: [currencyDirCheck(r.exposure, r.forward_rate, c.forward.home_settlement, side, side), currencyDirCheck(c.mmh.foreign_now, r.spot, c.mmh.home_now, side, side)],
        bestMethod: { direction, results: c.comparison.results, statedBestMethod: c.comparison.best.method, statedMargin: c.comparison.margin },
        quoteSentence,
      } };
  }
  if (kind === 'futures') {
    const residual_policy: ResidualPolicy = spec.fx_residual_policy ?? 'immaterial';
    const ins: FuturesDrillInputs = { currency_home: home, currency_foreign: foreign, exposure: r.exposure, direction, quote_direction, contract_size: r.contract_size, spot0: r.spot0, futures0: r.futures0, months_to_expiry: r.months_to_expiry, months_to_transaction: r.months_to_transaction, residual_policy, topup_forward_rate: r.topup_forward_rate };
    const c: FuturesComputed = computeFuturesHedge(ins);
    const { schema, serialized } = buildFuturesSchema(ins, c);
    const model_answer = buildFuturesModelAnswer(ins, c, inp.interpretation_prose);
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
      _fxSummary: `${c.contracts} contracts (${c.side}) lock-in=${fmt4(c.lock_in_rate)} outcome=${money(home, c.home_settlement)}`,
      // want a genuine fractional pre-rounding (real teaching point) and a non-trivial unexpired basis
      _fxPenalty: (Math.abs(r.exposure / r.contract_size - c.contracts) >= 0.1 ? 0 : 1) + (Math.abs(c.unexpired_basis) > 1e-6 ? 0 : 1),
      _fxGate: {
        wholeContract: { exposure: r.exposure, contract_size: r.contract_size, contracts: c.contracts, residual: c.residual, residual_policy, home_from_residual: c.home_from_residual },
        basisDecay: { spot0: r.spot0, futures0: r.futures0, months_to_expiry: r.months_to_expiry, months_to_transaction: r.months_to_transaction, unexpired_basis: c.unexpired_basis, lock_in_rate: c.lock_in_rate },
        currencyDirection: [currencyDirCheck(c.hedged_amount, c.lock_in_rate, c.home_from_futures, c.side, c.side)],
        quoteSentence,
      } };
  }
  if (kind === 'options') {
    const premium_currency = spec.fx_premium_currency ?? 'foreign';
    // FIX ROUND 2 (GPT adjudication, 2026-07-23): spot is now a required OptionsInputs field — the
    // premium (when quoted in a currency other than home) converts at SPOT, never the strike.
    const ins: OptionsDrillInputs = { currency_home: home, currency_foreign: foreign, exposure: r.exposure, direction, quote_direction, contract_size: r.contract_size, strike: r.strike, premium_pct: r.premium_pct, premium_currency, spot: r.spot, months_to_transaction: r.months_to_transaction, residual_policy: 'immaterial' };
    const c: OptionsComputed = computeOptionsHedge(ins);
    const { schema, serialized } = buildOptionsSchema(ins, c);
    const model_answer = buildOptionsModelAnswer(ins, c, inp.interpretation_prose);
    const premiumLegCheck = premium_currency === 'foreign'
      ? [currencyDirCheck(c.premium, r.spot, c.premium_home, 'buy', 'buy')] // premium leg: must use SPOT, not strike
      : [];
    return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
      _fxSummary: `${c.contracts} ${c.option_type} contracts (buy) premium=${fmt1(c.premium)} outcome=${money(home, c.home_settlement)}`,
      _fxPenalty: (Math.abs(r.exposure / r.contract_size - c.contracts) >= 0.1 ? 0 : 1) + (c.premium > 0 ? 0 : 1),
      _fxGate: {
        premiumCurrency: { premium_pct: r.premium_pct, contracts: c.contracts, contract_size: r.contract_size, premium: c.premium },
        // an option hedge always BUYS — a put (receipt) or a call (payment); never 'sell' (FIX ROUND 1).
        // The exercise leg (home_from_strike) legitimately uses the strike; the premium leg (when
        // quoted in a foreign currency) must use spot instead (FIX ROUND 2) — checked separately.
        currencyDirection: [currencyDirCheck(c.hedged_amount, r.strike, c.home_from_strike, 'buy', 'buy'), ...premiumLegCheck],
        quoteSentence,
      } };
  }
  // swap
  const ins: SwapDrillInputs = { currency_home: home, currency_foreign: foreign, exposure: r.exposure, direction, quote_direction, swap_fraction: r.swap_fraction, swap_rate: r.swap_rate, residual_forward_rate: r.residual_forward_rate };
  const c: SwapComputed = computeSwapHedge(ins);
  const { schema, serialized } = buildSwapSchema(ins, c);
  const model_answer = buildSwapModelAnswer(ins, c, inp.interpretation_prose);
  const side = instrumentSide(direction);
  return { ...base, model_answer, answer_schema: serialized, _liveSchema: schema,
    _fxSummary: `swap ${(r.swap_fraction * 100).toFixed(0)}% @ ${fmt4(r.swap_rate)}; residual ${money(foreign, c.residual)}; outcome=${money(home, c.home_settlement)}`,
    // want a genuine partial-coverage swap (the teaching point) with a materially different residual rate
    _fxPenalty: (r.swap_fraction < 0.95 ? 0 : 1) + (c.residual > 1e-6 && Math.abs(r.residual_forward_rate - r.swap_rate) > 1e-6 ? 0 : 1),
    _fxGate: {
      currencyDirection: [currencyDirCheck(c.swapped_amount, r.swap_rate, c.home_from_swap, side, side), ...(c.residual > 1e-6 ? [currencyDirCheck(c.residual, r.residual_forward_rate, c.home_from_residual, side, side)] : [])],
      quoteSentence,
    } };
}

async function draftReveal(anthropic: Anthropic, paper: GeneratorPaper, spec: RevealInput, question: string, modelAnswer: string): Promise<{ hint: string; full_reveal: string }> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: cacheBlock(EZRA_TEACHING_PERSONA[paper]),
    tools: [SUBMIT_REVEAL_TOOL],
    tool_choice: { type: 'tool', name: 'submit_reveal' },
    messages: [{ role: 'user', content: REVEAL_PROMPT_BUILDER[paper](spec, question, modelAnswer) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in Pass 2 response');
  const inp = block.input as { hint: string; full_reveal: string };
  assertNonEmpty(inp, ['hint', 'full_reveal'], 'Pass 2');
  return { hint: inp.hint, full_reveal: inp.full_reveal };
}

// Routing — quantitative FCFF LOs get the code-computes path; everything else discursive.
async function generateDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  // APV is keyed off apv_kind (set by --apv-batch), not mode: B3k is 'mixed' but the compare
  // variant carries figures, so it must reach the calculator, not the mixed-mode throw.
  if (spec.apv_kind && APV_LOS.has(spec.lo_code)) return draftApvDrill(anthropic, spec);
  if (spec.capm_kind && CAPM_LOS.has(spec.lo_code)) return draftCapmDrill(anthropic, spec);
  if (spec.duration_kind && DURATION_LOS.has(spec.lo_code)) return draftDurationDrill(anthropic, spec);
  if (spec.credit_kind && CREDIT_LOS.has(spec.lo_code)) return draftCreditDrill(anthropic, spec);
  if (spec.bsop_kind && BSOP_LOS.has(spec.lo_code)) return draftBsopDrill(anthropic, spec);
  if (spec.valuation_kind && VALUATION_LOS.has(spec.lo_code)) return draftValuationDrill(anthropic, spec);
  if (spec.international_kind && INTERNATIONAL_LOS.has(spec.lo_code)) return draftInternationalDrill(anthropic, spec);
  if (spec.risk_kind && RISK_LOS.has(spec.lo_code)) return draftRiskDrill(anthropic, spec);
  if (spec.fxhedge_kind && FXHEDGE_LOS.has(spec.lo_code)) return draftFxHedgeDrill(anthropic, spec);
  if (spec.mode === 'quantitative') {
    if (FCFF_LOS.has(spec.lo_code)) return draftFcffDrill(anthropic, spec);
    if (NPV_LOS.has(spec.lo_code))  return draftNpvDrill(anthropic, spec);
    if (APV_LOS.has(spec.lo_code))  return draftApvDrill(anthropic, spec);
    if (CAPM_LOS.has(spec.lo_code)) return draftCapmDrill(anthropic, spec);
    if (DURATION_LOS.has(spec.lo_code)) return draftDurationDrill(anthropic, spec);
    if (CREDIT_LOS.has(spec.lo_code)) return draftCreditDrill(anthropic, spec);
    if (BSOP_LOS.has(spec.lo_code)) return draftBsopDrill(anthropic, spec);
    throw new Error(`No calculator registered for quantitative LO ${spec.lo_code} (wired: B4b/B4c FCFF, B1a NPV, B3j/B3k APV, B3d/B3e CAPM, B3f duration, B3h/B4a credit, B2a/B2c BSOP)`);
  }
  if (spec.mode === 'mixed') {
    throw new Error(`Mixed LO ${spec.lo_code} not in pilot scope (needs a per-drill scenario_supplies_figures decision)`);
  }
  return draftDiscursiveDrill(anthropic, spec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Quantitative HARD GATES — run before any insert. Returns pass/fail + printable lines.
//   (1) validateSchemaSelfConsistency (schema self-consistency + tolerance + OFR wiring)
//   (2) answer↔schema figure integrity (every expected_value appears in the model answer)
//   (3) seeded wrong-upstream OFR proof through the numeric verifier (carried verdicts)
// ─────────────────────────────────────────────────────────────────────────────

// Build a seeded submission: perturb the first root (×0.8, workings present) so it is
// wrong-but-shown; compute every dependent CORRECTLY from the student's own upstream
// figures. Expected: root → incorrect; each dependent → carried.
function buildOfrProof(schema: AnswerSchema): { submission: StudentSubmission; expected: Record<string, Verdict> } {
  const own = new Map<string, number>();
  const components: StudentSubmission['components'] = [];
  const expected: Record<string, Verdict> = {};
  // Perturb each root by a DISTINCT factor (not a single ×0.8). A dependent that is a
  // scale-invariant RATIO of two roots (e.g. Macaulay duration = Σt·PV ÷ price) would
  // recompute to the CORRECT value if both roots were scaled by the same factor — the error
  // cancels — and wrongly verdict 'correct' instead of 'carried'. Distinct factors break the
  // cancellation while staying well outside every tolerance. Affine chains carry as before.
  let rootIdx = 0;
  for (const c of schema.components) {
    const deps = c.depends_on ?? [];
    if (deps.length === 0 || !c.recompute) {
      const factor = Math.max(0.30, 0.85 - rootIdx * 0.06); // distinct per root, ≫ tolerance
      rootIdx++;
      const perturbed = c.expected_value * factor;
      own.set(c.component_id, perturbed);
      components.push({ component_id: c.component_id, value: perturbed, workings: `seeded upstream error (×${factor.toFixed(2)} of the correct figure)` });
      expected[c.component_id] = 'incorrect';
    } else {
      const depVals: Record<string, number> = {};
      for (const d of deps) depVals[d] = own.get(d)!;
      const v = c.recompute(depVals);
      own.set(c.component_id, v);
      components.push({ component_id: c.component_id, value: v, workings: `correct method on own upstream figures: ${c.working_steps?.[0] ?? ''}` });
      expected[c.component_id] = 'carried';
    }
  }
  return { submission: { components }, expected };
}

interface GateReport { ok: boolean; lines: string[]; }

function runQuantitativeGates(drill: DrillOutput): GateReport {
  const lines: string[] = [];
  let ok = true;
  const schema = drill._liveSchema;
  if (!schema) return { ok: false, lines: ['GATE ERROR: quantitative drill has no live schema'] };

  // (1) self-consistency / tolerance / OFR-wiring
  const v = validateSchemaSelfConsistency(schema);
  lines.push(`GATE 1 — schema self-consistency + tolerance + OFR-wiring: ${v.ok ? 'PASS' : 'FAIL'}`);
  if (!v.ok) {
    ok = false;
    for (const issue of v.issues) lines.push(`    ✗ [${issue.gate}/${issue.code}] ${issue.component_id}: ${issue.message}`);
  } else {
    lines.push(`    ✓ ${schema.components.length} components; every dependent recomputes to its authored expected within tolerance`);
  }

  // (2) answer↔schema figure integrity — each expected_value appears in the model answer.
  // Check at 1/2/3 dp: money displays at 1 dp, rates (%) at 2 dp, betas at 3 dp — a value is
  // "present" if any of those roundings is a substring (CAPM betas need >1 dp).
  const normalized = drill.model_answer.replace(/,/g, '');
  // 1/2/3 dp for money/rates/betas; 4 dp for BSOP N(d)/d1/d2 which display at the table convention.
  // A value is present at 1/2/3/4 dp; a SIGNED difference (equity − offer) is commonly displayed as
  // its magnitude next to a direction word ("above/below by X"), so its absolute value counts too.
  // Accept EITHER rendering: plain toFixed OR the boundary-aware `fixedHalfUp` the
  // calculators now display with (lib/acca/rounding.ts, FR3). Without the second form GATE 2
  // fails any value on a half-way boundary, where the prose legitimately shows the snapped digit.
  const present = (n: number) => [1, 2, 3, 4].some((d) =>
    normalized.includes(n.toFixed(d)) || normalized.includes(Math.abs(n).toFixed(d)) ||
    normalized.includes(fixedHalfUp(n, d)) || normalized.includes(fixedHalfUp(Math.abs(n), d)));
  const missing: string[] = [];
  for (const c of schema.components) {
    if (!present(c.expected_value)) missing.push(`${c.component_id}=${fmt1(c.expected_value)}`);
  }
  lines.push(`GATE 2 — answer↔schema figure integrity: ${missing.length === 0 ? 'PASS' : 'FAIL'}`);
  if (missing.length) { ok = false; lines.push(`    ✗ figures absent from model_answer: ${missing.join(', ')}`); }
  else lines.push(`    ✓ all ${schema.components.length} component figures present in the worked model answer`);

  // (3) OFR proof — seeded wrong-upstream submission → carried verdicts on dependents
  const { submission, expected } = buildOfrProof(schema);
  const result = verifyNumericAnswer(schema, submission);
  let ofrOk = true;
  const verdictLines: string[] = [];
  for (const pc of result.per_component) {
    const want = expected[pc.component_id];
    const pass = pc.verdict === want;
    if (!pass) ofrOk = false;
    verdictLines.push(`      ${pass ? '✓' : '✗'} ${pc.component_id.padEnd(13)} verdict=${pc.verdict.padEnd(10)} (expected ${want})  student=${pc.student_value}  eff=${round2(pc.expected_value)}  +${pc.awarded_weight}${pc.carried_from ? `  carried_from=[${pc.carried_from.join(',')}]` : ''}`);
  }
  const anyCarried = result.per_component.some((p) => p.verdict === 'carried');
  lines.push(`GATE 3 — seeded wrong-upstream OFR proof: ${ofrOk && anyCarried ? 'PASS' : 'FAIL'} (awarded ${result.awarded}/${result.available}, gap_label: ${result.gap_label ?? '(none)'})`);
  lines.push(...verdictLines);
  if (!ofrOk || !anyCarried) ok = false;

  // (4) P4 jurisdiction-specifics + frozen-market-facts — no named tax classes / statutes /
  // regulators / market structure, and no live-market claims ("currently …"), in question,
  // context, or model answer (hint/full_reveal are re-checked post-reveal, before insert).
  const p4Fields = { question: drill.question, context_text: drill.context_text, model_answer: drill.model_answer };
  const jur = [...lintJurisdiction(p4Fields), ...lintFrozenMarketFacts(p4Fields)];
  lines.push(`GATE 4 — jurisdiction-specifics + frozen market facts (P4): ${jur.length === 0 ? 'PASS' : 'FAIL'}`);
  if (jur.length) { ok = false; for (const iss of jur) lines.push(`    ✗ [${iss.field}/${iss.gate}] ${iss.message}`); }
  else lines.push('    ✓ no named tax class / statute / regulator / market-structure specific, no live-market claim');

  // (5) P5 question-completeness — every element the question demands is delivered.
  const comp = lintCompleteness(drill.question, drill.model_answer);
  lines.push(`GATE 5 — question-completeness (P5): ${comp.length === 0 ? 'PASS' : 'FAIL'}`);
  if (comp.length) { ok = false; for (const iss of comp) lines.push(`    ✗ ${iss.message}`); }
  else lines.push('    ✓ every element the question demands is delivered in the model answer');

  // (6) P6 loss-relief — a negative-taxable year (tax credit taken) requires a stated
  // loss-relief assumption in the context. Detected from the computed tax schedule.
  const taxYears = drill._apvComputed?.base.years ?? drill._npvComputed?.years;
  const hasLossYear = !!taxYears?.some((y) => y.taxable < 0);
  const relief = lintLossRelief(hasLossYear, drill.context_text);
  lines.push(`GATE 6 — loss-relief (P6): ${relief.length === 0 ? 'PASS' : 'FAIL'}${hasLossYear ? ' (loss year present)' : ''}`);
  if (relief.length) { ok = false; for (const iss of relief) lines.push(`    ✗ ${iss.message}`); }
  else lines.push(`    ✓ ${hasLossYear ? 'loss year present and a relief assumption is stated' : 'no negative-taxable year'}`);

  // (7) P8 rating-symbol realism — real single-agency symbols, no cross-agency mixing (credit
  // family). Runs on all quantitative drills; only rating-cue prose can flag, so non-credit
  // drills pass vacuously.
  const ratingFields = { question: drill.question, context_text: drill.context_text, model_answer: drill.model_answer };
  const ratings = lintRatingSymbols(ratingFields);
  lines.push(`GATE 7 — rating-symbol realism (P8): ${ratings.length === 0 ? 'PASS' : 'FAIL'}`);
  if (ratings.length) { ok = false; for (const iss of ratings) lines.push(`    ✗ [${iss.field}/${iss.code}] ${iss.message}`); }
  else lines.push('    ✓ no invented or cross-agency rating symbols');

  // (8) GATE 9 spread↔rating monotonicity — a credit scenario's rating→spread table must price
  // credit quality monotonically (weaker rating → wider spread). Only credit drills carry one.
  const spreadTable = drill._creditInputs?.spread_table;
  if (spreadTable) {
    const mono = validateSpreadTable(spreadTable);
    lines.push(`GATE 8 — spread↔rating monotonicity (GATE 9): ${mono.ok ? 'PASS' : 'FAIL'}`);
    if (!mono.ok) { ok = false; for (const iss of mono.issues) lines.push(`    ✗ [${iss.gate}/${iss.code}] ${iss.message}`); }
    else lines.push(`    ✓ rating→spread table is monotonic in credit quality (single-agency scale)`);
  } else {
    lines.push('GATE 8 — spread↔rating monotonicity (GATE 9): N/A (no spread table — not a credit drill)');
  }

  // (10) GATE 10 option no-arbitrage bounds + put-call parity — only BSOP drills carry a computation.
  if (drill._bsopComputed) {
    const bounds = validateOptionBounds(drill._bsopComputed);
    lines.push(`GATE 10 — option bounds + put-call parity: ${bounds.ok ? 'PASS' : 'FAIL'}`);
    if (!bounds.ok) { ok = false; for (const iss of bounds.issues) lines.push(`    ✗ [${iss.gate}/${iss.code}] ${iss.message}`); }
    else lines.push('    ✓ N(d)∈(0,1), call/put within no-arbitrage bounds, put-call parity holds');
  } else {
    lines.push('GATE 10 — option bounds + put-call parity: N/A (not a BSOP drill)');
  }

  // (11) GATE 11 valuation flow↔rate↔bridge — FCFF⇒WACC+bridge / FCFE⇒Ke+no-bridge+reconciles /
  // capacity=FCFE+verdict / compare DCF-bridge+range+offer. Only valuation-family drills carry one.
  if (drill._valuationComputed && drill._valuationKind) {
    const bridge = validateValuationBridge(drill._valuationKind, drill._valuationComputed, { debt_value: drill._valuationDebt ?? 0 });
    lines.push(`GATE 11 — valuation flow/rate/bridge: ${bridge.ok ? 'PASS' : 'FAIL'}`);
    if (!bridge.ok) { ok = false; for (const iss of bridge.issues) lines.push(`    ✗ [${iss.gate}/${iss.code}] ${iss.message}`); }
    else lines.push(`    ✓ ${drill._valuationKind}: flow matched to the right rate, debt bridge correct`);
    // FIX 1 lint (pattern rule c): a fcff_enterprise whose DCF equity diverges >50% from the estimated
    // equity weight MUST carry the divergence-reconciliation point (code injects it; this enforces it).
    if (drill._valuationKind === 'fcff_enterprise' && drill._valuationEquityWeight) {
      const eq = (drill._valuationComputed as FcffComputed).equity_value;
      const diverges = divergentEquity(eq, drill._valuationEquityWeight);
      const hasRecon = /Reconcile the equity divergence/.test(drill.model_answer);
      const okDiv = !diverges || hasRecon;
      lines.push(`GATE 11b — equity-divergence reconciliation: ${okDiv ? 'PASS' : 'FAIL'}${diverges ? ' (>50% divergence — point required)' : ' (no material divergence)'}`);
      if (!okDiv) { ok = false; lines.push('    ✗ DCF equity diverges >50% from the estimated equity weight but the model answer omits the reconciliation point'); }
    }
  } else {
    lines.push('GATE 11 — valuation flow/rate/bridge: N/A (not a valuation-family drill)');
  }

  // (12/13/14) INTERNATIONAL family — parity consistency, currency/unit-scale integrity, double-tax
  // cap. Only international-family drills carry the gate data.
  if (drill._intlGate) {
    const g = drill._intlGate;
    const parityRes = g.parity.map((p) => validateParityConsistency(p.fx_curve, p.base_spot, p.basis, p.rate_home, p.rate_foreign));
    const parityOk = parityRes.every((v) => v.ok);
    lines.push(`GATE 12 — parity consistency (forecast FX derived, never asserted): ${parityOk ? 'PASS' : 'FAIL'}`);
    if (!parityOk) { ok = false; for (const v of parityRes) for (const iss of v.issues) lines.push(`    ✗ [${iss.gate}/${iss.code}] ${iss.message}`); }
    else lines.push(`    ✓ every forecast spot reconciles to the stated ${g.parity[0].basis.toUpperCase()} parity from S₀ + the rate differential`);

    const scale = validateCurrencyScale(g.scaleYears);
    lines.push(`GATE 13 — currency / unit-scale integrity: ${scale.ok ? 'PASS' : 'FAIL'}`);
    if (!scale.ok) { ok = false; for (const iss of scale.issues) lines.push(`    ✗ [${iss.gate}/${iss.code}] ${iss.message}`); }
    else lines.push('    ✓ every cross-currency figure reconciles (home × spot = foreign) at a consistent scale');

    const cap = validateDoubleTaxCap(g.doubleTax.withholding, g.doubleTax.home_tax, g.doubleTax.foreign_corp, g.doubleTax.wht_creditable, g.doubleTax.periods);
    lines.push(`GATE 14 — double-tax cap (differential credit base): ${cap.ok ? 'PASS' : 'FAIL'}`);
    if (!cap.ok) { ok = false; for (const iss of cap.issues) lines.push(`    ✗ [${iss.gate}/${iss.code}] ${iss.message}`); }
    else lines.push('    ✓ additional home tax = max(0, home liability − foreign corp tax [− WHT if creditable]); ≥ 0, never exceeds home liability');

    // GATE 14b — the tax EXPLANATION must match the branch + true rate ordering (no false inequality/max())
    const addRateEff = Math.max(0, g.doubleTax.home_tax - g.doubleTax.foreign_corp);
    const hasAddTax = g.doubleTax.periods.some((p) => p.additional_home_tax_foreign > 1e-6);
    const prose = validateTaxProse(g.doubleTax.foreign_corp, g.doubleTax.home_tax, addRateEff, hasAddTax, drill.model_answer);
    lines.push(`GATE 14b — tax-prose ↔ params consistency: ${prose.ok ? 'PASS' : 'FAIL'}`);
    if (!prose.ok) { ok = false; for (const iss of prose.issues) lines.push(`    ✗ [${iss.gate}/${iss.code}] ${iss.message}`); }
    else lines.push('    ✓ the tax explanation states the true inequality direction and the correct charged/nil branch');
  } else {
    lines.push('GATE 12/13/14 — international parity / currency-scale / double-tax: N/A (not an international-family drill)');
  }

  // (G-a…G-e) RISK & UNCERTAINTY family — probability-sum / ENPV consistency / sensitivity reconciliation
  // / RADR composition+ordering / VaR tail + duration bounds. Only the kind's own gate data is set.
  if (drill._riskGate) {
    const g = drill._riskGate;
    const run = (label: string, res: { ok: boolean; issues: { gate: string; message: string }[] }, pass: string) => {
      lines.push(`${label}: ${res.ok ? 'PASS' : 'FAIL'}`);
      if (!res.ok) { ok = false; for (const iss of res.issues) lines.push(`    ✗ [${iss.gate}] ${iss.message}`); } else lines.push(`    ✓ ${pass}`);
    };
    if (g.probabilities) run('GATE G-a — probabilities sum to 1', validateProbabilitySum(g.probabilities), 'scenario probabilities are exhaustive and mutually exclusive');
    if (g.enpv) run('GATE G-b — ENPV = Σ(p×NPV)', validateEnpvConsistency(g.enpv.scenarios, g.enpv.value), 'ENPV is the probability-weighted mean of the scenario NPVs');
    if (g.sensitivity) run('GATE G-c — sensitivity reconciliation', validateSensitivityReconciliation(g.sensitivity), 'variable margin zeros the NPV; discount-rate sensitivity divides by the original rate, not the bare IRR−r [S4]');
    if (g.radr) run('GATE G-d — RADR composition + ordering', validateRadrOrdering(g.radr.raw, g.radr.computed), 'RADR = the CAPM-composed project WACC; higher-risk project carries the higher rate');
    if (g.varDur) run('GATE G-e — VaR tail + duration bounds', validateVarAndDuration(g.varDur.raw, g.varDur.computed), 'one-tail z matches the stated confidence; each duration ≤ its project life');
  } else {
    lines.push('GATE G-a…G-e — risk & uncertainty: N/A (not a risk-family drill)');
  }

  // (GATES 15-19) FX HEDGING family — whole-contract integrity / basis-decay reconciliation /
  // currency-direction integrity / premium-currency check / best-method verdict integrity. Only
  // the fields the kind actually used are set (a swap carries no wholeContract/basisDecay data).
  if (drill._fxGate) {
    const g = drill._fxGate;
    const run = (label: string, res: { ok: boolean; issues: { gate: string; message: string }[] }, pass: string) => {
      lines.push(`${label}: ${res.ok ? 'PASS' : 'FAIL'}`);
      if (!res.ok) { ok = false; for (const iss of res.issues) lines.push(`    ✗ [${iss.gate}] ${iss.message}`); } else lines.push(`    ✓ ${pass}`);
    };
    if (g.wholeContract) { const w = g.wholeContract; run('GATE 15 — whole-contract integrity', validateWholeContractIntegrity(w.exposure, w.contract_size, w.contracts, w.residual, w.residual_policy, w.home_from_residual), 'contracts round to a whole number; the residual matches the declared policy'); }
    if (g.basisDecay) { const b = g.basisDecay; run('GATE 16 — basis-decay reconciliation', validateBasisDecayReconciliation(b.spot0, b.futures0, b.months_to_expiry, b.months_to_transaction, b.unexpired_basis, b.lock_in_rate), 'unexpired basis declines linearly to zero at expiry; lock-in = futures₀ + unexpired basis (two-route self-check passes)'); }
    for (const cd of g.currencyDirection) run('GATE 17 — currency-direction integrity', validateCurrencyDirectionIntegrity(cd.foreignAmt, cd.rate, cd.homeAmt, cd.dir, cd.direction, cd.side, cd.expectedSide), 'every conversion reconciles to the declared quote direction; the instrument side matches expectation');
    if (g.premiumCurrency) { const p = g.premiumCurrency; run('GATE 18 — premium-currency check', validatePremiumCurrency(p.premium_pct, p.contracts, p.contract_size, p.premium), 'premium = premium% × contracts × contract size, all-in, no proration'); }
    if (g.bestMethod) { const m = g.bestMethod; run('GATE 19 — best-method verdict integrity', validateBestMethodVerdict(m.direction, m.results, m.statedBestMethod, m.statedMargin), 'the recommended method is the computed best, with the correct margin'); }
    run('GATE 17b — quote-sentence structural integrity', validateQuoteSentencePresence(g.quoteSentence.context_text, g.quoteSentence.dir, g.quoteSentence.foreign, g.quoteSentence.home), 'the canonical code-generated quote-direction sentence is present verbatim — prose cannot diverge from the parameter');
  } else {
    lines.push('GATE 15–19 — fx-hedging: N/A (not an fx-hedge-family drill)');
  }

  return { ok, lines };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ═════════════════════════════════════════════════════════════════════════════
// NARRATIVE PIPELINE (#2) — discursive drills marked against an authored rubric.
// CONCEPTUAL-ONLY: interprets/evaluates a GIVEN output; NEVER computes (overlap ruling — D1 ≠ calc #3
// VaR, D5 ≠ calc #10 K3). CLAIM CEILING: the rubric + aggregation + copy/anchor/coverage checks are
// code-owned; the per-criterion QUALITY verdict is MODEL-graded (never "code owns the marks").
// v1 = AUTHORING-TIME gate only (no live wiring). Design: docs/NARRATIVE_MARKING_DESIGN.md.
// ═════════════════════════════════════════════════════════════════════════════

interface NarrativePlan {
  /**
   * Plan id — a free string, deliberately NOT a closed union.
   *
   * It was `'D1'|'D2'|'D3'|'D4'|'D5'`, which made adding a sixth plan a TYPE edit rather than a
   * data edit — a hard ceiling on authoring for no safety gained (`scripts/` is outside
   * `tsconfig.json`'s include, so the union was never compiler-enforced on this file anyway;
   * it only ever constrained the author reading it). Uniqueness is asserted at runtime instead
   * (`assertNarrativePlanIds`), which is the property that actually matters: two plans sharing
   * an id would make `--narrative-only` ambiguous.
   */
  id: string;
  /**
   * The paper this drill is FOR — declared, never defaulted.
   *
   * An optional field defaulting to 'AFM' would have been a smaller diff and is the wrong
   * shape: `paper` decides the syllabus map the LO is looked up in, the skill vocabulary the
   * rubric is written against, the authoring persona, the teaching-reveal prompt AND the
   * `paper_code` written to the row. A plan that forgot to state it would not fail — it would
   * quietly author an SBL drill as AFM. Same reasoning as `skill` below: a property of what the
   * drill IS is declared, not inferred.
   */
  paper: GeneratorPaper;
  lo_code: string;              // primary tag — a code in THIS PAPER's syllabus map (validated at build time)
  covers: string[];            // all LOs this drill exercises (per-criterion `lo`, for coverage journalling)
  level: 2 | 3;
  region: string;
  sector: string;
  heading: string;             // STABLE model_answer first line — the area-entry rank key (lib/acca/area-entry.ts)
  brief: string;               // conceptual-only task description fed to the author prompt
  /**
   * The professional skill this drill is DESIGNED to demand — declared per plan, never derived.
   *
   * WHY NOT `deriveSkillTag` (fixed 2026-08-01). Routing this through the rotation looks right
   * and does not work, for a reason worth writing down: every batch caller invokes
   * `buildSpecsForList([oneLo])[0]`, and `sectionIdx` is LOCAL TO EACH CALL, so the index is
   * always 0 and the rotation always returns pool[0]. For sections B and E that is
   * `analysis_and_evaluation`; for section A it is `communication`. That single fact explains
   * the entire published AFM distribution — 47 quantitative B/E drills tagged
   * analysis_and_evaluation and the one section-A drill tagged communication. The rotation was
   * never bypassed; it was defeated by being called one LO at a time.
   *
   * So routing the narrative batch through it would have replaced 8 NULLs with 8 more
   * `analysis_and_evaluation` — the same gap in a different colour.
   *
   * Declared per plan instead, which is also the more honest mechanism: the plan already states
   * what the drill demands, and the tag is fed to the author prompt as a STEER ("the
   * model_answer should demonstrate it"). An author who knows D3 is built to refute the CFO's
   * premise can say so; a rotation cannot know it.
   */
  skill: string;
  /**
   * The failure mode this drill's golden BAD is DESIGNED to commit, and what it does.
   *
   * Absent on every AFM plan, and that absence is what keeps AFM's prompt byte-identical: the AFM
   * corpus was authored to one fixed backbone (exactly F1/F5/F4 on every drill), which
   * `goldenBadBlock` returns verbatim when this is unset. Present on SBL plans, where one
   * evidenced mode per drill IS the batch design — see docs/SBL_BATCH_A_PLAN.md.
   */
  designed_bad?: {
    /**
     * THE N4 CONTRACT — deterministic modes ONLY (F1, F4, F5).
     *
     * ⚠️ THIS IS NARROWER THAN "the modes the BAD commits", DELIBERATELY, AND THE NARROWING IS
     * THE WHOLE FIX (Grant-ruled 2026-08-19, ruling (b)). `checkRule23` requires EVERY entry here
     * to be raised, and it can only raise three modes without the model's cooperation: F1 via
     * `scenarioCopyOverlap`/`longestVerbatimRun`, F4 via `hasConclusion`, F5 via `missingAnchors`.
     * Everything else needs a grader that was explicitly told to be conservative to volunteer a
     * flag — and a BAD that answers the adjacent question simply reads as "criterion not
     * addressed", so it scores `no` with no flag at all.
     *
     * MEASURED over runs 2 and 3 (2026-08-19): N4 refused a BAD 15 times and the unraised mode
     * was F2, F7 or F10 EVERY time — never F1, F4 or F5. The only drill to clear N1–N6, twice,
     * was the only one whose designed modes were both deterministic.
     *
     * Listing a mode here that N4 cannot raise does not make the gate stronger; it makes the
     * gate fail on a drill that is fine. The root cause is `evidenced` below.
     */
    flags: string[];
    /**
     * The catalogue mode this BAD exists to teach, when N4 cannot verify it.
     *
     * The BAD still COMMITS it — a real bad answer fails several ways at once, and one failing
     * in exactly one way is the artificial object. It is required as a disqualifier on the
     * criteria it trips, and named in the `full_reveal`, so the teaching is unchanged. What it
     * is NOT is a promise that the marker demonstrably identified it.
     *
     * ⚠️ CLAIM CEILING: a green N4 on an SBL drill means "the GOOD scores in band, the BAD scores
     * below it, and the deterministic modes were raised". It does NOT mean the marker identified
     * the evidenced mode. Do not report it as though it did.
     *
     * Closing that gap is `AFM_SURFACED.md`'s open item: make the grader raise a flag whenever
     * `met !== 'yes'`. It moves PIN6 and AFM's gating, so under P-M1 it ships as its own change
     * with its own evidence, never bundled with content.
     */
    evidenced?: string;
    /**
     * The teaching headline, where the F-CODE CANNOT NAME IT.
     *
     * ⚠️ F-CODES ARE MARKING MODES; CATALOGUE MODES ARE TEACHING FAILURES; THEY ARE NOT 1:1, and
     * F10 is the proof. Its own text is "no scepticism / commercial acumen" — ONE mode, TWO
     * skills — which is already documented as the reason N6a can never say WHICH skill a rubric
     * demands. The same limitation defeats deriving a teaching headline from it: told only
     * "never performing the skill", pass 2 fell back to the persona's first catalogue entry.
     *
     * 📐 MEASURED 2026-08-19: the F-code map fixed 4 of 5 SBL reveals. The fifth was SBL-A4, the
     * F10 drill — and the one whose entire design is M7, the zero-credit rule. Set explicitly
     * where the code is ambiguous; leave unset where the F-code names the failure exactly.
     */
    teaches?: string;
    brief: string;
  };
}

// Code-owned default bands (fraction of total_marks). Narrative marking's band→verdict is code-owned.
const NARRATIVE_BANDS = [
  { min: 0, label: 'fail' },
  { min: 0.5, label: 'pass' },
  { min: 0.7, label: 'good' },
  { min: 0.85, label: 'excellent' },
];

const NARRATIVE_PLAN: NarrativePlan[] = [
  {
    // Interpreting a GIVEN simulation output: appraise the statistics and reach a conclusion.
    // The dominant demand is appraisal, not challenge — a_and_e is the honest tag.
    paper: 'AFM', id: 'D1', lo_code: 'B1b', covers: ['B1b'], level: 2, skill: 'analysis_and_evaluation', region: 'Vietnam',
    sector: 'a deep-water port / container-terminal expansion project',
    heading: '**Monte Carlo simulation — interpreting the simulation output**',
    brief:
      'B1b (L2, discursive) — Monte Carlo. The scenario PRINTS a GIVEN simulation output for the project ' +
      '(e.g. the mean/expected NPV, the standard deviation of NPV, the probability of a negative NPV, and a ' +
      'stated project value-at-risk figure at a named confidence level). The requirement asks the candidate to ' +
      'INTERPRET that output: what the simulation says about the likelihood of project success, and how to read ' +
      'the value-at-risk figure. CONCEPTUAL-ONLY — the candidate does NOT run the simulation and does NOT ' +
      'compute VaR (that is a different, calculator-owned skill). Every figure in the scenario is GIVEN. The ' +
      'answer must USE the given figures in its interpretation (own-figure discipline, F9).',
  },
  {
    // Four instruments weighed against three BINDING constraints, ending in a committed
    // recommendation. Proposing a commercially viable solution under real constraints.
    paper: 'AFM', id: 'D2', lo_code: 'B3a', covers: ['B3a', 'B3b', 'B3c'], level: 3, skill: 'commercial_acumen', region: 'Kenya',
    sector: 'a renewable-energy (solar-plus-storage) developer',
    heading: '**Sources of finance — appropriateness for the organisation**',
    brief:
      'B3a/B3b/B3c (L3, discursive) — sources of finance including Islamic finance (B3b) and green finance ' +
      '(B3c). The scenario names an organisation with a specific financing need and stated constraints ' +
      '(e.g. an amount, a stance on gearing/dilution, an ethical or sustainability mandate). The requirement ' +
      'asks the candidate to ASSESS the appropriateness of a range of sources for THIS organisation — the range ' +
      'must include an Islamic-finance instrument (e.g. sukuk) and a green instrument (e.g. a green bond), ' +
      'assessed against the organisation\'s position and constraints, ending in a justified recommendation. ' +
      'CONCEPTUAL-ONLY — no computation; assess appropriateness, do not price anything.',
  },
  {
    // Built to REFUTE a named person's stated premise (the CFO's) using capital-structure
    // theory. Questioning an assertion is the definition of the scepticism skill.
    paper: 'AFM', id: 'D3', lo_code: 'B3i', covers: ['B3i'], level: 3, skill: 'scepticism', region: 'Chile',
    sector: 'an established mining-and-metals group considering a large recapitalisation',
    heading: '**Capital structure — theory and practical impact**',
    brief:
      'B3i (L3, discursive) — capital-structure theory ONLY: (i) Modigliani & Miller before and after tax; ' +
      '(ii) static trade-off theory; (iii) pecking-order; (iv) agency effects. The scenario names a firm ' +
      'proposing a change in capital structure with stated specifics (current gearing, a tax rate, a stated ' +
      'director view). The requirement asks the candidate to ASSESS the impact of the financing/capital-structure ' +
      'change using the theories, applied to the firm. CONCEPTUAL-ONLY — no WACC computation; the theories are ' +
      'the lens. Do NOT drift into duration/convexity (that is a different LO).',
  },
  {
    // Applies BSOP and then CHALLENGES ITS ASSUMPTIONS — constant volatility against
    // concession-dependent toll revenue, unobservable asset value. Questioning a model's
    // premises, not just using it.
    paper: 'AFM', id: 'D4', lo_code: 'B4d', covers: ['B4d'], level: 2, skill: 'scepticism', region: 'Indonesia',
    sector: 'a highly-geared toll-road concession company and its lending banks',
    heading: '**Option pricing models — role in valuing equity, debt and default risk**',
    brief:
      'B4d (L2, discursive) — the ROLE of option pricing models (such as the BSOP model) in assessing the value ' +
      'of equity, the value of debt, and default risk. The scenario names a geared firm where equity can be ' +
      'framed as a call option on the firm\'s assets (struck at the debt repayment). The requirement asks the ' +
      'candidate to EXPLAIN the role of the model: how equity-as-call, debt-as-(riskless-debt-minus-put), and ' +
      'default risk are read from the framework. CONCEPTUAL-ONLY — the candidate does NOT compute a BSOP value ' +
      '(that is the calculator-owned skill); explain what the model contributes and its limitations.',
  },
  {
    // Trapped cash and a financing choice: propose practical uses for blocked funds, weigh
    // Eurobond against GDR, and commit. Business consequences and a viable recommendation.
    paper: 'AFM', id: 'D5', lo_code: 'B5c', covers: ['B5c', 'B5d'], level: 3, skill: 'commercial_acumen', region: 'Nigeria',
    sector: 'a multinational consumer-goods parent with a subsidiary facing capital controls',
    heading: '**Exchange controls and international sources of finance**',
    brief:
      'B5c/B5d (L3, discursive) — (B5c) evaluate the significance of exchange controls for an investment ' +
      'decision and strategies for dealing with restricted remittance, AND (B5d) assess the costs and benefits ' +
      'of alternative sources of finance in the international equity and bond markets. The scenario names a ' +
      'parent/subsidiary where remittance is restricted and international financing is on the table, with stated ' +
      'specifics. The requirement asks the candidate to EVALUATE the significance of the controls and the ' +
      'strategies, and to assess international financing options. CONCEPTUAL-ONLY — the candidate does NOT ' +
      'compute a blocked-funds NPV (that is calculator #10 K3); evaluate strategy and significance in words.',
  },

  // ── PS-CELL BATCH (2026-08-02) — three drills authored into NAMED (area × skill) cells that the
  // live corpus could not serve. Measured against what AFM content actually EXAMINES: Mock 1's 8
  // requirements + the 5 published practice cases' professional_skill_tags. These are the three
  // highest-marks-at-stake unservable cells; four more remain (B5×communication, E1×a_and_e,
  // E3×scepticism, A3×communication) and are deliberately NOT authored here — three first, to prove
  // the seam fix produces rubrics that DEMAND the declared skill rather than mentioning it.
  //
  // These are the FIRST plans authored with `plan.skill` reaching the pass-1 author (SKILL_DEMAND).
  // Every earlier plan's rubric was written by a call that did not know the drill's skill.
  {
    // CELL: E2 × scepticism (23 examined marks — Solenne (iii) E2b 8, Aldebrino (ii) E2a 8,
    // Kestrel (ii) E2a 7). E2a, not E2b: E2b is the fxhedge calculator's LO and a conceptual drill
    // there would sit on top of calc #11. The act is challenging a "we are fully hedged" claim —
    // transaction cover bought, translation and ECONOMIC exposure left unmanaged.
    paper: 'AFM', id: 'D6', lo_code: 'E2a', covers: ['E2a'], level: 3, skill: 'scepticism', region: 'Thailand',
    sector: 'an automotive-components exporter selling into three currency blocs',
    heading: '**Foreign-exchange exposure — testing a claim that the group is fully hedged**',
    brief:
      'E2a (L3, discursive) — the impact on an organisation of translation, transaction and economic ' +
      'exposure, and how each can be managed. The scenario names an exporter whose GROUP TREASURER has ' +
      'stated to the board, in quotable words, that the group is "fully hedged" against currency risk — ' +
      'backed by a stated policy that covers a named proportion of contracted receipts for a named ' +
      'horizon. The scenario also supplies the facts that claim does not survive: a competitor pricing ' +
      'in a different currency, a long-run cost base in one currency and revenue in another, and a ' +
      'foreign subsidiary carried in the consolidated accounts. The requirement asks the candidate to ' +
      'ASSESS the treasurer\'s claim — which exposures the policy actually covers, which it leaves ' +
      'untouched, and what that means for the board\'s reliance on it. CONCEPTUAL-ONLY — the candidate ' +
      'does NOT price or compute any hedge (that is calculator #11, E2b); the given policy is a driver.',
  },
  {
    // CELL: E2 × commercial_acumen (15 examined marks — Aldebrino (ii) E2a 8, Kestrel (ii) E2a 7).
    // E2c rather than a second E2a: E2c ("advise on netting and matching... minimising FOREX
    // transaction costs and the management of market barriers") is commercial by construction, has
    // ZERO published drills, and keeps this drill from duplicating D6's scenario. The cell is keyed
    // on the 2-char area prefix, so any E2* satisfies it — E2c satisfies it AND adds LO coverage.
    paper: 'AFM', id: 'D7', lo_code: 'E2c', covers: ['E2c'], level: 3, skill: 'commercial_acumen', region: 'Chile',
    sector: 'a mining-services group with five trading subsidiaries across three continents',
    heading: '**Netting and matching — whether a group netting arrangement earns its cost**',
    brief:
      'E2c (L3, discursive) — bilateral and multilateral netting and matching as tools for minimising ' +
      'FOREX transaction costs, and the management of market barriers to the free movement of capital ' +
      'and other remittances. The scenario names a group weighing whether to establish a multilateral ' +
      'netting centre. ' +
      // ── WHY THE ECONOMICS ARE STATED, NOT DERIVABLE (fix, 2026-08-02) ──
      // The first version of this brief supplied the RAW drivers (invoice count, average value, a
      // %-of-value banking cost, a % volume reduction) and let the author characterise the result.
      // It produced a rubric asserting payback "well within" an 18-month threshold and a committed
      // "proceed" — on figures that actually give a NEGATIVE annual net benefit of USD 69,472 and no
      // payback at all. All six gates passed: N1/N4 grade rubric coverage and GOOD-vs-BAD separation,
      // the prompt's COHERENCE rule covers only STATISTICAL shape claims, and the narrative pipeline
      // has no numeric verifier at all (that moat is the CALCULATOR families'). A multi-step derivable
      // chain in a conceptual drill is therefore ungated by construction. The fix is to remove the
      // chain: state the OUTCOME as a given treasury-analysis figure, exactly as D1/D8 state a
      // simulation output as given, leaving one division for a human to check before insert.
      'The scenario must STATE, as GIVEN outputs of a treasury analysis already performed, the ' +
      'expected ANNUAL NET SAVING after running costs, the one-off SET-UP COST, and the RESULTING ' +
      'PAYBACK PERIOD in months — and must NOT supply the raw drivers those were derived from (no ' +
      'invoice counts, no average invoice values, no per-transaction %-of-value cost, no % volume ' +
      'reduction). The three stated figures must be mutually consistent: set-up ÷ annual net saving, ' +
      'expressed in months, must equal the stated payback. Set the payback CLOSE to the board\'s ' +
      'stated threshold (either just inside or just outside it) so the recommendation is a genuine ' +
      'commercial judgement rather than an arithmetic formality. ' +
      'The scenario also names at least one subsidiary whose jurisdiction\'s exchange controls bar it ' +
      'from participating, and one further board constraint (e.g. no new headcount). The requirement ' +
      'asks the candidate to ADVISE the board whether to proceed, on what basis, and how to handle the ' +
      'restricted subsidiary. CONCEPTUAL-ONLY — the candidate does NOT build a netting matrix, does ' +
      'NOT compute a saving and does NOT compute a payback; every figure is GIVEN and the judgement is ' +
      'commercial, not arithmetic. No criterion may credit a computed figure.',
  },
  {
    // CELL: B1 × scepticism (15 examined marks — Brecon (ii) B1b 8, Halvard (ii) B1b 7). BOTH
    // examined requirements are B1b, so B1b is the demand exactly. DISTINCT FROM D1, which is also
    // B1b: D1 INTERPRETS a given simulation output (analysis_and_evaluation — appraise what it
    // says). This one CHALLENGES the output's credibility — the input distributions, the
    // independence assumption, and a VaR being read as a worst case. Same LO, different act; that
    // is precisely the a_and_e / scepticism split the cell measures.
    paper: 'AFM', id: 'D8', lo_code: 'B1b', covers: ['B1b'], level: 2, skill: 'scepticism', region: 'Colombia',
    sector: 'a hydroelectric generation project promoted to a utility board',
    heading: '**Monte Carlo simulation — challenging the assumptions behind the output**',
    brief:
      'B1b (L2, discursive) — Monte Carlo simulation: the significance of the simulation output and the ' +
      'assessment of the likelihood of project success, and the measurement and interpretation of ' +
      'project value at risk. The scenario PRINTS a GIVEN simulation output (mean NPV, standard ' +
      'deviation, probability of a negative NPV, a project value-at-risk at a named confidence level) ' +
      'AND a named PROJECT SPONSOR who has told the board, in quotable words, what that output proves ' +
      '— including reading the value-at-risk figure as the worst the project can do. The scenario also ' +
      'states the facts that undermine the sponsor\'s reading: where the input distributions came from ' +
      '(e.g. management\'s own estimates, or a single historical period), and that two of the key ' +
      'variables were modelled as independent when the scenario shows they plainly move together. The ' +
      'requirement asks the candidate to ASSESS how much reliance the board can place on the ' +
      'simulation and on the sponsor\'s reading of it. CONCEPTUAL-ONLY — the candidate does NOT run a ' +
      'simulation and does NOT compute VaR (that is calculator #3); every figure is GIVEN. The answer ' +
      'must USE the given figures in its challenge.',
  },

  // ── PS-CELL BATCH 2 (2026-08-02) — the remaining measured-unservable cells, MINUS one.
  // E1 × analysis_and_evaluation is deliberately NOT here: it may close without authoring if
  // `55181aa8` is re-tagged (adjudication pending, Grant's ruling). Authoring it now would risk a
  // duplicate server for a cell that is about to close for free.
  {
    // CELL: B5 × communication (16 examined marks — Solenne (ii) B5b, Mock 1). The LARGEST
    // remaining cell and the one a CASE can never close: C4 forbids `communication` on any Section
    // B case, so only a drill can serve it.
    //
    // B5c, not B5b: B5b is quantitative (calc #10 owns currency-NPV) and a conceptual drill there
    // would sit on top of it. B5c is discursive and already carries D5 (`32ef124c`,
    // commercial_acumen) — deliberately a DIFFERENT act on a different framing: D5 weighs financing
    // options and commits; this one explains a settled decision to an audience that must act on it.
    paper: 'AFM', id: 'D9', lo_code: 'B5c', covers: ['B5c'], level: 3, skill: 'communication', region: 'Vietnam',
    sector: 'a European packaging group and its Vietnamese manufacturing subsidiary',
    heading: '**Exchange controls — briefing a local operating board on restricted remittance**',
    brief:
      'B5c (L3, discursive) — the significance of exchange controls for an investment decision and ' +
      'strategies for dealing with restricted remittance. THE AUDIENCE IS THE POINT OF THIS DRILL. ' +
      'The scenario names a group whose subsidiary sits under exchange controls, and a SPECIFIC ' +
      'NON-FINANCIAL AUDIENCE that must be briefed and must act: the subsidiary\'s local operating ' +
      'board (e.g. its operations and sales directors, named as such — not treasury people), who ' +
      'were promised a distribution that did not arrive and are now deciding whether to commit to a ' +
      'local capacity expansion. State the audience, what they must decide, and the fact that trust ' +
      'has already been damaged. ' +
      'FIGURES ARE GIVEN OUTPUTS ONLY (P-N1): state the accumulated undistributed profits, the ' +
      'annual remittance cap the central bank permits, and the resulting number of years to release ' +
      'the balance, all AS STATED figures of an analysis already done. Do NOT supply the raw drivers ' +
      'those came from and do NOT require any arithmetic — the three stated figures must be ' +
      'mutually consistent (balance ÷ annual cap = the stated number of years). ' +
      'The requirement asks the candidate to set out the key content of a briefing to that local ' +
      'board. CONCEPTUAL-ONLY — no computation of a blocked-funds NPV (calculator #10 K3) and no ' +
      'hedge pricing; the skill assessed is making a technical constraint usable by the people who ' +
      'must act on it.',
  },
  {
    // CELL: E3 × scepticism (12 examined marks — Castlereagh (ii) E3a, practice). E3a is E3's ONLY
    // LO. Conceptual-only: calculator #12 (irhedge) owns every futures/collar/swap computation, so
    // this drill interprets a GIVEN hedge outcome and challenges what is claimed for it.
    //
    // The sceptical object is doctrinally apt rather than invented: irhedge FR1 (2026-07-24) swept
    // the word "guaranteed" out of all four live E3a drills in favour of "effective borrowing cost
    // locked in", because a futures hedge locks a rate approximately and does not eliminate risk.
    // A drill whose whole job is refuting a treasurer who claims exactly that is the fenced
    // misconception made into a teaching object.
    paper: 'AFM', id: 'D10', lo_code: 'E3a', covers: ['E3a'], level: 3, skill: 'scepticism', region: 'Poland',
    sector: 'a cold-chain logistics operator financing a distribution-hub build',
    heading: '**Interest-rate hedging — testing a claim that the rate risk has been eliminated**',
    brief:
      'E3a (L3, discursive) — the appropriateness of FRAs, interest-rate futures, swaps and options ' +
      '(including collars) for a given hedging requirement. The scenario names a borrower that has ' +
      'ALREADY placed an interest-rate futures hedge against a forthcoming loan, and a named GROUP ' +
      'TREASURER who has told the board, in QUOTABLE WORDS INSIDE QUOTATION MARKS, that the ' +
      'borrowing rate is now fixed and the interest-rate risk has been eliminated. ' +
      'The scenario must also state the facts that claim does not survive: that the hedge covers a ' +
      'stated notional and a stated period while the borrowing is for a larger amount or a longer ' +
      'period; that contracts are whole-number instruments so the cover is approximate; that basis ' +
      'was not zero when the hedge was closed; and that the loan is a floating-rate facility with a ' +
      'covenant the treasurer has not mentioned. ' +
      'FIGURES ARE GIVEN OUTPUTS ONLY (P-N1): state the effective rate the hedge actually achieved ' +
      'and the residual unhedged amount AS STATED results of an analysis already performed. Do NOT ' +
      'supply contract counts, tick values, opening/closing futures prices or a basis-decay ' +
      'calculation, and require NO arithmetic of the candidate. ' +
      'The requirement asks the candidate to ASSESS the treasurer\'s claim and advise the board what ' +
      'residual interest-rate exposure it still carries. CONCEPTUAL-ONLY — the candidate does NOT ' +
      'compute a hedge, a lock-in rate or a number of contracts (that is calculator #12).',
  },
  {
    // CELL: A3 × communication (6 examined marks — Castlereagh (iv) A3a, practice). A3 has ZERO
    // published drills of any skill, so this is an AREA gap, not merely a skill gap.
    //
    // WHY AUTHORED RATHER THAN CLOSED BY REVIEWING `47c9d5ce`: that candidate is A3a, tagged
    // `communication` — but the tag is the section-A rotation default (`pool[0]` for section A IS
    // communication), and its actual content is a SCEPTICISM drill: it refutes a named CFO's quoted
    // ESG claim on two counts and commits to "should not proceed on current terms". Publishing it
    // under a communication tag would ship exactly the dishonest tag this whole workstream exists to
    // remove. It also predates the narrative pipeline and has NO `answer_schema` at all, so N1–N6
    // cannot gate it. Full adjudication in the batch-2 review pack.
    //
    // A3c rather than A3a: stakeholder management is the natural home for a communication demand,
    // A3c has zero drills so this adds LO coverage, and it leaves `47c9d5ce`'s A3a ground clear for
    // whatever Grant rules about it.
    paper: 'AFM', id: 'D11', lo_code: 'A3c', covers: ['A3c'], level: 3, skill: 'communication', region: 'Peru',
    sector: 'a copper-mining group and the farming communities along its tailings-water catchment',
    heading: '**Stakeholder management — communicating a remediation commitment to an affected community**',
    brief:
      'A3c (L3, discursive) — how an organisation manages its stakeholder groups as part of its ' +
      'social responsibilities. THE AUDIENCE IS THE POINT OF THIS DRILL. The scenario names a ' +
      'mining group that has ALREADY decided and funded a water-remediation programme after a ' +
      'discharge incident, and a SPECIFIC NON-TECHNICAL AUDIENCE that must be addressed: the elected ' +
      'representatives of the affected farming communities, who received an earlier assurance that ' +
      'proved wrong and are deciding whether to accept the programme or escalate to the regulator. ' +
      'Name the audience, what they must decide, and the fact that a previous assurance failed. ' +
      'FIGURES ARE GIVEN OUTPUTS ONLY (P-N1): state the committed remediation spend, the monitoring ' +
      'frequency and the number of households affected AS STATED figures. No derivation, no ' +
      'arithmetic required of the candidate. ' +
      'The requirement asks the candidate to set out how the group should communicate the ' +
      'commitment to that audience and what the communication must contain. CONCEPTUAL-ONLY — this ' +
      'is not an ESG-appraisal drill and the candidate does NOT assess whether the programme is ' +
      'adequate; the skill assessed is making a technical remediation commitment credible and ' +
      'actionable for the people it affects, given that trust has already been broken.',
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════
  // SBL BATCH A — section A (Leadership), 0/12 covered. Spec + rulings: docs/SBL_BATCH_A_PLAN.md
  //
  // TWO CONDITIONS PICKED THESE FIVE: zero coverage, AND an evidenced failure mode from
  // docs/evidence/SBL_FAILURE_CATALOGUE.md to build the golden BAD against. `A3b` (IESBA codes)
  // and `A1b` (entrepreneurship) meet the first and fail the second — zero hits across all seven
  // examiner reports — so their BAD would have to be invented. That is an exclusion about
  // EVIDENCE, not about safety: a zero-hit topic is examinable and probably just was not examined
  // in these ten sittings (catalogue caveat 2). Both stay on the build list.
  //
  // Every brief obeys the two standing rulings: NO MODEL NAMED IN THE STEM (MJ25 p.4 / MJ26 p.4 —
  // a noun in the requirement summons an unrequested model and answers go to the model), and the
  // rubric is the examiners' four-part development test at 2 marks with the 1-mark undeveloped
  // tier (MJ25 p.4, SD25 p.4, MJ26 p.5). The second is carried by PAPER_NARRATIVE_RULES.SBL, so
  // it is not repeated in every brief.
  // ═══════════════════════════════════════════════════════════════════════════════════════
  {
    // M2, the examiners' #1 stated reason since MJ25. The scenario gives BEHAVIOUR, not labelled
    // styles — if it labelled them, identifying one would be reading rather than analysis.
    paper: 'SBL', id: 'SBL-A1', lo_code: 'A2b', covers: ['A2b'], level: 2, skill: 'analysis',
    region: 'Vietnam', sector: 'a household-appliance manufacturer restructuring after a failed export push',
    heading: '**Leadership style — reading the style from the behaviour**',
    brief:
      'A2b (L2, discursive) — the leadership style appropriate to manage strategic change. The '
      + 'scenario describes THREE SEPARATE EPISODES of a NAMED CEO\'S ACTUAL BEHAVIOUR during a '
      + 'restructure: what they did, what they said to whom, how a decision was taken and who was '
      + 'consulted. The episodes must differ from one another in a way a reader can see — one '
      + 'directive, one consultative, one delegating would be a natural spread, but the scenario '
      + 'must SHOW the behaviour and NEVER LABEL IT. The requirement asks the candidate to identify '
      + 'the styles in evidence and advise which style fits the change NOW facing the organisation '
      + '(a second, different change, stated in the scenario). CONCEPTUAL-ONLY. '
      + 'CRITICAL — the stem must not name any leadership or change model, and no exhibit heading '
      + 'may name one either. The object of the requirement is the STYLE; the change programme is '
      + 'the context, not the answer.',
    designed_bad: {
      flags: ['F5'],
      evidenced: 'F7',
      brief:
        'it writes competently about THE CHANGE PROGRAMME — what the restructure involves, why it is '
        + 'needed, how it should be sequenced — and reaches for a named change-process model to '
        + 'structure that discussion. Leadership STYLE is mentioned at most in passing. It never '
        + 'uses the behavioural episodes as evidence of a style. This is the MJ26 p.4 failure '
        + 'reproduced exactly, so it must read as a serious, well-informed answer to the question '
        + 'the candidate wished had been set.',
    },
  },
  {
    // M4. Culture through ARTEFACTS is what makes the model reachable without the stem naming it —
    // so the BAD's reach for it is the candidate's choice, not something the stem invited.
    paper: 'SBL', id: 'SBL-A2', lo_code: 'A2d', covers: ['A2d'], level: 3, skill: 'analysis',
    region: 'Poland', sector: 'a regional logistics group moving from haulage into contract warehousing',
    heading: '**Culture and strategy — what the artefacts reveal about what is possible**',
    brief:
      'A2d (L3, discursive) — the impact of culture on organisational purpose and strategy. The '
      + 'scenario describes the culture ENTIRELY THROUGH ARTEFACTS AND OBSERVABLE PRACTICE: what '
      + 'behaviour gets rewarded and how, who has been promoted and on what basis, what a typical '
      + 'management meeting looks like and who speaks, how mistakes are handled, what the induction '
      + 'covers. NO abstract characterisation of the culture — no sentence beginning "the culture '
      + 'is…". The scenario also states a STRATEGIC AIM the board has committed to which sits '
      + 'awkwardly against those artefacts. The requirement asks the candidate to assess how the '
      + 'culture would help or constrain that stated aim, and to reach a judgement on whether the '
      + 'aim is achievable without changing it. CONCEPTUAL-ONLY. '
      + 'CRITICAL — the stem must not name the cultural web or any other cultural model.',
    designed_bad: {
      flags: ['F5'],
      brief:
        'it describes the cultural web AS A MODEL — naming its elements and explaining what each one '
        + 'means in general — and never connects any element to this organisation\'s stated artefacts '
        + 'or to the strategic aim. Accurate textbook content, zero application. This is the S23 p.9 '
        + 'and D23 p.8 move: correct theory, no reference to the company.',
    },
  },
  {
    // M3, the highest-value mode in the catalogue. THE BAD IS NOT WRONG — that is the point. Every
    // point it makes is correct and it still scores the examiners' own single-mark tier.
    paper: 'SBL', id: 'SBL-A3', lo_code: 'A1a', covers: ['A1a'], level: 3, skill: 'analysis',
    region: 'Kenya', sector: 'a national agricultural co-operative that launched a digital payments platform',
    heading: '**Leadership in formulation and in implementation — the same strategy, two halves**',
    brief:
      'A1a (L3, discursive) — the role of effective leadership in the successful formulation AND '
      + 'implementation of strategy and change. The scenario is an exhibit setting out a strategy '
      + 'that was FORMULATED WELL AND IMPLEMENTED BADLY: the analysis behind it was sound, the '
      + 'opportunity was real and correctly sized, and the rollout then failed on things the '
      + 'scenario states plainly (roles never assigned, a pilot ignored, regional managers hearing '
      + 'about it after launch, no one owning the outcome). The requirement asks the candidate to '
      + 'assess the LEADERSHIP CONTRIBUTION TO EACH HALF SEPARATELY and to say what that comparison '
      + 'shows about where the leadership weakness actually lies. CONCEPTUAL-ONLY. '
      + 'CRITICAL — the stem must not name any leadership-trait framework.',
    designed_bad: {
      flags: ['F4'],
      evidenced: 'F2',
      brief:
        'it identifies FOUR CORRECT POINTS and develops none of them. Each is a true statement about '
        + 'the leadership failure — "roles were not assigned", "the pilot findings were not acted on" '
        + '— stated in one clause and left there, with no assessment of how significant it is, no use '
        + 'of the information given to tie it to this organisation, no consequence and no example '
        + 'from the exhibit. NOTHING IN IT IS WRONG. It scores the examiners\' single-mark tier on '
        + 'every point, and that is exactly what this drill exists to show.',
    },
  },
  {
    // M7 (J24 p.19, SD25 p.9, MJ26 p.9 — no marks awarded). The ONE drill of the five that N6
    // gates: scepticism runs N6b (quoted assertion >=6 words) and N6c (an F10 criterion must
    // anchor on a fact whose key falls inside that quote). Both shape the scenario below.
    //
    // ⚠️ REBUILT 2026-08-20. The first build misclassified two of its three threats, and the cause
    // was that the brief named the SKILL and the SCENARIO SHAPE and never named the THREATS — so
    // the classification was emergent, and an emergent classification against a taxonomy the
    // author is holding from memory is a coin toss. It came up wrong twice:
    //   c2 called an ABSENT independent review a "self-review threat". Self-review needs someone
    //      to re-evaluate their OWN prior judgement and rely on it [SBL-ETH1 S120.6 A3(b), PDF
    //      p.39]. A control that never happened creates no self-review threat — it leaves an
    //      existing threat uncontrolled. Category error, 2 of 10 marks.
    //   c3 assessed a threat to the EXTERNAL AUDITORS' independence, in a note the external
    //      auditors were themselves writing — a different Part of the framework from the one A3d
    //      examines — and rested it on a single firm assertion of compliance, which does not reach
    //      "actual or perceived pressures, including attempts to exercise undue influence"
    //      [S120.6 A3(e)]. It then REQUIRED the candidate to make an accusation the case did not
    //      support, which SKILL_DEMAND_SBL.scepticism names as the failure itself, not a stronger
    //      version of the act.
    //   c1 named self-interest on a BROTHER-IN-LAW's financial interest. Not wrong in substance,
    //      but a brother-in-law is neither "immediate family" (a spouse or equivalent, or
    //      dependent) nor "close family" (a parent, child or sibling who is not immediate family)
    //      under the Code's own glossary [SBL-ETH1, PDF p.371] — so the rubric rested a threat on
    //      a relationship the Code does not enumerate, and marked down the candidate who reached
    //      instead for FAMILIARITY, which is the fitting category for a relationship limb.
    // The brief below therefore NAMES all three threats and the stated fact that must create each,
    // bans the self-review reading outright, and moves the author inside the organisation. The
    // family relationship is constrained to the Code's enumerated terms so the drill cannot turn
    // on a definitional argument. Source of record registered the same day: sources.json SBL-ETH1.
    // KEPT UNCHANGED because all three were on target: the quoted twelve-word assertion, the N6c
    // anchoring requirement, and the golden BAD (scepticism-as-questions, M7).
    paper: 'SBL', id: 'SBL-A4', lo_code: 'A3d', covers: ['A3d'], level: 3, skill: 'scepticism',
    region: 'Colombia', sector: 'a listed construction and infrastructure group bidding for public contracts',
    heading: '**Ethical threats — testing "within the rules"**',
    brief:
      'A3d (L3, discursive) — the nature and impact of ethical threats and the safeguards that '
      + 'prevent or mitigate them. The scenario must carry a DIRECTLY QUOTED ASSERTION FROM A NAMED '
      + 'FINANCE DIRECTOR, at least twelve words long, in double quotes, to the effect that an '
      + 'arrangement is WITHIN THE RULES. The arrangement must be described in enough stated detail '
      + 'that a candidate can show exactly which threats it creates and why the assertion does not '
      + 'settle the question — and the detail must fall short of anything that would justify '
      + 'alleging dishonesty. AT LEAST ONE scenario_fact key must appear VERBATIM INSIDE the quoted '
      + 'sentence (N6c requires the claim to be reachable as an anchor). '
      + 'THE SPEAKER MUST BE THE CONFLICTED OFFICER HIMSELF, asserting in the FIRST PERSON that his '
      + 'own arrangement is within the rules ("...sits below MY authority limit"). Naming him once '
      + 'and then attributing the quote to an unnamed "the finance director" leaves the reader '
      + 'unable to tell whether they are the same person, and N6b cannot see that — it checks only '
      + 'that an attributed quote of six or more words exists. '
      + 'CONCEPTUAL-ONLY. CRITICAL — the stem must not name any ethical-threat taxonomy or code. '
      + '\n'
      + 'THE THREE THREATS THIS SCENARIO IS BUILT TO CREATE, AND THE STATED FACT THAT CREATES EACH. '
      + 'The classification is DESIGNED, not emergent: write the scenario so that exactly these '
      + 'three are present and each rests on a fact the case states outright. '
      + '(1) SELF-INTEREST — a financial or other interest that could inappropriately influence '
      + 'judgement. Create it the way the Code\'s own example does: an officer who is RESPONSIBLE '
      + 'FOR SELECTING A VENDOR while a member of their IMMEDIATE OR CLOSE FAMILY benefits '
      + 'financially from that vendor\'s contract. The relative MUST be a spouse, child, parent or '
      + 'sibling — NOT an in-law, cousin, or friend. A more distant relative is a real-world '
      + 'conflict but sits outside the Code\'s enumerated family terms, and the drill must not turn '
      + 'on a definitional argument. Use the Code\'s own wording — CLOSE FAMILY for a parent, child '
      + 'or sibling, IMMEDIATE FAMILY for a spouse or dependent — never a coined phrase such as '
      + '"direct family": on an ethics drill the vocabulary tracks the Code. '
      + '(2) FAMILIARITY — a long or close relationship making the officer too sympathetic to the '
      + 'vendor\'s interests or too accepting of its work. State the DURATION of the relationship '
      + 'and something that shows acceptance without challenge (renewal without re-tender, scope '
      + 'growth nobody questioned). '
      + '(3) INTIMIDATION — someone INSIDE the organisation deterred from acting objectively by '
      + 'actual or perceived pressure. Give it a NAMED PARTY AND A STATED ACT: a junior employee '
      + 'who raised a concern through a proper channel and was pressured, moved, warned or overruled '
      + 'by a senior figure. A single firm assertion of compliance is NOT intimidation and must not '
      + 'be presented as one — a disagreement is not pressure. '
      + '⛔ DO NOT BUILD A SELF-REVIEW THREAT AND DO NOT LET ONE BE INFERRED. Self-review requires '
      + 'someone to re-evaluate the results of their OWN earlier judgement and rely on it in a '
      + 'current activity. An independent check that never happened is a MISSING SAFEGUARD, not a '
      + 'self-review threat, and the scenario should carry that gap explicitly so it drives a '
      + 'RECOMMENDATION rather than a threat classification. '
      + '⛔ EVERY THREAT ASSESSED MUST BE A THREAT TO THE ORGANISATION AND ITS OWN PEOPLE. A3d is '
      + 'about the entity, so the answer is written by an INTERNAL party (head of internal audit, or '
      + 'the company secretary) to the chair of the audit and ethics committee. Do NOT make the '
      + 'author the external auditors and do NOT ask about auditor independence — that is a '
      + 'different Part of the ethical framework and it is not what this outcome examines. '
      + '\n'
      + 'THE REQUIREMENT asks the candidate to assess the threats the arrangement creates and to '
      + 'recommend the safeguards the committee should adopt, COMMITTING to which package it should '
      + 'put in place. Both a continue-with-safeguards package (recusal plus an independent '
      + 'retrospective review) and an exit package (end the retainer and re-tender) must be '
      + 'defensible on the stated facts, so the scenario must state what the vendor actually '
      + 'delivers and what ending the arrangement would cost the group. ANY COST OR PENALTY THE '
      + 'CANDIDATE IS EXPECTED TO WEIGH MUST CARRY THE STATED REASON IT ARISES — in a scepticism '
      + 'drill a figure the candidate must accept but cannot test is the wrong kind of given. '
      + 'SAFEGUARD CRITERIA CARRY ONE REMEDY EACH. Do not stack recusal, a retrospective review, a '
      + 'conduct investigation and a whistleblower protection into a single 2-mark criterion: every '
      + 'criterion here is worth exactly 2 marks against the same four-limb development test, so a '
      + 'criterion holding four remedies is asking four times the work of its neighbours for the '
      + 'same credit. One remedy (or one tightly-coupled pair) per criterion, each tied to the '
      + 'threat it answers. '
      + '\n'
      + 'GATE REQUIREMENT (N6c) — THIS IS THE GATE THIS DRILL KEEPS FAILING, AND IT INTERACTS WITH '
      + 'THE THREE-THREAT DESIGN ABOVE, SO READ BOTH TOGETHER. Every criterion carrying F10 must '
      + 'list, IN ITS anchor_facts, the scenario_fact whose key sits inside the officer\'s quoted '
      + 'sentence. A criterion may carry MORE THAN ONE anchor fact, and here it MUST: each F10 '
      + 'criterion anchors on BOTH (a) the stated fact that creates the threat it assesses — the '
      + 'family ownership, the relationship duration, the act of pressure — AND (b) the quoted-claim '
      + 'fact. Anchoring only on (a) fails the gate; anchoring only on (b) makes the criterion '
      + 'unmarkable. Both, on every F10 criterion. '
      + 'The reason is not bookkeeping: the marks here are for showing that the officer\'s own '
      + 'assertion does not survive THIS fact, so a criterion that never references the assertion is '
      + 'marking a description of a threat rather than a challenge to a claim. '
      + 'AT LEAST HALF THE TOTAL MARKS must sit on criteria carrying F10 (N6a) — put F10 on every '
      + 'criterion that assesses a threat against the assertion; the safeguard and commitment '
      + 'criteria carry F4. '
      + 'EVERY anchor fact must be a scenario_fact that genuinely appears in context_text with its '
      + 'key verbatim (N2) — do not invent an anchor for a fact the scenario does not state.',
    designed_bad: {
      flags: ['F4'],
      evidenced: 'F10',
      // F10 names two skills and so cannot name this drill's failure. M7 is the failure:
      // J24 p.19, SD25 p.9, MJ26 p.9 — and MJ26 p.9 states that no marks are awarded for it.
      teaches:
        'scepticism performed as questions — raising the right concerns in interrogative form '
        + '("has the board considered…?", "is it clear that…?") and never stating an assessment or '
        + 'committing to a conclusion, in the belief that raising a doubt is itself the sceptical '
        + 'act. The examiners are explicit that this earns no marks at all',
      brief:
        'it performs scepticism AS QUESTIONS. It raises the right concerns in interrogative form — '
        + '"Has the board considered whether…?", "Is it clear that…?", "Should the committee not ask…?" '
        + '— and never states an assessment or reaches a conclusion. Every question is a good '
        + 'question; not one is answered, and no safeguard is recommended. This is the MJ26 p.9 '
        + 'failure, which the examiners say earns no marks at all. '
        + 'DO NOT make the bad answer aggressive or accusatory — over-reaching is a DIFFERENT failure '
        + '(SD25 p.9, MJ26 p.14) and it is taught as a named contrast in the teaching reveal, not '
        + 'here. Two failure directions in one BAD would make the GOOD/BAD separation unverifiable.',
    },
  },
  {
    // M9 is single-sitting and the catalogue says do not build against it alone. It is not alone:
    // M1 is 7/7 and is the deterministically detected half (F1). Both raise without the model layer.
    paper: 'SBL', id: 'SBL-A5', lo_code: 'A3a', covers: ['A3a'], level: 3, skill: 'evaluation',
    region: 'Indonesia', sector: 'a listed water utility serving a fast-growing coastal city',
    heading: '**Responsible leadership — commercially defensible, and still a decision to make**',
    brief:
      'A3a (L3, discursive) — responsible leadership and the creation of public value by acting in '
      + 'the public interest. The scenario states a decision with a GENUINELY DEFENSIBLE COMMERCIAL '
      + 'CASE and a REAL PUBLIC-INTEREST COST, both concrete and both stated as GIVEN outputs — no '
      + 'derivation and no arithmetic required of the candidate (P-N1). Neither side may be a straw '
      + 'man: the commercial case must be one a competent board could accept, and the public cost '
      + 'must fall on named, identifiable people. One exhibit must contain the management team\'s '
      + 'OWN WRITTEN JUSTIFICATION for the decision, in their words, long enough to be lifted. The '
      + 'requirement asks the candidate to evaluate the decision and COMMIT TO A VERDICT. '
      + 'CONCEPTUAL-ONLY. CRITICAL — the stem must not name any stakeholder or ethics model.',
    designed_bad: {
      flags: ['F1', 'F4'],
      brief:
        'it lifts the management team\'s own written justification from the exhibit VERBATIM, '
        + 'including their first-person voice, and adds nothing to it; then it sets out considerations '
        + 'on both sides and stops without landing — "there are arguments either way", "the board will '
        + 'need to weigh these factors". No verdict. This is S23 p.16 (fence-sitting, where the same '
        + 'page records that candidates who DID commit scored well) combined with the copy-paste of '
        + 'MJ26 p.8, where candidates pasted an exhibit\'s words without even changing the pronouns.',
    },
  },
];

/**
 * P-G1 — the batch must be able to say "I did not run". Two silent no-ops closed:
 *  1. Duplicate plan ids made `--narrative-only` ambiguous (it would run BOTH silently).
 *  2. `--narrative-only <typo>` filtered to an EMPTY list and the batch reported
 *     "0/0 passed gates, 0 inserted" — a clean-looking success that measured nothing.
 * Now that `id` is a free string (no closed union to catch a typo at author time), these are the
 * only things standing between a mistyped flag and a batch that appears to have run.
 */
function assertNarrativePlanIds(plans: NarrativePlan[], only?: string, paper?: string): NarrativePlan[] {
  const seen = new Set<string>();
  for (const p of plans) {
    const id = (p.id ?? '').trim();
    if (!id) throw new Error('NARRATIVE_PLAN: a plan has an empty id');
    if (seen.has(id)) throw new Error(`NARRATIVE_PLAN: duplicate plan id "${id}" — ids must be unique for --narrative-only to be unambiguous`);
    seen.add(id);
    if (!PAPER_FRAMEWORKS[p.paper]) throw new Error(`NARRATIVE_PLAN: plan "${id}" declares paper "${p.paper}", which has no entry in PAPER_FRAMEWORKS`);
  }
  let pool = plans;
  // --narrative-paper narrows to ONE paper's plans. Without it, `--narrative-batch` runs every
  // plan in the file, which after a second paper joined is a batch nobody meant to start. Same
  // P-G1 posture as --narrative-only: an unmatched value THROWS with the known set rather than
  // filtering to [] and reporting a clean "0/0 passed".
  if (paper) {
    pool = plans.filter((p) => p.paper === paper);
    if (pool.length === 0) {
      throw new Error(`--narrative-paper "${paper}" matched no plan. Papers in NARRATIVE_PLAN: ${[...new Set(plans.map((p) => p.paper))].join(', ')}`);
    }
  }
  if (!only) return pool;
  const selected = pool.filter((p) => p.id === only);
  if (selected.length === 0) {
    throw new Error(`--narrative-only "${only}" matched no plan${paper ? ` for paper ${paper}` : ''}. Known ids: ${pool.map((p) => p.id).join(', ')}`);
  }
  return selected;
}

const SUBMIT_NARRATIVE_DRILL_TOOL: Anthropic.Tool = {
  name: 'submit_narrative_drill',
  description:
    'Submit one ACCA AFM DISCURSIVE practice drill AND its marking rubric AND a golden GOOD (full-marks) and ' +
    'golden BAD (deliberately flawed) answer. The drill is CONCEPTUAL-ONLY — it interprets/evaluates GIVEN ' +
    'information and NEVER asks the candidate to compute anything.',
  input_schema: {
    type: 'object',
    properties: {
      context_text: { type: 'string', description: 'The scenario/exhibit (3–6 sentences). Names a non-UK/non-Ireland organisation and the situation, with SPECIFIC usable detail. Where the brief says an output is GIVEN, PRINT the exact figures here (they are given drivers, not something the candidate computes).' },
      question: { type: 'string', description: 'The requirement, beginning with the capitalised lead command verb (Discuss/Evaluate/Assess/Explain/Interpret). It must ask for interpretation/evaluation/explanation — NEVER a calculation. Split into clearly labelled parts if it has more than one.' },
      command_verb: { type: 'string', description: 'The verb(s) the question actually demands, lowercase (e.g. "evaluate and recommend").' },
      requirement_parts: { type: 'array', items: { type: 'string' }, description: 'Each distinct part of the requirement, verbatim short labels (e.g. "(i) assess Islamic finance"). Every part MUST map to at least one criterion.' },
      scenario_facts: {
        type: 'array',
        description: 'The named facts the answer must USE. Each key MUST appear LITERALLY in context_text.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'stable id, e.g. "f_mean_npv"' },
            text: { type: 'string', description: 'human description, e.g. "the mean NPV of $180m from the simulation"' },
            key: { type: 'string', description: 'a distinctive token that appears verbatim in context_text AND that a good answer will repeat, e.g. "$180m" or "sukuk" or "12%"' },
            kind: { type: 'string', enum: ['figure', 'entity', 'constraint'] },
          },
          required: ['id', 'text', 'key', 'kind'],
        },
      },
      criteria: {
        type: 'array',
        description: 'The rubric — one entry per markable point. Total marks across criteria = total_marks.',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'e.g. "c1"' },
            requirement_part: { type: 'string', description: 'must equal one of requirement_parts' },
            lo: { type: 'string', description: 'the LO this point serves (e.g. "B3b" for the Islamic-finance point)' },
            required_point: { type: 'string', description: 'the point a full-marks answer makes — specific, developed, applied to the scenario' },
            marks: { type: 'number', description: 'integer marks for this criterion' },
            anchor_facts: { type: 'array', items: { type: 'string' }, description: 'scenario_fact ids this point must USE (F5). [] only for a purely conceptual point.' },
            disqualifiers: { type: 'array', items: { type: 'string', enum: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11'] }, description: 'F-modes that void/cap this criterion. Include F9 ONLY where the scenario supplies data the point must use.' },
            development_required: { type: 'boolean', description: 'true if the point needs claim→because→implication' },
            evidence_anchor: { type: 'string', description: 'OPTIONAL authoring note: the examiner anchor for this criterion (e.g. "J24 p.14" for an F9 own-figure criterion). Omit if none.' },
          },
          required: ['id', 'requirement_part', 'lo', 'required_point', 'marks', 'anchor_facts', 'disqualifiers', 'development_required'],
        },
      },
      total_marks: { type: 'number', description: 'sum of criteria marks (typically 8–12)' },
      reveal: { type: 'string', description: 'The golden GOOD answer (the model answer). 150–300 words. Makes EVERY required_point, DEVELOPED (claim→because→implication), USING every anchor fact\'s key token verbatim, ORIGINAL phrasing (do NOT copy scenario sentences), ending with a COMMITTED conclusion/recommendation. This is the full-marks standard.' },
      golden_bad: { type: 'string', description: 'A deliberately flawed answer that EXHIBITS the designed_bad_flags: e.g. copies scenario sentences (F1), lists without developing (F2), stays generic / ignores the named facts (F5), never commits (F4). It must be plausibly wrong, not empty.' },
      designed_bad_flags: { type: 'array', items: { type: 'string', enum: ['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11'] }, description: 'The F-modes golden_bad is built to exhibit (2–4 of them). The marker MUST raise these on the BAD answer.' },
    },
    required: ['context_text', 'question', 'command_verb', 'requirement_parts', 'scenario_facts', 'criteria', 'total_marks', 'reveal', 'golden_bad', 'designed_bad_flags'],
  },
};

const NARRATIVE_AUTHOR_PERSONA_AFM =
  'You are an ACCA Advanced Financial Management (AFM) examiner AND mark-scheme author. You write wholly ' +
  'original DISCURSIVE (prose) practice drills — never from any ACCA past paper — together with the marking ' +
  'rubric and a pair of golden answers. AFM candidates answer as the senior financial adviser to the board. ' +
  'CRITICAL — CONCEPTUAL ONLY: these drills interpret, evaluate, discuss or explain GIVEN information. They ' +
  'NEVER ask the candidate to perform a calculation, and the rubric NEVER credits a computed figure. Any ' +
  'number in the scenario is a GIVEN driver the candidate reads, not something they derive. ' +
  'The rubric encodes the ACCA examiner failure modes (candidates lose marks for: F1 restating the scenario; ' +
  'F2 listing without developing; F3 stating assumptions without discussing; F4 fence-sitting; F5 generic/not ' +
  'anchored to the scenario; F6 superficial figure-commentary; F7 answering the wrong part; F8 confusing issue ' +
  'with action; F9 not using given figures; F10 no scepticism/commercial acumen; F11 no breadth/conclusion). ' +
  'The golden GOOD is a full-marks answer that avoids every mode; the golden BAD deliberately commits its ' +
  'designed modes. DIVERSITY: scenarios are international, NEVER UK or Ireland.';

/**
 * SBL's authoring persona. NOT a reworded AFM persona — three things differ materially.
 *
 * 1. THE MARKING SPINE IS THE EXAMINERS' OWN FOUR-PART DEVELOPMENT TEST, published on one page
 *    of all seven examiner reports (docs/evidence/SBL_FAILURE_CATALOGUE.md M3) and stated
 *    arithmetically at MJ25 p.4, SD25 p.4 and MJ26 p.5: two marks for a point identified AND
 *    developed, one for a point left undeveloped. That is ACCA's scheme, not ours, which is why
 *    it is stated to the author as a rule rather than a preference.
 * 2. NO MODEL MAY BE NAMED IN THE STEM. The examiners record the mechanism twice (MJ25 p.4,
 *    MJ26 p.4): a noun in the requirement summons an unrequested model, and answers go to the
 *    model instead of the task. A stem that names one teaches the failure it should be testing.
 * 3. THE ANSWER IS A DOCUMENT FOR A NAMED READER, and it must not refer to "the pre-seen"
 *    (MJ26 p.4 — senior leadership would not know the term).
 *
 * The F-mode vocabulary is UNCHANGED from AFM's. It is not AFM-specific: F1 is the catalogue's
 * M1 (copy-paste), F2 its M3 (undeveloped), F5 its M4 (generic theory unapplied), F7 its M2
 * (answering the adjacent question) and F4 its M7 (questions instead of an assessment). Reusing
 * one vocabulary keeps the deterministic detectors in lib/acca/narrative-marker.ts applicable to
 * both papers, which is the whole reason the narrative pipeline could take a second paper at all.
 */
const NARRATIVE_AUTHOR_PERSONA_SBL =
  'You are an ACCA Strategic Business Leader (SBL) examiner AND mark-scheme author. You write wholly ' +
  'original DISCURSIVE (prose) practice drills — never from any ACCA past paper — together with the marking ' +
  'rubric and a pair of golden answers. SBL is ONE integrated case study; the candidate answers as a ' +
  'professional adviser writing a named document to a named reader inside or advising the organisation. ' +
  'CRITICAL — CONCEPTUAL ONLY: these drills interpret, evaluate, discuss or advise on GIVEN information. They ' +
  'NEVER ask the candidate to perform a calculation, and the rubric NEVER credits a computed figure. Any ' +
  'number in the scenario is a GIVEN the candidate reads, not something they derive. ' +
  'THE MARKING SPINE IS ACCA\'S OWN PUBLISHED DEVELOPMENT TEST: two marks are earned only where a relevant ' +
  'point is identified AND THEN developed by (i) evaluating how significant it is, (ii) using information ' +
  'given in the case that relates the point directly to THIS organisation, (iii) explaining the consequences ' +
  'for the organisation, and (iv) supporting it with an example from the case material. A point identified ' +
  'but left undeveloped earns ONE mark. Write every criterion at two marks and state the one-mark ' +
  'undeveloped tier explicitly in its required_point. ' +
  'NEVER NAME A THEORETICAL MODEL, FRAMEWORK OR NAMED AUTHOR IN THE QUESTION STEM. Candidates fail by ' +
  'reading a noun in the requirement, reaching for the model it evokes, and answering about the model ' +
  'instead of the task. The stem names the ACT and the OBJECT; if a model is genuinely the right tool the ' +
  'candidate is the one who must choose it. ' +
  'The rubric encodes the ACCA examiner failure modes (candidates lose marks for: F1 restating the scenario; ' +
  'F2 listing without developing; F3 stating assumptions without discussing; F4 asking the reader questions ' +
  'or sitting on the fence instead of giving an assessment; F5 generic theory not anchored to this ' +
  'organisation; F6 superficial figure-commentary; F7 answering the adjacent question rather than the task ' +
  'set; F8 confusing issue with action; F9 not using given figures; F10 no scepticism/commercial acumen; ' +
  'F11 no breadth/conclusion). ' +
  'The golden GOOD is a full-marks answer that avoids every mode; the golden BAD deliberately commits its ' +
  'designed modes. DIVERSITY: scenarios are international, NEVER UK or Ireland.';

const NARRATIVE_AUTHOR_PERSONA: Record<GeneratorPaper, string> = {
  AFM: NARRATIVE_AUTHOR_PERSONA_AFM,
  SBL: NARRATIVE_AUTHOR_PERSONA_SBL,
};

/** Pass-1 output cap. See the note at the call site for why AFM is pinned at its original 4000. */
const NARRATIVE_MAX_TOKENS: Record<GeneratorPaper, number> = { AFM: 4000, SBL: 8000 };

/**
 * WHAT EACH PROFESSIONAL SKILL MAKES THE CANDIDATE DO — the operational half of the tag.
 *
 * THE SEAM THIS CLOSES (measured 2026-08-02). `plan.skill` reached the DB column and the pass-2
 * Ezra reveal, and NOTHING ELSE. `buildNarrativeUserPrompt` — the call that writes the criteria,
 * the disqualifiers and both golden answers — was never told which skill the drill existed to
 * exercise. So declaring `skill: 'scepticism'` did not make the rubric demand scepticism; only
 * whatever the author happened to put in `brief` did. Declared tag and rubric were never connected.
 *
 * WHY THIS SHAPE AND NOT A PROHIBITION (P-T2). The instruction already winning is the tool
 * schema's `required_point` = "the point a full-marks answer makes — specific, developed, applied
 * to the scenario". That reliably yields criteria ABOUT the topic, correctly applied — and a
 * criterion about the topic can be earned without ever performing the skill's act. Adding "the
 * rubric must also demand scepticism" would be one more instruction competing with the one already
 * winning. So the DEMAND ITSELF is redefined per skill: `act` restates what a required_point IS
 * for the marks that carry the skill. Nothing is forbidden.
 *
 * `descriptor` is the ACCA sub-descriptor set VERBATIM (afm-framework.ts, guide p.13) — the
 * authority. `act` and `scenario` are house-authored operationalisations of it, and are the two
 * things a prompt can actually act on: what a criterion must require, and what the scenario must
 * CONTAIN for that requirement to be satisfiable. The `scenario` half is load-bearing and easy to
 * miss — a drill cannot demand that a candidate challenge an assertion if the scenario asserts
 * nothing, and the rubric would then quietly degrade to the topic-description it always was.
 */
interface SkillDemand { act: string; scenario: string }

const SKILL_DEMAND_AFM: Record<ProfessionalSkillTag, SkillDemand> = {
  scepticism: {
    act:
      'CHALLENGE something the scenario asserts — a named person\'s claim, a stated assumption, or the ' +
      'reliability of a given output — saying why it does not hold FOR THIS ORGANISATION and what follows ' +
      'if it is wrong. Correctly describing the technique or the assertion is NOT the act; the act is ' +
      'finding it wanting on the scenario\'s own facts.',
    scenario:
      'a named individual (a CFO, treasurer, director, board or external adviser) making a SPECIFIC, ' +
      'quotable claim that the scenario\'s own facts do not fully support — plus enough stated detail ' +
      'for the candidate to show exactly WHY it does not hold.',
  },
  commercial_acumen: {
    act:
      'reach a COMMITTED commercial judgement — which course, weighed against what it costs and what the ' +
      'organisation\'s stated constraints permit, with the business consequence named. Listing advantages ' +
      'and disadvantages, or explaining how the mechanism works, is NOT the act; the act is choosing, on ' +
      'this organisation\'s facts, and owning what the choice costs.',
    scenario:
      'a real decision with a price on it — stated constraints (an amount, a cost, a regulatory or ' +
      'ownership limit, a board mandate, a timescale) that make one course genuinely better than another ' +
      'FOR THIS ORGANISATION rather than in general.',
  },
  analysis_and_evaluation: {
    act:
      'WEIGH the given material — compare it, prioritise within it, or reach a supported verdict on what ' +
      'it means — rather than report it. Accurate restatement of what the scenario supplies is NOT the act.',
    scenario:
      'given material with enough substance to weigh: figures, a model output, or options that can be ' +
      'ranked, compared, or found insufficient.',
  },
  communication: {
    act:
      'SHAPE the answer for its stated audience and purpose, so the reader who has to act can find the ' +
      'recommendation and the reason for it. Correct content in an undifferentiated form is NOT the act.',
    scenario:
      'a named audience and a stated purpose — who is reading this, what they must decide, and any ' +
      'constraint on how it must reach them.',
  },
};

/**
 * SBL's five skills. ⚠️ NOT AFM's four plus one, and never map one onto the other by name.
 *
 * SBL splits Analysis and Evaluation into two separately-marked skills where AFM/APM carry one
 * combined `analysis_and_evaluation` — and neither half is that skill halved. SBL's Analysis
 * absorbs ENQUIRE (corroborate or dispute a belief against evidence) and its Evaluation absorbs
 * ESTIMATE (reason forward to what a position implies); neither act appears in the four-skill
 * descriptors at all. The three shared NAMES are shared names, not shared descriptors: SBL's
 * commercial acumen is explicitly about wider external factors and the management of conflict,
 * where AFM's is price-shaped, so its `act` deliberately does NOT require a figure.
 *
 * As with AFM: `sub_descriptors` in sbl-framework.ts are the ACCA authority, verbatim from the
 * S26–J27 guide p.16; `act` and `scenario` here are house-authored operationalisations.
 */
const SKILL_DEMAND_SBL: Record<SblProfessionalSkillTag, SkillDemand> = {
  scepticism: {
    act:
      'CHALLENGE something the case asserts — a named person\'s claim, a stated assumption, or a ' +
      'conclusion drawn in an exhibit — saying why it does not hold on the organisation\'s own facts and ' +
      'what follows if it is wrong, then COMMIT to an assessment. Asking the reader questions is NOT ' +
      'scepticism and earns nothing; neither is correctly describing the claim. The challenge must stay ' +
      'professional and proportionate: an accusation the case material does not support (incompetence, ' +
      'dishonesty, fraud) is itself the failure, not a stronger version of the act.',
    scenario:
      'a named individual (a director, manager, adviser or author of an exhibit) making a SPECIFIC, ' +
      'quotable claim that the case\'s own facts do not fully support — plus enough stated detail for the ' +
      'candidate to show exactly WHY it does not hold, and enough for a fair reading to stop short of ' +
      'alleging bad faith.',
  },
  commercial_acumen: {
    act:
      'bring the ORGANISATION\'S wider commercial position to bear — the external pressures on it, the ' +
      'competing interests inside it, or the practical limits on what it can actually do — and propose a ' +
      'course that survives them. Naming the issue correctly, or recommending what would work for any ' +
      'organisation, is NOT the act; the act is a proposal that could only have been written about THIS one.',
    scenario:
      'stated commercial reality that makes a textbook answer unworkable HERE — an external pressure ' +
      '(a competitor, a regulator, a market shift), a resource or capability limit, or a named conflict ' +
      'between parties whose interests the course must reconcile.',
  },
  analysis: {
    act:
      'RELATE material from more than one part of the case to each other — establish what lies behind a ' +
      'stated symptom, or corroborate or dispute a stated belief against evidence sitting elsewhere in the ' +
      'case. Reporting what each source says, accurately and separately, is NOT the act; the act is what ' +
      'one piece of evidence does to another.',
    scenario:
      'at least two separately-identified pieces of material a candidate can put side by side — a stated ' +
      'belief plus data that bears on it, or two accounts of the same thing that do not agree. Without a ' +
      'second source there is nothing to establish a cause from and the criterion collapses into reporting.',
  },
  evaluation: {
    act:
      'WEIGH the case for and against on this organisation\'s own facts and COME DOWN — naming what is ' +
      'being traded away and who bears it — or reason forward to what the stated position implies for the ' +
      'organisation. Setting out advantages and disadvantages in balance without landing is NOT the act.',
    scenario:
      'a decision or position with a real downside as well as an upside — stated costs, risks, or affected ' +
      'parties — so that coming down on one side has something to concede. A one-sided proposition can be ' +
      'described but not appraised.',
  },
  communication: {
    act:
      'SHAPE the answer for its named recipient and stated document type — pitched at what that reader ' +
      'already knows, in a tone they can act on, with the recommendation and its reason arriving together. ' +
      'Correct content in an undifferentiated form is NOT the act.',
    scenario:
      'a named recipient with a stated role and a stated document type and purpose — who is reading this, ' +
      'what they must decide, and what they already know or do not know.',
  },
};

const SKILL_DEMAND_BY_PAPER: Record<GeneratorPaper, Record<string, SkillDemand>> = {
  AFM: SKILL_DEMAND_AFM,
  SBL: SKILL_DEMAND_SBL,
};

/** Resolve a plan's skill demand. THROWS on an unregistered skill rather than falling back —
 *  the free-text skill-tag trap (CLAUDE.md): a skill with no demand behind it would still be
 *  written into the prompt as a label and would still take its share of the rubric, banded
 *  against nothing. A throw is the only outcome that cannot silently mis-author. */
function skillDemandFor(paper: GeneratorPaper, skill: string): SkillDemand {
  const table = SKILL_DEMAND_BY_PAPER[paper];
  const demand = table?.[skill];
  if (!demand) {
    throw new Error(
      `No SKILL_DEMAND registered for ${paper} skill "${skill}" — known ${paper} skills: ` +
      `${Object.keys(table ?? {}).join(', ') || 'none'}`,
    );
  }
  return demand;
}

/**
 * Paper-specific authoring rules, APPENDED to the shared HARD RULES block.
 *
 * AFM's entry is the EMPTY STRING on purpose. The shared block above IS AFM's rule set — it was
 * written for AFM and every line of it is pinned byte-for-byte by test:narrative-paper-pins. A
 * second paper is served by ADDING rules, never by editing the shared ones, so that the pin can
 * stay a genuine equality rather than a diff nobody reads.
 */
/**
 * ⚠️ EVERY SBL BATCH-A RUBRIC FORCED A CONCLUSION, AND THE INSTRUCTION WAS HERE.
 *
 * Measured across all five drafts: A1 c5 prescribed "consultative modelled on Episode B,
 * supplemented by selective directive", A2 c6 demanded "the 40% target is NOT achievable within
 * four years" AND forbade a balance, A3 c5 prescribed "not analytical but executional", A5 c5
 * prescribed "defensible in principle" (with the reveal handing over the exact phrase to write).
 * A rubric that names the verdict marks AGREEMENT, not judgement.
 *
 * IT WAS NOT THE PLANS AND IT WAS NOT THE SKILL TABLE. `SKILL_DEMAND_SBL.evaluation.act` says
 * "WEIGH … and COME DOWN" and `.scepticism.act` says "then COMMIT to an assessment" — both demand
 * commitment, NEITHER names a direction. A1 and A2 declare no F4 at all and still forced a
 * verdict. The chain ran: this bullet's old trailing clause ("the marker cannot award the closing
 * marks for a verdict it cannot find") presupposed a verdict-carrying criterion → the generic hard
 * rule that the reveal must make EVERY required_point and END committed → `BAD_FLAG_MECHANICS.F4`
 * ("Put F4 on the criterion that requires the verdict") → and finally `required_point` is defined
 * in the tool schema as "THE POINT A FULL-MARKS ANSWER MAKES", so a criterion that requires the
 * verdict is written BY STATING IT. There was no shape available for "commit to something" that
 * was not "commit to this".
 *
 * This is the C4/A3a doctrine one layer up: a gate or rule that requires coverage the content does
 * not naturally supply makes the author reach for something, and it cannot see that it caused it.
 * Nothing could catch it — N5 tests the REVEAL for a conclusion and never the criterion, N6
 * explicitly declines to read `required_point` semantics, and N1/N4 grade coverage and GOOD-vs-BAD
 * separation. A rubric that prescribes the answer passes all six.
 *
 * Fixed per P-T2 — the instruction is REDEFINED (what the criterion marks) rather than a
 * prohibition being bolted on. The golden-GOOD-must-close half is evidenced (S23 p.16, where the
 * same page records that candidates who DID commit scored well) and is untouched.
 *
 * THE HEDGING RULE IS THE SAME DEFECT ONE FIELD OVER. `buildRevealPromptSbl`'s quality rules
 * already ban "directly" / "depends entirely on" where the scenario shows only plausibility — and
 * nothing governed the RUBRIC. That is exactly why SBL-A3 shipped a properly hedged reveal beside
 * criteria reading "directly traceable" and "confirming" for a 67% adoption shortfall the case
 * supports as plausible, not proven.
 *
 * ⚠️ SBL-ONLY BY CONSTRUCTION. `AFM: ''` — AFM's narrative prompt bytes cannot move, which PIN2
 * asserts over all eleven AFM plans with and without the retry arm. Verified green, not assumed.
 */
const PAPER_NARRATIVE_RULES: Record<GeneratorPaper, string> = {
  AFM: '',
  SBL: `
- SBL DEVELOPMENT TEST — THIS IS ACCA'S OWN PUBLISHED SCHEME, NOT A HOUSE PREFERENCE. Every
  criterion is worth EXACTLY 2 marks. A criterion's required_point must be written so that the
  full two marks require the point to be identified AND developed on ALL FOUR of the examiners'
  published tests: (i) how SIGNIFICANT the point is, (ii) information given in the case that
  relates the point directly to THIS organisation, (iii) the CONSEQUENCES for the organisation,
  and (iv) an EXAMPLE drawn from the case material. Every required_point must ALSO state the
  one-mark tier in these terms: "1 mark if identified but left undeveloped." Set
  development_required = true on every criterion.
- A scenario_fact's \`key\` IS INJECTED VERBATIM INTO PROSE A STUDENT READS, so write it as a
  LOWERCASE MID-SENTENCE FRAGMENT that reads grammatically wherever it lands. Never make a key a
  sentence-initial fragment ("No independent review", "The board agreed"), a full sentence, or
  anything ending in punctuation: the key is quoted into required_points and into the golden GOOD
  exactly as given, so a capitalised opener renders a capital letter in the middle of someone
  else's sentence. If the phrase only exists capitalised at the start of a sentence in
  context_text, REWORD context_text so the phrase also occurs lowercase mid-sentence, then key on
  that. Proper nouns and figures are fine capitalised ("Juliana Ríos", "COP 4.2 billion") — the
  rule is about common words, not about capitals as such.
- A required_point STATES A CAUSAL LINK ONLY AS STRONGLY AS THE CASE STATES IT. Where the case
  supplies an outcome and a candidate cause but not the link between them, what is being marked
  is the candidate TRACING that link and weighing how well the case supports it — "is likely to",
  "suggests", "the most plausible driver on the case's own figures". Keep "directly", "confirms",
  "traceable to" and "proves" for a link the case states outright. A criterion that overstates the
  link marks down the candidate whose hedging was correct, and it is the criterion that is wrong.
- NEVER NAME A THEORETICAL MODEL, FRAMEWORK, MATRIX OR NAMED AUTHOR IN \`question\` OR IN
  \`context_text\`. Not in the requirement, not in an exhibit heading, not in a character's
  dialogue. The examiners record answers going to the model a requirement's noun evoked instead
  of to the task set. Name the ACT and the OBJECT; choosing a tool is the candidate's job. (The
  golden GOOD may reach for a framework of its own accord — that is the candidate demonstrating
  judgement — but it must apply it to the case, never explain it.)
- NEVER use the phrase "the pre-seen" anywhere in the drill. The answer is a document addressed
  to people who would not know the term.
- \`question\` must name the DOCUMENT and its RECIPIENT ("Draft the section of the briefing note
  for the chair of the remuneration committee that…"), so the answer has a reader.
- The golden BAD's F1 copy must be the sharpest observed form: paste a full sentence from
  context_text WITHOUT even adapting its pronouns or point of view to the answer's own voice.
- The golden BAD must ALSO fail the development test — every point it makes stops at
  identification, with no significance, no link to this organisation, no consequence and no
  example. It should read as a competent, fluent list that would score half marks.
- Put F2 in the disqualifiers of EVERY criterion. Under this paper's scheme every criterion's
  second mark is the development mark, so F2 is the marking basis on all of them.
- THE GOLDEN GOOD MUST CLOSE WITH AN EXPLICIT COMMITTED RECOMMENDATION, as its own final
  sentence, in the first person to the named recipient — "I recommend that…", "I advise the
  committee to…", "My recommendation is…". Not a summary, not a restatement of the balance:
  a decision the reader can act on. An answer that assesses well and stops is the failure this
  paper's examiners single out most often.
- THE CRITERION THAT MARKS THAT CLOSE MARKS THE STRUCTURE OF A COMMITTED JUDGEMENT, NEVER ITS
  DIRECTION. Its required_point states what a full-marks judgement CONTAINS — the case evidence
  it cites, the consequence it states for this organisation, and the opposing case it addresses
  and answers — and says in terms that EITHER verdict earns the full two marks where it is
  reached that way. Write the ACT of landing, not the landing itself: a required_point that
  spells out the conclusion is marking agreement with its author rather than the candidate's
  judgement, so a candidate who reasons well to the other answer scores nothing for it.`,
};

/**
 * HOW TO MAKE A GOLDEN BAD COMMIT ONE NAMED FAILURE MODE.
 *
 * Only F1, F4 and F5 are raiseable DETERMINISTICALLY — N4 folds `scenarioCopyOverlap` /
 * `longestVerbatimRun` (F1) and `hasConclusion` (F4) into the raised set itself, and F5 is a
 * missing anchor the aggregator finds. Every other mode has to be raised BY THE GRADER against a
 * criterion that lists it, which is why each entry below ends by saying where the flag must sit.
 * A designed flag with no criterion carrying it fails N4-pre cheaply, before any model spend.
 */
const BAD_FLAG_MECHANICS: Record<string, string> = {
  F1: 'F1: copy at least one FULL sentence (8+ words) VERBATIM from context_text into the bad answer — '
    + 'and do NOT adapt its pronouns or point of view to the answer\'s own voice. Restating, no analysis.',
  F2: 'F2: every point the bad answer makes STOPS AT IDENTIFICATION — no significance, no information '
    + 'relating it to this organisation, no consequence, no example. The points must be CORRECT; that is '
    + 'the whole design. Put F2 on the criteria whose two marks require development.',
  F4: 'F4: NEVER state a recommendation or conclusion in the bad answer (do not use the words recommend, '
    + 'conclude, on balance, should, advise). Put F4 on the criterion that requires the verdict.',
  F5: 'F5: stay generic — do NOT use at least one of the named scenario_facts that a criterion requires '
    + '(leave that anchor fact\'s key token OUT of the bad answer entirely). Put F5 on that anchored criterion.',
  F7: 'F7: answer the ADJACENT question — write competently about the wrong object, as named in WHAT THE '
    + 'BAD DOES below. It must read as a serious attempt at a question that was not the one set. Put F7 on '
    + 'the criteria that name the object actually asked for.',
  F10: 'F10: perform none of the skill\'s act while covering the same topic accurately. Put F10 on every '
    + 'criterion that carries the act.',
};

/**
 * The GOLDEN BAD instruction block.
 *
 * AFM PLANS RETURN THE PRE-CHANGE STRING BYTE-FOR-BYTE (pinned in test:narrative-paper-pins).
 * The AFM corpus was authored to one fixed backbone — exactly ["F1","F5","F4"] on every drill —
 * and that uniformity is load-bearing for N4-pre, which verifies all three deterministically.
 *
 * SBL plans DECLARE their own modes, because this batch's whole design is one evidenced failure
 * per drill from the failure catalogue (M2 wrong object, M4 generic theory, M3 undeveloped, M7
 * scepticism-as-questions, M9+M1 fence-sitting plus copy-paste). Forcing those five into AFM's
 * fixed three would author five drills against the same failure and call them different.
 */
function goldenBadBlock(plan: NarrativePlan): string {
  if (!plan.designed_bad) {
    // AFM. Byte-identical to the pre-parameterisation literal — do not reformat.
    return `GOLDEN BAD — build it to FAIL DETERMINISTICALLY so the marker provably separates it from the GOOD:
- designed_bad_flags MUST be EXACTLY ["F1","F5","F4"] — no more, no fewer.
- F1: copy at least one FULL sentence (8+ words) VERBATIM from context_text into the bad answer (restating, no analysis).
- F5: stay generic — do NOT use at least one of the named scenario_facts that a criterion requires (leave that anchor fact's key token OUT of the bad answer entirely).
- F4: NEVER state a recommendation or conclusion in the bad answer (do not use the words recommend, conclude, on balance, should, advise).
- Ensure the criteria's disqualifiers collectively include F1, F5 and F4 (put F5 on an anchored criterion, F4 on the recommendation criterion, F1 where restating would earn nothing).`;
  }
  const { flags, evidenced, brief } = plan.designed_bad;
  const all = evidenced ? [...flags, evidenced] : flags;
  const unknown = all.filter((f) => !BAD_FLAG_MECHANICS[f]);
  // A typo'd flag would reach the model as a bare code with no instruction behind it, and the
  // author would improvise one. Same posture as skillDemandFor: throw, never improvise.
  if (unknown.length) throw new Error(`${plan.id}: designed_bad flag(s) with no mechanics registered: ${unknown.join(', ')}`);
  // ⚠️ ONLY the deterministic modes go in `designed_bad_flags` — N4 requires every entry to be
  // RAISED and can raise nothing else without the grader volunteering it. The evidenced mode is
  // still committed by the answer and still marked against, via the criteria's disqualifiers.
  const nonDeterministic = flags.filter((f) => f !== 'F1' && f !== 'F4' && f !== 'F5');
  if (nonDeterministic.length) {
    throw new Error(`${plan.id}: designed_bad.flags may contain ONLY deterministic modes (F1/F4/F5); move ${nonDeterministic.join(', ')} to designed_bad.evidenced`);
  }
  return `GOLDEN BAD — build it to FAIL DETERMINISTICALLY so the marker provably separates it from the GOOD:
- designed_bad_flags MUST be EXACTLY ${JSON.stringify(flags)} — no more, no fewer. That field is a
  machine contract, not a description of the answer: it lists only the modes the marker detects
  without judgement. Do NOT add any other code to it, however plainly the answer commits it.
- WHAT THE BAD DOES: ${brief}
${flags.map((f) => `- ${BAD_FLAG_MECHANICS[f]}`).join('\n')}${evidenced ? `
- IT MUST ALSO COMMIT ${evidenced}, which is the failure this drill exists to teach. A real bad
  answer fails several ways at once; one that fails in exactly one way is an artificial object.
  ${BAD_FLAG_MECHANICS[evidenced]}
  ${evidenced} MUST appear in the disqualifiers of the criteria it trips, so it is the marking
  basis — but it must NOT appear in designed_bad_flags.` : ''}
- The bad answer must be FLUENT AND PLAUSIBLE. It is not a weak answer; it is a competent answer
  committing one named failure. A reader should have to know the mark scheme to see why it loses.
- Every flag above must be listed as a disqualifier on at least one criterion the bad answer trips,
  or the marker cannot raise it and the drill will not gate.
- THE BAD MUST COMMIT ITS MODES UNMISTAKEABLY, ON THE CRITERIA THAT NAME THEM. Only F1 (copying)
  and F4 (no conclusion) are detected without a marker's judgement; every other mode above is
  raised by a marker reading ONE criterion at a time and told to be conservative. So a bad answer
  that commits its mode subtly, or commits it on criteria that do not list it, will be marked
  down and the flag still will not be raised — which fails the drill. Make the failure the most
  obvious thing about the answer on every criterion that lists it.`;
}

function buildNarrativeUserPrompt(plan: NarrativePlan, feedback?: string): string {
  const fw = frameworkFor(plan.paper);
  const lo = fw.syllabus[plan.lo_code];
  if (!lo) throw new Error(`${plan.id}: lo_code "${plan.lo_code}" is not in the ${plan.paper} syllabus map`);
  const skill = plan.skill;
  const demand = skillDemandFor(plan.paper, skill);
  const skillLabel = fw.skills[skill].label;
  const skillDescriptors = fw.skills[skill].sub_descriptors.map((d) => `    · ${d}`).join('\n');

  return `Write one original ACCA ${fw.label} DISCURSIVE drill + rubric + golden pair.

TASK (${plan.id}):
${plan.brief}

Specification:
- Primary LO: ${plan.lo_code} — ${lo.sub_area}: ${lo.topic}
- LO descriptor (verbatim, ACCA ${fw.guide} study guide): "${lo.descriptor}"
- Covers LOs: ${plan.covers.join(', ')}
- Intellectual level: L${plan.level} ${plan.level === 2 ? '(apply/explain a bounded concept)' : '(synthesise + evaluate — weigh, assess appropriateness, recommend with justified reasoning)'}
- Setting: ${plan.region} — ${plan.sector} (do NOT set in the UK or Ireland)
- PROFESSIONAL SKILL THIS DRILL EXISTS TO EXERCISE: ${skillLabel} (${skill})

PROFESSIONAL SKILL — WHAT THE RUBRIC MUST MAKE THE CANDIDATE DO:
The skill is not a label on the drill. It defines what a required_point IS here.
- ACCA descriptor for ${skillLabel} (verbatim, ${fw.guide} guide):
${skillDescriptors}
- THE ACT: a full-marks answer must ${demand.act}
- THE SCENARIO MUST CONTAIN what the act operates on: ${demand.scenario} Without it the act is
  impossible and the rubric collapses back into topic description.
- AT LEAST HALF the total marks must sit on criteria whose required_point CANNOT BE EARNED without
  performing that act. Write those required_points AS THE ACT ITSELF — not as the topic the act is
  about. "Explains why X matters" is the topic; "shows that the CFO's stated X does not hold because
  <scenario fact>, and that the decision reverses if it does not" is the act.
- Put F10 in the disqualifiers of every criterion that carries the act, so the marking basis names it.
- The golden GOOD performs the act explicitly. The golden BAD covers the SAME TOPIC COMPETENTLY and
  never performs it — a fluent, accurate, skill-free answer. That contrast is what this drill is for.

HARD RULES:
- CONCEPTUAL ONLY. The question must NOT ask for any calculation. The rubric must NOT credit any computed figure. Numbers in the scenario are GIVEN.
- Every scenario_fact.key MUST appear verbatim in context_text.
- The reveal (golden GOOD) must make EVERY required_point, DEVELOPED, USING every anchor fact's key token verbatim, in ORIGINAL wording (not copied from the scenario), and END with a committed recommendation/conclusion.
- Every requirement_part must map to at least one criterion.
- DISQUALIFIERS: a figure-INTERPRETATION criterion (the point reads/interprets a GIVEN figure) uses [F1, F5, F6] — F6 catches superficial state-the-figure commentary. Do NOT put F9 on a conceptual/interpretation criterion. F9 is reserved for a CARRY-A-VALUE-DOWNSTREAM criterion (uses one figure to justify a later step); conceptual narrative drills have none, so F9 is OFF by default. Do NOT set evidence_anchor.
- A criterion marks RECOGNITION of the insight, however the candidate expresses it — never require a named statistic or a specific ratio VALUE in required_point (an insight stated in words earns full marks).
- COHERENCE: if the scenario GIVES statistical output (mean / standard deviation / probability / VaR), cross-check those figures for internal consistency BEFORE writing any prose characterising the distribution's SHAPE. Do NOT assert "fat tails" / "thin tails" / skew unless the given figures actually imply it (e.g. a normal distribution fixes P(NPV<0)=Φ(−mean/sd) and the 5th-percentile loss ≈ mean − 1.65·sd). A VaR is a THRESHOLD — the loss the outcome will not exceed at the stated confidence — NOT a severity measure: never quote it as a "we will not lose more than X" ceiling, and never claim the tail is fatter/thinner than the figures support.
- total_marks = sum of criteria marks (aim 8–12).${PAPER_NARRATIVE_RULES[plan.paper]}

${goldenBadBlock(plan)}${feedback ? `\n\nYOUR PREVIOUS ATTEMPT FAILED THE AUTHORING GATES. FIX EXACTLY THESE, keep everything else:\n${feedback}` : ''}`;
}

interface NarrativeDrill {
  question: string;
  context_text: string;
  command_verb: string;
  rubric: NarrativeRubric;
  reveal: string;              // golden GOOD prose (no heading)
  golden_bad: string;
  designed_bad_flags: NarrativeFailureMode[];
}

async function draftNarrativeDrill(anthropic: Anthropic, plan: NarrativePlan, feedback?: string): Promise<NarrativeDrill> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    // PER PAPER, and AFM KEEPS 4000. Raising a cap cannot change a response that already fits, so
    // AFM's output is unaffected either way — but the whole bar on this change is that AFM is
    // provably untouched, and "provably" does not survive an argument about sampling. It stays.
    //
    // SBL needs the headroom for a structural reason, not a stylistic one: its rubric writes the
    // four-limb development test AND the 1-mark undeveloped tier into every `required_point`, and
    // its golden GOOD must then satisfy all four limbs on every criterion. Measured on the first
    // run: 2 of 5 SBL-A1 attempts died as `golden_bad came back empty` — the tool-use block
    // truncated after the rubric, so the drill was lost to the cap rather than to the gates.
    max_tokens: NARRATIVE_MAX_TOKENS[plan.paper],
    system: cacheBlock(NARRATIVE_AUTHOR_PERSONA[plan.paper]),
    tools: [SUBMIT_NARRATIVE_DRILL_TOOL],
    tool_choice: { type: 'tool', name: 'submit_narrative_drill' },
    messages: [{ role: 'user', content: buildNarrativeUserPrompt(plan, feedback) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in narrative Pass-1 response');
  const inp = block.input as {
    context_text: string; question: string; command_verb: string; requirement_parts: string[];
    scenario_facts: ScenarioFact[]; criteria: Criterion[]; total_marks: number;
    reveal: string; golden_bad: string; designed_bad_flags: NarrativeFailureMode[];
  };
  assertNonEmpty(inp as unknown as Record<string, unknown>, ['context_text', 'question', 'command_verb', 'reveal', 'golden_bad'], 'Narrative Pass 1');
  if (!Array.isArray(inp.criteria) || inp.criteria.length === 0) throw new Error('Narrative Pass 1: no criteria');
  if (!Array.isArray(inp.scenario_facts) || inp.scenario_facts.length === 0) throw new Error('Narrative Pass 1: no scenario_facts');
  const rubric: NarrativeRubric = {
    mode: 'narrative',
    requirement_parts: inp.requirement_parts,
    scenario_facts: inp.scenario_facts,
    criteria: inp.criteria,
    total_marks: inp.total_marks,
    bands: NARRATIVE_BANDS,
  };
  return {
    question: inp.question,
    context_text: inp.context_text,
    command_verb: inp.command_verb.trim().toLowerCase(),
    rubric,
    reveal: inp.reveal,
    golden_bad: inp.golden_bad,
    designed_bad_flags: Array.from(new Set(inp.designed_bad_flags ?? [])),
  };
}

// N1–N5 gate runner. Deterministic gates (N2/N3/N5) run FIRST (free); the grader-backed gates (N1/N4)
// run only if they pass, to save model spend. Returns pass/fail + printable lines + a feedback string
// (the failure reasons, fed back into the next authoring attempt — the RADR-flip tuning pattern).
async function runNarrativeGates(
  drill: NarrativeDrill,
  grader: ReturnType<typeof makeAnthropicCriterionGrader>,
  skill?: string,
  paper?: string,
): Promise<{ ok: boolean; lines: string[]; feedback: string }> {
  const { rubric, reveal, context_text: scenario, golden_bad, designed_bad_flags } = drill;
  const lines: string[] = [];
  const fails: string[] = [];

  // N2 scenario-anchor (deterministic)
  const n2 = checkScenarioAnchor(rubric, scenario, reveal);
  lines.push(`N2 scenario-anchor (facts in scenario + used in reveal): ${n2.ok ? 'PASS' : 'FAIL — ' + n2.reason}`);
  if (!n2.ok) fails.push(`N2: ${n2.reason}`);
  // N3 generic/copy (deterministic)
  const n3 = checkGenericCopy(reveal, scenario);
  lines.push(`N3 generic/copy lint (reveal not scenario-restating): ${n3.ok ? 'PASS' : 'FAIL — ' + n3.reason}`);
  if (!n3.ok) fails.push(`N3: ${n3.reason}`);
  // N5 committed verdict (deterministic)
  const n5 = checkCommittedVerdict(rubric, reveal);
  lines.push(`N5 committed-verdict/structure: ${n5.ok ? 'PASS' : 'FAIL — ' + n5.reason}`);
  if (!n5.ok) fails.push(`N5: ${n5.reason}`);

  // N4-pre (deterministic raiseability): every designed BAD flag must be STRUCTURALLY raiseable by the
  // marker, else N4 can never pass. F1 = golden_bad copies the scenario; F4 = golden_bad has no
  // conclusion; F5 = golden_bad omits an anchor some criterion requires; anything else = a criterion
  // lists it as a disqualifier (the grader can raise it). Fail cheaply with fix-feedback.
  const disqUnion = new Set<NarrativeFailureMode>(rubric.criteria.flatMap((c) => c.disqualifiers));
  const badOverlap = scenarioCopyOverlap(golden_bad, scenario, 6);
  const badOmitsAnAnchor = rubric.criteria.some((c) => missingAnchors(golden_bad, c, rubric.scenario_facts).length > 0);
  const badRun = longestVerbatimRun(golden_bad, scenario);
  const badHasConclusion = hasConclusion(golden_bad);
  for (const f of designed_bad_flags) {
    // For the backbone flags, raiseability is the DETERMINISTIC condition N4 actually checks — NOT merely
    // "a criterion lists it" — so a pass here guarantees N4 can raise it. Other flags fall back to the
    // grader (a criterion must list them).
    let raiseable: boolean;
    if (f === 'F1') raiseable = badOverlap >= 0.18 || badRun >= 8;
    else if (f === 'F4') raiseable = !badHasConclusion;
    else if (f === 'F5') raiseable = badOmitsAnAnchor && disqUnion.has('F5');
    else raiseable = disqUnion.has(f);
    if (!raiseable) {
      const why = f === 'F1' ? `golden_bad overlaps ${(badOverlap * 100).toFixed(0)}% / longest verbatim run ${badRun} words (<8) — copy a full 8+ word context_text sentence VERBATIM into the bad answer`
        : f === 'F4' ? `golden_bad contains a conclusion/recommendation but F4 needs fence-sitting — DELETE every "recommend/conclude/should/advise/on balance" from the bad answer so it ends with NO recommendation`
        : f === 'F5' ? `golden_bad uses every required anchor fact (or no criterion lists F5) — make the bad answer generic by OMITTING one named scenario fact a criterion requires, and put F5 on that criterion`
        : `no criterion lists ${f} as a disqualifier — add ${f} to the relevant criterion's disqualifiers so the marker can raise it`;
      fails.push(`N4-pre: designed BAD flag ${f} is not raiseable — ${why}`);
    }
  }
  lines.push(`N4-pre designed-flag raiseability (${designed_bad_flags.join(',')}): ${fails.some((x) => x.startsWith('N4-pre')) ? 'FAIL' : 'PASS'}`);

  if (fails.length) {
    lines.push('   (skipping grader-backed N1/N4 — deterministic gates failed first, saving model spend)');
    return { ok: false, lines, feedback: fails.join('\n') };
  }

  // N1 rubric-coverage (grader: the reveal must be a full-marks answer + every part mapped)
  const n1 = await checkRubricCoverage(rubric, reveal, scenario, grader);
  lines.push(`N1 rubric-coverage (reveal = full marks; every part mapped): ${n1.ok ? 'PASS' : 'FAIL — ' + n1.reason}`);
  if (!n1.ok) fails.push(`N1: ${n1.reason}`);
  // N4 Rule-23 (grader: GOOD in band, BAD below + designed flags raised) — the load-bearing gate
  const n4 = await checkRule23(rubric, scenario, reveal, golden_bad, designed_bad_flags, grader);
  lines.push(`N4 Rule-23 (GOOD in band, BAD below + designed F-modes raised): ${n4.ok ? 'PASS' : 'FAIL — ' + n4.reason}`);
  if (!n4.ok) fails.push(`N4: ${n4.reason}`);

  // N6 — skill-demand STRUCTURE. Runs LAST because the deterministic gates above are the cheap
  // ones and N6 is only meaningful on a rubric that already coheres.
  //
  // CLAIM CEILING, verbatim: a green N6 means "the scenario admits the act and the rubric names
  // the skill as the marking basis". NEVER "the rubric demands the skill".
  const n6 = checkSkillDemand(rubric, scenario, skill, paper);
  for (const p of n6.parts) {
    lines.push(`${p.name}: ${p.status === 'pass' ? 'PASS' : p.status === 'fail' ? 'FAIL — ' + p.detail : 'NOT EVALUATED — ' + p.detail}`);
  }
  // `ok` is true when nothing FAILED, and nothing can fail a check that did not run. On SBL,
  // three of five skills are structurally not evaluated (see the N6 header in narrative-marker.ts),
  // so a gate line reading only PASS/FAIL would let a drill whose precondition was never tested
  // read exactly like one whose precondition was tested and held. The coverage is recorded on its
  // own line so it lands in the stored `gate_lines` and in the pack.
  const notEvaluated = n6.parts.filter((p) => p.status === 'not_evaluated');
  lines.push(`N6 coverage: ${n6.evaluatedAll ? 'every part evaluated' : `${notEvaluated.length} of ${n6.parts.length} part(s) NOT EVALUATED — ${notEvaluated.map((p) => p.name).join('; ')}`}`);
  if (!n6.ok) fails.push(`N6: ${n6.reason}`);

  return { ok: fails.length === 0, lines, feedback: fails.join('\n') };
}

// Serialize the narrative rubric to the answer_schema jsonb (ruling 7 — no new column). Carries
// rubric_version + the golden BAD/designed-flags as authoring artefacts (_authoring; never served).
function serializeNarrativeSchema(drill: NarrativeDrill): Record<string, unknown> {
  return {
    mode: 'narrative',
    rubric_version: 'narrative_v1',
    requirement_parts: drill.rubric.requirement_parts,
    scenario_facts: drill.rubric.scenario_facts,
    criteria: drill.rubric.criteria,
    total_marks: drill.rubric.total_marks,
    bands: drill.rubric.bands,
    _authoring: {
      golden_bad: drill.golden_bad,
      designed_bad_flags: drill.designed_bad_flags,
      note: 'Authoring artefacts (Rule-23 golden BAD + its designed F-modes). NOT served. The golden GOOD is model_answer.',
    },
  };
}

// ── DRY-RUN CAPTURE → REVIEW → INSERT THE SAME BYTES ─────────────────────────
// Drafts land in docs/rollbacks/ because that is already the directory for a pre-write record of
// exactly what is about to hit the DB (P-DB6: the artefact is the record of what was written and
// why). Committed, so the reviewed content is in git before the row exists.
const NARRATIVE_DRAFT_DIR = join(__dirname, '..', 'docs', 'rollbacks');
// The paper is part of the FILENAME, not just the contents. Plan ids are only unique within a
// paper (nothing stops SBL reusing 'D1'), and a draft whose paper is discoverable only by
// opening it is one an insert can be pointed at by mistake.
function narrativeDraftPath(paper: GeneratorPaper, planId: string): string {
  return join(NARRATIVE_DRAFT_DIR, `${paper}_narrative_draft_${planId}.json`);
}

/**
 * ⚠️ A DRY RUN MUST NOT DESTROY THE THING IT IS A DRY RUN AGAINST.
 *
 * `narrativeDraftPath` is deterministic — same paper, same plan id, same filename — so re-running
 * a batch for a plan that already has a captured draft silently overwrote it. That draft is a
 * COMMITTED artefact and, for a plan whose row is already in the DB, it is the only record outside
 * the DB of what that row was built from. Found the hard way rebuilding SBL-A4: the dry run
 * replaced the committed draft of the LIVE row with a draft of a row that does not exist yet, with
 * no flag, no prompt and no mention in the output. Recoverable from git only because it happened
 * to be committed and the tree happened to be clean.
 *
 * The rule now: an existing draft is NEVER written through. The new capture lands on the next free
 * `.2.json`, `.3.json` … sibling and BOTH paths are printed, so nothing is lost and the operator
 * chooses which one an insert is pointed at. `--overwrite-draft` opts back into in-place writing
 * for the case where the existing file is genuinely stale.
 *
 * Deliberately NOT a refusal. Blocking the run would break the ordinary iterate-on-a-brief loop,
 * and a guard that stops useful work gets bypassed; preserving costs one file.
 *
 * Does NOT apply to `--narrative-regate-from` or `--narrative-revise-reveal-from`, which take a
 * draft path as INPUT and rewrite it deliberately. Overwriting the file you named is the point
 * there; overwriting a file you did not name is the defect.
 */
function nextFreeDraftPath(path: string): string {
  if (!existsSync(path)) return path;
  const stem = path.replace(/\.json$/i, '');
  for (let n = 2; n < 1000; n++) {
    const candidate = `${stem}.${n}.json`;
    if (!existsSync(candidate)) return candidate;
  }
  throw new Error(`cannot find a free draft filename beside ${path} — clean up the .N.json siblings`);
}

/** The acca_drills row. ONE definition, used by both the live insert and the dry-run capture, so a
 *  reviewed draft cannot differ from an inserted row by a field the capture forgot to include. */
function buildNarrativeRow(
  plan: NarrativePlan,
  topic: string,
  drill: NarrativeDrill,
  model_answer: string,
  answer_schema: Record<string, unknown>,
  reveal: { hint: string; full_reveal: string },
) {
  return {
    exam_board:             'ACCA',
    paper_code:             plan.paper,
    lo_code:                plan.lo_code,
    topic,
    command_verb:           drill.command_verb,
    intellectual_level:     plan.level,
    // DECLARED on the plan, not derived — see NarrativePlan.skill for why the rotation
    // cannot be used here. Was hardcoded null until 2026-08-01, which is how the narrative
    // batch contributed 8 untagged rows to the AFM corpus.
    professional_skill_tag: plan.skill,
    calculation_required:   false,
    mode:                   'discursive',
    marks_guide:            drill.rubric.total_marks,
    question:               drill.question,
    context_text:           drill.context_text,
    model_answer,
    hint:                   reveal.hint,
    full_reveal:            reveal.full_reveal,
    answer_schema,
    status:                 'candidate',
    published:              false,
  };
}

/** Reconstruct the gate-input shape from a captured draft row. The draft stores the SERVED shape
 *  (model_answer = heading + reveal, rubric under answer_schema), so the golden GOOD has to be
 *  recovered by stripping the heading — done here once rather than at each call site. */
function draftToGateInput(row: Record<string, unknown>): { drill: NarrativeDrill; skill: string } {
  const schema = row.answer_schema as Record<string, unknown>;
  const authoring = (schema._authoring ?? {}) as { golden_bad?: string; designed_bad_flags?: NarrativeFailureMode[] };
  const modelAnswer = String(row.model_answer);
  // The heading is the first line; the reveal is everything after the blank line that follows it.
  const reveal = modelAnswer.split('\n').slice(1).join('\n').trim();
  if (!reveal) throw new Error('draft model_answer has a heading but no reveal body');
  return {
    drill: {
      question: String(row.question),
      context_text: String(row.context_text),
      command_verb: String(row.command_verb),
      rubric: {
        mode: 'narrative',
        requirement_parts: schema.requirement_parts as string[],
        scenario_facts: schema.scenario_facts as ScenarioFact[],
        criteria: schema.criteria as Criterion[],
        total_marks: schema.total_marks as number,
        bands: schema.bands as { min: number; label: string }[],
      },
      reveal,
      golden_bad: authoring.golden_bad ?? '',
      designed_bad_flags: authoring.designed_bad_flags ?? [],
    },
    skill: row.professional_skill_tag as string,
  };
}

/**
 * Re-run the FULL N1–N6 barrier against a captured draft and rewrite its `gate_lines`.
 *
 * Exists because a hand edit to a captured rubric — rewording a criterion after review — is
 * otherwise ungated: the gates ran against the draft as GENERATED, and the stored `gate_lines`
 * would keep asserting a green that no longer describes the file. Re-gating in place keeps the
 * draft's own record of its gating true to its current bytes.
 */
async function regateNarrativeDraft(anthropic: Anthropic, draftPath: string) {
  const parsed = JSON.parse(readFileSync(draftPath, 'utf8')) as { plan_id?: string; row?: Record<string, unknown>; gate_lines?: string[] };
  if (!parsed.row) throw new Error(`${draftPath}: no "row" key — not a narrative draft file`);
  const { drill, skill } = draftToGateInput(parsed.row);
  // The paper comes off the ROW's own `paper_code`, not off a separate draft key — the row is the
  // thing being re-gated, and a paper read from anywhere else could disagree with what would be
  // inserted. N6b's precondition differs by paper for a shared skill NAME (commercial_acumen), so
  // a re-gate that did not pass it would silently apply AFM's test to an SBL rubric.
  const paper = String(parsed.row.paper_code ?? '');
  console.log(`Re-gating ${parsed.plan_id ?? draftPath} [${paper || 'paper unknown'}] — ${drill.rubric.criteria.length} criteria / ${drill.rubric.total_marks} marks · declared skill: ${skill}`);
  const report = await runNarrativeGates(drill, makeAnthropicCriterionGrader(anthropic, { paper }), skill, paper);
  const lines = [...report.lines];

  // P4 + P7 ON THE TEACHING LEG. runNarrativeGates covers N1–N6, which are all about the RUBRIC and
  // the golden pair — none of them reads `hint` or `full_reveal`. Those two fields are linted in the
  // authoring loop (P4 jurisdiction/frozen-facts, P7 misconception-lead) and were NOT re-run here,
  // so a hand edit to a teaching field could previously be reported "re-gated GREEN" by a check that
  // had never looked at the field that changed. Added 2026-08-02 when D9's full_reveal was rewritten.
  const rev = { hint: String(parsed.row.hint ?? ''), full_reveal: String(parsed.row.full_reveal ?? '') };
  const p4 = [
    ...lintJurisdiction(rev, { context: drill.context_text }),
    ...lintFrozenMarketFacts(rev),
  ];
  lines.push(`P4 jurisdiction / frozen-facts (hint + full_reveal): ${p4.length === 0 ? 'PASS' : 'FAIL — ' + p4.map((i) => `[${i.field}] ${i.message}`).join(' · ')}`);
  const p7 = lintMisconceptionLead(rev.full_reveal);
  lines.push(`P7 misconception-lead (full_reveal carries a real "...misconception...: " sentence): ${p7.length === 0 ? 'PASS' : 'FAIL — ' + p7.map((i) => i.message).join(' · ')}`);

  const ok = report.ok && p4.length === 0 && p7.length === 0;
  lines.forEach((l) => console.log(`  ${l}`));
  parsed.gate_lines = lines;
  writeFileSync(draftPath, JSON.stringify(parsed, null, 2), 'utf8');
  console.log(ok ? `\n✓ ${parsed.plan_id} re-gated GREEN (N1–N6 + P4 + P7) — draft updated` : `\n✗ ${parsed.plan_id} re-gate FAILED`);
  return ok;
}

/**
 * Update an EXISTING candidate row from a captured draft. Used when a drill is already inserted
 * and its content is edited after review — re-inserting would mint a new id, and the id is
 * already cited in the pack, the journal and the code map.
 *
 * Refuses to touch anything published: this path edits candidates only.
 */
async function updateNarrativeDraft(supabase: ReturnType<typeof createClient>, draftPath: string, drillId: string) {
  const parsed = JSON.parse(readFileSync(draftPath, 'utf8')) as { plan_id?: string; row?: Record<string, unknown> };
  const row = parsed.row;
  if (!row) throw new Error(`${draftPath}: no "row" key — not a narrative draft file`);

  const { data: before, error: readErr } = await supabase.from('acca_drills')
    .select('id, lo_code, status, published, professional_skill_tag, marks_guide').eq('id', drillId).single();
  if (readErr || !before) throw new Error(`target drill ${drillId} not found: ${readErr?.message}`);
  const b = before as unknown as Record<string, unknown>;
  if (b.status !== 'candidate' || b.published !== false) {
    throw new Error(`refusing to update ${drillId}: it is status=${String(b.status)} published=${String(b.published)} — this path edits CANDIDATES only`);
  }
  if (b.lo_code !== row.lo_code || b.professional_skill_tag !== row.professional_skill_tag) {
    throw new Error(`refusing to update ${drillId}: draft is ${String(row.lo_code)}/${String(row.professional_skill_tag)} but the row is ${String(b.lo_code)}/${String(b.professional_skill_tag)} — wrong target`);
  }

  const { error } = await supabase.from('acca_drills').update({
    question: row.question, context_text: row.context_text, model_answer: row.model_answer,
    hint: row.hint, full_reveal: row.full_reveal, answer_schema: row.answer_schema,
    command_verb: row.command_verb, marks_guide: row.marks_guide,
  } as never).eq('id', drillId);
  if (error) throw new Error(`update failed: ${error.message}`);
  console.log(`✓ ${parsed.plan_id ?? '(draft)'} updated in place — ${drillId} (still candidate/unpublished)`);
  return drillId;
}

/** Insert a captured dry-run draft verbatim. No model call, no regeneration — the point is that the
 *  bytes reviewed are the bytes stored. Refuses a draft that is not `candidate`/unpublished: this
 *  path must never be a way to write live content. */
async function insertNarrativeDraft(supabase: ReturnType<typeof createClient>, draftPath: string) {
  const parsed = JSON.parse(readFileSync(draftPath, 'utf8')) as { plan_id?: string; row?: Record<string, unknown> };
  const row = parsed.row;
  if (!row) throw new Error(`${draftPath}: no "row" key — not a narrative draft file`);
  if (row.status !== 'candidate' || row.published !== false) {
    throw new Error(`${draftPath}: draft is status=${String(row.status)} published=${String(row.published)} — this path inserts candidates only`);
  }
  for (const f of ['question', 'context_text', 'model_answer', 'hint', 'full_reveal', 'answer_schema', 'lo_code', 'professional_skill_tag']) {
    if (row[f] === undefined || row[f] === null || row[f] === '') throw new Error(`${draftPath}: draft field "${f}" is empty`);
  }
  const { data, error } = await supabase.from('acca_drills').insert(row as never).select('id').single();
  if (error) throw new Error(`insert failed: ${error.message}`);
  const id = (data as unknown as { id: string }).id;
  console.log(`✓ ${parsed.plan_id ?? '(draft)'} inserted as candidate — id ${id}`);
  console.log(`  lo_code=${String(row.lo_code)} · skill=${String(row.professional_skill_tag)} · marks=${String(row.marks_guide)}`);
  return id;
}

/**
 * Re-run PASS 2 ONLY on a captured draft — regenerate hint + full_reveal, keep everything else.
 *
 * WHY THIS EXISTS RATHER THAN A RE-RUN. Pass 1 produces the scenario, rubric and golden pair; pass
 * 2 produces the teaching leg. A defect in the teaching prompt does not implicate pass 1's output,
 * and re-running the whole batch would DISCARD reviewed rubrics and goldens to regenerate content
 * that was never at fault — the model does not repeat itself, so what was reviewed would not be
 * what ships. This rewrites the two teaching fields in place and re-runs their gates (P4 + P7).
 *
 * Refuses anything already published, and refuses to write if the new reveal fails its gates —
 * a draft with a stale-but-green teaching leg is better than one with an ungated new leg.
 */
async function reviseNarrativeReveal(anthropic: Anthropic, draftPath: string): Promise<boolean> {
  const parsed = JSON.parse(readFileSync(draftPath, 'utf8')) as { plan_id?: string; row?: Record<string, unknown>; gate_lines?: string[] };
  if (!parsed.row) throw new Error(`${draftPath}: no "row" key — not a narrative draft file`);
  if (parsed.row.published === true) throw new Error(`${draftPath}: row is published — pass 2 revision is an authoring-time act only`);
  const plan = NARRATIVE_PLAN.find((p) => p.id === parsed.plan_id);
  if (!plan) throw new Error(`${draftPath}: no plan with id "${parsed.plan_id}" — cannot resolve its designed failure mode`);

  const lo = frameworkFor(plan.paper).syllabus[plan.lo_code];
  const spec: RevealInput = {
    lo_code: plan.lo_code,
    topic: lo.topic,
    command_verb: String(parsed.row.command_verb),
    intellectual_level: plan.level,
    mode: loModeFor(plan.paper, plan.lo_code),
    designed_failure: designedFailureFor(plan),
  };
  console.log(`Pass-2 revision ${plan.id} [${plan.paper}] — headline must be: ${spec.designed_failure ?? '(no mode declared — author chooses)'}`);

  let reveal: { hint: string; full_reveal: string } | null = null;
  for (let attempt = 0; attempt < 3; attempt++) {
    try { reveal = await draftReveal(anthropic, plan.paper, spec, String(parsed.row.question), String(parsed.row.model_answer)); }
    catch (err) { console.warn(`  ↻ attempt ${attempt + 1} error: ${(err as Error).message}`); await sleep(2000); continue; }
    const jur = [
      ...lintJurisdiction({ hint: reveal.hint, full_reveal: reveal.full_reveal }, { context: String(parsed.row.context_text) }),
      ...lintFrozenMarketFacts({ hint: reveal.hint, full_reveal: reveal.full_reveal }),
    ];
    const misc = lintMisconceptionLead(reveal.full_reveal);
    if (!jur.length && !misc.length) break;
    for (const i of [...jur, ...misc]) console.warn(`  ↻ attempt ${attempt + 1} gate: [${i.field}] ${i.message.slice(0, 120)}`);
    reveal = null; await sleep(1000);
  }
  if (!reveal) { console.error(`  ✗ ${plan.id} — pass 2 did not produce a gate-clean reveal; draft left UNCHANGED`); return false; }

  parsed.row.hint = reveal.hint;
  parsed.row.full_reveal = reveal.full_reveal;
  parsed.gate_lines = [...(parsed.gate_lines ?? []).filter((l) => !l.startsWith('P4 ') && !l.startsWith('P7 ')),
    'P4 jurisdiction/frozen-facts on the REVISED teaching leg: PASS',
    'P7 misconception-lead on the REVISED teaching leg: PASS'];
  writeFileSync(draftPath, JSON.stringify(parsed, null, 2), 'utf8');
  console.log(`  ✓ ${plan.id} — hint + full_reveal rewritten; pass 1 rubric and goldens untouched`);
  return true;
}

async function runNarrativeBatch(anthropic: Anthropic, supabase: ReturnType<typeof createClient> | null, dryRun: boolean, only?: string, paper?: string, overwriteDraft = false) {
  // ONE GRADER PER PAPER, NOT ONE PER BATCH. The grader carries the marker's system prompt, and
  // SBL's development test is the examiners' four-limb one where AFM's is claim→because→
  // implication. A batch hoisting a single grader would gate an SBL drill with an AFM marker —
  // which is exactly what happened on this batch's first run, and it failed N1 on a criterion the
  // reveal did satisfy under the rubric as written.
  const graders = new Map<string, ReturnType<typeof makeAnthropicCriterionGrader>>();
  const graderFor = (p: GeneratorPaper) => {
    if (!graders.has(p)) graders.set(p, makeAnthropicCriterionGrader(anthropic, { paper: p }));
    return graders.get(p)!;
  };
  // THROWS on a duplicate id or an unmatched --narrative-only, rather than filtering to [] and
  // reporting a clean "0/0" (P-G1: the batch must be able to say it did not run).
  const plans = assertNarrativePlanIds(NARRATIVE_PLAN, only, paper);
  const MAX_ATTEMPTS = 5;
  const failed: string[] = [];

  for (const plan of plans) {
    const lo = frameworkFor(plan.paper).syllabus[plan.lo_code];
    if (!lo) { console.error(`  ✗ ${plan.id} — lo_code "${plan.lo_code}" is not in the ${plan.paper} syllabus map`); failed.push(plan.id); continue; }
    console.log(`\n${'═'.repeat(80)}`);
    console.log(`NARRATIVE ${plan.id} [${plan.paper}]: ${plan.lo_code} — ${lo.sub_area}: ${lo.topic}  (covers ${plan.covers.join('/')}, L${plan.level})`);
    console.log(`geo: ${plan.region} / ${plan.sector}`);
    console.log('─'.repeat(80));

    let drill: NarrativeDrill | null = null;
    let feedback: string | undefined;
    let lastLines: string[] = [];
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      let candidate: NarrativeDrill;
      try { candidate = await draftNarrativeDrill(anthropic, plan, feedback); }
      catch (err) { console.warn(`  ↻ ${plan.id} attempt ${attempt} draft error: ${(err as Error).message}`); await sleep(2000); continue; }

      const report = await runNarrativeGates(candidate, graderFor(plan.paper), plan.skill, plan.paper);
      console.log(`\n  attempt ${attempt}:`);
      report.lines.forEach((l) => console.log(`    ${l}`));
      if (report.ok) { drill = candidate; lastLines = report.lines; break; }
      feedback = report.feedback;
      await sleep(500);
    }

    if (!drill) { console.error(`  ✗ ${plan.id} — did not pass N1–N5 in ${MAX_ATTEMPTS} attempts`); failed.push(plan.id); continue; }

    // Build the served model_answer = STABLE HEADING (area-entry key) + the golden-GOOD reveal.
    const model_answer = `${plan.heading}\n\n${drill.reveal.trim()}`;
    const answer_schema = serializeNarrativeSchema(drill);

    console.log(`\n  ✓ ${plan.id} gates PASS (${lastLines.length} checks)`);
    console.log(`\n  CONTEXT_TEXT:\n${drill.context_text}`);
    console.log(`\n  QUESTION:\n${drill.question}`);
    console.log(`\n  MODEL_ANSWER (heading + golden GOOD):\n${model_answer}`);
    console.log(`\n  RUBRIC: ${drill.rubric.criteria.length} criteria / ${drill.rubric.total_marks} marks · parts: ${drill.rubric.requirement_parts.join(' | ')}`);
    console.log(`  designed BAD flags: ${drill.designed_bad_flags.join(', ')}`);

    // Pass 2 — Ezra teaching reveal (hint + full_reveal).
    //
    // Built from the PLAN and the paper's own syllabus row, not from `buildSpecsForList` — that
    // helper reads AFM's SYLLABUS_MAP and its `LoMode`, so it cannot serve a second paper, and
    // the five fields the reveal prompt actually reads are all available here directly. The
    // rotation-derived skill tag it used to supply was overridden on the next line anyway.
    const spec: RevealInput = {
      lo_code: plan.lo_code,
      topic: lo.topic,
      command_verb: drill.command_verb,
      intellectual_level: plan.level,
      // ⚠️ READ FROM THE LO, NOT SET TO 'discursive', AND THAT IS DELIBERATE EVEN THOUGH IT
      // LOOKS WRONG. A narrative drill IS discursive by construction, so 'discursive' is the
      // truthful value — but two live AFM plans sit on LOs whose AFM mode is something else
      // (D7 on E2c = mixed, D10 on E3a = quantitative), and both shipped with their LO's mode
      // in this prompt line. Hardcoding the honest value here would change the Ezra prompt for
      // those two, which is a content change wearing a refactor's clothes. It is preserved and
      // flagged, not fixed in passing. A framework with no per-LO mode (SBL) falls to
      // 'discursive', which for that paper is a statement about this pipeline, not a lookup.
      mode: loModeFor(plan.paper, plan.lo_code),
      // The seam this closes: the rubric knew its designed failure and the teaching call did not.
      designed_failure: designedFailureFor(plan),
    };
    let reveal: { hint: string; full_reveal: string } | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try { reveal = await draftReveal(anthropic, plan.paper, spec, drill.question, model_answer); break; }
      catch (err) { if (attempt === 0) { console.warn(`  ↻ ${plan.id} [Ezra] retry (${(err as Error).message})`); await sleep(2000); } else { console.error(`  ✗ ${plan.id} [Ezra] FAILED`); } }
    }
    if (!reveal) { failed.push(plan.id); continue; }
    // P4 invented-fact / frozen-facts lint on the teaching reveal (matches the calculator loop).
    const revealJur = [
      ...lintJurisdiction({ hint: reveal.hint, full_reveal: reveal.full_reveal }, { context: drill.context_text }),
      ...lintFrozenMarketFacts({ hint: reveal.hint, full_reveal: reveal.full_reveal }),
    ];
    if (revealJur.length) {
      console.error(`  ✗ ${plan.id} — reveal jurisdiction lint (P4) FAILED:`);
      for (const iss of revealJur) console.error(`      ✗ [${iss.field}] ${iss.message}`);
      failed.push(plan.id); continue;
    }
    // P7 — misconception-lead gate: full_reveal must carry a REAL "...misconception...: " sentence,
    // never the extractMisconceptionLead fallback (see validate-afm-prose.ts). Fails loud, no insert.
    const revealMisconception = lintMisconceptionLead(reveal.full_reveal);
    if (revealMisconception.length) {
      console.error(`  ✗ ${plan.id} — misconception-lead gate (P7) FAILED:`);
      for (const iss of revealMisconception) console.error(`      ✗ [${iss.field}] ${iss.message}`);
      failed.push(plan.id); continue;
    }
    console.log(`\n  HINT:\n${reveal.hint}`);
    console.log(`\n  FULL_REVEAL:\n${reveal.full_reveal}`);

    const row = buildNarrativeRow(plan, lo.topic, drill, model_answer, answer_schema, reveal);

    if (dryRun) {
      // CAPTURE, don't just print. A dry-run whose artefact is only echoed to a terminal forces the
      // real run to REGENERATE — and the model does not repeat itself, so what was reviewed is not
      // what ships. The draft is written to a file and `--narrative-insert-from` inserts THAT
      // BYTE-FOR-BYTE, so review and insert are the same artefact.
      const canonical = narrativeDraftPath(plan.paper, plan.id);
      const path = overwriteDraft ? canonical : nextFreeDraftPath(canonical);
      writeFileSync(path, JSON.stringify({ plan_id: plan.id, lo_code: plan.lo_code, skill: plan.skill, gate_lines: lastLines, row }, null, 2), 'utf8');
      console.log(`\n  (dry-run — NOT inserted; draft captured to ${path})`);
      if (path !== canonical) {
        console.log(`  ⚠️ ${canonical} ALREADY EXISTED and was left untouched — a dry run does not overwrite a captured draft.`);
        console.log(`     Compare the two, then delete whichever is stale. Pass --overwrite-draft to write the canonical path in place.`);
      }
      console.log(`  insert this exact draft with: npx tsx --env-file=.env.local scripts/generate-acca-drills.ts --narrative-insert-from ${path}`);
      await sleep(200); continue;
    }

    const { error: insErr } = await supabase!.from('acca_drills').insert(row as never);
    if (insErr) { console.error(`  ✗ ${plan.id} INSERT failed: ${insErr.message}`); failed.push(plan.id); }
    else { console.log(`\n  ✓ ${plan.id} — inserted as candidate (mode=discursive, rubric_version=narrative_v1)`); }
    await sleep(300);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(dryRun ? `Narrative dry-run complete — ${plans.length - failed.length}/${plans.length} passed gates, 0 inserted.` : `Narrative batch done. ${plans.length - failed.length}/${plans.length} inserted.`);
  if (failed.length) console.error(`Failed: ${failed.join(', ')}`);
  // Returned so the caller can set a non-zero exit code — see the P-G1 note at the call site.
  return failed.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const arg  = (f: string) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : undefined; };
  const flag = (f: string) => argv.includes(f);

  const loFilter = arg('--lo');
  const losArg   = arg('--los');
  const dryRun   = flag('--dry-run');
  const npvBatch = flag('--npv-batch');
  const apvBatch = flag('--apv-batch');
  const capmBatch = flag('--capm-batch');
  const durationBatch = flag('--duration-batch');
  const creditBatch = flag('--credit-batch');
  const bsopBatch = flag('--bsop-batch');
  const valuationBatch = flag('--valuation-batch');
  const internationalBatch = flag('--international-batch');
  const riskBatch = flag('--risk-batch');
  const fxhedgeBatch = flag('--fxhedge-batch');
  const narrativeBatch = flag('--narrative-batch');

  const USAGE = 'Usage:\n  --los A3a,B4c [--dry-run]   explicit list, one drill per code\n  --lo A3a [--dry-run]        single LO\n  --npv-batch [--dry-run]     B1a NPV batch (4 drills: standard/rationing/sensitivity/section-A)\n  --apv-batch [--dry-run]     B3j/B3k APV batch (4 drills: standard/subsidised/reject/financing-compare)\n  --capm-batch [--dry-run]    B3d/B3e CAPM batch (4 drills: project-specific/org-wacc/keu-for-apv/wrong-hurdle)\n  --duration-batch [--dry-run] B3f duration batch (4 drills: standard/compare/zero-coupon/limitations)\n  --credit-batch [--dry-run]  B3h/B4a credit-risk batch (4 drills: downgrade/spread-estimation/kd-term-structure/debt-valuation)\n  --bsop-batch [--dry-run]    B2a/B2c BSOP / real-options batch (4 drills: financial-product/delay/expand/withdraw)\n  --valuation-batch [--dry-run] B4a/B4b/B4c valuation batch (5 drills: fcff-enterprise/fcfe-equity/dividend-capacity/valuation-compare + B4c rehab)\n  --international-batch [--dry-run] B5/A6a international batch (4 drills: home-currency-NPV/exchange-rate-sensitivity/restricted-remittance/multinational-dividend-capacity)\n  --risk-batch [--dry-run]    B1a/B1b risk & uncertainty batch (4 drills: enpv/sensitivity/radr-compare/risk-measures)\n  --fxhedge-batch [--dry-run] E2b FX-hedging batch (4 drills: forward-mmh-compare/futures/options/swap)\n  --narrative-batch [--dry-run] narrative cluster (8 discursive drills). D1–D5 (B): MonteCarlo/sources/capital-structure/BSOP-conceptual/exchange-controls. D6–D8 (PS-cell batch): E2a scepticism / E2c commercial-acumen / B1b scepticism. --narrative-only D3 regenerates one; --narrative-paper SBL narrows to one paper (both error loudly on an unknown value). A dry run NEVER overwrites an existing captured draft — it writes the next free .N.json sibling and names both; --overwrite-draft opts into writing the canonical path in place.';
  const KNOWN_FLAGS = new Set(['--lo', '--los', '--dry-run', '--npv-batch', '--apv-batch', '--capm-batch', '--duration-batch', '--credit-batch', '--bsop-batch', '--valuation-batch', '--international-batch', '--risk-batch', '--fxhedge-batch', '--narrative-batch', '--narrative-only', '--narrative-paper', '--narrative-insert-from', '--narrative-revise-reveal-from', '--narrative-regate-from', '--narrative-update-from', '--drill-id']);
  const unknown = argv.filter((a) => a.startsWith('--') && !KNOWN_FLAGS.has(a));
  if (unknown.length) { console.error(`Error: unrecognised flag(s): ${unknown.join(', ')}\n\n${USAGE}`); process.exit(1); }

  // Insert a captured dry-run draft VERBATIM (no model call). Separate from --narrative-batch so a
  // review→insert can never accidentally regenerate the content it was reviewing.
  // Re-gate a hand-edited draft through the FULL N1–N6 barrier (real grader), rewriting its
  // gate_lines so the draft's own record stays true to its bytes.
  const regateFrom = arg('--narrative-regate-from');
  if (regateFrom) {
    const ok = await regateNarrativeDraft(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }), regateFrom);
    process.exitCode = ok ? 0 : 1;
    return;
  }

  // Apply a re-gated draft to an EXISTING candidate row (edit in place; the id is already cited).
  const updateFrom = arg('--narrative-update-from');
  if (updateFrom) {
    const drillId = arg('--drill-id');
    if (!drillId) { console.error('Error: --narrative-update-from requires --drill-id <uuid>'); process.exitCode = 1; return; }
    const supabaseU = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    await updateNarrativeDraft(supabaseU, updateFrom, drillId);
    return;
  }

  // Pass-2-only revision: regenerate the teaching leg on captured drafts, keep pass 1's work.
  const reviseFrom = argv.filter((a, i) => argv[i - 1] === '--narrative-revise-reveal-from');
  if (reviseFrom.length) {
    const anth = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    let bad = 0;
    for (const f of reviseFrom) { if (!(await reviseNarrativeReveal(anth, f))) bad++; }
    process.exitCode = bad === 0 ? 0 : 1;   // P-G1: a run that changed nothing must not exit 0
    return;
  }

  const insertFrom = arg('--narrative-insert-from');
  if (insertFrom) {
    const supabaseI = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    await insertNarrativeDraft(supabaseI, insertFrom);
    return;
  }

  // Narrative pipeline (#2) — dedicated path (rubric-graded discursive drills, N1–N5, real grader).
  if (narrativeBatch) {
    const only = arg('--narrative-only');
    const anthropicN = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const supabaseN = dryRun ? null : createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
    // P-G1 — the batch reported failures to STDOUT and exited 0. Measured 2026-08-02: a D11 run
    // whose drill failed all 5 attempts and wrote NO draft still exited 0, and a caller reading only
    // the exit code (or a run whose stdout was redirected, which is how this was found) saw success.
    // A batch that produced nothing must not be able to say it succeeded.
    const failed = await runNarrativeBatch(anthropicN, supabaseN, dryRun, only, arg('--narrative-paper'), flag('--overwrite-draft'));
    process.exitCode = failed === 0 ? 0 : 1;   // P-G4: set exitCode, never process.exit()
    return;
  }

  if ([npvBatch, apvBatch, capmBatch, durationBatch, creditBatch, bsopBatch, valuationBatch, internationalBatch, riskBatch].filter(Boolean).length > 1) { console.error('Error: pass only one calculator batch flag.'); process.exit(1); }

  let specs: AfmDrillSpec[];
  if (npvBatch) {
    const kinds: NpvKind[] = ['standard', 'rationing', 'sensitivity', 'section_a'];
    specs = kinds.map((k) => ({ ...buildSpecsForList(['B1a'] as LoCode[])[0], npv_kind: k }));
  } else if (capmBatch) {
    // 4 kinds → 2× B3e (project_specific first-of-family, keu_for_apv boundary closure) +
    // 2× B3d (org_wacc, wrong_hurdle). Fresh sectors/currencies. Rulings 2026-07-13.
    const plan: { kind: CapmKind; lo: LoCode; region: string; sector: string }[] = [
      { kind: 'project_specific', lo: 'B3e', region: 'India',   sector: 'telecommunications infrastructure (INR)' },
      { kind: 'org_wacc',         lo: 'B3d', region: 'Mexico',  sector: 'food & beverage / consumer staples (MXN)' },
      { kind: 'keu_for_apv',      lo: 'B3e', region: 'the UAE', sector: 'hospitality / hotel development (AED; CT 9%)' },
      { kind: 'wrong_hurdle',     lo: 'B3d', region: 'Taiwan',  sector: 'semiconductors (TWD)' },
    ];
    specs = plan.map((p) => ({
      ...buildSpecsForList([p.lo] as LoCode[])[0],
      capm_kind: p.kind, region_hint: p.region, sector_hint: p.sector, calculation_required: true,
    }));
  } else if (durationBatch) {
    // 4 kinds, all B3f; kind 4 (limitations) dual-covers B3g (journalled). Fresh sectors/currencies.
    const plan: { kind: DurationKind; region: string; sector: string }[] = [
      { kind: 'standard',    region: 'Chile',     sector: 'utilities / power generation (CLP)' },
      { kind: 'compare',     region: 'Turkey',    sector: 'aviation / airline (TRY — deep double-digit yield, or hard-currency facilities)' },
      { kind: 'zero_coupon', region: 'Indonesia', sector: 'property development (IDR)' },
      { kind: 'limitations', region: 'Germany',   sector: 'automotive manufacturing (EUR)' },
    ];
    specs = plan.map((p) => ({
      ...buildSpecsForList(['B3f'] as LoCode[])[0],
      duration_kind: p.kind, region_hint: p.region, sector_hint: p.sector, calculation_required: true,
    }));
  } else if (creditBatch) {
    // Credit-risk batch (calc #7). 4 kinds → 3× B3h (rating role / spread / cost of debt via term
    // structure) + 1× B4a (corporate-debt valuation). kd_term_structure is first-of-family.
    // Fresh sectors/currencies, zero overlap with the 17 burned. Rulings 2026-07-15.
    const plan: { kind: CreditKind; lo: LoCode; region: string; sector: string }[] = [
      { kind: 'kd_term_structure', lo: 'B3h', region: 'Japan',    sector: 'rail freight / railway operator (JPY — low government spot curve)' },
      { kind: 'spread_estimation', lo: 'B3h', region: 'Singapore', sector: 'port / container-terminal operator (SGD)' },
      { kind: 'downgrade_impact',  lo: 'B3h', region: 'Colombia', sector: 'cement / building materials (COP — deep double-digit government yields)' },
      { kind: 'debt_valuation',    lo: 'B4a', region: 'Sweden',   sector: 'grocery / food retail (SEK)' },
    ];
    specs = plan.map((p) => ({
      ...buildSpecsForList([p.lo] as LoCode[])[0],
      credit_kind: p.kind, region_hint: p.region, sector_hint: p.sector, calculation_required: true,
    }));
  } else if (bsopBatch) {
    // BSOP / real-options batch (calc #8). 4 kinds → 1× B2a (financial-product, first-of-family) +
    // 3× B2c (delay/expand/withdraw); B2b classification woven as prose. Fresh sector/currency pairs,
    // zero overlap with the 21 burned. Rulings 2026-07-15.
    const plan: { kind: BsopKind; lo: LoCode; region: string; sector: string }[] = [
      { kind: 'financial_product_valuation', lo: 'B2a', region: 'Switzerland', sector: 'listed-equity warrant / executive share options (CHF — traded underlying)' },
      { kind: 'option_to_delay',             lo: 'B2c', region: 'Norway',      sector: 'offshore oil & gas exploration licence (NOK — defer development)' },
      { kind: 'option_to_expand',            lo: 'B2c', region: 'Denmark',     sector: 'green-hydrogen pilot plant (DKK — scale-up growth option)' },
      { kind: 'option_to_withdraw',          lo: 'B2c', region: 'Hong Kong',   sector: 'container-shipping vessel operator (HKD — abandon/redeploy put)' },
    ];
    specs = plan.map((p) => ({
      ...buildSpecsForList([p.lo] as LoCode[])[0],
      bsop_kind: p.kind, region_hint: p.region, sector_hint: p.sector, calculation_required: true,
    }));
  } else if (valuationBatch) {
    // Batch #9 (valuation family). 4 fresh kinds + the parked-B4c rehab (5th, in-family fcff_enterprise).
    // Fresh sector/currency pairs, ZERO overlap with the 24 burned (SAR/THB/NZD/PHP all new). Rulings 2026-07-16:
    // K1 light-composes CAPM (own geared βe + structure → Ke → WACC, no peer ungearing); K2 = no-growth FCFE @ Ke
    // (exact FCFF↔FCFE reconciliation, internal); K3 dividend capacity domestic (remittance blocks → batch #10);
    // K4 Gordon DCF + relative multiple → range; SAR states one clean tax rate (no zakat/mixed-ownership).
    const plan: { kind: ValuationKind; lo: LoCode; region: string; sector: string }[] = [
      { kind: 'fcff_enterprise',   lo: 'B4a', region: 'Saudi Arabia',    sector: 'private hospital / healthcare-services group (SAR — acquisition target; CAPM→WACC derived)' },
      { kind: 'fcfe_equity',       lo: 'B4b', region: 'Thailand',        sector: 'branded household & personal-care FMCG manufacturer (THB — FCFE @ Ke, no growth)' },
      { kind: 'dividend_capacity', lo: 'B4b', region: 'New Zealand',     sector: 'regulated water & wastewater utility (NZD — mature, cash-generative; dividend capacity, DOMESTIC — A6 multinational/transfer-pricing dividend policy naturally rides batch #10)' },
      { kind: 'valuation_compare', lo: 'B4a', region: 'Philippines',     sector: 'IT / business-process-outsourcing services group (PHP — two-method bid range)' },
      { kind: 'fcff_enterprise',   lo: 'B4c', region: 'Australia',       sector: 'diversified industrial group (AUD — the parked-B4c rehab, regenerated through the hardened calculator)' },
    ];
    specs = plan.map((p) => ({
      ...buildSpecsForList([p.lo] as LoCode[])[0],
      valuation_kind: p.kind, region_hint: p.region, sector_hint: p.sector, calculation_required: true,
    }));
  } else if (apvBatch) {
    // 4 kinds → 3× B3j (quantitative) + 1× B3k (mixed). Fresh sectors/currencies, no overlap
    // with the NPV/IRR batches (pharma/wind/lithium/gold/US-industrial). Rulings 2026-07-13.
    const plan: { kind: ApvKind; lo: LoCode; region: string; sector: string }[] = [
      { kind: 'standard',          lo: 'B3j', region: 'Malaysia',    sector: 'data-centre / digital infrastructure (MYR)' },
      { kind: 'subsidised',        lo: 'B3j', region: 'Brazil',      sector: 'toll-road / transport infrastructure (BRL)' },
      { kind: 'reject',            lo: 'B3j', region: 'South Korea', sector: 'shipbuilding / marine engineering (KRW)' },
      { kind: 'financing_compare', lo: 'B3k', region: 'Poland',      sector: 'logistics / warehousing property (PLN)' },
    ];
    specs = plan.map((p) => ({
      ...buildSpecsForList([p.lo] as LoCode[])[0],
      apv_kind: p.kind, region_hint: p.region, sector_hint: p.sector,
      calculation_required: true,   // B3k is 'mixed' but every APV drill supplies figures + a schema
    }));
  } else if (internationalBatch) {
    // Batch #10 (international family, calculator #10). 4 kinds → B5b / B5a / B5b(+B5c dual) / A6a.
    // Fresh home/foreign currency pairs, ZERO overlap with the burned set. Rulings 2026-07-17:
    // basis = PPP for every drill (multi-year translation; IRP reserved for short-horizon forwards);
    // credit-method double-tax with the home-liability cap. A6a (K4) = DIRECT-LINK-ONLY serve,
    // EXCLUDED from all B-tier/coverage counts + public claims until Section A surfaces (HARD RULE).
    const plan: { kind: InternationalKind; lo: LoCode; region: string; sector: string }[] = [
      { kind: 'home_currency_standard',        lo: 'B5b', region: 'Morocco',   sector: 'a US (USD) parent appraising a Moroccan (MAD) automotive-components plant — home-currency method, PPP-forecast spot' },
      { kind: 'exchange_rate_sensitivity',     lo: 'B5a', region: 'Egypt',     sector: 'a UK (GBP) parent appraising an Egyptian (EGP) mobile-telecoms network build — base vs a sharper EGP devaluation (the decision flip)' },
      { kind: 'restricted_remittance',         lo: 'B5b', region: 'China',     sector: 'a Eurozone (EUR) parent appraising a Chinese (CNY) speciality-chemicals project — capital controls block part of the cash (moderate inflation; B5c strategies for restricted remittance)' },
      { kind: 'multinational_dividend_capacity', lo: 'A6a', region: 'Malaysia', sector: 'an Australian (AUD, ~30% corporate) parent drawing dividends from a Malaysian (MYR, 24% corporate) palm-oil-processing subsidiary — Malaysia\'s single-tier system levies 0% withholding on outbound dividends, so the ~6-point differential is a CHARGED additional home tax (remittance timing + differential credit). MYR is a MODERATE-denomination currency (spot ~2.9 MYR/AUD) so the remitted amount is a MATERIAL AUD figure, not a rounding-scale sliver' },
    ].filter((p) => !process.env.INTL_ONLY || p.kind === process.env.INTL_ONLY);
    specs = plan.map((p) => ({
      ...buildSpecsForList([p.lo] as LoCode[])[0],
      international_kind: p.kind, region_hint: p.region, sector_hint: p.sector,
      calculation_required: true,
    }));
  } else if (riskBatch) {
    // Risk & uncertainty (calculator #3, B1a iv/v/vi + B1b ii). 4 kinds; conventions page-verified
    // (S1–S7, docs/evidence/AFM_RISK_EVIDENCE.md). All lo_code B1a except VaR/duration which also
    // covers B1b(ii) — tagged B1a (single-tag, dual-coverage journalled). B1 ENTRY-RANK stays NPV.
    // Currencies are MODERATE-denomination (THB/ZAR/PLN/BRL) — huge-denomination units (VND/IDR) make
    // "X millions" an unrealistic scale for a project (international-batch lesson). RISK_ONLY regenerates
    // a single kind (delete the stale candidate first).
    const plan: { kind: RiskKind; lo: LoCode; region: string; sector: string }[] = [
      { kind: 'enpv',          lo: 'B1a', region: 'Thailand',     sector: 'an automotive-components assembly project — a new production line under three demand states (probability-weighted ENPV + P(negative NPV)); THB is moderate-denomination so THB millions is a realistic scale' },
      { kind: 'sensitivity',   lo: 'B1a', region: 'South Africa', sector: 'a platinum-group-metals processing project — selling-price and discount-rate sensitivity margins' },
      { kind: 'radr_compare',  lo: 'B1a', region: 'Poland',       sector: 'an industrials group entering renewable-energy generation (a DIFFERENT risk class) — company WACC vs a proxy-beta project-specific RADR (the decision flip)' },
      { kind: 'risk_measures', lo: 'B1a', region: 'Brazil',       sector: 'an infrastructure operator choosing between a front-loaded and a back-loaded concession — comparative project duration + a one-tail project VaR' },
    ].filter((p) => !process.env.RISK_ONLY || p.kind === process.env.RISK_ONLY);
    specs = plan.map((p) => ({
      ...buildSpecsForList([p.lo] as LoCode[])[0],
      risk_kind: p.kind, region_hint: p.region, sector_hint: p.sector,
      calculation_required: true,
    }));
  } else if (fxhedgeBatch) {
    // FX hedging (calculator #11, E2b) — Step-0 ruled 2026-07-22 (evidence: SD25 Passmore,
    // J24 Mahoney, D23 Abertafol premium formula, SD2019 Okan Co MMH, F9 technical article).
    // 4 kinds, all E2b (the quantitative FX-hedging LO). Both quote directions exercised
    // (K1/K2/K4 foreign_per_home, K3 home_per_foreign) per the ruling — never one hardcoded
    // direction. K2 exercises the forward_topup residual policy (the Mahoney instructed-override
    // shape); the others use the Passmore default (residual immaterial). Fresh currencies, no
    // overlap with the burned set. FX_ONLY regenerates a single kind (delete the stale candidate first).
    const plan: { kind: FxHedgeKind; region: string; sector: string; qd: QuoteDirection; dir: ExposureDirection; residual?: ResidualPolicy; premiumCcy?: 'home' | 'foreign' }[] = [
      // FIX ROUND 1 follow-up (found by spot-checking the regenerated pack, not by any gate — GATE
      // 17b only proves the injected sentence matches the PARAMETER; it can't catch the parameter
      // itself being economically incoherent for the chosen currency pairing). A Peruvian exporter
      // (home=PEN, the objectively WEAKER currency) receiving a USD receipt (foreign=USD, stronger)
      // is the realistic trade shape; PEN/USD is naturally quoted "PEN per USD 1" — that is
      // home_per_foreign (home units per 1 foreign unit), NOT foreign_per_home. The original
      // 'foreign_per_home' assignment was arbitrary and produced an inverted, ~14x-wrong conversion
      // once the model (sensibly) wrote the realistic PEN-company framing. Every batch-plan qd must
      // be checked against which currency is objectively STRONGER for that specific pairing — the
      // pattern in both sourced conventions (Passmore: weak R per 1 strong $; Okan: weak Y$ per 1
      // strong EUR) is always [weaker currency] per [1 unit of the stronger currency].
      { kind: 'forward_mmh_compare', region: 'Peru', sector: 'a Peruvian (PEN) agricultural-commodities exporter with a USD export receipt from a US buyer — forward vs money-market hedge', qd: 'home_per_foreign', dir: 'receipt' },
      // residual_policy left at the DEFAULT ('immaterial', Passmore Co's own primary convention) —
      // NOT 'forward_topup' — see the KNOWN INTERACTION note on ResidualPolicy in fxhedge.ts: when
      // the topup forward rate sits close to the lock-in rate, GATE 3's generic seeded-OFR proof can
      // near-cancel across the two redistribution legs. forward_topup is fixture-proven (test-fxhedge.ts)
      // but not exercised in this live batch; a future forward_topup drill needs a topup rate that
      // differs meaningfully from the lock-in rate.
      { kind: 'futures', region: 'Ghana', sector: 'a UK (GBP) cocoa-processing importer paying a Ghanaian (GHS) supplier — currency futures', qd: 'foreign_per_home', dir: 'payment' },
      { kind: 'options', region: 'Jordan', sector: 'a Jordanian (JOD) pharmaceuticals manufacturer with a US-dollar (USD) export receipt — currency options, premium quoted in the home currency (matching Passmore Co\'s own examiner point)', qd: 'home_per_foreign', dir: 'receipt', premiumCcy: 'home' },
      // FIX ROUND 1 (2026-07-22): the live drill quoted "LKR per JPY 1" in prose while the code
      // parameter was foreign_per_home (JPY per LKR) — a parameter↔prose inversion (now
      // structurally impossible via the {{QUOTE_SENTENCE}} injection) that also produced an
      // unrealistic rate (~0.72; real LKR/JPY is ~2.0). Fixed to home_per_foreign (LKR per JPY,
      // matching the prose direction) with an explicit realistic-magnitude steer.
      { kind: 'swap', region: 'Sri Lanka', sector: 'a Sri Lankan (LKR) tea-export group with a Japanese-yen (JPY) equipment-financing payment — currency swap covering only part of the flow (the Mahoney Co shape). Rates quoted LKR per JPY 1; the REAL-WORLD magnitude is around LKR 2.0 per JPY 1 — pick swap_rate and residual_forward_rate near that level (e.g. 1.9-2.1), not under 1', qd: 'home_per_foreign', dir: 'payment' },
    ].filter((p) => !process.env.FX_ONLY || p.kind === process.env.FX_ONLY);
    specs = plan.map((p) => ({
      ...buildSpecsForList(['E2b'] as LoCode[])[0],
      fxhedge_kind: p.kind, region_hint: p.region, sector_hint: p.sector,
      fx_quote_direction: p.qd, fx_exposure_direction: p.dir, fx_residual_policy: p.residual, fx_premium_currency: p.premiumCcy,
      calculation_required: true,
    }));
  } else {
    const loCodes: LoCode[] = losArg
      ? (losArg.split(',').map((s) => s.trim()) as LoCode[])
      : loFilter ? [loFilter as LoCode] : [];
    if (loCodes.length === 0) { console.error(`Error: no scope specified.\n\n${USAGE}`); process.exit(1); }
    for (const code of loCodes) {
      if (!(code in SYLLABUS_MAP)) { console.error(`Error: unknown LO code "${code}". Valid: ${Object.keys(SYLLABUS_MAP).join(', ')}`); process.exit(1); }
    }
    specs = buildSpecsForList(loCodes);
  }
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  const supabase = dryRun ? null : createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const failed: number[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec = specs[i];
    const label = `[${i + 1}/${specs.length}] ${spec.lo_code} · ${spec.command_verb} · L${spec.intellectual_level} · ${spec.mode} · ${spec.marks_guide}m`;

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`DRILL ${i + 1}/${specs.length}: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}`);
    console.log(`verb: ${spec.command_verb} | level: L${spec.intellectual_level} | mode: ${spec.mode}${spec.npv_kind ? ` (${spec.npv_kind})` : ''} | calc_required: ${spec.calculation_required} | marks: ${spec.marks_guide} | skill: ${spec.professional_skill_tag ?? 'none'} | geo: ${spec.region_hint}/${spec.sector_hint}`);
    console.log('─'.repeat(80));

    // Pass 1
    let drill: DrillOutput | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try { drill = await generateDrill(anthropic, spec); break; }
      catch (err) {
        if (attempt === 0) { console.warn(`  ↻ ${label} [P1] retry (${(err as Error).message})`); await sleep(2000); }
        else { console.error(`  ✗ ${label} [P1] FAILED: ${(err as Error).message}`); failed.push(i + 1); }
      }
    }
    if (!drill) { await sleep(200); continue; }

    console.log(`\nCOMMAND_VERB (model-reported): ${drill.command_verb}`);
    console.log(`\nCONTEXT_TEXT:\n${drill.context_text}`);
    console.log(`\nQUESTION:\n${drill.question}`);
    console.log(`\nMODEL_ANSWER:\n${drill.model_answer}`);

    // Quantitative gates — run for ANY drill that produced a numeric schema, not just
    // mode==='quantitative': the APV compare variant is a 'mixed' LO (B3k) but carries a
    // full answer_schema and MUST pass every gate before insert.
    let gatesOk = true;
    if (drill._liveSchema) {
      if (drill._rawInputs && drill._computed) {
        const cur = drill._currency ?? '$';
        console.log(`\nRAW INPUTS (model-supplied, currency ${cur}): ${JSON.stringify(drill._rawInputs)}`);
        console.log(`CODE-COMPUTED: FCFF=${money(cur, drill._computed.fcff)}  firm=${money(cur, drill._computed.firm_value)}  equity=${money(cur, drill._computed.equity_value)}`);
      }
      if (drill._npvInputs && drill._npvComputed) {
        const cur = drill._currency ?? '$';
        const nc = drill._npvComputed;
        console.log(`\nNPV KIND: ${spec.npv_kind ?? 'standard'}  (${nc.n}-year, tax_lag ${drill._npvInputs.tax_lag}, ${nc.horizon}-period)`);
        console.log(`RAW INPUTS (model-supplied, currency ${cur}): ${JSON.stringify(drill._npvInputs)}`);
        console.log(`CODE-COMPUTED: NPV=${money(cur, nc.npv)}  decision=${nc.accept ? 'ACCEPT' : 'REJECT'}${nc.pi !== undefined ? `  PI=${nc.pi.toFixed(3)}` : ''}${nc.sensitivity_pct !== undefined ? `  sensitivity=${nc.sensitivity_pct.toFixed(2)}%` : ''}`);
      }
      if (drill._apvInputs && drill._apvComputed) {
        const cur = drill._currency ?? '$';
        const ac = drill._apvComputed;
        console.log(`\nAPV KIND: ${spec.apv_kind ?? 'standard'}  (${ac.n}-year, tax_lag ${drill._apvInputs.tax_lag}, Keu ${(ac.keu * 100).toFixed(2)}%, Kd ${((ac.kd ?? 0) * 100).toFixed(2)}%)`);
        console.log(`RAW INPUTS (model-supplied, currency ${cur}): ${JSON.stringify(drill._apvInputs)}`);
        if (spec.apv_kind === 'financing_compare') {
          console.log(`CODE-COMPUTED: base=${money(cur, ac.base_npv)}  APV(debt)=${money(cur, ac.apv_debt ?? 0)}  APV(equity)=${money(cur, ac.apv_equity ?? 0)}  choice=${ac.financing_choice}  decision=${ac.accept ? 'ACCEPT' : 'REJECT'}`);
        } else {
          console.log(`CODE-COMPUTED: base=${money(cur, ac.base_npv)}  shield=${money(cur, ac.tax_shield ?? 0)}${ac.subsidy_benefit !== undefined ? `  subsidy=${money(cur, ac.subsidy_benefit)}` : ''}${ac.issue_costs !== undefined ? `  issueCosts=${money(cur, ac.issue_costs)}` : ''}  APV=${money(cur, ac.apv)}  decision=${ac.accept ? 'ACCEPT' : 'REJECT'}`);
        }
      }
      if (drill._capmInputs && drill._capmComputed) {
        const cc = drill._capmComputed;
        console.log(`\nCAPM KIND: ${spec.capm_kind ?? 'project_specific'}  (Rf ${(cc.rf * 100).toFixed(2)}%, MRP ${(cc.mrp * 100).toFixed(2)}%, tax ${(cc.tax * 100).toFixed(2)}%, β_d ${cc.debt_beta})`);
        console.log(`RAW INPUTS (model-supplied): ${JSON.stringify(drill._capmInputs)}`);
        if (spec.capm_kind === 'wrong_hurdle') {
          console.log(`CODE-COMPUTED: companyWACC=${cc.company_wacc?.toFixed(2)}%  projectWACC=${cc.project_wacc?.toFixed(2)}%  return=${cc.project_return}%  correct=${cc.accept ? 'ACCEPT' : 'REJECT'}  FLIPS=${cc.flips}`);
        } else {
          console.log(`CODE-COMPUTED: assetβ=${cc.asset_beta?.toFixed(3) ?? '—'}  regearedβ=${cc.regeared_beta?.toFixed(3) ?? '—'}  Ke=${(cc.ke ?? cc.keu)?.toFixed(2) ?? '—'}%  WACC=${cc.wacc?.toFixed(2) ?? '—'}%`);
        }
      }
      if (drill._durationInputs && drill._durationComputed) {
        const dc = drill._durationComputed;
        const cur = drill._currency ?? '$';
        console.log(`\nDURATION KIND: ${spec.duration_kind ?? 'standard'}  (${dc.primary.maturity}yr, coupon ${(dc.primary.coupon_rate * 100).toFixed(2)}%, YTM ${(dc.primary.ytm * 100).toFixed(2)}%)`);
        console.log(`RAW INPUTS (model-supplied, ${cur}): ${JSON.stringify(drill._durationInputs)}`);
        if (spec.duration_kind === 'compare') {
          console.log(`CODE-COMPUTED: ${dc.primary.label} mod=${dc.primary.modified.toFixed(3)}y  vs  ${dc.bond_b!.label} mod=${dc.bond_b!.modified.toFixed(3)}y  →  more exposed = ${dc.more_exposed}`);
        } else if (spec.duration_kind === 'zero_coupon') {
          console.log(`CODE-COMPUTED: zero Macaulay=${dc.primary.macaulay.toFixed(3)}y (=maturity ${dc.primary.maturity}) · coupon-ref Macaulay=${dc.coupon_ref!.macaulay.toFixed(3)}y · identity ${dc.zero_identity_ok}`);
        } else {
          console.log(`CODE-COMPUTED: price=${money(cur, dc.primary.price)}  Macaulay=${dc.primary.macaulay.toFixed(3)}y  modified=${dc.primary.modified.toFixed(3)}y  ΔP/P(${((dc.yield_shift ?? 0) * 10000).toFixed(0)}bp)=${dc.price_sensitivity?.toFixed(2)}%`);
        }
      }
      if (drill._intlKind) {
        console.log(`\nINTERNATIONAL KIND: ${drill._intlKind}  (currency ${drill._currency})`);
        console.log(`CODE-COMPUTED: ${drill._intlSummary}`);
      }
      console.log(`\nANSWER_SCHEMA (serialised → answer_schema jsonb):\n${JSON.stringify(drill.answer_schema, null, 2)}`);
      const report = runQuantitativeGates(drill);
      gatesOk = report.ok;
      console.log(`\n── QUANTITATIVE GATES ${'─'.repeat(54)}`);
      report.lines.forEach((l) => console.log(l));
      console.log(`── GATES ${report.ok ? 'PASS ✓' : 'FAIL ✗'} ${'─'.repeat(60)}`);
      if (!report.ok) { console.error(`  ✗ ${label} — gates FAILED, will not insert`); failed.push(i + 1); if (!dryRun) { await sleep(200); continue; } }
    }

    // Pass 2 — Ezra reveal
    let reveal: { hint: string; full_reveal: string } | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      try { reveal = await draftReveal(anthropic, NUMERIC_BATCH_PAPER, spec, drill.question, drill.model_answer); break; }
      catch (err) {
        if (attempt === 0) { console.warn(`  ↻ ${label} [P2] retry (${(err as Error).message})`); await sleep(2000); }
        else { console.error(`  ✗ ${label} [P2] FAILED: ${(err as Error).message}`); failed.push(i + 1); }
      }
    }
    if (!reveal) { await sleep(200); continue; }
    console.log(`\nHINT:\n${reveal.hint}`);
    console.log(`\nFULL_REVEAL:\n${reveal.full_reveal}`);

    // P4 re-check on the reveal fields (generated after the primary gates). Pass the
    // scenario so the "stated in the scenario" cross-reference works.
    const revealJur = [
      ...lintJurisdiction({ hint: reveal.hint, full_reveal: reveal.full_reveal }, { context: drill.context_text }),
      ...lintFrozenMarketFacts({ hint: reveal.hint, full_reveal: reveal.full_reveal }),
    ];
    if (revealJur.length) {
      console.error(`  ✗ ${label} — reveal jurisdiction lint (P4) FAILED, will not insert`);
      for (const iss of revealJur) console.error(`      ✗ [${iss.field}] ${iss.message}`);
      failed.push(i + 1);
      gatesOk = false;
    }
    // P7 — misconception-lead gate: full_reveal must carry a REAL "...misconception...: " sentence,
    // never the extractMisconceptionLead fallback (see validate-afm-prose.ts). Fails loud, no insert.
    const revealMisconception = lintMisconceptionLead(reveal.full_reveal);
    if (revealMisconception.length) {
      console.error(`  ✗ ${label} — misconception-lead gate (P7) FAILED, will not insert`);
      for (const iss of revealMisconception) console.error(`      ✗ [${iss.field}] ${iss.message}`);
      failed.push(i + 1);
      gatesOk = false;
    }

    if (dryRun) { await sleep(200); continue; }
    if (!gatesOk) { await sleep(200); continue; }

    const { error: insErr } = await supabase!.from('acca_drills').insert({
      exam_board:             'ACCA',
      paper_code:             NUMERIC_BATCH_PAPER,
      lo_code:                spec.lo_code,
      topic:                  spec.topic,
      command_verb:           drill.command_verb || spec.command_verb,
      intellectual_level:     spec.intellectual_level,
      professional_skill_tag: spec.professional_skill_tag ?? null,
      calculation_required:   spec.calculation_required,
      mode:                   spec.mode,
      marks_guide:            spec.marks_guide,
      question:               drill.question,
      context_text:           drill.context_text,
      model_answer:           drill.model_answer,
      hint:                   reveal.hint,
      full_reveal:            reveal.full_reveal,
      answer_schema:          drill.answer_schema ?? null,
      status:                 'candidate',
      published:              false,
    });
    if (insErr) { console.error(`  ✗ ${label} INSERT failed: ${insErr.message}`); failed.push(i + 1); }
    else { console.log(`\n  ✓ ${label} — inserted as candidate`); }
    await sleep(200);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(dryRun ? `Dry run complete — ${specs.length} drill(s) generated, 0 inserted.` : `Done. ${specs.length - failed.length}/${specs.length} drills inserted.`);
  if (failed.length) console.log(`Failed/again spec indices: ${[...new Set(failed)].join(', ')}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN-MODULE GUARD. Without it, `main()` fires on IMPORT — so nothing could import this file
// to test it, and the only way to pin its output was to copy the source and strip this line.
// That is precisely how the pre-change capture for test:narrative-paper-pins had to be taken.
// Run as a CLI this is a no-op; imported, the module is now inert.
// ─────────────────────────────────────────────────────────────────────────────
const invokedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  const norm = (p: string) => p.replace(/\\/g, '/').toLowerCase();
  return norm(entry).endsWith('generate-acca-drills.ts');
})();

if (invokedDirectly) {
  main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
}

export {
  // Exported for the pin fixture ONLY (test-narrative-paper-pins.ts). These are the
  // paper-coupled surfaces AFM's output is proven unchanged across; nothing else imports them.
  buildNarrativeUserPrompt, buildNarrativeRow, narrativeDraftPath, draftToGateInput,
  draftReveal, FAILURE_MODE_TEACHING, type RevealInput,
  serializeNarrativeSchema, buildRevealPromptAfm, buildRevealPromptSbl, REVEAL_PROMPT_BUILDER,
  NARRATIVE_AUTHOR_PERSONA, SKILL_DEMAND_BY_PAPER, skillDemandFor, NARRATIVE_PLAN,
  PAPER_FRAMEWORKS, frameworkFor, assertNarrativePlanIds, NUMERIC_BATCH_PAPER,
  type GeneratorPaper, type NarrativePlan,
};
