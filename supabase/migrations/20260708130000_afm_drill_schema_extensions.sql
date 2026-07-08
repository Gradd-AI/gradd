-- =============================================================================
-- 20260708130000_afm_drill_schema_extensions.sql
-- Extend acca_drills for AFM: three-state `mode`, numeric `answer_schema`, composite
-- scope index, paper_code guard. Additive + backfill only — no destructive change and
-- no APM behaviour change. Prepares the SHARED table for AFM rows (paper_code='AFM').
-- No AFM content is inserted here (Phase 2B-1 shipped the engine; drills come later).
-- =============================================================================
-- WHY: AFM LO codes collide exactly with APM's; the shared acca_drills table is kept
-- apart only by paper_code scoping. AFM additionally needs:
--   (1) a three-state calc tag — 'mixed' has no APM equivalent (scripts/afm-framework.ts),
--   (2) a numeric answer schema for the verification engine (lib/acca/numeric-verifier.ts).
-- Per docs/AFM_NUMERIC_VERIFICATION_DESIGN.md §9.
--
-- calculation_required (existing boolean) is KEPT and dual-written during transition —
-- the APM generator (scripts/generate-apm-drills.ts) still reads/writes it. See the
-- RECOMMENDATION block at the foot of this file.
--
-- IDEMPOTENT: ADD COLUMN IF NOT EXISTS, guarded constraint adds, CREATE INDEX IF NOT
-- EXISTS, and the backfill only fills NULLs — safe to re-run (incl. the manual Supabase
-- SQL Editor run against prod). TRANSACTIONAL: wrapped in begin/commit (plain
-- CREATE INDEX, not CONCURRENTLY, so it is transaction-safe).
-- =============================================================================

begin;

-- 1. mode — three-state calc tag. 'mixed' is AFM-only; APM projects to quant/discursive.
alter table public.acca_drills add column if not exists mode text;

--    Backfill existing APM rows from calculation_required (APM has no 'mixed').
--    Only touches NULLs, so re-runs and post-backfill inserts are unaffected.
update public.acca_drills
   set mode = case when calculation_required then 'quantitative' else 'discursive' end
 where mode is null;

--    Constrain the domain. mode stays NULLABLE (a CHECK passes on NULL); NOT NULL is
--    deliberately NOT imposed so the current APM generator, which does not yet write
--    mode, keeps inserting — see the dual-write recommendation below.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'acca_drills_mode_check') then
    alter table public.acca_drills
      add constraint acca_drills_mode_check
      check (mode is null or mode in ('quantitative','mixed','discursive'));
  end if;
end $$;

-- 2. answer_schema — numeric-verification schema (jsonb, nullable: NULL for APM rows and
--    for discursive AFM rows). Shape authored per lib/acca/numeric-verifier.ts
--    (AnswerSchema { components: [{ component_id, expected_value, tolerance, unit,
--    working_steps, depends_on, ... }] }).
alter table public.acca_drills add column if not exists answer_schema jsonb;

-- 3. Composite scope index. Column order puts the four equality predicates
--    (exam_board, paper_code, status, published) first and the lo_code prefix-range
--    LAST, so both the eq and the LIKE('lo_code','B1%') sub-area serving queries are
--    fully index-served — a btree stops using columns after the first range/prefix,
--    so lo_code must come after every equality predicate to keep them all usable.
create index if not exists idx_acca_drills_scope
  on public.acca_drills (exam_board, paper_code, status, published, lo_code);

-- 4. paper_code guard — only APM/AFM may live in this table, so a NULL/typo paper can
--    never slip a row past the paper-scoped serving queries. Existing rows are all 'APM'.
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'acca_drills_paper_code_check') then
    alter table public.acca_drills
      add constraint acca_drills_paper_code_check
      check (paper_code in ('APM','AFM'));
  end if;
end $$;

commit;

-- =============================================================================
-- VERIFICATION (run after applying):
--   -- (a) columns present:
--   select column_name, data_type from information_schema.columns
--    where table_name = 'acca_drills' and column_name in ('mode','answer_schema')
--    order by column_name;                     -- expect: answer_schema jsonb, mode text
--
--   -- (b) backfill complete + domain valid (all APM rows → quantitative|discursive, 0 null):
--   select coalesce(mode,'<null>') as mode, count(*) from public.acca_drills group by 1 order by 1;
--   select count(*) as bad_mode from public.acca_drills
--    where mode is not null and mode not in ('quantitative','mixed','discursive');   -- expect 0
--
--   -- (c) constraints + index exist:
--   select conname from pg_constraint
--    where conname in ('acca_drills_mode_check','acca_drills_paper_code_check') order by conname;  -- expect 2
--   select indexname from pg_indexes
--    where tablename = 'acca_drills' and indexname = 'idx_acca_drills_scope';         -- expect 1
--
--   -- (d) paper_code guard holds:
--   select count(*) as bad_paper from public.acca_drills where paper_code not in ('APM','AFM'); -- expect 0
-- =============================================================================

-- =============================================================================
-- RECOMMENDATION (calculation_required: keep vs deprecate) — decision deferred to you.
--   KEEP + DUAL-WRITE during the transition. Rationale:
--     * scripts/generate-apm-drills.ts both WRITES calculation_required and READS it
--       (via CALCULATION_LOS); dropping the column now breaks APM generation.
--     * mode is a strict superset of calculation_required (it adds 'mixed'), so
--       calculation_required is a lossy 2-state projection: calc_required = (mode='quantitative').
--     * Action to keep them consistent: update the APM generator to write BOTH — set
--       mode from afm-framework/CALCULATION_LOS AND calculation_required = (mode='quantitative')
--       — so new APM rows are not left with mode NULL (this migration only backfills EXISTING rows).
--   DEPRECATE later, in a dedicated migration, once (a) the generator writes mode, (b) no
--   reader references calculation_required, and (c) AFM is live. Do NOT drop it here:
--   destructive, and it breaks the generator.
-- =============================================================================
