import { createServerClient } from '@/lib/supabase/server';
import {
  buildInjectedSystemPrompt,
  formatWeakAreasList,
  formatUnitsCompletedList,
  formatLessonsCompletedThisUnit,
} from '@/lib/system-prompt';
import { parseSignals } from '@/lib/signal-parser';
import anthropic from '@/lib/anthropic';
import { NextResponse } from 'next/server';

const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';
const MAX_TOKENS = 4096;

const UNIT_SEQUENCE: Record<string, { code: string; name: string }> = {
  UNIT_1: { code: 'UNIT_2', name: 'Business Management' },
  UNIT_2: { code: 'UNIT_3', name: 'Business Management (cont.)' },
  UNIT_3: { code: 'UNIT_4A', name: 'Finance — Accounts' },
  UNIT_4A: { code: 'UNIT_4B', name: 'Finance — Ratios' },
  UNIT_4B: { code: 'UNIT_4C', name: 'Finance — Cash Flow' },
  UNIT_4C: { code: 'UNIT_5', name: 'Domestic Environment' },
  UNIT_5: { code: 'UNIT_6', name: 'International Environment' },
  UNIT_6: { code: 'EXAM_PREP', name: 'Exam Preparation' },
};

export async function POST(request: Request) {
  const { sessionId, studentMessage } = await request.json();

  if (!sessionId || !studentMessage) {
    return NextResponse.json({ error: 'sessionId and studentMessage required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  // Auth check
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Subscription check
  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status, student_name, exam_level')
    .eq('id', user.id)
    .single();

  if (profile?.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  // Load session
  const { data: session } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Retrieve or rebuild the injected system prompt
  let injectedSystemPrompt: string;

  const storedPrompt = session.raw_final_response as string | null;
  if (storedPrompt?.startsWith('__SYSTEM_PROMPT__')) {
    injectedSystemPrompt = storedPrompt.replace('__SYSTEM_PROMPT__', '');
  } else {
    const [{ data: progress }, { data: weakAreas }, { data: lessonCompletions }, { data: unitCompletions }] =
      await Promise.all([
        supabase.from('student_progress').select('*').eq('student_id', user.id).single(),
        supabase.from('weak_areas').select('*').eq('student_id', user.id).is('resolved_at', null),
        supabase.from('lesson_completions').select('lesson_code').eq('student_id', user.id),
        supabase.from('unit_completions').select('unit_code').eq('student_id', user.id),
      ]);

    injectedSystemPrompt = await buildInjectedSystemPrompt({
      STUDENT_NAME: profile.student_name,
      EXAM_LEVEL: profile.exam_level,
      CURRENT_UNIT_CODE: progress?.current_unit_code ?? 'UNIT_1',
      CURRENT_UNIT_NAME: progress?.current_unit_name ?? 'People in Business',
      CURRENT_LESSON_CODE: progress?.current_lesson_code ?? '1.1.1',
      CURRENT_LESSON_NAME: progress?.current_lesson_name ?? 'Introduction to People in Business',
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

  // Build message history
  const currentHistory = (session.message_history as Array<{ role: string; content: string }>) ?? [];

  const updatedHistory: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...currentHistory.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: studentMessage },
  ];

  // Append a live context anchor to the system prompt on every message.
  // This prevents Aoife from losing her place in long sessions — she always
  // knows exactly how many exchanges have happened and must not restart.
  const exchangeCount = Math.floor(updatedHistory.length / 2);
  const liveContextAnchor = `

---

## ⚠ LIVE SESSION STATE — READ THIS BEFORE EVERY RESPONSE

You are currently in exchange ${exchangeCount} of an active session.
The conversation history contains ${updatedHistory.length} messages.
The student's latest message is a direct reply to your previous message.

ABSOLUTE RULES FOR THIS RESPONSE:
- Do NOT restart the session.
- Do NOT re-introduce yourself as Aoife.
- Do NOT output a welcome message or session opening.
- Do NOT ask "are you starting fresh" or offer a fresh start as an option.
- Do NOT ask for the student's name or level — you already have both.
- DO continue teaching from exactly where the conversation left off.
- If the student's message is short or ambiguous, treat it as their answer to your last question and respond accordingly.
`;

  const systemWithLiveContext = injectedSystemPrompt + liveContextAnchor;

  // Fire Anthropic streaming
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: systemWithLiveContext,
    messages: updatedHistory,
  });

  let fullResponseText = '';

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      try {
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

        // Persist updated message history and token counts
        const finalHistory = [
          ...updatedHistory,
          { role: 'assistant', content: fullResponseText },
        ];

        const finalMessage = await stream.finalMessage();
        const usage = finalMessage.usage;

        await supabase
          .from('sessions')
          .update({
            message_history: finalHistory,
            raw_final_response: session.raw_final_response, // preserve stored system prompt
            input_tokens: (session.input_tokens ?? 0) + usage.input_tokens,
            output_tokens: (session.output_tokens ?? 0) + usage.output_tokens,
          })
          .eq('id', sessionId);

        // --- SIGNAL PROCESSING ---
        // Parse signals from the completed response and write to Supabase immediately.
        // This ensures progress is saved even if the student closes the browser.
        const signals = parseSignals(fullResponseText);

        const hasSignals =
          signals.lessonComplete ||
          signals.unitComplete ||
          (signals.weakAreaFlags && signals.weakAreaFlags.length > 0) ||
          signals.sessionSummary ||
          signals.lessonIncomplete;

        if (hasSignals) {
          // Load current progress (needed for progression logic)
          const { data: progress } = await supabase
            .from('student_progress')
            .select('*')
            .eq('student_id', user.id)
            .single();

          if (progress) {
            const progressUpdates: Record<string, unknown> = {
              updated_at: new Date().toISOString(),
            };

            // --- WEAK_AREA_FLAGS ---
            for (const flag of signals.weakAreaFlags ?? []) {
              const { data: existing } = await supabase
                .from('weak_areas')
                .select('id, occurrence_count')
                .eq('student_id', user.id)
                .eq('lesson_code', flag.lessonCode)
                .eq('concept_slug', flag.conceptSlug)
                .is('resolved_at', null)
                .single();

              if (existing) {
                await supabase
                  .from('weak_areas')
                  .update({
                    occurrence_count: (existing.occurrence_count ?? 1) + 1,
                    recommended_action: flag.recommendedAction,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existing.id);
              } else {
                await supabase.from('weak_areas').insert({
                  student_id: user.id,
                  lesson_code: flag.lessonCode,
                  concept_slug: flag.conceptSlug,
                  error_description: flag.errorDescription,
                  recommended_action: flag.recommendedAction,
                  session_number: session.session_number,
                });
              }
            }

            // --- LESSON_COMPLETE ---
            if (signals.lessonComplete) {
              const lc = signals.lessonComplete;

              await supabase.from('lesson_completions').upsert({
                student_id: user.id,
                lesson_code: lc.lessonCode,
                completed_at: new Date().toISOString(),
                session_number: session.session_number,
                weak_concepts: lc.weakConcepts,
                apply_scores: lc.applyScores,
                next_lesson_code: lc.nextLesson,
              });

              if (lc.nextLesson && lc.nextLesson !== 'NONE') {
                const { data: nextLesson } = await supabase
                  .from('lessons')
                  .select('lesson_name, unit_code, unit_name')
                  .eq('lesson_code', lc.nextLesson)
                  .single();

                if (nextLesson) {
                  progressUpdates.current_lesson_code = lc.nextLesson;
                  progressUpdates.current_lesson_name = nextLesson.lesson_name;
                }
              }

              const existingCompleted = (progress.lessons_completed_this_unit as string[]) ?? [];
              if (!existingCompleted.includes(lc.lessonCode)) {
                progressUpdates.lessons_completed_this_unit = [...existingCompleted, lc.lessonCode];
              }

              progressUpdates.resume_from_concept = null;

              // Update session row with completion data
              await supabase
                .from('sessions')
                .update({
                  lesson_complete: true,
                  weak_flags_count: signals.weakAreaFlags?.length ?? 0,
                })
                .eq('id', sessionId);
            }

            // --- LESSON_INCOMPLETE ---
            if (signals.lessonIncomplete) {
              progressUpdates.resume_from_concept = signals.lessonIncomplete.resumeFrom;
            }

            // --- UNIT_COMPLETE ---
            if (signals.unitComplete) {
              const uc = signals.unitComplete;
              const scoreNum = parseInt(uc.checkpointScore.split('/')[0]);

              await supabase.from('unit_completions').upsert({
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

            // --- SESSION_SUMMARY ---
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

              await supabase
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

            // Write all progress updates in one shot
            if (Object.keys(progressUpdates).length > 1) {
              await supabase
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
