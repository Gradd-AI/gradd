// ── ACCA timed-mock papers (code config, not a table) ───────────────────────────
// A mock is a full timed paper: 1 Section A case + 2 Section B cases (one
// C-anchored, one D-anchored) sat sequentially under one clock. The case_ids are
// real acca_cases rows (approved + published); they are served by the existing
// case load/turn/mark routes. Paper 1 references RESERVED (mock_only) cases only —
// Halworth (Section A) + Rivenor (B/C) + Bexley (B/D).
//
// duration_minutes is the whole-paper clock (ACCA APM/AFM are both 3h15m = 195 min).
//
// PAPER SCOPING: `paper` is code-config (not a DB column — mock_id strings are
// unique by construction, so an id-addressed GET/PATCH in app/api/acca/mock/route.ts
// never risks a cross-paper collision). It exists so the LIST verb (GET with no
// mock_id) can filter MOCK_PAPERS to the requesting paper — the same class of leak
// as the unscoped acca_cases list, just in code config instead of a table.
import type { AccaPaper } from '@/lib/acca/paper';

// ── ONE REGISTRY, BOTH PAPERS (merged 2026-07-30) ────────────────────────────
// The AFM sit paper used to live in its own config (`AFM_MOCK_PAPER_1` in
// sit-preview.ts) because the two papers had two runners. SitRunner now serves both,
// so the two configs are ONE list here and sit-preview imports from this module
// instead of owning a second copy. The dependency direction FLIPPED with the merge:
// mocks.ts no longer imports sit-preview (that import existed only to reach the AFM
// paper for the access guard), so there is still no cycle.
//
// Both papers therefore get the same three things by construction rather than by two
// implementations agreeing: a paper-scoped list, an id lookup, and the mock-content
// access rule below.

export interface MockPaper {
  id: string;              // stable paper identifier, e.g. 'paper-1'
  paper: AccaPaper;
  title: string;
  duration_minutes: number;
  case_ids: string[];      // sat in this order: Section A first, then the two Section B
}

// Papers must reference mock_only (reserved) cases ONLY — library cases share
// per-requirement progress with practice, so a practised case enters the mock
// pre-completed. Paper 1 satisfies the reserved-only rule: all three are mock_only
// reserved cases, sat in exam order (Section A first, then the two Section B).
export const MOCK_PAPERS: MockPaper[] = [
  {
    id: 'paper-1',
    paper: 'APM',
    title: 'Mock Paper 1',
    duration_minutes: 195,
    case_ids: [
      'a6000000-0000-4000-8000-0000000000b1', // Halworth Hotels    — Section A (reserved)
      'a7000000-0000-4000-8000-0000000000c3', // Rivenor Pharma     — Section B, C-anchored (reserved)
      'a8000000-0000-4000-8000-0000000000d3', // Bexley Grocers     — Section B, D-anchored (reserved)
    ],
  },
  {
    // `id` is deliberately NOT 'paper-1': the two papers share this registry and an
    // `acca_mock_attempts.mock_id` must resolve to exactly one paper. Ids are unique
    // across the whole list, which is what `mockPaperCaseIds` relies on to keep an open
    // APM attempt from unlocking AFM content.
    id: 'afm-paper-1',
    paper: 'AFM',
    title: 'AFM Mock Paper 1',
    duration_minutes: 195,
    case_ids: [
      'aa000000-0000-4000-8000-00000000a001', // Solenne Industries SA — Section A (50 marks)
      'aa000000-0000-4000-8000-00000000b101', // Brecon Renewables plc — Section B (25 marks)
      'aa000000-0000-4000-8000-00000000b201', // Aldebrino SpA         — Section B (25 marks)
    ],
  },
];

// Ids must be unique across BOTH papers — `mockPaperCaseIds` resolves an attempt's
// mock_id to its own paper's cases, and a duplicate id would silently make one paper's
// attempt unlock the other's content. Asserted at module load rather than trusted.
{
  const ids = MOCK_PAPERS.map((p) => p.id);
  if (new Set(ids).size !== ids.length) {
    throw new Error(`MOCK_PAPERS: duplicate paper id in [${ids.join(', ')}]`);
  }
  const caseIds = MOCK_PAPERS.flatMap((p) => p.case_ids);
  if (new Set(caseIds).size !== caseIds.length) {
    throw new Error('MOCK_PAPERS: a case id appears in more than one paper');
  }
}

export function getMockPaper(id: string): MockPaper | null {
  return MOCK_PAPERS.find((p) => p.id === id) ?? null;
}

export function getMockPapers(paper: AccaPaper): MockPaper[] {
  return MOCK_PAPERS.filter((p) => p.paper === paper);
}

/** The paper a case belongs to, or null when it is not mock content at all. */
export function paperForCase(caseId: string): MockPaper | null {
  return MOCK_PAPERS.find((p) => p.case_ids.includes(caseId)) ?? null;
}

// ── MOCK-CONTENT ACCESS (ruled 2026-07-29) ───────────────────────────────────
// A `mock_only` case is reserved exam content. It must NOT be reachable through the
// id-addressed practice routes just because it is published — that made the paper
// fetchable, and teachable, by anyone holding a case id.
//
// The guard is ATTEMPT-SCOPED: mock content is served through app/api/acca/case and
// app/api/acca/case/turn ONLY while the requester has an OPEN, UNCOMPLETED attempt for
// the paper THAT CASE BELONGS TO. No attempt → the case does not exist as far as those
// routes are concerned.
//
// SCOPED TO THE ATTEMPT'S OWN CASES, deliberately: an open APM attempt must not unlock
// the AFM mock, and vice versa. The check resolves the attempt's `mock_id` to ITS paper's
// case list and asks whether this case is in it — never "is any mock open".
//
// NO LONGER TRANSITIONAL (2026-07-30). The carve-out existed because the APM timed mock
// loaded and turned through the practice routes (MockRunner → CaseSession → case GET +
// case/turn). SitRunner now serves BOTH papers through /api/acca/sit + case/turn, so no
// mock surface reaches the id-addressed practice routes any more and the attempt-scoped
// carve-out is gone: `case` (GET) and `case/turn` refuse mock content UNCONDITIONALLY.
// `attemptUnlocksCase` is retired with it.

/** Case ids for a mock paper id. Returns null for an unrecognised mock_id — an attempt
 *  row carrying one unlocks nothing, which is the safe direction. */
export function mockPaperCaseIds(mockId: string): readonly string[] | null {
  return getMockPaper(mockId)?.case_ids ?? null;
}

/** True when this case id belongs to ANY mock paper. The whole mock-content rule, now
 *  that the rule is unconditional: reserved exam content is never served by the
 *  id-addressed practice routes, regardless of who is asking or what they have open. */
export function isMockCase(caseId: string): boolean {
  return !!caseId && MOCK_PAPERS.some((p) => p.case_ids.includes(caseId));
}

// `attemptUnlocksCase` (and its `AttemptRef`) is DELETED. It answered "may this requester
// reach this mock case through the practice routes?", and the answer is now "no, never" —
// a question with one constant answer needs no function, and leaving it exported would let
// a future caller re-open the carve-out by accident. `isMockCase` above is what the routes
// call instead.
