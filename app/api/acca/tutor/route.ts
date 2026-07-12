import { NextResponse } from 'next/server';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import {
  systemFor,
  REVEAL_SYSTEM,
  REVEAL_AFM_WRAPPER_SYSTEM,
  assembleAfmReveal,
} from '@/lib/acca/tutor-personas';
import { resolvePaper } from '@/lib/acca/paper';

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
interface EncPayload {
  answer: string;
  counted: boolean; // true once the DB increment for this drill has been applied
}

// ── Encryption ────────────────────────────────────────────────────────────────

function getKey(): Buffer {
  const secret = process.env.TUTOR_SESSION_SECRET;
  if (!secret) throw new Error('TUTOR_SESSION_SECRET not configured');
  return createHash('sha256').update(secret).digest();
}

function sealPayload(answer: string, counted: boolean): string {
  const key  = getKey();
  const iv   = randomBytes(12);
  const body = JSON.stringify({ answer, counted } satisfies EncPayload);
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
// Behind APM_EARNED_REVEAL. The reveal is the ONE place the stored model_answer is shown
// to the student — gated by an explicit REVEAL_PHRASES match AND genuine struggle
// (miss_count >= 2, persisted). REVEAL_PHRASES MUST stay disjoint from TEACH_REQUEST_PHRASES
// (unit-tested: 0 exact / 0 substring overlap, no message matches both) — otherwise
// "show me how" could dump the answer. All reveal phrases are imperative-anchored so they
// cannot appear inside a teach-style message ("walk me through the model answer" → teach).
const REVEAL_ENABLED = process.env.APM_EARNED_REVEAL === '1';

// Correct-verdict completeness gate: when call2 says "correct", verify every required
// component (read from the model answer) was actually attempted before confirming. Runs
// ONLY on the correct branch; flag off = today's behaviour verbatim.
const COMPLETENESS_GATE_ENABLED = process.env.APM_COMPLETENESS_GATE === '1';

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
interface AnthropicMessage { content: Array<{ type: string } | TextBlock> }

function extractText(res: unknown): string {
  const msg = res as AnthropicMessage;
  const block = msg.content.find((b): b is TextBlock => b.type === 'text');
  if (!block) throw new Error('No text block in Anthropic response');
  return block.text;
}

// ── CALL 1: Generate model answer (fallback only) ─────────────────────────────

async function call1_generate(question: string, context: string): Promise<string> {
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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const msLine = markScheme
    ? `Authored mark scheme (use to identify WHICH criterion/level the student missed; do NOT quote it or state the answer):\n${markScheme}\n\n`
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 40,
    system:
      'You are a precision gap-labeller. Output ONE short label — hard limit 12–15 words, count them — ' +
      "that names what the student did wrong, using the student's error as the referent. " +
      'EQUIVALENCE CHECK — do this before naming any error: ' +
      'The model answer and student answer may use different but equivalent sign conventions ' +
      '(standard−actual vs actual−standard), A/F labelling, table layouts, or arithmetic orderings. ' +
      "Check whether the student's numerical result is mathematically equivalent to the model's. " +
      'Only name an error if the answer is genuinely WRONG — not merely presented in a different convention. ' +
      'A correct answer in a different format is NOT an error and must NOT be flagged. ' +
      "If the student's answer is correct, output: \"answer correct — convention differs from model only\" " +
      'ABSOLUTE RULES: ' +
      '(1) NEVER state the correct answer or any corrected fact, even implicitly. ' +
      '(2) Name the faulty mental model or wrong operation the student applied. ' +
      '(3) Output ONLY the label — no prose, no prefix, no explanation. ' +
      'BAD (forbidden): any phrase that states the correct answer.',
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          msLine +
          `Model answer (reference only — do NOT restate or correct in output):\n${modelAnswer}\n\n` +
          'Output the gap label only. Name the error pattern. Do not state what is correct.',
      },
    ],
  });
  return extractText(res);
}

// ── CALL 3: Hint (first miss) ─────────────────────────────────────────────────

async function call3_hint(
  question: string,
  context: string,
  attempt: string,
  diagnosis: string,
  verbLevel: string,
  paper: string,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel
    ? `Authored command verb + intellectual level (name these — do not infer):\n${verbLevel}\n\n`
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    system: systemFor(paper),
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          vlLine +
          'First miss. Lead with the ONE specific thing they got right — name the real move, not ' +
          'vague praise — then name the single sharpest gap (just one, not a list) and one next ' +
          'move. Punchy and conversational, 2 sentences, like a tutor in their corner, not a ' +
          'structured breakdown. Work in the command verb and ACCA intellectual level from the ' +
          "authored values above (do not infer them when given). Don't state the answer.",
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
  paper: string,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel
    ? `Authored command verb + intellectual level (diagnose against these — do not infer):\n${verbLevel}\n\n`
    : '';
  // Earned-reveal nudge — only when struggle-gated (offerReveal). Tells the student the
  // phrase that unlocks the reveal; the teach itself still withholds the answer.
  const offerLine = offerReveal
    ? ' As the alternative next move, tell them they can say "show me the full answer" to see exactly how a full-marks answer is built.'
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400, // physical cap on lecture sprawl (was 600); wording caps are only nudges
    system: systemFor(paper),
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          vlLine +
          "Second miss or stop-signal — they haven't cracked it yet. Still don't lecture: lead with " +
          'the specific thing that IS working, then name the ONE gap that matters most (one, sharply ' +
          '— not a list of four) and the single next move that unblocks it. Conversational prose, 3 ' +
          'sentences, 4 at the most — no numbered points or structured breakdown, a sharp tutor ' +
          'talking not a marked script. Use the authored command verb and ACCA intellectual level ' +
          'above (do not infer when given) to pin the gap accurately. Do not complete the answer or give the figures.' +
          offerLine,
      },
    ],
  });
  return extractText(res);
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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel
    ? `Authored command verb + intellectual level (name what the answer hit — do not infer):\n${verbLevel}\n\n`
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: systemFor(paper),
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
          'thing they did well (the real move, not empty praise). Name the command verb and ACCA ' +
          'intellectual level the answer hit (from the authored values above — do not infer when ' +
          'given) and say briefly why it holds / what puts it in the top band. If their convention ' +
          "differs from the usual model, say it's equally valid. Do NOT restate, re-derive, or " +
          'quote back their figures or workings — they already wrote them; refer to what they did ' +
          "in words, not numbers. Don't mark it as if it fell short.",
      },
    ],
  });
  return extractText(res);
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
): Promise<string | null> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel ? `Command verb + intellectual level: ${verbLevel}\n\n` : '';
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
    'normalise it in a line, then give ONE small concrete next step (e.g. name the command verb and ' +
    'write a single sentence doing it). Then offer the alternative explicitly: tell them they can say ' +
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
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    system: systemFor(paper),
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
// Withholding is intentionally lifted here and ONLY here. It is reached solely from the
// earned-reveal branch in §7, gated by ALL of: APM_EARNED_REVEAL flag + explicit
// REVEAL_PHRASES + miss_count >= 2 (persisted, reload-proof). Do NOT call it from any other
// branch, and do NOT pass model_answer to any call3_*. It uses its OWN system prompt — NOT
// the conversational persona, whose "never complete the student's answer" guardrail is
// exactly what the student has earned past here.
//
// TWO paper-scoped designs:
//  • APM  → model-authored walkthrough of model_answer (REVEAL_SYSTEM), as before.
//  • AFM  → design "B" (ruled 2026-07-12): the model writes ONLY a short framing wrapper
//    (REVEAL_AFM_WRAPPER_SYSTEM — no figures), and assembleAfmReveal appends the
//    code-verified model_answer VERBATIM. Figure integrity is structural (byte-equality,
//    fixture-enforced), and the multi-table worked answer is never truncated by a token cap.
async function call4_reveal(
  question: string,
  context: string,
  attempt: string,
  diagnosis: string,
  modelAnswer: string,
  paper: string,
  fullReveal: string,
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';

  if (paper === 'AFM') {
    // Authored misconception reframe (AFM full_reveal — pre-baked, 3–5 sentences). Anchors the
    // wrapper's "name the misconception" beat. Empty when the column is null → omitted.
    const reframeLine = fullReveal
      ? `Authored misconception reframe (name this and correct the thinking):\n${fullReveal}\n\n`
      : '';
    const res = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 300, // wrapper only — the worked answer is appended verbatim, not generated
      system: REVEAL_AFM_WRAPPER_SYSTEM,
      messages: [
        {
          role: 'user',
          content:
            `${contextLine}Question: ${question}\n\n` +
            `Their last attempt: ${attempt}\n\n` +
            `The gap they kept missing: ${diagnosis}\n\n` +
            reframeLine +
            'Write ONLY the short framing wrapper now — credit what they had, name and correct the ' +
            'misconception, and point them to a fresh application. Do NOT include any figures or the ' +
            'worked answer; the verified worked answer is appended verbatim below your message.',
        },
      ],
    });
    return assembleAfmReveal(extractText(res), modelAnswer);
  }

  // APM — model-authored walkthrough of the stored model_answer (unchanged pre-G3 behaviour).
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

// ── POST handler ──────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<Response> {
  if (!process.env.TUTOR_SESSION_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // ── 1. Auth ────────────────────────────────────────────────────────────────
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
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
  // id is the PRIMARY KEY (globally unique across papers), so an id-addressed fetch needs
  // NO paper_code filter — the row's own paper_code IS the paper, and filtering by a guessed
  // paper is exactly what made AFM ids 404 before G1. An lo-addressed fetch (legacy fallback)
  // MUST scope by paper: AFM and APM LO codes collide, and paper_code is the only separator.
  // paper comes from the request body (default APM via resolvePaper).
  const drillSelect = () => supabase
    .from('acca_drills')
    .select('question, context_text, model_answer, marks_guide, command_verb, intellectual_level, lo_code, paper_code, full_reveal')
    .eq('exam_board', 'ACCA')
    .eq('status', 'approved')
    .eq('published', true);

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
  // (systemFor / revealSystemFor). Until G1 threads a paper into the fetch, drillBase is
  // still 'APM'-scoped so this resolves to 'APM' in production; the branch is live and
  // testable by fetching an AFM row. Unknown/null → 'APM' (established default).
  const paper             = (drill.paper_code as string | null) ?? 'APM';
  // AFM full_reveal (pre-baked misconception reframe); null for APM drills → '' → omitted.
  const fullReveal        = (drill.full_reveal as string | null) ?? '';

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
  const verbLevel = [
    drill.command_verb       ? `Command verb (authored): ${drill.command_verb as string}` : '',
    drill.intellectual_level ? `ACCA intellectual level demanded (authored): ${drill.intellectual_level}` : '',
  ].filter(Boolean).join('\n');

  const markScheme = [
    verbLevel,
    drill.marks_guide ? `Marks guidance (authored — criteria that earn marks):\n${drill.marks_guide as string}` : '',
  ].filter(Boolean).join('\n');

  // ── 4. Read profile (cap counter + subscription state) ────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_teach_throughs_used, apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  const usedCount = (profile?.apm_teach_throughs_used as number | null) ?? 0;
  const hasActiveAccess =
    profile?.apm_subscription_status === 'active' ||
    (profile?.apm_pass_expires_at &&
      new Date(profile.apm_pass_expires_at as string) > new Date());

  // ── 5. Establish model answer + session continuity ─────────────────────────
  let modelAnswer: string;
  let teachThroughCounted = false;
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
      } catch {
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

  // ── 6. Cap gate ────────────────────────────────────────────────────────────
  // Allow the request when ANY of these is true:
  //   a) user has an active subscription or unexpired pass
  //   b) teach-through count is below the free limit
  //   c) this is a FOLLOW-UP TURN on the drill that already consumed a cap slot
  //      (teachThroughCounted=true inside the sealed enc — tamper-proof)
  //
  // Case (c) is the option-b boundary: a student who just received their 3rd
  // teach-through can keep asking Ezra follow-up questions on that same drill.
  // The cap wall fires only when they load a NEW drill (session_state = null,
  // teachThroughCounted = false → gate fails → 403).

  const isFreeFollowUp = teachThroughCounted; // sealed inside AES-256-GCM, not forgeable
  const allowed = hasActiveAccess || usedCount < 3 || isFreeFollowUp;

  if (!allowed) {
    return NextResponse.json({ error: 'cap_hit' }, { status: 403 });
  }

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
  const wantsReveal = REVEAL_ENABLED && isRevealRequest(student_message);
  const fastTeach   = INTENT_LAYER_ENABLED ? isTeachRequest(student_message) : isStopSignal(student_message);

  try {
    if (wantsReveal && missCount >= 2) {
      // EARNED — the sole gated moat-lift; model_answer reaches the student ONLY here.
      // Free follow-up: the miss-2 teach-through already charged the cap (counted=true), so
      // no new charge. Marks the drill resolved. No miss++, no teachThroughDelivered.
      intent = 'reveal';
      messageKind = 'reveal';
      ezraResponse = await call4_reveal(question, context, lastRealAttempt ?? student_message, lastDiagnosis ?? '', modelAnswer, paper, fullReveal);
      newResolved = true;
    } else if (wantsReveal) {
      // Reveal requested but NOT earned (missCount < 2): static refusal gate. model_answer is
      // deliberately NOT referenced on this path — earned-not-dumped is structural, not prompt.
      intent = 'reveal_redirect';
      messageKind = 'reveal_locked';
      ezraResponse = EARN_REDIRECT;
    } else if (fastTeach) {
      intent = 'teach_request';
      messageKind = 'teaching';
      const contextAttempt = lastRealAttempt ?? student_message;
      const diagnosis      = lastDiagnosis ?? 'student requested answer without re-attempting';
      ezraResponse = await call3_teach(question, context, contextAttempt, diagnosis, verbLevel, REVEAL_ENABLED && missCount >= 2, paper);
      teachThroughDelivered = true;
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
      } else {
        // ── THE MOAT — existing withholding pipeline, unchanged ──
        const diagnosis  = await call2_diagnose(question, context, student_message, modelAnswer, markScheme);

        // Completeness gate (behind APM_COMPLETENESS_GATE): call2 verified the NUMBERS; this
        // verifies every required component was attempted. Runs ONLY when call2 says correct, so
        // the wrong/convention paths stay byte-identical. A clearly-absent component demotes the
        // correct verdict to a miss whose gap NAMES the missing component (case 2).
        let completenessGap: string | null = null;
        if (COMPLETENESS_GATE_ENABLED && isCorrectVerdict(diagnosis)) {
          completenessGap = await completenessCheck(question, context, modelAnswer, student_message, verbLevel);
        }
        const treatCorrect = isCorrectVerdict(diagnosis) && !completenessGap;

        if (treatCorrect) {
          // Correct answer. Acknowledge it — do NOT score a miss, do NOT deliver a
          // gap-hint, do NOT set teachThroughDelivered (so §8 never charges a cap slot).
          ezraResponse       = await call3_confirm(question, context, student_message, verbLevel, paper);
          messageKind        = 'correct';
          attemptOutcome     = 'correct';
          newLastRealAttempt = student_message;
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
            ezraResponse = await call3_hint(question, context, student_message, gap, verbLevel, paper);
            messageKind = 'hint';
          } else {
            ezraResponse = await call3_teach(question, context, student_message, gap, verbLevel, REVEAL_ENABLED && newMissCount >= 2, paper);
            teachThroughDelivered = true;
            messageKind = 'teaching';
          }
        }
      }
    }
  } catch {
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
      .update({ apm_teach_throughs_used: newCount })
      .eq('id', user.id);
    newTeachThroughCounted = true;
    capNowHit = newCount >= 3;
  }

  // ── 9. Seal updated session state ─────────────────────────────────────────
  const updatedSessionState: ClientSessionState = {
    enc:               sealPayload(modelAnswer, newTeachThroughCounted),
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
    }
  }

  // ── 10b. Transcript persistence (append-only, best-effort) ──────────────────
  // One row per message (user + assistant) → acca_drill_messages. Logs EVERY
  // response-producing leg (attempt / hint / teach / correct / warm / reveal); the
  // assistant row carries call_type (= messageKind), outcome, drill_id. drill_id may be
  // null (legacy client — schema allows it), so this is NOT gated on drillId. Swallowed
  // exactly like the attempt-log above — a write failure must never block or 500 the
  // teach path, and a CHECK never rejects an unlisted call_type (column is unconstrained).
  try {
    await supabase.from('acca_drill_messages').insert([
      { user_id: user.id, drill_id: drillId, role: 'user',      content: student_message, call_type: null,        outcome: null },
      { user_id: user.id, drill_id: drillId, role: 'assistant', content: ezraResponse,    call_type: messageKind, outcome: attemptOutcome },
    ]);
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
  });
}
