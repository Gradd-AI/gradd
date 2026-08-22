#!/usr/bin/env tsx
/**
 * test-paper-vocabulary.ts
 *
 * THE BAR FOR ADDING A PAPER: APM and AFM must render and mark BYTE-IDENTICALLY afterwards.
 *
 * SBL was declared in ACCA_PAPERS on 2026-08-18 (vocabulary only — no content, no routes, no
 * per-requirement PS unit). That touched `AccaPaper`, which keys the professional-skills
 * descriptor maps and now the case-gate config, i.e. two inputs to a MARKING CALL. Under P-M1 a
 * change to the SHAPE of a marking call changes the MARK, so the claim being defended here is
 * narrow and mechanical: for APM and AFM the model sees the same bytes it saw before, therefore
 * the call's shape is unchanged, therefore no band matrix is owed. IF ANY PIN BELOW MOVES, that
 * argument collapses and the band matrix IS owed.
 *
 * The five pin families:
 *   1. buildPsSystemPrompt bytes, both papers x all three variants
 *   2. the numbered examinedSkills rubric string the model actually receives
 *   3. the descriptor maps themselves
 *   4. apportion arithmetic across the band cross-product
 *   5. runCaseGates output on papers of the real published shape
 *
 * ⚠️ THREE OF THE FIVE WERE CAPTURED BEFORE THE CHANGE; TWO WERE NOT, AND THAT DIFFERENCE IS
 * RECORDED RATHER THAN GLOSSED. PIN1, PIN3 and PIN5 are true pre-change captures — the values
 * were read off the build with 'SBL' absent from ACCA_PAPERS, and re-read after. PIN2 and PIN4
 * were captured AFTER, so on their own they prove only that the value is stable from here.
 * Their pre-change validity rests on separate arguments:
 *   PIN2 is a pure function of the descriptor maps, which PIN3 pins pre-change, and of a
 *        one-line template reproduced below — so if PIN3 holds and the template is unchanged,
 *        the rubric string cannot have moved.
 *   PIN4 exercises arithmetic in code the change never touched (`git diff` over
 *        case-marking.ts shows no edit to apportion, BAND_MULTIPLIER, or the ceiling formula —
 *        only an added comment mentioning the ceiling).
 * Both are still worth pinning: they are the values a FUTURE change would move.
 *
 * Pure: no DB, no model, no env. Pin 5 uses fixtures rather than live rows on purpose — a
 * contract-gate fixture must not depend on the database. The same comparison WAS run against
 * the live published corpora at change time (both papers, default and explicit paperCode, all
 * four gates, violation strings included) and held.
 *
 * Usage: npx tsx scripts/test-paper-vocabulary.ts
 */

import { createHash } from 'node:crypto';
import {
  buildPsSystemPrompt,
  SKILL_DESCRIPTORS_BY_PAPER,
  getSkillDescriptors,
} from '../lib/acca/case-marking';
import {
  runCaseGates, GATE_CONFIG, knownSkillTags, unknownSkillTags,
  ALL_PS_SKILLS, SBL_PS_SKILLS,
  type GatePaper,
} from '../lib/acca/case-gates';
import { ACCA_PAPERS, SERVED_PAPERS, servedPaper, strictPaper } from '../lib/acca/paper';

let pass = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

console.log('\n=== PAPER VOCABULARY / BYTE-IDENTITY PINS ===\n');

// ── PIN 1 — PS system prompt bytes ───────────────────────────────────────────
// Captured 2026-08-18 from the build immediately BEFORE 'SBL' entered ACCA_PAPERS.
const PROMPT_PINS: Record<string, { sha: string; len: number }> = {
  'APM/shipped':       { sha: '8eb7ac2958d88510', len: 3302 },
  'APM/ladder':        { sha: '1fd4a27609f1f413', len: 3331 },
  'APM/ladder_p_t2':   { sha: '0ac255f4064e2dfd', len: 3910 },
  'AFM/shipped':       { sha: '72561df3cef7e24e', len: 3302 },
  'AFM/ladder':        { sha: '5f141830549445f3', len: 3331 },
  'AFM/ladder_p_t2':   { sha: '8344d0fa03b135c4', len: 3910 },
};
for (const key of Object.keys(PROMPT_PINS)) {
  const [paper, variant] = key.split('/') as ['APM' | 'AFM', 'shipped' | 'ladder' | 'ladder_p_t2'];
  const built = buildPsSystemPrompt(paper, variant);
  check(`PIN1 ${key} bytes unchanged`, sha(built) === PROMPT_PINS[key].sha && built.length === PROMPT_PINS[key].len,
    `sha ${sha(built)} len ${built.length}`);
}
check('PIN1 ladder is still the production default', buildPsSystemPrompt('AFM') === buildPsSystemPrompt('AFM', 'ladder'));

// ── PIN 2 — the numbered rubric string the model receives ────────────────────
// judgeCaseMarking builds this inline; reproduced here EXACTLY as it does, because it is the
// string the ordinal contract rests on. If the construction there changes, this pin must be
// updated deliberately — which is the point.
function rubricString(paper: 'APM' | 'AFM' | 'SBL', skills: readonly string[]): string {
  const d = getSkillDescriptors(paper);
  return skills.map((s, i) => `${i + 1}. ${s}: ${d[s]}`).join('\n');
}
const RUBRIC_PINS: Record<string, string> = {
  // Full four-skill set, in the order a Section A case yields it.
  'APM/all4': 'c573e7217c67f849',
  'AFM/all4': '4403e6cd50c0aeb8',
};
for (const paper of ['APM', 'AFM'] as const) {
  const got = sha(rubricString(paper, ALL_PS_SKILLS));
  const want = RUBRIC_PINS[`${paper}/all4`];
  check(`PIN2 ${paper} four-skill rubric string unchanged`, got === want, `sha ${got}`);
}

// ── PIN 3 — descriptor maps ──────────────────────────────────────────────────
const DESCRIPTOR_PINS: Record<string, string> = {
  APM: 'c820cb1eb371cf61',
  AFM: '09260d766495e7ea',
};
for (const paper of ['APM', 'AFM'] as const) {
  const got = sha(JSON.stringify(SKILL_DESCRIPTORS_BY_PAPER[paper]));
  check(`PIN3 ${paper} descriptor map unchanged`, got === DESCRIPTOR_PINS[paper], `sha ${got}`);
  check(`PIN3 ${paper} still has exactly four skills`, Object.keys(SKILL_DESCRIPTORS_BY_PAPER[paper]).length === 4);
  check(`PIN3 ${paper} carries the COMBINED analysis_and_evaluation`,
    'analysis_and_evaluation' in SKILL_DESCRIPTORS_BY_PAPER[paper]);
}

// ── PIN 4 — apportion arithmetic across the band cross-product ───────────────
// apportion is not exported, so this pins the OBSERVABLE arithmetic it drives: the per-skill
// ceiling and the largest-remainder split. Reproduced from case-marking.ts's own formula.
const BAND_MULT: Record<string, number> = { exemplary: 1, strong: 0.75, competent: 0.5, weak: 0.25, nothing: 0 };
function apportionLocal(raw: number[], target: number): number[] {
  const out = raw.map((r) => Math.floor(r));
  const byFracDesc = raw.map((r, i) => ({ i, frac: r - Math.floor(r) })).sort((a, b) => b.frac - a.frac);
  let used = out.reduce((a, b) => a + b, 0);
  for (const { i } of byFracDesc) { if (used >= target) break; out[i] += 1; used += 1; }
  while (used > target) { const i = out.findIndex((v) => v > 0); if (i === -1) break; out[i] -= 1; used -= 1; }
  return out;
}
const BANDS = ['exemplary', 'strong', 'competent', 'weak', 'nothing'];
// Four skills, 10-mark pool — the real Section A shape. Every band combination.
const rows: string[] = [];
for (const a of BANDS) for (const b of BANDS) for (const c of BANDS) for (const d of BANDS) {
  const ceiling = 10 / 4;
  const rawMarks = [a, b, c, d].map((x) => ceiling * BAND_MULT[x]);
  const total = Math.min(Math.round(rawMarks.reduce((s, m) => s + m, 0)), 10);
  rows.push(`${a},${b},${c},${d}=${apportionLocal(rawMarks, total).join('/')}|${total}`);
}
check('PIN4 apportion over the 4-skill/10-mark band cross-product unchanged',
  sha(rows.join(';')) === '55cff693a19227b6', `sha ${sha(rows.join(';'))} over ${rows.length} combinations`);
check('PIN4 cross-product is the full 5^4', rows.length === 625);

// ── PIN 5 — runCaseGates on papers of the real published shape ───────────────
const AB_PAPER: GatePaper = {
  cases: [
    { section: 'A', anchor_area: null, total_marks: 50, professional_skills_marks: 10, requirements: [
      { lo_code: 'B3e', marks_guide: 12, marking_kind: 'calc', professional_skill_tags: ['analysis_and_evaluation'] },
      { lo_code: 'E3a', marks_guide: 12, marking_kind: 'calc', professional_skill_tags: ['scepticism'] },
      { lo_code: 'B3i', marks_guide: 10, marking_kind: 'calc', professional_skill_tags: ['commercial_acumen'] },
      { lo_code: 'A1c', marks_guide: 6, marking_kind: 'narrative', professional_skill_tags: ['communication'] },
    ] },
    { section: 'B', anchor_area: 'B1', total_marks: 25, professional_skills_marks: 5, requirements: [
      { lo_code: 'B1a', marks_guide: 13, marking_kind: 'calc', professional_skill_tags: ['analysis_and_evaluation'] },
      { lo_code: 'B1b', marks_guide: 7, marking_kind: 'narrative', professional_skill_tags: ['scepticism'] },
    ] },
  ],
};
const abDefault = runCaseGates(AB_PAPER);
check('PIN5 A/B paper passes all four gates', abDefault.pass === true);
check('PIN5 default paperCode deep-equals explicit AFM',
  JSON.stringify(runCaseGates(AB_PAPER)) === JSON.stringify(runCaseGates(AB_PAPER, 'AFM')));
check('PIN5 APM config deep-equals AFM config (the default is immaterial between served papers)',
  JSON.stringify(runCaseGates(AB_PAPER, 'APM')) === JSON.stringify(runCaseGates(AB_PAPER, 'AFM')));
check('PIN5 no APM/AFM result carries the `applicable` field (byte-identical to pre-SBL shape)',
  Object.values(runCaseGates(AB_PAPER, 'APM').results).every((r) => !('applicable' in r)));

// ── SBL behaviour: n/a is NOT pass ───────────────────────────────────────────
const SBL_PAPER: GatePaper = {
  cases: [
    { section: 'A', anchor_area: null, total_marks: 100, professional_skills_marks: 20, requirements: [
      { lo_code: 'B2a', marks_guide: 30, marking_kind: 'narrative', professional_skill_tags: ['communication', 'analysis'] },
      { lo_code: 'C3a', marks_guide: 35, marking_kind: 'narrative', professional_skill_tags: ['evaluation', 'scepticism'] },
      { lo_code: 'G2f', marks_guide: 35, marking_kind: 'narrative', professional_skill_tags: ['commercial_acumen'] },
    ] },
  ],
};
const sbl = runCaseGates(SBL_PAPER, 'SBL');
for (const g of ['C1-section-a-span', 'C2-not-wholly-narrative', 'C3-b-and-e-represented']) {
  check(`SBL ${g} reports INAPPLICABLE, not pass`, sbl.results[g].applicable === false);
  check(`SBL ${g} states a reason`, typeof sbl.results[g].reason === 'string' && sbl.results[g].reason!.length > 10);
}
check('SBL C4 IS applicable', !('applicable' in sbl.results['C4-ps-skill-set']));
check('SBL paper covering all five skills passes C4', sbl.results['C4-ps-skill-set'].pass === true);
check('SBL aggregate excludes inapplicable gates', sbl.pass === true);
// MUST-FAIL: a five-skill paper missing one skill, and one using the four-skill tag.
const missing = structuredClone(SBL_PAPER);
missing.cases[0].requirements[2].professional_skill_tags = [];
check('SBL C4 fails when a skill is unexamined', runCaseGates(missing, 'SBL').results['C4-ps-skill-set'].pass === false);
const wrongTag = structuredClone(SBL_PAPER);
wrongTag.cases[0].requirements[0].professional_skill_tags = ['communication', 'analysis_and_evaluation'];
const wt = runCaseGates(wrongTag, 'SBL').results['C4-ps-skill-set'];
check('SBL C4 REFUSES the APM/AFM combined tag as unknown', wt.pass === false
  && wt.violations.some((v) => v.includes('analysis_and_evaluation')));

// ── The free-text trap ───────────────────────────────────────────────────────
check('knownSkillTags(SBL) is the five-skill set', knownSkillTags('SBL').length === 5);
check('knownSkillTags(APM) is the four-skill set', knownSkillTags('APM').length === 4);
check('SBL does NOT know analysis_and_evaluation', unknownSkillTags('SBL', ['analysis_and_evaluation']).length === 1);
check('APM does NOT know analysis', unknownSkillTags('APM', ['analysis']).length === 1);
check('APM does NOT know evaluation', unknownSkillTags('APM', ['evaluation']).length === 1);
check('a typo is unknown on every paper',
  ACCA_PAPERS.every((p) => unknownSkillTags(p, ['sceptcism']).length === 1));
check('every live four-skill tag validates on APM and AFM',
  (['APM', 'AFM'] as const).every((p) => unknownSkillTags(p, [...ALL_PS_SKILLS]).length === 0));
check('every SBL tag validates on SBL', unknownSkillTags('SBL', [...SBL_PS_SKILLS]).length === 0);
// The descriptor map and the gate config must not disagree — one would refuse what the other marks.
for (const p of ACCA_PAPERS) {
  check(`${p}: gate config skill set === descriptor map keys`,
    JSON.stringify([...knownSkillTags(p)].sort()) === JSON.stringify(Object.keys(SKILL_DESCRIPTORS_BY_PAPER[p]).sort()));
}
// The hard stop: judgeCaseMarking must THROW on an unknown skill, never soft-substitute.
check('GATE_CONFIG covers every declared paper', ACCA_PAPERS.every((p) => !!GATE_CONFIG[p]));

// ── Declared vs served ───────────────────────────────────────────────────────
check('SBL is declared', (ACCA_PAPERS as readonly string[]).includes('SBL'));
check('SBL is NOT served', !(SERVED_PAPERS as readonly string[]).includes('SBL'));
check('strictPaper RETURNS SBL (an auth gate must be able to name it to refuse it)', strictPaper('SBL') === 'SBL');
check('servedPaper REFUSES SBL (it has no price and no content)', servedPaper('SBL') === null);
for (const p of SERVED_PAPERS) {
  check(`servedPaper still accepts ${p}`, servedPaper(p) === p);
  check(`strictPaper still accepts ${p}`, strictPaper(p) === p);
}
check('servedPaper refuses junk exactly as strictPaper does', servedPaper('nonsense') === null && strictPaper('nonsense') === null);

console.log(failures.length === 0
  ? `ALL PAPER-VOCABULARY PINS HOLD (${pass} checks)\n`
  : `FAILURES (${failures.length} of ${pass + failures.length}):\n  ${failures.join('\n  ')}\n`);
if (failures.length > 0) process.exit(1);
