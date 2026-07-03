-- =============================================================================
-- APM Section B case #4 — C-anchored (Performance reporting: misleading data) — CANDIDATE
-- Orlen Cinemas | 25 marks (20 technical + 5 professional skills)
-- =============================================================================
-- GATE SAFETY: status='candidate', published=false — does not serve until
-- adversarial QA clears and both flags flip.
-- Built against S26-J27 syllabus, Section C1 (C1b visualisation [2], C1c
-- misleading numerical presentation [3], C1d misleading narrative [3]).
-- Distinct from Aldermere (C1a/C1e). Staged failure modes:
--   (i)  evaluate the CHARTS and how the numbers mislead — not the company's
--        performance; each chart has a specific, checkable defect
--   (ii) challenge the commentary against the underlying data (Exhibit 4),
--        not paraphrase it
-- Fixed case_id; re-seed by deleting the case (children cascade).
-- =============================================================================

-- 1. CASE -------------------------------------------------------------------
insert into acca_cases
  (id, section, anchor_area, title, scenario_intro, response_format,
   total_marks, professional_skills_marks, status, published)
values
('a4000000-0000-4000-8000-0000000000c2',
 'B', 'C1', 'Orlen Cinemas',
 $sc4$It is now 1 September 20X5. You are a performance management adviser engaged by the audit committee of Orlen Cinemas. Ahead of a board vote on executive bonuses, the committee has asked you to respond to the requirements below, using the information in the exhibits provided. Professional marks are available for the demonstration of skill in analysis and evaluation and scepticism in your answer.$sc4$,
 'report', 25, 5, 'candidate', false);

-- 2. EXHIBITS ---------------------------------------------------------------
insert into acca_case_exhibits (case_id, exhibit_order, title, body) values
('a4000000-0000-4000-8000-0000000000c2', 1, 'Company background',
$e4a$Orlen Cinemas (Orlen) operates a chain of cinemas across several European cities. Its revenue comes from ticket sales and from food and drink concessions. The board assesses executive performance annually against growth in revenue, admissions (tickets sold) and operating profit, and the chief executive''s bonus vote takes place next month. The performance pack presented to the board was prepared under the direction of the executive team. The audit committee has asked for an independent view of the pack before the vote.$e4a$),
('a4000000-0000-4000-8000-0000000000c2', 2, 'The four charts in the performance pack',
$e4b$Chart 1 — "Revenue growth": a bar chart of annual revenue for 20X4 and 20X5. The vertical axis begins at EUR 91.5m rather than zero. The 20X5 bar appears roughly three times the height of the 20X4 bar.

Chart 2 — "Admissions momentum": a line chart of cumulative admissions across the year, month by month. The line rises steadily from January to December. The chart carries the caption "admissions climbing all year".

Chart 3 — "Revenue mix": a three-dimensional pie chart, tilted, showing ticket revenue and concession revenue. The concession segment is placed at the front of the tilt. The segments are not labelled with percentages.

Chart 4 — "Profit trend": a line chart labelled "operating profit (3-year rolling average)" showing a gently rising line across four years. No single-year profit figures are shown anywhere in the pack.$e4b$),
('a4000000-0000-4000-8000-0000000000c2', 3, 'Extract from the chief executive''s narrative commentary',
$e4c$"20X5 was a record year. Revenue reached an all-time high of EUR 94.2m, and our admissions momentum continued throughout the year, as the pack''s charts show. Compared with 20X2, admissions are up 31% — clear evidence that our strategy is working. Adjusted operating profit rose to EUR 12.1m. Cost pressures during the year were entirely driven by industry-wide inflation and were outside management''s control. The refurbishment programme, treated as a one-off cost, positions us strongly for the future."$e4c$),
('a4000000-0000-4000-8000-0000000000c2', 4, 'Underlying data assembled by the audit committee',
$e4d$	20X2	20X3	20X4	20X5
Revenue (EUR m)	71.5	86.0	92.4	94.2
Admissions (m tickets)	9.4	12.6	13.1	12.3
Average ticket price (EUR)	4.60	4.85	5.05	5.50
Operating profit (EUR m)	6.2	10.9	11.8	9.6
"Adjusted operating profit" (EUR m)	7.0	11.4	12.3	12.1
Refurbishment costs excluded from adjusted profit (EUR m)	0.8	0.5	0.5	2.5

Notes assembled by the committee:
1. 20X2 was the year in which several of Orlen''s cities imposed public-gathering restrictions for part of the year, materially reducing admissions across the industry.
2. Refurbishment costs have been incurred in each of the last four years. The 20X5 programme covered six cinemas; a further nine are scheduled for refurbishment over the next two years.
3. Monthly (non-cumulative) admissions in 20X5 were lower than the same month of 20X4 in nine of the twelve months, with the shortfall widening in the second half.$e4d$);

-- 3. REQUIREMENTS -----------------------------------------------------------
-- (i) C1b/C1c — charts + misleading numerical presentation — 13 marks — A&E + scepticism
insert into acca_case_requirements
  (case_id, requirement_order, label, question, lo_code, command_verb,
   intellectual_level, marks_guide, professional_skill_tags, model_answer, hint, full_reveal)
values
('a4000000-0000-4000-8000-0000000000c2', 1,
 '(i) The charts and numerical presentation',
 $q4i$Evaluate the four charts in the performance pack (Exhibit 2) and advise the audit committee on how the presentation of numerical data in the pack could mislead the board, using the underlying data in Exhibit 4. (13 marks)$q4i$,
 'C1c', 'advise', 3, 13, 'analysis_and_evaluation,scepticism',
$m4i$Chart 1 — truncated axis
Starting the vertical axis at EUR 91.5m turns 1.9% revenue growth (92.4 to 94.2) into a bar three times the height of last year''s: the visible heights are 0.9 and 2.7 above the baseline, a 3:1 ratio manufactured by the axis choice. The visual message — dramatic growth — is not supported by the data; drawn from zero, the two bars would be nearly identical. The committee should require value axes to start at zero for magnitude comparisons, or the growth rate to be stated on the chart.

Chart 2 — cumulative series
A cumulative admissions line rises by construction: it can only ever go up while any tickets at all are being sold, so "climbing all year" describes the arithmetic of accumulation, not performance. The underlying data shows the opposite of momentum — admissions fell from 13.1m to 12.3m (down about 6%), and monthly admissions trailed the prior year in nine of twelve months, worsening in the second half. Presenting the one series that cannot fall, in the year admissions declined, is the pack''s most seriously misleading choice. The committee should require monthly admissions against prior year, not a cumulative line.

Chart 3 — 3D pie
A tilted three-dimensional pie distorts the area each segment appears to occupy — the segment at the front of the tilt is visually enlarged — and with no percentage labels the board cannot correct the distortion by reading values. If the mix matters, a flat labelled chart (or a simple table) shows it honestly.

Chart 4 — rolling average with no single-year figures
A three-year rolling average smooths a series; combined with the omission of any single-year profit figure anywhere in the pack, it conceals the year that matters to this bonus decision. The underlying data shows operating profit fell from EUR 11.8m to 9.6m — a decline of nearly a fifth — while the smoothed line "gently rises" because it still carries the strong 20X3 and 20X4 years. A rolling average is legitimate as a supplement; as the only profit presentation, in a pack supporting a bonus vote, it is concealment. Single-year profit must be shown.

The numbers behind the presentation
Read together with Exhibit 4, the pack''s numerical choices consistently flatter: revenue growth was not volume-driven — admissions fell about 6% while the average ticket price rose about 9%, so the record revenue appears to be supported by pricing rather than demand — and every chart choice (truncated axis, cumulative series, unlabelled 3D pie, smoothed profit) leans in the flattering direction. One such choice could be carelessness; four aligned choices, in a pack prepared under the executive team ahead of its own bonus vote, warrant the committee''s scepticism about the pack as a whole.

Advice
Require: zero-based or annotated axes; monthly (non-cumulative) admissions against prior year; labelled 2D mix presentation; single-year profit alongside any average; and the growth decomposition (price versus volume) stated plainly. The committee should not rely on this pack for the bonus decision until re-presented on that basis.$m4i$,
$h4i$Don''t evaluate Orlen''s performance — evaluate the charts. Take each of the four in turn: what design choice has been made, and what would the board conclude from the chart that Exhibit 4''s data doesn''t support? Chart 2 is the sharpest: what does a cumulative line do that a monthly line doesn''t — can it ever go down? Then step back: what do the four choices have in common, and what''s happening next month?$h4i$,
$f4i$The examiner''s failure modes here are analysing the company instead of the presentation, and describing chart types in theory instead of testing each chart against the data. The mark-winning structure is chart by chart, defect plus evidence plus fix: (1) truncated axis makes 1.9% growth look like tripling — require zero-based or annotated axes; (2) a cumulative admissions line rises by construction and cannot fall, in a year when admissions actually fell 6% and trailed prior year in nine of twelve months — the most misleading chart in the pack; require monthly against prior year; (3) a tilted, unlabelled 3D pie enlarges the front segment and offers no values to correct by — require flat, labelled presentation; (4) a three-year rolling average, with single-year profit omitted from the entire pack, hides a fall from 11.8 to 9.6 — require single-year figures alongside any average. Then the synthesis marks: revenue growth is presented without explaining that admissions fell while average ticket price rose about 9%, and all four presentation choices flatter in the same direction, in a pack prepared under the executives ahead of their own bonus vote — the pattern, and its timing, is itself the finding. Strong answers end with concrete re-presentation requirements and advise the committee not to rely on the pack until then.$f4i$),

-- (ii) C1d — misleading narrative commentary — 7 marks — scepticism
('a4000000-0000-4000-8000-0000000000c2', 2,
 '(ii) The narrative commentary',
 $q4ii$Advise the audit committee on how the chief executive''s narrative commentary (Exhibit 3) could give the board a misleading impression of performance, using the underlying data in Exhibit 4. (7 marks)$q4ii$,
 'C1d', 'advise', 3, 7, 'scepticism',
$m4ii$"A record year" and "all-time high revenue"
Literally true and materially incomplete. Revenue of EUR 94.2m is the highest in the table, but it grew 1.9% while admissions fell 6% and average ticket price rose 9% — the growth was not volume-driven, so the record says little about underlying demand. A commentary that leads with the record and omits the volume decline steers the board to the wrong conclusion about underlying health.

"Admissions momentum continued throughout the year"
Contradicted by the committee''s own data: admissions fell year on year and trailed the prior year in nine of twelve months, worsening in the second half. The claim leans on the cumulative chart (which can only rise) rather than on performance. This is the commentary''s clearest misstatement and the board should be told so directly.

"Compared with 20X2, admissions are up 31%"
A selective baseline. 20X2 was suppressed by public-gathering restrictions across the industry, so growth measured from it flatters any subsequent year. Against the most recent year — the relevant comparison for this year''s performance — admissions are down. Choosing the one baseline that turns a decline into growth is cherry-picking.

"Adjusted operating profit rose to EUR 12.1m"
The claim is imprecise and the framing misleading. Adjusted operating profit did not rise year on year — it fell slightly, from EUR 12.3m to EUR 12.1m. More importantly, the adjusted figure is presented instead of statutory operating profit, which fell from EUR 11.8m to EUR 9.6m, a difference created by excluding EUR 2.5m of refurbishment cost. But refurbishment has been incurred in each of the last four years and nine more cinemas are scheduled over the next two — describing it as "one-off" mislabels a recurring, and currently growing, cost of operating the estate. The adjustment turns a statutory fall into a more favourable adjusted figure by excluding a recurring — and currently expanding — programme, not a genuine one-off.

"Cost pressures were entirely driven by industry-wide inflation and outside management''s control"
An unevidenced assertion of non-controllability. "Entirely" forecloses examination: the committee should ask what portion of cost growth is volume, mix or management choice before accepting that none of it was controllable — particularly in the period used to justify a bonus.

Overall advice
Each claim is either literally-true-but-incomplete or contradicted by the data, and every one leans in the flattering direction ahead of the bonus vote. The committee should require the commentary to be re-presented against the statutory numbers, the prior-year baseline, and a clear statement of the recurring nature of refurbishment — and should treat unevidenced non-controllability claims as assertions to be tested, not facts.$m4ii$,
$h4ii$Don''t paraphrase the commentary — test it. Take each claim in Exhibit 3 and put it next to Exhibit 4: is it false, or literally true but missing the fact that changes its meaning? Watch the baseline in the "up 31%" claim (what was special about 20X2?), and the word "one-off" (check the refurbishment row — how often does this cost occur, and what''s coming?).$h4ii$,
$f4ii$The examiner''s failure mode on commentary questions is paraphrasing the narrative instead of challenging it against the data. The scoring pattern is claim by claim: (1) "record revenue" — literally true, materially incomplete: 1.9% growth while admissions fell 6% and ticket price rose 9% — not volume-driven; (2) "admissions momentum" — contradicted outright: down year on year, behind prior year in nine of twelve months; (3) "up 31% since 20X2" — cherry-picked baseline: 20X2 was restriction-suppressed, and against the relevant prior-year comparison admissions fell; (4) "adjusted profit rose" — false even on its own terms (adjusted fell 12.3 to 12.1), while statutory profit fell 11.8 to 9.6 and the adjustment excludes EUR 2.5m of refurbishment that has recurred four years running with nine more cinemas scheduled — "one-off" mislabels a recurring, growing cost; (5) "entirely industry-wide inflation, outside management''s control" — an unevidenced totalising claim that should be tested, not accepted. The synthesis mark: every claim flatters in the same direction ahead of the executives'' own bonus vote, so the committee should require re-presentation against statutory figures and honest baselines. Strong answers name each technique (selective baseline, adjusted-metric substitution, mislabelled one-off, unevidenced non-controllability) rather than just disagreeing with the numbers.$f4ii$);

-- =============================================================================
-- POST-INSERT VERIFICATION:
--   select c.title, c.section, c.status, c.published,
--          (select count(*) from acca_case_exhibits e where e.case_id=c.id) as exhibits,
--          (select count(*) from acca_case_requirements r where r.case_id=c.id) as requirements,
--          (select sum(marks_guide) from acca_case_requirements r where r.case_id=c.id) as technical_marks
--   from acca_cases c where c.id='a4000000-0000-4000-8000-0000000000c2';
--   -- expect: Orlen Cinemas | B | candidate | false | 4 | 2 | 20
-- =============================================================================
