// scripts/test-sit-preview.ts
// Fixtures for the AFM sit paper config + display/resume helpers (lib/acca/sit-preview.ts).
// Pure — no env/DB/model. Proves: resume lands on the first UNANSWERED requirement rather
// than counting submissions; the elapsed clock counts up and never renders negative; the
// candidate-facing label carries no syllabus code; and the paper config cannot collide with
// the APM mock papers in lib/acca/mocks.ts.
//
// THE ALLOWLIST FIXTURES ARE GONE (2026-07-29), with the allowlist itself. `canPreviewSit`
// and `SIT_PREVIEW_EMAILS` no longer exist: access is now the standard APM_CASES flag +
// auth + `hasActiveACCAAccess` entitlement, applied in app/api/acca/sit/route.ts.
//
// COVERAGE RECOVERED, not merely written off. The 13 deleted allowlist checks are replaced
// by checks over the SERVING gate, which is the thing the allowlist was standing in front
// of. That is only meaningful because the gate is now declared as DATA (`SIT_CASE_GATE`)
// and the route builds its query filters by iterating that same object — so these fixtures
// test what the route actually applies, not a restatement of it. What remains untestable
// here is the ACCESS half (flag + auth + entitlement), which reads request and DB state; it
// is covered by being the identical gate every other case route uses.

import {
  nextUnsubmittedIndex,
  isPaperComplete,
  fmtDuration,
  remainingMs,
  isExpired,
  clockState,
  attemptIsClosed,
  COUNTDOWN_WARNING_MINUTES,
  sitDisplayLabel,
  sitCaseGate,
  isSittableCaseRow,
  sitRefusalFor,
  sitPhaseForRefusal,
  resultsOutcomeFor,
  sitWriteOutcomeFor,
} from '../lib/acca/sit-preview';
import { MOCK_PAPERS, getMockPaper } from '../lib/acca/mocks';

// The AFM paper now lives in the merged MOCK_PAPERS registry, not in its own config.
const AFM_MOCK_PAPER_1 = getMockPaper('afm-paper-1')!;
const SIT_CASE_GATE = sitCaseGate('AFM');

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
}

// ── Serving gate: the STANDARD one, and every condition load-bearing ──
// A live, servable row: all four gate columns correct.
const LIVE = { paper_code: 'AFM', mock_only: true, status: 'approved', published: true };

ok('a published+approved+mock_only AFM case PASSES the gate', isSittableCaseRow(LIVE, 'AFM') === true);

// Each condition failing INDIVIDUALLY must block — one at a time, everything else correct,
// so a fixture cannot pass because some other column happened to be wrong too.
ok('published=false alone BLOCKS',        isSittableCaseRow({ ...LIVE, published: false }, 'AFM') === false);
ok("status='candidate' alone BLOCKS",     isSittableCaseRow({ ...LIVE, status: 'candidate' }, 'AFM') === false);
ok('mock_only=false alone BLOCKS',        isSittableCaseRow({ ...LIVE, mock_only: false }, 'AFM') === false);
ok("paper_code='APM' alone BLOCKS",       isSittableCaseRow({ ...LIVE, paper_code: 'APM' }, 'AFM') === false);

// The RETIRED inverted gate: the exact combination the surface used to serve. If this ever
// passes again, the publish-flip trap is back.
ok('the retired INVERTED combination (candidate + unpublished) BLOCKS',
  isSittableCaseRow({ paper_code: 'AFM', mock_only: true, status: 'candidate', published: false }, 'AFM') === false);

// Absent / malformed rows are refusals, never accidental passes.
ok('null row BLOCKS',      isSittableCaseRow(null, 'AFM') === false);
ok('undefined row BLOCKS', isSittableCaseRow(undefined, 'AFM') === false);
ok('empty row BLOCKS',     isSittableCaseRow({}, 'AFM') === false);
ok('a row missing ONE gate column BLOCKS',
  isSittableCaseRow({ paper_code: 'AFM', mock_only: true, status: 'approved' }, 'AFM') === false);
// Truthiness must not stand in for the value: 'true'/1 are not `true`.
ok('published="true" (string) BLOCKS — exact match, not truthiness',
  isSittableCaseRow({ ...LIVE, published: 'true' }, 'AFM') === false);
ok('mock_only=1 (number) BLOCKS — exact match, not truthiness',
  isSittableCaseRow({ ...LIVE, mock_only: 1 }, 'AFM') === false);

// Pin the gate's SHAPE. The route iterates these keys to build its .eq() filters, so
// dropping one here would silently widen what the route serves — this check fails first.
ok('gate has exactly the 4 expected columns',
  JSON.stringify(Object.keys(SIT_CASE_GATE).sort()) ===
  JSON.stringify(['mock_only', 'paper_code', 'published', 'status']));
ok('gate demands published=true',           SIT_CASE_GATE.published === true);
ok("gate demands status='approved'",        SIT_CASE_GATE.status === 'approved');
ok('gate demands mock_only=true',           SIT_CASE_GATE.mock_only === true);
ok('gate paper_code is the paper config\'s own value (not re-typed)',
  SIT_CASE_GATE.paper_code === AFM_MOCK_PAPER_1.paper);

// ── Paper config (now the merged registry, not a second copy) ──
ok('paper is AFM', AFM_MOCK_PAPER_1.paper === 'AFM');
ok('paper has the 3 authored cases', AFM_MOCK_PAPER_1.case_ids.length === 3);
ok('case ids are unique', new Set(AFM_MOCK_PAPER_1.case_ids).size === 3);
ok('Section A case is sat FIRST', AFM_MOCK_PAPER_1.case_ids[0] === 'aa000000-0000-4000-8000-00000000a001');
// MERGED 2026-07-30. These used to assert the AFM paper was NOT in MOCK_PAPERS — the two
// configs were separate and a collision would have made the APM runner adopt an AFM
// attempt. There is one registry now, so the property that matters inverts: it must BE in
// there, exactly once, and still share no id or case id with the APM paper.
ok('the AFM paper IS in the one registry', getMockPaper('afm-paper-1') !== null);
ok('it appears exactly once', MOCK_PAPERS.filter((p) => p.id === AFM_MOCK_PAPER_1.id).length === 1);
ok('paper ids are unique across the registry',
  new Set(MOCK_PAPERS.map((p) => p.id)).size === MOCK_PAPERS.length);
ok('AFM case ids overlap NO APM mock case ids',
  MOCK_PAPERS.filter((p) => p.paper !== 'AFM')
    .every((p) => p.case_ids.every((c) => !AFM_MOCK_PAPER_1.case_ids.includes(c))));
ok('every paper carries a clock', MOCK_PAPERS.every((p) => p.duration_minutes > 0));

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

// ── Duration formatter: H:MM:SS, never negative ──
// Renamed from fmtElapsed 2026-07-31 with the countdown: it renders a DURATION, and the
// clock now runs the other way.
ok('zero renders 0:00:00', fmtDuration(0) === '0:00:00');
ok('59s renders 0:00:59', fmtDuration(59_000) === '0:00:59');
ok('1m renders 0:01:00', fmtDuration(60_000) === '0:01:00');
ok('1h 5m 9s renders 1:05:09', fmtDuration((3600 + 5 * 60 + 9) * 1000) === '1:05:09');
ok('3h20m renders 3:20:00', fmtDuration(200 * 60_000) === '3:20:00');
ok('negative (clock skew) clamps to 0:00:00', fmtDuration(-5_000) === '0:00:00');

// ── THE COUNTDOWN (restored 2026-07-31 for BOTH papers) ─────────────────────
// `ends_at` stops being a NOT NULL placeholder and becomes the deadline. These fixtures pin
// the three things a wrong implementation would get wrong: counting past zero, treating a
// missing deadline as expiry, and warning at the wrong moment.
const T0 = Date.UTC(2026, 6, 31, 9, 0, 0);
const at = (min: number) => new Date(T0 + min * 60_000).toISOString();
const ENDS = at(195);   // a full ACCA paper from T0

ok('195 minutes left at the start', remainingMs(ENDS, T0) === 195 * 60_000);
ok('halfway through, half is left', remainingMs(ENDS, T0 + 97.5 * 60_000) === 97.5 * 60_000);
ok('remaining CLAMPS at zero — it never counts negative', remainingMs(ENDS, T0 + 300 * 60_000) === 0);
ok('a null ends_at has no remaining time to report', remainingMs(null, T0) === null);
ok('an unparseable ends_at reports null, not NaN', remainingMs('not-a-date', T0) === null);

ok('not expired before the deadline', isExpired(ENDS, T0 + 194.9 * 60_000) === false);
ok('expired exactly AT the deadline (the bell counts as time up)', isExpired(ENDS, T0 + 195 * 60_000) === true);
ok('expired after the deadline', isExpired(ENDS, T0 + 196 * 60_000) === true);
// THE LOAD-BEARING NEGATIVE: an unknown deadline must never read as expiry, or a missing
// column would end a paper that is still running.
ok('a null ends_at is NOT expiry', isExpired(null, T0 + 999 * 60_000) === false);
ok('an unparseable ends_at is NOT expiry', isExpired('', T0 + 999 * 60_000) === false);

ok('running with plenty left', clockState(remainingMs(ENDS, T0)) === 'running');
ok(`running just outside the final ${COUNTDOWN_WARNING_MINUTES}`,
  clockState(remainingMs(ENDS, T0 + (195 - COUNTDOWN_WARNING_MINUTES - 1) * 60_000)) === 'running');
ok(`warning exactly at the final ${COUNTDOWN_WARNING_MINUTES}`,
  clockState(remainingMs(ENDS, T0 + (195 - COUNTDOWN_WARNING_MINUTES) * 60_000)) === 'warning');
ok('warning with a minute left', clockState(remainingMs(ENDS, T0 + 194 * 60_000)) === 'warning');
ok('expired at zero', clockState(0) === 'expired');
ok('an unknown deadline never alarms', clockState(null) === 'running');

// ── attemptIsClosed — the SERVER's view of "this paper is over" ─────────────
// Two independent ways to be closed, and `completed` is checked first and alone so a
// finished attempt is closed even with a broken ends_at.
ok('an open attempt inside its clock is NOT closed',
  attemptIsClosed({ completed: false, ends_at: ENDS }, T0 + 10 * 60_000) === false);
ok('a finished attempt is closed', attemptIsClosed({ completed: true, ends_at: ENDS }, T0) === true);
ok('a finished attempt is closed even with an unusable ends_at',
  attemptIsClosed({ completed: true, ends_at: null }, T0) === true);
ok('an unfinished attempt past its deadline is closed (closing the tab buys no time)',
  attemptIsClosed({ completed: false, ends_at: ENDS }, T0 + 196 * 60_000) === true);
ok('an unfinished attempt with no deadline is NOT closed',
  attemptIsClosed({ completed: false, ends_at: null }, T0 + 999 * 60_000) === false);
ok('no attempt at all is not "closed"', attemptIsClosed(null, T0) === false);
ok('undefined attempt is not "closed"', attemptIsClosed(undefined, T0) === false);

// ── Requirement label: the candidate sees the PART, and nothing else ─────────
// CHANGED 2026-07-30. These fixtures used to pin "(i) B3e — 10 marks" → "(i) — 10 marks",
// i.e. the code out, the marks left in the label. Marks now come from the `marks_guide`
// COLUMN and the runner composes the display, so the label reduces to the part alone.
//
// Why the old shape was wrong even though it showed the right thing: AFM's authored labels
// happen to spell the marks in prose and APM's do not, so the same route showed marks for
// one paper and not the other. That was parity by formatting accident, and it would have
// broken silently the first time a label was re-authored without its marks.
const LIVE_LABELS: Array<[string, string, string]> = [
  ['(i) B3e — 10 marks',   'B3e', '(i)'],
  ['(ii) B5b — 16 marks',  'B5b', '(ii)'],
  ['(iii) E2b — 8 marks',  'E2b', '(iii)'],
  ['(iv) E1a — 6 marks',   'E1a', '(iv)'],
  ['(i) B1a — 12 marks',   'B1a', '(i)'],
  ['(ii) B1b — 8 marks',   'B1b', '(ii)'],
  ['(i) E3a — 12 marks',   'E3a', '(i)'],
  ['(ii) E2a — 8 marks',   'E2a', '(ii)'],
];
for (const [stored, lo, want] of LIVE_LABELS) {
  ok(`live label "${stored}" reduces to "${want}"`, sitDisplayLabel(stored, lo) === want);
}
// The two properties that actually matter, asserted independently of exact wording.
ok('no live label leaks a syllabus code',
  LIVE_LABELS.every(([stored, lo]) => !/\b[A-E][0-9]{1,2}[a-z]?\b/.test(sitDisplayLabel(stored, lo) ?? '')));
ok('no live label carries a marks phrase any more',
  LIVE_LABELS.every(([stored, lo]) => !/marks?/i.test(sitDisplayLabel(stored, lo) ?? '')));

// Backstop: the code goes even when the row's lo_code is missing or disagrees.
ok('code stripped with NO lo_code supplied', sitDisplayLabel('(i) B3e — 10 marks') === '(i)');
ok('code stripped when lo_code is null', sitDisplayLabel('(i) B3e — 10 marks', null) === '(i)');
ok('code stripped when lo_code DISAGREES with the label',
  sitDisplayLabel('(i) B3e — 10 marks', 'C2a') === '(i)');
ok('a two-digit area code is stripped', sitDisplayLabel('(i) B12c — 10 marks', 'B12c') === '(i)');
ok('a code with no trailing letter is stripped', sitDisplayLabel('(i) E3 — 8 marks', 'E3') === '(i)');

// APM labels carry no code and no marks — they must pass through as the part.
ok('an APM-shaped label is unchanged', sitDisplayLabel('(a)') === '(a)');
ok('an APM label with prose keeps the prose', sitDisplayLabel('(b) Performance report') === '(b) Performance report');

// Marks phrasing, in every authored form seen in the corpus.
ok('an em-dash marks phrase is removed', sitDisplayLabel('(i) — 10 marks') === '(i)');
ok('a bracketed marks phrase is removed', sitDisplayLabel('(i) (10 marks)') === '(i)');
ok('a singular "1 mark" is removed', sitDisplayLabel('(i) — 1 mark') === '(i)');
ok('a hyphen marks phrase is removed', sitDisplayLabel('(i) - 8 marks') === '(i)');

// A dangling separator left by the removal must not reach the candidate.
ok('a leading dash left behind is tidied', sitDisplayLabel('B3e — 10 marks', 'B3e') === null);
ok('a trailing dash left behind is tidied', sitDisplayLabel('(i) — B3e', 'B3e') === '(i)');
ok('a code-only label renders NOTHING rather than an empty chip',
  sitDisplayLabel('B3e', 'B3e') === null);
ok('an all-separator remnant renders nothing', sitDisplayLabel('— B3e —', 'B3e') === null);
ok('a marks-only label renders nothing', sitDisplayLabel('10 marks') === null);

// Everything else in a label is preserved untouched.
ok('roman numerals are never mistaken for a code', sitDisplayLabel('(iii) — 8 marks') === '(iii)');
ok('the mark number is never mistaken for a code', sitDisplayLabel('(i) — 10 marks', 'B3e') === '(i)');
ok('prose in a label survives', sitDisplayLabel('(i) Part one — 10 marks') === '(i) Part one');
ok('null label stays null', sitDisplayLabel(null) === null);
ok('undefined label stays null', sitDisplayLabel(undefined) === null);

// ── STATUS → PHASE / OUTCOME (added 2026-08-12) ───────────────────────────────
// The defect these guard is not a crash. It is a student being told to retry something that
// cannot succeed, three times over, with the worst instance landing after a 3h15m paper has
// already been sat. Nothing throws; the copy is simply false. Only a behavioural assertion
// over the mapping catches that class.
//
// P-G3: THE THREE COLLAPSES THAT SHIPPED ARE PINNED AS MUST-FAIL. Each is exactly what the
// code did before this change, and each would pass a suite that only checked the happy path.
//
//   OK_ONLY      the load arm: `!res.ok` → one phase, one string. Cannot distinguish 402.
//   ANY_409_OK   the write arm: `res.ok || res.status === 409`. Reports `attempt_closed`
//                and `no_open_attempt` — both refusals — to the student as SAVED WORK.
//   CODE_ONLY    the results arm: only `paper_not_finished` was special-cased, so a lapsed
//                subscription got the generic retry copy under a "Try marking again" button.
const OK_ONLY = (status: number) => (status >= 200 && status < 300 ? 'ok' : 'error');
const ANY_409_OK = (status: number) => (status >= 200 && status < 300) || status === 409;
const CODE_ONLY = (_status: number, code?: string | null) =>
  code === 'paper_not_finished' ? 'not_finished' : 'failed';

ok('MUST-FAIL: the load collapse cannot tell 402 from 500 — both are "error"',
  OK_ONLY(402) === OK_ONLY(500));
ok('...and the real mapping separates them',
  sitPhaseForRefusal(sitRefusalFor(402)) !== sitPhaseForRefusal(sitRefusalFor(500)));

ok('MUST-FAIL: the write collapse calls attempt_closed a success',
  ANY_409_OK(409) === true);
ok('...and the real mapping refuses it',
  sitWriteOutcomeFor(409, 'attempt_closed').ok === false);
ok('...while still counting already_submitted as saved (the reason that arm existed)',
  sitWriteOutcomeFor(409, 'already_submitted').ok === true);

ok('MUST-FAIL: the results collapse sends a 402 to the generic retry copy',
  CODE_ONLY(402, 'subscription_required') === 'failed');
ok('...and the real mapping calls it paper_locked',
  resultsOutcomeFor(402, 'subscription_required') === 'paper_locked');

// ── sitRefusalFor / sitPhaseForRefusal ──
ok('402 is the only load status that is not an error phase',
  sitRefusalFor(402) === 'paper_locked' && sitPhaseForRefusal('paper_locked') === 'locked');
ok('404 is not_available and lands in error',
  sitRefusalFor(404) === 'not_available' && sitPhaseForRefusal('not_available') === 'error');
ok('500 is failed', sitRefusalFor(500) === 'failed');
ok('502 is failed', sitRefusalFor(502) === 'failed');
// 401 deliberately shares the `failed` copy: the mock PAGE redirects an unauthenticated
// visitor server-side, so a reload really does resolve a session that expired mid-flight.
ok('401 is failed, so "reload" stays the honest instruction for it',
  sitRefusalFor(401) === 'failed' && sitPhaseForRefusal(sitRefusalFor(401)) === 'error');

// ── resultsOutcomeFor ──
ok('a 200 is ok', resultsOutcomeFor(200, null) === 'ok');
ok('a 201 is ok', resultsOutcomeFor(201, null) === 'ok');
ok('402 is paper_locked regardless of code', resultsOutcomeFor(402, null) === 'paper_locked');
// `paper_not_finished` arrives as a 409, so the CODE is load-bearing — the status alone cannot
// decide it, which is the whole reason this function takes two arguments.
ok('409 paper_not_finished is not_finished', resultsOutcomeFor(409, 'paper_not_finished') === 'not_finished');
ok('409 with a different code is failed, not silently not_finished',
  resultsOutcomeFor(409, 'no_attempt') === 'failed');
ok('409 with no code is failed', resultsOutcomeFor(409, null) === 'failed');
ok('404 is failed', resultsOutcomeFor(404, null) === 'failed');
ok('500 is failed (results)', resultsOutcomeFor(500, null) === 'failed');
ok('a status alone can never yield not_finished — the code is required',
  resultsOutcomeFor(409, undefined) !== 'not_finished');

// ── sitWriteOutcomeFor ──
ok('a 200 write is ok and not flagged already-submitted',
  (() => { const o = sitWriteOutcomeFor(200, null); return o.ok === true && o.alreadySubmitted === false; })());
ok('already_submitted is ok AND flagged, because the answer really is recorded',
  (() => { const o = sitWriteOutcomeFor(409, 'already_submitted'); return o.ok === true && o.alreadySubmitted === true; })());
ok('402 is a paper_locked refusal',
  (() => { const o = sitWriteOutcomeFor(402, 'subscription_required'); return o.ok === false && o.reason === 'paper_locked'; })());
ok('attempt_closed is a refusal, not a save',
  (() => { const o = sitWriteOutcomeFor(409, 'attempt_closed'); return o.ok === false && o.reason === 'attempt_closed'; })());
ok('no_open_attempt is a refusal, not a save',
  (() => { const o = sitWriteOutcomeFor(409, 'no_open_attempt'); return o.ok === false && o.reason === 'attempt_closed'; })());
// An UNRECOGNISED 409 must fail, which is the safe direction and self-correcting: if the write
// had in fact landed, the retry returns already_submitted and reads as saved. The reverse —
// claiming saved — has no recovery at all.
ok('an unknown 409 code is a failure, not an assumed save',
  (() => { const o = sitWriteOutcomeFor(409, 'something_new'); return o.ok === false && o.reason === 'failed'; })());
ok('a 409 with no code at all is a failure',
  (() => { const o = sitWriteOutcomeFor(409, null); return o.ok === false && o.reason === 'failed'; })());
ok('a 500 write is a plain failure',
  (() => { const o = sitWriteOutcomeFor(500, null); return o.ok === false && o.reason === 'failed'; })());
ok('a 404 write is a plain failure',
  (() => { const o = sitWriteOutcomeFor(404, null); return o.ok === false && o.reason === 'failed'; })());

// The three refusal reasons stay DISTINCT, because each needs a different thing from the
// student: an action that makes the retry work, a move to the results, or a blind retry.
ok('the write refusal reasons do not collapse into one another',
  new Set([
    (sitWriteOutcomeFor(402, 'subscription_required') as { ok: false; reason: string }).reason,
    (sitWriteOutcomeFor(409, 'attempt_closed') as { ok: false; reason: string }).reason,
    (sitWriteOutcomeFor(500, null) as { ok: false; reason: string }).reason,
  ]).size === 3);

// A locked outcome must never also read as saved — the one confusion that would send a student
// back into the paper believing an unsaved answer was banked.
ok('paper_locked is never ok', sitWriteOutcomeFor(402, null).ok === false);

// ── The verdict ─────────────────────────────────────────────────────────────
// ADDED 2026-08-05. `failures` was incremented above and NEVER READ: every check could fail
// and this file still exited 0, so the contract gate reported `ok test-sit-preview` and
// `PASS 46/46` while printing `FAIL ::` lines directly above it. A fixture inside the gate
// that cannot go red is worse than one outside it — it prints PASS into every build log,
// including Vercel's. Proved by breaking fmtDuration(0) and watching the gate stay green.
// P-G4: exitCode, never process.exit().
console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} sit-preview: ${failures} failure(s)`);
process.exitCode = failures === 0 ? 0 : 1;
