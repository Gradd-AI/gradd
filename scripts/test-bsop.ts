// scripts/test-bsop.ts — fixtures for lib/acca/bsop.ts (calculator #8, BSOP / real options).
// Pure — no env/DB/model. Proves: (1) the four kinds compute a self-consistent schema; (2) OFR
// carries under distinct-factor perturbation (proper topological proof via verifyNumericAnswer);
// (3) figure integrity at 1–4 dp (N(d) displays at 4 dp); (4) no-arbitrage bounds + put-call
// parity (GATE 10); (5) normCdf accuracy; (6) input-domain guards.
import {
  computeBsop, buildBsopSchema, buildBsopModelAnswer, checkOptionBounds, normCdf,
  type BsopInputs, type BsopKind,
} from '../lib/acca/bsop';
import { verifyNumericAnswer, type AnswerSchema, type StudentSubmission, type Verdict } from '../lib/acca/numeric-verifier';
import type { Component } from '../lib/acca/numeric-verifier';

let failures = 0;
function ok(name: string, cond: boolean) { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`); }
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

function selfConsistent(components: Component[]): boolean {
  const byId = new Map(components.map((c) => [c.component_id, c.expected_value]));
  return components.every((c) => {
    if (!c.recompute || !c.depends_on) return true;
    const deps: Record<string, number> = {};
    for (const d of c.depends_on) deps[d] = byId.get(d)!;
    const tol = c.tolerance.kind === 'absolute' ? c.tolerance.value : Math.abs(c.expected_value) * c.tolerance.pct / 100;
    return Math.abs(c.recompute(deps) - c.expected_value) <= Math.max(tol, 1e-9);
  });
}
// Proper distinct-factor OFR proof (mirrors the generator's buildOfrProof).
function buildOfrProof(schema: AnswerSchema): { submission: StudentSubmission; expected: Record<string, Verdict> } {
  const own = new Map<string, number>(); const components: StudentSubmission['components'] = []; const expected: Record<string, Verdict> = {}; let ri = 0;
  for (const c of schema.components) {
    const deps = c.depends_on ?? [];
    if (deps.length === 0 || !c.recompute) { const f = Math.max(0.30, 0.85 - ri * 0.06); ri++; const p = c.expected_value * f; own.set(c.component_id, p); components.push({ component_id: c.component_id, value: p, workings: 'seeded' }); expected[c.component_id] = 'incorrect'; }
    else { const dv: Record<string, number> = {}; for (const d of deps) dv[d] = own.get(d)!; const v = c.recompute(dv); own.set(c.component_id, v); components.push({ component_id: c.component_id, value: v, workings: 'own' }); expected[c.component_id] = 'carried'; }
  }
  return { submission: { components }, expected };
}
function figureIntegrity(components: Component[], answer: string): string[] {
  const norm = answer.replace(/,/g, '');
  const miss: string[] = [];
  for (const c of components) {
    const v = c.expected_value;
    if (![0, 1, 2, 3, 4].some((d) => norm.includes(v.toFixed(d)) || norm.includes(Math.abs(v).toFixed(d)))) miss.push(`${c.component_id}=${v}`);
  }
  return miss;
}

function run(kind: BsopKind, raw: BsopInputs, prose: string, checks: (c: any) => void) {
  const c = computeBsop(raw, kind);
  const { schema } = buildBsopSchema(raw, c, c.currency, kind);
  const answer = buildBsopModelAnswer(raw, c, prose, c.currency, kind);
  console.log(`\n──── ${kind} ────`);
  checks(c);
  ok(`${kind}: schema self-consistent`, selfConsistent(schema.components));
  const { submission, expected } = buildOfrProof(schema);
  const res = verifyNumericAnswer(schema, submission);
  const ofrOk = res.per_component.every((p) => p.verdict === expected[p.component_id]) && res.per_component.some((p) => p.verdict === 'carried');
  ok(`${kind}: OFR carries (distinct-factor proof, dependents carried)`, ofrOk);
  const miss = figureIntegrity(schema.components, answer);
  ok(`${kind}: figure integrity 1–4 dp${miss.length ? ' — MISSING ' + miss.join(',') : ''}`, miss.length === 0);
  ok(`${kind}: option bounds + parity (GATE 10)`, checkOptionBounds(c).ok);
  ok(`${kind}: model answer names the interpretation prose`, answer.includes(prose.slice(0, 24)));
}

// ── (1) financial_product (Switzerland warrant / CHF) — first-of-family ──
run('financial_product_valuation', { currency: 'CHF', underlying: 500, exercise: 520, volatility: 28, risk_free: 1.5, time: 3 },
  'Volatility is the driver the board should probe hardest — for a traded warrant it is estimable from history, but it remains the single most sensitive and contestable input.', (c) => {
    ok('fin: d2 = d1 − s√t', near(c.d2, c.d1 - 0.28 * Math.sqrt(3), 1e-6));
    ok('fin: call within (0, Pa)', c.call > 0 && c.call < c.Pa);
    ok('fin: N(d) in (0,1)', c.Nd1 > 0 && c.Nd1 < 1 && c.Nd2 > 0 && c.Nd2 < 1);
  });

// ── (2) option_to_delay (Norway offshore licence / NOK) ──
run('option_to_delay', { currency: 'NOK', underlying: 3200, exercise: 3500, volatility: 35, risk_free: 3.0, time: 4, base_npv: -300, underlying_label: 'the PV of the field\'s production cash flows', exercise_label: 'the development capex' },
  'The volatility of oil-linked project value is the crux; the licence keeps a currently-negative NPV alive because the option to wait has value the passive NPV ignores.', (c) => {
    ok('delay: value = call (the option to delay)', near(c.value, c.call, 1e-9));
    ok('delay: negative base NPV kept alive by option (call > base)', c.call > (c.base_npv ?? 0));
  });

// ── (3) option_to_expand (Denmark hydrogen pilot / DKK) ──
run('option_to_expand', { currency: 'DKK', underlying: 1800, exercise: 2000, volatility: 40, risk_free: 2.5, time: 3, base_npv: -120, underlying_label: 'the PV of the full-scale plant\'s cash flows', exercise_label: 'the scale-up investment' },
  'Estimating volatility for an untested hydrogen technology is the weakest link; the growth option can justify a pilot whose standalone NPV is negative.', (c) => {
    ok('expand: expanded = base + call', near(c.expanded_npv!, c.base_npv! + c.call, 1e-6));
  });

// ── (4) option_to_withdraw (Hong Kong shipping / HKD) — put via parity ──
run('option_to_withdraw', { currency: 'HKD', underlying: 900, exercise: 780, volatility: 30, risk_free: 4.0, time: 5, base_npv: -40, underlying_label: 'the PV of continuing to operate the vessel', exercise_label: 'the vessel\'s resale (salvage) value' },
  'The abandonment put — and the related option to redeploy the vessel to another route — is worth most when second-hand values are volatile; volatility estimation again dominates.', (c) => {
    ok('withdraw: put via parity = c − Pa + PVe', near(c.put!, c.call - c.Pa + c.pv_exercise, 1e-9));
    ok('withdraw: parity cross-check agrees', near(c.put!, c.put_check!, 1e-3));
    ok('withdraw: with-option value = base + put', near(c.expanded_npv!, c.base_npv! + c.put!, 1e-6));
  });

// ── (5) normCdf accuracy ──
console.log('\n──── normCdf ────');
ok('normCdf(0) = 0.5', near(normCdf(0), 0.5, 1e-6));
ok('normCdf(1.96) ≈ 0.9750', near(normCdf(1.96), 0.9750, 5e-4));
ok('normCdf(-1.96) ≈ 0.0250', near(normCdf(-1.96), 0.0250, 5e-4));
ok('normCdf(1.0) ≈ 0.8413', near(normCdf(1.0), 0.8413, 5e-4));

// ── (6) GATE 10 rejects a corrupted computation ──
console.log('\n──── GATE 10 negative ────');
const good = computeBsop({ currency: 'CHF', underlying: 500, exercise: 520, volatility: 28, risk_free: 1.5, time: 3 }, 'financial_product_valuation');
ok('bounds: a valid computation passes', checkOptionBounds(good).ok);
ok('bounds: a call above the underlying is rejected', !checkOptionBounds({ ...good, call: good.Pa * 1.2 }).ok);
ok('bounds: broken put-call parity is rejected', !checkOptionBounds({ ...good, put: (good.put ?? 0) + 50, call: good.call }).ok);

// ── (7) domain guards ──
console.log('\n──── guards ────');
const throws = (fn: () => unknown) => { try { fn(); return false; } catch { return true; } };
ok('guard: volatility must be > 0', throws(() => computeBsop({ currency: 'CHF', underlying: 500, exercise: 520, volatility: 0, risk_free: 1.5, time: 3 }, 'financial_product_valuation')));
ok('guard: time must be > 0', throws(() => computeBsop({ currency: 'CHF', underlying: 500, exercise: 520, volatility: 28, risk_free: 1.5, time: 0 }, 'financial_product_valuation')));
ok('guard: unscaled Pa (≥1e6) rejected', throws(() => computeBsop({ currency: 'CHF', underlying: 5e6, exercise: 520, volatility: 28, risk_free: 1.5, time: 3 }, 'financial_product_valuation')));

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
