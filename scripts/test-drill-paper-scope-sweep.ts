// scripts/test-drill-paper-scope-sweep.ts — THE SWEEP THAT STOPS THE NEXT ONE.
// Pure: reads source files off disk, no DB, no model, no network.
// Run: npm run test:drill-paper-scope-sweep
//
// ── WHY A STATIC SWEEP AND NOT MORE UNIT FIXTURES ─────────────────────────────────────────
// `test-paper-vocabulary.ts` proves SERVED_PAPERS is right. It cannot prove it is USED. The
// defect this exists to stop was a correct rule that two call sites never called: both
// id-addressed tutor fetches (`app/acca/tutor/page.tsx`'s resume branch and
// `app/api/acca/tutor/route.ts`'s drillSelect) filtered exam_board/status/published and NO
// paper at all. One of them even carried a comment saying it was "gated to a published APM
// drill", which the query had never enforced.
//
// That was harmless for as long as every published row belonged to a served paper, and it
// stopped being harmless the moment SBL rows existed: SBL is DECLARED but NOT SERVED
// (lib/acca/paper.ts) — no route, no price, no surface, no teaching persona — so an SBL id
// arriving at either fetch would have resolved a row and been taught by whichever persona the
// fallback picked. P-G2: this check's denominator is every `acca_drills` fetch that can reach
// a student, not the ones we remembered.
//
// ── THE RULE ──────────────────────────────────────────────────────────────────────────────
// Every `acca_drills` query under `app/` and `lib/` must constrain `paper_code`, either to one
// resolved paper (`.eq`) or to the served SET (`.in`). Exemptions are listed below with a
// reason each, keyed on the query's own select-list so they cannot silently cover a new site.
//
// ⚠️ CLAIM CEILING: this proves a query NAMES paper_code. It cannot prove the value handed to
// it is the right one — `.eq('paper_code', paper)` with a wrong `paper` passes here. A green
// sweep means "no drill fetch silently spans every paper", never "every fetch scopes correctly".
// `scripts/` is deliberately out of scope: authoring tools read across papers by design, which
// is exactly what scripts/authoring/reconcile-sbl-content.ts must do.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const ROOT = join(__dirname, '..');
const ROOTS = ['app', 'lib'];
const MARKER = ".from('acca_drills')";

let pass = 0;
let fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? `  — ${detail}` : ''}`); }
};

/**
 * Queries that legitimately do NOT constrain paper_code, keyed by a distinctive fragment of
 * their own select-list. Keying on the select rather than on file:line means a NEW query in an
 * exempt file is still swept — an exemption covers one query, not a whole file.
 */
const EXEMPT: { selectFragment: string; where: string; reason: string }[] = [
  {
    selectFragment: "'id, paper_code'",
    where: 'lib/org/queries.ts — drillPapers()',
    reason:
      'It READS paper_code to classify attempt rows by paper; constraining it would defeat the '
      + 'function. It selects id and paper_code only — no drill content, no question, no answer — '
      + 'so an unserved paper resolving here yields a label, not a leak.',
  },
  {
    selectFragment: "'id, topic, lo_code'",
    where: 'lib/org/queries.ts — drillTitles()',
    reason:
      'Id-addressed resume-link metadata (topic + lo_code), already filtered approved+published. '
      + 'Its drillIds come from rows the caller has already scoped to one paper. ⚠️ THIS ONE '
      + 'RELIES ON AN UPSTREAM INVARIANT RATHER THAN ENFORCING ITS OWN — it is safe today because '
      + 'no unserved paper has attempts, and it is the first place to look if that ever changes.',
  },
];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(ts|tsx)$/.test(entry)) out.push(full);
  }
  return out;
}

type Site = { file: string; line: number; chain: string };

function sites(): Site[] {
  const found: Site[] = [];
  for (const r of ROOTS) {
    for (const file of walk(join(ROOT, r))) {
      const text = readFileSync(file, 'utf8');
      let idx = text.indexOf(MARKER);
      while (idx !== -1) {
        // The chain runs to the statement terminator. Bounded so a missing ';' cannot swallow
        // the rest of the file and read as scoped because some later line says paper_code.
        const rest = text.slice(idx, idx + 1200);
        const end = rest.indexOf(';');
        found.push({
          file: relative(ROOT, file).split(sep).join('/'),
          line: text.slice(0, idx).split('\n').length,
          chain: end === -1 ? rest : rest.slice(0, end),
        });
        idx = text.indexOf(MARKER, idx + 1);
      }
    }
  }
  return found;
}

/**
 * CONSTRAINS, not merely MENTIONS.
 *
 * The first version of this sweep tested `chain.includes('paper_code')`, which passes on a
 * query that only SELECTS the column — and most of these do select it. That is the sweep's own
 * version of the defect it hunts: a check that reads as green because the right word appears
 * somewhere in the statement. Only `.eq('paper_code', …)` or `.in('paper_code', …)` narrows
 * the rows.
 */
const CONSTRAINS = /\.(eq|in)\(\s*'paper_code'/;

// ── THE DETECTOR IS ITSELF TESTED ───────────────────────────────────────────────────────────
// A sweep that never goes red is indistinguishable from a clean repo. These drive CONSTRAINS
// against synthetic chains — including the exact pre-fix shape of the two tutor fetches — so
// the discriminator is pinned without having to break a real file to watch it fail.
console.log('\n-- the detector discriminates (self-test, no real files) --');
const PRE_FIX_TUTOR_CHAIN = `.from('acca_drills')
    .select('question, context_text, model_answer, lo_code, paper_code, full_reveal')
    .eq('exam_board', 'ACCA')
    .eq('status', 'approved')
    .eq('published', true)`;
ok('the PRE-FIX tutor chain reads as UNSCOPED (it selects paper_code but never filters it)',
  CONSTRAINS.test(PRE_FIX_TUTOR_CHAIN) === false);
ok(".eq('paper_code', paper) reads as scoped",
  CONSTRAINS.test(".from('acca_drills').eq('paper_code', paper)") === true);
ok(".in('paper_code', [...SERVED_PAPERS]) reads as scoped",
  CONSTRAINS.test(".from('acca_drills').in('paper_code', [...SERVED_PAPERS])") === true);
ok('a bare select of paper_code does NOT read as scoped',
  CONSTRAINS.test(".from('acca_drills').select('id, paper_code')") === false);
ok('a comment mentioning paper_code does NOT read as scoped',
  CONSTRAINS.test(".from('acca_drills') // scoped by paper_code elsewhere") === false);

const all = sites();

console.log(`\n-- population: every acca_drills query under ${ROOTS.join('/, ')}/ --`);
ok('the sweep found queries at all (a zero denominator is a broken sweep, not a clean repo)',
  all.length > 0, `found ${all.length}`);
console.log(`  (${all.length} queries across ${new Set(all.map((s) => s.file)).size} files)`);

console.log('\n-- every query constrains paper_code, or is exempt with a reason --');
for (const s of all) {
  const scoped = CONSTRAINS.test(s.chain);
  const exempt = EXEMPT.find((e) => s.chain.includes(e.selectFragment));
  if (exempt) {
    ok(`${s.file}:${s.line} — EXEMPT (${exempt.where})`, !scoped,
      scoped ? 'it now scopes paper_code; delete the stale exemption' : '');
    continue;
  }
  ok(`${s.file}:${s.line} — constrains paper_code`, scoped,
    scoped ? '' : `chain: ${s.chain.replace(/\s+/g, ' ').slice(0, 150)}…`);
}

// An exemption naming a query that no longer exists is itself drift — same discipline as
// run-contracts.ts's EXCLUDED check.
console.log('\n-- no stale exemptions --');
for (const e of EXEMPT) {
  ok(`exemption still matches a real query (${e.where})`,
    all.some((s) => s.chain.includes(e.selectFragment)));
}

// ── the two fetches this sweep was written for ──────────────────────────────────────────────
// They must scope to the SET, not to one paper: an id is globally unique, so pinning either to
// a single resolved paper would 404 a legitimate AFM resume that arrived without ?paper=AFM —
// the G1 regression, reintroduced by the fix for this one.
console.log('\n-- the id-addressed tutor fetches scope to the SET, not to one paper --');
for (const f of ['app/acca/tutor/page.tsx', 'app/api/acca/tutor/route.ts']) {
  const text = readFileSync(join(ROOT, ...f.split('/')), 'utf8');
  ok(`${f} imports SERVED_PAPERS`, /import\s*\{[^}]*\bSERVED_PAPERS\b[^}]*\}\s*from\s*'@\/lib\/acca\/paper'/.test(text));
  ok(`${f} constrains an id-addressed fetch with .in('paper_code', [...SERVED_PAPERS])`,
    text.includes(".in('paper_code', [...SERVED_PAPERS])"));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} test-drill-paper-scope-sweep: ${pass} ok, ${fail} failed`);
process.exitCode = fail === 0 ? 0 : 1;
