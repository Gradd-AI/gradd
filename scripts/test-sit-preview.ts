// scripts/test-sit-preview.ts
// Fixtures for the AFM sit paper config + display/resume helpers (lib/acca/sit-preview.ts).
// Pure — no env/DB/model. Proves: resume lands on the first UNANSWERED requirement rather
// than counting submissions; the elapsed clock counts up and never renders negative; the
// candidate-facing label carries no syllabus code; and the paper config cannot collide with
// the APM mock papers in lib/acca/mocks.ts.
//
// THE ALLOWLIST FIXTURES ARE GONE (2026-07-29), with the allowlist itself. `canPreviewSit`
// and `SIT_PREVIEW_EMAILS` no longer exist: access is now the standard APM_CASES flag +
// auth + `hasActiveAPMAccess` entitlement, applied in app/api/acca/sit/route.ts. That is a
// route-level gate against live DB state, so it is not testable in this pure suite — it is
// covered by the same gate every other case route uses rather than by a bespoke predicate.
// Deleting the fixtures is therefore a REDUCTION IN PURE COVERAGE and is recorded as such:
// 13 checks removed, no equivalent pure replacement added.

import {
  nextUnsubmittedIndex,
  isPaperComplete,
  fmtElapsed,
  sitDisplayLabel,
  AFM_MOCK_PAPER_1,
} from '../lib/acca/sit-preview';
import { MOCK_PAPERS, getMockPaper } from '../lib/acca/mocks';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
}

// ── Paper config ──
ok('paper is AFM', AFM_MOCK_PAPER_1.paper === 'AFM');
ok('paper has the 3 authored cases', AFM_MOCK_PAPER_1.case_ids.length === 3);
ok('case ids are unique', new Set(AFM_MOCK_PAPER_1.case_ids).size === 3);
ok('Section A case is sat FIRST', AFM_MOCK_PAPER_1.case_ids[0] === 'aa000000-0000-4000-8000-00000000a001');
// The sit id must not be addressable as an APM mock, or an attempt row written by the
// sit would be picked up by app/acca/mock/MockRunner.tsx as an APM attempt.
ok('sit paper id is NOT an APM mock id', getMockPaper(AFM_MOCK_PAPER_1.id) === null);
ok('sit paper id collides with no MOCK_PAPERS id', MOCK_PAPERS.every((p) => p.id !== AFM_MOCK_PAPER_1.id));
ok('sit case ids overlap NO APM mock case ids',
  MOCK_PAPERS.every((p) => p.case_ids.every((c) => !AFM_MOCK_PAPER_1.case_ids.includes(c))));

// ── Resume: first UNANSWERED requirement, not a submission count ──
const ids = ['r1', 'r2', 'r3', 'r4'];
ok('a fresh paper resumes at 0', nextUnsubmittedIndex(ids, new Set()) === 0);
ok('two submitted → resumes at index 2', nextUnsubmittedIndex(ids, new Set(['r1', 'r2'])) === 2);
ok('all submitted → returns length (paper over)', nextUnsubmittedIndex(ids, new Set(ids)) === 4);
// The distinguishing case: an out-of-order write must NOT skip the unanswered r1.
ok('a GAP re-presents the unanswered requirement (not a count)',
  nextUnsubmittedIndex(ids, new Set(['r2', 'r3'])) === 0);
ok('unknown ids in the submitted set do not shift the index',
  nextUnsubmittedIndex(ids, new Set(['zz'])) === 0);

ok('complete only when every requirement is recorded', isPaperComplete(ids, new Set(ids)) === true);
ok('a gap means NOT complete', isPaperComplete(ids, new Set(['r1', 'r2', 'r4'])) === false);
ok('an empty paper is never "complete"', isPaperComplete([], new Set()) === false);

// ── Elapsed clock: counts UP, never negative, H:MM:SS ──
ok('zero renders 0:00:00', fmtElapsed(0) === '0:00:00');
ok('59s renders 0:00:59', fmtElapsed(59_000) === '0:00:59');
ok('1m renders 0:01:00', fmtElapsed(60_000) === '0:01:00');
ok('1h 5m 9s renders 1:05:09', fmtElapsed((3600 + 5 * 60 + 9) * 1000) === '1:05:09');
ok('past the nominal 3h15m it keeps counting (no expiry)', fmtElapsed(200 * 60_000) === '3:20:00');
ok('negative (clock skew) clamps to 0:00:00', fmtElapsed(-5_000) === '0:00:00');

// ── Requirement label: the candidate sees the part and the marks, never the code ──
// The 8 REAL stored labels of AFM Mock Paper 1, verbatim, each with its row's lo_code.
// If an authored label ever changes shape, these are the fixtures that catch it.
const LIVE_LABELS: Array<[string, string, string]> = [
  ['(i) B3e — 10 marks',   'B3e', '(i) — 10 marks'],
  ['(ii) B5b — 16 marks',  'B5b', '(ii) — 16 marks'],
  ['(iii) E2b — 8 marks',  'E2b', '(iii) — 8 marks'],
  ['(iv) E1a — 6 marks',   'E1a', '(iv) — 6 marks'],
  ['(i) B1a — 12 marks',   'B1a', '(i) — 12 marks'],
  ['(ii) B1b — 8 marks',   'B1b', '(ii) — 8 marks'],
  ['(i) E3a — 12 marks',   'E3a', '(i) — 12 marks'],
  ['(ii) E2a — 8 marks',   'E2a', '(ii) — 8 marks'],
];
for (const [stored, lo, want] of LIVE_LABELS) {
  ok(`live label "${stored}" renders as "${want}"`, sitDisplayLabel(stored, lo) === want);
}
// The property that actually matters, asserted independently of the exact wording:
// nothing syllabus-code-shaped survives into ANY candidate-facing label.
ok('no live label leaks a syllabus code',
  LIVE_LABELS.every(([stored, lo]) => !/\b[A-E][0-9]{1,2}[a-z]?\b/.test(sitDisplayLabel(stored, lo) ?? '')));
ok('the mark allocation is always kept',
  LIVE_LABELS.every(([stored, lo]) => (sitDisplayLabel(stored, lo) ?? '').includes('marks')));

// Backstop: the code is stripped even when the row's lo_code is missing or disagrees.
ok('code stripped with NO lo_code supplied', sitDisplayLabel('(i) B3e — 10 marks') === '(i) — 10 marks');
ok('code stripped when lo_code is null', sitDisplayLabel('(i) B3e — 10 marks', null) === '(i) — 10 marks');
ok('code stripped when lo_code DISAGREES with the label',
  sitDisplayLabel('(i) B3e — 10 marks', 'C2a') === '(i) — 10 marks');
ok('a two-digit area code is stripped', sitDisplayLabel('(i) B12c — 10 marks', 'B12c') === '(i) — 10 marks');
ok('a code with no trailing letter is stripped', sitDisplayLabel('(i) E3 — 8 marks', 'E3') === '(i) — 8 marks');

// A dangling separator left by the removal must not reach the candidate.
ok('a leading dash left behind is tidied', sitDisplayLabel('B3e — 10 marks', 'B3e') === '10 marks');
ok('a trailing dash left behind is tidied', sitDisplayLabel('(i) — B3e', 'B3e') === '(i)');
ok('a code-only label renders NOTHING rather than an empty chip',
  sitDisplayLabel('B3e', 'B3e') === null);
ok('an all-separator remnant renders nothing', sitDisplayLabel('— B3e —', 'B3e') === null);

// Everything else in a label is preserved untouched.
ok('a label with no code is returned unchanged', sitDisplayLabel('(i) — 10 marks') === '(i) — 10 marks');
ok('roman numerals are never mistaken for a code', sitDisplayLabel('(iii) — 8 marks') === '(iii) — 8 marks');
ok('the mark number is never mistaken for a code', sitDisplayLabel('(i) — 10 marks', 'B3e') === '(i) — 10 marks');
ok('prose in a label survives', sitDisplayLabel('(i) Part one — 10 marks') === '(i) Part one — 10 marks');
ok('null label stays null', sitDisplayLabel(null) === null);
ok('undefined label stays null', sitDisplayLabel(undefined) === null);

console.log(failures === 0 ? '\nALL SIT-PREVIEW FIXTURES PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
