// lib/acca/weak-area-store.ts
// The ONE implementation of "open (or increment) a weakness row" and "close one".
//
// WHY IT EXISTS (2026-08-12). These two functions lived privately inside
// lib/acca/case-mark-run.ts, where only the SIT path could reach them, and both had
// `source: 'sit'` written in as a literal — `writeOne` on the insert, `resolveWeaknesses` on
// the UPDATE's filter. The moment a second writer appeared (the drill path) that was two
// bugs waiting: a drill row could not be opened with its own source, and once opened by
// hand it could never be CLOSED, because the only closer filtered for sit rows.
//
// Copying the read-then-write into the tutor route would have given us two implementations
// of the same partial-index dance that could drift — the same reasoning that put the judging
// cores in lib/acca/case-marking.ts. So it moved here, with `source` as a parameter.
//
// ── SIT AND DRILL ROWS ARE INDEPENDENT, BY THE KEY AND ON PURPOSE ───────────
// The open-row unique index is (user_id, paper_code, lo_code, source) WHERE resolved_at IS
// NULL — `source` is IN the key, so one LO can carry an open sit row and an open drill row
// at the same time, and they neither collide nor merge.
//
// That is not an accident of the schema, it is the rule: A DRILL SUCCESS MUST NOT CLOSE A
// SIT FINDING (Grant-ruled 2026-08-12). A sit says "you could not write this under exam
// conditions, once, against the clock". Getting a drill on the same area right afterwards —
// untimed, with a tutor, after as many attempts as you liked — is not an answer to that
// claim. Every call therefore passes its OWN source and can only ever touch its own rows.

import type { AccaPaper } from '@/lib/acca/paper';
import type { WeaknessSource } from '@/lib/acca/weak-areas';

// Structural typing so this module never imports a server-only Supabase factory; the caller
// passes its own service client.
type Queryable = { from: (table: string) => any };   // eslint-disable-line @typescript-eslint/no-explicit-any

export interface OpenWeaknessInput {
  userId: string;
  paper: AccaPaper;
  loCode: string;
  band: string;
  source: WeaknessSource;
  /** Provenance only, and only the sit path has them. A drill row leaves both null: the
   *  ledger is keyed by (user, paper, lo, source) and these are never part of identity. */
  caseId?: string | null;
  requirementId?: string | null;
}

export interface CloseWeaknessInput {
  userId: string;
  paper: AccaPaper;
  loCode: string;
  source: WeaknessSource;
}

/**
 * Open the row for this area, or increment it if one is already open.
 *
 * READ-THEN-WRITE, NOT `.upsert()`, and that is forced by the schema rather than chosen: the
 * unique index is PARTIAL, and Postgres only infers a partial index as an ON CONFLICT arbiter
 * when the inference clause repeats its WHERE — which PostgREST's `on_conflict=` has no way
 * to express. A plain `.upsert({ onConflict: 'user_id,paper_code,lo_code,source' })` does not
 * silently degrade; it errors with "no unique or exclusion constraint matching the ON CONFLICT
 * specification". So read-then-write is the correct shape here, and the unique index remains
 * the thing that actually enforces one open row per (area, source).
 *
 * A concurrent writer losing the race hits that index and is caught: the 23505 path re-reads
 * and increments, so two simultaneous writes converge on one row rather than one vanishing.
 *
 * BEST-EFFORT BY CONTRACT — returns false rather than throwing. Both callers write this after
 * the work the student is waiting on is already done (a marked paper, a delivered teach turn),
 * and a ledger failure must never turn either into an error.
 */
export async function openWeakness(
  supabase: Queryable,
  input: OpenWeaknessInput,
): Promise<boolean> {
  const { userId, paper, loCode, band, source } = input;
  const caseId = input.caseId ?? null;
  const requirementId = input.requirementId ?? null;

  const findOpen = async () => {
    const { data } = await supabase
      .from('acca_weak_areas')
      .select('id, occurrence_count')
      .eq('user_id', userId)
      .eq('paper_code', paper)
      .eq('lo_code', loCode)
      .eq('source', source)
      .is('resolved_at', null)
      .maybeSingle();
    return (data as { id: string; occurrence_count: number } | null) ?? null;
  };

  const bump = async (row: { id: string; occurrence_count: number }) => {
    // The band is OVERWRITTEN with the latest finding, not held at its worst-ever value: the
    // ledger describes where the student is NOW. Someone who was weak and is now merely
    // competent should be steered less hard, not pinned to their worst sitting forever.
    // case_id / requirement_id are only rewritten when this caller HAS them — a drill row
    // carries neither, and blanking a sit row's provenance would lose where it came from.
    await supabase
      .from('acca_weak_areas')
      .update({
        band,
        occurrence_count: (row.occurrence_count ?? 1) + 1,
        ...(caseId ? { case_id: caseId } : {}),
        ...(requirementId ? { requirement_id: requirementId } : {}),
      })
      .eq('id', row.id);
  };

  try {
    const existing = await findOpen();
    if (existing) { await bump(existing); return true; }

    const { error } = await supabase.from('acca_weak_areas').insert({
      user_id: userId,
      paper_code: paper,
      lo_code: loCode,
      band,
      source,
      case_id: caseId,
      requirement_id: requirementId,
    });
    if (!error) return true;

    // Lost the race — the unique index did its job. Re-read and increment instead.
    if ((error as { code?: string }).code === '23505') {
      const raced = await findOpen();
      if (raced) { await bump(raced); return true; }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Close this source's open row for the area, if there is one. Returns how many rows closed
 * (0 or 1 — the partial unique index guarantees at most one).
 *
 * A single scoped UPDATE with no read first: `resolved_at IS NULL` in the WHERE makes the
 * statement a no-op when nothing is open, which is the common case. Nothing is deleted — the
 * closed row stays as history, and the PARTIAL index is what then lets a later finding open a
 * FRESH row for the same area rather than incrementing a resolved one. Students regress, and
 * the ledger has to be able to say so without pretending the earlier recovery never happened.
 *
 * `case_id`/`requirement_id` are deliberately NOT rewritten: they are the provenance of the
 * finding that OPENED the row, and overwriting them with whatever closed it would lose it.
 */
export async function closeWeakness(
  supabase: Queryable,
  { userId, paper, loCode, source }: CloseWeaknessInput,
): Promise<number> {
  try {
    const { data } = await supabase
      .from('acca_weak_areas')
      .update({ resolved_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('paper_code', paper)
      .eq('lo_code', loCode)
      .eq('source', source)
      .is('resolved_at', null)
      .select('id');
    return (data as unknown[] | null)?.length ?? 0;
  } catch {
    return 0;
  }
}
