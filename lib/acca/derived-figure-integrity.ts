// lib/acca/derived-figure-integrity.ts
// GATE 27 — DERIVED_FIGURE_INTEGRITY (the orphan-numeric check).
//
// THE HOLE THIS CLOSES. GATE 2 (in case-authoring-gates.ts) checks one direction only:
// every answer_schema component's expected_value must APPEAR in model_answer. It never
// checks the reverse — that every figure an author typed into prose traces BACK to a
// code-owned value. Derived figures are the exposed class: a comparison margin, a
// difference, a saving, an effective rate, any computed intermediate that was never
// promoted to a schema component gets quoted in prose with ZERO verification. A typo, a
// stale figure carried from an earlier draft, or a straight-up invented number passes
// silently. (Concretely: the AFM Mock Paper 1 A(iii) advice quotes an "EUR 0.4m" margin
// that is `comparison.margin` — a derived value, not a schema component — so GATE 2 does
// not and cannot check it.)
//
// THE RULE. Every numeric token in the authored prose fields (model_answer / hint /
// full_reveal) must trace to ONE of:
//   (a) a CODE-OWNED value — a schema component's expected_value, a schema param, or a
//       numeric leaf of the calculator's own result object — matched at any of the
//       standard display precisions (0-4 dp, plus the ×100 percentage rendering, since
//       params store rates as decimals while prose renders them as percentages);
//   (b) a GIVEN — a number already present in the requirement's own scenario/exhibits
//       or question (the student is handed it, so the author may restate it);
//   (c) the curated exclusion list below.
// Anything else is an ORPHAN NUMERIC.
//
// Pure and self-contained: no DB, no model, no env, ZERO coupling to the tutor/serving
// path — same discipline as P7/P9/GATE 26. Authoring-time only.

import { fixedHalfUp } from './rounding';

export interface NumericToken {
  raw: string;      // as it appeared, e.g. "1,234.5"
  norm: string;     // commas stripped, e.g. "1234.5"
  before: string;   // text preceding the token (for context-sensitive exclusions)
  after: string;    // text following the token
  hasPercent: boolean;
  hasCurrency: boolean;
  hasScale: boolean; // an m / bn / million / billion suffix
}

export interface OrphanFinding {
  field: string;
  token: string;
  excerpt: string;
}

// A number as written in prose: optional thousands separators, optional decimal part.
// Deliberately does NOT swallow a leading sign — a bare "-" is punctuation as often as
// it is a minus here, and the allowed-set is built from absolute values anyway.
const NUMBER_RE = /\d[\d,]*(?:\.\d+)?/g;
const CONTEXT = 60;

// Currency cue immediately before the number: an ISO code ("EUR 31.7m"), a symbol, or a
// scale word. Used only to classify a token, never to allow it.
const CURRENCY_BEFORE = /(?:[A-Z]{3}\s*|[$£€¥])$/;
const SCALE_AFTER = /^\s*(?:m\b|bn\b|million|billion)/i;

export function extractNumericTokens(text: string): NumericToken[] {
  if (!text) return [];
  const out: NumericToken[] = [];
  NUMBER_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = NUMBER_RE.exec(text))) {
    const before = text.slice(Math.max(0, m.index - CONTEXT), m.index);
    const after = text.slice(m.index + m[0].length, m.index + m[0].length + CONTEXT);
    out.push({
      raw: m[0],
      norm: m[0].replace(/,/g, ''),
      before,
      after,
      hasPercent: /^\s*%/.test(after),
      hasCurrency: CURRENCY_BEFORE.test(before),
      hasScale: SCALE_AFTER.test(after),
    });
  }
  return out;
}

// Every string form a code-owned number may legitimately take in prose. Covers 0-4 dp
// (money() and fmt1 render 1dp; rates render 2dp; FX rates 4dp), the absolute value (a
// negative computed figure is written as a positive with wording carrying the sign —
// "a shortfall of X"), and the ×100 percentage rendering (schema params store rates as
// decimals, e.g. 0.265, while prose says "26.5%").
export function buildAllowedRenderings(values: number[]): Set<string> {
  const out = new Set<string>();
  const add = (v: number) => {
    if (!Number.isFinite(v)) return;
    const a = Math.abs(v);
    for (let dp = 0; dp <= 4; dp++) {
      out.add(v.toFixed(dp)); out.add(a.toFixed(dp));
      // The BOUNDARY-AWARE rendering the calculators actually display with (FR3,
      // lib/acca/rounding.ts). Without this, every figure sitting on a half-way boundary is
      // reported as an orphan: the prose legitimately shows "0.938" while toFixed(3) of the
      // float yields "0.937". Same class of bug as the one fixed in GATE 2's presence check.
      out.add(fixedHalfUp(v, dp)); out.add(fixedHalfUp(a, dp));
    }
    // trailing-zero-trimmed forms: 0.30 -> "0.3", 5.00 -> "5"
    for (let dp = 0; dp <= 4; dp++) {
      out.add(String(Number(a.toFixed(dp))));
      out.add(String(Number(v.toFixed(dp))));
      out.add(String(Number(fixedHalfUp(a, dp))));
      out.add(String(Number(fixedHalfUp(v, dp))));
    }
  };
  for (const v of values) {
    if (!Number.isFinite(v)) continue;
    add(v);
    add(v * 100);   // decimal-stored rate rendered as a percentage
    add(v / 100);   // percentage-stored rate rendered as a decimal
  }
  return out;
}

// Recursively collect every finite numeric leaf from a calculator input/result object.
// This is what lets the gate see DERIVED values (comparison.margin, per-scenario
// effective rates, per-year discount factors) that were never promoted to schema
// components — precisely the class GATE 2 is blind to.
export function collectNumericLeaves(obj: unknown, depth = 0): number[] {
  if (depth > 8 || obj === null || obj === undefined) return [];
  if (typeof obj === 'number') return Number.isFinite(obj) ? [obj] : [];
  if (Array.isArray(obj)) return obj.flatMap((x) => collectNumericLeaves(x, depth + 1));
  if (typeof obj === 'object') return Object.values(obj as Record<string, unknown>).flatMap((x) => collectNumericLeaves(x, depth + 1));
  return [];
}

// ── EXCLUSIONS (curated, deliberately short — see the report in the commit message) ──
// E1 structural numbering: "Step 4", "part 3", "Exhibit 2", "Note 1", "Table 2".
//    Detected by the immediately-preceding structural noun.
const E1_STRUCTURAL_BEFORE = /\b(?:step|steps|part|parts|requirement|exhibit|note|notes|table|phase|round|scenario|year|figure|appendix|section|w)\s*$/i;
// E2 (mark allocations) was DROPPED by ruling, 2026-07-25. It never fired: mark counts live
// in `question`, which this gate does not scan, so it was dead weight widening the exemption
// surface for nothing. Do not reinstate without evidence it actually catches something.
// E3 four-digit calendar years (1900-2099) and dd/mm/yyyy date components.
const E3_YEAR = /^(?:19|20)\d{2}$/;
const E3_DATE_CONTEXT = /(?:\d\s*\/\s*$)|(?:^\s*\/\s*\d)/;
// E4 small counting integers in a clearly NON-FINANCIAL context. The rule, stated
//    precisely: a BARE INTEGER 1-12 inclusive, carrying NO decimal point, NO currency
//    cue before it, NO % after it, and NO m/bn/million scale suffix after it. Such a
//    token cannot be a money amount or a rate by construction — it is a count (months,
//    years, scenarios, contracts-per-list, ordinal prose). The 1-12 ceiling is chosen so
//    it cannot mask a percentage or a money figure of any realistic magnitude; anything
//    13+ or anything carrying a financial cue still has to trace to code or a given.
const E4_MAX_COUNT = 12;
// E4 FOLLOWING-CUE BLOCKLIST (ruled 2026-07-25). A small integer followed by one of these
// nouns is a QUANTITY THE ANSWER IS ASSERTING, not incidental prose counting — "4 contracts"
// is a computed hedge position that must trace to code, exactly like a money figure. Without
// this, the single most examiner-flagged error class in the IR/FX hedging families (a wrong
// contract count) could sit in prose completely unchecked whenever the count happens to be
// ≤ 12. The blocklist beats the small-integer exemption.
const E4_QUANTITY_CUE_AFTER = /^\s*(?:contract|contracts|units|shares|tranches)\b/i;

function isExcluded(t: NumericToken): boolean {
  if (E1_STRUCTURAL_BEFORE.test(t.before)) return true;
  if (E3_YEAR.test(t.norm) && !t.hasPercent && !t.hasCurrency && !t.hasScale) return true;
  if (E3_DATE_CONTEXT.test(t.before) || E3_DATE_CONTEXT.test(t.after)) return true;
  if (/^\d+$/.test(t.norm) && Number(t.norm) >= 1 && Number(t.norm) <= E4_MAX_COUNT
      && !t.hasPercent && !t.hasCurrency && !t.hasScale
      && !E4_QUANTITY_CUE_AFTER.test(t.after)) return true;
  return false;
}

export interface DerivedFigureInput {
  /** authored prose fields to scan — typically model_answer / hint / full_reveal */
  prose: Record<string, string | undefined>;
  /** code-owned numbers: schema expected_values + params + calculator result leaves */
  codeOwned: number[];
  /** the requirement's own scenario + exhibits + question (numbers the student is given) */
  givens: string;
}

// ── ENGAGEMENT RULE (ruled 2026-07-25) ─────────────────────────────────────────────────
// LOUD failure, but ONLY when a calculator RESULT OBJECT is supplied. Silent no-op otherwise.
//
// WHY: this gate is only sound when it can see the derived intermediates — the values that
// live on the result object but were never promoted to schema components. Run with schema
// values alone it produces a flood of unmatchable tokens that look like defects and are not.
// That was MEASURED, not assumed: the same 8 gate-green mock requirements yield 2 orphans
// with the result objects and 29 without — a 14.5x inflation on identical, correct content.
// A caller that cannot supply the result object gets NO opinion from this gate rather than a
// misleading one.
export interface EngagementResult {
  engaged: boolean;
  orphans: OrphanFinding[];
  reason?: string;   // populated when NOT engaged, for the gate line detail
}

/** GATE 27 with the engagement rule applied. `computed` is the calculator's own input/result
 *  objects; when absent or empty the gate is a silent no-op. */
export function runDerivedFigureIntegrity(
  prose: Record<string, string | undefined>,
  schemaValues: number[],
  givens: string,
  computed: unknown[] | undefined,
): EngagementResult {
  if (!computed || computed.length === 0) {
    return { engaged: false, orphans: [], reason: 'no calculator result object supplied — gate not engaged (see ENGAGEMENT RULE)' };
  }
  const codeOwned = [...schemaValues];
  for (const obj of computed) codeOwned.push(...collectNumericLeaves(obj));
  return { engaged: true, orphans: findOrphanNumerics({ prose, codeOwned, givens }) };
}

/** GATE 27 core. Returns every orphan numeric found (empty array = pass). */
export function findOrphanNumerics(input: DerivedFigureInput): OrphanFinding[] {
  const allowed = buildAllowedRenderings(input.codeOwned);
  for (const g of extractNumericTokens(input.givens)) {
    allowed.add(g.norm);
    for (const v of buildAllowedRenderings([Number(g.norm)])) allowed.add(v);
  }
  const out: OrphanFinding[] = [];
  for (const [field, text] of Object.entries(input.prose)) {
    if (!text) continue;
    for (const t of extractNumericTokens(text)) {
      if (allowed.has(t.norm)) continue;
      if (isExcluded(t)) continue;
      out.push({
        field,
        token: t.raw,
        excerpt: `…${t.before.slice(-40).replace(/\s+/g, ' ')}<<${t.raw}>>${t.after.slice(0, 30).replace(/\s+/g, ' ')}…`,
      });
    }
  }
  return out;
}
