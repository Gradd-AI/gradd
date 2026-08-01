import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { resolvePaper, type AccaPaper } from '@/lib/acca/paper';
import { pickEntryDrill } from '@/lib/acca/area-entry';
import {
  selectionBoost,
  pickWeighted,
  isWeakSkillBand,
  NO_SIGNALS,
  type SelectionSignals,
  type WeakAreaRow,
} from '@/lib/acca/weak-areas';

// ── WEAKNESS STEERING IS LIVE (2026-07-31) ────────────────────────────────────
// `W_WEAK = 0` with `weaknessWeight = () => 0` was the item-5 seam: the term was present in
// the interleave scorer from v1 and weighted zero because no per-(user, LO) ledger existed.
// `acca_weak_areas` is that ledger, and a marked sit now writes it, so the term is on.
//
// TWO THINGS ABOUT WHERE IT IS APPLIED, and the second is the one that matters:
//
//   1. The scorer's weakness term is now real, via lib/acca/weak-areas.ts.
//   2. IT IS APPLIED ON THE LIVE `area=` AND `lo=` PATHS TOO, not only in the scorer. The
//      scorer runs behind `APM_INTERLEAVE`, which is NOT set in production — steering only
//      there would have shipped a ledger that no student's serve ever reads. The live paths
//      are where "try another" actually resolves today, so that is where the steering has
//      to be for any of this to reach a student.
//
// PROFESSIONAL-SKILL STEERING ships with it, on the same three paths. `acca_drills` has
// carried `professional_skill_tag` since the generator wrote it and NOTHING read it at
// serve time; the sit's PS pass is the first thing that produces a judgement about those
// skills, so the loop closes here — a student marked weak on scepticism meets drills that
// demand scepticism. That signal is read from `acca_case_marking.per_skill`, not from
// `acca_weak_areas`: that table is keyed by lo_code and a professional skill is not an LO.
//
// ROLLBACK PROPERTY, deliberate and fixtured: with no ledger rows and no PS marking every
// candidate scores 0, so `pickWeighted` degrades to the uniform random choice these paths
// made before — a student who has never sat a mock sees exactly the previous behaviour.

/** The serve payload. Built explicitly on EVERY path so a column added to the SELECT for
 *  scoring — `professional_skill_tag` is one, `model_answer` was already another — can never
 *  ride along into the response. */
const serveDrill = (d: {
  id: string; lo_code: string; topic: string; question: string; context_text: string | null;
}) => ({
  id: d.id, lo_code: d.lo_code, topic: d.topic, question: d.question, context_text: d.context_text,
});

/**
 * Read this user's weakness signals for ONE paper.
 *
 * PAPER-SCOPED ON BOTH HALVES. AFM and APM LO codes collide exactly, so an unscoped ledger
 * read would steer an APM student using an AFM sit's findings — the same failure the drill
 * fetch has always guarded against with `paper_code`. The PS half is scoped by resolving the
 * marking rows' cases and keeping only this paper's.
 *
 * Degrades to NO_SIGNALS on any read failure. Selection must never 500 because a steering
 * lookup failed; the honest fallback is the unsteered pick.
 */
async function loadSelectionSignals(
  supabase: ReturnType<typeof createServiceClient>,
  userId: string,
  paper: AccaPaper,
): Promise<SelectionSignals> {
  try {
    const { data: weak } = await supabase
      .from('acca_weak_areas')
      .select('lo_code, band, occurrence_count, source')
      .eq('user_id', userId)
      .eq('paper_code', paper)
      .is('resolved_at', null)
      .limit(100);

    // PS bands live in acca_case_marking.per_skill (jsonb). Two small queries rather than a
    // join: fetch this user's marking rows, then keep only the ones whose case belongs to
    // this paper.
    const { data: marking } = await supabase
      .from('acca_case_marking')
      .select('case_id, per_skill')
      .eq('user_id', userId)
      .limit(50);

    const weakSkills = new Set<string>();
    const rows = (marking ?? []) as Array<{ case_id: string; per_skill: unknown }>;
    if (rows.length > 0) {
      const { data: paperCases } = await supabase
        .from('acca_cases')
        .select('id')
        .in('id', rows.map((r) => r.case_id))
        .eq('paper_code', paper);
      const inPaper = new Set((paperCases ?? []).map((c: { id: string }) => c.id));
      for (const r of rows) {
        if (!inPaper.has(r.case_id) || !Array.isArray(r.per_skill)) continue;
        for (const s of r.per_skill as Array<{ skill?: unknown; band?: unknown }>) {
          if (typeof s?.skill === 'string' && isWeakSkillBand(s?.band as string)) {
            weakSkills.add(s.skill);
          }
        }
      }
    }

    return { openWeaknesses: (weak ?? []) as WeakAreaRow[], weakSkills };
  } catch {
    return NO_SIGNALS;
  }
}

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
  const signals = await loadSelectionSignals(supabase, user.id, paper);

  // area= mode: pick a drill from a sub-area (e.g. ?area=B1 → lo_code LIKE 'B1%'). A zero-attempt
  // FIRST serve in the area gets the deterministic ENTRY drill (foundational kind); any prior attempt
  // in the area → weakness-steered pick ("try another"). Entry keyed on the stable model_answer
  // heading (regen-safe).
  if (area && !lo) {
    const { data: areaData } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text, model_answer, professional_skill_tag')
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
      // THE ENTRY DRILL STILL WINS OUTRIGHT on a zero-attempt area, and steering does not get a
      // vote there. A first serve in an area must be the foundational kind whatever a mock said
      // about the student — arriving in a new area on the hardest drill because a sit went badly
      // is the opposite of what the ledger is for.
      const entry = (count ?? 0) === 0 ? pickEntryDrill(areaData) : null;
      const chosen = entry ?? pickWeighted(areaData, (d) => selectionBoost(d, signals))!;
      // model_answer and professional_skill_tag were fetched ONLY for ranking — serveDrill returns
      // the serve fields explicitly so neither reaches the client.
      return NextResponse.json(serveDrill(chosen));
    }
    return NextResponse.json({ error: 'No drills found for this area' }, { status: 404 });
  }

  // ── Interleave mode (P3 / item 4) — section-anchored mixed pick. Gated; needs drill_id.
  // Flag off OR no drill_id → falls through to the legacy same-sub-area path below (exact rollback).
  if (INTERLEAVE_ENABLED && lo && drillId) {
    const picked = await pickInterleaved(supabase, { lo, drillId, userId: user.id, paper, signals });
    if (picked) return NextResponse.json(picked);
    // null → nothing to serve at all; fall through to the legacy/terminal handling (404 contract)
  }

  // lo= mode: prefer same sub-area, exclude current drill. Each tier now picks by
  // `selectionBoost` instead of `Math.random()` over the tier — and with no signal the two
  // are the same thing, because every candidate scores 0 and the tiebreak is random.
  const subArea = lo!.slice(0, 2);
  const SERVE_SEL = 'id, lo_code, topic, question, context_text, professional_skill_tag';
  const steer = (d: { lo_code: string; professional_skill_tag?: string | null }) =>
    selectionBoost(d, signals);

  // Prefer same sub-area (same syllabus section), exclude current drill
  const { data: sameArea } = await supabase
    .from('acca_drills')
    .select(SERVE_SEL)
    .eq('exam_board', 'ACCA')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .neq('lo_code', lo)
    .like('lo_code', `${subArea}%`)
    .limit(10);

  if (sameArea && sameArea.length > 0) {
    return NextResponse.json(serveDrill(pickWeighted(sameArea, steer)!));
  }

  // Fall back to any other approved drill
  const { data: anyDrill } = await supabase
    .from('acca_drills')
    .select(SERVE_SEL)
    .eq('exam_board', 'ACCA')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .neq('lo_code', lo)
    .limit(20);

  if (anyDrill && anyDrill.length > 0) {
    return NextResponse.json(serveDrill(pickWeighted(anyDrill, steer)!));
  }

  // No other drills available — re-serve a drill from the current LO. MUST return a full
  // row (with id): an id-less object blanks currentDrill on the client and makes the next
  // tutor POST send drill_id:null, silently killing §5b/§10 persistence + the earn gate.
  const { data: sameLo } = await supabase
    .from('acca_drills')
    .select(SERVE_SEL)
    .eq('exam_board', 'ACCA')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .eq('lo_code', lo)
    .limit(20);

  if (sameLo && sameLo.length > 0) {
    return NextResponse.json(serveDrill(pickWeighted(sameLo, steer)!));
  }

  // Truly nothing to serve — 404 so the client keeps the current drill (never blanks it).
  return NextResponse.json({ error: 'No drills available' }, { status: 404 });
}

// ── Item 4: interleaved selection (behind APM_INTERLEAVE) ──────────────────────
// Scorer weights — tunable. W_WEAK and W_PS are no longer local constants: they live in
// lib/acca/weak-areas.ts with the scoring functions they weight, so the live area=/lo=
// paths and this scorer cannot end up steering by different amounts. The item-5 seam is
// CLOSED — the term reads a real ledger.
const W_DEMAND = 2, W_FRESH = 1, W_RESOLVED = 3;

interface Cand {
  id: string; lo_code: string; topic: string; question: string;
  context_text: string | null; intellectual_level: number | null; command_verb: string | null;
  professional_skill_tag: string | null;
}

async function pickInterleaved(
  supabase: ReturnType<typeof createServiceClient>,
  { lo, drillId, userId, paper, signals }: {
    lo: string; drillId: string; userId: string; paper: AccaPaper; signals: SelectionSignals;
  },
): Promise<(Omit<Cand, 'professional_skill_tag'> & { section_changed?: boolean }) | null> {
  const section = lo[0];
  const subArea = lo.slice(0, 2);
  const SEL = 'id, lo_code, topic, question, context_text, intellectual_level, command_verb, professional_skill_tag';

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

  // `selectionBoost` carries BOTH steering terms (W_WEAK × weakness, W_PS × PS match) with
  // the same weights the live paths use — one definition, two call sites.
  const score = (c: Cand) =>
      W_DEMAND   * (curLevel != null && (c.intellectual_level !== curLevel || c.command_verb !== curVerb) ? 1 : 0)
    + W_FRESH    * (c.lo_code !== lo ? 1 : 0)
    - W_RESOLVED * (resolved.has(c.id) ? 1 : 0)
    + selectionBoost(c, signals);

  const pick = pickWeighted(tier, score)!;            // max score, random tiebreak within it
  // professional_skill_tag was fetched for scoring only — the serve payload is built
  // explicitly so it does not ride along to the client.
  const serve = {
    id: pick.id, lo_code: pick.lo_code, topic: pick.topic, question: pick.question,
    context_text: pick.context_text,
    intellectual_level: pick.intellectual_level, command_verb: pick.command_verb,
  };
  return sectionChanged ? { ...serve, section_changed: true } : serve;
}
