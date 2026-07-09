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
  await requireCoordinator(`/org/${slug}`);
  const overview = await getOrgOverview(slug, Date.now());
  if (!overview) notFound();

  const { org, cohorts, utilisation } = overview;

  return (
    <div className="org">
      <style>{ORG_CSS}</style>
      <header className="org-header">
        <a className="wordmark" href="/">Gradd</a>
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
          return (
            <Link key={cohort.id} href={`/org/${slug}/${cohort.id}`} className="org-card">
              <div className="label">{cohort.label}</div>
              <div className="meta">Target sitting {cohort.target_sitting ?? '—'} · {cohort.paper ?? ''}</div>

              <div className="org-statgrid">
                <div className="org-stat"><div className="n">{memberCount}</div><div className="k">Trainees</div></div>
                <div className="org-stat"><div className="n">{rag.green}</div><div className="k">Green</div></div>
                <div className="org-stat"><div className="n">{rag.red}</div><div className="k">Red</div></div>
              </div>

              <div className="org-ragbar">
                <span style={{ width: pct(rag.green), background: bandTone('green').fg }} />
                <span style={{ width: pct(rag.amber), background: bandTone('amber').fg }} />
                <span style={{ width: pct(rag.red), background: bandTone('red').fg }} />
              </div>
              <div className="org-ragrow">
                <span><b>{rag.green}</b> green</span>
                <span><b>{rag.amber}</b> amber</span>
                <span><b>{rag.red}</b> red</span>
                <span style={{ marginLeft: 'auto' }}>Last active {fmtDays(lastActiveDays)}</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
