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
import type { AccaPaper } from './paper';

export const MARKING_MODEL = 'claude-sonnet-4-6';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Professional-skills descriptors, PAPER-KEYED ──────────────────────────────
// Each examined skill is marked against its paper's OWN syllabus descriptor. The
// two papers' descriptors are MATERIALLY different, not paraphrase drift: APM's
// commercial-acumen names "measurement and management of objectives" and
// "behavioural, process and system-related issues" (APM subject matter, absent
// from AFM's syllabus), and AFM's analysis-and-evaluation carries a 4th sub-point
// (d) with no APM analogue. So the descriptor set is selected by paper, never
// shared. Select via getSkillDescriptors(paper); the DB professional_skill_tags
// keys (communication / analysis_and_evaluation / scepticism / commercial_acumen)
// are common to both.

// APM — UNTOUCHED. Sourced APM S26–J27 syllabus §E (the original authored set).
const APM_SKILL_DESCRIPTORS: Record<string, string> = {
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

// AFM — VERBATIM from the AFM S26–J27 Syllabus & Study Guide, §F "Professional
// skills" (p.13), page-verified 2026-07-25 (docs/evidence/sources.json E6, two
// independent pdftotext passes to defeat the two-column layout). Each descriptor
// concatenates that skill's own sub-points in order (Communication a/b/c;
// Analysis and evaluation a/b/c/d — all four; Scepticism a/b/c; Commercial acumen
// lead-in + a/b). The bracketed intellectual-level markers ([3]) are omitted as
// PDF metadata, not descriptor prose; every sentence otherwise is verbatim.
const AFM_SKILL_DESCRIPTORS: Record<string, string> = {
  communication:
    'Inform concisely, objectively and unambiguously, adopting a suitable style and format, ' +
    'using appropriate technology. Persuade using compelling and logical arguments, ' +
    'demonstrating the ability to counter argue where appropriate. Clarify and simplify ' +
    'complex issues to convey relevant information in a way that adopts an appropriate tone ' +
    'and is easily understood by and reflects the requirements of the intended audience.',
  analysis_and_evaluation:
    'Investigate relevant information from a range of sources, using appropriate analytical ' +
    'techniques to estimate outcomes, assist in decision-making and to identify opportunities ' +
    'or solutions. Consider information, evidence and findings carefully, reflecting on their ' +
    'implications and how they can be used in the interests of the wider organisational goals. ' +
    'Assess and apply appropriate judgement when considering organisational issues, problems ' +
    'or when making financial management decisions; taking into account the implications of ' +
    'such decisions on the organisation and those affected. Appraise information objectively ' +
    'with a view to balancing the costs, risks, benefits and opportunities, before ' +
    'recommending appropriate solutions or decisions.',
  scepticism:
    'Explore the underlying reasons for a given situation, applying the attitude of an ' +
    'enquiring mind, beyond what is immediately apparent. Question opinions, assertions and ' +
    'assumptions, by seeking justifications and obtaining sufficient evidence for either their ' +
    'support and acceptance or rejection. Challenge and critically assess the information ' +
    'presented or decisions made, where this is clearly justified, in the wider professional, ' +
    'ethical, organisational, or public interest.',
  commercial_acumen:
    'Demonstrate awareness of organisational and external factors, which will affect the ' +
    'financial management decisions of an organisation. Recognise key issues in a given ' +
    'scenario and use judgement in proposing and recommending commercially viable solutions. ' +
    'Show insight and perception in understanding financial issues and wider organisational ' +
    'matters, demonstrating acumen in arriving at appropriate recommendations.',
};

// Paper → descriptor set. Selected per marking pass; never merged.
export const SKILL_DESCRIPTORS_BY_PAPER: Record<AccaPaper, Record<string, string>> = {
  APM: APM_SKILL_DESCRIPTORS,
  AFM: AFM_SKILL_DESCRIPTORS,
};

export function getSkillDescriptors(paper: AccaPaper): Record<string, string> {
  return SKILL_DESCRIPTORS_BY_PAPER[paper];
}

// Professional-skills bands — the 4-value quality lexicon the PS prompt offers.
const BANDS = ['exemplary', 'strong', 'competent', 'weak'] as const;
export type SkillBand = (typeof BANDS)[number];
function isBand(v: string): v is SkillBand {
  return (BANDS as readonly string[]).includes(v);
}

// Technical bands = the 4 PS bands PLUS 'nothing' — the zero-credit floor a timed
// SIT needs (a blank or entirely-wrong requirement). 'weak' is NOT that floor; it
// still credits a recognisable attempt at 25%. PS marking never produces 'nothing'.
const TECHNICAL_BANDS = ['exemplary', 'strong', 'competent', 'weak', 'nothing'] as const;
export type TechnicalBand = (typeof TECHNICAL_BANDS)[number];
function isTechnicalBand(v: string): v is TechnicalBand {
  return (TECHNICAL_BANDS as readonly string[]).includes(v);
}

// ONE multiplier table serves both passes: SkillBand ⊂ TechnicalBand, so PS marking
// (which only ever yields the 4 quality bands) indexes it safely, and 'nothing' → 0.
const BAND_MULTIPLIER: Record<TechnicalBand, number> = {
  exemplary: 1, strong: 0.75, competent: 0.5, weak: 0.25, nothing: 0,
};

interface SkillJudgement {
  skill: string;
  band: SkillBand;
  feedback: string;
}

export interface PerSkillMark {
  skill: string;
  mark_awarded: number;
  feedback: string;
  band: TechnicalBand;   // a model-judged PS answer yields a SkillBand; a blank answer short-circuits to 'nothing'
}

// A submission earns nothing WITHOUT a model call when it is empty or trivially
// short — a blank, whitespace, or a stray character or two is not a markable
// attempt. Threshold: fewer than 3 alphanumeric characters. An on-its-face attempt
// (≥3 alphanumerics) is model-judged and MAY still be scored 'nothing' by the model
// if it earns no credit. Shared by the technical pass (per requirement) and the PS
// pass (the whole answer), so a fully-blank sit scores 0/100 with zero model spend.
export function isBlankAnswer(s: string): boolean {
  return (s ?? '').replace(/[^a-z0-9]/gi, '').length < 3;
}

export interface CaseMarkingResult {
  professional_marks_awarded: number;
  professional_marks_available: number;
  per_skill: PerSkillMark[];
}

export interface JudgeCaseMarkingInput {
  paper: AccaPaper;                // selects the paper's OWN PS descriptors — never shared across papers
  context: string;                 // scenario_intro + exhibits (NOT sealed) — same shape as case/turn
  wholeAnswer: string;             // final_answer per requirement, labelled, joined in order
  examinedSkills: string[];        // union of professional_skill_tags across requirements
  professionalSkillsMarks: number; // the case pool (5 for Section B, 10 for Section A)
}

interface TextBlock { type: 'text'; text: string }
interface AnthropicMessage { content: Array<{ type: string } | TextBlock> }

// ═══════════════════════════════════════════════════════════════════════════════════════
// PARSE-FAILURE CAPTURE + RETRY (2026-07-28)
// ═══════════════════════════════════════════════════════════════════════════════════════
// A single malformed model response used to become a hard 502 on a SUBMITTED PAPER: both
// judging cores threw Error('parse') on the first bad response with no retry, and the route
// turns that into a 502 the student cannot recover from.
//
// It is not hypothetical. The FIRST EVER production-shape invocation of judgeTechnicalMarking
// (2026-07-28, offline harness against the blind candidate script) threw 'parse' on the
// Section A case. The identical call replayed cleanly — stop_reason `end_turn`, 720 output
// tokens against a 2000 ceiling, JSON parsed with all 4 entries. So it was NOT truncation and
// NOT deterministic, and we could say nothing more than that because the failing text had
// already been discarded inside the catch.
//
// CAPTURE IS THE POINT AS MUCH AS THE RETRY. Every parse failure is recorded — raw text,
// stop_reason, token counts, ceiling — before the retry, so the next occurrence is diagnosable
// instead of merely survivable. Retrying a fault we still cannot see would just hide it better.
export interface MarkingParseFailure {
  fn: 'judgeCaseMarking' | 'judgeTechnicalOnce';
  attempt: number;             // 1-based; attempt 1 is the initial call
  stop_reason: string | null;
  input_tokens: number | null;
  output_tokens: number | null;
  max_tokens: number;
  raw: string;                 // the full response text, uncut
  reason: string;              // the parse error that rejected it
  at: string;
}

/** In-process ring of captured parse failures. Read by harnesses; never persisted, never
 *  returned to a client. Bounded so a pathological loop cannot grow it without limit. */
export const MARKING_PARSE_FAILURES: MarkingParseFailure[] = [];
const MAX_CAPTURED = 50;

function captureParseFailure(f: MarkingParseFailure): void {
  if (MARKING_PARSE_FAILURES.length >= MAX_CAPTURED) MARKING_PARSE_FAILURES.shift();
  MARKING_PARSE_FAILURES.push(f);
  // Structured server log — this is what makes the NEXT occurrence diagnosable.
  console.error('[marking:parse-failure]', JSON.stringify({
    fn: f.fn, attempt: f.attempt, stop_reason: f.stop_reason,
    input_tokens: f.input_tokens, output_tokens: f.output_tokens, max_tokens: f.max_tokens,
    reason: f.reason, raw_len: f.raw.length, raw: f.raw,
  }));
}

// 1 initial attempt + up to 3 retries = 4 calls maximum, with exponential backoff.
// RETRIES PARSE FAILURES ONLY. An Error('call') is an API/transport fault with its own
// distinct 502 message and its own retry semantics upstream; swallowing it here would blur
// two failure modes the route deliberately keeps apart.
const MARKING_MAX_ATTEMPTS = 4;
const MARKING_BACKOFF_MS = [400, 900, 2000];

async function withParseRetry<T>(fn: 'judgeCaseMarking' | 'judgeTechnicalOnce', once: (attempt: number) => Promise<T>): Promise<T> {
  let last: unknown;
  for (let attempt = 1; attempt <= MARKING_MAX_ATTEMPTS; attempt++) {
    try {
      return await once(attempt);
    } catch (e) {
      last = e;
      if ((e as Error)?.message !== 'parse') throw e;      // call faults propagate immediately
      if (attempt === MARKING_MAX_ATTEMPTS) break;
      await new Promise((r) => setTimeout(r, MARKING_BACKOFF_MS[attempt - 1] ?? 2000));
    }
  }
  console.error(`[marking:parse-failure] ${fn} exhausted ${MARKING_MAX_ATTEMPTS} attempts — throwing`);
  throw last;
}

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
  const { paper, context, wholeAnswer, examinedSkills, professionalSkillsMarks } = input;

  // ── Blank whole-answer → 0, no model call ──
  // A blank or trivially-short whole answer demonstrates zero professional skill, so
  // it scores 0 across the pool deterministically (a fully-blank timed sit costs no
  // model spend and honestly scores 0/100). Never reached in practice mode, where
  // marking only runs once every requirement has been judged correct.
  if (isBlankAnswer(wholeAnswer)) {
    return {
      professional_marks_awarded: 0,
      professional_marks_available: professionalSkillsMarks,
      per_skill: examinedSkills.map((s) => ({ skill: s, mark_awarded: 0, feedback: 'No answer submitted.', band: 'nothing' as TechnicalBand })),
    };
  }

  // ── Marking call (Sonnet) — the model judges a BAND per skill, no marks ──
  // The prompt asks ONLY for a quality band per examined skill against that paper's
  // OWN professional-skills descriptor; it never mentions marks, the pool size, or
  // allocation. Bands are converted to marks deterministically in code below, so the
  // model never decides a number and cannot default the whole pool onto a weak answer.
  const descriptors = getSkillDescriptors(paper);
  const rubric = examinedSkills
    .map((s) => {
      const descriptor = descriptors[s] ?? '(no authored descriptor on file for this skill)';
      return `- ${s}: ${descriptor}`;
    })
    .join('\n');

  const contextLine = context ? `Case scenario and exhibits:\n${context}\n\n` : '';

  const systemPrompt =
    `You are an experienced ACCA ${paper} marker judging the professional skills demonstrated in a ` +
    'whole exam question. You judge HOW the candidate wrote — their reasoning, judgement and ' +
    'communication across the whole answer — against the official ACCA professional-skills descriptor ' +
    'for each examined skill. Each descriptor IS the standard; judge against it, not against a model ' +
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
    `Examined professional skills and their ACCA ${paper} descriptors (the standard):\n${rubric}\n\n` +
    `Candidate's whole answer (all requirements, in order):\n${wholeAnswer}\n\n` +
    'Judge the whole answer against each examined skill\'s descriptor and assign its band. ' +
    'Return ONLY the JSON array.';

  // One judging round-trip: call + defensive parse (strip code fences). Throws
  // Error('call') on API/extract failure and Error('parse') on parse/shape failure.
  async function judgeOnce(attempt = 1): Promise<SkillJudgement[]> {
    let rawJudging: string;
    let meta: { stop_reason: string | null; input_tokens: number | null; output_tokens: number | null } =
      { stop_reason: null, input_tokens: null, output_tokens: null };
    try {
      const res = await anthropic.messages.create({
        model: MARKING_MODEL,
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{ role: 'user', content: baseUserContent }],
      });
      const r = res as unknown as { stop_reason?: string | null; usage?: { input_tokens?: number; output_tokens?: number } };
      meta = { stop_reason: r.stop_reason ?? null, input_tokens: r.usage?.input_tokens ?? null, output_tokens: r.usage?.output_tokens ?? null };
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
    } catch (e) {
      captureParseFailure({ fn: 'judgeCaseMarking', attempt, stop_reason: meta.stop_reason, input_tokens: meta.input_tokens, output_tokens: meta.output_tokens, max_tokens: 1500, raw: rawJudging, reason: (e as Error)?.message ?? 'unknown', at: new Date().toISOString() });
      throw new Error('parse');
    }
  }

  const judgements = await withParseRetry('judgeCaseMarking', judgeOnce);

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

// ═══════════════════════════════════════════════════════════════════════════════
// TECHNICAL band-marking (mock /100). The SAME band→apportion mechanism as PS,
// judged PER REQUIREMENT against that requirement's OWN code-correct model_answer
// (Piece 1), apportioned to that requirement's own marks_guide ceiling. Blank /
// near-blank answers short-circuit to 'nothing' (0) with NO model call. Claim
// ceiling: "answer-locked, model-graded" — code owns the band→marks conversion,
// the model owns the band, judged against a code-generated + gated reference. This
// is NOT the deferred exact-figure numeric-verifier (that parses the student's own
// figures); it is a quality-of-match judgement against the correct answer.
// ═══════════════════════════════════════════════════════════════════════════════

export interface TechnicalRequirementInput {
  requirement_id: string;
  label: string;
  question: string;
  model_answer: string;   // the code-correct (Piece-1) reference to judge against
  marks_guide: number;    // this requirement's technical ceiling
  final_answer: string;   // the student's submitted answer ('' = blank)
}

export interface PerRequirementMark {
  requirement_id: string;
  band: TechnicalBand;
  mark_awarded: number;
  marks_available: number;   // = marks_guide
  feedback: string;
}

export interface TechnicalMarkingResult {
  technical_marks_awarded: number;
  technical_marks_available: number;
  per_requirement: PerRequirementMark[];
}

export interface JudgeTechnicalMarkingInput {
  paper: AccaPaper;
  context: string;
  requirements: TechnicalRequirementInput[];
}

// PURE arithmetic (no model, no I/O): given a band per requirement, convert to
// /technical-pool marks. ceiling_i = marks_guide_i; rawMark_i = ceiling_i ×
// BAND_MULTIPLIER[band_i]; total = min(round(Σraw), Σceiling); apportion() (reused
// VERBATIM) makes the per-requirement integers sum EXACTLY to total. A 'nothing'
// band (raw 0) can never receive an apportionment surplus: its fractional part is 0
// (sorted last), and the surplus never exceeds the count of positive-fraction items.
export function apportionTechnicalMarks(
  judged: Array<{ requirement_id: string; marks_guide: number; band: TechnicalBand; feedback: string }>,
): TechnicalMarkingResult {
  const available = judged.reduce((a, r) => a + r.marks_guide, 0);
  const rawMarks = judged.map((r) => r.marks_guide * BAND_MULTIPLIER[r.band]);
  const rawTotal = rawMarks.reduce((a, m) => a + m, 0);
  const total = Math.min(Math.round(rawTotal), available);
  const marks = apportion(rawMarks, total);
  const per_requirement: PerRequirementMark[] = judged.map((r, i) => ({
    requirement_id: r.requirement_id,
    band: r.band,
    mark_awarded: marks[i],
    marks_available: r.marks_guide,
    feedback: r.feedback,
  }));
  return { technical_marks_awarded: total, technical_marks_available: available, per_requirement };
}

interface TechnicalJudgement { requirement_id: string; band: TechnicalBand; feedback: string }

// ONE batched model call judging every ATTEMPTED requirement against its own
// model_answer. Throws Error('call')/Error('parse') like judgeCaseMarking so the
// route preserves the distinct 502 messages.
async function judgeTechnicalOnce(paper: AccaPaper, context: string, reqs: TechnicalRequirementInput[], attempt = 1): Promise<TechnicalJudgement[]> {
  const contextLine = context ? `Case scenario and exhibits (shared by every requirement):\n${context}\n\n` : '';
  const blocks = reqs
    .map((r, i) =>
      `Requirement ${i + 1} (requirement_id: ${r.requirement_id}) — ${r.label}\n` +
      `Question: ${r.question}\n` +
      `Correct answer (the marking standard — a full-marks response):\n${r.model_answer}\n\n` +
      `Candidate's answer:\n${r.final_answer}`,
    )
    .join('\n\n---\n\n');

  const systemPrompt =
    `You are an experienced ACCA ${paper} marker awarding TECHNICAL marks. For each requirement you are ` +
    "given the correct answer (the marking standard) and the candidate's answer. Judge HOW WELL the " +
    "candidate's answer matches the correct answer on the technical substance — the right method, the " +
    'right figures and conclusions, the right reasoning. Assign exactly one band per requirement:\n' +
    '- "exemplary": matches the correct answer in full; nothing material missing or wrong.\n' +
    '- "strong": substantially correct, with only minor or immaterial gaps or slips.\n' +
    '- "competent": the right approach but a material error, omission, or an incomplete answer.\n' +
    '- "weak": a recognisable attempt in the right general area but largely incorrect or superficial.\n' +
    '- "nothing": earns no credit — irrelevant, absent, or entirely wrong.\n' +
    'Judge each requirement on its ABSOLUTE technical correctness against ITS OWN correct answer. Do not ' +
    'grade on a curve, and do not assume the candidate is right. ' +
    'DISCIPLINE: cite the specific point that decided the band. No band without a named reason. ' +
    'Return ONLY a JSON array, no prose, no code fences: ' +
    '[{ "requirement_id": "...", "band": "exemplary|strong|competent|weak|nothing", "feedback": "..." }] — ' +
    'one object per requirement, using the requirement_id given.';

  const userContent =
    contextLine + `Requirements to mark:\n\n${blocks}\n\n` +
    'Judge each requirement against its own correct answer and assign its band. Return ONLY the JSON array.';

  let raw: string;
  let meta: { stop_reason: string | null; input_tokens: number | null; output_tokens: number | null } = { stop_reason: null, input_tokens: null, output_tokens: null };
  try {
    const res = await anthropic.messages.create({
      model: MARKING_MODEL,
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });
    const rr = res as unknown as { stop_reason?: string | null; usage?: { input_tokens?: number; output_tokens?: number } };
    meta = { stop_reason: rr.stop_reason ?? null, input_tokens: rr.usage?.input_tokens ?? null, output_tokens: rr.usage?.output_tokens ?? null };
    raw = extractText(res);
  } catch {
    throw new Error('call');
  }
  try {
    let cleaned = raw.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```[a-zA-Z]*\s*/, '').replace(/```\s*$/, '').trim();
    }
    const arr = JSON.parse(cleaned);
    if (!Array.isArray(arr)) throw new Error('not an array');
    const validIds = new Set(reqs.map((r) => r.requirement_id));
    const out: TechnicalJudgement[] = arr.map((o) => {
      const requirement_id = typeof o?.requirement_id === 'string' ? o.requirement_id : '';
      const band = typeof o?.band === 'string' ? o.band.trim().toLowerCase() : '';
      const feedback = typeof o?.feedback === 'string' ? o.feedback : '';
      if (!validIds.has(requirement_id) || !isTechnicalBand(band)) throw new Error('malformed entry');
      return { requirement_id, band, feedback };
    });
    if (out.length === 0) throw new Error('empty');
    return out;
  } catch (e) {
    captureParseFailure({ fn: 'judgeTechnicalOnce', attempt, stop_reason: meta.stop_reason, input_tokens: meta.input_tokens, output_tokens: meta.output_tokens, max_tokens: 2000, raw, reason: (e as Error)?.message ?? 'unknown', at: new Date().toISOString() });
    throw new Error('parse');
  }
}

// Run the technical marking pass over one case's requirements. Blanks → 'nothing'
// deterministically (no model call); attempted requirements are model-judged in ONE
// batched call against their own model_answer; then the pure apportionment converts
// bands → /technical-pool marks. Paper-keyed like PS (the prompt names the paper).
export async function judgeTechnicalMarking(input: JudgeTechnicalMarkingInput): Promise<TechnicalMarkingResult> {
  const { paper, context, requirements } = input;

  const bandById = new Map<string, { band: TechnicalBand; feedback: string }>();

  // Deterministic blanks — no model call.
  const attempted = requirements.filter((r) => {
    if (isBlankAnswer(r.final_answer)) {
      bandById.set(r.requirement_id, { band: 'nothing', feedback: 'No answer submitted.' });
      return false;
    }
    return true;
  });

  if (attempted.length > 0) {
    const judged = await withParseRetry('judgeTechnicalOnce', (attempt) => judgeTechnicalOnce(paper, context, attempted, attempt));
    for (const j of judged) bandById.set(j.requirement_id, { band: j.band, feedback: j.feedback });
  }

  // Assemble in original requirement order; any requirement the model somehow omitted
  // defaults to 'nothing' (never silently credited).
  const judged = requirements.map((r) => {
    const b = bandById.get(r.requirement_id) ?? { band: 'nothing' as TechnicalBand, feedback: 'Not marked — treated as no credit.' };
    return { requirement_id: r.requirement_id, marks_guide: r.marks_guide, band: b.band, feedback: b.feedback };
  });

  return apportionTechnicalMarks(judged);
}
