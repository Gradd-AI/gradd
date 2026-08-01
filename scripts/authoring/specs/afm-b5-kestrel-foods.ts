// scripts/authoring/specs/afm-b5-kestrel-foods.ts
//
// AFM PRACTICE CASE — Section B, 25 marks (20 technical + 5 professional skills).
// NUMERIC-LED, per the 2026-08-01 ruling: a B5b international-NPV requirement carries the case,
// with one narrative requirement so both engines are exercised.
//
//   (i)  B5b  13 marks  calculate  — international NPV in GBP, with the double-tax branch
//   (ii) E2a   7 marks  evaluate   — the FX exposures the investment creates, and their management
//
// WHY THIS SHAPE:
//   • B5b sits INSIDE the family-gate union and pulls all four INTL gates (parity-consistency,
//     currency-scale, double-tax-cap, tax-prose) on top of the base barrier.
//   • The tax branch is deliberately NOT the one Mock 1 uses. Rule 22 has three branches:
//     (a) nil because the host corporate rate already exceeds the home rate; (b) nil because the
//     CREDITABLE withholding covers the residual differential; (c) an additional home charge.
//     Mock 1's B5b is (a) — Brazil 34% against France 25%. This case is (b): Mexico 20% is BELOW
//     the UK's 25%, leaving a 5% residual, which the creditable 10% withholding then covers, so
//     the additional home tax nets to nil by a DIFFERENT route.
//
//     WORTH KNOWING, and verified against the built model answer rather than assumed: this was
//     specified expecting branch (c), and the calculator produced (b). Reaching (c) needs the
//     withholding to be SMALLER than the residual differential (or non-creditable), which the
//     realistic UK–Mexico treaty numbers do not give. Branch (c) therefore remains unexercised by
//     any live AFM row — recorded as an observation, not contorted into this case by bending the
//     tax facts to hit it.
//   • E2a puts syllabus section E in the case, so the published library reaches both B and E from
//     its first case and the corpus invariant passes without an override.
//
// EVERY FIGURE IN THE MODEL ANSWER IS CODE-OWNED. This file supplies inputs and prose only; the
// path builds model_answer, answer_schema, hint and full_reveal. Nothing here is a computed
// figure, and the exhibits state every input the calculator consumes (enforced, not assumed).

import type { AfmCaseSpec } from '../../../lib/acca/case-authoring-spec';
import type { NarrativeRubric } from '../../../lib/acca/narrative-marker';

// ── The scenario ─────────────────────────────────────────────────────────────
const INTRO =
  'It is now 1 September 20X5. You are a financial adviser engaged by Kestrel Foods plc ' +
  '("Kestrel"), a UK-based chilled-foods group that reports in pounds sterling (GBP). Write a ' +
  'report to the board of Kestrel responding to its instructions in the requirements below, using ' +
  'the information in the exhibits provided. Professional marks will be awarded for the ' +
  'demonstration of skill in analysis and evaluation, scepticism and commercial acumen in your answer.';

const EXHIBITS = [
  {
    title: 'Company background',
    body:
      'Kestrel Foods plc (Kestrel) supplies chilled ready meals to supermarkets across the United ' +
      'Kingdom and Ireland from four plants, all of them in the UK. Its board is evaluating the ' +
      'group\'s first manufacturing investment outside Europe: a processing plant near Monterrey in ' +
      'Mexico, serving the northern Mexican retail market and, in time, the southern United States. ' +
      'Kestrel reports in pounds sterling; the Mexican operation would transact and be taxed in ' +
      'Mexican pesos (MXN). The board wants a sterling appraisal of the Monterrey plant and a view ' +
      'on the currency consequences of running it.',
  },
  {
    title: 'Exhibit 1 — Monterrey project data (in MXN)',
    body:
      'The Monterrey plant requires an upfront capital outlay of MXN 1200 million, paid at the ' +
      'start of the project, and would operate for 4 years before a planned review. In a normal ' +
      'year it is expected to generate profit before interest and tax (PBIT) of MXN 640 million, ' +
      'with depreciation of MXN 160 million, capital reinvestment of MXN 120 million and an ' +
      'increase in working capital of MXN 40 million. The MXN-denominated cash flows are expected ' +
      'to grow by 4.0% a year. The board has instructed that the project be appraised at a ' +
      'discount rate of 11.0%, which its advisers have derived for a food-processing venture of ' +
      'this business risk.',
  },
  {
    title: 'Exhibit 2 — Tax and treaty position',
    body:
      'The Mexican corporate tax rate applying to the plant\'s operating profits is 20%. Dividends ' +
      'remitted to the United Kingdom suffer Mexican withholding tax of 10%. The UK-Mexico treaty ' +
      'provides relief from double taxation: relief is given for the Mexican corporate tax of 20% ' +
      'suffered on those profits, credited against the UK corporate tax of 25% that would ' +
      'otherwise be due on the same profits and capped at that UK charge; the 10% Mexican ' +
      'withholding tax is deducted separately as the profits are remitted. Kestrel\'s tax adviser ' +
      'has confirmed that the group has sufficient UK taxable profits to absorb any residual charge. ' +
      'Kestrel\'s treasury manual records that the 11.0% project discount rate is a post-tax ' +
      'sterling rate constructed using the UK corporate tax rate of 25%, while the Monterrey ' +
      'plant\'s own operating profits are taxed in Mexico at the Mexican corporate rate of 20%.',
  },
  {
    title: 'Exhibit 3 — Exchange rates and inflation',
    body:
      'The current spot exchange rate is MXN 24.00 per GBP 1. Mexican inflation is expected to run ' +
      'at 5.0% and UK inflation at 2.5% over the horizon of the appraisal. Kestrel\'s treasury ' +
      'policy is to translate expected foreign cash flows at the forward rates implied by the ' +
      'inflation differential rather than at today\'s spot rate.',
  },
  {
    title: 'Exhibit 4 — The board\'s currency concern',
    body:
      'Kestrel has never held a foreign-currency operating asset. Its finance director has told the ' +
      'board that "once Monterrey is running we will have peso exposure, and we should simply take ' +
      'out forward contracts to remove it." A non-executive director, who spent her career in a ' +
      'multinational retailer, has replied that this treats three different problems as one, and ' +
      'that at least one of them cannot be hedged with a forward contract at all. She has also ' +
      'pointed out that the Monterrey plant will itself be a peso-denominated operating asset ' +
      'consolidated into Kestrel\'s sterling accounts each year, which is a different matter again ' +
      'from the cash the plant remits. The board has asked for the exposures to be separated and ' +
      'for advice on how each should be handled.',
  },
];

// ── (i) B5b — international NPV ──────────────────────────────────────────────
// Inputs only. Every figure below is STATED VERBATIM in the exhibits above; the
// exhibits-state-inputs gate proves it rather than trusting this comment.
const NPV_INPUTS = {
  home_currency: 'GBP',
  foreign_currency: 'MXN',
  base_spot: 24.00,
  basis: 'ppp' as const,
  rate_home: 2.5,
  rate_foreign: 5.0,
  discount_rate: 11.0,
  foreign_build: { pbit: 640, tax_rate: 20, depreciation: 160, capex: 120, delta_working_capital: 40 },
  foreign_growth: 4.0,
  years: 4,
  initial_outlay_foreign: 1200,
  withholding_rate: 10,
  home_tax_rate: 25,
  wht_creditable: true,
};

// ── (ii) E2a — FX exposure types and their management ────────────────────────
const E2A_FACTS = [
  { id: 'f_remit', text: 'Monterrey will remit peso profits to a sterling-reporting parent', key: 'remit', kind: 'constraint' as const },
  { id: 'f_asset', text: 'the plant is a peso-denominated operating asset consolidated into sterling accounts', key: 'consolidat', kind: 'constraint' as const },
  { id: 'f_us', text: 'the plant is intended to serve the southern United States in time', key: 'United States', kind: 'constraint' as const },
  { id: 'f_fd', text: 'the finance director proposes forward contracts to remove all peso exposure', key: 'forward', kind: 'entity' as const },
  { id: 'f_ned', text: 'the non-executive director says one exposure cannot be hedged with a forward at all', key: 'non-executive', kind: 'entity' as const },
];

const E2A_RUBRIC: NarrativeRubric = {
  mode: 'narrative',
  requirement_parts: ['separate the exposures', 'advise how each is managed'],
  scenario_facts: E2A_FACTS,
  total_marks: 7,
  bands: [{ min: 0, label: 'fail' }, { min: 0.5, label: 'pass' }, { min: 0.7, label: 'good' }, { min: 0.85, label: 'excellent' }],
  criteria: [
    {
      id: 'c_transaction',
      requirement_part: 'separate the exposures',
      lo: 'E2a',
      required_point:
        'Identifies TRANSACTION exposure on the peso remittances to the UK parent — a cash-flow ' +
        'exposure on a known future amount — and distinguishes it from the other two.',
      marks: 2,
      anchor_facts: ['f_remit'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_translation',
      requirement_part: 'separate the exposures',
      lo: 'E2a',
      required_point:
        'Identifies TRANSLATION exposure on consolidating the peso-denominated plant into sterling ' +
        'accounts, and states that it is an ACCOUNTING effect on reported figures rather than a ' +
        'cash flow — while naming a concrete reason it still matters (reported gearing, covenants).',
      marks: 2,
      anchor_facts: ['f_asset'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_economic',
      requirement_part: 'separate the exposures',
      lo: 'E2a',
      required_point:
        'Identifies ECONOMIC exposure — the effect of sustained real exchange-rate movement on the ' +
        'competitiveness and long-run value of the Monterrey operation, including its intended US ' +
        'sales — and states that it CANNOT be removed by a forward contract, which answers the ' +
        'non-executive director directly.',
      marks: 2,
      anchor_facts: ['f_us', 'f_ned'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_manage',
      requirement_part: 'advise how each is managed',
      lo: 'E2a',
      required_point:
        'Commits to a management approach that MATCHES each exposure to the right tool: forwards or ' +
        'money-market hedges for the transaction exposure; balance-sheet/matching decisions for ' +
        'translation; and operational responses (sourcing, pricing, plant location) for economic ' +
        'exposure. Takes a position on the finance director\'s "just take out forwards" proposal ' +
        'rather than restating both sides.',
      marks: 1,
      anchor_facts: ['f_fd'],
      disqualifiers: ['F4'],
      development_required: true,
    },
  ],
};

// The golden GOOD — becomes model_answer. Written to the standard Mock 1's narrative answers set.
const E2A_GOOD =
  'Kestrel faces three distinct currency exposures from Monterrey, and the finance director\'s ' +
  'proposal addresses only the first of them.\n\n' +
  'Transaction exposure arises on the peso profits Monterrey will remit to the UK parent. Each ' +
  'remittance is a known future amount in a foreign currency, so a movement in the peso between ' +
  'the decision and the settlement changes the sterling cash Kestrel actually receives. This is a ' +
  'cash-flow exposure and it is the one the finance director has in mind: it is properly managed ' +
  'with forward contracts or a money-market hedge, fixing the sterling value of each remittance as ' +
  'it is committed.\n\n' +
  'Translation exposure arises because the Monterrey plant is a peso-denominated asset that must be ' +
  'consolidated into sterling accounts. A weaker peso reduces the sterling carrying value of the ' +
  'plant and of its peso earnings without any cash changing hands. It is an accounting effect, and ' +
  'for that reason it warrants less hedging expenditure than transaction exposure — but it is not ' +
  'irrelevant: it moves reported gearing and can therefore tighten headroom under Kestrel\'s ' +
  'borrowing covenants, which is a real consequence for a group financing new capacity. The ' +
  'appropriate response is a balance-sheet one — matching peso assets with peso borrowing where ' +
  'that is available — not a rolling programme of forwards.\n\n' +
  'Economic exposure is the exposure the non-executive director means, and she is right that a ' +
  'forward contract cannot remove it. A sustained real appreciation of the peso raises Monterrey\'s ' +
  'cost base relative to competitors supplying the same shelves, and it directly undermines the ' +
  'plan to serve the southern United States, where Kestrel would be selling in dollars against ' +
  'local producers. No forward contract fixes a competitive position; the responses are ' +
  'operational — sourcing inputs in the currency of sale, pricing flexibility, and, in the limit, ' +
  'where future capacity is located.\n\n' +
  'I recommend that the board should hedge the remittances as they are committed, treat ' +
  'translation as a covenant-monitoring matter rather than a hedging one, and put economic ' +
  'exposure on its agenda as a strategic question about the Monterrey plant\'s competitive ' +
  'position. On balance the finance director\'s proposal should be adopted for the first exposure ' +
  'and explicitly rejected as a complete answer to the other two.';

// The golden BAD — stored under _authoring, NEVER served. Designed to trigger F1 (scenario copy),
// F5 (anchor facts unused) and F4 (no committed verdict): it opens by restating the exhibit, then
// runs generic textbook prose, then declines to take a position.
const E2A_BAD =
  'Kestrel has never held a foreign-currency operating asset. Its finance director has told the ' +
  'board that once Monterrey is running we will have peso exposure, and we should simply take out ' +
  'forward contracts to remove it. A non-executive director has replied that this treats three ' +
  'different problems as one.\n\n' +
  'There are three types of foreign exchange exposure: transaction exposure, translation exposure ' +
  'and economic exposure. Transaction exposure arises from transactions. Translation exposure ' +
  'arises from the translation of foreign items. Economic exposure is a broader and longer-term ' +
  'type of exposure which affects the business economically.\n\n' +
  'Companies use a variety of techniques to manage foreign exchange risk. These include forward ' +
  'contracts, futures, options and money-market hedges. Internal techniques such as netting and ' +
  'matching are also available. Each has advantages and disadvantages and the choice depends on ' +
  'the circumstances of the company and its attitude to risk.\n\n' +
  'There are arguments on both sides. On one hand hedging reduces volatility and aids planning. On ' +
  'the other hand hedging costs money and removes any upside. The board will need to weigh these ' +
  'considerations carefully against the company\'s circumstances and its risk appetite before ' +
  'deciding how best to proceed.';

const SPEC: AfmCaseSpec = {
  frame: {
    // Deterministic id in the AFM practice-case range (ac… ), distinct from the mock ids (aa…).
    id: 'ac000000-0000-4000-8000-00000000b501',
    section: 'B',
    anchor_area: 'B5',
    title: 'Kestrel Foods plc',
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
      calc: { lo: 'B5b', inputs: NPV_INPUTS },
      prose: {
        question:
          '(i) Calculate the net present value of the Monterrey project in sterling, and advise the ' +
          'board whether, on financial grounds, the project should proceed. (13 marks)',
        // Step-5 board advice. Deliberately states NO figure: every number in the model answer is
        // the calculator's, and prose that restates one is prose that can drift from it.
        advice:
          'The project is worth doing on these assumptions, but the board should be clear about ' +
          'how thin the margin is and where it comes from. The whole return depends on a peso that ' +
          'weakens broadly in line with the inflation differential; the appraisal translates every ' +
          'year at the parity-implied rate rather than at today\'s spot, and a peso that holds up ' +
          'better than parity implies would cut the sterling value of each remittance. The board ' +
          'should therefore ask for the appraisal to be re-run on a stronger-peso path before ' +
          'committing, and should note that the fiscal position is favourable only because the ' +
          'Mexican withholding tax is creditable in the UK — if that treatment changed, the ' +
          'remittances would carry an additional UK charge and the margin would narrow further. ' +
          'On balance, proceed, with the currency assumption re-tested and the treaty position ' +
          'confirmed in writing before the capital is committed.',
        misconception:
          'discounting foreign-currency cash flows at the home-currency rate',
        symptom:
          'candidates leave the peso cash flows untranslated, or convert every year at today\'s ' +
          'spot rate, so the cash flows and the discount rate sit on different bases.',
        fix:
          'The fix is consistency, then the tax branch. Translate each year\'s remittance at the ' +
          'PPP-implied forward rate so the sterling cash flows and the sterling discount rate are ' +
          'on the same basis. Then work the double-tax treatment through in full rather than ' +
          'stopping at the first comparison: the Mexican corporate rate of 20% is BELOW the UK\'s ' +
          '25%, so unlike the more familiar case there IS a residual differential of 5% — but the ' +
          'creditable 10% withholding covers that residual, so the additional UK tax still nets to ' +
          'nil. A candidate who compares only the two corporate rates concludes that additional UK ' +
          'tax is payable and overstates the tax charge; a candidate who assumes "host rate lower, ' +
          'therefore tax due" without testing the credit makes the same error. The withholding is ' +
          'deducted from each remittance in either case. Only then discount.',
        hint_lead:
          'Work in pesos first, then translate — and do not reach for today\'s spot rate for every year.',
        hint_method:
          'Build the project\'s free cash flow in pesos and tax it at the Mexican rate; translate ' +
          'each year at the forward rate implied by the inflation differential; then apply the ' +
          'treaty rule, checking carefully which way round the two corporate rates sit before ' +
          'deciding whether any additional UK tax arises.',
      },
    },
  ],
  narrative: [
    {
      requirement_order: 2,
      lo: 'E2a',
      marks: 7,
      ps_tags: ['scepticism', 'commercial_acumen'],
      intellectual_level: 3,
      question:
        '(ii) Evaluate the foreign-exchange exposures the Monterrey investment creates for Kestrel, ' +
        'and advise the board how each should be managed. (7 marks)',
      rubric: E2A_RUBRIC,
      golden_good: E2A_GOOD,
      golden_bad: E2A_BAD,
      misconception:
        'treating "foreign exchange exposure" as one problem with one tool',
      symptom:
        'candidates name the three exposures and then propose forward contracts for all of them.',
      fix:
        'The fix is to separate the three and match each to the response it actually admits: ' +
        'forwards or a money-market hedge for the transaction exposure on remittances; a ' +
        'balance-sheet response for translation, which is an accounting effect that still moves ' +
        'reported gearing and covenant headroom; and operational responses for economic exposure, ' +
        'which no forward contract can remove.',
      hint_lead:
        'Naming the three exposures earns very little on its own.',
      hint_method:
        'The marks are in distinguishing them — which is a cash-flow risk and which is only an ' +
        'accounting effect — and in matching each to a response that fits it. Answer the ' +
        'non-executive director directly: say which exposure cannot be hedged with a forward, and ' +
        'commit to a position on the finance director\'s proposal.',
    },
  ],
};

export default SPEC;
