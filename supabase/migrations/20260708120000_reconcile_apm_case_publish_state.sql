-- =============================================================================
-- 20260708120000_reconcile_apm_case_publish_state.sql
-- Reconcile acca_cases serving flags: seeds declare candidate/unpublished, but the
-- deployed DB serves all 8 cases (5 library + 3 mock_only) as approved/published.
-- =============================================================================
-- WHY: the 8 APM cases were hand-flipped to approved/published in the Supabase
-- dashboard when they went live — library cases serve at /acca/cases; the 3
-- mock_only cases serve inside the timed mock (both live paid features). Their seed
-- files still declared the GATE-SAFETY state status='candidate', published=false, so
-- a re-seed or a fresh environment would reproduce an empty, non-serving library.
-- This codifies the deployed reality so git and the DB agree. (The seed files are
-- flipped to approved/true in the same commit as this migration.)
--
-- SCOPE: status + published ONLY. A full-column diff (2026-07-08) of all 8 rows vs
-- their seed declarations found NO other drift — section, anchor_area, marks,
-- professional_skills_marks, response_format, mock_only and exhibit/requirement
-- counts all match seed; scenario_intro shows no drift signal.
--
-- IDEMPOTENT: re-running affects 0 rows once applied (incl. the manual Supabase SQL
-- Editor run against prod, which already matches). SAFE: 8 fixed ids, nothing else.
-- =============================================================================

begin;

update public.acca_cases
   set status = 'approved',
       published = true
 where id in (
   'a1000000-0000-4000-8000-0000000000c1', -- Aldermere Fitness           (library, C1)
   'a2000000-0000-4000-8000-0000000000d1', -- Vesla Retail                (library, D2)
   'a3000000-0000-4000-8000-0000000000d2', -- Torfin Build Supplies       (library, D1)
   'a4000000-0000-4000-8000-0000000000c2', -- Orlen Cinemas               (library, C1)
   'a5000000-0000-4000-8000-0000000000a1', -- Keldan Foods                (library, Section A)
   'a6000000-0000-4000-8000-0000000000b1', -- Halworth Hotels             (mock_only, Section A)
   'a7000000-0000-4000-8000-0000000000c3', -- Rivenor Pharma Distribution (mock_only, C1)
   'a8000000-0000-4000-8000-0000000000d3'  -- Bexley Grocers              (mock_only, D2)
 )
   and (status is distinct from 'approved' or published is distinct from true);

commit;

-- =============================================================================
-- VERIFICATION (run after applying — expect all 8 approved/true, and 0 stragglers):
--   select id, title, status, published, mock_only
--     from public.acca_cases
--    where id in (
--      'a1000000-0000-4000-8000-0000000000c1','a2000000-0000-4000-8000-0000000000d1',
--      'a3000000-0000-4000-8000-0000000000d2','a4000000-0000-4000-8000-0000000000c2',
--      'a5000000-0000-4000-8000-0000000000a1','a6000000-0000-4000-8000-0000000000b1',
--      'a7000000-0000-4000-8000-0000000000c3','a8000000-0000-4000-8000-0000000000d3')
--    order by id;   -- expect 8 rows, every one status='approved', published=true
--
--   select count(*) as still_unpublished
--     from public.acca_cases
--    where id in (
--      'a1000000-0000-4000-8000-0000000000c1','a2000000-0000-4000-8000-0000000000d1',
--      'a3000000-0000-4000-8000-0000000000d2','a4000000-0000-4000-8000-0000000000c2',
--      'a5000000-0000-4000-8000-0000000000a1','a6000000-0000-4000-8000-0000000000b1',
--      'a7000000-0000-4000-8000-0000000000c3','a8000000-0000-4000-8000-0000000000d3')
--      and (status <> 'approved' or published = false);   -- expect 0
-- =============================================================================
