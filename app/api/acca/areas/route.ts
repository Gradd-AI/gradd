import { NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { resolvePaper, isDirectLinkOnlyArea } from '@/lib/acca/paper';

export async function GET(request: Request): Promise<Response> {
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const paper = resolvePaper(new URL(request.url).searchParams.get('paper'));
  const supabase = createServiceClient();

  const { data } = await supabase
    .from('acca_drills')
    .select('lo_code, topic')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true);

  const groups = new Map<string, { count: number; sampleTopic: string }>();
  for (const row of (data ?? []) as { lo_code: string; topic: string }[]) {
    if (isDirectLinkOnlyArea(paper, row.lo_code)) continue; // direct-link-only (AFM Section A / K4) — not browsable
    const subArea = row.lo_code.slice(0, 2);
    if (!groups.has(subArea)) {
      groups.set(subArea, { count: 0, sampleTopic: row.topic });
    }
    groups.get(subArea)!.count++;
  }

  const areas = Array.from(groups.entries())
    .map(([subArea, { count, sampleTopic }]) => ({ subArea, sampleTopic, count }))
    .sort((a, b) => a.subArea.localeCompare(b.subArea));

  return NextResponse.json(areas);
}
