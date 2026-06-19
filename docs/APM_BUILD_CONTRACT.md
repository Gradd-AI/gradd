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

EDITING DISCIPLINE (learned A5c, 19/06/2026): multi-line REPLACE on stored drill fields is fragile — A5c took 5 failed REPLACE rounds (invisible byte/whitespace mismatches between displayed and stored text). RULE: for any drill content fix touching more than one line or a table, OVERWRITE THE WHOLE FIELD (UPDATE ... SET field = full corrected value), never surgical REPLACE. Single-line, single-occurrence swaps only for REPLACE. This matters for the 72-run review: budget for full-field regeneration of flagged drills, not patching.

### Session-state rule: generate-once-per-drill
Call 1 (model answer) and the diagnosis inputs must be generated ONCE when a drill opens and cached for that drill's lifetime in the session — reused across every attempt/turn on that drill. Do NOT re-run call 1 per turn: it drifts the model answer (observed in spike — gap label varied across runs because call 1 regenerated), wastes tokens, adds latency. Session state per drill holds: cached model answer, miss-count, student attempts.

## DISCIPLINE
- Content sourced from the ACCA APM study guide via adversarial AI-checks-AI + Grant's finance QA. Never from model memory.
- Calc drills: no rounded intermediates as inputs; reconciliation required (generator rule, added this session after a real defect).
- Schema changes via Supabase SQL Editor only, never script-driven.
