import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { recordAuthFailure } from '@/lib/acca/error-recorder';
import { hasPaperAccess } from '@/lib/acca/access';
import { resolvePaper, strictPaper } from '@/lib/acca/paper';
import { mockContentAllowed, caseIsReserved, STANDARD_REQUIREMENT_SELECT } from '@/lib/acca/mock-access';

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
  const { data: { user }, error: authError } = await authClient.auth.getUser();
  // An OUTAGE records; a logged-out request does not. `recordAuthFailure` owns that
  // distinction (`isAuthOutage`) — an unfiltered version would write a row on every
  // anonymous hit, because no session is itself an AuthSessionMissingError.
  if (authError) await recordAuthFailure('api/acca/case', authError);
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const caseId = searchParams.get('case_id');
  const paper = resolvePaper(searchParams.get('paper'));
  // ── The ENTITLEMENT paper is parsed separately, and strictly ──
  // `paper` above keeps `resolvePaper` because it scopes CONTENT, where defaulting to
  // APM means "serve the APM row" and is correct. The GATE may not share that default:
  // it would ask "does this user hold APM?" for a request that named no paper, and
  // answer yes for an APM-only holder reaching anything. `strictPaper` returns null
  // for absent/unknown and the request is refused below.
  const gatePaper = strictPaper(searchParams.get('paper'));
  // SIT mode rehydrates the student's own typed final_answer per requirement so a
  // refresh mid-sit restores what they wrote (practice mode never needs it, and its
  // payload stays byte-identical — final_answer is the student's own writing, not
  // sealed content). Deferred sit UI will read this; the flag is plumbed now.
  const sitting = searchParams.get('sitting') === 'true';
  if (!caseId) {
    return NextResponse.json({ error: 'case_id required' }, { status: 400 });
  }
  if (!gatePaper) {
    return NextResponse.json(
      { error: 'paper query parameter is required (APM or AFM)' },
      { status: 400 },
    );
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

  if (!(await hasPaperAccess(supabase, user.id, gatePaper, profile))) {
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

  // ── MOCK CONTENT: it does not exist here. Unconditionally. ──
  // `mock_only` cases are reserved exam papers. This route used to serve them under an
  // attempt-scoped carve-out, which existed for exactly one caller: the APM timed mock
  // loaded its cases through here. SitRunner serves both papers through /api/acca/sit
  // now, so that caller is gone and the carve-out with it — no open attempt, no paper
  // match, no mode makes a reserved case fetchable through the practice route.
  //
  // Refusal is the route's EXISTING 404 shape, identical to a case that is not published
  // or belongs to another paper. Nothing distinguishes "reserved" from "does not exist",
  // so the response leaks no existence.
  if (!mockContentAllowed(caseIsReserved(caseId, caseRow.mock_only as boolean | null), 'practice')) {
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
  // There is no mock branch here any more: reserved cases are refused above, so this route
  // only ever serves library content and only ever needs the one select. It is still taken
  // from the shared constant rather than written inline, so scripts/test-mock-access.ts
  // pins the exact string this route uses. Supabase's typed-select parser cannot infer a
  // row type from a non-literal select, so the rows are typed here explicitly — the runtime
  // shape is exactly the columns named in the constant.
  const reqQuery = await supabase
    .from('acca_case_requirements')
    .select(STANDARD_REQUIREMENT_SELECT)
    .eq('case_id', caseId)
    .order('requirement_order', { ascending: true });
  const requirements = (reqQuery.data ?? []) as unknown as Array<Record<string, unknown>>;

  // The stored label carries the syllabus code ("(i) B3e — 10 marks"), which no real paper
  // prints. Derived away at the SERVE boundary for mock content, exactly as the sit route
  // does — same helper, so the two cannot disagree. A no-op on APM labels, which carry no
  // code; load-bearing on AFM's.
  // No label derivation either: `sitDisplayLabel` was applied here only for mock content,
  // which this route no longer serves. Library labels are authored candidate-facing and go
  // through untouched, exactly as they did before the mock carve-out existed.
  const servedRequirements = requirements;

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
