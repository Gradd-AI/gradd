import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { anon_id, user_id, event_type, drill_lo, metadata } = body as {
    anon_id?: unknown;
    user_id?: unknown;
    event_type?: unknown;
    drill_lo?: unknown;
    metadata?: unknown;
  };

  if (typeof event_type !== 'string' || !event_type) {
    return NextResponse.json({ error: 'event_type required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  await supabase.from('acca_funnel_events').insert({
    anon_id: typeof anon_id === 'string' ? anon_id : null,
    user_id: typeof user_id === 'string' ? user_id : null,
    event_type,
    drill_lo: typeof drill_lo === 'string' ? drill_lo : null,
    metadata:
      metadata !== null && typeof metadata === 'object' && !Array.isArray(metadata)
        ? metadata
        : null,
  });

  return NextResponse.json({ ok: true });
}
