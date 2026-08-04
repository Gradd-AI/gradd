import { createServerClient } from '@/lib/supabase/server';
import stripe from '@/lib/stripe';
import { strictPaper } from '@/lib/acca/paper';
import { NextResponse } from 'next/server';

// ── FOUR SKUs: two papers x two mechanisms (per-paper pricing, 2026-08-03) ────
// Each paper is sold separately — a recurring €49/mo subscription and a one-time €99
// sitting-dated pass, per paper. The bundle is gone.
//
// WITHOUT `paper` IN THE METADATA A PURCHASE CANNOT BE ATTRIBUTED. Four SKUs are not
// enough on their own: the webhook branches on metadata, not on the price id, so a
// payment that does not carry its paper is un-routable — the handler would know that
// someone bought a pass and not which paper to grant. `paper` therefore rides on the
// checkout session AND on subscription_data, exactly as `apm_product` already does.
const PRICE_IDS: Record<'APM' | 'AFM', Record<'monthly' | 'pass', string | undefined>> = {
  APM: {
    monthly: process.env.STRIPE_APM_MONTHLY,
    pass:    process.env.STRIPE_APM_PASS_90D,
  },
  AFM: {
    monthly: process.env.STRIPE_AFM_MONTHLY,
    pass:    process.env.STRIPE_AFM_PASS_90D,
  },
};

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

  // The paper is REQUIRED and is not defaulted. `strictPaper` returns null for absent or
  // unrecognised input; defaulting to APM here would silently sell the wrong paper, and it
  // is the one error in this flow the customer pays for.
  const paper = strictPaper((body as { paper?: unknown }).paper);
  if (!paper) {
    return NextResponse.json({ error: 'paper must be "APM" or "AFM"' }, { status: 400 });
  }

  const priceId = PRICE_IDS[paper][product];
  if (!priceId) {
    return NextResponse.json(
      { error: `Missing Stripe price ID for ${paper} ${product}. Add it to environment variables.` },
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
  // `apm_product` keeps its name: it is the field the webhook's existing routing branches
  // on, and renaming it would orphan any in-flight Stripe object created before this deploy.
  // `paper` is added alongside it — see the PRICE_IDS note above for why four SKUs do not
  // remove the need for it.
  const apmMeta = { supabase_user_id: user.id, apm_product: product, paper };

  // We pass customer_email rather than reusing profile.stripe_customer_id: APM
  // deliberately keeps a Stripe customer distinct from the IB one so the
  // customer-id-keyed IB handlers (invoice.*, subscription.*) can never match an
  // APM payment. APM is reconciled purely by supabase_user_id in metadata.
  const common = {
    customer_email: profile.email,
    line_items: [{ price: priceId, quantity: 1 }],
    metadata: apmMeta,
    success_url: `${origin}/acca/subscribe?success=true&paper=${paper}`,
    // Same defect as success_url would have had without ?paper=: a bare cancel destination
    // resolves via /acca/subscribe's document.referrer fallback, and Stripe's cancel
    // redirect comes from stripe.com — the referrer can never match the AFM/APM regex, so
    // there was no coincidental save here at all, unlike the dashboard CTA case.
    cancel_url: `${origin}/acca/subscribe?paper=${paper}`,
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
