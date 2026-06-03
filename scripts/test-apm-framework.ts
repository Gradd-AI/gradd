#!/usr/bin/env tsx
/**
 * test-apm-framework.ts
 *
 * Meta-tests for apm-framework.ts.
 * Asserts structural invariants without calling any external API or DB.
 * Same style as the IB meta-tests in the scripts/ directory.
 *
 * Usage: npx tsx scripts/test-apm-framework.ts
 */

import {
  SYLLABUS_MAP,
  INTELLECTUAL_LEVELS,
  COMMAND_VERBS,
  PROFESSIONAL_SKILLS,
  CALCULATION_LOS,
  EXAM_STRUCTURE,
} from './apm-framework';

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1 — Every LO code maps to a valid section (A, B, C, or D)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 1 — All LO codes map to valid sections A/B/C/D');
const VALID_SECTIONS = new Set(['A', 'B', 'C', 'D']);
for (const [code, entry] of Object.entries(SYLLABUS_MAP)) {
  assert(
    VALID_SECTIONS.has(entry.section),
    `${code}: section="${entry.section}" is one of A/B/C/D`,
  );
  assert(
    code[0] === entry.section,
    `${code}: code prefix "${code[0]}" matches section "${entry.section}"`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 2 — Every LO has intellectual_level 2 or 3 (no L1 in APM)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 2 — All LOs have intellectual_level 2 or 3 (no L1 in APM)');
for (const [code, entry] of Object.entries(SYLLABUS_MAP)) {
  assert(
    entry.intellectual_level === 2 || entry.intellectual_level === 3,
    `${code}: intellectual_level=${entry.intellectual_level} ∈ {2, 3}`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 3 — Every CALCULATION_LOS code exists in SYLLABUS_MAP
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 3 — All CALCULATION_LOS codes exist in SYLLABUS_MAP');
const syllabusKeys = new Set(Object.keys(SYLLABUS_MAP));
for (const code of CALCULATION_LOS) {
  assert(
    syllabusKeys.has(code),
    `CALCULATION_LOS "${code}" exists in SYLLABUS_MAP`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 4 — Section LO counts match verbatim study guide (A=30, B=24, C=5, D=14)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 4 — Section LO counts match guide (A=30, B=24, C=5, D=14, total=73)');
const countsBySection: Record<string, number> = {};
for (const entry of Object.values(SYLLABUS_MAP)) {
  countsBySection[entry.section] = (countsBySection[entry.section] ?? 0) + 1;
}
assert(countsBySection['A'] === 30, `Section A: 30 LOs (got ${countsBySection['A']})`);
assert(countsBySection['B'] === 24, `Section B: 24 LOs (got ${countsBySection['B']})`);
assert(countsBySection['C'] === 5,  `Section C: 5 LOs (got ${countsBySection['C']})`);
assert(countsBySection['D'] === 14, `Section D: 14 LOs (got ${countsBySection['D']})`);
const totalLOs = Object.values(countsBySection).reduce((a, b) => a + b, 0);
assert(totalLOs === 73, `Total LO count: 73 (got ${totalLOs})`);

// ─────────────────────────────────────────────────────────────────────────────
// Test 5 — Sub-area counts match guide (A1=10, A2=5, A3=6, A4=4, A5=5,
//           B1=4, B2=6, B3=5, B4=9, C1=5, D1=5, D2=9)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 5 — Sub-area LO counts are correct');
const countsBySubArea: Record<string, number> = {};
for (const entry of Object.values(SYLLABUS_MAP)) {
  countsBySubArea[entry.sub_area] = (countsBySubArea[entry.sub_area] ?? 0) + 1;
}
const expectedSubAreaCounts: Record<string, number> = {
  A1: 10, A2: 5, A3: 6, A4: 4, A5: 5,
  B1: 4,  B2: 6, B3: 5, B4: 9,
  C1: 5,
  D1: 5,  D2: 9,
};
for (const [subArea, expected] of Object.entries(expectedSubAreaCounts)) {
  const actual = countsBySubArea[subArea] ?? 0;
  assert(actual === expected, `${subArea}: ${expected} LOs (got ${actual})`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 6 — Every COMMAND_VERB has levels in {2, 3} only
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 6 — All COMMAND_VERBS have levels in {2, 3}');
for (const [verb, entry] of Object.entries(COMMAND_VERBS)) {
  assert(entry.levels.length > 0, `Verb "${verb}" has at least one level`);
  for (const level of entry.levels) {
    assert(
      level === 2 || level === 3,
      `Verb "${verb}" level ${level} ∈ {2, 3}`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 7 — PROFESSIONAL_SKILLS has exactly 4 entries with the expected keys
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 7 — PROFESSIONAL_SKILLS has 4 entries with correct keys');
const expectedSkills = ['communication', 'analysis_and_evaluation', 'scepticism', 'commercial_acumen'];
const actualSkills = Object.keys(PROFESSIONAL_SKILLS);
assert(actualSkills.length === 4, `4 professional skills defined (got ${actualSkills.length})`);
for (const skill of expectedSkills) {
  assert(actualSkills.includes(skill), `Professional skill "${skill}" is defined`);
  if (skill in PROFESSIONAL_SKILLS) {
    const entry = PROFESSIONAL_SKILLS[skill as keyof typeof PROFESSIONAL_SKILLS];
    assert(
      entry.sub_descriptors.length >= 3,
      `${skill} has ≥3 sub-descriptors (got ${entry.sub_descriptors.length})`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 8 — INTELLECTUAL_LEVELS has L1, L2, L3 defined
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 8 — INTELLECTUAL_LEVELS has L1, L2, L3');
assert('L1' in INTELLECTUAL_LEVELS, 'L1 defined');
assert('L2' in INTELLECTUAL_LEVELS, 'L2 defined');
assert('L3' in INTELLECTUAL_LEVELS, 'L3 defined');
assert(INTELLECTUAL_LEVELS.L1.length > 10, 'L1 descriptor is non-empty');
assert(INTELLECTUAL_LEVELS.L2.length > 10, 'L2 descriptor is non-empty');
assert(INTELLECTUAL_LEVELS.L3.length > 10, 'L3 descriptor is non-empty');

// ─────────────────────────────────────────────────────────────────────────────
// Test 9 — EXAM_STRUCTURE marks arithmetic is correct
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 9 — EXAM_STRUCTURE marks arithmetic');
const { section_a, section_b } = EXAM_STRUCTURE;
assert(
  section_a.marks_technical + section_a.marks_professional_skills === section_a.marks_total,
  `Section A: ${section_a.marks_technical} tech + ${section_a.marks_professional_skills} prof = ${section_a.marks_total}`,
);
assert(
  section_b.marks_per_question_technical + section_b.marks_per_question_professional_skills === section_b.marks_per_question_total,
  `Section B per question: ${section_b.marks_per_question_technical} tech + ${section_b.marks_per_question_professional_skills} prof = ${section_b.marks_per_question_total}`,
);
const computedTotal = section_a.marks_total + section_b.question_count * section_b.marks_per_question_total;
assert(
  computedTotal === EXAM_STRUCTURE.total_marks,
  `Total: ${section_a.marks_total} + ${section_b.question_count}×${section_b.marks_per_question_total} = ${computedTotal} = ${EXAM_STRUCTURE.total_marks}`,
);
assert(EXAM_STRUCTURE.duration_minutes === 195, `Duration: 195 minutes (3h15m)`);
assert(section_b.question_count === 2, `Section B has 2 questions`);
assert(section_b.q1_syllabus_section === 'C', `Section B Q1 sources syllabus C`);
assert(section_b.q2_syllabus_section === 'D', `Section B Q2 sources syllabus D`);

// ─────────────────────────────────────────────────────────────────────────────
// Test 10 — Sub-area codes are well-formed (letter+digit, prefix matches section)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 10 — Sub-area codes are well-formed');
for (const [code, entry] of Object.entries(SYLLABUS_MAP)) {
  assert(
    /^[ABCD][0-9]+$/.test(entry.sub_area),
    `${code}: sub_area "${entry.sub_area}" matches pattern /[ABCD][0-9]+/`,
  );
  assert(
    entry.sub_area[0] === entry.section,
    `${code}: sub_area prefix matches section "${entry.section}"`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 11 — CALCULATION_LOS has at least 8 entries (minimum QA set)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 11 — CALCULATION_LOS has at least 8 entries');
assert(CALCULATION_LOS.size >= 8, `CALCULATION_LOS has ${CALCULATION_LOS.size} entries (≥ 8)`);

// ─────────────────────────────────────────────────────────────────────────────
// Test 12 — Known calculation LOs are flagged (user-specified minimum set)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 12 — Known calculation LOs are present (A3b, A3e, A5e, B1b, B1c, D2e)');
const requiredCalcLOs = ['A3b', 'A3e', 'A5e', 'B1b', 'B1c', 'D2e'] as const;
for (const code of requiredCalcLOs) {
  assert(CALCULATION_LOS.has(code), `${code} is flagged as calculation_required`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 13 — Every LO has a non-empty descriptor and topic
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 13 — All LOs have non-empty descriptor and topic');
for (const [code, entry] of Object.entries(SYLLABUS_MAP)) {
  assert(entry.descriptor.length > 20, `${code}: descriptor is non-empty`);
  assert(entry.topic.length > 0,       `${code}: topic is non-empty`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 14 — Section A has more L3 than L2 LOs (expected for strategic exam)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 14 — Section A L3 LOs outnumber L2 LOs');
const aL2 = Object.entries(SYLLABUS_MAP).filter(([, e]) => e.section === 'A' && e.intellectual_level === 2).length;
const aL3 = Object.entries(SYLLABUS_MAP).filter(([, e]) => e.section === 'A' && e.intellectual_level === 3).length;
assert(aL3 > aL2, `Section A: ${aL3} L3 LOs > ${aL2} L2 LOs`);

// ─────────────────────────────────────────────────────────────────────────────
// Test 15 — Section D2 is all L2 (newly added data analytics LOs are application-level)
// ─────────────────────────────────────────────────────────────────────────────
console.log('\nTest 15 — Section D2 LOs D2b–D2i are all L2 (application level)');
const d2L2Only = ['D2b', 'D2d', 'D2e', 'D2f', 'D2g', 'D2h', 'D2i'] as const;
for (const code of d2L2Only) {
  const entry = SYLLABUS_MAP[code];
  assert(
    entry.intellectual_level === 2,
    `${code}: intellectual_level=2 (got ${entry.intellectual_level})`,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Summary
// ─────────────────────────────────────────────────────────────────────────────
const totalTests = passed + failed;
console.log(`\n${'─'.repeat(55)}`);
console.log(`APM framework meta-tests: ${passed}/${totalTests} passed, ${failed} failed`);
if (failed > 0) {
  console.error(`\n${failed} test(s) failed — fix apm-framework.ts before committing.`);
  process.exit(1);
}
console.log('All tests green.');
