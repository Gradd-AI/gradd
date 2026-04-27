import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import ChatInterface from '@/components/chat/ChatInterface';

export const dynamic = 'force-dynamic';

export default async function SessionPage() {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const [{ data: profile }, { data: progress }] = await Promise.all([
    supabase
      .from('profiles')
      .select('student_name, exam_level, subscription_status')
      .eq('id', user.id)
      .single(),
    supabase
      .from('student_progress')
      .select('current_lesson_name, current_unit_name, session_number')
      .eq('student_id', user.id)
      .single(),
  ]);

  if (!profile || profile.subscription_status !== 'active') redirect('/subscribe');

  return (
    <ChatInterface
      studentName={profile.student_name}
      lessonName={progress?.current_lesson_name ?? 'First Lesson'}
      unitName={progress?.current_unit_name ?? 'Unit 1'}
      sessionNumber={(progress?.session_number ?? 0) + 1}
      lessonCode={progress.current_lesson_code}
    />
  );
}
