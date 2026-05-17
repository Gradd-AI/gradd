// lib/site-client.ts — CLIENT-SIDE ONLY
// Use this in Client Components ('use client') instead of lib/site.ts.
// Does NOT import next/headers and is safe for browser bundles.
//
// Reads the __site cookie written by proxy.ts (?site=ib/lc param).
// Falls back to window.location.hostname when no cookie is set —
// which is always the case in production (proxy.ts never writes the
// cookie there), so production behaviour is unchanged.

const COOKIE_NAME = '__site';

export function resolveIsIBClient(): boolean {
  if (typeof document === 'undefined') return false;
  const match = document.cookie.match(/(?:^|;\s*)__site=([^;]*)/);
  if (match?.[1] === 'ib') return true;
  if (match?.[1] === 'lc') return false;
  return typeof window !== 'undefined' && window.location.hostname.includes('gradd.ai');
}
