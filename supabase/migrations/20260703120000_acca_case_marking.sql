-- =============================================================================
-- 20260703120000_acca_case_marking.sql
-- APM professional-skills marking — terminal whole-case mark persistence.
-- =============================================================================
-- WHY: When a case is fully complete (every requirement passed for a user), one
-- holistic marking pass scores the student's whole answer against the ACCA
-- section-E professional-skills descriptors and awards the case's professional
-- marks (5 for Section B, 10 for Section A). This table persists that result so
-- it survives the session and feeds later analytics. Written by POST
-- /api/acca/case/mark (service-role), idempotent upsert on re-mark.
--
-- DESIGN NOTES:
--  * Keyed (user_id, case_id): one professional-skills mark per user per case,
--    re-mark overwrites. Mirrors the (user, case, …) keying of acca_case_progress.
--  * per_skill jsonb holds the array of per-skill objects
--    [{skill, mark_awarded, marks_available, feedback}] returned by the marking
--    pass — the evidence trail, not just the totals.
--  * model text records which model marked (audit), same spirit as tracking the
--    engine's model choice.
--  * RLS: enabled, NO permissive policy — service-role only, exactly mirroring
--    acca_case_progress and the other case tables.
--  * FK-free, matching acca_case_progress (deploy-safe; no coupling to existing
--    rows).
--  * Idempotent: create ... if not exists; safe to re-run.
-- =============================================================================

create table if not exists acca_case_marking (
  user_id                      uuid     not null,
  case_id                      uuid     not null,
  professional_marks_awarded   smallint not null,
  professional_marks_available smallint not null,
  per_skill                    jsonb    not null,   -- [{skill, mark_awarded, marks_available, feedback}]
  model                        text,                -- which model marked (audit)
  marked_at                    timestamptz not null default now(),
  primary key (user_id, case_id)
);

alter table acca_case_marking enable row level security;

-- =============================================================================
-- VERIFICATION (run after applying):
--   select table_name from information_schema.tables
--   where table_name = 'acca_case_marking';
--   -- expect 1 row.
--   select relname, relrowsecurity from pg_class
--   where relname = 'acca_case_marking';
--   -- expect relrowsecurity = true.
-- =============================================================================
