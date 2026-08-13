// lib/acca/sit-preview.ts
// Pure paper config + display/resume helpers for the AFM Mock Paper 1 SIT surface. No
// DB, no model, no I/O — the server page and the API route both import these, so the
// behaviour is testable in isolation and provably identical in both places.
//
// ── THE INVERTED GATE IS RETIRED (2026-07-29) ────────────────────────────────
// This module used to define the INVERSE of every other serving gate: a case was
// sit-servable only while it was UNPUBLISHED (`published=false AND status='candidate'`),
// and access was a one-entry email allowlist. That was correct while the paper was
// unadjudicated pre-release content, and it had a fatal end-state: flipping the three
// cases to `approved`/`published=true` would have made the gate stop matching and 404
// the surface. Publishing the paper would have BROKEN it. That was the publish-flip trap.
//
// Both halves are now gone. `app/api/acca/sit/route.ts` gates on the STANDARD
// `status='approved' AND published=true` like every other case route, behind the same
// APM_CASES flag and a per-paper `hasPaperAccess` entitlement, and the allowlist is
// deleted — the sit surface is the real product surface, reachable by any entitled
// student. Answer writes go through `app/api/acca/case/turn` (sitting:true), the same
// route the APM sit uses, so there is ONE write path and one immutability rule.
//
// CONSEQUENCE, deliberate and load-bearing: until the three cases are flipped to
// approved/published the surface serves NOTHING (404 "Paper not available"). The gate
// change and the content flip are separate steps by design — P-DB2 governs the flip and
// it is Grant's, taken after the end-to-end walk, not something this code performs.
//
// `mock_only=true` is still asserted. That was never the inverted part: it keeps the
// paper's cases out of the practice library (which lists `mock_only=false`) and keeps a
// non-paper case from being posted into the sit by id.

// ── Paper config lives in lib/acca/mocks.ts, not here (merged 2026-07-30) ────
// `AFM_MOCK_PAPER_1` and its `SitPaper` type are DELETED. SitRunner serves both papers,
// so a second registry would be a second place for a case id to be wrong. `MOCK_PAPERS`
// is the one list; this module keeps only the paper-AGNOSTIC sit helpers (the gate, the
// label derivation, resume, the clock). The import direction flipped with the merge —
// mocks.ts no longer imports this module, so there is no cycle.
import type { AccaPaper } from '@/lib/acca/paper';
import { strippedLabel } from '@/lib/acca/requirement-label';
export { getMockPaper as getSitPaper, getMockPapers as getSitPapers, type MockPaper as SitPaper } from '@/lib/acca/mocks';

// ── The serving gate, as DATA ────────────────────────────────────────────────
// The gate used to be four inline `.eq()` calls in the route, which is exactly the shape
// that cannot be unit-tested: a fixture would have to re-state the conditions and would
// then be testing its own copy, not the route's. So the gate is built ONCE here and the
// route builds its filters BY ITERATING IT. Editing this changes both the query and the
// fixtures together — there is no second copy to drift.
//
// NOW PAPER-SCOPED (2026-07-30). It was a frozen object carrying `paper_code: 'AFM'`,
// which is exactly the hardcoding that bound the sit route to one paper. It is a FUNCTION
// of the paper being sat, so serving APM cannot silently apply AFM's filter.
//
// This is the standard gate, not the retired inverted one. `published: true` and
// `status: 'approved'` are the two values whose inversion was the publish-flip trap; a
// fixture pins the retired combination as one that must NOT pass.
export function sitCaseGate(paper: AccaPaper) {
  return {
    paper_code: paper,
    mock_only:  true,                   // keeps these cases out of the practice library
    status:     'approved',
    published:  true,
  } as const;
}

export type SitCaseGate = ReturnType<typeof sitCaseGate>;
export type SitCaseGateRow = Partial<Record<keyof SitCaseGate, unknown>>;

/** True only when a case row satisfies EVERY gate column for that paper. Same conditions
 *  the route's query applies, from the same object — a predicate over an already-fetched
 *  row, used by the fixtures and available to any caller holding the row. */
export function isSittableCaseRow(
  row: SitCaseGateRow | null | undefined,
  paper: AccaPaper,
): boolean {
  if (!row) return false;
  const gate = sitCaseGate(paper);
  return (Object.keys(gate) as Array<keyof SitCaseGate>).every((k) => row[k] === gate[k]);
}

// ── Requirement label — candidate-facing form ────────────────────────────────
// Stored labels carry the internal syllabus code: "(i) B3e — 10 marks". A real ACCA
// paper never prints that — it states the part and its marks and nothing else. So the
// candidate must see "(i) — 10 marks".
//
// DISPLAY-DERIVATION ONLY. The stored `label` and `lo_code` columns are untouched, so
// marking and debrief still read the code straight off the row. This function is applied
// at the SERVE boundary (app/api/acca/sit/route.ts), not in the component, so the code
// never reaches the browser at all — stripping it in the UI would still ship it in the
// JSON payload, which is the same disclosure with an extra step.
//
// Removal is precise where possible: the row's own `lo_code` is removed by exact match.
// The generic sweep is a backstop for a row whose code is absent or disagrees with the
// label — an ACCA syllabus code is `<A-E><digit(s)><optional letter>` in BOTH papers, a
// shape nothing else in a label ("(i)", "10 marks") can take.
//
// ── THE MARKS COME OUT TOO NOW (2026-07-30) ──────────────────────────────────
// The label is reduced to THE PART ALONE — "(i)". Marks are served separately from the
// `marks_guide` COLUMN and the runner composes "(i) — 10 marks" for display.
//
// Why, given the marks are authentic and were already showing: they were showing only
// because AFM's stored labels happen to spell them in prose. APM's labels do not, so the
// same route served marks for one paper and not the other — parity by formatting accident,
// which breaks the moment a label is re-authored without its marks. Taking marks from the
// column makes both papers right for the same reason.
//
// ── THE RULE MOVED OUT (2026-08-13), THE BEHAVIOUR DID NOT ───────────────────
// The strip now lives in lib/acca/requirement-label.ts because the PS MARKER needs it
// too, and the same rule with two implementations is the failure class paper-url.ts was
// written to close. `sweepCodeShape: true` is THIS reader's answer and the reasoning is
// stated at the module: a leaked syllabus code on a candidate's screen is the worse
// failure here, so the generic backstop stays on. Marking answers false, for the opposite
// reason. This function's name, signature, return contract and every output are unchanged.
export function sitDisplayLabel(
  label: string | null | undefined,
  loCode?: string | null,
): string | null {
  // A label that was ONLY a code has nothing candidate-facing left to say — `strippedLabel`
  // returns null and the UI renders no chip at all rather than an empty one.
  return strippedLabel(label, loCode, { sweepCodeShape: true });
}

// ── Resume ───────────────────────────────────────────────────────────────────
// The sit is strictly forward-only, so "where am I?" is fully determined by which
// requirements already have a recorded answer. Returns the index of the first slot
// with no recorded answer, or `slots.length` when the whole paper is submitted.
//
// Scans from the START and stops at the first gap rather than counting submissions:
// the two agree in normal play, but if a write ever landed out of order, stopping at
// the gap re-presents the UNANSWERED requirement, whereas counting would skip it.
export function nextUnsubmittedIndex(
  slotRequirementIds: readonly string[],
  submitted: ReadonlySet<string>,
): number {
  for (let i = 0; i < slotRequirementIds.length; i++) {
    if (!submitted.has(slotRequirementIds[i])) return i;
  }
  return slotRequirementIds.length;
}

export function isPaperComplete(
  slotRequirementIds: readonly string[],
  submitted: ReadonlySet<string>,
): boolean {
  return (
    slotRequirementIds.length > 0 &&
    nextUnsubmittedIndex(slotRequirementIds, submitted) === slotRequirementIds.length
  );
}

// ── The clock — a COUNTDOWN, and `ends_at` is what it counts to ──────────────
// RESTORED 2026-07-31, for BOTH papers. This surface shipped with an elapsed-only clock and
// no expiry, and the comment here used to read "there is no countdown and no auto-submit by
// spec". That was right for a preview surface and WRONG as a product: the APM mock had a
// countdown and an auto-submit under `MockRunner`, and replacing that runner without them
// removed a rehearsal property rather than porting it. A 3h15m paper whose clock only counts
// up is not a rehearsal of a 3h15m paper — the whole skill being practised is finishing
// inside the time, and you cannot practise that against a stopwatch that never runs out.
//
// So `acca_mock_attempts.ends_at` STOPS being a column written only because it is NOT NULL
// and becomes load-bearing. It is set once at start (`started_at + duration_minutes`) and is
// never moved, so a refresh or a resume counts to the same instant rather than restarting —
// the same server-authority argument that already governed `started_at`.
//
// WHERE EXPIRY IS ENFORCED, precisely, because "the clock is client-side" would be a fair
// criticism of a countdown that only lived in the browser:
//   • The BROWSER runs the countdown and fires the auto-submit. That is presentation and the
//     act of submitting, and it needs sub-second resolution, so it belongs there.
//   • The SERVER decides a paper is OVER (`attemptIsClosed` below, used by the results
//     endpoint) and refuses further sit writes once the attempt is completed. Closing the tab
//     and returning later therefore does not buy time: the next load sees an expired attempt,
//     finishes it, and goes to the results.
// What is deliberately NOT done is rejecting a write merely because `now > ends_at`: the
// auto-submit's own POST lands milliseconds after the deadline, and refusing it would throw
// away the answer the candidate had just written. The rule is keyed on `completed`, which the
// auto-submit sets AFTER recording, so there is no race to lose.

/** House choice, not an ACCA rule: the last 15 minutes are visually flagged. Long enough to
 *  act on (finish a requirement, or move on and bank the marks) and short enough that it does
 *  not sit lit for a third of the paper. */
export const COUNTDOWN_WARNING_MINUTES = 15;

export type ClockState = 'running' | 'warning' | 'expired';

/** Milliseconds left on the paper, or null when there is no usable deadline. Never negative —
 *  past the deadline it is 0, which `clockState` reads as expired. */
export function remainingMs(endsAt: string | null | undefined, nowMs: number): number | null {
  if (!endsAt) return null;
  const ends = Date.parse(endsAt);
  if (!Number.isFinite(ends)) return null;
  return Math.max(0, ends - nowMs);
}

/** True once the deadline has passed. A missing or unparseable `ends_at` is NOT expiry —
 *  it is an unknown deadline, and guessing "expired" would end a paper that is still running. */
export function isExpired(endsAt: string | null | undefined, nowMs: number): boolean {
  if (!endsAt) return false;
  const ends = Date.parse(endsAt);
  return Number.isFinite(ends) && nowMs >= ends;
}

export function clockState(remaining: number | null): ClockState {
  if (remaining === null) return 'running';          // unknown deadline → never alarm
  if (remaining <= 0) return 'expired';
  return remaining <= COUNTDOWN_WARNING_MINUTES * 60_000 ? 'warning' : 'running';
}

/**
 * Is this attempt over, as far as the SERVER is concerned?
 *
 * Two ways: the candidate (or the auto-submit) finished it, or its deadline has passed. The
 * second is what stops "close the tab and come back tomorrow" from being extra time, and it
 * is why the results endpoint can mark a paper whose last requirements were never reached.
 *
 * `completed` is checked FIRST and on its own, so a finished attempt is closed even if
 * `ends_at` is missing or malformed.
 */
export function attemptIsClosed(
  attempt: { completed?: boolean | null; ends_at?: string | null } | null | undefined,
  nowMs: number,
): boolean {
  if (!attempt) return false;
  if (attempt.completed === true) return true;
  return isExpired(attempt.ends_at, nowMs);
}

// ── A NON-200 IS NOT ONE THING (added 2026-08-12) ────────────────────────────
// Every sit request used to collapse to a single boolean at the client boundary:
//   load       `if (!res.ok) { setPhase('error'); return; }`
//   write      `return res.ok || res.status === 409;`
//   results    `json?.error === 'paper_not_finished' ? … : <generic>`
// So a 402 `subscription_required` — the ONE refusal a student can act on — arrived as
// "Couldn't load the paper. Reload to try again.", "That didn't save. Press submit again.",
// and "Marking did not complete. Try again." All three instruct a retry that CANNOT succeed,
// at the highest-intent moment in the product, and the worst of them fires after a 3h15m
// paper has already been sat.
//
// The root cause was type-shaped in both places: the phase union had no member for
// "refused, and here is why", and the write helper returned a bare boolean, so no caller
// could have distinguished 402 from 500 even if it wanted to. These three functions give the
// client the vocabulary; they are pure so the mapping is fixtured rather than eyeballed.
//
// THE PRACTICE SURFACE ALREADY SELLS FROM THIS EXACT STATUS CODE — app/acca/cases/[id]/
// CaseSession.tsx handles 402 twice (a load-time upsell and a mid-session lapse line). The
// sit surface reuses that copy register deliberately; a second voice for one status code is
// how a product ends up with two apologies for the same thing.

/** Why a sit request was refused. `paper_locked` is the only one a student can act on. */
export type SitRefusal = 'paper_locked' | 'not_available' | 'failed';

/**
 * Map an HTTP status from the sit READ endpoint to a refusal.
 *
 * 401 is deliberately `failed` rather than its own kind: the mock PAGE redirects an
 * unauthenticated visitor to /acca/auth server-side, so a reload genuinely does resolve a
 * session that expired mid-flight — "reload to try again" is the correct instruction for it,
 * which is not true of any other non-200.
 */
export function sitRefusalFor(status: number): SitRefusal {
  if (status === 402) return 'paper_locked';
  if (status === 404) return 'not_available';   // flag off, or the paper is not servable
  return 'failed';
}

/**
 * Which phase a refusal lands in. `paper_locked` is the ONLY refusal that is not an error —
 * it is a state the student can leave, so it gets its own screen and its own copy.
 *
 * Returns the narrow pair rather than the runner's full `Phase` union so this module stays
 * free of any component import; `Phase` is a superset, so the assignment typechecks.
 */
export function sitPhaseForRefusal(refusal: SitRefusal): 'locked' | 'error' {
  return refusal === 'paper_locked' ? 'locked' : 'error';
}

/** What the results endpoint said. `ok` means a debrief came back. */
export type ResultsOutcome = 'ok' | 'paper_locked' | 'not_finished' | 'failed';

/**
 * Map (status, error code) from /api/acca/sit/results.
 *
 * `paper_not_finished` arrives as 409, NOT 4xx-generic, so the code is load-bearing and the
 * status alone cannot decide this. `no_attempt` is also a 409 and is folded into `failed`
 * ON PURPOSE: the runner only ever fetches results from the `done` phase, which is reached
 * either by submitting the last requirement or by returning to an attempt that exists — so
 * "no attempt to mark" cannot arise from the runner's own flow, and inventing copy for it
 * would be describing a state to the student that their session cannot be in.
 */
export function resultsOutcomeFor(status: number, errorCode?: string | null): ResultsOutcome {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 402) return 'paper_locked';
  if (status === 409 && errorCode === 'paper_not_finished') return 'not_finished';
  return 'failed';
}

/**
 * What a sit ANSWER WRITE did. Discriminated, because the two failure kinds need opposite
 * things from the student: `paper_locked` needs an action that will make a retry work, and
 * `attempt_closed` means the paper is over and there is nothing left to retry at all.
 */
export type SitWriteOutcome =
  | { ok: true; alreadySubmitted: boolean }
  | { ok: false; reason: 'paper_locked' | 'attempt_closed' | 'failed' };

/**
 * Map (status, error code) from POST /api/acca/case/turn with `sitting:true`.
 *
 * ⚠️ THIS CORRECTS A REAL MIS-READING, not just the copy. The old rule was
 * `res.ok || res.status === 409`, and that route returns 409 for THREE different things:
 * `already_submitted` (the answer IS recorded — success, and the reason the 409 arm existed),
 * `attempt_closed`, and `no_open_attempt` (both refusals). The last two were being reported
 * to the student as saved work. They are now failures.
 *
 * An UNRECOGNISED 409 is `failed`, which is the safe direction and is self-correcting: if the
 * answer had in fact landed, pressing submit again returns `already_submitted` and reads as
 * saved. Reporting an unknown refusal as saved has no such recovery.
 */
export function sitWriteOutcomeFor(status: number, errorCode?: string | null): SitWriteOutcome {
  if (status >= 200 && status < 300) return { ok: true, alreadySubmitted: false };
  if (status === 402) return { ok: false, reason: 'paper_locked' };
  if (status === 409) {
    if (errorCode === 'already_submitted') return { ok: true, alreadySubmitted: true };
    if (errorCode === 'attempt_closed' || errorCode === 'no_open_attempt') {
      return { ok: false, reason: 'attempt_closed' };
    }
    return { ok: false, reason: 'failed' };
  }
  return { ok: false, reason: 'failed' };
}

// ── WHICH SCREEN DOES A RETURNING STUDENT GET? (added 2026-08-12) ────────────
// The runner's load effect chose between `intro`, `sitting` and `done` with an inline
// if/else-if/else, and the else was `intro`. That produced a live dead end:
//
//   A paper that ends ON THE CLOCK has BOTH `completed=true` (the auto-submit, or the
//   return-visit finish call, sets it) AND an incomplete submitted set — because the
//   auto-submit deliberately does not back-fill the tail, `not_reached` being a different
//   finding from `blank`. That combination matched neither of the first two arms and fell
//   through to `intro`.
//
// So a timed-out student returning to their paper got the START SCREEN. The debrief was
// unreachable (the done phase is the only route to /api/acca/sit/results), the
// "I've subscribed — mark my paper" retry was unreachable, and pressing Start minted a NEW
// attempt — after which `attemptFor` resolves the new one on every subsequent results POST
// and the old paper's answers are permanently unmarkable through the UI. A 3h15m sit,
// recoverable only by hand.
//
// ── THE RULE: THE ATTEMPT'S STATE DECIDES, NOT THE SUBMITTED SET ─────────────
// Ruled 2026-08-12. "Is this paper over?" is a fact about the ATTEMPT — completed, or past
// its deadline — and the count of submitted requirements is downstream of it, not a second
// opinion on it. The old order asked "is every slot submitted?" first, which is why a paper
// that was over but incomplete had nowhere to go. Completeness now only decides between
// `sitting` and `done` for an attempt that is still genuinely open.
//
// The server already accepts this shape: `caseMarkReady(sitting, reqs, attemptClosed=true)`
// short-circuits the per-requirement `submitted_at` check (lib/acca/case-sit.ts), and
// `attemptIsClosed` above is what the results endpoint passes as `attemptClosed`. The client
// was the only half that could not express it.
//
// PURE so the arms are fixtured rather than eyeballed — scripts/test-sit-preview.ts builds a
// real expired-attempt shape and pins the old collapse as MUST-FAIL.

/** The three screens the load effect can land on. A subset of the runner's `Phase` union
 *  (which also carries `loading` / `locked` / `error`, none of which this decides). */
export type SitLoadPhase = 'intro' | 'sitting' | 'done';

/** The attempt fields this decision reads. Structural, so the runner's own `Attempt` type
 *  satisfies it without this module importing a component type. */
export interface SitLoadAttempt {
  ends_at?: string | null;
  completed?: boolean | null;
  completed_at?: string | null;
}

export interface SitLoadDecision {
  phase: SitLoadPhase;
  /** Which requirement to present. Only meaningful when `phase === 'sitting'`. */
  index: number;
  /** The caller must POST `action:'finish'` before rendering. True ONLY where the attempt is
   *  still open and its deadline has passed — an already-completed attempt needs no second
   *  finish, and the endpoint would no-op on it anyway. */
  finishAttempt: boolean;
  /** The paper ended because the clock ran out rather than because it was finished.
   *  PRESENTATION ONLY — it changes the done screen's heading and nothing about what was
   *  recorded or what gets marked. */
  expiredOut: boolean;
  /** Emit `mock_intro_viewed`. True on the intro arm alone, which is the only route to the
   *  start screen and the only one with no acca_mock_attempts row already saying so. */
  reportIntro: boolean;
}

/**
 * Did this COMPLETED attempt end on the clock rather than by being finished?
 *
 * Compares `completed_at` against `ends_at`, NOT against `now`: every past paper has an
 * `ends_at` in the past when it is revisited, so a now-based test would headline "Time's up."
 * on a paper the candidate finished early and came back to read a week later.
 *
 * A NULL `completed_at` returns false. Attempts predating that column exist (migration
 * 20260801120000 added the surrogate key; older rows carry no completion timestamp), and for
 * those the honest answer is "not known" — claiming the clock beat a student who may well have
 * finished in time is the worse of the two errors, so the neutral heading wins.
 */
export function endedOnClock(attempt: SitLoadAttempt | null | undefined): boolean {
  if (!attempt || attempt.completed !== true) return false;
  const ends = Date.parse(attempt.ends_at ?? '');
  const finished = Date.parse(attempt.completed_at ?? '');
  if (!Number.isFinite(ends) || !Number.isFinite(finished)) return false;
  return finished >= ends;
}

/**
 * Which screen a load of the sit surface lands on.
 *
 * The arms, in the order they are tested and for the reason stated above:
 *   1. NO ATTEMPT           → intro. Nothing has been started; this is the only start screen.
 *   2. COMPLETED            → done. THE FIX. Regardless of how many slots were submitted —
 *                             a finished paper is finished, and an unreached tail is part of
 *                             what happened rather than a reason to hide the result.
 *   3. OPEN BUT EXPIRED     → done, after finishing it. Closing the tab must not buy time.
 *   4. OPEN, ALL SUBMITTED  → done. Reachable only when the last submission's own finish call
 *                             failed; marking is unaffected (`paperFullySubmitted` carries it).
 *   5. OPEN, WORK LEFT      → sitting, at the first requirement with no recorded answer.
 */
export function sitLoadDecision(
  attempt: SitLoadAttempt | null | undefined,
  slotRequirementIds: readonly string[],
  submitted: ReadonlySet<string>,
  nowMs: number,
): SitLoadDecision {
  const base = { index: 0, finishAttempt: false, expiredOut: false, reportIntro: false };

  if (!attempt) return { ...base, phase: 'intro', reportIntro: true };

  if (attempt.completed === true) {
    return { ...base, phase: 'done', expiredOut: endedOnClock(attempt) };
  }

  if (isExpired(attempt.ends_at, nowMs)) {
    return { ...base, phase: 'done', finishAttempt: true, expiredOut: true };
  }

  if (isPaperComplete(slotRequirementIds, submitted)) {
    return { ...base, phase: 'done' };
  }

  return { ...base, phase: 'sitting', index: nextUnsubmittedIndex(slotRequirementIds, submitted) };
}

// H:MM:SS. A DURATION formatter — it renders both directions (time remaining on the running
// clock, and any elapsed figure) because a duration is a duration. Clamped at zero so clock
// skew can never render a negative time.
export function fmtDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
}
