import { NextResponse } from 'next/server';
import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'node:crypto';
import Anthropic from '@anthropic-ai/sdk';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

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

const EZRA_SYSTEM =
  'You are Ezra, an APM tutor with extensive ACCA APM marking experience. ' +
  'Register: peer-to-peer — the student is a competent professional failing for diagnosable, ' +
  'fixable reasons, not through lack of knowledge. ' +
  'Diagnostic frame: APM candidates know the models. They lose marks on APPLICATION ' +
  '(failing to deploy the model on the specific scenario facts) and EVALUATION ' +
  '(failing to give a supported professional judgement when the verb demands one), ' +
  'and by stopping at intellectual level 2 when the verb demanded level 3. ' +
  'Always name the command verb, the ACCA intellectual level it demands (1, 2, or 3), ' +
  'and whether the student hit it. ACCA APM uses intellectual levels 1/2/3 — ' +
  'never use IB AO framing ("AO1", "AO5", or similar). ' +
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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
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
          'First miss. Give a pointed hint — 2–3 sentences — naming the gap without stating the ' +
          'answer. Name the command verb and the ACCA intellectual level it demands.',
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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: EZRA_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          "Second miss or stop-signal — student hasn't resolved the gap. " +
          'Give a fuller teach-through — 4–6 sentences — diagnosing the failure precisely ' +
          'against the command verb and ACCA intellectual level demanded, explaining why ' +
          'the answer stalls and redirecting. Do not complete the answer.',
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
): Promise<string> {
  const contextLine = context ? `Context: ${context}\n\n` : '';
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 300,
    system: EZRA_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `${contextLine}Question: ${question}\n\n` +
          `Student answer: ${attempt}\n\n` +
          'The answer is CORRECT — it may use a different but equivalent convention ' +
          '(sign convention, A/F labelling, layout) than a model answer would. ' +
          'Confirm it in 2–4 sentences, peer-to-peer: name the command verb and the ' +
          'ACCA intellectual level (1, 2, or 3) the answer hit, and state briefly WHY ' +
          'it holds / what puts it in the top band. If the convention differs from the ' +
          'usual model, say it is equally valid. Do NOT re-derive or restate the full ' +
          'answer, do NOT mark it as if it failed, and no generic praise — be specific ' +
          'about what they did right.',
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

  const { drill_id, drill_lo, session_state, student_message } = body as {
    drill_id?: unknown;
    drill_lo?: unknown;
    session_state?: unknown;
    student_message?: unknown;
  };

  const drillId = typeof drill_id === 'string' && drill_id ? drill_id : null;
  const drillLo = typeof drill_lo === 'string' && drill_lo ? drill_lo : null;

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
  const drillBase = () => supabase
    .from('acca_drills')
    .select('question, context_text, model_answer')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('status', 'approved')
    .eq('published', true);

  const { data: drill, error: drillErr } = await (
    drillId ? drillBase().eq('id', drillId) : drillBase().eq('lo_code', drillLo!)
  ).single();

  if (drillErr || !drill) {
    return NextResponse.json({ error: 'Drill not found' }, { status: 404 });
  }

  const question          = drill.question as string;
  const context           = (drill.context_text as string | null) ?? '';
  const storedModelAnswer = (drill.model_answer as string | null) ?? '';

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
    missCount        = typeof s.miss_count === 'number' ? s.miss_count : 0;
    lastDiagnosis    = typeof s.last_diagnosis    === 'string' ? s.last_diagnosis    : null;
    lastRealAttempt  = typeof s.last_real_attempt === 'string' ? s.last_real_attempt : null;
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

  try {
    if (isStopSignal(student_message)) {
      const contextAttempt = lastRealAttempt ?? student_message;
      const diagnosis      = lastDiagnosis ?? 'student requested answer without re-attempting';
      ezraResponse = await call3_teach(question, context, contextAttempt, diagnosis);
      teachThroughDelivered = true;
    } else {
      const diagnosis  = await call2_diagnose(question, context, student_message, modelAnswer);

      if (isCorrectVerdict(diagnosis)) {
        // Correct answer. Acknowledge it — do NOT score a miss, do NOT deliver a
        // gap-hint, do NOT set teachThroughDelivered (so §8 never charges a cap slot).
        ezraResponse       = await call3_confirm(question, context, student_message);
        newLastRealAttempt = student_message;
        // newMissCount and newLastDiagnosis intentionally left unchanged: a correct
        // turn is not a miss, and we keep the last REAL gap (if any) intact so a later
        // stop-signal teach-through still has a meaningful diagnosis to anchor on.
      } else {
        newMissCount     = missCount + 1;
        newLastDiagnosis = diagnosis;
        newLastRealAttempt = student_message;

        if (newMissCount === 1) {
          ezraResponse = await call3_hint(question, context, student_message, diagnosis);
        } else {
          ezraResponse = await call3_teach(question, context, student_message, diagnosis);
          teachThroughDelivered = true;
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

  return NextResponse.json({
    ezra_response:          ezraResponse,
    session_state:          updatedSessionState,
    teach_through_delivered: teachThroughDelivered,
    cap_now_hit:            capNowHit,
  });
}
