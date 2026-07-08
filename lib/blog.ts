import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const POSTS_DIR = path.join(process.cwd(), 'content', 'blog');

// Frontmatter schema for every .md file in content/blog/
// Required: title, slug, subject, description, date (dd/mm/yyyy), published
// Optional: intent   — content class, drives APM archive grouping + related preference
//           keywords — search-phrase variants rendered as <meta name="keywords">
//           related  — slugs of related published posts (hand-curated override; the
//                      article page auto-fills up to 3 via getRelatedPosts)
export interface PostMeta {
  title: string;
  slug: string;
  subject: 'Econ' | 'BM' | 'APM'; // IB Economics / IB Business Management / ACCA APM
  description: string;
  date: string;          // dd/mm/yyyy
  published: boolean;
  intent?: 'failure' | 'technique' | 'syllabus' | 'exam-structure';
  keywords?: string[];
  related?: string[];
}

export interface Post extends PostMeta {
  html: string;
}

function parseDate(d: string): Date {
  const [day, month, year] = d.split('/').map(Number);
  return new Date(year, month - 1, day);
}

/** Convert dd/mm/yyyy frontmatter date to ISO 8601 (YYYY-MM-DD) for JSON-LD and OG tags. */
export function dateToISO(d: string): string {
  const [day, month, year] = d.split('/');
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

export function getAllPosts(): PostMeta[] {
  if (!fs.existsSync(POSTS_DIR)) return [];
  return fs
    .readdirSync(POSTS_DIR)
    .filter(f => f.endsWith('.md'))
    .map(file => {
      const raw = fs.readFileSync(path.join(POSTS_DIR, file), 'utf-8');
      return matter(raw).data as PostMeta;
    })
    .filter(p => p.published)
    .sort((a, b) => parseDate(b.date).getTime() - parseDate(a.date).getTime());
}

export function getPostBySlug(slug: string): Post | null {
  const file = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf-8');
  const { data, content } = matter(raw);
  if (!data.published) return null;
  const html = marked.parse(content) as string;
  return { ...(data as PostMeta), html };
}

/** Fetch only frontmatter for a single slug — used for related-post link lists. */
export function getPostMeta(slug: string): PostMeta | null {
  const file = path.join(POSTS_DIR, `${slug}.md`);
  if (!fs.existsSync(file)) return null;
  const raw = fs.readFileSync(file, 'utf-8');
  const { data } = matter(raw);
  if (!data.published) return null;
  return data as PostMeta;
}

/**
 * Up to `limit` related posts for a slug. Hand-curated `related[]` comes first (in
 * order; only valid, published, same-subject slugs), then auto-fills from other
 * same-subject posts — preferring the same intent, then most-recent — so a post is
 * never left with an empty block when its subject has enough siblings. Never returns
 * the post itself. Same-subject is enforced throughout: an APM post never surfaces IB.
 */
export function getRelatedPosts(slug: string, limit = 3): PostMeta[] {
  const self = getPostMeta(slug);
  if (!self) return [];

  const all = getAllPosts(); // published, most-recent first
  const bySlug = new Map(all.map(p => [p.slug, p]));

  const out: PostMeta[] = [];
  const seen = new Set<string>([slug]);
  const push = (p: PostMeta | undefined) => {
    if (p && !seen.has(p.slug)) { seen.add(p.slug); out.push(p); }
  };

  // 1) hand-curated overrides, in author order — same subject only
  for (const s of self.related ?? []) {
    if (out.length >= limit) break;
    const p = bySlug.get(s);
    if (p && p.subject === self.subject) push(p);
  }

  // 2) auto-fill from same-subject pool: same intent first, then most-recent
  if (out.length < limit) {
    const pool = all.filter(p => p.subject === self.subject && !seen.has(p.slug));
    const sameIntent = pool.filter(p => self.intent && p.intent === self.intent);
    const rest = pool.filter(p => !(self.intent && p.intent === self.intent));
    for (const p of [...sameIntent, ...rest]) {
      if (out.length >= limit) break;
      push(p);
    }
  }

  return out.slice(0, limit);
}
