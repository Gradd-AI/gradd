import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts, type PostMeta } from '@/lib/blog';
import {
  resolveSubject,
  subjectMatchesFilter,
  subjectBadge,
  archiveMetaFor,
  intentGroupsFor,
  usesIntentGroups,
} from '@/lib/blog-subject';
import BlogHeader from '@/components/blog/BlogHeader';

// searchParams is a request-time Promise in this Next version (see node_modules/next
// /dist/docs/.../page.md) — must be awaited in both the page and generateMetadata.
// Reading searchParams also opts this route into dynamic rendering, so the post list
// (and any publish_date gating in getAllPosts) is re-evaluated on every request.
type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

// ?subject=apm|afm|acca|ib scopes the shared index without a new route or fork. Any other
// value (or none) falls through to the full archive at /blog — the harmless catch-all, and
// the canonical document for every post.
//
// THE FILTER, THE MEMBERSHIP RULE AND EVERY VIEW'S IDENTITY LIVE IN lib/blog-subject.ts.
// They used to live here as a local `resolveSubject` returning 'apm' | 'ib' | null, whose
// null this page then collapsed to 'ib' when handing the header its subject — so the mixed
// archive, 9 of whose 14 live posts are ACCA, rendered as the IB view under an "IB exam
// clarity" title. Being pure and shared is what lets `npm run test:blog-subject` pin that.

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const { title, description } = archiveMetaFor(resolveSubject((await searchParams).subject));

  // Canonical stays the unfiltered archive: the ?subject views are convenience filters,
  // not separate documents, so they self-canonicalize to /blog. That is what makes the
  // NEUTRAL title load-bearing rather than cosmetic — /blog is the document search engines
  // index for the whole blog, so whatever it claims to be about is what the blog is filed as.
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

function PostCard({ post }: { post: PostMeta }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: 'none', display: 'block' }}>
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
            {subjectBadge(post.subject)}
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
  );
}

const listStyle: React.CSSProperties = {
  listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 20,
};
const groupHeadingStyle: React.CSSProperties = {
  fontFamily: "var(--font-display, 'Playfair Display', Georgia, serif)",
  fontStyle: 'italic',
  fontWeight: 400,
  fontSize: 15,
  textTransform: 'none',
  letterSpacing: '0.02em',
  color: 'var(--accent, #c8972e)',
  margin: '0 0 14px',
};

export default async function BlogIndexPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const subject = resolveSubject((await searchParams).subject);
  const all = getAllPosts();
  // Positive membership, one rule, one table (lib/blog-subject.ts). The ib arm used to be
  // `p.subject !== 'APM'` — negative space that would have served an AFM post to IB readers.
  const posts = all.filter(p => subjectMatchesFilter(p.subject, subject));

  // ACCA views: group by intent under headings. IB and the neutral archive: flat, date-ordered.
  let grouped: { label: string; posts: PostMeta[] }[] | null = null;
  if (usesIntentGroups(subject)) {
    const used = new Set<string>();
    grouped = intentGroupsFor(subject).map(g => {
      const groupPosts = posts.filter(p => p.intent && g.intents.includes(p.intent));
      groupPosts.forEach(p => used.add(p.slug));
      return { label: g.label, posts: groupPosts };
    });
    const leftover = posts.filter(p => !used.has(p.slug));
    if (leftover.length) grouped.push({ label: 'More', posts: leftover });
    grouped = grouped.filter(s => s.posts.length > 0);
  }

  return (
    <>
    <BlogHeader filter={subject} />
    <main style={{ maxWidth: 720, margin: '0 auto', padding: '40px 24px 80px' }}>
        {posts.length === 0 && (
          <p style={{ color: 'var(--text)', opacity: 0.6 }}>No posts yet.</p>
        )}

        {grouped ? (
          grouped.map(section => (
            <section key={section.label} style={{ marginBottom: 40 }}>
              <h2 style={groupHeadingStyle}>{section.label}</h2>
              <ul style={listStyle}>
                {section.posts.map(post => (
                  <li key={post.slug}><PostCard post={post} /></li>
                ))}
              </ul>
            </section>
          ))
        ) : (
          <ul style={listStyle}>
            {posts.map(post => (
              <li key={post.slug}><PostCard post={post} /></li>
            ))}
          </ul>
        )}
    </main>
    </>
  );
}
