import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog';

// searchParams is a request-time Promise in this Next version (see node_modules/next
// /dist/docs/.../page.md) — must be awaited in both the page and generateMetadata.
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// ?subject=apm|ib scopes the shared index without a new route or fork. Any other value
// (or none) falls through to the full archive at /blog — the canonical, harmless catch-all.
type SubjectFilter = 'apm' | 'ib' | null;

function resolveSubject(raw: string | string[] | undefined): SubjectFilter {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'apm') return 'apm';
  if (v === 'ib') return 'ib';
  return null;
}

const APM_TITLE = 'ACCA APM — exam technique, marking and the syllabus, explained';
const APM_DESC =
  'How ACCA APM is marked, the professional-skills marks, describe vs apply, and the S26–J27 syllabus — exam technique explained for APM candidates.';
const IB_TITLE = 'Gradd Blog — IB exam clarity';
const IB_DESC = 'Common IB Economics and Business Management misconceptions, explained.';

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const subject = resolveSubject((await searchParams).subject);
  const title = subject === 'apm' ? APM_TITLE : IB_TITLE;
  const description = subject === 'apm' ? APM_DESC : IB_DESC;

  // Canonical stays the unfiltered archive: the ?subject views are convenience filters,
  // not separate documents, so they self-canonicalize to /blog.
  return {
    title,
    description,
    alternates: { canonical: 'https://gradd.ai/blog' },
    openGraph: {
      title,
      description,
      url: 'https://gradd.ai/blog',
      siteName: 'Gradd',
      type: 'website',
    },
  };
}

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const subject = resolveSubject((await searchParams).subject);
  const all = getAllPosts();
  const posts =
    subject === 'apm'
      ? all.filter(p => p.subject === 'APM')
      : subject === 'ib'
        ? all.filter(p => p.subject !== 'APM')
        : all;

  return (
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        {posts.length === 0 && (
          <p style={{ color: 'var(--text)', opacity: 0.6 }}>No posts yet.</p>
        )}
        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {posts.map(post => (
            <li key={post.slug}>
              <Link
                href={`/blog/${post.slug}`}
                style={{ textDecoration: 'none', display: 'block' }}
              >
                <article style={{
                  background: 'var(--surface, #fff)',
                  border: '1px solid var(--border, #ddd5c5)',
                  borderRadius: 12,
                  padding: '24px 28px',
                  transition: 'box-shadow 0.15s',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.08em',
                      color: 'var(--accent, #c8972e)',
                      background: 'rgba(200,151,46,0.12)',
                      padding: '3px 8px',
                      borderRadius: 4,
                    }}>
                      {post.subject === 'APM' ? 'ACCA APM' : `IB ${post.subject}`}
                    </span>
                    <span aria-hidden="true" style={{ fontSize: 13, color: 'var(--text)', opacity: 0.3 }}>·</span>
                    <time style={{ fontSize: 13, color: 'var(--text)', opacity: 0.45 }}>
                      {post.date}
                    </time>
                  </div>
                  <h2 style={{
                    fontFamily: "var(--font-display, 'Playfair Display', Georgia, serif)",
                    fontStyle: 'italic',
                    fontWeight: 400,
                    fontSize: 22,
                    color: 'var(--brand, #0e2b1e)',
                    margin: '0 0 8px',
                    letterSpacing: '-0.02em',
                  }}>
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 15, color: 'var(--text)', opacity: 0.7, margin: 0, lineHeight: 1.55 }}>
                    {post.description}
                  </p>
                </article>
              </Link>
            </li>
          ))}
        </ul>
    </main>
  );
}
