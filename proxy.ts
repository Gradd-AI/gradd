import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const domainOverride = process.env.NEXT_PUBLIC_DOMAIN ?? '';
  const isIB = host.includes('gradd.ai') || domainOverride === 'ib';

  let response = NextResponse.next({
    request: { headers: request.headers },
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

  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;
  const protectedPaths = ['/dashboard', '/session'];
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtectedPath) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status, subject')
      .eq('id', user.id)
      .single();

    const subject = profile?.subject ?? 'LC_BUSINESS';
    const isIBStudent = ['IB_ECONOMICS', 'IB_BUSINESS', 'IB_BUNDLE'].includes(subject);

    // IB students always pass — free lesson gate is enforced in /session and /api/session/*
    // LC students must subscribe before accessing protected routes
    if (!isIBStudent && (!profile || profile.subscription_status !== 'active')) {
      return NextResponse.redirect(new URL('/subscribe', request.url));
    }
  }

  if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // Set gradd-domain cookie so client components read it without re-detecting hostname
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
