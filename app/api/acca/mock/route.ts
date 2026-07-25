import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';
import { getMockPaper, getMockPapers } from '@/lib/acca/mocks';
import { resolvePaper } from '@/lib/acca/paper';

// ── APM timed-mock endpoint ────────────────────────────────────────────────────
// Behind APM_CASES (default OFF). Flag off → 404 (inert; the mock page treats a
// 404 as "feature not live" and redirects to /acca). Every verb is gated on
// APM_CASES + auth + an active APM entitlement (hasActiveAPMAccess → 402), exactly
// like the case routes — mocks are part of the subscription.
//
//   GET   → list papers (id, title, duration, case count) + the user's latest attempt
//   POST  {mock_id} → start (or resume an open attempt): row with ends_at = now + duration
//   PATCH {mock_id} → mark the user's open attempt completed (results screen reached)
//
// The clock is server-authoritative: ends_at is the source of truth, the client
// only ticks the display. This route NEVER touches Stripe/webhook/engine code.
//
// PAPER SCOPING: GET's paper listing is scoped by `paper` (query param,
// resolvePaper, default 'APM') via getMockPapers — the same class of leak as the
// unscoped acca_cases list, in code config instead of a table. POST/PATCH are
// id-addressed via getMockPaper(mock_id); mock_id strings are unique by
// construction, so no cross-paper collision risk exists there.
const CASES_ENABLED = process.env.APM_CASES === '1';

interface AttemptRow {
  mock_id: string;
  started_at: string;
  ends_at: string;
  completed: boolean;
}

// Shared gate: flag → 404, auth → 401, entitlement → 402. Returns either an early
// Response (caller returns it) or the authed user id + a service client.
async function gate(): Promise<
  | { error: Response }
  | { userId: string; supabase: SupabaseClient }
> {
  if (!CASES_ENABLED) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) };
  }
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();
  if (!hasActiveAPMAccess(profile ?? {})) {
    return { error: NextResponse.json({ error: 'subscription_required' }, { status: 402 }) };
  }
  return { userId: user.id, supabase };
}

async function latestAttempt(supabase: SupabaseClient, userId: string): Promise<AttemptRow | null> {
  const { data } = await supabase
    .from('acca_mock_attempts')
    .select('mock_id, started_at, ends_at, completed')
    .eq('user_id', userId)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AttemptRow | null) ?? null;
}

export async function GET(request: Request): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;

  const { searchParams } = new URL(request.url);
  const paper = resolvePaper(searchParams.get('paper'));

  const papers = getMockPapers(paper).map((p) => ({
    id: p.id,
    title: p.title,
    duration_minutes: p.duration_minutes,
    case_count: p.case_ids.length,
  }));

  const attempt = await latestAttempt(g.supabase, g.userId);
  return NextResponse.json({ papers, attempt });
}

export async function POST(request: Request): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { mock_id } = body as { mock_id?: unknown };
  const mockId = typeof mock_id === 'string' && mock_id ? mock_id : null;
  const paper = mockId ? getMockPaper(mockId) : null;
  if (!paper) {
    return NextResponse.json({ error: 'unknown mock_id' }, { status: 400 });
  }

  // Resume rather than start twice: if an open, uncompleted attempt with time left
  // exists for this paper, return it (a refresh / double-click never resets the
  // clock). Otherwise insert a fresh attempt.
  const existing = await latestAttempt(g.supabase, g.userId);
  const now = Date.now();
  if (
    existing &&
    existing.mock_id === mockId &&
    !existing.completed &&
    new Date(existing.ends_at).getTime() > now
  ) {
    return NextResponse.json({ attempt: existing, resumed: true });
  }

  const startedAt = new Date(now).toISOString();
  const endsAt = new Date(now + paper.duration_minutes * 60_000).toISOString();
  const { data, error } = await g.supabase
    .from('acca_mock_attempts')
    .insert({
      user_id: g.userId,
      mock_id: mockId,
      started_at: startedAt,
      ends_at: endsAt,
      completed: false,
    })
    .select('mock_id, started_at, ends_at, completed')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Failed to start mock' }, { status: 500 });
  }
  return NextResponse.json({ attempt: data as AttemptRow, resumed: false });
}

export async function PATCH(request: Request): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { mock_id } = body as { mock_id?: unknown };
  const mockId = typeof mock_id === 'string' && mock_id ? mock_id : null;
  if (!mockId) {
    return NextResponse.json({ error: 'mock_id required' }, { status: 400 });
  }

  // Mark the user's latest open attempt for this paper completed. Best-effort:
  // the results screen owns display, so a failed flag never blocks the response.
  const existing = await latestAttempt(g.supabase, g.userId);
  if (existing && existing.mock_id === mockId && !existing.completed) {
    await g.supabase
      .from('acca_mock_attempts')
      .update({ completed: true })
      .eq('user_id', g.userId)
      .eq('mock_id', mockId)
      .eq('started_at', existing.started_at);
  }
  return NextResponse.json({ ok: true });
}
