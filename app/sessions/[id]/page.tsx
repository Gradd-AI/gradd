import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { createServerClient } from '@/lib/supabase/server';
import TranscriptRenderer, { type TranscriptMessage } from '@/components/session-review/TranscriptRenderer';

export const dynamic = 'force-dynamic';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

function sessionTypeLabel(type: string | null): string {
  const map: Record<string, string> = {
    NEW_TOPIC: 'New topic', REVISION: 'Revision', EXAM_PRACTICE: 'Exam practice',
    ABQ_DRILL: 'ABQ drill', SHORT_Q_DRILL: 'Short Q drill', UNIT_CHECKPOINT: 'Unit checkpoint',
  };
  return (type && map[type]) || (type ?? '');
}

function getTutorName(subject: string | null): string {
  return subject?.startsWith('IB_') ? 'Mia' : 'Aoife';
}

const CSS = `
.tr-page { min-height: 100vh; background: var(--paper, oklch(96.2% 0.012 78)); }
.tr-wrap { max-width: 760px; margin: 0 auto; padding: 0 24px; }
.tr-header { border-bottom: 1px solid var(--rule, oklch(88% 0.01 78)); padding: 24px 0 24px; }
.tr-back {
  font-family: var(--sans, "Geist",ui-sans-serif,system-ui,sans-serif);
  font-size: 13px; color: var(--ink-3, oklch(54% 0.012 60)); text-decoration: none;
  display: inline-block; margin-bottom: 16px;
}
.tr-back:hover { color: var(--ink, oklch(18% 0.012 60)); }
.tr-lesson {
  font-family: var(--serif, "Fraunces","Times New Roman",Georgia,serif);
  font-style: italic; font-weight: 400;
  font-size: clamp(20px, 3vw, 28px); letter-spacing: -0.02em;
  color: var(--ink); margin: 0 0 12px;
}
.tr-meta {
  display: flex; gap: 14px; flex-wrap: wrap; align-items: center;
  font-family: var(--mono, "Geist Mono",ui-monospace,monospace);
  font-size: 11px; color: var(--ink-3);
}
.tr-tag {
  background: color-mix(in oklab, var(--forest, oklch(22% 0.035 168)) 8%, var(--paper));
  padding: 2px 8px; border-radius: 4px; font-size: 10.5px;
  color: var(--forest, oklch(22% 0.035 168));
}
.tr-tag-complete {
  background: color-mix(in oklab, var(--forest) 14%, var(--paper));
  color: var(--forest);
}
.tr-tag-score {
  background: color-mix(in oklab, var(--gold, oklch(72% 0.12 78)) 14%, var(--paper));
  color: var(--ink-2, oklch(34% 0.012 60));
}
.tr-weak-list { margin: 12px 0 0; display: flex; gap: 8px; flex-wrap: wrap; }
.tr-weak-chip {
  background: color-mix(in oklab, var(--rust, oklch(58% 0.18 47)) 8%, var(--paper));
  border: 1px solid color-mix(in oklab, var(--rust) 22%, var(--rule));
  padding: 3px 10px; border-radius: 6px;
  font-family: var(--sans); font-size: 12px; color: var(--rust);
}
.tr-notice {
  background: color-mix(in oklab, var(--forest) 5%, var(--paper));
  border: 1px solid color-mix(in oklab, var(--forest) 12%, var(--rule));
  border-radius: 10px; padding: 12px 16px;
  font-family: var(--sans); font-size: 12.5px; color: var(--forest);
  margin-bottom: 28px;
}
.tr-body { padding: 32px 0 64px; }
@media (max-width: 640px) {
  .tr-wrap { padding: 0 16px; }
  .tr-lesson { font-size: 20px; }
}
`;

export default async function SessionTranscriptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/auth/login');

  const [profileRes, sessionRes, messagesRes, eventsRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('student_name')
      .eq('id', user.id)
      .single(),
    // RLS on sessions enforces student_id = auth.uid() — explicit .eq guards against id-guessing
    supabase
      .from('sessions')
      .select('id, session_number, subject, lesson_code, unit_name, session_type, started_at, ended_at, apply_scores, lesson_complete, weak_flags_count')
      .eq('id', id)
      .eq('student_id', user.id)
      .single(),
    supabase
      .from('session_messages')
      .select('id, role, content, turn_index')
      .eq('session_id', id)
      .eq('student_id', user.id)
      .order('turn_index', { ascending: true }),
    supabase
      .from('session_events')
      .select('concept, event_data')
      .eq('session_id', id)
      .eq('student_id', user.id)
      .eq('event_type', 'weak_area_flag'),
  ]);

  if (!profileRes.data) redirect('/subscribe');
  if (!sessionRes.data) notFound();

  const session    = sessionRes.data;
  const messages   = (messagesRes.data ?? []) as TranscriptMessage[];
  const weakEvents = eventsRes.data ?? [];
  const studentName = profileRes.data.student_name;

  // Resolve lesson name
  let lessonName = session.lesson_code ?? '—';
  if (session.lesson_code) {
    const { data: lessonRow } = await supabase
      .from('lessons')
      .select('lesson_name')
      .eq('lesson_code', session.lesson_code)
      .single();
    if (lessonRow?.lesson_name) lessonName = lessonRow.lesson_name;
  }

  const tutorName = getTutorName(session.subject ?? null);

  // Extract weak area concepts — column `concept` is the direct string
  const weakConcepts: string[] = weakEvents
    .map(e => {
      if (e.concept) return e.concept as string;
      const d = e.event_data as Record<string, string> | null;
      return d?.concept ?? '';
    })
    .filter(Boolean);

  const firstScore = session.apply_scores ? session.apply_scores.split(',')[0] : null;

  return (
    <div className="tr-page ib-dash">
      <style>{CSS}</style>
      <div className="tr-wrap">

        {/* Header */}
        <div className="tr-header">
          <Link href="/sessions" className="tr-back">← All sessions</Link>
          <h1 className="tr-lesson">{lessonName}</h1>
          <div className="tr-meta">
            {session.started_at && <span>{formatDateTime(session.started_at)}</span>}
            {session.unit_name  && <span>{session.unit_name}</span>}
            <span className="tr-tag">{sessionTypeLabel(session.session_type)}</span>
            {session.lesson_complete && (
              <span className="tr-tag tr-tag-complete">✓ Lesson complete</span>
            )}
            {firstScore && (
              <span className="tr-tag tr-tag-score">Apply score {firstScore}</span>
            )}
          </div>
          {weakConcepts.length > 0 && (
            <div className="tr-weak-list">
              {weakConcepts.map((c, i) => (
                <span key={i} className="tr-weak-chip">⚠ {c}</span>
              ))}
            </div>
          )}
        </div>

        {/* Transcript body */}
        <div className="tr-body">
          <div className="tr-notice">
            Read-only — this is a record of your session with {tutorName}. Library diagrams are re-rendered; dynamic diagrams show a placeholder.
          </div>
          <TranscriptRenderer
            messages={messages}
            studentName={studentName}
            tutorName={tutorName}
          />
        </div>

      </div>
    </div>
  );
}
