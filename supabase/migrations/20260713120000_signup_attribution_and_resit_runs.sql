-- Signup attribution + anonymous resit-run logging (2026-07-13).
--
-- profiles.signup_attribution: first-touch utm_* + fbclid captured on the landing
--   (client cookie), written at the auth callback for a brand-new signup. Nullable jsonb,
--   so pre-existing profiles are simply null. Lets 24/07 judgement attribute signups to source.
--
-- resit_runs: one row per anonymous resit-diagnostic COMPLETION (the 'plan' action). Most
--   runs never leave an email, so resit_leads undercounts funnel entry on our primary ad CTA
--   (/acca/resit). This measures top-of-funnel volume + source. Service-role writes only.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signup_attribution jsonb;

CREATE TABLE IF NOT EXISTS resit_runs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at    timestamptz NOT NULL DEFAULT now(),
  score         integer,
  sitting       text,
  attempts      integer,
  weak_prefixes text[],
  completed     boolean NOT NULL DEFAULT true,
  attribution   jsonb
);

-- No RLS policies = service-role (server route) writes only, no anon/auth read/write.
ALTER TABLE resit_runs ENABLE ROW LEVEL SECURITY;

-- ── Verification (run after apply) ──
-- SELECT column_name FROM information_schema.columns
--   WHERE table_name='profiles' AND column_name='signup_attribution';           -- expect 1 row
-- SELECT to_regclass('public.resit_runs');                                        -- expect resit_runs
-- SELECT relrowsecurity FROM pg_class WHERE relname='resit_runs';                 -- expect t
