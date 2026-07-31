-- =============================================================================
-- 20260730120000_acca_weak_areas.sql
-- acca_weak_areas — the ACCA weakness ledger (per user, per LO, with its band).
-- =============================================================================
-- WHY A NEW TABLE RATHER THAN THE EXISTING `weak_areas` (Grant-ruled 2026-07-30):
--
--   `weak_areas` is LC/IB-shaped: (student_id, lesson_code, concept_slug,
--   error_description, recommended_action, session_number, occurrence_count).
--   Two things make it the wrong home for ACCA rows, and the second is the
--   decisive one:
--
--     1. SHAPE. `session_number` is LC session semantics a sit has no value for,
--        and `concept_slug` has no ACCA analogue — a sit's finding is an LO code
--        and a band, not a named misconception.
--     2. LEAK. app/dashboard/page.tsx:141 and app/api/cron/weekly-email/route.ts:159
--        both read `weak_areas` WITHOUT filtering by product. ACCA rows written
--        there would surface in LC students' dashboards and in their weekly emails.
--        That is a live-surface regression with no code change required to trigger
--        it, which is exactly the kind of thing a shared table does quietly.
--
--   So: a separate table, and `weak_areas` is not touched by this migration or by
--   any ACCA write path.
--
-- DESIGN NOTES:
--   * user_id is plain uuid, NOT FK'd to auth.users — matches acca_drill_attempts
--     and acca_tutor_progress, and keeps synthetic/demo uuids writable.
--   * lo_code is a denormalised text copy taken at write time (same choice, and the
--     same reason, as acca_drill_attempts.lo_code): weakness-by-LO needs no join.
--   * `source` distinguishes where the signal came from. A sit is a far stronger
--     signal than a single drill miss, and the selector must be able to tell them
--     apart rather than treating one mock as eight drill misses.
--   * case_id / requirement_id are nullable: a drill-sourced row has neither. They
--     are provenance, not identity — the ledger is keyed by (user, paper, lo, source).
--   * band is CHECKed against the five technical bands the marker actually emits
--     (lib/acca/case-marking.ts). A typo'd band would otherwise silently never match
--     the selector's weak-band test and the row would be inert.
--   * occurrence_count mirrors weak_areas' own idiom: repeat findings increment
--     rather than inserting duplicates. The unique index below is what makes the
--     upsert deterministic.
--   * resolved_at nullable; a resolved row stays for history and is excluded by the
--     partial index rather than deleted.
--   * RLS ON with NO permissive policy = service-role only, matching
--     acca_drill_attempts. Every writer and reader is a server route.
--
-- IDEMPOTENT: safe to run twice. TRANSACTIONAL: all-or-nothing.
-- Paste the whole block into the Supabase SQL Editor and run it as ONE statement.
-- =============================================================================

BEGIN;

-- ── Table ────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.acca_weak_areas (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid        NOT NULL,
  paper_code       text        NOT NULL,
  lo_code          text        NOT NULL,
  band             text        NOT NULL,
  source           text        NOT NULL,
  case_id          uuid        NULL,
  requirement_id   uuid        NULL,
  occurrence_count integer     NOT NULL DEFAULT 1,
  resolved_at      timestamptz NULL,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Constraints (added separately so a re-run over an existing table converges) ──
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acca_weak_areas_source_check'
  ) THEN
    ALTER TABLE public.acca_weak_areas
      ADD CONSTRAINT acca_weak_areas_source_check
      CHECK (source IN ('sit', 'drill'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acca_weak_areas_band_check'
  ) THEN
    ALTER TABLE public.acca_weak_areas
      ADD CONSTRAINT acca_weak_areas_band_check
      CHECK (band IN ('exemplary', 'strong', 'competent', 'weak', 'nothing'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acca_weak_areas_paper_check'
  ) THEN
    ALTER TABLE public.acca_weak_areas
      ADD CONSTRAINT acca_weak_areas_paper_check
      CHECK (paper_code IN ('APM', 'AFM'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acca_weak_areas_count_check'
  ) THEN
    ALTER TABLE public.acca_weak_areas
      ADD CONSTRAINT acca_weak_areas_count_check
      CHECK (occurrence_count >= 1);
  END IF;
END $$;

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- The upsert key. PARTIAL on resolved_at IS NULL so a resolved row does not block a
-- fresh finding for the same LO — the student can regress, and that must be a new
-- open row rather than an increment of a closed one.
CREATE UNIQUE INDEX IF NOT EXISTS acca_weak_areas_open_unique
  ON public.acca_weak_areas (user_id, paper_code, lo_code, source)
  WHERE resolved_at IS NULL;

-- The selector's read path: "open weaknesses for this user in this paper".
CREATE INDEX IF NOT EXISTS acca_weak_areas_user_paper_open_idx
  ON public.acca_weak_areas (user_id, paper_code)
  WHERE resolved_at IS NULL;

-- Provenance lookup — "what did this sit produce?"
CREATE INDEX IF NOT EXISTS acca_weak_areas_case_idx
  ON public.acca_weak_areas (case_id)
  WHERE case_id IS NOT NULL;

-- ── updated_at maintenance ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.acca_weak_areas_touch_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS acca_weak_areas_touch ON public.acca_weak_areas;
CREATE TRIGGER acca_weak_areas_touch
  BEFORE UPDATE ON public.acca_weak_areas
  FOR EACH ROW EXECUTE FUNCTION public.acca_weak_areas_touch_updated_at();

-- ── acca_case_progress.technical_feedback ────────────────────────────────────
-- SECOND CONCERN IN THIS MIGRATION, added 2026-07-30 while wiring the debrief.
--
-- The debrief's central field is `why`: the technical marker's OWN reasoning for a
-- requirement, carried through VERBATIM (lib/acca/debrief.ts is built around never
-- paraphrasing it). It has nothing to read. app/api/acca/case/mark persists the
-- per-requirement `band`, `technical_marks_awarded` and `technical_marks_available`
-- onto acca_case_progress — but NOT `feedback`, which is returned to the caller and
-- then dropped. PS feedback survives (acca_case_marking.per_skill jsonb); the
-- technical half does not.
--
-- Without this column the results screen can only show `why` on the SAME request that
-- did the marking. A refresh would re-mark (a paid model call per case, and marks that
-- measurably move run to run) or show a debrief with every `why` null. Neither is
-- acceptable for a screen a student returns to.
--
-- Nullable with no default and no backfill: rows marked before this lands keep NULL,
-- and the debrief already treats a null `why` as "no reasoning shown for this one"
-- rather than inventing one. That is the correct reading of an un-backfilled row.
ALTER TABLE public.acca_case_progress
  ADD COLUMN IF NOT EXISTS technical_feedback text NULL;

COMMENT ON COLUMN public.acca_case_progress.technical_feedback IS
  'Verbatim per-requirement reasoning from the technical marking pass. Read by the '
  'debrief as its `why`. Never paraphrased, never generated — null means the marker '
  'produced none, which the debrief states rather than fills in.';

-- ── RLS: service-role only ───────────────────────────────────────────────────
-- RLS ON with NO permissive policy. Every reader and writer is a server route using
-- the service client, exactly like acca_drill_attempts. This is deliberate: a
-- student-readable policy would expose the band history, which is marking output.
ALTER TABLE public.acca_weak_areas ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =============================================================================
-- VERIFICATION — run AFTER the COMMIT above. Every query must return the stated
-- result. A blank result is a FAILURE, not a pass.
-- =============================================================================

-- V1 — the table exists with exactly the 12 expected columns.
-- EXPECT: 12 rows, names as listed.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'acca_weak_areas'
ORDER BY ordinal_position;

-- V2 — all four CHECK constraints landed.
-- EXPECT: 4 rows (band, count, paper, source).
SELECT conname, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.acca_weak_areas'::regclass AND contype = 'c'
ORDER BY conname;

-- V3 — the three indexes landed, and the upsert key is UNIQUE + partial.
-- EXPECT: 4 rows (pkey + the three below); acca_weak_areas_open_unique shows
--         "UNIQUE" and "WHERE (resolved_at IS NULL)".
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'acca_weak_areas'
ORDER BY indexname;

-- V4 — RLS is ON and there is NO permissive policy (service-role only).
-- EXPECT: rls_enabled = true, policy_count = 0.
SELECT c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'acca_weak_areas') AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'acca_weak_areas';

-- V5 — the updated_at trigger is attached.
-- EXPECT: 1 row, tgname = 'acca_weak_areas_touch'.
SELECT tgname, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'public.acca_weak_areas'::regclass AND NOT tgisinternal;

-- V6 — PROVE THE CONSTRAINTS FIRE (P-G3: a check whose failure path has never run
-- is untested). Each of these MUST raise an error. Run them one at a time; each is
-- wrapped so nothing is left behind.
--
--   BEGIN; INSERT INTO public.acca_weak_areas (user_id, paper_code, lo_code, band, source)
--     VALUES (gen_random_uuid(), 'AFM', 'E3a', 'competent', 'guess');      -- EXPECT: source_check violation
--   ROLLBACK;
--
--   BEGIN; INSERT INTO public.acca_weak_areas (user_id, paper_code, lo_code, band, source)
--     VALUES (gen_random_uuid(), 'AFM', 'E3a', 'middling', 'sit');         -- EXPECT: band_check violation
--   ROLLBACK;
--
--   BEGIN; INSERT INTO public.acca_weak_areas (user_id, paper_code, lo_code, band, source)
--     VALUES (gen_random_uuid(), 'ACCA', 'E3a', 'competent', 'sit');       -- EXPECT: paper_check violation
--   ROLLBACK;
--
--   -- The upsert key: the SECOND insert must violate acca_weak_areas_open_unique.
--   BEGIN;
--     INSERT INTO public.acca_weak_areas (user_id, paper_code, lo_code, band, source)
--       VALUES ('00000000-0000-4000-8000-000000000001', 'AFM', 'E3a', 'competent', 'sit');
--     INSERT INTO public.acca_weak_areas (user_id, paper_code, lo_code, band, source)
--       VALUES ('00000000-0000-4000-8000-000000000001', 'AFM', 'E3a', 'weak', 'sit');
--   ROLLBACK;                                                              -- EXPECT: unique violation
--
--   -- And the partial-ness: a RESOLVED row must NOT block a fresh open one.
--   BEGIN;
--     INSERT INTO public.acca_weak_areas (user_id, paper_code, lo_code, band, source, resolved_at)
--       VALUES ('00000000-0000-4000-8000-000000000002', 'AFM', 'E3a', 'competent', 'sit', now());
--     INSERT INTO public.acca_weak_areas (user_id, paper_code, lo_code, band, source)
--       VALUES ('00000000-0000-4000-8000-000000000002', 'AFM', 'E3a', 'weak', 'sit');
--   ROLLBACK;                                                              -- EXPECT: BOTH succeed

-- V6b — the technical_feedback column landed, nullable, with no default.
-- EXPECT: 1 row — data_type 'text', is_nullable 'YES', column_default NULL.
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'acca_case_progress'
  AND column_name = 'technical_feedback';

-- V6c — adding it did NOT disturb the existing columns.
-- EXPECT: all four present (band, technical_marks_awarded, technical_marks_available,
--         submitted_at) — i.e. count = 4.
SELECT count(*) AS preexisting_columns_intact
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'acca_case_progress'
  AND column_name IN ('band', 'technical_marks_awarded', 'technical_marks_available', 'submitted_at');

-- V7 — the LC table is untouched. This migration must not have altered it.
-- EXPECT: the pre-existing weak_areas column list, unchanged; NO paper_code/lo_code/
--         band/source columns present.
SELECT count(*) FILTER (WHERE column_name IN ('paper_code', 'lo_code', 'band', 'source')) AS acca_columns_leaked,
       count(*) AS total_columns
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'weak_areas';
-- EXPECT: acca_columns_leaked = 0
