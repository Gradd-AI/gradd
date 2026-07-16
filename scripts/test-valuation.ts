// scripts/test-valuation.ts
// Fixtures for the AFM valuation family (lib/acca/valuation.ts, batch #9). Pure — no env/DB/model.
// Exit 1 on any mismatch. Covers all four kinds + the B4c-rehab (fcff_enterprise) shape:
//   (1) compute arithmetic + the code-owned verdicts,
//   (2) GATE1 self-consistency (validateSchemaSelfConsistency) on every schema,
//   (3) GATE2 figure-integrity (model answer contains fmt1(expected) for every component),
//   (4) GATE11 bridge gate (validateValuationBridge) — pass on coherent, FAIL on corrupted,
//   (5) OFR carry-through (verifyNumericAnswer: right method on own wrong upstream → 'carried'),
//   (6) K2 exact FCFF↔FCFE reconciliation, K3 sustainability verdict, K4 range + offer position.
import {
  fmt1,
  computeFcff, buildFcffComposedSchema, buildFcffComposedModelAnswer,
  computeFcfe, buildFcfeSchema, buildFcfeModelAnswer,
  computeDividendCapacity, buildDividendSchema, buildDividendModelAnswer,
  computeValuationCompare, buildCompareSchema, buildCompareModelAnswer,
  checkValuationBridge, divergentEquity,
  type FcffInputs, type CapmFront, type FcfeInputs, type DividendInputs, type CompareInputs,
} from '../lib/acca/valuation';
import { computeCapm } from '../lib/acca/capm';
import { validateSchemaSelfConsistency, validateValuationBridge } from '../lib/acca/validate-schema';
import { verifyNumericAnswer, type AnswerSchema } from '../lib/acca/numeric-verifier';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
}
// Every MONEY component's fmt1(expected) must appear in the model answer (GATE2 figure-integrity).
// Rate/% components display at 2dp and are integrity-checked separately (the toFixed(2) assertions).
function figuresPresent(schema: AnswerSchema, answer: string): boolean {
  return schema.components
    .filter((c) => !/%/.test(c.unit ?? ''))
    .every((c) => answer.includes(fmt1(c.expected_value)) || answer.includes(fmt1(Math.abs(c.expected_value))));
}
const CUR = 'SAR';

// ─────────────────────────────── K1 — fcff_enterprise (composed CAPM → WACC) ───────────────────────────────
const k1capmRaw = { rf: 4, mrp: 6, tax_rate: 0.20, company_equity_beta: 1.10, company_ve: 700, company_vd: 300, kd: 6 };
const k1c = computeCapm({ ...k1capmRaw }, 'org_wacc');
const capmFront: CapmFront = { ...k1capmRaw, ke: k1c.ke!, wacc: k1c.wacc! };
const k1in: FcffInputs = { pbit: 180, tax_rate: 0.20, depreciation: 40, capex: 35, delta_working_capital: 12, wacc: capmFront.wacc, growth_rate: 0.025, debt_value: 300, offer_price: 900 };
const k1 = computeFcff(k1in);
const k1s = buildFcffComposedSchema(k1in, k1, capmFront, CUR);
const k1ans = buildFcffComposedModelAnswer(k1in, k1, capmFront, 'Prose.', CUR);
ok('K1 CAPM front: Ke and WACC computed (org_wacc)', k1c.ke! > 0 && k1c.wacc! > 0 && k1c.wacc! < k1c.ke!);
ok('K1 schema: GATE1 self-consistency clean (ke→wacc→fcff→firm→equity)', validateSchemaSelfConsistency(k1s.schema).ok);
ok('K1 model answer: GATE2 figure-integrity (every component figure present)', figuresPresent(k1s.schema, k1ans));
ok('K1 model answer: shows the derived Ke and WACC', k1ans.includes(capmFront.ke.toFixed(2)) && k1ans.includes(capmFront.wacc.toFixed(2)));
ok('K1 bridge: firm − debt = equity (one strip)', validateValuationBridge('fcff_enterprise', k1, { debt_value: 300 }).ok);
ok('K1 serialized: wacc carries recompute id + depends_on ke', k1s.serialized.components.find((c) => c.component_id === 'wacc')?.recompute === 'wacc_mv_weighted');
// FIX 1 (pattern): DCF equity here (~2.7× the 700 equity weight) diverges >50% → code injects the reconciliation point.
ok('K1 FIX1: divergentEquity predicate (true >50%, false ~3%)', divergentEquity(k1.equity_value, 700) === true && divergentEquity(720, 700) === false);
ok('K1 FIX1: divergent equity INJECTS the code-owned reconciliation point (first, before advice)',
  k1ans.includes('Reconcile the equity divergence') && /roughly [0-9.]+× the/.test(k1ans) && k1ans.indexOf('Reconcile the equity divergence') < k1ans.indexOf('Advice to the board'));

// ─────────────────────────────── K2 — fcfe_equity (exact FCFF↔FCFE reconciliation) ───────────────────────────────
const k2in: FcfeInputs = { pbit: 180, tax_rate: 0.25, depreciation: 40, capex: 35, delta_working_capital: 10, ke: 0.14, kd: 0.06, debt_value: 400, offer_price: 620 };
const k2 = computeFcfe(k2in);
const k2s = buildFcfeSchema(k2in, k2, CUR);
const k2ans = buildFcfeModelAnswer(k2in, k2, 'Prose.', CUR);
ok('K2 reconciliation is EXACT (equity via FCFE == equity via FCFF)', Math.abs(k2.reconciliation_gap) < 1e-6);
ok('K2 equity is FCFE/Ke with NO debt strip', Math.abs(k2.equity_value - k2.fcfe / 0.14) < 1e-6);
ok('K2 schema: GATE1 self-consistency clean (fcff→fcfe→equity→offer)', validateSchemaSelfConsistency(k2s.schema).ok);
ok('K2 model answer: GATE2 figure-integrity', figuresPresent(k2s.schema, k2ans));
ok('K2 model answer: shows the FCFF-route cross-check reconciling', k2ans.includes('reconcile') && k2ans.includes(fmt1(k2.equity_via_fcff)));
ok('K2 bridge: FCFE reconciles + implied WACC in range', validateValuationBridge('fcfe_equity', k2, { debt_value: 400 }).ok);
// OFR carry: a wrong FCFF, but FCFE computed correctly FROM it → 'carried' (full credit, error charged once upstream)
const k2ofr = verifyNumericAnswer(k2s.schema, { components: [
  { component_id: 'fcff', value: k2.fcff + 20, workings: 'wrong fcff' },
  { component_id: 'fcfe', value: (k2.fcff + 20) - 0.06 * 400 * 0.75, workings: 'FCFF − Kd·D(1−t)' },
  { component_id: 'equity_value', value: ((k2.fcff + 20) - 0.06 * 400 * 0.75) / 0.14, workings: 'FCFE/Ke' },
] });
ok('K2 OFR: correct method on own wrong FCFF → fcfe & equity carried (not re-penalised)',
  k2ofr.per_component.find((v) => v.component_id === 'fcfe')?.verdict === 'carried' &&
  k2ofr.per_component.find((v) => v.component_id === 'equity_value')?.verdict === 'carried');

// ─────────────────────────────── K3 — dividend_capacity ───────────────────────────────
const k3in: DividendInputs = { pbit: 120, tax_rate: 0.25, depreciation: 25, capex: 20, delta_working_capital: 8, kd: 0.05, debt_value: 300, net_borrowing: 10, proposed_dividend: 80, shares: 50 };
const k3 = computeDividendCapacity(k3in);
const k3s = buildDividendSchema(k3in, k3, CUR);
const k3ans = buildDividendModelAnswer(k3in, k3, 'Prose.', CUR);
ok('K3 dividend capacity == FCFE (cash to equity)', Math.abs(k3.dividend_capacity - k3.fcfe) < 1e-9);
ok('K3 sustainability verdict correct (capacity ≥ proposed)', k3.sustainable === (k3.dividend_capacity >= k3.proposed_dividend));
ok('K3 unsustainable case flips the verdict', computeDividendCapacity({ ...k3in, proposed_dividend: 200 }).sustainable === false);
ok('K3 schema: GATE1 self-consistency clean', validateSchemaSelfConsistency(k3s.schema).ok);
ok('K3 model answer: GATE2 figure-integrity + per-share', figuresPresent(k3s.schema, k3ans) && k3ans.includes(k3.capacity_per_share!.toFixed(3)));
ok('K3 bridge: capacity=FCFE + verdict consistent', validateValuationBridge('dividend_capacity', k3, { debt_value: 300 }).ok);

// ─────────────────────────────── K4 — valuation_compare (range + offer) ───────────────────────────────
const k4in: CompareInputs = { pbit: 200, tax_rate: 0.25, depreciation: 45, capex: 40, delta_working_capital: 12, wacc: 0.10, growth_rate: 0.025, debt_value: 500, multiple_type: 'pe', multiple: 12, earnings: 120, offer_price: 1600 };
const k4 = computeValuationCompare(k4in);
const k4s = buildCompareSchema(k4in, k4, CUR);
const k4ans = buildCompareModelAnswer(k4in, k4, 'Prose.', CUR);
ok('K4 range brackets both methods (low ≤ high)', k4.equity_low <= k4.equity_high);
ok('K4 offer position correct (1600 above the range)', k4.offer_position === 'above');
ok('K4 P/E is an EQUITY multiple (no debt strip): equity = 12 × 120', Math.abs(k4.equity_multiple - 12 * 120) < 1e-9);
ok('K4 schema: GATE1 self-consistency clean (fcff→firm→equity + multiple root)', validateSchemaSelfConsistency(k4s.schema).ok);
ok('K4 model answer: GATE2 figure-integrity', figuresPresent(k4s.schema, k4ans));
ok('K4 bridge: DCF bridge + range + offer-position consistent', validateValuationBridge('valuation_compare', k4, { debt_value: 500 }).ok);
// EV/EBITDA variant strips debt
const k4bIn: CompareInputs = { ...k4in, multiple_type: 'ev_ebitda', multiple: 8, ebitda: 245, earnings: undefined, offer_price: 1400 };
const k4b = computeValuationCompare(k4bIn);
ok('K4 EV/EBITDA is an ENTERPRISE multiple (strip debt): equity = 8×245 − 500', Math.abs(k4b.equity_multiple - (8 * 245 - 500)) < 1e-9);
// FIX 2: the EV/EBITDA Method-2 line is clean — "8× × EBITDA 245.0 = EV; equity = EV − debt" (no "less debt =" garble).
const k4bAns = buildCompareModelAnswer(k4bIn, k4b, 'Prose.', CUR);
ok('K4 FIX2: EV/EBITDA line reads cleanly (× × EBITDA, EV then strip debt), no "less debt =" garble',
  k4bAns.includes('× × EBITDA') && k4bAns.includes(fmt1(k4b.enterprise_multiple!)) && k4bAns.includes('− debt') && !k4bAns.includes('less debt ='));

// ─────────────────────────────── Bridge gate NEGATIVE tests (must FAIL on corruption) ───────────────────────────────
ok('bridge FAILS on a broken FCFF strip (firm−debt ≠ equity)',
  !checkValuationBridge('fcff_enterprise', { ...k1, equity_value: k1.equity_value + 100 }, { debt_value: 300 }).ok);
ok('bridge FAILS on a broken FCFE reconciliation',
  !checkValuationBridge('fcfe_equity', { ...k2, equity_via_fcff: k2.equity_via_fcff + 50, reconciliation_gap: 50 }, { debt_value: 400 }).ok);
ok('bridge FAILS on an inconsistent sustainability verdict',
  !checkValuationBridge('dividend_capacity', { ...k3, sustainable: !k3.sustainable }, { debt_value: 300 }).ok);
ok('bridge FAILS on an inverted compare range',
  !checkValuationBridge('valuation_compare', { ...k4, equity_low: k4.equity_high + 1 }, { debt_value: 500 }).ok);

// ─────────────────────────────── g < r hard guard ───────────────────────────────
let threw = false;
try { computeFcff({ ...k1in, growth_rate: capmFront.wacc / 100 }); } catch { threw = true; }
ok('compute THROWS when growth ≥ WACC (unstable perpetuity guard)', threw);

console.log(`\n${failures === 0 ? 'ALL VALUATION FIXTURES PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
