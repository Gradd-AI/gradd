// middleware.ts
// Sets a __site cookie from ?site=ib or ?site=lc in preview/development only.
// In production (VERCEL_ENV === 'production') this file is a no-op — the early
// return fires before any cookie is read or written, so production behaviour
// is unchanged and the override cannot be triggered.
//
// Usage on a preview deployment:
//   https://<preview>.vercel.app/?site=ib  — switches to IB for 24 h
//   https://<preview>.vercel.app/?site=lc  — reverts to LC
//
// The middleware strips the param and redirects to the clean URL so it doesn't
// linger in the address bar or break link sharing.

import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = '__site';

export function middleware(request: NextRequest) {
  // Hard gate: production is purely host-based. Skip entirely.
  if (process.env.VERCEL_ENV === 'production') {
    return NextResponse.next();
  }

  const site = request.nextUrl.searchParams.get('site');
  if (site === 'ib' || site === 'lc') {
    const url = request.nextUrl.clone();
    url.searchParams.delete('site');
    const response = NextResponse.redirect(url);
    response.cookies.set(COOKIE_NAME, site, {
      path: '/',
      maxAge: 60 * 60 * 24, // 24 hours
      sameSite: 'lax',
      // Not httpOnly — client components read it via document.cookie.
      // No domain attribute — scoped to the current origin only,
      // so *.vercel.app cookies never reach gradd.ai or gradd.ie.
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
