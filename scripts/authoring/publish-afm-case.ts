// scripts/authoring/publish-afm-case.ts
//
// GATE-P PUBLISH FLIP for a standalone AFM practice case: status → 'approved', published → true.
// Parameterised by case id, because four more cases follow Kestrel and a hand-written flip per
// case is how an un-reviewed row eventually slips through.
//
// COMMITTED under P-DB6 — it writes published content, so it is the record of what was flipped
// and what was checked before it was.
//
// THE STANDING GUARDS, all enforced in-script and all reported:
//   1. RECONCILE FIRST. The DB's actual approved-set for this paper is read and printed against
//      the journal's reviewed-set (supplied via --journalled, comma-separated 8-char prefixes).
//      A row `approved` with no journal entry, or a journalled row missing from the DB set, is a
//      HARD STOP. A status written without a review record is a pipeline leak, not a typo.
//   2. EXPLICIT ID ONLY. Never a bare `WHERE status='approved'`. The guarded statement is printed
//      verbatim before it runs.
//   3. PRE/POST COUNTS. Printed either side of the write.
//   4. P-DB4. The full pre-write row is read, and after the flip every field other than `status`
//      and `published` must be byte-identical under a key-order-insensitive canonicalisation
//      (jsonb does not preserve key order — a raw stringify diff reports phantom drift).
//   5. SHAPE GUARD. Refuses a `mock_only=true` target. This script publishes PRACTICE cases; a
//      mock paper is flipped deliberately and separately, and conflating the two is exactly how
//      reserved exam content would reach the practice library.
//
// Run:  npx tsx --env-file=.env.local scripts/authoring/publish-afm-case.ts \
//         --case <uuid> --journalled a001,b101,b201 [--apply]
// Default is a DRY RUN.

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const argOf = (f: string) => { const i = process.argv.indexOf(f); return i >= 0 ? (process.argv[i + 1] ?? null) : null; };
const APPLY = process.argv.includes('--apply');
const CASE_ID = argOf('--case');
const JOURNALLED = (argOf('--journalled') ?? '').split(',').map((s) => s.trim()).filter(Boolean);

const canon = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.keys(o).sort().reduce<Record<string, unknown>>((a, k) => { a[k] = canon(o[k]); return a; }, {});
  }
  return v;
};
const rest = (row: Record<string, unknown>) => {
  const { status: _s, published: _p, ...r } = row;
  return JSON.stringify(canon(r));
};

async function main() {
  if (!CASE_ID) throw new Error('--case <uuid> is required');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const line = (s = '') => console.log(s);

  line('='.repeat(100));
  line(`  GATE-P PUBLISH FLIP — AFM practice case`);
  line(`  mode: ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}`);
  line('='.repeat(100));

  // ── 1. RECONCILE ────────────────────────────────────────────────────────────
  const { data: all, error: aErr } = await supabase
    .from('acca_cases').select('id, title, status, published, mock_only').eq('paper_code', 'AFM');
  if (aErr) throw aErr;
  const approved = (all ?? []).filter((c) => c.status === 'approved');

  // THE KEY MUST DISCRIMINATE THE RANGE, NOT JUST THE SUFFIX (fixed 2026-08-01, before the
  // second flip). The first version keyed on `id.slice(-4)`. The mock papers live in the aa…
  // range and the practice cases in ac…, and they COLLIDE on that suffix: mock Brecon is
  // aa000000-…-b101 and practice Halvard is ac000000-…-b101. Two colliding ids collapse into one
  // Set entry, so an approved row with no journal entry could hide behind a journalled one — the
  // exact leak this reconcile exists to catch, defeated by the key it was keyed on.
  const keyOf = (id: string) => `${id.slice(0, 2)}:${id.slice(-4)}`;
  const dbSet = new Set(approved.map((c) => keyOf(String(c.id))));

  line('\n  1. RECONCILE — DB approved-set vs the journal reviewed-set');
  for (const c of approved) line(`     DB approved: ${keyOf(String(c.id))}  ${c.title}  (mock_only=${c.mock_only})`);
  line(`     journalled : ${JOURNALLED.join(', ') || '(none supplied)'}`);
  const unjournalled = [...dbSet].filter((k) => !JOURNALLED.includes(k));
  const missing = JOURNALLED.filter((k) => !dbSet.has(k));
  if (unjournalled.length) {
    throw new Error(`HARD STOP — approved in DB with no journal entry: ${unjournalled.join(', ')}. ` +
      'A status written without a review record is a pipeline leak — find its source before flipping anything.');
  }
  if (missing.length) {
    throw new Error(`HARD STOP — journalled as reviewed but NOT approved in DB: ${missing.join(', ')}.`);
  }
  line(`     ✓ reconcile PASS — ${approved.length} approved, ${approved.length} journalled, exact match`);

  // ── 2. TARGET + SHAPE GUARD ─────────────────────────────────────────────────
  const { data: rows, error: tErr } = await supabase.from('acca_cases').select('*').eq('id', CASE_ID);
  if (tErr) throw tErr;
  const before = (rows ?? [])[0] as Record<string, unknown> | undefined;
  if (!before) throw new Error(`case ${CASE_ID} does not exist`);
  line(`\n  2. TARGET — ${String(before.title)}  (${String(before.section)}, ${String(before.total_marks)} marks)`);
  line(`     status ${String(before.status)} · published ${String(before.published)} · mock_only ${String(before.mock_only)}`);
  if (before.mock_only === true) {
    throw new Error('HARD STOP — target is mock_only=true. This script publishes PRACTICE cases only; ' +
      'a mock paper is flipped deliberately and separately.');
  }
  if (before.status === 'approved' && before.published === true) {
    line('     already live — nothing to do.'); return;
  }

  // ── 3. PRE COUNTS + THE GUARDED STATEMENT ───────────────────────────────────
  const preLib = (all ?? []).filter((c) => c.status === 'approved' && c.published && !c.mock_only).length;
  const preSit = (all ?? []).filter((c) => c.status === 'approved' && c.published && c.mock_only).length;
  line(`\n  3. PRE COUNTS — practice library ${preLib} · sit surface ${preSit}`);
  line(`\n     GUARDED STATEMENT (explicit id, never a bare status predicate):`);
  line(`       UPDATE acca_cases SET status = 'approved', published = true`);
  line(`        WHERE id = '${CASE_ID}' AND mock_only = false;`);

  const SNAPSHOT = `docs/rollbacks/AFM_case_publish_${String(CASE_ID).slice(-4)}_20260801.json`;
  mkdirSync(dirname(SNAPSHOT), { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify({ reason: 'GATE-P publish flip', row: before }, null, 2));
  line(`\n     P-DB3 snapshot: ${SNAPSHOT}`);

  if (!APPLY) { line('\n  DRY RUN — nothing written. Re-run with --apply.\n'); return; }

  // ── 4. THE WRITE ────────────────────────────────────────────────────────────
  const { error: upErr } = await supabase
    .from('acca_cases')
    .update({ status: 'approved', published: true })
    .eq('id', CASE_ID)
    .eq('mock_only', false);        // belt AND braces: the predicate is in the statement too
  if (upErr) throw upErr;

  // ── 5. P-DB4 POST-VERIFY ────────────────────────────────────────────────────
  const { data: aRows, error: pErr } = await supabase.from('acca_cases').select('*').eq('id', CASE_ID);
  if (pErr) throw pErr;
  const after = (aRows ?? [])[0] as Record<string, unknown>;
  line(`\n  4. P-DB4 POST-VERIFY`);
  const identical = rest(before) === rest(after);
  const flipped = after.status === 'approved' && after.published === true;
  line(`     status    ${String(before.status)} → ${String(after.status)}`);
  line(`     published ${String(before.published)} → ${String(after.published)}`);
  line(`     every other field byte-identical: ${identical ? 'YES' : 'NO'}`);
  if (!identical) {
    for (const k of Object.keys(before)) {
      if (k === 'status' || k === 'published') continue;
      if (JSON.stringify(canon(before[k])) !== JSON.stringify(canon(after[k]))) line(`       ✗ drifted: ${k}`);
    }
  }

  const { data: post } = await supabase.from('acca_cases').select('id, status, published, mock_only').eq('paper_code', 'AFM');
  const postLib = (post ?? []).filter((c) => c.status === 'approved' && c.published && !c.mock_only).length;
  const postSit = (post ?? []).filter((c) => c.status === 'approved' && c.published && c.mock_only).length;
  line(`\n  5. POST COUNTS — practice library ${preLib} → ${postLib} · sit surface ${preSit} → ${postSit}`);
  if (postSit !== preSit) throw new Error(`✗ SIT SURFACE MOVED (${preSit} → ${postSit}) — this flip must not touch it`);
  if (postLib !== preLib + 1) throw new Error(`✗ practice library did not gain exactly one row`);
  if (!identical || !flipped) { console.error('\n  ✗ P-DB4 FAILED'); process.exit(1); }
  line('\n  ✓ P-DB4 PASS — status and published are the ONLY fields that changed;');
  line('    the sit surface is unmoved and the practice library gained exactly one case.\n');
}

main().catch((e) => { console.error('FAILED:', (e as Error).message); process.exit(1); });
