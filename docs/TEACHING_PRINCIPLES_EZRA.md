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

## ITEM 3 SPEC — retrieval closure & earned reveal (build behind `APM_EARNED_REVEAL`)

**Problem.** Ezra withholds correctly during attempts, but the loop never RESOLVES — a student can grind a drill and leave without a consolidated correct model. Retrieval practice (P1) without closure (P4/P5) is incomplete: effortful recall, nothing correct to anchor to. The fix is a reveal that completes the moat, not one that short-circuits it.

**Two halves:**
- *Closure (cheap, mostly shipped):* every hint/teach already ends with one concrete next move (the tone passes). That IS the per-turn retrieval closure. Keep it.
- *Earned reveal (this spec):* after genuine struggle, the student can get a worked model to consolidate against.

**Earn gate — STRUCTURAL, not just phrase. Two conditions, both required:**
1. `miss_count >= 2`, read in §5b from `acca_tutor_progress` (the persisted DB counter). A teach-through has therefore already been delivered through GENUINE scored attempts (miss_count only increments on the diagnose branch — teach-requests/stop-signals/warm paths do not bump it). Reload-proof: `session_state` wipes on reload but the DB row does not, so a reload cannot reset the counter to dodge the struggle requirement.
2. An explicit reveal request (`REVEAL_PHRASES`), nudged by an offer that only appears post-struggle. Never auto.
A reveal phrase BELOW threshold → "earn it first" redirect (one more genuine go), NEVER the reveal.

**Phrase lists — must be DISJOINT (unit-tested: 0 exact, 0 substring overlap either direction; no probe matches both):**
- `TEACH_REQUEST_PHRASES` (withholding teach, any time): just tell me · show me how · walk me through · talk me through · teach me · how would a full-marks · how would a full marks · what would a full-marks · what would a full marks
- `REVEAL_PHRASES` (earned reveal only; all imperative-anchored so they can't appear inside a teach message): show me the full answer · show me the answer · show me the model answer · show me the worked answer · show me the full build · show the full answer · show the answer · show the model answer · just show me the answer · reveal the answer · reveal the full answer · reveal the model answer
Engine order: `isRevealRequest` (gated on miss_count>=2) checked BEFORE teach-request/classify; a both-match contrived message resolves safely (earned→reveal, unearned→falls through to teach).

**What's revealed.** NOT a raw `model_answer` dump. A new `call4_reveal` produces a structured worked walkthrough from (stored verified `model_answer` + last attempt + diagnosis): credits what they already had, fills the specific gap, shows how a top-band answer is BUILT. This is the ONE place `model_answer` reaches the student — withholding intentionally lifted, so `call4_reveal` uses its OWN reveal-permitted system prompt (NOT EZRA_SYSTEM, whose "never complete the answer" guardrail is what we are earning past). Generous max_tokens (~700). Loud code comment marking it the sole gated moat-lift. (Future: faded analogous-instance model for pure-calc LOs.)

**Cap.** The reveal rides as a FREE follow-up: by miss_count>=2 the drill's teach-through already charged `apm_teach_throughs_used` once (`counted=true`), so the reveal adds no charge — it is the culmination of teaching already unlocked. The per-drill free cap (3) still bounds total reveals; a paywall follows. Residual exploit (junk attempts to unlock) is bounded ≤3, self-defeating; optional substance-check on attempts later.

**Close forward.** `call4_reveal` ends pointing to a FRESH application ("now run the <gap> move on a new <LO> drill"), not a re-attempt of the now-seen drill — P1 on a new instance, seeding the next retrieval; wires to next-drill / the weakness ledger.

**State.** Add `resolved boolean not null default false` to `acca_tutor_progress` (additive migration, mirrors the Fix-4 `counted` add). Set on reveal. Uses: free re-read without re-charge, resolution-rate analytics (`drill_resolved` telemetry), spaced re-test scheduling (P2), next-drill deprioritisation.

**Flag.** `APM_EARNED_REVEAL` — own flag, separate from `APM_INTENT_LAYER`, for independent rollout.

## ITEM 4 SPEC — interleave `next-drill` (build behind `APM_INTERLEAVE`)

**Problem.** `next-drill/route.ts` is anti-aligned to P3 (interleaving). It *prefers the same sub-area* and *excludes the current LO* (`.neq('lo_code', lo)`), which (a) is blocking — the documented opposite of interleaving — and (b) silently teleports to an unrelated section when the same-area pool is empty (C1a→A2d observed live), and (c) blocks same-LO depth siblings where they exist. P3 wants demand-type MIXING, but coherent — not random teleporting.

**Content reality (drives the whole design; verified 29/06/2026).** 49 published drills across 37/73 LOs, lopsided: A=18 LOs/30 drills (A3 alone 17), B=14/14, C=1/1, D=4/4. Only 4 LOs have >1 drill — all A3 (A3b×9, A3c×2, A3d×2, A3e×3). So same-LO siblings exist *essentially only in A3*, C *cannot* interleave (1 drill), D is shallow. The picker must be content-aware and degrade gracefully; interleaving quality scales with the content backlog (the standing top priority), so this ships the MECHANISM whose payoff grows as depth drills publish.

**Scope to mix within — SECTION-anchored weighted blend.** The section (A/B/C/D) is the coherence boundary: it stops cross-section teleporting while still mixing sub-areas / LOs / demand-types *within* a coherent theme. Whole-paper-random is chaos; same-sub-area is the current anti-pattern. Interleaving comes from weighting toward a **different sub-area AND different demand type** (intellectual_level / command verb) than the just-finished drill.

**Two modes — interleave default, block opt-in (maps to existing UI):**
- *interleave* (default) = "Try another" / auto-next → the section-anchored mixed pick below.
- *block* (opt-in) = the "Change area" picker → serve within the chosen sub-area. Picking a sub-area IS the deliberate weak-area-drilling signal; blocking keeps its place for initial acquisition, it is just no longer the default.

**Selection — restructure from ordered queries to `build pool → score → pick`** (the seam item 5 plugs into). Inputs: `currentDrillId`, `currentLo` (→ `section`, `subArea`, `level`/`verb`), `mode`.

Candidate pool (interleave mode) — **exclude by `drill_id`, NEVER by `lo_code`** — degradation ladder, first non-empty tier wins:
1. same section, `sub_area != currentSubArea`, `id != currentDrillId` — ideal interleave (mix sub-area + demand).
2. same section, `id != currentDrillId` — any other in-section LO/drill.
3. same LO, `id != currentDrillId` — depth fallback (non-empty only in A3).
4. any section, `id != currentDrillId` — LAST resort, and the response **signals a section change** (client surfaces "moving to Section B"), never a silent jump.

Scorer (deliberate, not pure random; random only breaks ties within the top band):
```
score(c) =  w_demand   * (c.level != currentLevel || c.verb != currentVerb ? 1 : 0)   // interleave demand
          + w_fresh    * (c.lo not seen recently ? 1 : 0)                              // avoid immediate repeats
          - w_resolved * (c.resolved === true ? 1 : 0)                                 // item-3 hook (v1, ON)
          + w_weak     * weaknessLedger[c.lo]                                          // item-5 hook (=0 in v1)
```

**(a) Mechanical prerequisite — `next-drill` must now receive `drill_id` from the client.** Today it gets only `lo` (and `area`); the client holds `currentDrill.id` and sends it to the tutor route but NOT to next-drill. Item 4 requires excluding the current *drill* (not LO), so the `lo=` call must also pass `drill_id`. Additive: absent `drill_id` (legacy/in-flight clients) falls back to excluding by `lo_code` as today — degrades to the old behaviour, never 500s.

**(b) Resolved-flag deprioritisation is IN v1.** The scorer's `w_resolved` term is active from the first ship: a `resolved=true` LO (item 3's earned-reveal flag, read from `acca_tutor_progress`) is pushed down the ranking so a just-mastered drill is not re-served ahead of un-mastered work. This is an independent win that also previews item 5's interval logic.

**(c) Scorer signature is item-5-ready.** The `w_weak * weaknessLedger[lo]` term is present in the scorer from v1 but **weighted 0** (no ledger yet). Item 5 supplies the per-(user, LO) weakness ledger and flips `w_weak` on — adding one input, no signature change. Item 4 ships independent of the ledger; it hands off to item 5 through this term.

**Out of scope (boundary).** P3's verb-discrimination *elicitation* ("ask the student to name the command verb") is a prompt / intent-layer change hosted by item 2 — NOT the picker. Item 4 is selection only.

**Flag.** `APM_INTERLEAVE` — own flag, separate from `APM_INTENT_LAYER` / `APM_EARNED_REVEAL`. Flag OFF = today's same-sub-area-preferred, exclude-LO behaviour verbatim (exact rollback). Ships dormant.

## CORRECT-VERDICT COMPLETENESS GATE SPEC — (build behind `APM_COMPLETENESS_GATE`)

**Problem (defect).** `call2_diagnose`'s correct-sentinel ("answer correct — convention differs from model only") is gated on NUMERIC equivalence only — it exists (commit `e18a0c5`) to stop FALSE-WRONG verdicts on convention differences (sign convention, A/F labelling, layout). It has no completeness check. On a multi-component drill (e.g. A3b "calculate and evaluate", which demands a sceptical challenge), a calc-correct-but-incomplete answer satisfies the numeric test → sentinel → `isCorrectVerdict` → **Correct** badge + `call3_confirm`. `call3_confirm` (a separate Haiku call that sees the question+verb) then reads the level-2 stop and writes "you're missing the sceptical challenge" — so the student gets a **Correct frame over an incomplete body**, and is falsely told they're done. (`isCorrectVerdict`'s regex is tight and correct; the fault is upstream — the verdict's notion of "correct" = numerically equivalent, not mark-scheme-complete.)

**Target behaviour, three cases:**
1. Correct AND complete (every required component attempted) → Correct (`call3_confirm`) — unchanged.
2. Correct calculation BUT a required component entirely absent (e.g. the sceptical challenge) → NOT correct; diagnose the MISSING component as the gap → hint/teach, `miss_count++`. The student is told what's missing, not falsely told they're done.
3. Genuinely wrong (bad number/operation) → diagnose as today — unchanged.

**Where the completeness signal lives (audited 29/06/2026, 6 drills incl. controls).** NOT `marks_guide` — it is a scalar (the mark total: A3b=15, A3f=6), no component breakdown, no rubric/checklist column exists. The reliable source is the **`model_answer`**, which is consistently sectioned across the sample into a calc block plus a labelled judgment component (Evaluation / Scepticism / Interpretation and scepticism / Limitations and bias) — present even in the single-verb controls (B1c "calculate", D2e "analyse"). `command_verb` arity is NOT a reliable scope signal (B1c is single-verb but multi-component), so it is **dropped** — the model_answer self-scopes (a calc-only model answer → check finds only calc → behaves like today).

**Design — two-stage, gate runs ONLY on the correct branch; `call2_diagnose` is left UNTOUCHED.**
```
diagnosis = call2_diagnose(...)                              // UNCHANGED — numeric/convention verdict
completenessGap = null
if (FLAG && isCorrectVerdict(diagnosis))
    completenessGap = completenessCheck(question, context, modelAnswer, attempt, verbLevel)
treatCorrect = isCorrectVerdict(diagnosis) && !completenessGap
if (treatCorrect)  → call3_confirm (messageKind 'correct')              // case 1, unchanged
else               → gap = completenessGap ?? diagnosis; miss++; hint/teach(gap)   // case 2 (fix) / case 3 (unchanged)
```
Because `call2_diagnose` is untouched and the gate runs only when the verdict is already "correct", the wrong-answer and convention-difference paths are byte-identical — the gate can NEVER turn a numeric-wrong or a complete-but-different-format answer into "wrong". It can only convert a correct-but-incomplete verdict into a gap. The sole residual risk is *false-incomplete*, mitigated below.

**`completenessCheck` — LLM judgment (Haiku), NOT a parse.** Bold/headers in the model answer are overloaded (they mark both section headers AND emphasised result values) and header wording varies (`Scepticism` / `SCEPTICISM` / `Interpretation and scepticism` / `Limitations and bias`), so a regex/keyword match is unreliable. The check *reasons over* the model answer: identify its distinct required components, decide whether the student made ANY genuine attempt at each, output `complete` or a short gap label naming the absent component (no answer content stated). It is explicitly told the numbers are already verified — do NOT re-check arithmetic or flag convention/format/layout.

**Narrow "incomplete" definition (false-wrong protection).** "Absent" = NO attempt at a required component, NOT "shallower/less developed than the model". A brief or partial attempt counts as PRESENT (depth/quality is the hint's job, not the gate's). On any uncertainty → output `complete`. The parser biases the same way: only a clear gap label with no "complete" verdict triggers the override; empty/errored/ambiguous output → treated as complete (today's behaviour). A `completenessCheck` failure is non-fatal → null → Correct.

**Cost.** One extra Haiku call, incurred ONLY on the correct branch (the rare, worth-it moment) — not on every attempt. `call2_diagnose` (Sonnet) is unchanged.

**State / cap.** None. No schema change, no new columns. `miss_count` increments on a case-2 override exactly as a normal miss (so the teach-through / earned-reveal flow engages correctly). No `marks_guide` dependency.

**Flag.** `APM_COMPLETENESS_GATE` — own flag, separate from the others. Flag OFF = today's behaviour verbatim (the gate block is skipped; `treatCorrect === isCorrectVerdict(diagnosis)`). Ships dormant.

**Verify before enable (3 cases + audit):** (a) A3b calc-correct / scepticism-absent → gap naming the missing challenge, `miss_count++`; (b) a convention-different but COMPLETE calc (e.g. B1c with flipped sign) → still **Correct** (proves no false-wrong); (c) a genuinely-wrong number → gap, unchanged. Plus spot-check `model_answer` structure on a few more evaluation drills (audit sample was 6/49).

## What this unlocks
The same claim the Mia doc targets, now true for APM: *"Gradd's APM tutor is built on the cognitive-science methods proven to move grades — retrieval practice, spacing, interleaving, and specific mark-scheme-linked feedback."* Today that claim is ~half-true for Ezra (retrieval ✅, specific feedback ~✅, spacing ❌, interleaving ❌). Items 1–5 above make it fully true — and, not coincidentally, also make Ezra feel like a teacher rather than a marker.

## Audit method (same discipline as the Mia doc)
Pull 10–15 real Ezra transcripts; for each principle score **demonstrated / partial / absent** with the quoted line; any principle partial/absent across multiple transcripts is a prompt/architecture gap → fix it citing the target state (d) above; re-run after changes. Target: P1 and P5 demonstrated in a strong majority of turns where they apply; P2/P3/P4 demonstrated once their enabling architecture (weakness ledger, interleaved picker, earned reveal) ships.
