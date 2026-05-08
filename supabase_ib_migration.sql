-- IB Extension Schema Migration
-- Run this in the Supabase SQL Editor before testing the IB flow.
-- All statements are idempotent (safe to re-run).

-- ── profiles table ───────────────────────────────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'LC_BUSINESS';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ib_economics_level TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ib_business_level TEXT;

-- ── student_progress table ───────────────────────────────────────────────────
-- subject column lets Bundle students have two rows (one per subject)
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS subject TEXT DEFAULT 'LC_BUSINESS';
ALTER TABLE student_progress ADD COLUMN IF NOT EXISTS course_position TEXT;

-- Backfill existing LC rows so .eq('subject', ...) queries work correctly
UPDATE student_progress SET subject = 'LC_BUSINESS' WHERE subject IS NULL;
UPDATE profiles SET subject = 'LC_BUSINESS' WHERE subject IS NULL;

-- ── unique constraint on (student_id, subject) ───────────────────────────────
-- Required for onboarding upsert: .upsert(row, { onConflict: 'student_id,subject' })
-- If student_progress already has a UNIQUE constraint on student_id alone, drop it first:
--   SELECT conname FROM pg_constraint WHERE conrelid='student_progress'::regclass AND contype='u';
--   ALTER TABLE student_progress DROP CONSTRAINT <conname>;
-- Then run:
ALTER TABLE student_progress
  ADD CONSTRAINT IF NOT EXISTS student_progress_student_id_subject_key
  UNIQUE (student_id, subject);
