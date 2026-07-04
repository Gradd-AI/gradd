#!/usr/bin/env tsx
/**
 * _spike_eli_loop.ts
 * THROWAWAY SPIKE — do not wire into anything.
 *
 * Proves the Ezra session loop FIRST PIECE:
 *   - One drill (B3d, target costing)
 *   - Three-call structural withholding (docs/TEACHING_ARCHITECTURE.md)
 *   - Rescue-control miss-counting: miss 1 → hint | miss 2 → teach-through (never a second hint)
 *   - Stop-signal detection → immediate teach-through
 *
 * Two hardcoded scenarios:
 *   A: wrong → HINT  |  still wrong (different wrong) → TEACH-THROUGH
 *   B: wrong → HINT  |  "just tell me" → TEACH-THROUGH (stop-signal bypasses miss count)
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Drill ─────────────────────────────────────────────────────────────────────

const QUESTION =
  'Apply and evaluate target costing for a manufacturer launching a new product, ' +
  'advising management on commercial viability.';

// ── Hardcoded student turns ───────────────────────────────────────────────────

// Turn A1 / B1 — L2 stop, same attempt used in prior spike
const TURN_L2_STOP =
  "Target cost = target price minus required margin. You compare it to the estimated " +
  "cost. If estimated cost is higher there's a cost gap to close. Target costing " +
  "helps control costs at the design stage.";

// Turn A2 — still wrong: better surface, still no scenario application, no viability verdict
const TURN_STILL_WRONG =
  "For target costing you set the target price based on what competitors charge, " +
  "then subtract the required profit margin. If costs exceed the target you use value " +
  "engineering or supplier negotiation to close the gap. The technique forces cost " +
  "discipline from the design stage, which is harder to achieve once production starts.";

// Turn B2 — stop-signal
const TURN_STOP_SIGNAL = "Just tell me";

// ── Stop-signal detection ─────────────────────────────────────────────────────

const STOP_PHRASES = ["just tell me", "i don't know", "i give up", "no idea", "don't know"];

function isStopSignal(input: string): boolean {
  const lower = input.toLowerCase().trim();
  return STOP_PHRASES.some(p => lower.includes(p));
}

// ── Ezra persona (AO bleed fixed: APM uses intellectual levels 1/2/3, not IB AOs) ─

const EZRA_SYSTEM =
  'You are Ezra, an APM tutor with extensive ACCA APM marking experience. ' +
  'Register: peer-to-peer — the student is a competent professional failing for ' +
  'diagnosable, fixable reasons, not through lack of knowledge. ' +
  'Diagnostic frame: APM candidates know the models. They lose marks on APPLICATION ' +
  '(failing to deploy the model on the specific scenario facts) and EVALUATION ' +
  '(failing to give a supported professional judgement when the verb demands one), ' +
  'and by stopping at intellectual level 2 when the verb demanded level 3. ' +
  'Always name the command verb, the ACCA intellectual level it demands (1, 2, or 3), ' +
  'and whether the student hit it. ACCA APM uses intellectual levels 1/2/3 — ' +
  'never use IB AO framing ("AO1", "AO5", etc.). ' +
  'Professional scepticism — questioning assumptions, naming commercial risks, ' +
  'identifying constraints the model surfaces — is a substantive analytical move ' +
  'you teach explicitly, not a soft add-on. ' +
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  "No generic praise. Never complete the student's answer.";

// ── Utility ───────────────────────────────────────────────────────────────────

function extractText(
  res: Awaited<ReturnType<typeof client.messages.create>>,
  label: string,
): string {
  const block = res.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error(`No text block in ${label} response`);
  return block.text;
}

// ── CALL 1: Generate model answer (haiku; stored, never passed onward) ─────────

async function call1_generate(): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:
      'You are an experienced ACCA APM marker. Write a full model answer at the level ' +
      'a top-band APM candidate would produce — applied to the specific scenario, ' +
      'professional judgement, not just model recitation.',
    messages: [
      { role: 'user', content: `Question: ${QUESTION}\n\nWrite the full model answer.` },
    ],
  });
  return extractText(res, 'call 1');
}

// ── CALL 2: Diagnose → content-neutral gap label (sonnet; precision step) ──────

async function call2_diagnose(attempt: string, modelAnswer: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 40,
    system:
      'You are a precision gap-labeller. Output ONE short label — hard limit 12–15 words, count them — ' +
      "that names what the student did wrong, using the student's error as the referent. " +
      'ABSOLUTE RULES: ' +
      '(1) NEVER state the correct answer or any corrected fact, even implicitly. ' +
      '(2) Name the faulty mental model or wrong operation the student applied. ' +
      '(3) Output ONLY the label — no prose, no prefix, no explanation. ' +
      'BAD (forbidden): any phrase that states the correct answer.',
    messages: [
      {
        role: 'user',
        content:
          `Question: ${QUESTION}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Model answer (reference only — do NOT restate or correct in output):\n${modelAnswer}\n\n` +
          'Output the gap label only. Name the error pattern. Do not state what is correct.',
      },
    ],
  });
  return extractText(res, 'call 2');
}

// ── CALL 3 hint (haiku + Ezra; model answer absent) ───────────────────────────

async function call3_hint(attempt: string, diagnosis: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    system: EZRA_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `Question: ${QUESTION}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          'First miss. Give a pointed hint — 2–3 sentences — naming the gap without ' +
          'stating the answer. Name the command verb and the ACCA intellectual level it demands.',
      },
    ],
  });
  return extractText(res, 'call 3 hint');
}

// ── CALL 3 teach-through (haiku + Ezra; model answer absent) ──────────────────

async function call3_teach(attempt: string, diagnosis: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: EZRA_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `Question: ${QUESTION}\n\n` +
          `Student answer: ${attempt}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          "Second miss or stop-signal — student hasn't resolved the gap. " +
          'Give a fuller teach-through — 4–6 sentences — diagnosing the failure precisely ' +
          'against the command verb and ACCA intellectual level demanded, explaining why ' +
          'the answer stalls and redirecting. Do not complete the answer.',
      },
    ],
  });
  return extractText(res, 'call 3 teach');
}

// ── Loop state ────────────────────────────────────────────────────────────────

interface LoopState {
  missCount: number;
  lastDiagnosis: string | null;
  lastRealAttempt: string | null;
}

// ── Process one turn ──────────────────────────────────────────────────────────

async function processTurn(
  studentInput: string,
  modelAnswer: string,
  state: LoopState,
): Promise<{ mode: string; diagnosis: string; output: string; nextState: LoopState }> {

  if (isStopSignal(studentInput)) {
    // Reuse the prior attempt as context — "just tell me" isn't an answer to teach from
    const contextAttempt = state.lastRealAttempt ?? studentInput;
    const diagnosis = state.lastDiagnosis ?? 'student requested answer without re-attempting';
    const output = await call3_teach(contextAttempt, diagnosis);
    return { mode: 'TEACH-THROUGH [stop-signal]', diagnosis, output, nextState: { ...state } };
  }

  const diagnosis = await call2_diagnose(studentInput, modelAnswer);
  const newMissCount = state.missCount + 1;
  const nextState: LoopState = {
    missCount: newMissCount,
    lastDiagnosis: diagnosis,
    lastRealAttempt: studentInput,
  };

  if (newMissCount === 1) {
    const output = await call3_hint(studentInput, diagnosis);
    return { mode: 'HINT [miss 1]', diagnosis, output, nextState };
  } else {
    const output = await call3_teach(studentInput, diagnosis);
    return { mode: 'TEACH-THROUGH [miss 2]', diagnosis, output, nextState };
  }
}

// ── Run one scenario ──────────────────────────────────────────────────────────

async function runScenario(label: string, turns: string[], modelAnswer: string): Promise<void> {
  const HR = '═'.repeat(72);
  const hr = '─'.repeat(72);

  console.log(HR);
  console.log(`SCENARIO ${label}`);
  console.log(HR);

  let state: LoopState = { missCount: 0, lastDiagnosis: null, lastRealAttempt: null };

  for (let i = 0; i < turns.length; i++) {
    const input = turns[i];
    console.log();
    console.log(`── TURN ${i + 1} ${'─'.repeat(65 - `TURN ${i + 1}`.length)}`);
    console.log(`STUDENT:    ${input}`);
    console.log();

    const result = await processTurn(input, modelAnswer, state);
    state = result.nextState;

    console.log(`MODE FIRED: ${result.mode}`);
    console.log(`GAP LABEL:  ${result.diagnosis}`);
    console.log(hr);
    console.log(result.output);
  }

  console.log();
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const HR = '═'.repeat(72);

  console.log(HR);
  console.log('SPIKE: Ezra Session Loop — Miss-Count + Stop-Signal Routing');
  console.log('Drill: B3d  |  Checks: hint→teach, no second hint, stop→immediate teach');
  console.log(HR);
  console.log();
  console.log('Generating model answer once (stored; never reaches teaching calls)...');
  const modelAnswer = await call1_generate();
  console.log('Done.');
  console.log();

  await runScenario(
    'A — wrong → HINT | still wrong (different wrong) → TEACH-THROUGH',
    [TURN_L2_STOP, TURN_STILL_WRONG],
    modelAnswer,
  );

  await runScenario(
    'B — wrong → HINT | stop-signal → TEACH-THROUGH',
    [TURN_L2_STOP, TURN_STOP_SIGNAL],
    modelAnswer,
  );

  console.log(HR);
  console.log('ROUTING SUMMARY (expected):');
  console.log('  A / turn 1 → HINT [miss 1]          ✓?');
  console.log('  A / turn 2 → TEACH-THROUGH [miss 2]  ✓?  (not a second hint)');
  console.log('  B / turn 1 → HINT [miss 1]           ✓?');
  console.log('  B / turn 2 → TEACH-THROUGH [stop]    ✓?  (bypasses miss count)');
  console.log(HR);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
