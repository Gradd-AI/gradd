// scripts/authoring/reauthor-afm-requirement.ts
//
// P-DB2 RE-AUTHOR of ONE numeric requirement on a PUBLISHED AFM case.
// Committed under P-DB6 — it writes published content, so it is the record of what was written.
//
// WHY THIS EXISTS RATHER THAN `author-afm-case.ts --insert`. The authoring path DELETES and
// re-inserts a case, and it inserts as `candidate` / `published=false`. Running it against a
// published case would take that case DARK — the practice library would lose it, silently, as a
// side effect of a content fix. So this script re-authors the CONTENT through the same builder
// (`buildNumericRequirement` — the identical function the authoring path calls, so nothing is
// hand-typed) and applies only the fields that legitimately changed, leaving `status`,
// `published` and every other column untouched.
//
// THE OCCASION. `buildEnpvModelAnswer` gained an injected count line ("2 of 3 scenarios return a
// negative NPV…") as the primary defence in ADVICE-vs-COMPUTED. Halvard Marine ASA
// (`ac000000-…-b101`) was published before that, so its stored model_answer lagged the builder.
//
// P-DB4 IS SPECIFIC HERE, not generic. Beyond "what changed", it asserts the things that MUST NOT
// have moved even though the whole schema was rebuilt: every `expected_value` byte-identical,
// `params` unchanged, component ids and component COUNT unchanged. A rebuild that silently moved
// a figure would be a content change wearing a formatting change's clothes.
//
// Run: npx tsx --env-file=.env.local scripts/authoring/reauthor-afm-requirement.ts \
//        --spec <path> --order <n> [--apply]

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { buildNumericRequirement, type AfmCaseSpec } from '../../lib/acca/case-authoring-spec';

const argOf = (f: string) => { const i = process.argv.indexOf(f); return i >= 0 ? (process.argv[i + 1] ?? null) : null; };
const APPLY = process.argv.includes('--apply');
const SPEC_PATH = argOf('--spec');
const ORDER = Number(argOf('--order') ?? NaN);

const canon = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.keys(o).sort().reduce<Record<string, unknown>>((a, k) => { a[k] = canon(o[k]); return a; }, {});
  }
  return v;
};
const eq = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

interface Comp { component_id: string; expected_value?: number }
const compsOf = (schema: unknown): Comp[] => {
  const s = schema as { components?: Comp[] } | null;
  return (s && typeof s === 'object' && Array.isArray(s.components)) ? s.components : [];
};
const paramsOf = (schema: unknown) => (schema as { params?: unknown } | null)?.params ?? null;

async function main() {
  if (!SPEC_PATH) throw new Error('--spec <path> is required');
  if (!Number.isInteger(ORDER)) throw new Error('--order <n> is required');

  const mod = await import(pathToFileURL(resolve(SPEC_PATH)).href);
  const unwrap = (v: unknown): unknown =>
    v && typeof v === 'object' && 'default' in (v as object) && !('frame' in (v as object))
      ? unwrap((v as { default: unknown }).default) : v;
  const spec = unwrap(mod.default) as AfmCaseSpec;
  if (!spec?.frame) throw new Error('spec has no AfmCaseSpec default export');

  const numericSpec = (spec.numeric ?? []).find((r) => r.requirement_order === ORDER);
  if (!numericSpec) throw new Error(`no NUMERIC requirement at order ${ORDER} in this spec`);

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // ── Read the live row IN FULL — this is the P-DB4 baseline, read from the row ──
  const { data: rows, error } = await supabase
    .from('acca_case_requirements').select('*')
    .eq('case_id', spec.frame.id).eq('requirement_order', ORDER);
  if (error) throw error;
  const before = (rows ?? [])[0] as Record<string, unknown> | undefined;
  if (!before) throw new Error(`no live requirement row for case ${spec.frame.id} order ${ORDER}`);

  const { data: caseRows } = await supabase
    .from('acca_cases').select('id, title, status, published').eq('id', spec.frame.id);
  const caseRow = (caseRows ?? [])[0] as { title: string; status: string; published: boolean } | undefined;
  if (!caseRow) throw new Error('case row not found');

  // ── RE-AUTHOR through the SAME builder the authoring path uses ──
  const built = buildNumericRequirement(numericSpec);

  console.log('='.repeat(96));
  console.log(`  P-DB2 RE-AUTHOR — ${caseRow.title} · requirement ${ORDER} (${built.lo})`);
  console.log(`  case status: ${caseRow.status} · published: ${caseRow.published}`);
  console.log(`  mode: ${APPLY ? 'APPLY' : 'DRY RUN (pass --apply to write)'}`);
  console.log('='.repeat(96));

  // ── WHAT CHANGES, field by field ──
  const fields = ['question', 'model_answer', 'hint', 'full_reveal'] as const;
  const nextValues: Record<string, unknown> = {
    question: built.question, model_answer: built.model_answer,
    hint: built.hint, full_reveal: built.full_reveal, answer_schema: built.serialized,
  };
  console.log('\n  FIELD DIFF');
  const changed: string[] = [];
  for (const f of fields) {
    const same = before[f] === nextValues[f];
    if (!same) changed.push(f);
    console.log(`    ${same ? '=' : '≠'} ${f.padEnd(14)} ${same ? 'unchanged' : `CHANGES (${String(before[f]).length} → ${String(nextValues[f]).length} chars)`}`);
  }
  const schemaSame = eq(before.answer_schema, built.serialized);
  if (!schemaSame) changed.push('answer_schema');
  console.log(`    ${schemaSame ? '=' : '≠'} ${'answer_schema'.padEnd(14)} ${schemaSame ? 'unchanged (key-order-insensitive)' : 'CHANGES'}`);

  // ── THE INVARIANTS — what must NOT move ──
  const bc = compsOf(before.answer_schema), ac = compsOf(built.serialized);
  const idsBefore = bc.map((c) => c.component_id), idsAfter = ac.map((c) => c.component_id);
  const valuesHold = bc.length === ac.length && bc.every((c, i) =>
    c.component_id === ac[i].component_id && Object.is(c.expected_value, ac[i].expected_value));
  const paramsHold = eq(paramsOf(before.answer_schema), paramsOf(built.serialized));

  console.log('\n  INVARIANTS (must hold even though the schema was rebuilt)');
  console.log(`    ${bc.length === ac.length ? '✓' : '✗'} component COUNT unchanged: ${bc.length} → ${ac.length}`);
  console.log(`    ${eq(idsBefore, idsAfter) ? '✓' : '✗'} component IDS unchanged`);
  console.log(`    ${valuesHold ? '✓' : '✗'} every expected_value byte-identical`);
  console.log(`    ${paramsHold ? '✓' : '✗'} params unchanged`);
  if (!valuesHold) {
    for (let i = 0; i < Math.max(bc.length, ac.length); i++) {
      const b = bc[i], a = ac[i];
      if (!b || !a || b.component_id !== a.component_id || !Object.is(b.expected_value, a.expected_value)) {
        console.log(`        ✗ ${b?.component_id ?? '(missing)'}: ${String(b?.expected_value)} → ${String(a?.expected_value)}`);
      }
    }
  }
  if (!valuesHold || !paramsHold || !eq(idsBefore, idsAfter)) {
    throw new Error('INVARIANT BROKEN — this is a content change, not a re-author. Refusing.');
  }

  // ── Show the material change ──
  if (changed.includes('model_answer')) {
    const b = String(before.model_answer).split('\n'), a = built.model_answer.split('\n');
    const added = a.filter((l) => l.trim() && !b.includes(l));
    const removed = b.filter((l) => l.trim() && !a.includes(l));
    console.log('\n  MODEL_ANSWER LINE DIFF');
    for (const l of removed) console.log(`    - ${l.slice(0, 180)}`);
    for (const l of added)   console.log(`    + ${l.slice(0, 180)}`);
  }
  console.log(`\n  fields that would be written: ${changed.length ? changed.join(', ') : '(none — nothing to do)'}`);
  if (changed.length === 0) { console.log('\n  Nothing to write.\n'); return; }

  // ── P-DB3 snapshot BEFORE ──
  const SNAP = `docs/rollbacks/AFM_reauthor_${String(spec.frame.id).slice(-4)}_r${ORDER}_20260801.json`;
  mkdirSync(dirname(SNAP), { recursive: true });
  writeFileSync(SNAP, JSON.stringify({ reason: 'P-DB2 re-author — injected count line', row: before }, null, 2));
  console.log(`  P-DB3 snapshot: ${SNAP}`);

  if (!APPLY) { console.log('\n  DRY RUN — nothing written.\n'); return; }

  const patch: Record<string, unknown> = {};
  for (const f of changed) patch[f] = nextValues[f];
  const { error: upErr } = await supabase
    .from('acca_case_requirements').update(patch)
    .eq('case_id', spec.frame.id).eq('requirement_order', ORDER);
  if (upErr) throw upErr;

  // ── P-DB4 POST-VERIFY ──
  const { data: afterRows } = await supabase
    .from('acca_case_requirements').select('*')
    .eq('case_id', spec.frame.id).eq('requirement_order', ORDER);
  const after = (afterRows ?? [])[0] as Record<string, unknown>;

  console.log('\n  P-DB4 POST-VERIFY');
  let bad = 0;
  for (const k of Object.keys(before)) {
    const expected = changed.includes(k) ? nextValues[k] : before[k];
    const same = eq(after[k], expected);
    if (!same) { bad++; console.log(`    ✗ ${k} did not land as expected`); }
  }
  const ac2 = compsOf(after.answer_schema);
  const valuesHold2 = bc.length === ac2.length && bc.every((c, i) =>
    c.component_id === ac2[i].component_id && Object.is(c.expected_value, ac2[i].expected_value));
  const paramsHold2 = eq(paramsOf(before.answer_schema), paramsOf(after.answer_schema));
  console.log(`    ${valuesHold2 ? '✓' : '✗'} every expected_value byte-identical after the write`);
  console.log(`    ${paramsHold2 ? '✓' : '✗'} params unchanged after the write`);
  console.log(`    ${bad === 0 ? '✓' : '✗'} every column is either the intended new value or its exact prior value`);

  const { data: caseAfter } = await supabase.from('acca_cases').select('status, published').eq('id', spec.frame.id);
  const ca = (caseAfter ?? [])[0] as { status: string; published: boolean };
  const stayedLive = ca.status === caseRow.status && ca.published === caseRow.published;
  console.log(`    ${stayedLive ? '✓' : '✗'} the case is STILL ${ca.status}/published=${ca.published} — the re-author did not take it dark`);

  if (bad || !valuesHold2 || !paramsHold2 || !stayedLive) { console.error('\n  ✗ P-DB4 FAILED\n'); process.exit(1); }
  console.log('\n  ✓ P-DB4 PASS\n');
}

main().catch((e) => { console.error('FAILED:', (e as Error).message); process.exit(1); });
