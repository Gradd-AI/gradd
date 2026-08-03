import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { hasPaperAccess } from '@/lib/acca/access';
import { resolvePaper, strictPaper } from '@/lib/acca/paper';
import { runCaseMarking } from '@/lib/acca/case-mark-run';

// ── APM professional-skills marking (terminal whole-case mark) ─────────────────
// Behind APM_CASES (default OFF). Flag off → 404. Runs ONE holistic marking pass
// over the student's whole answer (all requirements concatenated) once the case is
// genuinely complete, and awards the case's professional marks against the ACCA
// section-E descriptors. In SIT mode it additionally runs the per-requirement
// technical pass.
//
// Withhold discipline: the PS pass NEVER loads or reads sealed content
// (model_answer / hint / full_reveal). Professional skills are marked on HOW the
// student wrote, against the descriptors — not against a model answer. It reads
// the same non-sealed scenario context the turn route builds (scenario_intro +
// exhibits) plus each requirement's final_answer (the student's own accepted work).
//
// Kept separate from the turn route so a completing turn isn't slowed, and so
// marking can be re-run without re-answering.
//
// ── THE SEQUENCE ITSELF LIVES IN lib/acca/case-mark-run.ts (2026-07-31) ───────
// Everything from "fetch the case" to "write the rows" — the serving gate, the
// requirement load, the completion gate, the whole-answer assembly, both model passes
// and all persistence — moved into `runCaseMarking`, because the sit RESULTS endpoint
// (app/api/acca/sit/results) has to perform the identical sequence for three cases in a
// row. A second copy is how two marking paths drift apart, which is the same reasoning
// that put the judging cores in lib/acca/case-marking.ts so the weekly calibration script
// exercises production's code.
//
// What is left here is what is genuinely route-shaped: the flag, auth, the entitlement
// gate, body parsing, and the mapping from the run's result to an HTTP status. Marking
// behaviour is unchanged; two things are ADDED by the move, both in the shared core —
// the technical marker's per-requirement reasoning is now persisted to
// acca_case_progress.technical_feedback (it used to be returned and dropped), and a sit
// writes the acca_weak_areas ledger.
//
// PAPER SCOPING: `paper` (body field, resolvePaper, default 'APM') is checked when
// the case is fetched, consistent with the other case routes.
const CASES_ENABLED = process.env.APM_CASES === '1';

export async function POST(request: Request): Promise<Response> {
  if (!CASES_ENABLED) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
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
  const { case_id, paper: paperRaw, sitting: sittingRaw } = body as {
    case_id?: unknown; paper?: unknown; sitting?: unknown;
  };
  const caseId = typeof case_id === 'string' && case_id ? case_id : null;
  const paper = resolvePaper(paperRaw);
  // Strict paper for the entitlement gate — no default. See app/api/acca/case/route.ts.
  const gatePaper = strictPaper(paperRaw);
  const sitting = sittingRaw === true;
  if (!caseId) {
    return NextResponse.json({ error: 'case_id required' }, { status: 400 });
  }
  if (!gatePaper) {
    return NextResponse.json({ error: 'paper is required (APM or AFM)' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // ── 2b. Subscription gate (hard) ──
  // Exam cases require an active APM subscription / unexpired pass. 402 → the
  // client shows the upsell inline (edge: lapse mid-session).
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  if (!(await hasPaperAccess(supabase, user.id, gatePaper, profile))) {
    return NextResponse.json({ error: 'subscription_required' }, { status: 402 });
  }

  // ── 3. Mark it (shared core) ──
  const run = await runCaseMarking({ supabase, userId: user.id, caseId, paper, sitting });
  if (!run.ok) {
    return NextResponse.json({ error: run.error }, { status: run.status });
  }
  const technical = run.technical;

  // ── 4. Return ──
  // PER-SKILL MARKS ARE NOT RETURNED. `per_skill[].mark_awarded` is an artefact of
  // largest-remainder apportionment over a case-level ROUNDED total, not a score for
  // that skill. Measured over 30 chains on 2026-07-29: two skills with the SAME band
  // scored 3 and 2 in the same run (case A, both at ceiling 2.5 — the rounding surplus
  // simply runs out); a skill's mark moved when a DIFFERENT skill's band moved (case B1
  // analysis_and_evaluation is exemplary in 10/10 runs and scores 2 or 3 depending on
  // what scepticism did); and a band change was invisible in the mark (case A
  // commercial_acumen scores 2 whether strong or exemplary). Shipping that number to a
  // student reads as a per-skill score it is not, and would be indefensible if queried.
  //
  // The BAND is the real per-skill judgement and is returned. The case-level total is
  // sound (the apportionment is arithmetically correct in aggregate) and is returned.
  // The apportionment itself is UNCHANGED and still persisted in full by the shared core
  // — this narrows what is surfaced, it does not change how anything is marked.
  const perSkillPublic = run.per_skill.map((s) => ({
    skill: s.skill,
    band: s.band,
    feedback: s.feedback,
  }));

  return NextResponse.json({
    professional_marks_awarded: run.professional_marks_awarded,
    professional_marks_available: run.professional_marks_available,
    per_skill: perSkillPublic,
    ...(technical
      ? {
          technical_marks_awarded: technical.technical_marks_awarded,
          technical_marks_available: technical.technical_marks_available,
          per_requirement: technical.per_requirement,
        }
      : {}),
  });
}
