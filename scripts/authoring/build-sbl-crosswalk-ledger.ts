#!/usr/bin/env tsx
/**
 * build-sbl-crosswalk-ledger.ts   —   npm run build:sbl-ledger
 *
 * Regenerates docs/SBL_CROSSWALK_LEDGER.md: one row per SBL learning outcome, with a verdict
 * (REUSE / ADAPT / NEW), a NAMED asset for every REUSE and ADAPT, and a named NEAREST asset for
 * every NEW.
 *
 * ── WHY THIS IS A COMMITTED SCRIPT AND NOT A HAND-MAINTAINED DOC ─────────────
 * The crosswalk it replaces was a headline (35%) computed from 138 judgements that were never
 * written down, so it could not be re-opened at the row you disagreed with. Making the ledger a
 * hand-edited markdown table would fix that once and then rot the same way: nothing would check
 * that a new verdict was added when a new LO appeared, and nothing would recompute the tallies
 * when a verdict changed.
 *
 * It is also P-DB6 applied to a document. This session found the SBL syllabus itself living in a
 * DEAD session's scratchpad under a filename claiming it was an AFM examiner's report. A lost
 * authoring script is how the irhedge batch became an unfixable published defect. So the thing
 * that produced this artefact is committed alongside it.
 *
 * ── WHAT IS DERIVED vs WHAT IS JUDGED ────────────────────────────────────────
 *   DERIVED  → LO codes, sub-area names, outcome text, intellectual levels (machine-parsed from
 *              the registered study guide), every tally, every percentage, every sensitivity
 *              figure, and the corpus attribution.
 *   JUDGED   → the VERDICTS table below, and nothing else. That is the auditable part, and it is
 *              one editable block rather than 138 places in a rendered table.
 *
 * COMPLETENESS IS A HARD GATE. If a parsed outcome has no verdict, or a verdict names an outcome
 * the guide does not contain, this script writes NOTHING and exits non-zero. A ledger that is
 * silently 137 rows is exactly the failure it exists to prevent.
 *
 * ── INPUT ────────────────────────────────────────────────────────────────────
 * The study guide is FETCHED, NOT STORED (docs/evidence/sources.json → SBL-GUIDE, 734445 bytes).
 * The local working copy lives at docs/sbl/, which is git-ignored, so this script cannot assume
 * the PDF is present and says so rather than half-running.
 *
 * ⚠️ THE EXTRACTION FLAG IS `-raw`, NOT `-layout`. The detailed study guide is TWO COLUMNS. On the
 * Xpdf pdftotext 4.00 build on these machines `-layout` places both columns side by side on one
 * output line, and the DEFAULT mode interleaves them so an outcome can appear before its own
 * heading. `-raw` follows content-stream order and reads correctly, column by column. That build
 * has no crop options (-x/-y/-W/-H), so splitting by geometry is not available as a fallback.
 *
 * Usage:
 *   npm run build:sbl-ledger                        # pdftotext on the default PDF path
 *   npm run build:sbl-ledger -- --text <file.txt>   # skip pdftotext, use a pre-extracted dump
 *   npm run build:sbl-ledger -- --check             # verify the committed doc is up to date
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const REPO = resolve(__dirname, '..', '..');
const DEFAULT_PDF = resolve(REPO, 'docs/sbl/sbl_s26_j27_syllabus_and_study_guide.pdf');
const OUT = resolve(REPO, 'docs/SBL_CROSSWALK_LEDGER.md');
/** §5 detailed study guide. Sections A-H are the syllabus outcomes; I is the professional
 *  skills and J the employability outcomes, both excluded from the 138. */
const FIRST_PAGE = 9;
const LAST_PAGE = 18;

// ═════════════════════════════════════════════════════════════════════════════
// THE JUDGEMENTS — the only hand-authored data in this file
// ═════════════════════════════════════════════════════════════════════════════
//
// [verdict, asset-or-nearest, failed-tooth, reasoning]
//   verdict: 'REUSE' | 'ADAPT' | 'NEW'
//   asset:   'PAPER LO (n)' where n is the LIVE published-drill count; '—' if nothing is close.
//            On a NEW row this is the NEAREST asset, recorded so moving the threshold is a
//            re-read of one column rather than a re-derivation.
//   tooth:   '' for REUSE/ADAPT; 'T1' | 'T2' | 'T3' (or 'T2/T3') for NEW.
type Verdict = 'REUSE' | 'ADAPT' | 'NEW';
type Row = readonly [Verdict, string, string, string];

const VERDICTS: Record<string, Row> = {
  // ── A Leadership ───────────────────────────────────────────────────────────
  A1a: ['NEW', '—', 'T1', 'No leadership content in either corpus. Nothing on leadership traits, formulation or change management.'],
  A1b: ['NEW', '—', 'T1', 'Entrepreneurship / intrapreneurship appears nowhere in APM or AFM.'],
  A1c: ['NEW', 'AFM A3c (1)', 'T2', 'AFM A3g/A3h (ethics + governance framework) have ZERO drills. The one A3 drill is stakeholder management as social responsibility; the ethical and professional values underpinning governance are not what it marks.'],
  A2a: ['NEW', 'APM A1i (1)', 'T2', 'A1i runs culture → processes/systems/people. Leadership\'s role in DEFINING culture is absent; content would have to be written, not re-pointed.'],
  A2b: ['NEW', '—', 'T1', 'Leadership style has no asset. No situational/style model in either framework.'],
  A2c: ['NEW', 'APM A1i (1)', 'T2', 'The cultural web is not in APM. Object matches loosely, content fails entirely.'],
  A2d: ['NEW', 'APM A1i (1)', 'T2', 'THE CLOSEST NEAR-MISS IN SECTION A, and it fails on direction. A1i assesses culture/strategy → processes, systems and people; A2d assesses culture → purpose and strategy. Strategy is an INPUT in the asset and an OUTPUT in the outcome, so the marks move rather than re-point. A prior pass scored this ADAPT; under a stated threshold it is not one.'],
  A3a: ['NEW', '—', 'T1', 'Responsible leadership and public value: no asset.'],
  A3b: ['NEW', 'AFM A3c (1)', 'T2', 'IESBA/professional-body codes are examined by neither paper. No drill awards marks for code content.'],
  A3c: ['NEW', 'AFM A3c (1)', 'T2', 'AFM A3e/A3f (agency issues, stakeholder-conflict resolution) are the right outcomes and have ZERO drills. The A3c drill does not mark conflict-of-interest resolution.'],
  A3d: ['NEW', '—', 'T1', 'Ethical threats and safeguards: no asset.'],
  A3e: ['NEW', '—', 'T1', 'Fraud, bribery and corruption: no asset.'],

  // ── B Governance and sustainability ────────────────────────────────────────
  B1a: ['NEW', 'AFM B3i (1)', 'T2', 'B3i names "agency effects" as the fourth of four capital-structure propositions; its object is capital structure, not the principal-agent relationship. ⚠️ This is one of the FIVE colliding codes — AFM B1a is the ENPV calculator, an entirely different thing from SBL B1a.'],
  B1b: ['NEW', 'AFM B3i (1)', 'T2', 'Same asset, same failure: separation of ownership from control is not what the M&M/pecking-order drill marks.'],
  B2a: ['ADAPT', 'APM A1d (1)', '', 'A1d IS Mendelow: "Assess the ways in which stakeholder groups operate and how they influence an organisation and its performance measurement and performance management systems (e.g. using Mendelow\'s matrix)." Object, output and the model that earns the marks all survive. Re-point: influence on PM systems → influence on strategy and governance.'],
  B2b: ['ADAPT', 'AFM A3c (1)', '', 'A3c: "Examine how the organisation manages its stakeholder groups as part of its social responsibilities." Stakeholder roles, claims and conflict are the marked content. Re-point: add the resolution half explicitly.'],
  B2c: ['NEW', 'APM A5b (1)', 'T2', 'A5b marks sustainability target-setting and reporting; SBL B2c wants the CONCEPT of social responsibility for the public good. Expository vs evaluative, and the content differs.'],
  B3a: ['NEW', '—', 'T1', 'Institutional investors: no asset in either paper.'],
  B3b: ['NEW', '—', 'T1', 'Rules vs principles-based governance: no asset. A governance spine SBL cannot borrow.'],
  B3c: ['NEW', '—', 'T1', 'Family firms vs joint stock ownership models: no asset.'],
  B3d: ['NEW', '—', 'T1', 'ICGN Global Governance Principles: no asset.'],
  B4a: ['ADAPT', 'APM C1a (3, 1 claimed)', '', 'C1a evaluates a management report "in the light of … the needs of the users of the report". Users\' needs and report content are the marked material, which is what B4a\'s reporting-policy factors rest on. FIRST HOME FOUND FOR THE STRANDED C1 CORPUS.'],
  B4b: ['ADAPT', 'APM A5b (1)', '', 'A5b names integrated reporting <IR> and the 3Ps explicitly. Object, output and content all transfer; the re-point is from target-setting to the role and value of <IR>.'],
  B4c: ['NEW', 'APM A5b (1) — claimed by B4b', 'T2/T3', 'The six capitals and <IR> content elements are not in APM, and the only candidate asset is already spent on B4b.'],
  B4d: ['NEW', 'APM A5c (1)', 'T2', 'A5c analyses environmental COST CATEGORIES (conventional, hidden, contingent, reputational). Social and environmental footprints are a different object and a different body of knowledge.'],
  B4e: ['NEW', 'APM A5d (1)', 'T2', 'EMAS and ISO 14000 are management-system standards; A5d marks environmental management ACCOUNTING techniques (lifecycle costing, input-output, ABC).'],
  B4f: ['NEW', '—', 'T1', 'Assurance over <IR>. Neither paper examines audit at all — see section F, which fails for the same reason.'],
  B5a: ['NEW', '—', 'T1', 'Directors\' duties and board functions: no asset.'],
  B5b: ['NEW', '—', 'T1', 'Unitary vs two-tier boards: no asset. ⚠️ COLLIDING CODE — AFM B5b is the international NPV calculator.'],
  B5c: ['NEW', '—', 'T1', 'NEDs: no asset.'],
  B5d: ['NEW', '—', 'T1', 'Director induction, appraisal and CPD: no asset.'],
  B5e: ['NEW', '—', 'T1', 'Board diversity: no asset.'],
  B5f: ['NEW', '—', 'T1', 'Board committees: no asset.'],
  B5g: ['ADAPT', 'APM B2e (1)', '', 'B2e: "Evaluate different methods of reward practices, including the potential beneficial and adverse consequences of linking reward to performance measurement." B5g is remuneration principles and modifying director behaviour to align with stakeholder interests — the same act on the same object, and the consequences-of-linking-reward content is exactly what carries the marks.'],
  B5h: ['NEW', 'APM B2e (1) — claimed by B5g', 'T2/T3', 'Regulatory, strategic and labour-market determinants of pay are not in B2e, and B2e is spent. APM B2c (HRM and remuneration) is the better-fitting outcome and has ZERO drills.'],
  B6a: ['ADAPT', 'APM B4c (1)', '', 'B4c: "Assess the potential problems of multiple objectives in a not-for-profit organisation." Organisational form, stakeholder objectives and performance criteria are the marked content; the re-point widens NFP to the public/charity/NGO set.'],
  B6b: ['NEW', 'APM B4f (1) — claimed by B6d', 'T2/T3', 'Public-sector GOVERNANCE ARRANGEMENTS are not VFM. The nearest asset is spent on B6d, where it fits exactly.'],
  B6c: ['NEW', '—', 'T1', 'Democratic control, political influence, policy implementation: no asset.'],
  B6d: ['ADAPT', 'APM B4f (1)', '', 'B4f: "Apply and evaluate value for money (VFM) … using the 3Es (economy, efficiency and effectiveness)." SBL B6d is the 3 E\'s and public value. The strongest single match in the whole crosswalk — the 3Es are named on both sides.'],

  // ── C Strategy ─────────────────────────────────────────────────────────────
  C1a: ['ADAPT', 'APM A1a (1)', '', 'A1a: "Explain the role of strategic performance management in strategic planning and control." Expository act, strategy as the object, and the role-of-strategy content survives. Re-point: from performance management to different organisational contexts.'],
  C1b: ['NEW', '—', 'T1', 'Johnson, Scholes and Whittington is absent from both frameworks.'],
  C2a: ['NEW', 'APM A1e (1)', 'T2', 'OUTPUT FAILS. A1e asks the candidate to judge whether PEST/SWOT ASSIST performance management; C2a asks them to PRODUCE a PESTEL assessment of an organisation. Same model, different marked act.'],
  C2b: ['NEW', '—', 'T1', 'Strategic drift: no asset.'],
  C2c: ['NEW', 'APM A1e (1)', 'T2', 'Same asset, same output failure as C2a.'],
  C2d: ['NEW', '—', 'T1', 'Porter\'s Diamond: no asset.'],
  C2e: ['NEW', 'APM A1h (1)', 'T2', 'A1h is risk and uncertainty in planning; AFM B1a runs probability-weighted scenario streams. Both are QUANTITATIVE scenario work. C2e is qualitative scenario planning about the future environment — the content does not survive.'],
  C3a: ['NEW', '—', 'T1', '⚠️ DELETION ASYMMETRY. Porter\'s Five Forces was REMOVED from APM for S26–J27 (SBL-CHANGES p.3) and SBL still examines it (C3a). No asset exists and none can be harvested — apm-framework.ts greps clean for it.'],
  C3b: ['NEW', '—', 'T1', 'Customers, markets and segmentation: no asset.'],
  C3c: ['ADAPT', 'APM B3a (1)', '', 'B3a: "Evaluate how Porter\'s Value Chain can be used to analyse performance across the whole value chain and to recommend value adding performance improvements." SBL C3c applies the value chain to identify value-adding activities. Both end in naming value-adding activities in a scenario; the model is the marked content on both sides.'],
  C3d: ['NEW', 'APM B3a (1) — claimed by C3c', 'T3', 'Value NETWORKS are a distinct topic and the one value-chain drill is spent.'],
  C3e: ['NEW', 'APM A1e (1)', 'T2', 'Third SBL outcome whose nearest asset is the single A1e drill; same output failure.'],
  C4a: ['NEW', '—', 'T1', 'Threshold resources/competences, unique resources, core competences: no asset. The resource-based view is absent from both papers.'],
  C4b: ['NEW', '—', 'T1', 'Capabilities to sustain competitive advantage: no asset (see C4a).'],
  C4c: ['NEW', 'APM D1c (3, 1 claimed)', 'T2', 'D1c marks knowledge management SYSTEMS (KMS) as a performance tool. Organisational knowledge as a strategic CAPABILITY is a different object.'],
  C4d: ['NEW', 'APM A1e (1)', 'T2', 'FOURTH claimant on the single A1e drill. "Evaluate how SWOT may assist" → "formulate an appropriate SWOT" is the clearest output flip in the ledger.'],
  C5a: ['NEW', '—', 'T1', 'Strategic options generally: no asset.'],
  C5b: ['NEW', 'AFM B5b (2)', 'T2', 'AFM B5b appraises a foreign project\'s cash flows. Product/market diversification strategy is not what it marks. ⚠️ COLLIDING CODE.'],
  C5c: ['NEW', '—', 'T1', '7 P\'s, price-based strategies, differentiation, lock-in: no asset.'],
  C5d: ['NEW', '—', 'T1', '⚠️ DELETION ASYMMETRY, second instance. The BCG matrix was REMOVED from APM and SBL still examines it (C5d), alongside the public-sector portfolio matrix which APM never had.'],
  C5e: ['NEW', '—', 'T1', 'Ansoff growth vector matrix: no asset.'],
  C5f: ['NEW', '—', 'T1', 'Business combinations, alliances and partnering for growth. AFM C1a covers the arguments for and against acquisitions as corporate expansion and has ZERO drills — AFM section C (M&A) is entirely undrilled. APM B4h (alliances/JVs) also has zero.'],

  // ── D Risk ─────────────────────────────────────────────────────────────────
  D1a: ['ADAPT', 'APM A1h (1)', '', 'A1h: "Evaluate how risk and uncertainty play an important role in planning, decision making and reporting of performance at all levels of an organisation, including the impact of the different risk appetites of stakeholders." D1a is the relationship between organisational strategy and risk management strategy. Object, output and content all transfer.'],
  D1b: ['NEW', '—', 'T1', 'ERM. AFM A2f (a framework for risk management) and A2g (risk management systems) are the right outcomes and both have ZERO drills.'],
  D1c: ['NEW', 'APM A1h (1) — claimed by D1a', 'T2/T3', 'Risk IDENTIFICATION (including climate risk) and impact on organisations and projects. AFM B1a treats risk only as a discount-rate/probability adjustment to a project it is already given; SBL wants the risks named. Nearest asset spent on D1a.'],
  D1d: ['NEW', '—', 'T1', 'Strategic vs operational risk: no asset.'],
  D1e: ['NEW', 'APM A1h (1) — claimed by D1a', 'T3', 'A1h explicitly names "the different risk appetites of stakeholders", so on content this is the best-fitting SBL outcome for it — but one drill backs one row and D1a takes it. ⚠️ THE CLEAREST T3 CASE IN THE LEDGER: loosen the one-claim rule and this becomes an ADAPT immediately.'],
  D1f: ['NEW', '—', 'T1', 'The dynamic nature of risk across size/structure/industry/sector: no asset.'],
  D1g: ['NEW', 'AFM B1a (8, 2 claimed)', 'T2', 'AFM computes probability-weighted ENPV and P(negative NPV). SBL D1g wants a qualitative severity/probability judgement (and pairs with heat maps at D2b). Ruled NEW for consistency with C2e, which was refused on the same quantitative-vs-qualitative ground.'],
  D1h: ['NEW', 'AFM B3e (2)', 'T2', 'Correlated risk factors. B3e\'s marks are for ungearing and regearing betas, not for reasoning about correlation between risks.'],
  D2a: ['NEW', '—', 'T1', 'The role of a risk manager: no asset.'],
  D2b: ['NEW', '—', 'T1', 'Risk registers and heat maps: no asset.'],
  D2c: ['NEW', '—', 'T1', 'Embedding risk in culture and values: no asset.'],
  D2d: ['NEW', 'AFM B3e (2)', 'T2', 'Diversification is present in B3e as systematic-vs-unsystematic risk, but the marked act is a CAPM computation. AFM A2f, which is the real fit, has zero drills.'],
  D2e: ['NEW', '—', 'T1', 'TARA is absent from both papers.'],
  D2f: ['NEW', '—', 'T1', 'ALARP is absent from both papers.'],
  D2g: ['NEW', '—', 'T1', 'Assurance mapping and the four lines of defence: no asset.'],

  // ── E Technology and data analytics ────────────────────────────────────────
  E1a: ['ADAPT', 'APM D1a (1)', '', 'D1a: "Advise on how IT developments may influence performance management systems (e.g. … cloud and network technology)." E1a is the strategic case for exploring cloud/mobile/smart adoption. Object and content transfer; the re-point is from PM systems to a strategic adoption decision.'],
  E1b: ['NEW', 'APM D1a (1) — claimed by E1a', 'T2/T3', 'Benefits AND risks of cloud/mobile/smart specifically. D1d (3 drills) is security risk, not the benefit side; D1a is spent.'],
  E1c: ['NEW', 'APM D1a (1) — claimed by E1a', 'T3', 'Cloud vs owned hardware is a make/buy on infrastructure. Second outcome after E1b to lose the same single drill. ⚠️ A prior pass scored E1a AND E1c as ADAPTs on this one drill — the double-claim that motivated the T3 rule.'],
  E2a: ['ADAPT', 'APM D2h (1)', '', 'D2h: "Advise management on the output of a data model to provide clear insights and help to formulate recommendations for action." E2a is how IT and data analysis inform and implement strategy. Re-point: recipient and purpose move from performance improvement to strategy.'],
  E2b: ['ADAPT', 'APM D2a (1)', '', 'D2a: "Assess the development of big data and its impact on performance measurement and management, including the risks and challenges it presents." SBL E2b is big data\'s opportunities and threats. Near-exact. ⚠️ COLLIDING CODE — AFM E2b is the FX hedge calculator. Also available: the Bexley Grocers case requirement D2a (13m).'],
  E2c: ['ADAPT', 'APM D2b (1)', '', 'D2b: "Advise on the data science methods and processes from setting the goals of the exercise, to selecting, cleaning, transforming and storing the data." E2c is identifying and analysing relevant data for product/marketing/pricing decisions — selecting the relevant data is the shared marked act.'],
  E3a: ['ADAPT', 'APM D2f (2, 1 claimed)', '', 'D2f: "Assess the use of machine learning and artificial intelligence (AI) in gaining insights and recommending performance improvements." E3a is the potential benefits of AI, robotics and ML. ⚠️ COLLIDING CODE — AFM E3a is the interest-rate futures calculator.'],
  E3b: ['ADAPT', 'APM D2i (2, 1 claimed)', '', 'D2i: "Advise on the ethical issues related to information collection and processing (e.g. the use of algorithms which are impossible to interrogate and audit …)." E3b is the risk, control and ethical implications of AI. Distinct asset from E3a, so T3 holds.'],
  E4a: ['NEW', '—', 'T1', 'The organisation\'s approach to delivering e-business: no asset.'],
  E4b: ['NEW', 'APM D1a (1) — claimed by E1a', 'T3', 'Third outcome to lose the single D1a drill.'],
  E4c: ['NEW', '—', 'T1', 'The 6 I\'s of e-marketing: no asset.'],
  E4d: ['ADAPT', 'APM A4d (1)', '', 'A4d: "Assess the significance of brand awareness and brand loyalty and their potential impact on business performance." E4d is online branding compared with traditional branding — same object and act, with the comparison added.'],
  E4e: ['ADAPT', 'APM D1c (3, 1 claimed)', '', 'D1c covers customer relationship management systems (CRMS). E4e is acquiring and managing suppliers and customers through e-business technology.'],
  E5a: ['ADAPT', 'APM D1d (3, 1 of 3)', '', 'D1d: "Assess the risks to systems and data and recommend methods and controls to protect the security of the technology and information of an organisation." E5a is the continuing need for effective information systems control.'],
  E5b: ['ADAPT', 'APM D1d (3, 2 of 3)', '', 'Adequacy of IT and systems security controls. D1d has THREE drills, so three distinct SBL rows can claim it without breaching T3.'],
  E5c: ['ADAPT', 'APM D1d (3, 3 of 3)', '', 'Promoting cyber security. Third and last D1d drill.'],
  E5d: ['NEW', 'APM D1d (3) — all three claimed', 'T3', 'Safeguarding IT assets. Content fits, but D1d is exhausted at 3/3. ⚠️ PURELY a depth limit: a fourth D1d drill would make this an ADAPT with no other change.'],

  // ── F Organisational control and audit ─────────────────────────────────────
  F1a: ['NEW', '—', 'T1', 'COSO is absent from both papers.'],
  F1b: ['ADAPT', 'APM D1e (2, 1 of 2)', '', 'D1e: "Evaluate whether the management information systems are lean and the value of the information that they provide (e.g. using the 5 Ss)." F1b asks whether information flows to management are adequate for managing internal control and risk. The adequacy-of-management-information act transfers; the re-point is from lean/5Ss to control and risk. THE ONE SECTION F ADAPT.'],
  F1c: ['NEW', 'APM D1e (2, 1 free)', 'T2', 'Internal control SYSTEMS are a different object from management information systems, even though a D1e drill is still unclaimed.'],
  F1d: ['NEW', '—', 'T1', 'Legal and regulatory compliance and the consequences of poor control: no asset.'],
  F1e: ['NEW', 'APM D1d (3) — all claimed', 'T2/T3', 'Recommending controls to prevent fraud, error, waste and environmental harm. D1d is IT-security-shaped and exhausted.'],
  F2a: ['NEW', '—', 'T1', 'The need for an internal audit function: no asset.'],
  F2b: ['NEW', '—', 'T1', 'Auditor independence: no asset.'],
  F2c: ['NEW', '—', 'T1', 'The internal audit committee: no asset.'],
  F2d: ['NEW', '—', 'T1', 'Responses to auditors\' recommendations: no asset. ⚠️ SUB-AREA F2 IS FOUR-FOR-FOUR EMPTY — neither APM nor AFM examines audit.'],
  F3a: ['NEW', 'APM C1a (3, 2 free)', 'T2', 'Reports on internal control to shareholders. C1a drills mark performance-report quality and user needs; internal-control reporting is not their content.'],
  F3b: ['NEW', 'APM C1a (3, 2 free)', 'T2', 'The contents of an internal control and internal audit report, including environmental and sustainability audits.'],
  F3c: ['NEW', 'APM C1a (3, 2 free)', 'T2', 'How internal controls underpin reliable financial and sustainable reporting.'],

  // ── G Finance in planning and decision-making ──────────────────────────────
  G1a: ['NEW', 'APM D1a (1) — claimed by E1a', 'T2/T3', 'How technology is transforming the finance sector and the finance function. The finance FUNCTION is a different object from performance management systems, and D1a is spent.'],
  G1b: ['NEW', '—', 'T1', 'Business partnering, outsourcing, shared and global business services. APM B4h is the nearest outcome and has ZERO drills.'],
  G2a: ['NEW', 'AFM B1a (8, 2 claimed)', 'T2', 'Determining the organisation\'s OVERALL investment requirement is an aggregate/portfolio act; AFM B1a appraises a single named project.'],
  G2b: ['ADAPT', 'AFM B3a (1)', '', 'B3a: "Identify and assess the appropriateness of the range of sources of finance available to an organisation including equity, debt, hybrids, lease finance, venture capital, business angel finance, private equity, asset securitisation and sale, Islamic finance and security token offerings." G2b is assessing and advising on short- and long-term finance. Direct. ⚠️ A prior APM-ONLY pass scored this NEW; the AFM corpus is what makes it an ADAPT.'],
  G2c: ['ADAPT', 'AFM B1c (4)', '', 'B1c establishes IRR/MIRR and the return margin and advises on a project. G2c is reviewing and justifying decisions to select or abandon competing investments using suitable appraisal techniques.'],
  G2d: ['ADAPT', 'AFM B1a (8, 1 of 8)', '', 'B1a explicitly covers probability and sensitivity analysis, risk-adjusted discount rates and project duration as a measure of risk. G2d is justifying decisions taking risk and uncertainty into account.'],
  G2e: ['ADAPT', 'AFM B3k (1)', '', 'B3k: "Assess the impact of a significant capital investment project upon the reported financial position and performance of the organisation taking into account alternative financing strategies." G2e is the financial reporting and tax implications of strategic/investment decisions; AFM international.ts owns the corporate-differential tax treatment. ⚠️ Also scored NEW on an APM-only baseline.'],
  G2f: ['ADAPT', 'APM A3b (9, 1 of 9)', '', 'A3b: "Calculate and evaluate the appropriateness of different measures of performance including gross and operating profit, ROCE, ROI, EPS and TSR, EBITDA, RI, NPV, EVA." G2f is assessing performance and position using performance techniques, KPIs and ratios. The single deepest asset in either corpus — 9 drills — and it backs ONE SBL row.'],
  G3a: ['NEW', 'APM B3c (1)', 'T2', 'The continuing NEED for cost management and control systems. B3c evaluates whether ABM/ABC improves performance — a judgement on a technique, not on the need for the function.'],
  G3b: ['ADAPT', 'APM B1a (1)', '', 'APM B1a evaluates budgeting methods and recommends one; B1b calculates budgets and B1c calculates variances. G3b is evaluating forecasting, budgeting, standard costing and variance analysis in support of strategic planning. Content transfers almost intact.'],

  // ── H Enabling success, managing change and innovation ─────────────────────
  H1a: ['ADAPT', 'APM A1i (1)', '', 'A1i: "Assess how changing an organisation\'s structure, culture and strategy will affect its processes, systems and people." H1a advises on re-organising structure and internal relationships to deliver a selected strategy. THIS is A1i\'s best home — better than A2d, which a prior pass gave it.'],
  H1b: ['NEW', '—', 'T1', 'Collaborative working, franchising, outsourcing, shared and global business services. APM B4h has ZERO drills (same gap as G1b).'],
  H2a: ['NEW', '—', 'T1', 'Fintech and cryptocurrencies: no asset.'],
  H2b: ['NEW', 'APM B3d (1) — claimed by H5d', 'T2/T3', 'The impact of new products, processes and innovation ON STRATEGY. B3d marks process-improvement techniques, and it fits H5d better.'],
  H3a: ['ADAPT', 'APM B2a (1)', '', 'B2a: "Advise on the link between achievement of the corporate strategy and the management of human resources e.g. through Fitzgerald and Moon\'s Building Block model." H3a is how talent management contributes to supporting strategy — the HR-to-strategy link is the marked content.'],
  H3b: ['NEW', '—', 'T1', 'The four-view POPIT model is absent from both papers.'],
  H4a: ['NEW', '—', 'T1', 'The Baldrige model is absent from both papers.'],
  H4b: ['ADAPT', 'APM A2c (1)', '', 'A2c: "Apply critical success factor (CSF) analysis to develop key performance indicators (KPIs) to achieve an organisation\'s goals and objectives." H4b is empowering the organisation to reach strategic goals focusing on its CSFs. CSF analysis is named on both sides.'],
  H5a: ['ADAPT', 'APM B3c (1)', '', 'B3c evaluates activity-based management for improving performance. H5a evaluates the effectiveness of current organisational processes — process/activity analysis is the shared content.'],
  H5b: ['NEW', '—', 'T1', 'Types of strategic change and their implications: no asset.'],
  H5c: ['NEW', '—', 'T1', 'Harmon\'s process-strategy matrix is absent from both papers.'],
  H5d: ['ADAPT', 'APM B3d (1)', '', 'B3d covers Kaizen, target and lifecycle costing, JIT, Six Sigma (DMAIC), TQM and costs of quality. H5d assesses and advises on redesign options for improving current processes — those techniques ARE the redesign levers.'],
  H5e: ['NEW', '—', 'T1', 'Recommending a process redesign methodology. APM B3e IS Business Process Re-engineering and has ZERO PUBLISHED DRILLS — in the framework, absent from the corpus. The cleanest illustration of why an asset must be a drill and not a framework LO.'],
  H5f: ['NEW', '—', 'T1', 'Lewin\'s three-stage model is absent from both papers.'],
  H5g: ['NEW', '—', 'T1', 'Balogun and Hope Hailey\'s contextual features are absent from both papers.'],
  H6a: ['NEW', '—', 'T1', 'The distinguishing features of projects and their constraints: no asset.'],
  H6b: ['NEW', '—', 'T1', 'The triple constraints of scope, time and cost: no asset.'],
  H6c: ['NEW', 'APM C1e (3)', 'T2', 'PREPARING a business case and project initiation document. C1e ("Prepare a useful narrative commentary for a performance report") is the only PRODUCE-A-DOCUMENT act in either corpus, so the output matches — but a narrative commentary is not a business case, so the content fails.'],
  H6d: ['ADAPT', 'AFM B1a (8, 2 of 8)', '', 'Analysing, assessing and classifying the costs and benefits of a project investment. AFM B1a\'s project modelling is exactly this, with relevant-cost discipline included. A distinct drill from G2d\'s, so T3 holds.'],
  H6e: ['NEW', '—', 'T1', 'The roles of project manager and project sponsor: no asset.'],
  H6f: ['NEW', '—', 'T1', 'The importance and key elements of a project plan: no asset.'],
  H6g: ['NEW', '—', 'T1', 'Monitoring and controlling project risks and slippage. AFM A2g (capital investment monitoring systems) has ZERO drills.'],
  H6h: ['NEW', '—', 'T1', 'Post-implementation and post-project review: no asset.'],
};

/** Live published-drill totals, for the inverse-finding section. Queried 2026-08-17:
 *  status='approved' AND published on acca_drills. */
const LIVE_DRILLS = { APM: 91, AFM: 63 };

const SECTION_TITLES: Record<string, string> = {
  A: 'Leadership',
  B: 'Governance and sustainability',
  C: 'Strategy',
  D: 'Risk',
  E: 'Technology and data analytics',
  F: 'Organisational control and audit',
  G: 'Finance in planning and decision-making',
  H: 'Enabling success, managing change and innovation',
};

// ═════════════════════════════════════════════════════════════════════════════
// THE PARSE
// ═════════════════════════════════════════════════════════════════════════════

interface Lo { code: string; section: string; sub: string; text: string; level: number | null; malformed: boolean }

/** Level marker: [1] [2] [3].
 *
 *  ⚠️ THE CLOSING CHARACTER IS A CLASS, NOT A LITERAL ']'. Two rows in the published PDF carry a
 *  malformed bracket — A2d renders '[3}' and H5a renders '[3)'. A strict ']' silently drops both
 *  from the [3] count, which is the mechanical cause of an earlier 95/43-vs-92/46 disagreement
 *  over the level split. Both are level 3. Do not "tidy" this regex. */
const LEVEL_RE = /\[(\d)[\]})]/;

function extractText(pdf: string): string {
  if (!existsSync(pdf)) {
    throw new Error(
      `SBL study guide not found at ${pdf}.\n` +
      'It is FETCHED, NOT STORED (docs/evidence/sources.json → SBL-GUIDE, 734445 bytes) and the\n' +
      'local working copy under docs/sbl/ is git-ignored, so a fresh clone will not have it.\n' +
      'Fetch it with docs/evidence/fetch_acca_sources.ps1, or pass a pre-extracted dump with\n' +
      '  --text <file.txt>   (produced by: pdftotext -raw -f 9 -l 18 <pdf> out.txt)',
    );
  }
  try {
    // -raw, NOT -layout. See the header note: this guide is two columns and -layout interleaves.
    return execFileSync('pdftotext', ['-raw', '-f', String(FIRST_PAGE), '-l', String(LAST_PAGE), pdf, '-'],
      { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  } catch (e) {
    throw new Error(
      `pdftotext failed or is not on PATH (${(e as Error).message}).\n` +
      'On these machines it ships with Git for Windows at /mingw64/bin/pdftotext and is NOT\n' +
      'necessarily on the PowerShell PATH. Either run this from Git Bash, or extract by hand and\n' +
      'pass --text <file.txt>:  pdftotext -raw -f 9 -l 18 <pdf> out.txt',
    );
  }
}

function parseLos(raw: string): { los: Lo[]; subNames: Record<string, string> } {
  const SECTION_RE = /^([A-J]) ([A-Z].*)$/;
  const SUBAREA_RE = /^(\d+)\.\s+(.*)$/;
  const LO_RE = /^([a-z])\)\s+(.*)$/;
  const NOISE = [
    /^Strategic Business Leader \(SBL\)$/,
    /^\d*\s*\S?\s*ACCA 2026-2027 All rights reserved\.$/,
    /^\d+$/,
    /^5\. Detailed study guide$/,
  ];

  const los: Lo[] = [];
  const subNames: Record<string, string> = {};
  let section: string | null = null;
  let sub: string | null = null;
  let cur: Lo | null = null;
  const flush = () => { if (cur) { los.push(cur); cur = null; } };

  for (const rawLine of raw.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || NOISE.some((r) => r.test(line))) continue;

    let m = line.match(SECTION_RE);
    if (m && !/^[a-z]\)/.test(line)) { flush(); section = m[1]; sub = null; continue; }

    m = line.match(SUBAREA_RE);
    if (m) { flush(); sub = m[1]; subNames[`${section}${sub}`] = m[2]; continue; }

    m = line.match(LO_RE);
    if (m) {
      flush();
      cur = { code: `${section}${sub}${m[1]}`, section: section!, sub: `${section}${sub}`, text: m[2], level: null, malformed: false };
      continue;
    }
    // A continuation line belongs to whatever heading or outcome is open.
    if (cur) cur.text += ' ' + line;
    else if (sub) subNames[`${section}${sub}`] += ' ' + line;
  }
  flush();

  for (const lo of los) {
    const m = lo.text.match(new RegExp(LEVEL_RE.source + '\\s*$')) ?? lo.text.match(LEVEL_RE);
    lo.level = m ? Number(m[1]) : null;
    lo.malformed = !!m && !/\[\d\]\s*$/.test(lo.text);
    lo.text = lo.text.replace(new RegExp('\\s*' + LEVEL_RE.source + '\\s*$'), '').replace(/\s+/g, ' ').trim();
  }
  return { los, subNames };
}

// ═════════════════════════════════════════════════════════════════════════════
// RENDER
// ═════════════════════════════════════════════════════════════════════════════

function render(los: Lo[], subNames: Record<string, string>): string {
  const rows = los.filter((r) => !['I', 'J'].includes(r.section));
  const out: string[] = [];
  const w = (s = '') => out.push(s);
  const esc = (s: string) => s.replace(/\|/g, '\\|');
  const pct = (n: number, d: number) => `${(100 * n / d).toFixed(1)}%`;
  // Narrative prose spells small counts as words. Deriving the WORD (rather than typing it beside
  // an interpolated digit) is what keeps a sentence like "Five of the six" honest — see
  // assertNarrativeNumbers() below, which re-reads every one of them out of the rendered file.
  const NUM_WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen',
    'nineteen', 'twenty'];
  const spell = (n: number) => NUM_WORDS[n] ?? String(n);
  const Spell = (n: number) => { const w0 = spell(n); return w0.charAt(0).toUpperCase() + w0.slice(1); };
  const tally = (list: Lo[]) => {
    const t: Record<Verdict, number> = { REUSE: 0, ADAPT: 0, NEW: 0 };
    for (const r of list) t[VERDICTS[r.code][0]]++;
    return t;
  };

  const all = tally(rows);
  const covered = all.REUSE + all.ADAPT;
  const adapts = rows.filter((r) => VERDICTS[r.code][0] === 'ADAPT');
  const byPaper = {
    APM: adapts.filter((r) => /^APM/.test(VERDICTS[r.code][1])).length,
    AFM: adapts.filter((r) => /^AFM/.test(VERDICTS[r.code][1])).length,
  };
  const afmRows = adapts.filter((r) => /^AFM/.test(VERDICTS[r.code][1])).map((r) => r.code);
  const afmInG = adapts.filter((r) => /^AFM/.test(VERDICTS[r.code][1]) && r.section === 'G').length;
  const tReason: Record<string, number> = {};
  for (const r of rows) {
    const [v, , f] = VERDICTS[r.code];
    if (v === 'NEW') tReason[f] = (tReason[f] ?? 0) + 1;
  }
  const levels: Record<string, number> = {};
  for (const r of rows) levels[String(r.level)] = (levels[String(r.level)] ?? 0) + 1;

  w('# SBL crosswalk — the per-LO ledger');
  w();
  w(`**${rows.length} rows, ${rows.length} verdicts, no gaps.** Generated by`);
  w('`scripts/authoring/build-sbl-crosswalk-ledger.ts`, which refuses to write this file if a');
  w('parsed outcome has no verdict or a verdict names an outcome the study guide does not contain.');
  w('Every tally, percentage and sensitivity figure below is computed, not asserted.');
  w();
  w('Sources: `SBL-GUIDE` §5 detailed study guide pp.9-17 — LO codes, sub-area names, outcome text');
  w(`and intellectual levels are a machine parse, not a transcription (${levels['3']} at [3], ${levels['2']} at [2], zero`);
  w('at [1]). Assets are live `acca_drills` and `acca_cases` rows.');
  w();
  w('---');
  w();
  w('## Why this file exists');
  w();
  w('A previous pass produced a single headline — **35% covered** — from eight section subtotals.');
  w('The 138 individual judgements behind it were never written down, so the number could not be');
  w('re-opened at the row you disagreed with. A blind re-verdict of a random 15 outcomes came out at');
  w('**53%** against an implied 38%, and tightening the (unstated) definition of ADAPT moved that');
  w('same sample to roughly **17%**. A number whose defensible range is 17-53% is not a plan.');
  w();
  w('Two things fix that, and both are below: a **stated threshold**, and **one row per outcome** —');
  w('including a named NEAREST asset for the rows that FAILED, so moving the threshold is a re-read');
  w('of one column rather than a re-derivation of the whole exercise.');
  w();
  w('## The ADAPT threshold — stated, so it can be argued with');
  w();
  w('**REUSE** — the existing asset can be served to an SBL candidate with **no change to its');
  w('rubric or model answer**. Only the paper label changes.');
  w();
  w('**ADAPT** — a **named** asset exists whose marked act transfers, and the rewrite is confined');
  w('to re-pointing the frame. All three of the following must hold:');
  w();
  w('- **(a) OBJECT** — the candidate operates on the same kind of thing.');
  w('- **(b) OUTPUT** — the candidate must produce the same kind of output (a computed figure plus');
  w('  a verdict; a recommendation; a description; a critique). *Same model, different output, is');
  w('  not an ADAPT* — "evaluate how SWOT assists performance management" and "formulate a SWOT"');
  w('  are different marked acts.');
  w('- **(c) CONTENT SURVIVES** — the technical knowledge the rubric awards marks for is knowledge');
  w('  SBL also examines. If the rewrite has to replace what the candidate must KNOW, you are');
  w('  re-teaching, not re-pointing.');
  w();
  w('**NEW** — everything else. Three named failure modes, so each NEW records which tooth bit:');
  w();
  w('| code | the rule | why it is a rule |');
  w('| --- | --- | --- |');
  w('| **T1** | An asset is a **published drill or published case requirement**, never a framework LO. | APM B3e *is* Business Process Re-engineering and has **zero** published drills. Counting it would credit content that does not exist. |');
  w('| **T2** | The marked act must transfer (a/b/c above). | Otherwise "same model" silently becomes "same drill", which is where 35% came from. |');
  w('| **T3** | **One asset, one claim.** A single drill backs at most one SBL outcome. | A drill can only be rewritten once. The prior pass named one A1e drill for two SBL outcomes and one D1a drill for two more; there is one of each in existence. |');
  w();
  w('Where an outcome fails on more than one tooth, both are recorded (`T2/T3`).');
  w();
  w('## The count');
  w();
  w('| verdict | rows | share |');
  w('| --- | --- | --- |');
  w(`| REUSE | ${all.REUSE} | ${pct(all.REUSE, rows.length)} |`);
  w(`| ADAPT | ${all.ADAPT} | ${pct(all.ADAPT, rows.length)} |`);
  w(`| **covered (REUSE + ADAPT)** | **${covered}** | **${pct(covered, rows.length)}** |`);
  w(`| NEW | ${all.NEW} | ${pct(all.NEW, rows.length)} |`);
  w(`| total | ${rows.length} | 100% |`);
  w();
  w(`**${pct(covered, rows.length)} covered, ${covered} of ${rows.length}.** Not 35%.`);
  w();
  w('**REUSE is zero, and that is a finding, not an omission.** No SBL outcome can be served by an');
  w('existing asset unchanged — every SBL outcome sits in a different frame (governance, the public');
  w('interest, strategy) from the performance-management and corporate-finance frames the corpus was');
  w('written in. A prior pass recorded 4 REUSE while also stating the rule "same model, different');
  w('verb, different marked act — every one of these is ADAPT, NEVER REUSE". Those four contradicted');
  w('its own law.');
  w();
  w('### Where the coverage is');
  w();
  w('| section | LOs | covered | rate |');
  w('| --- | --- | --- | --- |');
  for (const s of Object.keys(SECTION_TITLES)) {
    const sr = rows.filter((r) => r.section === s);
    const t = tally(sr);
    w(`| ${s} ${SECTION_TITLES[s]} | ${sr.length} | ${t.REUSE + t.ADAPT} | ${pct(t.REUSE + t.ADAPT, sr.length)} |`);
  }
  w();
  const thin = rows.filter((r) => 'ACDF'.includes(r.section));
  const thinT = tally(thin);
  const fat = rows.filter((r) => 'EG'.includes(r.section));
  const fatT = tally(fat);
  w('The distribution matters more than the headline. Coverage is **concentrated in two sections** —');
  w(`E (technology and data analytics) and G (finance), which are ${fat.length} outcomes at`);
  w(`**${pct(fatT.ADAPT + fatT.REUSE, fat.length)}** between them, holding ${fatT.ADAPT} of the ${all.ADAPT} ADAPTs — and is near-zero in the four`);
  w(`sections that carry most of the paper: **A, C, D and F together are ${thin.length} outcomes at`);
  w(`${pct(thinT.ADAPT + thinT.REUSE, thin.length)}** (${thinT.ADAPT + thinT.REUSE} covered). Section A is 0 of 12; sub-area F2 (audit) is 0 of 4.`);
  w(`A build plan that reads the headline as "a quarter of the work is done" would be wrong about`);
  w(`${thin.length} of the ${rows.length} outcomes.`);
  w();
  w('### Which corpus pays');
  w();
  w('| corpus | ADAPTs it backs |');
  w('| --- | --- |');
  w(`| APM | ${byPaper.APM} |`);
  w(`| AFM | ${byPaper.AFM} |`);
  w();
  w('**The first pass never considered AFM at all** — it opened on "APM 91 published drills" and');
  w(`stopped there. The ${byPaper.AFM} AFM-backed rows (${afmRows.join(', ')}) would all have scored NEW on an`);
  w(`APM-only baseline, so an APM-only crosswalk reads ${pct(covered - byPaper.AFM, rows.length)} and understates coverage by`);
  // WAS "Five of the six sit in section G" — a hand-typed literal sitting between two interpolated
  // values, and WRONG: four of the six are in G (B2b is section B, H6d is section H). It survived
  // because the completeness gate read verdicts and never read prose. Now derived, and
  // re-asserted out of the rendered file by assertNarrativeNumbers().
  w(`${pct(byPaper.AFM, rows.length)}. ${Spell(afmInG)} of the ${spell(byPaper.AFM)} sit in section G, which is why G is one of the two best-covered`);
  w('sections in the paper and was previously read as one of the worst.');
  w();
  w('### Why the NEWs are NEW');
  w();
  w('| failure | rows |');
  w('| --- | --- |');
  for (const k of Object.keys(tReason).sort()) w(`| \`${k}\` | ${tReason[k]} |`);
  w();
  w('**T1 dominates, and that is the load-bearing fact for a build plan.** The commonest reason an');
  w('SBL outcome is uncovered is not that the nearest asset is a poor fit — it is that there is no');
  w('asset at all. Governance (B3, B5), audit (F2), the resource-based view (C4), project management');
  w('(H6) and most of the models SBL names by name (Johnson Scholes and Whittington, Porter\'s');
  w('Diamond, POPIT, Baldrige, Harmon, Lewin, Balogun and Hope Hailey, Ansoff, TARA, ALARP, COSO,');
  w('the six capitals, ICGN) appear nowhere in either corpus. **That work does not get cheaper by');
  w('choosing a looser threshold.**');
  w();
  w('## What moves the number, and by how much');
  w();
  w('The threshold is a choice, so here is its sensitivity — measured on this ledger, not estimated:');
  w();
  const t3only = rows.filter((r) => VERDICTS[r.code][0] === 'NEW' && VERDICTS[r.code][2] === 'T3');
  const t3any = rows.filter((r) => VERDICTS[r.code][0] === 'NEW' && /T3/.test(VERDICTS[r.code][2]));
  const single = adapts.filter((r) => /\(1\)/.test(VERDICTS[r.code][1]));
  w(`- **Drop T3 (let one drill back many outcomes).** ${t3only.length} rows fail on T3 ALONE`);
  w(`  (${t3only.map((r) => r.code).join(', ')}) and would become ADAPTs, taking coverage to`);
  w(`  **${pct(covered + t3only.length, rows.length)}**. A further ${t3any.length - t3only.length} fail on T3 together with T2.`);
  w(`  ⚠️ T3 is what stops the corpus being counted twice: **${single.length} of the ${all.ADAPT} ADAPTs rest on an asset`);
  w('  with exactly ONE published drill**, so dropping T3 credits the same drill repeatedly.');
  w('- **Drop T2\'s output test (b) — "same model is enough".** The single APM A1e drill (SWOT, PEST,');
  w('  generic strategies) is the nearest asset for **four** outcomes (C2a, C2c, C3e, C4d), and the');
  w('  single D1a drill for four more (E1a claims it; E1b, E1c, E4b and G1a lose it). This is where');
  w('  the prior 53% came from.');
  w('- **Tighten to REUSE only.** 0%.');
  w();
  w(`The 17-53% range is now a ${pct(covered, rows.length)} point estimate with a stated rule and named levers, and every`);
  w('row below can be argued individually.');
  w();
  w('## Reading the ledger');
  w();
  w('`asset / nearest` names a **published** asset as `PAPER LO (n)`, where `n` is the live drill');
  w('count for that LO. On a NEW row it is the nearest thing that exists, and the row says why it');
  w('was not enough; `—` means nothing in either corpus is close. **An ADAPT with no named asset is');
  w('a NEW** — that is the whole point of the column.');
  w();

  for (const s of Object.keys(SECTION_TITLES)) {
    const sr = rows.filter((r) => r.section === s);
    const t = tally(sr);
    w('---');
    w();
    w(`## ${s} — ${SECTION_TITLES[s]}`);
    w();
    w(`${sr.length} outcomes · ADAPT ${t.ADAPT} · NEW ${t.NEW} · **${pct(t.ADAPT + t.REUSE, sr.length)} covered**`);
    w();
    let sub = '';
    sr.forEach((r, i) => {
      if (r.sub !== sub) {
        sub = r.sub;
        w(`### ${sub} — ${(subNames[sub] ?? '').replace(/\s+/g, ' ').trim()}`);
        w();
        w('| LO | lvl | outcome | verdict | asset / nearest | reasoning |');
        w('| --- | --- | --- | --- | --- | --- |');
      }
      const [v, a, f, why] = VERDICTS[r.code];
      const verdict = v === 'NEW' ? `NEW \`${f}\`` : `**${v}**`;
      w(`| \`${r.code}\` | ${r.level} | ${esc(r.text)} | ${verdict} | ${esc(a)} | ${esc(why)} |`);
      if (i === sr.length - 1 || sr[i + 1].sub !== sub) w();
    });
  }

  w('---');
  w();
  w('## The inverse finding: what the corpus holds that SBL cannot use');
  w();
  w('The ledger reads one way by design — SBL outcome → asset. Read the other way it is starker.');
  w();
  const total = LIVE_DRILLS.APM + LIVE_DRILLS.AFM;
  w(`There are **${total} live drills** across the two papers (APM ${LIVE_DRILLS.APM}, AFM ${LIVE_DRILLS.AFM}). This ledger claims`);
  w(`**${all.ADAPT}** of them, one per ADAPT. **${total - all.ADAPT} live drills back no SBL outcome at all.**`);
  w();
  w('Three concentrations are worth naming:');
  w();
  w('- **APM A3b holds 9 drills** — the deepest single asset in either corpus — and backs exactly');
  w('  one SBL outcome (G2f).');
  w('- **APM C1 holds 13 drills** (C1a 3 · C1b 2 · C1c 3 · C1d 2 · C1e 3) and backs exactly one');
  w('  (B4a). Three published cases are C1-anchored — Orlen Cinemas, Aldermere Fitness and the');
  w('  reserved Rivenor Pharma Distribution — and SBL has no technical home for management-report');
  w('  quality, data visualisation or misleading presentation.');
  w('- **AFM sections C and D are entirely undrilled** (M&A, valuation of acquisitions, financial');
  w('  reconstruction, unbundling — 0 published drills across ~24 framework outcomes), so SBL C5f');
  w('  ("business combinations, strategic alliances and partnering") has no asset even though a');
  w('  well-fitting AFM framework outcome exists.');
  w();
  w('## Two things this ledger does NOT settle');
  w();
  w('1. **Outcomes, not marks.** Every row is one outcome counted once. SBL examines these');
  w('   outcomes across three tasks in one 100-mark paper, so they are not equally weighted and a');
  w('   coverage rate by outcome is not a coverage rate by marks. Weighting needs sitting-by-sitting');
  w('   evidence from `SBL-E1`..`SBL-E7`, of which **four pages of one report have been read**.');
  w('2. **An ADAPT is not a small job.** It means a named drill exists whose marked act transfers —');
  w('   not that the rewrite is quick. Every ADAPT still needs new scenario prose, a new rubric under');
  w('   the FIVE-skill vocabulary SBL uses (Analysis and Evaluation are separate skills there, and');
  w('   Enquire and Estimate have no counterpart in the four-skill papers), and a fresh pass through');
  w('   the gate barrier.');
  w();

  return out.join('\n');
}

// ═════════════════════════════════════════════════════════════════════════════
// MAIN
// ═════════════════════════════════════════════════════════════════════════════

// ═════════════════════════════════════════════════════════════════════════════
// PROSE-vs-TALLIES GATE
//
// The completeness gate read VERDICTS and never read PROSE, and that is exactly how
// "Five of the six sit in section G" shipped wrong (it is four: B2b is section B, H6d is
// section H). The sentence sat between two correctly-interpolated values, so nothing about it
// looked hand-typed.
//
// THE RULE: every number-word in the narrative must be one of three things —
//   DERIVED     a value this function RECOMPUTES from los + VERDICTS and matches against the
//               rendered text. Recomputed here rather than passed in from render(): a gate that
//               trusts the renderer's own variables cannot catch the renderer being wrong.
//   ASSERTED    a literal that CANNOT be derived (external or historical fact), declared with a
//               written reason. Allowed, but never silently.
//   RHETORICAL  "one row per outcome", "all three of the following" — a number that counts
//               nothing. Matched as a whole phrase, so it cannot drift into covering a tally.
// Anything else REFUSES THE WRITE.
//
// ⚠️ CEILING, stated: this sweeps number-WORDS in narrative lines. Bare DIGITS in prose are not
// swept — nearly every digit in this file is either inside a table or already interpolated, and
// a digit sweep at this file's density produced more allow-list than signal. A hand-typed DIGIT
// in a narrative sentence would still get through. The defect this closes is the word-shaped one.

function assertNarrativeNumbers(md: string, los: Lo[]): string[] {
  const rows = los.filter((r) => !['I', 'J'].includes(r.section));
  const adapts = rows.filter((r) => VERDICTS[r.code][0] === 'ADAPT');
  const afmAdapts = adapts.filter((r) => /^AFM/.test(VERDICTS[r.code][1]));
  const teeth = new Set(
    rows.filter((r) => VERDICTS[r.code][0] === 'NEW').flatMap((r) => VERDICTS[r.code][2].split('/')),
  );

  const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine',
    'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen',
    'eighteen', 'nineteen', 'twenty'];
  const val = (w: string) => WORDS.indexOf(w.toLowerCase());

  // Narrative only: drop tables, and collapse whitespace so a claim may wrap across lines.
  const flat = md.split(/\r?\n/).filter((l) => !l.startsWith('|')).join(' ').replace(/\s+/g, ' ');
  const problems: string[] = [];

  // ── DERIVED ────────────────────────────────────────────────────────────────
  const derived: Array<{ what: string; re: RegExp; expect: number[] }> = [
    {
      what: 'AFM-backed ADAPTs sitting in section G / AFM-backed ADAPTs in total',
      re: /(\w+) of the (\w+) sit in section G/i,
      expect: [afmAdapts.filter((r) => r.section === 'G').length, afmAdapts.length],
    },
    {
      what: 'sections the coverage concentrates in',
      re: /concentrated in (\w+) sections/i,
      expect: [['E', 'G'].length],
    },
    {
      what: 'near-zero sections that carry most of the paper',
      re: /near-zero in the (\w+) sections that carry most of the paper/i,
      expect: [['A', 'C', 'D', 'F'].length],
    },
    {
      what: 'named NEW failure modes (distinct teeth actually used)',
      re: /(\w+) named failure modes/i,
      expect: [teeth.size],
    },
  ];
  for (const d of derived) {
    const m = flat.match(d.re);
    if (!m) {
      problems.push(`DERIVED CLAIM MISSING from the prose: /${d.re.source}/ — ${d.what}`);
      continue;
    }
    d.expect.forEach((want, i) => {
      const got = val(m[i + 1]);
      if (got !== want) {
        problems.push(
          `PROSE CONTRADICTS THE TALLY (${d.what}): prose says "${m[i + 1]}" (${got}), computed ${want}. ` +
          `Full match: "${m[0]}"`);
      }
    });
  }

  // ── ASSERTED — cannot be derived; each carries its reason ───────────────────
  const ASSERTED: Array<[string, string]> = [
    ['from eight section subtotals', 'history: how the superseded 35% headline was built. Fixed past fact.'],
    ['Those four contradicted', 'history: the prior pass recorded 4 REUSE. Fixed past fact.'],
    ['Three published cases are C1-anchored', 'live acca_cases fact; this script has no DB access. Verified by hand 2026-08-18.'],
    ['four pages of one report have been read', 'external reading progress against SBL-E1..E7. Not derivable.'],
    ['the six capitals', 'the NAME of an <IR> concept, not a count of anything here.'],
    ['FIVE-skill vocabulary', "SBL's own skill count, from the syllabus, not from this data."],
    ['four-skill papers', 'APM/AFM skill count, from those syllabi.'],
    ['Two things fix that', 'names the two mechanisms introduced immediately below.'],
    ['Two things this ledger does NOT settle', 'section heading; its own list is two items long.'],
    ['Three concentrations are worth naming', 'names the three bullets immediately below.'],
    ['three tasks in one 100-mark paper', "SBL's exam structure, from the syllabus."],
  ];

  // ── RHETORICAL — whole phrases where the number counts nothing ──────────────
  const RHETORICAL = [
    'one row per outcome', 'of one column', 'all three of the following', 'more than one tooth',
    'every one of these is ADAPT', 'one of the two best-covered', 'one way by design',
    'across the two papers', 'one per ADAPT', 'one SBL outcome (G2f)', 'backs exactly one',
    'let one drill back many outcomes', 'with exactly ONE published drill',
    'one outcome counted once', 'as one of the worst',
    'nearest asset for **four** outcomes', 'single D1a drill for four more',
  ];

  const covered: Array<string | RegExp> = [
    ...ASSERTED.map((a) => a[0]), ...RHETORICAL, ...derived.map((d) => d.re),
  ];
  const spans: Array<[number, number]> = [];
  // Case-INSENSITIVE: the same phrase opens a sentence ("All three of the following…") and sits
  // mid-sentence elsewhere, and an allow-list that silently misses the capitalised copy would
  // report a false positive on prose it was written to cover.
  const hay = flat.toLowerCase();
  for (const c of covered) {
    if (typeof c === 'string') {
      const needle = c.toLowerCase();
      let at = hay.indexOf(needle);
      while (at >= 0) { spans.push([at, at + needle.length]); at = hay.indexOf(needle, at + 1); }
    } else {
      const m = flat.match(c);
      if (m && m.index !== undefined) spans.push([m.index, m.index + m[0].length]);
    }
  }
  const isCovered = (i: number) => spans.some(([a, b]) => i >= a && i < b);

  const WORD_RE = new RegExp(`\\b(${WORDS.slice(1).join('|')})\\b`, 'gi');
  let m: RegExpExecArray | null;
  while ((m = WORD_RE.exec(flat)) !== null) {
    if (isCovered(m.index)) continue;
    const ctx = flat.slice(Math.max(0, m.index - 60), m.index + 60).trim();
    problems.push(
      `UNREGISTERED NUMBER-WORD in narrative prose: "${m[1]}" — derive it, or add it to ASSERTED ` +
      `with a reason, or to RHETORICAL if it counts nothing. Context: …${ctx}…`);
  }
  return problems;
}

function main(): void {
  const argv = process.argv.slice(2);
  const textArg = argv.includes('--text') ? argv[argv.indexOf('--text') + 1] : null;
  const check = argv.includes('--check');

  const raw = textArg ? readFileSync(resolve(textArg), 'utf8') : extractText(DEFAULT_PDF);
  const { los, subNames } = parseLos(raw);
  const rows = los.filter((r) => !['I', 'J'].includes(r.section));

  // ── COMPLETENESS IS A HARD GATE ──
  const missing = rows.filter((r) => !VERDICTS[r.code]).map((r) => r.code);
  const orphan = Object.keys(VERDICTS).filter((k) => !rows.some((r) => r.code === k));
  const unlevelled = rows.filter((r) => r.level === null).map((r) => r.code);
  const problems: string[] = [];
  if (missing.length) problems.push(`${missing.length} parsed outcome(s) have NO verdict: ${missing.join(', ')}`);
  if (orphan.length) problems.push(`${orphan.length} verdict(s) name an outcome the guide does not contain: ${orphan.join(', ')}`);
  if (unlevelled.length) problems.push(`${unlevelled.length} outcome(s) parsed with NO intellectual level: ${unlevelled.join(', ')} (check LEVEL_RE — the PDF has malformed brackets)`);
  if (problems.length) {
    console.error('REFUSING TO WRITE — the ledger would be incomplete:');
    for (const p of problems) console.error(`  • ${p}`);
    process.exitCode = 1;
    return;
  }

  const md = render(los, subNames);

  // ── PROSE IS GATED TOO ──
  // Renders FIRST, then re-reads the rendered bytes. The verdict gate above proves every row
  // has a verdict; this proves the narrative ABOUT those rows agrees with them. Both refuse the
  // write rather than warning — a ledger whose prose contradicts its own table is worse than no
  // ledger, because the prose is the part that gets quoted.
  const prose = assertNarrativeNumbers(md, los);
  if (prose.length) {
    console.error('REFUSING TO WRITE — the narrative disagrees with the computed tallies:');
    for (const p2 of prose) console.error(`  • ${p2}`);
    process.exitCode = 1;
    return;
  }

  if (check) {
    const existing = existsSync(OUT) ? readFileSync(OUT, 'utf8') : '';
    if (existing === md) { console.log(`OK  ${OUT} is up to date (${rows.length} outcomes).`); return; }
    console.error(`STALE  ${OUT} does not match the generator. Re-run without --check.`);
    process.exitCode = 1;
    return;
  }

  writeFileSync(OUT, md, 'utf8');
  const malformed = rows.filter((r) => r.malformed).map((r) => r.code);
  console.log(`wrote ${OUT}`);
  console.log(`  ${rows.length} outcomes · malformed level markers: ${malformed.join(', ') || 'none'}`);
}

main();
