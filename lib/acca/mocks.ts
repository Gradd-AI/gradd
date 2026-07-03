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

export const MOCK_PAPERS: MockPaper[] = [
  {
    id: 'paper-1',
    title: 'Mock Paper 1',
    duration_minutes: 195,
    case_ids: [
      'a5000000-0000-4000-8000-0000000000a1', // Keldan   — Section A
      'a1000000-0000-4000-8000-0000000000c1', // Aldermere — Section B, C-anchored
      'a2000000-0000-4000-8000-0000000000d1', // Vesla    — Section B, D-anchored
    ],
  },
];

export function getMockPaper(id: string): MockPaper | null {
  return MOCK_PAPERS.find((p) => p.id === id) ?? null;
}
