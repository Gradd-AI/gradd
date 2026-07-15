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
import { checkSpreadMonotonicity, type SpreadRow } from './credit';

export interface ValidationIssue {
  component_id: string;   // '(schema)' for whole-graph issues (cycles)
  gate: 'self-consistency' | 'tolerance' | 'ofr-wiring' | 'spread-monotonicity';
  code: string;           // stable machine label, e.g. 'depends_on-without-recompute'
  message: string;        // human-readable detail
}

export interface ValidationResult {
  ok: boolean;
  issues: ValidationIssue[];
}

// ── Tolerance comparison — mirrors numeric-verifier.within() (not exported there) ──
const EPS = 1e-9;
function within(student: number, expected: number, tol: Tolerance): boolean {
  const diff = Math.abs(student - expected);
  if (tol.kind === 'absolute') return diff <= tol.value + EPS;
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
