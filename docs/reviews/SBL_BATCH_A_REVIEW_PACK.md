# SBL Batch A — review pack

**Regenerated from `docs/rollbacks/SBL_narrative_draft_SBL-A*.json` by
`scripts/authoring/export-sbl-pack.ts`.** Spec: `docs/SBL_BATCH_A_PLAN.md`.
Evidence: `docs/evidence/SBL_FAILURE_CATALOGUE.md`.

## ⚠️ DB STATE — 1 OF 5 INSERTED

`SBL-A4` = `80b4918b-1602-46dc-a213-a4ba70cb12c4`, `status='candidate'`, `published=false`.

The other four are refused by `acca_drills_skill_chk`, which pins the skill tag to APM/AFM's four.
It admitted SBL-A4 because `scepticism` is a name SBL SHARES with AFM, and refused the four tagged
`analysis` / `evaluation` because those are SBL-only. Migration
`20260819130000_acca_drills_sbl_skill_vocabulary.sql` is written and awaits manual apply.
**No publish flip has occurred — that is a separate GATE-P act.**

**SBL-A2 was re-tagged `evaluation` → `analysis`** (Grant-ruled 2026-08-19): all six of its facts
point one way, so committing concedes nothing and evaluation is the wrong act for what the scenario
supplies. Re-gated green — the only thing that moved was the N6b arm's identity.

---

## ⚠️ FIVE THINGS TO HOLD WHILE READING

**1. N4 verified the DETERMINISTIC modes only.** `designed_bad_flags` lists only F1/F4/F5 — what
`checkRule23` raises unaided. Where a drill declares an `evidenced` mode (F7, F2, F10) the BAD
commits it and the rubric marks it, but **N4 did not prove the marker identified it**.

**2. N6 gates ONE of the five** — SBL-A4 (`scepticism`) alone runs N6b and N6c. Read
`N6 coverage:`, never `ok` alone: `ok` is true when nothing failed, and nothing can fail a check
that did not run.

**3. N6a measures LABELLING, not demand.** F10's own text names scepticism and commercial acumen —
neither `analysis` nor `evaluation`.

**4. There is no numeric verifier on this pipeline.** Every figure is a stated given with no
derivable chain. That is the structural answer, not a claim the gates checked them.

**5. The four-part development test is ACCA's own scheme** — published on one page of all seven
examiner reports, arithmetic at MJ25 p.4, SD25 p.4, MJ26 p.5. Every criterion is 2 marks and states
its 1-mark undeveloped tier.

## Confirmed BY HAND — the check N6b reports as NOT EVALUATED

- **SBL-A1** ✅ three behavioural episodes + the survey + the CFO's counter-claim; `c4` requires one
  source to bear on another. Real trade: consultation against *weeks, not months*.
- **SBL-A3** ✅✅ strongest — the 2022 study, the March 2023 pilot, the launch-day briefing failure and
  the 18-month survey. Four dated sources that dispute each other.
- **SBL-A5** ✅✅ strongest evaluation — 55% of mains unusable within eight years, a 1.8× covenant and a
  declined subsidy, against 280,000 residents at +IDR 49,500 a month. Neither side is a straw man.
- **SBL-A2** ⚠️ **fails it** — one-directional. That finding is why it is now tagged `analysis`.


---

## SBL-A1 · `A2b` · analysis · L2 · 10 marks

**verb:** identify, evaluate, and advise · **paper_code:** SBL · **status:** candidate, published=false

**Designed BAD — N4 contract:** `[F5]`  ·  **evidenced (NOT N4-verified):** `F7`

### context_text

Minh Phat Electronics JSC (MPE), a household-appliance manufacturer headquartered in Ho Chi Minh City, Vietnam, recently abandoned a three-year export push into Southeast Asian markets after cumulative losses of VND 420 billion. The board has now approved a domestic-refocus restructure: closing two overseas sales offices, redeploying 340 staff, and rebuilding the mid-market product range for Vietnamese consumers. Three behavioural episodes have been documented for CEO Nguyen Thanh Liem during the earlier export-push restructure. Episode A: Liem learned that three regional logistics hubs were underperforming. Without consulting line managers, he issued written instructions the same afternoon, naming which hubs would close and which staff would transfer, citing the need for speed. Episode B: After engineers raised concerns that a planned product range simplification would eliminate a generator line that still generated positive cash flow, Liem held a half-day workshop with the product, finance, and operations teams, shared his draft proposal, invited challenges, revised the scope based on team feedback, and then formally approved the revised plan himself. Episode C: Liem appointed a cross-functional team of eight middle managers and told them to design and implement a new domestic-sales incentive scheme, setting only a budget ceiling of VND 12 billion and a three-month deadline; he reviewed nothing until the team presented its finished scheme. The new domestic-refocus restructure now facing MPE is characterised by high staff anxiety (an internal survey records that 68% of redeployed employees feel uncertain about their new roles), a CFO who believes the 68% figure overstates real concern because the survey was voluntary and self-selecting, and a board that wants decisions taken in weeks, not months.

### question

Draft the relevant section of a briefing note for MPE's board chair that:
(i) identifies and evaluates the leadership styles that CEO Nguyen Thanh Liem demonstrated in each of the three documented episodes during the export-push restructure; and
(ii) advises which leadership style or combination of styles the board chair should ask Liem to adopt for the domestic-refocus restructure now facing MPE, with reasons.

### scenario facts

| id | kind | key | text |
|---|---|---|---|
| `f_ep_a` | entity | `Episode A` | Episode A: Liem issued unilateral written instructions on hub closures without consulting line managers |
| `f_ep_b` | entity | `Episode B` | Episode B: Liem ran a half-day workshop, shared draft, invited challenges, revised scope, then approved |
| `f_ep_c` | entity | `Episode C` | Episode C: Liem delegated the incentive scheme fully to eight middle managers with only a budget ceiling |
| `f_68pct` | figure | `68%` | 68% of redeployed employees feel uncertain about their new roles (internal survey) |
| `f_cfosceptic` | entity | `CFO` | CFO believes the 68% figure overstates real concern because the survey was voluntary and self-selecting |
| `f_speed` | constraint | `weeks, not months` | Board wants decisions taken in weeks, not months |
| `f_losses` | figure | `VND 420 billion` | Cumulative losses of VND 420 billion from the failed export push |
| `f_340staff` | figure | `340 staff` | 340 staff to be redeployed in the domestic-refocus restructure |

### requirement parts

1. (i) identify and evaluate the leadership styles in the three episodes
2. (ii) advise which style(s) to adopt for the domestic-refocus restructure

### criteria — 10 marks, 5 criteria, 2 marks each

**`c1` — 2 marks** · lo `A2b` · part: *(i) identify and evaluate the leadership styles in the three episodes*

- **anchors:** `f_ep_a`
- **disqualifiers:** `F1`, `F2`, `F5`, `F7`
- **development_required:** true

> Episode A shows a directive (autocratic) style — Liem issued written instructions on hub closures without any consultation — and a full-marks answer goes further to evaluate its significance: because no line managers were involved, speed was gained at the cost of buy-in, which is a high-stakes trade-off that could create resistance in any repeat situation. 1 mark if identified but left undeveloped.

**`c2` — 2 marks** · lo `A2b` · part: *(i) identify and evaluate the leadership styles in the three episodes*

- **anchors:** `f_ep_b`
- **disqualifiers:** `F1`, `F2`, `F5`, `F7`
- **development_required:** true

> Episode B shows a consultative style — Liem shared his draft proposal, invited challenges from product, finance and operations teams, and revised the scope before approving — and a full-marks answer evaluates its significance: the half-day workshop preserved Liem's final authority while securing technical input from those closest to the generator line's cash-flow reality, demonstrating that consultation reduced decision error without surrendering control. 1 mark if identified but left undeveloped.

**`c3` — 2 marks** · lo `A2b` · part: *(i) identify and evaluate the leadership styles in the three episodes*

- **anchors:** `f_ep_c`, `f_68pct`
- **disqualifiers:** `F1`, `F2`, `F5`, `F7`, `F10`
- **development_required:** true

> Episode C shows a delegating style — Liem gave eight middle managers full ownership of the incentive scheme, setting only a budget ceiling of VND 12 billion and reviewing nothing until completion — and a full-marks answer evaluates its suitability: delegation works where followers are capable and motivated, but a full-marks answer also cross-references the current change context: the 68% staff-anxiety figure from the domestic-refocus survey suggests that middle managers are themselves under stress, which materially limits the conditions under which a repeat of Episode C's fully hands-off approach could succeed for the new restructure. 1 mark if identified but left undeveloped.

**`c4` — 2 marks** · lo `A2b` · part: *(ii) advise which style(s) to adopt for the domestic-refocus restructure*

- **anchors:** `f_68pct`, `f_cfosceptic`
- **disqualifiers:** `F1`, `F2`, `F4`, `F5`, `F7`, `F10`
- **development_required:** true

> The CFO's belief that 68% overstates real concern because the survey was voluntary and self-selecting must be weighed against the survey figure itself: voluntary surveys systematically under-sample the least engaged and most anxious employees (who opt out), so the direction of the CFO's bias is actually the reverse of what is claimed — a voluntary survey is more likely to understate anxiety than to inflate it. A full-marks answer therefore disputes the CFO's position using this logic and concludes that 68% should be treated as a floor, not a ceiling, making high staff anxiety a confirmed driver of the recommended style. 1 mark if the tension is noted but the candidate does not resolve it or assess the direction of the bias.

**`c5` — 2 marks** · lo `A2b` · part: *(ii) advise which style(s) to adopt for the domestic-refocus restructure*

- **anchors:** `f_68pct`, `f_speed`, `f_340staff`, `f_losses`
- **disqualifiers:** `F1`, `F2`, `F4`, `F5`, `F7`, `F10`, `F11`
- **development_required:** true

> For the domestic-refocus restructure, the board should ask Liem to lead primarily through a consultative style modelled on Episode B, supplemented by selective directive action modelled on Episode A for time-critical early decisions. The consultative approach directly addresses the anxiety confirmed by the 68% figure by giving the 340 redeployed staff a visible voice, while the directive supplement satisfies the board's requirement for decisions in weeks, not months — preventing the consultative process from drifting into indecision after the organisation's credibility was already damaged by VND 420 billion of losses. 1 mark if a style is recommended but the link to both the staff-anxiety evidence and the board's time constraint is absent.


### golden GOOD (served as `model_answer`)

**Leadership style — reading the style from the behaviour**

**Briefing note — section: CEO leadership approach**
*Prepared for: Board Chair, Minh Phat Electronics JSC*

**Part (i): Styles observed in the three episodes**

In Episode A, Liem issued written instructions on hub closures the same afternoon, bypassing line managers entirely. This is a directive approach: decisions were made and communicated unilaterally. Its significance lies in what it sacrifices — without consultation, operational knowledge held by those managers was excluded, and resentment can outlast the short-term speed gained. A directive style is defensible in genuine emergencies, but using it as a default during a restructure involving large numbers of staff builds a compliance culture that inhibits the honest upward communication leaders need.

In Episode B, Liem shared his draft plan, invited technical challenge in a half-day workshop, revised the scope based on what the teams said, and retained final approval. This consultative style is more significant than it may appear: the revision of scope shows that the consultation was substantive, not performative — the engineers' point about the generator line's positive cash flow actually changed the outcome, demonstrating that Liem can update his position on evidence.

In Episode C, Liem handed eight middle managers full ownership of the new incentive scheme, setting only a budget ceiling, and reviewed nothing until completion. This is a delegating style. Delegation succeeds when the people receiving it are capable and confident. That condition matters greatly here: the 68% staff uncertainty rate recorded in the current domestic-refocus survey reveals that those same middle managers are themselves operating under significant stress, which is precisely the condition under which a hands-off approach is most likely to produce inconsistent or poorly-embedded outcomes.

**Part (ii): Recommended style for the domestic-refocus restructure**

Before advising on style, the board should resolve a factual dispute: the CFO believes the 68% figure overstates genuine anxiety because the survey was voluntary and self-selecting. That argument points in the wrong direction. Voluntary surveys systematically under-represent the employees most disengaged or most anxious — those who feel unsafe or indifferent are less likely to respond — so a voluntary, self-selecting survey is structurally more likely to produce a *lower* anxiety reading than a census would. Far from inflating the result, the voluntary design means 68% should be treated as a floor. The CFO's scepticism is not supported by the logic of survey methodology, and the board should not use it to discount what the data shows.

With that established, I recommend that Liem leads the domestic-refocus restructure primarily through the consultative approach demonstrated in Episode B, supplemented by selective directive action of the kind seen in Episode A at decision points where the board's requirement for choices in weeks, not months, would otherwise be compromised. The case for consultation is direct: 340 staff face redeployment into unfamiliar roles after a failure that cost MPE VND 420 billion, and the confirmed anxiety level demands that people are given a genuine voice rather than instructions handed down after the fact. At the same time, pure consultation without a directive backstop risks drift — Liem must be prepared to close debate and decide, as he did in Episode A, when timelines demand it. Episode C's fully delegating approach should be reserved for tasks where middle managers have high confidence and the outcome is not time-critical; it is not suited to the restructure's core decisions given the current anxiety environment.

I advise the board chair to set an explicit expectation with Liem that the default mode for the domestic-refocus programme is structured consultation with a committed decision deadline, and that unilateral direction is available as an exception — not a routine — when speed genuinely cannot wait.

### golden BAD (authoring artefact — never served)

The domestic-refocus restructure at Minh Phat Electronics JSC represents a significant strategic change following the failure of the export push, which resulted in substantial losses. Managing such a transition effectively requires a structured approach to change management, and it is useful to consider the stages through which any major organisational change must pass: from establishing urgency, through building a guiding coalition, to embedding new ways of working.

First, the organisation must communicate a compelling case for change. Employees who understand why the restructure is necessary are more likely to support it. The board should ensure that messaging around the domestic-refocus strategy is clear, consistent, and reaches all levels of the organisation.

Second, a guiding coalition should be established. Senior leaders and respected middle managers should be visibly involved in designing and delivering the restructure programme. This helps to secure buy-in and prevents the change being seen as imposed from above.

Third, short-term wins should be identified and celebrated. Quick successes in the early weeks of the restructure will help to maintain momentum and demonstrate that the new domestic focus is delivering results.

Fourth, the change must be embedded in culture. Changes to incentive structures, performance targets, and values statements should reinforce the desired behaviours for the domestic market strategy.

Leadership style is relevant to this programme and should be considered. Different situations may call for different approaches: a more directive style may suit urgent decisions, while a participative approach may be better for decisions requiring broad input. The CEO should reflect on his style and consider what best fits each stage of the change.

Overall, the restructure requires careful sequencing, strong communication, and leadership that adapts to circumstances. With a clear plan and appropriate support for employees, MPE can successfully reposition itself for the domestic market.

### hint

Your answer likely described what each leadership style is — but the requirement asks you to read the style FROM Liem's specific behaviour in each episode and then commit to a reasoned recommendation for the domestic-refocus restructure, using MPE's 68% anxiety figure and the CFO's disputed interpretation as the evidence base for your advice.

### full_reveal

The misconception this drill exposes is THE ADJACENT QUESTION: the candidate describes leadership styles in the abstract — naming and defining them correctly — rather than performing the two acts the requirement actually specifies, which are reading a style from documented behaviour and then committing to a reasoned recommendation for a named, evidence-rich situation. This costs marks for a precise causal reason: identifying a style label earns one mark; the second mark is only released when that label is anchored to what Liem actually did (for example, bypassing line managers entirely in Episode A, or revising scope based on engineers' input in Episode B) and then followed to a consequence for MPE — so a candidate who writes "Liem used a directive style, which can reduce consultation" has identified and immediately stopped, earning one where two were available. The same arithmetic applies to Part (ii): naming a recommended style is one mark, but the second requires the recommendation to be grounded in the specific conditions MPE faces — the 68% staff uncertainty rate, the CFO's methodologically flawed attempt to discount it, and the redeployment of 340 staff after a VND 420 billion loss — so that the board chair can see why this organisation, at this moment, needs that style rather than another. The fix is not to find more style labels; it is to develop each point through the four moves — weigh its significance, tie it to MPE by the information given, follow it to a consequence, and illustrate it from the episodes — because doing that once, fully, outscores listing four undeveloped labels in the same time.

### gate matrix

- N2 scenario-anchor (facts in scenario + used in reveal): PASS
- N3 generic/copy lint (reveal not scenario-restating): PASS
- N5 committed-verdict/structure: PASS
- N4-pre designed-flag raiseability (F5): PASS
- N1 rubric-coverage (reveal = full marks; every part mapped): PASS
- N4 Rule-23 (GOOD in band, BAD below + designed F-modes raised): PASS
- N6a F10 marks-share: PASS
- N6b scenario precondition (analysis, SBL): NOT EVALUATED — the precondition is material from ≥2 separately-identified sources the candidate can relate. ScenarioFact carries no source/exhibit provenance, so no structural test exists that is not a proxy wrong in both directions. Confirm by hand that the scenario carries a second source and that the rubric requires one to bear on the other
- N6c claim-anchor link: NOT EVALUATED — structurally N/A for analysis — only scepticism acts on a single identifiable asserted claim
- N6 coverage: 2 of 3 part(s) NOT EVALUATED — N6b scenario precondition (analysis, SBL); N6c claim-anchor link
- P4 jurisdiction/frozen-facts on the REVISED teaching leg: PASS
- P7 misconception-lead on the REVISED teaching leg: PASS

---

## SBL-A2 · `A2d` · analysis · L3 · 12 marks

**verb:** assess and conclude · **paper_code:** SBL · **status:** candidate, published=false

**Designed BAD — N4 contract:** `[F5]`  ·  *its evidenced mode is itself deterministic*

### context_text

Polaris Cargo Group (PCG) is a regional logistics company headquartered in Wrocław, Poland, with 1,400 employees across eight haulage depots. The board has formally committed to a strategic aim of generating 40% of group revenue from contract warehousing within four years, a significant departure from its core haulage business. Observable practices inside PCG tell a consistent story. Bonuses are awarded solely on tonnage moved and fleet utilisation rates; no incentive exists for client satisfaction scores or solution design. The three most recent depot managers to be promoted to senior operations roles all came from driving backgrounds and were selected explicitly because they "knew the road" — the promotion announcement for each cited years behind the wheel as the primary credential. In management meetings, the operations director speaks first and longest; commercial and finance colleagues have described waiting until the final ten minutes to raise non-operational topics, and on two recorded occasions the meeting ended before they could do so. When a haulage error occurs, the post-incident review focuses entirely on the sequence of physical events — what broke or who drove where — and rarely records whether the root cause involved a planning or communication failure; drivers describe these reviews as "blame-free for paperwork but not for people." The induction programme for all new hires, regardless of role, is a two-day tour of the truck fleet and depot layout, with no module on customer relationship management or warehousing operations.

### question

You are a management consultant preparing a briefing note for PCG's chief executive. Draft the section of the briefing note addressed to the chief executive that assesses how PCG's current culture would help or constrain the board's stated aim of generating 40% of revenue from contract warehousing within four years, and concludes with a reasoned judgement on whether the aim is achievable without changing that culture.

### scenario facts

| id | kind | key | text |
|---|---|---|---|
| `f_revenue_target` | figure | `40%` | the board's stated aim of 40% of group revenue from contract warehousing within four years |
| `f_bonuses` | constraint | `tonnage moved` | bonuses awarded solely on tonnage moved and fleet utilisation rates |
| `f_promotion` | entity | `years behind the wheel` | the three most recent promotions cited years behind the wheel as the primary credential |
| `f_meetings` | constraint | `final ten minutes` | commercial and finance colleagues described waiting until the final ten minutes and on two occasions the meeting ended before they could speak |
| `f_mistakes_haulage` | constraint | `blame-free for paperwork` | post-incident reviews focus entirely on physical events and rarely record planning or communication failures; drivers describe them as blame-free for paperwork but not for people |
| `f_induction` | constraint | `two-day tour` | the induction programme is a two-day tour of the truck fleet and depot layout with no module on customer relationship management or warehousing operations |

### requirement parts

1. (i) assess cultural factors that would help or constrain the warehousing aim
2. (ii) conclude with a reasoned judgement on achievability without cultural change

### criteria — 12 marks, 6 criteria, 2 marks each

**`c1` — 2 marks** · lo `A2d` · part: *(i) assess cultural factors that would help or constrain the warehousing aim*

- **anchors:** `f_bonuses`
- **disqualifiers:** `F2`, `F5`, `F10`
- **development_required:** true

> The incentive structure rewarding tonnage moved actively pulls behaviour away from the client-relationship and solution-design skills that contract warehousing demands. Full 2 marks if the candidate identifies this misalignment AND develops it by explaining the significance (incentives shape daily decisions across 1,400 employees), linking it to the specific bonus system described, explaining the consequence (staff optimise for what is measured, leaving warehousing clients under-served), and giving an example from the scenario (no incentive for client satisfaction scores). 1 mark if identified but left undeveloped.

**`c2` — 2 marks** · lo `A2d` · part: *(i) assess cultural factors that would help or constrain the warehousing aim*

- **anchors:** `f_promotion`
- **disqualifiers:** `F2`, `F5`, `F10`
- **development_required:** true

> Promoting exclusively on haulage experience — citing years behind the wheel as the primary credential — means PCG's senior pipeline carries no warehousing or commercial competence, so the leaders who would need to sponsor the new division are structurally absent. Full 2 marks if the candidate identifies this AND develops it by explaining significance (leadership shapes strategy execution), linking to the three most recent promotions described, explaining the consequence (the warehousing aim will lack internal champions with credible authority), and giving a case example (all three promotees selected for driving background). 1 mark if identified but left undeveloped.

**`c3` — 2 marks** · lo `A2d` · part: *(i) assess cultural factors that would help or constrain the warehousing aim*

- **anchors:** `f_meetings`
- **disqualifiers:** `F2`, `F5`, `F10`
- **development_required:** true

> The meeting dynamic — where commercial and finance voices are crowded into the final ten minutes and sometimes lost entirely — signals that strategic and commercial inputs are structurally subordinated to operational ones, which will suppress the cross-functional dialogue warehousing sales cycles and margin management require. Full 2 marks if the candidate identifies this AND develops it by explaining significance (decisions in meetings shape resource allocation and strategic priorities), linking to the specific pattern where non-operational colleagues described waiting until the final ten minutes, explaining the consequence (commercial opportunities in warehousing will not receive adequate board-level air-time), and noting the two recorded occasions meetings ended before commercial issues were raised. 1 mark if identified but left undeveloped.

**`c4` — 2 marks** · lo `A2d` · part: *(i) assess cultural factors that would help or constrain the warehousing aim*

- **anchors:** `f_mistakes_haulage`, `f_revenue_target`
- **disqualifiers:** `F2`, `F5`, `F10`
- **development_required:** true

> The post-incident review practice — described by drivers as blame-free for paperwork but not for people — focuses exclusively on physical sequences rather than planning or communication failures, which means PCG has no organisational learning loop for the process-design and service-recovery mistakes that are inherent in warehousing operations. Full 2 marks if the candidate identifies this AND develops it by explaining significance (warehousing is a higher-complexity, higher-interdependency service where communication failures are a primary risk), linking to the specific description of reviews that rarely record planning failures, explaining the consequence (PCG will repeat service errors with warehousing clients, damaging retention and the revenue ramp toward 40%), and using the case description of the driver reviews as an example. 1 mark if identified but left undeveloped.

**`c5` — 2 marks** · lo `A2d` · part: *(i) assess cultural factors that would help or constrain the warehousing aim*

- **anchors:** `f_induction`
- **disqualifiers:** `F2`, `F5`, `F10`
- **development_required:** true

> The induction's two-day tour of the truck fleet and depot layout — with no module on customer relationship management or warehousing operations — embeds a haulage identity in every new hire from day one, making it progressively harder to develop a commercially aware workforce as PCG scales into warehousing. Full 2 marks if the candidate identifies this AND develops it by explaining significance (induction is the primary moment when an employer signals what the organisation values), linking to the specific absence of any warehousing or CRM content in the programme, explaining the consequence (a growing headcount will arrive culturally coded for haulage, diluting any warehousing culture being built), and noting that this applies regardless of role as stated in the scenario. 1 mark if identified but left undeveloped.

**`c6` — 2 marks** · lo `A2d` · part: *(ii) conclude with a reasoned judgement on achievability without cultural change*

- **anchors:** `f_revenue_target`, `f_bonuses`, `f_mistakes_haulage`
- **disqualifiers:** `F2`, `F4`, `F5`, `F10`, `F11`
- **development_required:** true

> The candidate must come down with a committed judgement — not a balance — that the 40% warehousing revenue target is not achievable within four years without deliberate cultural change, weighing the compounding nature of the constraints (incentives, leadership pipeline, meeting dynamics, learning failures, and induction all point the same way) against any reasonable upside, and naming what PCG trades away if it pursues the target without change (credibility with warehousing clients, retention of commercially skilled hires, and the ability to learn from early mistakes). Full 2 marks if the candidate makes this explicit verdict AND develops it by explaining why the constraints are mutually reinforcing rather than individually addressable, linking the verdict to at least two specific artefacts from the scenario, and forecasting the consequence of inaction (the organisation drifts toward revenue targets on paper while haulage norms persist in practice). 1 mark if a judgement is offered but it remains hedged or undeveloped.


### golden GOOD (served as `model_answer`)

**Culture and strategy — what the artefacts reveal about what is possible**

**Briefing Note — Section 3: Cultural Readiness for the Warehousing Strategy**
*Addressed to: Chief Executive, Polaris Cargo Group*

**Incentive misalignment**
PCG's entire bonus architecture is built around tonnage moved and fleet utilisation — neither of which has any bearing on the client intimacy and bespoke solution design that warehousing contracts require. This is not a peripheral issue: incentives govern what 1,400 employees prioritise every working day, and as long as no reward attaches to client satisfaction, staff will rationally deprioritise it. Warehousing clients will notice.

**Leadership pipeline**
The three most recent promotions to senior operations roles were justified explicitly by years behind the wheel. PCG therefore has no internal senior cohort with warehousing or commercial credentials — the very people who would need to sponsor, protect and resource a new division simply do not exist in the hierarchy. Without them, the warehousing strategy will be administratively approved but operationally orphaned.

**Suppression of commercial voice**
Commercial and finance colleagues have described being confined to the final ten minutes of management meetings, and on two recorded occasions the meeting ended before they could contribute. A warehousing business demands cross-functional decision-making on pricing, SLAs and client retention; a structure that systematically silences these inputs will generate poor decisions precisely where margin is made or lost.

**Absent learning loops**
Post-incident reviews — described as blame-free for paperwork but not for people — record only physical sequences, never planning or communication failures. Warehousing is operationally more interdependent than haulage; service errors will recur unless root-cause analysis spans the full process. Each unlearned mistake erodes client confidence and delays the revenue ramp toward 40%.

**Induction as cultural coding**
The two-day tour of the truck fleet that greets every new hire — regardless of role — contains no warehousing or CRM content. Every cohort therefore arrives pre-configured for a haulage identity. As PCG recruits for warehousing growth, this programme will continuously dilute any emerging warehousing culture.

**Judgement on achievability**
These five constraints are not independent; they are mutually reinforcing. The bonus system selects for haulage behaviour; promotion criteria ensure haulage thinkers lead; meeting dynamics prevent commercial challenge; incident reviews prevent learning; and induction reproduces the cycle. Pursuing a 40% warehousing revenue target on top of this architecture carries a predictable outcome: the commercial pipeline will open, early contracts will underperform, commercially skilled hires will leave when they find their concerns crowded into the final ten minutes, and the organisation will drift toward the target on paper while haulage norms govern practice. The cost of that drift — damaged client relationships, unlearned service failures traced back to blame-free for paperwork reviews, and a leadership vacuum in the new division — outweighs the disruption of deliberate cultural change. I recommend that the board treats cultural reform as a precondition of the warehousing strategy, not a parallel workstream, and that the first visible signal of that reform is a redesigned incentive scheme that gives tonnage moved and client satisfaction equal weight in the bonus calculation.

### golden BAD (authoring artefact — never served)

**Cultural Factors Affecting PCG's Warehousing Strategy**

The cultural web is a widely used model for analysing organisational culture. It consists of six elements: stories, rituals and routines, symbols, organisational structure, control systems, and power structures. Each element shapes how an organisation behaves and can either support or hinder a strategic change.

**Stories** are the narratives that circulate within an organisation and reinforce what is valued. If PCG's stories celebrate operational achievement, new staff will understand that operations is what matters most.

**Rituals and routines** refer to the day-to-day behaviours that signal cultural priorities. Organisations with strong operational routines may find it difficult to shift toward service-oriented behaviours when a new strategy demands it.

**Control systems** include the measurement and reward mechanisms that govern behaviour. Where rewards are narrowly focused, employees will concentrate on the rewarded activity. Broadening the control system to include new metrics can signal a strategic shift.

**Organisational structure** determines who has authority and how decisions are made. A structure dominated by a single function can marginalise others and slow decision-making in areas that require cross-functional input.

**Power structures** reflect who holds real influence in an organisation. When power is concentrated in one area, strategic initiatives that require different capabilities may struggle to gain traction.

**Symbols** include the visible signals — offices, titles, events — that communicate what an organisation values.

In conclusion, PCG would need to consider all six elements of the cultural web if it wishes to achieve its warehousing ambitions. Cultural change is complex and requires attention to multiple factors simultaneously. The board should assess each element carefully before proceeding.

### hint

Your answer identifies cultural factors in the abstract — check whether each point is anchored to a specific PCG artefact (the bonus architecture, the promotion criteria, the ten-minute meeting slot, the blame-free reviews, the fleet induction) and then followed through to a concrete consequence for the warehousing target.

### full_reveal

The misconception this drill exposes is generic theory: the candidate correctly names cultural concepts — misaligned incentives, leadership pipeline gaps, siloed communication — but describes them as they would appear in any organisation, never binding them to the specific artefacts PCG's briefing material provides. That is why the marks are lost: the examiner is not rewarding cultural literacy in the abstract; they are rewarding the act of reading PCG's evidence and committing to what it means for this board's specific 40% target. The two-mark rule makes the arithmetic visible — identify that PCG's bonuses are built around tonnage moved (one mark), then develop it: because no reward currently attaches to client satisfaction, 1,400 employees will rationally deprioritise warehousing clients, and the revenue ramp toward 40% is likely to stall as early contracts underperform and commercially skilled hires leave (second mark). Each of the four development moves — weighing significance, tying the point to PCG by name using the information given, following it to a consequence, and illustrating from the case — can be executed in two or three sentences; a candidate writing only identification-level points must find twice as many of them in the same time to reach the same total.

### gate matrix

- N2 scenario-anchor (facts in scenario + used in reveal): PASS
- N3 generic/copy lint (reveal not scenario-restating): PASS
- N5 committed-verdict/structure: PASS
- N4-pre designed-flag raiseability (F5): PASS
- N1 rubric-coverage (reveal = full marks; every part mapped): PASS
- N4 Rule-23 (GOOD in band, BAD below + designed F-modes raised): PASS
- N6a F10 marks-share: PASS
- N6b scenario precondition (analysis, SBL): NOT EVALUATED — the precondition is material from ≥2 separately-identified sources the candidate can relate. ScenarioFact carries no source/exhibit provenance, so no structural test exists that is not a proxy wrong in both directions. Confirm by hand that the scenario carries a second source and that the rubric requires one to bear on the other
- N6c claim-anchor link: NOT EVALUATED — structurally N/A for analysis — only scepticism acts on a single identifiable asserted claim
- N6 coverage: 2 of 3 part(s) NOT EVALUATED — N6b scenario precondition (analysis, SBL); N6c claim-anchor link
- P4 jurisdiction / frozen-facts (hint + full_reveal): PASS
- P7 misconception-lead (full_reveal carries a real "...misconception...: " sentence): PASS

---

## SBL-A3 · `A1a` · analysis · L3 · 12 marks

**verb:** assess and compare · **paper_code:** SBL · **status:** candidate, published=false

**Designed BAD — N4 contract:** `[F4]`  ·  **evidenced (NOT N4-verified):** `F2`

### context_text

Kilimo Digital Co-operative ("Kilimo") is a national agricultural co-operative headquartered in Nairobi, Kenya, with 340,000 smallholder members spread across six regions. In 2022, the board commissioned a strategic study into cashless payments for the co-operative's crop-purchase cycle. The study team spent eight months conducting farmer surveys, mapping cash-handling costs, and benchmarking neighbouring co-operatives; it concluded that a mobile-payment platform called PayHarvest could reduce disbursement costs by 31% and reach 280,000 digitally active members within two years. The board unanimously endorsed the findings and approved a KES 420 million budget. Before the national rollout, Kilimo ran a 90-day pilot in Meru County covering 4,200 members; the pilot report, published internally in March 2023, recorded that only 38% of pilot farmers successfully completed a transaction without staff assistance, and specifically recommended that a dedicated regional-liaison role be created in each of the six regions before any wider launch. Despite the pilot report's recommendation, no regional-liaison roles were ever assigned. The national rollout began in September 2023; at launch, regional managers in four of the six regions confirmed they had received no prior briefing on PayHarvest and learned of the platform only through a circular sent on launch day. Eighteen months after launch, only 94,000 members — 33% of the 280,000 target — had successfully used PayHarvest, and a post-implementation survey found that 61% of non-adopting members cited "lack of on-the-ground support" as the principal barrier.

### question

Draft the section of the board's post-implementation review report addressed to Kilimo's Chair of the Board that assesses the leadership contribution to:

(i) the formulation of the PayHarvest strategy; and
(ii) the implementation of the PayHarvest strategy.

Your assessment should compare the two phases and explain what that comparison reveals about where Kilimo's leadership weakness actually lies.

### scenario facts

| id | kind | key | text |
|---|---|---|---|
| `f_budget` | figure | `KES 420 million` | KES 420 million board-approved budget |
| `f_target` | figure | `280,000` | target of 280,000 digitally active members within two years |
| `f_pilot_rate` | figure | `38%` | only 38% of pilot farmers completed a transaction without staff assistance |
| `f_pilot_rec` | constraint | `regional-liaison role` | pilot report recommended a dedicated regional-liaison role in each of the six regions |
| `f_no_roles` | constraint | `no regional-liaison roles were ever assigned` | no regional-liaison roles were ever assigned |
| `f_briefing` | figure | `four of the six regions` | regional managers in four of the six regions received no prior briefing |
| `f_adoption` | figure | `94,000` | only 94,000 members — 33% of the 280,000 target — had successfully used PayHarvest |
| `f_barrier` | figure | `61%` | 61% of non-adopting members cited lack of on-the-ground support as principal barrier |

### requirement parts

1. (i) assess leadership contribution to formulation
2. (ii) assess leadership contribution to implementation
3. (iii) compare the two phases and explain what the comparison reveals

### criteria — 12 marks, 6 criteria, 2 marks each

**`c1` — 2 marks** · lo `A1a` · part: *(i) assess leadership contribution to formulation*

- **anchors:** `f_budget`, `f_target`
- **disqualifiers:** `F1`, `F2`, `F5`, `F6`
- **development_required:** true

> Leadership demonstrated sound strategic direction during formulation: the board commissioned a rigorous eight-month study, grounded the 280,000 member target in survey and benchmarking evidence, and committed KES 420 million — showing that leaders were willing to allocate significant resources to a validated opportunity. A full two marks require the candidate to assess why this matters for Kilimo specifically: because co-operatives depend on member trust, a methodology that consulted farmers directly reduced the risk of adopting a solution misaligned with members' actual payment behaviour — the consequence being that the strategic case arrived at the board free of the fatal analytical gaps that sink many digital-inclusion initiatives. 1 mark if identified but left undeveloped.

**`c2` — 2 marks** · lo `A1a` · part: *(i) assess leadership contribution to formulation*

- **anchors:** `f_pilot_rate`, `f_pilot_rec`
- **disqualifiers:** `F1`, `F2`, `F5`, `F6`
- **development_required:** true

> The pilot in Meru County represents a leadership decision to test before scaling — a formulation-phase discipline that itself generated the 38% unassisted-completion finding and the explicit regional-liaison role recommendation. A full two marks require the candidate to assess the significance of this act: commissioning the pilot shows leaders understood that a 340,000-member rollout carried adoption risk, and by publishing the March 2023 report internally they placed actionable, organisation-specific intelligence in the hands of those who would plan the rollout. 1 mark if identified but left undeveloped.

**`c3` — 2 marks** · lo `A1a` · part: *(ii) assess leadership contribution to implementation*

- **anchors:** `f_no_roles`, `f_pilot_rate`
- **disqualifiers:** `F1`, `F2`, `F5`, `F6`, `F10`
- **development_required:** true

> Leadership failed at the most basic accountability task during implementation: no regional-liaison roles were ever assigned, despite the pilot report's explicit recommendation. A full two marks require the candidate to assess why this omission was particularly damaging for Kilimo: with 340,000 members spread across six regions — many with low digital literacy, as the 38% unassisted-completion rate implied — human intermediaries were not optional extras but the mechanism through which adoption was supposed to reach 280,000 members. The consequence was a structural gap between Nairobi-based leadership and the farming communities the platform was meant to serve, which no circular or digital nudge could bridge. 1 mark if identified but left undeveloped.

**`c4` — 2 marks** · lo `A1a` · part: *(ii) assess leadership contribution to implementation*

- **anchors:** `f_briefing`, `f_barrier`
- **disqualifiers:** `F1`, `F2`, `F5`, `F6`, `F10`
- **development_required:** true

> Communication governance was absent: four of the six regional managers learned of PayHarvest only on launch day, via a circular. A full two marks require the candidate to assess the consequence: regional managers are the co-operative's primary conduit to farmers, and their being bypassed meant there was no one positioned to translate the platform to members at the moment of greatest adoption potential — launch. The result is directly traceable in the outcome data: 61% of non-adopting members citing lack of on-the-ground support is a post-hoc confirmation of exactly the support vacuum that briefing those four regions before launch would have begun to fill. 1 mark if identified but left undeveloped.

**`c5` — 2 marks** · lo `A1a` · part: *(iii) compare the two phases and explain what the comparison reveals*

- **anchors:** `f_pilot_rec`, `f_no_roles`, `f_adoption`
- **disqualifiers:** `F1`, `F2`, `F4`, `F5`, `F10`
- **development_required:** true

> Placing formulation and implementation side by side reveals that the leadership failure was not analytical but executional: the same board that funded an eight-month study and designed a pilot generating the regional-liaison role recommendation then allowed that recommendation to go unimplemented, meaning the organisation's own internal evidence — the 38% completion rate and the explicit pilot-report instruction — was overridden by inaction. This cross-phase analysis disputes any narrative that Kilimo's leadership lacked strategic capability; the capability existed and produced correct conclusions. What failed was the translation of those conclusions into assigned roles, briefed managers and owned outcomes. A full two marks require the candidate to name this gap explicitly and use the juxtaposition of formulation-phase rigour against implementation-phase inaction to show that the problem is selective rather than systemic. 1 mark if identified but left undeveloped.

**`c6` — 2 marks** · lo `A1a` · part: *(iii) compare the two phases and explain what the comparison reveals*

- **anchors:** `f_adoption`, `f_barrier`, `f_pilot_rec`
- **disqualifiers:** `F1`, `F2`, `F4`, `F5`, `F10`
- **development_required:** true

> The outcome figures corroborate the analytical conclusion from the cross-phase comparison: 94,000 actual users against a 280,000 target — a 67% shortfall — maps directly onto the absence of the regional-liaison infrastructure the pilot said was necessary. A full two marks require the candidate to use these two data points together: the 61% barrier-attribution to 'lack of on-the-ground support' is not a separate finding but a member-level echo of the pilot's own recommendation, confirming that the barrier members experienced in 2024 was the same barrier the pilot identified in 2023 and leadership chose not to address. That coherence between prediction and outcome shows the leadership weakness was not one of foresight but of follow-through. 1 mark if identified but left undeveloped.


### golden GOOD (served as `model_answer`)

**Leadership in formulation and in implementation — the same strategy, two halves**

**Post-Implementation Review — Leadership Assessment: PayHarvest**
*To: Chair of the Board, Kilimo Digital Co-operative*

**Phase I — Formulation**

Kilimo's leadership performed well in the formulation phase, and the board deserves credit for both the quality of the process it commissioned and the commercial courage it showed in committing KES 420 million on the back of that process. An eight-month study combining farmer surveys, internal cost mapping, and competitive benchmarking is substantive by any standard; for a co-operative whose legitimacy rests on member trust, a methodology that placed farmers' own payment behaviour at the centre of the analysis materially reduced the risk of misalignment between the platform and the people it was meant to serve. The 280,000 member target was not an aspiration plucked from thin air — it was anchored in evidence about digital readiness across the membership.

The decision to run a 90-day pilot before national launch reinforces this assessment. That discipline produced the 38% unassisted-completion finding — a number that, on its own, signals that adoption would not be self-sustaining without structured support — and the pilot report translated that finding into an unambiguous operational instruction: create a regional-liaison role in each of the six regions before wider rollout. Formulation-phase leadership, in short, did exactly what it should have done: it generated specific, testable intelligence and put it in writing.

**Phase II — Implementation**

The implementation phase tells an entirely different story, and the contrast is sharp enough to identify where Kilimo's leadership problem actually resides. No regional-liaison roles were ever assigned. This was not a resource question — the board had already approved KES 420 million — it was an accountability failure: nobody was designated to own the instruction the pilot had issued. For a co-operative with 340,000 members dispersed across six geographically distinct regions, and in the knowledge that only 38% of pilot farmers could transact without assistance, the regional-liaison role was not a refinement; it was the mechanism through which 280,000 adoptions were meant to happen. Removing it from the implementation plan was effectively removing the engine.

The communication failure compounds this: regional managers in four of the six regions learned of PayHarvest through a launch-day circular. Regional managers are the co-operative's primary conduit to its farming members; informing them after the fact rather than engaging them as implementation partners left the organisation with no one positioned to champion the platform in the field at the moment of peak adoption opportunity. The outcome figures confirm the damage: 94,000 active users against a 280,000 target — a gap of 186,000 members — and a post-implementation survey in which 61% of non-adopters attributed their non-adoption to lack of on-the-ground support. That 61% is not a new finding; it is a member-level echo of what the pilot said in March 2023. The barrier members reported experiencing in 2024 is the same barrier leadership was warned about a year earlier and did not act on.

**What the Comparison Reveals**

Setting the two phases alongside each other settles one question and raises another. The question it settles is whether Kilimo's leadership lacked strategic capability — it did not. The board commissioned rigorous analysis, synthesised it correctly, and generated a well-evidenced opportunity. The question it raises is why leadership that demonstrated that quality of foresight then allowed its own pilot's conclusions to go unimplemented. The 38% completion rate and the regional-liaison role recommendation were not buried in appendices; they were the pilot's headline outputs. The failure is therefore not one of analytical capacity but of executional accountability — no assigned owners, no pre-briefed regional managers, no mechanism for translating strategy into operational behaviour at the community level.

I recommend that the Chair table a governance resolution requiring, for every future initiative of comparable scale, that implementation-phase role assignments be approved by the board as a precondition of launch authorisation — so that the quality of analysis Kilimo demonstrably produces is matched by the accountability structure needed to act on it.

### golden BAD (authoring artefact — never served)

**Leadership Assessment: PayHarvest**

**Formulation Phase**

The leadership team conducted an eight-month strategic study before approving the PayHarvest platform. The board approved a budget of KES 420 million and set a target of 280,000 members. A pilot was run in Meru County before the national rollout, and the pilot report identified issues with unassisted transaction completion.

**Implementation Phase**

During implementation, no regional-liaison roles were assigned as the pilot had recommended. Regional managers in four of the six regions were not briefed before launch. Eighteen months after launch, only 94,000 members had used PayHarvest, against a target of 280,000. A post-implementation survey found that 61% of non-adopting members cited lack of on-the-ground support.

**Comparison**

The formulation phase appears to have been handled more effectively than the implementation phase. Leadership invested time and resources in analysis but did not follow through on the operational steps needed. There are questions about whether the governance processes were sufficient to bridge strategy and execution.

### hint

You have likely identified that leadership failed in implementation — but the requirement asks you to compare both phases and explain what that contrast reveals about where the weakness actually lies, so ask yourself whether you have weighed the significance of what the pilot's 38% completion finding and the unassigned regional-liaison roles together tell the Chair about the nature of the failure.

### full_reveal

The misconception this drill exposes is undeveloped points: the candidate correctly identifies a leadership failure — most often the missing regional-liaison roles or the late communication to regional managers — and then stops, treating the identification itself as the completed answer when it is only the first of two steps that earn the mark. Under the two-mark rule, a point identified and left there earns one mark; the second mark is released only when the candidate does all four of the following in the time available: states how significant the failure is (the regional-liaison role was not a refinement — it was the delivery mechanism for 280,000 adoptions), ties it to Kilimo's specific situation using the information given (a co-operative dispersed across six regions whose pilot had already shown only 38% of farmers could transact unaided), follows it to a consequence for the organisation (the 61% of non-adopters who cited lack of on-the-ground support in the post-implementation survey are a member-level echo of a warning leadership received and did not act on), and illustrates it with a fact from the case (regional managers in four of the six regions learned of PayHarvest through a launch-day circular, leaving no one positioned to champion the platform at the moment of peak adoption opportunity). Writing more undeveloped points is not the fix — a candidate whose points are all single-mark must find twice as many of them in the same time to reach the same total, which is an arithmetic trap, not a writing style preference. The deeper reframe this drill demands is that the comparison between phases is the analytical act the requirement is actually testing: formulation-phase leadership demonstrably generated rigorous, evidence-based intelligence, so the failure is not one of strategic capability but of executional accountability — and a candidate who never sets the two phases alongside each other never produces that conclusion, regardless of how many individual failures they list.

### gate matrix

- N2 scenario-anchor (facts in scenario + used in reveal): PASS
- N3 generic/copy lint (reveal not scenario-restating): PASS
- N5 committed-verdict/structure: PASS
- N4-pre designed-flag raiseability (F4): PASS
- N1 rubric-coverage (reveal = full marks; every part mapped): PASS
- N4 Rule-23 (GOOD in band, BAD below + designed F-modes raised): PASS
- N6a F10 marks-share: PASS
- N6b scenario precondition (analysis, SBL): NOT EVALUATED — the precondition is material from ≥2 separately-identified sources the candidate can relate. ScenarioFact carries no source/exhibit provenance, so no structural test exists that is not a proxy wrong in both directions. Confirm by hand that the scenario carries a second source and that the rubric requires one to bear on the other
- N6c claim-anchor link: NOT EVALUATED — structurally N/A for analysis — only scepticism acts on a single identifiable asserted claim
- N6 coverage: 2 of 3 part(s) NOT EVALUATED — N6b scenario precondition (analysis, SBL); N6c claim-anchor link
- P4 jurisdiction/frozen-facts on the REVISED teaching leg: PASS
- P7 misconception-lead on the REVISED teaching leg: PASS

---

## SBL-A4 · `A3d` · scepticism · L3 · 10 marks

**verb:** assess and recommend · **paper_code:** SBL · **status:** candidate, published=false

**Designed BAD — N4 contract:** `[F4]`  ·  **evidenced (NOT N4-verified):** `F10`

### context_text

Constructora Palomino S.A. ("Palomino"), a Colombian listed construction and infrastructure group, bids regularly for public-sector contracts worth hundreds of millions of Colombian pesos. Over the past three years, Palomino has retained Gestoría Cívica Ltda ("Gestoría"), a government-relations consultancy, under an annual retainer of COP 480 million. Gestoría is co-owned by the brother-in-law of Palomino's chief procurement officer ("CPO"), who chairs the internal panel that scores and recommends public-contract bids. The CPO disclosed the family connection to Palomino's board at the time the retainer was first agreed, and the board recorded it in the minutes but took no further action. When Palomino's external auditors raised the arrangement during the current-year review, Finance Director Alejandra Ríos stated: "The retainer of COP 480 million is fully disclosed and sits comfortably within applicable procurement rules, so there is no ethical issue to address." No independent review of the scoring panel's decisions has been taken place since the retainer began, and Palomino's code of conduct requires annual conflict-of-interest declarations but does not mandate recusal from decisions where a conflict exists.

### question

Draft the section of the external auditors' briefing note for Palomino's audit committee chair that:
(i) assesses the ethical threats that the consultancy retainer arrangement creates for Palomino; and
(ii) recommends safeguards that the board should adopt to prevent or mitigate those threats.

### scenario facts

| id | kind | key | text |
|---|---|---|---|
| `f_retainer` | figure | `COP 480 million` | The annual retainer paid to Gestoría Cívica Ltda of COP 480 million |
| `f_assertion` | constraint | `no ethical issue to address` | Finance Director Ríos's assertion that the arrangement is 'fully disclosed and sits comfortably within applicable procurement rules, so there is no ethical issue to address' |
| `f_cpo_role` | constraint | `chairs the internal panel` | The CPO chairs the internal scoring panel that recommends public-contract bids |
| `f_family_link` | entity | `brother-in-law` | Gestoría is co-owned by the brother-in-law of the CPO |
| `f_no_recusal` | constraint | `does not mandate recusal` | Palomino's code of conduct requires annual declarations but does not mandate recusal from decisions where a conflict exists |
| `f_no_review` | constraint | `no independent review` | No independent review of the scoring panel's decisions has taken place since the retainer began |

### requirement parts

1. (i) assess the ethical threats the arrangement creates
2. (ii) recommend safeguards

### criteria — 10 marks, 5 criteria, 2 marks each

**`c1` — 2 marks** · lo `A3d` · part: *(i) assess the ethical threats the arrangement creates*

- **anchors:** `f_retainer`, `f_assertion`, `f_cpo_role`, `f_family_link`
- **disqualifiers:** `F1`, `F2`, `F5`, `F10`
- **development_required:** true

> The self-interest threat is severe and currently uncontrolled: because the CPO chairs the internal panel that scores contract bids while the COP 480 million retainer flows to a firm co-owned by his brother-in-law, the CPO has a direct and continuing financial incentive to favour Gestoría-related outcomes, meaning that every bid recommendation Palomino makes while this arrangement persists is potentially compromised. Director Ríos's claim that there is 'no ethical issue to address' cannot be accepted merely because the payment is disclosed: disclosure records a conflict but does not neutralise it, and the absence of recusal requirements means the CPO's influence over bid scoring is unchecked regardless of what the rules permit on paper. 1 mark if the self-interest threat is identified but the candidate does not challenge the 'no ethical issue to address' assertion or does not link it to the CPO's ongoing scoring role.

**`c2` — 2 marks** · lo `A3d` · part: *(i) assess the ethical threats the arrangement creates*

- **anchors:** `f_no_review`, `f_cpo_role`
- **disqualifiers:** `F1`, `F2`, `F5`
- **development_required:** true

> The self-review threat is material: because no independent review of the scoring panel's decisions has taken place since the retainer began, the same individual whose family connection creates the conflict is implicitly endorsing the adequacy of the process he controls, making it impossible for Palomino — or its auditors — to verify that bid recommendations have been made on merit. This matters acutely for a listed group dependent on public contracts, where any subsequent investigation could trigger debarment or reputational damage severe enough to threaten the business. 1 mark if the self-review element is identified but the candidate does not explain why the absence of independent review compounds rather than simply adds to the self-interest threat.

**`c3` — 2 marks** · lo `A3d` · part: *(i) assess the ethical threats the arrangement creates*

- **anchors:** `f_assertion`, `f_retainer`
- **disqualifiers:** `F1`, `F2`, `F5`, `F10`
- **development_required:** true

> The intimidation threat to auditors must also be assessed: Finance Director Ríos's assertion that there is 'no ethical issue to address' — made specifically when external auditors raised the arrangement — creates pressure on the audit team to drop the matter, which itself undermines audit independence and is an ethical threat that Palomino's board needs to recognise and actively counteract. The significance is that if auditors yield to that pressure, a listed Colombian company could be filing accounts that fail to disclose a material related-party arrangement. 1 mark if the intimidation element is noted but the candidate does not identify the Finance Director's statement as the source or does not connect it to the listed-company disclosure obligation.

**`c4` — 2 marks** · lo `A3d` · part: *(ii) recommend safeguards*

- **anchors:** `f_no_recusal`, `f_assertion`, `f_retainer`
- **disqualifiers:** `F1`, `F2`, `F4`, `F5`, `F10`
- **development_required:** true

> The most urgent safeguard is mandatory recusal: the code of conduct does not mandate recusal from decisions where a conflict exists, so the board must amend it immediately to require the CPO to stand aside from every scoring panel session in which Gestoría or its principals have any interest, replacing him with an independent evaluator. This directly addresses the self-interest threat at source rather than merely recording it; without this change, disclosure alone — as Director Ríos implies is sufficient — leaves the conflict active and Palomino's bid integrity in doubt on every subsequent contract. 1 mark if recusal is recommended but the candidate does not identify the code's current gap or does not explain why disclosure without recusal is insufficient.

**`c5` — 2 marks** · lo `A3d` · part: *(ii) recommend safeguards*

- **anchors:** `f_no_review`, `f_cpo_role`
- **disqualifiers:** `F1`, `F2`, `F4`, `F5`
- **development_required:** true

> An independent retrospective review of all scoring-panel decisions taken since the retainer began should be commissioned: the fact that no independent review has taken place means the board cannot currently attest that any bid was awarded on merit, which is a specific legal and reputational risk for a listed group. The review should be conducted by a party with no connection to Gestoría, the CPO, or Gestoría's co-owners, and its findings should be reported directly to the audit committee rather than through management. 1 mark if an independent review is recommended but the candidate does not specify its scope, independence requirement, or reporting line.


### golden GOOD (served as `model_answer`)

**Ethical threats — testing "within the rules"**

**Briefing Note — Section: Ethical Threats and Recommended Safeguards**
**To: Chair, Audit Committee, Constructora Palomino S.A.**

**(i) Assessment of ethical threats**

The arrangement creates a self-interest threat of high severity. Gestoría Cívica Ltda is co-owned by the brother-in-law of the very officer who chairs the internal panel that evaluates and recommends Palomino's public-contract bids. The COP 480 million annual retainer gives that officer's family a continuing financial stake in Palomino's commercial decisions — meaning each bid recommendation carries an undisclosed incentive to perpetuate the relationship, regardless of merit. Finance Director Ríos asserted that there is "no ethical issue to address" on the grounds that the payment is disclosed; that claim does not withstand scrutiny. Disclosure records the existence of a conflict; it does not neutralise the CPO's ongoing influence over outcomes. Because Palomino's code of conduct does not mandate recusal from decisions where a conflict exists, the CPO retains full scoring authority, and the disclosure is procedurally hollow. The assertion must therefore be challenged: compliance with procurement rules on paper says nothing about whether the CPO's judgement is, or reasonably appears to be, independent.

A compounding self-review threat arises because no independent review of the scoring panel's decisions has taken place since the retainer began. The CPO, whose conduct is in question, has in effect been left to validate his own process. For a listed construction group whose revenue depends on public contracts, this creates acute legal and reputational exposure: any regulatory investigation would find a three-year gap in independent oversight that management cannot explain.

Finally, when Director Ríos directed the auditors to treat the matter as closed, she created an intimidation threat to audit independence. If the audit team accepts that framing, Palomino's disclosures may fail to capture a material related-party arrangement — a direct risk to listed-company reporting obligations.

**(ii) Recommended safeguards**

First, the board must amend the code of conduct immediately to introduce mandatory recusal: because the code does not mandate recusal from decisions where a conflict exists, the CPO can continue to chair the internal panel even after disclosure, which makes the self-interest threat live on every subsequent bid. The amendment should require any panel member with a direct or indirect financial connection to an engaged consultancy to stand aside and be replaced by an evaluator with no such connection.

Second, I recommend that the audit committee commission an independent retrospective review of all scoring-panel decisions made since the COP 480 million retainer began. Because no independent review has taken place, the committee cannot currently confirm that any bid was assessed on merit. The reviewer must have no connection to Gestoría, its co-owners, or the CPO, and must report directly to the audit committee — not through the Finance Director — to prevent any repetition of the pressure already applied to the audit team.

I recommend that the audit committee escalate both safeguards to the full board for approval at the next scheduled meeting and decline to sign off the current-year audit without written confirmation that recusal provisions will be enacted before the next bid cycle.

### golden BAD (authoring artefact — never served)

**To: Audit Committee Chair**

**Re: Retainer arrangement — ethical considerations**

The following questions arise from the retainer arrangement with Gestoría Cívica Ltda.

Has the board considered whether the CPO's family connection to Gestoría creates a self-interest threat? The CPO chairs the internal panel and his brother-in-law co-owns the consultancy. Is it clear that a disclosed conflict is the same as a managed one? Finance Director Ríos has stated that the retainer is fully disclosed, but should the committee not ask whether disclosure alone is sufficient to address an ethical threat?

Is it not the case that, because no independent review of scoring decisions has taken place, there may be a self-review concern? Should the committee not consider commissioning some form of oversight? And given that Palomino's code requires annual declarations but does not mandate recusal, is there not a gap in the current framework that merits attention?

When Director Ríos told the auditors there was no ethical issue, should the committee not consider whether this placed any pressure on the audit team? Could this be seen as an intimidation concern? Is the committee satisfied that audit independence has been maintained?

In terms of safeguards, has management thought about recusal requirements? Is an independent review something the board might wish to consider? Would it not be worth reviewing the code of conduct to see whether the current wording is adequate?

These are matters the committee may wish to explore further with management and legal counsel before reaching any view.

### hint

Your response raises the right concerns about the CPO's conflict and Director Ríos's assertion — but check whether you stated a conclusion about each threat or only asked the audit committee chair whether one might exist.

### full_reveal

The misconception this drill exposes is SCEPTICISM AS QUESTIONS: the candidate believes that surfacing a doubt — "has the board considered whether the CPO's judgement is truly independent?" — is itself the sceptical act, when in fact the examiner requires a committed, evidenced assessment delivered as a professional conclusion. Posing a question transfers the analytical burden to the reader; the briefing note exists precisely so the reader does not have to do that work, and the examiner awards nothing for a concern that is never resolved. The correct mental model is that scepticism is a two-stage act: you state what the evidence shows (the COP 480 million retainer gives the CPO's brother-in-law a continuing financial stake in every bid recommendation) and then you commit to what that means for Palomino (the disclosure Director Ríos cites records the conflict's existence but leaves the CPO's scoring authority intact, so the self-interest threat is live on every subsequent bid — not merely possible). Anchoring that committed conclusion to the two-mark rule: identifying the self-interest threat earns one mark; developing it — weighting its severity, tying it to the CPO's unchanged panel authority and Palomino's dependence on public-contract revenue, and following it to the consequence that three years of bid decisions are currently unreviable — earns the second, and a response built entirely on unresolved questions earns neither development mark on any point, forcing the candidate to find twice as many points in the same time to reach the same total.

### gate matrix

- N2 scenario-anchor (facts in scenario + used in reveal): PASS
- N3 generic/copy lint (reveal not scenario-restating): PASS
- N5 committed-verdict/structure: PASS
- N4-pre designed-flag raiseability (F4): PASS
- N1 rubric-coverage (reveal = full marks; every part mapped): PASS
- N4 Rule-23 (GOOD in band, BAD below + designed F-modes raised): PASS
- N6a F10 marks-share: PASS
- N6b scenario precondition (scepticism): PASS
- N6c claim-anchor link: PASS
- N6 coverage: every part evaluated
- P4 jurisdiction/frozen-facts on the REVISED teaching leg: PASS
- P7 misconception-lead on the REVISED teaching leg: PASS

---

## SBL-A5 · `A3a` · evaluation · L3 · 10 marks

**verb:** evaluate and commit to a verdict · **paper_code:** SBL · **status:** candidate, published=false

**Designed BAD — N4 contract:** `[F1, F4]`  ·  *its evidenced mode is itself deterministic*

### context_text

Tirta Nusantara Tbk ("Tirta") is an Indonesian listed water utility serving Kota Pesisir, a coastal city whose population has grown by 34% over the past decade to 2.1 million residents. The company currently supplies 310,000 household connections, of which 78,000 — serving roughly 280,000 lower-income residents in the city's eastern districts — pay a subsidised "social tariff" of IDR 1,850 per cubic metre.

In March 2025 the Board approved the Coastal Resilience Upgrade (CRU), a five-year capital programme costing IDR 4.2 trillion in total. The CRU will replace 620 km of ageing saltwater-infiltrated mains, install a desalination booster plant, and raise treated-water capacity from 1,450 litres per second to 2,200 litres per second. Independent engineering consultants have confirmed that without the CRU, seawater intrusion into the existing network will render approximately 55% of current mains unusable within eight years. To fund the CRU without breaching its debt-to-equity covenant of 1.8×, Tirta's finance committee has determined that the social tariff must rise from IDR 1,850 to IDR 4,600 per cubic metre — an increase of IDR 2,750 per cubic metre — effective 1 January 2026. At average household consumption of 18 cubic metres per month, this translates to an additional monthly bill of IDR 49,500 for affected households. The regional government of Kota Pesisir has declined to provide any compensatory subsidy.

The management team published the following written justification in their March 2025 investor presentation:

"The CRU is not a growth project; it is a survival project. Without new mains and desalination capacity, seawater intrusion will make over half our network unusable within eight years. The tariff adjustment for social-tariff customers is regrettable but unavoidable: the programme cannot be financed within our covenant constraints without it, and deferral would expose all 2.1 million residents — including social-tariff customers — to a city-wide supply failure. We are not choosing between affordability and infrastructure; we are choosing between a manageable cost increase now and a catastrophic supply collapse later. The adjustment brings social-tariff rates to a level that is still 42% below the standard commercial tariff of IDR 7,950 per cubic metre, and it preserves universal service coverage."

### question

Draft the section of a briefing note to the Chair of Tirta Nusantara Tbk's Audit and Ethics Committee that evaluates the Board's decision to raise the social tariff from IDR 1,850 to IDR 4,600 per cubic metre as a means of financing the Coastal Resilience Upgrade, and arrives at a clear verdict on whether the decision is defensible as an act of responsible leadership in the public interest.

Your answer should address:
(i) the strength of the commercial and operational case for the tariff increase;
(ii) the nature and severity of the public-interest cost imposed on affected residents; and
(iii) your verdict on whether the decision, taken as a whole, meets the standard of responsible leadership.

### scenario facts

| id | kind | key | text |
|---|---|---|---|
| `f_social_tariff_old` | figure | `IDR 1,850` | the existing subsidised social tariff of IDR 1,850 per cubic metre |
| `f_social_tariff_new` | figure | `IDR 4,600` | the proposed new social tariff of IDR 4,600 per cubic metre |
| `f_monthly_impact` | figure | `IDR 49,500` | additional monthly bill of IDR 49,500 for affected households |
| `f_affected_residents` | entity | `280,000 lower-income residents` | approximately 280,000 lower-income residents in the eastern districts |
| `f_cru_cost` | figure | `IDR 4.2 trillion` | the CRU's total capital cost of IDR 4.2 trillion |
| `f_mains_failure` | figure | `55% of current mains` | seawater intrusion will render approximately 55% of current mains unusable within eight years |
| `f_de_covenant` | constraint | `1.8×` | debt-to-equity covenant of 1.8× |
| `f_below_commercial` | figure | `42% below the standard commercial tariff` | the new social tariff is still 42% below the standard commercial tariff of IDR 7,950 |
| `f_no_subsidy` | constraint | `declined to provide any compensatory subsidy` | the regional government of Kota Pesisir has declined to provide any compensatory subsidy |
| `f_capacity_increase` | figure | `1,450 litres per second to 2,200 litres per second` | treated-water capacity rising from 1,450 to 2,200 litres per second |

### requirement parts

1. (i) the strength of the commercial and operational case for the tariff increase
2. (ii) the nature and severity of the public-interest cost imposed on affected residents
3. (iii) your verdict on whether the decision, taken as a whole, meets the standard of responsible leadership

### criteria — 10 marks, 5 criteria, 2 marks each

**`c1` — 2 marks** · lo `A3a` · part: *(i) the strength of the commercial and operational case for the tariff increase*

- **anchors:** `f_mains_failure`
- **disqualifiers:** `F1`, `F2`, `F5`, `F10`
- **development_required:** true

> The engineering risk that 55% of current mains will fail within eight years is not a discretionary growth target but a confirmed existential threat to the network — this gives the CRU a qualitatively different character to ordinary capital expenditure, and a candidate who merely notes 'infrastructure is needed' earns 1 mark; full marks require the candidate to assess why the confirmed, time-bounded nature of the 55% of current mains failure makes deferral irrational rather than merely suboptimal, and to connect that to the consequence that all 2.1 million residents — including the very households being asked to pay more — would face city-wide supply failure. 1 mark if identified but left undeveloped.

**`c2` — 2 marks** · lo `A3a` · part: *(i) the strength of the commercial and operational case for the tariff increase*

- **anchors:** `f_de_covenant`, `f_no_subsidy`, `f_cru_cost`
- **disqualifiers:** `F1`, `F2`, `F5`, `F10`
- **development_required:** true

> The debt-to-equity covenant of 1.8× is a binding external constraint that removes the option of simply borrowing the IDR 4.2 trillion cost, meaning the finance committee's determination that the social tariff must rise is not a preference but the only available lever given the covenant; a candidate who notes 'debt is limited' earns 1 mark; full marks require the candidate to evaluate why the covenant's binding nature — combined with the regional government's decision to declined to provide any compensatory subsidy — closes every alternative funding route, so that the tariff increase is the residual solution, not the first choice, and that this significantly strengthens the commercial case. 1 mark if identified but left undeveloped.

**`c3` — 2 marks** · lo `A3a` · part: *(ii) the nature and severity of the public-interest cost imposed on affected residents*

- **anchors:** `f_monthly_impact`, `f_affected_residents`, `f_below_commercial`, `f_no_subsidy`
- **disqualifiers:** `F1`, `F2`, `F5`, `F6`, `F10`
- **development_required:** true

> The IDR 49,500 per month increase lands on 280,000 lower-income residents — a named, concentrated group — and the severity is not softened by the management team's observation that the new IDR 4,600 rate sits 42% below the standard commercial tariff, because that comparison is between Tirta's own tariff bands, not against these households' actual ability to pay; a candidate who notes 'the bill rises' earns 1 mark; full marks require the candidate to evaluate why a relative affordability claim (still 42% below the standard commercial tariff) is analytically insufficient as a public-interest defence when the absolute increase of IDR 49,500 falls entirely on a lower-income population and the regional government has declined to provide any compensatory subsidy, leaving them with no recourse. 1 mark if identified but left undeveloped.

**`c4` — 2 marks** · lo `A3a` · part: *(ii) the nature and severity of the public-interest cost imposed on affected residents*

- **anchors:** `f_monthly_impact`, `f_affected_residents`, `f_social_tariff_new`
- **disqualifiers:** `F1`, `F2`, `F5`, `F10`
- **development_required:** true

> The management team's written justification frames the decision as 'a manageable cost increase now versus a catastrophic supply collapse later', but this framing only holds if IDR 49,500 per month is indeed manageable for lower-income households in Kota Pesisir's eastern districts — a premise the Board's own documents do not test; a candidate who quotes the justification without interrogating it earns 1 mark; full marks require the candidate to identify that this is the weakest link in management's argument, because a utility cannot discharge its public-interest duty by assuming affordability rather than demonstrating it, particularly when the affected population has no alternative supplier and no subsidy to fall back on, meaning the risk of disconnection and waterlessness is real and falls on a specific group. 1 mark if identified but left undeveloped.

**`c5` — 2 marks** · lo `A3a` · part: *(iii) your verdict on whether the decision, taken as a whole, meets the standard of responsible leadership*

- **anchors:** `f_social_tariff_old`, `f_social_tariff_new`, `f_de_covenant`, `f_affected_residents`
- **disqualifiers:** `F1`, `F2`, `F4`, `F5`, `F10`
- **development_required:** true

> On balance the decision to raise the tariff from IDR 1,850 to IDR 4,600 is defensible in principle — a board that could demonstrate no alternative given the 1.8× covenant and the absence of government subsidy is not being reckless — but it does not yet meet the standard of responsible leadership because no hardship mechanism has been built into the decision; responsible leadership in a public utility requires not just choosing the least-bad option but actively mitigating the harm that option imposes; a candidate who states a verdict without conceding the opposing case earns 1 mark; full marks require the candidate to come down explicitly — naming what is being traded away (the affordability of water for 280,000 lower-income residents), who bears it, and what condition the Board must meet for the decision to become defensible (a tested and funded hardship fund or phased implementation plan), so that the verdict is actionable by the Audit and Ethics Committee. 1 mark if identified but left undeveloped.


### golden GOOD (served as `model_answer`)

**Responsible leadership — commercially defensible, and still a decision to make**

**Briefing Note — Section: Social Tariff Increase — Evaluation for the Audit and Ethics Committee**

**To: Chair, Audit and Ethics Committee, Tirta Nusantara Tbk**

**(i) Strength of the commercial and operational case**

The engineering foundation of the CRU is compelling in a way that distinguishes it from ordinary capital investment. Independent consultants have confirmed that seawater intrusion will render 55% of current mains unusable within eight years — a specific, time-bounded, externally verified prognosis, not a management projection. The significance of this is that deferral is not a financially conservative choice; it is a choice to let the network collapse, exposing all 2.1 million residents of Kota Pesisir to a city-wide supply failure. The CRU's capacity expansion from 1,450 litres per second to 2,200 litres per second is consequently not growth spending but survival infrastructure.

On funding, the 1.8× debt-to-equity covenant is a binding external constraint, not a management preference. The IDR 4.2 trillion programme cannot be fully debt-financed without breaching it, and any breach would likely trigger lender remedies that would imperil the project itself. Critically, the regional government of Kota Pesisir has declined to provide any compensatory subsidy, closing the one alternative funding channel that could have spared lower-income customers. Given those two closures, the finance committee's determination that the social tariff must rise is the residual solution, not the opening bid — and that materially strengthens the commercial logic.

**(ii) Nature and severity of the public-interest cost**

The public-interest cost is concrete and concentrated. The IDR 49,500 per month increase in monthly bills falls entirely on 280,000 lower-income residents in the eastern districts — a named and bounded population with no alternative supplier in a network-monopoly utility. Management's observation that the new IDR 4,600 rate sits 42% below the standard commercial tariff is arithmetically correct but analytically misleading as a public-interest defence: the relevant comparison is not between Tirta's own tariff bands but between IDR 49,500 and what these households can actually afford, a question management's own documents never answer. Because the regional government has declined to provide any compensatory subsidy, affected households have no financial recourse if the increase exceeds their means, making disconnection — and therefore waterlessness — a live risk for a specific, identifiable group.

The deeper problem with management's written justification is its framing of IDR 49,500 per month as "a manageable cost increase." A listed utility acting in the public interest cannot fulfil its obligations by assuming affordability; it must demonstrate it. The eastern-district population was not asked whether the increase is manageable, and no hardship mechanism was announced alongside the tariff decision. That gap is the most significant weakness in the Board's position.

**(iii) Verdict**

The case for the CRU is genuine and the funding constraint is real: a board facing 55% of current mains failure, a binding 1.8× covenant, and a government that declined to provide any compensatory subsidy is not in a position of free choice. The tariff increase from IDR 1,850 to IDR 4,600 is therefore defensible in principle. However, responsible leadership in a monopoly public utility requires not merely selecting the least-bad option but actively mitigating the harm that option imposes on those least able to absorb it. The decision as currently constituted — with no tested hardship fund, no phased implementation, and no affordability assessment — does not yet meet that standard.

I recommend that the Committee decline to endorse the decision as drafted and require the Board to return with a hardship-protection mechanism — such as a means-tested payment-in-kind scheme or phased tariff steps — before the IDR 4,600 rate is approved for implementation on 1 January 2026. Only then can the increase be characterised as responsible leadership rather than cost transfer to the most vulnerable residents.

### golden BAD (authoring artefact — never served)

**Briefing Note — Social Tariff Increase**

**Background**

Tirta Nusantara Tbk serves Kota Pesisir, a fast-growing coastal city of 2.1 million residents. The Board has approved the Coastal Resilience Upgrade at a total cost of IDR 4.2 trillion and has proposed raising the social tariff from IDR 1,850 to IDR 4,600 per cubic metre to help fund it.

The management team have explained their reasoning clearly in their investor presentation: "The CRU is not a growth project; it is a survival project. Without new mains and desalination capacity, seawater intrusion will make over half our network unusable within eight years. The tariff adjustment for social-tariff customers is regrettable but unavoidable: the programme cannot be financed within our covenant constraints without it, and deferral would expose all 2.1 million residents — including social-tariff customers — to a city-wide supply failure. We are not choosing between affordability and infrastructure; we are choosing between a manageable cost increase now and a catastrophic supply collapse later. The adjustment brings social-tariff rates to a level that is still 42% below the standard commercial tariff of IDR 7,950 per cubic metre, and it preserves universal service coverage."

**Commercial and operational considerations**

There is a clear operational need for the CRU. Seawater intrusion is a recognised threat to coastal water networks, and the engineering consultants have confirmed the risk to the existing mains. The covenant limits on debt mean additional borrowing is constrained. The regional government has not offered any subsidy, which reduces the options available to management.

**Public-interest considerations**

On the other hand, the tariff increase is significant. The affected residents are lower-income households in the eastern districts. The monthly bill increase may be difficult for some households to absorb. Water is a basic necessity, and any increase in its cost for vulnerable populations raises public-interest concerns.

**Conclusion**

There are arguments on both sides of this decision. The operational need is genuine and the funding options are limited. At the same time, the public-interest cost is real and falls on lower-income households. The Audit and Ethics Committee will need to weigh these factors carefully in reaching its own view.

### hint

Your answer reproduces the exhibit's own justification — the move from IDR 1,850 to IDR 4,600 per cubic metre, the IDR 4.2 trillion capital cost, the fact that the new tariff is still 42% below the standard commercial tariff — without adding an assessment of your own, and it closes by leaving the weighing to the committee rather than reaching the verdict the requirement asks for.

### full_reveal

The misconception this drill exposes is COPY-PASTE: the candidate believes that reproducing a fact from the briefing material counts as analysis, when in reality restating what is already known adds nothing the reader could not read for themselves and therefore earns nothing. Under the two-mark rule, a point earns its second mark only when it is developed — its significance weighed, tied to Tirta Nusantara's specific position, followed to a consequence, and illustrated from the information given; a fact simply transcribed stops at one mark, or zero if no evaluative use is made of it at all. The practical cost is severe: a candidate who fills a page with lightly reworded scenario detail must find twice as many points, in the same time, to reach the same total as a candidate who develops half as many properly. The correction is not to write more — it is to ask, immediately after identifying each fact, what it means for this organisation and this decision: the 1.8× covenant is not just a number to name, it is the closure of the one funding channel that could have spared lower-income customers, and saying so is what turns a transcription into a Level 3 evaluation. Arrive at a committed verdict with a clear basis — "defensible in principle, not yet in execution" supported by the absence of any hardship mechanism — rather than cataloguing the scenario's own evidence and leaving the Chair to draw the conclusion herself.

### gate matrix

- N2 scenario-anchor (facts in scenario + used in reveal): PASS
- N3 generic/copy lint (reveal not scenario-restating): PASS
- N5 committed-verdict/structure: PASS
- N4-pre designed-flag raiseability (F1,F4): PASS
- N1 rubric-coverage (reveal = full marks; every part mapped): PASS
- N4 Rule-23 (GOOD in band, BAD below + designed F-modes raised): PASS
- N6a F10 marks-share: PASS
- N6b scenario precondition (evaluation, SBL): NOT EVALUATED — the precondition is a proposition with a real downside as well as an upside — stated costs, risks or affected parties — so that landing on one side concedes something. Whether a scenario is genuinely two-sided is a reading of the facts, not a countable shape; fact counts cannot see it. N5 covers only that the answer COMMITS, not that there was a trade-off to commit about. Confirm by hand
- N6c claim-anchor link: NOT EVALUATED — structurally N/A for evaluation — only scepticism acts on a single identifiable asserted claim
- N6 coverage: 2 of 3 part(s) NOT EVALUATED — N6b scenario precondition (evaluation, SBL); N6c claim-anchor link
- P4 jurisdiction / frozen-facts (hint + full_reveal): PASS
- P7 misconception-lead (full_reveal carries a real "...misconception...: " sentence): PASS
