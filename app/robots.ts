// app/robots.ts
import type { MetadataRoute } from 'next';
import { headers } from 'next/headers';

// Host-aware (same pattern as app/sitemap.ts): each host's robots.txt advertises
// ONLY its own sitemap — a Sitemap: directive pointing at a different domain is
// ignored by crawlers and reads as a cross-site reference.
export default async function robots(): Promise<MetadataRoute.Robots> {
  const host = (await headers()).get('host') ?? '';
  const isAI = host.includes('gradd.ai');
  const base = isAI ? 'https://gradd.ai' : 'https://gradd.ie';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        // App-behind-login + internal routes: no SEO value, keep crawlers out.
        disallow: [
          '/dashboard', '/session', '/api/', '/manage', '/admin',
          '/acca/tutor', '/acca/mock', '/acca/cases', '/onboarding',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
