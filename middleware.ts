import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? '';
  const { pathname } = request.nextUrl;

  // gradd.ai → IB-specific signup page (URL stays /auth/signup in browser)
  if (pathname === '/auth/signup' && (host === 'gradd.ai' || host.startsWith('gradd.ai:'))) {
    const url = request.nextUrl.clone();
    url.pathname = '/auth/signup/ib';
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/auth/signup'],
};
