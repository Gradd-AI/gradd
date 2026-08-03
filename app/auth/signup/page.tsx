import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { resolveIsIB } from '@/lib/site';
import { resolveProductIntent, PRODUCT_SIGNUP } from '@/lib/product-router';
import LCSignupForm from './lc-form';
import IBSignupPage from './ib/page';

// ── FIXED 2026-08-03: this route served the IB signup form to ACCA visitors ──
// It read `return isIB ? <IBSignupPage /> : <LCSignupForm />` — a PRODUCT selection on
// `resolveIsIB`, which is a HOST check returning true for ACCA and IB alike on gradd.ai.
// A visitor arriving here with ACCA intent got the IB signup form: a live mis-serve,
// masked only because the ACCA funnel normally uses its own wall at /acca/auth, so most
// ACCA students never reached this page.
//
// "Masked" is not "fixed" — anything that dropped an ACCA visitor here (a stray link, a
// bookmark, a search result, a shared URL) signed them up through the wrong door. It is
// also exactly the failure `GRADD_BUILD_HARDENING.md:1917` predicted when it flagged the
// boolean as "a product check when it is really a host check".
//
// Now: `resolveProductIntent` reads the actual evidence — ?product=, ?next=, the referrer
// path — and ACCA intent is redirected to the ACCA wall. IB and LC keep their existing
// forms. Unknown intent on gradd.ai still renders the IB form: that is the status quo and
// the safe direction, since it is the only signup form this route owns.
export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const h = await headers();
  const host = h.get('host') ?? '';
  const sp = await searchParams;

  const productParam = typeof sp.product === 'string' ? sp.product : null;
  const nextParam = typeof sp.next === 'string' ? sp.next : null;

  let referrerPath: string | null = null;
  const ref = h.get('referer');
  if (ref) {
    try {
      const u = new URL(ref);
      if (u.host === host) referrerPath = u.pathname;
    } catch { /* unparseable → no signal, which is the correct reading */ }
  }

  const intent = resolveProductIntent({ host, productParam, nextParam, referrerPath });

  // ACCA has its own wall. Send them there rather than signing them up as an IB student.
  if (intent.product === 'ACCA') {
    redirect(`${PRODUCT_SIGNUP.ACCA}${nextParam ? `?next=${encodeURIComponent(nextParam)}` : ''}`);
  }

  // gradd.ie is single-product and resolves to LC BY HOST — the one legitimate host→product
  // inference, and it lives in the router rather than being re-derived here.
  if (intent.product === 'LC') return <LCSignupForm />;

  // IB, or unknown on gradd.ai. `resolveIsIB` is used ONLY to pick which of the two forms
  // this route owns — a host question, not a product one.
  const onGraddAi = await resolveIsIB(host);
  return onGraddAi ? <IBSignupPage /> : <LCSignupForm />;
}
