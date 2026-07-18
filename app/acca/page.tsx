import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { resolvePaper, isDirectLinkOnlyArea } from '@/lib/acca/paper';
import { hasActiveACCAAccess } from '@/lib/acca/access';
import ACCADashboard from './ACCADashboard';
import MetaTrackSignup from '@/components/MetaTrackSignup';
import type { PickerArea } from './AreaPicker';

export const metadata: Metadata = {
  title: 'ACCA Drill — Gradd AI',
  description:
    'Pick an area and get coached by Ezra — targeted ACCA feedback, not generic hints.',
};

export default async function ACCAPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ── Auth guard (per-page, not middleware) ──────────────────────────────────
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    // Root (gradd.ai) is now the public APM marketing landing — send unauthenticated
    // visitors there rather than straight to the auth wall.
    redirect('/');
  }

  const { paper: paperParam, area: areaParam } = await searchParams;
  // Which ACCA paper's areas to list. Default APM (unchanged for the existing entry);
  // the AFM entry (G2) links here with ?paper=AFM.
  const paper = resolvePaper(typeof paperParam === 'string' ? paperParam : undefined);

  const supabase = createServiceClient();

  // ── Drill areas ────────────────────────────────────────────────────────────
  const { data } = await supabase
    .from('acca_drills')
    .select('lo_code, topic')
    .eq('exam_board', 'ACCA')
    .eq('paper_code', paper)
    .eq('status', 'approved')
    .eq('published', true);

  const groups = new Map<string, { count: number; sampleTopic: string }>();
  for (const row of (data ?? []) as { lo_code: string; topic: string }[]) {
    if (isDirectLinkOnlyArea(paper, row.lo_code)) continue; // direct-link-only (AFM Section A / K4) — not browsable / not the first-run default
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
  // Per-paper free counter (G5b): show the active paper's allowance on the dashboard.
  const capColumn = paper === 'AFM' ? 'afm_teach_throughs_used' : 'apm_teach_throughs_used';
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_teach_throughs_used, afm_teach_throughs_used, apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  const usedCount = ((profile as Record<string, unknown> | null)?.[capColumn] as number | null) ?? 0;
  const hasActiveAccess = hasActiveACCAAccess(profile ?? {}); // bundle-wide ACCA access

  // Exam-cases entry point is gated on APM_CASES. Read server-side and pass only a
  // boolean to the client — the env value itself never enters the client bundle.
  const casesEnabled = process.env.APM_CASES === '1';

  // ── First-run state (F3) ────────────────────────────────────────────────────
  // A brand-new user (zero attempts) gets ONE unmissable "start your first drill"
  // action, deep-linked to a sensible default: the resit-diagnosed area if they
  // arrived with ?area=<prefix> (threaded from the resit CTA and validated against
  // published areas), else the first published area. Returning users never see it.
  const { count: attemptCount } = await supabase
    .from('acca_drill_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user.id);
  const hasAttempted = (attemptCount ?? 0) > 0;
  const requestedArea = typeof areaParam === 'string' ? areaParam.toUpperCase() : undefined;
  const firstDrillFromResit = !!(requestedArea && areas.some((a) => a.subArea === requestedArea));
  const firstDrillArea = firstDrillFromResit ? requestedArea! : (areas[0]?.subArea ?? null);

  return (
    <>
      {/* Fires Meta CompleteRegistration once for a new signup (consent-gated). */}
      <MetaTrackSignup />
      <ACCADashboard
        areas={areas}
        teachThroughsUsed={usedCount}
        hasActiveAccess={!!hasActiveAccess}
        casesEnabled={casesEnabled}
        paper={paper}
        hasAttempted={hasAttempted}
        firstDrillArea={firstDrillArea}
        firstDrillFromResit={firstDrillFromResit}
      />
    </>
  );
}
