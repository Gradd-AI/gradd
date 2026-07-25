-- =============================================================================
-- 20260725120100_acca_case_technical_marks.sql
-- Add /100 technical-marks storage — mock-engine Phase 2b, band-marking piece.
-- Applies TOGETHER with 20260725120000_acca_case_requirements_answer_schema.sql
-- (that migration is the code-correct model_answer this one's bands are judged
-- against — see the marking design in the same session's report). Additive
-- only — no destructive change, no existing behaviour change, no content
-- inserted here.
-- =============================================================================
-- WHY: acca_case_marking today persists ONLY the professional-skills pool
-- (professional_marks_awarded/available) — there is no technical-marks
-- equivalent anywhere, and no per-requirement technical breakdown either
-- (traced in the 2026-07-25 mock-engine diagnostic: case/turn/route.ts decides
-- pass/fail per requirement as a boolean, never a mark). RULED (Grant,
-- 2026-07-25): extend the SAME band→apportion mechanism case-marking.ts already
-- uses for professional skills to technical marks — judged per requirement
-- against that requirement's own (now code-generated, Piece-1) model_answer,
-- apportioned to that requirement's own marks_guide ceiling. This migration adds
-- the minimal storage for that: an aggregate home (mirroring professional_marks_
-- awarded/available) and a per-requirement home (reusing the existing per-
-- requirement row rather than introducing a second per-requirement structure).
--
-- AMENDED (Grant, 2026-07-25, same session): a timed mock must be able to score
-- a wrong/blank requirement at ZERO — the original 4-band lexicon (exemplary/
-- strong/competent/weak) has no zero-credit floor ('weak' still implies a
-- creditable attempt was made). Added a 5th band, 'nothing', to the CHECK below.
-- The marking design's BAND_MULTIPLIER (lib/acca/case-marking.ts, not yet
-- edited — design-only until Grant rules the sitting flow) will need a matching
-- 'nothing': 0 entry alongside the existing 1/0.75/0.5/0.25 so `nothing` awards
-- exactly 0 through the SAME apportion() arithmetic, no special-casing.
--
-- CLAIM CEILING (unchanged by this migration, stated for anyone reading the
-- stored data later): a technical band/mark here is "answer-locked, model-
-- graded" — the STANDARD it is judged against (model_answer) is code-generated
-- and gated (Piece 1), but the band itself is an LLM judgement of the student's
-- prose against that standard, the same epistemic status as the existing
-- professional-skills marking and the narrative marker's criterion verdicts.
-- This is NOT the live exact-figure numeric-verifier (lib/acca/numeric-
-- verifier.ts) — that remains deferred, platform-wide, per the 2026-07-25
-- diagnostic's Piece 2.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS, guarded constraint add; safe to re-run,
-- safe to run against the live DB. NOT APPLIED by this commit — file only.
-- =============================================================================

-- 1. acca_case_marking — the AGGREGATE technical score, alongside the existing
--    aggregate professional_marks_awarded/available. Nullable, no default: every
--    row written before this feature ships (PS-only marking passes) stays valid;
--    NULL reads as "technical marking not yet computed for this row."
alter table public.acca_case_marking
  add column if not exists technical_marks_awarded   smallint,
  add column if not exists technical_marks_available  smallint;

-- 2. acca_case_progress — the PER-REQUIREMENT technical band + marks. This row
--    already exists per (user_id, case_id, requirement_id) (20260701120000_
--    acca_cases.sql) — reused as the single source of truth for per-requirement
--    detail rather than duplicating an evidence array on acca_case_marking (which
--    has no natural per-requirement row to key against; acca_case_progress does).
--    Nullable, no default: every existing progress row (pass/fail only, no
--    technical marking yet) stays valid.
alter table public.acca_case_progress
  add column if not exists technical_marks_awarded    smallint,
  add column if not exists technical_marks_available   smallint,
  add column if not exists band                        text;

--    band is a closed enum — the existing four-value professional-skills lexicon
--    (lib/acca/case-marking.ts: const BANDS = ['exemplary','strong','competent',
--    'weak']) PLUS a 5th, technical-marking-only value 'nothing' for the
--    zero-credit floor a timed sit needs (a wrong/blank requirement) — 'weak'
--    is NOT that floor, it still credits a recognisable attempt at 25%.
--    Guarded, matching the acca_drills.mode CHECK precedent (20260708130000_
--    afm_drill_schema_extensions.sql): stays NULLABLE (a CHECK passes on NULL)
--    so existing rows are unaffected.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'acca_case_progress_band_check') then
    alter table public.acca_case_progress
      add constraint acca_case_progress_band_check
      check (band is null or band in ('exemplary','strong','competent','weak','nothing'));
  end if;
end $$;

-- =============================================================================
-- VERIFICATION (run after applying):
--   -- (a) acca_case_marking columns present:
--   select column_name, data_type, is_nullable, column_default
--     from information_schema.columns
--    where table_name = 'acca_case_marking'
--      and column_name in ('technical_marks_awarded','technical_marks_available')
--    order by column_name;
--   -- expect 2 rows, both smallint, is_nullable='YES', column_default=null.
--
--   -- (b) acca_case_progress columns present:
--   select column_name, data_type, is_nullable, column_default
--     from information_schema.columns
--    where table_name = 'acca_case_progress'
--      and column_name in ('technical_marks_awarded','technical_marks_available','band')
--    order by column_name;
--   -- expect 3 rows: band text, technical_marks_available smallint,
--   --   technical_marks_awarded smallint — all is_nullable='YES', column_default=null.
--
--   -- (c) constraint present + domain valid (5-value lexicon incl. the zero-credit floor):
--   select conname from pg_constraint where conname = 'acca_case_progress_band_check';
--   -- expect 1 row.
--   select count(*) as bad_band from public.acca_case_progress
--    where band is not null and band not in ('exemplary','strong','competent','weak','nothing');
--   -- expect 0.
--
--   -- (d) no existing rows disturbed:
--   select count(*) as non_null_technical_rows from public.acca_case_marking
--    where technical_marks_awarded is not null or technical_marks_available is not null;
--   -- expect 0 immediately after applying — no content authored by this migration.
-- =============================================================================
