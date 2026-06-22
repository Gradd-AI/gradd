# APM BUILD CONTRACT
Status: LOCKED 19/06/2026. This doc is authoritative for the APM build. Where notes or older docs conflict, THIS wins.

## LAUNCH PHILOSOPHY — complete at launch, NOT a waitlist
APM launches as an irreducibly complete product: the free drill AND the paid product (full 73-drill set + paid conversational APM tutor + working subscription billing) all live at the same time. When it goes live it is a finished thing a stranger can pay for — not a holding page collecting emails.

- NO waitlist-and-return launch. The chicken-and-egg is solved by building both halves before go-live, not by capturing emails now and bringing people back later.
- The email-capture wall built this session is a TEMPORARY FALLBACK only. It is NOT the endpoint and NOT a demand-test mechanism. Treating the waitlist as a demand signal is the dead demand-gate logic (killed in GRADD_STRATEGY_CORRECTIONS_JUN2026.md) in new clothes — do not reintroduce it.
- Build on conviction. Launch complete. Advertise ONLY once the product converts. (Per GRADD_STRATEGY_CORRECTIONS_JUN2026.md, which governs.)
- At launch the wall becomes "Subscribe — all 73 drills + the APM tutor", leading to real subscription billing, not a mailing list.

## DRILL FUNNEL — proven, locked
Data-flow (proven end-to-end 19/06/2026 on B1c):
- Server component (app/acca/drill/page.tsx) fetches the free drill directly via service-role Supabase client and passes it as props. No GET API route (removed as orphan — server-component direct fetch is the pattern).
- Free drill is config: FREE_DRILL_LO constant (currently 'B1c'), swappable without touching funnel logic.
- 5-stage client state machine (DrillFunnel.tsx): attempt → hint (on request, distinct stage) → re-attempt → examiner reveal → wall. Stages must NOT collapse; the hint→re-attempt beat is what makes the reveal land.
- SIMPLE PRESENTATIONAL funnel — NO server-side marking. The server serves content and (currently) captures a lead; the student self-assesses against the reveal. Rationale: the drill funnel exists to sidestep live marking via pre-baked reveal-as-data. Server-side marking on the free teaser would drag the parked two-call complexity forward and contradict the design. Marking belongs in the paid conversational tutor (phase 2).
- Lead capture (app/api/acca/lead/route.ts, POST) writes to acca_leads via service-role, email validated server-side, duplicate-email treated as success. This route stays for now but the wall's PURPOSE changes to subscription at launch.

## DATA MODEL — built and verified this session
- acca_drills: scoped (exam_board='ACCA', paper_code='APM'), DrillSpec fields + 5 content fields (question, context_text, model_answer, hint, full_reveal) + status (candidate|approved|rejected) + published. RLS ON (service-role reads). full_reveal = misconception-named teach-through (the moat), NOT a restated answer.
- acca_leads: separate table, references drills by id. Temporary — see launch philosophy.
- Two-stage gate: status='approved' AND published=true to serve.

## AUDITED BUILD STATE (19/06/2026) — the truth, not the notes
Pre-session notes claimed a partly-built drill funnel (table, generator, 6 seed drills, public route). FALSE. The audit found ONLY scripts/apm-framework.ts existed (73 LOs, typed, source-cited DrillSpec — genuinely strong). Built THIS session: acca_drills + acca_leads tables, scripts/generate-apm-drills.ts (two-pass generator), the drill funnel page + lead route. 10 drills generated, QA'd (Grant's finance QA caught + fixed a calc-precision generator flaw), approved, published. B1c is the proven free drill.

## BUILD SEQUENCE TO COMPLETE PRODUCT
1. Generate + QA + publish the remaining 72 drills (one per LO). Pipeline proven on 10; scale with the same gate (generate as candidate → adversarial content-check + Grant finance QA on calc → approve → publish).
2. Build the paid conversational APM tutor — the parked TWO-CALL teaching pattern (call 1 generates, call 2 withholds/teaches), professional-exam register, the actual recurring-revenue product.
3. Wire ACCA subscription billing (Stripe, price IDs, same account as IB).
4. Convert the wall: free drill + paid tutor live together; wall → subscription, not email.
5. Launch complete. THEN advertise once converting.

## CONVERSATIONAL TUTOR ARCHITECTURE — proven by spike 19/06/2026
The paid APM tutor uses a THREE-CALL structure that withholds the answer STRUCTURALLY (not by instruction). The model answer exists in exactly one call's output and never enters any context the student's teaching is generated from. This solves the withhold problem (you cannot instruct a model to suppress an answer in its own context — proven twice empirically; structural absence is the only reliable fix).

- CALL 1 — GENERATE: produce the full model answer. Stored server-side. NEVER passed to call 2's output path or call 3. Model: claude-haiku-4-5 (straightforward generation).
- CALL 2 — DIAGNOSE: input = question + student attempt + model answer. Output = a SHORT GAP LABEL naming the student's error pattern in their own error terms, max ~15 words, FORBIDDEN from stating the correct answer. e.g. "applied normal-good income logic to an inferior good" — NOT "demand falls when income rises". Model: claude-sonnet-4-6 — REQUIRED here; Haiku leaked the answer into the label, Sonnet produced clean gap-labels first try. The diagnosis is the precision step and needs the stronger model.
- CALL 3 — TEACH: input = question + attempt + the call-2 gap label ONLY (NOT the model answer). Produces hint (first miss) / diagnosis-led teach-through (second miss). Cannot leak the answer — it was never in context. Model: claude-haiku-4-5 (teaches well from a label).

KEY INVARIANT: the model answer from call 1 must never reach call 3, AND call 2's output (the label) must never contain the answer. Both boundaries are required — a leaky diagnosis reintroduces the leak through call 2. Verified: clean on both a clean-inversion case and a subtle partial-right case.

This replaces the parked "two-call pattern" reference elsewhere — it is three calls, and the diagnosis-label discipline is the crux.

This is the Gradd-wide STRUCTURAL WITHHOLDING primitive — see docs/TEACHING_ARCHITECTURE.md for the product-agnostic statement. APM is the first product built natively on it.

### Eli content audit — SEPARATE from architecture/register (confirmed 19/06/2026)
The three-call architecture and Eli's register are proven. This says NOTHING about content correctness. Eli's APM substance — terminology, intellectual levels, technique facts — goes through adversarial study-guide cross-check before launch, same two-gate discipline as IB (method/architecture audited separately from content).
First confirmed leak: Eli labelled an "apply and evaluate" verb as "AO5" in one call and "Level 3" in another. APM uses intellectual levels (1/2/3), NOT IB's AO framework — "AO5" is IB assessment-framing bleeding into APM. Watch for this class of error (IB conventions leaking into ACCA) throughout the content audit.
Second confirmed Eli content slip (19/06/2026): on the B3d cooking-oil drill, Eli's teach-through framed the cost position as a "shortfall"/"gap to close" and told the student to "name the shortfall in cash terms" — but estimated cost (222) is BELOW target cost (228), a KES 6 SURPLUS, not a gap. Eli taught the student to find a shortfall that doesn't exist. Class of error: Eli misreading/inverting the scenario's own numbers in the teaching. Confirms architecture-proven says nothing about content-correct. All Eli substance through adversarial study-guide cross-check before launch.

### Generator patterns to fix before the 72-drill scale run (found in B3d audit, 19/06/2026)
The static drill content is sound (B3d: zero WRONG, zero taxonomy errors, arithmetic correct). But two generator HABITS surfaced that will likely repeat across all 73 — fix in the generator prompt before the bulk run, don't patch 73 drills individually:
1. LOOSE DIRECTIONAL WORDING: generator wrote "cost gap" where the figure was a favourable surplus ("gap" implies adverse-to-close). May have seeded Eli's live inversion. Generator rule: name directional results precisely — surplus/favourable vs gap/adverse — never "gap" for a favourable difference.
2. INVENTED SCENARIO COLOUR: generator added detail not in the scenario ("volatile in Kenyan FMCG supply chains", "recalls and customer compensation" asserted as fact). Generator rule: assert only what the scenario provides; extra detail must be phrased as examples ("may include..."), never asserted.

3. WRONG CONCEPTUAL EXPLANATION DESPITE CORRECT ARITHMETIC (found A3b, 19/06/2026): the generator produced correct numbers (ROCE, EVA all reconciled) but a WRONG mechanism in the evaluation — claimed goodwill amortisation/expensed dev costs "inflate the profit margin" (they REDUCE profit). Also overstated EVA "symmetry" (risked teaching cumulative amortisation added to NOPAT) and contradicted itself (called the same TRY 60m both "capitalised" and "expensed"). THIS IS THE MOST DANGEROUS PATTERN: arithmetic QA passes it because the numbers are right; only the adversarial study-guide audit catches the wrong teaching. Implication: the study-guide content audit is MANDATORY per drill before approval — never skippable on the grounds that "the arithmetic checks out". Numbers correct ≠ explanation correct.

Pattern 3 CONFIRMED SYSTEMATIC (A3b + A3e, 19/06/2026): "right numbers, wrong mechanism" is not a one-off. Both calc drills audited had clean arithmetic but a WRONG causal explanation — A3b: claimed amortisation "inflates profit margin" (it reduces profit); A3e: claimed lower RI "reflects larger asset base" (it reflects smaller spread over cost of capital). Implication for the 72-drill scale run: the generator reliably produces correct calculations with occasionally-inverted conceptual reasoning. Two options before scaling: (a) tighten the generator's Pass-1/teaching prompt to reason mechanism explicitly, OR (b) accept it and treat the study-guide audit as a hard per-drill gate on the full 73. Either way, arithmetic QA alone is INSUFFICIENT — every drill needs the conceptual/mechanism audit. Decide the generator-vs-audit approach before the bulk run.

Pattern 4 — SCENARIO SELF-CONTRADICTION (found A5e, 19/06/2026): the generated SCENARIO stated a figure (conventional margin 35.0%) that contradicts its own data and the model answer (revenue/cost give 70.3%). Distinct from wrong-mechanism — here the scenario's stated facts don't reconcile with its numbers. Generator rule: the scenario must not state a derived result the student should calculate, and any figure it does state must reconcile with the underlying data. Best practice: scenarios give raw data only; the answer derives results.

Pattern 4 sibling — ANSWER MISREADS SCENARIO WORDING (found B1b, 19/06/2026): the model answer misread "fixed overheads INCLUDE a R30,000 lease renegotiated upward" as "lease rose BY R30,000", restated the budget wrongly and invented a R12,000 F controllable variance that doesn't exist. Related to A5e (scenario self-contradiction): both are the generator mishandling the scenario↔answer figure relationship. Generator rule: the answer must read scenario figures literally and not invent variances/results the data doesn't support.

Pattern 4 WORST CASE (found D2e, 19/06/2026): the scenario supplied a SUMMARY STATISTIC (Σxy) that did not match its own raw data points; the model answer computed off the wrong supplied stat, producing an entirely wrong regression (slope, intercept, forecast all wrong) — yet internally consistent, so finance-QA passed it. A student computing from the raw data gets totally different (correct) numbers than the "model answer". MOST DANGEROUS arithmetic pattern: the answer reconciles against a wrong input. Generator rule: NEVER supply pre-computed summary statistics (Σxy, Σx² etc.) alongside raw data the student should aggregate — give raw data only, derive all summary stats in the answer. If summary stats must be given, they MUST be recomputed from the raw data and verified to match before output.

EDITING DISCIPLINE (learned A5c, 19/06/2026): multi-line REPLACE on stored drill fields is fragile — A5c took 5 failed REPLACE rounds (invisible byte/whitespace mismatches between displayed and stored text). RULE: for any drill content fix touching more than one line or a table, OVERWRITE THE WHOLE FIELD (UPDATE ... SET field = full corrected value), never surgical REPLACE. Single-line, single-occurrence swaps only for REPLACE. This matters for the 72-run review: budget for full-field regeneration of flagged drills, not patching.

### Session-state rule: generate-once-per-drill
Call 1 (model answer) and the diagnosis inputs must be generated ONCE when a drill opens and cached for that drill's lifetime in the session — reused across every attempt/turn on that drill. Do NOT re-run call 1 per turn: it drifts the model answer (observed in spike — gap label varied across runs because call 1 regenerated), wastes tokens, adds latency. Session state per drill holds: cached model answer, miss-count, student attempts.

### Proof-batch finding (19/06/2026): rule 3 FAILED as a prompt instruction — needs architectural fix
Tightened generator re-tested on the 6 worst-offender LOs. Patterns 1, 2, 4, 5 dropped well (A3b, A3e came back clean of their wrong-mechanism errors — only minor IMPRECISE left). BUT pattern 3 (supplied summary stat contradicting raw data — the worst defect) RECURRED on the fresh D2e: scenario supplied Σxy=178,850 (raw data gives 179,350) and Σx²=119,300 (raw gives 119,900) — TWO wrong supplied stats, answer computed off them, exactly the original disaster. The prompt rule "give raw data only" did not hold — the generator supplied stats anyway and got them wrong.
LESSON: you cannot reliably INSTRUCT the generator to not produce summary stats — same as the withhold problem (instruction insufficient; architecture required). FIX: for any calc drill involving summary statistics (regression especially), COMPUTE the stats and derived results in CODE (deterministic TS function reading the raw data points), NOT in the model. The generator produces the scenario (raw data) + teaching only; code produces Σx/Σy/Σx²/Σxy/b/a/forecast. Arithmetic the model both generates and must keep self-consistent is unreliable; take it out of the model's hands.
This must be built before any regression/summary-stat drills are scaled. The other 5 patterns appear adequately controlled by the prompt rules (confirm A5c/B1b/A4a results).

### Proof batch COMPLETE (19/06/2026) — tightening verdict
6 worst-offender LOs regenerated with the tightened generator and re-audited. Result:
- Pattern 1 (wrong mechanism despite right arithmetic) — ELIMINATED (A3b, A3e both clean of their original inversions).
- Pattern 5 (scepticism overreach into IAS/audit) — ELIMINATED (A5c clean).
- Pattern 3 budget-misread variant ("includes" misread) — ELIMINATED (B1b read it literally; the calc-branch rule held).
- Patterns 2 (invented colour) + 4 (over-absolute causality) — REDUCED to minor IMPRECISE drift, no longer WRONG (A4a, B1b residuals). Content audit mops these up.
- Pattern 3 summary-stat variant — RECURRED (D2e supplied wrong Σxy/Σx² again). Prompt rule insufficient; needs architectural fix.

SCALING VERDICT:
- Non-calc and non-summary-stat drills: SCALE on prompt tightening + mandatory content audit (audit catches residual IMPRECISE drift).
- Summary-stat calc drills (regression etc.): BLOCKED until the code-computes-stats fix is built. Generator emits raw (x,y) data only; a deterministic TS function computes Σx/Σy/Σx²/Σxy/b/a/forecast and writes them into the answer. Then the worst pattern is structurally impossible.

## 10-DRILL CONTENT AUDIT — COMPLETE (19/06/2026)
All 10 published drills audited against the ACCA APM study guide (adversarial checker, clean window) and corrected. All now clean across three gates: arithmetic QA, study-guide content audit, and (free drill B1c) live teaching test. The audit's purpose was to prove the pipeline and build the failure catalogue — both done. The catalogue stopped producing new patterns by the final drills (B1c, D1a, A4a clean-to-minor), indicating completeness.

### Generator failure catalogue (the audit's key output — tighten generator against these before any scale run)
1. WRONG MECHANISM DESPITE CORRECT ARITHMETIC (A3b, A3e) — numbers reconcile, the causal explanation is inverted. Most dangerous: passes arithmetic QA; only the content audit catches it.
2. INVENTED SCENARIO COLOUR (B3d, A3b, A5c, A5e, D1a — most common, 5 instances) — asserting detail not in the scenario (country-specific regs, recalls, named indices).
3. SCENARIO/ANSWER FIGURE CONTRADICTION (A5e, B1b, D2e) — scenario states a derived result contradicting its own data (A5e), answer misreads scenario wording (B1b), or supplied summary stat contradicts raw data (D2e, worst — answer reconciles against a wrong input, survives arithmetic QA AND reconciliation; only source-verification catches it).
4. OVER-ABSOLUTE CAUSAL/DIRECTIONAL CLAIMS (B1c, D1a, A4a) — "directly", "precede and generate", "eliminate" stated as proven when scenario shows only concurrence/plausibility.
5. SCEPTICISM OVERREACH INTO AUDIT/LEGAL TERRITORY (A5c) — IAS 37, "deliberately suppressing", external-auditor escalation beyond the APM lane.

### Error-rate finding
Errors concentrate in CONCEPTUAL-EXPLANATION and JUDGEMENT-CLASSIFICATION drills (A3b, A3e, A5c), NOT in mechanical-calc or well-defined-technique drills (B1c, D1a came back clean-to-minor). Generator hardening should focus on causal explanation and classification judgement.

### Scaling decision
The adversarial content audit is a MANDATORY per-drill gate that cannot be skipped on calc drills (D2e proved arithmetic QA insufficient). Scaling = tighten generator against catalogue → generate in volume → adversarial-check EVERY drill → human reviews only flagged (WRONG/ARITHMETIC) drills + finance QA on flagged calc drills. Scale away the manual reading, not the gate.

### Code-computes-stats fix PROVEN (19/06/2026) — pattern 3 summary-stat variant structurally dead
Built and verified. SUMMARY_STAT_LOS routes regression/summary-stat LOs through: generator produces raw (x,y) data only (scenario has NO Σ columns, no b/a/forecast); computeRegression() computes all stats in TS at full precision and asserts the line passes through the means (throws on failure); buildRegressionModelAnswer() templates code-computed values into the worked answer. Model contributes narrative only, never arithmetic. Fresh D2e dry-run verified: raw points → Σxy 10,195.3, Σx² 194.99, b 47.2434, a 29.71, forecast 369.86 — all independently hand-recomputed and matching, scenario gives raw data only. The contradiction is now impossible by construction (code computes once, feeds both stats block and answer). Add future regression LOs to SUMMARY_STAT_LOS to route them the same way.

SCALING NOW FULLY CLEARED for all drill types:
- Non-calc/conceptual/classification & simple calc: prompt tightening + mandatory content audit.
- Summary-stat/regression: code-computes-stats path + content audit.

## DISCIPLINE
- Content sourced from the ACCA APM study guide via adversarial AI-checks-AI + Grant's finance QA. Never from model memory.
- Calc drills: no rounded intermediates as inputs; reconciliation required (generator rule, added this session after a real defect).
- Schema changes via Supabase SQL Editor only, never script-driven.

### Production state vs branch (19/06/2026) — KNOWN, do not "fix" prematurely
PRODUCTION (main) serves ONLY the old waitlist page at gradd.ai/acca (commit f2b4fca, "ACCA APM demand-test landing, email capture only" — Mia persona, "Reserve your place", writes to waitlist table). It predates this session and contradicts the locked launch strategy.
The REAL product — drill funnel (/acca/drill), Eli tutor (/acca/tutor), tightened generator, audited drills — is ALL on feature/apm-drills, NEVER merged to main. Production /acca/drill and /acca/tutor are 404 until merge.
This is fine and intentional for now: branch stays unmerged until the product is LAUNCH-COMPLETE (full drill bank + paid tutor + billing). The waitlist page is a harmless holding page (near-zero traffic, no marketing points there yet).
AT LAUNCH: merging feature/apm-drills replaces the waitlist page. The old /acca landing must be rewritten then — Eli not Mia, real subscription not waitlist, "where you lose marks" not "Failed APM", no false free-marking claim (per APM_MARKETING_POSITIONING.md). The current page is a COPY SOURCE (good application/evaluation framing, audience segments), NOT shippable.
Do NOT merge feature/apm-drills to main until launch-complete.

### Tier-1 scale run — IN PROGRESS, resume point (state at 03da81c)
SCALING METHOD PROVEN, three generator-pattern fixes banked. The apply/evaluate bar holds structurally on all drills; the content audit (external checker, clean window, against the APM guide) remains the MANDATORY gate and is catching real WRONG/ARITHMETIC that the bar doesn't.

GENERATOR PATTERNS FOUND & FIXED (fix the source, never hand-patch the batch):
- Rules 7/8 (tip e690354): ROIC-vs-ROCE labelling (NOPAT/post-tax return = ROIC never ROCE); WACC scepticism discipline (challenge generically, no invented country-macro colour, no one-directional "mechanically inflates").
- Rule 9 + metadata verb (tip 03da81c): ASSERTION DISCIPLINE — unevidenced risks (covenant breach, construction delays, depreciation treatment, cycle times, stockpiling) must be CONDITIONAL validation points, never asserted. command_verb metadata now reflects the question's real demand ("explain and advise"), not the bare LO verb.

DRILL STATE (acca_drills, 10 candidate + 10 approved = 20):
- 3 A3b candidates (ids 365cb7f8, 3b4a8c98, 9d165a51): HAND-AUDITED CLEAN across all 5 fields. KEEP. (Fixed: a fabricated ROIC figure, a wrongly-capitalised restructuring provision, ROCE→ROIC, WACC overreach.)
- 7 regenerated candidates (A3e×2, A3c×2, A3d×2, A3f×1): generated at e690354 (BEFORE rule 9). Two A3c AUDITED — both carry pattern-2 over-assertion + "explain"-only metadata verb. NOT yet fixed.

RESUME POINT (work machine, next session):
1. The 7 regenerated drills predate rule 9, so they carry the assertion-discipline defect. DECISION PENDING: regenerate all 7 at tip 03da81c (rules 9 + metadata now baked in) rather than hand-patch — same delete-keep-3-A3b / survivor-check-before-delete procedure as before (scope: status='candidate', lo_code IN A3e,A3c,A3d,A3f; the 3 audited A3b ids must survive).
2. Then audit the freshly regenerated 7 via external checker. If ROIC/WACC/assertion patterns are all absent, the audit should finally be confirm-and-approve (light). If a NEW pattern appears, fix generator + regenerate again — finite pattern set, this is how it ends.
3. Approve clean ones (status='approved'); bring only WRONG/ARITHMETIC back for SQL fix.
4. When all 10 Tier-1 candidates are audited-clean: that's the first publishable Tier-1 set. Then next Tier-1 batch (A3b-style EVA/ROIC drills — the real test of rule 7), then Tiers 2/3, then Stripe billing (test on production — webhooks can't reach preview), convert wall to subscription, merge feature/apm-drills to main = launch.

KEY DISCIPLINE CONFIRMED THIS SESSION: a model_answer content fix REQUIRES fixing hint + full_reveal too (they're generated against the same flawed answer, carry the same error). Fix all 5 fields. SQL scoped by exact id (multiple candidates share lo_code). Full-field OVERWRITE, never surgical REPLACE on multi-line fields.

### A3 deepened + key process finding (state at 03fb315)
A3 (financial performance) now DEEP: 8 EVA/ROIC drills across 8 sectors/regions, all through the external checker. 25 approved / 0 candidate total. Rule 7 (ROIC labelling) PROVEN at scale — zero ROCE-mislabel across 5 fresh EVA drills.

CRITICAL PROCESS FINDING: Claude Code's self-assessment has a ~75% miss rate. Of 4 self-graded "clean/IMPRECISE" A3b drills, 3 had real WRONG/ARITHMETIC errors (Korea: inverted ROCE logic ×, 28k R&D capital-vs-NOPAT, R&D disqualification test; Germany: R&D averaging + unused depreciation data; Brazil: asymmetric EVA capitalisation; India: both-directions caveat misapplied to WACC). The EXTERNAL checker is MANDATORY on every drill, no exceptions — self-assessment is NOT the gate. Errors hide under correct arithmetic (mechanism reversed, numbers right).

Rule 8 generator note (next prompt pass): (a) no invented WACC ranges; (b) both-directions caveat scoped to dual-effect adjustments only, NOT WACC.

NEXT SESSION — the launch path decision: pivot from DEPTH to BREADTH. A3 is deep but most LOs have voids (churn risk — a paid product with empty topics isn't credible). Plan: ONE audited drill per examined-core LO (Tier 1 + Tier 2, ~25-35 more drills) to kill the voids = launchable bank. THEN billing (Stripe, test on production), convert wall to subscription, merge to main = launch. Deepen high-frequency LOs post-launch, usage-driven. Do NOT build acca.gradd.ai subdomain until conversion proven on the /acca path (mechanics banked: CNAME + Vercel domain + hostname-routing branch, ~an afternoon when the time comes).

### IB / Mia teaching scope — RESOLVED 21/06/2026 (corrects earlier "too rigid" read)
Mia teaches concepts from scratch (probe-first: draws the concept out with examples, e.g. salt vs jewellery for elasticity, excludable/rivalrous for public goods — confirmed working). AND the product has a "Jump to any topic" picker — 210 lessons, searchable, student can navigate to any topic on demand. So the student is NOT sequence-trapped; they have full topic freedom at the navigation level, while Mia keeps focus WITHIN an active lesson.
This is a coherent design: self-direction at navigation level + focus at teaching level. NOT the cold-start hole earlier feared.
ONE small gap: when Mia declines a mid-lesson topic-jump request ("teach me elasticity" while mid public-goods), she refuses without signposting that the student can jump to that lesson via the topic picker. Minor prompt/UX fix — Mia should point to the picker, not just hard-refuse. Not structural.
