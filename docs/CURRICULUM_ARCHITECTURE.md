# Curriculum Architecture

**Read this before starting any new exam product build.**

This document is the single source of truth for how curriculum content is structured on the Gradd platform. Every exam product — IB Economics, IB Business Management, ACCA F1–F4, A-Level Economics, A-Level Business, IGCSE, and anything else that comes after — follows the same conventions documented here.

The patterns in this document were established through the IB Business Management and IB Economics builds. Several of the rules below exist because a bug was found the hard way. The bug stories are included deliberately. Read them before you skip a step.

---

## 1. Overview

### What this is for

This document covers:
- The database schema for the `lessons` table and every column's purpose
- The linked-list curriculum structure and how to verify it
- How SL/HL differentiation is flagged at the row level
- The Inline Subtopic vs Standalone Unit decision (the Toolkit pattern)
- Signal formats: what Mia emits, what the parser expects, what the handler does
- How the UNIT_COMPLETE handler must work and why the original failed
- Bundle account scoping — the silent corruption risk
- Prompt-to-database content alignment and audit cadence
- Migration discipline: naming, idempotency, verification
- A complete checklist for seeding a new product

### The core principle

Don't reinvent. The platform already knows how to progress a student through a curriculum, emit signals, update progress, handle multi-subject bundle accounts, and stream responses. A new product is a new lesson seed + a new system prompt. Everything else reuses existing infrastructure. The value is in the curriculum content, not in the plumbing.

---

## 2. The lessons table schema and conventions

### Schema

```sql
CREATE TABLE lessons (
  lesson_code          TEXT PRIMARY KEY,
  lesson_name          TEXT NOT NULL,
  unit_code            TEXT NOT NULL,
  unit_name            TEXT NOT NULL,
  topic_code           TEXT,
  next_lesson_code     TEXT,   -- NULL on final lesson of curriculum
  papers               TEXT,   -- comma-separated, e.g. 'Paper 1,Paper 2'
  ao_level             TEXT    -- AO1, AO2, AO3
);
```

### Column-by-column explanation

**`lesson_code`** — Primary key. Immutable. Format: `<PRODUCT_PREFIX>_<NNN>` with zero-padded three-digit sequence.

Examples: `IB_BM_001`, `IB_ECON_023`, `ACCA_F1_004`.

This is the only identifier that the application joins on. `lesson_name` and `unit_name` can be corrected via migration without breaking anything because nothing in application code joins on names. The lesson code is stable; the name is display data.

**`lesson_name`** — Human-readable display name for the lesson. Shown on the student dashboard, injected into the tutor system prompt as `CURRENT_LESSON_NAME`, and used in the `LESSON_COMPLETE` signal handler to update `student_progress.current_lesson_name`.

The lesson_name in this table is the **source of truth**. Mia's system prompt signal examples must reference lesson names that exactly match this column. Any drift between the two causes confusion when Mia references a lesson name that the platform does not recognise (see Section 9).

**`unit_code`** — The top-level unit identifier. Format: `<PRODUCT_PREFIX>_UNIT_<n>` for numbered units, or `<PRODUCT_PREFIX>_UNIT_TOOLKIT` for toolkit/synthesis units.

Examples: `IB_BM_UNIT_1`, `IB_ECON_UNIT_3`, `ACCA_F1_UNIT_2`, `IB_BM_UNIT_TOOLKIT`.

**Critical naming rule:** Always use the full subject-prefixed format. Never use bare-prefixed codes like `UNIT_1`. The IB_BUSINESS and IB_ECONOMICS products share the same database. A bundle student has rows in `student_progress` for both subjects. If both subjects used `UNIT_1`, the UNIT_COMPLETE handler cannot determine which subject a progress row belongs to. Subject-prefixed codes (`IB_BM_UNIT_1`, `IB_ECON_UNIT_1`) eliminate any namespace collision.

This was the bug: the original unit reconciliation migration (commit `7078dc5`) created `IB_BM_UNIT_1` and `IB_ECON_UNIT_1` in the lessons table, but the UNIT_COMPLETE handler had a hardcoded `UNIT_SEQUENCE` map with bare keys `UNIT_1`, `UNIT_2`. The lookup returned `undefined` and the handler silently skipped all companion field updates. Fixed in commit `6fa0177` (see Section 7).

**`unit_name`** — The canonical top-level unit name from the syllabus specification. Must be **identical for every lesson within the same unit_code**.

For IB Business Management, the correct values are:
- `IB_BM_UNIT_1` → `Business Organisation and Environment`
- `IB_BM_UNIT_2` → `Human Resource Management`
- `IB_BM_UNIT_3` → `Finance and Accounts`
- `IB_BM_UNIT_4` → `Marketing`
- `IB_BM_UNIT_5` → `Operations Management`
- `IB_BM_UNIT_TOOLKIT` → `Business Management Toolkit`

For IB Economics:
- `IB_ECON_UNIT_1` → `Introduction to Economics`
- `IB_ECON_UNIT_2` → `Microeconomics`
- `IB_ECON_UNIT_3` → `Macroeconomics`
- `IB_ECON_UNIT_4` → `The global economy`

Do not use syllabus sub-topic names (e.g. `Introduction to HRM`, `Marketing mix`, `Sources of finance`) as unit_name values. These are sub-topics within a unit, not the unit itself. When the UNIT_COMPLETE handler reads the new lesson's `unit_name` from the table and writes it to `student_progress.current_unit_name`, the student and Mia will see the sub-topic name instead of the unit name. This creates incoherent context in the prompt.

The IB Business build initially seeded sub-topic names as unit_name for all five units. This was corrected in migration `20260515130000_reconcile_lesson_unit_names.sql`.

**`topic_code`** — Preserves the official syllabus-specification sub-topic reference. This is the IBO's own numbering, not the platform's unit_code. Values are strings, not numeric.

Examples from IB Business Management: `1.1`, `2.10`, `3.7`, `TK` (for Toolkit lessons).

Two lessons can share a `topic_code` if they cover the same syllabus sub-topic at different depths (e.g., one SL lesson and one `[HL]` lesson both tagged `2.5`). The `topic_code` is for syllabus cross-reference only. It has no bearing on the linked list or on signal routing.

Do not confuse `topic_code` with `unit_code`. The column was formerly named `unit_code` before the reconciliation migration renamed it to `topic_code` and added a new `unit_code` column in the platform-prefixed format.

**`next_lesson_code`** — The linked-list pointer to the immediately following lesson in curriculum sequence. The final lesson of the entire curriculum has `next_lesson_code = NULL`.

The application uses this column to advance the student: when `LESSON_COMPLETE` fires, the handler reads `next_lesson_code` from this table (not from Mia's signal value) to determine the authoritative next lesson. Mia cannot jump the sequence.

**`papers`** — Which exam paper(s) this lesson is assessed on. Comma-separated string. Examples: `Paper 1`, `Paper 1,Paper 2`, `Paper 1,Paper 2,Paper 3`. Used to frame the lesson for the student (which paper, how many marks).

**`ao_level`** — The Assessment Objective level this lesson primarily targets. Values: `AO1`, `AO2`, `AO3`. Used to calibrate the depth and question style Mia applies. AO1 = recall; AO2 = application/analysis; AO3 = evaluation/synthesis.

---

## 3. Linked list curriculum structure

Every lesson in the curriculum is connected to the next via `next_lesson_code`. The structure is a singly linked list with exactly one terminal node (the final lesson, where `next_lesson_code IS NULL`).

### Why a linked list

A sequence number (e.g. `lesson_order INTEGER`) would require renumbering when lessons are inserted or reordered. A linked list allows a new lesson to be inserted anywhere by updating two rows: the predecessor's `next_lesson_code` and the new lesson's own `next_lesson_code`. No cascade.

### Terminal node convention

The final lesson of the curriculum must have `next_lesson_code = NULL`. Not the string `'NONE'`, not the string `'END'`, not `'null'`. SQL `NULL`.

**Bug:** An earlier IB Economics seed used `'NONE'` as the terminal value. The LESSON_COMPLETE handler checked `if (authoritativeNextCode && authoritativeNextCode !== 'NONE')` which correctly skipped advancement. But the signal parser also checked `nextLesson !== 'NONE'` at a different call site that did not have the guard. This caused a silent indefinite-advance condition on one edge path. The guard was corrected but the underlying convention — always use SQL NULL — was established to eliminate the need for string comparisons entirely.

### Verification queries

Run both of these after seeding or modifying any curriculum. Replace `IB_BM_%` with the appropriate product prefix.

```sql
-- 1. Exactly one terminal lesson (returns 1 row):
SELECT lesson_code
FROM lessons
WHERE lesson_code LIKE 'IB_BM_%'
  AND next_lesson_code IS NULL;

-- 2. No orphan pointers (returns 0 rows):
SELECT lesson_code, next_lesson_code
FROM lessons
WHERE lesson_code LIKE 'IB_BM_%'
  AND next_lesson_code IS NOT NULL
  AND next_lesson_code NOT IN (SELECT lesson_code FROM lessons);
```

If query 1 returns 0 rows: the terminal node is missing or has a non-NULL value where it should be NULL.

If query 1 returns more than 1 row: the curriculum has been split into multiple disconnected chains. There is a break somewhere.

If query 2 returns any rows: a `next_lesson_code` value points to a lesson code that does not exist. This will cause the LESSON_COMPLETE handler to fail silently (it tries to look up the lesson and gets no row back, leaving `current_lesson_code` stale).

---

## 4. HL/SL flagging convention

### Lesson name prefix

HL-only lessons have their `lesson_name` prefixed with `[HL] ` (square brackets, uppercase HL, a single space, then the name).

Examples:
```
[HL] PED Along a Straight-Line Demand Curve
[HL] Asymmetric Information — Adverse Selection
[HL] Critical Path Analysis Toolkit
```

SL-only lessons and lessons taught to both SL and HL students have no prefix.

### Application-layer skipping

When a student at SL level encounters an `[HL]` lesson via `next_lesson_code`, the application layer skips it and advances to the following lesson. This is currently implemented in the route handler when building the Anthropic prompt context. It is **application logic**, not a database constraint. The lessons table contains all lessons for all levels in sequence; the application decides which to surface.

There is no `hl_only` boolean column. The `[HL] ` prefix in `lesson_name` is the flag. Checking for `lesson_name.startsWith('[HL]')` is the correct detection method.

### Implications for new products

Any exam product with a tiered structure (e.g. A-Level AS vs A2, ACCA F1 vs P1, Foundation vs Higher) must establish its own naming convention for the tier-specific lessons and document it here before seeding. Do not assume `[HL]` applies to non-IB products.

---

## 5. Inline subtopic vs standalone unit treatment (CRITICAL — Toolkit pattern)

This is the section most likely to cause a structural bug on a new product. Read it carefully.

### The problem

Some syllabi include analytical toolkits, cross-unit synthesis content, or bridging lessons that are not core content for any single unit, but are taught at specific points during the curriculum. The IBO Business Management syllabus has a "Business Management Toolkit" with this character.

The placement of these lessons in the linked list determines their `unit_code`. Getting this wrong causes `UNIT_COMPLETE` to fire at the wrong time.

### Pattern A — Inline within a numbered unit

The lesson sits **between core teaching lessons and the unit consolidation lesson** of a numbered unit. It is delivered mid-unit, not as a standalone cluster.

Example: `IB_BM_014` (Business Management Toolkit — Introduction and SL Tools) sits after `IB_BM_013` (Multinational Companies) and before `IB_BM_015` (Unit 1 Consolidation). Structurally, it is a Unit 1 lesson.

For Pattern A: **set `unit_code` to the parent numbered unit** (`IB_BM_UNIT_1`), not to a toolkit unit. If it carries `unit_code = IB_BM_UNIT_TOOLKIT`, the UNIT_COMPLETE handler sees a unit boundary when the student moves from `IB_BM_013` to `IB_BM_014`, fires UNIT_COMPLETE prematurely, and closes Unit 1 before its consolidation lesson.

### Pattern B — Standalone end-of-curriculum cluster

The lessons sit **after the final numbered unit's consolidation**, forming their own cluster covering cross-unit synthesis, course revision, and exam-specific tools.

Example: `IB_BM_124`–`IB_BM_136` (SWOT applications, STEEPLE, descriptive statistics, paper 3 technique, course revision) sit after `IB_BM_123` (Operations Unit Consolidation). These form a legitimate standalone unit.

For Pattern B: **set `unit_code` to the dedicated toolkit unit** (`IB_BM_UNIT_TOOLKIT`).

### Decision rule

> If a lesson sits between core teaching and the consolidation lesson of a numbered unit, it is Pattern A (parent unit_code).
> If a lesson sits after the final consolidation in its own named cluster, it is Pattern B (standalone unit_code).

When the lesson could plausibly be either, prefer Pattern A to avoid creating a fragmented or prematurely-terminated unit.

### The bug this caused

The first unit_code reconciliation migration (commit `7078dc5`) assigned `unit_code = 'IB_BM_UNIT_TOOLKIT'` to every lesson with `topic_code = 'TK'`, regardless of where in the sequence it sat. Seven inline lessons were mis-assigned:

| lesson_code | Inline position | Wrong unit_code assigned | Correct unit_code |
|-------------|-----------------|--------------------------|-------------------|
| IB_BM_014 | Between Unit 1 core and consolidation | IB_BM_UNIT_TOOLKIT | IB_BM_UNIT_1 |
| IB_BM_045 | Between Unit 2 core and consolidation | IB_BM_UNIT_TOOLKIT | IB_BM_UNIT_2 |
| IB_BM_073 | Between Unit 3 core and consolidation | IB_BM_UNIT_TOOLKIT | IB_BM_UNIT_3 |
| IB_BM_093 | Between Unit 4 core and consolidation | IB_BM_UNIT_TOOLKIT | IB_BM_UNIT_4 |
| IB_BM_096 | Between Unit 4 core and consolidation | IB_BM_UNIT_TOOLKIT | IB_BM_UNIT_4 |
| IB_BM_121 | Between Unit 5 core and consolidation | IB_BM_UNIT_TOOLKIT | IB_BM_UNIT_5 |
| IB_BM_122 | Between Unit 5 core and consolidation | IB_BM_UNIT_TOOLKIT | IB_BM_UNIT_5 |

The symptom: UNIT_COMPLETE fired as students crossed into these inline lessons, because the handler saw the unit_code change from (e.g.) `IB_BM_UNIT_3` to `IB_BM_UNIT_TOOLKIT`. Unit 3 was marked complete before its consolidation lesson ran. Corrected in migration `20260515120000_fix_inline_toolkit_unit_codes.sql` (commit `f71f1d1`).

---

## 6. Signal format conventions

Mia emits four signals at defined points in the session. The signals are parsed by `lib/signal-parser.ts` and handled in `app/api/session/message/route.ts`. **The parser regex, the prompt instruction, and the handler must all agree on the format.**

### LESSON_COMPLETE

Emitted when a lesson is fully taught and the student has demonstrated understanding.

```
[LESSON_COMPLETE: <lesson_code> | weak_concepts:<concept_slug,concept_slug_or_NONE> | apply_scores:<score_or_N/A> | next_lesson:<next_lesson_code>]
```

Parser regex (from `lib/signal-parser.ts`):
```
/\[LESSON_COMPLETE:\s*(\S+)\s*\|\s*weak_concepts:([^|]+)\|\s*apply_scores:([^|]+)\|\s*next_lesson:([^\]]+)\]/i
```

Handler: reads `next_lesson_code` from the lessons table using the completed lesson code (not from the signal's `next_lesson` field — the DB is authoritative). Updates `student_progress.current_lesson_code`, `current_lesson_name`, and appends to `lessons_completed_this_unit`.

### LESSON_INCOMPLETE

Emitted when the session ends before the lesson finishes.

```
[LESSON_INCOMPLETE: <lesson_code> | last_concept_completed:<concept_name_or_NONE> | resume_from:<description>]
```

Parser regex:
```
/\[LESSON_INCOMPLETE:\s*(\S+)\s*\|\s*last_concept_completed:([^|]+)\|\s*resume_from:([^\]]+)\]/i
```

Handler: writes `resume_from_concept` to `student_progress`.

### UNIT_COMPLETE

Emitted in the same response as the final LESSON_COMPLETE of a unit, when the next lesson belongs to a different unit_code. Always emitted **before** LESSON_COMPLETE in the response text.

```
[UNIT_COMPLETE: <unit_code> | checkpoint_score:<n>/<m> | weak_topics_flagged:<topic_slug,topic_slug_or_NONE> | revision_sessions_inserted:<n>]
```

Parser regex:
```
/\[UNIT_COMPLETE:\s*(\S+)\s*\|\s*checkpoint_score:\s*(\d+\/\d+)\s*\|\s*weak_topics_flagged:\s*([^|]+?)\s*\|\s*revision_sessions_inserted:\s*(\d+)\]/i
```

Handler: described fully in Section 7.

### SESSION_SUMMARY

Emitted at the end of every session, after the final teaching message.

```
[SESSION_SUMMARY: session:<n> | type:<TYPE> | lesson:<lesson_code> | concepts_covered:<concept1,concept2> | lesson_complete:TRUE | weak_flags_this_session:<n> | apply_scores:<score_or_N/A> | session_flag:<flag_or_NONE> | next_action:<action>]
```

Parser regex:
```
/\[SESSION_SUMMARY:\s*session:(\d+)\s*\|\s*type:(\S+)\s*\|\s*lesson:(\S+)\s*\|\s*concepts_covered:([^|]+)\|\s*lesson_complete:(TRUE|FALSE)\s*\|\s*weak_flags_this_session:(\d+)\s*\|\s*apply_scores:([^|]+)\|\s*session_flag:([^|]+)\|\s*next_action:([^\]]+)\]/i
```

Handler: writes `last_session_summary`, updates `session_type`, `new_topic_session_count`, `spaced_rep_due`, `abq_drill_due` on `student_progress`. Also updates the `sessions` row with concepts covered, completion status, and next action.

### WEAK_AREA_FLAG

Emitted at the start of a response when a student gives a wrong or partial answer on the same concept for the second consecutive turn, or when a foundational misunderstanding is detected. Unlike the other three signals, this uses JSON not pipe-delimited format.

```
[WEAK_AREA_FLAG: { "topic": "<snake_case_slug>", "lesson_code": "<lesson_code>", "concept": "<one sentence describing the gap>", "severity": "minor|moderate|critical" }]
```

Parser: extracts the JSON body from between `[WEAK_AREA_FLAG:` and `]`, parses it with `JSON.parse()`, validates required fields (`lesson_code`, `concept`).

Handler: upserts to `weak_areas` table — inserts a new row on first occurrence, increments `occurrence_count` on repeat.

### The three-part sync rule

**If you change a signal's format, you must update all three of the following in the same commit:**

1. The prompt instruction text (Mia is told the format; she must be retold)
2. The parser regex in `lib/signal-parser.ts`
3. The handler in `app/api/session/message/route.ts` (if column mappings change)

**Bug:** The v1.2 prompt (commit `256a4ba`) changed WEAK_AREA_FLAG from pipe-delimited to JSON format to give the parser reliable structure. The parser regex was **not updated** in the same commit. The signal fired, the regex matched nothing, the handler received an empty array, and the entire weak-area detection feature silently did nothing for multiple sessions. Fixed in commit `6d86e8c` which updated the parser to extract and JSON.parse the signal body.

Subsequent signals have been made mechanically unmissable: WEAK_AREA_FLAG was moved to the top of the response text in v1.3 (commit `c8ca610`) and UNIT_COMPLETE was moved to the top of its response in v1.4 (commit `fb03f16`). This prevents token-budget truncation from silently cutting a signal that appears at the end of a long response.

---

## 7. The UNIT_COMPLETE handler logic

The UNIT_COMPLETE handler lives in `app/api/session/message/route.ts` in the signal processing block. It must perform five operations, in this order.

### Required operations

**1. Insert the completed unit into `unit_completions`** (audit table, upsert):
```typescript
await serviceSupabase.from('unit_completions').upsert({
  student_id: user.id,
  unit_code: uc.unitCode,
  completed_at: ...,
  session_number: ...,
  checkpoint_score: scoreNum,
  weak_topics_flagged: uc.weakTopicsFlagged,
  revision_sessions_inserted: uc.revisionSessionsInserted,
});
```

**2. Append to `student_progress.units_completed` (idempotent):**
```typescript
const completedUnits = (progress.units_completed as string[]) ?? [];
if (!completedUnits.includes(uc.unitCode)) {
  progressUpdates.units_completed = [...completedUnits, uc.unitCode];
}
```
The `includes` check prevents a duplicate unit code being appended if UNIT_COMPLETE fires twice on the same transition (e.g., due to a network retry).

**3. Look up the new unit's metadata from the lessons table:**
```typescript
const newLessonCode =
  (progressUpdates.current_lesson_code as string) ?? progress.current_lesson_code;
const { data: newLessonUnit } = await serviceSupabase
  .from('lessons')
  .select('unit_code, unit_name')
  .eq('lesson_code', newLessonCode)
  .single();
```
This uses the lesson code that LESSON_COMPLETE already advanced to, not the lesson code that was just completed.

**4. Update the three companion fields on `student_progress`:**
```typescript
progressUpdates.current_unit_code = newLessonUnit.unit_code;
progressUpdates.current_unit_name = newLessonUnit.unit_name;
progressUpdates.lessons_completed_this_unit = [];
```

**5. Edge case: if the lessons lookup fails**, log and preserve the `units_completed` append. Do not throw. The UNIT_COMPLETE partially succeeds rather than fully failing.
```typescript
} else {
  console.error(`UNIT_COMPLETE: lessons lookup failed for lesson_code=${newLessonCode}. ` +
    `units_completed appended but current_unit_* fields NOT updated.`);
}
```

All five operations flow into a single `student_progress` UPDATE at the end of signal processing, scoped by `student_id` AND `subject` (see Section 8).

### The original bug

The original handler used a hardcoded `UNIT_SEQUENCE` map:

```typescript
const UNIT_SEQUENCE: Record<string, { code: string; name: string }> = {
  UNIT_1: { code: 'UNIT_2', name: 'Business Management' },
  UNIT_2: { code: 'UNIT_3', name: 'Business Management (cont.)' },
  // ...
};
```

After the unit_code reconciliation migration, actual unit_code values were `IB_BM_UNIT_1`, `IB_BM_UNIT_2`, etc. The map had keys `UNIT_1`, `UNIT_2`. The lookup `UNIT_SEQUENCE[uc.unitCode]` always returned `undefined`. The `if (nextUnit)` block never executed. `current_unit_code`, `current_unit_name`, and `lessons_completed_this_unit` were never updated. A student who crossed a unit boundary saw the correct lesson but stale unit context for the remainder of their time in the new unit.

Fixed in commit `6fa0177` by replacing the hardcoded map with a DB lookup.

---

## 8. Bundle scoping (cross-subject data isolation)

### The rule

Every read and write to `student_progress`, `weak_areas`, and `sessions` that could affect a bundle student must be filtered by **both `student_id` AND `subject`**.

```typescript
// Correct:
.eq('student_id', user.id)
.eq('subject', effectiveSubject)

// Wrong — will match the wrong row for a bundle student:
.eq('student_id', user.id)
```

### Why this matters

A bundle student (IB_BUNDLE plan) has one profile row and multiple rows in `student_progress` — one for `IB_ECONOMICS` and one for `IB_BUSINESS`. A query that filters only on `student_id` will non-deterministically return either subject's row, depending on Postgres row order. Writes without the subject filter corrupt the wrong subject's progress.

This is not an error that surfaces loudly. The student's lesson advances in one subject while the other subject's progress is corrupted. Both rows continue to exist. The corrupted row may not be noticed until the student switches subjects.

### effectiveSubject derivation

The `effectiveSubject` is derived from the session's `lesson_code`, not from the student's plan tier:

```typescript
const effectiveSubject = session.lesson_code?.startsWith('IB_ECON_') ? 'IB_ECONOMICS'
  : session.lesson_code?.startsWith('IB_BM_') ? 'IB_BUSINESS'
  : 'LC_BUSINESS';
```

A bundle student in an Economics session has `effectiveSubject = 'IB_ECONOMICS'`. Their Business progress row is untouched. This is the correct behaviour.

### Code review checkpoint

Before merging any route handler that touches `student_progress`, `weak_areas`, or `sessions`: verify that every query targeting those tables explicitly includes `.eq('subject', effectiveSubject)` or equivalent. A missing subject filter is a silent data corruption risk.

---

## 9. System prompt vs lessons table — content alignment

### The source of truth hierarchy

```
lessons table  >  system prompt  >  live session context
```

The lessons table is the source of truth for lesson names and unit names. The system prompt must match it. Live session context (injected via `{{CURRENT_LESSON_NAME}}`, `{{CURRENT_UNIT_NAME}}`) is derived from the lessons table at runtime.

### What must be aligned

The system prompt contains lesson code references in two places:
1. **Signal examples** in the LESSON_COMPLETE and UNIT_COMPLETE protocol sections — these name specific lesson codes and their titles to illustrate the format
2. **Default values** in `lib/system-prompt.ts` (the fallback when `student_progress` has no row yet)

Both must match the lessons table exactly.

### The drift found in the IB build

During prompt v1.7 reconciliation (commit `e157b73`), the following drifts were found by querying the live lessons table and comparing against prompt signal examples:

| Location | Lesson code | Prompt had | DB had |
|---|---|---|---|
| IB Business UNIT_COMPLETE example | IB_BM_012 | "Unit 1 Review and Checkpoint" | "External Growth Methods — M&As, Joint Ventures, Alliances, Franchising" |
| IB Business UNIT_COMPLETE example | IB_BM_013 | "Human Resource Planning — Unit 2" | "Multinational Companies (MNCs) — Impact on Host Countries" (still Unit 1) |
| IB Business counter-example | IB_BM_010 | "Multinational Corporations" | "Economies and Diseconomies of Scale" |
| IB Economics UNIT_COMPLETE example | IB_ECON_013 | "History of Economic Thought" | "Unit 1 Consolidation and Exam Practice" |
| IB Economics UNIT_COMPLETE example | IB_ECON_014 | "The Law of Demand" | "The Law of Demand and the Demand Curve" |
| IB Economics counter-example | IB_ECON_010 | "Government, Banks and the Foreign Sector" | "History of Economic Thought — 18th to 20th Century" |

The Business prompt example was also factually wrong about which lessons mark the Unit 1 / Unit 2 boundary: it cited IB_BM_012 → IB_BM_013 when the actual boundary is IB_BM_015 → IB_BM_016.

These drifts accumulate when curriculum content is revised after the prompt is written. The prompt is written first, the lesson list is adjusted during QA, and the signal examples are not updated.

### Audit procedure

Before scaling any product beyond ~50 active students, run the alignment audit:

1. Query `SELECT lesson_code, lesson_name FROM lessons WHERE lesson_code LIKE '<PREFIX>_%' ORDER BY lesson_code`.
2. Search both IB prompts for every lesson code referenced as a string (e.g. `IB_BM_015`).
3. Confirm the lesson name in the prompt matches the lessons table.
4. Confirm the unit boundary example uses the actual last lesson of a unit (check `next_lesson_code` crosses to a different `unit_code`).
5. If any drift: update the prompt and cut a new version. No migration needed — prompt changes don't affect the DB.

---

## 10. Migration discipline

### File naming

All schema and data changes go through a timestamped migration file in `supabase/migrations/`:

```
supabase/migrations/YYYYMMDDHHMMSS_description.sql
```

Example: `20260515120000_fix_inline_toolkit_unit_codes.sql`

Use 14-digit timestamps (date + HHMMSS). If two migrations are created on the same day, increment the time component even if they are created within seconds of each other.

### Migration requirements

Every migration must be:

**Idempotent** — safe to re-run without error or unintended effect. Use `IF EXISTS` / `IF NOT EXISTS` / `ON CONFLICT DO NOTHING` / `ON CONFLICT ... DO UPDATE`. For `UPDATE` statements, a second run is always safe (it updates rows to the value they already have). For `ALTER TABLE ADD COLUMN IF NOT EXISTS`, safe. For `ALTER TABLE RENAME COLUMN`, **not idempotent** — a second run errors. Wrap single-run-only operations in a `DO $$ BEGIN ... EXCEPTION WHEN ... END $$` block, or note explicitly in the file header that it must be run only once.

**Transactional** — wrap in `BEGIN; ... COMMIT;`. If any statement in the migration errors, the entire migration rolls back.

**Verified** — end every migration with `SELECT` queries that return either 0 rows (nothing went wrong) or expected counts. Example pattern:
```sql
-- Should return 0 rows (no orphan next_lesson_code):
SELECT lesson_code, next_lesson_code FROM lessons
WHERE lesson_code LIKE 'IB_BM_%'
  AND next_lesson_code IS NOT NULL
  AND next_lesson_code NOT IN (SELECT lesson_code FROM lessons);
```

**Scoped** — never write `UPDATE lessons SET ...` without a `WHERE` clause that restricts to the target product prefix. An unscoped update will affect LC Business, IB Economics, and any future product in the same table.

### Deployment model

Migrations are run manually in the Supabase SQL Editor, not auto-applied via CI. There is no Supabase CLI deploy step in the current pipeline. When a migration is committed to `main`, the developer runs it manually in Supabase and records that it has been applied.

Future work: automate migration tracking. For now, the convention is that a migration file in `supabase/migrations/` that is present in the `main` branch has been applied to production.

---

## 11. New product checklist

Use this checklist when seeding any new exam product. Do not start writing lessons until steps 1–3 are complete.

### Pre-seed decisions

**1. Establish the platform prefix.**
Choose a short, unambiguous, ALL_CAPS prefix. Examples: `ACCA_F1`, `ALEVEL_ECON`, `ALEVEL_BM`, `IGCSE_ECON`. The prefix appears in `lesson_code`, `unit_code`, and scopes all Supabase queries. It cannot be changed later without a rename migration across every affected table.

**2. Determine the unit structure from the syllabus spec.**
List every top-level unit with its canonical IBO/AQA/ACCA name. This becomes the `unit_name` for all lessons in that unit. Do not use sub-topic names.

**3. Decide the Toolkit treatment.**
For any cross-unit analytical content (toolkits, methodology units, exam technique clusters), decide for each lesson cluster:
- Pattern A (inline within a numbered unit, use parent `unit_code`) — if taught mid-unit
- Pattern B (standalone end-of-curriculum cluster, use dedicated `unit_code`) — if taught as a separate post-unit cluster

Document this decision in the product's seed migration header. Do not derive `unit_code` from a flag like `topic_code = 'TK'`. Always derive from sequence position.

### Seed and verify

**4. Write the system prompt.**
Follow the existing IB prompt structure: IDENTITY, AFFIRMATION_ACCURACY (mechanical rule), SESSION_CONTEXT, SCOPE, ASSESSMENT_STRUCTURE, COMMAND_TERM_PROTOCOL, CURRICULUM_KNOWLEDGE, TEACHING_METHODOLOGY, WEAK_AREA_DETECTION, SIGNAL_PROTOCOL, EXAM_TECHNIQUE, WHAT_YOU_NEVER_DO. Use the signal formats exactly as specified in Section 6. Persona is Mia.

**5. Generate the lesson seed migration.**
Write `INSERT INTO lessons (lesson_code, lesson_name, unit_code, unit_name, topic_code, next_lesson_code, papers, ao_level) VALUES (...)` for every lesson. The last lesson in the file must have `next_lesson_code = NULL` (not the string `'NONE'`).

**6. Verify the linked list terminates cleanly.**
Run the two verification queries from Section 3 before doing anything else. Fix any orphan pointers before proceeding.

**7. Verify Pattern A / Pattern B placement.**
For every lesson with a toolkit-style `topic_code`, confirm its `unit_code` matches its sequence position, not its topic classification.

### Wiring

**8. Add `effectiveSubject` derivation.**
In `app/api/session/message/route.ts`, extend the `effectiveSubject` ternary to recognise the new product's lesson_code prefix:
```typescript
const effectiveSubject = session.lesson_code?.startsWith('IB_ECON_') ? 'IB_ECONOMICS'
  : session.lesson_code?.startsWith('IB_BM_') ? 'IB_BUSINESS'
  : session.lesson_code?.startsWith('ACCA_F1_') ? 'ACCA_F1'   // ← add this
  : 'LC_BUSINESS';
```

**9. Test all four signals before scale.**
Manually trigger LESSON_COMPLETE, UNIT_COMPLETE, SESSION_SUMMARY, and WEAK_AREA_FLAG at least once each on a test account. Verify the database row updates are correct for each signal. Do not proceed to real students until all four have been confirmed working end-to-end.

**10. Add to Stripe pricing and onboarding.**
Add the new product's `priceId` to the Stripe configuration. Add the subject selector option to the onboarding flow (`app/(ib)/onboarding/page.tsx` or the appropriate route). Add to the subscription check middleware if the new product has its own access gate.

**11. Run the alignment audit.**
After the system prompt is finalised and the lessons are seeded, run the alignment audit from Section 9. Every lesson code named in the prompt must match the lessons table. Run before the first paying student.

---

*Last updated: 2026-05-15. Covers IB Business Management (IB_BM_001–136) and IB Economics (IB_ECON_001–210) builds. Update this document when new patterns are established or new bugs are resolved.*
