import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getMyProgress, type RecentAttempt, type AreaTrend } from '@/lib/org/queries';
import { ORG_CSS, SUB_AREA_NAME, fmtDays, cellTone } from '@/components/org/orgTheme';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const areaName = (sa: string) => SUB_AREA_NAME[sa] ?? sa;

/** Recency nudge — trajectory framing, never a verdict. */
function recencyNudge(daysSinceActive: number | null): string {
  if (daysSinceActive == null) return 'Your first drill is the hardest to start and the quickest to finish.';
  if (daysSinceActive <= 0) return "You're on a roll — you drilled today.";
  if (daysSinceActive === 1) return 'Back at it — you last drilled yesterday.';
  if (daysSinceActive <= 7) return `A few days off (${daysSinceActive}). A short drill picks the thread back up.`;
  return `It's been ${daysSinceActive} days — one quick drill gets you moving again.`;
}

/** ▲ improving / ▼ needs-work. flat and unknown render nothing (no noise). */
function TrendGlyph({ trend }: { trend: AreaTrend }) {
  if (trend === 'improving') return <span className="prog-trend up" title="Improving lately">▲ improving</span>;
  if (trend === 'declining') return <span className="prog-trend down" title="Slipping lately">▼ needs work</span>;
  return null;
}

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
      <div className="prog-nudge">
        <span className="prog-nudge-text">{recencyNudge(p.daysSinceActive)}</span>
        {p.streakDays >= 2 && <span className="prog-streak">🔥 {p.streakDays}-day streak</span>}
      </div>

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

      {/* Weak areas — ranked, tappable, every card a doorway into a scoped drill */}
      {p.weakAreas.length > 0 && (
        <>
          <h2>Work on these next</h2>
          <p className="sub" style={{ marginBottom: 16 }}>Where you&apos;re missing most. Tap one and Ezra picks up a question from exactly that area.</p>
          <div className="prog-cards">
            {p.weakAreas.map((w) => {
              const tone = cellTone(w.missRate);
              return (
                <Link key={w.subArea} href={`/acca/tutor?area=${encodeURIComponent(w.subArea)}`} className="prog-card">
                  <span className="prog-card-dot" style={{ background: tone.bg }} aria-hidden="true" />
                  <span className="prog-card-body">
                    <span className="prog-card-title">{areaName(w.subArea)}</span>
                    <span className="prog-card-meta">
                      {w.misses} of {w.attempts} missed · {pct(w.missRate)}
                      <TrendGlyph trend={w.trend} />
                    </span>
                  </span>
                  <span className="prog-card-cta">Drill this →</span>
                </Link>
              );
            })}
          </div>
        </>
      )}

      {/* Not-yet-attempted areas — the coordinator's coverage pills, inverted into a to-do */}
      {p.uncoveredSubAreas.length > 0 && (
        <div className="org-panel" style={{ marginTop: 28 }}>
          <h2 style={{ margin: '0 0 4px' }}>Not attempted yet</h2>
          <p className="org-note" style={{ marginTop: 0, marginBottom: 14 }}>
            {p.uncoveredSubAreas.length} area{p.uncoveredSubAreas.length === 1 ? '' : 's'} you haven&apos;t got a correct answer in yet — a good place to start.
          </p>
          <div className="org-kv">
            {p.uncoveredSubAreas.map((sa) => (
              <Link key={sa} href={`/acca/tutor?area=${encodeURIComponent(sa)}`} className="pill prog-pill-link">
                {areaName(sa)} <span className="prog-pill-cta">start here →</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Student-view supplement to ORG_CSS (house tokens reused; student voice) ─────
const PROG_CSS = `
/* recency nudge + streak — trajectory framing, not a verdict */
.org .prog-nudge { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; margin: 0 0 26px; }
.org .prog-nudge-text { font-size: 15px; color: var(--text-muted); }
.org .prog-streak { font-size: 12px; font-weight: 700; color: #8a4b1c; background: #f4e7d2; border: 1px solid #e6d3ae; border-radius: 999px; padding: 3px 11px; letter-spacing: .01em; white-space: nowrap; }

/* per-area trajectory glyph */
.org .prog-trend { margin-left: 8px; font-size: 11px; font-weight: 700; letter-spacing: .02em; white-space: nowrap; }
.org .prog-trend.up { color: #1e5a38; }
.org .prog-trend.down { color: #a4402e; }

.org .prog-ribbon { display: flex; align-items: center; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
.org .prog-coverage-summary { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.org .prog-cov-n { font-family: var(--font-display); font-size: 34px; font-weight: 600; color: var(--text); letter-spacing: -0.5px; line-height: 1; font-variant-numeric: tabular-nums; }
.org .prog-cov-d { color: var(--text-light); font-size: 22px; }
.org .prog-cov-k { font-size: 12px; color: var(--text-muted); text-transform: uppercase; letter-spacing: .05em; }

/* weak-area cards — ranked doorways */
.org .prog-cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 12px; }
.org .prog-card { display: flex; align-items: center; gap: 14px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); padding: 16px 18px; text-decoration: none; box-shadow: var(--shadow-sm); transition: box-shadow .15s ease, transform .15s ease, border-color .15s ease; }
.org .prog-card:hover { box-shadow: var(--shadow); transform: translateY(-2px); border-color: var(--brand-light); }
.org .prog-card-dot { flex-shrink: 0; width: 12px; height: 12px; border-radius: 4px; box-shadow: inset 0 0 0 1px rgba(44,33,20,.12); }
.org .prog-card-body { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.org .prog-card-title { font-family: var(--font-display); font-size: 17px; font-weight: 600; color: var(--text); letter-spacing: -.2px; line-height: 1.2; }
.org .prog-card-meta { font-size: 12px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.org .prog-card-cta { flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--brand); white-space: nowrap; }

/* inverted coverage pills — tappable "start here" */
.org a.pill.prog-pill-link { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: var(--text); transition: border-color .12s ease, background .12s ease; }
.org a.pill.prog-pill-link:hover { border-color: var(--brand-light); background: var(--surface); }
.org .prog-pill-cta { color: var(--brand); font-weight: 600; }
`;
