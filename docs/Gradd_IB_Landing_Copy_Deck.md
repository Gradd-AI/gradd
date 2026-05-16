# Gradd.ai IB Landing Page — Final Copy Deck

*Built 16/05/2026 from the redesign prototype + the live-site copy, reconciled against the read-only repo audit. Every claim here is confirmed true or confirmed buildable. This is the copy to implement — in the prototype now, in the Next.js port later.*

**Principle:** the redesign's voice and structure are kept. Everything the audit flagged NOT BUILT is cut. Numbers come from the curriculum doc (210 Econ + 136 BM = 346) — confirm against a live `lessons` count before launch.

---

## Nav
Unchanged: Curriculum · Meet Mia · For parents · Pricing · FAQ.
Buttons: **See it in action** (new `.see-it` button → demo) · **Log in** · **Start →**

---

## Hero — KEEP

> **Eyebrow:** IB Economics · IB Business Management
>
> **Headline:** Walk into your IB exam *knowing* exactly what to do.
>
> **Sub:** Gradd.ai is the AI tutor built only for IB Economics and IB Business Management. Full syllabus. IBO-standard diagrams marked instantly. Available the night before the exam.
>
> **CTAs:** Start learning with Mia → · See it in action
>
> **Meta:** From €44.99 / month · 7-day money back · Cancel anytime

*Changed: "See Mia in action" → "See it in action", repointed to the demo.*

**Hero chat preview** — keep as-is. *Changed: footer reads "Session 12 · IB Economics SL · Mia online 24/7" — drop "of 150" (false denominator, decorative anyway).*

---

## Trust bar — REBUILD (was fabricated)

> **Label:** Built around the official IBO syllabus
>
> **346** structured lessons · **2** subjects, HL & SL · **61** IBO-standard diagrams · **24/7** availability

*Changed: the old bar invented "136 question banks" and "153 worked exemplars" (153 is the IB country count). Replaced with four true figures — 346 real lessons, 61 real diagrams.*

---

## Pain section — KEEP framing, CUT fabrications

> **Headline:** IB tutoring costs too much. And it *still* doesn't cover the whole course.

*Changed: the attributed pull-quote ("— IB student, May 2024") is CUT — fabricated testimonial, no students yet. The headline and three cards carry the section.*

**Card 1 — KEEP:**
> **€90 / hour** — Tutors are priced like therapists. Families commonly spend €3,500–€9,000 across the two years — and that's two hours a week, not full coverage.

**Card 2 — FIX:**
> **Paper 3** *(label: first to get cut)* — Coverage gaps everywhere. A weekly tutor reaches maybe two-thirds of the course. Paper 3, HL extensions and exam technique are the bits that get left behind.

*Changed: invented "38% of syllabus" stat removed — it also contradicted its own "two-thirds" copy. The point stands without a fake number.*

**Card 3 — KEEP:**
> **0 at 11pm** — Never there when you need them. The exam is tomorrow, your tutor is asleep, and the doubt about monopoly diagrams won't resolve itself.

---

## One subscription — KEEP

> **Headline:** One subscription. The *complete* IB Economics and IB Business Management curriculum.
>
> **Lead:** No more piecing together five tutors, three textbooks and a YouTube playlist. Gradd is the whole course, taught and marked to IBO standards, in one place.

> **01 / Lessons** — Every topic from the official 2022+ syllabus. Micro, macro, global, development for Econ. Strategy, marketing, finance & ops for BM. HL and SL extensions, at the depth IB expects.
>
> **02 / Practice** — Every paper format. Marked the way IB marks. Paper 1, 2, 3 exam-style practice, IBO command terms, diagram marking — graded against the official IBO markbands and assessment criteria, not generic AI hand-waving.
>
> **03 / Tutor** — Mia, the tutor on call. Ask anything, any time — drawing diagrams, working questions, deciphering a prompt that makes no sense.

*Changed: "02" wording — "against the official mark schemes" → "against the official IBO markbands and assessment criteria" (the markband framework is genuinely in the prompts; actual past-paper mark schemes are not).*

---

## Subjects — KEEP, one FIX

Both cards keep their unit breakdowns. **Fix: the IB Business Management card says "2022 syllabus" — it is First Assessment 2024.** Economics stays 2022.

> IB Economics — HL · SL · 2022 syllabus
> IB Business Management — HL · SL · **2024 syllabus**

---

## Exam-ready band — KEEP framing, FIX

> **Headline:** Start at zero. Finish *exam-ready.*
>
> **Lead:** Whether you're starting Year 1 in September or cramming the week before May exams, Gradd meets you where you are and pushes you to a 7.

> **01 — From day one.** Onboarding diagnoses what you already know and skips you ahead. No grinding through definitions you already have.
>
> **02 — On demand.** Lessons, practice, marking and explanation — whenever you have ten minutes between calculus and football.
>
> **03 — Built around your exam.** Pacing and revision planned backwards from your paper dates, so revision lands when it counts.

*Changed: pillar 03 heading "Until May 2026" (stale — that's now) → "Built around your exam". Removed "mock cycles" from the body — mock exam mode is not built.*

---

## Diagrams — KEEP ENTIRELY

True and shipped — 61 IBO-standard diagrams, inline rendering, photo upload to vision. No changes. This is the strongest real section on the page.

---

## Meet Mia — KEEP framing, FIX claims

> **Headline:** A tutor who knows the *mark scheme* — not just the subject.
>
> **Lead:** Mia is not ChatGPT in a costume. Mia is built on the IB Economics and IB Business Management subject guides and the official IBO assessment framework — command terms, AO levels and the markband descriptors examiners actually score against.

*Changed: headline "read every mark scheme since 2016" → mark-scheme knowledge without the false past-paper-archive implication. Lead drops "examiners' reports, and 50+ past papers" — neither is in Mia's context per the audit.*

Capability cards — keep five, fix one:
- **Speaks IB command terms** — keep.
- **Draws to IBO convention** — keep.
- **Practises in real exam style** — *(was "Pulls real past paper questions")* — Mia generates exam-style questions in the real exam idiom, including the ones written to confuse you.
- **Gives feedback that improves marks** — keep ("not 'good attempt!' — specific: 'para 2 needs an evaluative judgement to access band 3'").
- **Drills exam technique, paper by paper** — keep.
- **Tracks what you actually know** — keep.

*Changed: the past-paper-retrieval cap reworded to exam-style practice (which is what Mia genuinely does).*

---

## Big numbers section — CUT

Delete it. It duplicated the trust bar and repeated the same fabricated trio. The rebuilt trust bar already carries the real figures; the original page review flagged repetition as a problem — this removes one instance of it.

---

## For parents — REBUILD honestly

> **Headline:** Parents see the progress that *matters.*
>
> **Lead:** A dashboard view built for parents, plus a weekly progress email. No more "did you study today?" guesswork — you'll see where they are, what they've struggled with, and whether they're on pace for May.

> - **Parent view of the dashboard.** Sessions completed, weak topics flagged, days to exam, study streak.
> - **Weekly progress email, every Monday.** What they covered, a pace check, and what's next.
> - **Pace, in plain sight.** The dashboard and the weekly email both flag it the moment they fall behind.

*Changed: this section sold a separate parent login with sibling accounts — NOT built (only a parent-view toggle inside the student login exists). Rewritten to claim only what's real: the parent view and the weekly email. Removed "one login, multiple students". "Every Sunday" → "every Monday" (when the cron actually fires). "See the parent view" link → the demo.*

---

## Who it's for — KEEP

All four personas unchanged — aiming for a 7, falling behind, self-studying, the paying parent. True and well-observed.

---

## Compare table — KEEP, one FIX

Keep the table. **Fix the "Past paper coverage — 2016 → today" row** — implies the unbuilt past-paper library. Replace with:

> **IBO-standard marking** — Gradd: ✓ command terms + markbands, instant

---

## Pricing — REBUILD (honest tiers, real SKUs)

Replace the three-card layout with a **Monthly / Annual toggle + two plan cards**. This maps exactly to the four locked Stripe products and removes the mispriced/missing-SKU problems.

> **Headline:** Simple pricing. *Full* IB curriculum. Global access.
>
> **Lead:** Cancel anytime. 7-day money-back guarantee on every plan. Every subscription includes Mia — your full-time AI tutor.
>
> **Toggle:** Monthly · Annual *(Save ~35%)*

**Card 1 — Single subject**
> €44.99 / month · or €349 / year
> IB Economics *or* IB Business Management.
> - Full IB syllabus — HL & SL
> - Paper 1, 2 & 3 (HL) exam-style practice
> - IBO-standard diagrams — taught inline, your hand-drawn diagrams marked
> - Unlimited sessions with Mia
> - Automatic progress tracking + weak-area drilling
> - Works on any device

**Card 2 — Both subjects** *(featured — "Save €15/month vs separate")*
> €74.99 / month · or €579 / year
> IB Economics *and* IB Business Management.
> - Everything in single-subject — for both courses
> - Progress tracked separately per subject
> - One subscription, both tutors

*Changed: dropped the fabricated tier features entirely — revision planner, predicted-grade tracker, cross-topic synthesis, priority Mia, mock cycles, university essay help (all NOT built). The bundle's honest pitch is the €15/month saving. Annual prices corrected to the locked €349 / €579 — the old card showed €539.88. The missing single-subject annual SKU is restored by the toggle.*

---

## FAQ — KEEP most, FIX three

**Q: Is Gradd built for the IB syllabus, or ChatGPT with a wrapper?**
> Built specifically for IB. Mia runs on the official IB Economics (2022) and IB Business Management (2024) subject guides and the IBO assessment framework — command terms, AO levels, markband criteria. Generic LLMs don't pass IB: they hallucinate command terms, draw wrong diagrams, and ignore markbands.
*Changed: removed "past papers back to 2016"; fixed BM year.*

**Q: Can Gradd really replace a private tutor?**
> For the core of what a tutor does — explanation, practice, marking, accountability — yes. For pastoral support and human encouragement, no. Gradd is built to be the primary tutor; keep your school teacher for the human side.
*Changed: "Most of our students use Gradd as..." → capability claim, no fabricated social proof.*

**Q: My exam is in three weeks. Is it worth starting now?**
> Yes. The first session diagnoses your weak topics and puts you straight into high-signal practice — no re-reading textbooks.
*Changed: removed "we see real grade lifts in 14 days" — unevidenced efficacy claim, pre-launch.*

**Q: What about Maths, English, Sciences?** — keep unchanged.
**Q: How does diagram marking work?** — keep unchanged (true).
**Q: What if Gradd isn't right for me?** — keep unchanged (the money-back-guarantee answer is accurate).
**Q: Can my school sign up a cohort?** — keep unchanged.

---

## Final CTA — KEEP

> **Pill:** 7-day money-back guarantee
> **Headline:** Pass IB Econ. Pass IB Business. *Period.*
> **Lead:** Start tonight. Be ahead of your class by next Monday.
> **CTAs:** Start learning with Mia → · See pricing
> **Meta:** From €44.99 / month · cancel anytime · 7-day money back

---

## Footer — WIRE
"Terms / Privacy / Schools" point to `#` — need real pages before launch (the live site has `/privacy`, `/terms`, `/cookies`).

---

## Pre-launch verification
- Confirm 210 / 136 against a live `SELECT COUNT(*)` on the `lessons` table — the deck uses the curriculum-doc figures.
- The trust bar's "61 diagrams" — confirm the current count in `components/diagrams/`.
