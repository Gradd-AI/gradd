-- 20260627110000_acca_tutor_progress_resolved.sql
-- Item 3 (earned reveal): mark a (user, drill) as RESOLVED once the earned reveal
-- (call4_reveal) has fired — i.e. the student struggled (miss_count >= 2), explicitly
-- asked, and was shown the worked model. Durable so the reveal can be re-read free of
-- charge and so resolution can drive analytics + spaced re-test scheduling.
-- Additive: only alters acca_tutor_progress (created 20260627000000). Idempotent.

alter table public.acca_tutor_progress
  add column if not exists resolved boolean not null default false;

comment on column public.acca_tutor_progress.resolved is
  'True once the earned reveal (call4_reveal) has fired for this (user, drill). '
  'Enables free re-read without re-charge, resolution-rate analytics, and spaced '
  're-test scheduling (P2). Server/service-role only.';
