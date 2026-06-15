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
  const { activeSubject, lessonCode: requestedLessonCode } = body as {
    activeSubject?: string;
    lessonCode?: string;
  };

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

  // ── Lesson override (picker / Model B) ──────────────────────────────────────
  // Student requests a specific lesson; we validate and use it for this session
  // only. student_progress.current_lesson_code is never touched — the sequence
  // pointer stays frozen. Invalid code or HL-only lesson for SL student →
  // silently fall back to the sequential current_lesson_code.
  let overrideLesson: {
    lesson_code: string; lesson_name: string;
    unit_code: string;   unit_name: string;
  } | null = null;

  if (requestedLessonCode) {
    const { data: overrideRow } = await supabase
      .from('lessons')
      .select('lesson_code, lesson_name, unit_code, unit_name, level')
      .eq('lesson_code', requestedLessonCode)
      .eq('subject', effectiveSubject)
      .maybeSingle();

    if (overrideRow) {
      const studentLevel = effectiveSubject === 'IB_BUSINESS'
        ? (profile.ib_business_level ?? profile.exam_level)
        : effectiveSubject === 'IB_ECONOMICS'
        ? (profile.ib_economics_level ?? profile.exam_level)
        : profile.exam_level;
      if (!(overrideRow.level === 'HL_ONLY' && studentLevel === 'SL')) {
        overrideLesson = {
          lesson_code: overrideRow.lesson_code,
          lesson_name: overrideRow.lesson_name,
          unit_code:   overrideRow.unit_code,
          unit_name:   overrideRow.unit_name,
        };
      }
    }
  }

  const effectiveLessonCode = overrideLesson?.lesson_code ?? progress.current_lesson_code;
  const effectiveLessonName = overrideLesson?.lesson_name ?? progress.current_lesson_name;
  const effectiveUnitCode   = overrideLesson?.unit_code   ?? progress.current_unit_code;
  const effectiveUnitName   = overrideLesson?.unit_name   ?? progress.current_unit_name;

  const weakAreaPrefix = effectiveSubject === 'IB_ECONOMICS' ? 'IB_ECON_'
    : effectiveSubject === 'IB_BUSINESS' ? 'IB_BM_'
    : null;

  let weakAreasQuery = supabase
    .from('weak_areas')
    .select('*')
    .eq('student_id', user.id)
    .is('resolved_at', null)
    .order('created_at', { ascending: false });
  if (weakAreaPrefix) weakAreasQuery = weakAreasQuery.like('lesson_code', `${weakAreaPrefix}%`);

  const [{ data: weakAreas }, { data: lessonCompletions }, { data: unitCompletions }] =
    await Promise.all([
      weakAreasQuery,
      supabase.from('lesson_completions').select('lesson_code').eq('student_id', user.id),
      supabase.from('unit_completions').select('unit_code').eq('student_id', user.id),
    ]);

  // 4. Fetch next lesson from DB — gives Aoife the exact name and code to announce.
  //    She is prohibited from improvising the curriculum sequence.
  const { data: currentLessonRow } = await supabase
    .from('lessons')
    .select('next_lesson_code')
    .eq('lesson_code', effectiveLessonCode)
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
  // Override sessions always start fresh on the chosen topic — no checkpoint/drill state.
  const sessionType = overrideLesson ? 'NEW_TOPIC' : determineSessionType(progress);

  // 6. Increment session number
  const newSessionNumber = (progress.session_number ?? 0) + 1;

 // 7 + 8. Build system prompt — branched by subject
  const subject = effectiveSubject;
  let injectedSystemPrompt: string;

  try {
    if (subject === 'IB_ECONOMICS') {
      const lessonOrder = parseInt(effectiveLessonCode?.replace('IB_ECON_', '') ?? '1');
      const examQs = await fetchExamQuestionsContext(
        supabase,
        effectiveLessonCode,
        profile.exam_level,
        'IB_ECONOMICS',
        effectiveUnitCode ?? undefined,
      );
      injectedSystemPrompt = await buildIBEconomicsPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   profile.exam_level,
        CURRENT_UNIT_CODE:            effectiveUnitCode,
        CURRENT_UNIT_NAME:            effectiveUnitName,
        CURRENT_LESSON_CODE:          effectiveLessonCode,
        CURRENT_LESSON_NAME:          effectiveLessonName,
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(
                                        lessonCompletions ?? [],
                                        effectiveUnitCode
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
      const lessonOrder = parseInt(effectiveLessonCode?.replace('IB_BM_', '') ?? '1');
      // p_subject uses the DB key 'IB_BUSINESS_MANAGEMENT'; internal route key stays 'IB_BUSINESS'
      const examQs = await fetchExamQuestionsContext(
        supabase,
        effectiveLessonCode,
        profile.exam_level,
        'IB_BUSINESS_MANAGEMENT',
        effectiveUnitCode ?? undefined,
      );
      injectedSystemPrompt = await buildIBBusinessPrompt({
        STUDENT_NAME:                 profile.student_name,
        EXAM_LEVEL:                   profile.exam_level,
        CURRENT_UNIT_CODE:            effectiveUnitCode,
        CURRENT_UNIT_NAME:            effectiveUnitName,
        CURRENT_LESSON_CODE:          effectiveLessonCode,
        CURRENT_LESSON_NAME:          effectiveLessonName,
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(
                                        lessonCompletions ?? [],
                                        effectiveUnitCode
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
        CURRENT_UNIT_CODE:            effectiveUnitCode,
        CURRENT_UNIT_NAME:            effectiveUnitName,
        CURRENT_LESSON_CODE:          effectiveLessonCode,
        CURRENT_LESSON_NAME:          effectiveLessonName,
        NEXT_LESSON_CODE:             nextLessonCode,
        NEXT_LESSON_NAME:             nextLessonName,
        LESSONS_COMPLETED_THIS_UNIT:  formatLessonsCompletedThisUnit(
                                        lessonCompletions ?? [],
                                        effectiveUnitCode
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
      lesson_code: effectiveLessonCode,
      message_history: [],
      subject:    effectiveSubject,
      unit_code:  effectiveUnitCode,
      unit_name:  effectiveUnitName,
      exam_level: profile.exam_level,
    })
    .select()
    .single();

  if (sessionError || !session) {
    console.error('Session insert error:', sessionError);
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
  }

  // 10. Update progress counters
  // total_session_count is NOT incremented here — it is incremented in
  // /session/complete so it counts completed sessions, not started ones.
  // Incrementing in both routes caused a double-count (fixed 12 Jun 2026).
  await supabase
    .from('student_progress')
    .update({
      session_number: newSessionNumber,
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