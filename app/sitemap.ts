// app/sitemap.ts
import type { MetadataRoute } from 'next';
import { getAllPosts, dateToISO } from '@/lib/blog';

const BASE_URL = 'https://gradd.ie';
const BLOG_BASE = 'https://gradd.ai';

export default function sitemap(): MetadataRoute.Sitemap {
  const posts = getAllPosts();
  const blogEntries: MetadataRoute.Sitemap = [
    { url: BLOG_BASE, lastModified: new Date(), changeFrequency: 'weekly', priority: 1.0 },
    { url: `${BLOG_BASE}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.9 },
    ...posts.map(post => ({
      url: `${BLOG_BASE}/blog/${post.slug}`,
      lastModified: new Date(dateToISO(post.date)),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];

  return [
    ...blogEntries,
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/subscribe`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/auth/login`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/auth/signup`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.5,
    },
    {
      url: `${BASE_URL}/terms`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/privacy`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${BASE_URL}/cookies`,
      lastModified: new Date(),
      changeFrequency: 'yearly',
      priority: 0.2,
    },
  ];
}
