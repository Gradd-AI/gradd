import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import ChatInterface from '@/components/chat/ChatInterface';

function getTutorName(subject: string): string {
  return subject.startsWith('IB_') ? 'Mia' : 'Aoife';
}

export const dynamic = 'force-dynamic';

export default async function SessionPage() {
  const supabase = await createServerClient();
  const cookieStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('student_name, exam_level, subscription_status, subject, ib_economics_level, ib_business_level')
    .eq('id', user.id)
    .single();

  // Free tier: logged-in users with a profile may view the session page; teaching is capped downstream.
  if (!profile) redirect('/subscribe');

  const profileSubject = profile.subject ?? 'LC_BUSINESS';
  const isBundle = profileSubject === 'IB_BUNDLE';

  // For bundle students, resolve the active subject from the cookie.
  const activeSubject = isBundle
    ? (cookieStore.get('gradd-active-subject')?.value ?? 'IB_ECONOMICS')
    : profileSubject;

  const { data: progress } = await supabase
    .from('student_progress')
    .select('current_lesson_name, current_unit_name, session_number, current_lesson_code')
    .eq('student_id', user.id)
    .eq('subject', activeSubject)
    .single();

  // Build the header subtitle for bundle students: "IB Economics · HL"
  const activeExamLevel = isBundle
    ? (activeSubject === 'IB_ECONOMICS'
        ? (profile.ib_economics_level ?? profile.exam_level)
        : (profile.ib_business_level ?? profile.exam_level))
    : undefined;
  const subjectDisplayName = activeSubject === 'IB_ECONOMICS' ? 'IB Economics'
    : activeSubject === 'IB_BUSINESS' ? 'IB Business Management'
    : undefined;
  const examLabel = (isBundle && subjectDisplayName && activeExamLevel)
    ? `${subjectDisplayName} · ${activeExamLevel}`
    : undefined;

  return (
    <ChatInterface
      studentName={profile.student_name}
      lessonName={progress?.current_lesson_name ?? 'First Lesson'}
      unitName={progress?.current_unit_name ?? 'Unit 1'}
      sessionNumber={(progress?.session_number ?? 0) + 1}
      lessonCode={progress?.current_lesson_code ?? undefined}
      subject={activeSubject}
      tutorName={getTutorName(activeSubject)}
      activeSubject={isBundle ? activeSubject : undefined}
      examLabel={examLabel}
    />
  );
}
