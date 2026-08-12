-- =============================================================================
-- 20260812120000_acca_funnel_events.sql
-- acca_funnel_events — the ACCA funnel event sink. RETROACTIVE: this table has
-- existed in production since ~2026-06-23 and has never had a migration file.
-- =============================================================================
-- ⚠️ THIS MIGRATION CHANGES NOTHING IN PRODUCTION, AND THAT IS THE POINT.
--
-- The table was hand-created in the SQL Editor and the file was never written, so it
-- lives in exactly one place — the live database — and no other environment has any
-- idea it should exist. A fresh checkout + `supabase db reset` produces a schema in
-- which `/api/acca/event` and `/api/acca/surface-event` both fail at their INSERT,
-- and the failure is silent on the older route (it does not check the insert result).
-- `supabase/migrations/` is the repo's only statement of what the schema IS, and for
-- this table it has been asserting, by omission, that it is not there.
--
-- Against production every statement below is a no-op. Against an empty database it
-- creates the table as production actually has it TODAY, read out of the live
-- catalogue on 2026-08-12 — not inferred from the shape of the inserts, which would
-- have missed the primary key, all three indexes, the ON DELETE SET NULL foreign key,
-- and RLS.
--
-- ── WHAT WAS READ, AND FROM WHERE ────────────────────────────────────────────
--   columns/types/defaults/notnull  pg_attribute + pg_attrdef
--   PK + FK                         pg_constraint  (2 rows: pkey, user_id_fkey)
--   indexes                         pg_indexes     (4 rows: pkey + 3 btree)
--   RLS + policies                  pg_class.relrowsecurity + pg_policy (0 policies)
--   triggers                        pg_trigger     (none, non-internal)
--   checks / column comments        none exist
--
-- ── DESIGN NOTES (describing what IS, not what was chosen today) ─────────────
--   * `event_type` is a free-text column with NO check constraint, deliberately left
--     that way. The route validates SHAPE, not VOCABULARY, and two of the eight
--     strings in the table are already retired (`reveal_shown`, `try_tutor_clicked`).
--     Adding a CHECK now would have to enumerate the dead strings to avoid rejecting
--     history, which is a constraint that documents nothing. The vocabulary is owned
--     in code — `lib/acca/surface-events.ts` for the three surface events, and the
--     header of `app/api/acca/event/route.ts` for the drill funnel.
--
--   * BOTH identity columns are NULLABLE, and neither is what the CURRENT code relies
--     on. `anon_id` is null for authed events; `user_id` is null for the anonymous
--     pre-signup drill funnel (45 rows, by design). No constraint can express "at
--     least one", because history contains 87 rows with NEITHER — see below.
--
--   * ⚠️ `user_id` IS `ON DELETE SET NULL`, AND THAT IS A LIVE HAZARD FOR ANALYTICS.
--     Deleting an auth user does not delete their funnel rows; it silently converts
--     them into rows attributable to nobody. Any teardown of a synthetic or burner
--     account must DELETE the funnel rows first if the counts are to stay honest.
--     Left as-is rather than changed to CASCADE: this migration reconciles the repo
--     with production and must not alter production behaviour. Flagged, not fixed.
--
--   * RLS ON with ZERO policies = service-role only, matching `acca_weak_areas` and
--     `acca_entitlements`. Both sink routes use the service client.
--
--   * GRANTS ARE DELIBERATELY NOT WRITTEN HERE. Live, `anon` and `authenticated` hold
--     full privileges on this table — that is Supabase's project-level default
--     privilege set for `public`, applied to every table created there, not a
--     table-specific decision. RLS with no policies is what actually denies them, and
--     a fresh Supabase project reproduces the same grants from its own bootstrap. If
--     RLS were ever disabled on this table, those default grants would expose it
--     immediately; the RLS line below is therefore load-bearing, not ceremonial.
--
-- ── THE 87 UNATTRIBUTABLE ROWS ARE A CLOSED HISTORICAL WINDOW ────────────────
--   Measured 2026-08-12, by day:
--     2026-06-23  20 rows   anon_id only        (the anonymous pre-signup surface)
--     2026-06-24  25 rows   anon_id only
--     2026-06-25  18 rows   NEITHER identity  ←┐ 87 rows, 100% of both days
--     2026-06-27  69 rows   NEITHER identity  ←┘
--     2026-06-29+           user_id present     (every row since)
--   Not scattered coercion, and not the `ON DELETE SET NULL` above: it is a contiguous
--   two-day window in which the emitter sent NEITHER identity — anon_id had been
--   dropped as the anonymous surface was removed, and user_id was not yet threaded
--   through. The probe was unplugged at both ends, and the sink's null tolerance let
--   the rows land rather than causing them. Ended 2026-06-27; nothing has produced an
--   unattributable row since. NOT deleted — they are the only record that the
--   anonymous surface ever ran.
--
-- IDEMPOTENT: safe to run twice, and a no-op against production. TRANSACTIONAL.
-- Paste the whole block into the Supabase SQL Editor and run it as ONE statement.
-- =============================================================================

BEGIN;

-- ── Table ────────────────────────────────────────────────────────────────────
-- Column order matches the live table's attnum order exactly, so a diff of
-- information_schema between environments comes back empty.
CREATE TABLE IF NOT EXISTS public.acca_funnel_events (
  id         uuid        NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  anon_id    text        NULL,
  user_id    uuid        NULL,
  event_type text        NOT NULL,
  drill_lo   text        NULL,
  metadata   jsonb       NULL,
  CONSTRAINT acca_funnel_events_pkey PRIMARY KEY (id)
);

-- ── DRIFT CHECK, NOT A SILENT CONVERGENCE ────────────────────────────────────
-- If the table already exists but is MISSING an expected column, this migration
-- stops. It deliberately does not paper over the difference with a series of
-- `ADD COLUMN IF NOT EXISTS`, for two reasons:
--   1. `event_type` is NOT NULL with no default, so adding it to a table that
--      already has rows fails anyway — the "convergent" version would half-apply
--      and leave the table in a state no environment has.
--   2. A funnel table that is partially present is a fact worth surfacing loudly.
--      Half-patching it produces a schema that matches neither the repo nor
--      production, which is strictly worse than refusing.
-- EXTRA columns are ignored: a future migration may legitimately add one, and this
-- check must not start failing when it does.
DO $$
DECLARE
  expected text[] := ARRAY['id','created_at','anon_id','user_id','event_type','drill_lo','metadata'];
  missing  text[];
BEGIN
  SELECT array_agg(c) INTO missing
  FROM unnest(expected) AS c
  WHERE NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'acca_funnel_events' AND column_name = c
  );
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION
      'acca_funnel_events exists but is missing column(s): %. Reconcile by hand — this migration will not half-apply.',
      array_to_string(missing, ', ');
  END IF;
END $$;

-- ── Foreign key ──────────────────────────────────────────────────────────────
-- ON DELETE SET NULL, as production has it. See the hazard note in the header: this
-- is why deleting a user orphans their events rather than removing them.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acca_funnel_events_user_id_fkey'
  ) THEN
    ALTER TABLE public.acca_funnel_events
      ADD CONSTRAINT acca_funnel_events_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ── Indexes ──────────────────────────────────────────────────────────────────
-- All three are plain non-unique btrees, exactly as live. There is deliberately NO
-- unique index anywhere but the primary key: an event stream has no natural key, and
-- two identical views a second apart are two real events.
CREATE INDEX IF NOT EXISTS acca_funnel_events_anon_id_idx
  ON public.acca_funnel_events USING btree (anon_id);

CREATE INDEX IF NOT EXISTS acca_funnel_events_created_at_idx
  ON public.acca_funnel_events USING btree (created_at);

CREATE INDEX IF NOT EXISTS acca_funnel_events_event_type_idx
  ON public.acca_funnel_events USING btree (event_type);

-- ── RLS: service-role only ───────────────────────────────────────────────────
-- Idempotent (re-enabling an already-enabled table is a no-op). NO policy is created,
-- and none should be: every reader and writer is a server route on the service client,
-- and a student-readable policy would expose one student's funnel to another.
ALTER TABLE public.acca_funnel_events ENABLE ROW LEVEL SECURITY;

COMMIT;

-- =============================================================================
-- VERIFICATION — run AFTER the COMMIT above. Every query must return the stated
-- result. A blank result is a FAILURE, not a pass.
--
-- Against PRODUCTION these must return exactly what they returned before the
-- migration ran — that is the assertion being made, since the migration is a no-op
-- there. Against a fresh database they prove the shape was reproduced.
-- =============================================================================

-- V1 — exactly the 7 expected columns, in order, with the live types/defaults.
-- EXPECT (7 rows, in this order):
--   id         uuid                     NO   gen_random_uuid()
--   created_at timestamp with time zone NO   now()
--   anon_id    text                     YES  NULL
--   user_id    uuid                     YES  NULL
--   event_type text                     NO   NULL
--   drill_lo   text                     YES  NULL
--   metadata   jsonb                    YES  NULL
SELECT ordinal_position, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'acca_funnel_events'
ORDER BY ordinal_position;

-- V2 — the PK and the FK, and NO check constraints.
-- EXPECT: 2 rows —
--   acca_funnel_events_pkey          p  PRIMARY KEY (id)
--   acca_funnel_events_user_id_fkey  f  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL
SELECT conname, contype, pg_get_constraintdef(oid) AS definition
FROM pg_constraint
WHERE conrelid = 'public.acca_funnel_events'::regclass
ORDER BY contype, conname;

-- V3 — four indexes: the unique pkey plus three plain btrees.
-- EXPECT: 4 rows (anon_id_idx, created_at_idx, event_type_idx, pkey). Only pkey UNIQUE.
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public' AND tablename = 'acca_funnel_events'
ORDER BY indexname;

-- V4 — RLS ON, ZERO policies (service-role only).
-- EXPECT: rls_enabled = true, policy_count = 0.
SELECT c.relrowsecurity AS rls_enabled,
       (SELECT count(*) FROM pg_policies
         WHERE schemaname = 'public' AND tablename = 'acca_funnel_events') AS policy_count
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'acca_funnel_events';

-- V5 — no triggers. The table has none and needs none (no updated_at column).
-- EXPECT: 0 rows.
SELECT tgname, pg_get_triggerdef(oid) AS definition
FROM pg_trigger
WHERE tgrelid = 'public.acca_funnel_events'::regclass AND NOT tgisinternal;

-- V6 — PRODUCTION-ONLY REGRESSION GUARD. Run this against production BEFORE and
-- AFTER. Both numbers must be identical: this migration must not touch a single row.
-- EXPECT (as of 2026-08-12, pre-migration): total_rows = 504, orphan_rows = 87,
--         anon_only_rows = 45, distinct_event_types = 8.
SELECT count(*)                                                         AS total_rows,
       count(*) FILTER (WHERE user_id IS NULL AND anon_id IS NULL)      AS orphan_rows,
       count(*) FILTER (WHERE user_id IS NULL AND anon_id IS NOT NULL)  AS anon_only_rows,
       count(DISTINCT event_type)                                       AS distinct_event_types
FROM public.acca_funnel_events;

-- V7 — PROVE THE DRIFT CHECK FIRES (P-G3: a guard whose failure path has never run is
-- untested). Run in a fresh scratch schema so nothing real is touched; the DO block
-- above is schema-qualified to `public`, so this exercises the check's logic against a
-- deliberately incomplete table rather than the guard statement itself.
--
--   BEGIN;
--     CREATE TABLE public.acca_funnel_events_drift_probe (id uuid, created_at timestamptz);
--     -- Re-run the DO block with table_name swapped to 'acca_funnel_events_drift_probe'
--     -- EXPECT: ERROR ... missing column(s): anon_id, user_id, event_type, drill_lo, metadata
--   ROLLBACK;
--
-- And the positive control — the check must stay SILENT on the real table:
--   the migration above completing without error IS that control, every time it runs.
