import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// Change this constant to serve a different free drill
const FREE_DRILL_LO = 'B1c';

export async function GET() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('acca_drills')
    .select('id, lo_code, topic, question, context_text, hint, full_reveal')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('lo_code', FREE_DRILL_LO)
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'Drill not available' }, { status: 404 });
  }

  return NextResponse.json({ data });
}
