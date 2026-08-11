import Link from 'next/link';
import { blogIdentity, type SubjectFilter } from '@/lib/blog-subject';

// Subject-aware blog header. The header can't live in the layout because the layout sees
// neither the index's ?subject searchParam nor a post's frontmatter subject, so each page
// derives the view and renders this.
//
// ── IT TAKES THE FILTER, INCLUDING null, AND THAT IS THE FIX ────────────────────────────
// It used to take a BINARY `'apm' | 'ib'`, so both callers had to answer a three-way
// question with two words and both wrote `subject === 'apm' ? 'apm' : 'ib'`. The unfiltered
// archive — 9 of whose 14 live posts are ACCA — therefore rendered as the IB view and sent
// its logo to /ib. Taking `SubjectFilter` means the neutral case is REPRESENTABLE, and
// `blogIdentity` (lib/blog-subject.ts, fixtured) decides what each view claims to be.
//
// Nothing here decides anything. Every href, label and the presence of the wordmark and CTA
// come from `blogIdentity`, so the whole header is covered by `npm run test:blog-subject`
// rather than by reading this file.
const chipStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.08em',
  color: 'var(--accent, #c8972e)',
  background: 'rgba(200,151,46,0.12)',
  padding: '4px 9px',
  borderRadius: 5,
  textDecoration: 'none',
  whiteSpace: 'nowrap',
};

export default function BlogHeader({ filter }: { filter: SubjectFilter }) {
  const { homeHref, wordmark, cta, doors } = blogIdentity(filter);

  return (
    <header className="blog-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={homeHref} aria-label="Gradd home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gradd-ai-logo.png" alt="Gradd" style={{ height: 22, width: 'auto', display: 'block' }} />
        </Link>
        {wordmark && (
          <Link href={wordmark.href} aria-label={`All ${wordmark.label} articles`} style={chipStyle}>
            {wordmark.label}
          </Link>
        )}
      </div>

      {/* The neutral archive offers both doors instead of a CTA: it spans two products, so a
          single "Start free" is a guess about a reader who has not declared one. */}
      {cta ? (
        <Link href={cta.href} className="blog-header-cta">{cta.label}</Link>
      ) : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {doors.map(d => (
            <Link key={d.href} href={d.href} aria-label={`${d.label} articles`} style={chipStyle}>
              {d.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
