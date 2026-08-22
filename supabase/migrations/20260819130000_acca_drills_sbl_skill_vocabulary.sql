-- 20260819130000_acca_drills_sbl_skill_vocabulary.sql
--
-- THE SECOND SCHEMA GATE SBL HITS, FOUND THE SAME WAY AS THE FIRST — BY TRYING TO INSERT.
--
-- `20260819120000_acca_drills_allow_sbl.sql` widened paper_code. The very next insert attempt hit
-- `acca_drills_skill_chk`, which pins professional_skill_tag to APM/AFM's FOUR skills:
--     CHECK (professional_skill_tag IS NULL OR professional_skill_tag = ANY
--            (ARRAY['communication','analysis_and_evaluation','scepticism','commercial_acumen']))
--
-- ⚠️ IT LET EXACTLY ONE OF FIVE THROUGH, AND THE PARTIAL RESULT IS THE EVIDENCE. SBL-A4 is tagged
-- `scepticism`, a name SBL shares with AFM, so it inserted. The other four are `analysis`,
-- `analysis` , `evaluation` and `evaluation` — SBL-only names — and were refused. A constraint
-- that admits the shared names and rejects the unshared ones is a precise description of the
-- vocabulary split nobody had told the database about.
--
-- ── WHY THIS IS PAPER-AWARE RATHER THAN A FLAT WIDENING ──────────────────────────────────────
-- The lazy fix is to add 'analysis' and 'evaluation' to the existing flat list. That would then
-- permit an AFM row tagged `analysis` — and the whole documented danger of SBL's vocabulary is
-- that its skills are NOT the four-skill set renamed:
--   · APM/AFM carry ONE combined `analysis_and_evaluation`.
--   · SBL marks `analysis` and `evaluation` SEPARATELY, and neither is that skill halved —
--     SBL's Analysis absorbs ENQUIRE, its Evaluation absorbs ESTIMATE, and neither act appears
--     in the four-skill descriptors at all.
-- The application already refuses to cross them (`unknownSkillTags` validates against the
-- PAPER's declared set; `getSkillDescriptors` THROWS rather than filtering, because dropping an
-- unknown skill would silently re-weight the marks pool). Fixtures pin that
-- `analysis_and_evaluation` never appears in the SBL map and `analysis`/`evaluation` never in the
-- APM/AFM ones. This migration puts that same rule in the database, so a mis-tagged row cannot
-- exist even if it is written by a path that skips the application check.
--
-- SAFETY: every existing row is APM or AFM with one of the original four tags (or NULL), and all
-- of those remain permitted by the first branch. Verified before writing: the one SBL row already
-- present is `scepticism`, permitted by the SBL branch. No backfill, no data movement.
--
-- ⚠️ APPLY BY HAND IN THE SUPABASE SQL EDITOR AS ONE BLOCK, then run the verification queries.

begin;

do $$
begin
  if exists (select 1 from pg_constraint where conname = 'acca_drills_skill_chk') then
    alter table public.acca_drills drop constraint acca_drills_skill_chk;
  end if;

  alter table public.acca_drills
    add constraint acca_drills_skill_chk
    check (
      professional_skill_tag is null
      or (paper_code in ('APM', 'AFM')
          and professional_skill_tag in
              ('communication', 'analysis_and_evaluation', 'scepticism', 'commercial_acumen'))
      or (paper_code = 'SBL'
          and professional_skill_tag in
              ('communication', 'commercial_acumen', 'analysis', 'scepticism', 'evaluation'))
    );
end $$;

-- DRIFT CHECK — RAISE rather than leave a state no environment has seen.
do $$
declare
  def text;
begin
  select pg_get_constraintdef(oid) into def
    from pg_constraint where conname = 'acca_drills_skill_chk';
  if def is null then
    raise exception 'acca_drills_skill_chk is missing after this migration';
  end if;
  -- The two SBL-only names must be present, and the paper-awareness must be real: a flat list
  -- would not mention paper_code at all.
  if def not like '%analysis_and_evaluation%' then
    raise exception 'skill check lost the APM/AFM combined skill: %', def;
  end if;
  if def not like '%paper_code%' then
    raise exception 'skill check is not paper-aware — a flat widening would let an AFM row be tagged analysis: %', def;
  end if;
end $$;

commit;

-- ── VERIFICATION — run after applying ────────────────────────────────────────────────────────
-- 1. The constraint is paper-aware and admits both vocabularies:
--    select pg_get_constraintdef(oid) from pg_constraint where conname = 'acca_drills_skill_chk';
--
-- 2. Nothing moved:
--    select paper_code, professional_skill_tag, count(*) from acca_drills
--      group by 1,2 order by 1,2;
--    -- expect the pre-migration distribution exactly.
--
-- 3. THE CROSS-PAPER REFUSAL STILL HOLDS — this must FAIL:
--    -- (run in a transaction you roll back)
--    -- begin;
--    --   update acca_drills set professional_skill_tag = 'analysis'
--    --     where paper_code = 'AFM' limit 1;   -- expect: violates acca_drills_skill_chk
--    -- rollback;
