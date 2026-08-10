// scripts/test-product-router.ts — fixtures for the hub's product router.
// Pure: no DB, no model, no network. Run: npm run test:product-router
//
// P-G3: every break mode is NAMED. The router replaced `resolveIsIB` in a routing position,
// and the defects it exists to prevent are behavioural, not type errors — a boolean
// typechecks perfectly while serving an ACCA visitor the IB signup form.

import {
  resolveProductIntent, PRODUCT_HOME, PRODUCT_SIGNUP, PRODUCT_PUBLIC_HOME, type SiteProduct,
} from '../lib/product-router';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\nproduct-router — the hub cannot guess\n');

const AI = 'gradd.ai';
const IE = 'gradd.ie';

// ── BREAK MODE 1: THE ROUTER STARTS DEFAULTING ───────────────────────────────
// THE defect. `resolveIsIB` returns a boolean, so it can never say "I don't know" — it
// answered `true` for an ACCA visitor and the signup page served the IB form. A default
// here would restore that behaviour while every type still checks.
const cold = resolveProductIntent({ host: AI });
ok('a cold visitor on gradd.ai resolves to NULL, not a default', cold.product === null, JSON.stringify(cold));
ok('and reports source "unknown" so a caller can tell guess from evidence', cold.source === 'unknown');
ok('an empty-ish request is still null (no host fallback to a product)',
  resolveProductIntent({ host: AI, productParam: '', nextParam: '', referrerPath: '' }).product === null);
ok('an UNRECOGNISED product param does not become a product',
  resolveProductIntent({ host: AI, productParam: 'physics' }).product === null);

// ── BREAK MODE 2: THE SINGLE-PRODUCT HOST STOPS BEING HONOURED ──────────────
// gradd.ie serves LC and nothing else, so the host IS the answer there. This is the ONE
// legitimate host→product inference and it must stay confined to that branch.
ok('gradd.ie resolves to LC by host', resolveProductIntent({ host: IE }).product === 'LC');
ok('gradd.ie reports host_single_product as the source',
  resolveProductIntent({ host: IE }).source === 'host_single_product');
ok('gradd.ai does NOT resolve by host, even with a plausible path',
  resolveProductIntent({ host: AI }).source !== 'host_single_product');
ok('host matching is case-insensitive', resolveProductIntent({ host: 'WWW.GRADD.IE' }).product === 'LC');

// ── BREAK MODE 3: PRECEDENCE INVERTS ────────────────────────────────────────
// Each signal is a stronger claim about INTENT than the one below. If `referrerPath` ever
// outranked `nextParam`, a student clicking an ACCA link FROM the IB page would be sent to
// IB — routed by where they were rather than where they asked to go.
ok('explicit ?product= beats ?next=',
  resolveProductIntent({ host: AI, productParam: 'ib', nextParam: '/acca/tutor' }).product === 'IB');
ok('?next= beats the referrer (destination beats origin)',
  resolveProductIntent({ host: AI, nextParam: '/acca/tutor', referrerPath: '/ib' }).product === 'ACCA');
ok('the referrer is used when nothing better exists',
  resolveProductIntent({ host: AI, referrerPath: '/acca/afm' }).product === 'ACCA');
ok('entitlement is the LAST resort, below the referrer',
  resolveProductIntent({ host: AI, referrerPath: '/ib', heldProducts: ['ACCA'] }).product === 'IB');
ok('sources are reported accurately for each tier',
  resolveProductIntent({ host: AI, productParam: 'acca' }).source === 'explicit_param' &&
  resolveProductIntent({ host: AI, nextParam: '/ib' }).source === 'next_path' &&
  resolveProductIntent({ host: AI, referrerPath: '/acca' }).source === 'referrer_path' &&
  resolveProductIntent({ host: AI, heldProducts: ['IB'] }).source === 'entitlement');

// ── BREAK MODE 4: A PAPER STOPS IMPLYING ITS QUALIFICATION ──────────────────
// Campaign links carry ?paper=AFM (the subscribe flow already uses that vocabulary). A
// router that only knew 'ACCA' would send those visitors to the hub to be asked something
// they had already answered.
ok('?product=APM implies ACCA', resolveProductIntent({ host: AI, productParam: 'APM' }).product === 'ACCA');
ok('?product=AFM implies ACCA', resolveProductIntent({ host: AI, productParam: 'afm' }).product === 'ACCA');
ok('?product=acca is accepted directly', resolveProductIntent({ host: AI, productParam: 'acca' }).product === 'ACCA');

// ── BREAK MODE 5: PATH MATCHING GETS SLOPPY ─────────────────────────────────
// A naive `startsWith('/acca')` matches '/accalade'. Segment-boundary matching is what
// stops an unrelated future route silently routing to ACCA.
ok('/acca matches exactly', resolveProductIntent({ host: AI, nextParam: '/acca' }).product === 'ACCA');
ok('/acca/apm matches on the boundary', resolveProductIntent({ host: AI, nextParam: '/acca/apm' }).product === 'ACCA');
ok('/acca?x=1 matches on the boundary', resolveProductIntent({ host: AI, nextParam: '/acca?x=1' }).product === 'ACCA');
ok('/accalade does NOT match /acca', resolveProductIntent({ host: AI, nextParam: '/accalade' }).product === null);
ok('a non-path value is ignored (open-redirect shaped input)',
  resolveProductIntent({ host: AI, nextParam: 'https://evil.example/acca' }).product === null);
ok('the IB APP surfaces route to IB',
  resolveProductIntent({ host: AI, nextParam: '/dashboard' }).product === 'IB' &&
  resolveProductIntent({ host: AI, nextParam: '/session' }).product === 'IB' &&
  resolveProductIntent({ host: AI, nextParam: '/onboarding' }).product === 'IB');

// ── BREAK MODE 6: AMBIGUOUS ENTITLEMENT SILENTLY PICKS ONE ──────────────────
// A user holding BOTH products has not told us which they want today. Picking the first is
// a guess wearing evidence.
ok('holding ONE product resolves to it',
  resolveProductIntent({ host: AI, heldProducts: ['ACCA'] }).product === 'ACCA');
ok('holding TWO products is UNKNOWN, not the first one',
  resolveProductIntent({ host: AI, heldProducts: ['ACCA', 'IB'] }).product === null);
ok('holding none is unknown', resolveProductIntent({ host: AI, heldProducts: [] }).product === null);

// ── BREAK MODE 7: THE DESTINATION MAPS DRIFT FROM THE ROUTES ────────────────
// These are what the hub and the auth pages redirect to. A typo here is a 404 in a
// conversion path.
const products: SiteProduct[] = ['LC', 'ACCA', 'IB'];
ok('every product has a home and a signup destination',
  products.every((p) => !!PRODUCT_HOME[p] && !!PRODUCT_SIGNUP[p]));
// PRODUCT_PUBLIC_HOME is asserted here as well as in test-signout-destination.ts, and
// deliberately: a FOURTH product would be added to the loop above, and the sign-out map is the
// one a reader is most likely to leave behind — it is the newest and the only one whose answer
// differs from PRODUCT_HOME. Its behavioural rules live in the sign-out fixture; this is the
// completeness lock, in the file that owns the maps.
ok('every product has a SIGNED-OUT public home too (the map most likely to be forgotten)',
  products.every((p) => !!PRODUCT_PUBLIC_HOME[p] && PRODUCT_PUBLIC_HOME[p].startsWith('/')));
ok('every destination is a root-relative path', products.every((p) =>
  PRODUCT_HOME[p].startsWith('/') && PRODUCT_SIGNUP[p].startsWith('/')));
ok('ACCA home is the pillar, not a spoke — the pillar is where ACCA intent lands',
  PRODUCT_HOME.ACCA === '/acca');
ok('ACCA signup is its own wall, not the shared form (the mis-serve this fixes)',
  PRODUCT_SIGNUP.ACCA === '/acca/auth' && PRODUCT_SIGNUP.ACCA !== PRODUCT_SIGNUP.IB);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} product-router: ${pass} passed, ${fail} failed\n`);
// P-G4: exitCode, never process.exit().
process.exitCode = fail === 0 ? 0 : 1;
