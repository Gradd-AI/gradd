'use client';

// Fires Meta CompleteRegistration exactly once for a NEW APM signup. The auth
// callback appends ?signup=1 only for a just-created account (see
// app/auth/callback/route.ts); this reads it, fires once, and strips the param.
//
// Consent-gated (no marketing consent ⇒ no event) and guarded by sessionStorage
// so a refresh, back-navigation, or later login can never refire it. The param
// is always stripped so it can't linger, be shared, or re-trigger.

import { useEffect } from 'react';
import { pixelHostAllowed, readConsent } from '@/lib/meta-consent';

const GUARD_KEY = 'gradd_cr_fired';

export default function MetaTrackSignup() {
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('signup') !== '1') return;

    const strip = () => {
      const url = new URL(window.location.href);
      url.searchParams.delete('signup');
      window.history.replaceState({}, '', url.pathname + url.search + url.hash);
    };

    // Nothing to fire if the pixel can't run here or consent isn't granted.
    if (!pixelHostAllowed() || readConsent() !== 'granted') { strip(); return; }
    let done = false;
    try { done = !!sessionStorage.getItem(GUARD_KEY); } catch { /* ignore */ }
    if (done) { strip(); return; }

    // The base pixel (in the layout) may still be booting — its effect runs after
    // this child effect. Poll briefly for the fbq shim, then fire once.
    let tries = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const attempt = () => {
      if (typeof window.fbq === 'function') {
        window.fbq('track', 'CompleteRegistration');
        try { sessionStorage.setItem(GUARD_KEY, '1'); } catch { /* ignore */ }
        strip();
        return;
      }
      if (tries++ < 20) { timer = setTimeout(attempt, 150); return; } // wait up to ~3s
      strip(); // gave up (e.g. blocked) — clear the param regardless
    };
    attempt();
    return () => { if (timer) clearTimeout(timer); };
  }, []);

  return null;
}
