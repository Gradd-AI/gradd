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

// AFM — early-access honest. Coverage states EXACTLY what is live (16 drills, four
// calculators). CTA threads ?paper=AFM through the existing auth flow so the post-signup
// dashboard lands on AFM (the first-run banner then handles the first drill).
export const AFM_LANDING: ProductLandingConfig = {
  paper: 'AFM',
  examName: 'Advanced Financial Management',
  eyebrow: 'ACCA AFM · early access',
  // Explicit rather than inherited: AFM states ITS OWN offer, so the page does not depend on
  // whatever a shared default happens to say. The default is deliberately the weakest true
  // statement (see DEFAULT_PRICING_HEADING) — a paper that wants to name a price owns it here.
  pricingHeading: 'Free to start. AFM access when you need it — priced on its own.',
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
  // ── CORRECTED 2026-08-03: the paid line asserted the retired BUNDLE ─────────
  // It read: "One ACCA pass covers every paper you sit: APM and AFM together, one
  // subscription." Per-paper pricing was ruled 2026-08-03 — APM and AFM are separate SKUs —
  // so that sentence was selling something the product no longer offers, on a live page.
  // It was the MORE explicit of the two bundle claims on this card (the other was the
  // heading, now paper-neutral in the template), and fixing only the heading would have
  // left the page stating the bundle outright one line below a corrected title.
  pricing: {
    free: 'Free to start — every live AFM drill, with Ezra teach-throughs. No card required.',
    paid: 'Then €99 for a sitting-dated AFM pass, or €49/month. Each ACCA paper is priced separately.',
  },
  freeCta: {
    label: 'Start free — every live drill',
    href: `/acca/auth?next=${encodeURIComponent('/acca?paper=AFM')}`,
  },
  footnote: 'Gradd is not affiliated with or endorsed by ACCA. Scenarios are original works built to the public syllabus structure.',
  proof: { label: 'See a real walkthrough', href: '/acca/afm/proof' },
};

// ── APM_LANDING v2 (feat/apm-template-conversion) ───────────────────────────
// A VERBATIM inventory of components/landing/ACCALandingPage.tsx, now against the
// EXTENDED schema: sections[] replacing the flat points[] grid, judgement{}/compareStrip{}
// replacing the single comparison{} slot, plus heroMicrocopy/heroMeta, mockup hint-badge +
// input-row, pricingNote and finalCta.fineprint. v1 (superseded, see git history on this
// branch) was the same inventory against the PRE-extension schema and lost 15 of the 20
// elements `compare-apm-landing.ts` probes for — every one of those 15 has a home here.
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
  stepsHeading: 'How a teach-through works.',
  steps: [
    { title: 'Attempt the drill.' },
    { title: 'Ezra marks it against the requirement.' },
    { title: 'He names the failure mode.' },
    { title: 'You repair the answer.' },
    { title: 'Only then is the model answer revealed.' },
  ],
  // ── THE FIX for LOSS 2: judgement + compareStrip, both live, neither displacing
  // the other. ─────────────────────────────────────────────────────────────────
  judgement: {
    eyebrow: 'The real test',
    heading: 'APM is not a knowledge test. It is a judgement paper.',
    lead: 'APM is one of ACCA’s toughest papers, with pass rates consistently around 40% — among the lowest in the ACCA qualification. The candidates who fail rarely lack knowledge — they answer without applying, evaluating or judging.',
    weak: { label: 'Weak answer', body: 'Target costing helps a business reduce costs by setting a target cost based on the market price.' },
    diagnosis: { label: 'Diagnosis', body: 'Knows the model. No scenario application, no limitation, no judgement.' },
    coached: { label: 'Coached answer', body: 'Target costing fits here because the market price is fixed by customer expectations, so the product must be designed backwards from an acceptable margin. However, if the cost gap cannot close without cutting quality, the strategy risks the premium positioning — so the board should set a floor on specification before committing.' },
    caption: 'The difference is not knowledge. It is application, limitation, judgement.',
  },
  compareStrip: {
    eyebrow: 'How it compares',
    heading: 'Taught, marked and mocked — for one sitting price.',
    columns: [
      { label: 'Question banks', body: 'Practice, no teaching; you mark yourself.' },
      { label: 'Human tuition', body: 'One hour at a time.' },
      { label: 'Gradd', body: 'Taught, marked and mocked, €99 for the whole sitting.', featured: true },
    ],
  },
  // ── THE FIX for the hero chat / mark panel: hint badge + input row + captions. ──
  mockups: [
    {
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
    {
      kind: 'panel',
      ariaLabel: 'Professional-skills marking panel showing evidence-cited feedback',
      title: 'Professional skills',
      rows: [
        { label: 'Scepticism', verdict: 'strong', body: '“challenged the covering note’s ‘record revenue’ framing against falling ROCE and EPS…”' },
        { label: 'Communication', verdict: 'competent', body: '“reads as notes, not a board report — no structure, conversational register…”' },
      ],
    },
  ],
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
