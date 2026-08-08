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

Verdicts: **REUSE** (an existing APM/AFM asset serves it unchanged) · **ADAPT** (an asset is
close, needs re-authoring) · **NEW** (nothing equivalent in either paper) · **IRISH-SOURCE** (a
flag that can accompany any verdict, meaning Irish statutory/regulatory material is needed
before it can be written).

Drill counts are **published, approved** rows in `acca_drills` as at this document's date:
**154 total — AFM 63 across 27 LO codes, APM 91 across 63 LO codes**.

### 2.1 Area 1 — International Business: Strategy, Culture, Governance, Organisation

| # | Competency (paraphrased) | Verdict | Evidence |
|---|---|---|---|
| **1.1** | Why Irish businesses internationalise — comparative advantage, imperfect markets, product cycle, Porter's Diamond, Five Forces, Ansoff | **NEW** | Nearest is APM A1 *Strategic management accounting* (A1a–A1j, 10 drills), which is management accounting under strategy, not trade theory. No asset covers any of the six named frameworks. |
| **1.2** | Domestic→global evolution; marketing opportunities and challenges; promoting domestic brands abroad; SWOT, PEST | **NEW** | No SWOT/PEST asset in either corpus. APM A2 *Performance hierarchy* (5 drills) is the closest register and is not the same content. |
| **1.3** | Alternative modes of operating internationally — trade, e-commerce, licensing, franchising, JV, foreign acquisition, greenfield entity, outsourcing/shared services/offshoring | **NEW** | AFM B5 *International investment and financing decisions* (B5a/B5b/B5c, 5 drills) supplies the **financial** layer of a cross-border decision but never the mode-of-entry choice. Acquisition is priced by AFM B4 (7 drills) but not compared against licensing or franchising. Scenario shells transfer (see §4.3); content does not. |
| **1.4** | International corporate governance patterns — unitary vs dual boards, directors' share dealings, conflicts of interest, remuneration committees | **NEW** + **IRISH-SOURCE** | AFM A3c *ESG and ethical issues* (1 drill) and APM A5 *Sustainability* (A5a–A5e, 5 drills) are ESG, not board architecture. **Authorities: FRC** (UK Corporate Governance Code 2024) and the **Irish Corporate Governance Code 2024** (ROI-only, per p.50); **Central Bank of Ireland** for regulated-entity governance. |
| **1.5** | Operational and logistical issues of trading in a multicultural environment | **NEW** | No asset. |
| **1.6** | Change-programme implementation tools — Lewin, Kotter & Schlesinger, McKinsey 7-S | **NEW** | APM B3 *Performance improvement models and techniques* (B3a–B3d, 4 drills) covers performance-improvement models, not change-management models. Different literature. |
| **1.7** | Frameworks for reconciling conflicting stakeholder demands — Mendelow | **NEW** | Stakeholder reasoning appears in APM A5 and A2; Mendelow's Matrix does not. |

**Area 1: 7 NEW** (1 also IRISH-SOURCE). This is the weakest area in the crosswalk and it is
weak uniformly — not one of the seven has a serving asset.

### 2.2 Area 2 — Decision Making in an International Context

| # | Competency (paraphrased) | Verdict | Evidence |
|---|---|---|---|
| **2.1** | Macro-economic factors bearing on international financial goals — rates, FX, growth, inflation, competitiveness, employment — and their impacts | **ADAPT** | AFM E2a *Types of FX exposure* (2 drills) and E1a *Treasury function in multinationals* (2 drills) give the exposure-and-impact shape in narrative form. Needs broadening beyond FX/interest to growth, competitiveness and employment. |
| **2.2** | Theories linking exchange rates, interest rates and inflation — PPP, IRP, international Fisher | **REUSE** | Direct. `lib/acca/international.ts` — `parityDifferential`, `buildForwardCurve`; GATE 12 parity-consistency in `validate-schema.ts`; `fxhedge.ts` composes `parityDifferential` one-way for the IRP-derived forward. AFM B5a/B5b/B5c (5 drills). CAI demands level **U** here; the AFM assets operate at application, i.e. **above** the demanded level. |
| **2.3** | Appraise international investment opportunities using DCF and sensitivity analysis | **REUSE** | Direct and deep. `npv.ts` (`buildNpvSchema`), `irr.ts` (`buildIrrSchema`), `international.ts` K1 (`buildIntlNpvSchema`) and K2 FX sensitivity (`buildIntlSensitivitySchema`), `risk.ts` sensitivity kind (`buildSensitivitySchema`). AFM B1a (8), B1b (2), B1c (4), B5a–B5c (5) = **19 drills**. Cases: Solenne Industries SA, Halvard Marine ASA, Brecon Renewables plc. |
| **2.4** | Appraise international opportunities on **non-financial** grounds — foreign legal and cultural difference, operational/logistical challenge, country-specific environmental issues | **ADAPT** | AFM A3c ESG (1 drill) and B5c touch the edges. The international case shells (Solenne Industries SA, Aldebrino SpA) supply the setting; the non-financial evaluation criteria themselves need authoring. |
| **2.5** | A reasoned recommendation on an opportunity — financial and non-financial, with project risk and mitigation | **ADAPT** | `risk.ts` covers the risk half properly: 4 kinds (eNPV, sensitivity, RADR compare, risk measures), 4 schema builders, gates G-a…G-e. The *commit to a recommendation* behaviour is enforced by the narrative pipeline's **N5 committed-verdict** gate and the **F4** disqualifier. What does not exist is a single asset that fuses financial and non-financial into one recommendation. |
| **2.6** | A reasoned recommendation on acquisition/merger using valuation — asset-based, market-based, cash-based | **ADAPT** | `valuation.ts` carries **5 of the 28 schema builders** (`buildFcffSchema`, `buildFcffComposedSchema`, `buildFcfeSchema`, `buildDividendSchema`, `buildCompareSchema`) and AFM B4a–B4d = **7 drills**. Cash-based and market-based are served. **Asset-based valuation is not evidenced anywhere in the B4 corpus** — so this is ADAPT, not REUSE: one named method is missing. |
| **2.7** | A reasoned recommendation informed by the strategic implications of M&A on the organisation | **ADAPT** | The B4 valuation drills are numeric; B4d (1 drill) is the narrative sibling. The strategic-consequence layer needs authoring on top of existing valuation scaffolding. |
| **2.8** | Practical issues of implementing change internationally — legal, cultural, logistical, HR | **NEW** | No asset. Note this is one of only two competencies demanded at level **A** outside area 3. |
| **2.9** | Evaluate strategic options — Johnson & Scholes SFA, Porter's Generic Competitive Strategies | **NEW** | APM A1 (10 drills) is adjacent in register only; neither named framework appears. |

**Area 2: 2 REUSE · 5 ADAPT · 2 NEW.** This is where the corpus is strongest, and the strength
is concentrated in the numeric competencies (2.2, 2.3).

### 2.3 Area 3 — International Treasury Management

| # | Competency (paraphrased) | Verdict | Evidence |
|---|---|---|---|
| **3.1** | Recommend appropriate sources of finance for a given opportunity, across short, medium and long term | **ADAPT** + **IRISH-SOURCE** | AFM B3 *Impact of financing on investment decisions and APV* — B3a/d/e/f/h/i/j/k = **17 drills**, the single largest AFM cluster — plus `apv.ts`, `capm.ts`, `credit.ts`, and E1a treasury-function narrative (2 drills). The machinery is financing-side-effect analysis, not an instrument menu; the short/medium/long-term menu needs authoring. **Authority: the Irish financing landscape** — SBCI, Enterprise Ireland, and Irish banking practice — before it can be written credibly for an Irish candidate. |
| **3.2** | Practical strategies for managing interest-rate and exchange-rate risk | **REUSE** | **The strongest single match in the document.** `fxhedge.ts` — 4 kinds, 4 schema builders (forward-vs-MMH compare, futures, options, swap), gates 15–19, 68 fixtures. `irhedge.ts` — 4 kinds, 4 schema builders (futures, options, collar, swap), gates 20–25, 94 fixtures. AFM E2a (2), E2b (4), E2c (1), E3a (5) = **12 drills**. Cases: Aldebrino SpA (E3a/E2a), Kestrel Foods plc (E2a), Lindqvist Instruments AB (E2b/E1a). Serves unchanged. |
| **3.3** | Financing international marketing — international payment methods, payment cultures, payment and international credit insurance, trade banking practice | **NEW** | Nothing. `credit.ts` models credit risk, which is a different subject from documentary credits, export credit insurance and trade banking. |

**Area 3: 1 REUSE · 1 ADAPT · 1 NEW.** Note the shape: the area contains Gradd's single best
asset and one of its cleanest gaps.

### 2.4 Area 4 — Management Accounting, Performance Measurement, Management Information & Control

| # | Competency (paraphrased) | Verdict | Evidence |
|---|---|---|---|
| **4.1** | Contemporary pricing and transfer pricing, local and multinational — arm's length, IP, R&D, use of tax credits, predatory pricing | **ADAPT** + **IRISH-SOURCE** | AFM A6a *Dividend policy in multinationals and transfer pricing* is **1 drill**, and it is the **direct-link-only** row excluded from every browse surface (`isDirectLinkOnlyArea`, `paper.ts:50`), so it is the thinnest possible base. APM B4 *Performance optimisation in specific contexts* (4 drills) is adjacent. **Authority: Revenue Tax and Duty Manual** (transfer-pricing rules; R&D tax credit) and Irish transfer-pricing legislation on the Statute Book. |
| **4.2** | Strategic enterprise management systems — big data and analytics, Ackoff DIKW, analytic insight, planning and lifecycle of analysis, its problems, formatting for decisions, ethics and data protection | **REUSE** + **IRISH-SOURCE** | Direct and large. APM D1 *Technology and information systems* (D1a–D1e, **11 drills**) and APM D2 *Data science and analytics* (D2a–D2i, **11 drills**) = **22 drills**, the largest single transferable block in the crosswalk. **IRISH-SOURCE applies only to the data-protection sub-element**: GDPR is EU-wide but the supervisory authority and Irish guidance sit with the **Data Protection Commission**. |
| **4.3** | International aspects of contemporary performance measurement and cost management — planning, budgeting, KPIs, SMART targets, incentives, value chain, BCG, benchmarking, comparative advantage, Balanced Scorecard | **REUSE** | APM's home ground. A2 *Performance hierarchy* (5), A3 *Financial performance measurement* (**18**), A4 *Non-financial performance measurement* (4), B1 *Budgetary planning and control* (4), B2 *Performance and reward* (2), B3 *Performance improvement models* (4) = **37 drills**. The "international aspects" overlay is a scenario change, not a content change. |

**Area 4: 2 REUSE · 1 ADAPT** (2 IRISH-SOURCE flags). Strongest area by asset volume, entirely
on the APM side.

### 2.5 Area 5 — Leadership and Soft Skills

| # | Competency (paraphrased) | Verdict | Evidence |
|---|---|---|---|
| **5.1** | Models for appraising leadership style, and leadership's functional effect on organisational culture | **NEW** | No asset in either paper. |
| **5.2** | Characteristics required to lead — negotiation, effective communication, mentoring and coaching, influencing and persuasion, effective presentation | **ADAPT** | **One of five sub-elements is genuinely served.** *Communication* has real assets: APM C1 *Management reports* (C1a–C1e, **13 drills**), the `communication` professional-skill tag with live routing (AFM D9 `36edda4f` B5c, D11 `d2b06649` A3c), and `SKILL_DESCRIPTORS_BY_PAPER` in `case-marking.ts`. Negotiation, mentoring/coaching, influencing and presentation have **nothing**. |

**Area 5: 1 ADAPT · 1 NEW.**

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

### 3.1 Verdicts across the 24 competencies

| Verdict | Count | % of 24 |
|---|---|---|
| **REUSE** | **5** | **20.8%** |
| **ADAPT** | **8** | **33.3%** |
| **NEW** | **11** | **45.8%** |
| | **24** | **100%** |
| *IRISH-SOURCE (flag, overlaps the above)* | *4* | *16.7%* |

**REUSE (5):** 2.2, 2.3, 3.2, 4.2, 4.3
**ADAPT (8):** 2.1, 2.4, 2.5, 2.6, 2.7, 3.1, 4.1, 5.2
**NEW (11):** 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 2.8, 2.9, 3.3, 5.1

### 3.2 Distribution by area — the finding the totals hide

| Area | REUSE | ADAPT | NEW | Reads as |
|---|---|---|---|---|
| 1. International Business | 0 | 0 | **7** | **Nothing exists.** |
| 2. Decision Making | 2 | 5 | 2 | Mixed; numeric core is strong |
| 3. Treasury | 1 | 1 | 1 | Best asset and a clean gap, side by side |
| 4. Mgmt Accounting & Performance | 2 | 1 | 0 | **Strongest.** No NEW at all |
| 5. Leadership & Soft Skills | 0 | 1 | 1 | Effectively absent |

**Area 1 is 7-for-7 NEW, and area 5 has no REUSE.** Together they are 9 of 24 competencies
(37.5%) with no serving asset. Because CAI examines **at least 4 of the 5 areas** and permits
any area to reach **circa 40%**, a sitting can weight heavily toward exactly the areas where
nothing exists. The aggregate "79% REUSE-or-ADAPT" reading of §3.1 is therefore misleading on
its own, and should not be quoted without §3.2 beside it.

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

---

## 4. The format gap

### 4.1 The two artefacts are not the same shape

| | AFM Mock Paper 1 (built, live) | FAE Advisory (target) |
|---|---|---|
| Duration | 3h 15m | **4h 30m** |
| Structure | **3 cases, 8 requirements** | **2 independent simulations, no published requirement decomposition** |
| Marks | 100 (50 + 25 + 25), of which 20 professional skills | Not published as a per-requirement allocation |
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

---

## 5. What cannot be established from public material

> ### This is the validation gap. It is not a detail and it is not closable by building assets.

**Whether Gradd's marking matches how CAI awards credit cannot be determined from anything
published.**

The evidence for that statement, from the 2025/26 statement itself:

- The phrases **"Reaching Competence"** and **"Not Competent"** appear **zero times** in all 64
  pages. **"Competent"** appears **once**, on p.10, and only inside an incidental remark about
  what a strong answer looks like — not as a grading scale, not as a definition, not as a
  descriptor set.
- The statement specifies **what is examinable and at which level (U/A/I)**. It does not specify
  **how credit is awarded**, what distinguishes Competent from Reaching Competence, or when a
  point counts as sufficiently developed.

Three consequences, stated plainly:

1. **The grading vocabulary lives somewhere this crosswalk could not reach** — CAI examination
   regulations, examiner reports, or Learning Hub material. Until that is obtained, any claim
   that Gradd's output aligns with CAI's judgement is unfounded.

2. **Gradd's marking is a marks model; CAI's appears to be a competence judgement.**
   `lib/acca/case-marking.ts` has code own **band→marks only** (`apportion`,
   `apportionTechnicalMarks`, largest-remainder). A four- or five-band quality judgement is
   converted into an integer mark allocation. If CAI judges *whether a competency was
   demonstrated* rather than *how many marks a point earns*, the two are not the same
   instrument, and reusing the calculators does nothing to reconcile them.

3. **Gradd's own marking claim has a ceiling that applies here too.** The **model** owns the
   band, and the feedback prose is model-authored and un-code-verified: **114 of 1,518 asserted
   figures** across 20 runs × 8 requirements were figures no schema component owns, **96.5% of
   them in STRONG-band feedback**. `judgeTechnicalMarking` receives `model_answer` prose only —
   `answer_schema` is not a field of `TechnicalRequirementInput` — and `judgeCaseMarking`
   receives no code-owned reference at all. The correct claim is *structured and
   consistency-checked*, never *code owns the marks*. That ceiling does not rise by porting to a
   new paper.

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
| Corpus snapshot | 154 published drills (AFM 63 / 27 LOs; APM 91 / 63 LOs); 16 cases (APM 5 practice + 3 mock, AFM 5 practice + 3 mock); 12 calculator modules; 28 schema builders; 28 model-answer builders |
