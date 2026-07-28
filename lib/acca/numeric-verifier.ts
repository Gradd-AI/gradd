// lib/acca/numeric-verifier.ts
// AFM numeric-verification engine (Phase 2B-1). Pure, deterministic, no model calls,
// no DB, no side effects. Implements docs/AFM_NUMERIC_VERIFICATION_DESIGN.md §5–§8.
//
// DOCTRINE (§1): code decides every number. This module compares a student's figures
// to authored expected values within an authored tolerance and returns per-component
// verdicts. It NEVER decides whether a number is "right" by judgement — only by
// deterministic comparison — and it makes no model calls.
//
// OFR / carry-through (§6, resolved): walk the depends_on DAG; recompute a dependent's
// expected value from the STUDENT'S OWN upstream figures; a correct method on an own
// wrong input verdicts `carried` (full credit). The source error is charged once, at
// the erring step, never again downstream. A wrong-looking figure with NO workings
// verdicts `no_workings` (zero) — OFR cannot be applied when the method is invisible.
// The same charge-once rule runs UPSTREAM too: an omitted intermediate whose error is
// already charged at a dependent verdicts `subsumed` (full credit) rather than `absent`
// — see the post-pass in verifyNumericAnswer for why and for its limits.
//
// PERSISTED-SCHEMA STATUS (corrected 2026-07-28 — the previous note here claimed "no
// persisted schema exists yet", which has been false since the drills went live).
//
// Schemas ARE persisted: 49 published AFM `acca_drills` rows (356 components) and the 5
// numeric `acca_case_requirements` of AFM Mock Paper 1 all store `answer_schema` jsonb
// carrying `depends_on` AND a `recompute` STRING id — 92 distinct ids corpus-wide.
//
// This engine still takes `recompute?: (deps) => number`, so it can only consume an
// IN-MEMORY schema built by a family module (`lib/acca/<family>.ts`), where the lambda is
// live. That is why authoring works: `case-authoring-gates.ts` GATE 3 runs this verifier
// against the freshly-built schema, never against a stored one.
//
// THE REGISTRY THAT WOULD RESOLVE id → function IS NOT BUILT, and the ids are WRITE-ONLY
// today — each family declares a local `recomputeIds` map at serialisation time and
// nothing ever reads one back. Two structural facts block a naive registry, both measured
// 2026-07-28 (see docs/AFM_SURFACED.md):
//
//   1. The lambdas are CLOSURES over per-drill inputs, not pure functions of `deps` — e.g.
//      irhedge's `irh_effective` closes over `raw.notional`/`raw.hedge_months`. So a
//      registry entry cannot have signature `(deps) => number`; it needs the drill's
//      params too.
//   2. `SerializedSchema.params` is typed `Record<string, number>` (valuation.ts), so it
//      structurally CANNOT carry the non-numeric discriminants a large share of the maths
//      branches on — irhedge `side` (buy/sell) and `direction` (borrower/depositor),
//      fxhedge `quote_direction` / `residual_policy` / `premium_currency`. Nor can it
//      carry the array/map state several ids need (risk's probability vector, apv/npv's
//      pv-id list and outlay, international's per-component discount-factor map).
//
// Consequence: ids in that class cannot be resolved from stored data at all without
// widening the serialiser AND re-serialising published rows. Until that is ruled on, a
// stored schema must NOT be silently treated as verifiable — falling back to the authored
// expected value would quietly disable carry-through and mismark a correct method.

// ── Tolerance (§4): absolute + relative + floor, authored in the schema, never inferred ──
export type Tolerance =
  | { kind: 'absolute'; value: number }   // |student − expected| ≤ value (in the component's unit)
  | { kind: 'relative'; pct: number }     // |student − expected| ≤ |expected| × pct/100
  // floor: a relative band with an absolute FLOOR — the effective band is the LARGER of the two,
  // so a small-magnitude money figure (near-zero additional tax, a thin cash flow) is not held to
  // a punishingly tight relative band. Introduced for the international family (calc #10); the
  // relative part keeps large figures honest, the floor keeps small ones fair.
  | { kind: 'floor'; pct: number; floor: number };  // |student − expected| ≤ max(|expected|×pct/100, floor)

// ── Answer schema (§2) ──
export interface Component {
  component_id: string;
  label?: string;
  expected_value: number;                 // authored correct figure, from authored inputs
  unit?: string;
  tolerance: Tolerance;
  working_steps?: string[];               // authored method (sealed; for teaching/reveal, not used in the verdict)
  depends_on?: string[];                  // component_ids this value is computed from (carry-through DAG)
  recompute?: (deps: Record<string, number>) => number; // deterministic recompute from own upstream figures
  weight?: number;                        // mark weight; default 1
}

export interface AnswerSchema {
  components: Component[];
}

// ── Student submission ──
export interface StudentComponent {
  component_id: string;
  value?: number;                         // absent/undefined = not attempted
  workings?: string;                      // shown method; empty/absent = no workings (OFR gate)
}

export interface StudentSubmission {
  components: StudentComponent[];
}

// ── Verdicts (§5–§6) ──
export type Verdict =
  | 'correct'      // matches the authored expected — right on its face
  | 'carried'      // wrong-looking, but matches the carry-through expected with workings — full credit
  | 'incorrect'    // method diverges at this step (workings shown) — zero
  | 'no_workings'  // wrong-looking with no workings — OFR inapplicable — zero
  | 'subsumed'     // not stated, but its error is already charged at a dependent — full credit
  | 'absent';      // not attempted, and nothing downstream charges it — zero

export interface ComponentVerdict {
  component_id: string;
  verdict: Verdict;
  student_value: number | null;
  expected_value: number;                 // EFFECTIVE expected actually checked against (carry-through-adjusted)
  authored_expected: number;              // authored figure (from authored inputs)
  carried_from?: string[];                // upstream ids whose error is being carried (for teaching)
  awarded_weight: number;                 // weight if credited (correct|carried), else 0
  gap?: string;                           // for incorrect|no_workings|absent: the divergence, for teaching
}

// VerificationResult is the teach-engine seam (§7): `gap_label` is the code-authored
// gap label that feeds call3_hint / call3_teach in place of call2_diagnose for numeric
// components; `per_component` is the block the case-marking core sums (§8).
export interface VerificationResult {
  per_component: ComponentVerdict[];
  awarded: number;                        // Σ awarded_weight
  available: number;                      // Σ weight
  all_correct: boolean;
  gap_label: string | null;               // first divergent step (incorrect|no_workings), or null if none
}

const EPS = 1e-9;

function within(student: number, expected: number, tol: Tolerance): boolean {
  const diff = Math.abs(student - expected);
  if (tol.kind === 'absolute') return diff <= tol.value + EPS;
  if (tol.kind === 'floor') return diff <= Math.max(Math.abs(expected) * (tol.pct / 100), tol.floor) + EPS;
  return diff <= Math.abs(expected) * (tol.pct / 100) + EPS;
}

function fmt(n: number): string {
  return (Math.round(n * 10000) / 10000).toString();
}

// Deterministic topological order over depends_on (Kahn). Preserves component array
// order among ready nodes so output is stable. Throws on cycle or unknown reference.
function topoSort(comps: Component[]): string[] {
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const c of comps) { indeg.set(c.component_id, 0); adj.set(c.component_id, []); }
  for (const c of comps) {
    for (const d of c.depends_on ?? []) {
      if (!adj.has(d)) throw new Error(`Component "${c.component_id}" depends on unknown component "${d}"`);
      adj.get(d)!.push(c.component_id);
      indeg.set(c.component_id, (indeg.get(c.component_id) ?? 0) + 1);
    }
  }
  const queue = comps.filter((c) => (indeg.get(c.component_id) ?? 0) === 0).map((c) => c.component_id);
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const nxt of adj.get(id)!) {
      indeg.set(nxt, indeg.get(nxt)! - 1);
      if (indeg.get(nxt) === 0) queue.push(nxt);
    }
  }
  if (order.length !== comps.length) throw new Error('Cycle detected in component depends_on DAG');
  return order;
}

/**
 * Verify a student's numeric submission against an authored answer schema.
 * Deterministic and side-effect-free. See docs/AFM_NUMERIC_VERIFICATION_DESIGN.md §5.
 */
export function verifyNumericAnswer(
  schema: AnswerSchema,
  submission: StudentSubmission,
): VerificationResult {
  const comps = schema.components;
  const byId = new Map(comps.map((c) => [c.component_id, c]));
  const subById = new Map(submission.components.map((s) => [s.component_id, s]));
  const order = topoSort(comps);
  const verdicts = new Map<string, ComponentVerdict>();

  for (const id of order) {
    const c = byId.get(id)!;
    const sub = subById.get(id);
    const studentVal = sub && typeof sub.value === 'number' ? sub.value : null;
    const hasWorkings = !!(sub && typeof sub.workings === 'string' && sub.workings.trim().length > 0);
    const weight = c.weight ?? 1;
    const authoredExpected = c.expected_value;

    // Effective expected via carry-through: recompute from the student's OWN upstream
    // figures. Only when every dependency has a submitted figure and a recompute rule
    // exists; otherwise fall back to the authored value (no carry-through possible).
    let effectiveExpected = authoredExpected;
    let carriedFrom: string[] = [];
    const deps = c.depends_on ?? [];
    if (deps.length > 0 && c.recompute) {
      const depVals: Record<string, number> = {};
      let allPresent = true;
      for (const d of deps) {
        const dv = subById.get(d);
        if (dv && typeof dv.value === 'number') depVals[d] = dv.value;
        else { allPresent = false; break; }
      }
      if (allPresent) {
        effectiveExpected = c.recompute(depVals);
        carriedFrom = deps.filter((d) => {
          const v = verdicts.get(d)?.verdict;
          return v === 'incorrect' || v === 'carried' || v === 'no_workings';
        });
      }
    }

    let verdict: Verdict;
    let gap: string | undefined;

    if (studentVal === null) {
      verdict = 'absent';
      gap = `${id}: not attempted`;
    } else if (within(studentVal, authoredExpected, c.tolerance)) {
      // Right on its face — a correct answer scores, workings or not.
      verdict = 'correct';
    } else if (!hasWorkings) {
      // Wrong-looking AND no workings → OFR inapplicable → zero (§6c).
      verdict = 'no_workings';
      gap = `${id}: ${fmt(studentVal)}${c.unit ? ' ' + c.unit : ''} is outside tolerance and no workings were shown — carry-through cannot be credited, scores zero`;
    } else if (within(studentVal, effectiveExpected, c.tolerance) && carriedFrom.length > 0) {
      // Right method on own wrong upstream input → full credit (§6a). Error charged once, upstream (§6b).
      verdict = 'carried';
    } else {
      // Genuine method error at this step → charged here (§6b).
      verdict = 'incorrect';
      gap = `${id}: expected ~${fmt(effectiveExpected)}${c.unit ? ' ' + c.unit : ''}, got ${fmt(studentVal)} — method diverges at this step`;
    }

    const credited = verdict === 'correct' || verdict === 'carried';
    verdicts.set(id, {
      component_id: id,
      verdict,
      student_value: studentVal,
      expected_value: effectiveExpected,
      authored_expected: authoredExpected,
      carried_from: carriedFrom.length ? carriedFrom : undefined,
      awarded_weight: credited ? weight : 0,
      gap,
    });
  }

  // ── ONE ERROR, ONE CHARGE (§6b, extended to omitted intermediates — Grant ruling 2026-07-28) ──
  // An intermediate the student never states is `absent`, and the step that DEPENDS on it is
  // then judged against the AUTHORED expected (carry-through needs every dep present), so it
  // verdicts `incorrect`. Both score zero — the same single conceptual error charged TWICE.
  //
  // Worked case that forced this: AFM Mock Paper 1 b201 (i). A candidate who ignores basis
  // never writes `unexpired_basis` and prices `closing_price` at 100 − rate. `closing_price`
  // is `incorrect` (correctly — the error surfaces there, and it is charged there). Charging
  // `absent` on `unexpired_basis` as well makes one omission cost two marks.
  //
  // So: an `absent` component becomes `subsumed` — CREDITED — when a component that depends on
  // it directly is `incorrect`, i.e. the omission has already been paid for downstream. It is
  // NOT a blanket amnesty: an `absent` whose dependents are all fine (or which has no
  // dependents at all) stays `absent` and stays zero, because nothing else charged it.
  //
  // `subsumed` is its own verdict rather than folded into `carried` so a marker can still see
  // the figure was never shown, and it is excluded from `all_correct` (a script with an
  // omitted step is not a fully correct script).
  for (const c of comps) {
    const v = verdicts.get(c.component_id)!;
    if (v.verdict !== 'absent') continue;
    const chargedDependents = comps
      .filter((other) => (other.depends_on ?? []).includes(c.component_id))
      .filter((other) => verdicts.get(other.component_id)!.verdict === 'incorrect')
      .map((other) => other.component_id);
    if (chargedDependents.length === 0) continue;
    verdicts.set(c.component_id, {
      ...v,
      verdict: 'subsumed',
      awarded_weight: c.weight ?? 1,
      carried_from: chargedDependents,
      gap: `${c.component_id}: not stated, but the omission is already charged at ${chargedDependents.join(', ')} — not penalised twice`,
    });
  }

  const per_component = comps.map((c) => verdicts.get(c.component_id)!);
  const awarded = per_component.reduce((s, v) => s + v.awarded_weight, 0);
  const available = comps.reduce((s, c) => s + (c.weight ?? 1), 0);
  const all_correct = per_component.every((v) => v.verdict === 'correct');
  const firstBad = order
    .map((id) => verdicts.get(id)!)
    .find((v) => v.verdict === 'incorrect' || v.verdict === 'no_workings');
  const gap_label = firstBad?.gap ?? null;

  return { per_component, awarded, available, all_correct, gap_label };
}
