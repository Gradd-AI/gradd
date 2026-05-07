import { createServerClient } from '@/lib/supabase/server';
import {
  buildInjectedSystemPrompt,
  buildIBEconomicsPrompt,
  buildIBBusinessPrompt,
  deriveCoursePosition,
  formatWeakAreasList,
  formatUnitsCompletedList,
  formatLessonsCompletedThisUnit,
} from '@/lib/system-prompt';
import { determineSessionType } from '@/lib/session-type';
import { NextResponse } from 'next/server';
export const runtime = 'nodejs';

const IB_SUBJECTS = ['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE'] as const;
const IB_FIRST_LESSON_CODES = ['IB_ECON_001', 'IB_BM_001'] as const;

function getEffectiveSubject(profileSubject: string, lessonCode: string): string {
  if (profileSubject === 'IB_BUNDLE') {
    return lessonCode.startsWith('IB_BM_') ? 'IB_BUSINESS' : 'IB_ECONOMICS';
  }
  return profileSubject;
}

export async function POST(request: Request) {
  console.log('Session start called');
  const supabase = await createServerClient();

  // 1. Auth check
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  // 2. Parse optional subject param (Bundle students pass which subject they're studying)
  let requestSubject: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    requestSubject = body.subject;
  } catch {
    // No body — fine
  }

  // 3. Load profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const profileSubject: string = profile.subject ?? 'LC_BUSINESS';
  const isIBStudent = (IB_SUBJECTS as readonly string[]).includes(profileSubject);

  // 4. Load student progress — use subject filter for IB students
  let progressQuery = supabase
    .from('student_progress')
    .select('*')
    .eq('student_id', user.id);

  if (isIBStudent) {
    // For Bundle: use the subject passed in the request; for single-subject, use profile subject
    const progressSubject = profileSubject === 'IB_BUNDLE'
      ? (requestSubject ?? 'IB_ECONOMICS')
      : profileSubject;
    progressQuery = progressQuery.eq('subject', progressSubject);
  }

  const { data: progress } = await progressQuery.single();

  if (!progress) {
    return NextResponse.json({ error: 'Progress record not found' }, { status: 500 });
  }

  // 5. Subscription gate — free lesson 1 for IB students
  const isFirstLesson = (IB_FIRST_LESSON_CODES as readonly string[]).includes(
    progress.current_lesson_code ?? ''
  );
  const isFreeLessonAllowed = isIBStudent && isFirstLesson;

  if (profile.subscription_status !== 'active' && !isFreeLessonAllowed) {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  // 6. Load supporting data
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

  // 7. Fetch next lesson from DB
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

  // 8. Determine session type
  const sessionType = determineSessionType(progress);

  // 9. Increment session number
  const newSessionNumber = (progress.session_number ?? 0) + 1;

  // 10. Build system prompt — branched by effective subject
  const effectiveSubject = getEffectiveSubject(profileSubject, progress.current_lesson_code ?? '');
  let injectedSystemPrompt: string;

  // For IB: use exam_level from the correct subject-specific column
  const ibExamLevel = effectiveSubject === 'IB_BUSINESS'
    ? (profile.ib_business_level ?? profile.exam_level)
    : (profile.ib_economics_level ?? profile.exam_level);

  try {
    if (effectiveSubject === 'IB_ECONOMICS') {
      const lessonOrder = parseInt(progress.current_lesson_code?.replace('IB_ECON_', '') ?? '1');
      injectedSystemPrompt = await buildIBEconomicsPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   ibExamLevel,
        CURRENT_UNIT_CODE:            progress.current_unit_code,
        CURRENT_UNIT_NAME:            progress.current_unit_name,
        CURRENT_LESSON_CODE:          progress.current_lesson_code,
        CURRENT_LESSON_NAME:          progress.current_lesson_name,
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(lessonCompletions ?? [], progress.current_unit_code),
        UNITS_COMPLETED_LIST:         formatUnitsCompletedList(unitCompletions ?? []),
        SESSION_NUMBER:               newSessionNumber,
        SESSION_TYPE:                 sessionType,
        WEAK_AREAS_LIST:              formatWeakAreasList(weakAreas ?? []),
        LAST_SESSION_SUMMARY:         progress.last_session_summary ?? '',
        COURSE_POSITION:              progress.course_position ?? deriveCoursePosition(lessonOrder, ibExamLevel),
      });
    } else if (effectiveSubject === 'IB_BUSINESS') {
      const lessonOrder = parseInt(progress.current_lesson_code?.replace('IB_BM_', '') ?? '1');
      injectedSystemPrompt = await buildIBBusinessPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   ibExamLevel,
        CURRENT_UNIT_CODE:            progress.current_unit_code,
        CURRENT_UNIT_NAME:            progress.current_unit_name,
        CURRENT_LESSON_CODE:          progress.current_lesson_code,
        CURRENT_LESSON_NAME:          progress.current_lesson_name,
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(lessonCompletions ?? [], progress.current_unit_code),
        UNITS_COMPLETED_LIST:         formatUnitsCompletedList(unitCompletions ?? []),
        SESSION_NUMBER:               newSessionNumber,
        SESSION_TYPE:                 sessionType,
        WEAK_AREAS_LIST:              formatWeakAreasList(weakAreas ?? []),
        LAST_SESSION_SUMMARY:         progress.last_session_summary ?? '',
        COURSE_POSITION:              progress.course_position ?? deriveCoursePosition(lessonOrder, ibExamLevel),
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
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(lessonCompletions ?? [], progress.current_unit_code),
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

  // 11. Create session row
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

  // 12. Update progress counters — use subject filter for IB students
  let progressUpdateQuery = supabase
    .from('student_progress')
    .update({
      session_number: newSessionNumber,
      total_session_count: (progress.total_session_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('student_id', user.id);

  if (isIBStudent) {
    progressUpdateQuery = progressUpdateQuery.eq('subject', progress.subject ?? profileSubject);
  }

  await progressUpdateQuery;

  // 13. Store injected system prompt server-side
  await supabase
    .from('sessions')
    .update({ raw_final_response: `__SYSTEM_PROMPT__${injectedSystemPrompt}` })
    .eq('id', session.id);

  return NextResponse.json({
    sessionId: session.id,
    sessionNumber: newSessionNumber,
    sessionType,
    isFreeLessonAllowed,
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
