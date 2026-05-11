import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import anthropic from '@/lib/anthropic';

export const runtime = 'nodejs';

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

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Create a clean, exam-standard SVG diagram for IB Economics or Business Management.

Diagram description: ${prompt}

Rules:
- Output ONLY the SVG element, nothing else — no markdown, no explanation
- viewBox="0 0 500 400" (adjust height as needed)
- Use these colors: axes/text=#e8e0d0, brand/positive=#2d5a3d, blue=#2980b9, red=#c0392b, amber=#c9903a, muted=#9a9080
- fontFamily="Georgia, serif" throughout
- No external dependencies — pure SVG
- Include clear labels on all axes, curves, and key points
- Match IBO examination standard diagram conventions exactly`,
    }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '';
  const match = raw.match(/<svg[\s\S]*<\/svg>/);
  return NextResponse.json({ svg: match ? match[0] : '' });
}
