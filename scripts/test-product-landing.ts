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
  AFM_LANDING, APM_LANDING, DEFAULT_PRICING_HEADING, type ProductLandingConfig,
} from '../components/landing/product-landing-config';
import crypto from 'node:crypto';

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
    // band: 'dark' here proves the band wrapper works on the PRE-EXISTING sections[] group,
    // not just the new section kinds — the explicit requirement of feat/landing-section-vocabulary.
    { eyebrow: 'e1', heading: 'Group one', lead: 'l1', cards: [{ title: 'c1', body: 'b1' }], caption: 'cap1', band: 'dark' },
    { heading: 'Group two', cards: [{ title: 'c2', body: 'b2' }, { title: 'c3', body: 'b3' }] },
  ],
  // ── feat/landing-section-vocabulary — the five new section kinds, all populated so FULL
  // stays the one canonical "every optional section renders" fixture. ──
  heroArtefact: {
    kind: 'chat', ariaLabel: 'hero mockup', title: 'Ezra', subtitle: 'Live preview',
    turns: [{ role: 'student', lines: ['hero line'] }],
  },
  statBar: {
    label: 'Trusted by', band: 'dark',
    stats: [{ value: '346', label: 'lessons' }, { value: '61', label: 'diagrams' }, { value: '24/7', label: 'access' }],
  },
  featureArtefacts: [
    {
      eyebrow: 'fa e', heading: 'Feature artefact one', lead: 'fa lead',
      bullets: ['bullet one', 'bullet two'],
      mockup: { kind: 'panel', ariaLabel: 'fa panel', rows: [{ label: 'Scepticism', body: 'fa body' }] },
    },
    {
      heading: 'Feature artefact two (reversed)', reverse: true, band: 'sage',
      mockup: { kind: 'chat', ariaLabel: 'fa chat', turns: [{ role: 'tutor', lines: ['fa chat line'] }] },
    },
  ],
  bigNumbers: {
    eyebrow: 'bn e', heading: 'Big numbers heading',
    items: [{ value: '63', body: 'drills' }, { value: '5', body: 'cases' }, { value: '100%', body: 'marked' }],
  },
  cmpTable: {
    eyebrow: 'cmp e', heading: 'Compare table heading',
    rowLabels: ['Price', 'Marked'],
    columns: [
      { label: 'Others', values: ['€199', false] },
      { label: 'Gradd', values: ['€99', true], featured: true },
    ],
  },
  judgement: {
    eyebrow: 'e', heading: 'It is a judgement paper.', lead: 'l',
    weak: { label: 'Weak answer', body: 'x' },
    diagnosis: { label: 'Diagnosis', body: 'y' },
    coached: { label: 'Coached answer', body: 'z' },
    caption: 'The difference is judgement.',
    // band proves the wrapper works on judgement too, not just sections[]/statBar/
    // featureArtefacts — see BREAK MODE 10 below.
    band: 'dark',
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
// resit-engine.ts` is written in APM's own terms). Every other ORIGINAL optional section is
// present.
//
// SUPERSEDED AGAIN 2026-08-04 (`feat/landing-section-vocabulary`): OPTIONAL_SECTIONS grew
// from 12 to 17 (heroArtefact/statBar/featureArtefacts/bigNumbers/cmpTable). AFM_LANDING and
// APM_LANDING set NONE of the five — this change-set is template-only, see the config file's
// own header — so the count AFM renders is unchanged (still 11) while the denominator and
// the "missing" set both grew by 5.
// SUPERSEDED A THIRD TIME 2026-08-05 (`feat/afm-recompose-section-vocabulary`): AFM ADOPTS
// the vocabulary, so the four "not-yet-adopted" negatives above are now false BY DESIGN and
// the assertion inverts for them. FOUR sections remain absent and each is a
// standing decision this fixture is the right place to hold:
//   · secondaryCta — no AFM resit diagnostic exists (`lib/acca/resit-engine.ts` is APM-only).
//   · statBar      — APM does not set one either; AFM matches APM, and an unasked-for extra
//                    section is exactly what "same look and feel" is not.
//   · mockups      — RETIRED into featureArtefacts[], same as APM's recompose did.
//   · compareStrip — RETIRED in favour of cmpTable, same as APM's recompose did. Counted
//                    here because it is ITSELF an entry in OPTIONAL_SECTIONS — missing that
//                    is what made the first draft of this assertion read 13/17 against an
//                    expected 14, which is the arithmetic and not the config.
ok('AFM_LANDING renders the recomposed section structure — vocabulary adopted, four sections absent by decision',
  visibleSections(AFM_LANDING).length === OPTIONAL_SECTIONS.length - 4 &&
  hasSection(AFM_LANDING, 'heroArtefact') && hasSection(AFM_LANDING, 'featureArtefacts') &&
  hasSection(AFM_LANDING, 'bigNumbers') && hasSection(AFM_LANDING, 'cmpTable') &&
  !hasSection(AFM_LANDING, 'secondaryCta') && !hasSection(AFM_LANDING, 'statBar') &&
  !hasSection(AFM_LANDING, 'mockups') && !hasSection(AFM_LANDING, 'compareStrip'),
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
// The compare STRIP half of this assertion is retired with the strip itself (v3 replaces it
// with a real cmpTable — see break mode 12). The judgement half survives unchanged: it is
// the section carrying AFM's proof story and it must not silently disappear.
ok('AFM output renders the judgement card, and no longer the retired flat compare strip',
  afmHtml.includes('plp-judgement-grid') && !afmHtml.includes('plp-compare-strip-grid'));
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

// ── BREAK MODE 10: THE NEW SECTION VOCABULARY (feat/landing-section-vocabulary) ───────────
// heroArtefact / statBar / featureArtefacts / bigNumbers / cmpTable, plus `band` on the
// PRE-EXISTING sections[] group. Same discipline as every section above: an omitted field
// renders nothing (MINIMAL, and every real config today — neither AFM_LANDING nor
// APM_LANDING sets any of the five), FULL (now exercising all five) proves the positive, and
// — because "the template must be able to express the vocabulary first" means nothing may
// visibly change on a page that doesn't ask for it — AFM_LANDING and APM_LANDING HAD TO render
// BYTE-IDENTICALLY to their pre-extension output. That property can't be eyeballed from a
// diff of this file, so it was asserted against a SHA-256 of the style-stripped body captured
// by rendering the PARENT commit (`b3f4b11`, before any edit in this branch) through the
// same `bodyOf()` used here. The pin did its job — that branch left both bodies untouched.
// BOTH pins have since been superseded: APM's retired outright (break mode 11), AFM's
// downgraded to a plain current-state snapshot. See the AFM snapshot block below.
ok('MINIMAL renders none of the five new section types',
  !minimalHtml.includes('plp-statbar-stats') && !minimalHtml.includes('plp-bignums-grid') &&
  !minimalHtml.includes('plp-feature-artefact-grid') && !minimalHtml.includes('plp-cmptable-table') &&
  !minimalHtml.includes('plp-hero-inner--split'));
ok('every new-vocabulary section is individually ABSENT on MINIMAL',
  (['heroArtefact', 'statBar', 'featureArtefacts', 'bigNumbers', 'cmpTable'] as const)
    .every((s) => hasSection(MINIMAL, s) === false));

ok('FULL renders the stat bar (statBar) with its configured stats, dark band applied',
  fullHtml.includes('plp-statbar-stats') && fullHtml.includes('346') && fullHtml.includes('plp-band-dark'));
ok('FULL renders big numbers (bigNumbers)',
  fullHtml.includes('plp-bignums-grid') && fullHtml.includes('Big numbers heading'));
ok('FULL renders feature artefacts (featureArtefacts) in both orientations, sage band applied',
  fullHtml.includes('plp-feature-artefact-grid') && fullHtml.includes('Feature artefact one') &&
  fullHtml.includes('Feature artefact two (reversed)') && fullHtml.includes('plp-band-sage'));
ok('FULL renders the compare table (cmpTable) with a featured Gradd column and yes/no glyphs',
  fullHtml.includes('plp-cmptable-table') && fullHtml.includes('is-gradd') &&
  fullHtml.includes('plp-cmptable-y') && fullHtml.includes('plp-cmptable-n'));
ok('FULL renders the hero artefact (heroArtefact) as a split grid, not the plain single-column hero',
  fullHtml.includes('plp-hero-inner--split'));
ok('FULL applies a dark band to an EXISTING sections[] group — the band wrapper works on old section kinds, not just new ones',
  fullHtml.includes('class="plp-section-group plp-band-dark"'));
ok('FULL applies a dark band to the judgement card (band field added feat/apm-recompose-section-vocabulary)',
  fullHtml.includes('class="plp-judgement plp-band-dark"'));
ok('every new-vocabulary section is individually PRESENT on FULL',
  (['heroArtefact', 'statBar', 'featureArtefacts', 'bigNumbers', 'cmpTable'] as const)
    .every((s) => hasSection(FULL, s) === true));

const apmHtml = bodyOf(APM_LANDING);
// ── THE AFM RENDERED-BODY SNAPSHOT ────────────────────────────────────────────────────────
// ⚠️ THIS IS A CURRENT-STATE SNAPSHOT. IT IS NOT AN EQUALITY CLAIM ABOUT ANY PAST COMMIT.
// It was originally captured (`9187ea3`) against `b3f4b11` to prove the section-vocabulary
// branch left AFM byte-identical, and it did hold through that merge (`2014a21`). That
// guarantee is SPENT: the value below is NOT b3f4b11's body and never will be again, so
// nothing here may be read as "AFM is unchanged since before the section vocabulary".
//
// WHAT ACTUALLY MOVED IT — diagnosed 2026-08-05 by re-rendering every commit in the range
// through this same `bodyOf()` and diffing the bodies, not inferred from a commit message.
// `5afef1d` (refactor(links): sweep root-identity references stale since the hub) changed ONE
// href in the SHARED nav of ProductLandingPage.tsx, `/acca` → `/`, five characters to one:
//     - <a class="plp-navlink" href="/acca">All ACCA</a>
//     + <a class="plp-navlink" href="/">All ACCA</a>
// That single line is the entire diff (19002 → 18998 bytes). The edit is CORRECT — root IS
// the ACCA pillar now, and linking /acca would only add a redirect hop — and AFM was
// collateral: that commit touches no config and names no paper. A shared-component edit
// re-renders every landing page, which is the whole reason this pin exists; it could not
// announce the change because nothing runs it unless a human chooses to.
//
// APM'S PIN BROKE IN THE SAME COMMIT, IDENTICALLY (`c6bf4622…` → `8258f8d2…`, the same −4
// bytes) — on unmodified main BOTH were failing. It was then retired in `5db8d72` for an
// unrelated and legitimate reason (APM adopts the vocabulary — break mode 11 below), and
// that CONCEALED the breakage: the retirement reads as a deliberate supersession rather than
// the removal of a pin that was already red.
//
// The note previously here blamed AFM_LANDING's own content rebuild (`c228380`). That was
// WRONG and is deleted: `c228380` is an ANCESTOR of `b3f4b11`, so it predates the capture and
// could not have stranded it.
//
// REFRESHING THIS VALUE IS A DECISION, NOT A CHORE. A mismatch means AFM's rendered output
// moved. Find WHAT moved it and confirm it was intended before pasting a new hash in.
//
// ── REFRESHED 2026-08-05 (`feat/afm-recompose-section-vocabulary`), DELIBERATELY ──────────
// Previous value `4998e6dc…`. AFM adopts the section vocabulary in this change-set, so its
// rendered body moved BY DESIGN and by a large amount, not by four bytes of collateral: a
// heroArtefact, two featureArtefacts, a bigNumbers band, sage/dark band classes, and a
// cmpTable replacing the compareStrip. WHAT moved it is this branch's whole subject, and the
// intent is asserted positively by break mode 12 immediately below rather than left to the
// hash alone — a refreshed hash proves only that output is stable from now on, never that
// the move was correct.
//
// KEPT RATHER THAN RETIRED, unlike APM's. APM's pin was retired outright when APM adopted the
// vocabulary (break mode 11), which left NOTHING pinning a shared-component edit against any
// real config — and that is precisely the failure this pin caught in `5afef1d`, where one
// href in ProductLandingPage.tsx's shared nav silently re-rendered every landing page. With
// AFM's kept and refreshed, one real page still holds that line.
//
// ── REFRESHED A SECOND TIME, SAME BRANCH, AND THE PIN EARNED ITS KEEP DOING IT ────────────
// `f8101097…` was set for the config recompose. It then went red AGAIN, mid-branch, on a
// SHARED-COMPONENT edit: ProductLandingPage.tsx stopped rendering `c.proof` in the nav and
// began tagging same-page anchor links with `plp-navlink--anchor` (both header fixes — see
// that file). That is precisely the class of change the `5afef1d` post-mortem says nothing
// was catching, and this time it was caught on the same branch that caused it, before merge,
// by a fixture that now runs on every build. It is also the reason the two assertions below
// exist: a hash proves the output is stable, never that it is right.
const AFM_RENDERED_BODY_SHA256 = '95046389f62c4386842057b6224eb7dc966f50851f6bcd642b8225ca9abb318b';
const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
ok('AFM_LANDING\'s rendered body matches the pinned snapshot (SHA-256 of the style-stripped body)',
  sha256(afmHtml) === AFM_RENDERED_BODY_SHA256,
  `got ${sha256(afmHtml)}, want ${AFM_RENDERED_BODY_SHA256} — AFM's rendered output MOVED. `
  + 'A shared-component edit (ProductLandingPage.tsx) will do this without touching any '
  + 'config. Identify the change and confirm it was intended BEFORE refreshing the constant.');

// ── BREAK MODE 11: APM_LANDING'S RECOMPOSE (feat/apm-recompose-section-vocabulary) ────────
// SUPERSEDES the old "APM_LANDING renders byte-identically to its pre-extension output" pin
// — that guarantee held while the template's SCHEMA changed under a page that adopted none
// of it (v2, superseded, see the config file's header). This change-set's whole point is the
// opposite: APM adopts the vocabulary, so the byte pin is retired ON PURPOSE and replaced
// with assertions on what the new composition actually renders — same discipline as break
// mode 5 did for AFM's content rebuild.
ok('APM output renders the hero as a split grid with heroArtefact, not the plain single-column hero',
  apmHtml.includes('plp-hero-inner--split'));
ok('APM output renders BOTH feature artefacts (the Ezra chat and the professional-skills panel), reversed on the second',
  apmHtml.includes('plp-feature-artefact-grid') &&
  (apmHtml.match(/plp-feature-artefact-grid/g) ?? []).length === 2 &&
  apmHtml.includes('Ezra doesn’t hand you the model answer.') &&
  apmHtml.includes('Every case marked against ACCA’s own professional-skills descriptors.'));
ok('APM output no longer renders the old unframed mockups stack (both promoted to featureArtefacts)',
  !apmHtml.includes('plp-mockup-stack'));
ok('APM output renders bigNumbers with the three re-verified figures (91 drills, ~40% pass rate, 20% professional skills)',
  apmHtml.includes('plp-bignums-grid') &&
  apmHtml.includes('~40%') && apmHtml.includes('>20%<') && apmHtml.includes('>91<'));
ok('APM output applies the sage band to the professional-skills section group',
  apmHtml.includes('class="plp-section-group plp-band-sage"'));
ok('APM output applies the dark band to the judgement card',
  apmHtml.includes('class="plp-judgement plp-band-dark"'));
ok('APM output renders cmpTable with a featured Gradd column, not the old flat compareStrip',
  apmHtml.includes('plp-cmptable-table') && apmHtml.includes('is-gradd') &&
  !apmHtml.includes('plp-compare-strip-grid'));
ok('APM output cmpTable Gradd column reuses facts already live elsewhere on the page (no invented cost/duration)',
  apmHtml.includes('€99 for the whole sitting') && apmHtml.includes('3h 15m, marked as one paper'));

// ── BREAK MODE 12: AFM_LANDING'S RECOMPOSE (feat/afm-recompose-section-vocabulary) ────────
// Mirrors break mode 11 for the LAST of the four surfaces. The load-bearing assertions here
// are the NEGATIVE ones: the standing requirement is that AFM matches APM's look and feel,
// and the way that goes wrong is not a missing band — it is AFM quietly inheriting APM's
// ARGUMENT or APM's FIGURES along with APM's layout. Those two are pinned explicitly.
ok('AFM output renders the hero as a split grid with heroArtefact, not the plain single-column hero',
  afmHtml.includes('plp-hero-inner--split'));
ok('AFM output renders BOTH feature artefacts, reversed on the second',
  (afmHtml.match(/plp-feature-artefact-grid/g) ?? []).length === 2 &&
  afmHtml.includes('Ezra doesn’t hand you the reference working.') &&
  afmHtml.includes('Marked against AFM’s own published professional-skills descriptors.'));
ok('AFM output no longer renders the old unframed mockups stack (both promoted to featureArtefacts)',
  !afmHtml.includes('plp-mockup-stack'));
ok('AFM output renders bigNumbers with the three independently verified figures (~45% pass rate, 20% professional skills, 63 drills)',
  afmHtml.includes('plp-bignums-grid') &&
  afmHtml.includes('~45%') && afmHtml.includes('>20%<') && afmHtml.includes('>63<'));
ok('AFM output applies the sage band to the professional-skills section group',
  afmHtml.includes('class="plp-section-group plp-band-sage"'));
ok('AFM output applies the dark band to the judgement card',
  afmHtml.includes('class="plp-judgement plp-band-dark"'));
ok('AFM output renders cmpTable with a featured Gradd column',
  afmHtml.includes('plp-cmptable-table') && afmHtml.includes('is-gradd'));
ok('AFM cmpTable carries the competitor facts forward from the retired compareStrip, unchanged',
  afmHtml.includes('€59.98 for the two') && afmHtml.includes('Three days') &&
  afmHtml.includes('€99 for the whole sitting'));
// ── THE TWO THAT MATTER MOST: AFM MUST NOT INHERIT APM'S ARGUMENT OR APM'S NUMBERS ────────
// AFM is an EXECUTION test (the arithmetic is usually competent; precision under a clock is
// what fails). APM is a JUDGEMENT paper (describing instead of applying). Copying APM's
// composition is the point of this change-set; copying APM's framing would be a content
// regression that no structural assertion above would notice.
ok('AFM keeps its OWN argument — an execution test — and does not import APM\'s judgement-paper framing',
  afmHtml.includes('It is an execution test.') &&
  !/judgement paper/i.test(afmHtml) && !/not a knowledge test\. It is a judgement/i.test(afmHtml));
ok('AFM does not carry APM\'s figures (91 drills, ~40% pass rate) anywhere in its rendered body',
  !afmHtml.includes('~40%') && !afmHtml.includes('>91<') && !/91 (exam-style )?drills/.test(afmHtml));
// ── THE HEADER FIXES (shared component, both papers) ─────────────────────────────────────
// AFM's nav summed to exactly its available width, so every label broke mid-phrase — no
// overflow, no clipping, nothing measurable went wrong, it just looked broken. The proof
// link is the item removed; it must still render in the HERO, which is the half that would
// silently regress if someone "tidied" the removal later.
ok('AFM renders its proof link in the hero but NOT in the nav (the header-crowding fix)',
  afmHtml.includes('plp-prooflink') && afmHtml.includes('See a real walkthrough') &&
  !/plp-navlink[^"]*"[^>]*>See a real walkthrough</.test(afmHtml));
// Parsed, not regex-guessed: pull every nav link out as (href, isTagged) and assert the tag
// tracks the href EXACTLY. Written this way so it fails if the tag is dropped, if it is
// applied to everything, or if it lands on a cross-page link — a substring check on
// "plp-navlink--anchor" would pass on all three.
const navLinks = [...afmHtml.matchAll(/<a class="(plp-navlink[^"]*)" href="([^"]+)"/g)]
  .map((m) => ({ tagged: m[1].includes('plp-navlink--anchor'), anchor: m[2].startsWith('#') }));
ok('same-page anchor nav links are tagged so they can drop out on a narrow viewport; cross-page links are not',
  navLinks.length >= 5 &&
  navLinks.some((l) => l.anchor) && navLinks.some((l) => !l.anchor) &&
  navLinks.every((l) => l.tagged === l.anchor));
ok('APM gets the same header treatment from the shared component (anchor links tagged, no proof link to remove)',
  apmHtml.includes('plp-navlink--anchor') && !apmHtml.includes('plp-prooflink'));

ok('AFM still states 63 drills, and still makes no code-owned-marking claim',
  /63 (exam-style )?drills/.test(afmHtml) && !/so the marking is exact/i.test(afmHtml) &&
  !/every accept\/reject verdict/i.test(afmHtml));

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
