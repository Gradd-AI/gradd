// middleware.ts
// Place this file at the project root (same level as app/)

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Routes that require a logged-in user
const PROTECTED = ['/dashboard', '/session']

// Routes that logged-in users shouldn't see (auth pages)
const AUTH_ONLY = ['/auth/login', '/auth/signup']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  let response = NextResponse.next({
    request: { headers: request.headers },
  })

  // Create Supabase client wired to the request/response cookies
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // Write updated cookies onto both the request and response
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          response = NextResponse.next({
            request: { headers: request.headers },
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // This call refreshes the session and silences the getSession() warning
  const { data: { user } } = await supabase.auth.getUser()

  const isProtected = PROTECTED.some((path) => pathname.startsWith(path))
  const isAuthOnly = AUTH_ONLY.some((path) => pathname.startsWith(path))

  // Not logged in → trying to access a protected page → bounce to login
  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/auth/login'
    return NextResponse.redirect(loginUrl)
  }

  // Already logged in → trying to access login/signup → bounce to dashboard
  if (isAuthOnly && user) {
    const dashboardUrl = request.nextUrl.clone()
    dashboardUrl.pathname = '/dashboard'
    return NextResponse.redirect(dashboardUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Run middleware on all routes except:
     * - _next/static (static files)
     * - _next/image (image optimisation)
     * - favicon.ico
     * - /terms, /privacy, /cookies (public legal pages)
     */
    '/((?!_next/static|_next/image|favicon.ico|terms|privacy|cookies).*)',
  ],
}
