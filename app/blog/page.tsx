import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts } from '@/lib/blog';

export const metadata: Metadata = {
  title: 'Gradd Blog — IB exam clarity',
  description: 'Common IB Economics and Business Management misconceptions, explained.',
  alternates: { canonical: 'https://gradd.ai/blog' },
  openGraph: {
    title: 'Gradd Blog — IB exam clarity',
    description: 'Common IB Economics and Business Management misconceptions, explained.',
    url: 'https://gradd.ai/blog',
    siteName: 'Gradd',
    type: 'website',
  },
};

export default function BlogIndexPage() {
  const posts = getAllPosts();

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
