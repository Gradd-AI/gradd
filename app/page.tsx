// app/page.tsx
// ROOT = THE ACCA PILLAR on gradd.ai, MARKETING-ONLY (restructured 2026-08-04,
// Option B of the hub-deletion ruling):
//   gradd.ai / → ACCAPillarPage, unconditionally. No auth branch — a signed-in
//   visitor who lands on root sees the pillar too; the signed-in app lives at
//   /acca, unchanged (app/acca/page.tsx redirects an anonymous /acca visitor here
//   instead of rendering the pillar a second time, so there is exactly one public
//   ACCA marketing surface, not two).
//   gradd.ie / → LC Business landing (unchanged), with its logged-in→/dashboard redirect.
//
// ── THE HUB IS GONE, AND SO IS THE QUESTION IT EXISTED TO ASK ───────────────────
// This file used to render HubLandingPage (deleted) behind resolveProductIntent
// (lib/product-router.ts) — a router whose entire design was "return null and ASK
// when nothing evidences a product," because a hub genuinely serves two products.
// Root no longer serves two products. It IS the ACCA pillar; there is nothing left
// to guess between. `resolveProductIntent`/`PRODUCT_HOME`/`PRODUCT_SIGNUP` are NOT
// deleted — app/auth/login and app/auth/signup still depend on them to decide which
// product's AUTH FORM to render, a different question this ruling doesn't touch.
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { createServerClient } from '@/lib/supabase/server';
import LandingPage from '@/components/landing/LandingPage';
import ACCAPillarPage from '@/components/landing/ACCAPillarPage';
import { resolveIsIB } from '@/lib/site';
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

// ── ROOT'S METADATA IS NOW THE PILLAR'S, MOVED WHOLESALE FROM app/acca/page.tsx ──
// Qualification-level keywords (not the old hub's brand-only set, not a paper spoke's
// paper-specific set) — root is the "ACCA tutor" / "ACCA Strategic Professional"
// landing now, and the canonical moves from /acca to here with it.
const ACCA_METADATA: Metadata = {
  title: 'ACCA Tutor — Taught, Not Just Marked | Gradd',
  description:
    'AI tutor for ACCA Strategic Professional. APM and AFM: diagnoses why your answer lost marks, coaches examiner thinking, marks professional skills against ACCA’s descriptors. Free to start.',
  keywords: [
    'ACCA tutor',
    'ACCA Strategic Professional',
    'ACCA APM',
    'ACCA AFM',
    'ACCA exam practice',
    'ACCA resit',
    'ACCA AI tutor',
  ],
  alternates: { canonical: 'https://gradd.ai/' },
  openGraph: {
    title: 'ACCA Tutor — Taught, Not Just Marked | Gradd',
    description:
      'AI tutor for ACCA Strategic Professional. APM and AFM — taught, not just marked.',
    url: 'https://gradd.ai/',
    siteName: 'Gradd',
    type: 'website',
  },
  robots: { index: true, follow: true },
};

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? '';
  return (await resolveIsIB(host)) ? ACCA_METADATA : LC_METADATA;
}

export default async function HomePage() {
  const h = await headers();
  const host = h.get('host') ?? '';
  const onGraddAi = await resolveIsIB(host);   // HOST question — the one thing this answers

  // ── gradd.ai — the ACCA pillar, unconditionally ─────────────────────────────
  if (onGraddAi) {
    return <ACCAPillarPage />;
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
