import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { recordAuthFailure, recordServerError } from '@/lib/acca/error-recorder';
import { hasPaperAccess } from '@/lib/acca/access';
import { resolvePaper, strictPaper } from '@/lib/acca/paper';

// ── APM case-list endpoint (case UI — list view) ──────────────────────────────
// Behind APM_CASES (default OFF). Flag off → 404 (inert; the case UI's list page
// treats a 404 as "feature not live" and redirects to /acca).
//
// Returns the header row for every SERVABLE case (status='approved' AND
// published=true — same gate as the other case/drill routes), ordered section
// desc then title. Deliberately NO exhibits, NO requirements, NO sealed fields:
// the list only needs enough to render a card and link into /acca/cases/[id].
//
// PAPER SCOPING: `paper` query param, resolved via the shared resolvePaper
// (absent/unrecognised → 'APM' — no existing APM entry point changes behaviour).
// This is the actual leak point: an unscoped SELECT on acca_cases mixes every
// paper's rows into one list, same failure class the original AFM-drill go-live
// found and fixed for acca_drills.
const CASES_ENABLED = process.env.APM_CASES === '1';

export async function GET(request: Request): Promise<Response> {
  if (!CASES_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const paper = resolvePaper(searchParams.get('paper'));
  // Strict paper for the LOCK decision — see app/api/acca/case/route.ts for why the
  // gate must not inherit resolvePaper's APM default. This route does not 402; it
  // returns `locked` per case, so an absent paper is a 400 rather than a silent
  // "everything is unlocked".
  const gatePaper = strictPaper(searchParams.get('paper'));
  if (!gatePaper) {
    return NextResponse.json(
      { error: 'paper query parameter is required (APM or AFM)' },
      { status: 400 },
    );
  }

  const authClient = await createServerClient();
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  // An OUTAGE records; a logged-out request does not. `recordAuthFailure` owns that
  // distinction (`isAuthOutage`) — an unfiltered version would write a row on every
  // anonymous hit, because no session is itself an AuthSessionMissingError.
  if (authError) await recordAuthFailure('api/acca/case/list', authError);
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const supabase = createServiceClient();

  // Subscription state → per-case `locked` flag. The list stays visible to free
  // users (they see every case and its shape); `locked` drives the upsell CTA and
  // is authoritative on the client only for presentation — the hard gate lives on
  // the case/turn/mark routes.
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  const locked = !(await hasPaperAccess(supabase, user.id, gatePaper, profile));

  // mock_only cases are reserved for the timed-mock paper and never surface in the
  // free-standing case list. The load/turn/mark routes still serve them normally
  // (they're approved+published) — the exclusion is list-level only.
  const { data: cases, error } = await supabase
    .from('acca_cases')
    .select('id, title, section, anchor_area, total_marks, professional_skills_marks, response_format')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .eq('mock_only', false)
    .order('section', { ascending: false })
    .order('title', { ascending: true });

  if (error) {
    await recordServerError('case_list', 'api/acca/case/list', error, user.id);
    return NextResponse.json({ error: 'Failed to load cases' }, { status: 500 });
  }

  return NextResponse.json({ cases: (cases ?? []).map((c) => ({ ...c, locked })) });
}
