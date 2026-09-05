import { NextResponse } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { recordAuthFailure, recordServerError } from '@/lib/acca/error-recorder';
import { hasPaperAccess } from '@/lib/acca/access';
import { getMockPaper, getMockPapers } from '@/lib/acca/mocks';
import { resolvePaper } from '@/lib/acca/paper';

// ── APM timed-mock endpoint ────────────────────────────────────────────────────
// Behind APM_CASES (default OFF). Flag off → 404 (inert; the mock page treats a
// 404 as "feature not live" and redirects to /acca). Every verb is gated on
// APM_CASES + auth + a per-paper entitlement (hasPaperAccess → 402), exactly
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
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  // An OUTAGE records; a logged-out request does not. `recordAuthFailure` owns that
  // distinction (`isAuthOutage`) — an unfiltered version would write a row on every
  // anonymous hit, because no session is itself an AuthSessionMissingError.
  if (authError) await recordAuthFailure('api/acca/mock', authError);
  if (!user) {
    return { error: NextResponse.json({ error: 'Unauthorised' }, { status: 401 }) };
  }
  const supabase = createServiceClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();
  // ── ORPHANED ROUTE, GATED CONSERVATIVELY ────────────────────────────────────
  // This endpoint has NO callers left (the mock surface moved to /api/acca/sit when
  // SitRunner replaced MockRunner). It is kept rather than deleted because deletion is
  // out of scope here, but it must not become the one paper-blind door left open.
  //
  // It has no paper to check — it never resolved one — so it now requires BOTH papers.
  // That is the safe direction for dead code: strictly harder to pass than before, and
  // it cannot grant AFM to an APM holder or vice versa. If this route is ever revived,
  // give it a real paper instead of loosening this.
  const [apm, afm] = await Promise.all([
    hasPaperAccess(supabase, user.id, 'APM', profile),
    hasPaperAccess(supabase, user.id, 'AFM', profile),
  ]);
  if (!apm || !afm) {
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
    // `!data` with no error is a row that came back empty from a `.single()` insert — no
    // error object to describe, so the surface and the route are the whole finding.
    await recordServerError('mock_start', 'api/acca/mock', error ?? new Error('insert returned no row'), g.userId);
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
    // completed_at written alongside the flip, same as the sit route's finish. Both writers
    // of `completed` must set it or an attempt's end instant depends on which surface
    // finished it — the exact inconsistency that makes a timing column untrustworthy.
    await g.supabase
      .from('acca_mock_attempts')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('user_id', g.userId)
      .eq('mock_id', mockId)
      .eq('started_at', existing.started_at);
  }
  return NextResponse.json({ ok: true });
}
