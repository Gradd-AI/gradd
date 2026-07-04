import { createServerClient } from '@/lib/supabase/server';
import stripe from '@/lib/stripe';
import { NextResponse } from 'next/server';

// APM has two SKUs: a recurring €49/mo subscription and a one-time €99 90-day pass.
// Both are TEST-MODE price IDs from .env.local.
const APM_MONTHLY = process.env.STRIPE_APM_MONTHLY;
const APM_PASS_90D = process.env.STRIPE_APM_PASS_90D;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const product = (body as { product?: unknown }).product;
  if (product !== 'monthly' && product !== 'pass') {
    return NextResponse.json({ error: 'product must be "monthly" or "pass"' }, { status: 400 });
  }

  const priceId = product === 'monthly' ? APM_MONTHLY : APM_PASS_90D;
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price ID for APM ${product}. Add it to environment variables.` },
      { status: 500 }
    );
  }

  // ── Auth (user is already authed via the per-page guards; re-verify here) ────
  const supabase = await createServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

  const origin = request.headers.get('origin') ?? process.env.NEXT_PUBLIC_APP_URL ?? 'https://gradd.ai';

  // metadata.apm_product is the sole separator the webhook branches on so APM
  // purchases never touch IB columns (and vice versa). It rides on BOTH the
  // checkout session AND the subscription (subscription_data.metadata) so it is
  // present on every downstream Stripe event (created/updated/deleted).
  const apmMeta = { supabase_user_id: user.id, apm_product: product };

  // We pass customer_email rather than reusing profile.stripe_customer_id: APM
  // deliberately keeps a Stripe customer distinct from the IB one so the
  // customer-id-keyed IB handlers (invoice.*, subscription.*) can never match an
  // APM payment. APM is reconciled purely by supabase_user_id in metadata.
  const common = {
    customer_email: profile.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: apmMeta,
    success_url: `${origin}/acca/subscribe?success=true`,
    cancel_url: `${origin}/acca/subscribe`,
    allow_promotion_codes: true,
  };

  try {
    const session = await stripe.checkout.sessions.create(
      product === 'monthly'
        ? { ...common, mode: 'subscription', subscription_data: { metadata: apmMeta } }
        : { ...common, mode: 'payment', payment_intent_data: { metadata: apmMeta } }
    );

    return NextResponse.json({ url: session.url });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('APM Stripe checkout error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
