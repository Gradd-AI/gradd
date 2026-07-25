// scripts/test-sit-preview.ts
// Fixtures for the AFM sit preview gate + paper config (lib/acca/sit-preview.ts).
// Pure — no env/DB/model. Proves: the allowlist admits ONLY the ruled test account
// (and is not fooled by case/whitespace, nor by empty/null); resume lands on the
// first UNANSWERED requirement rather than counting submissions; the elapsed clock
// counts up and never renders negative; and the paper config cannot collide with the
// APM mock papers in lib/acca/mocks.ts.

import {
  canPreviewSit,
  nextUnsubmittedIndex,
  isPaperComplete,
  fmtElapsed,
  AFM_MOCK_PAPER_1,
  SIT_PREVIEW_EMAILS,
} from '../lib/acca/sit-preview';
import { MOCK_PAPERS, getMockPaper } from '../lib/acca/mocks';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
}

// ── Allowlist: exactly one account, and nothing else ──
ok('the ruled test account is admitted', canPreviewSit('erasmoose@outlook.ie') === true);
ok('allowlist is exactly one entry', SIT_PREVIEW_EMAILS.length === 1);
ok('uppercase form is admitted (case-insensitive)', canPreviewSit('Erasmoose@Outlook.ie') === true);
ok('surrounding whitespace is tolerated', canPreviewSit('  erasmoose@outlook.ie  ') === true);

ok('a different real user is REFUSED', canPreviewSit('grant@live.ie') === false);
ok('the admin account is REFUSED (not on this allowlist)', canPreviewSit('testbundle@gradd.ai') === false);
ok('a paying student is REFUSED', canPreviewSit('maphosaan@gmail.com') === false);
ok('null is refused', canPreviewSit(null) === false);
ok('undefined is refused', canPreviewSit(undefined) === false);
ok('empty string is refused', canPreviewSit('') === false);
ok('whitespace-only is refused', canPreviewSit('   ') === false);
// A substring/prefix must never satisfy the gate.
ok('a lookalike domain is refused', canPreviewSit('erasmoose@outlook.ie.evil.com') === false);
ok('a lookalike local-part is refused', canPreviewSit('xerasmoose@outlook.ie') === false);

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

console.log(failures === 0 ? '\nALL SIT-PREVIEW FIXTURES PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
