// scripts/backfill-drill-weak-areas.ts
//   npx tsx --env-file=.env.local scripts/backfill-drill-weak-areas.ts            # dry run
//   npx tsx --env-file=.env.local scripts/backfill-drill-weak-areas.ts --apply
//   npx tsx --env-file=.env.local scripts/backfill-drill-weak-areas.ts --revert
//
// ── WHY A BACKFILL AT ALL ────────────────────────────────────────────────────
// The drill-path writer (app/api/acca/tutor/route.ts §10a) only sees turns taken AFTER it
// ships, so on the day it lands the ledger still holds nothing — and the whole point of
// shipping it unflagged was to MEASURE what it does. 644 scored attempts across 27 users
// already exist in acca_drill_attempts; this replays them through the same pure rules the
// live writer uses, so the ledger describes where students actually are rather than where
// they have been since a deploy.
//
// ── IT REPLAYS THE ATTEMPT LOG, IT DOES NOT GUESS A FINAL STATE ─────────────
// Chronologically, per user, in `created_at` order:
//   • a MISS increments that DRILL's running miss count; at 2 it opens (competent), at 3+
//     it re-opens as weak — the same `drillBandFor` the route calls.
//   • a CORRECT on that LO closes the open row — the same rule as the route.
// Opening an already-open row increments occurrence_count and overwrites the band, exactly
// as `openWeakness` does live.
//
// ⚠️ `acca_tutor_progress.resolved` IS DELIBERATELY NOT CONSULTED, and this is the one place
// the backfill differs from the live predicate. Live, a miss on an already-`resolved` drill
// opens nothing. `resolved` is set on two paths — an accepted attempt, and an EARNED REVEAL —
// and only the first leaves a row in the attempt log. So consulting the CURRENT value here
// would suppress opens for drills the student never solved but was SHOWN the answer to, which
// is precisely the case the closing ruling exists to protect (a reveal must not resolve a
// weakness). Replaying the log alone is therefore MORE faithful to the ruling than reading
// `resolved` would be, not less. Stated rather than silently chosen.
//
// ── RULING 6: THE PAPER JOIN IS NOT OPTIONAL ────────────────────────────────
// acca_drill_attempts carries `lo_code` but NO paper column, and AFM and APM LO codes collide
// exactly. Every attempt is resolved to its paper through drill_id → acca_drills.paper_code
// (the same join lib/org/queries.ts uses for the readiness signal). An attempt whose drill no
// longer resolves is SKIPPED and counted, never defaulted to APM — a defaulted paper here
// would steer the wrong paper's serve for that student forever.
//
// SAFE TO RE-RUN: --apply refuses if any source='drill' row already exists. --revert deletes
// only source='drill' rows, which is what makes this reversible: sit rows are never touched.

import { createClient } from '@supabase/supabase-js';
import { drillBandFor, type WeaknessBand } from '../lib/acca/weak-areas';

const APPLY = process.argv.includes('--apply');
const REVERT = process.argv.includes('--revert');

const svc = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
);

interface Attempt { user_id: string; drill_id: string; lo_code: string; outcome: string; created_at: string }
/** One row the replay decided should be OPEN at the end of history. */
interface Planned {
  user_id: string; paper_code: string; lo_code: string;
  band: WeaknessBand; occurrence_count: number;
}

async function main() {
  if (REVERT) {
    const { data, error } = await svc.from('acca_weak_areas').delete().eq('source', 'drill').select('id');
    if (error) throw new Error(error.message);
    console.log(`REVERTED: deleted ${(data ?? []).length} source='drill' row(s). Sit rows untouched.`);
    return;
  }

  // ── Pre-flight: never write on top of an existing drill backfill ──
  const { count: existingDrill } = await svc.from('acca_weak_areas')
    .select('*', { count: 'exact', head: true }).eq('source', 'drill');
  if (APPLY && (existingDrill ?? 0) > 0) {
    console.log(`REFUSED: ${existingDrill} source='drill' row(s) already exist. --revert first.`);
    process.exitCode = 1;
    return;
  }

  const { data: attemptsRaw, error: aErr } = await svc
    .from('acca_drill_attempts')
    .select('user_id, drill_id, lo_code, outcome, created_at')
    .order('created_at', { ascending: true });
  if (aErr) throw new Error(aErr.message);
  const attempts = (attemptsRaw ?? []) as Attempt[];

  // ── The paper join (ruling 6) ──
  const drillIds = [...new Set(attempts.map((a) => a.drill_id).filter(Boolean))];
  const paperByDrill = new Map<string, string>();
  for (let i = 0; i < drillIds.length; i += 200) {
    const { data } = await svc.from('acca_drills')
      .select('id, paper_code').in('id', drillIds.slice(i, i + 200));
    for (const d of (data ?? []) as { id: string; paper_code: string }[]) {
      paperByDrill.set(d.id, d.paper_code);
    }
  }

  // ── Replay ──
  // Keyed (user, paper, lo). `missesByDrill` is per DRILL, because that is what the live
  // `miss_count` is; the ROW it opens is per LO, so two stuck drills on one LO increment one
  // row rather than making two — same as live.
  const missesByDrill = new Map<string, number>();
  const open = new Map<string, Planned>();
  let skippedNoPaper = 0, opens = 0, bumps = 0, closes = 0;

  for (const a of attempts) {
    const paper = paperByDrill.get(a.drill_id);
    if (!paper) { skippedNoPaper++; continue; }          // never default the paper
    const lo = (a.lo_code ?? '').trim();
    if (!lo) continue;
    const key = `${a.user_id}::${paper}::${lo}`;

    if (a.outcome === 'correct') {
      if (open.delete(key)) closes++;                    // the drill-path close, replayed
      continue;
    }
    if (a.outcome !== 'miss') continue;

    const dk = `${a.user_id}::${a.drill_id}`;
    const n = (missesByDrill.get(dk) ?? 0) + 1;
    missesByDrill.set(dk, n);
    const band = drillBandFor(n);
    if (!band) continue;                                 // the one-miss rule

    const existing = open.get(key);
    if (existing) {
      existing.occurrence_count++;                       // bump + overwrite band, as live
      existing.band = band;
      bumps++;
    } else {
      open.set(key, { user_id: a.user_id, paper_code: paper, lo_code: lo, band, occurrence_count: 1 });
      opens++;
    }
  }

  const planned = [...open.values()];
  console.log(`\nBACKFILL — drill-path weakness ledger  (${APPLY ? 'APPLY' : 'DRY RUN'})`);
  console.log(`  attempts replayed      ${attempts.length}`);
  console.log(`  skipped (no paper)     ${skippedNoPaper}`);
  console.log(`  open events            ${opens}`);
  console.log(`  bump events            ${bumps}`);
  console.log(`  close events           ${closes}`);
  console.log(`  rows left OPEN         ${planned.length}`);
  const byBand = planned.reduce<Record<string, number>>((m, p) => ({ ...m, [p.band]: (m[p.band] ?? 0) + 1 }), {});
  const byPaper = planned.reduce<Record<string, number>>((m, p) => ({ ...m, [p.paper_code]: (m[p.paper_code] ?? 0) + 1 }), {});
  console.log(`  by band                ${JSON.stringify(byBand)}`);
  console.log(`  by paper               ${JSON.stringify(byPaper)}`);
  console.log(`  distinct users         ${new Set(planned.map((p) => p.user_id)).size}`);

  if (!APPLY) {
    console.log('\nDRY RUN — nothing written. Re-run with --apply.');
    return;
  }

  let written = 0;
  for (let i = 0; i < planned.length; i += 100) {
    const { data, error } = await svc.from('acca_weak_areas')
      .insert(planned.slice(i, i + 100).map((p) => ({ ...p, source: 'drill' })))
      .select('id');
    if (error) throw new Error(`insert failed: ${error.message}`);
    written += (data ?? []).length;
  }
  console.log(`\nWROTE ${written} source='drill' row(s). Revert with --revert.`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
