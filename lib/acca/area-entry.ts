// lib/acca/area-entry.ts
// DETERMINISTIC ENTRY DRILL for a zero-attempt student's FIRST serve in an area.
//
// The area serve is otherwise a uniform RANDOM pick (next-drill/route.ts + the tutor page), so a
// beginner opening B5 could be handed K3 (restricted remittance — the hardest of the family) instead
// of K1 (home-currency NPV — the Step-0 entry). This module makes the FIRST serve deterministic: a
// student with zero attempts in the area gets the ENTRY drill (the most foundational kind present);
// "try another" keeps the existing random / next-unattempted behaviour.
//
// WHY NOT created_at / id: both break on regeneration. A `--*-batch` regen mints new rows (new id,
// new created_at) and a single-drill regen can reorder them — either would silently change the entry.
// The entry is instead keyed on the STABLE, code-generated model_answer HEADING (the builder always
// emits the same first line for a given kind), so it survives regeneration. Ranks are grouped per
// calculator FAMILY, entry (easiest/foundational) first; a 2-char area that spans several families
// (B3 = CAPM/APV/duration/credit; B4 = valuation + a stray credit drill) resolves to the globally
// lowest-ranked kind present — hence the cross-family ordering below is deliberate, not incidental.
//
// MAP-BEFORE-CLOSE: every new family MUST add its model_answer heading(s) here (entry-first) when it
// ships — an unranked heading is treated as "not an entry" and falls back to the random pick.

export const AREA_ENTRY_RANK: Record<string, number> = {
  // ── B1 — investment appraisal (NPV is the foundational entry; IRR builds on the NPV mechanics) ──
  '**Investment appraisal — net present value**': 10,
  '**Investment appraisal — internal rate of return**': 12,
  // Risk & uncertainty (calculator #3) is B1a/B1b too — ranked AFTER NPV/IRR so a risk drill never
  // preempts NPV as the B1 entry (Grant Step-0 ruling): ENPV → sensitivity → RADR → duration/VaR.
  '**Risk & uncertainty — expected net present value (ENPV)**': 13,
  '**Risk & uncertainty — sensitivity analysis**': 14,
  '**Risk & uncertainty — risk-adjusted discount rate (RADR)**': 15,
  '**Risk & uncertainty — project duration and value at risk**': 16,
  // ── B2 — options ──
  '**Option valuation — Black-Scholes (BSOP)**': 20,
  // ── B3 — cost of capital is foundational; APV / duration / credit build on it ──
  '**Cost of capital — CAPM / weighted average cost of capital**': 30,
  '**Cost of capital — CAPM / ungeared cost of equity**': 31,
  '**Investment appraisal — adjusted present value (APV)**': 33,
  '**Bond duration — interest-rate exposure**': 35,
  // ── B4 — valuation family (FCFE simplest → the two-method compare hardest) ──
  '**Equity valuation (free cash flow to equity)**': 40,
  '**Firm and equity valuation (FCFF, with the cost of capital derived)**': 41,
  '**Dividend capacity and dividend policy**': 42,
  '**Valuation of the target — two methods and a range**': 43,
  // Credit ranks ABOVE valuation (48 > 40s) so a credit drill dual-tagged into a valuation area (B4)
  // never steals the entry; in its own area (B3) credit is never the lowest-ranked kind present, so
  // this rank only ever acts as a tie-avoider, never as an entry.
  '**Credit risk — rating, spread and the cost of debt**': 48,
  // ── B5 — international (home-currency NPV = the Step-0 entry; then sensitivity, then restricted) ──
  '**International investment appraisal — net present value to the parent**': 50,
  '**Impact of alternative exchange-rate assumptions on project value**': 51,
  '**International appraisal with a remittance restriction**': 52,
  // A6 is DIRECT-LINK-ONLY (never browsable) — ranked for completeness / a future Section A launch.
  '**Multinational dividend capacity and policy**': 53,
  // ── NARRATIVE cluster (pipeline #2, discursive drills D1–D5). Ranked in a dedicated band ABOVE every
  // calculator (all calculators are ≤ 53) so a narrative drill is NEVER an area's entry — a beginner's
  // first serve in any area is always the foundational CALCULATOR, not a discursive drill. Grouped by the
  // drill's primary area: D1→B1, D2/D3→B3, D4→B4, D5→B5. (Map-before-close: new narrative heading ranked here.)
  '**Monte Carlo simulation — interpreting the simulation output**': 60,          // D1 · B1b (after risk 16)
  '**Sources of finance — appropriateness for the organisation**': 61,            // D2 · B3a-c (after credit 48)
  '**Capital structure — theory and practical impact**': 62,                      // D3 · B3i
  '**Option pricing models — role in valuing equity, debt and default risk**': 63, // D4 · B4d (after credit 48)
  '**Exchange controls and international sources of finance**': 64,                // D5 · B5c/d (after international 53)
  // ── E2 — FX hedging (calculator #11). Own area (never overlaps a B-prefix), so these ranks only
  // order K1..K4 against each other: forward+MMH (the Step-0 entry) → futures → options → swap. ──
  '**FX hedging — forward vs money-market hedge**': 70,
  '**FX hedging — currency futures**': 71,
  '**FX hedging — currency options**': 72,
  '**FX hedging — currency swap**': 73,
};

const UNRANKED = Number.POSITIVE_INFINITY;

// The rank of a drill = the rank of its model_answer heading (first line), or +Infinity if unknown.
export function entryRank(modelAnswer: string): number {
  const heading = (modelAnswer.split('\n', 1)[0] ?? '').trim();
  return AREA_ENTRY_RANK[heading] ?? UNRANKED;
}

// Pick the deterministic ENTRY drill from an area's drills: the lowest-ranked kind present
// (foundational first). Ties (two drills of the same kind → same rank) break by lo_code then id so
// the choice is stable within a run; the ENTRY KIND is stable across regeneration because it is keyed
// on the code-generated heading, not id/created_at. Returns null when NO drill's heading is ranked, so
// the caller keeps its existing random pick — an unknown/new family is never worse off than today.
export function pickEntryDrill<T extends { model_answer: string; lo_code: string; id: string }>(drills: T[]): T | null {
  const ranked = drills
    .map((d) => ({ d, r: entryRank(d.model_answer) }))
    .filter((x) => Number.isFinite(x.r));
  if (ranked.length === 0) return null;
  ranked.sort((a, b) => a.r - b.r || a.d.lo_code.localeCompare(b.d.lo_code) || a.d.id.localeCompare(b.d.id));
  return ranked[0].d;
}
