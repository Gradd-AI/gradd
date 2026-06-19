import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, drill_lo, outcome } = body as {
    email?: unknown;
    drill_lo?: unknown;
    outcome?: unknown;
  };

  if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    return NextResponse.json({ error: 'Valid email required' }, { status: 400 });
  }
  if (typeof drill_lo !== 'string' || !drill_lo) {
    return NextResponse.json({ error: 'drill_lo required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Resolve drill_id and topic from lo_code
  const { data: drill, error: drillErr } = await supabase
    .from('acca_drills')
    .select('id, topic')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('lo_code', drill_lo)
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (drillErr || !drill) {
    return NextResponse.json({ error: 'Unknown drill' }, { status: 400 });
  }

  const { error: insErr } = await supabase.from('acca_leads').insert({
    email: email.trim().toLowerCase(),
    drill_id: drill.id,
    topic: drill.topic,
    outcome: typeof outcome === 'string' ? outcome : 'revealed',
  });

  // 23505 = unique constraint violation — duplicate email, treat as success
  if (insErr && insErr.code !== '23505') {
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
