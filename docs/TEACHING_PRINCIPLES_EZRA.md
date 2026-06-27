# TEACHING_PRINCIPLES_EZRA.md

**Purpose:** The Ezra (ACCA APM) counterpart to `TEACHING_PRINCIPLES.md`. That doc defines the 5 cognitive-science principles in terms of *Mia* (IB) behaviours; this one re-expresses each principle for **Ezra's actual architecture** — a withholding, single-drill, single-turn diagnose→hint→teach/confirm loop — so the same evidence standard can be audited against APM, and so the warmth/intent redesign has a concrete spec.

**Evidence base:** identical anchor to the Mia doc — Carpenter, Pan & Butler, *Nature Reviews Psychology* (2022); Agarwal & Bain, *Powerful Teaching* (2019); Dunlosky et al. (2013). The four-strategy framework (retrieval, spacing, interleaving, feedback-driven metacognition) plus worked-example fading (cognitive load theory) is unchanged. What changes here is **what each looks like in a withholding APM tutor**, and **whether it even applies**.

**Why a separate doc:** the Mia principles assume a multi-session, generate-on-the-fly curriculum tutor. Ezra is deliberately different: it withholds the answer (the moat) and operates per-drill. Auditing Ezra against Mia's behaviours produced several "absent/contradicted" scores that partly reflect *product difference*, not failure. This doc separates genuine gaps from category errors, and states the target state for each.

**Status (27/06/2026):** Mechanical teach-engine verified stable (Fix 1–4). This doc is the teaching-quality spec for the **next** major item — the warmth/intent redesign. Source of truth for current behaviour: `app/api/acca/tutor/route.ts` (`EZRA_SYSTEM`, `call2_diagnose`, `call3_hint`, `call3_teach`, `call3_confirm`) and `app/api/acca/next-drill/route.ts`.

---

## The core tension to resolve first

Ezra's moat is **withholding** ("Never complete the student's answer"). This is a near-perfect implementation of **Principle 1 (retrieval practice)** — but it sits in direct conflict with **Principle 4 (worked-example fading)**, which says a novice should see a *full worked example first*. The redesign must decide, per student state, **when withholding is teaching and when it is just gatekeeping.** The resolution proposed below: withhold by default (retrieval), but provide a *resolved* worked model once the student has genuinely attempted and stalled (fading earned through effort), and always close the loop with a re-attempt (retrieval closure). Withholding without resolution is the current failure mode.

---

## Principle 1 — Retrieval practice

**(a) What it means for Ezra:** The student must *produce* an answer before Ezra reveals anything; Ezra strengthens memory by forcing effortful recall, not by explaining. Hints/teach-throughs point at the gap without handing over the content.

**(b) Does it apply to APM?** **Strongly — it is Ezra's central principle.** APM marks reward applied judgement the candidate must generate under exam conditions; rehearsing *generation* is exactly retrieval practice. This is the one principle the withholding architecture was (perhaps incidentally) built around.

**(c) Current state — DEMONSTRATED (structurally):** `EZRA_SYSTEM`: "Never complete the student's answer." `call3_hint`: "without stating the answer." `call3_teach`: "Do not complete the answer." The student attempts first; Ezra never lectures the solution. This is real and defensible.

**(d) What "correct" looks like for Ezra:**
- Keep the withhold-by-default stance for the *attempt* path.
- **Add retrieval *closure*:** every hint/teach-through ends by inviting a concrete re-attempt ("rewrite just the evaluation sentence and send it back"), so the loop resolves in another act of recall rather than trailing off.
- After a resolved drill, the *next* encounter on that LO should ask the student to reproduce the move unprompted (ties to P2).

---

## Principle 2 — Spaced practice

**(a) What it means for Ezra:** A weak area Ezra diagnosed on one drill should **resurface in a later session at a deliberate interval**, not only when first encountered. Per-drill `last_diagnosis` becomes a per-LO weakness signal that schedules re-exposure.

**(b) Does it apply to APM?** **Yes, and it is currently the biggest unrealised lever.** APM has a finite, well-defined LO map; spacing weak LOs over days before the exam is exactly what the evidence supports. But it **requires Ezra to become session-aware** — today it is per-drill and stateless across time. This is an architecture decision, not a prompt tweak.

**(c) Current state — ABSENT:** Each drill is a sealed unit. `acca_tutor_progress` stores `miss_count`/`last_diagnosis`/`last_real_attempt`/`counted` keyed `(user_id, drill_id)`, but nothing **reads it forward** to resurface a weak LO later. No `WEAK_AREA_FLAG` equivalent, no session-opener recall. The Mia-doc fail signal ("weak areas flagged but never revisited") describes Ezra exactly.

**(d) What "correct" looks like for Ezra:**
- Promote per-drill diagnoses to a **per-(user, LO) weakness ledger** (aggregate `last_diagnosis` by `lo_code`, decay over time).
- On a new session / "next drill", **bias selection toward a previously-weak LO at a spaced interval** rather than random/same-area.
- A lightweight **session opener** that recalls the last weak point ("last time the evaluation verb tripped you on C1 — let's check it's stuck") before new work.
- Minimum viable version: a `acca_tutor_weak_areas` aggregate the drill picker consults; not a full SRS, but interval-aware re-exposure.

---

## Principle 3 — Interleaving

**(a) What it means for Ezra:** Across a practice run, **mix problem demands** (calculation / application / evaluation; different LOs/models) rather than drilling one type, and make the student **decide which approach a question needs** before answering — the discrimination skill APM examiners reward.

**(b) Does it apply to APM?** **Yes, and it is high-value for APM specifically.** APM's whole difficulty is choosing the right model/verb for a messy scenario. The doc calls this out for ACCA explicitly. The discrimination-before-solving move is *also* retrieval, so this principle compounds P1.

**(c) Current state — ABSENT → ANTI-ALIGNED:** `next-drill/route.ts:41` *prefers the same sub-area* ("Prefer same sub-area… exclude current drill") — that is **blocking**, the documented opposite of interleaving. And Ezra **names the command verb *for* the student** (`EZRA_SYSTEM`: "Always name the command verb…") instead of eliciting it — the discrimination skill is done for them.

**(d) What "correct" looks like for Ezra:**
- Change `next-drill` default from same-sub-area-preferred to **interleaved across demand types/LOs** (with the option to *block on request* when a student is deliberately drilling one weak area — blocking has its place for initial acquisition).
- Add an **elicitation step**: before diagnosing, on at least some turns, ask the student to *name the command verb and the level it demands themselves* ("what's this question actually asking you to do — calculate, apply, or evaluate?"). Ezra then confirms/corrects — turning a told fact into a recalled discrimination.

---

## Principle 4 — Worked-example fading

**(a) What it means for Ezra:** A **novice** on a procedure (e.g. a specific variance or a ROIC/EVA build) should first see a *complete worked model* with reasoning, then partial scaffolding, then independent attempt — support visibly *decreasing*. For Ezra this means: the model answer is not permanently hidden; it is *revealed as a worked example once the student has earned it through genuine attempt*, then withdrawn on the next, similar item.

**(b) Does it apply to APM?** **Partially — and this is the principle in genuine tension with the moat.** It applies most to the **calculation/procedure** LOs (where a novice truly needs to see the method once) and least to the **evaluation/judgement** LOs (where the "answer" is a defensible argument, not a reproducible procedure, and withholding is more legitimate). The redesign should treat `calculation_required` drills differently from evaluation-led ones.

**(c) Current state — CONTRADICTED:** Ezra *never* shows the worked example. The model answer (`drill.model_answer` / `call1_generate`) is used **only internally** to feed `call2_diagnose`, never surfaced. Escalation runs the *wrong way* — hint → fuller teach-through *adds* scaffolding as the student struggles, rather than starting with a model and fading it. The Mia-doc fail signal "dumps a problem on a novice with no model" is the literal withholding behaviour.

**(d) What "correct" looks like for Ezra:**
- **Earned reveal:** on a `calculation_required` drill, after a genuine stalled attempt (e.g. 2nd miss / explicit stuck signal), Ezra may show the *worked method* for one analogous instance — not the answer to *this* question, but a faded model — then immediately set a near-identical item to attempt alone. This preserves the moat (this question's answer stays withheld) while honouring fading.
- **Fade across the LO:** track exposure count per (user, LO); first encounter = more model, later encounters = less. The scaffolding curve should *decrease*, which is the opposite of today's within-turn escalation.
- For **evaluation/judgement** LOs: withholding remains the default; "fading" means modelling the *structure* of a top-band argument (the moves), never the content.

---

## Principle 5 — Feedback-driven metacognition

**(a) What it means for Ezra:** Feedback names the **specific** thing to change, ties it to the **actual mark-scheme criterion** the student missed, prompts the student to **self-assess before the reveal**, and **closes with a concrete next action**.

**(b) Does it apply to APM?** **Yes, fully — this is where APM's authored mark data should feed the teaching directly.** APM drills carry `marks_guide`, `command_verb`, `intellectual_level` — the criterion is *already written*. This principle is the most immediately fixable because the data exists and just isn't wired in.

**(c) Current state — PARTIAL:**
- *Specific & actionable:* **strong.** `call2_diagnose` names the precise gap; `EZRA_SYSTEM` forbids "generic praise"; hint/teach name verb + level + why the answer stalls; `call3_confirm` names what was done right.
- *Mark-scheme link:* **weak / not wired.** `drillBase()` selects only `question, context_text, model_answer` (`route.ts:358`). The row's `marks_guide`, `command_verb`, `intellectual_level` are **not fetched**, so Ezra *infers* the verb/level from the question text rather than consuming the authored criterion. The doc's core ("the marking engine feeds the teaching") is not actually connected.
- *Self-assessment before reveal:* **absent.** Ezra diagnoses immediately; never asks "where do you think this is weakest?" first.
- *Concrete next action:* **partial.** Teach-through "redirects" but no enforced next step / re-attempt.

**(d) What "correct" looks like for Ezra:**
- **Wire the mark scheme in:** fetch `marks_guide`, `command_verb`, `intellectual_level` and pass them to `call2_diagnose`/`call3_*` so feedback cites the *authored* criterion ("the marks_guide gives 2 marks for evaluation here; your answer stopped at application"), not an inferred one.
- **Elicit self-assessment** before the diagnosis on attempt turns ("before I read it back — which of the three points do you think is weakest?"), then diagnose against that — builds metacognition and is itself retrieval.
- **Enforce a concrete next action / re-attempt** at the end of every hint and teach-through (this is also P1 closure).

---

## Redesign priority (derived from the above)

Ordered by leverage × ease, for the warmth/intent redesign:

1. **Wire the mark scheme into the prompts (P5)** — data already exists (`marks_guide`/`command_verb`/`intellectual_level`); just fetch + pass. Highest ratio of impact to effort; turns inferred criteria into authored ones.
2. **Intent/warmth pre-layer** — classify each message (attempt / question / confusion / aside) and route only *attempts* through the withholding pipeline; everything else gets a human reply. Unblocks the conversational layer AND is the natural host for the self-assessment elicitation (P5) and the verb-discrimination elicitation (P3).
3. **Retrieval closure + earned reveal (P1 + P4)** — end every hint/teach with a concrete re-attempt; on `calculation_required` drills, allow a faded worked model after a genuine stall. Resolves the withholding-without-resolution failure.
4. **Interleave `next-drill` (P3)** — flip the default from same-sub-area-blocking to mixed; keep blocking as an opt-in for deliberate weak-area drilling.
5. **Weakness ledger + spaced re-exposure (P2)** — the biggest architecture lift (Ezra becomes session-aware); aggregate `acca_tutor_progress` diagnoses per (user, LO) and bias selection toward spaced re-exposure of weak LOs.

## What this unlocks
The same claim the Mia doc targets, now true for APM: *"Gradd's APM tutor is built on the cognitive-science methods proven to move grades — retrieval practice, spacing, interleaving, and specific mark-scheme-linked feedback."* Today that claim is ~half-true for Ezra (retrieval ✅, specific feedback ~✅, spacing ❌, interleaving ❌). Items 1–5 above make it fully true — and, not coincidentally, also make Ezra feel like a teacher rather than a marker.

## Audit method (same discipline as the Mia doc)
Pull 10–15 real Ezra transcripts; for each principle score **demonstrated / partial / absent** with the quoted line; any principle partial/absent across multiple transcripts is a prompt/architecture gap → fix it citing the target state (d) above; re-run after changes. Target: P1 and P5 demonstrated in a strong majority of turns where they apply; P2/P3/P4 demonstrated once their enabling architecture (weakness ledger, interleaved picker, earned reveal) ships.
