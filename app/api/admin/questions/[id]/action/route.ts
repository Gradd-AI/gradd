import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'testbundle@gradd.ai';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  // Auth — SSR cookie client to verify caller identity
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as {
    action: 'approve' | 'reject' | 'edit' | 'reset';
    question_text?: string;
    context_text?: string | null;
  };

  // All writes go through service-role (bypasses RLS — hardening rule 2)
  const service = createServiceClient();

  let updateError: string | null = null;

  if (body.action === 'approve') {
    const { error } = await service
      .from('questions')
      .update({
        status:      'seed',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) updateError = error.message;

  } else if (body.action === 'reject') {
    const { error } = await service
      .from('questions')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) updateError = error.message;

  } else if (body.action === 'edit') {
    const { error } = await service
      .from('questions')
      .update({
        question_text: body.question_text,
        context_text:  body.context_text ?? null,
        edited_at:     new Date().toISOString(),
        edited_by:     user.id,
      })
      .eq('id', id);
    if (error) updateError = error.message;

  } else if (body.action === 'reset') {
    // Revert an approved/rejected question back to candidate for re-review
    const { error } = await service
      .from('questions')
      .update({
        status:      'candidate',
        approved_by: null,
        approved_at: null,
      })
      .eq('id', id);
    if (error) updateError = error.message;

  } else {
    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
  }

  if (updateError) {
    return NextResponse.json({ error: updateError }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
