// scripts/test-afm-prose.ts
// Fixtures for the rescoped AFM prose lints (lib/acca/validate-afm-prose.ts). Pure — no
// env/DB/model. Exit 1 on any mismatch.
import { lintJurisdiction, lintCompleteness, lintFrozenMarketFacts } from '../lib/acca/validate-afm-prose';

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

// (9) P4b frozen-market-facts — live "currently"/"current market" claim → FLAG; dated → clean.
check('frozen-facts: "currently above 40%" flagged',
  lintFrozenMarketFacts({ context_text: 'Lira borrowings currently above 40% in the domestic market.' }).length, 1, ['live-market-claim']);
check('frozen-facts: "current market rates" flagged',
  lintFrozenMarketFacts({ context_text: 'A single snapshot of current market rates.' }).length, 1, ['live-market-claim']);
check('frozen-facts: dated assumption is clean',
  lintFrozenMarketFacts({ context_text: 'Lira borrowings assumed at the valuation date to be above 40%.' }).length, 0);

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL AFM-PROSE FIXTURES PASS' : `${failures} AFM-PROSE FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
