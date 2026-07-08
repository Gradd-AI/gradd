import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { notifyGrant } from '@/lib/notify';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/acca';

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const dest = new URL(`${origin}${next}`);
      // Flag a brand-new account so /acca can fire Meta CompleteRegistration once.
      // A new user's account is created moments before this first callback; a
      // returning user's created_at is old. Only the drill dashboard hosts the
      // tracker, so scope the flag to next === '/acca'.
      const createdAt = data.user?.created_at;
      if (createdAt && next === '/acca') {
        const NEW_USER_WINDOW_MS = 5 * 60 * 1000;
        if (Date.now() - new Date(createdAt).getTime() < NEW_USER_WINDOW_MS) {
          dest.searchParams.set('signup', '1');
          // Best-effort internal alert on a brand-new APM signup. notifyGrant
          // swallows all errors, so this can never fail the redirect below.
          await notifyGrant(
            '[Gradd] New APM signup',
            `New APM signup — ${data.user?.email ?? 'unknown email'}`
          );
        }
      }
      return NextResponse.redirect(dest.toString());
    }
  }

  return NextResponse.redirect(`${origin}/acca/auth?error=auth_failed`);
}
