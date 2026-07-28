// scripts/test-mock1-acceptance.ts
// ACCEPTANCE TEST — the real registry, the real stored schema, a real student script.
// PURE: no DB, no network, no model. Run: npm run test:mock1-acceptance
//
// WHAT THIS PINS. `docs/reviews/AFM_MOCK1_BLIND_CANDIDATE_SCRIPT.md` is an authentic blind
// sit of AFM Mock Paper 1. Its Q3(i) is a near-correct attempt carrying ONE conceptual error:
// the candidate ignores the unexpired basis, taking the closing futures price as
// 100 − prevailing rate, and so locks 4.95% where the code-owned answer is 4.80%. Everything
// else is right — contract count (the #1 examiner-flagged error GATE 21 exists to seed), sell
// direction, both rate scenarios reconciled, a committed recommendation.
//
// Scored on tolerance ALONE that single omission fails 5 of 7 components, which reads as five
// errors when there is one. This test asserts the verifier does NOT do that: the error is
// charged exactly once, at `closing_price`, everything downstream `carried`, and the omitted
// intermediate `subsumed` rather than penalised a second time.
//
// The student figures below are TRANSCRIBED BY HAND from the script. That is correct here —
// free-text → StudentSubmission extraction is a separate build and does not exist. Each
// figure cites the line of the script it came from.

import { verifyNumericAnswer, type StudentSubmission, type Verdict } from '../lib/acca/numeric-verifier';
import { hydrateAnswerSchema, type StoredSchema } from '../lib/acca/recompute-registry';

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label}${detail ? ' — ' + detail : ''}`); }
}

// ── b201 (i) E3a as STORED, byte-for-byte off acca_case_requirements.answer_schema ──
// (case aa000000-0000-4000-8000-00000000b201, requirement_order 1, read 2026-07-28.)
// `params` carries the two discriminants added by the same change-set that added this test:
// irhedge's `side` and `direction`, without which `irh_futures_profit` / `irh_net` cannot be
// resolved at all — the registry throws rather than assuming borrower/sell.
const STORED: StoredSchema = {
  params: {
    futures0: 95.55, notional: 48000000, base_rate: 5, spot_rate0: 4, hedge_months: 6,
    contract_size: 1000000, company_spread: 0.5, contract_months: 3,
    months_to_expiry: 9, months_to_transaction: 6,
    side: 'sell', direction: 'borrower',
  },
  components: [
    { component_id: 'contracts', expected_value: 96, unit: 'contracts', tolerance: { kind: 'absolute', value: 0.5 } },
    { component_id: 'unexpired_basis', expected_value: 0.15000000000000094, unit: 'price', tolerance: { kind: 'absolute', value: 0.01 } },
    { component_id: 'closing_price', expected_value: 94.85, unit: 'price', tolerance: { kind: 'absolute', value: 0.01 },
      depends_on: ['unexpired_basis'], recompute: 'irh_closing_price' },
    { component_id: 'mm_interest', expected_value: 1320000, unit: 'EUR', tolerance: { kind: 'relative', pct: 0.5 } },
    { component_id: 'futures_profit', expected_value: 168000.0000000007, unit: 'EUR', tolerance: { kind: 'relative', pct: 0.5 },
      depends_on: ['contracts', 'closing_price'], recompute: 'irh_futures_profit' },
    { component_id: 'net_outcome', expected_value: 1151999.9999999993, unit: 'EUR', tolerance: { kind: 'relative', pct: 0.5 },
      depends_on: ['mm_interest', 'futures_profit'], recompute: 'irh_net' },
    { component_id: 'effective_rate', expected_value: 4.799999999999997, unit: '%', tolerance: { kind: 'absolute', value: 0.05 },
      depends_on: ['net_outcome'], recompute: 'irh_effective' },
  ],
};

// ── The candidate's own figures, hand-transcribed (rates-rise scenario, the stored one) ──
const W = 'workings shown in the script';
const SUBMISSION: StudentSubmission = {
  components: [
    // "\boxed{N=96\text{ contracts}}" + "Aldebrino should sell 96 futures contracts."  (L1554, L1557)
    { component_id: 'contracts', value: 96, workings: W },
    // NEVER STATED. The script goes straight to 100 − 5.0 = 95.00; basis is discussed
    // qualitatively at L1788-1801 but never quantified.
    { component_id: 'unexpired_basis', workings: '' },
    // "the futures price becomes: 100-5.0 = 95.00"  (L1591-1597) — the ONE conceptual error
    { component_id: 'closing_price', value: 95.00, workings: W },
    // "\boxed{\text{Loan interest}=€1.320m}"  (L1586)
    { component_id: 'mm_interest', value: 1320000, workings: W },
    // "€1,375 × 96 = \boxed{€132,000}"  (L1635-1638)
    { component_id: 'futures_profit', value: 132000, workings: W },
    // "€1.320m-€0.132m = \boxed{€1.188m}"  (L1644-1647)
    { component_id: 'net_outcome', value: 1188000, workings: W },
    // "\boxed{\text{Effective rate}=4.95%}"  (L1663)
    { component_id: 'effective_rate', value: 4.95, workings: W },
  ],
};

console.log('\n── Acceptance: b201 (i) × the blind candidate script, real registry ──\n');

const schema = hydrateAnswerSchema(STORED);
ok('the stored schema hydrates through the real registry (all 4 ids resolve)',
  schema.components.filter((c) => typeof c.recompute === 'function').length === 4);

const res = verifyNumericAnswer(schema, SUBMISSION);
const got = Object.fromEntries(res.per_component.map((v) => [v.component_id, v.verdict]));
for (const v of res.per_component) {
  console.log(`     ${v.component_id.padEnd(16)} ${v.verdict.padEnd(10)} awarded=${v.awarded_weight}` +
    (v.carried_from ? `  ← ${v.carried_from.join(', ')}` : ''));
}
console.log('');

const EXPECTED: Record<string, Verdict> = {
  contracts: 'correct',
  mm_interest: 'correct',
  closing_price: 'incorrect',
  futures_profit: 'carried',
  net_outcome: 'carried',
  effective_rate: 'carried',
  unexpired_basis: 'subsumed',
};
for (const [id, want] of Object.entries(EXPECTED)) {
  ok(`${id} → ${want}`, got[id] === want, `got ${got[id]}`);
}

ok('awarded = 6 of 7 (one error, charged once)', res.awarded === 6 && res.available === 7,
  `${res.awarded}/${res.available}`);
ok('gap_label names closing_price', !!res.gap_label && res.gap_label.startsWith('closing_price:'),
  String(res.gap_label));
ok('all_correct stays FALSE (an omitted step is not a fully correct script)', res.all_correct === false);

// The carry-through must be against the student's OWN figures, not the authored ones.
const eff = res.per_component.find((v) => v.component_id === 'effective_rate')!;
ok('effective_rate was judged against the CARRIED 4.95, not the authored 4.80',
  Math.abs(eff.expected_value - 4.95) < 1e-9 && Math.abs(eff.authored_expected - 4.8) < 1e-9,
  `effective=${eff.expected_value} authored=${eff.authored_expected}`);

// Guard the ruling's limit: `subsumed` is not a blanket amnesty for anything unstated.
const noDownstreamCharge = verifyNumericAnswer(schema, {
  components: [
    { component_id: 'contracts', value: 96, workings: W },
    { component_id: 'unexpired_basis', workings: '' },
    { component_id: 'closing_price', value: 94.85, workings: W },   // right despite the omission
    { component_id: 'mm_interest', value: 1320000, workings: W },
    { component_id: 'futures_profit', value: 168000, workings: W },
    { component_id: 'net_outcome', value: 1152000, workings: W },
    { component_id: 'effective_rate', value: 4.8, workings: W },
  ],
});
const ub = noDownstreamCharge.per_component.find((v) => v.component_id === 'unexpired_basis')!;
ok('an omission with NO charged dependent stays absent and stays zero',
  ub.verdict === 'absent' && ub.awarded_weight === 0, `${ub.verdict}/${ub.awarded_weight}`);
ok('...and that script scores 6/7, not 7/7', noDownstreamCharge.awarded === 6);

console.log(`\n${fail === 0 ? '✅' : '❌'} mock1-acceptance: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
