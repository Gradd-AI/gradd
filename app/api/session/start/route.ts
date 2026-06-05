import { createServerClient } from '@/lib/supabase/server';
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
import { determineSessionType } from '@/lib/session-type';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

export async function POST(request: Request) {
  console.log('Session start called');
  const body = await request.json().catch(() => ({}));
  const { activeSubject } = body as { activeSubject?: string };

  const supabase = await createServerClient();

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

  // A missing profile is a genuine error and must still be blocked.
  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 403 });
  }
  // Free-tier (non-active) users may start sessions; teaching cap gates them downstream. Active = unrestricted.
  const isFreeTier = profile.subscription_status !== 'active';

  // For bundle subscribers, resolve the active subject from the request body.
  // student_progress rows carry 'IB_ECONOMICS' or 'IB_BUSINESS', never 'IB_BUNDLE'.
  const effectiveSubject = (
    profile.subject === 'IB_BUNDLE' &&
    activeSubject &&
    ['IB_ECONOMICS', 'IB_BUSINESS'].includes(activeSubject)
  ) ? activeSubject : (profile.subject ?? 'LC_BUSINESS');

  // 3. Load student state — filter by subject so IB students with multiple
  //    progress rows don't cause .single() to fail with "multiple rows returned"
  const { data: progress, error: progressError } = await supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', user.id)
    .eq('subject', effectiveSubject)
    .single();

  if (!progress) {
    console.error('SESSION START: progress not found', {
      userId: user.id,
      subject: profile.subject,
      error: progressError?.message,
    });
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

  // 4. Fetch next lesson from DB — gives Aoife the exact name and code to announce.
  //    She is prohibited from improvising the curriculum sequence.
  const { data: currentLessonRow } = await supabase
    .from('lessons')
    .select('next_lesson_code')
    .eq('lesson_code', progress.current_lesson_code)
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

  // 5. Determine session type
  const sessionType = determineSessionType(progress);

  // 6. Increment session number
  const newSessionNumber = (progress.session_number ?? 0) + 1;

 // 7 + 8. Build system prompt — branched by subject
  const subject = effectiveSubject;
  let injectedSystemPrompt: string;

  try {
    if (subject === 'IB_ECONOMICS') {
      const lessonOrder = parseInt(progress.current_lesson_code?.replace('IB_ECON_', '') ?? '1');
      const examQs = await fetchExamQuestionsContext(
        supabase,
        progress.current_lesson_code,
        profile.exam_level,
        'IB_ECONOMICS',
        progress.current_unit_code ?? undefined,
      );
      injectedSystemPrompt = await buildIBEconomicsPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   profile.exam_level, // 'SL' or 'HL'
        CURRENT_UNIT_CODE:            progress.current_unit_code,
        CURRENT_UNIT_NAME:            progress.current_unit_name,
        CURRENT_LESSON_CODE:          progress.current_lesson_code,
        CURRENT_LESSON_NAME:          progress.current_lesson_name,
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(
                                        lessonCompletions ?? [],
                                        progress.current_unit_code
                                      ),
        UNITS_COMPLETED_LIST:         formatUnitsCompletedList(unitCompletions ?? []),
        SESSION_NUMBER:               newSessionNumber,
        SESSION_TYPE:                 sessionType,
        WEAK_AREAS_LIST:              formatWeakAreasList(weakAreas ?? []),
        LAST_SESSION_SUMMARY:         progress.last_session_summary ?? '',
        COURSE_POSITION:              progress.course_position ?? deriveCoursePosition(lessonOrder, 'IB_ECONOMICS', profile.ib_economics_level ?? profile.exam_level),
        EXAM_QUESTIONS_CONTEXT:       examQs.formatted,
      });
    } else if (subject === 'IB_BUSINESS') {
      const lessonOrder = parseInt(progress.current_lesson_code?.replace('IB_BM_', '') ?? '1');
      // p_subject uses the DB key 'IB_BUSINESS_MANAGEMENT'; internal route key stays 'IB_BUSINESS'
      const examQs = await fetchExamQuestionsContext(
        supabase,
        progress.current_lesson_code,
        profile.exam_level,
        'IB_BUSINESS_MANAGEMENT',
        progress.current_unit_code ?? undefined,
      );
      injectedSystemPrompt = await buildIBBusinessPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   profile.exam_level,
        CURRENT_UNIT_CODE:            progress.current_unit_code,
        CURRENT_UNIT_NAME:            progress.current_unit_name,
        CURRENT_LESSON_CODE:          progress.current_lesson_code,
        CURRENT_LESSON_NAME:          progress.current_lesson_name,
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(
                                        lessonCompletions ?? [],
                                        progress.current_unit_code
                                      ),
        UNITS_COMPLETED_LIST:         formatUnitsCompletedList(unitCompletions ?? []),
        SESSION_NUMBER:               newSessionNumber,
        SESSION_TYPE:                 sessionType,
        WEAK_AREAS_LIST:              formatWeakAreasList(weakAreas ?? []),
        LAST_SESSION_SUMMARY:         progress.last_session_summary ?? '',
        COURSE_POSITION:              progress.course_position ?? deriveCoursePosition(lessonOrder, 'IB_BUSINESS', profile.ib_business_level ?? profile.exam_level),
        EXAM_QUESTIONS_CONTEXT:       examQs.formatted,
      });
    } else {
      // LC Business — existing logic unchanged
      injectedSystemPrompt = await buildInjectedSystemPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   profile.exam_level,
        CURRENT_UNIT_CODE:            progress.current_unit_code,
        CURRENT_UNIT_NAME:            progress.current_unit_name,
        CURRENT_LESSON_CODE:          progress.current_lesson_code,
        CURRENT_LESSON_NAME:          progress.current_lesson_name,
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(
                                        lessonCompletions ?? [],
                                        progress.current_unit_code
                                      ),
        UNITS_COMPLETED_LIST:         formatUnitsCompletedList(unitCompletions ?? []),
        SESSION_NUMBER:               newSessionNumber,
        SESSION_TYPE:                 sessionType,
        WEAK_AREAS_LIST:              formatWeakAreasList(weakAreas ?? []),
        LAST_SESSION_SUMMARY:         progress.last_session_summary ?? '',
        SPACED_REP_DUE:               progress.spaced_rep_due ? 'TRUE' : 'FALSE',
        ABQ_DRILL_DUE:                progress.abq_drill_due ? 'TRUE' : 'FALSE',
      });
    }
  } catch (err) {
    console.error('System prompt build failed:', err);
    return NextResponse.json({ error: 'Failed to build session' }, { status: 500 });
  }

  // 9. Create session row
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

  // 10. Update progress counters
  await supabase
    .from('student_progress')
    .update({
      session_number: newSessionNumber,
      total_session_count: (progress.total_session_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', user.id)
    .eq('subject', effectiveSubject);

  // 11. Store injected system prompt server-side in session row for message route
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