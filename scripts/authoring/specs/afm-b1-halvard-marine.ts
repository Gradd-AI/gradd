// scripts/authoring/specs/afm-b1-halvard-marine.ts
//
// AFM PRACTICE CASE 2 — Section B, 25 marks (20 technical + 5 professional skills).
//
//   (i)  B1a  13 marks  calculate  — expected NPV across three demand scenarios, and P(negative NPV)
//   (ii) B1b   7 marks  evaluate   — what the ENPV and the downside probability do and do NOT tell
//                                    the board, and whether the appraisal supports the decision
//
// WHY THIS SHAPE:
//   • B1a is the risk-and-uncertainty arm of the family-gate union (`lib/acca/risk.ts`, enpv kind).
//     It pulls the base barrier plus the enpv gates, and it is a DIFFERENT calculator from
//     Kestrel's B5b — the anti-stacking constraint, satisfied by construction.
//   • The narrative is B1b and is tagged SCEPTICISM. That is not a label chosen to fill a gap: the
//     requirement is built so the marks are in CHALLENGING the appraisal the candidate has just
//     produced — a single expected value conceals the spread it averages, the probabilities are
//     management's own estimates rather than observed frequencies, and the board has been handed a
//     recommendation phrased as if the ENPV settled the question. Questioning the assertion and
//     seeking justification for its inputs is the ACCA scepticism descriptor almost verbatim.
//   • Pairing a numeric appraisal with a requirement to be sceptical ABOUT THAT SAME APPRAISAL is
//     the shape that makes the scepticism honest — the candidate cannot be sceptical about a
//     forecast they were never made to build.
//
// EVERY FIGURE IN THE MODEL ANSWER IS CODE-OWNED. This file supplies inputs and prose only.

import type { AfmCaseSpec } from '../../../lib/acca/case-authoring-spec';
import type { NarrativeRubric } from '../../../lib/acca/narrative-marker';

// ── The scenario ─────────────────────────────────────────────────────────────
const INTRO =
  'It is now 1 October 20X5. You are a financial adviser to the board of Halvard Marine ASA ' +
  '("Halvard"), a Norwegian operator of offshore support vessels, which reports in Norwegian ' +
  'kroner (NOK). Write a report to the board of Halvard responding to its instructions in the ' +
  'requirements below, using the information in the exhibits provided. Professional marks will be ' +
  'awarded for the demonstration of skill in analysis and evaluation and scepticism in your answer.';

const EXHIBITS = [
  {
    title: 'Company background',
    body:
      'Halvard Marine ASA (Halvard) owns and operates a fleet of offshore support vessels serving ' +
      'wind-farm construction and maintenance in the North Sea. The board is considering ordering ' +
      'one additional purpose-built service operation vessel for delivery at the start of the ' +
      'appraisal period. Demand for such vessels follows the pace at which offshore wind capacity ' +
      'is commissioned, which the board accepts it cannot forecast with confidence. Halvard reports ' +
      'and is taxed in Norwegian kroner.',
  },
  {
    title: 'Exhibit 1 — The vessel investment',
    body:
      'The vessel would cost NOK 900 million, payable in full at the start of the project. The ' +
      'board has instructed that the appraisal use a discount rate of 9.0%, which Halvard\'s ' +
      'advisers have derived for a vessel-operating venture of this business risk. The vessel would ' +
      'be operated for 4 years before a planned fleet review, and the appraisal should be run over ' +
      'those 4 years. A project is accepted if its expected net present value exceeds zero.',
  },
  {
    title: 'Exhibit 2 — The three demand scenarios',
    body:
      'Halvard\'s commercial director has built three demand scenarios and attached probabilities ' +
      'to them.\n\n' +
      'STRONG BUILD-OUT (probability 0.30): commissioning runs ahead of the published pipeline and ' +
      'the vessel is on long-term charter throughout. Net operating cash flows are NOK 340 million ' +
      'in year 1, NOK 380 million in year 2, NOK 400 million in year 3 and NOK 410 million in ' +
      'year 4.\n\n' +
      'CENTRAL CASE (probability 0.45): commissioning follows the published pipeline. Net operating ' +
      'cash flows are NOK 250 million in year 1, NOK 275 million in year 2, NOK 290 million in ' +
      'year 3 and NOK 300 million in year 4.\n\n' +
      'DELAYED BUILD-OUT (probability 0.25): consenting and grid connection slip, and the vessel ' +
      'spends part of each year on the spot market at lower day rates. Net operating cash flows are ' +
      'NOK 150 million in year 1, NOK 170 million in year 2, NOK 195 million in year 3 and ' +
      'NOK 210 million in year 4.',
  },
  {
    title: 'Exhibit 3 — How the scenarios were produced',
    body:
      'The commercial director has confirmed, in response to a question from the audit committee, ' +
      'that the three probabilities are her own judgement informed by the published commissioning ' +
      'pipeline and by discussions with two developers. They are not derived from observed ' +
      'frequencies, and no independent forecast was commissioned. The scenarios were built by ' +
      'flexing the commissioning pace only; day rates within each scenario were held at the ' +
      'commercial director\'s central assumption, and vessel operating costs were assumed to be ' +
      'unaffected by which scenario occurs.',
  },
  {
    title: 'Exhibit 4 — The recommendation put to the board',
    body:
      'The paper circulated to the board by the commercial director concludes: "The expected net ' +
      'present value of the vessel is positive, so the investment creates value and the board ' +
      'should approve the order." The chair has asked you whether that conclusion is a sufficient ' +
      'basis for committing NOK 900 million, and has noted that the board has never previously ' +
      'ordered a vessel without a signed long-term charter in place.',
  },
];

// ── (i) B1a — expected NPV across the three scenarios ────────────────────────
// Inputs only. Every figure below appears verbatim in Exhibit 1 or Exhibit 2 (enforced by the
// path's exhibit-recoverability gate); the calculator owns every derived number.
const ENPV_INPUTS = {
  currency: 'NOK',
  outlay: 900,
  discount_rate: 9.0,
  hurdle: 0,
  scenarios: [
    { label: 'Strong build-out', probability: 0.30, cash_flows: [340, 380, 400, 410] },
    { label: 'Central case',     probability: 0.45, cash_flows: [250, 275, 290, 300] },
    { label: 'Delayed build-out', probability: 0.25, cash_flows: [150, 170, 195, 210] },
  ],
};

// ── (ii) B1b — what the appraisal does and does not establish ────────────────
const B1B_FACTS = [
  { id: 'f_judgement', text: 'the probabilities are the commercial director\'s own judgement, not observed frequencies', key: 'judgement', kind: 'constraint' as const },
  { id: 'f_noindep', text: 'no independent forecast was commissioned', key: 'independent', kind: 'constraint' as const },
  { id: 'f_onevar', text: 'only commissioning pace was flexed; day rates and operating costs were held constant across scenarios', key: 'day rates', kind: 'constraint' as const },
  { id: 'f_claim', text: 'the commercial director\'s paper concludes the positive ENPV means the board should approve', key: 'should approve', kind: 'entity' as const },
  { id: 'f_charter', text: 'the board has never previously ordered a vessel without a signed long-term charter', key: 'charter', kind: 'entity' as const },
];

const B1B_RUBRIC: NarrativeRubric = {
  mode: 'narrative',
  requirement_parts: ['what the appraisal establishes', 'what it does not establish', 'advise the board'],
  scenario_facts: B1B_FACTS,
  total_marks: 7,
  bands: [{ min: 0, label: 'fail' }, { min: 0.5, label: 'pass' }, { min: 0.7, label: 'good' }, { min: 0.85, label: 'excellent' }],
  criteria: [
    {
      id: 'c_meaning',
      requirement_part: 'what the appraisal establishes',
      lo: 'B1b',
      required_point:
        'Explains what the expected NPV actually is — a PROBABILITY-WEIGHTED AVERAGE across the ' +
        'three scenarios — and therefore that it is an outcome which does not itself occur in any ' +
        'of them. States that the downside probability, not the average, is what tells the board ' +
        'how often the vessel destroys value.',
      marks: 2,
      anchor_facts: ['f_claim'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_probabilities',
      requirement_part: 'what it does not establish',
      lo: 'B1b',
      required_point:
        'CHALLENGES the probabilities themselves: they are the commercial director\'s own ' +
        'judgement rather than observed frequencies, and no independent forecast was obtained, so ' +
        'the expected value inherits whatever bias sits in the weights. Seeks justification — ' +
        'e.g. an external view of the commissioning pipeline — rather than accepting the estimate.',
      marks: 2,
      anchor_facts: ['f_judgement', 'f_noindep'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_onevariable',
      requirement_part: 'what it does not establish',
      lo: 'B1b',
      required_point:
        'CHALLENGES the construction of the scenarios: only commissioning pace was flexed, while ' +
        'day rates and operating costs were held at a single assumption across all three. So the ' +
        'spread understates the real range of outcomes — a delayed build-out would plausibly ' +
        'depress day rates as well, and the downside scenario is therefore not the worst case.',
      marks: 2,
      anchor_facts: ['f_onevar'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_advise',
      requirement_part: 'advise the board',
      lo: 'B1b',
      required_point:
        'Commits to a position on whether the positive expected NPV is a sufficient basis for the ' +
        'commitment, and ties it to the board\'s own practice of not ordering without a signed ' +
        'charter. Does not merely list arguments on both sides.',
      marks: 1,
      anchor_facts: ['f_charter'],
      disqualifiers: ['F4'],
      development_required: true,
    },
  ],
};

const B1B_GOOD =
  'The commercial director\'s paper concludes that the board should approve the order because the ' +
  'expected net present value is positive. That conclusion asks the appraisal to carry more weight ' +
  'than it can, and the board should be clear about the gap before committing NOK 900 million.\n\n' +
  'What the appraisal does establish is close to the opposite of what the paper claims. The ' +
  'expected value is positive only because one favourable scenario is large enough to outweigh ' +
  'the other two, and both of those destroy value — the central case, which is the commercial ' +
  'director\'s own planning assumption, does not itself pay for the vessel. So the probability ' +
  'that this investment loses money is greater than the probability that it makes money, while ' +
  'its expected value remains positive. Both statements are true at once, and a paper reporting ' +
  'only the second is not describing the decision the board is being asked to take.\n\n' +
  'That is a property of the measure. The expected net present value is the ' +
  'sum of each scenario\'s net present value multiplied by its probability, which means it is an ' +
  'outcome that occurs in none of the three futures the commercial director has described. The ' +
  'vessel will be chartered into a strong build-out, a central case or a delayed one; it will not ' +
  'be chartered into the average of them. What tells the board how exposed it is, therefore, is ' +
  'not the average but the probability attached to the scenarios that destroy value, and that ' +
  'figure should be read alongside the expected value rather than behind it.\n\n' +
  'What it does not establish is that the weights are right. The three probabilities are the ' +
  'commercial director\'s own judgement, informed by the published pipeline and by conversations ' +
  'with two developers; they are not observed frequencies, and no independent forecast was ' +
  'commissioned. An expected value is only as good as the weights it averages over, so a single ' +
  'positive figure here carries the commercial director\'s optimism about commissioning pace ' +
  'directly into the recommendation. Before relying on it the board should obtain an external view ' +
  'of the pipeline, and should ask what the weights would have to become for the conclusion to ' +
  'reverse.\n\n' +
  'Nor does it establish the true range of outcomes. Only commissioning pace was flexed between ' +
  'the scenarios: day rates were held at the central assumption throughout, and operating costs ' +
  'were assumed to be unaffected by which scenario occurs. That is not how the market behaves. A ' +
  'delayed build-out means more vessels chasing spot work, which would depress day rates at the ' +
  'same time as it reduces utilisation, so the two adverse effects would arrive together. The ' +
  'delayed scenario is consequently not a worst case at all, and the real downside is worse than ' +
  'the appraisal shows.\n\n' +
  'I therefore advise the board that the positive expected net present value is a necessary but ' +
  'not a sufficient basis for this commitment. The board has never previously ordered a vessel ' +
  'without a signed long-term charter, and nothing in this appraisal justifies departing from that ' +
  'practice: the figure that would justify it — a downside built on jointly stressed utilisation ' +
  'and day rates, weighted by probabilities someone outside the company recognises — has not been ' +
  'produced. My recommendation is that the board should not approve the order on this paper, and ' +
  'should re-commission the appraisal on those terms, or secure a charter before committing.';

// The golden BAD — never served. Designed to raise F1 (restates the exhibit), F5 (anchor facts
// unused) and F4 (no committed verdict).
const B1B_BAD =
  'Halvard Marine ASA owns and operates a fleet of offshore support vessels serving wind-farm ' +
  'construction and maintenance in the North Sea. The board is considering ordering one additional ' +
  'purpose-built service operation vessel for delivery at the start of the appraisal period. The ' +
  'commercial director has built three demand scenarios and attached probabilities to them.\n\n' +
  'Expected net present value is a technique used to deal with risk in investment appraisal. It ' +
  'involves multiplying each possible outcome by its probability and adding the results together ' +
  'to give a single figure. This figure can then be compared with zero in order to decide whether ' +
  'the project should be accepted or rejected.\n\n' +
  'There are advantages and disadvantages to using expected values. The main advantage is that it ' +
  'reduces a range of possible outcomes to one number, which is simple for decision makers to ' +
  'understand and use. The main disadvantage is that it depends on the probabilities used, which ' +
  'may not be accurate. Expected values are also more appropriate for decisions that are repeated ' +
  'many times than for one-off decisions.\n\n' +
  // NOTE: this paragraph is deliberately free of every marker `hasConclusion` looks for
  // (recommend / conclude / the board should / on balance / should proceed …). That is what makes
  // the golden BAD raise F4, and N4 fails the case if it does not.
  'There are a number of factors that will need to be considered here. The expected net present ' +
  'value is one input into the decision and there are others of comparable importance. All of ' +
  'these matters will need to be weighed carefully in the light of the company\'s circumstances ' +
  'and its attitude to risk before a final view is reached on the investment.';

const SPEC: AfmCaseSpec = {
  frame: {
    id: 'ac000000-0000-4000-8000-00000000b101',
    section: 'B',
    anchor_area: 'B1',
    title: 'Halvard Marine ASA',
    scenario_intro: INTRO,
    response_format: 'report',
    total_marks: 25,
    professional_skills_marks: 5,
  },
  exhibits: EXHIBITS,
  numeric: [
    {
      requirement_order: 1,
      marks: 13,
      ps_tags: ['analysis_and_evaluation'],
      intellectual_level: 3,
      calc: { lo: 'B1a', inputs: ENPV_INPUTS },
      prose: {
        question:
          '(i) Calculate the expected net present value of the vessel investment and the ' +
          'probability that it returns a negative net present value, and advise the board what ' +
          'the appraisal shows. (13 marks)',
        // States NO figure — every number belongs to the calculator.
        // STATES NO FIGURE — every number belongs to the calculator, and prose that restates one
        // is prose that can drift from it. This paragraph was rewritten after the first build:
        // it originally said the delayed scenario was "the only one that threatens the outlay",
        // which the computed scenario NPVs contradict. The gates cannot catch that — advice is
        // free prose — so it is caught by reading the built output, which is why the path prints
        // it before it inserts anything.
        advice:
          'The two outputs point in opposite directions, and that is the finding the board needs ' +
          'rather than either figure on its own. The expected value clears the acceptance rule, ' +
          'so on the criterion the board has set the vessel is acceptable. But it clears it only ' +
          'because one favourable scenario is large enough to outweigh the other two, and both of ' +
          'those destroy value — the central case, which the commercial director treats as the ' +
          'planning assumption, is itself marginally negative. The probability that this ' +
          'investment loses money is therefore substantially greater than the probability that it ' +
          'makes money, even though its expected value is positive. For a decision taken once, on ' +
          'a single vessel, that distinction is the whole decision: an expected value is what ' +
          'Halvard would earn on average if it took this bet repeatedly, and it will take it once. ' +
          'The board should not read the positive expected value as a recommendation to proceed ' +
          'without first satisfying itself about the central case, because it is the central case ' +
          'that carries most of the probability and it does not, on these numbers, pay for the ' +
          'vessel.',
        misconception:
          'reading a positive expected net present value as though it were the project\'s outcome',
        symptom:
          'candidates compute the expected value, compare it with zero, and recommend acceptance ' +
          'without ever computing or interpreting the downside probability.',
        fix:
          'The fix is to hold the two outputs together. Discount each scenario\'s cash flows in ' +
          'full and separately, so that each scenario has its own net present value; only then ' +
          'weight them. The expected value is the probability-weighted average of those figures ' +
          'and is an outcome that occurs in none of the scenarios. Alongside it, add the ' +
          'probabilities of the scenarios whose net present value is negative — that sum, not the ' +
          'average, is what tells the board how often this decision loses money. A candidate who ' +
          'weights the cash flows first and discounts the average afterwards will usually land on ' +
          'a similar expected value and will have destroyed the scenario detail the second output ' +
          'depends on.',
        hint_lead:
          'Do not average the cash flows first — the downside probability is a mark-earning output ' +
          'and averaging destroys it.',
        hint_method:
          'Discount each scenario separately at the given rate to get three net present values, ' +
          'each after deducting the full outlay. Weight those three figures by their probabilities ' +
          'for the expected net present value, and separately add the probabilities of whichever ' +
          'scenarios came out negative.',
      },
    },
  ],
  narrative: [
    {
      requirement_order: 2,
      lo: 'B1b',
      marks: 7,
      ps_tags: ['scepticism', 'analysis_and_evaluation'],
      intellectual_level: 3,
      question:
        '(ii) Evaluate what your appraisal in (i) does and does not establish about the vessel ' +
        'investment, and advise the board whether the commercial director\'s conclusion is a ' +
        'sufficient basis for committing the capital. (7 marks)',
      rubric: B1B_RUBRIC,
      golden_good: B1B_GOOD,
      golden_bad: B1B_BAD,
      misconception:
        'treating the expected value as the answer rather than as an input with known weaknesses',
      symptom:
        'candidates recite generic advantages and disadvantages of expected values without ' +
        'touching the probabilities or the scenario construction in front of them.',
      fix:
        'The fix is to be specific about THIS appraisal. Say what the expected value is — a ' +
        'probability-weighted average that occurs in none of the scenarios — then challenge the ' +
        'two things the exhibits tell you are weak: probabilities that are one person\'s judgement ' +
        'with no independent forecast behind them, and scenarios built by flexing a single ' +
        'variable while day rates and costs were held constant. Then commit to a position.',
      hint_lead:
        'Generic advantages and disadvantages of expected values earn very little here.',
      hint_method:
        'The marks are in challenging this particular appraisal: who produced the probabilities ' +
        'and on what basis, and what was held constant when the scenarios were built. Then answer ' +
        'the chair\'s actual question — is this a sufficient basis for the commitment — and take a ' +
        'position rather than listing considerations.',
    },
  ],
};

export default SPEC;
