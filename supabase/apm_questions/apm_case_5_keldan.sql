-- =============================================================================
-- APM Section A case #5 — 50-mark case study — CANDIDATE
-- Keldan Foods | 50 marks (40 technical + 10 professional skills, all four)
-- =============================================================================
-- GATE SAFETY: status='candidate', published=false.
-- Built against S26-J27. Section A blueprint: one organisation, report-to-the-
-- board frame, three requirement parts, topics across syllabus sections A/B/C,
-- all four professional skills. Staged failure modes:
--   (i)  evaluate the REPORT against mission/objectives (not the company),
--        with required calculations (A3b) — C1a anchor
--   (ii) evaluate the consultant's proposed KPIs (not suggest new ones;
--        not describe the BSC) — A1f/A2c anchor
--   (iii) evaluate the reward link, incl. adverse consequences (WGMGD) — B2e
-- Fixed case_id; re-seed by deleting the case (children cascade).
-- =============================================================================

-- 1. CASE -------------------------------------------------------------------
insert into acca_cases
  (id, section, anchor_area, title, scenario_intro, response_format,
   total_marks, professional_skills_marks, status, published)
values
('a5000000-0000-4000-8000-0000000000a1',
 'A', null, 'Keldan Foods',
 $sc5$It is now 1 September 20X5. You are a performance management adviser engaged by Keldan Foods. Write a report to the board of Keldan Foods responding to its instructions for work in the areas set out in the requirements, using the information in the exhibits provided. Professional marks will be awarded for the demonstration of skill in communication, analysis and evaluation, scepticism and commercial acumen in your answer.$sc5$,
 'report', 50, 10, 'candidate', false);

-- 2. EXHIBITS ---------------------------------------------------------------
insert into acca_case_exhibits (case_id, exhibit_order, title, body) values
('a5000000-0000-4000-8000-0000000000a1', 1, 'Company background',
$k5a$Keldan Foods (Keldan) is a listed manufacturer of premium chilled ready meals, sold through supermarket chains and independent food stores across several countries. The market is growing, but discounter own-brand ranges are taking share at the value end, and the large supermarket customers press continually for price reductions. Keldan's board believes the company can only defend its premium prices through recognised product quality and a steady stream of new recipes.$k5a$),
('a5000000-0000-4000-8000-0000000000a1', 2, 'Mission and strategic objectives',
$k5b$Keldan's mission is: "to create the meals people choose first — through excellent quality, continuous innovation and the value this builds for our shareholders." From the mission, the board has set three strategic objectives: (1) deliver market-leading product quality; (2) maintain a leading rate of new product innovation; and (3) grow shareholder value.$k5b$),
('a5000000-0000-4000-8000-0000000000a1', 3, 'Current board reporting',
$k5c$The monthly board report is a financial pack produced by the finance team. It presents revenue, operating profit and profit for the period against the prior year, together with a balance-sheet summary. The covering note to the most recent pack highlights that "revenue is at a record level and growing strongly." The pack contains no measures of product quality (such as complaint rates, product returns or independent quality ratings) and no measures of innovation (such as new products launched or revenue from recent launches). No targets are shown against any figure, and several measures the board has asked about in meetings — return on capital employed, operating margin and earnings per share — are not calculated in the pack. Appendix 1 sets out the data from the most recent pack.$k5c$),
('a5000000-0000-4000-8000-0000000000a1', 4, 'Appendix 1 — Extract from the board pack (years ended 30 June)',
$k5d$	20X5	20X4
Revenue (EUR m)	412.0	388.7
Operating profit (EUR m)	33.0	35.0
Profit for the year (EUR m)	21.4	23.1
Equity (EUR m)	120.0	116.0
Non-current liabilities (EUR m)	84.0	80.0
Number of ordinary shares (m)	50.0	50.0

The board has requested the following measures, which are not calculated in the pack: return on capital employed (operating profit / (equity + non-current liabilities)), operating profit margin, earnings per share, and revenue growth.$k5d$),
('a5000000-0000-4000-8000-0000000000a1', 5, 'Consultant''s proposed balanced scorecard (extract)',
$k5e$A consultant engaged by the CEO has proposed that Keldan adopt a balanced scorecard, and has provided example measures for two of the perspectives. The consultant states these were used successfully by another client.

Customer perspective:
- Market share of the chilled ready-meals category
- Customer satisfaction score (consumer survey)
- Number of price reductions granted to supermarket customers

Innovation and learning perspective:
- Percentage of revenue from products launched in the last three years
- Number of staff training days delivered
- Revenue per employee

The CEO has asked for an evaluation of whether Keldan should use these measures. He has specifically asked that no new measures be suggested at this stage.$k5e$),
('a5000000-0000-4000-8000-0000000000a1', 6, 'Proposed executive reward scheme',
$k5f$The remuneration committee has proposed a new annual bonus scheme. The chief executive and all senior managers would receive a bonus of up to 40% of salary, determined entirely by a single measure: growth in total revenue over the prior year. The committee's note argues that "revenue is simple, visible and cannot be manipulated, and a single company-wide measure will unite management behind growth." The scheme would apply from the current financial year.$k5f$);

-- 3. REQUIREMENTS -----------------------------------------------------------
-- (i) C1a + A3b — calcs + evaluate the current report — 16 marks — comm + A&E
insert into acca_case_requirements
  (case_id, requirement_order, label, question, lo_code, command_verb,
   intellectual_level, marks_guide, professional_skill_tags, model_answer, hint, full_reveal)
values
('a5000000-0000-4000-8000-0000000000a1', 1,
 '(i) The current board report',
 $q5i$Perform the calculations the board has requested (Appendix 1) and evaluate whether the current board report allows the board to judge Keldan's performance against its mission and strategic objectives. Note: there are 4 marks available for the calculations and 12 marks for the evaluation. (16 marks)$q5i$,
 'C1a', 'evaluate', 3, 16, 'communication,analysis_and_evaluation',
$m5i$Calculations (20X5; 20X4)
Return on capital employed (operating profit / (equity + non-current liabilities)): 33.0/204.0 = 16.2%; 35.0/196.0 = 17.9%.
Operating profit margin: 33.0/412.0 = 8.0%; 35.0/388.7 = 9.0%.
Earnings per share: 21.4/50.0 = EUR 0.43; 23.1/50.0 = EUR 0.46.
Revenue growth: (412.0 − 388.7)/388.7 = 6.0%.

Evaluation against the mission and objectives
The mission commits Keldan to quality, innovation and shareholder value, and the three objectives restate exactly those. The report should therefore be judged on whether it lets the board see progress on each. It does not.

Quality (objective 1): the report contains no quality measure at all — no complaint rates, returns or independent ratings — despite the board's view that premium pricing can only be defended through recognised quality. The board cannot see the one thing its strategy most depends on.

Innovation (objective 2): equally absent. There is no measure of new products launched or of revenue from recent launches, so the board cannot judge whether the "steady stream of new recipes" the strategy requires is being produced.

Shareholder value (objective 3): the report shows profit figures but, until the requested calculations are done, none of the measures the board itself asked for. The completed calculations tell a different story from the covering note: revenue grew 6.0%, but operating margin fell from 9.0% to 8.0%, ROCE fell from 17.9% to 16.2%, and EPS fell from EUR 0.46 to EUR 0.43. Every requested profitability or return measure moved against shareholders while the pack's covering note celebrated "record revenue growing strongly." The report is not merely incomplete; its framing points the board towards the one figure that improved.

User needs and presentation: the pack shows no targets against any figure, so even the financial content cannot be judged as good or bad; and the measures the board has explicitly requested in meetings are still not calculated, which suggests the report is produced for the finance team's convenience rather than the board's decisions.

Conclusion: the report allows the board to monitor short-term financial outcomes only, is silent on two of the three strategic objectives, omits the return measures relevant to the third, carries no targets, and frames a year of declining returns as a success. It is not fit to judge performance against the mission and should be rebuilt around the three objectives with targets and trend data.$m5i$,
$h5i$Do the four calculations first — they change the story. Then evaluate the report, not the company: take each of the three objectives in turn and ask what in the pack lets the board judge progress on it. Watch the covering note against your completed numbers: what does "record revenue" leave out?$h5i$,
$f5i$The examiner's most-cited failure on this requirement type is evaluating the company's performance instead of the report, and skipping or fumbling the basic calculations. The calculations: ROCE 33.0/(120.0+84.0)=16.2% vs 35.0/(116.0+80.0)=17.9%; operating margin 8.0% vs 9.0%; EPS EUR 0.43 vs EUR 0.46; revenue growth 6.0%. The evaluation that scores is objective-by-objective: quality — no measure at all despite being the strategy's foundation; innovation — no measure of launches or revenue from recent products; shareholder value — the requested return measures were missing, and once calculated they all declined while the covering note celebrated record revenue, meaning the report's framing actively misleads. Add the structural gaps — no targets, board-requested measures ignored — and conclude the report cannot support judgement against the mission and needs rebuilding around the objectives. Marks are lost by listing generic report-quality criteria without tying each point to Keldan's specific mission, objectives and data.$f5i$),

-- (ii) A1f/A2c — evaluate the consultant's BSC measures — 14 marks — scepticism + A&E
('a5000000-0000-4000-8000-0000000000a1', 2,
 '(ii) The consultant''s proposed scorecard measures',
 $q5ii$Evaluate whether Keldan should use the measures proposed by the consultant for the customer perspective and the innovation and learning perspective (Exhibit 5). You have been specifically asked not to suggest any new measures. (14 marks)$q5ii$,
 'A1f', 'evaluate', 3, 14, 'scepticism,analysis_and_evaluation',
$m5ii$The right test is whether each measure would tell Keldan's board something about achieving Keldan's objectives — not whether the measures worked for the consultant's other client, whose strategy and market are unknown. That provenance is itself a reason for scepticism: measures should be derived from Keldan's critical success factors, not imported.

Customer perspective
Market share of the chilled ready-meals category: relevant and worth using, but not as a standalone measure. The scenario describes discounters taking share at the value end; share tracks whether Keldan's premium positioning is holding. But total-category share could be bought with the price reductions the supermarkets demand, or by chasing value-end volume — so it must be read alongside margin, and the board should be clear whether it is tracking total category share or share of the premium segment.

Customer satisfaction score: appropriate in principle — quality is objective 1 and satisfaction is the customer's verdict on it. Care is needed over whose satisfaction is measured: Keldan's direct customers are supermarkets and stores, while the survey measures consumers. Both matter to the strategy (consumer pull defends premium prices; retailer satisfaction defends shelf space), so the board should be clear which this score captures and not treat one as a proxy for the other.

Number of price reductions granted to supermarket customers: not a customer-perspective measure of performance and Keldan should not use it as proposed. A count of concessions is ambiguous — fewer reductions could mean strong products or lost listings; more could mean weakness or a deliberate volume strategy. It measures an outcome of negotiating pressure, not customer value delivered, and as a KPI it could perversely encourage managers to refuse commercially sensible concessions simply to protect the count.

Innovation and learning perspective
Percentage of revenue from products launched in the last three years: the strongest proposed measure. It directly operationalises objective 2 — a leading rate of innovation that the market actually buys — and it captures outcome (revenue) rather than activity. Keldan should adopt it, provided "new product" is clearly defined so the measure is not inflated by minor relaunches or by cannibalisation of existing lines.

Number of staff training days delivered: an input, not an outcome. Days can be delivered without capability improving, and the measure invites exactly that — filling training rooms to hit a number. It sits legitimately in learning and growth territory but as proposed it measures effort, not learning; at minimum the board should treat it as context, not a KPI.

Revenue per employee: a productivity or efficiency measure with no natural home in the innovation and learning perspective — it belongs, if anywhere, in a financial or internal-process view. Placing it here suggests the consultant's set was not built from Keldan's objectives. It also duplicates the revenue emphasis the current report already over-weights, and could reward headcount cuts rather than innovation.

Conclusion
Adopt market share and revenue-from-recent-launches; adopt customer satisfaction with clarity about whose satisfaction; reject the price-reduction count and revenue per employee as proposed; treat training days as context. More broadly, the board should require measures derived from Keldan's own critical success factors rather than imported from another client — the misplacements above are the visible symptom of that missing derivation.$m5ii$,
$h5ii$Don't describe what the balanced scorecard is, and don't suggest replacements — evaluate each of the six measures as proposed. For each: would it tell the board something about Keldan's objectives? Is it an outcome or just activity? Is it even in the right perspective? And stay sceptical about the consultant's "it worked for another client" — is that a reason it fits Keldan?$h5ii$,
$f5ii$The examiner's failures here: describing the BSC instead of evaluating the measures, suggesting new KPIs despite the explicit instruction not to, and accepting the consultant's provenance claim uncritically. The scoring pattern is measure-by-measure with a verdict: market share — fits the discounter threat and premium positioning, use it (read with margin); customer satisfaction — right idea, but be precise whether it measures consumers or the supermarket customers, both of which matter differently; price-reduction count — ambiguous, measures negotiating pressure not customer value, and could perversely deter sensible concessions: reject as proposed; revenue-from-recent-launches — the best of the six, an outcome measure that operationalises the innovation objective: adopt, with "new product" tightly defined against relaunches and cannibalisation; training days — input not outcome, invites activity without learning: context at best; revenue per employee — wrong perspective entirely (efficiency, not innovation/learning), duplicates the revenue fixation and could reward headcount cuts: reject as placed. The scepticism marks sit in challenging the imported-from-another-client provenance and in spotting that the misplaced measures reveal a set not derived from Keldan's CSFs. Marks are lost for generic BSC theory and for ignoring the no-new-measures instruction.$f5ii$),

-- (iii) B2e — the revenue-only bonus scheme — 10 marks — commercial acumen
('a5000000-0000-4000-8000-0000000000a1', 3,
 '(iii) The proposed reward scheme',
 $q5iii$Evaluate the proposed executive bonus scheme (Exhibit 6), including the potential consequences of linking reward to the proposed measure. (10 marks)$q5iii$,
 'B2e', 'evaluate', 3, 10, 'commercial_acumen',
$m5iii$What the scheme would reward
The scheme pays up to 40% of salary on a single measure: revenue growth. Appendix 1 shows what that would have meant this year: revenue grew 6.0% while operating margin, ROCE and EPS all fell — so the scheme would have rewarded management, potentially materially depending on the bonus scale, for a year in which every shareholder-relevant profitability and return measure declined. A bonus scheme that could pay out in exactly the conditions shareholders should worry about is misaligned with objective 3 by construction.

What gets measured gets done — and what would get done here
Tying all reward to revenue tells every senior manager that top-line sales are the only thing that matters. The predictable behaviours in Keldan's specific market: concede the price reductions the supermarkets are pressing for, protecting or growing sales volumes potentially at the cost of margin; push volume into the value end where the discounters compete (revenue grows, premium positioning weakens); and deprioritise anything that does not book revenue this year — including the quality and innovation work that objectives 1 and 2, and the mission itself, depend on. The scheme actively pulls against two of the three strategic objectives and is indifferent to the third's substance.

The committee's claims
"Revenue cannot be manipulated" is optimistic: revenue is one of the more manageable figures — through trade promotions, discounting, channel stuffing towards year-end, and the timing of deals with large customers — precisely the levers this scheme incentivises. "A single company-wide measure will unite management" is half-true: it will align managers, but on the wrong target; unity behind margin-eroding growth is worse than none. Simplicity and visibility are genuine virtues in reward design, but they cannot substitute for measuring the right things.

Design points
The scheme also makes no distinction between performance that managers control and market growth they do not (the category itself is growing, so bonuses would part-pay for tide, not swimming); it is entirely annual, inviting short-term revenue at long-term cost; and applying one identical measure to all senior managers ignores that most cannot influence group revenue directly.

Conclusion
Reject the scheme as proposed. Reward linked to performance is legitimate, but the link must be to a balanced set — profitability or returns alongside revenue, plus the quality and innovation outcomes the strategy depends on (which is precisely what the scorecard work in (ii) is for) — with some control for market growth and a horizon longer than one year.$m5iii$,
$h5iii$Test the scheme against this year's actual numbers first: what would it have paid, and for what? Then apply "what gets measured gets done" to Keldan specifically — if your entire bonus was revenue growth, what would you do about the supermarkets' price demands, the discounter threat, and the quality/innovation work? Finally, challenge the committee's two claims — is revenue really unmanipulable?$h5iii$,
$f5iii$The examiner rewards evaluation applied to the scenario, not a generic list of bonus-scheme pros and cons. The scoring moves: (1) test against the data — this year the scheme could have paid bonuses despite margin, ROCE and EPS all falling, so it rewards exactly what shareholders should fear; (2) WGMGD applied to Keldan — a revenue-only target predicts conceding supermarket price demands (protecting volume potentially at the cost of margin), chasing value-end volume against the discounters, and starving quality and innovation, i.e. it pulls against objectives 1 and 2 while hollowing out 3; (3) challenge the committee's assertions — revenue is manipulable (promotions, discounting, year-end deal timing) and a single measure unites management on the wrong target; (4) design flaws — no controllability adjustment in a growing category, annual horizon invites short-termism, identical measure for managers with no influence on group revenue. Conclude: reject as proposed; link reward to a balanced set including returns and the quality/innovation outcomes, with a longer horizon. Marks are lost for theory-only answers and for failing to use the Appendix 1 numbers as evidence.$f5iii$);

-- =============================================================================
-- POST-INSERT VERIFICATION:
--   select c.title, c.section, c.status, c.published,
--          (select count(*) from acca_case_exhibits e where e.case_id=c.id) as exhibits,
--          (select count(*) from acca_case_requirements r where r.case_id=c.id) as requirements,
--          (select sum(marks_guide) from acca_case_requirements r where r.case_id=c.id) as technical_marks
--   from acca_cases c where c.id='a5000000-0000-4000-8000-0000000000a1';
--   -- expect: Keldan Foods | A | candidate | false | 6 | 3 | 40
-- =============================================================================
