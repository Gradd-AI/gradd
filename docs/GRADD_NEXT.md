# GRADD_NEXT.md — Sprint 5

## Status going into Sprint 5

### Completed (Sprint 4)
- ✅ Terms of Service (`/terms`)
- ✅ Privacy Policy (`/privacy`)
- ✅ Cookie Policy (`/cookies`)
- ✅ Footer links in `layout.tsx`
- ✅ `proxy.ts` fixed — `getSession()` → `getUser()` (security warning resolved)
- ✅ `middleware.ts` conflict resolved and removed
- ✅ All legal pages live on gradd.ie

### Known issues carried forward
- Turbopack FATAL panics on Windows dev environment — cosmetic, does not affect production. Workaround: `next dev --turbopack=false`
- `app/page.tsx` updated to use `getUser()` ✅

---

## Sprint 5 — Build This

Four workstreams in priority order:

---

### 1. Branding Assets

Gradd needs a proper visual identity pack. Currently no logo exists beyond the text wordmark in code.

**Deliverables:**
- Primary logo — wordmark "Gradd" with accent mark on the second 'd' or the 'a', Georgia serif, dark green `#1B3D2F`, mint accent `#7EC8A4`
- Square icon / favicon — suitable for Stripe branding upload, browser tab, app icon
- Stripe branding — upload square logo to Stripe Dashboard → Settings → Branding, set brand colour `#1B3D2F`
- Open Graph image — 1200×630px, used for social sharing previews
- Email header image — used in Resend transactional emails

**Brand constraints:**
- Colours: `#1B3D2F` (dark green primary), `#7EC8A4` (mint accent), `#FAFAF7` (off-white background)
- Typography: Georgia / Playfair Display for display, Plus Jakarta Sans for body
- Tone: serious academic tool, not a toy. Confidence without arrogance.
- Audience: Irish LC students (16–18) and their parents

---

### 2. Landing Page Rebuild

Current landing page needs a full update to reflect live product state and drive conversion.

**Required sections (in order):**
1. **Hero** — headline, subheadline, single CTA (Start Free / Subscribe). Update copy to reflect live product.
2. **How It Works** — 3-step visual: (1) Create account, (2) Choose your topic, (3) Chat with Aoife. Simple, visual, fast.
3. **Features** — update to reflect what's actually live: streaming AI chat, curriculum-mapped sessions, weak area tracking, session history, progress dashboard
4. **Subjects covered** — LC Business (live). Tease upcoming subjects.
5. **Pricing** — accurate Stripe pricing, monthly and annual, clear CTA
6. **Social proof** — beta student quotes (placeholder copy ok for now)
7. **Footer** — already updated with legal links ✅

**Files needed (paste in new chat):**
- Current `app/page.tsx` or wherever the marketing landing page lives
- Current `app/subscribe/page.tsx`
- Current Stripe pricing (monthly € and annual € amounts)

---

### 3. Subscribe Page Improvement

Current subscribe page is likely a thin Stripe redirect. Needs:
- "What's included" checklist before the CTA
- Pricing clearly displayed (not hidden until Stripe checkout)
- Reassurance copy for parents
- Link to Terms and Privacy

---

### 4. Lesson Images — SVG Diagram Library

Students and users have requested visual aids for certain lessons.

**Approach:** Static SVG diagrams for the ~15 highest-frequency visual topics in LC Business. Aoife references them by lesson code. Zero API cost.

**Priority diagram list (build these first):**
1. SWOT Analysis matrix
2. Ansoff Matrix (4-quadrant)
3. Break-even chart (costs/revenue vs output)
4. Circular flow of income
5. Org chart structures (flat, hierarchical, matrix)
6. Product Life Cycle curve
7. Boston Matrix (BCG)
8. Supply and demand curves
9. Business cycle (boom/recession/trough/recovery)
10. Porter's Five Forces
11. Maslow's Hierarchy of Needs
12. Communication process diagram
13. Chain of distribution
14. Balance sheet layout (T-account style)
15. Cash flow statement structure

**Implementation:**
- Store in `/public/diagrams/[lesson-code].svg`
- Create a lookup map `lib/diagram-map.ts` — lesson code → diagram path
- Aoife's system prompt updated to reference diagrams when lesson code matches
- Render inline in `ChatInterface.tsx` when diagram is available for current lesson

---

## Files to paste at the start of Sprint 5

To hit the ground running, paste these in the first message of the new chat:

1. `app/page.tsx` (landing page)
2. `app/subscribe/page.tsx`
3. `lib/system-prompt.ts`
4. `app/session/page.tsx`
5. Current Stripe pricing (monthly/annual)

---

## Tech stack reminder
- Next.js 16.2.4 · Supabase · Stripe · Anthropic API (claude-haiku-4-5) · Vercel · Resend
- Brand: `#1B3D2F` dark green · `#7EC8A4` mint · `#FAFAF7` off-white
- Fonts: Playfair Display (display) · Plus Jakarta Sans (body)
- Auth: Supabase SSR via `proxy.ts` (not middleware.ts)
- All prices in €, Irish law governs, GDPR compliant
