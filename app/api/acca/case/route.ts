import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasActiveAPMAccess } from '@/lib/acca/access';
import { resolvePaper } from '@/lib/acca/paper';
import { mockAttemptUnlocksCase, MOCK_REQUIREMENT_SELECT, STANDARD_REQUIREMENT_SELECT } from '@/lib/acca/mock-access';
import { sitDisplayLabel } from '@/lib/acca/sit-preview';

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
  // SIT mode rehydrates the student's own typed final_answer per requirement so a
  // refresh mid-sit restores what they wrote (practice mode never needs it, and its
  // payload stays byte-identical — final_answer is the student's own writing, not
  // sealed content). Deferred sit UI will read this; the flag is plumbed now.
  const sitting = searchParams.get('sitting') === 'true';
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
    .select('id, title, scenario_intro, response_format, total_marks, professional_skills_marks, status, published, mock_only')
    .eq('id', caseId)
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (caseErr || !caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  // ── MOCK CONTENT: attempt-scoped, or it does not exist here ──
  // `mock_only` cases are reserved exam papers. Publishing them made them fetchable by
  // anyone holding a case id (they are excluded from case/list by the mock_only filter,
  // but this route is id-addressed and had no such filter). They are now reachable ONLY
  // while the requester has an OPEN attempt for the paper THIS case belongs to — an open
  // APM attempt does not unlock the AFM mock, and vice versa.
  //
  // Refusal is the route's EXISTING 404 shape, identical to a case that is not published
  // or belongs to another paper. Nothing distinguishes "exists but you are not sitting it"
  // from "does not exist", so the response leaks no existence.
  const isMock = caseRow.mock_only === true;
  if (isMock && !(await mockAttemptUnlocksCase(supabase, user.id, caseId))) {
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
  //
  // MOCK CONTENT WITHHOLDS MORE, matching app/api/acca/sit exactly: an open attempt is a
  // key to SIT the paper, never a key to the mark scheme. So marks_guide,
  // professional_skill_tags, intellectual_level, command_verb and lo_code are NOT SELECTED
  // for a mock_only case — never fetched rather than fetched and stripped, so no later
  // edit can spread them into the response by accident.
  // The select string is CHOSEN from the two shared constants rather than written inline,
  // so scripts/test-mock-access.ts pins the exact strings this route uses. Supabase's
  // typed-select parser cannot infer a row type from a non-literal select, so the rows are
  // typed here explicitly — the runtime shape is exactly the columns named in the constant.
  const reqQuery = await supabase
    .from('acca_case_requirements')
    .select(isMock ? MOCK_REQUIREMENT_SELECT : STANDARD_REQUIREMENT_SELECT)
    .eq('case_id', caseId)
    .order('requirement_order', { ascending: true });
  const requirements = (reqQuery.data ?? []) as unknown as Array<Record<string, unknown>>;

  // The stored label carries the syllabus code ("(i) B3e — 10 marks"), which no real paper
  // prints. Derived away at the SERVE boundary for mock content, exactly as the sit route
  // does — same helper, so the two cannot disagree. A no-op on APM labels, which carry no
  // code; load-bearing on AFM's.
  const servedRequirements = isMock
    ? requirements.map((r) => ({ ...r, label: sitDisplayLabel((r.label as string | null) ?? null) }))
    : requirements;

  // ── Progress (this user, this case) — resume support ──
  // Practice: the flags the client needs to rebuild stepper state — passed / resolved
  // / miss_count; NOT final_answer or diagnosis (chat history isn't restored, no
  // sealed/authored content leaks). SIT: additionally includes the student's OWN
  // typed final_answer so a mid-sit refresh restores what they wrote (their own
  // writing, never sealed content).
  // final_answer is fetched unconditionally (it is the student's OWN writing, never
  // sealed content) but only RETURNED in sit mode, so the practice payload stays
  // byte-identical. A static select string keeps supabase's typed-select parser happy.
  const { data: progress } = await supabase
    .from('acca_case_progress')
    .select('requirement_id, passed, resolved, miss_count, final_answer')
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
    requirements: servedRequirements,
    progress: (progress ?? []).map((p) => ({
      requirement_id: p.requirement_id,
      passed:         p.passed === true,
      resolved:       p.resolved === true,
      miss_count:     typeof p.miss_count === 'number' ? p.miss_count : 0,
      ...(sitting ? { final_answer: p.final_answer ?? null } : {}),
    })),
  });
}
