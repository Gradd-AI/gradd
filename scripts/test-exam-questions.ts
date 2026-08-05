#!/usr/bin/env tsx
/**
 * Regression test for the fetch_exam_questions_tiered RPC.
 *
 * Run before shipping any new subject's seed library:
 *   npm run test:exam-questions
 *
 * DB-GATED — excluded from the contract gate (scripts/run-contracts.ts) because the tier
 * logic under test lives in SQL, not TypeScript: the CASE WHEN in
 * supabase/migrations/20260612000000_*.sql. There is nothing to import and nothing to mock
 * that would not be a reimplementation of the thing being tested.
 *
 * Three tier paths, asserted against live Supabase:
 *   Case A — full Tier 1 hit (lesson with 3+ seed questions)   expect 1,1,2
 *   Case B — partial Tier 1, Tier 2 fallback                   expect 1,2,2
 *   Case C — Tier 3 unit-wide fallback (0 seed questions)      expect 3,3,3
 *
 * ⚠️ THE EXPECTED SEQUENCES ARE FACTS ABOUT THE SEED CORPUS, NOT ABOUT THE FUNCTION.
 * The RPC ends `ORDER BY tier ASC, RANDOM() LIMIT 3`, so the sequence is decided by how many
 * seed rows each tier holds for that lesson. Add a third Tier-1 question to IB_ECON_007 and
 * Case A legitimately becomes 1,1,1. A CORPUS failure below therefore means "confirm which
 * changed" — it is not by itself evidence the RPC regressed. The STRUCTURE checks (ordering,
 * tier range, row count) hold whatever the corpus does, and those ARE evidence.
 *
 * ⚠️ formatContext() below is a HUMAN PREVIEW, not production's formatter. Production is
 * fetchExamQuestionsContext (lib/system-prompt.ts:215) and it additionally injects mark
 * schemes ([[SCHEME_INJECTED]]) from the scheme_data / scheme_type columns the 2026-06-12
 * migration added. This preview predates that and renders neither. Do not read its output as
 * proof of what Mia receives.
 *
 * Modes:
 *   (no flag)         probe the live DB and assert          — needs .env.local
 *   --prove-failure   probe live with DELIBERATELY WRONG expectations; MUST report red (P-G3)
 *   --self-test       run every check against synthetic payloads — pure, no DB, no env (P-G3)
 */

import { createClient } from '@supabase/supabase-js';

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

type CaseSpec = {
  name: string;
  lessonCode: string;
  examLevel: string;
  subject: string;
  expectedTiers: number[];
};

/** What the RPC call returned. Modelled explicitly so the error path is testable. */
type RpcResult = { error: string | null; rows: ExamQuestion[] | null };

const CASES: CaseSpec[] = [
  { name: 'A — full Tier 1 hit',      lessonCode: 'IB_ECON_007', examLevel: 'HL', subject: 'IB_ECONOMICS', expectedTiers: [1, 1, 2] },
  { name: 'B — Tier 2 fallback',      lessonCode: 'IB_ECON_055', examLevel: 'SL', subject: 'IB_ECONOMICS', expectedTiers: [1, 2, 2] },
  { name: 'C — Tier 3 unit-wide',     lessonCode: 'IB_ECON_002', examLevel: 'SL', subject: 'IB_ECONOMICS', expectedTiers: [3, 3, 3] },
];

/** Mirrors production's rule at lib/system-prompt.ts:202. HL sees SL material too. */
function levelsFor(examLevel: string): string[] {
  return examLevel === 'HL' ? ['SL', 'HL'] : ['SL'];
}

/**
 * Every assertion, in one pure function. Returns a list of failures — empty means pass.
 * Kept free of I/O so --self-test can drive it through every failure path without a database.
 */
function checkCase(spec: CaseSpec, result: RpcResult): string[] {
  const fail: string[] = [];

  // The old version console.error'd this and continued, so a dead RPC reported success.
  if (result.error !== null) {
    fail.push(`RPC ERROR: ${result.error}`);
    return fail;
  }
  if (result.rows === null) {
    fail.push('RPC returned no data and no error');
    return fail;
  }

  const rows  = result.rows;
  const tiers = rows.map(q => q.tier);

  // STRUCTURE — true whatever the seed corpus holds.
  if (rows.length !== 3) {
    fail.push(`STRUCTURE: expected 3 questions (the RPC's LIMIT 3), got ${rows.length}`);
  }
  for (const [i, t] of tiers.entries()) {
    if (!Number.isInteger(t) || t < 1 || t > 4) {
      fail.push(`STRUCTURE: row ${i + 1} has tier ${t}, outside the CASE WHEN's 1-4`);
    }
  }
  for (let i = 1; i < tiers.length; i++) {
    if (tiers[i] < tiers[i - 1]) {
      fail.push(`STRUCTURE: tiers not ascending (${tiers.join(', ')}) — ORDER BY tier ASC is broken`);
      break;
    }
  }
  for (const [i, q] of rows.entries()) {
    if (!q.question_text || q.question_text.trim() === '') {
      fail.push(`STRUCTURE: row ${i + 1} has empty question_text — unusable as context`);
    }
  }

  // CORPUS — the documented sequence for these three lessons. See the header warning.
  if (tiers.join(',') !== spec.expectedTiers.join(',')) {
    fail.push(
      `CORPUS: expected tiers ${spec.expectedTiers.join(', ')}, got ${tiers.join(', ') || '(none)'}`
      + ' — either the RPC regressed or the seed corpus for this lesson changed; check which'
    );
  }

  return fail;
}

/** Human preview only. NOT production's formatter — see the header. */
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

async function probeLive(proveFailure: boolean): Promise<number> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  if (proveFailure) {
    console.log('\n⚠️  --prove-failure: every expected tier shifted by +1. This run MUST report red.\n');
  }

  let failed = 0;

  for (const base of CASES) {
    const spec: CaseSpec = proveFailure
      ? { ...base, expectedTiers: base.expectedTiers.map(t => t + 1) }
      : base;

    const levels = levelsFor(spec.examLevel);

    const { data, error } = await supabase.rpc('fetch_exam_questions_tiered', {
      p_lesson_code: spec.lessonCode,
      p_subject:     spec.subject,
      p_levels:      levels,
      p_unit_code:   null,
    });

    const result: RpcResult = {
      error: error ? error.message : null,
      rows:  error ? null : ((data ?? []) as ExamQuestion[]),
    };

    console.log(`\n${'='.repeat(70)}`);
    console.log(`CASE ${spec.name}: ${spec.lessonCode} | ${spec.examLevel} | ${spec.subject}`);
    console.log(`levels filter: [${levels.join(', ')}]   expecting tiers: ${spec.expectedTiers.join(', ')}`);
    console.log('='.repeat(70));

    const rows = result.rows ?? [];
    console.log(`returned ${rows.length} question(s)`);
    if (rows.length > 0) console.log('tiers:', rows.map(q => q.tier).join(', '));

    const failures = checkCase(spec, result);
    if (failures.length === 0) {
      console.log('  PASS');
    } else {
      failed++;
      for (const f of failures) console.log(`  FAIL  ${f}`);
    }

    console.log('\n--- PREVIEW (not production\'s formatter — no mark schemes) ---\n');
    console.log(formatContext(rows));
    console.log('\n--- END ---');
  }

  console.log(`\n${'─'.repeat(70)}`);
  if (proveFailure) {
    // Inverted: red is the pass condition here.
    if (failed === CASES.length) {
      console.log(`P-G3 PROOF: all ${failed}/${CASES.length} cases went red against wrong expectations, as required.`);
      return 0;
    }
    console.log(`P-G3 PROOF FAILED: only ${failed}/${CASES.length} cases went red — the assertions do not bite.`);
    return 1;
  }
  console.log(failed === 0
    ? `PASS exam-questions: ${CASES.length}/${CASES.length} tier paths`
    : `FAIL exam-questions: ${failed}/${CASES.length} case(s) failed`);
  return failed === 0 ? 0 : 1;
}

/** P-G3 — drive every check through its failure path. Pure: no DB, no env, no network. */
function selfTest(): number {
  const q = (tier: number, text = 'Explain something.'): ExamQuestion => ({
    id: '00000000-0000-0000-0000-000000000000',
    question_text: text,
    context_text: null,
    paper: 'P1',
    command_term: 'explain',
    marks: 10,
    ao_level: 'AO2',
    level: 'SL',
    tier,
  });
  const spec: CaseSpec = { name: 'self', lessonCode: 'X', examLevel: 'SL', subject: 'S', expectedTiers: [1, 1, 2] };

  const cases: { name: string; result: RpcResult; expectFragment: string | null }[] = [
    { name: 'happy path — matches expectation', result: { error: null, rows: [q(1), q(1), q(2)] }, expectFragment: null },
    { name: 'RPC error is a failure, not a log', result: { error: 'permission denied', rows: null }, expectFragment: 'RPC ERROR' },
    { name: 'null data with no error',           result: { error: null, rows: null },               expectFragment: 'no data and no error' },
    { name: 'wrong tier sequence',               result: { error: null, rows: [q(1), q(2), q(2)] }, expectFragment: 'CORPUS' },
    { name: 'too few rows',                      result: { error: null, rows: [q(1), q(1)] },       expectFragment: 'expected 3 questions' },
    { name: 'zero rows',                         result: { error: null, rows: [] },                 expectFragment: 'expected 3 questions' },
    { name: 'tier out of range',                 result: { error: null, rows: [q(1), q(1), q(9)] }, expectFragment: 'outside the CASE WHEN' },
    { name: 'tiers not ascending',               result: { error: null, rows: [q(2), q(1), q(1)] }, expectFragment: 'not ascending' },
    { name: 'empty question_text',               result: { error: null, rows: [q(1), q(1), q(2, '  ')] }, expectFragment: 'empty question_text' },
  ];

  let failed = 0;
  for (const c of cases) {
    const failures = checkCase(spec, c.result);
    const joined   = failures.join(' | ');
    const ok = c.expectFragment === null
      ? failures.length === 0
      : failures.some(f => f.includes(c.expectFragment!));
    if (ok) {
      console.log(`  ok   ${c.name}`);
    } else {
      failed++;
      console.log(`  FAIL ${c.name}`);
      console.log(`       expected ${c.expectFragment === null ? 'no failures' : `a failure containing "${c.expectFragment}"`}`);
      console.log(`       got: ${joined || '(none)'}`);
    }
  }

  console.log(`\n${failed === 0 ? 'PASS' : 'FAIL'} exam-questions self-test: ${cases.length - failed}/${cases.length} checks`);
  return failed === 0 ? 0 : 1;
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes('--self-test')) {
    process.exitCode = selfTest();
    return;
  }
  process.exitCode = await probeLive(args.includes('--prove-failure'));
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exitCode = 1;
});
