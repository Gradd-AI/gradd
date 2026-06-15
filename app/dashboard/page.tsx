// app/dashboard/page.tsx
// Server Component — all data fetched server-side, no loading states.
// Passes data to DashboardClient for the parent/student toggle.

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import DashboardClient from '@/components/dashboard/DashboardClient';
import IBDashboardClient from '@/components/dashboard/IBDashboardClient';
import { type PickerLesson } from '@/components/dashboard/CoursePicker';
import { LESSON_COUNTS } from '@/lib/lesson-counts';

export const dynamic = 'force-dynamic';

const LC_UNITS = [
  { code: 'UNIT_1',    name: 'People in Business' },
  { code: 'UNIT_2',    name: 'Business Management' },
  { code: 'UNIT_3',    name: 'Business Management (cont.)' },
  { code: 'UNIT_4A',   name: 'Finance — Accounts' },
  { code: 'UNIT_4B',   name: 'Finance — Ratios' },
  { code: 'UNIT_4C',   name: 'Finance — Cash Flow' },
  { code: 'UNIT_5',    name: 'Domestic Environment' },
  { code: 'UNIT_6',    name: 'International Environment' },
  { code: 'EXAM_PREP', name: 'Exam Preparation' },
];

const IB_ECON_UNITS = [
  { code: 'UNIT_1', name: 'Introduction to Economics' },
  { code: 'UNIT_2', name: 'Microeconomics' },
  { code: 'UNIT_3', name: 'Macroeconomics' },
  { code: 'UNIT_4', name: 'The Global Economy' },
];

const IB_BM_UNITS = [
  { code: 'UNIT_1', name: 'Business Organisation and Environment' },
  { code: 'UNIT_2', name: 'Human Resource Management' },
  { code: 'UNIT_3', name: 'Finance and Accounts' },
  { code: 'UNIT_4', name: 'Marketing' },
  { code: 'UNIT_5', name: 'Operations Management' },
];

export default async function DashboardPage() {
  const supabase = await createServerClient();
  const cookieStore = await cookies();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // Try to read IB columns; fall back to LC-safe select if they don't exist yet.
  const { data: fullProfile, error: profileError } = await supabase
    .from('profiles')
    .select('student_name, exam_level, subscription_status, subject, ib_economics_level, ib_business_level')
    .eq('id', user.id)
    .single();

  type ProfileRow = {
    student_name: string;
    exam_level: string;
    subscription_status: string;
    subject?: string | null;
    ib_economics_level?: string | null;
    ib_business_level?: string | null;
  };

  let profile: ProfileRow | null = fullProfile as ProfileRow | null;
  if (!profile && profileError) {
    const { data: lcProfile } = await supabase
      .from('profiles')
      .select('student_name, exam_level, subscription_status')
      .eq('id', user.id)
      .single();
    profile = lcProfile as ProfileRow | null;
  }

  // Free tier: a logged-in user with a profile may view the dashboard regardless of subscription.
  // A genuinely missing profile is still an error → send to subscribe/onboarding.
  if (!profile) redirect('/subscribe');

  const subject = profile.subject ?? 'LC_BUSINESS';
  const isBundle = subject === 'IB_BUNDLE';
  const isIBStudent = ['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE'].includes(subject);

  // For bundle students, resolve the active subject from the cookie.
  // All data queries below use activeSubject so the dashboard reflects the selected tab.
  const activeSubject = isBundle
    ? (cookieStore.get('gradd-active-subject')?.value ?? 'IB_ECONOMICS')
    : subject;

  // Lesson code prefix used to scope sessions/weak_areas/completions for bundle students.
  const lessonPrefix = activeSubject === 'IB_ECONOMICS' ? 'IB_ECON_'
    : activeSubject === 'IB_BUSINESS' ? 'IB_BM_'
    : null;

  const displayExamLevel = isIBStudent
    ? (activeSubject === 'IB_BUSINESS'
        ? (profile.ib_business_level ?? profile.exam_level)
        : (profile.ib_economics_level ?? profile.exam_level))
    : (profile.exam_level === 'higher' ? 'Higher Level' : 'Ordinary Level');

  const ibLessonCountKey = `${activeSubject}_${profile.exam_level}`;
  const ibLessonCount = LESSON_COUNTS[ibLessonCountKey];
  if (isIBStudent && ibLessonCount === undefined) {
    console.warn(`Dashboard: no lesson count for key "${ibLessonCountKey}" — check profiles.exam_level`);
  }
  const totalLessons = isIBStudent ? (ibLessonCount ?? 279) : LESSON_COUNTS.LC_BUSINESS;

  const units = activeSubject === 'IB_ECONOMICS' ? IB_ECON_UNITS
    : activeSubject === 'IB_BUSINESS' ? IB_BM_UNITS
    : LC_UNITS;

  // student_progress: always filter by activeSubject so bundle students get the right row.
  let sessionsQuery = supabase
    .from('sessions')
    .select('id, session_number, session_type, lesson_code, concepts_covered, weak_flags_count, started_at, ended_at, apply_scores')
    .eq('student_id', user.id)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(5);
  if (lessonPrefix) sessionsQuery = sessionsQuery.like('lesson_code', `${lessonPrefix}%`);

  let weakAreasQuery = supabase
    .from('weak_areas')
    .select('id, concept_slug, error_description, lesson_code, occurrence_count')
    .eq('student_id', user.id)
    .is('resolved_at', null)
    .order('occurrence_count', { ascending: false })
    .limit(5);
  if (lessonPrefix) weakAreasQuery = weakAreasQuery.like('lesson_code', `${lessonPrefix}%`);

  let completionsQuery = supabase
    .from('lesson_completions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', user.id);
  if (lessonPrefix) completionsQuery = completionsQuery.like('lesson_code', `${lessonPrefix}%`);

  // Count-only query for total sessions — no .limit so the number isn't capped at 5.
  // Subject-filtered the same way as sessionsQuery so bundle students see per-subject counts.
  let sessionCountQuery = supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', user.id)
    .not('ended_at', 'is', null);
  if (lessonPrefix) sessionCountQuery = sessionCountQuery.like('lesson_code', `${lessonPrefix}%`);

  const [progressRes, sessionsRes, weakAreasRes, completionsRes, sessionCountRes] = await Promise.all([
    supabase
      .from('student_progress')
      .select('current_unit_code, current_unit_name, current_lesson_code, current_lesson_name, session_number, spaced_rep_due, abq_drill_due, units_completed, last_session_summary')
      .eq('student_id', user.id)
      .eq('subject', activeSubject)
      .single(),
    sessionsQuery,
    weakAreasQuery,
    completionsQuery,
    sessionCountQuery,
  ]);

  const progress = progressRes.data;
  const sessions = sessionsRes.data ?? [];
  const weakAreas = weakAreasRes.data ?? [];
  const totalCompleted = completionsRes.count ?? 0;
  const totalSessions = sessionCountRes.count ?? sessions.length;
  const curriculumPercent = Math.min(100, Math.round((totalCompleted / totalLessons) * 100));
  const unitsCompleted: string[] = (progress?.units_completed as string[]) ?? [];
  const lastSession = sessions[0] ?? null;

  let lastSessionLessonName: string | null = null;
  if (lastSession?.lesson_code) {
    const { data: lessonRow } = await supabase
      .from('lessons')
      .select('lesson_name')
      .eq('lesson_code', lastSession.lesson_code)
      .single();
    lastSessionLessonName = lessonRow?.lesson_name ?? null;
  }

  // ── Course picker data (IB only) ──────────────────────────────────────────
  // All lessons for the active subject + per-student completion state.
  // Run only for IB students; LC uses DashboardClient which has no picker.
  let pickerLessons: PickerLesson[] = [];
  let pickerCompletedCodes: string[] = [];
  let pickerWeakAreaCodes: string[] = weakAreas.map(w => w.lesson_code);

  if (isIBStudent) {
    let pickerLessonsQuery = supabase
      .from('lessons')
      .select('lesson_code, lesson_name, unit_code, unit_name, topic_code, level')
      .eq('subject', activeSubject)
      .order('lesson_code');

    let pickerCompletedQuery = supabase
      .from('lesson_completions')
      .select('lesson_code')
      .eq('student_id', user.id);
    if (lessonPrefix) pickerCompletedQuery = pickerCompletedQuery.like('lesson_code', `${lessonPrefix}%`);

    const [pickerLessonsRes, pickerCompletedRes] = await Promise.all([
      pickerLessonsQuery,
      pickerCompletedQuery,
    ]);
    pickerLessons       = (pickerLessonsRes.data ?? []) as PickerLesson[];
    pickerCompletedCodes = (pickerCompletedRes.data ?? []).map(r => r.lesson_code);
  }

  const ClientComponent = isIBStudent ? IBDashboardClient : DashboardClient;

  return (
    <ClientComponent
      studentName={profile.student_name}
      subject={subject}
      activeSubject={activeSubject}
      isBundle={isBundle}
      examLevel={displayExamLevel ?? ''}
      sessionNumber={progress?.session_number ?? 0}
      currentLessonCode={progress?.current_lesson_code ?? '1.1.1'}
      currentLessonName={progress?.current_lesson_name ?? 'Introduction to People in Business'}
      currentUnitName={progress?.current_unit_name ?? 'People in Business'}
      currentUnitCode={progress?.current_unit_code ?? 'UNIT_1'}
      sessionType={progress?.session_number === 0 ? 'New Topic' : 'New Topic'}
      curriculumPercent={curriculumPercent}
      totalCompleted={totalCompleted}
      totalLessons={totalLessons}
      totalSessions={totalSessions}
      weakAreasCount={weakAreas.length}
      unitsCompleted={unitsCompleted}
      units={units}
      recentSessions={sessions.map(s => ({
        id: s.id,
        session_number: s.session_number,
        session_type: s.session_type,
        lesson_code: s.lesson_code,
        started_at: s.started_at,
        ended_at: s.ended_at,
        weak_flags_count: s.weak_flags_count,
      }))}
      weakAreas={weakAreas}
      lastSession={lastSession ? {
        ...lastSession,
        lesson_name: lastSessionLessonName,
        concepts_covered: (lastSession.concepts_covered ?? []).map((s: string) =>
          s.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
        ),
      } : null}
      spaced_rep_due={progress?.spaced_rep_due ?? false}
      abq_drill_due={progress?.abq_drill_due ?? false}
      pickerLessons={pickerLessons}
      pickerCompletedCodes={pickerCompletedCodes}
      pickerWeakAreaCodes={pickerWeakAreaCodes}
      subscriptionStatus={profile.subscription_status ?? ''}
    />
  );
}

