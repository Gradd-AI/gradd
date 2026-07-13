'use client';

// Captures FIRST-TOUCH marketing attribution (utm_* + fbclid) from the landing URL into a
// first-party cookie, so the auth callback can persist it to a new profile at signup and the
// resit route can stamp anonymous runs. First-touch: never overwrites an existing cookie, so
// the original source survives later internal navigation. No-op when there are no attribution
// params in the URL. Cookie is ~90 days, SameSite=Lax (sent on the same-origin magic-link
// redirect to /auth/callback). Purely client-side; no PII, no network.

import { useEffect } from 'react';

const COOKIE = 'gradd_attr';
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];

export default function AttributionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.split('; ').some((c) => c.startsWith(`${COOKIE}=`))) return; // first-touch wins
      const sp = new URLSearchParams(window.location.search);
      const attr: Record<string, string> = {};
      for (const k of KEYS) {
        const v = sp.get(k);
        if (v) attr[k] = v.slice(0, 200);
      }
      if (Object.keys(attr).length === 0) return; // nothing to attribute
      attr.landing_path = window.location.pathname.slice(0, 200);
      const value = encodeURIComponent(JSON.stringify(attr));
      const maxAge = 90 * 24 * 60 * 60;
      document.cookie = `${COOKIE}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
    } catch {
      // ignore — attribution is best-effort and must never affect the page.
    }
  }, []);
  return null;
}
