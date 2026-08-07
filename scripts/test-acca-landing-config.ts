// scripts/test-acca-landing-config.ts — fixtures for the config-driven ACCA landing pages:
// the two SPOKES (/acca/apm, /acca/afm) and, since 2026-08-07, the PILLAR at gradd.ai root.
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
// The PILLAR (break modes 15-21, at the foot) adds a THIRD property. It is not a spoke and is
// not checked as one — it sells the qualification and routes, so its sections, its argument
// and its pricing CTAs are all deliberately different. What it must share is the COMPOSITION
// DISCIPLINE, and the specific regression is that it drifts back into looking like a different
// site: a second dark band competing with the close, a paper card flattened into a feature
// grid, or the spokes' own "taught, not just marked" line repeated at root, where it teaches a
// visitor nothing they will not read again one click later.
//
// It asserts against the RENDERED OUTPUT wherever the claim is about what a visitor sees.
// Asserting on the config object alone would test this file's reading of the config, not the
// page — the `sitCaseGate` lesson.
//
// ⚠️ `test-product-landing.ts` IS DELETED, with the template it tested. That suite carried 11
// break modes about `ProductLandingPage`; every one of them was a claim about a component no
// route rendered any more. The two it made that were about CONTENT rather than the template —
// the BUNDLE_CLAIM detector and the "no /acca href in a shared nav" sweep — live on here, the
// first verbatim (break mode 10) and the second as the per-page link assertions.

import {
  APM_ACCA_LANDING,
  AFM_ACCA_LANDING,
  ACCA_PILLAR_LANDING,
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
const pil = bodyOf(ACCA_PILLAR_LANDING);

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

// ════════════════════════════════════════════════════════════════════════════
// BREAK MODE 14 — THE CREAM-RUN SEAM RULES LAND SOMEWHERE THEY SHOULDN'T.
//
// The body closes with three consecutive CREAM sections, and a 1px --rule hairline is
// drawn at the two seams inside that run so they stop reading as one block. The CSS
// expresses it as "a section with no band class, immediately after a section with no
// band class" — which means its correctness is a property of the ORDER AND CLASSES of
// the rendered sections, not of the declaration.
//
// ⚠️ WHAT THIS CANNOT SEE, stated because the claim ceiling matters more than the check:
// `bodyOf` strips <style>, so this suite CANNOT assert that a border is painted and does
// not claim to. It re-derives the selector's MATCH SET from the class sequence. A green
// result means "the two seams the rule targets are exactly these two, and no band section
// is among them" — NEVER "the hairlines render". That is a CSS fact, held by screenshot.
//
// The break mode it does catch is the one that is invisible in a diff: someone adds a new
// banded section kind (or reorders the body) and the rule either paints a second line onto
// a band's own border, or stops reaching a seam that still needs one.
// ════════════════════════════════════════════════════════════════════════════
const BAND_CLASSES = ['one-sub', 'pricing-band', 'resit-band'];

// The same predicate the CSS chain expresses, re-derived from the rendered markup.
const seamsOf = (html: string): string[] => {
  const sections = [...html.matchAll(/<section[^>]*class="([^"]*)"[^>]*aria-label="([^"]*)"/g)]
    .map((m) => ({ cls: m[1].split(/\s+/), label: m[2] }));
  const isCreamSection = (s: { cls: string[] }) =>
    s.cls.includes('section') && !BAND_CLASSES.some((b) => s.cls.includes(b));
  return sections
    .filter((s, i) => i > 0 && isCreamSection(s) && isCreamSection(sections[i - 1]))
    .map((s) => s.label);
};

// THE FAILURE PATH, RUN (P-G3). A check that only ever sees the good state proves nothing:
// `seamsOf` returning 2 could just as easily mean the regex matched nothing interesting.
// So feed it the break itself — the same markup with the band classes stripped, which is
// exactly what "someone renamed or dropped a band class" looks like — and require that the
// answer MOVES. If this assertion fails, the two checks below are decorative.
ok('the seam check has teeth — stripping the band classes changes the answer',
  (() => {
    const debanded = BAND_CLASSES.reduce((h, b) => h.replaceAll(` ${b}"`, '"'), apm);
    return seamsOf(debanded).length > seamsOf(apm).length;
  })(),
  `real=${seamsOf(apm).length}, debanded=${seamsOf(BAND_CLASSES.reduce((h, b) => h.replaceAll(` ${b}"`, '"'), apm)).length}`);

for (const [name, html] of [['APM', apm], ['AFM', afm]] as const) {
  const seams = seamsOf(html);
  ok(`${name} draws a seam rule at exactly the two cream-run seams`,
    seams.length === 2 && seams[0] === 'The timed mock' && seams[1] === 'How Gradd compares',
    `got [${seams.join(' | ')}]`);
  ok(`${name} draws no seam rule on a banded section, or on the one after a band`,
    !seams.some((label) => /pricing|resit|taught, not just marked|professional-skills marking$/i.test(label)),
    `got [${seams.join(' | ')}]`);
}

// The run is a property of the CONFIG order too: the last three body sections are the cream
// ones. If a future edit slots a banded kind between them the seams above move, and this
// names the reason rather than leaving a bare count mismatch.
for (const [name, cfg] of [['APM', APM_ACCA_LANDING], ['AFM', AFM_ACCA_LANDING]] as const) {
  ok(`${name}'s body still ends with the three-section cream run`,
    kinds(cfg).slice(-3).join(',') === 'CARD_GRID,CARD_GRID,COMPARE_TABLE',
    kinds(cfg).slice(-3).join(','));
}

// ── BREAK MODE 13: EXACTLY ONE <h1> ─────────────────────────────────────────
for (const [name, html] of [['APM', apm], ['AFM', afm], ['pillar', pil]] as const) {
  ok(`${name} has exactly one h1`, (html.match(/<h1/g) ?? []).length === 1);
  ok(`${name} labels every section`,
    (html.match(/<section/g) ?? []).length === (html.match(/<section[^>]*aria-label=/g) ?? []).length);
}

// ════════════════════════════════════════════════════════════════════════════
// THE PILLAR (gradd.ai root) — BREAK MODES 15-21.
//
// It joined this component 2026-08-07 (`feat/acca-pillar-config`). It is NOT a third spoke and
// must not be checked as one: it sells the qualification and routes, so its section list, its
// argument and its pricing CTAs are all deliberately different. What it must share is the
// COMPOSITION DISCIPLINE — the band rhythm, one dark moment, forest reserved for the close —
// because "reads as their sibling" is the whole reason it moved.
// ════════════════════════════════════════════════════════════════════════════

// ── BREAK MODE 15: THE PILLAR REPEATS THE SPOKES' ARGUMENT ──────────────────
// The specific thing this rebuild exists to prevent. "Taught, not just marked" is the SPOKES'
// line — both carry it as a section heading — and a root that repeats it teaches a visitor
// nothing they will not read again one click later. Checked in BOTH directions: only asserting
// the pillar's own line passes a page that says both.
// Matched in HALVES, because both statements of the argument are split by the page's heading
// idiom — the rust italic tail is a separate element, so "Nobody marks what you write" never
// appears as one string in the markup. Asserting the whole phrase would fail on a page that
// says it perfectly, which is the worse kind of broken check.
ok('the pillar states its OWN argument — nobody marks what you write',
  /Nobody marks/.test(pil) && /what you write\./.test(pil));
ok('and states it again in the compare section', /Almost nobody/.test(pil) && /marks you\./.test(pil));
ok('the pillar never borrows "taught, not just marked"', !/taught, not just/i.test(pil));
ok('both spokes still keep that line', /taught, not just/i.test(apm) && /taught, not just/i.test(afm));
ok('the pillar makes no judgement-paper or execution-test claim — those are the papers\', not the qualification\'s',
  !/judgement paper/i.test(pil) && !/execution test/i.test(pil));

// ── BREAK MODE 16: THE PILLAR'S THREE UNIQUE BLOCKS GET FLATTENED ───────────
// The instruction was that the counts strip, the pacing feature and the paper cards would NOT
// fit a card grid and should not be forced into one. The regression is a later edit "simplifying"
// one of them into CARD_GRID — which typechecks, renders, and silently drops the CTA that makes
// the paper cards routing rather than decoration.
const pilKinds = kinds(ACCA_PILLAR_LANDING).join(',');
ok('the pillar renders its own five-section body, in order',
  pilKinds === 'STAT_STRIP,PROOF_ROW,FEATURE_PANEL,COMPARE_TABLE,PAPER_CARDS', pilKinds);
ok('the counts strip renders as a strip, not a section', pil.includes('class="trust"') && pil.includes('trust-stat'));
ok('the pacing feature renders bullets AND a panel', pil.includes('feat-bullets') && pil.includes('mark-panel'));
ok('each paper card carries a link into that paper',
  pil.includes('paper-card') && pil.includes('href="/acca/apm"') && pil.includes('href="/acca/afm"'));
// The <em> is why bullets are RichText rather than strings: "not reached" is a status the
// product reports verbatim, and a bullet that cannot carry markup would lose the distinction.
ok('the "not reached" bullet keeps its emphasis', /<em>not reached<\/em>/.test(pil));

// ── BREAK MODE 17: THE PILLAR STOPS READING AS THEIR SIBLING ────────────────
// Composition, not content. The spokes' discipline is that forest appears ONCE, at the close,
// and every other band alternates cream / sage. The page this replaced broke it — it had a
// dark proof band competing with its own closing CTA, which is the exact defect Grant's
// 2026-08-05 ruling cited when the template lost APM.
const bandsOf = (html: string) =>
  [...html.matchAll(/<section[^>]*class="([^"]*)"/g)].map((m) => m[1]);
const pilBands = bandsOf(pil);
ok('the pillar alternates cream and sage — no two sage bands in a row',
  !pilBands.some((c, i) => i > 0 && c.includes('one-sub') && pilBands[i - 1].includes('one-sub')),
  pilBands.join(' | '));
ok('the pillar has exactly one forest moment, and it is the close',
  (pil.match(/class="final-cta"/g) ?? []).length === 1 && !/band-dark/.test(pil));
ok('the pillar draws no cream-run seam rule — its bands alternate, so there is no run',
  seamsOf(pil).length === 0, `got [${seamsOf(pil).join(' | ')}]`);
// The strip is what makes the hero→proof adjacency a non-seam. Prove the check would notice
// if it were rendered as a plain section instead of a strip (P-G3: run the failure path).
ok('the seam check would SEE a strip demoted to a plain section',
  seamsOf(pil.replace('class="trust"', 'class="section"')).length > 0);

// ── BREAK MODE 18: AN OPTIONAL SLOT RENDERS AN EMPTY SHELL ──────────────────
// The pillar omits BOTH optional page-level slots. The careless implementation renders the
// wrapper — which still typechecks and leaves a heading over blank space. The JSON-LD case is
// worse than cosmetic: a FAQPage asserting questions the page does not ask is a rich result
// built on nothing.
ok('the pillar renders NO resit band — not an empty one', !pil.includes('resit-band'));
ok('the pillar renders NO FAQ block', !pil.includes('faq-list') && !pil.includes('faq-item'));
ok('the pillar emits NO FAQPage JSON-LD', !pil.includes('application/ld+json'));
ok('both spokes still emit theirs', apm.includes('FAQPage') && afm.includes('FAQPage'));

// ════════════════════════════════════════════════════════════════════════════
// BREAK MODE 19 — THE PER-PAPER PRICING RULE GOES QUIET ON THE ONE PAGE THAT
// SELLS BOTH PAPERS.
//
// This is the pillar's highest-consequence claim. A student who reads a two-paper page and
// assumes one purchase covers both has been misled by omission, and the pillar is the LAST
// surface that can correct it before they reach a spoke. It must be stated, and the paid CTAs
// must not imply a paper-agnostic checkout — there is no such product.
// ════════════════════════════════════════════════════════════════════════════
ok('the pillar says buying APM does not include AFM, in those words',
  /Buying APM does not include AFM/.test(pil));
ok('the pillar states per-paper pricing more than once', (pil.match(/per paper/gi) ?? []).length >= 3);
ok('the pillar makes no bundle claim anywhere on the page', !BUNDLE_CLAIM.test(pil));
ok('no paid tier links to a checkout — both route to the paper choice',
  (pil.match(/href="#papers"/g) ?? []).length === 2 && !/acca\/subscribe/.test(pil));

// ── BREAK MODE 20: A COUNT DRIFTS BETWEEN THE PILLAR AND A SPOKE ────────────
// 91 and 63 are stated on THREE pages now. The failure is not a typo: it is one number updated
// where it was noticed and left everywhere else. 154 is their sum and must stay so.
ok('the pillar states both papers\' counts, and they are the spokes\' own',
  /91 drills/.test(pil) && /63 drills/.test(pil));
ok('the pillar\'s total is the sum of the two it states', /154/.test(pil) && 91 + 63 === 154);
ok('the pillar makes no code-owns-the-marking claim', !MARKING_OVERCLAIM.test(pil));

// ── BREAK MODE 21: THE THINGS THE REBUILD WAS TOLD TO KEEP ──────────────────
// Each of these was correct on the page this replaces, and each is the kind of thing a rewrite
// drops silently. The /ib link is the load-bearing one: nothing else on gradd.ai links to the
// IB landing since the hub was deleted, so losing it makes /ib unreachable and uncrawlable
// from every page on the site.
ok('the resit CTA survives, and is still scoped to APM',
  pil.includes('/acca/resit') && /Failed APM/.test(pil) && !/Failed a paper/i.test(pil));
ok('the resit close offers an alternative for a visitor not sitting APM',
  /Start free instead/.test(pil));
ok('the /ib footer link survives — it is IB\'s only inbound link on gradd.ai',
  pil.includes('href="/ib"'));
ok('the walkthrough link survives', pil.includes('/acca/afm/proof'));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} acca-landing: ${pass} passed, ${fail} failed\n`);
// P-G4: exitCode, never process.exit().
process.exitCode = fail === 0 ? 0 : 1;
