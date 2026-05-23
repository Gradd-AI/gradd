import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'testbundle@gradd.ai';

// Defense-in-depth: guard duplicated here even though proxy.ts already blocks
// non-admin users at the route level for /admin/* paths.
export async function GET() {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  // Service-role client — bypasses RLS so all questions are readable
  const service = createServiceClient();
  const { data, error } = await service
    .from('questions')
    .select('id,topic_code,paper,question_type,command_term,marks,ao_level,level,subject,question_text,context_text,verification_notes,verification_status,status,approved_by,approved_at')
    .in('verification_status', ['pass', 'borderline', 'fail'])
    .order('approved_at', { ascending: true, nullsFirst: true })
    .order('topic_code');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data });
}
