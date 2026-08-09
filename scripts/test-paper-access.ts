// scripts/test-paper-access.ts — fixtures for lib/acca/access.ts's hasPaperAccess().
// PURE: no network, no database, no env. A fake client satisfying the same structural shape
// the predicate calls. Run: npm run test:paper-access
//
// ── THE PROPERTY THIS SUITE EXISTS TO PROTECT ─────────────────────────────────────────
// The legacy fallback fires ONLY when the user has NO `acca_entitlements` rows AT ALL —
// never merely no rows for the paper being asked about.
//
// It was the latter until 2026-08-09, and that was a live cross-paper leak. A single-paper
// holder has zero rows for the OTHER paper by construction, so the other paper always fell
// through to `hasActiveACCAAccess` — which is paper-blind, and which the Stripe webhook
// sets on EVERY ACCA purchase (`profiles.apm_pass_expires_at`, written with no paper
// attached). Buy APM, get AFM free; buy AFM, get APM free.
//
// Proven end-to-end before the fix against an APM-only account, one field the only variable:
// with the legacy column null AFM refused everywhere (access false, case/list locked,
// sit?paper=AFM 402); setting `apm_pass_expires_at` to the webhook's own now+90d flipped
// every one of them and served AFM Mock Paper 1. See scripts/probe-paper-access.ts.
//
// THE LEAK CASE IS `apm-only holder, legacy column SET -> AFM denied`. If that assertion
// ever goes red, per-paper pricing is not being enforced and paying customers are getting a
// paper they did not buy. Do not loosen it.

import { hasPaperAccess, entitlementIsActive, hasActiveACCAAccess } from '../lib/acca/access';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

const FUTURE = '2099-01-01T00:00:00Z';
const PAST = '2000-01-01T00:00:00Z';

interface FakeRow {
  paper_code: string;
  kind?: string | null;
  expires_at?: string | null;
  subscription_status?: string | null;
}

/**
 * A fake `acca_entitlements`. `rows` is what the table holds for the user being asked
 * about — ALL papers, exactly as the real single-`.eq(user_id)` query returns them.
 * `mode` forces the two degraded reads the predicate must survive.
 */
function fakeClient(rows: FakeRow[], mode: 'ok' | 'error' | 'throw' | 'missing-table' = 'ok') {
  return {
    from(table: string) {
      if (table !== 'acca_entitlements') throw new Error(`unexpected table: ${table}`);
      return {
        select: () => ({
          eq: (col: string, _userId: string) => {
            if (col !== 'user_id') throw new Error(`expected .eq('user_id', …), got .eq('${col}', …)`);
            if (mode === 'throw') throw new Error('read failed');
            if (mode === 'error') return Promise.resolve({ data: null, error: { message: 'boom' } });
            if (mode === 'missing-table') {
              return Promise.resolve({ data: null, error: { code: '42P01', message: 'relation does not exist' } });
            }
            return Promise.resolve({
              data: rows.map((r) => ({
                paper_code: r.paper_code,
                kind: r.kind ?? 'pass',
                expires_at: r.expires_at ?? null,
                subscription_status: r.subscription_status ?? null,
              })),
              error: null,
            });
          },
          // The predicate must NOT filter by paper in the query. If a future edit reinstates
          // `.eq('paper_code', …)` this throws rather than silently re-creating the leak.
          eqeq: () => { throw new Error('paper must be matched in code, not in the query'); },
        }),
      };
    },
  };
}

const LEGACY_ACTIVE = { apm_subscription_status: null, apm_pass_expires_at: FUTURE };
const LEGACY_SUB = { apm_subscription_status: 'active', apm_pass_expires_at: null };
const LEGACY_NONE = { apm_subscription_status: 'inactive', apm_pass_expires_at: null };

async function run() {
  console.log('\npaper-access — the fallback is keyed on the USER, never on (user, paper)\n');

  // ══ THE LEAK CASE. The reason this file exists. ══════════════════════════════════════
  const apmOnly = [{ paper_code: 'APM', expires_at: FUTURE }];

  ok('LEAK CASE: APM-only holder + legacy column SET -> AFM DENIED',
    (await hasPaperAccess(fakeClient(apmOnly), 'u1', 'AFM', LEGACY_ACTIVE)) === false,
    'a paper-filtered query would fall through to the paper-blind legacy arm and grant AFM');

  ok('LEAK CASE (mirror): AFM-only holder + legacy column SET -> APM DENIED',
    (await hasPaperAccess(fakeClient([{ paper_code: 'AFM', expires_at: FUTURE }]), 'u1', 'APM', LEGACY_ACTIVE)) === false);

  ok('LEAK CASE (subscription shape): APM-only sub + legacy sub active -> AFM DENIED',
    (await hasPaperAccess(fakeClient([{ paper_code: 'APM', subscription_status: 'active' }]), 'u1', 'AFM', LEGACY_SUB)) === false);

  ok('APM-only holder + legacy column SET -> APM still GRANTED',
    (await hasPaperAccess(fakeClient(apmOnly), 'u1', 'APM', LEGACY_ACTIVE)) === true);

  // ══ The table is authoritative once it has ANY row for the user ══════════════════════
  ok('APM-only, legacy EMPTY -> AFM denied',
    (await hasPaperAccess(fakeClient(apmOnly), 'u1', 'AFM', LEGACY_NONE)) === false);

  ok('APM-only, legacy EMPTY -> APM granted',
    (await hasPaperAccess(fakeClient(apmOnly), 'u1', 'APM', LEGACY_NONE)) === true);

  ok('EXPIRED APM row is NOT rescued by an active legacy column (ruling: no grandfathering-as-a-branch)',
    (await hasPaperAccess(fakeClient([{ paper_code: 'APM', expires_at: PAST }]), 'u1', 'APM', LEGACY_ACTIVE)) === false);

  ok('expired row for the OTHER paper still suppresses the fallback -> AFM denied',
    (await hasPaperAccess(fakeClient([{ paper_code: 'APM', expires_at: PAST }]), 'u1', 'AFM', LEGACY_ACTIVE)) === false);

  // ══ Grandfathered comps: rows for BOTH papers, unchanged by the fix ══════════════════
  const both = [{ paper_code: 'APM', expires_at: FUTURE }, { paper_code: 'AFM', expires_at: FUTURE }];
  ok('comp holder with BOTH rows -> APM granted',
    (await hasPaperAccess(fakeClient(both), 'u1', 'APM', LEGACY_NONE)) === true);
  ok('comp holder with BOTH rows -> AFM granted',
    (await hasPaperAccess(fakeClient(both), 'u1', 'AFM', LEGACY_NONE)) === true);
  ok('comp holder, one paper expired -> only the live paper is granted',
    (await hasPaperAccess(fakeClient([{ paper_code: 'APM', expires_at: FUTURE }, { paper_code: 'AFM', expires_at: PAST }]), 'u1', 'AFM', LEGACY_NONE)) === false);

  // ══ Pre-migration safety — the fallback's ACTUAL purpose, preserved ══════════════════
  ok('NO rows at all + legacy active -> granted (pre-migration safety)',
    (await hasPaperAccess(fakeClient([]), 'u1', 'AFM', LEGACY_ACTIVE)) === true);

  ok('NO rows at all + legacy empty -> denied',
    (await hasPaperAccess(fakeClient([]), 'u1', 'AFM', LEGACY_NONE)) === false);

  ok('NO rows at all + no legacy profile passed -> denied',
    (await hasPaperAccess(fakeClient([]), 'u1', 'AFM', null)) === false);

  // ══ Degraded reads: FAIL-OPEN TO LEGACY, never fail-open to granted ══════════════════
  for (const mode of ['error', 'throw', 'missing-table'] as const) {
    ok(`read ${mode} + legacy active -> falls back to legacy (granted)`,
      (await hasPaperAccess(fakeClient([], mode), 'u1', 'AFM', LEGACY_ACTIVE)) === true);
    ok(`read ${mode} + legacy empty -> denied (never fail-open to granted)`,
      (await hasPaperAccess(fakeClient([], mode), 'u1', 'AFM', LEGACY_NONE)) === false);
  }

  // ══ Guards ══════════════════════════════════════════════════════════════════════════
  ok('empty userId -> denied without touching the table',
    (await hasPaperAccess(fakeClient(both), '', 'AFM', LEGACY_ACTIVE)) === false);

  // ══ entitlementIsActive / hasActiveACCAAccess units ══════════════════════════════════
  const now = Date.parse('2026-08-09T00:00:00Z');
  ok('entitlementIsActive: active subscription -> true',
    entitlementIsActive({ kind: 'subscription', expires_at: null, subscription_status: 'active' }, now) === true);
  ok('entitlementIsActive: future pass -> true',
    entitlementIsActive({ kind: 'pass', expires_at: FUTURE, subscription_status: null }, now) === true);
  ok('entitlementIsActive: past pass -> false',
    entitlementIsActive({ kind: 'pass', expires_at: PAST, subscription_status: null }, now) === false);
  ok('entitlementIsActive: no expiry, no subscription -> false',
    entitlementIsActive({ kind: 'pass', expires_at: null, subscription_status: null }, now) === false);
  ok('hasActiveACCAAccess: null profile -> false',
    hasActiveACCAAccess(null) === false);
  ok('hasActiveACCAAccess: is paper-blind by definition (that is WHY it must not be the per-paper arm)',
    hasActiveACCAAccess(LEGACY_ACTIVE) === true);

  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} paper-access: ${pass} passed, ${fail} failed\n`);
  if (fail > 0) process.exitCode = 1;
}

run().catch((e) => { console.error(e); process.exitCode = 1; });
