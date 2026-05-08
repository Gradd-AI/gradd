import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const domainOverride = process.env.NEXT_PUBLIC_DOMAIN ?? '';
  const isIB = host.includes('gradd.ai') || domainOverride === 'ib';

  // Must use NextResponse.next({ request }) so that any cookies set by setAll
  // below (refreshed auth tokens) are forwarded to server components.
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Mutate the request cookies so server components see the new tokens.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Reassign response so the Set-Cookie headers reach the browser.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh the session. On any auth error treat as unauthenticated rather
  // than crashing — pages perform their own getUser() + redirect logic.
  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const pathname = request.nextUrl.pathname;

  // Redirect unauthenticated requests away from protected paths.
  const protectedPaths = ['/dashboard', '/session', '/onboarding'];
  if (!user && protectedPaths.some(p => pathname.startsWith(p))) {
    const loginUrl = new URL('/auth/login', request.url);
    // Copy any refreshed auth cookies so the browser doesn't lose them.
    const redirect = NextResponse.redirect(loginUrl);
    response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  // Redirect authenticated users away from auth pages.
  if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

  // Set gradd-domain cookie so client components read it without re-detecting hostname.
  response.cookies.set('gradd-domain', isIB ? 'ib' : 'lc', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });

  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/).*)'],
};
