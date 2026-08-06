// app/acca/afm/page.tsx
// PUBLIC, no-auth AFM marketing landing (same pattern as /acca/resit and /acca/subscribe).
// AFM lives on gradd.ai; metadata is host-aware per GRADD_BUILD_HARDENING rule 10 (the URL
// base is resolved from the runtime host, never a build-time constant).
//
// ── RENDERS THE APPROVED SPOKE PAGE, 2026-08-06 (`feat/afm-acca-landing-config`) ─────────
// This route used to render `ProductLandingPage` + `AFM_LANDING` — the generalised template.
// It now renders the SAME component `/acca/apm` does (`ACCALandingPage`), driven by AFM's own
// config. That closes the standing requirement in `docs/AFM_SURFACED.md:159`: AFM has the same
// look and feel as APM, and it got there by sharing the approved page rather than by a second
// implementation agreeing with the first.
//
// ⚠️ THE ARGUMENT AND THE FIGURES ARE AFM'S OWN, NOT APM'S. APM is "not a knowledge test, a
// judgement paper"; AFM is an EXECUTION test — its own five examiner reports say the arithmetic
// is usually competent and precision under a clock is what fails. 63 drills, 5 practice cases,
// AFM Mock Paper 1, AFM's own blind-run proof story. Every figure is re-verified against the DB
// in the config's header block; nothing is inherited from the APM page.
//
// ⚠️ `AFM_LANDING` (product-landing-config.ts) IS NO LONGER RENDERED BY ANY ROUTE, the same
// disposition `APM_LANDING` already has. It is KEPT because `scripts/test-product-landing.ts`
// renders it as the template's real-config exercise, and because `/acca/afm/proof` still reads
// `AFM_LANDING.freeCta` / `.footnote`. Anything asserted about it is a claim about the
// TEMPLATE, never a claim about what a visitor to this URL sees.
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import ACCALandingPage from '@/components/landing/ACCALandingPage';
import { AFM_ACCA_LANDING, withAccaDynamicCta } from '@/components/landing/acca-landing-config';
import { resolveEntitlementCta } from '@/lib/acca/entitlement-cta';
import { createServerClient, createServiceClient } from '@/lib/supabase/server';

const TITLE = 'ACCA AFM Practice — Taught, Not Just Marked | Gradd';
// 63 verified against the DB (exam_board='ACCA', paper_code='AFM', status='approved',
// published=true) 06/08/2026 — re-queried this session, see the verification note on
// AFM_ACCA_LANDING. This line quotes the config's copy, not a separate number, and must move
// with it.
const DESCRIPTION =
  'AFM drills that mark like the examiner and coach the fix. 63 exam-style drills, 5 practice cases and a live timed mock — free to start, no card.';

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

export default async function AFMLandingRoute() {
  // Entitlement-aware CTA — DEFENSIVE at every layer. resolveEntitlementCta() never throws
  // and never redirects on its own; this try/catch is a second, page-level backstop so that
  // even a client-construction failure (e.g. a missing env var) cannot take down a public
  // marketing page. Any failure at all renders the exact page an anonymous visitor sees.
  let config = AFM_ACCA_LANDING;
  try {
    const cta = await resolveEntitlementCta({
      authClient: await createServerClient(),
      dbClient: createServiceClient(),
      thisPaper: 'AFM',
      otherPaper: 'APM',
      anonymous: AFM_ACCA_LANDING.freeCta,
      entitledOtherLabel: 'Add AFM for your sitting',
      dashboardHref: '/acca?paper=AFM',
    });
    if (cta.state !== 'anonymous') {
      config = withAccaDynamicCta(AFM_ACCA_LANDING, cta);
    }
  } catch {
    // config stays AFM_ACCA_LANDING — the anonymous render.
  }

  return <ACCALandingPage config={config} />;
}
