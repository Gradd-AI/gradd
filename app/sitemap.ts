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
      { url: AI_BASE,                    lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 }, // APM flagship landing
      { url: `${AI_BASE}/acca/resit`,    lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 }, // free resit diagnostic (primary CTA)
      { url: `${AI_BASE}/acca/afm`,      lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.8 }, // AFM product landing (early access)
      { url: `${AI_BASE}/acca/afm/proof`,lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 }, // real proof-transcript deposit
      { url: `${AI_BASE}/ib`,            lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 }, // IB landing (moved off root)
      { url: `${AI_BASE}/blog`,          lastModified: new Date(), changeFrequency: 'weekly',  priority: 0.9 },
      { url: `${AI_BASE}/acca/subscribe`,lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 }, // public subscribe/pricing page
      { url: `${AI_BASE}/terms`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
      { url: `${AI_BASE}/privacy`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
      { url: `${AI_BASE}/cookies`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
      ...posts.map(post => ({
        url: `${AI_BASE}/blog/${post.slug}`,
        lastModified: new Date(dateToISO(post.date)),
        changeFrequency: 'monthly' as const,
        priority: 0.8,
      })),
    ];
  }

  // gradd.ie — LC routes only. Auth pages (/auth/login, /auth/signup) deliberately
  // excluded — no SEO value and thin/duplicative for crawlers.
  return [
    { url: IE_BASE,                    lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${IE_BASE}/subscribe`,     lastModified: new Date(), changeFrequency: 'monthly', priority: 0.9 },
    { url: `${IE_BASE}/terms`,         lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${IE_BASE}/privacy`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.3 },
    { url: `${IE_BASE}/cookies`,       lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  ];
}
