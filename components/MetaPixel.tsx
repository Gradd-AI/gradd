'use client';

// Meta Pixel — gradd.ai only, consent-gated. Renders nothing (and loads nothing)
// unless: the host is real gradd.ai, NEXT_PUBLIC_META_PIXEL_ID is set, and the
// visitor has granted marketing consent. Until a choice is made it shows the
// consent banner; the fbevents snippet is injected ONLY after Accept.
//
// PageView fires once on load (in the bootstrap) and again on each SPA route
// change. No choice / Decline ⇒ the snippet is never injected.

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import ConsentBanner from './ConsentBanner';
import { pixelHostAllowed, pixelId, readConsent, writeConsent, CONSENT_RESET_EVENT, type Consent } from '@/lib/meta-consent';

// Official Meta Pixel bootstrap — defines the fbq queue shim, loads fbevents.js,
// inits, and fires the base PageView. Runs at most once.
function bootstrap(id: string): void {
  if (window.fbq) return;
  const n: any = (window.fbq = function (...args: unknown[]) {
    n.callMethod ? n.callMethod.apply(n, args) : n.queue.push(args);
  });
  if (!window._fbq) window._fbq = n;
  n.push = n;
  n.loaded = true;
  n.version = '2.0';
  n.queue = [];
  const t = document.createElement('script');
  t.async = true;
  t.src = 'https://connect.facebook.net/en_US/fbevents.js';
  const s = document.getElementsByTagName('script')[0];
  s?.parentNode?.insertBefore(t, s);
  window.fbq('init', id);
  window.fbq('track', 'PageView');
}

export default function MetaPixel() {
  const [ready, setReady] = useState(false);
  const [consent, setConsent] = useState<Consent | null>(null);
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  const id = pixelId();
  const allowed = ready && pixelHostAllowed();

  // Read stored consent after mount only, so SSR and first client render both
  // produce null (no hydration mismatch).
  useEffect(() => {
    setConsent(readConsent());
    setReady(true);
  }, []);

  // "Change your cookie choice" (cookies page) clears the stored choice and fires
  // this — re-read consent (now null) to bring the banner back on the same page.
  useEffect(() => {
    const onReset = () => setConsent(readConsent());
    window.addEventListener(CONSENT_RESET_EVENT, onReset);
    return () => window.removeEventListener(CONSENT_RESET_EVENT, onReset);
  }, []);

  // Load the pixel once, only after consent is granted. Records the current path
  // as already-counted so the route-change effect below won't double-fire it.
  useEffect(() => {
    if (!ready || !allowed || !id || consent !== 'granted') return;
    bootstrap(id);
    lastTracked.current = pathname;
  }, [ready, allowed, id, consent]); // eslint-disable-line react-hooks/exhaustive-deps

  // SPA route-change PageViews (the base PageView is fired inside bootstrap()).
  useEffect(() => {
    if (!allowed || !id || consent !== 'granted') return;
    if (typeof window.fbq !== 'function') return;
    if (lastTracked.current === pathname) return;
    window.fbq('track', 'PageView');
    lastTracked.current = pathname;
  }, [pathname, consent, allowed, id]);

  if (!ready || !allowed || !id) return null;
  if (consent !== null) return null; // choice already made — banner dismissed, script handled by effect
  return (
    <ConsentBanner
      onAccept={() => { writeConsent('granted'); setConsent('granted'); }}
      onDecline={() => { writeConsent('denied'); setConsent('denied'); }}
    />
  );
}
