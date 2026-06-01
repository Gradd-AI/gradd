/**
 * scripts/mark-scheme-framework.ts
 * Layer 2 mark scheme framework — IBO-grounded constants, types, routing, validators, formatter.
 * Rule 22: every constant is traceable to docs/MARK_SCHEME_EVIDENCE.md.
 *
 * Exports consumed by:
 *   scripts/generate-mark-schemes.ts  — structured constants, resolveSchemeType
 *   scripts/verify-mark-schemes.ts    — SCHEME_TYPE_INVARIANTS, validateMarkSchemeData
 *   lib/system-prompt.ts              — formatMarkSchemeForPrompt
 */

// ─── Shared primitives ────────────────────────────────────────────────────────

export type SchemeType =
  | 'content_checklist'
  | 'band_descriptor'
  | 'hybrid'
  | 'criteria_marked';

export interface Band {
  range: [number, number];
  descriptor: string;
}

export interface AcceptedPoint {
  point: string;
  marks: number;
  keywords: string[];
}

export interface AcceptedReasonEntry {
  reason: string;
  keywords: string[];
}

export interface MethodMark {
  step: string;
  marks: number;
}

export interface AnswerMarks {
  correct_answer: number;
  partial_credit_rules: string;
}

export interface Criterion {
  name: string;
  max_marks: number;
  bands: Band[];
}

// ─── Scheme_data shapes (used by generator and verifier) ─────────────────────

export interface ContentChecklistData {
  accepted_points: AcceptedPoint[];
  marking_rule: string;
  accepted_reasons?: AcceptedReasonEntry[];
}

export interface BandDescriptorData {
  bands: Band[];
}

export interface HybridData {
  method_marks: MethodMark[];
  answer_marks: AnswerMarks;
}

export interface CriteriaMarkedData {
  criteria: Criterion[];
}

export type MarkSchemeData =
  | ContentChecklistData
  | BandDescriptorData
  | HybridData
  | CriteriaMarkedData;

export interface MarkSchemeRow {
  id: string;
  question_id: string;
  subject: string;
  scheme_type: SchemeType;
  max_marks: number;
  scheme_data: MarkSchemeData;
  source_reference: string | null;
}

export interface MarkSchemeViolation {
  rule: string;
  message: string;
}

// ─── Paper routing ────────────────────────────────────────────────────────────

export interface PaperSectionEntry {
  paper: string;
  part: string;
  scheme_type: SchemeType;
  max_marks: number;
  note?: string;
}

// ─── Econ-specific sub-types ──────────────────────────────────────────────────

export interface DiagramThreshold {
  band_minimum: number;
  descriptor_phrase: string;
}

export interface DiagramRules {
  optional_phrase: string;
  essential_guidance: string;
  band_thresholds_by_part: Record<'p1a' | 'p1b' | 'p2g', DiagramThreshold[]>;
  vision_marking_steps: readonly string[];
  text_only_band_cap: string;
  essential_omission_band_cap: string;
  holistic_integration_note: string;
}

export interface Ao4EconOnlyTerm {
  command_term: string;
  scheme_type: Extract<SchemeType, 'hybrid' | 'content_checklist'>;
  typical_structure: string;
}

export interface ShowThatInvariant {
  description: string;
  answer_marks_correct_answer: 0;
  invariant_combined: string;
  reject_condition: string;
  generator_rule: string;
}

// ─── Calculator rules ─────────────────────────────────────────────────────────

export interface CalculatorRule {
  paper: string;
  permitted: boolean;
  note: string;
}

// ─── BM-specific sub-types ────────────────────────────────────────────────────

export interface SectionAvsBRule {
  rule: string;
  source: string;
  section_a: { scheme_types: SchemeType[]; description: string };
  section_b: { scheme_types: SchemeType[]; description: string };
}

// ─── Top-level subject interfaces ─────────────────────────────────────────────

export interface MarkSchemeV3IbEconomics {
  paper_scheme_type_map: PaperSectionEntry[];
  markbands_p1a: Band[];
  markbands_p1b: Band[];
  markbands_p2g: Band[];
  markbands_p3b: Band[];
  diagram_rules: DiagramRules;
  calculator_rules: CalculatorRule[];
  ao4_econ_only: Ao4EconOnlyTerm[];
  show_that_invariant: ShowThatInvariant;
}

export interface MarkSchemeV3IbBusinessManagement {
  paper_scheme_type_map: PaperSectionEntry[];
  markbands_p1_p2_sec_b: Band[];
  p3_q3_criteria: Criterion[];
  calculator_rules: CalculatorRule[];
  section_a_vs_b_rule: SectionAvsBRule;
}

// ─── Verifier invariants ──────────────────────────────────────────────────────

export interface SchemeTypeInvariant {
  invariant: string;
  description: string;
  reject_if: string;
}

export type SchemeTypeInvariants = Record<SchemeType, SchemeTypeInvariant[]>;

// ─── Command-term routing ─────────────────────────────────────────────────────

export type SubjectScope = 'BOTH' | 'IB_ECONOMICS' | 'IB_BUSINESS_MANAGEMENT';
export type AssessmentObjective = 'AO1' | 'AO2' | 'AO3' | 'AO4';

export interface CommandTermEntry {
  command_term: string;
  ao: AssessmentObjective;
  scheme_type: SchemeType;
  marks_range?: [number, number];
  subjects: SubjectScope;
  note?: string;
}

// ─── MARK_SCHEME_V3_IB_ECONOMICS ─────────────────────────────────────────────

// EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.A–§4.E
// Source: Economics Guide (first assessment 2022). PDF page offset: guide page = PDF page − 5.
export const MARK_SCHEME_V3_IB_ECONOMICS: MarkSchemeV3IbEconomics = {

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.A, §4.B, §4.C, §4.D
  // Source: Economics Guide, pp. 57–66
  paper_scheme_type_map: [
    {
      paper: 'P1',
      part: 'part_a',
      scheme_type: 'band_descriptor',
      max_marks: 10,
      note: 'AO1/AO2/AO4 only — no AO3; markbands are shallower (describe/explain depth); SL and HL identical markbands [Econ p. 63]',
    },
    {
      paper: 'P1',
      part: 'part_b',
      scheme_type: 'band_descriptor',
      max_marks: 15,
      note: 'All four AOs; real-world examples required at top bands; SL and HL identical markbands [Econ pp. 63-64]',
    },
    {
      paper: 'P2',
      part: 'parts_a_to_f_qualitative',
      scheme_type: 'content_checklist',
      max_marks: 0,
      note: 'max_marks varies per sub-question; "For parts (a) to (f) a markscheme will be used." [Econ p. 64]',
    },
    {
      paper: 'P2',
      part: 'parts_a_to_f_quantitative',
      scheme_type: 'hybrid',
      max_marks: 0,
      note: 'max_marks varies; AO4 Calculate/Determine/Derive/Solve command terms; "Includes some quantitative questions." [Econ p. 57]',
    },
    {
      paper: 'P2',
      part: 'part_g',
      scheme_type: 'band_descriptor',
      max_marks: 15,
      note: 'text/data integration replaces real-world examples vs P1(b); SL and HL identical [Econ pp. 64-65]',
    },
    {
      paper: 'P3',
      part: 'part_a_qualitative',
      scheme_type: 'content_checklist',
      max_marks: 0,
      note: 'HL only; "For part (a) a markscheme will be used." [Econ p. 65]; qualitative sub-questions within 20m total',
    },
    {
      paper: 'P3',
      part: 'part_a_quantitative',
      scheme_type: 'hybrid',
      max_marks: 0,
      note: 'HL only; quantitative sub-questions; "Includes both quantitative and qualitative questions." [Econ p. 58]',
    },
    {
      paper: 'P3',
      part: 'part_b',
      scheme_type: 'band_descriptor',
      max_marks: 10,
      note: 'HL only; command term: Recommend only; policy recommendation markbands [Econ pp. 65-66]',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.A; Economics Guide (first assessment 2022), p. 63
  // "External assessment markbands — SL and HL", Paper 1 part (a), max 10 marks.
  // AO1/AO2/AO4 only (no AO3). Diagrams appear from band 5-6 upwards.
  markbands_p1a: [
    {
      range: [0, 0],
      descriptor: 'The work does not reach a standard described by the descriptors below.',
    },
    {
      range: [1, 2],
      descriptor:
        'The response indicates little understanding of the specific demands of the question. Economic theory is stated but it is not relevant. Economic terms are stated but they are not relevant.',
    },
    {
      range: [3, 4],
      descriptor:
        'The response indicates some understanding of the specific demands of the question. Relevant economic theory is described. Some relevant economic terms are included.',
    },
    {
      range: [5, 6],
      descriptor:
        'The response indicates understanding of the specific demands of the question, but these demands are only partially addressed. Relevant economic theory is partly explained. Some relevant economic terms are used appropriately. Where appropriate, relevant diagram(s) are included.',
    },
    {
      range: [7, 8],
      descriptor:
        'The specific demands of the question are understood and addressed. Relevant economic theory is explained. Relevant economic terms are used mostly appropriately. Where appropriate, relevant diagram(s) are included and explained.',
    },
    {
      range: [9, 10],
      descriptor:
        'The specific demands of the question are understood and addressed. Relevant economic theory is fully explained. Relevant economic terms are used appropriately throughout the response. Where appropriate, relevant diagram(s) are included and fully explained.',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.A; Economics Guide (first assessment 2022), pp. 63-64
  // Paper 1 part (b), max 15 marks. All four AOs. Band 4-6 confirmed spanning the p. 63/64 page break.
  // Key addition vs part (a): synthesis/evaluation + real-world examples at each band.
  markbands_p1b: [
    {
      range: [0, 0],
      descriptor: 'The work does not reach a standard described by the descriptors below.',
    },
    {
      range: [1, 3],
      descriptor:
        'The response indicates little understanding of the specific demands of the question. Economic theory is stated but it is not relevant. Economic terms are stated but they are not relevant. The response contains no evidence of synthesis or evaluation. A real-world example(s) is identified but it is irrelevant.',
    },
    {
      range: [4, 6],
      descriptor:
        'The response indicates some understanding of the specific demands of the question. Relevant economic theory is described. Some relevant economic terms are included. The response contains evidence of superficial synthesis or evaluation. A relevant real-world example(s) is identified.',
    },
    {
      range: [7, 9],
      descriptor:
        'The response indicates understanding of the specific demands of the question, but these demands are only partially addressed. Relevant economic theory is partly explained. Some relevant economic terms are used appropriately. Where appropriate, relevant diagram(s) are included. The response contains evidence of appropriate synthesis or evaluation but lacks balance. A relevant real-world example(s) is identified and partly developed in the context of the question.',
    },
    {
      range: [10, 12],
      descriptor:
        'The specific demands of the question are understood and addressed. Relevant economic theory is explained. Relevant economic terms are used mostly appropriately. Where appropriate, relevant diagram(s) are included and explained. The response contains evidence of appropriate synthesis or evaluation that is mostly balanced. A relevant real-world example(s) is identified and developed in the context of the question.',
    },
    {
      range: [13, 15],
      descriptor:
        'The specific demands of the question are understood and addressed. Relevant economic theory is fully explained. Relevant economic terms are used appropriately throughout the response. Where appropriate, relevant diagram(s) are included and fully explained. The response contains evidence of effective and balanced synthesis or evaluation. A relevant real-world example(s) is identified and fully developed to support the argument.',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.B; Economics Guide (first assessment 2022), pp. 64-65
  // Paper 2 part (g), max 15 marks. Same mark structure as P1(b) but text/data integration
  // replaces real-world examples. Band 1-3 "no use of text/data" bullet confirmed on p. 65.
  markbands_p2g: [
    {
      range: [0, 0],
      descriptor: 'The work does not reach a standard described by the descriptors below.',
    },
    {
      range: [1, 3],
      descriptor:
        'The response indicates little understanding of the specific demands of the question. Economic theory is stated but it is not relevant. Economic terms are stated but they are not relevant. The response contains no evidence of synthesis or evaluation. The response contains no use of text/data.',
    },
    {
      range: [4, 6],
      descriptor:
        'The response indicates some understanding of the specific demands of the question. Relevant economic theory is described. Some relevant economic terms are included. The response contains evidence of superficial synthesis or evaluation. The response contains limited use of text/data.',
    },
    {
      range: [7, 9],
      descriptor:
        'The response indicates understanding of the specific demands of the question, but these demands are only partially addressed. Relevant economic theory is partly explained. Some relevant economic terms are used appropriately. Where appropriate, relevant diagram(s) are included. The response contains evidence of appropriate synthesis or evaluation but lacks balance. The response includes some relevant information from the text/data.',
    },
    {
      range: [10, 12],
      descriptor:
        'The specific demands of the question are understood and addressed. Relevant economic theory is explained. Relevant economic terms are used appropriately. Where appropriate, relevant diagram(s) are included and explained. The response contains evidence of appropriate synthesis or evaluation that is mostly balanced. The use of information from the text/data is generally appropriate, relevant, and applied correctly.',
    },
    {
      range: [13, 15],
      descriptor:
        'The specific demands of the question are understood and addressed. Relevant economic theory is fully explained. Relevant economic terms are used appropriately throughout the response. Where appropriate, relevant diagram(s) are included and fully explained. The response contains evidence of effective and balanced synthesis or evaluation. The use of information from the text/data is appropriate, relevant, and is used to formulate a reasoned argument supported by analysis/evaluation.',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.C; Economics Guide (first assessment 2022), pp. 65-66
  // Paper 3 part (b), max 10 marks, HL only. Command term: Recommend.
  // "Recommend — present an advisable course of action with appropriate supporting evidence/reason
  // in relation to a given situation, problem or issue." [Econ p. 65]
  // Band 1-2 bullets 2-5 confirmed on p. 66. Policy identification quality tracked across all bands.
  markbands_p3b: [
    {
      range: [0, 0],
      descriptor: 'The work does not reach a standard described by the descriptors below.',
    },
    {
      range: [1, 2],
      descriptor:
        'The response identifies a policy. The response uses no economic theory to support the recommendation. Economic terms are stated but are not relevant. The response contains no use of text/data to support the recommendation. The response contains no evidence of synthesis or evaluation.',
    },
    {
      range: [3, 4],
      descriptor:
        'The response identifies an appropriate policy. The response uses limited economic theory to support the recommendation in a superficial manner. Some relevant economic terms are included. The response contains no use of relevant text/data to support the recommendation. The response contains superficial evidence of synthesis or evaluation.',
    },
    {
      range: [5, 6],
      descriptor:
        'The response identifies and explains an appropriate policy. The response uses relevant economic theory to partially support the recommendation. Some relevant economic terms are used appropriately. The response includes some relevant information from the text/data to support the recommendation. The response contains evidence of appropriate synthesis or evaluation but lacks balance.',
    },
    {
      range: [7, 8],
      descriptor:
        'The response identifies and fully explains an appropriate policy. The response uses relevant economic theory to support the recommendation. Relevant economic terms are used mostly appropriately. The use of information from the text/data is generally appropriate, relevant and applied correctly to support the recommendation. The response contains evidence of appropriate synthesis or evaluation that is mostly balanced.',
    },
    {
      range: [9, 10],
      descriptor:
        'The response identifies and fully explains an appropriate policy. The response uses relevant economic theory effectively to support the recommendation. Relevant economic terms are used appropriately throughout the response. The use of information from the text/data is appropriate, relevant and supports the analysis/evaluation effectively. The response contains evidence of effective and balanced synthesis or evaluation.',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.E; Economics Guide (first assessment 2022), p. 59
  // "Students are expected, where appropriate, to include correctly labelled and clearly drawn
  // diagrams. Sometimes individual questions specify that the use of diagrams is essential
  // because more detailed information is required from the students in order to show specific
  // knowledge and understanding." [Econ p. 59]
  // band_thresholds derived from markband tables: p1a p. 63; p1b pp. 63-64; p2g pp. 64-65
  diagram_rules: {
    optional_phrase: 'where appropriate',
    essential_guidance:
      'individual questions specify that the use of diagrams is essential because more detailed information is required from the students in order to show specific knowledge and understanding.',
    band_thresholds_by_part: {
      // P1a bands: 0, 1-2, 3-4, [5-6 included], [7-8 included and explained], [9-10 fully explained]
      p1a: [
        { band_minimum: 5, descriptor_phrase: 'included' },
        { band_minimum: 7, descriptor_phrase: 'included and explained' },
        { band_minimum: 9, descriptor_phrase: 'included and fully explained' },
      ],
      // P1b bands: 0, 1-3, 4-6, [7-9 included], [10-12 included and explained], [13-15 fully explained]
      p1b: [
        { band_minimum: 7,  descriptor_phrase: 'included' },
        { band_minimum: 10, descriptor_phrase: 'included and explained' },
        { band_minimum: 13, descriptor_phrase: 'included and fully explained' },
      ],
      // P2g bands: identical structure to P1b (same 15m band boundaries)
      p2g: [
        { band_minimum: 7,  descriptor_phrase: 'included' },
        { band_minimum: 10, descriptor_phrase: 'included and explained' },
        { band_minimum: 13, descriptor_phrase: 'included and fully explained' },
      ],
    },
    // EVIDENCE: §4.E vision marking steps — Mia marking implication for uploaded diagram images
    vision_marking_steps: [
      'Recognise the upload — confirm the diagram image is present and state what it shows; describe what IS there, not what should be there.',
      'Check relevance — assess whether the diagram matches the question; an irrelevant diagram (e.g. a cost curve for a question about exchange rates) does not contribute to band placement.',
      "Check label accuracy — inspect: (a) axes: correctly named variables; (b) curves: correctly named and drawn with correct slope direction; (c) key points: equilibrium, shift arrows, welfare triangles, or other required features as specified by the question.",
      'Check explanation linkage — assess whether the student\'s written response explicitly explains the diagram; Band 7-8 requires "included and explained" — a diagram drawn but never referenced in the written response caps the response at Band 5-6 regardless of diagram quality.',
      'Map to band descriptor and cite the image in feedback — reference the uploaded diagram explicitly, e.g. "Your diagram shows P and Q axes correctly labelled and a correctly drawn downward-sloping demand curve. However, the curve is not labelled \'D\' and no equilibrium point is marked — placing your answer in Band 7-8 rather than 9-10."',
    ] as const,
    text_only_band_cap:
      'A relevant diagram is expected here — omitting it holds your answer below Band 7-8 which requires a diagram included and explained.',
    essential_omission_band_cap:
      'This question specifies a diagram as essential — omitting it prevents reaching Band 5-6.',
    holistic_integration_note:
      'Diagrams contribute to markband placement holistically — no separate diagram marks exist in band_descriptor parts. In content_checklist parts, a diagram may carry explicit marks (e.g. "correctly labelled supply and demand diagram [2 marks]").',
  },

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.E; Economics Guide (first assessment 2022), p. 60
  // "Paper 1 (SL/HL): Calculators are NOT permitted."
  // "Paper 2 (SL/HL) and Paper 3 (HL only): four-function and GDC are allowed."
  calculator_rules: [
    {
      paper: 'P1 (SL/HL)',
      permitted: false,
      note: 'Calculators are NOT permitted on Paper 1. [Econ p. 60]',
    },
    {
      paper: 'P2 (SL/HL)',
      permitted: true,
      note: 'Four-function and GDC permitted. Method marks awarded independently of final numerical answer. [Econ p. 60]',
    },
    {
      paper: 'P3 (HL only)',
      permitted: true,
      note: 'Four-function and GDC permitted; GDC graphing functions may assist. [Econ p. 60]',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.E; Economics Guide p. 58; §2.C divergence 3
  // AO4 terms present in Econ command-term table but absent from BM.
  ao4_econ_only: [
    {
      command_term: 'Derive',
      scheme_type: 'hybrid',
      typical_structure:
        'Show algebraic or graphical derivation step-by-step. Method marks for each derivation step; answer mark for final result.',
    },
    {
      command_term: 'Show that',
      scheme_type: 'hybrid',
      typical_structure:
        'Demonstrate that a stated result is correct. Method marks for working only; no separate answer mark (answer is given in question). answer_marks.correct_answer = 0.',
    },
    {
      command_term: 'Sketch',
      scheme_type: 'content_checklist',
      typical_structure:
        'Freehand diagram — does not require graph paper precision. Marks for correct shape, labelled axes, and key features. Each required feature is a discrete accepted_point.',
    },
    {
      command_term: 'Solve',
      scheme_type: 'hybrid',
      typical_structure:
        'Algebraic or numerical solution. Method marks for setup and working; answer mark for the correct value.',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §4.E; §2.B hybrid invariant
  // "Show that" is structurally distinct: answer is stated in the question; no mark for producing it.
  // Combined hybrid invariant sum(method_marks) + answer_marks.correct_answer == max_marks
  // reduces to sum(method_marks) == max_marks when correct_answer = 0.
  show_that_invariant: {
    description:
      '"Show that" questions state the answer in the question text — no mark is available for producing the correct answer. All marks are method marks.',
    answer_marks_correct_answer: 0,
    invariant_combined: 'sum(method_marks[*].marks) + 0 == max_marks',
    reject_condition: 'answer_marks.correct_answer > 0',
    generator_rule:
      'Detect "show that" case-insensitive in command_term; set answer_marks.correct_answer = 0 unconditionally; allocate all marks to method_marks.',
  },
};

// ─── MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT ───────────────────────────────────

// EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §3.A–§3.E
// Source: Business Management Subject Guide (first assessment 2024). PDF page offset: guide page = PDF page − 6.
export const MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT: MarkSchemeV3IbBusinessManagement = {

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §3.A–§3.D
  // Source: Business Management Subject Guide, pp. 39-47
  paper_scheme_type_map: [
    {
      paper: 'P1',
      part: 'Section_A',
      scheme_type: 'content_checklist',
      max_marks: 20,
      note: '"Marks are allocated using an analytic markscheme." [BM p. 43] SL and HL identical.',
    },
    {
      paper: 'P1',
      part: 'Section_B_structured',
      scheme_type: 'content_checklist',
      max_marks: 0,
      note: 'Structured sub-questions within Section B; marks vary; analytic markscheme.',
    },
    {
      paper: 'P1',
      part: 'Section_B_extended',
      scheme_type: 'band_descriptor',
      max_marks: 10,
      note: '"Marks are allocated using a combination of an analytic markscheme and markbands." [BM p. 43] SL and HL identical descriptors.',
    },
    {
      paper: 'P2',
      part: 'Section_A_qualitative',
      scheme_type: 'content_checklist',
      max_marks: 0,
      note: 'Analytic markscheme; marks vary per sub-question.',
    },
    {
      paper: 'P2',
      part: 'Section_A_quantitative',
      scheme_type: 'hybrid',
      max_marks: 0,
      note: '"The questions have a quantitative focus." [BM pp. 44, 46] Calculate/Determine command terms; method marks + answer marks.',
    },
    {
      paper: 'P2',
      part: 'Section_B_structured',
      scheme_type: 'content_checklist',
      max_marks: 10,
      note: 'Structured 10-mark sub-questions; analytic markscheme.',
    },
    {
      paper: 'P2',
      part: 'Section_B_extended',
      scheme_type: 'band_descriptor',
      max_marks: 10,
      note: 'Same markband table as P1 Section B. [BM p. 44]',
    },
    {
      paper: 'P3',
      part: 'Q1',
      scheme_type: 'content_checklist',
      max_marks: 2,
      note: 'HL only. "For question 1 and question 2 an analytic markscheme will be used." [BM p. 47]',
    },
    {
      paper: 'P3',
      part: 'Q2',
      scheme_type: 'content_checklist',
      max_marks: 6,
      note: 'HL only. 6-mark AO2 Explain — guide explicitly assigns analytic markscheme, overriding the AO2 6m band_descriptor default. [BM p. 47; §3.C]',
    },
    {
      paper: 'P3',
      part: 'Q3',
      scheme_type: 'criteria_marked',
      max_marks: 17,
      note: 'HL only. "For question 3 the following assessment criteria will be used." [BM p. 47] Criteria A(4)+B(4)+C(6)+D(3)=17.',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §3.A; Business Management Subject Guide, pp. 44-45 (SL), pp. 47-48 (HL)
  // "In addition to an analytic markscheme specific to the question papers, markbands are used
  // to allocate marks in section B in papers 1 and 2 for the 10-mark extended response question."
  // SL (pp. 44-45) and HL (pp. 47-48) markband descriptors are verbatim-identical.
  // One Band[] covers SL and HL, P1 and P2 Section B.
  markbands_p1_p2_sec_b: [
    {
      range: [0, 0],
      descriptor: 'The work does not reach a standard described by the descriptor.',
    },
    {
      range: [1, 2],
      descriptor:
        'Little understanding of the demands of the question. Little use of business management tools and theories; any tools and theories that are used are irrelevant or used inaccurately. Little or no reference to the stimulus material. No arguments are made.',
    },
    {
      range: [3, 4],
      descriptor:
        'Some understanding of the demands of the question. Some use of business management tools and theories, but these are mostly lacking in accuracy and relevance. Superficial use of information from the stimulus material, often not going beyond the name of the person(s) or name of the organization. Any arguments made are mostly unsubstantiated.',
    },
    {
      range: [5, 6],
      descriptor:
        'The response indicates an understanding of the demands of the question, but these demands are only partially addressed. Some relevant and accurate use of business management tools and theories. Some relevant use of information from the stimulus material that goes beyond the name of the person(s) or name of the organization but does not effectively support the argument. Arguments are substantiated but are mostly one-sided.',
    },
    {
      range: [7, 8],
      descriptor:
        'Mostly addresses the demands of the question. Mostly relevant and accurate use of business management tools and theories. Information from the stimulus material is generally used to support the argument, although there is some lack of clarity or relevance in some places. Arguments are substantiated and have some balance.',
    },
    {
      range: [9, 10],
      descriptor:
        'Clear focus on addressing the demands of the question. Relevant and accurate use of business management tools and theories. Relevant information from the stimulus material is integrated effectively to support the argument. Arguments are substantiated and balanced, with an explanation of the limitations of the case study or stimulus material.',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §3.C; Business Management Subject Guide, pp. 48-50
  // "For question 3 the following assessment criteria will be used." [BM p. 47]
  // Criterion A(4) + B(4) + C(6) + D(3) = 17 marks.
  p3_q3_criteria: [
    {
      name: 'A: Use of resource materials',
      max_marks: 4,
      // EVIDENCE: BM pp. 48-49; guiding question: "To what extent does the student use the
      // resource materials provided to effectively support the recommended plan of action?"
      bands: [
        {
          range: [0, 0],
          descriptor: 'The response does not reach a standard described by the descriptors below.',
        },
        {
          range: [1, 1],
          descriptor:
            'The response makes limited reference to the resource materials provided or the resources identified have been used ineffectively to support the recommended plan of action.',
        },
        {
          range: [2, 2],
          descriptor:
            'The response makes some reference to the resource materials provided or the resources identified have been used in a superficial way to support the recommended plan of action.',
        },
        {
          range: [3, 3],
          descriptor:
            'The response makes reference to most of the resource materials provided to support the recommended plan of action.',
        },
        {
          range: [4, 4],
          descriptor:
            'The response makes reference to all resource materials provided to effectively support the recommended plan of action.',
        },
      ],
    },
    {
      name: 'B: Business management tools and theories',
      max_marks: 4,
      // EVIDENCE: BM p. 49; guiding question: "To what extent does the student's plan of action
      // effectively apply appropriate business management tools and theories?"
      bands: [
        {
          range: [0, 0],
          descriptor: 'The work does not reach a standard described by the descriptors below.',
        },
        {
          range: [1, 1],
          descriptor:
            'The response demonstrates limited application of appropriate business management tools and theories.',
        },
        {
          range: [2, 2],
          descriptor:
            'The response superficially applies appropriate business management tools and theories.',
        },
        {
          range: [3, 3],
          descriptor:
            'The response satisfactorily applies appropriate business management tools and theories.',
        },
        {
          range: [4, 4],
          descriptor:
            'The response effectively applies appropriate business management tools and theories.',
        },
      ],
    },
    {
      name: 'C: Evaluation',
      max_marks: 6,
      // EVIDENCE: BM p. 49; guiding question: "To what extent does the student effectively
      // evaluate the expected impact of their plan of action on the relevant areas of the business?"
      bands: [
        {
          range: [0, 0],
          descriptor: 'The work does not reach a standard described by the descriptors below.',
        },
        {
          range: [1, 2],
          descriptor:
            'The response is largely descriptive with limited analysis or evaluation of the expected impact of their plan of action. There is limited reference to the relevant areas of the business.',
        },
        {
          range: [3, 4],
          descriptor:
            'The response analyses the expected impact of their plan of action with some reference to the relevant areas of the business. There is some evidence of evaluation but it is not sustained.',
        },
        {
          range: [5, 6],
          descriptor:
            'The student effectively evaluates the expected impact of their plan of action on the relevant areas of the business and considers the trade-offs between those areas.',
        },
      ],
    },
    {
      name: 'D: Sequencing of ideas and plan of action',
      max_marks: 3,
      // EVIDENCE: BM pp. 49-50; guiding question: "To what extent are the student's ideas and
      // plan of action sequenced in a clear and coherent manner?"
      bands: [
        {
          range: [0, 0],
          descriptor: 'The response does not reach a standard described by the descriptors below.',
        },
        {
          range: [1, 1],
          descriptor: 'The response is limited in its sequencing of ideas and plan of action.',
        },
        {
          range: [2, 2],
          descriptor:
            'The response consists of ideas and a plan of action but these are not always sequenced in a clear manner.',
        },
        {
          range: [3, 3],
          descriptor:
            'The response effectively sequences appropriate ideas and a plan of action in a clear and coherent manner.',
        },
      ],
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §3.E; Business Management Subject Guide, p. 43
  // "While all questions requiring a calculator can be answered fully using a four-function
  // (plus, minus, multiply, divide) calculator, graphic display calculators (GDCs) are allowed
  // during the examination."
  // Mia marking implication: GDCs are permitted on BM Paper 2 (quantitative focus paper).
  calculator_rules: [
    {
      paper: 'P2 (SL/HL)',
      permitted: true,
      note: 'Quantitative focus paper. Four-function and GDC permitted. Method marks awarded independently of final numerical answer. [BM p. 43]',
    },
  ],

  // EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §3.E; Business Management Subject Guide, pp. 43-44
  // "Section A: Marks are allocated using an analytic markscheme."
  // "Section B: Marks are allocated using a combination of an analytic markscheme and markbands."
  section_a_vs_b_rule: {
    rule: 'Section A uses analytic markscheme (content_checklist or hybrid); Section B uses analytic markscheme plus markbands (band_descriptor for extended response).',
    source: 'Business Management Subject Guide (first assessment 2024), pp. 43-44',
    section_a: {
      scheme_types: ['content_checklist', 'hybrid'],
      description:
        '"Marks are allocated using an analytic markscheme." All BM P1 and P2 Section A questions. [BM pp. 43-44]',
    },
    section_b: {
      scheme_types: ['content_checklist', 'band_descriptor'],
      description:
        '"Marks are allocated using a combination of an analytic markscheme and markbands." Structured sub-questions -> content_checklist; 10-mark extended response -> band_descriptor. [BM pp. 43-44]',
    },
  },
};

// ─── SCHEME_TYPE_INVARIANTS ───────────────────────────────────────────────────

// EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §2.B
// Verifier must reject any scheme_data that violates these invariants.
export const SCHEME_TYPE_INVARIANTS: SchemeTypeInvariants = {

  // EVIDENCE: §2.B "Sum of all accepted_points[i].marks must equal max_marks."
  content_checklist: [
    {
      invariant: 'sum(accepted_points[*].marks) == max_marks',
      description: 'All accepted point marks must sum exactly to the question\'s max_marks.',
      reject_if: 'sum(accepted_points[*].marks) !== max_marks',
    },
  ],

  // EVIDENCE: §2.B "Band ranges must form a complete, gapless, non-overlapping coverage of [0, max_marks]."
  band_descriptor: [
    {
      invariant: 'bands[0].range[0] == 0',
      description: 'First band must start at 0.',
      reject_if: 'bands[0].range[0] !== 0',
    },
    {
      invariant: 'for each consecutive pair (i, i+1): bands[i].range[1] + 1 == bands[i+1].range[0]',
      description: 'Band ranges must be gapless and non-overlapping.',
      reject_if: 'any gap or overlap between consecutive band ranges',
    },
    {
      invariant: 'bands[-1].range[1] == max_marks',
      description: 'Last band must end at max_marks.',
      reject_if: 'bands[-1].range[1] !== max_marks',
    },
  ],

  // EVIDENCE: §2.B "Sum of method_marks steps plus answer_marks.correct_answer must equal max_marks."
  // Show that reduces to: sum(method_marks) == max_marks (because correct_answer = 0).
  hybrid: [
    {
      invariant: 'sum(method_marks[*].marks) + answer_marks.correct_answer == max_marks',
      description: 'Method marks plus answer mark must sum to max_marks.',
      reject_if: 'sum(method_marks[*].marks) + answer_marks.correct_answer !== max_marks',
    },
    {
      invariant: 'if command_term is "show that": answer_marks.correct_answer == 0',
      description: '"Show that" questions give the answer in the question; no mark for the correct answer.',
      reject_if: 'command_term matches /show that/i AND answer_marks.correct_answer > 0',
    },
  ],

  // EVIDENCE: §2.B "Sum of all criteria max_marks must equal total max_marks."
  // Per-criterion band invariant mirrors the band_descriptor invariant.
  criteria_marked: [
    {
      invariant: 'sum(criteria[*].max_marks) == max_marks',
      description: 'All criterion max_marks must sum to the question\'s max_marks.',
      reject_if: 'sum(criteria[*].max_marks) !== max_marks',
    },
    {
      invariant: 'per criterion: bands[0].range[0]==0 AND gapless coverage AND bands[-1].range[1]==criterion.max_marks',
      description: 'Each criterion\'s band ranges must satisfy the band_descriptor invariant independently.',
      reject_if: 'any criterion has band gap, overlap, wrong start, or wrong end value',
    },
  ],
};

// ─── COMMAND_TERM_TO_SCHEME_TYPE ──────────────────────────────────────────────

// EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §2.D
// "Disambiguation rule for AO2 at 5–6 marks: Default to band_descriptor. Apply content_checklist
// only if the question is structurally a list of discrete sub-clauses each worth 1–2 marks.
// The generator must flag all AO2 questions at 5 or 6 marks for human review."
// Generator must check: if (question.ao === 'AO2' && question.marks >= AO2_HUMAN_REVIEW_MARKS_RANGE[0]
//   && question.marks <= AO2_HUMAN_REVIEW_MARKS_RANGE[1]) → set verification_notes: 'human review needed — AO2 5-6m border case'
export const AO2_HUMAN_REVIEW_MARKS_RANGE: readonly [number, number] = [5, 6];

// EVIDENCE: docs/MARK_SCHEME_EVIDENCE.md §2.D
// Source: Economics Guide pp. 57-58; BM Guide pp. 39-40
// Generator lookup: find entries matching command_term (case-insensitive) + subjects,
// then filter by question.marks within marks_range if present.
// For AO2 at 5-6 marks, route to band_descriptor AND flag for human review via AO2_HUMAN_REVIEW_MARKS_RANGE.
export const COMMAND_TERM_TO_SCHEME_TYPE: CommandTermEntry[] = [

  // ── AO1 — always content_checklist ───────────────────────────────────────
  { command_term: 'Define',   ao: 'AO1', scheme_type: 'content_checklist', subjects: 'BOTH' },
  { command_term: 'Describe', ao: 'AO1', scheme_type: 'content_checklist', subjects: 'BOTH' },
  { command_term: 'List',     ao: 'AO1', scheme_type: 'content_checklist', subjects: 'BOTH' },
  { command_term: 'Outline',  ao: 'AO1', scheme_type: 'content_checklist', subjects: 'BOTH' },
  { command_term: 'State',    ao: 'AO1', scheme_type: 'content_checklist', subjects: 'BOTH' },
  // EVIDENCE: §2.C divergence 3 — "Identify" is AO1 in BM, AO4 in Econ
  {
    command_term: 'Identify',
    ao: 'AO1',
    scheme_type: 'content_checklist',
    subjects: 'IB_BUSINESS_MANAGEMENT',
    note: 'BM only as AO1; Econ classifies Identify as AO4 non-quantitative',
  },
  {
    command_term: 'Identify',
    ao: 'AO4',
    scheme_type: 'content_checklist',
    subjects: 'IB_ECONOMICS',
    note: 'Econ only as AO4 non-quantitative',
  },

  // ── AO2 — marks-dependent routing ────────────────────────────────────────
  // EVIDENCE: §2.D "AO2 at 2-4 marks -> content_checklist; AO2 at 6+ marks -> band_descriptor"
  // marks_range [5,99] covers the 5m boundary — defaults to band_descriptor per disambiguation rule
  { command_term: 'Analyse',    ao: 'AO2', scheme_type: 'content_checklist', marks_range: [1, 4],  subjects: 'BOTH' },
  { command_term: 'Analyse',    ao: 'AO2', scheme_type: 'band_descriptor',   marks_range: [5, 99], subjects: 'BOTH' },
  { command_term: 'Apply',      ao: 'AO2', scheme_type: 'content_checklist', marks_range: [1, 4],  subjects: 'BOTH' },
  { command_term: 'Apply',      ao: 'AO2', scheme_type: 'band_descriptor',   marks_range: [5, 99], subjects: 'BOTH' },
  { command_term: 'Comment',    ao: 'AO2', scheme_type: 'content_checklist', marks_range: [1, 4],  subjects: 'BOTH' },
  { command_term: 'Comment',    ao: 'AO2', scheme_type: 'band_descriptor',   marks_range: [5, 99], subjects: 'BOTH' },
  { command_term: 'Demonstrate', ao: 'AO2', scheme_type: 'content_checklist', marks_range: [1, 4],  subjects: 'IB_BUSINESS_MANAGEMENT', note: 'BM only' },
  { command_term: 'Demonstrate', ao: 'AO2', scheme_type: 'band_descriptor',   marks_range: [5, 99], subjects: 'IB_BUSINESS_MANAGEMENT', note: 'BM only' },
  { command_term: 'Distinguish', ao: 'AO2', scheme_type: 'content_checklist', marks_range: [1, 4],  subjects: 'BOTH' },
  { command_term: 'Distinguish', ao: 'AO2', scheme_type: 'band_descriptor',   marks_range: [5, 99], subjects: 'BOTH' },
  { command_term: 'Explain',    ao: 'AO2', scheme_type: 'content_checklist', marks_range: [1, 4],  subjects: 'BOTH' },
  {
    command_term: 'Explain',
    ao: 'AO2',
    scheme_type: 'band_descriptor',
    marks_range: [5, 99],
    subjects: 'BOTH',
    note: 'Exception: BM P3 Q2 (6-mark Explain) uses content_checklist by guide explicit override — generator must check paper=P3 section=Q2 subject=BM before applying this entry. [§3.C; BM p. 47]',
  },
  { command_term: 'Suggest', ao: 'AO2', scheme_type: 'content_checklist', marks_range: [1, 4],  subjects: 'BOTH' },
  { command_term: 'Suggest', ao: 'AO2', scheme_type: 'band_descriptor',   marks_range: [5, 99], subjects: 'BOTH' },

  // ── AO3 — always band_descriptor ─────────────────────────────────────────
  // EVIDENCE: §2.D "AO3: synthesis and evaluation always uses markbands"
  // Exception: BM P3 Q3 uses criteria_marked — handled by hard-rule in resolveSchemeType
  { command_term: 'Compare',              ao: 'AO3', scheme_type: 'band_descriptor', subjects: 'BOTH' },
  { command_term: 'Compare and contrast', ao: 'AO3', scheme_type: 'band_descriptor', subjects: 'BOTH' },
  { command_term: 'Contrast',             ao: 'AO3', scheme_type: 'band_descriptor', subjects: 'BOTH' },
  { command_term: 'Discuss',              ao: 'AO3', scheme_type: 'band_descriptor', subjects: 'BOTH' },
  { command_term: 'Evaluate',             ao: 'AO3', scheme_type: 'band_descriptor', subjects: 'BOTH' },
  { command_term: 'Examine',              ao: 'AO3', scheme_type: 'band_descriptor', subjects: 'BOTH' },
  { command_term: 'Justify',              ao: 'AO3', scheme_type: 'band_descriptor', subjects: 'BOTH' },
  {
    command_term: 'Recommend',
    ao: 'AO3',
    scheme_type: 'band_descriptor',
    subjects: 'BOTH',
    note: 'Econ P3 part (b) command term — policy recommendation markbands apply [Econ pp. 65-66]',
  },
  { command_term: 'To what extent', ao: 'AO3', scheme_type: 'band_descriptor', subjects: 'BOTH' },

  // ── AO4 quantitative — always hybrid ─────────────────────────────────────
  // EVIDENCE: §2.D "AO4 Calculate/quantitative -> hybrid"
  { command_term: 'Calculate',  ao: 'AO4', scheme_type: 'hybrid', subjects: 'BOTH' },
  { command_term: 'Determine',  ao: 'AO4', scheme_type: 'hybrid', subjects: 'BOTH' },
  // EVIDENCE: §2.C divergence 3; §4.E — Econ-only AO4 quantitative terms
  { command_term: 'Derive',    ao: 'AO4', scheme_type: 'hybrid', subjects: 'IB_ECONOMICS', note: 'Econ only' },
  { command_term: 'Solve',     ao: 'AO4', scheme_type: 'hybrid', subjects: 'IB_ECONOMICS', note: 'Econ only' },
  {
    command_term: 'Show that',
    ao: 'AO4',
    scheme_type: 'hybrid',
    subjects: 'IB_ECONOMICS',
    note: 'Econ only. answer_marks.correct_answer = 0 — all marks are method marks. See show_that_invariant.',
  },

  // ── AO4 non-quantitative — always content_checklist ──────────────────────
  // EVIDENCE: §2.D "AO4 non-quantitative: discrete skill demonstration"
  { command_term: 'Annotate', ao: 'AO4', scheme_type: 'content_checklist', subjects: 'IB_BUSINESS_MANAGEMENT', note: 'BM only' },
  { command_term: 'Complete', ao: 'AO4', scheme_type: 'content_checklist', subjects: 'IB_BUSINESS_MANAGEMENT', note: 'BM only' },
  {
    command_term: 'Construct',
    ao: 'AO4',
    scheme_type: 'content_checklist',
    subjects: 'IB_BUSINESS_MANAGEMENT',
    note: 'BM only; diagram instruction, not a calculate-step chain [§2.C divergence 3]',
  },
  { command_term: 'Draw',    ao: 'AO4', scheme_type: 'content_checklist', subjects: 'BOTH' },
  { command_term: 'Label',   ao: 'AO4', scheme_type: 'content_checklist', subjects: 'BOTH' },
  { command_term: 'Measure', ao: 'AO4', scheme_type: 'content_checklist', subjects: 'IB_ECONOMICS',           note: 'Econ only' },
  { command_term: 'Plot',    ao: 'AO4', scheme_type: 'content_checklist', subjects: 'BOTH' },
  { command_term: 'Prepare', ao: 'AO4', scheme_type: 'content_checklist', subjects: 'IB_BUSINESS_MANAGEMENT', note: 'BM only' },
  {
    command_term: 'Sketch',
    ao: 'AO4',
    scheme_type: 'content_checklist',
    subjects: 'IB_ECONOMICS',
    note: 'Econ only; freehand diagram — each required feature is a discrete accepted_point [§4.E]',
  },
];

// ─── Runtime helpers ──────────────────────────────────────────────────────────

export interface SchemeTypeInput {
  subject: 'IB_BUSINESS_MANAGEMENT' | 'IB_ECONOMICS';
  paper: 'P1' | 'P2' | 'P3';
  section?: string;
  marks: number;
  command_term: string;
  ao_level: string;
}

const AO3_TERMS = new Set([
  'compare', 'compare_and_contrast', 'compare and contrast', 'contrast', 'discuss',
  'evaluate', 'examine', 'justify', 'recommend', 'to_what_extent', 'to what extent',
]);

// EVIDENCE: §2.D, §3.C, §2.E — deterministic routing, no LLM required.
// Hard rules (paper/section) take priority over command-term lookup.
export function resolveSchemeType(input: SchemeTypeInput): SchemeType {
  const term = input.command_term.toLowerCase();

  if (input.subject === 'IB_BUSINESS_MANAGEMENT') {
    if (input.paper === 'P3') {
      if (input.section === 'Q3') return 'criteria_marked';
      if (input.section === 'Q1' || input.section === 'Q2') return 'content_checklist';
    }
    if (input.section === 'SEC_B' && input.marks === 10) return 'band_descriptor';
    if (term === 'calculate' || term === 'determine') return 'hybrid';
    if (input.ao_level === 'AO3' || AO3_TERMS.has(term)) return 'band_descriptor';
    if (input.ao_level === 'AO2' && input.marks >= 5) return 'band_descriptor';
    return 'content_checklist';
  }

  if (input.subject === 'IB_ECONOMICS') {
    if (input.paper === 'P1') return 'band_descriptor';
    if (input.paper === 'P2' && input.section === 'part_g') return 'band_descriptor';
    if (input.paper === 'P3' && input.section === 'part_b') return 'band_descriptor';
    if (
      term === 'calculate' || term === 'determine' || term === 'derive' ||
      term === 'solve' || term === 'show that' || term === 'show_that'
    ) return 'hybrid';
    return 'content_checklist';
  }

  return 'content_checklist';
}

// ─── Validators ───────────────────────────────────────────────────────────────

function validateBandCoverage(
  bands: Band[],
  maxMarks: number,
  violations: MarkSchemeViolation[],
  prefix: string,
): void {
  if (!bands.length) {
    violations.push({ rule: 'missing_bands', message: `${prefix}bands array is empty [§2.B]` });
    return;
  }
  if (bands[0].range[0] !== 0) {
    violations.push({ rule: 'band_coverage', message: `${prefix}first band must start at 0 [§2.B]` });
  }
  for (let i = 0; i < bands.length - 1; i++) {
    const expected = bands[i].range[1] + 1;
    if (bands[i + 1].range[0] !== expected) {
      violations.push({
        rule: 'band_coverage',
        message: `${prefix}gap/overlap between band ${i} [${bands[i].range}] and band ${i + 1} [${bands[i + 1].range}] [§2.B]`,
      });
    }
  }
  const last = bands[bands.length - 1];
  if (last.range[1] !== maxMarks) {
    violations.push({
      rule: 'band_coverage',
      message: `${prefix}last band ends at ${last.range[1]} but max_marks = ${maxMarks} [§2.B]`,
    });
  }
}

export function validateMarkSchemeData(
  data: MarkSchemeData,
  schemeType: SchemeType,
  maxMarks: number,
): MarkSchemeViolation[] {
  const violations: MarkSchemeViolation[] = [];

  if (schemeType === 'content_checklist') {
    const d = data as ContentChecklistData;
    if (!Array.isArray(d.accepted_points) || d.accepted_points.length === 0) {
      violations.push({ rule: 'missing_points', message: 'accepted_points must be a non-empty array' });
      return violations;
    }
    const sum = d.accepted_points.reduce((acc, p) => acc + (p.marks ?? 0), 0);
    if (sum !== maxMarks) {
      violations.push({
        rule: 'checklist_marks_sum',
        message: `sum(accepted_points[*].marks) = ${sum} != max_marks = ${maxMarks} [§2.B]`,
      });
    }
    d.accepted_points.forEach((p, i) => {
      if (!Array.isArray(p.keywords) || p.keywords.length < 2) {
        violations.push({ rule: 'insufficient_keywords', message: `accepted_points[${i}]: minimum 2 keywords required` });
      }
    });
  }

  if (schemeType === 'band_descriptor') {
    const d = data as BandDescriptorData;
    validateBandCoverage(d.bands ?? [], maxMarks, violations, '');
  }

  if (schemeType === 'hybrid') {
    const d = data as HybridData;
    if (!Array.isArray(d.method_marks) || d.method_marks.length === 0) {
      violations.push({ rule: 'missing_method_marks', message: 'method_marks must be a non-empty array' });
      return violations;
    }
    const methodSum = d.method_marks.reduce((acc, m) => acc + (m.marks ?? 0), 0);
    const total = methodSum + (d.answer_marks?.correct_answer ?? 0);
    if (total !== maxMarks) {
      violations.push({
        rule: 'hybrid_marks_sum',
        message: `sum(method_marks) + answer_marks.correct_answer = ${total} != max_marks = ${maxMarks} [§2.B]`,
      });
    }
  }

  if (schemeType === 'criteria_marked') {
    const d = data as CriteriaMarkedData;
    if (!Array.isArray(d.criteria) || d.criteria.length === 0) {
      violations.push({ rule: 'missing_criteria', message: 'criteria must be a non-empty array' });
      return violations;
    }
    const criteriaSum = d.criteria.reduce((acc, c) => acc + (c.max_marks ?? 0), 0);
    if (criteriaSum !== maxMarks) {
      violations.push({
        rule: 'criteria_marks_sum',
        message: `sum(criteria[*].max_marks) = ${criteriaSum} != max_marks = ${maxMarks} [§2.B]`,
      });
    }
    d.criteria.forEach((c, i) => {
      validateBandCoverage(c.bands ?? [], c.max_marks ?? 0, violations, `criteria[${i}] (${c.name}): `);
    });
  }

  return violations;
}

// ─── Hybrid decomposition heuristic ──────────────────────────────────────────

// Rule 22 — EVIDENCE: MARK_SCHEME_EVIDENCE.md §2.G (same convention status as §2.F).
// Flags hybrid schemes where method_marks contains only a single step on a ≥2-mark
// question whose question text contains multi-step arithmetic indicators. This is a
// REVIEW flag, not an invariant violation — some 2m questions are genuinely one-step.
const HYBRID_MULTI_STEP_RE =
  /[×÷]|\bper\s+(unit|tonne|kg|item|person|capita|household|worker)\b|percentage change|%\s*change/i;

export function flagHybridSingleStep(
  data: HybridData,
  max_marks: number,
  question_text: string,
): boolean {
  if (max_marks < 2) return false;
  if (!Array.isArray(data.method_marks) || data.method_marks.length !== 1) return false;
  return HYBRID_MULTI_STEP_RE.test(question_text);
}

// ─── Pattern 1: Multi-value decomposition (§DEFECT-1) ────────────────────────

// Returns the number of distinct final values a question asks the student to calculate.
// Strips conditional clauses ("given…", "assuming…", "where…") before counting "and (the)" conjunctions.
// Excludes verbal continuations ("and interpret", "and apply", etc.) that don't introduce new quantities.
export function detectRequestedValueCount(question_text: string): number {
  if (!/\b(?:calculate|determine|find|derive)\b/i.test(question_text)) return 1;
  // Strip everything from the first conditional clause onwards
  const beforeCondition = question_text.replace(/\s*\b(?:given|assuming|where|when|if)\b.*/i, '');
  const verbIdx = beforeCondition.search(/\b(?:calculate|determine|find|derive)\b/i);
  if (verbIdx === -1) return 1;
  const afterVerb = beforeCondition.slice(verbIdx);
  // Match "and (the) <word>" but exclude verbal continuations
  const VERBAL_RE = /^(?:interpret|show|explain|describe|comment|note|compare|apply|use|check)\b/i;
  const andMatches = (afterVerb.match(/\band\s+(?:the\s+)?(\w+)/gi) ?? [])
    .filter(m => {
      const word = m.replace(/^and\s+(?:the\s+)?/i, '');
      return !VERBAL_RE.test(word);
    });
  return Math.max(1, andMatches.length + 1);
}

// Returns true when a question names ≥2 final values to calculate but method_marks has
// fewer steps than detected values, leaving at least one value with no marked step.
export function flagMultiValueMissingStep(
  data: HybridData,
  question_text: string,
): boolean {
  const count = detectRequestedValueCount(question_text);
  if (count <= 1) return false;
  return Array.isArray(data.method_marks) && data.method_marks.length < count;
}

// ─── Pattern 2: Multiplier formula check (§DEFECT-2) ─────────────────────────

const MULTIPLIER_QUESTION_RE = /\b(?:multiplier|change in (?:\w+\s+)?(?:national\s+)?income|ΔY)\b/i;
// Open-economy context makes MPM valid — skip the check when explicitly mentioned
const OPEN_ECONOMY_RE        = /open[\s-]economy|\bMPM\b|marginal propensity to import/i;
const MPM_IN_STEP_RE         = /\bMPM\b|marginal propensity to import/i;

// Returns true if a standard closed-economy multiplier question has MPM in a method step.
// MPM belongs in the open-economy multiplier only; the closed-economy denominator uses MPC (= 1−MPS).
export function flagWrongMultiplierFormula(
  data: HybridData,
  question_text: string,
): boolean {
  if (!MULTIPLIER_QUESTION_RE.test(question_text)) return false;
  if (OPEN_ECONOMY_RE.test(question_text)) return false; // MPM may be valid here
  return data.method_marks.some(m => MPM_IN_STEP_RE.test(m.step));
}

// ─── Pattern 4: Inverted elasticity label check (§DEFECT-4) ──────────────────

const ELASTICITY_QUESTION_RE = /\bPED\b|price elasticity of demand/i;
// |PED| > 1 called "inelastic" (should be "elastic") — inverted
const INVERTED_ELASTIC_RE    = /(?:>|greater than)\s*1[^.;\n]*\binelastic\b|\binelastic\b[^.;\n]*(?:>|greater than)\s*1/i;
// |PED| < 1 called "elastic" (should be "inelastic") — inverted
const INVERTED_INELASTIC_RE  = /(?:<|less than)\s*1[^.;\n]*\belastic\b(?!ity)|\belastic\b(?!ity)[^.;\n]*(?:<|less than)\s*1/i;

// Returns true if the scheme inverts the PED elasticity interpretation.
export function flagInvertedElasticityLabel(
  data: HybridData,
  question_text: string,
): boolean {
  if (!ELASTICITY_QUESTION_RE.test(question_text)) return false;
  const text = JSON.stringify(data);
  return INVERTED_ELASTIC_RE.test(text) || INVERTED_INELASTIC_RE.test(text);
}

// ─── Pattern 5b: Explain-N (two/three) detection (§DEFECT-5b) ────────────────

export const EXPLAIN_N_RE =
  /\b(explain|describe|analyse|analyze|examine)\s+(two|three|2|3)\s+(\w+)/i;
// Groups: [1] verb  [2] number  [3] first noun word
// Excluded (flat AO1 pools, no breadth+depth structure): state, identify, outline

// Returns the number of items expected (2 or 3), or 0 if not a breadth-marked question.
export function detectExplainNCount(question_text: string): number {
  const match = EXPLAIN_N_RE.exec(question_text);
  if (!match) return 0;
  const word = match[2].toLowerCase();   // group 2 is the number
  if (word === 'two' || word === '2') return 2;
  if (word === 'three' || word === '3') return 3;
  return 0;
}

// Returns true if an explain-N question has fewer accepted_points than the structural minimum
// (at least 2 per reason: one naming mark, one development mark).
export function flagExplainNInsufficientPoints(
  points: AcceptedPoint[],
  n: number,
): boolean {
  return n > 0 && points.length < n * 2;
}

// ─── Prompt formatter ─────────────────────────────────────────────────────────

export function formatMarkSchemeForPrompt(scheme: {
  scheme_type: SchemeType;
  max_marks: number;
  scheme_data: MarkSchemeData;
  source_reference?: string | null;
}): string {
  const { scheme_type, max_marks, scheme_data, source_reference } = scheme;
  const src = source_reference ? ` (${source_reference})` : '';

  switch (scheme_type) {
    case 'content_checklist': {
      const d = scheme_data as ContentChecklistData;
      const isDepthMarked = Array.isArray(d.accepted_reasons) && d.accepted_reasons.length > 0;
      const pointsLabel = isDepthMarked
        ? 'Depth tiers (award marks for depth on any one accepted reason):'
        : 'Accepted points:';
      const lines = d.accepted_points.map(p =>
        `- ${p.point} [${p.marks}m] — keywords: ${p.keywords.join(', ')}`,
      );
      const reasonsBlock = isDepthMarked
        ? [
            '',
            'Valid reasons (student names any one):',
            ...d.accepted_reasons!.map(r => `- ${r.reason} — keywords: ${r.keywords.join(', ')}`),
          ]
        : [];
      return [
        `**Mark scheme** — content_checklist, ${max_marks} marks${src}`,
        d.marking_rule,
        '',
        pointsLabel,
        ...lines,
        ...reasonsBlock,
      ].join('\n');
    }

    case 'band_descriptor': {
      const d = scheme_data as BandDescriptorData;
      const rows = d.bands.map(b => {
        const r = b.range[0] === b.range[1] ? `${b.range[0]}` : `${b.range[0]}-${b.range[1]}`;
        return `| ${r} | ${b.descriptor} |`;
      });
      return [
        `**Mark scheme** — band_descriptor, ${max_marks} marks${src}`,
        '',
        '| Marks | Descriptor |',
        '|---|---|',
        ...rows,
      ].join('\n');
    }

    case 'hybrid': {
      const d = scheme_data as HybridData;
      const steps = d.method_marks.map((m, i) => `${i + 1}. ${m.step} [${m.marks}m]`);
      return [
        `**Mark scheme** — hybrid, ${max_marks} marks${src}`,
        '',
        'Method marks:',
        ...steps,
        '',
        `Answer mark: ${d.answer_marks.correct_answer}/${max_marks}`,
        `Partial credit: ${d.answer_marks.partial_credit_rules}`,
      ].join('\n');
    }

    case 'criteria_marked': {
      const d = scheme_data as CriteriaMarkedData;
      const sections = d.criteria.map(c => {
        const rows = c.bands.map(b => {
          const r = b.range[0] === b.range[1] ? `${b.range[0]}` : `${b.range[0]}-${b.range[1]}`;
          return `| ${r} | ${b.descriptor} |`;
        });
        return [
          `**${c.name}** (${c.max_marks} marks)`,
          '',
          '| Marks | Descriptor |',
          '|---|---|',
          ...rows,
        ].join('\n');
      });
      return [
        `**Mark scheme** — criteria_marked, ${max_marks} marks${src}`,
        '',
        ...sections,
      ].join('\n\n');
    }
  }
}
