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

/** One card inside a SECTION GROUP. Same shape as `LandingPoint` — kept as its own alias
 *  so the two call sites (the legacy flat grid and a grouped section) can diverge later
 *  without one edit silently touching the other. */
export interface LandingCard { title: string; body: string }

/**
 * A background TREATMENT, not a content type. Wraps an existing section in a full-width
 * coloured band — 'dark' is the forest band already proven by `finalCta` (`.plp-final`);
 * 'sage' is the softer green band ACCA's recovered design system also carries. Any section
 * shape below that accepts a `band` field can be placed inside one, including the EXISTING
 * `LandingSectionGroup` — the band is a class modifier on the section wrapper, not a
 * separate structural layer, so it works on old and new section kinds alike.
 */
export type LandingBand = 'dark' | 'sage';

/**
 * A SECTION GROUP: a heading-owning cluster of cards — the shape `points[]` could never be,
 * because `points[]` is one flat array with no headings of its own.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
 * ACCALandingPage has three live sections shaped exactly this way ("Taught, not just
 * marked", "The 20% most candidates never practise", "Everything the paper demands") —
 * each with its own eyebrow, heading and lead, each containing its own set of cards. Poured
 * into `points[]` they lose the heading and collapse into one undifferentiated 11-card
 * grid. `sections[]` is an array of these instead, so each group keeps its own head.
 *
 * `points[]` STAYS SUPPORTED and is unaffected: a config that sets `points` and not
 * `sections` renders exactly the flat grid it always has. A config sets ONE of the two —
 * `sections` is checked first and, when present, REPLACES the points-grid render slot.
 */
export interface LandingSectionGroup {
  eyebrow?: string;
  heading: string;
  lead?: string;
  cards: LandingCard[];
  /** An italic one-line takeaway under the cards — e.g. "The difference is not knowledge.
   *  It is application, limitation, judgement." */
  caption?: string;
  /** Places this group inside a full-width coloured band. See `LandingBand`. */
  band?: LandingBand;
}

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
 *  a config must never hardcode "1." into a title.
 *
 *  `body` is OPTIONAL (was required). APM's "how a teach-through works" steps are
 *  single-line labels with no separate body text — with `body` required, the only
 *  available value was `''`, which still rendered an empty `<p>`. Optional means the
 *  template can skip the paragraph entirely rather than render nothing inside it. */
export interface LandingStep { title: string; body?: string }

/**
 * The judgement (weak / diagnosis / coached) before-after card.
 *
 * ── SPLIT OUT OF THE OLD comparison{} (2026-08) ─────────────────────────────
 * The live page has TWO comparison-shaped sections — this one and `LandingCompareStrip`
 * below — and the old single `comparison` field could only ever hold one of them. This is
 * the three-paragraph, arrow-linked shape: a weak answer, the diagnosis of what it's
 * missing, and the coached rewrite. Each is a single label + a single paragraph, not a
 * bullet list — the old `ComparisonColumn.items: string[]` shape was a bullet list, which
 * fit the competitor strip and never fit this card.
 */
export interface LandingJudgementCard { label: string; body: string }
export interface LandingJudgement {
  eyebrow?: string;
  heading: string;
  lead?: string;
  weak: LandingJudgementCard;
  diagnosis: LandingJudgementCard;
  coached: LandingJudgementCard;
  /** e.g. "The difference is not knowledge. It is application, limitation, judgement." */
  caption?: string;
  /** Places the judgement card inside a full-width coloured band. See `LandingBand`.
   *
   * ── COMPLETES AN EXISTING GAP, NOT NEW SURFACE (feat/apm-recompose-section-vocabulary) ──
   * `app/globals.css`'s `.plp-band-dark .plp-judgement-col` override already existed before
   * this field did — ported alongside point/mockup/tier/compare-strip in the same pass, but
   * the type and the JSX wrapper were never finished, so no config could reach it. This adds
   * the missing half of a treatment the CSS was already carrying dead weight for. */
  band?: LandingBand;
}

/** The competitor comparison strip ("How it compares") — label + one line per column, no
 *  bullet list. The other half of the old `comparison{}` split. */
export interface LandingCompareColumn { label: string; body: string; featured?: boolean }
export interface LandingCompareStrip {
  eyebrow?: string;
  heading: string;
  columns: LandingCompareColumn[];
}

/** A rendered mock-up. Two shapes, because the two on APM are genuinely different objects:
 *  a CHAT transcript and a MARKING panel. `kind` selects the renderer; the other shape's
 *  fields are simply absent. */
export interface LandingMockup {
  kind: 'chat' | 'panel';
  ariaLabel: string;                                   // required — these are role="img"
  title?: string;
  subtitle?: string;
  /** kind:'chat' — an alternating transcript. `badge` renders a small label above a turn's
   *  message — e.g. "Hint" — before its lines. */
  turns?: { role: 'student' | 'tutor'; lines: string[]; badge?: string }[];
  /** kind:'panel' — labelled rows with a verdict chip. */
  rows?: { label: string; verdict?: string; body: string }[];
  /** kind:'chat' — the input-row placeholder, e.g. "Reply to Ezra…". Renders the input row
   *  only when set; omitted, the mock-up ends at its last turn as it always has. */
  inputPlaceholder?: string;
  footer?: string;
  /** An italic one-line caption under the WHOLE mock-up — e.g. the hero visual's "The
   *  answer stays sealed. Ezra teaches until your answer is strong enough to score." */
  caption?: string;
}

// ── SECTION VOCABULARY EXTENSION (feat/landing-section-vocabulary) ──────────
// The IB landing page (`IBLandingPage.tsx`, hand-authored, no config) alternates section
// TYPES and background bands; every ProductLandingPage section before this point renders as
// a bordered card in a three-up grid — same box, same weight, same colour, regardless of
// paper. These five shapes port IB's proven vocabulary into the config contract so a future
// page CAN vary weight and rhythm. Nothing below is wired into AFM_LANDING or APM_LANDING
// in this change-set — see the file header. Adding it to a config is a separate decision.

/** The .trust stat strip — a thin bordered band under the hero, not a card. IB's reference
 *  shape carries 3-5 stats; the template does not enforce the count. */
export interface LandingStatBarItem { value: string; label: string }
export interface LandingStatBar {
  label?: string;
  stats: LandingStatBarItem[];
  band?: LandingBand;
}

/** Enormous italic-serif figures separated by rules, no cards — the main weight-variety
 *  device the template lacked before this change (every other section is a bordered box).
 *  IB's reference shape is exactly three; the template does not enforce the count. */
export interface LandingBigNumberItem { value: string; body: string }
export interface LandingBigNumbers {
  eyebrow?: string;
  heading?: string;
  items: LandingBigNumberItem[];
  band?: LandingBand;
}

/**
 * A full-width split section: copy on one side, a mock-up on the other, with its OWN
 * eyebrow/heading/lead — the framing a `mockups[]` entry never gets on its own (there it
 * renders as a small boxed artefact mid-scroll with no heading). Reuses `LandingMockup`
 * rather than inventing a second artefact shape, so the chat/panel renderer stays the one
 * place that knows how to draw a transcript or a marking panel.
 */
export interface LandingFeatureArtefact {
  eyebrow?: string;
  heading: string;
  lead?: string;
  bullets?: string[];
  mockup: LandingMockup;
  /** Mock-up on the left, copy on the right. Defaults to copy-first (mock-up on the right). */
  reverse?: boolean;
  band?: LandingBand;
}

/**
 * A real comparison TABLE — a row of feature labels, N competitor columns, one of which may
 * be `featured` (the highlighted Gradd column). Distinct from `LandingCompareStrip`, which is
 * a flat strip of one paragraph per column with no shared row structure across columns.
 * `columns[i].values` is positional against `rowLabels` — `values[j]` is that column's answer
 * for `rowLabels[j]`. A boolean cell renders as a yes/no glyph; a string renders as-is.
 */
export interface LandingCompareTableColumn {
  label: string;
  values: (string | boolean)[];
  featured?: boolean;
}
export interface LandingCompareTable {
  eyebrow?: string;
  heading?: string;
  rowLabels: string[];
  columns: LandingCompareTableColumn[];
  band?: LandingBand;
}

export interface FinalCta {
  pill?: string;
  heading: string;
  body?: string;
  ctas: { label: string; href: string; variant?: 'primary' | 'ghost' }[];
  /** A small uppercase line under the CTAs — e.g. the pricing + guarantee summary
   *  ("Every drill free · €99 for 90 days or €49/month · 14-day money-back guarantee"). */
  fineprint?: string;
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

  /** A small line under the pricing block — e.g. "14-day money-back guarantee." Renders
   *  under whichever pricing mode (simple card or tier grid) is active. */
  pricingNote?: string;

  /** Feeds BOTH the visible list and the FAQPage JSON-LD, from one array, so the structured
   *  data can never drift from the on-page copy. */
  faqs?: LandingFaq[];

  /** A CTA band between sections — the resit-funnel entry on APM. */
  secondaryCta?: SecondaryCtaBand;

  /** An ordered how-it-works sequence. */
  steps?: LandingStep[];
  stepsHeading?: string;

  /**
   * SECTION GROUPS — headed clusters of cards. See `LandingSectionGroup`.
   * When present (non-empty), REPLACES the flat `points[]` grid in that same render slot.
   * `points[]` stays required and stays supported: a config that sets `points` and not
   * `sections` is unaffected — this is how AFM_LANDING renders byte-identically.
   */
  sections?: LandingSectionGroup[];

  /** The judgement (weak/diagnosis/coached) before-after card. Split out of the old
   *  `comparison{}` — see `LandingJudgement`. */
  judgement?: LandingJudgement;

  /** The competitor comparison strip. The other half of the old `comparison{}` split — see
   *  `LandingCompareStrip`. */
  compareStrip?: LandingCompareStrip;

  /** Rendered mock-ups (the Ezra chat, the professional-skills mark panel). */
  mockups?: LandingMockup[];

  /** A second hero microcopy line, under the primary CTA row — e.g. "Resit diagnosis:
   *  free, 3 minutes, no sign-up. Drills: free to start with a quick email sign-in." */
  heroMicrocopy?: string;

  /** A row of short meta badges under the hero copy, dot-separated — e.g. ["Every drill
   *  free", "No card to start", "Upgrade for cases, marking and mock"]. Empty/omitted
   *  renders nothing, same discipline as every other array-shaped optional section. */
  heroMeta?: string[];

  /** The closing CTA section. */
  finalCta?: FinalCta;

  /** Footer links, in order. Defaults to the template's original Terms / Privacy / ACCA APM
   *  set (see DEFAULT_FOOTER_LINKS in product-landing-sections.ts) when omitted — that
   *  default is exactly what the footer has always rendered, so AFM is unaffected. An href
   *  starting with "mailto:" renders as a plain anchor rather than a Next `Link`. */
  footerLinks?: NavLink[];

  /** Client-side chrome. Both default to FALSE: a template that silently adds interactive
   *  furniture to every page is a template that changed a page nobody asked it to change. */
  chrome?: {
    backToTop?: boolean;
    stickyHeaderShadow?: boolean;
  };

  // ── SECTION VOCABULARY EXTENSION (feat/landing-section-vocabulary) — see the interfaces
  // above for the full rationale. All five are new surface; AFM_LANDING/APM_LANDING set
  // none of them in this change-set.

  /** A mock-up rendered BESIDE the hero copy, the way IB's hero carries a chat preview.
   *  Reuses `LandingMockup` — the same chat/panel renderer `mockups[]` already has. */
  heroArtefact?: LandingMockup;

  /** The trust/stat strip under the hero. */
  statBar?: LandingStatBar;

  /** Full-width split copy/mock-up sections — the framing a chat transcript or a marking
   *  panel needs and `mockups[]` alone cannot give it. */
  featureArtefacts?: LandingFeatureArtefact[];

  /** Three enormous italic-serif figures, no cards — the template's weight-variety device. */
  bigNumbers?: LandingBigNumbers;

  /** A real comparison table with a highlighted Gradd column. The other half of the old
   *  `comparison{}` split has TWO homes now: the flat `compareStrip` and this table. */
  cmpTable?: LandingCompareTable;
}

/**
 * The fallback pricing heading, used when a config sets no `pricingHeading`.
 *
 * ── DELIBERATELY PAPER-NEUTRAL, AND THAT IS THE POINT ───────────────────────
 * It used to read "Free to start. One pass covers every ACCA paper." — a BUNDLE claim, and
 * false since per-paper pricing was ruled 2026-08-03. Corrected in its own change-set
 * (`184a16b`) ahead of this one, because it was a live commercial claim.
 *
 * A DEFAULT is inherited by every config that does not override it, including configs
 * written by someone who never reads this file. So the default must be the weakest true
 * statement available, not the most persuasive one: it may not name a paper, a price, or
 * what a purchase covers, because it cannot know any of those for a future config. A paper
 * that wants to say more sets `pricingHeading` explicitly and owns the claim.
 */
export const DEFAULT_PRICING_HEADING = 'Free to start. Paid access when you need it.';

// ── AFM_LANDING v2 (feat/afm-landing-rebuild) ────────────────────────────────
// Rebuilt on the SAME section structure APM_LANDING now has — sections[], judgement,
// compareStrip, steps, mockups, pricingTiers, faqs, finalCta, chrome. Not a cut-down page.
// The ARGUMENT is AFM's own, not APM's: APM is "not a knowledge test, a judgement paper"
// (the failure is describing instead of applying/evaluating). AFM's failure catalogue —
// `docs/TEACHING_PRINCIPLES_EZRA_AFM.md`, extracted from five examiner reports (D23/J24/
// SD24/MJ25/D25) — says the opposite: "AFM candidates' arithmetic is usually competent;
// what fails is the advice, the hedging specification, and the valuation plumbing." AFM is
// a TECHNICAL paper: the failure is execution and time, not judgement.
//
// ── VERIFIED AGAINST THE DB, 2026-08-04 (not taken from the brief) ──────────────────────
// `acca_drills` — 63 published (exam_board='ACCA', paper_code='AFM', status='approved',
// published=true). Section split by lo_code prefix: A=2, B=47, E=14 — ZERO in C or D
// (M&A/reorganisation are the unbuilt "exam-ready" tier, `AFM_COVERAGE_CONTRACT.md`).
// PS-tag split: analysis_and_evaluation 51, scepticism 5, commercial_acumen 4,
// communication 3, 0 untagged.
// `acca_cases` paper_code='AFM' — 8 rows, ALL published/approved: 3 `mock_only` (Mock
// Paper 1 — Solenne Industries SA / Brecon Renewables plc / Aldebrino SpA) + 5 practice
// (Kestrel Foods plc / Halvard Marine ASA / Lindqvist Instruments AB / Tamesis Diagnostics
// plc / Castlereagh Utilities plc). So: "5 published practice cases" is exact, not rounded.
// Mock reachability — confirmed LIVE, not inferred from a doc: an unauthenticated
// `GET https://gradd.ai/api/acca/sit?paper=AFM` returned `401 {"error":"Unauthorised"}`.
// `app/api/acca/sit/route.ts`'s `APM_CASES` flag check runs BEFORE the auth check and
// returns a DISTINCT `404 {"error":"Not found"}` when the flag is off — so 401 (not 404)
// proves `APM_CASES=1` is live in production right now, not merely as of an old journal
// entry. `case-marking.ts` carries an AFM-specific `AFM_SKILL_DESCRIPTORS` set, page-
// verified from AFM's own syllabus (not APM's, resolved from an open question logged
// 25/07) — so "marked against AFM's own published descriptors" is accurate.
//
// ── THE THREE CONTENT CORRECTIONS (Grant's brief) ────────────────────────────
// 1. "16 exam-style drills live" → 63, verified above (this file previously undercounted
//    itself, not overclaimed).
// 2. "Every figure and every accept/reject verdict is computed and verified
//    deterministically, so the marking is exact" — REMOVED. The exact overclaim already
//    corrected in CLAUDE.md / AFM_COVERAGE_CONTRACT.md / PRODUCT_STRENGTH_STANDARD.md: true
//    of DRILL GENERATION, not of marking. Marking is answer-locked and model-graded — code
//    owns band→marks, the model owns the band and authors the feedback prose (measured:
//    114 of 1,518 asserted figures in that prose are owned by no schema component).
// 3. Pricing states the AFM per-paper offer only — €99 sitting-dated 90-day pass, €49/
//    month, AFM priced and sat on its own. No bundle claim anywhere on this page.
//
// ── THE THREE DO-NOT-CLAIM ITEMS (banked, `APM_MARKETING_POSITIONING.md`) ───────────────
// - Error-carried-forward: built, unwired. Nowhere on this page claims Gradd carries a
//   wrong figure forward for the student — "keep going after a wrong number" (sections[1])
//   is exam-technique coaching (ACCA's own OFR convention), not a product capability claim.
// - No AFM exam case beyond the verified 5. Every mention says "5 practice cases," never
//   "cases" unscoped, never implies section-C/D case coverage that does not exist.
// - No PS COACHING claim. The professional-skills section says Gradd MARKS the skills and
//   names the evidence — never "trains," "coaches" or "teaches" a skill, matching the
//   permitted formulation in `APM_MARKETING_POSITIONING.md`'s PS-coaching ruling. The skill
//   tiles are short definitions, not instructive coaching copy — same register as APM's
//   shipped tiles ("Structure, clarity, report style."), deliberately not "we'll teach you
//   to challenge assumptions."
//
// ── NOT INCLUDED, DELIBERATELY: `secondaryCta` ───────────────────────────────
// APM's secondaryCta is the free resit diagnostic — a real, live, free lead-gen wedge.
// `lib/acca/resit-engine.ts`'s TOPIC_GROUPS and habit questions are written in APM's own
// terms ("APM gives marks for professional skills…") — there is no AFM equivalent feature
// to link to. Inventing a band for a feature that does not exist would be the "cut-down
// page" problem in reverse (a real-looking section pointing at nothing real), so this
// section is omitted rather than faked. The mock is instead described honestly inside
// sections[2] ("What's live now") — as a PAID feature, since `hasPaperAccess` gates it
// (verified: an unentitled sit attempt surfaces a bare "Couldn't load the paper" error in
// `SitRunner`, not an upgrade prompt — not a page worth sending free traffic to directly).
export const AFM_LANDING: ProductLandingConfig = {
  paper: 'AFM',
  examName: 'Advanced Financial Management',
  eyebrow: 'ACCA AFM · Advanced Financial Management',
  pricingHeading: 'Free to start. AFM access when you need it — priced on its own.',
  headline: 'Failed AFM? The model was right. The execution wasn’t.',
  subhead:
    'AFM is not passed by learning new models — by the time you sit it, you already know them. It is passed by executing them without a slip, under a clock: the right direction, the right period, the assumption you actually developed. Gradd finds exactly where the execution broke, then Ezra coaches the fix until it stops happening.',
  coverage:
    '63 exam-style drills live across investment appraisal & financing and treasury & risk management — sections B and E, the two ACCA guarantees a question from every sitting — plus ethics & advisory (A). M&A and reorganisation (C, D) are still building. No complete-syllabus claim.',
  heroMicrocopy: 'Marked in about a minute — not a self-graded model answer or a three-day wait.',
  heroMeta: ['Every drill free', 'No card to start', 'Upgrade for cases, marking and mock'],
  // points[] stays populated (the required field), duplicating sections[0]'s cards — same
  // pattern APM_LANDING uses. sections[] is what actually renders; see hasSection precedence.
  points: [
    { title: 'Finds the exact step that broke.', body: 'Ezra doesn’t hand you the reference working — he finds precisely where your figure diverged and coaches from there. The answer stays sealed until you’ve earned it.' },
    { title: 'Marks the instruction, not just the outcome.', body: 'A hedge answer is a set of instructions to the board — direction, contract month, whole number of contracts — not just a final figure. Gradd checks every component AFM’s own examiner reports say candidates miss.' },
    { title: 'Trained on how AFM answers actually fail.', body: 'Ten minutes spent on a calculation nobody asked for. A discussion abandoned after one wrong number, when the marks after it were still earnable. An assumption listed but never developed. The exact patterns five AFM examiner reports name, coached out of you.' },
  ],
  pricing: {
    free: 'Unlimited access to all 63 drills · 3 full Ezra teach-throughs included · No card required.',
    paid: 'Then €99 for a sitting-dated AFM pass, or €49/month. AFM only — priced and sat on its own.',
  },
  freeCta: {
    label: 'Start free',
    href: `/acca/auth?next=${encodeURIComponent('/acca?paper=AFM')}`,
  },
  footnote: 'AI tutor for ACCA AFM. Gradd is not affiliated with or endorsed by ACCA. Scenarios are original works built to the public syllabus structure.',
  proof: { label: 'See a real walkthrough', href: '/acca/afm/proof' },
  nav: [
    { label: 'The approach', href: '#taught' },
    { label: 'What’s included', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    // Plain — ?subject=afm is not a recognised value on /blog (resolveSubject only
    // knows 'apm' | 'ib'); filtering on an unsupported value would silently fall through
    // to the unfiltered/IB-titled page, which is a worse and less honest link than plain.
    { label: 'Blog', href: '/blog' },
    { label: 'Sign in', href: `/acca/auth?next=${encodeURIComponent('/acca?paper=AFM')}` },
  ],
  // ── SECTION GROUPS — the fix for the old flat 3-card points[] grid. ────────
  sections: [
    {
      eyebrow: 'The approach · Taught, not just marked',
      heading: 'Taught, not just marked.',
      lead: 'AFM’s numbers are usually right — five examiner reports in a row say so. What fails is precision under a clock: an unstated direction, a wrong period, a discussion abandoned once a calculation goes wrong. Gradd finds exactly where the execution broke, and Ezra coaches the fix.',
      cards: [
        { title: 'Finds the exact step that broke.', body: 'Ezra doesn’t hand you the reference working — he finds precisely where your figure diverged and coaches from there. The answer stays sealed until you’ve earned it.' },
        { title: 'Marks the instruction, not just the outcome.', body: 'A hedge answer is a set of instructions to the board — direction, contract month, whole number of contracts — not just a final figure. Gradd checks every component AFM’s own examiner reports say candidates miss.' },
        { title: 'Trained on how AFM answers actually fail.', body: 'Ten minutes spent on a calculation nobody asked for. A discussion abandoned after one wrong number, when the marks after it were still earnable. An assumption listed but never developed. The exact patterns five AFM examiner reports name, coached out of you.' },
      ],
    },
    {
      eyebrow: 'Professional skills',
      heading: 'The marks examiners say are chronically missed.',
      lead: 'A fifth of every AFM answer is professional skills. Five examiner reports in a row flag the same gap: assumptions accepted without challenge, a director’s claim taken at face value, a stated board constraint ignored. Gradd marks them against AFM’s own published descriptors — and names the evidence.',
      cards: [
        { title: 'Communication', body: 'Structure, a decisive conclusion, report style.' },
        { title: 'Analysis & evaluation', body: 'Developed points, a recommendation that follows from your own figures.' },
        { title: 'Scepticism', body: 'Challenging assumptions, a director’s claim, a stated constraint.' },
        { title: 'Commercial acumen', body: 'Business impact, scenario-specific application.' },
      ],
      caption: 'Marked against AFM’s own published professional-skills descriptors, with the evidence named.',
    },
    {
      eyebrow: 'What’s included',
      heading: 'Built where the marks are guaranteed.',
      lead: 'Every AFM sitting draws a question from sections B and E — investment appraisal, financing, treasury and risk. That is where Gradd is built out first.',
      cards: [
        { title: '63 exam-style drills.', body: 'Live across investment appraisal & financing, treasury & risk management, and ethics & advisory — sections B, E and A. M&A and reorganisation (C, D) are next.' },
        { title: '5 practice cases.', body: 'Multi-exhibit, multi-requirement scenarios, marked as one case — not eight disconnected question marks.' },
        { title: 'Professional-skills marking.', body: 'On your whole answer, with evidence-cited feedback per skill, against AFM’s own published descriptors.' },
        { title: 'AFM Mock Paper 1.', body: 'One 50-mark case plus two 25-mark questions, sat and timed as one paper — the same clock the real exam gives you.' },
      ],
    },
  ],
  stepsHeading: 'How a teach-through works.',
  steps: [
    { title: 'Attempt the drill.' },
    { title: 'Ezra marks it against the requirement.' },
    { title: 'He names the failure mode.' },
    { title: 'You repair the answer.' },
    { title: 'Only then is the model answer revealed.' },
  ],
  // ── THE AFM PROOF STORY (differentiator #6, banked) — a real internal finding, stated
  // as ours, per the grounding caveat in APM_MARKETING_POSITIONING.md. A blind run of AFM
  // Mock Paper 1 (`docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md`): correct contract
  // count, correct sell direction, both rate-rise/rate-fall scenarios reconciling to the
  // same rate — and the candidate read that reconciliation as confirmation. It wasn’t: the
  // paper’s own self-check cannot catch an omission that applies equally to both legs. ──
  judgement: {
    eyebrow: 'The real test',
    heading: 'AFM is not a knowledge test. It is an execution test.',
    lead: 'Five AFM examiner reports in a row point at the same thing: the arithmetic is usually competent. What fails is precision under a clock — a direction never stated, a period miscounted, an assumption listed but never developed.',
    weak: {
      label: 'Near-correct answer',
      body: 'Contract count right. Sell direction right. Both the rate-rise and rate-fall scenarios reconcile to the same 4.95% — so the answer reads as confirmed.',
    },
    diagnosis: {
      label: 'Diagnosis',
      body: 'The 0.15pp unexpired basis was never subtracted from the closing futures price. The omission applies equally to both scenarios, so the candidate’s own cross-check reconciles just as cleanly at the wrong rate as at the right one.',
    },
    coached: {
      label: 'Reference answer',
      body: 'Subtracting the unexpired basis gives 4.80%, not 4.95% — a 0.15pp gap, one-to-one with the omission. Scored component by component: 2 of 7 pass; every one of the 5 failures traces to that single missed step, not five separate errors.',
    },
    caption: 'The candidate’s own self-check will not catch this. Marking has to.',
  },
  compareStrip: {
    eyebrow: 'How it compares',
    heading: 'Marked in a minute, not a self-check or a three-day wait.',
    columns: [
      { label: 'ACCA’s Practice Platform', body: 'A model answer, and you self-grade. Nothing checks whether you’d have caught your own mistake.' },
      { label: 'LearnSignal mocks', body: '€29.99 each, two per paper, PDF, tutor-marked, three-day turnaround.' },
      { label: 'Gradd', body: 'Marked in about a minute, unlimited attempts, €99 for the whole sitting.', featured: true },
    ],
  },
  mockups: [
    {
      kind: 'chat',
      ariaLabel: 'Ezra withholding a model answer while coaching an AFM requirement',
      title: 'Ezra',
      subtitle: 'ACCA AFM · Requirement (b)',
      turns: [
        { role: 'student', lines: ['The company should hedge with futures — I’ve calculated the effective rate at 4.95%.'] },
        { role: 'tutor', badge: 'Hint', lines: ['You’ve got a rate — but is it an instruction the board could act on? Buy or sell? Which contract month?'] },
        { role: 'student', lines: ['September futures, sold 96 contracts short. But the rate itself — is 4.95% not already right?'] },
        { role: 'tutor', lines: ['Check your basis period again. That’s exactly where AFM’s own examiner reports say this mark is lost.'] },
      ],
      inputPlaceholder: 'Reply to Ezra…',
      footer: 'The answer stays sealed · Ezra online 24/7',
      caption: 'The answer stays sealed. Ezra teaches until your answer is strong enough to score.',
    },
    {
      kind: 'panel',
      ariaLabel: 'Professional-skills marking panel showing evidence-cited feedback',
      title: 'Professional skills',
      rows: [
        { label: 'Scepticism', verdict: 'strong', body: '“challenged the stated 4% return target against the board’s own constraint, rather than accepting the director’s figure at face value…”' },
        { label: 'Analysis & evaluation', verdict: 'competent', body: '“states both NPV outcomes but stops short of a recommendation — the report ends without a decision…”' },
      ],
    },
  ],
  pricingTiers: [
    {
      name: 'Free',
      amount: '€0',
      tagline: 'Unlimited access to all 63 drills · 3 full Ezra teach-throughs included · No card required.',
      features: ['Every AFM drill, unlimited', '3 full teach-throughs with Ezra', 'No card, no commitment'],
      cta: { label: 'Start free', href: `/acca/auth?next=${encodeURIComponent('/acca?paper=AFM')}` },
    },
    {
      name: '90-day exam pass',
      amount: '€99',
      period: 'one-time · 90 days',
      tagline: 'Full access through your sitting — drills, cases, marking and the timed mock.',
      features: ['Unlimited teach-throughs with Ezra', '5 practice cases + professional-skills marking', 'AFM Mock Paper 1, marked as one paper', 'One payment — no recurring charge'],
      cta: { label: 'Get the 90-day pass', href: `/acca/auth?next=${encodeURIComponent('/acca/subscribe?paper=AFM')}` },
      badge: 'Best for one sitting',
      featured: true,
    },
    {
      name: 'Monthly',
      amount: '€49',
      period: '/ month',
      tagline: 'Everything in the pass, month to month.',
      features: ['Unlimited teach-throughs with Ezra', '5 practice cases + professional-skills marking', 'AFM Mock Paper 1, marked as one paper', 'Cancel any time'],
      cta: { label: 'Subscribe monthly', href: `/acca/auth?next=${encodeURIComponent('/acca/subscribe?paper=AFM')}` },
      badge: 'Flexible',
    },
  ],
  pricingNote: 'AFM only, priced on its own — no bundle, no APM add-on required.',
  faqs: [
    { q: 'Is this based on the current AFM syllabus?', a: 'Yes — S26–J27, verified against the official study guide.' },
    { q: 'How is this different from a general AI chatbot?', a: 'Structured drills and cases built from the syllabus, five years of AFM examiner failure modes, sealed reference answers, and professional-skills marking against AFM’s own published descriptors — not a chat window.' },
    { q: 'Can I use it if I failed before?', a: 'Yes — built for exactly that: finding the execution slip that lost you the marks, not just the topic.' },
    { q: 'Does it give model answers?', a: 'Yes — after you’ve attempted, been coached, and repaired your answer.' },
    { q: 'What’s free?', a: 'All 63 drills, 3 full teach-throughs, no card.' },
    { q: 'What do I pay for?', a: 'Unlimited teach-throughs, 5 practice cases, professional-skills marking, AFM Mock Paper 1.' },
  ],
  finalCta: {
    pill: 'Every drill free · No card',
    heading: 'Preparing for the next AFM sitting?',
    body: 'Start with every drill free — no card. Upgrade when you commit to the sitting.',
    ctas: [{ label: 'Start free', href: `/acca/auth?next=${encodeURIComponent('/acca?paper=AFM')}` }],
    fineprint: 'Every drill free · €99 for 90 days or €49/month · AFM only, priced on its own',
  },
  footerLinks: [
    { label: 'ACCA APM', href: '/acca/apm' },
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Cookies', href: '/cookies' },
    { label: 'Blog', href: '/blog' },
    { label: 'Contact', href: 'mailto:hello@gradd.ai' },
  ],
  chrome: { backToTop: true, stickyHeaderShadow: true },
};

// ── APM_LANDING v3 (feat/apm-recompose-section-vocabulary) ──────────────────
// v2 (below the line, superseded) ported ACCALandingPage's CONTENT onto the extended
// schema but never adopted the shapes that give a page weight variety — every section still
// rendered as an identically-bordered card in a three-up grid, same box, same weight, same
// colour, fourteen sections deep. This pass is COMPOSITION ONLY: no copy invented, every
// number re-verified (see bigNumbers below), nothing removed except two duplications this
// change-set created on purpose (mockups[] and compareStrip both retired — their content
// now lives in featureArtefacts[] and cmpTable, not deleted).
//
// ── WHAT MOVED, AND WHY ──────────────────────────────────────────────────────
// 1. heroArtefact — the Ezra chat mock-up, previously mockups[0] rendered mid-scroll with no
//    framing, now sits beside the hero copy (IB's own hero shape: copy left, live artefact
//    right). The highest-value slot on the page had nothing to look at before this.
// 2. featureArtefacts[] — BOTH mock-ups (the Ezra chat, the professional-skills panel)
//    promoted out of the small unframed mockups[] stack into full-width split sections, each
//    with its own eyebrow/heading/lead, second one reversed so they alternate sides. The chat
//    mock-up is reused verbatim as heroArtefact — a compact preview up top, the same artefact
//    given full explanatory context lower down — not two different transcripts.
// 3. Bands — sections[1] (professional skills) now sage; judgement now dark forest (see the
//    `band` field added to `LandingJudgement`, completing CSS that already existed for it).
//    Render order gives: cream (hero+approach) → sage (professional skills) → cream
//    (what's-included+artefacts+bigNumbers+steps) → dark (judgement) → cream (compare+
//    pricing+FAQ) → dark (finalCta, unchanged) — the alternation IB's page has and this one
//    lacked, not a new mechanism.
// 4. bigNumbers — three figures, each verified against a live source on 2026-08-04, not
//    carried over from existing (possibly-stale) copy:
//      · 91 — `SELECT count(*) FROM acca_drills WHERE exam_board='ACCA' AND paper_code='APM'
//        AND status='approved' AND published=true`, run live against the production DB.
//        Matches the count already asserted elsewhere on this page (sections[2], pricing).
//      · ~40% — ACCA's own published pass-rates page (accaglobal.com/gb/en/student/
//        exam-support-resources/professional-exams-study-resources/
//        pass-rates-professional-exams.html): APM's last 8 sittings (Mar 2025–Jun 2026) run
//        38/39/40/40/41/40/42/39% — "~40%" is the honest rounding, not an invented figure.
//        (`docs/APM_BLOG_SEEDS.md`'s house rule — "never invent a pass-rate %, cite the
//        official ACCA rate" — is met here; the PRE-EXISTING unsourced "consistently around
//        40%" in judgement.lead below happens to match this citation and was left as-is,
//        not rewritten, since this pass's scope is composition, not copy.)
//      · 20% — ACCA's "Professional skills in Strategic Professional options exams" guide
//        (accaglobal.com): APM has carried 80 technical + 20 professional-skills marks since
//        September 2022 → 20 of 100 = 20%. Matches sections[1]'s existing "a fifth of every
//        APM answer" claim, now with a bigNumbers citation behind it too.
// 5. cmpTable — the old compareStrip (three flat one-paragraph cards) replaced by a real
//    table, Gradd column featured, matching IB's comparison. Row facts are qualitative and
//    intentionally uncite-able-to-a-number for the two competitor columns (no invented
//    price for "human tuition" or a named question-bank provider — the original compareStrip
//    made the same choice, naming no competitor price either); every Gradd-column fact is
//    pulled from copy already live elsewhere in this config, not new claims.
//
// ── NOT CHANGED ───────────────────────────────────────────────────────────────
// No copy rewritten beyond what a section-type move required (mock-up captions unchanged, PS
// tile bodies unchanged, pricing/FAQ/finalCta untouched). AFM_LANDING renders byte-identically
// — verified by scripts/test-product-landing.ts's SHA-256 pin, unaffected by any edit here.
export const APM_LANDING: ProductLandingConfig = {
  paper: 'APM',
  examName: 'Advanced Performance Management',
  eyebrow: 'ACCA APM · Advanced Performance Management',
  headline: 'Failed APM? Fix the reason you lost marks.',
  subhead:
    'APM is not passed by memorising models. It is passed by applying them to the scenario, evaluating properly, showing scepticism and writing commercially. Gradd diagnoses why your answer lost marks, then Ezra coaches you until your answer is strong enough to score.',
  coverage:
    'Built on the live S26–J27 syllabus. Unlimited access to all 91 drills · 3 full Ezra teach-throughs included · No card required.',
  heroMicrocopy: 'Resit diagnosis: free, 3 minutes, no sign-up. Drills: free to start with a quick email sign-in.',
  heroMeta: ['Every drill free', 'No card to start', 'Upgrade for cases, marking and mock'],
  // ── THE FIX for LOSS 4: the highest-value slot on the page had nothing to look at.
  // Same object as featureArtefacts[0]'s mock-up below — a compact preview here, the full
  // explanatory section further down, not two different transcripts. ──
  heroArtefact: {
    kind: 'chat',
    ariaLabel: 'Ezra withholding a model answer while coaching an APM requirement',
    title: 'Ezra',
    subtitle: 'ACCA APM · Requirement (b)',
    turns: [
      { role: 'student', lines: ['Retention fell from 82% to 74% and revenue per member is down 4%, so the company is underperforming and the board should act on retention.'] },
      { role: 'tutor', badge: 'Hint', lines: ['You’ve analysed the company — but the requirement asks you to evaluate the report. Does the board’s pack let them see any of what you just worked out? That’s where the marks are.'] },
      { role: 'student', lines: ['…so I anchor every point to the report against a criterion, not the performance itself?'] },
      { role: 'tutor', lines: ['Exactly. Fluent answers to the wrong question are the biggest mark-loser on this requirement type. Go again.'] },
    ],
    inputPlaceholder: 'Reply to Ezra…',
    footer: 'The answer stays sealed · Ezra online 24/7',
    caption: 'The answer stays sealed. Ezra teaches until your answer is strong enough to score.',
  },
  // points[] stays populated (not sections[]-only) so the required field is honestly filled
  // even though sections[] is what actually renders — see hasSection('sections') precedence.
  points: [
    { title: 'Finds the gap in your thinking.', body: 'Ezra doesn’t hand you the model answer — he diagnoses exactly where your attempt stalled and teaches from there. The answer stays sealed until you’ve earned it.' },
    { title: 'Marks like the examiner.', body: 'Every case is marked against ACCA’s published professional-skills descriptors — communication, analysis & evaluation, scepticism, commercial acumen. The 20% of the paper most candidates never practise.' },
    { title: 'Trained on how candidates actually fail.', body: 'Answering the wrong question, describing instead of applying, listing instead of developing — the exact failure modes the examiner’s reports cite, coached out of you.' },
  ],
  pricing: {
    free: 'Unlimited access to all 91 drills · 3 full Ezra teach-throughs included · No card required.',
    paid: 'Then €99 for a 90-day exam pass, or €49/month. Each ACCA paper is priced separately.',
  },
  freeCta: {
    label: 'Start free',
    href: '/acca/auth?next=/acca',
  },
  footnote: 'AI tutor for ACCA APM. Gradd.ai is an independent learning platform and is not affiliated with or endorsed by ACCA (the Association of Chartered Certified Accountants).',
  pricingHeading: 'Start free. Pay only when you commit to the sitting.',
  nav: [
    { label: 'The approach', href: '#taught' },
    { label: 'What’s included', href: '#features' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'Blog', href: '/blog?subject=apm' },
    { label: 'Sign in', href: '/acca/auth?next=/acca' },
  ],
  secondaryCta: {
    eyebrow: 'Free resit diagnostic',
    heading: 'Failed APM? Find out exactly why — in 3 minutes.',
    body: 'Your result slip tells you the score. It doesn’t tell you the habit that lost the marks. Answer three quick steps — your score, how each syllabus area went, and six honest questions about how you write — and get a personalised resit plan: the areas to drill, the habits to fix first, and where to start. No sign-up needed to see your plan.',
    cta: { label: 'Get my free resit plan', href: '/acca/resit' },
  },
  // ── THE FIX for LOSS 1: three headed section groups instead of one flat grid. ──
  sections: [
    {
      eyebrow: 'The approach · Taught, not just marked',
      heading: 'Taught, not just marked.',
      lead: 'The paper punishes describing instead of applying. Gradd coaches the thinking the examiner actually rewards — and withholds the answer until you’ve done the work.',
      cards: [
        { title: 'Finds the gap in your thinking.', body: 'Ezra doesn’t hand you the model answer — he diagnoses exactly where your attempt stalled and teaches from there. The answer stays sealed until you’ve earned it.' },
        { title: 'Marks like the examiner.', body: 'Every case is marked against ACCA’s published professional-skills descriptors — communication, analysis & evaluation, scepticism, commercial acumen. The 20% of the paper most candidates never practise.' },
        { title: 'Trained on how candidates actually fail.', body: 'Answering the wrong question, describing instead of applying, listing instead of developing — the exact failure modes the examiner’s reports cite, coached out of you.' },
      ],
    },
    {
      eyebrow: 'Professional skills',
      heading: 'The 20% most candidates never practise.',
      lead: 'A fifth of every APM answer is the professional skills. Gradd marks them against ACCA’s published professional-skills descriptors — and names the evidence.',
      cards: [
        { title: 'Communication', body: 'Structure, clarity, report style.' },
        { title: 'Analysis & evaluation', body: 'Developed points, judgement, prioritisation.' },
        { title: 'Scepticism', body: 'Challenge assumptions, limitations, reliability.' },
        { title: 'Commercial acumen', body: 'Business impact, practical recommendations.' },
      ],
      caption: 'Marked against ACCA’s published professional-skills descriptors, with the evidence named.',
      // ── THE FIX for LOSS 3 (bands): the section the paper's own examiner reports say
      // candidates skip gets the page's one sage band — visual emphasis matching the claim.
      band: 'sage',
    },
    {
      eyebrow: 'What’s included',
      heading: 'Everything the paper demands.',
      cards: [
        { title: '91 exam-style drills.', body: 'Every examinable learning outcome in the live S26–J27 syllabus covered.' },
        { title: 'Full exam cases.', body: 'Multi-exhibit, multi-requirement, CBE-style. Section A 50-markers and Section B 25-markers.' },
        { title: 'Professional-skills marking.', body: 'On your whole answer, with evidence-cited feedback per skill.' },
        { title: 'A full timed mock.', body: '3h 15m, one clock, three cases, marked as one paper.' },
      ],
    },
  ],
  // ── THE FIX for LOSS 2 (artefacts): both mock-ups promoted out of the unframed mid-scroll
  // stack into full-width split sections with their own heading, one reversed so they
  // alternate sides. The chat mock-up is the SAME object as heroArtefact above — reused, not
  // re-authored — given its full explanatory context here instead of a second transcript. ──
  featureArtefacts: [
    {
      eyebrow: 'See it happen · Live coaching',
      heading: 'Ezra doesn’t hand you the model answer.',
      lead: 'He diagnoses exactly where your attempt stalled, coaches from there, and keeps the reference answer sealed until you’ve done the repair — the same loop every teach-through follows.',
      mockup: {
        kind: 'chat',
        ariaLabel: 'Ezra withholding a model answer while coaching an APM requirement',
        title: 'Ezra',
        subtitle: 'ACCA APM · Requirement (b)',
        turns: [
          { role: 'student', lines: ['Retention fell from 82% to 74% and revenue per member is down 4%, so the company is underperforming and the board should act on retention.'] },
          { role: 'tutor', badge: 'Hint', lines: ['You’ve analysed the company — but the requirement asks you to evaluate the report. Does the board’s pack let them see any of what you just worked out? That’s where the marks are.'] },
          { role: 'student', lines: ['…so I anchor every point to the report against a criterion, not the performance itself?'] },
          { role: 'tutor', lines: ['Exactly. Fluent answers to the wrong question are the biggest mark-loser on this requirement type. Go again.'] },
        ],
        inputPlaceholder: 'Reply to Ezra…',
        footer: 'The answer stays sealed · Ezra online 24/7',
        caption: 'The answer stays sealed. Ezra teaches until your answer is strong enough to score.',
      },
    },
    {
      eyebrow: 'Professional skills · Marked, not guessed',
      heading: 'Every case marked against ACCA’s own professional-skills descriptors.',
      lead: 'The 20% of the paper most candidates never practise — communication, analysis & evaluation, scepticism, commercial acumen — marked on your whole answer, with the evidence named.',
      reverse: true,
      mockup: {
        kind: 'panel',
        ariaLabel: 'Professional-skills marking panel showing evidence-cited feedback',
        title: 'Professional skills',
        rows: [
          { label: 'Scepticism', verdict: 'strong', body: '“challenged the covering note’s ‘record revenue’ framing against falling ROCE and EPS…”' },
          { label: 'Communication', verdict: 'competent', body: '“reads as notes, not a board report — no structure, conversational register…”' },
        ],
      },
    },
  ],
  // ── THE FIX for LOSS 4 (weight variety): three figures, each re-verified 2026-08-04 —
  // see the header comment above for the source of every number. ──
  bigNumbers: {
    eyebrow: 'By the numbers',
    heading: 'The paper, in three numbers.',
    items: [
      { value: '~40%', body: 'APM’s own recent pass rate — ACCA’s lowest across the Strategic Professional level, sitting after sitting (ACCA’s published pass rates, Mar 2025–Jun 2026).' },
      { value: '20%', body: 'of every APM answer is professional skills marks — 20 of the paper’s 100, examined since September 2022.' },
      { value: '91', body: 'exam-style drills live today, covering every examinable learning outcome in the live syllabus.' },
    ],
  },
  stepsHeading: 'How a teach-through works.',
  steps: [
    { title: 'Attempt the drill.' },
    { title: 'Ezra marks it against the requirement.' },
    { title: 'He names the failure mode.' },
    { title: 'You repair the answer.' },
    { title: 'Only then is the model answer revealed.' },
  ],
  // ── THE FIX for LOSS 2 (bands): the judgement card gets the page's dark forest band —
  // see the `band` field added to `LandingJudgement`. ─────────────────────────────────────
  judgement: {
    eyebrow: 'The real test',
    heading: 'APM is not a knowledge test. It is a judgement paper.',
    lead: 'APM is one of ACCA’s toughest papers, with pass rates consistently around 40% — among the lowest in the ACCA qualification. The candidates who fail rarely lack knowledge — they answer without applying, evaluating or judging.',
    weak: { label: 'Weak answer', body: 'Target costing helps a business reduce costs by setting a target cost based on the market price.' },
    diagnosis: { label: 'Diagnosis', body: 'Knows the model. No scenario application, no limitation, no judgement.' },
    coached: { label: 'Coached answer', body: 'Target costing fits here because the market price is fixed by customer expectations, so the product must be designed backwards from an acceptable margin. However, if the cost gap cannot close without cutting quality, the strategy risks the premium positioning — so the board should set a floor on specification before committing.' },
    caption: 'The difference is not knowledge. It is application, limitation, judgement.',
    band: 'dark',
  },
  // ── THE FIX for LOSS 5: a real comparison TABLE (Gradd column featured) replacing the
  // old three-flat-card compareStrip. Every Gradd-column fact below is pulled from copy
  // already live elsewhere in this config (sections[2], the mock-up footer, pricingTiers) —
  // no new claim invented for the table. Neither competitor column states an invented price,
  // matching the discipline the old compareStrip already kept. ──
  cmpTable: {
    eyebrow: 'How it compares',
    heading: 'Taught, marked and mocked — for one sitting price.',
    rowLabels: [
      'Teaches the thinking, not just tests it',
      'Marks professional skills against ACCA’s descriptors',
      'Marking turnaround',
      'Full timed mock exam',
      'Availability',
      'Cost for the sitting',
    ],
    columns: [
      {
        label: 'Question banks',
        values: [false, false, 'You mark yourself', false, 'Whenever you access it', 'One-off purchase, varies by provider'],
      },
      {
        label: 'Human tuition',
        values: ['One hour at a time', 'Depends on tutor', 'Whenever you can book a session', false, 'Scheduled sessions only', 'Priced by the hour — adds up fast'],
      },
      {
        label: 'Gradd',
        values: [true, true, 'Same session, unlimited attempts', '3h 15m, marked as one paper', '24/7', '€99 for the whole sitting'],
        featured: true,
      },
    ],
  },
  pricingTiers: [
    {
      name: 'Free',
      amount: '€0',
      tagline: 'Unlimited access to all 91 drills · 3 full Ezra teach-throughs included · No card required.',
      features: ['Every APM drill, unlimited', '3 full teach-throughs with Ezra', 'No card, no commitment'],
      cta: { label: 'Start free', href: '/acca/auth?next=/acca' },
    },
    {
      name: '90-day exam pass',
      amount: '€99',
      period: 'one-time · 90 days',
      tagline: 'Full access through your sitting — drills, cases, marking and the timed mock.',
      features: ['Unlimited teach-throughs with Ezra', 'Full exam cases + professional-skills marking', 'The timed mock, marked as one paper', 'One payment — no recurring charge'],
      cta: { label: 'Get the 90-day pass', href: '/acca/auth?next=/acca/subscribe' },
      badge: 'Best for one sitting',
      featured: true,
    },
    {
      name: 'Monthly',
      amount: '€49',
      period: '/ month',
      tagline: 'Everything in the pass, month to month.',
      features: ['Unlimited teach-throughs with Ezra', 'Full exam cases + professional-skills marking', 'The timed mock, marked as one paper', 'Cancel any time'],
      cta: { label: 'Subscribe monthly', href: '/acca/auth?next=/acca/subscribe' },
      badge: 'Flexible',
    },
  ],
  pricingNote: '14-day money-back guarantee.',
  faqs: [
    { q: 'Is this based on the current APM syllabus?', a: 'Yes — S26–J27, verified against the official guide.' },
    { q: 'How is this different from a general AI chatbot?', a: 'Structured drills and cases built from the syllabus, examiner failure modes, sealed model answers, and professional-skills marking against ACCA’s published professional-skills descriptors — not a chat window.' },
    { q: 'Can I use it if I failed before?', a: 'Yes — built for exactly that: understanding why your answers didn’t score.' },
    { q: 'Does it give model answers?', a: 'Yes — after you’ve attempted, been coached, and repaired your answer.' },
    { q: 'What’s free?', a: 'All 91 drills, 3 full teach-throughs, no card.' },
    { q: 'What do I pay for?', a: 'Unlimited teach-throughs, full exam cases, professional-skills marking, the timed mock.' },
  ],
  finalCta: {
    pill: 'Every drill free · No card',
    heading: 'Preparing for the next APM sitting?',
    body: 'Start with every drill free — no card. Upgrade when you commit to the sitting.',
    ctas: [{ label: 'Start free', href: '/acca/auth?next=/acca' }],
    fineprint: 'Every drill free · €99 for 90 days or €49/month · 14-day money-back guarantee',
  },
  footerLinks: [
    { label: 'ACCA AFM', href: '/acca/afm' },
    { label: 'Terms', href: '/terms' },
    { label: 'Privacy', href: '/privacy' },
    { label: 'Cookies', href: '/cookies' },
    { label: 'Blog', href: '/blog?subject=apm' },
    { label: 'Contact', href: 'mailto:hello@gradd.ai' },
  ],
  chrome: { backToTop: true, stickyHeaderShadow: true },
};
