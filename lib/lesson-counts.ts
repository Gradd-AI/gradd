// Single source of truth for per-subject, per-level lesson totals.
// Counts verified against the live DB on 2026-05-16 using the `level` column:
//   IB_ECON  SL_AND_HL rows: 147  |  HL_ONLY rows: 63  |  total: 210
//   IB_BM    SL_AND_HL rows:  87  |  HL_ONLY rows: 49  |  total: 136
//   LC       (no level split — single sequence):              total: 279
// SL students traverse SL_AND_HL lessons only; HL students traverse all lessons.
// Consumed by: app/dashboard/page.tsx (progress %) and lib/system-prompt.ts (course position).
export const LESSON_COUNTS: Record<string, number> = {
  IB_ECONOMICS_HL: 210,
  IB_ECONOMICS_SL: 147,
  IB_BUSINESS_HL:  136,
  IB_BUSINESS_SL:  87,
  LC_BUSINESS:     279,
};
