import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import {
  AFM_MOCK_PAPER_1,
  canPreviewSit,
  sitDisplayLabel,
} from '@/lib/acca/sit-preview';

// ── AFM Mock Paper 1 — SIT endpoint (preview-gated, unpublished content) ───────
// Serves the lean sit surface at /acca/afm/mock. Authentic exam conditions: the
// scenario, the exhibits and the requirement text — nothing else.
//
// ── SERVING GATE IS INVERTED ON PURPOSE ──────────────────────────────────────
// Every other case/drill route gates on `status='approved' AND published=true`. This
// one gates on the OPPOSITE — `paper_code='AFM' AND mock_only=true AND published=false
// AND status='candidate'` — so it can only ever serve the unadjudicated mock, never a
// live published case. Combined with the live routes' own gate, the two servable sets
// are disjoint by construction. No live route was modified to reach this content.
//
// ── ACCESS ────────────────────────────────────────────────────────────────────
// Auth + a one-entry email allowlist (lib/acca/sit-preview.ts). Anyone else gets 404,
// never 403 — a 403 would confirm an unpublished AFM paper exists at this path.
// There is deliberately NO subscription/entitlement check: this is unpublished
// pre-release content reachable by one test account, so the allowlist IS the gate.
// Adding an entitlement check could only ever lock the test account OUT.
//
// ── WITHHOLD DISCIPLINE (stricter than the live case route) ──────────────────
// Never selects model_answer / hint / full_reveal / answer_schema — the same rule the
// live case route follows. It ALSO withholds two fields the live route does serve:
//   • marks_guide          — the authored criteria that earn marks: a mark scheme, and
//                            therefore feedback. "No hints of any kind during the sit."
//   • professional_skill_tags / intellectual_level
//                          — tells the candidate which PS skill is being examined,
//                            which is a steer no real exam gives.
// `label` IS served, but only in its CANDIDATE-FACING form. The stored label carries the
// internal syllabus code — "(i) B3e — 10 marks" — which no real paper prints, so
// sitDisplayLabel() derives "(i) — 10 marks" here at the serve boundary. Marks per
// requirement ARE authentic and stay. The `lo_code` column is read to make that removal
// exact and is then DISCARDED — it is never part of the response, so the code never
// reaches the browser at all. Nothing stored is modified: marking and debrief read
// `lo_code` and the raw `label` off the row exactly as before.
//
//   GET                                   → the whole paper + which requirements are
//                                           already submitted + the open attempt
//   POST {action:'start'}                 → start (or resume) the elapsed clock
//   POST {action:'submit', …}             → record ONE requirement's answer (immutable)
//   POST {action:'finish'}                → mark the attempt completed
//
// MARKING AND DEBRIEF ARE OUT OF SCOPE. This route never marks, never scores, and
// never returns a verdict. Answers land in acca_case_progress.final_answer, which is
// what the existing case/mark path already reads when marking is built.

interface GateOk {
  userId: string;
  supabase: ReturnType<typeof createServiceClient>;
}

// Flag → n/a. Auth → 404. Allowlist → 404. Deliberately uniform: every rejection is
// indistinguishable from "this path does not exist".
async function gate(): Promise<{ error: Response } | GateOk> {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user || !canPreviewSit(user.email)) {
    return { error: NextResponse.json({ error: 'Not found' }, { status: 404 }) };
  }
  return { userId: user.id, supabase: createServiceClient() };
}

const PAPER = AFM_MOCK_PAPER_1;

// The nominal ACCA AFM clock (3h15m). Written ONLY because acca_mock_attempts.ends_at
// is NOT NULL in the schema, so the column has to hold something honest. NOTHING reads
// it on this surface: there is no countdown, no expiry branch and no auto-submit by
// spec. The sit's clock counts UP from started_at.
const NOMINAL_MINUTES = 195;

interface AttemptRow {
  mock_id: string;
  started_at: string;
  ends_at: string;
  completed: boolean;
}

async function openAttempt(
  supabase: GateOk['supabase'],
  userId: string,
): Promise<AttemptRow | null> {
  const { data } = await supabase
    .from('acca_mock_attempts')
    .select('mock_id, started_at, ends_at, completed')
    .eq('user_id', userId)
    .eq('mock_id', PAPER.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as AttemptRow | null) ?? null;
}

// Verify a case id belongs to this paper AND passes the inverted (unpublished) gate.
// Every write path calls this, so a caller can never post an answer against a live
// published case by supplying its id.
async function assertSittableCase(
  supabase: GateOk['supabase'],
  caseId: string,
): Promise<boolean> {
  if (!PAPER.case_ids.includes(caseId)) return false;
  const { data } = await supabase
    .from('acca_cases')
    .select('id')
    .eq('id', caseId)
    .eq('paper_code', PAPER.paper)
    .eq('mock_only', true)
    .eq('published', false)
    .eq('status', 'candidate')
    .maybeSingle();
  return !!data;
}

export async function GET(): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;
  const { supabase, userId } = g;

  // ── Cases (inverted gate) ──
  const { data: caseRows } = await supabase
    .from('acca_cases')
    .select('id, title, section, scenario_intro, total_marks, professional_skills_marks')
    .in('id', PAPER.case_ids)
    .eq('paper_code', PAPER.paper)
    .eq('mock_only', true)
    .eq('published', false)
    .eq('status', 'candidate');

  const byId = new Map((caseRows ?? []).map((c) => [c.id as string, c]));
  // Order by the paper's own sequence, not by whatever order the DB returned.
  const orderedCases = PAPER.case_ids.map((id) => byId.get(id)).filter(Boolean);
  if (orderedCases.length !== PAPER.case_ids.length) {
    return NextResponse.json({ error: 'Paper not available' }, { status: 404 });
  }

  const { data: exhibits } = await supabase
    .from('acca_case_exhibits')
    .select('case_id, exhibit_order, title, body')
    .in('case_id', PAPER.case_ids)
    .order('exhibit_order', { ascending: true });

  // WITHHELD: model_answer, hint, full_reveal, answer_schema, marks_guide,
  // professional_skill_tags, intellectual_level. See the header note.
  // `lo_code` is READ but never SERVED — it only feeds sitDisplayLabel's exact removal
  // of the code from the stored label. Selecting it is not serving it.
  const { data: requirements } = await supabase
    .from('acca_case_requirements')
    .select('id, case_id, requirement_order, label, lo_code, question')
    .in('case_id', PAPER.case_ids)
    .order('requirement_order', { ascending: true });

  // Which requirements this user has already submitted. A recorded answer is FINAL —
  // blank '' counts as submitted (a deliberately unanswered requirement).
  const { data: progress } = await supabase
    .from('acca_case_progress')
    .select('requirement_id, final_answer')
    .eq('user_id', userId)
    .in('case_id', PAPER.case_ids);

  const submitted = (progress ?? [])
    .filter((p) => p.final_answer != null)
    .map((p) => p.requirement_id as string);

  // Flatten to the paper-ordered slot list the UI walks: Section A's requirements in
  // order, then each Section B case's, in case_ids order.
  const slots = PAPER.case_ids.flatMap((caseId) => {
    const c = byId.get(caseId)!;
    return (requirements ?? [])
      .filter((r) => r.case_id === caseId)
      .map((r) => ({
        requirement_id:   r.id as string,
        case_id:          caseId,
        case_title:       (c.title as string | null) ?? null,
        case_section:     (c.section as string | null) ?? null,
        requirement_order: r.requirement_order as number,
        // Candidate-facing form only — the syllabus code is stripped here, not in the UI.
        label:            sitDisplayLabel(r.label as string | null, r.lo_code as string | null),
        question:         (r.question as string | null) ?? '',
      }));
  });

  return NextResponse.json({
    paper: { id: PAPER.id, title: PAPER.title },
    cases: orderedCases.map((c) => ({
      id:                        c!.id,
      title:                     c!.title ?? null,
      section:                   c!.section ?? null,
      scenario_intro:            c!.scenario_intro ?? null,
      total_marks:               c!.total_marks ?? null,
      professional_skills_marks: c!.professional_skills_marks ?? null,
      exhibits: (exhibits ?? [])
        .filter((e) => e.case_id === c!.id)
        .map((e) => ({
          exhibit_order: e.exhibit_order as number,
          title:         (e.title as string | null) ?? null,
          body:          (e.body  as string | null) ?? null,
        })),
    })),
    slots,
    submitted,
    attempt: await openAttempt(supabase, userId),
  });
}

export async function POST(request: Request): Promise<Response> {
  const g = await gate();
  if ('error' in g) return g.error;
  const { supabase, userId } = g;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { action, case_id, requirement_id, answer } = body as {
    action?: unknown; case_id?: unknown; requirement_id?: unknown; answer?: unknown;
  };

  // ── start / resume the elapsed clock ──
  if (action === 'start') {
    const existing = await openAttempt(supabase, userId);
    // Resume rather than restart: a refresh or a double-click must never reset the
    // clock. Only a COMPLETED attempt starts a fresh one.
    if (existing && !existing.completed) {
      return NextResponse.json({ attempt: existing, resumed: true });
    }
    const now = Date.now();
    const { data, error } = await supabase
      .from('acca_mock_attempts')
      .insert({
        user_id:    userId,
        mock_id:    PAPER.id,
        started_at: new Date(now).toISOString(),
        ends_at:    new Date(now + NOMINAL_MINUTES * 60_000).toISOString(),
        completed:  false,
      })
      .select('mock_id, started_at, ends_at, completed')
      .single();
    if (error || !data) {
      return NextResponse.json({ error: 'Failed to start' }, { status: 500 });
    }
    return NextResponse.json({ attempt: data as AttemptRow, resumed: false });
  }

  // ── submit ONE requirement — final, immutable ──
  if (action === 'submit') {
    const caseId = typeof case_id === 'string' && case_id ? case_id : null;
    const reqId  = typeof requirement_id === 'string' && requirement_id ? requirement_id : null;
    // A blank answer is valid and final (an unanswered requirement moved past on
    // purpose) — so only the TYPE is checked, never the length.
    if (!caseId || !reqId || typeof answer !== 'string') {
      return NextResponse.json({ error: 'case_id, requirement_id and answer required' }, { status: 400 });
    }
    if (!(await assertSittableCase(supabase, caseId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    const { data: reqRow } = await supabase
      .from('acca_case_requirements')
      .select('id')
      .eq('id', reqId)
      .eq('case_id', caseId)
      .maybeSingle();
    if (!reqRow) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // IMMUTABILITY IS ENFORCED SERVER-SIDE, not merely by hiding a back button: once a
    // requirement has a recorded answer it can never be rewritten. This is the real
    // guarantee behind "no back navigation, no editing a submitted requirement" — a
    // replayed or hand-crafted POST cannot overwrite submitted work either.
    const { data: existingProgress } = await supabase
      .from('acca_case_progress')
      .select('final_answer')
      .eq('user_id', userId)
      .eq('case_id', caseId)
      .eq('requirement_id', reqId)
      .maybeSingle();
    if (existingProgress && existingProgress.final_answer != null) {
      return NextResponse.json({ error: 'already_submitted' }, { status: 409 });
    }

    const { error } = await supabase.from('acca_case_progress').upsert(
      {
        user_id:        userId,
        case_id:        caseId,
        requirement_id: reqId,
        final_answer:   answer,
        updated_at:     new Date().toISOString(),
      },
      { onConflict: 'user_id,case_id,requirement_id' },
    );
    if (error) {
      // Surfaced honestly so the client can offer a retry — an answer the student
      // believes is saved but is not would be the worst failure this surface has.
      return NextResponse.json({ error: 'Failed to record answer' }, { status: 500 });
    }
    // `passed` is left UNSET, exactly as the practice-vs-sit rule in lib/acca/case-sit.ts
    // requires: a sit is never judged at turn time.
    return NextResponse.json({ recorded: true });
  }

  // ── finish ──
  if (action === 'finish') {
    const existing = await openAttempt(supabase, userId);
    if (existing && !existing.completed) {
      await supabase
        .from('acca_mock_attempts')
        .update({ completed: true })
        .eq('user_id', userId)
        .eq('mock_id', PAPER.id)
        .eq('started_at', existing.started_at);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 });
}
