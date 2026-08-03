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
  OPTIONAL_SECTIONS, POINTS_GRID_TEMPLATE,
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
  steps: [{ title: 's1', body: 'b1' }, { title: 's2', body: 'b2' }, { title: 's3', body: 'b3' }],
  stepsHeading: 'How a teach-through works',
  comparison: {
    eyebrow: 'e', heading: 'How Gradd compares', intro: 'i',
    columns: [
      { label: 'Weak', tone: 'weak', items: ['x'] },
      { label: 'Diagnosis', tone: 'neutral', items: ['y'] },
      { label: 'Coached', tone: 'strong', items: ['z'] },
    ],
  },
  mockups: [
    { kind: 'chat', ariaLabel: 'chat', title: 'Ezra', subtitle: 'Requirement (b)',
      turns: [{ role: 'student', lines: ['l1'] }, { role: 'tutor', lines: ['l2', 'l3'] }], footer: 'foot' },
    { kind: 'panel', ariaLabel: 'marks', rows: [{ label: 'Scepticism', verdict: 'Strong', body: 'body' }] },
  ],
  finalCta: { pill: 'p', heading: 'Start', body: 'b',
    ctas: [{ label: 'Free', href: '/f' }, { label: 'Pricing', href: '/p', variant: 'ghost' }] },
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
ok('a comparison with no columns is ABSENT',
  !hasSection({ ...MINIMAL, comparison: { heading: 'h', columns: [] } }, 'comparison'));
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

// ── BREAK MODE 5: AFM REGRESSES ────────────────────────────────────────────
// This change-set is FORBIDDEN from altering AFM's rendering. AFM must therefore hit the
// minimal path on every branch — asserted against the real exported config, not a copy.
ok('AFM_LANDING renders NO optional section', visibleSections(AFM_LANDING).length === 0,
  visibleSections(AFM_LANDING).join(','));
ok('AFM_LANDING still uses the simple pricing card', pricingModel(AFM_LANDING).mode === 'simple');
ok('AFM_LANDING emits no FAQ JSON-LD', buildFaqJsonLd(AFM_LANDING) === null);
// AFM sets its own heading (fixed in 184a16b, ahead of this template work), so it no longer
// inherits the default. The durable assertion is not "which string" but "no bundle claim" —
// that is the property that must survive any future copy edit to either.
ok('AFM_LANDING states its OWN pricing heading rather than inheriting the default',
  !!AFM_LANDING.pricingHeading && pricingModel(AFM_LANDING).heading === AFM_LANDING.pricingHeading);

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
ok('AFM_LANDING requests no client chrome — no scroll listener ships',
  !hasSection(AFM_LANDING, 'backToTop') && !hasSection(AFM_LANDING, 'stickyHeaderShadow'));

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
ok('MINIMAL renders no comparison grid', !minimalHtml.includes('plp-compare-grid'));
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
ok('FULL renders the comparison and the CTA band',
  fullHtml.includes('plp-compare-grid') && fullHtml.includes('plp-band'));
ok('FULL renders both mock-ups', fullHtml.includes('plp-turn--tutor') && fullHtml.includes('plp-panel-verdict'));
ok('FULL renders the final CTA', fullHtml.includes('plp-final'));
ok('FULL does NOT render the simple price card (tiers replaced it)', !fullHtml.includes('plp-price-card'));

// AFM through the real renderer — the byte-identical claim, checked against output.
const afmHtml = bodyOf(AFM_LANDING);
ok('AFM output contains no optional-section markup',
  !afmHtml.includes('plp-faq-list') && !afmHtml.includes('plp-tier-grid') &&
  !afmHtml.includes('plp-step-list') && !afmHtml.includes('plp-totop') &&
  !afmHtml.includes('ld+json'));
ok('AFM output still contains its simple price card, carrying its OWN heading',
  afmHtml.includes('plp-price-card') && afmHtml.includes(AFM_LANDING.pricingHeading!));
ok('AFM output contains no bundle claim anywhere in the rendered body',
  !BUNDLE_CLAIM.test(afmHtml.replace(/<[^>]+>/g, ' ')));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} product-landing: ${pass} passed, ${fail} failed\n`);
// P-G4: exitCode, never process.exit().
process.exitCode = fail === 0 ? 0 : 1;
