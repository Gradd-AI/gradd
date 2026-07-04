-- =============================================================================
-- 20260703130000_acca_mock_attempts.sql
-- APM timed-mock attempts — one row per sat paper, holds the authoritative clock.
-- =============================================================================
-- WHY: A mock is a full timed paper (1 Section A case + 2 Section B cases) sat
-- sequentially under one clock. This table records when the student started a
-- paper and when the clock expires (ends_at) so the countdown is SERVER-
-- AUTHORITATIVE — a refresh resumes the same clock, it never resets. Written by
-- POST /api/acca/mock (service-role) on start; PATCH marks completed on finish.
--
-- DESIGN NOTES:
--  * Keyed (user_id, mock_id, started_at): one row per attempt, so retakes of the
--    same paper each get their own row. GET reads the latest by started_at.
--  * mock_id is a TEXT paper identifier (e.g. 'paper-1') defined in lib/acca/mocks.ts,
--    NOT an fk — the paper set is code config, not a table.
--  * ends_at is the clock's authority: remaining = ends_at - now(), evaluated
--    server-side. completed flips true when the results screen is reached (all
--    cases done OR the clock ran out).
--  * Per-case work is NOT duplicated here — technical passes live in
--    acca_case_progress and professional marks in acca_case_marking, keyed by case.
--  * RLS: enabled, NO permissive policy — service-role only, mirroring the other
--    case tables.
--  * FK-free, idempotent (create ... if not exists); safe to re-run.
-- =============================================================================

create table if not exists acca_mock_attempts (
  user_id     uuid        not null,
  mock_id     text        not null,   -- paper identifier, e.g. 'paper-1'
  started_at  timestamptz not null default now(),
  ends_at     timestamptz not null,             -- authoritative clock expiry
  completed   boolean     not null default false,
  primary key (user_id, mock_id, started_at)
);

alter table acca_mock_attempts enable row level security;

-- =============================================================================
-- VERIFICATION (run after applying):
--   select table_name from information_schema.tables
--   where table_name = 'acca_mock_attempts';
--   -- expect 1 row.
--   select relname, relrowsecurity from pg_class
--   where relname = 'acca_mock_attempts';
--   -- expect relrowsecurity = true.
-- =============================================================================
