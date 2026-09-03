// scripts/test-trainee-sit.ts
// Unit tests for the coordinator's cross-user sit reader (lib/org/trainee-sit.ts).
// PURE — no env, no DB, no model, no clock. Exit 1 on any fail.
//
// Run: npm run test:trainee-sit
//
// ── WHAT IS TESTED HERE, AND WHAT IS NOT ─────────────────────────────────────
// `getTraineeSitResults` is I/O: it picks an attempt, runs four queries and hands the rows
// to functions that ALREADY have fixtures (orderPaper, computePacing, buildDebrief). What
// is genuinely new and genuinely dangerous is the SIT/PRACTICE boundary — a practice row
// reaching a sit debrief would be marked, paced and attributed as a sat answer — so that is
// what is pinned here, on the pure function that enforces it.
//
// P-G3(a) BOTH HALVES throughout. A suite that only proved "the practice row is dropped"
// passes against a filter that drops everything, which loses the sit entirely — the failure
// that is worse than the bug.

import { rowsForAttempt, answersByRequirement, type SitProgressRow } from '../lib/org/trainee-sit';

let failures = 0;
function check(name: string, cond: boolean, detail = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${cond ? '' : `  ${detail}`}`);
  if (!cond) failures++;
}

const ATTEMPT = 'attempt-this-one';
const OTHER_ATTEMPT = 'attempt-a-different-sitting';

const row = (over: Partial<SitProgressRow>): SitProgressRow => ({
  requirement_id: 'req-1',
  case_id: 'case-1',
  requirement_order: 1,
  label: '(i) The benchmarking exercise',
  lo_code: 'A1g',
  marks_guide: 16,
  attempt_id: ATTEMPT,
  submitted_at: '2026-09-01T23:53:58.166Z',
  final_answer: 'A real sat answer.',
  band: 'competent',
  technical_marks_awarded: 8,
  technical_feedback: 'Marker reasoning.',
  ...over,
});

// ── T1: THE SIT/PRACTICE BOUNDARY — one requirement, BOTH rows present ────────
// This is the exact shape acca_case_progress permits: UNIQUE NULLS NOT DISTINCT over
// (user_id, case_id, requirement_id, attempt_id) means one requirement legitimately holds a
// practice row AND a sit row, and the practice row carries a final_answer too.
{
  const sitRow = row({ final_answer: 'THE SAT ANSWER', technical_marks_awarded: 8 });
  const practiceRow = row({ attempt_id: null, final_answer: 'coached practice answer', band: null,
    technical_marks_awarded: null, technical_feedback: null });
  const both = [practiceRow, sitRow];

  const kept = rowsForAttempt(both, ATTEMPT);
  check('T1a: the practice row does NOT appear', kept.every((r) => r.attempt_id !== null));
  check('T1b: the SIT row DOES appear', kept.length === 1 && kept[0].final_answer === 'THE SAT ANSWER',
    JSON.stringify(kept.map((r) => r.final_answer)));
  check('T1c: exactly one of the two coexisting rows survives', kept.length === 1);
  check('T1d: the practice answer text is nowhere in the result',
    !kept.some((r) => (r.final_answer ?? '').includes('coached')));
}

// ── T2: another SITTING is not this sitting ──────────────────────────────────
// A trainee with two sits must not get a blend. Dropping only NULLs would let this through.
{
  const mine = row({ final_answer: 'this sitting' });
  const theirs = row({ attempt_id: OTHER_ATTEMPT, final_answer: 'an earlier sitting' });
  const kept = rowsForAttempt([theirs, mine], ATTEMPT);
  check('T2a: a row from a DIFFERENT completed sitting is dropped', kept.length === 1);
  check('T2b: and it is this sitting that survives', kept[0]?.final_answer === 'this sitting');
}

// ── T3: MUST-FAIL — the two ways to get this wrong ───────────────────────────
{
  const sitRow = row({});
  const practiceRow = row({ attempt_id: null });
  const otherRow = row({ attempt_id: OTHER_ATTEMPT });
  const all = [practiceRow, sitRow, otherRow];

  const NO_FILTER = (rows: SitProgressRow[]) => rows;
  check('T3a: an unfiltered read is pinned WRONG (keeps all three)', NO_FILTER(all).length === 3);

  // The plausible-but-wrong version: "just exclude practice".
  const NULLS_ONLY = (rows: SitProgressRow[]) => rows.filter((r) => r.attempt_id != null);
  check('T3b: a NULL-only filter is pinned WRONG (still admits another sitting)',
    NULLS_ONLY(all).length === 2 && rowsForAttempt(all, ATTEMPT).length === 1);
}

// ── T4: a blank submission is REAL and must survive ──────────────────────────
// '' is a final, zero-credit answer. Filtering on truthiness rather than the attempt id
// would silently delete it and shorten the paper, shifting every pacing interval after it.
{
  const blank = row({ requirement_id: 'req-blank', final_answer: '', band: 'nothing', technical_marks_awarded: 0 });
  const kept = rowsForAttempt([blank], ATTEMPT);
  check('T4a: a blank sat answer survives the filter', kept.length === 1);
  check('T4b: and it is still an empty string, not coerced to null',
    kept[0].final_answer === '', JSON.stringify(kept[0].final_answer));
}

// ── T5: nothing to show is EMPTY, not an error ───────────────────────────────
{
  check('T5a: no rows at all yields an empty list, not a throw', rowsForAttempt([], ATTEMPT).length === 0);
  check('T5b: only practice rows yields an empty list',
    rowsForAttempt([row({ attempt_id: null })], ATTEMPT).length === 0);
}

// ── T6: the answers map — the payload behind the expand ──────────────────────
{
  const rows = [
    row({ requirement_id: 'r1', final_answer: 'first' }),
    row({ requirement_id: 'r2', final_answer: '' }),
    row({ requirement_id: 'r3', final_answer: null }),
  ];
  const a = answersByRequirement(rows);
  check('T6a: written answers are keyed by requirement', a.r1 === 'first');
  check('T6b: a blank submission is "" — distinguishable from not reached', a.r2 === '');
  check('T6c: a never-reached requirement is null, not ""', a.r3 === null);
  check('T6d: the map holds exactly the rows given', Object.keys(a).length === 3);
}

console.log(`\n${failures === 0 ? 'ALL TRAINEE-SIT FIXTURES PASS' : `${failures} FAILURE(S)`}`);
process.exit(failures === 0 ? 0 : 1);
