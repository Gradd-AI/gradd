// scripts/probe-steering.ts   —   npm run probe:steering
//
// WHAT DOES next-drill ACTUALLY SERVE, given the ledger as it stands right now?
//
// Replicates app/api/acca/next-drill/route.ts's LIVE `lo=` path — the same pool query, the
// same `selectionBoost`, the same PS lookup out of acca_case_marking.per_skill — over the
// REAL published drills and the REAL ledger, for every user carrying an open row. It scores
// and ranks but never serves and never writes.
//
// ── WHY IT EXISTS: W_WEAK AND MAX_WEAKNESS_SCORE WERE TUNED AGAINST AN EMPTY TABLE ──
// Both constants were chosen while acca_weak_areas had held zero rows for its whole life, so
// they were guesses. This is the instrument that turns them into measurements, and its FIRST
// run (2026-08-12) found something no unit fixture could have: within a pool the route has
// already scoped to ONE sub-area, the weakness term is frequently the SAME for every
// candidate — a constant offset, which changes nothing about who wins. `pickWeighted` then
// degrades to the uniform random pick it makes with no ledger at all.
//
// Report `distinct scores in pool`. 1/N means the term did not discriminate on that serve,
// whatever its magnitude. That is the number to watch when tuning, not the score itself.
//
// NOT IN THE CONTRACT GATE — it needs a database. The `probe-` prefix keeps it clear of
// run-contracts.ts's `test-*.ts` discovery by construction.
import { createClient } from '@supabase/supabase-js';
import { selectionBoost, isWeakSkillBand, currentDrillExclusion, type WeakAreaRow } from '../lib/acca/weak-areas';

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

async function main() {
  const { data: rows } = await svc.from('acca_weak_areas')
    .select('user_id, paper_code, lo_code, band, occurrence_count, source').is('resolved_at', null);
  const { data: users } = await svc.auth.admin.listUsers({ perPage: 1000 });
  const email = new Map((users?.users ?? []).map((u) => [u.id, u.email ?? u.id]));

  const byUser = new Map<string, { paper: string; rows: WeakAreaRow[] }>();
  for (const r of (rows ?? []) as any[]) {
    const k = `${r.user_id}::${r.paper_code}`;
    if (!byUser.has(k)) byUser.set(k, { paper: r.paper_code, rows: [] });
    byUser.get(k)!.rows.push(r);
  }

  for (const [key, { paper, rows: open }] of byUser) {
    const uid = key.split('::')[0];
    // PS half, exactly as loadSelectionSignals builds it.
    const { data: marking } = await svc.from('acca_case_marking').select('case_id, per_skill').eq('user_id', uid);
    const weakSkills = new Set<string>();
    if ((marking ?? []).length) {
      const { data: pc } = await svc.from('acca_cases').select('id')
        .in('id', (marking ?? []).map((m: any) => m.case_id)).eq('paper_code', paper);
      const inPaper = new Set((pc ?? []).map((c: any) => c.id));
      for (const m of (marking ?? []) as any[]) {
        if (!inPaper.has(m.case_id) || !Array.isArray(m.per_skill)) continue;
        for (const s of m.per_skill) if (typeof s?.skill === 'string' && isWeakSkillBand(s?.band)) weakSkills.add(s.skill);
      }
    }
    const signals = { openWeaknesses: open, weakSkills };

    console.log(`\n${'='.repeat(78)}\n${email.get(uid)}  —  ${paper}`);
    console.log(`  open ledger: ${open.map((r) => `${r.lo_code}:${r.band}×${r.occurrence_count}`).join('  ')}`);
    console.log(`  weak skills: ${[...weakSkills].join(', ') || '(none)'}`);

    // The `lo=` path: same sub-area as the drill just done, excluding THE CURRENT DRILL —
    // `currentDrillExclusion`, the same rule the route builds its filter from (changed
    // 2026-08-12). It used to exclude the whole LO, which removed the drills the ledger was
    // pointing at and left a pool of pure siblings scoring identically.
    const anchor = open[0].lo_code;
    const sub = anchor.slice(0, 2);
    // Stand in for "the drill the student is on": one on the anchor LO.
    const { data: cur } = await svc.from('acca_drills').select('id')
      .eq('exam_board', 'ACCA').eq('paper_code', paper).eq('status', 'approved').eq('published', true)
      .eq('lo_code', anchor).limit(1).maybeSingle();
    const exclude = currentDrillExclusion(anchor, (cur as any)?.id ?? null);
    const { data: pool } = await svc.from('acca_drills')
      .select('id, lo_code, topic, professional_skill_tag')
      .eq('exam_board', 'ACCA').eq('paper_code', paper).eq('status', 'approved').eq('published', true)
      .neq(exclude.column, exclude.value).like('lo_code', `${sub}%`).limit(50);

    const scored = (pool ?? []).map((d: any) => ({ ...d, score: selectionBoost(d, signals) }))
      .sort((a, b) => b.score - a.score);
    console.log(`  "try another" from ${anchor} → pool of ${scored.length} in ${sub}:`);
    for (const d of scored.slice(0, 6)) {
      const tie = scored.filter((x) => x.score === scored[0].score).length;
      console.log(`     ${d.score.toFixed(2)}  ${d.lo_code.padEnd(5)} ${String(d.topic).slice(0, 52)}`
        + (d.score === scored[0].score ? `   ← WINNER (tied ${tie})` : ''));
    }
    const distinct = new Set(scored.map((d) => d.score)).size;
    console.log(`  distinct scores in pool: ${distinct}/${scored.length}`
      + (distinct === 1 ? '  ⚠️ NO DISCRIMINATION — uniform random' : ''));
  }
}
main().catch((e) => { console.error(e); process.exitCode = 1; });
