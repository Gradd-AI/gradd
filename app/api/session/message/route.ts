import { createServerClient } from '@/lib/supabase/server';
import {
  buildInjectedSystemPrompt,
  formatWeakAreasList,
  formatUnitsCompletedList,
  formatLessonsCompletedThisUnit,
} from '@/lib/system-prompt';
import anthropic from '@/lib/anthropic';
import { NextResponse } from 'next/server';

// Use the Haiku model as default (cost-efficient)
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5';
const MAX_TOKENS = 2048;

export async function POST(request: Request) {
  const { sessionId, studentMessage } = await request.json();

  if (!sessionId || !studentMessage) {
    return NextResponse.json({ error: 'sessionId and studentMessage required' }, { status: 400 });
  }

  const supabase = createServerClient();

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

  // Check if we stored the system prompt in the session row (set during /start)
  const storedPrompt = session.raw_final_response as string | null;
  if (storedPrompt?.startsWith('__SYSTEM_PROMPT__')) {
    injectedSystemPrompt = storedPrompt.replace('__SYSTEM_PROMPT__', '');
  } else {
    // Rebuild from current state (fallback)
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

  // Get current message history
  const currentHistory = (session.message_history as Array<{ role: string; content: string }>) ?? [];

  // Append student message
  const updatedHistory = [
    ...currentHistory,
    { role: 'user' as const, content: studentMessage },
  ];

  // Fire Anthropic streaming
  const stream = anthropic.messages.stream({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: injectedSystemPrompt,
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

        // After stream completes: persist history + token counts
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
            // Store actual response text (overwrite the system prompt placeholder)
            raw_final_response: fullResponseText,
            input_tokens: (session.input_tokens ?? 0) + usage.input_tokens,
            output_tokens: (session.output_tokens ?? 0) + usage.output_tokens,
          })
          .eq('id', sessionId);

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
