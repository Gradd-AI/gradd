// scripts/test-stripe-webhook-errors.ts — the positive control for the Stripe webhook's
// write-failure path. Pure: no DB, no network, no model. Run: npm run test:stripe-webhook-errors
//
// ── WHAT IS BEING DEFENDED ───────────────────────────────────────────────────
// Twelve writes in app/api/webhooks/stripe/route.ts grant, revoke or sync PAID ACCESS. Every
// one of them used to discard its `error`, and supabase-js RESOLVES with { data, error }
// rather than throwing — so a rejected grant reached Stripe as `{received:true}`, Stripe
// marked the event delivered, and it was NEVER RETRIED. A customer pays, the grant is
// rejected, and nothing anywhere knows.
//
// ── P-G3(a): BOTH ARMS, BECAUSE ONE ARM PROVES NOTHING ──────────────────────
// A suite that only drives the failure cannot show the success path stayed clean, and a
// change that recorded an error row on EVERY event would pass it. So every property here is
// asserted in both directions:
//     write fails    → the call REJECTS  and exactly ONE error row is recorded
//     write succeeds → the call RESOLVES and ZERO error rows are recorded
//
// ── HOW IT OBSERVES, AND WHY THERE IS NO TEST SEAM IN PRODUCTION CODE ───────
// `dispatchOrRecord` calls the REAL `recordServerError`, which builds a REAL service client
// and issues a REAL PostgREST insert. Rather than injecting a fake recorder — a seam that
// would exist purely for this file, and would then be proving that the fixture's own stub
// works — the fixture replaces `globalThis.fetch` and classifies what the production code
// tries to send:
//     …/rest/v1/acca_funnel_events   → an error row was recorded
//     api.resend.com                 → an email was sent
// One stub, and it observes the recorder AND the side effects through the code that actually
// ships. Nothing leaves the process: the stub answers every request itself.
//
// Env is FORCED to stub values rather than defaulted (`=`, not `||=`) so that a run with a
// real .env.local loaded cannot reach production even if the fetch stub were removed.
// STRIPE_SECRET_KEY is required only because `@/lib/stripe` constructs a client at module
// load; it is never used to make a request. (Same precedent as the other env-touching
// fixtures listed in scripts/run-contracts.ts.)

process.env.STRIPE_SECRET_KEY       = 'sk_test_fixture_never_used';
process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://stub.invalid';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'stub-service-role-key';
// Both are needed or notifyGrant SKIPS before ever attempting a send — which would make the
// "no alert was sent" assertion vacuously true. See the positive control on that assertion.
process.env.NOTIFY_EMAIL            = 'stub@stub.invalid';
process.env.RESEND_API_KEY          = 're_stub_fixture_key';

import type Stripe from 'stripe';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

// ── THE OBSERVER ─────────────────────────────────────────────────────────────
interface Seen { errorRows: Array<Record<string, unknown>>; emails: string[] }
const seen: Seen = { errorRows: [], emails: [] };

globalThis.fetch = (async (input: unknown, init?: { body?: unknown }) => {
  const url = String(typeof input === 'string' ? input : (input as { url?: string })?.url ?? input);
  if (url.includes('/rest/v1/acca_funnel_events')) {
    const body = typeof init?.body === 'string' ? JSON.parse(init.body) : init?.body;
    for (const row of (Array.isArray(body) ? body : [body])) seen.errorRows.push(row as Record<string, unknown>);
  } else if (url.includes('resend.com')) {
    seen.emails.push(url);
  }
  return new Response('[]', { status: 201, headers: { 'content-type': 'application/json' } });
}) as typeof fetch;

const reset = () => { seen.errorRows = []; seen.emails = []; };

// ── THE STUB CLIENT ──────────────────────────────────────────────────────────
// A thenable chain, because that is what the handlers await. `behaviour` decides per call, so
// a test can fail ONE write and let the rest succeed — which is how W5, W7 and W9 are reached
// at all (they only run after an earlier write in the same handler has succeeded).
type Res = { data: unknown; error: unknown };
type Behaviour = (table: string, op: string, index: number) => Res;

function stubClient(behaviour: Behaviour) {
  let index = 0;
  const make = (table: string, op: string) => {
    const result = behaviour(table, op, ++index);
    const chain: Record<string, unknown> = {};
    for (const m of ['eq', 'is', 'in', 'select', 'order', 'limit', 'neq', 'gte', 'lte']) {
      chain[m] = () => chain;
    }
    chain.single = () => chain;
    chain.maybeSingle = () => chain;
    chain.then = (res: (v: Res) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result).then(res, rej);
    return chain;
  };
  return {
    from: (table: string) => ({
      update: () => make(table, 'update'),
      insert: () => make(table, 'insert'),
      upsert: () => make(table, 'upsert'),
      delete: () => make(table, 'delete'),
      select: () => make(table, 'select'),
    }),
  };
}

/** Every write succeeds; the profile fetch returns an emailable profile. */
const ALL_OK: Behaviour = (table, op) =>
  op === 'select' && table === 'profiles'
    ? { data: { email: 'student@stub.invalid', full_name: 'A Parent', student_name: 'A Student' }, error: null }
    : { data: [], error: null };

/** A real-shaped PostgREST rejection. NOT an Error — that is the whole point of the bug. */
const PG_ERROR = { code: '23514', message: 'new row violates check constraint "profiles_status_chk"', details: null, hint: null };

/** Everything succeeds except the nth write. */
const failAt = (n: number): Behaviour => (table, op, index) =>
  index === n ? { data: null, error: PG_ERROR } : ALL_OK(table, op, index);

/** Everything succeeds except writes to `table`. */
const failTable = (t: string): Behaviour => (table, op, index) =>
  table === t && op !== 'select' ? { data: null, error: PG_ERROR } : ALL_OK(table, op, index);

// ── EVENTS ───────────────────────────────────────────────────────────────────
const USER = '11111111-2222-4333-8444-555555555555';
const ev = (type: string, object: Record<string, unknown>) =>
  ({ id: `evt_${type}`, type, data: { object } } as unknown as Stripe.Event);

const IB_CHECKOUT = ev('checkout.session.completed', {
  id: 'cs_ib', mode: 'subscription', customer: 'cus_ib', subscription: 'sub_ib',
  metadata: { supabase_user_id: USER, ib_subject: 'IB_ECONOMICS', exam_level: 'HL' },
  customer_details: { email: 'student@stub.invalid' },
});
const ACCA_PASS = ev('checkout.session.completed', {
  id: 'cs_pass', mode: 'payment', customer: 'cus_a', subscription: null,
  metadata: { supabase_user_id: USER, apm_product: 'pass', paper: 'AFM' },
  customer_details: { email: 'acca@stub.invalid' },
});
const ACCA_MONTHLY = ev('checkout.session.completed', {
  id: 'cs_m', mode: 'subscription', customer: 'cus_a', subscription: 'sub_a',
  metadata: { supabase_user_id: USER, apm_product: 'monthly', paper: 'APM' },
  customer_details: { email: 'acca@stub.invalid' },
});
const sub = (meta: Record<string, string>) => ({
  id: 'sub_x', customer: 'cus_x', status: 'active', trial_end: null,
  items: { data: [{ price: { unit_amount: 4900, recurring: { interval: 'month' } } }] },
  metadata: meta,
});
const ACCA_SUB_CHANGE    = ev('customer.subscription.updated', sub({ supabase_user_id: USER, apm_product: 'monthly' }));
const ACCA_SUB_CANCELLED = ev('customer.subscription.deleted', sub({ supabase_user_id: USER, apm_product: 'monthly' }));
const IB_SUB_CHANGE      = ev('customer.subscription.updated', sub({ supabase_user_id: USER }));
const IB_SUB_CANCELLED   = ev('customer.subscription.deleted', sub({}));
const INVOICE_FAILED     = ev('invoice.payment_failed',    { customer: 'cus_x' });
const INVOICE_SUCCEEDED  = ev('invoice.payment_succeeded', { customer: 'cus_x' });

async function main() {
  const route = await import('../app/api/webhooks/stripe/route');
  const { dispatchOrRecord, StripeWriteError } = route;
  type Client = Parameters<typeof dispatchOrRecord>[0];

  const run = async (event: Stripe.Event, behaviour: Behaviour) => {
    reset();
    let threw: unknown = null;
    try { await dispatchOrRecord(stubClient(behaviour) as unknown as Client, event); }
    catch (e) { threw = e; }
    return { threw, rows: seen.errorRows.slice(), emails: seen.emails.slice() };
  };

  console.log('\nstripe webhook — a rejected write must reach Stripe as a failure, and leave a row\n');

  // ══ ARM 1: THE SUCCESS PATH IS CLEAN ══════════════════════════════════════
  // Without this arm, a change that recorded a row on every event would pass the failure arm.
  console.log('  ARM 1 — every write succeeds');
  const events: Array<[string, Stripe.Event]> = [
    ['IB checkout', IB_CHECKOUT], ['ACCA pass', ACCA_PASS], ['ACCA monthly', ACCA_MONTHLY],
    ['ACCA sub change', ACCA_SUB_CHANGE], ['ACCA sub cancelled', ACCA_SUB_CANCELLED],
    ['IB sub change', IB_SUB_CHANGE], ['IB sub cancelled', IB_SUB_CANCELLED],
    ['invoice failed', INVOICE_FAILED], ['invoice succeeded', INVOICE_SUCCEEDED],
  ];
  for (const [name, event] of events) {
    const r = await run(event, ALL_OK);
    ok(`${name}: resolves`, r.threw === null, String((r.threw as Error)?.message ?? ''));
    ok(`${name}: records NOTHING`, r.rows.length === 0, `${r.rows.length} rows`);
  }
  {
    const r = await run(ev('customer.updated', {}), ALL_OK);
    ok('an unhandled event type resolves and records nothing', r.threw === null && r.rows.length === 0);
  }

  // ══ ARM 2: EVERY ONE OF THE TWELVE REJECTS AND RECORDS EXACTLY ONE ROW ════
  console.log('\n  ARM 2 — the failing write');
  const cases: Array<[string, Stripe.Event, Behaviour]> = [
    ['W1 IB/LC checkout grant',        IB_CHECKOUT,        failTable('profiles')],
    ['W2 ACCA 90-day pass',            ACCA_PASS,          failTable('profiles')],
    ['W3 ACCA monthly grant',          ACCA_MONTHLY,       failTable('profiles')],
    ['W4 ACCA status sync',            ACCA_SUB_CHANGE,    failAt(1)],
    ['W5 entitlements status mirror',  ACCA_SUB_CHANGE,    failTable('acca_entitlements')],
    ['W6 ACCA cancel',                 ACCA_SUB_CANCELLED, failAt(1)],
    ['W7 entitlements revoke',         ACCA_SUB_CANCELLED, failTable('acca_entitlements')],
    ['W8 IB/LC sync by customer',      IB_SUB_CHANGE,      failAt(1)],
    ['W9 IB/LC sync by metadata user', IB_SUB_CHANGE,      failAt(2)],
    ['W10 IB/LC cancel',               IB_SUB_CANCELLED,   failTable('profiles')],
    ['W11 payment failed',             INVOICE_FAILED,     failTable('profiles')],
    ['W12 payment succeeded',          INVOICE_SUCCEEDED,  failTable('profiles')],
  ];
  const detailsSeen: string[] = [];
  for (const [label, event, behaviour] of cases) {
    const r = await run(event, behaviour);
    const wNum = label.split(' ')[0];
    ok(`${label}: REJECTS (this is what makes Stripe retry)`,
      r.threw instanceof StripeWriteError, `threw ${String(r.threw)}`);
    ok(`${label}: records exactly one row`, r.rows.length === 1, `${r.rows.length} rows`);
    const md = (r.rows[0]?.metadata ?? {}) as Record<string, string>;
    ok(`${label}: row names the surface and route`,
      md.surface === 'stripe_webhook' && md.route === 'api/webhooks/stripe');
    ok(`${label}: detail names the write`, (md.detail ?? '').includes(wNum), md.detail);
    ok(`${label}: detail carries the driver's code`, (md.detail ?? '').includes('23514'), md.detail);
    detailsSeen.push(md.detail ?? '');
  }
  ok('all twelve writes are distinctly identified in the recorded detail',
    new Set(detailsSeen).size === 12, `${new Set(detailsSeen).size} distinct`);

  // ══ ARM 3: THE ORDERING PROPERTY ═════════════════════════════════════════
  // The welcome email and the operator alert are the only effects in this file that cannot be
  // un-sent, and Stripe may deliver the same event more than once. They are safe under replay
  // for ONE reason: they run AFTER every DB write in their handler, so a throw means they have
  // not fired. Nothing in the type system holds that; these four checks do.
  //
  // BOTH DIRECTIONS, and the success direction is the one that matters most here: without it,
  // deleting the send entirely — or leaving NOTIFY_EMAIL unset — would satisfy "no email on
  // failure" while proving nothing at all.
  console.log('\n  ARM 3 — the side effect must not fire when an earlier write fails');
  {
    const failed = await run(IB_CHECKOUT, failTable('profiles'));
    ok('W1 fails → NO welcome email', failed.emails.length === 0, `${failed.emails.length} sends`);
    const okRun = await run(IB_CHECKOUT, ALL_OK);
    ok('W1 succeeds → the welcome email IS sent (the check above is not vacuous)',
      okRun.emails.length > 0);
  }
  {
    const failed = await run(ACCA_PASS, failTable('profiles'));
    ok('W2 fails → NO operator alert', failed.emails.length === 0, `${failed.emails.length} sends`);
    const okRun = await run(ACCA_PASS, ALL_OK);
    ok('W2 succeeds → the operator alert IS sent (the check above is not vacuous)',
      okRun.emails.length > 0);
  }

  // ══ ARM 4: THE SHAPE THAT CAUSED THE BUG IS PINNED MUST-FAIL ═════════════
  // The defect was not "the code lacked a try/catch" — it had one. It was that a resolved
  // { error } is not an exception. Pinned so the next reader sees the mechanism rather than
  // the symptom.
  console.log('\n  ARM 4 — the shape that caused this');
  {
    let caught = false;
    try {
      await (async () => {
        try { await Promise.resolve({ data: null, error: PG_ERROR }); }
        catch { caught = true; }
      })();
    } catch { /* unreachable */ }
    ok('MUST-FAIL: a try/catch around a resolved { error } catches NOTHING', caught === false);
    ok('...and the twelve now convert that resolution into a throw',
      (await run(INVOICE_SUCCEEDED, failTable('profiles'))).threw instanceof StripeWriteError);
  }

  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} stripe-webhook-errors: ${pass}/${pass + fail} checks\n`);
  // P-G4: never process.exit() — let the runtime flush stdout first.
  process.exitCode = fail === 0 ? 0 : 1;
}

void main();
