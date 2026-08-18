import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import Anthropic from '@anthropic-ai/sdk';
import { Resend } from 'resend';
import { createServiceClient } from '@/lib/supabase/server';
import {
  computeProfile,
  getTopicGroupIds,
  getHabitQuestions,
  type Rating,
  type ResitInputs,
  type ResitProfile,
} from '@/lib/acca/resit-engine';
import { servedPaper, type ServedPaper } from '@/lib/acca/paper';
import { buildResitPlanEmail } from '@/lib/email/resit-plan-template';
import { notifyGrant } from '@/lib/notify';

// Free, no-auth diagnostic for /acca/resit. Two actions on one route:
//   action: 'plan'    → validate, compute profile (CODE), narrate (Haiku), return.
//                       No DB write — a lead row exists only once they give an email.
//   action: 'capture' → recompute profile (deterministic), insert resit_leads,
//                       email the plan. This is the email-capture moment.
// The model NEVER decides the profile; it only narrates the profile code produced.
//
// ── PAPER IS REQUIRED AND NEVER DEFAULTED (2026-08-08) ───────────────────────
// `strictPaper` is used, NOT `resolvePaper`. resolvePaper defaults an absent paper
// to APM, which is correct for content scoping and catastrophic here: AFM and APM
// lo_code prefixes collide exactly (B1, B2, B3, B4 are live in both), so a missing
// paper would silently profile an AFM sitter against APM's corpus and route them
// into APM drills. An absent or unrecognised paper is a 400, never a fallback.
// Topic-group ids are validated against THAT paper's set for the same reason.

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITTING_RE = /^(Mar|Jun|Sep|Dec) \d{4}$/;
const RATINGS = new Set<Rating>(['weak', 'mixed', 'ok']);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

// ── Validation ────────────────────────────────────────────────────────────────

function parseInputs(body: Record<string, unknown>, paper: ServedPaper): ResitInputs | null {
  const { score, sitting, attempts, topic_ratings, habit_answers } = body;

  if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 49) return null;
  if (typeof sitting !== 'string' || !SITTING_RE.test(sitting)) return null;
  if (typeof attempts !== 'number' || !Number.isInteger(attempts) || attempts < 1 || attempts > 20) return null;

  // Group ids must belong to THIS paper. A well-formed id from the other paper is
  // a refusal, not a silently-dropped key — the client is out of step with the
  // surface and finishing the run would produce a profile keyed to nothing.
  const groupIds = getTopicGroupIds(paper);
  if (typeof topic_ratings !== 'object' || topic_ratings === null || Array.isArray(topic_ratings)) return null;
  const ratings: Record<string, Rating> = {};
  for (const [k, v] of Object.entries(topic_ratings as Record<string, unknown>)) {
    if (!groupIds.has(k)) return null;
    if (typeof v !== 'string' || !RATINGS.has(v as Rating)) return null;
    ratings[k] = v as Rating;
  }

  // Every one of this paper's six habits is required, and only this paper's.
  if (typeof habit_answers !== 'object' || habit_answers === null || Array.isArray(habit_answers)) return null;
  const habits: Record<string, 'a' | 'b' | 'c'> = {};
  for (const q of getHabitQuestions(paper)) {
    const v = (habit_answers as Record<string, unknown>)[q.habit];
    if (v !== 'a' && v !== 'b' && v !== 'c') return null;
    habits[q.habit] = v;
  }

  return { score, sitting, attempts, topic_ratings: ratings, habit_answers: habits };
}

// ── Narrative (Haiku narrates the CODE-decided profile) ───────────────────────

function narrativeSystem(paper: ServedPaper): string {
  const shared =
    'A separate scoring engine has ALREADY decided their weak areas and their bad exam ' +
    'habits — these are FIXED FACTS. Your only job is to narrate a short, practical resit ' +
    'plan from the profile you are given. ' +
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
    'End by pointing them at the free drills. ' +
    `ACCA ${paper} has no letter grades — never reference grades (A, B, C etc.); results are a ` +
    'mark out of 100 with a pass at 50. Do not reference mark schemes as something the ' +
    'candidate sees in the exam.';

  return paper === 'AFM'
    ? 'You are Ezra, a straight-talking ACCA AFM coach. A candidate has just failed AFM and ' +
      'completed a short diagnostic. ' + shared +
      ' AFM is the numeric paper: where a habit concerns the candidate\'s own calculated ' +
      'figures, treat carrying those figures into the written argument as the priority move. ' +
      'Never imply their arithmetic must match a model answer to earn marks — credit follows ' +
      'their own workings.'
    : 'You are Ezra, a straight-talking ACCA APM coach. A candidate has just failed APM and ' +
      'completed a short diagnostic. ' + shared;
}

function profileToText(paper: ServedPaper, inputs: ResitInputs, profile: ResitProfile): string {
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
    `Last ${paper} score: ${inputs.score}/100 (a fail; pass is 50). This is ${bandLine}.`,
    `Sitting attempted: ${inputs.sitting}. Number of attempts so far: ${inputs.attempts}.`,
    '',
    'WEAK AREAS (ranked, most important first):',
    weak,
    '',
    'HABITS TO FIX (ranked, most severe first):',
    habits,
  ].join('\n');
}

async function generatePlan(paper: ServedPaper, inputs: ResitInputs, profile: ResitProfile): Promise<string> {
  const res = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 600,
    system: narrativeSystem(paper),
    messages: [
      {
        role: 'user',
        content: `Here is the candidate's diagnostic profile. Narrate their resit plan.\n\n${profileToText(paper, inputs, profile)}`,
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

  // Refuse rather than default. See the header block.
  // servedPaper, not strictPaper: SBL is a declared paper with no resit diagnostic, and the
  // topic groups / habit questions this route needs simply do not exist for it. Refusing by
  // TYPE here is what keeps that a 400 rather than an empty profile keyed to nothing.
  const paper = servedPaper(body.paper);
  if (!paper) {
    return NextResponse.json({ error: 'Unknown or missing paper' }, { status: 400 });
  }

  // ── action: plan ── validate → compute (code) → narrate (model). No DB write.
  if (action === 'plan') {
    const inputs = parseInputs(body, paper);
    if (!inputs) {
      return NextResponse.json({ error: 'Invalid diagnostic answers' }, { status: 400 });
    }
    const profile = computeProfile(paper, inputs);
    let plan: string;
    try {
      plan = await generatePlan(paper, inputs, profile);
    } catch {
      return NextResponse.json({ error: 'Could not generate your plan. Please try again.' }, { status: 502 });
    }
    if (!plan) {
      return NextResponse.json({ error: 'Could not generate your plan. Please try again.' }, { status: 502 });
    }

    // Best-effort: log this anonymous diagnosis completion so we can measure top-of-funnel
    // volume + source on the primary ad CTA (most runs never leave an email, so resit_leads
    // undercounts entry). Never blocks or fails the plan response.
    try {
      const attrRaw = (await cookies()).get('gradd_attr')?.value;
      const attribution = attrRaw ? JSON.parse(decodeURIComponent(attrRaw)) : null;
      await createServiceClient().from('resit_runs').insert({
        paper_code: paper,
        score: inputs.score,
        sitting: inputs.sitting,
        attempts: inputs.attempts,
        weak_prefixes: profile.weak_prefixes,
        completed: true,
        attribution,
      });
    } catch {
      // swallow — logging must never affect the diagnostic.
    }

    return NextResponse.json({ plan, profile });
  }

  // ── action: capture ── email-capture moment: insert lead + email the plan.
  if (action === 'capture') {
    const email = body.email;
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
      return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
    }
    const inputs = parseInputs(body, paper);
    if (!inputs) {
      return NextResponse.json({ error: 'Invalid diagnostic answers' }, { status: 400 });
    }
    const plan = typeof body.plan === 'string' ? body.plan.trim() : '';
    if (!plan) {
      return NextResponse.json({ error: 'Missing plan' }, { status: 400 });
    }

    // Recompute the profile server-side — deterministic, never trust the client's.
    const profile = computeProfile(paper, inputs);
    const supabase = createServiceClient();

    const { error: insErr } = await supabase.from('resit_leads').insert({
      email: email.trim().toLowerCase(),
      paper_code: paper,
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

    // Best-effort internal alert on a warm resit lead. notifyGrant swallows all
    // errors, so this can never affect the response below.
    const weak = profile.weak_groups.map((g) => g.label).join(', ') || 'none flagged';
    await notifyGrant(
      `[Gradd] Resit lead — ${paper}`,
      `Resit lead — ${email.trim().toLowerCase()} · ${paper} · ${inputs.score}/100 · ${inputs.sitting} · weak: ${weak}`
    );

    // Email is best-effort: the lead is already captured, so a send failure must
    // not fail the request.
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { subject, html } = buildResitPlanEmail({
        paper,
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
