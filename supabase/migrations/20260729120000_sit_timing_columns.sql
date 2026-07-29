-- 20260729120000_sit_timing_columns.sql
-- Per-requirement sit TIMING capture. Two nullable columns, no backfill, no data touched.
--
-- WHY: pacing diagnosis needs an interval per requirement, and today the only per-requirement
-- timestamp that survives a sit is `acca_case_progress.created_at` — which works only by
-- accident (nothing writes it, so the DB default lands at the moment of the insert) and is
-- corruptible: a practice turn on the same requirement creates the row early with a NULL
-- final_answer, and the later sit submit then updates it, leaving created_at pointing at the
-- practice turn rather than the submission. `updated_at` is worse: the marking pass
-- (app/api/acca/case/mark) rewrites it on every requirement, so after marking it is the
-- marking time, not the submission time.
--
-- submitted_at is therefore an EXPLICIT record written by the sit branch of
-- app/api/acca/case/turn at submission. Nothing else writes it, and NO code may derive timing
-- from created_at once this lands.
--
-- completed_at closes the last interval: `completed` is flipped by the sit's finish action
-- but records no instant, so the time after the final submission is currently uncapturable.
--
-- NO BACKFILL, deliberately. The 29 existing acca_case_progress rows are APM PRACTICE rows,
-- not sits — their created_at is a first-teach-turn time and inventing a submitted_at from it
-- would fabricate sit data that never existed. They stay NULL, which is the honest value.
-- AFM Mock Paper 1 is virgin (0 progress rows, 0 attempts) at the time of writing, so no sit
-- data is lost by adding this before the first sit rather than after.
--
-- Idempotent (ADD COLUMN IF NOT EXISTS) and transactional. Safe to re-run.

BEGIN;

-- ── 1. acca_case_progress.submitted_at ──
ALTER TABLE public.acca_case_progress
  ADD COLUMN IF NOT EXISTS submitted_at timestamptz NULL;

COMMENT ON COLUMN public.acca_case_progress.submitted_at IS
  'SIT ONLY. The instant the candidate submitted this requirement, written explicitly by the '
  'sit branch of app/api/acca/case/turn. NULL on practice rows and on any row never submitted '
  'under sit conditions. This is the ONLY column timing may be derived from: created_at is a '
  'DB default that a preceding practice turn can move, and updated_at is rewritten by the '
  'marking pass. Never written by marking, never updated after the first submission '
  '(submissions are immutable: a recorded final_answer returns 409).';

-- ── 2. acca_mock_attempts.completed_at ──
ALTER TABLE public.acca_mock_attempts
  ADD COLUMN IF NOT EXISTS completed_at timestamptz NULL;

COMMENT ON COLUMN public.acca_mock_attempts.completed_at IS
  'The instant `completed` was flipped true by the sit/mock finish action. NULL while an '
  'attempt is open, and NULL on attempts completed before this column existed. Closes the '
  'final requirement interval, which started_at alone cannot.';

COMMIT;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION — run AFTER the COMMIT above. Every query must return what is stated.
-- ═══════════════════════════════════════════════════════════════════════════════

-- V1. Both columns exist, are timestamptz, are NULLABLE, and carry NO default.
--     EXPECT exactly 2 rows: submitted_at and completed_at, is_nullable=YES, default NULL.
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN
      (('acca_case_progress', 'submitted_at'), ('acca_mock_attempts', 'completed_at'))
ORDER BY table_name;

-- V2. NO BACKFILL HAPPENED. Every existing row is NULL on the new columns.
--     EXPECT progress_rows 29, submitted_at_set 0, attempts 10, completed_at_set 0.
--     (Row counts are the pre-migration values — if either total has MOVED, the migration
--      did more than add columns and must be investigated before anything else.)
SELECT
  (SELECT count(*) FROM public.acca_case_progress)                            AS progress_rows,
  (SELECT count(*) FROM public.acca_case_progress WHERE submitted_at IS NOT NULL) AS submitted_at_set,
  (SELECT count(*) FROM public.acca_mock_attempts)                            AS attempts,
  (SELECT count(*) FROM public.acca_mock_attempts WHERE completed_at IS NOT NULL) AS completed_at_set;

-- V3. NOTHING ELSE MOVED on either table — the full column list, so a stray column or a
--     changed type shows up rather than being assumed absent.
--     EXPECT acca_case_progress: 16 columns (15 before + submitted_at).
--            acca_mock_attempts:  6 columns (5 before + completed_at).
SELECT table_name, count(*) AS columns
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('acca_case_progress', 'acca_mock_attempts')
GROUP BY table_name
ORDER BY table_name;

-- V4. AFM MOCK PAPER 1 IS STILL VIRGIN. Adding nullable columns cannot create or modify
--     rows, and this proves it rather than assuming it.
--     EXPECT 0, 0, 0.
SELECT
  (SELECT count(*) FROM public.acca_case_progress
     WHERE case_id IN ('aa000000-0000-4000-8000-00000000a001',
                       'aa000000-0000-4000-8000-00000000b101',
                       'aa000000-0000-4000-8000-00000000b201'))              AS afm_progress_rows,
  (SELECT count(*) FROM public.acca_mock_attempts WHERE mock_id = 'afm-paper-1') AS afm_attempts,
  (SELECT count(*) FROM public.acca_case_marking
     WHERE case_id IN ('aa000000-0000-4000-8000-00000000a001',
                       'aa000000-0000-4000-8000-00000000b101',
                       'aa000000-0000-4000-8000-00000000b201'))              AS afm_marking_rows;
