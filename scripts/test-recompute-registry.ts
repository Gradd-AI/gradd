// scripts/test-recompute-registry.ts
// Fixtures for lib/acca/recompute-registry.ts. PURE — no DB, no network, no model.
//
// Two jobs:
//   1. COVERAGE. Every recompute id the 5 numeric AFM Mock Paper 1 requirements use resolves
//      to a registry function, and every OTHER id measured in the corpus is EXPLICITLY listed
//      as unresolved. An id that is in neither list is a hole, and this test fails on it.
//   2. LOUDNESS. A missing discriminant, an unknown id, and a known-but-unresolved id each
//      THROW. None of them may degrade to "no recompute" — that would silently disable
//      carry-through and mark a correct method incorrect.
//
// Run: npm run test:recompute-registry

import {
  RECOMPUTE_REGISTRY,
  UNRESOLVED_RECOMPUTE_IDS,
  MEASURED_CORPUS_RECOMPUTE_IDS,
  UnresolvedRecomputeError,
  resolveRecompute,
  hydrateAnswerSchema,
} from '../lib/acca/recompute-registry';

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
}
function throws(label: string, fn: () => unknown, mustInclude?: string) {
  try { fn(); ok(label, false, 'did NOT throw'); }
  catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    ok(label, !mustInclude || msg.includes(mustInclude), mustInclude ? `message lacked "${mustInclude}": ${msg}` : '');
  }
}

// The ids each of the 5 numeric mock requirements actually uses. Transcribed from the live
// rows on 2026-07-28; the re-serialisation script re-asserts this against the DB.
const SCOPE: Record<string, string[]> = {
  'a001 (i)   B3e capm':          ['mm_regear', 'capm_ke', 'wacc_mv_weighted'],
  'a001 (ii)  B5b international': ['parity_step_y2', 'parity_step_y3', 'parity_step_y4',
                                   'home_cf_convert_y1', 'home_cf_convert_y2', 'home_cf_convert_y3',
                                   'home_cf_convert_y4', 'intl_npv_sum_less_outlay'],
  'a001 (iii) E2b fxhedge':       ['fxh_mmh_convert_spot', 'fxh_mmh_grow_home'],
  'b101 (i)   B1a risk':          ['enpv_prob_weighted'],
  'b201 (i)   E3a irhedge':       ['irh_closing_price', 'irh_futures_profit', 'irh_net', 'irh_effective'],
};

console.log('\n── 1. Scoped coverage ──');
const scopedIds = new Set(Object.values(SCOPE).flat());
for (const [req, ids] of Object.entries(SCOPE)) {
  const missing = ids.filter((id) => typeof RECOMPUTE_REGISTRY[id] !== 'function');
  ok(`${req} — all ${ids.length} ids resolve`, missing.length === 0, missing.join(', '));
}
ok('registry covers exactly the scoped set (no extras)',
  Object.keys(RECOMPUTE_REGISTRY).length === scopedIds.size &&
  Object.keys(RECOMPUTE_REGISTRY).every((id) => scopedIds.has(id)),
  `registry=${Object.keys(RECOMPUTE_REGISTRY).length} scope=${scopedIds.size}`);
ok('scoped set is 18 ids', scopedIds.size === 18, String(scopedIds.size));

console.log('\n── 2. Out-of-scope ids are NAMED, not silently absent ──');
const overlap = Object.keys(RECOMPUTE_REGISTRY).filter((id) => UNRESOLVED_RECOMPUTE_IDS.includes(id));
ok('registry and unresolved list do not overlap', overlap.length === 0, overlap.join(', '));
ok('unresolved list is 74 ids', UNRESOLVED_RECOMPUTE_IDS.length === 74, String(UNRESOLVED_RECOMPUTE_IDS.length));
ok('registry ∪ unresolved = the measured 92-id corpus',
  MEASURED_CORPUS_RECOMPUTE_IDS.length === 92 &&
  new Set(MEASURED_CORPUS_RECOMPUTE_IDS).size === 92,
  String(MEASURED_CORPUS_RECOMPUTE_IDS.length));
ok('unresolved list has no duplicates',
  new Set(UNRESOLVED_RECOMPUTE_IDS).size === UNRESOLVED_RECOMPUTE_IDS.length);

console.log('\n── 3. Resolution fails LOUDLY, never silently ──');
throws('a known-but-unresolved id throws', () => resolveRecompute('bsop_d1'), 'deliberately unresolved');
ok('...and throws UnresolvedRecomputeError', (() => {
  try { resolveRecompute('bsop_d1'); return false; } catch (e) { return e instanceof UnresolvedRecomputeError; }
})());
throws('a wholly unknown id throws', () => resolveRecompute('not_a_real_id'), 'UNKNOWN');
throws('hydrate throws on an unresolvable component', () => hydrateAnswerSchema({
  components: [
    { component_id: 'a', expected_value: 1, tolerance: { kind: 'absolute', value: 0.1 } },
    { component_id: 'b', expected_value: 2, tolerance: { kind: 'absolute', value: 0.1 }, depends_on: ['a'], recompute: 'npv_at_rate' },
  ],
  params: {},
}), 'deliberately unresolved');

console.log('\n── 4. Missing discriminants throw rather than defaulting ──');
throws('irh_futures_profit without params.side', () =>
  RECOMPUTE_REGISTRY.irh_futures_profit({ contracts: 96, closing_price: 94.85 },
    { futures0: 95.55, contract_size: 1e6, contract_months: 3 }, ['contracts', 'closing_price']), 'params.side');
throws('irh_net without params.direction', () =>
  RECOMPUTE_REGISTRY.irh_net({ mm_interest: 1, futures_profit: 1 }, {}, ['mm_interest', 'futures_profit']), 'params.direction');
throws('fxh_mmh_convert_spot without params.quote_direction', () =>
  RECOMPUTE_REGISTRY.fxh_mmh_convert_spot({ mmh_foreign_now: 174.27 }, { spot: 5.6 }, ['mmh_foreign_now']), 'params.quote_direction');
throws('wacc_mv_weighted without params.gearing_basis', () =>
  RECOMPUTE_REGISTRY.wacc_mv_weighted({ ke_project: 11.9 }, { kd: 0.055, tax_rate: 0.25 }, ['ke_project']), 'params.gearing_basis');
throws('enpv_prob_weighted without the prob_ vector', () =>
  RECOMPUTE_REGISTRY.enpv_prob_weighted({ npv_1: 10, npv_2: 20 }, {}, ['npv_1', 'npv_2']), 'params.prob_1');
throws('a bad discriminant VALUE throws (not silently treated as the other branch)', () =>
  RECOMPUTE_REGISTRY.irh_net({ mm_interest: 1, futures_profit: 1 }, { direction: 'lender' }, ['mm_interest', 'futures_profit']), 'unknown direction');
throws('home_cf_convert on the out-of-scope TAXED branch throws', () =>
  RECOMPUTE_REGISTRY.home_cf_convert_y1({ fx_1: 5.7, add_tax_1: 2 }, { remit_net_1: 179 }, ['fx_1', 'add_tax_1']), 'only the UNTAXED branch is in scope');

console.log('\n── 5. Each scoped function reproduces its family module ──');
// b201 (i) — irhedge futures, the authored (correct) figures.
const irhP = { base_rate: 5, futures0: 95.55, contract_size: 1e6, contract_months: 3,
               notional: 48e6, hedge_months: 6, side: 'sell', direction: 'borrower' };
ok('irh_closing_price → 94.85',
  Math.abs(RECOMPUTE_REGISTRY.irh_closing_price({ unexpired_basis: 0.15 }, irhP, ['unexpired_basis']) - 94.85) < 1e-9);
ok('irh_futures_profit → 168,000',
  Math.abs(RECOMPUTE_REGISTRY.irh_futures_profit({ contracts: 96, closing_price: 94.85 }, irhP, ['contracts', 'closing_price']) - 168000) < 1e-6);
ok('irh_net (borrower) → 1,152,000',
  Math.abs(RECOMPUTE_REGISTRY.irh_net({ mm_interest: 1320000, futures_profit: 168000 }, irhP, ['mm_interest', 'futures_profit']) - 1152000) < 1e-6);
ok('irh_net (depositor) ADDS instead',
  Math.abs(RECOMPUTE_REGISTRY.irh_net({ mm_interest: 1320000, futures_profit: 168000 }, { ...irhP, direction: 'depositor' }, ['mm_interest', 'futures_profit']) - 1488000) < 1e-6);
ok('irh_effective → 4.80%',
  Math.abs(RECOMPUTE_REGISTRY.irh_effective({ net_outcome: 1152000 }, irhP, ['net_outcome']) - 4.8) < 1e-9);
ok('irh_futures_profit flips sign on side=buy',
  RECOMPUTE_REGISTRY.irh_futures_profit({ contracts: 96, closing_price: 94.85 }, { ...irhP, side: 'buy' }, ['contracts', 'closing_price']) === -168000.0000000007);

// a001 (iii) — fxhedge money-market hedge.
const fxP = { spot: 5.6, months: 3, rate_home_deposit: 2, rate_home_borrow: 3.5,
              quote_direction: 'foreign_per_home', direction: 'receipt' };
const mmhNow = RECOMPUTE_REGISTRY.fxh_mmh_convert_spot({ mmh_foreign_now: 174.27184466019418 }, fxP, ['mmh_foreign_now']);
ok('fxh_mmh_convert_spot → EUR 31.1200m', Math.abs(mmhNow - 31.119972260748963) < 1e-9);
ok('fxh_mmh_grow_home → EUR 31.2756m',
  Math.abs(RECOMPUTE_REGISTRY.fxh_mmh_grow_home({ mmh_home_now: mmhNow }, fxP, ['mmh_home_now']) - 31.275572122052704) < 1e-9);
ok('fxh_mmh_grow_home uses the BORROW leg for a payment',
  RECOMPUTE_REGISTRY.fxh_mmh_grow_home({ mmh_home_now: mmhNow }, { ...fxP, direction: 'payment' }, ['mmh_home_now'])
    > RECOMPUTE_REGISTRY.fxh_mmh_grow_home({ mmh_home_now: mmhNow }, fxP, ['mmh_home_now']));

// b101 (i) — risk ENPV.
const enpv = RECOMPUTE_REGISTRY.enpv_prob_weighted(
  { npv_1: 253.23406871115344, npv_2: 19.26097944129492, npv_3: -208.67085581585968 },
  { prob_1: 0.3, prob_2: 0.5, prob_3: 0.2 }, ['npv_1', 'npv_2', 'npv_3']);
ok('enpv_prob_weighted → GBP 43.8665m', Math.abs(enpv - 43.866539170821554) < 1e-9);

// a001 (ii) — international K1.
const intlP = { discount_rate: 0.09590625, rate_home: 0.02, rate_foreign: 0.045, parity_basis: 'ppp',
                home_outlay: 85.71428571428572,
                remit_net_1: 179.52, remit_net_2: 184.9056, remit_net_3: 190.452768, remit_net_4: 196.16635104 };
const fx1 = 5.7372549019607835;
const fx2 = RECOMPUTE_REGISTRY.parity_step_y2({ fx_1: fx1 }, intlP, ['fx_1']);
ok('parity_step_y2 → 5.877874', Math.abs(fx2 - 5.877873894655901) < 1e-9);
ok('home_cf_convert_y1 → EUR 31.2902m',
  Math.abs(RECOMPUTE_REGISTRY.home_cf_convert_y1({ fx_1: fx1 }, intlP, ['fx_1']) - 31.290225563909775) < 1e-6);
ok('intl_npv_sum_less_outlay → EUR 15.1026m',
  Math.abs(RECOMPUTE_REGISTRY.intl_npv_sum_less_outlay(
    { home_cf_1: 31.290225563909775, home_cf_2: 31.457905241572835,
      home_cf_3: 31.626483489757344, home_cf_4: 31.795965123769445 }, intlP,
    ['home_cf_1', 'home_cf_2', 'home_cf_3', 'home_cf_4']) - 15.102610562423546) < 1e-6);

// a001 (i) — capm project-specific.
const capmP = { rf: 0.045, mrp: 0.06, tax_rate: 0.25, debt_beta: 0, kd: 0.055,
                own_ve: 70, own_vd: 30, company_ve: 0, company_vd: 0, gearing_basis: 'own' };
const regeared = RECOMPUTE_REGISTRY.mm_regear({ asset_beta: 0.9375 }, capmP, ['asset_beta']);
ok('mm_regear → 1.238839', Math.abs(regeared - 1.2388392857142856) < 1e-9);
const keProj = RECOMPUTE_REGISTRY.capm_ke({ regeared_beta: regeared }, capmP, ['regeared_beta']);
ok('capm_ke → 11.9330%', Math.abs(keProj - 11.933035714285714) < 1e-9);
ok('wacc_mv_weighted → 9.5906%',
  Math.abs(RECOMPUTE_REGISTRY.wacc_mv_weighted({ ke_project: keProj }, capmP, ['ke_project']) - 9.590625) < 1e-9);
ok('wacc_mv_weighted on gearing_basis=company uses the OTHER pair',
  Math.abs(RECOMPUTE_REGISTRY.wacc_mv_weighted({ ke_project: keProj },
    { ...capmP, gearing_basis: 'company', company_ve: 50, company_vd: 50 }, ['ke_project']) - (keProj * 0.5 + 0.055 * 0.75 * 100 * 0.5)) < 1e-9);

console.log(`\n${fail === 0 ? '✅' : '❌'} recompute-registry: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
