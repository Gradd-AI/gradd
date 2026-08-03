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

const EZRA_SYSTEM =
  'You are Ezra, an APM tutor who knows exactly how ACCA APM is marked. ' +
  'Register: peer-to-peer — the student is a competent professional failing for diagnosable, ' +
  'fixable reasons, not through lack of knowledge. ' +
  'Diagnostic frame: APM candidates know the models. They lose marks on APPLICATION ' +
  '(failing to deploy the model on the specific scenario facts) and EVALUATION ' +
  '(failing to give a supported professional judgement when the verb demands one), ' +
  'and by stopping at description when the requirement demanded judgement. ' +
  // The persona itself used to name the taxonomy. Removed 2026-08-01 with the rest of the fence —
  // an instruction elsewhere not to say "intellectual level 3" loses to a persona that says the
  // model should reason in those terms.
  'Use what the requirement demands (supplied per turn) to orient the student on what the ' +
  'question is really asking — not to deliver a verdict on them. Never name an internal grading ' +
  'taxonomy to the student: no intellectual levels, no AO framing, no command-verb labels. ' +
  'Professional scepticism — questioning assumptions, naming commercial risks, ' +
  'identifying constraints the model surfaces — is a substantive analytical move ' +
  'you teach explicitly, not a soft add-on. ' +
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  "No generic praise. Never complete the student's answer.";

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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const gfLine = groundedFacts ? `${groundedFacts}\n` : '';
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
  return extractText(res);
}

// ── CALL 3: Hint (first miss) ─────────────────────────────────────────────────

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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const gfLine = groundedFacts ? `${groundedFacts}\n` : '';
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
    system: EZRA_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          gfLine +
          vlLine +
          // THE PRAISE INSTRUCTION IS NOW CONDITIONAL, and that is the other half of the fix.
          // "Lead with the ONE specific thing they got right" COMPELS praise on every turn. Given
          // an answer that is wrong on the side of the trade, the model manufactures one — which
          // is where "you've correctly identified the direction — borrowers do buy futures" came
          // from. It was not ignoring the fence; it was obeying a stronger instruction. Where code
          // has established a contradiction there is no opening credit to give on that axis, so
          // the prompt stops asking for it.
          (groundedFacts.includes('CONTRADICTION FOUND')
            ? 'First miss, and the answer is on the WRONG SIDE of a settled choice stated above. ' +
              'Do NOT open by crediting them with that choice — they did not make it. Say plainly ' +
              'which way round it actually goes and why, then give one next move. If something ' +
              'else in their work is genuinely right you may say so, but never the thing the ' +
              'contradiction names.'
            : 'First miss. Lead with the ONE specific thing they got right — name the real move, ' +
              'not vague praise — then name the single sharpest gap (just one, not a list) and ' +
              'one next move.') +
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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const gfLine = groundedFacts ? `${groundedFacts}\n` : '';
  const vlLine = verbLevel
    ? `What this requirement demands (diagnose against this; do not quote it back as a label):\n${verbLevel}\n\n`
    : '';
  const offerLine = offerReveal
    ? ' As the alternative next move, tell them they can say "show me the full answer" to see exactly how a full-marks answer is built.'
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 400,
    system: EZRA_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          gfLine +
          vlLine +
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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const vlLine = verbLevel
    ? `What this requirement demands (judge what the answer hit against this; do not quote it back as a label):\n${verbLevel}\n\n`
    : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: EZRA_SYSTEM,
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
          'why it holds / what puts it in the top band. If their convention ' +
          "differs from the usual model, say it's equally valid. Do NOT restate, re-derive, or " +
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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 250,
    system: EZRA_SYSTEM,
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
  studentMessage: string;
  lastEzraMessage: string;
  missCount: number;
  lastDiagnosis: string | null;
  lastRealAttempt: string | null;
  resolved: boolean;
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
    question, context, modelAnswer, verbLevel, markScheme, groundedFacts = '',
    studentMessage, lastEzraMessage,
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
    ezraResponse = await call3_teach(question, context, contextAttempt, diagnosis, verbLevel, REVEAL_ENABLED && missCount >= 2, groundedFacts);
    teachThroughDelivered = true;
  } else {
    const classified: Intent = INTENT_LAYER_ENABLED
      ? await call0_classify(studentMessage, question, lastEzraMessage)
      : 'attempt';
    intent = classified;

    if (classified !== 'attempt') {
      ezraResponse = await call_warm(classified, studentMessage, question, context);
      messageKind = classified === 'question' ? 'answer'
                  : classified === 'confusion' ? 'coaching' : 'chat';
    } else {
      // ── THE MOAT — existing withholding pipeline, unchanged ──
      const diagnosis  = await call2_diagnose(question, context, studentMessage, modelAnswer, markScheme, groundedFacts);

      let completenessGap: string | null = null;
      if (COMPLETENESS_GATE_ENABLED && isCorrectVerdict(diagnosis)) {
        completenessGap = await completenessCheck(question, context, modelAnswer, studentMessage, verbLevel);
      }
      const treatCorrect = isCorrectVerdict(diagnosis) && !completenessGap;

      if (treatCorrect) {
        ezraResponse       = await call3_confirm(question, context, studentMessage, verbLevel);
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
          ezraResponse = await call3_hint(question, context, studentMessage, gap, verbLevel, groundedFacts);
          messageKind = 'hint';
        } else {
          ezraResponse = await call3_teach(question, context, studentMessage, gap, verbLevel, REVEAL_ENABLED && newMissCount >= 2, groundedFacts);
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
