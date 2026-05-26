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
// Superseded by V3 — P2 sub-part mark structure reframed as standalone questions.
// ─────────────────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const IB_ECONOMICS_ASSESSMENT_FRAMEWORK_V2 = `
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

// ─────────────────────────────────────────────────────────────────────────────
// V3 — programmatically derived from V2 with two targeted changes to BLOCK 1:
//   1. P2 Part (a) reframed: (a)(i) 2m and (a)(ii) 2m are standalone sub-questions
//   2. P2 Part (b) reframed: (b)(i) 3m and (b)(ii) 2m are standalone sub-questions
//   3. Scoring rules updated: 2m and 3m for those sub-parts = command_term_fit: correct
// ─────────────────────────────────────────────────────────────────────────────

export const IB_ECONOMICS_ASSESSMENT_FRAMEWORK_V3 = IB_ECONOMICS_ASSESSMENT_FRAMEWORK_V2
  .replace('Version V2', 'Version V3')
  .replace(
    '  Part (a)(i+ii): 4 marks total (2+2).   AO1 √  AO2 —  AO3 —  AO4 √.  Analytic markscheme.',
    '  Part (a)(i): 2 marks.  Part (a)(ii): 2 marks.  Two separate sub-questions.\n' +
    '    Each is a valid standalone seed-anchor question. AO1 + AO4 per sub-question.\n' +
    '    Analytic markscheme.'
  )
  .replace(
    '  Part (b):       5 marks (3+2 or 2+3).  AO1 √  AO2 √  AO3 —  AO4 √.  Analytic markscheme.',
    '  Part (b)(i): 3 marks.  Part (b)(ii): 2 marks.  Two separate sub-questions.\n' +
    '    Each is a valid standalone seed-anchor question. AO1 + AO2 + AO4 per sub-question.\n' +
    '    Analytic markscheme.'
  )
  .replace(
    '  For Part (a)(i+ii): only AO1 or AO4 terms valid (AO2 also absent from Part (a) table).\n' +
    '  For Parts (b)–(f): AO1, AO2, or AO4 terms valid.',
    '  For Part (a)(i) at 2m and Part (a)(ii) at 2m: command_term_fit = correct.\n' +
    '    (2 marks is the exact sub-part allocation; do NOT flag as wrong_marks.)\n' +
    '  For Part (b)(i) at 3m and Part (b)(ii) at 2m: command_term_fit = correct.\n' +
    '    (3m and 2m are the exact sub-part allocations; do NOT flag as wrong_marks.)\n' +
    '  For Parts (c)–(f) at 4m: AO1, AO2, or AO4 terms valid.\n' +
    '  Do NOT flag wrong_marks for 2m or 3m questions targeting these specific sub-parts.'
  );

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
// IB BM V3 — assembled from verbatim guide evidence (Rule 22)
// Source: Business_Management_Subject_Guide.pdf (First assessment 2024, © IBO 2022)
// Guide version tag: IB_BM_2024  ·  Subject string: IB_BUSINESS_MANAGEMENT
// Each sub-constant carries an // EVIDENCE comment with verbatim quote + page reference.
// ─────────────────────────────────────────────────────────────────────────────

// EVIDENCE: p. 41 — "Paper 1 is the same for SL and HL students."
// EVIDENCE: p. 41 — "The examination is based upon one case study, of approximately 800 to 1,000 words, that students do not see before the examination."
// EVIDENCE: p. 42 — "Only HL students will sit this examination." (P3)
// EVIDENCE: p. 48 — "For question 1 and question 2 an analytic markscheme will be used. For question 3 the following assessment criteria will be used."
const PAPER_STRUCTURE_IB_BM = `
━━━ BLOCK 1: PAPER STRUCTURE ━━━

PAPER 1 — Pre-released case study. IDENTICAL for SL and HL. [p.41]
Duration: 1h30m. Total: 30 marks. Weighting: 35% (SL), 25% (HL).
"Paper 1 is the same for SL and HL students. Three months prior to the examination the IB will
release a statement with two elements." [p.41]
"The examination is based upon one case study, of approximately 800 to 1,000 words, that students
do not see before the examination. Most questions will be qualitative, although some minor
calculations could be part of the assessment." [p.41]
Syllabus scope: Units 1–5 EXCLUDING HL extension material.
HARD RULE: P1 questions must NOT target HL-only sub-topics — even for HL students.

Section A — 20 marks. AOs: AO1, AO2, AO4. Structured questions, analytic markscheme.
  AO3 is ABSENT from Section A. AO3 command terms CANNOT appear here.
  Typical marks: 2m (AO1), 4m (AO1), 6m (AO2/AO4).

Section B — 10 marks. AOs: AO1, AO2, AO3, AO4. One from two extended responses. Markbands.
  AO3 IS present. Any AO3 command term is valid.
  Maximum for Section B is 10m — there is no 15m or 20m extended response on P1.

PAPER 2 — Unseen stimulus. DIFFERENT for SL and HL. [pp.41–42]
SL: 1h30m, 35%, 40 marks total (Section A 20m + Section B 20m).
HL: 1h45m, 30%, 50 marks total (Section A 30m + Section B 20m).
"Most questions will be quantitative, though some questions may not have a quantitative
element." [p.41]
"For SL only, one of the stimulus options in section B of the examination may be on a
social enterprise." [p.42]
Syllabus scope: SL = Units 1–5 excluding HL extension; HL = Units 1–5 including HL extension.

Section A — Quantitative focus, structured, analytic markscheme. AOs: AO1, AO2, AO4.
  AO3 is ABSENT from Section A. AO3 command terms CANNOT appear here.
  SL Section A = 20m; HL Section A = 30m.

Section B — Both SL and HL = 20m. AOs: AO1, AO2, AO3, AO4.
  Structured sub-questions + 10m extended response. 10m extended response uses markbands.
  AO3 IS present in Section B.

PAPER 3 — HL ONLY. [p.42]
Duration: 1h15m. Weighting: 25%. Total: 25 marks.
"Paper 3 will be about a social enterprise and requires students to identify and describe a human
need and the potential organizational challenges facing the social entrepreneur wanting to meet
this need. Further to this, students are required to write a decision-making document that includes
a business recommendation. Only HL students will sit this examination." [p.42]
Syllabus scope: Units 1–5 including HL extension.

Three compulsory questions — fixed marks:
  Q1: 2 marks. AO1 only. Analytic markscheme.
      "AO1 questions — assesses students' ability to describe the human need in the stimulus." [p.42]
  Q2: 6 marks. AO1 + AO2. Analytic markscheme.
      "AO2 questions — assesses students' ability to explain the key challenges." [p.42]
  Q3: 17 marks. AO1+AO2+AO3+AO4. ASSESSMENT CRITERIA A/B/C/D (NOT markbands).
      "For question 3 the following assessment criteria will be used." [p.48]
      Criteria sum: A(4) + B(4) + C(6) + D(3) = 17. ✓

HARD RULES:
  P3 Q3 = exactly 17 marks. Any other mark value → FAIL.
  P3 = HL only. SL questions must not target P3.
  SL weightings: 35+35+30=100% ✓. HL weightings: 25+30+25+20=100% ✓.
`;

// EVIDENCE: p. 18 — "AO1: Knowledge and understanding — Demonstrate knowledge and understanding of: business management tools and theories; course topics and concepts; business problems, issues and decisions; HL extension topics (HL only)."
// EVIDENCE: p. 18 — "AO2: Application and analysis — Apply and analyse: business management tools and theories; course topics and concepts; business problems, issues and decisions; business decisions and issues through the selection and use of appropriate data; HL extension topics (HL only)."
// EVIDENCE: p. 18 — "AO3: Synthesis and evaluation — Synthesize and evaluate: business management tools and theories; course topics and concepts; business problems, issues and decisions; stakeholder interests to reach informed business decisions; recommendations for competing future strategic options (HL only); HL extension topics (HL only)."
// EVIDENCE: p. 18 — "AO4: Use and application of appropriate skills — Select and apply relevant business management tools, theories and concepts to support research into a business issue or problem. Select, interpret and analyse business materials from a range of primary and secondary sources. Create well-structured materials using business management terminology. Communicate analysis, evaluation and conclusions of research effectively."
const ASSESSMENT_OBJECTIVES_IB_BM = `
━━━ BLOCK 2: ASSESSMENT OBJECTIVES ━━━

(Verbatim from page 18)

"AO1: Knowledge and understanding — Demonstrate knowledge and understanding of:
business management tools and theories; course topics and concepts; business problems,
issues and decisions; HL extension topics (HL only)."

"AO2: Application and analysis — Apply and analyse: business management tools and theories;
course topics and concepts; business problems, issues and decisions; business decisions and
issues through the selection and use of appropriate data; HL extension topics (HL only)."

"AO3: Synthesis and evaluation — Synthesize and evaluate: business management tools and
theories; course topics and concepts; business problems, issues and decisions; stakeholder
interests to reach informed business decisions; recommendations for competing future strategic
options (HL only); HL extension topics (HL only)."

"AO4: Use and application of appropriate skills — Select and apply relevant business management
tools, theories and concepts to support research into a business issue or problem. Select,
interpret and analyse business materials from a range of primary and secondary sources. Create
well-structured materials using business management terminology. Communicate analysis, evaluation
and conclusions of research effectively."
`;

// EVIDENCE: p. 19 (AO1 depth) — "These terms require students to learn and comprehend the meaning of information."
// EVIDENCE: p. 19 (AO2 depth) — "These terms require students to use their knowledge and skills to break down ideas into simpler parts and to see how the parts relate."
// EVIDENCE: p. 20 (AO3 depth) — "These terms require students to rearrange component ideas into a new whole and make judgments based on evidence or a set of criteria."
// EVIDENCE: p. 20 (AO4 depth) — "These terms require students to demonstrate the selection and use of subject-specific skills and techniques."
const AO_DEPTH_DESCRIPTORS_IB_BM = `
━━━ BLOCK 3: AO DEPTH DESCRIPTORS ━━━

(Verbatim from pages 19–20)

AO1 — Knowledge and understanding [p.19]:
  "These terms require students to learn and comprehend the meaning of information."

AO2 — Application and analysis [p.19]:
  "These terms require students to use their knowledge and skills to break down ideas
  into simpler parts and to see how the parts relate."

AO3 — Synthesis and evaluation [p.20]:
  "These terms require students to rearrange component ideas into a new whole and make
  judgments based on evidence or a set of criteria."

AO4 — Use and application of appropriate skills [p.20]:
  "These terms require students to demonstrate the selection and use of subject-specific
  skills and techniques."
`;

// EVIDENCE: p. 19 — AO × Paper matrix (6 columns); AO3 absent from P1 Sec A and P2 Sec A.
const AO_PAPER_MATRIX_IB_BM = `
━━━ BLOCK 4: AO × PAPER MATRIX ━━━

(Verbatim from page 19 — 6 columns)

Assessment objective | P1 Sec A | P1 Sec B | P2 Sec A | P2 Sec B | P3 (HL) | IA
AO1 Knowledge        |    ✓     |    ✓     |    ✓     |    ✓     |    ✓    | ✓
AO2 Application      |    ✓     |    ✓     |    ✓     |    ✓     |    ✓    | ✓
AO3 Synthesis        |    —     |    ✓     |    —     |    ✓     |    ✓    | ✓
AO4 Skills           |    ✓     |    ✓     |    ✓     |    ✓     |    ✓    | ✓

VERIFIER HARD RULE: AO3 is ABSENT from P1 Section A and P2 Section A.
Any question in P1 Sec A or P2 Sec A with an AO3 command term → FAIL (paper_fit='wrong_paper').
"Section A will be assessed against AO1, AO2 and AO4 levels whereas Section B will be
assessed against all four levels including AO3." [p.42]
`;

// EVIDENCE: p. 42 — "Examination questions may use any command term from the assessment objective level specified in the 'Syllabus content' section, or a less demanding command term from a lower level. For example, if the assessment objective level for a topic is AO2, an examination question could contain any of the command terms for AO2, such as 'explain', 'distinguish', and so on. Alternatively, the examination question could contain a command term from AO1, such as 'describe'. However, a more demanding command term, such as 'evaluate', from a higher level (AO3 in this case) cannot be used."
const AO_PROGRESSION_RULE_IB_BM = `
━━━ BLOCK 5: AO PROGRESSION RULE ━━━

(Verbatim from page 42)

"Examination questions may use any command term from the assessment objective level specified
in the 'Syllabus content' section, or a less demanding command term from a lower level. For
example, if the assessment objective level for a topic is AO2, an examination question could
contain any of the command terms for AO2, such as 'explain', 'distinguish', and so on.
Alternatively, the examination question could contain a command term from AO1, such as
'describe'. However, a more demanding command term, such as 'evaluate', from a higher level
(AO3 in this case) cannot be used."

Encoding (p.42):
  topic_ao_level = N → command term must be from AO ≤ N.
  AO4 is PARALLEL (use-of-skills), not progressive — AO4 command terms are valid alongside any topic AO.
  If topic_ao_level = AO1, using 'Evaluate' (AO3) → FAIL.
  If topic_ao_level = AO2, using 'Discuss' (AO3) → FAIL.
  'Calculate', 'Draw', 'Construct' (AO4) are always valid regardless of topic AO level.
`;

// EVIDENCE: p. 67 — "Students should be familiar with the following key terms and phrases used in examination questions, which are to be understood as described below. Although these terms will be used frequently in examination questions, other terms may be used to direct students to present an argument in a specific way."
// EVIDENCE: pp. 67–68 — 31 terms: AO1×6, AO2×7, AO3×9, AO4×9 = 31 ✓
// CRITICAL DRIFT: 'Comment' = AO2 in IB BM (NOT AO3). 'Calculate' = AO4 (NOT AO2).
const COMMAND_TERMS_IB_BM = `
━━━ BLOCK 6: COMMAND TERMS GLOSSARY ━━━

(Verbatim from pages 67–68. 31 terms total: 6+7+9+9 = 31 ✓)

"Students should be familiar with the following key terms and phrases used in examination
questions, which are to be understood as described below." [p.67]

CRITICAL DRIFT WARNINGS:
  'Comment' is AO2 in IB Business Management — NOT AO3. Do NOT tag it AO3.
  'Calculate' is AO4 in IB BM — NOT AO2. Do NOT tag it AO2.

AO1 terms (6):
  Define         | AO1 | Give the precise meaning of a word, phrase, concept or physical quantity.
  Describe       | AO1 | Give a detailed account.
  Identify       | AO1 | Provide an answer from a number of possibilities.
  List           | AO1 | Give a sequence of brief answers with no explanation.
  Outline        | AO1 | Give a brief account or summary.
  State          | AO1 | Give a specific name, value or other brief answer without explanation or calculation.

AO2 terms (7):
  Analyse        | AO2 | Break down in order to bring out the essential elements or structure.
  Apply          | AO2 | Use an idea, equation, principle, theory or law in relation to a given problem or issue.
  Comment        | AO2 | Give a judgment based on a given statement or result of a calculation.
  Demonstrate    | AO2 | Make clear by reasoning or evidence, illustrating with examples or practical application.
  Distinguish    | AO2 | Make clear the differences between two or more concepts or items.
  Explain        | AO2 | Give a detailed account including reasons or causes.
  Suggest        | AO2 | Propose a solution, hypothesis or other possible answer.

AO3 terms (9):
  Compare              | AO3 | Give an account of the similarities between two (or more) items or situations, referring to both (all) of them throughout.
  Compare and contrast | AO3 | Give an account of similarities and differences between two (or more) items or situations, referring to both (all) of them throughout.
  Contrast             | AO3 | Give an account of the differences between two (or more) items or situations, referring to both (all) of them throughout.
  Discuss              | AO3 | Offer a considered and balanced review that includes a range of arguments, factors or hypotheses. Opinions or conclusions should be presented clearly and supported by appropriate evidence.
  Evaluate             | AO3 | Make an appraisal by weighing up the strengths and limitations.
  Examine              | AO3 | Consider an argument or concept in a way that uncovers the assumptions and interrelationships of the issue.
  Justify              | AO3 | Give valid reasons or evidence to support an answer or conclusion.
  Recommend            | AO3 | Present an advisable course of action with appropriate supporting evidence/reason in relation to a given situation, problem or issue.
  To what extent       | AO3 | Consider the merits or otherwise of an argument or concept. Opinions and conclusions should be presented clearly and supported with appropriate evidence and sound argument.

AO4 terms (9):
  Annotate    | AO4 | Add brief notes to a diagram or graph.
  Calculate   | AO4 | Obtain a numerical answer showing the relevant stages in the working.
  Complete    | AO4 | Add missing information/data.
  Construct   | AO4 | Display information in a diagrammatic or logical form.
  Determine   | AO4 | Obtain the only possible answer.
  Draw        | AO4 | Represent by means of a labelled, accurate diagram or graph, using a pencil. A ruler (straight edge) should be used for straight lines. Diagrams should be drawn to scale. Graphs should have points correctly plotted (if appropriate) and joined in a straight line or smooth curve.
  Label       | AO4 | Add labels to a diagram.
  Plot        | AO4 | Mark the position of points on a diagram.
  Prepare     | AO4 | Put given data or information from a stimulus/source into a suitable format.
`;

// EVIDENCE: p. 44 / p. 47 (band 0) — "The work does not reach a standard described by the descriptor."
// EVIDENCE: p. 44 / pp. 47–48 (band 1–2) — "Little understanding of the demands of the question."
// EVIDENCE: p. 44 / p. 48 (band 9–10) — "Clear focus on addressing the demands of the question. Relevant and accurate use of business management tools and theories. Relevant information from the stimulus material is integrated effectively to support the argument. Arguments are substantiated and balanced, with an explanation of the limitations of the case study or stimulus material."
const MARKBANDS_IB_BM_P1_P2_SEC_B_10MARK = `
━━━ BLOCK 7: MARKBANDS — P1 AND P2 SECTION B 10-MARK EXTENDED RESPONSE ━━━

SCOPE: These markbands apply ONLY to the 10-mark extended response in Section B of Papers 1 and 2.
Section A structured questions use a question-specific analytic markscheme — NOT these markbands.
Paper 3 Q3 uses assessment criteria A/B/C/D (see Block 8) — NOT these markbands.
SL and HL markband text is textually identical. [SL: p.44 / HL: pp.47–48]

Band 0:   "The work does not reach a standard described by the descriptor." [p.44/p.47]

Band 1–2: "Little understanding of the demands of the question. Little use of business management
tools and theories; any tools and theories that are used are irrelevant or used inaccurately.
Little or no reference to the stimulus material. No arguments are made." [p.44/pp.47–48]

Band 3–4: "Some understanding of the demands of the question. Some use of business management
tools and theories, but these are mostly lacking in accuracy and relevance. Superficial use of
information from the stimulus material, often not going beyond the name of the person(s) or name
of the organization. Any arguments made are mostly unsubstantiated." [p.44/p.48]

Band 5–6: "The response indicates an understanding of the demands of the question, but these
demands are only partially addressed. Some relevant and accurate use of business management tools
and theories. Some relevant use of information from the stimulus material that goes beyond the
name of the person(s) or name of the organization but does not effectively support the argument.
Arguments are substantiated but are mostly one-sided." [p.44/p.48]

Band 7–8: "Mostly addresses the demands of the question. Mostly relevant and accurate use of
business management tools and theories. Information from the stimulus material is generally used
to support the argument, although there is some lack of clarity or relevance in some places.
Arguments are substantiated and have some balance." [p.44/p.48]

Band 9–10: "Clear focus on addressing the demands of the question. Relevant and accurate use of
business management tools and theories. Relevant information from the stimulus material is
integrated effectively to support the argument. Arguments are substantiated and balanced, with an
explanation of the limitations of the case study or stimulus material." [p.44/p.48]
`;

// EVIDENCE: p. 48 — "For question 1 and question 2 an analytic markscheme will be used. For question 3 the following assessment criteria will be used."
// EVIDENCE: p. 48 — "Criterion A: Use of resource materials — To what extent does the student use the resource materials provided to effectively support the recommended plan of action?"
// EVIDENCE: p. 49 — "Criterion B: Business management tools and theories — To what extent does the student's plan of action effectively apply appropriate business management tools and theories?"
// EVIDENCE: p. 49 — "Criterion C: Evaluation — To what extent does the student effectively evaluate the expected impact of their plan of action on the relevant areas of the business?"
// EVIDENCE: p. 49 — "Criterion D: Sequencing of ideas and plan of action — To what extent are the student's ideas and plan of action sequenced in a clear and coherent manner?"
// Cross-check: A(4) + B(4) + C(6) + D(3) = 17 ✓
const P3_HL_Q3_CRITERIA_IB_BM = `
━━━ BLOCK 8: PAPER 3 Q3 ASSESSMENT CRITERIA ━━━

SCOPE: Criteria apply ONLY to Q3 of Paper 3 (HL). Q1 and Q2 use analytic markschemes.
"For question 1 and question 2 an analytic markscheme will be used.
For question 3 the following assessment criteria will be used." [p.48]
Criteria sum: A(4) + B(4) + C(6) + D(3) = 17 marks ✓

Criterion A: Use of resource materials (0–4) [p.48]
"Criterion A: Use of resource materials — To what extent does the student use the resource
materials provided to effectively support the recommended plan of action?"
  0 — "The response does not reach a standard described by the descriptors below."
  1 — "The response makes limited reference to the resource materials provided or the resources
       identified have been used ineffectively to support the recommended plan of action."
  2 — "The response makes some reference to the resource materials provided or the resources
       identified have been used in a superficial way to support the recommended plan of action."
  3 — "The response makes reference to most of the resource materials provided to support the
       recommended plan of action."
  4 — "The response makes reference to all resource materials provided to effectively support
       the recommended plan of action."

Criterion B: Business management tools and theories (0–4) [p.49]
"Criterion B: Business management tools and theories — To what extent does the student's plan of
action effectively apply appropriate business management tools and theories?"
  0 — "The work does not reach a standard described by the descriptors below."
  1 — "The response demonstrates limited application of appropriate business management tools
       and theories."
  2 — "The response superficially applies appropriate business management tools and theories."
  3 — "The response satisfactorily applies appropriate business management tools and theories."
  4 — "The response effectively applies appropriate business management tools and theories."

Criterion C: Evaluation (0–6) [p.49]
"Criterion C: Evaluation — To what extent does the student effectively evaluate the expected
impact of their plan of action on the relevant areas of the business?"
  0   — "The work does not reach a standard described by the descriptors below."
  1–2 — "The response is largely descriptive with limited analysis or evaluation of the expected
          impact of their plan of action. There is limited reference to the relevant areas of the
          business."
  3–4 — "The response analyses the expected impact of their plan of action with some reference
          to the relevant areas of the business. There is some evidence of evaluation but it is
          not sustained."
  5–6 — "The student effectively evaluates the expected impact of their plan of action on the
          relevant areas of the business and considers the trade-offs between those areas."

Criterion D: Sequencing of ideas and plan of action (0–3) [p.49]
"Criterion D: Sequencing of ideas and plan of action — To what extent are the student's ideas
and plan of action sequenced in a clear and coherent manner?"
  0 — "The response does not reach a standard described by the descriptors below."
  1 — "The response is limited in its sequencing of ideas and plan of action."
  2 — "The response consists of ideas and a plan of action but these are not always sequenced
       in a clear manner."
  3 — "The response effectively sequences appropriate ideas and a plan of action in a clear and
       coherent manner."
`;

// EVIDENCE: p. 43 — "While all questions requiring a calculator can be answered fully using a four-function (plus, minus, multiply, divide) calculator, graphic display calculators (GDCs) are allowed during the examination."
const CALCULATOR_RULE_IB_BM = `
━━━ BLOCK 9: CALCULATOR POLICY ━━━

(Verbatim from page 43)

"While all questions requiring a calculator can be answered fully using a four-function
(plus, minus, multiply, divide) calculator, graphic display calculators (GDCs) are allowed
during the examination."

Generator rule: P2 quantitative content must be solvable on a four-function calculator.
No logarithms, no statistical regressions, no algebraic solvers required.
`;

// EVIDENCE: pp. 21–22 — 5 units + Business Management Toolkit (cross-cutting, not a 6th unit)
// EVIDENCE: pp. 21–22 — HL-only sub-topics at sub-topic level: 2.5, 2.7, 3.6, 3.9, 4.3, 4.6, 5.3, 5.6, 5.7, 5.8, 5.9
const SYLLABUS_STRUCTURE_IB_BM = `
━━━ BLOCK 10: SYLLABUS STRUCTURE AND HL-ONLY SUB-TOPICS ━━━

(From pages 21–22. Totals: SL 150 hrs / HL 240 hrs.)

5 units + Business Management Toolkit (cross-cutting analytical tools, NOT a 6th unit).

Unit 1 — Introduction to business management (SL 20h, HL 20h). No HL-only sub-topics.
Unit 2 — Human resource management (SL 20h, HL 35h).
  HL-only: 2.5 Organizational (corporate) culture · 2.7 Industrial/employee relations
Unit 3 — Finance and accounts (SL 30h, HL 45h).
  HL-only: 3.6 Efficiency ratio analysis · 3.9 Budgets
Unit 4 — Marketing (SL 30h, HL 35h).
  HL-only: 4.3 Sales forecasting · 4.6 International marketing
Unit 5 — Operations management (SL 15h, HL 45h).
  HL-only: 5.3 Lean production and quality management · 5.6 Production planning
           5.7 Crisis management and contingency planning · 5.8 Research and development
           5.9 Management information systems
Business Management Toolkit — cross-cutting (SL 10h, HL 35h). Appears across all units.

HL-only sub-topic list (full): 2.5, 2.7, 3.6, 3.9, 4.3, 4.6, 5.3, 5.6, 5.7, 5.8, 5.9

CRITICAL: HL extension is sub-topic-level in IB BM (NOT unit-level as in IB Econ).
SL students can study Units 1–5 but are EXCLUDED from the 11 HL-only sub-topics listed above.
P1 also excludes all HL extension material regardless of student level.

OUT OF SCOPE: Internal Assessment (Business Research Project), TOK, Extended Essay.
P3 integrates all units including HL extension — HL students only.
`;

export const IB_BM_V3 = `IB BUSINESS MANAGEMENT ASSESSMENT FRAMEWORK
Source: Business_Management_Subject_Guide.pdf (First assessment 2024, © IBO 2022)
Guide version tag: IB_BM_2024
Evidence: verbatim from pages 18–22, 41–50, 67–68 of the guide.
${PAPER_STRUCTURE_IB_BM}
${ASSESSMENT_OBJECTIVES_IB_BM}
${AO_DEPTH_DESCRIPTORS_IB_BM}
${AO_PAPER_MATRIX_IB_BM}
${AO_PROGRESSION_RULE_IB_BM}
${COMMAND_TERMS_IB_BM}
${MARKBANDS_IB_BM_P1_P2_SEC_B_10MARK}
${P3_HL_Q3_CRITERIA_IB_BM}
${CALCULATOR_RULE_IB_BM}
${SYLLABUS_STRUCTURE_IB_BM}`;

// ─────────────────────────────────────────────────────────────────────────────
// IB_BM_V3 runtime lookups — deterministic rule enforcement (no Claude API)
// ─────────────────────────────────────────────────────────────────────────────

// EVIDENCE: pp. 67–68 — authoritative AO per command term (31 terms: 6+7+9+9 = 31 ✓)
// comment=AO2 (NOT AO3). calculate=AO4 (NOT AO2). Common training-data drift targets.
export const COMMAND_TERM_AO_IB_BM: Record<string, string> = {
  // AO1 (6)
  define: 'AO1', describe: 'AO1', identify: 'AO1', list: 'AO1', outline: 'AO1', state: 'AO1',
  // AO2 (7)
  analyse: 'AO2', apply: 'AO2', comment: 'AO2', demonstrate: 'AO2',
  distinguish: 'AO2', explain: 'AO2', suggest: 'AO2',
  // AO3 (9)
  compare: 'AO3', compare_and_contrast: 'AO3', contrast: 'AO3', discuss: 'AO3',
  evaluate: 'AO3', examine: 'AO3', justify: 'AO3', recommend: 'AO3', to_what_extent: 'AO3',
  // AO4 (9)
  annotate: 'AO4', calculate: 'AO4', complete: 'AO4', construct: 'AO4', determine: 'AO4',
  draw: 'AO4', label: 'AO4', plot: 'AO4', prepare: 'AO4',
};

// EVIDENCE: pp. 21–22 — HL-only sub-topics are at sub-topic level (not unit level)
export const HL_ONLY_SUBTOPICS_IB_BM = new Set([
  '2.5', '2.7', '3.6', '3.9', '4.3', '4.6', '5.3', '5.6', '5.7', '5.8', '5.9',
]);

// EVIDENCE: p.30 Unit 3.8 — "Investment opportunities using payback period, ARR and NPV (HL only)"
// EVIDENCE: pp.29–35 — efficiency ratios, depreciation methods, budgets/variances HL only within sub-topics
export const HL_ONLY_METHOD_SIGNALS_IB_BM: string[] = [
  'npv', 'net present value',
  'stock turnover', 'debtor days', 'creditor days', 'gearing ratio',
  'straight-line depreciation', 'straight line depreciation', 'units of production',
  'variance analysis', 'adverse variance', 'favourable variance',
];

// EVIDENCE: pp.29–35 syllabus content tables — max AO per sub-topic where AO4 calculate is absent
export const MAX_AO_BY_SUBTOPIC_IB_BM: Record<string, string> = {
  '5.4': 'AO3',   // Location: qualitative/quantitative factors — max AO3, no AO4 calculation
  '1.4': 'AO2',   // Stakeholders: identify/analyse interests — max AO2
  '2.6': 'AO2',   // Communication: formal/informal channels, barriers — max AO2
};

// AO rank for progression check — AO4 is parallel (99 = always valid), not progressive
const AO_RANK_IB_BM: Record<string, number> = { AO1: 1, AO2: 2, AO3: 3, AO4: 99 };

// ─────────────────────────────────────────────────────────────────────────────
// IB_BM_V3 deterministic validation — exported for meta-tests (Rule 23)
// ─────────────────────────────────────────────────────────────────────────────

export interface BMQuestionInput {
  command_term:    string;   // lowercase, underscores for spaces (e.g. 'to_what_extent')
  ao_level:        string;   // 'AO1' | 'AO2' | 'AO3' | 'AO4'
  paper:           string;   // 'P1' | 'P2' | 'P3'
  section?:        string;   // 'SEC_A' | 'SEC_B' | 'Q1' | 'Q2' | 'Q3'
  marks:           number;
  level:           string;   // 'SL' | 'HL'
  subtopic_code?:  string;   // e.g. '3.9' — checked against HL_ONLY_SUBTOPICS_IB_BM
  topic_ao_level?: string;   // AO level of the topic from syllabus content, if known
  question_text?:  string;   // for keyword-based rules (R1 human-need, R2 state/calc, R3 HL method)
}

export interface BMViolation {
  rule:     string;
  message:  string;
  severity: 'major' | 'minor';
}

// Returns violations; empty array = valid. Does not call Claude.
export function validateBMQuestion(q: BMQuestionInput): BMViolation[] {
  const violations: BMViolation[] = [];
  const term   = q.command_term.toLowerCase().replace(/ /g, '_');
  const termAO = COMMAND_TERM_AO_IB_BM[term];

  // Rule 1 — AO alignment: command term's AO must match stated ao_level [pp.67–68]
  if (termAO && termAO !== q.ao_level) {
    violations.push({
      rule:     'ao_alignment',
      message:  `"${q.command_term}" is ${termAO} per guide pp.67–68, but question is tagged ${q.ao_level}`,
      severity: 'major',
    });
  }

  // Rule 2 — AO progression: topic AO must be ≥ command term AO; AO4 is parallel [p.42]
  if (q.topic_ao_level && termAO && termAO !== 'AO4') {
    const topicRank = AO_RANK_IB_BM[q.topic_ao_level] ?? 0;
    const termRank  = AO_RANK_IB_BM[termAO]            ?? 0;
    if (termRank > topicRank) {
      violations.push({
        rule:     'ao_progression',
        message:  `Topic is ${q.topic_ao_level} but "${q.command_term}" is ${termAO} — command term exceeds topic AO level [p.42]`,
        severity: 'major',
      });
    }
  }

  // Rule 3 — AO3 absent from P1 Sec A and P2 Sec A [p.19 matrix, p.42]
  if (q.section === 'SEC_A' && (q.paper === 'P1' || q.paper === 'P2')) {
    if (q.ao_level === 'AO3' || termAO === 'AO3') {
      violations.push({
        rule:     'ao3_absent_sec_a',
        message:  `AO3 command terms are invalid in ${q.paper} Section A — see guide p.19 AO × Paper matrix`,
        severity: 'major',
      });
    }
  }

  // Rule 4 — P3 structural rules [p.42 / pp.47–50]
  if (q.paper === 'P3') {
    if (q.level === 'SL') {
      violations.push({
        rule:     'p3_hl_only',
        message:  'P3 is HL only — "Only HL students will sit this examination." [p.42]',
        severity: 'major',
      });
    }
    if (q.section === 'Q1' && q.marks !== 2) {
      violations.push({ rule: 'p3_q1_marks', message: `P3 Q1 must be 2 marks (got ${q.marks}) [p.42]`, severity: 'major' });
    }
    if (q.section === 'Q2' && q.marks !== 6) {
      violations.push({ rule: 'p3_q2_marks', message: `P3 Q2 must be 6 marks (got ${q.marks}) [p.42]`, severity: 'major' });
    }
    if (q.section === 'Q3' && q.marks !== 17) {
      violations.push({
        rule:     'p3_q3_marks',
        message:  `P3 Q3 must be 17 marks — criteria A(4)+B(4)+C(6)+D(3)=17 [pp.48–49]. Got ${q.marks}.`,
        severity: 'major',
      });
    }
  }

  // Rule 5 — HL-only sub-topic checks [pp.21–22]
  if (q.subtopic_code && HL_ONLY_SUBTOPICS_IB_BM.has(q.subtopic_code)) {
    if (q.level === 'SL') {
      violations.push({
        rule:     'sl_hl_only_topic',
        message:  `Sub-topic ${q.subtopic_code} is HL-only — SL questions must not target it [pp.21–22]`,
        severity: 'major',
      });
    }
    if (q.paper === 'P1') {
      violations.push({
        rule:     'p1_no_hl_extension',
        message:  `P1 excludes HL extension material — sub-topic ${q.subtopic_code} is HL-only [p.41]`,
        severity: 'major',
      });
    }
  }

  // Rule 6 — P3 Q1 must frame around human need [p.47]
  // "AO1 questions — assesses students' ability to describe the human need in the stimulus material."
  if (q.paper === 'P3' && q.section === 'Q1' && q.question_text) {
    const HUMAN_NEED_RE = /\b(human|social|community|unmet)\s+need|\bneeds?\s+(that|of|for)\b/i;
    if (!HUMAN_NEED_RE.test(q.question_text)) {
      violations.push({
        rule:     'p3_q1_human_need',
        message:  'P3 Q1 must frame around human need [p.47] — question text lacks a human-need signal (e.g. "human need", "needs that", "needs of", "needs for")',
        severity: 'major',
      });
    }
  }

  // Rule 7 — State/Define command terms forbid calculation [p.67]
  // "State — Give a specific name, value or other brief answer without explanation or calculation."
  if (['state', 'define'].includes(term) && q.question_text) {
    const lower = q.question_text.toLowerCase();
    const ARITHMETIC_TRIGGERS = [
      'the current ratio', 'the acid test', 'the gross profit margin', 'the labour turnover',
      'the roce', 'the gearing ratio', 'the stock turnover', 'the debtor days',
      'the creditor days', 'the break-even', 'the npv', 'the arr', 'the payback',
      'calculate the',
    ];
    if (ARITHMETIC_TRIGGERS.some(t => lower.includes(t))) {
      violations.push({
        rule:     'state_define_calculate_mismatch',
        message:  `"${q.command_term}" forbids calculation [p.67: "without explanation or calculation"] — question text requires a ratio/metric calculation`,
        severity: 'major',
      });
    }
  }

  // Rule 8 — HL-only methods forbidden in SL question text [p.30]
  if (q.level === 'SL' && q.question_text) {
    const lower = q.question_text.toLowerCase();
    const hitMethod = HL_ONLY_METHOD_SIGNALS_IB_BM.find(m => lower.includes(m));
    if (hitMethod) {
      violations.push({
        rule:     'sl_hl_only_method',
        message:  `SL question references HL-only method "${hitMethod}" [p.30: NPV, efficiency ratios, depreciation methods, budgets/variances are HL only within their sub-topics]`,
        severity: 'major',
      });
    }
  }

  // Rule 9 — Command term AO must not exceed sub-topic max AO [pp.29–35]
  if (q.subtopic_code && MAX_AO_BY_SUBTOPIC_IB_BM[q.subtopic_code] && termAO && termAO !== 'AO4') {
    const maxAO    = MAX_AO_BY_SUBTOPIC_IB_BM[q.subtopic_code];
    const maxRank  = AO_RANK_IB_BM[maxAO]  ?? 0;
    const termRank = AO_RANK_IB_BM[termAO] ?? 0;
    if (termRank > maxRank) {
      violations.push({
        rule:     'subtopic_max_ao_exceeded',
        message:  `Sub-topic ${q.subtopic_code} max AO is ${maxAO} [pp.29–35] — "${q.command_term}" is ${termAO} which exceeds the cap`,
        severity: 'major',
      });
    }
  }

  return violations;
}

// Deterministic verdict — ALL correct → pass; ANY major fail → fail; else → borderline. [Rule 23]
// Throws if reasoning string implies pass but criteria contain a major fail (contradiction guard).
export function applyBMVerdict(result: VerificationResult): 'pass' | 'borderline' | 'fail' {
  const isMajorFail =
    result.syllabus_match   === 'out_of_syllabus' ||
    result.command_term_fit === 'inappropriate'   ||
    result.factual_accuracy === 'major_error';

  const isAllCorrect =
    result.syllabus_match   === 'in_syllabus' &&
    result.command_term_fit === 'correct'     &&
    result.ao_alignment     === 'correct'     &&
    result.paper_fit        === 'correct'     &&
    result.factual_accuracy === 'accurate';

  const computed: 'pass' | 'borderline' | 'fail' =
    isMajorFail ? 'fail' : isAllCorrect ? 'pass' : 'borderline';

  // Guard 1: reasoning implies pass but criteria contain a major fail → throw [Rule 23b]
  const reasoningImpliesPass = /\bpass(es|ed)?\b/i.test(result.reasoning);
  if (reasoningImpliesPass && isMajorFail) {
    throw new Error(
      `BM verdict contradiction: reasoning implies "pass" but criteria contain a major fail. ` +
      `syllabus=${result.syllabus_match} | term=${result.command_term_fit} | ` +
      `ao=${result.ao_alignment} | paper=${result.paper_fit} | fact=${result.factual_accuracy}`,
    );
  }

  // Guard 2: Claude submitted a different verdict than the deterministic recompute → audit log
  if (result.overall !== computed) {
    console.warn(
      `[applyBMVerdict] ${result.overall} → ${computed} reclassification: ` +
      `reasoning="${result.reasoning.slice(0, 120)}..."`,
    );
  }

  return computed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Framework registry
// ─────────────────────────────────────────────────────────────────────────────

const ASSESSMENT_FRAMEWORKS: Record<string, string> = {
  IB_ECONOMICS:           IB_ECONOMICS_ASSESSMENT_FRAMEWORK_V3,
  IB_BUSINESS:            IB_BUSINESS_ASSESSMENT_FRAMEWORK_V1,
  IB_BUSINESS_MANAGEMENT: IB_BM_V3,
};

const FRAMEWORK_VERSIONS: Record<string, string> = {
  IB_ECONOMICS:           'V3',
  IB_BUSINESS:            'V1',
  IB_BUSINESS_MANAGEMENT: 'IB_BM_2024',
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
DECISION RULE (deterministic — no exceptions): \
If syllabus_match='in_syllabus' AND command_term_fit='correct' AND ao_alignment='correct' \
AND paper_fit='correct' AND factual_accuracy='accurate', then overall MUST be 'pass'. \
If any criterion is 'out_of_syllabus', 'inappropriate', or 'major_error', overall MUST be 'fail'. \
Anything else is 'borderline'. \
Keep reasoning to 1–3 sentences.`,

  IB_BUSINESS: `You are a rigorous IB Business Management senior examiner and syllabus validator. \
Score each candidate question on five criteria using the assessment framework in the user message. \
Decision rule (enforce strictly): \
pass = every criterion is 'correct', 'accurate', or 'in_syllabus'; \
fail = any criterion is 'out_of_syllabus', 'inappropriate', or 'major_error'; \
borderline = anything else. \
Keep reasoning to 1–3 sentences.`,

  IB_BUSINESS_MANAGEMENT: `You are a rigorous IB Business Management senior examiner and syllabus validator (guide: IB_BM_2024). \
Score each candidate question on five criteria using the assessment framework in the user message. \
CRITICAL DRIFT RULES (enforce strictly — common training-data errors): \
(1) 'comment' is AO2 — NOT AO3. If 'comment' is tagged AO3 → ao_alignment='wrong_level'. \
(2) 'calculate' is AO4 — NOT AO2. If 'calculate' is tagged AO2 → ao_alignment='wrong_level'. \
(3) AO3 command terms are INVALID in P1 Section A and P2 Section A → paper_fit='wrong_paper'. \
(4) P3 Q3 must be exactly 17 marks (criteria A+B+C+D = 4+4+6+3). Any other value → command_term_fit='wrong_marks'. \
(5) HL-only sub-topics (2.5, 2.7, 3.6, 3.9, 4.3, 4.6, 5.3, 5.6, 5.7, 5.8, 5.9) cannot appear in SL questions. \
(6) P1 excludes HL extension material regardless of student level. \
(7) P3 Q1 human-need framing [p.47]: P3 Q1 is 2 marks AO1 and must describe a human need. If the question text lacks "human need", "social need", "community need", "needs that", "needs of", "needs for", or similar human-need language, set paper_fit='wrong_paper'. Guide: "AO1 questions — assesses students' ability to describe the human need in the stimulus material." \
(8) State/Define + calculation mismatch [p.67]: if command_term is 'state' or 'define' and the question asks for a ratio or metric calculation (e.g. "the current ratio", "the gross profit margin", "the NPV", "the ARR", "the gearing ratio", "the payback", "calculate the X"), set command_term_fit='wrong_depth'. Guide: "State — Give a specific name, value or other brief answer without explanation or calculation." \
(9) Sub-topic-internal HL-only methods [p.30]: if level=SL and the question text references NPV, net present value, stock turnover, debtor days, creditor days, gearing ratio, depreciation methods (straight-line, units of production), or variance analysis, set syllabus_match='out_of_syllabus'. These methods are HL only within their sub-topics even when the broader sub-topic is SL-accessible. \
(10) AO depth cap by sub-topic [pp.29–35]: Unit 5.4 Location → max AO3 (no AO4 calculation depth); Unit 1.4 Stakeholders → max AO2; Unit 2.6 Communication → max AO2. If the command term's AO exceeds the sub-topic cap, set ao_alignment='wrong_level'. \
(11) Stimulus internal consistency [practical quality bar]: if the stimulus contains internally inconsistent numerical definitions or contradictory information that would produce different valid answers from the same inputs (e.g. CPM stated as "$25 per 1,000 viewers" AND "$1,000 reaches 1,000 viewers" in the same stimulus), set factual_accuracy='major_error' and explain the contradiction in reasoning. \
DECISION RULE (deterministic — no exceptions): \
If syllabus_match='in_syllabus' AND command_term_fit='correct' AND ao_alignment='correct' \
AND paper_fit='correct' AND factual_accuracy='accurate', then overall MUST be 'pass'. \
If any criterion is 'out_of_syllabus', 'inappropriate', or 'major_error', overall MUST be 'fail'. \
Anything else is 'borderline'. Keep reasoning to 1–3 sentences.`,
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

  // Maps question_type string (e.g. 'P3_q1', 'p2_sec_a') to BMQuestionInput.section
  const sectionFromQuestionType = (qt: string): string | undefined => {
    const s = qt.toLowerCase();
    if (s.includes('q1'))                              return 'Q1';
    if (s.includes('q2'))                              return 'Q2';
    if (s.includes('q3'))                              return 'Q3';
    if (s.includes('sec_a') || s.includes('section_a')) return 'SEC_A';
    if (s.includes('sec_b') || s.includes('section_b')) return 'SEC_B';
    return undefined;
  };

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

    // Deterministic post-check for IB BM — injects keyword-rule findings into result
    // before applyBMVerdict, ensuring rules 6–9 are active in the live path.
    if (subjectArg === 'IB_BUSINESS_MANAGEMENT') {
      const detViolations = validateBMQuestion({
        command_term:   c.command_term,
        ao_level:       c.ao_level,
        paper:          c.paper,
        section:        sectionFromQuestionType(c.question_type),
        marks:          c.marks,
        level:          c.level,
        subtopic_code:  c.topic_code,
        question_text:  c.question_text,
      });
      if (detViolations.some(v => v.rule === 'p3_q1_human_need'))
        vr.result.paper_fit = 'wrong_paper';
      if (detViolations.some(v => v.rule === 'state_define_calculate_mismatch'))
        vr.result.command_term_fit = 'wrong_depth';
      if (detViolations.some(v => v.rule === 'sl_hl_only_method'))
        vr.result.syllabus_match = 'out_of_syllabus';
      if (detViolations.some(v => v.rule === 'subtopic_max_ao_exceeded'))
        vr.result.ao_alignment = 'wrong_level';
    }

    const { result, cacheReadTokens, cacheWriteTokens } = vr;
    const verdict = subjectArg === 'IB_BUSINESS_MANAGEMENT' ? applyBMVerdict(result) : result.overall;
    const cacheTag = cacheReadTokens > 0
      ? `cache hit (${cacheReadTokens.toLocaleString()} read)`
      : `cache miss (${cacheWriteTokens.toLocaleString()} written)`;

    console.log(`  ${VERDICT_ICON[verdict] ?? '?'} ${label} → ${verdict}  [${cacheTag}]`);
    console.log(`    ${result.reasoning}`);
    if (verdict !== 'pass') {
      console.log(`    criteria: syllabus=${result.syllabus_match} | term=${result.command_term_fit} | ao=${result.ao_alignment} | paper=${result.paper_fit} | fact=${result.factual_accuracy}`);
    }
    tallies[verdict]++;

    const { error: upErr } = await supabase
      .from('questions')
      .update({
        verification_status:           verdict,
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

const isMain = process.argv[1] &&
  (process.argv[1].includes('verify-seed-questions.ts') ||
   process.argv[1].includes('verify-seed-questions.js'));
if (isMain) main().catch(err => { console.error('Fatal:', err); process.exit(1); });
