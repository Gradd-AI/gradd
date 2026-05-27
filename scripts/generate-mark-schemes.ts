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
 *   --dry-run         Print spec list and exit — no Claude API or DB writes
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

    return `${header}

Instructions:
- Produce accepted_points that collectively and completely answer what "${term}" requires.
- sum(accepted_points[*].marks) MUST equal ${spec.marks}. Reject any scheme that violates this.
- Each accepted_point must include minimum 2 IBO terminology keywords.
- marking_rule: use "1 mark per distinct point, max ${spec.marks}" unless multi-mark points are appropriate.
- Do NOT use band descriptor language — this is an analytic markscheme.
- Points must be genuinely distinct; do not split one concept into two points to inflate the count.${reviewFlag}`;
  }

  if (spec.scheme_type === 'hybrid') {
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
- Break the correct solution into discrete, ordered method_marks steps.
- Assign marks per step — steps requiring more work may earn more than 1 mark.
- sum(method_marks[*].marks) + answer_marks.correct_answer MUST equal ${spec.marks}.
- partial_credit_rules: describe when partial marks apply (e.g. "correct method but arithmetic error — award method marks only").${showThatRule}${calcRule}`;
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
    .in('id', questionIds);

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
