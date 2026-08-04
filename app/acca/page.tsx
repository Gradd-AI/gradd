import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { resolvePaper, isDirectLinkOnlyArea } from '@/lib/acca/paper';
import { hasPaperAccess } from '@/lib/acca/access';
import ACCADashboard from './ACCADashboard';
import MetaTrackSignup from '@/components/MetaTrackSignup';
import type { PickerArea } from './AreaPicker';

// ── /acca IS THE SIGNED-IN ACCA DASHBOARD ONLY (restructured 2026-08-04) ─────
// The public ACCA pillar now lives at gradd.ai root (app/page.tsx). An anonymous
// visitor here is sent there instead of rendering the pillar a second time, so
// there is exactly one public ACCA marketing surface, not two — and crawlers are
// anonymous, so root (not this route) is what gets indexed.
//
// No metadata export: this route is never the thing anonymous traffic or a crawler
// actually sees (it redirects before rendering anything), so it carries none —
// matching every other signed-in-only route (e.g. app/dashboard/page.tsx).
//
// Every OTHER reference to '/acca' as "the signed-in ACCA home" is unchanged by this
// move: lib/entitlements.ts's home resolution, app/go/page.tsx, the auth-callback
// default `next=`, the ACCA checkout success/cancel targets, and the resit-plan
// email CTA all still point here and are still correct.
export default async function ACCAPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ── Anonymous → the pillar at root. Signed in → the dashboard below. ───────
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
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
  // PER-PAPER (2026-08-03): this page is already scoped to one paper by `?paper=`, so the
  // cap/upsell state it renders must be that paper's. A bundle answer here would show "go
  // unlimited" as satisfied on AFM for an APM-only holder.
  const hasActiveAccess = await hasPaperAccess(supabase, user.id, paper, profile);

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
