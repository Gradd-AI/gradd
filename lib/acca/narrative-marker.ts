// lib/acca/narrative-marker.ts
// AFM NARRATIVE marking — the second pipeline (discursive drills). AUTHORING-TIME gate component;
// live per-student marking is OUT of scope for v1 (Grant-ruled 2026-07-18 — see docs/NARRATIVE_MARKING_DESIGN.md).
//
// CLAIM CEILING (do NOT overclaim): this is constrained-model marking with a CODE-OWNED rubric +
// CODE-OWNED aggregation + DETERMINISTIC copy/anchor/coverage checks + Rule-23 consistency. The
// per-criterion QUALITY judgment (developed? applied?) is MODEL-graded under constraint — NOT
// deterministic, NOT "code owns the marks". Detection targets = the F1–F11 examiner failure modes
// (docs/evidence/AFM_NARRATIVE_EVIDENCE.md §1b).
//
// This module owns: the rubric type, the DETERMINISTIC detectors (no model), the code-owned
// AGGREGATION (partial credit + disqualifier caps + band→verdict), and the N1–N5 gate cores. The
// per-criterion model verdict is an INJECTED interface (CriterionGrader) — a mock in fixtures, a real
// grader at authoring time; there is NO live wiring in v1.

// F1–F11 page-VERIFIED 2026-07-20 (docs/evidence/AFM_NARRATIVE_EVIDENCE.md §1b). F12 (required output
// format ignored, SD24 p.7) is in the type so it is ready, but v1 emits it on NO drill — it keys a
// criterion only when a requirement names an output format (report/memo). See NARRATIVE_MARKING_DESIGN.md
// CLOSED RULINGS.
export type FailureMode = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6' | 'F7' | 'F8' | 'F9' | 'F10' | 'F11' | 'F12';
export type Met = 'no' | 'partial' | 'yes';

export interface ScenarioFact {
  id: string;
  text: string;                       // human description of the fact
  key?: string;                       // distinctive token to match in an answer (e.g. "4%", "Halstock"); falls back to content-word overlap
  kind: 'figure' | 'entity' | 'constraint';
}
export interface Criterion {
  id: string;
  requirement_part: string;           // which question part this belongs to (F7 coverage)
  lo: string;                         // maps to a §1a LO / evidence quote
  required_point: string;             // the point a full-marks answer makes
  marks: number;
  anchor_facts: string[];             // ScenarioFact ids this point must USE (F5)
  disqualifiers: FailureMode[];       // F-modes that void/cap this criterion
  development_required: boolean;      // claim→because→implication (F2/F3/F6)
  evidence_anchor?: string;           // authoring provenance: the examiner quote/page this criterion's
                                      // marking basis rests on (e.g. F9 → "J24 p.14"); never served, not marked on
}
export interface NarrativeRubric {
  mode: 'narrative';
  requirement_parts: string[];
  scenario_facts: ScenarioFact[];
  criteria: Criterion[];
  total_marks: number;
  bands: { min: number; label: string }[];   // min = fraction of total_marks (ascending); code owns band→verdict
}
export interface CriterionVerdict {
  criterion_id: string;
  met: Met;
  evidence_span: string;              // a quote FROM the student answer (the model grounds its verdict)
  failure_flags: FailureMode[];
}
// The model layer, injected. A mock in fixtures; a real (constrained) grader at authoring time. NO live wiring.
export type CriterionGrader = (c: Criterion, answer: string, scenario: string) => CriterionVerdict | Promise<CriterionVerdict>;

// ── DETERMINISTIC DETECTORS (pure, no model) ──
const norm = (s: string): string[] => (s.toLowerCase().replace(/[^a-z0-9%£$€\s]/g, ' ').split(/\s+/).filter(Boolean));
const STOP = new Set(['the', 'a', 'an', 'of', 'to', 'and', 'in', 'is', 'it', 'for', 'on', 'as', 'be', 'by', 'that', 'this', 'with', 'are', 'or', 'its', 'at', 'from', 'which', 'will', 'has']);

// F1 scenario-copy: the fraction of the answer's word n-grams that also appear verbatim in the scenario.
// High → the answer is restating the scenario without added analysis (earns nothing, F1).
export function scenarioCopyOverlap(answer: string, scenario: string, n = 6): number {
  const a = norm(answer), sc = norm(scenario);
  if (a.length < n) return 0;
  const grams = (ws: string[]) => { const g = new Set<string>(); for (let i = 0; i + n <= ws.length; i++) g.add(ws.slice(i, i + n).join(' ')); return g; };
  const ag = grams(a), sg = grams(sc);
  if (ag.size === 0) return 0;
  let hit = 0; for (const g of ag) if (sg.has(g)) hit++;
  return hit / ag.size;
}
// Is a scenario fact actually USED in the answer? Key token match, else ≥60% of the fact's content words.
export function factUsed(answer: string, fact: ScenarioFact): boolean {
  const a = answer.toLowerCase();
  if (fact.key) return a.includes(fact.key.toLowerCase());
  const words = norm(fact.text).filter((w) => !STOP.has(w) && w.length > 2);
  if (words.length === 0) return true;
  const present = words.filter((w) => a.includes(w)).length;
  return present / words.length >= 0.6;
}
// Which anchor facts a criterion demands are MISSING from the answer (F5 — not anchored to the scenario).
export function missingAnchors(answer: string, c: Criterion, facts: ScenarioFact[]): string[] {
  return c.anchor_facts.filter((fid) => { const f = facts.find((x) => x.id === fid); return f ? !factUsed(answer, f) : true; });
}
// F4/F11 — the answer commits to a conclusion/recommendation.
export function hasConclusion(answer: string): boolean {
  return /\b(recommend|conclude|in conclusion|the board should|we advise|should proceed|should not proceed|should adopt|should reject|on balance)\b/i.test(answer);
}
// F1 (copied a sentence) — the longest contiguous verbatim word-run shared with the scenario. A single
// copied sentence stays detectable here even when the rest of the answer dilutes the 6-gram OVERLAP
// fraction below threshold (scenarioCopyOverlap measures share; this measures the longest lift).
export function longestVerbatimRun(answer: string, scenario: string): number {
  const a = norm(answer), sc = norm(scenario);
  if (a.length === 0 || sc.length === 0) return 0;
  const scSet = new Set<string>();
  // index every scenario position by its starting word for a quick contiguous-match scan
  let best = 0;
  for (let i = 0; i < a.length; i++) {
    for (let j = 0; j < sc.length; j++) {
      if (a[i] !== sc[j]) continue;
      let k = 0;
      while (i + k < a.length && j + k < sc.length && a[i + k] === sc[j + k]) k++;
      if (k > best) best = k;
    }
  }
  void scSet;
  return best;   // in words
}

// ── CODE-OWNED AGGREGATION (partial credit + disqualifier caps + band) ──
const HARD_ZERO: FailureMode[] = ['F1'];  // scenario-restating voids the criterion outright
export interface MarkResult {
  per_criterion: { criterion_id: string; met: Met; marks: number; capped: boolean; flags: FailureMode[] }[];
  awarded: number; total: number; fraction: number; band: string;
}
export function aggregate(rubric: NarrativeRubric, verdicts: CriterionVerdict[], scenario: string, answer: string): MarkResult {
  const byId = new Map(verdicts.map((v) => [v.criterion_id, v]));
  const per_criterion = rubric.criteria.map((c) => {
    const v = byId.get(c.id) ?? { criterion_id: c.id, met: 'no' as Met, evidence_span: '', failure_flags: [] as FailureMode[] };
    // merge model flags with DETERMINISTIC flags: missing anchors → F5; a copied evidence span → F1
    const detFlags: FailureMode[] = [];
    if (missingAnchors(answer, c, rubric.scenario_facts).length > 0) detFlags.push('F5');
    if (v.evidence_span && scenarioCopyOverlap(v.evidence_span, scenario, 6) >= 0.5) detFlags.push('F1');
    const flags = Array.from(new Set([...v.failure_flags, ...detFlags]));
    let marks = v.met === 'yes' ? c.marks : v.met === 'partial' ? c.marks / 2 : 0;
    let capped = false;
    const disq = flags.filter((f) => c.disqualifiers.includes(f));
    if (disq.some((f) => HARD_ZERO.includes(f))) { if (marks > 0) capped = true; marks = 0; }
    else if (disq.length > 0) { const half = c.marks / 2; if (marks > half) { marks = half; capped = true; } }
    return { criterion_id: c.id, met: v.met, marks, capped, flags };
  });
  const awarded = per_criterion.reduce((s, x) => s + x.marks, 0);
  const total = rubric.total_marks;
  const fraction = total > 0 ? awarded / total : 0;
  const band = [...rubric.bands].sort((a, b) => a.min - b.min).reduce((acc, b) => (fraction >= b.min ? b.label : acc), rubric.bands[0]?.label ?? 'fail');
  return { per_criterion, awarded, total, fraction, band };
}

// ── GATE CORES (N1–N5), authoring-time. Return { ok, reason? }. N1/N4 take a grader (mock in fixtures). ──
export interface NarrativeCheck { ok: boolean; reason?: string }

// N1 — rubric-coverage: every requirement_part maps to ≥1 criterion (F7), AND the reveal satisfies every
// criterion (a full-marks answer). The reveal is graded by the injected grader.
export async function checkRubricCoverage(rubric: NarrativeRubric, reveal: string, scenario: string, grader: CriterionGrader): Promise<NarrativeCheck> {
  for (const part of rubric.requirement_parts) if (!rubric.criteria.some((c) => c.requirement_part === part)) return { ok: false, reason: `requirement part "${part}" has no criterion (F7)` };
  const verdicts = await Promise.all(rubric.criteria.map((c) => grader(c, reveal, scenario)));
  const res = aggregate(rubric, verdicts, scenario, reveal);
  const notMet = res.per_criterion.filter((p) => p.marks < (rubric.criteria.find((c) => c.id === p.criterion_id)!.marks));
  if (notMet.length) return { ok: false, reason: `reveal does not fully satisfy criteria: ${notMet.map((p) => p.criterion_id).join(', ')} — it is not a full-marks answer` };
  return { ok: true };
}
// N2 — scenario-anchor: every anchor fact exists in the scenario AND is used in the reveal (F5).
export function checkScenarioAnchor(rubric: NarrativeRubric, scenario: string, reveal: string): NarrativeCheck {
  for (const f of rubric.scenario_facts) if (!factUsed(scenario, f)) return { ok: false, reason: `scenario_fact "${f.id}" (${f.text}) is not present in the scenario — an anchor must be a real scenario fact` };
  for (const c of rubric.criteria) { const miss = missingAnchors(reveal, c, rubric.scenario_facts); if (miss.length) return { ok: false, reason: `criterion ${c.id}: the reveal does not use anchor fact(s) ${miss.join(', ')} (F5)` }; }
  return { ok: true };
}
// N3 — generic/copy lint: the reveal is not scenario-restating (F1 overlap under threshold).
export function checkGenericCopy(reveal: string, scenario: string, threshold = 0.18): NarrativeCheck {
  const ov = scenarioCopyOverlap(reveal, scenario, 6);
  if (ov >= threshold) return { ok: false, reason: `reveal overlaps the scenario at ${(ov * 100).toFixed(0)}% (≥${(threshold * 100).toFixed(0)}%) — it restates rather than analyses (F1)` };
  return { ok: true };
}
// N4 — Rule-23 consistency (verifier-of-the-verifier): the GOOD answer scores in a pass band and the BAD
// answer scores below it AND raises its designed F-modes. The load-bearing gate for the model layer.
export async function checkRule23(rubric: NarrativeRubric, scenario: string, good: string, bad: string, designedBadFlags: FailureMode[], grader: CriterionGrader, passFraction = 0.7): Promise<NarrativeCheck> {
  const gv = await Promise.all(rubric.criteria.map((c) => grader(c, good, scenario)));
  const bv = await Promise.all(rubric.criteria.map((c) => grader(c, bad, scenario)));
  const gRes = aggregate(rubric, gv, scenario, good), bRes = aggregate(rubric, bv, scenario, bad);
  if (gRes.fraction < passFraction) return { ok: false, reason: `golden GOOD scores ${(gRes.fraction * 100).toFixed(0)}% (< ${(passFraction * 100).toFixed(0)}%) — the marker under-marks a full answer` };
  if (bRes.fraction >= gRes.fraction) return { ok: false, reason: `golden BAD (${(bRes.fraction * 100).toFixed(0)}%) does not score below GOOD (${(gRes.fraction * 100).toFixed(0)}%) — the marker cannot tell them apart` };
  // The marker's DETERMINISTIC whole-answer detectors are part of the marker too: a BAD that copies the
  // scenario (F1) or never commits a recommendation (F4) is detected without the model layer. Fold those
  // into the raised set so N4 credits detection the marker genuinely has (the per-criterion set already
  // carries the model flags + F5 missing-anchor + F1 copied-span).
  const raised = new Set<FailureMode>(bRes.per_criterion.flatMap((p) => p.flags));
  if (scenarioCopyOverlap(bad, scenario, 6) >= 0.18 || longestVerbatimRun(bad, scenario) >= 8) raised.add('F1');
  if (!hasConclusion(bad)) raised.add('F4');
  const missing = designedBadFlags.filter((f) => !raised.has(f));
  if (missing.length) return { ok: false, reason: `golden BAD did not raise its designed failure mode(s): ${missing.join(', ')}` };
  return { ok: true };
}
// N5 — committed verdict + structure: where a requirement asks for a recommendation, the reveal commits (F4/F11).
export function checkCommittedVerdict(rubric: NarrativeRubric, reveal: string): NarrativeCheck {
  const wantsVerdict = rubric.requirement_parts.some((p) => /recommend|advise|conclude|evaluate|assess|should/i.test(p)) || rubric.criteria.some((c) => /recommend|verdict|conclusion/i.test(c.required_point));
  if (wantsVerdict && !hasConclusion(reveal)) return { ok: false, reason: 'the requirement asks for a recommendation/conclusion but the reveal does not commit to one (F4/F11)' };
  return { ok: true };
}
