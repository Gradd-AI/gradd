// scripts/authoring/reconcile-sbl-content.ts
//
// GATE-P's CONTENT ARM, run against the live SBL rows. READ-ONLY — it opens rows and drafts and
// compares them. It never writes, so it is safe to run at any point in the lifecycle.
//
// COMMITTED, not a `scripts/_*` throwaway: this is a LIFECYCLE STEP, and a step assembled by
// hand each time is a step that drifts. The decision itself is pure and lives in
// lib/acca/reconcile-content.ts, where the fixtures pin it; this file only supplies the two
// inputs — the rows from the DB, and the drafts through the SAME resolver every other SBL tool
// uses (`loadDraft`, which returns the HIGHEST-numbered sibling, so A4 comes from
// SBL_narrative_draft_SBL-A4.2.json and not its superseded namesake). Reading the wrong sibling
// reports GREEN on a drill that no longer exists, which is why the resolver is shared and why
// the report prints the filename it read.
//
// Run:  npx tsx --env-file=.env.local scripts/authoring/reconcile-sbl-content.ts
// Exit: 0 = the rows hold the reviewed content · 1 = the flip is blocked.

import { createClient } from '@supabase/supabase-js';
import { loadDraft, SBL_PLAN_IDS } from './sbl-drafts';
import {
  CONTENT_FIELDS,
  reconcileContent,
  formatContentReport,
  type ContentRow,
  type ContentDraft,
} from '../../lib/acca/reconcile-content';

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const line = (s = '') => console.log(s);

  line('='.repeat(100));
  line('  GATE-P — CONTENT ARM  (SBL batch A)');
  line('  Compares each row\'s reviewed content against the draft that was actually reviewed.');
  line('  A FLIP CARRIES STATUS, NOT CONTENT — the status arm cannot see this.');
  line('='.repeat(100));

  const { data, error } = await supabase
    .from('acca_drills')
    .select(['id', 'lo_code', 'status', 'published', ...CONTENT_FIELDS].join(', '))
    .eq('paper_code', 'SBL');
  if (error) throw error;

  const raw = (data ?? []) as unknown as (ContentRow & { status: string; published: boolean })[];
  line(`\n  DB: ${raw.length} SBL row(s)`);
  for (const r of raw) {
    line(`     ${String(r.id).slice(0, 8)}  lo=${r.lo_code}  status=${r.status}  published=${r.published}`);
  }

  const drafts: ContentDraft[] = SBL_PLAN_IDS.map((id) => {
    const { path, draft } = loadDraft(id);
    return {
      plan_id: id,
      lo_code: draft.lo_code,
      source_file: path.split(/[\\/]/).pop() ?? path,
      row: draft.row,
    };
  });
  line(`\n  DRAFTS: ${drafts.length}, resolved through loadDraft (highest-numbered sibling wins)`);
  for (const d of drafts) line(`     ${d.plan_id}  lo=${d.lo_code}  <- ${d.source_file}`);

  line('\n  ' + '-'.repeat(96));
  const result = reconcileContent(raw, drafts);
  line(formatContentReport(result));

  if (result.blocked) {
    line('\n  WHAT THIS MEANS: the rows about to be flipped are NOT the rows that were reviewed.');
    line('  A content sync (drafts → rows, under P-DB3 snapshot + P-DB4 field-diff) must run first.');
  }
  process.exitCode = result.blocked ? 1 : 0;
}

main().catch((e) => { console.error('FAILED:', (e as Error).message); process.exitCode = 1; });
