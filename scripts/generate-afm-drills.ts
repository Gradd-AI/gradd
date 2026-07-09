#!/usr/bin/env tsx
/**
 * generate-afm-drills.ts
 *
 * Drafts ACCA AFM practice drills and inserts them into `acca_drills` with
 * status='candidate', paper_code='AFM'. Ports scripts/generate-apm-drills.ts with the
 * AFM divergences from the pilot gap analysis:
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
 *   npm run generate-afm-drills -- --los A3a,B4c [--dry-run]
 *   npm run generate-afm-drills -- --lo A3a [--dry-run]
 *
 * Reads .env.local for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  SYLLABUS_MAP,
  COMMAND_VERBS,
  type LoCode,
  type LoMode,
  type ProfessionalSkillTag,
} from './afm-framework';
import {
  verifyNumericAnswer,
  type AnswerSchema,
  type Component,
  type Tolerance,
  type StudentSubmission,
  type Verdict,
} from '../lib/acca/numeric-verifier';
import { validateSchemaSelfConsistency } from '../lib/acca/validate-schema';

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
}

// ─────────────────────────────────────────────────────────────────────────────
// FCFF calculator — deterministic. Code owns every figure; the model never computes.
// (Mirror of computeRegression / buildRegressionModelAnswer in generate-apm-drills.ts.)
// Registered by LO in QUANT_CALCULATORS; only B4b/B4c (FCFF firm value) is wired for the pilot.
// ─────────────────────────────────────────────────────────────────────────────

const FCFF_LOS = new Set<LoCode>(['B4b', 'B4c']);

interface FcffInputs {
  pbit:                  number; // operating profit before interest and tax ($m)
  tax_rate:              number; // decimal fraction, e.g. 0.25
  depreciation:          number; // non-cash add-back ($m)
  capex:                 number; // capital reinvestment ($m)
  delta_working_capital: number; // increase in working capital ($m)
  wacc:                  number; // decimal fraction, e.g. 0.10
  growth_rate:           number; // perpetuity growth, decimal fraction, e.g. 0.03
  debt_value:            number; // market value of debt ($m)
}

interface FcffComputed {
  fcff:        number;
  firm_value:  number;
  equity_value: number;
}

// Rates sometimes arrive as percentages (10) instead of decimals (0.10). Normalise
// defensively: anything > 1 for a rate field is treated as a percentage.
function asDecimalRate(v: number): number {
  return v > 1 ? v / 100 : v;
}

function computeFcff(raw: FcffInputs): FcffComputed {
  const tax  = asDecimalRate(raw.tax_rate);
  const wacc = asDecimalRate(raw.wacc);
  const g    = asDecimalRate(raw.growth_rate);

  for (const [k, v] of Object.entries(raw)) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      throw new Error(`FCFF input "${k}" is not a finite number: ${JSON.stringify(v)}`);
    }
  }
  if (tax < 0 || tax >= 1)  throw new Error(`tax_rate out of range (0,1): ${tax}`);
  if (wacc <= 0 || wacc >= 1) throw new Error(`wacc out of range (0,1): ${wacc}`);
  if (g < 0)                throw new Error(`growth_rate must be ≥ 0: ${g}`);
  if (wacc - g < 0.005)     throw new Error(`WACC (${wacc}) must exceed growth (${g}) by ≥ 0.5% for a stable perpetuity`);

  const fcff = raw.pbit * (1 - tax) + raw.depreciation - raw.capex - raw.delta_working_capital;
  if (!(fcff > 0)) throw new Error(`Computed FCFF must be positive for a coherent valuation drill: ${fcff}`);

  const firm_value = (fcff * (1 + g)) / (wacc - g);
  const equity_value = firm_value - raw.debt_value;
  if (!(equity_value > 0)) throw new Error(`Equity value must be positive (firm ${firm_value} − debt ${raw.debt_value})`);

  return { fcff, firm_value, equity_value };
}

const fmt1 = (n: number): string => n.toFixed(1);
const rel = (pct: number): Tolerance => ({ kind: 'relative', pct });

// Money display honouring the drill's currency. ISO-style codes (AUD, ZAR) read "AUD 179.0m";
// bare symbols ($) read "$179.0m". Normalised so the currency the model set in context_text
// carries through to the worked answer instead of a hardcoded "$".
function normaliseCurrency(raw: string | undefined): string {
  const c = (raw ?? '$').trim();
  return /^[A-Za-z]{2,4}$/.test(c) ? c.toUpperCase() : (c || '$');
}
function money(currency: string, n: number): string {
  return /^[A-Za-z]{2,4}$/.test(currency) ? `${currency} ${fmt1(n)}m` : `${currency}${fmt1(n)}m`;
}

// Build the LIVE schema (recompute as functions — for the gates + OFR proof) and its
// serialisable projection (recompute as rule-id strings + a per-drill params block, for
// the answer_schema jsonb column). The string→function registry resolution at serve time
// is Phase 2B-later (numeric-verifier.ts header note; design §16). Nothing reads
// answer_schema at serve time yet (mode routing dormant), so persisting the projection is
// forward-compatible, not load-bearing.
interface SerializedComponent {
  component_id:   string;
  label?:         string;
  expected_value: number;
  unit?:          string;
  tolerance:      Tolerance;
  working_steps?: string[];
  depends_on?:    string[];
  recompute?:     string;   // rule-id, resolved via registry at serve time
  weight?:        number;
}
interface SerializedSchema {
  components: SerializedComponent[];
  params:     Record<string, number>;
}

function buildFcffSchema(raw: FcffInputs, c: FcffComputed, currency: string): { schema: AnswerSchema; serialized: SerializedSchema } {
  const tax  = asDecimalRate(raw.tax_rate);
  const wacc = asDecimalRate(raw.wacc);
  const g    = asDecimalRate(raw.growth_rate);
  const debt = raw.debt_value;
  const moneyUnit = `${currency}m`; // e.g. "AUDm" / "$m" — classified as money by validate-schema

  const components: Component[] = [
    {
      component_id: 'fcff',
      label: 'Free cash flow to firm (FCFF)',
      expected_value: c.fcff,
      unit: moneyUnit,
      tolerance: rel(0.5),
      working_steps: [
        'FCFF = PBIT × (1 − t) + depreciation − capex − ΔWC',
        `= ${fmt1(raw.pbit)} × (1 − ${tax}) + ${fmt1(raw.depreciation)} − ${fmt1(raw.capex)} − ${fmt1(raw.delta_working_capital)} = ${fmt1(c.fcff)}`,
      ],
    },
    {
      component_id: 'firm_value',
      label: 'Enterprise (firm) value',
      expected_value: c.firm_value,
      unit: moneyUnit,
      tolerance: rel(0.5),
      depends_on: ['fcff'],
      recompute: (d) => (d.fcff * (1 + g)) / (wacc - g),
      working_steps: [
        'Firm value = FCFF × (1 + g) / (WACC − g)   [FCFF discounted at WACC, not Ke]',
        `= ${fmt1(c.fcff)} × (1 + ${g}) / (${wacc} − ${g}) = ${fmt1(c.firm_value)}`,
      ],
    },
    {
      component_id: 'equity_value',
      label: 'Equity value',
      expected_value: c.equity_value,
      unit: moneyUnit,
      tolerance: rel(0.5),
      depends_on: ['firm_value'],
      recompute: (d) => d.firm_value - debt,
      working_steps: [
        'Equity value = firm value − market value of debt',
        `= ${fmt1(c.firm_value)} − ${fmt1(debt)} = ${fmt1(c.equity_value)}`,
      ],
    },
  ];

  const recomputeIds: Record<string, string | undefined> = {
    fcff: undefined,
    firm_value: 'firm_value_perpetuity_growth',
    equity_value: 'equity_value_strip_debt',
  };

  const serialized: SerializedSchema = {
    components: components.map((comp) => {
      const s: SerializedComponent = {
        component_id: comp.component_id,
        label: comp.label,
        expected_value: comp.expected_value,
        unit: comp.unit,
        tolerance: comp.tolerance,
        working_steps: comp.working_steps,
        depends_on: comp.depends_on,
        weight: comp.weight,
      };
      const rid = recomputeIds[comp.component_id];
      if (rid) s.recompute = rid;
      return s;
    }),
    params: { wacc, growth_rate: g, debt_value: debt, tax_rate: tax },
  };

  return { schema: { components }, serialized };
}

function buildFcffModelAnswer(raw: FcffInputs, c: FcffComputed, prose: string, currency: string): string {
  const tax  = asDecimalRate(raw.tax_rate);
  const wacc = asDecimalRate(raw.wacc);
  const g    = asDecimalRate(raw.growth_rate);
  const m = (n: number) => money(currency, n);
  return [
    '**Firm and equity valuation (free cash flow to firm)**',
    '',
    '**Step 1 — Free cash flow to firm (FCFF)**',
    '',
    'FCFF = PBIT × (1 − t) + depreciation − capex − ΔWorking capital',
    `= ${fmt1(raw.pbit)} × (1 − ${tax}) + ${fmt1(raw.depreciation)} − ${fmt1(raw.capex)} − ${fmt1(raw.delta_working_capital)}`,
    `= **${m(c.fcff)}**  *(FCFF is a firm-level flow — interest is NOT deducted; it belongs to the discount rate)*`,
    '',
    '**Step 2 — Enterprise (firm) value**',
    '',
    'Firm value = FCFF × (1 + g) / (WACC − g)  *(the firm flow is discounted at WACC, not the cost of equity)*',
    `= ${fmt1(c.fcff)} × (1 + ${g}) / (${wacc} − ${g}) = **${m(c.firm_value)}**`,
    '',
    '**Step 3 — Equity value**',
    '',
    'Equity value = firm value − market value of debt',
    `= ${fmt1(c.firm_value)} − ${fmt1(raw.debt_value)} = **${m(c.equity_value)}**  *(strip the debt — the FCFF value is the whole firm)*`,
    '',
    '**Step 4 — Advice to the board**',
    '',
    prose,
    '',
    `*Reconciliation: firm value ${m(c.firm_value)} − debt ${m(raw.debt_value)} = equity ${m(c.equity_value)} ✓*`,
  ].join('\n');
}

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
  'flow (FCFE / dividends) at the cost of equity; NEVER deduct interest when computing FCFF; strip debt to ' +
  'get equity value; add growth to a perpetuity ONLY where the scenario supports it; compute any growth rate ' +
  'from the data given. ' +
  '(#6 DEVELOP ASSUMPTIONS) Each assumption → why it might not hold → its effect on the figure/decision; ' +
  'never a bare list of assumption headings. ' +
  '(#9 OWN-FIGURE / DO NOT ABANDON) A wrong upstream figure still earns the downstream method and the ' +
  'recommendation — the model answer should demonstrate carrying a figure forward, not restarting. ' +
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

const EZRA_TEACHING_PERSONA =
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
  'the linked marks after a wrong number). Then give the diagnosis-led reframe: why that thinking is wrong and ' +
  'what the correct mental model is. This is NOT a restated model answer — it is a mental-model correction. ' +
  '\n\n' + BOARDROOM_BAR_PASS2 + '\n\n' +
  'TEACHING RULES: ' +
  '(1) When explaining why a claim is wrong, state the correct causal mechanism — reason WHY the misconception ' +
  'produces the wrong conclusion, do not merely restate the right answer. ' +
  '(2) VALUATION PLUMBING: firm flow (FCFF) → WACC; equity flow (FCFE/dividends) → cost of equity; never ' +
  'deduct interest in FCFF; strip debt for equity value; growth on a perpetuity only where the scenario ' +
  'supports it. ' +
  '(3) OWN-FIGURE: where a calculation goes wrong, teach the student to carry their own figure forward — the ' +
  'downstream method and the recommendation still score; the error is charged once, at its source. ' +
  '(4) Avoid over-absolute causal language ("directly causes", "depends entirely on"); use "may", "is likely ' +
  'to", "suggests" for chains the scenario does not prove. ' +
  '(5) ASSERTION DISCIPLINE: state as fact only what the scenario provides; phrase un-evidenced risks/causes ' +
  'conditionally. Scepticism challenges the data and names what to verify, it does not invent the answer. ' +
  'INTELLECTUAL LEVEL: ALWAYS 1/2/3, NEVER AO framing (AO1, AO5).';

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

CODE-COMPUTES-STATS PROTOCOL — MANDATORY. All arithmetic (FCFF, firm value, equity value) is
computed by code from your raw inputs. Your job: supply the scenario, the raw input figures, and
the evaluative prose. DO NOT compute or state anywhere: FCFF, firm value, enterprise value, equity
value, or any discount factor. Those are inserted by code.

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}. Name an organisation the board is valuing (an acquisition target, a division being valued, or the company itself).
- question: begins with "Advise" — ask the candidate to value the firm and its equity using FCFF and ADVISE the board on the value (and whether an implied offer/price is justified).
- context_text: 2–3 sentences of scenario narrative + a clean labelled list of the raw inputs (money figures in millions of the LOCAL currency, rates in %): operating profit (PBIT), tax rate, depreciation/non-cash, capital expenditure (capex), the increase in working capital, the WACC, the long-term growth rate, and the market value of debt. Use the local currency for ${spec.region_hint} (e.g. AUD, ZAR, BRL) consistently, and report its ISO code in the currency field. Give figures a candidate could compute from — do NOT pre-compute FCFF or value.
- Provide the SAME figures as the structured raw_inputs object. Rates (tax_rate, wacc, growth_rate) as DECIMAL FRACTIONS (0.25 for 25%). WACC must exceed the growth rate by at least 1 percentage point. Choose figures so FCFF and equity value are positive and debt is below firm value.
- interpretation_prose: 3–5 sentences of qualitative advice ONLY (state NO computed numbers). Cover: (i) the plumbing done right — FCFF is a FIRM flow discounted at WACC (not the cost of equity), and equity value strips out debt; (ii) whether the perpetuity-growth assumption is safe for THIS company and what a lower growth rate would do to the value; (iii) one scepticism point challenging an input (the growth rate, the WACC's current relevance, or the sustainability of the FCFF); (iv) a CLEAR recommendation to the board (no fence-sitting).
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}.`;
}

function buildRevealPrompt(spec: AfmDrillSpec, question: string, modelAnswer: string): string {
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
2. full_reveal — 3–5 sentences: name the specific AFM misconception a typical candidate brings to this type of question (fence-sitting / scenario-free / valuation-plumbing / undeveloped-assumption / abandoned-after-calc), then give the diagnosis-led reframe (why that thinking is wrong, the correct mental model). Not a restatement of the model answer.

Anchor the reveal to the BOARDROOM BAR: the universal AFM failure is a calculation that never became advice. Where the drill is calculative, teach the own-figure move (carry a wrong figure forward — the downstream method and the recommendation still score).

Quality rules (mandatory):
- State the correct causal mechanism when reframing a misconception — WHY it produces the wrong conclusion, not just the right answer.
- Valuation plumbing: firm flow → WACC; equity flow → cost of equity; never deduct interest in FCFF; strip debt for equity value.
- Use "may", "is likely to", "suggests" for causal chains; avoid "directly", "depends entirely on" where the scenario shows only plausibility.
- Assert only what the scenario states; phrase un-evidenced risks conditionally.
- Intellectual level: ALWAYS 1/2/3, NEVER AO framing (AO1, AO5).`;
}

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
      context_text: { type: 'string', description: 'Scenario narrative + a labelled list of the raw inputs. NO computed FCFF, firm value, equity value or discount factors.' },
      command_verb: { type: 'string', description: 'The verb(s) the question demands, lowercase (e.g. "advise", "calculate and advise").' },
      currency: { type: 'string', description: 'The ISO 4217 currency code used for the money figures in context_text, e.g. "AUD", "ZAR", "USD". Must match the currency you wrote in the scenario. Code, not symbol.' },
      raw_inputs: {
        type: 'object' as const,
        description: 'The raw figures, matching context_text exactly. Code uses these for ALL arithmetic.',
        properties: {
          pbit:                  { type: 'number', description: 'Operating profit before interest and tax, $m' },
          tax_rate:              { type: 'number', description: 'Corporate tax rate as a decimal fraction, e.g. 0.25' },
          depreciation:          { type: 'number', description: 'Depreciation / non-cash add-back, $m' },
          capex:                 { type: 'number', description: 'Capital expenditure (reinvestment), $m' },
          delta_working_capital: { type: 'number', description: 'Increase in working capital, $m' },
          wacc:                  { type: 'number', description: 'WACC as a decimal fraction, e.g. 0.10 — must exceed growth_rate by ≥ 0.01' },
          growth_rate:           { type: 'number', description: 'Long-term perpetuity growth as a decimal fraction, e.g. 0.03' },
          debt_value:            { type: 'number', description: 'Market value of debt, $m — must be below firm value' },
        },
        required: ['pbit', 'tax_rate', 'depreciation', 'capex', 'delta_working_capital', 'wacc', 'growth_rate', 'debt_value'],
      },
      interpretation_prose: { type: 'string', description: '3–5 sentences of qualitative advice ONLY — NO computed numbers. Plumbing (FCFF→WACC, strip debt), growth-assumption safety, one scepticism point on an input, and a clear board recommendation.' },
    },
    required: ['question', 'context_text', 'command_verb', 'currency', 'raw_inputs', 'interpretation_prose'],
  },
};

const SUBMIT_REVEAL_TOOL: Anthropic.Tool = {
  name: 'submit_reveal',
  description: 'Submit the Ezra teaching reveal for a completed AFM drill',
  input_schema: {
    type: 'object' as const,
    properties: {
      hint: { type: 'string', description: 'One sentence: targeted nudge for a wrong first attempt — points at the specific gap (missing recommendation, un-challenged assumption, mismatched discount rate, un-stripped debt) without giving the answer.' },
      full_reveal: { type: 'string', description: '3–5 sentences: names the specific AFM misconception (fence-sitting / scenario-free / valuation-plumbing / undeveloped-assumption / abandoned-after-calc), then the diagnosis-led reframe. Not a restated model answer.' },
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
  _rawInputs?:    FcffInputs;        // quantitative only — dry-run inspection
  _computed?:     FcffComputed;      // quantitative only — dry-run inspection
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
    system: AFM_EXAMINER_PERSONA,
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
    system: AFM_EXAMINER_PERSONA,
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

async function draftReveal(anthropic: Anthropic, spec: AfmDrillSpec, question: string, modelAnswer: string): Promise<{ hint: string; full_reveal: string }> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: EZRA_TEACHING_PERSONA,
    tools: [SUBMIT_REVEAL_TOOL],
    tool_choice: { type: 'tool', name: 'submit_reveal' },
    messages: [{ role: 'user', content: buildRevealPrompt(spec, question, modelAnswer) }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in Pass 2 response');
  const inp = block.input as { hint: string; full_reveal: string };
  assertNonEmpty(inp, ['hint', 'full_reveal'], 'Pass 2');
  return { hint: inp.hint, full_reveal: inp.full_reveal };
}

// Routing — quantitative FCFF LOs get the code-computes path; everything else discursive.
async function generateDrill(anthropic: Anthropic, spec: AfmDrillSpec): Promise<DrillOutput> {
  if (spec.mode === 'quantitative') {
    if (FCFF_LOS.has(spec.lo_code)) return draftFcffDrill(anthropic, spec);
    throw new Error(`No calculator registered for quantitative LO ${spec.lo_code} (pilot wires B4b/B4c FCFF only)`);
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
  for (const c of schema.components) {
    const deps = c.depends_on ?? [];
    if (deps.length === 0 || !c.recompute) {
      const perturbed = c.expected_value * 0.8; // 20% off ≫ 0.5% tolerance → incorrect
      own.set(c.component_id, perturbed);
      components.push({ component_id: c.component_id, value: perturbed, workings: 'seeded upstream error (×0.8 of the correct figure)' });
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

  // (2) answer↔schema figure integrity — each expected_value (fmt1) appears in the model answer
  const normalized = drill.model_answer.replace(/,/g, '');
  const missing: string[] = [];
  for (const c of schema.components) {
    if (!normalized.includes(fmt1(c.expected_value))) missing.push(`${c.component_id}=${fmt1(c.expected_value)}`);
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

  return { ok, lines };
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

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

  const USAGE = 'Usage:\n  --los A3a,B4c [--dry-run]   explicit list, one drill per code\n  --lo A3a [--dry-run]        single LO';
  const KNOWN_FLAGS = new Set(['--lo', '--los', '--dry-run']);
  const unknown = argv.filter((a) => a.startsWith('--') && !KNOWN_FLAGS.has(a));
  if (unknown.length) { console.error(`Error: unrecognised flag(s): ${unknown.join(', ')}\n\n${USAGE}`); process.exit(1); }

  const loCodes: LoCode[] = losArg
    ? (losArg.split(',').map((s) => s.trim()) as LoCode[])
    : loFilter ? [loFilter as LoCode] : [];
  if (loCodes.length === 0) { console.error(`Error: no scope specified.\n\n${USAGE}`); process.exit(1); }
  for (const code of loCodes) {
    if (!(code in SYLLABUS_MAP)) { console.error(`Error: unknown LO code "${code}". Valid: ${Object.keys(SYLLABUS_MAP).join(', ')}`); process.exit(1); }
  }

  const specs = buildSpecsForList(loCodes);
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
    console.log(`verb: ${spec.command_verb} | level: L${spec.intellectual_level} | mode: ${spec.mode} | calc_required: ${spec.calculation_required} | marks: ${spec.marks_guide} | skill: ${spec.professional_skill_tag ?? 'none'} | geo: ${spec.region_hint}/${spec.sector_hint}`);
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

    // Quantitative gates
    let gatesOk = true;
    if (spec.mode === 'quantitative') {
      if (drill._rawInputs && drill._computed) {
        const cur = drill._currency ?? '$';
        console.log(`\nRAW INPUTS (model-supplied, currency ${cur}): ${JSON.stringify(drill._rawInputs)}`);
        console.log(`CODE-COMPUTED: FCFF=${money(cur, drill._computed.fcff)}  firm=${money(cur, drill._computed.firm_value)}  equity=${money(cur, drill._computed.equity_value)}`);
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
      try { reveal = await draftReveal(anthropic, spec, drill.question, drill.model_answer); break; }
      catch (err) {
        if (attempt === 0) { console.warn(`  ↻ ${label} [P2] retry (${(err as Error).message})`); await sleep(2000); }
        else { console.error(`  ✗ ${label} [P2] FAILED: ${(err as Error).message}`); failed.push(i + 1); }
      }
    }
    if (!reveal) { await sleep(200); continue; }
    console.log(`\nHINT:\n${reveal.hint}`);
    console.log(`\nFULL_REVEAL:\n${reveal.full_reveal}`);

    if (dryRun) { await sleep(200); continue; }
    if (!gatesOk) { await sleep(200); continue; }

    const { error: insErr } = await supabase!.from('acca_drills').insert({
      exam_board:             'ACCA',
      paper_code:             'AFM',
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

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });
