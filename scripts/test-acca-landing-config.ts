// scripts/test-acca-landing-config.ts — fixtures for the config-driven ACCA spoke page.
// Pure: no DB, no model, no network. Run: npm run test:acca-landing-config
//
// ── WHAT THIS SUITE IS FOR ──────────────────────────────────────────────────
// `/acca/apm` is a page Grant ruled on by looking at it. It has now been made config-driven
// so `/acca/afm` can share it. The whole value of that move rests on TWO properties that
// nothing else in the repo checks, and both are invisible in a diff:
//
//   1. APM'S RENDERED BODY DID NOT MOVE. Not "looks the same" — the same bytes. Pinned to a
//      SHA-256 below, captured from the BUILT output before the extraction and re-derived
//      here from the component itself.
//   2. AFM STATES ITS OWN ARGUMENT AND ITS OWN FIGURES. The failure mode of sharing a page
//      is inheriting its claims: 91 drills on the AFM page, "judgement paper" framing on a
//      paper whose own examiner reports say the opposite, a money-back guarantee nobody
//      ever offered on AFM. Every one of those is a factual error a screenshot passes.
//
// P-G3: every check below has a named break mode — the thing that would have to go wrong.
//
// It asserts against the RENDERED OUTPUT wherever the claim is about what a visitor sees.
// Asserting on the config object alone would test this file's reading of the config, not the
// page — the `sitCaseGate` lesson, and the same reason `test-product-landing.ts` renders.

import {
  APM_ACCA_LANDING,
  AFM_ACCA_LANDING,
  withAccaDynamicCta,
  type AccaLandingConfig,
  type AccaSection,
} from '../components/landing/acca-landing-config';
import ACCALandingPage from '../components/landing/ACCALandingPage';
import crypto from 'node:crypto';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\nacca-landing — one page, two papers, and neither borrows the other\'s claims\n');

const React = require('react') as typeof import('react');
const { renderToStaticMarkup } = require('react-dom/server') as typeof import('react-dom/server');

// ⚠️ THE STYLE BLOCK IS STRIPPED, and that is load-bearing rather than tidy-up: the whole
// stylesheet is inlined in a <style> element, so EVERY class name on the page — .resit-band,
// .cmp-table, .ja-coached — appears in the markup whether or not the section rendered. A bare
// `html.includes('resit-band')` is true for a config that omits the resit band entirely.
const bodyOf = (config: AccaLandingConfig): string =>
  renderToStaticMarkup(React.createElement(ACCALandingPage, { config }))
    .replace(/<style[\s\S]*?<\/style>/g, '');

const apm = bodyOf(APM_ACCA_LANDING);
const afm = bodyOf(AFM_ACCA_LANDING);

// ════════════════════════════════════════════════════════════════════════════
// BREAK MODE 1 — THE EXTRACTION QUIETLY CHANGED APM.
//
// A config extraction is a thousand small transcriptions, and every one of them can drop a
// space, straighten a curly quote, or lose an <em>. None of that shows up in a screenshot and
// none of it fails a typecheck.
//
// ── THE PIN IS NOT SELF-DERIVED. It was established TWICE, at two scopes, before it was
// written down (2026-08-06, `feat/afm-acca-landing-config`):
//   1. SERVED PAGE — `npm run build` + `npm start`, GET /acca/apm, everything between <body>
//      and </body> with <script> blocks removed (they carry chunk filenames, which move on any
//      code change and would make the comparison meaningless). Before the extraction and after:
//      59,097 bytes, sha256 69667f946a569b1e9eccd73cf0ab043bc449fcf8ae49cfe2eee0a33d4442fece,
//      and a byte-for-byte buffer compare of the two captures.
//   2. COMPONENT — the PRE-extraction `ACCALandingPage` (from `git show HEAD:`) rendered with
//      no props, against the post-extraction one rendered with `APM_ACCA_LANDING`, both through
//      the `bodyOf` below. Identical: 21,914 bytes, the SHA pinned here.
// The first proves the real page did not move. The second is the one this fixture can re-derive
// on every build, which is why it is the value below.
//
// ⚠️ IF THIS FAILS AND THE CHANGE WAS DELIBERATE, do not just re-pin it. Re-render both pages,
// diff the bodies, and satisfy yourself that what moved is what you meant to move — then
// re-pin WITH the reason in this comment. A pin updated silently guards nothing.
// ════════════════════════════════════════════════════════════════════════════
const APM_BODY_SHA = '221bbb2a45732c6adaf5aadb4045b6a8af7f278cdb3edb57b016168e32f2947f';
const apmSha = crypto.createHash('sha256').update(apm).digest('hex');
ok('APM\'s rendered body is UNCHANGED by the config extraction (SHA-256 pin)',
  apmSha === APM_BODY_SHA, `got ${apmSha}`);

// ── BREAK MODE 2: AN OMITTED SECTION RENDERS AN EMPTY SHELL ─────────────────
// The negative property. `resitBand` is the one optional section, and the careless
// implementation renders the <section> wrapper (or its heading) with nothing inside — which
// still "renders", still typechecks, and leaves a band of blank sage on the page.
ok('APM renders the resit band', apm.includes('resit-band') && apm.includes('Get my free resit plan'));
ok('AFM renders NO resit band at all — not an empty one', !afm.includes('resit-band'));
ok('AFM renders no resit copy anywhere', !/resit/i.test(afm));
ok('AFM has exactly one section fewer than APM, and it is the resit band',
  (afm.match(/<section/g) ?? []).length + 1 === (apm.match(/<section/g) ?? []).length);

// ── BREAK MODE 3: THE TWO PAGES DRIFT APART STRUCTURALLY ────────────────────
// The point of sharing the component is that AFM gets APM's COMPOSITION. If a future edit
// adds a section kind to one config and not the other, or reorders them, the pages stop being
// the same page and nothing else notices.
const kinds = (c: AccaLandingConfig) => c.sections.map((s: AccaSection) => s.kind);
ok('AFM renders the same section kinds, in the same order, as APM',
  kinds(AFM_ACCA_LANDING).join(',') === kinds(APM_ACCA_LANDING).join(','),
  `${kinds(AFM_ACCA_LANDING).join(',')} vs ${kinds(APM_ACCA_LANDING).join(',')}`);
ok('the body is the seven-section sequence the renderers are written for',
  kinds(APM_ACCA_LANDING).join(',') ===
  'PROOF_ROW,CARD_TRIO,STEPS,SKILLS_PANEL,CARD_GRID,CARD_GRID,COMPARE_TABLE');

// ── BREAK MODE 4: PROOF_ROW DEGRADES INTO A COMPARE ROW ─────────────────────
// PROOF_ROW is three columns of prose that read left to right as ONE thing changing. Rendered
// without its arrow chips or its rust-bordered third column it becomes a flat three-up strip,
// which is a different claim about the content.
for (const [name, html] of [['APM', apm], ['AFM', afm]] as const) {
  ok(`${name}'s PROOF_ROW renders all three columns, both chips and the caption`,
    html.includes('ja-weak') && html.includes('ja-diag') && html.includes('ja-coached') &&
    (html.match(/ja-chip/g) ?? []).length === 2 && html.includes('ja-caption'));
}

// ════════════════════════════════════════════════════════════════════════════
// BREAK MODE 5 — AFM INHERITS APM'S ARGUMENT.
//
// The specific thing that must never happen. APM is a JUDGEMENT paper (the failure is
// describing instead of evaluating); AFM is an EXECUTION test (five examiner reports: the
// arithmetic is usually competent, precision under a clock is what fails). Importing APM's
// framing onto AFM is not a style slip, it is a false statement about the paper.
// ════════════════════════════════════════════════════════════════════════════
ok('AFM never calls itself a judgement paper', !/judgement paper/i.test(afm));
ok('AFM states the EXECUTION argument', /execution test/i.test(afm) && /execution/i.test(AFM_ACCA_LANDING.hero.h1.underline));
ok('APM keeps its own judgement-paper argument', /judgement paper/i.test(apm));
ok('neither page mentions the other paper\'s exam name in its own hero',
  !afm.slice(0, apm.indexOf('</section>')).includes('Advanced Performance Management') &&
  AFM_ACCA_LANDING.hero.eyebrow.exam === 'Advanced Financial Management');

// ════════════════════════════════════════════════════════════════════════════
// BREAK MODE 6 — A FIGURE CROSSES BETWEEN THE PAPERS.
//
// 63 published AFM drills, 91 published APM drills. The failure is not a typo: it is one
// config copied from the other and a number left behind. Checked in BOTH directions, because
// only checking "AFM says 63" passes a page that says 63 AND 91.
// ════════════════════════════════════════════════════════════════════════════
ok('AFM states 63 drills and never 91', /63 (exam-style )?drills/.test(afm) && !/\b91\b/.test(afm));
ok('APM states 91 drills and never 63', /91 (exam-style )?drills/.test(apm) && !/\b63\b/.test(apm));
ok('AFM names its own cases exactly — 5 practice cases, never "full exam cases"',
  /5 practice cases/.test(afm) && !/Full exam cases/i.test(afm));
ok('AFM names its own mock paper', /AFM Mock Paper 1/.test(afm));

// ── BREAK MODE 7: A CLAIM NOBODY EVER MADE ABOUT AFM ────────────────────────
// The 14-day money-back guarantee is APM's, stated twice on APM's page (pricing note and
// closing fine print). There is no AFM equivalent on the record, so carrying the sentence
// across with the rest of the pricing block would invent a commercial promise.
ok('AFM promises no money-back guarantee', !/money-back/i.test(afm));
ok('APM still promises its own', (apm.match(/money-back/gi) ?? []).length === 2);

// ── BREAK MODE 8: THE MARKING OVERCLAIM COMES BACK ──────────────────────────
// Code owns every figure in DRILL GENERATION. Marking is model-graded — the model owns the
// band, and the feedback prose is model-authored. "Computed", "deterministic" or
// "code-verified" said of MARKING is the exact overclaim already corrected in CLAUDE.md.
const MARKING_OVERCLAIM = /(marking|marked|marks)[^.]{0,80}(deterministic|code-verified|computed exactly|verified deterministically)/i;
for (const [name, html] of [['APM', apm], ['AFM', afm]] as const) {
  ok(`${name} makes no code-owns-the-marking claim`, !MARKING_OVERCLAIM.test(html));
}

// ── BREAK MODE 9: A COVERAGE CLAIM AFM CANNOT MAKE ──────────────────────────
// AFM has ZERO published drills in syllabus sections C and D. The boundary has to be on the
// page, in the section that makes the coverage claim — not implied away and not in a footnote.
ok('AFM states the C/D boundary in the section that claims coverage',
  /\(C, D\) are next/.test(afm) && /No complete-syllabus claim/.test(afm));
ok('AFM never claims every learning outcome is covered',
  !/[Ee]very examinable learning outcome/.test(afm));

// ── BREAK MODE 10: PER-PAPER PRICING PICKS UP BUNDLE LANGUAGE ───────────────
// AFM is priced and sat on its own. "One pass covers every paper" was a real, retired claim.
//
// SAME DETECTOR AS `test-product-landing.ts` (BUNDLE_CLAIM), deliberately — a second, subtly
// different regex here would let a string pass one page and fail the other. It matches the
// CLAIM, not the word: AFM's own pricing note says "no bundle", which a naive /bundle/ would
// flag as the very thing it denies. Applied to the WHOLE rendered body, not just the pricing
// fields, because a bundle claim can be made anywhere on the page.
const BUNDLE_CLAIM = /(every|all)\s+(acca\s+)?papers?|one\s+(pass|subscription)\s+covers|apm\s+and\s+afm\s+together/i;
ok('the detector works — it catches the retired strings',
  BUNDLE_CLAIM.test('Free to start. One pass covers every ACCA paper.') &&
  BUNDLE_CLAIM.test('One ACCA pass covers every paper you sit: APM and AFM together, one subscription.'));
ok('AFM makes no bundle claim anywhere on the page', !BUNDLE_CLAIM.test(afm));
ok('AFM says explicitly that it is priced on its own', /priced on its own/.test(afm));

// ════════════════════════════════════════════════════════════════════════════
// BREAK MODE 11 — THE ENTITLEMENT CTA MISSES A SLOT, OR HITS ONE IT SHOULDN'T.
//
// The live bug this class produced on the previous template: a header button that correctly
// POINTED at the entitled visitor's dashboard while still SAYING "Start free", because one
// slot read `freeCta.href` and hardcoded the text. Only a render-level check finds that — the
// data was always right. The mirror failure matters just as much: swapping a PAID tier's CTA
// would tell a visitor their €99 purchase is already theirs.
// ════════════════════════════════════════════════════════════════════════════
const DYNAMIC = { label: 'Continue where you left off', href: '/acca?paper=AFM' };
const swapped = withAccaDynamicCta(AFM_ACCA_LANDING, DYNAMIC);
const swappedHtml = bodyOf(swapped);
ok('every free-access CTA reads the dynamic label — none still says "Start free"',
  swappedHtml.includes(DYNAMIC.label) && !/>Start free /.test(swappedHtml));
ok('the PAID tier CTAs are untouched',
  swappedHtml.includes('Get the 90-day pass') && swappedHtml.includes('Subscribe monthly'));
ok('the paper-switcher and walkthrough links are untouched',
  swappedHtml.includes('/acca/apm') && swappedHtml.includes('/acca/afm/proof'));
ok('withAccaDynamicCta does not mutate its input',
  AFM_ACCA_LANDING.freeCta.label === 'Start free' &&
  AFM_ACCA_LANDING.hero.ctas[0].label === 'Start free — every drill, no card');
ok('a config whose free CTA href appears nowhere else is otherwise unchanged',
  bodyOf(withAccaDynamicCta(APM_ACCA_LANDING, DYNAMIC)).includes('Get my free resit diagnosis'));

// ── BREAK MODE 12: THE FAQ JSON-LD DRIFTS FROM THE VISIBLE LIST ─────────────
// Structured data asserting questions the page does not ask is the kind of error that costs a
// rich result and that nobody sees. Both are built from one array; this proves it.
for (const [name, html, cfg] of [['APM', apm, APM_ACCA_LANDING], ['AFM', afm, AFM_ACCA_LANDING]] as const) {
  const m = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
  const ld = m ? JSON.parse(m[1].replace(/&quot;/g, '"')) : null;
  ok(`${name}'s FAQPage JSON-LD carries exactly the questions the page shows`,
    !!ld && ld['@type'] === 'FAQPage' && ld.mainEntity.length === cfg.faq.items.length &&
    ld.mainEntity.every((q: { name: string }, i: number) => q.name === cfg.faq.items[i].q));
}

// ── BREAK MODE 13: EXACTLY ONE <h1> ─────────────────────────────────────────
for (const [name, html] of [['APM', apm], ['AFM', afm]] as const) {
  ok(`${name} has exactly one h1`, (html.match(/<h1/g) ?? []).length === 1);
  ok(`${name} labels every section`,
    (html.match(/<section/g) ?? []).length === (html.match(/<section[^>]*aria-label=/g) ?? []).length);
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} acca-landing: ${pass} passed, ${fail} failed\n`);
// P-G4: exitCode, never process.exit().
process.exitCode = fail === 0 ? 0 : 1;
