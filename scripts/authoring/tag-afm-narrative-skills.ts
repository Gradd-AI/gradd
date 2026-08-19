// scripts/authoring/tag-afm-narrative-skills.ts
//
// P-DB2 WRITE — set `professional_skill_tag` on the 8 PUBLISHED AFM narrative drills.
//
// WHY THESE ROWS ARE NULL. `runNarrativeBatch` in scripts/generate-acca-drills.ts hardcoded
// `professional_skill_tag: null` until 2026-08-01 (`86765ec`). Separately, the calculator
// batches' rotation was DEFEATED — `buildSpecsForList` declares `sectionIdx` local to each call
// and every caller passes ONE lo_code, so the index is always 0 and `deriveSkillTag` always
// returns pool[0]. Those two facts together are the whole published distribution: 48
// analysis_and_evaluation, 1 communication, 8 null, 0 scepticism, 0 commercial_acumen.
//
// THE TAG IS ASSESSED, NEVER ROTATED. Every entry below carries the criteria, marks and
// disqualifiers from that drill's OWN rubric that justify its tag, and the script PRINTS that
// justification before it writes anything. A drill whose rubric does not honestly demand a skill
// gets NO tag — `tag: null` is a valid, expected outcome and the script writes nothing for it.
// Two of the eight are assessed as `analysis_and_evaluation`, which is what the defect would have
// defaulted them to anyway; they are here because that is the honest reading of their rubrics,
// not to make the batch tidy.
//
// P-DB3 (snapshot before) and P-DB4 (post-verify against a baseline READ FROM THE ROWS) are both
// enforced in-script, not by hand:
//   • the full pre-write rows are written to docs/rollbacks/ and the script REFUSES to apply
//     unless that file is on disk;
//   • after the write it re-reads all 8 rows in full and asserts that `professional_skill_tag` is
//     the ONLY field that moved — every other field byte-identical under a key-order-insensitive
//     canonicalisation. jsonb does NOT preserve key order, so a raw JSON.stringify diff reports
//     phantom drift (learned the hard way, 2026-07-28).
//
// Run:  npx tsx --env-file=.env.local scripts/authoring/tag-afm-narrative-skills.ts [--apply]
// Default is a DRY RUN that prints the full proposed write and touches nothing.

import { createClient } from '@supabase/supabase-js';
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const APPLY = process.argv.includes('--apply');
const SNAPSHOT = 'docs/rollbacks/AFM_narrative_ps_tag_20260801.json';

type Skill = 'communication' | 'analysis_and_evaluation' | 'scepticism' | 'commercial_acumen';

interface Plan {
  id: string;          // full uuid
  short: string;
  lo: string;
  tag: Skill | null;   // null = the rubric does not honestly demand one; nothing is written
  /** The rubric evidence. Quoted from the row's OWN answer_schema, not paraphrased from memory. */
  evidence: string[];
  /** Stated honestly where the call is not clean. */
  caveat?: string;
}

// ── THE ASSESSMENT ────────────────────────────────────────────────────────────
// ACCA's own descriptors are the test (AFM S26–J27 Syllabus §F, mirrored in
// lib/acca/case-marking.ts AFM_SKILL_DESCRIPTORS):
//   scepticism        — "Question opinions, assertions and assumptions, by seeking justifications
//                        … Challenge and critically assess the information presented or decisions
//                        made, where this is clearly justified."
//   commercial_acumen — "Recognise key issues in a given scenario and use judgement in proposing
//                        and recommending commercially viable solutions."
//   analysis_and_eval — "Consider information, evidence and findings carefully, reflecting on
//                        their implications … Appraise information objectively."
const PLAN: Plan[] = [
  {
    id: '08044fb6-eecb-4498-9c16-56381f66dc92', short: '08044fb6', lo: 'B3a',
    tag: 'commercial_acumen',
    evidence: [
      'c5 (3 marks, the heaviest criterion): "The board should adopt a green ijara sukuk as the primary instrument, because it is the only option that simultaneously satisfies all three binding constraints" — a committed recommendation reached by judgement against real constraints.',
      'c1–c4 weigh FOUR instruments against the group\'s own position: the 2.1x gearing covenant, the BB rating, the Shariah requirement, the green mandate. Each rejection is commercial, not technical.',
      'Anchor facts are all business constraints (f_gearing, f_rating, f_shariah, f_green, f_capacity), not model parameters.',
      'Maps to "use judgement in proposing and recommending commercially viable solutions" almost word for word.',
    ],
  },
  {
    id: '32ef124c-350e-4fb9-a02f-dd4e8e7f529f', short: '32ef124c', lo: 'B5c',
    tag: 'commercial_acumen',
    evidence: [
      'c4 (2 marks): deploy the NGN 42bn trapped cash "productively within Nigeria — for example by using it to fund the local leg of the African distribution" — proposing a practical commercial use for a blocked asset.',
      'c8 (2 marks): "On balance, the board should prefer the Eurobond: because the trapped NGN 42 billion means the group is already equity-rich in Nigeria" — a committed financing recommendation justified by the group\'s own position.',
      'c5 transfer pricing on management fees/royalties/intercompany interest — a commercial workaround, not a technique.',
      'The exchange-control facts (remittance cap, 14-month delay, trapped balance) are all external factors affecting a financial-management decision — the descriptor\'s opening clause.',
    ],
  },
  {
    id: '55181aa8-dcde-42cd-8c01-dbd0b392a734', short: '55181aa8', lo: 'E1a',
    tag: 'commercial_acumen',
    evidence: [
      'c1 (2 marks): "WHERE within South America to site it and how much financial autonomy to leave with the local desks" — an organisational judgement call, with no technique to apply.',
      'c3/c4 trace the consequences for the subsidiary desks and for Osaka: who loses autonomy, who moves from running activity to overseeing it. Business consequences of a structural decision.',
      'The F7 disqualifier penalises generic centralisation talk — the drill is built to force engagement with THIS group\'s position, which is the "insight and perception in understanding … wider organisational matters" clause.',
    ],
  },
  {
    id: 'd0be009d-2625-4f2d-a489-a52d798dbaea', short: 'd0be009d', lo: 'E1a',
    tag: 'commercial_acumen',
    evidence: [
      'c4 (2 marks): commit that the department is "justified on income-maximising/cost-saving grounds, not as an extra cost layer" — the chief executive\'s commercial test, answered commercially.',
      'c1/c2 are cash-and-liquidity and financing/tax-efficiency CONTRIBUTIONS — each measured by income maximised or cost saved, not by technique demonstrated.',
      'F7 is a disqualifier on three of the four criteria: generic treasury-function description earns nothing.',
    ],
  },
  {
    id: 'fda46d99-5d57-4017-9945-2d0c3ca55498', short: 'fda46d99', lo: 'B3i',
    tag: 'scepticism',
    evidence: [
      'c1 (3 marks): "Under MM without tax, capital structure is irrelevant to firm value, which DIRECTLY REFUTES THE CFO\'S IMPLICIT PREMISE" — the drill is built around challenging a named person\'s stated assertion.',
      'The question frames a CFO proposal to be assessed, not a calculation to be performed; every criterion tests the premise rather than executing a method.',
      'c4 (3 marks) reads the covenant breach threshold as evidence that "bondholders are already pricing in restriction" — questioning the proposal by seeking evidence, the descriptor\'s second clause.',
      'Maps to "Question opinions, assertions and assumptions, by seeking justifications and obtaining sufficient evidence for either their support and acceptance or rejection."',
    ],
  },
  {
    id: 'd413fbe7-63f3-492a-af97-8532e0c376c8', short: 'd413fbe7', lo: 'B4d',
    tag: 'scepticism',
    evidence: [
      'The requirement text itself names "the limitations of the model" as part (ii) — challenging the technique is not incidental, it is a stated part of the task.',
      'c4 (2 marks): BSOP "assumes asset values follow a continuous log-normal process with constant volatility, YET NJT\'s toll revenues depend on Indonesian traffic policy, regulatory..." — challenging a model assumption against this scenario\'s specifics.',
      'c5 (2 marks): the inputs "are not directly observable: NJT\'s IDR 18 trillion asset value IS ITSELF AN ESTIMATE" — questioning the reliability of the evidence the model runs on.',
      'c6 (1 mark) makes the overall verdict conditional on those limitations.',
    ],
    caveat:
      'THE ONE CALL TO OVERRULE IF YOU DISAGREE. Only 4-5 of the 12 marks (c4, c5, and the conditional c6) are the assumption-challenging part; c1-c3 (7 marks) are straight explanation of the BSOP framework, which is analysis_and_evaluation work. I tag it scepticism because the limitations are what discriminates a strong answer from a recited one, and because functionally this IS the drill to serve a student marked weak on scepticism — it contains worked examples of challenging a model. A reading of "analysis_and_evaluation, with a scepticism component" is defensible.',
  },
  {
    id: 'cb9b411c-40b3-4739-b70c-3d5b8e65e578', short: 'cb9b411c', lo: 'B1b',
    tag: 'analysis_and_evaluation',
    evidence: [
      'Every criterion INTERPRETS a given simulation output: mean NPV, standard deviation vs mean, P(negative), VaR at 95%, VaR contextualised against the capex. That is "consider information, evidence and findings carefully, reflecting on their implications".',
      'c6 concludes from the appraisal — but it weighs statistics, it does not challenge an assertion (no scepticism) and it proposes no commercial course of action (no commercial acumen).',
      'NOT a gap-filling tag: this is the tag the defect would have defaulted to, and it is independently the honest one. Recorded so the corpus count is not read as 2 more accidental rows.',
    ],
  },
  {
    id: 'f9f4f3d4-ff4c-4d73-854c-9150db322c14', short: 'f9f4f3d4', lo: 'E2a',
    tag: 'analysis_and_evaluation',
    evidence: [
      'c1-c3 identify and DESCRIBE three exposure types and distinguish which threaten cash flows vs reported figures — investigation and appraisal of the scenario\'s own facts.',
      'c4/c5 assess how each is managed, applied to this company\'s euro receipts and Kenyan subsidiary rather than as a generic hedging list.',
      'The F2 disqualifier (named-but-not-described) tests depth of analysis, not challenge: a candidate who names all three exposures and describes none fails on ANALYSIS, not on credulity.',
      'NOT a gap-filling tag — same note as cb9b411c.',
    ],
  },
];

const canon = (v: unknown): unknown => {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === 'object') {
    const o = v as Record<string, unknown>;
    return Object.keys(o).sort().reduce<Record<string, unknown>>((a, k) => { a[k] = canon(o[k]); return a; }, {});
  }
  return v;
};
const key = (row: Record<string, unknown>) => {
  const { professional_skill_tag: _drop, ...rest } = row;
  return JSON.stringify(canon(rest));
};

async function main() {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

  // ── Read the FULL rows. This is the P-DB4 baseline, and it is READ FROM THE ROWS.
  const ids = PLAN.map((p) => p.id);
  const { data: before, error } = await supabase.from('acca_drills').select('*').in('id', ids);
  if (error) throw error;
  if (!before || before.length !== PLAN.length) {
    throw new Error(`expected ${PLAN.length} rows, read ${before?.length ?? 0} — ABORT, ids do not resolve`);
  }
  const beforeById = new Map(before.map((r) => [r.id as string, r as Record<string, unknown>]));

  // ── GUARD: every target must be published+approved AND currently null. A row that already
  // carries a tag is not this script's business; overwriting one silently would be the exact
  // "status written without a review record" leak the publish doctrine exists to catch.
  const wrongState = before.filter((r) => r.published !== true || r.status !== 'approved');
  if (wrongState.length) throw new Error(`not published/approved: ${wrongState.map((r) => r.id).join(', ')} — ABORT`);
  const alreadyTagged = before.filter((r) => r.professional_skill_tag != null);
  if (alreadyTagged.length) {
    throw new Error(`already tagged, refusing to overwrite: ${alreadyTagged.map((r) => `${String(r.id).slice(0, 8)}=${r.professional_skill_tag}`).join(', ')} — ABORT`);
  }

  // ── P-DB3 — snapshot BEFORE, on disk, committed.
  mkdirSync(dirname(SNAPSHOT), { recursive: true });
  writeFileSync(SNAPSHOT, JSON.stringify({
    written_at_note: 'pre-write snapshot for the professional_skill_tag write; timestamp is the commit date',
    reason: 'P-DB2 write — tag the 8 published AFM narrative drills from their own rubrics',
    rows: before,
  }, null, 2));
  console.log(`P-DB3 snapshot written: ${SNAPSHOT} (${before.length} full rows)\n`);

  // ── SHOW THE WRITE, always, apply or not.
  console.log('='.repeat(100));
  console.log('  PROPOSED WRITE — professional_skill_tag, assessed from each drill\'s OWN rubric');
  console.log('='.repeat(100));
  for (const p of PLAN) {
    const row = beforeById.get(p.id)!;
    console.log(`\n  ${p.short}  ${p.lo}  ${String(row.marks_guide)} marks`);
    console.log(`    current: ${String(row.professional_skill_tag)}   →   PROPOSED: ${p.tag ?? 'null (NO TAG — rubric does not honestly demand one)'}`);
    for (const e of p.evidence) console.log(`      • ${e}`);
    if (p.caveat) console.log(`      ⚠ ${p.caveat}`);
  }

  const toWrite = PLAN.filter((p) => p.tag !== null);
  const counts = toWrite.reduce<Record<string, number>>((a, p) => { a[p.tag!] = (a[p.tag!] ?? 0) + 1; return a; }, {});
  console.log(`\n  ${toWrite.length}/${PLAN.length} rows would be written · ${JSON.stringify(counts)}`);
  console.log(`  ${PLAN.length - toWrite.length}/${PLAN.length} left null by assessment`);

  if (!APPLY) { console.log('\n  DRY RUN — nothing written. Re-run with --apply.\n'); return; }
  if (!existsSync(SNAPSHOT)) throw new Error('snapshot missing — refusing to write');

  // ── THE WRITE. By EXPLICIT id, one field, one row at a time. Never a bulk predicate.
  console.log(`\n${'='.repeat(100)}\n  APPLYING\n${'='.repeat(100)}`);
  for (const p of toWrite) {
    const { error: upErr } = await supabase
      .from('acca_drills')
      .update({ professional_skill_tag: p.tag })
      .eq('id', p.id);
    if (upErr) throw new Error(`${p.short}: ${upErr.message}`);
    console.log(`  ✓ ${p.short} ${p.lo} → ${p.tag}`);
  }

  // ── P-DB4 — post-verify against the baseline READ FROM THE ROWS above.
  console.log(`\n${'='.repeat(100)}\n  P-DB4 POST-VERIFY — tag is the ONLY field that moved\n${'='.repeat(100)}`);
  const { data: after, error: aErr } = await supabase.from('acca_drills').select('*').in('id', ids);
  if (aErr) throw aErr;
  const snap = JSON.parse(readFileSync(SNAPSHOT, 'utf8')).rows as Record<string, unknown>[];
  const snapById = new Map(snap.map((r) => [r.id as string, r]));

  let drift = 0, tagOk = 0;
  for (const p of PLAN) {
    const b = snapById.get(p.id)!;
    const a = (after ?? []).find((r) => r.id === p.id) as Record<string, unknown> | undefined;
    if (!a) { console.log(`  ✗ ${p.short} MISSING after write`); drift++; continue; }
    const identical = key(b) === key(a);
    const tagRight = (a.professional_skill_tag ?? null) === p.tag;
    if (!identical) drift++;
    if (tagRight) tagOk++;
    console.log(`  ${identical && tagRight ? '✓' : '✗'} ${p.short} ${p.lo}  tag ${String(b.professional_skill_tag)} → ${String(a.professional_skill_tag)}` +
      `  · all other fields ${identical ? 'byte-identical' : 'DRIFTED'}${tagRight ? '' : '  · TAG MISMATCH'}`);
    if (!identical) {
      for (const k of Object.keys(b)) {
        if (k === 'professional_skill_tag') continue;
        if (JSON.stringify(canon(b[k])) !== JSON.stringify(canon(a[k]))) console.log(`      ✗ field drifted: ${k}`);
      }
    }
  }
  console.log(`\n  ${PLAN.length - drift}/${PLAN.length} rows: every non-tag field byte-identical`);
  console.log(`  ${tagOk}/${PLAN.length} rows: tag is exactly as proposed`);
  if (drift > 0 || tagOk !== PLAN.length) { console.error('\n  ✗ P-DB4 FAILED — see above'); process.exit(1); }
  console.log('\n  ✓ P-DB4 PASS\n');
}

main().catch((e) => { console.error('FAILED:', (e as Error).message); process.exit(1); });
