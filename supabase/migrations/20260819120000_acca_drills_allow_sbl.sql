-- 20260819120000_acca_drills_allow_sbl.sql
--
-- SBL WAS DECLARED IN CODE AND NEVER IN THE SCHEMA. `ACCA_PAPERS` has carried 'SBL' since
-- 2026-08-18, `SKILL_DESCRIPTORS_BY_PAPER` carries its five skills, `GATE_CONFIG` knows it has
-- no exam sections, and scripts/sbl-framework.ts holds all 138 outcomes — but
-- `acca_drills_paper_code_check` still reads CHECK (paper_code IN ('APM','AFM')).
--
-- FOUND THE ONLY WAY IT COULD BE: by trying to insert. All five SBL Batch A drafts were refused
-- by the database with `violates check constraint "acca_drills_paper_code_check"`. Zero rows
-- landed; the refusal was total, not partial. No amount of reading the TypeScript would have
-- surfaced this, because the vocabulary split (ACCA_PAPERS vs SERVED_PAPERS) is enforced in the
-- application and the database never heard about either.
--
-- ⚠️ THIS WIDENS ONE TABLE, AND THE FOUR IT DOES NOT TOUCH ARE THE POINT.
-- Five public tables carry the same two-paper CHECK:
--     acca_drills          <- WIDENED HERE. Content. SBL drills are authored and reviewed
--                             long before anything is sold, so the content table must accept
--                             the paper first.
--     acca_entitlements    <- NOT widened. An entitlement row is a PROMISE THE PRODUCT KEEPS.
--                             SBL has no price, no surface and no content; a row here would
--                             assert access to something that does not exist.
--     acca_weak_areas      <- NOT widened. Written by the marking path, which SBL does not have
--                             (per-requirement PS marking is unbuilt — AFM_SURFACED.md item 6).
--     resit_leads          <- NOT widened. The resit diagnostic is a SERVED surface.
--     resit_runs           <- NOT widened. Same.
-- That asymmetry IS `AccaPaper` vs `ServedPaper` expressed in the schema: declared vocabulary
-- reaches the content table; a customer-reachable promise does not. Widening all five "for
-- consistency" would delete the distinction the application spent a session establishing.
--
-- `acca_cases` carries NO paper_code CHECK at all (verified against pg_constraint), so SBL case
-- content is already insertable there. Recorded as an observation, not changed — adding a
-- constraint is a different act with a different blast radius.
--
-- SAFETY: widening a CHECK constraint cannot invalidate an existing row. Every current row is
-- 'APM' or 'AFM' and both remain permitted. There is no backfill and no data movement.
--
-- ⚠️ APPLY BY HAND IN THE SUPABASE SQL EDITOR AS ONE BLOCK, then run the verification queries at
-- the bottom. There is no automated migration runner on this project.

begin;

-- Drop-and-recreate rather than ADD: Postgres has no ALTER CONSTRAINT for a CHECK expression.
-- Guarded on existence so a re-run is a no-op rather than an error.
do $$
begin
  if exists (select 1 from pg_constraint where conname = 'acca_drills_paper_code_check') then
    alter table public.acca_drills drop constraint acca_drills_paper_code_check;
  end if;

  alter table public.acca_drills
    add constraint acca_drills_paper_code_check
    check (paper_code in ('APM', 'AFM', 'SBL'));
end $$;

-- DRIFT CHECK, not a convergence. If the constraint did not end up exactly as intended, RAISE
-- rather than leave the table in a state no environment has seen.
do $$
declare
  def text;
begin
  select pg_get_constraintdef(oid) into def
    from pg_constraint where conname = 'acca_drills_paper_code_check';
  if def is null then
    raise exception 'acca_drills_paper_code_check is missing after this migration';
  end if;
  if def not like '%SBL%' or def not like '%APM%' or def not like '%AFM%' then
    raise exception 'acca_drills_paper_code_check did not widen as intended: %', def;
  end if;
end $$;

commit;

-- ── VERIFICATION — run after applying ────────────────────────────────────────────────────────
-- 1. The constraint now admits three papers:
--    select pg_get_constraintdef(oid) from pg_constraint
--      where conname = 'acca_drills_paper_code_check';
--    -- expect: CHECK ((paper_code = ANY (ARRAY['APM'::text, 'AFM'::text, 'SBL'::text])))
--
-- 2. Nothing moved:
--    select paper_code, count(*) from acca_drills group by paper_code order by 1;
--    -- expect the pre-migration counts exactly; SBL absent until the batch is inserted.
--
-- 3. The four tables that must NOT have widened:
--    select conrelid::regclass::text, pg_get_constraintdef(oid) from pg_constraint
--      where conname in ('acca_entitlements_paper_code_check','acca_weak_areas_paper_check',
--                        'resit_leads_paper_code_check','resit_runs_paper_code_check')
--      order by 1;
--    -- expect all four still ARRAY['APM','AFM'] with no SBL.
