// scripts/test-paper-url.ts — fixtures for the paper-at-a-URL-boundary rule.
// Pure: no DB, no model, no network. Run: npm run test:paper-url
//
// P-G3: every break mode is NAMED, and each names the DEFECT it prevents rather than the
// line it covers. Both bugs this module closes typechecked perfectly and navigated
// successfully — one just navigated an AFM student onto APM content, and the other sold
// them the wrong paper. Nothing short of a behavioural assertion catches that class.
//
// P-G6: the inputs below are the shape PRODUCTION builds. `param` is `string | null`
// because that is what `searchParams.get()` returns (null = key absent, '' = key present
// and empty — DIFFERENT facts, and conflating them is the bug). The referrer is fed as a
// RAW `document.referrer` value — a full URL, or '' when the browser withholds it — never
// a pre-matched boolean, because deciding what counts as an AFM referrer is part of what
// is under test.

import { paperHref, resolveSubscribePaper } from '../lib/acca/paper-url';
import { ACCA_PAPERS, DEFAULT_PAPER, resolvePaper, type AccaPaper } from '../lib/acca/paper';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\npaper-url — a link must carry the paper it was built for, and a URL must not be guessed past\n');

// ── BREAK MODE 0: THE FIXTURES AGREE WITH THE CODE AND DISCRIMINATE NOTHING ──
// The wrong implementations are PINNED here and asserted to FAIL, the way the hedging
// fixtures pin the superseded lock-in and premium formulas. A green suite that a broken
// implementation would also pass is not evidence, and each of these is one plausible edit away.
//
//   BARE       — what shipped at the defect sites: drop the paper entirely. THE defect.
//   ALWAYS     — the tempting over-correction: append the paper unconditionally, which
//                changes every APM URL in the product and breaks the drop-in property.
//   LITERAL_QS — the naive concat: always use '?', which corrupts a path that already
//                has a query into '/acca/tutor?area=B1?paper=AFM'.
const BARE = (path: string, _p: AccaPaper) => path;
const ALWAYS = (path: string, p: AccaPaper) => `${path}?paper=${p}`;
const LITERAL_QS = (path: string, p: AccaPaper) =>
  p === DEFAULT_PAPER ? path : `${path}?paper=${p}`;

ok('MUST-FAIL: dropping the paper is caught — AFM and APM produce the same link',
  BARE('/acca', 'AFM') === BARE('/acca', 'APM'));
ok('MUST-FAIL: appending unconditionally is caught — it dirties the APM URL',
  ALWAYS('/acca', 'APM') !== '/acca');
ok('MUST-FAIL: naive concat is caught — a second "?" corrupts an existing query',
  LITERAL_QS('/acca/tutor?area=B1', 'AFM').split('?').length !== 2);
ok('and the real rule passes all three checks the pins fail',
  paperHref('/acca', 'AFM') !== paperHref('/acca', 'APM')
  && paperHref('/acca', 'APM') === '/acca'
  && paperHref('/acca/tutor?area=B1', 'AFM').split('?').length === 2);

// ── THE POSITIVE CONTROL ─────────────────────────────────────────────────────
// The default paper gets NO param. This is what makes paperHref a drop-in for the 17
// hand-built ternaries rather than a change to every APM URL in the product. A suite
// without this passes just as happily on an implementation that always appends.
console.log('\n  — positive control: the default paper is byte-identical to the bare string —');
ok('paperHref("/acca", "APM") === "/acca"', paperHref('/acca', 'APM') === '/acca',
  paperHref('/acca', 'APM'));
ok('paperHref("/acca/progress", "APM") === "/acca/progress"',
  paperHref('/acca/progress', 'APM') === '/acca/progress');
ok('paperHref("/acca/subscribe", "APM") === "/acca/subscribe"',
  paperHref('/acca/subscribe', 'APM') === '/acca/subscribe');
ok('an existing query is untouched for the default paper',
  paperHref('/acca/tutor?area=B1c', 'APM') === '/acca/tutor?area=B1c');

// ── BREAK MODE 1: THE PAPER IS DROPPED ───────────────────────────────────────
// THE defect (b). Each of these replaced a bare literal at a real site.
console.log('\n  — the non-default paper is carried —');
ok('/acca (progress wordmark, CaseList back-link, 404 replaces)',
  paperHref('/acca', 'AFM') === '/acca?paper=AFM');
ok('/acca/progress (dashboard + SitRunner nav)',
  paperHref('/acca/progress', 'AFM') === '/acca/progress?paper=AFM');
ok('/acca/subscribe (dashboard, progress, tutor, case upsells)',
  paperHref('/acca/subscribe', 'AFM') === '/acca/subscribe?paper=AFM');
ok('an existing query gets & not ?',
  paperHref('/acca/tutor?area=B1c', 'AFM') === '/acca/tutor?area=B1c&paper=AFM');
ok('multiple existing pairs are preserved in order',
  paperHref('/acca/tutor?area=B1c&foo=bar', 'AFM') === '/acca/tutor?area=B1c&foo=bar&paper=AFM');

// ── BREAK MODE 2: THE ROUND TRIP BREAKS ──────────────────────────────────────
// The property that actually has to hold, and the reason DEFAULT_PAPER is a shared
// constant rather than a literal in each function. If resolvePaper's default and
// paperHref's omission ever disagree, a link built for one paper resolves to the other —
// silently, with nothing typechecking differently.
console.log('\n  — write then read returns the same paper, for every paper —');
for (const p of ACCA_PAPERS) {
  const href = paperHref('/acca', p);
  const readBack = resolvePaper(new URLSearchParams(href.split('?')[1] ?? '').get('paper') ?? undefined);
  ok(`round trip: ${p} -> "${href}" -> ${readBack}`, readBack === p);
}
ok('the shared default is the one resolvePaper actually applies',
  resolvePaper(undefined) === DEFAULT_PAPER);

// ── BREAK MODE 3: NOT IDEMPOTENT ─────────────────────────────────────────────
// A path that already carries a paper must be REPLACED, not appended to — otherwise a
// double-wrapped link ('?paper=APM&paper=AFM') resolves by whichever the reader picks first.
console.log('\n  — idempotent: an existing paper param is replaced, never duplicated —');
ok('AFM over AFM does not duplicate',
  paperHref('/acca?paper=AFM', 'AFM') === '/acca?paper=AFM');
ok('APM over AFM strips the param back to the clean URL',
  paperHref('/acca?paper=AFM', 'APM') === '/acca');
ok('AFM over APM adds it',
  paperHref(paperHref('/acca', 'APM'), 'AFM') === '/acca?paper=AFM');
ok('replacement keeps other pairs',
  paperHref('/acca/tutor?area=B1c&paper=AFM', 'APM') === '/acca/tutor?area=B1c');
ok('double application equals single application',
  paperHref(paperHref('/acca/tutor?area=B1c', 'AFM'), 'AFM')
  === paperHref('/acca/tutor?area=B1c', 'AFM'));

// ── BREAK MODE 4: THE SUBSCRIBE PAGE GUESSES PAST A STATED PAPER ─────────────
// THE defect (c), and the reason swapping in strictPaper alone is NOT the fix: strictPaper
// returns null for absent AND for unparseable, so without the branch below the heuristic
// stays reachable from a request that named a paper.
const AFM_REF = 'https://gradd.ai/acca/afm/mock';
const APM_REF = 'https://gradd.ai/acca';
const NO_REF = '';

console.log('\n  — a stated paper is never overridden by the referrer —');
ok('THE SIGHTING: "?paper=APM subscribe" from an AFM page must NOT return AFM',
  resolveSubscribePaper('APM subscribe', AFM_REF) !== 'AFM',
  String(resolveSubscribePaper('APM subscribe', AFM_REF)));
ok('...it refuses outright (null → the page shows its visible, switchable default)',
  resolveSubscribePaper('APM subscribe', AFM_REF) === null);
ok('the pre-fix rule is PINNED as broken: literal-compare then heuristic returns AFM',
  ((p: string | null, ref: string) => {
    const up = (p || '').toUpperCase();
    if (up === 'APM' || up === 'AFM') return up;
    return /(?:paper=afm|\/acca\/afm|\/afm)/i.test(ref) ? 'AFM' : null;
  })('APM subscribe', AFM_REF) === 'AFM');
ok('any unparseable value refuses, whatever the referrer says',
  resolveSubscribePaper('AFM ', APM_REF) === 'AFM'          // trims — genuinely names AFM
  && resolveSubscribePaper('APMX', AFM_REF) === null
  && resolveSubscribePaper('both', AFM_REF) === null
  && resolveSubscribePaper('afm-pass', AFM_REF) === null);

console.log('\n  — an explicitly named paper wins outright —');
ok('?paper=AFM returns AFM even from an APM referrer',
  resolveSubscribePaper('AFM', APM_REF) === 'AFM');
ok('?paper=APM returns APM even from an AFM referrer (the case that shipped wrong)',
  resolveSubscribePaper('APM', AFM_REF) === 'APM');
ok('case-insensitive, as strictPaper already allows',
  resolveSubscribePaper('afm', NO_REF) === 'AFM' && resolveSubscribePaper('apm', NO_REF) === 'APM');

console.log('\n  — ABSENT still uses the heuristic (it is the only signal there is) —');
ok('null param + AFM referrer → AFM',
  resolveSubscribePaper(null, AFM_REF) === 'AFM');
ok('null param + APM referrer → null (no positive APM signal; page defaults visibly)',
  resolveSubscribePaper(null, APM_REF) === null);
ok('null param + withheld referrer → null',
  resolveSubscribePaper(null, NO_REF) === null);
ok('EMPTY value counts as absent, not unparseable — nothing was named',
  resolveSubscribePaper('', AFM_REF) === 'AFM');
ok('whitespace-only counts as absent too',
  resolveSubscribePaper('   ', AFM_REF) === 'AFM');
ok('a null referrer never throws (browsers may omit it entirely)',
  resolveSubscribePaper(null, null) === null);

console.log('\n  — the referrer patterns the heuristic actually has to match —');
ok('/acca/afm landing', resolveSubscribePaper(null, 'https://gradd.ai/acca/afm') === 'AFM');
ok('an ?paper=afm URL', resolveSubscribePaper(null, 'https://gradd.ai/acca?paper=afm') === 'AFM');
ok('"afm" as a bare query value is NOT a match — the pattern needs a /afm path segment',
  resolveSubscribePaper(null, 'https://www.google.com/search?q=afm') === null);
ok('DOCUMENTED OVER-MATCH: an off-site /afm path DOES read as AFM',
  resolveSubscribePaper(null, 'https://evil.example/afm') === 'AFM');

console.log(`\n  ⚠ the two checks above bound a KNOWN over-match rather than asserting it away.
  The heuristic is a bare regex over the whole referrer string with NO same-host check, so
  an off-site URL with an "/afm" path segment reads as AFM. It does NOT fire on "afm" as a
  mere query value (asserted above) — the pattern needs the slash — so the reachable
  surface is narrower than "any URL mentioning afm". Recorded here rather than discovered
  later. Not exploitable: the page shows the paper and lets the student switch, and the
  purchase is gated server-side by app/api/checkout/acca's own strictPaper. Strictly
  narrower than the pre-fix rule, which reached this heuristic from a request that had
  NAMED a paper. Tightening it to a same-host path check — the reduction
  lib/signout-destination.ts already does via samePathFromReferer — is the follow-up,
  and is a behaviour change to the ABSENT path, so it is deliberately not in this fix.\n`);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} paper-url: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
