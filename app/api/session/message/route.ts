import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import {
  buildInjectedSystemPrompt,
  buildIBEconomicsPrompt,
  buildIBBusinessPrompt,
  fetchExamQuestionsContext,
  deriveCoursePosition,
  formatWeakAreasList,
  formatUnitsCompletedList,
  formatLessonsCompletedThisUnit,
} from '@/lib/system-prompt';
import { parseSignals } from '@/lib/signal-parser';
import anthropic from '@/lib/anthropic';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit'

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
const MAX_TOKENS = 4096;

// Free-tier teaching cap (brick 2, bucket C scaffolding). Free users get this many
// interactions before the paywall. Placeholder value — tuned per A/B/C bucket later.
const MAX_FREE_UNITS = 10;

// Cap history sent to Anthropic at last 20 exchanges (40 messages).
// Full history is always persisted to DB — trimming is Anthropic-call-only.
const MAX_HISTORY_MESSAGES = 40;

// Service role client — bypasses RLS for all server-side writes.
// Auth reads still use the SSR client (cookie-based) for security.
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}


export async function POST(request: Request) {
  try {
    const { sessionId, studentMessage, content, diagramImage } = await request.json();
    const isDiagramEval = content === '__DIAGRAM_EVALUATION__' && !!diagramImage;

  if (!sessionId || (!studentMessage && !isDiagramEval)) {
    return NextResponse.json({ error: 'sessionId and studentMessage required' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const serviceSupabase = getServiceClient();

  // ── Auth check ────────────────────────────────────────────────────────────
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { allowed, remaining, resetAt } = await checkRateLimit(user.id)
  if (!allowed) {
    return NextResponse.json(
      {
        error: 'rate_limited',
        message:
          "You've sent a lot of messages this hour — Aoife needs a short break! " +
          "You can continue in " +
          Math.ceil((resetAt.getTime() - Date.now()) / 60000) +
          " minutes.",
      },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '50',
          'X-RateLimit-Remaining': String(remaining),
          'X-RateLimit-Reset': resetAt.toISOString(),
        },
      }
    )
  }
 
  // ── Subscription check ────────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, student_name, exam_level, subject, ib_economics_level, ib_business_level, cap_bucket, free_units_used')
    .eq('id', user.id)
    .single();

  // A missing profile is a genuine error (auth/data failure) and must still be blocked.
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
  }
  // Free-tier users (profile exists, subscription not active) are allowed in. They get questions + marking;
  // the teaching cap (brick 2) gates deep teaching per their cap_bucket. Active subscribers are unrestricted.
  const isFreeTier = profile.subscription_status !== 'active';

  // ── Load session ──────────────────────────────────────────────────────────
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Derive the real subject from the session's lesson_code so bundle subscribers
  // (profile.subject = 'IB_BUNDLE') resolve to the correct student_progress row.
  const effectiveSubject = session.lesson_code?.startsWith('IB_ECON_') ? 'IB_ECONOMICS'
    : session.lesson_code?.startsWith('IB_BM_') ? 'IB_BUSINESS'
    : 'LC_BUSINESS';

  // ── Build injected system prompt ──────────────────────────────────────────
  let injectedSystemPrompt: string = '';

  const storedPrompt = session.raw_final_response as string | null;
  if (storedPrompt?.startsWith('__SYSTEM_PROMPT__')) {
    injectedSystemPrompt = storedPrompt.replace('__SYSTEM_PROMPT__', '');
  } else {
    const [
      { data: progress },
      { data: weakAreas },
      { data: lessonCompletions },
      { data: unitCompletions },
    ] = await Promise.all([
      supabase.from('student_progress').select('*').eq('student_id', user.id).eq('subject', effectiveSubject).single(),
      supabase.from('weak_areas').select('*').eq('student_id', user.id).is('resolved_at', null),
      supabase.from('lesson_completions').select('lesson_code').eq('student_id', user.id),
      supabase.from('unit_completions').select('unit_code').eq('student_id', user.id),
    ]);

    const currentLessonCode = progress?.current_lesson_code ?? '1.1.1';

    // Fetch next lesson from the lessons table using next_lesson_code.
    // This gives Aoife the exact name and code to announce in her forward bridge.
    // She is prohibited from improvising the curriculum sequence.
    const { data: currentLessonRow } = await supabase
      .from('lessons')
      .select('next_lesson_code')
      .eq('lesson_code', currentLessonCode)
      .single();

    const nextLessonCode = currentLessonRow?.next_lesson_code ?? '';

    const { data: nextLessonRow } = nextLessonCode
      ? await supabase
          .from('lessons')
          .select('lesson_name')
          .eq('lesson_code', nextLessonCode)
          .single()
      : { data: null };

    const nextLessonName = nextLessonRow?.lesson_name ?? '';

    const subject = effectiveSubject;

    if (subject === 'IB_ECONOMICS') {
      const lessonOrder = parseInt(
        progress?.current_lesson_code?.replace('IB_ECON_', '') ?? '1'
      );
      const examQs = await fetchExamQuestionsContext(
        supabase,
        currentLessonCode,
        profile.exam_level,
        'IB_ECONOMICS',
        progress?.current_unit_code ?? undefined,
      );
      injectedSystemPrompt = await buildIBEconomicsPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   profile.exam_level,
        CURRENT_UNIT_CODE:            progress?.current_unit_code ?? 'UNIT_1',
        CURRENT_UNIT_NAME:            progress?.current_unit_name ?? 'Introduction to Economics',
        CURRENT_LESSON_CODE:          currentLessonCode,
        CURRENT_LESSON_NAME:          progress?.current_lesson_name ?? 'Economics as a Social Science',
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(
                                        lessonCompletions ?? [],
                                        progress?.current_unit_code ?? 'UNIT_1'
                                      ),
        UNITS_COMPLETED_LIST:         formatUnitsCompletedList(unitCompletions ?? []),
        SESSION_NUMBER:               session.session_number,
        SESSION_TYPE:                 session.session_type,
        WEAK_AREAS_LIST:              formatWeakAreasList(weakAreas ?? []),
        LAST_SESSION_SUMMARY:         progress?.last_session_summary ?? '',
        COURSE_POSITION:              progress?.course_position ?? deriveCoursePosition(lessonOrder, 'IB_ECONOMICS', profile.ib_economics_level ?? profile.exam_level),
        EXAM_QUESTIONS_CONTEXT:       examQs.formatted,
      });
    } else if (subject === 'IB_BUSINESS') {
      const lessonOrder = parseInt(
        progress?.current_lesson_code?.replace('IB_BM_', '') ?? '1'
      );
      // p_subject uses the DB key 'IB_BUSINESS_MANAGEMENT'; internal route key stays 'IB_BUSINESS'
      const examQs = await fetchExamQuestionsContext(
        supabase,
        currentLessonCode,
        profile.exam_level,
        'IB_BUSINESS_MANAGEMENT',
        progress?.current_unit_code ?? undefined,
      );
      injectedSystemPrompt = await buildIBBusinessPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   profile.exam_level,
        CURRENT_UNIT_CODE:            progress?.current_unit_code ?? 'UNIT_1',
        CURRENT_UNIT_NAME:            progress?.current_unit_name ?? 'Business Organisation and Environment',
        CURRENT_LESSON_CODE:          currentLessonCode,
        CURRENT_LESSON_NAME:          progress?.current_lesson_name ?? 'What is a Business?',
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(
                                        lessonCompletions ?? [],
                                        progress?.current_unit_code ?? 'UNIT_1'
                                      ),
        UNITS_COMPLETED_LIST:         formatUnitsCompletedList(unitCompletions ?? []),
        SESSION_NUMBER:               session.session_number,
        SESSION_TYPE:                 session.session_type,
        WEAK_AREAS_LIST:              formatWeakAreasList(weakAreas ?? []),
        LAST_SESSION_SUMMARY:         progress?.last_session_summary ?? '',
        COURSE_POSITION:              progress?.course_position ?? deriveCoursePosition(lessonOrder, 'IB_BUSINESS', profile.ib_business_level ?? profile.exam_level),
        EXAM_QUESTIONS_CONTEXT:       examQs.formatted,
      });
    } else {
      injectedSystemPrompt = await buildInjectedSystemPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   profile.exam_level,
        CURRENT_UNIT_CODE:            progress?.current_unit_code ?? 'UNIT_1',
        CURRENT_UNIT_NAME:            progress?.current_unit_name ?? 'People in Business',
        CURRENT_LESSON_CODE:          currentLessonCode,
        CURRENT_LESSON_NAME:          progress?.current_lesson_name ?? 'Introduction to People in Business',
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(
                                        lessonCompletions ?? [],
                                        progress?.current_unit_code ?? 'UNIT_1'
                                      ),
        UNITS_COMPLETED_LIST:         formatUnitsCompletedList(unitCompletions ?? []),
        SESSION_NUMBER:               session.session_number,
        SESSION_TYPE:                 session.session_type,
        WEAK_AREAS_LIST:              formatWeakAreasList(weakAreas ?? []),
        LAST_SESSION_SUMMARY:         progress?.last_session_summary ?? '',
        SPACED_REP_DUE:               progress?.spaced_rep_due ? 'TRUE' : 'FALSE',
        ABQ_DRILL_DUE:                progress?.abq_drill_due ? 'TRUE' : 'FALSE',
      });
    }
  }

  // ── Diagram evaluation (vision) ───────────────────────────────────────────
  if (isDiagramEval) {
    const { data: evalProgress } = await serviceSupabase
      .from('student_progress')
      .select('current_lesson_name')
      .eq('student_id', user.id)
      .eq('subject', effectiveSubject)
      .single();

    const evalPrompt = [
      'The student has uploaded a photograph of a hand-drawn diagram for evaluation.',
      `Current lesson: ${evalProgress?.current_lesson_name ?? 'current lesson'}`,
      `Subject: ${effectiveSubject}`,
      '',
      'Evaluate the student\'s diagram against IB marking criteria:',
      '1. Are the axes correctly labelled?',
      '2. Are curves/lines the correct shape?',
      '3. Are labels, arrows, and key points present?',
      '4. Is the diagram complete for what was taught?',
      '5. What specific improvements are needed?',
      '',
      'Give specific, actionable feedback referencing exact IB marking criteria.',
      'Be encouraging but precise about errors.',
    ].join('\n');

    const evalStream = anthropic.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 1000,
      system: [{ type: 'text' as const, text: injectedSystemPrompt, cache_control: { type: 'ephemeral' as const } }],
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: diagramImage.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
              data: diagramImage.base64,
            },
          },
          { type: 'text', text: evalPrompt },
        ],
      }],
    });

    const enc = new TextEncoder();
    const evalReadable = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of evalStream) {
            if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
              controller.enqueue(enc.encode(chunk.delta.text));
            }
          }
        } catch (err) {
          console.error('Diagram eval error:', err);
          controller.error(err);
          return;
        }
        controller.close();
      },
    });

    return new Response(evalReadable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-cache',
      },
    });
  }

  // ── Build message history ─────────────────────────────────────────────────
  const currentHistory = (session.message_history as Array<{ role: string; content: string }>) ?? [];

  const updatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...currentHistory.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: studentMessage },
  ];

  // Trim to last 20 exchanges for Anthropic call. Always preserve opener (index 0).
  let trimmedHistory = updatedHistory;
  if (updatedHistory.length > MAX_HISTORY_MESSAGES + 1) {
    const opener = updatedHistory[0];
    const recent = updatedHistory.slice(-MAX_HISTORY_MESSAGES);
    trimmedHistory = [opener, ...recent];
  }

  // ── Live context anchor ───────────────────────────────────────────────────
// ── Live context anchor ───────────────────────────────────────────────────
const exchangeCount = Math.floor(updatedHistory.length / 2);

const lastAoifeMessage = [...currentHistory]
  .reverse()
  .find((m: { role: string; content: string }) => m.role === 'assistant')?.content ?? '';
const lastAoifeTail = lastAoifeMessage.length > 0
  ? lastAoifeMessage.slice(-400).replace(/\[.*?\]/g, '').trim()
  : '';

// Detect spaced rep due from the substituted system prompt
const spacedRepDue = injectedSystemPrompt.includes('SPACED_REP_DUE: TRUE') ||
  injectedSystemPrompt.includes('Spaced repetition due: TRUE');

// IB Business + IB Economics: derive opening instruction from course_position extracted
// from the substituted prompt (progress is block-scoped in the else branch above).
let bmOpeningText: string | null = null;
if (effectiveSubject === 'IB_BUSINESS' || effectiveSubject === 'IB_ECONOMICS') {
  const posMatch = injectedSystemPrompt.match(/Course position:\s*([^\n]+)/);
  const pos = posMatch?.[1]?.trim() ?? 'beginning';
  if (pos === 'exam-prep') {
    bmOpeningText = 'This is the opening exchange. Do not teach foundations. Open with EXAMPLE 1 from the EXAM-PREP QUESTIONS block in your system prompt, quoted VERBATIM. Only deviate to EXAMPLE 2 or 3 if the student\'s weak areas clearly demand it, and explain the substitution in one line. Never invent your own question when seed examples are provided. Apply the EXAM-PREP DELIVERY PROTOCOL: scaffolding is strictly limited by the marks band of the seed question. Maximum one prerequisite checkpoint, then the seed question with explicit "write your full answer now" instruction. No further teaching.';
  } else if (pos === 'mid-programme') {
    bmOpeningText = 'This is the opening exchange. Skip the introduction — open with a checkpoint question on the lesson\'s core idea.';
  } else {
    bmOpeningText = 'This is the opening exchange. Begin teaching the lesson from first principles.';
  }
}

const liveContextAnchor = `

---

## ⚠ LIVE SESSION STATE — READ THIS BEFORE EVERY RESPONSE

You are currently in exchange ${exchangeCount} of an active session.
The conversation history contains ${updatedHistory.length} messages.

${lastAoifeTail
  ? `YOUR LAST MESSAGE TO THE STUDENT ENDED WITH:
"…${lastAoifeTail}"

The student is responding to the above. Continue from exactly this point. Do not summarise what you just said. Do not re-open the session. Just respond and keep teaching.`
  : spacedRepDue
    ? `This is the opening exchange. SPACED_REP_DUE is TRUE.

MANDATORY FIRST ACTION — DO THIS BEFORE ANY NEW CONTENT:
Run the 5-question rapid recall block as specified in your instructions. Open with: "Before we start today, five quick ones from what we covered recently." Complete all 5 questions, mark them, then transition to the lesson.
Do NOT skip this. Do NOT start new content first. The recall block runs before anything else.`
    : bmOpeningText ?? `This is the opening exchange. Begin teaching now.`}

ABSOLUTE RULES — VIOLATIONS ARE CRITICAL ERRORS:
- Do NOT restart the session under any circumstances.
- Do NOT re-introduce yourself. The student already knows who you are.
- Do NOT output a welcome message, session opening, or greeting.
- Do NOT ask "are you starting fresh?" or offer any kind of reset.
- Do NOT ask for the student's name or level — you already have both.
- DO continue teaching from exactly where you left off (see YOUR LAST MESSAGE above).
- If the student's message is short or one word — treat it as their answer to your last question. Evaluate it and continue.
- If the student goes slightly off-topic: give a one-sentence answer, then redirect back. "Good question — [one sentence]. For the exam though, what matters here is [redirect]. So — [re-ask your last question or next step]."
- If the student goes significantly off-topic: acknowledge briefly and redirect firmly. "We'll park that — not on today's agenda. Back to [current topic]: [re-ask your last question]."
- Never lose your place in the lesson due to a student tangent. The lesson continues regardless.
- The full conversation history is in the messages array. Never claim you cannot see a previous message. Never ask the student to repeat something they already sent.
- If two consecutive identical user messages appear, treat as one — UI glitch. Acknowledge naturally and continue.
`;

  // ── Free-tier teaching cap (bucket C scaffolding) ─────────────────────────
  // If a free user has consumed their free units, return a paywall signal BEFORE
  // streaming. Active subscribers (isFreeTier=false) always pass.
  if (isFreeTier && (profile.free_units_used ?? 0) >= MAX_FREE_UNITS) {
    return NextResponse.json({
      paywall: true,
      bucket: profile.cap_bucket ?? null,
      free_units_used: profile.free_units_used ?? 0,
      cap: MAX_FREE_UNITS,
    });
  }

  // ── Anthropic streaming ───────────────────────────────────────────────────
  const systemBlocks = [
    {
      type: 'text' as const,
      text: injectedSystemPrompt,
      cache_control: { type: 'ephemeral' as const },
    },
    {
      type: 'text' as const,
      text: liveContextAnchor,
    },
  ];

  const stream = anthropic.messages.stream({
    model: injectedSystemPrompt.includes('MARK SCHEME') ? 'claude-sonnet-4-6' : MODEL,
    max_tokens: MAX_TOKENS,
    system: systemBlocks,
    messages: trimmedHistory,
  });

  let fullResponseText = '';
  const encoder = new TextEncoder();

  const readable = new ReadableStream({
    async start(controller) {
      try {
        // ── Stream to client ──────────────────────────────────────────────
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const text = chunk.delta.text;
            fullResponseText += text;
            controller.enqueue(encoder.encode(text));
          }
        }

        // ── Persist full history + token counts ───────────────────────────
        const finalHistory = [
          ...updatedHistory,
          { role: 'assistant', content: fullResponseText },
        ];

        const finalMessage = await stream.finalMessage();
        const usage = finalMessage.usage;

        await serviceSupabase
          .from('sessions')
          .update({
            message_history: finalHistory,
            raw_final_response: session.raw_final_response,
            input_tokens: (session.input_tokens ?? 0) + usage.input_tokens,
            output_tokens: (session.output_tokens ?? 0) + usage.output_tokens,
          })
          .eq('id', sessionId);

        // Free-tier: consume one unit per successful response. Subscribers untouched.
        if (isFreeTier) {
          await serviceSupabase
            .from('profiles')
            .update({ free_units_used: (profile.free_units_used ?? 0) + 1 })
            .eq('id', user.id);
        }

        // ── Signal processing ─────────────────────────────────────────────
        const signals = parseSignals(fullResponseText);

        const hasSignals =
          signals.lessonComplete ||
          signals.unitComplete ||
          (signals.weakAreaFlags && signals.weakAreaFlags.length > 0) ||
          signals.sessionSummary ||
          signals.lessonIncomplete;

        if (hasSignals) {
          const { data: progress } = await serviceSupabase
            .from('student_progress')
            .select('*')
            .eq('student_id', user.id)
            .eq('subject', effectiveSubject)
            .single();

          if (progress) {
            const progressUpdates: Record<string, unknown> = {
              updated_at: new Date().toISOString(),
            };

            // ── WEAK_AREA_FLAGS ───────────────────────────────────────────
            for (const flag of signals.weakAreaFlags ?? []) {
              const { data: existing } = await serviceSupabase
                .from('weak_areas')
                .select('id, occurrence_count')
                .eq('student_id', user.id)
                .eq('lesson_code', flag.lessonCode)
                .eq('concept_slug', flag.conceptSlug)
                .is('resolved_at', null)
                .single();

              if (existing) {
                await serviceSupabase
                  .from('weak_areas')
                  .update({
                    occurrence_count: (existing.occurrence_count ?? 1) + 1,
                    recommended_action: flag.recommendedAction,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id);
              } else {
                await serviceSupabase.from('weak_areas').insert({
                  student_id: user.id,
                  lesson_code: flag.lessonCode,
                  concept_slug: flag.conceptSlug,
                  error_description: flag.errorDescription,
                  recommended_action: flag.recommendedAction,
                  session_number: session.session_number,
                });
              }
            }

            // ── LESSON_COMPLETE ───────────────────────────────────────────
            if (signals.lessonComplete) {
              const lc = signals.lessonComplete;

              await serviceSupabase.from('lesson_completions').upsert({
                student_id: user.id,
                lesson_code: lc.lessonCode,
                completed_at: new Date().toISOString(),
                session_number: session.session_number,
                weak_concepts: lc.weakConcepts,
                apply_scores: lc.applyScores,
                next_lesson_code: lc.nextLesson,
              });

              // Advance current_lesson_code using DB-authoritative next_lesson_code.
              // We look up the next lesson from the lessons table using the completed
              // lesson code — not Aoife's signal value — so she cannot jump the sequence.
              const { data: completedLessonRow } = await serviceSupabase
                .from('lessons')
                .select('next_lesson_code')
                .eq('lesson_code', lc.lessonCode)
                .single();

              const authoritativeNextCode = completedLessonRow?.next_lesson_code ?? lc.nextLesson;

              if (authoritativeNextCode && authoritativeNextCode !== 'NONE') {
                const { data: nextLessonData } = await serviceSupabase
                  .from('lessons')
                  .select('lesson_name, unit_code, unit_name')
                  .eq('lesson_code', authoritativeNextCode)
                  .single();

                if (nextLessonData) {
                  progressUpdates.current_lesson_code = authoritativeNextCode;
                  progressUpdates.current_lesson_name = nextLessonData.lesson_name;
                }
              }

              const existingCompleted = (progress.lessons_completed_this_unit as string[]) ?? [];
              if (!existingCompleted.includes(lc.lessonCode)) {
                progressUpdates.lessons_completed_this_unit = [...existingCompleted, lc.lessonCode];
              }

              progressUpdates.resume_from_concept = null;

              await serviceSupabase
                .from('sessions')
                .update({
                  lesson_complete: true,
                  weak_flags_count: signals.weakAreaFlags?.length ?? 0,
                })
                .eq('id', sessionId);
            }

            // ── LESSON_INCOMPLETE ─────────────────────────────────────────
            if (signals.lessonIncomplete) {
              progressUpdates.resume_from_concept = signals.lessonIncomplete.resumeFrom;
            }

            // ── UNIT_COMPLETE ─────────────────────────────────────────────
            if (signals.unitComplete) {
              const uc = signals.unitComplete;
              const scoreNum = parseInt(uc.checkpointScore.split('/')[0]);

              await serviceSupabase.from('unit_completions').upsert({
                student_id: user.id,
                unit_code: uc.unitCode,
                completed_at: new Date().toISOString(),
                session_number: session.session_number,
                checkpoint_score: scoreNum,
                weak_topics_flagged: uc.weakTopicsFlagged,
                revision_sessions_inserted: uc.revisionSessionsInserted,
              });

              const completedUnits = (progress.units_completed as string[]) ?? [];
              if (!completedUnits.includes(uc.unitCode)) {
                progressUpdates.units_completed = [...completedUnits, uc.unitCode];
              }

              // Resolve new unit metadata from the lessons table using the
              // current_lesson_code that LESSON_COMPLETE just advanced to.
              const newLessonCode =
                (progressUpdates.current_lesson_code as string) ?? progress.current_lesson_code;
              const { data: newLessonUnit } = await serviceSupabase
                .from('lessons')
                .select('unit_code, unit_name')
                .eq('lesson_code', newLessonCode)
                .single();

              if (newLessonUnit) {
                progressUpdates.current_unit_code = newLessonUnit.unit_code;
                progressUpdates.current_unit_name = newLessonUnit.unit_name;
                progressUpdates.lessons_completed_this_unit = [];
                progressUpdates.pending_unit_checkpoint = false;
                progressUpdates.checkpoint_unit_code = null;
              } else {
                console.error(
                  `UNIT_COMPLETE: lessons lookup failed for lesson_code=${newLessonCode}. ` +
                  `units_completed appended but current_unit_* fields NOT updated.`
                );
              }
            }

            // ── SESSION_SUMMARY ───────────────────────────────────────────
            if (signals.sessionSummary) {
              const s = signals.sessionSummary;

              const _dateStr = new Date().toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              });
              const _lessonStatus = s.lessonComplete
                ? `completed lesson ${s.lesson}`
                : `was working through lesson ${s.lesson} (did not complete)`;
              const _concepts = s.conceptsCovered.filter(c => c && c !== 'NONE');
              const _conceptsClause = _concepts.length > 0
                ? ` covering ${_concepts.join(', ')}`
                : '';
              const _applyClause = (s.applyScores && s.applyScores !== 'N/A')
                ? ` Application performance: ${s.applyScores}.`
                : '';
              const _weakClause = s.weakFlagsCount > 0
                ? ` ${s.weakFlagsCount} weak area${s.weakFlagsCount === 1 ? '' : 's'} flagged this session.`
                : '';
              const _nextAction = s.nextAction.replace(/-/g, ' ');
              progressUpdates.last_session_summary =
                `On ${_dateStr}, the student ${_lessonStatus}${_conceptsClause}.${_applyClause}${_weakClause} Next action: ${_nextAction}.`;

              if (s.type === 'NEW_TOPIC') {
                const newCount = (progress.new_topic_session_count ?? 0) + 1;
                if (newCount >= 5) {
                  progressUpdates.new_topic_session_count = 0;
                  progressUpdates.spaced_rep_due = true;
                } else {
                  progressUpdates.new_topic_session_count = newCount;
                }
              }

              if (
                progress.spaced_rep_due &&
                !['EXAM_PRACTICE', 'ABQ_DRILL', 'SHORT_Q_DRILL', 'UNIT_CHECKPOINT'].includes(s.type)
              ) {
                progressUpdates.spaced_rep_due = false;
              }

              const unit3Complete = (progress.units_completed as string[])?.includes('UNIT_3');
              if (unit3Complete && (progress.total_session_count ?? 0) % 10 === 0) {
                progressUpdates.abq_drill_due = true;
              }
              if (s.type === 'ABQ_DRILL') {
                progressUpdates.abq_drill_due = false;
              }

              if (
                s.sessionFlag === 'multiple_concepts_unresolved' ||
                s.nextAction?.startsWith('INSERT_REVISION_BEFORE')
              ) {
                progressUpdates.session_type = 'REVISION';
              } else {
                progressUpdates.session_type = 'NEW_TOPIC';
              }

              await serviceSupabase
                .from('sessions')
                .update({
                  concepts_covered: s.conceptsCovered,
                  lesson_complete: s.lessonComplete,
                  weak_flags_count: s.weakFlagsCount,
                  apply_scores: s.applyScores,
                  session_flag: s.sessionFlag,
                  next_action: s.nextAction,
                })
                .eq('id', sessionId);
            }

            // ── Write all progress updates in one shot ────────────────────
            if (Object.keys(progressUpdates).length > 1) {
              await serviceSupabase
                .from('student_progress')
                .update(progressUpdates)
                .eq('student_id', user.id)
                .eq('subject', effectiveSubject);
            }
          }
        }
      } catch (err) {
        console.error('Streaming error:', err);
        controller.error(err);
        return;
      }

      controller.close();
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'no-cache',
    },
  });
  } catch (err) {
    console.error('ROUTE FATAL ERROR:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}