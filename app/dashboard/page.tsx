// app/dashboard/page.tsx
// Server Component — all data fetched server-side, no loading states.
// Passes data to DashboardClient for the parent/student toggle.

import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import DashboardClient from '@/components/dashboard/DashboardClient';

export const dynamic = 'force-dynamic';

const UNITS = [
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

export default async function DashboardPage() {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  // All queries in parallel
  const [profileRes, progressRes, sessionsRes, weakAreasRes, completionsRes] =
    await Promise.all([
      supabase
        .from('profiles')
        .select('student_name, exam_level, subscription_status')
        .eq('id', user.id)
        .single(),

      supabase
        .from('student_progress')
        .select('current_unit_code, current_unit_name, current_lesson_code, current_lesson_name, session_number, spaced_rep_due, abq_drill_due, units_completed, last_session_summary')
        .eq('student_id', user.id)
        .single(),

      supabase
        .from('sessions')
        .select('id, session_number, session_type, lesson_code, concepts_covered, weak_flags_count, started_at, ended_at, apply_scores')
        .eq('student_id', user.id)
        .not('ended_at', 'is', null)
        .order('started_at', { ascending: false })
        .limit(5),

      supabase
        .from('weak_areas')
        .select('id, concept_slug, error_description, lesson_code, occurrence_count')
        .eq('student_id', user.id)
        .is('resolved_at', null)
        .order('occurrence_count', { ascending: false })
        .limit(5),

      supabase
        .from('lesson_completions')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.id),
    ]);

  const profile = profileRes.data;
  if (!profile || profile.subscription_status !== 'active') redirect('/subscribe');

  const progress = progressRes.data;
  const sessions = sessionsRes.data ?? [];
  const weakAreas = weakAreasRes.data ?? [];
  const totalCompleted = completionsRes.count ?? 0;
  const totalLessons = 279;
  const curriculumPercent = Math.min(100, Math.round((totalCompleted / totalLessons) * 100));
  const unitsCompleted: string[] = (progress?.units_completed as string[]) ?? [];
  const lastSession = sessions[0] ?? null;

  // Resolve lesson name for last session
  let lastSessionLessonName: string | null = null;
  if (lastSession?.lesson_code) {
    const { data: lessonRow } = await supabase
      .from('lessons')
      .select('lesson_name')
      .eq('lesson_code', lastSession.lesson_code)
      .single();
    lastSessionLessonName = lessonRow?.lesson_name ?? null;
  }

  return (
    <DashboardClient
      studentName={profile.student_name}
      examLevel={profile.exam_level === 'higher' ? 'Higher Level' : 'Ordinary Level'}
      sessionNumber={progress?.session_number ?? 0}
      currentLessonCode={progress?.current_lesson_code ?? '1.1.1'}
      currentLessonName={progress?.current_lesson_name ?? 'Introduction to People in Business'}
      currentUnitName={progress?.current_unit_name ?? 'People in Business'}
      currentUnitCode={progress?.current_unit_code ?? 'UNIT_1'}
      sessionType={progress?.session_number === 0 ? 'New Topic' : 'New Topic'}
      curriculumPercent={curriculumPercent}
      totalCompleted={totalCompleted}
      totalLessons={totalLessons}
      totalSessions={sessions.length}
      weakAreasCount={weakAreas.length}
      unitsCompleted={unitsCompleted}
      units={UNITS}
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
    />
  );
}
