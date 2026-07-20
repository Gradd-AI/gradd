#!/usr/bin/env tsx
/**
 * afm-framework.ts
 *
 * ACCA Advanced Financial Management (AFM) framework constants.
 * Source: docs/afm_s26_j27_syllabus_and_study_guide.pdf (© ACCA 2026-2027)
 * Guide edition: September 2026 to June 2027 (S26–J27).
 * Extraction date: 2026-07-08. Extracted from the official PDF via pdftotext -layout.
 * Structurally mirrors scripts/apm-framework.ts so downstream tooling ports unchanged.
 * Adversarially verified 08/07/2026 — section structure, all LO counts, intellectual
 * levels, and exam structure independently confirmed against the official PDF.
 *
 * EVERY item cites its guide page number (the page numbers printed in the PDF).
 * Where the guide is silent (e.g. Section G has no intellectual levels), the field is
 * null and the gap is noted, not filled.
 *
 * ⚠️ VERBATIM SCOPE (corrected 20/07/2026 — this header previously claimed "nothing here
 * is invented or inferred", which was not true of INTELLECTUAL_LEVELS). Blocks explicitly
 * marked "verbatim" ARE guide text: COMMAND_VERBS, PROFESSIONAL_SKILLS, EMPLOYABILITY_SKILLS,
 * EXAM_STRUCTURE, plus the SYLLABUS_MAP LO descriptors (list sub-items inlined — see below).
 * INTELLECTUAL_LEVELS is NOT verbatim: its em-dash tails are an editorial gloss found
 * nowhere in the guide (see the warning on that constant; use INTELLECTUAL_LEVEL_LABELS
 * when you need quotable text). LO descriptors are substance-verbatim but normalise the
 * guide's sub-item lists — guide 'i) The significance…' is stored as '(i) the significance…'.
 * Before quoting ANY string from this file as ACCA text, confirm it sits in a verbatim block.
 *
 * PAGE REFERENCES (guide's own page numbers):
 *   Main capabilities ....................... p.4
 *   Intellectual levels ..................... p.5
 *   Syllabus outline (section structure) .... p.6
 *   Detailed study guide — Section A ........ pp.7–9
 *   Detailed study guide — Section B ........ pp.9–11
 *   Detailed study guide — Section C ........ pp.11–12
 *   Detailed study guide — Section D ........ p.12
 *   Detailed study guide — Section E ........ pp.12–13
 *   Detailed study guide — Section F (prof.) . pp.13–14
 *   Detailed study guide — Section G (empl.) . p.14
 *   Approach to examining / exam structure .. Section A p.15, Section B p.16
 *   Pass mark (50%) ......................... p.17
 *
 * COUNTS: 80 technical learning outcomes across sections A–E (the SYLLABUS_MAP).
 *   A=29, B=25, C=15, D=5, E=6. Professional skills (F) held in PROFESSIONAL_SKILLS
 *   (13 sub-descriptors, all level 3). Employability (G) held in EMPLOYABILITY_SKILLS
 *   (4 items, no levels stated). Intellectual levels: 67 at L3, 13 at L2, 0 at L1.
 *   Learning-outcome mode (per-LO `mode` field): 21 quantitative, 6 mixed, 53 discursive
 *   (see QUANTITATIVE_LOS / MIXED_LOS / DISCURSIVE_LOS). 'mixed' = computation depends on
 *   whether the scenario supplies figures; drill generation must handle both directions.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Intellectual levels — ACCA standard framework definitions (guide p.5)
// Superscripts [2] and [3] in the study guide correspond to these levels.
// No [1]-level LOs appear in AFM (Strategic Professional — application minimum).
//
// ⚠️ NOT VERBATIM — DO NOT QUOTE THESE STRINGS AS STUDY-GUIDE TEXT (added 20/07/2026).
// The guide states ONLY the bare labels on p.5: 'Knowledge and comprehension',
// 'Application and analysis', 'Synthesis and evaluation'. Everything after the em-dash
// below is an EDITORIAL GLOSS written here — each tail phrase returns ZERO hits across
// all 21 pages of the S26–J27 guide. (Unlike PROFESSIONAL_SKILLS / EMPLOYABILITY_SKILLS /
// COMMAND_VERBS / EXAM_STRUCTURE, this block is not marked "verbatim" — that is the
// distinction to check before quoting anything out of this file.)
// A prior revision of docs/evidence/AFM_NARRATIVE_EVIDENCE.md §1a quoted the L2/L3 tails
// as guide-verbatim; corrected there 20/07/2026 (VERIFICATION LOG G1). If you need the
// quotable text, use the bare label only, or re-read guide p.5 (sources.json E6).
// ─────────────────────────────────────────────────────────────────────────────

export const INTELLECTUAL_LEVELS = {
  // label — <editorial gloss, NOT guide text>
  L1: 'Knowledge and comprehension — broadly equates with Applied Knowledge; not the primary level examined at AFM',
  L2: 'Application and analysis — apply concepts, perform calculations, analyse, advise on application of techniques',
  L3: 'Synthesis and evaluation — evaluate, recommend justified actions, assess trade-offs, exercise strategic judgement',
} as const;

/** The guide-verbatim level labels (guide p.5) — safe to quote. */
export const INTELLECTUAL_LEVEL_LABELS = {
  L1: 'Knowledge and comprehension',
  L2: 'Application and analysis',
  L3: 'Synthesis and evaluation',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section A — Role of the senior financial adviser in the multinational organisation
// Source: pp. 7–9 (detailed study guide); section named on p. 7.
// ─────────────────────────────────────────────────────────────────────────────

// A1 — The role and responsibility of senior financial executive/advisor (p.7)
const SECTION_A1_LOS = {
  A1a: { section: 'A' as const, sub_area: 'A1', topic: 'The role and responsibility of senior financial executive/advisor', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Develop strategies for the achievement of the organisational goals in line with its agreed policy framework.' },
  A1b: { section: 'A' as const, sub_area: 'A1', topic: 'The role and responsibility of senior financial executive/advisor', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Recommend strategies for the management of the financial resources of the organisation such that they are utilised in an efficient, effective and transparent way.' },
  A1c: { section: 'A' as const, sub_area: 'A1', topic: 'The role and responsibility of senior financial executive/advisor', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Advise the board of directors or management of the organisation in setting the financial goals of the business and in its financial policy development with particular reference to: (i) investment selection and capital resource allocation; (ii) minimising the cost of capital; (iii) distribution and retention policy; (iv) communicating financial policy and corporate goals to internal and external stakeholders; (v) financial planning and control; (vi) the management of risk.' },
};

// A2 — Financial strategy formulation (p.7)
const SECTION_A2_LOS = {
  A2a: { section: 'A' as const, sub_area: 'A2', topic: 'Financial strategy formulation', intellectual_level: 3 as const, mode: 'mixed' as const,
    descriptor: 'Assess organisational performance using methods such as ratios and trends.' },
  A2b: { section: 'A' as const, sub_area: 'A2', topic: 'Financial strategy formulation', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Recommend the optimum capital mix and structure within a specified business context and capital asset structure.' },
  A2c: { section: 'A' as const, sub_area: 'A2', topic: 'Financial strategy formulation', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Recommend appropriate distribution and retention policy.' },
  A2d: { section: 'A' as const, sub_area: 'A2', topic: 'Financial strategy formulation', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Explain the theoretical and practical rationale for the management of risk.' },
  A2e: { section: 'A' as const, sub_area: 'A2', topic: 'Financial strategy formulation', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess the organisation’s exposure to business and financial risk including operational, reputational, political, economic, regulatory and fiscal risk.' },
  A2f: { section: 'A' as const, sub_area: 'A2', topic: 'Financial strategy formulation', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Develop a framework for risk management, comparing and contrasting risk mitigation, hedging and diversification strategies.' },
  A2g: { section: 'A' as const, sub_area: 'A2', topic: 'Financial strategy formulation', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Establish capital investment monitoring and risk management systems.' },
  A2h: { section: 'A' as const, sub_area: 'A2', topic: 'Financial strategy formulation', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Advise on the impact of behavioural finance on financial strategies / securities prices and why they may not follow the conventional financial theories.' },
};

// A3 — Corporate environmental, social, governance (ESG) and ethical issues (pp.7–8)
const SECTION_A3_LOS = {
  A3a: { section: 'A' as const, sub_area: 'A3', topic: 'Corporate environmental, social, governance (ESG) and ethical issues', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess an organisation’s commitment to ESG criteria when undertaking business, financial and investment decisions, and discuss and recommend how conflicts between the criteria may be resolved.' },
  A3b: { section: 'A' as const, sub_area: 'A3', topic: 'Corporate environmental, social, governance (ESG) and ethical issues', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess the impact on the physical environment and the sustainability of natural resources arising from alternative organisational business, financial and investment decisions.' },
  A3c: { section: 'A' as const, sub_area: 'A3', topic: 'Corporate environmental, social, governance (ESG) and ethical issues', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Examine how the organisation manages its stakeholder groups as part of its social responsibilities.' },
  A3d: { section: 'A' as const, sub_area: 'A3', topic: 'Corporate environmental, social, governance (ESG) and ethical issues', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess and advise on the impact of investment and financing strategies and decisions on the organisation’s stakeholders.' },
  A3e: { section: 'A' as const, sub_area: 'A3', topic: 'Corporate environmental, social, governance (ESG) and ethical issues', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Explore the areas within the ethical and governance framework of the organisation which may be undermined by agency issues and/or stakeholder conflicts and establish strategies for dealing with them.' },
  A3f: { section: 'A' as const, sub_area: 'A3', topic: 'Corporate environmental, social, governance (ESG) and ethical issues', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Recommend appropriate strategies for the resolution of stakeholder conflict in specific situations and advise on alternative approaches that may be adopted.' },
  A3g: { section: 'A' as const, sub_area: 'A3', topic: 'Corporate environmental, social, governance (ESG) and ethical issues', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess the impact of ethical and governance issues on the financial management of the organisation.' },
  A3h: { section: 'A' as const, sub_area: 'A3', topic: 'Corporate environmental, social, governance (ESG) and ethical issues', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Recommend an ethical and governance framework for the development of an organisation’s financial management policies, which is grounded in the highest standards of probity and is fully aligned with the ethical principles of the Association.' },
};

// A4 — Management of international trade and finance (p.8)
const SECTION_A4_LOS = {
  A4a: { section: 'A' as const, sub_area: 'A4', topic: 'Management of international trade and finance', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Advise on the theory and practice of free trade and the management of barriers to trade.' },
  A4b: { section: 'A' as const, sub_area: 'A4', topic: 'Management of international trade and finance', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Demonstrate an up to date understanding of the major trade agreements and common markets and, on the basis of contemporary circumstances, advise on their policies and strategic implications for a given business.' },
  A4c: { section: 'A' as const, sub_area: 'A4', topic: 'Management of international trade and finance', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Discuss how the actions of the World Trade Organisation, the International Monetary Fund, The World Bank and Central Banks can affect a multinational organisation.' },
  A4d: { section: 'A' as const, sub_area: 'A4', topic: 'Management of international trade and finance', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the role of international financial institutions within the context of a globalised economy, with particular attention to (the Fed, Bank of England, European Central Bank and the Bank of Japan).' },
  A4e: { section: 'A' as const, sub_area: 'A4', topic: 'Management of international trade and finance', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the role of the international financial markets with respect to the management of global debt, the financial development of the emerging economies and the maintenance of global financial stability.' },
  A4f: { section: 'A' as const, sub_area: 'A4', topic: 'Management of international trade and finance', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the significance to the organisation, of latest developments in the world financial markets such as the causes and impact of the recent financial crisis; growth and impact of dark pool trading systems; the removal of barriers to the free movement of capital; and the international regulations on money laundering.' },
  A4g: { section: 'A' as const, sub_area: 'A4', topic: 'Management of international trade and finance', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Demonstrate an awareness of new developments in the macroeconomic environment, assessing their impact upon the organisation, and advising on the appropriate response to those developments both internally and externally.' },
};

// A5 — Strategic business and financial planning for multinationals (p.8)
const SECTION_A5_LOS = {
  A5a: { section: 'A' as const, sub_area: 'A5', topic: 'Strategic business and financial planning for multinationals', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Advise on the development of a financial planning framework for a multinational organisation taking into account: (i) compliance with national regulatory requirements (for example the London Stock Exchange admission requirements); (ii) the mobility of capital across borders and national limitations on remittances and transfer pricing; (iii) the pattern of economic and other risk exposures in the different national markets; (iv) agency issues in the central coordination of overseas operations and the balancing of local financial autonomy with effective central control.' },
};

// A6 — Dividend policy in multinationals and transfer pricing (pp.8–9)
const SECTION_A6_LOS = {
  A6a: { section: 'A' as const, sub_area: 'A6', topic: 'Dividend policy in multinationals and transfer pricing', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Determine a corporation’s dividend capacity and its policy given: (i) the corporation’s short- and long-term reinvestment strategy; (ii) the impact of capital reconstruction programmes such as share repurchase agreements and new capital issues on free cash flow to equity; (iii) the availability and timing of central remittances; (iv) the corporate tax regime within the host jurisdiction; (v) the organisational policy on the transfer pricing of goods and services across international borders.' },
  A6b: { section: 'A' as const, sub_area: 'A6', topic: 'Dividend policy in multinationals and transfer pricing', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Advise, in the context of a specified capital investment programme, on an organisation’s current and projected dividend capacity.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section B — Advanced investment appraisal
// Source: pp. 9–11 (detailed study guide); section named on p. 9.
// ─────────────────────────────────────────────────────────────────────────────

// B1 — Discounted cash flow techniques (p.9)
const SECTION_B1_LOS = {
  B1a: { section: 'B' as const, sub_area: 'B1', topic: 'Discounted cash flow techniques', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Evaluate the potential value added to an organisation arising from a specified capital investment project or portfolio using the net present value (NPV) model. Project modelling should include explicit treatment and discussion of: (i) inflation and specific price variation; (ii) taxation including tax allowable depreciation and tax exhaustion; (iii) capital rationing (multi-period capital rationing limited to discussion only); (iv) probability analysis and sensitivity analysis when adjusting for risk and uncertainty in investment appraisal; (v) risk adjusted discount rates; (vi) project duration as a measure of risk.' },
  B1b: { section: 'B' as const, sub_area: 'B1', topic: 'Discounted cash flow techniques', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Outline the application of Monte Carlo simulation to investment appraisal. Candidates will not be expected to undertake simulations in an examination context but will be expected to demonstrate an understanding of: (i) the significance of the simulation output and the assessment of the likelihood of project success; (ii) the measurement and interpretation of project value at risk.' },
  B1c: { section: 'B' as const, sub_area: 'B1', topic: 'Discounted cash flow techniques', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Establish the potential economic return (using internal rate of return (IRR) and modified internal rate of return) and advise on a project’s return margin. Discuss the relative merits of NPV and IRR.' },
};

// B2 — Application of option pricing theory in investment decisions (p.9)
const SECTION_B2_LOS = {
  B2a: { section: 'B' as const, sub_area: 'B2', topic: 'Application of option pricing theory in investment decisions', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Apply the Black-Scholes Option Pricing (BSOP) model to financial product valuation and to asset valuation: (i) determine and discuss, using published data, the five principal drivers of option value (value of the underlying, exercise price, time to expiry, volatility and the risk-free rate); (ii) discuss the underlying assumptions, structure, application and limitations of the BSOP model.' },
  B2b: { section: 'B' as const, sub_area: 'B2', topic: 'Application of option pricing theory in investment decisions', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Evaluate embedded real options within a project, classifying them into one of the real option archetypes.' },
  B2c: { section: 'B' as const, sub_area: 'B2', topic: 'Application of option pricing theory in investment decisions', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Assess, calculate and advise on the value of options to delay, expand, redeploy and withdraw using the BSOP model.' },
};

// B3 — Impact of financing on investment decisions and adjusted present values (pp.9–10)
const SECTION_B3_LOS = {
  B3a: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Identify and assess the appropriateness of the range of sources of finance available to an organisation including equity, debt, hybrids, lease finance, venture capital, business angel finance, private equity, asset securitisation and sale, Islamic finance and security token offerings. Including assessment on the financial position, financial risk and the value of an organisation.' },
  B3b: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the role of, and developments in, Islamic financing as a growing source of finance for organisations; explaining the rationale for its use, and identifying its benefits and deficiencies.' },
  B3c: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the role of green finance for organisations pursuing an environmental/sustainable agenda.' },
  B3d: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Calculate the cost of capital of an organisation, including the cost of equity and cost of debt, based on the range of equity and debt sources of finance. Discuss the appropriateness of using the cost of capital to establish project and organisational value, and discuss its relationship to such value.' },
  B3e: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Calculate and evaluate project specific cost of equity and cost of capital, including their impact on the overall cost of capital of an organisation. Demonstrate detailed knowledge of business and financial risk, the capital asset pricing model and the relationship between equity and asset betas.' },
  B3f: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Assess an organisation’s debt exposure to interest rate changes using the simple Macaulay duration and modified duration methods.' },
  B3g: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the benefits and limitations of duration including the impact of convexity.' },
  B3h: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Assess the organisation’s exposure to credit risk, including: (i) explain the role of, and the risk assessment models used by the principal rating agencies; (ii) estimate the likely credit spread over risk free; (iii) estimate the organisation’s current cost of debt capital using the appropriate term structure of interest rates and the credit spread.' },
  B3i: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess the impact of financing and capital structure upon the organisation with respect to: (i) Modigliani and Miller propositions, before and after tax; (ii) static trade-off theory; (iii) pecking order propositions; (iv) agency effects.' },
  B3j: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Apply the adjusted present value technique to the appraisal of investment decisions that entail significant alterations in the financial structure of the organisation, including their fiscal and transactions cost implications.' },
  B3k: { section: 'B' as const, sub_area: 'B3', topic: 'Impact of financing on investment decisions and adjusted present values', intellectual_level: 3 as const, mode: 'mixed' as const,
    descriptor: 'Assess the impact of a significant capital investment project upon the reported financial position and performance of the organisation taking into account alternative financing strategies.' },
};

// B4 — Valuation and the use of free cash flows (p.10)
const SECTION_B4_LOS = {
  B4a: { section: 'B' as const, sub_area: 'B4', topic: 'Valuation and the use of free cash flows', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Apply asset based, income based and cash flow based models to value equity. Apply appropriate models, including term structure of interest rates, the yield curve and credit spreads, to value corporate debt.' },
  B4b: { section: 'B' as const, sub_area: 'B4', topic: 'Valuation and the use of free cash flows', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Forecast an organisation’s free cash flow and its free cash flow to equity (pre and post capital reinvestment).' },
  B4c: { section: 'B' as const, sub_area: 'B4', topic: 'Valuation and the use of free cash flows', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Advise on the value of an organisation using its free cash flow and free cash flow to equity under alternative horizon and growth assumptions.' },
  B4d: { section: 'B' as const, sub_area: 'B4', topic: 'Valuation and the use of free cash flows', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Explain the role of option pricing models, such as the BSOP model, in the assessment of the value of equity, the value of debt and of default risk.' },
};

// B5 — International investment and financing decisions (pp.10–11)
const SECTION_B5_LOS = {
  B5a: { section: 'B' as const, sub_area: 'B5', topic: 'International investment and financing decisions', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Assess the impact upon the value of a project of alternative exchange rate assumptions.' },
  B5b: { section: 'B' as const, sub_area: 'B5', topic: 'International investment and financing decisions', intellectual_level: 2 as const, mode: 'quantitative' as const,
    descriptor: 'Forecast project or organisation free cash flows in any specified currency and determine the project’s net present value or organisation value under differing exchange rate, fiscal and transaction cost assumptions.' },
  B5c: { section: 'B' as const, sub_area: 'B5', topic: 'International investment and financing decisions', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Evaluate the significance of exchange controls for a given investment decision and strategies for dealing with restricted remittance.' },
  B5d: { section: 'B' as const, sub_area: 'B5', topic: 'International investment and financing decisions', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess and advise on the costs and benefits of alternative sources of finance available within the international equity and bond markets.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section C — Acquisitions and mergers
// Source: pp. 11–12 (detailed study guide); section named on p. 11.
// ─────────────────────────────────────────────────────────────────────────────

// C1 — Acquisitions and mergers versus other growth strategies (p.11)
const SECTION_C1_LOS = {
  C1a: { section: 'C' as const, sub_area: 'C1', topic: 'Acquisitions and mergers versus other growth strategies', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the arguments for and against the use of acquisitions and mergers as a method of corporate expansion.' },
  C1b: { section: 'C' as const, sub_area: 'C1', topic: 'Acquisitions and mergers versus other growth strategies', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Evaluate the corporate and competitive nature of a given acquisition proposal.' },
  C1c: { section: 'C' as const, sub_area: 'C1', topic: 'Acquisitions and mergers versus other growth strategies', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Advise upon the criteria for choosing an appropriate target for acquisition.' },
  C1d: { section: 'C' as const, sub_area: 'C1', topic: 'Acquisitions and mergers versus other growth strategies', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the reasons for the frequent failure of acquisitions to enhance shareholder value as expected, including the problem of overvaluation.' },
  C1e: { section: 'C' as const, sub_area: 'C1', topic: 'Acquisitions and mergers versus other growth strategies', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Evaluate, from a given context, the potential for synergy separately classified as: (i) revenue synergy; (ii) cost synergy; (iii) financial synergy.' },
  C1f: { section: 'C' as const, sub_area: 'C1', topic: 'Acquisitions and mergers versus other growth strategies', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Evaluate the use of alternative methods as a way of obtaining a stock market listing; including special purpose acquisition companies (SPACs), direct listings, dutch auctions and reverse takeovers.' },
};

// C2 — Valuation for acquisitions and mergers (p.11)
const SECTION_C2_LOS = {
  C2a: { section: 'C' as const, sub_area: 'C2', topic: 'Valuation for acquisitions and mergers', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Estimate the potential near-term and continuing growth levels of a corporation’s earnings using both internal and external measures.' },
  C2b: { section: 'C' as const, sub_area: 'C2', topic: 'Valuation for acquisitions and mergers', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Discuss, assess and advise on the value created from an acquisition or merger of both quoted and unquoted entities using models such as: (i) ‘Book value-plus’ models; (ii) market based models; (iii) cash flow models, including free cash flows. Taking into account the changes in the risk profile and risk exposure of the acquirer and the target entities.' },
  C2c: { section: 'C' as const, sub_area: 'C2', topic: 'Valuation for acquisitions and mergers', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Apply appropriate methods, such as: risk-adjusted cost of capital, adjusted net present values and changing price-earnings multipliers resulting from the acquisition or merger, to the valuation process where appropriate.' },
  C2d: { section: 'C' as const, sub_area: 'C2', topic: 'Valuation for acquisitions and mergers', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Demonstrate an understanding of the procedure for valuing high growth start-ups and loss making companies.' },
};

// C3 — Regulatory framework and processes (p.11)
const SECTION_C3_LOS = {
  C3a: { section: 'C' as const, sub_area: 'C3', topic: 'Regulatory framework and processes', intellectual_level: 2 as const, mode: 'discursive' as const,
    descriptor: 'Demonstrate an understanding of the principal factors influencing the development of the regulatory framework for mergers and acquisitions globally and, in particular, be able to compare and contrast the shareholder versus the stakeholder models of regulation.' },
  C3b: { section: 'C' as const, sub_area: 'C3', topic: 'Regulatory framework and processes', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Identify the main regulatory issues which are likely to arise in the context of a given offer and (i) assess whether the offer is likely to be in the shareholders’ best interests; (ii) advise the directors of a target entity on the most appropriate defence if a specific offer is to be treated as hostile.' },
};

// C4 — Financing acquisitions and mergers (p.12)
const SECTION_C4_LOS = {
  C4a: { section: 'C' as const, sub_area: 'C4', topic: 'Financing acquisitions and mergers', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Compare the various sources of financing available for a proposed cash-based acquisition.' },
  C4b: { section: 'C' as const, sub_area: 'C4', topic: 'Financing acquisitions and mergers', intellectual_level: 3 as const, mode: 'mixed' as const,
    descriptor: 'Evaluate the advantages and disadvantages of a financial offer for a given acquisition proposal using pure or mixed mode financing and recommend the most appropriate offer to be made.' },
  C4c: { section: 'C' as const, sub_area: 'C4', topic: 'Financing acquisitions and mergers', intellectual_level: 3 as const, mode: 'mixed' as const,
    descriptor: 'Assess the impact of a given financial offer on the reported financial position and performance of the acquirer.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section D — Corporate reconstruction and re-organisation
// Source: p. 12 (detailed study guide); section named on p. 12.
// ─────────────────────────────────────────────────────────────────────────────

// D1 — Financial reconstruction (p.12)
const SECTION_D1_LOS = {
  D1a: { section: 'D' as const, sub_area: 'D1', topic: 'Financial reconstruction', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess an organisational situation and determine whether a financial reconstruction is an appropriate strategy for a given business situation.' },
  D1b: { section: 'D' as const, sub_area: 'D1', topic: 'Financial reconstruction', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess the likely response of the capital market and/or individual suppliers of capital to any reconstruction scheme and the impact their response is likely to have upon the value of the organisation.' },
};

// D2 — Business re-organisation (p.12)
const SECTION_D2_LOS = {
  D2a: { section: 'D' as const, sub_area: 'D2', topic: 'Business re-organisation', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Recommend, with reasons, strategies for unbundling parts of a quoted company.' },
  D2b: { section: 'D' as const, sub_area: 'D2', topic: 'Business re-organisation', intellectual_level: 3 as const, mode: 'mixed' as const,
    descriptor: 'Evaluate the likely financial and other benefits of unbundling.' },
  D2c: { section: 'D' as const, sub_area: 'D2', topic: 'Business re-organisation', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Advise on the financial issues relating to a management buy-out and buy-in.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section E — Treasury and advanced risk management techniques  (TECHNICAL section;
// professional skills are Section F in AFM — do NOT confuse with APM, where the
// professional-skills section is E). Source: pp. 12–13; section named on p. 12.
// ─────────────────────────────────────────────────────────────────────────────

// E1 — The role of the treasury function in multinationals (p.12)
const SECTION_E1_LOS = {
  E1a: { section: 'E' as const, sub_area: 'E1', topic: 'The role of the treasury function in multinationals', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the role of the treasury management function within: (i) the short term management of the organisation’s financial resources; (ii) the longer term maximisation of corporate value; (iii) the management of risk exposure.' },
  E1b: { section: 'E' as const, sub_area: 'E1', topic: 'The role of the treasury function in multinationals', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Discuss the operations of the derivatives market, including: (i) the relative advantages and disadvantages of exchange traded versus OTC agreements; (ii) key features, such as standard contracts, tick sizes, margin requirements and margin trading; (iii) the source of basis risk and how it can be minimised; (iv) risks such as delta, gamma and theta, and how these can be managed.' },
};

// E2 — The use of financial derivatives to hedge against forex risk (p.12)
const SECTION_E2_LOS = {
  E2a: { section: 'E' as const, sub_area: 'E2', topic: 'The use of financial derivatives to hedge against forex risk', intellectual_level: 3 as const, mode: 'discursive' as const,
    descriptor: 'Assess the impact on an organisation to exposure in translation, transaction and economic risks and how these can be managed.' },
  E2b: { section: 'E' as const, sub_area: 'E2', topic: 'The use of financial derivatives to hedge against forex risk', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Evaluate, for a given hedging requirement, which of the following is the most appropriate strategy, given the nature of the underlying position and the risk exposure: (i) the use of the forward exchange market and the creation of a money market hedge; (ii) synthetic foreign exchange agreements (SAFEs); (iii) exchange-traded currency futures contracts; (iv) currency swaps; (v) FOREX swaps; (vi) currency options.' },
  E2c: { section: 'E' as const, sub_area: 'E2', topic: 'The use of financial derivatives to hedge against forex risk', intellectual_level: 3 as const, mode: 'mixed' as const,
    descriptor: 'Advise on the use of bilateral and multilateral netting and matching as tools for minimising FOREX transactions costs and the management of market barriers to the free movement of capital and other remittances.' },
};

// E3 — The use of financial derivatives to hedge against interest rate risk (p.13)
const SECTION_E3_LOS = {
  E3a: { section: 'E' as const, sub_area: 'E3', topic: 'The use of financial derivatives to hedge against interest rate risk', intellectual_level: 3 as const, mode: 'quantitative' as const,
    descriptor: 'Evaluate, for a given hedging requirement, which of the following is the most appropriate given the nature of the underlying position and the risk exposure: (i) Forward Rate Agreements (FRAs); (ii) interest rate futures; (iii) interest rate swaps; (iv) interest rate options (including collars).' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Master syllabus map — 80 technical learning outcomes across sections A–E.
// A=29, B=25, C=15, D=5, E=6.  (Professional skills = Section F, held separately in
// PROFESSIONAL_SKILLS; employability = Section G, held in EMPLOYABILITY_SKILLS.)
// ─────────────────────────────────────────────────────────────────────────────

export const SYLLABUS_MAP = {
  ...SECTION_A1_LOS, ...SECTION_A2_LOS, ...SECTION_A3_LOS, ...SECTION_A4_LOS, ...SECTION_A5_LOS, ...SECTION_A6_LOS,
  ...SECTION_B1_LOS, ...SECTION_B2_LOS, ...SECTION_B3_LOS, ...SECTION_B4_LOS, ...SECTION_B5_LOS,
  ...SECTION_C1_LOS, ...SECTION_C2_LOS, ...SECTION_C3_LOS, ...SECTION_C4_LOS,
  ...SECTION_D1_LOS, ...SECTION_D2_LOS,
  ...SECTION_E1_LOS, ...SECTION_E2_LOS, ...SECTION_E3_LOS,
} as const;

export type LoCode = keyof typeof SYLLABUS_MAP;

// Three-state calculation tag (adversarial-verification ruling, 08/07/2026):
//   'quantitative' — computation is intrinsic; always routes through numeric verification.
//   'mixed'        — computation only if the scenario supplies figures; generator must
//                    handle both a numeric and a purely-narrative construction.
//   'discursive'   — judgement/narrative-led; no numeric verification.
export type LoMode = 'quantitative' | 'mixed' | 'discursive';

// ─────────────────────────────────────────────────────────────────────────────
// Section names (guide pp. 6–7). SOURCE WORDING DRIFT: the p.7 detailed-guide header
// wording is CANONICAL — "Role of the senior financial adviser in the multinational
// organisation" — and is used here. The p.6 syllabus outline omits "the" ("Role of
// senior financial adviser..."). This drift exists in the source PDF, not the extraction.
// ─────────────────────────────────────────────────────────────────────────────

export const SECTIONS = {
  A: 'Role of the senior financial adviser in the multinational organisation',
  B: 'Advanced investment appraisal',
  C: 'Acquisitions and mergers',
  D: 'Corporate reconstruction and re-organisation',
  E: 'Treasury and advanced risk management techniques',
  F: 'Professional skills',
  G: 'Employability and technology skills',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Command verbs — extracted verbatim from LO descriptors (guide pp. 7–13).
// levels[] reflects which intellectual levels the verb appears at across AFM LOs.
// ─────────────────────────────────────────────────────────────────────────────

export const COMMAND_VERBS: Record<string, { levels: (2 | 3)[]; typical_use: string }> = {
  advise:                     { levels: [3],    typical_use: 'Recommend a course of action with strategic judgement — L3 in AFM' },
  assess:                     { levels: [2, 3], typical_use: 'Make a judgement about significance or appropriateness' },
  calculate:                  { levels: [3],    typical_use: 'Numerical computation with interpretation — always quantitative' },
  'calculate and evaluate':   { levels: [3],    typical_use: 'Compute AND judge appropriateness — quantitative (B3e)' },
  determine:                  { levels: [3],    typical_use: 'Establish a value/figure by computation (e.g. dividend capacity, NPV)' },
  estimate:                   { levels: [3],    typical_use: 'Compute an approximate value from data (growth, credit spread)' },
  forecast:                   { levels: [2, 3], typical_use: 'Project future cash flows / values — quantitative' },
  evaluate:                   { levels: [3],    typical_use: 'Weigh strengths and limitations; select the most appropriate — core L3 verb' },
  apply:                      { levels: [3],    typical_use: 'Use a technique/model (NPV, APV, BSOP, valuation) in context — L3' },
  recommend:                  { levels: [3],    typical_use: 'Propose a justified course of action' },
  discuss:                    { levels: [2, 3], typical_use: 'Present reasoned narrative on an issue — often L2 when knowledge-led' },
  explain:                    { levels: [2, 3], typical_use: 'Describe mechanism or rationale' },
  examine:                    { levels: [3],    typical_use: 'Investigate in detail (A3c)' },
  explore:                    { levels: [3],    typical_use: 'Investigate underlying reasons with an enquiring mind' },
  develop:                    { levels: [3],    typical_use: 'Build a strategy or framework' },
  establish:                  { levels: [3],    typical_use: 'Put in place / compute an economic return or system' },
  identify:                   { levels: [3],    typical_use: 'Select the relevant items from a scenario' },
  compare:                    { levels: [3],    typical_use: 'Account of similarities and differences' },
  demonstrate:                { levels: [2, 3], typical_use: 'Show understanding/awareness — often L2 (understanding of a procedure)' },
  outline:                    { levels: [2],    typical_use: 'Give the main features (Monte Carlo — discussion only, L2)' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Professional skills — Section F (verbatim, guide pp. 13–14). All sub-descriptors
// are marked intellectual level [3]. Section A examines ALL FOUR; Section B examines
// a minimum of two from {analysis_and_evaluation, scepticism, commercial_acumen}
// (see EXAM_STRUCTURE). Held separately from SYLLABUS_MAP, mirroring apm-framework.ts.
// SOURCE TYPO: the p.13 detailed guide mislabels "Commercial acumen" as sub-area "3"
// (Scepticism is also numbered "3" there — a PDF typo); the p.6 outline correctly
// numbers Commercial acumen 4. Encoded here as the fourth professional skill per the outline.
// ─────────────────────────────────────────────────────────────────────────────

export const PROFESSIONAL_SKILLS = {
  communication: {
    label: 'Communication',
    intellectual_level: 3 as const,
    sub_descriptors: [
      'Inform concisely, objectively and unambiguously, adopting a suitable style and format, using appropriate technology.',
      'Persuade using compelling and logical arguments, demonstrating the ability to counter argue where appropriate.',
      'Clarify and simplify complex issues to convey relevant information in a way that adopts an appropriate tone and is easily understood by and reflects the requirements of the intended audience.',
    ],
  },
  analysis_and_evaluation: {
    label: 'Analysis and evaluation',
    intellectual_level: 3 as const,
    sub_descriptors: [
      'Investigate relevant information from a range of sources, using appropriate analytical techniques to estimate outcomes, assist in decision-making and to identify opportunities or solutions.',
      'Consider information, evidence and findings carefully, reflecting on their implications and how they can be used in the interests of the wider organisational goals.',
      'Assess and apply appropriate judgement when considering organisational issues, problems or when making financial management decisions; taking into account the implications of such decisions on the organisation and those affected.',
      'Appraise information objectively with a view to balancing the costs, risks, benefits and opportunities, before recommending appropriate solutions or decisions.',
    ],
  },
  scepticism: {
    label: 'Scepticism',
    intellectual_level: 3 as const,
    sub_descriptors: [
      'Explore the underlying reasons for a given situation, applying the attitude of an enquiring mind, beyond what is immediately apparent.',
      'Question opinions, assertions and assumptions, by seeking justifications and obtaining sufficient evidence for either their support and acceptance or rejection.',
      'Challenge and critically assess the information presented or decisions made, where this is clearly justified, in the wider professional, ethical, organisational, or public interest.',
    ],
  },
  commercial_acumen: {
    label: 'Commercial acumen',
    intellectual_level: 3 as const,
    sub_descriptors: [
      'Demonstrate awareness of organisational and external factors, which will affect the financial management decisions of an organisation.',
      'Recognise key issues in a given scenario and use judgement in proposing and recommending commercially viable solutions.',
      'Show insight and perception in understanding financial issues and wider organisational matters, demonstrating acumen in arriving at appropriate recommendations.',
    ],
  },
} as const;

export type ProfessionalSkillTag = keyof typeof PROFESSIONAL_SKILLS;

// ─────────────────────────────────────────────────────────────────────────────
// Employability and technology skills — Section G (verbatim, guide p. 14).
// The guide states these as four numbered skills with NO lettered sub-outcomes and
// NO intellectual-level superscripts, so no level is recorded (see AMBIGUITIES note
// in the extraction report). Held separately, not in SYLLABUS_MAP.
// ─────────────────────────────────────────────────────────────────────────────

export const EMPLOYABILITY_SKILLS: readonly string[] = [
  'Use computer technology to efficiently access and manipulate relevant information.',
  'Work on relevant response options, using available functions and technology, as would be required in the workplace.',
  'Navigate windows and computer screens to create and amend responses to exam requirements, using the appropriate tools.',
  'Present data and information effectively, using the appropriate tools.',
];

// ─────────────────────────────────────────────────────────────────────────────
// Learning-outcome mode sets — derived from the per-LO `mode` field, for routing when
// drill generation starts. 'quantitative' → numeric-verification layer; 'mixed' → the
// generator must handle both directions (computation only when the scenario supplies
// figures); 'discursive' → narrative only. 21 quantitative, 6 mixed, 53 discursive.
// ─────────────────────────────────────────────────────────────────────────────

const losWithMode = (m: LoMode): ReadonlySet<LoCode> =>
  new Set((Object.keys(SYLLABUS_MAP) as LoCode[]).filter((code) => SYLLABUS_MAP[code].mode === m));

export const QUANTITATIVE_LOS: ReadonlySet<LoCode> = losWithMode('quantitative');
export const MIXED_LOS: ReadonlySet<LoCode> = losWithMode('mixed');
export const DISCURSIVE_LOS: ReadonlySet<LoCode> = losWithMode('discursive');

// ─────────────────────────────────────────────────────────────────────────────
// Exam structure — verbatim from the guide (Section A p.15, Section B p.16, pass
// mark p.17). VERIFIED AGAINST THE GUIDE — AFM does NOT use APM's one-from-C /
// one-from-D Section B construction. Instead: all topics/sections are examinable in
// either A or B, but EVERY exam will have question(s) focused on sections B and E.
// ─────────────────────────────────────────────────────────────────────────────

export const EXAM_STRUCTURE = {
  duration_minutes:     195,        // three hours 15 minutes (p.15)
  total_marks:          100,        // (p.16)
  pass_mark_percent:    50,         // pass mark for all ACCA Qualification exams (p.17)
  section_a: {
    marks_total:                  50,
    marks_technical:              40,
    marks_professional_skills:    10,
    format:                       'case_study' as const,   // single 50-mark case study (p.15)
    professional_skills_examined: 'all_four' as const,     // "All of the professional skills will be examined in Section A"
    // "the case study focus on a range of issues from at least two syllabus sections from A - E"
    syllabus_source:              'at_least_two_of_A_to_E' as const,
    response_format:              'specified (e.g. a report to the Board of Directors)',
    description: 'Section A will always be a single 50-mark case study. Candidates are expected to undertake calculations, draw comparison against relevant information where appropriate, analyse the results and offer recommendations or conclusions as required.',
  },
  section_b: {
    question_count:                        2,
    marks_per_question_total:              25,
    marks_per_question_technical:          20,
    marks_per_question_professional_skills: 5,
    format:                                'scenario' as const,   // scenario based (p.16)
    // "All section B questions will be scenario based and contain a combination of
    // calculation and narrative marks. There will not be any wholly narrative questions."
    calculation_and_narrative:             true,
    no_wholly_narrative_questions:         true,
    professional_skills_minimum_per_q:     2 as const,
    professional_skills_pool:              ['analysis_and_evaluation', 'scepticism', 'commercial_acumen'] as const,
  },
  // Guide p.16: "All topics and syllabus sections will be examinable in either
  // section A or section B of the exam, but every exam will have question(s) which
  // have a focus on syllabus sections B and E." (NOT a fixed one-section-per-question
  // rule like APM's C/D split.)
  guaranteed_focus_sections: ['B', 'E'] as const,
  professional_skills_behaviours: ['communication', 'analysis_and_evaluation', 'scepticism', 'commercial_acumen'] as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DrillSpec — type for a single AFM practice item (mirrors apm-framework.ts).
// `mode` replaces APM's `calculation_required` flag semantics (three-state).
// ─────────────────────────────────────────────────────────────────────────────

export interface DrillSpec {
  lo_code:               LoCode;
  topic:                 string;
  command_verb:          string;
  intellectual_level:    2 | 3;
  professional_skill_tag?: ProfessionalSkillTag;
  mode:                  LoMode;    // 'quantitative' | 'mixed' | 'discursive' → numeric-verification routing
  marks_guide:           number;    // suggested mark allocation for this drill
}
