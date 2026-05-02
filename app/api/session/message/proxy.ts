import { createServerClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';
import {
  buildInjectedSystemPrompt,
  formatWeakAreasList,
  formatUnitsCompletedList,
  formatLessonsCompletedThisUnit,
} from '@/lib/system-prompt';
import { parseSignals } from '@/lib/signal-parser';
import anthropic from '@/lib/anthropic';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit'

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';
const MAX_TOKENS = 4096;

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

const UNIT_SEQUENCE: Record<string, { code: string; name: string }> = {
  UNIT_1:  { code: 'UNIT_2',    name: 'Business Management' },
  UNIT_2:  { code: 'UNIT_3',    name: 'Business Management (cont.)' },
  UNIT_3:  { code: 'UNIT_4A',   name: 'Finance — Accounts' },
  UNIT_4A: { code: 'UNIT_4B',   name: 'Finance — Ratios' },
  UNIT_4B: { code: 'UNIT_4C',   name: 'Finance — Cash Flow' },
  UNIT_4C: { code: 'UNIT_5',    name: 'Domestic Environment' },
  UNIT_5:  { code: 'UNIT_6',    name: 'International Environment' },
  UNIT_6:  { code: 'EXAM_PREP', name: 'Exam Preparation' },
};

export async function POST(request: Request) {
  const { sessionId, studentMessage } = await request.json();

  if (!sessionId || !studentMessage) {
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
    .select('subscription_status, student_name, exam_level')
    .eq('id', user.id)
    .single();

  if (profile?.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  // ── Load session ──────────────────────────────────────────────────────────
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // ── Build injected system prompt ──────────────────────────────────────────
  let injectedSystemPrompt: string;

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
      supabase.from('student_progress').select('*').eq('student_id', user.id).single(),
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

    injectedSystemPrompt = await buildInjectedSystemPrompt({
      STUDENT_NAME: profile.student_name,
      EXAM_LEVEL: profile.exam_level,
      CURRENT_UNIT_CODE: progress?.current_unit_code ?? 'UNIT_1',
      CURRENT_UNIT_NAME: progress?.current_unit_name ?? 'People in Business',
      CURRENT_LESSON_CODE: currentLessonCode,
      CURRENT_LESSON_NAME: progress?.current_lesson_name ?? 'Introduction to People in Business',
      NEXT_LESSON_CODE: nextLessonCode,
      NEXT_LESSON_NAME: nextLessonName,
      LESSONS_COMPLETED_THIS_UNIT: formatLessonsCompletedThisUnit(
        lessonCompletions ?? [],
        progress?.current_unit_code ?? 'UNIT_1'
      ),
      UNITS_COMPLETED_LIST: formatUnitsCompletedList(unitCompletions ?? []),
      SESSION_NUMBER: session.session_number,
      SESSION_TYPE: session.session_type,
      WEAK_AREAS_LIST: formatWeakAreasList(weakAreas ?? []),
      LAST_SESSION_SUMMARY: progress?.last_session_summary ?? '',
      SPACED_REP_DUE: progress?.spaced_rep_due ? 'TRUE' : 'FALSE',
      ABQ_DRILL_DUE: progress?.abq_drill_due ? 'TRUE' : 'FALSE',
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
    : `This is the opening exchange. Begin teaching now.`}

ABSOLUTE RULES — VIOLATIONS ARE CRITICAL ERRORS:
- Do NOT restart the session under any circumstances.
- Do NOT re-introduce yourself as Aoife.
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
    model: MODEL,
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

              const nextUnit = UNIT_SEQUENCE[uc.unitCode];
              if (nextUnit) {
                progressUpdates.current_unit_code = nextUnit.code;
                progressUpdates.current_unit_name = nextUnit.name;
                progressUpdates.lessons_completed_this_unit = [];
                progressUpdates.pending_unit_checkpoint = false;
                progressUpdates.checkpoint_unit_code = null;
              }
            }

            // ── SESSION_SUMMARY ───────────────────────────────────────────
            if (signals.sessionSummary) {
              const s = signals.sessionSummary;

              progressUpdates.last_session_summary =
                fullResponseText.match(/\[SESSION_SUMMARY:[^\]]+\]/)?.[0] ?? '';

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
                .eq('student_id', user.id);
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
}