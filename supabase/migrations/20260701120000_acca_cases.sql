-- =============================================================================
-- 20260701120000_acca_cases.sql
-- APM case-scope data model — multi-LO, multi-requirement exam cases.
-- =============================================================================
-- WHY: Ezra is single-drill-bound (one LO per session). The APM exam is a
-- 50-mark Section A case + two 25-mark Section B questions, each with a shared
-- scenario and several linked requirements. This migration adds the tables that
-- let Ezra run a shared-scenario, multi-requirement session (v1). The withholding
-- engine is unchanged and applies per requirement; these tables sit under an
-- orchestration layer added to the tutor route in a later change.
--
-- DESIGN NOTES:
--  * Cases are case-native content (not composed from acca_drills): a case has
--    ONE shared scenario, so requirements share it. Atomic drills each embed
--    their own company and cannot be bolted together into one coherent case.
--  * Requirement fields mirror acca_drills' withholding fields (question,
--    model_answer, hint, full_reveal, marks_guide, command_verb,
--    intellectual_level, lo_code) so the proven three-call withhold ports
--    unchanged, per requirement.
--  * `counted` is DEFINED here from the start. The existing acca_tutor_progress
--    table has schema drift (route reads/writes `counted` but no migration adds
--    it); we do NOT propagate that — the case-progress table defines it cleanly.
--    (Separately, that acca_tutor_progress drift should be closed in its own
--    migration; out of scope here.)
--  * v2 HOOKS: `passed` and `final_answer` on case-progress let a later
--    end-of-case synthesis pass (integration + professional-skills marking)
--    read completed requirements with zero retrofit. v1 does not use them.
--  * `syllabus_cycle` lets a future 25/26 vs 26/27 toggle work without a schema
--    change. Default 'S26-J27' (the live cycle).
--  * RLS: enabled, NO permissive policy on every table — service-role only,
--    mirroring the acca_tutor_progress / diagram_cache access pattern.
--  * FKs: exhibits/requirements -> cases ON DELETE CASCADE (strictly owned,
--    and only couple NEW tables to each other, not to existing tables).
--    case-progress is intentionally FK-free, matching acca_tutor_progress
--    (which has no FK to acca_drills) for deploy safety.
--  * Idempotent: create ... if not exists throughout; safe to re-run.
-- =============================================================================

-- 1. CASES — the shared scenario container ------------------------------------
create table if not exists acca_cases (
  id                        uuid primary key default gen_random_uuid(),
  exam_board                text     not null default 'ACCA',
  paper_code                text     not null default 'APM',
  syllabus_cycle            text     not null default 'S26-J27',
  section                   text     not null,                 -- 'A' (50) | 'B' (25)
  anchor_area               text,                              -- e.g. 'C1','D1','D2'; null for A
  title                     text     not null,                 -- case/company name
  scenario_intro            text     not null,                 -- framing + response instruction
  response_format           text     not null default 'report',-- 'report' | 'briefing note' | ...
  total_marks               smallint not null,
  professional_skills_marks smallint not null,
  status                    text     not null default 'candidate', -- candidate|approved|rejected
  published                 boolean  not null default false,
  created_at                timestamptz not null default now()
);

alter table acca_cases enable row level security;

-- 2. EXHIBITS — the named information sources shown on the left of a real CBE --
create table if not exists acca_case_exhibits (
  id            uuid primary key default gen_random_uuid(),
  case_id       uuid     not null references acca_cases(id) on delete cascade,
  exhibit_order smallint not null,                             -- display order
  title         text     not null,                            -- e.g. 'Company background','Appendix 1 — KPIs'
  body          text     not null,
  created_at    timestamptz not null default now()
);

create index if not exists idx_acca_case_exhibits_case
  on acca_case_exhibits (case_id, exhibit_order);

alter table acca_case_exhibits enable row level security;

-- 3. REQUIREMENTS — the marked (i)/(ii)/(iii) parts --------------------------
create table if not exists acca_case_requirements (
  id                     uuid     primary key default gen_random_uuid(),
  case_id                uuid     not null references acca_cases(id) on delete cascade,
  requirement_order      smallint not null,                   -- 1,2,3
  label                  text     not null,                   -- e.g. '(i) Performance reporting'
  question               text     not null,                   -- the specific ask
  lo_code                text     not null,                   -- maps to a syllabus LO (S26-J27 casing)
  command_verb           text     not null,                   -- 'evaluate','advise','assess',...
  intellectual_level     smallint not null,                   -- 2 | 3
  marks_guide            smallint not null,                   -- technical marks for THIS requirement
  professional_skill_tags text,                               -- comma-sep PROFESSIONAL_SKILLS members
  model_answer           text     not null,                   -- sealed band-1 answer for THIS requirement
  hint                   text     not null,
  full_reveal            text     not null,
  created_at             timestamptz not null default now()
);

create index if not exists idx_acca_case_requirements_case
  on acca_case_requirements (case_id, requirement_order);

alter table acca_case_requirements enable row level security;

-- 4. CASE PROGRESS — per (user, case, requirement); mirrors acca_tutor_progress
create table if not exists acca_case_progress (
  user_id           uuid     not null,
  case_id           uuid     not null,
  requirement_id    uuid     not null,
  miss_count        integer  not null default 0,
  last_diagnosis    text,
  last_real_attempt text,
  counted           boolean  not null default false,          -- cap-charged flag (defined, not drifted)
  resolved          boolean  not null default false,          -- earned-reveal flag
  passed            boolean  not null default false,          -- v2 HOOK: requirement completed correctly
  final_answer      text,                                     -- v2 HOOK: accepted answer for synthesis
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, case_id, requirement_id)
);

alter table acca_case_progress enable row level security;

-- =============================================================================
-- VERIFICATION (run after applying):
--   select table_name from information_schema.tables
--   where table_name in
--     ('acca_cases','acca_case_exhibits','acca_case_requirements','acca_case_progress');
--   -- expect 4 rows.
--   select relname, relrowsecurity from pg_class
--   where relname in
--     ('acca_cases','acca_case_exhibits','acca_case_requirements','acca_case_progress');
--   -- expect relrowsecurity = true for all 4.
-- =============================================================================
