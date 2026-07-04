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

// ── Structural marking: the MODEL assigns a quality band per skill; the CODE
// converts bands → marks deterministically. Instructing the model to "mark to
// absolute quality" lost to its priors twice (weak answers scored 10/10 then 9/10
// with feedback naming material weaknesses), so the mark decision is removed from
// the model entirely — same lesson as the withhold engine. ──
const BANDS = ['exemplary', 'strong', 'competent', 'weak'] as const;
type SkillBand = (typeof BANDS)[number];
const BAND_MULTIPLIER: Record<SkillBand, number> = {
  exemplary: 1, strong: 0.75, competent: 0.5, weak: 0.25,
};
function isBand(v: string): v is SkillBand {
  return (BANDS as readonly string[]).includes(v);
}

interface SkillJudgement {
  skill: string;
  band: SkillBand;
  feedback: string;
}

// Largest-remainder (Hamilton) apportionment: turn fractional per-skill marks into
// integers that sum EXACTLY to `target`. Floor each, hand the rounding surplus to
// the largest fractional parts; under the pool cap (rare) trim the smallest.
function apportion(raw: number[], target: number): number[] {
  const out = raw.map((r) => Math.floor(r));
  const byFracDesc = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac);
  let used = out.reduce((a, b) => a + b, 0);
  for (const { i } of byFracDesc) {
    if (used >= target) break;
    out[i] += 1; used += 1;
  }
  while (used > target) {
    let trimmed = false;
    for (let k = byFracDesc.length - 1; k >= 0 && used > target; k--) {
      const i = byFracDesc[k].i;
      if (out[i] > 0) { out[i] -= 1; used -= 1; trimmed = true; }
    }
    if (!trimmed) break;
  }
  return out;
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

  // ── 9. Marking call (Sonnet) — the model judges a BAND per skill, no marks ──
  // The prompt asks ONLY for a quality band per examined skill against the section-E
  // descriptor; it never mentions marks, the pool size, or allocation. Bands are
  // converted to marks deterministically in code (§11), so the model never decides a
  // number and cannot default the whole pool onto a weak answer.
  const rubric = examinedSkills
    .map((s) => {
      const descriptor = SKILL_DESCRIPTORS[s] ?? '(no authored descriptor on file for this skill)';
      return `- ${s}: ${descriptor}`;
    })
    .join('\n');

  const contextLine = context ? `Case scenario and exhibits:\n${context}\n\n` : '';

  const systemPrompt =
    'You are an experienced ACCA APM marker judging the professional skills demonstrated in a ' +
    'whole exam question. You judge HOW the candidate wrote — their reasoning, judgement and ' +
    'communication across the whole answer — against the official ACCA section-E descriptor for ' +
    'each examined skill. Each descriptor IS the standard; judge against it, not against a model ' +
    'answer. ' +
    'For each examined skill, assign exactly one band describing how well the whole answer meets ' +
    'that skill\'s descriptor:\n' +
    '- "exemplary": meets the descriptor in full; a professional marker would find nothing ' +
    'material to fault.\n' +
    '- "strong": meets the descriptor well, with only minor and immaterial gaps.\n' +
    '- "competent": broadly meets the descriptor but with a material weakness in depth, register ' +
    'or format.\n' +
    '- "weak": falls short of the descriptor — superficial, poorly communicated, or missing the ' +
    'professional standard.\n' +
    'Judge each skill on its ABSOLUTE quality against the descriptor. Do not grade on a curve, and ' +
    'do not assume the answer is good. ' +
    'DISCIPLINE: for every skill you must cite specific evidence from the candidate\'s answer that ' +
    'justifies the band — quote or name the exact passage. No band without a named reason. ' +
    'Return ONLY a JSON array, no prose, no code fences, in exactly this shape: ' +
    '[{ "skill": "...", "band": "exemplary|strong|competent|weak", "feedback": "..." }] — one ' +
    'object per examined skill.';

  const baseUserContent =
    contextLine +
    `Examined professional skills and their ACCA section-E descriptors (the standard):\n${rubric}\n\n` +
    `Candidate's whole answer (all requirements, in order):\n${wholeAnswer}\n\n` +
    'Judge the whole answer against each examined skill\'s descriptor and assign its band. ' +
    'Return ONLY the JSON array.';

  // One judging round-trip: call + defensive parse (strip code fences). Throws
  // Error('call') on API/extract failure and Error('parse') on parse/shape failure
  // so the caller can preserve the distinct 502 messages. There is no
  // allocation-overflow retry any more — the model returns bands, not marks, so
  // there is nothing to overflow.
  async function judgeOnce(): Promise<SkillJudgement[]> {
    let rawJudging: string;
    try {
      const res = await anthropic.messages.create({
        model: MARKING_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: baseUserContent }],
      });
      rawJudging = extractText(res);
    } catch {
      throw new Error('call');
    }
    try {
      let cleaned = rawJudging.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
      }
      const arr = JSON.parse(cleaned);
      if (!Array.isArray(arr)) throw new Error('not an array');
      const out: SkillJudgement[] = arr.map((o) => {
        const skill = typeof o?.skill === 'string' ? o.skill : '';
        const band = typeof o?.band === 'string' ? o.band.trim().toLowerCase() : '';
        const feedback = typeof o?.feedback === 'string' ? o.feedback : '';
        if (!skill || !isBand(band)) throw new Error('malformed entry');
        return { skill, band, feedback };
      });
      if (out.length === 0) throw new Error('empty');
      return out;
    } catch {
      throw new Error('parse');
    }
  }

  const errFor = (e: unknown) =>
    (e as Error)?.message === 'parse' ? 'marking parse failed' : 'marking call failed';

  // ── 10. Judging pass — model returns one quality band per examined skill ──
  let judgements: SkillJudgement[];
  try {
    judgements = await judgeOnce();
  } catch (e) {
    return NextResponse.json({ error: errFor(e) }, { status: 502 });
  }

  // ── 11. Bands → marks (deterministic; the code owns every number) ──
  // Per-skill ceiling is an equal share of the case pool; each skill earns a
  // fraction of its ceiling by band (exemplary 1.0 / strong 0.75 / competent 0.5 /
  // weak 0.25). The total is rounded half-up, then integer per-skill marks are
  // apportioned by largest remainder so they sum EXACTLY to it. The pool cap is
  // belt-and-braces (only bites if the model returns more skills than examined).
  const ceiling = professionalSkillsMarks / examinedSkills.length;
  const rawMarks = judgements.map((j) => ceiling * BAND_MULTIPLIER[j.band]);
  const rawTotal = rawMarks.reduce((acc, m) => acc + m, 0);
  const overall = Math.min(Math.round(rawTotal), professionalSkillsMarks);
  const perSkillMarks = apportion(rawMarks, overall);

  // Per-skill output {skill, mark_awarded, feedback, band}. The band is included for
  // transparency; marks_available is the single case-level pool (top-level below).
  const perSkill = judgements.map((j, i) => ({
    skill: j.skill,
    mark_awarded: perSkillMarks[i],
    feedback: j.feedback,
    band: j.band,
  }));

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
