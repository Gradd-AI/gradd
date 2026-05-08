import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const domainOverride = process.env.NEXT_PUBLIC_DOMAIN ?? '';
  const isIB = host.includes('gradd.ai') || domainOverride === 'ib';

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
          // Mutate request cookies so server components see refreshed tokens.
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          // Reassign response so Set-Cookie headers reach the browser.
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Use getSession() rather than getUser() for routing decisions.
  // getSession() reads + refreshes from cookies without a network round-trip
  // to Supabase's auth server, so it never throws AuthApiError. Actual JWT
  // verification still happens inside every server component via getUser().
  let user: { id: string } | null = null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    user = session?.user ?? null;
  } catch {
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const protectedPaths = ['/dashboard', '/session', '/onboarding'];
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtectedPath) {
    if (!user) {
      const redirect = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value, c));
      return redirect;
    }

    // Load subscription status + subject for domain-specific gating.
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subject')
      .eq('id', user.id)
      .single();

    const subject = profile?.subject ?? 'LC_BUSINESS';
    const isIBStudent = ['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE'].includes(subject);

    if (isIB) {
      // gradd.ai: if the user hasn't completed IB onboarding (subject still
      // at the default 'LC_BUSINESS'), send them to onboarding — but only
      // when they're not already on /onboarding (avoid redirect loop).
      if (!isIBStudent && !pathname.startsWith('/onboarding')) {
        const redirect = NextResponse.redirect(new URL('/onboarding', request.url));
        response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value, c));
        return redirect;
      }
      // IB students with a completed subject → always pass through.
      // Free-lesson and subscription gates live in /session and /api/session/*.
    } else {
      // gradd.ie: LC Business must subscribe before accessing protected routes.
      if (!profile || profile.subscription_status !== 'active') {
        const redirect = NextResponse.redirect(new URL('/subscribe', request.url));
        response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value, c));
        return redirect;
      }
    }
  }

  // Redirect authenticated users away from auth pages.
  if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    const redirect = NextResponse.redirect(new URL('/dashboard', request.url));
    response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value, c));
    return redirect;
  }

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
