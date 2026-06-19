# GRADD TEACHING ARCHITECTURE
Status: LOCKED 19/06/2026. Product-agnostic. Applies to ALL Gradd teaching products (IB — Mia; LC — Aoife; ACCA — APM tutor; future).

## STRUCTURAL WITHHOLDING (proven 19/06/2026)

### The principle
To make a teaching AI withhold an answer, ARCHITECT ITS ABSENCE — never instruct it. Withholding is an architecture property, not a prompt property. A model that has the correct answer in its context will leak it when teaching, because the helpfulness prior overrides any "do not reveal" instruction — proven empirically multiple times across Gradd. The only reliable fix is to ensure the teaching call never possesses the answer at all. Instructed withholding leaks; structural absence cannot.

### The shape — three calls
- CALL 1 — GENERATE: produce the full model answer. Store it server-side. It must NEVER enter the teaching call's context, directly or via the diagnosis.
- CALL 2 — DIAGNOSE: input = question + student attempt + model answer. Output = a SHORT, CONTENT-NEUTRAL GAP LABEL naming the student's error pattern in their own error terms (max ~15 words), explicitly FORBIDDEN from stating the correct answer. GOOD: "applied normal-good income logic to an inferior good". BAD (leaks): "demand falls when income rises".
- CALL 3 — TEACH: input = question + attempt + the gap label ONLY. Produces hint (first miss) / diagnosis-led teach-through (second miss). It cannot leak the answer — the answer was never in its context.

### The two required boundaries
Both must hold or the leak returns:
1. The model answer (call 1) must never reach call 3.
2. Call 2's output (the label) must never CONTAIN the answer — a leaky diagnosis smuggles the answer into call 3 through the side door. The label names the ERROR, never states the CORRECTED FACT.

### Model split (proven)
- DIAGNOSE (call 2) = claude-sonnet-4-6. REQUIRED. This is the precision step — Haiku leaked the answer into the label; Sonnet produced clean gap-labels first try. Do not downgrade the diagnosis model.
- GENERATE (call 1) + TEACH (call 3) = claude-haiku-4-5. Both are straightforward enough for Haiku (generation; teaching from a short label).

### Verification standard
Proven on a clean-inversion case AND a subtle partial-correct case (where the gap is "right reasoning, wrong context", not a clean error). Any reimplementation must re-verify on both a clean and a subtle case — a subtle gap is where a leaky diagnosis shows up.

### Status across products
- This is the PROVEN FIX for the parked IB/Mia two-call withhold item. Mia (Econ + BM) and Aoife (LC) can and should be rebuilt on this architecture — they currently rely on instructed withholding, which leaks.
- The APM conversational tutor is the first product to be built natively on it.
- The drill funnel (pre-baked reveal-as-data) is a SEPARATE, also-valid withholding method for NON-conversational contexts — there the reveal is static data, no live teaching call, so the leak can't arise. Use pre-baked data for drills; use three-call structural withholding for live conversational tutors.
