import { strictPaper } from '@/lib/acca/paper';
import { createServiceClient } from '@/lib/supabase/server';
import { recordServerError } from '@/lib/acca/error-recorder';
import stripe from '@/lib/stripe';
import { Resend } from 'resend';
import { buildWelcomeEmail } from '@/lib/email/welcome-template';
import { buildIBWelcomeEmail } from '@/lib/email/ib-welcome-template';
import { notifyGrant } from '@/lib/notify';
import type { IBSubject, IBLevel } from '@/lib/email/ib-welcome-template';
import { NextResponse } from 'next/server';
import type Stripe from 'stripe';

// ═════════════════════════════════════════════════════════════════════════════
// ── A FAILED WRITE MUST REACH STRIPE AS A NON-2xx (2026-09-05) ───────────────
//
// Twelve writes in this file grant, revoke or sync PAID ACCESS. Until now every one of them
// was `await supabase.from(...).update(...)` with the result discarded — and supabase-js
// RESOLVES with `{ data, error }` rather than throwing, so a database-level rejection was
// not an exception, was not caught by anything, and fell straight through to the
// unconditional `{ received: true }` below.
//
// The consequence is the worst available on this surface: STRIPE TREATS 200 AS DELIVERED AND
// NEVER RETRIES. A customer pays, the grant is rejected by the database, Stripe is told the
// event was handled, and the customer has no entitlement — with no row, no log, and no
// second chance. (A THROWN error already produced a 500 and a retry; the one failure mode
// that actually happens was the one not covered.)
//
// Now: every one of the twelve reads its error and throws `StripeWriteError`; this dispatcher
// RECORDS the failure and RE-THROWS. The throw is the recovery — Stripe's own backoff is a
// far better retry than anything built here — and the recorded row is how anyone finds out it
// happened at all. Both, not either.
//
// ── WHY RE-RUNNING A HANDLER IS SAFE ────────────────────────────────────────
// Audited 2026-09-05, all eight handlers. Every one of the twelve is an UPDATE with literal
// or Stripe-derived values: no insert without a conflict target, no counter, no append. The
// only INSERT in the file (`acca_entitlements`) already checks its error and is idempotent
// through `uq_acca_entitlements_stripe_event`.
//
// The replay risk here is NOT in the database — it is the welcome email and the operator
// alert, and both are safe ONLY because of where they sit. See the ⚠️ ORDERING notes at
// those two call sites before moving anything in those handlers.
//
// ⚠️ NO HANDLER CAN DETECT ITS OWN REPLAY. Stripe supplies `event.id`, stable across retries;
// nothing here reads it and no table stores it. The handlers are replay-safe because they are
// idempotent, not because anything checks — so this change makes retries MORE likely against
// a mechanism that was never verified. See docs/AFM_SURFACED.md.
// ═════════════════════════════════════════════════════════════════════════════

/** A write that must reach Stripe as a failure. Carries WHICH write, and the driver's own
 *  code, into `metadata.detail` — a PostgREST error is a plain object, so without this the
 *  recorded row would read `ObjectError: duplicate key…` with no idea where it came from. */
export class StripeWriteError extends Error {
  constructor(write: string, cause: unknown) {
    const c = (cause ?? {}) as { code?: string; message?: string };
    super(`${write}${c.code ? ` [${c.code}]` : ''}: ${c.message ?? 'write failed'}`);
    this.name = 'StripeWriteError';
  }
}

/** Read a write's result and stop the handler if it failed. `write` is the W-number from the
 *  2026-09-05 audit plus what it writes, so a recorded row names the exact line. */
function orThrow(error: unknown, write: string): void {
  if (error) throw new StripeWriteError(write, error);
}

/** Best guess at whose event this is, for the error row's `user_id`. Every handler reads the
 *  same metadata key. Null is fine and expected — an invoice event carries no user id, and
 *  `metadata.route` still says where the failure was. */
function userIdFromEvent(event: Stripe.Event): string | null {
  const obj = event.data.object as { metadata?: Record<string, string> | null };
  return obj?.metadata?.supabase_user_id ?? null;
}

/**
 * The event switch. EXPORTED so the positive control can drive it with a stub client — the
 * route below is signature verification plus this call, and a fixture cannot forge a Stripe
 * signature.
 *
 * Throws on any write failure. Callers must not swallow it.
 */
export async function dispatchStripeEvent(
  supabase: ReturnType<typeof createServiceClient>,
  event: Stripe.Event,
): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      // APM purchases carry metadata.apm_product and are handled in COMPLETE
      // isolation — they must never fall through to the IB subscription handler.
      // (APM monthly is also mode:'subscription', so the mode check alone is
      // insufficient to keep them apart — the metadata branch is what separates them.)
      if (checkoutSession.metadata?.apm_product) {
        await handleAPMCheckoutComplete(supabase, checkoutSession);
        break;
      }
      if (checkoutSession.mode === 'subscription') {
        await handleCheckoutComplete(supabase, checkoutSession);
      }
      break;
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      // APM subscriptions carry apm_product in subscription metadata — route them
      // to the APM handler so they never write IB columns.
      if (subscription.metadata?.apm_product) {
        await handleAPMSubscriptionChange(supabase, subscription);
        break;
      }
      await handleSubscriptionChange(supabase, subscription);
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      if (subscription.metadata?.apm_product) {
        await handleAPMSubscriptionCancelled(supabase, subscription);
        break;
      }
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
}

/**
 * Record the failure, then let it propagate. EXPORTED for the positive control: its two arms
 * are exactly this function resolving (and writing nothing) versus rejecting (and writing one
 * row).
 *
 * ⚠️ THE RECORDER WRITES TO THE SAME DATABASE THAT JUST REJECTED THE WRITE, so in the
 * correlated case — Postgres unreachable — it will fail too. It cannot throw (see
 * error-recorder.ts), it logs, and the re-throw below still happens. Losing the row in that
 * case is acceptable precisely because the throw, not the row, is what recovers the payment.
 */
export async function dispatchOrRecord(
  supabase: ReturnType<typeof createServiceClient>,
  event: Stripe.Event,
): Promise<void> {
  try {
    await dispatchStripeEvent(supabase, event);
  } catch (err) {
    await recordServerError('stripe_webhook', 'api/webhooks/stripe', err, userIdFromEvent(event));
    throw err;
  }
}

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

  // NOT wrapped in a try/catch here, deliberately. `dispatchOrRecord` has already recorded
  // the failure; an uncaught throw is what makes Next answer non-2xx, and a non-2xx is the
  // entire point — it is the signal that puts the event back into Stripe's retry schedule.
  // Catching it to return a tidy 500 would work identically today and would be one edit away
  // from someone returning 200 again.
  await dispatchOrRecord(supabase, event);

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

  const { error: w1 } = await supabase
    .from('profiles')
    .update({
      stripe_customer_id: customerId,
      stripe_subscription_id: session.subscription as string,
      subscription_status: 'active',
      subscription_tier: subscriptionTier,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  orThrow(w1, 'W1 profiles(IB/LC checkout grant)');

  // ── Send welcome email via Resend ─────────────────────────────
  // ⚠️ ORDERING IS LOAD-BEARING — DO NOT MOVE THIS ABOVE W1.
  // The email is the one effect in this handler that CANNOT be undone or repeated safely: a
  // second welcome email is visible to the customer, and Stripe may deliver the same event
  // more than once. Every database write here is an idempotent UPDATE and survives a replay;
  // this does not.
  //
  // It is safe today for exactly one reason: it runs AFTER the only write, so when W1 throws
  // the handler stops here and the email has NOT been sent. Stripe retries, the write
  // succeeds, and the customer gets one email. Hoisting the send above W1 — or reordering
  // this handler "for readability" — silently converts every retried grant into a duplicate
  // welcome email, and nothing would fail to tell you.
  //
  // Fixture: scripts/test-stripe-webhook-errors.ts asserts the send does not happen when W1
  // fails. That test is the guard on this comment.
  //
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

// ── APM handlers ──────────────────────────────────────────────────────────────
// All APM writes target apm_* columns ONLY and match purely by supabase_user_id
// from metadata — never by stripe_customer_id. This guarantees an APM payment can
// never trip an IB handler and an IB payment can never trip an APM handler.

async function handleAPMCheckoutComplete(
  supabase: ReturnType<typeof createServiceClient>,
  session: Stripe.Checkout.Session
) {
  const userId = session.metadata?.supabase_user_id;
  const product = session.metadata?.apm_product; // 'monthly' | 'pass'
  if (!userId || !product) return;

  // ── WHICH PAPER (per-paper pricing, 2026-08-03) ─────────────────────────────
  // Written by app/api/checkout/acca. A purchase with NO paper cannot be attributed —
  // four SKUs do not help, because this handler branches on metadata rather than on the
  // price id. Two behaviours, deliberately different:
  //   • paper present  → write an acca_entitlements row for THAT paper.
  //   • paper absent   → this is a pre-split Stripe object created before this deploy.
  //     Fall through to the legacy column write ONLY, which is bundle-wide and therefore
  //     still correct for a purchase made under the bundled offer. Do NOT guess 'APM':
  //     an AFM buyer silently granted APM is the worst outcome available here.
  const paper = strictPaper(session.metadata?.paper);

  if (product === 'pass') {
    // One-time €99 pass: grant 90 days from now. There is no Stripe 'ended' event
    // for a one-time payment — the access gate lapses this on date server-side.
    //
    // We DELIBERATELY do NOT set apm_subscription_status here. The access gate is
    // `status==='active' OR pass>now`; if a pass set status='active' it would grant
    // forever and the pass would never end (the date branch becomes moot). A pass
    // is date-driven only. Leaving status untouched also avoids clobbering a real
    // active monthly subscription if the same user ever held both.
    //
    // ⚠️ THIS VALUE DRIFTS ON A REPLAY, KNOWN AND ACCEPTED. It is `now + 90 days`, computed
    // when the handler RUNS rather than derived from the payment, so if Stripe redelivers
    // this event — a retry after a failed write, or its ordinary at-least-once delivery — the
    // expiry is recomputed and moves forward by however long the gap was. Seconds to hours,
    // always in the customer's favour, and it cannot compound beyond the retry window.
    // Deriving it from `session.created` would pin it, and is not worth doing while the drift
    // is bounded and generous; it is written down here so the next reader finds a known
    // property rather than a surprise. The entitlement row's own `expires_at` below shares
    // the shape but not the exposure — its insert is idempotent on `stripe_event_id`, so a
    // replay never rewrites it.
    const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString();
    const { error: w2 } = await supabase
      .from('profiles')
      .update({
        apm_pass_expires_at: expiresAt,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    orThrow(w2, 'W2 profiles(ACCA 90-day pass)');
  } else if (product === 'monthly') {
    // Recurring €49/mo: mark active and store the subscription id for later
    // cancellation reconciliation (customer.subscription.deleted).
    const { error: w3 } = await supabase
      .from('profiles')
      .update({
        apm_subscription_status: 'active',
        apm_stripe_subscription_id: session.subscription as string,
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId);
    orThrow(w3, 'W3 profiles(ACCA monthly grant)');
  }

  // ── THE PER-PAPER ENTITLEMENT ROW ───────────────────────────────────────────
  // Written IN ADDITION to the legacy column write above, not instead of it. Both are
  // maintained through the transition so a rollback of this deploy cannot strand a
  // customer who paid in the meantime: the legacy columns alone still grant them access
  // (bundle-wide, which is generous rather than wrong), and the table alone grants the
  // paper they actually bought. Dropping the legacy write is the LAST step, after the
  // dual-read has been verified.
  //
  // Skipped entirely when the paper is absent — a pre-split Stripe object. See the note
  // where `paper` is parsed.
  if (paper) {
    // `stripe_event_id` carries the SESSION id, which is stable across Stripe's retries
    // of the same checkout.session.completed. The unique index on it is what makes a
    // retried webhook a no-op instead of a second entitlement.
    const row = {
      user_id: userId,
      paper_code: paper,
      source: 'stripe' as const,
      stripe_event_id: session.id,
      ...(product === 'pass'
        ? {
            kind: 'pass' as const,
            // Still purchase + 90 days. Sitting-dated expiry lands when checkout offers a
            // sitting to choose (acca_sittings exists but is unverified and therefore not
            // sellable yet — see the migration's dates_verified interlock). Deriving from a
            // sitting here before the UI can collect one would invent the student's choice.
            expires_at: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
          }
        : {
            kind: 'subscription' as const,
            subscription_status: 'active',
            stripe_subscription_id: (session.subscription as string) ?? null,
          }),
    };
    const { error } = await supabase.from('acca_entitlements').insert(row);
    // 23505 = the idempotency index did its job on a Stripe retry. Anything else is
    // logged and swallowed: the legacy column write above has already granted access, so
    // a failure here must never turn a successful payment into a 500 that Stripe retries
    // forever. It shows up as a missing row, which the reconcile query in the migration
    // is written to surface.
    if (error && (error as { code?: string }).code !== '23505') {
      console.error('WEBHOOK: acca_entitlements insert failed', paper, product, error.message);
    }
  }

  // Best-effort internal alert. Only the one-off pass and the subscription START
  // flow through checkout.session.completed — renewals hit invoice.* and are not
  // reported here, which is exactly what we want. notifyGrant swallows all
  // errors, so this can never affect the webhook 200.
  //
  // ⚠️ ORDERING IS LOAD-BEARING — DO NOT MOVE THIS ABOVE W2/W3.
  // Same rule as the welcome email in handleCheckoutComplete, for the same reason: an email
  // is the one effect here that cannot be un-sent, and it is safe under replay ONLY because
  // it runs after every write in this handler. When W2 or W3 throws, the handler stops before
  // this line and no alert goes out; Stripe retries, the write lands, and one alert is sent.
  // Hoisting it — or moving either write below it — turns every retried payment into a
  // duplicate "payment received" alert, which is exactly the kind of noise that gets an alert
  // channel muted and then ignored when it matters. The entitlements insert between here and
  // the writes above does NOT throw (it is deliberately swallowed, see its comment), so it
  // cannot skip this line either.
  //
  // Fixture: scripts/test-stripe-webhook-errors.ts asserts no alert when W2 fails.
  const email = session.customer_details?.email ?? session.customer_email ?? 'unknown email';
  const label = product === 'pass' ? 'pass €99' : 'subscription €49/mo';
  const paperLabel = paper ?? 'ACCA (pre-split, no paper in metadata)';
  await notifyGrant(
    `[Gradd] ${paperLabel} payment — ${label}`,
    `${paperLabel} ${label} — ${email}`,
  );
}

async function handleAPMSubscriptionChange(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  // Keep apm_subscription_status in sync with Stripe (e.g. past_due → not active).
  // Access is granted only on 'active', so any non-active status closes the gate.
  const status = mapStripeStatus(subscription.status);
  const { error: w4 } = await supabase
    .from('profiles')
    .update({
      apm_subscription_status: status,
      apm_stripe_subscription_id: subscription.id,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  orThrow(w4, 'W4 profiles(ACCA subscription status sync)');

  // Mirror onto the per-paper row. Keyed by the SUBSCRIPTION ID rather than by paper:
  // the id is what Stripe gives us on this event, and it already identifies exactly one
  // row. Reading the paper from metadata and matching on that would break for a
  // subscription created before the split, which carries no paper.
  const { error: w5 } = await supabase
    .from('acca_entitlements')
    .update({ subscription_status: status, updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('stripe_subscription_id', subscription.id);
  orThrow(w5, 'W5 acca_entitlements(status mirror)');
}

async function handleAPMSubscriptionCancelled(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  const { error: w6 } = await supabase
    .from('profiles')
    .update({
      apm_subscription_status: 'inactive',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  orThrow(w6, 'W6 profiles(ACCA cancel)');

  // Close the per-paper row too. `revoked_at` is set as well as the status: the status
  // is what the predicate reads, and revoked_at is what frees the partial unique index so
  // the same student can subscribe to that paper again later. Without it the second
  // subscription would collide with the corpse of the first.
  const { error: w7 } = await supabase
    .from('acca_entitlements')
    .update({
      subscription_status: 'inactive',
      revoked_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('stripe_subscription_id', subscription.id)
    .is('revoked_at', null);
  orThrow(w7, 'W7 acca_entitlements(revoke)');
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
  // W8 reads BOTH halves: `error` decides whether to throw, `data` decides whether the
  // fallback below is needed. Before this it read only `data`, which conflated "the write
  // failed" with "no profile carries that customer id" — the first must retry, the second
  // must fall through, and they are not the same event.
  const { data: byCustomer, error: w8 } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('stripe_customer_id', customerId)
    .select('id');
  orThrow(w8, 'W8 profiles(IB/LC subscription sync by customer)');

  if (byCustomer && byCustomer.length > 0) return;

  // ── Fallback: match by supabase_user_id in subscription metadata
  const userId = subscription.metadata?.supabase_user_id;
  if (!userId) return;

  const { error: w9 } = await supabase
    .from('profiles')
    .update(updatePayload)
    .eq('id', userId);
  orThrow(w9, 'W9 profiles(IB/LC subscription sync by metadata user)');
}

async function handleSubscriptionCancelled(
  supabase: ReturnType<typeof createServiceClient>,
  subscription: Stripe.Subscription
) {
  const customerId = subscription.customer as string;
  const { error: w10 } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
  orThrow(w10, 'W10 profiles(IB/LC cancel)');
}

async function handlePaymentFailed(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  const { error: w11 } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'past_due',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
  orThrow(w11, 'W11 profiles(payment failed → past_due)');
}

async function handlePaymentSucceeded(
  supabase: ReturnType<typeof createServiceClient>,
  invoice: Stripe.Invoice
) {
  const customerId = invoice.customer as string;
  const { error: w12 } = await supabase
    .from('profiles')
    .update({
      subscription_status: 'active',
      updated_at: new Date().toISOString(),
    })
    .eq('stripe_customer_id', customerId);
  orThrow(w12, 'W12 profiles(payment succeeded → active)');
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