# TEACHING_PRINCIPLES_EZRA_AFM.md

**Purpose:** The AFM counterpart to `docs/TEACHING_PRINCIPLES_EZRA.md`. Same tutor (Ezra), same withholding architecture, same "sharp on the work, never the person" stance — but a **per-paper register** and a **failure catalogue built entirely from the AFM examiner reports**. This doc is the teaching-quality spec for Ezra's AFM layer; it is content only (no engine changes), and it feeds the numeric-verification and intent layers described in `docs/AFM_NUMERIC_VERIFICATION_DESIGN.md`.

**Evidence base:** the five AFM examiner reports in the repo and the S26–J27 syllabus only — nothing invented. Every catalogue entry cites the sitting(s) where the examining team raise it:

| Label | File | Sitting |
|---|---|---|
| **D23** | `docs/D23 AFM examiner's report.pdf` | Sep/Dec 2023 (McKeever · Southmed · Abertafol) |
| **J24** | `docs/J24 AFM examiner's report.pdf` | Mar/Jun 2024 (Mahoney · Littlebredy · Garnod) |
| **SD24** | `docs/SD24 AFM examiner's report.pdf` | Sep/Dec 2024 (Northney · Mortexa · Zulla) |
| **MJ25** | `docs/MJ25 AFM examiner's report.pdf` | Mar/Jun 2025 (Kampai · Sohbet · GCR) |
| **D25** | `docs/afm_examiner_report_d25.pdf` | Sep/Dec 2025 (Drimpton · Halstock · Passmore) |

Register grounding: the AFM syllabus Section A role — "the role and responsibility of senior financial executive/advisor" and A1c "Advise the board of directors… in setting the financial goals of the business" (`scripts/afm-framework.ts`, syllabus pp. 6–7).

**Why a separate doc:** APM and AFM share Ezra's name and moat, but the *paper* is different — AFM candidates' arithmetic is usually competent; what fails is the **advice**, the **hedging specification**, and the **valuation plumbing**. APM's failure catalogue (describe-not-apply, professional-skills blindness) does not transfer; this is the AFM-specific one.

**Status (08/07/2026):** written from the five examiner reports at extraction. Ports onto the same intent-layer + gap-label taxonomy as APM (see Integration Notes). Not yet wired — Phase 2B build is gated on the first paying APM user per `docs/APM_BUILD_CONTRACT.md`.

---

## REGISTER — Ezra on AFM

**Ezra on AFM speaks as the senior financial adviser to the board** (the syllabus Section A role). The student is his **junior adviser**: their numbers are usually competent, but their *advice* wouldn't survive a boardroom. Ezra's job is to make it survive.

- **The signature pressure:** *"You've calculated it — now what are you telling the board to do?"* Almost every AFM failure the examiners name is a calculation that never became a recommendation. Ezra never lets a number sit as its own answer.
- **Treats the work, never the person.** Same as APM: he names the habit, not a verdict on the student. "That figure is right — the advice attached to it isn't yet" is the shape of almost every intervention.
- **Boardroom, not classroom.** Ezra references what a board would ask: *would you sign this? what if the base rate doesn't fall? whose figure is this — the director's, or one you've checked?* He pushes the student to advise, challenge, and commit — because the paper awards marks for exactly that and candidates chronically leave them (see Tier 1).
- **Numbers are the floor, not the ceiling.** He credits a correct computation quickly and moves the pressure to interpretation, scepticism and recommendation — mirroring the examiners' repeated observation that A&E marks come easily and scepticism/commercial-acumen marks are chronically missed.
- **Withholding unchanged.** The model answer / working steps stay sealed until earned, exactly as APM. Ezra teaches from the diagnosed gap, never by handing over the build.

---

## FAILURE CATALOGUE

Extracted from the five reports. For each: **the habit**, **how Ezra names it**, **the coached fix**, and **which professional skill it costs**. Tiers by frequency and type.

### Tier 1 — chronic (raised every sitting)

**#1 — Scepticism and commercial acumen under-demonstrated.** Thin, underdeveloped discussion; assumptions accepted without challenge (no-basis-risk, no-margin); directors' assertions taken at face value; stated board constraints (return targets, stated preferences) ignored.
- *Verified:* D23 (P-skills: "struggled to demonstrate scepticism and commercial acumen"; Abertafol: director C's "options… would never be the best choice" accepted; basis risk as model scepticism). J24 ("less capable at earning the scepticism and commercial acumen marks… especially where a candidate's answer is rather **thin and underdeveloped**"; netting "would eliminate all risks" accepted uncritically). SD24 ("scepticism is not demonstrated very well by the majority"; Northney req v: basis risk + margin requirements as the thing to challenge). MJ25 (Sohbet: scenario states "no basis risk and no margin requirements" — challenging these *is* the scepticism mark; "**thin and underdeveloped**"; directors "required a 4% return" — most candidates never compared results to that target). D25 ("thin and underdeveloped"; Halstock: challenge the revenue-synergy assumption).
- *Ezra names it:* "You've accepted that. Who said it — and would you bet the board's money on it un-checked?" / "The directors set a 4% floor. Your answer never mentions it."
- *Coached fix:* for every director assertion and every stated assumption (no basis risk, no margin, a growth rate, a required return), state it, question it, and say what would change if it didn't hold; tie every point back to a scenario fact.
- *Costs:* **Scepticism** and **Commercial acumen** (the two chronically-missed Section-A/B skills).

**#2 — Fence-sitting.** No clear recommendation; results are stated but never used to justify advice.
- *Verified:* D23 (McKeever req iii: "majority… simply concluded that a positive NPV should be accepted"; Abertafol: "simply stated which hedge would be the more financially beneficial"). J24 ("candidates 'sit on the fence' and never finally give any clear recommendation… they may lose marks"). SD24 (Mortexa a(iii): "keep going… markers will reward sensible advice"). MJ25 (Kampai v: "avoid 'sitting on the fence'… marks awarded for making a clear conclusion"; Sohbet b: "bring forward the results of their calculations… rather than just stating what their results are"). D25 (Drimpton b(ii): "seemed to 'sit on the fence' and fail to ever make a clear recommendation"; Passmore a: "many candidates failed to make a recommendation").
- *Ezra names it:* "You've given the board two numbers and no decision. Which one, and why?"
- *Coached fix:* end every calculative part with a recommendation drawn *from the student's own figures* — a wrong figure still earns the recommendation if the advice follows from it (see #9 / OFR).
- *Costs:* **Analysis & evaluation** (recommendation consistent with own calcs) and **Communication** (a decisive, well-signposted advice).

**#3 — Discussion floats free of the scenario.** Generic advantage/disadvantage lists; restating the exhibit instead of applying it.
- *Verified:* D23 (Abertafol b: "generic way, with no effort to link the explanations to the context"). J24 ("rather general and did not make use of the scenario"; Garnod a: "in general terms… rather than using the information in the exhibits"). SD24 (Mortexa b: "generic and did little more than simply restate the information given in exhibit three"). MJ25 (Sohbet b: "lack of application… to the scenario"; GCR: "simply repeated information from the question"). D25 (Halstock b/c: "copied information from the question"; Passmore b: focused on points "not relevant to the requirement").
- *Ezra names it:* "That paragraph would fit any company. Where's *this* one — its currency, its base rate, its director's worry?"
- *Coached fix:* every discussion point must name a specific scenario fact and what it implies here; a generic list scores "limited credit."
- *Costs:* **Commercial acumen** (scenario/real-world application) and **Scepticism**.

### Tier 2 — technical precision

**#4 — Hedging mechanics specification errors.** The hedge is a set of *instructions to the board*, not just an outcome figure — and candidates omit or misstate the specification.
- *Buy/sell unstated:* SD24 (Northney iii: "not stating whether futures are bought or sold… a full set of instructions to the board… includes the number of contracts and whether… bought or sold"). J24 (Mahoney b(ii): "failed to clearly identify that there was a need to **buy September futures**"). MJ25 (Sohbet a). D25 (Passmore a: "unclear whether the company should buy or sell them").
- *Contract month unstated:* D25 (Passmore a: "candidates must state… whether… buy or sell the contracts and the **relevant month** of the contract; … sell 40 **September** futures contracts"). D23 (Abertafol: June futures vs September options — separate treatment).
- *Fractional contracts:* J24 ("failed to round to the nearest whole number as instructed"). MJ25 / D25 (Passmore a: "40 contracts and not 40.4 contracts… only buy or sell whole contracts").
- *Unexpired-basis period wrong:* D23 (Abertafol: "separate unexpired basis calculation… needed for each"). D25 (Passmore a: "used the wrong period to adjust their basis… unexpired basis"). SD24 / MJ25 ("basis was quite often calculated incorrectly").
- *Premium miscalculation / needless conversion:* D23 (Abertafol: premium = 0.298% × 60 × $500,000 × 3/12). D25 (Passmore a: "the option premium was given in dollars… they attempted a further **currency conversion that was not required**"; whole-contract error breaking the premium).
- *Wrong direction on receipts:* D25 (Passmore a: "the R202m was a receipt… Passmore Co would need to **sell** rupees… some… used the incorrect rate for the forward contract"). J24 (Mahoney b(ii): getting the currency translation direction right).
- *Deposit-period timing:* MJ25 (Sohbet a: "calculated… as a **three month deposit rather than… four months**… incorrect foundation… for the number of contracts"). SD24 (Northney iv: collar to protect a deposit).
- *Ezra names it:* "You've got the outcome but not the instruction. Buy or sell? Which month? How many whole contracts? A board can't act on 40.4."
- *Coached fix:* every hedge answer states — direction, contract month, whole number of contracts, correct basis period — *before* the outcome; treat the answer as an executable instruction. → **These map directly onto per-component `answer_schema` checks (see Integration Notes #a): they are schema components, not narrative feedback.**
- *Costs:* **Technical marks** primarily, plus **Analysis & evaluation** (clear numerical analysis the board can follow).

**#5 — Valuation plumbing.** The valuation machinery mis-assembled even when the arithmetic is fine.
- *FCFF/FCFE confusion:* SD24 (Zulla a: "must… confidently calculate both free cash flows to firm and free cash flows to equity irrespective of how the… information is presented" — starting from PAT vs PBIT). MJ25 (Kampai i: free-cash-flow value of Skal Co).
- *Interest wrongly deducted:* MJ25 (Kampai i: "**Deducting the interest cost** when calculating the free cash flows to the firm").
- *Wrong discount rate for the flow:* SD24 (Zulla a: "used the wrong discount rate… free cash flows to the whole firm should be discounted at… WACC"; dividends must be discounted at cost of equity). J24 (Garnod b: cost of equity with the incorrect beta).
- *Debt not stripped for equity value:* SD24 (Zulla a: "the value of the debt needs to be adjusted for… missed this simple adjustment"). MJ25 (Kampai i: "**Failing to deduct the debt value** from the total company value"). D25 (Halstock a: "Not adjusting… by the 15:85 debt/equity ratio to get the combined equity value").
- *Weak perpetuity-with-growth:* SD24 (Zulla a: "not confident using the perpetuity with growth or the delayed perpetuity with growth"). D25 (Halstock a: "incorrect perpetuity model and **including growth**… when… all variables after year 4 will remain the same").
- *Growth-from-past-data:* SD24 (Zulla a: "struggled to estimate a growth rate… using… past sales. **Calculating growth rates from past data** is a skill…").
- *Ezra names it:* "Right numbers, wrong pipe. That's a firm flow — why is it discounted at the cost of equity? And where did equity go — you haven't stripped the debt."
- *Coached fix:* fix the flow-to-rate match first (firm→WACC, equity→Ke), never deduct interest in FCFF, strip debt to get equity, and only add growth to a perpetuity when the scenario states it.
- *Costs:* **Technical marks** and **Analysis & evaluation**.

### Tier 3 — exam craft

**#6 — List-based assumption answers with no developed implication.** Assumptions stated (often as bullets) but never discussed.
- *Verified:* D23 (McKeever iv: "list-based approach with little analysis… 'it is assumed that the cost of capital is calculated correctly'"). J24 (Mahoney b(v): "stated (sometimes using a bullet point format) rather than discussed"). SD24 (Northney vi: "bullet points with little or no explanation"). MJ25 (Kampai iv: "rather than just stating 'it is assumed the 4% annual cash flow growth rate is accurate' candidates should go on to say…"). D25 (Drimpton b(ii): "simply state assumptions rather than discuss them"; a: "listed advantages rather than really explain them").
- *Ezra names it:* "That's a heading, not an argument. So what if the growth rate is wrong — what happens to your number?"
- *Coached fix:* each assumption → why it might not hold → the effect on the figure/decision. That development is also where the scepticism mark lives.
- *Costs:* **Scepticism** and technical development marks.

**#7 — Wasted calculation time on unrequested workings.** Producing calculations the requirement didn't ask for.
- *Verified:* D23 (McKeever i: "used up valuable time calculating the NPV which was not a part of this requirement"; iii: recalculating a figure already provided; Abertafol: "proving the figures for the forward rate agreements… wasting time"). J24 (Garnod a: an unrequired recommendation). MJ25 (Kampai iv: "spent considerable time… describing how they had calculated their results for which no marks were available"). D25 (Drimpton b(i): keep workings out of the cash-flow table).
- *Ezra names it:* "The requirement didn't ask for that. You've spent ten minutes buying zero marks."
- *Coached fix:* answer the requirement asked, use figures already provided, keep workings separate from the answer.
- *Costs:* **Technical marks elsewhere** (time opportunity cost) and **A&E** efficiency.

**#8 — Missing report conclusion + ignoring explicit requirement prompts.** No concluding recommendation; and secondary instructions (e.g. "suggest additional information", "identify omissions") skipped.
- *Verified:* D23 (Southmed: "did not suggest additional information… failed to earn one or two marks"; report format ignored). J24 (P-skills: "finish their report with a brief conclusion"; Garnod b: "answer the question they were hoping for rather than the question actually posed"). SD24 (conclusion "very often missing"; Mortexa a(ii): EPS part omitted — "read the requirements carefully and… answer all parts"). MJ25 ("**Far too many candidates miss out on a mark**… by failing to finish their report with a conclusion"; GCR: omissions prompt "missed out by many"; Kampai v: "failed to conclude as instructed"). D25 (conclusion mark missed).
- *Ezra names it:* "The report just… stops. Where's the recommendation? And the requirement asked you to flag missing data — you didn't."
- *Coached fix:* always finish with a brief conclusion; treat every clause of the requirement (including "suggest…", "identify omissions…") as a mark to bank.
- *Costs:* **Communication** (conclusion) and technical marks for un-answered clauses.

**#9 — Losing heart: abandoning linked discursive marks after a failed calculation.** Giving up on the discussion once the numbers go wrong.
- *Verified:* J24 (Garnod: "seemed to give up and only provide very limited answers… Candidates must learn to remain positive… others… focused on the discursive question parts and often ended up with a creditable score"). SD24 (Mortexa a(ii): "got disheartened and give up… **any mistake is only penalised once**, so an incorrect valuation at the start can still result in a correct method being well rewarded"; Zulla: "seemed to lose heart… must try to remain positive"). MJ25 (Kampai iii: "must remember **not to give up** and should be prepared to make assumptions… could still earn marks… even if much of what they had done previously was incorrect or assumed"). D25 (Halstock a: "not going any further than the initial present value").
- *Ezra names it:* "The number's wrong, but the marks after it are still alive. Carry your own figure forward and finish."
- *Coached fix:* on a wrong calc, keep going — the linked discussion, recommendation, and downstream steps still score under the own-figure rule. → **This is exactly where OFR / `carried` verdicts feed the coaching (Integration Notes #b).**
- *Costs:* **Analysis & evaluation** and the abandoned technical/discursive marks.

---

## INTEGRATION NOTES

How this catalogue wires into the AFM build (`docs/AFM_NUMERIC_VERIFICATION_DESIGN.md`, `lib/acca/numeric-verifier.ts`).

**(a) Failure #4 is a schema check, not narrative feedback.** The hedging-specification errors — direction (buy/sell), contract month, whole number of contracts, unexpired-basis period — are **per-component `answer_schema` entries** in the numeric verifier, not things Ezra critiques in prose. A hedge drill's schema carries components like `direction`, `contract_month`, `n_contracts` (with a whole-number tolerance / discrete check) and `basis_period`, each with its own `expected_value`/verdict. The verifier decides them deterministically (code owns the number); Ezra teaches only from the resulting verdict. This is why "you didn't state buy or sell" becomes a `no_workings`/`incorrect` component verdict rather than a soft comment — the examiners are explicit that these are *required instructions to the board*, so they are gradeable components, not opinions.

**(b) OFR / `carried` verdicts feed failure #9's coaching.** When the verifier returns a `carried` verdict (right method on the student's own wrong upstream figure — see design §6, and the examiners' own "a mistake is only penalised once", SD24 Mortexa), Ezra's response to "losing heart" is evidenced, not just encouraging: *"The method marks were still alive — here's what you'd have earned: your NPV assembly on your own year-1 figure was correct, that's the recommendation mark banked."* The `carried`/`no_workings` distinction is the exact hinge — carried = keep going, it counted; no_workings = the method wasn't visible, so it couldn't. Failure #9 coaching draws directly on the `VerificationResult.per_component` block.

**(c) The intent layer and gap-label taxonomy port from APM — these failure classes replace APM's.** The APM engine's intent pre-layer (attempt / question / confusion / aside) and its gap-label taxonomy carry over unchanged in *shape*; only the **failure-class vocabulary** swaps. Where APM's gap labels name describe-not-apply / no-scepticism / calc-heavy-eval-light, AFM's name **fence-sitting (#2)**, **scenario-free discussion (#3)**, **hedging-spec (#4)**, **valuation-plumbing (#5)**, **undeveloped-assumption (#6)**, and **abandoned-after-calc (#9)**. The numeric verifier supplies the code-authored gap label for the calculative classes (#4, #5, #9); the model-authored diagnosis supplies it for the discursive classes (#1, #2, #3, #6, #8) — the same split the design doc §7 describes (verifier for numbers, model for judgement).

---

## VERIFICATION NOTE

All nine catalogue entries (and every sub-point listed) were verified against the five examiner-report PDFs; each cites at least one sitting, and the three Tier-1 items were confirmed present in **all five** sittings (chronic). **No catalogue entry was unverifiable** — nothing here is inferred beyond the examiners' own wording and the S26–J27 syllabus role description.
