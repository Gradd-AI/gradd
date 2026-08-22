#!/usr/bin/env tsx
/**
 * sbl-framework.ts
 *
 * ACCA Strategic Business Leader (SBL) framework constants.
 * Source: sbl_s26_j27_syllabus_and_study_guide.pdf (© ACCA 2026-2027), registered in
 * docs/evidence/sources.json as SBL-GUIDE and FETCHED, NOT STORED.
 * Modelled on afm-framework.ts / apm-framework.ts — same row shape, same export surface.
 *
 * 138 learning outcomes across sections A-H, all verbatim from the study guide.
 * Intellectual levels: [2] = Application & analysis, [3] = Synthesis & evaluation.
 * No [1]-level LOs appear in SBL — professional-level strategic exam.
 *
 * ⚠️ GENERATED, NOT HAND-WRITTEN. Emitted by
 * `npm run build:sbl-ledger -- --emit-framework`, which machine-parses the study guide.
 * EDIT THE EMITTER, NEVER THIS FILE — a hand edit is lost on the next run, and
 * hand-copying descriptors is precisely how afm-framework.ts acquired the editorial gloss
 * its VERIFICATION LOG G1 later had to purge.
 *
 * Exam: 3h15m (including Reading, Planning and Reflection time), 100 marks.
 *   ONE integrated case study, THREE tasks of varying marks, all compulsory.
 *   20 of the 100 marks are professional skills marks.
 *   Pre-seen information is released two weeks before the sitting.
 *
 * ── DELIBERATELY ABSENT, so their absence reads as a decision ────────────────
 * NO `LoMode` / `QUANTITATIVE_LOS` / `MIXED_LOS` / `DISCURSIVE_LOS` (AFM has them) and NO
 * `CALCULATION_LOS` (APM has it). Those route numeric verification, and assigning a mode to
 * 138 SBL outcomes would be a per-LO judgement nobody has made. SBL is a single integrated
 * case study with no calculator families, so an invented mode set would be fabricated
 * routing data wearing the shape of parsed data. Add it when a real judgement exists.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Intellectual levels — the three ACCA cognitive levels (bare labels).
// Superscripts [2] and [3] in the study guide correspond to these levels.
// No [1]-level LOs appear in SBL.
//
// ⚠️ TWO LEVEL MARKERS ARE MALFORMED IN THE PUBLISHED PDF — A2d renders `[3}` and H5a
// renders `[3)`. Both are level 3 and are parsed as such. A strict `]` match silently drops
// them and produces a 95/43 level split instead of the correct 92/46.
// ─────────────────────────────────────────────────────────────────────────────

export const INTELLECTUAL_LEVELS = {
  L1: 'Knowledge and comprehension',
  L2: 'Application and analysis',
  L3: 'Synthesis and evaluation',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Section A — Leadership
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_A1_LOS = {
  A1a: { section: 'A' as const, sub_area: 'A1', topic: 'Qualities of leadership', intellectual_level: 3 as const,
    descriptor: 'Explain the role of effective leadership and identify the key leadership traits effective in the successful formulation and implementation of strategy and change management.' },
  A1b: { section: 'A' as const, sub_area: 'A1', topic: 'Qualities of leadership', intellectual_level: 3 as const,
    descriptor: 'Apply the concepts of entrepreneurship and `intrapreuneurship\' to exploit strategic opportunities and to innovate successfully.' },
  A1c: { section: 'A' as const, sub_area: 'A1', topic: 'Qualities of leadership', intellectual_level: 3 as const,
    descriptor: 'Apply, in the context of organisation governance and leadership qualities, the key ethical and professional values underpinning governance.' },
};

const SECTION_A2_LOS = {
  A2a: { section: 'A' as const, sub_area: 'A2', topic: 'Leadership and organisational culture', intellectual_level: 3 as const,
    descriptor: 'Discuss the importance of leadership in defining and managing organisational culture.' },
  A2b: { section: 'A' as const, sub_area: 'A2', topic: 'Leadership and organisational culture', intellectual_level: 2 as const,
    descriptor: 'Advise on the style of leadership appropriate to manage strategic change.' },
  A2c: { section: 'A' as const, sub_area: 'A2', topic: 'Leadership and organisational culture', intellectual_level: 3 as const,
    descriptor: 'Analyse the culture of an organisation, to recommend suitable changes, using appropriate models such as the cultural web.' },
  A2d: { section: 'A' as const, sub_area: 'A2', topic: 'Leadership and organisational culture', intellectual_level: 3 as const,
    descriptor: 'Assess the impact of culture on organisational purpose and strategy.' },
};

const SECTION_A3_LOS = {
  A3a: { section: 'A' as const, sub_area: 'A3', topic: 'Professionalism, ethical codes and the public interest', intellectual_level: 3 as const,
    descriptor: 'Critically evaluate the concept of responsible leadership and the creation of public value by acting in the public interest.' },
  A3b: { section: 'A' as const, sub_area: 'A3', topic: 'Professionalism, ethical codes and the public interest', intellectual_level: 3 as const,
    descriptor: 'Assess management behaviour against the codes of ethics relevant to accounting professionals including the IESBA (IFAC) or professional body codes.' },
  A3c: { section: 'A' as const, sub_area: 'A3', topic: 'Professionalism, ethical codes and the public interest', intellectual_level: 3 as const,
    descriptor: 'Analyse the reasons for conflicts of interest and ethical conflicts in organisations and recommend resolutions.' },
  A3d: { section: 'A' as const, sub_area: 'A3', topic: 'Professionalism, ethical codes and the public interest', intellectual_level: 3 as const,
    descriptor: 'Assess the nature and impact of different ethical threats and recommend appropriate safeguards to prevent or mitigate such threats.' },
  A3e: { section: 'A' as const, sub_area: 'A3', topic: 'Professionalism, ethical codes and the public interest', intellectual_level: 3 as const,
    descriptor: 'Recommend best practice for reducing and combating fraud, bribery and corruption to increase public confidence and trust in organisations.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section B — Governance and sustainability
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_B1_LOS = {
  B1a: { section: 'B' as const, sub_area: 'B1', topic: 'Agency', intellectual_level: 3 as const,
    descriptor: 'Discuss the nature of the principal-agent relationship in the context of governance.' },
  B1b: { section: 'B' as const, sub_area: 'B1', topic: 'Agency', intellectual_level: 3 as const,
    descriptor: 'Analyse the issues connected with the separation of ownership of an organisation from control over its activities.' },
};

const SECTION_B2_LOS = {
  B2a: { section: 'B' as const, sub_area: 'B2', topic: 'Stakeholder analysis and social responsibility', intellectual_level: 3 as const,
    descriptor: 'Discuss, and critically assess, the concept of stakeholder power and interest using the Mendelow model and apply this to strategy and governance.' },
  B2b: { section: 'B' as const, sub_area: 'B2', topic: 'Stakeholder analysis and social responsibility', intellectual_level: 3 as const,
    descriptor: 'Evaluate the stakeholders\' roles, claims and interests in an organisation and how they may conflict and be resolved.' },
  B2c: { section: 'B' as const, sub_area: 'B2', topic: 'Stakeholder analysis and social responsibility', intellectual_level: 2 as const,
    descriptor: 'Explain social responsibility in the context of governance and sustainability for the public good.' },
};

const SECTION_B3_LOS = {
  B3a: { section: 'B' as const, sub_area: 'B3', topic: 'Governance scope and approaches', intellectual_level: 2 as const,
    descriptor: 'Analyse and discuss the role and influence of institutional investors in governance systems and structures.' },
  B3b: { section: 'B' as const, sub_area: 'B3', topic: 'Governance scope and approaches', intellectual_level: 3 as const,
    descriptor: 'Compare rules versus principles-based approaches to governance and advise when they may each be appropriate.' },
  B3c: { section: 'B' as const, sub_area: 'B3', topic: 'Governance scope and approaches', intellectual_level: 2 as const,
    descriptor: 'Discuss different models of organisational ownership that influence different governance regimes (family firms versus joint stock company-based models) and explain how they work in practice.' },
  B3d: { section: 'B' as const, sub_area: 'B3', topic: 'Governance scope and approaches', intellectual_level: 2 as const,
    descriptor: 'Apply the general principles of the International Corporate Governance Network (ICGN)\'s Global Governance Principles to organisations\' corporate governance.' },
};

const SECTION_B4_LOS = {
  B4a: { section: 'B' as const, sub_area: 'B4', topic: 'Reporting to stakeholders', intellectual_level: 3 as const,
    descriptor: 'Discuss the factors that determine organisational policies on reporting to stakeholders, including stakeholder power and interests.' },
  B4b: { section: 'B' as const, sub_area: 'B4', topic: 'Reporting to stakeholders', intellectual_level: 2 as const,
    descriptor: 'Assess the role and value of integrated reporting <IR> and evaluate the issues concerning accounting for sustainability.' },
  B4c: { section: 'B' as const, sub_area: 'B4', topic: 'Reporting to stakeholders', intellectual_level: 3 as const,
    descriptor: 'Advise on the guiding principles, the typical content elements and the six capitals of an integrated report <IR>, and discuss the usefulness of this information to stakeholders.' },
  B4d: { section: 'B' as const, sub_area: 'B4', topic: 'Reporting to stakeholders', intellectual_level: 3 as const,
    descriptor: 'Describe and assess the social and environmental impacts that economic activity can have (in terms of social and environmental `footprints\' and environmental reporting).' },
  B4e: { section: 'B' as const, sub_area: 'B4', topic: 'Reporting to stakeholders', intellectual_level: 2 as const,
    descriptor: 'Describe the main features of internal management systems for underpinning environmental and sustainability accounting such as EMAS and ISO 14000.' },
  B4f: { section: 'B' as const, sub_area: 'B4', topic: 'Reporting to stakeholders', intellectual_level: 2 as const,
    descriptor: 'Examine how the audit of integrated reports <IR> can provide adequate assurance of the relevance and reliability of <IR> to stakeholders.' },
};

const SECTION_B5_LOS = {
  B5a: { section: 'B' as const, sub_area: 'B5', topic: 'The board of directors', intellectual_level: 3 as const,
    descriptor: 'Assess the duties and roles of directors and functions of the board (including setting a responsible `tone\' from the top and being accountable for the performance and impact of the organisation):' },
  B5b: { section: 'B' as const, sub_area: 'B5', topic: 'The board of directors', intellectual_level: 3 as const,
    descriptor: 'Evaluate the case for and against unitary and two-tier board structures.' },
  B5c: { section: 'B' as const, sub_area: 'B5', topic: 'The board of directors', intellectual_level: 3 as const,
    descriptor: 'Describe and assess the purposes, responsibilities and performance of Non- Executive Directors (NEDs).' },
  B5d: { section: 'B' as const, sub_area: 'B5', topic: 'The board of directors', intellectual_level: 3 as const,
    descriptor: 'Describe and assess the importance of induction, performance appraisal and the continuing professional development of directors on the board.' },
  B5e: { section: 'B' as const, sub_area: 'B5', topic: 'The board of directors', intellectual_level: 3 as const,
    descriptor: 'Explain the meaning of `diversity\' and critically evaluate issues relating to diversity on the board of directors.' },
  B5f: { section: 'B' as const, sub_area: 'B5', topic: 'The board of directors', intellectual_level: 3 as const,
    descriptor: 'Assess the importance, roles, purposes and accountabilities of the main board committees in respect of effective governance:' },
  B5g: { section: 'B' as const, sub_area: 'B5', topic: 'The board of directors', intellectual_level: 3 as const,
    descriptor: 'Describe and assess the general principles of remunerating directors and modifying directors\' behaviour to align with stakeholder interests:' },
  B5h: { section: 'B' as const, sub_area: 'B5', topic: 'The board of directors', intellectual_level: 3 as const,
    descriptor: 'Explain and analyse the regulatory, strategic and labour market issues associated with determining directors\' remuneration.' },
};

const SECTION_B6_LOS = {
  B6a: { section: 'B' as const, sub_area: 'B6', topic: 'Public sector governance', intellectual_level: 2 as const,
    descriptor: 'Discuss public sector, private sector, charitable status and non-governmental (NGO and quasi-NGOs) forms of organisation, including agency relationships, stakeholders\' objectives and performance criteria.' },
  B6b: { section: 'B' as const, sub_area: 'B6', topic: 'Public sector governance', intellectual_level: 3 as const,
    descriptor: 'Assess and evaluate the strategic objectives, leadership and governance arrangements that are specific to public sector organisations as contrasted with the private sector.' },
  B6c: { section: 'B' as const, sub_area: 'B6', topic: 'Public sector governance', intellectual_level: 3 as const,
    descriptor: 'Explain democratic control, political influence and policy implementation in public sector organisations.' },
  B6d: { section: 'B' as const, sub_area: 'B6', topic: 'Public sector governance', intellectual_level: 3 as const,
    descriptor: 'Discuss obligations of public sector organisations to meet the economy, effectiveness and efficiency (the 3 E\'s) criteria and promote public value.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section C — Strategy
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_C1_LOS = {
  C1a: { section: 'C' as const, sub_area: 'C1', topic: 'Concepts of strategy', intellectual_level: 2 as const,
    descriptor: 'Explain the fundamental importance of strategy and strategic decisions within different organisational contexts.' },
  C1b: { section: 'C' as const, sub_area: 'C1', topic: 'Concepts of strategy', intellectual_level: 3 as const,
    descriptor: 'Apply the Johnson, Scholes and Whittington model of strategic management �strategic analysis, strategic choices and strategic implementation.' },
};

const SECTION_C2_LOS = {
  C2a: { section: 'C' as const, sub_area: 'C2', topic: 'Environmental issues', intellectual_level: 3 as const,
    descriptor: 'Assess the macro-environment of an organisation using appropriate models such as PESTEL.' },
  C2b: { section: 'C' as const, sub_area: 'C2', topic: 'Environmental issues', intellectual_level: 3 as const,
    descriptor: 'Assess the implications of strategic drift.' },
  C2c: { section: 'C' as const, sub_area: 'C2', topic: 'Environmental issues', intellectual_level: 3 as const,
    descriptor: 'Evaluate the external key drivers of change likely to affect the structure of a sector or market.' },
  C2d: { section: 'C' as const, sub_area: 'C2', topic: 'Environmental issues', intellectual_level: 3 as const,
    descriptor: 'Apply Porter\'s Diamond to explore the influence of national competitiveness on the strategic position of an organisation.' },
  C2e: { section: 'C' as const, sub_area: 'C2', topic: 'Environmental issues', intellectual_level: 3 as const,
    descriptor: 'Assess scenarios reflecting different assumptions about the future environment of an organisation.' },
};

const SECTION_C3_LOS = {
  C3a: { section: 'C' as const, sub_area: 'C3', topic: 'Competitive forces', intellectual_level: 3 as const,
    descriptor: 'Evaluate the sources of competition in an industry or sector using Porter\'s Five Forces framework.' },
  C3b: { section: 'C' as const, sub_area: 'C3', topic: 'Competitive forces', intellectual_level: 2 as const,
    descriptor: 'Analyse customers and markets including market segmentation.' },
  C3c: { section: 'C' as const, sub_area: 'C3', topic: 'Competitive forces', intellectual_level: 2 as const,
    descriptor: 'Apply Porter\'s value chain to assist organisations to identify value adding activities in order to create and sustain competitive advantage.' },
  C3d: { section: 'C' as const, sub_area: 'C3', topic: 'Competitive forces', intellectual_level: 3 as const,
    descriptor: 'Advise on the role and influence of value networks.' },
  C3e: { section: 'C' as const, sub_area: 'C3', topic: 'Competitive forces', intellectual_level: 2 as const,
    descriptor: 'Evaluate the opportunities and threats posed by the competitive environment of an organisation.' },
};

const SECTION_C4_LOS = {
  C4a: { section: 'C' as const, sub_area: 'C4', topic: 'The internal resources, capabilities and competences of an organisation', intellectual_level: 3 as const,
    descriptor: 'Identify and evaluate an organisation\'s strategic capability, its threshold resources, threshold competences, unique resources and core competences.' },
  C4b: { section: 'C' as const, sub_area: 'C4', topic: 'The internal resources, capabilities and competences of an organisation', intellectual_level: 2 as const,
    descriptor: 'Discuss the capabilities required to sustain competitive advantage.' },
  C4c: { section: 'C' as const, sub_area: 'C4', topic: 'The internal resources, capabilities and competences of an organisation', intellectual_level: 2 as const,
    descriptor: 'Discuss the contribution of organisational knowledge to the strategic capability of an organisation.' },
  C4d: { section: 'C' as const, sub_area: 'C4', topic: 'The internal resources, capabilities and competences of an organisation', intellectual_level: 2 as const,
    descriptor: 'Identify and evaluate the strengths and weaknesses of an organisation and formulate an appropriate SWOT analysis.' },
};

const SECTION_C5_LOS = {
  C5a: { section: 'C' as const, sub_area: 'C5', topic: 'Strategic choices', intellectual_level: 3 as const,
    descriptor: 'Assess and advise on the different strategic options available to an organisation.' },
  C5b: { section: 'C' as const, sub_area: 'C5', topic: 'Strategic choices', intellectual_level: 3 as const,
    descriptor: 'Assess the opportunities and potential problems of pursuing different strategies of product/market diversification from a national, multinational and global perspective.' },
  C5c: { section: 'C' as const, sub_area: 'C5', topic: 'Strategic choices', intellectual_level: 3 as const,
    descriptor: 'Advise on how the 7 P\'s, price-based strategies, differentiation and lock-in can help an organisation sustain its competitive advantage.' },
  C5d: { section: 'C' as const, sub_area: 'C5', topic: 'Strategic choices', intellectual_level: 3 as const,
    descriptor: 'Apply the Boston Consulting Group (BCG) and public sector portfolio matrix models to assist organisations in managing their portfolios.' },
  C5e: { section: 'C' as const, sub_area: 'C5', topic: 'Strategic choices', intellectual_level: 2 as const,
    descriptor: 'Recommend generic development directions using the Ansoff growth vector matrix.' },
  C5f: { section: 'C' as const, sub_area: 'C5', topic: 'Strategic choices', intellectual_level: 3 as const,
    descriptor: 'Assess how internal development, business combinations, strategic alliances and partnering can be used to achieve business growth.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section D — Risk
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_D1_LOS = {
  D1a: { section: 'D' as const, sub_area: 'D1', topic: 'Identification, assessment and measurement of risk', intellectual_level: 3 as const,
    descriptor: 'Discuss the relationship between organisational strategy and risk management strategy.' },
  D1b: { section: 'D' as const, sub_area: 'D1', topic: 'Identification, assessment and measurement of risk', intellectual_level: 2 as const,
    descriptor: 'Apply the enterprise risk management (ERM) approach to risk management and for establishing risk management systems.' },
  D1c: { section: 'D' as const, sub_area: 'D1', topic: 'Identification, assessment and measurement of risk', intellectual_level: 3 as const,
    descriptor: 'Identify and evaluate key risks, including environmental and climate related risks, and their impact on organisations and projects.' },
  D1d: { section: 'D' as const, sub_area: 'D1', topic: 'Identification, assessment and measurement of risk', intellectual_level: 2 as const,
    descriptor: 'Distinguish between strategic and operational risks.' },
  D1e: { section: 'D' as const, sub_area: 'D1', topic: 'Identification, assessment and measurement of risk', intellectual_level: 2 as const,
    descriptor: 'Assess attitudes towards risk and risk appetite and how this can affect risk policy.' },
  D1f: { section: 'D' as const, sub_area: 'D1', topic: 'Identification, assessment and measurement of risk', intellectual_level: 2 as const,
    descriptor: 'Discuss the dynamic nature of risk and the ways in which risk varies in relation to the size, structure, industry, sector and development of an organisation.' },
  D1g: { section: 'D' as const, sub_area: 'D1', topic: 'Identification, assessment and measurement of risk', intellectual_level: 2 as const,
    descriptor: 'Assess the severity and probability of risk events.' },
  D1h: { section: 'D' as const, sub_area: 'D1', topic: 'Identification, assessment and measurement of risk', intellectual_level: 3 as const,
    descriptor: 'Explain and evaluate the concepts of related and correlated risk factors.' },
};

const SECTION_D2_LOS = {
  D2a: { section: 'D' as const, sub_area: 'D2', topic: 'Managing, monitoring and mitigating risk', intellectual_level: 3 as const,
    descriptor: 'Explain and assess the role of a risk manager.' },
  D2b: { section: 'D' as const, sub_area: 'D2', topic: 'Managing, monitoring and mitigating risk', intellectual_level: 3 as const,
    descriptor: 'Evaluate a risk register and use heat maps when identifying or monitoring risk.' },
  D2c: { section: 'D' as const, sub_area: 'D2', topic: 'Managing, monitoring and mitigating risk', intellectual_level: 3 as const,
    descriptor: 'Evaluate the concept of embedding risk in an organisation\'s culture and values.' },
  D2d: { section: 'D' as const, sub_area: 'D2', topic: 'Managing, monitoring and mitigating risk', intellectual_level: 2 as const,
    descriptor: 'Explain and analyse the concepts of spreading and diversifying risk and when this would be appropriate.' },
  D2e: { section: 'D' as const, sub_area: 'D2', topic: 'Managing, monitoring and mitigating risk', intellectual_level: 3 as const,
    descriptor: 'Advise on risk management strategies, including the use of the TARA model.' },
  D2f: { section: 'D' as const, sub_area: 'D2', topic: 'Managing, monitoring and mitigating risk', intellectual_level: 3 as const,
    descriptor: 'Explain and assess the benefits of incurring or accepting some risk as part of competitively managing an organisation referring to the `as low as reasonably practicable\' (ALARP) principle.' },
  D2g: { section: 'D' as const, sub_area: 'D2', topic: 'Managing, monitoring and mitigating risk', intellectual_level: 3 as const,
    descriptor: 'Apply the concept of assurance mapping to modern risk management using the \'four lines of defence\'' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section E — Technology and data analytics
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_E1_LOS = {
  E1a: { section: 'E' as const, sub_area: 'E1', topic: 'Cloud, mobile and smart technology', intellectual_level: 3 as const,
    descriptor: 'Discuss, from a strategic perspective, the need to explore opportunities for adopting new technologies such as cloud, mobile and smart technology within an organisation.' },
  E1b: { section: 'E' as const, sub_area: 'E1', topic: 'Cloud, mobile and smart technology', intellectual_level: 2 as const,
    descriptor: 'Discuss key benefits and risks of cloud, mobile and smart technology.' },
  E1c: { section: 'E' as const, sub_area: 'E1', topic: 'Cloud, mobile and smart technology', intellectual_level: 3 as const,
    descriptor: 'Assess and advise on using the cloud as an alternative to owned hardware and software technology to support organisation information system needs.' },
};

const SECTION_E2_LOS = {
  E2a: { section: 'E' as const, sub_area: 'E2', topic: 'Big data and data analytics', intellectual_level: 3 as const,
    descriptor: 'Discuss how information technology and data analysis can effectively be used to inform and implement organisational strategy.' },
  E2b: { section: 'E' as const, sub_area: 'E2', topic: 'Big data and data analytics', intellectual_level: 2 as const,
    descriptor: 'Describe big data and discuss the opportunities and threats big data presents to organisations.' },
  E2c: { section: 'E' as const, sub_area: 'E2', topic: 'Big data and data analytics', intellectual_level: 3 as const,
    descriptor: 'Identify and analyse relevant data for strategic decisions on new product developments, marketing and pricing.' },
};

const SECTION_E3_LOS = {
  E3a: { section: 'E' as const, sub_area: 'E3', topic: 'Machine learning, AI and robotics', intellectual_level: 2 as const,
    descriptor: 'Explain the potential benefits of using artificial intelligence (AI), robotics and other forms of machine learning to support strategic decisions and the pursuit of corporate objectives.' },
  E3b: { section: 'E' as const, sub_area: 'E3', topic: 'Machine learning, AI and robotics', intellectual_level: 3 as const,
    descriptor: 'Assess the risk, control and ethical implications of using AI, robotics and other forms of machine learning.' },
};

const SECTION_E4_LOS = {
  E4a: { section: 'E' as const, sub_area: 'E4', topic: 'E- business: value chain', intellectual_level: 3 as const,
    descriptor: 'Assess the organisation\'s approach to delivering e-business.' },
  E4b: { section: 'E' as const, sub_area: 'E4', topic: 'E- business: value chain', intellectual_level: 3 as const,
    descriptor: 'Assess and advise on the potential application of information technology to support e- business.' },
  E4c: { section: 'E' as const, sub_area: 'E4', topic: 'E- business: value chain', intellectual_level: 2 as const,
    descriptor: 'Explore the characteristics of e-marketing using the 6 I\'s of interactivity, intelligence, individualisation, integration, industry structure and independence of location.' },
  E4d: { section: 'E' as const, sub_area: 'E4', topic: 'E- business: value chain', intellectual_level: 2 as const,
    descriptor: 'Assess the importance of online branding in e-marketing and compare it with traditional branding.' },
  E4e: { section: 'E' as const, sub_area: 'E4', topic: 'E- business: value chain', intellectual_level: 2 as const,
    descriptor: 'Explore different methods of acquiring and managing suppliers and customers through exploiting e-business technologies.' },
};

const SECTION_E5_LOS = {
  E5a: { section: 'E' as const, sub_area: 'E5', topic: 'IT systems security and control', intellectual_level: 3 as const,
    descriptor: 'Discuss, from a strategic perspective, the continuing need for effective information systems control within an organisation.' },
  E5b: { section: 'E' as const, sub_area: 'E5', topic: 'IT systems security and control', intellectual_level: 3 as const,
    descriptor: 'Assess and advise on the adequacy of information technology and systems security controls for an organisation.' },
  E5c: { section: 'E' as const, sub_area: 'E5', topic: 'IT systems security and control', intellectual_level: 3 as const,
    descriptor: 'Evaluate and recommend ways to promote cyber security.' },
  E5d: { section: 'E' as const, sub_area: 'E5', topic: 'IT systems security and control', intellectual_level: 3 as const,
    descriptor: 'Evaluate and recommend improvements or changes to controls over the safeguard of information technology assets, to ensure the organisation meets its business objectives.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section F — Organisational control and audit
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_F1_LOS = {
  F1a: { section: 'F' as const, sub_area: 'F1', topic: 'Management and internal control systems', intellectual_level: 3 as const,
    descriptor: 'Evaluate the key features of effective internal control systems such as those included in the COSO framework.' },
  F1b: { section: 'F' as const, sub_area: 'F1', topic: 'Management and internal control systems', intellectual_level: 3 as const,
    descriptor: 'Assess whether information flows to management are adequate for the purpose of managing internal control and risk.' },
  F1c: { section: 'F' as const, sub_area: 'F1', topic: 'Management and internal control systems', intellectual_level: 3 as const,
    descriptor: 'Evaluate the effectiveness and potential weaknesses of internal control systems.' },
  F1d: { section: 'F' as const, sub_area: 'F1', topic: 'Management and internal control systems', intellectual_level: 2 as const,
    descriptor: 'Discuss and advise on the importance of sound internal control and legal and regulatory compliance and the consequences to an organisation of poor control and non-compliance.' },
  F1e: { section: 'F' as const, sub_area: 'F1', topic: 'Management and internal control systems', intellectual_level: 2 as const,
    descriptor: 'Recommend new internal control systems or changes to the components of existing systems to help prevent fraud, error, waste or harmful environmental impacts.' },
};

const SECTION_F2_LOS = {
  F2a: { section: 'F' as const, sub_area: 'F2', topic: 'Audit and compliance', intellectual_level: 3 as const,
    descriptor: 'Examine the need for an internal audit function in the light of regulatory and organisational requirements.' },
  F2b: { section: 'F' as const, sub_area: 'F2', topic: 'Audit and compliance', intellectual_level: 3 as const,
    descriptor: 'Justify the importance of auditor independence in all client-auditor situations (including internal audit) and the role of internal audit in compliance.' },
  F2c: { section: 'F' as const, sub_area: 'F2', topic: 'Audit and compliance', intellectual_level: 2 as const,
    descriptor: 'Justify the importance of having an effective internal audit committee overseeing the internal audit function.' },
  F2d: { section: 'F' as const, sub_area: 'F2', topic: 'Audit and compliance', intellectual_level: 3 as const,
    descriptor: 'Assess the appropriate responses to auditors\' recommendations.' },
};

const SECTION_F3_LOS = {
  F3a: { section: 'F' as const, sub_area: 'F3', topic: 'Internal control and management reporting', intellectual_level: 3 as const,
    descriptor: 'Justify the need for reports on internal controls to shareholders.' },
  F3b: { section: 'F' as const, sub_area: 'F3', topic: 'Internal control and management reporting', intellectual_level: 2 as const,
    descriptor: 'Discuss the typical contents of a report on internal control and internal audit including environmental and sustainability audits.' },
  F3c: { section: 'F' as const, sub_area: 'F3', topic: 'Internal control and management reporting', intellectual_level: 3 as const,
    descriptor: 'Assess how internal controls underpin and provide information for reliable financial and sustainable reporting.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section G — Finance in planning and decision-making
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_G1_LOS = {
  G1a: { section: 'G' as const, sub_area: 'G1', topic: 'Finance transformation', intellectual_level: 2 as const,
    descriptor: 'Discuss how advances in technology are transforming the finance sector and the role and structure of the finance function within organisations.' },
  G1b: { section: 'G' as const, sub_area: 'G1', topic: 'Finance transformation', intellectual_level: 3 as const,
    descriptor: 'Evaluate alternative structures for the finance function using business partnering, outsourcing and shared or global business services.' },
};

const SECTION_G2_LOS = {
  G2a: { section: 'G' as const, sub_area: 'G2', topic: 'Financial analysis and decision-making techniques', intellectual_level: 2 as const,
    descriptor: 'Determine the overall investment requirements of the organisation.' },
  G2b: { section: 'G' as const, sub_area: 'G2', topic: 'Financial analysis and decision-making techniques', intellectual_level: 3 as const,
    descriptor: 'Assess and advise on alternative sources of short and long-term finance available to the organisation to support strategy and operations.' },
  G2c: { section: 'G' as const, sub_area: 'G2', topic: 'Financial analysis and decision-making techniques', intellectual_level: 3 as const,
    descriptor: 'Review and justify decisions to select or abandon competing investments. applying suitable investment appraisal techniques.' },
  G2d: { section: 'G' as const, sub_area: 'G2', topic: 'Financial analysis and decision-making techniques', intellectual_level: 3 as const,
    descriptor: 'Justify strategic and operational decisions taking into account risk and uncertainty.' },
  G2e: { section: 'G' as const, sub_area: 'G2', topic: 'Financial analysis and decision-making techniques', intellectual_level: 2 as const,
    descriptor: 'Assess the broad financial reporting and tax implications of taking alternative strategic or investment decisions.' },
  G2f: { section: 'G' as const, sub_area: 'G2', topic: 'Financial analysis and decision-making techniques', intellectual_level: 3 as const,
    descriptor: 'Assess organisational performance and position using appropriate performance management techniques, key performance indicators (KPIs) and ratios.' },
};

const SECTION_G3_LOS = {
  G3a: { section: 'G' as const, sub_area: 'G3', topic: 'Cost and management accounting', intellectual_level: 3 as const,
    descriptor: 'Discuss, from a strategic perspective, the continuing need for effective cost management and control systems within organisations.' },
  G3b: { section: 'G' as const, sub_area: 'G3', topic: 'Cost and management accounting', intellectual_level: 3 as const,
    descriptor: 'Evaluate methods of forecasting, budgeting, standard costing and variance analysis in support of strategic planning and decision making.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Section H — Enabling success, managing change and innovation
// ─────────────────────────────────────────────────────────────────────────────

const SECTION_H1_LOS = {
  H1a: { section: 'H' as const, sub_area: 'H1', topic: 'Enabling success: organising', intellectual_level: 3 as const,
    descriptor: 'Advise on how organisational structure and internal relationships can be re- organised to deliver a selected strategy.' },
  H1b: { section: 'H' as const, sub_area: 'H1', topic: 'Enabling success: organising', intellectual_level: 3 as const,
    descriptor: 'Advise on the implications of collaborative working and partnering, including franchising, process outsourcing, shared services and global business services.' },
};

const SECTION_H2_LOS = {
  H2a: { section: 'H' as const, sub_area: 'H2', topic: 'Enabling success: disruptive technology', intellectual_level: 3 as const,
    descriptor: 'Identify and assess the potential impact of disruptive technologies such as Fintech, including cryptocurrencies.' },
  H2b: { section: 'H' as const, sub_area: 'H2', topic: 'Enabling success: disruptive technology', intellectual_level: 2 as const,
    descriptor: 'Assess the impact of new products, processes, service developments and innovation in supporting organisation strategy.' },
};

const SECTION_H3_LOS = {
  H3a: { section: 'H' as const, sub_area: 'H3', topic: 'Enabling success: talent management', intellectual_level: 3 as const,
    descriptor: 'Discuss how talent management can contribute to supporting organisational strategy.' },
  H3b: { section: 'H' as const, sub_area: 'H3', topic: 'Enabling success: talent management', intellectual_level: 3 as const,
    descriptor: 'Analyse opportunities for organisational improvement using the four view POPIT (people, organisation, processes and information technology) model.' },
};

const SECTION_H4_LOS = {
  H4a: { section: 'H' as const, sub_area: 'H4', topic: 'Enabling success: performance excellence', intellectual_level: 3 as const,
    descriptor: 'Apply the Baldrige model for world class organisations to achieve and maintain business performance excellence.' },
  H4b: { section: 'H' as const, sub_area: 'H4', topic: 'Enabling success: performance excellence', intellectual_level: 3 as const,
    descriptor: 'Assess and advise on how an organisation can be empowered to reach its strategic goals, improve its results and be more competitive, focusing on its critical success factors (CSF).' },
};

const SECTION_H5_LOS = {
  H5a: { section: 'H' as const, sub_area: 'H5', topic: 'Managing strategic change', intellectual_level: 3 as const,
    descriptor: 'Evaluate the effectiveness of current organisational processes.' },
  H5b: { section: 'H' as const, sub_area: 'H5', topic: 'Managing strategic change', intellectual_level: 2 as const,
    descriptor: 'Evaluate different types of strategic change and assess their implications.' },
  H5c: { section: 'H' as const, sub_area: 'H5', topic: 'Managing strategic change', intellectual_level: 3 as const,
    descriptor: 'Establish an appropriate scope and focus for organisational process change using Harmon\'s process-strategy matrix.' },
  H5d: { section: 'H' as const, sub_area: 'H5', topic: 'Managing strategic change', intellectual_level: 3 as const,
    descriptor: 'Assess and advise on possible redesign options for improving the current processes of an organisation.' },
  H5e: { section: 'H' as const, sub_area: 'H5', topic: 'Managing strategic change', intellectual_level: 2 as const,
    descriptor: 'Recommend a process redesign methodology for an organisation.' },
  H5f: { section: 'H' as const, sub_area: 'H5', topic: 'Managing strategic change', intellectual_level: 2 as const,
    descriptor: 'Manage change in the organisation using models such as Lewin\'s three stage model.' },
  H5g: { section: 'H' as const, sub_area: 'H5', topic: 'Managing strategic change', intellectual_level: 3 as const,
    descriptor: 'Assess implications of change in an organisation using Balogun and Hope Hailey\'s contextual features.' },
};

const SECTION_H6_LOS = {
  H6a: { section: 'H' as const, sub_area: 'H6', topic: 'Leading and managing projects', intellectual_level: 2 as const,
    descriptor: 'Determine the distinguishing features of projects and the constraints they operate in.' },
  H6b: { section: 'H' as const, sub_area: 'H6', topic: 'Leading and managing projects', intellectual_level: 2 as const,
    descriptor: 'Discuss the implications of the triple constraints of scope, time and cost.' },
  H6c: { section: 'H' as const, sub_area: 'H6', topic: 'Leading and managing projects', intellectual_level: 2 as const,
    descriptor: 'Prepare a business case document and project initiation document.' },
  H6d: { section: 'H' as const, sub_area: 'H6', topic: 'Leading and managing projects', intellectual_level: 3 as const,
    descriptor: 'Analyse, assess and classify the costs and benefits of a project investment.' },
  H6e: { section: 'H' as const, sub_area: 'H6', topic: 'Leading and managing projects', intellectual_level: 2 as const,
    descriptor: 'Establish the role and responsibilities of the project manager and the project sponsor.' },
  H6f: { section: 'H' as const, sub_area: 'H6', topic: 'Leading and managing projects', intellectual_level: 3 as const,
    descriptor: 'Assess the importance of developing a project plan and its key elements.' },
  H6g: { section: 'H' as const, sub_area: 'H6', topic: 'Leading and managing projects', intellectual_level: 2 as const,
    descriptor: 'Monitor and control project risks and slippages, recommending improvements.' },
  H6h: { section: 'H' as const, sub_area: 'H6', topic: 'Leading and managing projects', intellectual_level: 2 as const,
    descriptor: 'Discuss the benefits of a post- implementation and a post-project review.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// The full syllabus map. Professional skills (section I) and employability skills
// (section J) are held SEPARATELY, mirroring afm-framework.ts / apm-framework.ts —
// they are not learning outcomes and must never be drilled as if they were.
// ─────────────────────────────────────────────────────────────────────────────

export const SYLLABUS_MAP = {
  ...SECTION_A1_LOS, ...SECTION_A2_LOS, ...SECTION_A3_LOS,
  ...SECTION_B1_LOS, ...SECTION_B2_LOS, ...SECTION_B3_LOS, ...SECTION_B4_LOS, ...SECTION_B5_LOS, ...SECTION_B6_LOS,
  ...SECTION_C1_LOS, ...SECTION_C2_LOS, ...SECTION_C3_LOS, ...SECTION_C4_LOS, ...SECTION_C5_LOS,
  ...SECTION_D1_LOS, ...SECTION_D2_LOS,
  ...SECTION_E1_LOS, ...SECTION_E2_LOS, ...SECTION_E3_LOS, ...SECTION_E4_LOS, ...SECTION_E5_LOS,
  ...SECTION_F1_LOS, ...SECTION_F2_LOS, ...SECTION_F3_LOS,
  ...SECTION_G1_LOS, ...SECTION_G2_LOS, ...SECTION_G3_LOS,
  ...SECTION_H1_LOS, ...SECTION_H2_LOS, ...SECTION_H3_LOS, ...SECTION_H4_LOS, ...SECTION_H5_LOS, ...SECTION_H6_LOS,
} as const;

export type LoCode = keyof typeof SYLLABUS_MAP;

// ─────────────────────────────────────────────────────────────────────────────
// Section names, from the detailed study guide headers.
// ─────────────────────────────────────────────────────────────────────────────

export const SECTIONS = {
  A: 'Leadership',
  B: 'Governance and sustainability',
  C: 'Strategy',
  D: 'Risk',
  E: 'Technology and data analytics',
  F: 'Organisational control and audit',
  G: 'Finance in planning and decision-making',
  H: 'Enabling success, managing change and innovation',
  I: 'Professional skills',
  J: 'Other employability and digital skills',
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Command verbs — DERIVED, not curated: the leading word of every LO descriptor, with the
// intellectual levels it actually appears at across the syllabus. Regenerated with the file,
// so it can never drift from the descriptors above. No `typical_use` gloss: AFM/APM carry
// hand-written ones, and a generated gloss would be invention rather than extraction.
// ─────────────────────────────────────────────────────────────────────────────

export const COMMAND_VERBS: Record<string, { levels: (2 | 3)[] }> = {
  advise: { levels: [2, 3] },
  analyse: { levels: [2, 3] },
  apply: { levels: [2, 3] },
  assess: { levels: [2, 3] },
  compare: { levels: [3] },
  critically: { levels: [3] },
  describe: { levels: [2, 3] },
  determine: { levels: [2] },
  discuss: { levels: [2, 3] },
  distinguish: { levels: [2] },
  establish: { levels: [2, 3] },
  evaluate: { levels: [2, 3] },
  examine: { levels: [2, 3] },
  explain: { levels: [2, 3] },
  explore: { levels: [2] },
  identify: { levels: [2, 3] },
  justify: { levels: [2, 3] },
  manage: { levels: [2] },
  monitor: { levels: [2] },
  prepare: { levels: [2] },
  recommend: { levels: [2, 3] },
  review: { levels: [3] },
};

// ─────────────────────────────────────────────────────────────────────────────
// Professional skills — section I (verbatim, guide pp.16-17). All sub-descriptors are
// intellectual level [3].
//
// ⚠️ SBL HAS FIVE PROFESSIONAL SKILLS AND THE FOUR-SKILL PAPERS HAVE FOUR. They are NOT a
// superset: APM/AFM carry a single combined `analysis_and_evaluation`, while SBL splits
// Analysis and Evaluation into two separately-marked skills. Evaluation also absorbs
// ESTIMATE (forecasting trends), which has no counterpart in the four-skill papers, and
// Analysis absorbs ENQUIRE. Never map an SBL skill tag onto an APM/AFM one by name.
// ─────────────────────────────────────────────────────────────────────────────

export const PROFESSIONAL_SKILLS = {
  communication: {
    label: 'Communication',
    intellectual_level: 3 as const,
    sub_descriptors: [
      'Inform concisely, objectively, and unambiguously, while being sensitive to cultural differences, using appropriate media and technology.',
      'Persuade using compelling and logical arguments demonstrating the ability to counter argue when appropriate.',
      'Clarify and simplify complex issues to convey relevant information in a way that adopts an appropriate tone and is easily understood by the intended audience.',
    ],
  },
  commercial_acumen: {
    label: 'Commercial acumen',
    intellectual_level: 3 as const,
    sub_descriptors: [
      'Demonstrate awareness of organisational and wider external factors affecting the work of an individual or a team in contributing to the wider organisational objectives.',
      'Use judgement to identify key issues in determining how to address or resolve problems and in proposing and recommending the solutions to be implemented.',
      'Show insight and perception in understanding work-related and organisational issues, including the management of conflict, demonstrating acumen in arriving at appropriate solutions or outcomes.',
    ],
  },
  analysis: {
    label: 'Analysis',
    intellectual_level: 3 as const,
    sub_descriptors: [
      'Investigate relevant information from a wide range of sources, using a variety of analytical techniques to establish the reasons and causes of problems, or to identify opportunities or solutions.',
      'Enquire of individuals or analyse appropriate data sources to obtain suitable evidence to corroborate or dispute existing beliefs or opinion and come to appropriate conclusions.',
      'Consider information, evidence and findings carefully, reflecting on their implications and how they can be used in the interests of the department and wider organisational goals.',
    ],
  },
  scepticism: {
    label: 'Scepticism',
    intellectual_level: 3 as const,
    sub_descriptors: [
      'Probe deeply into the underlying reasons for issues and problems, beyond what is immediately apparent from the usual sources and opinions available.',
      'Question facts, opinions and assertions, by seeking justifications and obtaining sufficient evidence for their support and acceptance.',
      'Challenge information presented or decisions made, where this is clearly justified, in a professional and courteous manner; in the wider professional, ethical, organisational, or public interest.',
    ],
  },
  evaluation: {
    label: 'Evaluation',
    intellectual_level: 3 as const,
    sub_descriptors: [
      'Assess and use professional judgement when considering organisational issues, problems or when making decisions; taking into account the implications of such decisions on the organisation and those affected.',
      'Estimate trends or make reasoned forecasts of the implications of external and internal factors on the organisation, or of the outcomes of decisions available to the organisation.',
      'Appraise facts, opinions and findings objectively, with a view to balancing the costs, risks, benefits and opportunities, before making or recommending solutions or decisions.',
    ],
  },
} as const;

export type ProfessionalSkillTag = keyof typeof PROFESSIONAL_SKILLS;

// ─────────────────────────────────────────────────────────────────────────────
// Employability and digital skills — section J (verbatim, guide p.17). NO intellectual-level
// superscripts in the source, so no level is recorded. Held separately, not in SYLLABUS_MAP.
// ─────────────────────────────────────────────────────────────────────────────

export const EMPLOYABILITY_SKILLS: readonly string[] = [
  'Use computer technology to efficiently access and manipulate relevant information.',
  'Work on relevant response options, using available functions and technology, as would be required in the workplace.',
  'Navigate windows and computer screens to create and amend responses to exam requirements, using the appropriate tools.',
  'Present data and information effectively, using the appropriate tools.',
];

// ─────────────────────────────────────────────────────────────────────────────
// Exam structure — verbatim from the guide §7 (pp.18-19) and §9 (p.20).
//
// ⚠️ SBL HAS NO SECTIONS IN ITS EXAM. APM and AFM both split into a Section A case and a
// Section B of scenario questions; SBL is ONE integrated case study of three tasks. Any
// consumer branching on `section_a` / `section_b` must not be pointed at this paper.
// ─────────────────────────────────────────────────────────────────────────────

export const EXAM_STRUCTURE = {
  duration_minutes:  195,   // 3 hours 15 minutes, INCLUDING Reading, Planning and Reflection
                            // time (RPRT), which the candidate may use flexibly at any point.
  total_marks:       100,
  pass_mark_percent: 50,
  format:            'integrated_case_study' as const,   // 100% integrated case study
  task_count:        3,     // "Each exam will contain three tasks with a varying number of marks."
  all_tasks_compulsory: true,
  marks_professional_skills: 20,   // "Within the total marks available, there are 20 professional skills marks."
  professional_skills_examined: 'all_five' as const,
  pre_seen: {
    released_weeks_before: 2,
    description: 'Background and contextual information on the fictitious organisation the exam is based on and the industry in which it operates. Students are not expected to conduct further research into the industry.',
  },
  professional_skills_behaviours: [
    'communication', 'commercial_acumen', 'analysis', 'scepticism', 'evaluation',
  ] as const,
  // Guide §6: "There have been no additions, deletions or amendments to the syllabus for
  // September 2026 to June 2027."
  syllabus_changes_this_cycle: 'none' as const,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// DrillSpec — type for a single SBL practice item (mirrors afm-framework.ts / apm-framework.ts).
// NO `mode` / `calculation_required` field: see the header note on deliberate absences.
// ─────────────────────────────────────────────────────────────────────────────

export interface DrillSpec {
  lo_code:                 LoCode;
  topic:                   string;
  command_verb:            string;
  intellectual_level:      2 | 3;
  professional_skill_tag?: ProfessionalSkillTag;
  marks_guide:             number;
}
