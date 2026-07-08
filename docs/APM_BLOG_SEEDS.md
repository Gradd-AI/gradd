# APM_BLOG_SEEDS.md

Ranked seed list for the ACCA APM blog pipeline. **Extraction + ranking only — not article bodies.**
Target 25–40 posts, published **2/week** for freshness. Blog is a 3–6 month compounding SEO channel, not a launch lever.

**Sources mined:** `docs/TEACHING_PRINCIPLES_EZRA.md` (failure architecture), `docs/APM_BUILD_CONTRACT.md` (generator failure catalogue + banked decisions + the 5 live posts), `scripts/apm-framework.ts` (73 LOs, command verbs, exam structure, professional skills), the drill/case bank coverage (breadth-complete: every examined-core LO has ≥1 approved drill; Section-B cases live incl. Torfin/D1), and the S26–J27 syllabus structure.

---

## Already live — EXCLUDE from the pipeline (5 posts, SHA 93ce136)

| Slug | Covers |
|------|--------|
| `apm-evaluate-the-report-not-the-company` | C1 — mark the report, not the company |
| `apm-professional-skills-marks-explained` | Section E — the 4 professional skills |
| `apm-describe-vs-apply` | describe-only scores nothing; the 3 application moves |
| `apm-s26-j27-syllabus-what-changed` | S26–J27 syllabus changes |
| `apm-scepticism-data-claims` | scepticism — challenging data claims specifically |

New seeds must not re-cover these. Where a seed is adjacent (scepticism, application), the angle below is deliberately differentiated.

---

## Post rules (bind every article; a template concern, not the seed's)

- **No CTA in the markdown body.** The `BlogCTA` component appends the one subject-aware CTA (APM → Ezra → `/acca/auth?next=/acca`). Never write a CTA into the `.md`.
- **Ezra is "he."** ("Ezra spots… then he pushes you…") — matches the live posts.
- **Sub-moves are H3 (`###`).** H2 (`##`) for sections, H3 for the enumerated moves inside a section (see `apm-describe-vs-apply` "The three moves").
- **Verified pass-rate wording only.** Never invent a pass-rate %. Cite the official ACCA published rate or use qualitative wording ("one of the lower pass rates among the ACCA papers"). Seeds that lean on the pass rate are flagged ⚠.
- **Content verified against the official ACCA APM study guide before publish** — same adversarial-check discipline as the drills (numbers-right ≠ explanation-right). No model memory.
- **Frontmatter** (`lib/blog.ts`): `title, slug, subject: APM, description, date, published`, plus `keywords[]` (search-phrase variants) and `related[]` (2–4 sibling slugs — hand-curate toward same intent class).

---

## Ranking method

1. **Intent class, highest first:** **FAILURE** (resit / failed / why-did-I-lose-marks — positioning gold, and the resit diagnostic is the perfect CTA) → **TECHNIQUE** (how to answer X) → **SYLLABUS-with-a-confusion-angle** (X vs Y) → **pure definitional SYLLABUS** (last).
2. **Within a class, by frequency** in the generator failure catalogue / examiner recurring themes (`APM_BUILD_CONTRACT.md`), and **Section C & D get a lift** — Section B *guarantees* one C question and one D question, so C/D confusion posts convert disproportionately.
3. **Funnel link** — FAILURE → **resit diagnostic** (`/acca/resit`); TECHNIQUE → **drills** (`/acca/auth?next=/acca`), or **mock** (`/acca/mock`) for whole-paper structure/timing; SYLLABUS → **drills**.

Intent legend: **F** = Failure · **T** = Technique · **S** = Syllabus (⇄ = confusion angle; ≡ = definitional).

---

## Ranked seeds

| # | Working title (search-intent) | Angle (the specific mistake/insight) | Intent | Funnel |
|---|---|---|---|---|
| 1 | ACCA APM: why so many capable candidates fail | The fail is almost never knowledge — it's technique: describing models, never challenging the scenario, calc-heavy/evaluation-light, running out of time. The resit hub. | F | resit |
| 2 | ACCA APM: my numbers were right and I still failed | The marks live in the judgement *after* the calc; a correct figure with no interpretation or recommendation scores a fraction of the allocation. | F | resit |
| 3 | ACCA APM: I passed the mock but failed the real exam | Self-marked mocks over-credit; the real paper is marked against professional-skills descriptors you never deliberately targeted. | F | resit |
| 4 | How many times can you resit ACCA APM — and why the resit keeps failing | The resit trap: re-learning content instead of fixing the answer-shaping that actually lost the marks last time. | F | resit |
| 5 | ⚠ ACCA APM pass rate: why it's low and what the failures share | Cite the official published rate only. The shared failure modes: describe-not-apply, no scepticism, ran out of time in Section A. | F | resit |
| 6 | ACCA APM: where you actually lose the marks | A mark-by-mark anatomy of a mid-scoring answer — what a marker rewards line by line vs what candidates write. | F | resit |
| 7 | ACCA APM: why "calculate and evaluate" answers only score half | Candidates finish the calculation and stop; the compound verb demands the evaluation half — the higher-mark half (A3b). | F | resit |
| 8 | ACCA APM: accepting the scenario at face value costs you the scepticism marks | Not questioning management's targets, assumptions and assertions = zero scepticism credit. (Distinct from the live data-claims post: this is about assertions, not figures.) | F | resit |
| 9 | ACCA APM: the commercial acumen marks almost nobody targets | Candidates never write *for* commercial acumen; what the descriptor rewards — organisational realism, behavioural awareness, commercially viable recommendations. | F | drills |
| 10 | ACCA APM: running out of time is a marking failure, not a knowledge one | Over-writing the calculation starves the evaluation where the marks are; marks-per-minute discipline across 3h15m. | F | mock |
| 11 | ACCA APM: how to answer a "calculate and evaluate" question | Structure: calc tight and labelled, then interpret → appraise appropriateness → recommend. The template for every A3b-type ask. | T | drills |
| 12 | ACCA APM: how to write the evaluation half of an answer | The concrete moves that turn a correct calc into L3 judgement: implication, limitation, trade-off, position. | T | drills |
| 13 | ACCA APM: how to answer the Section A case study (50 marks) | Role/report format, the 40+10 split, all four professional skills examined, and the time budget for a single big case. | T | mock |
| 14 | ACCA APM: how to answer the Section C question | Performance reporting — critique the report against user needs, information overload, misleading presentation. (Section B *always* has a C question.) | T | drills |
| 15 | ACCA APM: how to answer the Section D question | Data science & technology — silos, ERPS/CRMS, analytics types, the 5 Ss. (Section B *always* has a D question.) | T | drills |
| 16 | ACCA APM: how to show scepticism without just being negative | Challenge with evidence and justification, not blanket doubt — question the assertion, then say what evidence would settle it. | T | drills |
| 17 | ACCA APM: how to earn the professional-skills marks on a report | Signposting, structure and register for communication plus the three Section-B skills — deliberately, not by accident. | T | drills |
| 18 | ACCA APM: how to interpret a variance and recommend action | B1c — past the number to the cause and a specific management action; planning vs operational split. | T | drills |
| 19 | ACCA APM: how to build and evaluate EVA (without the classic errors) | A3b — the NOPAT and capital adjustments, and *when* EVA misleads. Names the "right numbers, wrong mechanism" traps (amortisation, capitalisation). | T | drills |
| 20 | ACCA APM: how to apply the 5 Ss to a management report | D1e — apply each S to the actual report items, don't recite the framework. (This is the Torfin case pattern.) | T | drills |
| 21 | ACCA APM: how to write a narrative commentary that scores | C1e — prepare a useful commentary from the data, not a restatement of the numbers. | T | drills |
| 22 | ACCA APM: how to manage your time across the 3h15m | Marks-per-minute, Section A vs the two Section B questions, and where over-runs quietly cost a pass. | T | mock |
| 23 | ACCA APM: ABC vs ABM — what's the difference | B3c — activity-based *costing* (the calc) vs activity-based *management* (using it to improve performance); the routinely-conflated pair. | S⇄ | drills |
| 24 | ACCA APM: ROI vs RI vs EVA vs ROCE — which measure, when | A3b/A3e — four divisional/financial measures students swap; what each rewards and distorts. | S⇄ | drills |
| 25 | ACCA APM: ROCE vs ROIC — the labelling trap | A post-tax / NOPAT-based return is ROIC, never ROCE; the mislabel that silently loses marks (generator rule 7). | S⇄ | drills |
| 26 | ACCA APM: descriptive vs diagnostic vs predictive vs prescriptive analytics | D2c — the four analytics types, distinguished with a performance example each. (Near-guaranteed Section D content.) | S⇄ | drills |
| 27 | ACCA APM: ERPS vs KMS vs CRMS | D1c — three systems students blur; what each does for performance management. | S⇄ | drills |
| 28 | ACCA APM: what data silos are and why they hurt the accounting function | D1b — the silo problem stated properly, tied to reconciliation, single-version-of-truth, and objectives. | S⇄ | drills |
| 29 | ACCA APM: planning vs operational variances | B1c — the split candidates fudge; which is controllable and why it matters for appraisal. | S⇄ | drills |
| 30 | ACCA APM: target costing vs kaizen costing vs lifecycle costing | B3d — three cost-improvement techniques conflated; when each applies. | S⇄ | drills |
| 31 | ACCA APM: the 3Es — economy, efficiency, effectiveness (VFM) | B4f — the not-for-profit trio students muddle; economy ≠ efficiency ≠ effectiveness, with an example of each. | S⇄ | drills |
| 32 | ACCA APM: Balanced Scorecard vs Performance Pyramid vs Building Block | Three frameworks students reach for interchangeably; which fits which question and their distinct structures. | S⇄ | drills |
| 33 | ACCA APM: financial vs non-financial performance indicators | A4a — why NFPIs are examined alongside financials and how they interact (leading vs lagging). | S⇄ | drills |
| 34 | ACCA APM: what is EVA (Economic Value Added) | Definitional — what EVA is and the adjustments, cleanly. Entry-point search term. | S≡ | drills |
| 35 | ACCA APM: what is residual income | Definitional — RI vs a raw profit figure and the cost-of-capital charge. | S≡ | drills |
| 36 | ACCA APM: what the Building Block Model actually is | Fitzgerald & Moon — the correct structure (Dimensions / Standards / Rewards, six dimensions inside Dimensions); the structure candidates misstate. | S≡ | drills |

---

## Backlog (not ranked into the 36 — overlap risk or thin search intent; promote if a batch runs dry)

- Feedforward vs feedback control (pair) — S⇄
- Mendelow's matrix — reading stakeholder power/interest (A1d) — S⇄
- CSF → KPI — deriving indicators, not listing them (A2c) — T
- Big data: value vs the risks and challenges (D2a) — S⇄
- Value chain (Porter) vs value-based management (B3a/B3b) — S⇄
- Integrated reporting and the 3Ps (A5b) — S⇄
- Six Sigma / DMAIC — definitional (B3d sub-move) — S≡
- Data-model ethics — un-auditable algorithms (D2i) — S≡
- Beyond budgeting vs traditional budgeting (B1d) — S⇄

**Coverage note:** every ranked TECHNIQUE/SYLLABUS seed maps to an existing approved drill LO (breadth-complete bank) or a live Section-B case, so the drills CTA always lands on real practice. FAILURE seeds route to `/acca/resit` (the diagnostic). No seed CTAs into a surface that doesn't exist yet.
