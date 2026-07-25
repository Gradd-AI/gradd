// scripts/test-case-gates.ts
// Fixtures for the case-level mock-paper gates (lib/acca/case-gates.ts). Pure — no
// env/DB/model. Each gate: passes a valid paper shape, and fails a seeded
// violation. The aggregate runCaseGates passes a fully-valid paper.

import {
  runCaseGates,
  gateSectionASpan,
  gateNotWhollyNarrative,
  gateBAndERepresented,
  gatePsSkillSet,
  type GatePaper,
  type GateCase,
  type GateRequirement,
} from '../lib/acca/case-gates';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
}

// ── builders ──
const req = (
  lo_code: string,
  marking_kind: GateRequirement['marking_kind'],
  tags: string[],
  marks = 10,
): GateRequirement => ({ lo_code, marks_guide: marks, marking_kind, professional_skill_tags: tags });

const caseA = (requirements: GateRequirement[]): GateCase => ({
  section: 'A',
  anchor_area: null,
  total_marks: 50,
  professional_skills_marks: 10,
  requirements,
});
const caseB = (requirements: GateRequirement[], anchor: string): GateCase => ({
  section: 'B',
  anchor_area: anchor,
  total_marks: 25,
  professional_skills_marks: 5,
  requirements,
});

// ── A fully VALID paper (1 Section A + 2 Section B) ──
// Section A spans E + B (2 sections), examines all 4 PS skills.
const validSectionA = caseA([
  req('E2b', 'calc', ['communication', 'analysis_and_evaluation'], 16),
  req('B1a', 'calc', ['scepticism'], 14),
  req('B3d', 'narrative', ['commercial_acumen'], 10),
]);
// Section B #1 — B-anchored, has a calc, ≥2 of the 3-set, no communication.
const validSectionB1 = caseB([req('B1a', 'calc', ['analysis_and_evaluation', 'scepticism'], 20)], 'B1');
// Section B #2 — E-anchored, has a calc, ≥2 of the 3-set.
const validSectionB2 = caseB(
  [req('E2b', 'calc', ['analysis_and_evaluation'], 12), req('E3a', 'narrative', ['scepticism', 'commercial_acumen'], 8)],
  'E2',
);
const VALID: GatePaper = { cases: [validSectionA, validSectionB1, validSectionB2] };

// ── aggregate ──
ok('VALID paper passes all four case gates', runCaseGates(VALID).pass === true);
ok('VALID paper reports zero violations', Object.values(runCaseGates(VALID).results).every((r) => r.violations.length === 0));

// ── GATE C1 — Section-A span ──
ok('C1 passes a spanning Section A (E + B)', gateSectionASpan(VALID).pass === true);
const singleSectionA: GatePaper = {
  cases: [
    caseA([req('B1a', 'calc', ['communication', 'analysis_and_evaluation'], 25), req('B3d', 'narrative', ['scepticism', 'commercial_acumen'], 15)]),
    validSectionB1,
    validSectionB2,
  ],
};
ok('C1 FAILS a single-section Section A (all B)', gateSectionASpan(singleSectionA).pass === false);

// ── GATE C2 — not wholly narrative (Section B) ──
ok('C2 passes when each Section B has a calc requirement', gateNotWhollyNarrative(VALID).pass === true);
const whollyNarrativeB: GatePaper = {
  cases: [validSectionA, caseB([req('B1a', 'narrative', ['analysis_and_evaluation', 'scepticism'], 20)], 'B1'), validSectionB2],
};
ok('C2 FAILS a wholly-narrative Section B case', gateNotWhollyNarrative(whollyNarrativeB).pass === false);

// ── GATE C3 — B + E represented across the paper ──
ok('C3 passes when both B and E appear', gateBAndERepresented(VALID).pass === true);
const noEPaper: GatePaper = {
  cases: [
    caseA([req('B1a', 'calc', ['communication', 'analysis_and_evaluation'], 25), req('C1a', 'narrative', ['scepticism', 'commercial_acumen'], 15)]),
    caseB([req('B3d', 'calc', ['analysis_and_evaluation', 'scepticism'], 20)], 'B3'),
    caseB([req('C1a', 'calc', ['scepticism', 'commercial_acumen'], 20)], 'C1'),
  ],
};
ok('C3 FAILS when section E is absent from the whole paper', gateBAndERepresented(noEPaper).pass === false);
ok('C3 violation names E specifically', gateBAndERepresented(noEPaper).violations.some((v) => v.includes('section E')));

// ── GATE C4 — professional-skills set ──
ok('C4 passes the valid paper', gatePsSkillSet(VALID).pass === true);
// (a) Section A missing a skill
const sectionAMissingSkill: GatePaper = {
  cases: [
    caseA([req('E2b', 'calc', ['communication', 'analysis_and_evaluation'], 30), req('B1a', 'calc', ['scepticism'], 20)]),
    validSectionB1,
    validSectionB2,
  ],
};
ok('C4 FAILS a Section A missing commercial_acumen', gatePsSkillSet(sectionAMissingSkill).pass === false);
ok('C4 violation names the missing Section-A skill', gatePsSkillSet(sectionAMissingSkill).violations.some((v) => v.includes('commercial_acumen')));
// (b) Section B tags communication (Section-A-only)
const sectionBHasComms: GatePaper = {
  cases: [validSectionA, caseB([req('B1a', 'calc', ['communication', 'scepticism'], 20)], 'B1'), validSectionB2],
};
ok('C4 FAILS a Section B that tags communication', gatePsSkillSet(sectionBHasComms).pass === false);
ok('C4 violation flags communication as Section-A-only', gatePsSkillSet(sectionBHasComms).violations.some((v) => v.includes('communication') && v.includes('Section-A-only')));
// (c) Section B with only 1 skill from the 3-set
const sectionBOneSkill: GatePaper = {
  cases: [validSectionA, caseB([req('B1a', 'calc', ['analysis_and_evaluation'], 20)], 'B1'), validSectionB2],
};
ok('C4 FAILS a Section B with only 1 of the 3 permitted skills', gatePsSkillSet(sectionBOneSkill).pass === false);

// ── aggregate FAILS if ANY gate fails ──
ok('runCaseGates aggregate FAILS when C1 is violated', runCaseGates(singleSectionA).pass === false);

console.log(failures === 0 ? '\nALL CASE-GATE FIXTURES PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
