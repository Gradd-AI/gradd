// scripts/test-credit.ts — fixtures for lib/acca/credit.ts (calculator #7, credit risk).
// Pure — no env/DB/model. Exit 1 on any mismatch. Proves: (1) the four kinds compute the
// documented figures; (2) the answer_schema is self-consistent (each recompute(deps) == its
// expected_value); (3) OFR carries under DISTINCT-factor perturbation (a dependent recomputes
// off perturbed upstream figures, never cancelling); (4) figure-integrity (the model answer
// contains every graded figure); (5) the rating-symbol + spread-monotonicity helpers; (6) the
// input guards (curve length, unscaled face, non-widening downgrade, trial-rate order).
import {
  computeCredit, buildCreditSchema, buildCreditModelAnswer,
  ratingInfo, checkSpreadMonotonicity, SP_SCALE, MOODYS_SCALE,
  type CreditInputs, type CreditKind,
} from '../lib/acca/credit';
import { fmt1 } from '../lib/acca/fcff';
import type { Component } from '../lib/acca/numeric-verifier';
import { lintRatingSymbols, lintCompleteness } from '../lib/acca/validate-afm-prose';
import { validateSpreadTable } from '../lib/acca/validate-schema';

let failures = 0;
function ok(name: string, cond: boolean) { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`); }
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) <= eps;

// Self-consistency: every component with a recompute rule reproduces its own expected_value
// from the OTHER components' expected_values (no drift between compute and schema).
function selfConsistent(components: Component[]): boolean {
  const byId = new Map(components.map((c) => [c.component_id, c.expected_value]));
  return components.every((c) => {
    if (!c.recompute || !c.depends_on) return true;
    const deps: Record<string, number> = {};
    for (const d of c.depends_on) deps[d] = byId.get(d)!;
    return near(c.recompute(deps), c.expected_value, Math.max(0.01, Math.abs(c.expected_value) * 0.005));
  });
}
// OFR distinct-factor carry: perturb each leaf by a DISTINCT factor; a dependent must recompute
// to the value implied by the perturbed leaves (i.e. it CARRIES, not cancels to the original).
function ofrCarries(components: Component[]): boolean {
  const leaves = components.filter((c) => !c.depends_on || c.depends_on.length === 0);
  const perturbed = new Map<string, number>();
  leaves.forEach((c, i) => perturbed.set(c.component_id, c.expected_value * (0.85 - 0.06 * i)));
  return components.filter((c) => c.recompute && c.depends_on).every((c) => {
    const deps: Record<string, number> = {};
    for (const d of c.depends_on!) deps[d] = perturbed.has(d) ? perturbed.get(d)! : c.expected_value;
    const carried = c.recompute!(deps);
    return Number.isFinite(carried) && Math.abs(carried - c.expected_value) > 1e-9; // it moved → it carried
  });
}
function figureIntegrity(components: Component[], answer: string): string[] {
  const missing: string[] = [];
  for (const c of components) {
    const v = c.expected_value;
    const cands = [v.toFixed(1), v.toFixed(2), v.toFixed(0), Math.abs(v).toFixed(1), Math.abs(v).toFixed(2), Math.abs(v).toFixed(0)];
    if (!cands.some((s) => answer.includes(s))) missing.push(`${c.component_id}=${v}`);
  }
  return missing;
}

function run(kind: CreditKind, raw: CreditInputs, prose: string, checks: (c: any) => void) {
  const c = computeCredit(raw, kind);
  const currency = c.currency;
  const { schema } = buildCreditSchema(raw, c, currency, kind);
  const answer = buildCreditModelAnswer(raw, c, prose, currency, kind);
  console.log(`\n──── ${kind} ────`);
  checks(c);
  ok(`${kind}: schema self-consistent`, selfConsistent(schema.components));
  ok(`${kind}: OFR carries under distinct-factor perturbation`, ofrCarries(schema.components));
  const missing = figureIntegrity(schema.components, answer);
  ok(`${kind}: figure integrity (every graded figure in the model answer)${missing.length ? ' — MISSING ' + missing.join(', ') : ''}`, missing.length === 0);
  ok(`${kind}: model answer names the evaluation prose`, answer.includes(prose.slice(0, 24)));
}

// ── SPREAD TABLES (monotonic, single-agency) ──
const COP_TABLE = [{ rating: 'A-', spread_bps: 180 }, { rating: 'BBB+', spread_bps: 240 }, { rating: 'BBB', spread_bps: 300 }, { rating: 'BBB-', spread_bps: 380 }, { rating: 'BB+', spread_bps: 480 }];
const JPY_TABLE = [{ rating: 'AA', spread_bps: 35 }, { rating: 'A', spread_bps: 60 }, { rating: 'BBB', spread_bps: 110 }];
const SEK_TABLE = [{ rating: 'A', spread_bps: 90 }, { rating: 'BBB', spread_bps: 160 }, { rating: 'BB', spread_bps: 300 }];

// ── (1) downgrade_impact (Colombia cement / COP) — with ΔWACC ──
run('downgrade_impact', {
  currency: 'COP', spread_table: COP_TABLE, base_rating: 'BBB', new_rating: 'BBB-',
  benchmark_rate: 9.5, debt_principal: 900, equity_weight: 0.6, debt_weight: 0.4, ke: 15.0, tax_rate: 0.30,
}, 'Credit rating agencies price the issuer\'s default risk into the spread; a downgrade is a re-pricing, not a loss, but it raises funding and refinancing cost and the WACC hurdle.', (c) => {
  ok('downgrade: base Kd 12.50%', near(c.base_kd, 12.5));
  ok('downgrade: new Kd 13.30%', near(c.new_kd, 13.3));
  ok('downgrade: Δspread 80bp', c.delta_kd_bps === 80);
  ok('downgrade: Δannual interest 7.2', near(c.delta_annual_interest, 7.2, 0.05));
  ok('downgrade: ΔWACC ≈ 0.224%', near(c.delta_wacc, 0.224, 0.01));
});

// ── (1b) downgrade_impact WITHOUT WACC inputs → directional (no delta_wacc figure) ──
{
  const c = computeCredit({ currency: 'COP', spread_table: COP_TABLE, base_rating: 'BBB', new_rating: 'BBB-', benchmark_rate: 9.5, debt_principal: 900 }, 'downgrade_impact');
  ok('downgrade (no weights): delta_wacc is undefined (prose-only, never an unsupported figure)', c.delta_wacc === undefined);
  const a = buildCreditModelAnswer({ currency: 'COP', spread_table: COP_TABLE, base_rating: 'BBB', new_rating: 'BBB-', benchmark_rate: 9.5, debt_principal: 900 }, c, 'Prose here about the directional WACC effect.', 'COP', 'downgrade_impact');
  ok('downgrade (no weights): answer states WACC directionally, no WACC %', a.includes('directional') && !/WACC by \*\*/.test(a));
}

// ── (2) spread_estimation (Singapore port / SGD) ──
run('spread_estimation', {
  currency: 'SGD', bond: { face_value: 100, coupon_rate: 3.5, maturity: 5 }, market_price: 96.0, govt_yield: 3.0, r_lo: 4, r_hi: 5,
}, 'The spread is the yield pickup over the matched-maturity government bond — the market\'s price for the port operator\'s default and liquidity risk.', (c) => {
  ok('spread: corp yield ≈ 4.42%', near(c.corp_yield, 4.42, 0.05));
  ok('spread: spread ≈ 142bp', near(c.spread_bp, 141.6, 2));
});

// ── (3) kd_term_structure (Japan rail / JPY) — first-of-family ──
run('kd_term_structure', {
  currency: 'JPY', bond: { face_value: 100, coupon_rate: 1.2, maturity: 4 }, rating: 'A', spread_table: JPY_TABLE,
  govt_spot: [0.3, 0.5, 0.8, 1.1], r_lo: 1, r_hi: 2,
}, 'The cost of debt is not one number off a flat yield — it is built from the government spot curve plus the issuer\'s credit spread at every maturity.', (c) => {
  ok('kd: curve price ≈ 98.11', near(c.price_curve, 98.106, 0.1));
  ok('kd: implied Kd ≈ 1.70%', near(c.implied_kd, 1.70, 0.05));
});

// ── (4) debt_valuation (Sweden grocery / SEK) ──
run('debt_valuation', {
  currency: 'SEK', bond: { face_value: 100, coupon_rate: 3.0, maturity: 4 }, rating: 'BBB', spread_table: SEK_TABLE,
  govt_spot: [2.0, 2.3, 2.6, 2.9], market_price: 92.0,
}, 'The fair value from the spot curve plus spread tells the board whether the market is pricing the grocer\'s debt richly or cheaply relative to the fundamentals.', (c) => {
  ok('valuation: fair value ≈ 94.70', near(c.fair_value, 94.70, 0.1));
  ok('valuation: mispricing = fair − market', near(c.mispricing, c.fair_value - 92.0, 0.001));
  ok('valuation: under-valued (market 92 < fair value) → overvalued=false', c.overvalued === false);
});

// ── (5) Rating-symbol + spread-monotonicity helpers ──
console.log('\n──── rating helpers ────');
ok('rating: AAA is best (ordinal 0, investment grade)', ratingInfo('AAA')!.ordinal === 0 && ratingInfo('AAA')!.investmentGrade);
ok('rating: BBB- is the IG floor (investment grade)', ratingInfo('BBB-')!.investmentGrade === true);
ok('rating: BB+ is high-yield (below the IG floor)', ratingInfo('BB+')!.investmentGrade === false);
ok('rating: Baa3 is the Moody\'s IG floor', ratingInfo('Baa3')!.investmentGrade === true && ratingInfo('Baa3')!.agency === 'Moodys');
ok('rating: Ba1 is Moody\'s high-yield', ratingInfo('Ba1')!.investmentGrade === false);
ok('rating: invented symbol → null', ratingInfo('AAB') === null && ratingInfo('BBBB') === null);
ok('rating: en-dash "AA–" normalises to a real AA- symbol', ratingInfo('AA–')?.ordinal === ratingInfo('AA-')!.ordinal);
ok('monotonicity: an en-dash table still validates', checkSpreadMonotonicity([{ rating: 'AA–', spread_bps: 40 }, { rating: 'A', spread_bps: 70 }]).ok);
ok('rating: scales are the canonical length', SP_SCALE.length === 22 && MOODYS_SCALE.length === 21);
ok('monotonicity: a proper table passes', checkSpreadMonotonicity(COP_TABLE).ok);
ok('monotonicity: non-monotonic (weaker rating, tighter spread) fails', !checkSpreadMonotonicity([{ rating: 'A', spread_bps: 200 }, { rating: 'BBB', spread_bps: 150 }]).ok);
ok('monotonicity: mixed-agency table fails', !checkSpreadMonotonicity([{ rating: 'A', spread_bps: 90 }, { rating: 'Baa2', spread_bps: 160 }]).ok);
ok('monotonicity: unknown symbol fails', !checkSpreadMonotonicity([{ rating: 'A', spread_bps: 90 }, { rating: 'ZZZ', spread_bps: 160 }]).ok);

// ── (6) Input guards ──
console.log('\n──── input guards ────');
function throws(fn: () => unknown): boolean { try { fn(); return false; } catch { return true; } }
ok('guard: govt_spot length must equal maturity', throws(() => computeCredit({ currency: 'JPY', bond: { face_value: 100, coupon_rate: 1.2, maturity: 4 }, rating: 'A', spread_table: JPY_TABLE, govt_spot: [0.3, 0.5, 0.8], r_lo: 1, r_hi: 2 }, 'kd_term_structure')));
ok('guard: unscaled face (≥1e6) rejected', throws(() => computeCredit({ currency: 'SEK', bond: { face_value: 100_000_000, coupon_rate: 3, maturity: 4 }, rating: 'BBB', spread_table: SEK_TABLE, govt_spot: [2, 2.3, 2.6, 2.9], market_price: 92 }, 'debt_valuation')));
ok('guard: a downgrade that tightens the spread is rejected', throws(() => computeCredit({ currency: 'COP', spread_table: COP_TABLE, base_rating: 'BBB', new_rating: 'A-', benchmark_rate: 9.5, debt_principal: 900 }, 'downgrade_impact')));
ok('guard: r_hi must exceed r_lo', throws(() => computeCredit({ currency: 'SGD', bond: { face_value: 100, coupon_rate: 3.5, maturity: 5 }, market_price: 96, govt_yield: 3, r_lo: 5, r_hi: 4 }, 'spread_estimation')));
// FIX 3 — interpolation target must lie strictly inside the trial-price bracket.
ok('guard: unbracketed interpolation target is rejected (target above price_lo)', throws(() => computeCredit({ currency: 'SGD', bond: { face_value: 100, coupon_rate: 3.5, maturity: 5 }, market_price: 99.9, govt_yield: 3, r_lo: 4, r_hi: 5 }, 'spread_estimation')));
ok('guard: a properly bracketed target passes', !throws(() => computeCredit({ currency: 'SGD', bond: { face_value: 100, coupon_rate: 3.5, maturity: 5 }, market_price: 96, govt_yield: 3, r_lo: 4, r_hi: 5 }, 'spread_estimation')));

// ── (10) FIX 2 — code-owned spread-vs-rating-band comparison ──
console.log('\n──── FIX 2 spread-vs-band ────');
{
  const raw: CreditInputs = { currency: 'SGD', bond: { face_value: 200, coupon_rate: 4.10, maturity: 5 }, market_price: 198.35, govt_yield: 3.44, r_lo: 4.10, r_hi: 4.50, rating: 'BBB+', spread_table: [{ rating: 'A', spread_bps: 80 }, { rating: 'A-', spread_bps: 100 }, { rating: 'BBB+', spread_bps: 128 }, { rating: 'BBB', spread_bps: 155 }] };
  const c: any = computeCredit(raw, 'spread_estimation');
  ok('FIX2: derived spread tighter than the BBB+ band (128bp)', c.tighter_than_band === true && c.band_spread_bps === 128);
  ok('FIX2: brackets between A (lower) and A- (upper)', c.tightest_wider_band === 'A-' && c.bracket_lower_rating === 'A');
  const ans = buildCreditModelAnswer({ ...raw, issuer_label: 'Meridian' }, c, 'The market prices the port tighter than its rating band, a favourable window for the green-bond refinancing.', 'SGD', 'spread_estimation');
  ok('FIX2: band step uses reviewer wording (benchmark + between A and A- + materially inside)',
    ans.includes('rated benchmark of 128bp') && ans.includes('sits between the A and A- points') && ans.includes('pricing Meridian') && ans.includes('materially inside its formal BBB+ rating level'));
}

// ── (11) FIX 4 — downgrade refinancing framing (fixed coupon insulated) ──
console.log('\n──── FIX 4 refinancing framing ────');
{
  const raw: CreditInputs = { currency: 'COP', spread_table: COP_TABLE, base_rating: 'BBB', new_rating: 'BBB-', benchmark_rate: 11.40, debt_principal: 800000, existing_coupon_rate: 13.80 };
  const c: any = computeCredit(raw, 'downgrade_impact');
  ok('FIX4: existing fixed interest = principal × coupon', near(c.existing_fixed_interest, 800000 * 0.138, 1));
  const ans = buildCreditModelAnswer(raw, c, 'The fixed coupon is insulated; the refinancing cost is what rises.', 'COP', 'downgrade_impact');
  ok('FIX4: answer frames the Δ as refinancing + names the insulated fixed coupon', ans.includes('on refinancing') && ans.includes('fixed at') && ans.includes('unchanged by the downgrade'));
  ok('FIX4: reconciliation says "on refinancing"', ans.includes('annual interest on refinancing'));
}

// ── (7) P8 rating-symbol lint ──
console.log('\n──── P8 rating-symbol lint ────');
ok('P8: clean single-agency ratings pass', lintRatingSymbols({ context_text: 'The issuer is rated BBB by S&P; a downgrade to BBB- would widen the spread.', model_answer: 'At BBB the spread is 300bp.' }).length === 0);
ok('P8: an invented symbol (BBBB) is flagged', lintRatingSymbols({ context_text: 'The bond carries a BBBB rating.' }).some((i) => i.code === 'invented-rating-symbol'));
ok('P8: mixing agencies (S&P BBB + Moody\'s A2) is flagged', lintRatingSymbols({ context_text: 'Rated BBB by one agency and A2 by another.' }).some((i) => i.code === 'mixed-rating-agencies'));
ok('P8: a bare "A" with NO rating cue does not flag', lintRatingSymbols({ context_text: 'Plan A is the preferred option and section A applies.' }).length === 0);
ok('P8: "C-suite" near a rating cue is not read as a "C-" symbol', lintRatingSymbols({ context_text: 'The rating committee briefed the C-suite on the BBB rating.' }).length === 0);
ok('P8: Moody\'s-only scale (Baa2/Baa3) passes clean', lintRatingSymbols({ context_text: 'Rated Baa2; a downgrade to Baa3 stays investment grade.' }).length === 0);

// ── (8) P5 completeness for the credit family ──
ok('P5: "estimate the credit spread" with no spread delivered is flagged', lintCompleteness('Estimate the credit spread on the bond.', 'The bond is priced at par.').some((i) => i.code === 'demanded-element-not-delivered'));
ok('P5: a credit-spread answer satisfies the demand', lintCompleteness('Estimate the credit spread on the bond.', 'The credit spread is 142bp over the government yield.').length === 0);

// ── (9) GATE 9 spread↔rating monotonicity ──
console.log('\n──── GATE 9 spread↔rating monotonicity ────');
ok('GATE9: a monotonic table passes', validateSpreadTable(COP_TABLE).ok);
ok('GATE9: a non-monotonic table fails', !validateSpreadTable([{ rating: 'A', spread_bps: 200 }, { rating: 'BBB', spread_bps: 150 }]).ok);
ok('GATE9: inverted maturity spread flags unless deliberate', !validateSpreadTable(COP_TABLE, { maturitySpreads: [120, 90] }).ok);
ok('GATE9: inverted maturity spread accepted when deliberate', validateSpreadTable(COP_TABLE, { maturitySpreads: [120, 90], deliberate: true }).ok);

console.log(failures === 0 ? '\nALL PASS' : `\n${failures} FAILED`);
process.exit(failures === 0 ? 0 : 1);
