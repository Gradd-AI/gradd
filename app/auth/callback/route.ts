import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { notifyGrant } from '@/lib/notify';
import { createServiceClient } from '@/lib/supabase/server';

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
      // Detect a brand-new signup by the profile-just-created signal: a fresh
      // account's created_at ≈ its first last_sign_in_at (both stamped this
      // exchange), whereas a returning user's created_at is far in the past
      // (verified: fresh signups ~0min, returning users thousands of min). This
      // replaces the old (Date.now − created_at < 5min) window AND the
      // next === '/acca' scoping — either could silently suppress the alert and
      // the Meta flag (a slow magic-link click, or a non-'/acca' destination).
      const u = data.user;
      const createdMs = u?.created_at ? new Date(u.created_at).getTime() : null;
      const lastSignInMs = u?.last_sign_in_at ? new Date(u.last_sign_in_at).getTime() : null;
      const FIRST_SIGNIN_WINDOW_MS = 10 * 60 * 1000; // huge margin: fresh ≈0, returning ≫10min
      const isNewSignup =
        createdMs !== null && lastSignInMs !== null && lastSignInMs - createdMs < FIRST_SIGNIN_WINDOW_MS;

      if (isNewSignup) {
        // Meta CompleteRegistration flag (fires wherever MetaTrackSignup mounts).
        dest.searchParams.set('signup', '1');

        // Persist first-touch attribution (utm_*/fbclid) captured on the landing, so every
        // signup carries its source. Best-effort: a missing cookie, an unapplied migration,
        // or a write error must never affect the redirect below.
        try {
          const attrRaw = cookieStore.get('gradd_attr')?.value;
          if (attrRaw && u?.id) {
            const attribution = JSON.parse(decodeURIComponent(attrRaw));
            const { error: attrErr } = await createServiceClient()
              .from('profiles')
              .update({ signup_attribution: attribution })
              .eq('id', u.id);
            if (attrErr) console.error('[attr] signup_attribution write failed —', attrErr.message);
            else console.log('[attr] signup_attribution saved for', u.email ?? u.id);
            cookieStore.set('gradd_attr', '', { path: '/', maxAge: 0 }); // consume first-touch
          }
        } catch (e) {
          console.error('[attr] signup_attribution threw —', (e as Error).message);
        }

        // Best-effort internal alert. notifyGrant never throws; it returns a skip
        // reason (also console.error'd) so Vercel function logs show exactly why an
        // alert did or did not go out — no more guessing which branch swallowed it.
        const email = u?.email ?? 'unknown email';
        const reason = await notifyGrant('[Gradd] New ACCA signup', `New signup — ${email} · next=${next}`);
        if (reason) console.error(`[notify] signup alert NOT sent for ${email} — ${reason}`);
        else console.log(`[notify] signup alert sent for ${email}`);
      } else {
        const gapS = createdMs !== null && lastSignInMs !== null ? Math.round((lastSignInMs - createdMs) / 1000) : null;
        console.log(`[notify] returning user (created→last_sign_in ${gapS === null ? 'n/a' : gapS + 's'}) — no signup alert`);
      }
      return NextResponse.redirect(dest.toString());
    }
  }

  return NextResponse.redirect(`${origin}/acca/auth?error=auth_failed`);
}
