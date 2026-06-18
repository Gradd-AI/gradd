import { notFound } from 'next/navigation';
import { getPostBySlug } from '@/lib/blog';
import BlogCTA from '@/components/blog/BlogCTA';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  return { title: post.title, description: post.description };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  return (
    <div className="blog-shell">
      <header className="blog-header">
        <Link href="/blog" className="blog-header-wordmark">Gradd Blog</Link>
        <p className="blog-header-tagline">IB exam clarity — one misconception at a time</p>
      </header>

      <main>
        <article className="blog-prose">
          <div style={{ marginBottom: 28 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
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
                IB {post.subject}
              </span>
              <time style={{ fontSize: 13, color: 'var(--text)', opacity: 0.45 }}>
                {post.date}
              </time>
            </div>
            <h1 style={{
              fontFamily: "var(--font-display, 'Playfair Display', Georgia, serif)",
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 36,
              color: 'var(--brand, #0e2b1e)',
              margin: '0 0 12px',
              letterSpacing: '-0.03em',
              lineHeight: 1.2,
            }}>
              {post.title}
            </h1>
            <p style={{
              fontSize: 18,
              color: 'var(--text)',
              opacity: 0.65,
              margin: 0,
              lineHeight: 1.5,
            }}>
              {post.description}
            </p>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--border, #ddd5c5)', margin: '0 0 32px' }} />

          <div dangerouslySetInnerHTML={{ __html: post.html }} />

          <BlogCTA />
        </article>
      </main>
    </div>
  );
}
