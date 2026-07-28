// lib/acca/validate-schema.ts
// Authoring-time QA gates for AFM numeric AnswerSchemas. Pure, deterministic, no model,
// no DB, no side effects. Runs BEFORE any quantitative-drill insert: a schema that fails
// ANY gate must not be persisted. Implements the quality-gate section of the AFM pilot
// diagnosis and docs/AFM_NUMERIC_VERIFICATION_DESIGN.md §2/§4/§6.
//
// This is the numeric analogue of the reconciliation invariant baked into
// scripts/generate-apm-drills.ts computeRegression() — the schema and its own model
// answer must be internally consistent, or the drill is unmarkable and must not ship.
//
// Three gate families:
//   (1) self-consistency  — for every dependent component, recompute(AUTHORED upstream
//       expected_values) must land within the component's own tolerance of its authored
//       expected_value. Catches an expected_value and a recompute rule authored
//       independently that silently disagree (the D2e-regression failure class:
//       "numbers correct ≠ explanation correct"). Prototyped in test-numeric-verifier.ts
//       (the internal-consistency block) and promoted here to a reusable hard gate.
//   (2) tolerance lint    — §4 authoring rules: money figures use relative tolerance in a
//       sane band; rate/% figures use a tight absolute tolerance. A too-wide tolerance
//       lets a method error score; a too-tight one fails correct rounding.
//   (3) OFR-wiring lint    — §6 carry-through integrity: every dependent must carry a
//       recompute rule (else carry-through silently never fires); a recompute rule must
//       have inputs; the formula may only read component_ids that are declared edges; and
//       the depends_on graph must be acyclic with no dangling references.

import type { AnswerSchema, Component, Tolerance } from './numeric-verifier';
import { fixedHalfUp, isOnRoundingBoundary, rendersAsWholeNumber } from './rounding';
import { checkSpreadMonotonicity, type SpreadRow } from './credit';
import { checkOptionBounds, type BsopComputed } from './bsop';
import {
  checkValuationBridge,
  type ValuationKind,
  type FcffComputed,
  type FcfeComputed,
  type DividendComputed,
  type CompareComputed,
} from './valuation';
import {
  checkParityConsistency,
  checkCurrencyScale,
  checkDoubleTaxCap,
  checkTaxProse,
  type ParityBasis,
} from './international';
import {
  checkProbabilitySum,
  checkEnpvConsistency,
  checkSensitivityReconciliation,
  checkRadrOrdering,
  checkVarAndDuration,
  type RadrInputs,
  type RadrComputed,
  type RiskMeasuresInputs,
  type RiskMeasuresComputed,
} from './risk';
import {
  checkWholeContractIntegrity,
  checkBasisDecayReconciliation,
  checkCurrencyDirectionIntegrity,
  checkPremiumCurrency,
  checkBestMethodVerdict,
  checkQuoteSentencePresence,
  type ResidualPolicy,
  type QuoteDirection,
  type ExposureDirection,
  type HedgeMethodResult,
} from './fxhedge';
import {
  checkDirectionLock,
  checkContractCount,
  checkPremiumSeparation,
  checkBasisDecayAndScepticism,
  checkConventionSentencePresence,
  checkEffectiveRateReconciliation,
  type IrDirection,
  type IrHedgeKind,
  type OptionType,
} from './irhedge';

export interface ValidationIssue {
  component_id: string;   // '(schema)' for whole-graph issues (cycles)
  gate: 'self-consistency' | 'tolerance' | 'ofr-wiring' | 'spread-monotonicity' | 'option-bounds' | 'valuation-bridge' | 'parity-consistency' | 'currency-scale' | 'double-tax-cap' | 'probability-sum' | 'enpv-consistency' | 'sensitivity-reconciliation' | 'radr-ordering' | 'var-duration' | 'whole-contract' | 'basis-decay' | 'currency-direction' | 'premium-currency' | 'best-method-verdict' | 'quote-sentence' | 'direction-lock' | 'contract-count' | 'premium-separation' | 'ir-basis-scepticism' | 'convention-sentence' | 'effective-rate-reconciliation' | 'halfway-rounding-risk' | 'capm-1-round-trip' | 'capm-2-hc1' | 'capm-4-wacc' | 'capm-9-hc1-disclosure';
  code: string;           // stable machine label, e.g. 'depends_on-without-recompute'
  message: string;        // human-readable detail
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

// ═══════════════════════════════════════════════════════════════════════════════════════
// HALFWAY_ROUNDING_RISK (AFM mock FR3, 2026-07-25).
//
// THIS IS NOT A FLOATING-POINT BUG — IT IS AN ASSESSMENT HAZARD. Answer-locked marking
// means the student's rounding and OURS must not be able to differ. When a code-owned
// value sits exactly on a half-way boundary at the precision the prose renders it, code
// and a hand-working student can BOTH be right and still disagree on the last digit.
//
// The instance that produced this gate: the A(i) asset beta is mathematically 81/86.4 =
// 0.9375 exactly, but the nearest double is 0.9374999999999999 — genuinely BELOW the tie —
// so `toFixed(3)` correctly renders "0.937", while every student who works it by hand gets
// 0.9375 and rounds (half-up OR half-to-even, both agree here) to "0.938". Note this means
// a plain half-away-from-zero formatter does NOT fix it: the float really is below .5. Any
// fix must treat a value within EPS of a boundary AS the boundary — the same predicate this
// gate uses to detect it.
//
// Detection: for each precision the model answer ACTUALLY renders the value at, scale the
// full-precision value and test whether its fractional part is within HALFWAY_EPS of 0.5.
// Reporting names both candidate renderings and the component's tolerance, because a
// boundary hit that tolerance comfortably absorbs is a different severity from one that
// tolerance does not — the author needs both facts to judge it.
const MAX_DP = 4;

export interface HalfwayHit {
  component_id: string;
  value: number;
  dp: number;
  rendersAs: string;    // what the code prints
  handWorking: string;  // what a hand-working student prints
  tolerance: Tolerance;
  toleranceAbsorbs: boolean; // does the tolerance cover the one-ulp-of-display disagreement?
}

/** Blocking: neither candidate rendering survives the component's own tolerance, so a student
 *  who rounds correctly is marked WRONG. This is the only severity that fails the gate. */
export const HALFWAY_CODE_BLOCKING = 'value-on-rounding-boundary';
/** Advisory: at least one rendering is absorbed by the tolerance, so no correct student is
 *  mismarked. Reported, never blocking — see the either-rendering rule below. */
export const HALFWAY_CODE_ABSORBED = 'value-on-rounding-boundary-absorbed';

/**
 * HALFWAY_ROUNDING_RISK. Scans `modelAnswer` to find which precision each component's value
 * is actually rendered at (a value never shown in prose cannot create a student-facing
 * disagreement, so it is not flagged).
 *
 * REFINEMENT 1 (FR3 wiring): presence is detected via EITHER rendering — plain `toFixed` or the
 * boundary-aware `fixedHalfUp` the calculators now display with — and the gate flags only when
 * the rendering ACTUALLY USED disagrees with the hand-working one. So a drill whose prose
 * already shows the snapped digit ("0.938") PASSES, while one still showing the float artefact
 * ("0.937") FAILS. Without this the gate would silently stop checking the moment the formatter
 * fix landed, because it would no longer find its own `toFixed` string in the prose.
 *
 * REFINEMENT 2 — EITHER-RENDERING ABSORPTION (FR3-CORRECTED, 2026-07-26). A boundary hit is
 * only a MARKING defect when the marker can reject a correct student. Both renderings are
 * plausible submissions from a correct candidate, so the test is against the component's own
 * tolerance: if EITHER `naive` or `hand` is within tolerance of the exact value, no correct
 * student is mismarked and the hit is ADVISORY (a presentation issue). It blocks only when
 * NEITHER survives.
 *
 * This is why the gate previously over-reported: `absorbs` was computed but only ever changed
 * the message text, so a hit the tolerance comfortably covered still failed the barrier
 * identically to a real mismarking. Four live AFM components (47.15 @0.5%rel, 11.275 @0.1abs,
 * 449.35 @0.5%rel, 11.675 @0.05abs) are exactly that shape — each sits half a display step from
 * its rendering, against tolerances 4x-47x larger.
 */
export function validateHalfwayRounding(schema: AnswerSchema, modelAnswer: string): ValidationResult {
  const issues: ValidationIssue[] = [];
  const norm = (modelAnswer ?? '').replace(/,/g, '');
  for (const c of schema.components) {
    const v = c.expected_value;
    if (!Number.isFinite(v)) continue;
    for (let dp = 0; dp <= MAX_DP; dp++) {
      if (!isOnRoundingBoundary(v, dp)) continue;
      const naive = v.toFixed(dp);                  // the float-artefact rendering
      const hand = fixedHalfUp(v, dp);              // what a hand-working student gets
      if (naive === hand) continue;                 // both roundings agree — no divergence
      // Which one does the prose ACTUALLY use? Whole-number match only: a substring test
      // reports "96.5" present when the prose in fact prints "96.55" at 2 dp, where there is
      // no ambiguity — that false positive manufactured a phantom "live drills are
      // mismarking students" alarm during FR3.
      const showsHand = rendersAsWholeNumber(norm, hand) || rendersAsWholeNumber(norm, fixedHalfUp(Math.abs(v), dp));
      const showsNaive = rendersAsWholeNumber(norm, naive) || rendersAsWholeNumber(norm, Math.abs(v).toFixed(dp));
      if (!showsNaive) {
        // Not rendered as the artefact anywhere: either it is not shown at this precision
        // at all, or it is already shown as the hand-working digit. Either way, clean.
        continue;
      }
      // The artefact IS in the prose. Note we do NOT skip merely because `hand` also appears
      // somewhere — a match on the hand string can be an UNRELATED figure that happens to
      // render the same (this is not hypothetical: it silently cleared a real tolerance-
      // exceeding hit during FR3). When both forms appear we cannot attribute them from text
      // alone, so we FAIL CLOSED and report.
      void showsHand;
      const step = Math.pow(10, -dp);
      // EITHER-RENDERING ABSORPTION. Both strings are plausible submissions from a candidate
      // who rounded correctly, so each is tested against the exact value under the component's
      // own tolerance. Absorbed by EITHER → no correct student can be rejected → advisory.
      const absorbsNaive = within(Number(naive), v, c.tolerance);
      const absorbsHand = within(Number(hand), v, c.tolerance);
      const absorbs = absorbsNaive || absorbsHand;
      issues.push({
        component_id: c.component_id,
        gate: 'halfway-rounding-risk',
        code: absorbs ? HALFWAY_CODE_ABSORBED : HALFWAY_CODE_BLOCKING,
        message:
          `${c.component_id} = ${v} sits on a half-way rounding boundary at the ${dp}-dp precision the model answer renders it at: ` +
          `the prose prints "${naive}" (the IEEE-754 artefact) but a hand-working student gets "${hand}" (the exact value is a tie). ` +
          `Answer-locked marking must not be able to disagree with a correct student on the last digit. Component tolerance is ` +
          `${JSON.stringify(c.tolerance)}, which ${absorbs ? 'DOES absorb' : 'does NOT absorb'} the ${step} display difference ` +
          `(naive ${absorbsNaive ? 'within' : 'outside'} tolerance, hand-working ${absorbsHand ? 'within' : 'outside'})` +
          `${absorbs ? ' — ADVISORY: the verifier still accepts the student, so this is a presentation/credibility issue, not a mismarking one. It does NOT block.' : ' — BLOCKING: A STUDENT WHO IS CORRECT WILL BE MARKED WRONG.'} ` +
          `Render this figure through fixedHalfUp (lib/acca/rounding.ts) so code and student agree, or re-pick the inputs so the ` +
          `value does not land on a boundary.`,
      });
    }
  }
  // `ok` counts BLOCKING hits only. Advisory hits stay in `issues` so the author still sees
  // them — suppressing them entirely would lose the FR3 audit trail.
  return { ok: !issues.some((i) => i.code === HALFWAY_CODE_BLOCKING), issues };
}

/** Blocking subset of a halfway result — what the authoring barrier actually gates on. */
export function halfwayBlockingIssues(r: ValidationResult): ValidationIssue[] {
  return r.issues.filter((i) => i.code === HALFWAY_CODE_BLOCKING);
}

// ── Tolerance comparison — mirrors numeric-verifier.within() (not exported there) ──
const EPS = 1e-9;
function within(student: number, expected: number, tol: Tolerance): boolean {
  const diff = Math.abs(student - expected);
  if (tol.kind === 'absolute') return diff <= tol.value + EPS;
  if (tol.kind === 'floor') return diff <= Math.max(Math.abs(expected) * (tol.pct / 100), tol.floor) + EPS;
  return diff <= Math.abs(expected) * (tol.pct / 100) + EPS;
}

// Unit classification for the tolerance lint. Deliberately conservative: a unit is a
// "rate" if it mentions % (WACC, IRR, cost of equity); "money" if it names a currency
// magnitude ($, $m, $000, GBP, USD). A unit can be neither (years, ratio) — those are
// only checked for a present, positive tolerance.
function isRateUnit(unit: string): boolean {
  return /%/.test(unit);
}
function isMoneyUnit(unit: string): boolean {
  // Symbols, common magnitude markers, or an ISO-4217-style 3-letter uppercase currency
  // code (AUD, ZAR, USD, BRL, …) — so "AUDm"/"ZARm" classify as money, not just "$m".
  return /\$|£|€|¥|₹|\bm\b|\b000\b|money|currency/i.test(unit) || /[A-Z]{3}/.test(unit);
}

// Probe which component_ids a recompute rule ACTUALLY reads, without parsing source.
// A Proxy records every property access the closure makes on its deps argument; the
// authored expected_value of each known component is returned so the arithmetic runs.
// Unknown keys return 1 (neutral, avoids div-by-zero during the probe). Constants the
// closure captures from its lexical scope (wacc, growth, debt) are NOT proxy reads, so
// they are correctly ignored — only true cross-component edges are detected.
function accessedDeps(c: Component, expectedById: Map<string, number>): string[] {
  if (!c.recompute) return [];
  const accessed = new Set<string>();
  const proxy = new Proxy(
    {},
    {
      get(_t, prop) {
        if (typeof prop === 'string') {
          accessed.add(prop);
          return expectedById.get(prop) ?? 1;
        }
        return 1;
      },
    },
  ) as Record<string, number>;
  try {
    c.recompute(proxy);
  } catch {
    // Arithmetic may throw on the neutral probe values; we only care about the reads.
  }
  return [...accessed];
}

// Kahn topological check — detects cycles and dangling references in depends_on.
// (numeric-verifier.topoSort is not exported; this is a local structural check.)
function graphIssues(comps: Component[]): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const ids = new Set(comps.map((c) => c.component_id));
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const c of comps) {
    indeg.set(c.component_id, 0);
    adj.set(c.component_id, []);
  }
  for (const c of comps) {
    for (const d of c.depends_on ?? []) {
      if (!ids.has(d)) {
        issues.push({
          component_id: c.component_id,
          gate: 'ofr-wiring',
          code: 'unknown-dependency',
          message: `depends_on references unknown component "${d}"`,
        });
        continue;
      }
      adj.get(d)!.push(c.component_id);
      indeg.set(c.component_id, (indeg.get(c.component_id) ?? 0) + 1);
    }
  }
  // Only run cycle detection when all refs resolve (unknown refs already reported).
  if (issues.length === 0) {
    const queue = comps.filter((c) => (indeg.get(c.component_id) ?? 0) === 0).map((c) => c.component_id);
    let seen = 0;
    while (queue.length) {
      const id = queue.shift()!;
      seen++;
      for (const nxt of adj.get(id)!) {
        indeg.set(nxt, indeg.get(nxt)! - 1);
        if (indeg.get(nxt) === 0) queue.push(nxt);
      }
    }
    if (seen !== comps.length) {
      issues.push({
        component_id: '(schema)',
        gate: 'ofr-wiring',
        code: 'cycle-detected',
        message: 'depends_on graph contains a cycle',
      });
    }
  }
  return issues;
}

/**
 * Validate an authored numeric answer schema against all three gate families.
 * Returns { ok, issues }. ok === true only if issues is empty. A non-ok schema MUST NOT
 * be persisted or served — it is unmarkable.
 */
export function validateSchemaSelfConsistency(schema: AnswerSchema): ValidationResult {
  const issues: ValidationIssue[] = [];
  const comps = schema.components;

  if (comps.length === 0) {
    return {
      ok: false,
      issues: [{ component_id: '(schema)', gate: 'ofr-wiring', code: 'empty-schema', message: 'schema has no components' }],
    };
  }

  const byId = new Map(comps.map((c) => [c.component_id, c]));
  const expectedById = new Map(comps.map((c) => [c.component_id, c.expected_value]));

  // Duplicate component_ids would make the DAG ambiguous.
  if (byId.size !== comps.length) {
    issues.push({ component_id: '(schema)', gate: 'ofr-wiring', code: 'duplicate-component-id', message: 'component_ids are not unique' });
  }

  // ── (3) OFR-wiring: graph structure first ──
  issues.push(...graphIssues(comps));

  for (const c of comps) {
    const deps = c.depends_on ?? [];
    const hasRecompute = typeof c.recompute === 'function';

    // depends_on-without-recompute — carry-through would silently never fire.
    if (deps.length > 0 && !hasRecompute) {
      issues.push({
        component_id: c.component_id,
        gate: 'ofr-wiring',
        code: 'depends_on-without-recompute',
        message: `has depends_on [${deps.join(', ')}] but no recompute rule — OFR carry-through can never fire`,
      });
    }

    // recompute-without-depends_on — a root that declares a computation is mis-wired
    // (covers the "roots-with-deps" class: a root must be a plain input, no recompute).
    if (hasRecompute && deps.length === 0) {
      issues.push({
        component_id: c.component_id,
        gate: 'ofr-wiring',
        code: 'recompute-without-depends_on',
        message: 'has a recompute rule but no depends_on — a root component must not recompute',
      });
    }

    // formula-uses-figure-without-edge (and the inverse: declared-but-unused edge).
    if (hasRecompute) {
      const used = accessedDeps(c, expectedById);
      for (const u of used) {
        if (!deps.includes(u)) {
          issues.push({
            component_id: c.component_id,
            gate: 'ofr-wiring',
            code: 'formula-uses-figure-without-edge',
            message: `recompute reads component "${u}" but it is not a declared depends_on edge — carry-through would use the authored value, not the student's`,
          });
        }
      }
      for (const d of deps) {
        if (!used.includes(d)) {
          issues.push({
            component_id: c.component_id,
            gate: 'ofr-wiring',
            code: 'declared-dependency-unused',
            message: `depends_on lists "${d}" but the recompute rule never reads it — spurious edge`,
          });
        }
      }
    }
  }

  // ── (2) tolerance lint ──
  for (const c of comps) {
    const tol = c.tolerance;
    const unit = c.unit ?? '';
    if (!tol) {
      issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'missing-tolerance', message: 'no tolerance authored' });
      continue;
    }
    if (tol.kind === 'relative') {
      if (!(tol.pct > 0)) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'relative-nonpositive', message: `relative pct must be > 0 (got ${tol.pct})` });
      } else if (tol.pct > 2) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'relative-too-wide', message: `relative pct ${tol.pct}% > 2% would let method errors score` });
      }
      if (isRateUnit(unit)) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'rate-should-use-absolute', message: `rate/% component "${c.component_id}" should use a tight absolute tolerance, not relative` });
      }
    } else if (tol.kind === 'floor') {
      // floor = relative band with an absolute floor — a MONEY tolerance (the small-magnitude
      // guard). The relative part is still capped so it can't let method errors score; the floor
      // must be a sane small absolute band, not a wide one.
      if (!(tol.pct > 0)) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'floor-pct-nonpositive', message: `floor pct must be > 0 (got ${tol.pct})` });
      } else if (tol.pct > 2) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'floor-pct-too-wide', message: `floor pct ${tol.pct}% > 2% would let method errors score` });
      }
      if (!(tol.floor > 0)) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'floor-nonpositive', message: `floor must be > 0 (got ${tol.floor})` });
      } else if (tol.floor > 1) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'floor-too-wide', message: `absolute floor ±${tol.floor} > 1.0 (display-currency m) is too wide for a small-magnitude guard` });
      }
      if (isRateUnit(unit)) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'rate-should-not-use-floor', message: `rate/% component "${c.component_id}" should use a tight absolute tolerance, not a money floor` });
      }
    } else {
      // absolute
      if (!(tol.value > 0)) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'absolute-nonpositive', message: `absolute value must be > 0 (got ${tol.value})` });
      }
      if (isRateUnit(unit) && tol.value > 0.5) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'rate-tolerance-too-wide', message: `rate/% tolerance ±${tol.value} > 0.5 is too wide` });
      }
      // Money should use relative (§4) so slack scales with magnitude.
      if (isMoneyUnit(unit) && !isRateUnit(unit)) {
        issues.push({ component_id: c.component_id, gate: 'tolerance', code: 'money-should-use-relative', message: `money component "${c.component_id}" should use a relative tolerance so slack scales with magnitude` });
      }
    }
  }

  // ── (1) self-consistency: recompute(authored deps) ≈ authored expected ──
  for (const c of comps) {
    const deps = c.depends_on ?? [];
    if (deps.length > 0 && typeof c.recompute === 'function') {
      const authoredDeps: Record<string, number> = {};
      let resolvable = true;
      for (const d of deps) {
        const dc = byId.get(d);
        if (!dc) {
          resolvable = false;
          break;
        }
        authoredDeps[d] = dc.expected_value;
      }
      if (!resolvable) continue; // unknown-dependency already reported
      let got: number;
      try {
        got = c.recompute(authoredDeps);
      } catch (err) {
        issues.push({ component_id: c.component_id, gate: 'self-consistency', code: 'recompute-threw', message: `recompute(authored deps) threw: ${(err as Error).message}` });
        continue;
      }
      if (!Number.isFinite(got)) {
        issues.push({ component_id: c.component_id, gate: 'self-consistency', code: 'recompute-not-finite', message: `recompute(authored deps) = ${got} (not finite)` });
      } else if (!within(got, c.expected_value, c.tolerance)) {
        issues.push({
          component_id: c.component_id,
          gate: 'self-consistency',
          code: 'expected-value-mismatch',
          message: `recompute(authored deps) = ${round(got)} is outside tolerance of authored expected_value ${c.expected_value} — the expected figure and the recompute rule disagree`,
        });
      }
    }
  }

  return { ok: issues.length === 0, issues };
}

function round(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ── GATE 9: spread ↔ rating monotonicity (credit-risk batch, calculator #7, 2026-07-15) ──
// A scenario's rating→spread table must price credit quality monotonically: a WEAKER rating
// (higher ordinal) carries a WIDER spread, and every symbol is one agency's canonical scale
// (delegated to checkSpreadMonotonicity in credit.ts). A hard gate — a table that pays a weaker
// issuer a tighter spread is internally incoherent and unmarkable.
//
// `maturitySpreads` is an OPTIONAL spread-by-maturity curve (bp per year, ascending maturity).
// An INVERTED credit-term-structure (a shorter maturity paying a wider spread) is FLAG-not-fail:
// it can be a real, deliberate scenario, but the drill must annotate it — pass `deliberate:true`
// to accept. This batch uses flat per-rating spreads, so maturitySpreads is normally absent.
export function validateSpreadTable(
  table: SpreadRow[],
  opts?: { maturitySpreads?: number[]; deliberate?: boolean },
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const mono = checkSpreadMonotonicity(table);
  if (!mono.ok) {
    issues.push({ component_id: '(spread-table)', gate: 'spread-monotonicity', code: 'rating-spread-not-monotonic', message: mono.reason ?? 'rating→spread table is not monotonic in credit quality' });
  }
  const ms = opts?.maturitySpreads;
  if (ms && ms.length >= 2) {
    for (let i = 1; i < ms.length; i++) {
      if (ms[i] < ms[i - 1] - 1e-9 && !opts?.deliberate) {
        issues.push({ component_id: '(spread-table)', gate: 'spread-monotonicity', code: 'inverted-credit-term-structure', message: `spread narrows from ${ms[i - 1]}bp (yr ${i}) to ${ms[i]}bp (yr ${i + 1}) — an inverted credit-term-structure is allowed only as a DELIBERATE scenario (annotate it and pass deliberate:true)` });
        break;
      }
    }
  }
  return { ok: issues.length === 0, issues };
}

// ── GATE 10: option no-arbitrage bounds + put-call parity (BSOP batch, calculator #8, 2026-07-15) ──
// A BSOP computation must respect the arbitrage identities: N(d)∈(0,1); the call within
// [max(0,Pₐ−Pₑ·e^(−rt)), Pₐ]; the put within [max(0,Pₑ·e^(−rt)−Pₐ), Pₑ·e^(−rt)]; and put-call
// parity within epsilon. A violation means a mis-wired d1/d2 or a broken parity route — the
// figure is unmarkable. (Delegates to checkOptionBounds in bsop.ts.)
export function validateOptionBounds(c: BsopComputed): ValidationResult {
  const r = checkOptionBounds(c);
  return { ok: r.ok, issues: r.ok ? [] : [{ component_id: '(option)', gate: 'option-bounds', code: 'no-arbitrage-violation', message: r.reason ?? 'option value violates a no-arbitrage bound or put-call parity' }] };
}

// ── GATE 11: valuation flow↔rate↔bridge consistency (valuation batch, calculator #9, 2026-07-16) ──
// The deterministic guard against the VALUATION-PLUMBING failure class: a FCFF (firm) flow discounts
// at WACC and strips debt exactly once; a FCFE (equity) flow discounts at Ke and does NOT strip debt
// (and its FCFF cross-check reconciles); dividend capacity equals FCFE with a consistent sustainability
// verdict; a two-method compare brackets a coherent range with the offer correctly positioned. A
// violation means the flow was matched to the wrong rate or the debt bridge was mis-applied — the
// figure is unmarkable. (Delegates to checkValuationBridge in valuation.ts; g<r is guarded in compute.)
export function validateValuationBridge(
  kind: ValuationKind,
  c: FcffComputed | FcfeComputed | DividendComputed | CompareComputed,
  ctx: { debt_value: number },
): ValidationResult {
  const r = checkValuationBridge(kind, c, ctx);
  return { ok: r.ok, issues: r.ok ? [] : [{ component_id: '(valuation)', gate: 'valuation-bridge', code: 'flow-rate-bridge-violation', message: r.reason ?? 'valuation flow/rate/bridge inconsistency' }] };
}

// ── GATE 12: parity consistency (international batch, calculator #10, 2026-07-17) ──
// Every forecast spot must reconcile to the parity formula from the drill's STATED basis + base
// spot + rate differential (never asserted). A forward that does not derive from the stated inputs
// is an invented number — the drill is unmarkable. (Delegates to checkParityConsistency; validates
// against the basis the drill declares, not one hard-coded formula.)
export function validateParityConsistency(
  fx_curve: number[], base_spot: number, basis: ParityBasis, rate_home: number, rate_foreign: number,
): ValidationResult {
  const r = checkParityConsistency(fx_curve, base_spot, basis, rate_home, rate_foreign);
  return { ok: r.ok, issues: r.ok ? [] : [{ component_id: '(fx-curve)', gate: 'parity-consistency', code: 'forward-not-derived-from-parity', message: r.reason ?? 'a forecast spot does not reconcile to the stated parity basis' }] };
}

// ── GATE 13: currency / unit-scale integrity (international batch, 2026-07-17) ──
// Every figure crossing a currency boundary must reconcile (home × spot = foreign) at a consistent
// scale. Guards the cross-currency conversion + the thousands-vs-millions scale (the IDR-rendering
// failure class). (Delegates to checkCurrencyScale.)
export function validateCurrencyScale(years: { fx: number; foreign_remit_net: number; home_cf: number }[]): ValidationResult {
  const r = checkCurrencyScale(years);
  return { ok: r.ok, issues: r.ok ? [] : [{ component_id: '(currency)', gate: 'currency-scale', code: 'cross-currency-scale-mismatch', message: r.reason ?? 'a cross-currency conversion or unit scale is inconsistent' }] };
}

// ── GATE 14: double-tax cap — differential credit base (international batch; Fix Round 1, 2026-07-17) ──
// The additional home tax each period must equal the credit-method residual on the TAXABLE PROFIT —
// max(0, home_liability − foreign_corp_tax [− WHT if treaty-creditable]) — be ≥ 0 (never a refund),
// and never exceed the home liability. A violation means the double-tax relief was mis-applied.
// (Delegates to checkDoubleTaxCap.)
export function validateDoubleTaxCap(withholding: number, homeTax: number, foreignCorp: number, whtCreditable: boolean, periods: { taxable_profit: number; fcff: number; additional_home_tax_foreign: number }[]): ValidationResult {
  const r = checkDoubleTaxCap(withholding, homeTax, foreignCorp, whtCreditable, periods);
  return { ok: r.ok, issues: r.ok ? [] : [{ component_id: '(double-tax)', gate: 'double-tax-cap', code: 'credit-method-cap-violation', message: r.reason ?? 'double-tax relief exceeds the home liability or is negative' }] };
}

// ── GATE 14b: tax-prose ↔ params consistency (international; Fix Round 2, 2026-07-17) ──
// The tax EXPLANATION in the model answer must match the computed branch — the stated inequality
// direction must be the true one, no false max(), and charged-vs-nil language must match the residual.
// (Delegates to checkTaxProse.) A regression guard on the code-generated assumption line.
export function validateTaxProse(foreignCorp: number, homeTax: number, addRateEffective: number, hasAddTax: boolean, modelAnswer: string): ValidationResult {
  const r = checkTaxProse(foreignCorp, homeTax, addRateEffective, hasAddTax, modelAnswer);
  return { ok: r.ok, issues: r.ok ? [] : [{ component_id: '(tax-prose)', gate: 'double-tax-cap', code: 'tax-prose-inconsistent', message: r.reason ?? 'the tax explanation does not match the computed branch / rate ordering' }] };
}

// ── RISK & UNCERTAINTY family gates G-a…G-e (calculator #3, 2026-07-18) — delegate to risk.ts cores ──
function riskResult(gate: ValidationIssue['gate'], code: string, r: { ok: boolean; reason?: string }): ValidationResult {
  return { ok: r.ok, issues: r.ok ? [] : [{ component_id: `(${gate})`, gate, code, message: r.reason ?? code }] };
}
export function validateProbabilitySum(probs: number[]): ValidationResult {
  return riskResult('probability-sum', 'probabilities-not-exhaustive', checkProbabilitySum(probs));
}
export function validateEnpvConsistency(scenarios: { probability: number; npv: number }[], enpv: number): ValidationResult {
  return riskResult('enpv-consistency', 'enpv-not-prob-weighted', checkEnpvConsistency(scenarios, enpv));
}
export function validateSensitivityReconciliation(c: { base_npv: number; pv_affected: number; variable_sensitivity_pct: number; irr: number; discount_rate: number; disc_rate_sensitivity_pct: number; headroom_pp: number }): ValidationResult {
  return riskResult('sensitivity-reconciliation', 'sensitivity-margin-or-base-wrong', checkSensitivityReconciliation(c));
}
export function validateRadrOrdering(raw: RadrInputs, c: RadrComputed): ValidationResult {
  return riskResult('radr-ordering', 'radr-composition-or-ordering', checkRadrOrdering(raw, c));
}
export function validateVarAndDuration(raw: RiskMeasuresInputs, c: RiskMeasuresComputed): ValidationResult {
  return riskResult('var-duration', 'var-tail-or-duration-bound', checkVarAndDuration(raw, c));
}

// ── FX HEDGING family gates 15–19 (calculator #11, Step-0 ruled 2026-07-22) — delegate to
// fxhedge.ts cores. Naming follows on from GATE 14b (the international family's last slot). ──
export function validateWholeContractIntegrity(exposure: number, contract_size: number, contracts: number, residual: number, residual_policy: ResidualPolicy, home_from_residual: number): ValidationResult {
  return riskResult('whole-contract', 'contract-count-or-residual-mismatch', checkWholeContractIntegrity(exposure, contract_size, contracts, residual, residual_policy, home_from_residual));
}
export function validateBasisDecayReconciliation(spot0: number, futures0: number, months_to_expiry: number, months_to_transaction: number, unexpired_basis: number, lock_in_rate: number): ValidationResult {
  return riskResult('basis-decay', 'basis-not-linear-or-lock-in-mismatch', checkBasisDecayReconciliation(spot0, futures0, months_to_expiry, months_to_transaction, unexpired_basis, lock_in_rate));
}
export function validateCurrencyDirectionIntegrity(foreignAmt: number, rate: number, homeAmt: number, dir: QuoteDirection, direction: ExposureDirection, side: 'buy' | 'sell', expectedSide: 'buy' | 'sell'): ValidationResult {
  return riskResult('currency-direction', 'quote-direction-inversion', checkCurrencyDirectionIntegrity(foreignAmt, rate, homeAmt, dir, direction, side, expectedSide));
}
export function validatePremiumCurrency(premium_pct: number, contracts: number, contract_size: number, premium: number): ValidationResult {
  return riskResult('premium-currency', 'premium-formula-or-conversion-mismatch', checkPremiumCurrency(premium_pct, contracts, contract_size, premium));
}
export function validateBestMethodVerdict(direction: ExposureDirection, results: HedgeMethodResult[], statedBestMethod: string, statedMargin: number): ValidationResult {
  return riskResult('best-method-verdict', 'recommendation-not-the-computed-best', checkBestMethodVerdict(direction, results, statedBestMethod, statedMargin));
}
export function validateQuoteSentencePresence(context_text: string, dir: QuoteDirection, foreign: string, home: string): ValidationResult {
  return riskResult('quote-sentence', 'quote-sentence-not-code-generated', checkQuoteSentencePresence(context_text, dir, foreign, home));
}

// ── INTEREST-RATE HEDGING family gates 20–25 (calculator #12, Step-0 ruled 2026-07-24) — delegate
// to irhedge.ts cores. Naming follows on from GATE 19 (the fx-hedge family's last slot). NO code is
// shared with the fx-hedge premium/lock-in helpers — GATE 22 (premium-separation) enforces that the
// two families' premium conventions stay structurally distinct. ──
export function validateDirectionLock(direction: IrDirection, kind: IrHedgeKind, observed: { futures_side?: 'buy' | 'sell'; option_type?: OptionType; collar_bought?: OptionType; collar_sold?: OptionType }): ValidationResult {
  return riskResult('direction-lock', 'instrument-side-or-type-wrong-for-direction', checkDirectionLock(direction, kind, observed));
}
export function validateContractCount(notional: number, contract_size: number, hedge_months: number, contract_months: number, contracts: number): ValidationResult {
  return riskResult('contract-count', 'contract-count-or-period-wrong', checkContractCount(notional, contract_size, hedge_months, contract_months, contracts));
}
export function validatePremiumSeparation(premium_pct: number, contracts: number, contract_size: number, contract_months: number, premium: number): ValidationResult {
  return riskResult('premium-separation', 'ir-premium-missing-period-fraction', checkPremiumSeparation(premium_pct, contracts, contract_size, contract_months, premium));
}
export function validateBasisDecayAndScepticism(spot_rate0: number, futures0: number, months_to_expiry: number, months_to_transaction: number, unexpired_basis: number, base_rate: number, closing_price: number, model_answer: string): ValidationResult {
  return riskResult('ir-basis-scepticism', 'basis-decay-or-scepticism-hook-missing', checkBasisDecayAndScepticism(spot_rate0, futures0, months_to_expiry, months_to_transaction, unexpired_basis, base_rate, closing_price, model_answer));
}
export function validateConventionSentencePresence(context_text: string, direction: IrDirection, kind: IrHedgeKind): ValidationResult {
  return riskResult('convention-sentence', 'convention-sentence-not-code-generated', checkConventionSentencePresence(context_text, direction, kind));
}
export function validateEffectiveRateReconciliation(effectiveRates: number[]): ValidationResult {
  return riskResult('effective-rate-reconciliation', 'futures-lock-does-not-reconcile', checkEffectiveRateReconciliation(effectiveRates));
}
