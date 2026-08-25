// APM teaching engine — shared, reusable core.
//
// This is a FAITHFUL COPY of the proven withhold engine that lives inline in
// app/api/acca/tutor/route.ts. It is extracted here so the NEW case-session path
// (app/api/acca/case/*) can run the exact same engine WITHOUT touching the proven
// single-drill route. The single-drill route is deliberately left byte-for-byte
// unchanged (it keeps its own inline copy); consolidating the two into this one
// module is a separate, deliberate follow-up once cases have proven out — the same
// "activation is its own commit" discipline used elsewhere in this codebase.
//
// Behavioural contract: runTeachTurn() reproduces §7 of the tutor route (the moat)
// verbatim for ONE item. Same env flags, same call sequence, same messageKind values.
// It operates on a single item with fields: question, model_answer (sealed), verbLevel,
// markScheme, command_verb, intellectual_level — identical to a drill. For cases the
// "item" is the ACTIVE REQUIREMENT; the shared scenario (intro + exhibits) is passed in
// as `context` (NOT sealed), exactly as a drill's context_text is.

import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
// STAGE 6 (2026-08-24): the case surface uses the SHARED persona selector. `systemFor` is the one
// definition of each paper's persona — importing it is what makes it structurally impossible for
// the drill and case surfaces to drift about what they forbid. See `caseSystemFor` below.
import { systemFor } from './tutor-personas';
// DIVERGENCE #2 (2026-08-24): the ENVELOPE. Imported, never transcribed — `GAP_VERDICT_FORMAT` is
// the ONLY place the output shape is stated and `hintOpeningInstruction` the only place the
// opening is, so the drill and case surfaces cannot drift about either. See `CASE_HINT_OPENING`.
import {
  GAP_VERDICT_FORMAT, parseGapVerdict, safeLabel, nothingCreditable, type GapVerdict,
} from './gap-verdict';
import { hintOpeningInstruction, type HintOpeningVariant } from './hint-opening';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClientSessionState {
  enc: string;  // AES-256-GCM: JSON { answer: string; counted: boolean }
  miss_count: number;
  last_diagnosis: string | null;
  last_real_attempt: string | null;
  // NOTE: teach_through_counted is NOT in this plaintext blob — it lives inside
  // enc so the client cannot manipulate it to skip the cap increment.
}

// The decrypted payload — both fields are tamper-proof inside AES-256-GCM.
export interface EncPayload {
  answer: string;
  counted: boolean; // true once the DB increment for this item has been applied
}

// ── Encryption ────────────────────────────────────────────────────────────────

function getKey(): Buffer {
  const secret = process.env.TUTOR_SESSION_SECRET;
  if (!secret) throw new Error('TUTOR_SESSION_SECRET not configured');
  return createHash('sha256').update(secret).digest();
}

export function sealPayload(answer: string, counted: boolean): string {
  const key  = getKey();
  const iv   = randomBytes(12);
  const body = JSON.stringify({ answer, counted } satisfies EncPayload);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc  = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function openPayload(ciphertext: string): EncPayload {
  const key = getKey();
  const buf = Buffer.from(ciphertext, 'base64');
  const iv  = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const dat = buf.subarray(28);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  const plain = decipher.update(dat).toString('utf8') + decipher.final('utf8');
  try {
    return JSON.parse(plain) as EncPayload;
  } catch {
    // Backward compat: sessions sealed before this deploy encrypted a raw string.
    return { answer: plain, counted: false };
  }
}

// ── Stop-signal detection ─────────────────────────────────────────────────────

const STOP_PHRASES = [
  // capitulation
  'just tell me',
  "i don't know",
  "i give up",
  'no idea',
  "don't know",
  'give up',
  'skip it',
  // ask-to-be-taught
  "i'm stuck",
  'im stuck',
  "i'm lost",
  'im lost',
  'show me how',
  'walk me through',
  'talk me through',
  'teach me',
  'how would a full-marks',
  'how would a full marks',
  'what would a full-marks',
  'what would a full marks',
  "i don't understand",
  'where do i start',
  'how do i approach',
];

function isStopSignal(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return STOP_PHRASES.some(p => lower.includes(p));
}

// ── Stop-signal split (intent layer) ──────────────────────────────────────────
const TEACH_REQUEST_PHRASES = [
  'just tell me',
  'show me how',
  'walk me through',
  'talk me through',
  'teach me',
  'how would a full-marks',
  'how would a full marks',
  'what would a full-marks',
  'what would a full marks',
];

function isTeachRequest(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return TEACH_REQUEST_PHRASES.some(p => lower.includes(p));
}

// ── Earned reveal (redesign item 3) ───────────────────────────────────────────
const REVEAL_ENABLED = process.env.APM_EARNED_REVEAL === '1';
const COMPLETENESS_GATE_ENABLED = process.env.APM_COMPLETENESS_GATE === '1';

// ── DIVERGENCE #2 — the CASE hint opening's arm, env-selected ────────────────
// `conditional` (default) = the `creditable` arm is live. `shipped` = the praise-first opening
// unconditionally, i.e. today's behaviour.
//
// ⚠️ SEPARATE FROM THE DRILL ROUTE'S `TUTOR_HINT_OPENING`, DELIBERATELY. One variable per switch:
// sharing the env var would move BOTH surfaces whenever either is measured, and a case arm that
// silently re-words the drill prompt confounds the drill's own baseline.
//
// ⚠️ THIS EXISTS SO BOTH ARMS RUN ON ONE SERVER FROM ONE BUILD. The stage-6 measurement had to
// check out two SHAs and reboot between arms; the redteam driver already PRINTS the opening
// variant it ran under, so an env-selected arm is recorded in the capture and a run can never be
// read against the wrong prompt.
const CASE_HINT_OPENING = (process.env.TUTOR_CASE_HINT_OPENING ?? 'conditional') as HintOpeningVariant;

// ── DIVERGENCE #3 — the EQUIVALENCE CHECK's scope, env-selected ──────────────
// `narrative` (default) = the check asks whether the claim is SUBSTANTIVELY equivalent, numerical
// OR narrative. `shipped` = the numeric-only form, i.e. today's behaviour.
//
// ⚠️ THE SHIPPED FORM ASKS A QUESTION THIS SURFACE CANNOT ANSWER. The drill route has asked about
// "the student's claim (numerical OR narrative)" since the grounding work; this engine still asks
// whether "the student's NUMERICAL RESULT is MATHEMATICALLY equivalent to the model's" — on a
// surface whose requirements are overwhelmingly discursive. A narrative answer has no numerical
// result, so the check cannot return equivalent, and the only branch left open is "name an error".
// That is the P-T4 shape exactly: a demand the input cannot satisfy does not go unanswered, it
// gets satisfied with the nearest thing the remaining rules permit.
export type CaseEquivVariant = 'narrative' | 'shipped';
const CASE_EQUIV = (process.env.TUTOR_CASE_EQUIV ?? 'narrative') as CaseEquivVariant;

// ── DIVERGENCE #4 — the CONFIRM leg's "equally valid" endorsement, env-selected ──
// `conditioned` (default) = the endorsement is demanded for PRESENTATION differences and a
// different job is demanded where an alternative FIGURE or METHOD is asserted. `shipped` =
// today's unconditional "if their convention differs, say it's equally valid".
//
// ⚠️ NOT A PORT OF THE DRILL ROUTE'S WORDING, DELIBERATELY. That arm is written as a PROHIBITION
// ("never call a wrong or unscaled form 'equally valid' to protect their mood"), and P-T2/P-T4
// both say a prohibition layered over a standing demand redirects the output rather than removing
// it — the demand here being "say it's equally valid", which the shipped string issues
// unconditionally. So the DEMAND is conditioned instead: the endorsement is owed for presentation,
// and where a different figure or method is claimed the leg is asked to do something else it CAN
// do. Nothing is forbidden, so there is no unwanted output being named and primed.
export type CaseConfirmVariant = 'conditioned' | 'shipped';
const CASE_CONFIRM = (process.env.TUTOR_CASE_CONFIRM ?? 'conditioned') as CaseConfirmVariant;

const REVEAL_PHRASES = [
  'show me the full answer',
  'show me the answer',
  'show me the model answer',
  'show me the worked answer',
  'show me the full build',
  'show the full answer',
  'show the answer',
  'show the model answer',
  'just show me the answer',
  'reveal the answer',
  'reveal the full answer',
  'reveal the model answer',
];

function isRevealRequest(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return REVEAL_PHRASES.some(p => lower.includes(p));
}

const EARN_REDIRECT =
  "Give it a genuine go first — even a rough one. Take a real swing at it and I'll show you " +
  'exactly how a full-marks answer is built, step by step.';

// ── Correct-answer detection ───────────────────────────────────────────────────
function isCorrectVerdict(diagnosis: string): boolean {
  return /\banswer correct\b/i.test(diagnosis.trim());
}

// ── Ezra persona ──────────────────────────────────────────────────────────────

// ── STAGE 6 (2026-08-24): THE CASE SURFACE ADOPTS THE SHARED PERSONA ─────────
// `EZRA_APM_CASE_SYSTEM` IS DELETED. It was the stage-5 rename of the module's one hardcoded
// persona, held byte-for-byte while AFM was routed away from it. It is gone because there is no
// longer anything case-specific in it to hold: it was `EZRA_SYSTEM`'s first 979 characters —
// header, register, diagnostic frame, requirement-demands line, scepticism line, all
// byte-identical — followed by the GUARDRAIL line and (since 2026-08-23) DIGNITY_ON_DISTRESS.
// The entire remaining difference was the six guardrail blocks this stage adopts, so keeping a
// separate constant would mean maintaining a second copy of a string with zero divergence.
//
// WHAT THE CASE PATH GAINS — the six blocks it never received:
//   NO_INVENTED_NUMBERS · NO_COMPUTED_OUTPUTS · NO_INVENTED_REVEAL_REFUSAL
//   GROUNDING_DISCIPLINE · RETRACTION_PROTOCOL · METHOD_FITS_THE_GIVEN_INPUTS
// (DIGNITY_ON_DISTRESS shipped alone on 2026-08-23 and is already live on both papers.)
//
// ⚠️ THIS MOVES APM'S LIVE CASE PROMPT. It is NOT a byte-diff and stage 5 refused to do it for
// that reason. AFM does not move: `caseSystemFor('AFM')` returned `EZRA_AFM_SYSTEM` before this
// change and returns it after, so only the APM half is under measurement.
//
// ⚠️ ORDERING CHANGED, AND IT IS THE DESIGNED ORDER. The blocks compose in `EZRA_SYSTEM`'s
// sequence, which ends on METHOD_FITS_THE_GIVEN_INPUTS — deliberately the ANCHOR position
// (most-recently-read wins; see its comment in tutor-personas.ts). DIGNITY_ON_DISTRESS therefore
// moves from LAST on the APM case prompt to mid-block. That is the shipped drill configuration,
// so case now matches drill rather than diverging from it, but it is a real change to a clause
// that shipped one day ago and it is recorded here rather than left to be discovered.
//
// ⚠️ THE ADOPTED BLOCKS CARRY DRILL VOCABULARY, AND IT IS NOT FIXED HERE. NO_INVENTED_NUMBERS
// says "the drill did not supply" and "the drill's OWN inputs"; METHOD_FITS_THE_GIVEN_INPUTS
// and NO_COMPUTED_OUTPUTS illustrate with Black-Scholes specifics (d₁/d₂/N(d), "divide the share
// price and strike by the number of options") that no APM case requirement involves. Rewording
// them to be surface-neutral would move the DRILL prompt too and invalidate every drill
// measurement they were tuned on — so the words stay as they are and the cost is recorded.
// ⚠️ GROUNDING_DISCIPLINE NAMES A BLOCK SHAPE THE CASE PATH NEVER EMITS. It binds on "a
// CHECKLIST, FACTS, or CONVENTIONS block"; the case path's `groundedFacts` is
// `renderDiscriminants(...)`, which emits "CODE-OWNED CHOICES" / "CONTRADICTION FOUND" — and on
// the 34 of 38 published requirements with no registered discriminant it returns the EMPTY
// STRING, so the block's antecedent is false and it cannot bind at all.

/**
 * The persona for a case turn, chosen by the case's paper.
 *
 * ⚠️ THIS NOW DELEGATES TO `systemFor` AND HAS ZERO DIVERGENCE FROM IT. Both papers return the
 * shared persona from tutor-personas.ts — the blocks are IMPORTED THROUGH ONE DEFINITION, never
 * transcribed, so the drill and case surfaces cannot drift about what they forbid.
 * `scripts/test-case-persona.ts` pins the equality for both papers, so a divergence cannot be
 * introduced silently.
 *
 * KEPT AS A NAMED SEAM RATHER THAN DELETED, for one reason: the case surface has two open,
 * recorded caveats that the drill surface does not (below), and a case-specific persona fix — if
 * either is ever acted on — lands here as a one-line change instead of a re-architecture. The
 * fixture is what stops the seam becoming an accidental fork.
 *
 * ⚠️ CAVEAT, RECORDED BECAUSE IT IS UNMEASURED: BOTH personas were written for the DRILL surface.
 * For AFM this has been true since stage 5; as of stage 6 it is true for APM as well, since APM's
 * case prompt is now the drill persona verbatim. "Correct paper" is not "written for cases", and
 * the drill vocabulary noted above is the visible edge of that. Nothing has measured either
 * persona on the case surface beyond the stage-6 arm.
 *
 * ⚠️ `paper` is safe to trust here: `app/api/acca/case/turn/route.ts` fetches the case with
 * `.eq('paper_code', paper)`, so a case that does not belong to the requested paper is never
 * loaded — the persona cannot end up scoped to a paper the content is not from.
 */
export function caseSystemFor(paper: string): string {
  return systemFor(paper);
}

// ── Anthropic client ──────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface TextBlock { type: 'text'; text: string }
interface AnthropicMessage { content: Array<{ type: string } | TextBlock> }

function extractText(res: unknown): string {
  const msg = res as AnthropicMessage;
  const block = msg.content.find((b): b is TextBlock => b.type === 'text');
  if (!block) throw new Error('No text block in Anthropic response');
  return block.text;
}

// ── CALL 1: Generate model answer (fallback only) ─────────────────────────────

export async function call1_generate(question: string, context: string): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    system:
      'You are an experienced ACCA APM marker. Write a complete model answer at the level ' +
      'a top-band APM candidate would produce — applied to the specific scenario, ' +
      'with professional judgement, not just model recitation. ' +
      'SIGN CONVENTION: Express all variances as standard − actual. ' +
      'Label the result A (adverse) when actual exceeds standard, F (favourable) when actual is below standard. ' +
      'State the formula direction in your workings and ensure the A/F label is consistent with the arithmetic sign.',
    messages: [
      {
        role: 'user',
        content: `${contextLine}Question: ${question}\n\nWrite the full model answer.`,
      },
    ],
  });
  return extractText(res);
}

// ── CALL 2: Diagnose → content-neutral gap label ──────────────────────────────

async function call2_diagnose(
  question: string,
  context: string,
  attempt: string,
  modelAnswer: string,
  markScheme: string,
  // CODE-OWNED FINDINGS, threaded separately from the mark scheme ON PURPOSE. The mark-scheme
  // block below is framed "do NOT quote it or state the answer", which is right for a mark scheme
  // and exactly wrong for a direction contradiction — the one finding the student MUST be told.
  // Carried in its own channel so the suppression does not apply to it.
  groundedFacts = '',
): Promise<{ label: string; verdict: GapVerdict | null }> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const gfLine = groundedFacts ? `${groundedFacts}\n` : '';
  const msLine = markScheme
    ? `Authored mark scheme (use to identify WHICH criterion/level the student missed; do NOT quote it or state the answer):\n${markScheme}\n\n`
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    // 40 → 160 FOR THE ENVELOPE. The old cap fitted a bare 12–15 word label with nothing to spare;
    // a JSON object carrying the same label plus two integer fields does not fit in it, and a
    // truncated body fails `parseGapVerdict` on every turn — the arm would measure a parser that
    // never parses. The LABEL's own 12–15 word limit is unchanged and still stated in the format.
    max_tokens: 160,
    system:
      'You are a precision gap-labeller. Output ONE short label — hard limit 12–15 words, count them — ' +
      "that names what the student did wrong, using the student's error as the referent. " +
      caseEquivalenceCheck(CASE_EQUIV) +
      "If the student's answer is correct, output: \"answer correct — convention differs from model only\" " +
      'ABSOLUTE RULES: ' +
      '(1) NEVER state the correct answer or any corrected fact, even implicitly. ' +
      '(2) Name the faulty mental model or wrong operation the student applied. ' +
      '(3) Output ONLY the label — no prose, no prefix, no explanation. ' +
      'BAD (forbidden): any phrase that states the correct answer. ' +
      // THE ENVELOPE. Rule (3) above says "output ONLY the label", which the format block now
      // overrides — it is stated LAST so the most-recently-read instruction is the one that
      // describes the actual output shape. The "answer correct — convention differs from model
      // only" sentence above becomes the LABEL inside the object; `isCorrectVerdict` therefore
      // runs on `safeLabel(...)`, never on the raw body, or a correct answer reads as a miss.
      GAP_VERDICT_FORMAT,
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          // FIRST, and before the mark scheme. Where code has already established that the answer
          // sits on the wrong side of a settled choice, that IS the gap — a contract count is
          // worthless on the wrong side of the trade, and burying it under the component list is
          // how ~10/20 baseline turns went straight to the arithmetic.
          gfLine +
          msLine +
          `Model answer (reference only — do NOT restate or correct in output):\n${modelAnswer}\n\n` +
          'Output the gap label only. Name the error pattern. Do not state what is correct.',
      },
    ],
  });
  const raw = extractText(res);
  const verdict = parseGapVerdict(raw);
  // NO RETRY, DELIBERATELY — unlike the drill route, which wraps this call in `withParseRetry`
  // because `derived` is wired to production behaviour there and a parse failure would drop a
  // live guard. Here the ONLY wired field is `creditable`, and an absent value reads as "no
  // claim" → the shipped opening → today's behaviour exactly. Retrying would spend four calls to
  // recover a field whose failure is already safe.
  //
  // ⚠️ BUT THE PARSE RATE IS THE ARM'S VALIDITY CONDITION, so it is observable rather than
  // silent: a run in which nothing parses would show "no effect" and be indistinguishable from a
  // measured null result. Count these lines in the server log when reading any measurement.
  console.log(JSON.stringify({
    at: 'case_gap_verdict',
    parsed: verdict !== null,
    creditable: verdict?.creditable ?? null,
    derived: verdict?.derived ?? null,
  }));
  return { label: safeLabel(verdict, raw), verdict };
}

/**
 * DIVERGENCE #3 — the equivalence check that call2_diagnose runs before it will name any error.
 *
 * Pure and exported so the assembled bytes are pinnable: the claim is that `shipped` is
 * byte-identical to what this engine sent before the variant existed, so anything the arm measures
 * is attributable to the narrative clause alone.
 *
 * ⚠️ THE GROUNDING CLAUSE IS DELIBERATELY NOT PORTED. The drill route's version also says "AND
 * (when a GROUNDING block is supplied below) a narrative claim may use different WORDING than a
 * checklist point or fact". This engine's grounding channel is `renderDiscriminants`, which is
 * EMPTY on 34 of 38 published requirements — so that clause would be inert on almost every turn
 * while adding a second moving part to the arm. One variable: numeric-only → numeric-or-narrative.
 */
export function caseEquivalenceCheck(variant: CaseEquivVariant): string {
  const HEAD =
    'EQUIVALENCE CHECK — do this before naming any error: ' +
    'The model answer and student answer may use different but equivalent sign conventions ' +
    '(standard−actual vs actual−standard), A/F labelling, table layouts, or arithmetic orderings. ';
  if (variant === 'shipped') {
    return (
      HEAD +
      "Check whether the student's numerical result is mathematically equivalent to the model's. " +
      'Only name an error if the answer is genuinely WRONG — not merely presented in a different convention. ' +
      'A correct answer in a different format is NOT an error and must NOT be flagged. '
    );
  }
  return (
    HEAD +
    "Check whether the student's claim — numerical OR narrative — is substantively equivalent to " +
    "the model's, before concluding it is wrong. " +
    'Only name an error if the answer is genuinely WRONG — not merely presented in a different ' +
    'convention or wording. ' +
    'A correct answer in a different format or phrasing is NOT an error and must NOT be flagged. '
  );
}

/**
 * DIVERGENCE #4 — the confirm leg's treatment of a convention that differs from the model.
 *
 * `shipped` demands the "equally valid" endorsement UNCONDITIONALLY, so a student who reached the
 * right conclusion by a method the requirement does not support is told their method is equally
 * valid — the leg has no other branch available to it.
 *
 * `conditioned` narrows the endorsement to PRESENTATION (layout, labelling, ordering) and, where
 * the answer asserts an alternative FIGURE or METHOD, demands a different and satisfiable job:
 * say plainly whether it holds against what the requirement demanded.
 *
 * ⚠️ DEMAND-FORM, NOT PROHIBITION-FORM — see `CASE_CONFIRM`. The drill route's equivalent arm ends
 * with "never call a wrong or unscaled form 'equally valid' to protect their mood". That sentence
 * NAMES the unwanted output, which P-M4 measured as priming it, and it sits downstream of a demand
 * it cannot repeal. Here the demand itself is split, so on the alternative-method branch the
 * "equally valid" instruction is never issued in the first place and there is nothing to forbid.
 */
export function caseConfirmConvention(variant: CaseConfirmVariant): string {
  if (variant === 'shipped') {
    return "If their convention differs from the usual model, say it's equally valid. ";
  }
  return (
    'If their PRESENTATION differs from the usual model — layout, labelling, ordering, the shape ' +
    "of the working — say it's equally valid, because it is. If instead they have used a " +
    'different FIGURE or a different METHOD from the one the requirement demanded, say plainly ' +
    'whether that alternative holds and what it turns on. '
  );
}

// ── CALL 3: Hint (first miss) ─────────────────────────────────────────────────

/**
 * The case hint leg's OPENING instruction. Pure, exported so the assembled bytes are pinnable —
 * the claim this whole divergence rests on is "the non-creditable path is byte-identical to what
 * ships today", and a claim about a string that only exists inside an async model call cannot be
 * tested.
 *
 * PRECEDENCE: CONTRADICTION → NOTHING-CREDITABLE → SHIPPED.
 *
 * ⚠️ THE CONTRADICTION ARM STAYS FIRST AND BYTE-IDENTICAL. It is the only arm on this surface with
 * a measured baseline (4/20 → 12/20 with the fence on diagnose alone) and it fires on a CODE-OWNED
 * finding, which outranks a model-reported field. Reordering would silently re-word the one
 * opening whose rate is known — the same precedence rule `hint-opening.ts` applies between its own
 * (b) and (c) arms.
 *
 * ⚠️ `nothingEstablished` IS PASSED HARD-FALSE, BY DESIGN, NOT OVERSIGHT. `derived` is parsed off
 * the envelope and deliberately NOT wired here: its (b) arm is numeric-shaped ("the figure is
 * unchecked", "put their reasoning on the page") and would misdescribe a discursive case
 * requirement entirely. Wiring both fields at once would also buy exactly the N-way
 * unattributability P-T4 warns about — this moves ONE variable, `creditable`.
 *
 * ⚠️ `.trimEnd()` IS LOAD-BEARING. Every `hintOpeningInstruction` arm ends with a trailing space
 * and the caller's tail already begins with one; without the trim every case turn gains a double
 * space — a silent one-character edit to a live prompt, made while measuring that prompt.
 */
export function caseHintOpening(
  variant: HintOpeningVariant,
  hasContradiction: boolean,
  nothingCreditableNow: boolean,
): string {
  if (hasContradiction) {
    return (
      'First miss, and the answer is on the WRONG SIDE of a settled choice stated above. ' +
      'Do NOT open by crediting them with that choice — they did not make it. Say plainly ' +
      'which way round it actually goes and why, then give one next move. If something ' +
      'else in their work is genuinely right you may say so, but never the thing the ' +
      'contradiction names.'
    );
  }
  // IMPORTED, never transcribed: `hint-opening.ts` is the one place the opening is stated, so the
  // drill and case surfaces cannot drift about what it asks for.
  return hintOpeningInstruction(variant, false, nothingCreditableNow).trimEnd();
}

async function call3_hint(
  question: string,
  context: string,
  attempt: string,
  diagnosis: string,
  verbLevel: string,
  // THE FENCE BELONGS HERE TOO, and putting it only on the diagnose leg was a measured mistake:
  // the rate went 4/20 → 12/20 with the fence on diagnose alone. call2_diagnose emits a 12–15
  // word LABEL; this leg writes what the student actually reads, and with no access to the
  // discriminant it was confabulating the rule ("borrowers do buy futures"). The statements are
  // METHOD facts, not figures — the same trust tier as `conventions`, which this leg already
  // sees — so they are safe here and the moat is untouched.
  groundedFacts = '',
  // THE LEVEL-AWARE CLOSING CONTRACT (lib/acca/teach-demand.ts → nextMoveContract), ported to the
  // case path 2026-08-07. Defaulted to '' so every existing caller keeps a byte-identical prompt.
  // See the block comment on TeachTurnInput.nextMove for why this could not stay drill-only.
  nextMove = '',
  /** Case paper, for persona routing only. Defaults to 'APM' so any caller that does not pass it
   *  gets a byte-identical prompt to before this parameter existed. See caseSystemFor. */
  paper = 'APM',
  /**
   * DIVERGENCE #2 — nothing in the answer earns credit against THIS requirement
   * (`creditable === 0` on the parsed envelope).
   *
   * Defaulted FALSE so every existing caller, and every turn whose envelope did not parse, gets
   * the shipped opening and a byte-identical prompt. Absent must mean "no claim", never "nothing
   * creditable": this arm SUPPRESSES the praise demand, and the failure it would cause is telling
   * a student who did good work that there was nothing worth leading with.
   */
  nothingCreditableNow = false,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const gfLine = groundedFacts ? `${groundedFacts}\n` : '';
  const nextMoveLine = nextMove ? `${nextMove}\n\n` : '';
  const vlLine = verbLevel
    // Was "Authored command verb + intellectual level (name these — do not infer)". The model
    // did name them, and students saw "At ACCA intellectual level 3, where 'calculate' sits…".
    // The caller now passes a plain-English demand (lib/acca/teach-demand.ts) with no taxonomy
    // in it, so there is nothing to name; this line no longer asks it to.
    ? `What this requirement demands (calibrate against this; do not quote it back as a label):\n${verbLevel}\n\n`
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    system: caseSystemFor(paper),
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          gfLine +
          vlLine +
          nextMoveLine +
          // THE PRAISE INSTRUCTION IS NOW CONDITIONAL, and that is the other half of the fix.
          // "Lead with the ONE specific thing they got right" COMPELS praise on every turn. Given
          // an answer that is wrong on the side of the trade, the model manufactures one — which
          // is where "you've correctly identified the direction — borrowers do buy futures" came
          // from. It was not ignoring the fence; it was obeying a stronger instruction. Where code
          // has established a contradiction there is no opening credit to give on that axis, so
          // the prompt stops asking for it.
          caseHintOpening(CASE_HINT_OPENING, groundedFacts.includes('CONTRADICTION FOUND'), nothingCreditableNow) +
          ' Punchy and conversational, 2 sentences, like a tutor in their corner, not a ' +
          "structured breakdown. Don't state the answer.",
      },
    ],
  });
  return extractText(res);
}

// ── CALL 3: Teach-through (second miss or stop-signal) ────────────────────────

async function call3_teach(
  question: string,
  context: string,
  attempt: string,
  diagnosis: string,
  verbLevel: string,
  offerReveal: boolean,
  groundedFacts = '',
  nextMove = '',
  /** Case paper, for persona routing only. Defaults to 'APM' so any caller that does not pass it
   *  gets a byte-identical prompt to before this parameter existed. See caseSystemFor. */
  paper = 'APM',
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const gfLine = groundedFacts ? `${groundedFacts}\n` : '';
  const nextMoveLine = nextMove ? `${nextMove}\n\n` : '';
  const vlLine = verbLevel
    ? `What this requirement demands (diagnose against this; do not quote it back as a label):\n${verbLevel}\n\n`
    : '';
  const offerLine = offerReveal
    ? ' As the alternative next move, tell them they can say "show me the full answer" to see exactly how a full-marks answer is built.'
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: caseSystemFor(paper),
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          gfLine +
          vlLine +
          nextMoveLine +
          (groundedFacts.includes('CONTRADICTION FOUND')
            ? "Second miss, and the answer is still on the WRONG SIDE of a settled choice stated " +
              'above. Do NOT credit them with that choice. State plainly which way round it goes ' +
              'and why, then the single next move.'
            : "Second miss or stop-signal — they haven't cracked it yet. Still don't lecture: lead " +
              'with the specific thing that IS working, then name the ONE gap that matters most ' +
              '(one, sharply — not a list of four) and the single next move that unblocks it.') +
          ' Conversational prose, 3 sentences, 4 at the most — no numbered points or structured ' +
          'breakdown, a sharp tutor talking not a marked script. Use what the requirement demands ' +
          'above to pin the gap accurately. Do not complete the answer or give the figures.' +
          offerLine,
      },
    ],
  });
  return extractText(res);
}

// ── CALL 3: Confirm (correct answer) ──────────────────────────────────────────

async function call3_confirm(
  question: string,
  context: string,
  attempt: string,
  verbLevel: string,
  /** Case paper, for persona routing only. Defaults to 'APM'. See caseSystemFor. */
  paper = 'APM',
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel
    ? `What this requirement demands (judge what the answer hit against this; do not quote it back as a label):\n${verbLevel}\n\n`
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: caseSystemFor(paper),
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          vlLine +
          'The answer is CORRECT — it may use a different but equivalent convention ' +
          '(sign convention, A/F labelling, layout) than a model answer would. Tell them they ' +
          'nailed it, and mean it: 2–3 sentences, warm and peer-to-peer, leading with the specific ' +
          'thing they did well (the real move, not empty praise). ' +
          // Was: "Name the command verb and ACCA intellectual level the answer hit (from the
          // authored values above — do not infer when given)". Left behind by the 2026-08-01
          // fence, which rewrote this leg's vlLine header but not its body — and it directly
          // contradicted this module's OWN system prompt ("Never name an internal grading
          // taxonomy to the student"), 240 lines apart. The values are no longer in the prompt,
          // so the only way to obey it was to invent one.
          'Say briefly which part of what the requirement demanded the answer actually hit, and ' +
          'why it holds / what puts it in the top band. ' +
          caseConfirmConvention(CASE_CONFIRM) +
          'Do NOT restate, re-derive, or ' +
          'quote back their figures or workings — they already wrote them; refer to what they did ' +
          "in words, not numbers. Don't mark it as if it fell short.",
      },
    ],
  });
  return extractText(res);
}

// ── CALL 2b: Completeness gate (behind APM_COMPLETENESS_GATE) ──────────────────
async function completenessCheck(
  question: string,
  context: string,
  modelAnswer: string,
  attempt: string,
  verbLevel: string,
): Promise<string | null> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel ? `What this requirement demands: ${verbLevel}\n\n` : '';
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system:
        'You audit whether a student answer attempted every REQUIRED component of a model answer. ' +
        'Numerical correctness is ALREADY verified — do NOT re-check numbers, and do NOT treat ' +
        'convention/format/layout differences as missing (sign convention, A/F labelling, table ' +
        'layout are all fine). ' +
        'STEP 1: read the model answer and identify its distinct REQUIRED components — what the ' +
        'question/command verb actually demands (e.g. the calculation, the evaluation/recommendation, ' +
        'the sceptical challenge, the limitations/bias commentary — wording varies, do not rely on ' +
        'headings; ignore incidental flourishes the verb does not require). ' +
        'STEP 2: for EACH required component, judge whether the student answer makes ANY genuine ' +
        'attempt at it — however brief, oblique or thinly developed still counts as an attempt. ' +
        'Depth is NOT your concern; only attempted-at-all vs not-there-at-all. ' +
        'OUTPUT: one line per required component and NOTHING else — no preamble, no summary — in ' +
        'exactly this form:  PRESENT — <2-4 word component name>  OR  ABSENT — <2-4 word name>. ' +
        'When unsure whether a faint attempt counts, mark it PRESENT (never invent an absence).',
      messages: [
        {
          role: 'user',
          content:
            `${contextLine}Question: ${question}\n\n` +
            vlLine +
            `Model answer (defines the required components — reference only, do NOT restate):\n${modelAnswer}\n\n` +
            `Student answer:\n${attempt}\n\n` +
            'List each required component on its own line as "PRESENT — name" or "ABSENT — name". Nothing else.',
        },
      ],
    });
    const out = extractText(res).trim();
    const absent = out
      .split('\n')
      .map(l => l.trim())
      .filter(l => /^absent\b/i.test(l))
      .map(l => l.replace(/^absent\b[\s—:–-]*/i, '').trim())
      .filter(name => name && !/^(none|n\/?a|nothing)$/i.test(name));
    if (absent.length === 0) return null;
    return `no genuine attempt at ${absent.slice(0, 2).join(' or ')}`;
  } catch {
    return null; // non-fatal — a check failure preserves today's correct behaviour
  }
}

// ── Intent layer (redesign item 2) ────────────────────────────────────────────
const INTENT_LAYER_ENABLED = process.env.APM_INTENT_LAYER === '1';

type Intent = 'attempt' | 'question' | 'confusion' | 'aside';

const CLASSIFY_SYSTEM =
  'You are an intent classifier for an ACCA APM tutoring chat. The student is looking at an ' +
  "exam-style question and talking to Ezra, a tutor. Classify the student's latest message into " +
  'EXACTLY ONE label:\n' +
  '- attempt = genuinely trying to answer the drill — any substantive engagement, even partial, ' +
  'terse, hedged, or wrong (a calculation, a claim, an analysis, a definition applied to the ' +
  "scenario). A substantive claim about the drill's concepts or figures is an attempt REGARDLESS " +
  'OF (a) hedging or evaluative/emotional wording (e.g. "maybe ROI is just unfair", "this measure ' +
  'is useless") and (b) interrogative or tag-question syntax (e.g. "isn\'t it just the overhead ' +
  'allocation?", "so it\'s residual income, right?"). If the message proposes or asserts content ' +
  'addressing the question, choose attempt EVEN IF it is phrased as a question or also asks ' +
  'something.\n' +
  '- question = ASKING a content or process question rather than answering (what a term means, ' +
  'whether to do something, how to approach it) AND proposing NO substantive answer of their own. ' +
  'A message phrased as a question that nonetheless proposes a substantive answer (e.g. "isn\'t it ' +
  'X?") is an attempt, not a question.\n' +
  '- confusion = expresses being stuck, lost, overwhelmed, or frustrated ABOUT THEIR OWN ' +
  'PROGRESS/ABILITY, or is deflecting, WITHOUT offering any answer or claim. An evaluative ' +
  'judgment about the subject matter (calling a measure "unfair", "wrong", or "flawed") is a ' +
  'CLAIM, not confusion — classify it as attempt.\n' +
  '- aside = social, meta, or off-topic remarks (thanks, acknowledgements, chit-chat, questions ' +
  'about the tutor itself).\n' +
  'If the previous Ezra message offered to teach / walk through and the student affirms (e.g. ' +
  '"yes", "go on"), treat that as confusion (they want help, not an answer of their own).\n' +
  'When torn between attempt and anything else AND the message contains any substantive claim or ' +
  'content addressing the question, choose attempt.\n' +
  'Output ONLY the single label word: attempt, question, confusion, or aside.';

function parseIntent(text: string): Intent {
  const t = text.toLowerCase();
  for (const l of ['attempt', 'question', 'confusion', 'aside'] as const) if (t.includes(l)) return l;
  return 'attempt'; // default: fail toward the moat (marking) — never worse than today
}

async function call0_classify(message: string, question: string, lastEzra: string): Promise<Intent> {
  const prevLine = lastEzra ? `Ezra's previous message: ${lastEzra}\n\n` : '';
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      system: CLASSIFY_SYSTEM,
      messages: [
        { role: 'user', content: `${prevLine}Drill question: ${question}\n\nStudent message: ${message}\n\nLabel:` },
      ],
    });
    return parseIntent(extractText(res));
  } catch {
    return 'attempt'; // classifier failure → treat as an attempt (safe default, never bypasses the moat)
  }
}

const WARM_INSTRUCTIONS: Record<Exclude<Intent, 'attempt'>, string> = {
  question:
    'The student asked a question rather than attempting. Answer it directly and helpfully — teach ' +
    "the concept or clarify the process, using an example NOT drawn from this drill's specific " +
    'figures. Then bridge back with a short prompt inviting them to apply it to this question ' +
    "themselves. Do NOT give this drill's answer or its numbers. 2–4 sentences, warm and peer-to-peer.",
  confusion:
    'The student is stuck or overwhelmed, not attempting. Acknowledge it without condescension, ' +
    // Was: "(e.g. name the command verb and write a single sentence doing it)". Same residual as
    // the drill path's confusion leg — the example instructed the taxonomy at the student.
    'normalise it in a line, then give ONE small concrete next step (e.g. pick the single thing the ' +
    'requirement is asking for and write one sentence doing it). Then offer the alternative explicitly: tell them they can say ' +
    '"walk me through" and you will take them through the approach. Do NOT mark them and do NOT give ' +
    'the answer. 2–4 sentences, warm.',
  aside:
    'The student made a social or off-topic remark, not attempting. Reply briefly and human, in ' +
    'character, then gently re-anchor to the drill (invite them to take a swing when ready). ' +
    '1–2 sentences. No marking, no praise-padding.',
};

async function call_warm(
  intent: Exclude<Intent, 'attempt'>,
  message: string,
  question: string,
  context: string,
  /** Case paper, for persona routing only. Defaults to 'APM'. See caseSystemFor. */
  paper = 'APM',
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    system: caseSystemFor(paper),
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Drill question: ${question}\n\n` +
          `Student message: ${message}\n\n` +
          WARM_INSTRUCTIONS[intent],
      },
    ],
  });
  return extractText(res);
}

// ── CALL 4: Earned reveal (redesign item 3) ───────────────────────────────────
// ⚠️ THIS IS THE ONLY PLACE THE STORED model_answer IS SHOWN TO THE STUDENT. ⚠️
const REVEAL_SYSTEM =
  'You are Ezra, an APM tutor. The student has genuinely attempted this drill and worked ' +
  'through hints and a teach-through — they have EARNED the full model now. Show them how a ' +
  'top-band answer is built: first credit, specifically, what they already had right, then ' +
  'walk the moves they were missing, INCLUDING the figures and the conclusion (withholding is ' +
  'over — this is the earned reveal). Warm and peer-to-peer, a sharp tutor laying it out, not a ' +
  'marked script. End by pointing them to apply the key move on a FRESH question. No empty praise.';

async function call4_reveal(
  question: string,
  context: string,
  attempt: string,
  diagnosis: string,
  modelAnswer: string,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 700,
    system: REVEAL_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Their last attempt: ${attempt}\n\n` +
          `The gap they kept missing: ${diagnosis}\n\n` +
          `Verified model answer (you MAY reveal this — it is the earned reveal):\n${modelAnswer}\n\n` +
          'Build the worked walkthrough now, crediting what they had, then point them to a fresh application.',
      },
    ],
  });
  return extractText(res);
}

// ── Orchestrator: one teach turn ───────────────────────────────────────────────
// Reproduces §7 of app/api/acca/tutor/route.ts VERBATIM for a single item, so the
// case path runs the identical moat per requirement. Same env flags, same call order,
// same messageKind values. Cap accounting (§6/§8) is intentionally NOT here — that is
// the drill funnel's monetisation and is handled by each route, not the engine.
//
// `passed` surfaces the completeness-gate verdict (treatCorrect): a requirement is
// complete when call2 says correct AND the completeness gate does not demote it.
// `acceptedAnswer` is the student message that earned the pass (for final_answer).

export interface TeachTurnInput {
  question: string;
  context: string;         // shared scenario (intro + exhibits) for cases — NOT sealed
  modelAnswer: string;
  verbLevel: string;
  markScheme: string;
  /** Code-owned findings from the direction fence (lib/acca/tutor-discriminants.ts). Rendered
   *  FIRST in the diagnose prompt, and NOT inside markScheme — the mark-scheme block is framed
   *  "do not quote it", which is exactly wrong for a contradiction the student must be told. */
  groundedFacts?: string;
  /** THE LEVEL-AWARE CLOSING CONTRACT — `nextMoveContract(intellectual_level)` from
   *  lib/acca/teach-demand.ts. Optional, '' by default, so a caller that does not pass it gets
   *  the exact prompt it got before this field existed.
   *
   *  WHY IT IS HERE AT ALL. It was built on 2026-08-03 for the DRILL route and wired only there,
   *  and the two teaching surfaces then disagreed about the one thing the contract exists to fix.
   *  At level 3 the un-contracted legs close by handing back a task the size of the original
   *  ("rebuild capital employed and NOPAT and recalculate EVA") — measured on a real student's
   *  transcripts, who capitulated after ONE attempt on all three of his level-3 drills while
   *  writing his longest answers. The contract replaces that with a first concrete step built
   *  from work the student already has in front of them.
   *
   *  Cases are the surface with the LONGEST requirements and therefore the most to lose from a
   *  restated one; leaving them uncontracted meant the fix held on drills and lapsed on the exact
   *  path a student moves to next. Taxonomy-free by construction — the contract never names the
   *  level that selected it. */
  nextMove?: string;
  studentMessage: string;
  lastEzraMessage: string;
  missCount: number;
  lastDiagnosis: string | null;
  lastRealAttempt: string | null;
  resolved: boolean;
  /**
   * The case's paper, used for PERSONA ROUTING ONLY (2026-08-23, stage 5).
   *
   * Optional and defaulted to 'APM' inside `runTeachTurn`, so a caller that does not pass it
   * gets the exact prompt it got before this field existed.
   *
   * ⚠️ Until this shipped, `teach-engine.ts` contained the string `paper` ZERO times and every
   * case turn used a persona opening "You are Ezra, an APM tutor" — including all **20 published
   * AFM case requirements**.
   */
  paper?: string;
}

export interface TeachTurnResult {
  ezraResponse: string;
  newMissCount: number;
  newLastDiagnosis: string | null;
  newLastRealAttempt: string | null;
  newResolved: boolean;
  teachThroughDelivered: boolean;
  intent: string;
  messageKind: string;
  passed: boolean;                 // completeness gate cleared — requirement complete
  acceptedAnswer: string | null;   // student message when passed, for final_answer
}

export async function runTeachTurn(input: TeachTurnInput): Promise<TeachTurnResult> {
  const {
    question, context, modelAnswer, verbLevel, markScheme, groundedFacts = '', nextMove = '',
    studentMessage, lastEzraMessage, paper = 'APM',
    missCount, lastDiagnosis, lastRealAttempt, resolved,
  } = input;

  let ezraResponse:        string;
  let newMissCount       = missCount;
  let newLastDiagnosis   = lastDiagnosis;
  let newLastRealAttempt = lastRealAttempt;
  let teachThroughDelivered = false;
  let newResolved        = resolved;
  let intent: string     = 'attempt';
  let messageKind: string = 'hint';
  let passed             = false;
  let acceptedAnswer: string | null = null;

  const wantsReveal = REVEAL_ENABLED && isRevealRequest(studentMessage);
  const fastTeach   = INTENT_LAYER_ENABLED ? isTeachRequest(studentMessage) : isStopSignal(studentMessage);

  if (wantsReveal && missCount >= 2) {
    intent = 'reveal';
    messageKind = 'reveal';
    ezraResponse = await call4_reveal(question, context, lastRealAttempt ?? studentMessage, lastDiagnosis ?? '', modelAnswer);
    newResolved = true;
  } else if (wantsReveal) {
    intent = 'reveal_redirect';
    messageKind = 'reveal_locked';
    ezraResponse = EARN_REDIRECT;
  } else if (fastTeach) {
    intent = 'teach_request';
    messageKind = 'teaching';
    const contextAttempt = lastRealAttempt ?? studentMessage;
    const diagnosis      = lastDiagnosis ?? 'student requested answer without re-attempting';
    ezraResponse = await call3_teach(question, context, contextAttempt, diagnosis, verbLevel, REVEAL_ENABLED && missCount >= 2, groundedFacts, nextMove, paper);
    teachThroughDelivered = true;
  } else {
    const classified: Intent = INTENT_LAYER_ENABLED
      ? await call0_classify(studentMessage, question, lastEzraMessage)
      : 'attempt';
    intent = classified;

    if (classified !== 'attempt') {
      ezraResponse = await call_warm(classified, studentMessage, question, context, paper);
      messageKind = classified === 'question' ? 'answer'
                  : classified === 'confusion' ? 'coaching' : 'chat';
    } else {
      // ── THE MOAT — existing withholding pipeline, unchanged ──
      // DIVERGENCE #2: call2 now returns the parsed ENVELOPE alongside the label. `label` is what
      // every downstream consumer sees and is byte-equivalent to the old return value whenever the
      // envelope parses; when it does not, `safeLabel` recovers the label or yields '' rather than
      // letting a raw JSON blob reach `call3_hint` or the stored transcript.
      const { label: diagnosis, verdict: gapVerdict } = await call2_diagnose(
        question, context, studentMessage, modelAnswer, markScheme, groundedFacts);
      // Absent ⇒ false ⇒ shipped opening ⇒ today's behaviour. Never inferred from `derived`, which
      // is parsed but deliberately NOT wired on this surface — see call3_hint's parameter doc.
      const gapNothingCreditable = nothingCreditable(gapVerdict);

      let completenessGap: string | null = null;
      if (COMPLETENESS_GATE_ENABLED && isCorrectVerdict(diagnosis)) {
        completenessGap = await completenessCheck(question, context, modelAnswer, studentMessage, verbLevel);
      }
      const treatCorrect = isCorrectVerdict(diagnosis) && !completenessGap;

      if (treatCorrect) {
        ezraResponse       = await call3_confirm(question, context, studentMessage, verbLevel, paper);
        messageKind        = 'correct';
        newLastRealAttempt = studentMessage;
        passed             = true;             // completeness gate cleared → requirement complete
        acceptedAnswer     = studentMessage;
      } else {
        const gap        = completenessGap ?? diagnosis;
        newMissCount     = missCount + 1;
        newLastDiagnosis = gap;
        newLastRealAttempt = studentMessage;

        if (newMissCount === 1) {
          // ⚠️ THE `creditable` ARM IS SUPPRESSED WHEN THE COMPLETENESS GATE SUPPLIED THE GAP.
          // `completenessGap` means call2 said CORRECT and a separate check demoted it for a
          // missing component — so the envelope's `creditable` describes an answer the turn is no
          // longer about, and it was computed before the demotion. Leading with "nothing here
          // earns credit" on an answer just judged correct is the one failure this arm must never
          // produce. Falls back to the shipped opening, which is what ships today.
          ezraResponse = await call3_hint(question, context, studentMessage, gap, verbLevel, groundedFacts, nextMove, paper,
            completenessGap ? false : gapNothingCreditable);
          messageKind = 'hint';
        } else {
          ezraResponse = await call3_teach(question, context, studentMessage, gap, verbLevel, REVEAL_ENABLED && newMissCount >= 2, groundedFacts, nextMove, paper);
          teachThroughDelivered = true;
          messageKind = 'teaching';
        }
      }
    }
  }

  return {
    ezraResponse,
    newMissCount,
    newLastDiagnosis,
    newLastRealAttempt,
    newResolved,
    teachThroughDelivered,
    intent,
    messageKind,
    passed,
    acceptedAnswer,
  };
}
