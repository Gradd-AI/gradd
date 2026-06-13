import { createServerClient } from '@/lib/supabase/server';
import stripe from '@/lib/stripe';
import { NextResponse } from 'next/server';

// One IB product: Economics + Business Management, one price. Subject choice removed.
const IB_PRICES: Record<string, string> = {
  monthly: process.env.STRIPE_IB_ECON_MONTHLY!,
  annual:  process.env.STRIPE_IB_ECON_ANNUAL!,
};

export async function POST(request: Request) {
  const { billing, exam_level } = await request.json();

  if (!billing) {
    return NextResponse.json({ error: 'billing required' }, { status: 400 });
  }

  const priceId = IB_PRICES[billing as string];
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price ID for ${billing}. Add it to environment variables.` },
      { status: 500 }
    );
  }

  const supabase = await createServerClient();
  const { data: { user: cookieUser }, error: authError } = await supabase.auth.getUser();

  console.error('IB CHECKOUT AUTH DEBUG:', {
    hasUser: !!cookieUser,
    userId: cookieUser?.id,
    authError: authError?.message,
    hasAuthHeader: !!request.headers.get('Authorization'),
    origin: request.headers.get('origin'),
  });

  let user = cookieUser;

  // Fallback: read Bearer token from Authorization header.
  if (!user) {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (token) {
      const { data } = await supabase.auth.getUser(token);
      user = data.user;
    }
  }

  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, stripe_customer_id, ia_scope_acknowledged')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  if (!profile.ia_scope_acknowledged) {
    return NextResponse.json({ error: 'IA acknowledgement required' }, { status: 400 });
  }

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://gradd.ai';
  const sharedMeta = {
    supabase_user_id: user.id,
    ib_subject: 'IB_BUNDLE',
    ...(exam_level && { exam_level }),
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: profile.stripe_customer_id ?? undefined,
      customer_email: profile.stripe_customer_id ? undefined : profile.email,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        metadata: sharedMeta,
      },
      metadata: sharedMeta,
      success_url: `${origin}/onboarding?subject=IB_BUNDLE&exam_level=${exam_level ?? ''}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/subscribe/ib`,
      allow_promotion_codes: true,
    });

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('IB Stripe checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
