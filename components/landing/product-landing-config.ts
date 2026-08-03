// components/landing/product-landing-config.ts
// THE PARAMETERISED PRODUCT LANDING. A paper is a config file, not a page.
//
// ── WHAT THIS IS NOW (rewritten 2026-08-03) ─────────────────────────────────
// The header here used to read "Deliberately MINIMAL — only the fields the AFM page needs
// today; no speculative surface." That was the right call when AFM was the only consumer,
// and it stopped being true the moment the template had to express a full launch page.
// Scoped against ACCALandingPage, the minimal template could render roughly the hero and a
// points grid: SEVEN of its fourteen sections had no equivalent at all, including every
// section that does commercial work — the pricing tiers, the FAQ, the resit-funnel entry.
//
// It now covers all of them. The required fields are unchanged, so an existing config keeps
// working untouched; everything added is OPTIONAL, and an omitted field renders NOTHING —
// not an empty heading, not a bare container. That property is what makes a sparse config
// (AFM today) and a full one (APM later) the same template rather than two.
//
// ── THE RULE THAT KEEPS IT HONEST ───────────────────────────────────────────
// The CONFIG carries content; the TEMPLATE carries layout. If a paper needs a section shaped
// differently from every other paper, that is a signal the section is really bespoke — add
// it here only when a second paper would use the same shape. The alternative (a config field
// per visual variant) is how a template becomes a worse version of writing the page.
//
// ── NOT CONVERTED IN THIS CHANGE-SET, DELIBERATELY ──────────────────────────
// AFM_LANDING below is UNTOUCHED and AFM renders byte-identically. ACCALandingPage is
// untouched and APM keeps its bespoke page. Converting either is a separate change-set so a
// visual regression is attributable to the conversion rather than to the template.

/** One card in the points grid. Any number of them — see `pointsGridStyle`. */
export interface LandingPoint { title: string; body: string }

/** A pricing card. `pricingTiers` replaces the simple two-line card when present. */
export interface PricingTier {
  name: string;                 // 'Free' | '90-day exam pass' | 'Monthly'
  amount: string;               // '€0' | '€99' — rendered as-is, currency included
  period?: string;              // 'one-time · 90 days' | '/month'
  tagline: string;
  features: string[];
  cta: { label: string; href: string };
  badge?: string;               // 'Best for one sitting'
  featured?: boolean;           // visual emphasis; at most one should set it
}

export interface LandingFaq { q: string; a: string }

/** A full-width band with its own call to action — the resit-funnel entry on APM. */
export interface SecondaryCtaBand {
  eyebrow?: string;
  heading: string;
  body?: string;
  cta: { label: string; href: string };
}

/** An ORDERED sequence. The array index is the step number; the template numbers them, so
 *  a config must never hardcode "1." into a title. */
export interface LandingStep { title: string; body: string }

/** The weak / diagnosis / coached comparison. `tone` drives colour only. */
export interface ComparisonColumn {
  label: string;
  tone?: 'weak' | 'neutral' | 'strong';
  items: string[];
}
export interface LandingComparison {
  eyebrow?: string;
  heading: string;
  intro?: string;
  columns: ComparisonColumn[];
}

/** A rendered mock-up. Two shapes, because the two on APM are genuinely different objects:
 *  a CHAT transcript and a MARKING panel. `kind` selects the renderer; the other shape's
 *  fields are simply absent. */
export interface LandingMockup {
  kind: 'chat' | 'panel';
  ariaLabel: string;                                   // required — these are role="img"
  title?: string;
  subtitle?: string;
  /** kind:'chat' — an alternating transcript. */
  turns?: { role: 'student' | 'tutor'; lines: string[] }[];
  /** kind:'panel' — labelled rows with a verdict chip. */
  rows?: { label: string; verdict?: string; body: string }[];
  footer?: string;
}

export interface FinalCta {
  pill?: string;
  heading: string;
  body?: string;
  ctas: { label: string; href: string; variant?: 'primary' | 'ghost' }[];
}

export interface NavLink { label: string; href: string }

export interface ProductLandingConfig {
  // ── REQUIRED. Unchanged from the original contract, so existing configs keep working. ──
  paper: string;          // e.g. 'AFM'
  examName: string;       // e.g. 'Advanced Financial Management'
  eyebrow: string;
  headline: string;
  subhead: string;
  coverage: string;       // the EXACT, honest coverage claim — no breadth implication
  points: LandingPoint[];
  pricing: { free: string; paid: string };
  freeCta: { label: string; href: string };
  footnote: string;
  proof?: { label: string; href: string };  // optional link to a real walkthrough proof page

  // ── OPTIONAL. Omit the field and the section does not render AT ALL. ──────
  /** Extra links in the sticky header, between the proof link and the CTA. */
  nav?: NavLink[];

  /** Heading above the pricing block. Defaults to the string the template has always
   *  rendered, so an existing config is unaffected. See DEFAULT_PRICING_HEADING. */
  pricingHeading?: string;

  /** Multi-tier pricing. When present it REPLACES the simple `pricing` card. `pricing`
   *  stays required so no existing config breaks and so there is always a fallback. */
  pricingTiers?: PricingTier[];

  /** Feeds BOTH the visible list and the FAQPage JSON-LD, from one array, so the structured
   *  data can never drift from the on-page copy. */
  faqs?: LandingFaq[];

  /** A CTA band between sections — the resit-funnel entry on APM. */
  secondaryCta?: SecondaryCtaBand;

  /** An ordered how-it-works sequence. */
  steps?: LandingStep[];
  stepsHeading?: string;

  /** The comparison block. */
  comparison?: LandingComparison;

  /** Rendered mock-ups (the Ezra chat, the professional-skills mark panel). */
  mockups?: LandingMockup[];

  /** The closing CTA section. */
  finalCta?: FinalCta;

  /** Client-side chrome. Both default to FALSE: a template that silently adds interactive
   *  furniture to every page is a template that changed a page nobody asked it to change. */
  chrome?: {
    backToTop?: boolean;
    stickyHeaderShadow?: boolean;
  };
}

/** The pricing heading the template has rendered since it was built. Kept as the DEFAULT so
 *  AFM's output is byte-identical after this change.
 *
 *  ⚠️ IT IS ALSO NOW FALSE. Per-paper pricing was ruled 2026-08-03 — APM and AFM are sold
 *  separately — so "One pass covers every ACCA paper" is a bundle claim the product no
 *  longer honours. It is preserved here ONLY because this change-set is forbidden from
 *  altering AFM's rendering, and changing a default silently changes AFM. Fix it by setting
 *  `pricingHeading` on AFM_LANDING in the conversion change-set, or sooner if that claim
 *  should not be live for another day. Recorded rather than quietly corrected. */
export const DEFAULT_PRICING_HEADING = 'Free to start. One pass covers every ACCA paper.';

// AFM — early-access honest. Coverage states EXACTLY what is live (16 drills, four
// calculators). CTA threads ?paper=AFM through the existing auth flow so the post-signup
// dashboard lands on AFM (the first-run banner then handles the first drill).
export const AFM_LANDING: ProductLandingConfig = {
  paper: 'AFM',
  examName: 'Advanced Financial Management',
  eyebrow: 'ACCA AFM · early access',
  headline: 'AFM practice that shows you why answers lose marks',
  subhead:
    'Ezra marks your working like the examiner, diagnoses the exact gap — a mismatched discount rate, an un-stripped debt, a calculation that never became advice — then coaches the fix, drill by drill.',
  coverage:
    '16 exam-style drills live across advanced investment appraisal and financing — NPV, IRR/MIRR, APV and cost of capital. New drills weekly.',
  points: [
    {
      title: 'Diagnosis, not hints',
      body: 'Ezra names the mark you lost and why, then coaches the correct move — the jump from a computed figure to advice a board could act on, which is where AFM answers actually fail.',
    },
    {
      title: 'Numbers checked by code',
      body: 'Every figure and every accept/reject verdict is computed and verified deterministically, so the marking is exact. You practise against the right answer, not an approximation.',
    },
    {
      title: 'Early access, stated honestly',
      body: 'AFM is new here: 16 drills live now across the appraisal and financing core, more every week. You see exactly what is covered — no padding, no “complete syllabus” claim.',
    },
  ],
  pricing: {
    free: 'Free to start — every live AFM drill, with Ezra teach-throughs. No card required.',
    paid: 'One ACCA pass covers every paper you sit: APM and AFM together, one subscription.',
  },
  freeCta: {
    label: 'Start free — every live drill',
    href: `/acca/auth?next=${encodeURIComponent('/acca?paper=AFM')}`,
  },
  footnote: 'Gradd is not affiliated with or endorsed by ACCA. Scenarios are original works built to the public syllabus structure.',
  proof: { label: 'See a real walkthrough', href: '/acca/afm/proof' },
};
