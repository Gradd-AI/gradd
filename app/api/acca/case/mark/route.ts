import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';
import { judgeCaseMarking, judgeTechnicalMarking, MARKING_MODEL, type TechnicalMarkingResult } from '@/lib/acca/case-marking';
import { resolvePaper } from '@/lib/acca/paper';
import { caseMarkReady } from '@/lib/acca/case-sit';

// ── APM professional-skills marking (terminal whole-case mark) ─────────────────
// Behind APM_CASES (default OFF). Flag off → 404. Runs ONE holistic marking pass
// over the student's whole answer (all requirements concatenated) once the case is
// genuinely complete (every requirement passed for this user), and awards the
// case's professional marks against the ACCA section-E descriptors.
//
// Withhold discipline: this pass NEVER loads or reads sealed content
// (model_answer / hint / full_reveal). Professional skills are marked on HOW the
// student wrote, against the descriptors — not against a model answer. It reads
// the same non-sealed scenario context the turn route builds (scenario_intro +
// exhibits) plus each requirement's final_answer (the student's own accepted work).
//
// Kept separate from the turn route so a completing turn isn't slowed, and so
// marking can be re-run without re-answering.
//
// The judging + bands→marks logic lives in lib/acca/case-marking.ts so the weekly
// calibration script exercises the exact same code path — this route owns only the
// auth, gating, whole-answer assembly and persistence around that shared core.
//
// PAPER SCOPING: `paper` (body field, resolvePaper, default 'APM') is checked when
// the case is fetched, consistent with the other case routes.
const CASES_ENABLED = process.env.APM_CASES === '1';

export async function POST(request: Request): Promise<Response> {
  if (!CASES_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // ── 1. Auth ──
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // ── 2. Parse body ──
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { case_id, paper: paperRaw, sitting: sittingRaw } = body as { case_id?: unknown; paper?: unknown; sitting?: unknown };
  const caseId = typeof case_id === 'string' && case_id ? case_id : null;
  const paper = resolvePaper(paperRaw);
  const sitting = sittingRaw === true;
  if (!caseId) {
    return NextResponse.json({ error: 'case_id required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── 2b. Subscription gate (hard) ──
  // Exam cases require an active APM subscription / unexpired pass. 402 → the
  // client shows the upsell inline (edge: lapse mid-session).
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  if (!hasActiveAPMAccess(profile ?? {})) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 402 });
  }

  // ── 3. Gate the case (same serving gate as drills/turns) ──
  const { data: caseRow, error: caseErr } = await supabase
    .from('acca_cases')
    .select('id, scenario_intro, professional_skills_marks, status, published')
    .eq('id', caseId)
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (caseErr || !caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  const professionalSkillsMarks =
    typeof caseRow.professional_skills_marks === 'number' ? caseRow.professional_skills_marks : 0;

  // ── 4. Load requirements (ordered) ──
  // question / model_answer / marks_guide are fetched for the SIT-mode TECHNICAL pass
  // (which judges each answer against its own code-correct model_answer). They are
  // consumed ONLY server-side by judgeTechnicalMarking and NEVER returned to the
  // client — the response carries marks/bands only, never the model_answer. The PS
  // pass still ignores them (PS is judged on the descriptors, not the answer).
  const { data: reqsRaw, error: reqErr } = await supabase
    .from('acca_case_requirements')
    .select('id, requirement_order, label, professional_skill_tags, question, model_answer, marks_guide')
    .eq('case_id', caseId)
    .order('requirement_order', { ascending: true });

  if (reqErr || !reqsRaw || reqsRaw.length === 0) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }
  const requirements = reqsRaw as Array<{
    id: string;
    requirement_order: number;
    label: string | null;
    professional_skill_tags: string | null;
    question: string | null;
    model_answer: string | null;
    marks_guide: number | null;
  }>;

  // ── 5. Load this user's progress for the case; require EVERY requirement passed ──
  const { data: progressRaw } = await supabase
    .from('acca_case_progress')
    .select('requirement_id, passed, final_answer')
    .eq('user_id', user.id)
    .eq('case_id', caseId);

  const progressByReq = new Map<string, { passed: boolean; final_answer: string | null }>();
  for (const p of (progressRaw ?? []) as Array<{
    requirement_id: string;
    passed: boolean | null;
    final_answer: string | null;
  }>) {
    progressByReq.set(p.requirement_id, {
      passed: p.passed === true,
      final_answer: p.final_answer ?? null,
    });
  }

  // ── 5b. Completion gate — mode-aware (lib/acca/case-sit.ts) ──
  // PRACTICE: every requirement judged correct (passed===true) — unchanged.
  // SIT: every requirement has a RECORDED final_answer (blank '' counts) — a timed
  // paper is marked as it stands, wrong/blank requirements included.
  const gate = caseMarkReady(
    sitting,
    requirements.map((r) => {
      const p = progressByReq.get(r.id);
      return { final_answer: p?.final_answer ?? null, passed: p?.passed ?? false };
    }),
  );
  if (!gate.ready) {
    return NextResponse.json({ error: gate.reason ?? 'case not complete' }, { status: 409 });
  }

  // ── 6. Build the whole-answer input (final_answer per requirement, in order) ──
  const wholeAnswer = requirements
    .map((r) => {
      const label = (r.label ?? '').trim() || `Requirement ${r.requirement_order}`;
      const answer = (progressByReq.get(r.id)?.final_answer ?? '').trim();
      return `${label}\n${answer}`;
    })
    .join('\n\n');

  // ── 7. Build the case context (scenario_intro + exhibits) — same shape as case/turn ──
  const { data: exhibits } = await supabase
    .from('acca_case_exhibits')
    .select('exhibit_order, title, body')
    .eq('case_id', caseId)
    .order('exhibit_order', { ascending: true });

  const scenarioIntro = (caseRow.scenario_intro as string | null) ?? '';
  const exhibitText = (exhibits ?? [])
    .map((ex) => {
      const title = (ex.title as string | null) ?? '';
      const bodyText = (ex.body as string | null) ?? '';
      return [title, bodyText].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
  const context = [scenarioIntro, exhibitText].filter(Boolean).join('\n\n');

  // ── 8. Examined skills = union of professional_skill_tags across requirements ──
  const examinedSkills: string[] = [];
  const seen = new Set<string>();
  for (const r of requirements) {
    for (const raw of (r.professional_skill_tags ?? '').split(',')) {
      const tag = raw.trim();
      if (tag && !seen.has(tag)) {
        seen.add(tag);
        examinedSkills.push(tag);
      }
    }
  }
  if (examinedSkills.length === 0) {
    return NextResponse.json({ error: 'case examines no professional skills' }, { status: 409 });
  }

  // ── 9. Marking pass — shared pure core (same model, same prompt, bands→marks) ──
  // The core throws Error('call') on API/extract failure and Error('parse') on
  // parse/shape failure; preserve the distinct 502 messages the client expects.
  let result;
  try {
    result = await judgeCaseMarking({
      paper,
      context,
      wholeAnswer,
      examinedSkills,
      professionalSkillsMarks,
    });
  } catch (e) {
    const msg = (e as Error)?.message === 'parse' ? 'marking parse failed' : 'marking call failed';
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // ── 9b. Technical marking pass — SIT MODE ONLY ──
  // Judges each requirement's final_answer against its OWN code-correct model_answer,
  // band→apportion to that requirement's marks_guide ceiling (blank → 'nothing' with
  // no model call). Practice mode is UNCHANGED — it never computes technical marks
  // (its per-requirement pass/fail already came from the teach loop).
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
      const msg = (e as Error)?.message === 'parse' ? 'technical marking parse failed' : 'technical marking call failed';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  // ── 10. Persist (best-effort upsert — never 500 on the write) ──
  try {
    await supabase
      .from('acca_case_marking')
      .upsert(
        {
          user_id: user.id,
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
    // Per-requirement technical band + marks land on the existing per-requirement
    // progress row (sit mode only). Never touches `passed` (a sit leaves it unset).
    if (technical) {
      for (const pr of technical.per_requirement) {
        await supabase
          .from('acca_case_progress')
          .update({
            band: pr.band,
            technical_marks_awarded: pr.mark_awarded,
            technical_marks_available: pr.marks_available,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', user.id)
          .eq('case_id', caseId)
          .eq('requirement_id', pr.requirement_id);
      }
    }
  } catch {
    // non-fatal: persistence is best-effort, never blocks the response
  }

  // ── 11. Return ──
  return NextResponse.json({
    professional_marks_awarded: result.professional_marks_awarded,
    professional_marks_available: result.professional_marks_available,
    per_skill: result.per_skill,
    ...(technical
      ? {
          technical_marks_awarded: technical.technical_marks_awarded,
          technical_marks_available: technical.technical_marks_available,
          per_requirement: technical.per_requirement,
        }
      : {}),
  });
}
