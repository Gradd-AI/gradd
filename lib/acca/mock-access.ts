// lib/acca/mock-access.ts
// The ONE server-side answer to "may this request reach this mock_only case?".
// app/api/acca/case (GET) and app/api/acca/case/turn (POST) both call it, so the two
// routes cannot drift into different views of what mock content is for.
//
// ── THE CARVE-OUT IS RETIRED (2026-07-30) ────────────────────────────────────
// This used to be ATTEMPT-SCOPED: mock content was served through the id-addressed
// practice routes while the requester held an open, uncompleted attempt for that case's
// own paper. That existed for exactly one reason — the APM timed mock LOADED and TURNED
// through those routes (MockRunner → CaseSession → case GET + case/turn) and would have
// 404'd without it. It was documented as transitional from the day it shipped.
//
// SitRunner now serves BOTH papers through /api/acca/sit, so nothing loads mock content
// through app/api/acca/case any more and the carve-out has no remaining caller. The rule
// is now the simple one it always wanted to be:
//
//   • app/api/acca/case (GET)        — mock content is REFUSED, unconditionally.
//   • app/api/acca/case/turn (POST)  — refused in PRACTICE mode, allowed in SIT mode.
//
// Turn keeps a mode-keyed door because it IS the sit's write path: the previous
// change-set deliberately collapsed the two sit write implementations into this one route
// so there is a single immutability rule. Refusing mock content here outright would break
// the sit it exists to record. What must never happen is the TEACH LOOP running over
// reserved exam content — that is the leak, and `sitting === false` is exactly it.
//
// `attemptUnlocksCase` / `AttemptRef` are DELETED from lib/acca/mocks.ts with the
// carve-out. A question whose answer is now constant does not need a predicate, and
// leaving one exported invites a future caller to re-open the door by accident.

import { isMockCase } from '@/lib/acca/mocks';

/**
 * PURE. May this request reach this case?
 *
 * `caseIsMock` is the row's own `mock_only` column OR registry membership — callers pass
 * whichever they hold. The two agree today; taking either keeps a case that is in a paper
 * but missing the flag (or vice versa) on the refusing side rather than the serving side.
 */
export function mockContentAllowed(
  caseIsMock: boolean,
  mode: 'practice' | 'sit',
): boolean {
  if (!caseIsMock) return true;      // ordinary library content — nothing to decide
  return mode === 'sit';             // reserved exam content: only a sit may touch it
}

/** Convenience for the routes, which hold a case id and a `mock_only` flag. */
export function caseIsReserved(caseId: string, mockOnlyColumn: boolean | null | undefined): boolean {
  return mockOnlyColumn === true || isMockCase(caseId);
}

// ── Withheld fields for mock content ─────────────────────────────────────────
// MOCK_REQUIREMENT_SELECT is RETIRED with the carve-out: app/api/acca/case no longer
// serves mock requirements in any mode, so there is no payload left to withhold from.
// The sit's own withholding lives at its serve boundary (app/api/acca/sit/route.ts),
// which is now the only place mock requirements are read for display.
export const STANDARD_REQUIREMENT_SELECT =
  'id, requirement_order, label, question, marks_guide, command_verb, intellectual_level, lo_code, professional_skill_tags';
