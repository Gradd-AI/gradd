// app/acca/apm/page.tsx
// The APM spoke. This IS the page that used to live at the gradd.ai root — the component
// is rendered unchanged and the metadata below is the root's APM_METADATA moved verbatim,
// with only the canonical and og:url repointed from `/` to `/acca/apm`.
//
// ── THE MOVE IS DELIBERATELY A MOVE, NOT A REWRITE ──────────────────────────
// ACCALandingPage is ~1,150 lines carrying the resit-funnel band, the Ezra chat mock-up,
// the teach-through sequence, the professional-skills mark panel, the comparison block,
// three pricing tiers and the FAQ + FAQPage JSON-LD. `ProductLandingPage` (the AFM
// template) can express roughly the hero and a 3-up points grid — 7 of those 14 sections
// have no template equivalent at all, including every section that does commercial work.
// Generalising the template was scoped and explicitly ruled OUT of this pass; that is the
// expensive job and it is severable from the restructure.
//
// ── SEO: THIS PAGE INHERITS THE APM RANKING SIGNAL ──────────────────────────
// The root was the highest-priority indexed URL (sitemap 1.0) and held the APM keyword
// set. Both move here with the content — canonical, og:url, keywords, title, description —
// so the signal follows the content rather than being stranded on a hub that no longer
// mentions APM. `app/sitemap.ts` lists this at priority 1.0 and the hub separately.
import type { Metadata } from 'next';
import ACCALandingPage from '@/components/landing/ACCALandingPage';

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

export default function APMSpokePage() {
  return <ACCALandingPage />;
}
