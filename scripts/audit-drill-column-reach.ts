// scripts/audit-drill-column-reach.ts — which acca_drills columns can reach a SERVE?
//
// ⚠️ WHY THIS EXISTS. Three columns have now been found authored correctly by the generator and
// read by NOTHING at serve time: `professional_skill_tag` (written since day one, unread until PS
// steering shipped 2026-07-31), and `calculation_required` + `mode` (both populated on 154/154
// published rows, referenced by zero files under app/ or lib/ until 2026-08-23). Each time, the
// missing capability looked like an AUTHORING gap and was a READING gap. The generator's
// discipline has run ahead of the serve path's appetite throughout (P-T3(k)).
//
// The cost is not a bug. It is an invisible ceiling: capability that exists, is correct, is paid
// for at authoring time, and cannot influence a single serve.
//
// WHAT THIS DOES: enumerate the live columns, then check each against the select lists of every
// `from('acca_drills')` query under app/ and lib/ — the SERVING paths only. scripts/ is excluded
// on purpose: an authoring script reading a column proves the generator writes it, which is the
// half we already know.
//
// ⚠️ CLAIM CEILING, and it is narrow: a column counted as REACHED is merely FETCHED by some
// serving query. It says nothing about whether anything downstream branches on the value —
// `answer_schema` was fetched for months while the pack that read it ignored the field that
// mattered. FETCHED is the floor, never the finding.
//
// The `audit-` prefix keeps this out of the contract gate by construction (run-contracts.ts
// discovers `test-*.ts`), so no EXCLUDED entry is owed.
//
// Run: npm run audit:drill-column-reach

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(url, key);

const REPO = path.join(__dirname, '..');
const ROOTS = ['app', 'lib'];

function walk(dir: string, out: string[] = []): string[] {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p, out); }
    else if (e.name.endsWith('.ts') || e.name.endsWith('.tsx')) out.push(p);
  }
  return out;
}

/**
 * The select lists belonging to acca_drills queries SPECIFICALLY.
 *
 * ⚠️ TWO DEFECTS IN THE FIRST VERSION OF THIS FUNCTION, both of which produced a FALSE GREEN
 * (20/20 columns "reached", 0 unreached) and both worth stating because they are the same class
 * of error this whole audit exists to catch:
 *
 *  (a) IT ASSOCIATED BY FILE, NOT BY QUERY. Any file containing `from('acca_drills')` anywhere
 *      donated EVERY `.select(...)` in it, including selects against other tables entirely.
 *      `lib/org/queries.ts` queries several tables and so appeared to fetch every drill column.
 *  (b) IT COUNTED `.select('*', { count: 'exact', head: true })` AS FETCHING EVERYTHING. That is
 *      a row-COUNT probe — `head: true` returns no rows at all, so it fetches no column. Treating
 *      it as reach is the exact inverse of the truth.
 *
 * Now: find each `from('acca_drills')`, take the chained `.select(...)` within a bounded window
 * after it, resolve a bare identifier through the file's own `const X = '...'`, and drop
 * head-only count probes.
 */
function drillSelectLists(src: string): string[] {
  const lists: string[] = [];
  // Resolve select-list constants declared in the same file (next-drill uses `const SEL = '...'`).
  const consts = new Map<string, string>();
  for (const m of src.matchAll(/const\s+(\w+)\s*=\s*(['"`])([\s\S]{0,600}?)\2/g)) consts.set(m[1], m[3]);

  for (const q of src.matchAll(/from\(\s*['"`]acca_drills['"`]\s*\)/g)) {
    const start = (q.index ?? 0);
    // The chained .select() follows within the same statement; 400 chars is generous for the
    // longest list in the repo and short enough not to reach the next query.
    const window = src.slice(start, start + 400);
    const sel = window.match(/\.select\(\s*(?:(['"`])([\s\S]*?)\1|(\w+))/);
    if (!sel) continue;
    const list = sel[2] !== undefined ? sel[2] : (consts.get(sel[3] ?? '') ?? '');
    if (!list) continue;
    // A head-only count probe fetches NO rows; it is not reach.
    const afterSel = window.slice(sel.index ?? 0);
    if (list.trim() === '*' && /head:\s*true/.test(afterSel)) continue;
    lists.push(list);
  }
  return lists;
}

async function main() {
  // Column list straight from a live row — no hand-maintained list to drift.
  const probe = await sb.from('acca_drills').select('*').limit(1);
  if (probe.error) throw new Error(probe.error.message);
  const columns = Object.keys(probe.data?.[0] ?? {}).sort();

  const files = ROOTS.flatMap((r) => walk(path.join(REPO, r)));
  const hits = new Map<string, Set<string>>();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    const lists = drillSelectLists(src);
    if (!lists.length) continue;
    const rel = path.relative(REPO, f).replace(/\\/g, '/');
    for (const list of lists) {
      const wildcard = list.trim() === '*';   // a real '*' fetch DOES reach every column
      for (const col of columns) {
        // Word-boundary match so `mode` does not match `mock_mode`, and `id` not `drill_id`.
        const named = new RegExp(`(^|[\\s,(])${col}([\\s,)]|$)`).test(list);
        if (wildcard || named) {
          if (!hits.has(col)) hits.set(col, new Set());
          hits.get(col)!.add(rel);
        }
      }
    }
  }

  // ── THIRD CATEGORY, missed by the first two versions ────────────────────────
  // A column can reach a serve WITHOUT appearing in any select list, by gating it:
  // `.eq('published', true)`, `.in('paper_code', …)`, `.not('status', …)`. Those columns decide
  // WHICH ROW is served, which is reach of the most consequential kind — and a sweep that only
  // reads select lists reports them as dead. `published`, `status` and `exam_board` are exactly
  // that shape, and calling them unread would have been a third false finding in one script.
  const filters = new Map<string, Set<string>>();
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    if (!/from\(\s*['"`]acca_drills['"`]\s*\)/.test(src)) continue;
    const rel = path.relative(REPO, f).replace(/\\/g, '/');
    for (const m of src.matchAll(/\.(?:eq|neq|in|not|gt|gte|lt|lte|like|ilike|is|filter|order)\(\s*['"`](\w+)['"`]/g)) {
      const col = m[1];
      if (!columns.includes(col)) continue;
      if (!filters.has(col)) filters.set(col, new Set());
      filters.get(col)!.add(rel);
    }
  }

  const reached   = columns.filter((c) => hits.has(c));
  const filterOnly = columns.filter((c) => !hits.has(c) && filters.has(c));
  const unreached = columns.filter((c) => !hits.has(c) && !filters.has(c));

  console.log(`\nacca_drills — ${columns.length} columns · ${files.length} files scanned under ${ROOTS.join('/, ')}/\n`);
  console.log(`── REACHED by at least one serving query (${reached.length}) ──`);
  for (const c of reached) {
    console.log(`  ${c.padEnd(24)} ${[...hits.get(c)!].join(', ')}`);
  }
  console.log(`\n── NOT SELECTED, but GATES which row is served (${filterOnly.length}) ──`);
  for (const c of filterOnly) console.log(`  ${c.padEnd(24)} ${[...filters.get(c)!].join(', ')}`);
  console.log(`\n── NEVER FETCHED AND NEVER FILTERED ON (${unreached.length}) ──`);
  for (const c of unreached) console.log(`  ${c}`);
  console.log(
    '\n⚠️  REACHED means FETCHED, not USED. A column can be selected and never branched on.\n' +
    '   Unreached columns are authored capability that cannot influence a serve (P-T3(k)).\n');
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
