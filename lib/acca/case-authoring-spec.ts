// lib/acca/case-authoring-spec.ts
//
// THE PARAMETERISED AFM CASE-AUTHORING PATH — the pure half.
//
// `scripts/authoring/author-afm-mock-paper-1.ts` is a one-off: its case ids, exhibits and every
// requirement string are literals. This module is the shape that one-off should have had — a
// SPEC goes in, a gated, insert-ready case comes out, and nothing about a particular case is
// baked in. The script that partners it (`scripts/authoring/author-afm-case.ts`) owns only the
// DB round-trip and the CLI.
//
// It lives in `lib/` rather than in the script for one reason that matters: `tsconfig.json`
// EXCLUDES `scripts/`, so nothing under it is ever typechecked by `npm run build`. Putting the
// spec types, the builders and the gates here means the compiler actually checks them, and the
// fixtures can exercise the whole path with no database.
//
// ── WHAT IS SUPPLIED vs WHAT IS BUILT ────────────────────────────────────────
// The spec supplies INPUTS and SHORT PROSE FRAGMENTS. It never supplies a finished field:
//
//   supplied → case frame · exhibits · lo_code / marks / PS tags · TYPED calcInputs ·
//              question prose · advice prose · misconception + fix · hint lead + method
//   BUILT    → model_answer   (build*ModelAnswer, from the calculator)
//              answer_schema  (build*Schema — every figure code-owned)
//              full_reveal    (composed in the P7-compliant misconception-lead shape)
//              hint           (composed in a fixed two-part shape)
//
// So no author can paste a model answer in, and no figure reaches the database that a
// calculator did not produce. That is the same rule the drill generator enforces, applied to
// cases.
//
// ── THE NUMERIC SPEC IS A TYPED UNION, AND THAT IS THE POINT ─────────────────
// `NumericRequirementSpec` is discriminated on `(paper, lo)`, and each arm carries that
// family's OWN input type. An unsupported family is a COMPILE ERROR, not a runtime surprise —
// which is the difference between "this case has no family gates" being a decision and being
// an accident. See `familyGateCoverage()` for what the union can and cannot reach today.
//
// ⚠️ THE PAPER IS HALF THE KEY, AND IT WAS NOT ALWAYS (fixed 2026-08-17). The union used to
// discriminate on a BARE LO STRING, and an LO code is not unique across papers — `paper.ts`
// already says so for the drill FETCH ("AFM and APM LO codes collide exactly and paper_code is
// the only thing that separates them"), but this compile gate never saw a paper at all. FIVE of
// the six codes below are ALSO real SBL learning outcomes:
//
//   B1a  SBL "Discuss the nature of the principal-agent relationship in the context of
//        governance"                        ← here: AFM's ENPV / risk-and-uncertainty calculator
//   B5b  SBL "Evaluate the case for and against unitary and two-tier board structures"
//                                          ← here: AFM's international NPV calculator
//   B4a  SBL "Discuss the factors that determine organisational policies on reporting to
//        stakeholders"                      ← here: AFM's FCFF valuation calculator
//   E2b  SBL "Describe big data and discuss the opportunities and threats big data presents"
//                                          ← here: AFM's forward-vs-money-market FX hedge
//   E3a  SBL "Explain the potential benefits of using artificial intelligence (AI), robotics
//        and other forms of machine learning"
//                                          ← here: AFM's interest-rate futures hedge
//
// (only B3e is safe — SBL's B3 stops at B3d.) So `{ lo: 'B1a', inputs: … }` written for SBL's
// governance outcome TYPECHECKED CLEANLY and routed a narrative governance requirement into
// AFM's ENPV calculator. Nothing downstream would have caught it: the family gates key off the
// same bare `lo`, and the DB's `lo_code` column would have received a code that is correct for
// BOTH papers. Requiring `paper` makes the collision unrepresentable — an SBL author must
// either write `paper: 'AFM'` (a visible false assertion, not a silent one) or get a compile
// error naming the supported set.

import type { AnswerSchema } from './numeric-verifier';
import {
  computeCapm, buildCapmSchema, buildCapmModelAnswer,
  type CapmInputs, type CapmKind, type CapmComputed,
} from './capm';
import {
  computeIntlNpv, buildIntlNpvSchema, buildIntlNpvModelAnswer,
  type IntlNpvInputs, type IntlNpvComputed,
} from './international';
import {
  computeForwardMmhCompare, buildForwardMmhCompareSchema, buildForwardMmhCompareModelAnswer,
  type ForwardMmhCompareInputs, type ForwardMmhCompareComputed,
} from './fxhedge';
import {
  computeEnpv, buildEnpvSchema, buildEnpvModelAnswer,
  type EnpvInputs, type EnpvComputed,
} from './risk';
import {
  computeIrFutures, buildIrFuturesSchema, buildIrFuturesModelAnswer,
  type IrFuturesInputs, type IrFuturesComputed,
} from './irhedge';
import {
  computeFcff, buildFcffSchema, buildFcffModelAnswer,
  type FcffInputs, type FcffComputed,
} from './valuation';
import type { AccaPaper } from './paper';
import type { FamilyGateInput } from './case-authoring-gates';
import {
  gateSectionASpan, gateNotWhollyNarrative, gatePsSkillSet,
  type GateCase, type GateResult, type MarkingKind, type Section,
} from './case-gates';

// ═════════════════════════════════════════════════════════════════════════════
// THE SPEC
// ═════════════════════════════════════════════════════════════════════════════

export interface ExhibitSpec {
  title: string;
  /** Must STATE every calculator input this case's requirements consume — enforced, not
   *  assumed. See checkExhibitsStateInputs and the note on its limits. */
  body: string;
}

export interface CaseFrameSpec {
  /** Deterministic so a re-author targets the same row rather than duplicating it. */
  id: string;
  section: Section;
  /** e.g. 'B1', 'E2'. Null for a Section A case spanning several syllabus sections. */
  anchor_area: string | null;
  title: string;
  scenario_intro: string;
  response_format: string;
  total_marks: number;
  professional_skills_marks: number;
}

/** Prose fragments. NONE of these is written to a column as-is — each is an input to a builder. */
export interface RequirementProse {
  /** The requirement as the candidate reads it. */
  question: string;
  /** Step-5 advice prose, passed into the family's build*ModelAnswer. */
  advice: string;
  /** P7: the designed misconception — the wrong BELIEF, as a noun phrase
   *  ("treating the ENPV as the decision"). Composed into full_reveal. */
  misconception: string;
  /** What candidates actually DO when they hold it ("candidates report the ENPV and stop").
   *  Composed after the colon P7 requires — see composeFullReveal. */
  symptom: string;
  /** How the misconception is corrected. Composed into full_reveal after the lead. */
  fix: string;
  /** What NOT to do / where the marks actually are. Composed into hint. */
  hint_lead: string;
  /** The method steer. Composed into hint after the lead. */
  hint_method: string;
}

/** The TYPED calculator union. Each arm is one `FamilyGateInput` family, keyed on `(paper, lo)`
 *  — extending this list is the only way to author a new numeric family, and it is deliberately
 *  a compile-time gate. `paper` is NOT decoration: see the header note on the five AFM LO codes
 *  that are also live SBL learning outcomes. */
export type NumericCalcSpec =
  | { paper: 'AFM'; lo: 'B3e'; kind: CapmKind; inputs: CapmInputs }
  | { paper: 'AFM'; lo: 'B5b'; inputs: IntlNpvInputs }
  | { paper: 'AFM'; lo: 'E2b'; inputs: ForwardMmhCompareInputs }
  | { paper: 'AFM'; lo: 'B1a'; inputs: EnpvInputs }
  | { paper: 'AFM'; lo: 'E3a'; inputs: IrFuturesInputs }
  | { paper: 'AFM'; lo: 'B4a'; inputs: FcffInputs; currency: string; debt_value: number; equity_weight: number };

export interface NumericRequirementSpec {
  requirement_order: number;
  marks: number;
  /** Comma-free list; joined for the column, split for the gates. */
  ps_tags: string[];
  intellectual_level: number;
  calc: NumericCalcSpec;
  prose: RequirementProse;
  /** Calculator inputs the exhibits legitimately do NOT state verbatim, each with a REASON.
   *  Named, never silent — the same discipline as the barrier's NO_FAMILY_GATES escape. */
  exhibit_exempt?: Record<string, string>;
}

export interface NarrativeRequirementSpec {
  requirement_order: number;
  lo: string;
  marks: number;
  ps_tags: string[];
  intellectual_level: number;
  question: string;
  /** The narrative rubric, hand-authored — no calculator produces one. Typed as unknown here
   *  so this module stays free of the marker's internals; the runner validates it through the
   *  N1–N5 barrier, which is what actually checks its shape. */
  rubric: unknown;
  /** Golden GOOD — becomes model_answer. Golden BAD — stored under _authoring, never served. */
  golden_good: string;
  golden_bad: string;
  misconception: string;
  symptom: string;
  fix: string;
  hint_lead: string;
  hint_method: string;
}

export interface AfmCaseSpec {
  frame: CaseFrameSpec;
  exhibits: ExhibitSpec[];
  numeric: NumericRequirementSpec[];
  narrative: NarrativeRequirementSpec[];
}

// ═════════════════════════════════════════════════════════════════════════════
// COMPOSERS — the fields the spec may not supply directly
// ═════════════════════════════════════════════════════════════════════════════

// P7's own regex, from lib/acca/validate-afm-prose.ts:424. Duplicated here for the SAME reason
// that file duplicates it from tutor-grounding.ts — the composer must be able to tell whether an
// author already supplied a compliant frame, without importing the lint into a pure builder.
const MISCONCEPTION_FRAME = /misconception[^:]*:/i;

/**
 * full_reveal, in the shape P7 requires.
 *
 * `lintMisconceptionLead` fails any full_reveal without a literal "...misconception...**:**"
 * sentence, because `extractMisconceptionLead` (tutor-grounding.ts) otherwise silently falls
 * back to the first sentence and feeds the tutor generic scaffolding instead of the drill's real
 * failure mode.
 *
 * THE COLON IS THE WHOLE POINT, and it is why this takes the misconception in TWO parts. A
 * first version took one free-text `misconception` and wrapped it — and produced
 * "The classic misconception here is X." with no colon, which P7 rejects. The fixture caught it.
 * Splitting into the wrong BELIEF and the SYMPTOM makes the colon structural: the author cannot
 * word their way out of a compliant reveal, which is the only reason to compose rather than
 * accept the field.
 */
export function composeFullReveal(misconception: string, symptom: string, fix: string): string {
  const m = misconception.trim().replace(/[.:\s]+$/, '');
  const s = symptom.trim();
  // An author who already wrote a compliant frame keeps it — no double-wrapping.
  const lead = MISCONCEPTION_FRAME.test(m) ? (s ? `${m} ${s}` : m) : `The classic misconception here is ${m}: ${s}`;
  return `${lead.trim()}\n\n${fix.trim()}`;
}

/** hint, in a fixed two-part shape: what not to do, then the method. */
export function composeHint(lead: string, method: string): string {
  return `${lead.trim()} ${method.trim()}`.replace(/\s+/g, ' ').trim();
}

// ═════════════════════════════════════════════════════════════════════════════
// THE NUMERIC BUILDER
// ═════════════════════════════════════════════════════════════════════════════

export interface BuiltNumeric {
  lo: string;
  schema: AnswerSchema;
  serialized: unknown;
  model_answer: string;
  hint: string;
  full_reveal: string;
  question: string;
  /** Exactly what runRequirementGateBarrier needs for this family. */
  family: FamilyGateInput;
  /** The calculator's own input + result objects — GATE 27 blocks without them. */
  computed: unknown[];
  /** Derived, never caller-supplied. */
  zeroAddlTax?: boolean;
  compare?: { selected: string; all: string[] };
  /** Every finite number the calculator consumes, for the exhibit-statement check. */
  inputNumbers: Record<string, number>;
}

/**
 * Run the family's calculator and build every code-owned field.
 *
 * `zeroAddlTax` and `compare` are DERIVED from the computed result, not taken from the spec —
 * the same reason `hasLoss` was removed from the barrier's caller-supplied fields in July: a
 * caller passing a wrong value silently disables the gate that depends on it.
 */
export function buildNumericRequirement(spec: NumericRequirementSpec): BuiltNumeric {
  // ── THE PAPER IS CHECKED AT RUNTIME, NOT ONLY AT COMPILE TIME ──────────────
  // The typed union is the primary gate, but it CANNOT REACH THE AUTHORING SPECS: every real
  // spec lives under `scripts/authoring/specs/`, and `tsconfig.json` excludes `scripts/`, so
  // `npm run build` never typechecks one. A compile-only fix would therefore have been a fix
  // that the files it was written for do not receive — the gate would hold in an editor and
  // nowhere else.
  //
  // The switch below dispatches on `lo` ALONE, which is precisely the collision: an SBL spec
  // saying `{ lo: 'B1a', … }` with no paper (or the wrong one) would fall straight into AFM's
  // ENPV arm and return a fully-built, fully-gated numeric requirement for a governance
  // outcome. So the pair is verified here, before dispatch.
  if ((spec.calc as { paper?: string }).paper !== 'AFM') {
    const bad = spec.calc as { paper?: string; lo?: string };
    throw new Error(
      `buildNumericRequirement: family "${bad.paper ?? '(no paper)'}:${bad.lo ?? '(no lo)'}" is not ` +
      `an authorable numeric family. Supported: [${SUPPORTED_NUMERIC_FAMILIES.map(familyKey).join(', ')}]. ` +
      'Every arm of NumericCalcSpec is an AFM calculator; an LO code alone does not identify one, ' +
      'because AFM/APM LO codes collide exactly and five of the six above (B1a, B4a, B5b, E2b, E3a) ' +
      'are also live SBL learning outcomes.',
    );
  }

  const p = spec.prose;
  const hint = composeHint(p.hint_lead, p.hint_method);
  const full_reveal = composeFullReveal(p.misconception, p.symptom, p.fix);
  const common = { question: p.question, hint, full_reveal };

  switch (spec.calc.lo) {
    case 'B3e': {
      const { inputs, kind } = spec.calc;
      const c: CapmComputed = computeCapm(inputs, kind);
      const built = buildCapmSchema(inputs, c, kind);
      const model_answer = buildCapmModelAnswer(inputs, c, p.advice, kind);
      return {
        ...common, lo: 'B3e', schema: built.schema, serialized: built.serialized, model_answer,
        family: { lo: 'B3e', capmIn: inputs, capmC: c, capmKind: kind, modelAnswer: model_answer },
        computed: [inputs, c], inputNumbers: flattenNumbers(inputs),
      };
    }
    case 'B5b': {
      const { inputs } = spec.calc;
      const c: IntlNpvComputed = computeIntlNpv(inputs);
      const built = buildIntlNpvSchema(inputs, c);
      const model_answer = buildIntlNpvModelAnswer(inputs, c, p.advice);
      return {
        ...common, lo: 'B5b', schema: built.schema, serialized: built.serialized, model_answer,
        family: { lo: 'B5b', npvIn: inputs, npvC: c, modelAnswer: model_answer },
        computed: [inputs, c], zeroAddlTax: !c.has_additional_home_tax,
        inputNumbers: flattenNumbers(inputs),
      };
    }
    case 'E2b': {
      const { inputs } = spec.calc;
      const c: ForwardMmhCompareComputed = computeForwardMmhCompare(inputs);
      const built = buildForwardMmhCompareSchema(inputs, c);
      const model_answer = buildForwardMmhCompareModelAnswer(inputs, c, p.advice);
      return {
        ...common, lo: 'E2b', schema: built.schema, serialized: built.serialized, model_answer,
        family: { lo: 'E2b', fxIn: inputs, fxC: c },
        computed: [inputs, c],
        compare: { selected: c.comparison.selected_method, all: c.comparison.results.map((m) => m.method) },
        inputNumbers: flattenNumbers(inputs),
      };
    }
    case 'B1a': {
      const { inputs } = spec.calc;
      const c: EnpvComputed = computeEnpv(inputs);
      const built = buildEnpvSchema(inputs, c);
      const model_answer = buildEnpvModelAnswer(inputs, c, p.advice);
      return {
        ...common, lo: 'B1a', schema: built.schema, serialized: built.serialized, model_answer,
        family: { lo: 'B1a', enpvIn: inputs, enpvC: c },
        computed: [inputs, c], inputNumbers: flattenNumbers(inputs),
      };
    }
    case 'E3a': {
      const { inputs } = spec.calc;
      const c: IrFuturesComputed = computeIrFutures(inputs);
      const built = buildIrFuturesSchema(inputs, c);
      const model_answer = buildIrFuturesModelAnswer(inputs, c, p.advice);
      return {
        ...common, lo: 'E3a', schema: built.schema, serialized: built.serialized, model_answer,
        family: { lo: 'E3a', irIn: inputs, irC: c, modelAnswer: model_answer },
        computed: [inputs, c], inputNumbers: flattenNumbers(inputs),
      };
    }
    case 'B4a': {
      const { inputs, currency, debt_value, equity_weight } = spec.calc;
      const c: FcffComputed = computeFcff(inputs);
      const built = buildFcffSchema(inputs, c, currency);
      const model_answer = buildFcffModelAnswer(inputs, c, p.advice, currency);
      return {
        ...common, lo: 'B4a', schema: built.schema, serialized: built.serialized, model_answer,
        family: { lo: 'B4a', fcffC: c, debtValue: debt_value, equityWeight: equity_weight, modelAnswer: model_answer },
        computed: [inputs, c], inputNumbers: flattenNumbers(inputs),
      };
    }
    default: {
      // UNREACHABLE for a well-typed spec — NumericCalcSpec is a closed union, so this is the
      // exhaustiveness check. It exists because a `as never` cast at a call site would otherwise
      // slip an unsupported family past the compiler and out the other side as `undefined`, which
      // the caller would happily insert as a requirement with no schema and no family gates.
      // Throwing is the only safe answer: a family outside the union has no calculator and no
      // family cover.
      //
      // The message names the PAPER as well as the LO, because "B1a" alone is not a family: it is
      // an AFM calculator LO and an SBL governance LO, and an author who reached here by porting
      // an AFM spec to another paper needs to be told which half was wrong.
      const bad = spec.calc as { paper?: string; lo?: string };
      throw new Error(
        `buildNumericRequirement: family "${bad.paper ?? '(no paper)'}:${bad.lo ?? '(no lo)'}" is ` +
        `outside the supported family union [${SUPPORTED_NUMERIC_FAMILIES.map(familyKey).join(', ')}]. ` +
        'It has no calculator and no family gates, so it cannot be authored through this path. ' +
        'Extend NumericCalcSpec (and the family gates) first. If the LO code looks right, check ' +
        'the paper: an LO code is not unique across ACCA papers.',
      );
    }
  }
}

// ═════════════════════════════════════════════════════════════════════════════
// EXHIBITS MUST STATE THE INPUTS — enforced, not assumed
// ═════════════════════════════════════════════════════════════════════════════
//
// WHY THIS IS A GATE AND NOT A CONVENTION. `_reauthor_boundary_drills.ts` could re-author five
// published drills only because their raw inputs were "recovered from each drill's OWN
// context_text, which states them verbatim". That was luck. The irhedge batch had no such
// property, its authoring script was lost, and the result is a published defect that still
// cannot be fixed (P-DB6). An exhibit that states every input makes the row self-describing:
// the DB itself becomes a recovery path, independent of any script surviving.
//
// ── WHAT THIS CHECK PROVES, AND WHAT IT DOES NOT (P-G2) ─────────────────────
// It proves an input VALUE appears somewhere in the exhibit text in a recognisable rendering.
// It does NOT prove the exhibit states it correctly, in the right units, attached to the right
// noun, or only once. Small integers (2, 4, 12) will match almost any prose, so for those it is
// close to vacuous. It is a FLOOR — it catches the input that appears NOWHERE, which is the
// failure that destroys recoverability — and it must not be described as more than that.

/** Every finite number leaf, keyed by dotted path. Arrays are indexed. */
export function flattenNumbers(o: unknown, prefix = ''): Record<string, number> {
  const out: Record<string, number> = {};
  const walk = (v: unknown, path: string): void => {
    if (typeof v === 'number' && Number.isFinite(v)) { out[path] = v; return; }
    if (Array.isArray(v)) { v.forEach((x, i) => walk(x, `${path}[${i}]`)); return; }
    if (v && typeof v === 'object') {
      for (const [k, x] of Object.entries(v as Record<string, unknown>)) walk(x, path ? `${path}.${k}` : k);
    }
  };
  walk(o, prefix);
  return out;
}

/**
 * The renderings an author might plausibly use for a value.
 *
 * EVERY NUMERIC RENDERING MUST ROUND-TRIP: `Number(rendering) === v`. Without that rule
 * `(0.2).toFixed(0)` yields `"0"`, and since "0" occurs in almost any exhibit, a probability of
 * 0.2 would be reported as "stated" by text that never mentions it. The first version of this
 * function did exactly that and the break-mode fixture caught it — a lossy rendering turns the
 * whole check into a rubber stamp, which is worse than not having it.
 *
 * Word forms ("48 million") are added separately because they are not numeric strings and
 * cannot round-trip through Number().
 */
export function renderingsOf(v: number): string[] {
  const r = new Set<string>();
  const addNumeric = (s: string) => { if (Number(s) === v) r.add(s); };

  addNumeric(String(v));
  for (const dp of [0, 1, 2, 3, 4]) addNumeric(v.toFixed(dp));
  // Trailing-zero-stripped forms: 5.60 → 5.6
  for (const s of [...r]) if (s.includes('.')) addNumeric(s.replace(/0+$/, '').replace(/\.$/, ''));

  // Scaled word forms for large round numbers: 48000000 → "48 million" / "48m".
  for (const [div, words] of [[1e6, ['million', 'm']], [1e9, ['billion', 'bn']]] as [number, string[]][]) {
    if (Math.abs(v) >= div && (v / div) % 1 === 0) {
      for (const w of words) { r.add(`${v / div} ${w}`); r.add(`${v / div}${w}`); }
    }
  }
  return [...r].filter((s) => s.length > 0);
}

export interface InputStatementReport {
  ok: boolean;
  missing: { path: string; value: number; tried: string[] }[];
  exempted: { path: string; value: number; reason: string }[];
  checked: number;
}

export function checkExhibitsStateInputs(
  exhibitText: string,
  inputNumbers: Record<string, number>,
  exempt: Record<string, string> = {},
): InputStatementReport {
  // Normalise thousands separators so "48,000,000" matches "48000000".
  const hay = exhibitText.replace(/[,_]/g, '').toLowerCase();
  const hayRaw = exhibitText.toLowerCase();
  const missing: InputStatementReport['missing'] = [];
  const exempted: InputStatementReport['exempted'] = [];
  let checked = 0;

  for (const [path, value] of Object.entries(inputNumbers)) {
    if (path in exempt) { exempted.push({ path, value, reason: exempt[path] }); continue; }
    checked++;
    const tried = renderingsOf(value);
    const found = tried.some((t) => hay.includes(t.replace(/[,_]/g, '').toLowerCase()) || hayRaw.includes(t.toLowerCase()));
    if (!found) missing.push({ path, value, tried });
  }
  return { ok: missing.length === 0, missing, exempted, checked };
}

// ═════════════════════════════════════════════════════════════════════════════
// CASE-LEVEL GATES FOR A STANDALONE CASE
// ═════════════════════════════════════════════════════════════════════════════
//
// `runCaseGates` asserts WHOLE-PAPER shape (1 Section A + 2 Section B). Three of its four gates
// are per-case and carry over unchanged; one is not, and is replaced:
//
//   C1 section-A span      — CONDITIONAL. It iterates Section A cases, so a standalone Section B
//                            case passes vacuously and a standalone Section A case is still bound.
//                            Applied as-is; the conditionality is already in the gate.
//   C2 not-wholly-narrative— UNCHANGED. Per-case by construction, and the reason an AFM Section B
//                            case can never be all-narrative.
//   C3 B+E represented     — REPLACED. It asserts across a whole paper; a single case cannot
//                            satisfy both letters and should not have to. Becomes a CORPUS
//                            invariant: see corpusBandERepresented.
//   C4 PS skill set        — UNCHANGED. Both arms are per-case.

export interface StandaloneGateReport {
  pass: boolean;
  results: Record<string, GateResult>;
}

export function standaloneCaseGates(c: GateCase): StandaloneGateReport {
  const paper = { cases: [c] };
  const results: Record<string, GateResult> = {
    'C1-section-a-span': gateSectionASpan(paper),
    'C2-not-wholly-narrative': gateNotWhollyNarrative(paper),
    'C4-ps-skill-set': gatePsSkillSet(paper),
  };
  return { pass: Object.values(results).every((r) => r.pass), results };
}

/**
 * C3's replacement — a CORPUS invariant, asserted when a case is ADDED.
 *
 * The syllabus rule is that every exam carries questions focused on sections B and E. That is a
 * property of a PAPER, and for a practice library the equivalent property is that the library as
 * a whole can build one: both letters must be reachable across the published AFM cases. Checked
 * at add time so the library cannot drift into being all-B or all-E one case at a time.
 *
 * Takes the lo_codes ALREADY published plus the candidate's, and reports what the union is
 * missing. A library that does not yet reach both is not an error on the case being added — it
 * is a statement about what must be authored next, so the caller decides whether to block.
 */
export function corpusBandERepresented(
  publishedLoCodes: readonly string[],
  candidateLoCodes: readonly string[],
): { pass: boolean; missing: string[]; afterAdd: string[] } {
  const letters = new Set(
    [...publishedLoCodes, ...candidateLoCodes].map((lo) => (lo.charAt(0) || '').toUpperCase()).filter(Boolean),
  );
  const missing = ['B', 'E'].filter((l) => !letters.has(l));
  return { pass: missing.length === 0, missing, afterAdd: [...letters].sort() };
}

// ═════════════════════════════════════════════════════════════════════════════
// SPEC VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

export function validateCaseSpec(spec: AfmCaseSpec): GateResult {
  const v: string[] = [];
  const reqs = [...spec.numeric, ...spec.narrative];

  if (reqs.length === 0) v.push('case has no requirements.');
  if (spec.exhibits.length === 0) v.push('case has no exhibits — an AFM case must state its data.');
  if (!spec.frame.scenario_intro.trim()) v.push('case has no scenario_intro.');

  const orders = reqs.map((r) => r.requirement_order).sort((a, b) => a - b);
  const expected = orders.map((_, i) => i + 1);
  if (JSON.stringify(orders) !== JSON.stringify(expected)) {
    v.push(`requirement_order must be 1..N with no gaps or duplicates; got [${orders.join(', ')}].`);
  }

  const tech = reqs.reduce((a, r) => a + r.marks, 0);
  const total = tech + spec.frame.professional_skills_marks;
  if (total !== spec.frame.total_marks) {
    v.push(`marks do not reconcile: ${tech} technical + ${spec.frame.professional_skills_marks} PS = ${total}, but total_marks is ${spec.frame.total_marks}.`);
  }

  for (const r of reqs) {
    if (r.marks <= 0) v.push(`requirement ${r.requirement_order} has non-positive marks.`);
    if (r.ps_tags.length === 0) v.push(`requirement ${r.requirement_order} has no professional_skill_tags.`);
  }
  return { pass: v.length === 0, violations: v };
}

/** The GateCase view of a spec, for the case-level gates. */
export function toGateCase(spec: AfmCaseSpec): GateCase {
  return {
    section: spec.frame.section,
    anchor_area: spec.frame.anchor_area,
    total_marks: spec.frame.total_marks,
    professional_skills_marks: spec.frame.professional_skills_marks,
    requirements: [
      ...spec.numeric.map((r) => ({
        lo_code: r.calc.lo, marks_guide: r.marks,
        marking_kind: 'calc' as MarkingKind, professional_skill_tags: r.ps_tags,
      })),
      ...spec.narrative.map((r) => ({
        lo_code: r.lo, marks_guide: r.marks,
        marking_kind: 'narrative' as MarkingKind, professional_skill_tags: r.ps_tags,
      })),
    ],
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// THE FAMILY-GATE CEILING
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Every (paper, LO) pair that can be authored with FULL family-gate cover today.
 *
 * ⚠️ THE PAPER IS PART OF THE KEY. A predecessor of this constant was a bare LO-code list
 * (`SUPPORTED_NUMERIC_LOS`), which is DELETED rather than kept alongside: a paper-blind export
 * that reads like a key is exactly what let an SBL LO code match an AFM calculator. Five of the
 * six codes below are also live SBL learning outcomes — see the module header.
 */
export const SUPPORTED_NUMERIC_FAMILIES = [
  { paper: 'AFM', lo: 'B3e' },
  { paper: 'AFM', lo: 'B5b' },
  { paper: 'AFM', lo: 'E2b' },
  { paper: 'AFM', lo: 'B1a' },
  { paper: 'AFM', lo: 'E3a' },
  { paper: 'AFM', lo: 'B4a' },
] as const;

export type SupportedNumericFamily = (typeof SUPPORTED_NUMERIC_FAMILIES)[number];

/** `AFM:B1a` — the display form of a family key. One definition, so a message and a lookup can
 *  never render the pair differently. */
export function familyKey(f: { paper: string; lo: string }): string {
  return `${f.paper}:${f.lo}`;
}

/** What a numeric requirement gets, by (paper, LO). Everything outside the union still gets the
 *  BASE barrier (GATE1–3, P4–P9, GATE 26, GATE 27) — it loses only the family-specific lines, and
 *  it must say so via NO_FAMILY_GATES rather than omitting the argument.
 *
 *  `paper` is typed `AccaPaper`, not `string`, so a caller cannot ask this question without
 *  having resolved a real paper first. When SBL joins `ACCA_PAPERS` every SBL LO correctly
 *  answers "unsupported" here — including the five whose codes collide with an AFM family. */
export function familyGateCoverage(paper: AccaPaper, lo: string): { supported: boolean; note: string } {
  const hit = SUPPORTED_NUMERIC_FAMILIES.some((f) => f.paper === paper && f.lo === lo);
  return hit
    ? { supported: true, note: 'full family-gate cover' }
    : {
        supported: false,
        note: `BASE barrier only (GATE1–3, P4–P9, GATE 26, GATE 27). No family-specific gates ` +
              `exist for ${familyKey({ paper, lo })}, so nothing checks its family conventions — ` +
              'the omission must be declared with NO_FAMILY_GATES and a reason.',
      };
}
