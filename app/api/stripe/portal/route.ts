// app/api/stripe/portal/route.ts
// Gradd — Stripe Customer Portal Session
// Creates a portal session and returns the URL for redirect.
// The client redirects to this URL — Stripe hosts the portal page.

import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-03-31.basil',
});

export async function POST() {
  const supabase = createRouteHandlerClient({ cookies });

  // ── 1. Auth check ─────────────────────────────────────────────
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // ── 2. Get Stripe customer ID from profile ────────────────────
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', session.user.id)
    .single();

  if (profileError || !profile?.stripe_customer_id) {
    return NextResponse.json(
      { error: 'No Stripe customer found' },
      { status: 404 }
    );
  }

  // ── 3. Create portal session ──────────────────────────────────
  const portalSession = await stripe.billingPortal.sessions.create({
    customer: profile.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard`,
  });

  return NextResponse.json({ url: portalSession.url });
}
