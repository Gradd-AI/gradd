import { createServiceClient } from '@/lib/supabase/server';
import stripe from '@/lib/stripe';
import { Resend } from 'resend';
import { buildWelcomeEmail } from '@/lib/email/welcome-template';
import { buildIBWelcomeEmail } from '@/lib/email/ib-welcome-template';
import type { IBSubject, IBLevel } from '@/lib/email/ib-welcome-template';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

export async function POST(request: Request) {
  const body = await request.text();
  const signature = request.headers.get('stripe-signature');

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 });
  }

  let event: Stripe.Event;

  const webhookSecret = request.headers.get('host')?.includes('gradd.ai')
    ? process.env.STRIPE_WEBHOOK_SECRET_AI!
    : process.env.STRIPE_WEBHOOK_SECRET!;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      webhookSecret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      if (checkoutSession.mode === 'subscription') {
        await handleCheckoutComplete(supabase, checkoutSession);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionChange(supabase, subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      await handleSubscriptionCancelled(supabase, subscription);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentFailed(supabase, invoice);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      await handlePaymentSucceeded(supabase, invoice);
      break;
    }

    default:
      break;
  }

  return NextResponse.json({ received: true });
}

async function handleCheckoutComplete(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.supabase_user_id;
  console.log('WEBHOOK: userId from metadata', userId);
  if (!userId) return;

  const customerId = session.customer as string;
  const metaSubject = session.metadata?.ib_subject ?? '';

  // One IB product now — every IB purchase is the full Economics + BM bundle.
  const subscriptionTier = metaSubject.startsWith('IB_') ? 'ib_bundle_monthly' : 'business_monthly';

  await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: session.subscription as string,
      subscription_status: 'active',
      subscription_tier: subscriptionTier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  // ── Send welcome email via Resend ─────────────────────────────
  // Fetch profile only for names and email
  const { data: profile } = await supabase
    .from('profiles')
    .select('email, full_name, student_name')
    .eq('id', userId)
    .single();
  console.log('WEBHOOK: profile fetch result', JSON.stringify(profile));

  if (profile?.email) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY!);
      const isIB = metaSubject.startsWith('IB_');
      console.log('WEBHOOK: metaSubject', metaSubject, 'isIB', isIB);

      if (isIB) {
        const ibSubject = metaSubject as IBSubject;
        const rawLevel = session.metadata?.exam_level ?? 'SL';
        const ibLevel = (['SL', 'HL'].includes(rawLevel) ? rawLevel : 'SL') as IBLevel;

        const { subject, html } = buildIBWelcomeEmail({
          studentName: profile.student_name || 'your student',
          fullName: profile.full_name || 'there',
          subject: ibSubject,
          examLevel: ibLevel,
        });

        console.log('WEBHOOK: attempting email send to', profile.email);
        const ibResult = await resend.emails.send({
          from: 'Gradd <hello@gradd.ie>',
          to: profile.email,
          subject,
          html,
        });
        console.log('WEBHOOK: email send result', JSON.stringify(ibResult));
      } else {
        const { subject, html } = buildWelcomeEmail({
          studentName: profile.student_name || 'your student',
          parentEmail: profile.email,
          fullName: profile.full_name || 'there',
        });

        console.log('WEBHOOK: attempting email send to', profile.email);
        const lcResult = await resend.emails.send({
          from: 'Gradd <hello@gradd.ie>',
          to: profile.email,
          subject,
          html,
        });
        console.log('WEBHOOK: email send result', JSON.stringify(lcResult));
      }
    } catch (err) {
      console.error('WEBHOOK: email send error', err);
    }
  }
}

async function handleSubscriptionChange(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const status = mapStripeStatus(subscription.status);

  const price = subscription.items.data[0]?.price;
  const unitAmount = price?.unit_amount ?? 0;
  const formattedAmount = unitAmount > 0
    ? `€${(unitAmount / 100).toFixed(2).replace(/\.00$/, '')}`
    : null;
  const billingCadence = price?.recurring?.interval === 'year' ? 'annual' : 'monthly';

  const updatePayload = {
    subscription_status: status,
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    trial_ends_at: subscription.trial_end
      ? new Date(subscription.trial_end * 1000).toISOString()
      : null,
    stripe_price_amount: formattedAmount,
    stripe_billing_cadence: billingCadence,
    updated_at: new Date().toISOString(),
  };

  // ── Primary: match by stripe_customer_id ─────────────────────
  const { data: byCustomer } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('stripe_customer_id', customerId)
    .select('id');

  if (byCustomer && byCustomer.length > 0) return;

  // ── Fallback: match by supabase_user_id in subscription metadata
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId);
}

async function handleSubscriptionCancelled(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
}

async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
}

function mapStripeStatus(stripeStatus: string): string {
  const map: Record<string, string> = {
    active: 'active',
    trialing: 'active',
    past_due: 'past_due',
    canceled: 'cancelled',
    unpaid: 'past_due',
    incomplete: 'inactive',
    incomplete_expired: 'inactive',
  };
  return map[stripeStatus] ?? 'inactive';
}