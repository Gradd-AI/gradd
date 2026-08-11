// scripts/test-blog-subject.ts   —   npm run test:blog-subject
//
// PURE. No fs reads of the DB, no network, no env. In the contract gate by discovery
// (scripts/run-contracts.ts runs every `scripts/test-*.ts`), so this is armed on every build.
//
// ── WHAT THIS GUARDS ────────────────────────────────────────────────────────────────────
// The blog was built when ACCA meant APM and the site root meant IB. Neither is true now.
// Four sites each encoded one of those assumptions independently and every one of them
// typechecked either way, so the failure was silent in all four:
//
//   (a) the unfiltered archive rendered as the IB view — IB title, /ib logo — while holding
//       nine ACCA posts, and it is the canonical url for every post and the blog's only
//       sitemap entry, so it was the document search engines file the blog under;
//   (b) the IB filter was `p.subject !== 'APM'`, so an AFM post landed in the IB view;
//   (c) the badge was `subject === 'APM' ? 'ACCA APM' : `IB ${subject}``, so an AFM post
//       would have read "IB AFM";
//   (d) BlogCTA keyed everything off `isAPM`, so an AFM post got Mia, the IB curriculum note
//       and /auth/signup/ib — the wrong PRODUCT, at the conversion point.
//
// P-G3: each of those four wrong answers is pinned below as a MUST-FAIL, not merely replaced
// by an assertion of the right one. A test that only asserts the new behaviour goes green
// again the moment someone reintroduces the old branch alongside it.
//
// P-G6: `resolveSubject` is exercised with the shape Next actually hands a page —
// `string | string[] | undefined` — including the repeated-param ARRAY and mixed case. That
// is not pedantry: `lib/acca/case-surface.ts` exists because `?paper=AFM&paper=AFM` arrives
// as an array and an exact-match parser resolved it to the wrong paper on a live surface.

import { readFileSync } from 'fs';
import { join } from 'path';
import {
  BLOG_SUBJECTS,
  resolveSubject,
  filterForSubject,
  subjectMatchesFilter,
  productForSubject,
  accaPaperForSubject,
  accaAuthHref,
  archiveHref,
  subjectBadge,
  blogIdentity,
  ctaCopyFor,
  archiveMetaFor,
  intentGroupsFor,
  usesIntentGroups,
  type BlogSubject,
  type SubjectFilter,
} from '../lib/blog-subject';
import { DEFAULT_PAPER } from '../lib/acca/paper';
import { paperHref } from '../lib/acca/paper-url';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};
const eq = (label: string, actual: unknown, expected: unknown) =>
  ok(label, actual === expected, `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);

// ── 1. resolveSubject — THE INPUT IS A ROUTE PARAM (P-G6) ───────────────────────────────
console.log('\n1. resolveSubject — Next\'s raw searchParams shape');

// A page receives `string | string[] | undefined`. All three are exercised.
eq('undefined (no param at all) → null', resolveSubject(undefined), null);
eq("'apm' → apm", resolveSubject('apm'), 'apm');
eq("'afm' → afm", resolveSubject('afm'), 'afm');
eq("'acca' → acca", resolveSubject('acca'), 'acca');
eq("'ib' → ib", resolveSubject('ib'), 'ib');
eq("unrecognised 'lc' → null (neutral archive)", resolveSubject('lc'), null);
eq("empty string → null", resolveSubject(''), null);

// The array arm — `?subject=afm&subject=afm`. This is the case-surface lesson: an exact
// `raw === 'afm'` comparison against an ARRAY is false, and the reader silently gets the
// catch-all instead of the view they asked for twice.
eq("['afm','afm'] (repeated param) → afm", resolveSubject(['afm', 'afm']), 'afm');
eq("['ib'] → ib", resolveSubject(['ib']), 'ib');
eq("[] (empty array) → null", resolveSubject([]), null);

// Case and whitespace. `?subject=AFM` plainly names AFM.
eq("'AFM' (uppercase) → afm", resolveSubject('AFM'), 'afm');
eq("' Apm ' (padded, mixed case) → apm", resolveSubject(' Apm '), 'apm');

// MUST-FAIL (P-G3): the pre-fix parser. Exact lowercase match against the first element only,
// knowing two values. Pinned as a function so its wrong answers are asserted, not described.
const preFixResolve = (raw: string | string[] | undefined): SubjectFilter => {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (v === 'apm') return 'apm';
  if (v === 'ib') return 'ib';
  return null;
};
ok('MUST-FAIL: pre-fix parser resolved ?subject=afm to null', preFixResolve('afm') === null);
ok("MUST-FAIL: pre-fix parser resolved ?subject=AFM to null", preFixResolve('AFM') === null);
ok('MUST-FAIL: pre-fix parser resolved ?subject=acca to null', preFixResolve('acca') === null);

// ── 2. The subject table — product and paper ────────────────────────────────────────────
console.log('\n2. subject → product → paper');

eq('BLOG_SUBJECTS is the four live subjects', BLOG_SUBJECTS.join(','), 'Econ,BM,APM,AFM');
eq('Econ is IB', productForSubject('Econ'), 'IB');
eq('BM is IB', productForSubject('BM'), 'IB');
eq('APM is ACCA', productForSubject('APM'), 'ACCA');
eq('AFM is ACCA', productForSubject('AFM'), 'ACCA');

// THE CROSS-CHECK: two independent sources of the same fact must agree. `productForSubject`
// reads this module's table; `accaPaperForSubject` delegates to `strictPaper` in
// lib/acca/paper.ts. If a subject is ever added to one and not the other, this catches it.
for (const s of BLOG_SUBJECTS) {
  const viaTable = productForSubject(s) === 'ACCA';
  const viaPaper = accaPaperForSubject(s) !== null;
  ok(`${s}: the product table and strictPaper agree`, viaTable === viaPaper,
    `table says ACCA=${viaTable}, strictPaper says ${viaPaper}`);
}
eq('accaPaperForSubject(Econ) refuses rather than defaulting', accaPaperForSubject('Econ'), null);
eq('accaPaperForSubject(BM) refuses rather than defaulting', accaPaperForSubject('BM'), null);
eq('accaPaperForSubject(AFM)', accaPaperForSubject('AFM'), 'AFM');

// MUST-FAIL (P-G3): `resolvePaper` in place of `strictPaper` here. Its APM default is the
// documented hazard — it would answer 'APM' for an IB post and build an ACCA link on it.
const viaResolvePaper = (raw: unknown) => (raw === 'AFM' ? 'AFM' : DEFAULT_PAPER);
ok('MUST-FAIL: resolvePaper would call an Econ post APM', viaResolvePaper('Econ') === 'APM');
ok('MUST-FAIL: resolvePaper would call a BM post APM', viaResolvePaper('BM') === 'APM');

// ── 3. Filter membership — POSITIVE, defect (b) ─────────────────────────────────────────
console.log('\n3. subjectMatchesFilter — which posts appear in which view');

const shows = (filter: SubjectFilter) =>
  BLOG_SUBJECTS.filter(s => subjectMatchesFilter(s, filter)).join(',');

eq('null (neutral) shows everything', shows(null), 'Econ,BM,APM,AFM');
eq('acca shows both papers only', shows('acca'), 'APM,AFM');
eq('ib shows the two IB subjects only', shows('ib'), 'Econ,BM');
eq('apm shows APM only', shows('apm'), 'APM');
eq('afm shows AFM only', shows('afm'), 'AFM');

// The defect, stated directly.
ok('an AFM post does NOT appear in the IB view', !subjectMatchesFilter('AFM', 'ib'));
ok('an APM post does NOT appear in the IB view', !subjectMatchesFilter('APM', 'ib'));
ok('an Econ post does NOT appear in the ACCA view', !subjectMatchesFilter('Econ', 'acca'));

// MUST-FAIL (P-G3): the pre-fix negative-space filter.
const preFixIsIB = (s: BlogSubject) => s !== 'APM';
ok('MUST-FAIL: `!== APM` filed an AFM post under IB', preFixIsIB('AFM') === true);
ok('MUST-FAIL: `!== APM` was right about Econ, which is why it survived', preFixIsIB('Econ') === true);

// ── 4. Badge — defect (c) ───────────────────────────────────────────────────────────────
console.log('\n4. subjectBadge');

// The three live badges are pinned BYTE-IDENTICAL: they are on indexed pages and this change
// is about AFM and the neutral archive, not about relabelling what already ships.
eq('APM badge unchanged', subjectBadge('APM'), 'ACCA APM');
eq('Econ badge unchanged', subjectBadge('Econ'), 'IB Econ');
eq('BM badge unchanged', subjectBadge('BM'), 'IB BM');
eq('AFM badge', subjectBadge('AFM'), 'ACCA AFM');

const preFixBadge = (s: BlogSubject) => (s === 'APM' ? 'ACCA APM' : `IB ${s}`);
ok('MUST-FAIL: the pre-fix badge rendered "IB AFM"', preFixBadge('AFM') === 'IB AFM');

// ── 5. Header identity — defect (a), the neutral archive ────────────────────────────────
console.log('\n5. blogIdentity — where the logo goes, per view');

eq('apm logo → root (the ACCA pillar)', blogIdentity('apm').homeHref, '/');
eq('afm logo → root (the ACCA pillar)', blogIdentity('afm').homeHref, '/');
eq('acca logo → root (the ACCA pillar)', blogIdentity('acca').homeHref, '/');
eq('ib logo → /ib', blogIdentity('ib').homeHref, '/ib');
eq('neutral logo → / (site root, not a product claim)', blogIdentity(null).homeHref, '/');

// THE REPORTED SYMPTOM, pinned: no ACCA view may send its logo to the IB landing.
for (const f of ['apm', 'afm', 'acca'] as const) {
  ok(`${f} logo is NOT /ib`, blogIdentity(f).homeHref !== '/ib');
}

// MUST-FAIL (P-G3): the pre-fix binary. Both call sites answered a three-way question with
// two words, so `null` — the mixed archive — became the IB view and its logo became /ib.
const preFixHeaderSubject = (f: SubjectFilter) => (f === 'apm' ? 'apm' : 'ib');
const preFixHomeHref = (f: SubjectFilter) => (preFixHeaderSubject(f) === 'apm' ? '/' : '/ib');
ok('MUST-FAIL: the pre-fix header sent the NEUTRAL archive to /ib', preFixHomeHref(null) === '/ib');
ok('MUST-FAIL: the pre-fix header sent an AFM view to /ib', preFixHomeHref('afm') === '/ib');
ok('MUST-FAIL: the pre-fix header sent the ACCA group view to /ib', preFixHomeHref('acca') === '/ib');
ok('MUST-FAIL: the pre-fix header was right about APM, which is why it survived',
  preFixHomeHref('apm') === '/');

console.log('\n5b. blogIdentity — wordmark, CTA and the neutral archive\'s doors');

eq('apm wordmark unchanged', blogIdentity('apm').wordmark?.label, 'ACCA APM');
eq('apm wordmark href unchanged', blogIdentity('apm').wordmark?.href, '/blog?subject=apm');
eq('afm wordmark', blogIdentity('afm').wordmark?.label, 'ACCA AFM');
eq('afm wordmark href', blogIdentity('afm').wordmark?.href, '/blog?subject=afm');
eq('the group view names neither paper', blogIdentity('acca').wordmark?.label, 'ACCA');
eq('ib has no wordmark (unchanged)', blogIdentity('ib').wordmark, null);

// The neutral archive: no wordmark, NO CTA, both doors. A single "Start free" there is a
// guess about a reader who has not declared a product — which is the defect, not a fix for it.
eq('neutral has no wordmark', blogIdentity(null).wordmark, null);
eq('neutral has NO CTA', blogIdentity(null).cta, null);
eq('neutral offers two doors', blogIdentity(null).doors.length, 2);
eq('neutral door 1 → the ACCA archive', blogIdentity(null).doors[0]?.href, '/blog?subject=acca');
eq('neutral door 2 → the IB archive', blogIdentity(null).doors[1]?.href, '/blog?subject=ib');
for (const f of ['apm', 'afm', 'acca', 'ib'] as const) {
  eq(`${f} is a scoped view, so it offers no doors`, blogIdentity(f).doors.length, 0);
}

// ── 6. The ACCA outbound links — paper inside the encoded next= ─────────────────────────
console.log('\n6. accaAuthHref — the paper rides inside next=');

eq('APM auth href is byte-identical to the literal the pillar already uses',
  accaAuthHref('APM'), '/acca/auth?next=%2Facca');
eq('AFM auth href carries the paper inside next=',
  accaAuthHref('AFM'), '/acca/auth?next=%2Facca%3Fpaper%3DAFM');

// It is built from paperHref, not concatenated by hand — that is what stops it becoming a
// fourth private variant of the rule. Asserted by construction, not by string equality alone.
eq('APM auth href is paperHref-built', accaAuthHref('APM'),
  `/acca/auth?next=${encodeURIComponent(paperHref('/acca', 'APM'))}`);
eq('AFM auth href is paperHref-built', accaAuthHref('AFM'),
  `/acca/auth?next=${encodeURIComponent(paperHref('/acca', 'AFM'))}`);

// The three exempt categories in paper-url.ts: an auth link carries NO bare ?paper= outside
// the encoded next=, because that would be two sources of truth for one fact.
for (const p of ['APM', 'AFM'] as const) {
  ok(`${p} auth href has no second, unencoded ?paper=`, !/[?&]paper=/.test(accaAuthHref(p)));
}

// The header CTA per view.
eq('apm CTA unchanged', blogIdentity('apm').cta?.href, '/acca/auth?next=%2Facca');
eq('afm CTA carries AFM', blogIdentity('afm').cta?.href, '/acca/auth?next=%2Facca%3Fpaper%3DAFM');
eq('acca group CTA inherits the pillar default', blogIdentity('acca').cta?.href,
  `/acca/auth?next=${encodeURIComponent(paperHref('/acca', DEFAULT_PAPER))}`);
eq('ib CTA unchanged', blogIdentity('ib').cta?.href, '/auth/signup/ib');

// ── 7. The end-of-post CTA — defect (d), the conversion point ───────────────────────────
console.log('\n7. ctaCopyFor — the post CTA');

// APM and IB copy pinned byte-identical: live, indexed, unchanged by this work.
eq('APM headline unchanged', ctaCopyFor('APM').headline, 'Ezra teaches this — and checks you’d score.');
eq('APM note unchanged', ctaCopyFor('APM').note, 'Every APM drill free. No card.');
eq('APM href unchanged', ctaCopyFor('APM').href, '/acca/auth?next=%2Facca');
eq('APM button unchanged', ctaCopyFor('APM').button, 'Try Ezra free →');
eq('Econ headline unchanged', ctaCopyFor('Econ').headline, 'Stop practising the wrong answer.');
eq('Econ href unchanged', ctaCopyFor('Econ').href, '/auth/signup/ib');
eq('BM href unchanged', ctaCopyFor('BM').href, '/auth/signup/ib');

// AFM: Ezra, AFM's own note, AFM's own auth link.
eq('AFM gets Ezra, not Mia', ctaCopyFor('AFM').button, 'Try Ezra free →');
eq('AFM note names AFM', ctaCopyFor('AFM').note, 'Every AFM drill free. No card.');
eq('AFM href carries AFM', ctaCopyFor('AFM').href, '/acca/auth?next=%2Facca%3Fpaper%3DAFM');

// The cross-product mis-send, stated directly: no ACCA post may be sent to the IB signup,
// and no IB post to the ACCA one.
for (const s of BLOG_SUBJECTS) {
  const href = ctaCopyFor(s).href;
  const isAcca = productForSubject(s) === 'ACCA';
  ok(`${s} CTA goes to its own product`,
    isAcca ? href.startsWith('/acca/auth') : href === '/auth/signup/ib', href);
  ok(`${s} CTA names its own tutor`,
    ctaCopyFor(s).button === (isAcca ? 'Try Ezra free →' : 'Try Mia free →'));
}

// MUST-FAIL (P-G3): the pre-fix CTA. `isAPM = subject === 'APM'` — everything that was not
// APM got Mia and the IB signup, so an AFM post was offered the wrong product entirely.
const preFixCta = (s: string) => ({
  href: s === 'APM' ? '/acca/auth?next=/acca' : '/auth/signup/ib',
  note: s === 'APM' ? 'Every APM drill free. No card.'
    : 'Across the full IB Economics and Business Management curriculum. Free to start. No card needed.',
  button: s === 'APM' ? 'Try Ezra free →' : 'Try Mia free →',
});
ok('MUST-FAIL: the pre-fix CTA sent an AFM post to /auth/signup/ib',
  preFixCta('AFM').href === '/auth/signup/ib');
ok('MUST-FAIL: the pre-fix CTA offered an AFM post Mia', preFixCta('AFM').button === 'Try Mia free →');
ok('MUST-FAIL: the pre-fix CTA offered an AFM post the IB curriculum note',
  preFixCta('AFM').note.includes('IB Economics and Business Management'));
ok('MUST-FAIL: the pre-fix CTA never carried a paper, so APM was implicit',
  !preFixCta('APM').href.includes('paper='));

// ── 8. Archive metadata — defect (a), the SEO half ──────────────────────────────────────
console.log('\n8. archiveMetaFor');

eq('apm title unchanged (indexed)', archiveMetaFor('apm').title,
  'ACCA APM — exam technique, marking and the syllabus, explained');
eq('ib title unchanged (indexed)', archiveMetaFor('ib').title, 'Gradd Blog — IB exam clarity');
eq('ib description unchanged (indexed)', archiveMetaFor('ib').description,
  'Common IB Economics and Business Management misconceptions, explained.');

// The neutral archive is the canonical document for every post. It must claim neither product
// exclusively, and must name both.
const neutral = archiveMetaFor(null);
ok('neutral title names ACCA', neutral.title.includes('ACCA'));
ok('neutral title names IB', neutral.title.includes('IB'));
ok('neutral description names ACCA', neutral.description.includes('ACCA'));
ok('neutral description names IB', neutral.description.includes('IB'));
ok('the neutral archive is NOT titled as the IB view',
  neutral.title !== archiveMetaFor('ib').title);
ok('the neutral archive is NOT described as the IB view',
  neutral.description !== archiveMetaFor('ib').description);
ok('afm title names AFM', archiveMetaFor('afm').title.includes('AFM'));
ok('the ACCA group title names both papers',
  archiveMetaFor('acca').title.includes('APM') && archiveMetaFor('acca').title.includes('AFM'));

// MUST-FAIL (P-G3): the pre-fix metadata rule — one ternary, so every non-APM view including
// the neutral archive was titled "IB exam clarity".
const preFixTitle = (f: SubjectFilter) =>
  f === 'apm' ? 'ACCA APM — exam technique, marking and the syllabus, explained' : 'Gradd Blog — IB exam clarity';
ok('MUST-FAIL: the pre-fix rule titled the NEUTRAL archive "IB exam clarity"',
  preFixTitle(null) === 'Gradd Blog — IB exam clarity');
ok('MUST-FAIL: the pre-fix rule titled the AFM archive "IB exam clarity"',
  preFixTitle('afm') === 'Gradd Blog — IB exam clarity');

// ── 9. Grouping ─────────────────────────────────────────────────────────────────────────
console.log('\n9. intent grouping');

ok('apm is grouped', usesIntentGroups('apm'));
ok('afm is grouped', usesIntentGroups('afm'));
ok('acca is grouped', usesIntentGroups('acca'));
ok('ib is flat', !usesIntentGroups('ib'));
ok('the neutral archive is flat (grouping it would file Econ under "Failed APM?")',
  !usesIntentGroups(null));

eq('the APM failure heading is unchanged', intentGroupsFor('apm')[0]?.label, 'Failed APM?');
eq('the AFM failure heading names AFM', intentGroupsFor('afm')[0]?.label, 'Failed AFM?');
eq('the group view names neither paper', intentGroupsFor('acca')[0]?.label, 'Failed the exam?');
eq('ungrouped views get no groups', intentGroupsFor('ib').length, 0);
eq('the three buckets are unchanged in shape', intentGroupsFor('apm').map(g => g.intents.join('+')).join('|'),
  'failure|technique|syllabus+exam-structure');

// MUST-FAIL (P-G3): a constant heading. "Failed APM?" over a list containing AFM posts is the
// same category of wrong answer as the badge that read "IB AFM".
ok('MUST-FAIL: a constant heading would say "Failed APM?" over the AFM archive',
  'Failed APM?' !== intentGroupsFor('afm')[0]?.label);

// ── 10. Round trips ─────────────────────────────────────────────────────────────────────
console.log('\n10. round trips — a post reaches its own archive and back');

for (const s of BLOG_SUBJECTS) {
  const view = filterForSubject(s);
  ok(`${s}: its own view shows it`, subjectMatchesFilter(s, view));
  // The href the post's back-link uses must parse back to the same view — the write/read
  // property paper-url.ts is built around, applied to this module's own param.
  const param = archiveHref(view).split('?subject=')[1];
  eq(`${s}: archiveHref → resolveSubject round trip`, resolveSubject(param), view);
}
eq('archiveHref(null) is the bare archive', archiveHref(null), '/blog');
eq('archiveHref(apm) unchanged', archiveHref('apm'), '/blog?subject=apm');

// ── 11. IS THE RULE USED? The static sweep. ─────────────────────────────────────────────
// The unit assertions above prove the rule is RIGHT and cannot prove it is USED, which is
// what every defect in this class actually was — test-paper-link-sweep.ts exists for exactly
// this reason and its SURFACES list excludes both the landing configs and the blog. So: no
// ACCA surface may link to the bare, mixed archive, and no blog file may rebuild the rule.
console.log('\n11. static sweep — no ACCA surface links to the mixed archive');

const ROOT = join(__dirname, '..');
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8');

// Comments are blanked to spaces (indices preserved) before matching: this file's own
// prose quotes the bad literals, and so do the explanatory comments left at each fixed site.
const blankComments = (src: string) =>
  src
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .replace(/\/\/[^\n]*/g, m => m.replace(/[^\n]/g, ' '));

const config = blankComments(read('components/landing/acca-landing-config.ts'));
const blogLinks = [...config.matchAll(/href:\s*'(\/blog[^']*)'/g)].map(m => m[1]);
eq('the ACCA landing config has five Blog links', blogLinks.length, 5);
ok('no ACCA landing link points at the bare /blog',
  blogLinks.every(h => h !== '/blog'), blogLinks.join(' , '));
ok('every ACCA landing Blog link is an ACCA-scoped view',
  blogLinks.every(h => h === '/blog?subject=apm' || h === '/blog?subject=acca'), blogLinks.join(' , '));

// The IB landing keeps its own scoped view — it was already correct and must stay that way.
const ibLanding = blankComments(read('components/landing/IBLandingPage.tsx'));
const ibLinks = [...ibLanding.matchAll(/href="(\/blog[^"]*)"/g)].map(m => m[1]);
eq('the IB landing has two Blog links', ibLinks.length, 2);
ok('both IB landing Blog links are IB-scoped', ibLinks.every(h => h === '/blog?subject=ib'),
  ibLinks.join(' , '));

// No blog file may rebuild the rule locally — that is how four independent copies happened.
for (const rel of ['app/blog/page.tsx', 'app/blog/[slug]/page.tsx',
                   'components/blog/BlogHeader.tsx', 'components/blog/BlogCTA.tsx']) {
  const src = blankComments(read(rel));
  ok(`${rel}: no local "=== 'APM'" product test`, !/===\s*'APM'/.test(src));
  ok(`${rel}: no local "!== 'APM'" filter`, !/!==\s*'APM'/.test(src));
  ok(`${rel}: no hardcoded /ib logo target`, !/'\/ib'/.test(src));
  ok(`${rel}: no hand-built /acca/auth link`, !/'\/acca\/auth/.test(src));
}
// And each one must actually import the shared module, or the checks above pass vacuously.
for (const rel of ['app/blog/page.tsx', 'app/blog/[slug]/page.tsx',
                   'components/blog/BlogHeader.tsx', 'components/blog/BlogCTA.tsx']) {
  ok(`${rel}: imports lib/blog-subject`, read(rel).includes("from '@/lib/blog-subject'"));
}

// ── 12. THE CONTENT ITSELF ──────────────────────────────────────────────────────────────
// Frontmatter is not typechecked — `matter()` returns `any` and the cast to PostMeta is a
// promise, not a check. A typo'd subject would silently land in whichever view its arm of the
// old ternary chose. Cheap to verify here, and it is what makes the union load-bearing.
console.log('\n12. every post declares a known subject');

const { readdirSync } = require('fs') as typeof import('fs');
const POSTS = join(ROOT, 'content', 'blog');
const files = readdirSync(POSTS).filter(f => f.endsWith('.md'));
ok('there are posts to check', files.length > 0);
for (const f of files) {
  const m = /^subject:\s*(\S+)\s*$/m.exec(read(join('content', 'blog', f)));
  const declared = m?.[1];
  ok(`${f}: subject "${declared}" is a known subject`,
    !!declared && (BLOG_SUBJECTS as readonly string[]).includes(declared));
}

console.log(`\n${pass} passed, ${fail} failed`);
if (fail > 0) process.exitCode = 1;
