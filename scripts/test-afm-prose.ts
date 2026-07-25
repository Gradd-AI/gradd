// scripts/test-afm-prose.ts
// Fixtures for the rescoped AFM prose lints (lib/acca/validate-afm-prose.ts). Pure — no
// env/DB/model. Exit 1 on any mismatch.
import { lintJurisdiction, lintCompleteness, lintFrozenMarketFacts, lintMisconceptionLead, lintZeroAdditionalTaxPhrasing, lintRecommendationConsistency } from '../lib/acca/validate-afm-prose';

let failures = 0;
function check(name: string, got: number, want: number, codes: string[] = []) {
  const ok = got === want;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} :: ${name}${ok ? '' : `  (got ${got} issues, want ${want}${codes.length ? ' [' + codes.join(',') + ']' : ''})`}`);
}

// (1) Factual regulator name in a scenario field is ALLOWED.
check('factual regulator name in context is allowed',
  lintJurisdiction({ context_text: 'The company holds a Health Canada licence and is listed on the TSX.', question: 'Advise the board.' }).length, 0);

// (2) Regulator behaviour/timeline claim in ADVICE, regulator NOT in the scenario → FLAG.
check('advice invents a regulator timeline claim (not in scenario)',
  lintJurisdiction({ context_text: 'A domestic manufacturer.', model_answer: 'The board should note Health Canada approval timelines could slip.' }).length, 1, ['regulator-behaviour-claim']);

// (3) Same claim, but the scenario DOES name the regulator → ALLOWED (stated in scenario).
check('advice engages a regulator the scenario named',
  lintJurisdiction({ context_text: 'The company holds a Health Canada licence; approval timelines are a stated risk.', model_answer: 'The board should weigh the Health Canada approval timelines the scenario flags.' }).length, 0);

// (4) Named tax class in ADVICE → FLAG anywhere.
check('advice names a tax class (Class 43)',
  lintJurisdiction({ context_text: 'A domestic manufacturer.', model_answer: 'Confirm the assets fall in Class 43.' }).length, 1, ['named-tax-specific']);

// (5) Named tax class in CONTEXT → still FLAG (scenarios state rates, not classes).
check('context names a tax class (Class 10)',
  lintJurisdiction({ context_text: 'Depreciation under the Class 10 declining-balance rate.', question: 'Advise the board.' }).length, 1, ['named-tax-specific']);

// (6) Formulary specific in advice — flagged when not in scenario, allowed when it is.
check('advice invents a formulary specific (not in scenario)',
  lintJurisdiction({ context_text: 'A domestic manufacturer.', full_reveal: 'A pan-national beta underprices provincial formulary listing delays.' }).length, 1, ['market-structure-specific']);
check('advice engages a formulary risk the scenario stated',
  lintJurisdiction({ context_text: 'Provincial formulary-listing delays are a stated risk.', full_reveal: 'The scenario flags provincial formulary risk.' }).length, 0);

// (7) The exempt simplification line does not trip the half-year rule pattern.
check('standard simplification line is exempt',
  lintJurisdiction({ context_text: 'Rate 25%. For the purposes of this appraisal, ignore any jurisdiction-specific half-year rule and apply tax-allowable depreciation exactly as stated.' }).length, 0);

// (8) P5 completeness — question demands sensitivity, model answer delivers none.
check('P5: demanded sensitivity not delivered',
  lintCompleteness('Appraise by NPV and assess sensitivity.', 'NPV appraisal only. NPV is positive.').length, 1, ['demanded-element-not-delivered']);
check('P5: NPV demanded and delivered',
  lintCompleteness('Appraise the project by NPV.', 'NPV = 5.0m. Accept.').length, 0);
check('P5: mutually-exclusive ranking demanded + delivered (not a PI table)',
  lintCompleteness('Appraise Line A by NPV and IRR and rank it against Line B.', 'IRR 25%. NPV 12m. Ranking against the mutually exclusive alternative: Line B is preferred on NPV.').length, 0);
check('P5: IRR demanded but not delivered',
  lintCompleteness('Appraise the project by internal rate of return.', 'NPV = 5m. Accept.').length, 1, ['demanded-element-not-delivered']);
check('P5: IRR + MIRR demanded and delivered',
  lintCompleteness('Appraise by IRR and MIRR.', 'IRR 21%. MIRR 17%. Accept.').length, 0);

// (9) P4b frozen-market-facts (NARROWED) — a live MARKET claim flags; scenario-STATE does not.
check('frozen-facts: "current market inputs" flagged',
  lintFrozenMarketFacts({ model_answer: 'The WACC uses current market inputs rather than historical averages.' }).length, 1, ['live-market-claim']);
check('frozen-facts: "currently yields" flagged (adverb + market term)',
  lintFrozenMarketFacts({ context_text: 'The 8-year benchmark currently yields 6.2%.' }).length, 1, ['live-market-claim']);
check('frozen-facts: scenario-state "currently uses ROI" NOT flagged',
  lintFrozenMarketFacts({ context_text: 'The board currently uses ROI as its only divisional metric.' }).length, 0);
check('frozen-facts: scenario-state "utilisation rate (currently 71%)" NOT flagged',
  lintFrozenMarketFacts({ context_text: 'Average vehicle utilisation rate (currently 71%) and on-time delivery rate.' }).length, 0);
check('frozen-facts: technical "current yield level" NOT flagged (adjective, evaluation point)',
  lintFrozenMarketFacts({ model_answer: 'Modified duration is the slope of the tangent at the current yield level.' }).length, 0);
check('frozen-facts: dated assumption is clean',
  lintFrozenMarketFacts({ model_answer: 'The WACC uses market inputs at the valuation date rather than historical averages.' }).length, 0);

// (10) P7 misconception-lead — a real "...misconception...: " sentence passes; scaffolding-only prose
// with no such sentence hits the fallback and FAILS the gate.
check('P7: real misconception sentence passes',
  lintMisconceptionLead('The dominant misconception here is treating the sold leg as pure income: it is an obligation that can be exercised against you.').length, 0);
check('P7: differently-worded real misconception sentence still passes (case-insensitive, any lead-in)',
  lintMisconceptionLead('A classic error is the misconception that a collar is a free hedge: the net premium is real.').length, 0);
check('P7: scaffolding prose with no misconception sentence FAILS (fallback)',
  lintMisconceptionLead('A collar answer earns its marks by following the sequence and then reading the trade-off. The most common stall is stopping at the net premium.').length, 1, ['fallback-not-real-match']);
check('P7: empty full_reveal is out of scope (no issue raised)',
  lintMisconceptionLead('').length, 0);

// (11) P9 zero-additional-tax phrasing (AFM mock FR1) — credit/offset-against language for the WHT
// on the nil-additional-tax branch FAILS; net-cost wording and the non-nil branch pass.
check('P9: "credit the withholding against the home charge" on nil branch FAILS',
  lintZeroAdditionalTaxPhrasing(true, { full_reveal: 'translate at the parity rate, credit the withholding against the French charge, then discount.' }).length, 1, ['credit-against-on-nil-branch']);
check('P9: "offset against" on nil branch FAILS',
  lintZeroAdditionalTaxPhrasing(true, { hint: 'the withholding is offset against the residual home tax.' }).length, 1, ['credit-against-on-nil-branch']);
check('P9: net-cost wording on nil branch passes',
  lintZeroAdditionalTaxPhrasing(true, { full_reveal: 'no additional home tax arises and the 15% withholding is a net remittance cost, not a recoverable credit.' }).length, 0);
check('P9: does NOT fire when additional tax is non-zero (gate off)',
  lintZeroAdditionalTaxPhrasing(false, { full_reveal: 'the withholding is credited against the home charge on the differential.' }).length, 0);

// (12) GATE 26 recommendation-consistency (AFM mock FR1) — advice must name the code-selected method
// in a recommendation-position sentence and must not name a losing method in one.
check('GATE 26: advice recommends the LOSING method FAILS',
  lintRecommendationConsistency('the forward', ['the forward', 'the money-market hedge'], { model_answer: 'Solenne should opt for the money-market hedge, which is cheaper.' }).length, 2, ['losing-method-in-recommendation', 'selected-method-not-recommended']);
check('GATE 26: advice recommends the SELECTED method passes',
  lintRecommendationConsistency('the forward', ['the forward', 'the money-market hedge'], { model_answer: 'The forward is recommended as the higher-value hedge.' }).length, 0);
check('GATE 26: a losing method in a NON-recommendation (table/data) line does not trip',
  lintRecommendationConsistency('the forward', ['the forward', 'the money-market hedge'], { model_answer: '| Money-market hedge | EUR 31.3m |\nThe forward gives the higher outcome and is recommended.' }).length, 0);
check('GATE 26: selected method never named in a recommendation sentence FAILS',
  lintRecommendationConsistency('the forward', ['the forward', 'the money-market hedge'], { model_answer: 'The forward gives EUR 31.7m. The board should decide in due course.' }).length, 1, ['selected-method-not-recommended']);

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL AFM-PROSE FIXTURES PASS' : `${failures} AFM-PROSE FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
