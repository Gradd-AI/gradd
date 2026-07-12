import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
import { resolvePaper } from '@/lib/acca/paper';
import { hasActiveACCAAccess } from '@/lib/acca/access';
import TutorChat from './TutorChat';

export const metadata: Metadata = {
  title: 'APM Tutor — Ezra | Gradd',
  description:
    'Conversational APM tutor. Attempt a question, get targeted feedback from Ezra — an experienced APM marker who diagnoses exactly where you stalled.',
};

// Request-time random pick, intentionally non-deterministic (drill variety across loads).
// Module-level (outside the component) so it sits beyond React's render-purity scope — a
// Server Component renders once per request, so there is no re-render instability to guard.
function pickRandom<T>(rows: T[]): T {
  return rows[Math.floor(Math.random() * rows.length)];
}

export default async function APMTutorPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ── Auth guard (per-page, not middleware) ──────────────────────────────────
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    redirect('/acca/auth?next=/acca/tutor');
  }

  const { lo, area, drill_id, paper: paperParam } = await searchParams;
  // Which ACCA paper to scope lo/area/default fetches to. AFM and APM LO codes collide,
  // so a non-id fetch MUST carry the paper. Default APM (unchanged for every existing
  // APM entry point). An id fetch is paper-agnostic (id is globally unique).
  const paper = resolvePaper(typeof paperParam === 'string' ? paperParam : undefined);
  // LO/area codes are stored leading-uppercase, rest-lowercase, alphanumeric only
  // (e.g. 'A3b', 'B1'). PostgREST .eq/.like are case-sensitive AND .like treats _ / %
  // as wildcards, so canonicalize the URL param: strip non-alphanumerics (closes the
  // ?area=B_ wildcard exposure) then fix casing. Otherwise ?lo=A3F dead-ends a real
  // published drill. Empty after stripping → null → default B1c drill.
  const canon = (s: string) => {
    const a = s.replace(/[^a-z0-9]/gi, '');
    return a ? a[0].toUpperCase() + a.slice(1).toLowerCase() : '';
  };
  const loCode   = typeof lo   === 'string' ? canon(lo)   || null : null;
  const areaCode = typeof area === 'string' ? canon(area) || null : null;
  // Exact-drill resume (from /acca/progress). uuid, so NOT canonicalized — a bad id
  // just misses the .eq below and we fall through to the lo/area/default random-pick.
  const drillId  = typeof drill_id === 'string' && drill_id ? drill_id : null;

  const supabase = createServiceClient();

  type Drill = { id: string; lo_code: string; topic: string; question: string; context_text: string | null };
  let data: Drill | null = null;

  if (drillId) {
    // Resume exactly this drill: the tutor POST re-reads acca_tutor_progress by
    // (user_id, drill_id), so landing back on the same id restores miss_count/diagnosis.
    // Still gated to a published APM drill so a stale/foreign id can't surface anything.
    const { data: drill } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('id', drillId)
      .eq('exam_board', 'ACCA')
      .eq('status', 'approved')
      .eq('published', true)
      .maybeSingle();
    if (drill) data = drill as Drill;
  }

  if (!data && loCode) {
    // Random-pick among the LO's published drills (was .single()): depth-safe, and
    // returns the chosen row's id so the tutor route serves that exact drill.
    const { data: drills } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', paper)
      .eq('lo_code', loCode)
      .eq('status', 'approved')
      .eq('published', true)
      .limit(20);
    if (drills && drills.length > 0) {
      data = pickRandom(drills) as Drill;
    }
  }

  if (!data && areaCode) {
    const { data: drills } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', paper)
      .eq('status', 'approved')
      .eq('published', true)
      .like('lo_code', `${areaCode}%`)
      .limit(20);
    if (drills && drills.length > 0) {
      data = pickRandom(drills) as Drill;
    }
  }

  if (!data) {
    // Default entry: random-pick among B1c's published drills (was .single()) — depth-safe.
    const { data: drills } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', paper)
      .eq('lo_code', 'B1c')
      .eq('status', 'approved')
      .eq('published', true)
      .limit(20);
    if (drills && drills.length > 0) {
      data = pickRandom(drills) as Drill;
    }
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

  // ── Read cap state from profiles ───────────────────────────────────────────
  // Per-paper free counter (G5b): the AFM and APM allowances meter independently.
  const capColumn = paper === 'AFM' ? 'afm_teach_throughs_used' : 'apm_teach_throughs_used';
  const { data: profile } = await supabase
    .from('profiles')
    .select('apm_teach_throughs_used, afm_teach_throughs_used, apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();

  const usedCount = ((profile as Record<string, unknown> | null)?.[capColumn] as number | null) ?? 0;
  const hasActiveAccess = hasActiveACCAAccess(profile ?? {}); // bundle-wide ACCA access
  const initialCapHit = !hasActiveAccess && usedCount >= 3;

  return <TutorChat drill={data} initialCapHit={initialCapHit} userId={user.id} />;
}
