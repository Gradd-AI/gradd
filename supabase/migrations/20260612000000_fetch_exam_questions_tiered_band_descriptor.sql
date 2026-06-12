-- supabase/migrations/20260612000000_fetch_exam_questions_tiered_band_descriptor.sql
--
-- Adds band_descriptor to the mark_schemes LATERAL join in fetch_exam_questions_tiered.
-- Two changes vs previous live version:
--   1. scheme_type IN list: adds 'band_descriptor' (was 'content_checklist','hybrid' only)
--   2. ORDER BY CASE: band_descriptor = priority 3 (after content_checklist=1, hybrid=2)
-- Everything else preserved verbatim from live function as of 2026-06-12.

CREATE OR REPLACE FUNCTION public.fetch_exam_questions_tiered(p_lesson_code text, p_subject text, p_levels text[], p_unit_code text DEFAULT NULL::text)
 RETURNS TABLE(id uuid, question_text text, context_text text, paper text, command_term text, marks integer, ao_level text, level text, tier integer, scheme_data jsonb, scheme_type text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  WITH lessons_subject AS (
    SELECT CASE WHEN p_subject = 'IB_BUSINESS_MANAGEMENT' THEN 'IB_BUSINESS' ELSE p_subject END AS s
  ),
  current_unit AS (
    SELECT COALESCE(p_unit_code,
      (SELECT unit_code FROM lessons WHERE lesson_code = p_lesson_code AND subject = (SELECT s FROM lessons_subject) LIMIT 1)) AS unit_code
  ),
  unit_lessons AS (
    SELECT lesson_code FROM lessons
    WHERE unit_code = (SELECT unit_code FROM current_unit) AND subject = (SELECT s FROM lessons_subject)
  ),
  preferred_paper AS (
    SELECT paper FROM questions
    WHERE subject = p_subject AND status = 'seed' AND topic_code = p_lesson_code AND level = ANY(p_levels)
    GROUP BY paper ORDER BY COUNT(*) DESC, paper ASC LIMIT 1
  ),
  ranked AS (
    SELECT q.id, q.question_text, q.context_text, q.paper, q.command_term, q.marks, q.ao_level, q.level,
      CASE
        WHEN q.topic_code = p_lesson_code THEN 1
        WHEN q.topic_code IN (SELECT lesson_code FROM unit_lessons) AND q.paper = (SELECT paper FROM preferred_paper) THEN 2
        WHEN q.topic_code IN (SELECT lesson_code FROM unit_lessons) THEN 3
        ELSE 4
      END AS tier
    FROM questions q
    WHERE q.subject = p_subject AND q.status = 'seed' AND q.level = ANY(p_levels)
  )
  SELECT r.id, r.question_text, r.context_text, r.paper, r.command_term, r.marks, r.ao_level, r.level, r.tier, ms.scheme_data, ms.scheme_type
  FROM ranked r
  LEFT JOIN LATERAL (
    SELECT scheme_data, scheme_type FROM mark_schemes
    WHERE question_id = r.id AND status = 'seed'
      AND scheme_type IN ('content_checklist','hybrid','band_descriptor')
    ORDER BY CASE scheme_type WHEN 'content_checklist' THEN 1 WHEN 'hybrid' THEN 2 WHEN 'band_descriptor' THEN 3 END
    LIMIT 1
  ) ms ON true
  ORDER BY r.tier ASC, RANDOM() LIMIT 3;
$function$;

GRANT EXECUTE ON FUNCTION public.fetch_exam_questions_tiered(text, text, text[], text)
  TO authenticated, service_role;
