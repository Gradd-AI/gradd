# Layer 2 — IBO Mark Scheme Integration

*Spec document. Status: approved for build. Owner: Grant. Last updated: 26/05/2026.*

---

## What this is

Mia marks student exam-prep answers **mark-by-mark against IBO band descriptors**, naming what was hit and what was missed, quoting specific phrases from the official mark scheme. This is the layer that justifies €44.99/mo today and the planned €59.99 bump after 50 students with proven results.

Layer 1 (seed question library) is the *anchor* — the verbatim IBO-format question Mia uses to open exam-prep mode. Layer 2 is the *rubric* — the explicit band/criterion text Mia applies when marking the student's answer.

Today's BM validation session (26/05/2026) confirmed Mia already produces examiner-grade output from seed-anchor influence alone: she identifies command-term depth gaps, quotes the student verbatim, provides model rewrites, and issues structured redo tasks. Layer 2 makes this stronger by giving her **the actual IBO mark scheme text** to reference, not just her training-data approximation.

---

## Three architectural decisions

### 1. Storage: separate `mark_schemes` table, not inline JSON

Mark schemes live in their own table, joined to `questions` by `question_id`. Three reasons:

- **Versioning.** IBO updates schemes between specimen and live papers. `valid_from`/`valid_to` columns handle this cleanly. JSON on `questions` makes it a migration headache.
- **Question reuse across boards.** A 4-mark Comment on IB might reuse the same prompt as a 3-mark Comment on IGCSE with a different scheme. Decoupling lets the question text live once.
- **Analytics later.** Querying "which scheme bands do students hit most?" against a structured table is straightforward. Against jsonb on a row of `questions`, it's painful at scale.

### Schema

```sql
CREATE TABLE mark_schemes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id       uuid NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  subject           text NOT NULL,    -- IB_ECONOMICS, IB_BUSINESS_MANAGEMENT, IGCSE_BUSINESS, ...
  exam_board        text NOT NULL,    -- IBO, Cambridge, Edexcel, ACCA, CIMA
  scheme_type       text NOT NULL CHECK (scheme_type IN (
                      'content_checklist',
                      'band_descriptor',
                      'hybrid',
                      'criteria_marked'
                    )),
  max_marks         int NOT NULL,
  scheme_data       jsonb NOT NULL,   -- shape varies by scheme_type, see §2
  valid_from        date NOT NULL DEFAULT CURRENT_DATE,
  valid_to          date,             -- nullable; null = current
  source_reference  text,             -- e.g. "IBO May 2023 P1 mark scheme"
  status            text NOT NULL DEFAULT 'candidate'
                      CHECK (status IN ('candidate','seed','rejected')),
  verification_status text DEFAULT 'unverified',
  verification_notes  jsonb,
  verified_at         timestamptz,
  approved_by         uuid REFERENCES auth.users(id),
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_mark_schemes_question ON mark_schemes(question_id, valid_to);
CREATE INDEX idx_mark_schemes_subject_status ON mark_schemes(subject, status);
```

The `status` + `verification_status` columns mirror the `questions` table — same generate/verify/human-review pipeline.

---

### 2. Shape: four `scheme_type` values, each with its own `scheme_data` schema

IBO uses different marking shapes for different question types. The architecture has to handle all four — locking into one shape will fail the moment a P3 Q3 17-mark criteria-marked question hits.

#### `content_checklist` — P1/P2 Sec A 2-4 marks

```json
{
  "accepted_points": [
    {
      "point": "profit funds dividends to shareholders",
      "marks": 1,
      "keywords": ["dividend", "shareholder", "distribute"]
    },
    {
      "point": "profit enables reinvestment in the business",
      "marks": 1,
      "keywords": ["reinvest", "retained earnings", "growth"]
    }
  ],
  "marking_rule": "1 mark per distinct point, max 2"
}
```

#### `band_descriptor` — P1/P2 Sec B 10-mark

```json
{
  "bands": [
    {
      "range": [0, 0],
      "descriptor": "No response or response of no relevance."
    },
    {
      "range": [1, 3],
      "descriptor": "Describe-depth response with little or no qualification. Limited use of business terminology. Arguments unsubstantiated."
    },
    {
      "range": [4, 7],
      "descriptor": "Comment-depth response with some balance but mostly one-sided. Some business terminology applied accurately. Arguments substantiated."
    },
    {
      "range": [8, 10],
      "descriptor": "Balanced argument with explicit qualification. Contextual application to the stimulus. Business terminology applied accurately and consistently. Arguments fully substantiated with examples."
    }
  ]
}
```

#### `hybrid` — P2 calculate 6m (method marks + answer marks)

```json
{
  "method_marks": [
    {"step": "identify correct formula", "marks": 1},
    {"step": "substitute values correctly", "marks": 1},
    {"step": "show working", "marks": 1}
  ],
  "answer_marks": {
    "correct_answer": 3,
    "partial_credit_rules": "2 marks if computational error but method correct; 1 mark if answer correct but no working shown"
  }
}
```

#### `criteria_marked` — P3 Q3 17m

```json
{
  "criteria": [
    {
      "name": "A: Use of resource materials",
      "max_marks": 4,
      "bands": [
        {"range": [0, 1], "descriptor": "Limited reference to resource materials."},
        {"range": [2, 3], "descriptor": "Reference to most resource materials."},
        {"range": [4, 4], "descriptor": "All resource materials referenced to effectively support the recommended plan."}
      ]
    },
    {
      "name": "B: BM tools and theories",
      "max_marks": 4,
      "bands": [
        {"range": [0, 1], "descriptor": "Limited application of appropriate tools."},
        {"range": [2, 3], "descriptor": "Adequate application of appropriate tools."},
        {"range": [4, 4], "descriptor": "Effective application of appropriate tools."}
      ]
    },
    {
      "name": "C: Evaluation",
      "max_marks": 6,
      "bands": [
        {"range": [0, 2], "descriptor": "Largely descriptive. Limited evaluation."},
        {"range": [3, 4], "descriptor": "Analyses with some reference to relevant business areas."},
        {"range": [5, 6], "descriptor": "Effectively evaluates expected impact, considers trade-offs."}
      ]
    },
    {
      "name": "D: Sequencing of ideas and plan of action",
      "max_marks": 3,
      "bands": [
        {"range": [0, 1], "descriptor": "Limited sequencing of ideas."},
        {"range": [2, 2], "descriptor": "Ideas present but not always sequenced clearly."},
        {"range": [3, 3], "descriptor": "Ideas sequenced clearly and coherently."}
      ]
    }
  ]
}
```

The total max_marks for `criteria_marked` is the sum of criterion max_marks (e.g. 4+4+6+3 = 17).

---

### 3. Integration: single-prompt with mark scheme injection (NOT two-pass)

When the student is in exam-prep mode and Mia is marking an answer, the mark scheme for the seed question is injected into the system prompt alongside the question. Mia marks conversationally, naming bands and quoting descriptor phrases.

#### Why single-prompt wins

- **Teaching is the product, not the marking.** Students pay for a tutor who marks *as they teach*, not a grader bolted on. Two-pass produces a report; single-prompt produces a conversation. Conversations retain.
- **Latency.** Two-pass = 2 LLM calls = ~6s vs ~3s. Over a 30-min session that's 6 minutes of waiting. Students close the tab.
- **Cost.** Two-pass roughly doubles inference cost. At 100k active students/month it's $2,000 vs $1,000.
- **Cross-subject reusability.** Single-prompt means marking discipline lives in the system prompt template. Every new subject inherits for free.
- **Already proven working in single-prompt mode** (today's BM validation session).

#### Structured signals for analytics

Mia outputs machine-readable signals at the end of each marking response, parsed by the message route into events:

- `MARK_AWARDED: 6/10` (overall band)
- `BAND_HIT: 4-7 (comment-depth, mostly one-sided)` (which band descriptor matched)
- `CRITERION_SCORE: A=3 B=4 C=4 D=2` (for criteria_marked only)
- `POINTS_HIT: ["profit funds dividends"]` (for content_checklist only)
- `POINTS_MISSED: ["profit enables reinvestment"]` (for content_checklist only)

Same pattern as existing `LESSON_COMPLETE` / `UNIT_COMPLETE` / `WEAK_AREA_FLAG`. The signals are stripped from the user-facing message and stored as structured events for Phase 4 analytics (school dashboards, weakness tracking).

---

## Prompt template additions

### IB Economics tutor prompt (`prompts/ib_economics_tutor_system_prompt_v1_X.md`)

Add a new section after `## EXAM-PREP QUESTIONS`:

```markdown
## MARKING AGAINST IBO BANDS

When the student writes an answer to a seed question, mark it against the mark scheme below.

{{MARK_SCHEME_CONTEXT}}

### Marking discipline by scheme_type

**content_checklist** (2-4 marks):
- Award 1 mark per accepted point the student hits
- Name each point the student got and each point they missed
- Quote the student's phrase that earned the mark
- Output: MARK_AWARDED: X/Y, POINTS_HIT: [...], POINTS_MISSED: [...]

**band_descriptor** (10-mark essays):
- Identify which band the answer falls in by best-fit
- Quote the specific descriptor phrase from the band
- Quote the student's text that anchored you in that band
- Suggest the one structural change needed to reach the next band
- Output: MARK_AWARDED: X/Y, BAND_HIT: range (descriptor summary)

**hybrid** (calculate questions):
- Award method marks separately from answer marks
- Identify which method step was missed if answer is wrong
- Apply partial credit rules where they apply
- Output: MARK_AWARDED: X/Y, METHOD_MARKS: x/y, ANSWER_MARKS: x/y

**criteria_marked** (P3 Q3 17m):
- Mark each criterion separately (A, B, C, D)
- Quote band descriptor and student text for each criterion
- Output: MARK_AWARDED: X/17, CRITERION_SCORE: A=x B=x C=x D=x

### Fallback

If {{MARK_SCHEME_CONTEXT}} is empty, mark using your training-data approximation of IBO band descriptors. Flag the response with "(approximate marking — official scheme not yet indexed)" so the student knows.
```

Same block added to the IB BM tutor prompt.

---

## Route changes

`app/api/session/message/route.ts` — after the existing `fetchExamQuestionsContext` call, fetch the mark scheme for the seed question Mia is currently anchoring on:

```typescript
const markScheme = await fetchMarkSchemeForActiveSeed(
  supabase,
  sessionId,
  activeSubject === 'IB_BUSINESS' ? 'IB_BUSINESS_MANAGEMENT' : 'IB_ECONOMICS'
);
// ...inject into prompt:
MARK_SCHEME_CONTEXT: markScheme.formatted,
```

`fetchMarkSchemeForActiveSeed` is a new function in `lib/system-prompt.ts` that:
1. Reads the current seed question from session state (tracked in `session_messages` or similar — TBD during build)
2. Queries `mark_schemes` where `question_id = current_seed_id AND status='seed' AND (valid_to IS NULL OR valid_to > now())`
3. Formats the mark scheme as a markdown block scoped to its `scheme_type`
4. Returns `{ formatted: string }` — empty string on miss (Mia falls back to training-data marking)

Same call added to `start/route.ts` for the opening message.

---

## Build pipeline

Same shape as Layer 1 seed library:

1. **Generator script** — `scripts/generate-mark-schemes.ts`. Reads seed questions from `questions` table where `status='seed' AND subject IN ('IB_ECONOMICS','IB_BUSINESS_MANAGEMENT')`. For each question, drafts a mark scheme using Sonnet 4.6 against the V3 framework constants + official IBO command-term glossary + paper-shape rules. Inserts into `mark_schemes` with `status='candidate'`.

2. **Verifier script** — `scripts/verify-mark-schemes.ts`. For each candidate, validates:
   - `scheme_type` matches the question's expected shape (P1/P2 Sec A 2m → content_checklist, P3 Q3 17m → criteria_marked, etc.)
   - `max_marks` matches `questions.marks`
   - `scheme_data` is valid JSON for its type
   - Band descriptors don't contain banned phrases or hallucinated IBO terminology
   - For `content_checklist`: accepted_points sum to max_marks
   - For `criteria_marked`: criterion max_marks sum to max_marks
   - LLM check: does the scheme match the question being marked? (catches drift like "scheme is about market share but question is about labour turnover")

3. **Human review UI** — extend `/admin/questions` with a new tab or sibling page `/admin/mark-schemes`. Same keyboard shortcuts (A approve, R reject, E edit, V verification notes). Each row shows the question on the left, mark scheme on the right, side-by-side for review.

4. **Promotion** — Grant reviews each candidate. Approved schemes get `status='seed'` and become live. Same audit-trail discipline: rejected schemes stay in DB for analysis, regen with a `--regen-rejected` flag.

---

## Test plan

Same shape as Layer 1:

- **Meta-tests** in `scripts/test-mark-scheme-framework.ts` — one per `scheme_type` shape, plus edge cases (content_checklist sum mismatch, criteria_marked total mismatch, band overlap, etc.). Target: 15-20 meta-tests, must be 100% green before any live generation.

- **End-to-end browser validation** — log in as testbusiness@gradd.ai, open `/session`, write a deliberately mid-band answer to an IB_BM_001 seed question, confirm Mia:
  - Identifies the correct band by reference (not from her training)
  - Quotes a specific descriptor phrase from the injected mark scheme
  - Outputs the structured signals (`MARK_AWARDED`, `BAND_HIT`, etc.)
  - Stripped signals don't appear in the user-facing message

- **Cost validation** — confirm single-prompt latency stays under 4s per message (vs current ~3s). If it exceeds 5s consistently, consider mark scheme summarisation in the prompt (truncate band descriptors to 30 words each).

---

## Sequencing

1. **Schema migration** — `mark_schemes` table, indexes, RLS policies. ~30 min.
2. **Framework constants** — `MARK_SCHEME_FRAMEWORK_V3_ECON` and `..._BM` in TypeScript. ~1 hour. Evidence-grounded per Rule 22 (every constant quotes the IBO subject guide / specimen mark scheme).
3. **Generator script** — `scripts/generate-mark-schemes.ts`. ~2 hours.
4. **Verifier script** — `scripts/verify-mark-schemes.ts`. ~2 hours.
5. **Meta-tests** — 15-20 tests covering all four scheme types. ~1 hour.
6. **Live generation** — IB Econ first (93 questions → ~93 schemes), Sonnet at ~$5 total. ~10 min runtime.
7. **Verifier run** — ~$15 (mark schemes are larger context than questions). ~15 min runtime.
8. **Grant review** — ~93 schemes × ~45 sec = ~70 min.
9. **Regen rejected slots** — same `--regen-rejected` pattern as Layer 1.
10. **Repeat for IB BM** — 86 questions → ~86 schemes. Same pipeline.
11. **Route + prompt integration** — `fetchMarkSchemeForActiveSeed`, prompt template updates, structured signal parsing. ~2 hours.
12. **Browser validation** — single end-to-end test, both subjects. ~30 min.

**Total estimated build time: 10-14 hours of focused work, split across 2-3 sessions.**

Ship Econ first (well-trodden path), BM second on a parallel branch once Econ is validated.

---

## What this unlocks

- **€59.99/mo IB single subject price** — defensible once 50 students have proven IBO grade improvements with explicit mark-scheme marking.
- **Marketing copy upgrade** — "Mia marks every answer mark-by-mark against the official IBO mark scheme, just like your examiner will." Honest claim, not aspirational.
- **School licensing pilot readiness** — class-of-12+ deals at €30-50/student/year require examiner-grade marking. Layer 2 is the floor.
- **Fine-tuning corpus by 2028** — every marked answer becomes training data for a future fine-tuned Gradd model. Defensible IP.

---

## What this does NOT do

- Layer 2 does **not** add new seed questions. It marks against the existing 179 seed questions (93 Econ + 86 BM).
- Layer 2 does **not** add diagram-required questions. That's a Phase 2 backlog item.
- Layer 2 does **not** ship student-facing analytics. Structured signals are captured for Phase 4 dashboards but not surfaced to students yet.
- Layer 2 does **not** mark diagrams. Mia's vision capability already handles student-uploaded diagrams (shipped May 2026), but marking them against IBO diagram criteria is Layer 3 work.

---

## Sign-off

- [ ] Spec approved by Grant
- [ ] Schema migration committed and tested
- [ ] Framework constants extracted from IBO subject guides (Rule 22 evidence file)
- [ ] Generator + verifier pipeline shipped
- [ ] Econ mark schemes generated, verified, reviewed, approved
- [ ] BM mark schemes generated, verified, reviewed, approved
- [ ] Route + prompt integration live
- [ ] End-to-end browser validation passed
- [ ] Layer 2 marked DONE in master backlog v3.5

---

*End of spec. Build sessions reference this doc and follow the sequencing above.*
