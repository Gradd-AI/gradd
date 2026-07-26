// scripts/scan-halfway-rounding.ts
// HALFWAY_ROUNDING_RISK sweep across every AFM drill and every AFM mock requirement,
// WITH MANDATORY PER-HIT RECONCILIATION AGAINST THE LIVE ROW.
//
// ── WHY RECONCILIATION IS BUILT IN RATHER THAN LEFT TO THE READER ────────────────────────
// This detector has produced two false positives, each of which nearly caused live published
// content to be re-authored:
//   FP1 — a naive substring test reported "96.5" present in prose that actually prints
//         "96.55" at 2 dp, where the value is unambiguous. (Fixed by rendersAsWholeNumber.)
//   FP2 — a reported `debt_issue_costs = -1.95` on B3k dedca530. Re-read from the live row on
//         2026-07-26 that component is -1.3, tolerance {relative, 0.5%} — 65 x 2.00% = 1.3
//         exactly, which sits on NO boundary at any precision. The hit was never real.
// A detector whose output has been wrong twice does not get to be believed on the third run.
// So every hit here is re-derived from the RAW row JSON before it is reported, and anything
// that fails to reconcile is emitted as a DETECTOR BUG, never as a content defect.
//
// READ-ONLY. This script performs no writes of any kind.

import { createClient } from '@supabase/supabase-js';
import { validateHalfwayRounding } from '../lib/acca/validate-schema';
import { isOnRoundingBoundary, fixedHalfUp, rendersAsWholeNumber } from '../lib/acca/rounding';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

interface Row {
  kind: 'drill' | 'requirement';
  id: string;
  label: string;              // lo_code for a drill, case+label for a requirement
  status: string;
  published: boolean;
  schema: { components?: Array<Record<string, unknown>> } | null;
  prose: string;
}

interface Reported {
  row: Row;
  component_id: string;
  code: string;
  value: number;              // the value the DETECTOR claims sits on a boundary
  dp: number;
  message: string;
}

// The detector's message is a fixed shape; pulling the claim back out of it is what lets us
// test the claim against the row instead of taking the detector's word for it.
const CLAIM = /^(.+?) = (-?[\d.eE+]+) sits on a half-way rounding boundary at the (\d+)-dp/;

function parseClaim(componentId: string, message: string): { value: number; dp: number } | null {
  const m = CLAIM.exec(message);
  if (!m || m[1] !== componentId) return null;
  const value = Number(m[2]);
  const dp = Number(m[3]);
  if (!Number.isFinite(value) || !Number.isInteger(dp)) return null;
  return { value, dp };
}

/** Independent re-derivation from the RAW stored row. Returns null when the claim holds, or a
 *  string naming the first way it fails to reconcile. */
function reconcile(r: Reported): string | null {
  const comps = r.row.schema?.components ?? [];
  const raw = comps.find((c) => c['component_id'] === r.component_id);
  if (!raw) return `component_id "${r.component_id}" does not exist in the live row's answer_schema`;

  const stored = raw['expected_value'];
  if (typeof stored !== 'number' || !Number.isFinite(stored)) {
    return `live expected_value is not a finite number (got ${JSON.stringify(stored)})`;
  }
  // THE CHECK THAT WOULD HAVE CAUGHT FP2: does the reported figure match the stored one?
  if (stored !== r.value) {
    return `reported value ${r.value} does NOT match the live expected_value ${stored}`;
  }
  // Does the boundary claim actually hold for the stored value at the claimed precision?
  if (!isOnRoundingBoundary(stored, r.dp)) {
    return `live value ${stored} is NOT on a rounding boundary at ${r.dp} dp`;
  }
  const naive = stored.toFixed(r.dp);
  const hand = fixedHalfUp(stored, r.dp);
  if (naive === hand) {
    return `naive and hand-working renderings agree ("${naive}") — there is no divergence to flag`;
  }
  // THE CHECK THAT WOULD HAVE CAUGHT FP1: is the artefact really in the prose as a complete
  // number, rather than as the prefix of a longer one?
  const norm = r.row.prose.replace(/,/g, '');
  const present =
    rendersAsWholeNumber(norm, naive) || rendersAsWholeNumber(norm, Math.abs(stored).toFixed(r.dp));
  if (!present) {
    return `the artefact rendering "${naive}" is not present in model_answer as a complete number`;
  }
  return null;
}

async function loadRows(): Promise<Row[]> {
  const rows: Row[] = [];

  const { data: drills, error: dErr } = await supabase
    .from('acca_drills')
    .select('id, lo_code, status, published, answer_schema, model_answer')
    .eq('paper_code', 'AFM');
  if (dErr) throw new Error(`drills: ${dErr.message}`);
  for (const d of drills ?? []) {
    rows.push({
      kind: 'drill',
      id: d.id as string,
      label: (d.lo_code as string) ?? '?',
      status: (d.status as string) ?? '?',
      published: !!d.published,
      schema: (d.answer_schema as Row['schema']) ?? null,
      prose: (d.model_answer as string) ?? '',
    });
  }

  // Mock requirements: every AFM case, whatever its publish state (the mock paper is
  // deliberately candidate/unpublished, so a published-only filter would scan nothing).
  const { data: cases, error: cErr } = await supabase
    .from('acca_cases')
    .select('id, title, status, published')
    .eq('paper_code', 'AFM');
  if (cErr) throw new Error(`cases: ${cErr.message}`);
  const caseById = new Map((cases ?? []).map((c) => [c.id as string, c]));

  if (caseById.size) {
    const { data: reqs, error: rErr } = await supabase
      .from('acca_case_requirements')
      .select('id, case_id, label, lo_code, answer_schema, model_answer')
      .in('case_id', [...caseById.keys()]);
    if (rErr) throw new Error(`requirements: ${rErr.message}`);
    for (const q of reqs ?? []) {
      const c = caseById.get(q.case_id as string)!;
      rows.push({
        kind: 'requirement',
        id: q.id as string,
        label: `${c.title as string} ${(q.label as string) ?? ''} [${(q.lo_code as string) ?? '?'}]`,
        status: (c.status as string) ?? '?',
        published: !!c.published,
        schema: (q.answer_schema as Row['schema']) ?? null,
        prose: (q.model_answer as string) ?? '',
      });
    }
  }
  return rows;
}

(async () => {
  const rows = await loadRows();
  const drills = rows.filter((r) => r.kind === 'drill');
  const reqs = rows.filter((r) => r.kind === 'requirement');
  const scannable = rows.filter((r) => (r.schema?.components?.length ?? 0) > 0 && r.prose);

  console.log('═'.repeat(78));
  console.log('HALFWAY_ROUNDING_RISK SWEEP — AFM drills + AFM mock requirements (READ-ONLY)');
  console.log('═'.repeat(78));
  console.log(`AFM drills:            ${drills.length}`);
  console.log(`AFM case requirements: ${reqs.length}`);
  console.log(`Numeric (scannable):   ${scannable.length}  — rows with components AND a model_answer`);
  console.log('');

  const genuineBlocking: Reported[] = [];
  const genuineAdvisory: Reported[] = [];
  const detectorBugs: Array<{ hit: Reported; why: string }> = [];
  const unparseable: Reported[] = [];

  for (const row of scannable) {
    const res = validateHalfwayRounding(row.schema as never, row.prose);
    for (const issue of res.issues) {
      const claim = parseClaim(issue.component_id, issue.message);
      const hit: Reported = {
        row,
        component_id: issue.component_id,
        code: issue.code,
        value: claim?.value ?? NaN,
        dp: claim?.dp ?? -1,
        message: issue.message,
      };
      if (!claim) { unparseable.push(hit); continue; }
      const why = reconcile(hit);
      if (why) detectorBugs.push({ hit, why });
      else if (issue.code === 'value-on-rounding-boundary') genuineBlocking.push(hit);
      else genuineAdvisory.push(hit);
    }
  }

  const show = (h: Reported) =>
    `  ${h.row.kind === 'drill' ? 'DRILL' : 'REQ  '} ${h.row.id.slice(0, 8)} ${h.row.label}` +
    ` [${h.row.status}${h.row.published ? '/published' : '/unpublished'}]\n` +
    `        ${h.component_id} = ${h.value} at ${h.dp} dp` +
    ` → prose "${Number.isFinite(h.value) ? h.value.toFixed(h.dp) : '?'}"` +
    ` vs hand "${Number.isFinite(h.value) ? fixedHalfUp(h.value, h.dp) : '?'}"`;

  console.log(`── BLOCKING (a correct student would be marked wrong): ${genuineBlocking.length}`);
  if (genuineBlocking.length === 0) console.log('  none');
  else genuineBlocking.forEach((h) => console.log(show(h)));
  console.log('');

  console.log(`── ADVISORY (real boundary, tolerance absorbs it — presentation only): ${genuineAdvisory.length}`);
  if (genuineAdvisory.length === 0) console.log('  none');
  else genuineAdvisory.forEach((h) => console.log(show(h)));
  console.log('');

  console.log(`── DETECTOR BUGS (hit does NOT reconcile against live data): ${detectorBugs.length}`);
  if (detectorBugs.length === 0) console.log('  none — every reported hit reconciled against the live row');
  else detectorBugs.forEach(({ hit, why }) => { console.log(show(hit)); console.log(`        ✗ ${why}`); });
  console.log('');

  if (unparseable.length) {
    console.log(`── UNPARSEABLE detector messages (also a detector bug): ${unparseable.length}`);
    unparseable.forEach((h) => console.log(`  ${h.row.id.slice(0, 8)} ${h.component_id}: ${h.message.slice(0, 120)}`));
    console.log('');
  }

  console.log('═'.repeat(78));
  console.log(
    `RESULT: ${genuineBlocking.length} blocking · ${genuineAdvisory.length} advisory · ` +
    `${detectorBugs.length + unparseable.length} detector bug(s)`,
  );
  console.log('No writes were performed.');
})();
