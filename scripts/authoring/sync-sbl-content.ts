// scripts/authoring/sync-sbl-content.ts
//
// THE CONTENT SYNC: reviewed drafts → DB rows, for SBL batch A.
//
// COMMITTED under P-DB6 — it writes drill content, so it is the record of what was written and
// what was checked before it was. Default is a DRY RUN; `--apply` writes.
//
// ── WHY THIS STEP EXISTS AT ALL ───────────────────────────────────────────────────────────
// A FLIP CARRIES STATUS, NOT CONTENT. `candidate → approved → published` is an UPDATE of two
// columns; nothing in GATE-P has ever carried a reviewed draft into its row. On 2026-08-21 the
// five SBL rows were found holding the batch exactly as inserted on 2026-08-19, with every fix
// from cold reads 2, 3, 4 and 5 living only in `docs/rollbacks/*.json`. Flipping them would have
// published two known publication blockers and a live arithmetic error.
//
// This script closes that gap, and `lib/acca/reconcile-content.ts` (GATE-P's third arm) is what
// proves it closed. THE TWO SHARE `CONTENT_FIELDS`: if this wrote a field the check did not
// compare, the check would go green over unreviewed text.
//
// ── THE GUARDS ────────────────────────────────────────────────────────────────────────────
//   1. PAIRING IS THE ARM'S, NOT REIMPLEMENTED HERE. Rows and drafts are paired by
//      `reconcileContent`, so the sync can only ever write to the row the check will compare.
//      Ambiguous or unpaired → HARD STOP, nothing written.
//   2. PUBLISHED ROWS ARE REFUSED. This syncs PRE-PUBLICATION content. A published row is a
//      P-DB1..3 matter with its own ceremony, and doing it silently here is how a live drill
//      changes under a student mid-attempt.
//   3. P-DB3 SNAPSHOT FIRST. Every target row is captured whole, before any write.
//   4. ONLY THE ROWS THAT DIFFER ARE WRITTEN. A row already in sync is not touched, and is
//      then ASSERTED untouched — a no-op write still moves nothing, but proving it was never
//      issued is cheaper than proving it was harmless.
//   5. P-DB4 AFTER: every field OUTSIDE `CONTENT_FIELDS` byte-identical under a key-order-
//      insensitive canonicalisation (jsonb does not preserve key order), and every field
//      INSIDE it now equal to the draft. Both halves — "nothing else moved" is only half the
//      claim; "the intended thing actually moved" is the other.
//
// Run:  npx tsx --env-file=.env.local scripts/authoring/sync-sbl-content.ts [--apply]

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadDraft, SBL_PLAN_IDS } from './sbl-drafts';
import {
  CONTENT_FIELDS,
  canonicalise,
  reconcileContent,
  formatContentReport,
  type ContentRow,
  type ContentDraft,
} from '../../lib/acca/reconcile-content';

const APPLY = process.argv.includes('--apply');
const SNAPSHOT = join(__dirname, '..', '..', 'docs', 'rollbacks', 'SBL_content_sync_20260821.json');

const canonStr = (v: unknown) => JSON.stringify(canonicalise(v === undefined ? null : v));

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const line = (s = '') => console.log(s);

  line('='.repeat(100));
  line('  SBL BATCH A — CONTENT SYNC  (reviewed drafts → rows)');
  line(`  mode: ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}`);
  line('  A flip carries status, not content. This is the step that carries the content.');
  line('='.repeat(100));

  // ── 0. READ BOTH SIDES ──────────────────────────────────────────────────────
  const { data, error } = await supabase.from('acca_drills').select('*').eq('paper_code', 'SBL');
  if (error) throw error;
  const before = (data ?? []) as Record<string, unknown>[];

  const drafts: ContentDraft[] = SBL_PLAN_IDS.map((id) => {
    const { path, draft } = loadDraft(id);
    return { plan_id: id, lo_code: draft.lo_code, source_file: path.split(/[\\/]/).pop() ?? path, row: draft.row };
  });

  // ── 1. PAIR + DIFF, THROUGH THE ARM ─────────────────────────────────────────
  const result = reconcileContent(before as unknown as ContentRow[], drafts);
  line('\n  1. CONTENT ARM — before the sync');
  line(formatContentReport(result));

  if (result.ambiguous.length || result.draftsWithoutRow.length || result.rowsWithoutDraft.length) {
    throw new Error('HARD STOP — pairing is not 1:1 (ambiguous / unpaired). Nothing written.');
  }
  if (!result.blocked) { line('\n  Already in sync — nothing to do.\n'); return; }

  // ── 2. SHAPE GUARD ──────────────────────────────────────────────────────────
  const byId = new Map(before.map((r) => [String(r.id), r]));
  const targets = result.verdicts.filter((v) => !v.match);
  const inSync = result.verdicts.filter((v) => v.match);

  line(`\n  2. SHAPE GUARD — ${targets.length} row(s) to write, ${inSync.length} already in sync`);
  for (const v of targets) {
    const row = byId.get(v.drill_id)!;
    if (row.published === true || row.status === 'approved') {
      throw new Error(
        `HARD STOP — ${v.plan_id} (${v.drill_id.slice(0, 8)}) is status=${row.status} published=${row.published}. `
        + 'This script syncs PRE-PUBLICATION content only; a published row is a P-DB1..3 matter.',
      );
    }
    const fields = v.fields.filter((f) => !f.match).map((f) => f.field);
    line(`     ${v.plan_id}  ${v.drill_id.slice(0, 8)}  status=${row.status} published=${row.published}  fields: ${fields.join(', ')}`);
  }
  for (const v of inSync) line(`     ${v.plan_id}  ${v.drill_id.slice(0, 8)}  IN SYNC — will not be written`);

  // ── 3. P-DB3 SNAPSHOT ───────────────────────────────────────────────────────
  mkdirSync(dirname(SNAPSHOT), { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify({
    reason: 'SBL batch A content sync — reviewed drafts (cold reads 2-5) → rows. Pre-write snapshot.',
    taken_at_utc: new Date().toISOString(),
    content_fields: CONTENT_FIELDS,
    targets: targets.map((v) => ({ plan_id: v.plan_id, drill_id: v.drill_id, source_file: v.source_file })),
    rows: before,
  }, null, 2), 'utf8');
  line(`\n  3. P-DB3 SNAPSHOT — ${SNAPSHOT}`);
  line(`     ${before.length} row(s) captured whole, before any write.`);

  line('\n  4. GUARDED STATEMENTS (explicit id, never a bare predicate):');
  for (const v of targets) {
    line(`       UPDATE acca_drills SET ${CONTENT_FIELDS.join(', ')} = <draft>`);
    line(`        WHERE id = '${v.drill_id}' AND status = 'candidate' AND published = false;   -- ${v.plan_id}`);
  }

  if (!APPLY) { line('\n  DRY RUN — nothing written. Re-run with --apply.\n'); return; }

  // ── 5. THE WRITES ───────────────────────────────────────────────────────────
  line('\n  5. WRITING');
  for (const v of targets) {
    const draft = drafts.find((d) => d.plan_id === v.plan_id)!;
    const patch = Object.fromEntries(CONTENT_FIELDS.map((f) => [f, draft.row[f] ?? null]));
    const { error: upErr } = await supabase
      .from('acca_drills')
      .update(patch)
      .eq('id', v.drill_id)
      .eq('status', 'candidate')      // belt AND braces: the predicate is in the statement too
      .eq('published', false);
    if (upErr) throw upErr;
    line(`     ✓ ${v.plan_id}  ${v.drill_id.slice(0, 8)}  ${CONTENT_FIELDS.length} field(s) written`);
  }

  // ── 6. P-DB4 POST-VERIFY ────────────────────────────────────────────────────
  const { data: afterData, error: aErr } = await supabase.from('acca_drills').select('*').eq('paper_code', 'SBL');
  if (aErr) throw aErr;
  const after = (afterData ?? []) as Record<string, unknown>[];
  const afterById = new Map(after.map((r) => [String(r.id), r]));

  line('\n  6. P-DB4 POST-VERIFY');
  let bad = 0;
  const contentSet = new Set<string>(CONTENT_FIELDS);
  for (const row of before) {
    const id = String(row.id);
    const now = afterById.get(id);
    if (!now) { line(`     ✗ ${id.slice(0, 8)} vanished`); bad++; continue; }
    const wasTarget = targets.some((v) => v.drill_id === id);

    // (a) nothing outside CONTENT_FIELDS moved — on EVERY row, target or not.
    const drifted = Object.keys(row).filter((k) => !contentSet.has(k) && canonStr(row[k]) !== canonStr(now[k]));
    // (b) the intended fields actually moved to the draft's value — or, for an in-sync row,
    //     did not move at all.
    const v = result.verdicts.find((x) => x.drill_id === id)!;
    const draft = drafts.find((d) => d.plan_id === v.plan_id)!;
    const wrong = wasTarget
      ? CONTENT_FIELDS.filter((f) => canonStr(now[f]) !== canonStr(draft.row[f] ?? null))
      : CONTENT_FIELDS.filter((f) => canonStr(now[f]) !== canonStr(row[f]));

    const okRow = drifted.length === 0 && wrong.length === 0;
    if (!okRow) bad++;
    line(`     ${okRow ? '✓' : '✗'} ${v.plan_id}  ${id.slice(0, 8)}  ${wasTarget ? 'SYNCED' : 'untouched'}`
      + `  · outside CONTENT_FIELDS unchanged: ${drifted.length === 0 ? 'YES' : `NO (${drifted.join(', ')})`}`
      + `  · content ${wasTarget ? 'equals draft' : 'unmoved'}: ${wrong.length === 0 ? 'YES' : `NO (${wrong.join(', ')})`}`);
  }

  // ── 7. THE ARM AGAIN — the point of the whole exercise ──────────────────────
  const post = reconcileContent(after as unknown as ContentRow[], drafts);
  line('\n  7. CONTENT ARM — after the sync');
  line(formatContentReport(post));

  if (bad > 0 || post.blocked) {
    console.error('\n  ✗ SYNC FAILED ITS OWN CHECKS');
    process.exitCode = 1;
    return;
  }
  line('\n  ✓ P-DB4 PASS — exactly the five content fields moved, on exactly the rows that differed,');
  line('    and the content arm now reports every row holding the content that was reviewed.\n');
}

main().catch((e) => { console.error('FAILED:', (e as Error).message); process.exitCode = 1; });
