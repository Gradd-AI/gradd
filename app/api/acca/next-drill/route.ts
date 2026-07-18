import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { resolvePaper, type AccaPaper } from '@/lib/acca/paper';
import { pickEntryDrill } from '@/lib/acca/area-entry';

export async function GET(request: Request): Promise<Response> {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lo      = searchParams.get('lo');
  const area    = searchParams.get('area');
  const drillId = searchParams.get('drill_id');   // item 4: exclude current DRILL, not LO
  const INTERLEAVE_ENABLED = process.env.APM_INTERLEAVE === '1';
  // Paper to stay within on "try another" — AFM/APM LO codes collide, so every tier must
  // scope by paper. Default APM (client threads ?paper= from G2 onward).
  const paper = resolvePaper(searchParams.get('paper'));

  if (!lo && !area) {
    return NextResponse.json({ error: 'lo or area required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // area= mode: pick a drill from a sub-area (e.g. ?area=B1 → lo_code LIKE 'B1%'). A zero-attempt
  // FIRST serve in the area gets the deterministic ENTRY drill (foundational kind); any prior attempt
  // in the area → random ("try another"). Entry keyed on the stable model_answer heading (regen-safe).
  if (area && !lo) {
    const { data: areaData } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text, model_answer')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', paper)
      .eq('status', 'approved')
      .eq('published', true)
      .like('lo_code', `${area}%`)
      .limit(20);

    if (areaData && areaData.length > 0) {
      const { count } = await supabase
        .from('acca_drill_attempts')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .like('lo_code', `${area}%`);
      const entry = (count ?? 0) === 0 ? pickEntryDrill(areaData) : null;
      const chosen = entry ?? areaData[Math.floor(Math.random() * areaData.length)];
      // model_answer was fetched ONLY for entry ranking — return the serve fields explicitly so it
      // never reaches the client (the serve payload is question/context only).
      return NextResponse.json({ id: chosen.id, lo_code: chosen.lo_code, topic: chosen.topic, question: chosen.question, context_text: chosen.context_text });
    }
    return NextResponse.json({ error: 'No drills found for this area' }, { status: 404 });
  }

  // ── Interleave mode (P3 / item 4) — section-anchored mixed pick. Gated; needs drill_id.
  // Flag off OR no drill_id → falls through to the legacy same-sub-area path below (exact rollback).
  if (INTERLEAVE_ENABLED && lo && drillId) {
    const picked = await pickInterleaved(supabase, { lo, drillId, userId: user.id, paper });
    if (picked) return NextResponse.json(picked);
    // null → nothing to serve at all; fall through to the legacy/terminal handling (404 contract)
  }

  // lo= mode: prefer same sub-area, exclude current drill
  const subArea = lo!.slice(0, 2);

  // Prefer same sub-area (same syllabus section), exclude current drill
  const { data: sameArea } = await supabase
    .from('acca_drills')
    .select('id, lo_code, topic, question, context_text')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .neq('lo_code', lo)
    .like('lo_code', `${subArea}%`)
    .limit(10);

  if (sameArea && sameArea.length > 0) {
    const pick = sameArea[Math.floor(Math.random() * sameArea.length)];
    return NextResponse.json(pick);
  }

  // Fall back to any other approved drill
  const { data: anyDrill } = await supabase
    .from('acca_drills')
    .select('id, lo_code, topic, question, context_text')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .neq('lo_code', lo)
    .limit(20);

  if (anyDrill && anyDrill.length > 0) {
    const pick = anyDrill[Math.floor(Math.random() * anyDrill.length)];
    return NextResponse.json(pick);
  }

  // No other drills available — re-serve a drill from the current LO. MUST return a full
  // row (with id): an id-less object blanks currentDrill on the client and makes the next
  // tutor POST send drill_id:null, silently killing §5b/§10 persistence + the earn gate.
  const { data: sameLo } = await supabase
    .from('acca_drills')
    .select('id, lo_code, topic, question, context_text')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .eq('lo_code', lo)
    .limit(20);

  if (sameLo && sameLo.length > 0) {
    return NextResponse.json(sameLo[Math.floor(Math.random() * sameLo.length)]);
  }

  // Truly nothing to serve — 404 so the client keeps the current drill (never blanks it).
  return NextResponse.json({ error: 'No drills available' }, { status: 404 });
}

// ── Item 4: interleaved selection (behind APM_INTERLEAVE) ──────────────────────
// Scorer weights — tunable. W_WEAK is the item-5 seam: term present, 0 until the
// per-(user, LO) weakness ledger ships; item 5 supplies weaknessWeight + flips W_WEAK on.
const W_DEMAND = 2, W_FRESH = 1, W_RESOLVED = 3, W_WEAK = 0;
const weaknessWeight = (_lo: string): number => 0; // item-5 hook

interface Cand {
  id: string; lo_code: string; topic: string; question: string;
  context_text: string | null; intellectual_level: number | null; command_verb: string | null;
}

async function pickInterleaved(
  supabase: ReturnType<typeof createServiceClient>,
  { lo, drillId, userId, paper }: { lo: string; drillId: string; userId: string; paper: AccaPaper },
): Promise<(Cand & { section_changed?: boolean }) | null> {
  const section = lo[0];
  const subArea = lo.slice(0, 2);
  const SEL = 'id, lo_code, topic, question, context_text, intellectual_level, command_verb';

  // One in-section fetch: current row gives demand context, the rest are candidates.
  const { data: sect } = await supabase.from('acca_drills').select(SEL)
    .eq('exam_board', 'ACCA').eq('paper_code', paper)
    .eq('status', 'approved').eq('published', true)
    .like('lo_code', `${section}%`).limit(200);
  const pool = (sect ?? []) as Cand[];

  const current  = pool.find(d => d.id === drillId);
  const curLevel = current?.intellectual_level ?? null;
  const curVerb  = current?.command_verb ?? null;

  // resolved set for this user (item-3 hook, v1 ON) — deprioritise mastered drills
  const { data: prog } = await supabase.from('acca_tutor_progress')
    .select('drill_id, resolved').eq('user_id', userId);
  const resolved = new Set((prog ?? []).filter(p => p.resolved).map(p => p.drill_id as string));

  const notCurrent = pool.filter(d => d.id !== drillId);
  // degradation ladder — first non-empty tier wins
  let tier = notCurrent.filter(d => d.lo_code.slice(0, 2) !== subArea); // 1: different sub-area (ideal)
  if (!tier.length) tier = notCurrent;                                  // 2: any other in-section
  if (!tier.length) tier = notCurrent.filter(d => d.lo_code === lo);    // 3: same-LO depth (A3 only)

  let sectionChanged = false;
  if (!tier.length) {
    // 4: cross-section — last resort, SIGNAL it so the student is never silently teleported
    const { data: any } = await supabase.from('acca_drills').select(SEL)
      .eq('exam_board', 'ACCA').eq('paper_code', paper)
      .eq('status', 'approved').eq('published', true).limit(400);
    tier = ((any ?? []) as Cand[]).filter(d => d.id !== drillId);
    sectionChanged = true;
    if (!tier.length) return null;
  }

  const score = (c: Cand) =>
      W_DEMAND   * (curLevel != null && (c.intellectual_level !== curLevel || c.command_verb !== curVerb) ? 1 : 0)
    + W_FRESH    * (c.lo_code !== lo ? 1 : 0)
    - W_RESOLVED * (resolved.has(c.id) ? 1 : 0)
    + W_WEAK     * weaknessWeight(c.lo_code);

  const max = Math.max(...tier.map(score));
  const top = tier.filter(c => score(c) === max);     // random tiebreak within the top band
  const pick = top[Math.floor(Math.random() * top.length)];
  return sectionChanged ? { ...pick, section_changed: true } : pick;
}
