// scripts/authoring/specs/afm-e2-lindqvist-instruments.ts
//
// AFM PRACTICE CASE 3 — Section B, 25 marks (20 technical + 5 professional skills).
//
//   (i)  E2b  13 marks  calculate  — forward hedge vs money-market hedge on a USD receipt,
//                                    with a committed recommendation of the better method
//   (ii) E1a   7 marks  evaluate   — whether the group should centralise hedging in a treasury
//                                    function, and on what commercial basis
//
// WHY THIS SHAPE:
//   • The numeric leg is PINNED TO THE K1 KIND — `ForwardMmhCompareInputs` — specifically so
//     GATE 19 (best-method verdict integrity) is exercised: the recommended method must be the one
//     the calculator computes as best, and the stated margin must equal the computed margin. A
//     case that merely priced one hedge would leave that gate unexercised.
//   • The narrative is E1a and is tagged COMMERCIAL_ACUMEN, grounded in the same examiner evidence
//     as EN1/EN2 (SD24 p.4 Northney — "location and control were rarely discussed"; SD25 pp.13-14
//     Passmore — a treasury function must be justified as income-maximising or cost-saving, not as
//     an extra cost layer). The requirement is built so the marks are in proposing a commercially
//     viable arrangement for THIS group's position, not in describing what a treasury does.
//   • Pairing the two puts the hedging DECISION next to the hedging ARITHMETIC: (i) shows that the
//     better method wins by a margin, and (ii) asks whether it is worth building a function to
//     capture margins of that size. That is where the commercial-acumen framing naturally lives.
//
// EVERY FIGURE IN THE MODEL ANSWER IS CODE-OWNED. This file supplies inputs and prose only.

import type { AfmCaseSpec } from '../../../lib/acca/case-authoring-spec';
import type { NarrativeRubric } from '../../../lib/acca/narrative-marker';

// ── The scenario ─────────────────────────────────────────────────────────────
const INTRO =
  'It is now 1 November 20X5. You are a financial adviser to the board of Lindqvist Instruments AB ' +
  '("Lindqvist"), a Swedish manufacturer of precision measurement equipment, which reports in ' +
  'Swedish kronor (SEK). Write a report to the board of Lindqvist responding to its instructions ' +
  'in the requirements below, using the information in the exhibits provided. Professional marks ' +
  'will be awarded for the demonstration of skill in analysis and evaluation and commercial ' +
  'acumen in your answer.';

const EXHIBITS = [
  {
    title: 'Company background',
    body:
      'Lindqvist Instruments AB (Lindqvist) manufactures precision measurement equipment at two ' +
      'plants in Sweden and sells into North America, Germany and Japan. It reports in Swedish ' +
      'kronor. Export contracts are priced in the customer\'s currency, so each shipment creates a ' +
      'receivable in a foreign currency that is settled some months after the contract is agreed. ' +
      'Hedging decisions are currently taken by the finance manager of whichever operating ' +
      'subsidiary raised the invoice, and the group has no central treasury function.',
  },
  {
    title: 'Exhibit 1 — The United States receipt',
    body:
      'Lindqvist has agreed a contract with a United States customer under which it will receive ' +
      'USD 24 million in 6 months\' time. The board wants the Swedish kronor value of that receipt ' +
      'fixed now, and has asked which of the two hedges available to it gives the better outcome. ' +
      'The board notes that the bank\'s forward quote is not the rate that interest-rate parity ' +
      'alone would imply.',
  },
  {
    title: 'Exhibit 2 — Market rates',
    body:
      'The spot rate is USD 0.0950 per SEK 1. The 6-month forward rate is USD 0.0968 per SEK 1. ' +
      'Rates are quoted as US dollars per krona.\n\n' +
      'Annual interest rates available to Lindqvist are as follows. In US dollars, Lindqvist can ' +
      'borrow at 5.6% and deposit at 4.8%. In Swedish kronor, it can borrow at 3.9% and deposit ' +
      'at 3.1%.',
  },
  {
    title: 'Exhibit 3 — How hedging is currently organised',
    body:
      'Each operating subsidiary hedges its own receivables. In the last financial year the group ' +
      'entered 46 separate forward contracts across four currencies. The German and Japanese ' +
      'subsidiaries were on opposite sides of the euro on eleven occasions, and each paid its own ' +
      'bank spread. No subsidiary has access to the group\'s consolidated cash position, and the ' +
      'group treasurer role does not exist: hedging is one of several duties held by each ' +
      'subsidiary\'s finance manager.',
  },
  {
    title: 'Exhibit 4 — The proposal before the board',
    body:
      'The chief executive has proposed establishing a central group treasury function in ' +
      'Stockholm, to be staffed by three people, which would take over all hedging decisions from ' +
      'the subsidiaries. One non-executive director has objected that this "adds a head office ' +
      'department and a cost centre to a group that is already profitable, and the subsidiaries ' +
      'understand their own customers better than Stockholm will". The chief executive has asked ' +
      'for advice on whether the function can be justified, and, if so, on what basis and with ' +
      'how much authority left with the subsidiaries.',
  },
];

// ── (i) E2b — forward vs money-market hedge (K1) ─────────────────────────────
// Inputs only. Every rate below is stated verbatim in Exhibit 1 or 2 (enforced).
const FXH_INPUTS = {
  currency_home: 'SEK',
  currency_foreign: 'USD',
  exposure: 24,
  direction: 'receipt' as const,
  quote_direction: 'foreign_per_home' as const,
  forward_rate: 0.0968,
  spot: 0.0950,
  months: 6,
  rate_foreign_borrow: 5.6,
  rate_foreign_deposit: 4.8,
  rate_home_borrow: 3.9,
  rate_home_deposit: 3.1,
};

// ── (ii) E1a — should hedging be centralised, and on what basis ──────────────
const E1A_FACTS = [
  { id: 'f_46', text: 'the group entered 46 separate forward contracts across four currencies last year', key: '46', kind: 'constraint' as const },
  { id: 'f_opposite', text: 'the German and Japanese subsidiaries were on opposite sides of the euro on eleven occasions, each paying its own spread', key: 'opposite sides', kind: 'constraint' as const },
  { id: 'f_nocash', text: 'no subsidiary has access to the group consolidated cash position', key: 'consolidated cash', kind: 'constraint' as const },
  { id: 'f_ned', text: 'a non-executive director objects that this adds a cost centre and that subsidiaries know their customers better', key: 'cost centre', kind: 'entity' as const },
  { id: 'f_three', text: 'the proposed function would be staffed by three people in Stockholm', key: 'three people', kind: 'entity' as const },
];

const E1A_RUBRIC: NarrativeRubric = {
  mode: 'narrative',
  requirement_parts: ['whether it can be justified', 'on what basis', 'how much authority stays local'],
  scenario_facts: E1A_FACTS,
  total_marks: 7,
  bands: [{ min: 0, label: 'fail' }, { min: 0.5, label: 'pass' }, { min: 0.7, label: 'good' }, { min: 0.85, label: 'excellent' }],
  criteria: [
    {
      id: 'c_netting',
      requirement_part: 'on what basis',
      lo: 'E1a',
      required_point:
        'Identifies NETTING and matching as the concrete saving available to this group — the ' +
        'German and Japanese subsidiaries were on opposite sides of the euro and each paid its own ' +
        'spread, so those exposures could have been offset internally at no bank cost. Ties the ' +
        'saving to the group\'s own contract volume rather than asserting it generically.',
      marks: 2,
      anchor_facts: ['f_opposite', 'f_46'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_cash',
      requirement_part: 'on what basis',
      lo: 'E1a',
      required_point:
        'Identifies the LIQUIDITY contribution — pooling and investing the group\'s cash centrally, ' +
        'which no subsidiary can do today because none has access to the consolidated position. ' +
        'States this as income earned or borrowing cost avoided, not as better information.',
      marks: 2,
      anchor_facts: ['f_nocash'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_answer_ned',
      requirement_part: 'whether it can be justified',
      lo: 'E1a',
      required_point:
        'ANSWERS the non-executive director on their own terms: the test is whether the function ' +
        'maximises income or saves cost by more than the three staff cost, not whether it adds a ' +
        'department. Engages with the objection rather than ignoring it or merely restating it.',
      marks: 2,
      anchor_facts: ['f_ned', 'f_three'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_authority',
      requirement_part: 'how much authority stays local',
      lo: 'E1a',
      required_point:
        'Commits to a position on the DIVISION OF AUTHORITY — which decisions move to Stockholm ' +
        'and which stay with the subsidiaries — rather than treating centralisation as all or ' +
        'nothing. Concedes the director\'s point about customer knowledge where it is valid.',
      marks: 1,
      anchor_facts: ['f_ned'],
      disqualifiers: ['F4'],
      development_required: true,
    },
  ],
};

const E1A_GOOD =
  'The function can be justified, but only on the basis the chief executive has been asked for — ' +
  'income maximised or cost saved — and not on the basis that a group of this size ought to have ' +
  'a treasury department.\n\n' +
  'The clearest saving available to Lindqvist is netting. The group entered 46 separate forward ' +
  'contracts across four currencies last year, and on eleven occasions the German and Japanese ' +
  'subsidiaries were on opposite sides of the euro, each paying its own bank spread on a position ' +
  'the other one held in reverse. Those exposures cancel inside the group. A central function ' +
  'sees both sides and can offset them internally, so the group pays a spread only on the residual ' +
  'rather than on each gross position. That is not a theoretical benefit: it is a specific, ' +
  'countable set of contracts that need not have been written at all.\n\n' +
  'The second contribution is liquidity. No subsidiary today has access to the group\'s ' +
  'consolidated cash position, so each manages its own balance in isolation — which means the ' +
  'group can be borrowing in one subsidiary and holding surplus cash in another on the same day, ' +
  'paying a borrowing margin for the privilege. A central function pools those balances and ' +
  'invests the net surplus, so the contribution shows up as interest earned and borrowing cost ' +
  'avoided.\n\n' +
  'That is the answer to the non-executive director, and it is worth meeting the objection ' +
  'directly rather than around it. He is right that the proposal adds a cost centre: three people ' +
  'in Stockholm are a real and permanent cost. The question is not whether that cost exists but ' +
  'whether the netting saving and the pooling income exceed it, and the group\'s own contract ' +
  'volume is what settles that — this is a group writing dozens of hedges a year in four ' +
  'currencies, not a handful. If the board cannot show that the saving covers the three salaries, ' +
  'the function should not be built, and the honest answer to the chief executive is that the ' +
  'case rests on that arithmetic rather than on principle.\n\n' +
  'On authority, the director\'s other point is also partly right and should be conceded. The ' +
  'subsidiaries do understand their own customers, and nothing in this proposal requires ' +
  'Stockholm to take over pricing or credit terms. I recommend that the board should centralise ' +
  'the hedging execution, the netting and the cash pooling, because those are the activities where ' +
  'seeing the whole group is the entire source of the benefit, and should leave commercial terms, ' +
  'invoicing currency and customer relationships with the subsidiaries, because seeing the whole ' +
  'group confers no advantage there. Centralisation is a decision about which activities, not a ' +
  'decision about whether.';

// The golden BAD — never served. Designed to raise F1 (restates the exhibit), F5 (anchor facts
// unused) and F4 (no committed verdict). Deliberately contains no `hasConclusion` marker.
const E1A_BAD =
  'The chief executive has proposed establishing a central group treasury function in Stockholm, ' +
  'to be staffed by three people, which would take over all hedging decisions from the ' +
  'subsidiaries. One non-executive director has objected that this adds a head office department ' +
  'and a cost centre to a group that is already profitable.\n\n' +
  'A treasury department carries out a number of functions within a company. These include cash ' +
  'management, liquidity management, funding and capital structure, investment of surplus funds, ' +
  'and the management of financial risk including foreign exchange risk and interest rate risk. ' +
  'Treasury departments may be organised on a centralised or a decentralised basis.\n\n' +
  'Centralisation has a number of advantages. These include economies of scale, greater expertise, ' +
  'better control and the ability to net off exposures. Decentralisation also has advantages. ' +
  'These include greater local knowledge, faster decision making and improved motivation of local ' +
  'management, who may resent losing control over their own affairs.\n\n' +
  'There are therefore arguments on both sides of this question. Much depends on the size of the ' +
  'company, the number of currencies involved, the degree of trust between head office and the ' +
  'subsidiaries, and the culture of the organisation. These are matters that will need to be ' +
  'weighed carefully in the light of the particular circumstances that apply here.';

const SPEC: AfmCaseSpec = {
  frame: {
    id: 'ac000000-0000-4000-8000-00000000e201',
    section: 'B',
    anchor_area: 'E2',
    title: 'Lindqvist Instruments AB',
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
      calc: { paper: 'AFM', lo: 'E2b', inputs: FXH_INPUTS },
      prose: {
        question:
          '(i) Calculate the Swedish kronor receipt Lindqvist would secure under a forward hedge ' +
          'and under a money-market hedge, and recommend which method the board should use. ' +
          '(13 marks)',
        // States NO figure — the calculator owns every number, and GATE 19 checks that the
        // recommended method and the stated margin match what it computed.
        advice:
          'The board should use whichever method the comparison shows to be better, and should ' +
          'understand why the two differ before treating that result as general. The forward is a ' +
          'single price quoted by a bank; the money-market hedge is built from four separate ' +
          'interest rates and a spot rate, and it locks the receipt by borrowing today against the ' +
          'dollars that will arrive. The gap between them exists because the bank\'s forward quote ' +
          'and Lindqvist\'s own borrowing and deposit rates do not sit in exact interest-rate ' +
          'parity — the bank prices its spread into the forward, and Lindqvist pays a borrowing ' +
          'margin on the other route. The margin between the two methods is therefore a function ' +
          'of the rates available to this company on this day, and it is not a standing preference ' +
          'for one instrument: the board should re-run the comparison for each material exposure ' +
          'rather than adopting the winner here as policy.',
        // NOTE for future edits: GATE 26 reads this prose for a method name sitting in a
        // recommendation-position sentence and fails the case if it is not the method the
        // calculator selected. Keep the misconception framed around FAILING TO COMPARE rather
        // than around preferring a named instrument — which is also the truer lesson, since which
        // method wins depends entirely on the rates of the day.
        misconception:
          'treating one hedge as the default because it is the simpler instrument, instead of ' +
          'pricing both',
        symptom:
          'candidates price the simpler hedge correctly, describe the alternative in words, and ' +
          'stop there — so the comparison the requirement actually asks for is never made, and ' +
          'the choice is settled by convenience rather than by the numbers.',
        fix:
          'The fix is to build the money-market hedge as a set of actual transactions rather than ' +
          'as a description. For a RECEIPT, borrow the foreign currency now in an amount that ' +
          'will grow to exactly the receipt by settlement, convert the borrowed sum at today\'s ' +
          'spot rate, and deposit the proceeds at home for the period — the matured home deposit ' +
          'is the hedged receipt, and the incoming foreign currency repays the foreign loan. Note ' +
          'the direction: a receipt borrows foreign and deposits home; a payment does the ' +
          'opposite. Only when both figures exist can the comparison be made, and the ' +
          'recommendation must name the method that actually wins and the amount by which it wins.',
        hint_lead:
          'A description of the money-market hedge earns nothing — the marks are in the four ' +
          'transactions that make it up.',
        hint_method:
          'For this receipt: borrow dollars now so that the loan plus interest equals the receipt ' +
          'at settlement, convert at spot, deposit the kronor for six months, and compare the ' +
          'matured kronor deposit with what the forward rate would have secured. Remember to ' +
          'prorate the annual interest rates to the six-month period, and to use the borrowing ' +
          'rate on the currency you borrow and the deposit rate on the currency you deposit.',
      },
    },
  ],
  narrative: [
    {
      requirement_order: 2,
      lo: 'E1a',
      marks: 7,
      ps_tags: ['commercial_acumen', 'analysis_and_evaluation'],
      intellectual_level: 3,
      question:
        '(ii) Advise the board whether a central group treasury function can be justified for ' +
        'Lindqvist, on what basis, and how much authority should remain with the subsidiaries. ' +
        '(7 marks)',
      rubric: E1A_RUBRIC,
      golden_good: E1A_GOOD,
      golden_bad: E1A_BAD,
      misconception:
        'describing what a treasury department does instead of advising whether this group should build one',
      symptom:
        'candidates list the advantages and disadvantages of centralisation and leave the board to ' +
        'decide.',
      fix:
        'The fix is to answer the chief executive\'s actual test — can the function maximise ' +
        'income or save cost — using this group\'s own numbers. The netting opportunity is ' +
        'countable from the contracts already written; the pooling benefit follows from no ' +
        'subsidiary having sight of the consolidated cash position. Then meet the non-executive ' +
        'director\'s objection directly, and separate which activities move to Stockholm from ' +
        'which stay local, rather than treating centralisation as all or nothing.',
      hint_lead:
        'A list of the advantages and disadvantages of centralisation earns very little here.',
      hint_method:
        'The marks are in a contribution this group can actually bank: what the netting of ' +
        'offsetting positions saves, and what pooling cash the subsidiaries cannot see would earn ' +
        'or avoid. Weigh that against the cost of the proposed staff, answer the non-executive ' +
        'director on his own terms, and commit to where the boundary of authority should sit.',
    },
  ],
};

export default SPEC;
