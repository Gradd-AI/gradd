import { NextResponse } from 'next/server';
import { createCipheriv, createDecipheriv, randomBytes, createHash, randomUUID } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { recordAuthFailure, recordServerError } from '@/lib/acca/error-recorder';
import {
  systemFor,
  buildRevealWrapperUserPrompt,
  revealWrapperSystemFor,
  assembleAfmReveal,
  revealDecision,
  trimToLastSentence,
  stripOpenerDivider,
  REVEAL_FOOTER,
  buildBurnCta,
  containsDistressSignal,
  isIdentityProbe,
  buildIdentityResponse,
  isConfirmNumberProbe,
  CONFIRM_NUMBER_REFUSAL,
  type RevealReachedFrom,
} from '@/lib/acca/tutor-personas';
import { notifyGrant } from '@/lib/notify';
import { resolvePaper, servedPaper, SERVED_PAPERS, type AccaPaper } from '@/lib/acca/paper';
import { paperHref } from '@/lib/acca/paper-url';
import { hasPaperAccess } from '@/lib/acca/access';
// THE FREE TIER'S TWO MEANINGS, separated (2026-08-22). `teachThroughsUsed` counts COACHING
// DELIVERED and must never gate the ATTEMPT — see the module header and §6.
import { teachAccessFor, upgradeAfterDiagnosisLine, FREE_TEACH_THROUGHS } from '@/lib/acca/teach-access';
import {
  guardLabel, guardBlock, hintOpeningInstruction, gapEstablishesNothingCorrect,
  type GuardLabelVariant, type HintOpeningVariant, type GuardScopeVariant,
} from '@/lib/acca/hint-opening';
import { bareGuessGuardVetoed, computationDemandedButAbsent } from '@/lib/acca/bare-guess-veto';
import {
  parseGapVerdict, safeLabel, resolveNothingEstablished, nothingCreditable, GAP_VERDICT_FORMAT, type GapVerdict,
} from '@/lib/acca/gap-verdict';
import { withParseRetry } from '@/lib/acca/case-marking';
// THE STEER IS A FIELD, NOT A PHRASE (P-T3(i)). 'off' restores the pre-change prompt bytes and
// the substring-match path exactly, with no deploy.
const GAP_STRUCTURED = (process.env.TUTOR_GAP_STRUCTURED ?? 'on') !== 'off';

// ── MEASUREMENT SEAM (2026-08-22) ────────────────────────────────────────────
// Two independent prompt changes, each selectable, so the harness can measure (a) alone and
// (a)+(b) against the same pooled baseline rather than shipping both and inferring. Env-gated
// exactly like REVEAL_ENABLED / INTENT_LAYER_ENABLED / APM_INTERLEAVE already are on this route.
// ⚠️ DEFAULTS WERE `shipped` UNTIL THE MEASUREMENT DECIDED. Committing a default of "the change I
// expect to win" would ship it on the strength of the prediction, which is the thing P-DB8(a) and
// P-V1(d) both exist to stop.
//
// 📐 FLIPPED 2026-08-23 ON THE MEASURED RATE, n=40 miss-1 turns hand-read against the same
// pooled baseline (docs/redteam/armB-20260822-polarity.json; baseline 38/40 = 95% in
// docs/AFM_SURFACED.md). **CREDITED 95% → 50%.** This is a MITIGATION, not a fix — the residual
// is not the prompt's wording but the guard's FIRING RATE: the bare-guess guard is a model
// judgement made fresh each turn, and it fired on 57.5% of them. Where it fired, 17% credited;
// where it did not, 94% did. The wording change does everything it can do and the ceiling is
// upstream of it. The GUARD itself is the next build.
//
// Reversible by env with no deploy: TUTOR_GUARD_LABEL=shipped TUTOR_HINT_OPENING=shipped
// restores the pre-change route byte-for-byte, and the fixtures pin those strings byte-identical
// so the historical baseline keeps describing something that still exists.
const GUARD_LABEL_VARIANT  = (process.env.TUTOR_GUARD_LABEL  ?? 'unverified')   as GuardLabelVariant;
const HINT_OPENING_VARIANT = (process.env.TUTOR_HINT_OPENING ?? 'conditional') as HintOpeningVariant;
// 📐 FLIPPED 2026-08-23 ON THE MEASURED RATE, n=40 per arm, every reply hand-read
// (docs/redteam/arm{C,C2,D,D2}-*-20260823.json + the [GAPLABEL] captures beside them):
//
//   arm               n   canonical label ECHOED   CREDITED   NOT ADJUDICATED   CORRECTED
//   shipped scope    40   22 (55%)                 18 (45%)   20 (50%)          2 (5%)
//   rewritten scope  40   40 (100%)                 4 (10%)   36 (90%)          0
//
// Credited 45% → 10%, z = 3.51, p < 0.001. Echo 55% → 100%, p < 0.0001.
//
// 📐 WHAT MOVED: credited splits on whether the code-selected branch was ARMED (2 of 22 = 9%) or
// DISARMED (16 of 18 = 89%) — a direct measurement, and the production config re-measures at 10%.
//
// ⚠️ CORRECTED 2026-08-23, SAME DAY. An earlier version of this comment said "the guard's
// JUDGEMENT applied on 40 of 40 turns, only the ECHO varied, the rewrite's entire effect is
// making the branch reachable." **That was an over-reading of prose and the structured field
// refuted it.** Under the SHIPPED scope with `derived` asked for explicitly, the model returns
// derived=1 — there IS working to judge — on 18 of 20. The free-form labels ("states a conclusion
// without computing figures") were the model NAMING THE ERROR, which is exactly what this call
// asks of it; they were never a verdict that the guard had fired. The shipped predicate genuinely
// does not match a 72-word reasoned assertion, which is what P-T3(d) said from the start.
// **So the rewrite works by CHANGING THE PREDICATE to match the harm, not by fixing an echo.**
// See P-T3(g), rewritten.
//
// ⚠️ THE TRADE, WHICH IS NOT FREE: CORRECTED went 2 → 0. Those two corrections came from
// free-form labels that happened to carry a correctness finding ("NOPAT actually exceeds the
// capital charge"); the canonical label carries none. Correct by design under P-T3(c) — NOT
// ADJUDICATED is the right terminal state for an underived answer — and the pipeline still
// reaches correction at miss 2, at 80%. Stated, not netted out of the headline.
//
// 🔵 RESIDUAL THIS DOES NOT TOUCH: several NOT ADJUDICATED replies still PRESUPPOSE the student's
// sign — "a negative EVA™ by itself doesn't settle the board's question". Never affirmed, carried
// forward as given. A different, milder failure; no label change reaches it.
//
// Reversible by env with no deploy: TUTOR_GUARD_SCOPE=shipped restores the measured control arm.
const GUARD_SCOPE_VARIANT  = (process.env.TUTOR_GUARD_SCOPE  ?? 'unsubstantiated') as GuardScopeVariant;
import {
  isTeachRequest, isRevealRequest, isPlainAnswerRequest, revealOfferLine,
} from '@/lib/acca/phrase-match';
import {
  buildGroundingPack,
  renderChecklistAndFacts,
  renderConventionsAndMisconception,
  renderAuthoredHint,
  renderResolvableTopics,
  GROUNDING_INSTRUCTION_DIAGNOSE,
  GROUNDING_INSTRUCTION_COMPLETENESS,
  GROUNDING_INSTRUCTION_HINT,
  GROUNDING_INSTRUCTION_CONVENTION,
  GROUNDING_INSTRUCTION_OUTRO,
  type GroundingPack,
} from '@/lib/acca/tutor-grounding';
// The weakness ledger's drill half (2026-08-12). The DECISION is pure (weak-areas); the
// WRITE is shared with the sit path (weak-area-store) so there is one implementation of the
// partial-index open/close rather than two that can drift.
import { drillLedgerAction } from '@/lib/acca/weak-areas';
import { openWeakness, closeWeakness } from '@/lib/acca/weak-area-store';
import { cacheBlock, cachePrefix } from '@/lib/acca/prompt-cache';
import { auditRevealFigures } from '@/lib/acca/reveal-figure-audit';
import { describeDemand, nextMoveContract } from '@/lib/acca/teach-demand';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ClientSessionState {
  enc: string;  // AES-256-GCM: JSON { answer: string; counted: boolean }
  miss_count: number;
  last_diagnosis: string | null;
  last_real_attempt: string | null;
  // NOTE: teach_through_counted is NOT in this plaintext blob — it lives inside
  // enc so the client cannot manipulate it to skip the cap increment.
}

// The decrypted payload — every field is tamper-proof inside AES-256-GCM.
interface EncPayload {
  answer: string;
  counted: boolean; // true once the DB increment for this drill has been applied
  // STICKY FOR THE SESSION: the student has, at some point on this drill, plainly asked to be
  // told the answer ("just tell me"). Only the self-assessment opener reads it — see the
  // `selfAssess` gate. Optional because seals written before 2026-08-07 do not carry it; absent
  // parses as undefined → falsy → today's behaviour, so no migration and no seal break.
  //
  // It rides in the ENCRYPTED blob rather than the plaintext ClientSessionState purely for
  // consistency with `counted`. Nothing is gated on it, so tampering buys a student only the
  // suppression of a Socratic question — which is the thing they would be asking for anyway.
  plainAsked?: boolean;
}

// ── Encryption ────────────────────────────────────────────────────────────────

function getKey(): Buffer {
  const secret = process.env.TUTOR_SESSION_SECRET;
  if (!secret) throw new Error('TUTOR_SESSION_SECRET not configured');
  return createHash('sha256').update(secret).digest();
}

function sealPayload(answer: string, counted: boolean, plainAsked = false): string {
  const key  = getKey();
  const iv   = randomBytes(12);
  const body = JSON.stringify({ answer, counted, plainAsked } satisfies EncPayload);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc  = Buffer.concat([cipher.update(body, 'utf8'), cipher.final()]);
  const tag  = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

function openPayload(ciphertext: string): EncPayload {
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
    // Treat them as uncounted so follow-up turns work; cap state is re-read from DB.
    return { answer: plain, counted: false };
  }
}

// ── Stop-signal detection ─────────────────────────────────────────────────────

// Two intents trigger the teach-through, not one:
//  • capitulation ("I give up") — the original list
//  • ask-to-be-taught ("show me how a full-marks answer would…") — added because a
//    direct request for teaching is the CLEAREST teach signal, yet was previously
//    re-scored as a fresh attempt and answered with another hint.
// Phrases are kept MULTI-WORD and intent-specific on purpose: isStopSignal does a
// substring match over the whole student message, and the stop-signal path consumes
// a cap slot, so a phrase that could appear inside a genuine APM answer (bare
// 'stuck', 'show me', 'explain how') would wrongly burn a teach-through credit.
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
// With the intent layer ON, only EXPLICIT teach-requests fast-path to the
// teach-through; give-up / "I'm stuck" phrasing falls through to the classifier,
// which routes it to `confusion` → a warm reassure-and-offer (free) rather than an
// immediate, cap-charging teach-through. With the flag OFF, the legacy isStopSignal
// (full list) is used instead, so flag-off is an exact behavioural rollback.
//
// TEACH_REQUEST_PHRASES / REVEAL_PHRASES / isTeachRequest / isRevealRequest now live in
// lib/acca/phrase-match.ts (X1 field-bug fix, 2026-07-23 — see that module's header for the
// full incident: a typo'd/article-dropped reveal request fell through the old exact-substring
// matcher and was mis-treated as a wrong attempt). Imported above.

// ── Earned reveal (redesign item 3) ───────────────────────────────────────────
// Behind APM_EARNED_REVEAL. The reveal is the ONE place the stored model_answer is shown
// to the student — gated by an explicit REVEAL_PHRASES match AND genuine struggle
// (miss_count >= 2, persisted). REVEAL_PHRASES MUST stay disjoint from TEACH_REQUEST_PHRASES
// (unit-tested: scripts/test-phrase-match.ts, 0 match under the fuzzy matcher too) — otherwise
// "show me how" could dump the answer. All reveal phrases are imperative-anchored so they
// cannot appear inside a teach-style message ("walk me through the model answer" → teach).
const REVEAL_ENABLED = process.env.APM_EARNED_REVEAL === '1';

// Reveal-velocity alert threshold: alert Grant when an account is served MORE than this many
// reveals in a rolling 24h (fires once, on the (N+1)th). Detection beats prevention — a human
// harvester at 3-free-per-account velocity is slow and visible.
const REVEAL_VELOCITY_N = 5;

// Correct-verdict completeness gate: when call2 says "correct", verify every required
// component (read from the model answer) was actually attempted before confirming. Runs
// ONLY on the correct branch; flag off = today's behaviour verbatim.
const COMPLETENESS_GATE_ENABLED = process.env.APM_COMPLETENESS_GATE === '1';

// Static earn-it refusal for a reveal request below the struggle threshold. Deterministic
// on purpose — zero-cost, zero-latency, cannot drift or leak; its only job is "not yet,
// try first". model_answer is never in scope on this path.
const EARN_REDIRECT =
  "Give it a genuine go first — even a rough one. Take a real swing at it and I'll show you " +
  'exactly how a full-marks answer is built, step by step.';

// ── Correct-answer detection ───────────────────────────────────────────────────

// call2_diagnose emits the fixed sentinel "answer correct — convention differs
// from model only" when the student's answer is right (possibly in a different but
// equivalent convention). The word-boundary guard is deliberate: bare 'answer
// correct' also matches 'answer correctly', which could appear in a WRONG-answer gap
// label ("computes the answer correctly but omits evaluation") — telling a wrong
// answer it's right is the dangerous failure, so we anchor on the sentinel phrase
// only, never bare /correct/. A miss here is safe: it falls through to the normal
// hint/teach path (today's behaviour).
function isCorrectVerdict(diagnosis: string): boolean {
  return /\banswer correct\b/i.test(diagnosis.trim());
}

// ── Ezra persona ──────────────────────────────────────────────────────────────
// Paper-scoped personas + the AFM earned-reveal assembly live in
// lib/acca/tutor-personas.ts (extracted for isolated fixtures). systemFor(paper)
// selects the APM or AFM conversational register for call3_*/call_warm; the reveal
// helpers are used by call4_reveal below.

// ── Anthropic client ──────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface TextBlock { type: 'text'; text: string }
interface AnthropicMessage { content: Array<{ type: string } | TextBlock>; stop_reason?: string | null }

function extractText(res: unknown): string {
  const msg = res as AnthropicMessage;
  const block = msg.content.find((b): b is TextBlock => b.type === 'text');
  if (!block) throw new Error('No text block in Anthropic response');
  return block.text;
}

// Anti-truncation guard for STUDENT-FACING prose legs: if the leg hit its token cap, trim to
// the last complete sentence so a mid-sentence cutoff never reaches the student. (Internal
// legs that emit a parsed word/structured list — call0_classify, completenessCheck — use raw
// extractText; they must not be sentence-trimmed.)
function finishClean(res: unknown): string {
  const text = extractText(res);
  return (res as AnthropicMessage).stop_reason === 'max_tokens' ? trimToLastSentence(text) : text;
}

// Appended to every capped student-facing leg's prompt: nudges natural completion so the cap
// is rarely hit at all (the finishClean guard is the backstop for when it still is).
const WRAP_UP =
  ' Finish on a complete sentence; if you are near the length limit, wrap up the current point cleanly rather than starting a new one.';

// ── CALL 1: Generate model answer (fallback only) ─────────────────────────────

async function call1_generate(question: string, context: string): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  // No per-student variable content at all (this leg only ever sees question/context) — the
  // whole user turn is stable per-drill, so it is cached as ONE block, same as the system prompt.
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1500,
    system: cacheBlock(
      'You are an experienced ACCA APM marker. Write a complete model answer at the level ' +
      'a top-band APM candidate would produce — applied to the specific scenario, ' +
      'with professional judgement, not just model recitation. ' +
      'SIGN CONVENTION: Express all variances as standard − actual. ' +
      'Label the result A (adverse) when actual exceeds standard, F (favourable) when actual is below standard. ' +
      'State the formula direction in your workings and ensure the A/F label is consistent with the arithmetic sign.',
    ),
    messages: [
      {
        role: 'user',
        content: cacheBlock(`${contextLine}Question: ${question}\n\nWrite the full model answer.`),
      },
    ],
  });
  return extractText(res);
}

// Presents the student's most recent FULL attempt (if any, and distinct from the current
// message) alongside their latest message. FIX (2026-07-23, investigation confirmed live):
// the standard withholding-pipeline turn (call2_diagnose + call3_teach's second-miss branch)
// previously read ONLY `student_message` — no prior-attempt context at all — unlike the
// reveal/burn/fast-teach paths (:1132/:1141/:1148/:1159 as of this fix), which already fell
// back to `lastRealAttempt`. A short, natural follow-up ("so which one should I recommend?")
// was diagnosed and taught as if the student had submitted NOTHING, because from the model's
// point of view they genuinely had submitted nothing else. Collapses to the plain single-block
// form when there is nothing new to show (turn 1, or an unchanged re-send) — no duplicate
// block, no empty label. This block is always per-turn VARIABLE — callers must place it in the
// UNCACHED remainder of a `cachePrefix` split, never inside the cached stable prefix.
function buildStudentAnswerBlock(attempt: string, priorAttempt: string | null): string {
  if (!priorAttempt || priorAttempt === attempt) {
    return `Student answer: ${attempt}\n\n`;
  }
  return (
    `Student's most recent full attempt: ${priorAttempt}\n\n` +
    `Student's latest message: ${attempt}\n\n`
  );
}

// ── CALL 2: Diagnose → content-neutral gap label ──────────────────────────────

async function call2_diagnose(
  question: string,
  context: string,
  attempt: string,
  priorAttempt: string | null,
  modelAnswer: string,
  markScheme: string,
  grounding: GroundingPack,
  /** `acca_drills.calculation_required` for THIS drill. False for anything discursive, and false
   *  when unknown — the arm that changes nothing. See computationDemandedButAbsent. */
  calculationRequired: boolean,
): Promise<{ label: string; verdict: GapVerdict | null; codeOwnsUnderived: boolean }> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const msLine = markScheme
    ? `Authored mark scheme (use to identify WHICH criterion/level the student missed; do NOT quote it or state the answer):\n${markScheme}\n\n`
    : '';
  // PERSONA-HARDENING (2026-07-21): fullTrust tier (checklist + facts) — SAME trust tier as
  // modelAnswer above (diagnose already sees the answer; its output stays a content-neutral label).
  // Fixes AFM_SURFACED findings 1/5: a narrative claim that already matches a rubric point/fact is
  // now checkable against real data instead of the model inferring equivalence from scratch — the
  // EQUIVALENCE CHECK below is deliberately widened from "numeric convention differs" to "the claim
  // already matches the grounding data", so it covers narrative claims too, not just sign/table
  // conventions. Empty when no schema (mode:'none') — behaviourally identical to before this change.
  const groundingText = renderChecklistAndFacts(grounding);
  const groundingLine = groundingText ? `${GROUNDING_INSTRUCTION_DIAGNOSE}\n\n${groundingText}` : '';
  // Cache split: the student-answer block (buildStudentAnswerBlock, per-turn variable by
  // construction) sits BEFORE the per-drill mark scheme/grounding/model-answer blocks in this
  // call's byte order (never reordered to chase cacheability — see lib/acca/prompt-cache.ts
  // header), so only the leading context+question segment forms a clean stable prefix; the
  // larger stable chunk that trails the attempt is not independently cacheable without
  // reordering. Flagged, not restructured (PROMPT CACHING task, step 3).
  const stablePrefix = `${contextLine}Question: ${question}\n\n`;
  // ── THE ARITHMETIC VETO (2026-08-23) ────────────────────────────────────────
  // STRUCTURAL, NOT INSTRUCTED. When code can see the student showed arithmetic, the bare-guess
  // guard is not described to the model AT ALL — its absence is architected rather than fenced
  // with a "do not apply it here", which is the house rule (TEACHING_ARCHITECTURE.md, P-T2) and
  // the thing that stops a prohibition priming the behaviour it forbids.
  //
  // Only this ONE half is code-decided. "Arithmetic present → not a bare guess" is certain;
  // "no arithmetic → IS a bare guess" is not, and is left with the model. See the module header
  // for the 13-of-14 measurement that killed a "contains a figure" trigger arm.
  const guardVetoed = bareGuessGuardVetoed(attempt);
  const bareGuessGuardBlock = guardVetoed
    ? ''
    : guardBlock(GUARD_SCOPE_VARIANT, GUARD_LABEL_VARIANT);
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    // ⚠️ 40 FITS A BARE 12–15 WORD LABEL AND NOT THE JSON WRAPPER AROUND ONE. A truncated body
    // does not parse, and a parse failure costs FOUR calls through withParseRetry — so an
    // under-set ceiling here is a 4× bill, not a degraded label. 200 leaves clear headroom; the
    // `off` variant keeps the original 40 so its bytes and its cost are unchanged.
    max_tokens: GAP_STRUCTURED ? 200 : 40,
    system: cacheBlock(
      'You are a precision gap-labeller. Output ONE short label — hard limit 12–15 words, count them — ' +
      "that names what the student did wrong, using the student's error as the referent. " +
      'EQUIVALENCE CHECK — do this before naming any error: ' +
      'The model answer and student answer may use different but equivalent sign conventions ' +
      '(standard−actual vs actual−standard), A/F labelling, table layouts, or arithmetic orderings — ' +
      'AND (when a GROUNDING block is supplied below) a narrative claim may use different WORDING than ' +
      'a checklist point or fact while still being substantively correct. ' +
      "Check whether the student's claim (numerical OR narrative) is substantively equivalent to the " +
      "model's / the grounding data's, before concluding it is wrong. " +
      'Only name an error if the answer is genuinely WRONG — not merely presented in a different convention or wording. ' +
      'A correct answer in a different format or phrasing is NOT an error and must NOT be flagged. ' +
      "If the student's answer is correct, output: \"answer correct — convention differs from model only\" " +
      // Built above. EMPTY when the arithmetic veto fires, so on those turns the guard is not
      // described to the model at all and cannot be applied — the prompt reads as though it never
      // existed. One definition, one place: never re-inline this block.
      bareGuessGuardBlock +
      'ABSOLUTE RULES: ' +
      '(1) NEVER state the correct answer or any corrected fact, even implicitly. ' +
      '(2) Name the faulty mental model or wrong operation the student applied. ' +
      '(3) Output ONLY the label — no prose, no prefix, no explanation. ' +
      'BAD (forbidden): any phrase that states the correct answer.' +
      // THE STEER MOVES OFF THE PROSE (P-T3(i)). Appended, never interleaved with the rules above,
      // so the `off` variant is the pre-change bytes exactly.
      (GAP_STRUCTURED ? ' ' + GAP_VERDICT_FORMAT : ''),
    ),
    messages: [
      {
        role: 'user',
        content: cachePrefix(
          stablePrefix,
          stablePrefix +
          buildStudentAnswerBlock(attempt, priorAttempt) +
          msLine +
          groundingLine +
          `Model answer (reference only — do NOT restate or correct in output):\n${modelAnswer}\n\n` +
          (GAP_STRUCTURED
            ? 'Return the JSON object only. Name the error pattern in "label". Do not state what is correct.'
            : 'Output the gap label only. Name the error pattern. Do not state what is correct.'),
        ),
      },
    ],
  });
  const raw = extractText(res);
  // ── CODE OWNS `derived` WHERE IT CAN (2026-08-23) ────────────────────────────
  // Measured: asked to judge `derived`, the model scored an UNDERIVED assertion as derived=1 on
  // 9 of 10 turns when the answer merely NAMED method components ("one-year tax lag",
  // "reducing-balance allowances") — the field tracked the answer's method VOCABULARY, not
  // whether anything was derived (P-T3(j)). Stripping those four phrases flipped it 9/10 → 0/10.
  // On a drill that DEMANDS a computation, absence of arithmetic is a fact code can read, so the
  // model is not asked. Its LABEL is still used — prose is what it is good at.
  const codeOwnsUnderived = computationDemandedButAbsent(calculationRequired, attempt);
  // STRUCTURED FIRST, PROSE SECOND. A parsed verdict makes the downstream branch a field read;
  // a parse failure falls back to the substring match that is in production today, whose rate is
  // measured — so this can be no worse than the shipped arm whatever the model returns.
  const verdict = GAP_STRUCTURED ? parseGapVerdict(raw) : null;
  if (GAP_STRUCTURED && !verdict) throw new Error('parse');   // withParseRetry retries this
  const label = GAP_STRUCTURED ? safeLabel(verdict, raw) : raw;
  // ── FIRING IS OTHERWISE UNOBSERVABLE, WHICH IS WHY 57.5% HAD TO BE HAND-READ ──
  // The gap label never reaches the client and is not persisted, so "did the guard fire on this
  // turn?" could only be INFERRED from the shape of the hint two calls later. A rate inferred from
  // a downstream leg's wording is exactly the kind of measurement that inverted in August.
  //
  // ⚠️ SERVER LOG ONLY, NEVER A RESPONSE FIELD. The label is tier-`fullTrust` content adjacent to
  // the model answer; putting it in the JSON would ship a diagnosis to the browser the moment the
  // flag was ever set in the wrong environment. A log line cannot leak to a student.
  // Off unless TUTOR_DEBUG_GAP=1, which is never set in production.
  if (process.env.TUTOR_DEBUG_GAP === '1') {
    console.log('[GAPLABEL]', JSON.stringify({
      vetoed: guardVetoed,
      scope: GUARD_SCOPE_VARIANT,
      structured: GAP_STRUCTURED,
      parsed: verdict !== null,
      // What the MODEL said, kept raw even when code overrides it — otherwise the override hides
      // the very disagreement the measurement is looking for.
      derived: verdict ? verdict.derived : null,
      // MEASUREMENT ONLY — recorded, wired to nothing. See GapVerdict.creditable.
      creditable: verdict && verdict.creditable !== undefined ? verdict.creditable : null,
      // ⚠️ TWO DIFFERENT FACTS, AND THE FIRST VERSION LOGGED ONLY THE USELESS ONE. `hintOnRow` is
      // whether the drill HAS an authored hint (true for 154/154, so it never varies); `hintArm`
      // is whether that hint was actually INJECTED into the hint leg. A capture that records only
      // the former cannot tell a grounding-ON arm from a grounding-OFF one — the same defect the
      // scope variant had before its arm was printed into the run header.
      hintOnRow: grounding.authoredHint !== null,
      hintArm: process.env.TUTOR_HINT_GROUNDING === 'on',
      calcRequired: calculationRequired,
      codeOwnsUnderived,
      // The resolved answer and WHERE it came from: code > field > phrase.
      resolved: resolveNothingEstablished(codeOwnsUnderived, verdict, label),
      // Kept alongside `derived` on purpose: it is the ECHO rate, and the whole point of the
      // structured field is that these two can now be compared instead of conflated.
      echoed: gapEstablishesNothingCorrect(label),
      label,
    }));
  }
  return { label, verdict, codeOwnsUnderived };
}

// ── CALL 3: Hint (first miss) ─────────────────────────────────────────────────

async function call3_hint(
  question: string,
  context: string,
  attempt: string,
  diagnosis: string,
  verbLevel: string,
  nextMove: string,
  paper: string,
  grounding: GroundingPack,
  /** Already resolved by the caller as CODE > FIELD > PHRASE. This leg is TOLD whether anything
   *  was established; it never reads a label to work it out. */
  gapNothingEstablished: boolean,
  /** `creditable === 0` — nothing in the answer earns credit against this requirement. An
   *  INDEPENDENT judgement, not derived from the flag above; see lib/acca/gap-verdict.ts. */
  gapNothingCreditable: boolean,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel
    ? `What this requirement demands (calibrate against this; do not quote it back as a label):\n${verbLevel}\n\n`
    : '';
  // PERSONA-HARDENING (2026-07-21): fixes finding 4 (HINT-BASE-WOBBLE — a hint that hedges between
  // two possible conventions instead of declaring the drill's own stated one) and constraint (g)
  // (the hint should lead with the drill's DESIGNED misconception). Tier B — method/failure-pattern
  // only, never the drill's specific figure or point. Empty when no schema → identical to before.
  // THE AUTHORED HINT (2026-08-23) — MISS 1, HINT LEG ONLY, method-only tier. Its own renderer,
  // so "never call2" is a property of the call graph rather than a rule someone has to remember.
  // `misconceptionLead` reaches 14 of 91 APM drills; this reaches 154 of 154, which is the point:
  // the 73 discursive APM drills have no other source of drill-specific correction.
  //
  // ⛔ DEFAULTED **OFF**, AND THE MEASUREMENT IS WHY. Built as ruled, then measured on the two
  // discursive cells — and it made the fabrication WORSE, not better: on D2a, replies crediting
  // the student with scenario content they never mentioned went from **8/20 to ~19/20**. The
  // mechanism is now clear. D2a's authored hint hands over three vivid specifics ("its 14-person
  // team with no data science capability, its 11-day data lag, and the THB 280 million
  // commitment"); the praise-first opening must name the ONE thing the student got right, finds
  // nothing in an answer that says "I do not see any material risks worth setting out", and
  // reaches for the nearest available material — which grounding just made richer and more
  // concrete. C1c did NOT get worse, because that answer already contained a present-if-
  // off-requirement point to latch onto, so the leg never had to reach.
  //
  // ⚠️ SO GROUNDING IS NOT NEUTRAL WHERE THE OPENING IS UNSATISFIABLE — it is fuel. The fix is to
  // disarm the praise-opening first (wire `creditable`, which agreed with a hand-read 60/60 and
  // flags exactly these turns), THEN re-measure this. Shipping it before that ships a measured
  // regression. Reversible by env with no deploy in either direction.
  const HINT_GROUNDING = process.env.TUTOR_HINT_GROUNDING === 'on';
  const groundingText = renderConventionsAndMisconception(grounding)
    + (HINT_GROUNDING ? renderAuthoredHint(grounding) : '');
  const groundingLine = groundingText ? `${GROUNDING_INSTRUCTION_HINT}\n\n${groundingText}` : '';
  // The level-aware closing contract (lib/acca/teach-demand.ts). Empty for an unknown level →
  // byte-identical to the pre-change prompt, so pre-metadata drills are unaffected.
  const nextMoveLine = nextMove ? `${nextMove}\n\n` : '';
  // Same partial-cache shape as call2_diagnose: attempt/diagnosis sit before the trailing stable
  // vlLine/groundingLine/instruction block, so only the leading context+question forms a clean
  // stable prefix without reordering (see lib/acca/prompt-cache.ts header).
  const stablePrefix = `${contextLine}Question: ${question}\n\n`;
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: cacheBlock(systemFor(paper)),
    messages: [
      {
        role: 'user',
        content: cachePrefix(
          stablePrefix,
          stablePrefix +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          vlLine +
          groundingLine +
          nextMoveLine +
          // P-T2 (2026-08-22): the opening is now CONDITIONAL on whether the gap label established
          // anything correct. Code-selected, not model-judged — `gapEstablishesNothingCorrect`
          // matches the guard's own sentinel, so this leg is TOLD which opening to use rather than
          // asked to decide. On the ordinary branch the string is byte-identical to before.
          // THE VETO APPLIES HERE TOO, and this arm is not redundant with the prompt-side one.
          // Removing the guard's description makes the label very unlikely, not impossible — the
          // model could still emit that wording of its own accord, and then a student who showed
          // arithmetic would be told to put their reasoning on the page. Code has the certain
          // answer, so code decides: arithmetic present → the ordinary opening, whatever came
          // back. The fallback is the shipped string, so a veto here can only ever restore the
          // pre-2026-08-22 behaviour, never invent a third one.
          hintOpeningInstruction(
            HINT_OPENING_VARIANT,
            // Resolved by the caller (CODE > FIELD > PHRASE). The veto is still ANDed on: it and
            // the code arm are mutually exclusive by construction (arithmetic present vs absent),
            // so this is defensive rather than load-bearing — and cheap enough to keep as a
            // second lock on the one direction that costs the tutor its credibility.
            gapNothingEstablished && !bareGuessGuardVetoed(attempt),
            gapNothingCreditable,
          ) +
          'Punchy and conversational, 2 sentences, like a tutor in their corner, not a ' +
          // Was: "Work in the command verb and ACCA intellectual level from the authored values
          // above (do not infer them when given)." The 2026-08-01 fence removed those values from
          // the prompt but left this sentence, so the only way to satisfy it was to INFER a level
          // and state it — an unfounded assertion, which is worse than the disclosed value the
          // fence removed. The demand itself is already above in vlLine; nothing needs naming.
          "structured breakdown. Calibrate against the demand above. Don't state the answer." +
          WRAP_UP,
        ),
      },
    ],
  });
  return finishClean(res);
}

// ── CALL 3: Teach-through (second miss or stop-signal) ────────────────────────

async function call3_teach(
  question: string,
  context: string,
  attempt: string,
  priorAttempt: string | null,
  diagnosis: string,
  verbLevel: string,
  nextMove: string,
  selfAssess: boolean,
  paper: string,
  distressed = false,
  grounding: GroundingPack = { mode: 'none', checklist: [], facts: [], conventions: [], misconceptionLead: null, authoredHint: null, resolvableTopics: [], discriminants: [], contradictions: [] },
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel
    ? `What this requirement demands (diagnose against this; do not quote it back as a label):\n${verbLevel}\n\n`
    : '';
  // PERSONA-HARDENING (2026-07-21): conventions only (Tier B) — a second-miss teach-through can
  // ALSO be the site of a convention-softening moment ("either form works"); misconceptionLead is
  // deliberately NOT repeated here (call3_hint already led with it on miss #1).
  const conventionsLine = grounding.conventions.length
    ? `${GROUNDING_INSTRUCTION_CONVENTION}\n\nCONVENTIONS (required methods for this drill):\n${grounding.conventions.map((c) => `- ${c}`).join('\n')}\n\n`
    : '';
  // ── THE REVEAL OFFER IS NO LONGER INSTRUCTED HERE ───────────────────────────
  // It used to be an instruction appended to this prompt, telling the model to mention the
  // unlock phrase. It is now appended deterministically by the CALLER after the model returns —
  // see `revealOfferLine` in lib/acca/phrase-match.ts for why (it was competing with WRAP_UP
  // under a 600-token cap and is the exact text `finishClean` trims first).
  //
  // The level-aware closing contract (lib/acca/teach-demand.ts). This is what stops a level-3
  // leg handing the student a second task the size of the first. Empty for an unknown level →
  // byte-identical to the pre-change prompt.
  const nextMoveLine = nextMove ? `${nextMove}\n\n` : '';
  // ── SELF-ASSESSMENT BEFORE THE DIAGNOSIS (P5c, TEACHING_PRINCIPLES.md:77) ────
  // Required behaviour: "Mia prompts the student to self-assess ('where do you think this answer
  // is weak?') before revealing the mark — building metacognition." It had never been built on
  // ANY ACCA path, for either paper.
  //
  // SCOPED, not blanket. Only on a SECOND or later attempt: on a first attempt it delays the
  // diagnosis the student came for, and on a distressed turn it is a question asked of someone
  // who has just said they are stuck (the dignity rule outranks it).
  //
  // CLAIM CEILING, stated because the rubric's wording invites a stronger reading: this is a
  // SINGLE-TURN approximation. A true self-assessment beat asks, waits for the answer, and
  // diagnoses against it. This route answers in one turn, so the clause asks and then diagnoses
  // in the same message. It builds the habit of locating your own gap; it does not gate the
  // diagnosis behind the student's reply. Doing that properly needs a turn boundary this loop
  // does not have — recorded rather than quietly claimed as done.
  // RENDERING IS PART OF THE MEANING HERE, so the instruction now constrains it. Sighted
  // 2026-08-07: the model obeyed "one short clause" as to LENGTH and then set it as its own
  // paragraph followed by a `---` horizontal rule, with the diagnosis after the break. A question
  // alone above a divider reads as "answer this, I'll wait" — which is exactly what the claim
  // ceiling below says this beat is NOT. The words were compliant; the layout inverted them.
  const selfAssessLine = selfAssess
    ? 'SELF-ASSESSMENT FIRST: open with ONE short clause asking which part of their own answer ' +
      'they think is weakest ("before I say — which bit of that would you defend least?"), then ' +
      'go straight on and name the gap yourself in the same message. One clause, not a paragraph, ' +
      'and never instead of the diagnosis. It must sit INSIDE the opening paragraph, sharing it ' +
      'with the start of your diagnosis — do NOT put it on a line of its own, do NOT follow it ' +
      'with a horizontal rule, divider or "---", and do NOT leave a blank line after it. It is an ' +
      'aside you talk straight through, not a question you pause on.\n\n'
    : '';
  // FIX B tone (red-team adjudication 2026-07-16): suppressing the CTA alone left probe E2 with a
  // COLD reply ("I don't see a student answer"). On distress, lead with warmth and steady them —
  // never a cold "submit your working first" to someone who just said they're giving up.
  const distressLine = distressed
    ? 'IMPORTANT — the student has just expressed panic, desperation, or giving up. Before anything ' +
      'else, acknowledge that directly and warmly in one sentence and steady them (this is doable; the ' +
      'method is standard and they already hold every input they need). Do NOT tell them you cannot ' +
      'see their work, and do NOT ask them to submit an attempt in a cold way — meet them where they ' +
      'are and give the ONE smallest concrete next step. No upsell, no reveal offer, no wall. '
    : '';
  // Same partial-cache shape as call2_diagnose/call3_hint — see stablePrefix comment there.
  const stablePrefix = `${contextLine}Question: ${question}\n\n`;
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600, // headroom for a complete teach; WRAP_UP + finishClean keep it from sprawling or truncating
    system: cacheBlock(systemFor(paper)),
    messages: [
      {
        role: 'user',
        content: cachePrefix(
          stablePrefix,
          stablePrefix +
          buildStudentAnswerBlock(attempt, priorAttempt) +
          `Gap diagnosis: ${diagnosis}\n\n` +
          vlLine +
          conventionsLine +
          nextMoveLine +
          selfAssessLine +
          distressLine +
          // THE CREDIT DEMAND IS DELETED (2026-09-06, Grant-ruled). Was: "...Still don't lecture:
          // lead with the specific thing that IS working, then name the ONE gap...". This is the
          // DRILL route's byte-identical twin of the case engine's teach demand; deleting one and
          // not the other would leave the two teaching surfaces disagreeing about the one thing
          // the deletion is for. Removal only.
          "Second miss or stop-signal — they haven't cracked it yet. Still don't lecture: " +
          'name the ONE gap that matters most (one, sharply ' +
          '— not a list of four) and the single next move that unblocks it. Conversational prose, 3 ' +
          'sentences, 4 at the most — no numbered points or structured breakdown, a sharp tutor ' +
          // Was: "Use the authored command verb and ACCA intellectual level above (do not infer
          // when given) to pin the gap accurately." Same stale instruction as call3_hint — the
          // values it points at were removed from the prompt on 2026-08-01 and only inference
          // could satisfy it. The demand is in vlLine; the closing shape is in nextMoveLine.
          'talking not a marked script. Pin the gap against the demand above. ' +
          'Do not complete the answer or give the figures.' +
          WRAP_UP,
        ),
      },
    ],
  });
  // The structural half of the rendering fix: applied ONLY when the self-assessment clause was
  // actually asked for, so no other leg — least of all the reveal, which is a document and uses
  // `---` legitimately — can be touched by it. See stripOpenerDivider in tutor-personas.ts.
  const out = finishClean(res);
  return selfAssess ? stripOpenerDivider(out) : out;
}

// ── CALL 3: Confirm (correct answer) ──────────────────────────────────────────
// Fired only when call2_diagnose returns the correct-sentinel. Acknowledges a right
// answer instead of mis-delivering a gap-hint. NOT a teach-through: the caller leaves
// teachThroughDelivered = false, so getting it right never consumes a cap slot.

async function call3_confirm(
  question: string,
  context: string,
  attempt: string,
  verbLevel: string,
  paper: string,
  grounding: GroundingPack,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel
    ? `What this requirement demands (judge what the answer hit against this; do not quote it back as a label):\n${verbLevel}\n\n`
    : '';
  // The post-success reveal nudge moved OUT of this prompt and is appended deterministically by
  // the caller — same reasoning as call3_teach. A student who has just solved the drill has
  // unambiguously earned the comparison, so whether they are told about it must not depend on
  // whether the model remembered to mention it inside a 650-token budget.
  // PERSONA-HARDENING (2026-07-21): fixes finding 6 (CONVENTION-SOFTENING — a close that validated an
  // alternative WRONG/unscaled form as "equally valid" alongside the correct one). The old prompt's
  // own "say it's equally valid" clause is REMOVED below — it was written for genuine format/layout
  // differences (sign convention, A/F labelling) but a model reading it broadly could extend that
  // permission to a WRONG figure the student mentions in passing. The conventions block, when
  // present, gives an explicit list of what counts as the ONE required method so "equally valid" is
  // never applied to something that fails it.
  const conventionsLine = grounding.conventions.length
    ? `${GROUNDING_INSTRUCTION_CONVENTION}\n\nCONVENTIONS (required methods for this drill — if the student mentions an alternative form, check it against these before calling anything equally valid):\n${grounding.conventions.map((c) => `- ${c}`).join('\n')}\n\n`
    : '';
  // Same partial-cache shape as call2_diagnose/call3_hint/call3_teach — see stablePrefix
  // comment on call2_diagnose.
  const stablePrefix = `${contextLine}Question: ${question}\n\n`;
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 650,
    system: cacheBlock(systemFor(paper)),
    messages: [
      {
        role: 'user',
        content: cachePrefix(
          stablePrefix,
          stablePrefix +
          `Student answer: ${attempt}\n\n` +
          vlLine +
          conventionsLine +
          'The answer is CORRECT — it may use a different but equivalent PRESENTATION convention ' +
          '(sign convention, A/F labelling, layout) than a model answer would; those genuinely ARE ' +
          'equally valid. Tell them they nailed it, and mean it: 2–3 sentences, warm and peer-to-peer, ' +
          'leading with the specific thing they did well (the real move, not empty praise). ' +
          // Was: "Name the command verb and ACCA intellectual level the answer hit (from the
          // authored values above — do not infer when given)". The strongest of the six residual
          // sites — an explicit instruction to NAME a taxonomy the 2026-08-01 fence had already
          // removed from the prompt, so only inference could satisfy it. Replaced with what it
          // was actually for: saying which part of the demand the answer satisfied.
          'Say briefly which part of what the requirement demanded the answer actually hit, and why ' +
          'it holds / what puts it in the top band. If ' +
          'their PRESENTATION differs from the usual model (layout/labelling only), say that is ' +
          'equally valid — but if they also mention an ALTERNATIVE FIGURE or METHOD (not just ' +
          'presentation), check it against the CONVENTIONS above first and correct it plainly if it ' +
          'fails the required method; never call a wrong or unscaled form "equally valid" to protect ' +
          'their mood. Do NOT restate, re-derive, or quote back their figures or workings — they ' +
          "already wrote them; refer to what they did in words, not numbers. Don't mark it as if it fell short." +
          WRAP_UP,
        ),
      },
    ],
  });
  return finishClean(res);
}

// ── CALL 2b: Completeness gate (behind APM_COMPLETENESS_GATE) ──────────────────
// Runs ONLY after call2_diagnose returns the correct-sentinel. call2 verifies the NUMBERS
// (and protects convention/format differences); this verifies COMPLETENESS — that every
// required component the model answer demonstrates (calculation, evaluation, sceptical
// challenge, limitations commentary — wording varies) was actually ATTEMPTED. LLM judgment,
// NOT a parse: model-answer bold/headers are overloaded (mark both headers and result values)
// and header wording varies. Narrow: "absent" = NO attempt, never "shallower than the model".
// Per-component completeness audit. The model does NOT make a holistic complete/incomplete call
// (Haiku snap-judged long calc answers "complete" regardless of wording — verified 30/06 f165bcd).
// Instead it LISTS the model answer's required components and marks each PRESENT/ABSENT; CODE decides:
// any ABSENT → gap label naming it, all PRESENT (or unparseable) → complete. Self-scoping from
// model_answer, never marks_guide. Numbers/convention already handled by call2 — never re-judged here.
// Returns the missing-component gap label, or null when complete (→ stays Correct).
async function completenessCheck(
  question: string,
  context: string,
  modelAnswer: string,
  attempt: string,
  verbLevel: string,
  grounding: GroundingPack,
): Promise<string | null> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  // THE LAST TAXONOMY HEADER, reworded 2026-08-07. The three student-facing legs were rewritten on
  // 2026-08-01 to "What this requirement demands (…do not quote it back as a label)"; this one was
  // missed because it is an INTERNAL leg — it returns a component gap label, not prose.
  //
  // That is exactly why it still mattered. The label it returns becomes `gap`, which is handed
  // straight to call3_hint / call3_teach as the diagnosis the student then reads. So this was the
  // one remaining place where the words "command verb" and "intellectual level" sat in a prompt
  // UPSTREAM of student-facing prose — the fence's own claim ("there is no code left to leak",
  // lib/acca/teach-demand.ts) was very nearly true, and this line was the exception.
  //
  // The VALUE was never the problem: `verbLevel` is describeDemand output and taxonomy-free by
  // construction. Only the header named the taxonomy. Now it matches its three siblings.
  const vlLine = verbLevel
    ? `What this requirement demands (judge completeness against this):\n${verbLevel}\n\n`
    : '';
  // PERSONA-HARDENING (2026-07-21): fixes AFM_SURFACED finding 3 (FALSE-COMPLETE, the Nakheel-shaped
  // gap — a numerically-exact answer that never advises the board). When a checklist exists (narrative
  // criteria, or numeric "Step N — Label" headers extracted from model_answer), it is now the
  // AUTHORITATIVE required-component list — the model no longer re-infers structure from prose alone
  // (which is exactly what the design note "Haiku snap-judged long calc answers 'complete' regardless
  // of wording" was catching). Falls back to today's prose-inference when no checklist exists (older/
  // simpler drills) — behaviourally identical to before this change for that case.
  const checklistText = grounding.checklist.length
    ? `${GROUNDING_INSTRUCTION_COMPLETENESS}\n\nCHECKLIST (the authoritative required components):\n${grounding.checklist.map((c) => `- ${c.label}`).join('\n')}\n\n`
    : '';
  // FULL cache win (unlike call2_diagnose/call3_*): every per-drill stable field here — context,
  // question, vlLine, checklistText, AND the (often substantial) model answer — already sits
  // CONTIGUOUSLY before the per-turn variable "Student answer" line in the existing byte order,
  // so the whole stable block forms one clean prefix with no reordering needed.
  const stablePrefix =
    `${contextLine}Question: ${question}\n\n` +
    vlLine +
    checklistText +
    `Model answer (defines the required components — reference only, do NOT restate):\n${modelAnswer}\n\n`;
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 400,
      system: cacheBlock(
        'You audit whether a student answer attempted every REQUIRED component of a model answer. ' +
        'Numerical correctness is ALREADY verified — do NOT re-check numbers, and do NOT treat ' +
        'convention/format/layout differences as missing (sign convention, A/F labelling, table ' +
        'layout are all fine). ' +
        'STEP 1: if a CHECKLIST is supplied in the user message, that IS the required-component list — ' +
        'use it directly, do not re-derive one. Otherwise, read the model answer and identify its ' +
        'distinct REQUIRED components — what the question/command verb actually demands (e.g. the ' +
        'calculation, the evaluation/recommendation, the sceptical challenge, the limitations/bias ' +
        'commentary — wording varies, do not rely on headings; ignore incidental flourishes the verb ' +
        'does not require). ' +
        'STEP 2: for EACH required component, judge whether the student answer makes ANY genuine ' +
        'attempt at it — however brief, oblique or thinly developed still counts as an attempt. ' +
        'Depth is NOT your concern; only attempted-at-all vs not-there-at-all. ' +
        'OUTPUT: one line per required component and NOTHING else — no preamble, no summary — in ' +
        'exactly this form:  PRESENT — <2-4 word component name>  OR  ABSENT — <2-4 word name>. ' +
        'When unsure whether a faint attempt counts, mark it PRESENT (never invent an absence).',
      ),
      messages: [
        {
          role: 'user',
          content: cachePrefix(
            stablePrefix,
            stablePrefix +
            `Student answer:\n${attempt}\n\n` +
            'List each required component on its own line as "PRESENT — name" or "ABSENT — name". Nothing else.',
          ),
        },
      ],
    });
    const out = extractText(res).trim();
    // CODE decides — never the model. Collect components the model marked ABSENT. Any absent → gap.
    // No ABSENT line (all present, OR empty/garbage/truncated/fenced) → null = complete. A malformed
    // read can ONLY fall through to "stays Correct" — never false-incomplete (the safe direction).
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
// Behind APM_INTENT_LAYER=1 (preview). Classifies each non-teach-request message and
// routes ONLY attempts through the withholding pipeline; question/confusion/aside get
// a warm, non-marking reply (no miss++, no cap, no teach-through).
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
  // NO message-level cache split here — PROMPT CACHING task, step 3 (flag, don't restructure):
  // the per-turn-variable prevLine sits FIRST in this call's byte order, before the per-drill
  // stable "Drill question" line, so there is no leading stable prefix to cache without
  // reordering. Low-stakes anyway (max_tokens: 10, a short classification call) — system prompt
  // is still cached below.
  try {
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 10,
      system: cacheBlock(CLASSIFY_SYSTEM),
      messages: [
        { role: 'user', content: `${prevLine}Drill question: ${question}\n\nStudent message: ${message}\n\nLabel:` },
      ],
    });
    return parseIntent(extractText(res));
  } catch {
    return 'attempt'; // classifier failure → treat as an attempt (safe default, never bypasses the moat)
  }
}

// Warm, non-marking responses for non-attempt intents. question/confusion/aside never
// mark, never charge a cap slot. The question path still withholds THIS drill's answer.
const WARM_INSTRUCTIONS: Record<Exclude<Intent, 'attempt'>, string> = {
  question:
    'The student asked a question rather than attempting. Answer it directly and helpfully — teach ' +
    "the concept or clarify the process, using an example NOT drawn from this drill's specific " +
    'figures. Then bridge back with a short prompt inviting them to apply it to this question ' +
    "themselves. Do NOT give this drill's answer or its numbers. 2–4 sentences, warm and peer-to-peer.",
  confusion:
    'The student is stuck or overwhelmed, not attempting. Acknowledge it without condescension, ' +
    // Was: "(e.g. name the command verb and write a single sentence doing it)". The example told
    // the model to have the STUDENT name the taxonomy — the same instruction as the other five
    // residual sites, one layer out. The step it was reaching for is the useful half.
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
  paper: string,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  // Same partial-cache shape as call2_diagnose — see stablePrefix comment there.
  const stablePrefix = `${contextLine}Drill question: ${question}\n\n`;
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: cacheBlock(systemFor(paper)),
    messages: [
      {
        role: 'user',
        content: cachePrefix(
          stablePrefix,
          stablePrefix +
          `Student message: ${message}\n\n` +
          WARM_INSTRUCTIONS[intent] + WRAP_UP,
        ),
      },
    ],
  });
  return finishClean(res);
}

// ── CALL 4: Earned reveal (redesign item 3) ───────────────────────────────────
// ⚠️ THIS IS THE ONLY PLACE THE STORED model_answer IS SHOWN TO THE STUDENT. ⚠️
// Withholding is intentionally lifted here and ONLY here. It is reached solely from the
// earned-reveal branch in §7, gated by ALL of: APM_EARNED_REVEAL flag + explicit
// REVEAL_PHRASES + miss_count >= 2 (persisted, reload-proof). Do NOT call it from any other
// branch, and do NOT pass model_answer to any call3_*. It uses its OWN system prompt — NOT
// the conversational persona, whose "never complete the student's answer" guardrail is
// exactly what the student has earned past here.
//
// ONE design, BOTH papers (APM ported 2026-09-04) — design "B", ruled 2026-07-12 for AFM:
// the model writes ONLY a short framing wrapper (no figures), and `assembleAfmReveal` appends
// the stored model_answer VERBATIM. Figure integrity is STRUCTURAL — byte-equality,
// fixture-enforced — and the multi-table worked answer is never truncated by a token cap.
// The persona voice is paper-routed by `revealWrapperSystemFor`; everything else is shared.
//
// APM previously ran a model-AUTHORED walkthrough under `REVEAL_SYSTEM`, which authorised
// "the figures" and named no source for them. It invented one and served it to a paying
// student. That prompt is RETIRED (tutor-personas.ts) and this route no longer imports it —
// `scripts/test-afm-tutor.ts` asserts the absence, so the retirement is a checked fact.
async function call4_reveal(
  question: string,
  context: string,
  attempt: string,
  diagnosis: string,
  modelAnswer: string,
  paper: string,
  fullReveal: string,
  reachedFrom: RevealReachedFrom,
  grounding: GroundingPack,
  /** For the figure-audit log line only — never reaches the prompt. Defaulted so any caller
   *  that predates the audit is unchanged. */
  drillId: string | null = null,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  // SOLVED → credit (no invented error; the struggle diagnosis is stale for a solved student).
  // STRUGGLE (paid) → the prior diagnosis-framing behaviour. Prompt + system move together.
  const solved = reachedFrom === 'solved';
  // PERSONA-HARDENING (2026-07-21): fixes finding 5 (INVENTED-INVENTORY — the reveal's "point them to
  // a fresh question" close inventing a scenario-specific drill description that does not exist).
  // Appended to BOTH reveal prompts below; empty for APM (resolvableAreas is AFM-only for now).
  const outroLine = renderResolvableTopics(grounding) ? `${GROUNDING_INSTRUCTION_OUTRO}\n\n${renderResolvableTopics(grounding)}` : '';

  // ── ONE PATH, BOTH PAPERS (2026-09-04) ──────────────────────────────────────
  // The APM branch that used to sit below this is GONE. It asked the model to "build the worked
  // walkthrough", under a system prompt that authorised "the figures" and named no source for
  // them, and it invented one: "say, NZD 600m in capital" → EVA = −NZD 9m → "an EVA of −NZD 9m
  // every year tells the truth", on a scenario that states no capital employed, served to a
  // paying student (dd786100, APM B3b, 2026-08-07). See docs/AFM_SURFACED.md (X6, CLOSED).
  //
  // Both papers now do what AFM has done since G3: the model writes a FIGURE-FREE wrapper and
  // code appends the stored `model_answer` VERBATIM beneath it. That is structural, not
  // instructed — `sanitizeAfmWrapper` cuts the wrapper at the first rule or build heading, so
  // the model's output is prose only and the figures come from the row. It cannot state a
  // figure it was not given because its output is not where the figures live.
  //
  // Authored misconception reframe (`full_reveal` — pre-baked, 3–5 sentences). Anchors the
  // struggle wrapper's "name the misconception" beat; the solved builder ignores it. Empty when
  // the column is null → omitted. Present on all 91 APM and all 63 AFM published drills.
  const reframeLine = fullReveal
    ? `Authored misconception reframe (name this and correct the thinking):\n${fullReveal}\n\n`
    : '';
  // buildRevealWrapperUserPrompt's own `head` literal is `${contextLine}Question: ${question}\n\n` +
  // `Their last attempt: ${attempt}\n\n` — i.e. context+question ALWAYS leads, attempt follows
  // immediately, so that same leading substring is the clean stable prefix here too (tutor-
  // personas.ts is untouched — the split is done at the call site by re-deriving the identical
  // leading literal, verified by cachePrefix's own runtime startsWith check).
  const stablePrefix = `${contextLine}Question: ${question}\n\n`;
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500, // wrapper only — the worked answer is appended verbatim, not generated
    system: cacheBlock(revealWrapperSystemFor(paper, reachedFrom)),
    messages: [
      {
        role: 'user',
        content: cachePrefix(
          stablePrefix,
          buildRevealWrapperUserPrompt({ contextLine, question, attempt, diagnosis, reframeLine, reachedFrom }) + '\n\n' + outroLine + WRAP_UP,
        ),
      },
    ],
  });
  const served = assembleAfmReveal(finishClean(res), modelAnswer);

  // ── POST-HOC FIGURE AUDIT — FLAG FOR REVIEW, NEVER A BLOCKER ───────────────
  // Deterministic backstop to the structural fix: every number in the served reveal must appear
  // in context_text ∪ model_answer ∪ the student's attempt. It is best-effort and swallowed —
  // a reveal the student EARNED must never fail to serve because an audit threw. Read the
  // module header for what it cannot see.
  try {
    const audit = auditRevealFigures(served, { context, modelAnswer, attempt });
    if (audit.unsourced.length > 0) {
      console.warn('[reveal:unsourced-figures]', JSON.stringify({
        paper, drill_id: drillId, reached_from: reachedFrom,
        unsourced: audit.unsourced.slice(0, 12), checked: audit.checked,
      }));
    }
  } catch { /* an audit must never break a reveal */ }

  return served;
}

// ── CALL 4b: Burn (FREE user, struggle path) ──────────────────────────────────
// The reveal ARTIFACT is withheld; instead we serve a figure-free diagnosis-framing wrapper
// (the teaching persona's own guardrail forbids completing the answer) + the conversion CTA.
// NEVER receives modelAnswer — the worked answer cannot leak here by construction.
async function call_burn(
  question: string,
  context: string,
  attempt: string,
  diagnosis: string,
  paper: string,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  // Same partial-cache shape as call2_diagnose — see stablePrefix comment there.
  const stablePrefix = `${contextLine}Question: ${question}\n\n`;
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: cacheBlock(systemFor(paper)),
    messages: [
      {
        role: 'user',
        content: cachePrefix(
          stablePrefix,
          stablePrefix +
          `Their last attempt: ${attempt}\n\n` +
          `The gap they keep missing: ${diagnosis}\n\n` +
          'They are on the cusp — the full worked answer would resolve this, but it is a paid ' +
          'feature. In 2–3 sentences, name WHAT they are on the edge of and why seeing the full ' +
          'reasoning laid out is what turns "sort of get it" into "got it". Warm and honest, not ' +
          'pushy. Give NO figures, NO numbers, and NOT the answer. Stop before any call to action ' +
          '(it is appended separately).' + WRAP_UP,
        ),
      },
    ],
  });
  return finishClean(res) + buildBurnCta(paper);
}

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  if (!process.env.TUTOR_SESSION_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const authClient = await createServerClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  // An OUTAGE records; a logged-out request does not. `recordAuthFailure` owns that
  // distinction (`isAuthOutage`) — an unfiltered version would write a row on every
  // anonymous hit, because no session is itself an AuthSessionMissingError.
  if (authError) await recordAuthFailure('api/acca/tutor', authError);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // ── 2. Parse body ──────────────────────────────────────────────────────────
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { drill_id, drill_lo, session_state, student_message, last_ezra_message, paper: paperHint } = body as {
    drill_id?: unknown;
    drill_lo?: unknown;
    session_state?: unknown;
    student_message?: unknown;
    last_ezra_message?: unknown;
    paper?: unknown;
  };

  const drillId = typeof drill_id === 'string' && drill_id ? drill_id : null;
  const drillLo = typeof drill_lo === 'string' && drill_lo ? drill_lo : null;
  const lastEzraMessage = typeof last_ezra_message === 'string' ? last_ezra_message : '';

  if (!drillId && !drillLo) {
    return NextResponse.json({ error: 'drill_id or drill_lo required' }, { status: 400 });
  }
  if (typeof student_message !== 'string' || !student_message.trim()) {
    return NextResponse.json({ error: 'student_message required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── 3. Fetch drill ─────────────────────────────────────────────────────────
  // Prefer id-addressed fetch: serve the EXACT drill the student is viewing (the id
  // page.tsx / next-drill chose), eliminating any show-X-but-serve-Y mismatch on the
  // random-pick paths. id is the primary key, so .single() is unique-safe — it can only
  // return 0 (→ 404) or 1 row, never the >1 that broke the old lo_code+.single() fetch.
  // Fall back to lo_code only for in-flight pre-deploy clients that haven't sent a
  // drill_id yet; that fallback stays safe while each LO has ≤1 published drill (true
  // until the depth drills publish — which must wait until this code is live).
  // id is the PRIMARY KEY (globally unique across papers), so an id-addressed fetch must not
  // filter by a GUESSED paper — doing that is exactly what made AFM ids 404 before G1. But
  // "not a guessed paper" was wrongly implemented as "no paper filter at all", and that is a
  // different claim. It held only while every published drill belonged to a served paper.
  //
  // ⚠️ SBL BROKE IT. SBL is DECLARED but NOT SERVED (lib/acca/paper.ts): no route, no price,
  // no surface, and a teaching persona keyed by paper that has no SBL arm. The moment the five
  // SBL rows go approved+published, an id-addressed request carrying an SBL id would fetch one
  // here and be taught it by whichever persona `systemFor` fell back to. The row's own
  // paper_code IS the paper — which is the reason to CHECK it, not a reason to skip checking.
  //
  // So: scope to the SET of served papers, never to one guessed paper. AFM and APM ids resolve
  // exactly as before (G1 intact); an unserved paper's id 404s like any unknown drill, leaking
  // no existence. An lo-addressed fetch (legacy fallback) additionally scopes to ONE paper:
  // AFM and APM LO codes collide, and paper_code is the only separator.
  // paper comes from the request body (default APM via resolvePaper).
  // answer_schema added (PERSONA-HARDENING 2026-07-21): feeds buildGroundingPack (lib/acca/
  // tutor-grounding.ts). Was never fetched on this path before — see AFM_SURFACED.md's persona-
  // hardening slot ("Rule 24 triangulation"). Read-only addition; nothing downstream required it.
  const drillSelect = () => supabase
    .from('acca_drills')
    .select('question, context_text, model_answer, marks_guide, command_verb, intellectual_level, lo_code, paper_code, full_reveal, answer_schema, calculation_required, hint')
    .eq('exam_board', 'ACCA')
    .eq('status', 'approved')
    .eq('published', true)
    // On the BASE select, so BOTH branches carry it and a future third branch inherits it
    // rather than having to remember. Structural, not instructed.
    .in('paper_code', [...SERVED_PAPERS]);

  const { data: drill, error: drillErr } = await (
    drillId
      ? drillSelect().eq('id', drillId)
      : drillSelect().eq('paper_code', resolvePaper(paperHint)).eq('lo_code', drillLo!)
  ).single();

  if (drillErr || !drill) {
    return NextResponse.json({ error: 'Drill not found' }, { status: 404 });
  }

  const question          = drill.question as string;
  const context           = (drill.context_text as string | null) ?? '';
  const storedModelAnswer = (drill.model_answer as string | null) ?? '';
  // Paper of the drill just fetched — the ONLY thing that separates AFM from APM in the
  // shared acca_drills table (LO codes collide). Drives the paper-scoped teaching persona
  // (systemFor) and the per-paper free counter (capColumn, §4). Read from the fetched row
  // (G1's id-path fetch is paper-agnostic). Unknown/null → 'APM' (established default).
  const paper             = (drill.paper_code as string | null) ?? 'APM';
  // AFM full_reveal (pre-baked misconception reframe); null for APM drills → '' → omitted.
  const fullReveal        = (drill.full_reveal as string | null) ?? '';
  // Does this drill DEMAND a computation? `boolean NOT NULL` with no default, so every published
  // row carries an explicit authored value on BOTH papers (AFM 49/63 true, APM 18/91) — unlike
  // `answer_schema`, which is NULL on all 91 APM rows. It is the gate that makes the
  // arithmetic-absence rule safe; see computationDemandedButAbsent + P-T3(k).
  // ⚠️ Defaults to FALSE, never true: a missing flag must fall back to "discursive", the arm that
  // changes nothing, rather than to the arm that can tell a student they showed no working.
  const calcRequired      = (drill.calculation_required as boolean | null) ?? false;

  // PERSONA-HARDENING (2026-07-21): the GroundingPack — narrative criteria/scenario_facts, or numeric
  // step-headers/working_steps, or (no schema / unrecognised shape) an empty pack that changes NOTHING
  // downstream. AFM area labels are static (all 5 areas — B1-B5 — are live; no per-request query).
  // See lib/acca/tutor-grounding.ts for the trust-tier discipline this depends on.
  const resolvableAreas = paper === 'AFM' ? ['B1', 'B2', 'B3', 'B4', 'B5'] : [];
  const grounding: GroundingPack = buildGroundingPack(
    { model_answer: storedModelAnswer, full_reveal: fullReveal, answer_schema: drill.answer_schema, hint: (drill.hint as string | null) ?? null },
    resolvableAreas,
    // The student's message, so the contradiction against a code-owned discriminant is computed in
    // code rather than inferred by the model. See lib/acca/tutor-discriminants.ts.
    student_message,
  );

  // Authored mark-scheme metadata (redesign item 1 / Principle 5): feed Ezra the
  // criterion to name instead of inferring verb/level from the question text.
  //  • verbLevel (command verb + intellectual level) is safe for the student-facing
  //    call3_* prompts — it carries no answer-revealing figures.
  //  • markScheme appends marks_guide and goes EXCLUSIVELY to call2_diagnose, which is
  //    internal (12–15 word gap label, never outputs the answer). A calculation drill's
  //    marks_guide can contain answer-revealing figures, so it is STRUCTURALLY withheld
  //    from the student-facing prompts rather than guarded by a "don't leak" instruction.
  // Each line is omitted when its column is null → pre-metadata drills degrade to today's
  // inference behaviour rather than injecting an empty block.
  // TAXONOMY FENCE — see lib/acca/teach-demand.ts. The leak was SIGHTED on the case tutor, but
  // this drill path built the identical string and fed it to the identical prompt line, so it
  // carried the identical defect; fixing only the sighted path would have left the larger surface
  // (57 published AFM drills + 91 APM) leaking on the next sampling.
  const verbLevel = describeDemand(
    drill.command_verb as string | null,
    drill.intellectual_level as number | null,
  );

  // DIRECTION FENCE: carried by the grounding pack itself (buildGroundingPack now reads
  // `answer_schema.params`), so it reaches call2_diagnose through the existing grounding
  // plumbing rather than through a second parallel channel. Same hole as the case path — this
  // route DID fetch `answer_schema` and DID build a pack, but the pack only ever read
  // `components[].working_steps` and labels, never `params`.
  // ── marks_guide IS AN ALLOCATION, NOT CRITERIA (corrected 2026-08-03) ───────
  // This line used to read "Marks guidance (authored — criteria that earn marks):" followed by
  // the column. `acca_drills.marks_guide` is a bare INTEGER on 154 of 154 live drills (measured;
  // sample value 12), so the prompt promised criteria and delivered a number — telling the model
  // to look for criteria that were never there.
  //
  // This is the IDENTICAL defect `396910e` fixed on the case path on 2026-08-01 ("the case path
  // labelled marks_guide 'criteria that earn marks' and then printed a bare integer"). The drill
  // path was not in that commit, and it is the surface all 154 live drills serve from — so the
  // doc's central claim, that the marking engine feeds the teaching, was false exactly where it
  // mattered most. Labelled here as what the column actually is: how many marks are at stake,
  // which is real calibration (a 6-mark gap and a 20-mark gap are not the same coaching problem)
  // and is honest about being an allocation rather than a rubric.
  const markScheme = [
    verbLevel,
    drill.marks_guide != null
      ? `Marks available for this requirement (an ALLOCATION, not a list of criteria — there is no authored rubric to cite): ${drill.marks_guide as number}`
      : '',
  ].filter(Boolean).join('\n');

  // ── 3b. THE STUDENT'S ROW, WRITTEN BEFORE THE MODEL RUNS ───────────────────
  // Until 2026-09-04 both rows of a turn were inserted together in §10b, AFTER every model
  // call. So a failed turn wrote NOTHING — the student's message included. A student who
  // typed four hundred words and hit a 500 had them restored to the composer and nowhere
  // else; a reload lost them, and the product had no record the turn ever happened.
  //
  // The user's row is now written HERE, before anything can fail. A failed turn leaves a
  // durable user row with no reply, which is a finding rather than an absence.
  //
  // ⚠️ THIS IS DELIBERATELY NOT ATOMIC ANY MORE. The pair used to be one statement,
  // all-or-nothing; that is exactly what is being given up. `turn_id` is what replaces it:
  // both rows carry the same value, so the pair is explicit rather than inferred from a
  // shared timestamp — and the split makes the user row EARLIER than its reply, which
  // destroys timestamp identity (see lib/acca/turn-pairing.ts).
  //
  // ⚠️ AND IT IS SWALLOWED, LIKE EVERY OTHER LOG ON THIS PATH. A transcript write must never
  // 500 a turn it was only logging. If THIS insert fails and §10b succeeds, the turn_id ends
  // up with an assistant row and no user row — the student got their reply and only the
  // logging is holed. `classifyTurn` reports that as `reply_only`, never as a failed turn.
  //
  // PLACED AFTER THE DRILL FETCH so `drill_id` is known and the 404 is already past, and
  // BEFORE §4 so every model call is downstream of it. Checked when this was written: the
  // four early returns between here and §10b (1374 model-answer 500, 1380/1388 session-state
  // 400s, 1772 teaching-engine 500) are ALL turns where the student spoke and got no reply,
  // so an orphan at each is correct; and the handler's ONLY 200 return is after §10b, so a
  // successful turn can never skip the assistant row.
  const turnId = randomUUID();
  try {
    await supabase.from('acca_drill_messages').insert({
      user_id: user.id, drill_id: drillId, turn_id: turnId,
      role: 'user', content: student_message, call_type: null, outcome: null,
    });
  } catch {
    // non-fatal: transcript logging is best-effort, never blocks the response
  }

  // ── 4. Read profile (cap counter + subscription state) ────────────────────
  // Per-paper free counter (G5b, bundle billing): APM and AFM meter independently —
  // 3 free teach-throughs per paper, NOT shared. capColumn selects the paper's counter.
  const capColumn = paper === 'AFM' ? 'afm_teach_throughs_used' : 'apm_teach_throughs_used';
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_teach_throughs_used, afm_teach_throughs_used, apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  const usedCount = ((profile as Record<string, unknown> | null)?.[capColumn] as number | null) ?? 0;
  // Access is bundle-wide (all ACCA papers) — the apm_* flag is the de-facto ACCA entitlement.
  // PER-PAPER (2026-08-03). `paper` here is the DRILL'S OWN paper_code, read off the row
  // fetched above — not a client hint — so this is the most authoritative form the gate can
  // take: the entitlement checked is the one for the paper whose drill is being taught.
  // A student holding only APM now meets the free cap on AFM drills, which is exactly what
  // per-paper pricing means; the counters were already per-paper (apm_/afm_teach_throughs_used).
  const hasActiveAccess = await hasPaperAccess(supabase, user.id, paper as AccaPaper, profile);

  // ── 5. Establish model answer + session continuity ─────────────────────────
  let modelAnswer: string;
  let teachThroughCounted = false;
  // Sticky across the turns of one drill session; see EncPayload.plainAsked.
  let plainAskedBefore    = false;
  let missCount           = 0;
  let lastDiagnosis:    string | null = null;
  let lastRealAttempt:  string | null = null;
  let resolved            = false;

  if (!session_state) {
    // Turn 1 — use the stored, reviewed model answer; fall back to Call 1.
    // teach_through_counted starts false: this drill hasn't been charged yet.
    if (storedModelAnswer) {
      modelAnswer = storedModelAnswer;
    } else {
      try {
        modelAnswer = await call1_generate(question, context);
      } catch (err) {
        await recordServerError('tutor_reveal', 'api/acca/tutor', err, user.id);
        return NextResponse.json({ error: 'Failed to generate model answer' }, { status: 500 });
      }
    }
  } else {
    const s = session_state as ClientSessionState;
    if (typeof s.enc !== 'string') {
      return NextResponse.json({ error: 'Invalid session state' }, { status: 400 });
    }
    try {
      const payload     = openPayload(s.enc);
      modelAnswer       = payload.answer;
      teachThroughCounted = payload.counted;
      plainAskedBefore  = payload.plainAsked === true;
    } catch {
      return NextResponse.json({ error: 'Session state corrupted' }, { status: 400 });
    }
  }

  // ── 5b. Durable teach-loop progress (replaces session_state.miss_count) ──────
  // Authoritative source for miss_count/last_diagnosis/last_real_attempt, keyed
  // (user_id, drill_id) so it survives the reloads that wipe the client session_state.
  // Defensive by construction — three ways it degrades to miss_count = 0, never a 500:
  //   • no drill_id (legacy client) → skip the read entirely (today's behaviour)
  //   • no row yet (turn 1)         → maybeSingle() returns null
  //   • any DB/read error           → progress stays null (try/catch backstops a throw)
  if (drillId) {
    try {
      const { data: progress } = await supabase
        .from('acca_tutor_progress')
        .select('miss_count, last_diagnosis, last_real_attempt, counted, resolved')
        .eq('user_id', user.id)
        .eq('drill_id', drillId)
        .maybeSingle();
      if (progress) {
        missCount       = typeof progress.miss_count === 'number' ? progress.miss_count : 0;
        lastDiagnosis   = (progress.last_diagnosis    as string | null) ?? null;
        lastRealAttempt = (progress.last_real_attempt as string | null) ?? null;
        // Durable cap-charged flag (Fix 4): OR the server-side value in so a reload —
        // where enc (and its counted) is gone — still sees this drill as already
        // charged, preventing a double-increment of apm_teach_throughs_used.
        teachThroughCounted = teachThroughCounted || progress.counted === true;
        resolved = progress.resolved === true;
      }
    } catch {
      // never 500 on a progress read — fall through to the declared defaults (miss_count = 0)
    }
  }

  // ── 6. Coaching gate ───────────────────────────────────────────────────────
  // ⚠️ THIS USED TO 403 THE ATTEMPT, AND THAT WAS THE DEFECT (fixed 2026-08-22).
  //
  // It read `allowed = hasActiveAccess || usedCount < 3 || isFreeFollowUp` and returned
  // 403 `cap_hit` when false — BEFORE the student could submit anything. A free student past
  // three teach-throughs could not attempt a fourth drill at all: the page rendered the
  // question, and TutorChat replaced the textarea with a paywall. Meanwhile the offer on the
  // pillar, both spokes and every pricing card said "Every drill on both papers, unlimited,
  // PLUS three full teach-throughs" — unlimited ACCESS, of which three are COACHED.
  //
  // THE COUNTER WAS NEVER WRONG. §8 increments it only when `teachThroughDelivered`, so it
  // counts COACHING DELIVERED, correctly. The gate then used that number to refuse ENTRY. One
  // value, two meanings, and the product shipped the wrong one.
  //
  // Now separated in lib/acca/teach-access.ts (pure, fixtured): `attemptAllowed` is always
  // true — nothing here may refuse an attempt — and `coachingAllowed` gates the two legs where
  // `teachThroughDelivered` is set (§7 legs G and L). That flag ALREADY drew this line; it was
  // simply never the thing the gate consulted.
  //
  // Case (c), `isFreeFollowUp`, is unchanged: a student who just spent their 3rd slot keeps
  // full coaching on THAT drill. Sealed inside the AES-256-GCM payload (and OR'd with the
  // durable `acca_tutor_progress.counted` at §5b), so it is not forgeable.
  const isFreeFollowUp = teachThroughCounted; // sealed inside AES-256-GCM, not forgeable
  const access = teachAccessFor({ hasActiveAccess, teachThroughsUsed: usedCount, isFreeFollowUp });
  const coachingAllowed = access.coachingAllowed;

  // The upgrade prompt is appended by CODE after the diagnosis (see §7 legs G/L), never
  // instructed inside a prompt — an instructed closing line is the first thing a token cap
  // sacrifices. Paper-scoped through the same helper every other link uses.
  //
  // PARSED at this boundary, not asserted through: `paper` is a DB column typed `string`, and
  // `servedPaper` refuses an unrecognised value rather than coercing it (P-G6). The drill fetch
  // is already scoped `.in('paper_code', SERVED_PAPERS)`, so the fallback is unreachable today —
  // it exists so a future widening of that fetch cannot silently mint an APM subscribe link for
  // a paper that is not APM.
  const subscribeHref = paperHref('/acca/subscribe', servedPaper(paper) ?? 'APM');

  // ── 7. Teaching engine ─────────────────────────────────────────────────────
  let ezraResponse:        string;
  let newMissCount       = missCount;
  let newLastDiagnosis   = lastDiagnosis;
  let newLastRealAttempt = lastRealAttempt;
  let teachThroughDelivered = false;
  let newResolved        = resolved;
  // Set ONLY on the real-attempt path (classified==='attempt' -> the withholding
  // pipeline): 'correct' when the attempt is accepted, 'miss' otherwise. Stays null
  // on warm/teach/reveal paths, which are not scored attempts. Read at §10 to append
  // an acca_drill_attempts row — never used by any engine/cap logic.
  let attemptOutcome: 'correct' | 'miss' | null = null;
  let intent: string     = 'attempt';
  // Single discriminant for the client badge: tells hint / teaching / correct apart
  // (which intent + teach_through_delivered alone cannot). Set in every branch below.
  // Purely additive — read only by the client for labelling; no engine/cap logic reads it.
  let messageKind: string = 'hint';

  // ── Stop-signal split + intent routing ──
  // Flag ON: only explicit teach-requests fast-path to the teach-through; everything
  // else is classified, and only `attempt` enters the withholding pipeline. Flag OFF:
  // legacy isStopSignal (full list) → teach, everything else → diagnose (exact rollback).
  // Earned reveal (item 3) is checked FIRST and is doubly gated: an explicit REVEAL_PHRASES
  // match AND genuine struggle (missCount >= 2, from the persisted §5b counter — reload-proof).
  // A sub-threshold reveal request hits the static EARN_REDIRECT, never call4_reveal.
  //
  // ── PLAIN ANSWER REQUESTS, FOR A PAID USER WHO HAS ALREADY EARNED IT ────────
  // "just tell me" is the plainest possible request for the answer, and it lives in
  // TEACH_REQUEST_PHRASES by inheritance from the old capitulation list rather than by ruling
  // (see lib/acca/phrase-match.ts). Measured cost on a real paid account: four uses across three
  // weeks, four figure-free teaches, zero reveals — on a student carrying miss_count 7.
  //
  // NARROWLY GATED, and every clause is load-bearing:
  //   • `hasActiveAccess` — a FREE user's "just tell me" stays a teach request exactly as today.
  //     Routing it to revealDecision would return 'burn', replacing a free teach with a paywall
  //     wrapper. That is a conversion change, not a teaching fix, and it is not what was asked for.
  //   • `missCount >= 2` — below the earn threshold this must NOT become a reveal request, or
  //     revealDecision returns 'earn_redirect' and the student gets the static "try first"
  //     refusal INSTEAD of the good teach they get today. That would be a straight regression:
  //     it is precisely what happened to this student on three separate drills, each of which
  //     ended at exactly one miss.
  // Both thresholds are the EXISTING ones, unchanged, and the phrase lists stay disjoint —
  // nothing moves between them. What changes is only which door a paid, already-earned request
  // walks through.
  // NOTE the deliberate asymmetry with `plainAnswerEarned` below: THIS is the bare question "did
  // they ask to be told?", with no paid/earned qualification, because the self-assessment
  // suppression is about TONE, not entitlement. A free student one miss in who says "just tell
  // me" has still said it, and asking them which part they would defend least is still the wrong
  // reply. `plainAskedNow` therefore reads the phrase alone; `plainAnswerEarned` adds the gates.
  const plainAskedNow  = isPlainAnswerRequest(student_message);
  const plainAskedEver = plainAskedBefore || plainAskedNow;
  const plainAnswerEarned =
    REVEAL_ENABLED && hasActiveAccess && missCount >= 2 && plainAskedNow;
  const wantsReveal = (REVEAL_ENABLED && isRevealRequest(student_message)) || plainAnswerEarned;
  const fastTeach   = INTENT_LAYER_ENABLED ? isTeachRequest(student_message) : isStopSignal(student_message);

  // Access-aware earned-reveal gate (Bucket-B burn doctrine): SOLVED (resolved) → reveal for
  // free & paid; STRUGGLE (missCount >= 2) → reveal for PAID, BURN for FREE (artifact gated,
  // teaching stays free); neither → the static earn-it refusal. `paid` = active ACCA access.
  const revealGate = revealDecision({ wantsReveal, missCount, resolved, paid: hasActiveAccess });

  // FIX B (red-team adjudication 2026-07-16): distress → dignity #9. Suppresses the reveal-nudge
  // (offerReveal) on hint/teach/confirm and the burn wall for THIS turn — no CTA/upsell to a
  // distressed student. The persona's DIGNITY_ON_DISTRESS clause carries the steady-and-kind tone.
  const distressed = containsDistressSignal(student_message);

  // ── The level-aware closing contract, resolved once for every leg that teaches ──
  // Taxonomy-free by construction (lib/acca/teach-demand.ts); '' for an unknown level, which
  // leaves those prompts byte-identical to before this change.
  const nextMove = nextMoveContract(drill.intellectual_level as number | null);

  // ── Should this turn carry the deterministic reveal offer? ──
  // Same gate as the instruction it replaces (REVEAL_ENABLED && missCount >= 2 && !distressed) —
  // thresholds unchanged, per the brief. What changed is that it is now APPENDED rather than
  // asked for, so a length-capped leg cannot swallow it.
  //
  // DELIBERATE DEVIATION, flagged: the brief said "for paid users". This keeps the existing
  // audience, which includes FREE users at missCount >= 2. Restricting it to paid would strip the
  // nudge that walks a free student into the burn wall — `revealDecision` returns 'burn' for them,
  // which is the conversion path, and it cannot fire if nobody tells them the phrase. That is a
  // funnel change rather than a teaching fix, so it is not made here. Say the word and it is one
  // `&& hasActiveAccess`.
  const offerReveal = REVEAL_ENABLED && missCount >= 2 && !distressed;

  // Self-assessment (P5c) rides the same struggle threshold: a SECOND or later attempt, never a
  // first, never a distressed turn. Independent of REVEAL_ENABLED — metacognition is not gated on
  // the reveal flag.
  //
  // ── AND NEVER ONCE THEY HAVE ASKED TO BE TOLD (2026-08-07) ──────────────────
  // SIGHTED, not theorised: a real student wrote "just tell me" at 02:04, and at 02:10 the tutor
  // opened its reply with "Before I say — which bit of that would you defend least…?". The gate
  // had two exemptions — first attempt and distress — so a plain request for the answer left no
  // trace, and the next turn asked him a question instead of answering.
  //
  // STICKY FOR THE SESSION, not merely for the turn, and that is the whole point: on the turn he
  // says it he is routed to teach or reveal anyway. The damage lands on the NEXT turn, once he has
  // gone back and written more — exactly the turn a per-turn check cannot see. `plainAsked` rides
  // the sealed payload so it survives to that turn.
  //
  // It does NOT reset when he re-engages. Asking to be told is a statement about how he wants to
  // be taught on this drill; going back and attempting again is not a retraction of it.
  const selfAssess = missCount >= 2 && !distressed && !plainAskedEver;

  try {
    if (isIdentityProbe(student_message)) {
      // FIX D (red-team adjudication 2026-07-16): a direct "what are you?" question is answered
      // gracefully in-character and short-circuits BEFORE the attempt pipeline (so it works with the
      // intent layer off). Not an attempt: no miss, no cap charge, no resolved, no model_answer in scope.
      intent = 'aside';
      messageKind = 'chat';
      ezraResponse = buildIdentityResponse(paper);
    } else if (!wantsReveal && isConfirmNumberProbe(student_message)) {
      // X5 STRUCTURAL gate (red-team adjudication 2026-07-16): a bare confirm-a-number ("is it 51m?",
      // "the answer is 51 million") gets a DETERMINISTIC, frozen neutral refusal — never model-authored,
      // so the helpfulness prior can't re-add a proximity/validation signal. Not an attempt: no miss, no
      // cap, no resolved, no model_answer in scope. Guarded by !wantsReveal so an explicit reveal request
      // still routes to the earned-reveal gate. The call2 bare-guess guard remains the backstop.
      intent = 'confirm_number_redirect';
      messageKind = 'confirm_number_locked';
      ezraResponse = CONFIRM_NUMBER_REFUSAL;
    } else if (revealGate === 'reveal') {
      // The sole gated moat-lift; model_answer reaches the student ONLY here. Reached by SOLVING
      // (resolved, free & paid) or by PAID struggle. Marks resolved.
      intent = 'reveal';
      messageKind = 'reveal';
      // reachedFrom mirrors revealDecision's precedence: resolved (solved) wins over struggle.
      // SOLVED → credit-not-correct wrapper (no invented figures-slip); STRUGGLE (paid) → diagnose.
      const reachedFrom: RevealReachedFrom = resolved ? 'solved' : 'struggle';
      ezraResponse = await call4_reveal(question, context, lastRealAttempt ?? student_message, lastDiagnosis ?? '', modelAnswer, paper, fullReveal, reachedFrom, grounding, drillId);
      newResolved = true;
    } else if (revealGate === 'burn') {
      if (distressed) {
        // FIX B dignity #9: a distressed free student at the struggle wall gets STEADIED, not sold
        // to. Serve the figure-free teach (no CTA, no paywall block) instead of the burn. Stays
        // free — teachThroughDelivered left false, exactly like the burn it replaces.
        intent = 'teach_request';
        messageKind = 'teaching';
        // selfAssess forced FALSE here regardless of miss count: this student has just expressed
        // distress, and "which bit would you defend least?" is the wrong question to ask someone
        // who has said they are giving up. The dignity rule outranks the principle.
        ezraResponse = await call3_teach(question, context, lastRealAttempt ?? student_message, null, lastDiagnosis ?? '', verbLevel, nextMove, false, paper, true, grounding);
      } else {
        // FREE user, struggle path: the reveal ARTIFACT is gated. Serve the figure-free
        // diagnosis-framing wrapper + conversion CTA (call_burn NEVER receives modelAnswer, so the
        // worked answer cannot leak). No miss++, no cap charge, no resolved — teaching stays free.
        intent = 'reveal_burn';
        messageKind = 'reveal_burn';
        ezraResponse = await call_burn(question, context, lastRealAttempt ?? student_message, lastDiagnosis ?? '', paper);
      }
    } else if (revealGate === 'earn_redirect') {
      // Reveal requested but NOT earned (missCount < 2 AND not resolved): static refusal gate.
      // model_answer is deliberately NOT referenced here — earned-not-dumped is structural.
      intent = 'reveal_redirect';
      messageKind = 'reveal_locked';
      ezraResponse = EARN_REDIRECT;
    } else if (fastTeach && !coachingAllowed) {
      // ── LEG G, CAPPED (2026-08-22) ────────────────────────────────────────────
      // An explicit teach request from a free student past their three teach-throughs. The
      // COACHING is what is capped, so this serves `call_burn` — the same figure-free
      // diagnosis-framing wrapper + conversion CTA the struggle wall already uses, which NEVER
      // receives modelAnswer and so cannot leak the worked answer by construction.
      //
      // No `teachThroughDelivered`: §8 must not charge a slot for a leg that did not coach.
      // No miss++, no resolved — this is not an attempt.
      intent = 'teach_request_capped';
      messageKind = 'reveal_burn';
      ezraResponse = await call_burn(question, context, lastRealAttempt ?? student_message, lastDiagnosis ?? '', paper);
    } else if (fastTeach) {
      intent = 'teach_request';
      messageKind = 'teaching';
      const contextAttempt = lastRealAttempt ?? student_message;
      const diagnosis      = lastDiagnosis ?? 'student requested answer without re-attempting';
      ezraResponse = await call3_teach(question, context, contextAttempt, null, diagnosis, verbLevel, nextMove, selfAssess, paper, distressed, grounding);
      if (offerReveal) ezraResponse += revealOfferLine('struggle');
      teachThroughDelivered = true;
    } else if (resolved) {
      // Item 4: a SOLVED drill never re-scaffolds from zero. Any non-reveal message post-solve
      // is a follow-up, handled on the warm path — no re-diagnosis, no miss, no cap. Classify
      // only to pick the warm register; an answer-like message maps to 'question' (call_warm
      // cannot take 'attempt').
      const c: Intent = INTENT_LAYER_ENABLED
        ? await call0_classify(student_message, question, lastEzraMessage)
        : 'question';
      const warmIntent: Exclude<Intent, 'attempt'> = c === 'attempt' ? 'question' : c;
      intent = warmIntent;
      ezraResponse = await call_warm(warmIntent, student_message, question, context, paper);
      messageKind = warmIntent === 'question' ? 'answer'
                  : warmIntent === 'confusion' ? 'coaching' : 'chat';
    } else {
      // Classify only when the layer is on; otherwise force 'attempt' (= legacy behaviour:
      // every non-stop-signal message goes through the withholding pipeline).
      const classified: Intent = INTENT_LAYER_ENABLED
        ? await call0_classify(student_message, question, lastEzraMessage)
        : 'attempt';
      intent = classified;

      if (classified !== 'attempt') {
        // Warm, non-marking path: no miss++, no cap, no teach-through; progress untouched.
        ezraResponse = await call_warm(classified, student_message, question, context, paper);
        messageKind = classified === 'question' ? 'answer'
                    : classified === 'confusion' ? 'coaching' : 'chat';
        // ── THE OFFER REACHES THE WARM PATH TOO (new) ──
        // Previously the offer rode ONLY on the teach and confirm legs, so a student who had
        // earned the reveal and then asked a clarifying question was told nothing — the
        // entitlement stayed invisible for as long as they kept asking questions rather than
        // re-attempting. Restricted to `question`/`confusion`: those are turns where the student
        // is engaging with the drill. An `aside` is a social remark, and answering "morning!"
        // with an unlock offer is the upsell drumbeat this deliberately is not.
        if (offerReveal && (classified === 'question' || classified === 'confusion')) {
          ezraResponse += revealOfferLine('struggle');
        }
      } else {
        // ── THE MOAT — existing withholding pipeline ──
        // FIX (2026-07-23): lastRealAttempt (the PRIOR turn's real attempt, read at §5b) is now
        // threaded alongside student_message — previously this call saw only the current
        // message, so a short follow-up on a genuine prior attempt was diagnosed as if nothing
        // had been submitted at all. buildStudentAnswerBlock collapses to the old single-block
        // form on turn 1 (lastRealAttempt is null) or an unchanged re-send — byte-identical to
        // before this fix in both of those cases.
        // withParseRetry: 1 + 3 attempts, PARSE failures only — a call fault propagates
        // immediately (an API error must not be retried as though the model had merely
        // misformatted). Pass-through when TUTOR_GAP_STRUCTURED=off, since nothing throws 'parse'.
        const { label: diagnosis, verdict: gapVerdict, codeOwnsUnderived } =
          await withParseRetry('diagnoseGapVerdict', () =>
            call2_diagnose(question, context, student_message, lastRealAttempt, modelAnswer, markScheme, grounding, calcRequired));
        // CODE > FIELD > PHRASE, resolved once here so the hint leg is TOLD the answer rather
        // than deciding it from a label. `resolveNothingEstablished` can only ever move a turn
        // toward not-adjudicated; there is deliberately no arm that forces "derived".
        const gapNothingEstablished =
          resolveNothingEstablished(codeOwnsUnderived, gapVerdict, diagnosis).nothingEstablished;
        // WIRED 2026-08-23 on 60/60 agreement with a hand-read, including a positive control that
        // read 1 on 20/20. INDEPENDENT of `derived` — different question, neither computed from
        // the other, and `derived`'s arm above is unchanged. Absent ⇒ false ⇒ no change.
        const gapNothingCreditable = nothingCreditable(gapVerdict);

        // Completeness gate (behind APM_COMPLETENESS_GATE): call2 verified the NUMBERS; this
        // verifies every required component was attempted. Runs ONLY when call2 says correct, so
        // the wrong/convention paths stay byte-identical. A clearly-absent component demotes the
        // correct verdict to a miss whose gap NAMES the missing component (case 2).
        let completenessGap: string | null = null;
        if (COMPLETENESS_GATE_ENABLED && isCorrectVerdict(diagnosis)) {
          completenessGap = await completenessCheck(question, context, modelAnswer, student_message, verbLevel, grounding);
        }
        const treatCorrect = isCorrectVerdict(diagnosis) && !completenessGap;

        if (treatCorrect) {
          // Correct answer. Acknowledge it — do NOT score a miss, do NOT deliver a
          // gap-hint, do NOT set teachThroughDelivered (so §8 never charges a cap slot).
          // Item 1: mark the drill RESOLVED (success-solved mirrors reveal-solved) so the
          // model answer becomes reachable for comparison and the drill never re-scaffolds.
          // Item 3a: the confirm nudges the now-earned phrase — DETERMINISTICALLY, appended below
          // rather than instructed inside a 650-token prompt.
          ezraResponse       = await call3_confirm(question, context, student_message, verbLevel, paper, grounding);
          if (REVEAL_ENABLED && !distressed) ezraResponse += revealOfferLine('solved');
          messageKind        = 'correct';
          attemptOutcome     = 'correct';
          newLastRealAttempt = student_message;
          newResolved        = true;
          // newMissCount and newLastDiagnosis intentionally left unchanged: a correct
          // turn is not a miss, and we keep the last REAL gap (if any) intact so a later
          // teach-through still has a meaningful diagnosis to anchor on.
        } else {
          // completenessGap (when set) names the absent component; else call2's gap (genuine wrong).
          const gap        = completenessGap ?? diagnosis;
          newMissCount     = missCount + 1;
          newLastDiagnosis = gap;
          newLastRealAttempt = student_message;
          attemptOutcome   = 'miss';

          if (newMissCount === 1) {
            // FIRST miss — no self-assessment beat (it delays the diagnosis they came for) and no
            // reveal offer (not earned yet). Only the closing contract is new here.
            //
            // THIS LEG IS THE FREE TIER'S FLOOR AND ALWAYS WAS: it names the gap, and it has
            // never set `teachThroughDelivered`, so it has never charged a slot. The 2026-08-22
            // ruling did not have to carve anything out for it — it only had to stop the gate
            // above refusing the student before they could reach it.
            ezraResponse = await call3_hint(question, context, student_message, gap, verbLevel, nextMove, paper, grounding, gapNothingEstablished, gapNothingCreditable);
            messageKind = 'hint';
            if (!coachingAllowed) ezraResponse += upgradeAfterDiagnosisLine(subscribeHref);
          } else if (!coachingAllowed) {
            // ── LEG L, CAPPED (2026-08-22) ──────────────────────────────────────
            // Second-or-later miss from a free student past their three teach-throughs. Under
            // the ruling they get THE DIAGNOSIS — the gap named — and then the upgrade prompt;
            // the coached walk-through is what the three teach-throughs bought.
            //
            // Serves `call3_hint`, the SAME leg the first miss uses, so the diagnosis they get
            // is the diagnosis this engine already produces — not a degraded copy written for
            // the paywall. No `teachThroughDelivered`, so §8 charges nothing.
            //
            // `selfAssess` and the reveal offer are deliberately absent: the offer walks a free
            // student into `revealDecision`'s 'burn', and appending both a reveal nudge and an
            // upgrade prompt to one message is two asks in a row.
            ezraResponse = await call3_hint(question, context, student_message, gap, verbLevel, nextMove, paper, grounding, gapNothingEstablished, gapNothingCreditable);
            ezraResponse += upgradeAfterDiagnosisLine(subscribeHref);
            messageKind = 'hint_capped';
          } else {
            // FIX (2026-07-23): same threading as call2_diagnose above — the second-miss teach
            // now sees the prior turn's real attempt alongside the current message, matching the
            // pattern already used at the reveal/burn/fast-teach call sites.
            //
            // selfAssess/offerReveal are computed on the PRE-increment `missCount` above, but this
            // branch is by definition the second-or-later miss, so both conditions are satisfied
            // here whatever `missCount` was — hence `newMissCount >= 2`, matching the original.
            ezraResponse = await call3_teach(question, context, student_message, lastRealAttempt, gap, verbLevel, nextMove, !distressed, paper, distressed, grounding);
            if (REVEAL_ENABLED && newMissCount >= 2 && !distressed) ezraResponse += revealOfferLine('struggle');
            teachThroughDelivered = true;
            messageKind = 'teaching';
          }
        }
      }
    }
  } catch (err) {
    // The whole teaching engine, one catch — the drill loop's single most-travelled failure
    // path. `err` and nothing else: the student's message and the model's reply are both in
    // scope here and neither may reach the row. See `boundedDetail`.
    await recordServerError('tutor_turn', 'api/acca/tutor', err, user.id);
    return NextResponse.json({ error: 'Teaching engine error' }, { status: 500 });
  }

  // ── 8. Server-side cap increment ──────────────────────────────────────────
  // Increment when ALL of:
  //   • a teach-through was just delivered on this request
  //   • this drill hasn't already been incremented (teachThroughCounted = false)
  //   • the user is not on an active plan (paying users don't consume free slots)
  //
  // teachThroughCounted lives inside the encrypted enc blob — the client cannot
  // set it to true to skip this block, because they cannot re-seal the blob
  // without the server's AES-256-GCM key.

  let newTeachThroughCounted = teachThroughCounted;
  let capNowHit = false;

  if (teachThroughDelivered && !teachThroughCounted && !hasActiveAccess) {
    const newCount = usedCount + 1;
    await supabase
      .from('profiles')
      .update({ [capColumn]: newCount })
      .eq('id', user.id);
    newTeachThroughCounted = true;
    // `cap_now_hit` now means "COACHING is capped from here", not "you are locked out" — the
    // client renders it as a banner above a live input, not as a wall replacing one. The
    // literal 3 is gone: FREE_TEACH_THROUGHS is shared with the gate that reads it, so the
    // increment and the gate cannot disagree about where the limit is.
    capNowHit = newCount >= FREE_TEACH_THROUGHS;
  }

  // ── 8b. Reveal-velocity alert (best-effort) ────────────────────────────────
  // A served reveal (not a burn) crossing REVEAL_VELOCITY_N in a rolling 24h emails Grant the
  // account + drill list. This reveal is logged in §10 (after here), so `recent` is the prior
  // count; alert fires once, exactly on the (N+1)th. Never throws — a harvester tripping this
  // must not break a legitimate reveal.
  if (intent === 'reveal') {
    try {
      const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from('acca_drill_messages')
        .select('drill_id')
        .eq('user_id', user.id).eq('call_type', 'reveal').gte('created_at', dayAgo);
      const nowServed = (recent?.length ?? 0) + 1;
      if (nowServed === REVEAL_VELOCITY_N + 1) {
        const drills = [...new Set([...(recent ?? []).map(r => r.drill_id as string), drillId])];
        void notifyGrant(
          `[Gradd] Reveal velocity: ${nowServed} in 24h`,
          `Account ${user.id} (${hasActiveAccess ? 'PAID' : 'FREE'}) has been served ${nowServed} reveals in the last 24h. Drills: ${drills.join(', ')}`,
        );
      }
    } catch { /* best-effort — a velocity-check failure never breaks the reveal */ }
  }

  // ── 9. Seal updated session state ─────────────────────────────────────────
  const updatedSessionState: ClientSessionState = {
    // `plainAskedEver` (not `plainAskedNow`) — the flag is sticky, so once sealed true it stays
    // true for every later turn of this session. Sealing the per-turn value would clear it on the
    // very next message, which is the turn the suppression exists for.
    enc:               sealPayload(modelAnswer, newTeachThroughCounted, plainAskedEver),
    miss_count:        newMissCount,
    last_diagnosis:    newLastDiagnosis,
    last_real_attempt: newLastRealAttempt,
  };

  // ── 10. Persist durable teach-loop progress (upsert by user_id + drill_id) ───
  // Authoritative write for the counter that §5b reads next turn. Mirrors the seal:
  // §9 seals enc (model answer + counted cap flag) into session_state; this writes the
  // teach-loop fields to the DB. No field crosses between the two stores. Best-effort —
  // the response is already built, so a write failure never 500s, and a legacy client
  // with no drill_id skips persistence (its progress simply stays at 0).
  if (drillId) {
    try {
      await supabase
        .from('acca_tutor_progress')
        .upsert({
          user_id:           user.id,
          drill_id:          drillId,
          miss_count:        newMissCount,
          last_diagnosis:    newLastDiagnosis,
          last_real_attempt: newLastRealAttempt,
          counted:           newTeachThroughCounted, // Fix 4: durable cap-charged flag
          resolved:          newResolved,            // item 3: durable earned-reveal flag
          updated_at:        new Date().toISOString(),
        }, { onConflict: 'user_id,drill_id' });
    } catch {
      // non-fatal: teach-loop persistence is best-effort, never blocks the response
    }

    // Append-only attempt log: one row per REAL scored attempt (correct|miss), with
    // lo_code denormalised at write. Feeds the readiness M-slope and per-(user,LO)
    // weakness. Additive and swallowed exactly like the upsert above — a write failure
    // must never block or 500 the teach path. Skipped on warm/teach/reveal turns
    // (attemptOutcome === null) since those are not scored attempts.
    if (attemptOutcome) {
      try {
        await supabase
          .from('acca_drill_attempts')
          .insert({
            user_id:    user.id,
            drill_id:   drillId,
            lo_code:    drill.lo_code as string,     // denormalised at write
            outcome:    attemptOutcome,
            miss_delta: attemptOutcome === 'miss' ? 1 : 0,
          });
      } catch {
        // non-fatal: attempt logging is best-effort, never blocks the response
      }

      // ── 10a. THE WEAKNESS LEDGER — the drill path's half (added 2026-08-12) ──
      // Until now `acca_weak_areas` was written ONLY by a marked sit, and it held 0 rows
      // globally: the two sits that ever carried answers correctly wrote nothing (one blank,
      // one full marks), while 115 distinct (user, LO) pairs carrying a miss sat in
      // acca_drill_attempts, invisible to the selector that reads this table.
      //
      // The DECISION is pure and lives in lib/acca/weak-areas.ts — a miss opens a row only at
      // `miss_count >= 2` and not resolved (the same stuckDrills predicate the progress page
      // already shows the student), and a CORRECT attempt closes it. Deliberately NOT
      // `resolved`, which the earned-reveal branch also sets: closing on that would resolve a
      // weakness at the moment a struggling student asked for the answer.
      //
      // `paper` is the DRILL'S OWN paper_code, read off the fetched row at the top of this
      // handler — never a client hint and never a default. That is the paper scoping ruling 6
      // demands: AFM and APM LO codes collide exactly, so an unscoped row would steer the
      // wrong paper. No join is needed here because the route already holds the value; the
      // BACKFILL, which starts from acca_tutor_progress, does need one.
      //
      // Best-effort and swallowed, exactly like the two writes above: the teach response is
      // already built, and a ledger write must never block or 500 the teach path.
      try {
        const action = drillLedgerAction({
          missCount: newMissCount,
          resolved: newResolved,
          outcome: attemptOutcome,
        });
        const ledgerArgs = {
          userId: user.id,
          paper: paper as AccaPaper,
          loCode: drill.lo_code as string,
          source: 'drill' as const,
        };
        if (action.kind === 'open') {
          await openWeakness(supabase, { ...ledgerArgs, band: action.band });
        } else if (action.kind === 'close') {
          // Closes the DRILL row only. A drill success must never close a SIT finding —
          // see the header of lib/acca/weak-area-store.ts.
          await closeWeakness(supabase, ledgerArgs);
        }
      } catch {
        // non-fatal: ledger maintenance is best-effort, never blocks the response
      }
    }
  }

  // ── 10b. THE REPLY'S ROW (append-only, best-effort) ─────────────────────────
  // The ASSISTANT row only — the student's went in at §3b, before the model ran, and both
  // carry the same `turnId`. Logs EVERY response-producing leg (attempt / hint / teach /
  // correct / warm / reveal); the assistant row carries call_type (= messageKind), outcome,
  // drill_id. drill_id may be null (legacy client — schema allows it), so this is NOT gated
  // on drillId. Swallowed exactly like the attempt-log above — a write failure must never
  // block or 500 the teach path, and a CHECK never rejects an unlisted call_type (column is
  // unconstrained).
  //
  // Reaching this line means a reply was produced. If THIS insert fails the turn_id keeps a
  // lone user row and is reported FAILED, which is then wrong — the student did get their
  // answer. That is the one direction the split can misreport, it is strictly rarer than the
  // case it fixes (this write is a single insert with no model call in front of it), and it
  // is stated here rather than discovered later.
  try {
    await supabase.from('acca_drill_messages').insert({
      user_id: user.id, drill_id: drillId, turn_id: turnId,
      role: 'assistant', content: ezraResponse, call_type: messageKind, outcome: attemptOutcome,
    });
  } catch {
    // non-fatal: transcript logging is best-effort, never blocks the response
  }

  return NextResponse.json({
    ezra_response:          ezraResponse,
    session_state:          updatedSessionState,
    teach_through_delivered: teachThroughDelivered,
    cap_now_hit:            capNowHit,
    intent,
    message_kind:           messageKind,
    // Item 3b signal: the drill is solved (confirmed-correct or revealed). The client uses
    // this to surface the "View the model answer" affordance once — the reveal is now earned.
    // Gated on REVEAL_ENABLED: never advertise the button when the reveal path is dark (the
    // flag off routes a reveal request to call_warm — a persona refusal, not the answer). This
    // keeps the affordance coherent with what can actually serve.
    resolved:               newResolved && REVEAL_ENABLED,
  });
}
