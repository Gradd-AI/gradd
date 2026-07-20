#!/usr/bin/env tsx
/**
 * apm-framework.ts
 *
 * ACCA Advanced Performance Management (APM) framework constants.
 * Source: apm_s26_j27_syllabus_and_study_guide.pdf (© ACCA 2026-2027)
 * Modelled on the IB V3 framework pattern in verify-seed-questions.ts.
 *
 * 73 learning outcomes across sections A–D, all verbatim from the study guide.
 * Intellectual levels: [2] = Application & analysis, [3] = Synthesis & evaluation.
 * No [1]-level LOs appear in APM — professional-level strategic exam.
 *
 * Exam: 3h15m, 100 marks.
 *   Section A: 50m case study (40 technical + 10 professional skills) — draws from A & B.
 *   Section B: 2 × 25m scenario questions (20 technical + 5 professional skills each).
 *     One question from syllabus C, one from syllabus D.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Intellectual levels — ACCA standard framework definitions
// Superscripts [2] and [3] in the study guide correspond to these levels.
// No [1]-level LOs appear in APM (professional strategic exam — application minimum).
//
// ⚠️ NOT VERBATIM — DO NOT QUOTE AS STUDY-GUIDE TEXT (added 20/07/2026).
// The APM guide states ONLY the bare labels: 'Knowledge and comprehension',
// 'Application and analysis', 'Synthesis and evaluation'. Everything after the colon
// below is an EDITORIAL GLOSS written here — verified 20/07/2026 against
// docs/apm_s26_j27_syllabus_and_study_guide.pdf: all eight gloss phrases ('explain
// mechanisms', 'perform calculations', 'evaluate appropriateness', 'assess trade-offs',
// 'apply frameworks strategically', 'recall facts', etc.) return ZERO hits in the guide.
// Currently quoted by no document (checked) — keep it that way. This is the same defect
// class fixed in afm-framework.ts / AFM_NARRATIVE_EVIDENCE.md §1a (VERIFICATION LOG G1);
// a full APM §1a-style trace has NOT been done.
// ─────────────────────────────────────────────────────────────────────────────

export const INTELLECTUAL_LEVELS = {
  L1: 'Knowledge and comprehension: recall facts, state definitions — not examined at APM level',
  L2: 'Application and analysis: explain mechanisms, apply concepts, perform calculations, advise on application of rules or techniques',
  L3: 'Synthesis and evaluation: evaluate appropriateness, recommend justified actions, assess trade-offs, apply frameworks strategically with critical judgement',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section A — Strategic management and value creation
// Source: pp. 7–9 of apm_s26_j27_syllabus_and_study_guide.pdf
// ─────────────────────────────────────────────────────────────────────────────

// EVIDENCE: p. 7 — "A Strategic management and value creation / 1. Strategic management accounting"
const SECTION_A1_LOS = {
  A1a: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 2 as const,
    descriptor: 'Explain the role of strategic performance management in strategic planning and control.' },
  A1b: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 2 as const,
    descriptor: 'Explain the role of performance measurement in checking progress towards the corporate objectives.' },
  A1c: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 3 as const,
    descriptor: 'Compare planning and control between the strategic, tactical and operational levels within a business entity and assess potential conflicts between long-term and short-term decision making.' },
  A1d: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 3 as const,
    descriptor: "Assess the ways in which stakeholder groups operate and how they influence an organisation and its performance measurement and performance management systems (e.g. using Mendelow's matrix)." },
  A1e: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 3 as const,
    descriptor: "Evaluate how models such as SWOT, PEST and Porter's generic strategies may assist in the performance management process." },
  A1f: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 3 as const,
    descriptor: "Apply and evaluate Kaplan and Norton's Balanced Scorecard (BSC) as an approach to performance measurement and management." },
  A1g: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 3 as const,
    descriptor: 'Evaluate performance using benchmarking and assess the suitability of alternative benchmarking methods (internal, competitive and functional).' },
  A1h: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 3 as const,
    descriptor: 'Evaluate how risk and uncertainty play an important role in planning, decision making and reporting of performance at all levels of an organisation, including the impact of the different risk appetites of stakeholders.' },
  A1i: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 3 as const,
    descriptor: "Assess how changing an organisation's structure, culture and strategy will affect its processes, systems and people." },
  A1j: { section: 'A' as const, sub_area: 'A1', topic: 'Strategic management accounting', intellectual_level: 3 as const,
    descriptor: "Assess how changing an organisation's structure, culture and strategy will influence the adoption of performance measurement methods and techniques." },
};

// EVIDENCE: p. 7 — "2. Performance hierarchy"
const SECTION_A2_LOS = {
  A2a: { section: 'A' as const, sub_area: 'A2', topic: 'Performance hierarchy', intellectual_level: 3 as const,
    descriptor: 'Assess how a mission and strategic aims are cascaded down the organisation via the formulation of goals and objectives.' },
  A2b: { section: 'A' as const, sub_area: 'A2', topic: 'Performance hierarchy', intellectual_level: 3 as const,
    descriptor: "Explain how the content of a mission statement influences an organisation's approach to its performance measurement and management." },
  A2c: { section: 'A' as const, sub_area: 'A2', topic: 'Performance hierarchy', intellectual_level: 3 as const,
    descriptor: "Apply critical success factor (CSF) analysis to develop key performance indicators (KPIs) to achieve and organisation's goals and objectives." },
  A2d: { section: 'A' as const, sub_area: 'A2', topic: 'Performance hierarchy', intellectual_level: 3 as const,
    descriptor: "Apply and evaluate Lynch and Cross' Performance Pyramid as a way in which to link strategy, operations and performance." },
  A2e: { section: 'A' as const, sub_area: 'A2', topic: 'Performance hierarchy', intellectual_level: 3 as const,
    descriptor: 'Explain the performance planning gap and evaluate alternative strategies to fill that gap.' },
};

// EVIDENCE: pp. 7–8 — "3. Financial performance measurement"
const SECTION_A3_LOS = {
  A3a: { section: 'A' as const, sub_area: 'A3', topic: 'Financial performance measurement', intellectual_level: 2 as const,
    descriptor: 'Explain why the primary objective of financial performance should be concern for shareholders.' },
  A3b: { section: 'A' as const, sub_area: 'A3', topic: 'Financial performance measurement', intellectual_level: 3 as const,
    descriptor: 'Calculate and evaluate the appropriateness of different measures of performance including: gross profit and operating profit, ROCE, ROI, EPS and Total Shareholder Return (TSR), EBITDA, Residual Income (RI), Net Present Value (NPV), Economic Value Added (EVA™).' },
  A3c: { section: 'A' as const, sub_area: 'A3', topic: 'Financial performance measurement', intellectual_level: 3 as const,
    descriptor: 'Explain why indicators of liquidity and gearing need to be considered in conjunction with profitability, including the application of financial and operational gearing and advise what indicators an organisation should use.' },
  A3d: { section: 'A' as const, sub_area: 'A3', topic: 'Financial performance measurement', intellectual_level: 3 as const,
    descriptor: 'Assess the appropriate benchmarks to use in comparing and assessing performance.' },
  A3e: { section: 'A' as const, sub_area: 'A3', topic: 'Financial performance measurement', intellectual_level: 3 as const,
    descriptor: 'Evaluate performance measures relevant in a divisionalised organisation structure.' },
  A3f: { section: 'A' as const, sub_area: 'A3', topic: 'Financial performance measurement', intellectual_level: 2 as const,
    descriptor: 'Assess the need for separate measures in respect of managerial and divisional performance.' },
};

// EVIDENCE: p. 8 — "4. Non-financial performance measurement"
const SECTION_A4_LOS = {
  A4a: { section: 'A' as const, sub_area: 'A4', topic: 'Non-financial performance measurement', intellectual_level: 3 as const,
    descriptor: 'Assess the interaction of non-financial performance indicators with financial performance indicators.' },
  A4b: { section: 'A' as const, sub_area: 'A4', topic: 'Non-financial performance measurement', intellectual_level: 3 as const,
    descriptor: 'Identify and assess the significance of non-financial performance indicators in relation to employees and product/service quality e.g. customer satisfaction reports, repeat business ratings, customer loyalty, net promoter scores, access and availability.' },
  A4c: { section: 'A' as const, sub_area: 'A4', topic: 'Non-financial performance measurement', intellectual_level: 2 as const,
    descriptor: 'Assess the difficulties in recording, processing and interpreting data on qualitative issues.' },
  A4d: { section: 'A' as const, sub_area: 'A4', topic: 'Non-financial performance measurement', intellectual_level: 3 as const,
    descriptor: 'Assess the significance of brand awareness and brand loyalty and their potential impact on business performance.' },
};

// EVIDENCE: pp. 8–9 — "5. Sustainability"
const SECTION_A5_LOS = {
  A5a: { section: 'A' as const, sub_area: 'A5', topic: 'Sustainability', intellectual_level: 3 as const,
    descriptor: 'Evaluate how sustainability issues may influence the setting of strategic goals, and how these are translated into business objectives, policies and operations.' },
  A5b: { section: 'A' as const, sub_area: 'A5', topic: 'Sustainability', intellectual_level: 3 as const,
    descriptor: 'Evaluate how sustainability objectives may influence the setting of targets, the measurement of targets and the reporting of performance, including integrated reporting (IR) and the 3Ps (People, Planet and Profit).' },
  A5c: { section: 'A' as const, sub_area: 'A5', topic: 'Sustainability', intellectual_level: 2 as const,
    descriptor: 'Analyse costs within environmental cost categories (conventional, hidden, contingent, reputational), interpret the results and recommend appropriate action.' },
  A5d: { section: 'A' as const, sub_area: 'A5', topic: 'Sustainability', intellectual_level: 3 as const,
    descriptor: 'Evaluate environmental management accounting techniques (lifecycle costing, input-output analysis and activity-based costing).' },
  A5e: { section: 'A' as const, sub_area: 'A5', topic: 'Sustainability', intellectual_level: 3 as const,
    descriptor: 'Assess decisions using lifecycle costing, input-output analysis and activity-based costing calculations, interpret the results and recommend appropriate action.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section B — Performance optimisation
// Source: pp. 8–10 of apm_s26_j27_syllabus_and_study_guide.pdf
// ─────────────────────────────────────────────────────────────────────────────

// EVIDENCE: p. 8 — "B Performance optimisation / 1. Budgetary planning and control"
const SECTION_B1_LOS = {
  B1a: { section: 'B' as const, sub_area: 'B1', topic: 'Budgetary planning and control', intellectual_level: 3 as const,
    descriptor: 'Evaluate the relative strengths and weaknesses of budgeting methods and recommend an appropriate method for an organisation.' },
  B1b: { section: 'B' as const, sub_area: 'B1', topic: 'Budgetary planning and control', intellectual_level: 3 as const,
    descriptor: 'Calculate fixed and flexible, rolling, activity-based, zero-based and incremental budgets and interpret the results for management.' },
  B1c: { section: 'B' as const, sub_area: 'B1', topic: 'Budgetary planning and control', intellectual_level: 3 as const,
    descriptor: 'Calculate key variances including planning and operational, interpret the results and recommend appropriate action.' },
  B1d: { section: 'B' as const, sub_area: 'B1', topic: 'Budgetary planning and control', intellectual_level: 3 as const,
    descriptor: 'Evaluate the increased use of non-traditional profit-based performance measures in controlling organisations, e.g. beyond budgeting.' },
};

// EVIDENCE: p. 9 — "2. Performance and reward"
const SECTION_B2_LOS = {
  B2a: { section: 'B' as const, sub_area: 'B2', topic: 'Performance and reward', intellectual_level: 2 as const,
    descriptor: "Advise on the link between achievement of the corporate strategy and the management of human resources e.g. through Fitzgerald and Moon's Building Block model." },
  B2b: { section: 'B' as const, sub_area: 'B2', topic: 'Performance and reward', intellectual_level: 3 as const,
    descriptor: 'Assess the accountability issues that might arise from performance measurement systems.' },
  B2c: { section: 'B' as const, sub_area: 'B2', topic: 'Performance and reward', intellectual_level: 3 as const,
    descriptor: 'Advise on the relationship of Human Resource Management (HRM) to performance measurement and suitable remuneration methods.' },
  B2d: { section: 'B' as const, sub_area: 'B2', topic: 'Performance and reward', intellectual_level: 3 as const,
    descriptor: "Advise how management style needs to be considered when designing an effective performance measurement system e.g. Hopwood's management styles." },
  B2e: { section: 'B' as const, sub_area: 'B2', topic: 'Performance and reward', intellectual_level: 3 as const,
    descriptor: 'Evaluate different methods of reward practices, including the potential beneficial and adverse consequences of linking reward to performance measurement.' },
  B2f: { section: 'B' as const, sub_area: 'B2', topic: 'Performance and reward', intellectual_level: 3 as const,
    descriptor: "Assess the statement; 'What gets measured, gets done' in the context of performance management and apply it in the context of a performance management scenario." },
};

// EVIDENCE: p. 9 — "3. Performance improvement models and techniques"
const SECTION_B3_LOS = {
  B3a: { section: 'B' as const, sub_area: 'B3', topic: 'Performance improvement models and techniques', intellectual_level: 3 as const,
    descriptor: "Evaluate how Porter's Value Chain can be used to analyse performance across the whole value chain and to recommend value adding performance improvements." },
  B3b: { section: 'B' as const, sub_area: 'B3', topic: 'Performance improvement models and techniques', intellectual_level: 3 as const,
    descriptor: 'Evaluate and apply value-based management (VBM) to performance management.' },
  B3c: { section: 'B' as const, sub_area: 'B3', topic: 'Performance improvement models and techniques', intellectual_level: 3 as const,
    descriptor: 'Evaluate the use of activity-based management (ABM), including the application of activity-based costing (ABC), for improving performance.' },
  B3d: { section: 'B' as const, sub_area: 'B3', topic: 'Performance improvement models and techniques', intellectual_level: 3 as const,
    descriptor: 'Apply and evaluate the following techniques in optimising performance: i) Kaizen costing  ii) Target costing  iii) Lifecycle costing  iv) Just-in-time (JIT)  v) Six Sigma using tools such as DMAIC  vi) Total Quality Management (TQM)  vii) Costs of quality.' },
  B3e: { section: 'B' as const, sub_area: 'B3', topic: 'Performance improvement models and techniques', intellectual_level: 3 as const,
    descriptor: 'Assess the use of Business Process Re-engineering (BPR) on systems development and improvements in organisational performance.' },
};

// EVIDENCE: pp. 9–10 — "4. Performance optimisation in specific contexts"
const SECTION_B4_LOS = {
  B4a: { section: 'B' as const, sub_area: 'B4', topic: 'Performance optimisation in specific contexts', intellectual_level: 3 as const,
    descriptor: 'Assess the impact of the characteristics of service businesses (SHIP) on performance measurement and management.' },
  B4b: { section: 'B' as const, sub_area: 'B4', topic: 'Performance optimisation in specific contexts', intellectual_level: 3 as const,
    descriptor: "Apply and evaluate performance measurement in service businesses using Fitzgerald and Moon's Building Block model." },
  B4c: { section: 'B' as const, sub_area: 'B4', topic: 'Performance optimisation in specific contexts', intellectual_level: 3 as const,
    descriptor: 'Assess the potential problems of multiple objectives in a not-for-profit organisation.' },
  B4d: { section: 'B' as const, sub_area: 'B4', topic: 'Performance optimisation in specific contexts', intellectual_level: 2 as const,
    descriptor: 'Explain the difficulties in measuring outputs in not-for-profit organisations when performance is not judged in terms of money or an easily quantifiable objective.' },
  B4e: { section: 'B' as const, sub_area: 'B4', topic: 'Performance optimisation in specific contexts', intellectual_level: 3 as const,
    descriptor: 'Assess the use of league tables in not-for-profit organisation and the resulting effects on performance.' },
  B4f: { section: 'B' as const, sub_area: 'B4', topic: 'Performance optimisation in specific contexts', intellectual_level: 3 as const,
    descriptor: 'Apply and evaluate value for money (VFM) as a measure of performance in not-for-profit organisations, using the 3Es (economy, efficiency and effectiveness).' },
  B4g: { section: 'B' as const, sub_area: 'B4', topic: 'Performance optimisation in specific contexts', intellectual_level: 3 as const,
    descriptor: 'Assess the problems encountered in planning, controlling and measuring performance levels, e.g. productivity, profitability, quality and service levels, in complex business structures.' },
  B4h: { section: 'B' as const, sub_area: 'B4', topic: 'Performance optimisation in specific contexts', intellectual_level: 3 as const,
    descriptor: 'Assess the impact on performance management of the use of business models involving strategic alliances, joint ventures and complex supply chain structures.' },
  B4i: { section: 'B' as const, sub_area: 'B4', topic: 'Performance optimisation in specific contexts', intellectual_level: 3 as const,
    descriptor: 'Advise on the content, implementation and management of Service Level Agreements (SLAs) within complex business structures.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section C — Performance reporting
// Source: p. 10 of apm_s26_j27_syllabus_and_study_guide.pdf
// ─────────────────────────────────────────────────────────────────────────────

// EVIDENCE: p. 10 — "C Performance reporting / 1. Management reports"
// C1a has 4 sub-bullets (C1ai–C1aiv per cross-reference table p.15); encoded as one LO with sub-list in descriptor.
// C1b is [2] with verb 'evaluate' — verbatim from guide; unusual but correct.
const SECTION_C1_LOS = {
  C1a: { section: 'C' as const, sub_area: 'C1', topic: 'Management reports', intellectual_level: 3 as const,
    descriptor: "Evaluate the management report, including any narrative commentary, of an organisation in the light of: i) its mission, goals and objectives; ii) the needs of the users of the report; iii) avoiding the problem of information overload; iv) best practice in presentation." },
  C1b: { section: 'C' as const, sub_area: 'C1', topic: 'Management reports', intellectual_level: 2 as const,
    descriptor: 'Evaluate the use of data visualisation techniques to communicate key performance trends and insights, including charts, graphs, maps and animation.' },
  C1c: { section: 'C' as const, sub_area: 'C1', topic: 'Management reports', intellectual_level: 3 as const,
    descriptor: 'Advise on how the use and presentation of numerical data could be misinterpreted and provide a misleading impression of performance.' },
  C1d: { section: 'C' as const, sub_area: 'C1', topic: 'Management reports', intellectual_level: 3 as const,
    descriptor: 'Advise on how the use and presentation of a narrative commentary could be used to provide a misleading impression of performance.' },
  C1e: { section: 'C' as const, sub_area: 'C1', topic: 'Management reports', intellectual_level: 3 as const,
    descriptor: 'Prepare a useful narrative commentary for a performance report based on the data presented.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section D — Data science and technology for performance and insights
// Source: pp. 10–11 of apm_s26_j27_syllabus_and_study_guide.pdf
// ─────────────────────────────────────────────────────────────────────────────

// EVIDENCE: p. 10 — "D Data science and technology for performance and insights / 1. Technology and information systems"
const SECTION_D1_LOS = {
  D1a: { section: 'D' as const, sub_area: 'D1', topic: 'Technology and information systems', intellectual_level: 3 as const,
    descriptor: 'Advise on how IT developments may influence performance management systems (e.g. unified corporate databases, data warehouses, process automation, artificial intelligence (AI), radio frequency identification devices (RFID), cloud and network technology).' },
  D1b: { section: 'D' as const, sub_area: 'D1', topic: 'Technology and information systems', intellectual_level: 3 as const,
    descriptor: 'Explain the issue of data silos and assess the problems they present for the accounting function.' },
  D1c: { section: 'D' as const, sub_area: 'D1', topic: 'Technology and information systems', intellectual_level: 3 as const,
    descriptor: 'Evaluate the use of enterprise resource planning systems (ERPS), knowledge management systems (KMS) and customer relationship management systems (CRMS) to manage performance.' },
  D1d: { section: 'D' as const, sub_area: 'D1', topic: 'Technology and information systems', intellectual_level: 3 as const,
    descriptor: 'Assess the risks to systems and data and recommend methods and controls to protect the security of the technology and information of an organisation.' },
  D1e: { section: 'D' as const, sub_area: 'D1', topic: 'Technology and information systems', intellectual_level: 3 as const,
    descriptor: 'Evaluate whether the management information systems are lean and the value of the information that they provide (e.g. using the 5 Ss).' },
};

// EVIDENCE: pp. 10–11 — "2. Data science and analytics"
// D2b through D2i are all [2] — newly added LOs (per cross-reference table p.15 "New" column).
const SECTION_D2_LOS = {
  D2a: { section: 'D' as const, sub_area: 'D2', topic: 'Data science and analytics', intellectual_level: 3 as const,
    descriptor: 'Assess the development of big data and its impact on performance measurement and management, including the risks and challenges it presents.' },
  D2b: { section: 'D' as const, sub_area: 'D2', topic: 'Data science and analytics', intellectual_level: 2 as const,
    descriptor: 'Advise on the data science methods and processes from setting the goals of the exercise, to selecting, cleaning, transforming and storing the data.' },
  D2c: { section: 'D' as const, sub_area: 'D2', topic: 'Data science and analytics', intellectual_level: 3 as const,
    descriptor: 'Apply and evaluate different methods of data analysis (e.g. descriptive, diagnostic, predictive and prescriptive analytics).' },
  D2d: { section: 'D' as const, sub_area: 'D2', topic: 'Data science and analytics', intellectual_level: 2 as const,
    descriptor: 'Assess the use of different types of data for analytics (e.g. text, image, video and voice).' },
  D2e: { section: 'D' as const, sub_area: 'D2', topic: 'Data science and analytics', intellectual_level: 2 as const,
    descriptor: 'Analyse data using regression analysis and identify biases, patterns, trends, ranges and distributions.' },
  D2f: { section: 'D' as const, sub_area: 'D2', topic: 'Data science and analytics', intellectual_level: 2 as const,
    descriptor: 'Assess the use of machine learning and artificial intelligence (AI) in gaining insights and recommending performance improvements.' },
  D2g: { section: 'D' as const, sub_area: 'D2', topic: 'Data science and analytics', intellectual_level: 2 as const,
    descriptor: 'Assess the output of data models developed to support the goals of the organisation and advise on any refinements required.' },
  D2h: { section: 'D' as const, sub_area: 'D2', topic: 'Data science and analytics', intellectual_level: 2 as const,
    descriptor: 'Advise management on the output of a data model to provide clear insights and help to formulate recommendations for action.' },
  D2i: { section: 'D' as const, sub_area: 'D2', topic: 'Data science and analytics', intellectual_level: 2 as const,
    descriptor: 'Advise on the ethical issues related to information collection and processing (e.g. the use of algorithms which are impossible to interrogate and audit, and large-scale data collection and analysis).' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Master syllabus map — 73 learning outcomes: A=30, B=24, C=5, D=14
// ─────────────────────────────────────────────────────────────────────────────

export const SYLLABUS_MAP = {
  ...SECTION_A1_LOS, ...SECTION_A2_LOS, ...SECTION_A3_LOS, ...SECTION_A4_LOS, ...SECTION_A5_LOS,
  ...SECTION_B1_LOS, ...SECTION_B2_LOS, ...SECTION_B3_LOS, ...SECTION_B4_LOS,
  ...SECTION_C1_LOS,
  ...SECTION_D1_LOS, ...SECTION_D2_LOS,
} as const;

export type LoCode = keyof typeof SYLLABUS_MAP;

// ─────────────────────────────────────────────────────────────────────────────
// Command verbs — extracted verbatim from LO descriptors (pp. 7–11)
// Primary verb is the first verb in the LO descriptor.
// levels[] reflects which intellectual levels the verb appears at in APM LOs.
// ─────────────────────────────────────────────────────────────────────────────

export const COMMAND_VERBS: Record<string, { levels: (2 | 3)[]; typical_use: string }> = {
  // Verbs appearing at L2 as primary
  explain:                  { levels: [2, 3], typical_use: 'Describe mechanism or reason — L2 when factual, L3 when evaluation required alongside' },
  advise:                   { levels: [2, 3], typical_use: 'Recommend course of action — L2 when applying rules, L3 when strategic judgement required' },
  analyse:                  { levels: [2, 3], typical_use: 'Break down into components — L2 for structured decomposition, L3 when synthesis required' },
  identify:                 { levels: [2, 3], typical_use: 'Select from possibilities — L2 standalone, L3 when paired with assess' },

  // Verbs appearing at L3 as primary
  evaluate:                 { levels: [2, 3], typical_use: 'Weigh strengths and limitations — core L3 verb; appears at L2 only for C1b (narrow data visualisation scope)' },
  assess:                   { levels: [2, 3], typical_use: 'Make a judgement about significance or appropriateness — L2 for simpler assessment, L3 for complex trade-offs' },
  apply:                    { levels: [3],    typical_use: 'Use a framework or technique in a given business context — L3 in APM' },
  'apply and evaluate':     { levels: [3],    typical_use: 'Use technique AND weigh its appropriateness — highest complexity L3 compound verb' },
  'evaluate and apply':     { levels: [3],    typical_use: 'Evaluate framework then demonstrate use — L3 compound verb (B3b)' },
  'calculate and evaluate': { levels: [3],    typical_use: 'Compute result AND interpret / judge appropriateness — L3; always calculation_required' },
  calculate:                { levels: [3],    typical_use: 'Numerical computation with interpretation — L3 in APM (not L2); always calculation_required' },
  compare:                  { levels: [3],    typical_use: 'Account of similarities and differences requiring judgement — L3' },
  recommend:                { levels: [3],    typical_use: 'Propose justified course of action with supporting reasoning — L3' },
  prepare:                  { levels: [3],    typical_use: 'Produce a written output (narrative commentary, report section) — L3 in APM' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Professional skills — Section E (verbatim from pp. 11–12)
// Tagged on drills where professional skills are being tested alongside technical content.
// Section A: all 4 skills; Section B: min 2 from {analysis_and_evaluation, scepticism, commercial_acumen}.
// ─────────────────────────────────────────────────────────────────────────────

// EVIDENCE: p. 16 — "Communication, Analysis and Evaluation, Scepticism, Commercial Acumen"
// EVIDENCE: p. 11 — Section E sub-descriptors verbatim
export const PROFESSIONAL_SKILLS = {
  communication: {
    label: 'Communication',
    sub_descriptors: [
      'Inform concisely, objectively and unambiguously, adopting a suitable style and format, using appropriate technology.',
      'Advise using compelling and logical arguments, demonstrating the ability to counter argue where appropriate.',
      'Clarify and simplify complex issues to convey relevant information in a way that adopts an appropriate tone and is easily understood by and reflects the requirements of the intended audience.',
    ],
  },
  analysis_and_evaluation: {
    label: 'Analysis and Evaluation',
    sub_descriptors: [
      'Investigate relevant information from a range of sources, using appropriate analytical techniques, to establish reasons and causes of issues, assist in decision-making and to identify opportunities or solutions.',
      'Consider information, evidence and findings carefully, reflecting on their implications and how they can be used in the interests of the individual, business function, division and the wider organisational goals.',
      'Assess and apply appropriate judgement when considering organisational plans, initiatives or issues when making decisions; taking into account the implications of such decisions on the organisation and those affected.',
      'Appraise information objectively with a view to balancing the costs, risks, benefits and opportunities, before advising on or recommending appropriate solutions or decisions.',
    ],
  },
  scepticism: {
    label: 'Scepticism',
    sub_descriptors: [
      'Explore the underlying reasons for key organisational plans, issues and decisions, applying the attitude of an enquiring mind, beyond what is immediately apparent.',
      'Question opinions, assertions and assumptions, by seeking justifications and obtaining sufficient evidence for either their support and acceptance or rejection.',
      'Challenge and critically assess the information presented or decisions made, where this is clearly justified, in the wider professional, ethical, organisational, or public interest.',
    ],
  },
  commercial_acumen: {
    label: 'Commercial Acumen',
    sub_descriptors: [
      "Demonstrate awareness of organisational and external factors, which will affect the measurement and management of an organisation's strategic objectives and operational activities.",
      'Recognise key issues in determining how to address or resolve problems and use judgement in proposing and recommending commercially viable solutions.',
      'Show insight and perception in understanding behavioural responses, process and system-related issues and wider organisational matters, demonstrating acumen in offering advice and arriving at appropriate recommendations.',
    ],
  },
} as const;

export type ProfessionalSkillTag = keyof typeof PROFESSIONAL_SKILLS;

// ─────────────────────────────────────────────────────────────────────────────
// Calculation-required LOs — highest QA-confidence drills
// Drills on these LOs MUST supply numeric data in context_text; answer requires computation.
// ─────────────────────────────────────────────────────────────────────────────

// EVIDENCE: A3b [3] — "Calculate and evaluate the appropriateness of different measures of performance" (ROCE, ROI, EPS, TSR, EBITDA, RI, NPV, EVA™)
// EVIDENCE: A3e [3] — "Evaluate performance measures relevant in a divisionalised organisation structure" (ROI, RI, transfer pricing — numeric evaluation)
// EVIDENCE: A5c [2] — "Analyse costs within environmental cost categories" (cost allocation and categorisation computation)
// EVIDENCE: A5e [3] — "Assess decisions using lifecycle costing, input-output analysis and activity-based costing calculations" (explicit "calculations")
// EVIDENCE: B1b [3] — "Calculate fixed and flexible, rolling, activity-based, zero-based and incremental budgets"
// EVIDENCE: B1c [3] — "Calculate key variances including planning and operational"
// EVIDENCE: B3d [3] — includes Kaizen costing, target costing, lifecycle costing (cost-to-target, cost reduction computations)
// EVIDENCE: D2e [2] — "Analyse data using regression analysis and identify biases, patterns, trends, ranges and distributions"
export const CALCULATION_LOS = new Set<LoCode>([
  'A3b', // financial performance ratios — ROCE, ROI, EPS, TSR, EBITDA, RI, NPV, EVA™
  'A3e', // divisionalised performance — ROI, RI, transfer pricing computations
  'A5c', // environmental cost categories — cost allocation
  'A5e', // lifecycle costing, input-output, ABC — explicit "calculations" in descriptor
  'B1b', // budget construction — fixed, flexible, rolling, ABB, ZBB, incremental
  'B1c', // variance analysis — planning and operational variances
  'B3d', // Kaizen costing, target costing, lifecycle costing sub-techniques
  'D2e', // regression analysis — statistical computation
]);

// ─────────────────────────────────────────────────────────────────────────────
// Exam structure — verbatim from pp. 16–17
// ─────────────────────────────────────────────────────────────────────────────

// EVIDENCE: p. 16 — "The syllabus is assessed by a three-hour 15 minutes examination."
// EVIDENCE: p. 16 — "Section A of the exam will always be a 50-mark case study based on an organisation in a particular business context. The 50 marks will comprise of 40 technical marks and 10 professional skills marks. All of the professional skills will be examined in Section A."
// EVIDENCE: p. 16 — "candidates should expect to see Section A of the exam focus on a range of issues from across syllabus sections A and B"
// EVIDENCE: p. 17 — "Candidates will be required to answer a further two 25-mark questions in Section B of the exam, which will comprise of scenario based questions. The 25 marks will comprise of 20 technical marks and 5 professional skills marks."
// EVIDENCE: p. 17 — "Each question will examine a minimum of two professional skills from Analysis and Evaluation, Scepticism and Commercial Acumen."
// EVIDENCE: p. 17 — "One of the Section B questions will come from syllabus section C, and one will come from syllabus section D. The topics from syllabus sections A and B will form the foundations for the two Section B questions."
// EVIDENCE: p. 17 — "Total 100 marks"
export const EXAM_STRUCTURE = {
  duration_minutes:     195,
  total_marks:          100,
  section_a: {
    marks_total:               50,
    marks_technical:           40,
    marks_professional_skills: 10,
    format:                    'case_study' as const,
    syllabus_foundation:       ['A', 'B'] as const,
    professional_skills_examined: 'all_four' as const,
    description: '50-mark case study based on an organisation in a particular business context; response in role of advisor to senior management (e.g. report to board).',
  },
  section_b: {
    question_count:                        2,
    marks_per_question_total:              25,
    marks_per_question_technical:          20,
    marks_per_question_professional_skills: 5,
    format:                                'scenario' as const,
    q1_syllabus_section:                   'C' as const,
    q2_syllabus_section:                   'D' as const,
    syllabus_foundation:                   ['A', 'B'] as const,
    professional_skills_minimum_per_q:     2 as const,
    professional_skills_pool:             ['analysis_and_evaluation', 'scepticism', 'commercial_acumen'] as const,
  },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DrillSpec — type for a single APM practice drill
// ─────────────────────────────────────────────────────────────────────────────

export interface DrillSpec {
  lo_code:               LoCode;
  topic:                 string;
  command_verb:          string;
  intellectual_level:    2 | 3;
  professional_skill_tag?: ProfessionalSkillTag;
  calculation_required:  boolean;
  marks_guide:           number;   // suggested mark allocation for this drill
}
