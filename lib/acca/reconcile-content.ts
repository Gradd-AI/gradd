// lib/acca/reconcile-content.ts
//
// GATE-P's CONTENT ARM. Pure — no DB, no env, no network, no fs. The caller supplies the rows
// and the drafts; this decides whether the flip may proceed.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────────
// A FLIP CARRIES STATUS, NOT CONTENT.
//
// GATE-P's reconcile, as it stood, compared two SETS OF IDENTIFIERS: the DB's approved-set
// against the journal's reviewed-set. That answers "is every approved row one a review record
// exists for, and is every reviewed row approved?" — entirely a question about STATUS. It never
// opens a row and never compares a single character of what the row actually says.
//
// The gap it cannot see, found on 2026-08-21 on the SBL batch: a row can be correctly
// `candidate`, correctly journalled as reviewed with every finding applied, and still hold text
// that was superseded days ago — BECAUSE THE REVIEWING HAPPENED SOMEWHERE THE RECONCILE DOES NOT
// LOOK. The five SBL rows held the batch exactly as inserted on 2026-08-19; reads 2, 3 and 4
// were applied only to `docs/rollbacks/*.json`. Both halves of the status reconcile would have
// passed while `candidate → approved → published` published two known publication blockers and a
// live arithmetic error. Nothing in GATE-P syncs a draft to its row, and until this file, no
// gate compared them.
//
// So the third arm asks the question the other two cannot: IS THE CONTENT IN THIS ROW THE
// CONTENT THAT WAS REVIEWED?
//
// ── THE FIVE FIELDS, AND WHY THIS CONSTANT IS SHARED ──────────────────────────────────────
// `CONTENT_FIELDS` is imported by BOTH the check and the sync that feeds it. That coupling is
// deliberate and structural, in the same spirit as `DEFAULT_PAPER` in paper.ts: if the sync
// wrote a field the check did not compare, the check would go green over unreviewed text — the
// precise failure this file exists to end. One list, both sides, they cannot disagree.
//
// ── WHAT COUNTS AS A DIFFERENCE ───────────────────────────────────────────────────────────
//  · OBJECT KEY ORDER IS NOT A DIFFERENCE. jsonb does not preserve key order, so a raw
//    stringify diff reports phantom drift on a row that round-tripped through Postgres
//    unchanged. Keys are sorted before comparison. (Same lesson as publish-afm-case.ts's
//    P-DB4 canonicalisation, which learned it the same way.)
//  · ARRAY ORDER *IS* A DIFFERENCE. `criteria` is an ordered rubric — c1..c6 is the order a
//    marker reads and the order the marks are apportioned in. Sorting arrays "for consistency"
//    would blind the check to a reordered rubric, which is a real content change.
//  · STRINGS ARE COMPARED BYTE-EXACT. No trim, no whitespace collapse, no unicode folding. A
//    difference that is "only whitespace" is still a row that is not the reviewed text, and the
//    sync's job is to make them equal — not this check's job to decide the gap is tolerable.
//  · null AND '' ARE DIFFERENT VALUES. A nullable column that holds null is not a column that
//    holds the empty string the draft carries.
//
// ── UNPAIRED BLOCKS, IN BOTH DIRECTIONS ───────────────────────────────────────────────────
// A draft with no row, or a row with no draft, is a HARD STOP — not a skip. The check's whole
// claim is "every row about to be flipped holds reviewed content"; a row it could not pair is a
// row it cannot make that claim about, and silently passing it would be the status arm's own
// blind spot rebuilt one level down.

/**
 * The content fields a review can move, and therefore the fields a flip must prove unmoved
 * since review. Shared by the check and the sync — see the header.
 *
 * NOT in this list, deliberately: `status` and `published` (the flip's own fields — comparing
 * them would make every pre-flip check red for the one reason that is expected), `id` and
 * `created_at` (row identity, which a draft has no opinion about), and `question` / `lo_code` /
 * `paper_code` / `topic` (structural fields fixed at authoring; they are asserted UNCHANGED by
 * the sync's P-DB4 field-diff rather than synced, so a read that moved one is a finding, not a
 * silent overwrite).
 */
export const CONTENT_FIELDS = [
  'context_text',
  'model_answer',
  'answer_schema',
  'hint',
  'full_reveal',
] as const;

export type ContentField = (typeof CONTENT_FIELDS)[number];

/** The shape the check needs from a DB row. Extra columns are ignored. */
export type ContentRow = { id: string; lo_code: string } & Partial<Record<ContentField, unknown>>;

/** The shape the check needs from a resolved draft. */
export type ContentDraft = {
  plan_id: string;
  lo_code: string;
  /** The file the draft was resolved from — reported so a reader can check WHICH file was read. */
  source_file: string;
  row: Partial<Record<ContentField, unknown>>;
};

export type FieldVerdict = {
  field: ContentField;
  match: boolean;
  /** For a string field: the byte index of the first divergence, with a window either side. */
  divergence?: { at: number; row: string; draft: string };
  /** For a structured field: the JSON paths that differ, e.g. `criteria[5].required_point`. */
  paths?: string[];
};

export type RowVerdict = {
  plan_id: string;
  drill_id: string;
  lo_code: string;
  source_file: string;
  fields: FieldVerdict[];
  match: boolean;
};

export type ContentReconcileResult = {
  verdicts: RowVerdict[];
  /** plan_ids whose row content is not the reviewed content. */
  mismatched: string[];
  /** plan_ids with no DB row to pair against. */
  draftsWithoutRow: string[];
  /** drill ids with no draft to pair against. */
  rowsWithoutDraft: string[];
  /** lo_codes that appear on more than one row or draft — the pairing key is not 1:1. */
  ambiguous: string[];
  /** TRUE means the flip must not proceed. */
  blocked: boolean;
};

// ── canonicalisation ────────────────────────────────────────────────────────────────────────

/** Sort OBJECT keys recursively; leave ARRAY order alone. See the header for why. */
export function canonicalise(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonicalise);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.keys(o).sort().reduce<Record<string, unknown>>((acc, k) => {
      acc[k] = canonicalise(o[k]);
      return acc;
    }, {});
  }
  return v;
}

/**
 * The JSON paths at which two values differ. Walks both sides, so a key present on one and
 * absent on the other is reported at its own path rather than collapsing into "the parent
 * differs". Capped — a wholly-rewritten schema should not print a thousand lines.
 */
export function diffPaths(a: unknown, b: unknown, limit = 40, path = '', out: string[] = []): string[] {
  if (out.length >= limit) return out;

  const aIsArr = Array.isArray(a);
  const bIsArr = Array.isArray(b);
  if (aIsArr || bIsArr) {
    if (!aIsArr || !bIsArr) { out.push(`${path || '(root)'} [type]`); return out; }
    const arrA = a as unknown[];
    const arrB = b as unknown[];
    if (arrA.length !== arrB.length) out.push(`${path || '(root)'} [length ${arrA.length} vs ${arrB.length}]`);
    for (let i = 0; i < Math.max(arrA.length, arrB.length) && out.length < limit; i++) {
      diffPaths(arrA[i], arrB[i], limit, `${path}[${i}]`, out);
    }
    return out;
  }

  const aIsObj = a !== null && typeof a === 'object';
  const bIsObj = b !== null && typeof b === 'object';
  if (aIsObj || bIsObj) {
    if (!aIsObj || !bIsObj) { out.push(`${path || '(root)'} [type]`); return out; }
    const oA = a as Record<string, unknown>;
    const oB = b as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(oA), ...Object.keys(oB)])].sort();
    for (const k of keys) {
      if (out.length >= limit) break;
      const child = path ? `${path}.${k}` : k;
      if (!(k in oA)) { out.push(`${child} [missing on row]`); continue; }
      if (!(k in oB)) { out.push(`${child} [missing on draft]`); continue; }
      diffPaths(oA[k], oB[k], limit, child, out);
    }
    return out;
  }

  if (a !== b) out.push(path || '(root)');
  return out;
}

/** First differing byte index of two strings, with a readable window either side. */
export function firstDivergence(rowVal: string, draftVal: string, window = 45): { at: number; row: string; draft: string } {
  let i = 0;
  while (i < rowVal.length && i < draftVal.length && rowVal[i] === draftVal[i]) i++;
  const from = Math.max(0, i - Math.floor(window / 3));
  const slice = (s: string) => {
    const head = from > 0 ? '…' : '';
    const body = s.slice(from, from + window);
    const tail = from + window < s.length ? '…' : '';
    return `${head}${body.replace(/\n/g, '⏎')}${tail}`;
  };
  return { at: i, row: slice(rowVal), draft: slice(draftVal) };
}

// ── the comparison ──────────────────────────────────────────────────────────────────────────

/** Compare one field of one row against the draft. Undefined is normalised to null; nothing else is. */
export function compareField(field: ContentField, rowVal: unknown, draftVal: unknown): FieldVerdict {
  const r = rowVal === undefined ? null : rowVal;
  const d = draftVal === undefined ? null : draftVal;

  if (typeof r === 'string' && typeof d === 'string') {
    if (r === d) return { field, match: true };
    return { field, match: false, divergence: firstDivergence(r, d) };
  }

  const cr = canonicalise(r);
  const cd = canonicalise(d);
  if (JSON.stringify(cr) === JSON.stringify(cd)) return { field, match: true };
  const paths = diffPaths(cr, cd);
  return { field, match: false, paths: paths.length ? paths : ['(root)'] };
}

/**
 * The arm itself. Pairs rows to drafts on `lo_code` — the only key the two sides share, since a
 * draft carries no drill id and the row carries no plan id — and refuses to guess when that key
 * is not 1:1.
 */
export function reconcileContent(rows: ContentRow[], drafts: ContentDraft[]): ContentReconcileResult {
  const countBy = (xs: string[]) => xs.reduce<Record<string, number>>((a, k) => { a[k] = (a[k] ?? 0) + 1; return a; }, {});
  const rowCounts = countBy(rows.map((r) => r.lo_code));
  const draftCounts = countBy(drafts.map((d) => d.lo_code));
  const ambiguous = [...new Set([
    ...Object.keys(rowCounts).filter((k) => rowCounts[k] > 1),
    ...Object.keys(draftCounts).filter((k) => draftCounts[k] > 1),
  ])].sort();

  const rowByLo = new Map(rows.map((r) => [r.lo_code, r]));
  const pairedRowIds = new Set<string>();
  const verdicts: RowVerdict[] = [];
  const draftsWithoutRow: string[] = [];

  for (const draft of drafts) {
    if (ambiguous.includes(draft.lo_code)) continue;   // reported separately; never guessed at
    const row = rowByLo.get(draft.lo_code);
    if (!row) { draftsWithoutRow.push(draft.plan_id); continue; }
    pairedRowIds.add(row.id);
    const fields = CONTENT_FIELDS.map((f) => compareField(f, row[f], draft.row[f]));
    verdicts.push({
      plan_id: draft.plan_id,
      drill_id: row.id,
      lo_code: draft.lo_code,
      source_file: draft.source_file,
      fields,
      match: fields.every((f) => f.match),
    });
  }

  const rowsWithoutDraft = rows
    .filter((r) => !pairedRowIds.has(r.id) && !ambiguous.includes(r.lo_code))
    .map((r) => r.id);

  const mismatched = verdicts.filter((v) => !v.match).map((v) => v.plan_id);

  return {
    verdicts,
    mismatched,
    draftsWithoutRow,
    rowsWithoutDraft,
    ambiguous,
    blocked: mismatched.length > 0
      || draftsWithoutRow.length > 0
      || rowsWithoutDraft.length > 0
      || ambiguous.length > 0,
  };
}

/** Human-readable report. Kept here so the runner stays thin and the fixtures can pin the wording. */
export function formatContentReport(result: ContentReconcileResult): string {
  const out: string[] = [];
  for (const v of result.verdicts) {
    out.push(`  ${v.match ? '✓' : '✗'} ${v.plan_id}  ${v.drill_id.slice(0, 8)}  lo=${v.lo_code}  <- ${v.source_file}`);
    for (const f of v.fields) {
      if (f.match) { out.push(`       ok       ${f.field}`); continue; }
      out.push(`       MISMATCH ${f.field}`);
      if (f.divergence) {
        out.push(`         diverges at byte ${f.divergence.at}`);
        out.push(`           row  : ${f.divergence.row}`);
        out.push(`           draft: ${f.divergence.draft}`);
      }
      if (f.paths) for (const p of f.paths) out.push(`         ${p}`);
    }
  }
  if (result.ambiguous.length) out.push(`  ✗ AMBIGUOUS lo_code (pairing key not 1:1): ${result.ambiguous.join(', ')}`);
  if (result.draftsWithoutRow.length) out.push(`  ✗ DRAFT WITH NO ROW: ${result.draftsWithoutRow.join(', ')}`);
  if (result.rowsWithoutDraft.length) out.push(`  ✗ ROW WITH NO DRAFT: ${result.rowsWithoutDraft.map((i) => i.slice(0, 8)).join(', ')}`);
  out.push('');
  out.push(result.blocked
    ? `  ✗ CONTENT ARM BLOCKS THE FLIP — ${result.mismatched.length} row(s) hold content that is not the reviewed content.`
    : `  ✓ CONTENT ARM PASSES — all ${result.verdicts.length} row(s) hold exactly the reviewed content.`);
  return out.join('\n');
}

/** Throwing wrapper, for a caller that should not be able to continue past a block. */
export function assertContentReconciled(result: ContentReconcileResult): void {
  if (!result.blocked) return;
  throw new Error(
    'HARD STOP — GATE-P content arm. A flip carries status, not content: these rows would be '
    + 'published holding text that is not what was reviewed. '
    + `mismatched=[${result.mismatched.join(', ')}] `
    + `draftsWithoutRow=[${result.draftsWithoutRow.join(', ')}] `
    + `rowsWithoutDraft=[${result.rowsWithoutDraft.map((i) => i.slice(0, 8)).join(', ')}] `
    + `ambiguous=[${result.ambiguous.join(', ')}]`,
  );
}
