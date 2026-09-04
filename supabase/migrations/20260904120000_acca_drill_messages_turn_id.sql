-- =============================================================================
-- 20260904120000_acca_drill_messages_turn_id.sql
-- Add turn_id to acca_drill_messages — the explicit pair key.
--
-- WHY: the tutor route writes both rows of a turn in ONE insert, so they share
-- created_at, and pairing has been done by timestamp identity. The split (the
-- student's row written BEFORE the model calls, so a failed turn leaves it
-- durable) makes the user row EARLIER than its reply and destroys that signal.
-- turn_id replaces it, and is also what makes a FAILED TURN queryable: a
-- turn_id with one row.
--
-- APPLY: run manually in the Supabase SQL Editor as ONE block.
-- APPLIED + VERIFIED IN PRODUCTION 2026-09-04 (uuid, nullable, no default,
-- 2144 legacy rows NULL, append-only trigger and RLS intact). This file is the
-- byte-identical record of what was run; production was ahead of the repo until
-- it landed.
-- =============================================================================

-- ── VERIFY BEFORE ───────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM acca_drill_messages)                                    AS rows_total,
  (SELECT count(*) FROM information_schema.columns
     WHERE table_name='acca_drill_messages')                                    AS columns_now,
  (SELECT bool_or(column_name='turn_id') FROM information_schema.columns
     WHERE table_name='acca_drill_messages')                                    AS turn_id_exists,
  (SELECT count(*) FROM (SELECT created_at,user_id,drill_id FROM acca_drill_messages
     GROUP BY 1,2,3 HAVING count(*)=2 AND count(DISTINCT role)=2) g)            AS perfect_pairs;
-- EXPECT: rows_total 2144 · columns_now 8 · turn_id_exists false · perfect_pairs 1072

BEGIN;

-- ⚠️ NULLABLE, AND **NO DEFAULT**. This is the load-bearing line of the whole
-- migration. `DEFAULT gen_random_uuid()` would be actively HARMFUL, not merely
-- redundant: the default is evaluated PER ROW, so the two rows of one turn would
-- receive two DIFFERENT ids and the column would silently destroy the pairing it
-- exists to create — while looking perfectly populated. The route writes the same
-- id onto both rows explicitly; nothing else may generate one.
--
-- Nullable because it CANNOT be back-filled here: tgf_append_only() blocks UPDATE
-- on this table, so the 2144 existing rows keep turn_id NULL until the separate
-- backfill is run deliberately. That same trigger is why a "status" column would
-- be the wrong shape — a status must be flipped after the reply lands, and no row
-- on this table can ever be updated in place.
ALTER TABLE acca_drill_messages
  ADD COLUMN IF NOT EXISTS turn_id uuid;

-- PARTIAL: legacy rows are NULL until the backfill, and a partial index keeps
-- them out of it entirely rather than indexing 2144 nulls.
CREATE INDEX IF NOT EXISTS idx_acca_drill_messages_turn_id
  ON acca_drill_messages (turn_id)
  WHERE turn_id IS NOT NULL;

-- DRIFT CHECK — RAISE rather than half-apply. If the column arrived with a
-- default or as NOT NULL, the pairing guarantee is already broken and the rest
-- of this transaction must not commit on top of it.
DO $$
DECLARE d text; n text;
BEGIN
  SELECT column_default, is_nullable INTO d, n
  FROM information_schema.columns
  WHERE table_name='acca_drill_messages' AND column_name='turn_id';
  IF d IS NOT NULL THEN
    RAISE EXCEPTION 'turn_id has a DEFAULT (%) — each row would get its own id and the pair would break', d;
  END IF;
  IF n <> 'YES' THEN
    RAISE EXCEPTION 'turn_id is NOT NULL — the 2144 legacy rows cannot satisfy that until the backfill runs';
  END IF;
END $$;

COMMIT;

-- ── VERIFY AFTER ────────────────────────────────────────────────────────────
SELECT
  (SELECT count(*) FROM acca_drill_messages)                                    AS rows_total,
  (SELECT data_type FROM information_schema.columns
     WHERE table_name='acca_drill_messages' AND column_name='turn_id')          AS turn_id_type,
  (SELECT is_nullable FROM information_schema.columns
     WHERE table_name='acca_drill_messages' AND column_name='turn_id')          AS is_nullable,
  (SELECT column_default FROM information_schema.columns
     WHERE table_name='acca_drill_messages' AND column_name='turn_id')          AS must_be_null,
  (SELECT count(*) FROM acca_drill_messages WHERE turn_id IS NULL)              AS legacy_rows_still_null,
  (SELECT count(*) FROM pg_indexes WHERE tablename='acca_drill_messages')       AS indexes,
  (SELECT count(*) FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
     WHERE c.relname='acca_drill_messages' AND NOT t.tgisinternal)              AS triggers,
  (SELECT relrowsecurity FROM pg_class WHERE relname='acca_drill_messages')     AS rls_enabled,
  (SELECT count(*) FROM pg_policies WHERE tablename='acca_drill_messages')      AS policies;
-- EXPECT: rows_total 2144 · turn_id_type uuid · is_nullable YES · must_be_null NULL
--         legacy_rows_still_null 2144 · indexes 4 · triggers 1 · rls_enabled true · policies 1
