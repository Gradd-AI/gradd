-- =============================================================================
-- 20260709120000_org_layer_demo_and_drill_attempts.sql
-- Org/coordinator layer (demo cut) + per-attempt drill log.
-- =============================================================================
-- WHY (two coupled concerns, one migration per the approved Phase (a) scope):
--
--  1. ORG LAYER — product-neutral multi-tenant scaffolding: orgs, org_memberships,
--     cohorts, cohort_memberships. Serves an ACCA employer L&D manager and an IB
--     school coordinator identically. profiles is UNTOUCHED — a B2C account simply
--     has no membership row, so nothing about the consumer flow changes.
--
--  2. acca_drill_attempts — append-only-by-usage per-attempt log. Closes the
--     Horizon-1 data-capture gap: today acca_tutor_progress holds only latest state
--     (miss_count is a running counter, no history), and the interleave selector's
--     weakness seam is hard-wired off (next-drill/route.ts:107, W_WEAK=0). This log
--     gives readiness signal M a real slope and lets the demo seeder write backdated
--     history. lo_code is denormalised at write so weakness-by-LO needs no join.
--
-- DESIGN NOTES:
--  * FKs: org tables cascade among THEMSELVES ONLY (orgs -> memberships/cohorts ->
--    cohort_memberships, ON DELETE CASCADE) so a demo org deletes in one statement.
--    They do NOT FK to existing tables (deploy-safe, matches the ACCA family).
--  * user_id columns are plain uuid, NOT FK'd to auth.users: invited seats have a
--    null user_id, and demo trainees are synthetic uuids with no auth.users row.
--  * acca_drill_attempts is FK-free (matches acca_tutor_progress) and lo_code is a
--    denormalised text copy taken at write time.
--  * RLS: org tables get real auth.uid()-based policies (owner + coordinator read).
--    The progress tables (acca_tutor_progress/case_*/mock) are UNCHANGED — the
--    coordinator read path is a service-role /api/org route (Phase b), so the
--    B2C-critical read policies are never touched. acca_drill_attempts is
--    service-role-only (RLS on, no permissive policy), matching acca_tutor_progress.
--  * acca_drill_attempts is append-only BY USAGE, NOT trigger-immutable: the demo
--    seeder must write backdated rows and demo cleanup must delete them (service
--    role). A hard immutability trigger (like session_events) is a banked
--    pilot-ready item, deferred so demo teardown/re-seed stays clean.
--  * is_coordinator_of() is SECURITY DEFINER: run as owner it bypasses RLS on
--    org_memberships, so referencing it inside org_memberships' own policy does NOT
--    recurse. search_path pinned to public per repo convention (20260613170000).
--  * Policies are guarded by the DO $$ / IF NOT EXISTS (pg_policies) pattern because
--    Postgres has no CREATE POLICY IF NOT EXISTS — this keeps the migration
--    genuinely idempotent (mirrors 20260526120000_create_mark_schemes_table.sql).
--  * Idempotent: create ... if not exists throughout; safe to re-run.
-- =============================================================================


-- 1. ORGS ---------------------------------------------------------------------
create table if not exists public.orgs (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  type       text not null default 'employer' check (type in ('employer','school')),
  is_demo    boolean not null default false,   -- real-metric queries exclude these
  created_at timestamptz not null default now()
);

alter table public.orgs enable row level security;


-- 2. ORG_MEMBERSHIPS ----------------------------------------------------------
-- Keyed by email first, user_id second: a coordinator invites an email before that
-- person has an account; user_id is backfilled on magic-link claim (pilot-ready).
create table if not exists public.org_memberships (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.orgs(id) on delete cascade,
  user_id    uuid,                                       -- null until claimed
  email      text not null,
  role       text not null default 'member'  check (role   in ('coordinator','member')),
  status     text not null default 'invited' check (status in ('invited','active')),
  invited_at timestamptz not null default now(),
  joined_at  timestamptz
);

-- Case-insensitive uniqueness of an email within an org (citext unavailable).
create unique index if not exists uq_org_memberships_org_email
  on public.org_memberships (org_id, lower(email));

-- Coordinator's core lookup: "who am I / which orgs do I coordinate".
create index if not exists idx_org_memberships_user
  on public.org_memberships (user_id) where user_id is not null;

alter table public.org_memberships enable row level security;


-- 3. COHORTS ------------------------------------------------------------------
create table if not exists public.cohorts (
  id             uuid primary key default gen_random_uuid(),
  org_id         uuid not null references public.orgs(id) on delete cascade,
  label          text not null,                 -- e.g. 'Sept-26 APM'
  target_sitting text,                           -- e.g. 'Sept-26','Dec-26'
  paper          text,                           -- e.g. 'APM' (ACCA)
  subject        text,                           -- e.g. 'IB_BUSINESS' (product-neutral slot)
  created_at     timestamptz not null default now()
);

create index if not exists idx_cohorts_org on public.cohorts (org_id);

alter table public.cohorts enable row level security;


-- 4. COHORT_MEMBERSHIPS -------------------------------------------------------
create table if not exists public.cohort_memberships (
  id        uuid primary key default gen_random_uuid(),
  cohort_id uuid not null references public.cohorts(id) on delete cascade,
  user_id   uuid not null,                       -- synthetic uuid for demo trainees
  added_at  timestamptz not null default now(),
  constraint uq_cohort_memberships unique (cohort_id, user_id)
);

create index if not exists idx_cohort_memberships_cohort on public.cohort_memberships (cohort_id);
create index if not exists idx_cohort_memberships_user   on public.cohort_memberships (user_id);

alter table public.cohort_memberships enable row level security;


-- 5. COORDINATOR PREDICATE ----------------------------------------------------
-- SECURITY DEFINER so the internal read of org_memberships bypasses RLS (owner is
-- not subject to RLS unless FORCE is set - it is not), preventing policy recursion.
create or replace function public.is_coordinator_of(p_org_id uuid)
  returns boolean
  language sql
  stable
  security definer
  set search_path = public
as $$
  select exists (
    select 1
    from public.org_memberships m
    where m.org_id  = p_org_id
      and m.user_id = auth.uid()
      and m.role    = 'coordinator'
      and m.status  = 'active'
  );
$$;

grant execute on function public.is_coordinator_of(uuid) to authenticated, service_role;


-- 6. RLS POLICIES -------------------------------------------------------------
-- Read model: a member reads their own membership + their org row; a coordinator
-- reads everything within their org. NO write policies anywhere in the demo cut -
-- all provisioning (seeder, later invite/CRUD) is service-role, which bypasses RLS.
-- Coordinator-reads-their-org's-members-ONLY is enforced by is_coordinator_of().
--
-- Guarded because Postgres has no CREATE POLICY IF NOT EXISTS (idempotent re-run).
do $$
begin
  -- orgs: readable by any active member (coordinator or member) of that org.
  if not exists (
    select 1 from pg_policies
    where tablename = 'orgs' and policyname = 'orgs_select_member'
  ) then
    create policy orgs_select_member on public.orgs
      for select to authenticated
      using (
        exists (
          select 1 from public.org_memberships m
          where m.org_id  = orgs.id
            and m.user_id = auth.uid()
            and m.status  = 'active'
        )
      );
  end if;

  -- org_memberships: you see your own row; a coordinator sees all rows in their org.
  if not exists (
    select 1 from pg_policies
    where tablename = 'org_memberships' and policyname = 'org_memberships_select'
  ) then
    create policy org_memberships_select on public.org_memberships
      for select to authenticated
      using (
        user_id = auth.uid()
        or public.is_coordinator_of(org_id)
      );
  end if;

  -- cohorts: coordinators of the owning org only.
  if not exists (
    select 1 from pg_policies
    where tablename = 'cohorts' and policyname = 'cohorts_select_coordinator'
  ) then
    create policy cohorts_select_coordinator on public.cohorts
      for select to authenticated
      using ( public.is_coordinator_of(org_id) );
  end if;

  -- cohort_memberships: coordinators of the cohort's owning org only.
  if not exists (
    select 1 from pg_policies
    where tablename = 'cohort_memberships' and policyname = 'cohort_memberships_select_coordinator'
  ) then
    create policy cohort_memberships_select_coordinator on public.cohort_memberships
      for select to authenticated
      using (
        exists (
          select 1 from public.cohorts c
          where c.id = cohort_memberships.cohort_id
            and public.is_coordinator_of(c.org_id)
        )
      );
  end if;
end $$;


-- 7. ACCA_DRILL_ATTEMPTS ------------------------------------------------------
-- Append-only-by-usage per-attempt log. Written by the tutor route on every REAL
-- attempt (classified==='attempt'), best-effort/swallowed so it never blocks the
-- teach path. Service-role-only (RLS on, no permissive policy) - anon/authenticated
-- keys cannot read or write it directly. NOT trigger-immutable, so the demo seeder
-- can write backdated rows and demo cleanup can delete them (service-role).
create table if not exists public.acca_drill_attempts (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid     not null,
  drill_id   uuid     not null,
  lo_code    text     not null,                  -- denormalised from acca_drills at write
  outcome    text     not null check (outcome in ('correct','miss')),
  miss_delta smallint not null default 0,        -- 0 for correct, 1 for miss
  created_at timestamptz not null default now()
);

-- Readiness M-slope: a user's attempt time-series.
create index if not exists idx_acca_drill_attempts_user_time
  on public.acca_drill_attempts (user_id, created_at);

-- Weakness-by-LO for a user (the seam next-drill/route.ts:107 stubs off today).
create index if not exists idx_acca_drill_attempts_user_lo
  on public.acca_drill_attempts (user_id, lo_code);

alter table public.acca_drill_attempts enable row level security;

comment on table public.acca_drill_attempts is
  'Append-only-by-usage per-attempt drill log (user_id, drill_id, lo_code denormalised, '
  'outcome, miss_delta). Feeds readiness M-slope and per-(user,LO) weakness. '
  'Service-role only (RLS on, no permissive policy). Written best-effort by the tutor '
  'route on real attempts; never blocks the teach path.';


-- =============================================================================
-- VERIFICATION (run after applying):
--   select table_name from information_schema.tables
--   where table_name in ('orgs','org_memberships','cohorts','cohort_memberships',
--                        'acca_drill_attempts');
--   -- expect 5 rows.
--   select relname, relrowsecurity from pg_class
--   where relname in ('orgs','org_memberships','cohorts','cohort_memberships',
--                     'acca_drill_attempts');
--   -- expect relrowsecurity = true for all 5.
--   select proname, prosecdef from pg_proc where proname = 'is_coordinator_of';
--   -- expect prosecdef = true.
--   select tablename, policyname from pg_policies
--   where tablename in ('orgs','org_memberships','cohorts','cohort_memberships')
--   order by tablename;
--   -- expect 4 rows (one select policy per org table).
--
-- DEMO TEARDOWN (org + cohorts + memberships cascade in one statement):
--   delete from public.orgs where is_demo = true;
--   -- Seeded synthetic-user progress/attempt rows are keyed by user_id, not org_id;
--   -- the seeder script owns their teardown (delete where user_id in <demo set>).
-- =============================================================================
