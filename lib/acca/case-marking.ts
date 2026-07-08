// lib/acca/case-marking.ts
// Pure marking core for APM professional-skills marking, extracted verbatim from
// app/api/acca/case/mark/route.ts so the route and the weekly calibration script
// (scripts/calibrate-marking.ts) share ONE implementation — the calibration can
// never drift from what production actually runs.
//
// This module is deliberately free of auth, HTTP, Supabase and persistence: it
// takes the already-assembled inputs (case context, the student's whole answer,
// the examined skills, the professional-skills pool) and returns the awarded
// marks + per-skill bands. All DB/auth/gating/persistence stays in the route.
//
// Structural marking: the MODEL assigns a quality band per skill; the CODE
// converts bands → marks deterministically. Instructing the model to "mark to
// absolute quality" lost to its priors twice (weak answers scored 10/10 then 9/10
// with feedback naming material weaknesses), so the mark decision is removed from
// the model entirely — same lesson as the withhold engine.

import Anthropic from '@anthropic-ai/sdk';

export const MARKING_MODEL = 'claude-sonnet-4-6';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── ACCA section-E professional-skills descriptors (S26–J27 syllabus §E) ──────
// Verbatim authored standards. Each examined skill is marked against its descriptor.
export const SKILL_DESCRIPTORS: Record<string, string> = {
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

const BANDS = ['exemplary', 'strong', 'competent', 'weak'] as const;
export type SkillBand = (typeof BANDS)[number];
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

export interface PerSkillMark {
  skill: string;
  mark_awarded: number;
  feedback: string;
  band: SkillBand;
}

export interface CaseMarkingResult {
  professional_marks_awarded: number;
  professional_marks_available: number;
  per_skill: PerSkillMark[];
}

export interface JudgeCaseMarkingInput {
  context: string;                 // scenario_intro + exhibits (NOT sealed) — same shape as case/turn
  wholeAnswer: string;             // final_answer per requirement, labelled, joined in order
  examinedSkills: string[];        // union of professional_skill_tags across requirements
  professionalSkillsMarks: number; // the case pool (5 for Section B, 10 for Section A)
}

interface TextBlock { type: 'text'; text: string }
interface AnthropicMessage { content: Array<{ type: string } | TextBlock> }

function extractText(res: unknown): string {
  const msg = res as AnthropicMessage;
  const block = msg.content.find((b): b is TextBlock => b.type === 'text');
  if (!block) throw new Error('No text block in Anthropic response');
  return block.text;
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

// Run ONE holistic professional-skills marking pass. The model judges a BAND per
// examined skill against the section-E descriptor; code converts bands → marks.
// Throws Error('call') on API/extract failure and Error('parse') on parse/shape
// failure so the caller can preserve the distinct 502 messages.
export async function judgeCaseMarking(input: JudgeCaseMarkingInput): Promise<CaseMarkingResult> {
  const { context, wholeAnswer, examinedSkills, professionalSkillsMarks } = input;

  // ── Marking call (Sonnet) — the model judges a BAND per skill, no marks ──
  // The prompt asks ONLY for a quality band per examined skill against the section-E
  // descriptor; it never mentions marks, the pool size, or allocation. Bands are
  // converted to marks deterministically in code below, so the model never decides a
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
  // Error('call') on API/extract failure and Error('parse') on parse/shape failure.
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

  const judgements = await judgeOnce();

  // ── Bands → marks (deterministic; the code owns every number) ──
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
  // transparency; marks_available is the single case-level pool (top-level).
  const perSkill: PerSkillMark[] = judgements.map((j, i) => ({
    skill: j.skill,
    mark_awarded: perSkillMarks[i],
    feedback: j.feedback,
    band: j.band,
  }));

  return {
    professional_marks_awarded: overall,
    professional_marks_available: professionalSkillsMarks,
    per_skill: perSkill,
  };
}
