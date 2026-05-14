-- ─────────────────────────────────────────────────────────────────────────────
-- Reconcile unit_code conventions between lessons and student_progress tables.
--
-- BEFORE:
--   lessons.unit_code = "1.1", "2.10", "TK" (IBO sub-topic codes)
--   student_progress.current_unit_code = "IB_ECON_UNIT_1", "IB_BM_UNIT_1"
--   → Formats don't match, LESSON_COMPLETE writes silently fail to align units
--
-- AFTER:
--   lessons.topic_code = "1.1", "2.10", "TK" (preserved for syllabus references)
--   lessons.unit_code = "IB_ECON_UNIT_1", "IB_BM_UNIT_TOOLKIT" (matches student_progress)
--
-- Idempotent: safe to re-run via IF NOT EXISTS / IF EXISTS guards.
-- Run manually in Supabase SQL Editor.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- STEP 1: Rename existing unit_code → topic_code (preserves IBO spec references)
ALTER TABLE lessons
  RENAME COLUMN unit_code TO topic_code;

-- STEP 2: Add new unit_code column for top-level subject-prefixed unit identifier
ALTER TABLE lessons
  ADD COLUMN IF NOT EXISTS unit_code TEXT;

-- STEP 3: Populate unit_code for IB Economics lessons
-- Section 1.x → IB_ECON_UNIT_1, 2.x → IB_ECON_UNIT_2, etc.
UPDATE lessons
SET unit_code = 'IB_ECON_UNIT_' || split_part(topic_code, '.', 1)
WHERE lesson_code LIKE 'IB_ECON_%';

-- STEP 4: Populate unit_code for IB Business Management lessons
-- Section 1.x–5.x → IB_BM_UNIT_n, TK → IB_BM_UNIT_TOOLKIT
UPDATE lessons
SET unit_code = CASE
  WHEN topic_code = 'TK' THEN 'IB_BM_UNIT_TOOLKIT'
  ELSE 'IB_BM_UNIT_' || split_part(topic_code, '.', 1)
END
WHERE lesson_code LIKE 'IB_BM_%';

-- STEP 5: Populate unit_code for LC Business lessons (preserve existing pattern)
-- LC lessons currently use topic codes like "1.1.1" — top-level unit is the first segment
UPDATE lessons
SET unit_code = 'UNIT_' || split_part(topic_code, '.', 1)
WHERE lesson_code NOT LIKE 'IB_%' AND topic_code IS NOT NULL;

-- STEP 6: Fix stray student_progress row with non-prefixed unit_code
-- One IB Economics student still has current_unit_code = 'UNIT_1' from before the prefix convention
UPDATE student_progress
SET current_unit_code = 'IB_ECON_UNIT_1'
WHERE subject = 'IB_ECONOMICS' AND current_unit_code = 'UNIT_1';

-- STEP 7: Verification queries (will return rows if anything is wrong)
-- Any lessons row with NULL unit_code after migration:
SELECT 'NULL unit_code in lessons' AS issue, lesson_code, topic_code
FROM lessons
WHERE unit_code IS NULL;

-- Any unit_code mismatch between student_progress and lessons for the same lesson_code:
SELECT 'Unit code mismatch' AS issue,
       sp.subject, sp.current_lesson_code, sp.current_unit_code AS progress_unit,
       l.unit_code AS lessons_unit
FROM student_progress sp
JOIN lessons l ON l.lesson_code = sp.current_lesson_code
WHERE sp.current_unit_code != l.unit_code;

-- Counts per unit (sanity check):
SELECT
  CASE
    WHEN lesson_code LIKE 'IB_ECON_%' THEN 'IB_ECON'
    WHEN lesson_code LIKE 'IB_BM_%' THEN 'IB_BM'
    ELSE 'LC'
  END AS product,
  unit_code,
  COUNT(*) AS lessons
FROM lessons
WHERE lesson_code LIKE 'IB_%' OR lesson_code NOT LIKE 'IB_%'
GROUP BY product, unit_code
ORDER BY product, unit_code;

COMMIT;
