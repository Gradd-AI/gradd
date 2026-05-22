#!/usr/bin/env tsx
/**
 * verify-seed-questions.ts
 *
 * Audits candidate questions in the `questions` table against a hardcoded
 * IBO Assessment Framework using Claude Sonnet with prompt caching.
 * The framework text is cached on call 1; calls 2-N read from cache (~10% cost).
 *
 * Usage:
 *   npm run verify-seed -- --subject IB_ECONOMICS [--limit N] [--dry-run]
 *
 * Args:
 *   --subject   Required. IB_ECONOMICS | IB_BUSINESS
 *   --limit     Process at most N candidates (default: all unverified)
 *   --dry-run   Show candidates + prompt shape; skip API and DB writes
 *
 * Env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
 */

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

// Env vars loaded by tsx --env-file=.env.local in the npm script.

// ─────────────────────────────────────────────────────────────────────────────
// Assessment framework constants — versioned source of truth
// Bump version string when the underlying syllabus guide changes.
// written back to questions.verified_against_guide_version on each write.
// ─────────────────────────────────────────────────────────────────────────────

// V1 superseded by V2 — was built from training memory, not verbatim guide evidence.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IB_ECONOMICS_ASSESSMENT_FRAMEWORK_V1 = `
IB ECONOMICS ASSESSMENT FRAMEWORK
Source: IB Economics Subject Guide (First Assessment 2022)
Version: V1

━━━ PAPER 1 — Essay. Taken by SL and HL. ━━━

Structure: Two questions on the paper; students answer one. Each question has Part (a) and Part (b).

PART (a) — 10 marks, AO2
  Required command term: EXAMINE (e.g. "Using an appropriate diagram(s), examine...").
  This part tests application and analysis (AO2): constructing diagrams, analysing mechanisms.
  AO3 command terms (discuss, evaluate) are WRONG for Part (a) — they belong only on Part (b).
  No structured sub-questions (2m/4m/8m) exist on Paper 1 at any marks value.
  Standalone short-answer formats with ≤8 marks do NOT belong on P1.

PART (b) — 15 marks, AO3
  Command terms: EVALUATE or DISCUSS.
  Evaluate: explicit two-sided argument, pros and cons weighed, justified conclusion required.
  Discuss: two-sided treatment; conclusion expected but lighter than evaluate.
  Both are correctly AO3 at 15m on P1 Part (b).

Paper 1 has no stimulus material. Students write from knowledge only.

━━━ PAPER 2 — Data-response. Taken by SL and HL. ━━━

Structure: One shared stimulus (case study + economic data) per question.
Multiple sub-questions share the same stimulus.

Valid sub-question formats:
  2m  → define      (AO1): formal one-sentence definition; no argument required
  4m  → explain     (AO2): explain a mechanism, effect, or relationship
  4m  → distinguish (AO2): contrast two distinct concepts clearly
  4m  → calculate   (AO2): numerical computation, show working
  8m  → examine     (AO3): structured analytical response, may reference stimulus
  8m  → using a diagram, explain (AO3): draw, label, and explain a relevant diagram

SEED SCORING NOTE — apply before scoring paper_fit for any P2 question:
  Seed questions are generated individually with their own context, not a shared P2 stimulus.
  This is intentional for the seed phase — seeds are few-shot anchors, not exam replicas.
  Do NOT mark a P2 seed question as wrong_paper solely because it has an individual context.
  Score paper_fit on whether command_term, marks, and AO match P2 conventions only.

━━━ PAPER 3 — HL only. Policy analysis. ━━━

Structure: Structured questions referencing a policy case study. NOT essay format.

Valid formats:
  8m  → examine  (AO3): structured examination of a policy or economic situation
  10m → discuss  (AO3): two-sided policy argument, structured (not free-essay)
  4m  → calculate(AO4): exact numerical answer with working shown

Paper 3 rules:
  No 15-mark questions — P3 is structured, not essay.
  'evaluate' at 15m belongs ONLY on P1 Part (b). It does not appear on P3.
  'discuss' at 10m on P3 is structured and policy-focused — valid.
  'examine' at 8m on P3 is structured — distinct from 'examine' at 10m on P1 Part (a).

━━━ COMMAND TERM → AO → MARKS → PAPER ━━━

  define          AO1   2m   P2 only
  explain         AO2   4m   P2 only
  distinguish     AO2   4m   P2 only
  calculate       AO2   4m   P2 (SL) or P3 (HL)
  examine         AO2  10m   P1 Part (a) only — analytical/diagrammatic essay
  examine         AO3   8m   P2 or P3 — structured response (NOT essay)
  using_a_diagram AO3   8m   P2 only — construct and label diagram
  discuss         AO3  10m   P3 (structured policy) — also valid at 15m on P1 Part (b)
  evaluate        AO3  15m   P1 Part (b) only — justified conclusion required

CRITICAL RULES:
  • 'discuss' at 10m → valid ONLY on P3. On P1, 'discuss' is at 15m (Part b).
  • 'examine' at 10m → P1 Part (a) only (essay). At 8m → P2 or P3 (structured).
  • No command term belongs on P1 at fewer than 10 marks.
  • define, explain, distinguish, calculate never appear on P1.

━━━ ASSESSMENT OBJECTIVES ━━━

  AO1 — Knowledge and comprehension: recall facts, state definitions, list items
  AO2 — Application and analysis: apply concepts, use diagrams, break down into parts
  AO3 — Synthesis and evaluation: construct arguments, weigh evidence, reach conclusions
  AO4 — Quantitative skills: calculate, draw and annotate diagrams accurately

━━━ SYLLABUS SCOPE ━━━

Unit 1 — Introduction to Economics
  Scarcity, choice, opportunity cost, factors of production, production possibility curves,
  shifts in PPC, circular flow of income, positive vs normative economics, economic systems.

Unit 2 — Microeconomics
  Demand (law, non-price determinants, shifts), supply (law, shifts), market equilibrium,
  excess demand/supply, price mechanism. Elasticities: PED (total revenue, determinants),
  YED (normal/inferior), XED (substitutes/complements), PES. Government intervention:
  price ceilings, price floors, indirect taxes, subsidies, direct provision, regulation.
  Market failure: negative/positive externalities, MSB/MSC diagrams, welfare loss triangles,
  public goods (non-rival, non-excludable), common pool resources, asymmetric information.
  [HL] Theory of the firm: short-run/long-run cost curves, revenue, profit maximisation,
  perfect competition, monopolistic competition, oligopoly, monopoly, price discrimination,
  natural monopoly, monopsony, game theory.

Unit 3 — Macroeconomics
  National income: GDP, GNP, GNI, nominal vs real, per capita, PPP, limitations.
  AD/AS: Keynesian model (horizontal, upward-sloping, vertical ranges), monetarist/neo-classical
  model, SRAS, LRAS. Economic growth: actual vs potential. Unemployment: types (frictional,
  structural, cyclical, seasonal), costs, natural rate. Inflation/deflation: CPI construction,
  demand-pull, cost-push, monetarist causes, costs of inflation and deflation, disinflation.
  Fiscal policy: government spending, taxation, budget positions, multiplier, crowding out.
  Monetary policy: interest rates, money supply, central bank. Supply-side policies.
  Poverty: absolute/relative, Lorenz curve, Gini coefficient, income/wealth inequality.

Unit 4 — The Global Economy
  Absolute and comparative advantage, terms of trade, free trade benefits.
  Protectionism: tariffs, quotas, export subsidies — effects on diagrams and welfare.
  Trading blocs: FTAs, customs unions, monetary unions. WTO role.
  Exchange rates: fixed, floating, managed; appreciation/depreciation; Marshall-Lerner;
  J-curve; purchasing power parity. Balance of payments: current account, capital/financial
  account, relationship between them. Development economics: HDI, GII, multidimensional
  poverty, development barriers (institution, infrastructure, education, health, debt),
  strategies (trade, aid, FDI, microfinance, fair trade).
  [HL] Comparative advantage calculations, terms of trade index, BoP mechanics.

OUT OF SCOPE: Internal Assessment, Theory of Knowledge, Extended Essay.
`;

// ─────────────────────────────────────────────────────────────────────────────
// V2 — derived line-by-line from verbatim guide evidence (pages 17–18, 57–65, 74–75)
// ─────────────────────────────────────────────────────────────────────────────

export const IB_ECONOMICS_ASSESSMENT_FRAMEWORK_V2 = `
IB ECONOMICS ASSESSMENT FRAMEWORK
Source: IB Economics Subject Guide (First Assessment 2022) — Version V2
Evidence: verbatim from pages 17–18, 57–65, and 74–75 of the guide.

━━━ BLOCK 1: PAPER FORMATS ━━━

PAPER 1 — "An extended response paper (25 marks)" [p.57/58]
Duration: 1 hour 15 minutes. SL: 30%; HL: 20%.
"Students answer one question from a choice of three." [p.57]
"The questions are each subdivided into two parts, (a) and (b)." [p.60]
Calculators NOT permitted. [p.60]
Maximum for paper 1: 25 marks.

Part (a) — 10 marks. AO table [p.60]: AO1 √  AO2 √  AO3 —  AO4 √. Analytic markscheme.
  AO3 is ABSENT from Part (a). AO3 command terms (examine, discuss, evaluate, justify,
  recommend, contrast, compare, compare and contrast, to what extent) CANNOT appear here.
  Valid command terms for Part (a): any AO1 term (define, describe, list, outline, state)
  or any AO2 term (analyse, apply, comment, distinguish, explain, suggest).

Part (b) — 15 marks. AO table [p.60]: AO1 √  AO2 √  AO3 √  AO4 √. Markbands.
  AO3 IS present. Any AO3 command term may appear.

SEED SCORING RULE — P1 Part (a):
  The guide names NO specific required command term for Part (a).
  Do NOT fail a P1 Part (a) question for not using 'examine'.
  Fail command_term_fit only if an AO3 term is used (AO3 absent from Part (a) AO table).

SEED SCORING RULE — P1 Part (b):
  The guide names NO specific required command term for Part (b).
  Any AO3 term is valid. Do not fail a P1 Part (b) question for using discuss vs evaluate.

PAPER 2 — "A data response paper (40 marks)" [p.57/58]
Duration: 1 hour 45 minutes. SL: 40%; HL: 30%.
"Students answer one question from a choice of two." [p.57]
"The questions are each subdivided into seven parts, (a), (b), (c), (d), (e), (f) and (g).
Parts (a) and (b) both have subparts showing (i and ii)" [p.61]
Calculators permitted. "Includes some quantitative questions." [p.57]
Maximum marks for paper 2: 40 marks.

Per-part AO table and marks [p.61]:
  Part (a)(i+ii): 4 marks total (2+2).   AO1 √  AO2 —  AO3 —  AO4 √.  Analytic markscheme.
  Part (b):       5 marks (3+2 or 2+3).  AO1 √  AO2 √  AO3 —  AO4 √.  Analytic markscheme.
  Part (c):       4 marks.               AO1 √  AO2 √  AO3 —  AO4 √.  Analytic markscheme.
  Part (d):       4 marks.               AO1 √  AO2 √  AO3 —  AO4 √.  Analytic markscheme.
  Part (e):       4 marks.               AO1 √  AO2 √  AO3 —  AO4 √.  Analytic markscheme.
  Part (f):       4 marks.               AO1 √  AO2 √  AO3 —  AO4 √.  Analytic markscheme.
  Part (g):       15 marks.              AO1 √  AO2 √  AO3 √  AO4 √.  MARKBANDS.

"For parts (a) to (f) a markscheme will be used." [p.64]
The markband section heading for Part (g) is: "Part (g) 15-mark question" [p.64].
No specific command term is named for Part (g). Any AO3 term may appear.
AO3 is ABSENT from Parts (a)–(f): AO3 command terms cannot appear in those parts.

SEED SCORING RULE — P2 Parts (a)–(f):
  Fail command_term_fit if an AO3 command term is used (AO3 absent from their AO rows).
  For Part (a)(i+ii): only AO1 or AO4 terms valid (AO2 also absent from Part (a) table).
  For Parts (b)–(f): AO1, AO2, or AO4 terms valid.
SEED SCORING RULE — P2 Part (g):
  Any AO3 command term is valid. The framework is silent on which specific AO3 term
  appears — treat any AO3 term as command_term_fit = correct for Part (g).
SEED SCORING RULE — P2 stimulus:
  Seed P2 questions with individual stimulus contexts are acceptable for seed anchors.

PAPER 3 (HL ONLY) — "A policy paper (60 marks)" [p.58]
Duration: 1 hour 45 minutes. HL: 30%.
"Students answer two compulsory questions." (30 marks per question) [p.58]
"The questions are subdivided into parts (a) and (b). Part (a) has subparts." [p.62]
"Many question parts require the use of a calculator." [p.62]
"Includes both quantitative and qualitative questions." [p.58]
Maximum marks for paper 3: 60 marks.

Per-part AO table and marks [p.62]:
  Part (a): 20 marks. AO1 √  AO2 √  AO3 —  AO4 √. Analytic markscheme. Has subparts.
  Part (b): 10 marks. AO1 √  AO2 √  AO3 √  AO4 √. MARKBANDS.

P3 Part (b) markband heading (verbatim) [pp.65–66]:
  "Recommend — present an advisable course of action with appropriate supporting
  evidence/reason in relation to a given situation, problem or issue."
The ONLY command term named in the P3 Part (b) markbands is RECOMMEND.

SEED SCORING RULE — P3 Part (b):
  The command term must be 'recommend'. Any other AO3 term (examine, discuss, evaluate,
  justify, to what extent) → command_term_fit = inappropriate. The guide is explicit.
SEED SCORING RULE — P3 Part (a):
  AO3 is ABSENT from Part (a). AO3 command terms are invalid.
  AO4 quantitative terms (calculate, show, determine, derive, sketch) are expected.
  The guide does not specify individual sub-part marks; 4m is a plausible sub-part value.

━━━ BLOCK 2: ASSESSMENT OBJECTIVES ━━━

(Verbatim from page 17)

"1. Knowledge and understanding (AO1)
• Demonstrate knowledge and understanding of specified content
• Demonstrate knowledge and understanding of the common SL/HL syllabus
• Demonstrate knowledge and understanding of current economic issues and data
• At HL only: demonstrate knowledge and understanding of the extension topics

2. Application and analysis (AO2)
• Apply economic concepts and theories to real-world situations
• Identify and interpret economic data
• Analyse how economic information is used effectively in particular contexts
• At HL only: demonstrate application and analysis of the extension topics

3. Synthesis and evaluation (AO3)
• Examine economic concepts and theories
• Use economic concepts and examples to construct and present an argument
• Discuss and evaluate economic information and theories
• At HL only: demonstrate economic synthesis and evaluation of the extension topics;
  select and use economic data using economic theory to make policy recommendations.

4. Use and application of appropriate skills (AO4)
• Produce well-structured written material, using appropriate economic theory, concepts and terminology
• Produce and use diagrams to help explain economic theory, concepts and real-world issues
• Select, interpret and analyse appropriate extracts from the news media
• Interpret appropriate data sets
• Use quantitative techniques to identify, explain and analyse economic relationships"

━━━ BLOCK 3: ASSESSMENT OBJECTIVES IN PRACTICE ━━━

(Verbatim from page 18)

Assessment objective | P1 Part (a) | P1 Part (b) | Paper 2 | Paper 3 | IA
AO1                  |      √      |      √      |    √    |    √    | √
AO2                  |      √      |      √      |    √    |    √    | √
AO3                  |      —      |      √      |    √    |    √    | √
AO4                  |      √      |      √      |    √    |    √    | √

Note: The table above is paper-level. Per-part AO detail in Block 1 is authoritative
for scoring. P2 AO3 (√) applies only to Part (g). P3 AO3 (√) applies only to Part (b).

━━━ BLOCK 4: COMMAND TERMS GLOSSARY ━━━

(Verbatim from pages 74–75. Every entry in the guide reproduced in full.)

Term               | AO   | Definition (verbatim)
Analyse            | AO2  | Break down in order to bring out the essential elements or structure.
Apply              | AO2  | Use an idea, equation, principle, theory or law in relation to a given problem or issue.
Calculate          | AO4  | Obtain a numerical answer showing the relevant stages in the working.
Comment            | AO2  | Give a judgment based on a given statement or result of a calculation.
Compare            | AO3  | Give an account of the similarities between two (or more) items or situations, referring to both (all) of them throughout.
Compare and        |      |
  contrast         | AO3  | Give an account of similarities and differences between two (or more) items or situations, referring to both (all) of them throughout.
Construct          | AO4  | Display information in a diagrammatic or logical form.
Contrast           | AO3  | Give an account of the differences between two (or more) items or situations, referring to both (all) of them throughout.
Define             | AO1  | Give the precise meaning of a word, phrase, concept or physical quantity.
Derive             | AO4  | Manipulate a mathematical relationship to give a new equation or relationship.
Describe           | AO1  | Give a detailed account.
Determine          | AO4  | Obtain the only possible answer.
Discuss            | AO3  | Offer a considered and balanced review that includes a range of arguments, factors or hypotheses. Opinions or conclusions should be presented clearly and supported by appropriate evidence.
Distinguish        | AO2  | Make clear the differences between two or more concepts or items.
Draw               | AO4  | Represent by means of a labelled, accurate diagram or graph, using a pencil. A ruler (straight edge) should be used for straight lines. Diagrams should be drawn to scale. Graphs should have points correctly plotted (if appropriate) and joined in a straight line or smooth curve.
Evaluate           | AO3  | Make an appraisal by weighing up the strengths and limitations.
Examine            | AO3  | Consider an argument or concept in a way that uncovers the assumptions and interrelationships of the issue.
Explain            | AO2  | Give a detailed account including reasons or causes.
Identify           | AO4  | Provide an answer from a number of possibilities.
Justify            | AO3  | Give valid reasons or evidence to support an answer or conclusion.
Label              | AO4  | Add labels to a diagram.
List               | AO1  | Give a sequence of brief answers with no explanation.
Measure            | AO4  | Obtain a value for a quantity.
Outline            | AO1  | Give a brief account or summary.
Plot               | AO4  | Mark the position of points on a diagram.
Recommend          | AO3  | Present an advisable course of action with appropriate supporting evidence/reason in relation to a given situation, problem or issue.
Show               | AO4  | Give the steps in a calculation or derivation.
Show that          | AO4  | Obtain the required result (possibly using information given) without the formality of proof. "Show that" questions do not generally require the use of a calculator.
Sketch             | AO4  | Represent by means of a diagram or graph (labelled as appropriate). The sketch should give a general idea of the required shape or relationship and should include relevant features.
Solve              | AO4  | Obtain the answer(s) using algebraic and/or numerical and/or graphical methods.
State              | AO1  | Give a specific name, value or other brief answer without explanation or calculation.
Suggest            | AO2  | Propose a solution, hypothesis or other possible answer.
To what extent     | AO3  | Consider the merits or otherwise of an argument or concept. Opinions and conclusions should be presented clearly and supported with appropriate evidence and sound argument.

Not in guide glossary: annotate, represent.
`;

export const IB_BUSINESS_ASSESSMENT_FRAMEWORK_V1 = `
IB BUSINESS MANAGEMENT ASSESSMENT FRAMEWORK
Source: IB Business Management Subject Guide (First Assessment 2024)
Version: V1

Evidence basis (verbatim from guide):
  "Paper 1 is the same for SL and HL students." (Paper 1 overview section)
  "This paper is the same for both SL and HL." (External assessment details, SL and HL sections)
  "This is an HL only paper." (Paper 3 section)
  AO3 → P1 Section B, P2 Section B, P3 confirmed in Assessment Objectives in Practice table (p.19).

━━━ PAPER 1 — Pre-released case study. IDENTICAL for SL and HL. ━━━

Duration: 1h30m. Total: 30 marks.
Questions draw on (a) a pre-released statement issued 3 months before the exam, and
(b) an unseen case study issued during the examination.

SECTION A — 20 marks, AO1/AO2. Structured questions only.
  2m  → define / state   (AO1)
  4m  → outline / describe (AO1)
  6m  → analyse / explain  (AO2)

SECTION B — 10 marks, AO3. One from two extended response questions.
  Command terms: discuss, evaluate (10m, AO3).

Paper 1 RULES:
  NO HL-only Section C exists on Paper 1. The guide states explicitly it is
  "the same for both SL and HL." The HL-only external paper is Paper 3 (separate paper).
  P1 does NOT have a 15m or 20m extended response; Section B is 10m.

━━━ PAPER 2 — Unseen stimulus. SL (40m) and HL (50m, larger Section A). ━━━

SECTION A: SL = 20m, HL = 30m. Structured, quantitative focus. AO1/AO2/AO4.
  2m  → state / define   (AO1)
  4m  → describe / outline (AO1)
  6m  → explain / analyse  (AO2)
  6m  → calculate          (AO4)

SECTION B — 20 marks, AO1-AO4. Both SL and HL.
  One from two; subdivided into structured sub-questions (10m) + extended response (10m).
  Extended response command terms: evaluate (AO3), discuss (AO3), to what extent (AO3).

'to what extent' on P2: The guide's AO-to-paper table (p.19) maps AO3 → P2 Section B.
  Since 'to what extent' is AO3, it is a valid P2 Section B extended-response command term.

SEED SCORING NOTE:
  P2 seed questions may have individual contexts (not a shared P2 stimulus).
  Do NOT mark a P2 seed as wrong_paper solely for having an individual context.
  Score paper_fit on command_term, marks, and AO match only.

━━━ PAPER 3 — HL only. Resource-based. Duration: 1h15m. Total: 25 marks. ━━━

Structure: Three fixed questions.
  Q1: 2 marks, AO1 — state, define
  Q2: 6 marks, AO1/AO2 — explain, analyse
  Q3: 17 marks, AO1-AO4, criteria-based:
    Criterion A (use of resource materials): 0–4 marks
    Criterion B (business management tools and theories): 0–4 marks
    Criterion C (evaluation): 0–6 marks
    Criterion D (sequencing of ideas and plan of action): 0–3 marks
  Q3 command terms: to what extent, recommend, evaluate, justify (all AO3).

Paper 3 is NOT essay format — it is structured and criteria-assessed throughout.

━━━ COMMAND TERM → AO → MARKS → PAPER ━━━

  define / state    AO1   2m   P1 Section A, P2 Section A, P3 Q1
  outline/describe  AO1   4m   P1 Section A, P2 Section A
  explain / analyse AO2   6m   P1 Section A, P2 Section A, P3 Q2
  calculate         AO4   6m   P2 Section A (quantitative focus)
  discuss           AO3  10m   P1 Section B, P2 Section B
  evaluate          AO3  10m   P1 Section B, P2 Section B
  to what extent    AO3  10m   P2 Section B (AO3 → P2 Sec B confirmed, guide p.19)
  to what extent    AO3  17m   P3 Q3 (criteria-based)

━━━ COMMAND TERMS BY AO (guide glossary, page 68) ━━━

  AO1: define, describe, identify, list, outline, state
  AO2: analyse, apply, comment, demonstrate, distinguish, explain, suggest
  AO3: compare, compare and contrast, contrast, discuss, evaluate, examine, justify,
       recommend, to what extent
  AO4: annotate, calculate, complete, construct, determine, draw, label, plot, prepare

━━━ ASSESSMENT OBJECTIVES ━━━

  AO1 — Learn and comprehend meaning of information
  AO2 — Use knowledge and skills to break down ideas into simpler parts; see how parts relate
  AO3 — Rearrange component ideas into a new whole; make judgments based on evidence
  AO4 — Demonstrate selection and use of subject-specific skills and techniques

━━━ SYLLABUS SCOPE ━━━

Unit 1 — Business Organisation and Environment
  Types of organisations (for-profit, non-profit, NGO, MNC, cooperative), business objectives,
  stakeholders (internal/external), SWOT, external environment (PEST/STEEPLE), business growth
  and evolution, mergers and acquisitions, franchising, change management, corporate social
  responsibility, business ethics.

Unit 2 — Human Resource Management
  Functions of HRM, organisational structure (flat, tall, matrix, hierarchical), delegation and
  span of control, leadership styles (autocratic, democratic, laissez-faire, paternalistic),
  motivation theories (Maslow, Herzberg, Taylor, Adams equity theory, Pink's intrinsic motivation),
  types of training, performance appraisal, communication (barriers, channels), industrial
  relations, conflict resolution, dismissal vs redundancy.

Unit 3 — Finance and Accounts
  Role of finance, sources of finance (internal: retained profit, sale of assets; external:
  debt, equity, overdraft, leasing, crowdfunding), revenue, costs (fixed/variable/semi-variable),
  contribution and break-even analysis, final accounts (P&L statement, balance sheet, cash flow
  statement), profitability/liquidity/efficiency ratio analysis, investment appraisal (payback
  period, ARR, NPV), working capital, budgets and variance analysis.

Unit 4 — Marketing
  Market orientation vs product orientation, market research (primary: surveys, interviews,
  focus groups; secondary: published data), sampling, market segmentation, targeting,
  positioning (STP), marketing mix: Product (PLC, BCG matrix, branding), Price (strategies:
  penetration, skimming, cost-plus, psychological), Place (distribution channels), Promotion
  (ATL/BTL, digital, guerrilla). International marketing, e-commerce, social media marketing.

Unit 5 — Operations Management
  Operations methods (job production, batch production, mass/flow production), lean production
  (JIT, Kaizen, TQM, quality circles), capacity utilisation, location decisions (qualitative and
  quantitative factors), supply chain management, stock control (EOQ, buffer stock, reorder),
  research and development, innovation, crisis management and contingency planning.

HL Extension topics appear within all five units.
OUT OF SCOPE: Internal Assessment (Business Research Project), TOK. P3 integrates all units.
`;

// ─────────────────────────────────────────────────────────────────────────────
// Framework registry
// ─────────────────────────────────────────────────────────────────────────────

const ASSESSMENT_FRAMEWORKS: Record<string, string> = {
  IB_ECONOMICS: IB_ECONOMICS_ASSESSMENT_FRAMEWORK_V2,
  IB_BUSINESS:  IB_BUSINESS_ASSESSMENT_FRAMEWORK_V1,
};

const FRAMEWORK_VERSIONS: Record<string, string> = {
  IB_ECONOMICS: 'V2',
  IB_BUSINESS:  'V1',
};

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Candidate {
  id: string;
  topic_code: string;
  level: string;
  paper: string;
  command_term: string;
  marks: number;
  ao_level: string;
  question_type: string;
  question_text: string;
  context_text: string | null;
}

interface VerificationResult {
  syllabus_match:   'in_syllabus' | 'partial' | 'out_of_syllabus';
  command_term_fit: 'correct' | 'wrong_marks' | 'wrong_depth' | 'inappropriate';
  ao_alignment:     'correct' | 'wrong_level';
  paper_fit:        'correct' | 'wrong_paper';
  factual_accuracy: 'accurate' | 'minor_error' | 'major_error';
  overall:          'pass' | 'borderline' | 'fail';
  reasoning:        string;
}

// ─────────────────────────────────────────────────────────────────────────────
// System prompts — examiner role declaration (not cached; small)
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPTS: Record<string, string> = {
  IB_ECONOMICS: `You are a rigorous IB Economics senior examiner and syllabus validator. \
Score each candidate question on five criteria using the assessment framework in the user message. \
Score against the framework as written. Do not infer rules not stated in the framework. \
If the framework is silent on a point (e.g. which specific command term appears in a given paper part), \
treat that point as unverifiable and do NOT flag it as an error. \
Decision rule (enforce strictly): \
pass = every criterion is 'correct', 'accurate', or 'in_syllabus'; \
fail = any criterion is 'out_of_syllabus', 'inappropriate', or 'major_error'; \
borderline = anything else. \
Keep reasoning to 1–3 sentences.`,

  IB_BUSINESS: `You are a rigorous IB Business Management senior examiner and syllabus validator. \
Score each candidate question on five criteria using the assessment framework in the user message. \
Decision rule (enforce strictly): \
pass = every criterion is 'correct', 'accurate', or 'in_syllabus'; \
fail = any criterion is 'out_of_syllabus', 'inappropriate', or 'major_error'; \
borderline = anything else. \
Keep reasoning to 1–3 sentences.`,
};

// ─────────────────────────────────────────────────────────────────────────────
// Verification tool — forced structured output
// ─────────────────────────────────────────────────────────────────────────────

const SUBMIT_VERIFICATION_TOOL: Anthropic.Tool = {
  name: 'submit_verification',
  description: 'Submit the structured verification result for the candidate question',
  input_schema: {
    type: 'object' as const,
    properties: {
      syllabus_match:   { type: 'string', enum: ['in_syllabus', 'partial', 'out_of_syllabus'],             description: 'Is the topic covered in the syllabus?' },
      command_term_fit: { type: 'string', enum: ['correct', 'wrong_marks', 'wrong_depth', 'inappropriate'],description: 'Does the command term match marks and depth?' },
      ao_alignment:     { type: 'string', enum: ['correct', 'wrong_level'],                               description: 'Does the AO level match the command term?' },
      paper_fit:        { type: 'string', enum: ['correct', 'wrong_paper'],                               description: 'Is this format appropriate for the stated paper?' },
      factual_accuracy: { type: 'string', enum: ['accurate', 'minor_error', 'major_error'],               description: 'Is the question factually accurate?' },
      overall:          { type: 'string', enum: ['pass', 'borderline', 'fail'],                           description: 'Overall verdict per decision rule' },
      reasoning:        { type: 'string',                                                                  description: '1–3 sentences explaining the verdict' },
    },
    required: ['syllabus_match', 'command_term_fit', 'ao_alignment', 'paper_fit', 'factual_accuracy', 'overall', 'reasoning'],
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Per-candidate user prompt (NOT cached — changes per call)
// ─────────────────────────────────────────────────────────────────────────────

function buildCandidatePrompt(c: Candidate): string {
  const contextSection = c.context_text ? `\nContext/stimulus:\n${c.context_text}\n` : '';
  return `Using the assessment framework above, verify this candidate question.

Metadata:
- Topic code: ${c.topic_code}
- Level: ${c.level}
- Paper: ${c.paper}
- Command term: ${c.command_term.replace(/_/g, ' ')}
- Marks: ${c.marks}
- AO level: ${c.ao_level}
- Question type: ${c.question_type}

Question text:
${c.question_text}
${contextSection}
Score on all five criteria and submit via submit_verification.`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification call
// Framework text block carries cache_control — identical across all calls for
// the same subject, so calls 2-N read from cache at ~10% of call 1's cost.
// ─────────────────────────────────────────────────────────────────────────────

async function verifyCandidate(
  anthropic: Anthropic,
  c: Candidate,
  frameworkText: string,
  systemText: string,
): Promise<{ result: VerificationResult; cacheReadTokens: number; cacheWriteTokens: number }> {
  // TODO: Prompt caching not firing on claude-sonnet-4-6 even with beta header.
  // Likely a model-version-alias issue (dated model ID required?). Not worth debugging
  // at current ~3k-token framework size — full 100-candidate run is ~€0.50 uncached.
  // Revisit if framework grows past ~10k tokens or batch sizes exceed 500 candidates.
  const res = await anthropic.beta.messages.create({
    betas: ['prompt-caching-2024-07-31'],
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    system: systemText,
    tools: [SUBMIT_VERIFICATION_TOOL],
    tool_choice: { type: 'tool', name: 'submit_verification' },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: frameworkText,
            cache_control: { type: 'ephemeral' },  // cached — constant per subject
          } as { type: 'text'; text: string; cache_control: { type: 'ephemeral' } },
          {
            type: 'text',
            text: buildCandidatePrompt(c),          // not cached — varies per candidate
          },
        ],
      },
    ],
  });

  const block = res.content.find(b => b.type === 'tool_use');
  if (!block || block.type !== 'tool_use') throw new Error('No tool_use block in response');

  return {
    result:           block.input as VerificationResult,
    cacheReadTokens:  res.usage.cache_read_input_tokens  ?? 0,
    cacheWriteTokens: res.usage.cache_creation_input_tokens ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

const VERDICT_ICON: Record<string, string> = { pass: '✓', borderline: '~', fail: '✗' };

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  const argv = process.argv.slice(2);
  const arg  = (f: string) => { const i = argv.indexOf(f); return i !== -1 ? argv[i + 1] : undefined; };
  const flag = (f: string) => argv.includes(f);

  const subjectArg = arg('--subject');
  const limitArg   = arg('--limit') ? parseInt(arg('--limit')!, 10) : undefined;
  const dryRun     = flag('--dry-run');

  if (!subjectArg) {
    console.error('Error: --subject required (e.g. --subject IB_ECONOMICS)');
    process.exit(1);
  }

  const frameworkText = ASSESSMENT_FRAMEWORKS[subjectArg];
  const systemText    = SYSTEM_PROMPTS[subjectArg];
  const guideVersion  = FRAMEWORK_VERSIONS[subjectArg];

  if (!frameworkText || !systemText) {
    console.error(`Error: no framework configured for "${subjectArg}". Available: ${Object.keys(ASSESSMENT_FRAMEWORKS).join(', ')}`);
    process.exit(1);
  }

  const frameworkTokenEst = Math.round(frameworkText.length / 4);
  console.log(`\nFramework: ${subjectArg} ${guideVersion} (~${frameworkTokenEst} tokens, cache_control: ephemeral)`);

  // ── Supabase service client ────────────────────────────────────────────────
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );

  // ── Fetch unverified candidates ────────────────────────────────────────────
  let query = supabase
    .from('questions')
    .select('id, topic_code, level, paper, command_term, marks, ao_level, question_type, question_text, context_text')
    .eq('subject', subjectArg)
    .eq('status', 'candidate')
    .eq('verification_status', 'unverified')
    .order('id');

  if (limitArg) query = (query as ReturnType<typeof query.limit>).limit(limitArg) as typeof query;

  const { data: rows, error: dbErr } = await query;
  if (dbErr) { console.error('DB error:', dbErr.message); process.exit(1); }
  if (!rows?.length) { console.log('No unverified candidates found.'); return; }

  const candidates = rows as Candidate[];
  console.log(`Loaded ${candidates.length} unverified candidate(s).`);

  // ── Dry run ───────────────────────────────────────────────────────────────
  if (dryRun) {
    const LINE = '─'.repeat(90);
    console.log(`\n${LINE}`);
    console.log(`DRY RUN — ${candidates.length} candidate(s) for ${subjectArg}  (no API or DB calls)`);
    console.log(LINE);
    console.log(`\nPrompt structure:`);
    console.log(`  [live]   system text  : ~${Math.round(systemText.length / 4)} tokens`);
    console.log(`  [cached] framework    : ~${frameworkTokenEst} tokens  (cache_control: ephemeral, ${guideVersion})`);
    console.log(`  [live]   candidate    : ~${Math.round(buildCandidatePrompt(candidates[0]).length / 4)} tokens avg`);
    console.log(`  cache prefix est.    : ~${Math.round((systemText.length + frameworkText.length) / 4)} tokens total\n`);

    candidates.forEach((c, i) => {
      console.log(LINE);
      console.log(`[${i + 1}/${candidates.length}] id=${c.id}`);
      console.log(`  spec     : ${c.topic_code} · ${c.paper} · ${c.command_term.replace(/_/g, ' ')} · ${c.marks}m · ${c.level} · ${c.ao_level}`);
      console.log(`  question : ${c.question_text.slice(0, 160)}${c.question_text.length > 160 ? '…' : ''}`);
      if (c.context_text) console.log(`  context  : ${c.context_text.slice(0, 120)}…`);
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
    const label = `[${i + 1}/${candidates.length}] ${c.topic_code} · ${c.paper} · ${c.command_term.replace(/_/g, ' ')} · ${c.marks}m`;

    let vr: Awaited<ReturnType<typeof verifyCandidate>> | null = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        vr = await verifyCandidate(anthropic, c, frameworkText, systemText);
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

    if (!vr) { await sleep(200); continue; }

    const { result, cacheReadTokens, cacheWriteTokens } = vr;
    const cacheTag = cacheReadTokens > 0
      ? `cache hit (${cacheReadTokens.toLocaleString()} read)`
      : `cache miss (${cacheWriteTokens.toLocaleString()} written)`;

    console.log(`  ${VERDICT_ICON[result.overall] ?? '?'} ${label} → ${result.overall}  [${cacheTag}]`);
    console.log(`    ${result.reasoning}`);
    if (result.overall !== 'pass') {
      console.log(`    criteria: syllabus=${result.syllabus_match} | term=${result.command_term_fit} | ao=${result.ao_alignment} | paper=${result.paper_fit} | fact=${result.factual_accuracy}`);
    }
    tallies[result.overall]++;

    const { error: upErr } = await supabase
      .from('questions')
      .update({
        verification_status:           result.overall,
        verification_notes:            result,
        verified_at:                   new Date().toISOString(),
        verified_against_guide_version: guideVersion,
      })
      .eq('id', c.id);

    if (upErr) console.error(`    DB write failed: ${upErr.message}`);

    await sleep(200);
  }

  const elapsed = ((Date.now() - startMs) / 1000).toFixed(0);
  const total   = candidates.length;
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Verified ${total - tallies.error}/${total}  (${elapsed}s)`);
  console.log(`  pass:       ${tallies.pass}`);
  console.log(`  borderline: ${tallies.borderline}`);
  console.log(`  fail:       ${tallies.fail}`);
  if (tallies.error) console.log(`  errors:     ${tallies.error}  (verification_status left as 'unverified')`);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
