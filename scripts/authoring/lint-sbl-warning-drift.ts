/**
 * lint-sbl-warning-drift.ts — run the P-N3 warning-drift check over the SBL batch-A drafts.
 *
 * Usage:  npx tsx scripts/authoring/lint-sbl-warning-drift.ts [SBL-A1 …]   (default: all five)
 *         --min N   minimum matched terms for a pair to print (default 1)
 *         --warnings-only   list the warnings found, and nothing else
 *
 * IT REPORTS. IT DOES NOT REFUSE. Exit 0 whatever it finds — a pair means "this sentence talks
 * about the distinctive things this warning forbids", never "this is drift". See the claim
 * ceiling in lib/acca/warning-drift.ts: recall tool, blind to synonym drift, blind to warnings
 * with no lead form, and unable to tell an allowed mention from a forbidden one.
 */
import { SBL_PLAN_IDS, loadDraft } from './sbl-drafts';
import { checkWarningDrift, type DriftReport } from '../../lib/acca/warning-drift';

const argv = process.argv.slice(2);
const warningsOnly = argv.includes('--warnings-only');
const minIdx = argv.indexOf('--min');
const minScore = minIdx >= 0 ? Number(argv[minIdx + 1]) : 1;
const ids = argv.filter((a) => !a.startsWith('--') && a !== String(minScore));
const targets = ids.length > 0 ? ids : [...SBL_PLAN_IDS];

const line = (n = 78) => '─'.repeat(n);
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

const reports: DriftReport[] = [];

for (const id of targets) {
  const { path, draft } = loadDraft(id);
  const report = checkWarningDrift({
    label: `${id} (${draft.lo_code}, ${draft.skill})`,
    criteria: draft.row.answer_schema.criteria.map((c) => ({ id: c.id, required_point: c.required_point })),
    model_answer: draft.row.model_answer,
    full_reveal: draft.row.full_reveal,
    context_text: draft.row.context_text,
    minScore,
  });
  reports.push(report);

  console.log(`\n${line()}\n${report.label}\nread: ${path.split(/[\\/]/).pop()}\n${line()}`);
  console.log(`  ${report.warnings.length} explicit warning(s) · ${report.pairs.length} candidate drift pair(s)`);

  if (warningsOnly) {
    for (const w of report.warnings) {
      console.log(`\n  ${w.criterionId}  forbids: [${w.terms.join(', ')}]`);
      console.log(`    ${clip(w.warning, 180)}`);
    }
    continue;
  }

  let lastWarning = '';
  for (const p of report.pairs) {
    if (p.warning !== lastWarning) {
      console.log(`\n  ⚠ ${p.criterionId} warns:`);
      console.log(`    ${clip(p.warning, 190)}`);
      if (p.clauses.length > 0) console.log(`    forbidden clause: ${clip(p.clauses.join(' | '), 170)}`);
      lastWarning = p.warning;
    }
    console.log(`\n    → ${p.field}  [${p.matched.join(', ')}]  (score ${p.score})`);
    console.log(`      ${clip(p.sentence, 190)}`);
  }
}

console.log(`\n${line()}\nWORK LIST — candidate drift pairs per drill\n${line()}`);
console.log('  drill                          warnings   pairs   top score');
for (const r of reports) {
  const top = r.pairs.length > 0 ? r.pairs[0].score : 0;
  console.log(
    `  ${r.label.padEnd(30).slice(0, 30)} ${String(r.warnings.length).padStart(8)}`
    + ` ${String(r.pairs.length).padStart(7)} ${String(top).padStart(11)}`,
  );
}
console.log(
  `  ${''.padEnd(30)} ${String(reports.reduce((n, r) => n + r.warnings.length, 0)).padStart(8)}`
  + ` ${String(reports.reduce((n, r) => n + r.pairs.length, 0)).padStart(7)}`,
);
console.log(
  '\n  ⚠️ A PAIR IS NOT DRIFT. It says the sentence talks about the distinctive things the'
  + '\n     warning forbids — a reader holding the exhibit decides whether it asserts them.'
  + '\n     Blind to synonym drift, to warnings with no lead form, and to drift by implication,'
  + '\n     so a clean report is NOT evidence that a drill has none.\n',
);
process.exitCode = 0;
