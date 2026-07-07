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
