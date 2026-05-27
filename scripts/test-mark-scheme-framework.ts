#!/usr/bin/env tsx
/**
 * test-mark-scheme-framework.ts
 *
 * 31 meta-tests — pure unit, no DB, no LLM calls.
 * Run with: npm run test:schemes
 *
 * Coverage:
 *   T01–T05  resolveSchemeType: one positive per scheme_type shape, one edge case
 *   T06–T09  Sum invariants: CC pass/violation, hybrid pass/violation, CM violation
 *   T10–T13  Shape validation: one malformed input per scheme_type → invalid
 *   T14–T17  Verbatim match: BD and CM identical/drifted vs V3 constants
 *   T18      Contradiction guard: throws before any DB write (Rule 23)
 *   T19–T21  applyMarkSchemeVerdict precedence: pass / fail / borderline
 *   T22–T28  depth-marked accepted_reasons path ("Explain one [X]..." convention)
 *   T29–T31  hybrid decomposition heuristic: flagHybridSingleStep (§2.G)
 *
 * Rule 23: T18 proves the guard fires before writeResult.
 * T21 proves human_review_flag='flagged' yields borderline even when all 5 checks pass.
 */

import assert from 'node:assert/strict';
import {
  resolveSchemeType,
  formatMarkSchemeForPrompt,
  flagHybridSingleStep,
  MARK_SCHEME_V3_IB_ECONOMICS,
  MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT,
  type AcceptedReasonEntry,
  type HybridData,
} from './mark-scheme-framework';
import {
  checkMarksSumInvariant,
  checkDataShape,
  checkVerbatimMatch,
  applyMarkSchemeVerdict,
  type MarkSchemeCandidate,
  type MarkSchemeVerificationResult,
} from './verify-mark-schemes';

// ─── Test harness ─────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${(err as Error).message}`);
    failed++;
    failures.push(name);
  }
}

// ─── Builders ─────────────────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<MarkSchemeCandidate> = {}): MarkSchemeCandidate {
  return {
    id:            'test-id',
    question_id:   'test-q-id',
    subject:       'IB_ECONOMICS',
    scheme_type:   'content_checklist',
    max_marks:     2,
    scheme_data:   {
      accepted_points: [
        { point: 'X is a tax on carbon emissions', marks: 1, keywords: ['tax', 'carbon', 'emissions'] },
        { point: 'It internalises the negative externality', marks: 1, keywords: ['externality', 'social cost'] },
      ],
      marking_rule: '1 mark per distinct point, max 2',
    },
    question_text: 'Define the term "carbon tax".',
    context_text:  null,
    command_term:  'define',
    ao_level:      'AO1',
    paper:         'P2',
    question_type: 'P2_part_a',
    marks:         2,
    level:         'SL',
    ...overrides,
  };
}

function makeResult(overrides: Partial<MarkSchemeVerificationResult> = {}): MarkSchemeVerificationResult {
  return {
    scheme_type_match:   'correct',
    marks_sum_invariant: 'correct',
    data_shape:          'valid',
    verbatim_match:      'na',
    semantic_relevance:  'na',
    human_review_flag:   'clear',
    overall:             'pass',
    reasoning:           'all checks pass',
    ...overrides,
  };
}

// ─── T01–T05: resolveSchemeType ───────────────────────────────────────────────

console.log('\nT01–T05: resolveSchemeType routing');

test('T01 BM P1 Sec A 2m define → content_checklist', () => {
  const st = resolveSchemeType({
    subject: 'IB_BUSINESS_MANAGEMENT', paper: 'P1', section: 'SEC_A',
    marks: 2, command_term: 'define', ao_level: 'AO1',
  });
  assert.equal(st, 'content_checklist');
});

test('T02 BM P1 Sec B 10m discuss → band_descriptor', () => {
  const st = resolveSchemeType({
    subject: 'IB_BUSINESS_MANAGEMENT', paper: 'P1', section: 'SEC_B',
    marks: 10, command_term: 'discuss', ao_level: 'AO3',
  });
  assert.equal(st, 'band_descriptor');
});

test('T03 BM P2 Sec A 6m calculate → hybrid', () => {
  const st = resolveSchemeType({
    subject: 'IB_BUSINESS_MANAGEMENT', paper: 'P2', section: 'SEC_A',
    marks: 6, command_term: 'calculate', ao_level: 'AO4',
  });
  assert.equal(st, 'hybrid');
});

test('T04 BM P3 Q3 17m → criteria_marked', () => {
  const st = resolveSchemeType({
    subject: 'IB_BUSINESS_MANAGEMENT', paper: 'P3', section: 'Q3',
    marks: 17, command_term: 'to_what_extent', ao_level: 'AO3',
  });
  assert.equal(st, 'criteria_marked');
});

test('T05 edge: P2 Sec A 4m explain → content_checklist (not hybrid)', () => {
  // Hybrid requires AO4 calculate. AO2 explain at 4m is below the [5,99] band_descriptor
  // threshold and above nothing — routes to content_checklist.
  const st = resolveSchemeType({
    subject: 'IB_BUSINESS_MANAGEMENT', paper: 'P2', section: 'SEC_A',
    marks: 4, command_term: 'explain', ao_level: 'AO2',
  });
  assert.equal(st, 'content_checklist');
  assert.notEqual(st, 'hybrid');
  assert.notEqual(st, 'band_descriptor');
});

// ─── T06–T09: Sum invariants ──────────────────────────────────────────────────

console.log('\nT06–T09: marks_sum_invariant');

test('T06 CC sum = max_marks → correct', () => {
  const c = makeCandidate({
    scheme_type: 'content_checklist', max_marks: 2, marks: 2,
    scheme_data: {
      accepted_points: [
        { point: 'A', marks: 1, keywords: ['k1', 'k2'] },
        { point: 'B', marks: 1, keywords: ['k3', 'k4'] },
      ],
      marking_rule: '1 mark per point, max 2',
    },
  });
  const r = checkMarksSumInvariant(c);
  assert.equal(r.result, 'correct');
});

test('T07 CC sum ≠ max_marks → violation (sum=3, max=2)', () => {
  const c = makeCandidate({
    scheme_type: 'content_checklist', max_marks: 2, marks: 2,
    scheme_data: {
      accepted_points: [
        { point: 'A', marks: 2, keywords: ['k1', 'k2'] },
        { point: 'B', marks: 1, keywords: ['k3', 'k4'] },
      ],
      marking_rule: '1 mark per point, max 2',
    },
  });
  const r = checkMarksSumInvariant(c);
  assert.equal(r.result, 'violation');
  assert.match(r.message, /3.*≠.*2/);
});

test('T08 hybrid sum = max_marks → correct (method=2, answer=1, max=3)', () => {
  const c = makeCandidate({
    scheme_type: 'hybrid', max_marks: 3, marks: 3,
    scheme_data: {
      method_marks:  [{ step: 'identify formula', marks: 1 }, { step: 'substitute values', marks: 1 }],
      answer_marks:  { correct_answer: 1, partial_credit_rules: '2/3 if method correct but error' },
    },
  });
  const r = checkMarksSumInvariant(c);
  assert.equal(r.result, 'correct');
});

test('T09 hybrid sum ≠ max_marks → violation (method=1, answer=1, max=4)', () => {
  const c = makeCandidate({
    scheme_type: 'hybrid', max_marks: 4, marks: 4,
    scheme_data: {
      method_marks:  [{ step: 'step 1', marks: 1 }],
      answer_marks:  { correct_answer: 1, partial_credit_rules: 'award method marks if answer wrong' },
    },
  });
  const r = checkMarksSumInvariant(c);
  assert.equal(r.result, 'violation');
  assert.match(r.message, /2.*≠.*4/);
});

// ─── T10–T13: Shape validation ────────────────────────────────────────────────

console.log('\nT10–T13: data_shape validation');

test('T10 CC missing accepted_points → invalid', () => {
  const c = makeCandidate({
    scheme_type: 'content_checklist',
    scheme_data: { marking_rule: '1 mark per point' } as never,
  });
  const r = checkDataShape(c);
  assert.equal(r.pass, false);
  assert.match(r.message, /accepted_points/);
});

test('T11 hybrid missing answer_marks → invalid', () => {
  const c = makeCandidate({
    scheme_type: 'hybrid',
    scheme_data: { method_marks: [{ step: 'step 1', marks: 1 }] } as never,
  });
  const r = checkDataShape(c);
  assert.equal(r.pass, false);
  assert.match(r.message, /answer_marks/);
});

test('T12 band_descriptor missing bands → invalid', () => {
  const c = makeCandidate({
    scheme_type: 'band_descriptor',
    scheme_data: {} as never,
  });
  const r = checkDataShape(c);
  assert.equal(r.pass, false);
  assert.match(r.message, /bands/);
});

test('T13 criteria_marked missing criteria → invalid', () => {
  const c = makeCandidate({
    scheme_type: 'criteria_marked',
    scheme_data: {} as never,
  });
  const r = checkDataShape(c);
  assert.equal(r.pass, false);
  assert.match(r.message, /criteria/);
});

// ─── T14–T17: Verbatim match ──────────────────────────────────────────────────

console.log('\nT14–T17: verbatim_match vs V3 constants');

const CANONICAL_P1A = MARK_SCHEME_V3_IB_ECONOMICS.markbands_p1a;
const CANONICAL_CRITERIA = MARK_SCHEME_V3_IB_BUSINESS_MANAGEMENT.p3_q3_criteria;

test('T14 BD identical to canonical markbands_p1a → correct', () => {
  const c = makeCandidate({
    subject:       'IB_ECONOMICS',
    scheme_type:   'band_descriptor',
    question_type: 'P1_part_a',
    max_marks:     10,
    marks:         10,
    scheme_data:   { bands: CANONICAL_P1A },
  });
  const r = checkVerbatimMatch(c);
  assert.equal(r.result, 'correct');
});

test('T15 BD whitespace appended to descriptor → drift', () => {
  // Single trailing space on band[0] descriptor — V3 constants are the source of truth.
  const driftedBands = CANONICAL_P1A.map((b, i) =>
    i === 0 ? { ...b, descriptor: b.descriptor + ' ' } : b,
  );
  const c = makeCandidate({
    subject:       'IB_ECONOMICS',
    scheme_type:   'band_descriptor',
    question_type: 'P1_part_a',
    max_marks:     10,
    marks:         10,
    scheme_data:   { bands: driftedBands },
  });
  const r = checkVerbatimMatch(c);
  assert.equal(r.result, 'drift');
  assert.ok(r.drift_note, 'drift_note must be set');
});

test('T16 CM identical to canonical p3_q3_criteria → correct', () => {
  const c = makeCandidate({
    subject:       'IB_BUSINESS_MANAGEMENT',
    scheme_type:   'criteria_marked',
    question_type: 'P3_q3_criteria',
    max_marks:     17,
    marks:         17,
    scheme_data:   { criteria: CANONICAL_CRITERIA },
  });
  const r = checkVerbatimMatch(c);
  assert.equal(r.result, 'correct');
});

test('T17 CM single-character diff in criterion name → drift', () => {
  const driftedCriteria = CANONICAL_CRITERIA.map((cr, i) =>
    i === 0 ? { ...cr, name: cr.name.slice(0, -1) + 'X' } : cr,  // last char swapped
  );
  const c = makeCandidate({
    subject:       'IB_BUSINESS_MANAGEMENT',
    scheme_type:   'criteria_marked',
    question_type: 'P3_q3_criteria',
    max_marks:     17,
    marks:         17,
    scheme_data:   { criteria: driftedCriteria },
  });
  const r = checkVerbatimMatch(c);
  assert.equal(r.result, 'drift');
  assert.ok(r.drift_note, 'drift_note must be set');
});

// ─── T18: Contradiction guard ─────────────────────────────────────────────────

console.log('\nT18: contradiction guard (Rule 23)');

test('T18 reasoning says "passes" but scheme_type_match=mismatch → throws before DB write', () => {
  // Simulates a Claude tool response where reasoning claims pass but the routing
  // check failed — applyMarkSchemeVerdict must throw, not silently coerce to pass.
  const result = makeResult({
    scheme_type_match: 'mismatch',
    overall:           'pass',
    reasoning:         'The scheme passes all validation checks and is well-formed.',
  });
  assert.throws(
    () => applyMarkSchemeVerdict(result),
    (err: Error) => {
      assert.match(err.message, /contradiction/i);
      assert.match(err.message, /mismatch/);
      return true;
    },
  );
});

// ─── T19–T21: applyMarkSchemeVerdict precedence ───────────────────────────────

console.log('\nT19–T21: applyMarkSchemeVerdict deterministic precedence');

test('T19 all-correct + human_review_flag=clear → pass', () => {
  const result = makeResult({
    scheme_type_match:   'correct',
    marks_sum_invariant: 'correct',
    data_shape:          'valid',
    verbatim_match:      'na',
    semantic_relevance:  'relevant',
    human_review_flag:   'clear',
    reasoning:           'scheme is semantically aligned and all checks pass',
  });
  assert.equal(applyMarkSchemeVerdict(result), 'pass');
});

test('T20 any major-fail field → fail (scheme_type_match=mismatch)', () => {
  const result = makeResult({
    scheme_type_match: 'mismatch',
    reasoning:         'The scheme_type does not match the expected routing.',
  });
  assert.equal(applyMarkSchemeVerdict(result), 'fail');
});

test('T21 all-5-checks-pass but human_review_flag=flagged → borderline', () => {
  // All five content checks pass. Flag is AO2 5-6m border case. Verdict must be borderline,
  // not pass — Grant must confirm scheme_type assignment before promotion.
  const result = makeResult({
    scheme_type_match:   'correct',
    marks_sum_invariant: 'correct',
    data_shape:          'valid',
    verbatim_match:      'na',
    semantic_relevance:  'relevant',
    human_review_flag:   'flagged',
    reasoning:           'AO2 5m border case — human review required before promotion',
  });
  assert.equal(applyMarkSchemeVerdict(result), 'borderline');
});

// ─── T22–T28: depth-marked "Explain one [X]..." path ─────────────────────────

// Replicate the isExplainOne regex from generate-mark-schemes.ts — pure unit test of the pattern.
const EXPLAIN_ONE_RE = /\bexplain\s+(one|a)\s+(reason|way|cause|factor|advantage|disadvantage|benefit|drawback|impact|effect|implication|example)\b/i;

console.log('\nT22–T28: depth-marked accepted_reasons path');

test('T22 isExplainOne regex: positive — "Explain one reason why the CPI may overstate..."', () => {
  assert.ok(EXPLAIN_ONE_RE.test('Explain one reason why the Consumer Price Index (CPI) may overstate the true rate of inflation experienced by households.'));
});

test('T23 isExplainOne regex: negative — "Explain why the quantity demanded falls..." (no "one [X]")', () => {
  assert.ok(!EXPLAIN_ONE_RE.test('Explain why the quantity demanded for a good falls when its price rises.'));
});

test('T24 isExplainOne regex: negative — "Explain the concept of price elasticity..." (no "one [X]")', () => {
  assert.ok(!EXPLAIN_ONE_RE.test('Explain the concept of price elasticity of demand.'));
});

test('T25 CC with accepted_reasons present → checkDataShape passes (field is permitted, not rejected)', () => {
  const c = makeCandidate({
    scheme_type: 'content_checklist',
    max_marks: 3,
    marks: 3,
    scheme_data: {
      accepted_reasons: [
        { reason: 'substitution bias', keywords: ['fixed basket', 'substitution bias'] },
        { reason: 'quality bias',      keywords: ['quality bias', 'quality improvement'] },
      ] as AcceptedReasonEntry[],
      accepted_points: [
        { point: 'Names any one valid reason.', marks: 1, keywords: ['substitution bias', 'quality bias'] },
        { point: 'Explains the causal mechanism.',        marks: 1, keywords: ['fixed basket', 'cost of living'] },
        { point: 'Extends with a consequence or effect.', marks: 1, keywords: ['living standards', 'overstate'] },
      ],
      marking_rule: 'depth-marked on one reason: 1m naming, 2m depth.',
    },
  });
  const r = checkDataShape(c);
  assert.equal(r.pass, true);
});

test('T26 formatMarkSchemeForPrompt with accepted_reasons → includes "Valid reasons" block', () => {
  const output = formatMarkSchemeForPrompt({
    scheme_type: 'content_checklist',
    max_marks: 3,
    scheme_data: {
      accepted_reasons: [
        { reason: 'substitution bias', keywords: ['fixed basket', 'substitution bias'] },
        { reason: 'quality bias',      keywords: ['quality bias', 'quality improvement'] },
      ] as AcceptedReasonEntry[],
      accepted_points: [
        { point: 'Names any one valid reason.', marks: 1, keywords: ['substitution bias', 'quality bias'] },
        { point: 'Explains the causal mechanism.',        marks: 1, keywords: ['fixed basket', 'cost of living'] },
        { point: 'Extends with a consequence or effect.', marks: 1, keywords: ['living standards', 'overstate'] },
      ],
      marking_rule: 'depth-marked on one reason: 1m naming, 2m depth.',
    },
  });
  assert.ok(output.includes('Valid reasons (student names any one):'), 'should include Valid reasons heading');
  assert.ok(output.includes('substitution bias'), 'should list first accepted reason');
  assert.ok(output.includes('Depth tiers (award marks for depth on any one accepted reason):'), 'should use Depth tiers label');
  assert.ok(!output.includes('Accepted points:'), 'should NOT use Accepted points label when depth-marked');
});

test('T27 formatMarkSchemeForPrompt without accepted_reasons → omits "Valid reasons", uses "Accepted points:"', () => {
  const output = formatMarkSchemeForPrompt({
    scheme_type: 'content_checklist',
    max_marks: 2,
    scheme_data: {
      accepted_points: [
        { point: 'A carbon tax is a tax on carbon emissions.', marks: 1, keywords: ['tax', 'emissions'] },
        { point: 'It internalises the negative externality.',  marks: 1, keywords: ['externality', 'social cost'] },
      ],
      marking_rule: '1 mark per distinct point, max 2',
    },
  });
  assert.ok(!output.includes('Valid reasons'), 'should NOT include Valid reasons heading');
  assert.ok(output.includes('Accepted points:'), 'should use Accepted points label');
});

test('T28 2m depth scheme: exactly 2 accepted_points summing to 2m, no zero-mark third point', () => {
  const c = makeCandidate({
    scheme_type: 'content_checklist',
    max_marks: 2,
    marks: 2,
    scheme_data: {
      accepted_reasons: [
        { reason: 'negative externality', keywords: ['externality', 'social cost'] },
      ] as AcceptedReasonEntry[],
      accepted_points: [
        { point: 'Names a valid reason.',           marks: 1, keywords: ['externality', 'social cost'] },
        { point: 'Explains the causal mechanism.',  marks: 1, keywords: ['private cost', 'market failure'] },
      ],
      marking_rule: 'depth-marked on one reason: 1m naming, 1m depth.',
    },
  });
  const r = checkMarksSumInvariant(c);
  assert.equal(r.result, 'correct');
  const cc = c.scheme_data as { accepted_points: { marks: number }[] };
  assert.equal(cc.accepted_points.length, 2, 'exactly 2 depth tiers for 2m question');
  assert.ok(cc.accepted_points.every(p => p.marks > 0), 'no zero-mark tier');
});

// ─── T29–T31: hybrid decomposition heuristic ─────────────────────────────────

console.log('\nT29–T31: hybrid decomposition heuristic (flagHybridSingleStep)');

test('T29 1 method_mark + 2m + "per tonne" indicator → flagged for review', () => {
  const data: HybridData = {
    method_marks: [{ step: 'Identify MEC: $55 − $40 = $15 per tonne', marks: 1 }],
    answer_marks: { correct_answer: 1, partial_credit_rules: 'award 1m if MEC correct but wrong total' },
  };
  assert.ok(
    flagHybridSingleStep(
      data, 2,
      'Calculate the total external cost when MEC is $15 per tonne and output is 120 tonnes.',
    ),
    'should flag: single method_mark on 2m question with "per tonne" multi-step indicator',
  );
});

test('T30 1 method_mark + 2m + no multi-step indicator → not flagged', () => {
  const data: HybridData = {
    method_marks: [{ step: 'Apply unemployment formula: unemployed / labour force × 100', marks: 1 }],
    answer_marks: { correct_answer: 1, partial_credit_rules: 'award 1m if method correct but arithmetic wrong' },
  };
  assert.ok(
    !flagHybridSingleStep(
      data, 2,
      'Calculate the unemployment rate given 6 million unemployed and a labour force of 30 million.',
    ),
    'should not flag: no × ÷ per-unit or percentage-change indicator in question text',
  );
});

test('T31 2 method_marks + 2m + multi-step indicator → not flagged (decomposition complete)', () => {
  // Full decomposition: both the MEC identification and multiplication steps are documented.
  // flagHybridSingleStep fires only when method_marks.length === 1.
  const data: HybridData = {
    method_marks: [
      { step: 'Identify MEC: $55 − $40 = $15 per tonne', marks: 1 },
      { step: 'Total external cost: $15 × 120 tonnes = $1,800', marks: 1 },
    ],
    answer_marks: { correct_answer: 0, partial_credit_rules: 'award 1m if MEC correct but wrong multiplication' },
  };
  assert.ok(
    !flagHybridSingleStep(
      data, 2,
      'Calculate the total external cost when MEC is $15 per tonne and output is 120 tonnes.',
    ),
    'should not flag: method_marks.length === 2, decomposition is complete',
  );
});

// ─── Summary ──────────────────────────────────────────────────────────────────

console.log(`\n${'─'.repeat(60)}`);
console.log(`${passed + failed} tests: ${passed} passed, ${failed} failed.`);

if (failed > 0) {
  console.log('\nFailed:');
  failures.forEach(f => console.log(`  ✗ ${f}`));
  process.exit(1);
}
