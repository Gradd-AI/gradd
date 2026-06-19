import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import TutorChat from './TutorChat';

// Hardcoded test drill — swap lo_code to change the drill without touching funnel logic
const TEST_DRILL_LO = 'B3d';

export const metadata: Metadata = {
  title: 'APM Tutor — Eli | Gradd',
  description:
    'Conversational APM tutor. Attempt a question, get targeted feedback from Eli — an experienced APM marker who diagnoses exactly where you stalled.',
};

export default async function APMTutorPage() {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('acca_drills')
    .select('id, lo_code, topic, question, context_text')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('lo_code', TEST_DRILL_LO)
    .eq('status', 'approved')
    .eq('published', true)
    .single();

  if (error || !data) {
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
