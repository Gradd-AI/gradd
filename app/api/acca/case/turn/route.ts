import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import {
  sealPayload,
  openPayload,
  call1_generate,
  runTeachTurn,
  type ClientSessionState,
} from '@/lib/acca/teach-engine';

// ── APM case-turn handler (redesign P0 item 1 — case-scope construct) ──────────
// Behind APM_CASES (default OFF). Flag off → 404. Runs the EXISTING withhold engine
// (lib/acca/teach-engine → runTeachTurn, a faithful copy of the tutor route's §7)
// scoped to ONE active requirement. The proven single-drill route is untouched.
//
// Seal discipline (item 2): the active requirement's model_answer is sealed exactly
// as a drill's is — its OWN per-requirement AES-256-GCM blob {answer, counted}. Each
// requirement carries its own seal; no seal is shared across requirements. The shared
// scenario (intro + exhibits) is passed as `context` to every call but is NEVER sealed.
//
// v1 scope: each requirement is completed in turn on the shared scenario. NO synthesis
// across requirements (that is v2). final_answer is POPULATED on pass but not consumed.
const CASES_ENABLED = process.env.APM_CASES === '1';

export async function POST(request: Request): Promise<Response> {
  if (!CASES_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (!process.env.TUTOR_SESSION_SECRET) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // ── 1. Auth ──
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // ── 2. Parse body ──
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { case_id, requirement_id, session_state, student_message, last_ezra_message } = body as {
    case_id?: unknown;
    requirement_id?: unknown;
    session_state?: unknown;
    student_message?: unknown;
    last_ezra_message?: unknown;
  };

  const caseId        = typeof case_id === 'string' && case_id ? case_id : null;
  const requirementId = typeof requirement_id === 'string' && requirement_id ? requirement_id : null;
  const lastEzraMessage = typeof last_ezra_message === 'string' ? last_ezra_message : '';

  if (!caseId || !requirementId) {
    return NextResponse.json({ error: 'case_id and requirement_id required' }, { status: 400 });
  }
  if (typeof student_message !== 'string' || !student_message.trim()) {
    return NextResponse.json({ error: 'student_message required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── 3. Fetch the case (gated) + its exhibits → the shared scenario context ──
  // Same serving gate as drills: status='approved' AND published=true. The active
  // requirement is only servable if its parent case passes this gate.
  const { data: caseRow, error: caseErr } = await supabase
    .from('acca_cases')
    .select('id, scenario_intro, status, published')
    .eq('id', caseId)
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (caseErr || !caseRow) {
    return NextResponse.json({ error: 'Case not found' }, { status: 404 });
  }

  const { data: exhibits } = await supabase
    .from('acca_case_exhibits')
    .select('exhibit_order, title, body')
    .eq('case_id', caseId)
    .order('exhibit_order', { ascending: true });

  // Compose the shared scenario context (NOT sealed). Explicitly title + body per
  // exhibit in exhibit_order — no created_at or other columns leak into the model context.
  const scenarioIntro = (caseRow.scenario_intro as string | null) ?? '';
  const exhibitText = (exhibits ?? [])
    .map((ex) => {
      const title = (ex.title as string | null) ?? '';
      const body  = (ex.body  as string | null) ?? '';
      return [title, body].filter(Boolean).join('\n');
    })
    .filter(Boolean)
    .join('\n\n');
  const context = [scenarioIntro, exhibitText].filter(Boolean).join('\n\n');

  // ── 4. Fetch the ACTIVE requirement (server-side, includes withheld fields) ──
  const { data: req, error: reqErr } = await supabase
    .from('acca_case_requirements')
    .select('id, requirement_order, question, model_answer, marks_guide, command_verb, intellectual_level')
    .eq('id', requirementId)
    .eq('case_id', caseId)
    .single();

  if (reqErr || !req) {
    return NextResponse.json({ error: 'Requirement not found' }, { status: 404 });
  }

  const question          = req.question as string;
  // Requirements carry no own-context column — the shared scenario + exhibits IS the context.
  const fullContext       = context;
  const storedModelAnswer = (req.model_answer as string | null) ?? '';

  const verbLevel = [
    req.command_verb       ? `Command verb (authored): ${req.command_verb as string}` : '',
    req.intellectual_level ? `ACCA intellectual level demanded (authored): ${req.intellectual_level}` : '',
  ].filter(Boolean).join('\n');

  const markScheme = [
    verbLevel,
    req.marks_guide ? `Marks guidance (authored — criteria that earn marks):\n${req.marks_guide as string}` : '',
  ].filter(Boolean).join('\n');

  // ── 5. Establish model answer + seal continuity (per-requirement seal) ──
  let modelAnswer: string;
  let teachThroughCounted = false;

  if (!session_state) {
    if (storedModelAnswer) {
      modelAnswer = storedModelAnswer;
    } else {
      try {
        modelAnswer = await call1_generate(question, fullContext);
      } catch {
        return NextResponse.json({ error: 'Failed to generate model answer' }, { status: 500 });
      }
    }
  } else {
    const s = session_state as ClientSessionState;
    if (typeof s.enc !== 'string') {
      return NextResponse.json({ error: 'Invalid session state' }, { status: 400 });
    }
    try {
      const payload       = openPayload(s.enc);
      modelAnswer         = payload.answer;
      teachThroughCounted = payload.counted;
    } catch {
      return NextResponse.json({ error: 'Session state corrupted' }, { status: 400 });
    }
  }

  // ── 5b. Durable per-requirement progress (parallels acca_tutor_progress) ──
  // Keyed (user_id, case_id, requirement_id). Authoritative for miss_count / last_*
  // and the earned-reveal `resolved` flag; degrades to defaults on any read error.
  let missCount        = 0;
  let lastDiagnosis:   string | null = null;
  let lastRealAttempt: string | null = null;
  let resolved         = false;
  let alreadyPassed    = false;

  try {
    const { data: progress } = await supabase
      .from('acca_case_progress')
      .select('miss_count, last_diagnosis, last_real_attempt, counted, resolved, passed')
      .eq('user_id', user.id)
      .eq('case_id', caseId)
      .eq('requirement_id', requirementId)
      .maybeSingle();
    if (progress) {
      missCount           = typeof progress.miss_count === 'number' ? progress.miss_count : 0;
      lastDiagnosis       = (progress.last_diagnosis    as string | null) ?? null;
      lastRealAttempt     = (progress.last_real_attempt as string | null) ?? null;
      teachThroughCounted = teachThroughCounted || progress.counted === true;
      resolved            = progress.resolved === true;
      alreadyPassed       = progress.passed === true;
    }
  } catch {
    // never 500 on a progress read — fall through to defaults (miss_count = 0)
  }

  // ── 6. Run the engine (unchanged), scoped to the active requirement ──
  let result;
  try {
    result = await runTeachTurn({
      question,
      context: fullContext,
      modelAnswer,
      verbLevel,
      markScheme,
      studentMessage: student_message,
      lastEzraMessage,
      missCount,
      lastDiagnosis,
      lastRealAttempt,
      resolved,
    });
  } catch {
    return NextResponse.json({ error: 'Teaching engine error' }, { status: 500 });
  }

  // ── 7. Cap accounting ──
  // Cases are NOT wired to the free-drill teach-through cap in v1 (that is the drill
  // funnel's monetisation). `counted` is still tracked so the seal shape is preserved
  // and a follow-up on an already-taught requirement stays structurally free; no
  // profiles.apm_teach_throughs_used increment happens on the case path.
  const newTeachThroughCounted = teachThroughCounted || result.teachThroughDelivered;

  // ── 8. Pass / final_answer (item 3) ──
  // A requirement passes when the completeness gate clears (result.passed). Once passed,
  // it stays passed. final_answer stores the accepted answer (v2 hook — populated, not
  // consumed yet).
  const newPassed     = alreadyPassed || result.passed;
  const finalAnswer   = result.passed ? result.acceptedAnswer : null;

  // ── 9. Seal updated session state (this requirement's own blob) ──
  const updatedSessionState: ClientSessionState = {
    enc:               sealPayload(modelAnswer, newTeachThroughCounted),
    miss_count:        result.newMissCount,
    last_diagnosis:    result.newLastDiagnosis,
    last_real_attempt: result.newLastRealAttempt,
  };

  // ── 10. Persist per-requirement progress (best-effort) ──
  // Only write final_answer when a pass was just earned; never overwrite a stored
  // final_answer with null on a later follow-up turn.
  try {
    const row: Record<string, unknown> = {
      user_id:           user.id,
      case_id:           caseId,
      requirement_id:    requirementId,
      miss_count:        result.newMissCount,
      last_diagnosis:    result.newLastDiagnosis,
      last_real_attempt: result.newLastRealAttempt,
      counted:           newTeachThroughCounted,
      resolved:          result.newResolved,
      passed:            newPassed,
      updated_at:        new Date().toISOString(),
    };
    if (result.passed && finalAnswer != null) row.final_answer = finalAnswer;
    await supabase
      .from('acca_case_progress')
      .upsert(row, { onConflict: 'user_id,case_id,requirement_id' });
  } catch {
    // non-fatal: per-requirement persistence is best-effort, never blocks the response
  }

  // ── 11. Requirement advance / case completion (item 4) ──
  // v1 advances one requirement at a time on the shared scenario — NO cross-requirement
  // synthesis. Compute the next requirement from the ordered list; the case session is
  // complete when the LAST requirement (max requirement_order) has just passed. Voluntary
  // "move on" is client-driven off next_requirement — no server state needed for it.
  let isLastRequirement = false;
  let nextRequirement: { id: string; requirement_order: number } | null = null;
  try {
    const { data: allReqs } = await supabase
      .from('acca_case_requirements')
      .select('id, requirement_order')
      .eq('case_id', caseId)
      .order('requirement_order', { ascending: true });
    const ordered  = (allReqs ?? []) as Array<{ id: string; requirement_order: number }>;
    const idx      = ordered.findIndex(r => r.id === requirementId);
    isLastRequirement = idx >= 0 && idx === ordered.length - 1;
    nextRequirement   = idx >= 0 && idx < ordered.length - 1 ? ordered[idx + 1] : null;
  } catch {
    // advance metadata is best-effort — omit rather than 500
  }

  const caseComplete = newPassed && isLastRequirement;

  return NextResponse.json({
    ezra_response:           result.ezraResponse,
    session_state:           updatedSessionState,
    teach_through_delivered: result.teachThroughDelivered,
    intent:                  result.intent,
    message_kind:            result.messageKind,
    requirement_passed:      result.passed,
    is_last_requirement:     isLastRequirement,
    next_requirement:        nextRequirement,
    case_complete:           caseComplete,
  });
}
