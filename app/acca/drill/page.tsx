import type { Metadata } from 'next';
import { createServiceClient } from '@/lib/supabase/server';
import DrillFunnel from './DrillFunnel';

// Free drill LO — keep in sync with /api/acca/drill/route.ts
const FREE_DRILL_LO = 'B1c';

export const metadata: Metadata = {
  title: 'Free APM Practice Drill | Gradd',
  description:
    'Attempt a real ACCA APM practice drill — attempt, get a targeted hint, re-attempt, then see how an examiner thinks. No account needed.',
};

export default async function APMDrillPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const loCode = typeof params.lo === 'string' ? params.lo : FREE_DRILL_LO;

  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from('acca_drills')
    .select('id, lo_code, topic, question, context_text, hint, full_reveal')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('lo_code', loCode)
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
        padding: '24px',
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

  return <DrillFunnel drill={data} />;
}
