import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getMyProgress, type RecentAttempt } from '@/lib/org/queries';
import { ORG_CSS, SUB_AREA_NAME, fmtDays } from '@/components/org/orgTheme';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Your progress — APM | Gradd',
  description: 'See where you stand and jump straight into the next thing to work on.',
};

const DAY_MS = 86_400_000;

/** Personal activity ribbon — daily attempt volume over the last 25 days, solved (sage)
 *  stacked under missed (rust). Pure SVG, presentation only. Same pattern the coordinator
 *  trainee-detail view uses, pointed at the student's own attempts. */
function Sparkline({ attempts, now }: { attempts: RecentAttempt[]; now: number }) {
  const DAYS = 25, BAR = 6, GAP = 3, H = 40, TOP = 2;
  const step = BAR + GAP;
  const W = DAYS * step - GAP;
  const buckets = Array.from({ length: DAYS }, () => ({ ok: 0, miss: 0 }));
  for (const a of attempts) {
    const di = Math.floor((now - Date.parse(a.created_at)) / DAY_MS);
    if (di < 0 || di >= DAYS) continue;
    if (a.outcome === 'miss') buckets[di].miss++; else buckets[di].ok++;
  }
  const max = Math.max(1, ...buckets.map((b) => b.ok + b.miss));
  const unit = (H - TOP) / max;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Your attempt activity over the last 25 days">
      <line x1={0} y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#ddd5c5" strokeWidth={1} />
      {buckets.map((b, i) => {
        const total = b.ok + b.miss;
        if (!total) return null;
        const x = (DAYS - 1 - i) * step; // oldest at left, today at right
        const okH = b.ok * unit, missH = b.miss * unit;
        return (
          <g key={i}>
            {b.ok > 0 && <rect x={x} y={H - okH} width={BAR} height={okH} rx={1.5} fill="#3d7a52" />}
            {b.miss > 0 && <rect x={x} y={H - okH - missH} width={BAR} height={missH} rx={1.5} fill="#c07a4e" />}
          </g>
        );
      })}
    </svg>
  );
}

export default async function ProgressPage() {
  // ── Auth guard (per-page, not middleware) ──────────────────────────────────
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    redirect('/acca/auth?next=/acca/progress');
  }

  const now = Date.now();
  const p = await getMyProgress(user.id, now);

  return (
    <div className="org">
      <style>{ORG_CSS}</style>
      <style>{PROG_CSS}</style>

      <header className="org-header">
        <Link className="wordmark" href="/acca"><img src="/gradd-ai-logo.png" alt="Gradd" /></Link>
        <span className="org-crumb">
          <Link href="/acca">ACCA APM</Link><span>›</span> Your progress
        </span>
      </header>

      <h1>Your progress</h1>
      <p className="sub">
        {p.hasAnyActivity
          ? <>You last drilled {fmtDays(p.daysSinceActive)}. Here&apos;s where to go next.</>
          : <>You haven&apos;t started yet — pick an area below and Ezra will coach you from wherever you stall.</>}
      </p>

      {/* Activity ribbon — your last 25 days */}
      <div className="org-panel">
        <div className="prog-ribbon">
          <div className="org-spark">
            <div className="org-spark-label">Your activity · last 25 days</div>
            {p.recentAttempts.length
              ? <Sparkline attempts={p.recentAttempts} now={now} />
              : <span className="org-note" style={{ marginTop: 0 }}>Nothing yet — your first drill lands here.</span>}
            {p.recentAttempts.length > 0 && (
              <div className="org-spark-legend">
                <span><i style={{ background: '#3d7a52' }} />solved</span>
                <span><i style={{ background: '#c07a4e' }} />missed</span>
              </div>
            )}
          </div>
          <div className="prog-coverage-summary">
            <span className="prog-cov-n">{p.coveredSubAreas.length}<span className="prog-cov-d">/{p.totalSubAreas}</span></span>
            <span className="prog-cov-k">areas with a correct answer</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Student-view supplement to ORG_CSS (house tokens reused; student voice) ─────
const PROG_CSS = `
.org .prog-ribbon { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.org .prog-coverage-summary { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.org .prog-cov-n { font-family: var(--font-display); font-size: 34px; font-weight: 600; color: var(--text); letter-spacing: -0.5px; line-height: 1; font-variant-numeric: tabular-nums; }
.org .prog-cov-d { color: var(--text-light); font-size: 22px; }
.org .prog-cov-k { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }
`;
