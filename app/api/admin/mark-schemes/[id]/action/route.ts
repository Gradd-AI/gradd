import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAIL = 'testbundle@gradd.ai';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json() as {
    action: 'approve' | 'reject' | 'reset';
    supersede_id?: string;
  };

  const service = createServiceClient();
  let updateError: string | null = null;

  if (body.action === 'approve') {
    const { error } = await service
      .from('mark_schemes')
      .update({
        status:      'seed',
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) updateError = error.message;

    // Atomically retire the superseded seed if provided
    if (!updateError && body.supersede_id) {
      const { error: supErr } = await service
        .from('mark_schemes')
        .update({ status: 'rejected' })
        .eq('id', body.supersede_id);
      if (supErr) updateError = supErr.message;
    }

  } else if (body.action === 'reject') {
    const { error } = await service
      .from('mark_schemes')
      .update({ status: 'rejected' })
      .eq('id', id);
    if (error) updateError = error.message;

  } else if (body.action === 'reset') {
    const { error } = await service
      .from('mark_schemes')
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

  if (updateError) return NextResponse.json({ error: updateError }, { status: 500 });
  return NextResponse.json({ ok: true });
}
