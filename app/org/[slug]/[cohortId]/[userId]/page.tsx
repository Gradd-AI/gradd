import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCoordinator } from '@/lib/org/guard';
import { getOrgBySlug, getCohortById, getTraineeDetail, type RecentAttempt } from '@/lib/org/queries';
import { ORG_CSS, bandTone, fmtDays, fmtDate, SUB_AREA_NAME } from '@/components/org/orgTheme';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Trainee readiness — Coordinator | Gradd' };

const pct = (x: number) => `${Math.round(x * 100)}%`;

const DAY_MS = 86_400_000;

/** Tiny house-palette activity sparkline — daily attempt volume over the last 25 days,
 *  solved (sage) stacked under missed (rust). No chart library; pure SVG. Drawn from the
 *  most-recent attempts the detail query already returns (presentation only). */
function Sparkline({ attempts, now }: { attempts: RecentAttempt[]; now: number }) {
  const DAYS = 25, BAR = 5, GAP = 2, H = 34, TOP = 2;
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
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Attempt activity over the last 25 days">
      <line x1={0} y1={H - 0.5} x2={W} y2={H - 0.5} stroke="#ddd5c5" strokeWidth={1} />
      {buckets.map((b, i) => {
        const total = b.ok + b.miss;
        if (!total) return null;
        const x = (DAYS - 1 - i) * step; // oldest at left, today at right
        const okH = b.ok * unit, missH = b.miss * unit;
        return (
          <g key={i}>
            {b.ok > 0 && <rect x={x} y={H - okH} width={BAR} height={okH} rx={1} fill="#3d7a52" />}
            {b.miss > 0 && <rect x={x} y={H - okH - missH} width={BAR} height={missH} rx={1} fill="#c07a4e" />}
          </g>
        );
      })}
    </svg>
  );
}

export default async function TraineePage({ params }: { params: Promise<{ slug: string; cohortId: string; userId: string }> }) {
  const { slug, cohortId, userId } = await params;
  await requireCoordinator(`/org/${slug}/${cohortId}/${userId}`);

  const org = await getOrgBySlug(slug);
  if (!org) notFound();
  const cohort = await getCohortById(cohortId);
  if (!cohort || cohort.org_id !== org.id) notFound();

  const now = Date.now();
  const d = await getTraineeDetail(org.id, userId, now);
  if (!d) notFound();

  const { readiness: r } = d;
  const k = r.components;
  const tone = bandTone(r.band);
  const w = r.weightsUsed;

  return (
    <div className="org">
      <style>{ORG_CSS}</style>
      <header className="org-header">
        <Link className="wordmark" href={`/org/${slug}`}><img src="/gradd-logo.svg" alt="Gradd" /></Link>
        <span className="org-crumb">
          <Link href={`/org/${slug}`}>{org.name}</Link><span>›</span>
          <Link href={`/org/${slug}/${cohortId}`}>{cohort.label}</Link><span>›</span> {d.name}
        </span>
      </header>

      <Link className="org-back" href={`/org/${slug}/${cohortId}`}>‹ Back to heatmap</Link>

      <h1>{d.name}</h1>
      <p className="sub">
        {d.email ?? 'no email on membership'} · last active {fmtDays(d.daysSinceActive)}
      </p>

      {/* Readiness verdict — every number below traces to a row; no black box. */}
      <div className="org-panel">
        <div className="org-verdict">
          <div className="org-verdict-score">
            <span className="org-chip" style={{ background: tone.bg, color: tone.fg, fontSize: 12, padding: '5px 12px' }}>{tone.label}</span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 34, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px', lineHeight: 1 }}>{r.score.toFixed(2)}</span>
            {r.override && <span className="org-note" style={{ marginTop: 0 }}>override: <b>{r.override}</b> (forces Red regardless of score)</span>}
          </div>
          <div className="org-spark">
            <div className="org-spark-label">Activity · last 25 days</div>
            {d.recentAttempts.length
              ? <Sparkline attempts={d.recentAttempts} now={now} />
              : <span className="org-note" style={{ marginTop: 0 }}>No attempts in the window.</span>}
            {d.recentAttempts.length > 0 && (
              <div className="org-spark-legend">
                <span><i style={{ background: '#3d7a52' }} />solved</span>
                <span><i style={{ background: '#c07a4e' }} />missed</span>
              </div>
            )}
          </div>
        </div>

        <div className="org-comp">
          <div className="c">
            <div className="c-top"><span className="c-name">Recency</span><span className="c-w">weight {pct(w.recency)}</span></div>
            <div className="v">{k.recency.score.toFixed(2)}</div>
            <div className="d">{fmtDays(k.recency.daysSinceActive)}</div>
          </div>
          <div className="c">
            <div className="c-top"><span className="c-name">Coverage</span><span className="c-w">weight {pct(w.coverage)}</span></div>
            <div className="v">{k.coverage.score.toFixed(2)}</div>
            <div className="d">{k.coverage.covered}/{k.coverage.total} sub-areas</div>
          </div>
          <div className="c">
            <div className="c-top"><span className="c-name">Miss-rate</span><span className="c-w">weight {pct(w.missRate)}</span></div>
            <div className="v">{k.missRate.score.toFixed(2)}</div>
            <div className="d">{k.missRate.usedSlope ? `slope: prior ${k.missRate.priorMissRate.toFixed(2)} → recent ${k.missRate.recentMissRate.toFixed(2)}` : 'proxy: resolved/(resolved+stuck)'}</div>
          </div>
          <div className="c">
            <div className="c-top"><span className="c-name">Assessment</span><span className="c-w">weight {pct(w.assessment)}</span></div>
            <div className="v">{k.assessment.score == null ? '—' : k.assessment.score.toFixed(2)}</div>
            <div className="d">
              {k.assessment.score == null ? 'none yet' :
                [k.assessment.caseAvg != null ? `cases ${k.assessment.caseAvg.toFixed(2)}` : null,
                 k.assessment.mockAvg != null ? `mock ${k.assessment.mockAvg.toFixed(2)}` : null,
                 k.assessment.mocksCompleted ? `${k.assessment.mocksCompleted} mock sat` : null,
                ].filter(Boolean).join(' · ') || 'floor'}
            </div>
          </div>
        </div>
        <p className="org-note">
          Score = weighted mean of the four components{k.assessment.score == null ? ' (assessment absent → its weight redistributed across the other three)' : ''}.
          Stuck drills (miss_count ≥ 2, unresolved): <b>{d.stuckDrills}</b>.
        </p>
      </div>

      {/* Covered sub-areas */}
      <div className="org-panel">
        <h2 style={{ margin: '0 0 10px' }}>Coverage — {d.coveredSubAreas.length}/{d.totalSubAreas} sub-areas with a correct attempt</h2>
        {d.coveredSubAreas.length ? (
          <div className="org-kv">{d.coveredSubAreas.map((s) => <span key={s} className="pill">{s}</span>)}</div>
        ) : <p className="org-note" style={{ marginTop: 0 }}>No sub-areas covered yet.</p>}
      </div>

      {/* Recent attempts */}
      <div className="org-panel">
        <h2 style={{ margin: '0 0 10px' }}>Recent attempts ({d.recentAttempts.length} most recent)</h2>
        {d.recentAttempts.length ? (
          <table className="org-list">
            <thead><tr><th>Date</th><th>LO</th><th>Sub-area</th><th>Outcome</th></tr></thead>
            <tbody>
              {d.recentAttempts.map((a, i) => (
                <tr key={i}>
                  <td className="date">{fmtDate(a.created_at)}</td>
                  <td>{a.lo_code}</td>
                  <td>{SUB_AREA_NAME[a.lo_code.slice(0, 2)] ?? a.lo_code.slice(0, 2)}</td>
                  <td><span className={`org-out ${a.outcome === 'miss' ? 'miss' : 'ok'}`}>{a.outcome}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <p className="org-note" style={{ marginTop: 0 }}>No attempts recorded.</p>}
      </div>

      {/* Marks + mocks where present */}
      {(d.marks.length > 0 || d.mocks.length > 0) && (
        <div className="org-panel">
          <h2 style={{ margin: '0 0 10px' }}>Assessment records</h2>
          {d.mocks.length > 0 && (
            <table className="org-list" style={{ marginBottom: d.marks.length ? 16 : 0 }}>
              <thead><tr><th>Mock</th><th>Started</th><th>Completed</th></tr></thead>
              <tbody>{d.mocks.map((m, i) => (
                <tr key={i}><td>{m.mock_id}</td><td>{fmtDate(m.started_at)}</td><td>{m.completed ? 'yes' : 'no'}</td></tr>
              ))}</tbody>
            </table>
          )}
          {d.marks.length > 0 && (
            <table className="org-list">
              <thead><tr><th>Case (professional-skills)</th><th className="num">Awarded</th><th className="num">Available</th><th>Marked</th></tr></thead>
              <tbody>{d.marks.map((m, i) => (
                <tr key={i}><td>{m.case_id.slice(0, 8)}…</td><td className="num">{m.awarded}</td><td className="num">{m.available}</td><td>{fmtDate(m.marked_at)}</td></tr>
              ))}</tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
