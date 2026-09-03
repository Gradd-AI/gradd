import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCoordinator } from '@/lib/org/guard';
import { getOrgOverview } from '@/lib/org/queries';
import { ORG_CSS, bandTone, fmtDays } from '@/components/org/orgTheme';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cohort readiness — Coordinator | Gradd' };

export default async function OrgPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireCoordinator(`/org/${slug}`, slug);
  const overview = await getOrgOverview(slug, Date.now());
  if (!overview) notFound();

  const { org, cohorts, utilisation } = overview;

  return (
    <div className="org">
      <style>{ORG_CSS}</style>
      <header className="org-header">
        <Link className="wordmark" href={`/org/${slug}`} aria-label="Coordinator home">
          <img src="/gradd-ai-logo.png" alt="Gradd.ai" style={{ height: 20, width: 'auto', display: 'block' }} />
        </Link>
        <span className="org-crumb"><span>·</span> Coordinator</span>
      </header>

      <h1>{org.name}</h1>
      <p className="sub">Cohort readiness overview</p>
      <div className="org-util">
        Org seats: <b>{utilisation.active} active</b> · <b>{utilisation.invited} invited</b>, never activated
      </div>

      <h2>Cohorts</h2>
      <div className="org-cards">
        {cohorts.map(({ cohort, memberCount, rag, lastActiveDays }) => {
          const total = Math.max(1, rag.green + rag.amber + rag.red);
          const pct = (n: number) => `${(n / total) * 100}%`;
          const segs = [
            { band: 'green' as const, n: rag.green },
            { band: 'amber' as const, n: rag.amber },
            { band: 'red' as const, n: rag.red },
          ];
          return (
            <Link key={cohort.id} href={`/org/${slug}/${cohort.id}`} className="org-card">
              <div className="label">{cohort.label}</div>
              <div className="meta">Target sitting {cohort.target_sitting ?? '—'} · {cohort.paper ?? ''}</div>

              <div className="org-statgrid">
                <div className="org-stat"><div className="n">{memberCount}</div><div className="k">Trainees</div></div>
                <div className="org-stat"><div className="n green">{rag.green}</div><div className="k">Green</div></div>
                <div className="org-stat"><div className="n red">{rag.red}</div><div className="k">Red</div></div>
              </div>

              <div className="org-ragbar">
                {segs.filter((s) => s.n > 0).map((s) => (
                  <span key={s.band} style={{ width: pct(s.n), background: bandTone(s.band).fg }} />
                ))}
              </div>
              <div className="org-ragrow">
                {segs.map((s) => (
                  <span key={s.band} className="seg"><i style={{ background: bandTone(s.band).fg }} /><b>{s.n}</b> {s.band}</span>
                ))}
                <span className="active">Last active {fmtDays(lastActiveDays)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
