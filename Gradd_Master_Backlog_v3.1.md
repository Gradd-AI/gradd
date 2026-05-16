# Gradd — Master Product Backlog & 5-Year Roadmap
*Last updated: 16 May 2026 | Version 3.1*

> **v3.1 changelog** — IB landing-page vet + read-only feature audit + lesson-totals fix.
> Changes are tagged `[v3.1]` inline. Summary:
> - Pricing note corrected: IB runs a 7-day money-back guarantee, **no free trial** — the live "free trial" wording was off-strategy and is being removed.
> - Known Bugs: two new launch-relevant items added; one corrected; "free first lesson gate" removed (superseded — see Known Bugs note).
> - Priority 7 (Landing Pages): rewritten — the redesign is being ported to the live Next.js page from an approved copy deck.
> - New section: **IB Data & Infrastructure Gaps** (post-Priority 1).
> - Phase 2 items (mock exam, parent dashboard, past-paper, predicted grade, revision planner) confirmed NOT BUILT by audit — status unchanged, evidence noted.

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
| IB Economics SL/HL | gradd.ai | Global (153 countries) | ~28,500 | Build |
| IB Business Management SL/HL | gradd.ai | Global (153 countries) | ~25,000 | Build |
| ACCA F1–F9 | gradd.ai | Global (180 countries) | ~526,000 active | Build |
| ACCA Strategic Professional | gradd.ai | Global | Same pool | Phase 2 |
| IB Mathematics AA/AI | gradd.ai | Global | ~50,000 | Phase 3 |
| IB Sciences | gradd.ai | Global | ~80,000 | Phase 4 |
| IB Humanities | gradd.ai | Global | ~40,000 | Phase 4 |
| A-Level core subjects | gradd.ai | UK/Global | Millions | Phase 4 |

---

## PRICING (LOCKED — DO NOT CHANGE WITHOUT EVIDENCE)

| Product | Monthly | Annual | Notes |
|---------|---------|--------|-------|
| LC Business | €29.99 | €249 | Ireland market |
| IB Economics | €44.99 | €349 | Raise to €59.99 after 50 students with results |
| IB Business Management | €44.99 | €349 | Same raise trigger |
| IB Bundle (both subjects) | €74.99 | €579 | Save €15/month vs separate |
| ACCA All Papers | €49.99 | €399 | All F1–Strategic Professional |
| IB + ACCA Bundle | €89.99 | €699 | For students doing both |

**7-day money-back guarantee on all products. No free trials. Card required at signup.**

> `[v3.1]` **Trial model — confirmed and reconciled.** Audit found the live IB checkout
> was running a real 7-day Stripe trial (`trial_period_days: 7`) — contradicting this
> locked policy. Decision: IB moves to the money-back-guarantee model (charge at signup,
> 7-day refund), matching LC. The IB landing page copy must say "7-day money-back
> guarantee" — never "free trial" / "no charge before day 7". Billing-code change to
> remove the trial is OUTSTANDING — see IB Data & Infrastructure Gaps.

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

---

## KNOWN BUGS — FIX BEFORE ANY MARKETING

Nothing goes public at scale until all are resolved.

- [ ] **SESSION HISTORY BUG** — Tutor asks student where they left off instead of knowing. Fix: inject prior SESSION_SUMMARY into prompt context at session start. Affects LC Business now, will affect IB/ACCA at launch. Priority: CRITICAL.
- [ ] **COURSE_POSITION NOT INJECTED** — course_position captured at onboarding but not passed into session context. Tutor treats all students identically. Fix: pass course_position into system prompt. Priority: HIGH.
- [ ] **UPGRADE PATH MISSING** — Single subject to bundle hits "User already registered" error. Fix: Stripe subscription upgrade → Supabase subject update. Interim: handle manually. Priority: HIGH.
- [x] `[v3.1]` **IB DASHBOARD LESSON COUNT** — dashboard hardcoded `totalLessons = 150` for both IB subjects; `deriveCoursePosition` used Economics totals for BM. FIXED — `lib/lesson-counts.ts` single source of truth (Econ HL 210 / SL 147, BM HL 136 / SL 87, LC 279), DB-verified. Merged to main 16/05/2026.
- [x] `[v3.1]` **IB WEEKLY EMAIL LC-BRANDED** — IB students received the LC weekly digest (tutor "Aoife", LC footer, wrong exam date). FIXED — new IB weekly template (Mia, IB framing, 2027 exam date), cron branches by subject. Merged 16/05/2026.
- [ ] **IB BM LANDING PAGE** — Shows "Papers 1 & 2" — should show "Papers 1, 2 & 3 (HL)." Priority: MEDIUM. *(Folded into the landing-page rebuild — Priority 7.)*
- [ ] `[v3.1]` **IB BM SYLLABUS YEAR** — landing copy says BM is "2022 syllabus"; it is **First Assessment 2024**. Fix in the landing rebuild. Priority: MEDIUM.
- [ ] **STATS BAR WEAK COPY** — "2022 & 2024" is meaningless. `[v3.1]` Superseded by the landing rebuild — the trust bar is being rebuilt with real figures (346 lessons / 61 diagrams). Priority: MEDIUM.
- [ ] **IB TUTOR TONE** — Remove: "let me push you slightly deeper", "let me challenge you on that", "I want to probe this further." Ask the harder question directly. Priority: MEDIUM.
- [ ] **IB ECON PRICING CARD** — "Quantitative skills for HL Paper 3" — verify this is actually taught before scaling traffic. Priority: MEDIUM.

> `[v3.1]` **Note — "free first lesson gate" is removed from scope.** Earlier drafts assumed
> a free-first-lesson paywall. There is no free lesson in the product. Access model is:
> sign up → card → money-back guarantee. Items referencing a "free lesson gate" below are
> struck through.

---

## `[v3.1]` IB DATA & INFRASTRUCTURE GAPS — surfaced by the May 2026 audit

Resolve alongside Priority 1. Each is confirmed against the codebase.

- [ ] **Remove the IB Stripe trial.** `app/api/checkout/ib/route.ts` creates the subscription with `trial_period_days: 7`. Remove it; charge at signup; the 7-day money-back guarantee is the model. Decommission the IB `trial-reminders` cron and the `trial_ends_at` column once unused. Billing change — review before shipping. Priority: HIGH.
- [ ] **Per-subject level fields are NULL.** `profiles.ib_economics_level` and `ib_business_level` are never populated by onboarding — every IB student falls back to the single `exam_level`. A bundle student doing HL Economics + SL Business cannot be represented. **BLOCKER FOR BUNDLE LAUNCH** — not a blocker for single-subject launch. Priority: HIGH.
- [ ] **Verify gradd.ai as a Resend sending domain.** IB transactional email (welcome, trial reminder, weekly digest) currently sends from gradd.ie — works, but a wrong-domain sender for a .ai product. **TRIGGER: before the first paying IB customer.** Priority: MEDIUM.
- [ ] **`sprint-9-landing-rewrite` branch** — an existing branch named for a landing rewrite, last committed ~15/05/2026. Review before/while doing the Priority 7 rebuild so work isn't duplicated or lost. Priority: HIGH (do before the rebuild).
- [ ] **Confirm the 61-diagram count** in `components/diagrams/` before the landing page claims it. Priority: LOW.

---

## FULL BUILD PRIORITY ORDER — EVERYTHING IN SEQUENCE

### PRIORITY 1 — CRITICAL BUGS (Do first, before any new build)

1. [ ] Fix session history bug — inject SESSION_SUMMARY into prompt at session start
2. [ ] Fix course_position not injected into prompt context
3. [ ] Fix upgrade path — single to bundle flow

---

### PRIORITY 2 — CURRICULUM & CONTENT (Foundation of everything)

4. [ ] IB Economics full curriculum map — all topics, SL/HL split, paper alignment (P1/P2/P3), IA boundary, AO levels
5. [ ] IB Economics lesson seed SQL — subject = 'IB_ECONOMICS', SL/HL flag, unit, lesson_title, lesson_order, paper alignment
6. [ ] IB Business Management full curriculum map — all topics, SL/HL, paper alignment, IA boundary, HL Paper 3 case study flagged
7. [ ] IB Business Management lesson seed SQL — subject = 'IB_BUSINESS', same schema
8. [ ] ACCA BT (F1) curriculum map
9. [ ] ACCA MA (F2) curriculum map
10. [ ] ACCA FA (F3) curriculum map
11. [ ] ACCA LW (F4) curriculum map
12. [ ] ACCA PM (F5) curriculum map — highest stakes, 40% pass rate
13. [ ] ACCA TX (F6) curriculum map — UK variant
14. [ ] ACCA FR (F7) curriculum map — 51% pass rate
15. [ ] ACCA AA (F8) curriculum map — 46% pass rate
16. [ ] ACCA FM (F9) curriculum map — 48% pass rate
17. [ ] All ACCA lesson seed SQL — subject = 'ACCA', paper code, CBE type flag
18. [ ] Examiner report key themes extracted per ACCA paper — fed into tutor context
19. [ ] Pass rate context per paper documented — tutor adjusts focus accordingly

---

### PRIORITY 3 — TUTOR SYSTEM PROMPTS (The product)

20. [ ] IB tutor persona (Mia) — international voice, warm and rigorous, not Aoife
21. [ ] IB command terms embedded — define, describe, outline, explain, distinguish, analyse, examine, discuss, evaluate, justify, to what extent — each structurally different
22. [ ] HL vs SL logic — HL student gets more depth, harder questions, higher expectations
23. [ ] Paper awareness per topic — P1/P2/P3 framing in every explanation
24. [ ] IA boundary handling — acknowledged, explained as out of scope, clean
25. [ ] Exam technique woven throughout — never a separate module
26. [ ] Weak area detection — tutor names it directly when student struggles three times
27. [ ] Diagram handling V1 — student uploads hand-drawn diagram, Mia evaluates against IB marking criteria via claude-sonnet-4-6 vision
28. [ ] Diagram rendering — Mia renders correct SVG diagrams inline
29. [ ] All IB signals correct — LESSON_COMPLETE, UNIT_COMPLETE, WEAK_AREA_FLAG, SESSION_SUMMARY
30. [ ] Tone fixed — no hedging phrases, no "let me push you deeper"
31. [ ] Course position adaptive — just_starting / mid_programme / exam_prep opens differently
32. [ ] ACCA tutor persona — career-driven tone, quarterly exam awareness
33. [ ] ACCA pass rate intelligence — PM, AA, FM, FR get extra exam technique focus
34. [ ] ACCA examiner trap warnings embedded per paper
35. [ ] ACCA applied vs strategic professional depth differentiation
36. [ ] All ACCA signals correct — same signal structure as IB

---

### PRIORITY 4 — SESSION TRANSCRIPT STORAGE (Launch critical — do before beta)

37. [ ] Create session_messages table in Supabase — id, session_id, role (student/tutor), content, timestamp
38. [ ] Insert every student message and tutor response to session_messages in real time during session
39. [ ] Generate readable transcript at session end — compiled from session_messages
40. [ ] Store transcript in sessions table
41. [ ] Session history page in student dashboard — student can view any past session
42. [ ] Individual session transcript view — full conversation, timestamped, readable
43. [ ] Download transcript as PDF — student can save and review offline

---

### PRIORITY 5 — PLATFORM EXTENSION CODE

44. [ ] Subject selector at onboarding — LC Business / IB Economics / IB BM / IB Bundle / ACCA
45. [ ] Level selector for IB — SL or HL with one-line explanation
46. [ ] Course position selector — Just Starting / Mid-Programme / Exam Prep
47. [ ] Routing logic — correct prompt + curriculum per subject, level, course position
48. [ ] IB Stripe price IDs — 4 products created and wired in
49. [ ] ACCA Stripe price IDs created and wired in
50. [ ] Stripe webhook handles all new price IDs
51. [ ] gradd.ai added to Vercel — Settings → Domains
52. [ ] Domain-aware middleware — gradd.ai serves IB/ACCA, gradd.ie serves LC
53. [ ] ~~Free first lesson gate~~ — `[v3.1]` REMOVED. No free lesson in the product; access is signup → card → money-back guarantee.
54. [ ] Student progress dashboard — curriculum map, lessons complete, units done, % complete
55. [ ] Weak area panel — surfaces WEAK_AREA_FLAG from Supabase visibly to student
56. [ ] Session summary visible to student after every session
57. [ ] HL/SL badge visible in UI header at all times
58. [ ] Subject badge visible in UI header at all times
59. [ ] Diagram upload UI — camera/file input in ChatInterface
60. [ ] Mobile — fully tested, clean, responsive

---

### PRIORITY 6 — ONBOARDING FLOW

61. [ ] Step 1: Subject selection — clear cards, visual, no friction
62. [ ] Step 2: Level selection for IB — SL/HL, one-line explanation
63. [ ] Step 3: Course position — Just Starting / Mid-Programme / Exam Prep
64. [ ] Step 4: IA scope explained — one sentence, no ambiguity
65. [ ] Step 5: First session starts immediately — no dead ends
66. [ ] All selections stored to Supabase user profile immediately — `[v3.1]` MUST include `ib_economics_level` / `ib_business_level` (currently never written — see IB Data & Infrastructure Gaps)
67. [ ] Welcome email — subject-specific via Resend (IB, ACCA, LC variants)

---

### PRIORITY 7 — LANDING PAGES & COPY `[v3.1] — rewritten`

> The IB landing page is being **rebuilt in the live Next.js app** from an approved
> redesign prototype + a vetted copy deck (`Gradd_IB_Landing_Copy_Deck.md`). The copy
> deck is authoritative: every fabricated/unbuilt-feature claim was cut after the audit.
> Check `sprint-9-landing-rewrite` before/while rebuilding.

68. [ ] IB landing page — rebuild live `app/(ib)` page from the redesign + copy deck; honest trust bar (346 lessons / 61 diagrams), money-back-guarantee wording, no free-trial language
69. [ ] IB Economics section — SL/HL, paper alignment, exam technique, diagram feature called out
70. [ ] IB Business Management section — Paper 3 HL case study called out; BM = First Assessment **2024**
71. [ ] IB pricing — Monthly/Annual toggle + two real cards (single €44.99/€349, bundle €74.99/€579); drop fabricated tier features
72. [ ] ACCA page — pass rate problem called out, OpenTuition comparison ("free notes vs a tutor who knows what it's talking about")
73. [ ] FAQ — IA scope, SL vs HL, what's covered, cancellation, money-back guarantee, diagrams, mobile
74. [ ] Money-back guarantee — prominent on landing and at checkout
75. [ ] `[v3.1]` "See it in action" — wire to a **real read-only demo** (no prompting, no API calls); the static screens are design reference, the demo is its own build
76. [ ] Diagram feature demo on IB landing page
77. [ ] Footer legal pages — Terms / Privacy / Cookies wired to real pages
78. [ ] `[v3.1]` Strip dev artifacts on port — tweaks panel, dev view-switcher, React/Babel CDN scripts

---

### PRIORITY 8 — TRUST & CONVERSION

79. [ ] Trustpilot account created and verified
80. [ ] Trustpilot link in footer and pricing page
81. [ ] Testimonial capture — automated email prompt after lesson 5
82. [ ] Money back guarantee policy written
83. [ ] Referral mechanism planned — refer a friend, both get one month free (build Phase 2)

---

### PRIORITY 9 — QA & LAUNCH READINESS

84. [ ] IB Economics SL — 10 random topic questions checked against spec
85. [ ] IB Economics HL — 10 HL extension questions checked
86. [ ] IB Business Management SL — same
87. [ ] IB Business Management HL — Paper 3 case study framing checked
88. [ ] ACCA BT, MA, FA, LW — 5 exam-style questions per paper checked
89. [ ] ACCA PM, FR, AA, FM — 5 exam-style questions per paper checked against BPP/Kaplan standard
90. [ ] IA boundary test — 5 IA questions, confirm all handled cleanly
91. [ ] SL/HL boundary test — HL-only questions as SL student, confirm correct handling
92. [ ] Diagram upload test — upload hand-drawn AD-AS diagram, confirm Mia evaluates correctly
93. [ ] Session transcript test — complete a full session, confirm all messages stored, transcript generated, visible in dashboard
94. [ ] Signal test — LESSON_COMPLETE, UNIT_COMPLETE, WEAK_AREA_FLAG, SESSION_SUMMARY all fire and write correctly
95. [ ] End-to-end test — IB Economics SL full signup → onboarding → subscribe → lesson → progress updates → session transcript visible `[v3.1] (no free-lesson/paywall step)`
96. [ ] End-to-end test — IB Economics HL same
97. [ ] End-to-end test — IB Business Management SL and HL same
98. [ ] End-to-end test — ACCA same
99. [ ] End-to-end test — LC Business regression — confirm existing product not broken
100. [ ] Stripe test mode — all products
101. [ ] Stripe live mode confirmed
102. [ ] Mobile end-to-end — iOS and Android
103. [ ] Upgrade flow — single to bundle — end to end
104. [ ] `[v3.1]` IB dashboard progress check — confirm denominators per subject+level (Econ SL 147 / HL 210, BM SL 87 / HL 136) on the live site

---

### PRIORITY 10 — BETA & LAUNCH

105. [ ] Recruit 10–15 beta students — 5 IB, 5 ACCA, 5 LC — free access for honest feedback
106. [ ] Weekly check-in with beta students — 3 weeks minimum
107. [ ] After 3 weeks: ask for public review on Trustpilot and community post
108. [ ] Soft launch posts — r/IBO, r/ACCA, IB Facebook parent groups
109. [ ] Full launch September 2026 — coordinated community post across all channels
110. [ ] Demo video — screen recording, real IB session, no voiceover fluff, just the product working
111. [ ] ACCA demo video — same

---

## PHASE 2 — WHAT MAKES IT THE BEST
*Target: September 2026 – March 2027*

> `[v3.1]` The May 2026 audit confirmed the items below are genuinely NOT BUILT — the
> IB landing page was claiming several of them, and that copy has been cut. Build first,
> then claim.

### 2.1 Voice Features (Zero extra cost — browser APIs only)

- [ ] **Text-to-speech on tutor responses** — play button on every tutor message, Web Speech API, 1.2x speed default, stop button, free
- [ ] **Voice mic input for student answers** — mic button in answer field, SpeechRecognition API, transcript appears in text box for student to edit before submitting, free
- [ ] Speed control slider — student can set TTS rate 0.8x to 1.5x
- [ ] Language setting respected — en-US default, expandable for multi-language later

### 2.2 Tutor Intelligence Upgrades

- [ ] Examiner report integration — last 3 sessions of reports per paper in tutor context, tutor references specific findings
- [ ] Mark scheme language — every evaluative response uses mark scheme vocabulary
- [ ] Common examiner trap flags — tutor warns of most frequently penalised mistakes per topic
- [ ] Essay structure frameworks per command term — unprompted structural templates
- [ ] Spaced repetition — weak areas automatically reintroduced at increasing intervals until mastered
- [ ] Session opening brief — what was covered, weak area, today's topic, paper alignment. Tutor never asks where student left off.
- [ ] `[v3.1]` **Cross-topic synthesis (Econ ↔ BM)** — link the two subjects for bundle students; audit-confirmed NOT BUILT (prompts are fully separate). A genuine bundle differentiator — scope properly before claiming.

### 2.3 Student Experience

- [ ] **Past-paper question library** — real IBO past papers indexed by topic; audit-confirmed NOT BUILT (Mia generates exam-style questions, no real archive). `[v3.1]`
- [ ] **Mock exam mode** — timed full-paper conditions, clock running, predicted mark, exact feedback; audit-confirmed NOT BUILT (no timed session type/route). `[v3.1]`
- [ ] **Predicted grade indicator** — running 1–7 estimate, updated after every session, shown in dashboard; audit-confirmed NOT BUILT (no grade field/calc anywhere). `[v3.1]`
- [ ] **Revision planner** — student-visible planner/schedule; audit-confirmed NOT BUILT (backend auto-schedules REVISION sessions, but there is no planner UI). `[v3.1]`
- [ ] Streak tracking — study days this week and month
- [ ] Exam countdown — student sets exam date, visible in UI, tutor references it
- [ ] Topic mastery map — full curriculum, colour-coded by mastery level (not started / in progress / mastered / weak)
- [ ] Session transcript — download as PDF
- [ ] Session transcript — email to student after session automatically
- [ ] IB Paper 3 data response practice — HL Economics with inline data sets

### 2.4 Parent Dashboard

> `[v3.1]` Audit-confirmed NOT BUILT — today there is only a "Parent view" toggle inside
> the student's own login. A separate parent account/role does not exist. The landing
> page's parent claims have been cut back to what the toggle + weekly email actually do.

- [ ] Separate parent account — linked to student at onboarding or via invite (new auth role)
- [ ] Parent view: lessons and sessions this week, curriculum % complete
- [ ] Parent view: weak areas list — plain English
- [ ] Parent view: session transcripts — readable, every session
- [ ] Parent view: predicted grade
- [ ] Parent view: last active date and study frequency
- [ ] Weekly email digest to parent — `[v3.1]` cron exists and now sends an IB-correct template; sends **Monday** (not Sunday — correct any "Sunday" copy)
- [ ] Parent dashboard is the single biggest conversion tool for the parent buyer — build it properly

### 2.5 Referral Programme

- [ ] Student referral — refer a friend, both get one month free
- [ ] Referral tracking in Supabase
- [ ] Referral visible in dashboard — student can see their referral count and reward status

### 2.6 ACCA Expansion

- [ ] Strategic Professional — SBL, SBR curriculum maps and SQL
- [ ] Strategic Professional options — AFM, APM, ATX, AAA curriculum maps and SQL
- [ ] ACCA exam session selector — student states sitting (March/June/September/December)
- [ ] ACCA exam countdown from selected session
- [ ] ACCA pass/fail prediction per paper
- [ ] ACCA qualification tracker — papers passed, remaining, estimated completion

### 2.7 IB Maths Expansion

- [ ] IB Mathematics AA SL/HL — curriculum map + SQL + tutor prompt
- [ ] IB Mathematics AI SL/HL — curriculum map + SQL + tutor prompt
- [ ] LaTeX rendering for equations — non-negotiable for maths delivery

---

## PHASE 3 — THE MOAT
*Target: 2027*

### 3.1 Examiner Intelligence

- [ ] Model answer library — top-scoring annotated answers per topic, every subject
- [ ] Failing answer examples — exactly why they fail, more powerful than correct examples alone
- [ ] Grade descriptors embedded — tutor knows what a Grade 7 IB answer looks like vs Grade 5
- [ ] ACCA marker mentality — feedback framed as "a marker would give you 6/10 here because..."

### 3.2 Institutional

- [ ] School licence — per-student annual pricing for IB World Schools
- [ ] Teacher account — class management, student progress by cohort
- [ ] Teacher view: weak area heatmap by class
- [ ] Teacher view: at-risk students — low progress, declining predicted grades
- [ ] Bulk student import — CSV
- [ ] School billing — annual invoice
- [ ] ACCA employer licence — accounting firms for trainee cohorts
- [ ] Employer dashboard — same as teacher, professional context

### 3.3 Sciences and Humanities

- [ ] IB Biology SL/HL
- [ ] IB Chemistry SL/HL
- [ ] IB Physics SL/HL
- [ ] IB History SL/HL
- [ ] IB Geography SL/HL
- [ ] IB Psychology SL/HL
- [ ] Subject bundle pricing — all IB subjects, one monthly price

---

## PHASE 4 — SCALE
*Target: 2028*

### 4.1 A-Level

- [ ] A-Level Economics (AQA/Edexcel)
- [ ] A-Level Business
- [ ] A-Level Maths (with LaTeX)

### 4.2 Multi-Language

- [ ] Spanish-language tutor for IB — Latin American market (44% of IB students)
- [ ] Mandarin-language tutor for IB — China and Singapore markets
- [ ] Language selector at onboarding

### 4.3 Mobile App

- [ ] Native iOS app
- [ ] Native Android app
- [ ] Push notifications — study reminders, exam countdown, streak alerts
- [ ] Offline mode — cached lesson content

---

## MARKETING STRATEGY — IN ORDER

### Pre-Launch (May–August 2026)
- [ ] r/IBO — join, observe 2 weeks, then contribute value before mentioning Gradd
- [ ] r/ACCA — same
- [ ] IB Facebook groups — 5 largest parent and student groups, join all
- [ ] ACCA Facebook/LinkedIn communities — identify and join
- [ ] IB Discord servers — largest servers, join, observe
- [ ] Answer questions genuinely for 4–6 weeks before mentioning Gradd
- [ ] Demo video ready — 2 minutes, screen recording, real session, no fluff
- [ ] ACCA demo video ready
- [ ] Screenshots ready — diagram upload, progress dashboard, session transcript, weak area detection

### Soft Launch (July–August 2026)
- [ ] Beta programme running — 10–15 students, honest feedback, public reviews after 3 weeks
- [ ] Soft launch posts in all communities

### Full Launch (September 2026)
- [ ] Coordinated post across all communities September 1st
- [ ] r/IBO, r/ACCA, IB Facebook, LinkedIn, Irish networks
- [ ] SEO blog started — one post per week minimum targeting specific search terms

### SEO Content (Start September 2026, compound through 2027)
- [ ] "Why 60% of ACCA PM students fail and what to do about it"
- [ ] "IB Economics Paper 1 vs Paper 2 — what the examiner actually wants"
- [ ] "HL vs SL IB Economics — which should you choose?"
- [ ] "The IB Economics diagrams you must know for Paper 2"
- [ ] "How to answer evaluate questions in IB Business Management"
- [ ] "ACCA FR pass rate 51% — what the examiner keeps penalising"
- [ ] One post per week minimum, every post targets a specific search term

### Ongoing
- [ ] Weekly community presence across all channels
- [ ] After every exam session — email subscribers "How did it go?"
- [ ] Capture results as testimonials, case studies, community posts
- [ ] Paid ads Phase 2 only — Meta for IB parents, Google Search for ACCA terms, only after organic is working

---

## COMPETITIVE POSITIONING

| Competitor | Their Claim | The Truth | Our Line |
|------------|------------|-----------|---------|
| Lanterna | Expert human tutors | £720 for 10 hours. Scheduling required. | "The entire IB year costs less than one Lanterna session package." |
| RevisionDojo | AI for IB | Revision tool. Assumes prior knowledge. | "They revise. We teach." |
| Acowtancy | Premium ACCA prep | $338 per paper. Videos. | "They show you videos. We teach you until you know it." |
| OpenTuition | Free ACCA resources | Free notes, new AI that tells you to verify its own answers elsewhere. | "Free gets you the notes. Gradd gets you the pass." |
| Kaplan/BPP | ACCA approved courses | £400–900 per paper. Passive. Pre-recorded. | "Built for 2010. We're built for now." |
| TutorChase | Human tutors | $40–140/hr. Scheduling. No curriculum. | "24/7. No scheduling. Full curriculum. One price." |

---

## INFRASTRUCTURE — NON-NEGOTIABLE RULES

- Platform: Next.js 16 App Router
- Auth: @supabase/ssr with createBrowserClient/createServerClient — NEVER @supabase/auth-helpers-nextjs
- Database: Supabase — same instance, subject column differentiates all content
- Payments: Stripe — price IDs only (never product IDs)
- Hosting: Vercel — same project, gradd.ai and gradd.ie both point to same deployment
- AI default: claude-haiku-4-5-20251001
- AI complex tasks: claude-sonnet-4-6 — diagram evaluation, feedback, predicted grades
- Prompt caching: day one on all system prompts
- middleware: proxy.ts — never middleware.ts
- cookies(): always await, always async
- getUser(): always — never getSession()
- API routes: excluded from middleware matcher
- Supabase writes: UPDATE not INSERT when row exists
- Components: CSS variable system — no Tailwind
- `[v3.1]` Per-subject lesson totals: use `lib/lesson-counts.ts` — never hardcode lesson counts
- `[v3.1]` IB design system: Fraunces / Geist / Geist Mono on the redesigned IB pages — intentionally distinct from LC's Georgia/beige
- `[v3.1]` Resend sending domains: IB email currently sends from gradd.ie (gradd.ai not yet verified — see IB Data & Infrastructure Gaps)
- IA: OUT OF SCOPE V1 — tutor acknowledges cleanly
- Voice features: Web Speech API only — never paid TTS API
- Session messages: stored to Supabase in real time — every message, every session

---

## SESSION RULES

- **This project chat:** Strategy, planning, market research, backlog only. No code.
- **Build sessions:** Start by reading this backlog. Build against it. Nothing ships that contradicts it.
- **Build prompt:** "Read the Gradd Master Backlog in project files. We are building [item]. Production-ready output only."
- **This backlog:** Updated after every significant decision. Re-uploaded to project files immediately.

---

*This document is the single source of truth for every Gradd decision.*
*Reference it at the start of every build session.*
*Measure every decision against the north star.*
*Update it when decisions change. Re-upload immediately.*

*Last updated: 16 May 2026 | Version 3.1*
