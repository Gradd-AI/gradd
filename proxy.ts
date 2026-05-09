import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function proxy(request: NextRequest) {
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

  const protectedPaths = ['/dashboard', '/session'];
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p));

  if (isProtectedPath) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/login', request.url));
    }

    if (!pathname.startsWith('/subscribe')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', user.id)
        .single();

      if (!profile || profile.subscription_status !== 'active') {
        return NextResponse.redirect(new URL('/subscribe', request.url));
      }
    }
  }

  if (user && (pathname === '/auth/login' || pathname === '/auth/signup')) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // gradd.ai → serve IB signup at the same URL (unauthenticated users only)
  const host = request.headers.get('host') ?? '';
  if (pathname === '/auth/signup' && (host === 'gradd.ai' || host.startsWith('gradd.ai:'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signup/ib';
    return NextResponse.rewrite(url);
  }

  return response;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/).*)',
  ],
};