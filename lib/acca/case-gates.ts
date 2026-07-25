// lib/acca/case-gates.ts
// CASE-LEVEL structural gates for a mock paper (1 Section A case + 2 Section B
// cases). These sit ALONGSIDE — never replace — the per-requirement family gates
// (each requirement's numbers/verdicts are still owned by its calculator kind or
// the narrative marker; those gates are unchanged). What THIS module validates is
// the shape a mock paper must have to be exam-faithful, straight from the ACCA AFM
// Syllabus & Study Guide §7 "Approach to examining the syllabus" (S26–J27):
//
//   • Section A is a single 50-mark case whose focus spans "at least two syllabus
//     sections from A - E".
//   • Section B questions are "scenario based and contain a combination of
//     calculation and narrative marks. There will not be any wholly narrative
//     questions."
//   • "every exam will have question(s) which have a focus on syllabus sections B
//     and E."
//   • "All of the professional skills will be examined in Section A." Section B:
//     "a minimum of two professional skills from Analysis and Evaluation,
//     Scepticism and Commercial Acumen" — Communication is Section-A-only.
//
// Pure: no DB, no model, no env. Gates take a blueprint-shaped GatePaper (the same
// fields an authored case row carries, plus each requirement's marking_kind — which
// the blueprint declares and which the family gate for that kind then enforces) and
// return {pass, violations}. The A/B structure and A–E section lettering are common
// to APM and AFM, so these gates are paper-agnostic by construction.

// Which engine marks a requirement. 'calc' = one of the 12 built calculator kinds
// (code owns every figure); 'narrative' = the narrative marker with a rubric (N1–N5).
// A mock requirement MUST be one of these — no requirement may need an unbuilt engine.
export type MarkingKind = 'calc' | 'narrative';
export type Section = 'A' | 'B';

// Section B draws its professional skills from these three ONLY (§7). Communication
// is examined in Section A only.
export const SECTION_B_PS_SKILLS = [
  'analysis_and_evaluation',
  'scepticism',
  'commercial_acumen',
] as const;

// All four professional skills — Section A must examine every one (§7).
export const ALL_PS_SKILLS = [
  'communication',
  'analysis_and_evaluation',
  'scepticism',
  'commercial_acumen',
] as const;

export interface GateRequirement {
  lo_code: string;                   // e.g. 'B1a', 'E2b' — first char is the syllabus section letter
  marks_guide: number;               // technical marks for THIS requirement
  marking_kind: MarkingKind;         // which built engine marks it
  professional_skill_tags: string[]; // parsed professional_skill_tags (already comma-split + trimmed)
}

export interface GateCase {
  section: Section;
  anchor_area: string | null;        // e.g. 'B1','E2'; null for a spanning Section A case
  total_marks: number;
  professional_skills_marks: number;
  requirements: GateRequirement[];
}

export interface GatePaper {
  cases: GateCase[];
}

export interface GateResult {
  pass: boolean;
  violations: string[];
}

// The syllabus section letter a requirement sits in (first char of its lo_code).
function sectionLetter(loCode: string): string {
  return (loCode.charAt(0) || '').toUpperCase();
}

// A gate result from a list of violations (empty list → pass).
function result(violations: string[]): GateResult {
  return { pass: violations.length === 0, violations };
}

// ── GATE C1 — Section-A span ─────────────────────────────────────────────────
// Every Section A case must draw its requirements from ≥2 distinct syllabus
// sections (A–E). A single-section Section A case is not exam-faithful.
export function gateSectionASpan(paper: GatePaper): GateResult {
  const violations: string[] = [];
  const sectionACases = paper.cases.filter((c) => c.section === 'A');
  for (const c of sectionACases) {
    const letters = new Set(c.requirements.map((r) => sectionLetter(r.lo_code)));
    if (letters.size < 2) {
      violations.push(
        `Section A case must span ≥2 syllabus sections; found ${letters.size} (${[...letters].join(', ') || 'none'}).`,
      );
    }
  }
  return result(violations);
}

// ── GATE C2 — not wholly narrative (Section B) ───────────────────────────────
// Each Section B case must contain ≥1 calculation-marked requirement ("There will
// not be any wholly narrative questions").
export function gateNotWhollyNarrative(paper: GatePaper): GateResult {
  const violations: string[] = [];
  const sectionBCases = paper.cases.filter((c) => c.section === 'B');
  sectionBCases.forEach((c, i) => {
    const hasCalc = c.requirements.some((r) => r.marking_kind === 'calc');
    if (!hasCalc) {
      violations.push(
        `Section B case ${i + 1} is wholly narrative — needs ≥1 calc-kind requirement (Section B always carries calculation marks).`,
      );
    }
  });
  return result(violations);
}

// ── GATE C3 — B + E represented across the paper ─────────────────────────────
// Every exam has question(s) focused on sections B and E. Across all requirements
// in the whole paper, both letters must appear.
export function gateBAndERepresented(paper: GatePaper): GateResult {
  const letters = new Set(
    paper.cases.flatMap((c) => c.requirements.map((r) => sectionLetter(r.lo_code))),
  );
  const violations: string[] = [];
  if (!letters.has('B')) violations.push('No requirement focuses on syllabus section B (guaranteed on every exam).');
  if (!letters.has('E')) violations.push('No requirement focuses on syllabus section E (guaranteed on every exam).');
  return result(violations);
}

// ── GATE C4 — professional-skills set ────────────────────────────────────────
// Section A: the union of its requirements' PS tags must cover ALL FOUR skills.
// Section B: each case's union must contain ≥2 distinct skills from the three-skill
// set {A&E, scepticism, commercial acumen}, and NO Section B requirement may tag
// communication (Section-A-only).
export function gatePsSkillSet(paper: GatePaper): GateResult {
  const violations: string[] = [];
  const bSet = new Set<string>(SECTION_B_PS_SKILLS);

  paper.cases.forEach((c, idx) => {
    const union = new Set(c.requirements.flatMap((r) => r.professional_skill_tags));
    if (c.section === 'A') {
      const missing = ALL_PS_SKILLS.filter((s) => !union.has(s));
      if (missing.length > 0) {
        violations.push(`Section A case must examine all four professional skills; missing: ${missing.join(', ')}.`);
      }
    } else {
      // Communication is Section-A-only.
      if (union.has('communication')) {
        violations.push(`Section B case ${idx + 1} tags 'communication', which is a Section-A-only professional skill.`);
      }
      const fromBSet = [...union].filter((s) => bSet.has(s));
      if (fromBSet.length < 2) {
        violations.push(
          `Section B case ${idx + 1} needs ≥2 professional skills from {${SECTION_B_PS_SKILLS.join(', ')}}; found ${fromBSet.length} (${fromBSet.join(', ') || 'none'}).`,
        );
      }
    }
  });
  return result(violations);
}

export interface CaseGateReport {
  pass: boolean;
  results: Record<string, GateResult>;
}

// Run all four case-level gates. Aggregate pass = every gate passed.
export function runCaseGates(paper: GatePaper): CaseGateReport {
  const results: Record<string, GateResult> = {
    'C1-section-a-span': gateSectionASpan(paper),
    'C2-not-wholly-narrative': gateNotWhollyNarrative(paper),
    'C3-b-and-e-represented': gateBAndERepresented(paper),
    'C4-ps-skill-set': gatePsSkillSet(paper),
  };
  return {
    pass: Object.values(results).every((r) => r.pass),
    results,
  };
}
