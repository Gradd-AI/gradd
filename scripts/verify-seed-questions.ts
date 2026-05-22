#!/usr/bin/env tsx
/**
 * verify-seed-questions.ts
 *
 * Audits candidate questions in the `questions` table against the official IBO
 * Subject Guide PDF, using Claude Sonnet with prompt caching. The PDF is sent
 * once and cached for ~5 minutes — subsequent calls cost ~10% of the first.
 *
 * Usage:
 *   npm run verify-seed -- --subject IB_ECONOMICS [--limit N] [--dry-run]
 *
 * Args:
 *   --subject   Required. IB_ECONOMICS | IB_BUSINESS
 *   --limit     Process at most N candidates (default: all unverified)
 *   --dry-run   Show candidates + prompt shape; skip API and DB writes
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 * Override PDF paths: IB_ECON_GUIDE_PATH, IB_BM_GUIDE_PATH
 */

import { readFileSync } from 'fs';
import path from 'path';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Env vars loaded by tsx --env-file=.env.local in the npm script.

// ─────────────────────────────────────────────────────────────────────────────
// Subject guide PDF paths
// ─────────────────────────────────────────────────────────────────────────────

const DOCS = path.join(process.cwd(), 'docs');

const SUBJECT_GUIDE_PATHS: Record<string, string> = {
  IB_ECONOMICS: process.env.IB_ECON_GUIDE_PATH ?? path.join(DOCS, 'new_economics_guide_first_assessment_2022.pdf'),
  IB_BUSINESS:  process.env.IB_BM_GUIDE_PATH   ?? path.join(DOCS, 'Business_Management_Subject_Guide.pdf'),
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  topic_code: string;
  level: string;
  paper: string;
  command_term: string;
  marks: number;
  ao_level: string;
  question_type: string;
  question_text: string;
  context_text: string | null;
}

interface VerificationResult {
  syllabus_match:   'in_syllabus' | 'partial' | 'out_of_syllabus';
  command_term_fit: 'correct' | 'wrong_marks' | 'wrong_depth' | 'inappropriate';
  ao_alignment:     'correct' | 'wrong_level';
  paper_fit:        'correct' | 'wrong_paper';
  factual_accuracy: 'accurate' | 'minor_error' | 'major_error';
  overall:          'pass' | 'borderline' | 'fail';
  reasoning:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompts (identical across calls for the same subject → cached)
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  IB_ECONOMICS: `You are a rigorous IB Economics senior examiner and syllabus validator. \
Audit candidate examination questions against the official IB Economics Subject Guide provided as a PDF.

Score each question on five criteria:

1. syllabus_match — Is the topic covered in the subject guide?
   in_syllabus: the specific concept is explicitly listed as a syllabus point
   partial: related to the syllabus but not a direct named point
   out_of_syllabus: not covered in the subject guide

2. command_term_fit — Does the command term match the marks and required depth?
   correct: appropriate command term for the marks and depth
   wrong_marks: marks don't match IBO convention for this command term (e.g. "evaluate" set at 4 marks)
   wrong_depth: question depth is inconsistent with the command term
   inappropriate: the command term is entirely wrong for this question type

3. ao_alignment — Does the stated AO level match the command term and question?
   correct: consistent
   wrong_level: incorrect (e.g. AO3 on a define question)

4. paper_fit — Is this question format appropriate for the stated paper (P1/P2/P3)?
   correct: appropriate for the paper as stated
   wrong_paper: this format doesn't belong on this paper

5. factual_accuracy — Is the question economically accurate and unambiguous?
   accurate: correct
   minor_error: small issue that doesn't invalidate the question; fixable with light editing
   major_error: significant factual or conceptual error

Decision rule (enforce strictly):
  pass: every criterion is 'correct', 'accurate', or 'in_syllabus'
  fail: any criterion is 'out_of_syllabus', 'inappropriate', or 'major_error'
  borderline: anything else

A 'pass' requires ALL five criteria to be clean. Keep reasoning to 1–3 sentences.`,

  IB_BUSINESS: `You are a rigorous IB Business Management senior examiner and syllabus validator. \
Audit candidate examination questions against the official IB Business Management Subject Guide provided as a PDF. \
Apply the same five-criteria schema (syllabus_match, command_term_fit, ao_alignment, paper_fit, factual_accuracy) \
and the same decision rules: pass only when every criterion is clean, fail on any major flaw, borderline otherwise. \
Keep reasoning to 1–3 sentences.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Verification tool — forced structured output
// ─────────────────────────────────────────────────────────────────────────────

const SUBMIT_VERIFICATION_TOOL: Anthropic.Tool = {
  name: 'submit_verification',
  description: 'Submit the structured verification result for the candidate question',
  input_schema: {
    type: 'object' as const,
    properties: {
      syllabus_match:   { type: 'string', enum: ['in_syllabus', 'partial', 'out_of_syllabus'],             description: 'Is the topic in the subject guide?' },
      command_term_fit: { type: 'string', enum: ['correct', 'wrong_marks', 'wrong_depth', 'inappropriate'],description: 'Does the command term fit marks and depth?' },
      ao_alignment:     { type: 'string', enum: ['correct', 'wrong_level'],                               description: 'Does the AO level match the command term?' },
      paper_fit:        { type: 'string', enum: ['correct', 'wrong_paper'],                               description: 'Is this question format right for this paper?' },
      factual_accuracy: { type: 'string', enum: ['accurate', 'minor_error', 'major_error'],               description: 'Is the question economically accurate?' },
      overall:          { type: 'string', enum: ['pass', 'borderline', 'fail'],                           description: 'Overall verdict per decision rule' },
      reasoning:        { type: 'string',                                                                  description: '1–3 sentences explaining the verdict' },
    },
    required: ['syllabus_match', 'command_term_fit', 'ao_alignment', 'paper_fit', 'factual_accuracy', 'overall', 'reasoning'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-candidate user prompt (NOT cached — changes per call)
// ─────────────────────────────────────────────────────────────────────────────

function buildCandidatePrompt(c: Candidate): string {
  const contextSection = c.context_text
    ? `\nContext/stimulus:\n${c.context_text}\n`
    : '';
  return `Verify this IB candidate question against the subject guide provided above.

Metadata:
- Topic code: ${c.topic_code}
- Level: ${c.level}
- Paper: ${c.paper}
- Command term: ${c.command_term.replace(/_/g, ' ')}
- Marks: ${c.marks}
- AO level: ${c.ao_level}
- Question type: ${c.question_type}

Question text:
${c.question_text}
${contextSection}
Score on all five criteria and submit via submit_verification.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification call — PDF and system prompt are cached; candidate prompt is not
// ─────────────────────────────────────────────────────────────────────────────

async function verifyCandidate(
  anthropic: Anthropic,
  c: Candidate,
  pdfBase64: string,
  systemText: string,
  subject: string,
): Promise<{ result: VerificationResult; cacheReadTokens: number; cacheWriteTokens: number }> {
  // System prompt is ~440 tokens — below the 1024-token minimum for caching.
  // Only the PDF document block is cached; it is identical across all calls for
  // the same subject, so calls 2-N pay ~10% of call 1's PDF ingestion cost.
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemText,
    tools: [SUBMIT_VERIFICATION_TOOL],
    tool_choice: { type: 'tool', name: 'submit_verification' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'document',
            source: {
              type: 'base64',
              media_type: 'application/pdf',
              data: pdfBase64,
            },
            cache_control: { type: 'ephemeral' },
            title: subject === 'IB_ECONOMICS'
              ? 'IB Economics Subject Guide (First Assessment 2022)'
              : 'IB Business Management Subject Guide',
          } as Anthropic.DocumentBlockParam,
          {
            type: 'text',
            text: buildCandidatePrompt(c),
          },
        ],
      },
    ],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in response');

  return {
    result:           block.input as VerificationResult,
    cacheReadTokens:  res.usage.cache_read_input_tokens  ?? 0,
    cacheWriteTokens: res.usage.cache_creation_input_tokens ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const VERDICT_ICON: Record<string, string> = { pass: '✓', borderline: '~', fail: '✗' };

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const arg  = (f: string) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : undefined; };
  const flag = (f: string) => argv.includes(f);

  const subjectArg = arg('--subject');
  const limitArg   = arg('--limit') ? parseInt(arg('--limit')!, 10) : undefined;
  const dryRun     = flag('--dry-run');

  if (!subjectArg) {
    console.error('Error: --subject required (e.g. --subject IB_ECONOMICS)');
    process.exit(1);
  }

  const systemText = SYSTEM_PROMPTS[subjectArg];
  if (!systemText) {
    console.error(`Error: no system prompt configured for "${subjectArg}". Available: ${Object.keys(SYSTEM_PROMPTS).join(', ')}`);
    process.exit(1);
  }

  // ── Load + validate Subject Guide PDF ─────────────────────────────────────
  const guidePath = SUBJECT_GUIDE_PATHS[subjectArg];
  let pdfBase64: string;
  let pdfBytes: number;
  try {
    const buf = readFileSync(guidePath);
    pdfBytes  = buf.length;
    pdfBase64 = buf.toString('base64');
  } catch (err) {
    console.error(`Cannot read subject guide at "${guidePath}": ${(err as Error).message}`);
    console.error('Set IB_ECON_GUIDE_PATH or IB_BM_GUIDE_PATH in .env.local to override.');
    process.exit(1);
  }
  console.log(`\nSubject guide: ${path.basename(guidePath)} (${(pdfBytes / 1024 / 1024).toFixed(1)} MB)`);

  // ── Supabase service client ────────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ── Fetch unverified candidates ────────────────────────────────────────────
  let query = supabase
    .from('questions')
    .select('id, topic_code, level, paper, command_term, marks, ao_level, question_type, question_text, context_text')
    .eq('subject', subjectArg)
    .eq('status', 'candidate')
    .eq('verification_status', 'unverified')
    .order('id');

  if (limitArg) query = (query as ReturnType<typeof query.limit>).limit(limitArg) as typeof query;

  const { data: rows, error: dbErr } = await query;
  if (dbErr) { console.error('DB error:', dbErr.message); process.exit(1); }
  if (!rows?.length)  { console.log('No unverified candidates found.'); return; }

  const candidates = rows as Candidate[];
  console.log(`Loaded ${candidates.length} unverified candidate(s).`);

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (dryRun) {
    const LINE = '─'.repeat(90);
    console.log(`\n${LINE}`);
    console.log(`DRY RUN — ${candidates.length} candidate(s) for ${subjectArg}  (no API or DB calls)`);
    console.log(LINE);
    console.log(`\nPrompt structure (PDF block is cached — identical across all calls):`);
    console.log(`  [live]   system text   : ${systemText.length} chars  (~${Math.round(systemText.length / 4)} tokens, below 1024 cache min)`);
    console.log(`  [cached] PDF document  : ${(pdfBase64.length / 1024).toFixed(0)} KB base64  (cache_control: ephemeral)`);
    console.log(`  [live]   candidate text: ~${buildCandidatePrompt(candidates[0]).length} chars avg  (per-call, not cached)\n`);

    candidates.forEach((c, i) => {
      console.log(LINE);
      console.log(`[${i + 1}/${candidates.length}] id=${c.id}`);
      console.log(`  spec     : ${c.topic_code} · ${c.paper} · ${c.command_term.replace(/_/g, ' ')} · ${c.marks}m · ${c.level} · ${c.ao_level}`);
      console.log(`  question : ${c.question_text.slice(0, 160)}${c.question_text.length > 160 ? '…' : ''}`);
      if (c.context_text) {
        console.log(`  context  : ${c.context_text.slice(0, 120)}…`);
      }
    });
    console.log(LINE);
    return;
  }

  // ── Live run ──────────────────────────────────────────────────────────────
  // The beta header enables prompt caching in SDK 0.90.x for all claude models.
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY!,
    defaultHeaders: { 'anthropic-beta': 'prompt-caching-2024-07-31' },
  });
  const tallies = { pass: 0, borderline: 0, fail: 0, error: 0 };
  const startMs = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const c     = candidates[i];
    const label = `[${i + 1}/${candidates.length}] ${c.topic_code} · ${c.paper} · ${c.command_term.replace(/_/g, ' ')} · ${c.marks}m`;

    let vr: Awaited<ReturnType<typeof verifyCandidate>> | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        vr = await verifyCandidate(anthropic, c, pdfBase64, systemText, subjectArg);
        break;
      } catch (err) {
        if (attempt === 0) {
          console.warn(`  ↻ ${label} retry (${(err as Error).message})`);
          await sleep(2000);
        } else {
          console.error(`  ✗ ${label} ERROR: ${(err as Error).message}`);
          tallies.error++;
        }
      }
    }

    if (!vr) { await sleep(200); continue; }

    const { result, cacheReadTokens, cacheWriteTokens } = vr;
    const cacheTag = cacheReadTokens > 0
      ? `cache hit (${cacheReadTokens.toLocaleString()} read)`
      : `cache miss (${cacheWriteTokens.toLocaleString()} written)`;

    console.log(`  ${VERDICT_ICON[result.overall] ?? '?'} ${label} → ${result.overall}  [${cacheTag}]`);
    console.log(`    ${result.reasoning}`);
    if (result.overall !== 'pass') {
      console.log(`    criteria: syllabus=${result.syllabus_match} | term=${result.command_term_fit} | ao=${result.ao_alignment} | paper=${result.paper_fit} | fact=${result.factual_accuracy}`);
    }
    tallies[result.overall]++;

    const { error: upErr } = await supabase
      .from('questions')
      .update({
        verification_status: result.overall,
        verification_notes:  result,
        verified_at:         new Date().toISOString(),
      })
      .eq('id', c.id);

    if (upErr) console.error(`    DB write failed: ${upErr.message}`);

    await sleep(200);
  }

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(0);
  const total   = candidates.length;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Verified ${total - tallies.error}/${total}  (${elapsed}s)`);
  console.log(`  pass:       ${tallies.pass}`);
  console.log(`  borderline: ${tallies.borderline}`);
  console.log(`  fail:       ${tallies.fail}`);
  if (tallies.error) console.log(`  errors:     ${tallies.error}  (verification_status left as 'unverified')`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
