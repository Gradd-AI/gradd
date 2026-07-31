// scripts/test-sit-results.ts   —   npm run test:sit-results
//
// PURE fixtures for lib/acca/sit-results.ts (the row → debrief-input assembly) and for the
// pure resolution rule in lib/acca/sit-attempt.ts. No DB, no model, no network.
//
// The centre of gravity is PAPER ORDER. `requirement_order` is scoped to its own case, so
// all three cases start at 1; sorting the eight rows by that column alone interleaves the
// paper and every pacing interval computed from it is measured between requirements the
// candidate never sat consecutively. That failure is silent — the numbers all look
// plausible — so it is pinned here with a paper whose per-case orders deliberately collide.

import {
  orderPaper,
  toPacingInputs,
  toDebriefRequirements,
  toDebriefCases,
  readPerSkill,
  paperFullySubmitted,
  casesNeedingMarking,
  type SitResultRow,
} from '../lib/acca/sit-results';
import { resolveOrder } from '../lib/acca/sit-attempt';
import { computePacing } from '../lib/acca/pacing';
import { buildDebrief } from '../lib/acca/debrief';

let checks = 0;
let failures = 0;
const line = (t = '') => console.log(t);
const rule = (c = '=') => console.log(c.repeat(100));
function ok(name: string, cond: boolean, detail = '') {
  checks++;
  if (!cond) failures++;
  line(`  ${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}
function eq(name: string, actual: unknown, expected: unknown) {
  ok(name, JSON.stringify(actual) === JSON.stringify(expected),
    `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

const CASES = ['case-A', 'case-B', 'case-C'];
const t = (min: number) => new Date(Date.UTC(2026, 6, 31, 9, min, 0)).toISOString();

/** Eight requirements across three cases. Per-case `requirement_order` COLLIDES on purpose:
 *  every case starts at 1, which is the real shape and the thing a naive sort gets wrong. */
function paperRows(): SitResultRow[] {
  const mk = (
    id: string, caseId: string, order: number, label: string, marks: number,
    submitted: string | null, answer: string | null, band: string | null,
    awarded: number | null, feedback: string | null,
  ): SitResultRow => ({
    requirement_id: id, case_id: caseId, requirement_order: order, label,
    lo_code: null, marks_guide: marks, submitted_at: submitted, final_answer: answer,
    band, technical_marks_awarded: awarded, technical_feedback: feedback,
  });
  return [
    // Deliberately SHUFFLED: the DB may return any order, and the assembly must not care.
    mk('c1', 'case-C', 1, '(i) E3a — 13 marks', 13, t(178), '', 'nothing', 0, 'No answer submitted.'),
    mk('a1', 'case-A', 1, '(i) B1a — 16 marks', 16, t(42), 'NPV answer', 'strong', 12, 'The NPV method is right; the tax timing is a year out.'),
    mk('b2', 'case-B', 2, '(ii) B5b — 12 marks', 12, t(160), 'partial', 'competent', 6, 'The FCF build is right but withholding tax is applied to the wrong base.'),
    mk('a3', 'case-A', 3, '(iii) B3e — 12 marks', 12, t(96), 'wacc', 'weak', 3, 'The gearing weights are inverted.'),
    mk('a2', 'case-A', 2, '(ii) E2b — 12 marks', 12, t(70), 'hedge', 'exemplary', 12, 'Both hedges evaluated and the cheaper one selected on a stated basis.'),
    mk('c2', 'case-C', 2, '(ii) A2c — 12 marks', 12, null, null, null, null, null),
    mk('a4', 'case-A', 4, '(iv) B2b — 10 marks', 10, t(120), 'risk', 'strong', 8, 'A clear recommendation with a named risk.'),
    mk('b1', 'case-B', 1, '(i) D1a — 13 marks', 13, t(140), 'discussion', 'competent', 7, 'Recognised the exposure but did not price it.'),
  ];
}

rule();
line('  SIT RESULTS — paper-order assembly + debrief inputs (pure)');
rule();

// ── 1. Paper order ───────────────────────────────────────────────────────────
line('\n  1. PAPER ORDER');
const ordered = orderPaper(CASES, paperRows());
eq('all eight requirements survive', ordered.length, 8);
eq('paper_order is 1..8 with no gaps', ordered.map((r) => r.paper_order), [1, 2, 3, 4, 5, 6, 7, 8]);
eq('grouped by case in PAPER order, ascending within each case',
  ordered.map((r) => r.requirement_id), ['a1', 'a2', 'a3', 'a4', 'b1', 'b2', 'c1', 'c2']);
eq('case_position follows the paper, not the database',
  ordered.map((r) => r.case_position), [1, 1, 1, 1, 2, 2, 3, 3]);

// THE FAILURE THIS EXISTS TO PREVENT: sorting by requirement_order alone.
const naive = [...paperRows()].sort((a, b) => a.requirement_order - b.requirement_order);
ok('a naive requirement_order sort would INTERLEAVE the paper (so the case sequence is load-bearing)',
  JSON.stringify(naive.map((r) => r.requirement_id)) !== JSON.stringify(ordered.map((r) => r.requirement_id)));

// A row belonging to no case in this paper must not take a paper_order.
eq('a foreign case_id is dropped, not appended',
  orderPaper(CASES, [...paperRows(), {
    requirement_id: 'x', case_id: 'case-Z', requirement_order: 1, label: '(i)', lo_code: null,
    marks_guide: 5, submitted_at: null, final_answer: null, band: null,
    technical_marks_awarded: null, technical_feedback: null,
  }]).length, 8);

eq('an empty paper orders to nothing', orderPaper(CASES, []), []);
eq('a case with no rows simply contributes none',
  orderPaper(CASES, paperRows().filter((r) => r.case_id !== 'case-B')).map((r) => r.requirement_id),
  ['a1', 'a2', 'a3', 'a4', 'c1', 'c2']);

// ── 2. Pacing inputs ─────────────────────────────────────────────────────────
line('\n  2. PACING INPUTS');
const pacingIn = toPacingInputs(ordered);
eq('marks_available comes from marks_guide', pacingIn.map((r) => r.marks_available), [16, 12, 12, 10, 13, 12, 13, 12]);
eq('a null marks_guide is 0 available, not NaN',
  toPacingInputs(orderPaper(CASES, [{
    requirement_id: 'n', case_id: 'case-A', requirement_order: 1, label: null, lo_code: null,
    marks_guide: null, submitted_at: null, final_answer: null, band: null,
    technical_marks_awarded: null, technical_feedback: null,
  }]))[0].marks_available, 0);
eq('an unsubmitted requirement carries null submitted_at AND null final_answer',
  [pacingIn[7].submitted_at, pacingIn[7].final_answer], [null, null]);
eq("a BLANK answer ('') is submitted, not absent",
  [pacingIn[6].final_answer, pacingIn[6].submitted_at !== null], ['', true]);

// ── 3. Debrief inputs ────────────────────────────────────────────────────────
line('\n  3. DEBRIEF INPUTS');
const debriefReqs = toDebriefRequirements(ordered);
eq('marker_feedback is carried through untouched',
  debriefReqs[2].marker_feedback, 'The gearing weights are inverted.');
eq('an unmarked requirement keeps marks_awarded NULL (never coalesced to 0)',
  debriefReqs[7].marks_awarded, null);
eq('a zero-mark requirement keeps 0, which is NOT the same as unmarked',
  debriefReqs[6].marks_awarded, 0);
eq('case_id is present on every line (it drives grouping)',
  debriefReqs.every((r) => !!r.case_id), true);

// ── 4. Per-skill jsonb ───────────────────────────────────────────────────────
line('\n  4. PER-SKILL JSONB IS READ DEFENSIVELY');
eq('a well-formed array reads through',
  readPerSkill([{ skill: 'scepticism', band: 'weak', feedback: 'Accepted the forecast.', mark_awarded: 1 }]),
  [{ skill: 'scepticism', band: 'weak', feedback: 'Accepted the forecast.' }]);
eq('the apportioned mark_awarded is DROPPED (never surfaced)',
  Object.keys(readPerSkill([{ skill: 's', band: 'weak', feedback: 'f', mark_awarded: 3 }])[0]).sort(),
  ['band', 'feedback', 'skill']);
eq('null is not an array → no skills', readPerSkill(null), []);
eq('a string is not an array → no skills', readPerSkill('{}'), []);
eq('an item missing `band` is skipped, the rest survive',
  readPerSkill([{ skill: 'a' }, { skill: 'b', band: 'weak' }]).map((s) => s.skill), ['b']);
eq('a missing feedback degrades to empty string, not undefined',
  readPerSkill([{ skill: 'b', band: 'weak' }])[0].feedback, '');

const cases = toDebriefCases(CASES, new Map([['case-A', 'Solenne'], ['case-B', 'Brecon']]), [
  { case_id: 'case-A', professional_marks_awarded: 8, professional_marks_available: 10, per_skill: [{ skill: 'scepticism', band: 'competent', feedback: 'ok' }] },
]);
eq('every paper case appears even with no marking row', cases.map((c) => c.case_id), CASES);
eq('an unmarked case reports null PS marks rather than 0',
  [cases[1].professional_marks_awarded, cases[1].professional_marks_available], [null, null]);
eq('a title absent from the map is null, not undefined', cases[2].title, null);

// ── 5. Completion + marking gates ────────────────────────────────────────────
line('\n  5. COMPLETION AND MARKING GATES');
ok('a paper with an unsubmitted requirement is NOT fully submitted', !paperFullySubmitted(paperRows()));
ok('a paper where every requirement has an answer IS fully submitted',
  paperFullySubmitted(paperRows().map((r) => ({ ...r, final_answer: r.final_answer ?? 'x', submitted_at: r.submitted_at ?? t(180) }))));
ok("a BLANK answer completes a requirement (final_answer != null, not truthiness)",
  paperFullySubmitted([{ ...paperRows()[0], final_answer: '' }]));
ok('an empty paper is not "fully submitted"', !paperFullySubmitted([]));

eq('no marking rows → every case needs marking', casesNeedingMarking(CASES, []), CASES);
eq('a PS-only marking row (no technical total) still needs marking — that is a PRACTICE mark',
  casesNeedingMarking(CASES, [{ case_id: 'case-A', technical_marks_available: null }]), CASES);
eq('a technically-marked case drops out',
  casesNeedingMarking(CASES, [{ case_id: 'case-A', technical_marks_available: 50 }]), ['case-B', 'case-C']);
eq('all marked → nothing to do',
  casesNeedingMarking(CASES, CASES.map((c) => ({ case_id: c, technical_marks_available: 25 }))), []);

// ── 6. End to end into the real pacing + debrief modules ─────────────────────
// Not a re-test of those modules — a proof that what this assembly emits is ACCEPTED by
// them and produces a coherent report, which is the only thing the route relies on.
line('\n  6. END TO END INTO computePacing + buildDebrief');
const pacing = computePacing(toPacingInputs(ordered), {
  started_at: t(0), completed_at: t(182), completed: true,
});
eq('pacing evaluated', pacing.not_evaluated, null);
eq('pacing produced a row per requirement', pacing.rows.length, 8);
eq('coverage sees one blank and one not-reached',
  [pacing.coverage.blank, pacing.coverage.not_reached], [1, 1]);

const report = buildDebrief(toDebriefRequirements(ordered), cases, pacing);
eq('the debrief groups into three cases', report.cases.map((c) => c.display_name), ['Q1', 'Q2', 'Q3']);
eq('per-case subtotals are computed from what was marked',
  report.cases.map((c) => `${c.technical_awarded}/${c.technical_available}`), ['35/50', '13/25', '0/25']);
eq('the technical total is the sum of the marked lines', report.totals.technical_awarded, 48);
eq('technical_available is the whole paper', report.totals.technical_available, 100);
ok('there is exactly one headline', typeof report.headline.statement === 'string' && report.headline.statement.length > 0);

// NO INTERNAL CODE REACHES THE STUDENT. This is the same leak sitDisplayLabel closes at the
// serve boundary, one screen later — the debrief must not re-open it through `display_name`.
const LO_SHAPE = /\b[A-E][0-9]{1,2}[a-z]?\b/;
ok('no display_name carries a syllabus-code shape',
  report.requirements.every((r) => !LO_SHAPE.test(r.display_name)),
  report.requirements.map((r) => r.display_name).join(' | '));
ok('no display_name carries a marks phrase',
  report.requirements.every((r) => !/\d+\s*marks/i.test(r.display_name)));
ok('the HEADLINE carries no syllabus code either', !LO_SHAPE.test(report.headline.statement),
  report.headline.statement);
eq('display names are the Q<n> (part) form',
  report.requirements.map((r) => r.display_name),
  ['Q1 (i)', 'Q1 (ii)', 'Q1 (iii)', 'Q1 (iv)', 'Q2 (i)', 'Q2 (ii)', 'Q3 (i)', 'Q3 (ii)']);

// The marker's reasoning must arrive VERBATIM — that is the whole claim of the `why` field.
eq('`why` is the marker string, byte for byte',
  report.requirements[2].why, 'The gearing weights are inverted.');
eq('an unmarked requirement has no invented `why`', report.requirements[7].why, null);
// A strong band that still lost marks keeps its diagnosis OPEN; a full-marks strong band collapses.
eq('a strong band that lost marks stays expanded', report.requirements[0].why_display, 'expanded');
eq('a full-marks exemplary band collapses', report.requirements[1].why_display, 'collapsed');

// PACING AND MARKS ARE SEPARATE FIELDS. Nothing may fuse them.
ok('every line carries marks and pacing as distinct fields',
  report.requirements.every((r) => 'what_was_lost' in r && 'pacing_note' in r));
ok('no marks sentence mentions minutes',
  report.requirements.every((r) => !/minute/i.test(r.what_was_lost)));
ok('no pacing sentence mentions marks lost',
  report.requirements.every((r) => !r.pacing_note || !/lost/i.test(r.pacing_note)));

// ── 7. An UNMARKED paper still debriefs ──────────────────────────────────────
line('\n  7. AN UNMARKED PAPER STILL PRODUCES A REPORT');
const unmarkedRows = orderPaper(CASES, paperRows().map((r) => ({
  ...r, band: null, technical_marks_awarded: null, technical_feedback: null,
})));
const unmarked = buildDebrief(
  toDebriefRequirements(unmarkedRows),
  toDebriefCases(CASES, new Map(), []),
  computePacing(toPacingInputs(unmarkedRows), { started_at: t(0), completed_at: t(182), completed: true }),
);
eq('no technical total is invented', unmarked.totals.technical_awarded, null);
ok('a limitation names the missing marking',
  unmarked.limitations.some((l) => /not been marked/i.test(l)), unmarked.limitations.join(' | '));
// An unmarked paper CANNOT be shown to be harmless, so a collapse still leads — the debrief's
// own documented rule. This paper has a blank tail, so it does.
eq('an unmarked paper WITH a collapse still leads on the collapse', unmarked.headline.code, 'end_of_paper_collapse');

// ...and with no collapse to report, the headline states the absence of marks rather than
// scoring anything. Every requirement answered, evenly paced, nothing marked.
const evenRows = orderPaper(CASES, paperRows().map((r, i) => ({
  ...r, band: null, technical_marks_awarded: null, technical_feedback: null,
  final_answer: 'answered', submitted_at: t(20 + i * 20),
})));
const noCollapse = buildDebrief(
  toDebriefRequirements(evenRows),
  toDebriefCases(CASES, new Map(), []),
  computePacing(toPacingInputs(evenRows), { started_at: t(0), completed_at: t(182), completed: true }),
);
eq('an unmarked paper with nothing to flag reports pacing only', noCollapse.headline.code, 'pacing_only');
ok('and it does not invent a mark anywhere',
  noCollapse.requirements.every((r) => r.marks_awarded === null));

// ── 8. The paper-resolution precedence rule ──────────────────────────────────
line('\n  8. PAPER RESOLUTION PRECEDENCE');
eq('an explicit mock_id wins', resolveOrder('afm-paper-1', 'paper-1'), 'mock_id');
eq('an open attempt outranks the query hint', resolveOrder(null, 'paper-1'), 'open_attempt');
eq('with neither, the paper param decides', resolveOrder(null, null), 'paper_param');
eq('an empty mock_id is not an explicit hint', resolveOrder('', 'paper-1'), 'open_attempt');

rule();
line(`  ${failures === 0 ? `ALL ${checks} CHECKS PASS` : `${failures} of ${checks} CHECKS FAILED`}`);
rule();
if (failures) process.exit(1);
