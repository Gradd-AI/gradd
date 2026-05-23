#!/usr/bin/env tsx
/**
 * Manual regression test for fetch_exam_questions_tiered RPC.
 *
 * Run before shipping any new subject's seed library:
 *   npx tsx --env-file=.env.local scripts/test-exam-questions.ts
 *
 * Tests three tier paths against live Supabase:
 *   Case A — full Tier 1 hit (lesson with 3+ seed questions)
 *   Case B — partial Tier 1, Tier 2 fallback (lesson with 1-2 seed questions)
 *   Case C — Tier 3 unit-wide fallback (lesson with 0 seed questions)
 *
 * Expected tier outputs: 1,1,2 / 1,2,2 / 3,3,3
 *
 * Test cases currently target IB Economics. Update lessonCode + subject for IB BM, IGCSE, ACCA etc.
 */

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
);

type ExamQuestion = {
  id: string;
  question_text: string;
  context_text: string | null;
  paper: string;
  command_term: string;
  marks: number;
  ao_level: string | null;
  level: string;
  tier: number;
};

function formatContext(questions: ExamQuestion[]): string {
  if (questions.length === 0) return '(no questions returned)';
  return questions
    .map((q, i) => {
      const ao  = q.ao_level ? ` (${q.ao_level})` : '';
      const ctx = q.context_text ? `${q.context_text}\n` : '';
      return `EXAMPLE ${i + 1} — Paper ${q.paper}, ${q.marks} marks, "${q.command_term}"${ao}\n${ctx}${q.question_text}`;
    })
    .join('\n---\n');
}

async function run() {
  const cases = [
    { lessonCode: 'IB_ECON_007', examLevel: 'HL', subject: 'IB_ECONOMICS' },
    { lessonCode: 'IB_ECON_055', examLevel: 'SL', subject: 'IB_ECONOMICS' },
    { lessonCode: 'IB_ECON_002', examLevel: 'SL', subject: 'IB_ECONOMICS' },
  ];

  for (const tc of cases) {
    const levels = tc.examLevel === 'HL' ? ['SL', 'HL'] : ['SL'];

    const { data, error } = await supabase.rpc('fetch_exam_questions_tiered', {
      p_lesson_code: tc.lessonCode,
      p_subject:     tc.subject,
      p_levels:      levels,
      p_unit_code:   null,
    });

    console.log(`\n${'='.repeat(70)}`);
    console.log(`TEST CASE: ${tc.lessonCode} | ${tc.examLevel} | ${tc.subject}`);
    console.log(`levels filter: [${levels.join(', ')}]`);
    console.log('='.repeat(70));

    if (error) {
      console.error('RPC error:', error.message);
      continue;
    }

    const questions = (data ?? []) as ExamQuestion[];
    console.log(`returned ${questions.length} question(s)`);
    if (questions.length > 0) {
      console.log('tiers:', questions.map(q => q.tier).join(', '));
    }
    console.log('\n--- FORMATTED EXAM_QUESTIONS_CONTEXT ---\n');
    console.log(formatContext(questions));
    console.log('\n--- END ---');
  }
}

run().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
