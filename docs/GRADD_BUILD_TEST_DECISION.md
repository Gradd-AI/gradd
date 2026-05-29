# Gradd — Build & Test Decision Doc
**Date:** 29/05/2026
**Purpose:** Settle the direction. What we have, what we need, and the exact build/test sequence — framed against a €500K/year target and the pricing × volume maths that gets us there.

---

## The thesis (read this first)

Marking is a commodity — every competitor does it, much of it is free. **Teaching is not.** The moat is a tutor that takes a candidate from where they are to exam-ready, with marking as the free hook, not the product. We point this engine at **ACCA professional papers** (APM first) — adults, self-funded, career-stakes, no cheap bundle anchor, unglamorous enough that the free-tool swarm isn't there. The two things that decide whether this becomes a business are **distribution** (can we acquire a customer profitably?) and **teaching quality** (does our tutor actually move grades?). Neither is proven yet. Everything below is sequenced to prove those two as cheaply as possible before scaling.

---

## The €500K maths — and the decision it forces

This is the load-bearing section. The honest finding: **the pricing model matters more than the user count.** The per-paper one-and-done pricing we discussed yesterday (€59–79/sitting) does *not* reach €500K at sane volume. A subscription does.

**Target:** €500K annual revenue (~€440K net at ~88% gross margin).

| Model | Price | Avg revenue/user/yr (ARPU) | Users needed for €500K |
|---|---|---|---|
| A — Cheap one-and-done | €69/sitting | ~€100 | **~5,000/yr** |
| B — Premium per-paper | €129/sitting | ~€180 | ~2,780/yr |
| C — Subscription (mid) | €49/month | ~€300 (5-mo cycle) | **~1,670/yr** (≈850 concurrent active) |
| D — Subscription (premium) | €69/month | ~€345 | ~1,450/yr (≈600 concurrent active) |

**What this tells us, plainly:**

- €500K on cheap one-and-done marking needs **5,000 users** — that contradicts the "you only need ~1,000" thesis and competes on the commodity layer. Wrong path.
- €500K on a **subscription justified by teaching** needs only **~600–850 concurrent active subscribers**, fed by ~1,500–2,500 students flowing through per year across multiple papers. Achievable against an ACCA pool of 500,000+.
- **The teaching layer is not just a moat — it is the thing that makes €500K arithmetically possible.** Teaching justifies recurring monthly payment (you pay because you're being taught continuously). Marking-only forces cheap one-and-done, which forces 5,000 users. So "teach well" and "reach €500K" are the same problem.

**Pricing decision (revised from yesterday):** lead toward a **monthly subscription (~€49–69/mo)** positioned as "your AI tutor for [paper] — taught to pass, marked free," **not** per-paper one-and-done. Per-sitting one-off can remain as a secondary option for crammers, but the subscription is the €500K engine.

**Timeline honesty:** €500K is a **Year 2–3** target. Year 1 is foundation — realistic ~€17–28K net, and its job is to prove distribution and gather pass-rate data, not to pay the mortgage. Quit-the-job money (~€95–150K net, ~300–500 active subs) is the Year 1→2 milestone. €500K follows only if (a) distribution works, (b) teaching demonstrably moves grades, (c) 2–3 papers are live.

---

## What we HAVE (assets — real, banked)

**Engine & infrastructure**
- Full marking engine: 4 scheme types (content_checklist, hybrid, band_descriptor, criteria_marked), generator, verifier, 31 meta-tests, admin review UI.
- Production stack proven: Next.js, Supabase (EU/GDPR), Stripe, Vercel, Resend, Anthropic API.
- Live product (LC Business, gradd.ie) — proof the full stack ships and runs.
- Mia tutor persona + signal-based progress tracking (LESSON_COMPLETE, WEAK_AREA_FLAG, etc.).
- 61 IB-standard SVG diagrams + vision-based student photo upload.

**Content**
- IB Economics: 99 mark schemes generated & verified; 40 (band_descriptor) live; 59 reviewed.
- IB Business Management: Layer 1 framework merged.
- Curriculum architecture conventions documented.

**Proven capability**
- Can build a full subject pipeline in ~2–3 weeks.
- Grant can quality-check any exam with a published marking schema (domain knowledge is *not* the constraint — the schema is the knowledge).

---

## What we NEED (gaps — ordered by what unblocks revenue)

**Tier 0 — finish/fix before anything new**
1. **Fix the hybrid generator.** IB review found a ~75% defect rate on calculation schemes — 5 patterns: missing-step, wrong formula, flawed source questions, inverted interpretation, marks-mismatch. Fix at the generator/prompt level, regenerate all 31 hybrids, re-review. (Defect map already documented.)
2. **Decide IB's role honestly.** IB is a *proof asset to us* that the pipeline works — it is **not** customer-facing proof to an ACCA buyer (different exam). Question to settle: finish IB BM, or freeze IB and pivot now? Default: do the *minimum* on IB to call it a clean demo, then pivot.

**Tier 1 — the actual moat (currently unbuilt/unaudited)**
3. **Teaching audit.** This is the biggest gap and the real moat. We have no evidence Mia *teaches* well — only that she can mark. Build `TEACHING_PRINCIPLES.md` (evidence-anchored, Rule 22 style) against the cognitive-science canon: **retrieval practice, spacing, interleaving, worked-example fading, feedback-driven metacognition** (Carpenter et al. / Nature Reviews Psychology 2022 as the anchor). Then audit real Mia transcripts against it and fix gaps in the system prompt. Most competitors rely on re-reading (notes/flashcards) — the weak strategy the science warns against. "We teach with the methods proven to move grades, not re-reading" is a true, citable claim *once audited*.

**Tier 2 — the ACCA product**
4. **Build APM first** (Grant's financial-performance background allows quality-check; lowest pass rate of the papers he can QA). Pipeline: curriculum map → seed questions → mark schemes → tutor prompt → review → promote. ~2–3 weeks on existing rails.
5. **Free marking tier** as the top-of-funnel hook (cheap to run, expected by the market, gets users in the door).
6. **Subscription billing** (~€49–69/mo) wired in Stripe for the ACCA product.

**Tier 3 — prove the business (gates scaling)**
7. **Distribution / CAC test** — THE unknown, never tested. Before building paper 2: a pre-launch landing page for APM posted in ACCA failer communities (r/ACCA, OpenTuition). Measure interest/sign-up. Target: can a customer be acquired for under ~€40?
8. **Outcome data** — run a real cohort through one sitting, measure completer pass rate. This unlocks the effort-gated free-resit guarantee and every confident marketing claim. No pass-guarantee until this exists; launch on a 14-day refund.

---

## The build/test sequence (decisive, with gates)

> Each gate is a stop/go. Don't pass a gate on hope — pass it on a number.

**Phase 1 — Bank the engine (1–2 weeks)**
- Fix hybrid generator → regenerate all 31 hybrids → re-review.
- Minimum-finish IB Econ to a clean demo state. Freeze IB BM unless trivial.
- **Gate:** marking engine produces clean hybrids at <10% reject rate.

**Phase 2 — Prove demand BEFORE building APM (1 evening, ~€0)**
- Landing page: "AI tutor for ACCA APM — taught to pass, marking free. Notify me." Post in r/ACCA + OpenTuition.
- **Gate:** if <5 genuinely interested in a week → the free-commodity gravity reached ACCA; stop and rethink. If 30+ → build with confidence.

**Phase 3 — Build the teaching standard + APM (3–4 weeks)**
- Write `TEACHING_PRINCIPLES.md`; audit Mia transcripts; fix prompt gaps.
- Build APM pipeline on the engine. Wire free marking tier + subscription billing.
- **Gate:** Mia passes the teaching audit; APM marking passes verification + Grant review.

**Phase 4 — First paying cohort (one sitting, measurement not revenue)**
- Acquire first 10–30 APM users via the proven channel. Price subscription.
- **Gate:** CAC under ~€40 AND students complete the programme. Measure pass rate at sitting.

**Phase 5 — Scale only if Phase 4 passes**
- Strong pass rate → introduce effort-gated free-resit guarantee.
- Build AFM, then AAA (anchor hard to ACCA syllabus for the audit knowledge gap), on the same rails.
- **Gate to €500K:** ~600–850 concurrent active subscribers across 2–3 papers. Reinvest revenue into the proven acquisition channel.

---

## The two questions that decide everything

1. **Can we acquire an ACCA candidate for less than they're worth (~€40 CAC)?** — Untested. Phase 2 answers it for €0.
2. **Does our teaching actually move grades?** — Unproven. Phase 3 builds the standard; Phase 4 measures the outcome.

Everything else — which paper, €49 vs €69, finish-IB-or-not — is downstream of these two. Build only as far as the next gate; let the number tell you whether to pass it.

**Bottom line: €500K is reachable at ~750 active subscribers if we price as a taught subscription and the teaching is genuinely good — so "teach well" and "hit €500K" are the same job, and the next two cheap tests (demand, then CAC) decide whether to build the rest.**
