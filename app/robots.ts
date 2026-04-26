// app/robots.ts
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/dashboard', '/session', '/api/', '/manage'],
      },
    ],
    sitemap: 'https://gradd.ie/sitemap.xml',
  };
}
