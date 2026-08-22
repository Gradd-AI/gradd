// scripts/authoring/specs/afm-a-castlereagh-utilities.ts
//
// AFM PRACTICE CASE 5 — SECTION A, 50 marks (40 technical + 10 professional skills).
// The only Section A case in the practice library, and the only one that can carry
// COMMUNICATION: gate C4 makes communication a Section-A-only professional skill, so a Section B
// case may not tag it at all.
//
//   (i)   B3e  12 marks  calculate  — project-specific discount rate for a regulated water
//                                     venture, ungeared from a listed proxy and regeared
//   (ii)  E3a  12 marks  calculate  — interest-rate futures hedge on the construction facility
//   (iii) B3i  10 marks  evaluate   — whether the financing structure the CFO proposes is sound
//   (iv)  A3a   6 marks  communicate — a briefing note for the non-financial board members
//
// WHY THIS SHAPE:
//   • C1 requires a Section A case to span ≥2 syllabus sections. This one spans B and E through
//     its two calculators, so the span is structural rather than decorative.
//   • C4 requires a Section A case to examine ALL FOUR professional skills. They are distributed
//     to the requirements that genuinely demand them, not sprinkled to satisfy the gate:
//     analysis_and_evaluation on both calculations, scepticism on (iii) where the CFO's proposal
//     is challenged, commercial_acumen on (iii) where a viable alternative must be proposed, and
//     communication on (iv), which is explicitly a briefing for a non-financial audience.
//   • The two calculators are B3e and E3a — the last two unused arms of the family-gate union.
//     With Kestrel (B5b), Halvard (B1a), Lindqvist (E2b) and Tamesis (B4a), all six arms are
//     exercised across the five-case library and none is used twice.
//
// EVERY FIGURE IN THE MODEL ANSWER IS CODE-OWNED. This file supplies inputs and prose only.

import type { AfmCaseSpec } from '../../../lib/acca/case-authoring-spec';
import type { NarrativeRubric } from '../../../lib/acca/narrative-marker';

const INTRO =
  'It is now 1 February 20X6. You are a financial adviser engaged by Castlereagh Utilities plc ' +
  '("Castlereagh"), a UK-listed infrastructure group that reports in pounds sterling (GBP). Write ' +
  'a report to the board of Castlereagh responding to its instructions in the requirements below, ' +
  'using the information in the exhibits provided. Professional marks will be awarded for the ' +
  'demonstration of skill in communication, analysis and evaluation, scepticism and commercial ' +
  'acumen in your answer.';

const EXHIBITS = [
  {
    title: 'Company background',
    body:
      'Castlereagh Utilities plc (Castlereagh) owns and operates electricity distribution networks ' +
      'in the United Kingdom. The board has been invited to bid for a 25-year concession to build ' +
      'and operate a regulated water treatment network — the Brackwater project — which would be ' +
      'the group\'s first venture outside electricity distribution. Castlereagh reports in pounds ' +
      'sterling. Four of the nine board members have no financial background.',
  },
  {
    title: 'Exhibit 1 — Castlereagh and the proxy company',
    body:
      'Castlereagh\'s own equity beta is 0.90, and it is financed 70% by equity and 30% by debt by ' +
      'market value. The board intends to finance Brackwater so as to maintain that same capital ' +
      'structure.\n\n' +
      'The only suitable listed proxy for a regulated water business is Ardhowen Water plc, whose ' +
      'equity beta is 0.75 and which is financed 60% by equity and 40% by debt by market value. ' +
      'Both companies are taxed in the United Kingdom at a corporation tax rate of 25%.\n\n' +
      'The risk-free rate is 4.2% and the equity risk premium is 6.0%. Castlereagh can borrow at a ' +
      'pre-tax cost of debt of 6.5%.',
  },
  {
    title: 'Exhibit 2 — The construction facility',
    body:
      'If the bid succeeds, Castlereagh will draw a GBP 480 million floating-rate construction ' +
      'facility on 1 August 20X6 and repay it 6 months later. Interest is charged at the base rate ' +
      'plus a margin of 1.20 percentage points. The base rate today is 4.00%.\n\n' +
      'Sterling three-month interest-rate futures are available in contracts of GBP 500,000. The ' +
      'September futures price today is 95.70, and the contract expires in 9 months. The facility ' +
      'would be drawn in 6 months\' time.\n\n' +
      'The treasury team has asked you to appraise the hedge under two scenarios: the base rate ' +
      'rising to 5.20%, and the base rate falling to 3.10%.',
  },
  {
    title: 'Exhibit 3 — The financing structure the CFO proposes',
    body:
      'The chief financial officer has put a financing proposal to the board. She proposes that ' +
      'Brackwater be financed with 80% debt, on the grounds that "the concession revenue is ' +
      'regulated and therefore certain, so the project can support far more debt than the group ' +
      'average, and the extra tax shield increases the value of the project to shareholders". She ' +
      'has also stated that because the debt would be raised in a ring-fenced project company, ' +
      '"the gearing does not affect Castlereagh plc and the group\'s own cost of capital is ' +
      'unchanged".\n\n' +
      'Castlereagh\'s existing bond covenants cap consolidated net debt at 45% of consolidated ' +
      'capital. The group treasurer has confirmed that the ring-fenced company would be ' +
      'consolidated. Regulated revenue is subject to a five-yearly price review, at which the ' +
      'regulator resets allowed returns; the last two reviews in the water sector reduced allowed ' +
      'returns.',
  },
  {
    title: 'Exhibit 4 — The board\'s instructions',
    body:
      'The chair has asked for the discount rate that should be applied to Brackwater, an ' +
      'appraisal of the proposed hedge on the construction facility, and an assessment of the ' +
      'chief financial officer\'s financing proposal. She has also asked that your report include ' +
      'a short briefing note for the four board members who have no financial background, ' +
      'explaining in plain language why the rate used to appraise Brackwater is not the group\'s ' +
      'own cost of capital.',
  },
];

// ── (i) B3e — project-specific discount rate ─────────────────────────────────
const CAPM_INPUTS = {
  rf: 4.2,
  mrp: 6.0,
  tax_rate: 25,
  kd: 6.5,
  peer_equity_beta: 0.75,
  peer_ve: 60,
  peer_vd: 40,
  own_ve: 70,
  own_vd: 30,
};

// ── (ii) E3a — interest-rate futures hedge ───────────────────────────────────
const IR_INPUTS = {
  currency: 'GBP',
  notional: 480,
  direction: 'borrower' as const,
  hedge_months: 6,
  contract_months: 3,
  contract_size: 0.5,
  spot_rate0: 4.00,
  futures0: 95.70,
  months_to_expiry: 9,
  months_to_transaction: 6,
  company_spread: 1.20,
  scenarios: [
    { label: 'Base rate rises', base_rate: 5.20 },
    { label: 'Base rate falls', base_rate: 3.10 },
  ],
};

// ── (iii) B3i — is the CFO's financing proposal sound? ───────────────────────
const B3I_FACTS = [
  { id: 'f_80', text: 'the CFO proposes financing Brackwater with 80% debt', key: '80% debt', kind: 'entity' as const },
  { id: 'f_covenant', text: 'existing bond covenants cap consolidated net debt at 45% of consolidated capital', key: 'covenants cap', kind: 'constraint' as const },
  { id: 'f_consol', text: 'the treasurer has confirmed the ring-fenced company would be consolidated', key: 'consolidated', kind: 'constraint' as const },
  { id: 'f_review', text: 'regulated revenue is reset at a five-yearly price review, and the last two reviews reduced allowed returns', key: 'price review', kind: 'constraint' as const },
  { id: 'f_unchanged', text: 'the CFO states the group cost of capital is unchanged because the debt is ring-fenced', key: 'unchanged', kind: 'entity' as const },
];

const B3I_RUBRIC: NarrativeRubric = {
  mode: 'narrative',
  requirement_parts: ['test the certainty claim', 'test the ring-fencing claim', 'advise the board'],
  scenario_facts: B3I_FACTS,
  total_marks: 10,
  bands: [{ min: 0, label: 'fail' }, { min: 0.5, label: 'pass' }, { min: 0.7, label: 'good' }, { min: 0.85, label: 'excellent' }],
  criteria: [
    {
      id: 'c_certainty',
      requirement_part: 'test the certainty claim',
      lo: 'B3i',
      required_point:
        'CHALLENGES the premise that regulated revenue is certain: allowed returns are reset at a ' +
        'five-yearly price review and the last two water reviews REDUCED them, so the revenue is ' +
        'administratively determined rather than guaranteed. Regulatory risk is a real business ' +
        'risk that debt capacity must be set against.',
      marks: 3,
      anchor_facts: ['f_review'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_ringfence',
      requirement_part: 'test the ring-fencing claim',
      lo: 'B3i',
      required_point:
        'REFUTES the ring-fencing claim on the group\'s own facts: the treasurer has confirmed the ' +
        'project company would be CONSOLIDATED, and the covenants bite on CONSOLIDATED net debt at ' +
        '45%. So 80% project gearing is not invisible to the group — it consumes group covenant ' +
        'headroom and can breach it.',
      marks: 3,
      anchor_facts: ['f_covenant', 'f_consol', 'f_unchanged'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_taxshield',
      requirement_part: 'test the certainty claim',
      lo: 'B3i',
      required_point:
        'Tests the tax-shield argument rather than accepting it: the shield has value only against ' +
        'taxable profits, and it is bounded by financial-distress costs, which rise with gearing ' +
        'and rise faster where the revenue can be reset downwards. More debt is not monotonically ' +
        'more value.',
      marks: 2,
      anchor_facts: ['f_80'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_advise',
      requirement_part: 'advise the board',
      lo: 'B3i',
      required_point:
        'Commits to a position on the proposal and proposes a COMMERCIALLY VIABLE alternative — ' +
        'e.g. gearing set within covenant headroom, or covenant renegotiation obtained in advance ' +
        'as a condition of bidding — rather than merely rejecting the CFO\'s figure.',
      marks: 2,
      anchor_facts: ['f_covenant'],
      disqualifiers: ['F4'],
      development_required: true,
    },
  ],
};

const B3I_GOOD =
  'The chief financial officer\'s proposal rests on two claims, and neither survives contact with ' +
  'the group\'s own facts.\n\n' +
  'The first claim is that regulated revenue is certain and can therefore support far more debt. ' +
  'Regulated revenue is more PREDICTABLE than merchant revenue, and that is a real advantage, but ' +
  'predictable is not certain. Allowed returns are reset at a five-yearly price review, and the ' +
  'last two reviews in the water sector reduced them. So the cash flow supporting an 80% debt ' +
  'structure is set by a regulator every five years over a 25-year concession — five resets — and ' +
  'the recent direction of travel is downwards. That is not the absence of risk; it is a ' +
  'different risk, and one that arrives on a known timetable. Debt capacity has to be sized ' +
  'against the return the regulator might allow at the worst of those reviews, not against the ' +
  'return allowed today.\n\n' +
  'The tax-shield argument needs the same treatment. A shield has value only to the extent there ' +
  'are taxable profits to shield, and its value is bounded by the expected costs of financial ' +
  'distress, which rise with gearing. At 80% debt against revenue that can be reset downwards, ' +
  'those costs rise precisely when the cash flow falls. Static trade-off theory does not say more ' +
  'debt is always worth more; it says there is an optimum beyond which the distress cost outweighs ' +
  'the shield, and 80% in a business facing periodic downward resets is far more likely to sit ' +
  'beyond that optimum than at it.\n\n' +
  'The second claim is that ring-fencing insulates the group, and this one is not a matter of ' +
  'judgement — it is contradicted by the group treasurer. He has confirmed that the ring-fenced ' +
  'company would be consolidated, and Castlereagh\'s existing bond covenants cap CONSOLIDATED net ' +
  'debt at 45% of consolidated capital. Debt raised inside the project company therefore appears ' +
  'in exactly the measure the covenants test. An 80%-geared project of this size does not leave ' +
  'the group\'s cost of capital unchanged: it consumes group covenant headroom, and if it ' +
  'exhausts it the consequence is a covenant breach across the group\'s existing borrowing, not a ' +
  'problem confined to Brackwater. Legal ring-fencing and accounting consolidation are different ' +
  'things, and it is the second that the covenants follow.\n\n' +
  // N5 reads this text with `hasConclusion`, which wants one of a fixed set of markers —
  // "advise the board" is NOT among them, "the board should" and "recommend" are. Keep one.
  'I therefore recommend that the board should reject the 80% structure as proposed. ' +
  'Brackwater should be geared at a level that leaves consolidated net debt inside the 45% ' +
  'covenant with headroom for a downward price review, which on the group\'s current balance ' +
  'sheet means gearing much closer to the group average than to 80%. If the board judges that the ' +
  'project genuinely needs more leverage to be biddable, then the covenant renegotiation should ' +
  'be obtained from the bondholders BEFORE the bid is submitted and made a condition of bidding — ' +
  'that is a negotiation Castlereagh can conduct from a position of strength now, and cannot ' +
  'conduct at all once it is committed to the concession and in breach.';

const B3I_BAD =
  'The chief financial officer has put a financing proposal to the board. She proposes that ' +
  'Brackwater be financed with 80% debt, on the grounds that the concession revenue is regulated ' +
  'and therefore certain, so the project can support far more debt than the group average.\n\n' +
  'Capital structure theory considers the relationship between gearing and the value of the firm. ' +
  'Modigliani and Miller showed that in a world without taxes capital structure is irrelevant. ' +
  'When corporate tax is introduced, debt becomes attractive because interest is tax deductible ' +
  'and this creates a tax shield which increases the value of the geared firm.\n\n' +
  'The static trade-off theory suggests that firms balance the tax advantages of debt against the ' +
  'costs of financial distress. Pecking order theory suggests that firms prefer internal finance ' +
  'first, then debt, then equity. Agency theory considers the conflicts between shareholders and ' +
  'debt holders which can arise at high levels of gearing.\n\n' +
  'A high level of gearing has both advantages and disadvantages. The advantages include the tax ' +
  'shield and the lower cost of debt compared with equity. The disadvantages include the risk of ' +
  'financial distress and the possibility of restrictions imposed by lenders. These are all ' +
  'matters that will require careful attention in the light of the particular circumstances.';

// ── (iv) A3a — briefing note for non-financial directors (COMMUNICATION) ─────
const A3A_FACTS = [
  { id: 'f_four', text: 'four of the nine board members have no financial background', key: 'no financial background', kind: 'entity' as const },
  { id: 'f_first', text: 'Brackwater would be the group\'s first venture outside electricity distribution', key: 'first venture', kind: 'constraint' as const },
  { id: 'f_proxy', text: 'the only suitable listed proxy for a regulated water business is Ardhowen Water plc', key: 'Ardhowen', kind: 'constraint' as const },
];

const A3A_RUBRIC: NarrativeRubric = {
  mode: 'narrative',
  requirement_parts: ['explain the principle', 'explain it for this audience'],
  scenario_facts: A3A_FACTS,
  total_marks: 6,
  bands: [{ min: 0, label: 'fail' }, { min: 0.5, label: 'pass' }, { min: 0.7, label: 'good' }, { min: 0.85, label: 'excellent' }],
  criteria: [
    {
      id: 'c_principle',
      requirement_part: 'explain the principle',
      lo: 'A3a',
      required_point:
        'Explains that a discount rate reflects the RISK OF THE ACTIVITY being appraised, not the ' +
        'risk of the company doing it — so using the group rate on a project of different business ' +
        'risk misprices it. Ties this to Brackwater being the group\'s FIRST venture outside ' +
        'electricity distribution.',
      marks: 3,
      anchor_facts: ['f_first'],
      disqualifiers: ['F2'],
      development_required: true,
    },
    {
      id: 'c_audience',
      requirement_part: 'explain it for this audience',
      lo: 'A3a',
      required_point:
        'Written for a NON-FINANCIAL reader: explains why a water company\'s figures are borrowed ' +
        'and adjusted, in plain language, without unexplained technical vocabulary and without ' +
        'algebra. Names the consequence of getting it wrong in business terms — accepting a bad ' +
        'project or rejecting a good one.',
      marks: 3,
      anchor_facts: ['f_four', 'f_proxy'],
      disqualifiers: ['F2'],
      development_required: true,
    },
  ],
};

const A3A_GOOD =
  'BRIEFING NOTE — why Brackwater is not appraised at the group\'s own cost of capital\n\n' +
  // The literal 'no financial background' is the f_four anchor key and must appear verbatim.
  'This note is for the four board members with no financial background, and it avoids technical ' +
  'terms wherever plain ones will do.\n\n' +
  'When we decide whether an investment is worth making, we compare the cash it is expected to ' +
  'produce against a benchmark return. That benchmark is a rate we could earn elsewhere for ' +
  'taking the SAME KIND OF RISK. The essential point is that the benchmark belongs to the ' +
  'ACTIVITY, not to the company carrying it out. Castlereagh\'s own benchmark reflects what our ' +
  'shareholders expect from an electricity distribution business, because that is what we have ' +
  'always been. Brackwater is the group\'s first venture outside electricity distribution: it is ' +
  'a regulated water treatment concession, with different customers, a different regulator and a ' +
  'different pattern of risk. Judging it against an electricity benchmark would be like pricing a ' +
  'building using the cost per square metre of a different kind of building.\n\n' +
  'Because Castlereagh has never operated in water, we have no figures of our own for how risky ' +
  'that business is. So we borrow them. Ardhowen Water plc is a listed regulated water business, ' +
  'and the stock market\'s view of Ardhowen tells us what investors think water risk is worth. We ' +
  'cannot use Ardhowen\'s figures as they stand, because Ardhowen borrows a different amount of ' +
  'money than we do, and borrowing makes returns to shareholders more volatile regardless of the ' +
  'underlying business. So we take Ardhowen\'s figure, strip out the effect of Ardhowen\'s ' +
  'borrowing to isolate the water business itself, and then add back the effect of the borrowing ' +
  'CASTLEREAGH intends to use. What comes out is a benchmark for water risk carried on our ' +
  'balance sheet.\n\n' +
  'Why it matters in practice is straightforward. If we used our own lower electricity benchmark, ' +
  'Brackwater would look better than it is, and we could win a 25-year concession that never ' +
  'earns what its risk demands. If we set the benchmark too high, we would walk away from a ' +
  'project that would have been worth having, and a competitor would take it. The purpose of the ' +
  'calculation is to make sure the bid price reflects the risk the group is actually taking on.';

const A3A_BAD =
  'Castlereagh Utilities plc owns and operates electricity distribution networks in the United ' +
  'Kingdom. The board has been invited to bid for a 25-year concession to build and operate a ' +
  'regulated water treatment network, the Brackwater project.\n\n' +
  'The project-specific discount rate is calculated using the capital asset pricing model. The ' +
  'proxy company\'s equity beta is ungeared using the asset beta formula to remove the effect of ' +
  'the proxy\'s financial gearing. The resulting asset beta is then regeared using the appraising ' +
  'company\'s own capital structure to give a project equity beta.\n\n' +
  'This equity beta is then substituted into the capital asset pricing model equation, being the ' +
  'risk-free rate plus beta multiplied by the equity risk premium, in order to derive a ' +
  'project-specific cost of equity. Where a weighted average cost of capital is required, the ' +
  'post-tax cost of debt is weighted alongside it using market values.\n\n' +
  'The use of a project-specific rate rather than the entity rate is a matter of standard ' +
  'practice in investment appraisal where the business risk of the project differs from that of ' +
  'the entity. There are a number of considerations that will require attention in applying this ' +
  'approach to the circumstances that arise here.';

const SPEC: AfmCaseSpec = {
  frame: {
    id: 'ac000000-0000-4000-8000-00000000a101',
    section: 'A',
    anchor_area: 'B3',
    title: 'Castlereagh Utilities plc',
    scenario_intro: INTRO,
    response_format: 'report',
    total_marks: 50,
    professional_skills_marks: 10,
  },
  exhibits: EXHIBITS,
  numeric: [
    {
      requirement_order: 1,
      marks: 12,
      ps_tags: ['analysis_and_evaluation'],
      intellectual_level: 3,
      calc: { paper: 'AFM', lo: 'B3e', kind: 'project_specific' as const, inputs: CAPM_INPUTS },
      prose: {
        question:
          '(i) Calculate the discount rate that should be applied to the Brackwater project, and ' +
          'explain why it differs from Castlereagh\'s own cost of capital. (12 marks)',
        advice:
          'The rate the board should apply to Brackwater is the one derived here, and the board ' +
          'should understand which part of it is borrowed and which is Castlereagh\'s own. The ' +
          'business risk in this rate comes entirely from Ardhowen, because Ardhowen is the only ' +
          'listed window onto regulated water risk available; the financial risk comes entirely ' +
          'from Castlereagh, because it is Castlereagh\'s balance sheet that will carry the ' +
          'project. That division is what the ungearing and regearing steps achieve, and it is ' +
          'also where the estimate is weakest: a single proxy carries whatever is idiosyncratic ' +
          'about Ardhowen — its regulatory settlement, its asset age, its own contracting model — ' +
          'into Castlereagh\'s appraisal. The board should treat the resulting rate as a ' +
          'well-founded estimate rather than a measurement, and should ask for the bid to be ' +
          'tested against a range around it before the concession is priced.',
        misconception:
          'regearing the proxy\'s asset beta at the proxy\'s own capital structure',
        symptom:
          'candidates ungear the proxy correctly and then regear using the proxy\'s equity and ' +
          'debt weights again, which simply returns the proxy\'s original equity beta.',
        fix:
          'The fix is to keep track of whose capital structure is in play at each step. Ungearing ' +
          'uses the PROXY\'s weights, because the point of the step is to remove the proxy\'s own ' +
          'borrowing and leave the business risk of water on its own. Regearing uses the ' +
          'APPRAISING COMPANY\'s weights, because the project will be financed on Castlereagh\'s ' +
          'balance sheet. Use the proxy\'s weights twice and the two steps cancel, returning the ' +
          'number you started with — which is a useful self-check: if your regeared beta equals ' +
          'the proxy\'s equity beta, you have regeared at the wrong structure.',
        hint_lead:
          'Two different capital structures appear in this calculation — using the same one twice ' +
          'is the single most common way to lose these marks.',
        hint_method:
          'Ungear the proxy\'s equity beta using the PROXY\'s equity and debt weights to isolate ' +
          'the asset beta of a regulated water business. Then regear that asset beta using ' +
          'CASTLEREAGH\'s intended weights. Put the regeared equity beta through the capital ' +
          'asset pricing model for a cost of equity, then weight it with the post-tax cost of ' +
          'debt at Castlereagh\'s structure.',
      },
    },
    {
      requirement_order: 2,
      marks: 12,
      ps_tags: ['analysis_and_evaluation', 'scepticism'],
      intellectual_level: 3,
      calc: { paper: 'AFM', lo: 'E3a', inputs: IR_INPUTS },
      // NAMED, never silent — same units convention as Tamesis. Exhibit 2 states the contract
      // size the way a real paper does, in pounds; IrFuturesInputs works in GBPm alongside the
      // GBP 480m notional, so the literal "0.5" is absent from the exhibit while the fact is not.
      exhibit_exempt: {
        contract_size: 'Exhibit 2 states "contracts of GBP 500,000"; IrFuturesInputs takes GBPm, so the value is 0.5.',
      },
      prose: {
        question:
          '(ii) Appraise a hedge of the construction facility using sterling interest-rate ' +
          'futures, showing the outcome under each of the two rate scenarios. (12 marks)',
        advice:
          'The hedge does what a hedge is supposed to do, and the board should read that as the ' +
          'point rather than as a disappointment. Under both scenarios the effective cost ' +
          'converges on substantially the same rate, which means Castlereagh has exchanged an ' +
          'uncertain borrowing cost for a known one — and has given up the benefit it would have ' +
          'enjoyed had rates fallen. That trade is the whole of the decision, and it is a ' +
          'commercial judgement rather than a technical one: a group bidding for a 25-year ' +
          'concession on regulated returns has little appetite for an unhedged construction ' +
          'cost, because the bid price must be fixed before the interest cost is known. The board ' +
          'should also note that the hedge is imperfect for two structural reasons rather than ' +
          'through any error — the contract size does not divide the facility exactly, and basis ' +
          'has not fully converged at the close-out date.',
        misconception:
          'counting contracts from the loan amount alone, ignoring the mismatch between the loan ' +
          'period and the contract period',
        symptom:
          'candidates divide the facility by the contract size and stop, hedging a six-month ' +
          'exposure with three-month contracts on a one-for-one basis and covering only half of it.',
        fix:
          'The fix is to scale for the period as well as the amount. The number of contracts is ' +
          'the facility divided by the contract size, multiplied by the ratio of the exposure ' +
          'period to the contract period — a six-month exposure hedged with three-month contracts ' +
          'needs twice as many. Note the direction too: a borrower fears a rate rise and therefore ' +
          'SELLS futures, because a rate rise drives the futures price down and a short position ' +
          'profits from that fall, offsetting the higher interest. Then work the basis: at ' +
          'close-out the contract has not expired, so the unexpired basis must be deducted before ' +
          'the closing price is read.',
        hint_lead:
          'The number of contracts is not simply the facility divided by the contract size.',
        hint_method:
          'Scale for both the amount and the period — a six-month exposure hedged with ' +
          'three-month contracts needs twice the contracts the amount alone suggests. Decide the ' +
          'direction from the exposure: a borrower fears a rise and sells. Then compute the basis ' +
          'today, decay it to the close-out date on a straight-line basis, and use the remaining ' +
          'unexpired basis to get the closing futures price in each scenario.',
      },
    },
  ],
  narrative: [
    {
      requirement_order: 3,
      lo: 'B3i',
      marks: 10,
      ps_tags: ['scepticism', 'commercial_acumen'],
      intellectual_level: 3,
      question:
        '(iii) Assess the chief financial officer\'s proposal to finance Brackwater with 80% ' +
        'debt, and advise the board what financing structure it should adopt. (10 marks)',
      rubric: B3I_RUBRIC,
      golden_good: B3I_GOOD,
      golden_bad: B3I_BAD,
      misconception:
        'reciting capital-structure theory instead of testing the proposal against the group\'s own constraints',
      symptom:
        'candidates summarise Modigliani and Miller, trade-off and pecking-order theory without ' +
        'once mentioning the covenant, the consolidation or the price review.',
      fix:
        'The fix is to treat the CFO\'s two claims as assertions to be tested. "Regulated ' +
        'therefore certain" is tested against the five-yearly price review and the direction of ' +
        'the last two. "Ring-fenced therefore invisible" is refuted outright by the treasurer\'s ' +
        'confirmation that the company consolidates and by covenants that bite on consolidated ' +
        'net debt. Then propose a structure the group can actually adopt.',
      hint_lead:
        'A summary of capital-structure theory earns very little here.',
      hint_method:
        'The marks are in testing the two claims the CFO has actually made against the facts in ' +
        'the exhibits — what the price review does to "certain" revenue, and what consolidation ' +
        'does to "ring-fenced" debt — and then proposing a structure that fits inside the ' +
        'covenant, or a route to changing the covenant before the bid.',
    },
    {
      requirement_order: 4,
      lo: 'A3a',
      marks: 6,
      ps_tags: ['communication'],
      intellectual_level: 2,
      question:
        '(iv) Draft a short briefing note for the four board members who have no financial ' +
        'background, explaining in plain language why Brackwater is not appraised at ' +
        'Castlereagh\'s own cost of capital. (6 marks)',
      rubric: A3A_RUBRIC,
      golden_good: A3A_GOOD,
      golden_bad: A3A_BAD,
      misconception:
        'writing the technical explanation again in technical language and calling it a briefing note',
      symptom:
        'candidates reproduce the ungearing and regearing steps, with formulae, for an audience ' +
        'that has been described as having no financial background.',
      fix:
        'The fix is to write for the reader described. Explain that the benchmark belongs to the ' +
        'activity rather than to the company, say why a water company\'s figures have to be ' +
        'borrowed and then adjusted, and state the consequence of getting it wrong in business ' +
        'terms — bidding for a concession that never earns what its risk demands, or walking away ' +
        'from one worth having. No algebra, and no term used without being explained.',
      hint_lead:
        'Repeating the calculation in technical language is not a briefing note.',
      hint_method:
        'Write for a reader with no financial background: the benchmark belongs to the activity, ' +
        'not the company; we have no water figures of our own so we borrow a listed water ' +
        'company\'s and adjust them for the fact that it borrows differently from us; and getting ' +
        'it wrong means either bidding for a concession that will not pay for its risk or losing ' +
        'a good one to a competitor.',
    },
  ],
};

export default SPEC;
