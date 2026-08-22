// lib/acca/narrative-grader.ts
// The MODEL LAYER for narrative marking — a CONSTRAINED Anthropic CriterionGrader.
//
// CLAIM CEILING (do NOT overclaim): this is the per-criterion QUALITY verdict, and it is MODEL-graded,
// not deterministic. The grader judges ONE criterion at a time and returns { met, evidence_span,
// failure_flags } ONLY — it NEVER emits a mark, a total, or an overall verdict. Code
// (narrative-marker.ts `aggregate`) owns marks/band/verdict; deterministic detectors own copy/anchor/
// coverage; Rule-23 (N4) is the verifier-of-the-verifier that keeps THIS layer honest. See
// docs/NARRATIVE_MARKING_DESIGN.md §0-§1.
//
// v1 use is AUTHORING-TIME ONLY: injected into N1 (grade the reveal) + N4 (separate the golden pair).
// There is NO live per-student wiring in v1 (Grant-ruled 2026-07-18) — live marking is Horizon-2.

import type Anthropic from '@anthropic-ai/sdk';
import type { Criterion, CriterionVerdict, CriterionGrader, FailureMode, Met } from './narrative-marker';
import { cacheBlock } from './prompt-cache';

// One-line definitions of the detection targets (docs/evidence/AFM_NARRATIVE_EVIDENCE.md §1b, page-VERIFIED
// 2026-07-20). The grader is shown ONLY the modes a given criterion lists as disqualifiers, so it flags
// against the marking basis, not a generic vibe.
const F_DEFS: Record<FailureMode, string> = {
  F1: 'F1 scenario repetition — the relevant text is copied/paraphrased from the scenario with no analysis or evaluation added.',
  F2: 'F2 list without development — points are listed/named but not explained (no because→implication).',
  F3: 'F3 undeveloped assumption — an assumption is merely STATED, not discussed (what if it does not hold, and the effect).',
  F4: 'F4 fence-sitting — the requirement asks for a recommendation/conclusion but the answer never commits to one.',
  F5: 'F5 generic / not anchored — the discussion is generic and does not USE the named scenario facts this criterion requires.',
  F6: 'F6 superficial figure-commentary — states what a figure/result shows without explaining or challenging it.',
  F7: 'F7 wrong question / drift / missed part — does not address THIS requirement part, or drifts to something not asked.',
  F8: 'F8 issue≠action / infeasible — confuses an issue with a recommended action, or proposes an infeasible action.',
  F9: 'F9 own figures not used — the scenario supplies data/results the discussion should USE to justify the point, but the answer does not bring them into the argument (ACCA J24 p.14).',
  F10: 'F10 no scepticism/commercial acumen — accepts stated information without challenge (with a reason), or shows no awareness of the business/real-world context.',
  F11: 'F11 breadth/balance/no conclusion — one point over-explained at the expense of breadth, or no closing conclusion.',
  F12: 'F12 required output format ignored — a named output format (report/memo to a board) is not produced.',
};

const SYSTEM_AFM =
  'You are a strict ACCA Advanced Financial Management (AFM) marker grading ONE marking criterion at a ' +
  'time. You are given: the criterion (the point a full-marks answer makes, plus the scenario facts it ' +
  'must use), the scenario, and the student answer. Decide ONLY whether THIS criterion is met. ' +
  'You do NOT assign marks, a total, or an overall grade — code does that. Rules: ' +
  '(1) "yes" ONLY if the required point is made AND developed (claim → because → implication) AND ' +
  'applied to the specific named scenario facts. ' +
  '(2) "partial" if the point is present but undeveloped, merely listed, or not anchored to the named facts. ' +
  '(3) "no" if the point is absent, or the text is only restating the scenario. ' +
  '(4) Credit the INSIGHT however the candidate expresses it — an insight stated correctly IN WORDS earns ' +
  'full marks. NEVER require a named statistic, a specific ratio, or a reproduced number; a criterion marks ' +
  'RECOGNITION of the point, not arithmetic. (A candidate who says "the spread of outcomes is very wide ' +
  'relative to the average" has met a dispersion point as fully as one who quotes a coefficient of variation.) ' +
  'Ground every verdict in a SHORT VERBATIM quote from the student answer (evidence_span); use "" only for "no". ' +
  'Raise a failure_flag ONLY from the provided list and ONLY when the answer genuinely exhibits it for THIS ' +
  'criterion. Be conservative: do not invent development that is not on the page, and do not reward a generic ' +
  'answer that never touches the named facts.';

/**
 * SBL's marker. ⚠️ THIS WAS A LIVE DEFECT, NOT A COSMETIC ONE.
 *
 * The grader is the model layer behind N1 and N4 — it decides whether the golden GOOD is a
 * full-marks answer and whether the golden BAD is separable from it. Left as the AFM string, an
 * SBL drill would be gated by a marker told it was marking Advanced Financial Management, and
 * judged against AFM's THREE-part development test (claim → because → implication) while its
 * rubric was written to ACCA's published FOUR-part one. The two disagree on the limb that carries
 * the most SBL marks: an EXAMPLE FROM THE CASE MATERIAL is not part of claim→because→implication,
 * so a GOOD that supplied one and a GOOD that did not would grade identically.
 *
 * Found by running the batch, not by reading the code: SBL-A1 failed N1 on a criterion its reveal
 * did satisfy under the rubric as written.
 *
 * Rule (1) is therefore restated on SBL's own four limbs, and rules (2)-(4) are held verbatim from
 * the AFM string so the conservatism, the insight-not-arithmetic rule and the evidence_span
 * discipline do not drift between papers.
 */
const SYSTEM_SBL =
  'You are a strict ACCA Strategic Business Leader (SBL) marker grading ONE marking criterion at a ' +
  'time. You are given: the criterion (the point a full-marks answer makes, plus the scenario facts it ' +
  'must use), the case material, and the student answer. Decide ONLY whether THIS criterion is met. ' +
  'You do NOT assign marks, a total, or an overall grade — code does that. Rules: ' +
  '(1) SBL AWARDS TWO MARKS ONLY FOR A POINT IDENTIFIED AND THEN DEVELOPED. Answer "yes" ONLY if the ' +
  'required point is made AND developed on the examiners\' published test: its SIGNIFICANCE is weighed, ' +
  'it is tied to THIS organisation using information given in the case, its CONSEQUENCES for the ' +
  'organisation are explained, and it is supported by an EXAMPLE from the case material. A point that ' +
  'is correct, relevant and simply left there is NOT "yes" however well expressed. ' +
  '(2) "partial" if the point is present but undeveloped, merely listed, or not anchored to the named facts. ' +
  '(3) "no" if the point is absent, or the text is only restating the case material. ' +
  '(4) Credit the INSIGHT however the candidate expresses it — an insight stated correctly IN WORDS earns ' +
  'full marks. NEVER require a named statistic, a specific ratio, or a reproduced number; a criterion marks ' +
  'RECOGNITION of the point, not arithmetic. ' +
  'Ground every verdict in a SHORT VERBATIM quote from the student answer (evidence_span); use "" only for "no". ' +
  'Raise a failure_flag ONLY from the provided list and ONLY when the answer genuinely exhibits it for THIS ' +
  'criterion. Be conservative: do not invent development that is not on the page, and do not reward a generic ' +
  'answer that never touches the named facts.';

const SYSTEM_BY_PAPER: Record<string, string> = { AFM: SYSTEM_AFM, SBL: SYSTEM_SBL };

const SUBMIT_VERDICT_TOOL: Anthropic.Tool = {
  name: 'submit_criterion_verdict',
  description: 'Report the per-criterion verdict for ONE criterion. No marks, no overall grade — met + evidence + flags only.',
  input_schema: {
    type: 'object',
    properties: {
      met: { type: 'string', enum: ['no', 'partial', 'yes'], description: 'yes = made+developed+anchored; partial = present but undeveloped/unanchored; no = absent or scenario-restating.' },
      evidence_span: { type: 'string', description: 'A short verbatim quote FROM THE STUDENT ANSWER grounding the verdict. "" only when met="no".' },
      failure_flags: { type: 'array', items: { type: 'string' }, description: 'F-mode codes the answer exhibits for THIS criterion, from the provided list only. [] if none.' },
    },
    required: ['met', 'evidence_span', 'failure_flags'],
  },
};

function buildUserPrompt(c: Criterion, answer: string, scenario: string): string {
  const flagList = c.disqualifiers.length
    ? c.disqualifiers.map((f) => `- ${F_DEFS[f]}`).join('\n')
    : '(none configured for this criterion — raise a flag only if clearly warranted)';
  return `CRITERION (${c.id}, LO ${c.lo}, ${c.marks} marks):
Required point: ${c.required_point}
Named scenario facts this point MUST use: ${c.anchor_facts.length ? c.anchor_facts.join(', ') : '(none)'}
Development required: ${c.development_required ? 'yes (claim → because → implication)' : 'no'}

FAILURE MODES that can void/cap this criterion (raise ONLY these, and only if genuinely present):
${flagList}

SCENARIO:
${scenario}

STUDENT ANSWER:
${answer}

Grade THIS criterion only. Return met + a verbatim evidence_span from the answer + any failure_flags.`;
}

const MET: ReadonlySet<string> = new Set<Met>(['no', 'partial', 'yes']);
const ALL_F: ReadonlySet<string> = new Set<FailureMode>(['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12']);

export interface GraderOpts {
  model?: string;
  maxRetries?: number;   // transient-error retries per criterion
  /** Which paper's marker to be. Omitted → AFM, which is what every pre-2026-08-19 caller got
   *  and is therefore the only default that leaves the AFM corpus's gating unchanged. An
   *  unregistered paper falls to AFM rather than throwing, because a grader that cannot be
   *  constructed fails the gate for a reason that has nothing to do with the drill — but the
   *  generator resolves the paper from the plan, so that path cannot arise there. */
  paper?: string;
}

// Factory: returns a CriterionGrader backed by a constrained (forced-tool, temperature 0) Anthropic call.
// Injected into checkRubricCoverage (N1) and checkRule23 (N4) at authoring time.
export function makeAnthropicCriterionGrader(anthropic: Anthropic, opts: GraderOpts = {}): CriterionGrader {
  const model = opts.model ?? 'claude-sonnet-4-6';
  const maxRetries = opts.maxRetries ?? 2;
  const system = SYSTEM_BY_PAPER[opts.paper ?? 'AFM'] ?? SYSTEM_AFM;
  return async (c: Criterion, answer: string, scenario: string): Promise<CriterionVerdict> => {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        // SYSTEM is byte-identical across every criterion x every drill this grader is asked to
        // check in a run (N1/N4 gates call it once per criterion) — cached below.
        // NOT split at the message level: buildUserPrompt puts the per-CALL-variable CRITERION
        // block first and the per-DRILL-stable SCENARIO/STUDENT ANSWER after it, so there is no
        // leading stable prefix shared across the N criterion-calls for one drill without
        // reordering (SCENARIO+ANSWER first, CRITERION last) — flagged per the PROMPT CACHING
        // task's own step 3, not restructured.
        const res = await anthropic.messages.create({
          model,
          max_tokens: 500,
          temperature: 0,
          system: cacheBlock(system),
          tools: [SUBMIT_VERDICT_TOOL],
          tool_choice: { type: 'tool', name: 'submit_criterion_verdict' },
          messages: [{ role: 'user', content: buildUserPrompt(c, answer, scenario) }],
        });
        const block = res.content.find((b) => b.type === 'tool_use');
        if (!block || block.type !== 'tool_use') throw new Error('no tool_use block in grader response');
        const raw = block.input as { met?: string; evidence_span?: string; failure_flags?: unknown[] };
        const met: Met = MET.has(raw.met ?? '') ? (raw.met as Met) : 'no';
        const flags = Array.from(new Set((Array.isArray(raw.failure_flags) ? raw.failure_flags : [])
          .filter((f): f is FailureMode => typeof f === 'string' && ALL_F.has(f))));
        let span = typeof raw.evidence_span === 'string' ? raw.evidence_span.trim() : '';
        if (span.length > 300) span = span.slice(0, 300);
        return { criterion_id: c.id, met, evidence_span: span, failure_flags: flags };
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries) await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    throw new Error(`criterion grader failed for ${c.id} after ${maxRetries + 1} attempts: ${(lastErr as Error)?.message ?? lastErr}`);
  };
}
