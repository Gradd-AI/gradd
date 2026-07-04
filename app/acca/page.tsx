import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import ACCADashboard from './ACCADashboard';
import type { PickerArea } from './AreaPicker';

export const metadata: Metadata = {
  title: 'APM Drill — Gradd AI',
  description:
    'Pick a performance management area and get coached by Ezra — targeted APM feedback, not generic hints.',
};

export default async function ACCAPage() {
  // ── Auth guard (per-page, not middleware) ──────────────────────────────────
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    // Root (gradd.ai) is now the public APM marketing landing — send unauthenticated
    // visitors there rather than straight to the auth wall.
    redirect('/');
  }

  const supabase = createServiceClient();

  // ── Drill areas ────────────────────────────────────────────────────────────
  const { data } = await supabase
    .from('acca_drills')
    .select('lo_code, topic')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', 'APM')
    .eq('status', 'approved')
    .eq('published', true);

  const groups = new Map<string, { count: number; sampleTopic: string }>();
  for (const row of (data ?? []) as { lo_code: string; topic: string }[]) {
    const subArea = row.lo_code.slice(0, 2);
    if (!groups.has(subArea)) {
      groups.set(subArea, { count: 0, sampleTopic: row.topic });
    }
    groups.get(subArea)!.count++;
  }

  const areas: PickerArea[] = Array.from(groups.entries())
    .map(([subArea, { count, sampleTopic }]) => ({ subArea, sampleTopic, count }))
    .sort((a, b) => a.subArea.localeCompare(b.subArea));

  // ── Cap state from profile ─────────────────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_teach_throughs_used, apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  const usedCount = (profile?.apm_teach_throughs_used as number | null) ?? 0;
  const hasActiveAccess =
    profile?.apm_subscription_status === 'active' ||
    (profile?.apm_pass_expires_at &&
      new Date(profile.apm_pass_expires_at as string) > new Date());

  // Exam-cases entry point is gated on APM_CASES. Read server-side and pass only a
  // boolean to the client — the env value itself never enters the client bundle.
  const casesEnabled = process.env.APM_CASES === '1';

  return (
    <ACCADashboard
      areas={areas}
      teachThroughsUsed={usedCount}
      hasActiveAccess={!!hasActiveAccess}
      casesEnabled={casesEnabled}
    />
  );
}
