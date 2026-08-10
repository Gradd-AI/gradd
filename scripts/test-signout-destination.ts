// scripts/test-signout-destination.ts — fixtures for the post-sign-out landing rule.
// Pure: no DB, no model, no network. Run: npm run test:signout-destination
//
// P-G3: every break mode is NAMED, and each names the DEFECT it prevents rather than the line
// it covers. The bug this module fixed typechecked perfectly and redirected successfully — it
// just redirected an ACCA student, who has no password, to a password form. Nothing short of a
// behavioural assertion catches that class.
//
// P-G6: the inputs below are the shape PRODUCTION builds. `productParam`/`nextParam` are
// `string | null` because that is what `searchParams.get()` returns, and the referrer is fed as
// a RAW `referer` header (a full URL) rather than a pre-reduced path, because the reduction —
// including its same-host check — is part of what is under test. A fixture handing in
// `referrerPath: '/acca'` would leave the cross-site check untested while looking thorough.

import {
  resolveSignOutDestination, samePathFromReferer, SIGNOUT_FALLBACK,
} from '../lib/signout-destination';
import { PRODUCT_PUBLIC_HOME, PRODUCT_HOME, type SiteProduct } from '../lib/product-router';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\nsignout-destination — a student who signs out must land somewhere they can get back in\n');

const AI = 'gradd.ai';
const IE = 'gradd.ie';
const LOCAL = 'localhost:3000';

const PRODUCTS: SiteProduct[] = ['LC', 'ACCA', 'IB'];
const CLOSED_SET = new Set<string>([...PRODUCTS.map((p) => PRODUCT_PUBLIC_HOME[p]), SIGNOUT_FALLBACK]);

// ── BREAK MODE 0: THE FIXTURES AGREE WITH THE CODE AND DISCRIMINATE NOTHING ──
// The two wrong rules are PINNED here and asserted to FAIL the checks below, the way the
// hedging fixtures pin the superseded lock-in and premium formulas. A green suite that a
// broken implementation would also pass is not evidence, and both of these broken
// implementations are one plausible edit away:
//
//   OLD_RULE  — what shipped: one hardcoded path for every account. The reported defect.
//   ALL_ROOT  — the tempting over-simplification: read "destination is the root /" as
//               literally one path, dropping the per-product map. Sends IB to ACCA.
const OLD_RULE = (_: { host: string }) => '/auth/login';
const ALL_ROOT = (_: { host: string }) => '/';

ok('MUST-FAIL: the old hardcoded rule is caught by the /auth/ prefix check',
  OLD_RULE({ host: AI }).startsWith('/auth'));
ok('MUST-FAIL: the old rule gives ACCA and IB the same answer, which the IB check rejects',
  OLD_RULE({ host: AI }) === OLD_RULE({ host: IE }) && OLD_RULE({ host: AI }) !== PRODUCT_PUBLIC_HOME.IB);
ok('MUST-FAIL: collapsing every product to root is caught — it hands IB the ACCA pillar',
  ALL_ROOT({ host: AI }) !== PRODUCT_PUBLIC_HOME.IB);
ok('and the real rule passes the same three checks the pins fail',
  !accaPath().startsWith('/auth') && ibPath() !== accaPath() && ibPath() === PRODUCT_PUBLIC_HOME.IB);

function accaPath() { return resolveSignOutDestination({ host: AI, productParam: 'acca' }).path; }
function ibPath() { return resolveSignOutDestination({ host: AI, productParam: 'ib' }).path; }

// ── BREAK MODE 1: THE DEAD END COMES BACK ────────────────────────────────────
// THE defect. `/auth/login` is `signInWithPassword` and nothing else; an ACCA account is
// created by `signInWithOtp` and never sets a password. Any destination under `/auth/` is a
// credential form, so this asserts the WHOLE prefix, not the one path — swapping the literal
// for `/auth/signin` tomorrow would be the same bug with a different spelling.
const accaOut = resolveSignOutDestination({ host: AI, productParam: 'acca' });
ok('an ACCA sign-out lands on the public pillar at root', accaOut.path === '/', JSON.stringify(accaOut));
ok('and reports the explicit param as its source, not a guess', accaOut.source === 'explicit_param');
ok('NO product can ever be routed under /auth/ (every value is a credential form)',
  PRODUCTS.every((p) => !PRODUCT_PUBLIC_HOME[p].startsWith('/auth')) && !SIGNOUT_FALLBACK.startsWith('/auth'));
ok('the paper aliases route as ACCA too — a student signs out of APM/AFM, not of "ACCA"',
  resolveSignOutDestination({ host: AI, productParam: 'AFM' }).path === '/' &&
  resolveSignOutDestination({ host: AI, productParam: 'apm' }).path === '/');

// ── BREAK MODE 2: THE ACCA FIX BREAKS IB OR LC ───────────────────────────────
// They are not all ACCA. Root is HOST-dependent — gradd.ai `/` is the ACCA pillar — so
// collapsing all three products to `/` would send an IB student to a competitor product's
// marketing page. LC's root is genuinely correct because LC only exists on gradd.ie.
const ibOut = resolveSignOutDestination({ host: AI, productParam: 'ib' });
ok('an IB sign-out lands on /ib, NOT the ACCA pillar at gradd.ai root', ibOut.path === '/ib', JSON.stringify(ibOut));
ok('an LC sign-out on gradd.ie lands on the LC landing at root',
  resolveSignOutDestination({ host: IE, productParam: 'lc' }).path === '/');
ok('IB and ACCA do NOT share a destination (the collapse-to-root regression)',
  PRODUCT_PUBLIC_HOME.IB !== PRODUCT_PUBLIC_HOME.ACCA);

// ── BREAK MODE 3: ?next= BECOMES THE DESTINATION (OPEN REDIRECT) ─────────────
// `?next=` is product EVIDENCE and nothing else. A route that redirects to a caller-supplied
// path is an open redirect whether or not today's only caller is our own button — and there is
// nothing to resume after a sign-out anyway, so the capability has no upside to trade against.
const hostileNext = resolveSignOutDestination({ host: AI, nextParam: 'https://evil.example/phish' });
ok('an absolute off-site ?next= is NOT the destination', hostileNext.path !== 'https://evil.example/phish');
ok('and it is not even read as evidence (not a path)', hostileNext.product === null);
ok('a protocol-relative ?next= is not a destination',
  resolveSignOutDestination({ host: AI, nextParam: '//evil.example' }).path === SIGNOUT_FALLBACK);
ok('an ON-SITE ?next= still only steers the PRODUCT, never the path',
  resolveSignOutDestination({ host: AI, nextParam: '/acca/tutor' }).path === '/' &&
  resolveSignOutDestination({ host: AI, nextParam: '/ib/whatever' }).path === '/ib');
ok('every reachable destination is drawn from the closed set', [
  resolveSignOutDestination({ host: AI, productParam: 'acca' }),
  resolveSignOutDestination({ host: AI, productParam: 'ib' }),
  resolveSignOutDestination({ host: IE }),
  resolveSignOutDestination({ host: AI }),
  resolveSignOutDestination({ host: AI, nextParam: '/acca/drill/abc' }),
  resolveSignOutDestination({ host: AI, refererHeader: 'https://gradd.ai/acca/progress' }),
  resolveSignOutDestination({ host: AI, heldProducts: ['IB'] }),
].every((d) => CLOSED_SET.has(d.path)));

// ── BREAK MODE 4: THE REFERRER IS TRUSTED WHEN IT SHOULD NOT BE ──────────────
// The header the old route leaned on by omission. Off-site it says nothing about what this
// account holds, and honouring it would let any third-party page steer where our students land.
ok('a same-host referrer IS read as evidence',
  resolveSignOutDestination({ host: AI, refererHeader: 'https://gradd.ai/acca/cases' }).path === '/' &&
  resolveSignOutDestination({ host: AI, refererHeader: 'https://gradd.ai/acca/cases' }).source === 'referrer_path');
ok('an OFF-SITE referrer is discarded, not read as a path',
  samePathFromReferer('https://evil.example/acca', AI) === null);
ok('an off-site referrer therefore cannot steer the destination',
  resolveSignOutDestination({ host: AI, refererHeader: 'https://evil.example/ib' }).path === SIGNOUT_FALLBACK);
ok('host comparison is case-insensitive (a referrer is not always lowercased)',
  samePathFromReferer('https://GRADD.AI/acca', 'gradd.ai') === '/acca');
ok('an absent referrer is a non-signal, not a crash — the privacy-settings case that made the '
  + 'old route unroutable', samePathFromReferer(null, AI) === null && samePathFromReferer('', AI) === null);

// ── BREAK MODE 5: PRECEDENCE INVERTS ─────────────────────────────────────────
// Each signal is a stronger claim than the one below. The one that matters most here: the
// button's explicit `?product=` must outrank entitlement, because an account holding ACCA AND
// LC is genuinely ambiguous by entitlement — and the surface it just left is not.
ok('explicit ?product= beats an ambiguous entitlement',
  resolveSignOutDestination({ host: AI, productParam: 'acca', heldProducts: ['ACCA', 'IB'] }).path === '/');
ok('explicit ?product= beats the referrer',
  resolveSignOutDestination({ host: AI, productParam: 'ib', refererHeader: 'https://gradd.ai/acca' }).path === '/ib');
ok('entitlement decides when the caller sent no param',
  resolveSignOutDestination({ host: AI, heldProducts: ['IB'] }).path === '/ib' &&
  resolveSignOutDestination({ host: AI, heldProducts: ['IB'] }).source === 'entitlement');
ok('AMBIGUOUS entitlement with no param falls back rather than picking one',
  resolveSignOutDestination({ host: AI, heldProducts: ['ACCA', 'IB'] }).path === SIGNOUT_FALLBACK);
ok('gradd.ie answers by host, above every other signal — the host serves LC and nothing else, '
  + 'so an ACCA param there is a mistake and LC is the safe read',
  resolveSignOutDestination({ host: IE, productParam: 'acca' }).path === '/' &&
  resolveSignOutDestination({ host: IE, productParam: 'acca' }).source === 'host_single_product');

// ── BREAK MODE 6: THE PROFILE READ MOVES BELOW signOut() ─────────────────────
// `heldProducts` can only be read while the session exists. Reading it after `signOut()`
// yields `[]`, which still typechecks and still redirects — to the WRONG page for the one
// product whose public surface is not root. This is the shape of that mistake.
const afterSignOut = resolveSignOutDestination({ host: AI, heldProducts: [] });
ok('an empty heldProducts (the read-too-late shape) falls back to root', afterSignOut.path === SIGNOUT_FALLBACK);
ok('which is SILENTLY WRONG for IB — root on gradd.ai is ACCA. The param saves it; entitlement '
  + 'alone does not', afterSignOut.path !== PRODUCT_PUBLIC_HOME.IB);
ok('an ACCA button still works with no entitlement signal at all (a dead/expired session '
  + 'must still sign out cleanly)',
  resolveSignOutDestination({ host: AI, productParam: 'acca', heldProducts: [] }).path === '/');

// ── BREAK MODE 7: THE MAP DRIFTS FROM THE ROUTES ─────────────────────────────
// `PRODUCT_PUBLIC_HOME` diverges from `PRODUCT_HOME` for exactly one product, and that
// divergence is the module's reason to exist: `PRODUCT_HOME.ACCA` is `/acca`, which since the
// 2026-08-04 pillar move is an AUTHED route that redirects an anonymous visitor to `/`. If a
// later edit "tidies" the two maps into agreement, a just-signed-out student takes a pointless
// second hop through a route that no longer serves them.
ok('every product has a public home', PRODUCTS.every((p) => !!PRODUCT_PUBLIC_HOME[p]));
ok('every public home is root-relative (never absolute, never off-site)',
  PRODUCTS.every((p) => PRODUCT_PUBLIC_HOME[p].startsWith('/') && !PRODUCT_PUBLIC_HOME[p].startsWith('//')));
ok('the fallback is root-relative too', SIGNOUT_FALLBACK.startsWith('/') && !SIGNOUT_FALLBACK.startsWith('//'));
ok("ACCA's PUBLIC home is root, NOT PRODUCT_HOME's /acca — the divergence is deliberate",
  PRODUCT_PUBLIC_HOME.ACCA === '/' && PRODUCT_HOME.ACCA === '/acca');
ok('LC and IB agree with PRODUCT_HOME (only ACCA has two answers)',
  PRODUCT_PUBLIC_HOME.LC === PRODUCT_HOME.LC && PRODUCT_PUBLIC_HOME.IB === PRODUCT_HOME.IB);

// ── BREAK MODE 8: SIGN-OUT FAILS ON MALFORMED INPUT ──────────────────────────
// Sign-out is a privacy action: it must complete on a shared machine even if a header is
// garbage. Nothing in here may throw, and "no signal" must degrade to the fallback.
ok('an unparseable referrer does not throw', samePathFromReferer('not a url', AI) === null);
ok('an empty host does not throw and yields no product',
  resolveSignOutDestination({ host: '', refererHeader: 'https://gradd.ai/acca' }).path === SIGNOUT_FALLBACK);
ok('an unrecognised ?product= is ignored rather than becoming a product',
  resolveSignOutDestination({ host: AI, productParam: 'physics' }).path === SIGNOUT_FALLBACK);
ok('a bare sign-out with no signals at all lands on the host\'s own landing page',
  resolveSignOutDestination({ host: AI }).path === SIGNOUT_FALLBACK &&
  resolveSignOutDestination({ host: IE }).path === '/');

// ── BREAK MODE 9: IT ONLY WORKS IN PRODUCTION ────────────────────────────────
// The dev/preview host is neither gradd.ie nor gradd.ai, so the host tier cannot answer and
// the explicit param is the only thing carrying the walk. A fix verifiable only in production
// is a fix nobody checks.
ok('an ACCA sign-out on localhost routes on the param alone',
  resolveSignOutDestination({ host: LOCAL, productParam: 'acca' }).path === '/');
ok('an IB sign-out on localhost still reaches /ib',
  resolveSignOutDestination({ host: LOCAL, productParam: 'ib' }).path === '/ib');
ok('a preview host with a same-host referrer still reads it',
  resolveSignOutDestination({ host: LOCAL, refererHeader: 'http://localhost:3000/acca/tutor' }).path === '/');

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} signout-destination: ${pass} passed, ${fail} failed\n`);
// P-G4: exitCode, never process.exit().
process.exitCode = fail === 0 ? 0 : 1;
