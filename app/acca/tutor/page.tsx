import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';
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

  const { lo, area } = await searchParams;
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

  const supabase = createServiceClient();

  type Drill = { id: string; lo_code: string; topic: string; question: string; context_text: string | null };
  let data: Drill | null = null;

  if (loCode) {
    // Random-pick among the LO's published drills (was .single()): depth-safe, and
    // returns the chosen row's id so the tutor route serves that exact drill.
    const { data: drills } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', 'APM')
      .eq('lo_code', loCode)
      .eq('status', 'approved')
      .eq('published', true)
      .limit(20);
    if (drills && drills.length > 0) {
      data = pickRandom(drills) as Drill;
    }
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
      data = pickRandom(drills) as Drill;
    }
  } else {
    // Default entry: random-pick among B1c's published drills (was .single()) — depth-safe.
    const { data: drills } = await supabase
      .from('acca_drills')
      .select('id, lo_code, topic, question, context_text')
      .eq('exam_board', 'ACCA')
      .eq('paper_code', 'APM')
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
  const initialCapHit = !hasActiveAccess && usedCount >= 3;

  return <TutorChat drill={data} initialCapHit={initialCapHit} userId={user.id} />;
}
