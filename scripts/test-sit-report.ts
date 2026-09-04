// scripts/test-sit-report.ts
// Unit tests for the SHARED sit-report reader (lib/acca/sit-report.ts) — the module the
// student's permanent results page and the coordinator's trainee view both call.
// PURE — no env, no DB, no model, no clock. Exit 1 on any fail.
//
// Run: npm run test:sit-report
//
// ── WHAT IS TESTED HERE, AND WHAT IS NOT ─────────────────────────────────────
// `buildSitReport`/`assembleSitReport` are I/O: they run five queries and hand the rows to
// functions that ALREADY have fixtures (orderPaper, computePacing, buildDebrief). Two rules
// in this module are pure, new, and each is a defect that would look fine in production:
//
//   1. THE SIT/PRACTICE BOUNDARY (`rowsForAttempt`) — a practice row reaching a sit debrief
//      would be marked, paced and attributed as a sat answer. Covered in depth by
//      scripts/test-trainee-sit.ts against the SAME function, which this suite re-checks
//      through its new import path so a bad re-export cannot pass unnoticed.
//   2. WHICH SITTINGS ARE OPENABLE (`summariseSittings`) — 13 of 15 completed attempts in
//      production hold no progress rows, so a list keyed on `completed` offers blank papers.
//      That is the rule this suite exists for.
//
// P-G3(a) BOTH HALVES throughout. A suite that only proved "the empty attempt is dropped"
// passes against a filter that drops everything, which is the worse failure: a student with
// a real sat paper told they have none.

import {
  rowsForAttempt,
  answersByRequirement,
  summariseSittings,
  type SitProgressRow,
  type SitAttemptRow,
  type SitAttemptProgressRow,
} from '../lib/acca/sit-report';
import { getMockPapers, MOCK_PAPERS, type MockPaper } from '../lib/acca/mocks';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\nsit-report — one assembly for every reader of a sat paper\n');

// ── THE SIT/PRACTICE BOUNDARY, THROUGH THE NEW IMPORT PATH ───────────────────
console.log('  the sit/practice boundary');
{
  const ATTEMPT = 'attempt-this-one';
  const base = (over: Partial<SitProgressRow>): SitProgressRow => ({
    requirement_id: 'req-1', case_id: 'case-1', requirement_order: 1,
    label: '(i) B3e — 10 marks', lo_code: 'B3e', marks_guide: 10,
    attempt_id: ATTEMPT, submitted_at: '2026-09-01T23:53:58.166Z',
    final_answer: 'A real sat answer.', band: 'competent',
    technical_marks_awarded: 5, technical_feedback: 'Marker reasoning.',
    ...over,
  });

  // The exact shape acca_case_progress permits: UNIQUE NULLS NOT DISTINCT over
  // (user_id, case_id, requirement_id, attempt_id) means ONE requirement legitimately holds
  // a practice row AND a sit row, and the practice row carries a final_answer too.
  const sitRow = base({ final_answer: 'THE SAT ANSWER' });
  const practiceRow = base({ attempt_id: null, final_answer: 'coached practice answer', band: null });
  const kept = rowsForAttempt([practiceRow, sitRow], ATTEMPT);

  ok('the practice row is dropped', kept.every((r) => r.attempt_id !== null));
  ok('the SIT row survives (the half that matters)',
    kept.length === 1 && kept[0].final_answer === 'THE SAT ANSWER');
  ok('a row from a DIFFERENT sitting is dropped',
    rowsForAttempt([base({ attempt_id: 'another-sitting' })], ATTEMPT).length === 0);
  ok('the practice answer text is nowhere in the answer map',
    !JSON.stringify(answersByRequirement(kept)).includes('coached practice'));

  // '' is a REAL blank submission — the student pressed submit with an empty box, which the
  // debrief reports differently from a requirement never reached. It must survive as '' and
  // never collapse to null or be dropped.
  const blank = answersByRequirement([base({ requirement_id: 'req-blank', final_answer: '' })]);
  ok('a blank submission is preserved as an empty string, not lost',
    'req-blank' in blank && blank['req-blank'] === '');
}

// ── WHICH SITTINGS ARE OPENABLE ──────────────────────────────────────────────
console.log('\n  the index — a completed attempt is not automatically an openable one');

// The REAL registry, not a stub: the summariser's denominators come from a paper's own case
// list, and a fake paper would prove it multiplies numbers rather than that it agrees with
// the papers we serve.
const AFM: MockPaper = getMockPapers('AFM')[0];
const APM: MockPaper = getMockPapers('APM')[0];
const papersById = new Map(MOCK_PAPERS.map((p) => [p.id, p]));
// 8 requirements on the AFM paper: 3 + 3 + 2 across its three cases. Stated as a map the way
// the query returns it, so the fixture exercises the real reduce.
const REQS = new Map<string, number>([
  [AFM.case_ids[0], 3], [AFM.case_ids[1], 3], [AFM.case_ids[2], 2],
  [APM.case_ids[0], 3], [APM.case_ids[1], 2], [APM.case_ids[2], 2],
]);

const attempt = (id: string, mockId: string, started: string): SitAttemptRow =>
  ({ id, mock_id: mockId, started_at: started, completed_at: null });
const prog = (attemptId: string | null, band: string | null = null): SitAttemptProgressRow =>
  ({ attempt_id: attemptId, band });

{
  // The production shape, exactly: a real sitting alongside four completed-but-empty ones.
  const attempts = [
    attempt('a-real', AFM.id, '2026-08-09T18:05:17Z'),
    attempt('a-empty-1', APM.id, '2026-07-06T15:39:33Z'),
    attempt('a-empty-2', APM.id, '2026-07-04T11:04:08Z'),
  ];
  const progress = [prog('a-real', 'competent'), prog('a-real', 'weak'), prog('a-real', null)];

  const out = summariseSittings(attempts, papersById, progress, REQS);
  ok('the sitting with real rows IS listed', out.length === 1 && out[0].attempt_id === 'a-real');
  ok('the completed-but-empty sittings are NOT listed',
    !out.some((s) => s.attempt_id.startsWith('a-empty')));
  ok('it counts every answered requirement, banded or not', out[0].answered === 3);
  ok('it counts only the BANDED ones as marked', out[0].banded === 2);
  ok('the denominator comes from the paper, not from the rows', out[0].total === 8);
  ok('the paper and title come from the registry', out[0].paper === 'AFM' && out[0].title === AFM.title);
}

{
  // P-G3(a) — the other direction. A filter that dropped everything would pass every check
  // above except this one.
  const attempts = [attempt('s1', AFM.id, '2026-08-09T18:05:17Z'), attempt('s2', AFM.id, '2026-07-01T09:00:00Z')];
  const out = summariseSittings(attempts, papersById, [prog('s1'), prog('s2')], REQS);
  ok('two real sittings both survive', out.length === 2);
  ok('...in the order they were given, newest first (never re-sorted on the nullable completed_at)',
    out[0].attempt_id === 's1' && out[1].attempt_id === 's2');
}

{
  // A PRACTICE row must not make an empty sitting look sat. This is the same defect class as
  // rowsForAttempt, one layer up, and it is the one that would silently resurrect every
  // blank paper the filter exists to hide.
  const out = summariseSittings([attempt('a', AFM.id, '2026-08-09T18:05:17Z')], papersById,
    [prog(null, 'competent'), prog(null, 'strong')], REQS);
  ok('an attempt whose only rows are practice rows is NOT listed', out.length === 0);
}

{
  const out = summariseSittings([attempt('a', 'paper-99', '2026-08-09T18:05:17Z')], papersById,
    [prog('a', 'strong')], REQS);
  ok('an attempt on an unregistered mock_id is dropped, not rendered with a blank title',
    out.length === 0);
}

{
  // A sat but unmarked paper IS listed — it is the student's work, and it is exactly the case
  // the index has to name so they can go and get it marked. Reporting it as marked, or hiding
  // it, are both worse.
  const out = summariseSittings([attempt('a', AFM.id, '2026-08-09T18:05:17Z')], papersById,
    [prog('a'), prog('a')], REQS);
  ok('a sat-but-never-marked paper is listed with banded = 0',
    out.length === 1 && out[0].answered === 2 && out[0].banded === 0);
}

{
  // The clock case: the auto-submit records the requirement being written and deliberately
  // does not back-fill the tail, so `answered < total` is the honest reading of a paper that
  // ran out of time — not a bug to be papered over by using the row count as the denominator.
  const out = summariseSittings([attempt('a', AFM.id, '2026-08-09T18:05:17Z')], papersById,
    [prog('a', 'weak'), prog('a', 'competent')], REQS);
  ok('a paper that ended on the clock reports 2 of 8, not 2 of 2',
    out[0].answered === 2 && out[0].total === 8);
}

{
  const out = summariseSittings([], papersById, [], REQS);
  ok('no attempts yields an empty list rather than throwing', Array.isArray(out) && out.length === 0);
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} sit-report: ${pass}/${pass + fail} checks\n`);
// P-G4: never process.exit() — let the runtime flush stdout first.
process.exitCode = fail === 0 ? 0 : 1;
