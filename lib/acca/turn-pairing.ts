// lib/acca/turn-pairing.ts
// How the two rows of ONE tutor turn are matched back together. PURE — no DB, no model, no env.
//
// EXTRACTED from scripts/redteam-judge.ts (2026-09-04) for one reason: this rule silently
// mispaired the corpus for its entire life and NOTHING could catch it. It could not join the
// contract gate while it lived in a script that constructs an Anthropic client and a Supabase
// client at module load — a pure fixture cannot import that without env. Moving the rule here
// makes it testable; scripts/test-turn-pairing.ts is what stops the sort-and-scan coming back.
//
// The reader that consumes this is the production judge's --prod-sample pass, but the rule is
// not judge-specific: it is the answer to "which student message does this reply belong to",
// which is a fact about acca_drill_messages, not about any one consumer.

export interface RawMsg {
  user_id: string; drill_id: string | null; role: string;
  content: string; call_type: string | null; created_at: string; turn_id?: string | null;
}


/**
 * Pair a turn's two rows by IDENTITY. Never by sort order.
 *
 * ── WHY THIS IS NOT A STYLE PREFERENCE (defect found 2026-09-04) ─────────────
 * This function replaces a scan that sorted by `created_at` and, for each assistant row,
 * walked BACKWARDS to the nearest `role='user'` row of the same user+drill. That is broken
 * on this table by construction: the route writes both rows in ONE `insert([user, assistant])`,
 * so both take the same `now()` and every pair shares an identical timestamp — verified over
 * the full table, 1063 groups of exactly 2 rows, one of each role, ZERO exceptions.
 *
 * A tie has no defined order. PostgREST's `.order('created_at')` supplies no tie-break, so
 * within a pair the assistant can sort BEFORE its own student message, and the backwards scan
 * then attaches Ezra's reply to the PREVIOUS turn's question.
 *
 * ⚠️ THE ERROR RATE IS NOT A FIXED NUMBER — IT IS WHATEVER THE TIE-BREAK HAPPENS TO BE, AND
 * THAT IS THE WORSE PROPERTY. Measured THREE ways over the same 2126 rows, same algorithm:
 *     tie broken by `id`            → 543 / 1063 mispaired  (51%)
 *     rows taken in fetch order     →   10 /  491 mispaired  (2%)
 *     tie broken by `role` ascending→ 1019 / 1019 mispaired (100%)   ← 'assistant' < 'user'
 * Quoting any one of those as "the" rate is false precision. The correct statement is that the
 * pairing was UNDEFINED, and its accuracy on any given run was an accident of row order.
 *
 * This function is order-independent by construction: it groups, then checks each group's
 * composition. Verified against the full live table — 1063 pairs, 0 orphans, 0 malformed.
 *
 * ⚠️ AND THE FAILURE IS ADVERSARIAL FOR THIS RUBRIC, not neutral noise. A correct reply judged
 * against a stale question looks like answering the wrong thing, leaking an unrelated figure,
 * or revealing unprompted — so the mispairing pushes toward FALSE FLAGS. A clean report would
 * have been the surprising outcome.
 *
 * ── TWO ERAS, ONE RULE: PREFER `turn_id`, FALL BACK TO TIMESTAMP IDENTITY ────
 *   • NEW rows (post-split): `turn_id` is written on both rows at insert. It is the explicit
 *     key and it survives the split, which DESTROYS the timestamp signal — after the split the
 *     student's row is written before the model call and is deliberately EARLIER than its reply.
 *   • LEGACY rows (up to the split): no `turn_id`, but `(user_id, drill_id, created_at)` is a
 *     perfect partition of all 2126 historical rows, so pairing them is exact, not approximate.
 *
 * Anything that is not exactly one user row + one assistant row is REPORTED, never guessed:
 * an unpaired student row is a FAILED TURN (the reply never came), which is a finding in its
 * own right and must not be silently dropped the way the old `if (!prevUser) continue` dropped it.
 */
export function pairTurns(rows: readonly RawMsg[]): {
  pairs: { id: string; text: string; user_id: string }[];
  orphanUser: number; orphanAssistant: number; malformed: number;
} {
  const groups = new Map<string, RawMsg[]>();
  for (const r of rows) {
    const key = r.turn_id
      ? `t:${r.turn_id}`
      : `ts:${r.user_id}|${r.drill_id ?? 'no-drill'}|${r.created_at}`;
    (groups.get(key) ?? groups.set(key, []).get(key)!).push(r);
  }

  const pairs: { id: string; text: string; user_id: string }[] = [];
  let orphanUser = 0, orphanAssistant = 0, malformed = 0;
  for (const g of groups.values()) {
    const user = g.filter((r) => r.role === 'user');
    const asst = g.filter((r) => r.role === 'assistant');
    if (user.length === 1 && asst.length === 1) {
      const a = asst[0], u = user[0];
      pairs.push({
        id: `${a.drill_id?.slice(0, 8) ?? 'no-drill'}·${a.call_type}·${a.created_at.slice(0, 10)}`,
        text: `STUDENT: ${u.content}\n\nEZRA (${a.call_type}): ${a.content}`,
        user_id: a.user_id,
      });
    } else if (user.length === 1 && asst.length === 0) {
      orphanUser++;            // a turn that failed before the reply — a finding, not a skip
    } else if (user.length === 0 && asst.length === 1) {
      orphanAssistant++;
    } else {
      malformed++;             // never guessed at; surfaced in the run header
    }
  }
  return { pairs, orphanUser, orphanAssistant, malformed };
}
