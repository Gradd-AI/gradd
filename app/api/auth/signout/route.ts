// app/api/auth/signout/route.ts — the one sign-out write path.
//
// ── WHAT THIS FIXES (2026-08-10) ────────────────────────────────────────────────────────
// It redirected to a hardcoded `/auth/login`, with a default 307 and an origin read from the
// `Origin` header falling back to a literal `https://gradd.ai`. Three defects in two lines:
//
//   1. `/auth/login` is a `signInWithPassword` form and nothing else. ACCA accounts are
//      created by magic link (`app/acca/auth/page.tsx`) and have no password, so signing out
//      of ACCA landed the student on a wall with no door. LC and IB accounts DO have
//      passwords — hence per-product routing, not a swap to a second hardcoded path.
//   2. 307 PRESERVES THE METHOD, so the browser re-POSTed the sign-out at a page route. A
//      completed POST redirecting elsewhere is the textbook 303 See Other case; the status is
//      passed explicitly below because `NextResponse.redirect`'s default is 307.
//   3. The `Origin` header is absent on some requests, and the fallback named ONE host — a
//      gradd.ie student could be bounced to gradd.ai. Fixed by not building an absolute URL
//      at all: the `Location` is root-relative, which browsers resolve against the request
//      itself, so there is no origin to guess and no cross-host answer available.
//
// ── THE DESTINATION DECISION LIVES IN `lib/signout-destination.ts` ──────────────────────
// Pure and fixtured (`npm run test:signout-destination`). This file is the I/O shell: read
// the signals, sign out, redirect. The rule is not here because a route handler cannot be
// fixtured and every failure mode of that rule is silent.
//
// ── ORDERING IS LOAD-BEARING: PROFILE READ BEFORE `signOut()` ───────────────────────────
// `heldProducts` is the entitlement-tier signal, and after `signOut()` there is no session to
// read it from — moving that read below the sign-out would degrade every no-`?product=` caller
// to the host/unknown tier while still typechecking and still redirecting somewhere.

import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { resolveProducts, type Product } from '@/lib/entitlements';
import { resolveIsIB } from '@/lib/site';
import { resolveSignOutDestination } from '@/lib/signout-destination';
import type { SiteProduct } from '@/lib/product-router';

// `Product` and `SiteProduct` are the same three names in two modules (entitlements answers
// "what does this account hold", product-router answers "what is this visitor here for").
// Mapped explicitly rather than cast, so adding a member to either union is a type error here
// instead of a silently unrouted product.
const AS_SITE_PRODUCT: Readonly<Record<Product, SiteProduct>> = {
  LC: 'LC',
  IB: 'IB',
  ACCA: 'ACCA',
};

export async function POST(request: NextRequest) {
  const supabase = await createServerClient();

  // Vercel sets x-forwarded-host; `host` is the local/dev answer. Only used to ask whether
  // this is the single-product host (gradd.ie) — never to branch product behaviour, which
  // CLAUDE.md forbids and which `resolveIsIB` cannot do anyway (gradd.ai carries both).
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? '';

  // ── Signals, gathered BEFORE the session is destroyed ────────────────────────────────
  let heldProducts: SiteProduct[] = [];
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subject, subscription_status, student_name, ib_economics_level, ib_business_level, apm_subscription_status, apm_pass_expires_at')
      .eq('id', user.id)
      .single();
    const isGraddAi = await resolveIsIB(host);
    const ent = resolveProducts(profile ?? {}, { isGraddAi });
    heldProducts = Array.from(ent.products, (p) => AS_SITE_PRODUCT[p]);
  }

  await supabase.auth.signOut();

  const { path } = resolveSignOutDestination({
    host,
    productParam: request.nextUrl.searchParams.get('product'),
    nextParam: request.nextUrl.searchParams.get('next'),
    refererHeader: request.headers.get('referer'),
    heldProducts,
  });

  // 303 See Other + a root-relative Location. Not `NextResponse.redirect`, which requires an
  // absolute URL and so would reintroduce the origin guess this fix removed.
  return new NextResponse(null, { status: 303, headers: { Location: path } });
}
