import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';
import { resolvePaper } from '@/lib/acca/paper';

// ── APM case-load endpoint (redesign P0 item 1 — case-scope construct) ─────────
// Behind APM_CASES (default OFF). Flag off → 404 (endpoint is inert; the proven
// single-drill path is entirely unaffected — it never calls this route).
//
// Returns a case for the exam-style integrated layer: the shared scenario, its
// exhibits (ordered), and its requirements (ordered). CRITICAL WITHHOLD DISCIPLINE:
// requirements are returned to the client WITHOUT model_answer / hint / full_reveal —
// those stay server-side and are only ever sealed (per-requirement) by the case-turn
// handler, exactly as a drill's model_answer is. Same serving gate as the three
// existing drill routes: status='approved' AND published=true.
//
// PAPER SCOPING: case_id is a globally-unique PK, so an id-addressed fetch can't
// accidentally return a wrong-paper row — but `paper` (resolvePaper, default
// 'APM') is still checked so a cross-paper deep link 404s instead of silently
// serving an AFM case into an APM-styled shell (or vice versa), consistent with
// the paper_code check on every other case route.
const CASES_ENABLED = process.env.APM_CASES === '1';

export async function GET(request: Request): Promise<Response> {
  if (!CASES_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('case_id');
  const paper = resolvePaper(searchParams.get('paper'));
  if (!caseId) {
    return NextResponse.json({ error: 'case_id required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── Subscription gate (hard) ──
  // Exam cases require an active APM subscription / unexpired pass. Checked after
  // auth, before any case content is served. 402 → the client renders the upsell.
  // The case title IS returned alongside the 402 so the upsell can name the case —
  // titles are already public via the list endpoint, so this leaks nothing.
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  if (!hasActiveAPMAccess(profile ?? {})) {
    const { data: locked } = await supabase
      .from('acca_cases')
      .select('title')
      .eq('id', caseId)
      .eq('paper_code', paper)
      .eq('status', 'approved')
      .eq('published', true)
      .single();
    return NextResponse.json(
      { error: 'subscription_required', title: locked?.title ?? null },
      { status: 402 },
    );
  }

  // ── Case header ──
  // Gate on status='approved' AND published=true (matches the drill serving routes).
  const { data: caseRow, error: caseErr } = await supabase
    .from('acca_cases')
    .select('id, title, scenario_intro, response_format, total_marks, professional_skills_marks, status, published')
    .eq('id', caseId)
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (caseErr || !caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  // ── Exhibits (ordered) ──
  // No sealed content — exhibits are the shared scenario data the student is meant to
  // read. Select * so exhibit content columns pass through without this route needing
  // to know their exact names; ordered by exhibit_order.
  const { data: exhibits } = await supabase
    .from('acca_case_exhibits')
    .select('*')
    .eq('case_id', caseId)
    .order('exhibit_order', { ascending: true });

  // ── Requirements (ordered) — WITHHELD fields excluded ──
  // Deliberately does NOT select model_answer / hint / full_reveal: those reach the
  // student only via the per-requirement AES seal in the case-turn handler, same
  // discipline as drills. Everything selected here is safe to render client-side.
  const { data: requirements } = await supabase
    .from('acca_case_requirements')
    .select('id, requirement_order, label, question, marks_guide, command_verb, intellectual_level, lo_code, professional_skill_tags')
    .eq('case_id', caseId)
    .order('requirement_order', { ascending: true });

  // ── Progress (this user, this case) — resume support ──
  // Only the flags the client needs to rebuild stepper state on reload: passed /
  // resolved / miss_count. Deliberately NOT final_answer or any diagnosis text —
  // chat history is not restored, and no sealed/authored content leaks here.
  const { data: progress } = await supabase
    .from('acca_case_progress')
    .select('requirement_id, passed, resolved, miss_count')
    .eq('user_id', user.id)
    .eq('case_id', caseId);

  return NextResponse.json({
    case: {
      id:                        caseRow.id,
      title:                     caseRow.title ?? null,
      scenario_intro:            caseRow.scenario_intro ?? null,
      response_format:           caseRow.response_format ?? null,
      total_marks:               caseRow.total_marks ?? null,
      professional_skills_marks: caseRow.professional_skills_marks ?? null,
    },
    exhibits:     exhibits ?? [],
    requirements: requirements ?? [],
    progress: (progress ?? []).map((p) => ({
      requirement_id: p.requirement_id,
      passed:         p.passed === true,
      resolved:       p.resolved === true,
      miss_count:     typeof p.miss_count === 'number' ? p.miss_count : 0,
    })),
  });
}
