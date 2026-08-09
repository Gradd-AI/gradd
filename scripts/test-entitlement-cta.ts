// scripts/test-entitlement-cta.ts — fixtures for lib/acca/entitlement-cta.ts.
// Pure-ish: no real Supabase client, no network — fake auth/db clients satisfying the same
// structural shape resolveEntitlementCta() actually calls. Run: npm run test:entitlement-cta
//
// THE PROPERTY THIS SUITE EXISTS TO PROTECT: resolveEntitlementCta() must NEVER throw and
// NEVER produce anything other than the anonymous shape when auth/DB access fails. A public
// marketing page calls this; the worst acceptable outcome of any failure is "shows the
// generic CTA," never an unhandled rejection.

import { resolveEntitlementCta } from '../lib/acca/entitlement-cta';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

const ANON = { label: 'Start free', href: '/acca/auth?next=/acca?paper=AFM' };
const BASE_PARAMS = {
  thisPaper: 'AFM' as const,
  otherPaper: 'APM' as const,
  anonymous: ANON,
  entitledOtherLabel: 'Add AFM for your sitting',
  dashboardHref: '/acca?paper=AFM',
};

// ── A fake `acca_entitlements` / `profiles` table, addressed by paper via a closure ──────
function fakeDbClient(opts: { entitlements: Record<string, boolean>; throwOnEntitlements?: boolean; throwOnProfile?: boolean }) {
  return {
    from(table: string) {
      if (table === 'profiles') {
        return {
          select: () => ({
            eq: () => ({
              single: async () => {
                if (opts.throwOnProfile) throw new Error('profile read failed');
                return { data: { apm_subscription_status: null, apm_pass_expires_at: null } };
              },
            }),
          }),
        };
      }
      if (table === 'acca_entitlements') {
        // ONE .eq(user_id) and no paper filter — hasPaperAccess reads EVERY row for the
        // user and matches the paper in code (the paper-filtered query was the 2026-08-09
        // cross-paper leak). The mock models the real query, so it returns this user's rows
        // across ALL papers and each row carries its own paper_code.
        return {
          select: () => ({
            eq: (_col: string, userId: string) => {
              if (opts.throwOnEntitlements) throw new Error('entitlements read failed');
              const rows = Object.entries(opts.entitlements)
                .filter(([key, active]) => active === true && key.startsWith(`${userId}:`))
                .map(([key]) => ({
                  paper_code: key.slice(userId.length + 1),
                  kind: 'pass',
                  expires_at: null,
                  subscription_status: 'active',
                }));
              return Promise.resolve({ data: rows, error: null });
            },
          }),
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };
}

function fakeAuthClient(userId: string | null) {
  return { auth: { getUser: async () => ({ data: { user: userId ? { id: userId } : null } }) } };
}

async function main() {
  console.log('\nentitlement-cta — defensive by contract: every failure falls through to anonymous\n');

  // ── 1. Anonymous — no user at all ──────────────────────────────────────────
  {
    const cta = await resolveEntitlementCta({
      ...BASE_PARAMS,
      authClient: fakeAuthClient(null),
      dbClient: fakeDbClient({ entitlements: {} }),
    });
    ok('no user -> state anonymous', cta.state === 'anonymous');
    ok('no user -> label/href are the passed-in anonymous CTA, unchanged', cta.label === ANON.label && cta.href === ANON.href);
  }

  // ── 2. Entitled to THIS paper (AFM) ────────────────────────────────────────
  {
    const cta = await resolveEntitlementCta({
      ...BASE_PARAMS,
      authClient: fakeAuthClient('u1'),
      dbClient: fakeDbClient({ entitlements: { 'u1:AFM': true } }),
    });
    ok('entitled to AFM -> state entitled_this', cta.state === 'entitled_this');
    ok('entitled to AFM -> label is "Go to your dashboard"', cta.label === 'Go to your dashboard');
    ok('entitled to AFM -> href is dashboardHref', cta.href === '/acca?paper=AFM');
  }

  // ── 3. Entitled to the OTHER paper (APM) only ──────────────────────────────
  {
    const cta = await resolveEntitlementCta({
      ...BASE_PARAMS,
      authClient: fakeAuthClient('u2'),
      dbClient: fakeDbClient({ entitlements: { 'u2:APM': true } }),
    });
    ok('entitled to APM only -> state entitled_other', cta.state === 'entitled_other');
    ok('entitled to APM only -> label is the passed-in entitledOtherLabel', cta.label === 'Add AFM for your sitting');
    ok('entitled to APM only -> href is dashboardHref, not /acca/auth', cta.href === '/acca?paper=AFM');
  }

  // ── 4. Entitled to BOTH — "this paper" wins (dashboard, not the upsell) ────
  {
    const cta = await resolveEntitlementCta({
      ...BASE_PARAMS,
      authClient: fakeAuthClient('u3'),
      dbClient: fakeDbClient({ entitlements: { 'u3:AFM': true, 'u3:APM': true } }),
    });
    ok('entitled to both -> state entitled_this (this paper takes priority over the upsell)', cta.state === 'entitled_this');
  }

  // ── 5. Signed in, entitled to NEITHER paper ────────────────────────────────
  {
    const cta = await resolveEntitlementCta({
      ...BASE_PARAMS,
      authClient: fakeAuthClient('u4'),
      dbClient: fakeDbClient({ entitlements: {} }),
    });
    ok('signed in, no entitlement -> state signed_in_no_entitlement', cta.state === 'signed_in_no_entitlement');
    ok('signed in, no entitlement -> label matches the anonymous COPY (still true — nothing bought yet)', cta.label === ANON.label);
    ok('signed in, no entitlement -> href skips /acca/auth (already authed), goes straight to dashboardHref',
      cta.href === '/acca?paper=AFM' && cta.href !== ANON.href);
  }

  // ── 6. THE CONTRACT: entitlements-table read throws -> never an unhandled rejection ──
  // NOT 'anonymous' here, and that is correct, not a gap: hasPaperAccess() (lib/acca/
  // access.ts) already catches this internally and falls back to the legacy bundle
  // columns ("FAIL-OPEN TO LEGACY, not fail-open to granted" — its own docstring). With an
  // empty legacy profile that resolves to false for both papers, landing in
  // signed_in_no_entitlement — a signed-in user correctly isn't collapsed to 'anonymous'
  // just because the entitlements table had one bad read. Still never throws either way.
  {
    const cta = await resolveEntitlementCta({
      ...BASE_PARAMS,
      authClient: fakeAuthClient('u5'),
      dbClient: fakeDbClient({ entitlements: {}, throwOnEntitlements: true }),
    });
    ok('entitlements read throws -> absorbed by hasPaperAccess\'s own fallback, state signed_in_no_entitlement',
      cta.state === 'signed_in_no_entitlement', cta.state);
    ok('entitlements read throws -> still resolves (no unhandled rejection) with a defined label/href',
      typeof cta.label === 'string' && typeof cta.href === 'string');
  }

  // ── 7. THE CONTRACT: profile read throws -> falls through to anonymous ─────
  {
    const cta = await resolveEntitlementCta({
      ...BASE_PARAMS,
      authClient: fakeAuthClient('u6'),
      dbClient: fakeDbClient({ entitlements: {}, throwOnProfile: true }),
    });
    ok('profile read throws -> state anonymous', cta.state === 'anonymous');
  }

  // ── 8. THE CONTRACT: auth.getUser() itself throws -> falls through to anonymous ────
  {
    const throwingAuthClient = { auth: { getUser: async () => { throw new Error('auth service down'); } } };
    const cta = await resolveEntitlementCta({
      ...BASE_PARAMS,
      authClient: throwingAuthClient,
      dbClient: fakeDbClient({ entitlements: {} }),
    });
    ok('auth.getUser() throws -> state anonymous, not an unhandled rejection', cta.state === 'anonymous');
    ok('auth.getUser() throws -> label/href are the anonymous CTA', cta.label === ANON.label && cta.href === ANON.href);
  }

  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} entitlement-cta: ${pass} passed, ${fail} failed\n`);
  // P-G4: exitCode, never process.exit().
  process.exitCode = fail === 0 ? 0 : 1;
}

main();
