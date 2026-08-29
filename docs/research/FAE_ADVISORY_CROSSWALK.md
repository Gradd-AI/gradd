# FAE Advisory × Gradd — asset crosswalk

**Status: decision document.** It records what exists, what does not, and what cannot be
established. It contains no timeline and no recommendation; those are separate decisions and
deliberately absent.

---

## 0. Edition, and the thing that is not in hand

| | |
|---|---|
| **Base edition** | **FAE Competency Statement 2025/2026** (Chartered Accountants Ireland), FAE Core & FAE Electives, 64pp. Advisory is an **elective**, pp.47–51. |
| **Assessment basis quoted from** | p.51 (Assessment 2025/2026 — FAE Elective — Advisory) |
| **2026/27 statement** | **NOT AVAILABLE.** It sits inside CAI's Learning Hub, behind student authentication. It was not obtainable for this crosswalk. |
| **2026/27 delta** | **NOT APPLIED.** No public 2026/27 summary of changes exists either — see §0.1. |

> ### ⚠️ Re-running this against the 2026/27 statement is a hard prerequisite to any commercial release, not a nice-to-have.
>
> 2026/27 is the cycle a product would sell into. Every verdict below is pinned to 2025/26
> competency numbering. If CAI adds, removes, renumbers or rewords a competency — and the
> two previous editions each shipped with a summary-of-changes document, so movement is the
> norm rather than the exception — then the affected rows are wrong, and the counts in §3 are
> wrong with them. Nothing here should be treated as a 2026/27 finding.

### 0.1 The public record was enumerated, and it stops at 2025/26

Every `/docs/` link on CAI's FAE downloads page was listed. There are exactly four:
competency statements for **2024/25** and **2025/26**, and summary-of-changes documents for
those same two years. There is **no public 2026/27 competency statement and no public 2026/27
summary of changes.**

That is itself a finding: obtaining Learning Hub access legitimately is a prerequisite to a
commercial release, because the delta cannot be inferred from anything published.

### 0.2 IP handling

CAI requires **written permission** before any part of the competency statement is stored in a
retrieval system. Accordingly:

- The PDF is a **local working copy only**, under `docs/FAE/`, which is **git-ignored**
  (`.gitignore:82`, `docs/FAE/`). It is not committed and cannot be staged.
- It is **not** in any vector store, index, or RAG corpus.
- **No wording from it is reproduced in this document.** Every competency below is referenced
  by **CAI's own numbering** and **paraphrased**.
- Registered in `docs/evidence/sources.json` (`syllabus_sources`, id **E7**) as
  fetched-not-stored, with the edition named — the same treatment the ACCA examiner reports get.

**Out of scope:** the CAP2 competency statement and CAP2 summary of changes, also present in
`docs/FAE/`. This crosswalk is FAE Advisory only.

---

## 1. The competency population

FAE Advisory's specific functional competencies, as numbered by CAI (pp.48–50):

| Area | CAI numbering | Individual competencies |
|---|---|---|
| 1. International Business — Strategy, Culture, Governance, Organisation | 1.1 – 1.7 | 7 |
| 2. Decision Making in an International Context | 2.1 – 2.9 | 9 |
| 3. International Treasury Management | 3.1 – 3.3 | 3 |
| 4. Management Accounting, Performance Measurement, Management Information & Control | 4.1 – 4.3 | 3 |
| 5. Leadership and Soft Skills | 5.1 – 5.2 | 2 |
| | | **24** |

> **The count is 24 individual competencies**, not the five headline areas. CAI marks each with a
> demanded level — **U** (understand), **A** (applies), **I** (integrates). Of the 24: **21 are I**,
> **2 are A** (2.8, and area 3 is A throughout — 3.1/3.2/3.3), **1 is U** (2.2). Restated
> precisely: **U = 1** (2.2), **A = 4** (2.8, 3.1, 3.2, 3.3), **I = 19**.

Separately listed on p.50 as **examinable guidance and standards** (not numbered competencies,
so excluded from the 24): the **UK Corporate Governance Code (2024)**, and the **Irish Corporate
Governance Code (2024)**, the latter ROI-only and to be read alongside the UK Code. Both at
level **I**. Both are Irish/UK-jurisdictional and carry an IRISH-SOURCE consequence — see §2.6.

**Assessment (p.51):** open book · **two independent simulations (case studies)** · **4 hours
30 minutes** · August 2026 · **at least 4 of the 5 topic areas examinable** · any one competency
area up to circa **40%**.

---

## 2. Competency-by-competency crosswalk

> ### ♻️ RE-RUN 2026-08-29 — FIVE LABELS, NOT THREE, AND THE SBL CORPUS IS IN
>
> The first pass used REUSE / ADAPT / NEW. Those three collapse four different kinds of reuse
> into one word and then lose three of them, which is how it reported **Area 1 as 7-for-7 NEW**
> while APM's own corpus names SWOT, PEST and Mendelow explicitly. The re-run also includes the
> **SBL corpus, which did not exist when the first pass ran** and which turns out to serve Area 5
> directly. **The old counts (5 REUSE / 8 ADAPT / 11 NEW) are SUPERSEDED — see §3.0.**

**The five labels:**

| | Label | Means |
|---|---|---|
| **T** | **direct technical reuse** | An existing asset teaches the technical content the competency names. Only the scenario changes. |
| **C** | **calculation-engine reuse** | The calculator module, its schema builder, its model-answer builder and its gates transfer. The numeric spine is built and code-owned. |
| **M** | **answer/marking-structure reuse** | **The content is new.** What transfers is an existing asset that marks the SAME ACT — a rubric whose criteria/disqualifier/golden-pair structure, or whose named-audience shape, carries over. |
| **R** | **existing asset needing FAE re-authoring** | An asset exists but its TECHNICAL content must change — jurisdiction, method, or a materially different framing. |
| **N** | **genuinely net-new** | No asset, no engine, no transferable rubric. |

**IRISH-SOURCE** remains a flag that can accompany any label: Irish statutory or regulatory
material is needed before the row can be written.

**Two decision rules, stated so the labels mean something:**

1. **A scenario change never demotes a label.** Every FAE case is a new scenario by construction;
   if "needs a new scenario" counted as re-authoring, **R** would swallow all 24 rows. **R** is for
   content that must change, not content that must be re-set.
2. **The primary label is the one describing the largest part of the work saved**, and a gap
   inside a served competency is recorded in its own column rather than allowed to drive the
   label. 2.6 is `C` with *asset-based valuation absent* flagged; it is not demoted for it.

⚠️ **`M` IS THE WEAKEST LABEL AND MUST NOT BE READ AS COVERAGE.** An `M` row still needs its
content written from nothing. It says only that the marking scaffolding for that ACT already
exists and is proven. **`M` + `N` = the content-absent set**, and that is the number to quote
against the old `NEW` count, not `N` alone.

Drill counts are **published, approved** rows in `acca_drills` as at this document's date:
**154 published — AFM 63 across 27 LO codes, APM 91 across 63 LO codes** — plus, new since the
first pass, **5 SBL rows, `approved` and `published=false` by decision (P-DB9)**. The SBL rows
are reviewed content and are counted as assets here; they are not servable, and no FAE claim
should imply they are live. Case requirements: **38 published** (APM 11 practice + 7 mock;
AFM 12 practice + 8 mock).

### 2.1 Area 1 — International Business: Strategy, Culture, Governance, Organisation

| # | Competency (paraphrased) | Label | Gap inside the row | Evidence |
|---|---|---|---|---|
| **1.1** | Why Irish businesses internationalise — comparative advantage, imperfect markets, product cycle, Porter's Diamond, Five Forces, Ansoff | **M** | **All six frameworks absent** | Verified absent by name across all 5 fields of all 160 drill rows: Ansoff **0**, Porter's Diamond **0**, Five Forces **0**. Two apparent hits are FALSE FRIENDS (§3.5): AFM E3a's *"comparative advantage"* is the **interest-rate-swap** comparative advantage, not Ricardian trade theory; APM A5d/A5e's *"lifecycle"* is **lifecycle costing**, not the product life cycle of internationalisation. What transfers is the ACT: APM **A1e** `70d1c7b5` marks *"evaluate how models such as … could assist … and their limitations"* — identical rubric shape, different model list. |
| **1.2** | Domestic→global evolution; marketing opportunities and challenges; promoting domestic brands abroad; SWOT, PEST | **T** | marketing / brand-promotion sub-elements | ✏️ **CORRECTED.** The first pass said *"No SWOT/PEST asset in either corpus."* **APM A1e** `70d1c7b5` asks, verbatim in its `question`: *"Evaluate how models such as **SWOT, PEST** and Porter's generic strategies could assist the performance management process … and their limitations."* Both named tools are taught, with their limitations, which is the examinable treatment. |
| **1.3** | Alternative modes of operating internationally — trade, e-commerce, licensing, franchising, JV, foreign acquisition, greenfield entity, outsourcing/shared services/offshoring | **R** | the mode-of-entry COMPARISON; licensing and JV | AFM **B5a**/**B5b** price a **greenfield** cross-border entity end to end (`buildIntlNpvSchema`, verified in three live scenarios: CairoCom Egypt, Tianjin, Axion Maroc), and B4 prices acquisition (7 drills). So the *financial layer of two of the eight modes is built.* Absent: "joint venture" **0**, licensing as a mode **0** (every `licen*` hit is an environmental or telecoms **permit**), and no asset compares modes against each other. |
| **1.4** | International corporate governance patterns — unitary vs dual boards, directors' share dealings, conflicts of interest, remuneration committees | **N** + **IRISH-SOURCE** | — | Unchanged, and re-verified: *"unitary"* **0**, *"dual board"/"two-tier board"* **0**. APM **C1c** addresses *"the remuneration committee of Cedarwood Group"* as an **AUDIENCE** for a reporting drill — that is a communication asset, not governance content. AFM A3c and APM A5 are ESG. **Authorities: FRC** (UK Code 2024), **Irish Corporate Governance Code 2024** (ROI-only, p.50), **Central Bank of Ireland**. |
| **1.5** | Operational and logistical issues of trading in a multicultural environment | **M** | content absent | ✏️ **CORRECTED from "No asset."** SBL **A2d** `5bd47a79` marks *"assesses how PCG's current culture would help or constrain the board's stated aim of generating 40% of revenue from contract warehousing"* — the same act (culture as an enabler/constraint on an operating aim) on a different object. The rubric transfers; the multicultural-logistics content does not exist. |
| **1.6** | Change-programme implementation tools — Lewin, Kotter & Schlesinger, McKinsey 7-S | **M** | **all three models absent** | Verified: Lewin **0**, Kotter **0**, `7-S`/`7S` **0**. APM **B3a** `f2b230ab` (*"should use Porter's Value Chain to address its deteriorating on-time delivery rate"*) and **A1f** `0c94bfee` (*"Apply and evaluate Kaplan and Norton's Balanced Scorecard"*) are two live instances of *apply-a-named-model-and-evaluate*. Same act, different literature. |
| **1.7** | Frameworks for reconciling conflicting stakeholder demands — Mendelow | **T** | — | ✏️ **CORRECTED.** The first pass said *"Mendelow's Matrix does not [appear]."* **APM A1d** `203369cf` asks, verbatim: *"…how the stakeholder groups at Corvan Energy operate and influence its performance measurement and management, using **Mendelow's matrix** or a similar framework."* The competency names exactly one framework and the corpus teaches it. |

**Area 1: 2 T · 3 M · 1 R · 1 N** (1 also IRISH-SOURCE).

✏️ **"7-for-7 NEW" was WRONG, and it was the crosswalk's most-quoted line.** Two competencies
(1.2, 1.7) name frameworks the APM corpus teaches by name; one (1.3) has a built financial layer
for two of its eight modes. **Content is genuinely absent for four of the seven — 1.1, 1.4, 1.5,
1.6 — not seven.** The area is still the weakest, and 1.4 is still a clean net-new gap; what
changed is that it is no longer uniform, and the strategic-model corpus it needs turns out to be
partly built already, under an APM label nobody thought to search.

### 2.2 Area 2 — Decision Making in an International Context

| # | Competency (paraphrased) | Label | Gap inside the row | Evidence |
|---|---|---|---|---|
| **2.1** | Macro-economic factors bearing on international financial goals — rates, FX, growth, inflation, competitiveness, employment — and their impacts | **R** | growth, competitiveness, employment | AFM E2a *Types of FX exposure* (2 drills) and E1a *Treasury function in multinationals* (2 drills) give the exposure-and-impact shape in narrative form. The macro factors beyond rates and FX need authoring. |
| **2.2** | Theories linking exchange rates, interest rates and inflation — PPP, IRP, international Fisher | **C** | — | Engine and content both. `lib/acca/international.ts` — `parityDifferential`, `buildForwardCurve`; GATE 12 parity-consistency in `validate-schema.ts`; `fxhedge.ts` composes `parityDifferential` one-way for the IRP-derived forward. AFM B5a/B5b/B5c (5 drills). CAI demands level **U** here; the AFM assets operate at application, i.e. **above** the demanded level. |
| **2.3** | Appraise international investment opportunities using DCF and sensitivity analysis | **C** | — | The deepest row in the document. `npv.ts` (`buildNpvSchema`), `irr.ts` (`buildIrrSchema`), `international.ts` K1 (`buildIntlNpvSchema`) and K2 FX sensitivity (`buildIntlSensitivitySchema`), `risk.ts` sensitivity kind (`buildSensitivitySchema`). AFM B1a (8), B1b (2), B1c (4), B5a–B5c (5) = **19 drills**. Cases: Solenne Industries SA, Halvard Marine ASA, Brecon Renewables plc. |
| **2.4** | Appraise international opportunities on **non-financial** grounds — foreign legal and cultural difference, operational/logistical challenge, country-specific environmental issues | **R** | the evaluation criteria themselves | AFM A3c ESG (1 drill) and B5c touch the edges; SBL A3a (*"defensible as an act of responsible leadership in the public interest"*) marks a non-financial verdict on a priced decision. The international case shells (Solenne Industries SA, Aldebrino SpA) supply the setting; the criteria need authoring. |
| **2.5** | A reasoned recommendation on an opportunity — financial and non-financial, with project risk and mitigation | **R** | the fusion of financial + non-financial | `risk.ts` covers the risk half properly: 4 kinds (eNPV, sensitivity, RADR compare, risk measures), 4 schema builders, gates G-a…G-e. The *commit to a recommendation* behaviour is enforced by the narrative pipeline's **N5 committed-verdict** gate and the **F4** disqualifier. What does not exist is a single asset fusing both halves into one recommendation. |
| **2.6** | A reasoned recommendation on acquisition/merger using valuation — asset-based, market-based, cash-based | **C** | **asset-based valuation absent** | `valuation.ts` carries **5 of the 28 schema builders** (`buildFcffSchema`, `buildFcffComposedSchema`, `buildFcfeSchema`, `buildDividendSchema`, `buildCompareSchema`) and AFM B4a–B4d = **7 drills**. Cash-based and market-based are served, code-owned, gated. One of three named methods is missing — recorded as a gap, not as a demotion (rule 2). |
| **2.7** | A reasoned recommendation informed by the strategic implications of M&A on the organisation | **R** | the strategic-consequence layer | The B4 valuation drills are numeric; B4d (1 drill) is the narrative sibling. Needs authoring on top of existing valuation scaffolding. |
| **2.8** | Practical issues of implementing change internationally — legal, cultural, logistical, HR | **M** | content absent | ✏️ **CORRECTED from "No asset."** SBL **A1a** `46e10662` marks *"the leadership contribution to: (i) the formulation … and (ii) the **implementation** of the PayHarvest strategy"*, comparing the two phases — implementation is its explicit object. SBL **A2d** marks culture as a constraint on a strategic aim. The act transfers; the legal/HR content does not exist. One of only two competencies demanded at level **A** outside area 3. |
| **2.9** | Evaluate strategic options — Johnson & Scholes SFA, Porter's Generic Competitive Strategies | **T** | **Johnson & Scholes SFA absent** | ✏️ **CORRECTED from "neither named framework appears."** One of the two does. APM **A1e** `70d1c7b5` names **Porter's generic strategies** in its `question` and its `model_answer` works them (*"Porter's generic strategies would force a choice — cost leadership vs differentiation"*). ⚠️ Johnson & Scholes' **SFA** is genuinely absent: every *"Scholes"* hit in the corpus is **Black-Scholes** (AFM B2a/B2c/B4d), a false friend (§3.5), and *"Johnson"* returns **0**. |

**Area 2: 1 T · 3 C · 1 M · 4 R.** Still the strongest area, and the strength is still concentrated
in the numeric competencies — but 2.9 moves out of NEW on a verified named-framework match, and 2.8
gains a marking structure from a corpus that did not exist at the first pass.

### 2.3 Area 3 — International Treasury Management

| # | Competency (paraphrased) | Label | Gap inside the row | Evidence |
|---|---|---|---|---|
| **3.1** | Recommend appropriate sources of finance for a given opportunity, across short, medium and long term | **R** + **IRISH-SOURCE** | the instrument menu; Irish sources | AFM B3 *Impact of financing on investment decisions and APV* — B3a/d/e/f/h/i/j/k = **17 drills**, the single largest AFM cluster — plus `apv.ts`, `capm.ts`, `credit.ts`, and E1a treasury-function narrative (2 drills). The machinery is financing-side-effect analysis, not an instrument menu. **Authority: the Irish financing landscape** — SBCI, Enterprise Ireland, Irish banking practice. |
| **3.2** | Practical strategies for managing interest-rate and exchange-rate risk | **C** | — | **The strongest single match in the document, and the re-run does not change that.** `fxhedge.ts` — 4 kinds, 4 schema builders (forward-vs-MMH compare, futures, options, swap), gates 15–19, 68 fixtures. `irhedge.ts` — 4 kinds, 4 schema builders (futures, options, collar, swap), gates 20–25, 94 fixtures. AFM E2a (2), E2b (4), E2c (1), E3a (5) = **12 drills**. Cases: Aldebrino SpA (E3a/E2a), Kestrel Foods plc (E2a), Lindqvist Instruments AB (E2b/E1a). Serves unchanged. |
| **3.3** | Financing international marketing — international payment methods, payment cultures, payment and international credit insurance, trade banking practice | **N** | — | Unchanged, and re-verified as the cleanest gap in the document: *"documentary credit"* **0**, *"letter of credit"* **0**, *"export credit"* **0**, *"trade finance"* **0** across all 160 rows. `credit.ts` models credit risk, a different subject. |

**Area 3: 1 C · 1 R · 1 N.** The shape is unchanged by the re-run — Gradd's single best asset and
one of its cleanest gaps, side by side. This is the one area where three labels and five labels
tell the same story.

### 2.4 Area 4 — Management Accounting, Performance Measurement, Management Information & Control

| # | Competency (paraphrased) | Label | Gap inside the row | Evidence |
|---|---|---|---|---|
| **4.1** | Contemporary pricing and transfer pricing, local and multinational — arm's length, IP, R&D, use of tax credits, predatory pricing | **R** + **IRISH-SOURCE** | **the whole transfer-pricing content**; Irish rules | ✏️ **CORRECTED, and the base is thinner than the first pass said.** It cited AFM **A6a** as the transfer-pricing row. A6a is **one drill** (`2b0513a0`) and its question is *"Determine the group dividend capacity of Verdant Agri Holdings Ltd…"* — **dividend capacity, with no transfer-pricing content at all**. The words "transfer pricing" sit in the CAI/ACCA **LO title**, not in the drill. The only *"transfer pric"* text in the corpus is two AFM **B5c** `full_reveal` passages naming it as a menu item in an exchange-controls context — i.e. as a distractor candidates over-claim. **There is no transfer-pricing asset.** APM B4 (4 drills) remains adjacent. **Authority: Revenue Tax and Duty Manual** (transfer pricing; R&D tax credit) and the Statute Book. |
| **4.2** | Strategic enterprise management systems — big data and analytics, Ackoff DIKW, analytic insight, planning and lifecycle of analysis, its problems, formatting for decisions, ethics and data protection | **T** + **IRISH-SOURCE** | **DIKW/Ackoff absent by name**; DPC sourcing | Direct and large. APM D1 *Technology and information systems* (D1a–D1e, **11 drills**) and APM D2 *Data science and analytics* (D2a–D2i, **11 drills**) = **22 drills**, the largest single transferable block. The ethics sub-element is genuinely served — D2i works onward sale and repurposing (*"data collected to provide a mobility service is being repurposed for a use users did not meaningfully [consent to]"*). ⚠️ *"DIKW"* **0** and *"Ackoff"* **0**; *"GDPR"* and *"data protection"* **0** as phrases. **IRISH-SOURCE applies only to the data-protection sub-element** — GDPR is EU-wide, the supervisory authority is the **Data Protection Commission**. |
| **4.3** | International aspects of contemporary performance measurement and cost management — planning, budgeting, KPIs, SMART targets, incentives, value chain, BCG, benchmarking, comparative advantage, Balanced Scorecard | **T** | **BCG absent; SMART absent**; "comparative advantage" is a false friend | APM's home ground. A2 (5), A3 (**18**), A4 (4), B1 (4), B2 (2), B3 (4) = **37 drills**. Named tools verified PRESENT: **Balanced Scorecard** — APM A1f `0c94bfee`, *"Apply and evaluate Kaplan and Norton's Balanced Scorecard"*; **value chain** — APM B3a `f2b230ab`, *"should use Porter's Value Chain…"*; **benchmarking** — 12 APM LOs and 7 AFM LOs. Verified ABSENT: **BCG 0**, **SMART 0**. ⚠️ *"comparative advantage"* appears only as **swap** comparative advantage (AFM E3a) — not the trade-theory sense this competency means (§3.5). The "international aspects" overlay is a scenario change, not a content change. |

**Area 4: 2 T · 1 R** (2 IRISH-SOURCE flags). Still the strongest area by asset volume, still
entirely on the APM side — but 4.1 gets **weaker** on re-run, not stronger: the one row the first
pass credited turns out to have no transfer-pricing content in it.

### 2.5 Area 5 — Leadership and Soft Skills

| # | Competency (paraphrased) | Label | Gap inside the row | Evidence |
|---|---|---|---|---|
| **5.1** | Models for appraising leadership style, and leadership's functional effect on organisational culture | **T** | SBL rows are `published=false` | ✏️ **CORRECTED from "No asset in either paper", and this is the single largest correction in the re-run.** The first pass was right about *either paper*; there is now a **third**. Both halves of this competency are directly served by the SBL batch-A corpus: **A2b** `9d414a87` — *"identifies and evaluates the **leadership styles** that CEO Nguyen Thanh Liem demonstrated in each of the three documented episodes … and advises which leadership style or combination the board chair should ask Liem to [adopt]"*; **A2d** `5bd47a79` — *"assesses how PCG's current **culture** would help or constrain the board's stated aim"*; **A1a** `46e10662` — leadership contribution to strategy formulation vs implementation. ⚠️ All three are `approved`/`published=false` by decision (P-DB9): reviewed content, not servable content. |
| **5.2** | Characteristics required to lead — negotiation, effective communication, mentoring and coaching, influencing and persuasion, effective presentation | **R** | 4 of 5 sub-elements | **One of five sub-elements is genuinely served, and the re-run confirms the other four are not.** *Communication* has real assets: APM C1 *Management reports* (C1a–C1e, **13 drills**), the `communication` professional-skill tag with live routing (AFM D9 `36edda4f` B5c, D11 `d2b06649` A3c), and `SKILL_DESCRIPTORS_BY_PAPER` in `case-marking.ts`. Verified absent: *"mentor"* **0**, *"coach"* **0**. ⚠️ *"negotiat"* returns 12 LOs and **every one is a false friend** — *"renegotiated"* lease/contract terms, *"the zone of rational negotiation"* between two valuations. *"persuas"* returns exactly one, APM C1d's *"voice as a persuasion device"*, which is a writing technique inside a reporting drill, not the influencing sub-element. |

**Area 5: 1 T · 1 R.** ✏️ The first pass's *"Area 5 has no REUSE"* is **superseded**: 5.1 is
directly served, by a corpus that did not exist when it was written.

### 2.6 IRISH-SOURCE, collected

Four of the 24 competencies (**16.7%**) cannot be written without Irish statutory or regulatory
material first:

| # | Authority needed |
|---|---|
| 1.4 | **FRC** (UK Corporate Governance Code 2024); **Irish Corporate Governance Code 2024** (ROI-only); **Central Bank of Ireland** for regulated entities |
| 3.1 | Irish financing landscape — SBCI, Enterprise Ireland, Irish banking practice |
| 4.1 | **Revenue** Tax and Duty Manual (transfer pricing; R&D tax credit); **Statute Book** for the transfer-pricing legislation |
| 4.2 | **Data Protection Commission** (data-protection sub-element only) |

Two further items sit outside the 24 but carry the same consequence: the **UK** and **Irish
Corporate Governance Codes** are named on p.50 as examinable guidance in their own right.

A structural point that no verdict captures: CAI states that "Ireland" means **ROI or NI
depending on the candidate's examination centre** (p.48). Several of these authorities therefore
**bifurcate** — FRC/UK Code for NI, IAASA and the Irish Code for ROI. That is a content-forking
requirement, not a sourcing inconvenience, and nothing in the APM/AFM corpus has ever had to
fork on jurisdiction.

---

## 3. The numbers

### 3.0 ⛔ SUPERSEDED — the first pass's counts

> **5 REUSE / 8 ADAPT / 11 NEW** (20.8% / 33.3% / 45.8%), with *"Area 1 is 7-for-7 NEW"* and
> *"area 5 has no REUSE"*. **Do not quote these.** They are recorded here rather than deleted
> because they appear in the KPMG briefing and in downstream material, so a reader meeting them
> needs to be able to find the correction.
>
> **Three causes, all verified:** the three-label scheme collapsed four kinds of reuse into one
> word; the search for named frameworks was not exhaustive, so SWOT, PEST, Mendelow and Porter's
> generic strategies were recorded as absent while APM teaches all four by name; and the **SBL
> corpus did not exist**, which cost Area 5 its strongest row.

### 3.1 Labels across the 24 competencies — the re-run

| Label | | Count | % of 24 |
|---|---|---|---|
| **T** | direct technical reuse | **6** | **25.0%** |
| **C** | calculation-engine reuse | **4** | **16.7%** |
| **M** | answer/marking-structure reuse *(content still new)* | **4** | **16.7%** |
| **R** | existing asset needing FAE re-authoring | **8** | **33.3%** |
| **N** | genuinely net-new | **2** | **8.3%** |
| | | **24** | **100%** |
| | *IRISH-SOURCE (flag, overlaps the above)* | *4* | *16.7%* |

**T (6):** 1.2, 1.7, 2.9, 4.2, 4.3, 5.1
**C (4):** 2.2, 2.3, 2.6, 3.2
**M (4):** 1.1, 1.5, 1.6, 2.8
**R (8):** 1.3, 2.1, 2.4, 2.5, 2.7, 3.1, 4.1, 5.2
**N (2):** 1.4, 3.3

> ### The number to quote is not N.
>
> **`M` + `N` = 6 of 24 (25.0%) — the competencies whose CONTENT must be written from nothing:
> 1.1, 1.4, 1.5, 1.6, 2.8, 3.3.** That is the honest comparator against the old `NEW = 11
> (45.8%)`, and it is the figure the re-run actually moves. `N = 2` on its own overstates the
> position, because an `M` row has a proven rubric and no content.
>
> Equally, **`T` + `C` = 10 of 24 (41.7%)** is the set where real technical or engine assets
> exist. Everything between those two numbers is `R` — an asset exists and has to be changed.

### 3.2 Distribution by area — the finding the totals still hide

| Area | T | C | M | R | N | Reads as |
|---|---|---|---|---|---|---|
| 1. International Business | 2 | 0 | 3 | 1 | 1 | Weakest, but **not uniform** — 2 named-framework matches |
| 2. Decision Making | 1 | 3 | 1 | 4 | 0 | Strongest; numeric core is code-owned |
| 3. Treasury | 0 | 1 | 0 | 1 | 1 | Best asset and cleanest gap, side by side |
| 4. Mgmt Accounting & Performance | 2 | 0 | 0 | 1 | 0 | Large volume; 4.1 got **weaker** on re-run |
| 5. Leadership & Soft Skills | 1 | 0 | 0 | 1 | 0 | ✏️ No longer "effectively absent" — SBL serves 5.1 |

**The structural warning survives the re-run and should still travel with any headline number.**
Because CAI examines **at least 4 of the 5 areas** and permits any one area to reach **circa
40%**, a sitting can weight heavily toward Area 1, where content is absent for 4 of 7
competencies and no calculation engine applies at all (**C = 0**). An aggregate reading of §3.1
is misleading without §3.2 beside it — that was true of the first pass and it is still true.

⚠️ **And the re-run does not make the build smaller in the way the count suggests.** It moves
rows out of NEW by finding *one drill* that teaches a named framework — A1e for SWOT/PEST/Porter,
A1d for Mendelow. **One drill is a teaching asset, not a competency's worth of coverage.** The
correct reading of a `T` is *"the content exists and has been authored once"*, not *"this
competency is served".*

### 3.3 The 12 AFM calculators, assessed individually

| # | Module | Transferable | Serves / why not |
|---|---|---|---|
| 1 | `npv.ts` | ✅ | 2.3 — DCF is named in the competency |
| 2 | `irr.ts` | ✅ | 2.3 |
| 3 | `capm.ts` | ✅ | 2.3 — supplies the project discount rate |
| 4 | `valuation.ts` | ✅ | 2.6 — cash-based and market-based methods |
| 5 | `international.ts` | ✅ | 2.2 (parity theory), 2.3, 4.1 (dividend/transfer-pricing kind) |
| 6 | `fxhedge.ts` | ✅ | 3.2 |
| 7 | `irhedge.ts` | ✅ | 3.2 |
| 8 | `risk.ts` | ✅ | 2.3 (sensitivity), 2.5 (project risk) |
| 9 | `apv.ts` | ❌ | APV is an ACCA B3 technique. 2.3 names DCF and sensitivity; no FAE Advisory competency requires adjusted present value. |
| 10 | `bsop.ts` | ❌ | Black-Scholes / real options. No FAE Advisory competency covers option pricing. |
| 11 | `duration.ts` | ❌ | Macaulay/project duration is an analytic measure. 3.2 asks for *practical strategies* to manage rate risk, i.e. instruments — which is `irhedge.ts`, not this. |
| 12 | `credit.ts` | ❌ | Credit-risk modelling. 3.3 is trade finance and credit **insurance**, a different subject; 3.1 is sources of finance, not credit scoring. |

**8 of 12 transferable (66.7%).**

### 3.4 The 28 schema builders, assessed individually

| Module | Builders | Transferable | Not |
|---|---|---|---|
| `npv.ts` | `buildNpvSchema` | 1 | — |
| `irr.ts` | `buildIrrSchema` | 1 | — |
| `capm.ts` | `buildCapmSchema` | 1 | — |
| `valuation.ts` | `buildFcffSchema`, `buildFcffComposedSchema`, `buildFcfeSchema`, `buildDividendSchema`, `buildCompareSchema` | 5 | — |
| `international.ts` | `buildIntlNpvSchema`, `buildIntlSensitivitySchema`, `buildIntlRemittanceSchema`, `buildIntlDividendSchema` | 4 | — |
| `fxhedge.ts` | `buildForwardMmhCompareSchema`, `buildFuturesSchema`, `buildOptionsSchema`, `buildSwapSchema` | 4 | — |
| `irhedge.ts` | `buildIrFuturesSchema`, `buildIrOptionsSchema`, `buildIrCollarSchema`, `buildIrSwapSchema` | 4 | — |
| `risk.ts` | `buildEnpvSchema`, `buildSensitivitySchema`, `buildRadrSchema` | 3 | `buildRiskMeasuresSchema` (1) — comparative duration and VaR are not named in FAE Advisory |
| `apv.ts` | `buildApvSchema` | — | 1 |
| `bsop.ts` | `buildBsopSchema` | — | 1 |
| `duration.ts` | `buildDurationSchema` | — | 1 |
| `credit.ts` | `buildCreditSchema` | — | 1 |
| **Total** | | **23** | **5** |

**23 of 28 transferable (82.1%).**

> The builder ratio (82.1%) is materially higher than the calculator ratio (66.7%) because the
> transferable calculators are the multi-kind ones — `valuation` (5), and `international`,
> `fxhedge`, `irhedge`, `risk` (4 each) — while three of the four non-transferable modules
> carry exactly one builder. **Counting modules understates the transferable surface; counting
> builders is the better measure of it.** Each also has a matching `build*ModelAnswer` (28 of
> those too), so the transferable set carries its prose generation with it.

§3.3 and §3.4 are unchanged by the re-run. They measure the calculation engine, and no engine
gained or lost a competency: `C` is 2.2, 2.3, 2.6, 3.2 in both passes.

### 3.5 How the framework search was run, and the false friends it had to survive

**The first pass under-counted; a naive re-run would over-count.** Both errors are live, and the
second is the easier one to make, so the method is recorded here rather than assumed.

Every named framework in the 24 competencies was swept across **all five content fields**
(`question`, `context_text`, `model_answer`, `hint`, `full_reveal`) of **all 160 `acca_drills`
rows** — 154 published, 5 SBL `approved`/unpublished, 1 AFM permanent candidate. **Then every
hit was opened and read.** That second step is not optional, and **P-DB5** is why: *a matched
string proves some text renders that way, never which one.*

**Eight false friends were found, and four of them would have created a fake match on a
competency the corpus does not serve:**

| Term swept | Apparent hits | What it actually was |
|---|---|---|
| `PEST` | AFM B3i, AFM B1b, APM D2i | *"dee**pest**"*, *"shar**pest**"*. Only APM A1e is real. |
| `Porter` | AFM E2b ×3, SBL A3d | *"ex**porter**"*, *"re**porter**"*. Only APM A1e and B3a are real. |
| `Scholes` | AFM B2a, B2c, B4d | **Black-Scholes**, not **Johnson & Scholes**. `Johnson` returns 0 — **2.9's SFA half is genuinely absent.** |
| `comparative advantage` | AFM E3a | The **interest-rate-swap** comparative advantage, not the trade-theory sense 1.1 and 4.3 mean. |
| `life cycle` | APM A5d, A5e, A3d | **Lifecycle costing** (environmental management accounting), not the **product life cycle** theory of internationalisation. |
| `culture` | AFM E2b ×2, B3h | *"agri**cultur**al"*. Real hits are APM A1i/A1j/A3d/D1c and SBL A2b/A2d. |
| `leadership` | AFM B2a, B5c, APM A1e | *"senior leadership team"*, *"local leadership"*, and Porter's *"cost leadership"*. The leadership-**style** hits are all SBL. |
| `negotiat` | 12 LOs across both papers | *"renegotiated"* lease and contract terms; *"the zone of rational negotiation"* between two valuations. **Not one is the negotiation SKILL of 5.2.** |

**The two directions, stated plainly.** The first pass recorded SWOT, PEST, Mendelow and Porter's
generic strategies as absent when APM names all four — an under-count from an incomplete search.
A grep-only re-run would have recorded Porter's Diamond, Johnson & Scholes, the product life
cycle, comparative advantage and negotiation as **present** when none of them is — an over-count
from an unread match. **Every ✏️ correction in §2 rests on a read excerpt, quoted in its row.**

---

## 4. The format gap

### 4.1 The two artefacts are not the same shape

| | AFM Mock Paper 1 (built, live) | FAE Advisory (target) |
|---|---|---|
| Duration | 3h 15m | **4h 30m** |
| Structure | **3 cases, 8 requirements** | **2 independent simulations, no published requirement decomposition** |
| Marks | 100 (50 + 25 + 25), of which 20 professional skills | **No specific requirements and no specific mark allocations** — but **every indicator answer carries the same marks** (CAI guidance, July 2026). See §4.4. |
| Exhibits | 11 across 3 cases | — |
| Book | Closed | **Open** |
| Tested | Technical execution + professional skills | **Judgement**, across ≥4 of 5 areas, any area to ~40% |

AFM decomposes a paper into eight independently-marked requirements, each bound to one LO code
and — where numeric — to one of the 12 calculator families. FAE Advisory publishes **two
simulations and nothing below that level**. The unit of assessment is the simulation, not the
requirement.

### 4.2 Does `author-afm-case.ts` serve it? — Partly, and it is a different artefact

`scripts/authoring/author-afm-case.ts` (418 lines) is the general, spec-driven path: an
`AfmCaseSpec` in, a gated case out, no case content in the script. That generality is real and
it is the right starting point. But four of the things it enforces are **AFM-shaped, not
case-shaped**:

1. **The corpus invariant (gate 3)** asserts that syllabus sections **B and E** are represented
   across the published AFM case library. Those are ACCA AFM letters. For FAE the invariant
   would have to become "at least 4 of the 5 CAI areas across the paper" — a *paper-level*
   property, where AFM's is a *library-level* one.
2. **Exhibits must state every calculator input (gate 4).** This presupposes that a requirement
   *has* a calculator family. For 1.4 (governance), 1.6 (change models) or 5.1 (leadership),
   there is no input to state and the gate has nothing to check.
3. **`runRequirementGateBarrier` takes a family argument** for every numeric requirement. There
   is no family for the majority of FAE Advisory competencies.
4. It writes `paper_code: 'AFM'`, `syllabus_cycle: 'S26-J27'`, and an A/B `section`.

So: **for the numeric spine — 2.2, 2.3, 2.6, 3.2, and the risk half of 2.5 — the existing path
serves a FAE case with parameterisation.** For everything else only `runNarrativeGateBarrier`
applies, and that is the weaker instrument by a wide margin:

> ⚠️ **The narrative pipeline has no numeric verifier, and it has already cost a drill.** D7's
> first version passed all six gates while asserting the exact opposite of its own figures — a
> rubric requiring the candidate to conclude payback was comfortably inside an 18-month
> threshold, on drivers giving an annual net benefit of **−USD 69,472 and no payback at all**.
> It was caught by hand before insert. A 4.5-hour open-book judgement paper is *mostly*
> narrative, which means the majority of a FAE Advisory paper would be authored under the
> regime that has already failed once, not under the numeric moat.

**Answer: it is a different artefact.** A FAE paper-level authoring script would need a
paper-level area-coverage gate, a family-optional requirement barrier, and a jurisdiction fork
(ROI/NI). What it would inherit unchanged is the spec→gate→dry-run→insert discipline, the
`--i-will-delete-live-rows` guard, and the P-DB2/P-DB4 publish protocol.

### 4.3 What Mock Paper 1 actually cost — and the honest limit on that answer

**No wall-clock or monetary cost is recorded anywhere in the repository.** The journal
(`APM_BUILD_CONTRACT.md`) and `AFM_SURFACED.md` do not carry an authoring-effort figure for it,
and no estimate should be inferred from this document. What the repo *does* evidence:

- `author-afm-mock-paper-1.ts` is **441 lines and explicitly a ONE-OFF**: its own header states
  every case id, exhibit and requirement string is a **literal**. The paper was **hand-written
  into a script and then gated** — not generated. The generalised `author-afm-case.ts` was
  extracted **afterwards**.
- It needed **two dedicated follow-up scripts** to maintain: `regate-afm-mock-paper-1.ts` and
  `reauthor-afm-requirement.ts`. Re-authoring at *requirement* granularity had to become its own
  tool, which is a cost signal about revision, not initial authoring.
- Scale delivered: **3 cases, 8 requirements, 11 exhibits, 100 marks**, published 2026-07-29.
- Comparable evidence from the drill families: `fxhedge` and `irhedge` each required a **named
  fix round after gates passed** — FR1 on both, FR2 on fxhedge — where independent recompute and
  blind adversarial review found formula-level errors the six gates had not. Those rounds are the
  best available proxy for what "authored" actually costs, and they happened on the *numeric*
  content, where verification is strongest.

FAE Advisory's two simulations are longer than any of AFM's three cases (the largest is 50 marks
/ 4 requirements / 5 exhibits) and mostly judgement-led, so the AFM per-case figures are a floor,
not a comparison.

### 4.4 ⭐ THE SHAPE OF THE MARKING PROBLEM — and it is smaller than §4.1 makes it look

**Added 2026-08-29 from the independent review. This is the finding that bounds the build.**

Two facts about an FAE case, taken together, decide the engineering:

1. It carries **no specific requirements and no specific mark allocations.** §4.1 records this as
   a gap against AFM's eight independently-marked requirements, and read alone it looks like the
   hardest problem in the document — a paper with no published decomposition.
2. **All indicator answers carry the same marks** (CAI guidance, July 2026).

**Fact 2 removes the hard part of fact 1.** The thing that looked missing — a published weighting
— turns out not to exist for anyone, because there is nothing to weight. The problem reduces to
four steps, and only one of them is new:

| Step | Status |
|---|---|
| **1. Detect the indicators** in a case | 🔴 **NET-NEW.** This is the whole build. |
| **2. Decompose compound / blended indicators** into markable pieces | 🔴 **NET-NEW**, and downstream of step 1. |
| **3. Budget time equally** across the pieces | ✅ **TRANSFERS.** `lib/acca/pacing.ts` is pure and already wired; `orderPaper` (`sit-results.ts`) computes per-requirement intervals; `debrief.ts` selects the collapse headline. |
| **4. Mark the pieces** | ✅ **TRANSFERS.** `judgeTechnicalMarking` / `judgeCaseMarking` mark per unit against a reference, and `apportion` converts bands to marks. |

> **There is no weighting model to invent.** An equal-marks scheme is the one case where
> `apportion`'s largest-remainder machinery is not merely adequate but exactly right: equal
> ceilings across units is its simplest input, not a special case.

**So the new engineering is an INDICATOR DETECTOR, and nothing else in the marking stack.** That
is a materially smaller and better-defined problem than "author a paper-level marking model for a
qualification whose mark allocations are unpublished", which is how §4.1 alone reads.

⚠️ **Two limits on that claim, both real.**

- **Step 1 has no analogue anywhere in the codebase.** Every Gradd marking path is handed the
  units — `acca_case_requirements` rows exist before marking runs. Nothing has ever had to *find*
  the units in a case. It is a smaller problem than a weighting model; it is not a solved one.
- **Steps 3 and 4 transfer as MACHINERY, not as CALIBRATION.** The pacing engine will budget
  equally across whatever units it is given, and the marker will band whatever it is handed
  against whatever reference it is handed. Neither says anything about whether the bands match
  CAI's judgement — see §5, which is unchanged by this finding.

---

## 5. What cannot be established from public material

> ### There IS a validation gap. It is narrower than the first pass said, and the first pass's evidence for it does not support what it was used to prove.

> ### ✏️ CORRECTED 2026-08-29 — THE MARKING-INFORMATION CLAIM WAS OVERSTATED, AND IT WAS THIS DOCUMENT'S PIVOT
>
> The first pass argued that **"whether Gradd's marking matches how CAI awards credit cannot be
> determined from anything published"**, and rested it on a phrase count: *"Reaching Competence"*
> and *"Not Competent"* appear **zero times in 64 pages**.
>
> **That count is TRUE about the phrase and MISLEADING about the whole.** It was a search of ONE
> document — the competency statement — and the competency statement is not where CAI publishes
> marking information. **CAI publishes a great deal of it**, and the claim did not survive contact
> with the rest of the public record:
>
> - **sample marking**, and material on **marker convergence**, **moderation**, and
>   **independent double-marking of every FAE script**;
> - **sample papers WITH suggested solutions**;
> - **FAEC (FAE Examiners' Committee) reports**;
> - **July 2026 guidance stating that ALL INDICATOR ANSWERS CARRY THE SAME MARKS** — the fact
>   §4.4 is built on;
> - **May 2026 events using a mini-case specifically to explain how marks are awarded.**
>
> **A zero-occurrence count in one document is evidence about that document.** Presenting it as
> evidence about a body of published marking information was a scope error — the same shape as
> **P-G2** (an unstated denominator reading as full coverage), and the same shape as the
> corpus-search error that produced the ✏️ corrections in §2. Both mistakes in this document have
> now been the same mistake: **searching one place and reporting the result as a property of
> everywhere.**

**What the gap actually is, restated:** ✅ **CURRENT INDICATOR-LEVEL CALIBRATION.**

Not *"how CAI marks"* — that is published, in the five forms above. What is not obtainable from
the public record, and what a product would have to match, is the **live application of the
standard to a script at indicator granularity**:

| Open question | Why it is not closable from published material |
|---|---|
| **How far must a point be developed** to count as an indicator answer? | Sample solutions show a finished answer; they do not show the threshold at which a partial one starts scoring. |
| **How are defensible alternatives treated** — a different but supportable conclusion? | The suggested solution is *a* solution. Its status as *the* solution is exactly what is unstated. |
| **How do compound indicators decompose?** | The equal-marks rule (§4.4) makes decomposition decisive: how a blended indicator splits changes the total. Nothing published resolves it. |
| **How is Professional Competence applied to a live script?** | Descriptors describe the quality; the mapping onto an actual answer is the marker's judgement. |
| **Current-cycle drift** | FAEC reports and sample marking are historical. Calibration is a property of the sitting being marked. |

⚠️ **This is still a real gap and it is still not closable by building assets** — that half of the
first pass stands. What changes is its size and its remedy: it is an **access and calibration**
problem (sample marking, FAEC reports, Learning Hub, and ideally marked scripts), not an
information vacuum. **Do not repeat the "zero times in 64 pages" line.** It is a true sentence
that supports a false conclusion, and it is the most quotable line in the first pass.

Three consequences, stated plainly:

1. **Indicator-level calibration is the thing to obtain, and it is a prerequisite, not a
   nice-to-have.** Sample marking, FAEC reports and Learning Hub material are named above because
   they exist and are the route in. Until a *current* sample has been worked, any claim that
   Gradd's output aligns with CAI's judgement at indicator level is unfounded — but the claim
   *"CAI does not publish how it marks"* is itself unfounded and must not be repeated.

2. **Gradd's marking is a marks model; CAI's appears to be a competence judgement.**
   `lib/acca/case-marking.ts` has code own **band→marks only** (`apportion`,
   `apportionTechnicalMarks`, largest-remainder). A four- or five-band quality judgement is
   converted into an integer mark allocation. If CAI judges *whether a competency was
   demonstrated* rather than *how many marks a point earns*, the two are not the same
   instrument, and reusing the calculators does nothing to reconcile them.

3. **Gradd's own marking claim has a ceiling that applies here too.** The **model** owns the
   band, and the feedback prose is model-authored and un-code-verified. `judgeTechnicalMarking`
   receives `model_answer` prose only — `answer_schema` is not a field of
   `TechnicalRequirementInput` — and `judgeCaseMarking` receives no code-owned reference at all.
   The correct claim is *structured and consistency-checked*, never *code owns the marks*. That
   ceiling does not rise by porting to a new paper.
   ⛔ **The "114 of 1,518 asserted figures … 96.5% in STRONG-band feedback" measurement that stood
   here is SUPERSEDED and has been removed rather than restated.** It was measured 2026-07-30,
   before the judgement/feedback split now in production; its instrument had no scenario tier
   (over-counting) and admitted tolerance and rubric leaves as support (under-counting); and its
   evidence file is gone. A corrected instrument on a recovered corpus puts the comparable rate at
   **~1.2–2.5%**, and the residual is dominated by one sentence shape in one requirement. See
   `GENERATOR_DOCTRINE.md` **P-M5(a)** and the **UNDER-COUNT REGISTER** in `AFM_SURFACED.md`
   before quoting any figure of this kind. **The qualitative ceiling above is unaffected** — it
   was never a consequence of the rate.

Additionally, `SKILL_DESCRIPTORS_BY_PAPER` is keyed to **ACCA's** published professional-skills
descriptors, and APM's and AFM's are materially different from each other and never merged. CAI
publishes no equivalent descriptor set in this document, so the professional-skills marking layer
has **no calibration target** for FAE.

**Also unestablished:** the 2026/27 competency population itself (§0), and therefore whether the
counts in §3 describe the cycle a product would sell into.

---

## 6. Provenance

| | |
|---|---|
| Base document | FAE Competency Statement 2025/2026, Chartered Accountants Ireland, 64pp |
| Advisory elective | pp.47–51 (objective and learning outcomes p.47; competencies pp.48–50; assessment and reading list p.51) |
| Origin | Public CAI FAE downloads page |
| SHA-256 | `6C89744A0735613C3A7FFFC6A0632C9B37D6F545CE302CEDAC3F4C82E27ACBB9` (1,346,063 bytes) — the local copy is byte-identical to the public one |
| Storage | **Fetched, not stored.** `docs/FAE/` is git-ignored; never committed, never indexed |
| Registered | `docs/evidence/sources.json` → `syllabus_sources` → **E7** |
| Corpus snapshot (first pass) | 154 published drills (AFM 63 / 27 LOs; APM 91 / 63 LOs); 16 cases (APM 5 practice + 3 mock, AFM 5 practice + 3 mock); 12 calculator modules; 28 schema builders; 28 model-answer builders |
| **Corpus snapshot (re-run, 2026-08-29)** | **160 `acca_drills` rows: 154 published** (AFM 63, APM 91) **+ 5 SBL `approved`/`published=false`** (A1a, A2b, A2d, A3a, A3d) **+ 1 AFM permanent candidate** (`47c9d5ce`). **38 published case requirements** (APM 11 practice + 7 mock; AFM 12 practice + 8 mock) across 16 published cases. Calculators, builders and model-answer builders unchanged at 12 / 28 / 28. |
| Re-run method | Every named framework in the 24 competencies swept across all 5 content fields of all 160 rows, **then every hit opened and read** (P-DB5). Eight false friends found and excluded — see §3.5. |

---

## 7. Corrections applied — independent review of the KPMG briefing, 2026-08-29

Recorded as a list because several of these findings travelled into the briefing and into
downstream material, so a reader meeting the old version needs to be able to find the correction.
**Nothing in §7 is a product-code change; this is a documentation correction only.**

| # | Claim as it stood | Correction | Where |
|---|---|---|---|
| **1** | *"Whether Gradd's marking matches how CAI awards credit cannot be determined from anything published"*, evidenced by **"Reaching Competence" / "Not Competent" = 0 occurrences in 64 pages**. | **OVERSTATED — and it was the crosswalk's pivot.** The count is true about the phrase and misleading about the whole: it searched the competency statement, which is not where CAI publishes marking information. CAI publishes sample marking, marker convergence, moderation and independent double-marking of every FAE script; sample papers with suggested solutions; FAEC reports; July 2026 guidance that **all indicator answers carry the same marks**; and May 2026 events using a mini-case to explain how marks are awarded. The gap is restated as **current indicator-level calibration**. | §5 |
| **2** | **5 REUSE / 8 ADAPT / 11 NEW**, incl. *"Area 1 is 7-for-7 NEW"*, *"area 5 has no REUSE"*, *"No SWOT/PEST asset in either corpus"*, *"Mendelow's Matrix does not [appear]"*, *"neither named framework appears"* (2.9). | **SUPERSEDED and re-run.** APM teaches SWOT, PEST and Porter's generic strategies (A1e `70d1c7b5`) and Mendelow (A1d `203369cf`) by name; AFM's B5/B4 machinery serves Decision Making and Treasury; APM sits at the centre of Management Accounting; and **SBL A2b/A2d/A1a** serve Leadership 5.1, a corpus that did not exist at the first pass. Re-run on five labels. | §2, §3.0, §3.1 |
| **3** | *(absent)* | **NEW ENGINEERING FINDING, and it bounds the build.** An FAE case carries no specific requirements and no specific mark allocations, **but all indicator answers carry equal marks** — so the problem is *detect indicators → decompose compound/blended → equal time budget → mark the pieces*. **No weighting model to invent.** Pacing and marking transfer; **the indicator detector is the only net-new component.** | §4.4 |
| **4** | CAP2 is auto-scored from summer 2026 **and practice papers and mocks get immediate marking**. | **First half CORRECT and retained. Second half DROPPED** — CAI's guidance is that **preparation resources are NOT marked**. The argument does not need it, and it should not be repeated. *(CAP2 itself remains out of scope for this crosswalk, per §0.2; the correction is recorded here because the claim travelled with this research.)* | §7 |
| **5** | Results gap of **six months**. | **~5 months.** Main sitting **4 September**; repeat **29 January**. | §7 |

### 7.1 What the re-run did NOT change

Recorded so the corrections are not read as a general softening:

- **§3.3 / §3.4 are untouched.** 8 of 12 calculators and 23 of 28 schema builders transfer, exactly as before. No engine gained or lost a competency.
- **3.2 is still the strongest single match**, 1.4 and 3.3 are still clean net-new gaps, and **`N` did not fall to zero.**
- **The §3.2 structural warning stands.** CAI examines at least 4 of 5 areas and permits any one to reach circa 40%, so a sitting can still weight toward Area 1, where content is absent for 4 of 7 competencies and **no calculation engine applies at all**.
- **§0's hard prerequisite stands, unchanged and unweakened:** the **2026/27 competency statement is still not in hand**, so every count in §3 — including the re-run's — is pinned to 2025/26 numbering and is not a 2026/27 finding.
- **§5's second and third consequences stand:** a marks model is not a competence judgement, and Gradd's marking claim ceiling does not rise by porting to a new paper.

### 7.2 One thing to carry out of this document

**Both errors corrected here were the same error.** The first pass searched one document for a
phrase and reported the result as a property of everything CAI publishes; it searched the corpus
incompletely and reported the result as a property of everything Gradd has built. **A search's
denominator is a claim, and it has to be stated** — `GENERATOR_DOCTRINE.md` **P-G2**. The
§3.5 false-friend table is the other half of the same discipline: an unread match is not a
finding either.
