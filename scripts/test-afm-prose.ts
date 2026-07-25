// scripts/test-afm-prose.ts
// Fixtures for the rescoped AFM prose lints (lib/acca/validate-afm-prose.ts). Pure — no
// env/DB/model. Exit 1 on any mismatch.
import { lintJurisdiction, lintCompleteness, lintFrozenMarketFacts, lintMisconceptionLead, lintZeroAdditionalTaxPhrasing, lintRecommendationConsistency, lintTaxRateAssignment, findCorporateTaxRates, lintZeroAdditionalTaxScenario } from '../lib/acca/validate-afm-prose';

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

// (13) TAX_RATE_ASSIGNMENT (AFM mock FR2) — a scenario stating ≥2 distinct CORPORATE tax
// rates must assign a rate to every purpose it puts in play. Regression-locks the exact
// Mock Paper 1 hole: Brazil 34% + France 25% stated, nothing saying which does what.
const MOCK_MULTIRATE_UNASSIGNED =
  'The Brazilian corporate tax rate is 34%. Dividends remitted to France suffer Brazilian withholding tax of 15%. ' +
  'The France–Brazil treaty provides relief from double taxation, and the French corporate tax rate is 25%. ' +
  'Solenne intends to appraise Rio Verde at a project-specific discount rate. ' +
  'In a normal year it generates profit before interest and tax (PBIT) of BRL 320 million. ' +
  "The peer's equity beta is ungeared to an asset beta and regeared to Solenne's structure.";
const MOCK_MULTIRATE_ASSIGNED =
  'The Brazilian corporate tax rate is 34%. Dividends remitted to France suffer Brazilian withholding tax of 15%. ' +
  'The France–Brazil treaty provides relief from double taxation: the Brazilian corporate tax of 34% borne on those ' +
  'profits is credited against the French corporate tax of 25% that would otherwise fall due on them when remitted, ' +
  'and the 15% Brazilian withholding tax is deducted as the profits are remitted. ' +
  "The Brazilian producer's own corporate tax rate of 34% is carried into the ungearing of that company's equity beta; " +
  "the French corporate tax rate of 25% is applied when regearing the asset beta to Solenne's own structure and when " +
  'weighting its post-tax cost of debt for the discount rate. ' +
  "Rio Verde's operating cash flows and its profit before interest and tax (PBIT) are taxed in Brazil at 34%.";

check('TAX_RATE_ASSIGNMENT: two corporate rates with NO purpose assignment FAILS',
  lintTaxRateAssignment(MOCK_MULTIRATE_UNASSIGNED).length, 1, ['multi-rate-purpose-unassigned']);
check('TAX_RATE_ASSIGNMENT: same scenario WITH explicit assignments passes',
  lintTaxRateAssignment(MOCK_MULTIRATE_ASSIGNED).length, 0);
check('TAX_RATE_ASSIGNMENT: single corporate rate is a structural no-op',
  lintTaxRateAssignment('The company pays corporation tax at 25%. It ungears the proxy beta and regears to its own structure to discount the operating cash flows.').length, 0);
check('TAX_RATE_ASSIGNMENT: no corporate rate at all is a no-op',
  lintTaxRateAssignment('The risk-free rate is 4.5% and the market risk premium is 6.0%.').length, 0);
// A non-corporate percentage must never be read as an assignment (the "cost of debt is 5.5%"
// false-positive found while building this gate).
check('TAX_RATE_ASSIGNMENT: a non-tax percentage does not count as assigning a rate',
  lintTaxRateAssignment('The Brazilian corporate tax rate is 34%. The French corporate tax rate is 25%. ' +
    "Solenne's pre-tax cost of debt is 5.5% and it appraises at a project-specific discount rate.").length, 1, ['multi-rate-purpose-unassigned']);
// rate DETECTION must pick up corporate rates only — not withholding/inflation/discount rates.
check('findCorporateTaxRates: detects both corporate rates',
  findCorporateTaxRates('The Brazilian corporate tax rate is 34% and the French corporate tax rate is 25%.').length, 2);
check('findCorporateTaxRates: ignores withholding / inflation / risk-free percentages',
  findCorporateTaxRates('Withholding tax of 15% applies. Inflation is 4.5%. The risk-free rate is 3.8%.').length, 0);

// (14) P9-SCENARIO (FR3) — nil-branch RESOLVED-OUTCOME assertions in the shared
// scenario/exhibits, the field P9 proper deliberately does not scan. Mechanism statements
// (including the approved capped-relief Exhibit 1 wording) must PASS; outcome assertions fail.
const EXHIBIT1_APPROVED =
  'The France–Brazil treaty provides relief from double taxation: relief is given for the Brazilian corporate tax of 34% ' +
  'suffered on those profits, credited against the French corporate tax of 25% that would otherwise be due on the same ' +
  'profits and capped at that French charge; the 15% Brazilian withholding tax is deducted separately as the profits are remitted.';

check('P9-SCENARIO: the APPROVED capped-relief Exhibit 1 wording PASSES (mechanism, not outcome)',
  lintZeroAdditionalTaxScenario(true, EXHIBIT1_APPROVED).length, 0);
check('P9-SCENARIO: "no further French tax is due" FAILS',
  lintZeroAdditionalTaxScenario(true, EXHIBIT1_APPROVED + ' Accordingly no further French tax is due on the remitted profits.').length, 1, ['resolved-outcome-in-scenario']);
check('P9-SCENARIO: "the profits are fully relieved" FAILS',
  lintZeroAdditionalTaxScenario(true, 'The treaty applies and the profits are fully relieved from French tax.').length, 1, ['resolved-outcome-in-scenario']);
check('P9-SCENARIO: "the credit extinguishes the French charge" FAILS',
  lintZeroAdditionalTaxScenario(true, 'The Brazilian credit extinguishes the French charge on those profits.').length, 1, ['resolved-outcome-in-scenario']);
check('P9-SCENARIO: "no residual French liability" FAILS',
  lintZeroAdditionalTaxScenario(true, 'There is no residual French liability once the credit is applied.').length, 1, ['resolved-outcome-in-scenario']);
check('P9-SCENARIO: "the French charge is reduced to nil" FAILS',
  lintZeroAdditionalTaxScenario(true, 'The French charge is reduced to nil after relief.').length, 1, ['resolved-outcome-in-scenario']);
check('P9-SCENARIO: bare "credited against" alone is MECHANISM and passes',
  lintZeroAdditionalTaxScenario(true, 'Overseas tax suffered is credited against the home charge.').length, 0);
check('P9-SCENARIO: gate is OFF on the non-nil branch (outcome language allowed there)',
  lintZeroAdditionalTaxScenario(false, 'Accordingly no further French tax is due on the remitted profits.').length, 0);

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL AFM-PROSE FIXTURES PASS' : `${failures} AFM-PROSE FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
