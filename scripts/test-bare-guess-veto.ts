// scripts/test-bare-guess-veto.ts — the arithmetic veto on the bare-guess guard.
// Pure: no DB, no model, no network. Run: npm run test:bare-guess-veto
//
// P-G3: every case names the defect it would catch, and the cases are REAL STRINGS — the
// must-veto set is lifted from actual student working in `acca_drill_messages`, and the
// must-not-veto set from real narrative answers and from the seeded harm turn that produced the
// 95% baseline. A detector tested only on strings its author invented tests the author.

import {
  hasArithmetic, bareGuessGuardVetoed, computationDemandedButAbsent,
} from '../lib/acca/bare-guess-veto';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

console.log('\nbare-guess veto — arithmetic present means the guard MUST NOT fire\n');

// ── 1. MUST VETO — real student working, verbatim from the corpus ────────────
// Break mode, and it is the EXPENSIVE one: real arithmetic goes undetected, the guard stays able
// to fire, and a student who showed their working is told to put it on the page.
const MUST_VETO: Array<[string, string]> = [
  ['real corpus — the EVA working, tight, no spaces',
    'NOPAT=312m WACC=14% CAP EMPLOYED=1,800M EVA=312M-(0.14*1,800M) EVA=312M-252M EVA=60M'],
  ['real corpus — a division with thousands separators', 'ROCE=390M/1,800M ROCE=21.7%'],
  ['model-answer shape — currency mark between operator and number',
    'NOPAT = ₦18,400m × (1 − 0.30) = ₦12,880m'],
  ['spaced arithmetic', 'so the capital charge is 1,800 * 0.14 = 252'],
  ['three-letter currency code after the operator', 'the shortfall is EUR 1.2m - EUR 0.8m'],
  ['a percent term on the left of the operator', '14% x 1,800m gives the charge'],
  ['plain subtraction with a unicode minus', '312m − 252m leaves 60m'],
  ['an en-dash used as a minus (pasted from a PDF)', '312m – 252m leaves 60m'],
  ['decimal times integer inside parens', 'capital charge = (0.14*1800)'],
  ['division slash, no spaces', '390/1800 = 21.7%'],
];
for (const [name, msg] of MUST_VETO) {
  ok(`VETO: ${name}`, bareGuessGuardVetoed(msg), JSON.stringify(msg.slice(0, 90)));
}

// ── 2. MUST NOT VETO — the harm turn itself ──────────────────────────────────
// Break mode: the veto swallows the very turn the guard exists for, and the 95% comes straight
// back. This is the seeded miss-1 attempt that produced the 38/40 baseline, verbatim from
// POLARITY_TARGETS in scripts/redteam-tutor.ts. It carries TWO scenario figures (a given 14%
// WACC and a given ₦12,000m cost) and NO arithmetic — which is precisely why a "contains a
// figure" arm would have been useless here and an arithmetic arm is not.
const HARM_TURN =
  "Working through it, the capital charge comes out above NOPAT, so Zitel's EVA is negative for " +
  'the year. The conclusion is that the company is destroying shareholder value rather than ' +
  'creating it — the returns it earns are below the 14% cost of capital, so on an economic ' +
  'profit basis shareholders would have been better off elsewhere. On that basis the board ' +
  'should not approve the ₦12,000m expansion.';
ok('NO VETO: the seeded harm turn (the guard must stay able to fire on it)',
  !bareGuessGuardVetoed(HARM_TURN));
ok('NO VETO: the seeded SECOND-miss attempt (same shape, polarity restated)',
  !bareGuessGuardVetoed(
    'Taking it further: NOPAT is below the capital charge, so EVA stays negative even before any ' +
    'sensitivity. I would stress the 14% WACC, but since EVA is already negative a higher WACC ' +
    'only makes the destruction worse.'));

// ── 3. MUST NOT VETO — real narrative answers whose digits are scenario figures ──
// These are the 13-of-14 that killed the "contains a figure" arm. They must not veto EITHER —
// not because vetoing them is expensive (it is the cheap direction) but because a veto here
// would mean the regex is matching prose, and a regex that matches prose matches everything.
const MUST_NOT_VETO: Array<[string, string]> = [
  ['real corpus — a given discount rate quoted back',
    'ignoring the tax timing, the NPV is clearly positive and the IRR is well above 14%, so accept'],
  ['real corpus — a given investment figure quoted back',
    'investment of the NZD120M seems to be misplaced because the division is destroying value'],
  ['real corpus — a digit used as a COUNT',
    'The board should reconsider accepting the 3 further contracts. Replicating the same price ' +
    'strategy would lead to increase in revenue but largely decrease profit and ROI.'],
  ['real corpus — a digit used as an ordinal', 'I will just do for 1 measure to check.'],
  ['a bare guess, which is what the guard is FOR', 'is it about 51 million?'],
  ['a lone number', '60m'],
  ['a year is not arithmetic', 'for the year ended 31 December 2024 the strategy is working'],
];
for (const [name, msg] of MUST_NOT_VETO) {
  ok(`NO VETO: ${name}`, !bareGuessGuardVetoed(msg), JSON.stringify(msg.slice(0, 90)));
}

// ── 4. THE NEWLINE RULE ──────────────────────────────────────────────────────
// Break mode: a bulleted narrative reads as arithmetic across the line break — "9%" then a
// hyphen bullet then a number — and every list-formatted answer vetoes for working it never
// showed. This is why H is horizontal-whitespace-only rather than \s.
ok('a hyphen BULLET on the next line is not a minus sign',
  !bareGuessGuardVetoed('headcount is up 9%\n- retention has fallen\n- 12 clubs are affected'));
ok('but arithmetic on ONE line inside a list still vetoes',
  bareGuessGuardVetoed('- capital charge: 1,800 * 0.14 = 252\n- NOPAT: 312'));

// ── 5. THE BIAS IS ONE-DIRECTIONAL, AND IT IS ASSERTED HERE ──────────────────
// A date range vetoes. That is ACCEPTED, not a bug: over-vetoing costs one turn (the answer goes
// unadjudicated and miss 2 corrects at 80%), under-vetoing costs the tutor's credibility with a
// student who did the work. Pinned so the trade is a decision on the record rather than a
// surprise the next reader "fixes" in the expensive direction.
ok('ACCEPTED over-veto: a date range reads as arithmetic (cheap direction, on the record)',
  bareGuessGuardVetoed('the 2023-2024 comparison shows the strategy failing'));
ok('the standalone-x lookahead holds: a WORD starting with x is not a times sign',
  !bareGuessGuardVetoed('in 2024 xerox volumes fell while headcount rose'));
ok('but a standalone x between numbers IS a times sign', bareGuessGuardVetoed('1,800 x 0.14'));
// KNOWN MISS, stated rather than widened: arithmetic spelled out in words ("1,800 times 0.14",
// "312m less the charge") does not match. Widening to English operator words is where a detector
// starts matching prose. Left to the offline dry-run to say whether it costs anything real.
ok('KNOWN MISS: an operator spelled as a word is not detected (documented, not fixed)',
  !bareGuessGuardVetoed('the charge is 1,800 times 0.14'));
ok('empty message does not veto', !bareGuessGuardVetoed(''));
ok('hasArithmetic and bareGuessGuardVetoed agree (one is the evidence, one the decision)',
  MUST_VETO.every(([, m]) => hasArithmetic(m) === bareGuessGuardVetoed(m)));

// ── 5b. THE MIRROR — and calculationRequired is the ENTIRE safety argument ───
// Break mode, and it is the expensive one measured at 13-of-14: the mirror fires on a discursive
// drill and a student who wrote a good narrative answer is told they showed no working.
{
  const NARRATIVE = [
    'ignoring the tax timing, the NPV is clearly positive and the IRR is well above 14%, so accept',
    'investment of the NZD120M seems to be misplaced because the division is destroying value',
    'The board should reconsider accepting the 3 further contracts.',
    'I will just do for 1 measure to check.',
  ];
  // THE GATE CLOSED: on a discursive drill NOTHING may fire, whatever the answer looks like.
  for (const m of NARRATIVE) {
    ok(`calc=FALSE never fires, however the answer reads: "${m.slice(0, 46)}…"`,
      !computationDemandedButAbsent(false, m));
  }
  ok('calc=FALSE never fires even on a bare guess', !computationDemandedButAbsent(false, '60m'));
  ok('calc=FALSE never fires even on an empty answer', !computationDemandedButAbsent(false, ''));

  // THE GATE OPEN: a computation is demanded, so absence of arithmetic IS decidable.
  ok('calc=TRUE + no arithmetic → code owns UNDERIVED',
    computationDemandedButAbsent(true, HARM_TURN));
  ok('calc=TRUE + a bare guess → code owns UNDERIVED',
    computationDemandedButAbsent(true, 'is it about 51 million?'));
  // ⚠️ THE MEASURED CASE (P-T3(j)): an assertion that merely NAMES method components was scored
  // derived=1 by the model on 9 of 10 turns. Code sees what the model was talked out of seeing.
  ok('calc=TRUE + method NAMED but nothing computed → code owns UNDERIVED (the 9-of-10 defect)',
    computationDemandedButAbsent(true,
      'once the one-year tax lag and the reducing-balance allowances are taken into account the ' +
      'discounted inflows fall short of the CAD 18.0m outlay, so the NPV is negative and the ' +
      'profitability index is below 1'));
  ok('calc=TRUE + real arithmetic → does NOT fire (there is working to judge)',
    !computationDemandedButAbsent(true, 'EVA=312M-(0.14*1,800M) EVA=60M'));
  // The two arms are mutually exclusive by construction — asserted, not assumed, because the
  // route ANDs them and a future edit to either regex could overlap them silently.
  for (const m of [HARM_TURN, '60m', 'EVA=312M-252M', '1,800 x 0.14', ...NARRATIVE]) {
    ok(`veto and mirror never both fire: "${m.slice(0, 34)}…"`,
      !(bareGuessGuardVetoed(m) && computationDemandedButAbsent(true, m)));
  }
}

// ── 6. THE WIRING, PINNED — the unit tests cannot prove the veto is USED ─────
// A static sweep of the route, same reasoning as test:paper-link-sweep: everything above proves
// the rule is RIGHT, and every defect in this class was the rule being right and not reached.
// TWO arms, and each has its own break mode:
//   • prompt-side gone → the guard is described on every turn again and can fire on a student
//     who showed working, which is the whole false-positive class this exists to remove;
//   • opening-side gone → the model can still emit the label unprompted and the conditional
//     opening fires on someone who did the work.
{
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'app', 'api', 'acca', 'tutor', 'route.ts'), 'utf8');
  ok('route imports the veto', /from '@\/lib\/acca\/bare-guess-veto'/.test(src));
  ok('WIRING 1 — the guard block is built conditionally on the veto (prompt-side absence)',
    /const guardVetoed = bareGuessGuardVetoed\(attempt\)/.test(src)
    && /bareGuessGuardBlock\s*=\s*guardVetoed[\s\S]{0,40}\?\s*''/.test(src));
  // The guard's TEXT lives in lib/acca/hint-opening.ts (guardBlock), so the trigger and the label
  // it emits are one definition. Break mode: someone re-inlines the prompt text here "to see it in
  // context", the module copy stops being the only one, and a scope rewrite lands in a string the
  // route no longer reads.
  ok('WIRING 1 — the route composes guardBlock() and does NOT inline the guard prose',
    /guardBlock\(GUARD_SCOPE_VARIANT, GUARD_LABEL_VARIANT\)/.test(src)
    && !/BARE-GUESS GUARD \(do this before the equivalence check\)/.test(src));
  // The FIRST source of "was anything established" moved from a substring match to call2's
  // structured verdict (P-T3(i)); the veto is unchanged and still ANDed onto it. Both halves are
  // pinned separately so removing either fails here rather than silently widening the branch.
  ok('WIRING 2 — the conditional opening is vetoed too',
    /gapNothingEstablished\s*&&\s*!bareGuessGuardVetoed\(attempt\)/.test(src));
  // WIRING 3 — the mirror. Break modes: the column is never fetched (the gate reads undefined and
  // defaults false, so the arm is silently dead); the flag is not threaded into call2; or the
  // resolution is not what the hint leg is handed.
  ok('WIRING 3 — drillSelect actually FETCHES calculation_required',
    /\.select\('[^']*calculation_required[^']*'\)/.test(src));
  ok('WIRING 3 — it defaults FALSE, never true (unknown must mean discursive)',
    /drill\.calculation_required as boolean \| null\) \?\? false/.test(src));
  ok('WIRING 3 — call2 computes the code-owned arm from it',
    /computationDemandedButAbsent\(calculationRequired, attempt\)/.test(src));
  ok('WIRING 3 — the resolution is CODE > FIELD > PHRASE and is what the hint leg gets',
    /resolveNothingEstablished\(codeOwnsUnderived, gapVerdict, diagnosis\)/.test(src));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} bare-guess veto: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
