// scripts/test-product-landing.ts — fixtures for the generalised product-landing template.
// Pure: no DB, no model, no network. Run: npm run test:product-landing
//
// P-G3: every break mode is NAMED. The property this suite exists to protect is NEGATIVE —
// an omitted section must render NOTHING, not an empty shell — and that is exactly what a
// careless implementation gets wrong while still typechecking and still looking fine on the
// one config someone tested.
//
// It asserts against `product-landing-sections.ts`, THE SAME MODULE THE COMPONENT ASKS.
// Testing a re-stated condition here would test this file's copy of the rule, not the
// page's — the `sitCaseGate` lesson.

import ProductLandingPage from '../components/landing/ProductLandingPage';
import {
  hasSection, visibleSections, isMinimalConfig, pricingModel, buildFaqJsonLd,
  OPTIONAL_SECTIONS, POINTS_GRID_TEMPLATE, withDynamicCta,
} from '../components/landing/product-landing-sections';
import {
  AFM_LANDING, DEFAULT_PRICING_HEADING, type ProductLandingConfig,
} from '../components/landing/product-landing-config';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\nproduct-landing — a paper is a config, and an omitted section is nothing\n');

// ── The MINIMAL config: only the required fields. This is AFM's shape. ───────
const MINIMAL: ProductLandingConfig = {
  paper: 'TST',
  examName: 'Test Paper',
  eyebrow: 'eyebrow',
  headline: 'headline',
  subhead: 'subhead',
  coverage: 'coverage',
  points: [{ title: 'a', body: 'b' }],
  pricing: { free: 'free line', paid: 'paid line' },
  freeCta: { label: 'Start', href: '/start' },
  footnote: 'footnote',
};

// ── The FULL config: every optional section populated. ──────────────────────
const FULL: ProductLandingConfig = {
  ...MINIMAL,
  nav: [{ label: 'Nav', href: '/nav' }],
  proof: { label: 'Proof', href: '/proof' },
  pricingHeading: 'Per paper.',
  pricingTiers: [
    { name: 'Free', amount: '€0', tagline: 't', features: ['f1'], cta: { label: 'Go', href: '/g' } },
    { name: 'Pass', amount: '€99', period: 'one-time', tagline: 't', features: ['f1', 'f2'],
      cta: { label: 'Buy', href: '/b' }, badge: 'Best for one sitting', featured: true },
    { name: 'Monthly', amount: '€49', period: '/month', tagline: 't', features: ['f1'], cta: { label: 'Sub', href: '/s' } },
  ],
  faqs: [{ q: 'Q1?', a: 'A1.' }, { q: 'Q2?', a: 'A2.' }],
  secondaryCta: { eyebrow: 'e', heading: 'Failed before?', body: 'b', cta: { label: 'Diagnose', href: '/resit' } },
  steps: [{ title: 's1' }, { title: 's2', body: 'b2' }, { title: 's3', body: 'b3' }],
  stepsHeading: 'How a teach-through works',
  sections: [
    { eyebrow: 'e1', heading: 'Group one', lead: 'l1', cards: [{ title: 'c1', body: 'b1' }], caption: 'cap1' },
    { heading: 'Group two', cards: [{ title: 'c2', body: 'b2' }, { title: 'c3', body: 'b3' }] },
  ],
  judgement: {
    eyebrow: 'e', heading: 'It is a judgement paper.', lead: 'l',
    weak: { label: 'Weak answer', body: 'x' },
    diagnosis: { label: 'Diagnosis', body: 'y' },
    coached: { label: 'Coached answer', body: 'z' },
    caption: 'The difference is judgement.',
  },
  compareStrip: {
    eyebrow: 'e', heading: 'How Gradd compares',
    columns: [
      { label: 'Question banks', body: 'x' },
      { label: 'Human tuition', body: 'y' },
      { label: 'Gradd', body: 'z', featured: true },
    ],
  },
  heroMicrocopy: 'micro',
  heroMeta: ['meta1', 'meta2'],
  mockups: [
    { kind: 'chat', ariaLabel: 'chat', title: 'Ezra', subtitle: 'Requirement (b)',
      turns: [{ role: 'student', lines: ['l1'] }, { role: 'tutor', lines: ['l2', 'l3'], badge: 'Hint' }],
      inputPlaceholder: 'Reply…', footer: 'foot', caption: 'mockup caption' },
    { kind: 'panel', ariaLabel: 'marks', rows: [{ label: 'Scepticism', verdict: 'Strong', body: 'body' }] },
  ],
  pricingNote: 'note',
  finalCta: { pill: 'p', heading: 'Start', body: 'b',
    ctas: [{ label: 'Free', href: '/f' }, { label: 'Pricing', href: '/p', variant: 'ghost' }],
    fineprint: 'fine print' },
  footerLinks: [{ label: 'X', href: '/x' }, { label: 'Contact', href: 'mailto:x@y.z' }],
  chrome: { backToTop: true, stickyHeaderShadow: true },
};

// ── BREAK MODE 1: AN OMITTED SECTION RENDERS AN EMPTY SHELL ─────────────────
// THE defect. A heading with nothing under it, a bordered container with no children, or —
// worst — a FAQPage JSON-LD block declaring zero questions. All of those "work".
ok('the MINIMAL config renders NO optional section', visibleSections(MINIMAL).length === 0,
  visibleSections(MINIMAL).join(','));
ok('isMinimalConfig identifies it', isMinimalConfig(MINIMAL));
ok('every optional section is individually absent on MINIMAL',
  OPTIONAL_SECTIONS.every((s) => hasSection(MINIMAL, s) === false));
ok('the FULL config renders EVERY optional section',
  visibleSections(FULL).length === OPTIONAL_SECTIONS.length,
  `${visibleSections(FULL).length}/${OPTIONAL_SECTIONS.length}`);
ok('isMinimalConfig is false for FULL', !isMinimalConfig(FULL));

// ── BREAK MODE 2: AN EMPTY ARRAY COUNTS AS PRESENT ─────────────────────────
// `faqs: []` is what a config looks like after someone strips the content and leaves the
// key. Treating that as "present" renders a heading over nothing and emits structured data
// asserting the page is an FAQPage with no questions — a false claim about the page.
ok('faqs: [] is ABSENT, not present', !hasSection({ ...MINIMAL, faqs: [] }, 'faqs'));
ok('steps: [] is ABSENT', !hasSection({ ...MINIMAL, steps: [] }, 'steps'));
ok('mockups: [] is ABSENT', !hasSection({ ...MINIMAL, mockups: [] }, 'mockups'));
ok('pricingTiers: [] is ABSENT', !hasSection({ ...MINIMAL, pricingTiers: [] }, 'pricingTiers'));
ok('sections: [] is ABSENT', !hasSection({ ...MINIMAL, sections: [] }, 'sections'));
ok('heroMeta: [] is ABSENT', !hasSection({ ...MINIMAL, heroMeta: [] }, 'heroMeta'));
ok('a compareStrip with no columns is ABSENT',
  !hasSection({ ...MINIMAL, compareStrip: { heading: 'h', columns: [] } }, 'compareStrip'));
ok('a judgement missing the coached card is ABSENT — a partial judgement card is a broken one',
  !hasSection({
    ...MINIMAL,
    judgement: {
      heading: 'h',
      weak: { label: 'w', body: 'wb' },
      diagnosis: { label: 'd', body: 'db' },
      coached: { label: 'c', body: '' },
    },
  }, 'judgement'));
ok('a finalCta with no ctas is ABSENT',
  !hasSection({ ...MINIMAL, finalCta: { heading: 'h', ctas: [] } }, 'finalCta'));
ok('a secondaryCta with no href is ABSENT',
  !hasSection({ ...MINIMAL, secondaryCta: { heading: 'h', cta: { label: 'l', href: '' } } }, 'secondaryCta'));

// ── BREAK MODE 3: THE FAQ SCHEMA DRIFTS FROM THE VISIBLE COPY ──────────────
// Both must come from ONE array. A second hand-maintained JSON-LD literal is how a page
// ends up with structured data describing questions it no longer shows.
const jsonld = buildFaqJsonLd(FULL);
ok('no FAQs → NULL, so no <script> is rendered at all', buildFaqJsonLd(MINIMAL) === null);
ok('empty FAQs → NULL (never an empty mainEntity)', buildFaqJsonLd({ ...MINIMAL, faqs: [] }) === null);
ok('the JSON-LD declares FAQPage', jsonld?.['@type'] === 'FAQPage');
ok('one mainEntity per configured FAQ, in order',
  jsonld?.mainEntity.length === FULL.faqs!.length &&
  jsonld?.mainEntity[0].name === 'Q1?' && jsonld?.mainEntity[1].name === 'Q2?');
ok('answers are carried verbatim from the same array',
  jsonld?.mainEntity[0].acceptedAnswer.text === 'A1.');
ok('every question is a schema.org Question with an Answer',
  (jsonld?.mainEntity ?? []).every((m) => m['@type'] === 'Question' && m.acceptedAnswer['@type'] === 'Answer'));

// ── BREAK MODE 4: PRICING SILENTLY DISAPPEARS ──────────────────────────────
// The worst failure available to this template. `pricing` stays required so there is always
// a fallback; tiers OVERRIDE rather than replace the contract.
const pMin = pricingModel(MINIMAL);
const pFull = pricingModel(FULL);
ok('no tiers → the simple card still renders', pMin.mode === 'simple');
ok('the simple card keeps the config lines',
  pMin.mode === 'simple' && pMin.free === 'free line' && pMin.paid === 'paid line');
ok('tiers → the tier grid renders', pFull.mode === 'tiers');
ok('the tier grid carries every configured tier',
  pFull.mode === 'tiers' && pFull.tiers.length === 3);
ok('EMPTIED tiers fall back to the simple card rather than rendering no price',
  pricingModel({ ...MINIMAL, pricingTiers: [] }).mode === 'simple');
ok('pricingHeading defaults to the string the template has always rendered',
  pMin.heading === DEFAULT_PRICING_HEADING);
ok('a configured pricingHeading overrides the default', pFull.heading === 'Per paper.');

// ── BREAK MODE 5: AFM_LANDING NOW USES THE FULL SECTION STRUCTURE ──────────
// SUPERSEDED 2026-08-04 (`feat/afm-landing-rebuild`): AFM used to be pinned to the minimal
// path as a byte-identical guarantee while the SCHEMA changed under it (the APM template
// conversion). That guarantee is now retired ON PURPOSE — this change-set's whole point is
// to rebuild AFM's CONTENT on the same rich structure APM_LANDING has: sections[],
// judgement, compareStrip, mockups, pricingTiers, faqs, finalCta, chrome. What must still
// hold, and is asserted below instead, is that AFM states its OWN argument (not APM's
// copy) and makes no bundle claim.
// 11 of 12, not 12 of 12: AFM_LANDING deliberately omits ONLY `secondaryCta` — APM's is the
// free resit diagnostic, a real live feature with no AFM equivalent (`lib/acca/
// resit-engine.ts` is written in APM's own terms). Every other optional section is present.
ok('AFM_LANDING now renders the full section structure (all but the APM-only resit band)',
  visibleSections(AFM_LANDING).length === OPTIONAL_SECTIONS.length - 1 &&
  !hasSection(AFM_LANDING, 'secondaryCta'),
  `${visibleSections(AFM_LANDING).length}/${OPTIONAL_SECTIONS.length}: ${visibleSections(AFM_LANDING).join(',')}`);
ok('AFM_LANDING uses the tier pricing grid, not the simple card', pricingModel(AFM_LANDING).mode === 'tiers');
ok('AFM_LANDING emits its OWN FAQ JSON-LD', buildFaqJsonLd(AFM_LANDING)?.mainEntity.length === AFM_LANDING.faqs!.length);
// AFM sets its own heading (fixed in 184a16b, ahead of this template work), so it no longer
// inherits the default. The durable assertion is not "which string" but "no bundle claim" —
// that is the property that must survive any future copy edit to either.
ok('AFM_LANDING states its OWN pricing heading rather than inheriting the default',
  !!AFM_LANDING.pricingHeading && pricingModel(AFM_LANDING).heading === AFM_LANDING.pricingHeading);
ok('AFM_LANDING states its OWN argument (execution/precision), never APM\'s ("judgement paper")',
  !/judgement paper/i.test(AFM_LANDING.judgement?.heading ?? '') &&
  /execution/i.test(AFM_LANDING.headline));

// ── BREAK MODE 5b: A BUNDLE CLAIM COMES BACK ───────────────────────────────
// Per-paper pricing was ruled 2026-08-03. Any copy asserting one purchase covers several
// papers is false, and it was live on the AFM card until 184a16b. The DEFAULT is the
// dangerous one: it is inherited by every config that does not override it, including one
// written by someone who never opens this file.
const BUNDLE_CLAIM = /(every|all)\s+(acca\s+)?papers?|one\s+(pass|subscription)\s+covers|apm\s+and\s+afm\s+together/i;
ok('DEFAULT_PRICING_HEADING makes no bundle claim', !BUNDLE_CLAIM.test(DEFAULT_PRICING_HEADING),
  DEFAULT_PRICING_HEADING);
ok('DEFAULT_PRICING_HEADING names no specific paper (it cannot know one)',
  !/\b(APM|AFM)\b/.test(DEFAULT_PRICING_HEADING), DEFAULT_PRICING_HEADING);
ok('AFM heading makes no bundle claim', !BUNDLE_CLAIM.test(AFM_LANDING.pricingHeading!),
  AFM_LANDING.pricingHeading);
ok('AFM paid line makes no bundle claim', !BUNDLE_CLAIM.test(AFM_LANDING.pricing.paid),
  AFM_LANDING.pricing.paid);
ok('the detector itself works — it catches the retired strings',
  BUNDLE_CLAIM.test('Free to start. One pass covers every ACCA paper.') &&
  BUNDLE_CLAIM.test('One ACCA pass covers every paper you sit: APM and AFM together, one subscription.'));
// SUPERSEDED 2026-08-04: AFM now requests the same chrome APM does, deliberately (part of
// the "same look and feel" rebuild) — the opposite of the pre-rebuild guarantee.
ok('AFM_LANDING now requests client chrome, same as APM_LANDING',
  hasSection(AFM_LANDING, 'backToTop') && hasSection(AFM_LANDING, 'stickyHeaderShadow'));

// ── BREAK MODE 6: THE POINTS GRID GOES BACK TO EXACTLY THREE ───────────────
// The original CSS hardcoded repeat(3, 1fr), so points[] could not be any length but three
// and nothing in the type said so.
ok('the points grid is not a fixed column count', !/repeat\(\s*\d+\s*,/.test(POINTS_GRID_TEMPLATE),
  POINTS_GRID_TEMPLATE);
ok('the points grid uses auto-fit with a min track', /auto-fit/.test(POINTS_GRID_TEMPLATE) && /minmax\(/.test(POINTS_GRID_TEMPLATE));
ok('a config may carry any number of points', [1, 2, 4, 7].every((n) => {
  const cfg = { ...MINIMAL, points: Array.from({ length: n }, (_, i) => ({ title: `t${i}`, body: 'b' })) };
  return cfg.points.length === n && visibleSections(cfg).length === 0;
}));

// ── BREAK MODE 7: CHROME TURNS ITSELF ON ───────────────────────────────────
// A template that silently adds interactive furniture to every page has changed a page
// nobody asked it to change. Both flags default OFF and must be opted into explicitly.
ok('chrome is off when the key is absent',
  !hasSection(MINIMAL, 'backToTop') && !hasSection(MINIMAL, 'stickyHeaderShadow'));
ok('chrome is off when the object exists but the flags do not',
  !hasSection({ ...MINIMAL, chrome: {} }, 'backToTop'));
ok('chrome is off when explicitly false',
  !hasSection({ ...MINIMAL, chrome: { backToTop: false, stickyHeaderShadow: false } }, 'backToTop'));
ok('each chrome flag is independent',
  hasSection({ ...MINIMAL, chrome: { backToTop: true } }, 'backToTop') &&
  !hasSection({ ...MINIMAL, chrome: { backToTop: true } }, 'stickyHeaderShadow'));

// ── BREAK MODE 8: THE PREDICATE IS RIGHT BUT THE MARKUP IS NOT ─────────────
// Everything above tests the DECISION. This tests the OUTPUT, because the two can diverge:
// a component can consult `hasSection` correctly and still emit a heading or a wrapper
// outside the guard. The only way to know is to render it.
//
// ⚠️ THE TRAP THIS SUITE HIT, recorded because it would have produced a green false
// positive: the template inlines its whole stylesheet in a <style> block, so EVERY class
// name — .plp-faq-list, .plp-tier-grid, .plp-totop — appears in the markup whether or not
// the section rendered. A naive `html.includes('plp-tier-grid')` returns true for the
// minimal config. The style element is stripped before any assertion below.
const React = require('react') as typeof import('react');
const { renderToStaticMarkup } = require('react-dom/server') as typeof import('react-dom/server');

const bodyOf = (config: ProductLandingConfig): string =>
  renderToStaticMarkup(React.createElement(ProductLandingPage, { config }))
    .replace(/<style[\s\S]*?<\/style>/g, '');   // the trap — see above

const minimalHtml = bodyOf(MINIMAL);
const fullHtml = bodyOf(FULL);

ok('MINIMAL renders no FAQ list', !minimalHtml.includes('plp-faq-list'));
ok('MINIMAL renders no FAQPage JSON-LD script', !minimalHtml.includes('ld+json'));
ok('MINIMAL renders no tier grid', !minimalHtml.includes('plp-tier-grid'));
ok('MINIMAL renders no step list', !minimalHtml.includes('plp-step-list'));
ok('MINIMAL renders no judgement grid', !minimalHtml.includes('plp-judgement-grid'));
ok('MINIMAL renders no compare strip', !minimalHtml.includes('plp-compare-strip-grid'));
ok('MINIMAL renders no section group', !minimalHtml.includes('plp-section-group-grid'));
ok('MINIMAL renders no hero meta strip', !minimalHtml.includes('plp-hero-meta'));
ok('MINIMAL renders no CTA band', !minimalHtml.includes('plp-band'));
ok('MINIMAL renders no mock-up', !minimalHtml.includes('plp-mockup-stack'));
ok('MINIMAL renders no final CTA', !minimalHtml.includes('plp-final'));
ok('MINIMAL renders no back-to-top button', !minimalHtml.includes('plp-totop'));
// The positive control. Without it, every assertion above would also pass on a component
// that rendered nothing at all — which is the classic way a negative suite goes green.
ok('MINIMAL still renders the REQUIRED sections',
  minimalHtml.includes('plp-hero') && minimalHtml.includes('plp-points-grid') &&
  minimalHtml.includes('plp-price-card') && minimalHtml.includes(MINIMAL.headline));

ok('FULL renders the FAQ list', fullHtml.includes('plp-faq-list'));
ok('FULL renders the FAQPage JSON-LD script', fullHtml.includes('ld+json') && fullHtml.includes('FAQPage'));
ok('FULL renders the tier grid and its badge',
  fullHtml.includes('plp-tier-grid') && fullHtml.includes('Best for one sitting'));
ok('FULL renders the ordered steps, numbered by the template',
  fullHtml.includes('plp-step-list') && fullHtml.includes('>1<') && fullHtml.includes('>3<'));
ok('FULL renders section groups (sections[] REPLACES the flat points grid) and NOT the flat grid',
  fullHtml.includes('plp-section-group-grid') && fullHtml.includes('Group one') && fullHtml.includes('Group two'));
ok('FULL does not render the flat points grid once sections[] is present',
  !fullHtml.includes('class="plp-points"'));
ok('FULL renders the judgement card AND the compare strip — both, neither displacing the other',
  fullHtml.includes('plp-judgement-grid') && fullHtml.includes('plp-compare-strip-grid'));
ok('FULL renders the CTA band', fullHtml.includes('plp-band'));
ok('FULL renders both mock-ups, the hint badge and the chat input row',
  fullHtml.includes('plp-turn--tutor') && fullHtml.includes('plp-panel-verdict') &&
  fullHtml.includes('plp-turn-badge') && fullHtml.includes('plp-chat-input'));
ok('FULL renders the hero microcopy and hero meta strip',
  fullHtml.includes('plp-hero-microcopy') && fullHtml.includes('plp-hero-meta'));
ok('FULL renders the pricing note and the final CTA fineprint',
  fullHtml.includes('plp-price-note') && fullHtml.includes('plp-final-fineprint'));
ok('FULL renders its configured footer links, including the mailto, in place of the default set',
  fullHtml.includes('href="/x"') && fullHtml.includes('href="mailto:x@y.z"') && !fullHtml.includes('href="/terms"'));
ok('FULL renders the final CTA', fullHtml.includes('plp-final'));
ok('FULL does NOT render the simple price card (tiers replaced it)', !fullHtml.includes('plp-price-card'));

// ── AFM through the real renderer, SUPERSEDED 2026-08-04 ('feat/afm-landing-rebuild') ──
// AFM now renders the SAME rich structure as FULL, and the assertions below check exactly
// that instead of the old "AFM stays minimal" claim. `class="..."` is used (not a bare
// substring) wherever a class name is also part of the inlined stylesheet text, per P-G3a —
// e.g. `.plp-points` is a real CSS rule regardless of which grid renders.
const afmHtml = bodyOf(AFM_LANDING);
ok('AFM output renders section groups (sections[] REPLACES the flat points grid), not the flat grid',
  afmHtml.includes('plp-section-group-grid') && !afmHtml.includes('class="plp-points"'));
ok('AFM output renders the judgement card AND the compare strip',
  afmHtml.includes('plp-judgement-grid') && afmHtml.includes('plp-compare-strip-grid'));
ok('AFM output renders the tier grid, not the simple price card',
  afmHtml.includes('plp-tier-grid') && !afmHtml.includes('plp-price-card'));
ok('AFM output renders the FAQ list and its JSON-LD', afmHtml.includes('plp-faq-list') && afmHtml.includes('ld+json'));
ok('AFM output renders the final CTA and hero microcopy/meta',
  afmHtml.includes('plp-final') && afmHtml.includes('plp-hero-microcopy') && afmHtml.includes('plp-hero-meta'));
ok('AFM output renders its OWN configured footer links, including /cookies and the mailto',
  afmHtml.includes('href="/cookies"') && afmHtml.includes('href="mailto:hello@gradd.ai"'));
ok('AFM output contains no bundle claim anywhere in the rendered body',
  !BUNDLE_CLAIM.test(afmHtml.replace(/<[^>]+>/g, ' ')));
// ── The two CONTENT CORRECTIONS, checked against actual output ─────────────
ok('AFM output states the VERIFIED drill count (63), not the old undercount (16)',
  afmHtml.includes('63') && !/\b16 exam-style drills\b/.test(afmHtml));
ok('AFM output makes NO code-owned-marking overclaim (drill generation ≠ marking)',
  !/computed and verified deterministically/i.test(afmHtml) &&
  !/so the marking is exact/i.test(afmHtml));
// ── withDynamicCta — the entitlement-aware CTA override (2026-08) ──────────
// PURE half of the entitlement-CTA feature; lib/acca/entitlement-cta.ts (the DB-reading
// half) is server-only and untestable here without a live client — fixtured separately in
// scripts/test-entitlement-cta.ts with fake auth/db clients.
// Own local config (not FULL) — FULL's nav has no "Sign in" entry to override, and this
// needs one to prove the label-match works and every OTHER nav entry is left alone.
const DYNAMIC = { label: 'Add AFM for your sitting', href: '/acca?paper=AFM' };
const CTA_CONFIG: ProductLandingConfig = {
  ...MINIMAL,
  freeCta: { label: 'Start free', href: '/start' },
  nav: [{ label: 'Blog', href: '/blog' }, { label: 'Sign in', href: '/acca/auth?next=/acca' }],
  pricingTiers: [
    { name: 'Free', amount: '€0', tagline: 't', features: ['f'], cta: { label: 'Start free', href: '/start' } },
    { name: 'Pass', amount: '€99', tagline: 't', features: ['f'], cta: { label: 'Buy', href: '/b' } },
    { name: 'Monthly', amount: '€49', tagline: 't', features: ['f'], cta: { label: 'Sub', href: '/s' } },
  ],
  finalCta: { heading: 'h', ctas: [{ label: 'Start free', href: '/start' }, { label: 'Pricing', href: '/p' }] },
};
const withCta = withDynamicCta(CTA_CONFIG, DYNAMIC);
ok('withDynamicCta overrides freeCta', withCta.freeCta.label === DYNAMIC.label && withCta.freeCta.href === DYNAMIC.href);
ok('withDynamicCta overrides the nav "Sign in" entry only, by label match',
  withCta.nav?.find((n) => n.href === DYNAMIC.href)?.label === DYNAMIC.label &&
  !withCta.nav?.some((n) => n.label === 'Sign in'));
ok('withDynamicCta leaves every OTHER nav entry untouched',
  withCta.nav?.some((n) => n.label === 'Blog' && n.href === '/blog'));
ok('withDynamicCta overrides ONLY the first (Free) pricing tier\'s cta',
  withCta.pricingTiers?.[0].cta.label === DYNAMIC.label &&
  withCta.pricingTiers?.[1].cta.label === 'Buy' && withCta.pricingTiers?.[2].cta.label === 'Sub');
ok('withDynamicCta overrides ONLY the first finalCta button',
  withCta.finalCta?.ctas[0].label === DYNAMIC.label && withCta.finalCta?.ctas[1].label === 'Pricing');
ok('withDynamicCta does not mutate the input config', CTA_CONFIG.freeCta.label === 'Start free');
const withCtaOnMinimal = withDynamicCta(MINIMAL, DYNAMIC);
ok('withDynamicCta on a config with no nav/pricingTiers/finalCta does not throw, freeCta still overrides',
  withCtaOnMinimal.freeCta.label === DYNAMIC.label && withCtaOnMinimal.nav === undefined);

// ── BREAK MODE 9: A CTA SLOT HARDCODES ITS OWN LABEL INSTEAD OF READING THE CONFIG ──
// THE actual live bug, caught by hand on gradd.ai/acca/apm the first time an entitled
// account loaded the page: the header's ALWAYS-RENDERED "Start free" button
// (ProductLandingPage.tsx's plp-nav, the one CTA slot withDynamicCta's own author missed)
// had "Start free" baked into JSX text, reading `c.freeCta.href` for the link but never
// `c.freeCta.label` for the text — so an entitled visitor saw a button correctly POINTING
// at their dashboard while still SAYING "Start free". A passing pure-logic test on
// withDynamicCta's return value could not catch this, because the bug was never in the
// data — only in one place the template forgot to read it. Render-level, against the
// SAME rendered output a browser gets, is the only way to prove this class of bug is gone.
const ctaHtml = bodyOf(withDynamicCta(CTA_CONFIG, DYNAMIC));
ok('every freeCta-linked button in the rendered header/hero/pricing/final CTA reads the DYNAMIC label — none still say the stale default',
  ctaHtml.includes(DYNAMIC.label) && !/>Start free</.test(ctaHtml));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} product-landing: ${pass} passed, ${fail} failed\n`);
// P-G4: exitCode, never process.exit().
process.exitCode = fail === 0 ? 0 : 1;
