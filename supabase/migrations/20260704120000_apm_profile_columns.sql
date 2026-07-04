-- =============================================================================
-- 20260704120000_apm_profile_columns.sql
-- APM entitlement columns on `profiles` — brought under version control.
-- =============================================================================
-- WHY: The apm_* entitlement columns already exist in the database (added via the
-- Supabase SQL Editor during the APM build) but no migration ever defined them —
-- schema drift. This migration closes that drift by declaring them idempotently so
-- a fresh environment reproduces the live schema. It is NOT run against the live DB
-- (the columns are already there); `add column if not exists` makes it a safe no-op.
--
-- COLUMNS (verified against how the code reads/writes them):
--  * apm_subscription_status  — text status string; the access gate grants only on
--    ==='active' (webhooks/stripe/route.ts writes 'active'/'inactive'/mapStripeStatus).
--    Default 'inactive' = closed gate. Read defensively as string|null in the app.
--  * apm_pass_expires_at      — timestamptz; the 90-day one-time pass expiry, lapsed
--    server-side by the access predicate (lib/acca/access.ts). Nullable, no default:
--    only set when a pass is purchased (webhook writes an ISO timestamp).
--  * apm_stripe_subscription_id — text; stored for cancellation reconciliation.
--    Nullable, no default: only set for a monthly subscription.
--  * apm_teach_throughs_used  — integer free-tier teach-through counter; read as
--    `number ?? 0`, incremented by the tutor route. Default 0.
--
-- NOTE: `add column if not exists` adds a MISSING column with these constraints but
-- does NOT retro-apply NOT NULL / DEFAULT to a column that already exists as
-- nullable. On the live DB (columns present) this is a no-op; it reconciles schema
-- only for fresh environments. Idempotent; safe to re-run.
-- =============================================================================

alter table profiles add column if not exists apm_subscription_status text not null default 'inactive';
alter table profiles add column if not exists apm_pass_expires_at timestamptz;
alter table profiles add column if not exists apm_stripe_subscription_id text;
alter table profiles add column if not exists apm_teach_throughs_used integer not null default 0;

-- =============================================================================
-- VERIFICATION (run after applying):
--   select column_name from information_schema.columns
--   where table_name = 'profiles' and column_name like 'apm_%';
--   -- expect 4 rows.
-- =============================================================================
