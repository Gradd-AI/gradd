import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const lo = searchParams.get('lo');

  if (!lo) {
    return NextResponse.json({ error: 'lo required' }, { status: 400 });
  }

  const supabase = createServiceClient();
  const subArea = lo.slice(0, 2);

  // Prefer same sub-area (same syllabus section), exclude current drill
  const { data: sameArea } = await supabase
    .from('acca_drills')
    .select('lo_code, topic')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('status', 'approved')
    .eq('published', true)
    .neq('lo_code', lo)
    .like('lo_code', `${subArea}%`)
    .limit(10);

  if (sameArea && sameArea.length > 0) {
    const pick = sameArea[Math.floor(Math.random() * sameArea.length)];
    return NextResponse.json(pick);
  }

  // Fall back to any other approved drill
  const { data: anyDrill } = await supabase
    .from('acca_drills')
    .select('lo_code, topic')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('status', 'approved')
    .eq('published', true)
    .neq('lo_code', lo)
    .limit(20);

  if (anyDrill && anyDrill.length > 0) {
    const pick = anyDrill[Math.floor(Math.random() * anyDrill.length)];
    return NextResponse.json(pick);
  }

  // No other drills available — restart with same drill
  return NextResponse.json({ lo_code: lo, topic: '' });
}
