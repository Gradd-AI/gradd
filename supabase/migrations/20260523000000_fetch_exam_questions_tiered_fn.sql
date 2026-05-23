-- fetch_exam_questions_tiered — atomic tiered question lookup for Mia context injection.
--
-- Tier priority (CASE WHEN order):
--   1  exact lesson match (topic_code = p_lesson_code)
--   2  same unit, same paper as T1 hit  (preferred_paper = NULL → T2 never fires)
--   3  same unit, any paper
--   4  any seed question for this subject (subject-wide fallback)
--
-- p_unit_code: optional — if passed, skips the unit lookup subquery (use progress.current_unit_code).
-- SECURITY DEFINER: runs as function owner, bypassing RLS on questions/lessons.
-- VOLATILE: required because the final ORDER BY uses RANDOM().
-- Run in Supabase SQL Editor. Safe to re-run (CREATE OR REPLACE).

CREATE OR REPLACE FUNCTION fetch_exam_questions_tiered(
  p_lesson_code TEXT,
  p_subject     TEXT,
  p_levels      TEXT[],
  p_unit_code   TEXT DEFAULT NULL
)
RETURNS TABLE (
  id            UUID,
  question_text TEXT,
  context_text  TEXT,
  paper         TEXT,
  command_term  TEXT,
  marks         INT,
  ao_level      TEXT,
  level         TEXT,
  tier          INT
)
LANGUAGE SQL
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH current_unit AS (
    SELECT COALESCE(
      p_unit_code,
      (SELECT unit_code FROM lessons WHERE lesson_code = p_lesson_code LIMIT 1)
    ) AS unit_code
  ),
  unit_lessons AS (
    SELECT lesson_code
    FROM   lessons
    WHERE  unit_code = (SELECT unit_code FROM current_unit)
  ),
  preferred_paper AS (
    SELECT paper
    FROM   questions
    WHERE  subject    = p_subject
      AND  status     = 'seed'
      AND  topic_code = p_lesson_code
      AND  level      = ANY(p_levels)
    GROUP  BY paper
    ORDER  BY COUNT(*) DESC, paper ASC
    LIMIT  1
  ),
  ranked AS (
    SELECT
      q.id,
      q.question_text,
      q.context_text,
      q.paper,
      q.command_term,
      q.marks,
      q.ao_level,
      q.level,
      CASE
        WHEN q.topic_code = p_lesson_code
          THEN 1
        WHEN q.topic_code IN (SELECT lesson_code FROM unit_lessons)
          AND q.paper = (SELECT paper FROM preferred_paper)
          THEN 2
        WHEN q.topic_code IN (SELECT lesson_code FROM unit_lessons)
          THEN 3
        ELSE 4
      END AS tier
    FROM questions q
    WHERE q.subject = p_subject
      AND q.status  = 'seed'
      AND q.level   = ANY(p_levels)
  )
  SELECT id, question_text, context_text, paper, command_term, marks, ao_level, level, tier
  FROM   ranked
  ORDER  BY tier ASC, RANDOM()
  LIMIT  3;
$$;

GRANT EXECUTE ON FUNCTION fetch_exam_questions_tiered(TEXT, TEXT, TEXT[], TEXT)
  TO authenticated, service_role;
