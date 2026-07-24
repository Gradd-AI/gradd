# AFM E-section narrative batch — review pack (pipeline #2, discursive)

**3 discursive drills, `paper_code=AFM`, `mode=discursive`, `rubric_version=narrative_v1`, `status=candidate`/`published=false`. GATED 2026-07-24 (all N1–N5 green on the REAL constrained grader + P4/P7 lints). The SECOND narrative cluster (after the B-section D1–D5), and the first narrative content in Section E.**

| id | lo_code | drill | marks | criteria | designed BAD flags |
|---|---|---|---|---|---|
| `55181aa8-dcde-42cd-8c01-dbd0b392a734` | E1a | EN1 — establishing/relocating a group treasury (Framing A) | 8 | 4 | [F1, F5, F4] |
| `d0be009d-2625-4f2d-a489-a52d798dbaea` | E1a | EN2 — positive financial contribution (Framing B) | 8 | 4 | [F1, F5, F4] |
| `f9f4f3d4-ff4c-4d73-854c-9150db322c14` | E2a | EN3 — forex exposure types + how managed | 10 | 5 | [F1, F5, F4] |

**Split (per ruling):** E1a×2 (treasury is broad — two independently-evidenced framings, each hitting the SAME cited disqualifier from a DIFFERENT sitting, which confirms the disqualifier is robust) + E2a×1. **E1b DEFERRED to exam-ready** (ruled).

## WHAT THIS PIPELINE IS (read before reviewing) — the CLAIM CEILING
Rubric-locked, model-graded marking. **Code owns:** the rubric (criteria/anchors/disqualifiers), the aggregation (0/½/full partial credit + disqualifier caps + band→verdict), and the deterministic detectors (F1 copy-overlap, scenario-anchor use, requirement-part coverage, committed-conclusion). **The model owns:** the per-criterion QUALITY verdict (developed? applied?) under constraint. This is **"rubric-locked marking", NEVER "code owns the marks"** — the quality judgment is model-graded, kept honest by the Rule-23 (N4) verifier-of-the-verifier. v1 is AUTHORING-TIME ONLY (the N1/N4 gates ran the real grader); there is no live per-student wiring.

## Step-0 bounded E2a evidence search — result
The steer sheet flagged an E2a evidence gap. A bounded re-search resolved it:
- **All 5 registered AFM examiner reports (SD23/J24/SD24/MJ25/SD25): DRY** — zero discursive exposure-type (transaction/translation/economic) requirement in any of the five most recent E-section questions (Northney/Passmore/Abertafol/Sohbet/Mahoney are treasury or *quantitative* hedging).
- **F9 June 2016 (registered S3): HIT** — a real, citable discursive failure mode for E2a: *"most candidates correctly identified transaction risk, translation risk and economic risk. However, fewer candidates were able to offer clear descriptions of these risks as the basis for discussion, particularly economic risk... Recognising what is at risk is a good place to start an answer."* [F9 J16 p.5, Q3b]. This is the **"named-but-not-described"** failure mode — the E2a signature disqualifier (encoded as F2 on the identify criteria).
- **T8** (F9 "Foreign currency risk and its management", registered this session in `sources.json`) supplies the three exposure-type definitions + the transaction-risk management menu. F9-tier (no dedicated P4/AFM article exists — confirmed via the AFM technical-articles index), used as background per the established Step-0 precedent (calc #12's FRA sourcing).

## ⛔ CLOSED RULINGS — do NOT re-raise

**Carried forward from the D1–D5 narrative batch (still binding):**
- **CLAIM CEILING.** Never "code owns the marks" for narrative — the quality verdict is model-graded.
- **CONCEPTUAL-ONLY.** A narrative drill NEVER computes. These three are qualitative treasury/forex discursive drills — no given statistics, no computation.
- **F9 vs F6 boundary (FR1).** F9 (own figures not used) is reserved for a carry-a-value-downstream criterion; conceptual drills have none → **F9 is OFF**. These drills carry no F9 (and no F6 either — no given figures to interpret). Disqualifiers used: F1, F2, F4, F5, F7.
- **`rubric_version: 'narrative_v1'`** stamped; golden BAD + designed flags under `answer_schema._authoring` (never served); golden GOOD **is** `model_answer` (heading + reveal). No new DB column.
- **Provenance gate.** No coverage/tier/ads claim on narrative until the pipeline is WALKED.

**NEW for this batch (banked here):**
1. **E1b DEFERRED to exam-ready (ruled).** E1b (derivatives-market operations — exchange-traded vs OTC, tick/margin, basis risk, greeks) reads mechanical/definitional and has no located E1b-specific examiner commentary; it is not built here. E1a takes two of the three slots on the strength of two independently-evidenced framings.
2. **"Internal vs external hedging" is NOT ACCA vocabulary — never assert it.** T8 (the only located conceptual source) uses neither word anywhere near its hedging-method discussion; the internal/external split is a tutor-textbook (BPP/Kaplan) overlay. EN3's management criteria (c4/c5) list the methods in ACCA's own framing (forward/money-market/matching/invoicing; matching-currency funding; diversification) and the `evidence_anchor` on c4 explicitly records the no-internal/external rule.
3. **E2a evidence caveat.** No dedicated AFM examiner-report exposure-type requirement exists in the 5 recent reports (see Step-0). E2a rests on the guide (E2a verbatim), the F9 J16 (S3) named-not-described mode, and T8's F9-tier definitions. The **translation≠transaction confusion disqualifier is HOUSE-AUTHORED** (c2's `evidence_anchor` says so explicitly) — it is caught structurally by requiring the reporting-only recognition (anchor `f_reported`), supported by T8's "does not affect day-to-day cash flows."
4. **`evidence_anchor` RE-ENABLED for this batch (deliberate, documented deviation).** The D1–D5 convention was "rows carry no `evidence_anchor`" — but that ban originated in a *wrong* F9/J24 anchor on interpretation criteria (F9 misapplied). This batch's ruling requires **every criterion + disqualifier to carry a verbatim citation or a house-authored tag**, so `evidence_anchor` is populated on every criterion with the CORRECT examiner/guide citation. It is the purpose-built provenance field (its own type comment: *"never served, not marked on"*) — zero student/marking impact. Not a silent override.
5. **Designed BAD flags use the deterministic `[F1, F5, F4]` backbone.** The cited SIGNATURE disqualifiers — **F7 generic-centralisation-substitution** [SD24 p.4 / SD25 pp.13-14] for the E1a drills, and **F2 named-but-not-described** [F9 J16 p.5] for E2a — are the MARKING BASIS, stamped on the relevant criteria and demonstrated by the golden BAD. They are *not* in the deterministically-verified designed-flag set because they are grader-judgment calls (the generic-centralisation BAD reads as F5 generic/unanchored to the grader, not F7; the bare-naming BAD reads as `no`, not `partial+F2`). N4 verifies separation via the robust backbone; the signature failures still show in the BAD and drive the low score.

---

## EN1 — E1a Framing A: establishing/relocating a group treasury · `55181aa8-dcde-42cd-8c01-dbd0b392a734`
- LO E1a · L3 · command_verb "discuss" · 8 marks · Japan→South America (Kaisho Holdings, Osaka)
- **GATES:** total-marks ✓ · keys-verbatim ✓ · N2 ✓ · N3 ✓ · N5 ✓ · N4-pre ✓ · P4 ✓ · P7 ✓ · **N1 (real grader) ✓** · **N4 Rule-23 (real grader) ✓** — golden GOOD in band, golden BAD below + raised [F1, F5, F4].

**context_text:** Kaisho Holdings, a Japanese industrial-equipment group headquartered in Osaka, has expanded over the past decade into South America, where it now operates four subsidiaries that each run their own local treasury desk. Most of the group's currency and financing activity now originates in the region. The group finance director has proposed establishing a new centralised group treasury function in São Paulo, while retaining a smaller treasury presence in Osaka. No decision has yet been taken on the exact location within South America, nor on how much financial autonomy the four subsidiary desks would keep. The board wants to understand the issues involved in setting up the new function and the impact it would have on the existing subsidiary desks and on the Osaka head-office treasury before it commits.

**question:** Discuss the issues affecting the establishment of the new group treasury function, and the impact this would have on the existing subsidiary treasury desks and on the Osaka head-office treasury. *(with an explicit note that a generic centralisation pros/cons list is not what is asked)*

**requirement_parts:** (i) issues affecting the establishment of the new group treasury function · (ii) impact on the existing subsidiary desks and the Osaka head-office treasury

**rubric (4 criteria / 8 marks · bands fail / pass 0.5 / good 0.7 / excellent 0.85):**

| id | part | required_point (summary) | anchors | disqualifiers | evidence_anchor |
|---|---|---|---|---|---|
| c1 | (i) | location-and-control specifics (WHERE in South America; how much autonomy), not a generic centralisation list | f_location, f_autonomy | F1, F5, **F7** | SD24 p.4: "location and control were rarely discussed"; generic centralisation essay = wrong question (F7) |
| c2 | (i) | a further establishment issue grounded in the group's own position (São Paulo siting rationale; staffing/systems) | f_saopaulo | F1, F5, F2 | SD24 p.4: scope = "issues affecting the establishment", not centralisation pros/cons |
| c3 | (ii) | how the subsidiary desks' roles/responsibilities change (lose financing/hedging autonomy) | f_desks, f_autonomy | F1, F5 | SD24 p.4: "roles and responsibilities … would change because of the new group function" |
| c4 | (ii) | how the Osaka head-office treasury relationship changes (running → overseeing) | f_osaka | F1, F5 | SD24 p.4: "the relationship of the new group treasury function with the head office treasury … how this might change" |

**scenario_facts (keys verbatim in context_text):** f_location "location within South America" · f_autonomy "financial autonomy" · f_saopaulo "São Paulo" · f_desks "subsidiary desks" · f_osaka "Osaka head-office treasury"

**model_answer (golden GOOD — first line is the area-entry heading):**
> **Treasury function — establishing a group treasury and its impact on existing functions**
>
> The board should first weigh the location-and-control questions this proposal leaves open. Deciding the exact location within South America matters because a treasury centre needs deep local banking relationships, staff with the right skills and time-zone reach across the four markets, so a poorly chosen site would undercut the very efficiency the move is meant to deliver. Control is the harder question: the group must decide how much financial autonomy the local desks retain, because pulling every hedging and financing decision into the centre risks slow responses to local conditions, while leaving too much locally defeats the purpose of centralising. A second establishment issue is that the rationale for siting the centre in São Paulo is that most activity has migrated to the region, so the case rests on being close to where the exposures arise — but the group still has to build the staffing and treasury systems there, which takes time and investment before any benefit appears. Turning to the impact, the roles and responsibilities of the subsidiary desks would change materially: if they lose their financial autonomy over financing and hedging to the new centre, they shift from decision-makers to executors, which affects morale, retention and the local knowledge the group relies on. Finally, the Osaka head-office treasury's relationship changes too — it would move from running much of the activity to overseeing and coordinating a regional centre, so the group must be clear where ultimate authority for group-wide policy and risk limits now sits. On balance the proposal is workable, but only once location, the autonomy split, and the Osaka–São Paulo reporting line are settled explicitly rather than left open.

**golden BAD (authoring artefact — `answer_schema._authoring`, NOT served) — designed flags [F1, F5, F4]:** opens by copying "The group finance director has proposed establishing a new centralised group treasury function" verbatim (F1), then writes the generic advantages/disadvantages-of-centralisation essay (economies of scale, control, loss of responsiveness) touching NONE of the named facts (F5), and never commits a closing view (F4). It is the exact "generic centralisation substitution" the F7 disqualifier on c1 is written against [SD24 p.4].

**hint (served):** *(nudges: the generic centralisation essay is what the requirement warns against; anchor to what THIS group must decide — where in South America, how much autonomy — and how the named functions change.)*

**full_reveal (served — carries a real "misconception:" sentence for P7):** names the "advantages and disadvantages of centralising treasury" default as the dominant misconception; reframes every generic point as worthless until anchored (control → the autonomy split; impact → desks execute, Osaka oversees); closes on committing a view.

---

## EN2 — E1a Framing B: positive financial contribution · `d0be009d-2625-4f2d-a489-a52d798dbaea`
- LO E1a · L3 · command_verb "advise" · 8 marks · UAE→Gulf/East Africa (Barzan Logistics, Abu Dhabi)
- **GATES:** all deterministic ✓ · P4 ✓ · P7 ✓ · **N1 ✓** · **N4 Rule-23 ✓** — GOOD in band, BAD below + raised [F1, F5, F4].

**context_text:** Barzan Logistics, a freight and warehousing group headquartered in Abu Dhabi, currently runs all treasury activity inside its central finance department. The finance director has proposed carving out a separate, dedicated treasury department as the group expands across the Gulf and into East Africa. The chief executive has been clear that the new department will be approved only if it can make a positive financial contribution — that is, if it can be shown to maximise income or save costs — rather than simply add another layer of cost and procedure to the group. The board has asked for advice on the specific ways a dedicated treasury department could make such a contribution at Barzan Logistics.

**question:** Advise on the specific ways in which a dedicated treasury department could make a positive financial contribution to Barzan Logistics. *(note: the CEO's test is maximise income or save costs; a general centralisation essay, or a discussion of extra costs and procedures, is not asked for.)*

**requirement_parts:** (i) ways a dedicated treasury department can make a positive financial contribution

**rubric (4 criteria / 8 marks):**

| id | required_point (summary) | anchors | disqualifiers | evidence_anchor |
|---|---|---|---|---|
| c1 | cash-/liquidity-management contribution (pool + invest group cash) applied to the Gulf/East Africa expansion | f_maximise, f_expand | F1, F5, **F7** | SD25 p.13: "better cash management"; generic centralisation essay = wrong question (F7, SD25 pp.13-14) |
| c2 | financing/tax-efficiency contribution (coordinate borrowing + intra-group flows to lower cost) | f_positive | F1, F5, **F7** | SD25 p.13: "tax planning"; "additional costs and procedures … not given credit" boundary |
| c3 | strategic-advice contribution (advise the board on the financial implications of the expansion) | f_expand | F1, F5 | SD25 p.13: "advising on financial implications of strategic decisions" |
| c4 | commit to a recommendation justified on income/cost grounds, not as an extra cost layer | f_positive, f_maximise | **F4**, F7 | SD25 p.13: the CEO's income/cost test + additional-costs boundary; F4 fence-sitting ("failed to do this") |

**scenario_facts:** f_positive "positive financial contribution" · f_maximise "maximise income or save costs" · f_expand "Gulf and into East Africa"

**model_answer (golden GOOD):**
> **Treasury function — how a dedicated treasury department makes a positive financial contribution**
>
> A dedicated treasury can make a positive financial contribution in several concrete ways. The first is better cash and liquidity management: as the group expands across the Gulf and into East Africa it will hold cash in scattered accounts and currencies, so a treasury that pools those balances and invests surpluses centrally can maximise income or save costs by earning better returns and cutting idle balances and overdraft charges. The second is financing and tax efficiency: a treasury that coordinates the group's borrowing and structures intra-group flows can lower the overall financing and tax cost, and because that is a genuine saving it is exactly the kind of positive financial contribution the chief executive wants, rather than an extra overhead. The third is strategic financial advice: as the group weighs new sites across the Gulf and East Africa, a treasury team can advise the board on the financial implications of those expansion decisions — funding, currency and repatriation — so that capital is committed on a sound basis. Crucially, none of this is the generic "should we centralise" debate, and the extra costs and procedures a department creates are not the point. On balance I recommend approving the department, but justified explicitly on its ability to maximise income or save costs through cash management, cheaper financing and better-informed expansion decisions — the positive financial contribution the chief executive has set as the test.

**golden BAD — designed flags [F1, F5, F4]:** copies "The finance director has proposed carving out a separate, dedicated treasury department" (F1), then discusses generic centralisation advantages/disadvantages AND dwells on the non-creditable "additional costs and procedures" (F5 — omits the income/cost anchors; the wrong-question F7 the c1/c2 disqualifiers target), never advising or committing (F4).

**hint / full_reveal (served):** hint pins the CEO's single test and demands a committed recommendation; full_reveal names the "centralised-treasury debate in disguise" misconception (with a "misconception:" sentence for P7) and the non-creditable extra-costs trap, reframing to concrete money-making/-saving activities.

---

## EN3 — E2a: forex exposure types + how managed · `f9f4f3d4-ff4c-4d73-854c-9150db322c14`
- LO E2a · L3 · command_verb "identify, distinguish and assess" · 10 marks · South Africa/Kenya/EU (Zandberg Foods, Johannesburg)
- **GATES:** all deterministic ✓ · P4 ✓ · P7 ✓ · **N1 ✓** · **N4 Rule-23 ✓** — GOOD in band, BAD below + raised [F1, F5, F4].

**context_text:** Zandberg Foods, a South African packaged-goods manufacturer based in Johannesburg, sells a large share of its output to European supermarket chains under contracts priced in euros, with payment falling due several months after each order is agreed. It also owns a wholly-owned manufacturing subsidiary in Kenya whose assets and results are consolidated into Zandberg's rand financial statements. The finance director is concerned that recent movements in the euro and the Kenyan shilling are creating several distinct kinds of currency risk, and is unsure which of them actually threatens the group's cash flows as opposed to only its reported figures. The board has asked for the different kinds of foreign-exchange exposure the group faces to be identified, distinguished and assessed, together with how each can be managed.

**question:** Identify and distinguish the different kinds of foreign-exchange exposure that Zandberg Foods faces, and assess how each of them can be managed — being clear which threaten cash flows and which affect only the reported figures.

**requirement_parts:** (i) identify and distinguish the kinds of foreign-exchange exposure · (ii) assess how each exposure can be managed

**rubric (5 criteria / 10 marks):**

| id | part | required_point (summary) | anchors | disqualifiers | evidence_anchor |
|---|---|---|---|---|---|
| c1 | (i) | identify + DESCRIBE transaction exposure (euro receipts, rand value moves before payment) — not merely name it | f_euro | F1, **F2**, F5 | F9 J16 p.5: "fewer … able to offer clear descriptions" — naming ≠ describing (F2); T8 transaction def |
| c2 | (i) | identify + describe translation exposure (Kenya sub consolidated) AND distinguish it as a reporting-only effect, not a cash-flow threat | f_kenya, f_reported | F1, **F2**, F5 | **HOUSE-AUTHORED** translation≠transaction confusion, caught via the reporting-only anchor; T8 "does not affect day-to-day cash flows" |
| c3 | (i) | identify + describe economic exposure (competitive position selling to European chains if rand strengthens) | f_european | F1, **F2**, F5 | F9 J16 p.5: economic risk "particularly" poorly described; T8 "competitive strength of imports and exports" |
| c4 | (ii) | assess managing transaction exposure (forward/money-market/matching/invoicing) applied to the euro receipts | f_euro | F1, F2, F5 | T8 "dealing with transaction risk" methods; **NEVER "internal vs external" — not ACCA vocabulary (CLOSED RULING)** |
| c5 | (ii) | assess managing translation (matching-currency funding) + economic (diversification), and COMMIT to which most warrant active management (the cash-flow ones) | f_kenya, f_european | **F4**, F5 | T8 management methods; F4 for the committed verdict; cash-vs-reported drives priority |

**scenario_facts:** f_euro "priced in euros" · f_kenya "subsidiary in Kenya" · f_european "European supermarket chains" · f_reported "reported figures"

**model_answer (golden GOOD):**
> **Foreign-exchange exposure — identifying, distinguishing and managing the three exposure types**
>
> Zandberg faces three distinct exposures that must be told apart. The first is transaction exposure: because the sales are priced in euros with payment months later, the rand value of each receipt changes between agreeing the contract and being paid, so a euro that weakens against the rand directly reduces the cash Zandberg collects — this is a real cash-flow risk. The second is translation exposure on the subsidiary in Kenya: when its shilling assets and results are consolidated, a weaker shilling lowers their carrying value in the rand accounts, but this changes only the reported figures and does not move the group's day-to-day cash, so it matters far less than transaction risk and should not be confused with it. The third is economic exposure: if the rand strengthens against the euro over time, Zandberg's goods become dearer for the European supermarket chains relative to local rivals, eroding its competitive position and future sales — a slower, structural threat that is the hardest to see. On management: the transaction exposure on the euro receipts is readily hedged — a forward locks the rate, a money-market hedge achieves the same by borrowing and converting now, and matching euro income against any euro costs reduces the net amount to hedge. Translation exposure is usually managed, if at all, by funding the Kenyan subsidiary with shilling or matching-currency borrowing so that a fall in asset values is offset by a fall in liabilities; economic exposure is managed strategically, by diversifying the markets Zandberg sells into and the locations it produces in, so no single currency move dictates competitiveness. On balance the group should actively hedge the transaction exposure first, because it is the one that hits cash; translation exposure warrants little more than awareness, and economic exposure a longer-term diversification response rather than a financial hedge.

**golden BAD — designed flags [F1, F5, F4]:** copies "The finance director is concerned that recent movements in the euro and the Kenyan shilling are creating several distinct kinds of currency risk" (F1), then BARE-NAMES the three exposures ("Transaction exposure is a type of currency risk…") with no description and touching no anchor key (F5; the named-but-not-described F2 the c1/c2/c3 disqualifiers target), ending "use hedging … in general" with no committed assess-verdict (F4).

**hint / full_reveal (served):** hint pins that naming earns almost nothing (describe each + distinguish cash-vs-reported + match a management response); full_reveal names the "identifying is the task" and the "translation-as-cash-drain" misconceptions (with a "misconception:" sentence for P7).

---

## PENDING at flip (map-before-close — NOT done; not blocking review)
- **area-entry ranks — a CRITICAL ordering subtlety, different from the B-narrative case.** The three headings are unregistered in `lib/acca/area-entry.ts`. **They must rank ABOVE the E-section CALCULATORS, not below.** The B-narrative band (60–64) sits above B-calculators only because B-calcs are ≤53; but the E-calculators are 70–77 (fxhedge E2, irhedge E3). So the **E2a** narrative heading MUST rank **> 73** (above fxhedge swap) or it would steal E2's zero-attempt entry from fxhedge K1 (rank 70) — the opposite of the "narrative is never an entry" intent. Proposed: E-narrative band **80–82** (above every E-calculator). The **E1** headings are unconstrained (E1 has no calculator — a narrative is the only thing there, so it is the entry by construction, which is fine). To be registered at flip with a matching `test-area-entry` case proving fxhedge K1 stays the E2 entry.
- **CLAUDE.md CODE-MAP** entry for the E-narrative cluster + **AFM_SURFACED / APM_BUILD_CONTRACT** journal + **coverage-contract** mirror (narrative cluster count: E1a/E1b/E2a row).

## NEXT (pipeline)
1. **This pack → Grant** for review (per instruction — before GPT).
2. Blind GPT adversarial review (CLOSED RULINGS present).
3. Adjudicate → flip by explicit-id SQL (reconcile approved-set vs journal FIRST) → student walk.
