# Gradd — Domain Routing Separation Specification
# Version: 1.1 | Updated: May 2026
# Status: Active — reference this before any routing, onboarding, or UI build

---

## ARCHITECTURE DECISION (LOCKED)

One Next.js app. One Vercel deployment. One Supabase instance. One Stripe account.

Two domains served from the same codebase via hostname detection:
- `gradd.ie` — LC Business product, Irish students, Aoife tutor
- `gradd.ai` — IB and ACCA products, international students, Mia tutor

This never changes. There will never be two separate apps or two separate deployments.
Every new subject (ACCA, A-Level, etc.) follows the same pattern — new prompt file, new lessons in DB, new routing branch. Nothing else.

---

## HOW HOSTNAME DETECTION WORKS

Next.js middleware runs on every incoming request before any page loads.
It reads the `host` header and routes accordingly.

```
Request arrives at Vercel
        ↓
middleware.ts reads hostname
        ↓
gradd.ie → LC Business routes → Aoife prompt → Irish onboarding
gradd.ai → IB/ACCA routes  → Mia prompt   → International onboarding
localhost → reads NEXT_PUBLIC_DOMAIN env variable for dev
```

The middleware file is at `middleware.ts` (note: in Next.js 16 this must be named correctly — check existing proxy.ts setup before touching).

Hostname is also stored in a cookie or passed as a header so downstream components can read it without re-detecting on every render.

---

## DOMAIN ROUTING MAP

### gradd.ie routes (LC Business)
| Path | Page | Notes |
|------|------|-------|
| / | LC Business homepage | Existing — preserve unchanged |
| /signup | LC signup | Existing flow |
| /login | LC login | Existing flow |
| /onboarding | LC onboarding | Existing — no subject selector needed |
| /dashboard | LC dashboard | Shows Aoife, LC Business, Higher/Ordinary |
| /session | LC tutor session | Aoife, LC Business prompt |

### gradd.ai routes (IB + ACCA)
| Path | Page | Notes |
|------|------|-------|
| / | IB/ACCA homepage | New — international positioning |
| /economics | IB Economics landing | Subject-specific page |
| /business-management | IB BM landing | Subject-specific page |
| /bundle | IB Bundle landing | Bundle offer page |
| /signup | IB signup | New flow — subject + level selection |
| /login | IB login | Same auth, different redirect |
| /onboarding | IB onboarding | New — subject selector, SL/HL, course position |
| /dashboard | IB dashboard | Shows Mia, correct subject, SL/HL badge |
| /session | IB tutor session | Mia, correct subject prompt |

---

## SUBJECT AND LEVEL DATA MODEL

Every student has exactly one subject and one level stored in Supabase.

### profiles table
```
subject          TEXT   — 'LC_BUSINESS' | 'IB_ECONOMICS' | 'IB_BUSINESS' | 'ACCA'
exam_level       TEXT   — 'higher' | 'ordinary' (LC) | 'SL' | 'HL' (IB)
```

### student_progress table
```
current_lesson_code    TEXT   — e.g. 'IB_ECON_001' or '1.1.1'
current_unit_code      TEXT   — e.g. 'UNIT_1'
current_unit_name      TEXT   — e.g. 'Introduction to Economics'
current_lesson_name    TEXT   — e.g. 'Economics as a Social Science'
course_position        TEXT   — 'beginning' | 'mid-programme' | 'exam-prep'
```

### Default values for new IB Economics student
```
subject                = 'IB_ECONOMICS'
exam_level             = 'SL' or 'HL' (set at onboarding)
current_lesson_code    = 'IB_ECON_001'
current_unit_code      = 'UNIT_1'
current_unit_name      = 'Introduction to Economics'
current_lesson_name    = 'Economics as a Social Science'
course_position        = 'beginning'
session_number         = 0
total_session_count    = 0
```

### Default values for new IB Business Management student
```
subject                = 'IB_BUSINESS'
exam_level             = 'SL' or 'HL' (set at onboarding)
current_lesson_code    = 'IB_BM_001'
current_unit_code      = 'UNIT_1'
current_unit_name      = 'Introduction to Business Management'
current_lesson_name    = 'What is a Business?'
course_position        = 'beginning'
session_number         = 0
total_session_count    = 0
```

---

## TUTOR ROUTING LOGIC

The API routes (`session/start`, `session/message`, `session/message/proxy`) branch on `profile.subject`:

```typescript
if (subject === 'IB_ECONOMICS') {
  // buildIBEconomicsPrompt() — prompts/ib_economics_tutor_system_prompt_v1_0.md
} else if (subject === 'IB_BUSINESS') {
  // buildIBBusinessPrompt() — prompts/ib_business_tutor_system_prompt_v1_0.md
} else if (subject === 'ACCA') {
  // buildACCAPrompt() — prompts/acca_tutor_system_prompt_v1_0.md
} else {
  // buildInjectedSystemPrompt() — prompts/lc_business_tutor_system_prompt_v1_4.md
}
```

Every new subject adds one branch and one prompt file. Nothing else changes in the API.

---

## PROMPT FILES

All prompt files live in `/prompts/` at the project root.

| File | Subject | Status |
|------|---------|--------|
| lc_business_tutor_system_prompt_v1_4.md | LC Business | Live |
| ib_economics_tutor_system_prompt_v1_0.md | IB Economics | Live |
| ib_business_tutor_system_prompt_v1_0.md | IB Business Management | To build |
| acca_tutor_system_prompt_v1_0.md | ACCA F1–F4 | To build |

Prompt variables use `{{DOUBLE_BRACE}}` format matching the existing LC Business pattern.
All IB and ACCA prompts use the same 15 variables as the IB Economics prompt.
LC Business prompt uses its own variable set (SPACED_REP_DUE, ABQ_DRILL_DUE etc) — do not merge.

---

## ONBOARDING FLOW — IB STUDENTS (gradd.ai)

### Screen 1 — Subject selection
Three options displayed as cards:
- IB Economics — €44.99/month
- IB Business Management — €44.99/month
- IB Bundle (both subjects) — €74.99/month

Annual options shown below each card.

### Screen 2 — Level selection
Two options:
- Standard Level (SL) — "The standard IB Economics/BM course"
- Higher Level (HL) — "Extended content and an additional paper"

One sentence only. No jargon.

### Screen 3 — Course position
Three options:
- Just starting — "I haven't studied this subject yet"
- Mid-programme — "I'm part way through my IB course"
- Exam preparation — "My exams are coming up soon"

### Screen 4 — IA boundary (IB only)
One sentence displayed as an info box, not a warning:
"The Internal Assessment is handled by your school teacher — Gradd covers the full written examination curriculum: Papers 1, 2, and 3."
Single "Got it" button.

### Screen 5 — Trial starts
No charge for 7 days. Card collected via Stripe checkout before this screen.
Session starts immediately after onboarding completes.
No paywall mid-session. No interruption between lessons.

### On completion of onboarding
Supabase writes:
- `profiles.subject` set to selected subject
- `profiles.exam_level` set to SL or HL
- `profiles.subscription_status` set to `trialing`
- `student_progress` row created with correct defaults
- `sessions` row created for session 1

Resend welcome email triggered.

---

## TRIAL MODEL (LOCKED)

No free lesson gate. No paywall after lesson 1. Stripe trial handles access control entirely.

- Stripe subscription created at signup with `trial_period_days: 7`
- Card collected upfront at signup — no charge for 7 days
- Student has full access from lesson 1 immediately after payment screen
- Trial ends after 7 days — Stripe charges automatically
- Cancel before day 7 → no charge, access revoked
- 7-day money back guarantee shown as reassurance on pricing page and checkout
- Free lesson gate code is NOT built — do not implement it

**Flow:**
Signup → Subject + Level selected → Stripe checkout (7-day trial) → Onboarding screens → Lesson 1 starts immediately

**Why trial not free lesson:**
- Parents are the primary buyer for school-age students — they will not sit through a 20-minute lesson to reach a payment screen
- One path for all users removes complexity
- Stripe trial is standard SaaS — universally understood by buyers
- Conversion is higher with card-first + trial than lesson-first + paywall

---

## STRIPE PRICE IDS

These must be created manually in the Stripe dashboard by Grant, then added to `.env.local` and Vercel environment variables.

| Product | Billing | Price | Env variable name |
|---------|---------|-------|------------------|
| IB Economics | Monthly | €44.99 | STRIPE_IB_ECON_MONTHLY |
| IB Economics | Annual | €349 | STRIPE_IB_ECON_ANNUAL |
| IB Business Management | Monthly | €44.99 | STRIPE_IB_BM_MONTHLY |
| IB Business Management | Annual | €349 | STRIPE_IB_BM_ANNUAL |
| IB Bundle | Monthly | €74.99 | STRIPE_IB_BUNDLE_MONTHLY |
| IB Bundle | Annual | €579 | STRIPE_IB_BUNDLE_ANNUAL |

The checkout flow reads the correct price ID based on `profile.subject` and billing period selected.
All IB Stripe subscriptions must include `trial_period_days: 7` in `subscription_data`.
LC Business subscriptions are unchanged — no trial period.

---

## DASHBOARD — SUBJECT-AWARE DISPLAY

The dashboard must never hardcode subject or tutor name. All display values read from the database.

| UI Element | Data source | LC value | IB value |
|------------|-------------|----------|----------|
| Tutor name | derived from subject | Aoife | Mia |
| Subject label | profiles.subject | LC Business | IB Economics / IB Business Management |
| Level label | profiles.exam_level | Higher Level / Ordinary Level | SL / HL |
| Session summary text | derived from subject | "completing a session with Aoife" | "completing a session with Mia" |
| Next session card | student_progress | LC lesson name | IB lesson name |
| Exam countdown | derived from subject + exam dates | LC exam date | IB exam date (May each year) |
| Trial banner | profiles.subscription_status | n/a | Show "X days left in your free trial" if status = trialing |

---

## UI — WHAT MUST NEVER BE HARDCODED

- Tutor name (Aoife/Mia) — always derived from subject
- Subject name — always from profiles.subject
- Level — always from profiles.exam_level
- First lesson code — always from student_progress
- Any Irish-specific language on gradd.ai pages

---

## WELCOME EMAILS (RESEND)

Two email templates required:

### LC Business welcome (existing)
- Triggered on: gradd.ie signup completion
- Tone: Irish context, LC exam aware
- Tutor: Aoife

### IB welcome (to build)
- Triggered on: gradd.ai onboarding completion
- Tone: International, no Irish references
- Confirms: subject selected, level (SL/HL), what Gradd covers
- Mentions: IA is out of scope
- Mentions: 7-day free trial — no charge until day 8
- Tutor: Mia
- Template file: to be created in Resend dashboard

---

## BUILD ORDER FOR CLAUDE CODE

Complete these in sequence. Each depends on the previous.

### Step 1 — Middleware hostname detection (R1)
**File:** `middleware.ts`
**What:** Detect hostname on every request. Set a cookie or header with domain context. Route gradd.ai to IB pages, gradd.ie to LC pages.
**Depends on:** Nothing
**Claude Code instruction:** "Add hostname detection to middleware.ts. Detect whether the request is coming from gradd.ai or gradd.ie. Store the result in a cookie called `gradd-domain` with values `ib` or `lc`. Use this in layout and page components to serve domain-appropriate content."

### Step 2 — IB Stripe checkout with 7-day trial (R5)
**Files:** `app/api/checkout/ib/route.ts`
**What:** Stripe checkout session for IB subscriptions. Must include `trial_period_days: 7` in `subscription_data`. success_url → `/onboarding?subject=X&exam_level=Y&session_id={CHECKOUT_SESSION_ID}`.
**Depends on:** Stripe IB price IDs exist in env
**Claude Code instruction:** "In app/api/checkout/ib/route.ts, ensure the Stripe checkout session includes trial_period_days: 7 in subscription_data. success_url must go to /onboarding with subject and exam_level as query params. cancel_url returns to /signup. Pass subject and exam_level through metadata and subscription_data.metadata."

### Step 3 — IB Onboarding flow (R4)
**Files:** `app/(ib)/onboarding/page.tsx`, `app/api/onboarding/ib/route.ts`
**What:** Onboarding screens after Stripe checkout. Reads subject and exam_level from query params. Writes profiles and student_progress rows. Triggers welcome email. Redirects to /session on completion.
**Depends on:** R5 (Stripe checkout), R1 (middleware)
**Claude Code instruction:** "Build the IB onboarding flow at app/(ib)/onboarding. Four screens: level selection (SL/HL), course position (beginning/mid/exam-prep), IA boundary acknowledgement, ready to start. Read subject and exam_level from URL query params passed from Stripe success_url. On completion, write profiles.subject, profiles.exam_level, profiles.subscription_status = trialing, and create student_progress row with correct defaults. Trigger Resend IB welcome email. Redirect to /session. Match existing design system — warm beige palette, Georgia font, CSS variables, no Tailwind."

### Step 4 — Dashboard subject-awareness (R6)
**Files:** Dashboard components that hardcode Aoife/LC Business
**What:** Replace all hardcoded tutor names and subject labels with database-driven values. Add trial banner for IB students in trial period.
**Depends on:** Nothing (can be done independently)
**Claude Code instruction:** "Find every place in the dashboard and session UI that hardcodes 'Aoife', 'LC Business', or 'Ordinary Level'/'Higher Level' as static text. Replace each with a value derived from profiles.subject and profiles.exam_level. IB Economics → 'IB Economics', SL → 'Standard Level', HL → 'Higher Level', tutor name for IB subjects → 'Mia'. Add a trial banner to the IB dashboard that shows 'X days left in your free trial' when profiles.subscription_status = trialing."

### Step 5 — gradd.ai homepage (R2)
**File:** `app/(ib)/page.tsx` or domain-aware root page
**What:** IB/ACCA landing page with Lanterna comparison, subject cards, pricing, CTA. All CTAs say "Start free — 7 days on us". No mention of free lesson.
**Depends on:** R1 (middleware to serve it correctly)

### Step 6 — IB subject landing pages (R9)
**Files:** `app/(ib)/economics/page.tsx`, `app/(ib)/business-management/page.tsx`, `app/(ib)/bundle/page.tsx`
**What:** Subject-specific pages with syllabus overview, paper structure, pricing, CTA.
**Depends on:** R1 (middleware), R2 (homepage design pattern)

### Step 7 — Welcome email IB template (R8)
**Who:** Grant creates template in Resend dashboard
**Claude Code then:** Wire the trigger into the onboarding completion handler — send IB welcome email on successful onboarding completion. Email must mention 7-day trial and confirm no charge until day 8.

---

## QA CHECKLIST — BEFORE ANY IB STUDENT PAYS

Run these manually before promoting to production:

- [ ] gradd.ai shows IB homepage, not LC Business homepage
- [ ] gradd.ie shows LC Business homepage unchanged
- [ ] IB signup flow: subject + level selection carries through to Stripe checkout correctly
- [ ] Stripe checkout shows 7-day trial — "your card will not be charged for 7 days"
- [ ] After Stripe checkout, user lands on /onboarding with correct subject and exam_level in URL
- [ ] IB onboarding completes and creates correct Supabase rows — profiles.subject, profiles.exam_level, profiles.subscription_status = trialing, student_progress defaults
- [ ] After onboarding, user lands directly in /session — no dead ends
- [ ] SL student gets SL session — no HL extension content appears
- [ ] HL student gets HL session — HL extension content appears throughout
- [ ] Dashboard shows correct subject and level for IB student
- [ ] Dashboard shows Mia, not Aoife, for IB student
- [ ] Dashboard shows trial banner with days remaining for trialing students
- [ ] No paywall appears mid-session or between lessons
- [ ] IA boundary: ask Mia about IA — she explains once and moves on
- [ ] LESSON_COMPLETE signal fires and advances lesson in Supabase
- [ ] WEAK_AREA_FLAG signal fires and writes to weak_areas table
- [ ] SESSION_SUMMARY signal fires and updates student_progress
- [ ] LC Business student on gradd.ie unaffected — Aoife still works, no trial shown
- [ ] Stripe test mode: all 6 IB price IDs work in test checkout with trial period visible
- [ ] Stripe live mode: confirmed before first real student

---

## WHAT GRANT DOES VS WHAT CLAUDE CODE DOES

| Task | Who |
|------|-----|
| All code changes | Claude Code |
| Stripe price ID creation | Grant (Stripe dashboard) |
| Resend email template creation | Grant (Resend dashboard) |
| Supabase manual data fixes | Grant (Supabase dashboard) |
| DNS changes | Grant (Cloudflare) |
| Vercel domain management | Grant (Vercel dashboard) |
| Adding env variables to Vercel | Grant (Vercel dashboard) |
| Testing and QA | Grant (browser) |
| Strategy and curriculum decisions | This Claude project chat |

---

*Reference this document at the start of every routing, onboarding, or UI build session.*
*Last updated: May 2026 — v1.1: Free lesson gate replaced with 7-day Stripe trial throughout*