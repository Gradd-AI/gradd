#!/usr/bin/env tsx
/**
 * _test_correctness.ts
 *
 * Standalone harness for Check 6 (economic correctness) — runs BEFORE wiring into verifyCandidate.
 * Fetches known-bad and known-good schemes by ID prefix, runs checkEconomicCorrectness on each,
 * reports verdict + reasoning verbatim.
 *
 * Usage: npx tsx --env-file=.env.local scripts/_test_correctness.ts
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import {
  checkEconomicCorrectness,
  buildEconomicCorrectnessFramework,
  type MarkSchemeCandidate,
} from './verify-mark-schemes';
import type { SchemeType, MarkSchemeData } from './mark-scheme-framework';

// ─── Test cases ───────────────────────────────────────────────────────────────

const TEST_CASES: Array<{
  prefix:          string;
  label:           string;
  expectedVerdict: 'correct' | 'incorrect';
}> = [
  {
    prefix:          'fc8b97af',
    label:           'BAD — DWL height = equilibrium price − ceiling (should be demand−supply gap at traded Q)',
    expectedVerdict: 'incorrect',
  },
  {
    prefix:          '9cd45583',
    label:           'BAD — production externality scheme writes MSB > MPB (conflates production/consumption)',
    expectedVerdict: 'incorrect',
  },
  {
    prefix:          'e70d1e96',
    label:           'GOOD — open-economy multiplier',
    expectedVerdict: 'correct',
  },
  {
    prefix:          'fb2fecfa',
    label:           'GOOD — PED at points X/Y (approved this session)',
    expectedVerdict: 'correct',
  },
];

// ─── Fetch helpers ────────────────────────────────────────────────────────────

const MARK_SCHEME_SELECT =
  'id, question_id, subject, scheme_type, max_marks, scheme_data, ' +
  'questions!inner(question_text, context_text, command_term, ao_level, paper, question_type, marks, level)';

interface QuestionJoin {
  question_text: string;
  context_text:  string | null;
  command_term:  string;
  ao_level:      string;
  paper:         string;
  question_type: string;
  marks:         number;
  level:         string;
}

interface RawRow {
  id:          string;
  question_id: string;
  subject:     string;
  scheme_type: SchemeType;
  max_marks:   number;
  scheme_data: MarkSchemeData;
  questions:   QuestionJoin;
}

function flatten(row: RawRow): MarkSchemeCandidate {
  return {
    id:            row.id,
    question_id:   row.question_id,
    subject:       row.subject,
    scheme_type:   row.scheme_type,
    max_marks:     row.max_marks,
    scheme_data:   row.scheme_data,
    question_text: row.questions.question_text,
    context_text:  row.questions.context_text,
    command_term:  row.questions.command_term,
    ao_level:      row.questions.ao_level,
    paper:         row.questions.paper,
    question_type: row.questions.question_type,
    marks:         row.questions.marks,
    level:         row.questions.level,
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const supabase  = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const framework = buildEconomicCorrectnessFramework('IB_ECONOMICS');

  // Fetch all IB_ECON rows (all statuses) and filter by prefix in JS —
  // avoids UUID-cast issues with PostgREST ilike on uuid columns.
  const { data, error } = await supabase
    .from('mark_schemes')
    .select(MARK_SCHEME_SELECT)
    .eq('subject', 'IB_ECONOMICS')
    .order('id');

  if (error) throw new Error(`Fetch failed: ${error.message}`);
  const allRows = (data ?? []) as unknown as RawRow[];
  console.log(`Fetched ${allRows.length} IB_ECON mark_schemes\n${'─'.repeat(60)}`);

  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const tc of TEST_CASES) {
    const row = allRows.find(r => r.id.startsWith(tc.prefix));
    if (!row) {
      console.log(`\n[${tc.prefix}] NOT FOUND in DB — skipped`);
      skipped++;
      continue;
    }

    const candidate = flatten(row);
    console.log(`\n[${tc.prefix}] ${tc.label}`);
    console.log(`Expected : ${tc.expectedVerdict}`);

    const result = await checkEconomicCorrectness(anthropic, candidate, framework);
    const match  = result.economic_correctness === tc.expectedVerdict;

    console.log(`Got      : ${result.economic_correctness} ${match ? '✓' : '✗ MISMATCH'}`);
    if (result.error_note) console.log(`Error    : ${result.error_note}`);
    console.log(`Reasoning: ${result.reasoning}`);
    console.log(`Cache    : ${result.cacheReadTokens} read tokens`);

    if (match) passed++; else failed++;
  }

  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results: ${passed} correct, ${failed} mismatch, ${skipped} skipped (not in DB)`);
}

main().catch(err => { console.error(err); process.exit(1); });
