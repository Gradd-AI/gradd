// app/acca/apm/page.tsx
// The APM spoke — now rendered through the GENERALISED template, not the bespoke
// ACCALandingPage component. See feat/apm-template-conversion: APM_LANDING is a verbatim
// inventory of the retired ACCALandingPage.tsx (its content lives on in the config, not in
// a bespoke component), and `npm run compare:apm-landing` was the ruler that proved every
// element survives the move (0 of 20 probed elements lost) before this file changed.
//
// ── SEO: THIS PAGE INHERITS THE APM RANKING SIGNAL ──────────────────────────
// The root was the highest-priority indexed URL (sitemap 1.0) and held the APM keyword
// set. Both move here with the content — canonical, og:url, keywords, title, description —
// so the signal follows the content rather than being stranded on a hub that no longer
// mentions APM. `app/sitemap.ts` lists this at priority 1.0 and the hub separately.
import type { Metadata } from 'next';
import ProductLandingPage from '@/components/landing/ProductLandingPage';
import { APM_LANDING } from '@/components/landing/product-landing-config';
import { withDynamicCta } from '@/components/landing/product-landing-sections';
import { resolveEntitlementCta } from '@/lib/acca/entitlement-cta';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

const TITLE = 'ACCA APM Tutor — Taught, Not Just Marked | Gradd';
const DESCRIPTION =
  'AI tutor for ACCA APM. Diagnoses why your answer lost marks, coaches examiner thinking, marks professional skills against ACCA’s descriptors. 91 drills free. Full cases and a timed mock.';

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  // Moved verbatim from the root. These are the terms the root actually ranked for; they
  // belong wherever the APM content is.
  keywords: [
    'ACCA APM tutor',
    'ACCA APM',
    'Advanced Performance Management',
    'APM P5 tutor',
    'ACCA APM pass',
    'APM resit',
    'ACCA APM marking',
    'ACCA APM professional skills',
    'APM exam practice',
    'ACCA Strategic Professional',
  ],
  alternates: { canonical: 'https://gradd.ai/acca/apm' },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: 'https://gradd.ai/acca/apm',
    siteName: 'Gradd',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
};

export default async function APMSpokePage() {
  // Entitlement-aware CTA — same defensive pattern as app/acca/afm/page.tsx (see that file
  // for the full reasoning). Any failure at all renders exactly what an anonymous visitor
  // already sees.
  let config = APM_LANDING;
  try {
    const cta = await resolveEntitlementCta({
      authClient: await createServerClient(),
      dbClient: createServiceClient(),
      thisPaper: 'APM',
      otherPaper: 'AFM',
      anonymous: APM_LANDING.freeCta,
      entitledOtherLabel: 'Add APM for your sitting',
      dashboardHref: '/acca',
    });
    if (cta.state !== 'anonymous') {
      config = withDynamicCta(APM_LANDING, cta);
    }
  } catch {
    // config stays APM_LANDING — the anonymous render.
  }

  return <ProductLandingPage config={config} />;
}
