-- =============================================================================
-- 20260803120000_acca_entitlements.sql
-- PER-PAPER ACCA ENTITLEMENT (Grant's pricing ruling, 2026-08-03).
-- =============================================================================
-- APM and AFM are sold separately: €99 sitting-dated pass and €49/month, each
-- paper its own SKU. Bundle-wide access ends.
--
-- WHY A TABLE AND NOT MORE COLUMNS. `profiles` currently carries the entitlement
-- as apm_subscription_status / apm_pass_expires_at / apm_stripe_subscription_id.
-- Two papers would be six columns; the ACCA syllabus has fifteen. More decisively,
-- a column set can hold only ONE entitlement per user and therefore cannot express
-- "bought APM in March, bought AFM in June" — it has no room for purchase history.
-- A row per (user, paper, purchase) does, and history is what a sitting-dated
-- product needs.
--
-- GRANDFATHERING IS DATA, NOT A CODE BRANCH. The three existing holders are manual
-- comps (no customer has ever paid for ACCA — verified: zero Stripe subscription
-- ids, zero live-mode purchases attributable to any surviving profile). They are
-- backfilled below with a row PER PAPER so they keep both papers for the life of
-- their entitlement without a single `if` in the predicate. There is no
-- legacy-bundle tier and no bundle flag. When these rows lapse, the concept is gone.
--
-- P-DB2: Grant applies this by hand in the Supabase SQL Editor as ONE block, then
-- runs the verification queries at the foot.
-- =============================================================================

create table if not exists public.acca_entitlements (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid not null references auth.users(id) on delete cascade,

  -- 'APM' | 'AFM'. Text + check rather than an enum: adding a paper must not need
  -- an ALTER TYPE, and the app's AccaPaper union is the real source of truth.
  paper_code             text not null check (paper_code in ('APM', 'AFM')),

  -- Where this entitlement came from. 'migration' is reserved for the backfill
  -- below so grandfathered rows stay identifiable forever without a bundle flag.
  source                 text not null check (source in ('stripe', 'comp', 'migration')),

  -- 'pass'      → date-driven, expires_at set, subscription_status null
  -- 'subscription' → status-driven, subscription_status set, expires_at null
  kind                   text not null check (kind in ('pass', 'subscription')),

  expires_at             timestamptz,
  subscription_status    text,
  stripe_subscription_id text,

  -- Which sitting this pass was bought for. NULL for a subscription, and NULL for
  -- rows predating the sittings table. The FK is added by the NEXT migration
  -- (20260803120100), because acca_sittings does not exist yet at this point —
  -- declared here as a bare uuid so this migration stands alone.
  sitting_id             uuid,

  -- Attribution for comps. A free grant with no named grantor is how a billing
  -- leak becomes indistinguishable from a decision (see the founding-student row
  -- below, which was exactly that ambiguity until it was written down).
  granted_by             text,
  note                   text,

  -- Explicit revocation, distinct from expiry. Needed because a partial unique
  -- index CANNOT use a time predicate (see the index note below).
  revoked_at             timestamptz,

  -- Webhook idempotency: Stripe retries, and a retried checkout.session.completed
  -- must not mint a second entitlement. NULL for comps/migration rows.
  stripe_event_id        text,

  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),

  -- A row must be internally coherent: a pass carries a date, a subscription
  -- carries a status. Enforced here rather than trusted to the writer, because the
  -- predicate reads both columns and a row with neither grants nothing silently.
  constraint acca_entitlements_kind_shape check (
    (kind = 'pass'         and expires_at is not null and subscription_status is null)
    or
    (kind = 'subscription' and subscription_status is not null and expires_at is null)
  )
);

-- ── UNIQUENESS: what was asked for, and what Postgres will actually accept ────
-- The ruling asked for `unique (user_id, paper_code) where active`. That exact
-- index is not creatable: a partial index predicate must be IMMUTABLE, and "active"
-- depends on `now()`, which is STABLE. Postgres rejects `where expires_at > now()`
-- outright. The intent is preserved in two narrower constraints:
--
--  1. ONE OPEN SUBSCRIPTION PER PAPER. Immutable predicate (`revoked_at is null`),
--     the same partial-index shape acca_weak_areas already uses for its open rows.
create unique index if not exists uq_acca_entitlements_open_subscription
  on public.acca_entitlements (user_id, paper_code)
  where kind = 'subscription' and revoked_at is null;

--  2. PASSES ARE DELIBERATELY NOT UNIQUE per (user, paper). A student who buys APM
--     for the June sitting and again for September must end up with TWO rows — that
--     is the purchase history the table exists to hold, and a uniqueness constraint
--     here would reject the second, entirely legitimate, purchase. Multiple live
--     passes are harmless: the predicate grants when ANY row is active.
--     Double-charging is prevented at the source instead:
create unique index if not exists uq_acca_entitlements_stripe_event
  on public.acca_entitlements (stripe_event_id)
  where stripe_event_id is not null;

-- The predicate's own lookup: (user_id, paper_code) on every gated request.
create index if not exists idx_acca_entitlements_lookup
  on public.acca_entitlements (user_id, paper_code);

alter table public.acca_entitlements enable row level security;
-- No policies: service-role (server) access only, exactly like acca_leads and
-- acca_weak_areas. Every read goes through a route that has already authenticated.

comment on table public.acca_entitlements is
  'Per-paper ACCA entitlement (APM/AFM), one row per grant. Replaces the bundle-wide profiles.apm_* columns; those remain as the dual-read fallback until every holder has rows.';

-- =============================================================================
-- BACKFILL — the three existing holders, BOTH papers each
-- =============================================================================
-- All three are manual comps; none came from Stripe (verified: apm_stripe_subscription_id
-- is null on all 11 profiles, and apm_subscription_status is 'inactive' on all 11 —
-- there has never been an ACCA subscription). They bought/were given a BUNDLED offer,
-- so they keep both papers until their current entitlement lapses.
--
-- Idempotent: `on conflict do nothing` cannot help here (passes are deliberately not
-- uniquely indexed), so the insert is guarded by a not-exists on the migration source.
-- Re-running this block is a no-op.

insert into public.acca_entitlements
  (user_id, paper_code, source, kind, expires_at, granted_by, note)
select v.user_id::uuid, p.paper_code, 'migration', 'pass', v.expires_at::timestamptz,
       'grant@live.ie', v.note
from (values
  -- Founding student. Comp against a weekly-feedback deal; date unchanged.
  ('dd786100-7d5d-4e1b-a0af-62f5ac8686e1',
   '2026-10-31T23:59:59+00',
   'Grandfathered from the bundled ACCA offer (profiles.apm_pass_expires_at). Founding-student comp, weekly-feedback deal.'),

  -- Internal QA/test account. The 2099-01-01 SENTINEL IS REPLACED WITH A REAL DATE:
  -- a date that never arrives is not an entitlement, it is a permanent grant wearing
  -- an expiry, and it would have been copied into the new table as one. 2027-06-30
  -- outlives the current roadmap and still ends. Change it here before running if a
  -- different horizon is wanted.
  ('ee07f08c-9f24-4d77-af28-bbc894635f83',
   '2027-06-30T23:59:59+00',
   'Grandfathered from the bundled ACCA offer. Internal QA account; 2099-01-01 sentinel replaced with a real finite date.'),

  -- Dormant early account; date unchanged.
  ('7126c67d-aeae-40e5-ba40-808f37dd81b5',
   '2026-10-01T14:24:58.986613+00',
   'Grandfathered from the bundled ACCA offer (profiles.apm_pass_expires_at).')
) as v(user_id, expires_at, note)
cross join (values ('APM'), ('AFM')) as p(paper_code)
where not exists (
  select 1 from public.acca_entitlements e
  where e.user_id = v.user_id::uuid
    and e.paper_code = p.paper_code
    and e.source = 'migration'
);

-- =============================================================================
-- VERIFICATION (run after applying — expect exactly these results)
-- =============================================================================
-- 1. Six rows, three users x two papers:
--      select count(*) from acca_entitlements where source = 'migration';
--      -- expect 6
--
-- 2. Every holder has BOTH papers:
--      select user_id, count(distinct paper_code) as papers
--      from acca_entitlements where source = 'migration' group by user_id;
--      -- expect 3 rows, papers = 2 on each
--
-- 3. No sentinel survived:
--      select count(*) from acca_entitlements where expires_at > '2030-01-01';
--      -- expect 0
--
-- 4. THE DUAL-READ AGREES — the property to confirm before anything stops reading
--    the legacy columns. Every profile with a live legacy bundle must now have a
--    live row for BOTH papers, and no one else may have gained access:
--      select p.email,
--             (p.apm_subscription_status = 'active'
--               or p.apm_pass_expires_at > now())            as legacy_access,
--             count(e.id) filter (where e.expires_at > now()
--               or e.subscription_status = 'active')          as live_rows
--      from profiles p
--      left join acca_entitlements e on e.user_id = p.id
--      group by p.email, legacy_access
--      order by legacy_access desc nulls last;
--      -- expect: the 3 holders show legacy_access = true AND live_rows = 2
--      --         every other profile shows legacy_access = false AND live_rows = 0
-- =============================================================================
