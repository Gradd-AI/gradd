# APM BUILD CONTRACT
Status: LOCKED 19/06/2026. This doc is authoritative for the APM build. Where notes or older docs conflict, THIS wins.

> **CURRENT FOCUS (30/06/2026): the engine is essentially complete and verified — the launch gate is now CONTENT.** All five redesign mechanics are built and the completeness gate is verified working (details below). The binding constraint to launch is the drill bank: ~40 net-new verified drills weighted to exam structure (B/C/D are thin). **Next session = content, not more engine.** Item 5 (weakness ledger) is the only remaining redesign item and is LOWER priority than content.

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

### Ezra content audit — SEPARATE from architecture/register (confirmed 19/06/2026)
The three-call architecture and Ezra's register are proven. This says NOTHING about content correctness. Ezra's APM substance — terminology, intellectual levels, technique facts — goes through adversarial study-guide cross-check before launch, same two-gate discipline as IB (method/architecture audited separately from content).
First confirmed leak: Ezra labelled an "apply and evaluate" verb as "AO5" in one call and "Level 3" in another. APM uses intellectual levels (1/2/3), NOT IB's AO framework — "AO5" is IB assessment-framing bleeding into APM. Watch for this class of error (IB conventions leaking into ACCA) throughout the content audit.
Second confirmed Ezra content slip (19/06/2026): on the B3d cooking-oil drill, Ezra's teach-through framed the cost position as a "shortfall"/"gap to close" and told the student to "name the shortfall in cash terms" — but estimated cost (222) is BELOW target cost (228), a KES 6 SURPLUS, not a gap. Ezra taught the student to find a shortfall that doesn't exist. Class of error: Ezra misreading/inverting the scenario's own numbers in the teaching. Confirms architecture-proven says nothing about content-correct. All Ezra substance through adversarial study-guide cross-check before launch.

### Generator patterns to fix before the 72-drill scale run (found in B3d audit, 19/06/2026)
The static drill content is sound (B3d: zero WRONG, zero taxonomy errors, arithmetic correct). But two generator HABITS surfaced that will likely repeat across all 73 — fix in the generator prompt before the bulk run, don't patch 73 drills individually:
1. LOOSE DIRECTIONAL WORDING: generator wrote "cost gap" where the figure was a favourable surplus ("gap" implies adverse-to-close). May have seeded Ezra's live inversion. Generator rule: name directional results precisely — surplus/favourable vs gap/adverse — never "gap" for a favourable difference.
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

### STANDING TEST PROTOCOL — verify the ENVIRONMENT before concluding the CODE (mandatory, added 30/06/2026)
ROOT PATTERN: every false trail this project hit traced to the test environment not matching intent — wrong user_id, stale deploy, stale counter, wrong drill, flag-not-live — NEVER the code being wrong. The flag-not-live trap alone recurred 6× in the 29–30/06 completeness-gate session. Before drawing ANY conclusion from a behaviour test, confirm ALL of:
1. **Incognito window** — no cached session/JS, no stale auth.
2. **Flag is LIVE** — env var set in Vercel Preview scope AND a deploy built AFTER it was set. Set-but-not-redeployed = flag OFF (Vercel binds the env-var set to each deployment at build time; a dashboard-only redeploy or a build predating the var won't carry it). Quick proof: one throwaway/known-behaviour input that ONLY behaves a certain way flag-on. STRONGEST proof = a temp log INSIDE the flag-gated function (e.g. `[GATE-CC]`): if it appears in runtime logs, the flag is bound, because the line only executes when the flag is on. The MCP cannot read env-var bindings per deploy — instrumentation is the only authoritative check.
3. **Deploy commit matches intent** — confirm the build being tested is the commit you mean to test, not a stale/earlier build. Test on the branch ALIAS (`gradd-git-feature-apm-drills-…`), NOT the per-deployment direct URL — the direct URL **subscribe-gates even signed-in users** (unusable for tutor testing). Confirm the alias resolves to your intended SHA before each run (`get_deployment` on the alias hostname → check `meta.githubCommitSha`); a revert or doc-only deploy landing in between can repoint the alias.
4. **Single-drill LO** (e.g. B1c) so the scenario is STABLE. Multi-drill LOs (A3b ×9, A3e ×3) random-serve per request → answer won't match the loaded scenario → drill-mismatch contaminates the read. `select lo_code, count(*) ... where status='approved' and published group by lo_code having count(*)=1` to confirm single.
5. **Reset the drill's `acca_tutor_progress` row between cases** — stale `miss_count` skips branches (hint vs teach vs reveal) and muddies the read.
6. **Confirm the CURRENT test account id** — temp emails get burned, so the id changes; check before assuming.

### Production state vs branch (19/06/2026) — KNOWN, do not "fix" prematurely
PRODUCTION (main) serves ONLY the old waitlist page at gradd.ai/acca (commit f2b4fca, "ACCA APM demand-test landing, email capture only" — Mia persona, "Reserve your place", writes to waitlist table). It predates this session and contradicts the locked launch strategy.
The REAL product — drill funnel (/acca/drill), Ezra tutor (/acca/tutor), tightened generator, audited drills — is ALL on feature/apm-drills, NEVER merged to main. Production /acca/drill and /acca/tutor are 404 until merge.
This is fine and intentional for now: branch stays unmerged until the product is LAUNCH-COMPLETE (full drill bank + paid tutor + billing). The waitlist page is a harmless holding page (near-zero traffic, no marketing points there yet).
AT LAUNCH: merging feature/apm-drills replaces the waitlist page. The old /acca landing must be rewritten then — Ezra not Mia, real subscription not waitlist, "where you lose marks" not "Failed APM", no false free-marking claim (per APM_MARKETING_POSITIONING.md). The current page is a COPY SOURCE (good application/evaluation framing, audience segments), NOT shippable.
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

### Framework void batch COMPLETE (21/06/2026) — breadth pass underway
Killed the highest-value voids: all Section A staple framework models now covered + externally audited — A1f (BSC), A2d (Performance Pyramid), B4b (Building Block services), B2a (Building Block HRM), A2c (CSF→KPI), C1a (management reports). 31 approved / 0 candidate total.
Framework-accuracy finding: conceptual drills CAN get the model STRUCTURE wrong while applying it sensibly — B4b stated the three Building Blocks as "Standards/Rewards/Results" (invented "Results" block; correct is Dimensions/Standards/Rewards with six dimensions inside Dimensions). External checker caught it; self-scan missed it. CONFIRMS: framework-accuracy check is mandatory on conceptual drills, same as arithmetic check on calc drills. Add to checker brief: verify the model's actual structure (block/dimension counts, authorship) against the guide.
BREADTH STILL TO DO: Tier-1 remaining voids — B1d, B4c, B4f; Tier-2 voids — A1g, A1h, A2a, A2e, A4b, A5a, A5b, B1a, B2e, B3a, B3b, B3c, B4a, D2a, D2c (D2a/D2c = Section B near-guaranteed, high priority). ~18 LOs still void = one-drill-each to complete breadth, then launchable.
THEN: billing (Stripe, test on production), convert wall to subscription, merge to main = launch. Exam-readiness gap (full-question/timed practice) banked as post-launch. IB/Mia cold-start resolved (teaches from scratch + jump-to-topic picker; minor signposting fix only).

### Breadth batches 2 + 3 COMPLETE (21/06/2026)
45 approved / 0 candidate. Batch 2 (8): D2a, D2c, B1d, B4c, B4f, B1a, B3c, A4b — killed Section B guaranteed voids (D2a/D2c) + remaining Tier-1 + Tier-2 chunk. Batch 3 (5): A2a, A1g, A1h, B3a, B3b — strategic-planning cluster.
Audit profile on conceptual/framework drills: framework ACCURACY held across all (3Es, Porter value chain, benchmarking types, analytics types, Building Block all stated correctly — no structural errors after the B4b fix). Failure mode is over-assertion/causality-overclaim (pattern 2/4), caught and softened per drill. A few real WRONG caught: B4f (economy from blended cost-per-journey), B3b (value-destruction from ROCE-vs-WACC alone), A2a (controllability). External checker stays mandatory — self-scan still misses these.
BREADTH REMAINING (~5 long-tail voids, one batch): A2e (performance planning gap), A5a/A5b (sustainability strategy/targets), B2e (reward consequences), B4a (service SHIP characteristics). After that batch = breadth complete = launchable bank.
THEN: billing (Stripe, test on production), convert wall to subscription, merge to main = launch.

### BREADTH COMPLETE — launchable bank (21/06/2026)
Batch 4 (final 5 long-tail voids) done: A2e, A5a, A5b, B2e, B4a — all externally audited and approved. 50 approved / 0 candidate.
BREADTH PASS COMPLETE: every examined-core LO (Tier 1 + Tier 2) now has at least one externally-checked drill. No voids remain in the examined syllabus. This is the launchable bank — a credible diagnostic surface across the whole examined APM syllabus, paired with Ezra for teaching.
Batch 4 catches (all by external checker, self-scan missed): A2e arithmetic (34% vs 52.4%/34.4% gap) + "no additional capital" WRONG; A5a PUE-interpretation WRONG (23% PUE drop ≠ 23% efficiency gain) + shadow-carbon-price logic; B2e judgement (replace not modify, given tripled mis-selling). Frameworks all stated correctly (3Ps, SHIP, IR-vs-3Ps distinction).
NEXT = LAUNCH PATH: billing (Stripe, same account as IB, test on PRODUCTION — webhooks can't reach preview), convert the wall from email-capture to subscription, then merge feature/apm-drills to main = launch. Post-launch: deepen high-frequency LOs by usage data; add full-question/timed exam-condition practice (the banked exam-readiness gap).

### SESSION HANDOFF — 23/06/2026 (work machine → home machine)

STRATEGY (locked this session, banked at 420dfdd / a6f0684):
- Competitor map final: ACCAly (cheap/thin/flaky AI, answer-dumps), Learnsignal (REAL anchor — Gold-approved, 100k students, human tutors, £549 APM course / €49.99-199.99 mo all-papers — but it's a COURSE: recorded video + self-marked questions + async human marking, NOT live coaching), question banks (commodity). Confirmed seam: every competitor is STATIC or DISCONNECTED. Nobody coaches live, in-the-moment, on the student's own answer. That's our moat, proven in head-to-head.
- Positioning: NOT a "better ACCA platform" (lose to Learnsignal on breadth). We are the live coach on YOUR answer for the hardest paper. Borrow Learnsignal's packaging (5-min orientation, failure-mode framing), not their engine.
- Pricing FINAL: €99 90-day APM exam-pass (HERO) + €49/mo (secondary + conversion path). Hybrid pass-led. Anchor to £270 resit + £549 course (both make €99 look cheap). NO per-week framing. NO pass-guarantee at launch (no outcome data — post-launch lever). Free tier = unlimited drills + 3 teach-throughs.

BUILT + COMMITTED THIS SESSION (all on feature/apm-drills, tip after rename):
- Issue 1 FIXED (critical): Ezra was falsely flagging CORRECT variance answers as wrong (sign-convention). Root cause: Call 1 (Haiku) generated model answer with no sign discipline, Call 2 (Sonnet) diffed against it and read equivalent-but-differently-signed answers as errors. FIX = made Call 2 equivalence-robust (check mathematical equivalence before flagging; correct-in-different-convention is NOT an error) + belt-and-braces sign convention on Call 1. Hammer-tested 6x, zero false positives. THE DIAGNOSIS IS THE MOAT — this had to be right.
- Drill→tutor loop BUILT + VERIFIED: drill → Ezra → teach-through → "try another" → next drill (same-sub-area bias) → repeat → CAP at 3 teach-throughs → paywall inline in tutor. Counter = localStorage apm_teach_throughs_used (soft gate pre-Stripe; real gate = auth at Stripe time). Cap counts teach-throughs DELIVERED not turns (verified: hint doesn't count, only teach-through). Walked 3 full loops, cap fired correctly at 3.
- Analytics layer BUILT + VERIFIED: acca_funnel_events table (Supabase, anon_id stitches journey across pages, user_id nullable for future auth). Event POST route fire-and-forget. anon_id generated once in lib/acca/anon-id.ts, read everywhere. Walked-loop query confirmed: one anon_id, full event trail, 3 teach_through_delivered, paywall_shown. GDPR: legitimate-interest basis, needs privacy-policy line before launch (flagged, not done).
- RENAME DONE: Eli → Ezra everywhere (ACCAly collision killed). Biblical scholar-teacher name, fits Mia/Aoife family. Runtime-verified (ezra_response key works both sides, Ezra renders + diagnoses). Zero \bEli\b hits remain. Spike scripts _spike_eli_* now tracked (filenames left, internal artifacts).

KNOWN BUGS / DEFERRED (not blocking, logged):
- Bug 1 (drill_shown fires 2x): StrictMode dev-only, fires once in prod. INERT. No fix.
- Bug 2 (repeat-drill): next-drill only excludes immediately-current lo, can re-serve a drill seen earlier in session. FIX PLANNED (exclude all drill_lo this anon_id has seen via acca_funnel_events query, dedupe with Set). NOT built. ~20 lines.
- Issue 2 (parked): tutor treats funnel-arrival attempt2 as cold first attempt → gives hint before teach-through, re-runs the gauntlet. Plan exists (from_funnel flag → skip cold hint → straight to teach). PARKED — being absorbed into the one-surface port below.
- Latency: 3-call chain is measurably slow (try_tutor → teach_through was 1-3 min in walk). Conversion risk. Needs attention.
- Paywall hole: /acca/tutor direct-nav still ungated. Closes at Stripe/auth time.

NEXT SESSION (home machine) — THE EXPERIENCE WORKSTREAM (the big one):
Grant walked his own product and found real friction: too much clicking, drill→tutor UI lurch, no orientation, repeated hint-gauntlet every reply. ROOT CAUSE: APM is TWO UIs (multi-stage drill funnel page + separate Ezra tutor page) bolted together. SOLUTION DECIDED: port APM to ONE Mia-style conversational surface (Mia/IB already does attempt-probe-teach in one clean continuous chat — APM should match it).

TARGET: one UI. Ezra opens with the drill question (scenario card rendered IN chat) → student attempts in chat → Ezra runs attempt→probe→teach (existing 3-call engine) → "try another" loads next drill as next turn in SAME conversation. No separate drill page, no lurch, no "Step 2 of 4".

MUST PRESERVE (the plan must confirm): (1) attempt-first stays — drill Q is Ezra's opening msg, student attempts before taught — productive friction stays, gratuitous friction goes; (2) reuse existing tutor route/engine + sign-equivalence fix, NOT a rebuild; (3) keep cap + analytics + paywall firing in new flow; (4) reuse drill card design inside the conversation.
DECISIONS TO MAKE IN PLAN: (A) retire standalone /acca/drill multi-stage page? (intent: yes, card moves into chat); (B) what happens to this-morning's handoff (sessionStorage apm_drill_handoff, from_funnel flag, next-drill API) — which vestigial vs reused; (C) reuse actual Mia components vs parallel build sharing pattern; (D) first-load orientation (Mia greets/recalls — APM's equivalent).
Drill UI repurpose decision: card design folds INTO the conversation now (#1); browsable "drill library" is a post-launch PAID feature (#2); NO public no-signup free drill (Grant's call).
Principle: changing how it FEELS, not how it TEACHES. Engine proven, analytics wired — collapse two clunky UIs into the one good UI. Get it right over fast.

REMAINING TO LAUNCH (after experience workstream): Stripe objects (€99 pass + €49/mo, test on production), wire paywall buttons, auth on tutor (close paywall hole), Bug 2 fix, latency, merge feature/apm-drills → main.

### SESSION HANDOFF — 24/06/2026 (end of day)

STATE: Free funnel built + verified end-to-end earlier today (dashboard → pick area → one-surface tutor → coach → cap → paywall). Then switched free tier from ANONYMOUS to ACCOUNT-REQUIRED (magic-link auth) mid-session — that switch is HALF-DONE and has an unresolved auth-redirect bug. Do NOT assume the app is in a working state — the auth rework is incomplete and uncommitted.

DONE + COMMITTED earlier today:
- One-surface tutor port: drill funnel page retired (redirect shim), DrillFunnel deleted, question pinned left + conversation right, sticky panels, mobile collapsible header, MessageRenderer (tables render). Walked clean.
- Ezra renamed from Eli (done prior session).
- CRITICAL diagnosis fix: tutor was regenerating model answers via Haiku (no EVA guidance) and falsely flagging CORRECT answers wrong. FIXED — route.ts now uses the STORED, reviewed model_answer column; Call 1/Haiku is fallback only for null answers. 10/10 served drills verified-backed. Re-walked A3b EVA + B1b flexed-budget clean. PRINCIPLE BANKED: runtime-generated ≠ verified; tutor must diagnose against stored reviewed answers only.
- Cap-boundary fix: input stays live through drill-3 follow-ups, wall fires on next-drill move. Committed.
- Dashboard + AreaPicker + free funnel: built, walked end-to-end (area-pick loads right drill, change-area swaps in-place, dashboard cap status read correctly). Committed. BUT this was the ANONYMOUS/localStorage version — now being reworked for auth (below).

DECISION CHANGED THIS SESSION — free tier is now ACCOUNT-REQUIRED (not anonymous):
- Reason: anonymous localStorage cap is fake (incognito/clear-storage = infinite free coaching). A real APM resitter will sign up; anyone who won't wasn't converting. Account-required gives a REAL server-side per-user cap + identity + email capture, matches IB.
- Auth method: MAGIC LINK (passwordless, email → click link → logged in). Fits the one-sitting professional persona. Reuses IB's @supabase/ssr.

BUILT (auth rework) — REVIEWED, cap-security CONFIRMED SOUND, but NOT yet committed (blocked on the redirect bug):
- Migration RAN in Supabase (4 cols on profiles: apm_teach_throughs_used NOT NULL default 0, apm_subscription_status default inactive, apm_pass_expires_at, apm_stripe_subscription_id). Verified clean. IB untouched (additive).
- Per-page auth guards (NOT middleware.ts — deliberately avoided; creating middleware.ts would activate dormant proxy.ts guards for /dashboard,/session,/admin which must NOT turn on as an APM side effect. proxy.ts is the edit-file, middleware.ts is a never-touch re-export wiring file that currently DOESN'T EXIST so proxy.ts guards are dead — leave that for a separate deliberate commit).
- Server-side cap: count authoritative in DB (apm_teach_throughs_used), increment fires server-side at teach-through delivery, counted flag sealed INSIDE AES-256-GCM (client can't forge). Confirmed un-gameable: discarding session_state resets the flag but DB count still blocks. Free follow-ups on already-counted drill allowed (benefit, not bypass).
- /acca/auth (magic-link page, signInWithOtp with emailRedirectTo), /auth/callback route (code exchange), localStorage cap + anon-id removed, events populate user_id.

OPEN BUG (blocking commit) — MAGIC-LINK REDIRECT:
- Symptom: clicking the magic-link email lands on https://www.gradd.ie/subscribe?code=... (the LC product's page) instead of /acca. Supabase is ignoring emailRedirectTo and falling back to Site URL.
- Code confirmed CORRECT (emailRedirectTo = http://localhost:3000/auth/callback?next=%2Facca is built right; callback reads next right).
- Root cause = Supabase dashboard config (NOT code). Site URL is set to gradd.ie/subscribe (shared project across LC/IB/APM — do NOT change Site URL, LC+IB signup confirmation emails depend on it as they don't set emailRedirectTo).
- App's Supabase project ref = uomxsbagekubfvkukokj (from NEXT_PUBLIC_SUPABASE_URL = https://uomxsbagekubfvkukokj.supabase.co). The allowlist MUST be edited on THIS project.
- Tried: added /auth/callback to Redirect URLs allowlist — DID NOT FIX. Still lands on gradd.ie.
- UNRESOLVED — next session start here, check in order:
  1. WILDCARD allowlist: emailRedirectTo has a query string (?next=%2Facca). Supabase may need the wildcard form http://localhost:3000/** in Redirect URLs to match URLs with query params, not the exact path. TRY THIS FIRST.
  2. WRONG PROJECT: confirm the project whose allowlist was edited == uomxsbagekubfvkukokj. If editing a different project while app points at uomxsbagekubfvkukokj, changes do nothing. CHECK THIS.
  3. Confirm the allowlist change actually saved/propagated.
- Do NOT change Site URL (breaks LC/IB confirmation emails). Fix via allowlist (additive, safe) or correct-project only.

NOT STARTED — STRIPE (planned, after auth works):
- €99 90-day pass (one-time, mode:payment, webhook sets apm_pass_expires_at = now + 90 days; expiry enforced SERVER-SIDE on every access check — no Stripe "ended" event for one-time) + €49/mo (recurring, mode:subscription). Price IDs not product IDs. Grant creates Stripe objects himself (test mode first).
- Reuses IB billing (checkout/webhook/portal/profiles). Webhook needs APM branch on metadata.apm_product = pass|monthly (must NOT cross-wire IB). FAIL-CLOSED on access check (network error = no access, never free unlimited). TEST the expiry boundary (past expires_at → access denied) not just happy path. Webhooks can't reach preview — test via Stripe CLI local forward then prod test-mode.
- Auth now simplifies Stripe: user already authed before checkout (no login-at-wall dance).

REMAINING TO LAUNCH: fix magic-link redirect → commit auth rework → walk real-cap test (incognito must hit login wall not free coaching, same account keeps cap) → Stripe → Bug 2 (no-repeat drills, ~20 lines, still unbuilt) → latency → merge feature/apm-drills to main.

### SESSION HANDOFF — 25/06/2026

STATE: APM free + paid loop FULLY VERIFIED end-to-end (free funnel + Stripe both walked clean in test mode). Branch feature/apm-drills, tip 3a391eb, in sync with origin. Two NEW things surfaced this session that are NOT yet built: Bug 2 (no-repeat drills) is DIAGNOSED not built, and a CONTENT-VOLUME problem (drill pool too thin) is now the biggest pre-launch question — bigger than Bug 2.

VERIFIED + COMMITTED THIS SESSION:
- EVA stored-answer fix CONFIRMED working: re-walked A3b EVA on fresh code/session — Ezra accepted the correct EVA (86.4m), made NO goodwill-to-NOPAT demand, coached the evaluation layer (investment-bank capital, Turkey high-inflation context). The earlier false diagnosis was STALE CODE (no dev-server restart). Fix holds. Also confirmed on B1b flexed-budget and A3b ROI/RI (SRG) — accepts correct maths, coaches L3 evaluation. Stored-answer fix generalises across drill types.
- Free funnel walked end-to-end: dashboard → pick area → tutor → coach → cap counts (#7 dashboard cap-status reads tutor's increment via shared state) → change-area swaps in-place (#8). All confirmed.
- AUTH REWORK committed afd424c (account-required, magic-link, server-side cap). The magic-link redirect bug (was landing on gradd.ie/subscribe) FIXED: root cause was Supabase Redirect URLs allowlist needed the WILDCARD form http://localhost:3000/** (exact-path didn't match because emailRedirectTo carries ?next= query string). Did NOT touch Site URL (shared LC/IB project — LC/IB signup emails depend on it). Verified: magic link lands on /acca logged in; teach-through increments apm_teach_throughs_used=1 in DB; INCOGNITO hits login wall (no anon access); same account persists cap. THE CAP IS REAL.
- STRIPE wired + verified (test mode), commits 725c76d + 3a391eb:
  - Backend harness (scripts/_apm_harness*.ts, KEPT on disk as re-runnable regression test): all 5 assertions green — PASS grants +90d & lifts cap; EXPIRY (date -1d → DENIED, pass genuinely ends); MONTHLY active + sub_id stored; CANCELLATION → inactive + cap re-applies; IB ISOLATION (all 8 IB columns byte-for-byte unchanged, test user had a REAL active IB €349 sub as negative control).
  - BUG CAUGHT BY EXPIRY TEST (fixed 3a391eb): pass branch was ALSO setting apm_subscription_status='active', which (gate = status==='active' OR pass>now) would grant FOREVER — pass never expires. Fix: pass writes ONLY apm_pass_expires_at, never status. Date-driven only, genuinely lapses, can't clobber a real monthly. THIS IS WHY THE EXPIRY-BOUNDARY TEST IS MANDATORY for the one-time pass — happy path looked perfect.
  - Access route confirmed live: unauthenticated→false; date-only pass (status inactive, pass+90d)→true; expired→false. Poller won't hang on a date-only pass.
  - BROWSER WALK (Stripe CLI installed via winget: C:\Users\GrantErasmus\AppData\Local\Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe; ran stripe listen --forward-to localhost:3000/api/webhooks/stripe --api-key sk_test_...; put its whsec_ into STRIPE_WEBHOOK_SECRET; restarted dev): login → drill → cap wall → Get access → /acca/subscribe (both prices render) → 4242 card → hosted checkout → redirect → poller → landed in /acca/tutor with cap LIFTED. DB confirmed: apm_pass_expires_at = 2026-09-23 (+90d), status inactive, used=3 — pass correct. NOTE: APM webhook reads STRIPE_WEBHOOK_SECRET_AI on gradd.ai host, STRIPE_WEBHOOK_SECRET on localhost.

THE WHOLE CORE LOOP IS PROVEN: free funnel (account → pick area → verified-content coaching → real server-side cap → login wall holds) AND paid conversion (€99 pass / €49 mo → checkout → webhook → access lifted, expiry ends).

BUG 2 — DIAGNOSED, NOT BUILT (no-repeat drills):
- next-drill/route.ts: both modes random, never seen-aware. ?area mode excludes NOTHING (can re-serve current drill). ?lo mode excludes only current lo_code (.neq lo_code), NOT drill id — so it can never show a second drill under the same lo_code, but freely repeats other codes.
- Seen-history EXISTS server-side but coarse: acca_funnel_events logs drill_shown rows (anon_id, user_id, event_type, drill_lo, metadata, created_at) — records drill_lo (lo_code) NOT drill id. user_id populated post-auth.
- DECISION MADE: implement Option B (exclude by drill_id, precise) NOT Option A (exclude by lo_code, over-excludes unseen sibling drills — bad on a small pool). Requires: add drill_id to drill_shown event payload (available client-side as next.id/currentDrill) + drill_id column on acca_funnel_events (SHOW MIGRATION SQL FIRST — shared table, must be additive, confirm doesn't disturb anon_id/IB rows). Exclude by id on BOTH modes. Recycle-on-exhaustion (drop seen-filter when pool empty, NO hard "completed" wall — pool too small to trap). SIGNAL/HANDLER DISCIPLINE: drill_id must change payload (TutorChat fireEvent) + route (/api/acca/event) + column together in ONE commit. NOT STARTED.

CONTENT-VOLUME PROBLEM — THE BIGGEST PRE-LAUNCH QUESTION (newly surfaced, unresolved):
- Grant's concern: 50 drills is thin; some LOs have only ONE drill; a student drilling an area will feel the lightness. "Live coaching on the hardest paper" rings hollow with 3 questions.
- WHY APM feels thin where IB doesn't: IB (Mia) GENERATES questions at runtime (infinite, but unverified — the exact bug class APM killed). APM (Ezra) serves FINITE VERIFIED drills (stored question + reviewed model_answer; teaching is dynamic against the stored answer, but content is fixed). The thinness is the COST of the verification that is the moat. Deliberate trade: finite-but-correct over infinite-but-unsafe.
- THE TENSION: coverage (more drills) vs verification (each hand-checked) pull against each other. WRONG move = solve coverage by regenerating IB-style (reintroduces the wrong-answer bug). RIGHT question = how to get MORE VERIFIED drills without hand-building each.
- PATHS (not mutually exclusive): (1) GENERATE-THEN-VERIFY assembly line — model drafts drills offline in bulk, Grant reviews/approves each before publish (approved/published flags exist). Generation as drafting tool with human gate, NOT runtime. Probably the main answer. (2) More drills per LO — 73 LOs × 3-4 verified = 200-300, not thin. (3) REUSE REAL ACCA PAST PAPERS — question + official examiner answer = inherently verified (examining body's own content), highest-trust lowest-effort — CHECK LICENSING on reproducing ACCA past papers. (4) Vary the ATTEMPT not the question — re-practising an APM L3 evaluation has real value, "seen once" ≠ exhausted, softens thinness without new content.
- LEAN: launch answer ≈ #3 (past papers, inherently verified) + #1 (generate-then-verify to fill gaps); Bug 2 recycle-on-exhaustion is an OK stopgap because #4 means repeats aren't worthless. OPEN QUESTIONS for next session: (a) verify in code exactly how APM teaching works — is ANY part of question/answer runtime-generated or fully stored-artifact? (b) how many verified drills per LO is "not thin"? (c) fastest safe path to build them? This is arguably bigger than Bug 2 — it's what stands between APM and feeling substantial.

REMAINING TO LAUNCH (revised priority):
1. CONTENT VOLUME (new top priority) — decide drill-building strategy (past papers + generate-then-verify), build to "not thin". Verify teaching flow in code first.
2. Bug 2 (no-repeat, Option B) — diagnosed, ~small, recycle-on-exhaustion.
3. LIVE Stripe keys — create 2 prices in live mode, live keys + price IDs in Vercel prod (same var names, live values). Deliberate go-live flip. Code unchanged.
4. PRODUCTION webhook endpoint — register live webhook → gradd.ai/api/webhooks/stripe with STRIPE_WEBHOOK_SECRET_AI.
5. Latency — 3-call chain slow (1-3 min in walks); conversion risk; measure before optimising.
6. Merge feature/apm-drills → main = launch.
7. (post-launch) middleware.ts activation as its own deliberate tested commit (proxy.ts guards currently dormant); IB hybrid generator fix; Mia/Aoife three-call rebuild; school licensing Q1-Q2 2027; ACCA AFM→AAA→ATX.

KEY PRINCIPLES REINFORCED THIS SESSION:
- Stale code deceives: API route changes need FULL dev-server restart; a cached session_state.enc carries a prior model answer forward. Verify on fresh code + fresh session before trusting a fix (the EVA "still broken" was stale code, not a real failure).
- Expiry-boundary test is MANDATORY for one-time passes — set a PAST date, confirm DENIAL. Proving access STARTS ≠ proving it ENDS. Caught the "pay once, free forever" bug.
- Webhook cross-wiring with IB is the top billing risk (shared checkout.session.completed) — separated by metadata.apm_product, empirically proven by IB-isolation test with a real IB sub as control.
- Fail-closed must hold BOTH ends: server returns false on error (try/catch wraps whole handler, returns 200 {access:false} never 500), client denies on non-200. A paid user degrades to capped-free on error, never to unlimited.
- Shared infra (Supabase project, profiles, acca_funnel_events, Site URL) across LC/IB/APM — never fix APM by breaking LC/IB; prefer additive (allowlist, ADD COLUMN) over shared-value changes (Site URL).
- Flag load-bearing decisions as ONE line at top — Grant skims first-para + last-line; the anonymous-cap decision got under-flagged earlier and had to be reversed (process lesson, owned).
- APM's content model is finite-verified BY DESIGN — content volume is a deliberate ongoing build task, not something that generates itself. The thinness is the honest cost of the moat.

---

### SESSION HANDOFF — 26/06/2026 (content breadth + route keystone)

MACHINE NOTE: this session on WORK machine (C:\Users\GrantErasmus\...). Continuing at HOME (C:\Users\grant\...) — git pull feature/apm-drills first, tip should be b350525. The drill PUBLISH state is DB-only (Supabase, not git) — it carries across machines automatically (same Supabase env). The route-fix CODE is in git (b350525).

STATE: Branch feature/apm-drills, tip b350525, pushed, preview deployed + READY. The id-addressing route fix is BUILT + SHIPPED to preview but NOT yet verified on preview — that verification is the FIRST action next session, and it GATES publishing the 12 depth drills.

DONE THIS SESSION:

1. CONTENT BREADTH PUBLISH — servable coverage 10 → 37 LOs (14% → 51% of 73). All DB state (acca_drills.published flips + 2 model_answer text fixes), nothing in git.
   - The 39 "approved-unpublished" drills were content-verified by the 23/06 breadth audit (50 drills vs official APM guide) — NOT just a generator flag. "approved" = record of that adversarial audit.
   - Published 27 sole-drill-per-LO breadth drills in 2 waves: wave 1 = 22 with _patch_ provenance (confirmed in the 23/06 audit); wave 2 = 5 that fell through the audit (22-June 19:26-28 tail batch). The 5 (A2e, A5a, A5b, B2e, B4a) were INDEPENDENTLY re-verified against the guide — all "approve after correction" (A2e %, A5a PUE wording, A5b IR/3Ps, B2e replace-not-modify, B4a causality) — corrections applied (incl. A5a run-on repair, A5b structure→structures), then published.
   - KEY LESSON REINFORCED: "approved" flag ≠ proof of clean. 5/5 un-patched drills had real errors on independent check. The independent guide-verification (adversarial, no shared context — the method that caught 5/5) is the REAL gate, not the flag. Marmara was "approved" + still wrong too. Provenance (_patch_ touch) is a useful proxy but not proof.
   - All 37 served LOs are .single()-safe (exactly 1 published row each). Section C now served (C1a — was ZERO). Tutor confirmed serving across all 37.

2. ROUTE KEYSTONE — id-addressing (BUILT, shipped to preview, NOT verified):
   - PROBLEM it solves: next-drill picks a drill by LO+random, tutor RE-fetched by lo_code+.single() — so with >1 drill/LO, tutor could serve a DIFFERENT drill than shown (Marmara-class mismatch) AND .single() crashes (PGRST116) on 2+ rows. Found THREE .single()-on-lo_code crash points, not one (POST route + tutor/page lo-mode + default-B1c).
   - FIX (commit b350525): TutorChat sends drill_id: currentDrill.id; tutor/route.ts fetches .eq('id', drillId) — .single() KEPT but now PK-keyed so only ever 0/1 rows (crash gone); tutor/page lo-mode + default-B1c moved off .single() to random-pick via a new module-level pickRandom<T> helper (also fixed a latent next-build-breaker the lint caught in pre-existing area-mode line 6b584a8). next-drill UNCHANGED. Seal/cap logic UNTOUCHED (turn-1 resolves answer once from id-fetched row, seals into enc; follow-ups read answer from enc, re-fetch question/context by stable drill_id).
   - DUAL-ACCEPT ROLLOUT: route prefers drill_id, falls back to lo_code+.single() when no id (protects in-flight sessions). SEQUENCING IS LOAD-BEARING: ship client+route FIRST → verify 37 serve → THEN publish depth. Publishing depth before client ships = crash via fallback path.
   - Verified: local next build exit 0, Vercel preview built clean ~45s, tsc+eslint clean.

PREVIEW URL (verify here next session): https://gradd-git-feature-apm-drills-gradd-ais-projects.vercel.app (stable branch alias, currently b350525). Auth-gated (magic-link → /acca/auth first). Same Supabase env, so the 37 published drills are visible.

NEXT SESSION — FIRST ACTION (gates everything): VERIFY the route fix on preview BEFORE publishing depth:
- THE CRITICAL CHECK: /acca/tutor?area=A3 (random-picks from 5: A3b-A3f). Reload a few times — question on left changes, and Ezra's diagnosis must ALWAYS track the drill currently shown. This is the show-X-serve-X mismatch-kill proven LIVE on a random path (trivially true on single-drill LOs; A3 is the real test, and A3 is exactly where depth lands next).
- Also confirm serve-clean: ?lo=C1a (Section C), ?lo=D2a/B2a/A1f, and /acca/tutor (no params → default-B1c random-pick).
- IF the A3 random path shows-X-serves-X across reloads + others load clean → route fix HOLDS → publish the 12 held depth drills (A3b ×8, A3c ×1, A3d ×1, A3e ×2 — A3b goes 1→9), then build Bug 2.

THEN (after depth publishes):
- BUG 2 (no-repeat) — now buildable on the id-addressable next-drill: change .neq('lo_code', lo) → exclude by current drill id (allows same-LO-different-drill, blocks identical repeat). Small.
- CONTENT VOLUME DECISION (the big strategic next step, discussed not decided): after wave 2 you're at 37 LOs/one-each. A genuinely STRONG launch bank ≈ ~100 verified drills, WEIGHTED to how APM is examined — NOT flat across 73 LOs. Structure: Section A = one 50-mark compulsory (heavy A/B); Section B = two 25-mark, one GUARANTEED from C + one from D. So: A/B depth to 2-3 drills on high-frequency LOs (EVA, RI/ROI, variances, transfer pricing, KPIs, BSC, divisional, reward/behaviour); C/D priority 3-4 drills (guaranteed exam areas, currently thinnest). Gap ≈ 50-60 net new (the 12 depth drills cover part). SOURCES: (1) ACCA past papers — Q + official examiner answer = INHERENTLY verified, ideal for C/D, CHECK LICENSING; (2) generate-then-verify pipeline (the one that caught 5/5 today) for the rest. Grant's stance: prefers doing the work for something genuinely strong over a thin product a resitter finds shaky. NOT YET DECIDED — this is the next strategy conversation after the route fix + depth land.

REMAINING TO LAUNCH (current priority order):
1. Verify route fix on preview (next action) → publish 12 depth drills.
2. Bug 2 (no-repeat) — small, on id-addressable next-drill.
3. CONTENT VOLUME — build to ~100 weighted verified drills (past papers + generate-then-verify). The big one for "strong not thin."
4. LIVE Stripe keys + prod webhook (STRIPE_WEBHOOK_SECRET_AI on gradd.ai) — deliberate go-live flip, code unchanged.
5. Latency (3-call chain slow, measure first), merge to main = launch.
6. (post-launch) middleware.ts activation (own commit; proxy.ts guards dormant); IB hybrid generator fix; Mia/Aoife three-call rebuild; school licensing Q1-Q2 2027.

PRINCIPLES REINFORCED: independent adversarial guide-verification is the real content gate, not the approved flag (5/5 find-rate proved it); the route mismatch (show-X-serve-Y) is Marmara-class and the id-addressing fix kills it — but must be proven on a LIVE random path, not just the diff; sequencing (ship client→verify→publish depth) is load-bearing — depth before client = crash; build to where the EXAM marks are, not flat across LOs.

### TEACH-ENGINE STATUS — all 4 mechanical fixes DONE + VERIFIED (27/06/2026); engine stable
The teach-engine mechanical bugs are closed. All shipped to preview branch `feature/apm-drills` (NOT merged to main), each its own commit, Fix 2 & 4 each with a tracked + manually-applied Supabase migration:
1. **Fix 1 — stop-signal** `e280cb3` — ✅ VERIFIED. Broadened STOP_PHRASES to catch ask-to-be-taught phrasing; server log confirmed isStopSignal=true on continued turns.
2. **Fix 3 — success/exit branch** `e18a0c5` — ✅ VERIFIED. A correct answer gets `call3_confirm` acknowledgement, not a gap-hint; no miss increment, no cap hit. Detection `/\banswer correct\b/i` (word-boundary guard, never bare /correct/).
3. **Fix 2 — counter persistence** `80f8fca` (migration `570dd9d`, table `acca_tutor_progress`) — ✅ VERIFIED. miss_count now durable per (user_id, drill_id); survives reload (confirmed miss_count→3 across refreshes). Killed the "endless hints on reload" trap.
4. **Fix 4 — no double-charge** `2b1615c` (migration `20260627100000`, `counted` column) — ✅ VERIFIED. `counted` persisted durably; a reload after a teach-through no longer re-charges apm_teach_throughs_used.
Engine is now stable: stop-signal fires, correct answers are acknowledged, the counter survives reloads, and the cap charges exactly once per drill. Seal (enc) + cap-increment logic untouched throughout. **Next major item = the teaching redesign (warmth/intent layer) below.** Two latent bugs remain logged (next-drill:74 id-drop; teach-through-looks-like-hint) — fix alongside/within the redesign.

### Ezra conversational warmth — NEXT MAJOR ITEM (mechanical engine now verified stable)
**SPEC: `docs/TEACHING_PRINCIPLES_EZRA.md`** — the teaching-quality redesign spec. Audits Ezra's live prompts against the 5 cognitive-science principles (Ezra is currently ~1.5 of 5: strong retrieval, partial feedback; spacing/interleaving absent, worked-example fading contradicted). Defines, per principle, what "correct" looks like for a withholding single-drill APM tutor, and ends with the 5-item redesign priority (1. wire marks_guide/command_verb/intellectual_level into the prompts — data already on the row, not fetched; 2. intent/warmth pre-layer; 3. retrieval closure + earned reveal; 4. interleave next-drill; 5. weakness ledger + spaced re-exposure). The warmth fix below is item 2 of that spec.
Walking APM teaching repeatedly, it "feels like a bot" — every Ezra response is a diagnostic verdict ("Command verb: Evaluate, Level 3, the gap is..."), regardless of what the student said. Mia (IB, generates on the fly) handles asides/confusion/"just give me the answer" gracefully; Ezra (rigid 3-call pipeline) forces EVERY message through diagnose→hint→teach, so it can't have a normal exchange — it can only mark. Root cause: the 3-call withholding architecture optimised correctness (the moat) at the cost of any conversational layer. Even a perfectly-working Ezra feels cold because it's all assessment, no relationship.
PROPOSED FIX (do AFTER the 5 mechanical bugs, must NOT break them): a conversational pre-layer that classifies each message — attempt / question / confusion-or-frustration / aside — and routes ONLY attempts through the withholding pipeline; everything else gets a warm, human Ezra response that doesn't mark them. Preserves the moat (attempts still structurally withhold the answer) but gives Ezra a human face. Also: soften the hint register to open with acknowledgement, not a cold verdict. Benchmark = whatever makes Mia feel right that Ezra doesn't.
This is arguably more threatening to the product than any single bug — a cold-but-correct marking machine churns students regardless of whether the teach-through trigger fires. Flagged from Grant using it and feeling it.

### REDESIGN STATUS — item 3 (retrieval closure / earned reveal) VERIFIED end-to-end (29/06/2026)
- **Item 3 — earned reveal** (`call4_reveal`, flag `APM_EARNED_REVEAL`, commit `c92ec40`) — ✅ VERIFIED end-to-end on preview. Evidence: account `7126c67d` (temasis858@luxudata.com; free, `apm_subscription_status=inactive`), A3f single-ROI-fairness drill `0d91c1ee`. `acca_tutor_progress` row (29/06 09:36): `miss_count=3` (satisfies the ≥2 earn gate), `counted=true` (charged once at the qualifying teach-through), `resolved=true` (reveal fired). `profiles.apm_teach_throughs_used = 1` — moved by exactly **+1**: the reveal was a free follow-up, NOT a second charge. The earn gate (`isRevealRequest AND missCount>=2`, persisted/reload-proof) and the single-charge invariant both hold in live data.
- **Earn-half dependency — classifier fix** `8e6d147` — ✅ closed. The reveal could never be *earned* while `call0_classify` mislabelled hedged-but-substantive attempts (evaluative-vocab→confusion, rhetorical-question→question): those routed to the warm non-marking path (no miss++), so `miss_count` never reached the ≥2 gate AND a real attempt got a non-marking reply. Re-tune treats a substantive claim about the drill as an attempt regardless of emotional wording or interrogative syntax. Probe (N=10/phrase, Haiku temp 1.0, real ROI/RI/overhead drills): both leak paths 0/10→10/10 attempt; controls held 30/30 (real question/confusion/aside unchanged — no over-correction). Known gap logged separately (not bundled): referent-less numeric claim ("i think it should be double", 5/10) — classifier sees only the bare question stem, not `context_text`; bounded-slice trigger now met by data.

### SESSION HANDOFF 29/06/2026 (PM) — classifier re-tune + 3 latent bugs + items 4 & completeness-gate

All on `feature/apm-drills`, **NOT merged to main**. Test account: `7126c67d` (temasis858@luxudata.com).

**SHIPPED THIS SESSION:**
- **Classifier re-tune** (`8e6d147`, live — item-2 layer behind `APM_INTENT_LAYER`) — fixed BOTH leak directions: hedged-but-substantive attempts now classify as `attempt` (evaluative-vocab mode e.g. "maybe ROI is just unfair" + rhetorical-question mode e.g. "isn't it just the overhead allocation", both 0→10/10). Controls held 30/30 (real question/confusion/aside unchanged — no over-correction). Lone known gap: "i think it should be double" (referent-less, context-starvation; classifier sees only the bare question stem) — bounded-slice follow-up if it recurs.
- **3 latent bugs FIXED + verified:**
  - lo/area URL param **normalize + sanitize** (`d642689`) — case-insensitive (`?lo=A3F`→`A3f`) + strips non-alphanumerics (closes the `?area=B_` wildcard exposure). Both `?lo=` and `?area=` paths.
  - **next-drill id-drop** (`83872b0`) — terminal fallback now always returns a full drill row WITH id (or 404); both client handlers guard `res.ok` + `next.id` before `setCurrentDrill`. Kills the `drill_id:null` → broken-persistence/earn-gate class.
  - **UI message badge** (`e9a9b05`) — additive `message_kind` (Hint / Teaching / Correct / Model answer / Answer / Coaching). Verified escalating; cap logic + flag-off byte-identical.
- **Item 4 — interleave** (`7e08ae2`, behind `APM_INTERLEAVE`) — section-anchored `build pool → score → pick`; resolved-deprioritisation LIVE (item-3 hook), `w_weak=0` item-5 seam present, cross-section transition note surfaced. VERIFIED: C1a "Try another" fired the named section-change note (no silent teleport). Exclude-by-`drill_id` (client now sends it); flag-off = legacy same-sub-area path verbatim.
- **Correct-verdict completeness gate** (`00b25e8`, behind `APM_COMPLETENESS_GATE`) — two-stage, runs ONLY on the correct branch (`call2_diagnose` untouched); `completenessCheck` (Haiku) reads the **model_answer** components (self-scoping; NOT `marks_guide`, which is a scalar mark-total), "absent-not-shallow" prompt with bias-to-complete. **SHIPPED DORMANT — NOT YET VERIFIED.**

**OPEN / NEXT SESSION:**
1. **TOP — verify the completeness gate** before enabling: (a) A3b calc-correct/scepticism-absent → gap naming the missing challenge; (b) convention-different-but-COMPLETE calc → stays **Correct** (the critical false-wrong check); (c) genuinely-wrong number → gap unchanged. Plus spot-check `model_answer` structure beyond the 6/49 audit sample.
2. **Item 5 — weakness ledger + spaced re-exposure** — the big architecture lift (Ezra becomes session-aware); the `w_weak` seam in the item-4 scorer is already in place to receive it.
3. **Two product UX items found by walking it:** (1) no skip/next control during the hint stage — a student who wants to move on after a hint has only the area picker; "Try another" is gated on `teach_through_delivered` (so it only appears post-teach-through); (2) the completeness-defect origin (now fixed, dormant).

**PRE-LAUNCH GATES LOGGED** (see GRADD_BUILD_HARDENING.md Auth + here): sign-out control; disposable-email free-tier abuse; live Stripe keys + prod webhook; **CONTENT VOLUME (~40 net-new verified drills weighted to exam structure — still the top standing priority)**; content audit before merge to main.

**FLAGS (5, all dormant unless set in env):** `APM_INTENT_LAYER`, `APM_EARNED_REVEAL`, `APM_INTERLEAVE`, `APM_COMPLETENESS_GATE`; item-1 mark-scheme wire-in is LIVE (unflagged).

### SESSION HANDOFF 30/06/2026 — completeness gate verified + confirm-truncation fix; ENGINE DONE, CONTENT NEXT
All on `feature/apm-drills`, NOT merged to main. Branch clean at `8875db1`.

**STRATEGIC (the headline):** the redesign engine is now essentially COMPLETE and VERIFIED. The real launch gate is **CONTENT** — ~40 net-new verified drills weighted to exam structure (B/C/D thin). **NEXT SESSION = CONTENT, not more engine.** Item 5 (weakness ledger) is the only remaining redesign item and is LOWER priority than content. (Mirrored in CURRENT FOCUS at the top of this doc.)

**SHIPPED + VERIFIED THIS SESSION:**
- **Completeness gate — root-caused & fixed structurally.** Defect: `max_tokens:40` holistic Haiku snap-judgement returned bare "complete" for a two-component omission; TWO prompt rewrites couldn't move it because the 40-token cap physically forbade the per-component scan they instructed (proven via raw `[GATE-CC]` log reading "complete" before AND after the rewrite). Fix (`8772289`): per-component enumeration — Haiku emits PRESENT/ABSENT per required component (cap 40→256), CODE decides the verdict (not the model), malformed/empty/throw → complete (false-wrong-safe). VERIFIED all 3 cases via raw `[GATE-CC]`: (a) B1c omit → `ABSENT` scepticism+recommendation → gap/Hint; (b) B1c complete-different-convention → all PRESENT → Correct; (c) A5c complete different-drill → all PRESENT → Correct. Diagnostics reverted (`a5cfcc6`). Full detail in the gate section directly below. **STILL DORMANT — enabling `APM_COMPLETENESS_GATE` in prod is a separate decision.**
- **call3_confirm truncation fixed** (`8875db1`) — calc-heavy correct answers cut off mid-sentence; `max_tokens 300→500` + concrete nudge "refer to what they did in words, not numbers" (the old "don't re-derive" was being ignored). Independent of the verdict (confirm runs only after `treatCorrect`).
- **STANDING TEST PROTOCOL locked + extended** (see DISCIPLINE) — test on the branch ALIAS not the direct deploy URL (direct subscribe-gates signed-in users); confirm the alias SHA before each run; a `[GATE-CC]`-style in-function log self-proves flag binding (the MCP can't read per-deploy env bindings).

**OPEN (non-blocking):** (1) gap label `absent.slice(0,2)` cosmetics — names the first-listed absences, not necessarily the most teachable; (2) A5c scepticism-OMITTED probe untested — the verb-mandated-vs-model-demonstrated scoping question (A5c's verb didn't demand scepticism yet it's enumerated as required; fine when the student includes it); (3) enable the gate flag in prod.

### COMPLETENESS GATE — ROOT-CAUSED, FIXED STRUCTURALLY, VERIFIED WORKING (30/06/2026)
`APM_COMPLETENESS_GATE` now passes the 3-case protocol on B1c/A5c (preview `8772289`). Settled this session:
- **The defect:** the original `completenessCheck` (commit `00b25e8`) made a single HOLISTIC Haiku call at `max_tokens:40` with a "bias-hard-to-complete" prompt. It returned the bare word `"complete"` for a calc-complete B1c answer that entirely omitted scepticism + recommendation → false Correct badge. ROOT-CAUSED by instrumentation, NOT guesswork: a `[GATE-CC]` log of the raw Haiku output read `"complete"` both before AND after a prompt-tightening attempt (`f652d1d`) — so **prompt wording was the wrong lever**. The 40-token ceiling physically forbade the per-component scan the prompt asked for; Haiku just snap-judged a long calc answer "complete".
- **The fix (`8772289`, structural — per-component enumeration):** `completenessCheck` now makes Haiku LIST each required component the model_answer demonstrates and tag it `PRESENT —`/`ABSENT —` (one line each), `max_tokens 40→256` so it has room to enumerate. **CODE** (not the model) collects ABSENT lines and builds the gap label (`no genuine attempt at <a> or <b>`); the model never makes the holistic call. Still self-scoping from `model_answer`, never `marks_guide` (a scalar). False-wrong-safe: empty/garbage/truncated/throw → 0 ABSENT → null → stays Correct.
- **VERIFIED (raw `[GATE-CC]` per-component lines, all 3 single incognito runs, progress reset between):** (a) B1c calc-only attempt → `ABSENT — Professional scepticism…`, `ABSENT — Management action recommendations` (+ interpretation), 4 calc components PRESENT → Hint (the absence was caught by the enumeration, NOT a call2 calc gap). (b) B1c complete in a different convention → all 7 PRESENT → Correct (false-wrong guard holds). (c) A5c complete (different drill/component structure) → all 6 PRESENT incl. `Sceptical challenge` → Correct (STEP-1 did NOT over-flag across structures).
- **Diagnostic discipline that cracked it:** every false trail was the test environment, not the code (flag-not-bound on a stale build recurred repeatedly) — see the STANDING TEST PROTOCOL under DISCIPLINE. All `[GATE-DIAG]`/`[GATE-CC]` temp logs reverted; branch clean at `a5cfcc6`.
- **Open follow-ups (non-blocking):** (1) gap label uses `absent.slice(0,2)`, so it names whichever components Haiku lists first — accurate but may not surface the "most teachable" gap; revisit if label quality matters. (2) `call3_confirm` truncates long correct-branch responses at `max_tokens:300` (`route.ts`, unchanged since intro `e18a0c5`) — independent of the verdict, one-line cap bump when wanted. (3) STEP-1's "required vs incidental" call leans on the model_answer; A5c's verb didn't explicitly demand scepticism yet it was enumerated as required — fine when the student includes it, but a scepticism-OMITTED A5c run would tell us whether "required" tracks the verb or the model-answer structure. (4) gate still DORMANT (flag off in prod) — enabling is a separate decision.

### Latent bugs found during Fix 2 verification (27/06/2026) — log, fix separately
1. **next-drill id-drop (real, latent).** `app/api/acca/next-drill/route.ts:74` — the terminal "no other drills available — restart with same drill" fallback returns `{ lo_code, topic: '' }` with NO `id` (and no question/context). Worse, `TutorChat.tsx` `handleTryAnother` (~130) and `handleAreaSelect` (~168) do `setCurrentDrill(await res.json() as Drill)` with NO `res.ok`/`id` check — so that fallback OR an area-mode 404 (`{error}`) overwrites currentDrill with an id-less object. The next tutor POST then sends `drill_id: undefined` → route `drillId = null` → §5b/§10 persistence skipped → endless hints + no progress rows. NOT what bit the C1a reload test (that was a wrong-uid red herring — Fix 2 verified working, miss_count reached 3), but it WILL bite after drill exhaustion or an empty area. Fix: next-drill must never return an id-less drill (404 instead, client keeps current drill); handlers must check res.ok + presence of `id` before setCurrentDrill.
2. **Teach-through reads like a hint / no UI label (= the warmth item above, UI facet).** On continued turns call3_teach re-anchors on the stale diagnosis and still withholds the answer, so a teach-through (teachThroughDelivered=true) is indistinguishable from a hint to the student. Compounded by the UI: `TutorChat.tsx:326-328` renders hint and teach-through through the SAME MessageRenderer with no label — the only hint-vs-teach signal is the LLM prose. This is why a working teach-through (miss_count 2→3) was perceived as "another hint" in the Fix 2 reload test. Fold into the warmth fix: distinct register for teach-through + a visible affordance.

### REDESIGN PROGRESS (spec = TEACHING_PRINCIPLES_EZRA.md) — 27/06/2026, all on feature/apm-drills, NOT merged to main
- **Item 1 — mark-scheme wire-in** `9985f69` — ✅ SHIPPED (live, flag-independent). Fetch marks_guide/command_verb/intellectual_level; marks_guide → call2_diagnose only (internal), verb+level → student-facing call3_* (marks_guide structurally withheld from them). Ezra reads the authored criterion instead of inferring.
- **Tone passes** `4d3951d` (warm the attempt register: EZRA_SYSTEM drops "whether the student hit it" verdict framing + warmer hint/teach/confirm) and `55d685f` (tighten: one win, one gap, one next move; call3_teach max_tokens 600→400) — ✅ SHIPPED live.
- **Item 2 — intent/warmth pre-layer** `2150fe3` — ✅ SHIPPED behind **APM_INTENT_LAYER** (flag-off = exact no-op). call0_classify routes attempt → withholding pipeline; question/confusion/aside → call_warm (no mark, no cap). Stop-signal split: TEACH_REQUEST_PHRASES (explicit → teach) vs give-up phrasing → classifier → confusion. last_ezra_message context; fireEvent('tutor_intent'). Classifier validated 100% on the attempt↔non-attempt boundary on a SYNTHETIC set.
- **Item 3 — earned reveal / retrieval closure** `c92ec40` (migration `20260627110000`, `resolved` column) — ✅ SHIPPED behind **APM_EARNED_REVEAL** (flag-off = exact no-op). call4_reveal = the ONE place model_answer reaches the student, own reveal-permitted system prompt. REVEAL_PHRASES unit-tested DISJOINT from TEACH_REQUEST_PHRASES (0 exact / 0 substring). Earn gate STRUCTURAL: isRevealRequest AND missCount>=2 from the persisted §5b counter (reload-proof); sub-threshold → static EARN_REDIRECT. Free follow-up (drill already counted).
  - **BLOCK-HALF VERIFIED:** premature reveal correctly REFUSED at miss_count<2 — moat held. (A3f, turn-1 "show me the full answer" → EARN_REDIRECT.)
  - **EARN-HALF BLOCKED in testing — NOT a gate bug, a CLASSIFIER bug.** On A3f the DB showed miss_count=1 (not 2) so the reveal correctly refused. Root cause: a hedged-but-substantive attempt ("maybe ROI is just unfair to the manager") misclassified as `confusion` → warm path → never incremented miss_count, so the reveal can't be earned AND a real attempt got a non-marking reply. The gate read miss_count correctly; the counter was just under-incremented upstream.

### TOP ITEM FOR NEXT SESSION — tune the attempt↔confusion classifier boundary
Hedged/opinion claims ABOUT THE DRILL ("maybe X is just Y", "I guess it's because…", "probably the issue is…") must classify as **attempt**, not confusion. They are the real-message failure mode the synthetic eval (100% on the boundary) could NOT surface — self-authored synthetic messages were too committed. ACTIONS: (a) tighten CLASSIFY_SYSTEM so a substantive claim about the drill = attempt even when hedged; (b) RE-RUN the classifier eval on REAL hedged/opinion attempts (pull from `tutor_intent` telemetry once there is real traffic, or hand-author a hedged-attempt set); (c) consider a fallback so a non-attempt turn carrying drill-relevant content still counts toward the struggle gate. This gates item 3's earn-half — until fixed, the earned reveal is effectively unreachable for tentative students. Also still open: item 4 (interleave next-drill), item 5 (weakness ledger), and the next-drill:74 / lo_code case-sensitivity hardening.

## Session bank — 30/06/2026

NEXT SESSION TOP ITEM: write the ~40-drill content batch. Allocation decided, verified against apm_s26_j27 detailed study guide + exam blueprint:
- Section C (C1): 12 drills. Close zero LOs C1b, C1c, C1d, C1e. Double up C1c + C1e. Rationale: C guarantees one 25-mark Section B question off a 5-LO pool = highest marginal value per LO in the paper; currently only 1 drill (C1a).
- Section D (D1+D2): 18 drills. Close zero LOs D1b/c/d/e, D2b/d/f/g/h/i. Weight D1d (security controls) and analytics LOs. D guarantees the other 25-mark Section B question.
- Section B (B2/B3/B4): 10 drills. Close zero LOs B2b/c/d/f, B3e, B4d/e/g/h/i. Lower priority — underpins but gets no own question.
- Section A: NOT in this batch. 12 zero LOs remain (A1a-e, A1i, A1j, A2b, A3a, A4c, A4d, A5d) — all foundation for the compulsory 50-mark case. Must close in a follow-on pass before any "complete curriculum" claim.
Verb/intellectual_level per drill taken from guide depth tags ([2] vs [3]), never inferred.

OPEN BLOCKER (resolve before declaring launch-ready): is the Ezra paid tutor single-drill-bound or case-capable (multi-LO scenario in one session)? If drill-review only, ~89 atomic drills = competent-but-not-exam-ready, which is refund-risk. Diagnostic paste-block was queued, not yet run.

STATE: branch feature/apm-drills, HEAD a4e72fd pushed clean. Teaching engine complete + verified, do not re-litigate. Test account ID changes per session — reconfirm at session start.

## Session bank — 01/07/2026 — content batch complete + exam-ready backlog

DONE THIS SESSION (banked — do not re-litigate):
- 91 drills serving; all 73 S26–J27 LOs have >=1 drill; zero-coverage closed.
- Section C 1->13, Section D 4->22, Section A 12 zero-LOs closed. ~42 net-new drills.
- Teaching engine verified LIVE across every command verb/level: prepare (C1e), advise (C1c), assess (D1d), explain L2 (A1a). Withhold holds; completeness gate marks correctly and does NOT over-fire on level-2 explain.
- Process fix: correction passes now sweep all 5 drill fields per claim (not instance-by-instance). Caught a residual the adversarial reviewer missed. Carry into all future batches.

PRIORITISED BACKLOG TO REACH GENUINELY EXAM-READY (all live):

P0 — real gate on "exam-ready":
1. CASE-SCOPE CONSTRUCT. Ezra is single-drill-bound (confirmed at code level, app/api/acca/tutor/route.ts). Exam is a 50-mark case + two 25-mark C/D-on-A/B questions — integration is the whole paper, never rehearsed in-product. Needs a multi-LO scenario/session object grouping drills + session persistence across LOs. Highest-value build; pulls professional-skills and exam-craft along with it.

P0 — trust bug, ship before any student sees the picker:
2. STALE PICKER SECTION TITLES. Shows B "Performance Measurement Systems and Design", C "Strategic Performance Measurement", D "Performance Evaluation and Corporate Failure". Correct S26–J27: B "Performance optimisation", C "Performance reporting", D "Data science and technology". "Corporate Failure" is NOT in current syllabus. Sub-areas correct; top-level labels only.

P1 — needed for pass-readiness, after case layer:
3. Professional-skills marking on long-form answers (20% of marks: 10 in A, 5 per B; earned holistically across a script, not per-drill).
4. Timed exam-craft / mock mode (3h15, planning, report/briefing-note format, mark-per-minute).
5. Depth on thin high-frequency LOs: B2 Performance and reward = 2 drills, A4 = 4; much of A/B one-drill-per-LO. Add variation drills on high-yield thin ones.

P2 — quality/coverage hardening:
6. 11 of 12 Section A drills live-untested (only A1a run through Ezra). Passed 2-pass written QA, same pipeline — low risk, not behaviourally verified. Spot-check.
7. Compound-verb LOs live-untested (calculate and evaluate, assess and advise etc). A3b calc-heavy (9 drills) especially — calc withholding is a different shape, not tested this session.

CROSS-PRODUCT BACKLOG (from prior memory, still live):
8. IB Econ Layer 2: hybrid generator failed ~75%. Fix at PATTERN level, regenerate all 31 hybrids, re-review. Do NOT patch one-by-one.
9. IB BM Layer 1: content-generation dry-run + live /admin/questions review pending.
10. IB rescue-reflex architectural fix (two-call withholding) for Mia/Aoife — was deferred pending APM proving the pattern. APM HAS NOW PROVEN IT — unblocked.
11. Mia/Aoife teach-engine rebuild on proven APM architecture — deferred.
12. Single persistent APM test account (still burning temp-email IDs — ID changes every session).

COMMERCIAL / GTM GATES (not code, real before scaling):
13. r/ACCA + OpenTuition landing-page demand test (Rule 3 bans forum self-promo). <5 signups = stop; 30+ = build harder. Not yet run.
14. Free-drill + paid-tutor simultaneous launch (complete-at-launch, not waitlist).
15. Pricing/packaging (~EUR 49–69/mo) live in Stripe for APM.

NEXT ACTION: start P0 item 2 (stale picker titles — cheap, ship-blocking trust bug) then P0 item 1 (case-scope construct — the real exam-ready gate).

## Session bank — 01/07/2026 (pt.2) — case layer live + marking spec

SHIPPED THIS SESSION (committed, SHA c4a64c3, pushed to origin/feature/apm-drills):
- Case-scope data model live: migration 20260701120000_acca_cases.sql applied — acca_cases, acca_case_exhibits, acca_case_requirements, acca_case_progress. RLS enabled all four. acca_case_progress defines `counted` cleanly (does NOT inherit the acca_tutor_progress drift) and carries v2 hooks `passed` + `final_answer`.
- Case orchestration built + live-tested in production (Vercel preview, APM_CASES=1 on Preview only):
  - lib/acca/teach-engine.ts — faithful copy of the tutor withhold engine + runTeachTurn() orchestrator. Tutor route untouched (keeps its own inline copy). FOLLOW-UP (deliberate, later): refactor route.ts to import from teach-engine and delete inline copy, once cases prove out — the two copies can drift.
  - app/api/acca/case/route.ts — case-load GET (gated approved+published; withholds model_answer/hint/full_reveal from client payload).
  - app/api/acca/case/turn/route.ts — case-turn POST; runs the withhold engine per active requirement; per-requirement seal (distinct AES blob per requirement); shared scenario is context, never sealed; progress keyed (user_id, case_id, requirement_id).
  - Three schema-name fixes applied before push: professional_skills_marks (not professional_marks); removed non-existent context_text from requirement selects; exhibit builder selects exhibit_order/title/body explicitly (no created_at leaking into model context). label + professional_skill_tags added to case-load payload.
- First case authored, QA'd, live: Aldermere Fitness (Section B, C-anchored). 4 exhibits, 2 requirements (i) C1a evaluate report [13], (ii) C1e prepare commentary [7], 20 technical + 5 prof = 25. Cleared adversarial check (approve-after-minor; 5 fixes applied with full-field sweep). Flipped status=approved, published=true (safe: Production has no APM_CASES flag, so prod cannot serve it).

LIVE-TEST RESULT (case engine PROVEN end-to-end, test account 7126c67d-aeae-40e5-ba40-808f37dd81b5):
- Req (i) wrong-turn attempt (evaluated the company not the report): correctly withheld — message_kind hint, passed false, diagnosis named the exact failure mode, Ezra redirected to the report without leaking.
- Req (i) strong answer: passed — message_kind correct, requirement_passed true, advanced to (ii).
- Req (ii) data-dump attempt (restated not interpreted): correctly withheld — hint, diagnosis named restate-don't-interpret, no leak, is_last_requirement true.
- Progress writes verified in DB: (i) passed=true has_final_answer=true; (ii) passed=false miss_count=1. v2 hook (final_answer on pass) confirmed populated.

DECIDED THIS SESSION:
- Syllabus fork resolved via official source: S26-J27 is the live/current APM syllabus (genuine refresh, sections A-F, C=Performance reporting, D=Data science). Applies from 1 Sept 2026 through June 2027 — the cycle Gradd sells into. Build is correctly on S26-J27. No 25/26-vs-26/27 toggle now (real LO differences, not just labels; older cohort is exam-complete) — shelved as later feature.
- Case requirements are self-contained rows, NOT references to the 91 drills (a case needs one shared scenario; drills each embed their own company). Confirmed load-bearing decision.
- Case content built to the examiner failure-modes spine (from 5 examiner reports): #1 answer-the-actual-question, #2 apply-don't-describe, #3 develop-your-points. Version-independent; the case layer's teaching target.
- Marking unit = the CASE (whole question), not the requirement — the 5/10 prof marks are awarded holistically across the whole question. This collapses "v2 synthesis" and "professional-skills marking" into ONE build.
- Build order LOCKED (Grant's call, corrected Claude's): professional-skills marking -> cases 2-5 -> case UI. Rationale: marking and cases are mechanical and change what the engine produces/serves; the UI must be built once against the finished contract, not rebuilt each time.

NEXT ACTION (NOT yet sent to Claude Code — stops here):
- Professional-skills marking, v1 = terminal whole-case marking. Spec written and approved (APM_PROF_SKILLS_MARKING_SPEC.md — to be added to docs/): fires at case-complete via new POST /api/acca/case/mark behind APM_CASES; input = concatenated final_answers + case context + examined skills (union of professional_skill_tags); marks against verbatim ACCA section-E descriptors, Sonnet, evidence-required per mark, capped at professional_skills_marks; persists to new table acca_case_marking; does NOT see sealed model answers. Non-scope v1: no per-turn coaching, no drill marking, no UI, no technical-mark change.
- The build paste-block for marking is DRAFTED and ready but UNSENT. Resume by: build marking behind flag (migration acca_case_marking + endpoint) -> Grant reviews migration + diff -> live-test with a STRONG/WEAK answer pair (marking is the one component the model is final judge on — not structural like the withhold — so trust is earned by the adversarial strong-vs-weak test, not by construction) -> commit/push -> then trust.

STILL OPEN (cross-product, from "where are we thin"):
- Professional-skills marking = the biggest exam-readiness gap (20% of the paper currently unassessed). In progress per above.
- Timed mock / exam-craft mode — none exists; examiner reports cite time management as a failure cause.
- APM content depth thin in Section A (one-drill-per-LO) and Section B sub-areas; 11 of 12 Section A drills + compound-verb LOs live-untested.
- IB a generation behind: Mia/Aoife still on the leaky instructed-withholding engine (APM proved the structural fix — now unblocked to rebuild); IB Econ Layer 2 hybrid generator broken (~75% reject, needs pattern-level regen); IB BM Layer 2 ungenerated.
- GTM gates unchanged: r/ACCA + OpenTuition landing-page demand test; free-drill + paid-tutor simultaneous launch; Stripe pricing ~EUR 49-69/mo. Cases should be the PAID tier (currently no paywall on case path — auth + flag only; counted tracked but unconsumed).

## Session 2026-07-01 — case layer live + marking spec approved

SHIPPED (committed SHA c4a64c3, pushed origin/feature/apm-drills):
- Case-scope data model live: migration 20260701120000_acca_cases.sql applied via SQL Editor (file now tracked in this commit). Tables acca_cases, acca_case_exhibits, acca_case_requirements, acca_case_progress; RLS on all 4. acca_case_progress defines `counted` cleanly (does NOT inherit acca_tutor_progress drift) and carries v2 hooks passed + final_answer.
- Case orchestration built + live-tested in production (Vercel Preview, APM_CASES=1 Preview only):
  - lib/acca/teach-engine.ts (copy of tutor withhold engine + runTeachTurn orchestrator; tutor route untouched, keeps its own inline copy). FOLLOW-UP later: refactor route.ts to import from teach-engine, delete inline copy — two copies can drift.
  - app/api/acca/case/route.ts (case-load GET; withholds model_answer/hint/full_reveal from client).
  - app/api/acca/case/turn/route.ts (case-turn POST; withhold engine per active requirement; per-requirement seal; scenario is context never sealed; progress keyed user_id,case_id,requirement_id).
  - Three schema-name fixes applied pre-push: professional_skills_marks (not professional_marks); removed non-existent context_text from requirement selects; exhibit builder selects exhibit_order/title/body explicitly. Added label + professional_skill_tags to case-load payload.
- First case: Aldermere Fitness (Section B, C-anchored), 4 exhibits, 2 reqs (i) C1a evaluate report [13], (ii) C1e prepare commentary [7], 20 tech + 5 prof = 25. Adversarial-cleared (5 fixes, full-field sweep). Flipped status=approved, published=true (safe: Production has no APM_CASES flag).

LIVE-TEST PROVEN (test account 7126c67d-aeae-40e5-ba40-808f37dd81b5):
- Req (i) wrong-turn (evaluated company not report) → withheld correctly (hint, diagnosis named the failure mode, no leak).
- Req (i) strong answer → passed (correct), advanced to (ii).
- Req (ii) data-dump (restate not interpret) → withheld correctly (hint, diagnosis named restate-not-interpret, no leak, is_last_requirement true).
- DB verified: (i) passed=true has_final_answer=true; (ii) passed=false miss_count=1. v2 hook confirmed.

DECIDED:
- S26-J27 is the LIVE APM syllabus (confirmed via ACCA official source); applies 1 Sept 2026–June 2027; build is correctly on it. No 25/26-vs-26/27 toggle now (real LO diffs, older cohort exam-complete) — shelved.
- Case requirements are self-contained rows (one shared scenario per case), NOT references to the 91 drills. Load-bearing, confirmed.
- Case content built to examiner failure-modes spine (from 5 examiner reports): #1 answer-the-actual-question, #2 apply-don't-describe, #3 develop-your-points. Version-independent.
- Marking unit = the CASE (whole question), not the requirement. Collapses "v2 synthesis" and "prof-skills marking" into ONE build.
- Build order LOCKED (Grant's call): professional-skills marking → cases 2-5 → case UI. Rationale: marking + cases change what the engine produces/serves; UI built once against the finished contract.

NEXT ACTION (drafted, NOT sent to Claude Code — session stopped here):
- Build professional-skills marking per docs/APM_PROF_SKILLS_MARKING_SPEC.md: migration for acca_case_marking + POST /api/acca/case/mark behind APM_CASES. Then Grant reviews migration + diff → live-test STRONG/WEAK answer pair (marking is the one component the model is final judge on — not structural like the withhold — so trust is earned by the adversarial strong-vs-weak test) → commit/push → then trust.

STILL OPEN (cross-product):
- Prof-skills marking = biggest exam-readiness gap (20% of paper unassessed). In progress.
- Timed mock / exam-craft mode — none exists.
- APM content thin: Section A one-drill-per-LO; Section B sub-areas; 11/12 Section A drills + compound-verb LOs live-untested.
- IB a generation behind: Mia/Aoife on leaky instructed-withholding engine (APM proved the structural fix — now unblocked); IB Econ Layer 2 hybrid generator broken (~75% reject, pattern-level regen needed); IB BM Layer 2 ungenerated.
- GTM: r/ACCA + OpenTuition demand test; free-drill + paid-tutor simultaneous launch; Stripe ~€49-69/mo. Cases should be the PAID tier (currently no paywall — auth + flag only; counted tracked, unconsumed).

STANDING RISK noted: APM_CASES=1 is set on Vercel PREVIEW and Aldermere is approved/published. Safe today (Production has no flag). If anyone flips APM_CASES on in Production before the UI + paywall exist, Aldermere goes live with no UI and no paywall. Do not enable APM_CASES in Production yet.

## Session 2026-07-03 — professional-skills marking built, live-tested, PROVEN

- Built + shipped: `acca_case_marking` table (migration 20260703120000, applied via SQL Editor + tracked) and `POST /api/acca/case/mark` behind APM_CASES (SHA ba71123). Marks the whole completed case against the verbatim ACCA section-E descriptors, Sonnet, evidence-required per skill.
- RUBRIC BUG found + fixed (SHA fde5cee): professional marks are a SINGLE POOL allocated across skills, not per-skill scores; sum validated <= `professional_skills_marks`, one retry then 502; `per_skill = {skill, mark_awarded, feedback}`.
- LIVE-TESTED both directions on Aldermere (account 7126c67d): STRONG pair → 5/5 (2 A&E, 2 scepticism, 1 communication — correctly docked for missing report format). WEAK (ii) control → 4/5 with feedback naming the gaps (no sustained scepticism in (ii), conversational register, no quantification). Marking DISCRIMINATES with evidence-cited feedback. Trusted.
- NOTE for pre-launch: run a full-weak calibration (both requirements thin) for a wider score-spread test.
- NEXT (locked order): cases 2-5 (one D divisional/ABM, one D complex-structure, one B/D data-science, weighted to D as the guaranteed Section B slot) → then case UI (incl. section-readiness view, evidence-based labels, no fake percentages) → paywall before Production flag.

## Session 2026-07-03 (pt.2) — case library complete (5/5)

- Cases 2-5 authored, adversarially QA'd (2 passes each incl. recheck), inserted candidate/unpublished, verified: Vesla Retail (D2g/D2h+D1d churn-model scepticism), Torfin Build Supplies (D1b/c+D1e silos/ERP + lean 5Ss), Orlen Cinemas (C1c+C1d misleading charts/commentary), Keldan Foods (SECTION A 50-marker: C1a+A3b [16] / A1f+A2c [14] / B2e [10], 40+10, all four prof skills).
- Seed files now tracked in `supabase/apm_questions/`. Case IDs: a1..c1 Aldermere (approved/published), a2..d1 Vesla, a3..d2 Torfin, a4..c2 Orlen, a5..a1 Keldan (candidate/false).
- NOT yet done: live-test Vesla/Torfin/Orlen through Ezra; Keldan live-test in progress = first Section A engine proof (3 requirements, 10-mark marking pool). Publish gates stay false until each live-tests clean.
- NEXT: case UI (contract finished), paywall before Production flag.

## Session 2026-07-03 (pt.3) — Section A engine PROVEN

- Keldan Foods (Section A 50-marker) live-tested end-to-end on preview (account 7126c67d): req (i) calc-omission wrong-turn correctly withheld (hint, diagnosis named missing calculations); (i)/(ii)/(iii) all passed with strong answers; case_complete true — FIRST 3-requirement orchestration run, worked unchanged.
- Marking on 10-mark pool PROVEN: 10/10 allocated 3 comm / 3 A&E / 2 scepticism / 2 commercial acumen, evidence-cited per skill, allocation validation held. Section A + Section B marking paths both live-tested.
- Keldan flipped approved/published (safe: Production has no APM_CASES flag).
- Case library status: Aldermere + Keldan live-tested + published; Vesla/Torfin/Orlen QA'd + inserted, candidate/false, NOT yet live-tested (low risk, same pipeline — test before publishing each).
- Pre-launch note: Keldan needs a weak-answer marking discrimination run (Aldermere had one; Keldan's 10/10 was on model-quality answers).
- NEXT (locked): case UI — contract finished (engine + marking + 5 cases, both section shapes proven). Then paywall before any Production flag.

## Session 2026-07-03 (pt.4) — case UI built, click-through PROVEN

- Case UI shipped behind APM_CASES (SHA 9b5d13d): /acca/cases list (serves approved+published only), /acca/cases/[id] session (exhibits panel, requirement stepper, per-requirement sealed chat, badge parity with drills, marking panel), server-gated hub entry (no NEXT_PUBLIC env).
- Apostrophe defect found via UI: SQL `''` escaping inside dollar-quotes stored literal doubles. Fixed in DB via UPDATE replace() across all case tables (verified 0 residuals) AND at source in the four seed files (SHA 6e85f52, parser-based, single-quoted-column escapes preserved).
- Resume defect fixed (SHA 298776a): case-load now returns progress[] (requirement_id/passed/resolved/miss_count only); session seeds stepper, sets first-unpassed active, auto-marks fully-complete cases.
- Click-through verified on preview: hub card; list shows exactly Aldermere+Keldan (candidates hidden); Keldan full resume (3 ✓s + auto 10/10 marking panel); Aldermere partial resume ((i) ✓, active (ii), resume line); Network payload contains NO model_answer/hint/full_reveal.
- Remaining before launch: live-test Vesla/Torfin/Orlen then flip their gates; Keldan weak-answer marking discrimination run; PAYWALL (cases are the paid tier — currently auth+flag only); do NOT set APM_CASES in Production until paywall exists.

## Session 2026-07-03 (pt.5) — full case library live-tested (5/5)

- Vesla, Torfin, Orlen live-tested end-to-end on preview (account 7126c67d) and flipped approved/published. Per case: one wrong-turn withheld + diagnosed correctly, all requirements passed, marking allocated validly. Withhold catches: Vesla (i) accepted-analyst's-claims, (ii) generic security theory list; Torfin (i) ERP textbook recital, (ii) 5Ss theory without application; Orlen (i) numerically-correct company analysis withheld for not evaluating the charts (sharpest catch — right numbers, wrong question), (ii) paraphrase-not-challenge.
- Marking: Vesla 5/5 (A&E 2, scepticism 2, CA 1); Torfin 5/5 (A&E 2, scepticism 2, CA 1); Orlen 5/5 (A&E 3, scepticism 2 — two-skill union, uneven allocation working).
- LIBRARY STATUS: all 5 cases approved/published and live-tested. Engine, marking, and UI proven across both section shapes and all examiner failure modes.
- Calibration note (pre-launch): all full-pool marks were on model-quality answers — expected. Keldan still needs a weak-answer discrimination run; consider one per case.
- NEXT: PAYWALL on the case path — the last gate. APM_CASES must NOT go to Production until it exists.

## Session 2026-07-03 (pt.6) — PAYWALL LIVE, launch blocker cleared

- Case path behind APM entitlement (SHA e61c0a5): shared helper lib/acca/access.ts (hasActiveAPMAccess — active subscription OR unexpired 90-day pass); hard 402 on case load/turn/mark, fail-closed on missing profile; list visible with per-case locked flag; UI: locked cards → /acca/subscribe, full-page upsell with real title on load-402, inline lapse message mid-session. Stripe untouched — existing €49/mo + €99/90d SKUs, checkout, webhooks reused.
- Verified both sides on preview: no entitlement → all 5 locked, upsell renders; pass granted (test account, 90d) → all unlocked, Keldan resumes + marks.
- APM_CASES may now go to Production when we choose to launch — paywall gate exists. Remaining pre-launch: timed mock mode (decision pending), Keldan weak-answer calibration, apm_* + counted drift migrations, funnel verification, then merge to main as the launch act.

## Session 2026-07-03 (pt.7) — reserved mock cases

- Mock papers must be reserved-only (library cases share per-requirement progress → practised cases enter mocks pre-completed). MOCK_PAPERS emptied (SHA 2cdafea) pending 3 reserved cases.
- Reserved case 1 authored + QA'd (2 passes) + inserted: Halworth Hotels (Section A 50-marker, mock_only=true, candidate/false): A1g benchmarking+calcs [16] / B4b Building Block [14] / B1a budgeting [10]. Case ID a6000000-...b1.
- Authoring lesson: '' escaping bug recurred + over-corrected (global replace broke a single-quoted title escape) — rule: dollar-quoted bodies use plain apostrophes; single-quoted columns (title/label) use '' escapes; never global-replace across both.
- Reserved case 2 authored + QA'd (2 passes) + inserted: Rivenor Pharma Distribution (Section B C-anchored, mock_only=true, candidate/false): C1a report eval [13] / C1b visualisation suitability [7]. Case ID a7000000-...c3.
- Reserved case 3 authored + QA'd (2 passes) + inserted: Bexley Grocers (Section B D-anchored, mock_only=true, candidate/false): D2a big-data 4Vs [13] / D2i ethics [7]. Case ID a8000000-...d3. Paper 1 content COMPLETE.
- NEXT: reserved C-anchored + D-anchored Section B cases, then wire Paper 1 case_ids into lib/acca/mocks.ts, flip Halworth gates, live-test the full timed mock.

## Session 2026-07-03 (pt.8) — TIMED MOCK LIVE-TESTED END TO END

- Reserved case 3 (Bexley) QA'd, inserted, banked (SHA e757429); all three reserved cases flipped approved/published (mock_only=true keeps them out of the free case list — verified on preview: list still shows only the 5 library cases).
- Mock Paper 1 wired (Halworth A → Rivenor B/C → Bexley B/D, 195 min) and LIVE-TESTED END TO END on preview (account 7126c67d): started clock, wrong-turn on Halworth (i) correctly withheld INSIDE the mock (Hint, no leak), then all 7 requirements passed across the three cases, runner advanced case-to-case, results screen rendered combined totals: 7/7 technical, prof marks Halworth 10/10 + Rivenor 5/5.
- BUG found via test + fixed: results screen fired Bexley's mark call before the final progress write was readable, treated the 409 as terminal ("not marked" despite 2/2 passed); manual re-mark returned 200 5/5 proving pure timing. Fix: retry 409 once at 1.5s then once at 3s with "marking…" state (commit "fix(apm): retry 409 in mock results marking (progress-write race)" — SHA pending Grant's verify).
- CALIBRATION NOTE: Ezra's hint on the Halworth wrong-turn opened "you've calculated the four measures correctly" when the attempt contained NO calculations — verdict/diagnosis correct, compliment hallucinated. Diagnosis-call calibration item, not blocking.
- STATE: mock mode complete and proven. Full launch stack now exists: 91 drills (free funnel) + 5 library cases + whole-case marking + case UI + paywall (402-gated) + timed mock with reserved Paper 1.
- REMAINING PRE-LAUNCH (unchanged): verify race-fix on preview (Bexley 5/5, combined 20/20 on results); Keldan weak-answer marking calibration; apm_* profile columns + acca_tutor_progress.counted drift migrations; funnel verification vs FUNNEL_DESIGN; then Production cutover = set APM_CASES in Production + merge feature/apm-drills to main as the launch act (own reviewed pass).
- Standing guards: APM_CASES stays Preview-only until cutover; never merge to main outside the launch pass; reserved cases never enter the free list.

## Session 2026-07-04 — mock marking failure fixed, mock PROVEN on permanent account

- PERMANENT TEST ACCOUNT established: ee07f08c-9f24-4d77-af28-bbc894635f83 (erasmoose@outlook.ie, real inbox, magic-link works, apm_pass_expires_at=2099). All prior burner accounts dead; 7126c67d owns pre-04/07 historic test data. SECURITY: rotate the Supabase secret API key (pasted in chat 04/07).
- Halworth mock-marking failure REPRODUCED on a controlled full re-run (only the Section A case failed; both B cases marked), then root-caused: no client timeout existed, markCaseWithRetry treated all non-409s as terminal, and the renderer mapped every null to "not marked (case not completed)". Halworth is the slowest mark call (4-skill union, 10-mark pool, §10b overflow-retry can mean two sequential Sonnet calls) → gateway 5xx that was never retried and mislabelled. Direct console POST returned 200 10/10 proving the endpoint healthy.
- FIX (SHA 21ef8ba): 120s AbortController ceiling per mark call; transient errors (5xx/network/abort) retried once, 409 retried twice (1.5s/3s); discriminated MarkOutcome (marked/incomplete/failed) with honest copy — "not completed" only for genuine 409, "marking failed" + per-case Retry button otherwise; totals gate on anyMarking.
- VERIFIED on preview (permanent account, full mock re-run): 7/7 technical, 20/20 professional, Halworth 10/10 + Rivenor 5/5 + Bexley 5/5, no failure states. MOCK FEATURE COMPLETE AND PROVEN.
- HOME-MACHINE LESSON: stale checkout sent Claude Code searching a repo without the case/mock stack — always git fetch+pull and confirm top SHA before any Claude Code task on a machine that's been away.
- REMAINING PRE-LAUNCH (unchanged): Keldan weak-answer marking calibration; apm_* + counted drift migrations; funnel verification vs FUNNEL_DESIGN; Production cutover (APM_CASES in Production + merge to main as the launch act, own reviewed pass).

## Session 2026-07-04 (pt.2) — marking calibration PASSED via structural two-step

- Weak-answer calibration EXPOSED a real failure: deliberately thin Keldan triple scored 10/10 (then 9/10 after prompt-instructed absolute marking) with feedback naming the weaknesses — model distributes the pool, doesn't withhold. Same lesson as instructed withholding: instructions lose to priors.
- STRUCTURAL FIX (SHA 0e3dcad): two-step marking — Sonnet judges band-only per skill (exemplary/strong/competent/weak, no numbers/pool in prompt); code converts deterministically (ceiling = pool/skills; multipliers 1.0/0.75/0.5/0.25; largest-remainder integer apportionment). Third application of the structural-over-instructed pattern (withhold, completeness gate, marking).
- CALIBRATION VERIFIED on identical stored answers: weak triple 7/10 (communication competent — correctly docked hardest; content was genuinely strong), strong Halworth 10/10 (all exemplary). Discriminates on absolute quality; full marks reachable. MARKING TRUSTED.
- Pre-launch item 1 (marking calibration) CLOSED. Remaining: apm_* + counted drift migrations; funnel verification vs FUNNEL_DESIGN; Production cutover (APM_CASES + merge to main, own reviewed pass).
- FUNNEL VERIFIED vs THIS contract (read-only pass, 04/07) — FUNNEL_DESIGN.md is the IB/Mia funnel, so the "funnel verification vs FUNNEL_DESIGN" checklist item was MIS-POINTED; the authoritative APM funnel spec is this doc, and the built free→cap→subscribe→cases/mock paths all match it (account-gated magic-link = email capture; unlimited drills + 3 teach-throughs; cap_hit + all locked CTAs → /acca/subscribe; €99/€49 copy correct). Fixed the one real gap: post-checkout access poller no longer routes a paid user into the paywall (backoff to ~60s then honest "still activating" + keeps polling, auto-routes on confirmed access). Gaps #3-5 banked as POST-LAUNCH POLISH: (#3) €99/€49 price copy hardcoded in 3 places (subscribe page + tutor cap copy), not bound to Stripe SKU; (#4) post-checkout always lands in the tutor, not the user's origin; (#5) in-mock subscription-lapse 402 shows a "Retry" button, not a subscribe link (unreachable by free users).

## 04/07/2026 — LAUNCHED

- PR #14 merged (144 commits, 72 files) → main; APM_CASES=1 in Production. gradd.ai serves the APM landing at root; IB at /ib; gradd.ie/LC untouched.
- CUTOVER BUGS found+fixed live: Supabase Site URL was https://gradd.ie/subscribe (auth errors dumped users on LC) → set to https://gradd.ai; canonical host is www.gradd.ai (apex 307s to www, Cloudflare-proxied) and the allow-list lacked www entries → added https://www.gradd.ai/** and https://www.gradd.ie/**. Magic-link flow verified end-to-end on production.
- Prod verification passed: APM landing + FAQPage JSON-LD; /ib intact; gradd.ie intact; fresh signup + magic link; free tier (5 locked cards, mock paywalled, cap copy); /acca/subscribe both SKUs.
- DEFERRED (post-launch list): sender is hello@gradd.ie for all products (Resend free tier = one domain; fix at first revenue with gradd.ai domain + per-product senders); LC magic-link happy-path check on gradd.ie this week (Site URL change affects LC error fallback only); Outlook SafeLinks may pre-consume magic-link tokens (one otp_expired seen — if signup complaints arrive, build click-to-confirm /auth/confirm page); landing gaps #3-5 polish; weekly per-case weak-answer calibration.
- NEXT: GTM — r/ACCA + OpenTuition launch posts.

## Session 2026-07-05 — post-launch GTM: blog live, LinkedIn pending

- 5 ACCA APM blog posts LIVE (SHA 93ce136): evaluate-report-not-company, professional-skills-marks, describe-vs-apply, s26-j27-what-changed, scepticism-data-claims. Subject-aware pipeline (badge "ACCA APM", Ezra CTA → /acca/auth?next=/acca, IB posts/Mia CTA unchanged). Blog links added to APM landing nav+footer (SHA 8c65275); /ib already linked; LC deliberately NOT linked (blog is IB/APM content on gradd.ai).
- IN FLIGHT (confirm shipped before relying): (a) badge/date spacing fix on /blog index ("ACCA APM05/07/2026" concatenation, pre-existing, hits IB rows too); (b) /blog subject filter — ?subject=apm|ib with per-landing links (APM landing → ?subject=apm, /ib → ?subject=ib, bare /blog = full archive). If either block wasn't sent, they're the next two one-liners. — CONFIRMED SHIPPED this session: (a) SHA 3dc1901 "fix(blog): separate badge and date on index"; (b) SHA 714ec2a "feat(blog): subject-filtered index, per-product blog links". LC confirmed still un-linked.
- GTM CHANNEL DECISION: Reddit/OpenTuition DEAD (link-posting blocked). Replaced by: LinkedIn company page (trust asset, from scratch — setup fields + About copy + banner spec handed to Grant, page NOT yet created) and PAID = Facebook/Instagram first (~€10/day, clicks €0.30–1.50 vs LinkedIn €3–8; free-tier funnel qualifies the wider net; judge on cost-per-signup after ~2 weeks, ~50 conversions to exit learning phase). LinkedIn ads deferred to school-licensing phase. Facebook ads after page + 3 organic posts exist.
- BLOG STRATEGY: 5 posts = seed, not target. Real number 25–40 APM posts from examiner reports + failure catalogue + syllabus confusion points, published 2–3/week for freshness. Next content action: extraction pass → APM_BLOG_SEEDS.md ranked by search intent. Blog = 3–6 month compounding channel, not a launch lever.
- STILL OPEN: rotate Supabase secret API key (pasted in chat 04/07 — live security item); sender stays hello@gradd.ie until first revenue (Resend free tier, one domain); LC magic-link happy-path check on gradd.ie; Outlook SafeLinks click-to-confirm page if otp_expired complaints arrive; weekly weak-answer marking calibration.
