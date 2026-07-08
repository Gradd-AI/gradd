import Link from 'next/link';

// Subject-aware blog header. The header can't live in the layout because the layout
// sees neither the index's ?subject searchParam nor a post's frontmatter subject, so
// each page derives the subject and renders this. APM views point home at the APM root,
// carry an "ACCA APM" wordmark that doubles as back-to-the-APM-archive, and point the
// CTA at the account-gated drills (mirrors BlogCTA); IB views are unchanged.
export default function BlogHeader({ subject }: { subject: 'apm' | 'ib' }) {
  const isAPM = subject === 'apm';
  const homeHref = isAPM ? '/' : '/ib';
  const ctaHref = isAPM ? '/acca/auth?next=/acca' : '/auth/signup/ib';

  return (
    <header className="blog-header">
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Link href={homeHref} aria-label="Gradd home">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/gradd-ai-logo.png" alt="Gradd" style={{ height: 22, width: 'auto', display: 'block' }} />
        </Link>
        {isAPM && (
          <Link
            href="/blog?subject=apm"
            aria-label="All ACCA APM articles"
            style={{
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
            }}
          >
            ACCA APM
          </Link>
        )}
      </div>
      <Link href={ctaHref} className="blog-header-cta">Start free →</Link>
    </header>
  );
}
