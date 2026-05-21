# Gradd — Master Product Backlog & 5-Year Roadmap
*Last updated: 19 May 2026 | Version 3.3*

> **v3.3 changelog** — build sessions of 17–19 May 2026. Everything shipped to production
> unless noted. Changes tagged `[v3.3]` inline. Summary:
>
> **Shipped to main (17–19 May 2026):**
> - IB preview system (`?site=ib` cookie override on non-production deployments)
> - Middleware/proxy build fix (Next.js 16 rejects `middleware.ts` + `proxy.ts` coexisting — consolidated into `proxy.ts`, which is the correct name for Next.js 16)
> - IB dashboard re-skin — full 5-stage rebuild into separate `IBDashboardClient` component, scoped under `.ib-dash`
> - `totalSessions` dashboard stat fix — count query now returns real lifetime total, not capped at 5
> - Session sub-heading fix — "Session N completed" → "Session N" (session_number counts started, not completed sessions)
> - IB landing page logo fix — text logo replaced with real `/gradd-ai-logo.png` in nav, hero card, and footer
> - IB session screen re-skin — full staged rebuild, scoped in-place under `.ib-session` (NOT a separate component — ChatInterface.tsx is 708-line live tutoring engine; a copy would be a permanent maintenance hazard)
> - Session-end screen: "Continue learning →" CTA added alongside "Back to dashboard"; uses `window.location.href` for hard nav (Next.js Link to current route is a no-op)
>
> **Architecture decisions locked:**
> - Dashboard re-skin = separate `IBDashboardClient` (display-only, cheap to copy, LC isolation clean)
> - Session re-skin = scoped CSS in-place (live tutoring engine, too expensive/risky to copy)
> - `proxy.ts` confirmed as the correct middleware filename for Next.js 16; `proxy.ts` was always real middleware, not dead code; auth guards confirmed live via page-level `redirect()` in Server Components
>
> **New items captured:** `/demo` route fully scoped (see Cleanup Tasks); LC unused font load; LC test account gap
>
> **Bugs found and added:** session-end CTA same-route no-op; LC session loads unused Fraunces/Geist fonts

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

**7-day money-back guarantee on all products. No free trials. Card charged in full at signup.**

> `[v3.2]` **Trial model — RESOLVED AND SHIPPED.** The IB checkout previously ran a real
> 7-day Stripe trial (`trial_period_days: 7`) — contradicting this locked policy. As of
> 16 May 2026 the trial is removed: IB charges in full at signup, 7-day money-back
> guarantee, identical to LC. The signup-flow copy was also corrected — it had still
> promised a "free trial" and a "free lesson" after the backend change. Both backend
> and copy are now aligned and live. There is NO free trial and NO free lesson anywhere
> in the product.

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

- [x] `[v3.2]` **SESSION HISTORY BUG** — FIXED. Tutor now opens with the prior SESSION_SUMMARY. Confirmed in-app.
- [x] `[v3.2]` **COURSE_POSITION NOT INJECTED** — FIXED. Session routes use the stored onboarding value; `deriveCoursePosition` is null-fallback only.
- [ ] **UPGRADE PATH MISSING** — Single subject to bundle hits "User already registered" error. Fix: Stripe subscription upgrade → Supabase subject update. Interim: handle manually. Priority: **HIGH — pre-launch**.
- [x] `[v3.1]` **IB DASHBOARD LESSON COUNT** — FIXED. `lib/lesson-counts.ts` is the single source of truth.
- [x] `[v3.1]` **IB WEEKLY EMAIL LC-BRANDED** — FIXED. IB weekly template (Mia, 2027 exam date) in place.
- [x] `[v3.2]` **IB SIGNUP COPY CONTRADICTS BILLING** — FIXED. All signup copy now charge-at-signup + money-back model.
- [x] `[v3.3]` **DASHBOARD SESSIONS CAPPED AT 5** — FIXED. Count query now returns true lifetime total. Session sub-heading fixed ("Session N" not "Session N completed").
- [x] `[v3.3]` **IB LANDING LOGO TEXT NOT IMAGE** — FIXED. Real `/gradd-ai-logo.png` in nav, hero card, footer.
- [x] `[v3.3]` **SESSION-END CTA SAME-ROUTE NO-OP** — FIXED. "Continue learning →" uses `window.location.href` for hard nav; Next.js Link to current route was a no-op.
- [ ] **IB TUTOR TONE** — Remove: "let me push you slightly deeper", "let me challenge you on that", "I want to probe this further." Ask the harder question directly. Priority: MEDIUM.
- [ ] **`/session` unauth redirect wrong path** — `app/session/page.tsx` ~L19 redirects unauthenticated users to `/login` but the route is `/auth/login`. Logged-out user hits `/session` → probably 404s. Pre-existing, small. Priority: LOW.
- [ ] **LC session loads unused fonts** — The IB re-skin added a Fraunces/Geist `@import` inside the shared `<style>` block in `ChatInterface.tsx`. LC sessions now fetch those fonts even though no LC element uses them. Zero visual impact, pointless network request. Fix: gate the `@import` to IB only (inside the `.ib-session` CSS block or conditional render). Priority: LOW — tidy-up.

---

## `[v3.3]` IB APP RE-SKIN — COMPLETE (17–19 May 2026)

The full IB logged-in app has been re-skinned to the new design system (Fraunces / Geist / Geist Mono, oklch cream/forest/rust palette). Three surfaces, all shipped to main:

### IB Dashboard (`IBDashboardClient.tsx`)
- Separate component from LC's `DashboardClient.tsx` — complete isolation, LC unaffected.
- Scoped under `.ib-dash`.
- Built in 5 stages: component isolation → shell/nav/toggle → hero/session cards → all data cards → footer fix.
- Both My view and Parent view re-skinned. View toggle working. All wired elements intact (Stripe portal, sign-out, subject switcher, Start session link).

### IB Session Screen (`ChatInterface.tsx` — scoped in-place)
- NOT a separate component — `ChatInterface.tsx` is 708 lines of live tutoring engine (streaming reader, AbortController, isSubmittingRef lock, diagram upload, base64 conversion). Copying it would create two copies of the most critical component in the app to maintain forever.
- Scoped under `.ib-session` on the root wrapper. LC session is byte-identical — proven by code audit, not assumption.
- Built in 3 stages: shell + message stream + bubbles → input bar + camera → panels (LessonCompletePanel, reference-diagram, session-end).
- `MessageRenderer.tsx` (shared with LC) — 4 inline colour values replaced with CSS variables with fallbacks. All fallbacks resolve to exact old LC values — verified line by line. LC output provably unchanged.
- `--brand-light` (LC green #2d6648) purged from all IB code paths. Checkmark circles now use `--forest` bg with `--gold` stroke.
- Session-end screen: "Back to dashboard" + new "Continue learning →" CTA. Hard nav (`window.location.href`) because Next.js Link to the current route (`/session`) is a no-op.
- Fraunces italic confirmed as the chosen display font for tutor emphasis, key terms, and section headings.

### Key Architecture Fact (proxy.ts)
`proxy.ts` is confirmed as the correct Next.js 16 middleware filename. Auth guards live in page-level Server Components (`redirect()` before any HTML renders) — `proxy.ts` was always redundant for auth, but `middleware.ts` coexisting with `proxy.ts` breaks the Next.js 16 build. Single middleware file = `proxy.ts`, always.

---

## `[v3.2]` IB LANDING PAGE — REBUILT (16 May 2026)

The IB landing page (`components/landing/IBLandingPage.tsx`) was rebuilt from the prototype + vetted copy deck. Shipped to main. Key points:

- New design system: Fraunces / Geist / Geist Mono, oklch palette, scoped under `.ib-lp`.
- Real logo asset (`/gradd-ai-logo.png`) now used in nav, hero card, and footer. `[v3.3]`
- Trust bar: 346 lessons / 61 diagrams / real figures. Fabricated stats removed.
- Pricing: Monthly/Annual toggle, two real cards (€44.99/€349 single, €74.99/€579 bundle).
- "See it in action" CTAs point to `/demo` (updated from `#pricing` temp fix once `/demo` is built — see Cleanup Tasks). `[v3.3]`
- Mobile: trust bar overflow on narrow screens — responsive fix still needed (see Cleanup Tasks). `[v3.3]`
- Landing hero chat-card shows old session UI — needs refreshing against re-skinned session screen (see Cleanup Tasks). `[v3.3]`

---

## `[v3.2]` IB DATA & INFRASTRUCTURE GAPS

- [ ] **Per-subject level fields are NULL.** `profiles.ib_economics_level` and `ib_business_level` are never populated by onboarding. **BLOCKER FOR BUNDLE LAUNCH.** Priority: HIGH.
- [ ] **Verify gradd.ai as a Resend sending domain.** IB email currently sends from gradd.ie. **TRIGGER: before first paying IB customer.** Priority: MEDIUM.
- [x] `[v3.2]` **IB Stripe trial removed** — done.

---

## FULL BUILD PRIORITY ORDER — EVERYTHING IN SEQUENCE

### PRIORITY 1 — CRITICAL BUGS (Do first, before any new build)

1. [x] `[v3.2]` Session history — FIXED
2. [x] `[v3.2]` course_position injection — FIXED
3. [ ] Fix upgrade path — single to bundle — **still open, pre-launch**
4. [ ] Fix `/session` unauth redirect — `/login` → `/auth/login` — LOW, pre-launch

---

### PRIORITY 2 — CURRICULUM & CONTENT (Foundation of everything)

5. [ ] IB Economics full curriculum map — all topics, SL/HL split, paper alignment, AO levels
6. [ ] IB Economics lesson seed SQL
7. [ ] IB Business Management full curriculum map
8. [ ] IB Business Management lesson seed SQL
9. [ ] ACCA BT (F1) through FM (F9) curriculum maps
10. [ ] All ACCA lesson seed SQL
11. [ ] Examiner report key themes extracted per ACCA paper
12. [ ] Pass rate context per paper documented

---

### PRIORITY 3 — TUTOR SYSTEM PROMPTS (The product)

13. [ ] IB command terms embedded — all command terms produce structurally different responses
14. [ ] HL vs SL logic — HL gets more depth, harder questions, higher expectations
15. [ ] Paper awareness per topic — P1/P2/P3 framing in every explanation
16. [ ] IA boundary handling — acknowledged, out of scope, clean
17. [ ] Weak area detection — tutor names it directly when student struggles three times
18. [ ] All IB signals correct — LESSON_COMPLETE, UNIT_COMPLETE, WEAK_AREA_FLAG, SESSION_SUMMARY
19. [ ] Tone fixed — no hedging phrases, no "let me push you deeper"
20. [x] `[v3.2]` Course position adaptive — FIXED
21. [ ] ACCA tutor persona — career-driven, quarterly exam awareness
22. [ ] ACCA pass rate intelligence, examiner trap warnings, all ACCA signals

---

### PRIORITY 3.5 — EXAM-PREP MODE (THE MOAT — pre-launch HIGH) `[v3.3+]`

> **The single biggest differentiator vs Lanterna, TutorChase, RevisionDojo.** Exam-prep students are the highest-converting, highest-urgency, highest-willingness-to-pay segment. Lanterna charges £720 for 10 hours of human tutoring partly because exam-prep parents pay anything to lift a grade with the exam 8 weeks away. If Mia delivers genuine exam-prep behaviour — past papers, mark schemes, command-term drilling, examiner-trap warnings — Gradd undercuts at 95% with unlimited usage. **Without these layers, exam-prep mode is "Mia who sounds like she knows it's exam time." With them, Gradd genuinely prepares students to score 7.**

#### Layer 0 — Session opening behaves differently per course_position
- [x] `[v3.3]` **DONE — verified on production 21 May 2026.** SESSION OPENING + liveContextAnchor branch on `course_position` so exam-prep students get paper/marks/command-term framing and pivot to an exam-style question instead of foundational teach-from-zero. Verified in fresh sessions for both subjects:
  - **IB Business** (`testbusiness@gradd.ai`, `IB_BM_001`): commit `61825c9` on main, branch `fix/course-position-opening`
  - **IB Economics** (`testbundle@gradd.ai`, `IB_ECON_001`): commit `cb93b9b` on main, branch `fix/course-position-opening-econ`
  - Discovered during fix: stored prompt in `sessions.raw_final_response` is set at session start, so prompt changes only take effect on FRESH session creation — pre-existing sessions keep their old prompt. Test protocol must close all open sessions in Supabase before testing prompt changes.
  - Discovered during fix: `{{COURSE_POSITION}}` substituting mid-sentence produces grammatically broken text ("Behaviour depends on exam-prep:") that orphans the branches. Wording must place the variable as a label, not as the verb's object.
  - Existing instruction "never ask where they left off" had to be tightened — "do NOT ask the student where they left off, what they covered, what they remember, or to confirm any part of the previous session. The summary is the truth."

#### Layer 1 — Past-paper question library (FOUNDATIONAL — everything else depends on this)
- [ ] Real IBO past papers indexed by syllabus topic + paper + command term
- [ ] Source: IBO past papers (May 2018+ for first-assessment-2022 Economics syllabus; equivalent for IB Business Management)
- [ ] Supabase schema: `past_questions` table — `id, subject, paper (P1/P2/P3), session (May2024 etc), question_number, marks, command_term, topic_code, question_text, mark_scheme_id`
- [ ] Coverage target pre-launch: 3 most recent May sessions per subject per level → ~150 questions per subject minimum
- [ ] Mia pulls relevant past questions when drilling exam-prep students, matched by `topic_code + command_term`
- [ ] Legal: past papers behind IBO copyright — need licensed access OR public domain coverage; resolve before scraping

#### Layer 2 — IBO mark scheme integration
- [ ] Depends on Layer 1
- [ ] Mark scheme text indexed alongside past questions (`mark_schemes` table referenced by `question_id`, or inline JSON on `past_questions`)
- [ ] Mia marks student answer against the IBO mark scheme — mark-by-mark, naming what was hit and what was missed
- [ ] Output format: `awarded / available`, list of mark-scheme points the student hit, list missed, specific quoted phrase from mark scheme of what they would have needed to write to score the missed marks
- [ ] **This is the layer that justifies €44.99 and the planned €59.99 raise.** No competitor does this for IB at scale.

#### Layer 3 — Command-term fluency *(promoted from PRIORITY 3 item 13)*
- [ ] Can ship in parallel with Layer 1
- [ ] All IB command terms produce structurally different responses: `define / state / outline / describe / distinguish / explain / examine / discuss / evaluate / to what extent / using examples`
- [ ] Each command term documented with: marks-band guidance (2-mark vs 4-mark vs 10-mark expectations), required structure, expected depth, banned shapes (e.g. don't write a 10-mark essay for a "define" question)
- [ ] Mia warns when the student's answer structure doesn't match the command term ("you're evaluating, but the question asked you to define — for 2 marks you need one sentence per characteristic, no evaluation")
- [ ] Embed in tutor system prompt, not just in pulled context — must be reflexive behaviour for every answer Mia gives back

#### Layer 4 — Examiner traps + trigger phrases per topic
- [ ] Depends on Layer 1 (so traps can be attached to topic_code)
- [ ] Per syllabus topic: list of common student mistakes flagged in IBO Subject Reports
- [ ] Mia surfaces these proactively: "watch out — most students confuse [X] with [Y] here. IBO Subject Report for May 2023 flagged it specifically as 'candidates frequently...'"
- [ ] Source: IBO Subject Reports (publicly published per session)
- [ ] Schema: `examiner_traps` table — `topic_code, trap_description, common_wrong_phrase, correct_framing, source_subject_report_reference`

#### Sequencing + pre-launch minimum
- **Layer 0** ships this week (course_position session-opening fix in test now)
- **Layer 1** must come before Layers 2/4 (they reference `past_questions`)
- **Layer 3** is independent — can ship in parallel with Layer 1
- **Layer 2** depends on Layer 1
- **Layer 4** lowest priority of the four; ships after Layer 1

**For September 2026 full launch viability: Layers 0, 1, 3 are non-negotiable.** Layer 2 is the killer differentiator that justifies the price. Layer 4 is the strongest demo / sample-session material for marketing.

#### Backlog consolidation (now superseded — single source of truth lives here)
- PRIORITY 3 item 13 (IB command terms embedded) → see **Layer 3** above
- Phase 2.2 (Mark scheme language / Common examiner trap flags / Essay structure frameworks per command term) → consolidated into **Layers 2/3/4** above
- Phase 2.3 (Past-paper question library — real IBO past papers indexed by topic) → see **Layer 1** above; **promoted from Phase 2 to pre-launch**
- Phase 2.3 (Mock exam mode) → remains Phase 2; depends on Layer 1 completion

---

### PRIORITY 4 — SESSION TRANSCRIPT STORAGE (Launch critical)

23. [ ] `session_messages` table in Supabase — id, session_id, role, content, timestamp
24. [ ] Insert every message to `session_messages` in real time
25. [ ] Generate readable transcript at session end
26. [ ] Store transcript in `sessions` table
27. [ ] Session history page in dashboard
28. [ ] Individual session transcript view
29. [ ] Download transcript as PDF

---

### PRIORITY 5 — PLATFORM EXTENSION CODE

30. [ ] Subject selector at onboarding — all products
31. [ ] Level selector for IB — SL or HL
32. [ ] Course position selector — Just Starting / Mid-Programme / Exam Prep
33. [ ] Routing logic — correct prompt + curriculum per subject, level, position
34. [ ] IB Stripe price IDs — 4 products created and wired in
35. [ ] ACCA Stripe price IDs created and wired in
36. [ ] Stripe webhook handles all new price IDs
37. [ ] Domain-aware middleware — gradd.ai serves IB/ACCA, gradd.ie serves LC
38. [ ] Student progress dashboard — curriculum map, lessons complete, % complete
39. [ ] Weak area panel — surfaces WEAK_AREA_FLAG visibly
40. [ ] Session summary visible to student after every session
41. [ ] Mobile — fully tested, clean, responsive

---

### PRIORITY 6 — ONBOARDING FLOW

42. [ ] Step 1–5 onboarding — subject, level, course position, IA scope, first session
43. [ ] All selections stored to Supabase — **including `ib_economics_level` / `ib_business_level` — currently never written (BUNDLE BLOCKER)**
44. [ ] Welcome email — subject-specific via Resend (IB, ACCA, LC variants)

---

### PRIORITY 7 — LANDING PAGES & COPY

45. [x] `[v3.2]` IB landing page — rebuilt — DONE
46. [x] `[v3.3]` IB landing logo — real PNG in all 3 locations — DONE
47. [ ] ACCA landing page
48. [ ] `[v3.3]` "See it in action" CTAs — update from `#pricing` to `/demo` once built
49. [ ] `[v3.3]` Landing hero chat-card — refresh to re-skinned session UI (after re-skin done — now ready)
50. [ ] `[v3.3]` Landing page mobile pass — trust bar overflow + check all sections on narrow screen
51. [ ] Footer legal pages for ACCA

---

### PRIORITY 8 — TRUST & CONVERSION

52. [ ] Trustpilot account created and verified
53. [ ] Trustpilot link in footer and pricing page
54. [ ] Testimonial capture — automated email after lesson 5
55. [ ] Money-back guarantee policy written
56. [ ] Referral mechanism — refer a friend, both get one month free (Phase 2)

---

### PRIORITY 9 — QA & LAUNCH READINESS

57. [ ] IB Economics SL — 10 random topic questions checked
58. [ ] IB Economics HL — 10 HL extension questions checked
59. [ ] IB Business Management SL/HL — same
60. [ ] ACCA BT, MA, FA, LW — 5 exam-style questions per paper
61. [ ] ACCA PM, FR, AA, FM — 5 exam-style questions per paper
62. [ ] IA boundary test — 5 IA questions, all handled cleanly
63. [ ] SL/HL boundary test — HL-only questions as SL student, correct handling
64. [ ] Diagram upload test — hand-drawn AD-AS diagram, Mia evaluates correctly
65. [ ] Stripe checkout end-to-end — test card, subscription created, access granted
66. [ ] Stripe webhook — subscription cancel, downgrade, payment failure all handled
67. [ ] Mobile end-to-end — iOS and Android
68. [ ] Upgrade flow — single to bundle — end to end
69. [ ] `[v3.3]` Verify course_position — start a session as an exam-prep student early in the lesson sequence, confirm Mia opens in exam-prep mode not beginner mode (merged but never live-verified)

---

### PRIORITY 10 — BETA & LAUNCH

70. [ ] Recruit 10–15 beta students — 5 IB, 5 ACCA, 5 LC — free access for honest feedback
71. [ ] Weekly check-in with beta students — 3 weeks minimum
72. [ ] After 3 weeks: ask for public review on Trustpilot and community post
73. [ ] Soft launch posts — r/IBO, r/ACCA, IB Facebook parent groups
74. [ ] Full launch September 2026 — coordinated community post across all channels
75. [ ] Demo video — screen recording, real IB session, no voiceover fluff
76. [ ] ACCA demo video

---

## CLEANUP TASKS — small, each its own branch

- [ ] `[v3.2]` **Decommission dead trial code.** Remove `trial-reminders` cron from `vercel.json`, delete `app/api/cron/trial-reminders/route.ts` and `lib/email/ib-trial-reminder-template.ts`, drop `trial_ends_at` column. Also fixes the fragile module-load Resend init that causes local build noise.

- [ ] `[v3.3]` **Build the real `/demo` route.** Full spec locked — see below. Build after the app re-skin (now done). The "See it in action" CTAs point to `#pricing` until this is live.

- [ ] `[v3.2]` **Set up a full Stripe TEST environment.** Test-mode prices for all IB products, test-mode webhook endpoint, Preview-scoped Stripe env vars in Vercel.

- [ ] `[v3.3]` **Landing page mobile pass.** Trust bar overflows on narrow screens (confirmed via screenshot). Check every landing section on mobile — fix all overflows.

- [ ] `[v3.3]` **Refresh the landing hero chat-card.** The hero mockup shows the old session UI. Now the session re-skin is done, update the mockup to match. Candidate for combining with the `/demo` build.

- [ ] `[v3.3]` **Delete dead `proxy.ts` auth code.** `proxy.ts` contains Supabase auth-guard logic that has always been dead (auth guards live in page-level Server Components). The preview-cookie block IS active and correct. The auth-guard block is dead code. Tidy it — low priority, no functional impact.

- [ ] `[v3.3]` **Gate Fraunces/Geist `@import` to IB only.** The `@import` in `ChatInterface.tsx` loads IB fonts for all sessions including LC. LC never uses them — pointless network request. Fix: move the `@import` inside the `.ib-session` conditional block.

- [ ] `[v3.3]` **Create a persistent LC test account.** No LC test account exists. Needed to regression-check shared components (`ChatInterface.tsx`, `MessageRenderer.tsx`) after any change. Every shared-component edit has this blind spot until it's fixed.

- [ ] `[v3.3]` **Fix `/session` unauth redirect.** `app/session/page.tsx` ~L19 redirects unauthenticated users to `/login` — the real route is `/auth/login`. Logged-out user hits `/session` → probably 404s. One-line fix.

- [ ] **Stripe Customer Portal route.** Trial reminder email's "manage subscription" link points to `/dashboard` not the Stripe portal. Update + create portal redirect route in `app/api/billing/portal/route.ts`.

- [ ] `[v3.3]` **Diagram label collisions — final polish pass.** 11 diagrams across IB Economics and IB Business Management have residual label/axis/marker collisions after two fix rounds on `fix/ib-session-css` (commits `e3cd1fd` Round 1, `a8d87ff` Round 2 Pt 1). Audit page (`/admin/diagrams`) is the QA surface — diagrams render in real `.ib-session` scope so the audit reflects production accurately. Final pass needs visual iteration (screenshot → fix → screenshot loop) rather than coordinate guessing. ~30–45min effort.

  **Remaining issues (verified on `/admin/diagrams` preview, Round 2 Pt 1 deploy):**

  IB Economics:
  - `MARKET_EQUILIBRIUM` — "E (P*, Q*)" still colliding
  - `PED_ELASTIC_INELASTIC` — "D (elastic)" still on curve
  - `NEG_EXT_PRODUCTION` — "Qm" tick collision
  - `NEG_EXT_CONSUMPTION` — "WL" still inside crosshatched triangle
  - `AS_KEYNESIAN` — "Full employment" annotation + "Real GDP" axis title
  - `EXCHANGE_RATE_FIXED` — "Quantity of Currency" axis title + "Market rate" annotation
  - `EXCHANGE_RATE_MANAGED` — "CB intervenes at boundaries" annotation

  IB Business Management (all DEFERRED from Round 2 — need restructure, not coordinate nudge):
  - `BM_DECISION_TREE` — "Option A", "Option B" overlapping lines/nodes
  - `BM_POSITION_MAP` — title + sub-caption + four axis labels crammed together; needs structural rebuild with title in its own padded row
  - `BM_FORCE_FIELD` — "PROPOSED CHANGE" title + "Net driving force: +2 →" annotation collision
  - `BM_SCATTER_REGRESSION` — three educational annotations stacked + axis title + "Extrapolation" inline label all in same band; needs footer block restructure

  **Approach for next attempt:** open audit page in browser tab, screenshot one diagram at a time, identify collision visually, make minimal coordinate edit, refresh preview, verify, move on. Do NOT use helper-level offsets (Round 1 approach caused side-effects). Do NOT batch — one diagram per edit-verify cycle.

---

## `[v3.3]` `/demo` ROUTE — FULL BUILD SPEC

**Purpose:** Read-only, no-auth product preview. "See it in action" CTAs on the landing page link here. Flow: dashboard (My view) → scripted session with Mia → signup CTA.

**Part 1 — Demo dashboard (`app/demo/page.tsx`):**
- Fully public, no auth.
- Renders using the `.ib-dash` design system (IBDashboardClient visual) with hardcoded fake data:
  - Student: "Alex" · IB Economics · SL · Session 7
  - Progress: 34% · 49 of 147 lessons · Streak: 4 days
  - Days to exam: 312 · Sessions this week: 2 · Weak areas: 1 (Elasticity)
  - Last session: "Elasticity of Demand" — 2 weak flags
  - Next session: "Demand — shifts and determinants"
- My view default. View toggle works (switches to Parent view showing full stat grid).
- "Start session →" CTA pulses (CSS animation). Links to `/demo/session`.

**Part 2 — Demo session (`app/demo/session/page.tsx`):**
- Scripted, fully static. No Anthropic API calls, no Supabase, no auth.
- Renders using the `.ib-session` design system.
- Topic: IB Economics — Demand (downward-sloping curve + demand shift). Appears on every paper, universally relatable, has a clean IB-standard diagram.
- Diagrams: `getDiagram('DEMAND_CURVE')` and `getDiagram('DEMAND_SHIFT')` — real diagram library, not mockups.
- Messages render with typing animation (300ms delay, loading dots before reveal) to simulate streaming.
- No "End session" button — the flow ends naturally at the signup CTA.
- Signup CTA panel at the end:
  - Heading: "This is what every lesson looks like."
  - Sub: "Full IB Economics and IB Business Management curriculum. From zero to exam-ready."
  - Primary: "Start learning with Mia →" → `/auth/signup/ib`
  - Secondary: "See pricing" → `/#pricing`
  - Trust line: "€44.99/month · 7-day money-back guarantee · Cancel anytime"

**Part 3 — Landing CTAs:**
- Update the 3 "See it in action" CTAs in `IBLandingPage.tsx` from `#pricing` to `/demo`.

**Rules:**
- `/demo` and `/demo/session` fully public — no auth middleware, no subscription check.
- Zero Supabase, zero API calls, zero Stripe.
- Use the real `.ib-session` and `.ib-dash` CSS — reuse, don't recreate.
- Use the real `DiagramRenderer` — `getDiagram('DEMAND_SHIFT')`.
- Mobile responsive — this is the first thing many prospective students see on their phone.

---

## `[v3.2]` LC PROJECT — flag for the LC repo (NOT this project)

- [ ] **LC advertises a "7-day free trial" it does not have.** `app/page.tsx` LC metadata (L12/30/38) and `components/landing/LandingPage.tsx` FAQ (~L94). Fix in the LC project.

---

## PHASE 2 — WHAT MAKES IT THE BEST
*Target: September 2026 – March 2027*

### 2.1 Voice Features (Zero extra cost — browser APIs only)

- [ ] Text-to-speech on tutor responses — Web Speech API, play button per message, free
- [ ] Voice mic input for student answers — SpeechRecognition API, transcript in text box before submit
- [ ] Speed control slider — 0.8x to 1.5x
- [ ] Language setting respected

### 2.2 Tutor Intelligence Upgrades

- [ ] Examiner report integration — last 3 sessions per paper in tutor context
- [ ] Mark scheme language — every evaluative response uses mark scheme vocabulary
- [ ] Common examiner trap flags per topic
- [ ] Essay structure frameworks per command term
- [ ] Spaced repetition — weak areas reintroduced at increasing intervals until mastered
- [ ] Session opening brief — covered last session, weak area, today's topic, paper alignment
- [ ] Cross-topic synthesis (Econ ↔ BM) — link subjects for bundle students. NOT BUILT.

### 2.3 Student Experience

- [ ] Past-paper question library — real IBO past papers indexed by topic. NOT BUILT.
- [ ] Mock exam mode — timed full-paper conditions, predicted mark, exact feedback. NOT BUILT.
- [ ] Predicted grade indicator — running 1–7 estimate, updated after every session. NOT BUILT.
- [ ] Revision planner — student-visible planner/schedule. NOT BUILT (backend auto-schedules, no UI).
- [ ] Free-roam / drill mode — exam-prep student asks anything off-sequence. NOT BUILT. Strong conversion lever.
- [ ] Student- or parent-set exam date — personalises the countdown and pace calculations. Near-term, low effort.
- [ ] In-app diagram drawing — draw directly in app, not just photo-upload. NOT BUILT.
- [ ] Streak tracking and gamification — daily streak, milestone badges
- [ ] Topic mastery map — full curriculum, colour-coded by mastery
- [ ] Session transcript — download as PDF, email to student after session
- [ ] IB Paper 3 data response practice — HL Economics with inline data sets
- [ ] Day-1 activation gate — Resend email at hour 4 post-signup if no lesson started

### 2.4 Parent Dashboard

> Audit-confirmed NOT BUILT. Today there is only a "Parent view" toggle inside the student's own login. A separate parent account/role does not exist.

- [ ] Separate parent account — linked to student at onboarding or via invite
- [ ] Parent view: lessons/sessions this week, curriculum %, weak areas, session transcripts, predicted grade
- [ ] Weekly email digest to parent — cron exists and sends Monday, IB-correct template
- [ ] Parent dashboard is the single biggest conversion tool for the parent buyer

### 2.5 Referral Programme

- [ ] Student referral — refer a friend, both get one month free
- [ ] Referral tracking in Supabase
- [ ] Referral visible in dashboard

### 2.6 ACCA Expansion

- [ ] Strategic Professional — SBL, SBR, AFM, APM, ATX, AAA curriculum maps + SQL
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

- [ ] Model answer library — top-scoring annotated answers per topic
- [ ] Failing answer examples — exactly why they fail
- [ ] Grade descriptors embedded — tutor knows what a Grade 7 answer looks like vs Grade 5
- [ ] ACCA marker mentality — feedback framed as "a marker would give you 6/10 here because..."

### 3.2 Institutional

- [ ] School licence — per-student annual pricing for IB World Schools
- [ ] Teacher account — class management, student progress by cohort, at-risk students
- [ ] Bulk student import — CSV
- [ ] School billing — annual invoice
- [ ] ACCA employer licence — accounting firms for trainee cohorts

> The IB landing FAQ describes school plans as "in development / register interest" — not a current offer. Keep that until built.

### 3.3 Sciences and Humanities

- [ ] IB Biology, Chemistry, Physics SL/HL
- [ ] IB History, Geography, Psychology SL/HL
- [ ] Subject bundle pricing — all IB subjects, one monthly price

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

## MARKETING STRATEGY — IN ORDER

### Pre-Launch (May–August 2026)
- [ ] r/IBO, r/ACCA — join, observe 2 weeks, contribute value before mentioning Gradd
- [ ] IB Facebook groups — 5 largest parent and student groups
- [ ] ACCA Facebook/LinkedIn communities
- [ ] IB Discord servers
- [ ] Answer questions genuinely 4–6 weeks before mentioning Gradd
- [ ] Demo video ready — 2 minutes, screen recording, real session, no fluff
- [ ] Screenshots ready — diagram upload, progress dashboard, session transcript, weak area detection

### Soft Launch (July–August 2026)
- [ ] Beta programme — 10–15 students, honest feedback, public reviews after 3 weeks
- [ ] Soft launch posts across all communities

### Full Launch (September 2026)
- [ ] Coordinated post September 1st — r/IBO, r/ACCA, IB Facebook, LinkedIn, Irish networks
- [ ] SEO blog — one post per week minimum, specific search terms

### SEO Content (Start September 2026)
- [ ] "Why 60% of ACCA PM students fail and what to do about it"
- [ ] "IB Economics Paper 1 vs Paper 2 — what the examiner actually wants"
- [ ] "HL vs SL IB Economics — which should you choose?"
- [ ] "The IB Economics diagrams you must know for Paper 2"
- [ ] "How to answer evaluate questions in IB Business Management"
- [ ] "ACCA FR pass rate 51% — what the examiner keeps penalising"
- [ ] One post per week minimum, every post targets a specific search term

### Ongoing
- [ ] Weekly community presence
- [ ] After every exam session — "How did it go?" email to subscribers
- [ ] Capture results as testimonials, case studies, community posts
- [ ] Paid ads Phase 2 only — after organic is working

---

## COMPETITIVE POSITIONING

| Competitor | Their Claim | The Truth | Our Line |
|------------|------------|-----------|---------|
| Lanterna | Expert human tutors | £720 for 10 hours. Scheduling required. | "The entire IB year costs less than one Lanterna session package." |
| RevisionDojo | AI for IB | Revision tool. Assumes prior knowledge. | "They revise. We teach." |
| Acowtancy | Premium ACCA prep | $338 per paper. Videos. | "They show you videos. We teach you until you know it." |
| OpenTuition | Free ACCA resources | Free notes, AI that tells you to verify its own answers elsewhere. | "Free gets you the notes. Gradd gets you the pass." |
| Kaplan/BPP | ACCA approved courses | £400–900 per paper. Passive. Pre-recorded. | "Built for 2010. We're built for now." |
| TutorChase | Human tutors | $40–140/hr. Scheduling. No curriculum. | "24/7. No scheduling. Full curriculum. One price." |

---

## INFRASTRUCTURE — NON-NEGOTIABLE RULES

- Platform: Next.js 16 App Router
- Auth: `@supabase/ssr` with `createBrowserClient`/`createServerClient` — NEVER `@supabase/auth-helpers-nextjs`
- Database: Supabase — same instance, subject column differentiates all content
- Payments: Stripe — price IDs only (never product IDs)
- Hosting: Vercel — same project, gradd.ai and gradd.ie both point to same deployment
- AI default: `claude-haiku-4-5-20251001`
- AI complex tasks: `claude-sonnet-4-6` — diagram evaluation, feedback, predicted grades
- Prompt caching: day one on all system prompts
- **Middleware: `proxy.ts` — NEVER `middleware.ts`. Next.js 16 requires this name. `middleware.ts` + `proxy.ts` coexisting breaks the build.**
- `cookies()`: always await, always async
- `getUser()`: always — never `getSession()`
- API routes: excluded from middleware matcher
- Supabase writes: UPDATE not INSERT when row exists
- Components: CSS variable system — no Tailwind
- `[v3.1]` Per-subject lesson totals: use `lib/lesson-counts.ts` — never hardcode
- `[v3.3]` **IB design system:** Fraunces / Geist / Geist Mono, oklch palette. Three scoped classes:
  - `.ib-lp` — IB landing page
  - `.ib-dash` — IB dashboard (separate `IBDashboardClient` component)
  - `.ib-session` — IB session screen (scoped in-place, not a separate component)
  - LC components (`DashboardClient`, `ChatInterface` LC paths) byte-identical to pre-re-skin
- `[v3.3]` **Session-end navigation:** use `window.location.href = '/session'` for hard nav — Next.js Link to the current route is a no-op
- `[v3.2]` Billing: IB and LC both charge in full at signup, 7-day money-back guarantee. NO free trials. `trial_period_days` not used.
- `[v3.2]` course_position: stored onboarding value used in prompt; `deriveCoursePosition` is null-fallback only
- `[v3.3]` Auth guards: live in page-level Server Components (`redirect()` before HTML renders). `proxy.ts` auth-guard block is dead code — guards were always in the pages.
- IA: OUT OF SCOPE V1 — tutor acknowledges cleanly
- Voice features: Web Speech API only — never paid TTS API
- Session messages: stored to Supabase in real time

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

*Last updated: 19 May 2026 | Version 3.3*
