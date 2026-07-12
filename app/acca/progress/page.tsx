import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createServerClient } from '@/lib/supabase/server';
import { getMyProgress, type RecentAttempt, type AreaTrend } from '@/lib/org/queries';
import { hasActiveACCAAccess } from '@/lib/acca/access';
import { resolvePaper } from '@/lib/acca/paper';
import { ORG_CSS, subAreaName, fmtDays, fmtDate, cellTone } from '@/components/org/orgTheme';

const pct = (x: number) => `${Math.round(x * 100)}%`;

/** Quiet house-styled lock row — one line of muted text, NOT a button. The single
 *  upgrade button lives once at the foot of the page (see the free-tier upsell). */
function LockLine({ children }: { children: ReactNode }) {
  return (
    <p className="prog-lock">
      <span className="prog-lock-i" aria-hidden="true">🔒</span>
      {children}
    </p>
  );
}

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
  title: 'Your progress — ACCA | Gradd',
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

export default async function ProgressPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // ── Auth guard (per-page, not middleware) ──────────────────────────────────
  const authClient = await createServerClient();
  const { data: { user } } = await authClient.auth.getUser();
  if (!user) {
    redirect('/acca/auth?next=/acca/progress');
  }

  // Which paper's progress this is. Default APM (unchanged for the existing entry);
  // the AFM entry (G2) links here with ?paper=AFM. Labels + row-scoping key off it.
  const { paper: paperParam } = await searchParams;
  const paper = resolvePaper(typeof paperParam === 'string' ? paperParam : undefined);
  const areaName = (sa: string) => subAreaName(paper, sa);

  // ── Tier check (server-side) ────────────────────────────────────────────────
  // The page stays reachable by every logged-in student — the TIER decides what
  // renders. Same gate cases/mock use (hasActiveACCAAccess). Own profile row read
  // via the session client (RLS: student reads own row).
  const { data: profile } = await authClient
    .from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at')
    .eq('id', user.id)
    .single();
  const paid = hasActiveACCAAccess(profile ?? {}); // bundle-wide ACCA access (all papers)

  const now = Date.now();
  const p = await getMyProgress(user.id, now, paper);
  const hasAssessment = p.marks.length > 0 || p.mocks.length > 0;

  return (
    <div className="org">
      <style>{ORG_CSS}</style>
      <style>{PROG_CSS}</style>

      <header className="org-header">
        <Link className="wordmark" href="/acca"><img src="/gradd-ai-logo.png" alt="Gradd" /></Link>
        <span className="org-crumb">
          <Link href={paper === 'APM' ? '/acca' : `/acca?paper=${paper}`}>ACCA {paper}</Link><span>›</span> Your progress
        </span>
      </header>

      <h1>Your progress</h1>
      <div className="prog-nudge">
        <span className="prog-nudge-text">{recencyNudge(p.daysSinceLastAttempt)}</span>
        {/* Streak is paid (it's trajectory). Only surfaced when one actually exists, so
            the free lock is honest — never a nag when there's nothing to withhold. */}
        {p.streakDays >= 2 && (paid
          ? <span className="prog-streak">🔥 {p.streakDays}-day streak</span>
          : <span className="prog-streak prog-streak--locked">🔒 {p.streakDays}-day streak</span>)}
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

      {/* Stuck drills — paid: resumable cards; free: header + count + locked body */}
      {p.stuckDrills.length > 0 && (
        <>
          <h2>Pick up where you got stuck</h2>
          {paid ? (
            <>
              <p className="sub" style={{ marginBottom: 16 }}>
                Questions you stalled on. Resume takes you back to the same question with your progress remembered — not a fresh start.
              </p>
              <div className="prog-cards">
                {p.stuckDrills.map((s) => (
                  <Link key={s.drillId} href={`/acca/tutor?drill_id=${encodeURIComponent(s.drillId)}`} className="prog-card">
                    <span className="prog-card-dot prog-card-dot--stuck" aria-hidden="true" />
                    <span className="prog-card-body">
                      <span className="prog-card-title">{s.topic}</span>
                      <span className="prog-card-meta">{areaName(s.loCode.slice(0, 2))} · missed {s.missCount}×</span>
                    </span>
                    <span className="prog-card-cta">Resume →</span>
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <>
              <p className="sub" style={{ marginBottom: 12 }}>
                {`${p.stuckDrills.length} ${p.stuckDrills.length === 1 ? 'drill' : 'drills'} you're stuck on.`}
              </p>
              <div className="org-panel prog-lock-panel">
                <LockLine>Upgrade to resume exactly where you left off.</LockLine>
              </div>
            </>
          )}
        </>
      )}

      {/* Weak areas — ranked, tappable, every card a doorway into a scoped drill */}
      {p.weakAreas.length > 0 && (
        <>
          <h2>Work on these next</h2>
          <p className="sub" style={{ marginBottom: 16 }}>Where you&apos;re missing most. Tap one and Ezra picks up a question from exactly that area.</p>
          <div className="prog-cards">
            {p.weakAreas.map((w) => {
              const tone = cellTone(w.missRate);
              return (
                <Link key={w.subArea} href={`/acca/tutor?area=${encodeURIComponent(w.subArea)}&paper=${paper}`} className="prog-card">
                  <span className="prog-card-dot" style={{ background: tone.bg }} aria-hidden="true" />
                  <span className="prog-card-body">
                    <span className="prog-card-title">{areaName(w.subArea)}</span>
                    <span className="prog-card-meta">
                      {w.misses} of {w.attempts} missed · {pct(w.missRate)}
                      {paid && <TrendGlyph trend={w.trend} />}
                    </span>
                  </span>
                  <span className="prog-card-cta">Drill this →</span>
                </Link>
              );
            })}
          </div>
          {!paid && <LockLine>Upgrade to see your trend per area — improving or slipping.</LockLine>}
        </>
      )}

      {/* Recent attempts — each row links back to its exact drill */}
      {p.recentAttempts.length > 0 && (
        <div className="org-panel" style={{ marginTop: 28 }}>
          <h2 style={{ margin: '0 0 10px' }}>Recent attempts</h2>
          <table className="org-list">
            <thead><tr><th>Date</th><th>Area</th><th>Outcome</th><th></th></tr></thead>
            <tbody>
              {p.recentAttempts.slice(0, 12).map((a, i) => (
                <tr key={i}>
                  <td className="date">{fmtDate(a.created_at)}</td>
                  <td>{areaName(a.lo_code.slice(0, 2))}</td>
                  <td><span className={`org-out ${a.outcome === 'miss' ? 'miss' : 'ok'}`}>{a.outcome}</span></td>
                  <td className="prog-retry-cell">
                    <Link href={`/acca/tutor?drill_id=${encodeURIComponent(a.drill_id)}`} className="prog-retry">
                      {a.outcome === 'miss' ? 'Try again →' : 'Revisit →'}
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mock & case marks — paid only; free sees a single locked line (only when present) */}
      {hasAssessment && (
        <div className="org-panel" style={{ marginTop: 28 }}>
          <h2 style={{ margin: '0 0 10px' }}>Mock &amp; case marks</h2>
          {paid ? (
            <>
              {p.mocks.length > 0 && (
                <table className="org-list" style={{ marginBottom: p.marks.length ? 16 : 0 }}>
                  <thead><tr><th>Mock</th><th>Started</th><th>Completed</th></tr></thead>
                  <tbody>{p.mocks.map((m, i) => (
                    <tr key={i}><td>{m.mock_id}</td><td className="date">{fmtDate(m.started_at)}</td><td>{m.completed ? 'yes' : 'no'}</td></tr>
                  ))}</tbody>
                </table>
              )}
              {p.marks.length > 0 && (
                <table className="org-list">
                  <thead><tr><th>Case (professional-skills)</th><th className="num">Awarded</th><th className="num">Available</th><th>Marked</th></tr></thead>
                  <tbody>{p.marks.map((m, i) => (
                    <tr key={i}><td>{m.case_id.slice(0, 8)}…</td><td className="num">{m.awarded}</td><td className="num">{m.available}</td><td className="date">{fmtDate(m.marked_at)}</td></tr>
                  ))}</tbody>
                </table>
              )}
            </>
          ) : (
            <LockLine>Upgrade to see your mock &amp; case professional-skills marks.</LockLine>
          )}
        </div>
      )}

      {/* Not-yet-attempted areas — the coordinator's coverage pills, inverted into a to-do */}
      {p.uncoveredSubAreas.length > 0 && (
        <div className="org-panel" style={{ marginTop: 28 }}>
          <h2 style={{ margin: '0 0 4px' }}>Not attempted yet</h2>
          <p className="org-note" style={{ marginTop: 0, marginBottom: 14 }}>
            {`${p.uncoveredSubAreas.length} ${p.uncoveredSubAreas.length === 1 ? 'area' : 'areas'} you haven't got a correct answer in yet — a good place to start.`}
          </p>
          <div className="org-kv">
            {p.uncoveredSubAreas.map((sa) => (
              <Link key={sa} href={`/acca/tutor?area=${encodeURIComponent(sa)}&paper=${paper}`} className="pill prog-pill-link">
                {areaName(sa)} <span className="prog-pill-cta">start here →</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Single upgrade CTA for the whole page — the per-slot lock lines above are text,
          not buttons; this is the one primary action. Free tier only. */}
      {!paid && (
        <div className="prog-upsell">
          <span className="prog-upsell-text">
            Trend per area, resume-where-you-left-off, streaks and your mock &amp; case marks are part of full progress.
          </span>
          <Link href="/acca/subscribe" className="prog-upsell-cta">Unlock your full progress →</Link>
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
.org .prog-streak--locked { color: var(--text-light); background: var(--surface-2); border-color: var(--border); font-weight: 600; }

/* locked slots — quiet one-line rows, never buttons */
.org .prog-lock { display: flex; align-items: center; gap: 8px; font-size: 13px; color: var(--text-light); margin: 10px 0 0; line-height: 1.4; }
.org .prog-lock-i { font-size: 12px; opacity: .8; }
.org .prog-lock-panel { padding: 16px 18px; display: flex; }
.org .prog-lock-panel .prog-lock { margin: 0; }

/* single page upgrade CTA (free tier) */
.org .prog-upsell { display: flex; align-items: center; justify-content: space-between; gap: 18px; flex-wrap: wrap; margin-top: 32px; padding: 20px 22px; background: var(--surface); border: 1px solid var(--border); border-left: 3px solid var(--brand-light); border-radius: var(--radius); box-shadow: var(--shadow-sm); }
.org .prog-upsell-text { font-size: 13px; color: var(--text-muted); line-height: 1.5; max-width: 62ch; }
.org a.prog-upsell-cta { flex-shrink: 0; display: inline-block; background: var(--brand); color: #fff; text-decoration: none; font-size: 14px; font-weight: 700; letter-spacing: .01em; padding: 11px 20px; border-radius: var(--radius-sm); white-space: nowrap; transition: background .15s ease, transform .15s ease; }
.org a.prog-upsell-cta:hover { transform: translateY(-1px); filter: brightness(1.06); }

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
.org .prog-card-dot--stuck { background: #ecd0c8; }
.org .prog-card-body { display: flex; flex-direction: column; gap: 3px; flex: 1; min-width: 0; }
.org .prog-card-title { font-family: var(--font-display); font-size: 17px; font-weight: 600; color: var(--text); letter-spacing: -.2px; line-height: 1.2; }
.org .prog-card-meta { font-size: 12px; color: var(--text-muted); font-variant-numeric: tabular-nums; }
.org .prog-card-cta { flex-shrink: 0; font-size: 13px; font-weight: 600; color: var(--brand); white-space: nowrap; }

/* recent-attempts retry link */
.org .prog-retry-cell { text-align: right; white-space: nowrap; }
.org a.prog-retry { color: var(--brand); text-decoration: none; font-weight: 600; font-size: 12px; }
.org a.prog-retry:hover { text-decoration: underline; }

/* inverted coverage pills — tappable "start here" */
.org a.pill.prog-pill-link { display: inline-flex; align-items: center; gap: 8px; text-decoration: none; color: var(--text); transition: border-color .12s ease, background .12s ease; }
.org a.pill.prog-pill-link:hover { border-color: var(--brand-light); background: var(--surface); }
.org .prog-pill-cta { color: var(--brand); font-weight: 600; }
`;
