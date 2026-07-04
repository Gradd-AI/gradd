# APM Professional-Skills Marking — v1 Spec

**Status:** approved, NOT yet built. Serving-path change (new endpoint + reads sealed content) → sign-off required before build.
**Collapses two backlog items into one:** "v2 cross-requirement synthesis" and "professional-skills marking" are the same build. This spec is both.

---

## The call

**Terminal whole-case marking.** When a case is completed, run one holistic marking pass over the student's full answer (all requirements concatenated) and return a mark + feedback for each professional skill the case examines. This mirrors how ACCA actually awards the 5 (Section B) / 10 (Section A) professional marks — across the whole question, not per part.

Not per-turn coaching (layers on later). Not applied to drills (single-LO, no whole-question unit). Not the technical side (already handled by the withhold + completeness gate).

---

## Marking unit

**The case (the whole exam question), not the requirement.**
- Section B case → 5 professional marks, minimum two skills from {analysis_and_evaluation, scepticism, commercial_acumen}.
- Section A case → 10 professional marks, all four skills incl. communication.
- The skills a given case examines = the **union** of `professional_skill_tags` across its requirements. (Aldermere: (i) tags A&E + scepticism, (ii) tags communication → case examines A&E, scepticism, communication.)
- Total marks available = `acca_cases.professional_skills_marks`.

## Trigger & mechanism

- New endpoint: `POST /api/acca/case/mark`, behind the same `APM_CASES` flag.
- Client calls it when a turn returns `case_complete: true`. (Kept separate from the turn route so the completing turn isn't slowed by extra calls, and so marking can be re-run without re-answering.)
- Guard: only marks if **every** requirement of the case has `passed = true` for this user in `acca_case_progress` (i.e. the case is genuinely complete). Otherwise 409 — nothing to mark yet.

## Input to the marking pass (server-side)

1. **Student's whole answer** — `final_answer` from `acca_case_progress` for each requirement, concatenated in `requirement_order`, each block labelled with its requirement `label`.
2. **Case context** — `scenario_intro` + exhibits (title + body), same context the engine already builds. NOT sealed content.
3. **Examined skills** — the union set above.
4. **Marks available** — `professional_skills_marks`.

Note: the marking pass does **not** see the sealed model answers of the requirements — professional skills are marked on *how* the student wrote, against the ACCA descriptors, not against a model answer. This keeps the withhold discipline intact.

## Rubric — grounded in the ACCA descriptors (syllabus section E), not invented bands

For each examined skill, the marking call is given the **authored ACCA descriptor verbatim** as the standard, and marks the student's whole answer against it. Descriptors (S26–J27 syllabus §E), stored as fixed rubric constants:

- **communication** — inform concisely, objectively, unambiguously in a suitable style/format; advise with compelling, logical, counter-arguable reasoning; clarify and simplify complex issues for the intended audience.
- **analysis_and_evaluation** — investigate relevant information with appropriate technique to establish reasons/causes; reflect on implications; apply judgement to plans/issues; appraise objectively, balancing costs, risks, benefits before advising.
- **scepticism** — explore underlying reasons with an enquiring mind beyond the immediately apparent; question opinions, assertions and assumptions and seek justification/evidence; challenge and critically assess where justified.
- **commercial_acumen** — awareness of organisational and external factors affecting the measurement/management of objectives; judgement in proposing commercially viable solutions; insight into behavioural, process and system-related issues.

**Marking discipline (mirrors "verify against the official guide"):** the descriptor is the standard; the model marks against it and must cite specific evidence from the student's answer for each skill's mark. No mark without a named reason. This is genuinely holistic judgement (unlike the completeness gate, code does not decide the band) — but it is *anchored* to the official descriptor and *evidenced*, not vibes.

## Output

Per examined skill: `{ skill, mark_awarded, marks_available, feedback }` where feedback names what in the answer earned/lost the mark against the descriptor. Plus an overall professional-skills mark (sum, capped at `professional_skills_marks`).

Returned to the client, and persisted (see below) so it survives the session and feeds later analytics.

## Persistence — small schema addition

New table `acca_case_marking`, keyed `(user_id, case_id)`:
- `professional_marks_awarded` smallint, `professional_marks_available` smallint
- `per_skill` jsonb (array of the per-skill objects above)
- `marked_at` timestamptz, `model` text (which model marked, for audit)
- RLS enabled, no policy (service-role only), same pattern as the other case tables.
Idempotent upsert on re-mark.

## Model choice

Marking is holistic judgement over a long answer against a rubric → **Sonnet**, consistent with using Sonnet for diagnosis/complex reasoning. Haiku is insufficient here for the same reason it leaked on call2.

## Explicit non-scope (v1)

- No per-turn / inline professional-skills coaching (deliberate later layer).
- No marking on drills.
- No change to technical marking or the withhold engine.
- No UI (tested via console; UI consumes the endpoint later).

## Test plan (console, no UI)

Aldermere is already a completed case for the test account (req (i) passed; req (ii) not yet passed). To test marking end-to-end: first pass (ii), then call `/api/acca/case/mark`. Expect: marks for A&E, scepticism, communication (the three Aldermere examines), each with evidence-based feedback, overall capped at 5. A weak-answer control (pass (ii) with a thin answer) should score lower with feedback naming the weakness — same author→adversarial→live-test rigour as the drills and the case content.
