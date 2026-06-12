-- 20260612030000_diagram_cache.sql
-- Shared SVG diagram cache. Same description → same row for all students.
-- UPDATEs allowed (to fix a cached diagram); no append-only trigger.
-- Writes are service-role only (bypasses RLS). SELECTs open to all authenticated users.

create table diagram_cache (
  cache_key   text        primary key,
  description text        not null,
  svg         text        not null,
  subject     text,
  created_at  timestamptz not null default now()
);

alter table diagram_cache enable row level security;

create policy "authenticated users can read diagram cache"
  on diagram_cache
  for select
  to authenticated
  using (true);

comment on table diagram_cache is
  'Shared SVG diagram cache. SELECT open to authenticated users. INSERT/UPDATE/DELETE via service role only (service role bypasses RLS by default).';
