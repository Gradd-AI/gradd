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
-- APM Section B case #2 — D-anchored (Data science & technology) — LIVE
-- Vesla Retail | 25 marks (20 technical + 5 professional skills)
-- =============================================================================
-- SERVING STATE: status='approved', published=true — adversarial QA cleared;
-- live and serving. Reconciled to deployed state by migration 20260708120000.
-- Built against S26-J27 syllabus, Section D. Requirements stage the dominant
-- examiner failure modes:
--   (i)  D2g/D2h — assess the MODEL OUTPUT, not describe what ML is; challenge
--        the analyst's claims (94% accuracy on a 6% base rate) rather than
--        accept them (scepticism)
--   (ii) D1d — assess THIS company's data risks and recommend applied controls,
--        not a generic security theory list
-- Fixed case_id so child rows link deterministically. Re-seed: delete the case
-- first (exhibits/requirements cascade).
-- =============================================================================

-- 1. CASE -------------------------------------------------------------------
insert into acca_cases
  (id, section, anchor_area, title, scenario_intro, response_format,
   total_marks, professional_skills_marks, status, published)
values
('a2000000-0000-4000-8000-0000000000d1',
 'B', 'D2', 'Vesla Retail',
 $sc2$It is now 1 September 20X5. You are a performance management adviser engaged by Vesla Retail. The board has asked you to respond to the requirements below, using the information in the exhibits provided. Professional marks are available for the demonstration of skill in analysis and evaluation, scepticism and commercial acumen in your answer.$sc2$,
 'report', 25, 5, 'approved', true);

-- 2. EXHIBITS ---------------------------------------------------------------
insert into acca_case_exhibits (case_id, exhibit_order, title, body) values
('a2000000-0000-4000-8000-0000000000d1', 1, 'Company background',
$e2a$Vesla Retail (Vesla) is an online homeware retailer operating across several European markets. Customers buy through Vesla's website and mobile app, and most revenue comes from repeat purchasing by an established customer base. The board's stated priority for the year is to reduce customer churn, which it believes is the largest single drag on revenue growth. Around 6% of Vesla's active customers churn in a typical year.$e2a$),
('a2000000-0000-4000-8000-0000000000d1', 2, 'The churn model project',
$e2b$Six months ago Vesla's data team built a machine-learning model intended to predict which customers are likely to churn in the next twelve months, so that marketing can target them with retention offers (discount vouchers and free delivery). The model was trained on customer transaction records from the previous two financial years. Customers who joined Vesla within the last twelve months were excluded from the training data because they do not yet have a full year of purchase history. The earlier of the two training years was the year in which Vesla ran its largest-ever sitewide discounting campaign to clear excess stock.$e2b$),
('a2000000-0000-4000-8000-0000000000d1', 3, 'Extract from the data analyst''s summary report to the board',
$e2c$"The model achieves 94% accuracy in predicting whether a customer will churn, which we consider an excellent result. The strongest predictor found by the model is mobile-app usage: customers who use the app churn far less than customers who only use the website. We therefore recommend that Vesla require customers to download the app at checkout, which the model indicates will reduce churn substantially. The model also finds that customers who contacted customer services more than twice in a year are much more likely to churn. We recommend the marketing team be given the model's full monthly list of flagged customers so that retention vouchers can be issued immediately. The model should be treated as complete: retraining is expensive and the results are already strong."$e2c$),
('a2000000-0000-4000-8000-0000000000d1', 4, 'Data handling and systems environment',
$e2d$The analytics team works as follows. Customer records — including names, contact details, full purchase histories and linked marketing profiles — are exported from the central database as spreadsheet files onto the analysts' own laptops for model work. The team shares a single login to the analytics platform because individual licences were considered too expensive. Charts for board packs are produced by uploading extracts of customer data to a free online visualisation tool. There has been no review of who holds access rights to the customer database since the team was formed, and the account of an analyst who left Vesla four months ago has not been deactivated. Vesla operates under data-protection law in all its markets.$e2d$);

-- 3. REQUIREMENTS -----------------------------------------------------------
-- (i) D2g/D2h [2] Assess model output + advise — 13 marks — A&E + scepticism
insert into acca_case_requirements
  (case_id, requirement_order, label, question, lo_code, command_verb,
   intellectual_level, marks_guide, professional_skill_tags, model_answer, hint, full_reveal)
values
('a2000000-0000-4000-8000-0000000000d1', 1,
 '(i) The churn model output',
 $q2i$Assess the output of the churn model as presented in the analyst's summary report (Exhibit 3), and advise the board on the insights it can safely act on and the refinements required before the model is relied upon. (13 marks)$q2i$,
 'D2g', 'assess', 2, 13, 'analysis_and_evaluation,scepticism',
$m2i$The accuracy claim
The headline 94% accuracy should not be accepted at face value. Around 6% of Vesla's customers churn in a typical year, so a model that simply predicted "no customer will churn" would be about 94% accurate while identifying no churners at all. Accuracy is the wrong measure for such an imbalanced outcome; the board should ask how many actual churners the model correctly identifies (recall), what proportion of flagged customers would actually have churned (precision), and the number and cost of false positives, ideally weighted by the cost of a voucher against the margin retained, since those figures determine whether the retention budget is being aimed at the right people. The output is also a bare flagged/not-flagged list with no probability score, so marketing cannot rank or prioritise the customers most at risk. Until they are reported, the output cannot be relied upon.

The app-usage recommendation
The finding that app users churn less is a correlation in the training data; the analyst's recommendation to force app downloads treats it as a cause. It is at least as plausible that Vesla's most engaged, loyal customers are the ones who choose to install the app — in which case compelling less engaged customers to download it would not make them loyal, and adding friction at checkout could itself increase abandonment. The insight worth acting on is the association; the causal claim needs testing (for example, a controlled trial of app prompts) before any checkout mandate.

Training-data limitations
Two features of the training data limit what the output can say about next year. First, one of the two training years contained Vesla's largest-ever sitewide discounting campaign, so purchasing behaviour in that year is unlikely to represent a normal year — patterns the model learned may partly reflect the promotion rather than durable customer behaviour. Second, customers who joined within the last twelve months were excluded, so the model has not learned from new-customer behaviour and any predictions for that segment may be unreliable; if the scoring process also excludes them, the flagged list will systematically miss a group the board needs to understand, since it needs to know whether recent acquisition is converting into repeat purchasing.

Insights that can be acted on
The customer-services signal — more than two contacts in a year associating with churn — is plausible, actionable and cheap to act on: it suggests a service-friction signal worth investigating as a possible churn driver, regardless of the model. Feeding flagged customers to marketing is reasonable as a pilot, provided the flag quality is first verified (above) and the results of the vouchers are measured against a control group, so Vesla learns whether the intervention works rather than assuming it.

The "model is complete" claim
The recommendation to treat the model as complete should be rejected. Customer behaviour shifts, the training window is already unrepresentative, and the model has never been validated in live use. The board should require periodic retraining and ongoing monitoring of the model's live hit rate; the cost of retraining should be weighed against the cost of a growing retention budget aimed by a decaying model.

Conclusion
The model is a promising start but not yet a safe basis for decisions. Before reliance: report churner-level performance rather than headline accuracy, test the app-usage claim rather than mandating downloads, extend the data to cover new customers and normal trading years, pilot the voucher list against a control group, and schedule retraining.$m2i$,
$h2i$Don't describe what machine learning is, and don't accept the analyst's report at face value — assess the claims in it. Start with the 94%: what does the 6% churn rate tell you about how impressive that figure really is? Then take each recommendation (force the app, use the list, never retrain) and ask: does the model's output actually support this, or is the analyst going beyond what the data shows? Advise what the board can safely act on and what needs fixing first.$h2i$,
$f2i$The examiner's dominant failure modes on this question type are describing the technology instead of assessing the output, and accepting management's (or the analyst's) assertions instead of challenging them. The mark-winning moves here: (1) the base-rate challenge — with ~6% annual churn, a model predicting "nobody churns" is ~94% accurate, so the headline accuracy figure is close to worthless on its own; the board needs churner-level measures — recall (the proportion of real churners caught) and precision (the proportion of flagged customers who would actually churn), plus the false-positive cost weighed against voucher spend — before trusting the list; and the bare flagged/not-flagged output with no probability score prevents ranking or prioritisation. (2) Correlation vs cause — app users churning less does not mean forcing app downloads reduces churn; the likelier story is that loyal customers self-select into the app, and a checkout mandate adds friction. Recommend testing, not mandating. (3) Training-data flaws — a promotion-distorted year and the exclusion of new customers mean the model is partly learning an unrepresentative past and has learned nothing about a segment the board needs to understand — and if scoring also excludes them, the flagged list misses that group entirely. (4) Salvage what is genuinely useful — the customer-services signal is an actionable service-friction lead regardless, and the flagged list can be piloted against a control group. (5) Reject "the model is complete" — models decay; require retraining and live monitoring. A strong answer sorts the output into what the board can act on now, what must be refined first, and why — with each judgement evidenced from the exhibits rather than generic ML commentary.$f2i$),

-- (ii) D1d [3] Data/system risks + controls — 7 marks — commercial acumen
('a2000000-0000-4000-8000-0000000000d1', 2,
 '(ii) Data and systems risks',
 $q2ii$Assess the risks to Vesla's data and systems arising from the working practices described in Exhibit 4, and recommend controls to protect the security of Vesla's information. (7 marks)$q2ii$,
 'D1d', 'assess', 3, 7, 'commercial_acumen',
$m2ii$Exported customer files on laptops
Full customer records — names, contact details, purchase histories, marketing profiles — sit as spreadsheet files on individual laptops. A lost or stolen laptop, or a compromised machine, exposes personal data at scale, with regulatory consequences under the data-protection law Vesla is subject to in every market, alongside the reputational damage of a customer-data breach. Control: keep analysis inside the governed environment — analysts work on the platform against the database rather than local exports; where extracts are unavoidable, they should be minimised (only the fields needed), pseudonymised where the analysis allows, and laptops encrypted.

Shared login
A single shared login to the analytics platform means no individual accountability: Vesla cannot tell who accessed or exported what, cannot revoke one person's access without locking out the team, and any password compromise compromises everyone. Control: individual accounts with role-based permissions and activity logging. Any licence saving should be weighed against the cost of an unattributable breach.

Free online visualisation tool
Uploading customer-data extracts to a free external tool places personal data outside Vesla's control, under unreviewed terms and possibly in locations Vesla has not assessed for compliance with the data-protection requirements it is subject to. Control: charts built inside approved tooling; if an external tool is genuinely needed, it must be procured and assessed (contract, data-processing terms, storage location), and only anonymised or aggregated data uploaded.

Stale access rights
No access review since the team formed, and a leaver's account live four months after departure, means people who no longer need access — including someone who no longer works for Vesla — can reach the customer database. Control: deactivate the leaver's account immediately; add account closure to the leaver process; schedule periodic (e.g. quarterly) access-rights reviews so entitlement tracks role.

Overall
Many of these are standard, proportionate controls; the exposure they close — regulatory penalty, breach cost, customer trust — is large relative to the cost of fixing them, and the board should treat the leaver account and the external uploads as immediate actions.$m2ii$,
$h2ii$Don't write a general essay on IT security — Exhibit 4 gives you four specific practices. Take each one, name the risk it creates for Vesla specifically (think: what could go wrong, and what would it cost — including under data-protection law?), and recommend a control that fixes that practice. Risk and control, applied to this company, practice by practice.$h2ii$,
$f2ii$The examiner's recurring criticism on security requirements is the generic theory list — candidates recite confidentiality/integrity/availability or a textbook control catalogue with no link to the scenario, and score little. The scenario hands you four concrete practices, each worth a risk-plus-applied-control pair: (1) full customer records exported to laptops — breach exposure at scale plus data-protection liability; fix by keeping work in the governed platform, minimising/pseudonymising unavoidable extracts, encrypting devices. (2) Shared login — no accountability or revocability; fix with individual role-based accounts and logging. (3) Customer data uploaded to a free external tool — data leaves Vesla's control on unreviewed terms; fix with approved tooling or a properly contracted alternative fed only anonymised data. (4) No access reviews and a live leaver account — unauthorised reach into the customer database; fix by immediate deactivation, leaver-process integration, periodic access reviews. The commercial-acumen mark lives in proportionality: these controls are generally standard and proportionate against the regulatory and reputational cost they avert, and the leaver account and external uploads are the urgent two. A strong answer is structured practice-by-practice, each with a named risk and a control that would actually change how the team works.$f2ii$);

-- =============================================================================
-- POST-INSERT VERIFICATION:
--   select c.title, c.section, c.status, c.published,
--          (select count(*) from acca_case_exhibits e where e.case_id=c.id) as exhibits,
--          (select count(*) from acca_case_requirements r where r.case_id=c.id) as requirements,
--          (select sum(marks_guide) from acca_case_requirements r where r.case_id=c.id) as technical_marks
--   from acca_cases c where c.id='a2000000-0000-4000-8000-0000000000d1';
--   -- expect: Vesla Retail | B | candidate | false | 4 | 2 | 20
-- =============================================================================
