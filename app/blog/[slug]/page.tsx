import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getPostBySlug, getRelatedPosts, dateToISO } from '@/lib/blog';
import BlogCTA from '@/components/blog/BlogCTA';
import BlogHeader from '@/components/blog/BlogHeader';
import Link from 'next/link';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};
  const url = `https://gradd.ai/blog/${slug}`;
  return {
    title: post.title,
    description: post.description,
    keywords: post.keywords,
    alternates: { canonical: url },
    openGraph: {
      title: post.title,
      description: post.description,
      type: 'article',
      url,
      siteName: 'Gradd',
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const canonicalUrl = `https://gradd.ai/blog/${slug}`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.description,
    datePublished: dateToISO(post.date),
    author: { '@type': 'Organization', name: 'Gradd' },
    publisher: { '@type': 'Organization', name: 'Gradd' },
    mainEntityOfPage: canonicalUrl,
  };

  // 3 related posts: hand-curated `related[]` first, auto-filled same-subject
  // (preferring same intent, then most-recent) so the block is never empty when the
  // subject has ≥3 posts.
  const relatedPosts = getRelatedPosts(slug, 3);

  // Back-to-index carries the subject so an APM reader lands on the APM-scoped
  // archive, not the default IB view. IB posts go to the bare /blog (unchanged).
  const indexHref = post.subject === 'APM' ? '/blog?subject=apm' : '/blog';

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BlogHeader subject={post.subject === 'APM' ? 'apm' : 'ib'} />
      <main>
        <article className="blog-prose">
          <Link
            href={indexHref}
            style={{
              display: 'inline-block',
              marginBottom: 24,
              fontSize: 13,
              color: 'var(--text)',
              opacity: 0.55,
              textDecoration: 'none',
            }}
          >
            ← All articles
          </Link>
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
                {post.subject === 'APM' ? 'ACCA APM' : `IB ${post.subject}`}
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

          {relatedPosts.length > 0 && (
            <div style={{ margin: '40px 0 32px', paddingTop: 28, borderTop: '1px solid var(--border, #ddd5c5)' }}>
              <p style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                color: 'var(--accent, #c8972e)',
                margin: '0 0 14px',
              }}>
                Related
              </p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
                {relatedPosts.map(rp => (
                  <li key={rp.slug}>
                    <Link
                      href={`/blog/${rp.slug}`}
                      style={{ textDecoration: 'none', display: 'block' }}
                    >
                      <article style={{
                        background: 'var(--surface, #fff)',
                        border: '1px solid var(--border, #ddd5c5)',
                        borderRadius: 10,
                        padding: '16px 20px',
                      }}>
                        <h3 style={{
                          fontFamily: "var(--font-display, 'Playfair Display', Georgia, serif)",
                          fontStyle: 'italic',
                          fontWeight: 400,
                          fontSize: 18,
                          color: 'var(--brand, #0e2b1e)',
                          margin: '0 0 6px',
                          letterSpacing: '-0.02em',
                          lineHeight: 1.3,
                        }}>
                          {rp.title}
                        </h3>
                        <p style={{ fontSize: 14, color: 'var(--text)', opacity: 0.7, margin: 0, lineHeight: 1.5 }}>
                          {rp.description}
                        </p>
                      </article>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <BlogCTA subject={post.subject} />
        </article>
      </main>
    </>
  );
}
