import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';

// ── APM case-list endpoint (case UI — list view) ──────────────────────────────
// Behind APM_CASES (default OFF). Flag off → 404 (inert; the case UI's list page
// treats a 404 as "feature not live" and redirects to /acca).
//
// Returns the header row for every SERVABLE case (status='approved' AND
// published=true — same gate as the other case/drill routes), ordered section
// desc then title. Deliberately NO exhibits, NO requirements, NO sealed fields:
// the list only needs enough to render a card and link into /acca/cases/[id].
const CASES_ENABLED = process.env.APM_CASES === '1';

export async function GET(): Promise<Response> {
  if (!CASES_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
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

  const locked = !hasActiveAPMAccess(profile ?? {});

  const { data: cases, error } = await supabase
    .from('acca_cases')
    .select('id, title, section, anchor_area, total_marks, professional_skills_marks, response_format')
    .eq('status', 'approved')
    .eq('published', true)
    .order('section', { ascending: false })
    .order('title', { ascending: true });

  if (error) {
    return NextResponse.json({ error: 'Failed to load cases' }, { status: 500 });
  }

  return NextResponse.json({ cases: (cases ?? []).map((c) => ({ ...c, locked })) });
}
