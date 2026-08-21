/**
 * lint-sbl-certainty.ts — run the P-N3 certainty lint over the SBL batch-A drafts.
 *
 * Usage:  npx tsx scripts/authoring/lint-sbl-certainty.ts [SBL-A1 …]   (default: all five)
 *         --all   also print the occurrences a same-sentence hedge suppressed
 *
 * ── IT REPORTS. IT DOES NOT REFUSE. ──────────────────────────────────────────────────
 * Exit code is 0 whatever it finds, deliberately — see the claim ceiling in
 * `lib/acca/certainty-lint.ts`. A hit is a sentence to read against the exhibit, not a
 * defect, and only a human holding the exhibit can tell the difference. The output is a
 * WORK LIST: where a cold read should start, ordered by drill and by field.
 *
 * ── IT READS THE DRAFTS, NOT THE DB, AND THAT IS THE RIGHT SURFACE TODAY ─────────────
 * All five rows are `candidate` / `published=false`. The drafts in `docs/rollbacks/` are what
 * the fix commits edit and what `export-sbl-pack.ts` renders, so they are the reviewable
 * artefact until the GATE-P flip re-applies them to the DB. Draft resolution is shared with
 * the exporter (`sbl-drafts.ts`) so this cannot read a superseded `.json` while the pack reads
 * a `.2.json` — the exact trap that shipped once already.
 */
import { SBL_PLAN_IDS, loadDraft } from './sbl-drafts';
import {
  lintDrillCertainty,
  noteFor,
  type CertaintyHit,
  type CertaintyReport,
} from '../../lib/acca/certainty-lint';

const argv = process.argv.slice(2);
const showHedged = argv.includes('--all');
const ids = argv.filter((a) => !a.startsWith('--'));
const targets = ids.length > 0 ? ids : [...SBL_PLAN_IDS];

const line = (n = 78) => '─'.repeat(n);

function printHits(hits: CertaintyHit[], indent = '  ') {
  let lastLocator = '';
  for (const h of hits) {
    if (h.locator !== lastLocator) {
      console.log(`${indent}${h.locator === h.field ? h.field : `${h.locator}  (required_point)`}`);
      lastLocator = h.locator;
    }
    const hedged = h.hedged ? `  [hedged by: ${h.hedges.join(', ')}]` : '';
    console.log(`${indent}  • "${h.matched}" — ${noteFor(h.term)}${hedged}`);
    const s = h.sentence.length > 190 ? `${h.sentence.slice(0, 187)}…` : h.sentence;
    console.log(`${indent}    ${s}`);
  }
}

const reports: CertaintyReport[] = [];

for (const id of targets) {
  const { path, draft } = loadDraft(id);
  const report = lintDrillCertainty({
    label: `${id} (${draft.lo_code}, ${draft.skill})`,
    model_answer: draft.row.model_answer,
    full_reveal: draft.row.full_reveal,
    criteria: draft.row.answer_schema.criteria.map((c) => ({ id: c.id, required_point: c.required_point })),
  });
  reports.push(report);

  console.log(`\n${line()}`);
  console.log(`${report.label}`);
  console.log(`read: ${path.split(/[\\/]/).pop()}`);
  console.log(line());
  console.log(
    `  work list: ${report.unhedged.length} unhedged`
    + `  (required_point ${report.byField.required_point}`
    + ` · model_answer ${report.byField.model_answer}`
    + ` · full_reveal ${report.byField.full_reveal})`
    + `   —   ${report.hedged.length} further occurrence(s) suppressed by a same-sentence hedge`,
  );
  if (report.unhedged.length > 0) {
    console.log('');
    printHits(report.unhedged);
  }
  if (showHedged && report.hedged.length > 0) {
    console.log(`\n  ── suppressed (proximity, not attachment — read these too) ──`);
    printHits(report.hedged);
  }
}

// ── THE WORK LIST ────────────────────────────────────────────────────────────────────
console.log(`\n${line()}`);
console.log('WORK LIST — unhedged hits per drill');
console.log(line());
console.log('  drill                          req_pt  model_ans  reveal  TOTAL   (+hedged)');
for (const r of reports) {
  const label = r.label.padEnd(30).slice(0, 30);
  const f = r.byField;
  console.log(
    `  ${label} ${String(f.required_point).padStart(6)}`
    + ` ${String(f.model_answer).padStart(10)}`
    + ` ${String(f.full_reveal).padStart(7)}`
    + ` ${String(r.unhedged.length).padStart(6)}`
    + `   ${String(r.hedged.length).padStart(8)}`,
  );
}
const totalUnhedged = reports.reduce((n, r) => n + r.unhedged.length, 0);
const totalHedged = reports.reduce((n, r) => n + r.hedged.length, 0);
console.log(`  ${''.padEnd(30)} ${''.padStart(6)} ${''.padStart(10)} ${''.padStart(7)} ${String(totalUnhedged).padStart(6)}   ${String(totalHedged).padStart(8)}`);

// Which words are doing the work, across the batch.
const byTerm: Record<string, number> = {};
for (const r of reports) for (const [t, n] of Object.entries(r.byTerm)) byTerm[t] = (byTerm[t] ?? 0) + n;
console.log('\n  by term:');
for (const [t, n] of Object.entries(byTerm).sort((a, b) => b[1] - a[1])) {
  console.log(`    ${String(n).padStart(4)}  ${t}`);
}

console.log(
  '\n  ⚠️ A HIT IS NOT A DEFECT and a clean field is not P-N3 clean — the term list is closed,'
  + '\n     and a hedge suppresses by PROXIMITY, not attachment. Read with --all before concluding'
  + '\n     a drill is quiet. This tool reports; it never refuses.\n',
);
// Advisory: always 0. P-G4: never process.exit().
process.exitCode = 0;
