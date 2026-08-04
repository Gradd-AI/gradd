// scripts/compare-apm-landing.ts — the RULER for feat/apm-template-conversion.
// Run: npm run compare:apm-landing
//
// Renders the live components/landing/ACCALandingPage.tsx and the template
// (ProductLandingPage + APM_LANDING) to static markup and asks, for 20 NAMED elements
// pulled verbatim from the live page: present in the live render? present in the
// template render? An element present in the live page and absent from the template is
// LOST. The count of lost elements is the number this script exists to produce — nothing
// here renders a verdict ("ready" / "not ready"); that call is Grant's.
//
// ── WHY NAMED SUBSTRING PROBES, NOT A DIFF OR A PARAGRAPH COUNT ─────────────
// A byte diff between two differently-structured pages is noise from the first line. A
// paragraph count is cheap and is reported below, but it is INDICATIVE ONLY — the two
// pages nest text in different tag shapes (a <p> here, a <span> there), so an "-p tag
// count matches" is neither necessary nor sufficient for "the content is the same", and a
// backreference-style regex over this markup mis-parses it (self-closing tags, nested
// quotes in evidence strings). Content presence is asserted by literal substring only.
//
// ── TEXT MODE vs RAW MODE ────────────────────────────────────────────────────
// Most probes run in TEXT mode: the style block is stripped (see P-G3a note below), then
// every remaining tag is stripped, so a probe matches only if the visible copy is there —
// not a class name, not a code comment. Footer/nav links and the hint-badge tag boundary
// run in RAW mode instead, against markup with tags intact: stripping tags deletes the
// href attribute along with the tag, so a text-only probe for "/cookies" would pass on a
// page that merely PRINTS the word cookies somewhere, proving nothing about the link.
//
// ── P-G3a (docs/GENERATOR_DOCTRINE.md): A RENDER ASSERTION CAN EXECUTE AND STILL PROVE
// NOTHING ─────────────────────────────────────────────────────────────────────
// Both templates inline their entire stylesheet in a <style> block. Every class name used
// anywhere in the CSS — .plp-faq-list, .hint-badge, .plp-tier-grid — appears in the
// rendered HTML whether or not the corresponding section rendered. `<style>` is stripped
// before ANY assertion, in both modes, or every probe would trivially pass by matching its
// own CSS selector.
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ACCALandingPage from '../components/landing/ACCALandingPage';
import ProductLandingPage from '../components/landing/ProductLandingPage';
import { APM_LANDING } from '../components/landing/product-landing-config';

type ProbeMode = 'text' | 'raw';
interface Probe {
  name: string;
  mode: ProbeMode;
  /** ALL of these must be present (AND) for the probe to count as present. */
  needles: string[];
}

// ── The 20 probed elements ───────────────────────────────────────────────────
// Each pulled verbatim from ACCALandingPage.tsx. Ordered as they appear on the live page.
const PROBES: Probe[] = [
  { name: 'hero_microcopy', mode: 'text',
    needles: ['Resit diagnosis: free, 3 minutes, no sign-up.'] },
  { name: 'hero_meta_strip', mode: 'text',
    needles: ['Every drill free', 'No card to start', 'Upgrade for cases, marking and mock'] },
  { name: 'chat_hint_badge', mode: 'raw',
    needles: ['>Hint<'] },
  { name: 'chat_input_row', mode: 'text',
    needles: ['Reply to Ezra'] },
  { name: 'hero_visual_caption', mode: 'text',
    needles: ['The answer stays sealed. Ezra teaches until your answer is strong enough to score.'] },
  { name: 'judgement_caption', mode: 'text',
    needles: ['The difference is not knowledge. It is application, limitation, judgement.'] },
  { name: 'judgement_before_after', mode: 'text',
    needles: [
      'Target costing helps a business reduce costs by setting a target cost based on the market price.',
      'the board should set a floor on specification before committing',
    ] },
  { name: 'taught_section_group', mode: 'text',
    needles: ['The approach', 'Finds the gap in your thinking.'] },
  { name: 'teach_loop_steps', mode: 'text',
    needles: ['Attempt the drill.', 'Only then is the model answer revealed.'] },
  { name: 'proskills_section_group', mode: 'text',
    needles: ['The 20% most candidates', 'A fifth of every APM answer is the professional skills.'] },
  { name: 'proskills_caption', mode: 'text',
    needles: ['published professional-skills descriptors, with the evidence named'] },
  { name: 'mark_panel_evidence', mode: 'text',
    needles: ['against falling ROCE and EPS'] },
  { name: 'included_section_group', mode: 'text',
    needles: ['Everything the paper', '91 exam-style drills.'] },
  { name: 'compare_strip_section', mode: 'text',
    needles: ['Taught, marked and mocked', 'for one sitting price'] },
  { name: 'compare_strip_columns', mode: 'text',
    needles: ['Practice, no teaching; you mark yourself.', 'One hour at a time.'] },
  { name: 'pricing_note', mode: 'text',
    needles: ['14-day money-back guarantee.'] },
  { name: 'final_cta_fineprint', mode: 'text',
    needles: ['for 90 days or', '/month'] },
  { name: 'nav_sign_in', mode: 'raw',
    needles: ['>Sign in<'] },
  { name: 'footer_cookies_href', mode: 'raw',
    needles: ['href="/cookies"'] },
  { name: 'footer_mailto_href', mode: 'raw',
    needles: ['href="mailto:hello@gradd.ai"'] },
];

// A probe expected to be present in BOTH renders regardless of conversion progress —
// proves the harness can detect presence at all. Without it, every LOST verdict above
// would also read LOST on a template that rendered nothing whatsoever.
const POSITIVE_CONTROL: Probe = { name: 'positive_control_start_free', mode: 'text', needles: ['Start free'] };

function stripStyle(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/g, '');
}
function textOnly(html: string): string {
  return stripStyle(html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
}

function present(probe: Probe, text: string, raw: string): boolean {
  const hay = probe.mode === 'raw' ? raw : text;
  return probe.needles.every((n) => hay.includes(n));
}

const liveRawFull = renderToStaticMarkup(React.createElement(ACCALandingPage));
const templateRawFull = renderToStaticMarkup(React.createElement(ProductLandingPage, { config: APM_LANDING }));

const liveRaw = stripStyle(liveRawFull);
const templateRaw = stripStyle(templateRawFull);
const liveText = textOnly(liveRawFull);
const templateText = textOnly(templateRawFull);

console.log('\ncompare:apm-landing — element-by-element, live vs template\n');

let lost = 0;
let extra = 0;
let notInLive = 0;

for (const p of PROBES) {
  const inLive = present(p, liveText, liveRaw);
  const inTemplate = present(p, templateText, templateRaw);
  let status: string;
  if (!inLive) { status = 'N/A  (not found in the live page — probe needs fixing)'; notInLive++; }
  else if (inLive && inTemplate) { status = 'OK'; }
  else { status = 'LOST (present live, absent template)'; lost++; }
  console.log(`  [${p.mode}] ${p.name.padEnd(28)} ${status}`);
}

// Something present in the template but not (by these probes) in the live page would be
// EXTRA — not expected here since every probe is sourced FROM the live page, but checked
// so a future probe added the wrong way round is visible rather than silently miscounted.
for (const p of PROBES) {
  const inLive = present(p, liveText, liveRaw);
  const inTemplate = present(p, templateText, templateRaw);
  if (!inLive && inTemplate) extra++;
}

const controlLive = present(POSITIVE_CONTROL, liveText, liveRaw);
const controlTemplate = present(POSITIVE_CONTROL, templateText, templateRaw);

console.log(`\n  [control] ${POSITIVE_CONTROL.name.padEnd(20)} live=${controlLive ? 'present' : 'ABSENT'} template=${controlTemplate ? 'present' : 'ABSENT'}`);
if (!controlLive || !controlTemplate) {
  console.log('  ⚠ positive control failed — the harness itself cannot be trusted until this is fixed.');
}

// ── Paragraph count — INDICATIVE ONLY, never used to decide anything above ──
const countParas = (html: string): number => {
  let n = 0;
  for (const _ of html.matchAll(/<p[ >]/g)) n++;
  return n;
};
const liveParaCount = countParas(liveRaw);
const templateParaCount = countParas(templateRaw);

console.log(`\n  (indicative only, not authoritative) <p> count — live: ${liveParaCount}, template: ${templateParaCount}`);

if (notInLive > 0) {
  console.log(`\n  ${notInLive} probe(s) did not match the LIVE page — those need fixing before they say anything about the template.`);
}
if (extra > 0) {
  console.log(`  ${extra} probe(s) matched the template but not the live page — check for a probe pointed the wrong way.`);
}

console.log(`\n${lost} of ${PROBES.length} probed elements LOST (present in the live page, absent from the template render).\n`);

// Reports a number; does not render a verdict. Exit code still reflects lost>0 so this can
// be wired into CI later without a second script, but the console output above states the
// count plainly rather than PASS/FAIL language.
process.exitCode = lost === 0 && controlLive && controlTemplate ? 0 : 1;
