-- ─────────────────────────────────────────────────────────────────────────────
-- Fix unit_code on 7 inline Toolkit lessons in IB Business Management.
--
-- Background: yesterday's reconciliation migration assigned every TK-flagged
-- lesson to IB_BM_UNIT_TOOLKIT. However, 7 of those lessons are NOT in a
-- standalone Toolkit unit — they're inline lessons within a numbered unit,
-- placed between unit core teaching and unit consolidation. This caused
-- UNIT_COMPLETE to fire incorrectly when students advanced through them.
--
-- Lessons 124–136 are the legitimate end-of-course Toolkit cluster and
-- remain as IB_BM_UNIT_TOOLKIT.
--
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- Reassign inline Toolkit lessons to their parent numbered unit
UPDATE lessons SET unit_code = 'IB_BM_UNIT_1' WHERE lesson_code = 'IB_BM_014';
UPDATE lessons SET unit_code = 'IB_BM_UNIT_2' WHERE lesson_code = 'IB_BM_045';
UPDATE lessons SET unit_code = 'IB_BM_UNIT_3' WHERE lesson_code = 'IB_BM_073';
UPDATE lessons SET unit_code = 'IB_BM_UNIT_4' WHERE lesson_code = 'IB_BM_093';
UPDATE lessons SET unit_code = 'IB_BM_UNIT_4' WHERE lesson_code = 'IB_BM_096';
UPDATE lessons SET unit_code = 'IB_BM_UNIT_5' WHERE lesson_code = 'IB_BM_121';
UPDATE lessons SET unit_code = 'IB_BM_UNIT_5' WHERE lesson_code = 'IB_BM_122';

-- Verification: lessons 124–136 should still be IB_BM_UNIT_TOOLKIT
SELECT 'End-of-course Toolkit cluster' AS check_label,
       COUNT(*) AS lessons_in_toolkit
FROM lessons
WHERE lesson_code LIKE 'IB_BM_%'
  AND unit_code = 'IB_BM_UNIT_TOOLKIT';
-- Expected: 13

-- Verification: per-unit lesson counts after fix
SELECT unit_code, COUNT(*) AS lessons
FROM lessons
WHERE lesson_code LIKE 'IB_BM_%'
GROUP BY unit_code
ORDER BY unit_code;
-- Expected (approximate):
-- IB_BM_UNIT_1        ~15 (was 14; +IB_BM_014)
-- IB_BM_UNIT_2        ~30 (was 29; +IB_BM_045)
-- IB_BM_UNIT_3        ~28 (was 27; +IB_BM_073)
-- IB_BM_UNIT_4        ~24 (was 22; +IB_BM_093, IB_BM_096)
-- IB_BM_UNIT_5        ~26 (was 24; +IB_BM_121, IB_BM_122)
-- IB_BM_UNIT_TOOLKIT  13

-- Verification: no student_progress row points to a lesson whose unit_code
-- disagrees with student_progress.current_unit_code (post-fix)
SELECT 'Unit code mismatch' AS issue,
       sp.subject, sp.current_lesson_code, sp.current_unit_code AS progress_unit,
       l.unit_code AS lessons_unit
FROM student_progress sp
JOIN lessons l ON l.lesson_code = sp.current_lesson_code
WHERE sp.current_unit_code != l.unit_code
  AND sp.subject = 'IB_BUSINESS';
-- Expected: 0 rows

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- POST-MIGRATION: Reset testbundle@gradd.ai test corruption (run manually
-- in the Supabase SQL editor after the migration succeeds).
-- ─────────────────────────────────────────────────────────────────────────────
--
-- UPDATE student_progress
-- SET
--   current_lesson_code            = 'IB_BM_001',
--   current_lesson_name            = 'What is a Business?',
--   current_unit_code              = 'IB_BM_UNIT_1',
--   current_unit_name              = 'Business Organisation and Environment',
--   lessons_completed_this_unit    = '[]'::jsonb,
--   units_completed                = '[]'::jsonb,
--   total_session_count            = 0
-- WHERE student_id = (SELECT id FROM profiles WHERE email = 'testbundle@gradd.ai')
--   AND subject = 'IB_BUSINESS';
--
-- DELETE FROM weak_areas
-- WHERE student_id = (SELECT id FROM profiles WHERE email = 'testbundle@gradd.ai');
