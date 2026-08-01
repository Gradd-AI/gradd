// scripts/test-advice-checks.ts — fixtures for ADVICE-vs-COMPUTED.
// Pure: no DB, no model, no network. Run: npm run test:advice-checks
//
// P-G3: break modes are NAMED. The TEST SET IS THE TWO REAL FAILURES — Kestrel's tax branch and
// Halvard's "the only one that threatens the outlay" — not invented examples.

import {
  checkAdvice, noAdviceChecks, enpvAdviceFacts, comparisonAdviceFacts,
} from '../lib/acca/advice-checks';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\nadvice-checks — ADVICE-vs-COMPUTED\n');

// ── THE HALVARD CASE, verbatim ───────────────────────────────────────────────
// Computed: 3 scenarios, TWO negative (central −2.7m, delayed −320.0m), ENPV +18.1m.
const HALVARD = enpvAdviceFacts({
  scenarios: [{ npv: 331.1 }, { npv: -2.7 }, { npv: -320.0 }],
  accept: true,
});
const HALVARD_BAD =
  'The expected value is favourable because the strong and central scenarios carry three-quarters ' +
  'of the probability between them, and the delayed scenario is the only one that threatens the outlay.';

const halvardIssues = checkAdvice(HALVARD_BAD, HALVARD);
ok('THE HALVARD CASE: "the only one" against 2 negative scenarios is CAUGHT',
  halvardIssues.some((i) => i.code === 'count-claim-contradicts-computed'), JSON.stringify(halvardIssues));
ok('the message states BOTH the asserted count and the computed count',
  /asserts exactly one/.test(halvardIssues[0]?.message ?? '') && /2 of 3/.test(halvardIssues[0]?.message ?? ''),
  halvardIssues[0]?.message);

// The CORRECTED prose (what actually shipped) must pass.
const HALVARD_GOOD =
  'The expected value clears the acceptance rule, but it clears it only because one favourable ' +
  'scenario is large enough to outweigh the other two, and both of those destroy value.';
ok('the corrected Halvard prose PASSES', checkAdvice(HALVARD_GOOD, HALVARD).length === 0,
  JSON.stringify(checkAdvice(HALVARD_GOOD, HALVARD)));

// BREAK MODE 1 — the quantifier is right but for the wrong count. "both" with 2 negatives is
// correct; "both" with 1 negative is not.
const ONE_NEG = enpvAdviceFacts({ scenarios: [{ npv: 10 }, { npv: 20 }, { npv: -5 }], accept: true });
ok('"both scenarios destroy value" against ONE negative is caught',
  checkAdvice('Both scenarios destroy value.', ONE_NEG).length > 0);
ok('"the only scenario that loses money" against ONE negative PASSES',
  checkAdvice('The delayed scenario is the only one that loses money.', ONE_NEG).length === 0);

// BREAK MODE 2 — quantifier present but NOT about the counted subject. A sentence about methods
// or currencies must not be scored against the scenario count.
ok('a quantifier in a sentence with no scenario subject is ignored',
  checkAdvice('The board should use the only bank that offers this facility.', HALVARD).length === 0);

// BREAK MODE 3 — "all" resolves against the TOTAL, not a fixed number.
const ALL_NEG = enpvAdviceFacts({ scenarios: [{ npv: -1 }, { npv: -2 }, { npv: -3 }], accept: false });
ok('"all three scenarios destroy value" with 3/3 negative PASSES',
  checkAdvice('All three scenarios destroy value.', ALL_NEG).length === 0);
ok('"all three scenarios destroy value" with 2/3 negative is caught',
  checkAdvice('All three scenarios destroy value.', HALVARD).length > 0);

// BREAK MODE 4 — "neither"/"none" against a non-zero count.
ok('"neither scenario loses money" against 2 negatives is caught',
  checkAdvice('Neither scenario loses money.', HALVARD).length > 0);

// ── THE VERDICT HALF — the Lindqvist/GATE 26 shape at the advice layer ───────
const CMP = comparisonAdviceFacts({ comparison: { best: { method: 'the money-market hedge' } } },
  ['the forward', 'the money-market hedge']);
ok('recommending the LOSING method is caught',
  checkAdvice('The board should use the forward.', CMP).length > 0);
ok('recommending the WINNING method passes',
  checkAdvice('The board should use the money-market hedge.', CMP).length === 0);
// BREAK MODE 5 — a losing method named OUTSIDE a recommendation sentence is not an error.
// Explaining why the forward lost is legitimate teaching, and flagging it would make the gate
// unusable for exactly the prose that teaches best.
ok('naming the losing method in a NON-recommendation sentence passes',
  checkAdvice('The forward is a single price quoted by a bank.', CMP).length === 0);

// ── REGISTRATION DISCIPLINE — the property that makes a clean run mean something ──
const none = noAdviceChecks('capm is a rates-only family: no scenario set and no method comparison');
const noneIssues = checkAdvice('Anything at all, including "the only scenario".', none);
ok('an UNREGISTERED family does NOT return clean', noneIssues.length === 1);
ok('it returns not_registered, so the gate output shows it uncovered',
  noneIssues[0]?.code === 'not_registered');
ok('the declared reason is carried into the output', /rates-only/.test(noneIssues[0]?.message ?? ''));
let threw = false;
try { noAdviceChecks('   '); } catch { threw = true; }
ok('noAdviceChecks REFUSES an empty reason', threw);

// ── Empty prose ──────────────────────────────────────────────────────────────
ok('empty advice yields no issues', checkAdvice('', HALVARD).length === 0);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} advice-checks: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
