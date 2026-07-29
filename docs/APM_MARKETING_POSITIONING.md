# APM Marketing Positioning
Status: 19/06/2026. Verified against the ACCA June 2025 examiner report (primary source, accaglobal.com).
Competitor claims: last adjudicated 29/07/2026 (Learnsignal "AI" — see COMPETITOR CLAIMS).

## THE CORE INSIGHT
APM is explicitly an APPLICATION paper — the examining team's own words: "APM is an application paper, and few, if any, marks are available for stating theory." The recurring lost-marks pattern across the June 2025 report: describing/calculating/repeating without applying-and-evaluating to the specific scenario — benchmarking methods described "with little or no application"; ABC results where repeating figures "offers neither insight nor analysis"; strategic answers that "simply repeated the information supplied in the scenario but did not add to it"; professional-skills marks lost because answers "did not respond to the question asked".

## WHY THIS IS THE MOAT
Free competitors mark answers and give model solutions. None train the apply-and-evaluate JUMP. Every Gradd drill is a rep at the exact skill ACCA examiner reports identify as where marks are won or lost.

## PRECISION RULES (protect credibility — the evidence IS the hook)
- Say "where candidates LOSE MARKS" / "the gap ACCA examiners flag" — NOT "why candidates fail". The reports show many candidates score well; the gap is a minority stumbling on application. Overclaiming is checkable and kills credibility.
- Knowledge is NECESSARY but not sufficient — reports also flag basic knowledge gaps (KPI definition, decision-making methods). Position as "knowing the models is the start; the marks are in applying and evaluating them" — NOT "knowledge doesn't matter".
- Every claim cites the examiner reports. Primary source (accaglobal.com PDFs), not aggregators.
- **The same precision applies to COMPETITOR claims, and the stakes are higher** — a competitor can read our copy, and a wrong characterisation of their product is both checkable and actionable. Describe what a competitor's feature ACTUALLY does, from their own live wording, and draw the contrast there. Never claim a competitor's feature is fake, absent or non-functional when it exists and works. See COMPETITOR CLAIMS below.

## THE LINE
"APM is an application paper — ACCA's examiners say so directly. Knowing the models isn't enough; the marks are in applying and evaluating them against the specific scenario. Every Gradd drill trains that exact jump."

## COMPETITOR CLAIMS — ADJUDICATED
Each entry carries what the competitor's feature ACTUALLY does, the PERMITTED line, and the
FORBIDDEN overclaim. An entry is only "resolved" when it is grounded in the competitor's own live
wording, not in an inference about their stack.

### Learnsignal — the "AI" claim · RESOLVED 29/07/2026
**What they claim, verbatim (ACCA landing page):** *"AI-adaptive study paths that learn from your
question-attempt data."*

**What that actually is: adaptive SEQUENCING.** It reorders content based on which questions a
student gets wrong. It does **not** read, mark or diagnose a student's WRITTEN answer. Their marking
is **human** — *"marker feedback on every mock"*, 3-day turnaround.

**Corroborating (why one clause is not an understatement of their AI):** AI appears in **none** of
their six course highlights, **none** of their "Why Learnsignal" benefits, and **nowhere** in their
ATTAIN / APPLY / ACHIEVE method page. Total surface: **one prose clause and one feature-table row.**

**✅ PERMITTED LINE — use this exact contrast:**
> "Their AI picks what you study next. Ours marks what you actually wrote."

It is accurate on both halves, it concedes their feature is real, and the distinction it draws
(sequencing vs. reading the answer) is the actual product difference.

**⛔ FORBIDDEN — do not write, imply, or let a headline compress into:**
- that their AI is fake, absent, non-functional, or "AI-washing";
- "they don't have AI" / "AI in name only" / "the AI does nothing";
- anything that would be falsified by loading their landing page.

**It exists and does a real job.** Adaptive sequencing is a genuine feature that genuinely helps a
student. The contrast is strong *because* it is fair: we are not claiming they have no AI, we are
naming what their AI is pointed at. Overclaiming here is checkable and breaches the precision rules
above — and unlike an examiner-report overclaim, this one has a party with an interest in checking it.

**Re-verify before any campaign that leans on this.** It is a claim about a live page: it holds
until they change the page. Re-read the ACCA landing page, the highlights, the benefits and the
method page, and re-date this entry.

## WHERE THIS COPY GOES
- The paid wall (replacing the email-capture line): lead with the insight, not "73 drills".
- Blog angle: "where candidates lose marks in APM (per the examiner reports)" — same two-gate process as the IB blog, drives ACCA search traffic.
- Eventual acca.gradd.ai landing page headline.

## SURFACED FROM BUILD — 29/07/2026

A build-state inventory for copy decisions. Its only job is to stop a line being written that
the product cannot yet stand behind. **Re-date it whenever the loop moves** — an inventory that
goes stale becomes permission to overclaim rather than a brake on it.

### ✅ CLAIMABLE NOW (verified live)
- **The mock comparison** and **the adjudicated AI line**, both already recorded above
  (see COMPETITOR CLAIMS). Nothing new is unlocked by this session's build.

### ⛔ BLOCKED — DO NOT PUBLISH UNTIL WIRED
**The full rehearsal loop (sit → instant mark → pacing → coached debrief) is NOT
student-reachable today.** No copy, blog, or landing-page line may imply the loop works until
a student can complete it end to end. **This is the flagship claim and the highest-value thing
to get wrong** — it is the one promise a disappointed student can disprove in a single session.

Component state, verified against the build on 29/07/2026:

| piece | state | student-reachable? |
|---|---|---|
| AFM sit surface | records answers and stops — the route never marks, never scores, never returns a verdict | sit: **yes** · marking: **no** |
| APM timed mock | `MOCK_SIT_MODE` is **false**; flipping it alone breaks the runner | **no** |
| Technical marking | live route, gated behind `sitting:true`, which nothing student-facing sends | **no** |
| Pacing | **built 29/07** — `lib/acca/pacing.ts`, pure, fixtures green — and **wired to nothing** | **no** |
| Coached debrief | does not exist | **no** |

**Two corrections to the inventory as first drafted, made so the record is exact in both
directions:**

1. **Pacing is no longer "unbuilt".** The computation shipped on 29/07: intervals, budget at
   1.95 min/mark, ±25% flags, an end-of-paper collapse detector, marks reported side by side.
   It is pure, unit-tested and **deliberately wired into no route or UI**. **The block is
   unchanged** — "built" and "reachable" are different claims, and only the second one earns
   copy. Recorded because an inventory that is wrong in the *conservative* direction still
   erodes trust in the inventory.
2. **"Marking is proven in harness, not in a student's hands" is right about the SIT, and needs
   splitting.** Measured against `acca_case_marking` on 29/07: **21 rows — 9 demo-seed, 12 from
   the real model path, and 0 carrying technical marks.** So the **professional-skills** pass
   has produced real output through the live path; the **technical** pass has never persisted a
   row outside a harness, and every harness row was deleted. Copy may not lean on either yet:
   the PS pass is reachable only at the end of an APM *practice* case, which is not the
   rehearsal loop being claimed.

### 📝 BLOG SEEDS — publishable now, examiner-grounded, no product claim needed
These make the examiner-report argument without touching the blocked loop. Each goes through
the existing adversarial-reviewer process before publish.

1. **Unexpired basis in AFM interest-rate futures hedges.** Frame: a candidate can get the
   contract count, the direction and both scenarios right and *still* lose half the marks.
2. **Why "the same answer under both scenarios" is not self-verification.** An omission that
   applies equally to both legs reconciles just as cleanly as the correct method — so the
   candidate's own check confirms the error instead of catching it.
3. **Studying APM: theory vs application**, anchored to the examining team's own words that
   few, if any, marks are available for stating theory (see THE CORE INSIGHT above).

**⚠ GROUNDING CAVEAT — applies to seeds 1 and 2 before either is drafted.** Their *origin* is
internal: the blind-candidate script sat against AFM Mock 1, where one conceptual error (the
unexpired basis ignored) failed most components of a requirement while the candidate's own
cross-check reconciled perfectly. **That is our finding, not an examiner quote.** The
precision rules above require the primary source, so the examiner grounding must be **located
and quoted from the accaglobal.com PDF, not inherited from our notes**. Registered anchors to
start from are in `docs/evidence/sources.json` — the Abertafol and Sohbet examiner reports
(basis-risk discussion marks) and ACCA's own technical article stating that basis "is often
assumed to diminish at a constant rate" and flagging it as a simplifying assumption that "may
not hold true in practice". If a quote for the specific marks-lost claim cannot be found,
**reframe the seed around what the source does say** rather than publishing the internal
finding as though an examiner said it. Seed 3 already carries its verbatim quote.

## ⛔ OPEN — PS COACHING DOES NOT EXIST (29/07/2026)

**No copy may imply that Gradd teaches, trains, coaches or improves the professional skills.**
It MARKS them. Those are different products and the difference is checkable by any student who
buys expecting the first.

**What exists.** `judgeCaseMarking` (`lib/acca/case-marking.ts`) awards a band per examined skill
against the paper's own descriptor set — `AFM_SKILL_DESCRIPTORS` / `APM_SKILL_DESCRIPTORS`,
page-verified from the syllabus — and returns reasoning citing evidence from the student's own
answer. That is real, it is live for APM practice cases, and it is defensible copy.

**What does not exist.**
- **No PS teaching leg.** `lib/acca/teach-engine.ts` and `lib/acca/tutor-personas.ts` contain no
  reference to professional skills at all. The teach loop coaches the TECHNICAL requirement.
- **No route from a weak PS band to practice.** Nothing consumes a PS band. `next-drill` steers on
  `lo_code`/area; a `weak` in scepticism leads nowhere.
- **No PS practice surface.** Nothing lets a student attempt, be judged on, and re-attempt a
  professional skill as such.

**⚠ ONE CORRECTION TO THE OBVIOUS PHRASING — "there is no PS drill corpus" is not accurate, and
the inaccuracy would cost a rebuild.** Every published drill DOES carry a `professional_skill_tag`
(measured 29/07: 140 of 148 published drills tagged — APM analysis_and_evaluation 36, scepticism
21, communication 17, commercial_acumen 17; AFM analysis_and_evaluation 48, communication 1, 8
untagged). But the column is **written by the authoring generators and read by NOTHING** — zero
consumers in `app/`, `lib/` or `components/`. It is an authoring-time steer that shapes the
`model_answer`, inert at serve time. So the corpus is TAGGED but the routing is absent: whoever
builds PS practice should wire the existing tag, not author a second corpus.

**The permitted formulation** is the one already on the landing page and in the site metadata:
Gradd **marks** professional skills against ACCA's published descriptors and **names the
evidence**. Coaching claims attach to the technical teach-through, which is real.

**Re-check this item before any copy change touching professional skills**, and strike it only
when a student can attempt → be judged → be routed to practice on a named skill.
