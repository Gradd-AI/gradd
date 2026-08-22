#!/usr/bin/env tsx
/**
 * test-sbl-framework.ts
 *
 * Meta-tests for sbl-framework.ts.
 * Asserts structural invariants without calling any external API or DB.
 * Same style as test-apm-framework.ts.
 *
 * ⚠️ sbl-framework.ts is GENERATED (`npm run build:sbl-ledger -- --emit-framework`), so these
 * are tests of the EMITTER as much as of the file. A failure here means the emitter or the
 * parse changed, never that someone should hand-patch the framework.
 *
 * Usage: npx tsx scripts/test-sbl-framework.ts
 */

import {
  SYLLABUS_MAP,
  INTELLECTUAL_LEVELS,
  SECTIONS,
  COMMAND_VERBS,
  PROFESSIONAL_SKILLS,
  EMPLOYABILITY_SKILLS,
  EXAM_STRUCTURE,
} from './sbl-framework';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

const entries = Object.entries(SYLLABUS_MAP) as Array<[string, typeof SYLLABUS_MAP[keyof typeof SYLLABUS_MAP]]>;

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — 138 outcomes, every code well-formed, no duplicates
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 1 — 138 outcomes across sections A-H');
assert(entries.length === 138, `SYLLABUS_MAP holds 138 outcomes (got ${entries.length})`);
const SYLLABUS_SECTIONS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']);
for (const [code, e] of entries) {
  assert(/^[A-H][0-9]+[a-z]$/.test(code), `${code} is a well-formed LO code`);
  assert(SYLLABUS_SECTIONS.has(e.section), `${code} sits in a syllabus section A-H`);
  assert(code.startsWith(e.section), `${code} agrees with its own section field (${e.section})`);
  assert(code.startsWith(e.sub_area), `${code} agrees with its own sub_area field (${e.sub_area})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — Levels. SBL is a professional-level paper: no [1] anywhere.
// The 92/46 split is the load-bearing number: the two MALFORMED level markers in the published
// PDF (A2d renders '[3}', H5a renders '[3)') produce 95/43 if the parser matches a strict ']'.
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 2 — intellectual levels, including the two malformed PDF markers');
const levels: Record<number, number> = {};
for (const [code, e] of entries) {
  assert(e.intellectual_level === 2 || e.intellectual_level === 3, `${code} is level 2 or 3`);
  levels[e.intellectual_level] = (levels[e.intellectual_level] ?? 0) + 1;
}
assert(levels[3] === 92, `92 outcomes at level [3] (got ${levels[3]})`);
assert(levels[2] === 46, `46 outcomes at level [2] (got ${levels[2]})`);
assert(SYLLABUS_MAP.A2d.intellectual_level === 3, "A2d is level 3 despite its malformed '[3}' marker");
assert(SYLLABUS_MAP.H5a.intellectual_level === 3, "H5a is level 3 despite its malformed '[3)' marker");
assert(Object.keys(INTELLECTUAL_LEVELS).length === 3, 'INTELLECTUAL_LEVELS names all three ACCA levels');

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — Descriptors are real parsed text, not placeholders
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 3 — descriptors are substantive parsed text');
for (const [code, e] of entries) {
  assert(e.descriptor.length > 20, `${code} has a substantive descriptor`);
  assert(!/\[\d[\]})]/.test(e.descriptor), `${code} descriptor carries no level marker (parser stripped it)`);
  assert(e.descriptor.trim() === e.descriptor, `${code} descriptor is trimmed`);
  assert(e.topic.length > 0, `${code} carries a sub-area topic name`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 — Sections. A-H are syllabus; I and J are NOT learning outcomes and must be
// reachable as names while never appearing in SYLLABUS_MAP.
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 4 — sections A-H syllabus, I and J held separately');
assert(Object.keys(SECTIONS).length === 10, 'SECTIONS names A-H plus I and J');
for (const s of SYLLABUS_SECTIONS) {
  assert(s in SECTIONS, `SECTIONS names section ${s}`);
  assert(entries.some(([, e]) => e.section === s), `section ${s} has at least one outcome`);
}
assert(SECTIONS.I === 'Professional skills', 'section I is the professional skills section');
assert(SECTIONS.J === 'Other employability and digital skills', 'section J is employability and digital skills');
assert(!entries.some(([c]) => c.startsWith('I') || c.startsWith('J')), 'no I/J code leaked into SYLLABUS_MAP');

// ─────────────────────────────────────────────────────────────────────────────
// Test 5 — SBL HAS FIVE PROFESSIONAL SKILLS, and they are not the four-skill papers' set.
// This is the single most confusable fact about the paper: APM/AFM carry one combined
// `analysis_and_evaluation`; SBL marks Analysis and Evaluation SEPARATELY.
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 5 — five professional skills, distinct from the four-skill papers');
const skills = Object.keys(PROFESSIONAL_SKILLS);
assert(skills.length === 5, `SBL has five professional skills (got ${skills.length})`);
for (const expected of ['communication', 'commercial_acumen', 'analysis', 'scepticism', 'evaluation']) {
  assert(skills.includes(expected), `professional skills include ${expected}`);
}
assert(!skills.includes('analysis_and_evaluation'),
  'SBL must NOT carry the APM/AFM combined analysis_and_evaluation tag');
for (const [key, s] of Object.entries(PROFESSIONAL_SKILLS)) {
  assert(s.intellectual_level === 3, `${key} is intellectual level 3`);
  assert(s.sub_descriptors.length === 3, `${key} has three sub-descriptors`);
  for (const d of s.sub_descriptors) assert(d.length > 40, `${key} sub-descriptor is verbatim-length`);
}
// The two acts with no counterpart in the four-skill papers, named in the guide's own wording.
assert(PROFESSIONAL_SKILLS.evaluation.sub_descriptors.some((d) => d.startsWith('Estimate')),
  'Evaluation carries the ESTIMATE act, which the four-skill papers have no counterpart for');
assert(PROFESSIONAL_SKILLS.analysis.sub_descriptors.some((d) => d.startsWith('Enquire')),
  'Analysis carries the ENQUIRE act, which the four-skill papers have no counterpart for');

// ─────────────────────────────────────────────────────────────────────────────
// Test 6 — Exam structure. SBL has NO exam sections: one integrated case, three tasks.
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 6 — exam structure is one integrated case study, not a sectioned paper');
assert(EXAM_STRUCTURE.total_marks === 100, 'exam totals 100 marks');
assert(EXAM_STRUCTURE.duration_minutes === 195, 'exam is 3h15m (195 minutes), including RPRT');
assert(EXAM_STRUCTURE.pass_mark_percent === 50, 'pass mark is 50%');
assert(EXAM_STRUCTURE.task_count === 3, 'exam contains three tasks');
assert(EXAM_STRUCTURE.all_tasks_compulsory === true, 'all tasks must be completed');
assert(EXAM_STRUCTURE.marks_professional_skills === 20, '20 of the 100 marks are professional skills marks');
assert(EXAM_STRUCTURE.format === 'integrated_case_study', 'format is a 100% integrated case study');
assert(EXAM_STRUCTURE.pre_seen.released_weeks_before === 2, 'pre-seen is released two weeks before the sitting');
assert(!('section_a' in EXAM_STRUCTURE) && !('section_b' in EXAM_STRUCTURE),
  'SBL EXAM_STRUCTURE must not carry section_a/section_b — it is not a sectioned paper');
assert(EXAM_STRUCTURE.professional_skills_behaviours.length === 5,
  'all five professional skills are examined');
for (const b of EXAM_STRUCTURE.professional_skills_behaviours) {
  assert(b in PROFESSIONAL_SKILLS, `examined behaviour ${b} is a defined professional skill`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7 — COMMAND_VERBS are DERIVED from the descriptors, so every verb must actually open one
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 7 — command verbs are derived from the descriptors, not curated');
assert(Object.keys(COMMAND_VERBS).length > 0, 'COMMAND_VERBS is populated');
for (const [verb, meta] of Object.entries(COMMAND_VERBS)) {
  const opens = entries.filter(([, e]) => e.descriptor.toLowerCase().startsWith(verb));
  assert(opens.length > 0, `command verb "${verb}" opens at least one descriptor`);
  const seen = new Set(opens.map(([, e]) => e.intellectual_level));
  assert(meta.levels.length === seen.size && meta.levels.every((l) => seen.has(l)),
    `command verb "${verb}" records exactly the levels it appears at`);
}
for (const [code, e] of entries) {
  const first = e.descriptor.toLowerCase().match(/^([a-z]+)/)?.[1];
  assert(!!first && first in COMMAND_VERBS, `${code}'s opening verb is in COMMAND_VERBS`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8 — Employability skills, section J, verbatim and levelless
// ─────────────────────────────────────────────────────────────────────────────
console.log('Test 8 — employability skills held separately, with no levels');
assert(EMPLOYABILITY_SKILLS.length === 4, `section J holds four skills (got ${EMPLOYABILITY_SKILLS.length})`);
for (const s of EMPLOYABILITY_SKILLS) {
  assert(s.length > 40, 'employability skill is verbatim-length');
  assert(!/\[\d\]/.test(s), 'employability skill carries no intellectual level (the source gives none)');
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
const totalTests = passed + failed;
console.log(`\n${'─'.repeat(55)}`);
console.log(`SBL framework meta-tests: ${passed}/${totalTests} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n${failed} test(s) failed — fix the EMITTER in scripts/authoring/build-sbl-crosswalk-ledger.ts, not sbl-framework.ts.`);
  process.exit(1);
}
console.log('All tests green.');
