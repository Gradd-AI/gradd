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
 *   npm run generate-apm-drills -- --regen-rejected [--dry-run]
 *
 * Args:
 *   --count           How many drills to generate (default: 73 for all LOs, 1 if --lo)
 *   --lo              Limit to a single LO code e.g. A1a. Cycles if --count > 1.
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
  'arise in that context, in which case substitute an equally diverse non-UK, non-healthcare alternative.';

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
  'see the problem differently next time.';

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
      `error — identify and correct it before producing output.`
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
- model_answer: ${spec.marks_guide}-mark Band 1 response (100–300 words) demonstrating full APM technical marks`;
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
2. full_reveal — 3–5 sentences: name the specific misconception a typical APM candidate brings to this type of question, then give the diagnosis-led reframe (why that thinking is wrong, what the correct mental model is). Not a restatement of the model answer.`;
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
        description: 'Drill question text starting with the command verb (capitalised). Scenario-based, professional advisory register.',
      },
      context_text: {
        type: 'string',
        description: 'Organisational scenario providing context. For calculation drills, must include ALL numeric data needed. 2–4 sentences.',
      },
      model_answer: {
        type: 'string',
        description: 'Mark-scheme level answer (100–300 words) demonstrating Band 1 / full APM technical marks.',
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
        description: 'One sentence: targeted nudge for a wrong first attempt — points at the gap without giving the answer.',
      },
      full_reveal: {
        type: 'string',
        description: '3–5 sentences: names the specific misconception, then gives the diagnosis-led reframe. Not a restated model answer.',
      },
    },
    required: ['hint', 'full_reveal'],
  },
};

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
  const dryRun        = flag('--dry-run');
  const regenRejected = flag('--regen-rejected');

  if (loFilter && !(loFilter in SYLLABUS_MAP)) {
    console.error(`Error: unknown LO code "${loFilter}". Valid codes: ${Object.keys(SYLLABUS_MAP).join(', ')}`);
    process.exit(1);
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

      let pass1: { question: string; context_text: string; model_answer: string } | null = null;
      let pass2: { hint: string; full_reveal: string } | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try { pass1 = await draftDrill(anthropic, spec); break; }
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

  const specs = buildSpecList(loFilter, countArg);

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

      let pass1: { question: string; context_text: string; model_answer: string } | null = null;
      let pass2: { hint: string; full_reveal: string } | null = null;

      for (let attempt = 0; attempt < 2; attempt++) {
        try { pass1 = await draftDrill(anthropic, spec); break; }
        catch (err) {
          if (attempt === 0) { console.warn(`  ↻ ${label} [P1] retry (${(err as Error).message})`); await sleep(2000); }
          else { console.error(`  ✗ ${label} [P1] FAILED: ${(err as Error).message}`); }
        }
      }

      if (!pass1) { await sleep(200); continue; }

      console.log(`\nCONTEXT_TEXT:\n${pass1.context_text}`);
      console.log(`\nQUESTION:\n${pass1.question}`);
      console.log(`\nMODEL_ANSWER:\n${pass1.model_answer}`);

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
        pass1 = await draftDrill(anthropic, spec);
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
