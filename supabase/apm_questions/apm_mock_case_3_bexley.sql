-- =============================================================================
-- APM Section B mock case (RESERVED) — Bexley Grocers — LIVE
-- D-anchored | 25 marks (20 technical + 5 professional skills) | mock_only = TRUE
-- =============================================================================
-- SERVING STATE: status='approved', published=true, mock_only=true — live inside the timed mock (QA cleared). Reconciled by migration 20260708120000.
-- Reserved for Mock Paper 1 — never appears in the free case list.
-- Built against S26-J27 Section D2: D2a (assess the development of big data and
-- its impact on performance measurement and management, including risks and
-- challenges) + D2i (advise on ethical issues of information collection and
-- processing, e.g. uninterrogable algorithms, large-scale collection/analysis).
-- Distinct from Vesla (D2g/D2h model output + D1d security) and Torfin (D1
-- systems). Staged failure modes:
--   (i)  recite the 4 Vs as theory instead of assessing THIS purchase; accept
--        the data broker's claims uncritically
--   (ii) generic data-ethics essay instead of advising on Bexley's specific
--        collection, algorithm and targeting issues
-- Fixed case_id; re-seed by deleting the case (children cascade).
-- Apostrophe discipline: plain apostrophes inside dollar bodies; titles avoid
-- apostrophes entirely.
-- =============================================================================

-- 1. CASE -------------------------------------------------------------------
insert into acca_cases
  (id, section, anchor_area, title, scenario_intro, response_format,
   total_marks, professional_skills_marks, status, published, mock_only)
values
('a8000000-0000-4000-8000-0000000000d3',
 'B', 'D2', 'Bexley Grocers',
 $sc8$It is now 1 September 20X5. You are a performance management adviser engaged by Bexley Grocers. The board has asked you to respond to the requirements below, using the information in the exhibits provided. Professional marks are available for the demonstration of skill in analysis and evaluation, scepticism and commercial acumen in your answer.$sc8$,
 'report', 25, 5, 'approved', true, true);

-- 2. EXHIBITS ---------------------------------------------------------------
insert into acca_case_exhibits (case_id, exhibit_order, title, body) values
('a8000000-0000-4000-8000-0000000000d3', 1, 'Company background',
$b8a$Bexley Grocers (Bexley) operates around 240 supermarkets in the country of Ardenia, competing against two larger national chains and a fast-growing discounter. Bexley runs a loyalty-card scheme with 3.1 million members whose till transactions are recorded line by line. Under pressure on like-for-like sales, the board has approved a strategy of personalised promotions: tailoring offers to individual customers to grow basket size and visit frequency. The marketing director believes Bexley's own loyalty data is not enough for this and has brought a proposal to the board.$b8a$),
('a8000000-0000-4000-8000-0000000000d3', 2, 'The data proposal',
$b8b$The marketing director proposes a two-year contract with Veya Analytics (Veya), a data broker, under which Bexley would: (1) purchase access to profiling data on Ardenian consumers compiled by Veya from mobile-app location traces, social-media activity and online browsing across partner websites, extending back five years; (2) combine this with Bexley's own loyalty-card transaction history in a customer data platform; and (3) use a machine-learning scoring engine, supplied and operated by Veya, that assigns each customer a weekly set of promotion propensity scores used to generate individually targeted offers by app, email and till-slip coupon. Veya describes the scoring engine as proprietary: Bexley would receive each customer's scores but not the model, its input weightings or an explanation of individual scores. Veya's sales material states its data covers "over 90% of Ardenian adults at industry-leading accuracy" and that clients see "double-digit uplift in promotional response rates." The contract price is significant but affordable within the marketing budget.$b8b$),
('a8000000-0000-4000-8000-0000000000d3', 3, 'Letter from an Ardenian consumer-rights group',
$b8c$An established consumer-rights group has written to Bexley's board ahead of the decision. Extracts: "Loyalty members consented to their shopping being recorded in exchange for points. They did not consent to being profiled using their movements, browsing and social-media lives, purchased from a broker they have never heard of. We are separately concerned by targeting itself: personalised promotion systems of this kind have been shown to push alcohol offers at customers whose baskets indicate heavy drinking, and high-interest instalment offers at customers whose purchasing indicates financial distress - because those customers respond. If your scoring engine finds that vulnerable customers are the most responsive, it will target them, and on your own director's description, nobody at Bexley will be able to see it doing so."$b8c$),
('a8000000-0000-4000-8000-0000000000d3', 4, 'Note from the IT director to the board',
$b8d$"Two practical observations before the board decides. First, volume and speed: Veya's feed plus our own till data means processing hundreds of millions of records weekly if scores are to be refreshed every week as proposed - our current data warehouse comfortably handles our own loyalty data, but has never operated at that scale or cadence, and marketing's plan assumes the weekly cycle from day one. Second, the five-year history: a material share of Veya's profiles will rest on stale device identifiers, changed addresses, and behaviour from years ago; Veya has not shared how it verifies identity matches between its profiles and our loyalty members, and our own testing of a sample match file found a meaningful minority of records joined to the wrong household. Ardenia's data-protection law applies to everything we do with this data."$b8d$);

-- 3. REQUIREMENTS -----------------------------------------------------------
-- (i) D2a - big data 4Vs assessment of the proposal - 13 marks - A&E + scepticism
insert into acca_case_requirements
  (case_id, requirement_order, label, question, lo_code, command_verb,
   intellectual_level, marks_guide, professional_skill_tags, model_answer, hint, full_reveal)
values
('a8000000-0000-4000-8000-0000000000d3', 1,
 '(i) The big data proposal',
 $q8i$Using the characteristics of big data (the 4 Vs), assess the risks and challenges the proposed Veya contract presents for Bexley in measuring and managing the performance of its personalised-promotions strategy. (13 marks)$q8i$,
 'D2a', 'assess', 3, 13, 'analysis_and_evaluation,scepticism',
$m8i$Volume
The proposal moves Bexley from its own loyalty data to that plus a national broker feed - hundreds of millions of records weekly on the IT director's estimate. The challenge is not abstract: the current warehouse has never operated at that scale or cadence, yet marketing's plan assumes weekly scoring from day one. If the infrastructure cannot sustain the cycle, the strategy's core mechanism - fresh weekly propensity scores - fails quietly, and promotion decisions run on stale scores while appearing current. Volume also carries cost beyond the contract price: storage, processing and the specialist capacity to run the platform, none of which is in the marketing budget framing.

Velocity
The strategy depends on a weekly refresh feeding offers by app, email and till-slip. Velocity risk runs both ways: the pipeline must ingest, match and score fast enough to keep offers current, and the organisation must be able to act on the output at the same speed - printing till-slip coupons against last week's scores is manageable, but a delayed cycle turns "personalised" into "recently wrong." The untested weekly cadence is a major operational failure point and should be piloted before it is promised.

Variety
The proposal fuses structured till transactions with location traces, browsing and social-media signals - fundamentally different data types with different reliability. Variety is the source of the claimed advantage (signals loyalty data cannot see) but also of the integration challenge: joining heterogeneous behavioural data to named loyalty members is exactly where the IT director's sample testing found records matched to the wrong household. Value from variety only materialises if the identity matching holds; Veya has not shared how that matching is verified, which the board should treat as a gap to be closed contractually, not assumed away.

Veracity
This is the proposal's weakest point, and the sales claims deserve scepticism rather than acceptance. "Over 90% of Ardenian adults at industry-leading accuracy" is a coverage claim from the seller, unverified; the five-year history guarantees a material share of stale identifiers, moved households and outdated behaviour; and Bexley's own testing already found wrong-household matches. Wrong or stale data does not just waste promotion spend - it produces confidently mistargeted offers (a household receiving offers driven by a stranger's behaviour), which damages the customer trust the loyalty scheme depends on. "Double-digit uplift" is likewise a vendor outcome claim from other clients: the board should require an Ardenian pilot with a control group before treating it as expected performance — and the pilot should measure incremental profit, redemption cost, basket margin, cannibalisation and repeat behaviour, not just response rate, because response uplift alone may reward discount-driven sales that do not improve performance.

Assessment
The 4 Vs analysis says the proposal's promise (variety-driven personalisation) is real but conditional on the two weakest links: veracity of the matched data and the untested weekly velocity at volume. The board should not sign a two-year commitment on vendor claims; it should require verified match-quality evidence and accuracy warranties from Veya, pilot the weekly cycle on a subset of stores with a control group to test the uplift claim, and cost the infrastructure and skills beyond the contract price before deciding.$m8i$,
$h8i$Do not recite what the 4 Vs are - use each V to assess THIS contract. For each V, find the specific fact in the exhibits that creates the risk (what has the warehouse never done? what did the sample match test find? whose claims are the 90% and the double-digit uplift?). The IT director's note and the vendor's sales material are your raw material - and one of those two sources should be trusted less than the other.$h8i$,
$f8i$The failure modes are 4 Vs theory recital and accepting vendor claims uncritically. The scoring pattern is V by V with the exhibit fact attached: Volume - warehouse has never run at the proposed scale/cadence, plan assumes it from day one, and cost extends beyond the contract price; Velocity - the weekly score refresh is the strategy's core mechanism and a major untested failure point, so pilot before promising; Variety - the fused data types are the claimed advantage AND the integration risk, landing exactly where sample testing found wrong-household matches, with Veya's matching method undisclosed; Veracity - the weakest link: seller-sourced coverage and uplift claims, five-year-old identifiers and behaviour, and observed mismatches, producing confidently mistargeted offers that burn trust as well as budget. The scepticism marks sit in treating Veya's "90% coverage," "industry-leading accuracy" and "double-digit uplift" as unverified sales claims requiring evidence, warranties and an Ardenian control-group pilot measuring incremental profit and margin, not just response uplift. Strong answers end with conditions - match-quality evidence, accuracy warranties, a piloted weekly cycle, full costing - rather than a yes/no.$f8i$),

-- (ii) D2i - ethical issues of collection, processing and targeting - 7 marks - commercial acumen
('a8000000-0000-4000-8000-0000000000d3', 2,
 '(ii) Ethical issues',
 $q8ii$Advise the board on the ethical issues raised by the proposed collection and processing of customer data, including the concerns in the consumer-rights group letter and the nature of the Veya scoring engine. (7 marks)$q8ii$,
 'D2i', 'advise', 3, 7, 'commercial_acumen',
$m8ii$Consent and the basis of collection
On the consumer-rights group's account, loyalty members understood their shopping was recorded in exchange for points — Bexley should verify what its actual loyalty terms say. Even so, the proposal goes materially beyond any reasonable member expectation: profiling built from location traces, browsing and social media, purchased from a broker the customer has no relationship with, then joined to their named loyalty identity. Whether or not each element is lawful under Ardenian data-protection law - which applies throughout and must be assessed formally - the ethical gap between what customers understood and what would be done is real, and it is the group's strongest point. Large-scale collection of this kind concentrates intimate behavioural information in Bexley's hands at a scale no customer contemplated when joining a points scheme. Bexley should also require Veya to evidence the source, consent basis and permitted uses of the broker data before any of it is combined with loyalty identities.

The uninterrogable algorithm
Veya supplies scores but not the model, weightings or per-customer explanations. That means Bexley would act on decisions it cannot inspect, audit or explain - to a customer, a regulator or its own board. An algorithm that cannot be interrogated makes it difficult for Bexley to demonstrate fairness, challenge bias or explain outcomes — while still carrying responsibility for what the engine does. At minimum, the board should require explanation capability and audit rights in the contract; if Veya will not provide them, that is information about the risk.

Targeting the vulnerable
The letter's sharpest concern follows directly from how propensity engines work: they target whoever responds. If customers whose baskets indicate heavy drinking respond most to alcohol offers, or financially distressed customers to instalment offers, an unconstrained engine may identify and exploit exactly that pattern if vulnerability predicts response - and with an uninterrogable model, nobody at Bexley would see it happening. This is both an ethical issue and a commercial one: the reputational damage of a documented case of profiting from vulnerability would far outlast a two-year contract, and in a business built on weekly customer relationships, trust is the asset the loyalty scheme exists to build.

Advice
Proceed only with guardrails designed in from the start: exclude sensitive categories from targeting (alcohol and age-restricted lines, credit-like offers) regardless of predicted response; require explanation and audit rights over the scoring engine as a contractual condition; be transparent with members about what data informs their offers, with a genuine opt-out; monitor the engine's outputs for vulnerable-customer targeting patterns, with suppression lists and override rules where harmful patterns appear; and assign named accountability for algorithmic outcomes inside Bexley. If the economics of the proposal only work without these guardrails, that is itself the answer: the strategy would be relying on exactly the behaviour the letter warns against.$m8ii$,
$h8ii$Advise on the three specific issues in the exhibits, not data ethics in general: what did members actually consent to versus what is proposed; what does it mean that nobody at Bexley can see inside the scoring engine; and what will a response-maximising engine do with vulnerable customers if nothing stops it? End with practical guardrails the board could require - and consider what it means if the proposal only stacks up without them.$h8ii$,
$f8ii$The failure mode is a generic data-ethics essay. The scoring pattern is issue by issue from the exhibits: consent - on the consumer-rights group's account, members understood shopping-for-points, not broker-sourced profiling of movements, browsing and social media joined to their identity (verify the actual loyalty terms); the gap between understanding and use is the ethical core, with Ardenian data-protection law applying throughout. The algorithm - scores without model, weightings or explanations means Bexley acts on decisions it cannot audit or explain to anyone, making it difficult to demonstrate fairness, challenge bias or explain outcomes; demand explanation and audit rights contractually. Targeting - a response-maximising engine may exploit vulnerability if vulnerability predicts response (alcohol offers to heavy drinkers, credit-like offers to the distressed), invisibly under a black-box model; this is where ethics meets commercial acumen, because documented exploitation of vulnerable customers would destroy the trust the loyalty scheme exists to build. Strong answers end with concrete guardrails - sensitive-category exclusions, contractual explainability and audit rights, transparency with opt-out, monitoring for vulnerable-targeting patterns with suppression/override rules, named internal accountability - and the closing judgement that a proposal viable only without guardrails is answering its own question.$f8ii$);

-- =============================================================================
-- POST-INSERT VERIFICATION:
--   select c.title, c.section, c.status, c.published, c.mock_only,
--          (select count(*) from acca_case_exhibits e where e.case_id=c.id) as exhibits,
--          (select count(*) from acca_case_requirements r where r.case_id=c.id) as requirements,
--          (select sum(marks_guide) from acca_case_requirements r where r.case_id=c.id) as technical_marks
--   from acca_cases c where c.id='a8000000-0000-4000-8000-0000000000d3';
--   -- expect: Bexley Grocers | B | candidate | false | true | 4 | 2 | 20
-- =============================================================================
