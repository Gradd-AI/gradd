import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Signal processing runs in /api/session/message/route.ts on every message.
// This route handles session closure and ensures last_session_summary is always
// populated so Aoife has continuity context at the start of the next session.

export async function POST(request: Request) {
  const { sessionId } = await request.json();

  if (!sessionId) {
    return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
  }

  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  // Load session with message history and lesson info
  const { data: session } = await supabase
    .from('sessions')
    .select('id, ended_at, session_number, lesson_code, message_history')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Stamp ended_at (idempotent)
  if (!session.ended_at) {
    await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  // Derive subject from the session's lesson_code — works for all subjects including
  // IB_BUNDLE where profile.subject does not match any student_progress row directly.
  const subject = session.lesson_code?.startsWith('IB_ECON_') ? 'IB_ECONOMICS'
    : session.lesson_code?.startsWith('IB_BM_') ? 'IB_BUSINESS'
    : 'LC_BUSINESS';

  // Load current progress
  const { data: progress } = await supabase
    .from('student_progress')
    .select('total_session_count, last_session_summary, current_lesson_name, current_unit_name')
    .eq('student_id', user.id)
    .eq('subject', subject)
    .single();

  if (progress) {
    const progressUpdates: Record<string, unknown> = {
      total_session_count: (progress.total_session_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    };

    // If last_session_summary was not set by a SESSION_SUMMARY signal during the session,
    // write a basic continuity note. This ensures Aoife never restarts the same lesson
    // from scratch in the next session — she knows work was done and should continue.
    if (!progress.last_session_summary || progress.last_session_summary === '') {
      const history = (session.message_history as Array<{ role: string; content: string }>) ?? [];
      const exchangeCount = Math.floor(history.length / 2);

      if (exchangeCount > 0) {
        const _dateStr = new Date().toLocaleDateString('en-GB', {
              day: 'numeric', month: 'long', year: 'numeric',
            });
        progressUpdates.last_session_summary =
          `On ${_dateStr}, the student was working through ${progress.current_lesson_name ?? 'the current lesson'} ` +
          `(${session.lesson_code ?? 'unknown'}), ${progress.current_unit_name ?? 'the current unit'} (did not complete). ` +
          `${exchangeCount} exchanges completed. Resume from where the session ended — do not restart from the beginning.`;
      }
    }

    await supabase
      .from('student_progress')
      .update(progressUpdates)
      .eq('student_id', user.id)
      .eq('subject', subject);
  }

  return NextResponse.json({ success: true });
}
