-- =============================================================================
-- APM Section A mock case (RESERVED) — Halworth Hotels — CANDIDATE
-- 50 marks (40 technical + 10 professional skills, all four) | mock_only = TRUE
-- =============================================================================
-- SERVING STATE: status='approved', published=true, mock_only=true — live inside the timed mock (QA cleared). Reconciled by migration 20260708120000.
-- Reserved for Mock Paper 1 — never appears in the free case list (list route
-- excludes mock_only); served only inside the timed mock once approved+published.
-- Built against S26-J27. Anchors distinct from Keldan: A1g (benchmarking, incl.
-- suitability of internal/competitive/functional), B4b (Building Block in a
-- service business), B1a (evaluate budgeting methods + recommend).
-- Staged failure modes:
--   (i)  rank the hotels instead of evaluating the benchmarking EXERCISE;
--        skip the calculations
--   (ii) recite the Building Block model instead of evaluating the proposal;
--        miss the standards-equity problem across different markets
--   (iii) generic budgeting pros/cons list instead of evaluation applied to
--        Halworth's volatility; ignore the operations director
-- Fixed case_id; re-seed by deleting the case (children cascade).
-- =============================================================================

-- 1. CASE -------------------------------------------------------------------
insert into acca_cases
  (id, section, anchor_area, title, scenario_intro, response_format,
   total_marks, professional_skills_marks, status, published, mock_only)
values
('a6000000-0000-4000-8000-0000000000b1',
 'A', null, 'Halworth Hotels',
 $sc6$It is now 1 September 20X5. You are a performance management adviser engaged by Halworth Hotels. Write a report to the board of Halworth Hotels responding to its instructions for work in the areas set out in the requirements, using the information in the exhibits provided. Professional marks will be awarded for the demonstration of skill in communication, analysis and evaluation, scepticism and commercial acumen in your answer.$sc6$,
 'report', 50, 10, 'approved', true, true);

-- 2. EXHIBITS ---------------------------------------------------------------
insert into acca_case_exhibits (case_id, exhibit_order, title, body) values
('a6000000-0000-4000-8000-0000000000b1', 1, 'Company background',
$h6a$Halworth Hotels (Halworth) operates three mid-to-upper-market hotels in the country of Veeland: the Carrick (a 120-room city-centre hotel serving business travellers and weekend tourists), the Dunmore (a 150-room hotel at Veeland's main airport, serving airline crews, transit passengers and conferences), and the Elsinore (a 90-room coastal resort hotel with a spa, strongly seasonal). Halworth's mission is "to give every guest a stay worth returning for, delivered by people who are proud to work here, at returns our investors value." The board is concerned that performance varies widely across the three hotels and that head office has no consistent way of judging which hotels are performing well, or why.$h6a$),
('a6000000-0000-4000-8000-0000000000b1', 2, 'The benchmarking exercise',
$h6b$The finance director (FD) has begun an internal benchmarking exercise comparing the three hotels on four measures: room occupancy, revenue per available room-night (total room revenue divided by available room-nights), staff costs as a percentage of revenue, and guest complaints per 1,000 sold room-nights. The FD intends to circulate a quarterly league table of the three hotels on these measures, with the general manager of the bottom-ranked hotel asked to explain their position to the board. The FD has said: "whichever hotel is best on each measure sets the standard — the other two must close the gap." A non-executive director has asked whether Halworth should instead, or additionally, benchmark against other hotel groups, or benchmark specific functions such as housekeeping or bookings against best practice outside the hotel industry. Appendix 1 sets out the data for the year just ended; the board has asked for the four measures to be calculated for each hotel.$h6b$),
('a6000000-0000-4000-8000-0000000000b1', 3, 'Appendix 1 — Data for the year ended 30 June 20X5',
$h6c$	Carrick (city)	Dunmore (airport)	Elsinore (resort)
Rooms	120	150	90
Available room-nights (rooms x 365)	43,800	54,750	32,850
Sold room-nights	35,040	38,325	21,353
Room revenue (EUR)	4,200,000	3,832,500	3,285,600
Staff costs (EUR)	1,470,000	1,149,750	1,314,240
Guest complaints (number)	175	460	64

The board has asked for the following to be calculated for each hotel: room occupancy (sold / available room-nights), revenue per available room-night, staff costs as a percentage of revenue, and complaints per 1,000 sold room-nights.$h6c$),
('a6000000-0000-4000-8000-0000000000b1', 4, 'Head office proposal — performance measurement for the hotels',
$h6d$Head office has drafted a performance measurement framework for the three hotels, described by the FD as "based on the Building Block model used successfully by a consultancy's other clients." The draft contains the following. Results measures for every hotel: operating profit margin and room occupancy, reported monthly. Targets: a single group-wide standard for each measure — every hotel is to achieve 78% occupancy and a 22% operating margin, "so that all three hotels are held to the same bar." The draft contains no measures of service quality, staff, flexibility (coping with demand peaks), or innovation, which the FD says "are covered indirectly, because good service shows up in occupancy eventually." The draft says nothing about how hotel managers' bonuses or recognition will relate to the measures; the FD regards reward as "a separate HR matter to be settled later."$h6d$),
('a6000000-0000-4000-8000-0000000000b1', 5, 'Extract from a letter from the Elsinore''s general manager',
$h6e$"I want the Elsinore judged fairly. We are a seasonal resort: we run near-full through the summer and far below half in winter — no resort on this coast trades at 78% occupancy across a full year. My team flexes between 60 and 140 staff across the seasons, and our guests come for the spa and stay longer than at the other hotels. Judge us on the same single occupancy number as an airport hotel with year-round airline contracts and you will be telling my team the target has nothing to do with them. We keep complaints lower than any hotel in the group and our guests return year after year — none of that appears anywhere in head office's draft."$h6e$),
('a6000000-0000-4000-8000-0000000000b1', 6, 'Budgeting at Halworth',
$h6f$Halworth prepares an annual budget each October using the incremental method: the current year's figures for each hotel are taken as the base and adjusted for inflation and known changes. Once approved, the budget is fixed for the year. Demand at the hotels is volatile: the Dunmore's business moves with airline schedules and conference bookings, often at a few months' notice; the Elsinore's season depends heavily on weather and holiday patterns; city events can double the Carrick's weekend demand. Hotel managers privately concede that they build slack into their October submissions because "the number is fixed for a year, so you protect yourself." The FD has proposed replacing the annual budget with quarterly rolling budgets, re-forecast four quarters ahead each quarter. The operations director objects: "my managers already spend too long on budget paperwork — this quadruples it, and the budget will never stand still long enough to hold anyone to it." The board has asked for an evaluation of the proposal and a recommendation.$h6f$);

-- 3. REQUIREMENTS -----------------------------------------------------------
-- (i) A1g — benchmarking calcs + evaluate the exercise — 16 marks — comm + A&E
insert into acca_case_requirements
  (case_id, requirement_order, label, question, lo_code, command_verb,
   intellectual_level, marks_guide, professional_skill_tags, model_answer, hint, full_reveal)
values
('a6000000-0000-4000-8000-0000000000b1', 1,
 '(i) The benchmarking exercise',
 $q6i$Perform the calculations the board has requested (Appendix 1) and evaluate the FD's internal benchmarking exercise, including the suitability of the alternative benchmarking methods raised by the non-executive director. Note: there are 4 marks available for the calculations and 12 marks for the evaluation. (16 marks)$q6i$,
 'A1g', 'evaluate', 3, 16, 'communication,analysis_and_evaluation',
$m6i$Calculations (Carrick; Dunmore; Elsinore)
Occupancy (sold/available): 35,040/43,800 = 80.0%; 38,325/54,750 = 70.0%; 21,353/32,850 = 65.0%.
Revenue per available room-night: 4,200,000/43,800 = EUR 95.9; 3,832,500/54,750 = EUR 70.0; 3,285,600/32,850 = EUR 100.0.
Staff costs as % of revenue: 1,470,000/4,200,000 = 35.0%; 1,149,750/3,832,500 = 30.0%; 1,314,240/3,285,600 = 40.0%.
Complaints per 1,000 sold room-nights: 175/35,040 x 1,000 = 5.0; 460/38,325 x 1,000 = 12.0; 64/21,353 x 1,000 = 3.0.

What the comparison can and cannot say
The figures immediately show why a single league table misleads: no hotel is "best" — the Carrick leads on occupancy, the Elsinore earns the most revenue per available room-night and has by far the fewest complaints but the highest staff cost percentage (consistent with a staff-intensive spa resort), and the Dunmore is cheapest to staff but generates the most complaints by a wide margin. Ranking hotels serving different markets — city business trade, airport transit, seasonal resort — treats market differences as management performance. The Elsinore's 65% occupancy may be strong for a seasonal resort while the Dunmore's 70% may be weak for an airport hotel with year-round airline contracts; the raw comparison cannot tell the board which, so "bottom of the table explains themselves to the board" risks punishing the wrong manager and rewarding the wrong lesson.

The FD's design choices
"Whichever hotel is best sets the standard" has a deeper flaw: internal benchmarking can only spread Halworth's own best practice. If all three hotels are mediocre against the wider market, the internal best is a mediocre standard — the exercise institutionalises the group's current level rather than improving it. The league-table-plus-explanation format also encourages defensive behaviour and data gaming rather than learning; the useful question is "what does the Dunmore's 12 complaints per 1,000 tell us to fix," not "who is bottom."

The alternatives the NED raises
Competitive benchmarking — against comparable hotels (city hotels against city competitors, resorts against resorts) — addresses exactly the like-for-like problem above, and industry occupancy and rate data may be available for comparable hotels, though comparability and access should be checked; its limits are data comparability and the difficulty of seeing why competitors perform as they do. Functional benchmarking — comparing housekeeping, bookings or check-in processes against the best outside the industry — is the most likely source of genuine improvement in specific processes, though it needs care in translating practice across industries and a partner willing to share. The three methods answer different questions: internal (who inside is doing what well, cheap and immediately available), competitive (are we good by market standards), functional (how could this process be world-class). Halworth should use internal comparison for learning rather than league tables, add competitive context per market segment, and target functional benchmarking at the processes the internal data flags — starting with the Dunmore's complaint rate.

Conclusion
The calculations are useful; the league table is not. Reframe the exercise from ranking to explanation, compare each hotel against its own market, and use the NED's alternatives to bring an external standard in — internal comparison alone sets the bar at Halworth's current best.$m6i$,
$h6i$Do the four calculations for all three hotels first — they undermine the league table by themselves (is any hotel best at everything?). Then evaluate the EXERCISE, not the hotels: what does ranking three different markets against each other assume? What can internal benchmarking never tell you? And answer the NED properly — what would competitive and functional benchmarking each add that this exercise cannot?$h6i$,
$f6i$The failure modes here are ranking the hotels instead of evaluating the exercise, and skipping or fumbling the calculations. The numbers: occupancy 80.0/70.0/65.0%; revenue per available room-night EUR 95.9/70.0/100.0; staff cost % 35.0/30.0/40.0; complaints per 1,000 5.0/12.0/3.0. The evaluation that scores: (1) the figures themselves defeat a single ranking — each hotel leads somewhere, and the three serve different markets, so a league table converts market differences into apparent management failure (the seasonal Elsinore's 65% may outperform its market while the airport Dunmore's 70% underperforms its); (2) "internal best sets the standard" caps the group at its own current level — if all three are mediocre by market standards, internal benchmarking cannot reveal it; (3) league-table-with-explanations invites defensiveness and gaming rather than learning; (4) the NED's alternatives answer what internal cannot — competitive benchmarking restores like-for-like against each hotel's own market (with data-comparability limits), functional benchmarking imports genuine best practice into specific processes (housekeeping, bookings), best aimed where internal data flags problems, such as the Dunmore's complaint rate. Strong answers end with a redesign: comparison for learning not ranking, market-segment competitive context, targeted functional studies.$f6i$),

-- (ii) B4b — Building Block evaluation of the head-office proposal — 14 marks — scepticism + A&E
('a6000000-0000-4000-8000-0000000000b1', 2,
 '(ii) The head-office measurement proposal',
 $q6ii$Using Fitzgerald and Moon's Building Block model, evaluate the head office proposal for measuring the hotels' performance (Exhibit 4), taking account of the Elsinore general manager's letter (Exhibit 5). (14 marks)$q6ii$,
 'B4b', 'evaluate', 3, 14, 'scepticism,analysis_and_evaluation',
$m6ii$The Building Block model judges a service business's performance system on three blocks: dimensions (what is measured — results: financial performance and competitiveness; and determinants: quality, flexibility, resource utilisation and innovation), standards (targets that are fair — achievable, controllable/owned, and equitable between units), and rewards (clear, motivating, and tied to what managers control). Head office's draft fails substantively on all three, and its consultancy provenance deserves the same scepticism as any imported framework: "used successfully by other clients" is not evidence it fits three hotels in three different markets.

Dimensions
The draft measures results only — margin and occupancy — and no determinants at all. In a hotel group whose mission is built on guests returning and proud staff, the determinants are precisely where performance is created: service quality (the complaints data already exists and is ignored by the draft), flexibility (the Elsinore flexes 60–140 staff across seasons; the Dunmore absorbs schedule-driven demand swings), resource utilisation (revenue per available room-night, also already computed) and innovation in guest experience, service packages and booking processes. The FD's claim that "good service shows up in occupancy eventually" concedes the point: determinants lead, results lag — measuring only the lagging block tells managers what happened, never why, and gives head office no early warning. The mission's three commitments (returning guests, proud staff, investor returns) map naturally onto quality, staff-related determinants and results; the draft measures only the last.

Standards
A single group-wide standard — 78% occupancy and 22% margin for every hotel — fails the model's equity test explicitly. The benchmarking data shows the three hotels' occupancy ranges from 65% to 80% for structural, market reasons; the Elsinore GM is right that no coastal resort trades at 78% across a year. A target a unit cannot influence to achieve fails achievability and ownership too: it tells the Elsinore's team "the target has nothing to do with them," which is precisely the demotivation the standards block exists to avoid. Standards should be set per hotel against its own market and season pattern — equally stretching, not identical.

Rewards
Deferring reward "as a separate HR matter" misses that rewards are a block of the model, not an afterthought: measures with no clear consequences are less likely to influence behaviour, and consequences attached later to measures managers had no say in breed resentment. The reward properties — clarity, motivation, controllability — need designing with the measures, so each manager is rewarded on measures they can influence in their own market.

Conclusion
Adopt the model, reject the draft as it stands: add determinant measures (starting with the quality and utilisation data Halworth already produces), set per-hotel standards that are equitable across different markets, and design the reward link now rather than later. The Elsinore letter is not special pleading — it is a correct statement of the standards block.$m6ii$,
$h6ii$Don't recite what the Building Block model is — use its three blocks to test the draft. Dimensions: what's measured, and crucially what's missing (results vs determinants — where does service quality appear?). Standards: what does the model require of targets, and does one identical number for three different markets meet it? Read the Elsinore letter through that lens. Rewards: is "a separate HR matter" compatible with the model at all?$h6ii$,
$f6ii$The failure modes are describing the model instead of applying it, and dismissing the Elsinore letter instead of recognising it as the standards block in plain words. Scoring structure, block by block: Dimensions — the draft measures results only (margin, occupancy) and no determinants (quality, flexibility, resource utilisation, innovation), despite the group already producing complaints and revenue-per-available-room data; the FD's "service shows up in occupancy eventually" admits determinants lead and results lag, which is the argument FOR measuring them. Standards — one group-wide 78%/22% target fails equity (65–80% structural occupancy spread across different markets), achievability and ownership; the fix is per-hotel, equally-stretching standards, not identical ones. Rewards — deferring reward to HR ignores a whole block: measures without designed consequences don't drive behaviour, and clarity/motivation/controllability must be built with the measures. The scepticism marks sit in challenging the consultancy provenance ("other clients" is not evidence of fit) and the FD's indirect-coverage claim. Strong answers conclude: right model, wrong draft — add determinants, set equitable per-hotel standards, design the reward link now.$f6ii$),

-- (iii) B1a — budgeting method evaluation + recommendation — 10 marks — commercial acumen
('a6000000-0000-4000-8000-0000000000b1', 3,
 '(iii) The budgeting proposal',
 $q6iii$Evaluate the FD's proposal to replace Halworth's annual incremental budget with quarterly rolling budgets, taking account of the operations director's objection, and recommend an approach. (10 marks)$q6iii$,
 'B1a', 'evaluate', 3, 10, 'commercial_acumen',
$m6iii$The problem with the current method, at Halworth specifically
The annual incremental budget fails this business twice over. First, incrementalism carries each hotel's existing cost base and slack forward — managers concede they pad October submissions because the number is fixed for a year, so the budget starts padded and stays padded, and last year's inefficiency becomes this year's entitlement. Second, a figure fixed each October cannot describe a year in which the Dunmore's demand moves with airline schedules at months' notice, the Elsinore's season swings on weather, and city events double the Carrick's weekends: variances quickly reflect a stale plan rather than management performance, so the budget loses its control value within months.

What rolling budgets would fix — and cost
Quarterly re-forecasting keeps the plan current with the demand volatility that defines all three hotels, shortens the horizon managers must protect themselves against (weakening the incentive to pad), and gives the board a continuously refreshed four-quarter view for staffing and pricing decisions — genuinely valuable where seasonality and schedule changes dominate. The costs are the ones the operations director names: roughly four budget processes a year instead of one, and a moving target. His workload point is real but overstated if the process is redesigned rather than replicated — a quarterly re-forecast of key drivers (occupancy, rate, staffing) is a much lighter exercise than the annual bottom-up build, and standard drivers per hotel make it lighter still. His "never stands still long enough to hold anyone to it" concern is answerable by keeping an annual reference point: retain the original annual budget as a baseline, with planning-versus-operational variance analysis so forecast changes driven by demand outside managers' control are separated from performance — accountability keeps an anchor without reverting to a stale fixed target as the sole measure.

Recommendation
Adopt quarterly rolling budgets, on three conditions that answer the objection: a driver-based light-touch re-forecast rather than four full budget rounds; a retained annual benchmark (or planning/operational variance split) so accountability does not chase a moving number; and a pilot for two quarters at a volatile hotel such as the Dunmore, where airline schedule changes make the benefit visible, before group rollout. Incremental budgeting should not survive in any case: whatever the cadence, budgets should be built from drivers, not from last year plus inflation and padding.$m6iii$,
$h6iii$Evaluate for Halworth, not in general: what specifically does an October-fixed incremental number do badly in a business with airline schedules, weather seasons and event-driven weekends — and what did the managers admit about padding? Then take the operations director seriously: which part of his objection is real, and what design choices answer it? End with a recommendation and its conditions.$h6iii$,
$f6iii$The failure mode is a generic incremental-vs-rolling pros/cons list with no application, and ignoring the operations director. The scoring moves: (1) diagnose the current method against Halworth's facts — incrementalism perpetuates the padding managers admit to (fixed-for-a-year invites self-protection) and a stale October plan cannot control a business whose demand moves with airline schedules, weather seasons and city events, so variances stop meaning performance; (2) evaluate rolling budgets both ways — currency with volatility, a shorter self-protection horizon, a live four-quarter view for staffing and pricing, against genuinely higher process load and a moving accountability target; (3) answer the objection with design, not dismissal — driver-based light-touch re-forecasts, an annual reference point or planning/operational variance split so accountability holds, and a pilot at a volatile hotel such as the Dunmore; (4) recommend clearly, with conditions, and note that incremental building should end regardless of cadence. The commercial-acumen marks sit in proportionality (process cost vs decision value in THIS demand pattern) and in treating the objection as a design constraint rather than resistance.$f6iii$);

-- =============================================================================
-- POST-INSERT VERIFICATION:
--   select c.title, c.section, c.status, c.published, c.mock_only,
--          (select count(*) from acca_case_exhibits e where e.case_id=c.id) as exhibits,
--          (select count(*) from acca_case_requirements r where r.case_id=c.id) as requirements,
--          (select sum(marks_guide) from acca_case_requirements r where r.case_id=c.id) as technical_marks
--   from acca_cases c where c.id='a6000000-0000-4000-8000-0000000000b1';
--   -- expect: Halworth Hotels | A | candidate | false | true | 6 | 3 | 40
-- =============================================================================
