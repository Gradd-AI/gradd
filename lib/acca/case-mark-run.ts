// lib/acca/case-mark-run.ts
// ONE implementation of "mark this case for this user and persist the result".
//
// WHY IT EXISTS (2026-07-31). app/api/acca/case/mark owned the whole sequence inline —
// gate the case, load requirements and progress, check the completion gate, build the
// context, run the PS pass, run the technical pass, persist. The sit RESULTS endpoint has
// to do exactly that for three cases in a row. Copying it would have given us two marking
// implementations that could drift, which is the same reasoning that put the judging cores
// in lib/acca/case-marking.ts so the calibration script cannot drift from production.
//
// The route keeps what is genuinely route-shaped: the flag, auth, the entitlement gate, the
// HTTP status mapping. Everything from "fetch the case" to "write the rows" is here.
//
// ── WHAT THIS CHANGE ADDS BEYOND THE MOVE ────────────────────────────────────
//  1. `technical_feedback` IS PERSISTED. The technical marker's per-requirement reasoning
//     used to be returned to the caller and then dropped, which meant the debrief's central
//     field — a VERBATIM `why` — had nothing to read on any request that did not itself do
//     the marking. Refreshing a results screen would have re-marked (a paid model call, and
//     marks that measurably move run to run) or shown every `why` as null.
//  2. THE WEAKNESS LEDGER IS WRITTEN, sit only. Per requirement, on a weak or competent
//     band. See lib/acca/weak-areas.ts for why 'nothing' deliberately writes no row.
//
// Both are best-effort, like the persistence that was already here: a failed write must
// never turn a successfully-marked paper into an error response.

import type { AccaPaper } from '@/lib/acca/paper';
import {
  judgeCaseMarking,
  judgeTechnicalMarking,
  MARKING_MODEL,
  type PerSkillMark,
  type TechnicalMarkingResult,
} from '@/lib/acca/case-marking';
import { caseMarkReady } from '@/lib/acca/case-sit';
import { ledgerActionsFor, type WeaknessWrite, type WeaknessClose } from '@/lib/acca/weak-areas';

// Structural typing so this module never imports a server-only Supabase factory; the
// caller passes its own service client.
type Queryable = { from: (table: string) => any };   // eslint-disable-line @typescript-eslint/no-explicit-any

export interface CaseMarkRunInput {
  supabase: Queryable;
  userId: string;
  caseId: string;
  paper: AccaPaper;
  sitting: boolean;
  /** The attempt has expired or been finished, so every requirement is final whether it was
   *  reached or not. Only the sit results endpoint passes this; see lib/acca/case-sit.ts for
   *  why an unreached requirement must stay unreached rather than being back-filled blank. */
  attemptClosed?: boolean;
}

export interface CaseMarkRunOk {
  ok: true;
  professional_marks_awarded: number;
  professional_marks_available: number;
  per_skill: PerSkillMark[];
  technical: TechnicalMarkingResult | null;
  /** How many acca_weak_areas rows this run opened or incremented. Sit only; 0 otherwise. */
  weakness_rows: number;
  /** How many previously-open rows this run RESOLVED. Sit only; 0 otherwise. */
  resolved_rows: number;
}

export interface CaseMarkRunErr {
  ok: false;
  status: number;
  error: string;
}

export type CaseMarkRunResult = CaseMarkRunOk | CaseMarkRunErr;

interface RequirementRow {
  id: string;
  requirement_order: number;
  label: string | null;
  lo_code: string | null;
  professional_skill_tags: string | null;
  question: string | null;
  model_answer: string | null;
  marks_guide: number | null;
}

/**
 * Mark one case end to end and persist everything it produced.
 *
 * Returns a discriminated result rather than throwing, so the callers map it to their own
 * status codes. The two model passes' `Error('call')` / `Error('parse')` distinction is
 * preserved in the `error` string exactly as the route used to emit it.
 */
export async function runCaseMarking(input: CaseMarkRunInput): Promise<CaseMarkRunResult> {
  const { supabase, userId, caseId, paper, sitting, attemptClosed = false } = input;

  // ── Gate the case (same serving gate as drills/turns) ──
  const { data: caseRow, error: caseErr } = await supabase
    .from('acca_cases')
    .select('id, scenario_intro, professional_skills_marks, status, published')
    .eq('id', caseId)
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (caseErr || !caseRow) return { ok: false, status: 404, error: 'Case not found' };

  const professionalSkillsMarks =
    typeof caseRow.professional_skills_marks === 'number' ? caseRow.professional_skills_marks : 0;

  // ── Requirements (ordered) ──
  // question / model_answer / marks_guide feed the SIT-mode TECHNICAL pass. They are
  // consumed server-side only and never returned by either caller. `lo_code` is read for
  // the weakness ledger, which is keyed by it — and, like the sit route's label strip, it
  // is READ, never served.
  const { data: reqsRaw, error: reqErr } = await supabase
    .from('acca_case_requirements')
    .select('id, requirement_order, label, lo_code, professional_skill_tags, question, model_answer, marks_guide')
    .eq('case_id', caseId)
    .order('requirement_order', { ascending: true });

  if (reqErr || !reqsRaw || reqsRaw.length === 0) {
    return { ok: false, status: 404, error: 'Case not found' };
  }
  const requirements = reqsRaw as RequirementRow[];

  // ── This user's progress ──
  const { data: progressRaw } = await supabase
    .from('acca_case_progress')
    .select('requirement_id, passed, final_answer')
    .eq('user_id', userId)
    .eq('case_id', caseId);

  const progressByReq = new Map<string, { passed: boolean; final_answer: string | null }>();
  for (const p of (progressRaw ?? []) as Array<{
    requirement_id: string; passed: boolean | null; final_answer: string | null;
  }>) {
    progressByReq.set(p.requirement_id, {
      passed: p.passed === true,
      final_answer: p.final_answer ?? null,
    });
  }

  // ── Completion gate — mode-aware (lib/acca/case-sit.ts) ──
  const gate = caseMarkReady(
    sitting,
    requirements.map((r) => {
      const p = progressByReq.get(r.id);
      return { final_answer: p?.final_answer ?? null, passed: p?.passed ?? false };
    }),
    attemptClosed,
  );
  if (!gate.ready) return { ok: false, status: 409, error: gate.reason ?? 'case not complete' };

  // ── Whole-answer input (final_answer per requirement, in order) ──
  const wholeAnswer = requirements
    .map((r) => {
      const label = (r.label ?? '').trim() || `Requirement ${r.requirement_order}`;
      const answer = (progressByReq.get(r.id)?.final_answer ?? '').trim();
      return `${label}\n${answer}`;
    })
    .join('\n\n');

  // ── Case context (scenario_intro + exhibits) — same shape as case/turn ──
  const { data: exhibits } = await supabase
    .from('acca_case_exhibits')
    .select('exhibit_order, title, body')
    .eq('case_id', caseId)
    .order('exhibit_order', { ascending: true });

  const scenarioIntro = (caseRow.scenario_intro as string | null) ?? '';
  const exhibitText = (exhibits ?? [])
    .map((ex: { title: string | null; body: string | null }) =>
      [(ex.title ?? ''), (ex.body ?? '')].filter(Boolean).join('\n'))
    .filter(Boolean)
    .join('\n\n');
  const context = [scenarioIntro, exhibitText].filter(Boolean).join('\n\n');

  // ── Examined skills = union of professional_skill_tags across requirements ──
  const examinedSkills: string[] = [];
  const seen = new Set<string>();
  for (const r of requirements) {
    for (const raw of (r.professional_skill_tags ?? '').split(',')) {
      const tag = raw.trim();
      if (tag && !seen.has(tag)) { seen.add(tag); examinedSkills.push(tag); }
    }
  }
  if (examinedSkills.length === 0) {
    return { ok: false, status: 409, error: 'case examines no professional skills' };
  }

  // ── PS pass ──
  let result;
  try {
    result = await judgeCaseMarking({
      paper, context, wholeAnswer, examinedSkills, professionalSkillsMarks,
    });
  } catch (e) {
    return {
      ok: false, status: 502,
      error: (e as Error)?.message === 'parse' ? 'marking parse failed' : 'marking call failed',
    };
  }

  // ── Technical pass — SIT MODE ONLY ──
  let technical: TechnicalMarkingResult | null = null;
  if (sitting) {
    try {
      technical = await judgeTechnicalMarking({
        paper,
        context,
        requirements: requirements.map((r) => ({
          requirement_id: r.id,
          label: (r.label ?? '').trim() || `Requirement ${r.requirement_order}`,
          question: r.question ?? '',
          model_answer: r.model_answer ?? '',
          marks_guide: typeof r.marks_guide === 'number' ? r.marks_guide : 0,
          final_answer: progressByReq.get(r.id)?.final_answer ?? '',
        })),
      });
    } catch (e) {
      return {
        ok: false, status: 502,
        error: (e as Error)?.message === 'parse'
          ? 'technical marking parse failed'
          : 'technical marking call failed',
      };
    }
  }

  // ── Persist (best-effort — never fail a marked paper on a write) ──
  try {
    await supabase.from('acca_case_marking').upsert(
      {
        user_id: userId,
        case_id: caseId,
        professional_marks_awarded: result.professional_marks_awarded,
        professional_marks_available: result.professional_marks_available,
        per_skill: result.per_skill,
        model: MARKING_MODEL,
        marked_at: new Date().toISOString(),
        ...(technical
          ? {
              technical_marks_awarded: technical.technical_marks_awarded,
              technical_marks_available: technical.technical_marks_available,
            }
          : {}),
      },
      { onConflict: 'user_id,case_id' },
    );

    // Per-requirement band + marks + REASONING land on the progress row (sit mode only).
    // Never writes `passed` — the column keeps its NOT NULL DEFAULT FALSE and reads back
    // `false`, not null.
    if (technical) {
      for (const pr of technical.per_requirement) {
        await supabase
          .from('acca_case_progress')
          .update({
            band: pr.band,
            technical_marks_awarded: pr.mark_awarded,
            technical_marks_available: pr.marks_available,
            // The debrief's `why`. Stored VERBATIM, exactly as the marker wrote it —
            // debrief.ts is built around never paraphrasing this string, and a paraphrase
            // introduced at the write would defeat that guarantee before it is ever read.
            technical_feedback: pr.feedback ?? null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', userId)
          .eq('case_id', caseId)
          .eq('requirement_id', pr.requirement_id);
      }
    }
  } catch {
    // non-fatal
  }

  // ── The weakness ledger — sit only. Opens AND closes. ──
  let weaknessRows = 0;
  let resolvedRows = 0;
  if (technical) {
    const loById = new Map(requirements.map((r) => [r.id, r.lo_code]));
    const actions = ledgerActionsFor(
      technical.per_requirement.map((pr) => ({
        requirement_id: pr.requirement_id,
        lo_code: loById.get(pr.requirement_id) ?? null,
        band: pr.band,
      })),
    );
    weaknessRows = await recordWeaknesses(
      supabase, userId, paper, actions.opens.map((w) => ({ ...w, case_id: caseId })),
    );
    resolvedRows = await resolveWeaknesses(supabase, userId, paper, actions.closes);
  }

  return {
    ok: true,
    professional_marks_awarded: result.professional_marks_awarded,
    professional_marks_available: result.professional_marks_available,
    per_skill: result.per_skill,
    technical,
    weakness_rows: weaknessRows,
    resolved_rows: resolvedRows,
  };
}

/**
 * Upsert on the OPEN-ROW key — (user_id, paper_code, lo_code, source) WHERE resolved_at IS
 * NULL.
 *
 * READ-THEN-WRITE, NOT `.upsert()`, and that is forced by the schema rather than chosen:
 * the unique index is PARTIAL, and Postgres only infers a partial index as an ON CONFLICT
 * arbiter when the inference clause repeats its WHERE — which PostgREST's `on_conflict=`
 * has no way to express. A plain `.upsert({ onConflict: 'user_id,paper_code,lo_code,source' })`
 * does not silently degrade; it errors with "no unique or exclusion constraint matching the
 * ON CONFLICT specification". So the read-then-write is the correct shape here, and the
 * unique index remains the thing that actually enforces one open row per area.
 *
 * A concurrent writer losing the race hits that index and is caught: the 23505 path
 * re-reads and increments, so two simultaneous marks converge on one row rather than one
 * of them vanishing. Every write is best-effort — a ledger failure must never fail a mark.
 */
async function recordWeaknesses(
  supabase: Queryable,
  userId: string,
  paper: AccaPaper,
  writes: readonly (WeaknessWrite & { case_id: string })[],
): Promise<number> {
  let written = 0;
  for (const w of writes) {
    try {
      if (await writeOne(supabase, userId, paper, w)) written++;
    } catch {
      // one bad row must not stop the rest
    }
  }
  return written;
}

/**
 * Close the open row for each resolved area — the `resolved_at` writer.
 *
 * A single scoped UPDATE, and no read first: `resolved_at IS NULL` in the WHERE means the
 * statement is a no-op when there is nothing open, which is the common case (most strong
 * bands were never weak). Nothing is deleted — the closed row stays as history, and the
 * partial unique index is what then lets a later weak finding open a FRESH row for the same
 * area rather than incrementing a resolved one.
 *
 * `case_id`/`requirement_id` are deliberately NOT rewritten here: they are the provenance of
 * the finding that OPENED the row, and overwriting them with the requirement that closed it
 * would lose where the weakness came from.
 */
async function resolveWeaknesses(
  supabase: Queryable,
  userId: string,
  paper: AccaPaper,
  closes: readonly WeaknessClose[],
): Promise<number> {
  let resolved = 0;
  for (const c of closes) {
    try {
      const { data } = await supabase
        .from('acca_weak_areas')
        .update({ resolved_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('paper_code', paper)
        .eq('lo_code', c.lo_code)
        .eq('source', 'sit')
        .is('resolved_at', null)
        .select('id');
      resolved += (data as unknown[] | null)?.length ?? 0;
    } catch {
      // one bad close must not stop the rest, and must never fail a marked paper
    }
  }
  return resolved;
}

async function writeOne(
  supabase: Queryable,
  userId: string,
  paper: AccaPaper,
  w: WeaknessWrite & { case_id: string },
): Promise<boolean> {
  const findOpen = async () => {
    const { data } = await supabase
      .from('acca_weak_areas')
      .select('id, occurrence_count')
      .eq('user_id', userId)
      .eq('paper_code', paper)
      .eq('lo_code', w.lo_code)
      .eq('source', 'sit')
      .is('resolved_at', null)
      .maybeSingle();
    return (data as { id: string; occurrence_count: number } | null) ?? null;
  };

  const bump = async (row: { id: string; occurrence_count: number }) => {
    // The band is OVERWRITTEN with the latest finding, not kept at its worst-ever value: the
    // ledger describes where the student is NOW. A student who was weak and is now merely
    // competent should be steered less hard, not held at their worst sitting forever.
    await supabase
      .from('acca_weak_areas')
      .update({
        band: w.band,
        occurrence_count: (row.occurrence_count ?? 1) + 1,
        case_id: w.case_id,
        requirement_id: w.requirement_id,
      })
      .eq('id', row.id);
  };

  const existing = await findOpen();
  if (existing) { await bump(existing); return true; }

  const { error } = await supabase.from('acca_weak_areas').insert({
    user_id: userId,
    paper_code: paper,
    lo_code: w.lo_code,
    band: w.band,
    source: 'sit',
    case_id: w.case_id,
    requirement_id: w.requirement_id,
  });
  if (!error) return true;

  // Lost the race — the unique index did its job. Re-read and increment instead.
  if ((error as { code?: string }).code === '23505') {
    const raced = await findOpen();
    if (raced) { await bump(raced); return true; }
  }
  return false;
}
