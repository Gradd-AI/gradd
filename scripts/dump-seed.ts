#!/usr/bin/env tsx
/**
 * dump-seed.ts
 *
 * Dumps approved seed questions from Supabase into a deterministic SQL file
 * suitable for version control and database restore.
 *
 * Usage:
 *   npm run dump-seed -- --subject IB_ECONOMICS
 *
 * Output: seed/<SUBJECT>_questions.sql
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

// Env vars loaded by tsx --env-file=.env.local in the npm script.

// ─────────────────────────────────────────────────────────────────────────────
// SQL value escaper — handles all Postgres literal types
// ─────────────────────────────────────────────────────────────────────────────

function sqlVal(v: unknown): string {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' || typeof v === 'boolean') return String(v);
  if (typeof v === 'string') return `'${v.replace(/'/g, "''")}'`;
  // Arrays (e.g. examiner_traps text[])
  if (Array.isArray(v)) {
    if (v.length === 0) return "'{}'";
    const els = v.map(el => `"${String(el).replace(/"/g, '\\"')}"`).join(',');
    return `'{${els}}'`;
  }
  // Objects / JSONB
  if (typeof v === 'object') {
    const json = JSON.stringify(v).replace(/'/g, "''");
    return `'${json}'`;
  }
  return `'${String(v).replace(/'/g, "''")}'`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

const COLUMNS = [
  'id', 'subject', 'level', 'topic_code', 'paper', 'question_type',
  'command_term', 'marks', 'ao_level', 'difficulty',
  'question_text', 'context_text',
  'mcq_options', 'correct_option', 'model_answer_outline', 'examiner_traps',
  'status', 'created_by', 'approved_by', 'approved_at',
  'source', 'verified_against_guide_version', 'verification_status',
] as const;

async function main() {
  const argv    = process.argv.slice(2);
  const subject = argv[argv.indexOf('--subject') + 1];

  if (!subject) {
    console.error('Error: --subject is required (e.g. --subject IB_ECONOMICS)');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  console.log(`Querying seed questions for ${subject}…`);

  const { data, error } = await supabase
    .from('questions')
    .select(COLUMNS.join(','))
    .eq('subject', subject)
    .eq('status', 'seed')
    .order('paper')
    .order('question_type')
    .order('marks')
    .order('topic_code');

  if (error) { console.error('DB error:', error.message); process.exit(1); }
  if (!data?.length) { console.error(`No seed questions found for ${subject}`); process.exit(1); }

  const count     = data.length;
  const generated = new Date().toISOString();
  const outDir    = join(process.cwd(), 'seed');
  const outPath   = join(outDir, `${subject}_questions.sql`);

  mkdirSync(outDir, { recursive: true });

  // ── Build SQL ──────────────────────────────────────────────────────────────

  const header = [
    `-- Auto-generated from Supabase. Do not edit manually.`,
    `-- Subject: ${subject}`,
    `-- Generated: ${generated}`,
    `-- Question count: ${count}`,
    ``,
  ].join('\n');

  const colList = COLUMNS.join(', ');

  const valueRows = data.map(row => {
    const vals = COLUMNS.map(col => sqlVal((row as Record<string, unknown>)[col]));
    return `  (${vals.join(', ')})`;
  });

  const insertBlock =
    `INSERT INTO questions (${colList})\nVALUES\n` +
    valueRows.join(',\n') +
    `\nON CONFLICT (id) DO NOTHING;\n`;

  writeFileSync(outPath, header + insertBlock, 'utf-8');

  console.log(`\nWrote ${count} seed rows → ${outPath}`);
  console.log(`Lines: ${(header + insertBlock).split('\n').length}`);
  console.log(`\nFirst INSERT (row 1):`);
  console.log(' ', valueRows[0].slice(0, 120) + '…');
  console.log(`\nLast INSERT (row ${count}):`);
  console.log(' ', valueRows[count - 1].slice(0, 120) + '…');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
