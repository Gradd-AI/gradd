// lib/site.ts
// Resolves the IB/LC product context for the current request.
//
// PRODUCTION (VERCEL_ENV === 'production'): purely host-based. Cookie check
// is skipped entirely — the override cannot be triggered.
//
// PREVIEW / DEVELOPMENT: a __site cookie (set by middleware from ?site=ib/lc)
// overrides the host check, so IB pages can be previewed on *.vercel.app URLs.
// The cookie is scoped to the current origin and cannot bleed to gradd.ai/gradd.ie.

import { cookies } from 'next/headers';

const COOKIE_NAME = '__site';

// Server-side — call from Server Components and Route Handlers.
export async function resolveIsIB(host: string): Promise<boolean> {
  if (process.env.VERCEL_ENV === 'production') {
    return host.includes('gradd.ai');
  }
  const cookieStore = await cookies();
  const override = cookieStore.get(COOKIE_NAME)?.value;
  if (override === 'ib') return true;
  if (override === 'lc') return false;
  return host.includes('gradd.ai');
}

// Client-side — call from Client Components.
// __site is NOT httpOnly so browser JS can read it.
// Falls back to hostname when no cookie is set (correct behaviour in production
// where the middleware never writes the cookie).
export function resolveIsIBClient(): boolean {
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(/(?:^|;\s*)__site=([^;]*)/);
  if (match?.[1] === 'ib') return true;
  if (match?.[1] === 'lc') return false;
  return typeof window !== 'undefined' && window.location.hostname.includes('gradd.ai');
}
