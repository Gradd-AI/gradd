// lib/site.ts — SERVER-SIDE ONLY
// Resolves the IB/LC product context for the current request.
//
// Do NOT import this file from Client Components — it uses next/headers.
// Client Components should import from lib/site-client.ts instead.
//
// PRODUCTION (VERCEL_ENV === 'production'): purely host-based.
// PREVIEW / DEVELOPMENT: __site cookie (set by proxy.ts from ?site=ib/lc)
// overrides the host check so IB pages can be reviewed on *.vercel.app URLs.

import { cookies } from 'next/headers';

const COOKIE_NAME = '__site';

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
