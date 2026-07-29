// lib/acca/mock-access.ts
// The ONE server-side answer to "may this user reach this mock_only case right now?".
// app/api/acca/case (GET) and app/api/acca/case/turn (POST) both call it, so the two
// routes cannot drift into different views of who is mid-mock.
//
// The decision itself is PURE and lives in lib/acca/mocks.ts (`attemptUnlocksCase`) —
// this module only supplies the query. Keeping the rule pure is what makes it testable
// without a DB (scripts/test-mock-access.ts).
//
// See lib/acca/mocks.ts for the rule and why it is attempt-scoped and transitional.

import type { SupabaseClient } from '@supabase/supabase-js';
import { attemptUnlocksCase, type AttemptRef } from '@/lib/acca/mocks';

/**
 * True when the user has an OPEN attempt for the paper this case belongs to.
 *
 * Selects only uncompleted attempts and then re-checks `completed` in the pure predicate —
 * belt and braces, because `completed` is nullable and a null must never read as "open by
 * omission" in one place and "closed" in the other.
 */
export async function mockAttemptUnlocksCase(
  supabase: SupabaseClient,
  userId: string,
  caseId: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from('acca_mock_attempts')
    .select('mock_id, completed')
    .eq('user_id', userId)
    .neq('completed', true);
  // A failed lookup must DENY, never open the door. Serving mock content because a query
  // errored is the exact failure this guard exists to prevent.
  if (error) return false;
  return attemptUnlocksCase((data ?? []) as AttemptRef[], caseId);
}

// ── Withheld fields for mock content, even inside the carve-out ──────────────
// An open attempt is a key to SIT the paper, never a key to the mark scheme.
//
//   never selected anywhere on this path (same as the live case route):
//     model_answer · hint · full_reveal · answer_schema     — the answer itself
//   withheld BECAUSE it is mock content:
//     professional_skill_tags — names which PS skill the requirement examines: a steer no
//                               real exam gives, and it tells the candidate what to perform
//     intellectual_level      — the authored difficulty tier; internal calibration data
//     command_verb            — the authored verb classification; internal
//     lo_code                 — the internal syllabus code, which no real paper prints
//
// **`marks_guide` IS SERVED** (restored 2026-07-29, Grant-ruled). It is an INTEGER mark
// ALLOCATION, not a mark scheme — a real paper always prints marks per requirement, and a
// candidate needs them to pace a 3h15m sit. Withholding it cost the APM mock its
// marks-per-requirement display (`CaseSession.tsx` renders it), for no security gain: the
// number tells a candidate how long to spend, not how to earn the marks.
//
// The requirement select is a DIFFERENT static string for mock_only cases — the withheld
// fields are never fetched rather than fetched and stripped, so there is no object for a
// later edit to accidentally spread into a response.
export const MOCK_REQUIREMENT_SELECT = 'id, requirement_order, label, question, marks_guide';
export const STANDARD_REQUIREMENT_SELECT =
  'id, requirement_order, label, question, marks_guide, command_verb, intellectual_level, lo_code, professional_skill_tags';
