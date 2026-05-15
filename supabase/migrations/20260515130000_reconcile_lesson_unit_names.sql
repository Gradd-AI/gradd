-- ─────────────────────────────────────────────────────────────────────────────
-- Reconcile unit_name values in the IB Business Management lessons table.
--
-- BEFORE:
--   lessons.unit_name for IB_BM lessons = IBO sub-topic name (e.g. "Introduction
--   to HRM", "Organisational structure", "Marketing mix"). These sub-topic names
--   differ per lesson within the same unit, so student_progress.current_unit_name
--   flickers between sub-topics as the student advances, and Mia sees an
--   inconsistent CURRENT_UNIT_NAME in her injected prompt.
--
-- AFTER:
--   lessons.unit_name for each IB_BM unit = the canonical IBO top-level unit name,
--   consistent for all lessons within that unit. Matches IBO Business Management
--   Guide (First Assessment 2024) unit naming convention.
--
-- IB Economics: unit_names are already consistent canonical names — no changes.
-- LC Business: not touched.
--
-- Scoped exclusively to IB_BM lesson codes (lesson_code LIKE 'IB_BM_%').
-- Idempotent — safe to re-run.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

UPDATE lessons
SET unit_name = 'Business Organisation and Environment'
WHERE lesson_code LIKE 'IB_BM_%'
  AND unit_code = 'IB_BM_UNIT_1';
-- Covers IB_BM_001–015 (15 lessons)

UPDATE lessons
SET unit_name = 'Human Resource Management'
WHERE lesson_code LIKE 'IB_BM_%'
  AND unit_code = 'IB_BM_UNIT_2';
-- Covers IB_BM_016–045 (30 lessons)
-- Replaces fragmented sub-topic names: "Introduction to HRM",
-- "Organisational structure", "Leadership and management",
-- "Motivation and demotivation", "Organisational culture",
-- "Communication", "Industrial relations"

UPDATE lessons
SET unit_name = 'Finance and Accounts'
WHERE lesson_code LIKE 'IB_BM_%'
  AND unit_code = 'IB_BM_UNIT_3';
-- Covers IB_BM_046–073 (28 lessons)
-- Replaces: "Introduction to finance", "Sources of finance",
-- "Costs and revenues", "Final accounts", "Ratio analysis",
-- "Efficiency ratios", "Cash flow", "Investment appraisal", "Budgets"

UPDATE lessons
SET unit_name = 'Marketing'
WHERE lesson_code LIKE 'IB_BM_%'
  AND unit_code = 'IB_BM_UNIT_4';
-- Covers IB_BM_074–097 (24 lessons)
-- Replaces: "Introduction to marketing", "Marketing planning",
-- "Sales forecasting", "Market research", "Marketing mix",
-- "International marketing"

UPDATE lessons
SET unit_name = 'Operations Management'
WHERE lesson_code LIKE 'IB_BM_%'
  AND unit_code = 'IB_BM_UNIT_5';
-- Covers IB_BM_098–123 (26 lessons)
-- Replaces: "Introduction to operations", "Operations methods",
-- "Location", "Break-even analysis", "Lean production",
-- "Production planning", "Crisis management",
-- "Research and development", "Management information systems"

UPDATE lessons
SET unit_name = 'Business Management Toolkit'
WHERE lesson_code LIKE 'IB_BM_%'
  AND unit_code = 'IB_BM_UNIT_TOOLKIT';
-- Covers IB_BM_124–136 (13 lessons)
-- Standardises capitalisation from "Business management toolkit"

-- ── Verification ──────────────────────────────────────────────────────────────

-- Should return exactly 6 distinct unit_names for IB_BM lessons:
SELECT unit_code, unit_name, COUNT(*) AS lesson_count
FROM lessons
WHERE lesson_code LIKE 'IB_BM_%'
GROUP BY unit_code, unit_name
ORDER BY unit_code;
-- Expected:
-- IB_BM_UNIT_1    | Business Organisation and Environment | 15
-- IB_BM_UNIT_2    | Human Resource Management             | 30
-- IB_BM_UNIT_3    | Finance and Accounts                  | 28
-- IB_BM_UNIT_4    | Marketing                             | 24
-- IB_BM_UNIT_5    | Operations Management                 | 26
-- IB_BM_UNIT_TOOLKIT | Business Management Toolkit        | 13

-- Should return 0 rows (no stale sub-topic unit_names remaining):
SELECT lesson_code, unit_code, unit_name
FROM lessons
WHERE lesson_code LIKE 'IB_BM_%'
  AND unit_name NOT IN (
    'Business Organisation and Environment',
    'Human Resource Management',
    'Finance and Accounts',
    'Marketing',
    'Operations Management',
    'Business Management Toolkit'
  );

-- IB Economics unit_names — should all be canonical, no changes needed:
SELECT unit_code, unit_name, COUNT(*) AS lesson_count
FROM lessons
WHERE lesson_code LIKE 'IB_ECON_%'
GROUP BY unit_code, unit_name
ORDER BY unit_code;
-- Expected (unchanged):
-- IB_ECON_UNIT_1 | Introduction to Economics | 13
-- IB_ECON_UNIT_2 | Microeconomics            | 76
-- IB_ECON_UNIT_3 | Macroeconomics            | 62
-- IB_ECON_UNIT_4 | The global economy        | 59

-- Cross-check: any student_progress row still pointing at a stale unit_name
-- (only relevant if students are mid-unit — may return rows, which is expected;
-- those rows will self-correct on next UNIT_COMPLETE signal):
SELECT sp.student_id, sp.subject, sp.current_unit_code, sp.current_unit_name
FROM student_progress sp
WHERE sp.subject = 'IB_BUSINESS'
  AND sp.current_unit_name NOT IN (
    'Business Organisation and Environment',
    'Human Resource Management',
    'Finance and Accounts',
    'Marketing',
    'Operations Management',
    'Business Management Toolkit'
  );

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────
-- POST-MIGRATION: If any student is mid-unit and has a stale current_unit_name
-- in student_progress, run the following to correct it immediately:
--
-- UPDATE student_progress sp
-- SET current_unit_name = l.unit_name
-- FROM lessons l
-- WHERE l.lesson_code = sp.current_lesson_code
--   AND sp.subject = 'IB_BUSINESS'
--   AND sp.current_unit_name != l.unit_name;
-- ─────────────────────────────────────────────────────────────────────────────
