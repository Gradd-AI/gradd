// lib/meta-consent.ts — CLIENT-SIDE marketing-consent + host gate for the Meta Pixel.
//
// Do NOT import this from Server Components — it reads window/localStorage.
// The pixel is gradd.ai-only and consent-gated; every guard needed to enforce
// that lives here so the pixel, the banner and the CompleteRegistration tracker
// all agree.

declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    _fbq?: unknown;
  }
}

export type Consent = 'granted' | 'denied';

// Fired by clearConsent() so a live MetaPixel can re-show the banner immediately
// (same page, no reload) after the user changes their choice.
export const CONSENT_RESET_EVENT = 'gradd:consent-reset';

const STORAGE_KEY = 'gradd_marketing_consent';
// Re-ask after ~6 months so a stored choice can't silently outlive its consent.
const CONSENT_TTL_MS = 1000 * 60 * 60 * 24 * 182;

// Real gradd.ai only — deliberately NOT resolveIsIB, which a `__site=ib` preview
// cookie can force true on a *.vercel.app host. The pixel must load only on the
// production apex/subdomains, never on gradd.ie and never on previews.
export function pixelHostAllowed(): boolean {
  if (typeof window === 'undefined') return false;
  const h = window.location.hostname;
  return h === 'gradd.ai' || h.endsWith('.gradd.ai');
}

export function pixelId(): string | undefined {
  // NEXT_PUBLIC_ is inlined at build. Undefined ⇒ pixel never loads.
  return process.env.NEXT_PUBLIC_META_PIXEL_ID || undefined;
}

export function readConsent(): Consent | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const { value, ts } = JSON.parse(raw) as { value?: unknown; ts?: unknown };
    if (value !== 'granted' && value !== 'denied') return null;
    if (typeof ts !== 'number' || Date.now() - ts > CONSENT_TTL_MS) return null; // expired → re-ask
    return value;
  } catch {
    return null;
  }
}

export function writeConsent(value: Consent): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ value, ts: Date.now() }));
  } catch {
    /* storage unavailable — treated as no stored choice; the banner simply re-asks */
  }
}

// Expire the first-party _fbp cookie across the paths/domains Meta may have set
// it on. fr is set by facebook.com (third-party) and cannot be cleared by us.
function deleteFbp(): void {
  const host = window.location.hostname;
  const past = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const variants = [
    `_fbp=; expires=${past}; path=/`,
    `_fbp=; expires=${past}; path=/; domain=${host}`,
    `_fbp=; expires=${past}; path=/; domain=.${host.replace(/^www\./, '')}`,
  ];
  if (host === 'gradd.ai' || host.endsWith('.gradd.ai')) {
    variants.push(`_fbp=; expires=${past}; path=/; domain=.gradd.ai`);
  }
  for (const v of variants) {
    try { document.cookie = v; } catch { /* ignore */ }
  }
}

// Fire a Meta standard event through the pixel MetaPixel already loaded. Applies the
// SAME host + marketing-consent gate as every other pixel event, so no consent (or a
// non-gradd.ai host, or a pixel that hasn't booted yet) ⇒ no event. Best-effort and
// non-blocking: fbq queues the event and returns immediately, so this is safe to call
// from a success handler without delaying the response or any render. Never throws.
export function trackMetaEvent(event: string): void {
  if (typeof window === 'undefined') return;
  if (!pixelHostAllowed() || readConsent() !== 'granted') return;
  if (typeof window.fbq !== 'function') return;
  try {
    window.fbq('track', event);
  } catch {
    /* ignore — analytics must never break the app */
  }
}

// Reset the stored choice so the banner re-asks. If consent had been granted we
// also delete the first-party _fbp cookie. Dispatches CONSENT_RESET_EVENT so a
// mounted MetaPixel re-shows the banner on the same page immediately.
export function clearConsent(): void {
  if (typeof window === 'undefined') return;
  let prior: Consent | null = null;
  try { prior = readConsent(); } catch { /* ignore */ }
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  if (prior === 'granted') deleteFbp();
  try { window.dispatchEvent(new Event(CONSENT_RESET_EVENT)); } catch { /* ignore */ }
}
