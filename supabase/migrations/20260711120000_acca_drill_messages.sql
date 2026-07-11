-- ============================================================
-- 20260711120000_acca_drill_messages.sql
--
-- APM/AFM tutor transcript persistence. One row per message
-- (user + assistant) per turn. Append-only, immutable, RLS
-- student-reads-own — mirrors session_messages (IB/LC) but in the
-- acca_* namespace, keyed by user_id + drill_id (no sessions FK:
-- APM has no sessions row). Reuses tgf_append_only() from
-- 20260612020000_durable_transcript_events.sql (REFERENCED, not
-- recreated — the shared function body must not be touched).
--
-- APPLY: run manually in the Supabase SQL Editor as ONE block.
-- Applied + verified 2026-07-11 (8 cols; RLS on; one SELECT policy;
-- append-only trigger; pk + 2 indexes; role + outcome CHECKs only,
-- call_type deliberately unconstrained; 0 rows).
--
-- call_type carries NO CHECK: the §10 write is swallowed (best-effort),
-- so a CHECK rejection on an unlisted leg ('reveal','warm', future)
-- would be silent transcript loss. The route owns the vocabulary.
-- ============================================================

begin;

create table if not exists acca_drill_messages (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null,
  drill_id   uuid,                    -- nullable: legacy / no-drill_id turns still captured
  role       text        not null check (role in ('user','assistant')),
  content    text        not null,
  call_type  text,                    -- NO check (see header)
  outcome    text        check (outcome is null or outcome in ('correct','miss')),
  created_at timestamptz not null default now()
);

-- Append-only: block UPDATE/DELETE at row level (shared trigger fn from 20260612020000).
drop trigger if exists trg_acca_drill_messages_immutable on acca_drill_messages;
create trigger trg_acca_drill_messages_immutable
  before update or delete on acca_drill_messages
  for each row execute function tgf_append_only();

-- Look-back replay (per drill) + weekly review sweep (per student).
create index if not exists idx_acca_drill_messages_user_drill_created
  on acca_drill_messages (user_id, drill_id, created_at);
create index if not exists idx_acca_drill_messages_user_created
  on acca_drill_messages (user_id, created_at);

-- RLS: students read their OWN transcript; all writes via service role.
alter table acca_drill_messages enable row level security;

-- CREATE POLICY has no IF NOT EXISTS — guard so a re-run is a no-op.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where tablename = 'acca_drill_messages'
      and policyname = 'acca_drill_messages_select_own'
  ) then
    create policy acca_drill_messages_select_own on acca_drill_messages
      for select using (user_id = auth.uid());
  end if;
end $$;
-- No INSERT/UPDATE/DELETE policies: inserts are service-role only (bypass RLS);
-- updates/deletes blocked by the trigger.

commit;
