import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const SITE_COOKIE = '__site';

export async function proxy(request: NextRequest) {
  // ── Preview-only IB/LC override ─────────────────────────────────────────────
  // Hard gate: production is purely host-based — skip entirely.
  // In preview/development, ?site=ib or ?site=lc sets a __site cookie (24 h)
  // so IB pages can be reviewed on *.vercel.app URLs.
  if (process.env.VERCEL_ENV !== 'production') {
    const site = request.nextUrl.searchParams.get('site');
    if (site === 'ib' || site === 'lc') {
      const url = request.nextUrl.clone();
      url.searchParams.delete('site');
      const response = NextResponse.redirect(url);
      response.cookies.set(SITE_COOKIE, site, {
        path: '/',
        maxAge: 60 * 60 * 24, // 24 hours
        sameSite: 'lax',
        // Not httpOnly — client components read it via document.cookie.
        // No domain attribute — scoped to the current origin only,
        // so *.vercel.app cookies never reach gradd.ai or gradd.ie.
      });
      return response;
    }
  }

  // ── Auth guards ─────────────────────────────────────────────────────────────
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Admin guard — /admin/questions restricted to testbundle@gradd.ai
  if (pathname.startsWith('/admin/questions')) {
    if (!user) return NextResponse.redirect(new URL('/auth/login', request.url));
    if (user.email !== 'testbundle@gradd.ai') return NextResponse.redirect(new URL('/go', request.url));
  }

  const protectedPaths = ['/dashboard', '/session'];
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtectedPath) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

      // Free tier: any authenticated user may reach /dashboard and /session.
      // Capability gating (teaching cap) is enforced in the API routes, not here.
      // Subscription is no longer required to view the learning surface.
  }

  if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    // Resolve product home at /go — proxy does no DB reads, so it can't pick the surface
    // itself (gradd.ai serves BOTH IB and APM; host alone can't disambiguate).
    return NextResponse.redirect(new URL('/go', request.url));
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};
