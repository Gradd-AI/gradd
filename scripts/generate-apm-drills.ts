#!/usr/bin/env tsx
/**
 * generate-apm-drills.ts
 *
 * Generates ACCA APM practice drill objects and inserts them as status='candidate'
 * into the drills table for review. Two model calls: calc drills (B1c) then
 * judgement drills (A1e). Candidates must be manually promoted to 'seed'.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/generate-apm-drills.ts
 *   npx tsx --env-file=.env.local scripts/generate-apm-drills.ts --dry-run
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { SYLLABUS_MAP } from './apm-framework';

const MODEL   = 'claude-sonnet-4-6';
const SUBJECT = 'ACCA_APM';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface DrillMeta {
  lo_code:               string;
  topic:                 string;
  command_verb:          string;
  intellectual_level:    2 | 3;
  professional_skill_tag: string | null;
  calculation_required:  boolean;
  marks_guide:           number;
}

interface DrillContent {
  variant_label:          string;
  marks_guide_override?:  number;           // model may specify 14m for planning/op split
  professional_skill_tag?: string;          // model sets for judgement drills
  student_prompt:         string;
  hint:                   string;
  full_teaching:          string;
  answer_check:           Record<string, unknown>;
  common_misconceptions:  Array<{ error: string; pattern: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Tool schema — forces structured output for each drill
// ─────────────────────────────────────────────────────────────────────────────

const SUBMIT_DRILL_TOOL: Anthropic.Tool = {
  name: 'submit_drill',
  description:
    'Submit one fully populated ACCA APM practice drill. ' +
    'Call this tool ONCE PER DRILL — three times total for a batch of three.',
  input_schema: {
    type: 'object' as const,
    properties: {
      variant_label: {
        type: 'string',
        description: 'Snake_case identifier: e.g. sales_price_and_volume_variances | materials_planning_operational_split | labour_rate_and_efficiency | swot_performance_management | pest_performance_management | porter_generic_strategies',
      },
      marks_guide_override: {
        type: 'number',
        description: 'Override the default marks guide if this drill warrants more marks (e.g. 14 for planning/operational split). Omit to use default.',
      },
      professional_skill_tag: {
        type: 'string',
        description: 'For judgement drills only — one of: analysis_and_evaluation | commercial_acumen | scepticism. Omit for calc drills.',
      },
      student_prompt: {
        type: 'string',
        description:
          'Everything the student sees: full scenario/stimulus with all data embedded, then the question stem. ' +
          'No answer, no hint, no formula. ' +
          'Calc drills: all numeric values needed for the calculation are in the scenario. ' +
          'Judgement drills: named fictional organisation in a realistic business context with enough detail to evaluate meaningfully.',
      },
      hint: {
        type: 'string',
        description:
          'ONE surgical nudge for attempt 1. ' +
          'Anchored to the single most common error for this variance/framework type. ' +
          'Points at the missing piece WITHOUT revealing the answer, formula result, or full explanation. ' +
          'Max 2 sentences. ' +
          'BAD: "Try using the contribution margin approach." ' +
          'GOOD: "Check whether you are multiplying by the STANDARD contribution per unit, not the actual — volume variances measure the revenue-side impact of the volume shortfall at standard."',
      },
      full_teaching: {
        type: 'string',
        description:
          'Complete model answer served on attempt 2. ' +
          'Calc: formula → substitution with scenario numbers → result labelled F/A → 2-3 sentence interpretation covering controllability and recommended action. ' +
          'Judgement: (a) how the model assists performance management in this scenario with specific mechanisms, (b) cascade to KPIs/targets, (c) at least ONE clear limitation. Include what a marker rewards.',
      },
      answer_check: {
        type: 'object' as const,
        description:
          'Structured rubric for the answer classifier. ' +
          'Calc drills: { "variances": { "[variance_name]": "[£X,XXX Favourable|Adverse]", ... }, "required_interpretation": ["[point 1]", "[point 2]"] }. ' +
          'Judgement drills: { "required_elements": ["[evaluative point 1]", ...], "must_include_limitation": true, "min_valid_points": 3, "professional_skill_tag": "..." }.',
        additionalProperties: true,
      },
      common_misconceptions: {
        type: 'array' as const,
        description:
          'Specific errors APM students make. At least 3 for calc, at least 2 for judgement. ' +
          'Each entry anchors the hint and the answer classifier.',
        items: {
          type: 'object' as const,
          properties: {
            error:   { type: 'string', description: 'What the student does wrong' },
            pattern: { type: 'string', description: 'How to detect this error in a submitted answer' },
          },
          required: ['error', 'pattern'],
        },
      },
    },
    required: ['variant_label', 'student_prompt', 'hint', 'full_teaching', 'answer_check', 'common_misconceptions'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Batch 1 — B1c: Calculate key variances (planning & operational)
// ─────────────────────────────────────────────────────────────────────────────

const CALC_META: DrillMeta = {
  lo_code:              'B1c',
  topic:                SYLLABUS_MAP.B1c.topic,
  command_verb:         'calculate',
  intellectual_level:   3,
  professional_skill_tag: null,
  calculation_required: true,
  marks_guide:          12,
};

const CALC_SYSTEM = `\
You are a senior ACCA Advanced Performance Management (APM) examiner with 15 years of question-writing experience.

LO: B1c [3] — Calculate key variances including planning and operational, interpret the results and recommend appropriate action.

You are writing THREE practice drills for a staged-reveal learning platform. Each drill has:
- student_prompt: the full scenario and question stem the student works from
- hint: ONE surgical nudge for a wrong first attempt — does NOT reveal the answer
- full_teaching: complete worked solution served if the student is still stuck after the hint
- answer_check: structured rubric for deterministic classification of student answers
- common_misconceptions: specific errors APM students make on this variance type

RULES — non-negotiable:
1. student_prompt must be self-contained: all numeric data embedded, no formula, no answer hint.
2. hint must NOT reveal the calculation result, the formula applied to numbers, or the direction (F/A).
   Anchor it to ONE common error specific to this variance type — e.g. for sales volume variance,
   students often use standard price instead of standard contribution.
3. full_teaching: formula first (verbatim), then substitute scenario numbers, then result with F/A,
   then interpretation (what caused it, who is responsible, recommended action).
4. answer_check.variances: exact numeric strings, e.g. "£9,375 Favourable". No rounding ambiguity.
5. common_misconceptions: minimum 3. Use APM-specific errors, not generic accounting errors.
6. MARK WEIGHTING — the calculation is the EVIDENCE BASE, not the task. Target mark weighting in full_teaching: ~40% calculation / ~45% interpretation / ~15% recommendation. The interpretation must reach a MANAGEMENT JUDGEMENT (controllability, behavioural impact, strategic consequence) — not stop at attributing responsibility to a named manager. Do NOT introduce responsibilities, causes, or facts the scenario does not support; every interpretive claim must trace to data given in the scenario.

DRILL VARIANTS — generate exactly these three, in this order:
DRILL 1 — Sales price variance AND sales volume contribution variance
  Use a UK manufacturing company selling a branded consumer product.
  Include: budget selling price, actual selling price, budget volume, actual volume, standard variable cost.
  Marks guide: 12.
DRILL 2 — Materials total variance split into planning variance AND operational variance
  An ex-post standard scenario: a commodity price change mid-period creates a revised standard.
  Include: original standard price/kg, revised ex-post standard, actual price/kg, standard usage per unit, actual production, actual kg used.
  Show the model-answer check for: planning variance (uncontrollable), operational price variance, operational usage variance.
  Marks guide: 14.
DRILL 3 — Labour rate variance AND labour efficiency variance
  Use a professional services or tech company (not manufacturing).
  Include: standard hours per output, actual hours, standard rate, actual rate or actual total cost.
  Interpretation must address the rate/efficiency trade-off.
  Marks guide: 12.

Use DIFFERENT companies and sectors across the three drills. All scenarios must be original.`;

const CALC_USER = `Generate all three B1c variance drills now. Call submit_drill once for each drill — three calls total. All fields must be fully populated.`;

// Used by --regen-calc: regenerates only sales-variances and labour-variances,
// applying the mark-weighting rule and scenario-constraint fixes.
const CALC_REGEN_USER = `Generate EXACTLY TWO B1c variance drills. Call submit_drill once for each — two calls, no more.

DRILL 1 (variant_label: sales_price_and_volume_variances):
Sales price variance AND sales volume contribution variance.
SCENARIO CONSTRAINT: Build a purely demand/pricing story. The scenario must provide only price and volume data (and standard variable cost). The interpretation in full_teaching must NOT introduce supply-side causes, production constraints, or an Operations Director — the scenario data does not support them. Every interpretive claim must trace explicitly to a number or fact in the scenario. Apply the ~40% calc / ~45% interpretation / ~15% recommendation mark weighting. The management judgement must address: (a) whether the price reduction achieved its commercial objective relative to the volume outcome, and (b) who is responsible and what investigation is warranted.

DRILL 2 (variant_label: labour_rate_and_efficiency):
Labour rate variance AND labour efficiency variance.
SCENARIO CONSTRAINT: Use a professional services or tech company. The interpretation must develop the rate/efficiency trade-off as a management judgement — not just attribution. If rate is adverse (higher-grade staff) and efficiency is also adverse, the judgement must be explicit: the senior staffing did NOT deliver the expected productivity gain; management must assess whether the standard hours are realistic for this engagement type and whether the resourcing decision was justified. Apply the ~40% calc / ~45% interpretation / ~15% recommendation mark weighting.

Both drills must use DIFFERENT companies and sectors from each other and from prior drills (avoid Hartwell, Meridian, Cavendish).`;

// ─────────────────────────────────────────────────────────────────────────────
// Batch 2 — A1e: Evaluate SWOT/PEST/Porter's for performance management
// ─────────────────────────────────────────────────────────────────────────────

const JUDGEMENT_META: DrillMeta = {
  lo_code:              'A1e',
  topic:                SYLLABUS_MAP.A1e.topic,
  command_verb:         'evaluate',
  intellectual_level:   3,
  professional_skill_tag: null,   // set per-drill from model output
  calculation_required: false,
  marks_guide:          10,
};

const JUDGEMENT_SYSTEM = `\
You are a senior ACCA Advanced Performance Management (APM) examiner with 15 years of question-writing experience.

LO: A1e [3] — Evaluate how models such as SWOT, PEST and Porter's generic strategies may assist in the performance management process.

You are writing THREE practice drills for a staged-reveal learning platform. Each drill has:
- student_prompt: scenario with a named fictional organisation + evaluation question
- hint: ONE nudge that redirects a student who listed framework components without evaluating
- full_teaching: structured evaluation (assistance mechanisms, cascade to performance system, limitation)
- answer_check: valid evaluation points a marker awards, plus required elements
- common_misconceptions: specific errors on A1e questions

THE MOST COMMON A1e ERROR: Students describe the framework (e.g. list SWOT quadrants) rather than
evaluating HOW it assists the performance management process. Every drill's hint and misconceptions
must address this directly.

RULES:
1. student_prompt: name a specific fictional organisation in a realistic context.
   Give enough detail about the organisation's strategic/operational situation to make evaluation
   specific — not generic. Question stem: "Evaluate how [model] may assist [organisation] in
   [improving/redesigning] its performance management process."
2. hint: must redirect the student from description to evaluation WITHOUT writing the evaluation.
   E.g. "You've described what SWOT contains — the question asks how each quadrant informs what
   the organisation should measure and target. Try picking one quadrant and linking it to a
   specific KPI or performance gap."
3. full_teaching: minimum 4 evaluative points with specific application to the scenario,
   plus at least 1 limitation of the model in this context. State what a marker awards marks for.
4. answer_check.required_elements: specific evaluative points (not just "apply to scenario").
   must_include_limitation: true. min_valid_points: 3.
5. professional_skill_tag: include in the tool call. Different tag per drill (see below).

DRILL VARIANTS — generate exactly these three, in this order:
DRILL 1 — SWOT analysis. professional_skill_tag: "analysis_and_evaluation".
  Scenario: a mid-sized retailer or consumer goods company with declining financial performance.
  SWOT findings embedded in the scenario — student evaluates HOW they assist PM.
DRILL 2 — PEST analysis. professional_skill_tag: "commercial_acumen".
  Scenario: a financial services or regulated industry firm facing a significant environmental shift
  (regulatory, economic, or technological). PEST factors described in scenario.
DRILL 3 — Porter's generic strategies. professional_skill_tag: "scepticism".
  Scenario: a manufacturer in strategic transition (cost leadership eroding, considering
  differentiation). Must include "stuck in the middle" risk in full_teaching.

Use DIFFERENT companies across the three drills. All scenarios must be original.`;

const JUDGEMENT_USER = `Generate all three A1e evaluation drills now. Call submit_drill once for each drill — three calls total. All fields must be fully populated. Include professional_skill_tag in each call.`;

// ─────────────────────────────────────────────────────────────────────────────
// Generation
// ─────────────────────────────────────────────────────────────────────────────

async function generateBatch(
  anthropic: Anthropic,
  systemPrompt: string,
  userPrompt:   string,
  label:        string,
): Promise<DrillContent[]> {
  console.log(`\nModel call: ${label} ...`);

  const res = await anthropic.messages.create({
    model:       MODEL,
    max_tokens:  8000,
    system:      systemPrompt,
    tools:       [SUBMIT_DRILL_TOOL],
    tool_choice: { type: 'auto' },
    messages:    [{ role: 'user', content: userPrompt }],
  });

  const toolBlocks = res.content.filter(b => b.type === 'tool_use');
  if (toolBlocks.length === 0) throw new Error(`${label}: no tool_use blocks in response`);

  console.log(`  Received ${toolBlocks.length} drill(s) from model.`);

  return toolBlocks.map(block => {
    if (block.type !== 'tool_use') throw new Error('Unexpected block type');
    return block.input as DrillContent;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DB insert
// ─────────────────────────────────────────────────────────────────────────────

async function insertDrill(
  supabase: ReturnType<typeof createClient>,
  content:  DrillContent,
  meta:     DrillMeta,
): Promise<string> {
  const row = {
    subject:               SUBJECT,
    lo_code:               meta.lo_code,
    topic:                 meta.topic,
    command_verb:          meta.command_verb,
    intellectual_level:    meta.intellectual_level,
    professional_skill_tag: content.professional_skill_tag ?? meta.professional_skill_tag,
    calculation_required:  meta.calculation_required,
    marks_guide:           content.marks_guide_override ?? meta.marks_guide,
    student_prompt:        content.student_prompt,
    hint:                  content.hint,
    full_teaching:         content.full_teaching,
    answer_check:          content.answer_check,
    common_misconceptions: content.common_misconceptions,
    status:                'candidate',
    verification_status:   'unverified',
  };

  const { data, error } = await supabase
    .from('drills')
    .insert(row)
    .select('id')
    .single();

  if (error) throw new Error(`DB insert failed (${meta.lo_code}): ${error.message}`);
  return data.id as string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Print
// ─────────────────────────────────────────────────────────────────────────────

function printDrill(id: string, content: DrillContent, meta: DrillMeta, n: number): void {
  const LINE = '─'.repeat(80);
  const effectiveMarks = content.marks_guide_override ?? meta.marks_guide;
  const effectiveSkill = content.professional_skill_tag ?? meta.professional_skill_tag ?? '—';

  console.log(`\n${LINE}`);
  console.log(`DRILL ${n}  |  id: ${id}`);
  console.log(LINE);
  console.log(`lo_code              : ${meta.lo_code}`);
  console.log(`topic                : ${meta.topic}`);
  console.log(`command_verb         : ${meta.command_verb}`);
  console.log(`intellectual_level   : ${meta.intellectual_level}`);
  console.log(`professional_skill   : ${effectiveSkill}`);
  console.log(`calculation_required : ${meta.calculation_required}`);
  console.log(`marks_guide          : ${effectiveMarks}`);
  console.log(`variant_label        : ${content.variant_label}`);
  console.log(`status               : candidate  |  verification_status: unverified`);
  console.log(`\n── STUDENT PROMPT ──────────────────────────────────────────────────────────`);
  console.log(content.student_prompt);
  console.log(`\n── HINT (attempt 1) ────────────────────────────────────────────────────────`);
  console.log(content.hint);
  console.log(`\n── FULL TEACHING (attempt 2) ───────────────────────────────────────────────`);
  console.log(content.full_teaching);
  console.log(`\n── ANSWER CHECK (jsonb) ────────────────────────────────────────────────────`);
  console.log(JSON.stringify(content.answer_check, null, 2));
  console.log(`\n── COMMON MISCONCEPTIONS (jsonb) ───────────────────────────────────────────`);
  console.log(JSON.stringify(content.common_misconceptions, null, 2));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const supabase  = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const regenCalc = process.argv.includes('--regen-calc');

  console.log('\nACCA APM Drill Generator');
  console.log(`Model   : ${MODEL}`);
  console.log(`Subject : ${SUBJECT}`);
  if (regenCalc) {
    console.log(`Mode    : --regen-calc (sales variances + labour variances only, hardened prompt)`);
  } else {
    console.log(`Batch   : 3 × B1c (calc) + 3 × A1e (judgement) — 2 model calls`);
  }
  if (dryRun) console.log(`Mode    : DRY RUN — no DB writes`);

  let allDrills: DrillContent[];
  let allMetas: DrillMeta[];

  if (regenCalc) {
    // ── Regen mode: 2 specific calc drills with hardened prompt ───────────────
    const regenDrills = await generateBatch(anthropic, CALC_SYSTEM, CALC_REGEN_USER, 'B1c regen (sales + labour)');
    allDrills = regenDrills;
    allMetas  = regenDrills.map(() => CALC_META);
  } else {
    // ── Full batch mode ────────────────────────────────────────────────────────
    // Model call 1: B1c variance drills
    const calcDrills = await generateBatch(anthropic, CALC_SYSTEM, CALC_USER, 'B1c calc drills');
    // Model call 2: A1e evaluation drills
    const judgementDrills = await generateBatch(anthropic, JUDGEMENT_SYSTEM, JUDGEMENT_USER, 'A1e judgement drills');
    allDrills = [...calcDrills, ...judgementDrills];
    allMetas  = [
      ...calcDrills.map(() => CALC_META),
      ...judgementDrills.map(() => JUDGEMENT_META),
    ];
  }

  // ── Insert + print ─────────────────────────────────────────────────────────
  const insertedIds: string[] = [];

  for (let i = 0; i < allDrills.length; i++) {
    const content = allDrills[i];
    const meta    = allMetas[i];

    let id = '(dry-run)';
    if (!dryRun) {
      id = await insertDrill(supabase, content, meta);
    }

    insertedIds.push(id);
    printDrill(id, content, meta, i + 1);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const LINE = '─'.repeat(80);
  console.log(`\n${LINE}`);
  console.log(`Generated ${allDrills.length} drill(s).`);
  if (!dryRun) {
    console.log(`Inserted as status='candidate', verification_status='unverified'.`);
    console.log(`IDs:\n  ${insertedIds.join('\n  ')}`);
  }
  console.log(`Awaiting your review before promotion to 'seed'.`);
}

const isMain = process.argv[1]?.includes('generate-apm-drills');
if (isMain) main().catch(err => { console.error('Fatal:', err); process.exit(1); });
