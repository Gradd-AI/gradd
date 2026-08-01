// scripts/authoring/specs/afm-b4-tamesis-diagnostics.ts
//
// AFM PRACTICE CASE 4 — Section B, 25 marks (20 technical + 5 professional skills).
//
//   (i)  B4a  13 marks  calculate  — free cash flow to firm valuation of an acquisition target,
//                                    equity value, and a verdict on the vendor's asking price
//   (ii) B4d   7 marks  evaluate   — what an option-based (BSOP) view would add, and the
//                                    limitations of BOTH valuations as a basis for the offer
//
// WHY THIS SHAPE:
//   • B4a is the business-valuation arm of the family-gate union (`lib/acca/valuation.ts`). The
//     code owns the offer comparison itself — the accept/reject inequality is a computed verdict,
//     not prose — so GATE 26 is live on the recommendation.
//   • The narrative is B4d and is tagged SCEPTICISM, on the same basis as the published `d413fbe7`:
//     the marks are in CHALLENGING the assumptions of a model the candidate has just applied. Here
//     it is sharper than a standalone limitations question, because the candidate produced the
//     perpetuity valuation in (i) and is then asked what it conceals — a single growth rate carried
//     to infinity, a WACC held constant, and a target whose value is mostly in a pipeline that may
//     never reach market.
//   • The pairing is deliberate: (i) produces a precise-looking number, (ii) asks how much weight
//     it can carry. A candidate cannot be sceptical about a valuation they were not made to build.
//
// EVERY FIGURE IN THE MODEL ANSWER IS CODE-OWNED. This file supplies inputs and prose only.

import type { AfmCaseSpec } from '../../../lib/acca/case-authoring-spec';
import type { NarrativeRubric } from '../../../lib/acca/narrative-marker';

// ── The scenario ─────────────────────────────────────────────────────────────
const INTRO =
  'It is now 1 December 20X5. You are a financial adviser to the board of Tamesis Diagnostics plc ' +
  '("Tamesis"), a UK-listed medical diagnostics group that reports in pounds sterling (GBP). Write ' +
  'a report to the board of Tamesis responding to its instructions in the requirements below, ' +
  'using the information in the exhibits provided. Professional marks will be awarded for the ' +
  'demonstration of skill in analysis and evaluation and scepticism in your answer.';

const EXHIBITS = [
  {
    title: 'Company background',
    body:
      'Tamesis Diagnostics plc (Tamesis) develops and manufactures laboratory diagnostic systems ' +
      'and is listed in London. The board is considering the acquisition of the entire share ' +
      'capital of Wrenfield Bioscience Limited (Wrenfield), a privately held developer of ' +
      'molecular diagnostic assays. Wrenfield has two assays approved and generating revenue, and ' +
      'a development pipeline of four further assays at varying stages of regulatory review. ' +
      'Tamesis reports in pounds sterling and would fund the acquisition from existing facilities.',
  },
  {
    title: 'Exhibit 1 — Wrenfield trading and cash flow data',
    body:
      'Wrenfield\'s most recent audited results show profit before interest and tax of GBP 46 ' +
      'million. The corporation tax rate applicable to Wrenfield is 25%. In the same year the ' +
      'depreciation charge was GBP 12 million, capital reinvestment was GBP 15 million, and the ' +
      'increase in working capital was GBP 4 million. Wrenfield\'s directors expect free cash ' +
      'flows to grow at 3.0% a year in perpetuity from the year just ended.',
  },
  {
    title: 'Exhibit 2 — Cost of capital and capital structure',
    body:
      'Tamesis\'s advisers have derived a weighted average cost of capital of 9.5% for a molecular ' +
      'diagnostics business of Wrenfield\'s business risk, and the board has instructed that this ' +
      'rate be used for the valuation. The market value of Wrenfield\'s debt is GBP 90 million. ' +
      'In deriving the weighted average cost of capital the advisers estimated the market value ' +
      'of Wrenfield\'s equity at GBP 300 million.',
  },
  {
    title: 'Exhibit 3 — The vendor\'s asking price',
    body:
      'Wrenfield\'s shareholders have indicated that they will accept an offer of GBP 520 million ' +
      'for the entire share capital. They have declined to reduce that figure, and have stated ' +
      'that it reflects "the value of the pipeline, which the historic cash flows do not capture".',
  },
  {
    title: 'Exhibit 4 — The pipeline and the growth assumption',
    body:
      'Of Wrenfield\'s four pipeline assays, two are in regulatory review and two remain at ' +
      'pre-submission stage. Wrenfield\'s directors have confirmed that none of the four is ' +
      'reflected in the audited cash flows, and that the 3.0% perpetual growth rate was chosen as ' +
      '"a prudent long-run figure for the diagnostics sector" rather than being built up from the ' +
      'pipeline itself. The two approved assays are protected by patents expiring in nine and ' +
      'eleven years respectively. Tamesis\'s head of research has advised the board that, in her ' +
      'experience, roughly one pre-submission assay in three reaches market.',
  },
  {
    title: 'Exhibit 5 — The board\'s question',
    body:
      'The chair has asked for a valuation of Wrenfield\'s equity and a view on whether the asking ' +
      'price should be accepted. She has separately noted that a colleague on another board has ' +
      'suggested valuing the pipeline "as a portfolio of real options rather than as a growth ' +
      'rate", and has asked what that approach would add and what it would not settle.',
  },
];

// ── (i) B4a — FCFF valuation and the offer verdict ───────────────────────────
// Inputs only; every figure appears verbatim in Exhibits 1-3 (enforced by the recoverability gate).
const FCFF_INPUTS = {
  pbit: 46,
  tax_rate: 0.25,
  depreciation: 12,
  capex: 15,
  delta_working_capital: 4,
  wacc: 0.095,
  growth_rate: 0.030,
  debt_value: 90,
  offer_price: 520,
};

// ── (ii) B4d — what an option view adds, and what neither valuation settles ──
const B4D_FACTS = [
  { id: 'f_notinflows', text: 'none of the four pipeline assays is reflected in the audited cash flows', key: 'pipeline', kind: 'constraint' as const },
  { id: 'f_growthchosen', text: 'the 3.0% perpetual growth rate was chosen as a prudent sector figure, not built up from the pipeline', key: 'prudent', kind: 'constraint' as const },
  { id: 'f_patents', text: 'the two approved assays are protected by patents expiring in nine and eleven years', key: 'patents', kind: 'constraint' as const },
  { id: 'f_onethird', text: 'roughly one pre-submission assay in three reaches market', key: 'one pre-submission assay in three', kind: 'constraint' as const },
  // key must appear VERBATIM in the scenario — Exhibit 3 says "do not capture", not "does not".
  { id: 'f_vendor', text: 'the vendor says the price reflects pipeline value the historic cash flows do not capture', key: 'do not capture', kind: 'entity' as const },
];

const B4D_RUBRIC: NarrativeRubric = {
  mode: 'narrative',
  requirement_parts: ['what an option view adds', 'what neither valuation settles', 'advise the board'],
  scenario_facts: B4D_FACTS,
  total_marks: 7,
  bands: [{ min: 0, label: 'fail' }, { min: 0.5, label: 'pass' }, { min: 0.7, label: 'good' }, { min: 0.85, label: 'excellent' }],
  criteria: [
    {
      id: 'c_option',
      requirement_part: 'what an option view adds',
      lo: 'B4d',
      required_point:
        'Explains WHY the pipeline has option characteristics — Tamesis is not obliged to fund a ' +
        'pre-submission assay to market and can abandon it on a failed review, so the payoff is ' +
        'asymmetric — and that a discounted-cash-flow perpetuity cannot capture that asymmetry ' +
        'because it values a single expected path. Connects this to the vendor\'s own claim.',
      marks: 2,
      anchor_facts: ['f_notinflows', 'f_vendor'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_growth',
      requirement_part: 'what neither valuation settles',
      lo: 'B4d',
      required_point:
        'CHALLENGES the growth assumption directly: 3.0% was chosen as a prudent sector figure ' +
        'rather than derived from the pipeline, yet in a perpetuity model it carries an ' +
        'unbounded stream — so the valuation is highly sensitive to a number nobody built. Notes ' +
        'that patents expiring in nine and eleven years make perpetual growth on the CURRENT ' +
        'products actively implausible.',
      marks: 2,
      anchor_facts: ['f_growthchosen', 'f_patents'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_bsoplimits',
      requirement_part: 'what neither valuation settles',
      lo: 'B4d',
      required_point:
        'CHALLENGES the option approach on its own terms: BSOP needs an underlying asset value and ' +
        'a volatility, and for an unlisted pipeline neither is observable — both would be ' +
        'estimated, so the apparent precision is borrowed. The one-in-three success rate is a ' +
        'small-sample judgement, not a measured probability distribution.',
      marks: 2,
      anchor_facts: ['f_onethird'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_advise',
      requirement_part: 'advise the board',
      lo: 'B4d',
      required_point:
        'Commits to a position on the asking price given both valuations and their weaknesses, ' +
        'rather than listing considerations. Says what the board should do next in concrete ' +
        'terms — e.g. what evidence would change the answer.',
      marks: 1,
      anchor_facts: ['f_vendor'],
      disqualifiers: ['F4'],
      development_required: true,
    },
  ],
};

const B4D_GOOD =
  'The vendors say the asking price reflects value the historic cash flows do not capture, and on ' +
  'that narrow point they are right — but it does not follow that the price is justified.\n\n' +
  'An option view adds something the perpetuity genuinely cannot. None of the four pipeline assays ' +
  'is reflected in Wrenfield\'s audited cash flows, and Tamesis would not be obliged to fund any ' +
  'of them to market: it can spend on the next regulatory stage and stop if the review fails. ' +
  'That makes each pipeline asset a call option — a limited cost now for the right, not the ' +
  'obligation, to invest more later — and the payoff is asymmetric, with the downside capped at ' +
  'the money spent and the upside open. A discounted-cash-flow model values a single expected ' +
  'path and averages that asymmetry away, so it will systematically undervalue a portfolio of ' +
  'early-stage assets. That is the real content of the vendors\' claim.\n\n' +
  'What neither valuation settles, though, is the growth assumption, and this is where the ' +
  'perpetuity is weakest. The 3.0% rate was chosen as a prudent long-run figure for the sector ' +
  'rather than built up from anything Wrenfield actually owns. In a perpetuity that number does ' +
  'not merely nudge the answer — it carries an unbounded stream, and the valuation moves sharply ' +
  'with a figure nobody derived. Worse, it is applied to products whose patents expire in nine ' +
  'and eleven years. Perpetual growth on cash flows that lose their protection inside a decade is ' +
  'not prudent; it is optimistic, and the direction of the error is not conservative.\n\n' +
  'The option approach is not a way out of that, because it has the same problem in a different ' +
  'place. A Black-Scholes valuation needs the value of the underlying asset and its volatility, ' +
  'and for an unlisted pipeline neither is observable — both would have to be estimated, so the ' +
  'precision the model appears to deliver is borrowed from inputs that are themselves judgements. ' +
  'The head of research\'s view that roughly one pre-submission assay in three reaches market is ' +
  'useful experience, but it is a small-sample judgement about a handful of programmes, not a ' +
  'measured distribution, and feeding it into an option model does not make it one.\n\n' +
  'I therefore advise the board that the asking price should not be accepted on the evidence ' +
  'currently before it. The discounted-cash-flow figure understates the pipeline and the vendors ' +
  'are entitled to say so, but the gap to their price is being bridged by assumptions the vendors ' +
  'chose and Tamesis has not tested. What would change my answer is specific: a per-assay ' +
  'valuation of the four pipeline programmes, with the stage-by-stage cost of taking each to ' +
  'market and Tamesis\'s own view of its probability of approval, and a re-run of the ' +
  'discounted-cash-flow valuation on a finite horizon reflecting patent expiry rather than a ' +
  'perpetuity. If that work supports the price, the board can pay it knowing why. On balance the ' +
  'board should commission that analysis before making any offer at this level.';

// The golden BAD — never served. Raises F1 (restates exhibits), F5 (anchor facts unused) and
// F4 (no committed verdict). Contains no `hasConclusion` marker by construction.
const B4D_BAD =
  'The board is considering the acquisition of the entire share capital of Wrenfield Bioscience ' +
  'Limited, a privately held developer of molecular diagnostic assays. Wrenfield has two assays ' +
  'approved and generating revenue, and a development pipeline of four further assays at varying ' +
  'stages of regulatory review.\n\n' +
  'The Black-Scholes option pricing model can be used to value real options as well as financial ' +
  'options. The five inputs to the model are the value of the underlying asset, the exercise ' +
  'price, the time to expiry, the risk-free rate and the volatility of the underlying asset. Real ' +
  'options include the option to delay, the option to expand, the option to abandon and the ' +
  'option to redeploy.\n\n' +
  'The model has a number of limitations. It assumes that volatility is constant over the life of ' +
  'the option, that the underlying asset follows a lognormal distribution, that trading is ' +
  'continuous, and that the option is European and can only be exercised at expiry. These ' +
  'assumptions may not hold in practice for real options.\n\n' +
  'Discounted cash flow methods also have limitations. They are sensitive to the assumptions used, ' +
  'particularly the discount rate and the growth rate. Different assumptions can produce very ' +
  'different valuations. Both methods therefore have strengths and weaknesses and produce ' +
  'different figures, and there are a number of matters that will require careful attention here.';

const SPEC: AfmCaseSpec = {
  frame: {
    id: 'ac000000-0000-4000-8000-00000000b401',
    section: 'B',
    anchor_area: 'B4',
    title: 'Tamesis Diagnostics plc',
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
      calc: {
        lo: 'B4a',
        inputs: FCFF_INPUTS,
        currency: 'GBP',
        debt_value: 90,
        // ABSOLUTE equity value in GBPm — the ESTIMATED equity used to weight the WACC, which is
        // what `divergentEquity` compares the DCF equity against. It is NOT the equity fraction;
        // passing 0.75 here makes VAL-11b fire, correctly, because a DCF equity of a few hundred
        // million "diverges" from 0.75 by every measure.
        equity_weight: 300,
      },
      // NAMED, never silent. These three inputs ARE in the exhibits, as percentages, which is how
      // a real paper states them. `FcffInputs` takes decimal fractions, so the literal string the
      // recoverability gate looks for is absent — a units convention of this calculator family,
      // not a fact the candidate cannot recover. (Kestrel's B5b family takes percentages directly,
      // which is why it needed no exemption.)
      exhibit_exempt: {
        tax_rate: 'Exhibit 1 states "The corporation tax rate applicable to Wrenfield is 25%"; FcffInputs takes the decimal fraction 0.25.',
        wacc: 'Exhibit 2 states "a weighted average cost of capital of 9.5%"; FcffInputs takes 0.095.',
        growth_rate: 'Exhibit 1 states "grow at 3.0% a year in perpetuity"; FcffInputs takes 0.030.',
      },
      prose: {
        question:
          '(i) Calculate the value of Wrenfield\'s equity using the free cash flow to firm ' +
          'method, and advise the board whether the shareholders\' asking price should be ' +
          'accepted on that basis. (13 marks)',
        // States NO figure — the calculator owns the valuation AND the offer inequality.
        advice:
          'On this method the asking price is not supported, and the board should be clear about ' +
          'what that does and does not mean. The valuation rests on one year of audited cash ' +
          'flows grown at a single rate for ever, discounted at a rate derived for the sector — ' +
          'so it is a statement about the business Wrenfield is today, extended indefinitely. It ' +
          'is not a statement about the pipeline, which by the directors\' own confirmation ' +
          'contributes nothing to the cash flows being capitalised. The gap between this figure ' +
          'and the asking price is therefore exactly the amount the vendors are asking Tamesis to ' +
          'pay for assets this method does not see. The board should treat that gap as the thing ' +
          'to investigate rather than as evidence that the vendors are wrong: the right next ' +
          'question is what the pipeline is worth on its own terms, and whether that value is ' +
          'anywhere near the difference.',
        misconception:
          'valuing the whole firm and then comparing the firm value with an equity asking price',
        symptom:
          'candidates compute free cash flow to the firm correctly, discount it at the weighted ' +
          'average cost of capital, and then set the resulting figure against the offer for the ' +
          'shares without deducting debt.',
        fix:
          'The fix is to keep the two levels straight throughout. Free cash flow to the FIRM is ' +
          'the cash available to all providers of capital, so discounting it at the weighted ' +
          'average cost of capital gives the value of the FIRM — enterprise value. The ' +
          'shareholders are being offered a price for the equity alone, so the market value of ' +
          'debt must be deducted before any comparison is made. Deduct it once and at the right ' +
          'point: subtracting debt from the cash flows as well as from the firm value ' +
          'double-counts it, and comparing an undeducted firm value with an equity price will ' +
          'always make an offer look cheap.',
        hint_lead:
          'The asking price is for the shares — check what your valuation is actually a value of ' +
          'before you compare the two.',
        hint_method:
          'Build free cash flow to the firm from operating profit: tax it, add back the non-cash ' +
          'charge, then deduct capital reinvestment and the increase in working capital. ' +
          'Capitalise that flow as a growing perpetuity at the given cost of capital, remembering ' +
          'to grow the first year\'s flow. Then deduct the market value of debt to reach the ' +
          'equity value, and only then compare with the offer.',
      },
    },
  ],
  narrative: [
    {
      requirement_order: 2,
      lo: 'B4d',
      marks: 7,
      ps_tags: ['scepticism', 'analysis_and_evaluation'],
      intellectual_level: 3,
      question:
        '(ii) Evaluate what an option-based valuation of Wrenfield\'s pipeline would add to your ' +
        'answer in (i), and advise the board what neither valuation settles about the asking ' +
        'price. (7 marks)',
      rubric: B4D_RUBRIC,
      golden_good: B4D_GOOD,
      golden_bad: B4D_BAD,
      misconception:
        'reciting the assumptions of the Black-Scholes model instead of testing the valuation in front of you',
      symptom:
        'candidates list the five inputs and the standard limitations of option pricing without ' +
        'touching the growth rate, the patent lives or the pipeline actually described.',
      fix:
        'The fix is to make every limitation bite on this company. Say why the pipeline is ' +
        'option-like — abandonment is possible, so the payoff is asymmetric and a perpetuity ' +
        'averages that away. Then challenge the growth rate, which was chosen rather than derived ' +
        'and is applied to products whose patents expire inside a decade. Then challenge the ' +
        'option route on the same standard: its asset value and volatility are unobservable for ' +
        'an unlisted pipeline, so its precision is borrowed. Then commit.',
      hint_lead:
        'Listing the five BSOP inputs and the usual limitations earns very little here.',
      hint_method:
        'The marks are in applying the scepticism to this valuation: what the 3.0% growth rate ' +
        'was actually based on, what patent expiry does to a perpetuity, and where an option ' +
        'model would get an asset value and a volatility for an unlisted pipeline. Then answer ' +
        'the chair — what the option view adds, and what it still does not settle.',
    },
  ],
};

export default SPEC;
