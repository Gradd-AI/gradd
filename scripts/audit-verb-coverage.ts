// scripts/audit-verb-coverage.ts — DOES EVERY LIVE DRILL'S COMMAND VERB RESOLVE?
//
// Run: npx tsx --env-file=.env.local scripts/audit-verb-coverage.ts
//      (or `npm run audit:verb-coverage`)
//
// WHY THIS EXISTS. `lib/acca/teach-demand.ts` translates (command_verb, intellectual_level) into
// the plain-English demand every teaching leg calibrates against. If a verb is not in its table
// the function returns a fallback shrug — "What the requirement asks for is stated in the
// requirement itself" — and the teaching leg is handed nothing.
//
// That hole was INVISIBLE for two months because the fixture suite asserted over the TABLE
// (`REGISTERED_VERBS`) rather than over the CORPUS. A table is trivially complete over itself.
// Measured on 2026-08-03: 68 of 154 live drills carried a verb the table could not resolve, and
// 64 of those 68 were level 3 — the drills where the demand matters most, because the compound
// verb ("calculate AND evaluate") is precisely the second-part demand a struggling candidate is
// failing to reach.
//
// This script is the standing measurement. The pure fixture in scripts/test-teach-demand.ts
// asserts the same property against a COMMITTED SNAPSHOT of the corpus so it can run without a
// database; this script is what proves the snapshot still matches live. Run it after authoring a
// batch — a new verb spelling shows up here as a FAIL rather than as silence.
//
// Read-only. Selects three columns and writes nothing.

import { createClient } from '@supabase/supabase-js';
import { verbResolves, describeDemand } from '../lib/acca/teach-demand';

// P-G4: set `process.exitCode`, never call `process.exit()` — an explicit exit tears the process
// down while the Supabase client's handles are still open, which on Windows surfaces as a libuv
// assertion AFTER a clean run and reads as a failure when the audit actually passed.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

interface Row {
  command_verb: string | null;
  intellectual_level: number | null;
  paper_code: string | null;
  status: string | null;
  published: boolean | null;
}

async function main(): Promise<void> {
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — run with --env-file=.env.local');
    process.exitCode = 1;
    return;
  }
  const sb = createClient(url, key);
  const { data, error } = await sb
    .from('acca_drills')
    .select('command_verb, intellectual_level, paper_code, status, published');

  if (error) {
    console.error('query failed:', error.message);
    process.exitCode = 1;
    return;
  }

  // The SERVED set only. An unpublished draft's verb is not yet a teaching problem.
  const live = ((data ?? []) as Row[]).filter((d) => d.status === 'approved' && d.published === true);

  const counts = new Map<string, { n: number; levels: Set<number> }>();
  for (const d of live) {
    const v = (d.command_verb ?? '').trim().toLowerCase();
    const e = counts.get(v) ?? { n: 0, levels: new Set<number>() };
    e.n++;
    if (typeof d.intellectual_level === 'number') e.levels.add(d.intellectual_level);
    counts.set(v, e);
  }

  const unresolved: Array<{ verb: string; n: number; levels: number[] }> = [];
  let drillsResolved = 0;
  for (const [verb, e] of counts) {
    if (verbResolves(verb)) drillsResolved += e.n;
    else unresolved.push({ verb, n: e.n, levels: [...e.levels].sort() });
  }
  unresolved.sort((a, b) => b.n - a.n);

  const drillsTotal = live.length;
  const pct = (n: number) => (drillsTotal === 0 ? '0.0' : ((n / drillsTotal) * 100).toFixed(1));

  console.log('\n── command-verb coverage, LIVE corpus (approved + published) ──\n');
  console.log(`  drills               ${drillsTotal}`);
  console.log(`  distinct verbs       ${counts.size}`);
  console.log(`  drills RESOLVED      ${drillsResolved}  (${pct(drillsResolved)}%)`);
  console.log(`  drills UNRESOLVED    ${drillsTotal - drillsResolved}  (${pct(drillsTotal - drillsResolved)}%)`);

  if (unresolved.length > 0) {
    console.log('\n  UNRESOLVED verbs — each falls through to the fallback shrug:\n');
    for (const u of unresolved) {
      console.log(`    ${String(u.n).padStart(3)}  ${u.verb}  (level${u.levels.length === 1 ? '' : 's'} ${u.levels.join('/') || '—'})`);
    }
    console.log('\n  FIX: add the missing single verb(s) to VERB_DEMAND in lib/acca/teach-demand.ts.');
    console.log('       Compounds resolve automatically once every PART is registered.');
    console.log('       Then update LIVE_CORPUS_VERBS in scripts/test-teach-demand.ts.\n');
  } else {
    console.log('\n  Every live drill resolves to a real demand. No fallback shrugs served.\n');
  }

  // A worked sample, so a reader can see what the corpus actually gets rather than trusting a count.
  const sample = [...counts.keys()].filter((v) => v.includes('and')).sort()[0];
  if (sample) {
    console.log(`  sample — "${sample}" at level 3:\n    ${describeDemand(sample, 3)}\n`);
  }

  process.exitCode = unresolved.length === 0 ? 0 : 1;
}

void main();
