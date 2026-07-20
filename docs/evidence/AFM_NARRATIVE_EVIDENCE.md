# AFM narrative-marking evidence — examiner-report failure modes + syllabus marking basis

**PROVENANCE (read before using):**
- **§1b failure modes (F1–F12): VERIFIED 20/07/2026.** Every quote below was page-verified in-repo against the source PDF via `pdftotext`: the verbatim string was located character-for-character and the real page recorded as `[REPORT p.N]`. Original extraction 18/07/2026 by the co-founder (MJ25 / SD23 / SD25); this pass added page refs, corrected the rendering deltas listed in the VERIFICATION LOG, and extended the base with **J24 + SD24**. **Zero misquotes and zero not-found** — see the log for the five typographic/editorial deltas recorded.
- **Page refs are PDF page = printed footer page.** Verified aligned on all five reports (pdftotext page N carries printed footer "N"), so `p.N` is unambiguous in either numbering.
- **§1a syllabus basis: VERIFIED 20/07/2026** against the ACCA AFM Syllabus and Study Guide S26–J27 itself (registered **E6** in `sources.json`; the PDF was found on the work machine at `docs/afm_s26_j27_syllabus_and_study_guide.pdf`, gitignored by `docs/*.pdf`). Every §1a quote now carries a **[GUIDE p.N]** ref taken from the guide, not from `scripts/afm-framework.ts`. **Two defects were found and fixed** — one fabricated-gloss (G1) and one wrong page citation (G2); both are recorded in the VERIFICATION LOG. Three descriptors are substance-verbatim but list-format-normalised (G3).
- **Anchor rule for §1a.** `scripts/afm-framework.ts` is a *convenience* anchor, **not** an evidence anchor: it marks only four blocks "verbatim" (command verbs, professional skills, employability, exam structure). Anything outside those four — notably `INTELLECTUAL_LEVELS` — must be traced to the guide before being quoted. G1 is exactly the failure that rule prevents.

## Source register (label → file → actual title)

The co-founder's report labels were all **correct**; the local filenames are shorthand. Confirmed by title page + question names.

| Label | Local PDF filename | Actual report title | Questions |
|---|---|---|---|
| **MJ25** | `MJ25 AFM examiner's report.pdf` | AFM **March/June 2025** Examiner's report | Kampai, Sohbet, GCR |
| **SD23** | `D23 AFM examiner's report.pdf` | AFM **September/December 2023** Examiner's report | McKeever, Abertafol, Southmed |
| **SD25** | `afm_examiner_report_d25.pdf` | AFM **September/December 2025** Examiner's report | Halstock, Drimpton, Passmore |
| **J24** | `J24 AFM examiner's report.pdf` | AFM **March/June 2024** Examiner's report | Mahoney, Littlebredy, Garnod |
| **SD24** | `SD24 AFM examiner's report.pdf` | AFM **September/December 2024** Examiner's report | Northney, Mortexa, Zulla |

*(SD24's PDF carries a stray "March/June 2024" artifact on its title page; the authoritative body text reads "the published September/December 2024 sample exam". Labelled SD24 on the body text.)*

**PDF custody:** these five PDFs are ACCA copyright and follow the standing repo rule — **not redistributed in-repo** (`.gitignore`: "ACCA official PDFs — re-fetchable evidence, never redistributed in-repo"). They are cited by label + page exactly as `SOURCE_MAP.md` cites S1–S7. **Registered 20/07/2026 as E1–E5 in `docs/evidence/sources.json`** — re-fetch with `docs/evidence/fetch_acca_sources.ps1`, which now verifies each download's byte size against the manifest. All five source URLs were confirmed live and **byte-identical to the copies used for this verification** (SD23 386,496 · J24 494,537 · SD24 480,902 · MJ25 414,034 · SD25 1,003,837), so any future re-fetch that changes size will throw and force a page-ref re-verification.

**Study guide custody:** the AFM Syllabus and Study Guide S26–J27 is registered **E6** (`syllabus_sources` in `sources.json`), URL confirmed live and **byte-identical** to the local copy (568,640 bytes). Local copy lives at `docs/afm_s26_j27_syllabus_and_study_guide.pdf`, gitignored by the pre-existing `docs/*.pdf` rule. **Extraction warning:** the detailed study guide is laid out in **two columns** — `pdftotext` *without* `-layout` interleaves them, which makes present quotes look missing. Use `-layout` and split columns (a descriptor may also wrap left-column-bottom → right-column-top on the same page).

---

## §1a — SYLLABUS MARKING BASIS (guide-verified 20/07/2026 — every quote carries a [GUIDE p.N])

### Intellectual levels (study guide **p.5**; superscripts [2]/[3] in the guide)
The guide states the three levels as **bare labels only** — it gives no per-level descriptor sentence:
- **L1:** "Knowledge and comprehension" — **[GUIDE p.5]**
- **L2:** "Application and analysis" — **[GUIDE p.5]**
- **L3:** "Synthesis and evaluation" — **[GUIDE p.5]**
- Context sentence: "The specific capabilities within the detailed syllabuses and study guides are assessed at one of three intellectual or cognitive levels" — **[GUIDE p.5]**
- No L1 LOs appear in AFM (0 of 80 LOs are level 1 — counted from `SYLLABUS_MAP`; Strategic Professional = application minimum).

> ⚠️ **CORRECTED 20/07/2026 — do not reinstate the old wording.** Earlier revisions of this file quoted L2 as *"Application and analysis — apply concepts, perform calculations, analyse, advise on application of techniques"* and L3 as *"Synthesis and evaluation — evaluate, recommend justified actions, assess trade-offs, exercise strategic judgement"*, presented as study-guide verbatim. **The em-dash tails appear NOWHERE in the guide** (each phrase returns 0 hits across all 21 pages). They are an editorial gloss authored in `scripts/afm-framework.ts` (`INTELLECTUAL_LEVELS`), which — unlike that file's professional-skills, employability, command-verb and exam-structure blocks — is *not* marked "verbatim". The bare labels above are what ACCA actually publishes. See VERIFICATION LOG G1.

### Professional skills — Section F, 20/100 marks, all four at L3 (study guide **p.13**)
*(Page corrected 20/07/2026: this heading previously cited "p.5" — that is the intellectual-levels page. Section F sits on **p.13**. See VERIFICATION LOG G2.)*

Mark split and examining rules, all guide-verbatim:
- "The 50 marks will comprise of 40 technical marks and 10 professional skills marks. **All of the professional skills will be examined in Section A**." — **[GUIDE p.15]**
- "The 25 marks will comprise of 20 technical marks and 5 professional skills marks… **Each question will contain a minimum of two professional skills from Analysis and Evaluation, Scepticism and Commercial Acumen**." — **[GUIDE p.16]**
- "All option exams contain a total of 80 technical marks and **20 professional skills marks**." — **[GUIDE p.18]** (direct source of the 20/100 figure; also reconciles as 10 + 5×2)
- All 13 sub-descriptors below carry the guide's `[3]` superscript → all four skills at L3. — **[GUIDE p.13]**

*(Examiner reports flag scepticism + commercial acumen as the weakest-earned — see F10.)*
- **Communication (L3):** "Inform concisely, objectively and unambiguously, adopting a suitable style and format, using appropriate technology." · "Persuade using compelling and logical arguments, demonstrating the ability to counter argue where appropriate." · "Clarify and simplify complex issues to convey relevant information in a way that adopts an appropriate tone and is easily understood by and reflects the requirements of the intended audience." — **[GUIDE p.13]**
- **Analysis and evaluation (L3):** "Investigate relevant information from a range of sources, using appropriate analytical techniques to estimate outcomes, assist in decision-making and to identify opportunities or solutions." · "Consider information, evidence and findings carefully, reflecting on their implications and how they can be used in the interests of the wider organisational goals." · "Assess and apply appropriate judgement when considering organisational issues, problems or when making financial management decisions; taking into account the implications of such decisions on the organisation and those affected." · "Appraise information objectively with a view to balancing the costs, risks, benefits and opportunities, before recommending appropriate solutions or decisions." — **[GUIDE p.13]**
- **Scepticism (L3):** "Explore the underlying reasons for a given situation, applying the attitude of an enquiring mind, beyond what is immediately apparent." · "Question opinions, assertions and assumptions, by seeking justifications and obtaining sufficient evidence for either their support and acceptance or rejection." · "Challenge and critically assess the information presented or decisions made, where this is clearly justified, in the wider professional, ethical, organisational, or public interest." — **[GUIDE p.13]**
- **Commercial acumen (L3):** "Demonstrate awareness of organisational and external factors, which will affect the financial management decisions of an organisation." · "Recognise key issues in a given scenario and use judgement in proposing and recommending commercially viable solutions." · "Show insight and perception in understanding financial issues and wider organisational matters, demonstrating acumen in arriving at appropriate recommendations." — **[GUIDE p.13]**

### The 5-cluster target LO descriptors (guide-verified; pages below)
*(All nine located in the guide's detailed study guide, Section B, pp.9–11. Levels and discursive/quantitative modes cross-checked against `SYLLABUS_MAP` — all nine agree. **Formatting note (G3):** the guide renders sub-items as a list with capitalised openers — `i) The significance…`, `ii) Static trade-off theory` — where the text below inlines them as `(i) the significance…; (ii) static trade-off theory`. Substance identical; list formatting normalised by the framework extraction. Affects B1b and B3i.)*
- **B1b (L2, discursive) — Monte Carlo:** "Outline the application of Monte Carlo simulation to investment appraisal. Candidates will not be expected to undertake simulations in an examination context but will be expected to demonstrate an understanding of: (i) the significance of the simulation output and the assessment of the likelihood of project success; (ii) the measurement and interpretation of project value at risk." — **[GUIDE p.9]**
- **B3a (L3, discursive) — sources of finance:** "Identify and assess the appropriateness of the range of sources of finance available to an organisation including equity, debt, hybrids, lease finance, venture capital, business angel finance, private equity, asset securitisation and sale, Islamic finance and security token offerings. Including assessment on the financial position, financial risk and the value of an organisation." — **[GUIDE p.9]**
- **B3b (L2, discursive) — Islamic finance:** "Discuss the role of, and developments in, Islamic financing as a growing source of finance for organisations; explaining the rationale for its use, and identifying its benefits and deficiencies." — **[GUIDE p.10]**
- **B3c (L2, discursive) — green finance:** "Discuss the role of green finance for organisations pursuing an environmental/sustainable agenda." — **[GUIDE p.10]**
- **B3i (L3, discursive) — capital-structure theory:** "Assess the impact of financing and capital structure upon the organisation with respect to: (i) Modigliani and Miller propositions, before and after tax; (ii) static trade-off theory; (iii) pecking order propositions; (iv) agency effects." — **[GUIDE p.10]**
- **B3g (L3, discursive) — duration limitations/convexity:** "Discuss the benefits and limitations of duration including the impact of convexity." *(NOTE: B3g is a DURATION concept already narrative-ridden by calculator #6 (duration `limitations` kind). Its pairing with capital-structure theory in the coverage contract is a likely mislabel — flagged in the Step-0 risks.)* — **[GUIDE p.10]**
- **B4d (L2, discursive) — BSOP conceptual:** "Explain the role of option pricing models, such as the BSOP model, in the assessment of the value of equity, the value of debt and of default risk." — **[GUIDE p.10]**
- **B5c (L3, discursive) — exchange controls:** "Evaluate the significance of exchange controls for a given investment decision and strategies for dealing with restricted remittance." *(Dual coverage: calculator #10 (international, `restricted_remittance`) covered B5c numerically; this narrative drill is the conceptual/strategy evaluation.)* — **[GUIDE p.11]**
- **B5d (L3, discursive) — international finance sources:** "Assess and advise on the costs and benefits of alternative sources of finance available within the international equity and bond markets." — **[GUIDE p.11]**

---

## §1b — NARRATIVE FAILURE MODES — the DETECTION TARGETS
*(Base extracted 18/07/2026 from MJ25 / SD23 / SD25; page-verified and extended with J24 + SD24 on 20/07/2026. ACCA's own statements of why discursive answers lose marks — each is a detection target for the narrative rubric.)*

### F1 — SCENARIO REPETITION EARNS NOTHING (every report, standing text)
- "Marks are not allocated for information which is repeated from the scenario without any analysis or evaluation." — **[MJ25 p.3] [SD23 p.2] [SD25 p.3] [J24 p.3] [SD24 p.3]** — standing text, now confirmed in **all five** reports.
- Variant: "marks are not awarded for information which is repeated from the scenario without any analysis or evaluation." — **[SD24 p.9, Mortexa]**
- "a significant minority of candidates simply copied information from the question in their response…with little or no attempt to develop their points further" — **[SD25 p.8, Halstock]**
- *(NEW, J24)* "some candidates copy paragraphs from the question as part of their answer which is to be discouraged since no marks are awarded for this approach." — **[J24 p.13, Littlebredy c]**
- *(NEW, SD24)* "a significant number of candidates simply repeated information from the question in requirement (b), with little attempt to develop their points further to add value." — **[SD24 p.10, Mortexa]**
- *(NEW, SD24)* "a sizable minority of candidates presented answers that were generic and did little more than simply restate the information given in exhibit three." — **[SD24 p.12, Mortexa b]** *(also F5)*

### F2 — LISTS WITHOUT DEVELOPMENT
- "some candidates listed advantages rather than really explain them" — **[SD25 p.4]**
- "responses that adopt a list-based approach with little analysis or discussion other than to say, for example, 'it is assumed that the cost of capital is calculated correctly'" — **[SD23 p.5, McKeever iv]** *(inner quote is double in the original — see log D1)*
- "bullet point lists should be fully explained" — **[MJ25 p.13, Sohbet c]**
- *(NEW, J24)* "points did need to be explained, albeit briefly, and candidates who produced a bullet point list of points were penalised to some extent." — **[J24 p.4, Mahoney a]** *(repeated near-verbatim at [J24 p.16, Garnod a])*
- *(NEW, J24)* "There are some candidates who produce brief bullet point lists with little or no explanation and in this case, few if any marks are awarded." — **[J24 p.13, Littlebredy c]**
- *(NEW, SD24)* "bullet points with little or no explanation did not achieve much credit." — **[SD24 p.7, Northney vi]**

### F3 — UNDEVELOPED ASSUMPTIONS (the state-vs-discuss line)
- "rather than just stating 'it is assumed the 4% annual cash flow growth rate is accurate' candidates should go on to say that 'growth is in reality unlikely to progress so smoothly due to, for example, changes in economic conditions over time.'" — **[MJ25 p.6, Kampai iv]**
- "A common failing was to simply state assumptions rather than discuss them." — **[SD25 p.5, Drimpton b-ii]**
- "candidates have a habit of suggesting that sensitivity analysis should be used without any further explanation. To earn credit candidates need to discuss how, or why" — **[SD25 p.5, Drimpton b-ii]**
- *(NEW, J24)* "the assumptions given were often stated (sometimes using a bullet point format) rather than discussed in any meaningful way. Candidates were not given full credit where this was the case." — **[J24 p.8, Mahoney b-v]**
- *(NEW, J24 — the development pattern spelled out)* "many candidates discussed the assumption that the exchange rate forecasts were based on PPPT and that this may not hold true. However, candidates who went on to say that the actual NPV may be lower or higher than that forecast as a result of this issue could earn additional credit." — **[J24 p.8, Mahoney b-v]**
- *(NEW, SD24)* "to earn credit for being sceptical candidates need to demonstrate that they understand how and why the estimates could be wrong and how this could impact on the values calculated." — **[SD24 p.16, Zulla b]**

### F4 — FENCE-SITTING / NO COMMITTED RECOMMENDATION
- "Candidates should avoid 'sitting on the fence' and must recognise that, in any question where a conclusion or recommendation is asked for, there will be marks awarded for making a clear conclusion or recommendation even if the conclusion or recommendation they make is not necessarily that which was expected." — **[MJ25 p.7, Kampai v]**
- "a surprising number of candidates seemed to 'sit on the fence' and fail to ever make a clear recommendation" — **[SD25 p.5, Drimpton b-ii]**
- "The requirement does ask for a recommendation, and it was disappointing to note that quite a few candidates failed to do this." — **[SD25 p.13, Passmore a]** *(the base file rendered the tail as "failed to [recommend]" — editorial gloss, see log D3)*
- *(NEW, J24)* "Candidates must make sure that recommendations and advice are clearly stated as it is often the case that candidates 'sit on the fence' and never finally give any clear recommendation or advice. As a result, they may lose marks they could have easily gained." — **[J24 p.9, Mahoney professional skills]**

### F5 — GENERIC / NOT ANCHORED TO THE SCENARIO
- "there was frequently a lack of application of a candidates' discussion to the scenario" — **[MJ25 p.12, Sohbet b]**
- "many candidates tried to address the queries in a generic way, with no effort to link the explanations to the context and environment in the scenario" — **[SD23 p.15, Abertafol b]**
- "many discussed the performance of GCR in generic terms just focussing on the numbers, without considering the implications…in the context of a railway services operating company" — **[MJ25 pp.18–19, GCR]** *(legitimate elision; sentence spans the page break; see log D4 for the full unelided sentence)*
- "Some candidates spent too long describing ESG issues in general and not answering the specific question posed" — **[SD25 p.6, Drimpton b-iii]**
- *(NEW, J24)* "the answers produced were often rather general and did not make use of the scenario as much as they could have." — **[J24 p.6, Mahoney b-iii]**
- *(NEW, SD24)* "many candidates did not answer the question according to the facts provided in the scenario in exhibit one." — **[SD24 p.4, Northney i]**
- *(NEW, SD24)* "responses which listed a wide range of general issues that weren't specifically related to either of the two risks" — **[SD24 pp.6–7, Northney vi]** *(sentence spans the page break)*

### F6 — SUPERFICIAL STATE-THE-FIGURE COMMENTARY
- "It is vitally important at this level of the qualification that candidates present answers that explain and challenge the figures calculated, rather than simply stating what the figures show." — **[MJ25 p.17, GCR]**
- "Weaker candidates tended to present discussion that was limited to general comments, not adding much more than whether a ratio or trend had moved up or down" — **[SD23 p.11, Southmed]**
- *(NEW, SD24)* "Weaker candidates provided rather thin answers with little meaningful comment and either failed to show any scepticism or were too vague." — **[SD24 p.16, Zulla b]**
- *(NEW, SD24 — the non-answer assertion)* "weaker candidates simply stated that the valuation method which they had calculated produced the highest value for Zulla Co, was the best valuation method. Unfortunately, this does not answer the question posed." — **[SD24 p.16, Zulla b]** *(also F7)*
- *(NEW, J24 — ABSOLUTIST OVERCLAIM, candidate detector)* "candidates would often state that an advantage was that this netting would eliminate all risks arising from currency rate fluctuations. In reality, this is not the case and the situation is far more nuanced." — **[J24 p.6, Mahoney b-iii]** — suggests an absolutist-language detector ("eliminates all", "no risk", "guarantees").

### F7 — ANSWERING THE WRONG QUESTION / DRIFT / MISSED PARTS
- "some candidates failed to focus clearly on the requirement and drifted away from the question actually posed" — **[SD25 p.4, Drimpton a]**
- "Many candidates ignored the requirement set, instead focusing their discussion on the advantages and disadvantages of a centralised treasury department" — **[SD25 pp.13–14, Passmore b]** *(sentence spans the page break; see log D2)*
- "candidates would often discuss issues that would arise due to the negative comments…rather than describing actions that could be done to address the issue" — **[MJ25 p.7, Kampai vi]**
- "The second part of the discussion requirement…was missed out by many candidates. It is important to always read the requirements carefully and to answer all parts." — **[MJ25 p.17, GCR]**
- *(NEW, SD24 — the same standing sentence recurs)* "A large number of candidates did not present a calculation showing the impact on earnings per share (EPS). It is important to always read the requirements carefully and to answer all parts." — **[SD24 p.11, Mortexa a-ii]**
- *(NEW, J24)* "It is not uncommon for candidates to answer the question they were hoping for rather than the question actually posed and candidates should make sure they read questions carefully in order to avoid doing this." — **[J24 p.18, Garnod b]**
- *(NEW, J24)* "There were quite a few candidates who misread the requirement and answered the question by discussing the factors that affect Littlebredy Co's future investment strategy." — **[J24 p.13, Littlebredy c]**
- *(NEW, SD24)* "some candidates who were not familiar with the specific scenario answered a different question to the one set out in the requirement." — **[SD24 p.4, Northney]**
- *(NEW, SD24 — missed second part)* "Many candidates failed to consider the second part of the requirement concerning the impact of the new group function on the existing treasury function." — **[SD24 p.4, Northney i]**
- *(NEW, SD24 — one-sided coverage)* "many candidates only commented on the potential reaction of Yekkon Co's shareholders, whereas the requirement did ask for an analysis of the likelihood of approval by both companies' shareholders." — **[SD24 p.12, Mortexa a-iii]**

### F8 — ISSUE≠ACTION CONFUSION; INFEASIBLE ACTIONS
- "Weaker candidates often presented a general discussion where it was hard to distinguish between what was an issue and what was a recommended action." — **[SD25 p.6, Drimpton b-iii]**
- "a tendency for some candidates to spend too much time discussing the barrier itself and as a result failed to make any or few recommendations" — **[SD25 p.10, Halstock c]**
- "Candidates need to make sure that the actions they suggest are both sensible and feasible." — **[SD25 p.6, Drimpton b-iii — with the equal-wages counter-example]**
- *(NEW, J24)* "some answers were rather underdeveloped and did not consider both feasibility and effectiveness." — **[J24 p.18, Garnod c]**

### F9 — OWN FIGURES NOT USED IN THE DISCUSSION
- "They should bring forward the results of their calculations and use them to justify their recommendation, rather than just stating what their results are." — **[MJ25 p.12, Sohbet b]**
- "Few candidates recognised that the board of directors wanted to achieve a 4% return and therefore did not compare their results to this target." — **[MJ25 p.12, Sohbet b]**
- *(NEW, SD25 — found during this pass)* "Candidates should base their recommendation on their own workings and bring in their calculations to justify their decision for maximum marks." — **[SD25 p.13, Passmore a]**
- *(NEW, J24)* "candidates had to make sure they included both a recommendation in (a)(i)and (a)(ii) commenting on their previous analysis and using their own calculations. Candidates can be reassured that if they recommend a decision different to the suggested solution, they will still be awarded credit as long as their recommendation is consistent with their own workings." — **[J24 p.14, Littlebredy prof skills]** — **the OFR principle in ACCA's own words.**
- *(NEW, SD24)* "Even if calculations are incorrect, markers will reward sensible advice drawn from an analysis of those calculations." — **[SD24 p.12, Mortexa a-iii]**

### F10 — SCEPTICISM + COMMERCIAL ACUMEN: THE WEAKEST-EARNED MARKS
- "candidates did not generally earn so many of the scepticism and commercial acumen marks that were available" — **[MJ25 p.4] [SD25 p.3]** (General)
- Scepticism definition: "adopt a questioning approach in a way that would lead to effective challenges of the information provided in the scenario" — **[MJ25 p.13] [SD23 p.16] [SD25 p.14] [SD24 p.12]** — standing definition across four reports.
- Commercial acumen: "use the information in the scenario or from the real world and relate this to their discussion" — **[MJ25 p.13]**; "recognition of external constraints" — **[SD23 p.8]**
- *(NEW, J24)* "candidates did not earn so many of the more specific scepticism and commercial acumen marks that were available." — **[J24 p.4, Mahoney]**
- *(NEW, J24 — thin answers suppress skills marks)* "candidates seem to be less capable at earning the scepticism and commercial acumen marks and this is especially true where a candidate's answer is rather thin and underdeveloped." — **[J24 p.9, Mahoney prof skills]**
- *(NEW, SD24)* "The skill of scepticism is not demonstrated very well by the majority of candidates." — **[SD24 p.4, Northney]**
- *(NEW, SD24 — the fullest scepticism definition found)* "Scepticism marks are awarded for challenging information relating to the assumptions, directors' views, decisions and/ or techniques and providing reasons for such challenges." — **[SD24 p.7, Northney]** — note the **"providing reasons"** clause: a bare challenge is not creditable.
- *(NEW, SD24 — vagueness bar)* "candidates' attempts to be sceptical were often too vague to be creditable." — **[SD24 p.17, Zulla prof skills]**

### F11 — BREADTH/BALANCE + STRUCTURE
- "other candidates over explained one or two advantages rather than provide an answer with suitable breadth" — **[SD25 p.4, Drimpton a]**
- "Far too many candidates miss out on a mark they have nearly earned by failing to finish their report with a conclusion." — **[MJ25 p.8] [SD25 p.6]**
- *(NEW, J24)* "To maximise their marks candidates should avoid repeating or over explaining what is in fact only one point. Their time would be better spent thinking about, and then succinctly explaining a second point." — **[J24 p.4, Mahoney a]** *(repeated at [J24 p.16, Garnod a])*
- *(NEW, J24)* "very many candidates could earn extra marks by making sure that they structure their report with suitable sub-headings and finish their report with a brief conclusion." — **[J24 p.8, Mahoney prof skills]**
- *(NEW, SD24)* "there are still quite a few candidates who could improve by making sure that they structure their report with suitable sub-headings and finish their report with a brief conclusion which is very often missing." — **[SD24 p.7, Northney communication]**
- *(NEW, SD24 — breadth over both halves)* "In order to gain the maximum marks candidates needed to discuss a range of both political and operational risks." — **[SD24 p.7, Northney vi]**

### F12 — REQUIRED OUTPUT FORMAT IGNORED *(NEW MODE — surfaced by SD24, 20/07/2026)*
Distinct from F11 (breadth/structure *within* the answer): this is non-compliance with the **required document format** itself, which carries communication marks in its own right.
- "there is still a significant number of candidates who totally ignore the report format required and who submit their word document answers simply relating to the numbered requirements of the question and, as a result, lose valuable marks." — **[SD24 p.7, Northney communication]**
- Supporting: "The communication marks are largely earned by the format and style of the report and for using a style and language which creates a clear well-presented report with a suitable tone." — **[J24 p.8, Mahoney prof skills]**
- **Detector implication:** where a drill's requirement names an output format (report / memo / briefing notes to a named audience), format compliance — opening rubric, addressee, sub-headings, conclusion — is separately markable. **Grant's ruling needed** on whether v1 rubrics carry a format criterion or whether F12 stays documented-but-unwired (most AFM narrative drills built so far do not impose a report format).

## Rubric implications (the deterministic detection targets)
Each drill's marking contract derives its criteria from F1–F12: requirement-coverage (F7), scenario-anchor count — named scenario facts actually USED (F5), point development claim→because→implication (F2/F3/F6), committed verdict present (F4), issue→action mapping + feasibility (F8), own-figure carry into discussion where data exists (F9), scepticism challenge of stated information **with reasons given** (F10), breadth balance (F11), zero credit for scenario restating (F1), format compliance where a format is required (F12, unwired pending ruling).

Two detector refinements surfaced by this pass:
- **F10 "providing reasons"** [SD24 p.7] — a challenge without a stated reason should not score the scepticism criterion; and a challenge that is "too vague to be creditable" [SD24 p.17] needs a specificity floor.
- **F6 absolutist overclaim** [J24 p.6] — "eliminate all risks" style absolutes are explicitly marked down as insufficiently nuanced; a banned-absolutes sweep is a cheap deterministic detector.

---

## VERIFICATION LOG — 20/07/2026 (work machine)

**Method.** Each of the five PDFs converted with `pdftotext` (v4.00), split on form-feed to give true page boundaries. Every §1b quote located by normalised-whitespace substring match (curly→straight quotes, en/em dash→hyphen, ligatures folded) so that any word- or number-level difference would still fail to match. PDF page number confirmed equal to the printed footer number on all five reports.

**Result: 32/32 base quotes VERIFIED. 0 MISQUOTE. 0 NOT FOUND.**

Five rendering deltas recorded (none substantive — no word, number, or meaning differs):

| # | Quote | Delta | Disposition |
|---|---|---|---|
| **D1** | F2b (SD23 p.5) | Base file renders the nested quote as `'it is assumed…correctly'` (single); the original uses **double** quotes `"it is assumed…correctly"`. | Typographic only. Left as single in the base text for readability; original style noted here. |
| **D2** | F7b (SD25) | Sentence spans the p.13→p.14 page break; the quoted text ends mid-sentence at "treasury department". Original continues: "…or the advantages of setting up regional treasury functions across Asia." | Legitimate truncation. Page ref corrected to **pp.13–14**. |
| **D3** | F4c (SD25 p.13) | Base file rendered "…quite a few candidates failed to **[recommend]**". Original reads "…quite a few candidates failed to **do this**", where "this" = the recommendation asked for in the preceding clause. | Editorial gloss, correctly bracketed. **Replaced with the true verbatim sentence** (incl. the preceding clause so the antecedent is explicit). |
| **D4** | F5c (MJ25 pp.18–19) | Ellipsis elides real text. Unelided: "…without considering the implications **of things like a reducing profit margin, increasing customer complaints and a lack of capital investment** in the context of a railway services operating company." | Legitimate elision; both fragments verbatim. Head on p.18, tail on **p.19** — page ref corrected from the base file's implied single page. |
| **D5** | F3a / F4a / F4b | `pdftotext` renders the original's opening curly single-quote as a backtick (`` `sitting on the fence' ``). Initially read as a mismatch. | Extraction artifact, not a quote defect. Words identical. |

**Report-label audit.** The co-founder's labels MJ25 / SD23 / SD25 are all **correct** and map to local filenames `MJ25…`, `D23…`, `afm_examiner_report_d25.pdf` respectively (see Source register). No misattribution: every quote attributed to a report was found *in that report*, and the distinctive question names (Kampai/Sohbet/GCR, McKeever/Abertafol/Southmed, Halstock/Drimpton/Passmore) appear in exactly one PDF each with zero cross-contamination.

**J24 + SD24 extension.** Both reports mined in full.
- **J24 (March/June 2024 — Mahoney, Littlebredy, Garnod):** 13 new instances added across **F1, F2, F3, F4, F5, F6, F7, F8, F9, F10, F11**. Notable: the OFR principle stated explicitly by ACCA [p.14]; the absolutist-overclaim instance [p.6].
- **SD24 (September/December 2024 — Northney, Mortexa, Zulla):** 20 new instances added across **F1, F2, F3, F5, F6, F7, F9, F10, F11**, plus the **new mode F12**. Notable: the fullest scepticism definition incl. the "providing reasons" clause [p.7]; the "too vague to be creditable" bar [p.17].
- **No J24 instance of F4** beyond the professional-skills statement, and **no SD24 instance of F4 or F8** — fence-sitting and issue≠action are attested in MJ25/SD25 but not independently in SD24. Recorded so the base is not overstated.
- **Observed but NOT adopted as a mode:** candidate *abandonment* after a failed calculation ("seemed to get disheartened and give up" [SD24 p.11]; also [J24 p.16], [SD24 p.14]). Real and repeated, but it is an exam-technique failure producing an *absent* answer, not a defect detectable in a submitted narrative — no rubric criterion proposed.

**Self-check on this pass (page refs).** The first draft of the page refs was derived by mapping a quote's *line* in the extracted text to a page. That is unsafe: `pdftotext` emits a whole logical paragraph as one line, so a paragraph starting on page N can carry the quoted sentence onto page N+1. A second, content-based pass (searching each page's actual text) caught **8 wrong refs** in the draft and they were corrected before this file was finalised: F2/SD24 6→7, F4/J24 8→9, F7a/J24 17→18, F7b/SD24 3→4, F10a/J24 3→4, F11b/SD24 6→7, F5b/SD24 6→**6–7 (spans)**, F5c/MJ25 18→**18–19 (spans)**. **Every page ref in this file is now content-verified**, not line-derived. Three quotes span a page break (F5c, F7b, F5-SD24b) — in each the printed sentence is continuous and only the page furniture (running header + footer) interrupts it in extraction.

---

## VERIFICATION LOG — §1a TRACE, 20/07/2026 (work machine)

**Method.** Every §1a claim was traced to an anchor: (a) an `afm-framework.ts` evidence constant, or (b) a verified §1b quote. All 24 quoted strings matched a framework constant, and all structural claims (20/100 marks, all-four-at-L3, Section A/B skill rules, zero L1 LOs, and all 9 LO level/mode pairs) reconciled against `EXAM_STRUCTURE` / `PROFESSIONAL_SKILLS` / `SYLLABUS_MAP`. **The framework anchor alone was then treated as insufficient** — the guide PDF turned out to be present on this machine, so every claim was re-verified against ACCA's own text (21 pages, `pdftotext -layout` + column splitting).

**Result: §1a VERIFIED, with 2 defects found and fixed + 1 formatting note.**

| # | Finding | Detail | Disposition |
|---|---|---|---|
| **G1** | **FABRICATED GLOSS (the residue)** | §1a quoted L2 as "Application and analysis — **apply concepts, perform calculations, analyse, advise on application of techniques**" and L3 as "Synthesis and evaluation — **evaluate, recommend justified actions, assess trade-offs, exercise strategic judgement**", presented as study-guide verbatim. The guide gives **only the bare labels** on p.5. Each gloss phrase scores **0 hits across all 21 guide pages** ("perform calculations", "advise on application of techniques", "assess trade-offs", "exercise strategic judgement", "recommend justified actions"). Origin: `INTELLECTUAL_LEVELS` in `scripts/afm-framework.ts`, whose L1 sibling also carries the plainly editorial clause "not the primary level examined at AFM". That constant is **not** marked "verbatim", unlike the framework's four blocks that are. | **FIXED** — replaced with the guide's bare labels + the p.5 context sentence; old wording quarantined in an explicit do-not-reinstate note. Framework annotated (see below). |
| **G2** | **WRONG PAGE CITATION** | The Professional-skills heading cited "(study guide p.5)". p.5 is the *intellectual levels* page; Section F professional skills are on **p.13** (the framework itself says pp.13–14). | **FIXED** — corrected to p.13; the mark-split/examining rules now cite their own pages (p.15 Section A, p.16 Section B, p.18 the 80/20 split). |
| **G3** | **LIST-FORMAT NORMALISATION** (not a misquote) | Guide renders LO sub-items as a capitalised list — B1b `i) The significance… ii) The measurement…`, B3i `i) Modigliani and Miller… ii) Static trade-off theory` — where §1a/the framework inline them as `(i) the significance…; (ii) static trade-off theory`. Substance and wording identical; only list punctuation and opener capitalisation differ. | **RECORDED**, text left inlined for readability; noted at the LO section head. |

**Anchor map (all §1a claims → guide page).**

| Claim group | Anchor | Guide page |
|---|---|---|
| Intellectual level labels L1/L2/L3 + context sentence | GUIDE | p.5 |
| No L1 LOs in AFM | `SYLLABUS_MAP` (0 of 80 at level 1) + GUIDE p.5 | p.5 |
| 13 professional-skills sub-descriptors (all four skills) | GUIDE | p.13 |
| All four skills at L3 (`[3]` superscripts) | GUIDE | p.13 |
| Section A: 40 technical + 10 prof skills, all four examined | GUIDE | p.15 |
| Section B: 20 technical + 5 prof skills, min two of A&E/Scep/CA | GUIDE | p.16 |
| 20/100 professional-skills marks | GUIDE ("80 technical + 20 professional skills marks") | p.18 |
| B1b, B3a descriptors | GUIDE | p.9 |
| B3b, B3c, B3g, B3i, B4d descriptors | GUIDE | p.10 |
| B5c, B5d descriptors | GUIDE | p.11 |

**Residue: NONE remaining.** G1 was the residue — a claim that traced to a framework constant but to no verified source, because the constant itself was authored. It did not need to be referred out: the guide was on the machine, so it was resolved against ACCA's own text rather than paraphrased.

**Upstream fix.** `scripts/afm-framework.ts` now carries a warning on `INTELLECTUAL_LEVELS` recording that the em-dash tails are editorial and must not be quoted as guide text — otherwise the same gloss would be re-extracted into the next document that trusts the framework.
