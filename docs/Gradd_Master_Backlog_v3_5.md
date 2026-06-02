# Gradd — Master Product Backlog & 5-Year Roadmap
*Last updated: 02 June 2026 | Version 3.5*

> **v3.5 changelog** — build session of 02 June 2026. IB CONTENT-ACCURACY AUDIT + TEACHING METHODOLOGY REWRITE. Changes tagged `[v3.5]` inline. Summary:
>
> **Shipped to feat/admin-mark-schemes (02 June 2026):**
> - **5-principle teaching methodology rewrite** — both IB tutor prompts (Econ v1.8, BM v1.8) rebuilt. Probe-before-explain loop replaces explain-first scaffold; session-open spacing recall (P2); worked-example fading reconciled with weak-area reteach (P4); interleaving in practice phases (P3); self-assess-before-feedback with explicit non-answer handling (P5). Affirmation checklist, depth-labelling, signals, curriculum, diagram protocol all preserved. Tested on wrong-first-answer sessions: P1/P2/P4/P5 demonstrated, P3 partial by construction.
> - **BM curriculum map rebuilt** — 37 guide sub-topics (1.1–5.9), correct HL/SL flags throughout, unit structure fixed (2.2 org structure was under Unit 1, now Unit 2), MNCs no longer misclassified as HL-only, 5 previously absent sub-topics added (2.3 leadership, 2.6 communication, 3.1 intro to finance, 5.1/5.2/5.4/5.7/5.9). Source: IB BM guide pp.23–36.
> - **BM content error fixed** — `what is a business` no longer teaches profit-motive-as-essential. Affirmation counter-example replaced (four-elements-of-a-business → four-factors-of-production). IBO definition added (resources → goods/services → meeting needs, profit NOT required, non-profits are businesses).
> - **Econ HL/SL scope fix** — `2.5 Importance of PED for firms and government` de-flagged from [HL] to SL+HL (guide p.28).
> - **IB BM 5.2 seed gap closed** — 6 targeted seed questions generated and verified (pass) for IB_BM_099 Operations methods (SL+HL): P1 outline 4m, P2 describe 4m SL, P2 explain 6m SL, P2 evaluate 10m SL, P2 describe 4m HL, P2 discuss 10m HL. Businesses: Steinway, Coca-Cola, New Balance, Nike By You, Unilever.
> - **Econ mark scheme state confirmed** — 127 Econ mark schemes: 92 seed, 35 rejected. 28 rejected hybrids sitting unregenerated (latest batch 30 May, rejected 01 June). Hybrid regen still needed.
> - **Admin mark-schemes UI made subject-aware** — `?subject=IB_BUSINESS_MANAGEMENT` param added; API validates against allowlist; header reflects subject. Tested live.
> - **GUIDES_README and hardening rule** — `docs/GUIDES_README.md` dropped in by user; official IB subject guide PDFs in `docs/` (gitignored). Source-of-truth rule drafted for next session.
>
> **Architecture decisions locked:**
> - Official IB subject guide PDF = single source of truth for all content in tutor prompts and seed library. No memory-based verification. Every flag must quote guide text with page reference.
> - Teaching METHOD is now verified (5-principle audit, test sessions). Teaching CONTENT in curriculum-knowledge sections has never been fully audited — content-accuracy pass is the next audit leg.
> - Seed generator has no per-sub-topic coverage floor — `buildSpecList()` can produce zero questions for a valid topic (caught on 5.2). Fix needed before ACCA build.
>
> **New items captured:** pipeline coverage-floor fix (pre-ACCA), verifier-bypass on targeted inserts, BM HL-only seed gaps (2.5/3.6/3.9/4.6), import guard for generate-seed-questions.ts, BM calculate top-up (P2 SL 6m, 2 questions short).

---

## THE NORTH STAR

**Gradd is the only AI platform that delivers the full IB, ACCA, and LC curriculum from scratch — not revision, not notes, not reactive Q&A. Full structured delivery. 24/7. No teacher required. No textbook required. The best exam outcome per euro spent, anywhere in the world.**

Every competitor gives students content. Gradd gives students a tutor.

---

## THE ONE QUESTION — EVERY DECISION, EVERY TIME

**"Does this make a student more likely to get a higher grade than they would have without Gradd?"**

If yes — build it. If no — cut it.

---

## THE FIVE QUALITY BARS — NON-NEGOTIABLE

1. **Content accuracy** — every claim in every tutor prompt traceable to the official subject guide. Official guide PDF = single source of truth. No memory-based verification.
2. **Exam alignment** — every question, every mark scheme, every piece of feedback anchored to actual IBO/ACCA marking criteria.
3. **Teaching method** — probe-before-explain, spacing recall, worked-example fading, interleaving, self-assess-before-feedback. Method verified against TEACHING_PRINCIPLES.md.
4. **No false confidence** — Mia never affirms an incomplete answer. Affirmation accuracy rule is mechanical and non-negotiable.
5. **Verifier + human review** — every seed question and mark scheme passes automated verifier AND human review before reaching students.

---

## PRODUCTS — FULL PLATFORM

| Product | Status | Monthly | Annual |
|---------|--------|---------|--------|
| LC Business | Live | €19.99 | €159/yr |
| IB Economics | Live | €44.99 | €369/yr |
| IB Business Management | Built, not launched | €44.99 | €369/yr |
| IB Bundle (Econ + BM) | Built, not launched | €64.99 | €529/yr |
| IGCSE Business | Roadmap | €34.99 | €279/yr |
| IGCSE Bundle | Roadmap | €54.99 | €449/yr |
| ACCA / CIMA | 2027 | TBD | TBD |

---

## PRICING (LOCKED — DO NOT CHANGE WITHOUT EVIDENCE)

**IB single: €44.99/mo or €369/yr (30% discount)**
**IB bundle: €64.99/mo or €529/yr (32% discount)**
**IGCSE single: €34.99/mo or €279/yr**
**IGCSE bundle: €54.99/mo or €449/yr**

Anchor: "An hour with Lanterna — Gradd is a month." [v3.4]

Revenue model is subscriptions only. No per-session, no credits, no freemium dilution.

School licensing target: €30-50/student/year (class of 12+). Phase 3.

---

## MRR MILESTONES — 5-YEAR VIEW

| Milestone | Revenue | Interpretation |
|-----------|---------|----------------|
| 10 paying students | €450/mo | Proof of concept |
| 50 paying students | €2,250/mo | Ramen profitability |
| 200 paying students | €9,000/mo | Solo founder salary |
| 500 paying students | €22,500/mo | Small team viable |
| 2,000 students | €90,000/mo | €1M ARR |
| 5,000 students | €225,000/mo | €2.7M ARR |

---

## KNOWN BUGS — FIX BEFORE ANY MARKETING

Nothing goes public at scale until all are resolved.

- [x] `[v3.2]` **SESSION HISTORY BUG** — FIXED
- [x] `[v3.2]` **COURSE_POSITION NOT INJECTED** — FIXED
- [ ] **UPGRADE PATH MISSING** — Single subject to bundle hits "User already registered" error. Fix: Stripe subscription upgrade → Supabase subject update. Interim: handle manually. Priority: **HIGH — pre-launch**.
- [x] `[v3.1]` **IB DASHBOARD LESSON COUNT** — FIXED
- [x] `[v3.1]` **IB WEEKLY EMAIL LC-BRANDED** — FIXED
- [x] `[v3.2]` **IB SIGNUP COPY CONTRADICTS BILLING** — FIXED
- [x] `[v3.3]` **DASHBOARD SESSIONS CAPPED AT 5** — FIXED
- [x] `[v3.3]` **IB LANDING LOGO TEXT NOT IMAGE** — FIXED
- [x] `[v3.3]` **SESSION-END CTA SAME-ROUTE NO-OP** — FIXED
- [x] `[v3.4]` **MOBILE COMPARISON CTA TRUNCATION** — FIXED
- [x] `[v3.4]` **DEMO PAGE "SIGN UP FREE" CTA** — FIXED
- [x] `[v3.4]` **DEMO DASHBOARD ALEX REFERENCES** — FIXED
- [x] `[v3.4]` **"TUTORS PRICED LIKE THERAPISTS" LINE** — FIXED
- [x] `[v3.5]` **IB TUTOR TONE** — FIXED. Teaching methodology rewritten with 5-principle loop (probe-first, spacing recall, fading, self-assess). Challenge phrasing prohibition preserved from original prompt.
- [x] `[v3.5]` **BM CURRICULUM PROFIT-MOTIVE ERROR** — FIXED. `what is a business` no longer teaches profit-motive-as-essential; IBO definition correct; non-profits confirmed as businesses.
- [ ] **`/session` unauth redirect wrong path** — redirects to `/login` but route is `/auth/login`. Priority: LOW.
- [ ] **LC session loads unused fonts** — Fraunces/Geist `@import` in shared block. Gate to IB only. Priority: LOW.
- [ ] `[v3.4]` **Mia marks-band denominator drift** — 10m P3 Part (b) marked "out of 15" instead of out of 10. Fix: surface `{{CURRENT_QUESTION_MARKS}}` token. ~30 min. Priority: LOW.
- [ ] `[v3.4]` **student_progress lesson/unit inconsistency** — No constraint enforces `current_lesson_code` belongs to `current_unit_code`. Fix: trigger or derive at write time. ~30 min. Pre-launch hardening.

### [02/06/2026] Pipeline hardening — from BM content-accuracy audit + 5.2 seed fill

- [ ] **Seed generator has no per-sub-topic coverage floor** — `buildSpecList()` distributes proportionally by unit size; a thin lesson can draw ZERO questions. Caught on BM 5.2 (SL+HL core, zero questions). Add coverage-guarantee pass: every `topic_code` gets ≥1 question of each required format before proportional fill. **Must land before ACCA seed pools at scale.** Priority: MEDIUM (pre-ACCA-build).
- [ ] **Targeted/single-lesson inserts bypass the verifier** — 5.2 fill inserted 6 questions as `status='seed' / verification_status='unverified'`, invisible to `/admin/questions`. Fold verification into targeted-insert path. Priority: MEDIUM.
- [ ] **BM HL-only seed gaps: 2.5 (Org culture), 3.6 (Efficiency ratios), 3.9 (Budgets), 4.6 (International marketing)** — zero seed questions. Fill during BM Layer 2. Priority: LOW (no HL paying students yet).

### [02/06/2026] Layer 2 IB Econ — question-level fixes (NOT scheme regens)

These 4 questions have no surviving seed hybrid because the QUESTION is flawed, not the generator. Do NOT regenerate schemes against them — fix the question first, then generate.
- [ ] **29ee3edf (comparative advantage + gains from trade)** — overloaded: asks calculate-CA + pre-spec + post-spec + gains-for-both in a 4-mark frame (~7 marks of work). 4 scheme attempts failed. Re-scope to mark weight (split, or raise marks) then generate. Priority: LOW.
- [ ] **44e39d56 (DWL natural monopoly)** — references missing stimulus data. Fix stimulus, then generate. Priority: LOW.
- [ ] **b885195b (PES handmade tiles)** — references Price Levels A/B/C with no accompanying data. Fix stimulus, then generate. Priority: LOW.
- [ ] **8f78ad58 (decision-tree / insurance)** — stimulus ambiguous on EV ordering; schemes contradict on the rational choice. Clarify stimulus, then generate. Priority: LOW.

Layer 2 IB Econ otherwise COMPLETE: 93 seed hybrid schemes live, hybrid generator validated (the 27-May reject panic was duplicate losers + flawed questions, not generator failure).

---

## `[v3.4]` LAYER 1 IB ECONOMICS — SHIPPED 23 MAY 2026

**End-to-end seed-anchored exam-prep mode live in production on gradd.ai.**

### What shipped
- **Seed library:** 92 seed questions (93 generated; 1 net reject). V3 framework constants evidenced verbatim from 2022 guide.
- **Generation + verification pipeline:** `generate-seed-questions.ts` + `verify-seed-questions.ts` with deterministic decision rule.
- **Postgres function:** `fetch_exam_questions_tiered` — 4-tier cascade (lesson → unit+paper → unit → subject-wide), SECURITY DEFINER.
- **Admin review UI:** `/admin/questions` — three buckets (pass/borderline/fail), keyboard-driven.
- **Mia integration:** `fetchExamQuestionsContext()` injected as `{{EXAM_QUESTIONS_CONTEXT}}` at session start + message routes.
- **Exam-prep delivery protocol:** verbatim seed question with explicit "write your full answer now." Scaffolding capped by marks band.

### Mark scheme state (as of 02 June 2026)
- 127 Econ mark schemes: 92 seed, 35 rejected (0 candidate).
- Scheme types: 40 band_descriptor (all seed), 33 content_checklist (26 seed / 7 rejected), 54 hybrid (26 seed / 28 rejected).
- **28 rejected hybrids unregenerated.** Latest rejection 01 June 2026. Hybrid regen (`--regen-rejected`) must run before Layer 2 Econ mark schemes are complete.

---

## `[v3.5]` LAYER 1 IB BM — CONTENT AUDIT + METHODOLOGY REWRITE (02 JUNE 2026)

### Teaching methodology — both prompts
- **5-principle loop** embedded in IB Econ (v1.8) and IB BM (v1.8):
  1. Probe-before-explain — student attempts/recalls before any teaching
  2. Session-open spacing recall — one prior-content question before new content
  3. Worked-example fading — Phase 1 (full model) → Phase 2 (partial frame) → Phase 3 (cold attempt)
  4. Interleaving in practice phases — rotate command terms, discrimination check between questions
  5. Self-assess-before-feedback — "where is this answer strongest/weakest?" before feedback on AO2/AO3 responses; blank/non-answer handled gracefully
- Affirmation checklist, depth-labelling (describe/analyse/evaluate-depth), re-test-after-correction, WEAK_AREA_FLAG signals, curriculum, diagram protocol: all preserved unchanged.
- Tested via simulated wrong-first-answer sessions: P1/P2/P4/P5 demonstrated, P3 partial by construction (requires multi-question practice block).

### BM curriculum map — rebuilt from guide pp.23–36
- All 37 sub-topics (1.1–5.9) now present with guide-accurate content bullets.
- HL-only flags corrected: 2.5, 2.7, 3.6, 3.9, 4.3, 4.6, 5.3, 5.6, 5.7, 5.8, 5.9 marked [HL ONLY].
- Previously absent topics added: 2.3 Leadership (5 styles), 2.6 Communication, 3.1 Intro to finance, 5.1 Intro to ops mgmt, 5.2 Operations methods, 5.4 Location, 5.7 Crisis management, 5.9 MIS.
- Unit placement fixed: 2.2 Org structure moved from Unit 1 to Unit 2.
- MNCs (1.6) de-flagged from HL-only (it is SL+HL per guide p.21).
- Profit-motive error fixed in definition and affirmation counter-example.

### BM seed library — current state
- **91 seed questions** (85 from original generation + 6 targeted for 5.2).
- 5.2 Operations methods (previously zero): 6 seed questions, all verified pass. Businesses: Steinway & Sons (job), Coca-Cola (mass/flow), New Balance (evaluate batch→custom), Nike By You (mass customization HL), Unilever (discuss batch→mass/flow HL).
- 5 sub-topics still have zero seed questions: 2.5, 3.6, 3.9, 4.6 (HL-only — low priority), 5.2 (now closed).
- BM P2 SL calculate AO4 6m: 2 questions vs target 4 — minor quantity shortfall.

### Content-accuracy audit — status
- Guide PDFs in `docs/` (gitignored, copyright). Both guides confirmed present.
- Econ Tier 1 spot-checked: multiplier, PED, YED, PES formulas correct. HL-only flags 2.10/2.11/2.12 correct.
- BM curriculum map rebuilt from guide verbatim. Content audit of Econ CURRICULUM KNOWLEDGE section (formulas, HL scope flags, markbands) and BM command terms: scheduled next session.
- Rule established: every flag must quote guide text with page reference. Memory-based verification prohibited.

---

## FULL BUILD PRIORITY ORDER — EVERYTHING IN SEQUENCE

### PRIORITY 1 — CRITICAL BUGS (Do first, before any new build)

1. [x] `[v3.2]` Session history — FIXED
2. [x] `[v3.2]` course_position injection — FIXED
3. [ ] Fix upgrade path — single to bundle — **still open, pre-launch**
4. [ ] Fix `/session` unauth redirect — `/login` → `/auth/login` — LOW, pre-launch
5. [ ] `[v3.4]` student_progress lesson/unit consistency trigger — 30 min, pre-launch hardening
6. [ ] `[v3.4]` Mia marks-band denominator drift — 30 min, Layer 2 polish
7. [ ] `[v3.5]` Seed generator coverage-floor fix — MEDIUM, pre-ACCA
8. [ ] `[v3.5]` Targeted-insert verifier bypass fix — MEDIUM

---

### PRIORITY 2 — CURRICULUM & CONTENT (Foundation of everything)

9. [x] `[v3.4]` IB Economics full curriculum map — DONE
10. [x] `[v3.4]` IB Economics lesson seed SQL — DONE (92 seed questions)
11. [x] `[v3.5]` IB Business Management full curriculum map — DONE (37 sub-topics, guide pp.23–36)
12. [ ] IB Business Management seed SQL dump — seed questions exist in DB; SQL dump to repo not yet written
13. [ ] IGCSE Business + Economics curriculum maps
14. [ ] IGCSE Business + Economics seed SQL
15. [ ] Cambridge International AS Business + Economics curriculum maps
16. [ ] A-Level Business + Economics curriculum maps (Edexcel first)
17. [ ] ACCA F1–F4 curriculum maps (if ACCA chosen Summer 2027)
18. [ ] CIMA Operational curriculum maps (if CIMA chosen Summer 2027)
19. [ ] Examiner report key themes extracted per ACCA/CIMA paper
20. [ ] Pass rate context per paper documented

---

### PRIORITY 3 — TUTOR SYSTEM PROMPTS (The product)

21. [x] `[v3.4]` IB Economics command terms embedded — DONE
22. [x] `[v3.5]` IB BM command terms embedded — DONE (BM V3 framework + rebuilt curriculum map)
23. [x] `[v3.5]` Teaching methodology — 5-principle loop — DONE (both IB prompts)
24. [x] `[v3.5]` Tone fixed — DONE. Challenge phrasing prohibition active. Self-assess-before-feedback replaces blunt correction.
25. [x] `[v3.2]` Course position adaptive — FIXED
26. [ ] HL vs SL logic — HL gets more depth, harder questions, higher expectations
27. [ ] Paper awareness per topic — P1/P2/P3 framing in every explanation
28. [ ] IA boundary handling — acknowledged, out of scope, clean
29. [ ] Weak area detection — tutor names it directly when student struggles three times
30. [ ] All IB signals correct — LESSON_COMPLETE, UNIT_COMPLETE, WEAK_AREA_FLAG, SESSION_SUMMARY
31. [ ] ACCA tutor persona — career-driven, quarterly exam awareness
32. [ ] ACCA pass rate intelligence, examiner trap warnings, all ACCA signals

---

### PRIORITY 3.5 — EXAM-PREP MODE (THE MOAT — pre-launch HIGH)

#### Layer 0 — Session opening behaves differently per course_position
- [x] `[v3.3]` **DONE — verified on production 21 May 2026.**

#### Layer 1 — Seed question library (FOUNDATIONAL)
- [x] `[v3.4]` **IB Economics LIVE.** 92 seed questions, tiered RPC, Mia integration.
- [x] `[v3.5]` **IB BM seed library — SUBSTANTIALLY DONE.** 91 seed questions across all 37 guide sub-topics (5 HL-only gaps remain: 2.5/3.6/3.9/4.6 low-priority; 5.2 now filled). `/admin/mark-schemes` subject-aware for BM review.
- [ ] **IB BM HL-only seed gaps** — 4 topics (2.5, 3.6, 3.9, 4.6) have zero seed questions. Fill during BM Layer 2 generation. Low priority until HL cohort exists.
- [ ] `[v3.4]` **IGCSE Business + Economics seed libraries** — Q4 2026 / Q1 2027.
- [ ] `[v3.4]` **Diagram-required seed questions** — zero diagram-anchored questions currently. Extend generator with `diagram_required` + `diagram_type`. Phase 2 high priority.

#### Layer 2 — IBO mark scheme integration (explicit rubrics)
- [ ] **IB Economics mark schemes** — 92 seed / 35 rejected. 28 rejected hybrids need regen (`--regen-rejected`). Then `/admin/mark-schemes` review of candidates. **Next immediate workstream.**
- [ ] **IB BM mark schemes** — 85 seed (all promoted from candidate). Mark scheme generation not yet run for BM. Run generate-mark-schemes for IB_BUSINESS_MANAGEMENT, then review.
- [ ] Mark scheme text surfaced to Mia at marking time — point-by-point marking, exact criterion match.
- [ ] Output format: `awarded / available`, mark scheme points hit/missed, specific quoted criteria.
- [ ] **The layer that justifies €44.99 and the planned €59.99 raise.**

#### Layer 3 — Command-term fluency
- [x] `[v3.4]` `[PARTIAL]` — encoded in framework constants + depth-label system in prompt.
- [ ] Per-command-term marks-band guidance, required structure, depth, banned shapes.

#### Layer 4 — Examiner traps + trigger phrases per topic
- [ ] Per syllabus topic: common student mistakes from IBO Subject Reports.
- [ ] `examiner_traps` table — `topic_code, trap_description, common_wrong_phrase, correct_framing, source_subject_report_reference`.

#### Sequencing + pre-launch minimum
- **Layer 0:** ✅ shipped
- **Layer 1 (IB Econ):** ✅ shipped
- **Layer 1 (IB BM):** ✅ substantially done (91 questions, HL gaps minor)
- **Layer 2 (IB Econ):** ⬜ hybrid regen → admin review → complete
- **Layer 2 (IB BM):** ⬜ generate mark schemes → admin review
- **Layer 3 (full):** ⬜ ships alongside Layer 2
- **Layer 4:** ⬜ Phase 2, post-launch

---

### PRIORITY 3.6 — MARKING EXPLAINABILITY SUITE (after Layer 2, pre-launch) `[v3.4]`

- [ ] **Blog/landing page: "How Mia marks like an IB examiner"** — real mark scheme screenshot, worked 15m example, AO breakdown
- [ ] **60-second AO onboarding tour** at first marked response
- [ ] **Clickable marks ratio** in chat — student clicks "6-7/10" → expands to per-AO breakdown
- [ ] **Dashboard "Your AO profile" chart** — running average AO1/AO2/AO3 performance
- [ ] ~4-6 hours total. High conversion lever.

---

### PRIORITY 4 — SESSION TRANSCRIPT STORAGE (Launch critical) `[v3.4]`

**MUST SHIP BEFORE FIRST PAYING CUSTOMER.**

- [ ] `[v3.4]` **Session capture foundation** — `session_messages` (real-time per-turn) and `lesson_knowledge_cards` (background on LESSON_COMPLETE).
- [ ] Indexed on `(session_id, created_at)` and `(student_id, created_at DESC)`, RLS on `student_id`.
- [ ] 5-7 hours total. **One-way door — must ship before September launch.**

---

### PRIORITY 5 — PLATFORM EXTENSION CODE

(Unchanged from v3.3 — items 30-41)

---

### PRIORITY 6 — ONBOARDING FLOW

(Unchanged from v3.3 — items 42-44)

---

### PRIORITY 7 — LANDING PAGES & COPY

- [x] `[v3.2]` IB landing page — rebuilt
- [x] `[v3.3]` IB landing logo — real PNG
- [x] `[v3.4]` IB landing comparison table refresh
- [x] `[v3.4]` IB landing copy fix — Lanterna price comparison
- [x] `[v3.4]` Demo page CTA fix
- [x] `[v3.4]` Demo dashboard persona — Louise unified
- [x] `[v3.4]` Demo session toggle — Teaching/Exam-prep
- [ ] `[v3.4]` **IB landing Layer 1 upgrades** — verified question library section, answer-marking example, one comparison table row.
- [ ] `[v3.4]` **"The Gradd method" promotion** — 5-step pedagogical loop (learn → answer → corrected → diagram → exam technique) as dedicated landing section.
- [ ] `[v3.4]` **Swap demo exam-prep transcript V1 → V2 (HDI/GDP).**
- [ ] ACCA landing page
- [ ] Landing page mobile pass
- [ ] Footer legal pages for ACCA

---

### PRIORITY 8 — TRUST & CONVERSION

(Unchanged from v3.3 — items 52-56)

---

### PRIORITY 9 — QA & LAUNCH READINESS

(Unchanged from v3.3 — items 57-69)

---

### PRIORITY 10 — BETA & LAUNCH

(Unchanged from v3.3 — items 70-76)

---

## CLEANUP TASKS — small, each its own branch

- [ ] **Backfill `supabase/migrations/` to complete history** — 4 migrations missing.
- [ ] `[v3.2]` Decommission dead trial code
- [x] `[v3.3]` Build the real `/demo` route — DONE
- [ ] `[v3.2]` Set up a full Stripe TEST environment
- [ ] `[v3.3]` Landing page mobile pass
- [x] `[v3.3]` Refresh the landing hero chat-card — DONE
- [ ] `[v3.3]` Delete dead `proxy.ts` auth code
- [ ] `[v3.3]` Gate Fraunces/Geist `@import` to IB only
- [ ] `[v3.3]` Create a persistent LC test account
- [ ] `[v3.3]` Fix `/session` unauth redirect — `/login` → `/auth/login`
- [ ] Stripe Customer Portal route — trial reminder "manage subscription" link → `/dashboard` not portal. ~30 min.
- [ ] `[v3.3]` Restore IB chat italic/orange aesthetic — `--chat-em-font` + `--chat-em` variables.
- [ ] `[v3.3]` Diagram label collisions — final polish pass.
- [ ] `[v3.5]` **Add import guard to `generate-seed-questions.ts`** — `main()` runs on import, blocks consumers from importing `IB_ECONOMICS_CONFIG` / `IB_BUSINESS_MANAGEMENT_CONFIG` cleanly. ESM guard pattern. Low complexity. See `verify-seed-questions.ts` for working example.
- [ ] `[v3.5]` **BM P2 SL calculate top-up** — 2 seed questions vs target 4. Generate 2 more when convenient.

---

## PHASE 2 — WHAT MAKES IT THE BEST
*Target: September 2026 – March 2027*

### 2.0 Seed lookup optimisation `[v3.4]`
- [ ] Cache `EXAM_QUESTIONS_CONTEXT` per session — currently fetched every message turn.

### 2.1 Voice Features
- [ ] Text-to-speech on tutor responses — Web Speech API, free
- [ ] Voice mic input for student answers — SpeechRecognition API, free
- [ ] Speed control slider — 0.8x to 1.5x
- [ ] `[v3.4]` Speech-to-text via Web Speech API or Whisper. 6-8 hours.
- [ ] `[v3.4]` Mia text-to-speech via ElevenLabs or OpenAI TTS. 4-6 hours.

### 2.2 Tutor Intelligence Upgrades
- [ ] Examiner report integration — last 3 sessions per paper in tutor context
- [ ] Mark scheme language — every evaluative response uses mark scheme vocabulary
- [ ] Common examiner trap flags per topic
- [ ] Essay structure frameworks per command term
- [ ] Spaced repetition — weak areas reintroduced at increasing intervals until mastered
- [ ] Session opening brief — covered last session, weak area, today's topic, paper alignment
- [ ] Cross-topic synthesis (Econ ↔ BM) — link subjects for bundle students
- [ ] `[v3.5]` **Tutor content-accuracy pass** — curriculum-knowledge sections of both IB prompts audited against guide verbatim. Method verified (5 principles); content not fully verified. Same rigour as Check 6 scheme audit, applied to what Mia TEACHES. Covers: Econ formulas (18 formulas, multiplier open/closed forms), Econ HL/SL scope flags (sub-topic level), BM command terms and markbands. Next audit leg.

### 2.3 Student Experience
- [ ] `[v3.4]` **Past-paper question library** — real IBO past papers indexed by syllabus topic. 8-12 hours.
- [ ] `[v3.4]` **Mock exam mode** — timed real-conditions practice paper. 6-8 hours.
- [ ] Predicted grade indicator — running 1–7 estimate
- [ ] `[v3.4]` **Spaced repetition for weak areas.** 4-6 hours.
- [ ] Student- or parent-set exam date
- [ ] In-app diagram drawing
- [ ] `[v3.4]` Streak tracking and gamification. 2-3 hours.
- [ ] Topic mastery map
- [ ] Session transcript download
- [ ] IB Paper 3 data response practice
- [ ] `[v3.4]` **Day-1 activation gate** — Resend email at hour 4 post-signup if no lesson started. 1 hour.

### 2.4 Parent Dashboard
- [ ] `[v3.4]` **Parent dashboard with separate login.** 4-6 hours.
- [ ] Weekly email digest to parent

### 2.5 Referral + Growth Levers `[v3.4]`
- [ ] **Referral mechanism** — refer-a-friend, both parties get one month free or 20% off.
- [ ] **Teacher affiliate programme** — 20% recurring commission.
- [ ] **Outcome-linked pricing** — full refund if student doesn't hit target IB grade.

### 2.6 Anti-churn `[v3.4]`
- [ ] **Cancellation save flow** — personalised summary, what's next 4 weeks, downgrade/pause options.

### 2.7 Upgrade flows `[v3.4]`
- [ ] **Single → bundle upgrade path** — Stripe subscription upgrade, update subject in Supabase.

---

## PHASE 3 — THE MOAT
*Target: 2027*

### 3.1 Examiner Intelligence
- [ ] Model answer library
- [ ] Failing answer examples
- [ ] Grade descriptors embedded
- [ ] ACCA marker mentality

### 3.2 Institutional / School Licensing `[v3.4]`
- [ ] **School licensing product (Q1-Q2 2027)** — €30-50/student/year, sold as class of 12+.
- [ ] **Social layer inside class** — discussion threads, anonymised peer comparison, class-wide mastery view.
- [ ] 25-40 hours total build. Target €30-100k ARR Year 1 with 3-10 schools.
- [ ] Teacher account, bulk student import, school billing, ACCA employer licence.

### 3.3 Sciences and Humanities (deferred — vertical focus first)
- [ ] IB Biology, Chemistry, Physics SL/HL — only after Business + Economics vertical is dominant
- [ ] IB History, Geography, Psychology SL/HL

---

## PHASE 4 — SCALE
*Target: 2028*

### 4.1 A-Level
- [ ] A-Level Economics (AQA/Edexcel), Business, Maths (LaTeX)

### 4.2 Multi-Language
- [ ] Spanish-language tutor for IB — Latin American market (44% of IB students)
- [ ] Mandarin-language tutor for IB — China and Singapore markets
- [ ] Language selector at onboarding

### 4.3 Mobile App
- [ ] Native iOS and Android apps
- [ ] Push notifications, offline mode

---

## STRATEGIC DECISIONS `[v3.4]`

### Lifestyle vs venture-scale path
- [ ] **Make explicitly before September 2026 launch.** Default: lifestyle for first 12 months. Lifestyle = solo founder, €200-500k ARR Year 2, profitable from month 1. Venture-scale = raise €250-500k pre-seed, hire 2-4 people 2027, target €5-10M ARR Year 4. Not compatible.

### Subject roadmap — vertical specialist positioning
- **Locked**: Business + Economics across multiple curricula, age 14 through professional qualification
- **Order**: LC → IB Econ (live) → IB BM (seed library done, not launched) → IGCSE Business + Economics → Cambridge International AS → A-Level (Edexcel first) → ACCA F1-F4 OR CIMA Operational (data-driven choice Summer 2027)
- **NOT IB → ACCA.** IGCSE wins: 70% curriculum overlap, same buyer, no AI tutor exists, Yr10/11 → IB Yr12 retention moat.
- **Marketing line**: *"From your first Business class at age 14 to your professional qualification at 28, Gradd is your tutor."*

---

## MARKETING STRATEGY — IN ORDER

(Unchanged from v3.3)

---

## COMPETITIVE POSITIONING

| Competitor | Their Claim | The Truth | Our Line |
|------------|------------|-----------|---------|
| Lanterna | Expert human tutors | £720 for 10 hours. Scheduling required. | "An hour with Lanterna — Gradd is a month." |
| RevisionDojo | AI for IB | Revision tool. Assumes prior knowledge. | "They revise. We teach." |
| Acowtancy | Premium ACCA prep | $338 per paper. Videos. | "They show you videos. We teach you until you know it." |
| OpenTuition | Free ACCA resources | Free notes, AI that tells you to verify elsewhere. | "Free gets you the notes. Gradd gets you the pass." |
| Kaplan/BPP | ACCA approved courses | £400–900 per paper. Passive. Pre-recorded. | "Built for 2010. We're built for now." |
| TutorChase | Human tutors | $40–140/hr. Scheduling. No curriculum. | "24/7. No scheduling. Full curriculum. One price." |

---

## INFRASTRUCTURE — NON-NEGOTIABLE RULES

(All rules from v3.3 carry forward)

`[v3.4]` additions:
- **Seed library architecture**: every subject has its own evidenced framework constants, its own `<SUBJECT>_CONFIG`, its own seed SQL dump.
- **Tier cascade RPC pattern**: `fetch_exam_questions_tiered` is the canonical seed lookup. Reused per subject.
- **Mia exam-prep behaviour**: scaffolding strictly capped by marks band. Verbatim seed question quoting non-negotiable.
- **Demo source files**: capture verbatim real Mia sessions to `docs/demo_source_*.md`.

`[v3.5]` additions:
- **Official IB subject guide PDF = single source of truth for all content claims in tutor prompts and seed library.** Guide PDFs in `docs/` (gitignored, copyright). Every content flag must quote guide text with page reference. No memory-based verification.
- **Tutor prompt changes are method-only until content audit completes.** Curriculum-knowledge sections require guide-evidence for every claim.
- **Seed generator coverage guarantee**: every `topic_code` must have ≥1 seed question per required format before proportional fill runs. No subject ships without per-sub-topic coverage check.

---

## SESSION RULES

(Unchanged from v3.3)

---

*This document is the single source of truth for every Gradd decision.*
*Reference it at the start of every build session.*
*Measure every decision against the north star.*
*Update it when decisions change. Re-upload immediately.*

*Last updated: 02 June 2026 | Version 3.5*
