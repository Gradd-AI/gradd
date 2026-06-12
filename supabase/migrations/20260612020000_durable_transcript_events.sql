-- ============================================================
-- supabase/migrations/20260612020000_durable_transcript_events.sql
--
-- PURPOSE
-- Adds durable, append-only transcript storage (session_messages)
-- and structured pedagogical signal logging (session_events).
-- Also tracks the sessions table schema (created directly in the
-- Supabase SQL Editor and never previously tracked) and adds
-- the missing context columns (subject, unit_code, unit_name,
-- exam_level) with a best-effort backfill from existing data.
--
-- WHAT THIS MIGRATION DOES NOT INCLUDE (follow-up work)
--
-- (a) TypeScript cutover: message/route.ts still writes to
--     sessions.message_history. A separate PR must add writes
--     to session_messages and session_events on every turn,
--     update start/route.ts to stamp subject/unit_code/
--     unit_name/exam_level at session creation, and switch
--     the transcript-read path to session_messages.
--
-- (b) message_history column drop: keep sessions.message_history
--     in place until the TypeScript cutover is verified in
--     production. Drop it in a follow-up migration once reads
--     and writes are fully switched over.
--
-- (c) LC WEAK_AREA_FLAG parser gap (pre-existing bug, separate
--     fix required): the LC Business prompt (lc_business_tutor_
--     system_prompt_v1_4.md) emits the OLD pipe-delimited format:
--       [WEAK_AREA_FLAG: {lesson_code} | {description} | {action}]
--     lib/signal-parser.ts only handles the IB JSON format:
--       [WEAK_AREA_FLAG: { "topic": "...", "lesson_code": "...", ... }]
--     LC weak-area flags are SILENTLY DROPPED — never written to
--     weak_areas and will not reach session_events either. Fix
--     separately (update LC prompt to emit JSON, or add a pipe-
--     format parse branch to signal-parser.ts). LC is parked
--     behind IB-then-APM priority; do not block this migration on it.
--
-- APPLY INSTRUCTIONS
-- Run manually in the Supabase SQL Editor. Verify both tables
-- exist and the backfill row counts look correct before committing
-- this file to source control.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 0. sessions — ADD MISSING CONTEXT COLUMNS
--
-- NOTE: sessions table already exists (RLS enabled, created via
-- SQL Editor pre-tracking). Schema documented in the column list
-- below; this migration only ADDs the missing context columns.
--
-- Existing columns (reference only — not recreated here):
--   id uuid PK, student_id uuid FK→auth.users, session_number int,
--   session_type text, lesson_code text, message_history jsonb,
--   raw_final_response text, input_tokens int, output_tokens int,
--   started_at timestamptz, ended_at timestamptz,
--   lesson_complete bool, weak_flags_count int, concepts_covered text[],
--   apply_scores text, session_flag text, next_action text
-- ────────────────────────────────────────────────────────────

-- Add context columns missing from the original schema.
-- These will be stamped at session-start time once the
-- TypeScript cutover (follow-up item a above) is done.
ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS subject    text,
  ADD COLUMN IF NOT EXISTS unit_code  text,
  ADD COLUMN IF NOT EXISTS unit_name  text,
  ADD COLUMN IF NOT EXISTS exam_level text;


-- ────────────────────────────────────────────────────────────
-- 1. SHARED APPEND-ONLY TRIGGER FUNCTION
--
-- Single function reused by both new tables. Raises a clear
-- exception on any UPDATE or DELETE attempt.
-- ────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION tgf_append_only()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION
    'Table "%" is append-only — % is not permitted on this table',
    TG_TABLE_NAME, TG_OP;
END;
$$;


-- ────────────────────────────────────────────────────────────
-- 2. session_messages — one row per turn, immutable transcript
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS session_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- RESTRICT (not CASCADE): transcript/events are immutable; a session cannot
  -- be deleted while it has transcript rows. GDPR erasure is a deliberate,
  -- documented procedure — never a cascade side-effect.
  session_id  uuid        NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,

  student_id  uuid        NOT NULL,
  role        text        NOT NULL CHECK (role IN ('user', 'assistant')),
  content     text        NOT NULL,
  turn_index  integer     NOT NULL,  -- 0-based; user turn N = index 2N, assistant = 2N+1
  created_at  timestamptz NOT NULL DEFAULT now(),

  -- Unique constraint prevents duplicate inserts and enables
  -- ON CONFLICT DO NOTHING in the backfill.
  CONSTRAINT session_messages_session_turn_unique
    UNIQUE (session_id, turn_index)
);

-- Append-only enforcement
CREATE TRIGGER trg_session_messages_immutable
  BEFORE UPDATE OR DELETE ON session_messages
  FOR EACH ROW EXECUTE FUNCTION tgf_append_only();

-- Primary access pattern: replay a full transcript in order
CREATE INDEX IF NOT EXISTS idx_session_messages_session_turn
  ON session_messages (session_id, turn_index);

-- RLS: students read their own transcript; all writes via service role
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_messages_select_own ON session_messages
  FOR SELECT USING (student_id = auth.uid());

-- No INSERT/UPDATE/DELETE policies — inserts are service-role only
-- (bypasses RLS); updates/deletes are blocked by trigger above.


-- ────────────────────────────────────────────────────────────
-- 3. session_events — structured pedagogical signal log
-- ────────────────────────────────────────────────────────────
--
-- event_type values map exactly to signals CURRENTLY emitted
-- and parsed (see lib/signal-parser.ts + message/route.ts):
--
--   lesson_complete   — [LESSON_COMPLETE: ...]
--   lesson_incomplete — [LESSON_INCOMPLETE: ...]
--   unit_complete     — [UNIT_COMPLETE: ...]
--   weak_area_flag    — [WEAK_AREA_FLAG: {...}]  (IB JSON only — LC gap noted above)
--   teach_back        — [TEACH_BACK: {...}]       (currently console.error only — not persisted)
--   session_summary   — [SESSION_SUMMARY: ...]
--   burn_wall         — [BURN_WALL]               (currently console.error only — not persisted)
--
-- Proposed event_data payload shapes:
--
--   lesson_complete:   { lesson_code, weak_concepts[], apply_scores, next_lesson }
--   lesson_incomplete: { lesson_code, last_concept_completed, resume_from }
--   unit_complete:     { unit_code, checkpoint_score, weak_topics_flagged[], revision_sessions_inserted }
--   weak_area_flag:    { topic, lesson_code, concept, severity }
--   teach_back:        { lesson_code, concept }
--   session_summary:   { session, type, lesson, concepts_covered[], lesson_complete,
--                        weak_flags_count, apply_scores, session_flag, next_action }
--   burn_wall:         { subject, teach_throughs_before_burn, bucket }

CREATE TABLE IF NOT EXISTS session_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

  -- RESTRICT (not CASCADE): transcript/events are immutable; a session cannot
  -- be deleted while it has transcript rows. GDPR erasure is a deliberate,
  -- documented procedure — never a cascade side-effect.
  session_id  uuid        NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,

  student_id  uuid        NOT NULL,
  subject     text,                   -- denormalised from sessions for direct query
  lesson_code text,                   -- denormalised for per-lesson signal queries

  -- Promoted from event_data: the misconception/concept identifier.
  -- Populated at write-time for weak_area_flag (topic/concept field) and
  -- teach_back (concept field). NULL for event types that carry no concept.
  -- Promoted because "which misconceptions recur for this student" is the
  -- core adaptive-teaching + progress query — too hot to bury in JSONB.
  concept     text,

  event_type  text        NOT NULL CHECK (event_type IN (
    'lesson_complete',
    'lesson_incomplete',
    'unit_complete',
    'weak_area_flag',
    'teach_back',
    'session_summary',
    'burn_wall'
  )),
  event_data  jsonb       NOT NULL DEFAULT '{}',  -- full signal payload
  turn_index  integer,                -- nullable — links to session_messages row
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Append-only enforcement
CREATE TRIGGER trg_session_events_immutable
  BEFORE UPDATE OR DELETE ON session_events
  FOR EACH ROW EXECUTE FUNCTION tgf_append_only();

-- Core adaptive-teaching query: "which misconceptions recur for this student?"
-- Partial index (WHERE concept IS NOT NULL) excludes the ~50% of rows that
-- are lesson_complete / session_summary / burn_wall events with no concept.
CREATE INDEX IF NOT EXISTS idx_session_events_student_concept
  ON session_events (student_id, subject, concept)
  WHERE concept IS NOT NULL;

-- "All events in a session, in order"
CREATE INDEX IF NOT EXISTS idx_session_events_session_turn
  ON session_events (session_id, turn_index);

-- "All events of a given type for a student" (analytics / admin)
CREATE INDEX IF NOT EXISTS idx_session_events_student_subject_type
  ON session_events (student_id, subject, event_type);

-- RLS
ALTER TABLE session_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY session_events_select_own ON session_events
  FOR SELECT USING (student_id = auth.uid());


-- ────────────────────────────────────────────────────────────
-- 4. BACKFILL A — stamp subject / unit_code / unit_name /
--    exam_level on existing sessions rows
-- ────────────────────────────────────────────────────────────

-- Step 1: join to lessons table for unit metadata + subject
UPDATE sessions s
SET
  subject   = CASE
                WHEN s.lesson_code LIKE 'IB_ECON_%' THEN 'IB_ECONOMICS'
                WHEN s.lesson_code LIKE 'IB_BM_%'   THEN 'IB_BUSINESS'
                ELSE 'LC_BUSINESS'
              END,
  unit_code = l.unit_code,
  unit_name = l.unit_name
FROM lessons l
WHERE l.lesson_code = s.lesson_code
  AND s.subject IS NULL;

-- Step 2: subject-only fallback for sessions whose lesson_code
-- has no matching lessons row
UPDATE sessions
SET subject = CASE
  WHEN lesson_code LIKE 'IB_ECON_%' THEN 'IB_ECONOMICS'
  WHEN lesson_code LIKE 'IB_BM_%'   THEN 'IB_BUSINESS'
  ELSE 'LC_BUSINESS'
END
WHERE subject IS NULL;

-- Step 3: exam_level from profiles (one profile per student).
-- Note: uses the current profile value — if a student changed
-- exam level after a session, the backfilled value will reflect
-- the current level, not the level at session time. Acceptable
-- for test-volume data.
UPDATE sessions s
SET exam_level = p.exam_level
FROM profiles p
WHERE p.id = s.student_id
  AND s.exam_level IS NULL;


-- ────────────────────────────────────────────────────────────
-- 5. BACKFILL B — migrate message_history JSONB
--    → session_messages rows
--
-- Guard: only processes sessions that have no rows yet in
-- session_messages — safe to re-run.
--
-- created_at timestamps are approximate (1-minute spacing
-- from started_at) because the JSONB blob carries no
-- per-message timestamps. This is acceptable for test data;
-- real rows written after the TypeScript cutover will have
-- accurate timestamps.
-- ────────────────────────────────────────────────────────────

INSERT INTO session_messages
  (session_id, student_id, role, content, turn_index, created_at)
SELECT
  s.id                              AS session_id,
  s.student_id                      AS student_id,
  (m.msg ->> 'role')::text          AS role,
  (m.msg ->> 'content')::text       AS content,
  (m.idx - 1)::integer              AS turn_index,  -- WITH ORDINALITY is 1-based → 0-based
  COALESCE(s.started_at, now())
    + ((m.idx - 1) * interval '1 minute') AS created_at
FROM sessions s,
     jsonb_array_elements(s.message_history) WITH ORDINALITY AS m(msg, idx)
WHERE s.message_history IS NOT NULL
  AND jsonb_array_length(s.message_history) > 0
  AND (m.msg ->> 'role')    IN ('user', 'assistant')
  AND (m.msg ->> 'content') IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM session_messages sm WHERE sm.session_id = s.id
  )
ON CONFLICT (session_id, turn_index) DO NOTHING;

-- No backfill for session_events: historical signals are already
-- reflected in weak_areas, lesson_completions, and unit_completions.
-- Re-parsing raw message content to reconstruct signal rows is not
-- worth the complexity for test-volume data.
