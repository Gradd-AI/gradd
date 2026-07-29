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

/**
 * Pull the first BALANCED JSON block out of a model response.
 *
 * The strict `JSON.parse(trimmed)` this replaces required the response to BEGIN with the JSON.
 * Measured 2026-07-28: on a per-requirement shape the model prefaced the JSON with its own
 * reasoning ("The candidate correctly identifies…") on 20 of ~50 calls — the JSON was present,
 * valid and correct every time, and the parse threw anyway. A marker that discards a correct
 * judgement because of a preamble is failing on presentation, not substance.
 *
 * Handles, in order: code fences (anywhere, not just at position 0), leading prose, and
 * trailing commentary after the block. Brace/bracket matching is STRING-AWARE — a `}` inside
 * a feedback string must not close the object, and this is the whole reason for a scanner
 * rather than a lastIndexOf.
 *
 * Returns null when there is no balanced block, so a genuinely malformed response STILL FAILS.
 * This is deliberately not a "best effort repair": it finds well-formed JSON that happens to be
 * surrounded by text; it never invents structure.
 */
export function extractJsonBlock(raw: string): string | null {
  let s = (raw ?? '').trim();
  const fenced = s.match(/```[a-zA-Z]*\s*([\s\S]*?)```/);
  if (fenced) s = fenced[1].trim();

  const a = s.indexOf('[');
  const o = s.indexOf('{');
  const start = a < 0 ? o : o < 0 ? a : Math.min(a, o);
  if (start < 0) return null;

  const open = s[start];
  const close = open === '[' ? ']' : '}';
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') { inString = true; continue; }
    if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }
  return null;   // unbalanced (e.g. a max_tokens truncation) — the caller must fail
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
  // ORDINAL CONTRACT (2026-07-28): the list is NUMBERED and the model echoes the number, never
  // the skill name. Same reasoning as the technical path — any string the model must reproduce
  // verbatim is a transcription risk, and one slip discarded the entire response.
  const rubric = examinedSkills
    .map((s, i) => {
      const descriptor = descriptors[s] ?? '(no authored descriptor on file for this skill)';
      return `${i + 1}. ${s}: ${descriptor}`;
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
    // ── FEEDBACK CONTRACT — same rules as the technical pass, same reason ──
    // Four skills at 800–1,500 characters each ran longer than the entire technical section and
    // was almost all praise.
    'THE `feedback` STRING IS SHOWN TO THE CANDIDATE. It is not a note to a moderator. Write it to ' +
    'these rules:\n' +
    '1. SECOND PERSON, addressed to them — "You structure the answer as a report…", never "The ' +
    'candidate…".\n' +
    '2. NEVER mention the descriptor, the marking standard, a model answer or any document they ' +
    'cannot see. Say what their writing DID and, where the band is below exemplary, what would have ' +
    'raised it.\n' +
    '3. LENGTH IS SET BY THE BAND:\n' +
    '   • "exemplary" or "strong": ONE or TWO sentences. Name the behaviour that earned it and stop. ' +
    'Do not inventory everything they did well.\n' +
    '   • "competent" or "weak": THREE to FIVE sentences. Name the specific shortfall, point to where ' +
    'in their answer it shows, and state the one thing that would raise the band.\n' +
    '4. Point to their OWN writing when you name evidence — quote a short phrase or name the section. ' +
    'No band without a named reason.\n' +
    '5. No praise for its own sake, no encouragement, no grade prediction. ' +
    'Return ONLY a JSON array, no prose, no code fences, in exactly this shape: ' +
    '[{ "index": 1, "band": "exemplary|strong|competent|weak", "feedback": "..." }] — one ' +
    'object per examined skill, where index is the NUMBER of the skill in the list above. ' +
    'Use the numbers, never the skill names.';

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
      const block = extractJsonBlock(rawJudging);
      if (!block) throw new Error('no balanced JSON block in the response');
      const arr = JSON.parse(block);
      if (!Array.isArray(arr)) throw new Error('not an array');
      // ordinal -> skill name is owned HERE, in code. The model never names a skill.
      const out: SkillJudgement[] = arr.map((o) => {
        const idx = typeof o?.index === 'number' ? o.index : Number(o?.index);
        const band = typeof o?.band === 'string' ? o.band.trim().toLowerCase() : '';
        const feedback = typeof o?.feedback === 'string' ? o.feedback : '';
        if (!Number.isInteger(idx) || idx < 1 || idx > examinedSkills.length) throw new Error();
        if (!isBand(band)) throw new Error();
        return { skill: examinedSkills[idx - 1], band, feedback };
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

// ONE BATCHED model call judging every ATTEMPTED requirement of a case against its own
// model_answer. Throws Error('call')/Error('parse') like judgeCaseMarking so the route
// preserves the distinct 502 messages.
//
// BATCHED, AND THAT IS A MARKING DECISION, NOT A COST ONE — see judgeTechnicalMarking.
//
// NO UUID IN THE MODEL CONTRACT. This call used to ask the model to echo back a 36-character
// requirement_id, and the dominant parse failure was a ONE-CHARACTER transcription slip
// (c3dc709a → c3dc409a, observed), which the validator correctly rejected and which then binned
// the whole case. The model now sees no id at all: it echoes a SHORT ORDINAL, and code owns the
// ordinal → requirement_id mapping. Measured over 50 calls, that removed the slip class outright.
//
// max_tokens 3000 (was 2000): a 4-requirement batch that also cites its evidence per band runs
// ~700–1400 output tokens, and a truncated response is unbalanced JSON the extractor must (and
// does) reject. The ceiling is headroom against that, not a target.
const TECHNICAL_MAX_TOKENS = 3000;

async function judgeTechnicalOnce(
  paper: AccaPaper, context: string, reqs: TechnicalRequirementInput[], attempt = 1,
): Promise<{ index: number; band: TechnicalBand; feedback: string }[]> {
  const contextLine = context ? `Case scenario and exhibits (shared by every requirement):\n${context}\n\n` : '';
  // STRUCTURAL, not instructed (docs/TEACHING_ARCHITECTURE.md): the reference is labelled as
  // something the candidate cannot see and must never be named, rather than merely asking the
  // model not to mention it afterwards. Calling this block "the marking standard" is what
  // produced feedback like "matching the model answer exactly" and "vs model's €31.3m" —
  // sentences that assume a document the student has never been shown.
  const blocks = reqs
    .map((r, i) =>
      `Requirement ${i + 1} — ${r.label}\n` +
      `Question: ${r.question}\n` +
      `Correct treatment — FOR YOUR JUDGEMENT ONLY. The candidate has never seen this text and ` +
      `never will. Never quote it, cite it, or refer to it as a model answer, marking standard ` +
      `or correct answer. Use it to decide the band, then state the correct treatment as plain ` +
      `fact in your own words:\n${r.model_answer}\n\n` +
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
    'Judge each requirement on its ABSOLUTE technical correctness against ITS OWN correct treatment. Do ' +
    'not grade on a curve, and do not assume the candidate is right. ' +
    // ── FEEDBACK CONTRACT — the `feedback` string is READ BY THE CANDIDATE ──
    // It is not a note to a moderator. Before this contract it was written in the third person,
    // cited an invisible model answer, and ran to 1,006 characters on requirements where nothing
    // needed to change.
    'THE `feedback` STRING IS SHOWN TO THE CANDIDATE. It is not a note to a moderator. Write it to ' +
    'these rules:\n' +
    '1. SECOND PERSON, addressed to them. "You ungear the peer beta correctly…" — never "The ' +
    'candidate…", never "the answer shows…".\n' +
    '2. NEVER mention a model answer, marking standard, correct answer, or any document they cannot ' +
    'see. State the correct treatment as plain fact: "the closing futures price is 94.85, not the ' +
    '95.00 you used" — NEVER "the model gives 94.85" or "this matches the marking standard".\n' +
    '3. LENGTH IS SET BY THE BAND:\n' +
    '   • "exemplary" or "strong": ONE or TWO sentences. Name what worked, name any immaterial gap, ' +
    'and stop. Do not justify the band at length and do not list everything they got right.\n' +
    '   • "competent", "weak" or "nothing": FULL DIAGNOSIS. Name the specific omission or error, give ' +
    'the figure THEIR working produced AND the correct figure, and state what it changed downstream ' +
    '(the wrong rate, the wrong decision, the wrong total).\n' +
    '4. NEVER refer to another requirement, earlier or later — each one is read on its own.\n' +
    '5. No praise for its own sake, no encouragement, no grade prediction.\n' +
    'DISCIPLINE: name the specific point that decided the band. No band without a named reason. ' +
    'Return ONLY a JSON array, no prose, no code fences: ' +
    '[{ "index": 1, "band": "exemplary|strong|competent|weak|nothing", "feedback": "..." }] — one ' +
    'object per requirement, where index is the REQUIREMENT NUMBER shown above. Use the numbers.';

  const userContent =
    contextLine + `Requirements to mark:\n\n${blocks}\n\n` +
    'Judge each requirement against its own correct answer and assign its band. Return ONLY the JSON array.';

  let raw: string;
  let meta: { stop_reason: string | null; input_tokens: number | null; output_tokens: number | null } = { stop_reason: null, input_tokens: null, output_tokens: null };
  try {
    const res = await anthropic.messages.create({
      model: MARKING_MODEL,
      max_tokens: TECHNICAL_MAX_TOKENS,
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
    const block = extractJsonBlock(raw);
    if (!block) throw new Error('no balanced JSON block in the response');
    const arr = JSON.parse(block);
    if (!Array.isArray(arr)) throw new Error('not an array');
    const out = arr.map((o) => {
      const idx = typeof o?.index === 'number' ? o.index : Number(o?.index);
      const band = typeof o?.band === 'string' ? o.band.trim().toLowerCase() : '';
      const feedback = typeof o?.feedback === 'string' ? o.feedback : '';
      if (!Number.isInteger(idx) || idx < 1 || idx > reqs.length) throw new Error(`index out of range: ${String(o?.index)}`);
      if (!isTechnicalBand(band)) throw new Error(`invalid band "${band}"`);
      return { index: idx, band, feedback };
    });
    if (out.length === 0) throw new Error('empty');
    return out;
  } catch (e) {
    captureParseFailure({ fn: 'judgeTechnicalOnce', attempt, stop_reason: meta.stop_reason, input_tokens: meta.input_tokens, output_tokens: meta.output_tokens, max_tokens: TECHNICAL_MAX_TOKENS, raw, reason: (e as Error)?.message ?? 'unknown', at: new Date().toISOString() });
    throw new Error('parse');
  }
}

// Run the technical marking pass over one case's requirements. Blanks → 'nothing'
// deterministically (no model call); every attempted requirement is judged in ONE BATCHED call
// against its own model_answer; then the pure apportionment converts bands → /technical-pool
// marks. Paper-keyed like PS (the prompt names the paper).
//
// BLAST RADIUS is real and accepted: a malformed response costs the whole case's batch, not one
// requirement. That is the price of the sibling context (below), and it is now paid down by the
// extractor + retry rather than by splitting the call.
//
// ON EXHAUSTION the error still propagates (route → 502), deliberately: silently banding an
// unjudgeable requirement 'nothing' would zero a possibly-correct answer, and there is no
// per-requirement not_evaluated state in TechnicalMarkingResult to put it in. Introducing one
// is a marking-semantics decision, not a plumbing fix — see docs/AFM_SURFACED.md.
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

  // BATCHED, deliberately. A per-requirement split was tried 2026-07-28 and REVERTED: the
  // sibling context is load-bearing. Judged alone, A(iv) inflated strong → exemplary in 5/5
  // runs, because without the other answers in view the marker has nothing to calibrate
  // "less analytically sharp than the standard" against. Isolation also made the hardest
  // requirement MORE likely to think aloud before answering, not less.
  if (attempted.length > 0) {
    const judged = await withParseRetry('judgeTechnicalOnce', (attempt) => judgeTechnicalOnce(paper, context, attempted, attempt));
    // ordinal → requirement_id is owned HERE, in code. The model never sees an id.
    for (const j of judged) {
      const r = attempted[j.index - 1];
      if (r) bandById.set(r.requirement_id, { band: j.band, feedback: j.feedback });
    }
  }

  // Assemble in original requirement order; any requirement the model somehow omitted
  // defaults to 'nothing' (never silently credited).
  const judged = requirements.map((r) => {
    const b = bandById.get(r.requirement_id) ?? { band: 'nothing' as TechnicalBand, feedback: 'Not marked — treated as no credit.' };
    return { requirement_id: r.requirement_id, marks_guide: r.marks_guide, band: b.band, feedback: b.feedback };
  });

  return apportionTechnicalMarks(judged);
}
