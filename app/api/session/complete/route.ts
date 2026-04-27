import { createServerClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// Signal processing has been moved to /api/session/message/route.ts.
// Signals are now written to Supabase on every message response, so progress
// is never lost if the student closes the browser without clicking End session.
// This route is now responsible for session closure only.

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

  // Verify session belongs to this user
  const { data: session } = await supabase
    .from('sessions')
    .select('id, ended_at, session_number')
    .eq('id', sessionId)
    .eq('student_id', user.id)
    .single();

  if (!session) return NextResponse.json({ error: 'Session not found' }, { status: 404 });

  // Stamp ended_at if not already set (idempotent)
  if (!session.ended_at) {
    await supabase
      .from('sessions')
      .update({ ended_at: new Date().toISOString() })
      .eq('id', sessionId);
  }

  // Increment total_session_count
  const { data: progress } = await supabase
    .from('student_progress')
    .select('total_session_count')
    .eq('student_id', user.id)
    .single();

  if (progress) {
    await supabase
      .from('student_progress')
      .update({ total_session_count: (progress.total_session_count ?? 0) + 1 })
      .eq('student_id', user.id);
  }

  return NextResponse.json({ success: true });
}
