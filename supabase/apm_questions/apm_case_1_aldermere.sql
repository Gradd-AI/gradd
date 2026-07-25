-- WARNING: this file inserts into acca_case_requirements via raw SQL and
-- BYPASSES the authoring gate barrier. It predates that infrastructure and
-- is retained as shipped APM content only. DO NOT use it as a template for
-- new content. All new case/mock requirements must go through
-- lib/acca/case-authoring-gates.ts -> runRequirementGateBarrier().
--
-- Ruled INERT as content (2026-07-25): this is a fixed, already-shipped APM set,
-- not regenerated and not extended. The risk it carries is as a TEMPLATE — a new
-- paper's content copied from this shape would inherit zero gate coverage (no
-- GATE 1/2/3, no P4-P9, no GATE 26, no TAX_RATE_ASSIGNMENT, no HALFWAY_ROUNDING_RISK,
-- no GATE 27).

-- =============================================================================
-- APM Section B case #1 — C-anchored (Performance reporting) — LIVE
-- Aldermere Fitness | 25 marks (20 technical + 5 professional skills)
-- =============================================================================
-- SERVING STATE: status='approved', published=true — adversarial guide-check
-- cleared; live and serving. Reconciled to deployed state by migration 20260708120000.
-- Built against S26-J27 syllabus, Section C (Performance reporting).
-- Requirements deliberately stage the two dominant examiner failure modes:
--   (i)  evaluate the REPORT, not the company's performance (Neaty/Soulseat i)
--   (ii) INTERPRET and connect the data, don't restate it (Curra/Vatten style)
--
-- Fixed case_id used so child rows link deterministically. To re-seed, delete
-- the case first (exhibits/requirements cascade on delete).
-- =============================================================================

-- 1. CASE -------------------------------------------------------------------
insert into acca_cases
  (id, section, anchor_area, title, scenario_intro, response_format,
   total_marks, professional_skills_marks, status, published)
values
('a1000000-0000-4000-8000-0000000000c1',
 'B', 'C1', 'Aldermere Fitness',
 $sc$It is now 1 September 20X5. You are a performance management adviser engaged by Aldermere Fitness. The board has asked you to prepare a report responding to the requirements below, using the information in the exhibits provided. Professional marks are available for the demonstration of skill in analysis and evaluation, scepticism and communication in your answer.$sc$,
 'report', 25, 5, 'approved', true);

-- 2. EXHIBITS ---------------------------------------------------------------
insert into acca_case_exhibits (case_id, exhibit_order, title, body) values
('a1000000-0000-4000-8000-0000000000c1', 1, 'Company background',
$ex1$Aldermere Fitness (Aldermere) operates a chain of premium fitness clubs across Spain and Portugal. Its clubs compete at the upper end of the market on facilities, personal-trainer access and member experience, at a monthly membership price well above the budget gym operators that have expanded rapidly in the region. Aldermere's mission is "to be the Iberian peninsula's most valued premium fitness membership, keeping members for the long term through an experience they will not give up." The business is owned by a private-equity investor preparing the company for sale within two years, and the board is under pressure to demonstrate that the premium strategy is working.$ex1$),
('a1000000-0000-4000-8000-0000000000c1', 2, 'Strategic objectives',
$ex2$The board has set three strategic objectives that flow from the mission: (1) improve member retention (the proportion of members still active twelve months after joining); (2) grow revenue per member (encouraging members to take personal training, classes and other paid add-ons, consistent with the premium positioning); and (3) raise premium-club occupancy (the utilisation of each club against its designed capacity, since under-used premium clubs carry high fixed costs). Growth in total member numbers is regarded by the board as a means to an end, not an objective in itself, because the strategy depends on keeping high-value members rather than churning through low-commitment ones.$ex2$),
('a1000000-0000-4000-8000-0000000000c1', 3, 'The current board report',
$ex3$The monthly report presented to Aldermere's board is prepared by the finance team. It opens with two headline figures displayed prominently: total group revenue and total member headcount, each shown against the prior month and celebrated in a short covering note when they rise. It then runs to 31 pages of departmental detail: club-by-club utility costs, equipment-maintenance logs, headcount by staff grade, marketing spend by channel, and a full profit-and-loss for each of the 24 clubs. It contains no member-retention figure, no revenue-per-member figure, and no occupancy figure. There is no narrative commentary and no comparison against the board's objectives or targets. The CEO has observed that board members tend to read the first page and skip most of the rest, and that discussions in board meetings focus almost entirely on whether total revenue and total headcount went up.$ex3$),
('a1000000-0000-4000-8000-0000000000c1', 4, 'Appendix 1 — Performance data for the year',
$ex4$The following data has been extracted for the year (it does not appear in the current board report):

Total revenue: EUR 61.2m, up 6% on the prior year (prior year EUR 57.7m).
Total member headcount at year-end: up 9% on the prior year.
New members joining during the year: up 21% on the prior year.
Member retention (active twelve months after joining): 74%, down from 82% the prior year.
Revenue per member: down 4% on the prior year.
Premium-club occupancy: 61% against a board target of 75%.
Regional split: retention fell most sharply in the two newest regions (Andalusia and northern Portugal), where several budget competitors opened nearby during the year; retention in the established Madrid and Lisbon clubs held broadly steady.
Add-on revenue (personal training, classes): flat year on year despite the rise in member numbers.$ex4$);

-- 3. REQUIREMENTS -----------------------------------------------------------
-- (i) C1a [3] Evaluate the board report — 13 marks — A&E + scepticism
insert into acca_case_requirements
  (case_id, requirement_order, label, question, lo_code, command_verb,
   intellectual_level, marks_guide, professional_skill_tags, model_answer, hint, full_reveal)
values
('a1000000-0000-4000-8000-0000000000c1', 1,
 '(i) The current board report',
 $q_i$Evaluate whether Aldermere's current monthly board report is suitable for allowing the board to judge the company's performance, in the light of its mission and strategic objectives, the needs of the board as users, the risk of information overload, and best practice in presentation. (13 marks)$q_i$,
 'C1a', 'evaluate', 3, 13, 'analysis_and_evaluation,scepticism',
$ma_i$Alignment with mission and objectives
Aldermere's mission and all three strategic objectives are about keeping high-value members: retention, revenue per member, and premium-club occupancy. The report is misaligned with every one of them. It leads with total revenue and total member headcount — neither of which is a strategic objective — while the three metrics that actually measure the objectives (retention, revenue per member, occupancy) are absent entirely. The board therefore cannot use this report to judge whether the premium strategy is working, which is the one thing it needs to know ahead of a sale.

Needs of the users
The board's role is strategic oversight of the retention-led premium strategy for a PE owner preparing to sell. A report that surfaces total headcount but not retention actively misleads that oversight: headcount can rise (as it has, up 9%) while retention falls sharply, because a surge of new joiners masks members leaving. The report gives prominence to the comforting number while omitting the worrying one — the opposite of what its users need.

Information overload and relevance
At 31 pages of club-by-club utility costs, maintenance logs and staff-grade headcount, the report buries any signal under operational detail the board does not need. This is overload of the wrong information: it is simultaneously too long (operational minutiae) and too thin (no objective metrics). The CEO's observation that board members read only the first page confirms the report fails to communicate — the volume defeats its purpose.

Best practice in presentation
The report lacks the basics of good board reporting: no narrative commentary, no comparison against the board's own objectives or targets, and no exception flagging. It leads with vanity metrics celebrated in the covering note. Best practice would open with the three objective metrics against target, exception-flag the adverse ones, and confine the club-level P&L to an annex.

Scepticism
The board should be sceptical of a report that reports rising total headcount while the strategy is explicitly about retention, not acquisition. The design of the report — foregrounding acquisition-flattered headcount, omitting retention — is precisely what allows a retention problem to grow unseen, and the coincidence of celebrated headcount growth with an omitted retention figure warrants challenge rather than reassurance.

Conclusion
The report is not suitable. Its faults are structural, not cosmetic: it measures the wrong things, omits the right ones, and its design masks the strategic risk the board most needs to see. It should be rebuilt around the three objectives with exception-flagged commentary.$ma_i$,
$hint_i$The single biggest trap here is to start assessing Aldermere's performance — whether the club chain is doing well or badly — instead of assessing the report. The question asks whether the report lets the board judge performance. Anchor every point to the report against a criterion: does it track the mission and the three objectives? does it serve the board's needs? is it overloaded? is it well presented? Judge the report, not the company.$hint_i$,
$fr_i$The dominant failure the examiner flags on exactly this question type is answering a different question: candidates evaluate the company's performance (is retention good or bad, is revenue up) instead of evaluating the report itself. That scores few marks however well argued. The mark-worthy discipline is to assess the report against each stated criterion: alignment with the mission and the three objectives (it leads with revenue and headcount, both non-objectives, and omits retention, revenue-per-member and occupancy entirely); the board's needs as users (rising headcount masks falling retention, so the report misleads the very oversight it exists to serve); information overload (31 pages of operational detail, too long and too thin at once); and presentation best practice (no commentary, no target comparison, no exception flagging). The decisive higher-level move — and the source of the scepticism marks — is to see that the report's design is not merely incomplete but actively conceals the strategic risk: foregrounding acquisition-flattered headcount while omitting retention lets a retention problem grow unseen. A strong answer concludes the report is structurally unsuitable and would be rebuilt around the objectives, rather than listing presentational tweaks.$fr_i$),

-- (ii) C1e [3] Prepare narrative commentary — 7 marks — communication
('a1000000-0000-4000-8000-0000000000c1', 2,
 '(ii) Narrative commentary',
 $q_ii$Using the data in Appendix 1, prepare a concise narrative commentary on the year's performance that could be included in a redesigned board report. (7 marks)$q_ii$,
 'C1e', 'prepare', 3, 7, 'communication',
$ma_ii$Suggested narrative commentary

Headline. Total revenue grew 6% to EUR 61.2m, but this growth masks a deterioration in the business the board's strategy depends on. The increase appears acquisition-driven, with new joiners up 21%, while underlying member value fell.

Retention — the year's critical issue. Member retention fell from 82% to 74%. Because a large intake of new members lifted total headcount by 9%, the report's headline numbers rose even as the company lost existing members faster than before. For a strategy built on keeping high-value members for the long term, this is the most important — and most adverse — movement of the year, and it is concentrated in the two newest regions (Andalusia and northern Portugal) where budget competitors have opened nearby.

Member value and occupancy. Revenue per member fell 4% and add-on revenue was flat despite more members, indicating the growth is coming from lower-value members who are not taking the premium add-ons the strategy relies on. Premium-club occupancy of 61% against a 75% target compounds the problem: under-used premium clubs carry high fixed costs, so falling utilisation puts pressure on margin.

The signals connect. Falling retention, falling revenue per member, flat add-ons and low occupancy are one story, not four: the data suggests Aldermere may be acquiring lower-commitment members in competitive regions who leave sooner and spend less, while the premium proposition that should retain and monetise members is weakening.

Priority. Ahead of the planned sale, the board should treat retention in the two exposed regions as the priority, and should not read headcount and revenue growth as evidence the strategy is working.$ma_ii$,
$hint_ii$Don't restate the appendix — the board can read the numbers. A commentary interprets: explain what the data means and why. The key move is to notice the numbers pull in opposite directions (revenue and headcount up, but retention, revenue-per-member and occupancy down) and to explain that the growth masks a retention problem. Connect the signals into one story, lead with the honest headline, and flag the two-region churn as the exception.$hint_ii$,
$fr_ii$The examiner's most common criticism of commentary requirements is that candidates restate the figures ("revenue rose 6%, retention fell to 74%") without interpreting them — which is transcription, not commentary, and scores little. The mark-worthy move is to explain what happened and why, and to distinguish signal from noise: the 6% revenue rise is acquisition-driven and should not reassure, because retention (the strategic metric) fell from 82% to 74% while a 21% intake of new joiners masked the loss in the headline headcount. The decisive skill is connecting the signals into a single narrative — falling retention, falling revenue per member, flat add-ons and sub-target occupancy are one likely story of lower-value members churning in competitive regions, not four separate facts — and exception-flagging the two-region concentration. A strong commentary leads with the honest headline that growth masks a retention problem, ties the picture to the premium strategy and the imminent sale, and explicitly warns the board not to read headcount growth as success — all in a concise, board-appropriate register rather than a data dump.$fr_ii$);

-- =============================================================================
-- POST-INSERT VERIFICATION:
--   select c.title, c.section, c.status, c.published,
--          (select count(*) from acca_case_exhibits e where e.case_id=c.id) as exhibits,
--          (select count(*) from acca_case_requirements r where r.case_id=c.id) as requirements,
--          (select sum(marks_guide) from acca_case_requirements r where r.case_id=c.id) as technical_marks
--   from acca_cases c where c.id='a1000000-0000-4000-8000-0000000000c1';
--   -- expect: Aldermere Fitness | B | candidate | false | 4 exhibits | 2 requirements | 20 technical_marks
-- =============================================================================
