import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

export async function GET(request: Request): Promise<Response> {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const lo   = searchParams.get('lo');
  const area = searchParams.get('area');

  if (!lo && !area) {
    return NextResponse.json({ error: 'lo or area required' }, { status: 400 });
  }

  const supabase = createServiceClient();

  // area= mode: pick a random drill from a sub-area (e.g. ?area=B1 → lo_code LIKE 'B1%')
  if (area && !lo) {
    const { data: areaData } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', 'APM')
      .eq('status', 'approved')
      .eq('published', true)
      .like('lo_code', `${area}%`)
      .limit(20);

    if (areaData && areaData.length > 0) {
      return NextResponse.json(areaData[Math.floor(Math.random() * areaData.length)]);
    }
    return NextResponse.json({ error: 'No drills found for this area' }, { status: 404 });
  }

  // lo= mode: prefer same sub-area, exclude current drill
  const subArea = lo!.slice(0, 2);

  // Prefer same sub-area (same syllabus section), exclude current drill
  const { data: sameArea } = await supabase
    .from('acca_drills')
    .select('id, lo_code, topic, question, context_text')
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
    .select('id, lo_code, topic, question, context_text')
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
