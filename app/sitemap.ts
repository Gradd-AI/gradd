// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';
import { getAllPosts, dateToISO } from '@/lib/blog';

const AI_BASE = 'https://gradd.ai';
const IE_BASE = 'https://gradd.ie';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host = (await headers()).get('host') ?? '';
  const isAI = host.includes('gradd.ai');

  if (isAI) {
    const posts = getAllPosts();
    return [
      { url: AI_BASE,            lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
      { url: `${AI_BASE}/blog`,  lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
      ...posts.map(post => ({
        url: `${AI_BASE}/blog/${post.slug}`,
        lastModified: new Date(dateToISO(post.date)),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
    ];
  }

  // gradd.ie — LC routes only
  return [
    { url: IE_BASE,                    lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${IE_BASE}/subscribe`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${IE_BASE}/auth/login`,    lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${IE_BASE}/auth/signup`,   lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.5 },
    { url: `${IE_BASE}/terms`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${IE_BASE}/privacy`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${IE_BASE}/cookies`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  ];
}
