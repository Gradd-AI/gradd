import { createServerClient } from '@/lib/supabase/server';
import stripe from '@/lib/stripe';
import { NextResponse } from 'next/server';

const PRICE_IDS: Record<string, string> = {
  monthly: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_MONTHLY!,
  annual: process.env.NEXT_PUBLIC_STRIPE_PRICE_BUSINESS_ANNUAL!,
};

export async function POST(request: Request) {
  const { billing, subject, exam_level } = await request.json();

  if (!billing || !PRICE_IDS[billing]) {
    return NextResponse.json({ error: 'Invalid billing period' }, { status: 400 });
  }

  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
  }

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://gradd.ie';
  const isIB = origin.includes('gradd.ai');
  const sharedMeta = {
    supabase_user_id: user.id,
    ...(subject && { subject }),
    ...(exam_level && { exam_level }),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: profile.stripe_customer_id ?? undefined,
      customer_email: profile.stripe_customer_id ? undefined : profile.email,
      line_items: [{ price: PRICE_IDS[billing], quantity: 1 }],
      subscription_data: { metadata: sharedMeta },
      metadata: sharedMeta,
      success_url: isIB
        ? `${origin}/onboarding?session_id={CHECKOUT_SESSION_ID}`
        : `${origin}/dashboard?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('Stripe checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
