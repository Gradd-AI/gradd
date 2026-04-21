import { createServerClient } from '@/lib/supabase/server';
import {
  buildInjectedSystemPrompt,
  formatWeakAreasList,
  formatUnitsCompletedList,
  formatLessonsCompletedThisUnit,
} from '@/lib/system-prompt';
import { determineSessionType } from '@/lib/session-type';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = createServerClient();

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // 2. Subscription gate
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile || profile.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  // 3. Load student state
  const { data: progress } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', user.id)
    .single();

  if (!progress) {
    return NextResponse.json({ error: 'Progress record not found' }, { status: 500 });
  }

  const [{ data: weakAreas }, { data: lessonCompletions }, { data: unitCompletions }] =
    await Promise.all([
      supabase
        .from('weak_areas')
        .select('*')
        .eq('student_id', user.id)
        .is('resolved_at', null)
        .order('created_at', { ascending: false }),
      supabase.from('lesson_completions').select('lesson_code').eq('student_id', user.id),
      supabase.from('unit_completions').select('unit_code').eq('student_id', user.id),
    ]);

  // 4. Determine session type
  const sessionType = determineSessionType(progress);

  // 5. Increment session number
  const newSessionNumber = (progress.session_number ?? 0) + 1;

  // 6. Assemble context variables
  const contextVars = {
    STUDENT_NAME: profile.student_name,
    EXAM_LEVEL: profile.exam_level,
    CURRENT_UNIT_CODE: progress.current_unit_code,
    CURRENT_UNIT_NAME: progress.current_unit_name,
    CURRENT_LESSON_CODE: progress.current_lesson_code,
    CURRENT_LESSON_NAME: progress.current_lesson_name,
    LESSONS_COMPLETED_THIS_UNIT: formatLessonsCompletedThisUnit(
      lessonCompletions ?? [],
      progress.current_unit_code
    ),
    UNITS_COMPLETED_LIST: formatUnitsCompletedList(unitCompletions ?? []),
    SESSION_NUMBER: newSessionNumber,
    SESSION_TYPE: sessionType,
    WEAK_AREAS_LIST: formatWeakAreasList(weakAreas ?? []),
    LAST_SESSION_SUMMARY: progress.last_session_summary ?? '',
    SPACED_REP_DUE: progress.spaced_rep_due ? 'TRUE' : 'FALSE',
    ABQ_DRILL_DUE: progress.abq_drill_due ? 'TRUE' : 'FALSE',
  };

  // 7. Build injected system prompt (server-side only — never sent to client)
  let injectedSystemPrompt: string;
  try {
    injectedSystemPrompt = await buildInjectedSystemPrompt(contextVars);
  } catch (err) {
    console.error('System prompt build failed:', err);
    return NextResponse.json({ error: 'Failed to build session' }, { status: 500 });
  }

  // 8. Create session row
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .insert({
      student_id: user.id,
      session_number: newSessionNumber,
      session_type: sessionType,
      lesson_code: progress.current_lesson_code,
      message_history: [],
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error('Session insert error:', sessionError);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  // 9. Update progress counters
  await supabase
    .from('student_progress')
    .update({
      session_number: newSessionNumber,
      total_session_count: (progress.total_session_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', user.id);

  // 10. Store injected system prompt server-side in session row for message route
  await supabase
    .from('sessions')
    .update({ raw_final_response: `__SYSTEM_PROMPT__${injectedSystemPrompt}` })
    .eq('id', session.id);

  // Return session metadata only — NEVER the system prompt
  return NextResponse.json({
    sessionId: session.id,
    sessionNumber: newSessionNumber,
    sessionType,
    currentLesson: {
      code: progress.current_lesson_code,
      name: progress.current_lesson_name,
    },
    currentUnit: {
      code: progress.current_unit_code,
      name: progress.current_unit_name,
    },
  });
}
