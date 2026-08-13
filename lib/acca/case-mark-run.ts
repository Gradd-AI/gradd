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
import { markerLabel } from '@/lib/acca/requirement-label';
import { ledgerActionsFor } from '@/lib/acca/weak-areas';
// The open/close implementation MOVED to lib/acca/weak-area-store.ts (2026-08-12) when the
// drill path became a second writer. It used to live here privately with `source: 'sit'`
// written in as a literal on both the insert AND the close filter — which would have left a
// drill row unopenable with its own source and, once opened, permanently unclosable.
import { openWeakness, closeWeakness } from '@/lib/acca/weak-area-store';

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
  /** WHICH SITTING is being marked. Required in sit mode: progress rows are scoped to it, so
   *  practice work on the same case is invisible to marking and cannot be marked as a sit.
   *  Ignored in practice mode, which has no attempt. */
  attemptId?: string | null;
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
  const { supabase, userId, caseId, paper, sitting, attemptClosed = false, attemptId = null } = input;

  // A sit MUST name its sitting. Without it, progress rows cannot be scoped and marking would
  // fall back to reading whatever rows exist for the case — which is exactly the defect this
  // change closes: practice work marked as a sat paper.
  if (sitting && !attemptId) {
    return { ok: false, status: 409, error: 'sit marking requires an attempt_id' };
  }

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

  // ── This user's progress, SCOPED TO THE SITTING ──
  // In sit mode only the rows written during THIS attempt are visible. Practice work on the
  // same case has attempt_id NULL and is invisible here, which is the whole point: it is real
  // work but it is not this paper. In practice mode the scope is the practice rows (attempt_id
  // IS NULL), so a sit's rows never leak into a practice completion check either.
  let progressQuery = supabase
    .from('acca_case_progress')
    .select('requirement_id, passed, final_answer, submitted_at')
    .eq('user_id', userId)
    .eq('case_id', caseId);
  progressQuery = sitting ? progressQuery.eq('attempt_id', attemptId) : progressQuery.is('attempt_id', null);
  const { data: progressRaw } = await progressQuery;

  const progressByReq = new Map<string, { passed: boolean; final_answer: string | null; submitted_at: string | null }>();
  for (const p of (progressRaw ?? []) as Array<{
    requirement_id: string; passed: boolean | null; final_answer: string | null; submitted_at: string | null;
  }>) {
    progressByReq.set(p.requirement_id, {
      passed: p.passed === true,
      final_answer: p.final_answer ?? null,
      submitted_at: p.submitted_at ?? null,
    });
  }

  // ── Completion gate — mode-aware (lib/acca/case-sit.ts) ──
  const gate = caseMarkReady(
    sitting,
    requirements.map((r) => {
      const p = progressByReq.get(r.id);
      return {
        final_answer: p?.final_answer ?? null,
        passed: p?.passed ?? false,
        submitted_at: p?.submitted_at ?? null,
      };
    }),
    attemptClosed,
  );
  if (!gate.ready) return { ok: false, status: 409, error: gate.reason ?? 'case not complete' };

  // ── Whole-answer input (final_answer per requirement, in order) ──
  // TWO strings out of ONE pass over the same trimmed answers:
  //   wholeAnswer — labelled, what the MODEL sees.
  //   answersOnly — the candidate's text alone, used ONLY for the blank check.
  // They are separate because the blank check used to read the labelled join, and the labels
  // alone cleared isBlankAnswer's threshold, so a fully blank paper was never detected as
  // blank. See JudgeCaseMarkingInput.answersOnly in lib/acca/case-marking.ts.
  //
  // ── THE LABEL IS STRIPPED BEFORE THE PS MARKER READS IT (2026-08-13) ────────
  // It used to be the RAW stored label, and on AFM that is "(i) B3e — 10 marks": an
  // internal syllabus code plus the TECHNICAL mark allocation, interleaved with the
  // candidate's text inside a block captioned "Candidate's whole answer", for a pass
  // scoring a SEPARATE 5- or 10-mark professional-skills pool. The student never wrote it
  // and never saw it — the sit route strips the code at the serve boundary.
  //
  // This REVERSES a documented decision (APM_BUILD_CONTRACT.md 2026-07-29, "using the
  // STORED label (LO code and all — sitDisplayLabel is a serve-side strip the marking path
  // deliberately does not apply)"), so it is a reversal on the record, not a drift.
  //
  // `markerLabel`, not `sitDisplayLabel`: same module, same rule, `sweepCodeShape:false`.
  // The generic code-SHAPE backstop would silently delete an APM label's "B2" division
  // from what the marker reads. Reasoning and the live measurement that licensed dropping
  // it are at lib/acca/requirement-label.ts.
  //
  // The `Requirement N` fallback is UNCHANGED and is now REACHABLE: a label that was only
  // a code strips to null, where before it was merely never empty. Pinned in
  // scripts/test-case-marking-technical.ts.
  const trimmedAnswers = requirements.map((r) => (progressByReq.get(r.id)?.final_answer ?? '').trim());
  const wholeAnswer = requirements
    .map((r, i) => {
      const label = (markerLabel(r.label, r.lo_code) ?? '').trim() || `Requirement ${r.requirement_order}`;
      return `${label}\n${trimmedAnswers[i]}`;
    })
    .join('\n\n');
  const answersOnly = trimmedAnswers.join('\n\n');

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
      paper, context, wholeAnswer, answersOnly, examinedSkills, professionalSkillsMarks,
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
      // ⚠️ KNOWN SECOND OCCURRENCE — THE TECHNICAL PASS STILL READS THE RAW LABEL.
      // Grant-ruled 2026-08-13: the strip is PS-ONLY, and this site is logged rather than
      // changed. The two are genuinely different exposures. Here the label is a HEADING
      // ("Requirement N — <label>", case-marking.ts:595) over a block that also carries the
      // question, the model answer and the candidate's answer; the PS defect was that the
      // label sat INSIDE a block captioned "Candidate's whole answer". And an AFM label's
      // mark count at least AGREES with the ceiling this pass marks to, which it did not in
      // the PS pass.
      //
      // What is still true here, and is why this is logged and not closed: `feedback` on
      // this pass is student-facing under the same "never point at anything they cannot
      // see" ban, and "B3e" is exactly such a thing.
      //
      // Changing it would also have doubled the calibration surface — with the technical
      // bytes unchanged, B2(i) competent/6 stays a CONTROL for the PS recalibration rather
      // than becoming a second live bar. Whoever closes this needs its own 10-run round.
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
    // source:'sit' on BOTH halves, and that is what keeps the two writers apart: a drill
    // success can never close one of these rows, and this close can never touch a drill row.
    for (const w of actions.opens) {
      const wrote = await openWeakness(supabase, {
        userId, paper, loCode: w.lo_code, band: w.band, source: 'sit',
        caseId, requirementId: w.requirement_id,
      });
      if (wrote) weaknessRows++;
    }
    for (const c of actions.closes) {
      resolvedRows += await closeWeakness(supabase, {
        userId, paper, loCode: c.lo_code, source: 'sit',
      });
    }
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
