# Gradd — Product Feature Model & Capability Matrix

**What this is.** A complete feature inventory of a Gradd exam-tutoring product, reverse-engineered from `GRADD_BUILD_HARDENING.md` (124 issues across the LC and IB builds), cross-checked against the IB Master Product Backlog and the known stack. Every issue we ever fixed was a feature we were shipping — read end-to-end, the issue log *is* the anatomy of the product.

**What it's for.** Two jobs. (1) **Parity** — see at a glance where one product lags another, so gaps get backlogged in the right project. (2) **ACCA acceleration** — show exactly what ACCA inherits free from the shared codebase versus what genuinely has to be built, so product #3 ships fast and complete.

**Honest limitation.** This is derived from features that *left a trail* — things that broke, plus known backlog items. Features that shipped cleanly are under-represented. Treat this as a strong skeleton to verify against the codebase, not a definitive spec. Cells marked **Verify** are inferences.

**Companion to** `GRADD_BUILD_HARDENING.md`: that doc tells you how not to break things; this one tells you what to build.

---

## How to read the matrix

**LC / IB columns** — current state of the shipped products:

| Label | Meaning |
|---|---|
| Live | Shipped and working |
| Partial | Built but incomplete or not fully wired |
| Backlog | Planned, not built |
| Inherited | Provided by the shared platform — no separate build for this product |
| Verify | Inferred from the issue log — confirm in the codebase |
| — | Not applicable to this product |

**ACCA column** — recommendation, since ACCA isn't built yet:

| Label | Meaning |
|---|---|
| Inherited | Comes free from the shared codebase — do nothing |
| Build – launch | Must be built before ACCA can launch |
| Build – later | Real value, but post-launch |
| Skip | Deliberately leave out — justified in notes |
| Decide | A genuine product decision to make, not a default |

---

## Layer 1 — Platform & Infrastructure

The shared spine. One codebase, one Supabase, one Stripe account. **ACCA inherits almost all of this for free** — this is the bulk of "a product" that costs ACCA nothing.

| Capability | LC | IB | ACCA | Notes |
|---|---|---|---|---|
| Auth & signup flow | Live | Live | Inherited | Email/password via `@supabase/ssr`; signup → checkout → onboarding chain |
| Email confirmation | Live | Live | Inherited | Keep ON; signup flow must expect the null-session-after-`signUp()` behaviour (Hardening rules 8, 11) |
| Subscription-gated routing | Live | Live | Inherited | "Authenticated" ≠ "subscribed" — routing checks `subscription_status` |
| RLS security model | Live | Live | Inherited | Per-table policies; service-role client for all route writes |
| Stripe checkout & billing | Live | Live | Build – launch | ACCA needs its own `price_…` objects (€49.99/mo, €399/yr) |
| Subscription tiers | Live | Live | Build – launch | ACCA: monthly + annual at minimum; multi-paper bundle = a pricing decision |
| Free trial vs money-back guarantee | Verify | Live (7-day) | **Decide** | LC and IB differ — pick ACCA's model deliberately, don't default |
| Webhook handler (subscription lifecycle) | Live | Live | Inherited | One endpoint per domain; metadata fallback for event-ordering |
| Per-domain webhook endpoint + secret | — | Live | Inherited | ACCA sits on gradd.ai — reuses the IB endpoint/secret |
| Transactional email (Resend) | Live | Live | Inherited | |
| DNS / email deliverability | Live (gradd.ie) | Live (gradd.ai) | Inherited | ACCA on gradd.ai — inherits IB's verified domain |
| Rate limiting | Live | Inherited | Inherited | Supabase `rate_limits` table + `increment_rate_limit`, 50 msg/hr/user |
| Deployment pipeline | Live | Live | Inherited | Vercel auto-deploy on `main`, preview deploys on branches |
| Domain routing | Live | Live | Inherited | Runtime host detection; ACCA = gradd.ai routes |

---

## Layer 2 — Tutoring Engine

The AI tutor mechanics. The *engine* is shared; the *content that runs on it* is per-product. ACCA inherits the engine and builds its own persona, prompt and marking rubric.

| Capability | LC | IB | ACCA | Notes |
|---|---|---|---|---|
| AI tutor persona | Live (Aoife) | Live (Mia) | **Decide** | Reuse Mia for gradd.ai consistency, or give ACCA its own professional persona |
| System prompt architecture | Live | Live | Build – launch | Same architecture; ACCA-specific prompt content |
| Static/dynamic prompt split + caching | Live | Inherited | Inherited | ~90% token-cost reduction — keep static block cacheable |
| Live context anchor | Live | Live | Inherited (mechanism) / Build (content) | Carries mandatory per-session behaviour, uncached, read last |
| Four machine signals | Live | Live | Inherited | `LESSON_COMPLETE`, `UNIT_COMPLETE`, `SESSION_SUMMARY`, `WEAK_AREA_FLAG` |
| Signal parsing → DB writes | Live | Live | Inherited | Parsed after every streamed response, not at session end |
| Lesson progression (DB-authoritative) | Live | Live | Inherited | `next_lesson_code` from `lessons` table — model never owns sequence |
| Session persistence | Live | Live | Inherited | `message_history`, `raw_final_response` carried across turns |
| Progress tracking (`student_progress`) | Live | Live | Inherited (schema) / Build (seed) | Scoped by `student_id` + `subject` |
| Weak-area tracking (`weak_areas`) | Live | Live | Inherited | |
| Marking / feedback engine | Live (SRP, long-Q) | Live (AO levels, command terms) | Build – launch | ACCA marking differs — objective-test + constructed-response, not IB essays |
| Model selection | Live | Inherited | Inherited | Env var; Haiku default, Sonnet for vision/complex |
| Spaced-repetition recall block | Live | Partial (tracking only) | Build – later | **Parity gap — see below** |
| Off-topic recovery | Live | Live | Inherited | Prior-turn tail injected as a positive "continue from here" anchor |

---

## Layer 3 — Curriculum & Content

The genuine per-product work. **This is where ACCA's real build effort sits** — four papers' worth of curriculum.

| Capability | LC | IB | ACCA | Notes |
|---|---|---|---|---|
| Curriculum map (lessons seeded) | Live | Econ Live / BM Verify | Build – launch | ACCA F1–F4 = up to four curriculum seeds |
| Unit/lesson code conventions | Live | Live | Build – launch | Subject-prefixed mandatory — e.g. `ACCA_F1_UNIT_1` |
| Level differentiation | Live (Higher/Ordinary) | Live (SL/HL) | Skip | F1–F4 are discrete papers — no level split; the `subject` field handles them |
| Paper / exam-structure alignment | Verify | Live (P1/P2/P3) | Build – launch | ACCA CBE structure per paper |
| Syllabus-outcome / command-term mapping | Verify | Live | Build – launch | Map ACCA learning outcomes per lesson |
| Diagram library | Backlog (gap) | Live (61 SVG) | Build – later | **Parity gap — see below**; lighter need for ACCA (F2 charts) |
| Coursework / IA scoping | — | Live (IA out of scope) | Decide | ACCA F-papers are exam-only — likely a clean, simple boundary |

---

## Layer 4 — Student-Facing Experience

The UI students touch. Mostly shared shell + per-product content.

| Capability | LC | IB | ACCA | Notes |
|---|---|---|---|---|
| Chat interface | Live | Live | Inherited | |
| Markdown message renderer | Live | Live | Inherited | Handles headers, bold, rules, lists, section headers |
| Dashboard (progress, counters) | Live | Live | Inherited | Build subject-aware labels for ACCA |
| Subject-aware UI (tutor name, branding) | Live | Live | Inherited | Never hardcode tutor/logo — derive from `profile.subject` |
| Onboarding flow | Live | Live | Build – launch | ACCA needs paper selection (F1–F4) |
| Photo/image upload (handwritten answers → vision) | Backlog (gap) | Live | Build – later | **Parity gap — see below** |
| Diagram rendering (`DiagramRenderer`) | Backlog (gap) | Live | Build – later | Pairs with the diagram library |
| Mobile-responsive layout | Live | Live | Inherited | Tested at 390px |
| Trial / subscription-status banner | Verify | Live | Inherited | |
| Parent/student dashboard view | Partial (basic toggle) | Backlog (full parent login) | Skip | **Parity gap — see below**; ACCA students are adult professionals, no parent buyer |
| Legal pages (terms/privacy/cookies) | Live | Live | Build – launch | Per-product review; drive dates from one constant |
| Course-position personalization | — | Partial (captured, not injected) | Build – later | IB captures `just_starting`/`mid`/`exam_prep` at onboarding but doesn't use it |

---

## Layer 5 — Growth, Retention & Marketing

Conversion and retention machinery. Mostly backlog across both products today — biggest *future* opportunity, and several items matter more for ACCA than for IB.

| Capability | LC | IB | ACCA | Notes |
|---|---|---|---|---|
| Landing page | Live | Live | Build – launch | |
| Competitor framing | Live | Live (vs Lanterna, TutorChase) | Build – launch | ACCA framing: vs Kaplan, BPP, OpenTuition |
| Pricing page | Live | Live | Build – launch | |
| Welcome email | Live | Live | Build – launch | ACCA-specific template — don't reuse IB/LC header art |
| Stripe customer portal (self-service billing) | Verify | Partial (link misrouted) | Build – launch | **Fix once on the shared codebase — all products inherit it** |
| Day-1 activation email | Verify | Backlog | Build – later | Hour-4 nudge if no lesson started |
| Cancellation save flow | Verify | Backlog | Build – later | Intercept cancel with summary + pause option |
| Referral mechanism | Verify | Backlog | Build – later | Strong for tight communities |
| Past-paper question library | Verify | Backlog | Build – later | **High value for ACCA** — exam-prep audience |
| Mock exam mode | Verify | Backlog | Build – later | **High value for ACCA** — drives the Dec conversion spike |
| Study streak / gamification | Verify | Backlog | Skip / Optional | Strong for 16–18 IB students; weaker fit for adult ACCA professionals — keep light or skip |

---

## Parity gaps — the cross-product findings

The point of the matrix. Six gaps worth a decision:

1. **Diagrams + image upload — LC is behind IB.** IB shipped 61 IB-standard SVG diagrams, a `DiagramRenderer`, and photo-upload-to-vision (students photograph handwritten work). LC Business has none of it — yet LC genuinely uses diagrams (break-even, market structures, supply/demand) and LC students hand-write exam answers worth photographing. **→ Backlog "diagram library + photo upload" in the LC project.** Best-evidenced gap on the board.

2. **Spaced repetition — IB is behind LC.** LC runs a spaced-repetition recall block at session start. IB only *tracks* `weak_areas` — there's no active drill. **→ Already in the IB backlog; this confirms its priority.**

3. **Parent visibility — both partial, different shapes.** LC has a basic parent/student toggle on one dashboard; IB wants a full separate parent login. **→ Decide one approach** before building IB's, so LC can converge on it rather than diverge.

4. **Course-position personalization — IB-only and unfinished.** IB captures `course_position` at onboarding but never injects it, so Mia opens identically for every student. Quick win. **→ Finish it in IB.**

5. **Trial model is inconsistent.** LC leans on a money-back guarantee; IB uses a 7-day trial. Not a bug — but **make ACCA's model a deliberate choice**, and consider whether LC and IB should align.

6. **Stripe customer portal.** IB's "manage subscription" link misroutes to `/dashboard` instead of Stripe's hosted portal. **Fix once on the shared codebase and every product — LC, IB, ACCA — inherits self-service billing.** Cheapest high-leverage fix here.

---

## ACCA build blueprint

What product #3 actually costs. The headline: **ACCA inherits roughly 60% of a finished product for free.**

**Inherited — do nothing (all of Layer 1, most of Layer 2 & 4).** Auth, billing engine, webhooks, RLS, email infra, rate limiting, caching, deployment, the tutoring engine, signals, dashboard shell, chat UI, mobile layout. This is the compounding return on one shared codebase.

**Build for launch — the real work (~8 items):**
1. ACCA curriculum maps — F1–F4 lessons seeded (the largest single effort)
2. ACCA tutor persona decision + system prompt
3. ACCA marking engine — objective-test + constructed-response style (not IB essay marking)
4. Onboarding flow with paper selection
5. Stripe price objects + product config (€49.99/mo, €399/yr)
6. Landing + pricing + legal pages
7. ACCA welcome email template
8. Competitor framing — vs Kaplan / BPP / OpenTuition

**Build later — post-launch, in priority order:** past-paper library and mock exam mode first (both high-value for an exam-prep audience and the December conversion spike), then diagram library, photo upload, spaced-repetition drill, day-1 activation, cancellation save flow.

**Skip — and why:**
- **Parent dashboard** — ACCA students are adult professionals; there's no parent buyer.
- **Level differentiation (SL/HL-style)** — F1–F4 are discrete papers; the `subject` model already covers them.
- **Heavy gamification/streaks** — built for the 16–18 cohort; weaker fit for adult professionals. Keep light or skip.

---

*Derived 16/05/2026 from `GRADD_BUILD_HARDENING.md`, the IB Master Product Backlog, and the known stack. A living document — update status cells as products ship features, and re-verify any **Verify** cell against the codebase before relying on it. Keep one copy in each Claude project alongside the hardening doc.*
