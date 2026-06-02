# Gradd — Master Product Backlog & 5-Year Roadmap
*Last updated: 24 May 2026 | Version 3.4*

> **v3.4 changelog** — build session of 23 May 2026 (24-hour focused sprint). LAYER 1 IB ECONOMICS SHIPPED END-TO-END to production. Changes tagged `[v3.4]` inline. Summary:
>
> **Shipped to main (23 May 2026):**
> - **Layer 1 IB Economics — seed question library + tiered RPC + Mia integration + exam-prep delivery protocol** (the moat)
>   - 93 verified IBO-format seed questions across all sub-part types (P1 Part a/b, P2 Part a/b/c-f/g, P3 Part a/b)
>   - V3 assessment framework constants evidenced verbatim from the 2022 IB Economics Subject Guide (paper formats, AO descriptors, AO×Paper matrix, command term glossary)
>   - Atomic Postgres function `fetch_exam_questions_tiered` with 4-tier cascade (lesson → unit+paper → unit → subject-wide)
>   - `/admin/questions` review UI with 3 buckets (pass/borderline/fail), keyboard-driven approval
>   - Exam-prep delivery protocol: single prerequisite checkpoint max, then verbatim seed question with explicit "write your full answer now" + IBO band marking
>   - Mia produces examiner-grade marking with band scores, quoted student text, mechanism-focused rewrites, and structured redo tasks — tested end-to-end against real student answers
> - Refreshed IB landing page comparison table — 8 rows, mobile-card layout, honest CTA copy
> - Mobile button truncation fix on comparison CTA
> - Demo page CTA cleaned: "Sign up free" → "Start your IB plan" with 7-day money-back guarantee framing
> - Demo exam-prep mode toggle on `/demo/session` — segmented control swapping between Teaching and Exam-prep transcripts, Louise unified persona across both modes
> - Demo dashboard Alex → Louise consistency fix
> - "Tutors are priced like therapists" → "That's an hour with Lanterna — Gradd is a month" (direct competitor price comparison)
> - Migration `fetch_exam_questions_tiered_fn.sql` committed to `supabase/migrations/`
> - V2 demo source captured to `docs/demo_source_hdi_gdp_exam_prep_session_20260523.md` (better marketing artefact, swap-in for V1 deferred)
>
> **Architecture decisions locked:**
> - Seed library is the moat — every subject ships with a verified seed pool sourced from official subject guides, generated + verified + human-reviewed
> - Tier cascade pattern (lesson → unit+paper → unit → subject) is the canonical lookup shape for seed-anchored prompts — reused for IB BM, IGCSE, ACCA
> - V3 framework constants encoded as TypeScript constants from verbatim PDF evidence — playbook proven, reused per subject
> - The verifier+human review pattern caught 5 questions the verifier alone passed but human review rejected (compound questions, syllabus drift) — validates the architecture for IB BM and IGCSE expansion
>
> **Strategic decisions locked:**
> - Subject roadmap pivoted: IB → IGCSE Business + Economics → Cambridge International AS → A-Level (Edexcel) → ACCA F1-F4 OR CIMA (data-driven choice in summer 2027). NOT IB → ACCA.
> - Positioning: "World's best AI tutor for Business and Economics across multiple curricula" — vertical specialist, not generic AI tutor
> - Pricing locked: IGCSE single €34.99/mo or €279/yr; IGCSE bundle €54.99/mo or €449/yr
>
> **New items captured:** marking explainability suite, session capture foundation, diagram-required seed questions, school licensing + social layer, landing page upgrades, Gradd method promotion, lifestyle vs venture-scale decision

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

Every single tutor interaction across every product must clear all five:

1. **Teaches from scratch** — zero prior knowledge assumed unless student proves otherwise
2. **Exam aware** — every explanation connects to how it is assessed, on which paper, for how many marks
3. **Command term fluent** — define, explain, examine, discuss, evaluate, to what extent all produce different responses
4. **Level appropriate** — HL student always gets more depth, challenge, and higher expectations than SL
5. **Progress advancing** — every session moves the student forward visibly on the curriculum map

---

## PRODUCTS — FULL PLATFORM

| Product | Domain | Market | Students/Year | Status |
|---------|--------|--------|--------------|--------|
| LC Business | gradd.ie | Ireland | ~35,000 | Live |
| IB Economics SL/HL | gradd.ai | Global (153 countries) | ~28,500 | `[v3.4]` **Layer 1 LIVE** |
| IB Business Management SL/HL | gradd.ai | Global (153 countries) | ~25,000 | Build |
| IGCSE Business + Economics | gradd.ai | Global | TBD | Q4 2026 / Q1 2027 |
| Cambridge International AS Business + Economics | gradd.ai | Global | TBD | Q1 2027 |
| A-Level Business + Economics (UK + intl) | gradd.ai | UK / Global | TBD | Q2 2027 |
| ACCA F1–F4 OR CIMA Operational | gradd.ai | Global | TBD | Summer 2027 (data-driven choice) |
| ACCA Strategic Professional | gradd.ai | Global | Same pool | 2028 |
| IB Mathematics AA/AI | gradd.ai | Global | ~50,000 | Phase 3 |
| IB Sciences | gradd.ai | Global | ~80,000 | Phase 4 |
| IB Humanities | gradd.ai | Global | ~40,000 | Phase 4 |

---

## PRICING (LOCKED — DO NOT CHANGE WITHOUT EVIDENCE)

| Product | Monthly | Annual | Notes |
|---------|---------|--------|-------|
| LC Business | €29.99 | €249 | Ireland market |
| IB Economics | €44.99 | €349 | Raise to €59.99 after 50 students with results |
| IB Business Management | €44.99 | €349 | Same raise trigger |
| IB Bundle (both subjects) | €74.99 | €579 | Save €15/month vs separate |
| `[v3.4]` IGCSE single | €34.99 | €279 | Per subject |
| `[v3.4]` IGCSE Bundle | €54.99 | €449 | Both subjects |
| ACCA All Papers | €49.99 | €399 | All F1–Strategic Professional |
| IB + ACCA Bundle | €89.99 | €699 | For students doing both |

**7-day money-back guarantee on all products. No free trials. Card charged in full at signup.**

---

## MRR MILESTONES — 5-YEAR VIEW

| Milestone | Target Date | Subscribers | Monthly Profit |
|-----------|-------------|-------------|----------------|
| €5,500 MRR | December 2026 | ~130 | ~€4,600 |
| €15,000 MRR | March 2027 | ~340 | ~€13,500 |
| €25,000 MRR | September 2027 | ~570 | ~€23,000 |
| €50,000 MRR | March 2028 | ~1,100 | ~€46,500 |
| €75,000 MRR | September 2028 | ~1,650 | ~€70,000 |
| €135,000 MRR | December 2030 | ~3,000 | ~€120,000 |

3,000 subscribers = less than 1% of combined addressable market. This is achievable.

**`[v3.4]` IGCSE revenue model (honest read):** Year 1 plausible range €60k-€1.5M, median ~€250k, expected value ~€280k, upside ~€800k-€1.5M only if launch surface is invested in. Distribution: 35% soft (€40-80k), 35% solid (€100-250k), 20% strong (€400-700k), 10% defining (€800k-€1.5M). Year 3 ARR €4-7M if Y1 defining, €800k-€1.5M if Y1 solid.

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
- [x] `[v3.4]` **MOBILE COMPARISON CTA TRUNCATION** — FIXED. Allow button label to wrap on mobile.
- [x] `[v3.4]` **DEMO PAGE "SIGN UP FREE" CTA** — FIXED. Replaced with "Start your IB plan" + 7-day money-back guarantee.
- [x] `[v3.4]` **DEMO DASHBOARD ALEX REFERENCES** — FIXED. Unified Louise persona across demo dashboard and demo session.
- [x] `[v3.4]` **"TUTORS PRICED LIKE THERAPISTS" LINE** — FIXED. Replaced with direct Lanterna price comparison.
- [ ] **IB TUTOR TONE** — Remove: "let me push you slightly deeper", "let me challenge you on that", "I want to probe this further." Ask the harder question directly. Priority: MEDIUM.
- [ ] **`/session` unauth redirect wrong path** — `app/session/page.tsx` ~L19 redirects unauthenticated users to `/login` but the route is `/auth/login`. Priority: LOW.
- [ ] **LC session loads unused fonts** — IB re-skin added Fraunces/Geist `@import` inside shared `<style>` block. Gate to IB only. Priority: LOW.
- [ ] `[v3.4]` **Mia marks-band denominator drift** — 10m P3 Part (b) Recommend got marked "10-11 out of 15" instead of out of 10. Qualitative feedback correct, only denominator wrong. Fix: surface question marks value to Mia via `{{CURRENT_QUESTION_MARKS}}` token when marking is active. ~30 min. Not shipping-critical.
- [ ] `[v3.4]` **student_progress lesson/unit inconsistency possible** — No constraint enforces that `current_lesson_code` belongs to `current_unit_code`. Caught when test data had IB_ECON_097 (Unit 3) with current_unit_code = IB_ECON_UNIT_4. Session-start defended by falling back to defaults. Fix: trigger validating lesson∈unit, or derive `current_unit_code` from `lesson_code` at write time. ~30 min. Pre-launch hardening.

---

## `[v3.4]` LAYER 1 IB ECONOMICS — SHIPPED 23 MAY 2026

**End-to-end seed-anchored exam-prep mode live in production on gradd.ai.** The full vertical slice from blank schema to working product in 24 hours of focused build.

### What shipped
- **Seed library:** 93 verified IBO-format exam questions for IB Economics, sourced from the 2022 IB Subject Guide structure, generated → verified against V3 framework → human-reviewed → status='seed' in production Supabase
- **`questions` table:** multi-product schema with `subject`, `topic_code`, `paper`, `command_term`, `marks`, `ao_level`, `level`, `status`, `verified_against_guide_version`, `verification_status`, RLS enabled, indexed on `(subject, topic_code, level) WHERE status='seed'`
- **Generation pipeline:** `scripts/generate-seed-questions.ts` with `IB_ECONOMICS_CONFIG` matching the 2022 guide structure, proportional unit allocation, structural rules against compound command terms in single-AO sub-parts
- **Verification pipeline:** `scripts/verify-seed-questions.ts` with V3 framework constants (paper formats, AO descriptors, AO×paper matrix, full command term glossary — all evidenced verbatim from the Subject Guide), deterministic decision rule (all-correct→pass, any-major→fail, else borderline)
- **Postgres function:** `fetch_exam_questions_tiered(p_lesson_code, p_subject, p_levels, p_unit_code)` — atomic CTE-based 4-tier cascade, SECURITY DEFINER, VOLATILE, returns 3 anchor questions per session
- **Admin review UI:** `/admin/questions` with three buckets (pass/borderline/fail), keyboard-driven approval (A/R/E shortcuts), email-gated to admin user
- **Mia integration:** `lib/system-prompt.ts` adds `fetchExamQuestionsContext()` calling the RPC, formats output into EXAMPLE 1/2/3 block, injected as `{{EXAM_QUESTIONS_CONTEXT}}` token in IB Economics tutor prompt at session start AND message routes
- **Exam-prep delivery protocol:** prompt obedience fix in 4 places forcing Mia to use one of the three seed questions VERBATIM in exam-prep mode openers. Scaffolding capped at one prerequisite checkpoint, then explicit "write your full answer now" with word count and marking promise. No mid-session teaching when seed examples are available.
- **Marking layer (partial):** Mia produces examiner-grade marking output — band-specific scores, quoted student text, mechanism-focused rewrites, structured redo tasks — across multiple command terms (Explain 10m AO2, Recommend 10m AO3, To-what-extent 15m AO3) without explicit rubric work yet. Seed-anchor influence is doing more than expected.

### Validation
- HL exam-prep session against `testbundle@gradd.ai`, IB_ECON_097, course_position=exam-prep: Mia opened with verbatim Bhutan GNH/HDI Recommend question (Tier 1 match), single prerequisite checkpoint, marked mediocre 400-word answer at "below 13-15 band" with structural framework for what 13-15 looks like
- Earlier SL test against IB_ECON_002 P1 Explain 10m: Mia awarded 6-7/10, named AO depth ("describe-depth" vs "explain-depth"), quoted student text, provided two mechanism-focused rewrites, issued structured redo
- Tier cascade validated across three test cases: full Tier 1 hit, partial Tier 1 with Tier 2 fallback, full Tier 3 unit-wide fallback

### Architecture proven for replication
- The seed generation + verification + review pipeline is product-agnostic — `subject` column on every artifact, configs per subject
- Replication cost per subject (next): IB Business Management 12-18 hrs, IGCSE Business + Econ 50-70 hrs each, A-Level Business + Econ 60-80 hrs each, ACCA F1 80-120 hrs, CIMA Operational 60-90 hrs per paper

---

## FULL BUILD PRIORITY ORDER — EVERYTHING IN SEQUENCE

### PRIORITY 1 — CRITICAL BUGS (Do first, before any new build)

1. [x] `[v3.2]` Session history — FIXED
2. [x] `[v3.2]` course_position injection — FIXED
3. [ ] Fix upgrade path — single to bundle — **still open, pre-launch**
4. [ ] Fix `/session` unauth redirect — `/login` → `/auth/login` — LOW, pre-launch
5. [ ] `[v3.4]` student_progress lesson/unit consistency trigger — 30 min, pre-launch hardening
6. [ ] `[v3.4]` Mia marks-band denominator drift — 30 min, Layer 2 polish

---

### PRIORITY 2 — CURRICULUM & CONTENT (Foundation of everything)

7. [x] `[v3.4]` IB Economics full curriculum map — DONE (referenced in seed library)
8. [x] `[v3.4]` IB Economics lesson seed SQL — DONE (93 questions, `seed/IB_ECONOMICS_questions.sql`)
9. [ ] IB Business Management full curriculum map
10. [ ] IB Business Management lesson seed SQL
11. [ ] IGCSE Business + Economics curriculum maps
12. [ ] IGCSE Business + Economics seed SQL
13. [ ] Cambridge International AS Business + Economics curriculum maps
14. [ ] A-Level Business + Economics curriculum maps (Edexcel first)
15. [ ] ACCA F1–F4 curriculum maps (if ACCA chosen Summer 2027)
16. [ ] CIMA Operational curriculum maps (if CIMA chosen Summer 2027)
17. [ ] Examiner report key themes extracted per ACCA/CIMA paper
18. [ ] Pass rate context per paper documented

---

### PRIORITY 3 — TUTOR SYSTEM PROMPTS (The product)

19. [x] `[v3.4]` IB Economics command terms embedded — DONE via V3 framework constants in the seed verification process; reused at runtime via Mia's prompt
20. [ ] IB Business Management command terms embedded — same playbook
21. [ ] HL vs SL logic — HL gets more depth, harder questions, higher expectations
22. [ ] Paper awareness per topic — P1/P2/P3 framing in every explanation
23. [ ] IA boundary handling — acknowledged, out of scope, clean
24. [ ] Weak area detection — tutor names it directly when student struggles three times
25. [ ] All IB signals correct — LESSON_COMPLETE, UNIT_COMPLETE, WEAK_AREA_FLAG, SESSION_SUMMARY
26. [ ] Tone fixed — no hedging phrases, no "let me push you deeper"
27. [x] `[v3.2]` Course position adaptive — FIXED
28. [ ] ACCA tutor persona — career-driven, quarterly exam awareness
29. [ ] ACCA pass rate intelligence, examiner trap warnings, all ACCA signals

---

### PRIORITY 3.5 — EXAM-PREP MODE (THE MOAT — pre-launch HIGH)

#### Layer 0 — Session opening behaves differently per course_position
- [x] `[v3.3]` **DONE — verified on production 21 May 2026.**

#### Layer 1 — Seed question library (FOUNDATIONAL)
- [x] `[v3.4]` **DONE — IB Economics LIVE in production 23 May 2026.** 93 verified seed questions, tiered RPC, Mia integration, exam-prep delivery protocol with single prerequisite cap. See LAYER 1 IB ECONOMICS section above for full details.
- [ ] `[v3.4]` **IB Business Management seed library** — same playbook. 12-18 hr estimated. Next major workstream.
- [ ] `[v3.4]` **IGCSE Business + Economics seed libraries** — Q4 2026 / Q1 2027.
- [ ] `[v3.4]` **Diagram-required seed questions** — current seed library has zero diagram-anchored questions. Structural mismatch with landing page's #1 differentiator (IBO diagram marking). Extend `generate-seed-questions.ts` with `diagram_required` + `diagram_type` fields, regenerate 20-30 diagram-anchored questions per subject, update Mia to explicitly request diagram upload on these, add `diagram_type` column. 8-12 hours focused. Phase 2 high priority.

#### Layer 2 — IBO mark scheme integration (explicit rubrics)
- [ ] `[v3.4]` Estimated 6-8 hours (revised down from 12-16) — Layer 1 seed-anchor influence is already producing strong informal marking
- [ ] Mark scheme text indexed alongside seed questions (`mark_schemes` table or inline JSON on `questions`)
- [ ] Mia marks student answer mark-by-mark, naming what was hit and what was missed
- [ ] Output format: `awarded / available`, list of mark-scheme points hit, list missed, specific quoted phrase from mark scheme
- [ ] **The layer that justifies €44.99 and the planned €59.99 raise.**
- [ ] **NEXT MAJOR WORKSTREAM after Layer 2 + IB BM Layer 1.**

#### Layer 3 — Command-term fluency
- [x] `[v3.4]` `[PARTIAL]` — Encoded in V3 framework constants, surfaced via Mia's prompt when marking against seed questions. Still needs explicit per-command-term marks-band guidance.
- [ ] Each command term documented with: marks-band guidance (2-mark vs 4-mark vs 10-mark expectations), required structure, expected depth, banned shapes
- [ ] Mia warns when student answer structure doesn't match command term

#### Layer 4 — Examiner traps + trigger phrases per topic
- [ ] Per syllabus topic: list of common student mistakes flagged in IBO Subject Reports
- [ ] Mia surfaces these proactively: "watch out — most students confuse [X] with [Y] here. IBO Subject Report for May 2023 flagged it specifically..."
- [ ] Schema: `examiner_traps` table — `topic_code, trap_description, common_wrong_phrase, correct_framing, source_subject_report_reference`

#### Sequencing + pre-launch minimum
- **Layer 0:** ✅ shipped
- **Layer 1 (IB Econ):** ✅ shipped
- **Layer 1 (IB BM):** ⬜ next major workstream
- **Layer 2:** ⬜ next after Layer 1 IB BM
- **Layer 3 (full):** ⬜ ships alongside Layer 2
- **Layer 4:** ⬜ Phase 2, post-launch

---

### PRIORITY 3.6 — MARKING EXPLAINABILITY SUITE (after Layer 2, pre-launch) `[v3.4]`

The single biggest marketing differentiator now that Mia produces examiner-grade marking. Currently invisible to prospects.

- [ ] **Blog/landing page: "How Mia marks like an IB examiner"** — real mark scheme screenshot, worked 15m example, AO breakdown
- [ ] **60-second AO onboarding tour** at first marked response — explains AO1/AO2/AO3 in plain language
- [ ] **Clickable marks ratio** in chat — student clicks "6-7/10" → expands to per-AO breakdown
- [ ] **Dashboard "Your AO profile" chart** — running average AO1/AO2/AO3 performance across all sessions
- [ ] ~4-6 hours total. High conversion lever. Differentiates from RevisionDojo/ACCAly vague "AI grading" claims.

---

### PRIORITY 4 — SESSION TRANSCRIPT STORAGE (Launch critical) `[v3.4]`

**MUST SHIP BEFORE FIRST PAYING CUSTOMER** — currently every session is lost to the void on completion.

- [ ] `[v3.4]` **Session capture foundation** — two tables: `session_messages` (real-time per-turn writes from session API route) and `lesson_knowledge_cards` (background job on LESSON_COMPLETE writes structured card via Claude Sonnet)
- [ ] Indexed on `(session_id, created_at)` and `(student_id, created_at DESC)`, RLS on `student_id`, soft-delete column
- [ ] 5-7 hours total
- [ ] **One-way door — must ship before September launch or first cohort's conversations are lost**
- [ ] Viewer UI (transcript page, knowledge card page, PDF download) deferred to post-launch

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
- [x] `[v3.4]` IB landing comparison table refresh — 8 rows, mobile-card layout, honest CTA copy
- [x] `[v3.4]` IB landing copy fix — "tutors priced like therapists" → "an hour with Lanterna — Gradd is a month"
- [x] `[v3.4]` Demo page CTA fix — "Sign up free" → "Start your IB plan"
- [x] `[v3.4]` Demo dashboard persona — Alex → Louise unified
- [x] `[v3.4]` Demo session toggle — Teaching/Exam-prep modes
- [ ] `[v3.4]` **IB landing page Layer 1 upgrades — 3 sections** to add:
  - **Verified question library section** — "93 IB-verified questions anchored to every topic" with seed snippet visual, same treatment as diagram-marking section
  - **Answer-marking example section** — student paragraph + Mia's band score + AO criteria + worked rewrite, mirror of diagram-marking layout. **Highest-conversion asset.**
  - **One comparison table row** — "Question library: Gradd 93 IB-verified vs others"
  - 2-3 hours focused
- [ ] `[v3.4]` **"The Gradd method" promotion** — 5-step pedagogical loop (learn concept → answer question → get corrected → apply to diagram → turn into exam technique) currently buried in IB EXAM TECHNIQUE callout. Promote to dedicated landing-page section with numbered visual. Add trust-signal line in Meet Mia section about IB Subject Guides 2022/2024. 1-2 hours.
- [ ] `[v3.4]` **Swap demo exam-prep transcript V1 → V2 (HDI/GDP)** — source captured at `docs/demo_source_hdi_gdp_exam_prep_session_20260523.md`. Better marketing artefact (tighter opener, "what 13-15 looks like" framework). 30-60 min focused.
- [ ] ACCA landing page
- [ ] Landing page mobile pass — trust bar overflow + check all sections on narrow screen
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

- [ ] **Backfill `supabase/migrations/` to complete history** — 4 migrations missing. ~30 min.
  - `20260520000000_create_questions_table.sql`
  - `20260520000100_add_verified_against_guide_version.sql`
  - `20260521000000_add_admin_review_columns.sql`
  - `20260523000100_seed_lookup_partial_index.sql`
- [ ] `[v3.2]` Decommission dead trial code
- [x] `[v3.3]` Build the real `/demo` route — DONE
- [ ] `[v3.2]` Set up a full Stripe TEST environment
- [ ] `[v3.3]` Landing page mobile pass
- [x] `[v3.3]` Refresh the landing hero chat-card — DONE via demo page rebuild
- [ ] `[v3.3]` Delete dead `proxy.ts` auth code
- [ ] `[v3.3]` Gate Fraunces/Geist `@import` to IB only
- [ ] `[v3.3]` Create a persistent LC test account
- [ ] `[v3.3]` Fix `/session` unauth redirect — `/login` → `/auth/login`
- [ ] Stripe Customer Portal route — Trial reminder email's "manage subscription" link points to `/dashboard` not the Stripe portal. ~30 min.
- [ ] `[v3.3]` Restore IB chat italic/orange aesthetic — `--chat-em-font` + `--chat-em` variables lost in commit `0a44e4c`. ~30 min.
- [ ] `[v3.3]` Diagram label collisions — final polish pass (11 diagrams across IB Econ + IB BM)
- [ ] `[v3.4]` Remove throwaway diagnostic script `scripts/diag-substitution.ts` — already deleted, just confirm gitignored if recreated

---

## PHASE 2 — WHAT MAKES IT THE BEST
*Target: September 2026 – March 2027*

### 2.0 Seed lookup optimisation `[v3.4]`
- [ ] **Cache `EXAM_QUESTIONS_CONTEXT` per session, not per message.** Currently message route calls `fetchExamQuestionsContext` every turn. At 200+ active students this adds thousands of daily RPCs at ~50ms each. Fix: fetch once at session/start, store in `sessions.exam_questions_context` column. ~1 hour. Only if production logs show RPC volume becoming meaningful — Anthropic prompt caching already mitigates the API-token cost.

### 2.1 Voice Features (Zero extra cost — browser APIs only)
- [ ] Text-to-speech on tutor responses — Web Speech API, free
- [ ] Voice mic input for student answers — SpeechRecognition API, free
- [ ] Speed control slider — 0.8x to 1.5x
- [ ] Language setting respected
- [ ] `[v3.4]` Speech-to-text input via Web Speech API or Whisper. Mic button next to camera button in ChatInterface. 6-8 hours.
- [ ] `[v3.4]` Mia text-to-speech output via ElevenLabs or OpenAI TTS. Audio toggle per message. 4-6 hours.

### 2.2 Tutor Intelligence Upgrades
- [ ] Examiner report integration — last 3 sessions per paper in tutor context
- [ ] Mark scheme language — every evaluative response uses mark scheme vocabulary
- [ ] Common examiner trap flags per topic
- [ ] Essay structure frameworks per command term
- [ ] Spaced repetition — weak areas reintroduced at increasing intervals until mastered
- [ ] Session opening brief — covered last session, weak area, today's topic, paper alignment
- [ ] Cross-topic synthesis (Econ ↔ BM) — link subjects for bundle students
- [ ] `[v3.4]` **Course_position field deeper injection** — captured at onboarding but not used in session start context. Mia treats all students identically by course_position. Fix: pass course_position into system prompt context so Mia opens differently per selection.

### 2.3 Student Experience
- [ ] `[v3.4]` **Past-paper question library** — real IBO past papers indexed by syllabus topic. Killer differentiator vs Lanterna/TutorChase. 8-12 hours. Source: IBO past paper PDFs (licensed access).
- [ ] `[v3.4]` **Mock exam mode** — timed real-conditions practice paper. Mia delivers IBO paper structure, student writes under time pressure, gets marked feedback against IB criteria. Killer feature for final 4 weeks before May exam. 6-8 hours.
- [ ] Predicted grade indicator — running 1–7 estimate
- [ ] Revision planner
- [ ] Free-roam / drill mode
- [ ] `[v3.4]` **Spaced repetition for weak areas** — currently `weak_areas` table tracks gaps but doesn't actively schedule reviews. Build "drill weak areas" mode that surfaces recurring weaknesses on a spaced-repetition algorithm. 4-6 hours.
- [ ] Student- or parent-set exam date
- [ ] In-app diagram drawing
- [ ] `[v3.4]` Streak tracking and gamification — daily streak counter, milestone badges (7-day, 30-day, 60-day). 2-3 hours.
- [ ] Topic mastery map
- [ ] Session transcript download
- [ ] IB Paper 3 data response practice
- [ ] `[v3.4]` **Day-1 activation gate** — Resend email at hour 4 post-signup if no lesson started. Re-engagement nudge. 1 hour.

### 2.4 Parent Dashboard
- [ ] `[v3.4]` **Parent dashboard with separate login** — Parent gets separate auth from student. Shows progress, weak areas, session history, total study time per week. Addresses the parent (buyer) question "what is my child actually doing with this". Major conversion + retention lever. 4-6 hours. Requires new auth role + dashboard scoping.
- [ ] Weekly email digest to parent — cron exists, IB-correct template

### 2.5 Referral + Growth Levers `[v3.4]`
- [ ] **Referral mechanism** — refer-a-friend, both parties get one month free or 20% off when referee converts to paid. Unique referral codes per student, tracked in Supabase, Stripe coupon integration. 4-6 hours.
- [ ] **Teacher affiliate programme** — 20% recurring commission for IB teachers referring parents. 80k+ potential affiliates globally, none currently incentivised by competitors. €215.95 per converted referral over 24 months.
- [ ] **Outcome-linked pricing** — full refund if student doesn't hit target IB grade. Test on 10% of new signups, expand if refund rate <15%. Competitors can't credibly match.

### 2.6 Anti-churn `[v3.4]`
- [ ] **Cancellation save flow** — before cancellation processes, intercept with (a) personalised summary of what student has learned, (b) what's coming up in their next 4 weeks, (c) downgrade option monthly→annual or vice versa, (d) pause option for exam windows. Every saved cancellation = months of additional revenue. 2-3 hours.

### 2.7 Upgrade flows `[v3.4]`
- [ ] **Single → bundle upgrade path** — currently hits "User already registered" error. Stripe subscription upgrade to bundle price ID, update subject to IB_BUNDLE in Supabase. For soft launch: handle manually. Pre-scale priority.

---

## PHASE 3 — THE MOAT
*Target: 2027*

### 3.1 Examiner Intelligence
- [ ] Model answer library
- [ ] Failing answer examples
- [ ] Grade descriptors embedded
- [ ] ACCA marker mentality

### 3.2 Institutional / School Licensing `[v3.4]` `[PROMOTED FROM PHASE 4]`
- [ ] **School licensing product (Q1-Q2 2027)** — €30-50/student/year, sold as class-of-12+ to international schools. Buyer is head of IB programme. Wrapper: multi-student coordinator dashboard, aggregate class progress, single school payment.
- [ ] **Social layer inside class** — discussion threads on hard questions, anonymised peer weak-area comparison, teacher announcements, class-wide topic mastery view. The lock-in that turns Gradd from "tool we bought" into "place where IB class lives." Network effects at class level.
- [ ] 25-40 hours total build. Target €30-100k ARR Year 1 with 3-10 schools.
- [ ] Teacher account — class management, student progress by cohort, at-risk students
- [ ] Bulk student import — CSV
- [ ] School billing — annual invoice
- [ ] ACCA employer licence — accounting firms for trainee cohorts

### 3.3 Sciences and Humanities (deferred — vertical focus first)
- [ ] IB Biology, Chemistry, Physics SL/HL — only after Business + Economics vertical is dominant
- [ ] IB History, Geography, Psychology SL/HL — same
- [ ] Subject bundle pricing

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
- [ ] **Make explicitly before September 2026 launch, not drifted into.** Default: lifestyle for first 12 months, reassess Q3 2027 based on traction. Lifestyle path = solo founder, no employees, focused on €200-500k ARR by Year 2, profitable from month 1, self-funded forever. Venture-scale path = raise €250-500k pre-seed in late 2026/early 2027, hire 2-4 people in 2027, optimise for growth velocity over margin, target €5-10M ARR by Year 4. Both valid, NOT compatible.

### Subject roadmap — vertical specialist positioning
- **Locked**: Business + Economics across multiple curricula, age 14 through professional qualification
- **Order**: LC → IB Econ (live) → IB BM → IGCSE Business + Economics → Cambridge International AS → A-Level (Edexcel first) → ACCA F1-F4 OR CIMA Operational (data-driven choice Summer 2027)
- **NOT IB → ACCA.** IGCSE wins because (a) ~70% curriculum overlap with IB, engine ports 1-for-1; (b) same buyer as IB (international school parents); (c) no AI tutor exists in IGCSE Business/Economics — first-mover; (d) IGCSE Yr10/11 → IB Yr12 retention is the structural moat
- **Marketing line**: *"From your first Business class at age 14 to your professional qualification at 28, Gradd is your tutor."*
- **Defensibility against funded competitors**: not the architecture (replicable in 6-9 months by a funded team), but the **compounding of replication speed across products, student session data accumulating from real cohorts, and customer depth built between now and mid-2027 before serious competition arrives**

---

## MARKETING STRATEGY — IN ORDER

(Unchanged from v3.3)

---

## COMPETITIVE POSITIONING

| Competitor | Their Claim | The Truth | Our Line |
|------------|------------|-----------|---------|
| Lanterna | Expert human tutors | £720 for 10 hours. Scheduling required. | "An hour with Lanterna — Gradd is a month." `[v3.4]` |
| RevisionDojo | AI for IB | Revision tool. Assumes prior knowledge. | "They revise. We teach." |
| Acowtancy | Premium ACCA prep | $338 per paper. Videos. | "They show you videos. We teach you until you know it." |
| OpenTuition | Free ACCA resources | Free notes, AI that tells you to verify its own answers elsewhere. | "Free gets you the notes. Gradd gets you the pass." |
| Kaplan/BPP | ACCA approved courses | £400–900 per paper. Passive. Pre-recorded. | "Built for 2010. We're built for now." |
| TutorChase | Human tutors | $40–140/hr. Scheduling. No curriculum. | "24/7. No scheduling. Full curriculum. One price." |

---

## INFRASTRUCTURE — NON-NEGOTIABLE RULES

(Unchanged from v3.3 — all rules carry forward)

`[v3.4]` Additions:
- **Seed library architecture**: every subject has its own evidenced framework constants in `scripts/verify-seed-questions.ts` (V1/V2/V3 versioning, V3 only exported), its own `<SUBJECT>_CONFIG` in `scripts/generate-seed-questions.ts`, its own `<SUBJECT>_questions.sql` repo-tracked dump in `seed/`. Subject-agnostic by design.
- **Tier cascade RPC pattern**: `fetch_exam_questions_tiered(p_lesson_code, p_subject, p_levels, p_unit_code)` is the canonical seed lookup. Reused for IB BM, IGCSE, ACCA, CIMA — same function, different `p_subject` argument.
- **Mia exam-prep behaviour**: scaffolding strictly capped by marks band of the seed question (2-4m → no scaffold; 6-10m → one prerequisite; 12-20m → one prerequisite + one plan-your-answer). Verbatim seed question quoting non-negotiable in exam-prep mode. No mid-session question invention when seed examples are provided.
- **Demo source files**: capture verbatim real Mia sessions to `docs/demo_source_*.md` for swap-in to `/demo/session` content. Every demo turn is unedited production output.

---

## SESSION RULES

(Unchanged from v3.3)

---

*This document is the single source of truth for every Gradd decision.*
*Reference it at the start of every build session.*
*Measure every decision against the north star.*
*Update it when decisions change. Re-upload immediately.*

*Last updated: 24 May 2026 | Version 3.4*