// components/landing/product-landing-sections.ts
// WHICH SECTIONS DOES THIS CONFIG RENDER, AND WHAT DOES THE STRUCTURED DATA SAY?
//
// PURE. No React, no next/*, no I/O — so the decisions can be fixtured directly
// (`npm run test:product-landing`) rather than by scraping rendered HTML.
//
// ── WHY THIS IS A SEPARATE MODULE FROM THE COMPONENT ────────────────────────
// The property that matters most about the generalised template is NEGATIVE: an omitted
// section must render NOTHING — not an empty heading, not a bare container with a border.
// That is exactly the kind of thing a component test asserts badly (a container with no
// children still "renders") and a pure predicate asserts precisely.
//
// So the component asks THIS module what to render, and the fixtures ask the same module
// the same question. There is one answer, not two that can drift — the same discipline as
// `sitCaseGate`, where the route builds its query by iterating the gate object the fixtures
// read.

import {
  DEFAULT_PRICING_HEADING,
  type ProductLandingConfig,
  type PricingTier,
  type NavLink,
} from './product-landing-config';

/** Every optional section the template knows how to render, in render order. */
export const OPTIONAL_SECTIONS = [
  'sections',
  'mockups',
  'steps',
  'judgement',
  'compareStrip',
  'secondaryCta',
  'pricingTiers',
  'faqs',
  'finalCta',
  'heroMeta',
  'backToTop',
  'stickyHeaderShadow',
] as const;
export type OptionalSection = (typeof OPTIONAL_SECTIONS)[number];

/** The footer's original link set — Terms / Privacy / ACCA APM — used whenever a config
 *  sets no `footerLinks`. This is exactly what the footer has always rendered, so AFM
 *  (which sets no `footerLinks`) is unaffected by `footerLinks` existing at all. */
export const DEFAULT_FOOTER_LINKS: NavLink[] = [
  { label: 'Terms', href: '/terms' },
  { label: 'Privacy', href: '/privacy' },
  { label: 'ACCA APM', href: '/acca/apm' },
];

/**
 * Is this optional section present AND non-empty?
 *
 * AN EMPTY ARRAY COUNTS AS ABSENT, and that is the load-bearing half. `faqs: []` is the
 * shape a config ends up in when someone strips the content but leaves the key — and
 * rendering a "Questions, answered." heading above nothing, plus a FAQPage JSON-LD block
 * declaring zero questions, is worse than rendering neither. Structured data asserting an
 * empty list is a claim about the page that is not true.
 */
export function hasSection(c: ProductLandingConfig, section: OptionalSection): boolean {
  switch (section) {
    case 'sections':     return (c.sections?.length ?? 0) > 0;
    case 'mockups':      return (c.mockups?.length ?? 0) > 0;
    case 'steps':        return (c.steps?.length ?? 0) > 0;
    // Requires all three cards, not just a heading — a judgement card missing its
    // coached rewrite is not a judgement card, it's a broken one.
    case 'judgement':
      return !!c.judgement?.heading &&
        !!c.judgement?.weak?.body && !!c.judgement?.diagnosis?.body && !!c.judgement?.coached?.body;
    case 'compareStrip': return !!c.compareStrip?.heading && (c.compareStrip?.columns?.length ?? 0) > 0;
    case 'secondaryCta': return !!c.secondaryCta?.heading && !!c.secondaryCta?.cta?.href;
    case 'pricingTiers': return (c.pricingTiers?.length ?? 0) > 0;
    case 'faqs':         return (c.faqs?.length ?? 0) > 0;
    case 'finalCta':     return !!c.finalCta?.heading && (c.finalCta?.ctas?.length ?? 0) > 0;
    case 'heroMeta':     return (c.heroMeta?.length ?? 0) > 0;
    case 'backToTop':          return c.chrome?.backToTop === true;
    case 'stickyHeaderShadow': return c.chrome?.stickyHeaderShadow === true;
  }
}

/** Every optional section this config renders, in render order. */
export function visibleSections(c: ProductLandingConfig): OptionalSection[] {
  return OPTIONAL_SECTIONS.filter((s) => hasSection(c, s));
}

/** True when the config uses ONLY the required fields — the AFM shape. */
export function isMinimalConfig(c: ProductLandingConfig): boolean {
  return visibleSections(c).length === 0;
}

// ── Pricing ─────────────────────────────────────────────────────────────────
export type PricingModel =
  | { mode: 'simple'; heading: string; free: string; paid: string }
  | { mode: 'tiers'; heading: string; tiers: PricingTier[] };

/**
 * Which pricing block renders.
 *
 * `pricing` stays REQUIRED and `pricingTiers` overrides it, rather than the two being a
 * union. Two reasons, and the second is the one that matters: an existing config keeps
 * working untouched, and there is always a fallback if a tiers array is emptied — the page
 * degrades to a correct simple card instead of rendering no price at all. A pricing section
 * that silently disappears is the worst failure this template could have.
 */
export function pricingModel(c: ProductLandingConfig): PricingModel {
  const heading = c.pricingHeading ?? DEFAULT_PRICING_HEADING;
  if (hasSection(c, 'pricingTiers')) {
    return { mode: 'tiers', heading, tiers: c.pricingTiers! };
  }
  return { mode: 'simple', heading, free: c.pricing.free, paid: c.pricing.paid };
}

// ── FAQPage JSON-LD ─────────────────────────────────────────────────────────
export interface FaqJsonLd {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: Array<{
    '@type': 'Question';
    name: string;
    acceptedAnswer: { '@type': 'Answer'; text: string };
  }>;
}

/**
 * The FAQPage payload, or NULL when there are no FAQs.
 *
 * Returning null rather than an empty-mainEntity object is deliberate: emitting
 * `"mainEntity": []` tells a crawler this page IS an FAQPage with no questions, which is a
 * false statement about the page and the kind of structured-data error that costs a rich
 * result. The caller renders no <script> at all on null.
 *
 * Built from the SAME `faqs` array the visible list renders, so the structured data cannot
 * drift from the on-page copy — the property ACCALandingPage already relies on.
 */
export function buildFaqJsonLd(c: ProductLandingConfig): FaqJsonLd | null {
  if (!hasSection(c, 'faqs')) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: c.faqs!.map((f) => ({
      '@type': 'Question' as const,
      name: f.q,
      acceptedAnswer: { '@type': 'Answer' as const, text: f.a },
    })),
  };
}

// ── Points grid ─────────────────────────────────────────────────────────────
/**
 * The grid template for the points row.
 *
 * FIXES A REAL DEFECT: the CSS hardcoded `repeat(3, 1fr)`, so `points[]` could not be any
 * length but three — four points produced a broken second row of one, two produced two
 * stretched cards. A config array whose length the layout silently constrains is a trap,
 * and nothing in the type said so.
 *
 * `auto-fit` + a min track sizes to whatever it is given. For THREE points at the template's
 * 920px width the computed result is three equal columns — identical to the old rule, which
 * is what keeps AFM byte-identical.
 */
export const POINTS_GRID_TEMPLATE = 'repeat(auto-fit, minmax(240px, 1fr))';
