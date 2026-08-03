-- =============================================================================
-- 20260803120100_acca_sittings.sql
-- ACCA sitting reference data + the FK that 20260803120000 deferred.
-- =============================================================================
-- ACCA sits MARCH, JUNE, SEPTEMBER, DECEMBER. A €99 pass is sitting-dated, so
-- expires_at derives from a CHOSEN sitting instead of purchase + 90 days.
--
-- RULINGS ENCODED HERE (Grant, 2026-08-03):
--   * access_until = exam_end + 7 days.
--   * FLOOR of purchase + 30 days. NOT stored on the row — it depends on when the
--     student buys, which the sitting cannot know. Stored `access_until` is the
--     sitting's own date; the grant writes max(access_until, purchase + 30d).
--     Enforcing the floor here would mean rewriting reference data per purchase.
--   * late_entry_deadline is the real cutoff for is_open. Early and standard only
--     change ACCA's own price; late is the door closing, and selling a pass for a
--     sitting the student can no longer enter is the failure this prevents.
--
-- WHY THIS TABLE EXISTS AT ALL: three spellings of the same sitting are already in
-- the database — resit_leads.sitting = 'Jun 2026', resit_runs.sitting = 'Jun 2026',
-- cohorts.target_sitting = 'Sept-26'. Adding a fourth in entitlements would make
-- joining them a string-matching exercise. All three are pointed at this table below.
--
-- P-DB2: Grant applies by hand as ONE block, then runs the verification queries.
-- =============================================================================

create table if not exists public.acca_sittings (
  id                      uuid primary key default gen_random_uuid(),

  code                    text not null unique,    -- 'MAR26' | 'JUN26' | 'SEP26' | 'DEC26'
  label                   text not null,           -- 'March 2026'
  year                    smallint not null,
  month                   smallint not null check (month in (3, 6, 9, 12)),

  exam_start              date not null,
  exam_end                date not null,

  early_entry_deadline    date,
  standard_entry_deadline date,
  late_entry_deadline     date not null,           -- the real cutoff; NOT NULL because is_open reads it

  results_date            date,

  -- The date entitlement actually reads. Its own column, NOT derived from exam_end
  -- at read time, because "how long after the exam does access last" is a commercial
  -- decision that may differ per sitting — and changing it must not need a deploy.
  -- Seeded below as exam_end + 7 per the ruling.
  access_until            date not null,

  -- Papers this sitting offers, or NULL for all. ACCA does vary availability by
  -- paper; nullable so the common case costs nothing.
  paper_codes             text[],

  -- ⚠️ THE SAFETY INTERLOCK. Seeded dates below are PROVISIONAL — see the warning
  -- block before the seed. A sitting may not be sold until someone has checked it
  -- against ACCA's published calendar and set this true. `acca_sittings_open`
  -- requires it, so an unverified sitting can never be offered at checkout.
  dates_verified          boolean not null default false,

  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),

  constraint acca_sittings_window   check (exam_end >= exam_start),
  constraint acca_sittings_access   check (access_until >= exam_end),
  constraint acca_sittings_deadline check (late_entry_deadline <= exam_start)
);

create index if not exists idx_acca_sittings_order on public.acca_sittings (year, month);

alter table public.acca_sittings enable row level security;
-- Reference data, read server-side only, like every other ACCA table here.

-- ── is_open is a VIEW, not a generated column ────────────────────────────────
-- Same reason the entitlement uniqueness could not be `where active`: a generated
-- column must be IMMUTABLE and `now()` is STABLE. A view is the correct home for a
-- predicate that changes with the clock.
create or replace view public.acca_sittings_open as
  select *,
         (dates_verified and now()::date < late_entry_deadline) as is_open
  from public.acca_sittings;

comment on view public.acca_sittings_open is
  'acca_sittings plus is_open (dates_verified AND before late entry deadline). Checkout must offer only rows where is_open.';

-- =============================================================================
-- ⚠️⚠️ UNVERIFIED SEED DATES ARE PROVISIONAL AND CANNOT BE SOLD ⚠️⚠️
-- =============================================================================
-- SOURCE OF TRUTH for every verified row below:
--   https://www.accaglobal.com/gb/en/student/getting-started/important-dates.html
--   read and reconciled 2026-08-03.
--
-- ── WHAT THE FIRST SEED GOT WRONG, AND WHY IT MATTERS HERE ──────────────────
-- The original seed derived all six rows from ACCA's usual PATTERN (exams in the
-- first full week of the month; late entry ~2 weeks out; results ~5 weeks after).
-- On the two rows that then went live, the exam windows and results dates were
-- right and the LATE ENTRY DEADLINES were wrong:
--
--     SEP26 late entry   seeded 2026-08-24   actual 2026-08-03   (21 days late)
--     DEC26 late entry   seeded 2026-11-23   actual 2026-11-09   (14 days late)
--
-- Both wrong dates sat in the correct month and satisfied every constraint on this
-- table (`late_entry_deadline <= exam_start` held for both). NOTHING STRUCTURAL
-- COULD HAVE CAUGHT THEM — only reading ACCA's own page did. Selling on either
-- would have taken €99 for a sitting the student could no longer enter, for three
-- and two weeks respectively, from exactly the buyers who leave it latest.
--
-- That is the whole case for `dates_verified` being a GATE rather than a reminder,
-- and it is banked as doctrine P-DB7 in docs/GENERATOR_DOCTRINE.md.
--
-- ── WHAT IS VERIFIED, AND WHAT IS STILL A GUESS ─────────────────────────────
-- VERIFIED (dates_verified = true, sellable): SEP26, DEC26.
-- NOT VERIFIED (dates_verified = false, invisible to `acca_sittings_open`):
--   • MAR26 / JUN26 — past sittings, kept only so historical rows can reference them.
--   • MAR27 / JUN27 — ACCA HAS NOT PUBLISHED THESE YET. ACCA publishes each session
--     roughly a year ahead. They stay false until read off the page above.
--
-- 🛑 JUN27 IS THE LAST SITTING UNDER THE CURRENT SYLLABUS. From September 2027 the
-- redesigned 11-exam qualification begins, which is also the edge of the S26–J27
-- content this product is built and verified against. NEVER add or verify a sitting
-- beyond the syllabus year the CONTENT is verified for — `dates_verified` asserts
-- only that the DATES are right and says nothing about whether the bank still
-- matches what that sitting examines (P-DB7 corollary).
--
-- ── ONLY THE LATE DEADLINE WAS VERIFIED, SO ONLY IT IS CARRIED ──────────────
-- `late_entry_deadline` is the one that gates `is_open`, and it is the one that was
-- reconciled against ACCA. `early_entry_deadline` / `standard_entry_deadline` are
-- therefore NULL on the verified rows rather than retaining their pattern-derived
-- values: leaving an unverified guess in an adjacent column on a row flagged
-- "verified" is how the next reader trusts a number nobody checked. NULL is honest —
-- it means "not recorded". Nothing reads either column today.
--
-- (Note: the original seed's SEP26 *standard* deadline happened to equal the actual
-- *late* deadline, 2026-08-03. Coincidence, not a signal — another reason not to
-- keep pattern-derived neighbours alongside a verified value.)
--
-- To open a sitting once its dates are read off the page above:
--
--   update acca_sittings
--      set exam_start = ..., exam_end = ..., late_entry_deadline = ...,
--          results_date = ..., access_until = <exam_end> + 7,
--          dates_verified = true, updated_at = now()
--    where code = 'MAR27';
--
-- access_until is exam_end + 7 per the ruling; re-derive it whenever exam_end moves.
-- =============================================================================

insert into public.acca_sittings
  (code, label, year, month, exam_start, exam_end,
   early_entry_deadline, standard_entry_deadline, late_entry_deadline,
   results_date, access_until, dates_verified)
values
  -- ⚠️ PATTERN-DERIVED, NOT VERIFIED. Past sittings, kept only so historical rows
  --    (resit_leads / resit_runs / cohorts) can reference them. Never sellable.
  ('MAR26', 'March 2026',     2026,  3, '2026-03-02', '2026-03-06',
   '2025-11-10', '2026-01-26', '2026-02-16', '2026-04-13', '2026-03-13', false),
  ('JUN26', 'June 2026',      2026,  6, '2026-06-01', '2026-06-05',
   '2026-02-09', '2026-04-27', '2026-05-18', '2026-07-13', '2026-06-12', false),
  -- ✅ VERIFIED 2026-08-03 against accaglobal.com/gb/en/student/getting-started/important-dates.html
  --    late entry CORRECTED 2026-08-24 → 2026-08-03 (the seeded value was 21 days late).
  --    early/standard NULL: not verified, see the header. Sellable.
  ('SEP26', 'September 2026', 2026,  9, '2026-09-07', '2026-09-11',
   null, null, '2026-08-03', '2026-10-19', '2026-09-18', true),
  -- ✅ VERIFIED 2026-08-03 against accaglobal.com/gb/en/student/getting-started/important-dates.html
  --    late entry CORRECTED 2026-11-23 → 2026-11-09 (the seeded value was 14 days late).
  --    early/standard NULL: not verified, see the header. Sellable.
  ('DEC26', 'December 2026',  2026, 12, '2026-12-07', '2026-12-11',
   null, null, '2026-11-09', '2027-01-18', '2026-12-18', true),
  -- ⚠️ PATTERN-DERIVED, NOT VERIFIED — ACCA HAS NOT PUBLISHED THESE YET (as at
  --    2026-08-03). Read them off the source URL above before flipping either.
  --    🛑 JUN27 is the LAST sitting under the current syllabus — see the header
  --       before adding anything after it.
  ('MAR27', 'March 2027',     2027,  3, '2027-03-01', '2027-03-05',
   '2026-11-09', '2027-01-25', '2027-02-15', '2027-04-12', '2027-03-12', false),
  ('JUN27', 'June 2027',      2027,  6, '2027-06-07', '2027-06-11',
   '2027-02-08', '2027-05-03', '2027-05-24', '2027-07-19', '2027-06-18', false)
on conflict (code) do nothing;
-- `do nothing` — this block NEVER corrects an existing row. The live table was fixed
-- by hand on 2026-08-03; this seed now reproduces that state for a FRESH environment
-- and is a no-op against the applied database. Correcting a live row is a P-DB2 step
-- with its own before/after counts, never a silent side effect of a re-run migration.

-- =============================================================================
-- THE DEFERRED FK — acca_entitlements.sitting_id
-- =============================================================================
-- 20260803120000 declared sitting_id as a bare uuid because this table did not
-- exist yet. Added now. ON DELETE SET NULL, never CASCADE: deleting a sitting must
-- never delete somebody's entitlement.
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'acca_entitlements_sitting_fk'
  ) then
    alter table public.acca_entitlements
      add constraint acca_entitlements_sitting_fk
      foreign key (sitting_id) references public.acca_sittings(id) on delete set null;
  end if;
end $$;

-- =============================================================================
-- POINT THE THREE EXISTING SITTING COLUMNS AT THIS TABLE
-- =============================================================================
-- The text columns are KEPT, not dropped. They are what the app writes today, and
-- dropping a column in the same migration that adds its replacement leaves no way
-- back if the backfill mis-maps. Retiring them is a separate, later step once the
-- app writes sitting_id.

alter table public.resit_leads add column if not exists sitting_id uuid
  references public.acca_sittings(id) on delete set null;
alter table public.resit_runs  add column if not exists sitting_id uuid
  references public.acca_sittings(id) on delete set null;
alter table public.cohorts     add column if not exists target_sitting_id uuid
  references public.acca_sittings(id) on delete set null;

-- Backfill by matching each table's own spelling. Deliberately NOT a clever
-- normaliser: there are three known spellings across five rows, and a regex that
-- silently mis-maps a sitting is worse than a mapping you can read.
--   resit_leads.sitting        = 'Jun 2026'
--   resit_runs.sitting         = 'Jun 2026'
--   cohorts.target_sitting     = 'Sept-26'
update public.resit_leads l
   set sitting_id = s.id
  from public.acca_sittings s
 where l.sitting_id is null
   and s.code = case
         when l.sitting in ('Jun 2026', 'June 2026', 'Jun-26', 'JUN26')      then 'JUN26'
         when l.sitting in ('Sept 2026', 'September 2026', 'Sept-26', 'SEP26') then 'SEP26'
         when l.sitting in ('Dec 2026', 'December 2026', 'Dec-26', 'DEC26')  then 'DEC26'
         when l.sitting in ('Mar 2026', 'March 2026', 'Mar-26', 'MAR26')     then 'MAR26'
       end;

update public.resit_runs r
   set sitting_id = s.id
  from public.acca_sittings s
 where r.sitting_id is null
   and s.code = case
         when r.sitting in ('Jun 2026', 'June 2026', 'Jun-26', 'JUN26')      then 'JUN26'
         when r.sitting in ('Sept 2026', 'September 2026', 'Sept-26', 'SEP26') then 'SEP26'
         when r.sitting in ('Dec 2026', 'December 2026', 'Dec-26', 'DEC26')  then 'DEC26'
         when r.sitting in ('Mar 2026', 'March 2026', 'Mar-26', 'MAR26')     then 'MAR26'
       end;

update public.cohorts c
   set target_sitting_id = s.id
  from public.acca_sittings s
 where c.target_sitting_id is null
   and s.code = case
         when c.target_sitting in ('Jun 2026', 'June 2026', 'Jun-26', 'JUN26')        then 'JUN26'
         when c.target_sitting in ('Sept 2026', 'September 2026', 'Sept-26', 'SEP26') then 'SEP26'
         when c.target_sitting in ('Dec 2026', 'December 2026', 'Dec-26', 'DEC26')    then 'DEC26'
         when c.target_sitting in ('Mar 2026', 'March 2026', 'Mar-26', 'MAR26')       then 'MAR26'
       end;

-- =============================================================================
-- VERIFICATION (run after applying)
-- =============================================================================
-- 1. Six sittings; exactly two verified:
--      select code, label, exam_start, exam_end, late_entry_deadline,
--             access_until, dates_verified
--      from acca_sittings order by year, month;
--      -- expect 6 rows; dates_verified = true on SEP26 and DEC26 ONLY.
--      -- SEP26 late_entry_deadline must read 2026-08-03 (NOT 2026-08-24)
--      -- DEC26 late_entry_deadline must read 2026-11-09 (NOT 2026-11-23)
--      -- Those two values are the whole point of this file's header. If either shows
--      -- the old date, this seed did not apply and the row is the pattern-derived guess.
--
-- 2. access_until is exam_end + 7 on every row (the ruling):
--      select count(*) from acca_sittings where access_until <> exam_end + 7;
--      -- expect 0
--
-- 3. Only VERIFIED sittings can ever be open, and only before their late deadline:
--      select code, is_open, dates_verified, late_entry_deadline
--      from acca_sittings_open order by year, month;
--      -- expect is_open = false on all four unverified rows, ALWAYS.
--      -- SEP26/DEC26: is_open is true only while now() < late_entry_deadline, so this
--      -- result is time-dependent by design — after 2026-11-09 every row reads false
--      -- again, which is correct rather than a regression.
--
-- 3b. No unverified sitting is EVER sellable (the interlock itself):
--      select count(*) from acca_sittings_open where is_open and not dates_verified;
--      -- expect 0, permanently. A non-zero here means the view lost its interlock.
--
-- 4. The FK landed:
--      select conname from pg_constraint where conname = 'acca_entitlements_sitting_fk';
--      -- expect 1 row
--
-- 5. Every existing sitting string mapped — NO nulls left behind:
--      select 'resit_leads' as t, sitting, sitting_id is null as unmapped from resit_leads
--      union all select 'resit_runs', sitting, sitting_id is null from resit_runs
--      union all select 'cohorts', target_sitting, target_sitting_id is null from cohorts;
--      -- expect: 2 resit_leads + 3 resit_runs on 'Jun 2026', 2 cohorts on 'Sept-26',
--      --         unmapped = false on every row that has a non-null sitting string
-- =============================================================================
