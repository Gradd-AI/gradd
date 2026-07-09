import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireCoordinator } from '@/lib/org/guard';
import {
  getOrgBySlug, getCohortById, getOrgUtilisation,
  getCohortReadiness, getCohortHeatmap,
} from '@/lib/org/queries';
import { ORG_CSS, bandTone, cellTone, type Band } from '@/components/org/orgTheme';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Cohort heatmap — Coordinator | Gradd' };

const SEVERITY: Record<Band, number> = { red: 0, amber: 1, green: 2 };

export default async function CohortHeatmapPage({ params }: { params: Promise<{ slug: string; cohortId: string }> }) {
  const { slug, cohortId } = await params;
  await requireCoordinator(`/org/${slug}/${cohortId}`);

  const org = await getOrgBySlug(slug);
  if (!org) notFound();
  const cohort = await getCohortById(cohortId);
  if (!cohort || cohort.org_id !== org.id) notFound();

  const now = Date.now();
  const [rag, heat, util] = await Promise.all([
    getCohortReadiness(cohortId, now),
    getCohortHeatmap(cohortId),
    getOrgUtilisation(org.id),
  ]);

  // Join band onto heatmap rows; order worst-first (red → amber → green, then score asc).
  const bandOf = new Map(rag.map((t) => [t.userId, t.readiness]));
  const rows = heat.rows
    .map((r) => ({ ...r, readiness: bandOf.get(r.userId)! }))
    .filter((r) => r.readiness)
    .sort((a, b) => SEVERITY[a.readiness.band] - SEVERITY[b.readiness.band] || a.readiness.score - b.readiness.score);

  // Cohort roll-up: per sub-area average miss-rate across trainees with data there.
  const rollup: Record<string, number | null> = {};
  for (const sa of heat.subAreas) {
    const rates = heat.rows.map((r) => r.cells[sa]?.missRate).filter((v): v is number => v != null);
    rollup[sa] = rates.length ? rates.reduce((a, b) => a + b, 0) / rates.length : null;
  }

  return (
    <div className="org">
      <style>{ORG_CSS}</style>
      <header className="org-header">
        <a className="wordmark" href="/">Gradd</a>
        <span className="org-crumb"><Link href={`/org/${slug}`}>{org.name}</Link><span>›</span> {cohort.label}</span>
      </header>

      <h1>{cohort.label}</h1>
      <p className="sub">Miss-rate by syllabus sub-area · {rows.length} trainees · target sitting {cohort.target_sitting ?? '—'}</p>
      <div className="org-util">
        Org seats: <b>{util.active} active</b> · <b>{util.invited} invited</b>, never activated
        <span className="org-note" style={{ display: 'inline', marginLeft: 8 }}>(invited seats are not shown as heatmap rows)</span>
      </div>

      <div className="org-scroll" style={{ marginTop: 12 }}>
        <table className="org-heat">
          <thead>
            <tr>
              <th className="name">Trainee</th>
              {heat.subAreas.map((sa) => <th key={sa}>{sa}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const tone = bandTone(r.readiness.band);
              return (
                <tr key={r.userId}>
                  <td className="name">
                    <span className="org-chip" style={{ background: tone.bg, color: tone.fg, marginRight: 8 }}>{tone.label}</span>
                    <Link className="org-name-link" href={`/org/${slug}/${cohortId}/${r.userId}`}>{r.name}</Link>
                  </td>
                  {heat.subAreas.map((sa) => {
                    const cell = r.cells[sa];
                    const t = cellTone(cell ? cell.missRate : null);
                    return (
                      <td key={sa} className="cell" style={{ background: t.bg, color: t.fg }} title={cell ? `${cell.misses}/${cell.attempts} missed` : 'no attempts'}>
                        {cell ? cell.missRate.toFixed(1) : '·'}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            <tr className="rollup">
              <td className="name">Cohort avg</td>
              {heat.subAreas.map((sa) => {
                const v = rollup[sa];
                const t = cellTone(v);
                return <td key={sa} className="cell" style={{ background: t.bg, color: t.fg }}>{v == null ? '·' : v.toFixed(1)}</td>;
              })}
            </tr>
          </tbody>
        </table>
      </div>
      <p className="org-note">Cell = miss-rate (0.0 clean → 1.0 all-miss). Columns show only sub-areas with attempts. Click a trainee for the full readiness breakdown.</p>
    </div>
  );
}
