-- 20260808120000_resit_paper_code.sql
-- Adds paper_code to the two resit-diagnostic tables so an AFM run is distinguishable
-- from an APM one.
--
-- WHY IT IS NEEDED. /acca/resit was APM-only and neither table recorded a paper, so every
-- existing row is implicitly APM. Once /acca/afm/resit exists, rows from the two papers land
-- in the same tables and become indistinguishable — and the topic-group ids and lo_code
-- prefixes stored alongside them (topic_ratings, profile, weak_prefixes) MEAN DIFFERENT
-- THINGS per paper: APM's B1 is budgetary control, AFM's B1 is discounted cash flow.
-- Without this column a stored profile cannot be read back correctly.
--
-- BACKFILL IS SAFE AND EXACT, not an assumption: at the time of writing resit_leads holds
-- 2 rows and resit_runs holds 3, all created while /acca/resit was the only resit surface
-- in existence and hard-coded to APM.
--
-- P-DB2: written as a file AND applied by hand in the Supabase SQL Editor as ONE block,
-- followed by the verification queries at the foot of this file.

BEGIN;

-- 1. Add nullable, backfill, then constrain. Adding NOT NULL directly would fail on the
--    existing rows.
ALTER TABLE public.resit_leads ADD COLUMN IF NOT EXISTS paper_code text;
ALTER TABLE public.resit_runs  ADD COLUMN IF NOT EXISTS paper_code text;

UPDATE public.resit_leads SET paper_code = 'APM' WHERE paper_code IS NULL;
UPDATE public.resit_runs  SET paper_code = 'APM' WHERE paper_code IS NULL;

ALTER TABLE public.resit_leads ALTER COLUMN paper_code SET NOT NULL;
ALTER TABLE public.resit_runs  ALTER COLUMN paper_code SET NOT NULL;

-- 2. Constrain to the two known papers. A typo'd paper on an insert is a wrong-paper profile,
--    which is the exact failure this whole change exists to prevent, so it fails loudly here
--    rather than being stored.
ALTER TABLE public.resit_leads DROP CONSTRAINT IF EXISTS resit_leads_paper_code_check;
ALTER TABLE public.resit_leads ADD  CONSTRAINT resit_leads_paper_code_check CHECK (paper_code IN ('APM','AFM'));

ALTER TABLE public.resit_runs  DROP CONSTRAINT IF EXISTS resit_runs_paper_code_check;
ALTER TABLE public.resit_runs  ADD  CONSTRAINT resit_runs_paper_code_check  CHECK (paper_code IN ('APM','AFM'));

-- 3. Default APM for any writer that predates this change. The route ALWAYS sends the paper
--    explicitly and refuses a request without one, so this default should never be exercised
--    — it exists so an older deploy mid-rollout cannot fail its insert.
ALTER TABLE public.resit_leads ALTER COLUMN paper_code SET DEFAULT 'APM';
ALTER TABLE public.resit_runs  ALTER COLUMN paper_code SET DEFAULT 'APM';

-- 4. resit_runs is read for top-of-funnel volume per paper; resit_leads for warm leads per
--    paper. Both are small today and both will be filtered by paper from here on.
CREATE INDEX IF NOT EXISTS resit_runs_paper_code_idx  ON public.resit_runs  (paper_code, created_at DESC);
CREATE INDEX IF NOT EXISTS resit_leads_paper_code_idx ON public.resit_leads (paper_code, created_at DESC);

COMMIT;

-- ── VERIFICATION — run after the block above, in the same session ────────────
-- Expect: both tables NOT NULL, default 'APM', every existing row 'APM', zero nulls.
--
-- SELECT table_name, column_name, is_nullable, column_default
--   FROM information_schema.columns
--  WHERE table_schema = 'public'
--    AND table_name IN ('resit_leads','resit_runs')
--    AND column_name = 'paper_code';
--
-- SELECT 'resit_leads' AS t, paper_code, count(*) FROM public.resit_leads GROUP BY 1,2
-- UNION ALL
-- SELECT 'resit_runs',        paper_code, count(*) FROM public.resit_runs  GROUP BY 1,2
-- ORDER BY 1,2;
--
-- SELECT count(*) AS must_be_zero
--   FROM public.resit_leads WHERE paper_code IS NULL;
-- SELECT count(*) AS must_be_zero
--   FROM public.resit_runs  WHERE paper_code IS NULL;
--
-- Constraint proof — this INSERT must FAIL with a check-constraint violation:
-- INSERT INTO public.resit_runs (paper_code, score, sitting, attempts, completed)
-- VALUES ('FR', 40, 'Jun 2026', 1, true);
