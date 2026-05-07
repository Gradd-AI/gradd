# Gradd — Domain Routing Separation Specification
# Version: 1.0 | Created: May 2026
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

### Screen 5 — Free lesson starts
No payment required for lesson 1.
Session starts immediately.
After lesson 1 completes → Stripe checkout triggered.

### On completion of onboarding
Supabase writes:
- `profiles.subject` set to selected subject
- `profiles.exam_level` set to SL or HL
- `student_progress` row created with correct defaults
- `sessions` row created for session 1

Resend welcome email triggered.

---

## FREE LESSON GATE

- Lesson 1 is always free — no card required
- On `LESSON_COMPLETE` signal for lesson 1 → paywall modal shown
- Student must complete Stripe checkout before lesson 2 starts
- If payment fails or is abandoned → student stays at lesson 1
- If payment succeeds → `profiles.subscription_status` set to `active`, lesson 2 starts
- 7-day money back guarantee shown on paywall modal

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
- Triggered on: gradd.ai signup completion
- Tone: International, no Irish references
- Confirms: subject selected, level (SL/HL), what Gradd covers
- Mentions: IA is out of scope
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

### Step 2 — IB Onboarding flow (R4)
**Files:** `app/(ib)/onboarding/page.tsx`, `app/api/onboarding/ib/route.ts`
**What:** Subject selection → level selection → course position → IA boundary → free lesson starts. Creates Supabase rows automatically.
**Depends on:** R1 (middleware)
**Claude Code instruction:** "Build the IB onboarding flow at app/(ib)/onboarding. Four screens: subject selection (Economics/BM/Bundle), level selection (SL/HL), course position (beginning/mid/exam-prep), IA boundary acknowledgement. On completion, create the profiles and student_progress rows in Supabase with correct defaults. Match the existing design system exactly — warm beige palette, Georgia font, CSS variables, no Tailwind."

### Step 3 — Dashboard subject-awareness (R6)
**Files:** Dashboard components that hardcode Aoife/LC Business
**What:** Replace all hardcoded tutor names and subject labels with database-driven values.
**Depends on:** Nothing (can be done independently)
**Claude Code instruction:** "Find every place in the dashboard and session UI that hardcodes 'Aoife', 'LC Business', or 'Ordinary Level'/'Higher Level' as static text. Replace each with a value derived from profiles.subject and profiles.exam_level. IB Economics → 'IB Economics', SL → 'Standard Level', HL → 'Higher Level', tutor name for IB subjects → 'Mia'."

### Step 4 — Free lesson gate (R7)
**Files:** Session completion handler, new paywall component
**What:** After LESSON_COMPLETE signal on lesson 1, show Stripe checkout. Continue only on payment success.
**Depends on:** R5 (Stripe price IDs must exist)
**Claude Code instruction:** "Build the free lesson gate. After the first lesson completes (LESSON_COMPLETE signal on lesson_order=1), intercept the session end and show a payment modal. The modal shows the subject, price, and 7-day money back guarantee. On Stripe checkout success, set profiles.subscription_status to active and allow the next session to start. On failure or abandonment, return student to lesson 1."

### Step 5 — gradd.ai homepage (R2)
**File:** `app/(ib)/page.tsx` or domain-aware root page
**What:** IB/ACCA landing page with Lanterna comparison, subject cards, pricing, CTA.
**Depends on:** R1 (middleware to serve it correctly)
**Note:** Claude Code may already be building this — review output before re-instructing.

### Step 6 — Stripe price IDs (R5)
**Who:** Grant creates manually in Stripe dashboard
**What:** Create 6 products with the prices in the table above. Copy the price_... IDs into .env.local and Vercel environment variables using the env variable names in the table above.
**Claude Code then:** Wire the price IDs into the checkout flow using the env variable names.

### Step 7 — IB subject landing pages (R9)
**Files:** `app/(ib)/economics/page.tsx`, `app/(ib)/business-management/page.tsx`, `app/(ib)/bundle/page.tsx`
**What:** Subject-specific pages with syllabus overview, paper structure, pricing, CTA.
**Depends on:** R1 (middleware), R2 (homepage design pattern)

### Step 8 — Welcome email IB template (R8)
**Who:** Grant creates template in Resend dashboard
**Claude Code then:** Wire the trigger into the onboarding completion handler — send IB welcome email on successful gradd.ai signup.

---

## QA CHECKLIST — BEFORE ANY IB STUDENT PAYS

Run these manually before promoting to production:

- [ ] gradd.ai shows IB homepage, not LC Business homepage
- [ ] gradd.ie shows LC Business homepage unchanged
- [ ] IB onboarding completes and creates correct Supabase rows automatically
- [ ] SL student gets SL session — no HL extension content appears
- [ ] HL student gets HL session — HL extension content appears throughout
- [ ] Dashboard shows correct subject and level for IB student
- [ ] Dashboard shows Mia, not Aoife, for IB student
- [ ] Free lesson completes — paywall shown — payment accepted — lesson 2 starts
- [ ] Free lesson completes — payment abandoned — student stays at lesson 1
- [ ] IA boundary: ask Mia about IA — she explains once and moves on
- [ ] LESSON_COMPLETE signal fires and advances lesson in Supabase
- [ ] WEAK_AREA_FLAG signal fires and writes to weak_areas table
- [ ] SESSION_SUMMARY signal fires and updates student_progress
- [ ] LC Business student on gradd.ie unaffected — Aoife still works
- [ ] Stripe test mode: all 6 IB price IDs work in test checkout
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
*Last updated: May 2026*
