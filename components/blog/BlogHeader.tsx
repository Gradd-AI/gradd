import Link from 'next/link';

// Subject-aware blog header. The header can't live in the layout because the layout
// sees neither the index's ?subject searchParam nor a post's frontmatter subject, so
// each page derives the subject and renders this. APM views point home at the APM root
// and the CTA at the account-gated drills (mirrors BlogCTA); IB views are unchanged.
export default function BlogHeader({ subject }: { subject: 'apm' | 'ib' }) {
  const isAPM = subject === 'apm';
  const homeHref = isAPM ? '/' : '/ib';
  const ctaHref = isAPM ? '/acca/auth?next=/acca' : '/auth/signup/ib';

  return (
    <header className="blog-header">
      <Link href={homeHref} aria-label="Gradd home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/gradd-ai-logo.png" alt="Gradd" style={{ height: 22, width: 'auto', display: 'block' }} />
      </Link>
      <Link href={ctaHref} className="blog-header-cta">Start free →</Link>
    </header>
  );
}
