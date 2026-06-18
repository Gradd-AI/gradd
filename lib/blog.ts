import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const POSTS_DIR = path.join(process.cwd(), 'content', 'blog');

// Frontmatter schema for every .md file in content/blog/
// Required: title, slug, subject, description, date (dd/mm/yyyy), published
// Optional: keywords — search-phrase variants rendered as <meta name="keywords">
//           related  — slugs of related published posts (rendered as a linked list above the CTA)
export interface PostMeta {
  title: string;
  slug: string;
  subject: string;       // 'Econ' | 'BM'
  description: string;
  date: string;          // dd/mm/yyyy
  published: boolean;
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
