// scripts/test-reveal-figure-audit.ts
// Fixtures for lib/acca/reveal-figure-audit.ts. PURE — no env, no DB, no model.
// Run: npm run test:reveal-figure-audit
//
// ── P-G3(a): BOTH DIRECTIONS, AND THE CONTROL IS THE HALF THAT MATTERS ───────
// A suite of catches alone passes against a checker that flags EVERYTHING, and a checker that
// flags everything is worse than none: it trains its reader to ignore it. So the real reveal
// that invented a figure must flag, AND a real reveal whose every figure is sourced must not.
//
// The positive case is not synthetic. It is the text served to account dd786100 on APM B3b
// (Aotea Energy) at 2026-08-07 02:12:14, with the scenario it was served against — the reveal
// that put this whole item at the top of the list.

import { auditRevealFigures, numbersIn, normaliseNumber } from '../lib/acca/reveal-figure-audit';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

// ── THE REAL SCENARIO (acca_drills.context_text, drill 2e0dcab5) ─────────────
const AOTEA_CONTEXT =
  'Aotea Energy is a New Zealand electricity generation and distribution company that operates a '
  + 'mixed portfolio of hydro and gas-peaker plants. The board currently evaluates divisional '
  + 'performance using return on capital employed (ROCE), targeting 9% across both divisions; the '
  + 'hydro division reports ROCE of 11% and the gas-peaker division reports ROCE of 7%. The '
  + "company's weighted average cost of capital (WACC) is estimated internally at 8.5%, and the "
  + 'board is debating whether to expand the gas-peaker capacity by NZD 120 million to meet '
  + 'projected peak-demand growth.';

// The student's own words on the turn that earned the reveal.
const AOTEA_ATTEMPT =
  'Based on current analysis-investment of the NZD120M seems to be misplaced because the division '
  + 'is destroying value and not creating it. WACC exceeds the roce so how do expand and comment on this?';

console.log('\nreveal-figure-audit — a number in a reveal must come from somewhere\n');

// ── 1. THE PRODUCTION FAILURE, VERBATIM ──────────────────────────────────────
console.log('  the Aotea reveal (served 2026-08-07)');
{
  // The two paragraphs that carry the invention, quoted from the served message.
  const SERVED =
    'If the gas-peaker division has, say, NZD 600m in capital and generates NOPAT of NZD 42m '
    + '(the 7% return): EVA = 42 - (0.085 x 600) = 42 - 51 = -NZD 9m. That is explicit value '
    + 'destruction.\n\n'
    + 'Replace ROCE with EVA as the primary divisional metric - a 9% ROCE target that beats WACC '
    + 'looks respectable; an EVA of -NZD 9m every year tells the truth.';

  // No model_answer passed: this reproduces the OLD path, where the reveal was model-authored
  // and the stored answer was only a paraphrase source, not the served tail.
  const r = auditRevealFigures(SERVED, { context: AOTEA_CONTEXT, modelAnswer: '', attempt: AOTEA_ATTEMPT });

  ok('it flags something at all', r.unsourced.length > 0, JSON.stringify(r));
  ok('THE INVENTED CAPITAL BASE (600m) is flagged',
    r.unsourced.includes('600000000') || r.unsourced.includes('600'),
    JSON.stringify(r.unsourced));
  ok('the scenario figures it quoted correctly are NOT flagged (9, 7, 8.5, 120m)',
    !r.unsourced.includes('9') && !r.unsourced.includes('7')
    && !r.unsourced.includes('8.5') && !r.unsourced.includes('120000000'),
    JSON.stringify(r.unsourced));
  ok('it counted sourced figures too — the check had something to work with', r.sourced > 0);
}

// ── 2. THE CONTROL — a clean reveal must stay silent ─────────────────────────
// P-G3(a)'s load-bearing half. Every figure here is in the scenario, the attempt, or the stored
// answer; a checker that flags this is a checker nobody will read.
console.log('\n  the control — every figure sourced');
{
  const MODEL_ANSWER =
    'Step 1 - Compare returns to the cost of capital. The gas-peaker division returns 7% against '
    + 'a WACC of 8.5%, so it destroys value. Hydro returns 11% and creates it.\n'
    + 'Step 2 - Test the expansion. NZD 120 million at 7% earns 8.4m against a capital charge of '
    + '10.2m, so the incremental EVA is -1.8m per annum.\n'
    + 'Step 3 - Recommend. Do not approve at current returns; require a business case above 8.5%.';
  const CLEAN =
    'You correctly spotted that 7% sits below the 8.5% WACC. The worked answer below lays out the '
    + 'incremental test on the NZD 120 million and what the board should require. Take the same '
    + 'move to a fresh question.\n\n---\n\n' + MODEL_ANSWER;

  const r = auditRevealFigures(CLEAN, { context: AOTEA_CONTEXT, modelAnswer: MODEL_ANSWER, attempt: AOTEA_ATTEMPT });
  ok('a fully-sourced reveal flags NOTHING', r.unsourced.length === 0, JSON.stringify(r.unsourced));
  ok('...and it did check figures rather than finding none', r.checked > 3, `checked=${r.checked}`);
}

// ── 3. DERIVED ARITHMETIC IS TOLERATED — ceiling note 2, made explicit ───────
{
  // 8.4 = 120 x 7%, 10.2 = 120 x 8.5%, -1.8 = 8.4 - 10.2. None appear in the scenario; all are
  // sound. The checker must not flag legitimate working.
  const DERIVED = 'Incremental NOPAT is 8.4 and the capital charge is 10.2, so incremental EVA is -1.8.';
  const r = auditRevealFigures(DERIVED, { context: AOTEA_CONTEXT, modelAnswer: '', attempt: '' });
  ok('one-step derivations are tolerated, not flagged', r.unsourced.length === 0, JSON.stringify(r.unsourced));
  ok('...and are COUNTED as derived rather than silently dropped', r.derived > 0, JSON.stringify(r));
}

// ── 4. COUNTS — the Marmara "three adjustments" ──────────────────────────────
console.log('\n  counts are figures too');
{
  // Measured: "three" appears in NO field of drill 6c0694e5 — not context_text, model_answer,
  // hint or full_reveal. The scenario names TWO adjustments.
  const MARMARA_CONTEXT =
    'Capital employed includes TRY 180 million of accumulated goodwill amortised under local '
    + 'GAAP, which EVA methodology requires to be added back. A further EVA adjustment '
    + 'capitalises expensed research and business development costs of TRY 60 million (after-tax).';
  const SERVED = 'The scenario specifies three EVA adjustments that must be applied to both NOPAT and capital employed.';
  const r = auditRevealFigures(SERVED, { context: MARMARA_CONTEXT, modelAnswer: '', attempt: '' });
  ok('an unsourced COUNT-WORD fires', r.unsourced.includes('3'), JSON.stringify(r.unsourced));

  // The other direction: a count the scenario supports must not fire.
  const OK_COUNT = 'The scenario specifies two EVA adjustments.';
  const r2 = auditRevealFigures(OK_COUNT, { context: MARMARA_CONTEXT + ' There are two adjustments.', modelAnswer: '', attempt: '' });
  ok('a SOURCED count-word does not fire', !r2.unsourced.includes('2'), JSON.stringify(r2.unsourced));

  // 'one' is deliberately excluded — it is an article/pronoun in this prose far more often than
  // a count, and flagging it would bury every real finding.
  const ONE = 'Pick one of those mechanisms and show how the current measures fail it.';
  ok("'one' is not treated as a count", auditRevealFigures(ONE, { context: '', modelAnswer: '', attempt: '' }).unsourced.length === 0);
}

// ── 5. NORMALISATION ─────────────────────────────────────────────────────────
console.log('\n  normalisation');
{
  ok('thousands separators collapse', normaliseNumber('1,800') === 1800);
  ok('a magnitude suffix expands', normaliseNumber('0.4', 'm') === 400000);
  ok('"600m" in the reveal matches "600,000,000" in a source',
    auditRevealFigures('NZD 600m', { context: 'capital of 600,000,000', modelAnswer: '', attempt: '' }).unsourced.length === 0);
  ok('a figure the STUDENT supplied counts as sourced',
    auditRevealFigures('your figure of 312', { context: '', modelAnswer: '', attempt: 'NOPAT=312m' }).unsourced.length === 0);
  ok('numbersIn finds both digits and count-words',
    numbersIn('three divisions and 11% ROCE').includes(3) && numbersIn('three divisions and 11% ROCE').includes(11));
}

// ── 6. IT NEVER THROWS ───────────────────────────────────────────────────────
// The caller wraps this in try/catch, but a reveal must not depend on that: the audit is called
// on every served reveal and an exception there would be an outage on an earned action.
{
  ok('empty input is a clean report, not a throw',
    auditRevealFigures('', { context: '', modelAnswer: '', attempt: '' }).checked === 0);
  ok('prose with no numbers is clean',
    auditRevealFigures('No figures here at all.', { context: 'x', modelAnswer: 'y', attempt: 'z' }).unsourced.length === 0);
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} reveal-figure-audit: ${pass}/${pass + fail} checks\n`);
// P-G4: never process.exit() — let the runtime flush stdout first.
process.exitCode = fail === 0 ? 0 : 1;
