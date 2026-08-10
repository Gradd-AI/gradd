// lib/signout-destination.ts — WHERE DOES A STUDENT WHO JUST SIGNED OUT LAND?
//
// PURE. No I/O, no next/headers, no DB — the route hands in raw header and query values and
// gets a root-relative path back, so the whole rule is fixturable
// (`npm run test:signout-destination`) against the SAME input shape production builds.
//
// ── THE DEFECT THIS EXISTS TO CLOSE ─────────────────────────────────────────────────────
// `/api/auth/signout` redirected to a hardcoded `/auth/login`. That page is a
// `signInWithPassword` form and nothing else (app/auth/login/LoginForm.tsx), while ACCA
// accounts are created by `signInWithOtp` (app/acca/auth/page.tsx) and never set a password.
// So signing out of ACCA landed the student on a wall with no door — not a copy mismatch, a
// dead end. LC and IB accounts DO have passwords, so the same page was fine for them: the
// fix is per-product routing, not a second hardcoded path.
//
// ── WHY THIS IS A MODULE AND NOT THREE LINES IN THE ROUTE ───────────────────────────────
// The route is an I/O shell (read profile → signOut → redirect) and cannot be fixtured. Every
// decision worth locking is in here: which signals are trusted in what order, that `?next=`
// can never become a destination, and that the answer is always one of a closed set of
// root-relative paths. A break in any of those is silent — it typechecks and it redirects
// somewhere.

import {
  resolveProductIntent, PRODUCT_PUBLIC_HOME,
  type SiteProduct, type IntentSource,
} from './product-router';

export interface SignOutSignals {
  /** The request's host. Callers should prefer `x-forwarded-host` (Vercel sets it) and fall
   *  back to `host`. gradd.ie is single-product, so the host IS the answer there. */
  host: string;
  /** `?product=` on the sign-out POST itself. THE fix for the signal problem: the surface a
   *  student is signing out OF knows its own product, so it says so outright instead of
   *  leaving the route to infer it from a header. */
  productParam?: string | null;
  /** `?next=`, read as product EVIDENCE only — see `resolveSignOutDestination`. */
  nextParam?: string | null;
  /** The RAW `referer` header (full URL, or absent). Reduced to a same-host path here rather
   *  than by the caller, so a fixture feeds what the browser actually sends (P-G6) — a
   *  pre-reduced path would let the route's own reduction go untested, and that reduction is
   *  the part carrying the cross-site check. */
  refererHeader?: string | null;
  /** Products this account held, read BEFORE `signOut()`. Empty/absent after sign-out is the
   *  ordering mistake this parameter is most likely to suffer, and the fixtures name it. */
  heldProducts?: readonly SiteProduct[];
}

export interface SignOutDestination {
  /** Root-relative path. Always a value of `PRODUCT_PUBLIC_HOME` or the `/` fallback. */
  path: string;
  /** The product the signals evidenced, or null when nothing did. */
  product: SiteProduct | null;
  /** Which signal decided it — returned so the fixtures assert PRECEDENCE, not just verdicts. */
  source: IntentSource;
}

/** Where an unresolved sign-out goes: the host's OWN landing page. Correct on both hosts
 *  (gradd.ie `/` is LC, gradd.ai `/` is the ACCA pillar) without either being named, which is
 *  why the no-evidence case does not need a product guess to be safe. */
export const SIGNOUT_FALLBACK = '/';

/**
 * Reduce a raw `referer` header to a path, and ONLY when it is same-host.
 *
 * An off-site referrer says nothing about which product a visitor holds, and treating one as
 * evidence would let any third-party page steer the landing. Unparseable → no signal, never a
 * throw: this runs on a sign-out, which must not fail because a header was malformed.
 */
export function samePathFromReferer(
  refererHeader: string | null | undefined,
  host: string,
): string | null {
  if (typeof refererHeader !== 'string' || refererHeader === '') return null;
  try {
    const u = new URL(refererHeader);
    if (u.host.toLowerCase() !== (host || '').toLowerCase()) return null;
    return u.pathname;
  } catch {
    return null;
  }
}

/**
 * Resolve the post-sign-out landing path.
 *
 * Product intent comes from `resolveProductIntent` — the same precedence every other auth
 * surface uses (host-single-product → `?product=` → `?next=` → referrer → entitlement →
 * unknown), so sign-out cannot develop its own private answer to "which product is this".
 *
 * ── `?next=` IS EVIDENCE, NEVER A DESTINATION ───────────────────────────────────────────
 * `?next=/acca/tutor` tells us the visitor is an ACCA visitor. It does NOT tell us to send
 * them to `/acca/tutor` — they have just signed out, so there is nothing to resume, and a
 * route that redirects to a caller-supplied path is an open redirect whether or not today's
 * caller is trusted. The returned path is always drawn from `PRODUCT_PUBLIC_HOME` or the
 * `/` fallback, so no input string can become a destination. The fixtures lock this with a
 * hostile `?next=https://evil.example` case.
 */
export function resolveSignOutDestination(signals: SignOutSignals): SignOutDestination {
  const intent = resolveProductIntent({
    host: signals.host,
    productParam: signals.productParam,
    nextParam: signals.nextParam,
    referrerPath: samePathFromReferer(signals.refererHeader, signals.host),
    heldProducts: signals.heldProducts,
  });

  const path = intent.product ? PRODUCT_PUBLIC_HOME[intent.product] : SIGNOUT_FALLBACK;
  return { path, product: intent.product, source: intent.source };
}
