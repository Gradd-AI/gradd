import { headers } from 'next/headers';
import { resolveProductIntent, type SiteProduct } from '@/lib/product-router';
import LoginForm from './LoginForm';

// ── FIXED 2026-08-03: ACCA students were shown IB-shaped copy ───────────────
// This passed `isIBDomain` (a HOST check) into the form, which used it to choose between
// IB copy and LC copy. On gradd.ai that meant every ACCA student signing in read
// "Your AI-powered IB tutor" — wrong product, on the domain whose flagship is ACCA.
//
// Lower stakes than the signup mis-serve (copy, not a wrong flow) but the same defect, and
// left in place it would have been the third live consumer of a boolean the hub now has to
// route around. The form takes a PRODUCT now, so a fourth product cannot be bolted on as
// another boolean.
export default async function LoginPage({
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
    } catch { /* unparseable → no signal */ }
  }

  const intent = resolveProductIntent({ host, productParam, nextParam, referrerPath });

  // Unknown intent on a shared sign-in page is genuinely common — someone lands on
  // /auth/login from a password manager with no referrer and no params. The form's neutral
  // copy is the honest answer there, so `null` is passed through rather than defaulted.
  const product: SiteProduct | null = intent.product;

  return <LoginForm product={product} />;
}
