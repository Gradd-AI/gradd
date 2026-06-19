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

## DISCIPLINE
- Content sourced from the ACCA APM study guide via adversarial AI-checks-AI + Grant's finance QA. Never from model memory.
- Calc drills: no rounded intermediates as inputs; reconciliation required (generator rule, added this session after a real defect).
- Schema changes via Supabase SQL Editor only, never script-driven.
