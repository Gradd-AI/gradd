#!/usr/bin/env tsx
/**
 * generate-apm-drills.ts
 *
 * Drafts ACCA APM practice drills via a two-pass Claude Sonnet pipeline and
 * inserts them into the `acca_drills` table with status='candidate'.
 *
 * Pass 1 — drill generation (APM examiner persona): produces question,
 *           context_text, model_answer.
 * Pass 2 — teaching reveal (Mia teaching persona): takes Pass-1 output,
 *           produces hint and full_reveal.
 *
 * Usage:
 *   npm run generate-apm-drills -- [--count N] [--lo <lo_code>] [--dry-run]
 *   npm run generate-apm-drills -- --los A3b,A5e,B1c [--dry-run]
 *   npm run generate-apm-drills -- --regen-rejected [--dry-run]
 *
 * Args:
 *   --count           How many drills to generate (default: 73 for all LOs, 1 if --lo)
 *   --lo              Limit to a single LO code e.g. A1a. Cycles if --count > 1.
 *   --los             Comma-separated list of LO codes — generates exactly one drill per code, in order.
 *   --dry-run         Print spec list to console — no API or DB calls
 *   --regen-rejected  Fetch status='rejected' rows from acca_drills; regenerate
 *                     and reinsert as 'candidate', same as the IB flow
 *
 * Reads .env.local for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * ANTHROPIC_API_KEY.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  SYLLABUS_MAP,
  CALCULATION_LOS,
  COMMAND_VERBS,
  type LoCode,
  type ProfessionalSkillTag,
} from './apm-framework';

// ─────────────────────────────────────────────────────────────────────────────
// Scenario diversity pools — region and sector hints cycled by LO position
// Each lo_code maps to a stable region+sector via its natural index in
// SYLLABUS_MAP, so spot checks (--lo X) and full runs (--count 73) are consistent.
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

interface ApmDrillSpec {
  lo_code:                LoCode;
  section:                'A' | 'B' | 'C' | 'D';
  sub_area:               string;
  topic:                  string;
  descriptor:             string;
  command_verb:           string;
  intellectual_level:     2 | 3;
  calculation_required:   boolean;
  professional_skill_tag?: ProfessionalSkillTag;
  marks_guide:            number;
  region_hint:            string;
  sector_hint:            string;
}

type RejectedDrillRow = {
  lo_code:                string;
  topic:                  string;
  command_verb:           string;
  intellectual_level:     number;
  calculation_required:   boolean;
  professional_skill_tag: string | null;
  marks_guide:            number;
};

// ─────────────────────────────────────────────────────────────────────────────
// Summary-stat LOs — route through code-computes-stats path.
// Only LOs requiring Σ aggregation across a dataset use this path.
// Extend the Set to add future regression / time-series LOs.
// ─────────────────────────────────────────────────────────────────────────────

const SUMMARY_STAT_LOS = new Set<LoCode>([
  'D2e', // regression analysis — Σx, Σy, Σx², Σxy, b, a, forecast computed in TS
]);

// ─────────────────────────────────────────────────────────────────────────────
// Regression helper — deterministic stats; model never touches this arithmetic
// ─────────────────────────────────────────────────────────────────────────────

interface DataPoint { x: number; y: number }

interface RegressionResult {
  n:     number;
  sumX:  number;
  sumY:  number;
  sumX2: number;
  sumXY: number;
  meanX: number;
  meanY: number;
  b:     number; // slope
  a:     number; // intercept
}

function computeRegression(points: DataPoint[]): RegressionResult {
  if (points.length < 3) {
    throw new Error(`Regression requires ≥3 data points, got ${points.length}`);
  }
  const n = points.length;
  let sumX = 0, sumY = 0, sumX2 = 0, sumXY = 0;
  for (const { x, y } of points) {
    sumX  += x;
    sumY  += y;
    sumX2 += x * x;
    sumXY += x * y;
  }
  const meanX = sumX / n;
  const meanY = sumY / n;
  const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  const a = meanY - b * meanX;
  // Invariant: line must pass through (meanX, meanY). This is algebraically exact;
  // any failure here indicates floating-point catastrophic cancellation with extreme data.
  if (Math.abs(a + b * meanX - meanY) > 1e-4) {
    throw new Error(
      `Regression reconciliation failed: a+b·x̄=${(a + b * meanX).toFixed(8)}, meanY=${meanY.toFixed(8)}`,
    );
  }
  return { n, sumX, sumY, sumX2, sumXY, meanX, meanY, b, a };
}

function buildRegressionModelAnswer(
  points: DataPoint[],
  stats: RegressionResult,
  xLabel: string,
  yLabel: string,
  forecastX: number,
  interpretationProse: string,
): string {
  const { n, sumX, sumY, sumX2, sumXY, meanX, meanY, b, a } = stats;
  const fc          = a + b * forecastX;
  const numerator   = n * sumXY - sumX * sumY;
  const denominator = n * sumX2 - sumX * sumX;

  // n2s: integer → no decimals; decimal → dp (default 2)
  const n2s = (v: number, dp = 2): string =>
    Number.isInteger(v) ? v.toString() : v.toFixed(dp);

  const rows = points
    .map((p, i) =>
      `| ${i + 1} | ${n2s(p.x)} | ${n2s(p.y)} | ${n2s(p.x * p.x)} | ${n2s(p.x * p.y)} |`,
    )
    .join('\n');

  return [
    '**Regression Analysis**',
    '',
    '**Step 1 — Data table**',
    '',
    `| Period | ${xLabel} | ${yLabel} | x² | xy |`,
    '|--------|-----------|-----------|-----|------|',
    rows,
    `| **Σ** | **${n2s(sumX)}** | **${n2s(sumY)}** | **${n2s(sumX2)}** | **${n2s(sumXY)}** |`,
    '',
    `n = ${n};  x̄ = ${n2s(meanX, 4)};  ȳ = ${n2s(meanY, 4)}`,
    '',
    '**Step 2 — Slope (b)**',
    '',
    'b = (nΣxy − ΣxΣy) ÷ (nΣx² − (Σx)²)',
    `  = (${n} × ${n2s(sumXY)} − ${n2s(sumX)} × ${n2s(sumY)}) ÷ (${n} × ${n2s(sumX2)} − ${n2s(sumX)}²)`,
    `  = ${n2s(numerator)} ÷ ${n2s(denominator)}`,
    `  = **${n2s(b, 4)}**`,
    '',
    '**Step 3 — Intercept (a)**',
    '',
    `a = ȳ − b·x̄  =  ${n2s(meanY, 4)} − ${n2s(b, 4)} × ${n2s(meanX, 4)}  =  **${n2s(a, 2)}**`,
    '',
    `Regression equation:  y = ${n2s(a, 2)} + ${n2s(b, 4)}·x`,
    '',
    '**Step 4 — Forecast**',
    '',
    `At ${xLabel} = ${n2s(forecastX)}:  y = ${n2s(a, 2)} + ${n2s(b, 4)} × ${n2s(forecastX)} = **${n2s(fc, 2)}**`,
    '',
    `*Reconciliation: a + b·x̄ = ${n2s(a, 2)} + ${n2s(b, 4)} × ${n2s(meanX, 4)} = ${n2s(a + b * meanX, 4)} ≈ ȳ ✓*`,
    '',
    '**Step 5 — Analysis and interpretation**',
    '',
    interpretationProse,
  ].join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// THE APPLICATION / EVALUATION BAR
// Grounded in every ACCA APM examiner report, 2022–June 2025: candidates fail on
// apply-and-evaluate, NOT on knowledge. They describe or calculate the model and
// stop; the marks live in applying it to THIS scenario and forming a judgement.
// Every drill must be a rep at that exact jump — it is the product's moat.
// These two constants are woven into both personas and both per-drill prompts.
// ─────────────────────────────────────────────────────────────────────────────

const APPLICATION_EVALUATION_BAR_PASS1 =
  'THE APPLICATION / EVALUATION BAR — NON-NEGOTIABLE. Grounded in every ACCA APM examiner report ' +
  '2022–June 2025: candidates fail on apply-and-evaluate, NOT on knowledge. They describe or ' +
  'calculate the model and stop; the marks live in applying it to THIS scenario and forming a ' +
  'judgement. Every drill must train that exact jump. ' +
  '(1) SCENARIO must contain specific, usable detail — named figures, named context, a decision at ' +
  'stake — that the model_answer is FORCED to reference. Application must be possible and a generic ' +
  'answer must be visibly inadequate. A scenario a generic textbook answer could fit is a FAILED ' +
  'scenario: add specifics until the question is answerable only with its own facts. ' +
  '(2) QUESTION verb must demand L3 wherever the LO supports it ("apply and evaluate", "advise", ' +
  '"recommend") — it must require a judgement or decision, NEVER merely a calculation or description. ' +
  '(3) MODEL_ANSWER must show the explicit L2→L3 structure (proportionate to the marks): ' +
  '(a) APPLY — deploy the technique on the scenario\'s specific figures/facts; (b) EVALUATE — form a ' +
  'supported judgement / recommendation about what it means for THIS organisation; (c) SCEPTICISM — ' +
  'challenge one scenario assumption or data point. An answer that stops at (a) — describing or ' +
  'computing the model without judging its fit to the scenario — is the exact failure this product ' +
  'exists to fix. NEVER generate one.';

const APPLICATION_EVALUATION_BAR_PASS2 =
  'THE APPLICATION / EVALUATION BAR — NON-NEGOTIABLE. The universal documented APM failure (every ' +
  'examiner report 2022–June 2025) is the L2-STOP: the candidate describes or calculates the model ' +
  'and stops, never applying and judging it against the scenario. Your reveal must teach the jump ' +
  'out of that stop. ' +
  '(4) full_reveal MUST name the L2-STOP as the misconception, anchored to apply/evaluate: ' +
  '"the typical candidate describes/calculates X and stops — the verb demanded you evaluate whether ' +
  'X fits THIS scenario / make the call." Teach the move from knowing the model to applying-and-' +
  'judging it, because that is the failure that recurs every diet. ' +
  '(5) hint, on a first miss, must point at the MISSING application or evaluation specifically — not ' +
  'give the answer: say "you\'ve applied, not evaluated" or "you\'ve described, not applied to the ' +
  'scenario", named to this drill\'s technique and scenario.';

// ─────────────────────────────────────────────────────────────────────────────
// Personas
// ─────────────────────────────────────────────────────────────────────────────

const APM_EXAMINER_PERSONA =
  'You are an ACCA Advanced Performance Management (APM) examiner. You write wholly original ' +
  'practice drills — never from any ACCA past paper. APM is a professional strategic exam ' +
  '(3h15m, 100 marks): Section A is a 50-mark case study requiring advisory responses to senior ' +
  'management; Section B has two 25-mark scenario questions. ' +
  'All APM drills must: ' +
  '(1) Be scenario-based — name a real-world-style organisation, describe a specific performance ' +
  'management situation with enough context for the candidate to engage professionally. ' +
  '(2) Use a professional advisory register — candidates respond as performance management advisors ' +
  'to senior management, not as students answering a school question. ' +
  '(3) L2 drills: require application of a specific concept or technique — explain a mechanism, ' +
  'advise on a defined situation, perform a computation. Bounded and focused, not a strategic evaluation. ' +
  '(4) L3 drills: require synthesis and evaluation — assess appropriateness, evaluate trade-offs, ' +
  'recommend with justified reasoning. Depth appropriate to APM professional-level expectations. ' +
  '(5) Calculation drills: context_text MUST include ALL numeric data needed (specific figures: ' +
  'budgets, actuals, ratios, variances, cost allocations). No figure should require invention. ' +
  '(6) question begins with the command verb, capitalised. ' +
  'model_answer: a Band 1 / top-mark response (100–300 words) demonstrating full APM technical marks. ' +
  'DIVERSITY — MANDATORY: ' +
  '(A) Geography: scenarios MUST be international — NEVER set in the UK, Ireland, or any single default country. ' +
  'Rotate across global regions (Latin America, East/Southeast Asia, Continental Europe, Sub-Saharan Africa, ' +
  'South Asia, Middle East, Oceania, etc.). APM is sat by candidates in 100+ countries globally. ' +
  '(B) Sector: scenarios MUST vary across manufacturing, retail, telecoms, logistics, financial services, ' +
  'energy, agriculture, technology, construction, hospitality — NEVER default to healthcare or UK public services. ' +
  'Each prompt supplies a suggested country and sector; use both unless the LO technique genuinely would not ' +
  'arise in that context, in which case substitute an equally diverse non-UK, non-healthcare alternative. ' +
  'CONTENT QUALITY RULES — mandatory. These target confirmed generator failure patterns from the 10-drill audit: ' +
  '(1) MECHANISM BEFORE CONCLUSION: when explaining WHY a calculated result behaves as it does, state the causal ' +
  'driver explicitly. Do not claim a cost "inflates profit" when it reduces profit; do not attribute a result to ' +
  'one factor (e.g. "larger asset base") when the real driver is another (e.g. "smaller spread over cost of ' +
  'capital"). Correct arithmetic does NOT make the explanation correct — reason the mechanism separately. ' +
  '(2) ASSERT ONLY SCENARIO FACTS: do NOT introduce specific facts not in the scenario — no country-specific ' +
  'regulations (e.g. "Clean Fuel Regulations", "Thailand\'s energy regulations"), no named indices ("TSI steel ' +
  'price index"), no asserted events ("product recalls", "customer compensation") unless the scenario states them. ' +
  'Illustrative examples must be phrased as examples ("may include...", "such as..."), never as asserted fact. ' +
  '(3) SCENARIO↔ANSWER FIGURE INTEGRITY: (a) scenarios give RAW DATA ONLY — never pre-compute summary statistics ' +
  '(Σxy, Σx², margins, totals) the student should derive; any aggregate stated MUST be verified to match the raw ' +
  'data before output. (b) answers must read scenario figures literally — never invent a variance, gap, or result ' +
  'the data does not support. (c) scenarios must not state a derived result that contradicts the underlying numbers. ' +
  '(4) NO OVER-ABSOLUTE CLAIMS: avoid "directly", "eliminate", "precede and generate", "depends entirely on", ' +
  '"unachievable" where the scenario shows only correlation, concurrence, or plausibility. Use "may", "is likely ' +
  'to", "suggests"; require management validation for causal claims not proven by the data. ' +
  '(5) STAY IN THE APM LANE: professional scepticism challenges the work and data quality — do NOT allege intent ' +
  '("deliberately suppressing"), invoke financial-reporting standards (IAS 37), or escalate to external audit. ' +
  'Keep scepticism to: validate the assumption, seek independent evidence, investigate the figure. ' +
  '(6) CLASSIFY AGAINST DEFINITIONS: when sorting items into categories (cost types, variance types), apply the ' +
  'precise definitional test from the APM syllabus, not intuition — classify only by what the scenario explicitly ' +
  'states (e.g. a cost is "hidden" only if the scenario says it is buried or not separately disclosed). ' +
  'INTELLECTUAL LEVEL: ALWAYS use levels 1/2/3 — NEVER use AO framing (AO1, AO5, etc.) which is IB, not ACCA.' +
  '\n\n' + APPLICATION_EVALUATION_BAR_PASS1;

const APM_TEACHING_PERSONA =
  "You are Mia, Gradd's AI tutor for ACCA APM. Your job is to generate the teaching reveal " +
  'shown to a candidate after they attempt a practice drill. ' +
  'You receive the drill question and the model answer. Your output has two parts: ' +
  'hint: One sentence only. A targeted nudge for a candidate who answered incorrectly on the first ' +
  'attempt. Point at the specific gap — the missing framework, wrong direction, skipped step, or ' +
  'confused concept — WITHOUT giving the answer. Precise to this drill, not generic advice. ' +
  'full_reveal: 3–5 sentences. The teaching moment. Start by naming the specific misconception a ' +
  'typical APM candidate brings to this type of drill (e.g. treating all variances as operational ' +
  'when planning variances require separate analysis, confusing ROI with RI in divisional performance, ' +
  'applying BSC in generic terms without linking perspectives to the scenario strategy). Then give ' +
  'the diagnosis-led reframe: why that thinking is wrong, what the correct mental model is. ' +
  'This is NOT a restated model answer — it is a mental model correction that helps the candidate ' +
  'see the problem differently next time. ' +
  'TEACHING QUALITY RULES: ' +
  '(1) When explaining why a calculation or conceptual claim is wrong, state the correct causal mechanism — ' +
  'do not just restate the correct answer. Reason WHY the misconception produces the wrong conclusion. ' +
  '(2) Avoid over-absolute causal language ("precede and generate", "directly causes", "depends entirely on"): ' +
  'use "may", "is likely to", "suggests" for causal chains not proven by the scenario data. ' +
  '(3) Professional scepticism in the reveal must stay in the APM lane — challenge data quality and ' +
  'assumptions only; do not allege intent or invoke external audit or financial-reporting standards. ' +
  'INTELLECTUAL LEVEL: ALWAYS 1/2/3, NEVER AO framing (AO1, AO5, etc.).' +
  '\n\n' + APPLICATION_EVALUATION_BAR_PASS2;

// ─────────────────────────────────────────────────────────────────────────────
// Professional skill pools by syllabus section — derived from EXAM_STRUCTURE
// Section A: all 4 skills; Section B/D: 3 non-communication skills; C: all 4
// ─────────────────────────────────────────────────────────────────────────────

const SKILLS_BY_SECTION: Record<string, ProfessionalSkillTag[]> = {
  A: ['communication', 'analysis_and_evaluation', 'scepticism', 'commercial_acumen'],
  B: ['analysis_and_evaluation', 'scepticism', 'commercial_acumen'],
  C: ['communication', 'analysis_and_evaluation', 'scepticism', 'commercial_acumen'],
  D: ['analysis_and_evaluation', 'scepticism', 'commercial_acumen'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Spec builder
// ─────────────────────────────────────────────────────────────────────────────

// Deterministic Fisher-Yates shuffle — same implementation as generate-seed-questions.ts
function deterministicShuffle<T>(arr: T[], seed = 2026): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) | 0;
    const j = Math.abs(s) % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// Extract the primary command verb from an LO descriptor.
// Checks known multi-word COMMAND_VERBS keys first (apply and evaluate, calculate and evaluate,
// evaluate and apply), then falls back to the first word of the descriptor.
function extractPrimaryVerb(descriptor: string): string {
  const desc = descriptor.toLowerCase();
  const compounds = Object.keys(COMMAND_VERBS).filter(k => k.includes(' '));
  for (const cv of compounds) {
    if (desc.startsWith(cv)) return cv;
  }
  return desc.split(/\s/)[0];
}

function deriveMarksGuide(intellectualLevel: 2 | 3, calculationRequired: boolean): number {
  if (intellectualLevel === 2) return 6;
  if (calculationRequired) return 15;
  return 12;
}

function deriveSkillTag(section: string, indexWithinSection: number): ProfessionalSkillTag {
  const pool = SKILLS_BY_SECTION[section] ?? SKILLS_BY_SECTION['A'];
  return pool[indexWithinSection % pool.length];
}

function buildSpecsForList(loCodes: LoCode[]): ApmDrillSpec[] {
  const sectionIdx: Record<string, number> = {};
  return loCodes.map(lo_code => {
    const lo = SYLLABUS_MAP[lo_code];
    const si = sectionIdx[lo.section] ?? 0;
    sectionIdx[lo.section] = si + 1;
    const calculation_required = CALCULATION_LOS.has(lo_code);
    const baseIdx              = SYLLABUS_KEYS.indexOf(lo_code);
    return {
      lo_code,
      section:               lo.section,
      sub_area:              lo.sub_area,
      topic:                 lo.topic,
      descriptor:            lo.descriptor,
      command_verb:          extractPrimaryVerb(lo.descriptor),
      intellectual_level:    lo.intellectual_level,
      calculation_required,
      professional_skill_tag: deriveSkillTag(lo.section, si),
      marks_guide:           deriveMarksGuide(lo.intellectual_level, calculation_required),
      region_hint:           SCENARIO_REGIONS[baseIdx % SCENARIO_REGIONS.length],
      sector_hint:           SCENARIO_SECTORS[(baseIdx * 7) % SCENARIO_SECTORS.length],
    };
  });
}

function buildSpecList(loFilter: string | undefined, count: number): ApmDrillSpec[] {
  let entries = Object.entries(SYLLABUS_MAP) as [LoCode, (typeof SYLLABUS_MAP)[LoCode]][];
  if (loFilter) {
    entries = entries.filter(([k]) => k === loFilter);
  }
  const shuffled = deterministicShuffle(entries);
  const sectionIdx: Record<string, number> = {};
  return Array.from({ length: count }, (_, i) => {
    const [lo_code, lo] = shuffled[i % shuffled.length];
    const si = sectionIdx[lo.section] ?? 0;
    sectionIdx[lo.section] = si + 1;
    const calculation_required = CALCULATION_LOS.has(lo_code);
    const baseIdx              = SYLLABUS_KEYS.indexOf(lo_code);
    return {
      lo_code,
      section:               lo.section,
      sub_area:              lo.sub_area,
      topic:                 lo.topic,
      descriptor:            lo.descriptor,
      command_verb:          extractPrimaryVerb(lo.descriptor),
      intellectual_level:    lo.intellectual_level,
      calculation_required,
      professional_skill_tag: deriveSkillTag(lo.section, si),
      marks_guide:           deriveMarksGuide(lo.intellectual_level, calculation_required),
      region_hint:           SCENARIO_REGIONS[baseIdx % SCENARIO_REGIONS.length],
      sector_hint:           SCENARIO_SECTORS[(baseIdx * 7) % SCENARIO_SECTORS.length],
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Prompt builders
// ─────────────────────────────────────────────────────────────────────────────

function buildUserPrompt(spec: ApmDrillSpec): string {
  const verb        = spec.command_verb;
  const capitalised = verb.charAt(0).toUpperCase() + verb.slice(1);

  const calcInstruction = spec.calculation_required
    ? `- CALCULATION DRILL: context_text MUST include ALL numeric data required (specific figures: ` +
      `budgets, actuals, ratios, variances, cost figures). The candidate must be able to complete ` +
      `the computation from context_text alone — no figures should require invention. ` +
      `CALCULATION PRECISION RULES — NON-NEGOTIABLE: ` +
      `(a) NEVER round an intermediate value and then use the rounded figure as input to a further ` +
      `calculation step. Compute variances and totals from the raw source figures in context_text ` +
      `(e.g. actual total cost minus flexed standard cost, not actual-total-cost divided by hours ` +
      `then rounded then multiplied). Rounded figures are for PRESENTATION of a final answer only — ` +
      `never as an arithmetic operand in a subsequent step. ` +
      `(b) RECONCILIATION REQUIRED: where the calculation decomposes into sub-parts (e.g. planning ` +
      `variance + operational variances, or lifecycle cost phases, or ABC cost pools), model_answer ` +
      `MUST include a final reconciliation line showing the sub-parts sum to the independently-computed ` +
      `total variance or grand total. If they do not reconcile exactly, the calculation contains an ` +
      `error — identify and correct it before producing output. ` +
      `(c) LITERAL READING: the model_answer MUST read context_text figures exactly as stated — never ` +
      `invent a variance, restatement, or result the scenario data does not support. If context_text ` +
      `says a cost "includes" an amount, that amount is part of the total, not an addition to it.`
    : `- context_text: 2–4 sentences naming the organisation and describing the performance management ` +
      `challenge. Include relevant contextual data (industry, strategic context, key metrics) to ` +
      `ground the question in a realistic APM scenario.`;

  const levelInstruction = spec.intellectual_level === 2
    ? `- L2 (Application and analysis): require application of a specific concept or technique. ` +
      `Explain a mechanism, advise on a defined situation, perform a computation. Bounded — not a ` +
      `full strategic evaluation.`
    : `- L3 (Synthesis and evaluation): require judgement and evaluation. Candidate must weigh options, ` +
      `assess appropriateness, or recommend with justified reasoning. Depth appropriate to APM ` +
      `professional-level expectations.`;

  const skillLine = spec.professional_skill_tag
    ? `- Professional skill: ${spec.professional_skill_tag.replace(/_/g, ' ')} — model_answer should ` +
      `also demonstrate this skill (e.g. scepticism: question assumptions in the scenario data; ` +
      `commercial_acumen: anchor recommendations to business consequences).`
    : '';

  return `Write one original ACCA APM practice drill.

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA 2026–27 study guide): "${spec.descriptor}"
- Command verb: ${verb}
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks
- Calculation required: ${spec.calculation_required}${spec.professional_skill_tag ? `\n- Professional skill: ${spec.professional_skill_tag}` : ''}

Requirements:
- Begin question with "${capitalised}" (the command verb, capitalised)
- Wholly original — never replicate any ACCA past paper question
- Scenario-based: name an organisation, set a realistic performance management context
- Professional advisory register: candidate responds as advisor to management
${levelInstruction}
${calcInstruction}${skillLine ? `\n${skillLine}` : ''}
- DIVERSITY (MANDATORY): Set the scenario in ${spec.region_hint}. Sector: ${spec.sector_hint}. Use both unless the LO technique genuinely would not arise in that context — if so, substitute any non-UK, non-healthcare country and sector.
- model_answer: ${spec.marks_guide}-mark Band 1 response (100–300 words) demonstrating full APM technical marks
- APPLICATION / EVALUATION BAR (the one skill APM examiner reports say fails candidates every diet — every drill must train it):
  • SCENARIO must carry specific, usable detail — named figures, named context, a decision at stake — that the model_answer is forced to reference. A generic textbook answer must NOT fit; if it would, the scenario has failed — add specifics until the question is answerable only with its own facts.
  • QUESTION must require a judgement or decision applied to the scenario${spec.intellectual_level === 3 ? ` — use an L3 verb ("apply and evaluate", "advise", "recommend"), never a bare "describe"/"calculate"` : `, not a bare definition or computation`}.
  • MODEL_ANSWER must show the L2→L3 structure explicitly (proportionate to the marks): (a) APPLY the technique to the scenario's specific figures/facts; (b) EVALUATE — a supported judgement/recommendation about what it means for THIS organisation; (c) SCEPTICISM — challenge one scenario assumption or data point. An answer that stops at (a) is the documented failure — do not produce one.`;
}

function buildRevealPrompt(
  spec: ApmDrillSpec,
  question: string,
  modelAnswer: string,
): string {
  return `Generate the teaching reveal for this APM practice drill.

Drill:
- LO: ${spec.lo_code} — ${spec.topic}
- Command verb: ${spec.command_verb}
- Intellectual level: L${spec.intellectual_level}
- Calculation required: ${spec.calculation_required}

Question:
${question}

Model answer (mark-scheme level):
${modelAnswer}

Produce:
1. hint — one sentence: a targeted nudge pointing at the specific gap for a candidate who answered incorrectly. Precise to this drill — not generic. Do not give the answer.
2. full_reveal — 3–5 sentences: name the specific misconception a typical APM candidate brings to this type of question, then give the diagnosis-led reframe (why that thinking is wrong, what the correct mental model is). Not a restatement of the model answer.

APPLICATION / EVALUATION BAR (the universal documented APM failure — anchor the reveal to it):
- full_reveal MUST name the L2-STOP as the misconception, anchored to apply/evaluate: "the typical candidate describes/calculates X and stops — the verb demanded you evaluate whether X fits THIS scenario / make the call." Teach the jump from knowing the model to applying-and-judging it for this organisation.
- hint, on a first miss, must point at the missing application or evaluation specifically — e.g. "you've applied, not evaluated" or "you've described, not applied to the scenario" — named to this drill's technique and scenario. Do not give the answer.

Quality rules (mandatory):
- State the correct causal mechanism when reframing a misconception — explain WHY the misconception produces the wrong conclusion, not just what the right answer is.
- Use "may", "is likely to", "suggests" for causal chains; avoid "directly", "precede and generate", "depends entirely on" where the scenario shows only plausibility.
- Professional scepticism: challenge data quality and assumptions only — no intent allegations, no IAS 37, no external-auditor escalation.
- Assert only what the scenario states; illustrative examples must be phrased as "may include..." not as asserted fact.
- Intellectual level: ALWAYS 1/2/3, NEVER AO framing (AO1, AO5, etc.).`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Claude API — structured output via tool use
// Two tools, two passes, two separate API calls per drill.
// ─────────────────────────────────────────────────────────────────────────────

const SUBMIT_DRILL_TOOL: Anthropic.Tool = {
  name: 'submit_drill',
  description: 'Submit the drafted APM practice drill',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: {
        type: 'string',
        description: 'Drill question text starting with the command verb (capitalised). Scenario-based, professional advisory register. Must demand a judgement or decision applied to the scenario — never a bare calculation or description — using an L3 verb (apply and evaluate / advise / recommend) wherever the LO supports it.',
      },
      context_text: {
        type: 'string',
        description: 'Organisational scenario providing context. For calculation drills, must include ALL numeric data needed. 2–4 sentences. Must carry specific, usable detail (named figures, named context, a decision at stake) the model_answer is forced to reference — a generic textbook answer must NOT fit it.',
      },
      model_answer: {
        type: 'string',
        description: 'Mark-scheme level answer (100–300 words) demonstrating Band 1 / full APM technical marks. Must show the explicit L2→L3 structure: (a) APPLY the technique to the scenario\'s specific figures/facts; (b) EVALUATE — a supported judgement/recommendation for THIS organisation; (c) SCEPTICISM — challenge one scenario assumption or data point. Never stop at description/calculation.',
      },
    },
    required: ['question', 'context_text', 'model_answer'],
  },
};

const SUBMIT_REVEAL_TOOL: Anthropic.Tool = {
  name: 'submit_reveal',
  description: 'Submit the teaching reveal for a completed APM drill',
  input_schema: {
    type: 'object' as const,
    properties: {
      hint: {
        type: 'string',
        description: 'One sentence: targeted nudge for a wrong first attempt — points at the gap without giving the answer. On a first miss, point at the MISSING application or evaluation specifically (e.g. "you\'ve applied, not evaluated" or "you\'ve described, not applied to the scenario"), named to this drill.',
      },
      full_reveal: {
        type: 'string',
        description: '3–5 sentences: names the specific misconception, then gives the diagnosis-led reframe. Not a restated model answer. Must name the L2-STOP (the candidate describes/calculates X and stops) anchored to apply/evaluate, then teach the jump to applying-and-judging the model for THIS scenario.',
      },
    },
    required: ['hint', 'full_reveal'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Regression scenario tool — model produces scenario + raw data; code does math
// ─────────────────────────────────────────────────────────────────────────────

const SUBMIT_REGRESSION_SCENARIO_TOOL: Anthropic.Tool = {
  name: 'submit_regression_scenario',
  description: 'Submit a regression drill scenario — raw data table only; code computes all statistics',
  input_schema: {
    type: 'object' as const,
    properties: {
      question: {
        type: 'string',
        description: 'Drill question starting with the command verb. Asks candidate to perform regression analysis and produce a forecast at a specific stated x value.',
      },
      context_text: {
        type: 'string',
        description: 'Scenario narrative + a data table showing ONLY period label, x value, y value. NO pre-computed Σ, x², xy, b, a, or forecast. Data table has exactly three columns: period, x, y.',
      },
      x_label: {
        type: 'string',
        description: 'Column header for the independent variable, e.g. "Machine hours (000s)" or "Ad spend ($000)". Short — fits in a table column.',
      },
      y_label: {
        type: 'string',
        description: 'Column header for the dependent variable, e.g. "Overhead cost ($000)" or "Revenue ($m)". Short — fits in a table column.',
      },
      raw_data: {
        type: 'array',
        description: 'The raw (x, y) pairs in order — must exactly match the data table in context_text. Code uses these for ALL arithmetic. Provide exactly 6 points.',
        items: {
          type: 'object' as const,
          properties: {
            x: { type: 'number' as const, description: 'Independent variable value' },
            y: { type: 'number' as const, description: 'Dependent variable value' },
          },
          required: ['x', 'y'],
        },
        minItems: 5,
      },
      forecast_x: {
        type: 'number',
        description: 'The specific x value stated in the question for which the candidate must forecast y. Must appear verbatim in the question text.',
      },
      interpretation_prose: {
        type: 'string',
        description: '3–5 sentences of qualitative analysis ONLY — direction and strength of relationship, business interpretation of the trend, at least one model limitation (correlation vs causation, extrapolation risk, omitted variables, autocorrelation), and one professional scepticism point about data quality or model appropriateness. Do NOT state any specific computed values (Σ, b, a, r², forecast result) — those are inserted by code.',
      },
    },
    required: ['question', 'context_text', 'x_label', 'y_label', 'raw_data', 'forecast_x', 'interpretation_prose'],
  },
};

type RegressionScenario = {
  question:             string;
  context_text:         string;
  x_label:              string;
  y_label:              string;
  raw_data:             DataPoint[];
  forecast_x:           number;
  interpretation_prose: string;
};

function buildRegressionUserPrompt(spec: ApmDrillSpec): string {
  return `Write one original ACCA APM regression analysis drill.

Specification:
- LO code: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}
- LO descriptor (verbatim, ACCA 2026–27 study guide): "${spec.descriptor}"
- Command verb: analyse
- Intellectual level: L${spec.intellectual_level}
- Marks guide: ${spec.marks_guide} marks
- Calculation required: true (regression analysis)

Requirements:
- Scenario set in ${spec.region_hint}, sector: ${spec.sector_hint}
- Choose a business context where a linear relationship between two variables is plausible (e.g. overhead cost vs machine hours, sales revenue vs advertising spend, delivery cost vs orders handled)
- question: begins with "Analyse" — ask the candidate to analyse the data using regression to establish the relationship between the two variables and produce a forecast at a specific stated x value
- context_text: 2–3 sentences of scenario narrative + a clean data table with THREE COLUMNS ONLY: Period (or Month/Quarter label), x variable, y variable. Exactly 6 rows. Use scaled units ($000, 000 hours, etc.) so values are in the range 1–9,999 — this keeps x² and xy manageable for candidates.
- raw_data: exactly the same 6 (x, y) numeric pairs as the table, as a structured array
- forecast_x: a specific x value the question states for forecasting — plausible given the data range (within or slightly beyond observed range)
- interpretation_prose: 3–5 sentences of qualitative analysis covering: direction and strength of the relationship, business interpretation of the trend, at least one model limitation (correlation vs causation, extrapolation risk, omitted variables), and one professional scepticism point about the data quality or model appropriateness. Do NOT state any specific computed values.
- DIVERSITY: ${spec.region_hint} / ${spec.sector_hint}`;
}

async function draftRegressionScenario(
  anthropic: Anthropic,
  spec: ApmDrillSpec,
): Promise<RegressionScenario> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1400,
    system:
      APM_EXAMINER_PERSONA +
      '\n\nCODE-COMPUTES-STATS PROTOCOL — MANDATORY for this drill:\n' +
      'All arithmetic is computed by code from your raw_data array. Your role: supply the scenario narrative, ' +
      'the raw data table (x and y columns only — NO Σ row, NO x² column, NO xy column), and qualitative ' +
      'interpretation prose. DO NOT compute or include in any field: Σx, Σy, Σx², Σxy, slope (b), intercept (a), ' +
      'r², residuals, or any forecast result. These are computed deterministically in TypeScript. ' +
      'Use scaled units ($000, 000 hours, etc.) so data values stay in the range 1–9,999.',
    tools: [SUBMIT_REGRESSION_SCENARIO_TOOL],
    tool_choice: { type: 'tool', name: 'submit_regression_scenario' },
    messages: [{ role: 'user', content: buildRegressionUserPrompt(spec) }],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('No tool_use block in regression scenario response');
  }
  const inp = block.input as RegressionScenario;

  if (!Array.isArray(inp.raw_data) || inp.raw_data.length < 3) {
    throw new Error(`Invalid raw_data: expected ≥3 points, got ${JSON.stringify(inp.raw_data)}`);
  }
  for (const pt of inp.raw_data) {
    if (typeof pt.x !== 'number' || typeof pt.y !== 'number') {
      throw new Error(`Invalid data point in raw_data: ${JSON.stringify(pt)}`);
    }
  }

  return {
    question:             inp.question,
    context_text:         inp.context_text,
    x_label:              inp.x_label,
    y_label:              inp.y_label,
    raw_data:             inp.raw_data as DataPoint[],
    forecast_x:           inp.forecast_x,
    interpretation_prose: inp.interpretation_prose,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Unified drill output type
// ─────────────────────────────────────────────────────────────────────────────

interface DrillOutput {
  question:     string;
  context_text: string;
  model_answer: string;
  _raw_data?:   DataPoint[];      // regression drills only — for dry-run inspection
  _stats?:      RegressionResult; // regression drills only
}

async function draftDrill(
  anthropic: Anthropic,
  spec: ApmDrillSpec,
): Promise<{ question: string; context_text: string; model_answer: string }> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1200,
    system: APM_EXAMINER_PERSONA,
    tools: [SUBMIT_DRILL_TOOL],
    tool_choice: { type: 'tool', name: 'submit_drill' },
    messages: [{ role: 'user', content: buildUserPrompt(spec) }],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in Pass 1 response');
  const inp = block.input as { question: string; context_text: string; model_answer: string };
  return { question: inp.question, context_text: inp.context_text, model_answer: inp.model_answer };
}

async function draftReveal(
  anthropic: Anthropic,
  spec: ApmDrillSpec,
  question: string,
  modelAnswer: string,
): Promise<{ hint: string; full_reveal: string }> {
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 600,
    system: APM_TEACHING_PERSONA,
    tools: [SUBMIT_REVEAL_TOOL],
    tool_choice: { type: 'tool', name: 'submit_reveal' },
    messages: [{ role: 'user', content: buildRevealPrompt(spec, question, modelAnswer) }],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in Pass 2 response');
  const inp = block.input as { hint: string; full_reveal: string };
  return { hint: inp.hint, full_reveal: inp.full_reveal };
}

// ─────────────────────────────────────────────────────────────────────────────
// Routing — summary-stat LOs get code-computes path; all others use draftDrill
// ─────────────────────────────────────────────────────────────────────────────

async function generateDrill(anthropic: Anthropic, spec: ApmDrillSpec): Promise<DrillOutput> {
  if (SUMMARY_STAT_LOS.has(spec.lo_code)) {
    const scenario = await draftRegressionScenario(anthropic, spec);
    const stats    = computeRegression(scenario.raw_data); // throws loud if data bad
    const model_answer = buildRegressionModelAnswer(
      scenario.raw_data, stats,
      scenario.x_label, scenario.y_label,
      scenario.forecast_x, scenario.interpretation_prose,
    );
    return {
      question:     scenario.question,
      context_text: scenario.context_text,
      model_answer,
      _raw_data:    scenario.raw_data,
      _stats:       stats,
    };
  }
  return draftDrill(anthropic, spec);
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function col(s: string | number, w: number): string {
  return String(s).slice(0, w).padEnd(w);
}

function tally(specs: ApmDrillSpec[], key: keyof ApmDrillSpec): Record<string, number> {
  return specs.reduce((acc, s) => {
    const v = String(s[key]);
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const arg  = (f: string) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : undefined; };
  const flag = (f: string) => argv.includes(f);

  const loFilter      = arg('--lo');
  const losArg        = arg('--los');
  const dryRun        = flag('--dry-run');
  const regenRejected = flag('--regen-rejected');

  if (loFilter && !(loFilter in SYLLABUS_MAP)) {
    console.error(`Error: unknown LO code "${loFilter}". Valid codes: ${Object.keys(SYLLABUS_MAP).join(', ')}`);
    process.exit(1);
  }

  const losFilter: LoCode[] | undefined = losArg
    ? losArg.split(',').map(s => s.trim() as LoCode)
    : undefined;

  if (losFilter) {
    for (const code of losFilter) {
      if (!(code in SYLLABUS_MAP)) {
        console.error(`Error: unknown LO code "${code}" in --los. Valid codes: ${Object.keys(SYLLABUS_MAP).join(', ')}`);
        process.exit(1);
      }
    }
  }

  const defaultCount = loFilter ? 1 : 73;
  const countArg = parseInt(arg('--count') ?? String(defaultCount), 10);

  // Supabase service-role client — mirrors createServiceClient() in lib/supabase/server.ts
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ── Regen-rejected mode ───────────────────────────────────────────────────
  if (regenRejected) {
    const { data: rejected, error: rejErr } = await supabase
      .from('acca_drills')
      .select('lo_code, topic, command_verb, intellectual_level, calculation_required, professional_skill_tag, marks_guide')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', 'APM')
      .eq('status', 'rejected');

    if (rejErr) { console.error('DB error fetching rejected rows:', rejErr.message); process.exit(1); }
    if (!rejected?.length) { console.log('No rejected rows found for ACCA APM.'); return; }

    console.log(`Found ${rejected.length} rejected row(s) — rebuilding specs.`);

    const regenSpecs: ApmDrillSpec[] = (rejected as RejectedDrillRow[]).map(row => {
      const lo      = SYLLABUS_MAP[row.lo_code as LoCode];
      const baseIdx = SYLLABUS_KEYS.indexOf(row.lo_code as LoCode);
      return {
        lo_code:                row.lo_code as LoCode,
        section:                lo.section,
        sub_area:               lo.sub_area,
        topic:                  row.topic,
        descriptor:             lo.descriptor,
        command_verb:           row.command_verb,
        intellectual_level:     row.intellectual_level as 2 | 3,
        calculation_required:   row.calculation_required,
        professional_skill_tag: (row.professional_skill_tag as ProfessionalSkillTag | null) ?? undefined,
        marks_guide:            row.marks_guide,
        region_hint:            SCENARIO_REGIONS[baseIdx % SCENARIO_REGIONS.length],
        sector_hint:            SCENARIO_SECTORS[(baseIdx * 7) % SCENARIO_SECTORS.length],
      };
    });

    if (dryRun) {
      regenSpecs.forEach((s, i) =>
        console.log(`[${i + 1}/${regenSpecs.length}] ${s.lo_code} · ${s.command_verb} · L${s.intellectual_level} · ${s.marks_guide}m · calc:${s.calculation_required}`)
      );
      return;
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
    const regenFailed: number[] = [];

    for (let i = 0; i < regenSpecs.length; i++) {
      const spec  = regenSpecs[i];
      const label = `[${i + 1}/${regenSpecs.length}] ${spec.lo_code} · ${spec.command_verb} · ${spec.marks_guide}m`;

      let pass1: DrillOutput | null = null;
      let pass2: { hint: string; full_reveal: string } | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try { pass1 = await generateDrill(anthropic, spec); break; }
        catch (err) {
          if (attempt === 0) { console.warn(`  ↻ ${label} [P1] retry (${(err as Error).message})`); await sleep(2000); }
          else { console.error(`  ✗ ${label} [P1] FAILED: ${(err as Error).message}`); regenFailed.push(i + 1); }
        }
      }
      if (!pass1) { await sleep(200); continue; }

      for (let attempt = 0; attempt < 2; attempt++) {
        try { pass2 = await draftReveal(anthropic, spec, pass1.question, pass1.model_answer); break; }
        catch (err) {
          if (attempt === 0) { console.warn(`  ↻ ${label} [P2] retry (${(err as Error).message})`); await sleep(2000); }
          else { console.error(`  ✗ ${label} [P2] FAILED: ${(err as Error).message}`); regenFailed.push(i + 1); }
        }
      }
      if (!pass2) { await sleep(200); continue; }

      const { error: insErr } = await supabase.from('acca_drills').insert({
        exam_board: 'ACCA', paper_code: 'APM',
        lo_code: spec.lo_code, topic: spec.topic, command_verb: spec.command_verb,
        intellectual_level: spec.intellectual_level,
        professional_skill_tag: spec.professional_skill_tag ?? null,
        calculation_required: spec.calculation_required, marks_guide: spec.marks_guide,
        question: pass1.question, context_text: pass1.context_text,
        model_answer: pass1.model_answer, hint: pass2.hint, full_reveal: pass2.full_reveal,
        status: 'candidate', published: false,
      });

      if (insErr) { console.error(`  ✗ ${label} INSERT failed: ${insErr.message}`); regenFailed.push(i + 1); }
      else { console.log(`  ✓ ${label} — drafted`); }
      await sleep(200);
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Regen done. ${regenSpecs.length - regenFailed.length}/${regenSpecs.length} inserted.`);
    if (regenFailed.length) console.log(`Failed spec indices: ${regenFailed.join(', ')}`);
    return;
  }

  const specs = losFilter
    ? buildSpecsForList(losFilter)
    : buildSpecList(loFilter, countArg);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

  // ── Dry run — makes API calls, skips DB insert ────────────────────────────
  if (dryRun) {
    for (let i = 0; i < specs.length; i++) {
      const spec  = specs[i];
      const label = `[${i + 1}/${specs.length}] ${spec.lo_code} · ${spec.command_verb} · L${spec.intellectual_level} · ${spec.marks_guide}m`;

      console.log(`\n${'═'.repeat(80)}`);
      console.log(`DRILL ${i + 1}/${specs.length}: ${spec.lo_code} — ${spec.sub_area}: ${spec.topic}`);
      console.log(`verb: ${spec.command_verb}  |  level: L${spec.intellectual_level}  |  calc: ${spec.calculation_required}  |  marks: ${spec.marks_guide}  |  skill: ${spec.professional_skill_tag ?? 'none'}  |  geo: ${spec.region_hint} / ${spec.sector_hint}`);
      console.log('─'.repeat(80));

      let pass1: DrillOutput | null = null;
      let pass2: { hint: string; full_reveal: string } | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try { pass1 = await generateDrill(anthropic, spec); break; }
        catch (err) {
          if (attempt === 0) { console.warn(`  ↻ ${label} [P1] retry (${(err as Error).message})`); await sleep(2000); }
          else { console.error(`  ✗ ${label} [P1] FAILED: ${(err as Error).message}`); }
        }
      }

      if (!pass1) { await sleep(200); continue; }

      console.log(`\nCONTEXT_TEXT:\n${pass1.context_text}`);
      console.log(`\nQUESTION:\n${pass1.question}`);
      console.log(`\nMODEL_ANSWER:\n${pass1.model_answer}`);
      if (pass1._raw_data && pass1._stats) {
        const s = pass1._stats;
        console.log('\nCODE-COMPUTED STATS (regression — verify these match context_text table):');
        console.log(`  n=${s.n}  Σx=${s.sumX}  Σy=${s.sumY}  Σx²=${s.sumX2}  Σxy=${s.sumXY}`);
        console.log(`  b=${s.b.toFixed(6)}  a=${s.a.toFixed(6)}  x̄=${s.meanX.toFixed(6)}  ȳ=${s.meanY.toFixed(6)}`);
        console.log(`  raw_data: ${JSON.stringify(pass1._raw_data)}`);
      }

      for (let attempt = 0; attempt < 2; attempt++) {
        try { pass2 = await draftReveal(anthropic, spec, pass1.question, pass1.model_answer); break; }
        catch (err) {
          if (attempt === 0) { console.warn(`  ↻ ${label} [P2] retry (${(err as Error).message})`); await sleep(2000); }
          else { console.error(`  ✗ ${label} [P2] FAILED: ${(err as Error).message}`); }
        }
      }

      if (pass2) {
        console.log(`\nHINT:\n${pass2.hint}`);
        console.log(`\nFULL_REVEAL:\n${pass2.full_reveal}`);
      }

      await sleep(200);
    }

    console.log(`\n${'═'.repeat(80)}`);
    console.log(`Dry run complete — ${specs.length} drill(s) generated, 0 inserted.`);
    return;
  }

  // ── Live run ──────────────────────────────────────────────────────────────
  const failed: number[] = [];

  for (let i = 0; i < specs.length; i++) {
    const spec  = specs[i];
    const label = `[${i + 1}/${specs.length}] ${spec.lo_code} · ${spec.command_verb} · L${spec.intellectual_level} · ${spec.marks_guide}m`;

    let pass1: { question: string; context_text: string; model_answer: string } | null = null;
    let pass2: { hint: string; full_reveal: string } | null = null;

    // Pass 1 — drill generation
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        pass1 = await generateDrill(anthropic, spec);
        break;
      } catch (err) {
        if (attempt === 0) {
          console.warn(`  ↻ ${label} [P1] retry (${(err as Error).message})`);
          await sleep(2000);
        } else {
          console.error(`  ✗ ${label} [P1] FAILED: ${(err as Error).message}`);
          failed.push(i + 1);
        }
      }
    }
    if (!pass1) { await sleep(200); continue; }

    // Pass 2 — teaching reveal
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        pass2 = await draftReveal(anthropic, spec, pass1.question, pass1.model_answer);
        break;
      } catch (err) {
        if (attempt === 0) {
          console.warn(`  ↻ ${label} [P2] retry (${(err as Error).message})`);
          await sleep(2000);
        } else {
          console.error(`  ✗ ${label} [P2] FAILED: ${(err as Error).message}`);
          failed.push(i + 1);
        }
      }
    }
    if (!pass2) { await sleep(200); continue; }

    const { error: insErr } = await supabase.from('acca_drills').insert({
      exam_board:             'ACCA',
      paper_code:             'APM',
      lo_code:                spec.lo_code,
      topic:                  spec.topic,
      command_verb:           spec.command_verb,
      intellectual_level:     spec.intellectual_level,
      professional_skill_tag: spec.professional_skill_tag ?? null,
      calculation_required:   spec.calculation_required,
      marks_guide:            spec.marks_guide,
      question:               pass1.question,
      context_text:           pass1.context_text,
      model_answer:           pass1.model_answer,
      hint:                   pass2.hint,
      full_reveal:            pass2.full_reveal,
      status:                 'candidate',
      published:              false,
    });

    if (insErr) {
      console.error(`  ✗ ${label} INSERT failed: ${insErr.message}`);
      failed.push(i + 1);
    } else {
      console.log(`  ✓ ${label} — drafted`);
    }

    await sleep(200);
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Done. ${specs.length - failed.length}/${specs.length} drills inserted.`);
  if (failed.length) console.log(`Failed spec indices: ${failed.join(', ')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
