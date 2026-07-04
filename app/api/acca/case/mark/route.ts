import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';

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
const CASES_ENABLED = process.env.APM_CASES === '1';

const MARKING_MODEL = 'claude-sonnet-4-6';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── ACCA section-E professional-skills descriptors (S26–J27 syllabus §E) ──────
// Verbatim authored standards. Each examined skill is marked against its descriptor.
const SKILL_DESCRIPTORS: Record<string, string> = {
  communication:
    'inform concisely, objectively and unambiguously in a suitable style and format; ' +
    'advise using compelling, logical, counter-arguable arguments; clarify and simplify ' +
    'complex issues in a tone easily understood by the intended audience.',
  analysis_and_evaluation:
    'investigate relevant information using appropriate analytical technique to establish ' +
    'reasons and causes; reflect on evidence and its implications; apply judgement to plans, ' +
    'initiatives and issues; appraise information objectively, balancing costs, risks, ' +
    'benefits and opportunities before advising.',
  scepticism:
    'explore the underlying reasons for plans, issues and decisions with an enquiring mind ' +
    'beyond what is immediately apparent; question opinions, assertions and assumptions and ' +
    'seek justification or evidence; challenge and critically assess information or decisions ' +
    'where justified.',
  commercial_acumen:
    'demonstrate awareness of organisational and external factors affecting the measurement ' +
    'and management of objectives; use judgement to recognise key issues and propose ' +
    'commercially viable solutions; show insight into behavioural, process and system-related ' +
    'issues.',
};

interface TextBlock { type: 'text'; text: string }
interface AnthropicMessage { content: Array<{ type: string } | TextBlock> }

function extractText(res: unknown): string {
  const msg = res as AnthropicMessage;
  const block = msg.content.find((b): b is TextBlock => b.type === 'text');
  if (!block) throw new Error('No text block in Anthropic response');
  return block.text;
}

interface SkillMark {
  skill: string;
  mark_awarded: number;
  feedback: string;
}

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

  // ── 9. Marking call (Sonnet) — mark whole answer against the descriptors ──
  // The professional marks are a SINGLE pool for the whole case (5 Section B /
  // 10 Section A), allocated ACROSS the examined skills — NOT an independent
  // score per skill. The prompt states the pool cap explicitly; §10b enforces it.
  const rubric = examinedSkills
    .map((s) => {
      const descriptor = SKILL_DESCRIPTORS[s] ?? '(no authored descriptor on file for this skill)';
      return `- ${s}: ${descriptor}`;
    })
    .join('\n');

  const contextLine = context ? `Case scenario and exhibits:\n${context}\n\n` : '';

  const systemPrompt =
    'You are an experienced ACCA APM marker awarding the professional-skills marks for a ' +
    'whole exam question. You mark HOW the candidate wrote — their reasoning, judgement and ' +
    'communication across the whole answer — against the official ACCA section-E descriptor ' +
    'for each examined skill. Each descriptor IS the standard; mark against it, not against a ' +
    'model answer. ' +
    `This case carries ${professionalSkillsMarks} professional marks IN TOTAL, allocated across ` +
    'the examined skills. The sum of mark_awarded across all skills MUST NOT exceed ' +
    `${professionalSkillsMarks}. Allocate marks where the answer best demonstrates each skill; ` +
    'an even split is not required. ' +
    'The total awarded should reflect the ABSOLUTE quality of the answer against the descriptors — ' +
    `do NOT award the full ${professionalSkillsMarks} marks by default. Full marks are reserved for ` +
    'answers a professional marker would consider exemplary on every examined skill. Deficiencies you ' +
    'identify in feedback MUST be reflected in marks withheld: if your feedback names a material ' +
    'weakness in a skill, that skill cannot receive its ceiling. ' +
    'As a guide: exemplary across all skills = full pool; competent with material presentational or ' +
    'depth weaknesses = roughly half to two-thirds of the pool; technically complete but ' +
    'professionally poor = below half. ' +
    'DISCIPLINE: for every skill you must cite specific evidence from the candidate\'s answer ' +
    'that earned or lost the mark — quote or name the exact passage. No mark without a named ' +
    'reason. Award integer marks only. ' +
    'Before returning, check each skill: does the mark match the feedback? Feedback that criticises ' +
    'while the mark is at ceiling is a marking error — lower the mark or moderate the feedback to ' +
    'whichever is true. ' +
    'Return ONLY a JSON array, no prose, no code fences, in exactly this shape: ' +
    '[{ "skill": "...", "mark_awarded": N, "feedback": "..." }] — one object per examined skill.';

  const baseUserContent =
    contextLine +
    `Examined professional skills and their ACCA section-E descriptors (the standard):\n${rubric}\n\n` +
    `Candidate's whole answer (all requirements, in order):\n${wholeAnswer}\n\n` +
    'Mark the whole answer against each examined skill\'s descriptor. Return ONLY the JSON array.';

  // One marking round-trip: call + defensive parse (strip code fences). Throws
  // Error('call') on API/extract failure and Error('parse') on parse/shape failure
  // so the caller can preserve the distinct 502 messages.
  async function markOnce(correctionNote: string): Promise<SkillMark[]> {
    let rawMarking: string;
    try {
      const res = await anthropic.messages.create({
        model: MARKING_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: baseUserContent + correctionNote }],
      });
      rawMarking = extractText(res);
    } catch {
      throw new Error('call');
    }
    try {
      let cleaned = rawMarking.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
      }
      const arr = JSON.parse(cleaned);
      if (!Array.isArray(arr)) throw new Error('not an array');
      const out: SkillMark[] = arr.map((o) => {
        const skill = typeof o?.skill === 'string' ? o.skill : '';
        const mark = Number(o?.mark_awarded);
        const feedback = typeof o?.feedback === 'string' ? o.feedback : '';
        if (!skill || !Number.isFinite(mark)) throw new Error('malformed entry');
        return { skill, mark_awarded: Math.round(mark), feedback };
      });
      if (out.length === 0) throw new Error('empty');
      return out;
    } catch {
      throw new Error('parse');
    }
  }

  const errFor = (e: unknown) =>
    (e as Error)?.message === 'parse' ? 'marking parse failed' : 'marking call failed';
  const sumMarks = (ms: SkillMark[]) => ms.reduce((acc, m) => acc + m.mark_awarded, 0);

  // ── 10. First marking pass ──
  let parsed: SkillMark[];
  try {
    parsed = await markOnce('');
  } catch (e) {
    return NextResponse.json({ error: errFor(e) }, { status: 502 });
  }

  // ── 10b. Pool validation — the allocation must not exceed the case total ──
  // If it does, retry ONCE with a correction note. If it STILL exceeds, silently
  // scaling/capping would misreport the model's allocation → hard fail 502.
  if (sumMarks(parsed) > professionalSkillsMarks) {
    const correction =
      `\n\nCORRECTION: your previous allocation summed to more than ${professionalSkillsMarks} ` +
      `marks. The ${professionalSkillsMarks} professional marks are a SINGLE pool for the whole ` +
      'case; the sum of mark_awarded across ALL skills must not exceed it. Re-allocate within the ' +
      'pool and return ONLY the JSON array.';
    try {
      parsed = await markOnce(correction);
    } catch (e) {
      return NextResponse.json({ error: errFor(e) }, { status: 502 });
    }
    if (sumMarks(parsed) > professionalSkillsMarks) {
      return NextResponse.json({ error: 'marking allocation invalid' }, { status: 502 });
    }
  }

  // ── 11. Build per-skill output {skill, mark_awarded, feedback} + overall ──
  // marks_available is a single case-level pool (top-level below), NOT per skill.
  const perSkill = parsed.map((m) => ({
    skill: m.skill,
    mark_awarded: m.mark_awarded,
    feedback: m.feedback,
  }));

  // Allocation is already validated ≤ pool; min() is a belt-and-braces floor only.
  const overall = Math.min(sumMarks(parsed), professionalSkillsMarks);

  // ── 12. Persist (best-effort upsert — never 500 on the write) ──
  try {
    await supabase
      .from('acca_case_marking')
      .upsert(
        {
          user_id: user.id,
          case_id: caseId,
          professional_marks_awarded: overall,
          professional_marks_available: professionalSkillsMarks,
          per_skill: perSkill,
          model: MARKING_MODEL,
          marked_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,case_id' },
      );
  } catch {
    // non-fatal: persistence is best-effort, never blocks the response
  }

  // ── 13. Return ──
  return NextResponse.json({
    professional_marks_awarded: overall,
    professional_marks_available: professionalSkillsMarks,
    per_skill: perSkill,
  });
}
