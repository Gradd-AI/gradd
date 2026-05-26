-- supabase/migrations/20260526120000_create_mark_schemes_table.sql
--
-- Layer 2: mark_schemes table — IBO mark scheme integration.
-- Stores mark schemes keyed to questions.id, supporting four scheme_type shapes:
--   content_checklist | band_descriptor | hybrid | criteria_marked
--
-- Idempotent: CREATE TABLE IF NOT EXISTS; DO-block guards on trigger and policies.
-- Transactional: BEGIN / COMMIT.
--
-- handle_updated_at(): no reference found in tracked migrations or codebase —
-- this is the first tracked definition. CREATE OR REPLACE is safe whether the
-- function already exists on the DB or not (body is identical to the Supabase
-- standard). If it was previously created manually in the SQL Editor, this
-- overwrites it with the same implementation.

BEGIN;

-- ── Table ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mark_schemes (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id         uuid        NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  subject             text        NOT NULL,        -- IB_BUSINESS_MANAGEMENT, IB_ECONOMICS, …
  exam_board          text        NOT NULL,        -- IBO, Cambridge, Edexcel, ACCA, CIMA
  scheme_type         text        NOT NULL
                        CHECK (scheme_type IN (
                          'content_checklist',
                          'band_descriptor',
                          'hybrid',
                          'criteria_marked'
                        )),
  max_marks           int         NOT NULL,
  scheme_data         jsonb       NOT NULL,        -- shape varies by scheme_type (see docs/LAYER_2_SPEC.md §2)
  valid_from          date        NOT NULL DEFAULT CURRENT_DATE,
  valid_to            date,                        -- NULL = currently valid
  source_reference    text,                        -- e.g. "IBO May 2023 P1 mark scheme"
  status              text        NOT NULL DEFAULT 'candidate'
                        CHECK (status IN ('candidate', 'seed', 'rejected')),
  verification_status text                 DEFAULT 'unverified',
  verification_notes  jsonb,
  verified_at         timestamptz,
  approved_by         uuid        REFERENCES auth.users(id),
  approved_at         timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_mark_schemes_question
  ON mark_schemes(question_id, valid_to);

CREATE INDEX IF NOT EXISTS idx_mark_schemes_subject_status
  ON mark_schemes(subject, status);

-- ── updated_at trigger ────────────────────────────────────────────────────────
-- CREATE OR REPLACE: first tracked definition; safe to re-run.

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
    WHERE tgname    = 'set_mark_schemes_updated_at'
      AND tgrelid   = 'mark_schemes'::regclass
  ) THEN
    CREATE TRIGGER set_mark_schemes_updated_at
      BEFORE UPDATE ON mark_schemes
      FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
  END IF;
END $$;

-- ── Row Level Security ────────────────────────────────────────────────────────

ALTER TABLE mark_schemes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  -- Authenticated users: read-only, seed-status rows only.
  -- candidate/rejected rows remain invisible to authenticated users;
  -- service_role client (used by all API routes and scripts) bypasses this.
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename  = 'mark_schemes'
      AND policyname = 'mark_schemes_read_authenticated'
  ) THEN
    CREATE POLICY mark_schemes_read_authenticated
      ON mark_schemes
      FOR SELECT
      TO authenticated
      USING (status = 'seed');
  END IF;

  -- Service role: unrestricted (generator, verifier, and admin UI all use
  -- the service-role client; no student-facing code writes to this table).
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename  = 'mark_schemes'
      AND policyname = 'mark_schemes_all_service_role'
  ) THEN
    CREATE POLICY mark_schemes_all_service_role
      ON mark_schemes
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

COMMIT;

-- ── Verification queries (run manually after applying) ────────────────────────
-- SELECT COUNT(*) FROM mark_schemes;
--   → expect 0 on fresh apply
--
-- SELECT indexname FROM pg_indexes WHERE tablename = 'mark_schemes';
--   → expect: mark_schemes_pkey, idx_mark_schemes_question, idx_mark_schemes_subject_status
--
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'mark_schemes';
--   → expect: mark_schemes_read_authenticated (SELECT), mark_schemes_all_service_role (ALL)
--
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'mark_schemes'::regclass;
--   → expect: set_mark_schemes_updated_at
