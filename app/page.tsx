// app/page.tsx
// HUB-AND-SPOKE ROOT (restructured 2026-08-03):
//   gradd.ai → the HUB. Sells the method, routes to /acca or /ib.
//   gradd.ie → LC Business landing (unchanged), with its logged-in→/dashboard redirect.
//
// ── WHAT MOVED, AND WHY THE OLD CODE WAS A DOCTRINE VIOLATION ───────────────
// This file used to read `isIB ? <ACCALandingPage/> : <LandingPage/>` — SELECTING A PRODUCT
// on `resolveIsIB`, a HOST check. CLAUDE.md forbids exactly that, and
// `GRADD_BUILD_HARDENING.md:1917` names the hazard: the boolean returns true for ACCA AND
// IB on gradd.ai, so it cannot tell the two apart. It was survivable only while gradd.ai
// had one flagship. A hub has to route BETWEEN them, so it had to go.
//
// The APM landing now lives at /acca/apm, with its canonical, og:url and keyword set moved
// with it. `resolveIsIB` survives here for ONE thing it is genuinely correct for: deciding
// whether this request is on the LC domain at all. That is a host question.
//
// ── INTENT-AWARE, BUT NEVER GUESSING ────────────────────────────────────────
// `resolveProductIntent` runs before the hub renders. A visitor arriving with evidence of a
// product (a campaign `?product=`, an ACCA referrer, a single held entitlement) is sent
// straight there — a hub shown to someone whose destination is already known is friction.
// A visitor with NO such evidence gets the hub and is ASKED. That null-means-ask property
// is the whole reason the router is not a boolean.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import LandingPage from '@/components/landing/LandingPage';
import HubLandingPage from '@/components/landing/HubLandingPage';
import { resolveIsIB } from '@/lib/site';
import { resolveProductIntent, PRODUCT_HOME } from '@/lib/product-router';
import type { Metadata } from 'next';

const LC_METADATA: Metadata = {
  title: 'AI Tutor for Leaving Cert Business — From €24.99/mo | Gradd',
  description:
    'Full LC Business syllabus from scratch to exam-ready. SEC-aligned curriculum, exam technique built in, progress tracked. 7-day free trial. From €24.99/month.',
  keywords: [
    'LC Business tutor',
    'Leaving Cert Business',
    'Leaving Certificate Business tutor',
    'LC Business grinds online',
    'AI tutor Ireland',
    'homeschool Leaving Cert',
    'SEC Business syllabus',
    'LC Business online Ireland',
    'Leaving Cert Business Higher Level',
    'Leaving Cert Business Ordinary Level',
    'external LC candidate',
  ],
  alternates: { canonical: 'https://gradd.ie/' },
  openGraph: {
    title: 'AI Tutor for Leaving Cert Business — From €24.99/mo | Gradd',
    description:
      'Full LC Business syllabus from scratch to exam-ready. SEC-aligned curriculum, exam technique built in, progress tracked. 7-day free trial. From €24.99/month.',
    url: 'https://gradd.ie/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Tutor for Leaving Cert Business — From €24.99/mo | Gradd',
    description:
      'Full LC Business syllabus from scratch to exam-ready. SEC-aligned curriculum, exam technique built in, progress tracked. 7-day free trial. From €24.99/month.',
  },
  robots: { index: true, follow: true },
};

// ── THE ROOT'S METADATA IS NOW THE HUB'S, AND CARRIES NO PAPER KEYWORDS ─────
// The APM keyword set, canonical and og:url MOVED WHOLESALE to app/acca/apm/page.tsx with
// the content. Leaving them here would set the hub competing with its own spoke for the
// terms the spoke exists to rank for — two URLs, one intent, and the weaker page usually
// wins the toss. The hub targets brand and method language instead; ACCA-level terms are
// the pillar's (/acca) and paper terms are the spokes'.
const HUB_METADATA: Metadata = {
  title: 'Gradd — Taught, Not Just Marked | ACCA & IB AI Tutor',
  description:
    'Anything can mark an answer. Gradd tells you why it lost the mark and coaches the fix — ACCA Strategic Professional and IB Diploma.',
  keywords: [
    'Gradd',
    'AI tutor',
    'exam coaching',
    'taught not just marked',
    'ACCA tutor',
    'IB tutor',
  ],
  alternates: { canonical: 'https://gradd.ai/' },
  openGraph: {
    title: 'Gradd — Taught, Not Just Marked',
    description:
      'Anything can mark an answer. Gradd tells you why it lost the mark and coaches the fix — ACCA and IB.',
    url: 'https://gradd.ai/',
    siteName: 'Gradd',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Gradd — Taught, Not Just Marked',
    description:
      'Anything can mark an answer. Gradd tells you why it lost the mark and coaches the fix — ACCA and IB.',
  },
  robots: { index: true, follow: true },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  return (await resolveIsIB(host)) ? HUB_METADATA : LC_METADATA;
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const h = await headers();
  const host = h.get('host') ?? '';
  const onGraddAi = await resolveIsIB(host);   // HOST question — the one thing this answers

  // ── gradd.ai — the hub ─────────────────────────────────────────────────────
  if (onGraddAi) {
    const sp = await searchParams;
    const productParam = typeof sp.product === 'string' ? sp.product : null;

    // Referer is read as a PATH only. A full off-site URL says nothing about which of our
    // products the visitor wants, and treating a random external referrer as a signal is
    // how a router starts inventing intent.
    let referrerPath: string | null = null;
    const ref = h.get('referer');
    if (ref) {
      try {
        const u = new URL(ref);
        if (u.host === host) referrerPath = u.pathname;
      } catch { /* unparseable referer → no signal, which is the correct reading */ }
    }

    const intent = resolveProductIntent({ host, productParam, referrerPath });

    // Evidenced intent → go there. Unknown → render the hub and ASK. `LC` cannot be
    // reached on this host (resolveProductIntent only returns it for gradd.ie), but the
    // guard is explicit rather than assumed: a router that silently cannot produce one of
    // its own return values is one refactor away from a wrong redirect.
    if (intent.product === 'ACCA' || intent.product === 'IB') {
      redirect(PRODUCT_HOME[intent.product]);
    }

    return <HubLandingPage />;
  }

  // gradd.ie — LC Business. Preserve the existing logged-in→/dashboard behaviour.
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_status')
      .eq('id', user.id)
      .single();

    const status = profile?.subscription_status;
    if (status === 'active' || status === 'trialing') {
      redirect('/go');
    }
  }

  return <LandingPage />;
}
