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
