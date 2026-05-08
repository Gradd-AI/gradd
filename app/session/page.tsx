import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import ChatInterface from '@/components/chat/ChatInterface';

export const dynamic = 'force-dynamic';

const IB_SUBJECTS = ['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE'] as const;
const IB_FIRST_LESSON_CODES = ['IB_ECON_001', 'IB_BM_001'] as const;

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string }>;
}) {
  const supabase = await createServerClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const params = await searchParams;

  // Load profile first so we can use subject for the progress query
  const { data: profile } = await supabase
    .from('profiles')
    .select('student_name, exam_level, subscription_status, subject, ib_economics_level, ib_business_level')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/auth/login');

  const profileSubject = profile.subject ?? 'LC_BUSINESS';
  const isIBStudent = (IB_SUBJECTS as readonly string[]).includes(profileSubject);

  // For bundle students, use the URL subject param; otherwise use profile subject
  const progressSubject = params.subject ?? (profileSubject === 'IB_BUNDLE' ? 'IB_ECONOMICS' : profileSubject);

  let progressQuery = supabase
    .from('student_progress')
    .select('current_lesson_name, current_unit_name, session_number, current_lesson_code, subject')
    .eq('student_id', user.id);

  // Only filter by subject for IB students — LC rows may have subject NULL on older installs
  if (isIBStudent) {
    progressQuery = progressQuery.eq('subject', progressSubject);
  }

  const { data: progress } = await progressQuery.single();

  const currentLessonCode = progress?.current_lesson_code ?? '';
  const isFirstLesson = (IB_FIRST_LESSON_CODES as readonly string[]).includes(currentLessonCode);
  const isFreeLessonAllowed = isIBStudent && isFirstLesson;

  if (profile.subscription_status !== 'active' && !isFreeLessonAllowed) {
    redirect('/subscribe');
  }

  const sessionSubject = params.subject ?? (profileSubject === 'IB_BUNDLE' ? 'IB_ECONOMICS' : profileSubject);

  return (
    <ChatInterface
      studentName={profile.student_name}
      lessonName={progress?.current_lesson_name ?? 'First Lesson'}
      unitName={progress?.current_unit_name ?? 'Unit 1'}
      sessionNumber={(progress?.session_number ?? 0) + 1}
      lessonCode={currentLessonCode || undefined}
      subscriptionStatus={profile.subscription_status ?? null}
      subject={profileSubject}
      sessionSubject={sessionSubject}
    />
  );
}
