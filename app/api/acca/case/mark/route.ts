import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';
import { judgeCaseMarking, MARKING_MODEL } from '@/lib/acca/case-marking';

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
  const { case_id } = body as { case_id?: unknown };
  const caseId = typeof case_id === 'string' && case_id ? case_id : null;
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
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (caseErr || !caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  const professionalSkillsMarks =
    typeof caseRow.professional_skills_marks === 'number' ? caseRow.professional_skills_marks : 0;

  // ── 4. Load requirements (ordered) — NO sealed fields (no model_answer/hint/full_reveal) ──
  const { data: reqsRaw, error: reqErr } = await supabase
    .from('acca_case_requirements')
    .select('id, requirement_order, label, professional_skill_tags')
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

  const allPassed = requirements.every((r) => progressByReq.get(r.id)?.passed === true);
  if (!allPassed) {
    return NextResponse.json({ error: 'case not complete' }, { status: 409 });
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
      context,
      wholeAnswer,
      examinedSkills,
      professionalSkillsMarks,
    });
  } catch (e) {
    const msg = (e as Error)?.message === 'parse' ? 'marking parse failed' : 'marking call failed';
    return NextResponse.json({ error: msg }, { status: 502 });
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
        },
        { onConflict: 'user_id,case_id' },
      );
  } catch {
    // non-fatal: persistence is best-effort, never blocks the response
  }

  // ── 11. Return ──
  return NextResponse.json({
    professional_marks_awarded: result.professional_marks_awarded,
    professional_marks_available: result.professional_marks_available,
    per_skill: result.per_skill,
  });
}
