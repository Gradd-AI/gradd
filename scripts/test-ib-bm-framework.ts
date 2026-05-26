#!/usr/bin/env tsx
/**
 * scripts/test-ib-bm-framework.ts
 *
 * Standalone meta-tests for IB_BM_V3 framework constants + deterministic
 * verdict function. Rule 23: every verifier has test cases that include
 * intentionally inconsistent inputs to confirm decision precedence holds.
 *
 * Run: npx tsx scripts/test-ib-bm-framework.ts
 * Exit code 0 = all passed; 1 = one or more failed.
 */

import assert from 'node:assert/strict';
import { validateBMQuestion, applyBMVerdict } from './verify-seed-questions';

// ── Minimal test harness ──────────────────────────────────────────────────────

type TestFn = () => void | Promise<void>;
const tests: Array<{ label: string; fn: TestFn }> = [];

function test(label: string, fn: TestFn): void {
  tests.push({ label, fn });
}

// ── Test cases (a–k) ─────────────────────────────────────────────────────────

// a. AO1 topic + AO3 command term ("Evaluate") → fail [p.42 AO progression rule]
test('a. AO1 topic + AO3 command term (Evaluate) → fail', () => {
  const violations = validateBMQuestion({
    command_term:   'evaluate',
    ao_level:       'AO3',
    paper:          'P1',
    section:        'SEC_B',
    marks:          10,
    level:          'SL',
    topic_ao_level: 'AO1',
  });
  assert.ok(violations.length > 0, 'expected at least one violation');
  assert.ok(
    violations.some(v => v.rule === 'ao_progression'),
    `expected ao_progression violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// b. P1 Sec A question tagged AO3 → fail [p.19 matrix: AO3 absent from P1 Sec A]
test('b. P1 Sec A question tagged AO3 → fail', () => {
  const violations = validateBMQuestion({
    command_term: 'discuss',
    ao_level:     'AO3',
    paper:        'P1',
    section:      'SEC_A',
    marks:        10,
    level:        'SL',
  });
  assert.ok(
    violations.some(v => v.rule === 'ao3_absent_sec_a'),
    `expected ao3_absent_sec_a violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// c. "Calculate" tagged AO2 → fail (it is AO4) [pp.67–68]
test('c. "Calculate" tagged AO2 → fail (it is AO4)', () => {
  const violations = validateBMQuestion({
    command_term: 'calculate',
    ao_level:     'AO2',
    paper:        'P2',
    section:      'SEC_A',
    marks:        6,
    level:        'SL',
  });
  assert.ok(
    violations.some(v => v.rule === 'ao_alignment'),
    `expected ao_alignment violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
  const v = violations.find(vv => vv.rule === 'ao_alignment')!;
  assert.ok(v.message.includes('AO4'), `violation message should reference AO4; got: "${v.message}"`);
});

// d. "Comment" tagged AO3 → fail (it is AO2 in BM — common training-data drift) [pp.67–68]
test('d. "Comment" tagged AO3 → fail (it is AO2 in BM)', () => {
  const violations = validateBMQuestion({
    command_term: 'comment',
    ao_level:     'AO3',
    paper:        'P2',
    section:      'SEC_B',  // SEC_B so only the AO alignment rule fires, not AO3-in-sec-a
    marks:        4,
    level:        'SL',
  });
  assert.ok(
    violations.some(v => v.rule === 'ao_alignment'),
    `expected ao_alignment violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
  const v = violations.find(vv => vv.rule === 'ao_alignment')!;
  assert.ok(v.message.includes('AO2'), `violation message should reference AO2; got: "${v.message}"`);
});

// e. P3 Q3 with 20 marks → fail (Q3 = 17) [pp.48–49: A(4)+B(4)+C(6)+D(3)=17]
test('e. P3 Q3 with 20 marks → fail (Q3 = 17)', () => {
  const violations = validateBMQuestion({
    command_term: 'recommend',
    ao_level:     'AO3',
    paper:        'P3',
    section:      'Q3',
    marks:        20,
    level:        'HL',
  });
  assert.ok(
    violations.some(v => v.rule === 'p3_q3_marks'),
    `expected p3_q3_marks violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// f. Contradiction: reasoning implies "pass" + criteria has major-fail → throws [Rule 23b]
test('f. Contradiction: reasoning="passes" + criteria major-fail → throws', () => {
  assert.throws(
    () => applyBMVerdict({
      syllabus_match:   'in_syllabus',
      command_term_fit: 'inappropriate',
      ao_alignment:     'correct',
      paper_fit:        'correct',
      factual_accuracy: 'accurate',
      overall:          'pass',
      reasoning:        'This question passes all criteria and is well-formed.',
    }),
    /contradiction/i,
    'expected contradiction error to be thrown',
  );
});

// g. SL question targeting HL-only sub-topic 3.9 (Budgets) → fail [pp.21–22]
test('g. SL question targeting HL-only sub-topic 3.9 (Budgets) → fail', () => {
  const violations = validateBMQuestion({
    command_term:  'explain',
    ao_level:      'AO2',
    paper:         'P2',
    section:       'SEC_A',
    marks:         6,
    level:         'SL',
    subtopic_code: '3.9',
  });
  assert.ok(
    violations.some(v => v.rule === 'sl_hl_only_topic'),
    `expected sl_hl_only_topic violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// h. P1 question requiring HL extension content → fail [p.41: P1 excludes HL extension]
test('h. P1 question requiring HL extension content → fail', () => {
  const violations = validateBMQuestion({
    command_term:  'explain',
    ao_level:      'AO2',
    paper:         'P1',
    section:       'SEC_A',
    marks:         6,
    level:         'HL',   // HL student — still fails because P1 excludes HL extension regardless
    subtopic_code: '5.3',  // 5.3 = Lean production and quality management (HL-only)
  });
  assert.ok(
    violations.some(v => v.rule === 'p1_no_hl_extension'),
    `expected p1_no_hl_extension violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// i. VALID: SL P1 Sec A AO2 Explain → pass
test('i. VALID: SL P1 Sec A AO2 Explain → pass', () => {
  const violations = validateBMQuestion({
    command_term: 'explain',
    ao_level:     'AO2',
    paper:        'P1',
    section:      'SEC_A',
    marks:        6,
    level:        'SL',
  });
  assert.equal(
    violations.length,
    0,
    `expected no violations; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// j. VALID: HL P3 Q3 17-mark Recommend → pass
test('j. VALID: HL P3 Q3 17-mark Recommend → pass', () => {
  const violations = validateBMQuestion({
    command_term: 'recommend',
    ao_level:     'AO3',
    paper:        'P3',
    section:      'Q3',
    marks:        17,
    level:        'HL',
  });
  assert.equal(
    violations.length,
    0,
    `expected no violations; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// k. VALID: SL P2 Sec B 10-mark "To what extent" → pass
test('k. VALID: SL P2 Sec B 10-mark "To what extent" → pass', () => {
  const violations = validateBMQuestion({
    command_term: 'to_what_extent',
    ao_level:     'AO3',
    paper:        'P2',
    section:      'SEC_B',
    marks:        10,
    level:        'SL',
  });
  assert.equal(
    violations.length,
    0,
    `expected no violations; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// l. Silent recompute: Claude submits 'fail' with only wrong_level → borderline + console.warn
test('l. Silent recompute: Claude submits fail (wrong_level only) → borderline + console.warn', () => {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };

  let verdict: string;
  try {
    verdict = applyBMVerdict({
      syllabus_match:   'in_syllabus',
      command_term_fit: 'correct',
      ao_alignment:     'wrong_level',  // minor — not a major-fail trigger
      paper_fit:        'correct',
      factual_accuracy: 'accurate',
      overall:          'fail',         // Claude submitted fail despite no major-fail criterion
      reasoning:        'All five criteria are actually met, so the overall verdict must be pass.',
    });
  } finally {
    console.warn = origWarn;
  }

  assert.equal(verdict, 'borderline', `expected borderline after recompute; got "${verdict}"`);
  assert.ok(warnings.length > 0, 'expected console.warn to be called');
  assert.ok(
    warnings.some(w => w.includes('[applyBMVerdict]') && w.includes('fail') && w.includes('borderline')),
    `expected reclassification warning; got: ${warnings.join(' | ')}`,
  );
});

// m. P3 Q1 lacking human-need framing → p3_q1_human_need [p.47]
test('m. P3 Q1 without human-need signal → p3_q1_human_need violation', () => {
  const violations = validateBMQuestion({
    command_term:  'state',
    ao_level:      'AO1',
    paper:         'P3',
    section:       'Q1',
    marks:         2,
    level:         'HL',
    question_text: 'State the main purpose of FoodFuture Ltd.',
  });
  assert.ok(
    violations.some(v => v.rule === 'p3_q1_human_need'),
    `expected p3_q1_human_need violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// n. "State" command + ratio calculation question → state_define_calculate_mismatch [p.67]
test('n. "State" + ratio question → state_define_calculate_mismatch violation', () => {
  const violations = validateBMQuestion({
    command_term:  'state',
    ao_level:      'AO1',
    paper:         'P2',
    section:       'SEC_A',
    marks:         2,
    level:         'SL',
    question_text: 'State the current ratio for BrightCo using the data provided.',
  });
  assert.ok(
    violations.some(v => v.rule === 'state_define_calculate_mismatch'),
    `expected state_define_calculate_mismatch violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// o. SL question referencing NPV → sl_hl_only_method [p.30]
test('o. SL question referencing NPV → sl_hl_only_method violation', () => {
  const violations = validateBMQuestion({
    command_term:  'calculate',
    ao_level:      'AO4',
    paper:         'P2',
    section:       'SEC_A',
    marks:         6,
    level:         'SL',
    question_text: 'Calculate the NPV of the investment using the discount rates in Table 2.',
  });
  assert.ok(
    violations.some(v => v.rule === 'sl_hl_only_method'),
    `expected sl_hl_only_method violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// p. AO3 command term on AO2-max sub-topic 1.4 (Stakeholders) → subtopic_max_ao_exceeded [pp.29–35]
test('p. AO3 "evaluate" on AO2-max sub-topic 1.4 → subtopic_max_ao_exceeded violation', () => {
  const violations = validateBMQuestion({
    command_term:  'evaluate',
    ao_level:      'AO3',
    paper:         'P1',
    section:       'SEC_B',
    marks:         10,
    level:         'SL',
    subtopic_code: '1.4',
  });
  assert.ok(
    violations.some(v => v.rule === 'subtopic_max_ao_exceeded'),
    `expected subtopic_max_ao_exceeded violation; got: ${violations.map(v => v.rule).join(', ')}`,
  );
});

// q. Stimulus contradiction: factual_accuracy=major_error + overall=borderline →
//    applyBMVerdict reclassifies to fail + console.warn [Rule 5 verdict path]
test('q. Stimulus contradiction: borderline + major_error → reclassified to fail + console.warn', () => {
  const warnings: string[] = [];
  const origWarn = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args.map(String).join(' ')); };

  let verdict: string;
  try {
    verdict = applyBMVerdict({
      syllabus_match:   'in_syllabus',
      command_term_fit: 'correct',
      ao_alignment:     'correct',
      paper_fit:        'correct',
      factual_accuracy: 'major_error',
      overall:          'borderline',  // Claude under-classified
      reasoning:        'The stimulus defines CPM as "$25 per 1,000 viewers" but also states "$1,000 reaches 1,000 viewers", producing contradictory numerical answers from the same inputs.',
    });
  } finally {
    console.warn = origWarn;
  }

  assert.equal(verdict, 'fail', `expected fail after reclassification; got "${verdict}"`);
  assert.ok(warnings.length > 0, 'expected console.warn to be called for reclassification');
  assert.ok(
    warnings.some(w => w.includes('[applyBMVerdict]') && w.includes('borderline') && w.includes('fail')),
    `expected reclassification warning; got: ${warnings.join(' | ')}`,
  );
});

// ── Runner ────────────────────────────────────────────────────────────────────

async function run(): Promise<void> {
  let passed = 0;
  let failed = 0;

  for (const { label, fn } of tests) {
    try {
      await fn();
      console.log(`PASS [${label}]`);
      passed++;
    } catch (err) {
      const reason = err instanceof assert.AssertionError
        ? err.message
        : err instanceof Error ? err.message : String(err);
      console.log(`FAIL [${label}] — ${reason}`);
      failed++;
    }
  }

  console.log(`\n${passed + failed} tests: ${passed} passed, ${failed} failed`);
  process.exit(failed > 0 ? 1 : 0);
}

run();
