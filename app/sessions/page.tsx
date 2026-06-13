import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import SessionListClient from '@/components/session-review/SessionListClient';

export const dynamic = 'force-dynamic';

const CSS = `
.sr-page { min-height: 100vh; background: var(--paper, oklch(96.2% 0.012 78)); }
.sr-wrap { max-width: 760px; margin: 0 auto; padding: 0 24px; }
.sr-head { padding: 32px 0 24px; display: flex; align-items: center; justify-content: space-between; }
.sr-head h1 {
  font-family: var(--serif, "Fraunces","Times New Roman",Georgia,serif);
  font-style: italic; font-weight: 400;
  font-size: clamp(22px, 3vw, 30px); letter-spacing: -0.02em;
  color: var(--ink, oklch(18% 0.012 60)); margin: 0;
}
.sr-back {
  font-family: var(--sans, "Geist",ui-sans-serif,system-ui,sans-serif);
  font-size: 13px; color: var(--ink-3, oklch(54% 0.012 60)); text-decoration: none;
}
.sr-back:hover { color: var(--ink, oklch(18% 0.012 60)); }
@media (max-width: 640px) { .sr-wrap { padding: 0 16px; } }
`;

export default async function SessionsPage() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [profileRes, sessionsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('student_name, subject')
      .eq('id', user.id)
      .single(),
    supabase
      .from('sessions')
      .select('id, subject, lesson_code, unit_name, session_type, started_at, apply_scores, weak_flags_count, lesson_complete')
      .eq('student_id', user.id)
      .not('ended_at', 'is', null)
      .order('started_at', { ascending: false }),
  ]);

  if (!profileRes.data) redirect('/subscribe');

  const sessions = sessionsRes.data ?? [];

  // Batch-fetch lesson names
  const lessonCodes = [...new Set(
    sessions.map(s => s.lesson_code).filter((c): c is string => Boolean(c))
  )];
  let nameMap: Record<string, string> = {};
  if (lessonCodes.length > 0) {
    const { data: lessonRows } = await supabase
      .from('lessons')
      .select('lesson_code, lesson_name')
      .in('lesson_code', lessonCodes);
    nameMap = Object.fromEntries((lessonRows ?? []).map(r => [r.lesson_code, r.lesson_name]));
  }

  return (
    <div className="sr-page ib-dash">
      <style>{CSS}</style>
      <div className="sr-wrap">
        <div className="sr-head">
          <h1>Sessions</h1>
          <Link href="/dashboard" className="sr-back">← Dashboard</Link>
        </div>
        <SessionListClient sessions={sessions} nameMap={nameMap} />
      </div>
    </div>
  );
}
