import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { createServiceClient } from '@/lib/supabase/server';
import anthropic from '@/lib/anthropic';

export const runtime = 'nodejs';

// ─────────────────────────────────────────────────────────────────────────────
// IP rate limiter — 30 requests / hour / IP, in-memory per instance.
// Keyed by IP so no user identity is needed for this public route.
// NOTE: does not synchronise across Vercel function instances; for a
// free-tier demo this is acceptable. If abuse surfaces, replace with a
// DB-backed approach (same pattern as lib/rateLimit.ts, but with a text key).
// ─────────────────────────────────────────────────────────────────────────────

const RATE_LIMIT   = 30;
const WINDOW_MS    = 60 * 60 * 1000; // 1 hour

const ipWindow = new Map<string, { count: number; windowStart: number }>();

function checkIpLimit(ip: string): { allowed: boolean; remaining: number } {
  const now   = Date.now();
  const entry = ipWindow.get(ip);

  if (!entry || now - entry.windowStart > WINDOW_MS) {
    ipWindow.set(ip, { count: 1, windowStart: now });
    return { allowed: true, remaining: RATE_LIMIT - 1 };
  }

  entry.count += 1;
  return { allowed: entry.count <= RATE_LIMIT, remaining: Math.max(0, RATE_LIMIT - entry.count) };
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface AnswerCheck {
  variances?:           Record<string, string>;   // calc drills
  required_elements?:   string[];                 // judgement drills
  must_include_limitation?: boolean;
  min_valid_points?:    number;
  professional_skill_tag?: string;
}

interface Misconception {
  error:   string;
  pattern: string;
}

// Full row — only fetched server-side, never returned to client verbatim
interface DrillRow {
  id:                   string;
  lo_code:              string;
  topic:                string;
  marks_guide:          number;
  student_prompt:       string;
  calculation_required: boolean;
  hint:                 string;
  full_teaching:        string;
  answer_check:         AnswerCheck;
  common_misconceptions: Misconception[];
}

// Safe fields — the only shape the client ever receives on FETCH
interface SafeDrill {
  id:                   string;
  lo_code:              string;
  topic:                string;
  marks_guide:          number;
  student_prompt:       string;
  calculation_required: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Deterministic calc checker — number AND direction (F/A label)
//
// For each expected variance (e.g. "£82,000 Adverse"):
//   1. The attempt must contain the numeric value (digit-boundary match, so
//      "6504" is not satisfied by "65040").
//   2. Within a window around that number (20 chars before, 30 chars after),
//      the CORRECT direction must be present AND the WRONG direction must not.
//
// Direction tokens accepted:
//   Adverse    → "adverse", "(a)", "adv" (whole word), or standalone "a"/"A"
//                immediately after the number (e.g. "82,000 A")
//   Favourable → "favourable"/"favorable", "(f)", "fav" (whole word), or
//                standalone "f"/"F" immediately after the number
//
// Window width (30 chars after) is intentionally narrow so a correct
// two-variance answer ("£82,000 Adverse … £42,500 Favourable") does not
// bleed the second label into the first number's direction window.
//
// "Right number, wrong direction" → returns false → hint fires and teaches F/A.
// ─────────────────────────────────────────────────────────────────────────────

function detectDirection(
  window: string,
  numOffset: number,
  numLen: number,
  direction: 'adverse' | 'favourable',
): boolean {
  const wordRe = direction === 'adverse'
    ? /adverse|\(a\)|\badv\b/
    : /favou?rable|\(f\)|\bfav\b/;
  if (wordRe.test(window)) return true;
  // Standalone single letter immediately after the number (e.g. "82,000 A")
  const letterRe = direction === 'adverse'
    ? /^[^a-z]*a(?:[^a-z]|$)/
    : /^[^a-z]*f(?:[^a-z]|$)/;
  return letterRe.test(window.slice(numOffset + numLen));
}

function checkCalcAttempt(
  attemptText: string,
  variances: Record<string, string>,
): boolean {
  // Remove £ and commas, lowercase for matching
  const normLow = attemptText.replace(/[£,]/g, '').toLowerCase();

  for (const expectedValue of Object.values(variances)) {
    // Extract digit string (e.g. "£82,000 Adverse" → "82000")
    const numStr = expectedValue.replace(/[£,]/g, '').match(/\d+/g)?.join('');
    if (!numStr) continue;

    // Number must be present, not as a substring of a larger number
    const numRegex = new RegExp(`(?<![0-9])${numStr}(?![0-9])`);
    const numPos   = normLow.search(numRegex);
    if (numPos === -1) return false;

    // Determine expected direction
    const expLow          = expectedValue.toLowerCase();
    const expectAdverse    = /adverse/.test(expLow);
    const expectFavourable = /favou?rable/.test(expLow);
    if (!expectAdverse && !expectFavourable) continue; // No direction to enforce

    // Narrow window: 20 chars before, 30 chars after
    const wStart    = Math.max(0, numPos - 20);
    const wEnd      = Math.min(normLow.length, numPos + numStr.length + 30);
    const window    = normLow.slice(wStart, wEnd);
    const numOffset = numPos - wStart;

    const hasAdverse    = detectDirection(window, numOffset, numStr.length, 'adverse');
    const hasFavourable = detectDirection(window, numOffset, numStr.length, 'favourable');

    // Correct direction must be present; wrong direction must not be present
    if (expectAdverse    && (!hasAdverse    || hasFavourable)) return false;
    if (expectFavourable && (!hasFavourable || hasAdverse))    return false;
  }

  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Haiku classifier — judgement drills only.
// Classify-only call: returns {verdict, missing}. Never generates teaching.
// ─────────────────────────────────────────────────────────────────────────────

type Verdict = 'correct' | 'partial' | 'wrong';

interface ClassifyResult {
  verdict: Verdict;
  missing: string;
}

async function classifyJudgement(
  attemptText:     string,
  requiredElements: string[],
  misconceptions:  Misconception[],
  mustIncludeLimitation: boolean,
  minValidPoints: number,
): Promise<ClassifyResult> {
  const classifyPrompt = `\
You are classifying a student's ACCA APM answer. Classify only — do NOT write teaching, hints, or the correct answer.

Required elements (what a marker rewards):
${requiredElements.map((e, i) => `${i + 1}. ${e}`).join('\n')}

Common error patterns (what wrong answers look like):
${misconceptions.map(m => `- ${m.error}: ${m.pattern}`).join('\n')}

Must include a limitation: ${mustIncludeLimitation ? 'YES' : 'NO'}
Minimum valid evaluative points needed: ${minValidPoints}

Student attempt (classify this):
"""
${attemptText.slice(0, 3000)}
"""

Rules:
- "correct"  = genuinely addresses ≥${minValidPoints} required elements with specific scenario application AND evaluation (not just description)${mustIncludeLimitation ? ' AND includes a clear limitation' : ''}
- "partial"  = addresses 1–${minValidPoints - 1} elements, OR evaluates but misses the limitation, OR describes the framework without full PM linkage
- "wrong"    = lists/defines the framework without evaluating PM impact, or is off-topic

Respond with JSON only, no other text:
{"verdict":"correct"|"partial"|"wrong","missing":"one short phrase for the most important gap, or empty string if correct"}`;

  try {
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 120,
      messages:   [{ role: 'user', content: classifyPrompt }],
    });

    const raw = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '';
    const parsed = JSON.parse(raw) as { verdict?: string; missing?: string };
    const verdict = (['correct', 'partial', 'wrong'] as Verdict[]).includes(parsed.verdict as Verdict)
      ? (parsed.verdict as Verdict)
      : 'wrong';
    return { verdict, missing: parsed.missing ?? '' };
  } catch {
    // Fail safe: treat classifier errors as 'wrong' so the hint path fires
    return { verdict: 'wrong', missing: '' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helper — rate-limit headers
// ─────────────────────────────────────────────────────────────────────────────

function rlHeaders(remaining: number) {
  return {
    'X-RateLimit-Limit':     String(RATE_LIMIT),
    'X-RateLimit-Remaining': String(remaining),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// GET — fetch a random seed drill (safe fields only)
// Supports: GET /api/acca/drill
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, remaining } = checkIpLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests — try again in an hour.' },
      { status: 429, headers: rlHeaders(0) },
    );
  }

  const service = createServiceClient();
  const { data, error } = await service
    .from('drills')
    .select('id, lo_code, topic, marks_guide, student_prompt, calculation_required')
    .eq('subject', 'ACCA_APM')
    .eq('status', 'seed');

  if (error || !data?.length) {
    return NextResponse.json({ error: 'No drills available' }, { status: 503 });
  }

  const drill = data[Math.floor(Math.random() * data.length)] as SafeDrill;
  return NextResponse.json({ drill }, { headers: rlHeaders(remaining) });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST — two actions dispatched on body.action
//
//   {action:'fetch'}  → same as GET (for clients that can't use GET with body)
//   {action:'submit', drill_id, attempt_text, attempt_number, tell_me?}
//     → evaluate attempt; apply staged reveal:
//       verdict=correct           → {stage:'correct', full_teaching}
//       attempt≥2 || tell_me=true → {stage:'reveal',  full_teaching}
//       attempt=1, wrong/partial  → {stage:'hint',     hint, missing?}
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const headersList = await headers();
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  const { allowed, remaining } = checkIpLimit(ip);

  if (!allowed) {
    return NextResponse.json(
      { error: 'rate_limited', message: 'Too many requests — try again in an hour.' },
      { status: 429, headers: rlHeaders(0) },
    );
  }

  const body = await request.json().catch(() => ({})) as Record<string, unknown>;
  const { action = 'fetch' } = body;

  const service = createServiceClient();

  // ── fetch ────────────────────────────────────────────────────────────────
  if (action === 'fetch') {
    const { data, error } = await service
      .from('drills')
      .select('id, lo_code, topic, marks_guide, student_prompt, calculation_required')
      .eq('subject', 'ACCA_APM')
      .eq('status', 'seed');

    if (error || !data?.length) {
      return NextResponse.json({ error: 'No drills available' }, { status: 503 });
    }

    const drill = data[Math.floor(Math.random() * data.length)] as SafeDrill;
    return NextResponse.json({ drill }, { headers: rlHeaders(remaining) });
  }

  // ── submit ───────────────────────────────────────────────────────────────
  if (action === 'submit') {
    const drill_id      = typeof body.drill_id     === 'string'  ? body.drill_id     : null;
    const attempt_text  = typeof body.attempt_text === 'string'  ? body.attempt_text : null;
    const attempt_number = typeof body.attempt_number === 'number' ? body.attempt_number : 1;
    const tell_me       = body.tell_me === true;

    if (!drill_id || !attempt_text) {
      return NextResponse.json(
        { error: 'drill_id (string) and attempt_text (string) are required' },
        { status: 400 },
      );
    }

    // Fetch full drill row — service role bypasses RLS
    // Only seed drills are accessible; candidates/rejected are blocked here too
    const { data: row, error: fetchErr } = await service
      .from('drills')
      .select('id, lo_code, calculation_required, hint, full_teaching, answer_check, common_misconceptions')
      .eq('id', drill_id)
      .eq('subject', 'ACCA_APM')
      .eq('status', 'seed')
      .single();

    if (fetchErr || !row) {
      return NextResponse.json({ error: 'Drill not found' }, { status: 404 });
    }

    const drill = row as DrillRow;

    // Evaluate
    let verdict: Verdict = 'wrong';
    let missing = '';

    if (drill.calculation_required) {
      // Deterministic — no model call
      const variances = drill.answer_check.variances ?? {};
      verdict = checkCalcAttempt(attempt_text, variances) ? 'correct' : 'wrong';
    } else {
      // Haiku classify-only — never generates teaching
      const result = await classifyJudgement(
        attempt_text,
        drill.answer_check.required_elements ?? [],
        drill.common_misconceptions,
        drill.answer_check.must_include_limitation ?? true,
        drill.answer_check.min_valid_points ?? 3,
      );
      verdict = result.verdict;
      missing = result.missing;
    }

    // Staged reveal — this is the rescue fix as architecture
    const rh = rlHeaders(remaining);

    if (verdict === 'correct') {
      // Correct at any attempt → earned full teaching
      return NextResponse.json({ stage: 'correct', full_teaching: drill.full_teaching }, { headers: rh });
    }

    if (attempt_number >= 2 || tell_me) {
      // Second attempt or explicit ask → reveal
      return NextResponse.json({ stage: 'reveal', full_teaching: drill.full_teaching }, { headers: rh });
    }

    // First miss → hint only; full_teaching never leaves the server
    return NextResponse.json(
      { stage: 'hint', hint: drill.hint, ...(missing ? { missing } : {}) },
      { headers: rh },
    );
  }

  return NextResponse.json({ error: `Unknown action: ${String(action)}` }, { status: 400 });
}
