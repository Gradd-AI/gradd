// scripts/test-tutor-discriminants.ts — fixtures for the direction fence.
// Pure: no DB, no model, no network. Run: npm run test:tutor-discriminants
//
// P-G3: every break mode is NAMED. The defect these guard against was measured, not imagined —
// n=20 fresh turns, 4/20 affirming the inverse rule, ~10/20 never adjudicating direction.

import {
  extractDiscriminants, detectContradictions, renderDiscriminants, REGISTERED_DISCRIMINANTS,
} from '../lib/acca/tutor-discriminants';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\ntutor-discriminants — the direction fence\n');

// The REAL published schema shape (Castlereagh (ii) E3a), reduced to the params block.
const E3A = { params: { side: 'sell', direction: 'borrower', notional: 480, contract_size: 0.5 }, components: [] };
// The REAL seeded wrong answer from the 2026-08-01 measurement.
const SEEDED_WRONG =
  'Castlereagh is borrowing so it should buy futures to protect against rates going up. ' +
  'I divided GBP 480m by the GBP 500,000 contract size and got 960 contracts.';

// ── EXTRACTION ───────────────────────────────────────────────────────────────
const d = extractDiscriminants(E3A);
ok('extracts side and direction from a real schema', d.length === 2, JSON.stringify(d.map((x) => x.key)));
ok('side is the code-owned sell', d.find((x) => x.key === 'side')?.value === 'sell');
ok('the statement names the side in words a student would read', /SELL/.test(d.find((x) => x.key === 'side')?.statement ?? ''));

// BREAK MODE 1 — the schema has no params (narrative, or an older shape). Must not throw and must
// not fabricate: a tutor told a discriminant that does not exist is worse than one told nothing.
ok('no params → empty, no throw', extractDiscriminants({ components: [] }).length === 0);
ok('null schema → empty', extractDiscriminants(null).length === 0);
ok('narrative schema → empty', extractDiscriminants({ mode: 'narrative', criteria: [] }).length === 0);

// BREAK MODE 2 — an unregistered VALUE is silently accepted and stated as fact.
ok('unregistered value is ignored, not guessed',
  extractDiscriminants({ params: { side: 'sideways' } }).length === 0);
ok('non-string param is ignored', extractDiscriminants({ params: { side: 7 } }).length === 0);

// ── CONTRADICTION DETECTION — the measured defect ────────────────────────────
const c = detectContradictions(SEEDED_WRONG, d);
ok('THE MEASURED CASE: "should buy futures" against side=sell is caught', c.some((x) => x.key === 'side'), JSON.stringify(c));
ok('the finding quotes the student\'s own word', /buy/i.test(c.find((x) => x.key === 'side')?.wrote ?? ''));
ok('the finding says everything downstream is affected',
  /downstream|wrong side/i.test(c.find((x) => x.key === 'side')?.statement ?? ''));
ok('direction=borrower is NOT flagged — the student did say borrowing',
  !c.some((x) => x.key === 'direction'), JSON.stringify(c.map((x) => x.key)));

// BREAK MODE 3 — FALSE CORRECTION. A student who names the wrong option while stating the right
// one must NOT be corrected. Flagging this is the same class of harm as the original defect:
// telling a student they are wrong when they are right.
ok('"a borrower sells rather than buys" is NOT flagged',
  detectContradictions('A borrower sells rather than buys futures here.', d).every((x) => x.key !== 'side'));
ok('a correct answer produces no contradictions',
  detectContradictions('Castlereagh is borrowing, so it sells futures.', d).length === 0);
ok('empty student text produces no contradictions', detectContradictions('', d).length === 0);
ok('text mentioning neither side produces no contradictions',
  detectContradictions('I used the contract size of 500,000.', d).length === 0);

// BREAK MODE 4 — the renderer buries the contradiction under the checklist. Ordering IS the
// mechanism for the ~10/20 that never adjudicated direction; if the contradiction stops coming
// first, that half of the fix is silently gone.
const rendered = renderDiscriminants(d, c);
ok('the contradiction is rendered BEFORE the settled facts',
  rendered.indexOf('CONTRADICTION FOUND') < rendered.indexOf('CODE-OWNED CHOICES'));
ok('renders nothing when there is nothing to render', renderDiscriminants([], []) === '');
ok('renders facts alone when there is no contradiction',
  renderDiscriminants(d, []).includes('CODE-OWNED CHOICES') && !renderDiscriminants(d, []).includes('CONTRADICTION'));

// BREAK MODE 5 — the fence is stated as an INSTRUCTION rather than a fact. The whole design rests
// on the tutor READING a fact, not being told a rule; prohibitions lose to the helpfulness prior.
const imperatives = /\b(you must|do not|never|always|make sure|be sure to|remember to)\b/i;
ok('the rendered block contains no imperative addressed to the model', !imperatives.test(rendered), rendered.slice(0, 200));

// ── Registry coverage — assert over the WHOLE table, not a sample ────────────
let uncovered = 0;
for (const reg of REGISTERED_DISCRIMINANTS) {
  for (const v of reg.values) {
    const facts = extractDiscriminants({ params: { [reg.key]: v } });
    if (facts.length !== 1 || !facts[0].statement) { uncovered++; console.log(`       uncovered: ${reg.key}=${v}`); }
  }
}
ok(`every registered value in every registered discriminant yields a statement (${REGISTERED_DISCRIMINANTS.length} keys)`, uncovered === 0);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} tutor-discriminants: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
