-- supabase/migrations/20260603000000_create_drills_table.sql
--
-- ACCA APM drills table — stores generated practice drills keyed to framework LO codes.
-- Each drill carries: student-facing prompt, hint (attempt 1), full teaching (attempt 2),
-- answer rubric (answer_check), and common misconceptions used by the HINT_GIVEN classifier.
--
-- Idempotent: CREATE TABLE IF NOT EXISTS; DO-block guards on trigger and policies.
-- Transactional: BEGIN / COMMIT.
--
-- RLS:
--   anon:         NO policy — zero access (answer/teaching/rubric columns must not leak).
--                 Access is exclusively via a service-role API route that gates fields
--                 by attempt-stage. No anon SELECT, INSERT, UPDATE, or DELETE.
--   service_role: ALL — generator inserts candidates, admin promotes to seed.
--
-- handle_updated_at():
--   First tracked definition is 20260526120000_create_mark_schemes_table.sql.
--   CREATE OR REPLACE is re-used here as an idempotent safety net — body is identical.
--   Safe to re-run whether the function already exists or not.

BEGIN;

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS drills (
  id                      uuid          PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Framework identity
  subject                 text          NOT NULL,            -- 'ACCA_APM'
  lo_code                 text          NOT NULL,            -- e.g. 'B1c', 'A1e'
  topic                   text          NOT NULL,            -- verbatim from SYLLABUS_MAP
  command_verb            text          NOT NULL,            -- e.g. 'calculate', 'evaluate'
  intellectual_level      int           NOT NULL
                            CHECK (intellectual_level IN (2, 3)),
  professional_skill_tag  text,                              -- nullable; one of the 4 APM skills
  calculation_required    boolean       NOT NULL,
  marks_guide             int,                               -- suggested mark allocation

  -- Drill content (never exposed to anon — service-role API gates by attempt-stage)
  student_prompt          text          NOT NULL,            -- scenario + stem; no answer leakage
  hint                    text          NOT NULL,            -- single nudge for attempt 1
  full_teaching           text          NOT NULL,            -- model answer + explanation, attempt 2
  answer_check            jsonb         NOT NULL,            -- rubric: expected values or judgement points
  common_misconceptions   jsonb         NOT NULL,            -- typical wrong answers; anchors hint + classifier

  -- Review lifecycle — mirrors questions table convention
  status                  text          NOT NULL DEFAULT 'candidate'
                            CHECK (status IN ('candidate', 'seed', 'rejected')),
  verification_status     text                   DEFAULT 'unverified'
                            CHECK (verification_status IN ('unverified', 'pass', 'borderline', 'fail')),
  verification_notes      jsonb,
  verified_at             timestamptz,
  approved_by             uuid          REFERENCES auth.users(id),
  approved_at             timestamptz,

  created_at              timestamptz   NOT NULL DEFAULT now(),
  updated_at              timestamptz   NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

-- Primary drill lookup: fetch all seed drills for a given LO
CREATE INDEX IF NOT EXISTS idx_drills_subject_lo_status
  ON drills(subject, lo_code, status);

-- Status-sweep queries (candidate review, seed counts)
CREATE INDEX IF NOT EXISTS idx_drills_subject_status
  ON drills(subject, status);

-- LO-level joins from apm-framework (lo_code alone, cross-subject)
CREATE INDEX IF NOT EXISTS idx_drills_lo_code
  ON drills(lo_code);

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- First tracked definition: 20260526120000_create_mark_schemes_table.sql.
-- CREATE OR REPLACE: idempotent — re-declares with identical body whether or not it exists.

CREATE OR REPLACE FUNCTION handle_updated_at()
  RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname  = 'set_drills_updated_at'
      AND tgrelid = 'drills'::regclass
  ) THEN
    CREATE TRIGGER set_drills_updated_at
      BEFORE UPDATE ON drills
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE drills ENABLE ROW LEVEL SECURITY;

-- No anon policy: anon role receives zero access.
-- RLS is enabled, so the default-deny applies — no explicit DENY needed.
-- Drill content (hint, full_teaching, answer_check) must never reach the browser directly.

DO $$
BEGIN
  -- service_role: unrestricted — generator inserts candidates, admin promotes to seed.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename  = 'drills'
      AND policyname = 'drills_all_service_role'
  ) THEN
    CREATE POLICY drills_all_service_role
      ON drills
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;

-- ── Verification queries (run manually after applying) ────────────────────────
--
-- 1. Row count (expect 0 on fresh apply):
--    SELECT COUNT(*) FROM drills;
--
-- 2. Column list (expect 22 columns):
--    SELECT column_name, data_type, is_nullable
--    FROM information_schema.columns
--    WHERE table_name = 'drills'
--    ORDER BY ordinal_position;
--    -> id, subject, lo_code, topic, command_verb, intellectual_level,
--       professional_skill_tag, calculation_required, marks_guide,
--       student_prompt, hint, full_teaching, answer_check, common_misconceptions,
--       status, verification_status, verification_notes, verified_at,
--       approved_by, approved_at, created_at, updated_at
--
-- 3. Indexes (expect 4: pkey + 3 named):
--    SELECT indexname FROM pg_indexes WHERE tablename = 'drills';
--    -> drills_pkey
--    -> idx_drills_subject_lo_status
--    -> idx_drills_subject_status
--    -> idx_drills_lo_code
--
-- 4. RLS policies (expect 1: ALL for service_role only — NO anon policy):
--    SELECT policyname, cmd, roles FROM pg_policies WHERE tablename = 'drills';
--    -> drills_all_service_role (ALL, {service_role})
--
-- 5. Trigger (expect 1):
--    SELECT tgname FROM pg_trigger WHERE tgrelid = 'drills'::regclass;
--    -> set_drills_updated_at
--
-- 6. Confirm anon gets nothing (RLS default-deny):
--    SET ROLE anon;
--    SELECT * FROM drills LIMIT 1;
--    -> expect 0 rows (not an error — just empty, because no policy grants access)
--    RESET ROLE;
--
-- 7. Confirm handle_updated_at() exists:
--    SELECT proname FROM pg_proc WHERE proname = 'handle_updated_at';
--    -> expect: handle_updated_at
