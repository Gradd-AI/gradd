#!/usr/bin/env tsx
/**
 * verify-mark-schemes.ts
 *
 * Audits candidate mark schemes in the `mark_schemes` table.
 * Runs five checks per scheme; writes structured verifier_notes as JSONB.
 *
 * Usage:
 *   npm run verify-schemes -- --subject IB_ECONOMICS [--limit N] [--dry-run]
 *   npm run verify-schemes -- --subject IB_BUSINESS_MANAGEMENT --regen-rejected
 *
 * Args:
 *   --subject         Required. IB_ECONOMICS | IB_BUSINESS_MANAGEMENT
 *   --limit           Process at most N candidates (default: all unverified)
 *   --dry-run         Print candidate list and check breakdown; no API or DB writes
 *   --regen-rejected  Re-verify schemes where verification_status='fail' (scaffolded for later)
 *
 * Five checks (Rule 22 traceability — each check references its source constant):
 *   1. scheme_type_match     Deterministic — resolveSchemeType() vs stored scheme_type
 *   2. marks_sum_invariant   Deterministic — CC accepted_points sum; hybrid method+answer sum; CM criteria sum
 *   3. data_shape            Deterministic — required keys present and typed correctly for scheme_type
 *   4. verbatim_match        Deterministic — BD/CM scheme_data matches V3 framework constants byte-for-byte
 *   5. semantic_relevance    LLM (CC/hybrid only) — does scheme actually mark the question being asked?
 *
 * Rule 23 — verifier-of-the-verifier:
 *   Verdict is always computed deterministically from the five criteria fields.
 *   pass      = all fields in positive state (correct/valid/relevant or na)
 *   fail      = any of: scheme_type_match=mismatch, marks_sum_invariant=violation,
 *               data_shape=invalid, verbatim_match=drift, semantic_relevance=drifted
 *   borderline = anything else
 *   Contradiction guard: if reasoning implies "pass" but a major-fail field is set → throw.
 *
 * LLM call is skipped for band_descriptor and criteria_marked (canonical schemes cannot
 * drift semantically — if their data differs from constants, check 4 catches it as a bug).
 * LLM call is also skipped when check 1 (type mismatch) or check 3 (invalid shape) fails,
 * since semantic evaluation of wrong-typed or malformed data is undefined.
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import {
  MARK_SCHEME_V3_IB_ECONOMICS,
  MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT,
  AO2_HUMAN_REVIEW_MARKS_RANGE,
  resolveSchemeType,
  flagMultiValueMissingStep,
  detectExplainNCount,
  flagExplainNInsufficientPoints,
  flagWrongMultiplierFormula,
  flagInvertedElasticityLabel,
  type SchemeType,
  type MarkSchemeData,
  type Band,
  type Criterion,
  type ContentChecklistData,
  type HybridData,
  type BandDescriptorData,
  type CriteriaMarkedData,
  type SchemeTypeInput,
} from './mark-scheme-framework';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionJoin {
  question_text: string;
  context_text:  string | null;
  command_term:  string;
  ao_level:      string;
  paper:         string;
  question_type: string;
  marks:         number;
  level:         string;
}

// Raw row from Supabase join (mark_schemes + questions!inner)
interface MarkSchemeCandidateRow {
  id:          string;
  question_id: string;
  subject:     string;
  scheme_type: SchemeType;
  max_marks:   number;
  scheme_data: MarkSchemeData;
  questions:   QuestionJoin;
}

// Flat view used throughout the verifier
export interface MarkSchemeCandidate {
  id:            string;
  question_id:   string;
  subject:       string;
  scheme_type:   SchemeType;
  max_marks:     number;
  scheme_data:   MarkSchemeData;
  question_text: string;
  context_text:  string | null;
  command_term:  string;
  ao_level:      string;
  paper:         string;
  question_type: string;
  marks:         number;
  level:         string;
}

// Stored as JSONB in mark_schemes.verification_notes — same structured-field discipline as Layer 1.
// 'na' values are only legal where a check provably does not apply for the scheme_type:
//   marks_sum_invariant='na' → band_descriptor (no point sum)
//   verbatim_match='na'      → content_checklist / hybrid (generated, not canonical)
//   semantic_relevance='na'  → band_descriptor / criteria_marked (canonical; check 4 covers drift)
// human_review_flag='flagged' → AO2 5-6m border cases; all 5 checks may pass but verdict = borderline
export interface MarkSchemeVerificationResult {
  scheme_type_match:   'correct' | 'mismatch';
  marks_sum_invariant: 'correct' | 'violation' | 'na';
  data_shape:          'valid' | 'invalid';
  verbatim_match:      'correct' | 'drift' | 'na';
  semantic_relevance:   'relevant' | 'drifted' | 'na';
  economic_correctness: 'correct' | 'incorrect' | 'uncertain' | 'na';
  human_review_flag:    'flagged' | 'clear';  // 'flagged' = AO2 5-6m or economic 'uncertain' → borderline
  overall:              'pass' | 'borderline' | 'fail';
  reasoning:           string;
  drift_note?:         string;  // set when verbatim_match=drift or semantic_relevance=drifted
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SUBJECT_GUIDE_YEARS: Record<string, string> = {
  IB_ECONOMICS:           '2022',
  IB_BUSINESS_MANAGEMENT: '2024',
};

// Canonical band arrays for check 4 (verbatim_match on band_descriptor schemes).
// Source: MARK_SCHEME_V3_IB_* constants in mark-scheme-framework.ts (Rule 22).
// Must stay in sync with BAND_DESCRIPTOR_MAP in generate-mark-schemes.ts.
const CANONICAL_BANDS: Record<string, Band[] | undefined> = {
  P1_part_a: MARK_SCHEME_V3_IB_ECONOMICS.markbands_p1a,    // Econ P1(a) 10m — p.63
  P1_part_b: MARK_SCHEME_V3_IB_ECONOMICS.markbands_p1b,    // Econ P1(b) 15m — pp.63-64
  P2_part_g: MARK_SCHEME_V3_IB_ECONOMICS.markbands_p2g,    // Econ P2(g) 15m — pp.64-65
  P3_part_b: MARK_SCHEME_V3_IB_ECONOMICS.markbands_p3b,    // Econ P3(b) 10m — pp.65-66
  P1_sec_b:  MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT.markbands_p1_p2_sec_b,  // BM 10m — pp.44-45/47-48
  P2_sec_b:  MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT.markbands_p1_p2_sec_b,  // BM 10m — same
};

const CANONICAL_CRITERIA: Criterion[] =
  MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT.p3_q3_criteria;  // BM P3 Q3 criteria A/B/C/D — pp.48-49

// ─── Check 1: scheme_type_match ───────────────────────────────────────────────

function questionTypeToSection(questionType: string): string | undefined {
  const map: Record<string, string | undefined> = {
    P1_sec_a: 'SEC_A', P1_sec_b: 'SEC_B',
    P2_sec_a: 'SEC_A', P2_sec_b: 'SEC_B',
    P3_q1: 'Q1', P3_q2: 'Q2', P3_q3_criteria: 'Q3',
    P1_part_a: 'part_a', P1_part_b: 'part_b',
    P2_part_a: 'part_a', P2_part_b: 'part_b',
    P2_part_c_f: undefined, P2_part_g: 'part_g',
    P3_part_a: 'part_a', P3_part_b: 'part_b',
  };
  return map[questionType];
}

function checkSchemeTypeMatch(c: MarkSchemeCandidate): { pass: boolean; expected: SchemeType } {
  const input: SchemeTypeInput = {
    subject:      c.subject as 'IB_BUSINESS_MANAGEMENT' | 'IB_ECONOMICS',
    paper:        c.paper as 'P1' | 'P2' | 'P3',
    section:      questionTypeToSection(c.question_type),
    marks:        c.marks,
    command_term: c.command_term,
    ao_level:     c.ao_level,
  };
  const expected = resolveSchemeType(input);
  return { pass: c.scheme_type === expected, expected };
}

// ─── Check 2: marks_sum_invariant ─────────────────────────────────────────────

export function checkMarksSumInvariant(
  c: MarkSchemeCandidate,
): { result: 'correct' | 'violation' | 'na'; message: string } {
  if (c.scheme_type === 'band_descriptor') {
    return { result: 'na', message: 'band_descriptor: no point-sum invariant' };
  }

  if (c.scheme_type === 'content_checklist') {
    const d = c.scheme_data as ContentChecklistData;
    if (!Array.isArray(d?.accepted_points)) {
      return { result: 'violation', message: 'accepted_points is not an array — sum check skipped' };
    }
    // Pool-marking path: AO1 state/identify questions offer a pool of 1m options, award any max_marks.
    // IB practice: more valid options than marks available — strict sum would always false-flag these.
    const term   = c.command_term.toLowerCase();
    const isPool = (term === 'state' || term === 'identify') && c.ao_level === 'AO1';

    if (isPool) {
      const nonUnit = d.accepted_points.filter(p => p.marks !== 1);
      if (nonUnit.length > 0) {
        return {
          result: 'violation',
          message: `pool-marked question has ${nonUnit.length} accepted_point(s) with marks ≠ 1 — all pool options must be 1m`,
        };
      }
      if (d.accepted_points.length < c.max_marks) {
        return {
          result: 'violation',
          message: `pool-marked question has ${d.accepted_points.length} accepted_point(s) but max_marks=${c.max_marks} — need at least ${c.max_marks} pool options`,
        };
      }
      return { result: 'correct', message: `pool-marked: ${d.accepted_points.length} valid 1m option(s), award any ${c.max_marks}` };
    }

    // Standard path: strict sum === max_marks
    const sum = d.accepted_points.reduce((acc, p) => acc + (Number(p.marks) || 0), 0);
    if (sum !== c.max_marks) {
      return { result: 'violation', message: `sum(accepted_points.marks)=${sum} ≠ max_marks=${c.max_marks}` };
    }
    // Pattern 5b — explain-N structure check (§DEFECT-5b)
    const explainN = detectExplainNCount(c.question_text);
    if (explainN > 0 && flagExplainNInsufficientPoints(d.accepted_points, explainN)) {
      return {
        result: 'violation',
        message: `explain-${explainN}-reasons question has ${d.accepted_points.length} accepted_point(s) — minimum ${explainN * 2} required (naming + development per reason)`,
      };
    }
    return { result: 'correct', message: `sum(accepted_points.marks)=${sum} = max_marks=${c.max_marks}` };
  }

  if (c.scheme_type === 'hybrid') {
    const d = c.scheme_data as HybridData;
    if (!Array.isArray(d?.method_marks) || d.answer_marks == null) {
      return { result: 'violation', message: 'hybrid: missing method_marks array or answer_marks — sum check skipped' };
    }
    const methodSum = d.method_marks.reduce((acc, m) => acc + (Number(m.marks) || 0), 0);
    const answerMark = Number(d.answer_marks.correct_answer) || 0;
    const total = methodSum + answerMark;
    if (total !== c.max_marks) {
      return { result: 'violation', message: `method_sum(${methodSum})+answer(${answerMark})=${total} ≠ max_marks=${c.max_marks}` };
    }
    // Pattern 1 — multi-value decomposition check (§DEFECT-1)
    if (flagMultiValueMissingStep(d, c.question_text)) {
      return {
        result: 'violation',
        message: `hybrid sum correct but question names multiple calculated values — each named final value requires a distinct method_marks step (found ${d.method_marks.length} step(s))`,
      };
    }
    return { result: 'correct', message: `method_sum(${methodSum})+answer(${answerMark})=${total} = max_marks=${c.max_marks}` };
  }

  if (c.scheme_type === 'criteria_marked') {
    const d = c.scheme_data as CriteriaMarkedData;
    if (!Array.isArray(d?.criteria)) {
      return { result: 'violation', message: 'criteria is not an array — sum check skipped' };
    }
    const sum = d.criteria.reduce((acc, cr) => acc + (Number(cr.max_marks) || 0), 0);
    return sum === c.max_marks
      ? { result: 'correct',   message: `sum(criteria.max_marks)=${sum} = max_marks=${c.max_marks}` }
      : { result: 'violation', message: `sum(criteria.max_marks)=${sum} ≠ max_marks=${c.max_marks}` };
  }

  return { result: 'na', message: `unknown scheme_type: ${c.scheme_type}` };
}

// ─── Check 3: data_shape ──────────────────────────────────────────────────────

export function checkDataShape(c: MarkSchemeCandidate): { pass: boolean; message: string } {
  const d = c.scheme_data;
  if (!d || typeof d !== 'object' || Array.isArray(d)) {
    return { pass: false, message: 'scheme_data is null, not an object, or an array' };
  }

  if (c.scheme_type === 'content_checklist') {
    const cc = d as Partial<ContentChecklistData>;
    if (!Array.isArray(cc.accepted_points) || typeof cc.marking_rule !== 'string') {
      return { pass: false, message: 'content_checklist: missing accepted_points array or marking_rule string' };
    }
    const bad = cc.accepted_points.find(
      p => typeof p.point !== 'string' || typeof p.marks !== 'number' || !Array.isArray(p.keywords),
    );
    if (bad) {
      return { pass: false, message: `content_checklist: accepted_point missing point/marks/keywords — ${JSON.stringify(bad).slice(0, 100)}` };
    }
    const badKeywords = cc.accepted_points.find(p => p.keywords.length < 2);
    if (badKeywords) {
      return { pass: false, message: `content_checklist: accepted_point has fewer than 2 keywords — point="${badKeywords.point.slice(0, 60)}"` };
    }
    return { pass: true, message: 'valid content_checklist shape' };
  }

  if (c.scheme_type === 'hybrid') {
    const h = d as Partial<HybridData>;
    if (!Array.isArray(h.method_marks) || h.answer_marks == null) {
      return { pass: false, message: 'hybrid: missing method_marks array or answer_marks object' };
    }
    if (typeof h.answer_marks.correct_answer !== 'number') {
      return { pass: false, message: 'hybrid: answer_marks.correct_answer must be a number' };
    }
    if (typeof h.answer_marks.partial_credit_rules !== 'string') {
      return { pass: false, message: 'hybrid: answer_marks.partial_credit_rules must be a string' };
    }
    const bad = h.method_marks.find(m => typeof m.step !== 'string' || typeof m.marks !== 'number');
    if (bad) {
      return { pass: false, message: `hybrid: method_mark missing step/marks — ${JSON.stringify(bad).slice(0, 100)}` };
    }
    return { pass: true, message: 'valid hybrid shape' };
  }

  if (c.scheme_type === 'band_descriptor') {
    const bd = d as Partial<BandDescriptorData>;
    if (!Array.isArray(bd.bands) || bd.bands.length === 0) {
      return { pass: false, message: 'band_descriptor: missing or empty bands array' };
    }
    const bad = bd.bands.find(
      b => !Array.isArray(b.range) || b.range.length !== 2 ||
           typeof b.range[0] !== 'number' || typeof b.range[1] !== 'number' ||
           typeof b.descriptor !== 'string',
    );
    if (bad) {
      return { pass: false, message: `band_descriptor: band missing range[number,number] or descriptor string — ${JSON.stringify(bad).slice(0, 100)}` };
    }
    return { pass: true, message: 'valid band_descriptor shape' };
  }

  if (c.scheme_type === 'criteria_marked') {
    const cm = d as Partial<CriteriaMarkedData>;
    if (!Array.isArray(cm.criteria) || cm.criteria.length === 0) {
      return { pass: false, message: 'criteria_marked: missing or empty criteria array' };
    }
    for (const cr of cm.criteria) {
      if (typeof cr.name !== 'string' || typeof cr.max_marks !== 'number' || !Array.isArray(cr.bands)) {
        return { pass: false, message: `criteria_marked: criterion missing name/max_marks/bands — ${JSON.stringify(cr).slice(0, 100)}` };
      }
    }
    return { pass: true, message: 'valid criteria_marked shape' };
  }

  return { pass: false, message: `unknown scheme_type: "${c.scheme_type}"` };
}

// ─── Check 4: verbatim_match ──────────────────────────────────────────────────

function bandsEqual(stored: Band[], canonical: Band[]): boolean {
  if (stored.length !== canonical.length) return false;
  for (let i = 0; i < canonical.length; i++) {
    if (stored[i].range[0]    !== canonical[i].range[0])    return false;
    if (stored[i].range[1]    !== canonical[i].range[1])    return false;
    if (stored[i].descriptor  !== canonical[i].descriptor)  return false;
  }
  return true;
}

function criteriaEqual(stored: Criterion[], canonical: Criterion[]): boolean {
  if (stored.length !== canonical.length) return false;
  for (let i = 0; i < canonical.length; i++) {
    if (stored[i].name       !== canonical[i].name)       return false;
    if (stored[i].max_marks  !== canonical[i].max_marks)  return false;
    if (!bandsEqual(stored[i].bands, canonical[i].bands)) return false;
  }
  return true;
}

export function checkVerbatimMatch(
  c: MarkSchemeCandidate,
): { result: 'correct' | 'drift' | 'na'; drift_note?: string } {
  if (c.scheme_type === 'content_checklist' || c.scheme_type === 'hybrid') {
    return { result: 'na' };
  }

  if (c.scheme_type === 'band_descriptor') {
    const canonical = CANONICAL_BANDS[c.question_type];
    if (!canonical) {
      return {
        result: 'drift',
        drift_note: `No canonical band array for question_type="${c.question_type}" in CANONICAL_BANDS — generator bug or unmapped question_type`,
      };
    }
    const stored = (c.scheme_data as BandDescriptorData).bands ?? [];
    if (!bandsEqual(stored, canonical)) {
      return {
        result: 'drift',
        drift_note: `band_descriptor bands differ from V3 framework constants for ${c.question_type} — generator did not copy from MARK_SCHEME_V3_IB_* verbatim`,
      };
    }
    return { result: 'correct' };
  }

  if (c.scheme_type === 'criteria_marked') {
    const stored = (c.scheme_data as CriteriaMarkedData).criteria ?? [];
    if (!criteriaEqual(stored, CANONICAL_CRITERIA)) {
      return {
        result: 'drift',
        drift_note: 'criteria_marked criteria differ from MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT.p3_q3_criteria — generator did not copy from constants verbatim',
      };
    }
    return { result: 'correct' };
  }

  return { result: 'na' };
}

// ─── Rule 23: deterministic verdict ──────────────────────────────────────────

export function applyMarkSchemeVerdict(
  result: MarkSchemeVerificationResult,
): 'pass' | 'borderline' | 'fail' {
  const isMajorFail =
    result.scheme_type_match    === 'mismatch'   ||
    result.marks_sum_invariant  === 'violation'  ||
    result.data_shape           === 'invalid'    ||
    result.verbatim_match       === 'drift'      ||
    result.semantic_relevance   === 'drifted'    ||
    result.economic_correctness === 'incorrect';

  // human_review_flag='flagged' prevents all-correct → borderline even when 5 checks pass.
  // Covers AO2 5-6m border cases where scheme_type assignment needs human confirmation.
  const isAllCorrect =
    result.scheme_type_match    === 'correct'   &&
    (result.marks_sum_invariant  === 'correct'  || result.marks_sum_invariant  === 'na') &&
    result.data_shape            === 'valid'    &&
    (result.verbatim_match       === 'correct'  || result.verbatim_match       === 'na') &&
    (result.semantic_relevance   === 'relevant' || result.semantic_relevance   === 'na') &&
    (result.economic_correctness === 'correct'  || result.economic_correctness === 'na') &&
    result.human_review_flag    !== 'flagged';

  const computed: 'pass' | 'borderline' | 'fail' =
    isMajorFail ? 'fail' : isAllCorrect ? 'pass' : 'borderline';

  // Contradiction guard — reasoning says "pass" but criteria have a major fail [Rule 23]
  // Fires BEFORE any DB write; caller must catch and skip the write.
  const reasoningImpliesPass = /\bpass(es|ed)?\b/i.test(result.reasoning);
  if (reasoningImpliesPass && isMajorFail) {
    throw new Error(
      `Mark scheme verdict contradiction: reasoning implies "pass" but criteria have a major fail. ` +
      `type=${result.scheme_type_match} sum=${result.marks_sum_invariant} ` +
      `shape=${result.data_shape} verbatim=${result.verbatim_match} semantic=${result.semantic_relevance} ` +
      `economic=${result.economic_correctness} review=${result.human_review_flag}. reasoning="${result.reasoning.slice(0, 120)}"`,
    );
  }

  // Audit log when stored overall differs from recomputed verdict
  if (result.overall !== computed) {
    console.warn(
      `[applyMarkSchemeVerdict] stored="${result.overall}" → recomputed="${computed}": ` +
      `"${result.reasoning.slice(0, 100)}..."`,
    );
  }

  return computed;
}

// ─── Check 5: semantic relevance (LLM, CC/hybrid only) ───────────────────────

// Short cached prefix — tells Claude what constitutes semantic drift for this subject.
// Excludes markband tables (band_descriptor/criteria_marked never reach this check).
function buildSemanticFramework(subject: 'IB_ECONOMICS' | 'IB_BUSINESS_MANAGEMENT'): string {
  if (subject === 'IB_ECONOMICS') {
    return `Subject: IB Economics (guide: first assessment ${SUBJECT_GUIDE_YEARS.IB_ECONOMICS}).
You will see content_checklist schemes (AO1/AO2 analytic questions) and hybrid schemes (AO4 quantitative questions).

content_checklist — semantic drift signals:
- accepted_points are generic definitions rather than mechanisms that answer this specific question.
- accepted_points address a related but different economic concept (e.g. scheme about negative externalities but question asks about positive externalities).
- accepted_points could equally belong to a different question on the same broad topic.

hybrid — semantic drift signals:
- method_marks steps describe a different calculation or formula than the question requires.
- steps are so generic ("identify the relevant values", "apply the formula") that they could fit any quantitative question.
- answer_marks.correct_answer is 0 for a non-"show that" question (marks left unawarded).
- WRONG FORMULA (multiplier): MPM (marginal propensity to import) appears in the multiplier denominator for a closed-economy question — correct formula is k = 1/(1−MPC), where MPC = 1−MPS. MPM is only valid when the question explicitly mentions imports or an open economy.
- INVERTED INTERPRETATION: a numeric result is mapped to the wrong categorical conclusion — e.g. |PED| > 1 labelled "inelastic" (should be "elastic"), |PED| < 1 labelled "elastic" (should be "inelastic"), or comparative advantage assigned to the country with the higher opportunity cost. Check partial_credit_rules for interpretation rules.

Semantic drift verdict: 'drifted'. Otherwise: 'relevant'.`;
  }

  return `Subject: IB Business Management (guide: first assessment ${SUBJECT_GUIDE_YEARS.IB_BUSINESS_MANAGEMENT}).
You will see content_checklist schemes (AO1/AO2 analytic questions) and hybrid schemes (AO4 quantitative questions).

content_checklist — semantic drift signals:
- accepted_points name a different BM theory, model, or concept than the question asks about.
- accepted_points are generic properties of a broad concept rather than specific points that answer this question.
- A different question on the same BM topic could have identical accepted_points.

hybrid — semantic drift signals:
- method_marks steps describe a different financial calculation or ratio than the question requires.
- Steps are so generic they could apply to any financial calculation question.
- answer_marks.correct_answer is 0 for a non-"show that" question.
- INVERTED INTERPRETATION: a numeric result is mapped to the wrong categorical conclusion — e.g. a ratio labelled with the opposite direction, or break-even output stated as the wrong value.

Semantic drift verdict: 'drifted'. Otherwise: 'relevant'.`;
}

const SYSTEM_PROMPT_SEMANTIC =
  `You are an IBO mark scheme auditor. ` +
  `You judge whether a generated mark scheme semantically matches the question it is supposed to mark. ` +
  `DECISION RULE (no exceptions): ` +
  `'relevant' — the accepted_points or method_marks specifically address the topic, mechanism, or calculation this question asks for. ` +
  `'drifted' — the scheme is generic, off-topic, or could equally belong to a different question on the same broad area. ` +
  `Keep reasoning to 1–2 sentences.`;

const SUBMIT_SEMANTIC_VERDICT_TOOL: Anthropic.Tool = {
  name: 'submit_semantic_verdict',
  description: 'Submit the semantic alignment verdict for this mark scheme.',
  input_schema: {
    type: 'object' as const,
    properties: {
      semantic_relevance: {
        type: 'string',
        enum: ['relevant', 'drifted'],
        description: 'Does the mark scheme specifically address what this question asks?',
      },
      drift_note: {
        type: 'string',
        description: 'If drifted: one sentence describing what specifically drifted.',
      },
      reasoning: {
        type: 'string',
        description: '1–2 sentences explaining the verdict.',
      },
    },
    required: ['semantic_relevance', 'reasoning'],
  },
};

function buildSemanticCheckPrompt(c: MarkSchemeCandidate): string {
  const contextBlock = c.context_text
    ? `\nContext/stimulus:\n"${c.context_text}"\n`
    : '';
  return `Using the subject framework above, judge whether this mark scheme semantically matches the question.

Question metadata:
- command_term: ${c.command_term.replace(/_/g, ' ')} (${c.ao_level})
- marks: ${c.max_marks}
- scheme_type: ${c.scheme_type}

Question text:
"${c.question_text}"
${contextBlock}
Mark scheme:
${JSON.stringify(c.scheme_data, null, 2)}

Does this mark scheme specifically address what this question asks?`;
}

async function checkSemanticRelevance(
  anthropic: Anthropic,
  c: MarkSchemeCandidate,
  frameworkText: string,
): Promise<{
  semantic_relevance: 'relevant' | 'drifted';
  drift_note?:        string;
  reasoning:          string;
  cacheReadTokens:    number;
}> {
  const res = await anthropic.beta.messages.create({
    betas:       ['prompt-caching-2024-07-31'],
    model:       'claude-sonnet-4-6',
    max_tokens:  512,
    system:      SYSTEM_PROMPT_SEMANTIC,
    tools:       [SUBMIT_SEMANTIC_VERDICT_TOOL],
    tool_choice: { type: 'tool', name: 'submit_semantic_verdict' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: frameworkText,
            cache_control: { type: 'ephemeral' },  // cached — constant per subject per run
          } as { type: 'text'; text: string; cache_control: { type: 'ephemeral' } },
          {
            type: 'text',
            text: buildSemanticCheckPrompt(c),     // not cached — varies per candidate
          },
        ],
      },
    ],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('No tool_use block in semantic check response');
  }

  const inp = block.input as {
    semantic_relevance: 'relevant' | 'drifted';
    drift_note?:        string;
    reasoning:          string;
  };

  return { ...inp, cacheReadTokens: res.usage.cache_read_input_tokens ?? 0 };
}

// ─── Check 6: Economic-correctness LLM pass ───────────────────────────────────
// Standalone — not yet wired into verifyCandidate. Call explicitly for testing.

const SYSTEM_PROMPT_ECONOMIC_CORRECTNESS =
  `You are an IB Economics examiner checking whether a mark scheme is economically accurate. ` +
  `Your job is NOT to judge whether the scheme matches the question topic — a separate check does that. ` +
  `Your job is to reason step by step through every formula, curve direction, causal mechanism, and ` +
  `numerical result in the scheme, and decide whether the ECONOMICS is correct according to standard ` +
  `IB Economics theory. ` +
  `DECISION RULE: ` +
  `'correct' — all economic content (formulas, directions, calculations, interpretations) is sound. ` +
  `'incorrect' — the scheme contains at least one economic error: wrong formula, wrong curve direction, ` +
  `wrong causal mechanism, or a narrative that contradicts the maths. Be strict — a scheme that is ` +
  `internally consistent but uses a simplified or invented method that would mislead students is 'incorrect'. ` +
  `'uncertain' — you cannot determine correctness without external data or diagrams not provided.`;

export function buildEconomicCorrectnessFramework(
  subject: 'IB_ECONOMICS' | 'IB_BUSINESS_MANAGEMENT',
): string {
  if (subject === 'IB_BUSINESS_MANAGEMENT') {
    return `HIGH-ERROR TOPICS — apply extra scrutiny to these when present:

Break-even analysis:
- Contribution per unit = selling price per unit − variable cost per unit. Do NOT confuse contribution with profit (profit subtracts fixed costs; contribution does not).
- Break-even output = total fixed costs ÷ contribution per unit. Do NOT divide fixed costs by selling price or total cost.
- Margin of safety = actual (or budgeted) output − break-even output. Negative margin of safety means the business operates at a loss.

Investment appraisal — formula identity:
- Payback period: time taken to recover the initial investment from net cash inflows. Result is a TIME value (months/years), not a percentage or money value.
- ARR (Average Rate of Return) = (average annual profit ÷ initial investment) × 100. Result is a PERCENTAGE. Average annual profit = total net profit over project life ÷ number of years. Do NOT use total cash inflow instead of profit; do NOT skip the averaging step.
- NPV (Net Present Value): apply the given discount factor to each future cash flow, sum the present values, then subtract the initial outlay. Result is a MONEY VALUE. Positive NPV → project adds value. Do NOT sum undiscounted cash flows and call it NPV.
- These three methods are NOT interchangeable: payback → time, ARR → %, NPV → money. Mislabelling which gives which result is wrong.

Financial ratio interpretation direction:
- Gearing = non-current liabilities ÷ capital employed × 100. Higher gearing → greater financial risk. Do NOT invert: high gearing is NOT low risk.
- Current ratio = current assets ÷ current liabilities. Higher ratio → more short-term liquidity. Ratio below 1 means liquidity risk.
- Profit margin = profit ÷ revenue × 100. Do NOT divide revenue by profit.
- ROCE = operating profit ÷ capital employed × 100. Do NOT use net profit or confuse capital employed with total assets.
- Always state the direction of the relationship before assigning the interpretation (e.g. "higher X implies Y").

BM tool application:
- Ansoff Matrix quadrants are distinct and NOT interchangeable: market penetration (existing product, existing market), market development (existing product, new market), product development (new product, existing market), diversification (new product, new market). Assigning the wrong quadrant to a described strategy is wrong.
- SWOT: strengths and weaknesses are INTERNAL; opportunities and threats are EXTERNAL. Do not place an internal factor under opportunities/threats or vice versa.
- BCG Matrix: stars (high share, high growth), cash cows (high share, low growth), question marks (low share, high growth), dogs (low share, low growth). Do not mislabel quadrants or invert the axes.
- Each tool's accepted_points must be applied to the question's specific business context — generic textbook definitions without application to the named business/scenario are insufficient.`;
  }

  // IB_ECONOMICS
  return `HIGH-ERROR TOPICS — apply extra scrutiny to these when present:

DWL (deadweight welfare loss):
- DWL triangle height = gap between supply price and demand price AT THE TRADED QUANTITY (not the equilibrium-to-ceiling price gap).
- In a price ceiling: traded Q is determined by the supply curve at the ceiling price. Height at that Q = demand price − supply price.
- Using (equilibrium price − ceiling price) as the height is WRONG — it uses price coordinates of the equilibrium point, not the traded-quantity point.
- DWL area = ½ × base × height, where base = (equilibrium Q − traded Q).

Externalities — curve direction:
- PRODUCTION externality (e.g. pollution from a factory): MSC shifts ABOVE MPC. MSB = MPB (unchanged). Do NOT shift MSB.
- CONSUMPTION externality (e.g. education, vaccination): MSB shifts ABOVE MPB. MSC = MPC (unchanged). Do NOT shift MSC.
- These are NOT interchangeable. A scheme that writes MSB > MPB for a production externality is WRONG.

Multiplier formula:
- CLOSED economy: k = 1 / (1 − MPC), equivalently 1 / MPS.
- OPEN economy (with imports): k = 1 / (1 − MPC + MPM).
- MPM (marginal propensity to import) must NOT appear in a closed-economy multiplier.

Comparative advantage:
- Country has CA in good X if its opportunity cost of X is LOWER than the other country's.
- Mutually beneficial trade requires the agreed trade rate to lie STRICTLY BETWEEN both countries' opportunity costs.
- A trade rate outside this band means one country gains nothing from trade — any scheme asserting trade is beneficial at such a rate is WRONG.

Elasticity interpretation:
- |PED| > 1 → price elastic. |PED| < 1 → price inelastic. |PED| = 1 → unit elastic.
- A scheme labelling |PED| > 1 as "inelastic" or |PED| < 1 as "elastic" is WRONG.

Expected-value / behavioural economics:
- If a question describes a consumer as "irrationally" choosing option X "despite the maths", option X must have a LOWER expected value than the alternative.
- If option X has higher EV, the consumer is making the rational choice — the behavioural narrative is self-contradicting and the scheme is WRONG.`;
}

const SUBMIT_ECONOMIC_CORRECTNESS_TOOL: Anthropic.Tool = {
  name: 'submit_economic_correctness_verdict',
  description: 'Submit the economic-correctness verdict for this mark scheme.',
  input_schema: {
    type: 'object' as const,
    properties: {
      economic_correctness: {
        type: 'string',
        enum: ['correct', 'incorrect', 'uncertain'],
        description: 'Is the economics in this scheme correct?',
      },
      error_note: {
        type: 'string',
        description: 'Required if incorrect: one sentence identifying the specific economic error.',
      },
      reasoning: {
        type: 'string',
        description: 'Step-by-step reasoning (2–4 sentences) checking formulas, directions, and interpretations.',
      },
    },
    required: ['economic_correctness', 'reasoning'],
  },
};

function buildEconomicCorrectnessPrompt(c: MarkSchemeCandidate): string {
  const contextBlock = c.context_text
    ? `\nContext/stimulus:\n"${c.context_text}"\n`
    : '';
  return `Using the economic principles above, scrutinise whether every formula, curve direction, and interpretation in this mark scheme is economically correct. Reason step by step.

Question metadata:
- command_term: ${c.command_term.replace(/_/g, ' ')} (${c.ao_level})
- marks: ${c.max_marks}
- scheme_type: ${c.scheme_type}

Question text:
"${c.question_text}"
${contextBlock}
Mark scheme:
${JSON.stringify(c.scheme_data, null, 2)}

Check each formula, curve direction, and numerical result against standard IB Economics theory. Is the economics correct?`;
}

export async function checkEconomicCorrectness(
  anthropic: Anthropic,
  c: MarkSchemeCandidate,
  frameworkText: string,
): Promise<{
  economic_correctness: 'correct' | 'incorrect' | 'uncertain';
  error_note?:          string;
  reasoning:            string;
  cacheReadTokens:      number;
}> {
  const res = await anthropic.beta.messages.create({
    betas:       ['prompt-caching-2024-07-31'],
    model:       'claude-sonnet-4-6',
    max_tokens:  1024,
    system:      SYSTEM_PROMPT_ECONOMIC_CORRECTNESS,
    tools:       [SUBMIT_ECONOMIC_CORRECTNESS_TOOL],
    tool_choice: { type: 'tool', name: 'submit_economic_correctness_verdict' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: frameworkText,
            cache_control: { type: 'ephemeral' },
          } as { type: 'text'; text: string; cache_control: { type: 'ephemeral' } },
          {
            type: 'text',
            text: buildEconomicCorrectnessPrompt(c),
          },
        ],
      },
    ],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') {
    throw new Error('No tool_use block in economic correctness response');
  }

  const inp = block.input as {
    economic_correctness: 'correct' | 'incorrect' | 'uncertain';
    error_note?:          string;
    reasoning:            string;
  };

  return { ...inp, cacheReadTokens: res.usage.cache_read_input_tokens ?? 0 };
}

// ─── Full verification pipeline ───────────────────────────────────────────────

async function verifyCandidate(
  anthropic: Anthropic,
  c: MarkSchemeCandidate,
  semanticFramework: string,
  economicFramework: string,
): Promise<{ result: MarkSchemeVerificationResult; cacheReadTokens: number }> {
  // Checks 1–4: deterministic
  const typeCheck     = checkSchemeTypeMatch(c);
  const sumCheck      = checkMarksSumInvariant(c);
  const shapeCheck    = checkDataShape(c);
  const verbatimCheck = checkVerbatimMatch(c);

  // Deterministic formula/interpretation heuristics — Patterns 2 and 4 (§DEFECT-2, §DEFECT-4).
  // Fire before the LLM check; if either fires, semantic_relevance is set to 'drifted'
  // deterministically and the LLM call is skipped for this candidate.
  let deterministicDrift      = false;
  let deterministicDriftNote: string | undefined;
  let deterministicReasoning  = '';

  if (c.scheme_type === 'hybrid' && typeCheck.pass && shapeCheck.pass) {
    const d = c.scheme_data as HybridData;
    const wrongFormula  = flagWrongMultiplierFormula(d, c.question_text);
    const invertedLabel = flagInvertedElasticityLabel(d, c.question_text);
    if (wrongFormula || invertedLabel) {
      deterministicDrift = true;
      const notes: string[] = [];
      if (wrongFormula)  notes.push('multiplier formula error: MPM used in closed-economy context (use MPC = 1−MPS)');
      if (invertedLabel) notes.push('inverted elasticity label: |PED| >1 labelled "inelastic" or |PED| <1 labelled "elastic"');
      deterministicDriftNote = notes.join('; ');
      deterministicReasoning = `Deterministic heuristic flagged: ${notes.join('; ')}`;
    }
  }

  // Check 5: LLM semantic check — CC/hybrid only, skipped on type mismatch, invalid shape,
  // OR when a deterministic drift heuristic has already fired.
  const needsLlm =
    (c.scheme_type === 'content_checklist' || c.scheme_type === 'hybrid') &&
    typeCheck.pass && shapeCheck.pass && !deterministicDrift;

  let semanticRelevance: 'relevant' | 'drifted' | 'na' =
    deterministicDrift ? 'drifted' : 'na';
  let semanticDriftNote: string | undefined = deterministicDriftNote;
  let semanticReasoning = deterministicReasoning;
  let cacheReadTokens   = 0;

  if (needsLlm) {
    const sr = await checkSemanticRelevance(anthropic, c, semanticFramework);
    semanticRelevance  = sr.semantic_relevance;
    semanticDriftNote  = sr.drift_note ?? semanticDriftNote;
    semanticReasoning  = sr.reasoning;
    cacheReadTokens    = sr.cacheReadTokens;
  }

  // Check 6: Economic correctness — LLM, CC/hybrid only. Skipped when any prior check
  // already fails: no point paying for an accuracy pass on an already-failing scheme.
  const needsEconomicCheck =
    (c.scheme_type === 'content_checklist' || c.scheme_type === 'hybrid') &&
    typeCheck.pass && shapeCheck.pass &&
    sumCheck.result !== 'violation' &&
    !deterministicDrift &&
    semanticRelevance !== 'drifted';

  let economicCorrectness: 'correct' | 'incorrect' | 'uncertain' | 'na' = 'na';
  let economicReasoning    = '';
  let economicErrorNote: string | undefined;

  if (needsEconomicCheck) {
    const ec = await checkEconomicCorrectness(anthropic, c, economicFramework);
    economicCorrectness = ec.economic_correctness;
    economicReasoning   = ec.reasoning;
    economicErrorNote   = ec.error_note;
    cacheReadTokens    += ec.cacheReadTokens;
  }

  // Assemble reasoning from deterministic failures first, then LLM
  const reasonParts: string[] = [];
  if (!typeCheck.pass)
    reasonParts.push(`scheme_type mismatch: expected "${typeCheck.expected}", stored "${c.scheme_type}"`);
  if (sumCheck.result === 'violation')
    reasonParts.push(sumCheck.message);
  if (!shapeCheck.pass)
    reasonParts.push(shapeCheck.message);
  if (verbatimCheck.result === 'drift')
    reasonParts.push(verbatimCheck.drift_note ?? 'verbatim drift from V3 constants');
  if (semanticRelevance === 'drifted')
    reasonParts.push(semanticReasoning);
  if (economicCorrectness === 'incorrect')
    reasonParts.push(`economic error: ${economicErrorNote ?? economicReasoning.slice(0, 200)}`);
  else if (economicCorrectness === 'uncertain')
    reasonParts.push(`economic correctness uncertain — human review required: ${economicReasoning.slice(0, 200)}`);
  if (reasonParts.length === 0)
    reasonParts.push(semanticReasoning || 'all checks pass');

  // AO2 5-6m border cases and economic 'uncertain' → human review before promotion
  const human_review_flag: 'flagged' | 'clear' =
    (c.ao_level === 'AO2' &&
     c.marks >= AO2_HUMAN_REVIEW_MARKS_RANGE[0] &&
     c.marks <= AO2_HUMAN_REVIEW_MARKS_RANGE[1]) ||
    economicCorrectness === 'uncertain'
      ? 'flagged'
      : 'clear';

  if (human_review_flag === 'flagged') {
    reasonParts.push(`AO2 ${c.marks}m border case — human review required before promotion`);
  }

  const driftNote = verbatimCheck.drift_note ?? semanticDriftNote;

  const result: MarkSchemeVerificationResult = {
    scheme_type_match:    typeCheck.pass  ? 'correct' : 'mismatch',
    marks_sum_invariant:  sumCheck.result,
    data_shape:           shapeCheck.pass ? 'valid'   : 'invalid',
    verbatim_match:       verbatimCheck.result,
    semantic_relevance:   semanticRelevance,
    economic_correctness: economicCorrectness,
    human_review_flag,
    overall:              'pass',           // overwritten by applyMarkSchemeVerdict
    reasoning:            reasonParts.join('; '),
    ...(driftNote ? { drift_note: driftNote } : {}),
  };

  result.overall = applyMarkSchemeVerdict(result);

  return { result, cacheReadTokens };
}

// ─── DB helpers ───────────────────────────────────────────────────────────────

const MARK_SCHEME_SELECT =
  'id, question_id, subject, scheme_type, max_marks, scheme_data, ' +
  'questions!inner(question_text, context_text, command_term, ao_level, paper, question_type, marks, level)';

function flattenRow(row: MarkSchemeCandidateRow): MarkSchemeCandidate {
  return {
    id:            row.id,
    question_id:   row.question_id,
    subject:       row.subject,
    scheme_type:   row.scheme_type,
    max_marks:     row.max_marks,
    scheme_data:   row.scheme_data,
    question_text: row.questions.question_text,
    context_text:  row.questions.context_text,
    command_term:  row.questions.command_term,
    ao_level:      row.questions.ao_level,
    paper:         row.questions.paper,
    question_type: row.questions.question_type,
    marks:         row.questions.marks,
    level:         row.questions.level,
  };
}

async function fetchCandidates(
  supabase:        SupabaseClient,
  subject:         string,
  limit:           number | undefined,
  regenRejected:   boolean,
): Promise<MarkSchemeCandidate[]> {
  let query = supabase
    .from('mark_schemes')
    .select(MARK_SCHEME_SELECT)
    .eq('subject',              subject)
    .eq('status',               'candidate')
    .eq('verification_status',  regenRejected ? 'fail' : 'unverified')
    .order('id');

  if (limit) query = (query as ReturnType<typeof query.limit>).limit(limit) as typeof query;

  const { data, error } = await query;
  if (error) throw new Error(`Failed to fetch candidates: ${error.message}`);
  return ((data ?? []) as unknown as MarkSchemeCandidateRow[]).map(flattenRow);
}

async function writeResult(
  supabase: SupabaseClient,
  id:       string,
  verdict:  'pass' | 'borderline' | 'fail',
  result:   MarkSchemeVerificationResult,
): Promise<void> {
  const { error } = await supabase
    .from('mark_schemes')
    .update({
      verification_status: verdict,
      verification_notes:  result,          // structured JSONB — same discipline as Layer 1
      verified_at:         new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw new Error(`DB write failed for id=${id}: ${error.message}`);
}

// ─── Utilities ────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const VERDICT_ICON: Record<string, string> = { pass: '✓', borderline: '~', fail: '✗' };

function col(s: string | number, w: number): string {
  return String(s).slice(0, w).padEnd(w);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const arg  = (f: string) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : undefined; };
  const flag = (f: string) => argv.includes(f);

  const subjectArg    = arg('--subject');
  const limitArg      = arg('--limit') ? parseInt(arg('--limit')!, 10) : undefined;
  const dryRun        = flag('--dry-run');
  const regenRejected = flag('--regen-rejected');

  if (!subjectArg) {
    console.error('Error: --subject required (IB_ECONOMICS | IB_BUSINESS_MANAGEMENT)');
    process.exit(1);
  }
  if (subjectArg !== 'IB_ECONOMICS' && subjectArg !== 'IB_BUSINESS_MANAGEMENT') {
    console.error(`Error: unknown subject "${subjectArg}". Available: IB_ECONOMICS, IB_BUSINESS_MANAGEMENT`);
    process.exit(1);
  }

  const subject          = subjectArg as 'IB_ECONOMICS' | 'IB_BUSINESS_MANAGEMENT';
  const semanticFramework  = buildSemanticFramework(subject);
  const economicFramework  = buildEconomicCorrectnessFramework(subject);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  const fetchMode = regenRejected ? 'failed' : 'unverified';
  console.log(`\nFetching ${fetchMode} mark_schemes for ${subject}...`);

  const candidates = await fetchCandidates(supabase, subject, limitArg, regenRejected);
  if (!candidates.length) {
    console.log(`No ${fetchMode} candidates found for ${subject}.`);
    return;
  }
  console.log(`Loaded ${candidates.length} candidate(s).`);

  const llmCount  = candidates.filter(c =>
    c.scheme_type === 'content_checklist' || c.scheme_type === 'hybrid',
  ).length;
  const detCount  = candidates.length - llmCount;

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (dryRun) {
    const LINE = '-'.repeat(115);
    console.log(`\n${LINE}`);
    console.log(`DRY RUN — ${candidates.length} candidate(s) for ${subject}`);
    console.log(`  deterministic only (BD/CM): ${detCount}  |  LLM semantic check (CC/hybrid): ${llmCount}`);
    console.log(`  estimated LLM cost: ~$${(llmCount * 0.0018).toFixed(3)} (${llmCount} × ~$0.0018)`);
    console.log(LINE);
    console.log(
      col('#',            4) + col('ms_id',       14) + col('q_type',    22) +
      col('scheme_type', 22) + col('max_marks',   10) + col('llm',        5) +
      'human_review',
    );
    console.log(LINE);
    candidates.forEach((c, i) => {
      const hasHumanReview = c.ao_level === 'AO2' && c.marks >= 5 && c.marks <= 6;
      console.log(
        col(i + 1,                            4) +
        col(c.id.slice(0, 8) + '...',        14) +
        col(c.question_type,                 22) +
        col(c.scheme_type,                   22) +
        col(c.max_marks,                     10) +
        col(llmCount > 0 && (c.scheme_type === 'content_checklist' || c.scheme_type === 'hybrid') ? 'Y' : 'N', 5) +
        (hasHumanReview ? 'REVIEW' : ''),
      );
    });
    console.log(LINE);
    return;
  }

  // ── Live run ──────────────────────────────────────────────────────────────
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const tallies = { pass: 0, borderline: 0, fail: 0, error: 0 };
  const startMs = Date.now();

  for (let i = 0; i < candidates.length; i++) {
    const c     = candidates[i];
    const label =
      `[${i + 1}/${candidates.length}] ${c.id.slice(0, 8)}... ` +
      `${c.question_type} · ${c.scheme_type} · ${c.max_marks}m`;

    let verifyResult: Awaited<ReturnType<typeof verifyCandidate>> | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        verifyResult = await verifyCandidate(anthropic, c, semanticFramework, economicFramework);
        break;
      } catch (err) {
        if (attempt === 0) {
          console.warn(`  ↻ ${label} retry (${(err as Error).message})`);
          await sleep(2000);
        } else {
          console.error(`  ✗ ${label} ERROR: ${(err as Error).message}`);
          tallies.error++;
        }
      }
    }

    if (!verifyResult) { await sleep(200); continue; }

    const { result, cacheReadTokens } = verifyResult;
    const verdict = result.overall;
    const isLlm   = c.scheme_type === 'content_checklist' || c.scheme_type === 'hybrid';
    const cacheTag = isLlm
      ? (cacheReadTokens > 0 ? `cache hit (${cacheReadTokens.toLocaleString()} read)` : 'cache miss')
      : 'deterministic';

    console.log(`  ${VERDICT_ICON[verdict] ?? '?'} ${label} → ${verdict}  [${cacheTag}]`);
    console.log(`    ${result.reasoning}`);
    if (verdict !== 'pass') {
      console.log(
        `    type=${result.scheme_type_match} sum=${result.marks_sum_invariant} ` +
        `shape=${result.data_shape} verbatim=${result.verbatim_match} semantic=${result.semantic_relevance}`,
      );
      if (result.drift_note) console.log(`    drift: ${result.drift_note}`);
    }
    tallies[verdict]++;

    try {
      await writeResult(supabase, c.id, verdict, result);
    } catch (err) {
      console.error(`    DB write failed: ${(err as Error).message}`);
    }

    await sleep(200);
  }

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(0);
  const total   = candidates.length;
  console.log(`\n${'-'.repeat(60)}`);
  console.log(`Verified ${total - tallies.error}/${total}  (${elapsed}s)`);
  console.log(`  pass:       ${tallies.pass}`);
  console.log(`  borderline: ${tallies.borderline}`);
  console.log(`  fail:       ${tallies.fail}`);
  if (tallies.error) console.log(`  errors:     ${tallies.error}`);
}

const isMain = process.argv[1] &&
  (process.argv[1].includes('verify-mark-schemes.ts') ||
   process.argv[1].includes('verify-mark-schemes.js'));
if (isMain) main().catch(err => { console.error('Fatal:', err); process.exit(1); });
