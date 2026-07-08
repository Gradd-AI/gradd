-- =============================================================================
-- APM Section B mock case (RESERVED) — Rivenor Pharma Distribution — CANDIDATE
-- C-anchored | 25 marks (20 technical + 5 professional skills) | mock_only = TRUE
-- =============================================================================
-- SERVING STATE: status='approved', published=true, mock_only=true — live inside the timed mock (QA cleared). Reconciled by migration 20260708120000.
-- Reserved for Mock Paper 1 — never appears in the free case list.
-- Built against S26-J27 Section C1: C1a (evaluate the management report in light
-- of mission/objectives, user needs, information overload, presentation best
-- practice) + C1b (evaluate data visualisation techniques for communicating
-- performance trends and insights). Distinct from Aldermere (C1a+C1e) and Orlen
-- (C1c/C1d): requirement (ii) evaluates visualisation SUITABILITY, not deception.
-- Staged failure modes:
--   (i)  evaluate Rivenor's performance instead of the REPORT; miss that the
--        report omits every mission-critical service metric
--   (ii) describe chart types in theory instead of evaluating each proposed
--        visualisation against its data and audience
-- Fixed case_id; re-seed by deleting the case (children cascade).
-- Apostrophe discipline: plain apostrophes inside dollar bodies; titles avoid
-- apostrophes entirely.
-- =============================================================================

-- 1. CASE -------------------------------------------------------------------
insert into acca_cases
  (id, section, anchor_area, title, scenario_intro, response_format,
   total_marks, professional_skills_marks, status, published, mock_only)
values
('a7000000-0000-4000-8000-0000000000c3',
 'B', 'C1', 'Rivenor Pharma Distribution',
 $sc7$It is now 1 September 20X5. You are a performance management adviser engaged by Rivenor Pharma Distribution. The board has asked you to respond to the requirements below, using the information in the exhibits provided. Professional marks are available for the demonstration of skill in analysis and evaluation, scepticism and commercial acumen in your answer.$sc7$,
 'report', 25, 5, 'approved', true, true);

-- 2. EXHIBITS ---------------------------------------------------------------
insert into acca_case_exhibits (case_id, exhibit_order, title, body) values
('a7000000-0000-4000-8000-0000000000c3', 1, 'Company background',
$r7a$Rivenor Pharma Distribution (Rivenor) is a wholesale distributor of medicines, delivering daily from three regional depots to around 1,900 independent and chain pharmacies. Pharmacies typically hold only a day or two of stock and order twice daily, so Rivenor's service reliability directly affects whether patients get their medicines. Contracts with the large pharmacy chains include service-level commitments, and two chain customers have recently warned that continued service failures will trigger contract reviews. Rivenor's mission is: "every pharmacy gets every medicine, on time, every day - reliability that patients and pharmacists can build on."$r7a$),
('a7000000-0000-4000-8000-0000000000c3', 2, 'Strategic objectives and the current board report',
$r7b$From the mission, the board has set three strategic objectives: (1) deliver market-leading order reliability, measured in the industry by on-time-in-full delivery (OTIF); (2) maintain stock availability so pharmacies are not forced to source elsewhere; and (3) grow profitably within the service commitments made to customers.

The monthly board report is a 42-page pack assembled by the finance and operations teams. It opens with total revenue and case volumes against the prior year, highlighted in the covering note. It then presents depot-by-depot operating detail: warehouse labour hours, fleet fuel and maintenance costs, vehicle route listings, picking-error logs by shift, and supplier intake schedules. The pack contains no OTIF figure, no stock-availability figure and no order-accuracy figure - the three measures Rivenor's own customer contracts reference. No targets appear against any figure. Board members have complained that the pack takes hours to read and that meetings drift into depot operating detail; the two customer warnings were first raised at board level verbally, not through anything in the pack. Appendix 1 sets out data the operations director has now extracted at the board's request.$r7b$),
('a7000000-0000-4000-8000-0000000000c3', 3, 'Appendix 1 - Service and financial data (years ended 30 June)',
$r7c$	20X5	20X4
Revenue (EUR m)	612.4	588.8
On-time-in-full delivery, OTIF (%)	93.8	96.5
Stock availability (% of ordered lines available)	95.1	97.2
Order accuracy (% of lines picked correctly)	99.1	99.4
Operating profit (EUR m)	18.4	19.6
Contractual OTIF commitment to chain customers (%)	96.0	96.0

Note: the industry benchmark for OTIF among national pharmaceutical distributors is around 96-97%.$r7c$),
('a7000000-0000-4000-8000-0000000000c3', 4, 'The finance director proposal - a one-page visual dashboard',
$r7d$A newly appointed finance director (FD) proposes replacing the front of the pack with a one-page visual dashboard for the board, with the operating detail moved to an appendix available on request. The FD proposes five visual elements:

1. A line chart showing monthly OTIF over the last 24 months, with the 96% contractual commitment drawn as a horizontal reference line.
2. A pie chart showing revenue split across Rivenor's 32 product categories.
3. A red-amber-green (RAG) status panel showing each strategic objective against its target.
4. A word cloud generated from the free-text of customer complaints, sized by word frequency, to show what customers complain about.
5. Sparklines (small inline trend lines) next to each KPI on the RAG panel, showing the last 12 months of movement.

The FD has asked for an evaluation of whether each proposed element would communicate performance clearly to the board.$r7d$);

-- 3. REQUIREMENTS -----------------------------------------------------------
-- (i) C1a - evaluate the board report - 13 marks - A&E + scepticism
insert into acca_case_requirements
  (case_id, requirement_order, label, question, lo_code, command_verb,
   intellectual_level, marks_guide, professional_skill_tags, model_answer, hint, full_reveal)
values
('a7000000-0000-4000-8000-0000000000c3', 1,
 '(i) The current board report',
 $q7i$Evaluate whether the current monthly board report is suitable for allowing the board to judge Rivenor performance, in the light of its mission and strategic objectives, the needs of the board as users, the risk of information overload, and best practice in presentation. Use the data in Appendix 1 where relevant. (13 marks)$q7i$,
 'C1a', 'evaluate', 3, 13, 'analysis_and_evaluation,scepticism',
$m7i$Alignment with the mission and objectives
Rivenor's mission and objectives centre on service reliability, stock availability and profitable growth within customer commitments, yet the report contains none of the three service measures that define the first two - OTIF, stock availability and order accuracy - despite these being the measures Rivenor's own customer contracts reference. Appendix 1 shows why the omission matters this year: OTIF has fallen from 96.5% to 93.8%, below both the 96% contractual commitment and the industry norm of around 96-97%; availability has fallen from 97.2% to 95.1%; and order accuracy has slipped. The board is presiding over a deteriorating service position, under explicit contractual warning from two chain customers, and its own report is silent on all of it - the warnings reached the board verbally, not through the pack, which is the clearest possible evidence the report is not doing its job. Objective 3 fares no better: the report leads with revenue, but Appendix 1 shows revenue growth was not profitable growth — revenue rose about 4.0% while operating profit fell about 6.1% — and without profit, service and target information together the board cannot judge whether growth is being achieved within the required service standard.

Needs of the users
The board's job is strategic oversight: is the service promise being kept, are the contracts safe, is growth profitable within the commitments. The pack instead leads with revenue and case volumes, with revenue having grown, while the service measures that determine whether that revenue is secure went backwards. A report that surfaces the growing number and omits the deteriorating ones risks steering the board towards comfort at exactly the moment its two chain customer relationships are at risk. Depot labour hours, fuel costs and route listings are management information for depot managers, not decisions the board takes.

Information overload
At 42 pages of operational detail, the pack is simultaneously too long and too thin: too long, because board members report hours of reading and meetings drifting into depot detail; too thin, because the strategic content the board actually needs occupies none of it. Volume is displacing signal.

Best practice in presentation
The pack has no targets against any figure, so even the financial content cannot be judged as good or bad. Best practice would open with the objective measures against target and trend - OTIF against the 96% commitment, availability, accuracy - exception-flag the adverse movements, and push operating detail to an appendix. The absence of targets is especially serious here because a hard external target exists (the 96% contractual commitment) and the report simply does not show performance against it.

Scepticism
The board should ask why a pack assembled by the functions responsible for service performance contains every operational input but none of the service outcomes those inputs exist to produce - and should not accept "the detail is all there" as an answer, because inputs without outcomes let a service decline continue unexamined.

Conclusion
The report is unsuitable: unable to support judgement on any of the three objectives, misaligned with the board's oversight needs at a moment of contractual risk, overloaded with operational detail, and target-free. It should be rebuilt around the three service measures against target and trend, with the operating detail available on request - which is precisely the gap the FD's dashboard proposal in Exhibit 4 sets out to close.$m7i$,
$h7i$The trap is to analyse Rivenor's performance - OTIF fell, availability fell - and stop there. The question asks about the REPORT. Use the Appendix data as evidence about the report: what has gone badly this year, and does the pack let the board see any of it? Work through the four criteria in the question in turn, and notice where the customer warnings reached the board from - was it the pack?$h7i$,
$f7i$The dominant failure mode on C1a requirements is evaluating the company instead of the report; the data here exists to be used as evidence about the report, not as the subject. The scoring structure follows the question's four criteria: mission/objectives - the pack omits all three mission-defining measures (OTIF, availability, accuracy) in the year OTIF fell from 96.5% to 93.8%, below the 96% contractual commitment and the 96-97% industry norm; user needs - the board leads on revenue (up) while the measures securing that revenue deteriorated, and the two customer warnings reached the board verbally rather than through the pack, proof the report fails its oversight function; overload - 42 pages of depot inputs (labour hours, fuel, routes) that belong to depot management, drowning the strategic signal; presentation - no targets anywhere, despite a hard external 96% commitment existing to report against. The scepticism mark: challenge why the functions responsible for service produced a pack containing every input and no outcomes. Strong answers conclude the report is structurally unsuitable and connect forward: rebuild around the service measures against target and trend - the gap Exhibit 4's dashboard aims at.$f7i$),

-- (ii) C1b - evaluate the five proposed visualisations - 7 marks - commercial acumen
('a7000000-0000-4000-8000-0000000000c3', 2,
 '(ii) The proposed dashboard',
 $q7ii$Evaluate whether each of the five visual elements proposed by the finance director (Exhibit 4) would communicate Rivenor performance clearly to the board. (7 marks)$q7ii$,
 'C1b', 'evaluate', 3, 7, 'commercial_acumen',
$m7ii$OTIF line chart with the 96% commitment as a reference line
Well chosen. A line chart is the right form for a trend over time, and drawing the contractual commitment as a horizontal reference converts the chart from data into judgement: the board sees at a glance when OTIF crossed below the line and how far below it now sits. This single element addresses the report's most serious current gap. Two refinements: 24 months is right for context, and adding the industry-norm band (96-97%) would show competitive as well as contractual position.

Pie chart of revenue across 32 product categories
Poorly chosen. Pie charts communicate proportion for a small number of segments; at 32 categories the slices become unreadable and unlabellable, and the board learns nothing actionable. If category mix matters to the board at all, a ranked bar chart of the top categories with the remainder grouped as "other" - or a simple table - communicates it; if it does not bear on the three objectives, it should not occupy dashboard space at all.

RAG status panel per strategic objective
Right idea for a board audience: RAG against target is the fastest possible read of "where do we stand", and it forces the discipline the current pack lacks - explicit targets per objective. Its known weakness is the cliff-edge: a measure sitting just inside amber can mask a deteriorating trend, and thresholds need defining and applying consistently or the panel becomes negotiable. Paired with trend information (see sparklines) the weakness is largely covered. One design point for objective 3: because the objective is profitable growth WITHIN the service commitments, a green profit status must not be allowed to read as overall health while OTIF or availability sit red — the panel should make that dependency visible.

Word cloud of complaint text
Weakly chosen for a board dashboard. Word frequency is not significance: the word "late" appearing often says less than one chain customer invoking a contract clause. Word clouds strip context, cannot show trend or severity, and invite anecdotal discussion. The underlying intent - surface what customers complain about - is better served by a categorised complaint count with trend (deliveries late, lines missing, picking errors), which also maps directly onto the three service measures.

Sparklines beside each KPI
Well chosen as a complement. Sparklines add the trend dimension the RAG panel lacks, at almost no space cost: an amber KPI with a falling sparkline reads very differently from an amber KPI recovering. Their limit is precision - no axes, no values - so they support the RAG panel rather than replace proper charts for measures under scrutiny (OTIF already has its own line chart, which is the right division of labour).

Overall
Three of the five elements are defensible as proposed — the OTIF line chart, the RAG panel and the sparklines — and should form the dashboard core. The pie chart should be replaced by a ranked bar or table (and only kept at all if category mix genuinely informs board decisions), and the word cloud replaced by a categorised complaint measure. The test for every element is the same: does it help the board judge the three objectives against target and trend at a glance.$m7ii$,
$h7ii$Do not describe what each chart type is - evaluate each proposed element against its specific data and its audience. For each of the five: what question would the board be trying to answer with it, and does this form answer it? Watch the pie (how many segments?) and the word cloud (is frequency the same as importance?). Say what should replace anything you reject.$h7ii$,
$f7ii$The failure mode on C1b requirements is chart-type theory without evaluation of the specific proposal. The scoring pattern is element by element with a verdict and a fix: OTIF line chart with the 96% reference line - right form for trend, the reference line turns data into judgement, add the industry band: adopt; 32-segment pie - unreadable at that segment count, replace with a ranked bar or table, or drop if mix does not inform the objectives; RAG panel - fastest board read and forces explicit targets, but cliff-edge thresholds can mask trend and must be consistently defined; word cloud - frequency is not significance, no trend or severity, replace with categorised complaint counts with trend that map onto the service measures; sparklines - add the trend dimension RAG lacks at minimal cost, imprecise by design so they complement rather than replace full charts. The commercial-acumen mark sits in the closing test - every element judged by whether it helps the board see the three objectives against target and trend at a glance - and in proposing practical replacements rather than only rejecting. Strong answers keep the line chart, RAG and sparklines as the core and fix the two weak elements.$f7ii$);

-- =============================================================================
-- POST-INSERT VERIFICATION:
--   select c.title, c.section, c.status, c.published, c.mock_only,
--          (select count(*) from acca_case_exhibits e where e.case_id=c.id) as exhibits,
--          (select count(*) from acca_case_requirements r where r.case_id=c.id) as requirements,
--          (select sum(marks_guide) from acca_case_requirements r where r.case_id=c.id) as technical_marks
--   from acca_cases c where c.id='a7000000-0000-4000-8000-0000000000c3';
--   -- expect: Rivenor Pharma Distribution | B | candidate | false | true | 4 | 2 | 20
-- =============================================================================
