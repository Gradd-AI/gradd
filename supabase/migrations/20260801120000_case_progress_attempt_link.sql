-- =============================================================================
-- 20260801120000_case_progress_attempt_link.sql
-- acca_case_progress.attempt_id — a sit row belongs to a SITTING, structurally.
-- =============================================================================
-- ⚠ FILE ONLY. NOT APPLIED. Paste into the Supabase SQL Editor as ONE block,
--   then run the VERIFICATION section below it. P-DB2: the write is shown before
--   it happens. P-DB3 snapshot committed first:
--   docs/rollbacks/acca_case_progress_attempt_link_20260801.json
--
-- ── THE DEFECT THIS CLOSES (diagnosed 2026-08-01) ───────────────────────────
-- `acca_case_progress.final_answer` is written by TWO paths — the practice teach
-- loop (on a passing answer) and the sit (on submission) — and THREE decisions
-- were keyed on it, all of which therefore could not tell the two apart:
--
--   1. COMPLETENESS. `paperFullySubmitted` / `caseMarkReady` tested
--      `final_answer != null`, which practice work satisfies. A user who had
--      practised the three APM mock cases in July opened the mock and it went
--      straight to marking, returning 80/80 technical and 20/20 PS on a paper
--      they had never sat. The marker was not at fault: it was handed 2,400–3,300
--      characters of genuine teach-loop-accepted work and marked it correctly.
--   2. IMMUTABILITY. `case/turn`'s 409 also tested `final_answer != null`, so a
--      practice row BLOCKS a later sit of the same requirement — permanently.
--      Any user who met a mock case through the old MockRunner (which ran at
--      `sitting=false`) can never sit that paper.
--   3. PACING vs MARKING DISAGREEING. `submitted_at` is written only by the sit,
--      so pacing read every requirement as `not_reached` while marking read the
--      practice answers as exemplary — one screen asserting both "no answer was
--      recorded" and "40/40".
--
-- ── WHY A LINK AND NOT A FLAG (Grant-ruled 2026-08-01) ──────────────────────
-- Keying on `submitted_at` alone would work today — every one of the 29 existing
-- rows has it NULL, so nothing breaks and no backfill is needed. It was rejected
-- because it is a TIMESTAMP DOING A BOOLEAN'S JOB: it holds only while exactly
-- one writer sets it, an invariant maintained by convention. That is precisely
-- the shape of the bug being fixed — `final_answer` was fine until it had a
-- second writer, and nobody noticed.
--
-- `attempt_id` is not a flag: it carries WHICH sitting, which the product needs
-- anyway. It makes sit-ness structural (a row belongs to an attempt or it does
-- not, and NULL means practice), it scopes marking and the debrief to one
-- sitting, and it makes RE-SITS possible — currently impossible without manually
-- deleting rows.
--
-- ── WHY THE PRIMARY KEY HAS TO CHANGE ───────────────────────────────────────
-- The PK is (user_id, case_id, requirement_id): ONE row per user per requirement,
-- so a practice row and a sit row cannot coexist. Grant ruled 2026-08-01 that
-- PRACTICE ROWS SURVIVE alongside sit rows — the practice history is real work and
-- the debrief reads attempt-scoped rows only. So the key must widen to include
-- the attempt, and a PK cannot contain NULL.
--
-- `UNIQUE NULLS NOT DISTINCT` (PostgreSQL 15+; this project runs 17.6) is what
-- makes that clean: NULLs compare EQUAL, so the constraint permits exactly ONE
-- practice row (attempt_id IS NULL) per requirement AND exactly one row per
-- attempt. A plain UNIQUE would treat every NULL as distinct and allow unlimited
-- duplicate practice rows.
--
-- It is also a REAL CONSTRAINT rather than a partial index, which matters
-- practically: PostgREST can name it as an `on_conflict` target, so the existing
-- `.upsert(..., { onConflict: ... })` calls keep working. A partial unique index
-- could not be used that way — the same trap `acca_weak_areas` hit, where the
-- upsert had to become a read-then-write.
--
-- ── SAFETY ──────────────────────────────────────────────────────────────────
-- NO DATA IS ALTERED. All 29 existing rows keep every value and get
-- attempt_id = NULL, which is correct: every one is practice work
-- (all 29 have passed=true and submitted_at IS NULL — verified 2026-08-01, and
-- V0 below re-asserts it before anything changes). No sit has ever been recorded.
--
-- IDEMPOTENT and TRANSACTIONAL: safe to run twice, all-or-nothing.
-- =============================================================================

BEGIN;

-- ── V0 — REFUSE TO RUN IF THE ASSUMPTION IS WRONG ───────────────────────────
-- The whole migration rests on "every existing row is practice work". If a sit
-- row exists that this has not accounted for, stop rather than silently label it
-- practice by giving it attempt_id = NULL. A guard that runs BEFORE the change is
-- worth more than a verification query that runs after it.
DO $$
DECLARE n_sit integer;
BEGIN
  SELECT count(*) INTO n_sit FROM public.acca_case_progress WHERE submitted_at IS NOT NULL;
  IF n_sit > 0 THEN
    RAISE EXCEPTION 'ABORT: % row(s) already carry submitted_at. They are sit rows and would be '
      'mislabelled as practice (attempt_id NULL) by this migration. Backfill their attempt_id '
      'explicitly first.', n_sit;
  END IF;
END $$;

-- ── 1. acca_mock_attempts: a surrogate id so it can be referenced ───────────
-- Its PK is (user_id, mock_id, started_at) — a composite that would make an
-- awkward three-column FK. The surrogate is additive: the existing PK stays, so
-- nothing that reads or writes this table changes.
ALTER TABLE public.acca_mock_attempts
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acca_mock_attempts_id_key'
  ) THEN
    ALTER TABLE public.acca_mock_attempts ADD CONSTRAINT acca_mock_attempts_id_key UNIQUE (id);
  END IF;
END $$;

-- ── 2. acca_case_progress: surrogate id, attempt link, new uniqueness ───────
ALTER TABLE public.acca_case_progress
  ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();

-- NULL = practice work. NOT NULL = written during that sitting.
-- ON DELETE CASCADE: deleting an attempt deletes the work done in it, which is
-- the correct lifecycle — an attempt's rows have no meaning without the attempt.
ALTER TABLE public.acca_case_progress
  ADD COLUMN IF NOT EXISTS attempt_id uuid NULL
    REFERENCES public.acca_mock_attempts(id) ON DELETE CASCADE;

-- Swap the key. Order matters: add the new uniqueness FIRST so the table is never
-- momentarily unconstrained, then drop the old PK, then promote the surrogate.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acca_case_progress_user_case_req_attempt_key'
  ) THEN
    ALTER TABLE public.acca_case_progress
      ADD CONSTRAINT acca_case_progress_user_case_req_attempt_key
      UNIQUE NULLS NOT DISTINCT (user_id, case_id, requirement_id, attempt_id);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acca_case_progress_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.acca_case_progress DROP CONSTRAINT acca_case_progress_pkey;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'acca_case_progress_id_pkey' AND contype = 'p'
  ) THEN
    ALTER TABLE public.acca_case_progress ADD CONSTRAINT acca_case_progress_id_pkey PRIMARY KEY (id);
  END IF;
END $$;

-- The read path the sit uses: "this attempt's rows for these cases".
CREATE INDEX IF NOT EXISTS acca_case_progress_attempt_idx
  ON public.acca_case_progress (attempt_id)
  WHERE attempt_id IS NOT NULL;

COMMENT ON COLUMN public.acca_case_progress.attempt_id IS
  'The acca_mock_attempts row this work was submitted during. NULL = practice work. '
  'This is what makes a sit row distinguishable from a practice row BY CONSTRUCTION rather '
  'than by inferring it from final_answer or submitted_at. Marking, completeness, the 409 '
  'immutability rule and the debrief all scope on it.';

COMMIT;

-- =============================================================================
-- VERIFICATION — run AFTER the COMMIT. Every query must return the stated
-- result. A blank result is a FAILURE, not a pass.
-- =============================================================================

-- V1 — both columns landed, nullable as designed.
-- EXPECT: acca_case_progress.id uuid NOT NULL default gen_random_uuid();
--         acca_case_progress.attempt_id uuid NULLABLE, no default.
SELECT table_name, column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND ((table_name = 'acca_case_progress' AND column_name IN ('id', 'attempt_id'))
    OR (table_name = 'acca_mock_attempts'  AND column_name = 'id'))
ORDER BY table_name, column_name;

-- V2 — the key swap completed. EXPECT exactly:
--   acca_case_progress_id_pkey                      PRIMARY KEY (id)
--   acca_case_progress_user_case_req_attempt_key    UNIQUE NULLS NOT DISTINCT (...)
--   and NO constraint named acca_case_progress_pkey.
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'public.acca_case_progress'::regclass AND contype IN ('p', 'u')
ORDER BY conname;

-- V3 — NULLS NOT DISTINCT is actually set. This is the load-bearing detail: without
-- it the constraint would permit unlimited duplicate practice rows.
-- EXPECT: nulls_not_distinct = true.
SELECT i.indexrelid::regclass AS index_name, i.indnullsnotdistinct AS nulls_not_distinct
FROM pg_index i
WHERE i.indexrelid = 'acca_case_progress_user_case_req_attempt_key'::regclass;

-- V4 — the FK exists and cascades.
-- EXPECT: 1 row, ON DELETE CASCADE, referencing acca_mock_attempts(id).
SELECT conname, pg_get_constraintdef(oid) AS def
FROM pg_constraint
WHERE conrelid = 'public.acca_case_progress'::regclass AND contype = 'f';

-- V5 — NO DATA MOVED. EXPECT: total 29, attempt_id NULL on all 29, and the same
--      29 rows still carrying final_answer. (Compare against the committed
--      snapshot docs/rollbacks/acca_case_progress_attempt_link_20260801.json.)
SELECT count(*)                                        AS total_rows,
       count(*) FILTER (WHERE attempt_id IS NULL)      AS practice_rows,
       count(*) FILTER (WHERE attempt_id IS NOT NULL)  AS sit_rows,
       count(*) FILTER (WHERE final_answer IS NOT NULL) AS with_final_answer,
       count(*) FILTER (WHERE submitted_at IS NOT NULL) AS with_submitted_at,
       count(DISTINCT id)                              AS distinct_ids
FROM public.acca_case_progress;

-- V6 — every attempt got a distinct surrogate id.
-- EXPECT: total = distinct_ids = 10, nulls = 0.
SELECT count(*) AS total, count(DISTINCT id) AS distinct_ids,
       count(*) FILTER (WHERE id IS NULL) AS nulls
FROM public.acca_mock_attempts;

-- =============================================================================
-- V7 — PROVE THE CONSTRAINTS FIRE (P-G3: a check whose failure path has never
-- run is untested — presence is not proof). Run each block as written; each is
-- wrapped so nothing is left behind. Substitute a real (user_id, case_id,
-- requirement_id) triple from V5 where marked.
-- =============================================================================
--
-- V7a — NULLS NOT DISTINCT: a SECOND practice row for the same requirement must
--       be REFUSED. This is the one a plain UNIQUE would wrongly allow.
--   BEGIN;
--     INSERT INTO public.acca_case_progress (user_id, case_id, requirement_id, attempt_id)
--     SELECT user_id, case_id, requirement_id, NULL
--     FROM public.acca_case_progress WHERE attempt_id IS NULL LIMIT 1;
--   ROLLBACK;                       -- EXPECT: unique violation on ..._user_case_req_attempt_key
--
-- V7b — A SIT ROW MAY COEXIST WITH THE PRACTICE ROW. This is the whole ruling:
--       practice history survives. Uses a real attempt id.
--   BEGIN;
--     INSERT INTO public.acca_case_progress (user_id, case_id, requirement_id, attempt_id)
--     SELECT p.user_id, p.case_id, p.requirement_id, a.id
--     FROM public.acca_case_progress p
--     CROSS JOIN LATERAL (SELECT id FROM public.acca_mock_attempts WHERE user_id = p.user_id LIMIT 1) a
--     WHERE p.attempt_id IS NULL LIMIT 1;
--     -- EXPECT: SUCCEEDS, and the count for that triple is now 2.
--     SELECT count(*) FROM public.acca_case_progress p
--     WHERE (p.user_id, p.case_id, p.requirement_id) =
--           (SELECT user_id, case_id, requirement_id FROM public.acca_case_progress
--            WHERE attempt_id IS NOT NULL LIMIT 1);
--   ROLLBACK;
--
-- V7c — TWO ROWS FOR THE SAME REQUIREMENT IN THE SAME ATTEMPT must be REFUSED.
--   BEGIN;
--     INSERT INTO public.acca_case_progress (user_id, case_id, requirement_id, attempt_id)
--     SELECT p.user_id, p.case_id, p.requirement_id, a.id
--     FROM public.acca_case_progress p
--     CROSS JOIN LATERAL (SELECT id FROM public.acca_mock_attempts WHERE user_id = p.user_id LIMIT 1) a
--     WHERE p.attempt_id IS NULL LIMIT 1;
--     -- repeat the SAME insert:
--     INSERT INTO public.acca_case_progress (user_id, case_id, requirement_id, attempt_id)
--     SELECT p.user_id, p.case_id, p.requirement_id, a.id
--     FROM public.acca_case_progress p
--     CROSS JOIN LATERAL (SELECT id FROM public.acca_mock_attempts WHERE user_id = p.user_id LIMIT 1) a
--     WHERE p.attempt_id IS NULL LIMIT 1;
--   ROLLBACK;                       -- EXPECT: unique violation on the SECOND insert
--
-- V7d — THE RE-SIT PATH: two DIFFERENT attempts on the same requirement must both
--       be allowed. This is what the change buys, and it must be proven, not assumed.
--   BEGIN;
--     INSERT INTO public.acca_mock_attempts (user_id, mock_id, started_at, ends_at, completed)
--     VALUES ('00000000-0000-4000-8000-0000000000aa', 'paper-1', now(), now() + interval '195 min', false)
--     RETURNING id;                 -- note this id as :A1
--     INSERT INTO public.acca_mock_attempts (user_id, mock_id, started_at, ends_at, completed)
--     VALUES ('00000000-0000-4000-8000-0000000000aa', 'paper-1', now() + interval '1 sec', now() + interval '196 min', false)
--     RETURNING id;                 -- note this id as :A2
--     -- the SAME requirement, in two different attempts:
--     INSERT INTO public.acca_case_progress (user_id, case_id, requirement_id, attempt_id)
--     VALUES ('00000000-0000-4000-8000-0000000000aa',
--             'a6000000-0000-4000-8000-0000000000b1',
--             (SELECT id FROM public.acca_case_requirements
--               WHERE case_id = 'a6000000-0000-4000-8000-0000000000b1' LIMIT 1), :A1);
--     INSERT INTO public.acca_case_progress (user_id, case_id, requirement_id, attempt_id)
--     VALUES ('00000000-0000-4000-8000-0000000000aa',
--             'a6000000-0000-4000-8000-0000000000b1',
--             (SELECT id FROM public.acca_case_requirements
--               WHERE case_id = 'a6000000-0000-4000-8000-0000000000b1' LIMIT 1), :A2);
--   ROLLBACK;                       -- EXPECT: BOTH inserts SUCCEED
--
-- V7e — THE FK CASCADE: deleting an attempt removes its rows and leaves practice
--       rows untouched.
--   BEGIN;
--     -- (build A1 + one sit row as in V7d, then:)
--     DELETE FROM public.acca_mock_attempts WHERE id = :A1;
--     SELECT count(*) FROM public.acca_case_progress WHERE attempt_id = :A1;  -- EXPECT 0
--     SELECT count(*) FROM public.acca_case_progress WHERE attempt_id IS NULL; -- EXPECT 29
--   ROLLBACK;
