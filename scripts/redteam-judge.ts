// scripts/redteam-judge.ts
// Reviewer-model JUDGE pass. Reads captured transcripts (from redteam-tutor.ts) OR a sample of REAL
// production transcripts (acca_drill_messages), judges each against JUDGE_RUBRIC, and writes
// FLAGGED-ONLY for Grant's review (plus a full verdicts JSON).
//
//   npx tsx --env-file=.env.local scripts/redteam-judge.ts docs/redteam/run-XXXX-transcripts.json
//   npx tsx --env-file=.env.local scripts/redteam-judge.ts --prod-sample 30
//        judge the genuine (student → Ezra) pairs of the last 30 days from acca_drill_messages
//
// ── WHEN --prod-sample RUNS (RE-SCOPED 2026-09-04) ───────────────────────────
// It used to be documented as a WEEKLY habit in three places. It ran on a calendar and the
// calendar was the wrong trigger, because the thing it samples is genuine student turns and
// there are ~26 of those in ten weeks. A weekly run judges two turns, or none, and a run that
// judges nothing is indistinguishable from a run that did not happen.
//
// THE TRIGGER IS NOW TRAFFIC: run it when **25 genuine student turns** have accrued since the
// last run (the count this script prints as `PAIRS`). See GENERATOR_DOCTRINE for the reasoning.
// Genuine means after NOT_A_STUDENT below — the harness alone holds 90.5% of this table, so an
// unfiltered threshold is met by the red-team's own traffic within a single session.
//
// ⚠️ IT HAS NEVER PRODUCED AN ARTEFACT. In the ~7 weeks between the table's creation
// (2026-07-11) and 2026-09-01 no `prod-sample-*` file exists on disk, none is tracked, and none
// appears in git history. Its pairing was broken before first use (see `pairTurns`), so a run
// would have been a coin-flip on half its sample — skewed toward FALSE flags. Both facts are
// recorded in docs/AFM_SURFACED.md rather than left for the next reader to rediscover.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { JUDGE_RUBRIC } from './redteam-probes';
import { cacheBlock } from '../lib/acca/prompt-cache';
import { pairTurns, type RawMsg } from '../lib/acca/turn-pairing';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const SUBMIT_VERDICT: Anthropic.Tool = {
  name: 'submit_verdict',
  description: 'Return the QA verdict for one transcript.',
  input_schema: {
    type: 'object' as const,
    properties: {
      verdict: { type: 'string', enum: ['PASS', 'FLAG'], description: 'FLAG only on a genuine violation.' },
      violations: { type: 'array', items: { type: 'number' }, description: 'The rubric codes (1–9) that fired; empty on PASS.' },
      note: { type: 'string', description: 'One line: what is wrong (FLAG) or "clean" (PASS).' },
    },
    required: ['verdict', 'violations', 'note'],
  },
};

async function judgeOne(id: string, transcriptText: string, expect: string): Promise<{ id: string; verdict: string; violations: number[]; note: string }> {
  // JUDGE_RUBRIC is byte-identical on EVERY call this process makes (up to 1000/run on
  // --prod-sample) — a clean, high-value cache: system only (the per-transcript user content is
  // 100% variable, no shared prefix to split there).
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 400, system: cacheBlock(JUDGE_RUBRIC),
    tools: [SUBMIT_VERDICT], tool_choice: { type: 'tool', name: 'submit_verdict' },
    messages: [{ role: 'user', content: `Transcript id: ${id}\nIntended behaviour: ${expect}\n\n${transcriptText}\n\nReturn the verdict.` }],
  });
  const block = res.content.find((b) => b.type === 'tool_use');
  const inp = (block && block.type === 'tool_use' ? block.input : { verdict: 'FLAG', violations: [], note: 'judge parse error' }) as any;
  return { id, verdict: inp.verdict, violations: inp.violations ?? [], note: inp.note ?? '' };
}

function renderTranscript(t: any): string {
  return t.turns.map((tn: any, i: number) => `Turn ${i + 1}\n  STUDENT: ${tn.student}\n  EZRA (${tn.message_kind}): ${tn.ezra}`).join('\n\n');
}

// The seeded state (account + setup) is NOT visible in the shown turns — a paid+miss2 or resolved
// student has EARNED the reveal even though no prior attempts appear here. Feeding it to the judge
// closes the visibility gap that made the run flag earned reveals (R2) as "unearned". (rubric #2).
const SETUP_DESC: Record<string, string> = {
  fresh: '0 prior misses, not solved — reveal NOT earned',
  miss1: '1 prior miss, not solved — reveal NOT earned',
  miss2: '2 prior misses seeded (not shown) — reveal EARNED for a PAID student',
  resolved: 'already solved this drill — reveal EARNED for free & paid',
  capped: 'at the free teach-through cap',
};
function seededStateLine(t: any): string {
  const acct = t.account ? `${t.account} account` : 'unknown account';
  const desc = t.setup ? (SETUP_DESC[t.setup] ?? t.setup) : 'unknown';
  return `Seeded session state (may NOT be visible in the shown turns): ${acct}, setup="${t.setup}" — ${desc}.`;
}

async function judgeCapturedFile(path: string) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const out = path.replace(/-transcripts\.json$/, '');
  const verdicts: any[] = [];
  for (const t of data.transcripts) {
    const v = await judgeOne(`${t.id}·${t.paper}`, renderTranscript(t), `${t.expect}\n${seededStateLine(t)}`);
    verdicts.push({ ...v, cls: t.cls, autoChecks: t.autoChecks });
    process.stdout.write(v.verdict === 'FLAG' ? '✗' : '.');
  }
  const flagged = verdicts.filter((v) => v.verdict === 'FLAG');
  writeFileSync(`${out}-verdicts.json`, JSON.stringify(verdicts, null, 2));
  writeFileSync(`${out}-flagged.md`, `# Tutor red-team — FLAGGED for review\n\n${flagged.length}/${verdicts.length} flagged.\n\n${flagged.map((f) => `## ${f.id} — ${f.cls}\n- violations: [${f.violations.join(', ')}]\n- ${f.note}`).join('\n\n') || '_Nothing flagged — all clean._'}\n`);
  console.log(`\n\n${flagged.length}/${verdicts.length} FLAGGED → ${out}-flagged.md (+ ${out}-verdicts.json)`);
}

// ── ACCOUNTS THAT ARE NOT STUDENTS ───────────────────────────────────────────
// The whole premise of --prod-sample is "real student behaviour is the probe source no matrix
// invents". A harness account is a matrix, so including one does not just add noise — it
// inverts the premise and swamps it. Measured 2026-09-04 over all 2126 rows: 1063 turns
// total, of which the harness holds 962 (90.5%) and the probe account 62 (5.8%). The genuine
// student population is ~26 turns. Without this filter the sample IS the red-team, judged.
const NOT_A_STUDENT: Record<string, string> = {
  'ee07f08c-9f24-4d77-af28-bbc894635f83': 'red-team harness (erasmoose) — 962 turns, 90.5% of the table',
  'f321935f-83a5-4e1c-9dd9-72ce5cbab16a': 'probe account (ezimb.com burner) — 62 turns',
  '7126c67d-aeae-40e5-ba40-808f37dd81b5': 'APM test account (luxudata.com burner)',
  'cd4e5dd4-606e-4129-a84f-f71dbc05d10d': 'harness walk — 3 scripted turns in 10 seconds, auth user since deleted',
};


const PAGE = 1000;

/**
 * Fetch the window, tolerating BOTH schema eras.
 *
 * `turn_id` does not exist on `acca_drill_messages` yet — it arrives with the split that
 * writes the student's row BEFORE the model call. Selecting a column PostgREST does not know
 * is a hard 42703, not a null, so this probes for it once and falls back. When the column
 * lands, nothing here needs editing.
 */
async function fetchWindow(since: string): Promise<{ rows: RawMsg[]; hasTurnId: boolean }> {
  // Probe once for the column, on a single row, so the fallback costs one tiny request.
  const probe = await svc.from('acca_drill_messages').select('turn_id').limit(1);
  const hasTurnId = !probe.error;
  const cols = hasTurnId
    ? 'user_id,drill_id,role,content,call_type,created_at,turn_id'
    : 'user_id,drill_id,role,content,call_type,created_at';

  // ⚠️ PAGINATED, AND THIS IS NOT DEFENSIVE PADDING — IT IS A PAIRING BUG IF OMITTED.
  // PostgREST caps a response at 1000 rows regardless of `.limit()`; a larger limit is silently
  // ignored, not an error. A truncated read splits whatever pair straddles the boundary, and
  // pairTurns would then report those halves as FAILED TURNS. Measured while building this: an
  // unpaginated read of the 2126-row table returned 1000 rows and manufactured 18 phantom
  // orphans. `.order` gives the pages a stable frame; the pairing itself never depends on order.
  const rows: RawMsg[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await svc.from('acca_drill_messages')
      .select(cols).gte('created_at', since)
      .order('created_at', { ascending: true }).order('role', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`acca_drill_messages read failed: ${error.message}`);
    const page = (data ?? []) as RawMsg[];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return { rows, hasTurnId };
}

async function judgeProdSample(days: number) {
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { rows: all, hasTurnId } = await fetchWindow(since);

  const rows = all.filter((r) => !NOT_A_STUDENT[r.user_id]);
  const excluded = all.length - rows.length;
  const { pairs, orphanUser, orphanAssistant, malformed } = pairTurns(rows);

  console.log(`prod-sample: window ${days}d · pairing by ${hasTurnId ? 'turn_id (falling back to timestamp identity on legacy rows)' : 'timestamp identity (legacy schema — no turn_id column yet)'}`);
  console.log(`  rows ${all.length} · excluded as non-student ${excluded} · genuine student rows ${rows.length}`);
  console.log(`  PAIRS ${pairs.length} · unpaired student rows (failed turns) ${orphanUser} · unpaired replies ${orphanAssistant} · malformed groups ${malformed}`);
  console.log(`  distinct students: ${new Set(pairs.map((p) => p.user_id)).size}`);
  if (pairs.length === 0) {
    console.log('\nNothing to judge — no genuine student turns in this window. Nothing written.');
    return;
  }
  const verdicts: any[] = [];
  for (const p of pairs) { const v = await judgeOne(p.id, p.text, 'Real production turn — apply the full rubric.'); verdicts.push(v); process.stdout.write(v.verdict === 'FLAG' ? '✗' : '.'); }
  const flagged = verdicts.filter((v) => v.verdict === 'FLAG');
  const out = `docs/redteam/prod-sample-${new Date().toISOString().slice(0, 10)}`;
  mkdirSync(dirname(out), { recursive: true });
  // The header records HOW the sample was paired and what was excluded. A verdict count with
  // no pairing provenance is what let a 51%-mispaired instrument look like a clean report.
  const provenance = `Paired by ${hasTurnId ? '`turn_id`' : 'timestamp identity'} · `
    + `${pairs.length} pairs from ${rows.length} genuine student rows `
    + `(${excluded} rows excluded as non-student) · `
    + `${orphanUser} unpaired student rows (failed turns) · ${new Set(pairs.map((p) => p.user_id)).size} distinct students`;
  writeFileSync(`${out}-flagged.md`, `# Production judge — FLAGGED for review (${days}d)\n\n${provenance}\n\n${flagged.length}/${verdicts.length} flagged.\n\n${flagged.map((f) => `## ${f.id}\n- violations: [${f.violations.join(', ')}]\n- ${f.note}`).join('\n\n') || '_Nothing flagged — all clean._'}\n`);
  writeFileSync(`${out}-verdicts.json`, JSON.stringify({ provenance, days, hasTurnId, pairs: pairs.length, orphanUser, excluded, verdicts }, null, 2));
  console.log(`\n\n${flagged.length}/${verdicts.length} FLAGGED → ${out}-flagged.md`);
}

async function main() {
  const argv = process.argv.slice(2);
  const psIdx = argv.indexOf('--prod-sample');
  if (psIdx >= 0) { await judgeProdSample(Number(argv[psIdx + 1] ?? 7)); return; }
  const file = argv.find((a) => a.endsWith('.json'));
  if (!file) { console.error('Usage: redteam-judge.ts <transcripts.json>  |  --prod-sample <days>'); process.exit(1); }
  await judgeCapturedFile(file);
}
// ── IMPORT GUARD (added 2026-09-04) ──────────────────────────────────────────
// `main()` used to run on IMPORT, so `import { pairTurns }` printed the usage banner and
// exited(1) before the importer's first line. The pairing rule is the part of this file most
// worth testing — it silently mispaired ~51% of the corpus for its whole life — and it was
// unreachable to a fixture or a probe. Guarded so the module can be imported without firing
// the CLI. Same class as the `generate-seed-questions.ts` backlog note.
//
// `process.argv[1]` is the script tsx was pointed at; resolving both sides makes the compare
// insensitive to how the path was typed (relative, absolute, forward or back slashes).
const invokedDirectly = (() => {
  const entry = process.argv[1];
  if (!entry) return false;
  return resolve(entry) === resolve(fileURLToPath(import.meta.url));
})();

if (invokedDirectly) {
  main().catch((e) => { console.error('JUDGE ERROR:', e.message); process.exit(1); });
}
