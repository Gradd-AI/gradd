-- =============================================================================
-- APM Section B case #3 — D1-anchored (Technology & information systems) — CANDIDATE
-- Torfin Build Supplies | 25 marks (20 technical + 5 professional skills)
-- =============================================================================
-- GATE SAFETY: status='candidate', published=false — does not serve until
-- adversarial QA clears and both flags flip.
-- Built against S26-J27 syllabus, Section D1. Requirements stage the examiner
-- failure modes:
--   (i)  D1b/D1c — assess THIS company's silo problems and evaluate ERPS/CRMS
--        for Torfin's performance management, not describe what an ERP is
--   (ii) D1e — apply the 5 Ss to the actual report list in Exhibit 4, not
--        recite lean theory
-- Fixed case_id; re-seed by deleting the case (children cascade).
-- =============================================================================

-- 1. CASE -------------------------------------------------------------------
insert into acca_cases
  (id, section, anchor_area, title, scenario_intro, response_format,
   total_marks, professional_skills_marks, status, published)
values
('a3000000-0000-4000-8000-0000000000d2',
 'B', 'D1', 'Torfin Build Supplies',
 $sc3$It is now 1 September 20X5. You are a performance management adviser engaged by Torfin Build Supplies. The finance director has asked you to respond to the requirements below, using the information in the exhibits provided. Professional marks are available for the demonstration of skill in analysis and evaluation, scepticism and commercial acumen in your answer.$sc3$,
 'report', 25, 5, 'candidate', false);

-- 2. EXHIBITS ---------------------------------------------------------------
insert into acca_case_exhibits (case_id, exhibit_order, title, body) values
('a3000000-0000-4000-8000-0000000000d2', 1, 'Company background',
$e3a$Torfin Build Supplies (Torfin) sells building materials to trade customers through fourteen branches and a growing e-commerce site. Trade customers hold credit accounts and typically buy from whichever branch is closest to that day''s job, as well as online. The board''s stated objectives are to grow e-commerce revenue, improve availability of core stock lines across branches, and deepen relationships with the largest trade accounts. Margins are tight and the finance director (FD) is under pressure to show that any new systems spending will pay back.$e3a$),
('a3000000-0000-4000-8000-0000000000d2', 2, 'Current systems',
$e3b$Each branch runs its own copy of a legacy stock-and-till system, holding its own product file and customer list; branches record the same products under different codes, and the same trade customer often exists as a separate account in several branches. The e-commerce site runs on a separate platform with its own stock feed, updated overnight from a weekly warehouse count. The accounting ledger is a separate package again, into which branch totals are re-keyed each month. The FD describes month-end as "three weeks of reconciliation": branch, web and ledger figures rarely agree first time, and the causes are chased by email. Customer-facing staff cannot see a customer''s purchases in other branches or online, and credit control cannot see a customer''s total exposure across the group without building a spreadsheet.$e3b$),
('a3000000-0000-4000-8000-0000000000d2', 3, 'The systems proposal',
$e3c$A software vendor has proposed a cloud enterprise resource planning system (ERPS) with an integrated customer relationship management (CRM) module, replacing the branch systems, the e-commerce stock feed and the ledger with a single database. The vendor''s proposal claims: one product file and one customer record across all branches and the web; live stock visibility by branch; automatic posting of sales to the ledger; and a CRM view showing each trade account''s purchases, contacts and credit position across the whole group. The FD is broadly persuaded but the operations director is resistant, arguing that "branch managers know their own customers and their own stock, and a head-office system will slow everyone down." Implementation would take an estimated twelve months and consume most of next year''s capital budget.$e3c$),
('a3000000-0000-4000-8000-0000000000d2', 4, 'The monthly board reporting pack',
$e3d$The monthly pack assembled by the finance team currently contains: (1) a 60-page branch-by-branch sales report, printed for every board member, of which the board discusses only the one-page summary; (2) a "daily flash sales" email that continues to be produced and circulated to all managers although the board replaced it with a weekly version two years ago — both are still sent; (3) three different stock reports (branch system, warehouse count, e-commerce feed) whose totals disagree and which are all included so that "everyone can use the one they trust"; (4) a customer-ageing report produced separately by each branch in different layouts; and (5) a one-page KPI summary the FD builds by hand each month, which is the only page the board reads closely. The finance team estimates the pack takes six working days each month to assemble.$e3d$);

-- 3. REQUIREMENTS -----------------------------------------------------------
-- (i) D1b/D1c [3] silos + ERPS/CRMS evaluation — 13 marks — A&E + commercial acumen
insert into acca_case_requirements
  (case_id, requirement_order, label, question, lo_code, command_verb,
   intellectual_level, marks_guide, professional_skill_tags, model_answer, hint, full_reveal)
values
('a3000000-0000-4000-8000-0000000000d2', 1,
 '(i) Data silos and the systems proposal',
 $q3i$Assess the problems that Torfin''s current data silos present for managing performance, and evaluate whether the proposed ERPS with integrated CRM would address them, taking account of the operations director''s objection. (13 marks)$q3i$,
 'D1b', 'assess', 3, 13, 'analysis_and_evaluation,commercial_acumen',
$m3i$Problems the silos create
Torfin's data sits in three unconnected sets of systems — fourteen branch systems, the e-commerce platform, and the ledger — and the performance problems flow directly from that. First, there is no single version of the truth: the three stock reports disagree, so the board cannot reliably see availability of core lines, which is one of its three stated objectives. Second, inconsistent product codes and duplicated customer accounts mean group-level questions — what does this customer buy from us in total, what is their total credit exposure — can only be answered by hand-built spreadsheets, which undermines the objective of deepening relationships with the largest trade accounts and leaves credit control managing risk it cannot see. Third, the e-commerce stock feed updates overnight from a weekly count, so the website may show inaccurate availability — risking orders for unavailable stock or lost sales where available stock is not shown, a direct drag on the e-commerce growth objective. Fourth, month-end consumes three weeks of reconciliation and six days of pack assembly: the finance function's capacity is spent agreeing the numbers rather than analysing them, so performance information arrives late and management attention goes to chasing differences by email rather than acting.

Whether the ERPS/CRM addresses them
The proposal maps well onto the specific problems. A single database with one product file and one customer record removes the coding and duplication that make group-level analysis impossible; live stock visibility by branch addresses both the availability objective and the e-commerce feed problem; automatic posting to the ledger attacks the reconciliation burden at its cause rather than its symptom; and the CRM view of purchases, contacts and credit position across the group is precisely the capability the key-account and credit-control gaps demand. On the face of it the system is aimed at Torfin's actual problems, not generic ones.

Evaluation is not acceptance, though. The benefits depend on implementation risks the proposal does not price: migrating fourteen inconsistent product files and deduplicating customer records is substantial data-cleansing work, and if it is done badly, a single wrong version of the truth could be worse than the current disagreement, because errors would appear authoritative. Twelve months and most of next year's capital budget is a large, concentrated bet for a tight-margin business, so the FD should require the payback case to be built on the measurable items in the exhibits — reconciliation and pack-assembly time released, credit losses avoided through visible exposure, and e-commerce sales protected by accurate stock — net of transition disruption, training time and a likely branch productivity dip during rollout — rather than on vendor claims.

The operations director's objection
The objection deserves a substantive answer, not dismissal. Branch managers' local knowledge is real, and a badly configured central system could slow branch service. But the objection defends the silo as if local knowledge and shared data were alternatives: a branch manager who can also see a customer's online and other-branch purchases has more to act on, not less. The genuine risk in the objection is adoption — if branch staff experience the system as head-office surveillance, they will work around it and the single database degrades. That argues for involving branch managers in design and piloting in a small number of branches, not for keeping the silos.

Conclusion
The silos are not an IT inconvenience; they directly impair all three board objectives and consume finance capacity. The proposed ERPS/CRM addresses the specific gaps, and should proceed subject to a payback case built on the measurable costs above, a serious data-cleansing plan, and a phased rollout that brings branch managers with it.$m3i$,
$h3i$Don't explain what an ERP system is — the FD knows. Work from the exhibits: take the specific silo problems Torfin actually has (disagreeing stock numbers, duplicated customers, invisible credit exposure, three weeks of reconciliation) and connect each to the board's three objectives. Then test the vendor's claims against those specific problems — and give the operations director's objection a fair hearing before you answer it. What's the real risk hiding inside it?$h3i$,
$f3i$The examiner's recurring criticisms on this question type are describing the technology instead of evaluating it for the company, and ignoring inconvenient voices in the scenario. The mark-winning structure: (1) tie each silo problem to a stated objective — disagreeing stock reports block the availability objective; duplicated customer records and invisible group-wide exposure block the key-account objective and leave credit risk unmanaged; the overnight/weekly stock feed undermines e-commerce growth; three weeks of reconciliation plus six days of pack assembly means finance agrees numbers instead of analysing them. (2) Evaluate the proposal against those specific problems — single product/customer file, live stock, auto-posting and the group-wide CRM view each map onto a named gap, which is what makes this proposal plausible rather than generic. (3) Balance, not acceptance: the unpriced risks are data cleansing across fourteen inconsistent systems (a single wrong version of the truth could be worse than the current disagreement — errors would appear authoritative), a twelve-month bet consuming most of the capital budget, and adoption. (4) Treat the operations director's objection as containing a real risk — user adoption and local knowledge — answered by design involvement and piloting, not by keeping silos. A strong answer ends with a conditional recommendation: proceed, subject to a payback case built on the measurable exhibit items net of transition disruption and training, a data-cleansing plan, and a phased rollout.$f3i$),

-- (ii) D1e [3] lean MIS / 5 Ss on the board pack — 7 marks — scepticism
('a3000000-0000-4000-8000-0000000000d2', 2,
 '(ii) The monthly reporting pack',
 $q3ii$Using the 5 Ss of lean information systems, evaluate whether Torfin''s monthly board reporting pack is lean and the value of the information it provides. (7 marks)$q3ii$,
 'D1e', 'evaluate', 3, 7, 'scepticism',
$m3ii$Structurise (sort — keep only what is needed)
The pack fails the first test: the board reads the one-page KPI summary closely and discusses only the summary page of the 60-page branch report. Most of the pack's content is not used by its audience and should be removed from the board pack, available on request rather than printed for every member.

Systemise (set in order — organised, easy to find and use)
Information is not organised for use: the customer-ageing report arrives in a different layout from each branch, so the board cannot compare or total ageing across the group without rework. One standard layout, consolidated, would convert fourteen documents into one usable view.

Sanitise (shine — remove obsolete and redundant information)
The daily flash sales email is the clearest failure: it was replaced by a weekly version two years ago, yet both are still produced and circulated. That is pure waste and should stop immediately. The three disagreeing stock reports are also a sanitisation failure — keeping all three "so everyone can use the one they trust" institutionalises the disagreement instead of resolving it; one governed stock view — with clear reconciliation between the physical count, branch stock and e-commerce available-to-sell — is worth more than three contested reports.

Standardise (make the clean state the routine)
The only page the board relies on — the KPI summary — is hand-built by the FD each month, so the pack's most valuable content has no standard, repeatable production process and depends on one person. The standard should be automated production of that page; the rest of the pack should have a defined owner, format and distribution list so redundant items cannot quietly persist.

Self-discipline (sustain — keep it lean over time)
The pack has grown by accretion because nothing removes content: the flash email survived its own replacement, and reports are added but never retired. A periodic challenge — who reads this, what decision does it inform — should be built into the reporting cycle so leanness is maintained rather than achieved once.

Value of the information
Six working days a month produce a pack of which only one or two pages appear to be genuinely used, built on stock figures that disagree. The current pack is high-cost, low-value; the lean review above would release significant effort while improving the only outputs the board actually uses.$m3ii$,
$h3ii$Don't recite what the 5 Ss are in theory — apply each one to a specific item in Exhibit 4. For each S, find the item in the pack that fails it (there's at least one for each) and say what should change. Then answer the second half of the question: six days of effort, only one or two pages genuinely used — what does that say about the value of the information?$h3ii$,
$f3ii$The examiner's criticism of 5 Ss answers is theory recited under the right headings with no application — or concepts placed under the wrong headings. The application that scores: Structurise — the 60-page branch report printed for all, of which only the summary is discussed: remove unused content from the pack. Systemise — fourteen different ageing layouts: one standard consolidated format. Sanitise — the daily flash email still circulating two years after its weekly replacement (pure waste, stop it), and three disagreeing stock reports kept "so everyone can use the one they trust" (resolve to one governed, reconciled stock view rather than institutionalising the disagreement). Standardise — the one page the board reads is hand-built by the FD: automate it and give the pack defined owners and formats. Self-discipline — nothing ever retires content, so build a periodic who-reads-this challenge into the cycle. The scepticism mark lives in challenging the pack's implied value: six working days for one or two genuinely used pages, resting on stock numbers that disagree — high cost, low value, and the review should say so plainly.$f3ii$);

-- =============================================================================
-- POST-INSERT VERIFICATION:
--   select c.title, c.section, c.status, c.published,
--          (select count(*) from acca_case_exhibits e where e.case_id=c.id) as exhibits,
--          (select count(*) from acca_case_requirements r where r.case_id=c.id) as requirements,
--          (select sum(marks_guide) from acca_case_requirements r where r.case_id=c.id) as technical_marks
--   from acca_cases c where c.id='a3000000-0000-4000-8000-0000000000d2';
--   -- expect: Torfin Build Supplies | B | candidate | false | 4 | 2 | 20
-- =============================================================================
