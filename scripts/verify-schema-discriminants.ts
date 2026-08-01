// scripts/verify-schema-discriminants.ts
//
// P-DB4 PROOF, READ-ONLY: does re-running the committed authoring path reproduce the LIVE
// AFM Mock Paper 1 schemas, INCLUDING the recompute discriminants?
//
// ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
// The recompute discriminants (`gearing_basis`, `parity_basis`, `quote_direction`,
// `direction`, `side`) were added to the 5 live numeric requirements by a one-off backfill,
// `scripts/_reserialise_mock_params.ts`. That raised a question worth settling by measurement
// rather than by reading code: were the discriminants ALSO folded into the `build*Schema`
// functions, or does the authoring path still emit schemas without them — in which case
// re-authoring would silently produce rows that `lib/acca/recompute-registry.ts` cannot
// resolve?
//
// This harness answers it the only way that counts: rebuild every numeric schema from the
// SAME calculator inputs the authoring script used, and diff the result against what is
// actually stored on the live rows.
//
// ── WHAT IT ASSERTS (P-DB4 shape: full-field, key-order-insensitive) ─────────
//   1. Every param key stored on the live row is EMITTED by the rebuild.
//   2. Every emitted param value is byte-identical (Object.is) to the stored one.
//   3. Each family's DISCRIMINANT keys are present in BOTH.
//   4. Components match one-for-one: same ids, same expected_values, same units/tolerances.
//   5. Any key present in one side and not the other is reported as a DRIFT, in both
//      directions — a rebuild that emits MORE than the row is as much a finding as one that
//      emits less, because it means the live row is stale against the current library.
//
// STRICTLY READ-ONLY. It issues SELECTs and nothing else. No write, no --apply, no flag that
// makes it write. It is safe to run against production at any time and is the check to run
// before ever re-authoring a paper.
//
// Calculator inputs are reconstructed VERBATIM from scripts/authoring/author-afm-mock-paper-1.ts
// — same literals, same order — so the rebuild sees exactly what authoring saw.
//
// Run: npx tsx --env-file=.env.local scripts/verify-schema-discriminants.ts

import { createClient } from '@supabase/supabase-js';
import { computeCapm, buildCapmSchema } from '../lib/acca/capm';
import { computeIntlNpv, buildIntlNpvSchema, type IntlNpvInputs } from '../lib/acca/international';
import { computeForwardMmhCompare, buildForwardMmhCompareSchema } from '../lib/acca/fxhedge';
import { computeEnpv, buildEnpvSchema } from '../lib/acca/risk';
import { computeIrFutures, buildIrFuturesSchema } from '../lib/acca/irhedge';

const svc = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const CASE_IDS = [
  'aa000000-0000-4000-8000-00000000a001',
  'aa000000-0000-4000-8000-00000000b101',
  'aa000000-0000-4000-8000-00000000b201',
];

// The discriminants each family MUST carry for recompute-registry.ts to resolve its components.
const REQUIRED_DISCRIMINANTS: Record<string, string[]> = {
  B3e: ['gearing_basis'],
  B5b: ['parity_basis'],
  E2b: ['quote_direction', 'direction'],
  E3a: ['side', 'direction'],
  B1a: [],   // enpv needs none — its components are unambiguous from the stored params alone
};

let checks = 0;
let failures = 0;
const line = (t = '') => console.log(t);
const rule = (c = '=') => console.log(c.repeat(104));
function ok(name: string, cond: boolean, detail = '') {
  checks++;
  if (!cond) failures++;
  line(`  ${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}

// ── Calculator inputs, VERBATIM from the authoring script ────────────────────
const capmIn = { rf: 4.5, mrp: 6.0, tax_rate: 25, peer_tax_rate: 34, kd: 5.5, peer_equity_beta: 1.35, peer_ve: 60, peer_vd: 40, own_ve: 70, own_vd: 30 };
const capmC = computeCapm(capmIn, 'project_specific');
const npvIn: IntlNpvInputs = { home_currency: 'EUR', foreign_currency: 'BRL', base_spot: 5.60, basis: 'ppp', rate_home: 2.0, rate_foreign: 4.5, discount_rate: capmC.wacc!, foreign_build: { pbit: 320, tax_rate: 34, depreciation: 80, capex: 60, delta_working_capital: 20 }, foreign_growth: 3.0, years: 4, initial_outlay_foreign: 480, withholding_rate: 15, home_tax_rate: 25, wht_creditable: true };
const npvC = computeIntlNpv(npvIn);
const fxIn = { currency_home: 'EUR', currency_foreign: 'BRL', exposure: Math.round(npvC.years[0].foreign_remit_net * 10) / 10, direction: 'receipt' as const, quote_direction: 'foreign_per_home' as const, forward_rate: 5.66, spot: 5.60, months: 3, rate_foreign_borrow: 12.0, rate_foreign_deposit: 10.0, rate_home_borrow: 3.5, rate_home_deposit: 2.0 };
const fxC = computeForwardMmhCompare(fxIn);
const enpvIn = { currency: 'GBP', outlay: 500, discount_rate: 10.0, hurdle: 0, scenarios: [{ label: 'Strong demand', probability: 0.30, cash_flows: [210, 230, 250, 270] }, { label: 'Base case', probability: 0.50, cash_flows: [150, 160, 170, 180] }, { label: 'Weak demand', probability: 0.20, cash_flows: [85, 90, 95, 100] }] };
const enpvC = computeEnpv(enpvIn);
const irIn = { currency: 'EUR', notional: 48_000_000, direction: 'borrower' as const, hedge_months: 6, contract_months: 3, contract_size: 1_000_000, spot_rate0: 4.0, futures0: 95.55, months_to_expiry: 9, months_to_transaction: 6, company_spread: 0.5, scenarios: [{ label: 'Rates rise', base_rate: 5.0 }, { label: 'Rates fall', base_rate: 3.2 }] };
const irC = computeIrFutures(irIn);

/** lo_code → the schema the CURRENT library builds from those inputs. */
function rebuildFor(lo: string): { params?: Record<string, unknown>; components?: unknown[] } | null {
  switch (lo) {
    case 'B3e': return buildCapmSchema(capmIn, capmC, 'project_specific').serialized as never;
    case 'B5b': return buildIntlNpvSchema(npvIn, npvC).serialized as never;
    case 'E2b': return buildForwardMmhCompareSchema(fxIn, fxC).serialized as never;
    case 'B1a': return buildEnpvSchema(enpvIn, enpvC).serialized as never;
    case 'E3a': return buildIrFuturesSchema(irIn, irC).serialized as never;
    default: return null;
  }
}

interface Comp { component_id?: string; expected_value?: unknown; unit?: unknown; tolerance?: unknown }

/**
 * Canonical stringify — RECURSIVELY KEY-SORTED.
 *
 * P-DB4 requires a full-field diff that is KEY-ORDER-INSENSITIVE, and this is why. Postgres
 * `jsonb` does not preserve authoring key order (it stores object keys in its own canonical
 * order), so a tolerance authored as `{kind, pct, floor}` reads back as `{pct, kind, floor}`.
 * A plain JSON.stringify comparison reports all 20 money components as drifted when nothing
 * has changed at all.
 *
 * That is exactly the P-DB5 failure shape — a detector reporting a content defect that is
 * really a bug in the detector — so it is fixed here rather than worked around at the call
 * sites, and the first version of this harness is the evidence that it is an easy mistake.
 */
function canon(v: unknown): string {
  const walk = (x: unknown): unknown => {
    if (Array.isArray(x)) return x.map(walk);
    if (x && typeof x === 'object') {
      return Object.fromEntries(
        Object.keys(x as Record<string, unknown>).sort().map((k) => [k, walk((x as Record<string, unknown>)[k])]),
      );
    }
    return x;
  };
  return JSON.stringify(walk(v));
}

/** Value equality that is exact for primitives and key-order-insensitive for objects. */
const sameValue = (a: unknown, b: unknown): boolean =>
  (a !== null && typeof a === 'object') || (b !== null && typeof b === 'object')
    ? canon(a) === canon(b)
    : Object.is(a, b);

async function main() {
  rule();
  line('  SCHEMA DISCRIMINANT PROOF — does the authoring path reproduce the LIVE rows?');
  line('  READ-ONLY. Rebuilds each schema from the authoring inputs and diffs against the DB.');
  rule();

  const { data: reqs, error } = await svc
    .from('acca_case_requirements')
    .select('id, lo_code, answer_schema, case_id')
    .in('case_id', CASE_IDS)
    .order('requirement_order');
  if (error) throw new Error(error.message);

  const numeric = (reqs ?? []).filter((r) => rebuildFor(r.lo_code as string) !== null);
  line(`\n  DENOMINATOR: ${(reqs ?? []).length} requirements on the paper · ${numeric.length} numeric (rebuildable) · ` +
       `${(reqs ?? []).length - numeric.length} narrative (rubric, not a calculator schema — out of scope)\n`);
  ok('all 5 numeric requirements were found and are rebuildable', numeric.length === 5, `${numeric.length}`);

  for (const r of numeric) {
    const lo = r.lo_code as string;
    const stored = (r.answer_schema ?? {}) as { params?: Record<string, unknown>; components?: Comp[] };
    const rebuilt = rebuildFor(lo) as { params?: Record<string, unknown>; components?: Comp[] };

    line(`\n── ${lo} ─────────────────────────────────────────────────────────────`);

    const sp = stored.params ?? {};
    const rp = rebuilt.params ?? {};
    const storedKeys = Object.keys(sp).sort();
    const rebuiltKeys = Object.keys(rp).sort();

    // (1) every stored key is emitted by the rebuild
    const missing = storedKeys.filter((k) => !(k in rp));
    ok(`${lo}: rebuild emits every param key the live row stores`, missing.length === 0,
      missing.length ? `MISSING from rebuild: ${missing.join(', ')}` : `${storedKeys.length} keys`);

    // (5) drift in the other direction
    const extra = rebuiltKeys.filter((k) => !(k in sp));
    ok(`${lo}: rebuild emits no param key the live row lacks`, extra.length === 0,
      extra.length ? `EXTRA in rebuild (live row is stale): ${extra.join(', ')}` : 'none');

    // (2) byte-identical values on the intersection
    const shared = storedKeys.filter((k) => k in rp);
    const diffs = shared.filter((k) => !sameValue(sp[k], rp[k]));
    ok(`${lo}: all ${shared.length} shared param values are byte-identical`, diffs.length === 0,
      diffs.length ? diffs.map((k) => `${k}: stored=${JSON.stringify(sp[k])} rebuilt=${JSON.stringify(rp[k])}`).join(' | ') : '');

    // (3) the discriminants, in BOTH
    for (const d of REQUIRED_DISCRIMINANTS[lo] ?? []) {
      ok(`${lo}: discriminant '${d}' present in the LIVE row`, d in sp, d in sp ? `= ${JSON.stringify(sp[d])}` : 'ABSENT');
      ok(`${lo}: discriminant '${d}' EMITTED by the current build*Schema`, d in rp,
        d in rp ? `= ${JSON.stringify(rp[d])}` : 'ABSENT — re-authoring would drop it');
    }
    if ((REQUIRED_DISCRIMINANTS[lo] ?? []).length === 0) {
      line(`  (${lo} needs no discriminant — its components resolve from the stored params alone)`);
    }

    // (4) components match one-for-one
    const sc = stored.components ?? [];
    const rc = rebuilt.components ?? [];
    ok(`${lo}: same component count`, sc.length === rc.length, `stored ${sc.length} vs rebuilt ${rc.length}`);
    const scIds = sc.map((c) => c.component_id).sort();
    const rcIds = rc.map((c) => c.component_id).sort();
    ok(`${lo}: same component ids`, JSON.stringify(scIds) === JSON.stringify(rcIds),
      JSON.stringify(scIds) === JSON.stringify(rcIds) ? '' : `stored=${scIds.join(',')} rebuilt=${rcIds.join(',')}`);

    const byId = new Map(rc.map((c) => [c.component_id, c]));
    const valueDiffs: string[] = [];
    for (const c of sc) {
      const other = byId.get(c.component_id);
      if (!other) continue;
      if (!sameValue(c.expected_value, other.expected_value)) {
        valueDiffs.push(`${c.component_id}: stored=${JSON.stringify(c.expected_value)} rebuilt=${JSON.stringify(other.expected_value)}`);
      }
    }
    ok(`${lo}: every expected_value is byte-identical`, valueDiffs.length === 0, valueDiffs.join(' | '));

    // Units and tolerances are MARKING SEMANTICS, not decoration: tolerance decides whether a
    // student's figure is accepted. A drift here means the live row grades differently from what
    // the current library would produce, so the values are printed in full — "x.tolerance
    // differs" is not actionable, and this is the diff a human has to adjudicate.
    const metaDiffs: string[] = [];
    for (const c of sc) {
      const other = byId.get(c.component_id);
      if (!other) continue;
      if (!sameValue(c.unit, other.unit)) {
        metaDiffs.push(`${c.component_id}.unit stored=${canon(c.unit)} rebuilt=${canon(other.unit)}`);
      }
      if (!sameValue(c.tolerance, other.tolerance)) {
        metaDiffs.push(`${c.component_id}.tolerance stored=${canon(c.tolerance)} rebuilt=${canon(other.tolerance)}`);
      }
    }
    ok(`${lo}: units and tolerances unchanged`, metaDiffs.length === 0,
      metaDiffs.length ? '\n        ' + metaDiffs.join('\n        ') : '');
  }

  rule();
  line(`  ${failures === 0
    ? `ALL ${checks} CHECKS PASS — the authoring path reproduces the live rows, discriminants included.`
    : `${failures} of ${checks} CHECKS FAILED — the authoring path does NOT reproduce the live rows.`}`);
  rule();
  if (failures) process.exitCode = 1;
}

main().catch((e) => { console.error('VERIFY FAILED:', e.message); process.exitCode = 1; });
