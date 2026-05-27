# IBO Mark Scheme Evidence File

**Rule 22 compliance file.** Every constant in `MARK_SCHEME_FRAMEWORK_V3` must be traceable to a verbatim quote below.

**Sources:**
- *IB Business Management Guide* (first assessment 2024) — `docs/_local/Business Management Subject Guide.pdf` (77 pp)
- *IB Economics Guide* (first assessment 2022) — `docs/_local/new_economics_guide_first_assessment_2022.pdf` (83 pp)

**DO NOT commit the PDFs** (gitignored — IBO copyright). Quotes transcribed here for build-time reference only.

**PDF page offset:** BM guide page = PDF page − 6. Economics guide page = PDF page − 5.

---

## §1. IB Assessment Framework (shared concepts)

### §1.1 Assessment Objectives (AO1–AO4)

The AO taxonomy is shared across BM and Economics. Structure is identical; subject-specific content differs.

#### IB Business Management

> Source: *Business Management Subject Guide* (first assessment 2024), p. 18

"By the end of the business management course, students are expected to achieve the following assessment objectives."

**AO1: Knowledge and understanding**
Demonstrate knowledge and understanding of:
- business management tools and theories
- course topics and concepts
- business problems, issues and decisions
- HL extension topics (**HL only**).

**AO2: Application and analysis**
Apply and analyse:
- business management tools and theories
- course topics and concepts
- business problems, issues and decisions
- business decisions and issues through the selection and use of appropriate data
- HL extension topics (**HL only**).

**AO3: Synthesis and evaluation**
Synthesize and evaluate:
- business management tools and theories
- course topics and concepts
- business problems, issues and decisions
- stakeholder interests to reach informed business decisions
- recommendations for competing future strategic options (**HL only**)
- HL extension topics (**HL only**).

**AO4: Use and application of appropriate skills**
- Select and apply relevant business management tools, theories and concepts to support research into a business issue or problem.
- Select, interpret and analyse business materials from a range of primary and secondary sources.
- Create well-structured materials using business management terminology.
- Communicate analysis, evaluation and conclusions of research effectively.

#### IB Economics

> Source: *Economics Guide* (first assessment 2022), p. 17

"By the end of the economics course, students are expected to achieve the following assessment objectives (AOs)."

**AO1: Knowledge and understanding**
- Demonstrate knowledge and understanding of specified content
- Demonstrate knowledge and understanding of the common SL/HL syllabus
- Demonstrate knowledge and understanding of current economic issues and data
- At **HL only:** demonstrate knowledge and understanding of the extension topics

**AO2: Application and analysis**
- Apply economic concepts and theories to real-world situations
- Identify and interpret economic data
- Analyse how economic information is used effectively in particular contexts
- In the internal assessment task: explain the link between key economic concepts and economic commentaries
- At **HL only:** demonstrate application and analysis of the extension topics

**AO3: Synthesis and evaluation**
- Examine economic concepts and theories
- Use economic concepts and examples to construct and present an argument
- Discuss and evaluate economic information and theories
- At **HL only:**
  - demonstrate economic synthesis and evaluation of the extension topics
  - select and use economic data using economic theory to make policy recommendations.

**AO4: Use and application of appropriate skills**
- Produce well-structured written material, using appropriate economic theory, concepts and terminology
- Produce and use diagrams to help explain economic theory, concepts and real-world issues
- Select, interpret and analyse appropriate extracts from the news media
- Interpret appropriate data sets
- Use quantitative techniques to identify, explain and analyse economic relationships

---

### §1.2 Command Terms

The command term taxonomy (AO1–AO4) is shared across both subjects. AO4 terms differ: BM lists drawing/construction terms (Annotate, Construct, Plot, Prepare); Economics adds quantitative terms (Derive, Measure, Show that, Sketch, Solve). AO1–AO3 term lists are near-identical, with BM adding Identify and Demonstrate to AO1/AO2.

#### IB Business Management

> Source: *Business Management Subject Guide* (first assessment 2024), pp. 19–20

"Command terms are classified according to the AO levels."

"Command terms related to cognitive demand progress from AO1 to AO3, while AO4 command terms are specific to particular skills. Teachers and students must be familiar with the assessment objectives and the command terms in order to understand the depth of treatment required in teaching and in examination questions."

| Assessment objective | Key command terms | Depth |
|---|---|---|
| **AO1**—knowledge and understanding | Define, Describe, Identify, List, Outline, State | "These terms require students to learn and comprehend the meaning of information." |
| **AO2**—application and analysis | Analyse, Apply, Comment, Demonstrate, Distinguish, Explain, Suggest | "These terms require students to use their knowledge and skills to break down ideas into simpler parts and to see how the parts relate." |
| **AO3**—synthesis and evaluation | Compare, Compare and contrast, Contrast, Discuss, Evaluate, Examine, Justify, Recommend, To what extent | "These terms require students to rearrange component ideas into a new whole and make judgments based on evidence or a set of criteria." |
| **AO4**—use and application of appropriate skills | Annotate, Calculate, Complete, Construct, Determine, Draw, Label, Plot, Prepare | "These terms require students to demonstrate the selection and use of subject-specific skills and techniques." |

#### IB Economics

> Source: *Economics Guide* (first assessment 2022), pp. 18–19

"Command terms are classified according to the AO levels."

"Command terms related to cognitive demand progress from AO1 to AO3, while AO4 command terms are specific to particular skills."

| Assessment objective | Key command terms | Depth |
|---|---|---|
| **AO1**—knowledge and understanding | Define, Describe, List, Outline, State | "These terms require students to learn and comprehend the meaning of information." |
| **AO2**—application and analysis | Analyse, Apply, Comment, Distinguish, Explain, Suggest | "These terms require students to use their knowledge and skills to break down ideas into simpler parts and to see how the parts relate." |
| **AO3**—synthesis and evaluation | Compare, Compare and contrast, Contrast, Discuss, Evaluate, Examine, Justify, Recommend, To what extent | "These terms require students to rearrange component ideas into a new whole and make judgments based on evidence or a set of criteria." |
| **AO4**—use and application of appropriate skills | Calculate, Construct, Derive, Determine, Draw, Identify, Label, Measure, Plot, Show, Show that, Sketch, Solve | "These terms require students to demonstrate the selection and use of subject-specific skills and techniques." |

**Mia mapping note:** AO3 command terms (Discuss, Evaluate, Examine, Justify, To what extent) identify extended-response questions → `band_descriptor`. AO1 terms (Define, List, State, Outline) identify short structured questions → `content_checklist`. AO4 Calculate/Determine identifies quantitative questions → `hybrid`.

---

### §1.3 Assessment Methods

Three distinct methods are used across IB external assessment. Each maps to a `scheme_type`.

#### IB Business Management

> Source: *Business Management Subject Guide* (first assessment 2024), pp. 37–38

**Assessment criteria** (p. 37):

> "Assessment criteria are used when the assessment task is open-ended. Each criterion concentrates on a particular skill that students are expected to demonstrate. An assessment objective describes what students should be able to do, and assessment criteria describe how well they should be able to do it. Using assessment criteria allows discrimination between different answers and encourages a variety of responses. Each criterion comprises a set of hierarchically ordered level descriptors. Each level descriptor is worth one or more marks. Each criterion is applied independently using a best-fit model. The maximum marks for each criterion may differ according to the criterion's importance. The marks awarded for each criterion are added together to give the total mark for the piece of work."

*→ Used in BM Paper 3 Question 3 (17 marks total: Criterion A 4m + B 4m + C 6m + D 3m). Maps to `criteria_marked`.*

**Markbands** (p. 37):

> "Markbands are a comprehensive statement of expected performance against which responses are judged. They represent a single holistic criterion divided into level descriptors. Each level descriptor corresponds to a range of marks to differentiate student performance. A best-fit approach is used to ascertain which particular mark to use from the possible range for each level descriptor."

*→ Used in BM Papers 1 and 2 Section B (10-mark extended response). Maps to `band_descriptor`.*

**Analytic markschemes** (p. 38):

> "Analytic markschemes are prepared for those examination questions that expect a particular kind of response and/or a given final answer from students. They give detailed instructions to examiners on how to break down the total mark for each question for different parts of the response."

*→ Used in BM Papers 1 and 2 Section A (structured questions). Maps to `content_checklist` for short-answer questions and `hybrid` for calculate questions.*

#### IB Economics

> Source: *Economics Guide* (first assessment 2022), p. 59

> "Two different methods are used to assess students.
> - Analytic markschemes
> - Markbands
>
> For all three examination papers, there are analytic markschemes and markbands. The markbands are related to the assessment objectives established for the economics course and the individuals and societies grade descriptors and are published in the guide. The analytic markschemes are specific to each examination and are published separately in a markscheme document."

*→ Economics short-answer parts (P1 part(a), P2 parts(a)–(f)) use analytic markschemes → `content_checklist` or `hybrid`. Extended parts (P1(b) 15m, P2(g) 15m, P3(b) 10m) use markbands → `band_descriptor`.*

---

### §1.4 Assessment Outlines

#### IB Business Management — SL

> Source: *Business Management Subject Guide* (first assessment 2024), p. 39

First assessment: **2024**

| Component | Duration | Weighting | Max marks |
|---|---|---|---|
| **External assessment** | 3 hours | **70%** | — |
| Paper 1 | 1 hour 30 min | 35% | 30 |
| — Section A (structured questions) | — | — | 20 |
| — Section B (extended response, one from two) | — | — | 10 |
| Paper 2 | 1 hour 30 min | 35% | 40 |
| — Section A (structured questions, quantitative focus) | — | — | 20 |
| — Section B (structured + extended response, one from two) | — | — | 20 |
| Internal assessment | 20 hours | 30% | 25 |

Paper 1: "Based on a pre-released statement that specifies the context and background for the unseen case study. Assessment objectives: AO1, AO2, AO3, AO4 (30 marks)"

Section A: "Marks are allocated using an analytic markscheme."
Section B: "Marks are allocated using a combination of an analytic markscheme and markbands."

Paper 2: "Based on unseen stimulus material with a quantitative focus. Assessment objectives: AO1, AO2, AO3, AO4 (40 marks)"

Section A: "The questions have a quantitative focus. … Marks are allocated using an analytic markscheme."
Section B: "The structured questions are worth a total of 10 marks. Each extended response question is worth 10 marks. … Marks are allocated using a combination of an analytic markscheme and markbands."

#### IB Business Management — HL

> Source: *Business Management Subject Guide* (first assessment 2024), p. 40 (outline); pp. 45–47 (details)

First assessment: **2024**

| Component | Duration | Weighting | Max marks |
|---|---|---|---|
| **External assessment** | 4 hours 30 min | **80%** | — |
| Paper 1 | 1 hour 30 min | 25% | 30 |
| — Section A | — | — | 20 |
| — Section B | — | — | 10 |
| Paper 2 | 1 hour 45 min | 30% | 50 |
| — Section A | — | — | 30 |
| — Section B | — | — | 20 |
| Paper 3 (HL only) | 1 hour 15 min | 25% | 25 |
| — Question 1 | — | — | 2 |
| — Question 2 | — | — | 6 |
| — Question 3 | — | — | 17 |
| Internal assessment | 20 hours | 20% | 25 |

Paper 1 HL (p. 45): "This paper is the same for both SL and HL." Weighting 25%.

Paper 2 HL (p. 46): "The structure of this paper is the same as SL paper 2. However … HL students answer more questions." Section A: 30 marks, Section B: 20 marks, total 50 marks. "Questions in this paper are drawn from units 1 to 5 of the syllabus **including** the HL extension material and topics studied at HL only."

Paper 3 HL (p. 47): "**This is an HL only paper.** … Students answer the three compulsory questions given based on the stimulus material. … Marks are allocated using a combination of an analytic markscheme and the assessment criteria."

Paper 3 mark split (p. 47 AO table):
- Question 1: 2 marks — AO1 only
- Question 2: 6 marks — AO1, AO2
- Question 3: 17 marks — AO1, AO2, AO3, AO4 (criteria_marked)

#### IB Economics — SL

> Source: *Economics Guide* (first assessment 2022), p. 57

First assessment: **2022**

| Component | Duration | Weighting | Max marks |
|---|---|---|---|
| **External assessment** | 3 hours | **70%** | — |
| Paper 1 | 1 hour 15 min | 30% | 25 |
| — Part (a) | — | — | 10 |
| — Part (b) | — | — | 15 |
| Paper 2 | 1 hour 45 min | 40% | 40 |
| — Parts (a)–(f) | — | — | 25 |
| — Part (g) | — | — | 15 |
| Internal assessment | 20 hours | 30% | 45 |

Paper 1: "An extended response paper (25 marks). Assessment objectives: AO1, AO2, AO3, AO4. Syllabus content (excluding HL extension material). Students answer one question from a choice of three. (25 marks)"

Paper 2: "A data response paper (40 marks). Assessment objectives: AO1, AO2, AO3, AO4. Syllabus content (excluding HL extension material). Includes some quantitative questions. Students answer one question from a choice of two. (40 marks)"

Parts (a)–(f) mark breakdown (p. 61, SL): part(a) 4 marks, part(b) 5 marks, part(c) 4 marks, part(d) 4 marks, part(e) 4 marks, part(f) 4 marks = 25 marks. "Marks are allocated using a combination of an analytic markscheme and markbands."

Part (g) 15 marks: markbands (see §3 for full markband text).

#### IB Economics — HL

> Source: *Economics Guide* (first assessment 2022), p. 58

First assessment: **2022**

| Component | Duration | Weighting | Max marks |
|---|---|---|---|
| **External assessment** | 4 hours 45 min | **80%** | — |
| Paper 1 | 1 hour 15 min | 20% | 25 |
| Paper 2 | 1 hour 45 min | 30% | 40 |
| Paper 3 (HL only) | 1 hour 45 min | 30% | 60 |
| — Per question (×2) | — | — | 30 |
| — — Part (a) | — | — | 20 |
| — — Part (b) | — | — | 10 |
| Internal assessment | 20 hours | 20% | 45 |

Paper 3 (p. 58): "A policy paper (60 marks). Assessment objectives: AO1, AO2, AO3, AO4. Syllabus content including HL extension material. Includes both quantitative and qualitative questions. Students answer two compulsory questions. (30 marks per question)"

Paper 3 (p. 62): "Students answer two compulsory questions. The questions are subdivided into parts (a) and (b). Part (a) has subparts." Part (a): 20 marks, analytic markscheme. Part (b): 10 marks, markbands (see §4 for full markband text).

---

### §1.5 IBO General Marking Principles

#### Best-fit application

The best-fit principle governs all markband and assessment criteria marking across both subjects.

**BM — from markbands definition:**

> Source: *Business Management Subject Guide* (first assessment 2024), p. 37

> "A best-fit approach is used to ascertain which particular mark to use from the possible range for each level descriptor."

**BM — from assessment criteria definition:**

> Source: *Business Management Subject Guide* (first assessment 2024), p. 37

> "Each criterion is applied independently using a best-fit model."

**Economics — best-fit statement:**

> Source: *Economics Guide* (first assessment 2022), p. 68 (IA section, "Using assessment criteria for internal assessment")

> "The aim is to find, for each criterion, the descriptor that conveys most accurately the level attained by the student, using the best-fit model. A best-fit approach means that compensation should be made when a piece of work matches different aspects of a criterion at different levels. The mark awarded should be one that most fairly reflects the balance of achievement against the criterion. It is not necessary for every single aspect of a level descriptor to be met for that mark to be awarded."

> "When assessing a student's work, teachers should read the level descriptors for each criterion until they reach a descriptor that most appropriately describes the level of the work being assessed. If a piece of work seems to fall between two descriptors, both descriptors should be read again and the one that more appropriately describes the student's work should be chosen."

> "Where there are two or more marks available within a level, teachers should award the upper marks if the student's work demonstrates the qualities described to a great extent; the work may be close to achieving marks in the level above. Teachers should award the lower marks if the student's work demonstrates the qualities described to a lesser extent; the work may be close to achieving marks in the level below."

*Provenance note: This passage is in the Econ IA section. The Economics external assessment section (pp. 59–66) lists markband tables but contains no equivalent standalone best-fit statement. The BM guide states best-fit explicitly for both markbands and criteria (p. 37). The same best-fit approach applies to external assessment markbands in both subjects per IBO Programme standards — the absence of a repeat statement in the Econ external section is an omission of duplication, not a difference in principle.*

---

#### Stimulus reference and use of examples

Both guides make explicit that reaching higher markbands requires substantiated reference to the stimulus material and real-world examples — not bare assertion.

**BM — "Use of examples and case studies":**

> Source: *Business Management Subject Guide* (first assessment 2024), p. 42

> "In order to be awarded marks in the higher markbands and levels of assessment criteria, students are expected, where appropriate, to refer to the stimulus material provided in examinations, use case studies explored in class and illustrate their answers with examples. In this way, students highlight their understanding of how business management tools and theories operate in practice. Where the stimulus material, case studies and examples are referred to, students should not simply state the information, but rather offer some explanation of how it relates to the question asked."

**Economics — "Use of examples":**

> Source: *Economics Guide* (first assessment 2022), p. 59

> "Students are expected, where appropriate, to illustrate their answers with real-world examples in order to reach the highest markbands. Examples should be used to highlight economic concepts, theories and relationships in the real world. When examples are used, students should not just state the example (as this is too limited) but should also offer some explanation of the example in relation to the question asked."

*Mia marking implication: An assertion without stimulus reference or real-world grounding cannot be placed in the top markband. Mia must quote or reference student text that grounds the claim before awarding high-band marks.*

---

#### Use of subject-specific terminology

Both guides require students to demonstrate accurate use of subject terminology as a condition of reaching higher bands.

**BM — "Use of business management terms":**

> Source: *Business Management Subject Guide* (first assessment 2024), p. 42

> "Students are expected to demonstrate the ability to appropriately define, use and apply the business management terms included in the 'Syllabus' section."

**Economics — "Use of economic terms":**

> Source: *Economics Guide* (first assessment 2022), p. 60

> "Students are expected to demonstrate the ability to appropriately define, use and apply the economics terms included in the 'Syllabus' section."

*Mia marking implication: Correct use of terminology is a positive indicator for band placement. Mia should note accurate terminology use when awarding marks and flag gaps where a student uses informal language where a subject term was required.*

---

#### Per-paper credit rules and carry-forward errors

Per-paper rules governing credit for equivalent expressions, synonyms, and no-penalty carry-forward of errors are documented in IBO official mark schemes, which are published separately from the Subject Guide and are examination-specific.

**These rules are not in the Subject Guides and cannot be cited here under Rule 22.**

Per-paper credit-as-equivalent and no-repeated-error rules are documented in IBO published mark schemes (not the Subject Guide). Mia consumes these via the generated `mark_schemes` table at runtime, not from this evidence file.

---

*End of §1.*

---

## §2. Cross-Subject Patterns — scheme_type Taxonomy

### §2.A Paper-to-scheme_type Mapping

Where a section contains both descriptive and quantitative questions, scheme_type is determined per individual question at generation time — two rows in `mark_schemes`, not one. SL and HL rows are merged where the assignment is identical.

| Subject | Paper | Section / Part | Max marks | scheme_type | Source |
|---|---|---|---|---|---|
| IB BM (SL + HL) | Paper 1 | Section A — structured questions | 2–4 per question; 20 total | `content_checklist` | "Marks are allocated using an analytic markscheme." (BM p. 43) |
| IB BM (SL + HL) | Paper 1 | Section B — extended response | 10 | `band_descriptor` | "Marks are allocated using a combination of an analytic markscheme and markbands." (BM p. 43) |
| IB BM (SL + HL) | Paper 2 | Section A — descriptive sub-questions | 2–4 per question; subset of 20 / 30 | `content_checklist` | "Marks are allocated using an analytic markscheme." (BM pp. 44, 46) |
| IB BM (SL + HL) | Paper 2 | Section A — calculate sub-questions | 2–6 per question; subset of 20 / 30 | `hybrid` | "The questions have a quantitative focus." (BM pp. 44, 46) |
| IB BM (SL + HL) | Paper 2 | Section B — structured sub-questions | 10 | `content_checklist` | "The structured questions are worth a total of 10 marks." Analytic markscheme. (BM pp. 44, 46) |
| IB BM (SL + HL) | Paper 2 | Section B — extended response | 10 | `band_descriptor` | "Each extended response question is worth 10 marks. … Marks are allocated using a combination of an analytic markscheme and markbands." (BM pp. 44, 46) |
| IB BM (HL only) | Paper 3 | Question 1 | 2 | `content_checklist` | "For question 1 and question 2 an analytic markscheme will be used." (BM p. 47) |
| IB BM (HL only) | Paper 3 | Question 2 | 6 | `content_checklist` | "For question 1 and question 2 an analytic markscheme will be used." (BM p. 47) |
| IB BM (HL only) | Paper 3 | Question 3 | 17 | `criteria_marked` | "For question 3 the following assessment criteria will be used." (BM p. 47) |
| IB Economics (SL + HL) | Paper 1 | Part (a) | 10 | `band_descriptor` | Markbands published in guide. (Econ p. 63) |
| IB Economics (SL + HL) | Paper 1 | Part (b) | 15 | `band_descriptor` | Markbands published in guide. (Econ pp. 63–64) |
| IB Economics (SL + HL) | Paper 2 | Parts (a)–(f): descriptive sub-questions | 2–5 per part; 25 total | `content_checklist` | "For parts (a) to (f) a markscheme will be used." (Econ p. 64) |
| IB Economics (SL + HL) | Paper 2 | Parts (a)–(f): quantitative sub-questions | 2–5 per part; subset of 25 | `hybrid` | "Includes some quantitative questions." (Econ p. 57); analytic markscheme per part |
| IB Economics (SL + HL) | Paper 2 | Part (g) | 15 | `band_descriptor` | Markbands published in guide. (Econ pp. 64–65) |
| IB Economics (HL only) | Paper 3 | Part (a): descriptive subparts | subset of 20 | `content_checklist` | "For part (a) a markscheme will be used." (Econ p. 65); see §2.E |
| IB Economics (HL only) | Paper 3 | Part (a): quantitative subparts | subset of 20 | `hybrid` | "Includes both quantitative and qualitative questions." (Econ p. 58); see §2.E |
| IB Economics (HL only) | Paper 3 | Part (b) | 10 | `band_descriptor` | Markbands published in guide. (Econ pp. 65–66) |

---

### §2.B Marking-rule Invariants (verifier constraints)

For each scheme_type, the verifier must enforce the following deterministic constraint. A scheme failing its invariant is rejected at verify time regardless of content quality.

**`content_checklist`**

Sum of all `accepted_points[i].marks` must equal `max_marks`.

```
INVARIANT: sum(accepted_points[*].marks) == max_marks
```

*Example: A 4-mark question must have accepted_points marks summing to exactly 4. A 2+2 split is valid; a 3+2 split is a reject.*

---

**`band_descriptor`**

Band ranges must form a complete, gapless, non-overlapping coverage of [0, max_marks].

```
INVARIANT:
  bands[0].range[0] == 0
  for each consecutive pair (i, i+1): bands[i].range[1] + 1 == bands[i+1].range[0]
  bands[-1].range[1] == max_marks
```

*Example: For a 10-mark question, valid ranges include [0,0], [1,2], [3,4], [5,6], [7,8], [9,10]. A gap between [3,4] and [6,7] is a reject. An overlap where [3,5] and [4,7] co-exist is a reject.*

---

**`hybrid`**

Sum of method_marks steps plus answer_marks.correct_answer must equal max_marks.

```
INVARIANT: sum(method_marks[*].marks) + answer_marks.correct_answer == max_marks
```

*Example: A 6-mark calculate question with 3 method marks and 3 answer marks: 3+3=6. A scheme with 2 method marks and 3 answer marks on a 6-mark question is a reject.*

---

**`criteria_marked`**

Sum of all criteria max_marks must equal total max_marks. Additionally, within each criterion, the band ranges must satisfy the `band_descriptor` invariant.

```
INVARIANT: sum(criteria[*].max_marks) == max_marks
INVARIANT (per criterion): criterion band ranges cover [0, criterion.max_marks] with no gaps and no overlaps
```

*Example: BM P3 Q3 — Criterion A (4) + B (4) + C (6) + D (3) = 17. Any criteria set summing to ≠ 17 is a reject. A criterion with ranges [0,0], [1,2], [4,4] on max_marks=4 is also a reject (gap at 3).*

---

### §2.C Cross-Subject Convergences and Divergences

**Convergences**

1. **Extended-response marking shape is identical across subjects.** Both BM and Economics use `band_descriptor` for their extended-response questions. The JSON shape — an array of `{range: [lo, hi], descriptor: string}` objects — is reusable across subjects. The content differs; the structure does not.

2. **Short structured questions use `content_checklist` in both subjects.** BM P1/P2 Section A and Econ P2 parts (a)–(f) share the `accepted_points` + `marking_rule` shape.

3. **AO4 Calculate/quantitative questions use `hybrid` in both subjects.** BM P2 Sec A calculate questions and Econ P2 quantitative subparts both split into method marks + answer marks.

**Divergences**

1. **`criteria_marked` exists only in BM.** BM P3 Q3 (17 marks) is the sole use of `criteria_marked` in the current seed library. Econ P3 part (b) is `band_descriptor`, not `criteria_marked`.

2. **Econ P1 part (a) is `band_descriptor` despite lacking AO3.** The 10-mark Econ P1 part (a) covers AO1, AO2, AO4 — not AO3 — yet still uses markbands (see Econ p. 63 markband table). The markband descriptors are shallower (describe/explain depth, no synthesis requirement) but the structural shape is the same `band_descriptor`. This is the only `band_descriptor` instance in the seed library without an AO3 requirement.

3. **Econ has unique AO4 command terms not present in BM.** Per §1.2:
   - Econ-only AO4: Derive, Measure, Show that, Sketch, Solve
   - BM-only AO4: Annotate, Complete, Construct, Prepare
   - Econ "Show that" and "Solve" → `hybrid`. BM "Construct" → `content_checklist` (diagram instruction, not a calculate-step chain).

4. **Diagram requirements are Econ-only.** The Economics guide states: "Students are expected, where appropriate, to include correctly labelled and clearly drawn diagrams. Sometimes individual questions specify that the use of diagrams is essential because more detailed information is required from the students in order to show specific knowledge and understanding." (Econ p. 59). The BM guide has no equivalent general diagram requirement. Impact on `scheme_data`: `content_checklist` entries for Econ may include diagram-required accepted_points (e.g. `{"point": "correctly labelled supply and demand diagram with axes", "marks": 2}`). BM `content_checklist` entries do not.

---

### §2.D Command-Term-to-scheme_type Routing

The command term in the question determines the scheme_type, modulated by the question's mark allocation. Derived from the AO tables in §1.2.

| AO | Command terms | Marks | scheme_type | Rule |
|---|---|---|---|---|
| AO1 | Define, Describe, Identify (BM only), List, Outline, State | 1–4 | `content_checklist` | Recall and reproduction. Each mark corresponds to one discrete accepted point. |
| AO2 | Analyse, Apply, Comment, Demonstrate (BM only), Distinguish, Explain, Suggest | 2–4 | `content_checklist` | Application at low mark allocation; still discrete point-by-point marking. |
| AO2 | Analyse, Apply, Comment, Demonstrate (BM only), Distinguish, Explain, Suggest | 6+ | `band_descriptor` | Higher mark allocation signals holistic extended response; markbands apply. |
| AO3 | Compare, Compare and contrast, Contrast, Discuss, Evaluate, Examine, Justify, Recommend, To what extent | any | `band_descriptor` | Synthesis and evaluation always uses markbands. Exception: BM P3 Q3 uses `criteria_marked` because the IBO published assessment criteria supersede a generic markband. |
| AO4 (quantitative) | Calculate, Determine, Derive (Econ only), Solve (Econ only), Show that (Econ only) | any | `hybrid` | Method marks + answer marks structure. |
| AO4 (non-quantitative) | Annotate (BM only), Complete (BM only), Construct (BM only), Draw, Identify (Econ only), Label, Measure (Econ only), Plot, Prepare (BM only), Sketch (Econ only) | any | `content_checklist` | Discrete skill demonstration; each required element earns one mark point. |

**Disambiguation rule for AO2 at 5–6 marks:** Default to `band_descriptor`. Apply `content_checklist` only if the question is structurally a list of discrete sub-clauses each worth 1–2 marks, not a holistic response. The generator must flag all AO2 questions at 5 or 6 marks for human review.

---

### §2.E Edge Cases

**Edge case 1: BM P2 Section B 10-mark — `band_descriptor` despite mixed AOs**

> Source: *Business Management Subject Guide* (first assessment 2024), p. 44

The Section B AO table covers AO1, AO2, AO3, AO4, and Section B contains both structured sub-questions (10 marks) and an extended response (10 marks). Despite the mixed AO profile, the 10-mark extended response uses markbands → `band_descriptor`. The structured sub-questions use the analytic markscheme → `content_checklist`.

*Assignment:* In the seed library, BM P2 Section B structured parts are seeded as `content_checklist`; the 10-mark Discuss/Evaluate extended response is seeded as `band_descriptor`. These are two separate `mark_schemes` rows linked to two separate `questions` rows.

---

**Edge case 2: Econ Paper 3 Part (a) — `content_checklist` or `hybrid`?**

> Source: *Economics Guide* (first assessment 2022), pp. 58, 62

Econ P3 is described as "A policy paper … Includes both quantitative and qualitative questions." Part (a) is 20 marks with subparts; "For part (a) a markscheme will be used." The AO table for Part (a) covers AO1, AO2, AO4 — not AO3.

Because Part (a) contains both qualitative sub-questions (AO1/AO2 Explain/Define) and quantitative sub-questions (AO4 Calculate/Determine), the scheme_type **varies per individual sub-question**:
- Qualitative subparts within Part (a) → `content_checklist`
- Quantitative subparts within Part (a) → `hybrid`

*Assignment:* Each sub-question of Econ P3 Part (a) is a separate `questions` row with its own `mark_schemes` row. The generator infers scheme_type from the command term of the sub-question. No single row carries the label "Econ P3 Part (a)" — rows are seeded at the sub-question level (e.g. "Econ P3 Q1 Part (a)(i)").

---

*End of §2.*

---

## §3. Business Management — External Assessment Mark Scheme Evidence

### §3.A — Paper 1 (SL + HL, 30 marks)

#### Pre-released statement structure

> Source: *Business Management Subject Guide* (first assessment 2024), p. 41

> "Paper 1 is the same for SL and HL students. Three months prior to the examination the IB will release a statement with two elements. The first element will be a small number of topics that provide context to the case study. These topics will **not** be topics that are in the guide but ones that students are asked to research for approximately five hours. Topics in the pre-released statement will build on topics contained in the syllabus. The aim is to assess students' knowledge around important contemporary business topics that could not have been anticipated when the guide was written."

> "The second element will be the first 200 words, approximately, of the case study itself. The release of this portion of the case study will provide additional context and will reduce the number of words to be read during the examination period. The aim of the paper is to assess students' knowledge of the business management syllabus. The examination is based upon one case study, of approximately 800 to 1,000 words, that students do not see before the examination. Most questions will be qualitative, although some minor calculations could be part of the assessment."

#### Section A — marking method

> Source: *Business Management Subject Guide* (first assessment 2024), p. 43

> "Section A
> - Students answer all structured questions in this section.
> - The command terms used in each part indicate the depth required.
> - The marks available for each part are indicated on the examination paper.
> - Marks are allocated using an analytic markscheme.
> - This section is worth a total of 20 marks."

*scheme_type: `content_checklist` for descriptive/application sub-questions. See §2.D.*

#### Section B — marking method

> Source: *Business Management Subject Guide* (first assessment 2024), p. 43

> "Section B
> - Students answer one question from a choice of two.
> - The command terms used in each part indicate the depth required.
> - The marks available for each part are indicated on the examination paper.
> - Each question is worth a total of 10 marks.
> - Marks are allocated using a combination of an analytic markscheme and markbands.
> - This section is worth a total of 10 marks."

*scheme_type: `band_descriptor`. Markband table below applies.*

#### Section B 10-mark markband table — SL and HL (identical)

> Source: *Business Management Subject Guide* (first assessment 2024), pp. 44–45 (SL); pp. 47–48 (HL)

Intro (pp. 44, 47 — identical wording in both SL and HL sections):

> "In addition to an analytic markscheme specific to the question papers, markbands are used to allocate marks in section B in papers 1 and 2 for the 10-mark extended response question."

**Markband table — SL (p. 44–45) and HL (pp. 47–48): descriptors are verbatim-identical.**

| Marks | Level descriptor |
|---|---|
| 0 | The work does not reach a standard described by the descriptor. |
| 1–2 | Little understanding of the demands of the question. / Little use of business management tools and theories; any tools and theories that are used are irrelevant or used inaccurately. / Little or no reference to the stimulus material. / No arguments are made. |
| 3–4 | Some understanding of the demands of the question. / Some use of business management tools and theories, but these are mostly lacking in accuracy and relevance. / Superficial use of information from the stimulus material, often not going beyond the name of the person(s) or name of the organization. / Any arguments made are mostly unsubstantiated. |
| 5–6 | The response indicates an understanding of the demands of the question, but these demands are only partially addressed. / Some relevant and accurate use of business management tools and theories. / Some relevant use of information from the stimulus material that goes beyond the name of the person(s) or name of the organization but does not effectively support the argument. / Arguments are substantiated but are mostly one-sided. |
| 7–8 | Mostly addresses the demands of the question. / Mostly relevant and accurate use of business management tools and theories. / Information from the stimulus material is generally used to support the argument, although there is some lack of clarity or relevance in some places. / Arguments are substantiated and have some balance. |
| 9–10 | Clear focus on addressing the demands of the question. / Relevant and accurate use of business management tools and theories. / Relevant information from the stimulus material is integrated effectively to support the argument. / Arguments are substantiated and balanced, with an explanation of the limitations of the case study or stimulus material. |

*Note: bullet points within each band are rendered as " / " separators above for table formatting. Source text uses bullet points. Mia's prompt should present each bullet as a discrete descriptor phrase.*

*SL vs HL confirmation: The HL markband table (pp. 47–48) is verbatim-identical to the SL table (pp. 44–45). A single `band_descriptor` scheme_data row covers both SL and HL P1/P2 Section B.*

---

### §3.B — Paper 2 (SL 40 marks, HL 50 marks)

#### Quantitative focus statement

> Source: *Business Management Subject Guide* (first assessment 2024), p. 44 (SL)

> "The structure of this paper is the same as HL paper 2. However, questions may be the same as, or different from, the HL paper 2 questions. SL students answer fewer questions."

> Source: *Business Management Subject Guide* (first assessment 2024), p. 46 (HL)

> "The structure of this paper is the same as SL paper 2. However, questions may be the same as, or different from, the SL paper 2 questions. HL students answer more questions."

Both SL and HL Paper 2 are described as "Based on unseen stimulus material with a quantitative focus" in the assessment outlines (p. 39 SL; p. 40 HL).

#### Section A — marking method

> Source: *Business Management Subject Guide* (first assessment 2024), p. 44 (SL); p. 46 (HL) — identical wording

> "Section A
> - The questions have a quantitative focus.
> - Students answer all structured questions in this section.
> - The questions are subdivided into parts.
> - The command terms used in each part indicate the depth required.
> - The marks available for each part are indicated on the examination paper.
> - Marks are allocated using an analytic markscheme.
> - This section is worth a total of 20 marks." [SL] / "30 marks." [HL]

*scheme_type: `content_checklist` for descriptive sub-questions; `hybrid` for calculate sub-questions. The "quantitative focus" signals that Calculate/Determine AO4 questions will be present. See §2.D.*

#### Section B — marking method

> Source: *Business Management Subject Guide* (first assessment 2024), p. 44 (SL); p. 46 (HL) — identical wording

> "Section B
> - Students answer one question from a choice of two.
> - The question is subdivided into parts; structured questions and an extended response question.
> - The command terms used in each part indicate the depth required.
> - The structured questions are worth a total of 10 marks.
> - Each extended response question is worth 10 marks.
> - The marks available for each part are indicated on the examination paper.
> - Marks are allocated using a combination of an analytic markscheme and markbands.
> - This section is worth a total of 20 marks."

*scheme_type: `content_checklist` for the 10-mark structured sub-questions; `band_descriptor` for the 10-mark extended response. Same markband table as Paper 1 Section B — see §3.A above.*

**Section B markband table — identical to Paper 1 Section B.** The guide publishes one markband table per SL level (covering Papers 1 and 2) and one per HL level (covering Papers 1 and 2). Both are quoted in §3.A. No separate table for Paper 2.

---

### §3.C — Paper 3 (HL only, 25 marks, social enterprise)

#### Three-tier question structure

> Source: *Business Management Subject Guide* (first assessment 2024), p. 42

> "Paper 3 will be about a social enterprise and requires students to identify and describe a human need and the potential organizational challenges facing the social entrepreneur wanting to meet this need. Further to this, students are required to write a decision-making document that includes a business recommendation. Only HL students will sit this examination. The paper will consist of stimulus material followed by questions. The stimulus material will consist of a short introduction to an organization, supported by a visual representation of a product, and five or six excerpts from various documents (such as emails, Twitter feeds, newspaper articles, and so on)."

> "The paper will have the following three tiers of questions.
> - AO1 questions—assesses students' ability to describe the human need in the stimulus material.
> - AO2 questions—assesses students' ability to explain the key challenges facing the social entrepreneur or social enterprise in the setting of the stimulus material.
> - AO3/AO4 questions—assesses students' ability to recommend a plan for the organization in meeting the identified human need. In doing so, students will be required to demonstrate knowledge and understanding, and their ability to explain, synthesize and evaluate evidence, and formulate a recommendation."

> Source: *Business Management Subject Guide* (first assessment 2024), p. 47

> "Students are expected to demonstrate the following assessment objectives."

AO table:

| Assessment objective | Question 1 | Question 2 | Question 3 |
|---|---|---|---|
| AO1—knowledge and understanding | √ | √ | √ |
| AO2—application and analysis | | √ | √ |
| AO3—synthesis and evaluation | | | √ |
| AO4—use and application of appropriate skills | | | √ |
| **Marks (maximum per question)** | **2** | **6** | **17** |
| **Maximum marks for paper 3** | | **25** | |

> "- Students answer the three compulsory questions given based on the stimulus material.
> - The command terms used in each question indicate the depth required.
> - The marks available for each question are indicated on the examination paper.
> - Marks are allocated using a combination of an analytic markscheme and the assessment criteria."

#### Q1 — 2 marks, analytic markscheme

> Source: *Business Management Subject Guide* (first assessment 2024), p. 48

> "For question 1 and question 2 an analytic markscheme will be used."

*scheme_type: `content_checklist`. Q1 is an AO1 Describe/Identify question about the human need in the stimulus material. Max 2 marks.*

#### Q2 — 6 marks, analytic markscheme

> Source: *Business Management Subject Guide* (first assessment 2024), p. 48

*Covered by the same statement above: "For question 1 and question 2 an analytic markscheme will be used."*

*scheme_type: `content_checklist`. Q2 is an AO2 Explain question about organizational challenges. Max 6 marks. Note: 6-mark AO2 is at the boundary for `band_descriptor` (per §2.D disambiguation rule) but the guide explicitly assigns analytic markscheme here — override to `content_checklist`.*

#### Q3 — 17 marks, assessment criteria (criteria_marked)

> Source: *Business Management Subject Guide* (first assessment 2024), p. 48

> "For question 3 the following assessment criteria will be used."

*scheme_type: `criteria_marked`. Criterion A (4m) + B (4m) + C (6m) + D (3m) = 17 marks.*

---

**Criterion A: Use of resource materials** (max 4 marks)

Guiding question:

> "To what extent does the student use the resource materials provided to effectively support the recommended plan of action?"

> Source: *Business Management Subject Guide* (first assessment 2024), pp. 48–49

| Marks | Level descriptor |
|---|---|
| 0 | The response does not reach a standard described by the descriptors below. |
| 1 | The response makes limited reference to the resource materials provided **or** the resources identified have been used ineffectively to support the recommended plan of action. |
| 2 | The response makes some reference to the resource materials provided **or** the resources identified have been used in a superficial way to support the recommended plan of action. |
| 3 | The response makes reference to most of the resource materials provided to support the recommended plan of action. |
| 4 | The response makes reference to all resource materials provided to effectively support the recommended plan of action. |

---

**Criterion B: Business management tools and theories** (max 4 marks)

Guiding question:

> "To what extent does the student's plan of action effectively apply appropriate business management tools and theories?"

> Source: *Business Management Subject Guide* (first assessment 2024), p. 49

| Marks | Level descriptor |
|---|---|
| 0 | The work does not reach a standard described by the descriptors below. |
| 1 | The response demonstrates limited application of appropriate business management tools and theories. |
| 2 | The response superficially applies appropriate business management tools and theories. |
| 3 | The response satisfactorily applies appropriate business management tools and theories. |
| 4 | The response effectively applies appropriate business management tools and theories. |

---

**Criterion C: Evaluation** (max 6 marks)

Guiding question:

> "To what extent does the student effectively evaluate the expected impact of their plan of action on the relevant areas of the business?"

> Source: *Business Management Subject Guide* (first assessment 2024), p. 49

| Marks | Level descriptor |
|---|---|
| 0 | The work does not reach a standard described by the descriptors below. |
| 1–2 | The response is largely descriptive with limited analysis or evaluation of the expected impact of their plan of action. There is limited reference to the relevant areas of the business. |
| 3–4 | The response analyses the expected impact of their plan of action with some reference to the relevant areas of the business. There is some evidence of evaluation but it is not sustained. |
| 5–6 | The student effectively evaluates the expected impact of their plan of action on the relevant areas of the business and considers the trade-offs between those areas. |

---

**Criterion D: Sequencing of ideas and plan of action** (max 3 marks)

Guiding question:

> "To what extent are the student's ideas and plan of action sequenced in a clear and coherent manner?"

> Source: *Business Management Subject Guide* (first assessment 2024), pp. 49–50

| Marks | Level descriptor |
|---|---|
| 0 | The response does not reach a standard described by the descriptors below. |
| 1 | The response is limited in its sequencing of ideas and plan of action. |
| 2 | The response consists of ideas and a plan of action but these are not always sequenced in a clear manner. |
| 3 | The response effectively sequences appropriate ideas and a plan of action in a clear and coherent manner. |

---

### §3.D — Mark Allocation per Paper

For full assessment outline tables (weighting, duration, total marks) see §1.4 of this file. The component-level breakdown per section is summarised here for reference.

**BM SL:**

| Paper | Section | Marks |
|---|---|---|
| Paper 1 | Section A (structured, analytic) | 20 |
| Paper 1 | Section B (extended response, markbands) | 10 |
| Paper 1 | **Total** | **30** |
| Paper 2 | Section A (structured, quantitative, analytic) | 20 |
| Paper 2 | Section B (structured 10m + extended 10m) | 20 |
| Paper 2 | **Total** | **40** |

**BM HL (additional to SL):**

| Paper | Section | Marks |
|---|---|---|
| Paper 1 | Same as SL | 30 |
| Paper 2 | Section A (structured, quantitative, analytic) | 30 |
| Paper 2 | Section B (structured 10m + extended 10m) | 20 |
| Paper 2 | **Total** | **50** |
| Paper 3 | Question 1 (analytic, AO1) | 2 |
| Paper 3 | Question 2 (analytic, AO1+AO2) | 6 |
| Paper 3 | Question 3 (criteria_marked, AO1–AO4) | 17 |
| Paper 3 | **Total** | **25** |

> Source: *Business Management Subject Guide* (first assessment 2024), pp. 39–40 (assessment outlines); pp. 43–47 (external assessment details)

---

### §3.E — BM-Specific Marking Conventions

#### Use of examples and case studies

Already quoted verbatim in §1.5 of this file (source: BM p. 42). Cross-reference: "In order to be awarded marks in the higher markbands and levels of assessment criteria, students are expected, where appropriate, to refer to the stimulus material provided in examinations…"

#### Use of business management terms

Already quoted verbatim in §1.5 of this file (source: BM p. 42). Cross-reference: "Students are expected to demonstrate the ability to appropriately define, use and apply the business management terms included in the 'Syllabus' section."

#### Use of calculators

> Source: *Business Management Subject Guide* (first assessment 2024), p. 43

> "While all questions requiring a calculator can be answered fully using a four-function (plus, minus, multiply, divide) calculator, graphic display calculators (GDCs) are allowed during the examination."

> "Teachers and schools must adhere to the regulations regarding the use of electronic calculators in examinations, and students must be made aware of these. This information can be found in the annually revised version of *Calculators guidance for examinations* booklet."

*Mia marking implication: GDCs are permitted on BM Paper 2. Numerical answers should be accepted if correct to a reasonable number of significant figures or decimal places consistent with the calculation. Rounding conventions follow four-function calculator precision. Method marks are awarded independently of the final numerical answer.*

#### Section A vs Section B marking method distinction

> Source: *Business Management Subject Guide* (first assessment 2024), pp. 43–44

The guide makes the following explicit distinction across both Paper 1 and Paper 2:

- **Section A:** "Marks are allocated using an analytic markscheme." → `content_checklist` / `hybrid`
- **Section B:** "Marks are allocated using a combination of an analytic markscheme and markbands." → `content_checklist` (structured sub-questions) + `band_descriptor` (extended response)

This distinction is the primary structural rule governing scheme_type assignment for BM seed questions. Any BM question tagged as Section A maps to `content_checklist` or `hybrid`. Any BM question tagged as Section B extended response maps to `band_descriptor`.

---

*End of §3.*

---

## §4. Economics — External Assessment Mark Scheme Evidence

### §4.A — Paper 1 (SL + HL, extended response, 25 marks)

#### Paper structure and question format

> Source: *Economics Guide* (first assessment 2022), p. 60 (SL); p. 61 (HL)

**SL (p. 60):**

> "The structure of this paper is the same as the HL paper 1 but the questions that require extended responses may be the same as, or different from, the HL paper 1 questions."
>
> "Students answer one question from a choice of three."
>
> "The questions are each subdivided into two parts, (a) and (b)."
>
> "Questions in this paper are drawn from the four units of the syllabus **excluding** the HL extension material and topics studied at HL only."
>
> "The command terms used in each question indicate the depth required."
>
> "Marks are allocated using a combination of an analytic markscheme and markbands."

**HL (p. 61):**

> "Weighting: 20%"
>
> "The structure of this paper is the same as SL paper 1. However, the questions that require extended responses may be the same as, or different from, the SL paper. Questions in this paper are drawn from the four units of the syllabus **including** the HL extension material and topics studied at HL only."

AO table (SL and HL, p. 60):

| Assessment objective | Part (a) | Part (b) |
|---|---|---|
| AO1—knowledge and understanding | √ | √ |
| AO2—application and analysis | √ | √ |
| AO3—synthesis and evaluation | | √ |
| AO4—use and application of appropriate skills | √ | √ |
| **Marks (maximum per part)** | **10** | **15** |
| **Maximum for paper 1** | | **25** |

*Note: Econ Paper 1 has no Section A / Section B split. The entire paper is one extended response question split into part (a) (10m, describe/explain with diagrams, AO1/AO2/AO4) and part (b) (15m, evaluate/discuss with synthesis and real-world examples, all four AOs). Both parts use markbands → both `band_descriptor`.*

*Note: There is no pre-released theme or stimulus for Econ Paper 1, unlike BM's pre-released case study statement. Questions are drawn from any of the four syllabus units.*

---

#### Part (a) 10-mark markband table

> Source: *Economics Guide* (first assessment 2022), p. 63

These markbands apply to SL and HL Paper 1 part (a). The guide publishes one table labelled "External assessment markbands—SL and HL".

| Marks | Level descriptor |
|---|---|
| 0 | The work does not reach a standard described by the descriptors below. |
| 1–2 | The response indicates little understanding of the specific demands of the question. / Economic theory is stated but it is not relevant. / Economic terms are stated but they are not relevant. |
| 3–4 | The response indicates some understanding of the specific demands of the question. / Relevant economic theory is described. / Some relevant economic terms are included. |
| 5–6 | The response indicates understanding of the specific demands of the question, but these demands are only partially addressed. / Relevant economic theory is partly explained. / Some relevant economic terms are used appropriately. / Where appropriate, relevant diagram(s) are included. |
| 7–8 | The specific demands of the question are understood and addressed. / Relevant economic theory is explained. / Relevant economic terms are used mostly appropriately. / Where appropriate, relevant diagram(s) are included and explained. |
| 9–10 | The specific demands of the question are understood and addressed / Relevant economic theory is fully explained. / Relevant economic terms are used appropriately throughout the response. / Where appropriate, relevant diagram(s) are included and fully explained |

*Note: Diagrams appear from band 5–6 upwards. "Where appropriate" signals that diagram inclusion is question-dependent; individual questions may specify diagrams as essential (see §4.E).*

---

#### Part (b) 15-mark markband table

> Source: *Economics Guide* (first assessment 2022), pp. 63–64

The 4–6 band spans the page break (starts p. 63, completes p. 64). All five bullets confirmed verbatim.

| Marks | Level descriptor |
|---|---|
| 0 | The work does not reach a standard described by the descriptors below. |
| 1–3 | The response indicates little understanding of the specific demands of the question. / Economic theory is stated but it is not relevant / Economic terms are stated but they are not relevant. / The response contains no evidence of synthesis or evaluation. / A real-world example(s) is identified but it is irrelevant. |
| 4–6 | The response indicates some understanding of the specific demands of the question. / Relevant economic theory is described. / Some relevant economic terms are included. / The response contains evidence of superficial synthesis or evaluation. / A relevant real-world example(s) is identified. |
| 7–9 | The response indicates understanding of the specific demands of the question, but these demands are only partially addressed. / Relevant economic theory is partly explained. / Some relevant economic terms are used appropriately. / Where appropriate, relevant diagram(s) are included. / The response contains evidence of appropriate synthesis or evaluation but lacks balance. / A relevant real-world example(s) is identified and partly developed in the context of the question. |
| 10–12 | The specific demands of the question are understood and addressed. / Relevant economic theory is explained. / Relevant economic terms are used mostly appropriately. / Where appropriate, relevant diagram(s) are included and explained. / The response contains evidence of appropriate synthesis or evaluation that is mostly balanced. / A relevant real-world example(s) is identified and developed in the context of the question. |
| 13–15 | The specific demands of the question are understood and addressed. / Relevant economic theory is fully explained. / Relevant economic terms are used appropriately throughout the response. / Where appropriate, relevant diagram(s) are included and fully explained. / The response contains evidence of effective and balanced synthesis or evaluation. / A relevant real-world example(s) is identified and fully developed to support the argument. |

*Key progression vs part (a): part (b) adds synthesis/evaluation (AO3) from band 1–3 onwards ("no evidence of synthesis or evaluation"), adds real-world examples as an explicit requirement at each band, and requires balanced evaluation for top marks. Diagrams appear from 7–9 onwards.*

*SL vs HL distinction: The markband tables are identical for SL and HL Paper 1. The guide publishes one table for both.*

---

### §4.B — Paper 2 (SL + HL, data response, 40 marks)

#### Stimulus material and question structure

> Source: *Economics Guide* (first assessment 2022), p. 61

> "The structure of this paper is the same as HL paper 2."
>
> "The text/data used and questions may be the same at SL and at HL."
>
> "Students answer one question from a choice of two."
>
> "The questions are each subdivided into seven parts, (a), (b), (c), (d), (e), (f) and (g). Parts (a) and (b) both have subparts showing (i and ii)"
>
> "Questions in this paper are drawn from the four units of the syllabus **excluding** the HL extension material and topics studied at HL only."
>
> "The command terms used in each question indicate the depth required."
>
> "Marks are allocated using a combination of an analytic markscheme and markbands."
>
> "Maximum marks are available per part and per subpart."
>
> "* Questions in (b) may be further subdivided into parts (i) and (ii) with 3 marks allocated in the first part and up to 2 marks in the other, or vice versa. The maximum for part (b) is 5 marks."

AO table (p. 61):

| Assessment objective | Part a (i, ii) | Part b (i, ii) | Part c | Part d | Part e | Part f | Part g |
|---|---|---|---|---|---|---|---|
| AO1 | √ | √ | √ | √ | √ | √ | √ |
| AO2 | | √ | √ | √ | √ | √ | √ |
| AO3 | | | | | | | √ |
| AO4 | | √ | √ | √ | √ | √ | √ |
| **Marks** | **4 (2+2)** | **5*** | **4** | **4** | **4** | **4** | **15** |
| **Maximum** | | | | **40** | | | |

*Note: AO1-only for part (a) means part (a)(i) and (a)(ii) are Define/State/Identify questions → `content_checklist`. AO4 presence in parts (b)–(f) introduces potential quantitative subparts → `hybrid` where Calculate/Determine command terms appear. Only part (g) has AO3 → `band_descriptor`.*

#### Parts (a)–(f) — analytic markscheme

> Source: *Economics Guide* (first assessment 2022), p. 64

> "For parts (a) to (f) a markscheme will be used."

*scheme_type: `content_checklist` for descriptive/definitional subparts; `hybrid` for quantitative subparts (Calculate, Determine, Derive, Solve). See §2.A and §2.D.*

#### Part (g) 15-mark markband table

> Source: *Economics Guide* (first assessment 2022), pp. 64–65

The 1–3 band spans the page break (starts p. 64, bullet 5 "no use of text/data" confirmed on p. 65). All bands confirmed verbatim.

| Marks | Level descriptor |
|---|---|
| 0 | The work does not reach a standard described by the descriptors below. |
| 1–3 | The response indicates little understanding of the specific demands of the question. / Economic theory is stated but it is not relevant. / Economic terms are stated but they are not relevant. / The response contains no evidence of synthesis or evaluation. / The response contains no use of text/data. |
| 4–6 | The response indicates some understanding of the specific demands of the question. / Relevant economic theory is described. / Some relevant economic terms are included. / The response contains evidence of superficial synthesis or evaluation. / The response contains limited use of text/data. |
| 7–9 | The response indicates understanding of the specific demands of the question, but these demands are only partially addressed. / Relevant economic theory is partly explained. / Some relevant economic terms are used appropriately. / Where appropriate, relevant diagram(s) are included. / The response contains evidence of appropriate synthesis or evaluation but lacks balance. / The response includes some relevant information from the text/data. |
| 10–12 | The specific demands of the question are understood and addressed. / Relevant economic theory is explained. / Relevant economic terms are used appropriately. / Where appropriate, relevant diagram(s) are included and explained. / The response contains evidence of appropriate synthesis or evaluation that is mostly balanced. / The use of information from the text/data is generally appropriate, relevant, and applied correctly. |
| 13–15 | The specific demands of the question are understood and addressed. / Relevant economic theory is fully explained. / Relevant economic terms are used appropriately throughout the response. / Where appropriate, relevant diagram(s) are included and fully explained. / The response contains evidence of effective and balanced synthesis or evaluation. / The use of information from the text/data is appropriate, relevant, and is used to formulate a reasoned argument supported by analysis/evaluation. |

*Key difference vs P1(b): text/data integration replaces real-world examples as the explicit Band requirement. "The response contains no use of text/data" (band 1–3) vs "used to formulate a reasoned argument supported by analysis/evaluation" (band 13–15). Mia must assess whether the student engaged with the stimulus data, not just whether they cited an outside example.*

---

### §4.C — Paper 3 (HL only, policy paper, 60 marks total)

#### Stimulus and policy context

> Source: *Economics Guide* (first assessment 2022), p. 62

> "Paper 3"
> "Duration: 1 hour 45 minutes"
> "Weighting: 30%"
>
> "Students answer two compulsory questions."
>
> "The questions are subdivided into parts (a) and (b). Part (a) has subparts."
>
> "Questions in this paper are drawn from the four units of the syllabus **including** the HL extension material and topics studied at HL only."
>
> "The command terms used indicate the depth of response required."
>
> "Marks are allocated using a combination of an analytic markscheme and markbands."
>
> "Many question parts require the use of a calculator. GDCs are allowed during the examination, and students should be familiar with their use."
>
> "An answer booklet will be provided, and additional answer sheets may be used if necessary."

AO table (p. 62):

| Assessment objective | Part (a) | Part (b) |
|---|---|---|
| AO1—knowledge and understanding | √ | √ |
| AO2—application and analysis | √ | √ |
| AO3—synthesis and evaluation | | √ |
| AO4—use and application of appropriate skills | √ | √ |
| **Marks (maximum)** | **20** | **10** |
| **Marks (maximum per question)** | | **30** |
| **Maximum marks for paper 3 (for two questions)** | | **60** |

*Note: Part (a) covers AO1, AO2, AO4 — not AO3. Part (a) is therefore analytic markscheme only: qualitative subparts → `content_checklist`; quantitative subparts → `hybrid`. Part (b) has all four AOs → `band_descriptor`. See §2.E edge case 2.*

#### Part (a) — analytic markscheme (mixed qual/quant)

> Source: *Economics Guide* (first assessment 2022), p. 65

> "For part (a) a markscheme will be used."

> Source: *Economics Guide* (first assessment 2022), p. 58 (assessment outline)

> "Includes both quantitative and qualitative questions."

*scheme_type: determined per sub-question at generation time. Qualitative subparts (Define, Explain, Describe) → `content_checklist`. Quantitative subparts (Calculate, Determine, Derive, Show that, Solve) → `hybrid`. Part (a) is 20 marks split across multiple subparts — each subpart is a separate `questions` row with its own `mark_schemes` row.*

#### Part (b) 10-mark markband table — policy recommendation

> Source: *Economics Guide* (first assessment 2022), pp. 65–66

Command word definition (p. 65):

> "**Recommend**—present an advisable course of action with appropriate supporting evidence/reason in relation to a given situation, problem or issue."

The 1–2 band spans the page break (starts p. 65, bullets 2–5 confirmed on p. 66). All bands confirmed verbatim.

| Marks | Level descriptor |
|---|---|
| 0 | The work does not reach a standard described by the descriptors below. |
| 1–2 | The response identifies a policy. / The response uses no economic theory to support the recommendation. / Economic terms are stated but are not relevant. / The response contains no use of text/data to support the recommendation. / The response contains no evidence of synthesis or evaluation. |
| 3–4 | The response identifies an appropriate policy. / The response uses limited economic theory to support the recommendation in a superficial manner. / Some relevant economic terms are included. / The response contains no use of relevant text/data to support the recommendation. / The response contains superficial evidence of synthesis or evaluation. |
| 5–6 | The response identifies and explains an appropriate policy. / The response uses relevant economic theory to partially support the recommendation. / Some relevant economic terms are used appropriately. / The response includes some relevant information from the text/data to support the recommendation. / The response contains evidence of appropriate synthesis or evaluation but lacks balance. |
| 7–8 | The response identifies and fully explains an appropriate policy. / The response uses relevant economic theory to support the recommendation. / Relevant economic terms are used mostly appropriately. / The use of information from the text/data is generally appropriate, relevant and applied correctly to support the recommendation. / The response contains evidence of appropriate synthesis or evaluation that is mostly balanced. |
| 9–10 | The response identifies and fully explains an appropriate policy. / The response uses relevant economic theory effectively to support the recommendation. / Relevant economic terms are used appropriately throughout the response. / The use of information from the text/data is appropriate, relevant and supports the analysis/evaluation effectively. / The response contains evidence of effective and balanced synthesis or evaluation. |

*Key feature of this markband: policy identification and recommendation quality is explicitly tracked across all bands (from "identifies a policy" at 1–2 through "identifies and fully explains an appropriate policy" at 7–8 and 9–10). Mia must assess whether the student named a specific policy, explained it, and evaluated it against the stimulus data — not just whether they produced a balanced argument.*

---

### §4.D — Mark Allocation per Paper

For full assessment outline tables see §1.4 of this file. Section-level breakdown:

**Econ SL:**

| Paper | Part / section | Marks | scheme_type |
|---|---|---|---|
| Paper 1 | Part (a) | 10 | `band_descriptor` |
| Paper 1 | Part (b) | 15 | `band_descriptor` |
| Paper 1 | **Total** | **25** | |
| Paper 2 | Parts (a)–(f): descriptive | subset of 25 | `content_checklist` |
| Paper 2 | Parts (a)–(f): quantitative | subset of 25 | `hybrid` |
| Paper 2 | Part (g) | 15 | `band_descriptor` |
| Paper 2 | **Total** | **40** | |

**Econ HL (additional to SL):**

| Paper | Part / section | Marks | scheme_type |
|---|---|---|---|
| Paper 1 | Same as SL | 25 | — |
| Paper 2 | Same as SL | 40 | — |
| Paper 3 (per question ×2) | Part (a): qualitative subparts | subset of 20 | `content_checklist` |
| Paper 3 (per question ×2) | Part (a): quantitative subparts | subset of 20 | `hybrid` |
| Paper 3 (per question ×2) | Part (b) | 10 | `band_descriptor` |
| Paper 3 (per question ×2) | **Total per question** | **30** | |
| Paper 3 | **Total (two questions)** | **60** | |

> Source: *Economics Guide* (first assessment 2022), pp. 57–58 (assessment outlines); pp. 60–62 (external assessment details)

---

### §4.E — Economics-Specific Marking Conventions

#### Real-world examples requirement

Already quoted verbatim in §1.5 of this file (source: Econ p. 59). Cross-reference: "Students are expected, where appropriate, to illustrate their answers with real-world examples in order to reach the highest markbands. Examples should be used to highlight economic concepts, theories and relationships in the real world. When examples are used, students should not just state the example (as this is too limited) but should also offer some explanation of the example in relation to the question asked."

#### Use of economic terminology

Already quoted verbatim in §1.5 of this file (source: Econ p. 60). Cross-reference: "Students are expected to demonstrate the ability to appropriately define, use and apply the economics terms included in the 'Syllabus' section."

#### Use of diagrams

> Source: *Economics Guide* (first assessment 2022), p. 59

> "Students are expected, where appropriate, to include correctly labelled and clearly drawn diagrams. Sometimes individual questions specify that the use of diagrams is essential because more detailed information is required from the students in order to show specific knowledge and understanding."

**When diagrams are essential vs optional:**

The guide distinguishes two cases:
1. **Optional ("where appropriate"):** diagrams are expected if they aid the answer; their inclusion (or omission where not relevant) does not itself penalise the student.
2. **Essential:** "individual questions specify that the use of diagrams is essential" — these questions explicitly require a diagram. Omitting a diagram on such a question prevents the student from reaching upper bands.

The guide does not specify in the subject guide text what "correctly labelled" requires per diagram type. That detail is in subject-specific analytic markschemes (published separately). The markband descriptors in this file reflect only the presence/quality distinction:
- Band 5–6 (P1a): "Where appropriate, relevant diagram(s) are included."
- Band 7–8 (P1a): "Where appropriate, relevant diagram(s) are included and explained."
- Band 9–10 (P1a): "Where appropriate, relevant diagram(s) are included and fully explained"

The progression is: included → included and explained → included and fully explained.

**How diagram marks integrate into scoring:**

Diagrams contribute to the markband placement holistically — they are not awarded separate marks in extended response parts (band_descriptor questions). A well-labelled diagram with explanation contributes to moving the response into higher bands. In analytic markscheme parts (content_checklist), a diagram may carry explicit marks: e.g. "Draw a correctly labelled supply and demand diagram [2 marks]."

**Mia marking implication — uploaded diagram images (vision input):**

When a student uploads a diagram image via Mia's vision capability, Mia must apply the following steps. Diagrams submitted as images are treated identically to diagrams described in text — the standard is what the guide's band descriptors require, not the medium of submission.

1. **Recognise the upload.** Confirm the diagram image is present and state what it shows: "I can see you've uploaded a diagram — it appears to be a supply and demand diagram." Describe what *is* there, not what *should* be there.
2. **Check relevance.** Assess whether the diagram matches the question. An irrelevant diagram (e.g. a cost curve for a question about exchange rates) does not contribute to band placement.
3. **Check label accuracy.** Inspect: (a) axes — are they labelled with the correct variable names? (b) curves — are they correctly named (e.g. D, S, AD, AS) and drawn with the correct slope direction? (c) key points — equilibrium, shift arrows, welfare triangles, or other required features as specified by the question.
4. **Check explanation linkage.** Assess whether the student's *written response* explicitly explains the diagram. Band 7–8 requires "included and explained" — a diagram drawn but never referenced in the written response caps the response at Band 5–6 regardless of diagram quality.
5. **Map to band descriptor and cite the image in feedback.** Reference the uploaded diagram explicitly: "Your diagram shows P and Q axes correctly labelled and a correctly drawn downward-sloping demand curve. However, the curve is not labelled 'D' and no equilibrium point is marked — this means your diagram counts as included but not fully explained, placing your answer in Band 7–8 rather than 9–10."

**Text-only responses:** If a student submits text only on a question where a diagram is appropriate ("where appropriate"), Mia must note the missing diagram as a band cap: "A relevant diagram is expected here — omitting it holds your answer below Band 7–8 which requires a diagram included and explained." For questions where diagrams are *essential* (stated explicitly in the question text), omission prevents reaching Band 5–6.

#### Use of calculators

> Source: *Economics Guide* (first assessment 2022), p. 60

> "**Paper 1 (SL/HL):** Calculators are **not** permitted."
>
> "**Paper 2 (SL/HL) and Paper 3 (HL only):** While all questions requiring a calculator can be answered fully using a four-function (plus, minus, multiply, divide) calculator, graphic display calculators (GDCs) **are** allowed during the examination. The graphing functions on these calculators may assist students and it is therefore recommended that all students are familiar with the use of GDCs."
>
> "Teachers and schools **must** adhere to the regulations regarding the use of electronic calculators in examinations, and students must be made aware of these. This information can be found in 'Annex 2: Calculators guidance' of the Diploma Programme *Assessment procedures*."

*Mia marking implication: Econ P2 and P3 quantitative subparts are calculator-permitted. Econ P1 is not. Mia should not penalise arithmetic errors on P2/P3 `hybrid` questions where method marks are independently awarded, but should credit correct method even if the final answer is numerically wrong.*

#### AO4 Econ-only command terms — marking behaviour

The following AO4 terms appear in the Economics command term table (§1.2) but not in BM. The subject guide does not provide per-term marking instructions beyond the AO4 definition: "These terms require students to demonstrate the selection and use of subject-specific skills and techniques." Specific mark allocation per step is defined in per-examination analytic markschemes (published separately).

| Command term | scheme_type | Typical structure |
|---|---|---|
| **Derive** | `hybrid` | Show algebraic or graphical derivation step-by-step. Method marks for each step; answer mark for final result. |
| **Show that** | `hybrid` | Demonstrate that a stated result is correct. Method marks for working; no separate answer mark (answer is given). |
| **Sketch** | `content_checklist` | Freehand diagram — does not require graph paper precision. Marks for correct shape, labelled axes, and key features. Each required feature is a discrete accepted point. |
| **Solve** | `hybrid` | Algebraic or numerical solution. Method marks for setup and working; answer mark for correct value. |

**VERIFIER RULE — "Show that" invariant:**

"Show that" is structurally distinct from all other `hybrid` command terms. Because the answer is stated in the question itself, no mark is available for producing the correct answer. The verifier must enforce:

```
INVARIANT (Show that): answer_marks.correct_answer == 0
INVARIANT (Show that): sum(method_marks[*].marks) == max_marks
```

The combined hybrid invariant `sum(method_marks[*].marks) + answer_marks.correct_answer == max_marks` still holds — it reduces to `sum(method_marks) == max_marks` when `correct_answer = 0`.

**Reject condition:** Any `Show that` scheme with `answer_marks.correct_answer > 0` must be rejected by the verifier. The answer is given in the question; awarding it a mark is a category error.

**Generator rule:** The generator must detect "show that" (case-insensitive) in `command_term` and set `answer_marks.correct_answer = 0` unconditionally, allocating all marks to `method_marks`.

---

*End of §4. MARK_SCHEME_EVIDENCE.md is complete.*
