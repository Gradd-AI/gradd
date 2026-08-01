// scripts/authoring/author-afm-case.ts
//
// ═══════════════════════════════════════════════════════════════════════════════
// THE STANDALONE AFM CASE-AUTHORING PATH — parameterised, gate-enforced
// ═══════════════════════════════════════════════════════════════════════════════
//
// `author-afm-mock-paper-1.ts` is a ONE-OFF: its case ids, exhibits and every requirement
// string are literals, and it authors one specific 3-case paper. This is the general path —
// a SPEC file goes in, a gated practice case comes out, and nothing about a particular case
// lives here.
//
//   npx tsx --env-file=.env.local scripts/authoring/author-afm-case.ts --spec <path>
//     [--insert]                      write the rows (default is a DRY RUN — P-DB2)
//     [--i-will-delete-live-rows]     required only when the target id already exists
//
// The spec module must `export default` an `AfmCaseSpec` (lib/acca/case-authoring-spec.ts).
// THIS FILE CONTAINS NO CASE CONTENT and must not acquire any.
//
// ── WHAT IT ENFORCES, IN ORDER, AND IT REFUSES ON THE FIRST FAILURE ─────────
//  1. SPEC VALIDATION — marks reconcile, requirement_order is 1..N, every requirement has PS
//     tags, exhibits and a scenario exist.
//  2. CASE-LEVEL GATES — C1 (conditional on section), C2, C4 unchanged from
//     lib/acca/case-gates.ts. C3 is REPLACED: see step 3.
//  3. THE CORPUS INVARIANT (C3's replacement) — B and E must be represented across the
//     PUBLISHED AFM case library once this case is added. C3 asserts across a whole paper; a
//     single case cannot satisfy both letters and should not have to, so the property moves to
//     the library and is asserted at add time.
//  4. EXHIBITS STATE EVERY CALCULATOR INPUT — enforced, not assumed. This is what makes a row
//     self-describing and therefore recoverable without a script (P-DB6). Inputs the exhibits
//     legitimately do not state need a NAMED exemption with a reason.
//  5. THE PER-REQUIREMENT BARRIER — runRequirementGateBarrier WITH the family argument for
//     every numeric requirement, runNarrativeGateBarrier for every narrative one. The insert
//     is refused unless every line is ok (`barrierPasses`: no fail, no blocking not_evaluated).
//
// ── THE ROWS IT WRITES ───────────────────────────────────────────────────────
// `status:'candidate'`, `published:false`, and **`mock_only: FALSE`** — the deliberate
// difference from the mock authoring script. These are PRACTICE cases and must reach the
// practice library, which lists `mock_only=false`. Publishing is a separate, P-DB2/GATE-P
// governed step this script never performs.
//
// ── STRUCTURAL SAFETY, INHERITED FROM THE MOCK SCRIPT ───────────────────────
// Same guard, same reasoning: REFUSES OUTRIGHT if the target id already exists and is
// `published = true` (no override flag), otherwise still requires `--i-will-delete-live-rows`
// because re-authoring cascades to requirements, exhibits and student progress. It prints
// exactly what would be written and deleted BEFORE writing anything.

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { resolve } from 'path';
import { pathToFileURL } from 'url';
import {
  runRequirementGateBarrier, runNarrativeGateBarrier, barrierPasses, barrierBlockers,
  type GateLine,
} from '../../lib/acca/case-authoring-gates';
import { makeAnthropicCriterionGrader } from '../../lib/acca/narrative-grader';
import type { NarrativeRubric, FailureMode } from '../../lib/acca/narrative-marker';
import {
  buildNumericRequirement, validateCaseSpec, toGateCase, standaloneCaseGates,
  corpusBandERepresented, checkExhibitsStateInputs, composeFullReveal, composeHint,
  familyGateCoverage,
  type AfmCaseSpec,
} from '../../lib/acca/case-authoring-spec';

const argOf = (flag: string): string | null => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? (process.argv[i + 1] ?? null) : null;
};
const SPEC_PATH = argOf('--spec');
const DO_INSERT = process.argv.includes('--insert');
const DO_DESTRUCTIVE = process.argv.includes('--i-will-delete-live-rows');
// The corpus invariant is BLOCKING. This is its only override, and it REQUIRES a reason —
// see the CORPUS INVARIANT block below for why an advisory line was the wrong design.
const CORPUS_GAP_REASON = process.argv.includes('--allow-corpus-gap') ? (argOf('--allow-corpus-gap') ?? '') : null;
const CORPUS_JOURNAL = 'docs/authoring/CORPUS_GAP_OVERRIDES.md';
/** Print the built prose, model answers and schema components in full. */
const PRINT_CONTENT = process.argv.includes('--print-content');

const indent = (s: string, pad: string) => s.split('\n').map((l) => pad + l).join('\n');
function wrap(s: string, n: number, pad: string): string {
  const out: string[] = [];
  for (const para of (s ?? '').split('\n')) {
    let cur = '';
    for (const w of para.split(/\s+/).filter(Boolean)) {
      if ((cur + ' ' + w).trim().length > n) { out.push(pad + cur.trim()); cur = w; } else cur = (cur + ' ' + w).trim();
    }
    out.push(pad + cur.trim());
  }
  return out.filter((l) => l.trim()).join('\n');
}

/** Designed failure modes the golden BAD must trigger — the same backbone D1–D5 proved. */
const DESIGNED_BAD: FailureMode[] = ['F1', 'F5', 'F4'];

let blocked = false;
/** Set when the corpus invariant is overridden; appended to the journal on insert. */
let corpusJournalEntry: string | null = null;
const line = (t = '') => console.log(t);
const rule = (c = '=') => console.log(c.repeat(100));
function report(name: string, ok: boolean, detail = ''): boolean {
  if (!ok) blocked = true;
  line(`  ${ok ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
  return ok;
}
function printGateLines(label: string, lines: GateLine[]): boolean {
  const ok = barrierPasses(lines);
  line(`\n  ── ${label} — ${ok ? 'ALL PASS' : 'BLOCKED'} (${lines.length} lines) ──`);
  for (const l of lines) {
    const tag = l.status === 'pass' ? 'PASS  '
      : l.status === 'fail' ? 'FAIL  '
      : (l.blocking ? 'N/EVAL-BLOCK' : 'N/EVAL-exempt');
    if (l.status !== 'pass') line(`     ${tag}  ${l.name} — ${l.exemption || l.detail || ''}`);
  }
  const bad = barrierBlockers(lines);
  line(`     ${lines.length - bad.length}/${lines.length} lines ok${bad.length ? ` · ${bad.length} BLOCKING` : ''}`);
  if (!ok) blocked = true;
  return ok;
}

async function main() {
  rule();
  line('  STANDALONE AFM CASE AUTHORING — parameterised path');
  line(`  mode: ${DO_INSERT ? 'INSERT' : 'DRY RUN (default — pass --insert to write)'}`);
  rule();

  if (!SPEC_PATH) throw new Error('--spec <path> is required. This script contains no case content.');
  const mod = await import(pathToFileURL(resolve(SPEC_PATH)).href);
  const spec = (mod.default ?? mod.spec) as AfmCaseSpec;
  if (!spec?.frame?.id) throw new Error(`${SPEC_PATH} does not export a default AfmCaseSpec with frame.id`);

  line(`\n  SPEC: ${spec.frame.title}  (${spec.frame.section}, ${spec.frame.total_marks} marks, id ${spec.frame.id})`);
  line(`  ${spec.exhibits.length} exhibits · ${spec.numeric.length} numeric + ${spec.narrative.length} narrative requirements`);

  // ── 1. SPEC VALIDATION ──
  line('\n  1. SPEC VALIDATION');
  const v = validateCaseSpec(spec);
  report('spec is internally consistent', v.pass, v.violations.join(' | '));

  // ── 2. CASE-LEVEL GATES (C1 conditional · C2 · C4) ──
  line('\n  2. CASE-LEVEL GATES  (C1 conditional on section · C2 · C4 — C3 replaced, see 3)');
  const gateCase = toGateCase(spec);
  const cg = standaloneCaseGates(gateCase);
  for (const [name, r] of Object.entries(cg.results)) report(name, r.pass, r.violations.join(' | '));

  // ── 3. THE CORPUS INVARIANT — C3's replacement ──
  line('\n  3. CORPUS INVARIANT (C3 replacement — B and E across the PUBLISHED AFM case library)');
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { data: libCases } = await supabase
    .from('acca_cases').select('id').eq('paper_code', 'AFM').eq('published', true).eq('mock_only', false);
  const libIds = (libCases ?? []).map((c: { id: string }) => c.id);
  let publishedLos: string[] = [];
  if (libIds.length > 0) {
    const { data: libReqs } = await supabase
      .from('acca_case_requirements').select('lo_code').in('case_id', libIds);
    publishedLos = (libReqs ?? []).map((r: { lo_code: string }) => r.lo_code).filter(Boolean);
  }
  const candidateLos = gateCase.requirements.map((r) => r.lo_code);
  const corpus = corpusBandERepresented(publishedLos, candidateLos);
  line(`     published AFM practice cases: ${libIds.length} · their LO letters: ` +
       `[${[...new Set(publishedLos.map((l) => l[0]))].sort().join(', ') || 'none'}]`);
  line(`     this case contributes: [${[...new Set(candidateLos.map((l) => l[0]))].sort().join(', ')}]`);
  line(`     after add: [${corpus.afterAdd.join(', ')}]`);

  // ── WHY THIS BLOCKS (ruled 2026-08-01) ──
  // Every AFM exam carries questions focused on sections B and E. That is not a nicety — it is
  // load-bearing for the viable tier, because a library that cannot build one is not a library a
  // candidate can rehearse against. An earlier version of this reported the gap and let the run
  // pass, on the argument that add time cannot know whether a LATER case will supply the missing
  // letter. That argument is sound and it argues for an OVERRIDE, not for silence: a warning line
  // inside an otherwise-green run is a line nobody reads, and the gap would be discovered when
  // someone went looking for an E case and found none.
  //
  // So it blocks, and `--allow-corpus-gap "<reason>"` is the way past it. The reason is REQUIRED,
  // is printed here, and is appended to the journal on insert — so the decision leaves a trace
  // that outlives the terminal session that made it.
  if (!corpus.pass) {
    const entry = `- ${new Date().toISOString().slice(0, 10)} · case \`${spec.frame.id}\` (${spec.frame.title}) · ` +
                  `missing: ${corpus.missing.join(', ')} · letters after add: [${corpus.afterAdd.join(', ')}] · ` +
                  `reason: ${CORPUS_GAP_REASON ?? '(none given)'}`;
    if (CORPUS_GAP_REASON === null) {
      report('corpus invariant: B and E represented across the published AFM library', false,
        `MISSING ${corpus.missing.join(', ')}. Author a case covering ${corpus.missing.join('/')}, ` +
        'or re-run with --allow-corpus-gap "<reason>" — the reason is required and is journalled.');
    } else if (!CORPUS_GAP_REASON.trim()) {
      report('corpus invariant override', false,
        '--allow-corpus-gap was given with NO reason. An override without a stated reason is the ' +
        'silence this gate exists to prevent; supply one.');
    } else {
      line(`  OVERRIDE :: corpus invariant — MISSING ${corpus.missing.join(', ')}`);
      line(`             reason: ${CORPUS_GAP_REASON.trim()}`);
      line(`             journal line (appended to ${CORPUS_JOURNAL} on --insert):`);
      line(`               ${entry}`);
      corpusJournalEntry = entry;
    }
  } else {
    report('corpus invariant: B and E represented across the published AFM library', true,
      `[${corpus.afterAdd.join(', ')}]`);
  }

  // ── 4. EXHIBITS STATE EVERY CALCULATOR INPUT ──
  line('\n  4. EXHIBITS STATE EVERY CALCULATOR INPUT  (recoverability — P-DB6)');
  const exhibitText = spec.exhibits.map((e) => `${e.title}\n${e.body}`).join('\n\n');
  const context = [spec.frame.scenario_intro, exhibitText].filter(Boolean).join('\n\n');

  const built = spec.numeric.map((n) => ({ spec: n, out: buildNumericRequirement(n) }));
  for (const b of built) {
    const chk = checkExhibitsStateInputs(exhibitText, b.out.inputNumbers, b.spec.exhibit_exempt ?? {});
    report(
      `${b.out.lo}: exhibits state all ${chk.checked} checked calculator inputs`,
      chk.ok,
      chk.missing.length
        ? chk.missing.map((m) => `${m.path}=${m.value} (tried ${m.tried.slice(0, 4).join('/')})`).join(' | ')
        : (chk.exempted.length ? `${chk.exempted.length} exempted: ${chk.exempted.map((e) => `${e.path} (${e.reason})`).join('; ')}` : ''),
    );
  }

  // ── 5. THE PER-REQUIREMENT BARRIER ──
  line('\n  5. PER-REQUIREMENT GATE BARRIER');
  for (const b of built) {
    const cov = familyGateCoverage(b.out.lo);
    line(`\n  [${b.spec.requirement_order}] ${b.out.lo} · ${b.spec.marks} marks · ${cov.supported ? 'FULL family cover' : 'NO family gates — ' + cov.note}`);
    const lines = runRequirementGateBarrier(
      b.out.schema,
      {
        question: b.out.question, context, model_answer: b.out.model_answer,
        hint: b.out.hint, full_reveal: b.out.full_reveal,
        zeroAddlTax: b.out.zeroAddlTax, compare: b.out.compare, computed: b.out.computed,
      },
      b.out.family,
    );
    printGateLines(`${b.out.lo} barrier`, lines);
  }

  const narrativeBuilt: { spec: (typeof spec.narrative)[number]; model_answer: string; hint: string; full_reveal: string }[] = [];
  if (spec.narrative.length > 0) {
    const grader = makeAnthropicCriterionGrader(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }));
    for (const n of spec.narrative) {
      const full_reveal = composeFullReveal(n.misconception, n.symptom, n.fix);
      const hint = composeHint(n.hint_lead, n.hint_method);
      narrativeBuilt.push({ spec: n, model_answer: n.golden_good, hint, full_reveal });
      line(`\n  [${n.requirement_order}] ${n.lo} · ${n.marks} marks · NARRATIVE`);
      const lines = await runNarrativeGateBarrier({
        rubric: n.rubric as NarrativeRubric, scenario: context, reveal: n.golden_good,
        goldenBad: n.golden_bad, designedBadFlags: DESIGNED_BAD, grader,
      });
      printGateLines(`${n.lo} narrative barrier`, lines);
    }
  }

  // ── VERDICT ──
  line('');
  rule();
  if (blocked) {
    line('  BLOCKED — one or more gates failed. Nothing will be written.');
    rule();
    process.exitCode = 1;
    return;
  }
  line('  ALL GATES GREEN.');
  rule();

  // ── WHAT WOULD BE WRITTEN (P-DB2: show the write before it happens) ──
  line('\n  ROWS THAT WOULD BE WRITTEN');
  line(`     acca_cases          1  (status=candidate, published=false, mock_only=FALSE)`);
  line(`     acca_case_exhibits  ${spec.exhibits.length}`);
  line(`     acca_case_requirements ${spec.numeric.length + spec.narrative.length}`);
  for (const b of built) {
    line(`       [${b.spec.requirement_order}] ${b.out.lo} ${b.spec.marks}m calc      ` +
         `model_answer ${b.out.model_answer.length}ch · schema ${JSON.stringify(b.out.serialized).length}ch · hint ${b.out.hint.length}ch · reveal ${b.out.full_reveal.length}ch`);
  }
  for (const n of narrativeBuilt) {
    line(`       [${n.spec.requirement_order}] ${n.spec.lo} ${n.spec.marks}m narrative ` +
         `model_answer ${n.model_answer.length}ch · hint ${n.hint.length}ch · reveal ${n.full_reveal.length}ch`);
  }

  // ── THE BUILT CONTENT, IN FULL ──
  // A dry run whose output is a list of PASS lines cannot be reviewed: the point of the dry run is
  // that a human reads what would land, and that means the prose and the figures, not their
  // lengths. Printed on request so the gate matrix stays readable by default.
  if (PRINT_CONTENT) {
    rule('─');
    line('  BUILT CONTENT — exactly what would be written');
    rule('─');
    line(`\n  ══ CASE ══\n  ${spec.frame.title} · Section ${spec.frame.section} · anchor ${spec.frame.anchor_area}`);
    line(`  ${spec.frame.total_marks} marks (${spec.frame.total_marks - spec.frame.professional_skills_marks} technical + ${spec.frame.professional_skills_marks} PS) · ${spec.frame.response_format}`);
    line(`\n  SCENARIO INTRO\n${wrap(spec.frame.scenario_intro, 96, '    ')}`);
    for (const [i, e] of spec.exhibits.entries()) {
      line(`\n  EXHIBIT ${i + 1} — ${e.title}\n${wrap(e.body, 96, '    ')}`);
    }
    for (const b of built) {
      line(`\n  ══ REQUIREMENT ${b.spec.requirement_order} · ${b.out.lo} · ${b.spec.marks} marks · CALC ══`);
      line(`  PS: ${b.spec.ps_tags.join(', ')}`);
      line(`\n  QUESTION\n${wrap(b.out.question, 96, '    ')}`);
      line(`\n  MODEL ANSWER (built by the calculator — every figure code-owned)\n${indent(b.out.model_answer, '    ')}`);
      line(`\n  ANSWER_SCHEMA — ${(b.out.schema.components ?? []).length} components`);
      for (const c of (b.out.schema.components ?? [])) {
        line(`    ${String(c.component_id).padEnd(22)} = ${JSON.stringify(c.expected_value).padEnd(14)} ${String(c.unit ?? '').padEnd(8)} tol=${JSON.stringify(c.tolerance)}`);
      }
      line(`\n  HINT\n${wrap(b.out.hint, 96, '    ')}`);
      line(`\n  FULL_REVEAL\n${indent(b.out.full_reveal, '    ')}`);
    }
    for (const n of narrativeBuilt) {
      const rub = n.spec.rubric as NarrativeRubric;
      line(`\n  ══ REQUIREMENT ${n.spec.requirement_order} · ${n.spec.lo} · ${n.spec.marks} marks · NARRATIVE ══`);
      line(`  PS: ${n.spec.ps_tags.join(', ')}`);
      line(`\n  QUESTION\n${wrap(n.spec.question, 96, '    ')}`);
      line(`\n  RUBRIC — ${rub.criteria.length} criteria, ${rub.scenario_facts.length} scenario facts, ${rub.total_marks} marks`);
      for (const c of rub.criteria) {
        line(`    ${c.id.padEnd(16)} ${c.marks}m  anchors=[${c.anchor_facts.join(', ')}]  disq=[${c.disqualifiers.join(', ')}]`);
        line(`${wrap(c.required_point, 90, '        ')}`);
      }
      line(`\n  MODEL ANSWER (golden GOOD)\n${indent(n.model_answer, '    ')}`);
      line(`\n  HINT\n${wrap(n.hint, 96, '    ')}`);
      line(`\n  FULL_REVEAL\n${indent(n.full_reveal, '    ')}`);
    }
    rule('─');
  }

  if (!DO_INSERT) {
    line('\n  DRY RUN — nothing written. Re-run with --insert to write.');
    return;
  }

  await assertSafeToOverwrite(supabase, spec.frame.id);
  await insertCase(supabase, spec, built, narrativeBuilt);

  // Journalled on INSERT, not on the dry run: the journal records what SHIPPED, and repeated dry
  // runs must not fill it with decisions that were never acted on. The dry run prints the exact
  // line it would append, so nothing about the record is a surprise.
  if (corpusJournalEntry) {
    const { appendFileSync, existsSync, mkdirSync, writeFileSync } = await import('fs');
    const { dirname } = await import('path');
    if (!existsSync(dirname(CORPUS_JOURNAL))) mkdirSync(dirname(CORPUS_JOURNAL), { recursive: true });
    if (!existsSync(CORPUS_JOURNAL)) {
      writeFileSync(CORPUS_JOURNAL,
        '# Corpus-gap overrides — AFM case library\n\n' +
        'Append-only. Each line records a case authored while the published AFM library did NOT yet\n' +
        'represent both syllabus sections B and E, and the reason the author proceeded anyway.\n' +
        'Written by `scripts/authoring/author-afm-case.ts --allow-corpus-gap "<reason>"` on insert.\n\n');
    }
    appendFileSync(CORPUS_JOURNAL, `${corpusJournalEntry}\n`);
    line(`  corpus-gap override journalled → ${CORPUS_JOURNAL}`);
  }
}

/**
 * Structural safety, inherited from author-afm-mock-paper-1.ts and for the same reason: a
 * header warning is instructed, this is not.
 *
 * REFUSES OUTRIGHT on a published target with NO override flag — the failure mode is someone
 * re-authoring without realising the case went live, and a flag they can add is no protection.
 * Otherwise still requires --i-will-delete-live-rows, because the delete cascades to
 * requirements, exhibits and every student's progress on them.
 */
async function assertSafeToOverwrite(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (t: string) => any },
  caseId: string,
): Promise<void> {
  const { data: rows } = await supabase.from('acca_cases')
    .select('id, title, status, published').eq('id', caseId);
  const existing = (rows ?? []) as Array<{ id: string; title: string | null; status: string; published: boolean }>;
  if (existing.length === 0) {
    line('\n  guard: target id does not exist — this is a first author, nothing is deleted.');
    return;
  }
  const c = existing[0];
  const [{ count: exhibits }, { count: reqs }] = await Promise.all([
    supabase.from('acca_case_exhibits').select('id', { count: 'exact', head: true }).eq('case_id', caseId),
    supabase.from('acca_case_requirements').select('id', { count: 'exact', head: true }).eq('case_id', caseId),
  ]);
  const { count: progress } = await supabase.from('acca_case_progress')
    .select('user_id', { count: 'exact', head: true }).eq('case_id', caseId);
  line(`\n  ── DESTRUCTIVE WRITE — what --insert would DELETE ──`);
  line(`     ${c.id}  ${c.title}  status=${c.status} published=${c.published}`);
  line(`     cascades: ${exhibits ?? 0} exhibits, ${reqs ?? 0} requirements, ${progress ?? 0} student progress rows`);

  if (c.published) {
    throw new Error(
      'REFUSED: the target case is published=true. Re-authoring deletes and re-inserts as ' +
      'candidate/unpublished, which would pull it from the practice library and destroy student ' +
      'progress. Demote it deliberately first — there is no override flag.',
    );
  }
  if (!DO_DESTRUCTIVE) {
    throw new Error('REFUSED: re-authoring deletes existing rows and cascades to student progress. ' +
      'Re-run with --i-will-delete-live-rows if that is genuinely intended.');
  }
}

async function insertCase(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (t: string) => any },
  spec: AfmCaseSpec,
  built: { spec: AfmCaseSpec['numeric'][number]; out: ReturnType<typeof buildNumericRequirement> }[],
  narrativeBuilt: { spec: AfmCaseSpec['narrative'][number]; model_answer: string; hint: string; full_reveal: string }[],
): Promise<void> {
  const f = spec.frame;
  await supabase.from('acca_cases').delete().eq('id', f.id);
  await supabase.from('acca_cases').insert({
    id: f.id, exam_board: 'ACCA', paper_code: 'AFM', syllabus_cycle: 'S26-J27',
    section: f.section, anchor_area: f.anchor_area, title: f.title,
    scenario_intro: f.scenario_intro, response_format: f.response_format,
    total_marks: f.total_marks, professional_skills_marks: f.professional_skills_marks,
    status: 'candidate', published: false,
    // THE deliberate difference from the mock path: practice cases must reach the practice
    // library, which lists mock_only = false.
    mock_only: false,
  });
  let eo = 1;
  for (const e of spec.exhibits) {
    await supabase.from('acca_case_exhibits').insert({ case_id: f.id, exhibit_order: eo++, title: e.title, body: e.body });
  }
  const label = (order: number, marks: number) => `(${['i', 'ii', 'iii', 'iv', 'v'][order - 1]}) — ${marks} marks`;
  for (const b of built) {
    await supabase.from('acca_case_requirements').insert({
      case_id: f.id, requirement_order: b.spec.requirement_order, label: label(b.spec.requirement_order, b.spec.marks),
      question: b.out.question, lo_code: b.out.lo, command_verb: 'calculate',
      intellectual_level: b.spec.intellectual_level, marks_guide: b.spec.marks,
      professional_skill_tags: b.spec.ps_tags.join(','), model_answer: b.out.model_answer,
      hint: b.out.hint, full_reveal: b.out.full_reveal, answer_schema: b.out.serialized,
    });
  }
  for (const n of narrativeBuilt) {
    const r = n.spec;
    const rub = r.rubric as NarrativeRubric;
    await supabase.from('acca_case_requirements').insert({
      case_id: f.id, requirement_order: r.requirement_order, label: label(r.requirement_order, r.marks),
      question: r.question, lo_code: r.lo, command_verb: 'evaluate',
      intellectual_level: r.intellectual_level, marks_guide: r.marks,
      professional_skill_tags: r.ps_tags.join(','), model_answer: n.model_answer,
      hint: n.hint, full_reveal: n.full_reveal,
      answer_schema: {
        mode: 'narrative', rubric_version: 'narrative_v1',
        requirement_parts: rub.requirement_parts, scenario_facts: rub.scenario_facts,
        criteria: rub.criteria, total_marks: rub.total_marks, bands: rub.bands,
        _authoring: { golden_bad: r.golden_bad, designed_bad_flags: DESIGNED_BAD, note: 'Rule-23 golden BAD + designed F-modes. NOT served. Golden GOOD is model_answer.' },
      },
    });
  }
  line(`\n  INSERTED — 1 case, ${spec.exhibits.length} exhibits, ${built.length + narrativeBuilt.length} requirements ` +
       '(candidate / published=false / mock_only=false).');
}

main().catch((e) => { console.error(`\nAUTHORING FAILED: ${e.message}`); process.exitCode = 1; });
