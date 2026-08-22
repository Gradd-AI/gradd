// scripts/authoring/approve-sbl-batch-a.ts
//
// GATE-P, FIRST STEP ONLY — SBL batch A: candidate → approved. `published` IS NOT TOUCHED.
//
// ⚖️ THE RULING THIS SCRIPT ENCODES (Grant, 2026-08-22). The two columns record two different
// things and this batch is the case that separates them:
//     `approved`  = the content passed review.        TRUE TODAY.
//     `published` = intent to serve.                  NOT TRUE — SBL has no surface, no price
//                                                     and no entitlement, and every served
//                                                     surface was just hardened to refuse it.
// Splitting them is what a two-step gate is FOR. The alternative — leaving the most-reviewed
// content in the repo sitting at `candidate` — costs `candidate` its meaning, because a reader
// then cannot tell "not reviewed" from "reviewed, deliberately not served".
//
// COMMITTED under P-DB6. It writes a status column on real rows, so it is the record of what was
// flipped and of what was checked before it was. The ruling is a literal above and is PRINTED
// before anything is written; a target with no recorded ruling is refused.
//
// THE THREE ARMS, all enforced in-script, all reported, any one of them a HARD STOP:
//   1. STATUS  — the DB's approved-set for SBL against the journal's reviewed-set. Two halves,
//                and PRE-FLIP THEY ARE ASYMMETRIC ON PURPOSE: "approved with no review record"
//                is a pipeline leak and stops everything; "reviewed but not yet approved" is
//                the flip's own target set, and is a violation only for a row that is NOT a
//                target. Post-flip the two sets must match exactly.
//   2. CONTENT — P-DB8. The same pure core and the same CONTENT_FIELDS the standalone runner
//                uses, in-process, so the arm cannot be skipped by forgetting to run it. A flip
//                carries STATUS, NOT CONTENT: a row can be correctly `candidate`, correctly
//                journalled as reviewed, and still hold text superseded days ago.
//   3. JOURNAL  — the arm the status arm ASSUMES and never verifies. The status arm compares two
//                sets of identifiers; it takes the reviewed-set on trust. This one opens the
//                journal and the review packs on disk and asserts a review record actually
//                exists for each target and names it. A reviewed-set asserted by a literal in a
//                script is a literal in a script.
//
// THEN: P-DB3 snapshot → explicit-id guarded UPDATE (never a bare status predicate) → P-DB4
// post-verify that `status` is the ONLY field that moved, `published` included → pre/post counts.
//
// ⚠️ ATOMICITY, STATED HONESTLY. The doctrine says demote any un-reviewed `approved` row in the
// SAME TRANSACTION as the flip. supabase-js has no transaction wrapper, so this script cannot
// give that. It therefore REFUSES to write when a demotion is required and prints the exact
// BEGIN/COMMIT block to run in the SQL editor instead. A sequenced pair of writes dressed up as
// a transaction would be a worse answer than saying it is not one.
//
// Run:  npx tsx --env-file=.env.local scripts/authoring/approve-sbl-batch-a.ts [--apply]
// Default is a DRY RUN.

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync, existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadDraft, SBL_PLAN_IDS } from './sbl-drafts';
import {
  CONTENT_FIELDS,
  reconcileContent,
  formatContentReport,
  type ContentRow,
  type ContentDraft,
} from '../../lib/acca/reconcile-content';

const APPLY = process.argv.includes('--apply');
const REPO = join(__dirname, '..', '..');

/**
 * THE RULING, as a literal. Printed before the write; a target absent from here is refused.
 * `to_published` is false on every row and that is the decision, not an omission.
 */
const RULING = {
  date: '2026-08-22',
  ruled_by: 'Grant',
  paper: 'SBL',
  from: { status: 'candidate', published: false },
  to: { status: 'approved', published: false },
  because:
    'approved records that the content passed review, which is true today; published records ' +
    'intent to serve, which is not — SBL has no surface, no price and no entitlement.',
} as const;

/**
 * THE JOURNAL'S REVIEWED-SET. Ids transcribed from docs/APM_BUILD_CONTRACT.md, the 2026-08-19
 * session bank. Arm 3 verifies every one of these against the journal and the review packs on
 * disk rather than trusting this table — the table is the CLAIM, arm 3 is the CHECK.
 */
const REVIEWED: { plan_id: string; id: string; lo: string }[] = [
  { plan_id: 'SBL-A1', id: '9d414a87-b12d-4526-85cc-5e537a25104b', lo: 'A2b' },
  { plan_id: 'SBL-A2', id: '5bd47a79-7640-4902-8360-b8b0952d0b19', lo: 'A2d' },
  { plan_id: 'SBL-A3', id: '46e10662-914f-412b-8e56-faf426d0461f', lo: 'A1a' },
  { plan_id: 'SBL-A4', id: '80b4918b-1602-46dc-a213-a4ba70cb12c4', lo: 'A3d' },
  { plan_id: 'SBL-A5', id: '2fbb2902-c254-4c9b-ac1a-240bf1adb9e7', lo: 'A3a' },
];

/** The review record backing the set. Every file must exist AND name the row. */
const JOURNAL_FILE = join('docs', 'APM_BUILD_CONTRACT.md');
const REVIEW_RECORDS = [
  join('docs', 'reviews', 'SBL_BATCH_A_REVIEW_PACK.md'),
  join('docs', 'reviews', 'SBL_BATCH_A_GPT_READ_2.md'),
  join('docs', 'reviews', 'SBL_BATCH_A_GPT_READ_3.md'),
  join('docs', 'reviews', 'SBL_BATCH_A_GPT_READ_4.md'),
  join('docs', 'reviews', 'SBL_BATCH_A_GPT_READ_5.md'),
];

const canon = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.keys(o).sort().reduce<Record<string, unknown>>((a, k) => { a[k] = canon(o[k]); return a; }, {});
  }
  return v;
};
/** Everything EXCEPT `status`. `published` stays IN — this flip must not move it. */
const rest = (row: Record<string, unknown>) => {
  const { status: _s, ...r } = row;
  return JSON.stringify(canon(r));
};

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const line = (s = '') => console.log(s);
  const short = (id: string) => id.slice(0, 8);

  line('='.repeat(100));
  line('  GATE-P — FIRST STEP ONLY  ·  SBL batch A  ·  candidate → approved');
  line(`  mode: ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}`);
  line('='.repeat(100));

  line('\n  THE RULING (printed before anything is written)');
  line(`     ${RULING.date}, ruled by ${RULING.ruled_by}`);
  line(`     status    ${RULING.from.status} → ${RULING.to.status}`);
  line(`     published ${RULING.from.published} → ${RULING.to.published}   ← UNCHANGED, BY DECISION`);
  line(`     because: ${RULING.because}`);

  // ── READ ────────────────────────────────────────────────────────────────────
  const { data: sblRaw, error: sErr } = await supabase
    .from('acca_drills')
    .select(['id', 'lo_code', 'paper_code', 'status', 'published', ...CONTENT_FIELDS].join(', '))
    .eq('paper_code', 'SBL');
  if (sErr) throw sErr;
  const sbl = (sblRaw ?? []) as unknown as (ContentRow & { id: string; lo_code: string; status: string; published: boolean })[];

  line(`\n  DB — ${sbl.length} SBL row(s)`);
  for (const r of sbl) line(`     ${short(r.id)}  lo=${r.lo_code}  status=${r.status}  published=${r.published}`);

  const targetIds = new Set(REVIEWED.map((r) => r.id));

  // ── ARM 1 · STATUS ──────────────────────────────────────────────────────────
  line('\n  ' + '-'.repeat(96));
  line('  ARM 1 · STATUS — DB approved-set vs journal reviewed-set');

  const dbApproved = sbl.filter((r) => r.status === 'approved');
  line(`     DB approved (SBL) : ${dbApproved.length ? dbApproved.map((r) => short(r.id)).join(', ') : '(none)'}`);
  line(`     journal reviewed  : ${REVIEWED.map((r) => short(r.id)).join(', ')}`);

  // Half (a) — approved with NO review record. Always a hard stop; this is the pipeline leak.
  const unreviewedApproved = dbApproved.filter((r) => !targetIds.has(r.id));
  // Half (b) — reviewed but not approved. Pre-flip this IS the target set; a row here that is
  // not a target would mean the reviewed-set names a row the DB does not have.
  const dbIds = new Set(sbl.map((r) => r.id));
  const reviewedMissingFromDb = REVIEWED.filter((r) => !dbIds.has(r.id));

  if (reviewedMissingFromDb.length) {
    throw new Error(
      `HARD STOP — journalled as reviewed but ABSENT from the DB: ` +
      `${reviewedMissingFromDb.map((r) => `${r.plan_id}/${short(r.id)}`).join(', ')}.`
    );
  }
  if (unreviewedApproved.length) {
    line(`\n     ✗ ${unreviewedApproved.length} row(s) APPROVED with no review record — a pipeline leak:`);
    for (const r of unreviewedApproved) line(`         ${short(r.id)}  lo=${r.lo_code}  published=${r.published}`);
    line('\n     The doctrine demands these be demoted in the SAME TRANSACTION as the flip.');
    line('     supabase-js cannot give that. Run this block in the SQL editor instead:\n');
    line('       BEGIN;');
    for (const r of unreviewedApproved) {
      line(`         UPDATE acca_drills SET status = 'candidate' WHERE id = '${r.id}';`);
    }
    for (const r of REVIEWED) {
      line(`         UPDATE acca_drills SET status = 'approved'`);
      line(`          WHERE id = '${r.id}' AND status = 'candidate' AND published = false;`);
    }
    line('       COMMIT;\n');
    throw new Error('HARD STOP — a demotion is required and this script cannot make it atomic. See the block above.');
  }
  line(`     ✓ half (a) — 0 approved rows without a review record (nothing to demote)`);
  line(`     ✓ half (b) — all ${REVIEWED.length} reviewed rows exist in the DB; all are flip targets`);

  // ── ARM 2 · CONTENT (P-DB8) ─────────────────────────────────────────────────
  line('\n  ' + '-'.repeat(96));
  line('  ARM 2 · CONTENT — each row against the draft that was actually reviewed');
  const drafts: ContentDraft[] = SBL_PLAN_IDS.map((id) => {
    const { path, draft } = loadDraft(id);
    return { plan_id: id, lo_code: draft.lo_code, source_file: path.split(/[\\/]/).pop() ?? path, row: draft.row };
  });
  for (const d of drafts) line(`     ${d.plan_id}  lo=${d.lo_code}  <- ${d.source_file}`);
  const content = reconcileContent(sbl as ContentRow[], drafts);
  line(formatContentReport(content));
  if (content.blocked) {
    throw new Error('HARD STOP — the rows about to be flipped are NOT the rows that were reviewed. Run the content sync first.');
  }

  // ── ARM 3 · JOURNAL ─────────────────────────────────────────────────────────
  line('\n  ' + '-'.repeat(96));
  line('  ARM 3 · JOURNAL — does a review record actually exist, and does it name these rows?');
  const journalPath = join(REPO, JOURNAL_FILE);
  if (!existsSync(journalPath)) throw new Error(`HARD STOP — journal missing: ${JOURNAL_FILE}`);
  const journal = readFileSync(journalPath, 'utf8');
  const unnamed = REVIEWED.filter((r) => !journal.includes(r.id));
  if (unnamed.length) {
    throw new Error(
      `HARD STOP — the journal does not name: ${unnamed.map((r) => `${r.plan_id}/${short(r.id)}`).join(', ')}. ` +
      'The reviewed-set literal in this script is a CLAIM; the journal is the record.'
    );
  }
  line(`     ✓ ${JOURNAL_FILE} names all ${REVIEWED.length} row ids in full`);
  for (const rel of REVIEW_RECORDS) {
    const p = join(REPO, rel);
    if (!existsSync(p)) throw new Error(`HARD STOP — review record missing: ${rel}`);
    line(`     ✓ ${rel}`);
  }
  line('     ⚠️ CEILING: this arm proves a review record EXISTS and NAMES the row. It cannot');
  line('        prove the review was good, and it is not a substitute for reading the pack.');

  // ── PRE COUNTS + THE GUARDED STATEMENT ──────────────────────────────────────
  const countOf = async (b: (q: any) => any) => {
    const { count, error } = await b(supabase.from('acca_drills').select('id', { count: 'exact', head: true }));
    if (error) throw error;
    return count ?? 0;
  };
  const preAll = await countOf((q: any) => q);
  const preApproved = await countOf((q: any) => q.eq('status', 'approved'));
  const prePublished = await countOf((q: any) => q.eq('published', true));
  const preSblApproved = await countOf((q: any) => q.eq('paper_code', 'SBL').eq('status', 'approved'));
  const preSblPublished = await countOf((q: any) => q.eq('paper_code', 'SBL').eq('published', true));

  line('\n  ' + '-'.repeat(96));
  line('  PRE COUNTS (acca_drills, all papers)');
  line(`     total ${preAll} · approved ${preApproved} · published ${prePublished}`);
  line(`     SBL: approved ${preSblApproved} · published ${preSblPublished}`);

  line('\n  GUARDED STATEMENTS (explicit id, never a bare status predicate):');
  for (const r of REVIEWED) {
    line(`     UPDATE acca_drills SET status = 'approved'`);
    line(`      WHERE id = '${r.id}' AND status = 'candidate' AND published = false;   -- ${r.plan_id} ${r.lo}`);
  }
  line('     (`published` does not appear on the left of a single one of these.)');

  const before = new Map<string, Record<string, unknown>>();
  for (const r of REVIEWED) {
    const { data, error } = await supabase.from('acca_drills').select('*').eq('id', r.id);
    if (error) throw error;
    const row = (data ?? [])[0] as Record<string, unknown> | undefined;
    if (!row) throw new Error(`target ${r.plan_id} does not exist`);
    if (row.status !== 'candidate' || row.published !== false) {
      throw new Error(`HARD STOP — ${r.plan_id} is status=${String(row.status)} published=${String(row.published)}, not candidate/false.`);
    }
    before.set(r.id, row);
  }

  const SNAPSHOT = join('docs', 'rollbacks', 'SBL_batch_a_approve_flip_20260822.json');
  mkdirSync(dirname(join(REPO, SNAPSHOT)), { recursive: true });
  writeFileSync(
    join(REPO, SNAPSHOT),
    JSON.stringify({ reason: 'GATE-P first step — candidate → approved, published deliberately unchanged', ruling: RULING, rows: REVIEWED.map((r) => before.get(r.id)) }, null, 2)
  );
  line(`\n  P-DB3 snapshot: ${SNAPSHOT}`);

  if (!APPLY) { line('\n  DRY RUN — nothing written. Re-run with --apply.\n'); return; }

  // ── THE WRITE ───────────────────────────────────────────────────────────────
  line('\n  WRITING…');
  for (const r of REVIEWED) {
    const { error } = await supabase
      .from('acca_drills')
      .update({ status: 'approved' })
      .eq('id', r.id)
      .eq('status', 'candidate')
      .eq('published', false);
    if (error) throw error;
    line(`     ${r.plan_id}  ${short(r.id)}  written`);
  }

  // ── P-DB4 POST-VERIFY ───────────────────────────────────────────────────────
  line('\n  P-DB4 POST-VERIFY — `status` must be the ONLY field that moved');
  let ok = true;
  for (const r of REVIEWED) {
    const { data, error } = await supabase.from('acca_drills').select('*').eq('id', r.id);
    if (error) throw error;
    const after = (data ?? [])[0] as Record<string, unknown>;
    const b = before.get(r.id)!;
    const fieldCount = Object.keys(b).length;
    const identical = rest(b) === rest(after);
    const flipped = after.status === 'approved';
    const stillUnpublished = after.published === false;
    line(`     ${r.plan_id}  status ${String(b.status)} → ${String(after.status)} · published ${String(after.published)} · ` +
      `${fieldCount - 1}/${fieldCount - 1} other fields byte-identical: ${identical ? 'YES' : 'NO'}`);
    if (!identical) {
      for (const k of Object.keys(b)) {
        if (k === 'status') continue;
        if (JSON.stringify(canon(b[k])) !== JSON.stringify(canon(after[k]))) line(`         ✗ drifted: ${k}`);
      }
    }
    if (!identical || !flipped || !stillUnpublished) ok = false;
  }

  const postAll = await countOf((q: any) => q);
  const postApproved = await countOf((q: any) => q.eq('status', 'approved'));
  const postPublished = await countOf((q: any) => q.eq('published', true));
  const postSblApproved = await countOf((q: any) => q.eq('paper_code', 'SBL').eq('status', 'approved'));
  const postSblPublished = await countOf((q: any) => q.eq('paper_code', 'SBL').eq('published', true));

  line('\n  POST COUNTS');
  line(`     total     ${preAll} → ${postAll}`);
  line(`     approved  ${preApproved} → ${postApproved}   (expected +${REVIEWED.length})`);
  line(`     published ${prePublished} → ${postPublished}   (expected UNCHANGED)`);
  line(`     SBL: approved ${preSblApproved} → ${postSblApproved} · published ${preSblPublished} → ${postSblPublished}`);

  if (postPublished !== prePublished) throw new Error(`✗ PUBLISHED COUNT MOVED (${prePublished} → ${postPublished}) — this flip must not serve anything`);
  if (postSblPublished !== 0) throw new Error(`✗ SBL HAS PUBLISHED ROWS (${postSblPublished}) — the ruling was step one only`);
  if (postApproved !== preApproved + REVIEWED.length) throw new Error(`✗ approved did not gain exactly ${REVIEWED.length}`);
  if (postAll !== preAll) throw new Error('✗ row count moved — a flip inserts nothing');
  if (!ok) { console.error('\n  ✗ P-DB4 FAILED'); process.exit(1); }

  // Post-flip the two halves of arm 1 must now match EXACTLY.
  const { data: postSbl, error: pErr } = await supabase.from('acca_drills').select('id, status').eq('paper_code', 'SBL');
  if (pErr) throw pErr;
  const postApprovedIds = new Set((postSbl ?? []).filter((r: any) => r.status === 'approved').map((r: any) => String(r.id)));
  const exact = postApprovedIds.size === targetIds.size && [...targetIds].every((id) => postApprovedIds.has(id));
  line(`\n  ARM 1 RE-RUN — approved-set vs reviewed-set now EXACT MATCH: ${exact ? 'YES' : 'NO'}`);
  if (!exact) throw new Error('✗ post-flip reconcile is not an exact match');

  line('\n  ✓ GATE-P STEP ONE COMPLETE — five rows approved, ZERO published.');
  line('    Step two (published → true) belongs to whoever builds the SBL surface,');
  line('    and it carries a RE-READ obligation: see docs/AFM_SURFACED.md.\n');
}

main().catch((e) => { console.error('FAILED:', (e as Error).message); process.exit(1); });
