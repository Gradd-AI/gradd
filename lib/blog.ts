import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const POSTS_DIR = path.join(process.cwd(), 'content', 'blog');

export interface PostMeta {
  title: string;
  slug: string;
  subject: string;
  description: string;
  date: string;       // dd/mm/yyyy
  published: boolean;
}

export interface Post extends PostMeta {
  html: string;
}

function parseDate(d: string): Date {
  const [day, month, year] = d.split('/').map(Number);
  return new Date(year, month - 1, day);
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
