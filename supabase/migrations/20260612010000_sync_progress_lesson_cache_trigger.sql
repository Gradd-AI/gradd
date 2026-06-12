-- supabase/migrations/20260612010000_sync_progress_lesson_cache_trigger.sql
--
-- Prevents the denormalised lesson-name cache on student_progress from drifting
-- from the lessons table (source of truth).
--
-- Root cause: no FK between student_progress.current_lesson_code and lessons;
-- write paths relied on remembering to sync the three derived columns
-- (current_lesson_name, current_unit_code, current_unit_name). Any direct SQL
-- write (e.g. manual correction in Supabase SQL Editor) could silently desync
-- them — confirmed 12/06/2026 when wrong lesson name appeared in session opener
-- and dashboard.
--
-- Fix: BEFORE INSERT OR UPDATE trigger re-derives all three columns from
-- lessons on every write. Single indexed lookup; negligible cost.
-- Lenient on no-match (trigger does nothing if lesson_code not found).
-- IB_BUSINESS_MANAGEMENT subject is translated to IB_BUSINESS for the
-- lessons lookup (the two tables use different subject keys).

CREATE OR REPLACE FUNCTION sync_student_progress_lesson_cache()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_subject TEXT;
  v_lesson  RECORD;
BEGIN
  IF NEW.current_lesson_code IS NULL THEN
    RETURN NEW;
  END IF;

  v_subject := CASE WHEN NEW.subject = 'IB_BUSINESS_MANAGEMENT' THEN 'IB_BUSINESS' ELSE NEW.subject END;

  SELECT lesson_name, unit_code, unit_name
    INTO v_lesson
    FROM lessons
   WHERE lesson_code = NEW.current_lesson_code
     AND subject = v_subject
   LIMIT 1;

  IF FOUND THEN
    NEW.current_lesson_name := v_lesson.lesson_name;
    NEW.current_unit_code   := v_lesson.unit_code;
    NEW.current_unit_name   := v_lesson.unit_name;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_progress_lesson_cache ON student_progress;

CREATE TRIGGER trg_sync_progress_lesson_cache
  BEFORE INSERT OR UPDATE ON student_progress
  FOR EACH ROW
  EXECUTE FUNCTION sync_student_progress_lesson_cache();
