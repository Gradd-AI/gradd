#!/usr/bin/env tsx
/**
 * _spike_eli_exchange.ts
 * THROWAWAY SPIKE — do not wire into anything, do not import from this file.
 *
 * Proves Ezra persona + three-call structural withholding on ONE APM LO (B3d).
 * Architecture per docs/TEACHING_ARCHITECTURE.md:
 *   CALL 1  GENERATE  haiku-4-5  full model answer (stored, never passed onward)
 *   CALL 2  DIAGNOSE  sonnet-4-6 content-neutral gap label, max ~15 words, answer-free
 *   CALL 3a HINT      haiku-4-5  Ezra first-miss hint — label only, model answer absent
 *   CALL 3b TEACH     haiku-4-5  Ezra second-miss teach-through — label only, model answer absent
 */

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Hardcoded test case (B3d — apply and evaluate, L3 verb) ──────────────────

const QUESTION =
  'Apply and evaluate target costing for a manufacturer launching a new product, ' +
  'advising management on commercial viability.';

const ATTEMPT =
  'Target cost = target price minus required margin. You compare it to the estimated ' +
  'cost. If estimated cost is higher there\'s a cost gap to close. Target costing ' +
  'helps control costs at the design stage.';

// ── Ezra persona ──────────────────────────────────────────────────────────────

const EZRA_SYSTEM =
  'You are Ezra, an APM tutor with extensive ACCA APM marking experience. ' +
  'Register: peer-to-peer — the student is a competent professional failing for ' +
  'diagnosable, fixable reasons, not through lack of knowledge. ' +
  'Diagnostic frame: APM candidates know the models. They lose marks on APPLICATION ' +
  '(failing to deploy the model on the specific scenario facts) and EVALUATION ' +
  '(failing to give a supported professional judgement when the verb demands one), ' +
  'and by stopping at Level 2 analytical depth when the command verb demanded Level 3. ' +
  'You always name the command verb, state the AO depth it demands, and tell the ' +
  'student precisely whether their answer hit that depth. ' +
  'Professional scepticism — questioning assumptions, naming commercial risks, ' +
  'identifying constraints the model surfaces — is a substantive analytical move ' +
  'you teach explicitly, not a soft add-on. ' +
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  'No generic praise ("good try", "nice start", etc.). ' +
  'Never complete the student\'s answer — name the gap and redirect only.';

// ── CALL 1: Generate model answer ─────────────────────────────────────────────

async function call1_generate(): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system:
      'You are an experienced ACCA APM marker. Write a full model answer at the level ' +
      'a top-band APM candidate would produce — applied to the specific scenario, ' +
      'with professional judgement, not just model recitation.',
    messages: [
      { role: 'user', content: `Question: ${QUESTION}\n\nWrite the full model answer.` },
    ],
  });
  return extractText(res, 'call 1');
}

// ── CALL 2: Diagnose → content-neutral gap label ──────────────────────────────

async function call2_diagnose(modelAnswer: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 40,
    system:
      'You are a precision gap-labeller. Output ONE short label — hard limit 12–15 words, count them — ' +
      'that names what the student did wrong, using the student\'s error as the referent. ' +
      'ABSOLUTE RULES: ' +
      '(1) NEVER state the correct answer or any corrected fact, even implicitly. ' +
      '(2) Name the faulty mental model or wrong operation the student applied. ' +
      '(3) Output ONLY the label — no prose, no prefix ("The student...", "Gap:", etc.), ' +
      'no explanation, no trailing sentence. ' +
      'GOOD labels: "applied normal-good income logic to an inferior good" / ' +
      '"stopped at L2 description of mechanism, skipped application and evaluation". ' +
      'BAD (forbidden — states the answer): any phrase containing the correct answer or a corrected fact.',
    messages: [
      {
        role: 'user',
        content:
          `Question: ${QUESTION}\n\n` +
          `Student answer: ${ATTEMPT}\n\n` +
          `Model answer (reference only — do NOT restate or correct the student in your output):\n${modelAnswer}\n\n` +
          'Output the gap label only. Name the error pattern. Do not state what is correct.',
      },
    ],
  });
  return extractText(res, 'call 2');
}

// ── CALL 3a: Ezra — first miss, hint ─────────────────────────────────────────

async function call3a_hint(diagnosis: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 350,
    system: EZRA_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `Question: ${QUESTION}\n\n` +
          `Student answer: ${ATTEMPT}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          'First attempt. Give a pointed hint — 2–3 sentences — naming the specific gap ' +
          'without stating the answer. Name the command verb and the AO depth it demands.',
      },
    ],
  });
  return extractText(res, 'call 3a');
}

// ── CALL 3b: Ezra — second miss, teach-through ────────────────────────────────

async function call3b_teach(diagnosis: string): Promise<string> {
  const res = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: EZRA_SYSTEM,
    messages: [
      {
        role: 'user',
        content:
          `Question: ${QUESTION}\n\n` +
          `Student answer: ${ATTEMPT}\n\n` +
          `Gap diagnosis: ${diagnosis}\n\n` +
          'The student has seen the hint and still hasn\'t resolved the gap. ' +
          'Give a fuller teach-through — 4–6 sentences — diagnosing the failure precisely ' +
          'against the command verb and AO depth demanded, explaining why the current ' +
          'answer stalls at L2, and redirecting without completing the answer.',
      },
    ],
  });
  return extractText(res, 'call 3b');
}

// ── Utility ───────────────────────────────────────────────────────────────────

function extractText(
  res: Awaited<ReturnType<typeof client.messages.create>>,
  label: string,
): string {
  const block = res.content.find(b => b.type === 'text');
  if (!block || block.type !== 'text') throw new Error(`No text block in ${label} response`);
  return block.text;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const HR = '═'.repeat(72);
  const hr = '─'.repeat(72);

  console.log(HR);
  console.log('SPIKE: Ezra APM Exchange — Structural Withholding + Persona');
  console.log('LO: B3d  |  Command verb: Apply and evaluate (L3)');
  console.log(HR);
  console.log();
  console.log(`Q:       ${QUESTION}`);
  console.log(`ATTEMPT: ${ATTEMPT}`);
  console.log();

  console.log(hr);
  console.log('CALL 1 — MODEL ANSWER  [haiku-4-5 | stored; never reaches call 2 output or call 3]');
  console.log(hr);
  const modelAnswer = await call1_generate();
  console.log(modelAnswer);
  console.log();

  console.log(hr);
  console.log('CALL 2 — GAP LABEL  [sonnet-4-6 | answer-free; precision step]');
  console.log(hr);
  const diagnosis = await call2_diagnose(modelAnswer);
  console.log(diagnosis);
  console.log();

  console.log(hr);
  console.log('CALL 3a — EZRA HINT / FIRST MISS  [haiku-4-5 | model answer: ABSENT]');
  console.log(hr);
  const hint = await call3a_hint(diagnosis);
  console.log(hint);
  console.log();

  console.log(hr);
  console.log('CALL 3b — EZRA TEACH-THROUGH / SECOND MISS  [haiku-4-5 | model answer: ABSENT]');
  console.log(hr);
  const teaching = await call3b_teach(diagnosis);
  console.log(teaching);
  console.log();

  console.log(HR);
  console.log('CHECK:');
  console.log('  (1) Gap label: answer-free? Names the error without stating the correct answer?');
  console.log('  (2) Ezra hint: right register? Names command verb + AO depth? Sharp on work?');
  console.log('  (3) Ezra teach-through: lands L2-stop diagnosis? No answer completion?');
  console.log(HR);
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
