import { createServerClient } from '@/lib/supabase/server';
import stripe from '@/lib/stripe';
import { NextResponse } from 'next/server';

const IB_PRICE_IDS: Record<string, Record<string, string>> = {
  IB_ECONOMICS: {
    monthly: process.env.STRIPE_IB_ECON_MONTHLY!,
    annual:  process.env.STRIPE_IB_ECON_ANNUAL!,
  },
  IB_BUSINESS: {
    monthly: process.env.STRIPE_IB_BM_MONTHLY!,
    annual:  process.env.STRIPE_IB_BM_ANNUAL!,
  },
  IB_BUNDLE: {
    monthly: process.env.STRIPE_IB_BUNDLE_MONTHLY!,
    annual:  process.env.STRIPE_IB_BUNDLE_ANNUAL!,
  },
};

export async function POST(request: Request) {
  const { billing, subject } = await request.json();

  if (!billing || !subject) {
    return NextResponse.json({ error: 'billing and subject required' }, { status: 400 });
  }

  const priceMap = IB_PRICE_IDS[subject as string];
  if (!priceMap) {
    return NextResponse.json({ error: `Unknown IB subject: ${subject}` }, { status: 400 });
  }

  const priceId = priceMap[billing as string];
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price ID for ${subject} ${billing}. Add it to environment variables.` },
      { status: 500 }
    );
  }

  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gradd.ai';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: profile.stripe_customer_id ?? undefined,
      customer_email: profile.stripe_customer_id ? undefined : profile.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: { supabase_user_id: user.id, ib_subject: subject },
      },
      metadata: {
        supabase_user_id: user.id,
        ib_subject: subject,
      },
      success_url: `${appUrl}/subscribe?success=true`,
      cancel_url: `${appUrl}/dashboard`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('IB Stripe checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
