# AFM PS-cell batch 2 — review pack (pipeline #2, discursive)

**INSERTED 2026-08-02 as `candidate`/`published=false`. NOT PUBLISHED — the flip is a separate GATE-P call.** 3 discursive drills, `paper_code=AFM`, `mode=discursive`, `rubric_version=narrative_v1`. Gated on the REAL constrained grader: **N1–N6 green**, plus P4 jurisdiction/frozen-facts and P7 misconception-lead. Rows are byte-identical to `docs/rollbacks/AFM_narrative_draft_D{9,10,11}.json`.

| plan | id | cell | LO | skill | marks | criteria | F10 marks | rank |
|---|---|---|---|---|---|---|---|---|
| **D9** | `36edda4f-a603-406d-82b0-6341dec38b11` | B5 × communication | B5c | communication | 12 | 6 | 8/12 | 66 |
| **D10** | `de0c2676-abe8-4037-9984-a24e8aef73ba` | E3 × scepticism | E3a | scepticism | 11 | 5 | 9/11 | 85 |
| **D11** | `d2b06649-f84c-4ed1-bd27-76069ac8a642` | A3 × communication | A3c | communication | 10 | 5 | 10/10 | 67 |

## ✏️ D9's `full_reveal` REWRITTEN 2026-08-02 (Grant's ruling) — it taught the wrong skill

**The defect:** the teaching leg led on **FENCE-SITTING** — *"The dominant misconception here is FENCE-SITTING: candidates … present both sides of the expansion argument without ever resolving them into a verdict … it fails the command verb 'advise' at level 3."* That is a **commitment** failure (F4), which this rubric carries on **one criterion worth 2 of 12 marks** (`c6`). The drill's declared skill is **communication**, and its four F10 criteria (`c1`, `c3`, `c5`, `c6` = 8/12) are all about the READER. **The teaching leg was coaching a different skill from the one the rubric marks.**

**The reframe** is anchored on the failure the drill's own golden BAD actually exhibits. That BAD is technically accurate throughout — and closes by saying *"BalticPack's treasury team should engage with local counsel and continue to review available remittance strategies."* It hands the only action item to **a party the two recipients do not control**, in a treasury register, having never once named Ms Nguyen or Mr Pham. The rewritten `full_reveal` leads on **WRITING FOR THE WRONG READER**, names that closing line as the tell, and keeps the commitment point where it belongs — as the second half of `c6` rather than as the headline.

**Re-gated after the edit: N1–N6 green + P4 + P7 PASS**, then applied in place via `--narrative-update-from --drill-id` (the id was already minted). Row still `candidate`/`published=false`.

**Also fixed:** `--narrative-regate-from` previously ran **N1–N6 only** — none of which reads `hint` or `full_reveal`. A hand edit to a teaching field could be reported "re-gated GREEN" by checks that had never looked at the field that changed. It now runs **P4 and P7 as well**.

**🔸 STILL OPEN on D9 — the `hint` carries the same lean and was NOT changed** (out of the scope you set). It reads *"check whether you have moved to an explicit, conditional recommendation … because that is the advice the boardroom is waiting for"* — commitment again, not audience. Say the word and I will reframe it the same way.

**E1 × analysis_and_evaluation is deliberately NOT in this batch** — it may close without authoring depending on your ruling on `55181aa8` below. Authoring it now would risk a second server for a cell about to close for free.

---

# PART 1 — ADJUDICATION: `55181aa8` (E1a, `commercial_acumen`, LIVE)

## The full rubric

**question:** *"Discuss the issues affecting the establishment of the new group treasury function, and the impact this would have on the existing subsidiary treasury desks and on the Osaka head-office treasury. Note: this requirement asks about THIS group's specific situation — a generic list of the advantages and disadvantages of centralising treasury is not what is being asked for."*

**context_text:** *Kaisho Holdings, a Japanese industrial-equipment group headquartered in Osaka, has expanded over the past decade into South America, where it now operates four subsidiaries that each run their own local treasury desk. Most of the group's currency and financing activity now originates in the region. The group finance director has proposed establishing a new centralised group treasury function in São Paulo, while retaining a smaller treasury presence in Osaka. No decision has yet been taken on the exact location within South America, nor on how much financial autonomy the four subsidiary desks would keep. The board wants to understand the issues involved in setting up the new function and the impact it would have on the existing subsidiary desks and on the Osaka head-office treasury before it commits.*

**scenario_facts — 2 constraint, 3 entity, ZERO figure:**

| id | kind | key |
|---|---|---|
| `f_location` | constraint | `location within South America` |
| `f_autonomy` | constraint | `financial autonomy` |
| `f_saopaulo` | entity | `São Paulo` |
| `f_desks` | entity | `subsidiary desks` |
| `f_osaka` | entity | `Osaka head-office treasury` |

**criteria — 4 / 8 marks. Every `required_point` opens with the word "Discuss". No criterion carries F4 or F10.**

| id | marks | anchors | disqualifiers | `required_point` |
|---|---|---|---|---|
| `c1` | 2 | `f_location`, `f_autonomy` | [F1, F5, F7] | **Discuss** the location-and-control issues specific to setting this function up — WHERE within South America to site it and how much financial autonomy to leave with the local desks — rather than a generic list of centralisation advantages. |
| `c2` | 2 | `f_saopaulo` | [F1, F5, F2] | **Discuss** a further establishment issue grounded in the group's own position — e.g. that the shift of activity to the region is the rationale for siting the function in São Paulo, and the staffing/systems needed to run it there. |
| `c3` | 2 | `f_desks`, `f_autonomy` | [F1, F5] | **Discuss** how the roles and responsibilities of the existing subsidiary desks would change — e.g. losing autonomy over financing/hedging decisions to the new central function. |
| `c4` | 2 | `f_osaka` | [F1, F5] | **Discuss** how the relationship with the Osaka head-office treasury would change — e.g. Osaka moving from running activity to overseeing/coordinating a regional centre. |

*(Each criterion carries an `evidence_anchor` to SD24 p.4, Northney (i) — the E-narrative cluster's deliberate provenance deviation. Retained verbatim in the row.)*

**GOLDEN GOOD (`model_answer`):** *"The board should first weigh the location-and-control questions this proposal leaves open. Deciding the exact location within South America matters because a treasury centre needs deep local banking relationships, staff with the right skills and time-zone reach across the four markets, so a poorly chosen site would undercut the very efficiency the move is meant to deliver. Control is the harder question: the group must decide how much financial autonomy the local desks retain, because pulling every hedging and financing decision into the centre risks slow responses to local conditions, while leaving too much locally defeats the purpose of centralising. A second establishment issue is that the rationale for siting the centre in São Paulo is that most activity has migrated to the region, so the case rests on being close to where the exposures arise — but the group still has to build the staffing and treasury systems there, which takes time and investment before any benefit appears. Turning to the impact, the roles and responsibilities of the subsidiary desks would change materially: if they lose their financial autonomy over financing and hedging to the new centre, they shift from decision-makers to executors, which affects morale, retention and the local knowledge the group relies on. Finally, the Osaka head-office treasury's relationship changes too — it would move from running much of the activity to overseeing and coordinating a regional centre, so the group must be clear where ultimate authority for group-wide policy and risk limits now sits. On balance the proposal is workable, but only once location, the autonomy split, and the Osaka–São Paulo reporting line are settled explicitly rather than left open."*

**GOLDEN BAD** (designed flags [F1, F5, F4]): *"The group finance director has proposed establishing a new centralised group treasury function. Centralising treasury has well-known advantages and disadvantages. The main advantages of centralisation are economies of scale, since one central team can negotiate better bank terms and pool cash more efficiently, and stronger control, since all decisions run through one place. Centralisation also allows netting of currency flows and standardised systems across the group. The disadvantages of centralisation are a loss of local responsiveness, higher fixed overheads for the central team, and possible resistance from local managers who prefer their own arrangements. A centralised treasury can be slower to react to local conditions. These are the general points about centralising a treasury department that any group would consider."*

## The measured findings

Run through the barrier's own engagement tests, not read off:

| | `55181aa8` | `d0be009d` (sibling: same LO, same tag) |
|---|---|---|
| Does the RUBRIC demand a verdict? | **NO — N5 is EXEMPT** | **YES** |
| Criteria penalising fence-sitting (F4) | **NONE** | `c4` |
| `required_point` opening words | Discuss · Discuss · Discuss · Discuss | Advise · Advise · Advise · **Commit** |
| scenario_fact kinds | 2 constraint, 3 entity, **0 figure** | 2 constraint, 1 entity, **0 figure** |

## ⚠️ A correction to my own earlier reasoning

In the batch-1 pack and journal I framed this row's problem as partly *"no priced decision — zero figure facts"*. **The sibling refutes that.** `d0be009d` also has zero figures and is a sound `commercial_acumen` drill. A commercial judgement can be genuinely constrained without a number. **The figures argument is not the discriminator and I should not have leaned on it.**

## The recommendation

**I recommend `analysis_and_evaluation`. Your ruling.**

The decisive fact is the DEMAND, not the facts available to meet it. ACCA's `commercial_acumen` descriptor 2 is *"Recognise key issues in a given scenario and use judgement in **proposing and recommending commercially viable solutions**"* — and **no criterion here requires a proposal, a choice, or a commitment**. N5 does not even engage: neither requirement part nor any `required_point` contains verdict language, and no criterion carries F4, so a candidate who discusses all four points and commits to nothing scores 8/8. `d0be009d`, on the same LO with the same tag, demands exactly the opposite (`c4`: "**Commit** to a clear recommendation… on income-maximising/cost-saving grounds"), which is what a commercial_acumen rubric looks like.

What the rubric DOES demand — investigating organisational implications, reflecting on how roles, authority and retention change — is ACCA's `analysis_and_evaluation` descriptors 2 and 3 almost verbatim (*"Consider information, evidence and findings carefully, reflecting on their implications"*; *"…taking into account the implications of such decisions on the organisation and those affected"*).

**The honest counter-case, which is real:** `commercial_acumen` descriptor 3 covers *"insight and perception in understanding financial issues and **wider organisational matters**"*, and c3/c4 are squarely wider organisational matters. The golden GOOD does commit ("workable, but only once…"). And the signature disqualifier F7 (generic-centralisation-substitution) is a commercial failure — giving the textbook answer instead of engaging with this group. A reading that keeps the tag is defensible; it is just weaker than the one that moves it, because the model answer's commitment is **uncredited by the rubric**.

**N6 cannot adjudicate this and did not.** Both rows fail N6 identically (N6a 0% F10 — they are pre-fix rows; N6b for want of a figure), and both fail identically whether tagged `commercial_acumen` or `analysis_and_evaluation`. That is the claim ceiling behaving exactly as documented: **N6 measures labelling and object-shape, neither of which distinguishes these two skills.**

**I flag one thing against my own recommendation.** Moving the tag is *convenient* — it closes a cell for free. That is a reason to weigh it on the rubric alone, which is what I have tried to do above.

## Consequence either way

| | E1 × commercial_acumen | E1 × analysis_and_evaluation | net cells owed |
|---|---|---|---|
| **Tag moves to a_and_e** | still **SERVABLE** — `d0be009d` remains | **CLOSES without authoring** — `55181aa8` becomes the server | **0 remaining after this batch** |
| **Tag stays** | 2 servers | still unservable — needs authoring | **1 remaining after this batch** |

A re-tag would be a P-DB2 write to a **published** row and needs its own guarded write, snapshot and journal entry. Nothing has been changed.

---

# PART 2 — A3 ROUTE: review `47c9d5ce`, or author?

**Recommendation: AUTHOR (done — D11 below). Reviewing the candidate does not close the cell and is not cheaper.**

`47c9d5ce` (A3a, 12 marks, `candidate`/`published=false`, created 2026-07-09):

1. **Its tag is the defect's output, not a judgement.** `communication` is `pool[0]` for section A, which is exactly what the broken rotation returns. Nothing decided it.
2. **Its content is a SCEPTICISM drill, not a communication one.** The scenario has CFO Ms Dlamini asserting, in quotation marks, that the project is *"ESG-aligned because it cuts CO₂ emissions by 34% … and will retain all 1,200 existing jobs."* The model answer refutes both halves — the 34% falls 6 points short of the board's own adopted 40% target; *"Ms Dlamini's assertion that 'all 1,200 jobs are retained' **should be challenged**"* — flags greenwashing risk on the green bond, and commits to *"The board should not proceed on current terms."* The `full_reveal` states the method outright: *"each dimension **stress-tests a specific scenario claim**"*. **Publishing it under a `communication` tag would ship precisely the dishonest tag this workstream exists to remove.**
3. **It cannot be gated.** `answer_schema` is **null** — no rubric, no criteria, no golden BAD. It predates the narrative pipeline, so N1–N6 have nothing to run on and Rule-23 separation has never been demonstrated for it.

So the "cheap" route is not cheap: it needs a re-tag decision, a full rubric authored from scratch, and a first-ever gating run — which is strictly more work than authoring a purpose-built drill, and still leaves A3 × communication unserved unless the content is also changed.

**Separately, `47c9d5ce` now needs a decision of its own** (not actioned): it is a plausible A3 × **scepticism** drill that is mis-tagged, un-gateable and unadjudicated. A3 × scepticism is **not** in the examined set, so it closes nothing measured. Options are leave it dormant, or re-author it through the narrative pipeline with a proper rubric and a `scepticism` tag.

---

# PART 3 — THE THREE DRAFTS

## What to check, per drill

- **D9 and D11 are `communication` drills, and N6b CANNOT gate their precondition.** It reports `NOT EVALUATED` — no structural test for "a named audience and a stated purpose" exists that is not a phrase table. **The audience precondition is yours to confirm by reading.** D9's audience is the Vietnamese subsidiary's local operating board (operations and sales directors) who were promised a distribution that did not arrive; D11's is the elected representatives of affected farming communities who received an assurance that proved wrong. Both are named, non-financial, must decide something, and start from broken trust.
- **P-N1 held on all three.** Every figure is a stated analysis OUTPUT; no raw drivers; no arithmetic asked of the candidate. D9's three stated figures (balance, annual cap, years to release) are mutually consistent by construction — one division, checked. D10 states the effective rate achieved and the residual unhedged amount as given results, with no contract counts, tick values or basis decay.
- **D10 is the first drill N6 actually SHAPED rather than measured.** N6c failed three of its four attempts — attempt 1 because no `scenario_fact` key fell inside the quoted assertion, attempts 2 and 3 because F10 criteria did not anchor on the claim fact. The authored artefact changed in response. That is the N6c failure path running in production authoring, not in a fixture.

## ⛔ CLOSED RULINGS — carried forward

- **CLAIM CEILING.** Never "code owns the marks" for narrative. And for N6: *"the scenario admits the act and the rubric names the skill as the marking basis"*, **never** *"the rubric demands the skill"*.
- **CONCEPTUAL-ONLY.** D9 does not compute a blocked-funds NPV (calc #10 K3); D10 does not compute a hedge, lock-in rate or contract count (calc #12); D11 does not appraise whether the remediation programme is adequate.
- **Designed BAD flags stay the deterministic `[F1, F5, F4]` backbone.**
- **P-N1 applies to every brief** — derived economics as GIVEN outputs, raw drivers forbidden, at most one arithmetic step.
- **No phrase table, ever** — including for communication's precondition, which is why it is honestly `NOT EVALUATED`.

## Also fixed this session

**`--narrative-batch` exited 0 when every drill failed.** Found the hard way: D11's first run failed all five attempts and wrote no draft, and because I had redirected stdout my check reported success. `runNarrativeBatch` now returns its failure count and the caller sets `process.exitCode` (P-G4: never `process.exit()`). A batch that produced nothing can no longer say it succeeded.

---

*Per-drill bodies below are generated from the captured drafts.*

---

## D9 — B5 × communication · `B5c`

- LO B5c · L3 · command_verb "explain, evaluate and advise" · **12 marks** · declared skill **`communication`** · AREA_ENTRY_RANK **66**
- **F10 marking basis:** `c1`, `c3`, `c5`, `c6` = **8/12 marks**
- **GATES — N1–N6, real constrained grader:**

  - **N2** scenario-anchor (facts in scenario + used in reveal): PASS
  - **N3** generic/copy lint (reveal not scenario-restating): PASS
  - **N5** committed-verdict/structure: PASS
  - **N4-pre** designed-flag raiseability (F1,F5,F4): PASS
  - **N1** rubric-coverage (reveal = full marks; every part mapped): PASS
  - **N4** Rule-23 (GOOD in band, BAD below + designed F-modes raised): PASS
  - **N6a** F10 marks-share: PASS
  - **N6b** scenario precondition (communication): NOT EVALUATED — no structural test exists for "a named audience and a stated purpose" that is not a phrase table (banned — see the header). A communication drill's precondition must be confirmed by a human reading the pack
  - **N6c** claim-anchor link: NOT EVALUATED — structurally N/A for communication — only scepticism acts on a single identifiable asserted claim

### context_text

> BalticPack Group SA ("BalticPack"), a European packaging conglomerate headquartered in Warsaw, Poland, owns a 100%-controlled Vietnamese manufacturing subsidiary, VinaPack JSC ("VinaPack"), which produces flexible packaging for fast-moving consumer goods clients across South-East Asia. Vietnam's State Bank imposes exchange controls that restrict the annual remittance of dividends and profit repatriations by foreign-owned subsidiaries to a central-bank-permitted annual cap of USD 4 million per entity. An analysis already completed by BalticPack's group treasury states the following three figures: VinaPack's accumulated undistributed profits stand at USD 28 million; the annual remittance cap is USD 4 million; and the resulting number of years required to release the full balance — on the assumption that all future profits are remitted immediately — is seven years. A distribution that VinaPack's local operating board had been promised for the current financial year did not arrive because the cap was triggered, and that failure has damaged trust between the Warsaw headquarters and VinaPack's local leadership. VinaPack's Operations Director, Ms Nguyen Thi Lan, and Sales Director, Mr Pham Quoc Bao, must now decide whether to commit capital to a proposed local capacity expansion that would further increase VinaPack's profitability — and therefore further increase the volume of profits that will be trapped under the exchange-control regime. BalticPack's CFO has asked the group's senior financial adviser to prepare the key content of a briefing note addressed directly to Ms Nguyen and Mr Pham.

### question

> Prepare the KEY CONTENT of a briefing note to VinaPack's Operations Director (Ms Nguyen Thi Lan) and Sales Director (Mr Pham Quoc Bao), setting out the exchange-control position and advising them on the capacity-expansion decision.
> 
> Your answer should address:
> (i) Explain, in terms meaningful to operational leaders rather than treasury specialists, why the promised distribution did not arrive and what the current blocked-funds position means for VinaPack's local leadership.
> (ii) Evaluate the implication of the proposed capacity expansion for the exchange-control constraint, and advise Ms Nguyen and Mr Pham on whether they should commit to it.

### scenario_facts

| id | kind | key (verbatim in context_text) | description |
|---|---|---|---|
| `f_balance` | figure | `USD 28 million` | accumulated undistributed profits of USD 28 million |
| `f_cap` | figure | `USD 4 million` | annual central-bank-permitted remittance cap of USD 4 million |
| `f_years` | figure | `seven years` | seven years required to release the full balance |
| `f_audience` | entity | `Ms Nguyen` | the named operational audience: Ms Nguyen Thi Lan (Operations Director) and Mr Pham Quoc Bao (Sales Director) |
| `f_trust` | constraint | `trust` | trust has been damaged by the missed distribution |
| `f_expansion` | constraint | `capacity expansion` | proposed local capacity expansion that would increase profits and therefore the volume of trapped funds |

### criteria — 6 / 12 marks

#### `c1` — 2 marks · **carries the skill act (F10)**
*part:* (i) explain the exchange-control position in terms meaningful to operational leaders · *anchors:* `f_cap`, `f_audience`, `f_trust` · *disqualifiers:* **[F1, F5, F10]** · *developed:* true

> Translates the exchange-control mechanism into non-treasury language specifically calibrated for Ms Nguyen and Mr Pham: the cap is not a liquidity shortfall or a management decision but a hard regulatory ceiling imposed by Vietnam's State Bank — meaning the Warsaw headquarters was legally unable, not unwilling, to send the distribution — and this distinction matters to the audience because it separates regulatory constraint from broken commercial promise.

#### `c2` — 2 marks
*part:* (i) explain the exchange-control position in terms meaningful to operational leaders · *anchors:* `f_balance`, `f_cap`, `f_years` · *disqualifiers:* **[F1, F5, F6]** · *developed:* true

> Interprets the three given figures — USD 28 million accumulated, USD 4 million per year, seven years to clear — in a way an Operations or Sales director can act on: frames this as a structural queuing problem (earnings are real but access is rationed), and explains that even if VinaPack continues to perform well, the full accumulated balance cannot be released to Warsaw before seven years have elapsed, regardless of group profitability.

#### `c3` — 2 marks · **carries the skill act (F10)**
*part:* (i) explain the exchange-control position in terms meaningful to operational leaders · *anchors:* `f_trust`, `f_audience` · *disqualifiers:* **[F1, F5, F10]** · *developed:* true

> Addresses the trust dimension explicitly and constructively for the audience: acknowledges the damage caused by the missed distribution, reframes it as an information failure rather than a governance failure (the operating board were not told in advance about the binding cap), and signals that the purpose of this briefing is to give Ms Nguyen and Mr Pham the full picture so they can plan and engage with Warsaw on an informed basis going forward.

#### `c4` — 2 marks
*part:* (ii) evaluate the capacity-expansion implication and advise · *anchors:* `f_cap`, `f_years`, `f_expansion` · *disqualifiers:* **[F1, F5, F6]** · *developed:* true

> Evaluates the expansion's specific effect on the exchange-control constraint for this audience: higher profits generated by the capacity expansion will increase the annual earnings available for remittance, but because the annual cap of USD 4 million is fixed by the State Bank and not by the level of profits, additional earnings simply accumulate behind the same ceiling — extending the queue of trapped funds beyond the current seven-year horizon and compounding the blockage rather than resolving it.

#### `c5` — 2 marks · **carries the skill act (F10)**
*part:* (ii) evaluate the capacity-expansion implication and advise · *anchors:* `f_balance`, `f_expansion` · *disqualifiers:* **[F2, F5, F10]** · *developed:* true

> Identifies at least one viable strategy for dealing with restricted remittance that is relevant to the capacity-expansion context — such as reinvesting trapped profits locally (funding the expansion itself with the USD 28 million balance rather than seeking fresh capital from Warsaw), negotiating transfer-pricing arrangements for management fees or royalties within permitted limits, or structuring intra-group loans — and explains why that route partially mitigates the blockage in a way Ms Nguyen and Mr Pham can champion at the local level.

#### `c6` — 2 marks · **carries the skill act (F10)**
*part:* (ii) evaluate the capacity-expansion implication and advise · *anchors:* `f_balance`, `f_cap`, `f_audience` · *disqualifiers:* **[F4, F5, F10]** · *developed:* true

> Delivers a clear, committed recommendation addressed by name to the audience — advising Ms Nguyen and Mr Pham whether to support or oppose the capacity expansion — with a justified reason that integrates the exchange-control constraint: e.g. that the expansion can be supported IF Warsaw agrees in advance to fund it from the trapped USD 28 million balance (thereby converting stranded funds into productive local assets) and commits to a transparent remittance schedule under the USD 4 million cap, but should not proceed if Warsaw expects fresh equity injections while the backlog remains unresolved.

### GOLDEN GOOD — `model_answer` (heading + reveal)

> **Exchange controls — briefing a local operating board on restricted remittance**
> 
> **BRIEFING NOTE — EXCHANGE CONTROLS AND CAPACITY EXPANSION**
> *Addressed to: Ms Nguyen Thi Lan, Operations Director, and Mr Pham Quoc Bao, Sales Director, VinaPack JSC*
> 
> ---
> 
> **(i) Why the distribution did not arrive — and what the numbers mean for you**
> 
> The missed distribution was not a Warsaw decision to withhold funds, and it was not caused by any shortfall in VinaPack's performance. Vietnam's State Bank imposes a hard legal ceiling — the annual remittance cap of USD 4 million — on the amount any foreign-owned subsidiary may send abroad in a single year. Once that ceiling is reached, no further transfer is legally permitted regardless of how much cash VinaPack holds. Warsaw was constrained, not unwilling.
> 
> To put the current position in plain terms: VinaPack's accumulated undistributed profits stand at USD 28 million. Because the cap limits outflows to USD 4 million per year, the group's own analysis concludes it will take seven years to release the full balance — even if every future year's profits are also remitted immediately and the cap is not exceeded by new earnings. Think of this as a queue at a regulated border crossing: the goods are real, the lorries are loaded, but only a fixed number can cross each year.
> 
> This was an information failure. Ms Nguyen and Mr Pham, this briefing exists precisely to give you that full picture so that any future planning between your team and Warsaw starts from shared facts rather than broken promises.
> 
> ---
> 
> **(ii) The capacity expansion — evaluation and advice**
> 
> The capacity expansion will increase VinaPack's annual earnings, which is operationally positive. However, because the USD 4 million cap is set by the State Bank — not by the volume of profits — every additional dollar generated simply joins the queue behind the existing USD 28 million balance. Higher profits under a fixed cap extend the backlog horizon beyond the current seven years; they do not accelerate remittance. Ms Nguyen and Mr Pham should understand that backing the expansion without addressing the structural blockage would mean committing to years of further trapped funds with no guaranteed release date.
> 
> However, there is a constructive path. The USD 28 million already sitting in Vietnam could legitimately fund the expansion itself — converting stranded earnings into productive local assets rather than leaving them idle behind the cap. Warsaw could also be asked to formalise permitted channels such as management-fee agreements or royalty arrangements, which — if compliant with Vietnamese transfer-pricing rules — can transfer value to the group outside the dividend cap.
> 
> **Recommendation:** Ms Nguyen and Mr Pham are advised to support the capacity expansion, but only on the condition that Warsaw formally agrees to finance it from the trapped USD 28 million balance and simultaneously provides a transparent, year-by-year remittance schedule under the USD 4 million cap. If Warsaw instead expects fresh equity from the group while the backlog remains unresolved, the expansion should not proceed — it would deepen the blockage and further erode trust. The precondition protects VinaPack's leadership and gives the project a commercially honest foundation.

### GOLDEN BAD — `_authoring.golden_bad`, never served · designed flags **[F1, F5, F4]**

> **Exchange Controls and VinaPack**
> 
> Vietnam's State Bank imposes exchange controls that restrict the annual remittance of dividends and profit repatriations by foreign-owned subsidiaries to a central-bank-permitted annual cap of USD 4 million per entity. This is a well-known feature of operating in frontier and emerging markets and affects many multinational companies.
> 
> Exchange controls exist to protect a country's foreign currency reserves and to manage capital outflows. They are a standard tool used by central banks in developing economies. The restriction means that even when a subsidiary is profitable, the parent company cannot freely repatriate earnings above the permitted level.
> 
> For any multinational facing exchange controls, there are several strategies that can be considered. These include transfer pricing arrangements, management fee agreements, royalty payments, reinvestment of local profits, and intra-group loans. Each of these has its own regulatory and tax implications and would need to be considered carefully before implementation.
> 
> The capacity expansion is a significant strategic decision. On one hand, increasing capacity will improve VinaPack's revenue and profit generation. On the other hand, higher profits may increase the volume of funds subject to the exchange-control regime. There are arguments on both sides, and the appropriate course of action will depend on a range of factors including the regulatory environment, the group's overall capital allocation priorities, and VinaPack's local market position.
> 
> The exchange-control situation should be monitored closely. Any changes to Vietnam's regulatory framework may affect the cap in future periods. BalticPack's treasury team should engage with local counsel and continue to review available remittance strategies on a periodic basis.

### hint

> Your answer explains the exchange-control mechanics — now check whether you have moved to an explicit, conditional recommendation that tells Ms Nguyen and Mr Pham what to do about the expansion and under precisely what conditions, because that is the advice the boardroom is waiting for.

### full_reveal

> The dominant misconception here is FENCE-SITTING: candidates explain the USD 4 million cap fluently, note that additional profits will extend the backlog, and then stop — presenting both sides of the expansion argument without ever resolving them into a verdict with conditions attached. That is analysis, not advice, and it fails the command verb "advise" at level 3. The mental-model correction is this: in a discursive AFM question addressed to named operational leaders, the explanation and evaluation are the floor — the ceiling is a recommendation specific enough to act on, with the conditions that make it acceptable stated explicitly. The reason fence-sitting produces the wrong answer is structural: a briefing note that leaves the Operations Director and Sales Director to weigh the trade-offs themselves has not done the adviser's job; it has merely restated the problem in cleaner language. The correct move is to identify the constructive path the scenario makes available — using the trapped balance to fund the expansion rather than deepening the backlog — and to state the precondition on which the recommendation stands, so that Ms Nguyen and Mr Pham know exactly what to demand from Warsaw before they commit.

---

## D10 — E3 × scepticism · `E3a`

- LO E3a · L3 · command_verb "assess and advise" · **11 marks** · declared skill **`scepticism`** · AREA_ENTRY_RANK **85**
- **F10 marking basis:** `c1`, `c2`, `c3`, `c4` = **9/11 marks**
- **GATES — N1–N6, real constrained grader:**

  - **N2** scenario-anchor (facts in scenario + used in reveal): PASS
  - **N3** generic/copy lint (reveal not scenario-restating): PASS
  - **N5** committed-verdict/structure: PASS
  - **N4-pre** designed-flag raiseability (F1,F5,F4): PASS
  - **N1** rubric-coverage (reveal = full marks; every part mapped): PASS
  - **N4** Rule-23 (GOOD in band, BAD below + designed F-modes raised): PASS
  - **N6a** F10 marks-share: PASS
  - **N6b** scenario precondition (scepticism): PASS
  - **N6c** claim-anchor link: PASS

### context_text

> Chłodnia Polska S.A. ("CP"), a cold-chain logistics operator headquartered in Warsaw, is constructing a major distribution hub in Łódź and has arranged a PLN 120 million floating-rate syndicated loan for 18 months beginning 1 October 2025. To protect against rising short-term rates, CP's treasury team placed an interest-rate futures hedge in September 2025. An analysis already performed by CP's risk team shows that the futures hedge effectively covered a notional of PLN 100 million for a 12-month horizon, leaving PLN 20 million unhedged, and that the effective borrowing rate achieved on the hedged portion was 6.84% per annum — higher than the targeted rate of 6.60% because basis was non-zero when the hedge was closed. Group Treasurer Marek Wiśniewski told the board at its October 2025 meeting: "The futures hedge has fixed our borrowing rate and eliminated our interest-rate risk for the full duration of the loan." The syndicated loan agreement also contains a financial covenant requiring CP to maintain an interest-cover ratio of at least 2.5 times; a deterioration in EBIT during the hub's construction phase could breach this covenant if floating rates rise further, yet Mr Wiśniewski's presentation made no mention of the covenant.

### question

> Assess Mr Wiśniewski's claim that "The futures hedge has fixed our borrowing rate and eliminated our interest-rate risk for the full duration of the loan," and advise the board on the residual interest-rate exposures that Chłodnia Polska S.A. still carries.
> 
> (i) Assess the claim that the borrowing rate has been fixed.
> (ii) Assess the claim that interest-rate risk has been eliminated for the full duration of the loan.
> (iii) Advise the board on the residual interest-rate exposures and any further action it should consider.

### scenario_facts

| id | kind | key (verbatim in context_text) | description |
|---|---|---|---|
| `f_claim` | entity | `fixed our borrowing rate and eliminated our interest-rate risk` | Mr Wiśniewski's claim that the futures hedge has fixed the borrowing rate and eliminated interest-rate risk for the full duration of the loan |
| `f_notional` | figure | `PLN 100 million` | The hedge covered a notional of PLN 100 million, not the full PLN 120 million loan |
| `f_horizon` | figure | `12-month horizon` | The hedge covered a 12-month horizon, not the full 18-month loan term |
| `f_eff_rate` | figure | `6.84%` | The effective borrowing rate achieved on the hedged portion was 6.84% per annum |
| `f_target` | figure | `6.60%` | The targeted borrowing rate was 6.60% per annum |
| `f_basis` | constraint | `non-zero when the hedge was closed` | Basis was non-zero when the hedge was closed, causing the rate to exceed the target |
| `f_unhedged` | figure | `PLN 20 million unhedged` | PLN 20 million of the loan principal is entirely unhedged |
| `f_covenant` | constraint | `2.5 times` | The loan carries an interest-cover covenant requiring at least 2.5 times cover |
| `f_loan_term` | figure | `18 months` | The full loan term is 18 months |

### criteria — 5 / 11 marks

#### `c1` — 3 marks · **carries the skill act (F10)**
*part:* (i) Assess the claim that the borrowing rate has been fixed. · *anchors:* `f_claim`, `f_eff_rate`, `f_target`, `f_basis` · *disqualifiers:* **[F1, F5, F6, F10]** · *developed:* true

> Mr Wiśniewski's claim that the rate is 'fixed' does not hold because basis was non-zero when the hedge was closed, meaning the effective rate of 6.84% exceeded the 6.60% target; futures hedges do not lock in a precise rate but rather deliver an approximate one, so the rate was not 'fixed' in any certain sense.

#### `c2` — 2 marks · **carries the skill act (F10)**
*part:* (ii) Assess the claim that interest-rate risk has been eliminated for the full duration of the loan. · *anchors:* `f_claim`, `f_horizon`, `f_loan_term` · *disqualifiers:* **[F1, F5, F10]** · *developed:* true

> The claim that risk is eliminated 'for the full duration' is directly contradicted by the 12-month horizon of the hedge against an 18-month loan: the final six months of the borrowing carry no futures protection at all, leaving CP fully exposed to whatever floating rates prevail in that period.

#### `c3` — 2 marks · **carries the skill act (F10)**
*part:* (ii) Assess the claim that interest-rate risk has been eliminated for the full duration of the loan. · *anchors:* `f_claim`, `f_notional`, `f_unhedged` · *disqualifiers:* **[F1, F5, F10]** · *developed:* true

> The claim of full elimination also fails because the hedge was sized at PLN 100 million, so the PLN 20 million unhedged slice of the loan principal is entirely exposed to floating-rate movements throughout the whole 18-month term — a deficiency Mr Wiśniewski did not disclose to the board, undermining trust in his analysis.

#### `c4` — 2 marks · **carries the skill act (F10)**
*part:* (iii) Advise the board on the residual interest-rate exposures and any further action it should consider. · *anchors:* `f_claim`, `f_covenant` · *disqualifiers:* **[F1, F5, F10]** · *developed:* true

> Because Mr Wiśniewski did not mention the 2.5 times interest-cover covenant, the board faces a risk beyond the cost of unhedged interest: if floating rates rise further during the construction phase, the covenant could be breached, triggering an event of default — a consequence far more damaging than a higher effective rate, and one the treasurer's reassurance that risk is 'eliminated' actively obscures.

#### `c5` — 2 marks
*part:* (iii) Advise the board on the residual interest-rate exposures and any further action it should consider. · *anchors:* `f_unhedged`, `f_loan_term`, `f_covenant` · *disqualifiers:* **[F4, F5]** · *developed:* true

> The board should be advised to extend hedging coverage — for example by entering a forward rate agreement or interest-rate cap (or collar) for the residual PLN 20 million unhedged principal and separately for the unprotected final six months of the 18-month term — and to monitor the interest-cover ratio continuously given the covenant risk; on balance, the board cannot rely on Mr Wiśniewski's assertion and should seek independent confirmation of the hedge's true scope.

### GOLDEN GOOD — `model_answer` (heading + reveal)

> **Interest-rate hedging — testing a claim that the rate risk has been eliminated**
> 
> Mr Wiśniewski's assertion that the futures hedge has "fixed our borrowing rate and eliminated our interest-rate risk" for the full duration of the loan does not withstand scrutiny on Chłodnia Polska's own numbers, and the board should treat it with considerable caution.
> 
> **Part (i) — Was the rate fixed?**
> A futures hedge does not deliver a mathematically certain rate, because the relationship between futures prices and cash market rates — the basis — is rarely zero at close-out. Here, the analysis confirms that basis was non-zero when the hedge was closed, causing the effective rate actually achieved to be 6.84%, not the 6.60% targeted. The rate was therefore not "fixed" in any precise sense; it was approximated, at a cost of 24 basis points above target. The treasurer's language overstates certainty.
> 
> **Part (ii) — Was risk eliminated for the full term?**
> The claim of full elimination collapses on two counts. First, the hedge operated over a 12-month horizon while the syndicated loan runs for 18 months: the final six months of borrowing are entirely uncovered, and CP faces full floating-rate exposure in that window. Second, the hedge was sized at only PLN 100 million against a PLN 120 million facility, leaving PLN 20 million unhedged throughout the whole 18-month term. Neither gap was disclosed to the board by Mr Wiśniewski — a material omission.
> 
> **Part (iii) — Residual exposures and further action**
> The most serious omission is the 2.5 times interest-cover covenant. If rising floating rates increase interest charges on the unhedged portions during the construction phase — when EBIT may be under pressure — CP could breach the covenant and face an event of default, a consequence far graver than a marginally higher rate. The board should on no account accept the treasurer's assurance that risk is "eliminated."
> 
> The board is advised to close the coverage gaps immediately: an interest-rate cap or forward rate agreement should be arranged for the PLN 20 million unhedged principal across the 18-month term, and a separate FRA or cap should protect the final six months of the loan. The interest-cover covenant must be monitored against stressed rate scenarios throughout the construction phase. Overall, Mr Wiśniewski's claim significantly understates CP's residual exposure, and independent review of the hedge strategy is warranted.

### GOLDEN BAD — `_authoring.golden_bad`, never served · designed flags **[F1, F5, F4]**

> Interest-rate futures are exchange-traded contracts that allow a borrower to hedge against rising interest rates. They are standardised instruments and are traded in whole numbers of contracts, which means the hedge may not exactly match the borrowing amount. When a futures hedge is placed, the borrower sells futures contracts and buys them back when the loan is drawn down, with the profit or loss on the futures position offsetting the higher or lower cost of borrowing.
> 
> The futures hedge has fixed our borrowing rate and eliminated our interest-rate risk for the full duration of the loan. This was confirmed by the Group Treasurer at the October 2025 board meeting.
> 
> Basis risk is a well-known limitation of interest-rate futures hedging. Basis is the difference between the futures price and the cash market rate. If basis is non-zero at the time the hedge is closed, the effective rate achieved will differ from the rate that was originally targeted. This is an inherent feature of futures contracts and means that the hedge may not be perfectly effective.
> 
> Another limitation is that futures contracts are standardised and traded in whole numbers, so it may not be possible to match the exact notional amount of the loan. This means there could be a portion of the borrowing that is not covered by the hedge.
> 
> Interest-rate swaps are an alternative instrument. Under a swap, the borrower exchanges floating-rate payments for fixed-rate payments, giving certainty over interest costs for the full duration of the borrowing. An interest-rate cap is another option, which provides protection against rates rising above a specified level while allowing the borrower to benefit if rates fall. A collar combines a cap and a floor to reduce the premium cost of the cap.
> 
> There are various instruments available to manage interest-rate risk, and the appropriateness of each depends on the borrower's specific circumstances, risk appetite and the nature of the underlying exposure. The board may wish to consider whether the current hedging strategy remains suitable given the complexities involved.

### hint

> Before you assess whether the hedge eliminates risk, check whether it actually covers the full principal and the full loan term — two dimensions of coverage that Mr Wiśniewski's claim implicitly assumes are complete.

### full_reveal

> The misconception here is UNDEVELOPED-ASSUMPTION: candidates accept the treasurer's framing at face value — "futures hedge = rate fixed = risk gone" — and then assess the claim on basis risk alone, never pausing to challenge whether the hedge was sized correctly or whether its duration matches the loan's. That thinking produces the wrong conclusion because a hedge that is partial in both principal and tenor does not eliminate risk even in theory; it merely converts some exposure into a managed position while leaving the remainder fully floating. The correct mental model is to interrogate coverage across three dimensions before any quality assessment: (1) does the notional hedged match the facility drawn, (2) does the hedge horizon match the loan term, and (3) does residual basis risk prevent a precise rate lock even where coverage nominally exists — only then can you tell the board what risk actually remains. Critically, the board-level stakes here are not academic: unhedged floating exposure during the construction phase interacts with the interest-cover covenant, so the residual exposure is not merely a rate question but potentially a default-trigger question — and that is the advice the boardroom needs, not a verdict on futures mechanics alone.

---

## D11 — A3 × communication · `A3c`

- LO A3c · L3 · command_verb "evaluate" · **10 marks** · declared skill **`communication`** · AREA_ENTRY_RANK **67**
- **F10 marking basis:** `c1`, `c2`, `c3`, `c4`, `c5` = **10/10 marks**
- **GATES — N1–N6, real constrained grader:**

  - **N2** scenario-anchor (facts in scenario + used in reveal): PASS
  - **N3** generic/copy lint (reveal not scenario-restating): PASS
  - **N5** committed-verdict/structure: PASS
  - **N4-pre** designed-flag raiseability (F1,F5,F4): PASS
  - **N1** rubric-coverage (reveal = full marks; every part mapped): PASS
  - **N4** Rule-23 (GOOD in band, BAD below + designed F-modes raised): PASS
  - **N6a** F10 marks-share: PASS
  - **N6b** scenario precondition (communication): NOT EVALUATED — no structural test exists for "a named audience and a stated purpose" that is not a phrase table (banned — see the header). A communication drill's precondition must be confirmed by a human reading the pack
  - **N6c** claim-anchor link: NOT EVALUATED — structurally N/A for communication — only scepticism acts on a single identifiable asserted claim

### context_text

> Cerro Verde Copper Group ("CVCG"), a Peruvian copper-mining conglomerate, operates an open-pit mine in the Arequipa region. In March 2025, a tailings-pond breach released acid-mine drainage into the Tambo River catchment, contaminating irrigation water used by farming communities in three downstream valleys. CVCG's regional manager issued a public assurance in April 2025 that water quality would return to safe levels within 60 days; that assurance proved wrong, and water quality remained below regulatory standards four months later. CVCG's board has since committed a remediation spend of USD 28 million, funded from existing reserves, to install neutralisation infrastructure and restore aquifer quality. An independent environmental monitor will test water quality at 14 river stations every two weeks, and the programme is expected to reach the affected population of 6,400 farming households across the three valleys. The elected representatives of those farming communities — the Junta de Regantes del Tambo — are now deciding whether to accept the programme or to escalate to Peru's environmental regulator, OEFA, and they have explicitly cited the broken April assurance as the reason for their distrust. CVCG's senior management must address the Junta de Regantes in a formal written communication before a scheduled community assembly in four weeks.

### question

> As senior financial adviser to CVCG's board, evaluate how CVCG should communicate its remediation commitment to the Junta de Regantes del Tambo, addressing:
> (i) What the communication must contain and how it must be framed to address the Junta's specific concerns; and
> (ii) How the communication approach should be structured and delivered to make the commitment credible and actionable for the Junta given the breakdown in trust.

### scenario_facts

| id | kind | key (verbatim in context_text) | description |
|---|---|---|---|
| `f_broken_assurance` | constraint | `broken April assurance` | the April 2025 assurance that water quality would return to safe levels within 60 days, which proved wrong |
| `f_spend` | figure | `USD 28 million` | committed remediation spend of USD 28 million |
| `f_monitoring` | figure | `every two weeks` | independent environmental monitor testing at 14 river stations every two weeks |
| `f_households` | figure | `6,400 farming households` | 6,400 farming households across the three valleys |
| `f_audience` | entity | `Junta de Regantes` | the Junta de Regantes del Tambo — elected representatives deciding whether to accept the programme or escalate to OEFA |
| `f_oefa` | entity | `OEFA` | Peru's environmental regulator OEFA, the escalation option available to the Junta |

### criteria — 5 / 10 marks

#### `c1` — 2 marks · **carries the skill act (F10)**
*part:* (i) content and framing of the communication · *anchors:* `f_broken_assurance`, `f_audience` · *disqualifiers:* **[F1, F5, F10]** · *developed:* true

> The communication must open by explicitly acknowledging the broken April assurance — naming the failed 60-day commitment by date and outcome — because the Junta de Regantes cited this as the source of their distrust; without that acknowledgement, any statement of new commitments will be read as another unsubstantiated promise and the Junta will have no basis on which to distinguish this communication from the one that failed.

#### `c2` — 2 marks · **carries the skill act (F10)**
*part:* (i) content and framing of the communication · *anchors:* `f_spend` · *disqualifiers:* **[F1, F5, F6, F10]** · *developed:* true

> The communication must present the USD 28 million committed spend not as a corporate expenditure figure but as a practical signal of locked-in financial obligation — framed around what it funds (neutralisation infrastructure and aquifer restoration) rather than its absolute size — because the Junta are farmers not financial analysts, and a large number without context conveys nothing about whether real change will follow.

#### `c3` — 2 marks · **carries the skill act (F10)**
*part:* (i) content and framing of the communication · *anchors:* `f_monitoring`, `f_households`, `f_audience` · *disqualifiers:* **[F1, F5, F6, F10]** · *developed:* true

> The communication must translate the monitoring regime — independent testing at 14 river stations every two weeks — into a direct right for the Junta: specifying that results will be shared with the Junta in plain-language summaries before each community assembly, so that the 6,400 farming households can hold CVCG accountable through their representatives rather than relying on CVCG's self-reporting.

#### `c4` — 2 marks · **carries the skill act (F10)**
*part:* (ii) structure, delivery and credibility · *anchors:* `f_audience`, `f_oefa` · *disqualifiers:* **[F1, F4, F5, F10]** · *developed:* true

> Because the Junta are elected representatives facing a binary decision — accept the programme or escalate to OEFA — the written communication should be structured so the decision-relevant information (what CVCG commits to, what happens if milestones are missed, and what remedies the Junta retains) appears in the opening two pages, with supporting technical detail in annexes; this enables the Junta to present the key terms to their communities without relying on CVCG to interpret it for them.

#### `c5` — 2 marks · **carries the skill act (F10)**
*part:* (ii) structure, delivery and credibility · *anchors:* `f_broken_assurance`, `f_monitoring`, `f_oefa` · *disqualifiers:* **[F1, F4, F5, F10]** · *developed:* true

> To counter the credibility gap left by the broken April assurance, the communication should propose that the Junta nominate their own technical observer to attend monitoring events, and that CVCG commit — in writing in this document — to halt construction activity if any of the 14 stations records a threshold breach; these commitments convert CVCG's self-declared programme into a jointly-enforced mechanism and give the Junta a concrete reason to defer escalation to OEFA.

### GOLDEN GOOD — `model_answer` (heading + reveal)

> **Stakeholder management — communicating a remediation commitment to an affected community**
> 
> CVCG faces a communication task that is fundamentally about restoring decision-making trust, not simply transmitting technical facts. The following sets out what the written submission to the Junta de Regantes must contain and how it should be structured.
> 
> **Part (i) — Content and framing**
> 
> The opening paragraph must name and own the broken April assurance. CVCG issued a specific, time-bound commitment that water quality would recover within 60 days; it did not. The Junta de Regantes has identified this failure as the root of their distrust, and any communication that moves directly to new commitments without addressing it will be received as a repetition of the same pattern. The document must therefore state explicitly what was promised in April, what happened instead, and why the new programme is structurally different — not merely better-funded.
> 
> The USD 28 million committed spend should be presented in terms of what it physically delivers — neutralisation infrastructure and aquifer restoration — rather than as a headline number. The Junta represents farming households, not investors; the monetary figure alone carries no actionable meaning unless it is connected to visible, scheduled works they can verify.
> 
> The monitoring regime must be reframed as a Junta entitlement. Independent testing at 14 river stations every two weeks is only credible to the 6,400 farming households if they can see the results through their own representatives. The communication should commit that plain-language summaries of each monitoring round will be delivered to the Junta before any community assembly — converting monitoring from an internal assurance tool into a shared accountability mechanism.
> 
> **Part (ii) — Structure, delivery and credibility**
> 
> Because the Junta de Regantes must make a binary choice — accept the programme or escalate to OEFA — the document should lead with decision-relevant content: what CVCG commits to, the consequences if milestones are missed, and the remedies the Junta retains. Technical annexes should follow. This sequencing allows the Junta to present terms to their communities without depending on CVCG to explain them.
> 
> To structurally counter the credibility gap left by the broken April assurance, CVCG should propose in the document that the Junta nominate a technical observer to attend monitoring events at the 14 stations, and that CVCG commit in writing to halt construction activity if any station records a threshold breach. These provisions transform the programme from a unilateral corporate pledge into a jointly-enforced mechanism — giving the Junta a principled basis to defer escalation to OEFA while retaining the right to reactivate it if the written commitments are not met.
> 
> **Conclusion:** CVCG should deliver a plain-language, decision-first written document that acknowledges the April failure by name, frames the USD 28 million spend in operational terms, converts the monitoring data into a Junta right, and embeds joint-enforcement provisions. This is the only communication design that addresses the Junta's stated reason for distrust and gives them a credible basis for accepting the programme rather than escalating to OEFA.

### GOLDEN BAD — `_authoring.golden_bad`, never served · designed flags **[F1, F5, F4]**

> The management of stakeholder groups is a critical part of any mining company's social responsibilities. CVCG must communicate effectively with the communities affected by the tailings breach.
> 
> CVCG's regional manager issued a public assurance in April 2025 that water quality would return to safe levels within 60 days; that assurance proved wrong, and water quality remained below regulatory standards four months later. This demonstrates the importance of accurate communications with stakeholders.
> 
> There are several things CVCG should include in its communication. First, it should outline the remediation programme and explain what it involves. Second, it should provide information about the monitoring arrangements. Third, it should address community concerns. Fourth, it should explain the regulatory position and what OEFA's role is.
> 
> Stakeholder communication in the mining sector is challenging because technical information must be conveyed to non-technical audiences. CVCG should use clear language, avoid jargon, and ensure the document is accessible. Visual aids such as maps or charts can be helpful. The company should also consider holding community meetings alongside written communications.
> 
> Trust is important in stakeholder relationships. When trust has been broken, companies need to work harder to rebuild it. CVCG should demonstrate transparency and a genuine commitment to remediation. It should engage with the community regularly and provide updates on progress.
> 
> ESG considerations are increasingly important for mining companies. CVCG's approach to this incident will affect its reputation with investors, regulators and local communities. A well-managed communication strategy will help to mitigate reputational risk and maintain its social licence to operate.
> 
> There are various ways CVCG could structure its communication, and different approaches may be more or less suitable depending on the circumstances. The company should consider what format will work best for the Junta and what level of detail is appropriate.

### hint

> Your answer likely lists what the communication should contain, but ask yourself: have you addressed the Junta's specific reason for distrust — the broken April assurance — and explained how the new programme is structurally different rather than simply better-resourced?

### full_reveal

> The misconception typical candidates bring here is SCENARIO-FREE discussion: they produce a generic stakeholder-communication checklist — "be transparent, show commitment, provide data" — without anchoring a single point to the Junta de Regantes' actual situation, the broken April assurance, the 6,400 farming households, the OEFA escalation binary, or the 14-station monitoring regime. This is wrong not because lists are useless, but because a generic list cannot resolve the specific credibility gap the scenario creates: the Junta's distrust is not about insufficient information, it is about a named, time-bound promise that failed, and only a communication that addresses that named failure structurally — not rhetorically — gives them a principled basis to defer escalation. The correct mental model is to treat each communication element as a response to a specific Junta concern: the April failure demands explicit acknowledgement and structural differentiation, the USD 28 million figure demands translation into verifiable physical works the Junta can schedule, and the monitoring regime demands reframing as a Junta entitlement rather than a corporate assurance tool. At the Boardroom Bar, the question is not "what should the communication contain?" but "what must it do to shift the Junta's decision?" — and that requires you to weigh and reconcile the competing pressures the scenario names (restoring trust vs. avoiding OEFA escalation vs. retaining programme control) and land on a communication design that resolves them, not one that lists them.
