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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  let user: { id: string } | null = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    user = null;
  }

  const pathname = request.nextUrl.pathname;
  const protectedPaths = ['/dashboard', '/session'];
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtectedPath) {
    if (!user) {
      const redirect = NextResponse.redirect(new URL('/auth/login', request.url));
      response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value, c));
      return redirect;
    }

    // Load subscription status + subject in one query.
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subject')
      .eq('id', user.id)
      .single();

    const subject = profile?.subject ?? 'LC_BUSINESS';
    const isIBStudent = ['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE'].includes(subject);

    // IB students always pass through — free lesson gate lives in /session and /api/session/*
    if (!isIBStudent && (!profile || profile.subscription_status !== 'active')) {
      const redirect = NextResponse.redirect(new URL('/subscribe', request.url));
      response.cookies.getAll().forEach(c => redirect.cookies.set(c.name, c.value, c));
      return redirect;
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
