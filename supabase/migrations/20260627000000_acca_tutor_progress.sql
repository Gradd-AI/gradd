-- 20260627000000_acca_tutor_progress.sql
-- Durable teach-loop progress for the APM tutor, keyed (user_id, drill_id).
-- Replaces the volatile client-held session_state.miss_count (resets on reload).
-- Holds ONLY teach-loop state — miss_count + last diagnosis/attempt.
-- It does NOT hold the sealed model answer or the `counted` cap flag: those stay
-- inside the AES-GCM enc blob in session_state. No field crosses between the two stores.
--
-- Standalone: no FK constraints (keeps this purely additive — zero lock/coupling on
-- existing tables). Service-role only: the tutor route uses createServiceClient()
-- (bypasses RLS); RLS is enabled with no permissive policy so anon/authenticated keys
-- cannot read or write this table directly. Mirrors the diagram_cache access pattern.

create table if not exists public.acca_tutor_progress (
  user_id           uuid        not null,
  drill_id          uuid        not null,
  miss_count        integer     not null default 0,
  last_diagnosis    text,
  last_real_attempt text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  primary key (user_id, drill_id)
);

alter table public.acca_tutor_progress enable row level security;

comment on table public.acca_tutor_progress is
  'APM tutor teach-loop progress, keyed (user_id, drill_id). Durable replacement for '
  'volatile session_state.miss_count. Service-role only (RLS on, no permissive policy). '
  'Does not hold the sealed model answer or the counted cap flag — those stay in enc.';
