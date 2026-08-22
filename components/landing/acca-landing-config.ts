// components/landing/acca-landing-config.ts
//
// CONTENT for the ACCA landing pages — the two SPOKES (`/acca/apm`, `/acca/afm`) and the
// PILLAR (gradd.ai root). STRUCTURE AND CSS STAY IN THE COMPONENT (`ACCALandingPage.tsx`) —
// this file holds only what a page SAYS, never how it is laid out or painted. That split is
// the whole point of the exercise: the page Grant approved is the composition, and a config
// that could change the composition would be able to lose it again.
//
// ── THE PILLAR JOINED THIS MECHANISM 2026-08-07 (`feat/acca-pillar-config`) ──
// Root used to render its own component (`ACCAPillarPage`) on the generalised template's
// stylesheet, so the page a stranger ACTUALLY LANDS ON looked unlike the two pages it links
// to. It now renders `ACCALandingPage` with `ACCA_PILLAR_LANDING` below.
//
// Three of its blocks do not fit — and were NOT forced into — an existing kind: the counts
// strip (`STAT_STRIP`), the pacing feature (`FEATURE_PANEL`) and the two routing cards
// (`PAPER_CARDS`). Each got a real section kind with its own renderer. The rule the spokes
// established holds unchanged: a KIND decides the band and the shape, a CONFIG never does.
// `ProductLandingPage`, `product-landing-sections.ts` and `APM_LANDING` were deleted in the
// same change-set — with the pillar moved they had no consumer left, and a dead template that
// still renders is one somebody finds and uses.
//
// ── WHY THIS IS NOT `ProductLandingConfig` ──────────────────────────────────
// The generalised template (`ProductLandingPage` + `product-landing-config.ts`) was built
// BEFORE there was a page worth copying, and the page it produced was rejected on sight
// (`app/acca/apm/page.tsx` carries the ruling). Its vocabulary is a superset of section TYPES
// with no opinion about ORDER, band rhythm or which artefact goes where — so it can express
// every element of this page and compose none of them.
//
// This config is the opposite shape ON PURPOSE. It is a script for ONE page: the sections are
// an ORDERED array, the renderer owns the band rhythm, and there is no way to reorder the page
// or invent a fourteenth boxed card grid from a config edit. A new paper writes the same nine
// slots in the same order or it does not use this component.
//
// ── THE ONE OPTIONAL SECTION ────────────────────────────────────────────────
// `resitBand` is optional and OMITTING IT RENDERS NOTHING — not an empty band, not a heading
// over blank space. APM has a live free resit diagnostic (`/acca/resit`, whose engine is
// written in APM's own terms); AFM does not, so AFM omits the field rather than pointing a
// real-looking band at a feature that does not exist.
//
// ── RICH TEXT, AND WHY IT IS SEGMENTS RATHER THAN A STRING ──────────────────
// Two of APM's chat lines carry inline <em>/<strong>. A markup string would need a parser (and
// `dangerouslySetInnerHTML`) to render; an array of typed segments needs neither and cannot
// inject anything. See `RichText`.

// ── Primitives ──────────────────────────────────────────────────────────────

/** One inline segment. A bare string is plain text; the object forms are <em>/<strong>. */
export type RichSpan = string | { em: string } | { strong: string };
export type RichText = RichSpan[];

/**
 * A heading in this page's one idiom: plain lead-in, then an emphasised tail.
 *
 * The SPACE between the two is structure, not content — the component emits `${text} ` as a
 * single text node so the rendered markup is byte-identical to the hand-written JSX it
 * replaces. (Emitting the space as its own JSX child would make two ADJACENT text nodes, and
 * React separates those with an HTML comment.) A heading with no `em` renders `text` alone,
 * with no trailing space.
 */
export interface Heading { text: string; em?: string }

/** An eyebrow. A plain string, or two labels separated by the page's rust dot. */
export type Eyebrow = string | { a: string; b: string };

export interface Cta { label: string; href: string; variant: 'rust' | 'ghost' }

/** A header link: either a real destination, or a smooth-scroll to a section on this page. */
export type NavLink = { label: string; href: string } | { label: string; scrollTo: string };

// ── Artefacts ───────────────────────────────────────────────────────────────
// The thing beside the hero copy. Two shapes, because the two kinds of page make two
// different claims: a SPOKE sells a tutor, so its artefact is a conversation; the PILLAR
// sells marking, so its artefact is a marked answer. Discriminated by `kind`, which is
// never rendered — adding it to the two existing configs changes no byte of their output.

export type ChatTurn =
  | { role: 'student'; text: string }
  | { role: 'tutor'; badge?: string; paragraphs: RichText[] };

export interface ChatArtefact {
  kind: 'CHAT';
  ariaLabel: string;
  /** The name pill beside the logo — "Ezra". */
  name: string;
  /** The right-hand course block: an emphasised first line and a quieter second. */
  courseTitle: string;
  courseSub: string;
  turns: ChatTurn[];
  inputPlaceholder: string;
  footer: string;
  /** The italic line UNDER the whole artefact, outside its frame. */
  caption: string;
}

/**
 * One row of a marking panel: what was marked, the band, and the marker's line about it.
 *
 * `quoted` decides whether the body renders as a QUOTATION of the product's output (italic,
 * the page's existing `.mark-evidence` treatment) or as an annotation about it
 * (`.mark-note`). It is a claim about provenance, not a style knob: a line the marker wrote
 * and a line we wrote about the marker are different things and must not look alike.
 */
export interface PanelRow {
  label: string;
  verdict: string;
  /**
   * The chip colour. `strong` and `mid` are the two BANDS the spokes' skills panel uses —
   * green and gold, and both are a judgement about how well the answer did.
   *
   * `flat` is not a band, and it exists because the pacing panel has a row that is not
   * judged: "no ratio" is a statement that a budget could not meaningfully be computed for
   * the first requirement, and rendering it green told a visitor the candidate had done
   * well at something. A neutral fact needs a neutral chip.
   */
  tone: 'strong' | 'mid' | 'flat';
  body: string;
  quoted?: boolean;
}

/**
 * PANEL — a marking panel, rendered in the SAME `.mark-panel` frame the spokes' professional-
 * skills section already uses. That reuse is the point: the pillar's hero artefact and the
 * spokes' marking panel are the same object, so a visitor arriving from one recognises the
 * other.
 *
 * The spokes' panel head carries a SCORE; this one carries a subtitle (which case, which
 * requirement) because a pillar illustrating marking should not put a number on an
 * illustration. `foot` and `caption` are both optional — `caption` is the italic line
 * OUTSIDE the frame, and a panel used inside a section does not want one.
 */
export interface PanelArtefact {
  kind: 'PANEL';
  ariaLabel: string;
  title: string;
  sub: string;
  rows: PanelRow[];
  foot?: string;
  caption?: string;
}

export type HeroArtefact = ChatArtefact | PanelArtefact;

// ── Section shapes ──────────────────────────────────────────────────────────
// Every section carries `ariaLabel` (each is a labelled <section>) and an optional `id` (the
// nav's scroll targets). `kind` selects the renderer.

interface SectionBase {
  id?: string;
  ariaLabel: string;
  eyebrow?: Eyebrow;
  heading: Heading;
  lead?: string;
}

/**
 * PROOF_ROW — three columns of PROSE, arrow-linked, with an italic takeaway under them.
 *
 * ── WHY THIS IS ITS OWN SECTION TYPE ────────────────────────────────────────
 * It is the page's ARGUMENT, and it is not a comparison. A compare row answers the same
 * question in each column ("what does each provider do about X?"); this reads left to right as
 * ONE thing changing: an answer, what is wrong with it, and what it becomes. The middle column
 * is a diagnosis of the first, and the third is the payoff of the second — swap two columns and
 * it means nothing, which is exactly what a compare row survives.
 *
 * Both papers need it and neither could use the other's: APM's is a WEAK answer rewritten into
 * a coached one (its failure is describing instead of judging), AFM's is a NEAR-CORRECT answer
 * whose own cross-check confirms the wrong figure (its failure is execution under a clock). The
 * shape is shared; the three labels are config, because "Coached answer" and "Reference answer"
 * are different claims.
 */
export interface ProofRowSection extends SectionBase {
  kind: 'PROOF_ROW';
  /**
   * OPTIONAL big figures, above the three columns. Omitted renders nothing at all.
   *
   * They belong to the proof rather than to a band of their own: "96 contracts / 0.15pp /
   * 2 of 7" is the SAME finding the three columns narrate, stated as magnitudes. Split into
   * a separate section it would need a second heading over the same argument, and a reader
   * would take it for a second claim.
   */
  numbers?: { value: string; body: string }[];
  weak: { label: string; body: string };
  diagnosis: { label: string; body: string };
  coached: { label: string; body: string };
  caption: string;
}

/**
 * STAT_STRIP — the thin bordered band of counts. NOT a card grid and not a section: it is a
 * rule-to-rule strip between two sections, which is why it renders into the page's existing
 * `.trust` treatment rather than a new one.
 *
 * It carries no heading, so it does NOT extend SectionBase. A strip of four numbers that
 * needs a heading to be understood is the wrong strip.
 */
export interface StatStripSection {
  kind: 'STAT_STRIP';
  ariaLabel: string;
  label: string;
  stats: { value: string; label: string }[];
}

/**
 * FEATURE_PANEL — a sage band: heading and lead, then bullets beside a marking panel.
 *
 * The bullets are RichText, not strings, and that is load-bearing rather than general: one of
 * them names a status the product reports VERBATIM (`not reached`), and a bullet that cannot
 * carry an <em> would either lose the distinction or smuggle it in with quote marks the
 * product does not print.
 */
export interface FeaturePanelSection extends SectionBase {
  kind: 'FEATURE_PANEL';
  bullets: RichText[];
  panel: PanelArtefact;
}

/**
 * PAPER_CARDS — one card per paper: code, live/soon chip, name, what it teaches, what is
 * live in it today, and a link into that paper's own page.
 *
 * ── WHY THIS IS NOT CARD_GRID ───────────────────────────────────────────────
 * CARD_GRID's cards are FEATURES of one product and go nowhere; these are DESTINATIONS, and
 * routing to the right paper is the pillar's whole job. The difference is the CTA, and a
 * card grid that grew an optional CTA would be two components wearing one name.
 *
 * `live` is the counts line, and it is the one string on the pillar that must move whenever
 * the DB does — it is stated per paper here and on that paper's own spoke, and the two must
 * agree.
 */
export interface PaperCardsSection extends SectionBase {
  kind: 'PAPER_CARDS';
  cards: { code: string; name: string; status: string; blurb: string; live: string; cta: Cta }[];
}

/** CARD_TRIO — three numbered cards on the page's sage band ("01 / Diagnosis", …). */
export interface CardTrioSection extends SectionBase {
  kind: 'CARD_TRIO';
  cards: { num: string; title: string; body: string }[];
}

/** STEPS — an ordered row; the component numbers them, so a config never writes "1." */
export interface StepsSection extends SectionBase {
  kind: 'STEPS';
  steps: string[];
}

/** SKILLS_PANEL — the four professional-skills tiles beside a marking panel, on sage. */
export interface SkillsPanelSection extends SectionBase {
  kind: 'SKILLS_PANEL';
  tiles: { title: string; body: string }[];
  panel: {
    ariaLabel: string;
    title: string;
    /** Rendered as `score` then a smaller `of` — e.g. "7" + "/10". */
    score: string;
    of: string;
    /** `tone` picks the chip colour; `verdict` is the word shown. */
    rows: { skill: string; verdict: string; tone: 'strong' | 'mid'; evidence: string }[];
  };
  caption: string;
}

/**
 * CARD_GRID — the two-up tagged card grid, used twice (what's included, the timed mock).
 * `quote` is a verbatim line of the product's own output; `limit` is the honest boundary on
 * the claim above it. Both optional, both rendered only when set.
 */
export interface CardGridSection extends SectionBase {
  kind: 'CARD_GRID';
  cards: { tag: string; title: string; body: string; quote?: string; limit?: string }[];
}

/**
 * COMPARE_TABLE — real shared rows, one column per option.
 * `columns[i].values` is POSITIONAL against `rowLabels`: `values[j]` answers `rowLabels[j]`.
 * A boolean renders as a yes/no glyph; a string renders as itself.
 */
export interface CompareTableSection extends SectionBase {
  kind: 'COMPARE_TABLE';
  rowLabels: string[];
  columns: { label: string; values: (string | boolean)[]; gradd?: boolean }[];
  /** Shown only when the table actually overflows — see `ScrollableHint`. */
  scrollHint: string;
}

export type AccaSection =
  | ProofRowSection
  | CardTrioSection
  | StepsSection
  | SkillsPanelSection
  | CardGridSection
  | CompareTableSection
  | StatStripSection
  | FeaturePanelSection
  | PaperCardsSection;

// ── The page ────────────────────────────────────────────────────────────────

export interface PricingTier {
  name: string;
  currency: string;
  amount: string;
  per?: string;
  tagline: string;
  features: string[];
  cta: Cta;
  badge?: string;
  /** A quieter badge treatment — the "Flexible" chip rather than the rust "Best for…". */
  badgeMuted?: boolean;
  featured?: boolean;
}

export interface AccaLandingConfig {
  /** Used by nothing on the page itself — it is the key a caller identifies a config by.
   *  `ACCA` is the PILLAR (gradd.ai root), which sells the qualification and routes to the
   *  two papers rather than selling a paper. */
  paper: 'APM' | 'AFM' | 'ACCA';

  /** The anonymous free-access CTA. Every slot carrying THIS href is what the
   *  entitlement-aware swap replaces — see `withAccaDynamicCta`. */
  freeCta: { label: string; href: string };

  nav: {
    links: NavLink[];
    /** Quiet text links in the always-visible right-hand group. */
    quiet: { label: string; href: string }[];
    primary: { label: string; href: string };
  };

  hero: {
    eyebrow: { paper: string; exam: string };
    /** `lead` then the rust-underlined italic phrase. */
    h1: { lead: string; underline: string };
    /** One paragraph, or several. An array renders one <p class="hero-sub"> per entry — a
     *  string renders exactly the single paragraph it always did. */
    sub: string | string[];
    /** OPTIONAL facts line under the sub — smaller and heavier. Omitted renders nothing. */
    note?: string;
    ctas: Cta[];
    /** OPTIONAL quiet line under the buttons. Omitted renders nothing. */
    microcopy?: string;
    meta: string[];
    artefact: HeroArtefact;
  };

  /** OPTIONAL. Omitted renders nothing at all. AFM omits it. */
  resitBand?: {
    ariaLabel: string;
    eyebrow: string;
    heading: Heading;
    lead: string;
    cta: Cta;
  };

  /** The ordered body of the page, between the hero (or resit band) and pricing. */
  sections: AccaSection[];

  pricing: {
    id: string;
    ariaLabel: string;
    eyebrow: string;
    heading: Heading;
    lead: string;
    tiers: PricingTier[];
    note: string;
  };

  /** OPTIONAL, on the same terms as `resitBand`: omitting it renders NOTHING — no empty
   *  list, no heading over blank space, and no FAQPage JSON-LD asserting questions the page
   *  does not ask. The pillar omits it; see its header block for why. */
  faq?: {
    id: string;
    ariaLabel: string;
    eyebrow: string;
    heading: Heading;
    /** Feeds BOTH the visible list and the FAQPage JSON-LD, from one array, so the structured
     *  data cannot drift from the on-page copy. */
    items: { q: string; a: string }[];
  };

  finalCta: {
    ariaLabel: string;
    pill: string;
    heading: Heading;
    lead: string;
    cta: Cta;
    /** OPTIONAL second button beside the first. Omitted renders nothing. */
    secondary?: Cta;
    small: string;
  };

  footer: {
    copyright: string;
    links: { label: string; href: string }[];
    disclaimer: string;
  };
}

// ── Entitlement-aware CTA ───────────────────────────────────────────────────
/**
 * Replaces every CTA pointing at the anonymous free-access destination with one
 * entitlement-resolved label/href — "Continue" for a student who already has this paper,
 * "Add AFM for your sitting" for one entitled on the other paper only.
 *
 * MATCHED BY HREF, not by position or label. Position is fragile (APM's first hero button is
 * the resit diagnostic, AFM's is Start free) and label is fragile in the other direction (two
 * different buttons can both read "Start free"). The href IS the thing being replaced, so it
 * is the thing to match on. Every other link — the paper switcher, the blog, the proof
 * walkthrough, the paid tiers — is untouched, because none of them is a claim about what this
 * visitor is entitled to.
 *
 * PURE: it takes the decision, it never makes one. `lib/acca/entitlement-cta.ts` does the
 * auth/DB read.
 */
export function withAccaDynamicCta(
  c: AccaLandingConfig,
  cta: { label: string; href: string },
): AccaLandingConfig {
  const swap = <T extends { label: string; href: string }>(x: T): T =>
    x.href === c.freeCta.href ? { ...x, label: cta.label, href: cta.href } : x;

  return {
    ...c,
    freeCta: { label: cta.label, href: cta.href },
    nav: {
      ...c.nav,
      links: c.nav.links.map((n) => ('href' in n ? swap(n) : n)),
      quiet: c.nav.quiet.map(swap),
      primary: swap(c.nav.primary),
    },
    hero: { ...c.hero, ctas: c.hero.ctas.map(swap) },
    pricing: { ...c.pricing, tiers: c.pricing.tiers.map((t) => ({ ...t, cta: swap(t.cta) })) },
    finalCta: { ...c.finalCta, cta: swap(c.finalCta.cta) },
  };
}

// ════════════════════════════════════════════════════════════════════════════
// APM — EXTRACTED VERBATIM from ACCALandingPage.tsx, 2026-08-06.
//
// ⚠️ THIS IS AN EXTRACTION, NOT AN EDIT. Every string below was lifted from the JSX it
// replaces, with the HTML entities resolved to the characters they denote (`&apos;` → ',
// `&amp;` → &, `&ldquo;`/`&rdquo;` → “ ”, `&lsquo;`/`&rsquo;` → ‘ ’). The rendered body of
// /acca/apm is byte-identical before and after — proven by SHA-256 over the built output, not
// by reading. Do not "tidy" a string here: several of them are quoted product output or
// sourced market facts, and the provenance notes that used to sit beside them in the JSX are
// preserved below.
// ════════════════════════════════════════════════════════════════════════════

// Real entry points into the live APM product. The auth wall carries the post-login
// destination: free lands in the drill dashboard, paid on subscribe.
const APM_AUTH_FREE = '/acca/auth?next=/acca';
const APM_AUTH_SUBSCRIBE = '/acca/auth?next=/acca/subscribe';

export const APM_ACCA_LANDING: AccaLandingConfig = {
  paper: 'APM',
  freeCta: { label: 'Start free', href: APM_AUTH_FREE },

  nav: {
    links: [
      { label: 'Resit diagnostic', href: '/acca/resit' },
      { label: 'ACCA AFM', href: '/acca/afm' },
      { label: 'The approach', scrollTo: 'taught' },
      { label: "What's included", scrollTo: 'features' },
      { label: 'Pricing', scrollTo: 'pricing' },
    ],
    // Quiet text link — the magic-link flow handles returning users and new signups at the
    // same destination, so Sign in shares the free CTA's href.
    quiet: [
      { label: 'Blog', href: '/blog?subject=apm' },
      { label: 'Sign in', href: APM_AUTH_FREE },
    ],
    primary: { label: 'Start free', href: APM_AUTH_FREE },
  },

  hero: {
    eyebrow: { paper: 'ACCA APM', exam: 'Advanced Performance Management' },
    h1: { lead: 'Failed APM?', underline: 'Fix the reason you lost marks.' },
    sub: 'APM is not passed by memorising models. It is passed by applying them to the scenario, evaluating properly, showing scepticism and writing commercially. Gradd diagnoses why your answer lost marks, then Ezra coaches you until your answer is strong enough to score.',
    note: 'Built on the live S26–J27 syllabus. Unlimited access to all 91 drills · 3 full Ezra teach-throughs included · No card required.',
    ctas: [
      { label: 'Get my free resit diagnosis', href: '/acca/resit', variant: 'rust' },
      { label: 'Start free — every drill, no card', href: APM_AUTH_FREE, variant: 'ghost' },
    ],
    microcopy: 'Resit diagnosis: free, 3 minutes, no sign-up. Drills: free to start with a quick email sign-in.',
    meta: ['Every drill free', 'No card to start', 'Upgrade for cases, marking and mock'],
    artefact: {
      kind: 'CHAT',
      ariaLabel: 'Ezra withholding a model answer while coaching an APM requirement',
      name: 'Ezra',
      courseTitle: 'Evaluating the board report',
      courseSub: 'ACCA APM · Requirement (b)',
      turns: [
        { role: 'student', text: 'Retention fell from 82% to 74% and revenue per member is down 4%, so the company is underperforming and the board should act on retention.' },
        {
          role: 'tutor',
          badge: 'Hint',
          paragraphs: [[
            "You've analysed the company — but the requirement asks you to evaluate the ",
            { em: 'report' },
            ". Does the board's pack let them ",
            { strong: 'see' },
            " any of what you just worked out? That's where the marks are.",
          ]],
        },
        { role: 'student', text: '…so I anchor every point to the report against a criterion, not the performance itself?' },
        { role: 'tutor', paragraphs: [['Exactly. Fluent answers to the wrong question are the biggest mark-loser on this requirement type. Go again.']] },
      ],
      inputPlaceholder: 'Reply to Ezra…',
      footer: 'The answer stays sealed · Ezra online 24/7',
      caption: 'The answer stays sealed. Ezra teaches until your answer is strong enough to score.',
    },
  },

  resitBand: {
    ariaLabel: 'Free resit diagnostic',
    eyebrow: 'Free resit diagnostic',
    heading: { text: 'Failed APM? Find out exactly why —', em: 'in 3 minutes.' },
    lead: "Your result slip tells you the score. It doesn't tell you the habit that lost the marks. Answer three quick steps — your score, how each syllabus area went, and six honest questions about how you write — and get a personalised resit plan: the areas to drill, the habits to fix first, and where to start. No sign-up needed to see your plan.",
    cta: { label: 'Get my free resit plan', href: '/acca/resit', variant: 'rust' },
  },

  sections: [
    {
      kind: 'PROOF_ROW',
      ariaLabel: 'Why APM is a judgement paper',
      eyebrow: 'The real test',
      heading: { text: 'APM is not a knowledge test. It is a', em: 'judgement paper.' },
      lead: "APM is one of ACCA's toughest papers, with pass rates consistently around 40% — among the lowest in the ACCA qualification. The candidates who fail rarely lack knowledge — they answer without applying, evaluating or judging.",
      weak: { label: 'Weak answer', body: 'Target costing helps a business reduce costs by setting a target cost based on the market price.' },
      diagnosis: { label: 'Diagnosis', body: 'Knows the model. No scenario application, no limitation, no judgement.' },
      coached: { label: 'Coached answer', body: 'Target costing fits here because the market price is fixed by customer expectations, so the product must be designed backwards from an acceptable margin. However, if the cost gap cannot close without cutting quality, the strategy risks the premium positioning — so the board should set a floor on specification before committing.' },
      caption: 'The difference is not knowledge. It is application, limitation, judgement.',
    },
    {
      kind: 'CARD_TRIO',
      id: 'taught',
      ariaLabel: 'Taught, not just marked',
      eyebrow: { a: 'The approach', b: 'Taught, not just marked' },
      heading: { text: 'Taught, not just', em: 'marked.' },
      lead: "The paper punishes describing instead of applying. Gradd coaches the thinking the examiner actually rewards — and withholds the answer until you've done the work.",
      cards: [
        { num: '01 / Diagnosis', title: 'Finds the gap in your thinking.', body: "Ezra doesn't hand you the model answer — he diagnoses exactly where your attempt stalled and teaches from there. The answer stays sealed until you've earned it." },
        { num: '02 / Marking', title: 'Marks like the examiner.', body: "Every case is marked against ACCA's published professional-skills descriptors — communication, analysis & evaluation, scepticism, commercial acumen. The 20% of the paper most candidates never practise." },
        { num: '03 / Failure modes', title: 'Trained on how candidates actually fail.', body: "Answering the wrong question, describing instead of applying, listing instead of developing — the exact failure modes the examiner's reports cite, coached out of you." },
      ],
    },
    {
      kind: 'STEPS',
      ariaLabel: 'How a teach-through works',
      eyebrow: 'The loop',
      heading: { text: 'How a teach-through', em: 'works.' },
      steps: [
        'Attempt the drill.',
        'Ezra marks it against the requirement.',
        'He names the failure mode.',
        'You repair the answer.',
        'Only then is the model answer revealed.',
      ],
    },
    {
      kind: 'SKILLS_PANEL',
      ariaLabel: 'Professional-skills marking',
      eyebrow: 'Professional skills',
      heading: { text: 'The 20% most candidates', em: 'never practise.' },
      lead: "A fifth of every APM answer is the professional skills. Gradd marks them against ACCA's published professional-skills descriptors — and names the evidence.",
      tiles: [
        { title: 'Communication', body: 'Structure, clarity, report style.' },
        { title: 'Analysis & evaluation', body: 'Developed points, judgement, prioritisation.' },
        { title: 'Scepticism', body: 'Challenge assumptions, limitations, reliability.' },
        { title: 'Commercial acumen', body: 'Business impact, practical recommendations.' },
      ],
      panel: {
        ariaLabel: 'Professional-skills marking panel showing evidence-cited feedback',
        title: 'Professional skills',
        score: '7',
        of: '/10',
        rows: [
          { skill: 'Scepticism', verdict: 'strong', tone: 'strong', evidence: '“challenged the covering note\'s ‘record revenue’ framing against falling ROCE and EPS…”' },
          { skill: 'Communication', verdict: 'competent', tone: 'mid', evidence: '“reads as notes, not a board report — no structure, conversational register…”' },
        ],
      },
      caption: "Marked against ACCA's published professional-skills descriptors, with the evidence named.",
    },
    {
      kind: 'CARD_GRID',
      id: 'features',
      ariaLabel: 'What is included',
      eyebrow: "What's included",
      heading: { text: 'Everything the paper', em: 'demands.' },
      cards: [
        { tag: 'Drills', title: '91 exam-style drills.', body: 'Every examinable learning outcome in the live S26–J27 syllabus covered.' },
        { tag: 'Cases', title: 'Full exam cases.', body: 'Multi-exhibit, multi-requirement, CBE-style. Section A 50-markers and Section B 25-markers.' },
        { tag: 'Marking', title: 'Professional-skills marking.', body: 'On your whole answer, with evidence-cited feedback per skill.' },
        { tag: 'Mock', title: 'A full timed mock.', body: '3h 15m, one clock, three cases, marked as one paper.' },
      ],
    },
    // ── THE TIMED MOCK ──
    // EVERY FIGURE BELOW IS SOURCED. Do not adjust one without re-reading its source:
    // · "about a minute" — measured 58s and 60s across two end-to-end runs
    //   (docs/APM_MARKETING_POSITIONING.md, 31/07 walk).
    // · per-requirement / per-case subtotal / paper total — lib/acca/debrief.ts,
    //   `cases[].technical_awarded` + `totals` (technical AND professional).
    // · unlimited attempts — app/api/acca/sit/route.ts:307 (only a COMPLETED attempt starts a
    //   fresh one, no count limit) + app/api/acca/case/turn/route.ts:247 (immutability is
    //   scoped `.eq('attempt_id', …)`, so a re-sit records afresh).
    // · €59.98 / three days — market fact, UNATTRIBUTED by instruction. Recorded at
    //   docs/APM_MARKETING_POSITIONING.md:82 (two mocks at €29.99 each, PDF, tutor-marked,
    //   three-day turnaround). NOT in APM_COMPETITIVE_PRICING.md.
    // · the marker figures — docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md:27-30
    //   (candidate 95.00 / €132,000 / 4.95%) against
    //   docs/reviews/AFM_MOCK_PAPER1_REVIEW_PACK.md:528-529 (code-owned 94.85, 96.65,
    //   €168,000, 4.80%).
    // · the pacing line — VERBATIM from the 31/07 walk
    //   (docs/APM_MARKETING_POSITIONING.md:92-94), rendered in the form `composeCollapse`
    //   actually emits (lib/acca/debrief.ts:228). ⚠ 12 MINUTES, NOT 7. "7 minutes across two
    //   requirements" is an earlier DRAFT the source doc explicitly corrects at line 96:
    //   "Use the real numbers or none."
    //
    // ⚠ NO MARKING-IS-COMPUTED CLAIM ANYWHERE IN HERE. Marking is answer-locked and
    // model-graded — code owns band→marks, the MODEL owns the band, and the feedback prose is
    // model-authored. Saying "computed", "deterministic" or "code-verified" of marking is the
    // exact overclaim already corrected in CLAUDE.md.
    //
    // ⚠ "syllabus area", NOT "learning outcome". `DebriefRequirementLine.practise_area` carries
    // the 2-CHARACTER sub-area (E3a → E3), never the full LO — see the field comment at
    // lib/acca/debrief.ts:111-126.
    {
      kind: 'CARD_GRID',
      ariaLabel: 'The timed mock',
      eyebrow: 'The timed mock',
      heading: { text: 'Sit the paper. Find out', em: 'where the marks — and the minutes — went.' },
      lead: 'Three cases, 3h 15m, one clock, marked as one paper. What comes back is not a score.',
      cards: [
        { tag: 'Turnaround', title: 'Marked in about a minute.', body: 'Every requirement, technical and professional skills, per-case subtotals, one paper total. Unlimited attempts. Two tutor-marked mocks elsewhere cost €59.98 and come back three days later, on a PDF.' },
        {
          tag: 'Diagnosis',
          title: 'The figure, and the step.',
          body: 'The marker names where your working diverged — not just that it did.',
          quote: '“You used 95.00 and 96.80 rather than 94.85 and 96.65, so your gain was €132,000 not €168,000, so your rate was 4.95% not 4.80%.”',
        },
        {
          tag: 'Pacing',
          title: 'Where the minutes went.',
          body: 'Requirement by requirement, against the marks available.',
          quote: '“End-of-paper collapse. Between submitting Q2 (ii) and finishing, 12 minutes elapsed across Q3 (i)–Q3 (ii), against a combined budget of 39 minutes.”',
          limit: 'Measured submission to submission — not time on task.',
        },
        { tag: 'Routing', title: 'It routes you back.', body: 'The debrief points at drills on the syllabus area you lost marks on. Weak or competent bands only — a requirement that scored gets nothing.' },
      ],
    },
    // ── THE COMPARISON TABLE ──
    // Content is carried across VERBATIM from the three flat `.compare-strip` cards this
    // replaced, or from copy already live elsewhere on this page (the mock's "3h 15m … marked
    // as one paper", the €99 sitting price). No competitor PRICE is invented — "varies by
    // provider" and "priced by the hour" are the honest shape of the offer, which is the
    // discipline the old strip already kept.
    {
      kind: 'COMPARE_TABLE',
      ariaLabel: 'How Gradd compares',
      eyebrow: 'How it compares',
      heading: { text: 'Taught, marked and mocked —', em: 'for one sitting price.' },
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
          gradd: true,
        },
      ],
      scrollHint: 'Scroll to see more →',
    },
  ],

  pricing: {
    id: 'pricing',
    ariaLabel: 'Pricing',
    eyebrow: 'Pricing',
    heading: { text: 'Start free. Pay only when you commit to the sitting.' },
    lead: 'Drills are free so you can test the method. Upgrade when you want full coaching, cases, marking and the mock.',
    tiers: [
      {
        name: 'Free',
        currency: '€',
        amount: '0',
        tagline: 'Unlimited access to all 91 drills · 3 full Ezra teach-throughs included · No card required.',
        features: ['Every APM drill, unlimited', '3 full teach-throughs with Ezra', 'No card, no commitment'],
        cta: { label: 'Start free', href: APM_AUTH_FREE, variant: 'ghost' },
      },
      {
        name: '90-day exam pass',
        currency: '€',
        amount: '99',
        per: 'one-time · 90 days',
        tagline: 'Full access through your sitting — drills, cases, marking and the timed mock.',
        features: [
          'Unlimited teach-throughs with Ezra',
          'Full exam cases + professional-skills marking',
          'The timed mock, marked as one paper',
          'One payment — no recurring charge',
        ],
        cta: { label: 'Get the 90-day pass', href: APM_AUTH_SUBSCRIBE, variant: 'rust' },
        badge: 'Best for one sitting',
        featured: true,
      },
      {
        name: 'Monthly',
        currency: '€',
        amount: '49',
        per: '/ month',
        tagline: 'Everything in the pass, month to month.',
        features: [
          'Unlimited teach-throughs with Ezra',
          'Full exam cases + professional-skills marking',
          'The timed mock, marked as one paper',
          'Cancel any time',
        ],
        cta: { label: 'Subscribe monthly', href: APM_AUTH_SUBSCRIBE, variant: 'ghost' },
        badge: 'Flexible',
        badgeMuted: true,
      },
    ],
    note: '14-day money-back guarantee.',
  },

  faq: {
    id: 'faq',
    ariaLabel: 'Frequently asked questions',
    eyebrow: 'FAQ',
    heading: { text: 'Questions,', em: 'answered.' },
    items: [
      { q: 'Is this based on the current APM syllabus?', a: 'Yes — S26–J27, verified against the official guide.' },
      { q: 'How is this different from a general AI chatbot?', a: 'Structured drills and cases built from the syllabus, examiner failure modes, sealed model answers, and professional-skills marking against ACCA’s published professional-skills descriptors — not a chat window.' },
      { q: 'Can I use it if I failed before?', a: 'Yes — built for exactly that: understanding why your answers didn’t score.' },
      { q: 'Does it give model answers?', a: 'Yes — after you’ve attempted, been coached, and repaired your answer.' },
      { q: 'What’s free?', a: 'All 91 drills, 3 full teach-throughs, no card.' },
      { q: 'What do I pay for?', a: 'Unlimited teach-throughs, full exam cases, professional-skills marking, the timed mock.' },
    ],
  },

  finalCta: {
    ariaLabel: 'Get started',
    pill: 'Every drill free · No card',
    heading: { text: 'Preparing for the', em: 'next APM sitting?' },
    lead: 'Start with every drill free — no card. Upgrade when you commit to the sitting.',
    cta: { label: 'Start free', href: APM_AUTH_FREE, variant: 'rust' },
    small: 'Every drill free · €99 for 90 days or €49/month · 14-day money-back guarantee',
  },

  footer: {
    copyright: '© 2026 · AI tutor for ACCA APM',
    links: [
      { label: 'ACCA AFM', href: '/acca/afm' },
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Cookies', href: '/cookies' },
      { label: 'Blog', href: '/blog?subject=apm' },
      { label: 'Contact', href: 'mailto:hello@gradd.ai' },
    ],
    disclaimer: 'Gradd.ai is an independent learning platform and is not affiliated with or endorsed by ACCA (the Association of Chartered Certified Accountants).',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// AFM — ITS OWN ARGUMENT, ITS OWN FIGURES, ITS OWN EXAMPLES.
//
// ── THE ARGUMENT IS NOT APM'S, AND THAT IS THE POINT ────────────────────────
// APM is "not a knowledge test, a JUDGEMENT paper": the failure is describing instead of
// applying and evaluating. AFM's own failure catalogue says the opposite —
// `docs/TEACHING_PRINCIPLES_EZRA_AFM.md`, extracted from five examiner reports
// (D23/J24/SD24/MJ25/D25): "AFM candidates' arithmetic is usually competent; what fails is the
// advice, the hedging specification, and the valuation plumbing." AFM is an EXECUTION test.
// Nothing on this page imports APM's framing, and nothing borrows APM's numbers.
//
// ── EVERY FIGURE VERIFIED AGAINST THE DB THIS SESSION (2026-08-06) ──────────
// · 63 drills — `SELECT count(*) FROM acca_drills WHERE exam_board='ACCA' AND
//   paper_code='AFM' AND status='approved' AND published=true` → 63. Section split by lo_code
//   prefix: A=2, B=47, E=14; ZERO in C or D, which is why the coverage boundary is stated
//   on-page rather than implied away. PS-tag split: analysis_and_evaluation 51, scepticism 5,
//   commercial_acumen 4, communication 3, 0 untagged.
// · 5 practice cases + 3 mock — `acca_cases` where paper_code='AFM' → 8 rows, all
//   approved+published; 3 `mock_only` (Solenne Industries SA / Brecon Renewables plc /
//   Aldebrino SpA) and 5 practice (Kestrel Foods plc / Halvard Marine ASA / Lindqvist
//   Instruments AB / Tamesis Diagnostics plc / Castlereagh Utilities plc). "5 practice cases"
//   is exact, not rounded.
// · one 50-mark case + two 25-mark questions — `acca_case_requirements.marks_guide` per mock
//   case: Solenne 10+16+8+6 = 40, Brecon 12+8 = 20, Aldebrino 12+8 = 20. That is 80 TECHNICAL
//   marks; `case-marking.ts` apportions the paper's 20 professional-skills marks on top
//   (10/5/5), giving 50 + 25 + 25 = 100. `MOCK_PAPERS` (lib/acca/mocks.ts) labels them Section
//   A / Section B / Section B in exactly that order.
// · 3h 15m — `MOCK_PAPERS` afm-paper-1 `duration_minutes: 195`.
// · 20% of every answer — 20 of the paper's 100 marks, corroborated by the 80-mark technical
//   sum above.
//
// ── THE MOCK FIGURES ARE AFM'S OWN, NOT BORROWED ────────────────────────────
// Both quoted lines in the timed-mock section come from AFM Mock Paper 1's own runs:
// · the marker line — `docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md:27-30`, the blind
//   candidate's Q3(i) on Aldebrino (`b201`): 95.00/96.80 against the code-owned 94.85/96.65,
//   €132,000 against €168,000, 4.95% against 4.80%.
// · the pacing line — VERBATIM from the 31/07 sit-loop walk
//   (`docs/APM_MARKETING_POSITIONING.md:92-94`), which was run on AFM Mock Paper 1 and then
//   scoped-deleted with the paper re-proved virgin (`docs/AFM_SURFACED.md:147`). "A combined
//   budget of 39 minutes" reconciles to this paper exactly: Aldebrino is 20 technical marks →
//   25 with PS, and 195 min ÷ 100 marks × 20 = 39.
// ⚠ THE SAME RUN APPEARS TWICE ON THIS PAGE, DELIBERATELY AND NOT AS TWO CLAIMS. The PROOF_ROW
// is the ARGUMENT (your own cross-check reconciles just as cleanly at the wrong rate); the
// mock card is the PRODUCT'S OUTPUT about it (the marker names the step). One finding, two
// registers. If either is ever edited, edit both — they must not drift into disagreeing about
// the same numbers.
//
// ── THE THREE DO-NOT-CLAIM ITEMS (banked, `APM_MARKETING_POSITIONING.md`) ───
// · Error-carried-forward: built, unwired. Nothing here claims Gradd carries a wrong figure
//   forward for the student — "the marks after it were still earnable" is exam-technique
//   coaching (ACCA's own OFR convention), not a product capability claim.
// · No AFM exam case beyond the verified 5. Every mention says "5 practice cases", never
//   "cases" unscoped, and never implies section C/D case coverage that does not exist.
// · No PS COACHING claim. The professional-skills section says Gradd MARKS the skills and
//   names the evidence — never "trains", "coaches" or "teaches" a skill.
//
// ⚠ NO CODE-OWNS-THE-MARKS CLAIM. Code owns every figure in DRILL GENERATION; MARKING is
// model-graded (code owns band→marks, the model owns the band and authors the feedback prose).
// ⚠ NO COMPLETE-SYLLABUS CLAIM. C and D are unbuilt and the page says so, in the section that
// makes the coverage claim rather than in a footnote.
// ✅ RESIT BAND, ADDED 2026-08-08. It was omitted because `lib/acca/resit-engine.ts` was
// written in APM's own terms and there was no AFM equivalent — a real-looking band pointing
// at nothing being worse than no band. There is one now: the engine's three data constants
// are keyed by paper, AFM has its own eight topic groups and its own six habit questions
// (evidenced against the AFM examiner reports F1/F2/F3/F6/F9/F11, NOT ported from APM), and
// the surface is live at `/acca/afm/resit`. This was AFM's only missing free entry point.
// ════════════════════════════════════════════════════════════════════════════

// AFM's auth hops carry `?paper=AFM` through `/acca/auth` → `/auth/callback` so the
// destination lands on AFM rather than the default paper.
const AFM_AUTH_FREE = `/acca/auth?next=${encodeURIComponent('/acca?paper=AFM')}`;
const AFM_AUTH_SUBSCRIBE = `/acca/auth?next=${encodeURIComponent('/acca/subscribe?paper=AFM')}`;

export const AFM_ACCA_LANDING: AccaLandingConfig = {
  paper: 'AFM',
  freeCta: { label: 'Start free', href: AFM_AUTH_FREE },

  nav: {
    links: [
      { label: 'ACCA APM', href: '/acca/apm' },
      // A real, live AFM walkthrough — the slot APM fills with its resit diagnostic. AFM has
      // no diagnostic; it does have this, and it is the honest thing to put here.
      { label: 'See a walkthrough', href: '/acca/afm/proof' },
      { label: 'The approach', scrollTo: 'taught' },
      { label: "What's included", scrollTo: 'features' },
      { label: 'Pricing', scrollTo: 'pricing' },
    ],
    quiet: [
      // THE ACCA GROUP VIEW, NOT `?subject=afm`, AND NOT THE BARE ARCHIVE (Grant, 2026-08-11).
      // `?subject=afm` is now a recognised value, but there are no AFM posts yet and it would
      // render "No posts yet." to every reader who clicks Blog on this page. `/blog` is no
      // longer IB-titled, but it is the mixed archive, and no ACCA surface should hand a
      // reader an archive of IB posts. `?subject=acca` is both: non-empty today (the nine APM
      // posts, whose technique content applies to any Strategic Professional paper) and
      // neutral between the papers. Repoint at `?subject=afm` when the first AFM post lands.
      { label: 'Blog', href: '/blog?subject=acca' },
      { label: 'Sign in', href: AFM_AUTH_FREE },
    ],
    primary: { label: 'Start free', href: AFM_AUTH_FREE },
  },

  hero: {
    eyebrow: { paper: 'ACCA AFM', exam: 'Advanced Financial Management' },
    // ⚠️ MEASURED, NOT CHOSEN BY EAR. The first draft ran "Failed AFM? The model was right." +
    // "The execution wasn’t." — five display lines at 1440 against APM's three, and because
    // `.underline::after` spans the SPAN's box rather than its last line, a short final line
    // ("wasn’t.") left a rust bar running most of the width with nothing above it. This is
    // three lines with two near-equal emphasised ones, which is APM's shape exactly. The full
    // sentence still gets said — it is the sub-head, immediately below.
    h1: { lead: 'Failed AFM?', underline: 'The execution, not the model.' },
    sub: 'AFM is not passed by learning new models — by the time you sit it, you already know them. It is passed by executing them without a slip, under a clock: the right direction, the right period, the assumption you actually developed. Gradd finds exactly where the execution broke, then Ezra coaches the fix until it stops happening.',
    note: 'Built on the live S26–J27 syllabus. Unlimited access to all 63 drills · 3 full Ezra teach-throughs included · No card required.',
    ctas: [
      { label: 'Start free — every drill, no card', href: AFM_AUTH_FREE, variant: 'rust' },
      { label: 'See a real walkthrough', href: '/acca/afm/proof', variant: 'ghost' },
    ],
    microcopy: 'Marked in about a minute — not a self-graded model answer or a three-day wait. Free to start with a quick email sign-in.',
    meta: ['Every drill free', 'No card to start', 'Upgrade for cases, marking and mock'],
    // AFM'S OWN TRANSCRIPT. It is a hedge-direction/basis exchange — sell 96 contracts, is
    // 4.95% already right? — which is AFM's own failure shape. APM's hero transcript is a
    // report-evaluation exchange and shares nothing with it but the format.
    artefact: {
      kind: 'CHAT',
      ariaLabel: 'Ezra withholding a model answer while coaching an AFM requirement',
      name: 'Ezra',
      courseTitle: 'Hedging the interest-rate exposure',
      courseSub: 'ACCA AFM · Requirement (b)',
      turns: [
        { role: 'student', text: 'The company should hedge with futures — I’ve calculated the effective rate at 4.95%.' },
        {
          role: 'tutor',
          badge: 'Hint',
          paragraphs: [[
            'You’ve got a rate — but is it an ',
            { em: 'instruction' },
            ' the board could act on? Buy or ',
            { strong: 'sell' },
            '? Which contract month?',
          ]],
        },
        { role: 'student', text: 'September futures, sold 96 contracts short. But the rate itself — is 4.95% not already right?' },
        { role: 'tutor', paragraphs: [['Check your basis period again. That’s exactly where AFM’s own examiner reports say this mark is lost.']] },
      ],
      inputPlaceholder: 'Reply to Ezra…',
      footer: 'The answer stays sealed · Ezra online 24/7',
      caption: 'The answer stays sealed. Ezra teaches until your answer is strong enough to score.',
    },
  },

  // The AFM counterpart to APM's band. The lead names the mode the AFM engine actually leads
  // on — carrying your own calculated figure into the argument (F9, the one failure mode with
  // no APM analogue, because only a numeric paper can fail that way).
  resitBand: {
    ariaLabel: 'Free resit diagnostic',
    eyebrow: 'Free resit diagnostic',
    heading: { text: 'Failed AFM? Find out exactly why —', em: 'in 3 minutes.' },
    lead: "Your result slip tells you the score. It doesn't tell you whether the arithmetic was the problem at all. Answer three quick steps — your score, how each area went, and six honest questions about how you write — and get a personalised resit plan. Most AFM marks are lost after the calculation: the figure is right and the discussion never uses it. No sign-up needed to see your plan.",
    cta: { label: 'Get my free resit plan', href: '/acca/afm/resit', variant: 'rust' },
  },

  sections: [
    // AFM's proof story, and the reason PROOF_ROW is not a compare row: this is one attempt
    // being read three ways, not three providers answering the same question. The run is
    // `docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md` — an authentic blind sit of AFM Mock
    // Paper 1, Q3(i). Component scores are that fixture's own table: 7 components, 2 pass.
    {
      kind: 'PROOF_ROW',
      ariaLabel: 'Why AFM is an execution test',
      eyebrow: 'The real test',
      heading: { text: 'AFM is not a knowledge test. It is an', em: 'execution test.' },
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
    {
      kind: 'CARD_TRIO',
      id: 'taught',
      ariaLabel: 'Taught, not just marked',
      eyebrow: { a: 'The approach', b: 'Taught, not just marked' },
      heading: { text: 'Taught, not just', em: 'marked.' },
      lead: 'AFM’s numbers are usually right — five examiner reports in a row say so. What fails is precision under a clock: an unstated direction, a wrong period, a discussion abandoned once a calculation goes wrong. Gradd finds exactly where the execution broke, and Ezra coaches the fix.',
      cards: [
        { num: '01 / Diagnosis', title: 'Finds the exact step that broke.', body: 'Ezra doesn’t hand you the reference working — he finds precisely where your figure diverged and coaches from there. The answer stays sealed until you’ve earned it.' },
        { num: '02 / Marking', title: 'Marks the instruction, not just the outcome.', body: 'A hedge answer is a set of instructions to the board — direction, contract month, whole number of contracts — not just a final figure. Gradd checks every component AFM’s own examiner reports say candidates miss.' },
        { num: '03 / Failure modes', title: 'Trained on how AFM answers actually fail.', body: 'Ten minutes spent on a calculation nobody asked for. A discussion abandoned after one wrong number, when the marks after it were still earnable. An assumption listed but never developed. The exact patterns five AFM examiner reports name, coached out of you.' },
      ],
    },
    {
      kind: 'STEPS',
      ariaLabel: 'How a teach-through works',
      eyebrow: 'The loop',
      heading: { text: 'How a teach-through', em: 'works.' },
      steps: [
        'Attempt the drill.',
        'Ezra marks it against the requirement.',
        'He names the failure mode.',
        'You repair the answer.',
        'Only then is the model answer revealed.',
      ],
    },
    // The marking panel's DENOMINATOR is AFM's own: Solenne Industries SA is this paper's
    // Section A case and carries 10 professional-skills marks (40 technical + 10 PS = 50),
    // verified above. The panel is an illustration of a marked case, not a statistic — the
    // numerator is the value consistent with the two bands it shows.
    {
      kind: 'SKILLS_PANEL',
      ariaLabel: 'Professional-skills marking',
      eyebrow: 'Professional skills',
      heading: { text: 'The marks examiners say are', em: 'chronically missed.' },
      lead: 'A fifth of every AFM answer is professional skills. Five examiner reports in a row flag the same gap: assumptions accepted without challenge, a director’s claim taken at face value, a stated board constraint ignored. Gradd marks them against AFM’s own published descriptors — and names the evidence.',
      tiles: [
        { title: 'Communication', body: 'Structure, a decisive conclusion, report style.' },
        { title: 'Analysis & evaluation', body: 'Developed points, a recommendation that follows from your own figures.' },
        { title: 'Scepticism', body: 'Challenging assumptions, a director’s claim, a stated constraint.' },
        { title: 'Commercial acumen', body: 'Business impact, scenario-specific application.' },
      ],
      panel: {
        ariaLabel: 'Professional-skills marking panel showing evidence-cited feedback',
        title: 'Professional skills',
        score: '7',
        of: '/10',
        rows: [
          { skill: 'Scepticism', verdict: 'strong', tone: 'strong', evidence: '“challenged the stated 4% return target against the board’s own constraint, rather than accepting the director’s figure at face value…”' },
          { skill: 'Analysis & evaluation', verdict: 'competent', tone: 'mid', evidence: '“states both NPV outcomes but stops short of a recommendation — the report ends without a decision…”' },
        ],
      },
      caption: 'Marked against AFM’s own published professional-skills descriptors, with the evidence named.',
    },
    // THE COVERAGE BOUNDARY IS STATED HERE, in the section that makes the coverage claim —
    // not in a footnote and not implied away. C and D are unbuilt.
    {
      kind: 'CARD_GRID',
      id: 'features',
      ariaLabel: 'What is included',
      eyebrow: "What's included",
      // "AWARDED", NOT "guaranteed". The sentence is about where the DRILLS are built — the
      // sections every sitting draws from, which is exactly what the lead below then says. Read
      // as written, though, "the marks are guaranteed" is a promise about the student's result:
      // a checkable outcome claim on a paper for which there is no outcome data, made in the
      // section that otherwise takes care to state its own coverage boundary ("No
      // complete-syllabus claim", one card down). Unrelated to the FR1 hedging-register ruling
      // — that is the hero panel — and unrelated to the two "14-day money-back guarantee" hits,
      // which are the commercial sense and stay.
      heading: { text: 'Built where the marks are', em: 'awarded.' },
      lead: 'Every AFM sitting draws a question from sections B and E — investment appraisal, financing, treasury and risk. That is where Gradd is built out first.',
      cards: [
        { tag: 'Drills', title: '63 exam-style drills.', body: 'Live across investment appraisal & financing, treasury & risk management, and ethics & advisory — sections B, E and A. M&A and reorganisation (C, D) are next. No complete-syllabus claim.' },
        { tag: 'Cases', title: '5 practice cases.', body: 'Multi-exhibit, multi-requirement scenarios, marked as one case — not eight disconnected question marks.' },
        { tag: 'Marking', title: 'Professional-skills marking.', body: 'On your whole answer, with evidence-cited feedback per skill, against AFM’s own published descriptors.' },
        { tag: 'Mock', title: 'AFM Mock Paper 1.', body: 'One 50-mark case plus two 25-mark questions, sat and timed as one paper — the same 3h 15m clock the real exam gives you.' },
      ],
    },
    // ── THE TIMED MOCK ── Every figure sourced; see the header block for the full provenance
    // of the two quoted lines. Both are AFM Mock Paper 1's own output.
    {
      kind: 'CARD_GRID',
      ariaLabel: 'The timed mock',
      eyebrow: 'The timed mock',
      heading: { text: 'Sit the paper. Find out', em: 'where the marks — and the minutes — went.' },
      lead: 'One 50-mark case and two 25-markers, 3h 15m, one clock, marked as one paper. What comes back is not a score.',
      cards: [
        { tag: 'Turnaround', title: 'Marked in about a minute.', body: 'Every requirement, technical and professional skills, per-case subtotals, one paper total. Unlimited attempts. Two tutor-marked mocks elsewhere cost €59.98 and come back three days later, on a PDF.' },
        {
          tag: 'Diagnosis',
          title: 'The figure, and the step.',
          body: 'The marker names where your working diverged — not just that it did.',
          quote: '“You used 95.00 and 96.80 rather than 94.85 and 96.65, so your gain was €132,000 not €168,000, so your rate was 4.95% not 4.80%.”',
        },
        {
          tag: 'Pacing',
          title: 'Where the minutes went.',
          body: 'Requirement by requirement, against the marks available.',
          quote: '“End-of-paper collapse. Between submitting Q2 (ii) and finishing, 12 minutes elapsed across Q3 (i)–Q3 (ii), against a combined budget of 39 minutes.”',
          limit: 'Measured submission to submission — not time on task.',
        },
        { tag: 'Routing', title: 'It routes you back.', body: 'The debrief points at drills on the syllabus area you lost marks on. Weak or competent bands only — a requirement that scored gets nothing.' },
      ],
    },
    // ── THE COMPARISON TABLE ── AFM's own competitor set. LearnSignal IS named on the spoke
    // (the pillar states the shape of the offer without naming a provider) and its figures are
    // `APM_MARKETING_POSITIONING.md`'s COMPETITOR CLAIMS: €29.99 each, two per paper → €59.98,
    // PDF, tutor-marked, three days. ACCA's own Practice Platform is free and self-graded —
    // that is the honest first column, and it is the one most AFM candidates actually use.
    {
      kind: 'COMPARE_TABLE',
      ariaLabel: 'How Gradd compares',
      eyebrow: 'How it compares',
      heading: { text: 'Marked in a minute —', em: 'not a self-check or a three-day wait.' },
      rowLabels: [
        'Marks your written answer',
        'Marking turnaround',
        'Names the step where your figure diverged',
        'Professional skills, against AFM’s own descriptors',
        'Full timed mock paper',
        'Attempts',
        'Cost for the sitting',
      ],
      columns: [
        {
          label: 'ACCA’s Practice Platform',
          values: ['You do — against a model answer', 'Instant, self-graded', false, false, 'Past papers, unmarked', 'Unlimited', 'Free'],
        },
        {
          label: 'LearnSignal mocks',
          values: ['A tutor, on a PDF', 'Three days', 'Tutor’s discretion', 'Tutor’s discretion', 'Two per paper', 'Two per paper', '€59.98 for the two'],
        },
        {
          label: 'Gradd',
          values: [
            'Ezra, against the requirement',
            'About a minute',
            true,
            true,
            'AFM Mock Paper 1, marked as one paper',
            'Unlimited',
            '€99 for the whole sitting',
          ],
          gradd: true,
        },
      ],
      scrollHint: 'Scroll to see more →',
    },
  ],

  pricing: {
    id: 'pricing',
    ariaLabel: 'Pricing',
    eyebrow: 'Pricing',
    heading: { text: 'Free to start. AFM access when you need it —', em: 'priced on its own.' },
    lead: 'Drills are free so you can test the method. Upgrade when you want full coaching, the practice cases, marking and the mock.',
    tiers: [
      {
        name: 'Free',
        currency: '€',
        amount: '0',
        tagline: 'Unlimited access to all 63 drills · 3 full Ezra teach-throughs included · No card required.',
        features: ['Every AFM drill, unlimited', '3 full teach-throughs with Ezra', 'No card, no commitment'],
        cta: { label: 'Start free', href: AFM_AUTH_FREE, variant: 'ghost' },
      },
      {
        name: '90-day exam pass',
        currency: '€',
        amount: '99',
        per: 'one-time · 90 days',
        tagline: 'Full access through your sitting — drills, cases, marking and the timed mock.',
        features: [
          'Unlimited teach-throughs with Ezra',
          '5 practice cases + professional-skills marking',
          'AFM Mock Paper 1, marked as one paper',
          'One payment — no recurring charge',
        ],
        cta: { label: 'Get the 90-day pass', href: AFM_AUTH_SUBSCRIBE, variant: 'rust' },
        badge: 'Best for one sitting',
        featured: true,
      },
      {
        name: 'Monthly',
        currency: '€',
        amount: '49',
        per: '/ month',
        tagline: 'Everything in the pass, month to month.',
        features: [
          'Unlimited teach-throughs with Ezra',
          '5 practice cases + professional-skills marking',
          'AFM Mock Paper 1, marked as one paper',
          'Cancel any time',
        ],
        cta: { label: 'Subscribe monthly', href: AFM_AUTH_SUBSCRIBE, variant: 'ghost' },
        badge: 'Flexible',
        badgeMuted: true,
      },
    ],
    // NOT "14-day money-back guarantee" — that is APM's line and there is no AFM equivalent
    // on the record. The honest AFM note is the per-paper pricing rule.
    note: 'AFM only, priced on its own — no bundle, no APM add-on required.',
  },

  faq: {
    id: 'faq',
    ariaLabel: 'Frequently asked questions',
    eyebrow: 'FAQ',
    heading: { text: 'Questions,', em: 'answered.' },
    items: [
      { q: 'Is this based on the current AFM syllabus?', a: 'Yes — S26–J27, verified against the official study guide.' },
      { q: 'How is this different from a general AI chatbot?', a: 'Structured drills and cases built from the syllabus, five years of AFM examiner failure modes, sealed reference answers, and professional-skills marking against AFM’s own published descriptors — not a chat window.' },
      { q: 'Can I use it if I failed before?', a: 'Yes — built for exactly that: finding the execution slip that lost you the marks, not just the topic.' },
      { q: 'Does it give model answers?', a: 'Yes — after you’ve attempted, been coached, and repaired your answer.' },
      { q: 'What’s free?', a: 'All 63 drills, 3 full teach-throughs, no card.' },
      { q: 'What do I pay for?', a: 'Unlimited teach-throughs, 5 practice cases, professional-skills marking, AFM Mock Paper 1.' },
    ],
  },

  finalCta: {
    ariaLabel: 'Get started',
    pill: 'Every drill free · No card',
    heading: { text: 'Preparing for the', em: 'next AFM sitting?' },
    lead: 'Start with every drill free — no card. Upgrade when you commit to the sitting.',
    cta: { label: 'Start free', href: AFM_AUTH_FREE, variant: 'rust' },
    small: 'Every drill free · €99 for 90 days or €49/month · AFM only, priced on its own',
  },

  footer: {
    copyright: '© 2026 · AI tutor for ACCA AFM',
    links: [
      { label: 'ACCA APM', href: '/acca/apm' },
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Cookies', href: '/cookies' },
      // ACCA-wide, matching this page's nav — see the note there.
      { label: 'Blog', href: '/blog?subject=acca' },
      { label: 'Contact', href: 'mailto:hello@gradd.ai' },
    ],
    disclaimer: 'Gradd.ai is an independent learning platform and is not affiliated with or endorsed by ACCA (the Association of Chartered Certified Accountants).',
  },
};

// ════════════════════════════════════════════════════════════════════════════
// ACCA — THE PILLAR. What gradd.ai root serves, unconditionally.
//
// This is where qualification-level search intent lands ("ACCA tutor", "ACCA Strategic
// Professional practice") and where cross-sell happens: a student who came for APM discovers
// AFM exists. The two SPOKES sell a paper each; this page sells the qualification and ROUTES.
//
// ── THE ARGUMENT IS ITS OWN, AND IT IS NOT "TAUGHT, NOT JUST MARKED" ────────
// That is the SPOKES' line — both of them carry it as a CARD_TRIO heading — and a root that
// repeats it teaches a visitor nothing they will not read again one click later. The pillar's
// argument is the market fact underneath all of it: AT STRATEGIC PROFESSIONAL, NOBODY MARKS
// WHAT YOU WRITE. Sourced, not asserted — `docs/APM_MARKETING_POSITIONING.md` "SURFACED FROM
// BUILD", LEAD LINE (31/07/2026): ACCA's own Practice Platform supplies a model answer and the
// candidate self-grades; a tuition provider's mocks are EUR 29.99 each, two per paper, PDF,
// tutor-marked, three-day turnaround; everything else is a question bank.
//
// ── WHAT THE PILLAR OMITS, AND WHY THAT IS NOT AN OVERSIGHT ─────────────────
// · `resitBand` — the resit diagnostic is the pillar's CLOSING band instead (see finalCta),
//   which is where it already sat, and the APM-scoping ruling below applies to it there.
// · `faq` — the pillar has never had one. Omitting renders nothing; INVENTING six
//   qualification-level Q&As would be authoring marketing claims nobody has ruled on, and a
//   wrong answer in a FAQPage rich result is worse than no rich result. Flagged for Grant.
// · `hero.note` / `hero.microcopy` — the spokes' note is a per-paper facts line ("all 91
//   drills"), and the pillar has two papers with different counts. The counts live in the
//   stat strip and on the paper cards, stated per paper, where they are true.
//
// ── EVERY NUMBER ON THIS PAGE, AND WHERE IT CAME FROM ───────────────────────
// Carried across verbatim from `ACCAPillarPage.tsx`, whose provenance block this reproduces:
// · 91 APM drills / 63 AFM drills / 154 total — queried LIVE against production 2026-08-05:
//   `acca_drills` where exam_board='ACCA', status='approved', published=true. The two spoke
//   configs above state 91 and 63 independently; if either moves, all three move together.
// · 5 practice cases per paper / 10 total, 2 mock papers — same query against `acca_cases`
//   (8 published rows per paper, 3 of them `mock_only`; 3 mock_only cases = one mock paper).
// · "About a minute" to mark a paper — 58s and 60s across two end-to-end runs
//   (`APM_MARKETING_POSITIONING.md`, claim 2).
// · EUR 59.98 / three days — same doc, COMPETITOR CLAIMS + LEAD LINE. The provider is NOT
//   named here (it is named on the AFM spoke); the pillar states the shape of the offer.
// · 1.95 minutes per mark, 195 minutes, 100 marks — `lib/acca/pacing.ts` MINUTES_PER_MARK,
//   which is ACCA's own arithmetic, not a house benchmark.
// · The pacing quote is VERBATIM from the 31/07/2026 end-to-end walk (⚠ 12 MINUTES, NOT 7 —
//   the source doc explicitly corrects an earlier draft at line 96: "Use the real numbers or
//   none.") and is the SAME line the two spokes quote. One run, three pages, one wording.
// · EVERY figure in the proof section is checked against
//   `docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md`, line by line:
//     · 96 contracts, SOLD ............... §Q3(i)/2 "N=96 contracts", "should sell 96"
//     · both scenarios reconcile 4.95% ... §Q3(i) Summary table, both rows 4.95%
//     · 0.15 unexpired basis omitted ..... header: candidate takes 100 − prevailing rate
//     · closing price 94.85 vs 95.00 ..... header component table
//     · effective rate 4.80% vs 4.95% .... header component table (abs ±0.05 band)
//     · 2 of 7 pass, 5 fail, one cause ... header: "2 pass, 5 fail, and every one of the 5
//                                          failures is that same omission"
//     · the cross-check cannot catch it .. header §"The candidate's own self-check does NOT
//                                          discriminate" — the omitted 0.15 applies
//                                          identically to both legs
//
// ── THE RESIT CLOSE ROUTES TO BOTH PAPERS (ruled 2026-08-08) ────────────────
// It once read "Failed a paper?" unqualified, was corrected to name APM because there was no
// AFM diagnostic to send anyone to, and is now paper-neutral because there is one.
//
// THE APM-ONLY SCOPING HAD BECOME THE SAME DEFECT ONE LEVEL UP. Root is where a stranger
// lands, and AFM's whole problem was having no free entry point; a close that offered only
// APM's diagnostic sent an AFM resitter to a diagnostic for a paper they are not sitting —
// which, because the two engines' topic-group ids and lo_code prefixes collide, would have
// profiled them against APM's corpus rather than failing visibly.
//
// TWO destinations, equal weight: /acca/resit and /acca/afm/resit. The lead earns the split
// rather than just presenting it — the habits that lose marks differ by paper, which is why
// there are two diagnostics and not one with a dropdown.
//
// The old "Start free instead" secondary is displaced by AFM's button. Nothing is stranded:
// the free CTA still appears in the nav, the hero, the paper cards and the pricing block.
//
// ⚠ PRICING IS PER PAPER (ruled 2026-08-03) and this page says so three times — in the hero
// meta, in the paper-cards lead, and in the pricing note. Under the old bundle a pillar could
// have implied one purchase covered everything; that is now false, and saying so HERE, before
// the student reaches a spoke, is what stops them assuming it. The paid tiers therefore route
// to the paper cards rather than to a checkout: there is no paper-agnostic thing to buy.
// ⚠ NO CODE-OWNS-THE-MARKS CLAIM, same as both spokes. Code owns every figure in DRILL
// GENERATION; MARKING is model-graded.
// ════════════════════════════════════════════════════════════════════════════

// The pillar's free CTA carries no `?paper=` — a visitor who has not chosen a paper yet lands
// on the default. Choosing is what the paper cards are for.
const ACCA_AUTH_FREE = '/acca/auth?next=/acca';

export const ACCA_PILLAR_LANDING: AccaLandingConfig = {
  paper: 'ACCA',
  freeCta: { label: 'Start free', href: ACCA_AUTH_FREE },

  nav: {
    // The two ANCHOR links drop out below 860px with `.nav-links`; the PAPER links do not,
    // because they are the pillar's whole job. That is why they sit in `quiet` (the
    // always-visible right-hand group) rather than here — the ruling from the page this
    // replaces, kept by putting each link in the group whose behaviour it needs.
    links: [
      { label: 'Papers', scrollTo: 'papers' },
      { label: 'How it compares', scrollTo: 'compare' },
      { label: 'Pricing', scrollTo: 'pricing' },
    ],
    quiet: [
      { label: 'APM', href: '/acca/apm' },
      { label: 'AFM', href: '/acca/afm' },
    ],
    primary: { label: 'Start free', href: ACCA_AUTH_FREE },
  },

  hero: {
    eyebrow: { paper: 'ACCA Strategic Professional', exam: 'APM + AFM' },
    h1: { lead: 'Nobody marks', underline: 'what you write.' },
    // TWO paragraphs, and the order is the argument: the state of practice first, what Gradd
    // does about it second. Merged into one they read as a grievance; reversed they read as a
    // boast with no problem attached.
    sub: [
      'At Strategic Professional that is simply the state of practice. ACCA’s own Practice Platform hands you a model answer and asks you to grade yourself. Two tutor-marked mocks from a tuition provider cost €59.98 and come back three days later, on a PDF. Everything else is a question bank.',
      'Gradd marks the answer you actually wrote — in about a minute, as many times as you want, and it names the step where your figure diverged.',
    ],
    ctas: [
      { label: 'Start free', href: ACCA_AUTH_FREE, variant: 'rust' },
      { label: 'See a real walkthrough', href: '/acca/afm/proof', variant: 'ghost' },
    ],
    meta: ['Every drill free', 'No card to start', 'Bought per paper'],
    // THE PILLAR'S ARTEFACT IS A MARKED ANSWER, NOT A CONVERSATION — the spokes sell a tutor,
    // this page sells marking, and the first screen has to show the thing it is selling. It
    // renders in the SAME `.mark-panel` frame the spokes' professional-skills section uses.
    artefact: {
      kind: 'PANEL',
      ariaLabel: 'A marking panel naming the exact step where a candidate’s figure diverged',
      title: 'Marked',
      sub: 'ACCA AFM · Mock Paper 1 · Q3 (i)',
      rows: [
        {
          label: 'Technical',
          verdict: 'competent',
          tone: 'mid',
          quoted: true,
          body: '“Contract count, sell direction and both rate scenarios are right. The closing futures price omits the 0.15 unexpired basis, so the hedge locks 4.95% where the answer is 4.80%.”',
        },
        {
          label: 'Scepticism',
          verdict: 'strong',
          tone: 'strong',
          quoted: true,
          // "LOCKED IN", NOT "guaranteed" — authored copy, so the FR1 register ruling applies.
          // This panel is a WRITTEN illustration in the marker's voice, not a captured marking
          // run: it lives in a landing config, cites no drill id and no marking row, and its
          // sibling row above already uses the post-FR1 verb ("the hedge LOCKS 4.95%"). The
          // scenario it depicts is irhedge futures — the exact family FR1 swept — where K1's
          // question went from "guaranteed effective borrowing cost" to "locked in" and all 4
          // drills × 5 fields were left with zero hits. Copy that sells that content should not
          // reintroduce the word the content retired.
          body: '“States the basis-risk limitation outright rather than presenting the two-scenario reconciliation as proof the rate is locked in.”',
        },
      ],
      foot: 'Marked in about a minute · unlimited attempts',
      caption: 'The answer you wrote, marked — not a model answer you grade yourself.',
    },
  },

  // resitBand DELIBERATELY OMITTED — the resit diagnostic is this page's CLOSING band. See
  // the header block.

  sections: [
    // ── 1. WHAT IS LIVE ── A strip, not a section: four counts between the hero and the
    // argument. Every figure is queried, not estimated; see the header block.
    {
      kind: 'STAT_STRIP',
      ariaLabel: 'What is live today',
      label: 'Live today',
      stats: [
        { value: '154', label: 'drills live across two papers' },
        { value: '10', label: 'practice exam cases' },
        { value: '2', label: 'timed mock papers' },
        { value: '~1 min', label: 'to mark a whole paper' },
      ],
    },
    // ── 2. THE PROOF ── The pillar's own version of the shape both spokes open with, and the
    // reading is the pillar's rather than either paper's: not "this candidate described
    // instead of judging" (APM) or "the execution broke" (AFM), but "the candidate could not
    // have caught this alone, so somebody has to mark it".
    {
      kind: 'PROOF_ROW',
      ariaLabel: 'The proof',
      eyebrow: { a: 'The proof', b: 'AFM Mock Paper 1' },
      heading: { text: 'The answer that checked itself, and was', em: 'still wrong.' },
      lead: 'A candidate sat AFM Mock Paper 1 blind, with no access to any answer-side field. On the interest-rate futures hedge the contract count was right, the sell direction was right, and both the rate-rise and rate-fall scenarios reconciled to the same 4.95% — which is precisely the self-check the requirement asks for. It confirmed the wrong answer.',
      numbers: [
        { value: '96', body: 'contracts, sold — the count and the direction are both right. This is the near-correct script, not the zero script.' },
        { value: '0.15pp', body: 'is the whole error. The unexpired basis was never taken off the closing futures price, so the hedge locks 4.95% where the answer is 4.80%.' },
        { value: '2 of 7', body: 'components pass on tolerance. All five failures trace to that one missed step — not five separate errors.' },
      ],
      weak: {
        label: 'What the candidate wrote',
        body: '96 contracts, sold. Loan interest, futures gain and net cost all priced consistently off the candidate’s own closing price. Both scenarios land on 4.95%, and the script reads as confirmed.',
      },
      diagnosis: {
        label: 'Why the cross-check cannot catch it',
        body: 'The omitted 0.15 applies identically to the rate-rise and the rate-fall leg. The reconciliation is invariant to the omission — it lands just as cleanly on the wrong rate as on the right one.',
      },
      coached: {
        label: 'What marking has to say',
        body: 'The unexpired basis was never subtracted. Closing price 94.85, not 95.00; effective rate 4.80%, not 4.95%. One conceptual step, named — rather than five red components handed back as five errors.',
      },
      caption: 'Self-grading against a model answer shows a 0.15 gap. It does not tell you the gap is the basis, or that one step closes all five.',
    },
    // ── 3. PACING ── The sage band. The claim is about what a PDF structurally cannot do,
    // which is the pillar's argument again in a second register.
    {
      kind: 'FEATURE_PANEL',
      ariaLabel: 'Pacing',
      eyebrow: { a: 'Pacing', b: 'What a PDF cannot do' },
      heading: { text: 'A tutor marking a PDF three days later cannot know', em: 'when you wrote each answer.' },
      lead: 'Gradd can, because every requirement is submitted separately and timestamped. The debrief measures each submission-to-submission interval against the paper’s own arithmetic — 195 minutes, 100 marks, 1.95 minutes per mark — and reports what happened.',
      bullets: [
        ['Intervals are submission-to-submission, never “time spent writing” — reading and thinking sit inside the interval, and the report says so.'],
        ['The first requirement carries no ratio: its interval contains reading the whole Section A scenario and its exhibits.'],
        ['A requirement never reached is reported as ', { em: 'not reached' }, ', not as blank. Different findings, different next actions.'],
      ],
      panel: {
        kind: 'PANEL',
        ariaLabel: 'A pacing report showing an end-of-paper collapse finding',
        title: 'Pacing',
        sub: 'AFM Mock Paper 1 · 8 requirements',
        rows: [
          {
            label: 'End-of-paper collapse',
            verdict: 'high',
            tone: 'mid',
            quoted: true,
            body: '“Between submitting Q2 (ii) and finishing, 12 minutes elapsed across Q3 (i)–Q3 (ii), against a combined budget of 39 minutes. The final 2 requirements recorded no answer that could earn marks.”',
          },
          {
            // NOT a band — see `PanelRow.tone`. "no ratio" says a budget could not be
            // computed for this interval, which is neither good nor bad news.
            label: 'Q1 (i) — reading + first requirement',
            verdict: 'no ratio',
            tone: 'flat',
            body: 'Reported without a ratio on purpose: this interval contains the Section A scenario and its exhibits, so a marks-derived budget would mean nothing.',
          },
        ],
        foot: 'Measured from submission timestamps · 1.95 minutes per mark',
      },
    },
    // ── 4. HOW IT COMPARES ── The lead argument in its most checkable form. No competitor is
    // named and no competitor price is invented beyond the one the positioning doc records;
    // "varies by provider" is the honest cell for question banks.
    {
      kind: 'COMPARE_TABLE',
      id: 'compare',
      ariaLabel: 'How Gradd compares',
      eyebrow: 'The state of practice',
      heading: { text: 'Everyone tests you. Almost nobody', em: 'marks you.' },
      lead: 'A question bank tells you whether a number matched. It cannot tell you that your answer stopped short of the judgement the verb asked for, or which step sent the figure wrong.',
      rowLabels: [
        'Who marks your written answer',
        'Turnaround',
        'Names where your figure diverged',
        'Times each requirement against its budget',
        'Attempts',
        'Cost for one sitting',
      ],
      columns: [
        {
          label: 'ACCA Practice Platform',
          values: ['You do — against a model answer', 'Instant, self-graded', false, false, 'Unlimited', 'Free'],
        },
        {
          label: 'Tuition-provider mocks',
          values: ['A tutor, on a PDF', 'Three days', 'Tutor’s discretion', false, 'Two per paper', '€59.98 for the two'],
        },
        {
          label: 'Question banks',
          values: ['Nobody', '—', false, false, 'Unlimited', 'Varies by provider'],
        },
        {
          label: 'Gradd',
          values: ['Ezra, against the requirement', 'About a minute', true, true, 'Unlimited', '€99 per paper'],
          gradd: true,
        },
      ],
      scrollHint: 'Scroll to see more →',
    },
    // ── 5. THE PAPERS ── The pillar's own job, on the sage band, immediately before pricing:
    // the price is per paper, so the choice has to be made first.
    {
      kind: 'PAPER_CARDS',
      id: 'papers',
      ariaLabel: 'Papers',
      eyebrow: 'Two papers live',
      heading: { text: 'Pick the paper you are', em: 'sitting.' },
      lead: 'Each paper is bought on its own. The drills, the cases and the mock belong to that paper — there is no shared bank and no bundle.',
      cards: [
        {
          code: 'APM',
          name: 'Advanced Performance Management',
          status: 'Live',
          blurb: 'Ezra diagnoses why an answer lost marks — describing a model instead of applying it, stopping short of the judgement the verb demanded — then coaches the fix until the answer would score.',
          live: '91 drills, free to attempt · 5 practice exam cases · professional-skills marking · a timed mock, marked as one paper.',
          cta: { label: 'APM in detail', href: '/acca/apm', variant: 'rust' },
        },
        {
          code: 'AFM',
          name: 'Advanced Financial Management',
          status: 'Live',
          blurb: 'The senior-adviser register: your arithmetic is usually fine, but the ADVICE would not survive a boardroom. Ezra pushes from a correct number to a committed recommendation.',
          live: '63 drills, free to attempt · 5 practice exam cases · professional-skills marking · a timed mock, marked as one paper.',
          cta: { label: 'AFM in detail', href: '/acca/afm', variant: 'rust' },
        },
      ],
    },
  ],

  pricing: {
    id: 'pricing',
    ariaLabel: 'Pricing',
    eyebrow: 'Pricing',
    heading: { text: 'Free to start. Then priced', em: 'per paper.' },
    lead: 'Every drill on both papers is free to attempt. Coaching, exam cases, marking and the timed mock are bought on the paper you are sitting.',
    tiers: [
      {
        name: 'Free',
        currency: '€',
        amount: '0',
        // "BOTH PAPERS", NOT "the paper" — this card used to contradict its own lead four lines
        // up. The lead is the correct one: the free tier is not paper-scoped. The spokes say
        // "Every APM drill" / "Every AFM drill" and stay correct: a spoke describes its own
        // paper, and neither claims the free tier stops there.
        //
        // ⚠️ THIS COMMENT USED TO CARRY A VERIFICATION, AND THE VERIFICATION WAS OF THE WRONG
        // ROUTE (corrected 2026-08-22). It read: "The drill serve
        // (app/api/acca/next-drill/route.ts) gates on AUTHENTICATION ONLY — 401 for a signed-out
        // request and no entitlement check of any kind after it … So a free account can attempt
        // all 154 drills on both papers."
        //
        // Every clause about `next-drill` was true. The CONCLUSION was false, because
        // `next-drill` is the SELECTOR — it decides which drill to show. ATTEMPTING one goes
        // through `POST /api/acca/tutor`, which was never checked, and which returned 403
        // `cap_hit` at §6 once a free user had spent three teach-throughs. The claim on this
        // card was therefore false for every free user past their third, and the comment
        // asserting otherwise is what told the next reader not to look.
        //
        // The route is fixed (the counter now gates COACHING, not entry — lib/acca/teach-access.ts,
        // `npm run test:teach-access`), so the copy below is once again true. It has NOT been
        // changed: the offer was right and the code was wrong.
        //
        // 📐 THE CLASS, banked as doctrine P-V1 (GENERATOR_DOCTRINE.md): A VERIFICATION RECORDED
        // AS A JUSTIFICATION MUST NAME THE ROUTE IT ACTUALLY TESTED. A comment that says "I
        // checked X, therefore Y" spends its credibility on Y while only ever evidencing X, and
        // a future reader re-checking Y will read the comment and stop. Name the file, name what
        // it proves, and name what it does NOT reach.
        tagline: 'Every drill on both papers, unlimited, plus three full teach-throughs with Ezra. No card.',
        features: ['Every drill on both papers, unlimited', '3 full teach-throughs with Ezra', 'No card, no commitment'],
        cta: { label: 'Start free', href: ACCA_AUTH_FREE, variant: 'ghost' },
      },
      {
        name: 'Exam pass',
        currency: '€',
        amount: '99',
        per: 'one-time · 90 days',
        tagline: 'Unlimited coaching, exam cases, professional-skills marking and the timed mock, through your sitting.',
        features: [
          'Unlimited teach-throughs with Ezra',
          'Exam cases + professional-skills marking',
          'The timed mock, marked as one paper',
          'One payment — no recurring charge',
        ],
        // THERE IS NOTHING PAPER-AGNOSTIC TO BUY, so this cannot be a checkout link. It goes
        // to the paper cards, which is the choice that has to happen first.
        cta: { label: 'Pick your paper', href: '#papers', variant: 'rust' },
        badge: 'Best for one sitting',
        featured: true,
      },
      {
        name: 'Monthly',
        currency: '€',
        amount: '49',
        per: '/ month',
        tagline: 'The same access, month to month.',
        features: [
          'Unlimited teach-throughs with Ezra',
          'Exam cases + professional-skills marking',
          'The timed mock, marked as one paper',
          'Cancel any time',
        ],
        cta: { label: 'Pick your paper', href: '#papers', variant: 'ghost' },
        badge: 'Flexible',
        badgeMuted: true,
      },
    ],
    note: 'Prices are per paper. Buying APM does not include AFM.',
  },

  // faq DELIBERATELY OMITTED — see the header block.

  finalCta: {
    ariaLabel: 'Free resit diagnostic — APM and AFM',
    pill: 'Free · 3 minutes · no sign-up',
    heading: { text: 'Failed APM or AFM? Find out', em: 'exactly why.' },
    lead: 'Your result slip gives you a score. It does not name the habit that cost the marks. Three quick steps — your score, how each area went, and six honest questions about how you write — and you get the areas to drill and the habits to fix first. Each paper has its own diagnostic: the habits that lose marks in APM are not the ones that lose them in AFM.',
    // BOTH 'rust', deliberately. The renderer draws cta and secondary identically and takes
    // the weight from `variant` alone, so a rust-plus-ghost pair would read as "APM, or else"
    // — the same APM-first bias one level up that this change exists to remove. Two doors of
    // equal weight; the pillar has no opinion about which paper you sat.
    cta: { label: 'APM resit diagnostic', href: '/acca/resit', variant: 'rust' },
    secondary: { label: 'AFM resit diagnostic', href: '/acca/afm/resit', variant: 'rust' },
    small: 'Every drill free · €99 per paper for 90 days, or €49/month · No card to start',
  },

  footer: {
    copyright: '© 2026 · AI tutor for ACCA Strategic Professional',
    // THE /ib LINK IS LOAD-BEARING, not a courtesy. This page IS gradd.ai home, and since the
    // hub (whose nav carried it) was deleted, nothing else on gradd.ai links to /ib. Remove it
    // and the IB landing is unreachable and uncrawlable from every page on the site.
    links: [
      { label: 'ACCA APM', href: '/acca/apm' },
      { label: 'ACCA AFM', href: '/acca/afm' },
      { label: 'IB Diploma', href: '/ib' },
      { label: 'Terms', href: '/terms' },
      { label: 'Privacy', href: '/privacy' },
      { label: 'Cookies', href: '/cookies' },
      // THE GROUP VIEW, because this page sells both papers and names neither. The bare
      // /blog is the mixed ACCA+IB archive; sending the ACCA pillar's readers there put them
      // in front of five IB posts under (until 2026-08-11) an "IB exam clarity" title.
      { label: 'Blog', href: '/blog?subject=acca' },
      { label: 'Contact', href: 'mailto:hello@gradd.ai' },
    ],
    disclaimer: 'Gradd.ai is an independent learning platform and is not affiliated with or endorsed by ACCA (the Association of Chartered Certified Accountants). Scenarios are original works built to the public syllabus structure.',
  },
};
