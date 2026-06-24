import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import TutorChat from './TutorChat';

export const metadata: Metadata = {
  title: 'APM Tutor — Ezra | Gradd',
  description:
    'Conversational APM tutor. Attempt a question, get targeted feedback from Ezra — an experienced APM marker who diagnoses exactly where you stalled.',
};

export default async function APMTutorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { lo, area } = await searchParams;
  const loCode   = typeof lo   === 'string' ? lo   : null;
  const areaCode = typeof area === 'string' ? area : null;

  const supabase = createServiceClient();

  type Drill = { id: string; lo_code: string; topic: string; question: string; context_text: string | null };
  let data: Drill | null = null;

  if (loCode) {
    const { data: d } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', 'APM')
      .eq('lo_code', loCode)
      .eq('status', 'approved')
      .eq('published', true)
      .single();
    data = d ?? null;
  } else if (areaCode) {
    const { data: drills } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', 'APM')
      .eq('status', 'approved')
      .eq('published', true)
      .like('lo_code', `${areaCode}%`)
      .limit(20);
    if (drills && drills.length > 0) {
      data = drills[Math.floor(Math.random() * drills.length)] as Drill;
    }
  } else {
    // No params — fallback to default free drill
    const { data: d } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', 'APM')
      .eq('lo_code', 'B1c')
      .eq('status', 'approved')
      .eq('published', true)
      .single();
    data = d ?? null;
  }

  if (!data) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg)',
        padding: 24,
      }}>
        <p style={{
          fontFamily: 'var(--font-display)',
          fontSize: 18,
          color: 'var(--text-muted)',
          textAlign: 'center',
        }}>
          This drill isn&apos;t available right now — check back shortly.
        </p>
      </div>
    );
  }

  return <TutorChat drill={data} />;
}
