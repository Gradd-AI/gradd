# AFM BATCH — NARRATIVE CLUSTER (pipeline #2, discursive D1–D5) — REVIEW PACK

**Status: GATE-P FLIP EXECUTED 2026-07-21 — LIVE, pending student walk.** D1–D5 generated → co-founder rubric review (FR2: D2 1 BLOCKING IFRS16 + 2 minor FIXED; D3 2 prose accepts FIXED) → blind GPT round 1 (FR3: D5 2 MUST-FIX FIXED; D3 1 polish FIXED; D2 1 minor sweep VERIFIED CLEAN) → all re-gated N1–N5 clean → Grant ruled FLIP → reconcile-before-flip clean (published AFM 41→46, discursive candidates 6→1 [parked A3a only], approved-unpublished 0 throughout) → guarded explicit-id flip, all 5 → `approved`/`published=true`. **B-section-live tier content COMPLETE; tier claim + ads stay GATED on the student walk (provenance gate, design §7).**
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

- **id:** `cb9b411c-40b3-4739-b70c-3d5b8e65e578` · **status:** approved · **published:** true
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

- **id:** `08044fb6-eecb-4498-9c16-56381f66dc92` · **status:** approved · **published:** true
- **lo_code:** B3a (covers B3a/B3b/B3c) · **mode:** discursive · **calculation_required:** false · **marks_guide:** 12
- **command_verb:** assess and recommend · **rubric_version:** narrative_v1 · **5 criteria / 12 marks**
- **geo:** Kenya / renewable-energy (solar-plus-storage) developer
- **GATES:** N2 ✓ · N3 ✓ · N5 ✓ · N4-pre ✓ · N1 ✓ · **N4 (Rule-23) ✓** — golden GOOD in band, golden BAD below + raised [F1, F5, F4]. (attempt 1; **re-gated clean post-FR2**, see below)

**⚠ FR2 co-founder adjudication (2026-07-21) — 1 BLOCKING + 2 minor, all fixed + re-gated:**
1. **BLOCKING — false IFRS 16 claim.** The original ijara paragraph claimed the sukuk "may achieve off-balance-sheet accounting treatment", which IFRS 16 does not permit for a lease of this kind (a right-of-use asset and lease liability are recognised regardless of structuring). **Fix:** the scenario now defines the covenant explicitly — "2.1×, measured on interest-bearing borrowings and excluding lease obligations" — and the model answer states the honest mechanism: the ijara's rental obligations fall outside that borrowings-based ratio, but IFRS 16 still puts the lease liability ON the balance sheet; this is covenant relief, not invisibility, and should be confirmed with lenders/auditors. c3's required_point rewritten to match.
2. **KES 8.4 billion → KES 26 billion** across every surface (context, question, model_answer, all affected criteria, scenario_facts, golden_bad) — more realistic sizing for a 120 MW solar-plus-storage build. Full-row grep proved zero "8.4" residue post-patch (the calc #3 full-row-sweep lesson applied).
3. **c5's part tag "(v)"** was invented — the question only enumerates (i)–(iv); the recommendation instruction sits in the stem sentence, not a numbered part. Relabelled to `"justified recommendation (per the stem)"` in both `requirement_parts` and `c5.requirement_part`.

Golden BAD untouched structurally (still exhibits F1/F5/F4) — only its copied opening figure updated to match the new scenario amount. Patch + re-gate script: `scripts/_patch_afm_narrative_fr2.ts` (gitignored). **N1–N5 re-run clean, all PASS** (real grader).

**⚠ FR3 blind GPT round 1 (2026-07-21) — 1 minor sweep, VERIFIED CLEAN, no edit:** the reviewer flagged a risk that green-bond/sukuk language could drift into an "ICMA certification" claim (ICMA does not certify — the Green Bond Principles are a voluntary disclosure framework: use-of-proceeds, project evaluation, management-of-proceeds/ring-fencing, and reporting). Full-row grep confirms every ICMA reference already reads "aligned to"/"under the ICMA framework"/"adherence to ICMA Green Bond Principles" — GBP-alignment framing only, zero certification claims. The scenario's own "certified climate-positive assets" wording is the board's internal mandate designation (not an ICMA claim) and stays untouched. Verify-only pass, `scripts/_patch_afm_narrative_fr3.ts` (gitignored, shared with D3/D5).

### context_text (scenario — all figures are GIVEN)
> Savanna Solar Kenya Ltd ("SSK") is a Nairobi-based renewable-energy developer seeking KES 26 billion to finance the construction of a 120 MW solar-plus-storage facility in Turkana County. SSK's board has adopted a formal green mandate, committing the company to instruments whose proceeds are ring-fenced for certified climate-positive assets. The company's current debt-to-equity ratio stands at 2.1×, measured on interest-bearing borrowings and excluding lease obligations, which the board regards as the maximum tolerable gearing level under its lending covenants; any new instrument that increases reported interest-bearing debt further is structurally ruled out. SSK's largest shareholders are a consortium of Gulf-based sovereign wealth funds that require all financing to comply with Shariah principles, prohibiting interest (riba) and speculative uncertainty (gharar). An independent credit assessment has rated SSK's long-term obligations BB+, reflecting the early-stage revenue profile of the Turkana project and the limited operating history of the company.

### question
> Assess the appropriateness of each of the following four sources of finance for SSK's KES 26 billion requirement, and provide a justified recommendation identifying which source (or combination) the board should adopt:
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
> **Conventional bond [(i)]** SSK's BB+ rating signals sub-investment-grade credit quality, reflecting its early-stage revenue profile, which means a conventional bond would carry punishing coupon costs. More critically, interest payments constitute riba, flatly contravening the Shariah principles demanded by the Gulf sovereign wealth fund investors. It would also count as interest-bearing debt under the board's covenant definition, pushing gearing beyond the 2.1× ceiling the board has set as an absolute limit. On all three axes — cost, Shariah, gearing — it fails.
>
> **Green bond [(ii)]** Aligning proceeds with the ICMA Green Bond Principles would satisfy the green mandate by ring-fencing funds to the certified climate-positive 120 MW Turkana facility. Yet the instrument still pays a coupon (riba), violating Shariah, and it is interest-bearing debt, risking a breach of the 2.1× constraint. It solves one problem while leaving the other two unresolved.
>
> **Ijara sukuk [(iii)]** This is the strongest fit. Structured as a lease over the Turkana project assets, it generates returns through rental income rather than interest, eliminating riba and gharar and achieving full Shariah compliance for the Gulf sovereign wealth fund shareholders. Labelling it a green sukuk under the ICMA framework ring-fences the KES 26 billion proceeds to the 120 MW project, satisfying the green mandate. Crucially, because the board's 2.1× covenant is measured on interest-bearing borrowings and excludes lease obligations, the sukuk's rental payments fall outside that measure entirely — the instrument preserves covenant headroom without breaching the gearing constraint. This is a narrower claim than off-balance-sheet treatment: IFRS 16 still requires SSK to recognise a right-of-use asset and a lease liability for the ijara, so the obligation remains fully visible on the balance sheet — it simply sits outside the borrowings-based ratio the covenant tests. The board should confirm this reading of the covenant definition with its lenders and auditors before relying on it.
>
> **Equity placing [(iv)]** Equity unambiguously protects the 2.1× ceiling by adding no debt of any kind. However, placing shares with external institutions dilutes the Gulf sovereign wealth fund shareholders and could generate opposition from the investors whose requirements drive the entire financing strategy; moreover, given the BB+ rating and early-stage revenue profile, a new equity raise of KES 26 billion faces a steep return hurdle.
>
> **Recommendation** The board should proceed with a green ijara sukuk as the primary financing instrument — it is the sole option that satisfies Shariah compliance, the green mandate, and the gearing covenant on its interest-bearing-borrowings definition, simultaneously. If a capital buffer beyond KES 26 billion is later required, a pre-emptive rights issue to the existing Gulf shareholders would preserve both Shariah alignment and investor control without adding interest-bearing debt.

### rubric (answer_schema.criteria) — 5 criteria / 12 marks · bands: fail / pass 0.5 / good 0.7 / excellent 0.85

*(FR1: assessment criteria use `[F1, F5, F6]` (F6 = superficial state-the-figure); the recommendation criterion uses `[F1, F4, F5]` (F4 = fence-sitting). **No F9, no evidence_anchor** — this conceptual drill carries no carry-a-value-downstream step. Marks credit RECOGNITION however expressed. **FR2:** c3 rewritten to the covenant-measure logic; c5's part tag corrected.)*

| id | part | lo | marks | required point (short) | anchors | disqualifiers |
|----|------|----|-------|------------------------|---------|---------------|
| c1 | (i) | B3a | 2 | Conventional bond fails on cost (BB+), riba, AND counts as interest-bearing debt under the covenant → unsuitable on all three axes | f_gearing, f_rating, f_shariah | F1, F5, **F6** |
| c2 | (ii) | B3c | 2 | Green bond satisfies the green mandate (ring-fenced to 120 MW) but still pays riba + is interest-bearing debt → only 1 of 3 constraints met | f_green, f_gearing, f_shariah, f_capacity | F1, F5, **F6** |
| c3 | (iii) | B3b | 3 | Ijara sukuk = strongest fit: lease/rental avoids riba+gharar (Shariah ✓), green-sukuk label (mandate ✓), rental falls outside the interest-bearing-borrowings covenant measure — but IFRS 16 still recognises the lease liability on the B/S (covenant relief, not off-BS invisibility) | f_amount, f_shariah, f_green, f_gearing, f_capacity | F1, F5, **F6** |
| c4 | (iv) | B3a | 2 | Equity protects the 2.1× ceiling but dilutes the Gulf holders + steep BB+ return hurdle on KES 26bn | f_gearing, f_shariah, f_amount, f_rating | F1, F5, **F6** |
| c5 | justified recommendation (per the stem) | B3a | 3 | Committed recommendation: green ijara sukuk (only option clearing all three constraints); rights issue to Gulf holders as buffer | f_amount, f_gearing, f_green, f_shariah, f_capacity | F1, **F4**, F5 |

**scenario_facts** (each `key` verbatim in context_text): f_amount "KES 26 billion" · f_gearing "2.1×" · f_green "green mandate" · f_shariah "Shariah" · f_rating "BB+" · f_capacity "120 MW".

### golden BAD (authoring artefact — `answer_schema._authoring`, NOT served) — designed flags [F1, F5, F4]
> Savanna Solar Kenya Ltd is a Nairobi-based renewable-energy developer seeking KES 26 billion to finance the construction of a 120 MW solar-plus-storage facility in Turkana County. There are several sources of finance the company could consider.
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

## D3 — Capital-structure theory and practical impact (B3i, L3, discursive)

- **id:** `fda46d99-5d57-4017-9945-2d0c3ca55498` · **status:** approved · **published:** true
- **lo_code:** B3i (covers B3i) · **mode:** discursive · **calculation_required:** false · **marks_guide:** 11
- **command_verb:** assess · **rubric_version:** narrative_v1 · **4 criteria / 11 marks**
- **geo:** Chile / mining-and-metals group considering a large recapitalisation
- **GATES:** N2 ✓ · N3 ✓ · N5 ✓ · N4-pre ✓ · N1 ✓ · **N4 (Rule-23) ✓** — golden GOOD in band, golden BAD below + raised [F1, F5, F4]. (attempt 1; **re-gated clean post-FR2 and again post-FR3**, see below)

**⚠ FR2 co-founder adjudication (2026-07-21) — 2 prose accepts, both fixed + re-gated:**
1. **Pecking-order paragraph over-claimed.** "...most plausibly a tax or control agenda — which the market may interpret as a negative signal about equity valuation" reached beyond what the scenario supports (no market-reaction evidence is given). **Fix:** deleted the trailing market-signal clause; the deliberate tax/control-agenda point (which IS supported — the transaction actively retires equity rather than filling a funding gap) stands alone.
2. **Agency paragraph was one-sided.** Presented only the agency COSTS of high leverage (asset substitution, underinvestment, reduced monitoring discipline from the buyback), omitting the orthodox counter-argument. **Fix:** rewritten as a two-sided treatment — Jensen's free-cash-flow hypothesis gives debt a genuine agency BENEFIT for a mature, cash-generative miner (it disciplines management against wasteful reinvestment), but at the proposed 95% D/E that benefit is dominated by the asset-substitution/underinvestment costs the 80% covenant trigger makes concrete. **The reject verdict is unchanged** — the two-sided analysis strengthens rather than reverses it.

**⚠ FR3 blind GPT round 1 (2026-07-21) — 1 polish, fixed + re-gated:**
3. **The buyback/control sentence was unconditional.** "The equity buyback also concentrates control, reducing the disciplining force of dispersed shareholders" asserted a control effect as fact, when whether a buyback meaningfully concentrates control depends on the firm's free float and existing monitoring arrangements. **Fix:** rewritten as conditional — the buyback's control effect is NOT automatic; the clearer, better-evidenced agency issue at this scale is the lender–equity conflict crystallised by the 80% covenant trigger itself (once breached, bondholders actively restrict investment choices). c4's `required_point` re-worded to match the same framing. **Reject verdict unchanged.**

Only `model_answer` (+ c4's `required_point`, FR3) changed — rubric structure/context/golden-BAD untouched throughout. Patch + re-gate scripts: `scripts/_patch_afm_narrative_fr2.ts` + `scripts/_patch_afm_narrative_fr3.ts` (gitignored). **N1–N5 re-run clean after each round, all PASS** (real grader).

### context_text (scenario — all figures are GIVEN)
> Cobre Pacífico S.A. ("CPSA") is an established Chilean mining-and-metals group listed on the Santiago Stock Exchange. The board is evaluating a large recapitalisation under which CPSA would issue new bonds worth CLP 420 billion and use the proceeds to buy back equity, raising net debt-to-equity from the current 25% to a target of 95%. The corporate tax rate in Chile applicable to CPSA is 27%. The CFO argues that the additional tax shield will permanently enhance firm value, while the CEO cautions that the mining sector's highly volatile cash flows make the elevated leverage risky, and the finance director warns that mining covenants will restrict future capital expenditure if gearing rises above 80%. Historically, CPSA has funded growth primarily through retained earnings, accessing equity markets only twice in its 30-year existence.

### question
> ASSESS the impact of the proposed recapitalisation on CPSA's value and financial strategy, using capital-structure theory as your framework. Your answer should address:
> (i) The relevance of Modigliani and Miller propositions before and after tax to the CFO's argument.
> (ii) Whether static trade-off theory supports the move to a 95% debt-to-equity ratio.
> (iii) What pecking-order theory reveals about CPSA's historical financing behaviour and the proposed transaction.
> (iv) The agency effects that the recapitalisation is likely to trigger.

*(Conceptual-only: "assess … using theory as your framework", never "compute". No WACC/value is calculated — theory is the lens applied to GIVEN facts.)*

### model_answer (the golden GOOD — full-marks standard; first line is the area-entry heading)
> **Capital structure — theory and practical impact**
>
> **Part (i) — MM before and after tax**
>
> In a frictionless world, MM's pre-tax proposition asserts that firm value is independent of financing mix, implying that the CFO's enthusiasm for issuing CLP 420 billion of debt is theoretically groundless in perfect markets. Once the 27% Chilean corporate tax rate is introduced, however, MM's post-tax world generates a positive tax shield — so the CFO is partially correct that new debt raises value. The critical qualification is that MM's tax model abstracts away bankruptcy costs and market imperfections; in a mining business where volatile cash flows mean operating income can turn sharply negative, that abstraction is untenable. The CFO's argument is therefore theoretically valid only within an unrealistic framing.
>
> **Part (ii) — Static trade-off theory**
>
> Static trade-off theory endorses leverage up to the point where marginal distress costs equal the marginal tax benefit. The 27% tax rate applied to CLP 420 billion of new bonds does generate a meaningful shield, but the proposed leap from 25% to 95% debt-to-equity overshoots any plausible optimum. Once gearing crosses the covenant trigger at 80%, bondholders impose capital-expenditure restrictions that directly damage future cash generation — a concrete distress cost visible before any formal default. The theory therefore contradicts, rather than supports, the proposed transaction at this scale.
>
> **Part (iii) — Pecking-order theory**
>
> CPSA's three-decade reliance on retained earnings to finance growth is textbook pecking-order behaviour: internal funding is cheapest because it avoids adverse-selection signalling. Issuing CLP 420 billion of new bonds purely to retire equity violates that hierarchy and signals to the market that management believes debt is cheaper than equity for reasons beyond a mere funding shortage — most plausibly a tax or control agenda.
>
> **Part (iv) — Agency effects**
>
> Debt does carry a genuine agency BENEFIT here: under Jensen's free-cash-flow hypothesis, a mature, cash-generative mining group is precisely the type of firm where higher leverage disciplines management by committing future cash flow to debt service, reducing the free cash flow otherwise available for value-destroying empire-building or low-return diversification. At a modest increase in gearing this disciplining effect could plausibly outweigh its costs. At the proposed 95% debt-to-equity, however, that benefit is dominated by the agency COSTS of high leverage: covenants at the 80% threshold reveal that lenders already anticipate monitoring costs, and once breached, restricted capex leaves equity holders with incentives to substitute riskier projects to extract value from debtholders (asset substitution) or to forgo positive-NPV investments (underinvestment). Whether the equity buyback meaningfully concentrates control is itself conditional on CPSA's free float and existing monitoring arrangements — a buyback does not automatically weaken dispersed-shareholder discipline. The clearer and better-evidenced agency issue at this scale is the lender–equity conflict crystallised by the 80% covenant trigger itself: once breached, bondholders actively restrict CPSA's investment choices, which is a sharper agency cost than any assumed loss of shareholder monitoring from the buyback. On balance, the FCF-discipline benefit is real but modest relative to the asset-substitution and underinvestment costs triggered well before 95%, so net agency costs still compound the distress costs identified under trade-off theory.
>
> **Overall assessment:** The proposed recapitalisation should be rejected in its current form. While the 27% tax rate provides a genuine, but limited, shield benefit, the crossing of the 80% covenant threshold, the amplification of agency conflicts, and the violation of CPSA's long-standing pecking-order behaviour all indicate that the costs outweigh the gains. The board should retain leverage well below 80% and pursue incremental debt financing if a tax shield is desired.

### rubric (answer_schema.criteria) — 4 criteria / 11 marks · bands: fail / pass 0.5 / good 0.7 / excellent 0.85

*(FR1: the three theory-application criteria use `[F1, F5, F6]`; the agency + verdict criterion uses `[F1, F4, F5]` (F4 = fence-sitting on the overall verdict). **No F9, no evidence_anchor.** F5 is the enemy here — theory recited without application to CPSA's mining specifics earns nothing. **FR2:** required_points unchanged — the two-sided model_answer is a superset of what c3/c4 already require. **FR3:** c4 re-worded — the covenant-trigger lender conflict, not the buyback-control claim, is now the cited clearest agency cost.)*

| id | part | lo | marks | required point (short) | anchors | disqualifiers |
|----|------|----|-------|------------------------|---------|---------------|
| c1 | (i) | B3i | 3 | MM pre-tax = irrelevance refutes CFO; post-tax shield partially validates, but perfect-markets assumption strained by volatile mining cash flows | f_tax, f_sector | F1, F5, **F6** |
| c2 | (ii) | B3i | 3 | Trade-off: 27% shield real, but 25%→95% overshoots optimum; crossing 80% covenant = concrete distress cost → theory does NOT support | f_de_current, f_de_target, f_tax, f_bonds, f_covenant | F1, F5, **F6** |
| c3 | (iii) | B3i | 2 | Pecking-order: 30yr retained-earnings history fits; bonds-to-retire-equity inverts it → signals a tax/control motive, not a funding gap | f_retained, f_bonds | F1, F5, **F6** |
| c4 | (iv) | B3i | 3 | Agency: 80% covenant trigger → restricted capex is the clearest cost, sharper than the buyback's control effect (conditional on free float); FCF-discipline benefit real but dominated → reject/scale back | f_de_target, f_covenant | F1, **F4**, F5 |

**scenario_facts** (each `key` verbatim in context_text): f_de_current "25%" · f_de_target "95%" · f_tax "27%" · f_bonds "CLP 420 billion" · f_covenant "80%" · f_retained "retained earnings" · f_sector "volatile cash flows".

### golden BAD (authoring artefact — `answer_schema._authoring`, NOT served) — designed flags [F1, F5, F4]
> Cobre Pacífico S.A. ("CPSA") is an established Chilean mining-and-metals group listed on the Santiago Stock Exchange. The board is evaluating a large recapitalisation under which CPSA would issue new bonds and use the proceeds to buy back equity.
>
> **Part (i) — MM**
>
> Modigliani and Miller showed that in a world without taxes, capital structure does not matter. However, when taxes exist, debt creates a tax shield which adds value to the firm. The CFO's argument relates to this tax shield. There are also costs of financial distress which must be considered. MM is a theoretical framework that makes many assumptions that do not hold in the real world.
>
> **Part (ii) — Static trade-off**
>
> Static trade-off theory says that firms should balance the benefits of debt against the costs of financial distress. If a firm takes on too much debt, distress costs rise. If debt is too low, the firm does not benefit from the tax shield. There is an optimal point. CPSA needs to consider where this optimal point is. The theory may or may not support the proposed increase in leverage.
>
> **Part (iii) — Pecking order**
>
> Pecking-order theory was developed by Myers and Majluf. It suggests that firms prefer internal financing first, then external debt, and finally equity. This is because of information asymmetry. Firms that have historically used internal finance are consistent with pecking-order theory. The proposed transaction involves issuing bonds. This may be consistent or inconsistent with pecking-order theory depending on circumstances.
>
> **Part (iv) — Agency effects**
>
> Agency theory identifies conflicts between principals and agents. In a levered firm, there can be conflicts between shareholders and bondholders. These include asset substitution and underinvestment problems. Covenants are often used to mitigate these problems. High leverage generally increases agency costs. There are various agency issues that could arise from a recapitalisation of this kind.

*(F1 — para 1 lifts the scenario's opening two sentences verbatim; F5 — every theory recited generically, never anchored to the 27% rate / 80% covenant / retained-earnings history; F4 — "may or may not support" / no overall verdict. The marker scores this below band and raises F1/F5/F4.)*

### hint (served — one-sentence nudge)
> You've marshalled the theory correctly — now check whether each proposition is being applied to CPSA's specific conditions (volatile mining cash flows, the 80% covenant trigger, three decades of retained-earnings financing) or whether your answer could have been written about any firm in any industry.

### full_reveal (served — Ezra teaching reveal)
> The dominant misconception here is SCENARIO-FREE discussion: candidates recite MM, trade-off, pecking-order and agency theory as a textbook list, but never anchor each proposition to the facts CPSA actually presents — the mining-sector cash-flow volatility, the concrete 80% covenant breach, and the firm's documented three-decade internal-funding history. That matters because theory only earns marks at Level 3 when it is used as a diagnostic lens on the scenario; a generic rehearsal of propositions produces a description of theory, not an assessment of CPSA. The correct mental model is to treat each theory as a hypothesis and then test it against the scenario's evidence: MM's tax abstraction is untenable *because* mining cash flows can turn sharply negative, static trade-off is contradicted *because* the covenant trigger is a visible, pre-default distress cost, and pecking-order is violated *because* the transaction retires equity rather than filling a funding gap. The second failure is FENCE-SITTING on the overall verdict: candidates who present "on the one hand / on the other hand" without closing with a board-level recommendation have described the tension but not resolved it — and the command verb "assess" demands a verdict. At the boardroom bar, the CFO needs to know whether to proceed, not a balanced summary of capital-structure literature.

---

## D4 — BSOP conceptual: role of option pricing in valuing equity, debt and default risk (B4d, L2, discursive)

- **id:** `d413fbe7-63f3-492a-af97-8532e0c376c8` · **status:** approved · **published:** true
- **lo_code:** B4d (covers B4d) · **mode:** discursive · **calculation_required:** false · **marks_guide:** 12
- **command_verb:** explain · **rubric_version:** narrative_v1 · **6 criteria / 12 marks**
- **geo:** Indonesia / highly-geared toll-road concession company and its lending banks
- **GATES:** N2 ✓ · N3 ✓ · N5 ✓ · N4-pre ✓ · N1 ✓ · **N4 (Rule-23) ✓** — golden GOOD in band, golden BAD below + raised [F1, F5, F4]. (attempt 3 — N1 caught undeveloped criteria c4 then c5 on earlier attempts; pipeline self-corrected)

### context_text (scenario — all figures are GIVEN; NO BSOP value is computed)
> PT Nusantara Jalan Tol (NJT) is an Indonesian toll-road concession company that operates a 35-year government-awarded concession expiring in 2057. The company is highly geared: its total asset value is currently estimated at IDR 18 trillion, while outstanding debt (a single-tranche bond) requires a bullet repayment of IDR 14 trillion at maturity in five years. NJT's asset-value volatility has been assessed by its financial advisers at 28% per annum. The lending syndicate, led by Bank Mandiri Internasional, is concerned that a prolonged traffic-volume decline could impair NJT's ability to service this debt. Because NJT's equity holders have limited liability, the equity stake can be modelled as a European call option on the firm's assets, struck at the IDR 14 trillion debt repayment, with the five-year horizon as the option's time to expiry.

### question
> Explain the role that an option pricing model, such as the Black-Scholes-Merton (BSOP) model, plays in assessing:
> (i) the value of NJT's equity and the value of its debt; and
> (ii) NJT's default risk and the limitations of this framework for the lending syndicate.

*(Conceptual-only: "explain the role", never "compute". No d1/d2/N(d)/BSOP value is calculated — calc #8 owns that; here the candidate explains what the framework contributes.)*

### model_answer (the golden GOOD — full-marks standard; first line is the area-entry heading)
> **Option pricing models — role in valuing equity, debt and default risk**
>
> **Part (i) — Equity value and debt value**
>
> Because NJT's shareholders benefit from limited liability, their economic position is asymmetric: if, at the end of the five-year bullet horizon, the firm's asset value exceeds the IDR 14 trillion repayment, equity holders capture the surplus; if assets fall short, they surrender the keys and bear no further loss. This asymmetric payoff — uncapped gain, floored loss — mirrors precisely the payoff of a European call option. The BSOP model therefore prices equity as a call on NJT's IDR 18 trillion asset base, struck at IDR 14 trillion. The current positive difference (IDR 4 trillion "moneyness") reflects both intrinsic value and time value arising from the five-year remaining horizon and the 28% asset-value volatility.
>
> Debt valuation follows from put-call parity applied at the firm level. Risky debt equals the present value of riskless debt minus the value of an equivalent put option on the assets. That put quantifies the credit loss Bank Mandiri Internasional's syndicate absorbs if NJT's assets are worth less than IDR 14 trillion at maturity; the model thus converts an otherwise qualitative credit concern into a priced quantity embedded directly in bond value.
>
> **Part (ii) — Default risk and limitations**
>
> The BSOP model signals default risk through the risk-neutral probability N(−d2): the higher the 28% asset-value volatility, the more the asset-value distribution spreads over the five-year horizon, raising the probability that it finishes below IDR 14 trillion. This gives the lending syndicate a forward-looking default metric that responds dynamically to changes in leverage and volatility — unlike backward-looking credit-rating approaches.
>
> A material limitation is the model's log-normal, constant-volatility assumption. NJT's toll revenues are subject to Indonesian regulatory action on the 35-year concession, traffic-policy shifts, and macroeconomic shocks that can produce abrupt, discontinuous asset-value jumps the model cannot price. Standard BSOP will therefore under-price tail risk in precisely the stress scenarios the syndicate most needs to evaluate.
>
> A further limitation concerns input observability. The IDR 18 trillion asset value is itself an estimate, and the 28% figure is derived rather than market-observed. Using equity-volatility proxies introduces estimation error that can materially mis-state N(−d2), distorting the default probability signal on which credit decisions depend.
>
> **Conclusion:** Bank Mandiri Internasional should use the BSOP framework as a structured way to integrate leverage, volatility, and tenor into a single default-risk signal, but must complement it with scenario-based cash-flow stress tests that explicitly model concession-specific discontinuities. Relying on the model alone would be imprudent given its estimation limitations.

### rubric (answer_schema.criteria) — 6 criteria / 12 marks · bands: fail / pass 0.5 / good 0.7 / excellent 0.85

*(FR1: the five explain criteria use `[F1, F5, F6]`; the closing verdict criterion uses `[F4]`. **No F9, no evidence_anchor** — the framework inputs (IDR 18tn / 14tn / 28% / N(−d2)) are GIVEN drivers being INTERPRETED, never computed. F6 catches naming the option analogy without developing why it holds.)*

| id | part | lo | marks | required point (short) | anchors | disqualifiers |
|----|------|----|-------|------------------------|---------|---------------|
| c1 | (i) | B4d | 3 | Limited liability → asymmetric payoff = call option → BSOP prices equity as a call on assets struck at the debt level | f_assets, f_debt | F1, F5, **F6** |
| c2 | (i) | B4d | 2 | Debt = riskless debt − put (put-call parity at firm level); the put = the syndicate's credit loss → priced credit discount | f_debt, f_entity | F1, F5, **F6** |
| c3 | (ii) | B4d | 2 | Default risk = N(−d2); higher 28% vol widens the distribution → higher P(default), a forward-looking metric | f_vol, f_tenor | F1, F5, **F6** |
| c4 | (ii) | B4d | 2 | Limitation: constant-vol log-normal can't price concession/regulatory discontinuous jumps → under-prices tail risk | f_concession | F1, F5, **F6** |
| c5 | (ii) | B4d | 2 | Limitation: asset value + volatility are unobservable estimates; proxy error mis-states N(−d2) | f_assets, f_vol | F1, F5, **F6** |
| c6 | (ii) | B4d | 1 | Verdict: use BSOP as a complement to scenario cash-flow analysis, not a standalone credit tool | f_entity | **F4** |

**scenario_facts** (each `key` verbatim in context_text): f_assets "IDR 18 trillion" · f_debt "IDR 14 trillion" · f_vol "28%" · f_tenor "five-year" · f_entity "Bank Mandiri Internasional" · f_concession "35-year".

### golden BAD (authoring artefact — `answer_schema._authoring`, NOT served) — designed flags [F1, F5, F4]
> PT Nusantara Jalan Tol is an Indonesian toll-road concession company. Its total asset value is currently estimated at IDR 18 trillion, while outstanding debt requires a bullet repayment of IDR 14 trillion at maturity in five years. The BSOP model can be used to value equity and debt.
>
> In the BSOP model, equity is like a call option. If the asset value is high, equity holders benefit. If the asset value is low, debt holders suffer the loss. The model uses inputs such as asset value, exercise price, time, risk-free rate, and volatility to produce an option value.
>
> Debt can also be valued using option pricing. The value of risky debt is equal to riskless debt minus a put option. This is based on put-call parity. The put option represents the potential loss to bondholders.
>
> Default risk is linked to the probability that the firm's assets fall below the debt repayment level. The model produces a probability measure that indicates how likely default is. When volatility is higher, the probability of default increases.
>
> There are limitations to this approach. The model assumes that asset values follow a log-normal distribution and that volatility is constant. These assumptions may not always hold in practice. The firm's asset value may not be directly observable. Volatility estimates may be inaccurate. There could also be jumps or discontinuities in value that the model cannot capture.
>
> The BSOP model is a useful tool but has limitations. It can be used alongside other methods. There are arguments on both sides as to whether it is the best approach for credit analysis. Different analysts may reach different conclusions depending on the inputs used.

*(F1 — para 1 lifts the scenario's figures sentence verbatim; F5 — names the call/put analogy but never anchors to NJT's limited-liability payoff or the syndicate's decision (Bank Mandiri never mentioned); F4 — "arguments on both sides" / no verdict. The marker scores this below band and raises F1/F5/F4.)*

### hint (served — one-sentence nudge)
> You've described the BSOP inputs — now push one level deeper: explain *why* the asymmetric payoff of limited liability maps onto a specific option structure, and then use that structure to tell the lending syndicate what N(−d2) actually signals about NJT's default risk and where the model's constant-volatility assumption is most likely to mislead them given the concession-specific risks in this scenario.

### full_reveal (served — Ezra teaching reveal)
> The typical misconception here is UNDEVELOPED-ASSUMPTION: candidates list the BSOP inputs — asset value, strike, volatility, tenor — and confirm that equity "looks like a call option," but never develop *why* that analogy holds or what it implies for the syndicate's credit decision. The failure is mechanical: naming the structure without explaining the causal logic means the answer stays at level 1 description when the command verb "explain" demands level 2 reasoning. The correct mental model is to trace the limited-liability payoff to its asymmetric consequence — shareholders gain from upside but are floored at zero on the downside — and then show how that asymmetry is *exactly* what an option prices, so BSOP converts a qualitative credit concern into a priced default-risk signal via N(−d2). Limitations must be anchored to the scenario's specific features — regulatory action on the 35-year concession and the derived rather than market-observed volatility figure — because a generic "volatility may change" observation does not survive a boardroom; the syndicate needs to know *which* discontinuities the model is blind to and *why* constant log-normal volatility is structurally unable to price them. The boardroom test here is not "can you name the model?" but "can you tell the lending syndicate where to trust it, where to stress-test beyond it, and why relying on it alone would be imprudent?"

---

## D5 — Exchange controls + international sources of finance (B5c/B5d, L3, discursive)

- **id:** `32ef124c-350e-4fb9-a02f-dd4e8e7f529f` · **status:** approved · **published:** true
- **lo_code:** B5c (covers B5c/B5d) · **mode:** discursive · **calculation_required:** false · **marks_guide:** 15
- **command_verb:** evaluate, assess and recommend · **rubric_version:** narrative_v1 · **8 criteria / 15 marks**
- **geo:** Nigeria / multinational consumer-goods parent with a subsidiary facing capital controls
- **GATES:** N2 ✓ · N3 ✓ · N5 ✓ · N4-pre ✓ · N1 ✓ · **N4 (Rule-23) ✓** — golden GOOD in band, golden BAD below + raised [F1, F5, F4]. (attempt 1; **re-gated clean post-FR3**, see below)

**⚠ FR3 blind GPT round 1 (2026-07-21) — 2 MUST-FIX, both fixed + re-gated:**
1. **Exchange-control overclaim.** The "supplementary strategies" sentence (transfer pricing / management fees / intercompany loan interest) claimed these instruments "move value upstream" as if a clean workaround for the remittance cap, without acknowledging they remain inside Nigeria's exchange-control perimeter. **Fix:** rewritten to the bounded framing — these instruments may reduce reliance on dividend remittances and may avoid the 50% cap if validly documented, but they are mitigation tools, NOT a clean bypass: they can still require CBN approval, face FX availability delays, withholding tax, and transfer-pricing scrutiny. c5's `required_point` re-worded to match; `full_reveal`'s transfer-pricing sentence aligned to the same framing (named as the misconception being taught against).
2. **Eurobond downside omitted from the golden GOOD.** The Eurobond paragraph praised the fixed coupon and no-dilution feature but never connected it back to Part (i)'s own finding — that Nigerian remittances are delayed/trapped. **Fix:** added that the 6.8% coupon is an unconditional USD debt-service obligation that, while Nigerian remittances stay delayed or trapped, must be serviced from Zephyr's OTHER group cash flows rather than ZNL's own — a financial-risk exposure despite the absence of dilution. c6's `required_point` extended to match.

Patch + re-gate script: `scripts/_patch_afm_narrative_fr3.ts` (gitignored). Full-row grep proved zero unqualified "bypass" claims post-patch. **N1–N5 re-run clean, all PASS** (real grader).

### context_text (scenario — all figures are GIVEN; NO blocked-funds NPV is computed)
> Zephyr Consumer Goods plc ("Zephyr"), a multinational headquartered in the Netherlands, operates a wholly-owned subsidiary, Zephyr Nigeria Ltd ("ZNL"), which manufactures and distributes fast-moving consumer goods across West Africa. The Central Bank of Nigeria has imposed strict exchange controls: ZNL may only repatriate dividends equal to 50% of after-tax profits in any calendar year, and all remittances require prior CBN approval, which has averaged a 14-month processing delay in recent years. ZNL's most recent annual after-tax profit is NGN 18 billion, yet Zephyr's treasury estimates that the trapped cash balance — funds that cannot currently be remitted — has accumulated to NGN 42 billion. To fund a planned expansion of its African distribution network, Zephyr's board is considering two international financing options: (a) a Eurobond issuance of USD 300 million at a fixed coupon of 6.8% per annum, and (b) a Global Depository Receipt (GDR) equity issuance targeting institutional investors on the Luxembourg Stock Exchange, expected to raise USD 280 million but subject to disclosure and governance requirements aligned with EU prospectus rules. The board has asked its senior financial adviser to evaluate the significance of Nigeria's exchange controls for the investment decision and assess the two financing alternatives.

### question
> You are the senior financial adviser to the board of Zephyr Consumer Goods plc.
>
> (i) Evaluate the significance of Nigeria's exchange controls for Zephyr's investment decision in ZNL, and assess the strategies available to deal with the restricted remittance of funds from ZNL to the parent.
>
> (ii) Assess the costs and benefits of the two international financing options — the Eurobond and the GDR issuance — and recommend which the board should prefer for funding the African distribution network expansion.

*(Conceptual-only: "evaluate / assess / recommend", never "compute". No blocked-funds NPV is calculated — calc #10 K3 owns that; here the candidate evaluates strategy and significance in words.)*

### model_answer (the golden GOOD — full-marks standard; first line is the area-entry heading)
> **Exchange controls and international sources of finance**
>
> **Part (i) — Significance of exchange controls and remittance strategies**
>
> Nigeria's CBN restricts ZNL to repatriating only 50% of after-tax profits annually, meaning that even though ZNL earns NGN 18 billion per year, the parent's accessible cash yield is structurally capped at roughly half that figure. This is material for investment appraisal: Zephyr must discount only the genuinely repatriable cash flows, not the subsidiary's gross profit, otherwise it will systematically overstate the investment's value.
>
> The 14-month average processing delay worsens this picture further. Even the permitted tranche of remittances arrives late, reducing its present value and creating a timing mismatch between ZNL's cash generation and Zephyr's ability to deploy it — this may force unnecessary external borrowing at the group level in the interim.
>
> The accumulated NGN 42 billion trapped cash balance illustrates the long-run severity of these controls: a stock of value equivalent to more than two years of ZNL's profits is stranded in Nigeria. Inflation and naira depreciation could erode this balance in real, euro-equivalent terms over time, meaning political risk compounds currency risk. Zephyr should factor this erosion risk explicitly into its investment case.
>
> The most practical remittance strategy is to redeploy the NGN 42 billion trapped funds within Nigeria — for instance, financing the local infrastructure of the distribution network expansion — thereby converting idle trapped cash into a productive asset without triggering CBN approval. Supplementary strategies such as intra-group management fees, royalties, or intercompany loan interest may reduce reliance on dividend remittances and may avoid the 50% dividend cap if validly documented, but they do not remove the wider exchange-control risk: they may still require CBN approval, face FX availability delays, withholding tax and transfer-pricing scrutiny. They are mitigation tools, not a clean bypass.
>
> **Part (ii) — Eurobond vs GDR: assessment and recommendation**
>
> The Eurobond at a fixed coupon of 6.8% offers certainty of cost and protects existing shareholders from dilution. However, the coupon is an unconditional USD debt-service obligation: if Nigerian remittances stay delayed or trapped as they are today, that obligation cannot rely on ZNL's cash flows and must instead be serviced from Zephyr's other group cash flows — a financial-risk exposure despite the absence of dilution. For a group already holding NGN 42 billion of trapped equity-equivalent value in Nigeria that it cannot access, adding further equity via a GDR would deepen the disconnect between the group's book equity and its accessible capital — shareholders bear additional dilution for a problem that equity issuance does not solve.
>
> The GDR on the Luxembourg Stock Exchange avoids fixed debt service, which is an advantage in principle, but the EU prospectus disclosure requirements would force Zephyr to publicly detail ZNL's remittance constraints and the trapped-cash balance, creating investor-relations risk and potentially triggering governance scrutiny precisely when the Nigerian situation is already sensitive.
>
> **Recommendation:** The board should proceed with the Eurobond. The 6.8% fixed coupon is serviceable if the distribution network expansion earns a return in excess of that rate, the no-dilution feature protects existing shareholders, and the absence of enhanced public disclosure avoids inflaming investor concern about the CBN restrictions. The GDR is unsuitable given the circumstances: it dilutes equity without addressing the trapped-cash problem and introduces disclosure obligations that heighten, rather than manage, the political-risk exposure.

### rubric (answer_schema.criteria) — 8 criteria / 15 marks · bands: fail / pass 0.5 / good 0.7 / excellent 0.85

*(FR1: interpretation/assessment criteria use `[F1, F5, F6]`; the two strategy/recommendation criteria carrying a verdict use `[F1, F4, F5]`; c5 (a supplementary strategy) uses `[F1, F5]`. **No F9, no evidence_anchor** — conceptual/evaluative only. Part (i) = B5c, Part (ii) = B5d. **FR3:** c5 re-worded to the bounded mitigation framing; c6 extended with the trapped-remittance-linked funding-source risk.)*

| id | part | lo | marks | required point (short) | anchors | disqualifiers |
|----|------|----|-------|------------------------|---------|---------------|
| c1 | (i) | B5c | 2 | 50% cap → parent's accessible yield structurally < ZNL's accounting profit; appraise repatriable cash, not gross | f_remit_cap, f_profit | F1, F5, **F6** |
| c2 | (i) | B5c | 2 | 14-month delay compounds the cap → time-value erosion + parent liquidity risk / unnecessary external borrowing | f_delay, f_remit_cap | F1, F5, **F6** |
| c3 | (i) | B5c | 2 | NGN 42bn trapped = structural blockage; inflation/naira depreciation erodes it → currency risk on top of political risk | f_trapped | F1, F5, **F6** |
| c4 | (i) | B5c | 2 | Strategy: redeploy the NGN 42bn productively within Nigeria (fund the local leg) → avoid controls, no CBN approval | f_trapped | F1, F5, **F4** |
| c5 | (i) | B5c | 1 | Strategy: transfer pricing (mgmt fees/royalties/loan interest) mitigates reliance on remittances — NOT a clean bypass, still subject to CBN approval + FX delay + WHT + arm's-length scrutiny | f_remit_cap | F1, F5 |
| c6 | (ii) | B5d | 2 | Eurobond: fixed 6.8% predictable + no dilution, but an unconditional USD obligation serviced from OTHER group cash flows if ZNL's remain trapped → financial risk | f_eurobond | F1, F5, **F6** |
| c7 | (ii) | B5d | 2 | GDR: no fixed coupon but dilutive + EU-prospectus disclosure exposes ZNL's trapped-cash/CBN problems to scrutiny | f_gdr, f_gdr_disclosure | F1, F5, **F6** |
| c8 | (ii) | B5d | 2 | Recommendation: prefer the Eurobond — group already equity-rich-but-trapped in Nigeria; GDR dilutes without solving the blockage | f_trapped, f_eurobond | F1, **F4**, F5 |

**scenario_facts** (each `key` verbatim in context_text): f_remit_cap "50%" · f_delay "14-month" · f_profit "NGN 18 billion" · f_trapped "NGN 42 billion" · f_eurobond "6.8%" · f_gdr "Luxembourg Stock Exchange" · f_gdr_disclosure "EU prospectus".

### golden BAD (authoring artefact — `answer_schema._authoring`, NOT served) — designed flags [F1, F5, F4]
> Exchange controls are restrictions imposed by a country's government on the ability of companies to transfer money in and out of the country. The Central Bank of Nigeria has imposed strict exchange controls, and ZNL may only repatriate dividends equal to 50% of after-tax profits in any calendar year. This limits the amount of money that Zephyr can receive from ZNL.
>
> Exchange controls are significant for investment decisions because they affect cash flows. If a company cannot remit funds freely, it may not be able to recover its investment. There are several strategies available to deal with restricted remittance. One is to use transfer pricing. Another is to pay management fees. Another is to use royalties. These all allow funds to flow between companies in different countries.
>
> Regarding the two financing options, a Eurobond is a bond issued in a currency other than that of the country where it is issued. It offers a fixed rate of interest. A GDR is a certificate that represents shares in a foreign company. It can be listed on a stock exchange. The Eurobond has a fixed coupon and no dilution. The GDR does not have fixed coupon payments and can be listed on an exchange. Both options have advantages and disadvantages and different companies may prefer different options depending on their circumstances. There are many factors to consider when choosing between debt and equity financing in international markets.

*(F1 — para 1 lifts the scenario's 50%-cap sentence verbatim; F5 — generic definitions never anchored to the NGN 42bn trapped balance, the 14-month delay or the Luxembourg prospectus; F4 — "different companies may prefer different options" / no recommendation. The marker scores this below band and raises F1/F5/F4.)*

### hint (served — one-sentence nudge)
> Before you can recommend the Eurobond or GDR, check whether your Part (i) analysis has distinguished between ZNL's gross profit and the genuinely repatriable cash flows — because the remittance cap and the trapped-cash balance each affect a different part of the financing argument, and conflating them will leave the recommendation hanging in mid-air.

### full_reveal (served — Ezra teaching reveal)
> The dominant misconception here is FENCE-SITTING combined with UNDEVELOPED-ASSUMPTION: candidates list the exchange-control features and the two financing instruments, but never weigh the scenario-specific facts against each other to arrive at a board-ready verdict. This is wrong not because lists are useless, but because a list of features carries zero decision weight — the board cannot act on "the GDR avoids fixed debt service" without knowing whether that benefit survives the disclosure obligation and the trapped-cash dynamic that equity issuance cannot resolve. The correct mental model is to treat each scenario fact as a constraint that either disqualifies or qualifies an option: the CBN repatriation cap is not background colour, it is a filter that changes the value of equity-based financing relative to debt-based financing in this specific situation. On the remittance strategies in Part (i), a further UNDEVELOPED-ASSUMPTION failure appears when candidates name "transfer pricing mechanisms" or "management fees" as if they cleanly bypass the exchange controls — CBN approval requirements, FX availability delays, withholding tax and arm's-length transfer-pricing scrutiny are the binding constraints that determine whether those strategies are genuinely viable mitigation tools rather than a clean workaround, and leaving them undeveloped converts a Level 3 analytical point into a Level 1 bullet. The boardroom test is simple: if your answer could apply to any multinational with any exchange control regime, you have not yet used the scenario — Zephyr's 14-month delay, the NGN 42 billion trapped balance, and the Luxembourg prospectus requirement are the facts that earn the marks, and only a recommendation that explicitly reconciles them survives the boardroom.

---

## BATCH RECONCILE (at generation close)

- **Discursive AFM rows: 6** = **5 narrative drills, now LIVE** (D1 `cb9b411c` · D2 `08044fb6` · D3 `fda46d99` · D4 `d413fbe7` · D5 `32ef124c`) + **parked A3a `47c9d5ce`** (untouched, the expected 6th, pre-existing).
- All five carry `rubric_version: narrative_v1`, `mode: discursive`, `calculation_required: false`; every rubric is FR1-clean (no F9, no `evidence_anchor`; interpretation/assessment criteria `[F1,F5,F6]`; recommendation/verdict criteria carry F4).
- Area-entry headings for D1–D5 ranked 60–64 in `lib/acca/area-entry.ts` (above every calculator ≤ 53 — a narrative drill is never an area entry); verified live post-flip via `pickEntryDrill` — every area's zero-attempt entry still resolves to its calculator (NPV/CAPM/FCFE/international-NPV), never a narrative heading.
- **FR2 co-founder adjudication CLOSED (2026-07-21):** D1/D4/D5 clean passes, zero changes. D2 `08044fb6` — 1 BLOCKING (false IFRS 16 off-balance-sheet claim → corrected to the covenant-measure mechanism) + KES 8.4bn→26bn (all surfaces) + c5 part-tag fix ("(v)" invented → "justified recommendation (per the stem)"). D3 `fda46d99` — 2 prose accepts (pecking-order over-claim deleted; agency paragraph made two-sided via Jensen FCF-discipline, reject verdict unchanged). Both re-gated N1–N5 clean via the real grader (`scripts/_patch_afm_narrative_fr2.ts`, gitignored). Full-row prove-negative confirmed zero residue (the calc #3 full-row-sweep lesson applied: grep the whole row, not just the edited paragraph).
- **FR3 blind GPT round 1 CLOSED (2026-07-21): 4 accepts / 0 rejects.** D1/D4 (implicitly, no findings raised) clean. D5 `32ef124c` — 2 MUST-FIX: the transfer-pricing/management-fees supplementary strategy overclaimed a "bypass" of the CBN dividend cap (rewritten to a bounded mitigation-tool framing — still subject to CBN approval/FX delay/WHT/transfer-pricing scrutiny, c5 + full_reveal aligned); the Eurobond paragraph in the golden GOOD omitted that the coupon is an unconditional USD obligation serviced from OTHER group cash flows while ZNL's remittances stay trapped (added, c6 extended to match). D3 `fda46d99` — 1 polish: the unconditional "equity buyback concentrates control" claim made conditional on free float/monitoring; the lender–equity conflict at the 80% covenant trigger named as the clearer agency issue (c4 re-worded, reject verdict unchanged). D2 `08044fb6` — 1 minor sweep, VERIFIED CLEAN (no "ICMA certification" phrasing found; GBP-alignment framing only; no edit). D5 + D3 re-gated N1–N5 clean via the real grader (`scripts/_patch_afm_narrative_fr3.ts`, gitignored). Full-row prove-negative confirmed zero unqualified-bypass residue.
- **GATE-P FLIP CLOSED (2026-07-21, Grant-ruled).** Reconcile-before-flip: pre published AFM = 41, approved-unpublished = 0, discursive candidates = exactly 6 (the 5 narrative ids + parked A3a) — clean, no mismatch. Guarded explicit-id flip (`scripts/_flip_narrative_cluster.ts`: the 5 ids IN + `status='candidate'` + `paper_code='AFM'` guard; parked A3a not enumerated, untouchable by construction) → all 5 `approved`/`published=true`. **POST: published AFM = 46**, candidates = 1 (parked A3a only), approved-unpublished = 0, all 5 confirmed approved+published, A3a confirmed untouched. Browse deltas: B1:12→13, B3:15→17, B4:6→7, B5:3→4 (B2 unchanged — no B2 narrative in this cluster). Both `docs/AFM_COVERAGE_CONTRACT.md` status lines synced.

**NEXT:** the narrative cluster's student walk — the tier's one remaining exit criterion before the B-section-live CLAIM + ads trigger unlock (provenance gate, design §7). Content is shipped; the walk is what's gating.
