#!/usr/bin/env tsx
/**
 * generate-mark-schemes.ts
 *
 * Drafts IBO mark scheme candidates for seed questions and inserts them into
 * the `mark_schemes` table with status='candidate'.
 *
 * Usage:
 *   npm run generate-schemes -- --subject IB_ECONOMICS [--count 20] [--dry-run]
 *   npm run generate-schemes -- --subject IB_BUSINESS_MANAGEMENT --regen-rejected [--dry-run]
 *
 * Args:
 *   --subject         Required. IB_ECONOMICS | IB_BUSINESS_MANAGEMENT
 *   --count           How many uncovered seed questions to process (default: all)
 *   --dry-run         Print routing spec table and exit — no Claude API or DB writes
 *   --print-only      Draft scheme_data (via deterministic path or Claude) and print JSON; no DB insert
 *   --regen-rejected  Fetch mark_schemes where status='rejected' for --subject; rebuild
 *
 * Reads .env.local for NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY,
 * ANTHROPIC_API_KEY.
 *
 * Rule 22: all band descriptors injected into Claude prompts are copied verbatim
 * from MARK_SCHEME_V3_IB_* constants in mark-scheme-framework.ts, which are traced
 * to docs/MARK_SCHEME_EVIDENCE.md.
 *
 * Deterministic pipeline:
 *   band_descriptor + criteria_marked  → canonical data copied directly, no Claude call
 *   content_checklist + hybrid         → Claude Sonnet 4.6, tool_choice: submit_mark_scheme
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  MARK_SCHEME_V3_IB_ECONOMICS,
  MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT,
  SCHEME_TYPE_INVARIANTS,
  AO2_HUMAN_REVIEW_MARKS_RANGE,
  EXPLAIN_N_RE,
  validateMarkSchemeData,
  resolveSchemeType,
  type SchemeType,
  type MarkSchemeData,
  type MarkSchemeViolation,
  type Band,
  type Criterion,
  type BandDescriptorData,
  type CriteriaMarkedData,
  type SchemeTypeInput,
} from './mark-scheme-framework';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionRow {
  id: string;
  question_text: string;
  context_text: string | null;
  command_term: string;
  ao_level: string;
  paper: string;
  question_type: string;
  marks: number;
  level: string;
  subject: string;
}

interface MarkSchemeSpec {
  question_id: string;
  question_text: string;
  context_text: string | null;
  command_term: string;
  ao_level: string;
  paper: string;
  question_type: string;
  marks: number;
  level: string;
  subject: string;
  scheme_type: SchemeType;
  needs_claude: boolean;
  requires_human_review: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECT_GUIDE_YEARS: Record<string, string> = {
  IB_ECONOMICS:           '2022',
  IB_BUSINESS_MANAGEMENT: '2024',
};

const SUBJECT_LABELS: Record<string, string> = {
  IB_ECONOMICS:           'IB Economics',
  IB_BUSINESS_MANAGEMENT: 'IB Business Management',
};

// ─── question_type → section (for resolveSchemeType input) ───────────────────

function questionTypeToSection(questionType: string): string | undefined {
  const map: Record<string, string | undefined> = {
    P1_sec_a:        'SEC_A',
    P1_sec_b:        'SEC_B',
    P2_sec_a:        'SEC_A',
    P2_sec_b:        'SEC_B',
    P3_q1:           'Q1',
    P3_q2:           'Q2',
    P3_q3_criteria:  'Q3',
    P1_part_a:       'part_a',
    P1_part_b:       'part_b',
    P2_part_a:       'part_a',
    P2_part_b:       'part_b',
    P2_part_c_f:     undefined,
    P2_part_g:       'part_g',
    P3_part_a:       'part_a',
    P3_part_b:       'part_b',
  };
  return map[questionType];
}

// ─── Spec builder ─────────────────────────────────────────────────────────────

function buildSpec(row: QuestionRow): MarkSchemeSpec {
  const input: SchemeTypeInput = {
    subject:      row.subject as 'IB_BUSINESS_MANAGEMENT' | 'IB_ECONOMICS',
    paper:        row.paper as 'P1' | 'P2' | 'P3',
    section:      questionTypeToSection(row.question_type),
    marks:        row.marks,
    command_term: row.command_term,
    ao_level:     row.ao_level,
  };

  const scheme_type = resolveSchemeType(input);
  const needs_claude = scheme_type === 'content_checklist' || scheme_type === 'hybrid';
  const requires_human_review =
    row.ao_level === 'AO2' &&
    row.marks >= AO2_HUMAN_REVIEW_MARKS_RANGE[0] &&
    row.marks <= AO2_HUMAN_REVIEW_MARKS_RANGE[1];

  return {
    question_id:          row.id,
    question_text:        row.question_text,
    context_text:         row.context_text,
    command_term:         row.command_term,
    ao_level:             row.ao_level,
    paper:                row.paper,
    question_type:        row.question_type,
    marks:                row.marks,
    level:                row.level,
    subject:              row.subject,
    scheme_type,
    needs_claude,
    requires_human_review,
  };
}

// ─── Deterministic scheme data (band_descriptor + criteria_marked) ─────────────

// Mapping from question_type to the canonical Band[] array from framework constants.
// Only question_types that resolve to band_descriptor are listed here.
const BAND_DESCRIPTOR_MAP: Record<string, Band[] | undefined> = {
  P1_part_a: MARK_SCHEME_V3_IB_ECONOMICS.markbands_p1a,
  P1_part_b: MARK_SCHEME_V3_IB_ECONOMICS.markbands_p1b,
  P2_part_g: MARK_SCHEME_V3_IB_ECONOMICS.markbands_p2g,
  P3_part_b: MARK_SCHEME_V3_IB_ECONOMICS.markbands_p3b,
  P1_sec_b:  MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT.markbands_p1_p2_sec_b,
  P2_sec_b:  MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT.markbands_p1_p2_sec_b,
};

function buildDeterministicSchemeData(spec: MarkSchemeSpec): MarkSchemeData {
  if (spec.scheme_type === 'criteria_marked') {
    const data: CriteriaMarkedData = {
      criteria: MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT.p3_q3_criteria,
    };
    return data;
  }

  if (spec.scheme_type === 'band_descriptor') {
    const bands = BAND_DESCRIPTOR_MAP[spec.question_type];
    if (!bands) {
      throw new Error(
        `No canonical band_descriptor mapping for question_type="${spec.question_type}" ` +
        `subject="${spec.subject}". Add an entry to BAND_DESCRIPTOR_MAP or check scheme_type routing.`,
      );
    }
    const data: BandDescriptorData = { bands };
    return data;
  }

  throw new Error(
    `buildDeterministicSchemeData called for scheme_type="${spec.scheme_type}" — ` +
    `only band_descriptor and criteria_marked are deterministic.`,
  );
}

// ─── Persona builder (cacheable system-prompt prefix) ─────────────────────────

function formatBandsAsText(bands: Band[]): string {
  return bands
    .map(b => {
      const range = b.range[0] === b.range[1]
        ? `${b.range[0]}`
        : `${b.range[0]}-${b.range[1]}`;
      return `  Band ${range}: "${b.descriptor}"`;
    })
    .join('\n');
}

function formatCriteriaAsText(criteria: Criterion[]): string {
  return criteria
    .map(c => `${c.name} (max ${c.max_marks} marks):\n${formatBandsAsText(c.bands)}`)
    .join('\n\n');
}

function buildSubjectPersona(subject: 'IB_ECONOMICS' | 'IB_BUSINESS_MANAGEMENT'): string {
  const inv = SCHEME_TYPE_INVARIANTS;

  const sharedShapes = `=== SCHEME_DATA SHAPES AND INVARIANTS ===

content_checklist shape:
{
  "accepted_points": [
    {"point": "<what student must say>", "marks": 1, "keywords": ["term1", "term2"]},
    ...
  ],
  "marking_rule": "1 mark per distinct point, max X"
}
INVARIANT: ${inv.content_checklist[0].invariant}
REJECT IF: ${inv.content_checklist[0].reject_if}
RULE: minimum 2 IBO terminology keywords per accepted_point.
RULE: accepted_points must be genuinely distinct — do not split one concept across two points.

hybrid shape:
{
  "method_marks": [
    {"step": "<what student must do>", "marks": 1},
    ...
  ],
  "answer_marks": {
    "correct_answer": Y,
    "partial_credit_rules": "<when partial marks apply>"
  }
}
INVARIANT: ${inv.hybrid[0].invariant}
REJECT IF: ${inv.hybrid[0].reject_if}
SHOW THAT INVARIANT: ${inv.hybrid[1].invariant}
REJECT IF: ${inv.hybrid[1].reject_if}`;

  if (subject === 'IB_ECONOMICS') {
    const econ = MARK_SCHEME_V3_IB_ECONOMICS;
    const ao4terms = econ.ao4_econ_only
      .map(t => `  - ${t.command_term}: ${t.typical_structure}`)
      .join('\n');
    const calcRules = econ.calculator_rules
      .map(r => `  - ${r.paper}: ${r.permitted ? 'GDC permitted.' : 'NOT permitted.'} ${r.note}`)
      .join('\n');

    return `You are an IBO mark scheme author for IB Economics (guide: first assessment ${SUBJECT_GUIDE_YEARS.IB_ECONOMICS}).
You write mark schemes for content_checklist and hybrid questions only.
band_descriptor questions (P1 Part a/b, P2 Part g, P3 Part b) use canonical markbands — you do not generate these.

${sharedShapes}

=== IB ECONOMICS — AO4 QUANTITATIVE COMMAND TERMS ===

${ao4terms}

=== CALCULATOR RULES ===

${calcRules}

=== DIAGRAM RULES (content_checklist questions only) ===

"${econ.diagram_rules.optional_phrase}": include a diagram if it aids the answer.
Essential diagrams: "${econ.diagram_rules.essential_guidance}"
When a question explicitly requires a diagram, include a diagram accepted_point:
  {"point": "correctly labelled [diagram type] with [required features]", "marks": N, "keywords": ["axis1", "axis2", "curve name", "equilibrium"]}
${econ.diagram_rules.holistic_integration_note}`;
  }

  // IB_BUSINESS_MANAGEMENT
  const bm = MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT;
  const calcRules = bm.calculator_rules
    .map(r => `  - ${r.paper}: ${r.permitted ? 'GDC permitted.' : 'NOT permitted.'} ${r.note}`)
    .join('\n');

  return `You are an IBO mark scheme author for IB Business Management (guide: first assessment ${SUBJECT_GUIDE_YEARS.IB_BUSINESS_MANAGEMENT}).
You write mark schemes for content_checklist and hybrid questions only.
band_descriptor questions (P1/P2 Section B extended response) and criteria_marked questions (P3 Q3) use canonical schemes — you do not generate these.

${sharedShapes}

=== CALCULATOR RULES ===

${calcRules}

=== BM-SPECIFIC RULES ===

Section A vs Section B: ${bm.section_a_vs_b_rule.rule}
Do NOT output for Section B extended response questions — those are band_descriptor handled canonically.

P3 special cases:
- Q1 (2 marks, AO1 state/define): content_checklist. 2 accepted_points of 1m each, or 1 point of 2m.
- Q2 (6 marks, AO2 explain/analyse): content_checklist — the guide explicitly assigns analytic markscheme here (NOT band_descriptor).
- Q3 (17 marks, criteria-marked): DO NOT output. This is handled with canonical criteria.

No diagram requirements: BM mark schemes do not include diagram accepted_points unless the question text explicitly requires a diagram.`;
}

// ─── Tool definition ──────────────────────────────────────────────────────────

const SUBMIT_MARK_SCHEME_TOOL: Anthropic.Tool = {
  name: 'submit_mark_scheme',
  description: 'Submit the drafted IBO mark scheme for this question.',
  input_schema: {
    type: 'object' as const,
    properties: {
      scheme_data: {
        type: 'object',
        description:
          'scheme_data JSON matching the scheme_type specified in the instructions. ' +
          'content_checklist: { accepted_points: [{point, marks, keywords}], marking_rule }. ' +
          'hybrid: { method_marks: [{step, marks}], answer_marks: {correct_answer, partial_credit_rules} }.',
      },
      generation_notes: {
        type: 'string',
        description: 'Optional. Any edge cases, ambiguities, or assumptions made during drafting.',
      },
    },
    required: ['scheme_data'],
  },
};

// ─── User prompt builder ──────────────────────────────────────────────────────

function buildUserPrompt(spec: MarkSchemeSpec): string {
  const term      = spec.command_term.replace(/_/g, ' ');
  const isShowThat = term.toLowerCase() === 'show that';
  const contextBlock = spec.context_text
    ? `\nContext/Stimulus:\n"${spec.context_text}"\n`
    : '';

  const header = `Write a ${spec.scheme_type} mark scheme for this ${SUBJECT_LABELS[spec.subject]} examination question.

Question metadata:
- Paper: ${spec.paper}, Question type: ${spec.question_type}
- Command term: ${term} (${spec.ao_level})
- Marks: ${spec.marks}
- Level: ${spec.level}

Question text:
"${spec.question_text}"
${contextBlock}
Required scheme_type: ${spec.scheme_type}`;

  if (spec.scheme_type === 'content_checklist') {
    const reviewFlag = spec.requires_human_review
      ? `\nREVIEW FLAG: AO2 question at ${spec.marks} marks — scheme_type is content_checklist. ` +
        `Verify this is structurally a list of discrete points, not a holistic response.\n`
      : '';

    // Rule 22 — EVIDENCE: Economics Guide (first assessment 2022), pp. 18-19
    // (MARK_SCHEME_EVIDENCE.md §2.F). AO2 "Explain" definition: "These terms require
    // students to use their knowledge and skills to break down ideas into simpler parts
    // and to see how the parts relate." "Explain one [X]..." questions are depth-marked
    // on one reason, not breadth across multiple reasons. Per-examination tier labels are
    // IBO marking convention; no verbatim per-exam mark scheme is available in this repo.
    // Anchored to AO2 definition, Econ Guide pp. 18-19. See MARK_SCHEME_EVIDENCE.md §2.F.
    const isExplainOne = /\bexplain\s+(one|a)\s+(reason|way|cause|factor|advantage|disadvantage|benefit|drawback|impact|effect|implication|example)\b/i.test(spec.question_text);

    if (isExplainOne) {
      const depthPoints = spec.marks === 2
        ? `    { "point": "Explains how the named reason causes [the stated effect] — the causal mechanism.", "marks": 1, "keywords": [<mechanism terms>] }`
        : `    { "point": "Explains how the named reason causes [the stated effect] — the causal mechanism.", "marks": 1, "keywords": [<mechanism terms>] },\n    { "point": "Extends the explanation with a consequence, further implication, or real-world application of the named reason.", "marks": ${spec.marks - 2}, "keywords": [<consequence/development terms>] }`;

      return `${header}

DEPTH-MARKED QUESTION — "Explain one [X]..." structure detected.

IBO marks this question type on the DEPTH of analysis of a SINGLE reason, not breadth across multiple reasons. The student earns all marks by developing ONE reason fully.

Source: IBO AO2 definition (Economics Guide, pp. 18-19): "These terms require students to use their knowledge and skills to break down ideas into simpler parts and to see how the parts relate."

Required scheme_data shape:
{
  "accepted_reasons": [
    { "reason": "<valid reason 1>", "keywords": ["term1", "term2"] },
    { "reason": "<valid reason 2>", "keywords": ["term1", "term2"] },
    ... (list ALL reasons IBO would accept for the naming mark — typically 3-6)
  ],
  "accepted_points": [
    { "point": "Names any one valid reason from the accepted_reasons list.", "marks": 1, "keywords": [<union of key terms from all accepted_reasons>] },
${depthPoints}
  ],
  "marking_rule": "depth-marked on one reason: 1m naming, ${spec.marks - 1}m depth. Award marks for depth of analysis of any one accepted reason — do not require all reasons."
}

Rules:
- sum(accepted_points[*].marks) MUST equal ${spec.marks}.
- accepted_reasons lists EVERY distinct reason IBO would award the naming mark for.
- Each accepted_reason must include minimum 2 IBO terminology keywords.
- Do NOT produce one accepted_point per reason — that structure is wrong for this question type.${reviewFlag}`;
    }

    // Pattern 5b — "Explain two/three [X]..." detection (§DEFECT-5b)
    // EVIDENCE: IBO AO2 definition (Guide pp. 18-19). Multi-part explain-N questions require
    // breadth across N reasons, each named AND developed. Differs from "explain one" (depth-only).
    const explainNMatch = EXPLAIN_N_RE.exec(spec.question_text);
    const explainN = explainNMatch
      ? (explainNMatch[1].toLowerCase() === 'two' || explainNMatch[1] === '2' ? 2 : 3)
      : 0;

    if (explainN > 0) {
      const nWord     = explainN === 2 ? 'two' : 'three';
      const nounRaw   = explainNMatch![2] ?? 'reason';
      const nounType  = nounRaw.toLowerCase();
      const nounTitle = nounType.charAt(0).toUpperCase() + nounType.slice(1);
      const marksPerN = Math.floor(spec.marks / explainN);
      const depthM    = Math.max(1, marksPerN - 1);
      const thirdPair = explainN === 3
        ? `\n    { "point": "Names a third valid ${nounType}: <brief label for ${nounType} 3>", "marks": 1, "keywords": [<naming terms>] },\n    { "point": "Develops ${nounType} 3: <mechanism or consequence>", "marks": ${depthM}, "keywords": [<mechanism terms>] },`
        : '';

      return `${header}

BREADTH-MARKED QUESTION — "Explain ${nWord} [${nounType}]..." structure detected.

IBO marks this question type on BREADTH across ${explainN} distinct ${nounType}s, each named and developed. This is NOT depth-marked on one reason — both breadth (${explainN} ${nounType}s) and depth (development per ${nounType}) are required.

Source: IBO AO2 definition (Guide, pp. 18-19): "These terms require students to use their knowledge and skills to break down ideas into simpler parts and to see how the parts relate."

Required scheme_data shape (${explainN} ${nounType}s at ~${marksPerN}m each):
{
  "accepted_points": [
    { "point": "Names a valid ${nounType}: <brief label for ${nounType} 1>", "marks": 1, "keywords": [<naming terms>] },
    { "point": "Develops ${nounType} 1: <mechanism, consequence, or further implication>", "marks": ${depthM}, "keywords": [<mechanism terms>] },
    { "point": "Names a second valid ${nounType}: <brief label for ${nounType} 2>", "marks": 1, "keywords": [<naming terms>] },
    { "point": "Develops ${nounType} 2: <mechanism, consequence, or further implication>", "marks": ${depthM}, "keywords": [<mechanism terms>] },${thirdPair}
  ],
  "marking_rule": "${explainN} ${nounType}s required; ${marksPerN}m per ${nounType}: 1m naming, ${depthM}m development. Max ${spec.marks}."
}

Rules:
- sum(accepted_points[*].marks) MUST equal ${spec.marks}.
- MINIMUM ${explainN * 2} accepted_points — at least naming (1m) + development per ${nounType}.
- Each accepted_point must include minimum 2 IBO terminology keywords.
- Each ${nounType} must be a distinct concept — do not list the same ${nounType} twice.
- Do NOT produce a flat pooled point list — the ${nWord}-${nounType} structure is mandatory.${reviewFlag}`;
    }

    const conceptualGuardrails = spec.subject === 'IB_ECONOMICS' ? `

CONCEPTUAL MAPPING GUARDRAILS — IB ECONOMICS CONTENT QUESTIONS:

AD/AS curve attribution:
- Cost-reducing supply-side policies (corporate tax cuts, subsidies to firms, deregulation) lower firms' short-run costs → primary effect is SRAS rightward. Do NOT attribute an LRAS shift as the primary mechanism of a cost-reduction policy.
- Capacity-building policies (human capital investment, infrastructure spending, R&D, education) raise productive capacity → primary effect is LRAS rightward. These may also shift SRAS, but their IBO-distinguishing mechanism is the LRAS shift. Do NOT describe a capacity-building policy as primarily affecting SRAS only.
- A point MAY correctly note that a policy affects both curves if economically accurate, but must identify the PRIMARY curve for each policy type. WRONG example: "cost-reduction policies shift the SRAS/LRAS curve through cost-side relief." RIGHT: cost-reduction → SRAS (primary); human-capital/capacity → LRAS (primary).

Externality type — curve divergence:
- Production externality (e.g. factory pollution, resource extraction): the divergence is between MSC and MPC. MSB = MPB (unchanged). Do NOT write MSB ≠ MPB for a production externality.
- Consumption externality (e.g. education, vaccination, smoking): the divergence is between MSB and MPB. MSC = MPC (unchanged). Do NOT write MSC ≠ MPC for a consumption externality.
- These are NOT interchangeable. A point that attributes MSB > MPB to a production externality, or MSC > MPC to a consumption externality, is wrong and must not appear in accepted_points.` : '';

    return `${header}

Instructions:
- Produce accepted_points that collectively and completely answer what "${term}" requires.
- sum(accepted_points[*].marks) MUST equal ${spec.marks}. Reject any scheme that violates this.
- Each accepted_point must include minimum 2 IBO terminology keywords.
- marking_rule: use "1 mark per distinct point, max ${spec.marks}" unless multi-mark points are appropriate.
- Do NOT use band descriptor language — this is an analytic markscheme.
- Points must be genuinely distinct; do not split one concept into two points to inflate the count.${reviewFlag}${conceptualGuardrails}`;
  }

  if (spec.scheme_type === 'hybrid') {
    // Rule 22 — EVIDENCE: BM Subject Guide (first assessment 2024), p. 38
    // (MARK_SCHEME_EVIDENCE.md §2.G). Analytic markscheme definition: "They give
    // detailed instructions to examiners on how to break down the total mark for
    // each question for different parts of the response."
    //
    // DECOMPOSITION CONVENTION (not a verbatim subject-guide quote — same status as
    // §2.F depth-marking tier labels): every distinct intermediate value the student
    // must compute to reach the final answer is its own method_mark step. The sum
    // invariant alone is necessary but not sufficient — a scheme that omits an
    // intermediate step passes the sum check but cannot award partial credit for
    // that step's working.
    const showThatRule = isShowThat
      ? `\nSHOW THAT RULE: answer_marks.correct_answer = 0. ` +
        `All ${spec.marks} marks MUST be in method_marks. The answer is given in the question — no mark for producing it.\n`
      : '';
    const calcRule =
      spec.paper === 'P1' && spec.subject === 'IB_ECONOMICS'
        ? `\nCALCULATOR RULE: Paper 1 — calculators NOT permitted. All steps must be solvable without a calculator.\n`
        : '';

    return `${header}

Instructions:
- Break the correct solution into discrete, ordered method_marks steps — one step per distinct intermediate value the student must compute.
- Trace the path from the given values to the final answer. Every named intermediate quantity on that path is its own method_mark step.
- answer_marks.correct_answer: the NUMBER OF MARKS awarded for the correct final answer (0 or 1), not the numerical answer itself. Set to 0 when all marks sit in method_marks (fully-decomposed two-step question, or "Show that"). Set to 1 when there is a distinct final-answer mark.
- sum(method_marks[*].marks) + answer_marks.correct_answer MUST equal ${spec.marks}.
- partial_credit_rules: describe when partial marks apply; include the expected final numerical answer here for examiner reference.

DECOMPOSITION DISCIPLINE — the sum invariant alone is not sufficient. A scheme where sum(method_marks) + correct_answer == max_marks but an intermediate computation step is absent is structurally incomplete: Mia cannot award partial credit for working she has no method_mark step to match against.

WORKED EXAMPLES:

2-mark calculate, fully decomposed (both operations as method steps, correct_answer = 0):
Question: "Calculate the total external cost when MEC = $15 per tonne and output = 120 tonnes."
{
  "method_marks": [
    {"step": "Identify MEC per unit: $55 − $40 = $15 per tonne", "marks": 1},
    {"step": "Total external cost: $15 × 120 tonnes = $1,800", "marks": 1}
  ],
  "answer_marks": {
    "correct_answer": 0,
    "partial_credit_rules": "All marks in method_marks for this two-step calculation. If MEC correct but multiplication wrong, award 1m. If MEC wrong, award 0m."
  }
}

2-mark calculate, alternative pattern (1 method step + 1 answer mark, correct_answer = 1):
Question: "Calculate the unemployment rate given 6m unemployed and a labour force of 30m."
{
  "method_marks": [
    {"step": "Apply formula: unemployed / labour force × 100 = 6m / 30m × 100", "marks": 1}
  ],
  "answer_marks": {
    "correct_answer": 1,
    "partial_credit_rules": "1m for correct formula application; 1m for arithmetically correct answer (20%). If formula correct but answer wrong, award 1m only."
  }
}

4-mark calculate (3 method steps + 1 answer mark, correct_answer = 1):
Question: "Calculate the change in equilibrium national income given MPS = 0.25 and an increase in investment of $200m."
{
  "method_marks": [
    {"step": "Calculate MPC: MPC = 1 − MPS = 1 − 0.25 = 0.75", "marks": 1},
    {"step": "Calculate the multiplier: k = 1 / (1 − MPC) = 1 / 0.25 = 4", "marks": 1},
    {"step": "Apply ΔY = k × ΔI = 4 × $200m", "marks": 1}
  ],
  "answer_marks": {
    "correct_answer": 1,
    "partial_credit_rules": "Error carried forward — award method marks for correct subsequent steps using student's own intermediate values. If final answer of $800m correct, award full 4m."
  }
}
MULTI-VALUE RULE: If the question names more than one value to calculate or determine (e.g. "Calculate the equilibrium price and the equilibrium quantity", "Determine the consumer surplus and the producer surplus"), include AT LEAST ONE distinct method_marks step for EACH named final value. A scheme that computes Q but not P when both are asked is structurally incomplete — the sum invariant does not catch a missing step for the second value.

FORMULA-SELECTION GUARDRAILS:
- MULTIPLIER (closed-economy default): The Keynesian multiplier = 1 / (1 − MPC) = 1 / MPS. The denominator uses MPC (= 1 − MPS) — NOT MPM (marginal propensity to import). MPM belongs to the open-economy multiplier only (k = 1 / (MPS + MPM + MT)). If the question gives MPS, first derive MPC = 1 − MPS. Use MPM only when the question text explicitly mentions imports or an open economy.
- EXTERNALITY direction: State the direction of the effect BEFORE computing any welfare or quantity value. Negative externality → MPC < MSC → free market OVERPRODUCES relative to Q* → deadweight welfare loss triangle lies to the LEFT of Q*. Positive externality → MPB < MSB → free market UNDERPRODUCES → welfare forgone lies to the RIGHT of Q*. Attach the welfare triangle to the correct side of Q*.

INTERPRETATION MAPPING RULE: For any question where a numeric result maps to a categorical conclusion (elasticity classification, comparative advantage, trade direction, budget surplus/deficit), the scheme MUST state the mapping rule before assigning the label. Put this in partial_credit_rules so examiners can award interpretation marks on ECF answers. Required mappings:
  - PED: |PED| > 1 → price-elastic (demand is sensitive to price changes); |PED| < 1 → price-inelastic; |PED| = 1 → unit elastic. Do NOT invert these labels.
  - Comparative advantage: the country with the LOWER opportunity cost per unit of a good has comparative advantage in that good.
  - Always state: "If result [comparison] → interpretation A; if result [comparison] → interpretation B."

Note: correct_answer is the NUMBER OF MARKS for the correct final answer (0 or 1), not the numerical answer itself. The expected answer ($1,800, $800m, etc.) goes in partial_credit_rules for examiner reference.${showThatRule}${calcRule}`;
  }

  throw new Error(`buildUserPrompt called for non-Claude scheme_type: ${spec.scheme_type}`);
}

// ─── Claude API ───────────────────────────────────────────────────────────────

async function draftMarkScheme(
  anthropic: Anthropic,
  spec: MarkSchemeSpec,
  persona: string,
): Promise<{ data: MarkSchemeData; violations: MarkSchemeViolation[] }> {
  const res = await anthropic.messages.create({
    model:       'claude-sonnet-4-6',
    max_tokens:  1000,
    system:      persona,
    tools:       [SUBMIT_MARK_SCHEME_TOOL],
    tool_choice: { type: 'tool', name: 'submit_mark_scheme' },
    messages:    [{ role: 'user', content: buildUserPrompt(spec) }],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in response');

  const inp  = block.input as { scheme_data: MarkSchemeData };
  const data = inp.scheme_data;
  const violations = validateMarkSchemeData(data, spec.scheme_type, spec.marks);

  return { data, violations };
}

// ─── DB queries ───────────────────────────────────────────────────────────────

const QUESTION_SELECT =
  'id, question_text, context_text, command_term, ao_level, paper, question_type, marks, level, subject';

async function fetchUncoveredSeedQuestions(
  supabase: SupabaseClient,
  subject: string,
): Promise<QuestionRow[]> {
  // All question_ids that already have any mark_scheme row (any status).
  const { data: existing, error: existErr } = await supabase
    .from('mark_schemes')
    .select('question_id')
    .eq('subject', subject);

  if (existErr) throw new Error(`Failed to fetch existing mark_schemes: ${existErr.message}`);

  const coveredIds = new Set((existing ?? []).map((r: { question_id: string }) => r.question_id));

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select(QUESTION_SELECT)
    .eq('subject', subject)
    .eq('status', 'seed')
    .order('id');

  if (qErr) throw new Error(`Failed to fetch seed questions: ${qErr.message}`);

  return ((questions ?? []) as QuestionRow[]).filter(q => !coveredIds.has(q.id));
}

async function fetchRejectedSpecs(
  supabase: SupabaseClient,
  subject: string,
): Promise<MarkSchemeSpec[]> {
  const { data: rejected, error: rejErr } = await supabase
    .from('mark_schemes')
    .select('question_id')
    .eq('subject', subject)
    .eq('status', 'rejected');

  if (rejErr) throw new Error(`Failed to fetch rejected mark_schemes: ${rejErr.message}`);
  if (!rejected?.length) return [];

  const questionIds = (rejected as { question_id: string }[]).map(r => r.question_id);

  const { data: questions, error: qErr } = await supabase
    .from('questions')
    .select(QUESTION_SELECT)
    .in('id', questionIds)
    .eq('status', 'seed');

  if (qErr) throw new Error(`Failed to fetch questions for rejected schemes: ${qErr.message}`);

  return ((questions ?? []) as QuestionRow[]).map(buildSpec);
}

// ─── DB insert ────────────────────────────────────────────────────────────────

async function insertMarkScheme(
  supabase: SupabaseClient,
  spec: MarkSchemeSpec,
  schemeData: MarkSchemeData,
): Promise<void> {
  const today      = new Date().toISOString().slice(0, 10);
  const guideYear  = SUBJECT_GUIDE_YEARS[spec.subject] ?? 'unknown';
  const label      = SUBJECT_LABELS[spec.subject] ?? spec.subject;

  const { error } = await supabase.from('mark_schemes').insert({
    question_id:          spec.question_id,
    subject:              spec.subject,
    exam_board:           'IBO',
    scheme_type:          spec.scheme_type,
    max_marks:            spec.marks,
    scheme_data:          schemeData,
    source_reference:
      `Gradd generated - ${label} ${today}. Anchored to IBO ${guideYear} markbands.`,
    status:               'candidate',
    verification_status:  'unverified',
    verification_notes:   spec.requires_human_review
      ? { human_review: 'AO2 5-6m border case - verify scheme_type assignment' }
      : null,
  });

  if (error) throw new Error(`INSERT failed for question_id=${spec.question_id}: ${error.message}`);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

function col(s: string | number, w: number): string {
  return String(s).slice(0, w).padEnd(w);
}

function tally(specs: MarkSchemeSpec[], key: keyof MarkSchemeSpec): Record<string, number> {
  return specs.reduce((acc, s) => {
    const v = String(s[key]);
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const arg  = (f: string) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : undefined; };
  const flag = (f: string) => argv.includes(f);

  const subjectArg    = arg('--subject');
  const dryRun        = flag('--dry-run');
  const printOnly     = flag('--print-only');
  const regenRejected = flag('--regen-rejected');

  if (!subjectArg) {
    console.error('Error: --subject is required (IB_ECONOMICS | IB_BUSINESS_MANAGEMENT)');
    process.exit(1);
  }
  if (subjectArg !== 'IB_ECONOMICS' && subjectArg !== 'IB_BUSINESS_MANAGEMENT') {
    console.error(
      `Error: unknown subject "${subjectArg}". Available: IB_ECONOMICS, IB_BUSINESS_MANAGEMENT`,
    );
    process.exit(1);
  }
  const subject = subjectArg as 'IB_ECONOMICS' | 'IB_BUSINESS_MANAGEMENT';

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  let specs: MarkSchemeSpec[];

  if (regenRejected) {
    console.log(`\nFetching rejected mark_schemes for ${subject}...`);
    specs = await fetchRejectedSpecs(supabase, subject);
    if (!specs.length) {
      console.log(`No rejected mark_schemes found for ${subject}.`);
      return;
    }
    console.log(`Found ${specs.length} rejected scheme(s) to regenerate.`);
  } else {
    console.log(`\nFetching uncovered seed questions for ${subject}...`);
    const rows = await fetchUncoveredSeedQuestions(supabase, subject);
    if (!rows.length) {
      console.log(`All seed questions for ${subject} already have a mark_scheme. Nothing to do.`);
      return;
    }
    const allSpecs = rows.map(buildSpec);
    const countArg = parseInt(arg('--count') ?? String(allSpecs.length), 10);
    specs = allSpecs.slice(0, countArg);
    console.log(
      `Found ${rows.length} uncovered question(s); processing ${specs.length}.`,
    );
  }

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (dryRun) {
    const LINE = '-'.repeat(118);
    console.log(`\n${LINE}`);
    console.log(`DRY RUN — ${specs.length} spec(s) for ${subject}  (no API or DB calls)`);
    console.log(LINE);
    console.log(
      col('#',            4)  + col('question_id', 12) + col('paper', 6) +
      col('q_type',      22)  + col('command_term', 20) + col('mks',   5) +
      col('scheme_type', 20)  + col('claude',        8) + 'review',
    );
    console.log(LINE);
    specs.forEach((s, i) => {
      console.log(
        col(i + 1,                         4)  +
        col(s.question_id.slice(0, 8) + '...', 12) +
        col(s.paper,                       6)  +
        col(s.question_type,              22)  +
        col(s.command_term,               20)  +
        col(s.marks,                       5)  +
        col(s.scheme_type,                20)  +
        col(s.needs_claude ? 'Y' : 'N',    8)  +
        (s.requires_human_review ? 'REVIEW' : ''),
      );
    });
    console.log(LINE);
    console.log('\nSummary:');
    console.log('  scheme_type   :', tally(specs, 'scheme_type'));
    console.log('  needs_claude  :', {
      yes: specs.filter(s => s.needs_claude).length,
      no:  specs.filter(s => !s.needs_claude).length,
    });
    console.log('  human_review  :', specs.filter(s => s.requires_human_review).length);
    console.log(`  Total         : ${specs.length}`);
    return;
  }

  // ── Print-only run (draft + print JSON, no insert) ────────────────────────
  if (printOnly) {
    const persona   = buildSubjectPersona(subject);
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

    for (let i = 0; i < specs.length; i++) {
      const spec = specs[i];
      console.log(`\n${'='.repeat(80)}`);
      console.log(`[${i + 1}/${specs.length}] question_id : ${spec.question_id}`);
      console.log(`question_text : ${spec.question_text}`);
      if (spec.context_text) console.log(`context_text  : ${spec.context_text}`);
      console.log(`paper         : ${spec.paper}  |  question_type : ${spec.question_type}`);
      console.log(`command_term  : ${spec.command_term}  |  ao_level : ${spec.ao_level}`);
      console.log(`scheme_type   : ${spec.scheme_type}`);
      console.log(`max_marks     : ${spec.marks}`);
      console.log(`needs_claude  : ${spec.needs_claude}`);
      console.log(`human_review  : ${spec.requires_human_review}`);
      console.log('');

      let schemeData: MarkSchemeData;
      if (!spec.needs_claude) {
        schemeData = buildDeterministicSchemeData(spec);
        console.log('scheme_data (deterministic):');
      } else {
        const result = await draftMarkScheme(anthropic, spec, persona);
        if (result.violations.length > 0) {
          console.log('INVARIANT VIOLATIONS:');
          result.violations.forEach(v => console.log(`  [${v.rule}] ${v.message}`));
        }
        schemeData = result.data;
        console.log(`scheme_data (Claude-drafted${result.violations.length ? ' — VIOLATIONS' : ''}):`)
      }
      console.log(JSON.stringify(schemeData, null, 2));
    }
    return;
  }

  // ── Live run ──────────────────────────────────────────────────────────────
  const persona   = buildSubjectPersona(subject);
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const failed: number[] = [];
  let inserted = 0;

  for (let i = 0; i < specs.length; i++) {
    const spec  = specs[i];
    const label =
      `[${i + 1}/${specs.length}] ${spec.question_id.slice(0, 8)}... ` +
      `${spec.paper} · ${spec.command_term} · ${spec.marks}m · ${spec.scheme_type}`;

    // Deterministic path — no Claude call
    if (!spec.needs_claude) {
      try {
        const schemeData = buildDeterministicSchemeData(spec);
        await insertMarkScheme(supabase, spec, schemeData);
        console.log(`  ✓ ${label} (deterministic)`);
        inserted++;
      } catch (err) {
        console.error(`  ✗ ${label} FAILED: ${(err as Error).message}`);
        failed.push(i + 1);
      }
      await sleep(50);
      continue;
    }

    // Claude path — 2-attempt retry
    let result: { data: MarkSchemeData; violations: MarkSchemeViolation[] } | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        result = await draftMarkScheme(anthropic, spec, persona);
        break;
      } catch (err) {
        if (attempt === 0) {
          console.warn(`  ↻ ${label} retry (${(err as Error).message})`);
          await sleep(2000);
        } else {
          console.error(`  ✗ ${label} FAILED: ${(err as Error).message}`);
          failed.push(i + 1);
        }
      }
    }

    if (result) {
      if (result.violations.length > 0) {
        console.error(`  ✗ ${label} INVARIANT VIOLATIONS:`);
        result.violations.forEach(v => console.error(`      [${v.rule}] ${v.message}`));
        failed.push(i + 1);
      } else {
        try {
          await insertMarkScheme(supabase, spec, result.data);
          const reviewNote = spec.requires_human_review ? ' [REVIEW]' : '';
          console.log(`  ✓ ${label}${reviewNote}`);
          inserted++;
        } catch (err) {
          console.error(`  ✗ ${label} INSERT failed: ${(err as Error).message}`);
          failed.push(i + 1);
        }
      }
    }

    await sleep(200);
  }

  console.log(`\n${'-'.repeat(60)}`);
  console.log(`Done. ${inserted}/${specs.length} inserted.`);
  if (failed.length) console.log(`Failed spec indices: ${failed.join(', ')}`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
