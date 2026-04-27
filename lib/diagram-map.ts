// lib/diagram-map.ts
// Lesson code → diagram path mapping.
// ALL codes verified against lessons_seed.sql.
// Diagrams served from /public/diagrams/ at /diagrams/*.svg
//
// Diagrams built but not mapped (no standalone lesson in seed SQL):
//   ansoff.svg, boston-matrix.svg, porters-five-forces.svg,
//   supply-demand.svg, circular-flow.svg
// These can be referenced manually in the system prompt or mapped
// when dedicated lessons are added.

export const DIAGRAM_MAP: Record<string, string> = {
  // SWOT Analysis
  '2.1.5':  '/diagrams/swot.svg',
  '3.2.10': '/diagrams/swot.svg',
  '3.3.2':  '/diagrams/swot.svg',

  // Break-even
  '2.2.4':  '/diagrams/break-even.svg',

  // Product Life Cycle
  '4A.3.2': '/diagrams/product-life-cycle.svg',

  // Chain of distribution
  '4A.5.1': '/diagrams/chain-of-distribution.svg',
  '4A.5.2': '/diagrams/chain-of-distribution.svg',
  '4A.5.3': '/diagrams/chain-of-distribution.svg',

  // Cash flow statement
  '4C.2.2': '/diagrams/cash-flow.svg',
  '4C.2.3': '/diagrams/cash-flow.svg',

  // Balance sheet
  '4C.3.3': '/diagrams/balance-sheet.svg',
  '4C.4.2': '/diagrams/balance-sheet.svg',

  // Maslow's Hierarchy
  '3.2.6':  '/diagrams/maslow.svg',
  '3.2.9':  '/diagrams/maslow.svg',

  // Communication process
  '3.2.4':  '/diagrams/communication-process.svg',

  // Organisational structures
  '3.1.4':  '/diagrams/org-structures.svg',

  // Business cycle
  '5.2.5':  '/diagrams/business-cycle.svg',
};

/**
 * Returns the diagram path for a given lesson code, or null if none exists.
 * Usage: const diagram = getDiagramPath('3.3.2');
 */
export function getDiagramPath(lessonCode: string): string | null {
  return DIAGRAM_MAP[lessonCode] ?? null;
}
