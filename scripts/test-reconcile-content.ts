// scripts/test-reconcile-content.ts
// Fixtures for GATE-P's CONTENT ARM (lib/acca/reconcile-content.ts).
// PURE — no env, no DB, no model, no network. Run: npm run test:reconcile-content
//
// The rule under test: a flip carries STATUS, NOT CONTENT. The status arm compares identifiers
// and cannot see that a correctly-approved, correctly-journalled row holds superseded text. This
// arm opens the row and compares it, field by field, against the draft that was actually
// reviewed — and blocks the flip on any difference.
//
// EVERY FAILURE PATH IS EXERCISED (P-G3). A check nobody has watched go red is not a check: the
// cases below drive each blocking reason on its own, and the two "looks like drift but is not"
// cases (jsonb key reordering, and a row that matches) drive the green side, because an arm that
// blocks unconditionally would also have "caught" the SBL batch and would be worthless.

import {
  CONTENT_FIELDS,
  canonicalise,
  diffPaths,
  firstDivergence,
  compareField,
  reconcileContent,
  formatContentReport,
  assertContentReconciled,
  type ContentRow,
  type ContentDraft,
} from '../lib/acca/reconcile-content';

let failures = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}

// ── a minimal but realistically-shaped rubric ───────────────────────────────────────────────
const schema = () => ({
  mode: 'narrative',
  rubric_version: 2,
  total_marks: 12,
  scenario_facts: [{ key: 'f1', text: 'The board met twice.' }],
  criteria: [
    { id: 'c1', marks: 2, required_point: 'Weigh the significance of the survey.' },
    { id: 'c2', marks: 2, required_point: 'Tie it to this organisation.' },
  ],
  _authoring: { golden_bad: 'A generic answer.' },
});

const baseRow = (over: Partial<ContentRow> = {}): ContentRow => ({
  id: 'aaaaaaaa-0000-4000-8000-000000000001',
  lo_code: 'A1a',
  context_text: 'The scenario.',
  model_answer: 'The golden good.',
  answer_schema: schema(),
  hint: 'A hint.',
  full_reveal: 'The reveal.',
  ...over,
});

const baseDraft = (over: Partial<ContentDraft['row']> = {}, meta: Partial<ContentDraft> = {}): ContentDraft => ({
  plan_id: 'SBL-A1',
  lo_code: 'A1a',
  source_file: 'SBL_narrative_draft_SBL-A1.json',
  row: {
    context_text: 'The scenario.',
    model_answer: 'The golden good.',
    answer_schema: schema(),
    hint: 'A hint.',
    full_reveal: 'The reveal.',
    ...over,
  },
  ...meta,
});

// ── the field list is the shared contract ───────────────────────────────────────────────────
console.log('\n-- CONTENT_FIELDS: the list the check and the sync share --');
ok('exactly the five content fields', CONTENT_FIELDS.length === 5);
for (const f of ['context_text', 'model_answer', 'answer_schema', 'hint', 'full_reveal']) {
  ok(`  covers ${f}`, (CONTENT_FIELDS as readonly string[]).includes(f));
}
for (const f of ['status', 'published', 'id', 'created_at', 'question', 'lo_code', 'paper_code']) {
  ok(`  does NOT cover ${f}`, !(CONTENT_FIELDS as readonly string[]).includes(f));
}

// ── canonicalisation: keys yes, arrays no ───────────────────────────────────────────────────
console.log('\n-- canonicalise: object key order is noise, array order is signal --');
ok('key order is normalised',
  JSON.stringify(canonicalise({ b: 1, a: 2 })) === JSON.stringify(canonicalise({ a: 2, b: 1 })));
ok('nested key order is normalised',
  JSON.stringify(canonicalise({ x: { d: 1, c: 2 } })) === JSON.stringify(canonicalise({ x: { c: 2, d: 1 } })));
ok('array order is PRESERVED (a reordered rubric is a content change)',
  JSON.stringify(canonicalise([1, 2])) !== JSON.stringify(canonicalise([2, 1])));

// ── diffPaths ───────────────────────────────────────────────────────────────────────────────
console.log('\n-- diffPaths: name the path, do not just say "the schema differs" --');
ok('a changed leaf is named by path',
  diffPaths({ a: { b: 1 } }, { a: { b: 2 } }).join() === 'a.b');
ok('an array element is named by index',
  diffPaths({ c: [{ p: 1 }, { p: 2 }] }, { c: [{ p: 1 }, { p: 9 }] }).join() === 'c[1].p');
ok('a key missing on the row is named as such',
  diffPaths({}, { k: 1 }).join() === 'k [missing on row]');
ok('a key missing on the draft is named as such',
  diffPaths({ k: 1 }, {}).join() === 'k [missing on draft]');
ok('an array length change is reported',
  diffPaths([1], [1, 2]).some((p) => p.includes('length 1 vs 2')));
ok('a type change is reported', diffPaths({ a: 1 }, { a: [1] }).join().includes('[type]'));
ok('identical structures produce no paths', diffPaths(schema(), schema()).length === 0);
ok('the path list is capped',
  diffPaths(
    Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i])),
    Object.fromEntries(Array.from({ length: 100 }, (_, i) => [`k${i}`, i + 1])),
    10,
  ).length === 10);

// ── firstDivergence ─────────────────────────────────────────────────────────────────────────
console.log('\n-- firstDivergence: point at the byte, not at the field --');
ok('index of the first differing byte', firstDivergence('abcdef', 'abcXef').at === 3);
ok('a pure append diverges at the end of the shorter string',
  firstDivergence('abc', 'abcdef').at === 3);
ok('newlines are rendered, not printed raw', firstDivergence('a\nb', 'a\nc').row.includes('⏎'));

// ── compareField ────────────────────────────────────────────────────────────────────────────
console.log('\n-- compareField --');
ok('identical strings match', compareField('hint', 'x', 'x').match === true);
ok('different strings do not match', compareField('hint', 'x', 'y').match === false);
ok('a string mismatch carries a divergence, not paths',
  compareField('hint', 'x', 'y').divergence !== undefined && compareField('hint', 'x', 'y').paths === undefined);

// THE WHITESPACE RULE. "It's only a trailing space" is still a row that is not the reviewed
// text. The sync's job is to make them equal; it is not this check's job to decide the gap is
// small enough to publish past.
ok('a trailing-space difference is a MISMATCH', compareField('hint', 'x ', 'x').match === false);
ok('a newline difference is a MISMATCH', compareField('hint', 'a\nb', 'a b').match === false);

// null and '' are different values.
ok('null vs empty string is a MISMATCH', compareField('hint', null, '').match === false);
ok('null vs null matches', compareField('hint', null, null).match === true);
ok('undefined is normalised to null', compareField('hint', undefined, null).match === true);

// THE PHANTOM-DRIFT CASE. jsonb does not preserve key order; a row that round-tripped through
// Postgres unchanged must NOT read as drift, or the arm cries wolf on every flip.
const reordered = { total_marks: 12, mode: 'narrative', rubric_version: 2, scenario_facts: schema().scenario_facts, criteria: schema().criteria, _authoring: schema()._authoring };
ok('answer_schema with reordered KEYS matches (jsonb phantom drift)',
  compareField('answer_schema', reordered, schema()).match === true);

const reorderedCriteria = { ...schema(), criteria: [schema().criteria[1], schema().criteria[0]] };
ok('answer_schema with reordered CRITERIA does NOT match (rubric order is content)',
  compareField('answer_schema', reorderedCriteria, schema()).match === false);

const editedCriterion = JSON.parse(JSON.stringify(schema()));
editedCriterion.criteria[1].required_point = 'Tie it to this organisation, and say why it matters.';
ok('an edited criterion is caught and named by path',
  compareField('answer_schema', editedCriterion, schema()).paths?.join() === 'criteria[1].required_point');

// ── the arm, green ──────────────────────────────────────────────────────────────────────────
console.log('\n-- reconcileContent: the green case --');
const clean = reconcileContent([baseRow()], [baseDraft()]);
ok('an in-sync row passes', clean.blocked === false && clean.mismatched.length === 0);
ok('the verdict names the source file it read',
  clean.verdicts[0].source_file === 'SBL_narrative_draft_SBL-A1.json');
ok('every field is reported, not just the failing ones', clean.verdicts[0].fields.length === 5);
ok('the green report says so', formatContentReport(clean).includes('CONTENT ARM PASSES'));
ok('assertContentReconciled does not throw when clean', (() => {
  try { assertContentReconciled(clean); return true; } catch { return false; }
})());

// ── the arm, red: one field on one row ──────────────────────────────────────────────────────
console.log('\n-- reconcileContent: a superseded row --');
const stale = reconcileContent(
  [baseRow({ model_answer: 'The golden good, pre-review.' })],
  [baseDraft()],
);
ok('a superseded row BLOCKS', stale.blocked === true);
ok('it names the plan id', stale.mismatched.join() === 'SBL-A1');
ok('it names the field', stale.verdicts[0].fields.find((f) => f.field === 'model_answer')?.match === false);
ok('the other four fields still report ok',
  stale.verdicts[0].fields.filter((f) => f.match).length === 4);
ok('the red report says the flip is blocked', formatContentReport(stale).includes('CONTENT ARM BLOCKS THE FLIP'));
ok('assertContentReconciled THROWS when blocked', (() => {
  try { assertContentReconciled(stale); return false; } catch { return true; }
})());

// ── the arm, red: unpaired in each direction ────────────────────────────────────────────────
console.log('\n-- unpaired blocks, in BOTH directions --');
const noRow = reconcileContent([], [baseDraft()]);
ok('a draft with no row BLOCKS', noRow.blocked === true && noRow.draftsWithoutRow.join() === 'SBL-A1');
ok('  and is not silently counted as a pass', noRow.verdicts.length === 0);

const noDraft = reconcileContent([baseRow()], []);
ok('a row with no draft BLOCKS', noDraft.blocked === true && noDraft.rowsWithoutDraft.length === 1);
ok('  the report names it', formatContentReport(noDraft).includes('ROW WITH NO DRAFT'));

// ── the arm, red: the pairing key is not 1:1 ────────────────────────────────────────────────
console.log('\n-- an ambiguous pairing key is refused, never guessed at --');
const dupRows = reconcileContent(
  [baseRow(), baseRow({ id: 'aaaaaaaa-0000-4000-8000-000000000002' })],
  [baseDraft()],
);
ok('two rows on one lo_code BLOCK', dupRows.blocked === true);
ok('  the lo_code is named as ambiguous', dupRows.ambiguous.join() === 'A1a');
ok('  and NEITHER row was paired (no coin-flip)', dupRows.verdicts.length === 0);

const dupDrafts = reconcileContent(
  [baseRow()],
  [baseDraft(), baseDraft({}, { plan_id: 'SBL-A9' })],
);
ok('two drafts on one lo_code BLOCK', dupDrafts.blocked === true && dupDrafts.ambiguous.join() === 'A1a');

// ── the arm over a batch: one bad among several good ────────────────────────────────────────
console.log('\n-- a batch: the arm must name the bad row and only the bad row --');
const batchRows: ContentRow[] = ['A1a', 'A2b', 'A2d', 'A3a'].map((lo, i) => baseRow({
  id: `aaaaaaaa-0000-4000-8000-00000000000${i + 1}`,
  lo_code: lo,
  ...(lo === 'A2d' ? { full_reveal: 'The reveal, pre-review.' } : {}),
}));
const batchDrafts: ContentDraft[] = ['A1a', 'A2b', 'A2d', 'A3a'].map((lo, i) => baseDraft({}, {
  plan_id: `SBL-A${i + 1}`,
  lo_code: lo,
  source_file: `SBL_narrative_draft_SBL-A${i + 1}.json`,
}));
const batch = reconcileContent(batchRows, batchDrafts);
ok('the batch BLOCKS', batch.blocked === true);
ok('exactly one row is named', batch.mismatched.join() === 'SBL-A3');
ok('the other three pass', batch.verdicts.filter((v) => v.match).length === 3);
ok('the failing field is the reveal',
  batch.verdicts.find((v) => v.plan_id === 'SBL-A3')?.fields.find((f) => f.field === 'full_reveal')?.match === false);

// ── the superseded-sibling trap (why loadDraft, not a bare glob) ────────────────────────────
// A4's live content is in SBL-A4.2.json; SBL-A4.json holds the pre-rebuild version. An arm fed
// the wrong sibling reports GREEN on a drill that no longer exists. The resolver is the runner's
// job, but the arm must at least SAY which file it compared, so a reader can check.
console.log('\n-- the arm reports WHICH file it read --');
const a4 = reconcileContent(
  [baseRow({ lo_code: 'A3d' })],
  [baseDraft({}, { plan_id: 'SBL-A4', lo_code: 'A3d', source_file: 'SBL_narrative_draft_SBL-A4.2.json' })],
);
ok('the source file appears in the report', formatContentReport(a4).includes('SBL_narrative_draft_SBL-A4.2.json'));

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} test-reconcile-content: ${failures} failure(s)`);
process.exitCode = failures === 0 ? 0 : 1;
