-- Fix: sync_student_progress_lesson_cache referenced `lessons` unqualified with no search_path.
-- When invoked inside the SECURITY DEFINER handle_new_user signup cascade, the restricted
-- search_path could not resolve the table → 42P01 → signup failed for all new users.
-- Fix: qualify table as public.lessons AND pin search_path. Logic otherwise unchanged.
-- (This function was previously created directly in the dashboard and untracked; this migration
--  brings it under version control.)

CREATE OR REPLACE FUNCTION public.sync_student_progress_lesson_cache()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public
AS $function$
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
    FROM public.lessons
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
$function$;
