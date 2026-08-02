# AFM PS-cell narrative batch — review pack (pipeline #2, discursive)

**3 discursive drills, `paper_code=AFM`, `mode=discursive`, `rubric_version=narrative_v1`, `status=candidate`/`published=false`. GATED 2026-08-02 (all N1–N5 green on the REAL constrained grader + P4/P7 lints). The THIRD narrative cluster, after B-section D1–D5 and the E-section EN1–EN3.**

| id | lo_code | drill | skill | marks | criteria | F10 marks | rank | designed BAD |
|---|---|---|---|---|---|---|---|---|
| `1030689b-2cad-4009-b07c-e1753a901071` | E2a | D6 — testing a "fully hedged" claim | **scepticism** | 12 | 5 | 12/12 | 83 | [F1, F5, F4] |
| `68a297a3-3c6f-4ed8-a110-2b152234e96b` | E2c | D7 — does a netting centre earn its cost | **commercial_acumen** | 12 | 6 | 8/12 | 84 | [F1, F5, F4] |
| `f6426c06-de4a-48a0-a7ca-60c717c3945d` | B1b | D8 — challenging a simulation's assumptions | **scepticism** | 12 | 5 | 6/12 | 65 | [F1, F5, F4] |

## WHY THESE THREE, AND WHY NOT SEVEN

Authored into named **(area × skill) cells the live corpus could not serve**, measured 2026-08-02 against what AFM content actually EXAMINES — Mock 1's 8 requirements plus the 5 published practice cases' `professional_skill_tags`, 17 distinct cells over 20 requirements. Seven cells were unservable. These are the three with the highest examined marks at stake:

| cell | examined marks | examined by |
|---|---|---|
| **E2 × scepticism** | 23 | Solenne (iii) E2b 8 · Aldebrino (ii) E2a 8 · Kestrel (ii) E2a 7 |
| **E2 × commercial_acumen** | 15 | Aldebrino (ii) E2a 8 · Kestrel (ii) E2a 7 |
| **B1 × scepticism** | 15 | Brecon (ii) B1b 8 · Halvard (ii) B1b 7 |

Four cells remain deliberately unauthored — **B5 × communication** (16 marks), **E3 × scepticism** (12), **E1 × analysis_and_evaluation** (7), **A3 × communication** (6). Three first, to prove the seam fix produces rubrics that DEMAND the declared skill rather than mentioning it, before committing to the rest.

## THE SEAM THIS BATCH EXISTS TO TEST

Until 2026-08-02, `plan.skill` reached the DB column and the pass-2 Ezra reveal and **nothing else**. `buildNarrativeUserPrompt` — the call that writes the criteria, the disqualifiers and both golden answers — was never told which skill the drill existed to exercise. Declaring `skill: 'scepticism'` did not make the rubric demand scepticism; only whatever the author happened to write in `brief` did. **Declared tag and rubric were never connected.**

Fixed per **P-T2** (change the instruction, do not add a prohibition). The instruction already winning was the tool schema's `required_point` = *"the point a full-marks answer makes — specific, developed, applied to the scenario"*, which reliably yields criteria ABOUT the topic — earnable without ever performing the skill's act. So the DEMAND ITSELF was redefined per skill (`SKILL_DEMAND`): the ACCA sub-descriptors verbatim, plus a house-authored ACT (what a `required_point` must require) and a SCENARIO PRECONDITION (what the scenario must contain for the act to be possible at all). Nothing was forbidden.

**Measured discriminator, stated with its denominator (P-G2).** F10 ("no scepticism / commercial acumen") is instructed only by the new block. Across the **8** pre-fix narrative rows — the full `mode='discursive'` AFM population carrying a `narrative_v1` rubric; the 9th discursive row, candidate `47c9d5ce` A3a, has no `criteria` and is outside the population — **0 of 8** carry F10 on any criterion, *including the two already tagged `scepticism` and the four tagged `commercial_acumen`*. The three drills here carry it on 26 of 36 marks.

## ⛔ CLOSED RULINGS — do NOT re-raise

**Carried forward (still binding):**
- **CLAIM CEILING.** Never "code owns the marks" for narrative — the per-criterion quality verdict is model-graded, kept honest by the Rule-23 (N4) verifier-of-the-verifier.
- **CONCEPTUAL-ONLY.** A narrative drill NEVER computes, and no criterion credits a computed figure. D6 does not price a hedge (calc #11); D8 does not compute VaR (calc #3); D7 does not build a netting matrix.
- **`rubric_version: 'narrative_v1'`** stamped; golden BAD + designed flags under `answer_schema._authoring` (never served); golden GOOD **is** `model_answer` (heading + reveal). No new DB column.
- **Designed BAD flags stay the deterministic `[F1, F5, F4]` backbone.** F10 is the cited MARKING BASIS on the skill-carrying criteria but is **not** in the designed-flag set: `N4-pre` can prove F1/F4/F5 raiseable deterministically (copy-overlap, no-conclusion, omitted anchor) and can only fall back to "a criterion lists it" for F10. Same compromise the E-narrative cluster recorded for F7/F2 — documented, not silently dropped.
- **No `evidence_anchor`** on this batch (the D1–D5 convention, not the EN1–EN3 deviation). These cells were chosen by measurement against live content, not by examiner-report citation; claiming per-criterion provenance would overstate what was done.

**NEW, banked here:**

1. **⚠️ A DERIVABLE MULTI-STEP CHAIN IN A CONCEPTUAL DRILL IS UNGATED BY CONSTRUCTION. D7's first version passed all six gates asserting the exact opposite of its own figures.** Its scenario gave the raw drivers (240 invoices × USD 180,000, a 0.45% per-settlement cost, a 62% volume reduction, USD 190,000 running cost, USD 280,000 set-up, an 18-month board threshold) and let the author characterise the result. The rubric required the candidate to conclude payback was *"achievable well within 18 months"* and that the board *"should proceed"*. **The true figures give an annual net benefit of −USD 69,472 and no payback at all** — the centre loses money every year. N1 and N4 grade rubric coverage and GOOD-vs-BAD separation; the prompt's COHERENCE rule covers only STATISTICAL shape claims (fat tails, skew, VaR-as-threshold); and **the narrative pipeline has no numeric verifier — that moat belongs to the calculator families.** Nothing in the stack was looking. Caught by hand, pre-insert.
   **The fix is structural, not a warning:** D7's brief now requires the scenario to STATE the annual net saving, the set-up cost and the resulting payback AS GIVEN treasury-analysis outputs, and forbids supplying the raw drivers they came from. The derivation chain is removed, leaving **one division** (`set-up ÷ annual net saving`) for a human to check before insert. Verified: 4.55m ÷ 2.1m = **26.00 months**, stated 26, threshold 24 — internally consistent, and the centre MISSES the board's hurdle by two months, which is what makes the judgement real.
   **Generalise before the next batch:** any commercial_acumen drill priced with constraints carries this hazard. Either state the outcome as given (as here), or accept that a human must recompute pre-insert. Do not assume the gates cover it.

2. **F10 cannot distinguish scepticism from commercial_acumen.** It is a SINGLE failure mode covering both skills ("no scepticism/commercial acumen"). Its presence proves a skill was named as the marking basis; it can never prove *which* of the two. Any future gate built on F10 must state that ceiling.

3. **The two E2 drills sit in a shared area bucket with the fxhedge calculator and must clear the WHOLE E-calculator span.** Ranked 83/84 — above fxhedge's 70–73 *and* irhedge's 74–77. A rank of 75 would pass a "beats fxhedge" check and still be wrong. Fixtured explicitly (`test-area-entry.ts`), on real mixed data, and the ranks are verified against the drills' actual stored `model_answer` headings, not against fixture strings.

4. **🔸 SOFT CALL — D7 `c2` steers the recommendation's direction.** It requires committing to "proceed with a board-sanctioned exception or revisit the threshold" on the strength of a material recurring saving against a two-month overrun. A candidate who recommends rejection on the strict CFO rule is making a defensible commercial judgement and would score poorly. Flagged rather than fixed: the criterion demands a commitment, which is the act, but it also names a side. If a reviewer disagrees, the fix is to reword `c2` to credit EITHER committed direction with a stated basis.

5. **D8 shares B1b with D1 and is deliberately a different act.** D1 (`cb9b411c`, analysis_and_evaluation) INTERPRETS a given simulation output; D8 CHALLENGES its credibility — the calibration window, the independence assumption, and the sponsor's reading of VaR as a worst case. Same LO, different demand: that is precisely the a_and_e/scepticism split the cell measures. Headings are distinct strings and rank 60 vs 65, fixtured against silent rank collision.

## WHAT IS NOT PROVEN

- **No student has seen these.** All three are `candidate`/`published=false`. AFM's published set is unchanged at **57**.
- **Nothing gates skill↔rubric agreement.** F10 coverage is now instructed and observed, but no check enforces it; a future batch could drop back to 0/8 silently. See the deterministic-gate analysis in `AFM_SURFACED.md`.
- **The three rubrics were read, not marked.** Whether each `required_point` truly cannot be earned without the act is a judgement made by a reader (recorded per drill below), not a measurement.
- **`runNarrativeBatch`'s corrected insert path had never written a row before today.** These three are its first.

---

*(Per-drill bodies below are generated from the captured dry-run drafts — `docs/rollbacks/AFM_narrative_draft_D{6,7,8}.json` — which are the exact bytes inserted via `--narrative-insert-from`. Reviewed content and stored content are the same artefact.)*

---

## D6 — E2a · **scepticism** · `1030689b-2cad-4009-b07c-e1753a901071`
- LO E2a · L3 · command_verb "assess and conclude" · 12 marks · AREA_ENTRY_RANK **83**
- **GATES (real grader):** N2 scenario-anchor (facts in scenario + used in reveal) ✓ · N3 generic/copy lint (reveal not scenario-restating) ✓ · N5 committed-verdict/structure ✓ · N4-pre designed-flag raiseability (F1,F5,F4) ✓ · N1 rubric-coverage (reveal = full marks; every part mapped) ✓ · N4 Rule-23 (GOOD in band, BAD below + designed F-modes raised) ✓ — plus P4 jurisdiction/frozen-facts ✓ and P7 misconception-lead ✓ (both block the insert on failure).
- **F10 marking basis:** c1, c2, c3, c4, c5 = **12/12 marks**

**context_text:** Siam Axle Components PCL ("SAC"), headquartered in Bangkok, Thailand, manufactures precision drivetrain parts for global automotive assemblers. SAC exports approximately 80% of its output, invoiced in US dollars, to assembly plants in North America and Europe. SAC's Group Treasurer, Ms. Pornpan Ratanasuwan, told the board last quarter: "We are fully hedged against currency risk — our policy is to forward-cover 100% of contracted USD receivables for the next 90 days." SAC's German competitor, Dreifach GmbH, prices identical components in euros, meaning that when the euro strengthens against the USD, Dreifach can undercut SAC on euro-denominated bids without changing its euro price. SAC's manufacturing cost base is denominated entirely in Thai baht, while all revenue is in USD, so any sustained USD/THB depreciation structurally erodes operating margins over multi-year horizons. Finally, SAC holds a wholly-owned subsidiary in Vietnam (Siam Axle Vietnam Co. Ltd., "SAV"), whose net assets of VND 420 billion are consolidated into SAC's Thai-baht group accounts; at each reporting date, the THB/VND exchange rate determines how those assets translate into the group balance sheet.

**question:** Assess Ms. Ratanasuwan's claim that SAC is "fully hedged against currency risk." In your answer:
(i) Identify which type(s) of currency exposure her stated policy actually addresses, and evaluate how completely it does so.
(ii) Identify and explain the currency exposures that her policy leaves unaddressed, drawing on the specific circumstances of SAC.
(iii) Conclude on the extent to which the board should rely on her claim, and what additional risk-management actions, if any, are warranted.

**scenario_facts:**

| id | kind | key (verbatim in context_text) |
|---|---|---|
| `f_treasurer` | entity | `fully hedged` |
| `f_policy` | constraint | `100% of contracted USD receivables` |
| `f_competitor` | entity | `Dreifach GmbH` |
| `f_costbase` | constraint | `Thai baht` |
| `f_subsidiary` | figure | `VND 420 billion` |

**criteria (5 / 12 marks):**

**`c1` — 2 marks** · part: *(i) Exposure the policy addresses and how completely* · anchors: `f_policy`, `f_treasurer` · disqualifiers: **[F1, F5, F10]** · developed: true
> The 90-day forward-cover programme addresses transaction exposure — the risk that already-contracted USD receivables lose baht value before settlement — but the word 'contracted' is itself a limitation: uncontracted or pipeline orders beyond 90 days receive no cover, so the policy protects only a narrow slice of SAC's total USD revenue stream, not the full currency risk as claimed.

**`c2` — 3 marks** · part: *(ii) Exposures the policy leaves unaddressed* · anchors: `f_costbase`, `f_treasurer` · disqualifiers: **[F1, F5, F10]** · developed: true
> The policy is entirely silent on economic (operating) exposure. Because SAC's cost base is entirely in Thai baht while all revenue is in USD, a sustained USD/THB depreciation permanently compresses operating margins in a way no short-dated forward programme can repair; Ms. Ratanasuwan's claim of being 'fully hedged' cannot survive this structural mismatch, which can only be addressed through operational responses such as THB-cost reduction, USD-denominated sourcing, or price renegotiation.

**`c3` — 2 marks** · part: *(ii) Exposures the policy leaves unaddressed* · anchors: `f_competitor`, `f_treasurer` · disqualifiers: **[F1, F5, F10]** · developed: true
> Economic exposure also encompasses competitive (strategic) exposure: Dreifach GmbH prices in euros, so EUR/USD movements alter relative competitiveness on euro-denominated bids independently of anything in SAC's forward programme; the treasurer's claim is therefore wrong on a second dimension — a 90-day USD forward hedge does nothing to protect SAC's market share when the euro moves against the dollar.

**`c4` — 2 marks** · part: *(ii) Exposures the policy leaves unaddressed* · anchors: `f_subsidiary`, `f_treasurer` · disqualifiers: **[F1, F5, F10]** · developed: true
> Translation exposure on SAV's VND 420 billion net assets is also entirely unaddressed: each time the THB/VND rate moves at a reporting date, the consolidated group balance sheet absorbs a gain or loss through other comprehensive income, affecting reported equity and potentially key financial ratios used by lenders or investors — yet the treasurer's 'fully hedged' assertion makes no reference to this balance-sheet risk.

**`c5` — 3 marks** · part: *(iii) Board reliance and recommended actions* · anchors: `f_treasurer`, `f_policy`, `f_subsidiary`, `f_costbase` · disqualifiers: **[F1, F4, F5, F10]** · developed: true
> The board should not accept the 'fully hedged' claim at face value: the policy mitigates one narrow category of risk (near-term transaction exposure on contracted flows) while leaving economic and translation exposure entirely open. SAC should at minimum adopt a longer hedging horizon for anticipated (not just contracted) USD receipts, explore operational hedges for baht-cost/USD-revenue mismatch, and consider a balance-sheet hedge (e.g. VND borrowing in SAV or a cross-currency swap) to mitigate SAV's translation exposure — treating the 90-day forward programme as a necessary but far from sufficient element of a comprehensive currency risk framework.

**bands (code-owned):** fail ≥0% · pass ≥50% · good ≥70% · excellent ≥85%

**GOLDEN GOOD (`model_answer`, heading + reveal):**

> **Foreign-exchange exposure — testing a claim that the group is fully hedged**
> 
> **Part (i) — What the policy covers**
> 
> Ms. Ratanasuwan's forward programme targets transaction exposure: the risk that contracted USD receivables settle at a worse THB rate than when they were booked. Locking in 100% of contracted USD receivables for 90 days does eliminate that specific settlement risk on those specific flows. However, "contracted" is a material qualifier — anticipated orders beyond the 90-day window, and any revenue not yet under signed contract, receive zero protection. The policy therefore addresses a subset of transaction exposure, not the totality of SAC's currency risk, making the phrase "fully hedged" misleading from the outset.
> 
> **Part (ii) — What the policy leaves open**
> 
> The most structurally significant gap is economic exposure. Because SAC's entire cost base is denominated in Thai baht while all revenue is in USD, a sustained USD/THB depreciation erodes operating margins permanently across multi-year horizons — a dynamic that no 90-day forward roll can cure. Ms. Ratanasuwan's claim is therefore demonstrably wrong: no short-dated transaction hedge addresses this long-run structural mismatch.
> 
> A second dimension of economic exposure arises from competitive positioning. Dreifach GmbH prices its identical components in euros; when the euro strengthens against the USD, Dreifach can lower its USD-equivalent price without touching its euro margin, undercutting SAC on bids. SAC's 90-day USD forward does nothing to neutralise this relative-price effect — a risk entirely absent from the treasurer's framing.
> 
> Finally, SAV's VND 420 billion net assets sit in the consolidated group accounts. At each reporting date, THB/VND movements feed directly into other comprehensive income, shifting reported equity and potentially breaching debt covenant ratios — yet the forward programme contains no balance-sheet hedge to offset this translation exposure.
> 
> **Part (iii) — Board conclusion and recommended actions**
> 
> The board should reject the "fully hedged" characterisation as materially incomplete. SAC should extend its hedging horizon to cover anticipated (not merely contracted) USD revenues, investigate operational responses — USD-denominated input sourcing, baht-cost efficiencies, or invoicing flexibility — to address the Thai baht cost/USD revenue mismatch, and implement a translation hedge (VND borrowing within SAV or a cross-currency swap) against SAV's VND 420 billion net asset exposure. The 90-day forward programme is necessary but far from sufficient; the board must commission a comprehensive currency risk review before relying on the treasurer's assertion.

**GOLDEN BAD (`answer_schema._authoring.golden_bad` — never served)** · designed flags **[F1, F5, F4]**:

> Ms. Ratanasuwan has stated that SAC is "fully hedged against currency risk," backed by a policy covering 100% of contracted USD receivables for the next 90 days. This type of hedging is forward cover, which is a common tool used by exporters to protect against adverse movements in exchange rates. Forward contracts lock in a rate today for a future settlement, thereby eliminating uncertainty on the covered cash flows.
> 
> Transaction exposure arises when a company has receivables or payables in a foreign currency. By using forward contracts, companies can protect themselves against the risk that exchange rates will move adversely before the transaction settles. This is a well-understood technique in treasury management and is widely recommended as best practice for exporters.
> 
> Translation exposure occurs when a parent company consolidates foreign subsidiaries and the exchange rate affects reported figures. Companies with overseas subsidiaries face the risk that their balance sheet values change due to exchange rate movements. There are various ways to manage this exposure, including taking out loans in the foreign currency or using cross-currency swaps.
> 
> Economic exposure is the long-term impact of exchange rate movements on a firm's competitive position and future cash flows. It is sometimes called operating exposure and is more difficult to hedge using financial instruments. Operational hedges, such as matching revenues and costs in the same currency, are generally considered more effective for managing economic exposure.
> 
> There are therefore three main types of currency exposure: transaction, translation, and economic. Each has different characteristics and requires different management approaches. Whether a company is adequately hedged depends on the nature and extent of its currency risks across all three categories, and the extent to which its policies address each one.

**hint:** Your answer identifies what the forward programme covers, but ask yourself whether transaction exposure on contracted receivables is the only type of currency risk SAC faces — specifically, what does a 90-day forward do to a structural mismatch between a baht cost base and USD revenues, or to the VND net assets sitting on the consolidated balance sheet?

**full_reveal:** The classic misconception here is SCENARIO-FREE discussion: candidates produce a generic list of "types of currency exposure" — transaction, translation, economic — without anchoring each one to SAC's specific circumstances, so the answer reads like a textbook glossary rather than a boardroom assessment. That thinking produces the wrong conclusion because naming the exposure types earns nothing on its own; the marks flow from showing why SAC's particular cost structure, competitive landscape, and consolidated subsidiary create gaps that the treasurer's 90-day forward programme cannot close. The correct mental model is prosecutorial: treat Ms. Ratanasuwan's claim as a proposition to be stress-tested against each exposure dimension in turn — what does the policy actually fix, what does it structurally leave open, and why does that matter to this board? The third part of the question is where FENCE-SITTING also tends to appear: candidates hedge their conclusion with "the policy is partially effective," stopping short of the explicit verdict the command verb "conclude" demands — the board needs to hear whether the "fully hedged" characterisation should be accepted, qualified, or rejected, and what action follows.

---

## D7 — E2c · **commercial_acumen** · `68a297a3-3c6f-4ed8-a110-2b152234e96b`
- LO E2c · L3 · command_verb "evaluate, explain, advise, assess" · 12 marks · AREA_ENTRY_RANK **84**
- **GATES (real grader):** N2 scenario-anchor (facts in scenario + used in reveal) ✓ · N3 generic/copy lint (reveal not scenario-restating) ✓ · N5 committed-verdict/structure ✓ · N4-pre designed-flag raiseability (F1,F5,F4) ✓ · N1 rubric-coverage (reveal = full marks; every part mapped) ✓ · N4 Rule-23 (GOOD in band, BAD below + designed F-modes raised) ✓ — plus P4 jurisdiction/frozen-facts ✓ and P7 misconception-lead ✓ (both block the insert on failure).
- **F10 marking basis:** c2, c4, c5, c6 = **8/12 marks**

**context_text:** Mineros del Pacífico S.A. ("MdP") is a Chilean mining-services group with five trading subsidiaries: MdP-Chile (CLP), MdP-Peru (PEN), MdP-Brazil (BRL), MdP-South Africa (ZAR), and MdP-Morocco (MAD). The group's treasury has completed an analysis of establishing a multilateral netting centre in Santiago. The analysis concludes that, after all running costs, the netting centre would generate an annual net saving of USD 2.1 million. The one-off set-up cost is estimated at USD 4.55 million, yielding a payback period of 26 months. The board has stated that any new treasury initiative must achieve payback within 24 months; that threshold was set by the CFO as the maximum acceptable recovery period in light of the current capital-expenditure cycle. MdP-Morocco operates under Moroccan exchange-control regulations (Office des Changes rules) that prohibit subsidiaries from pooling or netting foreign-currency receivables and payables through an offshore centre; MdP-Morocco cannot legally participate in the netting arrangement. The board has also imposed a no-new-headcount constraint, meaning the netting centre must be staffed entirely by redeploying existing treasury personnel.

**question:** As senior financial adviser to the board of Mineros del Pacífico S.A., advise the board on the following:

(i) Evaluate whether the netting centre should be approved, having regard to the given financial outputs and the board's stated payback threshold.

(ii) Explain the implications of MdP-Morocco's exchange-control position and advise how the group should manage its Moroccan subsidiary's exposures in the absence of netting.

(iii) Assess the commercial significance of the no-new-headcount constraint for the viability of the netting centre.

**scenario_facts:**

| id | kind | key (verbatim in context_text) |
|---|---|---|
| `f_saving` | figure | `USD 2.1 million` |
| `f_setup` | figure | `USD 4.55 million` |
| `f_payback` | figure | `26 months` |
| `f_threshold` | constraint | `24 months` |
| `f_morocco` | constraint | `Office des Changes` |
| `f_headcount` | constraint | `no-new-headcount` |

**criteria (6 / 12 marks):**

**`c1` — 2 marks** · part: *(i) evaluate whether to approve the netting centre* · anchors: `f_payback`, `f_threshold` · disqualifiers: **[F1, F5, F6]** · developed: true
> The 26-month payback exceeds the board's 24-month threshold by two months, so on a strict reading of the CFO's rule the proposal fails the board's own hurdle — the candidate must name this gap explicitly and recognise it as the pivotal commercial tension, not a rounding artefact.

**`c2` — 3 marks** · part: *(i) evaluate whether to approve the netting centre* · anchors: `f_saving`, `f_payback`, `f_threshold` · disqualifiers: **[F4, F5, F10]** · developed: true
> Despite failing the threshold, the board should seek a waiver or re-examine assumptions rather than reject outright, because the USD 2.1 million annual net saving is material and the two-month overrun is small relative to the saving's multi-year stream — the commercial cost of non-participation is the permanent forfeiture of a recurring USD 2.1 million benefit. The candidate must commit to a recommendation (proceed with a board-sanctioned exception or revisit the threshold) rather than deferring the decision.

**`c3` — 2 marks** · part: *(ii) implications of MdP-Morocco exchange controls and how to manage Moroccan exposures* · anchors: `f_morocco` · disqualifiers: **[F1, F5, F6]** · developed: true
> The Office des Changes rules are a market barrier to the free movement of capital that legally prevents MdP-Morocco from pooling its MAD receivables and payables through Santiago; the group cannot aggregate or offset MdP-Morocco's positions within the netting matrix and must manage that subsidiary's exposures bilaterally.

**`c4` — 2 marks** · part: *(ii) implications of MdP-Morocco exchange controls and how to manage Moroccan exposures* · anchors: `f_morocco` · disqualifiers: **[F2, F5, F10]** · developed: true
> For MdP-Morocco's residual exposures the group should use bilateral matching — netting MAD inflows against MAD outflows within MdP-Morocco itself before any cross-border settlement — and supplement with on-shore forward contracts or currency options available in Morocco, keeping all hedging instruments compliant with Office des Changes rules so as to avoid regulatory censure and fines that would erode the savings achieved by the wider netting centre.

**`c5` — 2 marks** · part: *(iii) commercial significance of the no-new-headcount constraint* · anchors: `f_headcount`, `f_saving`, `f_setup` · disqualifiers: **[F2, F5, F10]** · developed: true
> The no-new-headcount constraint means the USD 4.55 million set-up cost and the running cost savings embedded in the USD 2.1 million net saving figure already assume redeployment; if existing treasury staff cannot absorb the additional operational load without degrading their current duties, the real running costs will rise above those assumed, the net saving will fall below USD 2.1 million, and the 26-month payback will lengthen further beyond the 24-month threshold — making the constraint a direct threat to the financial case, not merely an HR policy matter.

**`c6` — 1 marks** · part: *(iii) commercial significance of the no-new-headcount constraint* · anchors: `f_headcount` · disqualifiers: **[F4, F10]** · developed: true
> The board should require the CFO to confirm that existing personnel have sufficient capacity and that the redeployment plan will not create control weaknesses or increase operational risk in other treasury functions — if it cannot be confirmed, the no-new-headcount constraint should be relaxed or the proposal deferred, because launching a netting centre with an under-resourced team would expose MdP to settlement errors and compliance failures that negate the cost savings.

**bands (code-owned):** fail ≥0% · pass ≥50% · good ≥70% · excellent ≥85%

**GOLDEN GOOD (`model_answer`, heading + reveal):**

> **Netting and matching — whether a group netting arrangement earns its cost**
> 
> **Part (i) — Approve or reject the netting centre?**
> 
> The treasury analysis delivers a payback period of 26 months, which overshoots the CFO's stated ceiling of 24 months by two months. On a mechanical application of the board's rule the proposal fails its own hurdle. However, rejecting it on that basis alone would be commercially short-sighted. The annual net saving of USD 2.1 million is a recurring benefit; over a five-year horizon the centre generates roughly USD 10.5 million of value against the USD 4.55 million set-up cost — a highly positive return. The two-month breach is material only if the 24-month threshold is treated as immovable. Given that the gap is narrow and the long-run benefit is substantial, I recommend that the board approve the centre on the basis of a formally documented exception to the payback threshold, with the CFO's sign-off. Alternatively, if any assumption in the analysis is conservative (for example, if four rather than five subsidiaries are actively modelled), revisiting the inputs may close the gap. The board should not simply defer the decision, because every month of inaction permanently forgoes USD 175,000 of the annual net saving.
> 
> **Part (ii) — MdP-Morocco and the Office des Changes rules**
> 
> The Office des Changes regulations constitute a market barrier to the free movement of capital that categorically bars MdP-Morocco from routing MAD receivables or payables through the Santiago netting centre. The group must exclude MdP-Morocco from the multilateral matrix entirely; attempting to include it would violate Moroccan law and risk fines or loss of operating licences that would far exceed any notional saving. For MdP-Morocco's exposures, the group should apply bilateral matching first — netting all MAD inflows against MAD outflows within the Moroccan entity before any cross-border settlement — and then hedge residual net positions using onshore Moroccan forward contracts or hedging instruments explicitly permitted under Office des Changes rules. This approach respects the regulatory constraint while still reducing gross settlement volumes.
> 
> **Part (iii) — The no-new-headcount constraint**
> 
> The no-new-headcount constraint carries direct financial significance because the USD 2.1 million net saving figure and the USD 4.55 million set-up cost both presumably assume that the centre is staffed by redeployment at no incremental salary cost. If existing treasury staff cannot absorb the netting centre's workload without reducing throughput or accuracy in their present roles, the true running cost will exceed the modelled figure, compressing the net saving below USD 2.1 million and pushing the payback period beyond 26 months — widening the already marginal breach of the 24-month threshold. The board must therefore obtain an independent capacity assessment confirming that redeployment is operationally feasible; if the assessment reveals a gap, the no-new-headcount constraint should be relaxed rather than the centre deferred, since the cost of one or two additional hires is likely to be recovered well within the saving's life.

**GOLDEN BAD (`answer_schema._authoring.golden_bad` — never served)** · designed flags **[F1, F5, F4]**:

> Mineros del Pacífico S.A. is a Chilean mining-services group with five trading subsidiaries across three continents. The group is considering whether to establish a multilateral netting centre in Santiago.
> 
> Multilateral netting is a technique used by multinational groups to reduce the number and value of intercompany foreign-currency settlements. Instead of each subsidiary settling gross amounts owed to every other subsidiary, all positions are consolidated and only net amounts are transferred. This significantly reduces transaction costs, bank charges, and administrative effort. Bilateral netting works in a similar way but involves only two parties.
> 
> The benefits of multilateral netting include reduced foreign exchange transaction costs, lower bank fees, improved cash flow visibility, and better currency risk management. The drawbacks include the cost of setting up and running the netting centre, the complexity of coordinating multiple entities across different time zones, and the potential for regulatory barriers in certain jurisdictions.
> 
> Exchange controls are a well-known barrier to the free movement of capital. Many emerging-market regulators impose restrictions on cross-border capital flows, which can prevent subsidiaries in those jurisdictions from participating in group netting arrangements. In such cases, groups typically manage exposures through bilateral arrangements or onshore hedging instruments.
> 
> The no-new-headcount constraint is a common board-level policy designed to manage costs. Running a netting centre requires treasury expertise, and if existing staff cannot absorb the additional workload it may affect the quality of treasury operations more broadly.
> 
> There are therefore a number of factors that the board of MdP should weigh carefully before making a decision. The financial outputs of the treasury analysis, the regulatory environment in each subsidiary's jurisdiction, and the operational capacity of the existing treasury team are all relevant considerations. The board may wish to seek further advice before proceeding.

**hint:** Your answer identifies the payback breach and the Morocco problem, but check whether you have converted each financial output into a clear board-level verdict — approve, reject, or conditionally approve — with the specific reasoning that bridges the number to the recommendation, particularly for the no-new-headcount constraint where the capacity risk needs to be named and resolved, not merely flagged.

**full_reveal:** The dominant misconception in advisory drills like this is FENCE-SITTING: the candidate lists the correct financial outputs — payback period, net saving, regulatory barrier — and then stops at the threshold of the room, presenting the numbers as if the board can draw its own conclusions. That is not advice; it is a spreadsheet commentary. The failure is structural: a number without a verdict leaves the board exactly where it started, and in an exam context the advice marks are attached to the recommendation, not the calculation. The correct mental model is to treat every financial output as evidence in an argument that must land on a directive: in part (i), the narrow payback breach does not automatically mean rejection — the size and durability of the recurring saving may justify a documented exception, and the candidate must say so explicitly. In part (iii), merely noting that the no-new-headcount constraint "could affect" the saving is an UNDEVELOPED-ASSUMPTION: the candidate must reason through the causal chain — if redeployment is not operationally feasible, the modelled running cost is understated, the net saving is overstated, and the payback period widens further — and then land on what the board should do about it. The boardroom standard is this: every paragraph should end with an instruction, not an observation.

---

## D8 — B1b · **scepticism** · `f6426c06-de4a-48a0-a7ca-60c717c3945d`
- LO B1b · L2 · command_verb "assess" · 12 marks · AREA_ENTRY_RANK **65**
- **GATES (real grader):** N2 scenario-anchor (facts in scenario + used in reveal) ✓ · N3 generic/copy lint (reveal not scenario-restating) ✓ · N5 committed-verdict/structure ✓ · N4-pre designed-flag raiseability (F1,F5,F4) ✓ · N1 rubric-coverage (reveal = full marks; every part mapped) ✓ · N4 Rule-23 (GOOD in band, BAD below + designed F-modes raised) ✓ — plus P4 jurisdiction/frozen-facts ✓ and P7 misconception-lead ✓ (both block the insert on failure).
- **F10 marking basis:** c2, c3 = **6/12 marks**

**context_text:** Río Verde Hydro S.A. ("RVH") is a Colombian electricity utility evaluating a new 200 MW run-of-river hydroelectric project on the Magdalena River. The board has commissioned a Monte Carlo simulation of the project's NPV, and the following outputs are GIVEN: mean NPV = COP 480 billion, standard deviation of NPV = COP 320 billion, probability of a negative NPV = 8%, and project value-at-risk at the 95% confidence level (i.e., the 5th-percentile NPV) = COP −47 billion. The project sponsor, Chief Development Officer Valentina Osprey, told the board: "These results prove the project is essentially safe — the probability of loss is only 8%, and a VaR of −47 billion means the very worst the project can suffer is a loss of COP 47 billion; the board should approve with confidence." However, the simulation's input distributions for capital cost and electricity price were derived exclusively from RVH's own management estimates and a single five-year historical period (2018–2022), which spanned no major drought or commodity price shock. Furthermore, the model treated annual river-flow volume and electricity spot price as statistically independent variables, despite the Colombian energy market's well-documented pattern that drought years suppress both hydroelectric output and — via reduced nationwide generation capacity — simultaneously push wholesale electricity prices upward, creating a strong positive co-movement between the two revenue drivers that the model ignores.

**question:** ASSESS how much reliance the board of Río Verde Hydro S.A. can place on (i) the simulation output as a whole, and (ii) the specific reading of the output given by Chief Development Officer Valentina Osprey, including her interpretation of the value-at-risk figure.

**scenario_facts:**

| id | kind | key (verbatim in context_text) |
|---|---|---|
| `f_mean_npv` | figure | `480 billion` |
| `f_sd` | figure | `320 billion` |
| `f_prob_neg` | figure | `8%` |
| `f_var` | figure | `−47 billion` |
| `f_input_source` | constraint | `2018–2022` |
| `f_independence` | constraint | `statistically independent` |
| `f_co_movement` | constraint | `positive co-movement` |
| `f_osprey` | entity | `Valentina Osprey` |

**criteria (5 / 12 marks):**

**`c1` — 2 marks** · part: *(i) reliability of the simulation output* · anchors: `f_input_source` · disqualifiers: **[F1, F5, F6]** · developed: true
> The input distributions were drawn from management estimates and the period 2018–2022 alone — a window that excluded major droughts and commodity shocks — so the simulation cannot generate the tail scenarios that would matter most to the board; the output is therefore likely to understate true downside risk.

**`c2` — 3 marks** · part: *(i) reliability of the simulation output* · anchors: `f_independence`, `f_co_movement`, `f_prob_neg` · disqualifiers: **[F1, F5, F6, F10]** · developed: true
> Treating river-flow volume and electricity spot price as statistically independent when positive co-movement exists in the Colombian market is a critical modelling error: in a drought year the model randomly varies these inputs in isolation, but in reality both deteriorate simultaneously, meaning the simulation systematically underestimates the probability and severity of combined adverse outcomes — the stated 8% loss probability is therefore optimistically biased.

**`c3` — 3 marks** · part: *(ii) assessment of Osprey's reading of the output* · anchors: `f_var`, `f_osprey`, `f_input_source` · disqualifiers: **[F1, F4, F5, F6, F10]** · developed: true
> Valentina Osprey's claim that VaR of −47 billion represents 'the very worst the project can suffer' is a fundamental misreading: a 95% VaR is simply the threshold the NPV will fall below in 5% of scenarios — it says nothing about how large the losses in that 5% tail could be; given the flawed input data from 2018–2022, extreme tail losses (potentially far exceeding COP 47 billion) are both plausible and unquantified by this output.

**`c4` — 2 marks** · part: *(ii) assessment of Osprey's reading of the output* · anchors: `f_mean_npv`, `f_sd`, `f_osprey` · disqualifiers: **[F1, F5, F6]** · developed: true
> The mean NPV of 480 billion and standard deviation of 320 billion together indicate that the distribution has wide dispersion relative to its mean — the coefficient of variation implies substantial uncertainty — yet Osprey presents these figures as confirming safety rather than highlighting the breadth of outcomes; the board should treat the wide spread of results as a reason for caution, not comfort.

**`c5` — 2 marks** · part: *(ii) assessment of Osprey's reading of the output* · anchors: `f_osprey`, `f_independence`, `f_co_movement` · disqualifiers: **[F4, F5, F11]** · developed: true
> On balance, the board should place only limited reliance on this simulation and should reject Osprey's characterisation of the project as 'essentially safe'; the board should require the model to be re-run with stress-tested input distributions covering drought years and with river flow and electricity price modelled as positively correlated before making an approval decision.

**bands (code-owned):** fail ≥0% · pass ≥50% · good ≥70% · excellent ≥85%

**GOLDEN GOOD (`model_answer`, heading + reveal):**

> **Monte Carlo simulation — challenging the assumptions behind the output**
> 
> The simulation's reliability is fundamentally compromised by two defects. First, all input distributions were calibrated on management estimates and a narrow window spanning only 2018–2022 — a benign period that contained no severe drought or commodity price shock. Because extreme adverse conditions were never sampled, the model cannot generate the tail scenarios that matter most; consequently, the mean NPV of 480 billion and the stated 8% loss probability should be treated with scepticism, as they likely flatter the project's true risk profile.
> 
> Second, and more seriously, the model treated river-flow volume and electricity spot price as statistically independent, directly contradicting the positive co-movement well documented in the Colombian market, where drought simultaneously suppresses hydro output and — by reducing national generation capacity — drives wholesale prices upward. By ignoring this correlation, the simulation can only construct scenarios in which one variable is bad at a time; it cannot construct the compound adverse scenario (low flow and low price together) that would inflict the deepest losses. The 8% loss probability is therefore structurally optimistic.
> 
> Valentina Osprey's reading compounds this problem with a conceptual error. Her assertion that a VaR of −47 billion represents the very worst the project can suffer fundamentally mischaracterises what a 95% VaR measures: it is merely the threshold below which outcomes fall in 5% of simulations — it is silent on how severe those tail outcomes are. Given the defective input data from 2018–2022 and the ignored correlation, those tail losses could far exceed COP 47 billion. Furthermore, Osprey presents the 480 billion mean alongside a standard deviation of 320 billion as evidence of safety, when in fact the wide dispersion signals substantial uncertainty that a responsible board should interrogate rather than dismiss.
> 
> On balance, the board should place only limited reliance on this simulation and should firmly reject Osprey's characterisation of the project as essentially safe. The model should be re-run with distributions stress-tested to include drought-era data and with river flow and electricity price modelled as positively correlated before any approval decision is made.

**GOLDEN BAD (`answer_schema._authoring.golden_bad` — never served)** · designed flags **[F1, F5, F4]**:

> Monte Carlo simulation is a useful technique for investment appraisal because it replaces single-point estimates with probability distributions for each input variable, generating a distribution of possible NPV outcomes rather than a single figure. The simulation outputs for the Río Verde Hydro project show a mean NPV of COP 480 billion and a probability of a negative NPV of 8%, which suggests the project has a high likelihood of generating a positive return.
> 
> The board has commissioned a Monte Carlo simulation of the project's NPV, and the following outputs are GIVEN: mean NPV = COP 480 billion, standard deviation of NPV = COP 320 billion, probability of a negative NPV = 8%, and project value-at-risk at the 95% confidence level = COP −47 billion. The VaR figure is an important risk measure that quantifies the downside at a given confidence level.
> 
> It is generally acknowledged in financial theory that correlation between input variables can affect the outcomes of a Monte Carlo simulation. When variables are modelled as independent, the results may differ from those obtained when correlation is incorporated. Similarly, the quality of input distributions is important in any simulation model — if inputs are derived from historical data, the reliability of those inputs depends on the representativeness of the historical period chosen.
> 
> There are also general limitations to the VaR measure. VaR has been criticised in financial risk management for not capturing tail risk beyond the confidence threshold. Expected Shortfall (also known as CVaR) is sometimes preferred as it captures the average loss in the tail.
> 
> It is possible that the simulation could understate or overstate the true risk, depending on the assumptions made. The board may wish to consider whether additional sensitivity analysis would be helpful in this situation. There are arguments on both sides of the debate about how much weight to place on simulation results.

**hint:** Your answer describes what the simulation does, but the board needs you to challenge the two specific defects in how it was built — ask yourself what the 2018–2022 calibration window excludes and what happens to the loss probability when two bad variables are forced to move independently when the scenario tells you they should not.

**full_reveal:** The dominant misconception here is UNDEVELOPED-ASSUMPTION: candidates identify that the simulation has limitations — short data window, management estimates, standard deviation is large — but then list those observations without explaining the causal mechanism that makes each one matter. Naming a flaw is level 1 thinking; the boardroom demands level 2 — why does that flaw corrupt this specific output? The 2018–2022 window is not merely "short"; because it excluded severe drought and commodity shocks, the tail of the distribution was never populated, which means the loss probability the model reports is structurally incapable of reflecting the compound adverse events the project actually faces. The correlation defect is even more damaging in its mechanism: treating river flow and electricity price as independent allows the simulation to place them in offsetting scenarios, but the scenario tells you they move together in the Colombian market — drought suppresses output and simultaneously reduces national generation capacity, pushing prices up — so the truly destructive scenario (low flow coinciding with low price) can never be constructed, and the stated loss probability is therefore optimistic by design, not by accident. Osprey's VaR error follows the same undeveloped pattern: she has read a threshold figure as a worst-case ceiling, when VaR is silent on the severity of outcomes beyond that threshold — and with both defects present in the underlying model, those tail outcomes could be materially worse than the figure she cites; a board-ready answer names that distinction and concludes with a clear recommendation on reliance.
