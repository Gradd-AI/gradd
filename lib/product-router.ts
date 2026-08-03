// lib/product-router.ts — WHICH PRODUCT IS THIS VISITOR HERE FOR?
//
// PURE. No I/O, no next/headers, no DB — every input is passed in, so the whole rule is
// fixturable (`npm run test:product-router`) and usable from a server component, a route
// handler or a test without change.
//
// ── WHY resolveIsIB CANNOT BE THIS FUNCTION ──────────────────────────────────
// `lib/site.ts`'s `resolveIsIB(host)` answers ONE question: is this request on gradd.ai?
// It returns TRUE for ACCA *and* IB, because both live on that host. It is a HOST check
// wearing a product name, `GRADD_BUILD_HARDENING.md:1917` flags exactly that hazard, and
// CLAUDE.md forbids branching product behaviour on it.
//
// A hub at `/` has to route between ACCA and IB — two products on ONE host — so
// `resolveIsIB` is definitionally incapable of it: it cannot distinguish the two things
// the hub exists to distinguish. This module is the real router, and it is deliberately
// NOT a boolean.
//
// ── THE PROPERTY THAT MAKES IT SAFE: IT CAN SAY "I DON'T KNOW" ───────────────
// `resolveProductIntent` returns `null` when nothing in the request evidences a product.
// That is the whole design. A boolean has no way to express uncertainty, so it defaults —
// and a default in a routing position is a silent wrong answer (an ACCA visitor served the
// IB signup form, which is a live defect this pass fixes). A null forces the caller to ASK
// the visitor rather than guess, which is precisely what the hub page is for.
//
// NEVER add a default here to make a call site simpler. The call site handling `null` by
// showing a choice IS the feature.

export type SiteProduct = 'LC' | 'ACCA' | 'IB';

/** Where the answer came from. Returned so a caller can log or degrade differently, and so
 *  a fixture asserts the PRECEDENCE rather than only the verdict. */
export type IntentSource =
  | 'host_single_product'   // gradd.ie serves exactly one product
  | 'explicit_param'        // ?product=acca|ib
  | 'next_path'             // ?next=/acca/... — where they were heading
  | 'referrer_path'         // arrived from /acca/... on this site
  | 'entitlement'           // signed in, holds exactly one product
  | 'unknown';              // nothing evidenced a product → ASK

export interface ProductIntentInput {
  /** Request host. gradd.ie is single-product; gradd.ai carries ACCA and IB. */
  host: string;
  /** `?product=` — the only fully explicit signal. */
  productParam?: string | null;
  /** `?next=` — a post-auth destination reveals what they were trying to reach. */
  nextParam?: string | null;
  /** Referer PATH only (never the full URL — an off-site referrer says nothing). */
  referrerPath?: string | null;
  /** Products this signed-in account actually holds. Ambiguous when it holds several. */
  heldProducts?: readonly SiteProduct[];
}

export interface ProductIntent {
  product: SiteProduct | null;
  source: IntentSource;
}

/** Path prefixes that unambiguously belong to one product. Ordered longest-first so a more
 *  specific prefix wins; `/acca` and `/ib` do not overlap, but future ones might. */
const PATH_PRODUCT: ReadonlyArray<readonly [string, SiteProduct]> = [
  ['/acca', 'ACCA'],
  ['/ib', 'IB'],
  // The IB app surfaces. They are NOT under /ib for historical reasons, and leaving them
  // out would make `?next=/dashboard` read as unknown for a signed-in IB student.
  ['/dashboard', 'IB'],
  ['/session', 'IB'],
  ['/onboarding', 'IB'],
];

function productFromPath(path: string | null | undefined): SiteProduct | null {
  if (typeof path !== 'string' || !path.startsWith('/')) return null;
  // Compare on a segment boundary so `/accalade` never matches `/acca`.
  for (const [prefix, product] of PATH_PRODUCT) {
    if (path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`)) {
      return product;
    }
  }
  return null;
}

function normaliseProductParam(raw: string | null | undefined): SiteProduct | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toUpperCase();
  if (v === 'ACCA' || v === 'APM' || v === 'AFM') return 'ACCA';   // paper implies the qualification
  if (v === 'IB') return 'IB';
  if (v === 'LC') return 'LC';
  return null;
}

/**
 * Resolve what this visitor is here for, or null if nothing says.
 *
 * PRECEDENCE, most-trusted first. Each step is a stronger claim about INTENT than the one
 * below it, and the order is asserted in the fixtures rather than left to reading order:
 *
 *   1. HOST, but only when the host serves exactly one product. gradd.ie is LC and nothing
 *      else, so the host IS the answer there — this is the one place a host check is a
 *      legitimate product check, and it is confined to this branch. gradd.ai is NOT such a
 *      host and deliberately falls through.
 *   2. ?product= — the visitor (or a campaign link) said so outright.
 *   3. ?next= — where they were heading before auth interrupted them. Stronger than the
 *      referrer: it is where they want to END UP, not where they happen to have been.
 *   4. Referrer path — they came from /acca/* or /ib/*, on this site.
 *   5. Entitlement — signed in and holding exactly ONE product. Holding several is
 *      ambiguous and returns unknown; that visitor should be asked, not guessed at.
 *   6. unknown → the caller ASKS.
 */
export function resolveProductIntent(input: ProductIntentInput): ProductIntent {
  const host = (input.host || '').toLowerCase();

  // 1. Single-product host. gradd.ie serves LC only.
  if (host.includes('gradd.ie')) {
    return { product: 'LC', source: 'host_single_product' };
  }

  // 2. Explicit.
  const explicit = normaliseProductParam(input.productParam);
  if (explicit) return { product: explicit, source: 'explicit_param' };

  // 3. Destination.
  const fromNext = productFromPath(input.nextParam);
  if (fromNext) return { product: fromNext, source: 'next_path' };

  // 4. Origin.
  const fromReferrer = productFromPath(input.referrerPath);
  if (fromReferrer) return { product: fromReferrer, source: 'referrer_path' };

  // 5. What they actually hold — but only when it is unambiguous.
  const held = input.heldProducts ?? [];
  if (held.length === 1) return { product: held[0], source: 'entitlement' };

  // 6. Nothing said. ASK.
  return { product: null, source: 'unknown' };
}

/** Where a resolved product's marketing surface lives. Kept beside the resolver so the hub,
 *  the auth pages and any future caller agree on one map. */
export const PRODUCT_HOME: Readonly<Record<SiteProduct, string>> = {
  LC: '/',
  ACCA: '/acca',
  IB: '/ib',
};

/** Where a resolved product's SIGN-UP flow lives. ACCA has its own wall; IB and LC share
 *  /auth/signup, which branches on the same resolver. */
export const PRODUCT_SIGNUP: Readonly<Record<SiteProduct, string>> = {
  LC: '/auth/signup',
  ACCA: '/acca/auth',
  IB: '/auth/signup',
};
