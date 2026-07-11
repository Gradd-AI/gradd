import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import { resolveIsIB } from '@/lib/site';
import { resolveProducts, holdsAny } from '@/lib/entitlements';
import ChatInterface from '@/components/chat/ChatInterface';

function getTutorName(subject: string): string {
  return subject.startsWith('IB_') ? 'Mia' : 'Aoife';
}

export const dynamic = 'force-dynamic';

export default async function SessionPage({
  searchParams,
}: {
  searchParams: Promise<{ lesson?: string }>;
}) {
  const supabase = await createServerClient();
  const cookieStore = await cookies();
  const { lesson: pickedLessonCode } = await searchParams;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('student_name, exam_level, subscription_status, subject, ib_economics_level, ib_business_level, apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  // Free tier: logged-in users with a profile may view the session page; teaching is capped downstream.
  if (!profile) redirect('/subscribe');

  // ── Product guard ───────────────────────────────────────────────────────────
  // /session is the LC/IB teaching surface. Same guard as /dashboard: an account that
  // holds neither LC nor IB is sent to its real home rather than into an LC session.
  const { count: footprintCount } = await supabase
    .from('sessions')
    .select('*', { count: 'exact', head: true })
    .eq('student_id', user.id)
    .not('ended_at', 'is', null);
  const host = (await headers()).get('host') ?? '';
  const isGraddAi = await resolveIsIB(host);
  const ent = resolveProducts(profile, { isGraddAi, lcIbFootprint: (footprintCount ?? 0) > 0 });
  if (!holdsAny(ent, 'LC', 'IB')) redirect(ent.home);

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

  // When a picker-chosen lesson differs from the sequential current lesson, fetch
  // its name so the ChatInterface header reflects what's actually being studied.
  let lessonNameToShow  = progress?.current_lesson_name  ?? 'First Lesson';
  let unitNameToShow    = progress?.current_unit_name    ?? 'Unit 1';
  let lessonCodeToShow  = progress?.current_lesson_code  ?? undefined;

  if (pickedLessonCode) {
    lessonCodeToShow = pickedLessonCode;
    if (pickedLessonCode !== progress?.current_lesson_code) {
      const { data: pickedRow } = await supabase
        .from('lessons')
        .select('lesson_name, unit_name')
        .eq('lesson_code', pickedLessonCode)
        .single();
      if (pickedRow) {
        lessonNameToShow = pickedRow.lesson_name;
        unitNameToShow   = pickedRow.unit_name;
      }
    }
  }

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
      lessonName={lessonNameToShow}
      unitName={unitNameToShow}
      sessionNumber={(progress?.session_number ?? 0) + 1}
      lessonCode={lessonCodeToShow}
      subject={activeSubject}
      tutorName={getTutorName(activeSubject)}
      activeSubject={isBundle ? activeSubject : undefined}
      examLabel={examLabel}
      pickedLessonCode={pickedLessonCode}
      subscriptionStatus={profile.subscription_status}
    />
  );
}
