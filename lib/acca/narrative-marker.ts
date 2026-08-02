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

// ═══════════════════════════════════════════════════════════════════════════════════════
// N6 — SKILL-DEMAND STRUCTURE (ruled 2026-08-02)
// ═══════════════════════════════════════════════════════════════════════════════════════
//
// ⚠️ THE CLAIM CEILING, VERBATIM AND NON-NEGOTIABLE. A green N6 means:
//
//     "the scenario admits the act and the rubric names the skill as the marking basis"
//
// It NEVER means "the rubric demands the skill". Do not restate it more strongly anywhere —
// not in a pack, not in a commit message, not in a doc heading. Whether a `required_point`
// DEMANDS the skill's act or merely DESCRIBES the topic it acts on is a semantic judgement
// about English with no structural discriminator: "explains why translation exposure matters"
// and "shows the treasurer's claim does not survive the VND 420bn translation exposure" are
// both grammatical, both reference the fact, and both can carry F10. That half stays with the
// grader (N1/N4) and with a human reading the pack.
//
// WHY THERE IS NO PHRASE TABLE HERE, and why one must never be added. The tempting version of
// this gate greps `required_point` for challenge connectives ("does not hold", "is wrong",
// "cannot survive"). It fails twice over: it is trivially gamed by an author writing to the
// detector, and a matched string proves only that SOME sentence renders that way, never which
// one or whether it is the load-bearing clause (P-DB5). The project's own precedent is
// `advice-checks.ts`, which uses a CLOSED GRAMMATICAL CLASS (English quantifiers) rather than a
// phrase table — and no closed class exists for "this sentence demands challenge". So N6 checks
// only structure: arithmetic over the rubric, and the shape of the scenario.
//
// F10 CANNOT DISCRIMINATE BETWEEN THE TWO SKILLS IT COVERS. The mode is "no scepticism /
// commercial acumen" — one mode, two skills. N6a proves a skill was named as the marking basis;
// it can never prove WHICH. Any report built on N6 must say so.
//
// ── MEASURED 2026-08-02: N6a's LABELLING AND THE RUBRIC'S ACTUAL DEMAND DIVERGE ──────────
// The claim ceiling above is not a theoretical hedge. First measured instance, D8 `f6426c06`
// (B1b, scepticism, 12 marks, 5 criteria): F10 is LABELLED on c2 and c3 only, so N6a scores it
// 6/12 — exactly at the bar. But c1 ("the output is therefore likely to understate true downside
// risk"), c4 ("Osprey presents these figures as confirming safety rather than highlighting the
// breadth of outcomes") and c5 ("reject Osprey's characterisation") all perform the act too.
// REAL act coverage is 12/12 against a LABELLED 6/12.
//
// So N6a measured this drill at half its true coverage. The direction here is CONSERVATIVE —
// it under-credits — but the divergence is two-directional in principle, and the other direction
// is the dangerous one: a rubric can label F10 on every criterion while demanding only
// description, which is precisely what an author writing to this detector would produce. That is
// the concrete reason the phrase-table ban and the claim ceiling are not negotiable.
//
// N6a MEASURES LABELLING, NOT DEMAND. Never report an N6a share as a coverage figure.

/** One part of N6. `not_evaluated` is a first-class outcome — a part that cannot run says so
 *  rather than passing vacuously (P-G1). */
export interface SkillDemandPart {
  name: string;
  status: 'pass' | 'fail' | 'not_evaluated';
  detail: string;
}
export interface SkillDemandResult {
  ok: boolean;                 // false iff any part FAILED. not_evaluated does NOT fail the gate...
  evaluatedAll: boolean;       // ...but it does clear this, so a caller can never read a partial run as full coverage.
  parts: SkillDemandPart[];
  reason?: string;
}

/** Fraction of total_marks that must sit on criteria naming the skill as the marking basis. */
export const N6_F10_MARKS_SHARE = 0.5;

/** Quoted spans in the scenario, as word counts. Handles straight and curly pairs; a lone
 *  quote character yields nothing rather than swallowing the rest of the text. */
function quotedSpans(scenario: string): string[] {
  const out: string[] = [];
  for (const re of [/"([^"]+)"/g, /“([^”]+)”/g]) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(scenario)) !== null) out.push(m[1]);
  }
  return out;
}

/**
 * N6 — is the rubric STRUCTURALLY capable of demanding its declared skill?
 *
 * Three parts, each independently reportable:
 *   N6a  F10 marks-share      — ≥ half the marks on criteria listing F10 (the marking basis is named)
 *   N6b  scenario precondition — the scenario CONTAINS what the act operates on
 *   N6c  claim-anchor link     — (scepticism only) every F10 criterion anchors on the asserted claim
 *
 * N6b is the load-bearing one. Without the precondition the act is IMPOSSIBLE, and the rubric
 * degrades silently into topic description — which is exactly what the pre-2026-08-02 AFM
 * narrative corpus is (0 of 8 rows carried F10 on any criterion).
 *
 * `skill` is REQUIRED and has no default. A missing skill returns a single not_evaluated part:
 * the whole point of this gate is the declared skill, and defaulting one would invent the fact
 * being checked.
 */
export function checkSkillDemand(
  rubric: NarrativeRubric,
  scenario: string,
  skill: string | null | undefined,
): SkillDemandResult {
  const parts: SkillDemandPart[] = [];
  const finish = (): SkillDemandResult => ({
    ok: !parts.some((p) => p.status === 'fail'),
    evaluatedAll: !parts.some((p) => p.status === 'not_evaluated'),
    parts,
    reason: parts.filter((p) => p.status === 'fail').map((p) => `${p.name}: ${p.detail}`).join(' · ') || undefined,
  });

  if (!skill || !skill.trim()) {
    parts.push({ name: 'N6 skill-demand', status: 'not_evaluated', detail: 'no declared professional skill supplied — N6 checks the rubric against a DECLARED skill and cannot invent one' });
    return finish();
  }
  if (!rubric.criteria?.length) {
    parts.push({ name: 'N6 skill-demand', status: 'not_evaluated', detail: 'rubric has NO criteria — every N6 part would iterate an empty set and pass vacuously' });
    return finish();
  }

  // ── N6a — F10 marks-share ────────────────────────────────────────────────────────────
  const f10 = rubric.criteria.filter((c) => (c.disqualifiers ?? []).includes('F10'));
  const f10Marks = f10.reduce((a, c) => a + (c.marks ?? 0), 0);
  // Sum the criteria rather than trusting `total_marks`: a rubric whose stated total disagrees
  // with its criteria would otherwise move this ratio without any criterion changing.
  const criteriaMarks = rubric.criteria.reduce((a, c) => a + (c.marks ?? 0), 0);
  if (criteriaMarks <= 0) {
    parts.push({ name: 'N6a F10 marks-share', status: 'not_evaluated', detail: 'criteria carry no marks — the share has a zero denominator' });
  } else {
    const share = f10Marks / criteriaMarks;
    const ok = share >= N6_F10_MARKS_SHARE;
    parts.push({
      name: 'N6a F10 marks-share',
      status: ok ? 'pass' : 'fail',
      detail: `${f10Marks}/${criteriaMarks} marks (${(share * 100).toFixed(0)}%) on criteria listing F10 as a disqualifier; need ≥${N6_F10_MARKS_SHARE * 100}%`
        + (ok ? '' : ` — criteria naming F10: [${f10.map((c) => c.id).join(', ') || 'none'}]`),
    });
  }

  // ── N6b — scenario precondition ──────────────────────────────────────────────────────
  const facts = rubric.scenario_facts ?? [];
  const figures = facts.filter((f) => f.kind === 'figure');
  const constraints = facts.filter((f) => f.kind === 'constraint');
  const spans = quotedSpans(scenario);
  const longSpans = spans.filter((s) => s.trim().split(/\s+/).filter(Boolean).length >= 6);

  switch (skill) {
    case 'scepticism': {
      // The act is challenging something ASSERTED. An assertion the candidate can quote back is a
      // quoted span of real length attributed in the scenario.
      //
      // ⚠️ KNOWN LIMITATION — THIS IS A SUFFICIENT-CONDITION TEST, NOT A NECESSARY ONE, and it
      // can false-positive on legacy content. A quoted attributed claim is the shape SKILL_DEMAND
      // now instructs authors to write, so for drills authored after 2026-08-02 a pass is a true
      // precondition. But scepticism can legitimately act on an UNQUOTED object — a model's stated
      // premise ("the model treats volatility as constant"), an unattributed assumption in an
      // appendix. Measured 2026-08-02: of the 8 pre-fix published narrative rows, `fda46d99` (B3i)
      // and `d413fbe7` (B4d) are both tagged scepticism and both fail here — and `d413fbe7`'s
      // sceptical object is the BSOP model's own assumptions, not anyone's quoted claim. That is
      // very likely a false positive of this proxy rather than a defect in the drill.
      //
      // It is NOT widened to cover the unquoted case, because every candidate widening ("does a
      // constraint fact name an assumption?") requires a word list, and a phrase table is banned
      // above for reasons that do not weaken just because this case is inconvenient. A FAIL here
      // means "no quoted assertion found — confirm by hand what this drill's sceptical object is",
      // never "this drill does not demand scepticism".
      const ok = longSpans.length > 0;
      parts.push({
        name: 'N6b scenario precondition (scepticism)',
        status: ok ? 'pass' : 'fail',
        detail: ok
          ? `scenario carries ${longSpans.length} quoted assertion(s) of ≥6 words — e.g. "${longSpans[0].slice(0, 70)}${longSpans[0].length > 70 ? '…' : ''}"`
          : `scenario carries NO quoted assertion of ≥6 words (${spans.length} quoted span(s) found, none long enough). Scepticism acts on something asserted; with nothing asserted the rubric can only describe the topic`,
      });
      break;
    }
    case 'commercial_acumen': {
      // The act is choosing under stated constraints and owning the cost. That needs a price and a limit.
      const ok = figures.length >= 1 && constraints.length >= 1;
      parts.push({
        name: 'N6b scenario precondition (commercial_acumen)',
        status: ok ? 'pass' : 'fail',
        detail: `${figures.length} figure fact(s) + ${constraints.length} constraint fact(s); need ≥1 of each so the decision has both a price and a limit`,
      });
      break;
    }
    case 'analysis_and_evaluation': {
      // The act is weighing given material — which needs at least two comparable quantities.
      const ok = figures.length >= 2;
      parts.push({
        name: 'N6b scenario precondition (analysis_and_evaluation)',
        status: ok ? 'pass' : 'fail',
        detail: `${figures.length} figure fact(s); need ≥2 comparable quantities for there to be anything to weigh`,
      });
      break;
    }
    case 'communication': {
      // DELIBERATELY NOT EVALUATED. The precondition is "a named audience and a stated purpose",
      // and detecting one needs a word list of audience nouns — a phrase table by another name,
      // banned above. Reported honestly rather than passed vacuously or faked with a regex.
      parts.push({
        name: 'N6b scenario precondition (communication)',
        status: 'not_evaluated',
        detail: 'no structural test exists for "a named audience and a stated purpose" that is not a phrase table (banned — see the header). A communication drill\'s precondition must be confirmed by a human reading the pack',
      });
      break;
    }
    default:
      parts.push({ name: 'N6b scenario precondition', status: 'not_evaluated', detail: `unregistered skill "${skill}" — no precondition defined; add one rather than letting an unknown skill pass` });
  }

  // ── N6c — claim-anchor link (scepticism only) ────────────────────────────────────────
  if (skill !== 'scepticism') {
    parts.push({ name: 'N6c claim-anchor link', status: 'not_evaluated', detail: `structurally N/A for ${skill} — only scepticism acts on a single identifiable asserted claim` });
  } else if (longSpans.length === 0) {
    parts.push({ name: 'N6c claim-anchor link', status: 'not_evaluated', detail: 'no quoted assertion to anchor on — N6b already failed; reporting this as a second failure would double-count one defect' });
  } else {
    // The "claim fact" is a scenario_fact whose key appears INSIDE a quoted assertion.
    const inQuote = facts.filter((f) => f.key && longSpans.some((s) => s.toLowerCase().includes(f.key!.toLowerCase())));
    if (inQuote.length === 0) {
      parts.push({
        name: 'N6c claim-anchor link',
        status: 'fail',
        detail: 'the scenario quotes an assertion but NO scenario_fact key falls inside it — the claim is unreachable as an anchor, so no criterion can be required to bite on it',
      });
    } else {
      const claimIds = new Set(inQuote.map((f) => f.id));
      const missing = f10.filter((c) => !(c.anchor_facts ?? []).some((a) => claimIds.has(a)));
      const ok = f10.length > 0 && missing.length === 0;
      parts.push({
        name: 'N6c claim-anchor link',
        status: ok ? 'pass' : 'fail',
        detail: ok
          ? `all ${f10.length} F10 criteria anchor on the asserted claim (${[...claimIds].join(', ')})`
          : f10.length === 0
            ? 'no F10 criteria to link — N6a already failed'
            : `F10 criteria not anchored on the asserted claim (${[...claimIds].join(', ')}): [${missing.map((c) => c.id).join(', ')}]`,
      });
    }
  }

  return finish();
}
