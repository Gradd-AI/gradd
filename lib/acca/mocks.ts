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
// The AFM sit paper is a separate config from MOCK_PAPERS while the two runners are
// separate (merging them belongs to the SitRunner-for-both-papers change-set). It is
// imported here so mock-content ACCESS is decided in one place across both papers.
// sit-preview imports nothing from this module, so there is no cycle.
import { AFM_MOCK_PAPER_1 } from '@/lib/acca/sit-preview';

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
];

export function getMockPaper(id: string): MockPaper | null {
  return MOCK_PAPERS.find((p) => p.id === id) ?? null;
}

export function getMockPapers(paper: AccaPaper): MockPaper[] {
  return MOCK_PAPERS.filter((p) => p.paper === paper);
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
// TRANSITIONAL. The APM timed mock currently loads and turns through the practice routes
// (MockRunner → CaseSession → case GET + case/turn), which is why the carve-out exists at
// all rather than an outright block. Once SitRunner serves both papers, APM stops using
// those routes for mock content and this becomes an unconditional refusal — see
// docs/AFM_SURFACED.md.

/** Case ids for a mock paper id, across BOTH paper configs (APM MOCK_PAPERS and the AFM
 *  sit paper). Returns null for an unrecognised mock_id — an attempt row carrying one
 *  unlocks nothing, which is the safe direction. */
export function mockPaperCaseIds(mockId: string): readonly string[] | null {
  const apm = getMockPaper(mockId);
  if (apm) return apm.case_ids;
  if (mockId === AFM_MOCK_PAPER_1.id) return AFM_MOCK_PAPER_1.case_ids;
  return null;
}

export interface AttemptRef {
  mock_id: string;
  completed: boolean | null;
}

/** PURE. Does one of these attempts unlock this case? True only when an attempt is
 *  UNCOMPLETED and the case belongs to that attempt's OWN paper. */
export function attemptUnlocksCase(attempts: readonly AttemptRef[], caseId: string): boolean {
  if (!caseId) return false;
  return attempts.some(
    (a) => a?.completed !== true && (mockPaperCaseIds(a?.mock_id ?? '') ?? []).includes(caseId),
  );
}
