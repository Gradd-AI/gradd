// app/acca/afm/page.tsx
// PUBLIC, no-auth AFM marketing landing (same pattern as /acca/resit and /acca/subscribe).
// AFM lives on gradd.ai; metadata is host-aware per GRADD_BUILD_HARDENING rule 10 (the URL
// base is resolved from the runtime host, never a build-time constant).
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import ProductLandingPage from '@/components/landing/ProductLandingPage';
import { AFM_LANDING } from '@/components/landing/product-landing-config';

const TITLE = 'ACCA AFM Practice — Taught, Not Just Marked | Gradd';
const DESCRIPTION =
  'AFM drills that mark like the examiner and coach the fix. 16 exam-style drills live across advanced investment appraisal and financing — NPV, IRR/MIRR, APV and cost of capital — new drills weekly. Free to start, no card.';

export async function generateMetadata(): Promise<Metadata> {
  const host = (await headers()).get('host') ?? 'gradd.ai';
  const base = host.includes('gradd.ie') ? 'https://gradd.ie' : 'https://gradd.ai';
  const url = `${base}/acca/afm`;
  return {
    title: TITLE,
    description: DESCRIPTION,
    keywords: [
      'ACCA AFM tutor',
      'ACCA AFM',
      'Advanced Financial Management',
      'AFM P4 tutor',
      'AFM exam practice',
      'ACCA AFM drills',
      'APV cost of capital practice',
      'ACCA Strategic Professional',
    ],
    alternates: { canonical: url },
    openGraph: { title: TITLE, description: DESCRIPTION, url, siteName: 'Gradd', type: 'website' },
    twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
    robots: { index: true, follow: true },
  };
}

export default function AFMLandingRoute() {
  return <ProductLandingPage config={AFM_LANDING} />;
}
