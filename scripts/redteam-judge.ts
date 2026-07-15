// scripts/redteam-judge.ts
// Reviewer-model JUDGE pass. Reads captured transcripts (from redteam-tutor.ts) OR a sample of REAL
// production transcripts (acca_drill_messages), judges each against JUDGE_RUBRIC, and writes
// FLAGGED-ONLY for Grant's review (plus a full verdicts JSON).
//
//   npx tsx --env-file=.env.local scripts/redteam-judge.ts docs/redteam/run-XXXX-transcripts.json
//   npx tsx --env-file=.env.local scripts/redteam-judge.ts --prod-sample 7        # STANDING WEEKLY HABIT:
//        judge the last 7 days of real (student → Ezra) pairs from acca_drill_messages
//
// STANDING HABIT (GENERATOR_DOCTRINE): run the --prod-sample pass WEEKLY. Real student behaviour is
// the probe source no matrix invents — the manufactured matrix is the floor, production is the well.
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { JUDGE_RUBRIC } from './redteam-probes';

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
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6', max_tokens: 400, system: JUDGE_RUBRIC,
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

async function judgeCapturedFile(path: string) {
  const data = JSON.parse(readFileSync(path, 'utf8'));
  const out = path.replace(/-transcripts\.json$/, '');
  const verdicts: any[] = [];
  for (const t of data.transcripts) {
    const v = await judgeOne(`${t.id}·${t.paper}`, renderTranscript(t), t.expect);
    verdicts.push({ ...v, cls: t.cls, autoChecks: t.autoChecks });
    process.stdout.write(v.verdict === 'FLAG' ? '✗' : '.');
  }
  const flagged = verdicts.filter((v) => v.verdict === 'FLAG');
  writeFileSync(`${out}-verdicts.json`, JSON.stringify(verdicts, null, 2));
  writeFileSync(`${out}-flagged.md`, `# Tutor red-team — FLAGGED for review\n\n${flagged.length}/${verdicts.length} flagged.\n\n${flagged.map((f) => `## ${f.id} — ${f.cls}\n- violations: [${f.violations.join(', ')}]\n- ${f.note}`).join('\n\n') || '_Nothing flagged — all clean._'}\n`);
  console.log(`\n\n${flagged.length}/${verdicts.length} FLAGGED → ${out}-flagged.md (+ ${out}-verdicts.json)`);
}

async function judgeProdSample(days: number) {
  // Pull recent assistant messages + their preceding student message (same user+drill).
  const since = new Date(Date.now() - days * 864e5).toISOString();
  const { data: msgs } = await svc.from('acca_drill_messages').select('user_id,drill_id,role,content,call_type,created_at').gte('created_at', since).order('created_at', { ascending: true }).limit(1000);
  const rows = (msgs ?? []) as any[];
  const pairs: { id: string; text: string }[] = [];
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i]; if (a.role !== 'assistant') continue;
    const prevUser = [...rows.slice(0, i)].reverse().find((r) => r.role === 'user' && r.user_id === a.user_id && r.drill_id === a.drill_id);
    if (!prevUser) continue;
    pairs.push({ id: `${a.drill_id?.slice(0, 8)}·${a.call_type}·${a.created_at.slice(0, 10)}`, text: `STUDENT: ${prevUser.content}\n\nEZRA (${a.call_type}): ${a.content}` });
  }
  console.log(`prod-sample: ${pairs.length} real (student → Ezra) pairs in the last ${days} days`);
  const verdicts: any[] = [];
  for (const p of pairs) { const v = await judgeOne(p.id, p.text, 'Real production turn — apply the full rubric.'); verdicts.push(v); process.stdout.write(v.verdict === 'FLAG' ? '✗' : '.'); }
  const flagged = verdicts.filter((v) => v.verdict === 'FLAG');
  const out = `docs/redteam/prod-sample-${new Date().toISOString().slice(0, 10)}`;
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(`${out}-flagged.md`, `# Weekly production judge — FLAGGED for review (${days}d)\n\n${flagged.length}/${verdicts.length} flagged.\n\n${flagged.map((f) => `## ${f.id}\n- violations: [${f.violations.join(', ')}]\n- ${f.note}`).join('\n\n') || '_Nothing flagged — all clean._'}\n`);
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
main().catch((e) => { console.error('JUDGE ERROR:', e.message); process.exit(1); });
