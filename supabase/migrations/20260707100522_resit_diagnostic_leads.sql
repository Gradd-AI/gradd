-- resit_leads — email capture + computed diagnostic profile for the free,
-- no-auth resit tool at /acca/resit. Committed so the repo matches the
-- resit_leads table already created by hand in the Supabase SQL Editor.
--
-- Posture mirrors acca_leads: anonymous leads (NOT authenticated users),
-- inserted only by the server via the service-role client. RLS is ON with
-- NO policies, so the anon/authenticated client can never read or write it —
-- service-role bypasses RLS. A row is written only at the "email me this plan"
-- capture step, so email is NOT NULL.

create table if not exists public.resit_leads (
  id             uuid primary key default gen_random_uuid(),
  email          text not null unique,
  score          integer not null,
  sitting        text not null,
  attempts       integer not null,
  topic_ratings  jsonb not null default '{}'::jsonb,
  habit_answers  jsonb not null default '{}'::jsonb,
  profile        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

alter table public.resit_leads enable row level security;
-- No policies: service-role (server) access only, exactly like acca_leads.
