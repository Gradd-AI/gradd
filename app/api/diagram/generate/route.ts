import { NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import anthropic from '@/lib/anthropic';

export const runtime = 'nodejs';

function cacheKey(prompt: string): string {
  const normalised = prompt.toLowerCase().trim().replace(/\s+/g, ' ');
  return createHash('sha256').update(normalised).digest('hex').slice(0, 32);
}

export async function POST(request: Request) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('subscription_status')
    .eq('id', user.id)
    .single();
  if (profile?.subscription_status !== 'active') {
    return NextResponse.json({ error: 'Subscription required' }, { status: 403 });
  }

  const { prompt } = await request.json();
  if (!prompt) return NextResponse.json({ error: 'prompt required' }, { status: 400 });

  const key = cacheKey(prompt);

  const { data: cached } = await supabase
    .from('diagram_cache')
    .select('svg')
    .eq('cache_key', key)
    .single();

  if (cached?.svg) return NextResponse.json({ svg: cached.svg });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Create a clean, exam-standard SVG diagram for IB Economics or Business Management.

Diagram description: ${prompt}

Rules:
- Output ONLY the SVG element, nothing else — no markdown, no explanation, no code fences
- viewBox="0 0 500 400" (adjust height only as needed; keep width at 500)
- The root <svg> MUST have preserveAspectRatio="xMidYMid meet" and width="100%" height="auto" — never a fixed pixel width or height
- Use these colors: axes/text=#e8e0d0, brand/positive=#2d5a3d, blue=#2980b9, red=#c0392b, amber=#c9903a, muted=#9a9080
- fontFamily="Georgia, serif" throughout
- No external dependencies — pure SVG only
- ALL text and labels MUST fit entirely within the viewBox bounds. Enforce a 20px inset margin on all four edges: no text may start before x=20, end after x=480, start above y=20, or fall below (viewBox height - 20).
- Labels must NOT overlap each other or the boxes/curves they annotate. If space is tight, shorten the label rather than overlapping — abbreviations are fine.
- Keep every text label under 30 characters. Abbreviate if needed; never let a label overflow its allocated space.
- For flowcharts: align boxes on a consistent centre axis; use uniform box width (e.g. 200px); space boxes evenly vertically; draw connector lines between box edges, not through label text.
- For economy/business diagrams: include clear labels on all axes, curves, and key points.
- Match IBO examination standard diagram conventions exactly.`,
    }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = raw.match(/<svg[\s\S]*<\/svg>/);
  const svg = match ? match[0] : '';

  if (!svg || !svg.includes('viewBox')) {
    console.error('[diagram/generate] invalid or empty SVG — skipping cache', { key, prompt, raw: raw.slice(0, 300) });
    return NextResponse.json({ svg: '' });
  }

  const service = createServiceClient();
  await service.from('diagram_cache').insert({ cache_key: key, description: prompt, svg });

  return NextResponse.json({ svg });
}
