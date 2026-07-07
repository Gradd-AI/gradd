import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import {
  computeProfile,
  TOPIC_GROUP_IDS,
  HABIT_QUESTIONS,
  type Rating,
  type ResitInputs,
  type ResitProfile,
} from '@/lib/acca/resit-engine';
import { buildResitPlanEmail } from '@/lib/email/resit-plan-template';

// Free, no-auth diagnostic for /acca/resit. Two actions on one route:
//   action: 'plan'    → validate, compute profile (CODE), narrate (Haiku), return.
//                       No DB write — a lead row exists only once they give an email.
//   action: 'capture' → recompute profile (deterministic), insert resit_leads,
//                       email the plan. This is the email-capture moment.
// The model NEVER decides the profile; it only narrates the profile code produced.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITTING_RE = /^(Mar|Jun|Sep|Dec) \d{4}$/;
const RATINGS = new Set<Rating>(['weak', 'mixed', 'ok']);
const HABIT_IDS = HABIT_QUESTIONS.map((q) => q.habit);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Validation ────────────────────────────────────────────────────────────────

function parseInputs(body: Record<string, unknown>): ResitInputs | null {
  const { score, sitting, attempts, topic_ratings, habit_answers } = body;

  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 49) return null;
  if (typeof sitting !== 'string' || !SITTING_RE.test(sitting)) return null;
  if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 1 || attempts > 20) return null;

  if (typeof topic_ratings !== 'object' || topic_ratings === null || Array.isArray(topic_ratings)) return null;
  const ratings: Record<string, Rating> = {};
  for (const [k, v] of Object.entries(topic_ratings as Record<string, unknown>)) {
    if (!TOPIC_GROUP_IDS.has(k)) return null;
    if (typeof v !== 'string' || !RATINGS.has(v as Rating)) return null;
    ratings[k] = v as Rating;
  }

  if (typeof habit_answers !== 'object' || habit_answers === null || Array.isArray(habit_answers)) return null;
  const habits: Record<string, 'a' | 'b' | 'c'> = {};
  for (const id of HABIT_IDS) {
    const v = (habit_answers as Record<string, unknown>)[id];
    if (v !== 'a' && v !== 'b' && v !== 'c') return null; // all six required
    habits[id] = v;
  }

  return { score, sitting, attempts, topic_ratings: ratings, habit_answers: habits };
}

// ── Narrative (Haiku narrates the CODE-decided profile) ───────────────────────

const NARRATIVE_SYSTEM =
  'You are Ezra, a straight-talking ACCA APM coach. A candidate has just failed APM and ' +
  'completed a short diagnostic. A separate scoring engine has ALREADY decided their weak ' +
  'areas and their bad exam habits — these are FIXED FACTS. Your only job is to narrate a ' +
  'short, practical resit plan from the profile you are given. ' +
  'Do NOT add, drop, re-rank, or second-guess the weak areas or the habits. ' +
  'Do NOT invent scores, dates, marks, or model answers. Never promise a pass. ' +
  'Write in plain British English, warm but direct, second person ("you"), 180–260 words. ' +
  'No headings, no markdown, no bullet characters — just short paragraphs. Cover, in order: ' +
  '(1) one or two honest, encouraging sentences on what the profile says overall — how far ' +
  'off a pass they are and the shape of the weakness; ' +
  '(2) the two or three habits to fix FIRST (the ones listed first are most severe), naming ' +
  'the concrete fix for each; ' +
  '(3) which topic areas to drill, by name; ' +
  '(4) a closing line framing how to use the weeks before their next sitting. ' +
  'End by pointing them at the free drills.';

function profileToText(inputs: ResitInputs, profile: ResitProfile): string {
  const bandLine =
    profile.score_band === 'narrow'
      ? 'close to the pass mark — a narrow gap'
      : profile.score_band === 'moderate'
        ? 'a moderate gap to the pass mark'
        : 'a wide gap to the pass mark';

  const weak =
    profile.weak_groups.length > 0
      ? profile.weak_groups.map((g, i) => `${i + 1}. ${g.label} (${g.rating})`).join('\n')
      : 'No single area flagged as weak — reinforce broadly.';

  const habits =
    profile.habits.length > 0
      ? profile.habits.map((h, i) => `${i + 1}. ${h.label}. Fix: ${h.fix}`).join('\n')
      : 'No strong habit flags — technique is broadly sound.';

  return [
    `Last APM score: ${inputs.score}/100 (a fail; pass is 50). This is ${bandLine}.`,
    `Sitting attempted: ${inputs.sitting}. Number of attempts so far: ${inputs.attempts}.`,
    '',
    'WEAK AREAS (ranked, most important first):',
    weak,
    '',
    'HABITS TO FIX (ranked, most severe first):',
    habits,
  ].join('\n');
}

async function generatePlan(inputs: ResitInputs, profile: ResitProfile): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: NARRATIVE_SYSTEM,
    messages: [
      {
        role: 'user',
        content: `Here is the candidate's diagnostic profile. Narrate their resit plan.\n\n${profileToText(inputs, profile)}`,
      },
    ],
  });
  const block = res.content.find((b) => b.type === 'text');
  return block && block.type === 'text' ? block.text.trim() : '';
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const action = body.action;

  // ── action: plan ── validate → compute (code) → narrate (model). No DB write.
  if (action === 'plan') {
    const inputs = parseInputs(body);
    if (!inputs) {
      return NextResponse.json({ error: 'Invalid diagnostic answers' }, { status: 400 });
    }
    const profile = computeProfile(inputs);
    let plan: string;
    try {
      plan = await generatePlan(inputs, profile);
    } catch {
      return NextResponse.json({ error: 'Could not generate your plan. Please try again.' }, { status: 502 });
    }
    if (!plan) {
      return NextResponse.json({ error: 'Could not generate your plan. Please try again.' }, { status: 502 });
    }
    return NextResponse.json({ plan, profile });
  }

  // ── action: capture ── email-capture moment: insert lead + email the plan.
  if (action === 'capture') {
    const email = body.email;
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const inputs = parseInputs(body);
    if (!inputs) {
      return NextResponse.json({ error: 'Invalid diagnostic answers' }, { status: 400 });
    }
    const plan = typeof body.plan === 'string' ? body.plan.trim() : '';
    if (!plan) {
      return NextResponse.json({ error: 'Missing plan' }, { status: 400 });
    }

    // Recompute the profile server-side — deterministic, never trust the client's.
    const profile = computeProfile(inputs);
    const supabase = createServiceClient();

    const { error: insErr } = await supabase.from('resit_leads').insert({
      email: email.trim().toLowerCase(),
      score: inputs.score,
      sitting: inputs.sitting,
      attempts: inputs.attempts,
      topic_ratings: inputs.topic_ratings,
      habit_answers: inputs.habit_answers,
      profile,
    });

    // 23505 = unique violation — they've already captured. Treat as success and
    // still re-send the plan; any other DB error is a real failure.
    if (insErr && insErr.code !== '23505') {
      return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
    }

    // Email is best-effort: the lead is already captured, so a send failure must
    // not fail the request.
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { subject, html } = buildResitPlanEmail({
        plan,
        score: inputs.score,
        sitting: inputs.sitting,
        weakAreas: profile.weak_groups.map((g) => g.label),
      });
      await resend.emails.send({
        from: 'Ezra at Gradd <hello@gradd.ie>',
        to: email.trim().toLowerCase(),
        subject,
        html,
      });
    } catch {
      // swallow — lead is saved; the plan is already on screen for them.
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
