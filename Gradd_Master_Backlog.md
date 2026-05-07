# Gradd — Master Product Backlog & Vision Document
*Last updated: May 2026*

---

## THE NORTH STAR

**Gradd is the only AI platform that delivers the full IB and ACCA curriculum from scratch — not revision, not notes, not reactive Q&A. Full structured delivery. 24/7. No teacher required. No textbook required. The best exam outcome per euro spent, anywhere in the world.**

---

## WHERE THIS DOCUMENT LIVES

This file lives in the Gradd project files in Claude.
Every build session starts by referencing this document.
Every decision gets measured against the north star.
Nothing ships that contradicts it.

---

## THE ONE QUESTION TO ASK BEFORE EVERY BUILD DECISION

**"Does this make a student more likely to get a higher grade than they would have without Gradd?"**

If yes — build it. If no — cut it.

---

## THE QUALITY STANDARD

Every tutor interaction must clear all five of these bars:

1. **Teaches from scratch** — assumes zero prior knowledge unless student demonstrates otherwise
2. **Exam aware** — every explanation connects to how it will be assessed and on which paper
3. **Command term fluent** — responds differently to define vs explain vs evaluate vs discuss
4. **Level appropriate** — HL student always gets more depth, more challenge, higher expectations
5. **Progress advancing** — every session moves the student forward on the curriculum map visibly

---

## PRICING (LOCKED)

| Product | Monthly | Annual |
|---------|---------|--------|
| IB Economics | €44.99 | €349 |
| IB Business Management | €44.99 | €349 |
| IB Bundle (both) | €74.99 | €579 |
| ACCA (launch price) | €49.99 | €399 |
| LC Business | €29.99 | €249 |

Raise IB to €59.99/month after 50 students with proven results. No earlier.

---

## LAUNCH SEQUENCE

| Phase | When | What Ships |
|-------|------|-----------|
| Build | May–June 2026 | Curriculum maps, SQL, system prompt, platform code |
| Soft launch | July 2026 | gradd.ai live, first students in |
| Full launch | September 2026 | Community push, all three subjects live |
| ACCA exam push | December 2026 | First ACCA exam session, conversion spike |
| IB exam push | May 2027 | First full exam cohort, testimonials, retention proof |

---

## PHASE 1 — LAUNCH BACKLOG
*Must be complete before any student touches the product*

### 1.1 Curriculum & Content
- [ ] IB Economics full curriculum map — all topics, SL/HL split, paper alignment, IA boundary
- [ ] IB Economics lesson seed SQL
- [ ] IB Business Management full curriculum map
- [ ] IB Business Management lesson seed SQL
- [ ] ACCA F1–F4 curriculum map (BT, MA, FA, LW)
- [ ] ACCA F1–F4 lesson seed SQL

### 1.2 Tutor System Prompt
- [ ] IB tutor persona — international voice, not Aoife, warm and rigorous
- [ ] IB command terms embedded throughout (define, explain, examine, discuss, evaluate, to what extent)
- [ ] HL vs SL explicit differentiation — HL student feels genuinely more challenged
- [ ] Paper 1/2/3 awareness — every topic framed against correct paper
- [ ] Exam technique woven into every lesson — not a separate module
- [ ] IA boundary — acknowledges existence, explains out of scope, no ambiguity
- [ ] Weak area detection — tutor notices and calls it out directly
- [ ] All signals correct — LESSON_COMPLETE, UNIT_COMPLETE, WEAK_AREA_FLAG, SESSION_SUMMARY
- [ ] ACCA tutor persona — quarterly exam session awareness, career-driven tone
- [ ] ACCA exam technique embedded — question practice, marking criteria awareness

### 1.3 Platform Extension Code
- [ ] Subject selector at onboarding — LC Business / IB Economics / IB Business Management / ACCA
- [ ] Level selector for IB — SL or HL, stored in Supabase user profile
- [ ] Routing logic — correct tutor and curriculum loaded per subject and level
- [ ] IB Stripe price IDs — 4 products created and wired in
- [ ] ACCA Stripe price IDs created and wired in
- [ ] gradd.ai domain added to Vercel
- [ ] Domain-aware landing — gradd.ai serves IB/ACCA homepage
- [ ] Free first lesson gate — one full lesson, no card required
- [ ] Paywall triggers correctly after free lesson
- [ ] Student progress dashboard — visible curriculum map, lessons completed, units done
- [ ] Weak area surfaced in UI — student sees it, not just Supabase write
- [ ] Session summary visible to student after every session
- [ ] HL/SL badge visible throughout UI at all times
- [ ] Mobile experience — tested and clean, IB audience is mobile-heavy

### 1.4 Onboarding Flow
- [ ] Subject selection — clear, fast, no friction
- [ ] Level selection for IB — SL/HL with one-line explanation of difference
- [ ] Where are you in the course — beginning / mid-programme / exam prep
- [ ] IA scope explained — one clear sentence at onboarding
- [ ] First session starts immediately after onboarding — no dead ends
- [ ] Welcome email per subject — IB and ACCA variants via Resend

### 1.5 Landing Pages & Copy
- [ ] gradd.ai homepage — IB + ACCA positioning, Lanterna comparison, pricing
- [ ] IB Economics landing page
- [ ] IB Business Management landing page
- [ ] IB Bundle landing page
- [ ] ACCA landing page
- [ ] Pricing page — all products, monthly and annual, bundle clear
- [ ] Social proof section — placeholder ready for first testimonials
- [ ] FAQ — IA scope, SL vs HL, what's covered, cancellation
- [ ] 7-day money back guarantee — visible on pricing page and checkout

### 1.6 Trust & Conversion
- [ ] Trustpilot profile created and linked
- [ ] Testimonial capture — post-session prompt after lesson 3
- [ ] Money back guarantee copy written and displayed
- [ ] Free first lesson communicated clearly on homepage

### 1.7 QA & Launch Readiness
- [ ] End-to-end test — IB Economics SL full onboarding to lesson complete
- [ ] End-to-end test — IB Economics HL
- [ ] End-to-end test — IB Business Management
- [ ] End-to-end test — ACCA
- [ ] Stripe test mode — all products
- [ ] Stripe live mode confirmed
- [ ] IA boundary stress test — ask tutor about IA, confirm clean handling
- [ ] Wrong answer stress test — 10 hard IB questions, check accuracy
- [ ] Signal stress test — confirm all Supabase writes fire correctly

---

## PHASE 2 — WHAT MAKES IT THE BEST
*Iterate into these using real student feedback post-launch*

### 2.1 Tutor Intelligence Upgrades
- [ ] Tutor references previous session weak areas at session start
- [ ] Tutor adjusts difficulty dynamically based on student performance
- [ ] Tutor explicitly frames every answer around mark scheme language
- [ ] Tutor proactively offers exam-style questions at end of every lesson
- [ ] HL tutor uses Paper 3 data response framing throughout
- [ ] Tutor gives structured essay frameworks per command term unprompted

### 2.2 Student Experience
- [ ] Past paper question integration — exam-style questions mapped to lesson just completed
- [ ] Timed exam practice mode — real paper conditions, IB criteria marking
- [ ] Predicted grade indicator — based on progress, pace, weak areas
- [ ] Curriculum completion percentage visible at all times
- [ ] Streak and consistency tracking — sessions per week, study momentum
- [ ] Pre-session brief — tutor reminds student where they left off and what's next

### 2.3 Parent Dashboard
- [ ] Separate parent login
- [ ] Child's progress visible — lessons, units, weak areas
- [ ] Session summaries readable by parent
- [ ] Predicted grade visible
- [ ] Last active date and study frequency
- [ ] Weekly email digest — progress summary to parent

### 2.4 ACCA Expansion
- [ ] F5–F9 curriculum maps and SQL (PM, TX, FR, AA, FM)
- [ ] Strategic Professional papers (SBL, SBR, options)
- [ ] Quarterly exam countdown visible in UI
- [ ] ACCA progress tracked per paper not per lesson
- [ ] Pass/fail prediction per paper based on practice performance

---

## PHASE 3 — THE MOAT
*Year 2 features that make Gradd impossible to replicate quickly*

### 3.1 Examiner Intelligence
- [ ] Responses framed around what IB examiners actually reward
- [ ] Mark scheme language embedded in every evaluative response
- [ ] Common examiner traps flagged proactively per topic
- [ ] Model answer library — tutor can show what a 7-scoring answer looks like

### 3.2 Institutional
- [ ] School licence model — per student pricing for IB World Schools
- [ ] Teacher dashboard — class progress, weak areas by cohort
- [ ] School onboarding flow — bulk student import
- [ ] Lanterna school contract competitor — position against substitute teaching product

### 3.3 Subject Expansion
- [ ] IB Mathematics AA and AI
- [ ] IB Biology, Chemistry, Physics
- [ ] IB History, Geography
- [ ] ACCA full qualification coverage
- [ ] A-Level core subjects
- [ ] Each new subject follows same pattern — curriculum map first

---

## BUILD PRIORITY ORDER

1. IB Economics curriculum map
2. IB Business Management curriculum map
3. IB tutor system prompt (both subjects)
4. Lesson seed SQL — both subjects
5. Platform extension code
6. ACCA curriculum map + prompt + SQL
7. Onboarding flow + free lesson gate + progress dashboard
8. Landing pages + pricing copy
9. QA end to end
10. Launch + community push

---

## COMPETITIVE POSITIONING

| Competitor | What They Do | Price | Our Advantage |
|------------|-------------|-------|---------------|
| Lanterna | Human tutors, 1:1 sessions | £720/10hrs | 24/7, full curriculum, fraction of cost |
| RevisionDojo | Practice questions, AI assistant | $17–19/month | We teach from scratch — they assume knowledge |
| TutorChase | Human tutors marketplace | $40–140/hr | No scheduling, no hourly rate, always on |
| OpenTuition | Free notes and lectures | Free | Structured delivery, AI interaction, progress tracking |
| Kaplan/BPP | Classroom and online courses | £400–900/paper | AI-powered, always available, fraction of cost |

---

## REALISTIC MRR TARGETS

| Milestone | When |
|-----------|------|
| €5,500 MRR | December 2026 |
| €10,000 MRR | February/March 2027 |
| €25,000 MRR | May 2027 (IB exam panic cycle) |
| €40,000 MRR | September 2027 (full second year cycle) |

---

## INFRASTRUCTURE NOTES

- Platform: Next.js 16 App Router, same codebase as LC product
- Database: Supabase — same instance, subject column differentiates content
- Payments: Stripe — same account, new Price IDs for IB and ACCA
- Hosting: Vercel — same project, gradd.ai added as additional domain
- AI: Anthropic API — same key, new system prompt per subject
- Auth: @supabase/ssr only — never use deprecated auth-helpers
- Model: claude-haiku-4-5-20251001 default, claude-sonnet-4-6 for complex tasks
- IA (Internal Assessment): OUT OF SCOPE for V1 — tutor acknowledges, does not deliver

---

*This document is the single source of truth for Gradd product decisions.
Reference it at the start of every build session.
Measure every decision against the north star.*