# AFM BATCH — NARRATIVE CLUSTER (pipeline #2, discursive D1–D5) — REVIEW PACK

**Status: D1–D2 GENERATED + inserted (candidate). D3–D5 pending.**
DB snapshot (hand-maintained preamble + per-drill body copied from the row fields). This is the FIRST
narrative-marking batch — the pilot for pipeline #2. Design: `docs/NARRATIVE_MARKING_DESIGN.md`;
detection targets (F1–F12, page-VERIFIED 2026-07-20): `docs/evidence/AFM_NARRATIVE_EVIDENCE.md` §1b.

---

## WHAT THIS PIPELINE IS (read before reviewing)

Narrative drills are **discursive** — the candidate writes prose, not figures. They are marked against
an **authored rubric** (the drill's `answer_schema`, `mode: 'narrative'`).

**⚠ CLAIM CEILING — do NOT overclaim.** This is **NOT** "code owns the marks" (that claim belongs to the
calculators alone). Narrative marking is:
> a **code-owned rubric** + **code-owned aggregation** (partial credit + disqualifier caps + band→verdict)
> + **deterministic** copy/anchor/coverage/conclusion detectors + **Rule-23** consistency (the golden
> pair). The per-criterion **quality** verdict (is the point developed? applied to the scenario?) is
> **MODEL-graded under constraint** — not deterministic. The honest verb is *structured / consistency-checked*.

**v1 is AUTHORING-TIME ONLY.** The marker + grader are a GATE that validates the rubric + reveal + golden
pair before insert. There is **no live per-student marking** in v1 (Horizon-2).

**How a narrative drill is built + gated (N1–N5, all must PASS before insert):**
- **N2** every rubric anchor fact is a REAL scenario fact AND the reveal uses it (deterministic).
- **N3** the reveal is not scenario-restating (F1 n-gram overlap under threshold, deterministic).
- **N5** the reveal commits a conclusion where the requirement asks for one (F4/F11, deterministic).
- **N4-pre** every designed golden-BAD flag is structurally raiseable (deterministic; cheap, saves grader spend).
- **N1** the reveal is a FULL-marks answer and every requirement part maps to ≥1 criterion (model grader).
- **N4 (Rule-23, load-bearing)** the golden GOOD scores in band, the golden BAD scores below it AND the
  marker raises the BAD's designed F-modes (model grader + deterministic detectors). The verifier-of-the-verifier.

**What YOU (reviewer) check** — no figures to recompute; this is a rubric/prose review:
1. **Rubric ↔ scenario.** Does every `required_point` reflect a real markable point? Is every `anchor_fact`
   a fact actually in the scenario? Does every requirement part have a criterion (F7)?
2. **Golden pair ↔ F1–F12.** Is the golden GOOD genuinely full-marks (developed, anchored, committed)? Does
   the golden BAD genuinely exhibit its designed F-modes (copies scenario = F1, generic = F5, fence-sits = F4)?
3. **CONCEPTUAL-ONLY.** The drill must NOT ask for a computation and the rubric must NOT credit a computed
   figure. Every number in the scenario is a GIVEN driver.
4. **F9 vs F6 (FR1).** A figure-INTERPRETATION criterion uses `[F1, F5, F6]` (F6 = superficial
   state-the-figure). **F9 is OFF** on conceptual drills — it is reserved for carry-a-value-downstream.
   Rows carry no `evidence_anchor`; the J24 p.14 own-figure quote is the aggregation principle (design §1).
   Marks credit RECOGNITION however expressed — never a reproduced number.

---

## ⛔ CLOSED RULINGS — do NOT re-raise

- **CLAIM CEILING (Grant 2026-07-18).** Never "code owns the marks" for narrative — the quality verdict is
  model-graded. Settled. (NARRATIVE_MARKING_DESIGN.md §0.)
- **CONCEPTUAL-ONLY / overlap (Grant 2026-07-20).** A narrative drill NEVER computes. **D1 interprets a GIVEN
  Monte Carlo output** — it does NOT compute VaR (calculator #3's `risk_measures`). **D5 evaluates exchange
  controls conceptually** — it does NOT compute the blocked-funds NPV (calculator #10 K3). Numbers shown are
  GIVEN drivers, free to restate (GIVEN-vs-COMPUTED). Interpreting two given figures as a ratio in prose is
  interpretation, not a "calculation."
- **OFR analog = graduated 0/½/full per criterion (ruling 2),** code-owned in `aggregate()`. Not "code owns
  the marks." **F9 vs F6 (FR1):** figure-interpretation criteria use `[F1, F5, F6]`; F9 is reserved for
  carry-a-value-downstream and is OFF on conceptual drills. The J24 p.14 own-figure quote is the
  partial-credit principle (design §1), not a per-criterion anchor. Marks credit recognition, never a number.
- **F12 (required output format ignored) — documented, UNWIRED.** In the F-catalogue (SD24 p.7, page-verified)
  but keyed on NO D1–D5 drill (none imposes a report format). Do not ask why F12 is unused.
- **`rubric_version: 'narrative_v1'`** stamped on every narrative `answer_schema`; the golden BAD + designed
  flags live under `answer_schema._authoring` (authoring artefacts, never served); the golden GOOD **is**
  `model_answer`. No new DB column (ruling 7).
- **Provenance gate.** §1b is now page-VERIFIED, but **no coverage/tier/ads claim on narrative until the
  pipeline is WALKED** (design §7).

---

## D1 — Monte Carlo simulation, interpreting a GIVEN output (B1b, L2, discursive)

- **id:** `cb9b411c-40b3-4739-b70c-3d5b8e65e578` · **status:** candidate · **published:** false
- **lo_code:** B1b (covers B1b) · **mode:** discursive · **calculation_required:** false · **marks_guide:** 12
- **command_verb:** interpret and explain · **rubric_version:** narrative_v1 · **6 criteria / 12 marks**
- **geo:** Vietnam / deep-water container-terminal expansion
- **GATES:** N2 ✓ · N3 ✓ · N5 ✓ · N4-pre ✓ · N1 ✓ · **N4 (Rule-23) ✓** — golden GOOD in band, golden BAD below + raised [F1, F5, F4].

### context_text (scenario — the Monte Carlo output is GIVEN)
> Cảng Sao Biển JSC ("CSB") is a Vietnamese state-linked port operator seeking board approval to expand its deep-water container terminal at Vũng Tàu. The expansion project requires an upfront capital commitment of USD 420 million. Because throughput demand, construction cost overruns and terminal-gate tariffs are all highly uncertain, CSB's financial advisers ran a Monte Carlo simulation with 10,000 iterations across those three key variables. The simulation produced the following GIVEN output: a mean (expected) NPV of +USD 38 million, a standard deviation of NPV of USD 61 million, a probability of a negative NPV of 27%, and a project Value-at-Risk (VaR) of USD 55 million at the 95% confidence level. The board must decide at its next meeting whether the project's risk profile is acceptable before committing capital.

### question
> Interpret the Monte Carlo simulation output for the Vũng Tàu terminal expansion project.
>
> (i) Explain what the simulation results indicate about the likelihood of project success and the overall risk profile of the project.
>
> (ii) Explain what the project Value-at-Risk figure means in this context and how the board of CSB should read it when assessing whether to commit capital.

*(Conceptual-only: "interpret / explain", never "compute". No VaR is calculated — the figure is GIVEN.)*

### model_answer (the golden GOOD — full-marks standard; first line is the area-entry heading)
> **Monte Carlo simulation — interpreting the simulation output**
>
> The simulation's central finding for the Vũng Tàu expansion is a mean (expected) NPV of +USD 38 million, which confirms that, across 10,000 iterations, the project generates value on average for CSB. On the surface this endorses proceeding.
>
> However, the standard deviation of USD 61 million — which exceeds the mean of USD 38 million — reveals that the distribution of NPV outcomes is extremely wide. A coefficient of variation above 1.0 signals that the positive mean is, in isolation, a dangerously optimistic summary statistic; a sizeable share of outcomes cluster below zero. This is directly confirmed by the 27% probability of negative NPV: more than one in four simulated scenarios resulted in value destruction. Against a USD 420 million capital commitment, a failure rate of 27% is commercially significant — it is not a remote tail risk but a plausible central-scenario variant the board must price in.
>
> Turning to project VaR: the USD 55 million VaR at the 95% confidence level is a THRESHOLD, not a ceiling — it means there is a 5% probability that the project's NPV outcome is worse than a USD 55 million loss relative to the base. Critically, VaR is silent on HOW severe those worst-5% outcomes are; that depends on the shape of the full NPV distribution, so the figure must be read alongside the mean and standard deviation and never quoted in isolation as a "we will not lose more than USD 55 million" reassurance. Measured against the USD 420 million commitment, the USD 55 million threshold is roughly 13% of capital — a material downside marker the board must be satisfied CSB's balance sheet can absorb.
>
> In conclusion, the board should not approve the USD 420 million commitment in its current form. The mean NPV is too narrowly positive relative to the dispersion and the 27% downside probability; CSB should first secure demand-side revenue guarantees or adopt phased construction to narrow the NPV distribution before sanctioning the project.

### rubric (answer_schema.criteria) — 6 criteria / 12 marks · bands: fail / pass 0.5 / good 0.7 / excellent 0.85

*(FR1-patched: figure-interpretation criteria use `[F1, F5, F6]` — F6 catches superficial state-the-figure
commentary. **No F9, no evidence_anchor** — F9 is for carry-a-value-downstream only, and this conceptual
drill has none. The J24 p.14 own-figure quote is the aggregation/partial-credit principle in the design
doc, not a per-criterion anchor. Marks credit RECOGNITION however expressed — never a reproduced number.)*

| id | part | marks | required point (short) | anchors | disqualifiers |
|----|------|-------|------------------------|---------|---------------|
| c1 | (i) | 2 | Mean NPV +USD 38m is positive → central outcome value-creating → prima facie proceed | f_mean_npv, f_entity | F1, F5, **F6** |
| c2 | (i) | 2 | SD USD 61m large vs mean 38m → highly dispersed → mean alone misleading | f_mean_npv, f_sd_npv | F1, F5, **F6** |
| c3 | (i) | 2 | 27% P(neg NPV) = >1-in-4 value destruction → material for a USD 420m commitment | f_prob_neg, f_capex | F1, F5, **F6** |
| c4 | (ii) | 2 | VaR USD 55m @ 95% = 5% chance of an outcome worse than that threshold (a threshold, not a ceiling) | f_var, f_confidence | F1, F5, **F6** |
| c5 | (ii) | 2 | 55m threshold ≈ 13% of the USD 420m capital → assess balance-sheet resilience | f_var, f_capex, f_entity | F1, F5, **F6** |
| c6 | (ii) | 2 | Committed recommendation: approve only with resilience / demand mitigation to cut P(neg) | f_prob_neg, f_capex | **F4**, F5 |

**scenario_facts** (each `key` verbatim in context_text): f_mean_npv "USD 38 million" · f_sd_npv "USD 61 million"
· f_prob_neg "27%" · f_var "USD 55 million" · f_capex "USD 420 million" · f_entity "CSB" · f_confidence "95%"
· f_iterations "10,000 iterations".

### golden BAD (authoring artefact — `answer_schema._authoring`, NOT served) — designed flags [F1, F5, F4]
> The Monte Carlo simulation ran 10,000 iterations across three key variables — throughput demand, construction cost overruns and terminal-gate tariffs. The simulation produced a mean (expected) NPV of +USD 38 million, a standard deviation of NPV of USD 61 million, a probability of a negative NPV of 27%, and a project Value-at-Risk (VaR) of USD 55 million at the 95% confidence level.
>
> Monte Carlo simulation is a technique used to model uncertainty in capital investment decisions. It runs many iterations using randomly drawn values for uncertain variables and produces a distribution of possible NPV outcomes. This is useful because it captures a range of scenarios rather than a single-point estimate.
>
> The mean NPV is positive, which suggests the project may be worth pursuing. The standard deviation indicates there is variability around this mean. A higher standard deviation generally means greater uncertainty. The 27% probability of negative NPV indicates there is some chance the project could destroy value.
>
> Value-at-Risk is a widely used risk metric in financial analysis. It tells decision-makers about the potential downside in a given confidence interval. At the 95% confidence level, VaR indicates the loss that will not be exceeded in 95% of scenarios. This is a useful measure for understanding tail risk and comparing projects.
>
> There are arguments on both sides of the decision. On one hand the mean NPV is positive and the project could deliver value. On the other hand, there is uncertainty and the probability of negative NPV is not negligible. The board will need to weigh these considerations carefully against the company's risk appetite and strategic objectives before making any final judgement.

*(F1 — sentence 1 of para 1 lifts the scenario's simulation-output sentence verbatim; F5 — pure textbook
definitions, never anchored to CSB's USD 420m decision; F4 — "before making any final judgement" fence-sits,
no recommendation. The marker scores this below band and raises F1/F5/F4.)*

### hint (served — one-sentence nudge)
> Your answer reports the simulation statistics correctly — but the board needs to know what those numbers mean for the capital commitment decision, so make sure you translate the probability of negative NPV and the VaR figure into an explicit recommendation on whether to proceed, and on what conditions.

### full_reveal (served — Ezra teaching reveal)
> The classic misconception here is FENCE-SITTING: candidates recite the mean NPV, the standard deviation, and the VaR figure accurately, then stop — leaving the board with a table of numbers but no steer on the USD 420 million decision. That is not interpretation; it is transcription. The error matters because a positive mean NPV in isolation is a dangerously partial summary: when the standard deviation exceeds the mean, the distribution is so wide that the mean is likely to mislead — a large share of the probability mass may sit below zero, and the 27% downside probability confirms that this is not a remote tail event but a plausible outcome the board must price into its approval. On VaR specifically, candidates often treat it as a reassuring ceiling — "we will not lose more than USD 55 million" — when the correct reading is the opposite: VaR is only a THRESHOLD marking where the worst 5% of outcomes begin, and it is silent on HOW severe those outcomes are (that depends on the shape of the full distribution), which is why the figure must be read against the mean, the dispersion and total capital at risk rather than quoted in isolation as a ceiling. The boardroom bar demands that you close the loop: the simulation output is the floor of the argument, not the ceiling — the advice is whether to commit, defer, or restructure the project to narrow the NPV distribution, and that verdict must be stated explicitly.

---

## D2 — Sources of finance incl. Islamic + green, appropriateness for the organisation (B3a/b/c, L3, discursive)

- **id:** `08044fb6-eecb-4498-9c16-56381f66dc92` · **status:** candidate · **published:** false
- **lo_code:** B3a (covers B3a/B3b/B3c) · **mode:** discursive · **calculation_required:** false · **marks_guide:** 12
- **command_verb:** assess and recommend · **rubric_version:** narrative_v1 · **5 criteria / 12 marks**
- **geo:** Kenya / renewable-energy (solar-plus-storage) developer
- **GATES:** N2 ✓ · N3 ✓ · N5 ✓ · N4-pre ✓ · N1 ✓ · **N4 (Rule-23) ✓** — golden GOOD in band, golden BAD below + raised [F1, F5, F4]. (attempt 1)

### context_text (scenario — all figures are GIVEN)
> Savanna Solar Kenya Ltd ("SSK") is a Nairobi-based renewable-energy developer seeking KES 8.4 billion to finance the construction of a 120 MW solar-plus-storage facility in Turkana County. SSK's board has adopted a formal green mandate, committing the company to instruments whose proceeds are ring-fenced for certified climate-positive assets. The company's current debt-to-equity ratio stands at 2.1×, which the board regards as the maximum tolerable gearing level, meaning any new instrument that increases reported on-balance-sheet debt further is structurally ruled out. SSK's largest shareholders are a consortium of Gulf-based sovereign wealth funds that require all financing to comply with Shariah principles, prohibiting interest (riba) and speculative uncertainty (gharar). An independent credit assessment has rated SSK's long-term obligations BB+, reflecting the early-stage revenue profile of the Turkana project and the limited operating history of the company.

### question
> Assess the appropriateness of each of the following four sources of finance for SSK's KES 8.4 billion requirement, and provide a justified recommendation identifying which source (or combination) the board should adopt:
> (i) A conventional investment-grade bond issue
> (ii) A green bond aligned to the ICMA Green Bond Principles
> (iii) An ijara sukuk structured over the Turkana project assets
> (iv) A new equity placing to external institutional investors
>
> Your answer should weigh each instrument against SSK's financial position, its gearing constraint, its green mandate, and its Shariah compliance requirement.

*(Conceptual-only: "assess … recommend", never "compute". No instrument is priced — the figures are GIVEN.)*

### model_answer (the golden GOOD — full-marks standard; first line is the area-entry heading)
> **Sources of finance — appropriateness for the organisation**
>
> **Conventional bond [(i)]** SSK's BB+ rating signals sub-investment-grade credit quality, reflecting its early-stage revenue profile, which means a conventional bond would carry punishing coupon costs. More critically, interest payments constitute riba, flatly contravening the Shariah principles demanded by the Gulf sovereign wealth fund investors. It would also add to reported debt, pushing gearing beyond the 2.1× ceiling the board has set as an absolute limit. On all three axes — cost, Shariah, gearing — it fails.
>
> **Green bond [(ii)]** Aligning proceeds with the ICMA Green Bond Principles would satisfy the green mandate by ring-fencing funds to the certified climate-positive 120 MW Turkana facility. Yet the instrument still pays a coupon (riba), violating Shariah, and it is reported as debt, risking a breach of the 2.1× constraint. It solves one problem while leaving the other two unresolved.
>
> **Ijara sukuk [(iii)]** This is the strongest fit. Structured as a lease over the Turkana project assets, it generates returns through rental income rather than interest, eliminating riba and gharar and achieving full Shariah compliance for the Gulf sovereign wealth fund shareholders. Labelling it a green sukuk under the ICMA framework ring-fences the KES 8.4 billion proceeds to the 120 MW project, satisfying the green mandate. Crucially, an appropriately structured ijara may achieve off-balance-sheet accounting treatment, shielding the 2.1× gearing position — though this must be confirmed with auditors under IFRS 16.
>
> **Equity placing [(iv)]** Equity unambiguously protects the 2.1× ceiling by adding no debt. However, placing shares with external institutions dilutes the Gulf sovereign wealth fund shareholders and could generate opposition from the investors whose requirements drive the entire financing strategy; moreover, a BB+ issuer raising KES 8.4 billion in equity faces a steep return hurdle.
>
> **Recommendation** The board should proceed with a green ijara sukuk as the primary financing instrument — it is the sole option that satisfies Shariah compliance, the green mandate, and the gearing constraint simultaneously. If a capital buffer beyond KES 8.4 billion is later required, a pre-emptive rights issue to the existing Gulf shareholders would preserve both Shariah alignment and investor control without breaching the 2.1× ceiling.

### rubric (answer_schema.criteria) — 5 criteria / 12 marks · bands: fail / pass 0.5 / good 0.7 / excellent 0.85

*(FR1: assessment criteria use `[F1, F5, F6]` (F6 = superficial state-the-figure); the recommendation criterion uses `[F1, F4, F5]` (F4 = fence-sitting). **No F9, no evidence_anchor** — this conceptual drill carries no carry-a-value-downstream step. Marks credit RECOGNITION however expressed.)*

| id | part | lo | marks | required point (short) | anchors | disqualifiers |
|----|------|----|-------|------------------------|---------|---------------|
| c1 | (i) | B3a | 2 | Conventional bond fails on cost (BB+), riba, AND the 2.1× ceiling → unsuitable on all three axes | f_gearing, f_rating, f_shariah | F1, F5, **F6** |
| c2 | (ii) | B3c | 2 | Green bond satisfies the green mandate (ring-fenced to 120 MW) but still pays riba + adds debt → only 1 of 3 constraints met | f_green, f_gearing, f_shariah, f_capacity | F1, F5, **F6** |
| c3 | (iii) | B3b | 3 | Ijara sukuk = strongest fit: lease/rental avoids riba+gharar (Shariah ✓), green-sukuk label (mandate ✓), possible off-BS (gearing ✓, verify IFRS 16) | f_amount, f_shariah, f_green, f_gearing, f_capacity | F1, F5, **F6** |
| c4 | (iv) | B3a | 2 | Equity protects the 2.1× ceiling but dilutes the Gulf holders + steep BB+ return hurdle | f_gearing, f_shariah, f_amount, f_rating | F1, F5, **F6** |
| c5 | (v) | B3a | 3 | Committed recommendation: green ijara sukuk (only option clearing all three constraints); rights issue to Gulf holders as buffer | f_amount, f_gearing, f_green, f_shariah, f_capacity | F1, **F4**, F5 |

**scenario_facts** (each `key` verbatim in context_text): f_amount "KES 8.4 billion" · f_gearing "2.1×" · f_green "green mandate" · f_shariah "Shariah" · f_rating "BB+" · f_capacity "120 MW".

### golden BAD (authoring artefact — `answer_schema._authoring`, NOT served) — designed flags [F1, F5, F4]
> Savanna Solar Kenya Ltd is a Nairobi-based renewable-energy developer seeking KES 8.4 billion to finance the construction of a 120 MW solar-plus-storage facility in Turkana County. There are several sources of finance the company could consider.
>
> A conventional bond could be issued. Bonds are a common source of debt finance. They involve paying a coupon to investors. The credit rating of the company may affect the terms available. There are advantages and disadvantages to bond financing in general.
>
> A green bond could also be considered. Green bonds are used by companies that have environmental objectives. They require the proceeds to be used for green projects. SSK has a green mandate so this could be relevant.
>
> An ijara sukuk is an Islamic finance instrument. Islamic finance prohibits interest. A sukuk is a certificate of ownership. It can be used to raise capital in compliance with Islamic principles. There are various types of sukuk available in the market.
>
> An equity placing involves issuing new shares to investors. This would dilute existing shareholders. Equity does not require fixed interest payments. However, it may be expensive for the company.
>
> There are therefore several options available to SSK, each with their own merits and drawbacks. The conventional bond and the green bond are debt instruments, whereas the equity placing is not. The ijara sukuk is an Islamic finance instrument. All four instruments could potentially be used depending on circumstances, and each has positive and negative features that the board would need to weigh up carefully before making any decision.

*(F1 — para 1 lifts the scenario's opening sentence verbatim; F5 — pure textbook definitions, never anchored to SSK's 2.1×/Shariah/green constraints; F4 — "before making any decision" fence-sits, no recommendation. The marker scores this below band and raises F1/F5/F4.)*

### hint (served — one-sentence nudge)
> Your answer lists what each instrument is — now check whether you have explicitly tested each one against all three of SSK's binding constraints (Shariah compliance, the 2.1× gearing ceiling, and the green mandate) and then closed with a single justified recommendation the board can act on.

### full_reveal (served — Ezra teaching reveal)
> The misconception here is FENCE-SITTING combined with SCENARIO-FREE discussion: candidates describe each instrument in general terms — "bonds pay coupons," "equity avoids debt" — without anchoring the assessment to SSK's three specific, non-negotiable constraints, and then decline to name a preferred course of action. This is the wrong mental model because the command verb "assess and recommend" requires a verdict, not a tour of the options; a board cannot act on a balanced description of trade-offs, only on a justified choice. The correct move is to use SSK's constraints as a filter applied sequentially to each instrument: an instrument that fails even one binding constraint (riba prohibition, the 2.1× ceiling, or the green mandate) is disqualified regardless of its other merits, and the recommendation names whichever instrument — or combination — clears all three filters simultaneously. Where two instruments each clear all filters, the recommendation must weigh them against each other using scenario evidence (cost, dilution risk, accounting treatment) and declare a primary choice, since "either could work" is still fence-sitting. The Shariah constraint is particularly fertile ground for undeveloped assumptions: stating that an ijara sukuk is "Shariah-compliant" without explaining the mechanism — rental income replacing riba, and the lease structure over identifiable project assets — leaves the assumption listed but not discussed, which is the UNDEVELOPED-ASSUMPTION failure that costs the interpretive marks.

---

## D3–D5 — PENDING (not yet appended to pack)
- **D3** capital-structure theory (B3i, L3) — generated + inserted
- **D4** BSOP conceptual — role of option pricing models (B4d, L2) — generated + inserted
- **D5** exchange controls + international sources of finance (B5c/d, L3) — generated + inserted
