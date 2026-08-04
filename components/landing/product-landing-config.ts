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

// ── APM_LANDING v1 (feat/apm-template-conversion) ───────────────────────────
// A VERBATIM inventory of components/landing/ACCALandingPage.tsx, poured into the
// CURRENT ProductLandingConfig shape — before any schema extension. This is deliberately
// the "before" config: everything the current fields CAN hold is filled in verbatim
// (nothing paraphrased); everything they cannot hold is simply absent, because there is no
// field for it yet. `npm run compare:apm-landing` is the ruler that turns that absence into
// a number instead of a guess.
//
// Two structural losses are already visible just from filling this in:
//   1. points[] is ONE FLAT ARRAY, so the three live sections that have their own eyebrow +
//      heading + lead ("Taught, not just marked", "The 20% most candidates never practise",
//      "Everything the paper demands") can only contribute their CARDS here — 3 + 4 + 4 = 11
//      cards, with no section-level heading/eyebrow/lead attached to any of them. That is
//      the exact "11 undifferentiated cards" this batch exists to fix.
//   2. comparison{} is ONE SLOT, and the live page has TWO comparison-shaped sections: the
//      judgement (weak/diagnosis/coached) card and the "how it compares" competitor strip.
//      Only one can occupy the slot — the competitor strip is picked below because its
//      shape (label + one line) fits `columns[].items` more honestly than the judgement
//      card's three-paragraph-plus-arrows layout would. The judgement card is a total loss
//      in this version; there is nowhere left to put it.
// Both are fixed by the SECTION GROUPS + split-comparison schema extension that follows.
export const APM_LANDING: ProductLandingConfig = {
  paper: 'APM',
  examName: 'Advanced Performance Management',
  eyebrow: 'ACCA APM · Advanced Performance Management',
  headline: 'Failed APM? Fix the reason you lost marks.',
  subhead:
    'APM is not passed by memorising models. It is passed by applying them to the scenario, evaluating properly, showing scepticism and writing commercially. Gradd diagnoses why your answer lost marks, then Ezra coaches you until your answer is strong enough to score.',
  // Best current home for the hero-note line — the template has no separate "hero note"
  // field, only `coverage` (rendered under a bold "What's live:" prefix the live page does
  // not have). Content survives; the exact presentation does not.
  coverage:
    'Built on the live S26–J27 syllabus. Unlimited access to all 91 drills · 3 full Ezra teach-throughs included · No card required.',
  // ── LOSS 1: 11 flattened cards, no section eyebrow/heading/lead survives ────
  points: [
    { title: 'Finds the gap in your thinking.', body: 'Ezra doesn’t hand you the model answer — he diagnoses exactly where your attempt stalled and teaches from there. The answer stays sealed until you’ve earned it.' },
    { title: 'Marks like the examiner.', body: 'Every case is marked against ACCA’s published professional-skills descriptors — communication, analysis & evaluation, scepticism, commercial acumen. The 20% of the paper most candidates never practise.' },
    { title: 'Trained on how candidates actually fail.', body: 'Answering the wrong question, describing instead of applying, listing instead of developing — the exact failure modes the examiner’s reports cite, coached out of you.' },
    { title: 'Communication', body: 'Structure, clarity, report style.' },
    { title: 'Analysis & evaluation', body: 'Developed points, judgement, prioritisation.' },
    { title: 'Scepticism', body: 'Challenge assumptions, limitations, reliability.' },
    { title: 'Commercial acumen', body: 'Business impact, practical recommendations.' },
    { title: '91 exam-style drills.', body: 'Every examinable learning outcome in the live S26–J27 syllabus covered.' },
    { title: 'Full exam cases.', body: 'Multi-exhibit, multi-requirement, CBE-style. Section A 50-markers and Section B 25-markers.' },
    { title: 'Professional-skills marking.', body: 'On your whole answer, with evidence-cited feedback per skill.' },
    { title: 'A full timed mock.', body: '3h 15m, one clock, three cases, marked as one paper.' },
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
    { label: 'Blog', href: '/blog?subject=apm' },
    { label: 'Sign in', href: '/acca/auth?next=/acca' },
  ],
  // ── The resit-funnel band maps cleanly — this section already fits. ────────
  secondaryCta: {
    eyebrow: 'Free resit diagnostic',
    heading: 'Failed APM? Find out exactly why — in 3 minutes.',
    body: 'Your result slip tells you the score. It doesn’t tell you the habit that lost the marks. Answer three quick steps — your score, how each syllabus area went, and six honest questions about how you write — and get a personalised resit plan: the areas to drill, the habits to fix first, and where to start. No sign-up needed to see your plan.',
    cta: { label: 'Get my free resit plan', href: '/acca/resit' },
  },
  // ── "How a teach-through works" also fits: single-line steps, no body. ─────
  // The type still requires `body`, so this is empty string — the exact "renders an empty
  // <p>" defect LandingStep.body's optionality (schema-extension step) exists to fix.
  stepsHeading: 'How a teach-through works.',
  steps: [
    { title: 'Attempt the drill.', body: '' },
    { title: 'Ezra marks it against the requirement.', body: '' },
    { title: 'He names the failure mode.', body: '' },
    { title: 'You repair the answer.', body: '' },
    { title: 'Only then is the model answer revealed.', body: '' },
  ],
  // ── LOSS 2: the ONE comparison slot goes to the competitor strip. The judgement
  // card (weak/diagnosis/coached, with its own caption) has nowhere left to go. ─
  comparison: {
    eyebrow: 'How it compares',
    heading: 'Taught, marked and mocked — for one sitting price.',
    columns: [
      { label: 'Question banks', tone: 'weak', items: ['Practice, no teaching; you mark yourself.'] },
      { label: 'Human tuition', tone: 'neutral', items: ['One hour at a time.'] },
      { label: 'Gradd', tone: 'strong', items: ['Taught, marked and mocked, €99 for the whole sitting.'] },
    ],
  },
  // The professional-skills mark panel fits the existing 'panel' mockup shape. The hero
  // chat mock-up fits the 'chat' shape for its TURNS ONLY — there is no field for the hint
  // badge on a turn or for the input-row placeholder, so both are absent here.
  mockups: [
    {
      kind: 'chat',
      ariaLabel: 'Ezra withholding a model answer while coaching an APM requirement',
      title: 'Ezra',
      subtitle: 'ACCA APM · Requirement (b)',
      turns: [
        { role: 'student', lines: ['Retention fell from 82% to 74% and revenue per member is down 4%, so the company is underperforming and the board should act on retention.'] },
        { role: 'tutor', lines: ['You’ve analysed the company — but the requirement asks you to evaluate the report. Does the board’s pack let them see any of what you just worked out? That’s where the marks are.'] },
        { role: 'student', lines: ['…so I anchor every point to the report against a criterion, not the performance itself?'] },
        { role: 'tutor', lines: ['Exactly. Fluent answers to the wrong question are the biggest mark-loser on this requirement type. Go again.'] },
      ],
      footer: 'The answer stays sealed · Ezra online 24/7',
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
  // No field carries a note under the tier grid — the "14-day money-back guarantee." line
  // has nowhere to go in this version. See `pricingNote` in the schema extension.
  faqs: [
    { q: 'Is this based on the current APM syllabus?', a: 'Yes — S26–J27, verified against the official guide.' },
    { q: 'How is this different from a general AI chatbot?', a: 'Structured drills and cases built from the syllabus, examiner failure modes, sealed model answers, and professional-skills marking against ACCA’s published professional-skills descriptors — not a chat window.' },
    { q: 'Can I use it if I failed before?', a: 'Yes — built for exactly that: understanding why your answers didn’t score.' },
    { q: 'Does it give model answers?', a: 'Yes — after you’ve attempted, been coached, and repaired your answer.' },
    { q: 'What’s free?', a: 'All 91 drills, 3 full teach-throughs, no card.' },
    { q: 'What do I pay for?', a: 'Unlimited teach-throughs, full exam cases, professional-skills marking, the timed mock.' },
  ],
  // The final CTA's heading/body/CTA fit; the fine-print line under it ("Every drill free ·
  // €99 for 90 days or €49/month · 14-day money-back guarantee") does not — `body` is
  // already the lead paragraph, and the type has no second line.
  finalCta: {
    pill: 'Every drill free · No card',
    heading: 'Preparing for the next APM sitting?',
    body: 'Start with every drill free — no card. Upgrade when you commit to the sitting.',
    ctas: [{ label: 'Start free', href: '/acca/auth?next=/acca' }],
  },
  chrome: { backToTop: true, stickyHeaderShadow: true },
};
