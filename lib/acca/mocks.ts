// ── APM timed-mock papers (code config, not a table) ───────────────────────────
// A mock is a full timed paper: 1 Section A case + 2 Section B cases (one
// C-anchored, one D-anchored) sat sequentially under one clock. The case_ids are
// real acca_cases rows (approved + published); they are served by the existing
// case load/turn/mark routes. Paper 1 deliberately reuses library cases
// (Keldan + Aldermere + Vesla) — Paper 2's reserved (mock_only) cases come later.
//
// duration_minutes is the whole-paper clock (ACCA APM is 3h15m = 195 min).
export interface MockPaper {
  id: string;              // stable paper identifier, e.g. 'paper-1'
  title: string;
  duration_minutes: number;
  case_ids: string[];      // sat in this order: Section A first, then the two Section B
}

// Papers must reference mock_only (reserved) cases ONLY — library cases share
// per-requirement progress with practice, so a practised case enters the mock
// pre-completed. Paper 1's reserved cases are being authored.
export const MOCK_PAPERS: MockPaper[] = [];

export function getMockPaper(id: string): MockPaper | null {
  return MOCK_PAPERS.find((p) => p.id === id) ?? null;
}
