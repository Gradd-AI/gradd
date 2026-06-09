# Competitive Position & Strategy — Aimnova (08/06/2026)

> **The discipline (non-negotiable):** Build the minimum surface that makes the tutor browsable and saleable, then STOP. Don't match Aimnova feature-for-feature on the surface — that's the losing race. Surface exists so Gradd isn't dismissed as thin; the tutor is why they pay. Surface = table stakes, tutor = moat. Spend accordingly.

## The competitor
Aimnova (aimnova.app) — live, polished IB AI study platform. Subjects: ESS, BM, Economics (SL/HL), Math AI/AA SL, more coming. Pricing: €12/mo, €49 one-time/6mo (€8.17/mo), €79 one-time/12mo (€6.58/mo). All subjects included every plan. 7-day free trial, 14-day refund. Built by ex-ML-engineer + IB parent, prior background 200k+ professional-exam students.

## What Aimnova actually is (verified by walking the product)
A browseable structured COURSE: per-topic notes pages (Big Idea boxes, Remember/Tip callouts, Explain-Like-I'm-5), an interactive PPC diagram, MCQ knowledge checks, AND free-text "micro-topic practice" with AI marking. Slick onboarding (study buddy, exam-date-driven study plan). Polished, broad, cheap, self-serve.

## Their free-text marking (the key finding)
On a wrong free-text answer ("scarcity is when there isn't enough so price goes up" — a scarcity/shortage confusion) Aimnova: scored 0/1 ("AI Examiner Score"), gave a per-criterion Marks Breakdown ("resources limited relative to wants 0/1", "choices must be made 0/1"), "How to improve" (add the missing points), "Your answer enhanced for full marks" (rewrote it), and the model answer. GOOD marking — scheme-anchored, point-by-point.
BUT: it never diagnosed the MISCONCEPTION. It treated the wrong answer as a GAP TO FILL (add these points / here's your answer rewritten), NOT a faulty mental model to FIX. It never said "you've described a shortage, not scarcity — here's why that mental model is wrong."

Second test (the damning one): typed a pure non-answer — "i dont like the question" — to a 3-mark "outline the three basic economic questions". Aimnova scored it 0/3 and ran the SAME canned per-criterion Marks Breakdown (what/how/for-whom to produce, each 0/1) plus "how to improve" and the model answer — exactly as if it were a genuine wrong attempt. It did NOT detect that no answer was given. This proves the architecture: it is not reading the student's reasoning at all — it runs the input against a fixed rubric and reports unticked boxes regardless of what was written. A refusal and a genuine misconception get identical treatment. Their free-text "AI marking" is a rubric-matcher with a reveal, not a tutor. It looks strong on right/near-right answers and is hollow exactly when the student is confused — which is when teaching matters. Mia, by contrast, detects the non-answer (blank/refusal handler) and diagnoses the misconception on a genuine miss. This is the moat, triple-confirmed.

## The moat — precisely located
NOT "we mark, they don't" (they mark, well). NOT "we take free text, they don't" (they do).
THE MOAT: Aimnova CORRECTS and REWRITES the answer; Gradd/Mia DIAGNOSES the misconception and teaches through it (verified: second-miss diagnosis-led teach-through — "here's the faulty model you're running"). They patch the answer; we fix the thinking. On a 1-mark define the difference is small; on a compounding misconception (scarcity-vs-shortage, movement-vs-shift, cashflow-vs-finance) it's the whole game — a corrected answer doesn't stop the error recurring; a fixed mental model does. This is architectural — their page→MCQ/practice→model-answer flow can't do it without rebuilding around dialogue.

## Honest current position
- HARD thing (misconception diagnosis tutor): BUILT + verified. They can't easily copy it.
- EASY thing (browseable structured course surface — topic browse, readable notes, session history, dictate, study plan): Aimnova has it; Gradd does NOT yet present it (content exists in lessons table + 61 diagrams, but delivered via Mia's conversation, not browseable). This is catch-up PRESENTATION work on content we already have, not new capability.
- Right order to be in: hard thing done, easy thing pending.

## Strategy
1. Win on the DIAGNOSIS MOMENT — the one thing they can't do. Marketing + free-tier burn taste must DEMO diagnosis-beats-correction, because the difference is invisible until a student is stuck.
2. Build MINIMUM surface to not look thin, then STOP: topic/lesson browse (Priority 6.5), readable notes per topic, session-history readback. Nice-to-have: dictate, study plan. Do NOT over-invest matching their MCQ — our free-text diagnosis is better. Surface = table stakes; tutor = moat. Don't race them on being a better textbook.
3. PRICING: one price, all IB (not per-subject — per-subject vs their all-in €79 is the worst shelf comparison). Realistic zone: visible premium over Aimnova justified by the tutor, NOT 4x. Likely €15–20/mo range; final number set by BURN CONVERSION DATA, not guessed. Be honest about subject coverage (Econ + BM now, more coming) — don't oversell "all IB" with 2 subjects built.
4. Don't out-textbook the textbook. Compete where they're architecturally weak (responsive misconception diagnosis), reach parity (not superiority) on browseable surface.

## Open / to revisit
- Final price: set after burn conversion data.
- Subject coverage honesty in pricing copy.
- Surface-layer build scope (topic browse is Priority 6.5; notes/history readback to be scoped).
