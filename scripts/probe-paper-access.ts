// scripts/probe-paper-access.ts
//
// LIVE END-TO-END PROBE for per-paper ACCA entitlement. Drives the REAL routes with a REAL
// session cookie and reports the actual HTTP status of every paid surface, per paper.
//
// ── WHY THIS EXISTS ───────────────────────────────────────────────────────────────────
// Per-paper gating could not be tested with any pre-existing account: all three
// `acca_entitlements` holders are `source='migration'` comps carrying rows for BOTH papers,
// so the single-paper path — the one every real customer takes — had never been exercised.
// This probe runs against a deliberately single-paper account (see PROBE_EMAIL) and asserts
// what an APM-only holder may and may not reach.
//
// ── IT IS NOT IN THE CONTRACT GATE, AND CANNOT BE ─────────────────────────────────────
// It needs a database AND a running server. `scripts/run-contracts.ts` runs PURE fixtures
// only, because a Vercel build has neither. The regression lock for this defect is the pure
// fixture `scripts/test-paper-access.ts`, which exercises the same predicate over a mock
// client and IS in the gate. This probe is the end-to-end proof that the predicate is wired
// to the routes; the fixture is what stops it regressing.
//
// ── THE ACCOUNT'S STEADY STATE IS THE LEAK SHAPE, ON PURPOSE ──────────────────────────
// `perpaper-test@gradd.ai` is permanent, and is left holding:
//   • acca_entitlements: ONE row, APM, comp/pass, finite expiry
//   • profiles.apm_pass_expires_at: SET (now+90d) — exactly what the Stripe webhook writes
//     on any ACCA purchase, with no paper attached
// That second field is deliberate. It is what a REAL single-paper customer looks like, and
// it is the precise condition that used to leak. Do not "tidy" it to null: with it null the
// probe still passes while testing a weaker property, and the regression would walk back in
// unnoticed. `npm run test:paper-access` covers the null case as its own fixture.
//
// EXPECTED, POST-FIX (2026-08-09):
//   access APM true / AFM false · case/list APM locked=false, AFM locked=true
//   sit APM 200 / AFM 402 · progress APM PAID / AFM UNPAID
//   mock 402 (dead code, requires BOTH papers) · next-drill 200 both (free tier, by design)
// ⚠️ The tutor PAGE is NOT an entitlement signal on a zero-attempt account: the free tier
// grants 3 teach-throughs on ANY paper, so "no upsell marker" there is correct behaviour,
// not access. Its API needs TUTOR_SESSION_SECRET, which is unset locally.
//
// Usage:
//   APM_CASES=1 npm run dev                                  # in one terminal
//   npm run probe:paper-access        # or: npx tsx --env-file=.env.local scripts/probe-paper-access.ts
//   npx tsx --env-file=.env.local scripts/probe-paper-access.ts --base https://www.gradd.ai

import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const PROBE_EMAIL = 'perpaper-test@gradd.ai';
const PROBE_PASSWORD = 'PerPaperGate!2026#test';

const baseFlag = process.argv.indexOf('--base');
const BASE = baseFlag !== -1 ? process.argv[baseFlag + 1] : 'http://localhost:3000';

/** Build the exact cookie header @supabase/ssr expects, by letting @supabase/ssr write it. */
async function sessionCookieHeader(): Promise<string> {
  const plain = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
  const { data, error } = await plain.auth.signInWithPassword({
    email: PROBE_EMAIL,
    password: PROBE_PASSWORD,
  });
  if (error || !data.session) throw new Error(`sign-in failed: ${error?.message}`);

  const jar: Record<string, string> = {};
  const ssr = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => Object.entries(jar).map(([name, value]) => ({ name, value })),
        setAll: (list) => list.forEach(({ name, value }) => { jar[name] = value; }),
      },
    },
  );
  await ssr.auth.setSession({
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
  });
  if (Object.keys(jar).length === 0) throw new Error('no auth cookies were written');
  return Object.entries(jar).map(([n, v]) => `${n}=${v}`).join('; ');
}

interface Probe {
  label: string;
  method?: 'GET' | 'POST';
  path: string;
  body?: unknown;
  /** JSON field to surface as THE signal (dotted path into the parsed body). */
  field?: string;
  /** Substrings whose presence means the UNPAID/locked view was served. */
  unpaidMarkers?: string[];
  /** Notes an environmental blocker so a non-entitlement failure is never read as a refusal. */
  note?: string;
}

const PROBES: Probe[] = [
  // ── The predicate, directly. The clearest single signal. ──
  { label: 'access?paper=APM  (HELD)',     path: '/api/acca/access?paper=APM', field: 'access' },
  { label: 'access?paper=AFM  (NOT held)', path: '/api/acca/access?paper=AFM', field: 'access' },

  // ── Cases. 200 + `locked` is the gate here — the route does not refuse, it locks. ──
  { label: 'case/list  paper=APM (HELD)',     path: '/api/acca/case/list?paper=APM', field: 'cases.0.locked' },
  { label: 'case/list  paper=AFM (NOT held)', path: '/api/acca/case/list?paper=AFM', field: 'cases.0.locked' },

  // ── Mock / sit: these refuse outright with 402. ──
  { label: 'sit        paper=AFM', path: '/api/acca/sit?paper=AFM' },
  { label: 'sit        paper=APM', path: '/api/acca/sit?paper=APM' },
  { label: 'mock (dead code, needs BOTH)', path: '/api/acca/mock', note: 'documented dead code: requires BOTH papers, so 402 is correct for any single-paper account' },

  // ── Progress page: paid vs upsell view. NOTE this page passes the SESSION client. ──
  { label: 'progress   ?paper=AFM', path: '/acca/progress?paper=AFM',
    unpaidMarkers: ['Unlock your full progress'] },
  { label: 'progress   ?paper=APM', path: '/acca/progress?paper=APM',
    unpaidMarkers: ['Unlock your full progress'] },

  // ── Tutor page. The teach-through API needs TUTOR_SESSION_SECRET, absent locally,
  //    so the PAGE's rendered tier is the entitlement signal here, not the POST. ──
  { label: 'tutor page ?paper=AFM', path: '/acca/tutor?paper=AFM&area=B1',
    unpaidMarkers: ['Go unlimited', 'Get access'],
    note: 'API POST needs TUTOR_SESSION_SECRET (unset locally) — page tier is the signal' },

  // ── Free tier: expected to serve regardless of entitlement. ──
  { label: 'next-drill AFM (free tier)', path: '/api/acca/next-drill?paper=AFM&area=B1' },
  { label: 'next-drill APM (free tier)', path: '/api/acca/next-drill?paper=APM&area=B1' },
];

async function run() {
  const cookie = await sessionCookieHeader();
  console.log(`\nPROBE  base=${BASE}  account=${PROBE_EMAIL}`);

  const svc = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  );
  const { data: u } = await svc.auth.admin.listUsers();
  const uid = u.users.find((x) => x.email === PROBE_EMAIL)?.id;
  const { data: ents } = await svc.from('acca_entitlements')
    .select('paper_code, kind, expires_at, subscription_status, revoked_at').eq('user_id', uid!);
  const { data: prof } = await svc.from('profiles')
    .select('apm_subscription_status, apm_pass_expires_at').eq('id', uid!).maybeSingle();

  console.log(`  user_id            ${uid}`);
  console.log(`  acca_entitlements  ${JSON.stringify(ents)}`);
  console.log(`  legacy profile     ${JSON.stringify(prof)}\n`);

  for (const p of PROBES) {
    let line: string;
    try {
      const res = await fetch(`${BASE}${p.path}`, {
        method: p.method ?? 'GET',
        headers: {
          cookie,
          ...(p.body ? { 'content-type': 'application/json' } : {}),
        },
        body: p.body ? JSON.stringify(p.body) : undefined,
        redirect: 'manual',
      });
      const text = await res.text();
      const bits: string[] = [];

      if (res.status >= 300 && res.status < 400) bits.push(`→ ${res.headers.get('location')}`);

      const ct = res.headers.get('content-type') ?? '';
      if (ct.includes('json')) {
        if (p.field) {
          try {
            const j = JSON.parse(text);
            // Dotted path, so a per-item flag (cases.0.locked) reads as easily as a top-level one.
            const v = p.field.split('.').reduce<unknown>(
              (acc, k) => (acc == null ? undefined : (acc as Record<string, unknown>)[k]), j);
            bits.push(`${p.field}=${JSON.stringify(v)}`);
          } catch { bits.push('(unparseable json)'); }
        } else {
          bits.push(text.slice(0, 120).replace(/\s+/g, ' '));
        }
      } else {
        const unpaid = (p.unpaidMarkers ?? []).filter((m) => text.includes(m));
        if (unpaid.length) bits.push(`UNPAID view [${unpaid.join(', ')}]`);
        else if (p.unpaidMarkers?.length) bits.push('PAID view (no upsell marker)');
      }
      if (p.note) bits.push(`⚠ ${p.note}`);
      line = `  ${String(res.status).padEnd(4)} ${p.label.padEnd(30)} ${bits.join('  ')}`;
    } catch (e) {
      line = `  ERR  ${p.label.padEnd(34)} ${(e as Error).message}`;
    }
    console.log(line);
  }
  console.log('');
}

run().catch((e) => { console.error(e); process.exitCode = 1; });
