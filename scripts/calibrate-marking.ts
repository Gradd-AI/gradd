// scripts/calibrate-marking.ts
// Weekly marking-calibration ritual for APM professional-skills marking.
//
// Runs the REAL marking core (lib/acca/case-marking.ts — the exact code the live
// /api/acca/case/mark route calls) against two fixed Torfin answer sets and checks
// the awarded score lands in the expected band:
//   • WEAK   — gate-quality content, flat professional skills → expect ≤ 2 / 5
//   • STRONG — the live-verified 4/5 attempt from the test account → expect ≥ 4 / 5
//
// It NEVER touches production data: the case context, requirements and answers are
// hardcoded fixtures below, the core does no DB/auth/persistence, and this script
// writes nothing. Only ANTHROPIC_API_KEY is needed.
//
// The marking model is stochastic, so the default is --runs=3: run each fixture
// three times and surface any flap across the weak boundary (a weak answer that
// sometimes bands "competent" and tips to 3/5 is exactly the drift we want caught).
//
// Usage:
//   npx tsx --env-file=.env.local scripts/calibrate-marking.ts
//   npx tsx --env-file=.env.local scripts/calibrate-marking.ts --runs=5 --verbose

import { judgeCaseMarking, type CaseMarkingResult } from '../lib/acca/case-marking';

// ── CLI ─────────────────────────────────────────────────────────────────────
const runsArg = process.argv.find((a) => a.startsWith('--runs='));
const RUNS = runsArg ? Math.max(1, parseInt(runsArg.split('=')[1], 10) || 3) : 3;
const VERBOSE = process.argv.includes('--verbose');

// ── Torfin case fixtures (verbatim from supabase/apm_questions/apm_case_3_torfin.sql) ──
// Case a3000000-0000-4000-8000-0000000000d2 · Section B · 5 professional-skills marks.
const POOL = 5;
// Union of professional_skill_tags across requirements, in requirement order —
// exactly how the live route derives examinedSkills.
const EXAMINED_SKILLS = ['analysis_and_evaluation', 'commercial_acumen', 'scepticism'];

const SCENARIO_INTRO =
  'It is now 1 September 20X5. You are a performance management adviser engaged by Torfin Build ' +
  'Supplies. The finance director has asked you to respond to the requirements below, using the ' +
  'information in the exhibits provided. Professional marks are available for the demonstration of ' +
  'skill in analysis and evaluation, scepticism and commercial acumen in your answer.';

const EXHIBITS: Array<{ title: string; body: string }> = [
  {
    title: 'Company background',
    body:
      "Torfin Build Supplies (Torfin) sells building materials to trade customers through fourteen " +
      "branches and a growing e-commerce site. Trade customers hold credit accounts and typically " +
      "buy from whichever branch is closest to that day's job, as well as online. The board's stated " +
      "objectives are to grow e-commerce revenue, improve availability of core stock lines across " +
      "branches, and deepen relationships with the largest trade accounts. Margins are tight and the " +
      "finance director (FD) is under pressure to show that any new systems spending will pay back.",
  },
  {
    title: 'Current systems',
    body:
      "Each branch runs its own copy of a legacy stock-and-till system, holding its own product file " +
      "and customer list; branches record the same products under different codes, and the same trade " +
      "customer often exists as a separate account in several branches. The e-commerce site runs on a " +
      "separate platform with its own stock feed, updated overnight from a weekly warehouse count. The " +
      "accounting ledger is a separate package again, into which branch totals are re-keyed each month. " +
      'The FD describes month-end as "three weeks of reconciliation": branch, web and ledger figures ' +
      "rarely agree first time, and the causes are chased by email. Customer-facing staff cannot see a " +
      "customer's purchases in other branches or online, and credit control cannot see a customer's " +
      "total exposure across the group without building a spreadsheet.",
  },
  {
    title: 'The systems proposal',
    body:
      "A software vendor has proposed a cloud enterprise resource planning system (ERPS) with an " +
      "integrated customer relationship management (CRM) module, replacing the branch systems, the " +
      "e-commerce stock feed and the ledger with a single database. The vendor's proposal claims: one " +
      "product file and one customer record across all branches and the web; live stock visibility by " +
      "branch; automatic posting of sales to the ledger; and a CRM view showing each trade account's " +
      "purchases, contacts and credit position across the whole group. The FD is broadly persuaded but " +
      'the operations director is resistant, arguing that "branch managers know their own customers and ' +
      'their own stock, and a head-office system will slow everyone down." Implementation would take an ' +
      "estimated twelve months and consume most of next year's capital budget.",
  },
  {
    title: 'The monthly board reporting pack',
    body:
      "The monthly pack assembled by the finance team currently contains: (1) a 60-page " +
      "branch-by-branch sales report, printed for every board member, of which the board discusses only " +
      'the one-page summary; (2) a "daily flash sales" email that continues to be produced and ' +
      "circulated to all managers although the board replaced it with a weekly version two years ago — " +
      "both are still sent; (3) three different stock reports (branch system, warehouse count, " +
      'e-commerce feed) whose totals disagree and which are all included so that "everyone can use the ' +
      'one they trust"; (4) a customer-ageing report produced separately by each branch in different ' +
      "layouts; and (5) a one-page KPI summary the FD builds by hand each month, which is the only page " +
      "the board reads closely. The finance team estimates the pack takes six working days each month to " +
      "assemble.",
  },
];

// Assemble case context EXACTLY as app/api/acca/case/mark/route.ts step 7 does.
const EXHIBIT_TEXT = EXHIBITS.map((e) => [e.title, e.body].filter(Boolean).join('\n'))
  .filter(Boolean)
  .join('\n\n');
const CONTEXT = [SCENARIO_INTRO, EXHIBIT_TEXT].filter(Boolean).join('\n\n');

// Requirement labels (verbatim), used to assemble wholeAnswer as the route does.
const REQ_1_LABEL = '(i) Data silos and the systems proposal';
const REQ_2_LABEL = '(ii) The monthly reporting pack';

// Assemble wholeAnswer EXACTLY as route step 6: `${label}\n${answer.trim()}` per
// requirement, joined by a blank line, in requirement order.
function buildWholeAnswer(reqOne: string, reqTwo: string): string {
  return [`${REQ_1_LABEL}\n${reqOne.trim()}`, `${REQ_2_LABEL}\n${reqTwo.trim()}`].join('\n\n');
}

// ── WEAK fixture (authored) — covers the content points but flat professional
// skills: assertion-only, dismisses the operations director, no payback/risk
// evaluation, no value challenge. Should band weak on A&E / scepticism / commercial
// acumen and land ≤ 2 / 5. ──
const WEAK_REQ_1 =
  "Torfin has data silos because each branch runs its own system and the e-commerce site and ledger " +
  "are separate. The stock reports disagree and customers are duplicated across branches. The proposed " +
  "ERPS with CRM would fix this because it has one database, one product file, one customer record, live " +
  "stock and automatic ledger posting, plus a CRM view of each customer. Therefore Torfin should " +
  "implement it because it solves the silo problems. The operations director says branch managers know " +
  "their customers and the system will slow them down, but the ERPS is better because it integrates " +
  "everything. It takes twelve months and most of the capital budget. Overall the ERPS is a good system " +
  "and Torfin should buy it.";

const WEAK_REQ_2 =
  "The 5 Ss are Structurise, Systemise, Sanitise, Standardise and Self-discipline. Structurise means " +
  "sorting; the pack has a 60-page branch report. Systemise means order; the ageing reports are in " +
  "different layouts. Sanitise means removing waste; there is a daily flash email and three stock " +
  "reports. Standardise means routine; the KPI page is built by hand. Self-discipline means sustaining " +
  "it over time. The pack takes six days to produce. Applying the 5 Ss would make the pack leaner and " +
  "improve the value of the information.";

// ── STRONG fixture — the live-verified 4/5 attempt, extracted read-only from
// acca_case_progress.final_answer for the permanent test account
// (ee07f08c-9f24-4d77-af28-bbc894635f83) on Torfin, marked 4/5 on 2026-07-08.
// Verbatim, including the req-2 preamble the student actually submitted. ──
const STRONG_REQ_1 =
  "Torfin's data silos cause several problems for managing performance. Each branch has its own product " +
  "file with different codes, so stock cannot be compared across branches, which makes it hard to " +
  "improve availability of core stock lines. The same customer exists as separate accounts in different " +
  "branches, so staff cannot see a customer's total purchases and credit control cannot see total " +
  "exposure without a spreadsheet, which makes it hard to deepen relationships with the largest trade " +
  "accounts. The e-commerce stock feed is only updated overnight from a weekly count, so the website may " +
  "sell stock that is not available, which affects the e-commerce growth objective. Month-end takes " +
  "three weeks of reconciliation because the branch, web and ledger figures disagree, so the board " +
  "receives information late.\n" +
  "The proposed ERP would address these problems. It provides one product file and one customer record, " +
  "live stock visibility, automatic posting to the ledger, and a CRM view of each account across the " +
  "group. This means stock would be comparable across branches, customers would be visible group-wide, " +
  "the website would have live stock, and month-end would be faster, so the board would get timely and " +
  "consistent information for managing performance against its objectives.\n" +
  "The operations director's objection has some substance and should not be dismissed. A centralised " +
  "system could slow branches down if it is poorly configured, if branch managers lose the autonomy to " +
  "serve their own customers, or if staff do not adopt it properly. There are also transition risks the " +
  "vendor's proposal does not address: the branches currently record the same products under different " +
  "codes and the same customers under separate accounts, so the data would need significant cleansing " +
  "before migration, and a twelve-month implementation consuming most of the capital budget leaves " +
  "little room for overrun. The vendor's claims are also untested in Torfin's context and the vendor has " +
  "an interest in presenting them favourably, so the benefits should not be taken at face value.\n" +
  "On balance, the ERP does address the performance problems the silos create and supports all three " +
  "board objectives, so Torfin should proceed — but conditionally. Implementation should include data " +
  "cleansing before migration, involvement of branch managers in configuration so local knowledge is " +
  "retained, a phased rollout rather than a big-bang cutover, and tracking of defined benefits against " +
  "the FD's payback requirement. With those conditions the operations director's concerns are managed " +
  "rather than ignored.";

const STRONG_REQ_2 =
  "The requirement names the 5 Ss and Ezra's holding out for it — fair gate. Same content, framework " +
  "bolted on. Paste as one block:\n\n" +
  "The reporting pack can be evaluated using the 5 Ss of lean management: sort, straighten, shine, " +
  "standardise and sustain.\n" +
  "Sort — eliminate what is unnecessary. The 60-page branch-by-branch report is printed for every board " +
  "member but only the one-page summary is discussed, so the detail is waste at board level. The daily " +
  "flash sales email continues to be produced although the board replaced it with a weekly version two " +
  "years ago, so a redundant report is still consuming effort. Both should be removed from the pack — " +
  "the branch detail available on request, the daily flash discontinued.\n" +
  "Straighten — organise what remains around use. The one-page KPI summary the FD builds by hand is the " +
  "only page the board reads closely, which shows the board wants concise, decision-relevant " +
  "information. The pack should be restructured with the KPI summary as its core, produced automatically " +
  "from a single data source rather than manually, with supporting detail behind it rather than in front " +
  "of it.\n" +
  "Shine — clean the data. The three stock reports disagree with each other and are all circulated so " +
  "that everyone can use the one they trust, which means there is no single version of the truth and " +
  "stock decisions are made from inconsistent figures — a direct problem for the core stock availability " +
  "objective. One agreed stock figure should replace the three reports, with the underlying " +
  "discrepancies investigated and fixed rather than worked around.\n" +
  "Standardise — one format, group-wide. The customer-ageing reports are produced separately by each " +
  "branch in different layouts, so they cannot be compared or consolidated, which weakens credit control " +
  "and management of the largest trade accounts. A single standardised ageing format should be adopted " +
  "across all branches.\n" +
  "Sustain — keep the discipline. The pack currently takes six working days each month to assemble, " +
  "largely for information that is unread, duplicated or inconsistent. The board should periodically " +
  "review the pack against its information needs so that retired reports stay retired and new additions " +
  "must justify their place — otherwise the clutter will rebuild. If the ERP proceeds, much of this is " +
  "supported by the single database, but the pack's content should be driven by the board's decisions, " +
  "not by what the systems happen to produce.";

// ── Fixtures + expectations ────────────────────────────────────────────────────
interface Fixture {
  key: 'WEAK' | 'STRONG';
  wholeAnswer: string;
  // Inclusive expected range for the awarded score against the 5-mark pool.
  expectMin: number;
  expectMax: number;
  expectLabel: string;
}

const FIXTURES: Fixture[] = [
  {
    key: 'WEAK',
    wholeAnswer: buildWholeAnswer(WEAK_REQ_1, WEAK_REQ_2),
    expectMin: 0,
    expectMax: 2,
    expectLabel: '≤ 2 / 5',
  },
  {
    key: 'STRONG',
    wholeAnswer: buildWholeAnswer(STRONG_REQ_1, STRONG_REQ_2),
    expectMin: 4,
    expectMax: POOL,
    expectLabel: '≥ 4 / 5',
  },
];

function inRange(score: number, f: Fixture): boolean {
  return score >= f.expectMin && score <= f.expectMax;
}

function bandsLine(r: CaseMarkingResult): string {
  return r.per_skill.map((s) => `${s.skill}=${s.band}(${s.mark_awarded})`).join('  ');
}

async function runFixture(f: Fixture): Promise<{ pass: boolean; scores: number[] }> {
  console.log(`\n━━ ${f.key} — expecting ${f.expectLabel} ${'━'.repeat(40)}`);
  const scores: number[] = [];
  let allInRange = true;

  for (let i = 1; i <= RUNS; i++) {
    let r: CaseMarkingResult;
    try {
      r = await judgeCaseMarking({
        context: CONTEXT,
        wholeAnswer: f.wholeAnswer,
        examinedSkills: EXAMINED_SKILLS,
        professionalSkillsMarks: POOL,
      });
    } catch (e) {
      const why = (e as Error)?.message === 'parse' ? 'parse failure' : 'call failure';
      console.log(`  run ${i}/${RUNS}: ERROR (${why}) — counts as out of range`);
      allInRange = false;
      scores.push(NaN);
      continue;
    }
    const ok = inRange(r.professional_marks_awarded, f);
    if (!ok) allInRange = false;
    scores.push(r.professional_marks_awarded);
    console.log(
      `  run ${i}/${RUNS}: ${r.professional_marks_awarded}/${r.professional_marks_available} ` +
        `${ok ? 'ok ' : 'OUT'}  |  ${bandsLine(r)}`,
    );
    if (VERBOSE) {
      for (const s of r.per_skill) console.log(`        · ${s.skill}: ${s.feedback}`);
    }
  }

  // Distribution + flap visibility.
  const valid = scores.filter((s) => !Number.isNaN(s));
  const min = valid.length ? Math.min(...valid) : NaN;
  const max = valid.length ? Math.max(...valid) : NaN;
  const flap = valid.length > 0 && min !== max;
  const inCount = valid.filter((s) => s >= f.expectMin && s <= f.expectMax).length;
  console.log(
    `  → ${inCount}/${RUNS} runs within ${f.expectLabel} · range ${min}–${max}` +
      `${flap ? ' · FLAP across runs' : ''} · ${allInRange ? 'PASS' : 'FAIL'}`,
  );
  return { pass: allInRange, scores };
}

async function main() {
  console.log('APM marking calibration — Torfin Build Supplies (5-mark professional pool)');
  console.log(`Model: live marking core · runs per fixture: ${RUNS}${VERBOSE ? ' · verbose' : ''}`);

  let fails = 0;
  for (const f of FIXTURES) {
    const { pass } = await runFixture(f);
    if (!pass) fails++;
  }

  console.log(`\n${'═'.repeat(60)}`);
  if (fails === 0) {
    console.log('CALIBRATION PASS — both fixtures held their expected bands on every run.');
  } else {
    console.log(`CALIBRATION FAIL — ${fails} fixture(s) drifted out of range. Review bands above.`);
  }
  process.exit(fails === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error('Calibration run crashed:', e);
  process.exit(1);
});
