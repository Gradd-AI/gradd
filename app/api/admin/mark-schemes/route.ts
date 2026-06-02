import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

const ADMIN_EMAIL    = 'testbundle@gradd.ai';
const SUBJECT_ALLOWLIST = ['IB_ECONOMICS', 'IB_BUSINESS_MANAGEMENT'] as const;
type Subject = typeof SUBJECT_ALLOWLIST[number];

export async function GET(request: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
  }

  const raw = request.nextUrl.searchParams.get('subject');
  let subject: Subject;
  if (!raw) {
    subject = 'IB_ECONOMICS';
  } else if (!(SUBJECT_ALLOWLIST as readonly string[]).includes(raw)) {
    return NextResponse.json({ error: 'Invalid subject' }, { status: 400 });
  } else {
    subject = raw as Subject;
  }

  const service = createServiceClient();

  // 1. All candidate mark_schemes for subject (hybrid + content_checklist only)
  const { data: candidates, error: cErr } = await service
    .from('mark_schemes')
    .select('id, question_id, scheme_type, max_marks, scheme_data')
    .eq('subject', subject)
    .eq('status', 'candidate')
    .in('scheme_type', ['hybrid', 'content_checklist'])
    .order('scheme_type')
    .order('question_id');

  if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });
  if (!candidates?.length) return NextResponse.json({ data: [] });

  const questionIds = [...new Set(candidates.map(c => c.question_id as string))];

  // 2. Linked question data
  const { data: questions, error: qErr } = await service
    .from('questions')
    .select('id, question_text, context_text, marks, command_term, paper, question_type, ao_level, level')
    .in('id', questionIds);

  if (qErr) return NextResponse.json({ error: qErr.message }, { status: 500 });

  const questionMap = Object.fromEntries(
    (questions ?? []).map(q => [q.id as string, q]),
  );

  // 3. Existing seed mark_schemes for the same questions (supersede detection)
  const { data: seeds, error: sErr } = await service
    .from('mark_schemes')
    .select('id, question_id, scheme_type, scheme_data')
    .eq('subject', subject)
    .eq('status', 'seed')
    .in('question_id', questionIds);

  if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 });

  // One seed per question_id (take first if duplicates exist)
  const seedMap: Record<string, typeof seeds[0]> = {};
  for (const s of seeds ?? []) {
    if (!seedMap[s.question_id as string]) seedMap[s.question_id as string] = s;
  }

  const data = candidates.map(c => ({
    ...c,
    question:      questionMap[c.question_id as string] ?? null,
    existing_seed: seedMap[c.question_id as string] ?? null,
  }));

  return NextResponse.json({ data });
}
