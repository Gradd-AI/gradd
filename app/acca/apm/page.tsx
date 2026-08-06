// app/acca/apm/page.tsx
// The APM spoke. This renders the BESPOKE `ACCALandingPage` component again — the template
// conversion (`59034bf`) is reverted here by ruling, after both pages were put side by side.
//
// ── WHY THE BESPOKE PAGE WON, ON THE RECORD ────────────────────────────────
// Grant's ruling, 2026-08-05, having compared `/acca/apm` (template) against `/old-apm`
// (this component) at desktop and 390px:
//   · the bespoke hero runs at DISPLAY scale with the rust underline under the italic and
//     owns the first screen; the template hero is one flat line with the artefact pushed
//     into dead space;
//   · the template rendered the Ezra chat TWICE (hero artefact AND feature artefact);
//   · the template put the judgement card on a dark band, where it competed with the final
//     CTA for the page's one dark moment;
//   · the template clipped the big-number subheads;
//   · this page was already COMPOSED — sage after the hero, sage for professional skills,
//     forest only at the close — and its mobile work was already done.
// The comparison ruler (`compare:apm-landing`) read zero because it probed for the PRESENCE
// of elements, not for their composition. Presence was never the thing in question.
//
// ── WHAT CAME BACK WITH IT, AND WHAT DID NOT ───────────────────────────────
// ONE thing was ported forward from the template: the comparison TABLE, which replaces this
// page's three flat `.compare-strip` cards. Same content, `.acca-lp`'s own idiom, and the
// overflow-driven scroll hint (`ScrollableHint`) rather than a breakpoint-gated one. The
// template's big-number band was deliberately NOT ported — that is a separate ruling.
//
// ⚠️ THE ENTITLEMENT-AWARE CTA IS NOT ON THIS PAGE. `resolveEntitlementCta` +
// `withDynamicCta` (added in `812af49`, AFTER the template conversion, so this component
// never carried it) swapped the primary CTA for a signed-in visitor — "Continue" for an
// entitled student, "Add APM for your sitting" for one entitled on AFM only. Restoring this
// component drops that on APM; `/acca/afm` is UNAFFECTED and keeps it. Re-adding it here
// means giving this component a CTA prop, which is more than the compare-table port this
// change-set is scoped to. Flagged for ruling rather than done silently.
//
// ── SEO: THIS PAGE INHERITS THE APM RANKING SIGNAL ──────────────────────────
// The root was the highest-priority indexed URL (sitemap 1.0) and held the APM keyword
// set. Both move here with the content — canonical, og:url, keywords, title, description —
// so the signal follows the content rather than being stranded on a hub that no longer
// mentions APM. `app/sitemap.ts` lists this at priority 1.0 and the hub separately.
// The metadata block below is UNCHANGED by the revert: it was never template-specific.
//
// ── THE PAGE IS NOW CONFIG-DRIVEN, AND ITS OUTPUT IS UNCHANGED ──────────────
// (2026-08-06, `feat/afm-acca-landing-config`.) `ACCALandingPage` takes a config; APM's copy
// moved verbatim into `APM_ACCA_LANDING`. STRUCTURE AND CSS STAY IN THE COMPONENT — a config
// says what the page SAYS and cannot reorder it, reband it, or invent a section type, which
// is the specific way the earlier generalised template lost this page's composition.
// The rendered body of this URL is BYTE-IDENTICAL across the extraction, proven with a
// SHA-256 over the built output before and after (69667f94…fece, 59,097 bytes).
import type { Metadata } from 'next';
import ACCALandingPage from '@/components/landing/ACCALandingPage';
import { APM_ACCA_LANDING } from '@/components/landing/acca-landing-config';

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
  return <ACCALandingPage config={APM_ACCA_LANDING} />;
}
