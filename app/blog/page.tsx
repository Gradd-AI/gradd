import Link from 'next/link';
import type { Metadata } from 'next';
import { getAllPosts, type PostMeta } from '@/lib/blog';
import BlogHeader from '@/components/blog/BlogHeader';

// searchParams is a request-time Promise in this Next version (see node_modules/next
// /dist/docs/.../page.md) — must be awaited in both the page and generateMetadata.
// Reading searchParams also opts this route into dynamic rendering, so the post list
// (and any publish_date gating in getAllPosts) is re-evaluated on every request.
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

// APM archive is grouped by intent under scannable headings. syllabus + exam-structure
// share one bucket; untagged posts fall to a "More" catch-all so nothing is dropped.
const APM_GROUPS: { label: string; intents: NonNullable<PostMeta['intent']>[] }[] = [
  { label: 'Failed APM?',          intents: ['failure'] },
  { label: 'Exam technique',       intents: ['technique'] },
  { label: 'Syllabus & structure', intents: ['syllabus', 'exam-structure'] },
];

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
  const posts =
    subject === 'apm'
      ? all.filter(p => p.subject === 'APM')
      : subject === 'ib'
        ? all.filter(p => p.subject !== 'APM')
        : all;

  // APM view: group by intent under headings. Everything else: flat, date-ordered.
  let grouped: { label: string; posts: PostMeta[] }[] | null = null;
  if (subject === 'apm') {
    const used = new Set<string>();
    grouped = APM_GROUPS.map(g => {
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
    <BlogHeader subject={subject === 'apm' ? 'apm' : 'ib'} />
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
