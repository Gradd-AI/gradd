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
// An open attempt is a key to SIT the paper, never a key to the mark scheme. So a
// mock_only case served through the practice route withholds everything
// app/api/acca/sit withholds:
//
//   never selected anywhere on this path (same as the live case route):
//     model_answer · hint · full_reveal · answer_schema
//   additionally withheld BECAUSE it is mock content:
//     marks_guide · professional_skill_tags · intellectual_level · command_verb · lo_code
//
// The requirement select is therefore a DIFFERENT, NARROWER static string for mock_only
// cases — the fields are never fetched rather than fetched and stripped, so there is no
// object for a later edit to accidentally spread into a response.
export const MOCK_REQUIREMENT_SELECT = 'id, requirement_order, label, question';
export const STANDARD_REQUIREMENT_SELECT =
  'id, requirement_order, label, question, marks_guide, command_verb, intellectual_level, lo_code, professional_skill_tags';
