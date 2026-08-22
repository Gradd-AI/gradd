import type { AccaPaper } from './paper';

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

// ── PER-PAPER GATE CONFIG (2026-08-18) ───────────────────────────────────────
// The constants above describe APM and AFM, which share an exam shape. SBL does not have that
// shape AT ALL: it is a single 100% integrated case study of three tasks, with no Section A and
// no Section B. So C1 (Section-A span), C2 (Section B not wholly narrative) and C3 (B and E
// represented) are not "different for SBL" — they are questions about a structure SBL does not
// have, and a paper with no sections must not be answering section questions.
//
// ⚠️ INAPPLICABLE IS NOT PASS. An n/a gate reports `applicable: false` and is EXCLUDED from the
// aggregate rather than counted as a green. A gate that silently passes because it could not
// find anything to check is the failure mode this whole module exists to avoid, and it would be
// indistinguishable from a real pass in every report we print.
//
// The field is set ONLY on inapplicable results, so an APM/AFM report is byte-identical to the
// one this module produced before SBL existed.
export interface PaperGateConfig {
  /** Does this paper's exam have A/B sections? SBL: no. */
  hasExamSections: boolean;
  /** The paper's full professional-skill set — four for APM/AFM, FIVE for SBL. */
  allSkills: readonly string[];
  /** Skills a Section B question may draw from. null when the paper has no sections. */
  sectionBSkills: readonly string[] | null;
}

export const SBL_PS_SKILLS = [
  'communication',
  'commercial_acumen',
  'analysis',
  'scepticism',
  'evaluation',
] as const;

export const GATE_CONFIG: Record<AccaPaper, PaperGateConfig> = {
  APM: { hasExamSections: true, allSkills: ALL_PS_SKILLS, sectionBSkills: SECTION_B_PS_SKILLS },
  AFM: { hasExamSections: true, allSkills: ALL_PS_SKILLS, sectionBSkills: SECTION_B_PS_SKILLS },
  // SBL's five skills are NOT the four plus one. `analysis` and `evaluation` are separate
  // skills, and neither is half of APM/AFM's combined `analysis_and_evaluation` — see
  // SBL_SKILL_DESCRIPTORS in case-marking.ts.
  SBL: { hasExamSections: false, allSkills: SBL_PS_SKILLS, sectionBSkills: null },
};

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
  /**
   * Set to `false` ONLY when this gate asks a question the paper's exam structure cannot answer
   * (e.g. a Section-A gate on SBL, which has no sections). Absent means applicable, which keeps
   * every APM/AFM result byte-identical to the pre-SBL shape.
   *
   * An inapplicable gate is excluded from the aggregate — it is neither a pass nor a failure,
   * and printing it as a pass would let "we checked nothing" read as "we checked and it was fine".
   */
  applicable?: false;
  /** Why the gate does not apply. Present only alongside `applicable: false`. */
  reason?: string;
}

/** An n/a result: not a pass, not a failure, and excluded from the aggregate. */
function notApplicable(reason: string): GateResult {
  return { pass: true, violations: [], applicable: false, reason };
}

/**
 * The professional-skill tags a paper is allowed to use. Pure, and exported for the MARKING path
 * as well as the gates — they must agree, and one definition is how.
 */
export function knownSkillTags(paper: AccaPaper): readonly string[] {
  return GATE_CONFIG[paper].allSkills;
}

/**
 * ── THE FREE-TEXT TRAP, CLOSED (2026-08-18) ─────────────────────────────────
 * `acca_case_requirements.professional_skill_tags` is `text` with NO check constraint and no
 * enum, and the marking path builds its examined-skill list by splitting that column on commas.
 * `judgeCaseMarking` then looks each tag up in the paper's descriptor map and, on a miss, fell
 * back to the string '(no authored descriptor on file for this skill)'.
 *
 * That fallback is a SILENT MIS-SCORE, not a graceful degradation: the skill still enters the
 * numbered rubric, still consumes an equal share of the professional-skills pool
 * (`ceiling = pool / examinedSkills.length`), and is still banded by the model — against no
 * descriptor at all. One typo mints a skill and takes marks from the real ones.
 *
 * It was invisible while every paper had the same four tags. With a five-skill paper whose set
 * OVERLAPS but does not match (`analysis` vs `analysis_and_evaluation`), a single mis-tagged
 * requirement produces exactly this, and the wrong figure is a mark on a student's paper.
 *
 * So: validate against the paper's declared set and REFUSE. Returns the unknown tags; an empty
 * array means every tag is known.
 */
export function unknownSkillTags(paper: AccaPaper, tags: readonly string[]): string[] {
  const known = new Set(knownSkillTags(paper));
  return [...new Set(tags)].filter((t) => !known.has(t));
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
export function gateSectionASpan(paper: GatePaper, cfg: PaperGateConfig = GATE_CONFIG.AFM): GateResult {
  if (!cfg.hasExamSections) return notApplicable("paper has no Section A — its exam is a single integrated case study");
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
export function gateNotWhollyNarrative(paper: GatePaper, cfg: PaperGateConfig = GATE_CONFIG.AFM): GateResult {
  if (!cfg.hasExamSections) return notApplicable("paper has no Section B — its exam is a single integrated case study");
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
export function gateBAndERepresented(paper: GatePaper, cfg: PaperGateConfig = GATE_CONFIG.AFM): GateResult {
  if (!cfg.hasExamSections) return notApplicable("guaranteed-B-and-E is an APM/AFM section rule; SBL guarantees no syllabus section");
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
//
// SBL: no sections, so the demand is made of the PAPER — the union across every case must cover
// all five skills. Same rule (the paper examines its whole skill set), asked of the unit that
// actually exists.
export function gatePsSkillSet(paper: GatePaper, cfg: PaperGateConfig = GATE_CONFIG.AFM): GateResult {
  const violations: string[] = [];

  if (!cfg.hasExamSections) {
    const union = new Set(paper.cases.flatMap((c) => c.requirements.flatMap((r) => r.professional_skill_tags)));
    const missing = cfg.allSkills.filter((s) => !union.has(s));
    if (missing.length > 0) {
      violations.push(`Paper must examine all ${cfg.allSkills.length} professional skills; missing: ${missing.join(', ')}.`);
    }
    // A tag outside the paper's declared set is a refusal, never a silently-extra skill: the
    // marking path derives its examined-skill list from these same strings, so an unknown one
    // would be marked against a descriptor that does not exist. See assertKnownSkillTags.
    const unknown = [...union].filter((s) => !cfg.allSkills.includes(s));
    if (unknown.length > 0) {
      violations.push(`Unknown professional skill tag(s) for this paper: ${unknown.join(', ')}. Declared set: {${cfg.allSkills.join(', ')}}.`);
    }
    return result(violations);
  }

  const bSet = new Set<string>(cfg.sectionBSkills ?? SECTION_B_PS_SKILLS);

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

// Run all four case-level gates. Aggregate pass = every APPLICABLE gate passed.
//
// `paperCode` defaults to 'AFM', which keeps every pre-existing caller byte-identical. The
// default is IMMATERIAL between the two served papers — APM and AFM share one PaperGateConfig,
// and `test-case-gates.ts` asserts runCaseGates(p) deep-equals runCaseGates(p, 'APM') and
// runCaseGates(p, 'AFM') on the real published corpora, so this is proven rather than asserted.
export function runCaseGates(paper: GatePaper, paperCode: AccaPaper = 'AFM'): CaseGateReport {
  const cfg = GATE_CONFIG[paperCode];
  const results: Record<string, GateResult> = {
    'C1-section-a-span': gateSectionASpan(paper, cfg),
    'C2-not-wholly-narrative': gateNotWhollyNarrative(paper, cfg),
    'C3-b-and-e-represented': gateBAndERepresented(paper, cfg),
    'C4-ps-skill-set': gatePsSkillSet(paper, cfg),
  };
  return {
    // An inapplicable gate is not a pass to be counted — it is excluded.
    pass: Object.values(results).filter((r) => r.applicable !== false).every((r) => r.pass),
    results,
  };
}
