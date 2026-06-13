import assert from 'node:assert/strict';
import { stripSignals } from './signal-parser';

type Check = (result: string) => void;
const tests: Array<{ name: string; input: string; check: Check }> = [];

function test(name: string, input: string, check: Check) {
  tests.push({ name, input, check });
}

function noSignals(result: string) {
  const leak = (label: string, re: RegExp) => {
    if (re.test(result)) throw new Error(`${label} leaked in: ${JSON.stringify(result)}`);
  };
  leak('LESSON_COMPLETE',   /\[LESSON_COMPLETE:/i);
  leak('LESSON_INCOMPLETE', /\[LESSON_INCOMPLETE:/i);
  leak('UNIT_COMPLETE',     /\[UNIT_COMPLETE:/i);
  leak('SESSION_SUMMARY',   /\[SESSION_SUMMARY:/i);
  leak('WEAK_AREA_FLAG',    /\[WEAK_AREA_FLAG:/i);
  leak('TEACH_BACK',        /\[TEACH_BACK:/i);
  leak('BURN_WALL',         /\[BURN_WALL\]/i);
  leak('DIAGRAM',           /\[DIAGRAM:/i);
  leak('DIAGRAM_DYNAMIC',   /\[DIAGRAM_DYNAMIC:/i);
}

// ── Test cases ────────────────────────────────────────────────────────────────

test('clean text passes through unchanged',
  'Great work on that question! The key insight is the price mechanism.',
  result => {
    assert.equal(result, 'Great work on that question! The key insight is the price mechanism.');
  }
);

test('LESSON_COMPLETE stripped, surrounding prose preserved',
  [
    "Let's recap what we covered today.",
    '[LESSON_COMPLETE: IB_ECON_2.6_L1 | weak_concepts:NONE | apply_scores:4/5,4/5,5/5 | next_lesson:IB_ECON_2.6_L2]',
    '',
    "You're ready for the next lesson!",
  ].join('\n'),
  result => {
    noSignals(result);
    assert.match(result, /recap what we covered/);
    assert.match(result, /ready for the next lesson/);
    assert.doesNotMatch(result, /IB_ECON_2\.6_L1/);
  }
);

test('LESSON_INCOMPLETE stripped',
  'We ran out of time today.\n[LESSON_INCOMPLETE: IB_ECON_3.2_L1 | last_concept_completed:AD shifts | resume_from:AS curve]\nSee you next session!',
  result => {
    noSignals(result);
    assert.match(result, /ran out of time/);
    assert.match(result, /See you next session/);
    assert.doesNotMatch(result, /AD shifts/);
  }
);

test('UNIT_COMPLETE stripped',
  'Unit complete!\n[UNIT_COMPLETE: IB_ECON_U2 | checkpoint_score: 8/10 | weak_topics_flagged: elasticity, externalities | revision_sessions_inserted: 2]\nOnward!',
  result => {
    noSignals(result);
    assert.match(result, /Unit complete/);
    assert.match(result, /Onward/);
  }
);

test('SESSION_SUMMARY stripped (complex pipe-delimited)',
  [
    '[SESSION_SUMMARY: session:3 | type:LESSON | lesson:IB_ECON_2.6_L1 | concepts_covered:PED definition,arc method | lesson_complete:FALSE | weak_flags_this_session:1 | apply_scores:4/5 | session_flag:NONE | next_action:CONTINUE_LESSON]',
    '',
    'Great session today.',
  ].join('\n'),
  result => {
    noSignals(result);
    assert.match(result, /Great session today/);
    assert.doesNotMatch(result, /session_flag/);
    assert.doesNotMatch(result, /CONTINUE_LESSON/);
  }
);

test('WEAK_AREA_FLAG JSON stripped — no JSON fragment leak',
  [
    'Good effort — one concept needs more work.',
    '[WEAK_AREA_FLAG: { "topic": "Elasticity", "lesson_code": "IB_ECON_2.6_L1", "concept": "calculating PED", "severity": "moderate" }]',
    '',
    "Let's continue.",
  ].join('\n'),
  result => {
    noSignals(result);
    assert.match(result, /Good effort/);
    assert.match(result, /Let's continue/);
    assert.doesNotMatch(result, /lesson_code/);
    assert.doesNotMatch(result, /severity/);
    assert.doesNotMatch(result, /\{/);
    assert.doesNotMatch(result, /\}/);
  }
);

test('WEAK_AREA_FLAG with value containing } (brace-counting robustness)',
  // A pathological payload where a string value contains a closing brace
  '[WEAK_AREA_FLAG: { "topic": "test}", "lesson_code": "IB_BM_1.1_L1", "concept": "tricky}", "severity": "low" }]\nClean text.',
  result => {
    noSignals(result);
    assert.match(result, /Clean text/);
    assert.doesNotMatch(result, /\{/);
  }
);

test('TEACH_BACK JSON stripped — no JSON fragment leak',
  [
    'Before we move on, explain this back to me.',
    '[TEACH_BACK: { "lesson_code": "IB_BM_2.4_L1", "concept": "Maslow hierarchy of needs" }]',
    '',
    'Take your time.',
  ].join('\n'),
  result => {
    noSignals(result);
    assert.match(result, /explain this back/);
    assert.match(result, /Take your time/);
    assert.doesNotMatch(result, /lesson_code/);
    assert.doesNotMatch(result, /\{/);
  }
);

test('BURN_WALL stripped',
  "You've hit the session limit for today.\n[BURN_WALL]\n\nSee you tomorrow!",
  result => {
    noSignals(result);
    assert.match(result, /session limit/);
    assert.match(result, /See you tomorrow/);
  }
);

test('DIAGRAM token stripped',
  "Here's the supply and demand diagram:\n[DIAGRAM: ECON_SUPPLY_DEMAND]\n\nNotice how equilibrium is reached.",
  result => {
    noSignals(result);
    assert.match(result, /supply and demand diagram/);
    assert.match(result, /equilibrium is reached/);
  }
);

test('DIAGRAM_DYNAMIC stripped',
  "Let me illustrate:\n[DIAGRAM_DYNAMIC: draw a PPC curve shifting outward]\n\nThis shows economic growth.",
  result => {
    noSignals(result);
    assert.match(result, /illustrate/);
    assert.match(result, /economic growth/);
  }
);

test('DIAGRAM_DYNAMIC alone — no "_DYNAMIC:" or "]" fragment left (adversarial)',
  '[DIAGRAM_DYNAMIC: a flowchart of supply and demand]',
  result => {
    noSignals(result);
    assert.doesNotMatch(result, /DYNAMIC/, 'DYNAMIC fragment leaked');
    assert.doesNotMatch(result, /\]/, 'stray ] fragment leaked');
    assert.equal(result, '');
  }
);

test('DIAGRAM and DIAGRAM_DYNAMIC both in same message — both fully stripped',
  'Here is a diagram:\n[DIAGRAM: ECON_SUPPLY_DEMAND]\nAnd a dynamic one:\n[DIAGRAM_DYNAMIC: a flowchart showing supply shifting right, demand fixed, new equilibrium]\nText after.',
  result => {
    noSignals(result);
    assert.match(result, /Here is a diagram/);
    assert.match(result, /Text after/);
    assert.doesNotMatch(result, /ECON_SUPPLY_DEMAND/);
    assert.doesNotMatch(result, /DYNAMIC/);
    assert.doesNotMatch(result, /flowchart/);
  }
);

test('multiple mixed signals in one realistic assistant turn',
  [
    "Excellent — you've nailed this lesson!",
    '',
    '[LESSON_COMPLETE: IB_BM_1.3_L2 | weak_concepts:vision vs mission | apply_scores:3/5,5/5 | next_lesson:IB_BM_1.4_L1]',
    '[WEAK_AREA_FLAG: { "topic": "Objectives", "lesson_code": "IB_BM_1.3_L2", "concept": "difference between vision and mission statements", "severity": "moderate" }]',
    '[SESSION_SUMMARY: session:5 | type:LESSON | lesson:IB_BM_1.3_L2 | concepts_covered:mission,vision,objectives | lesson_complete:TRUE | weak_flags_this_session:1 | apply_scores:3/5,5/5 | session_flag:NONE | next_action:ADVANCE_LESSON]',
    '',
    'See you in the next lesson!',
  ].join('\n'),
  result => {
    noSignals(result);
    assert.match(result, /Excellent/);
    assert.match(result, /See you in the next lesson/);
    assert.doesNotMatch(result, /IB_BM_1\.3_L2/);
    assert.doesNotMatch(result, /lesson_code/);
    assert.doesNotMatch(result, /\{/);
    assert.doesNotMatch(result, /\n{3,}/, 'more than 2 consecutive blank lines');
  }
);

test('two consecutive WEAK_AREA_FLAG tokens both stripped',
  [
    'Two weak areas noted.',
    '[WEAK_AREA_FLAG: { "topic": "Supply", "lesson_code": "IB_ECON_2.2_L1", "concept": "supply shifters", "severity": "moderate" }]',
    '[WEAK_AREA_FLAG: { "topic": "Demand", "lesson_code": "IB_ECON_2.1_L1", "concept": "demand shifters", "severity": "low" }]',
    'Keep practising.',
  ].join('\n'),
  result => {
    noSignals(result);
    assert.match(result, /Two weak areas/);
    assert.match(result, /Keep practising/);
    assert.doesNotMatch(result, /supply shifters/);
    assert.doesNotMatch(result, /demand shifters/);
  }
);

test('collapses 3+ blank lines to 2',
  'Line one.\n\n\n\n\nLine two.',
  result => {
    assert.doesNotMatch(result, /\n{3,}/);
    assert.match(result, /Line one/);
    assert.match(result, /Line two/);
  }
);

test('SESSION_OPEN stripped entirely — pure bootstrap turn becomes empty (hidden)',
  '[SESSION_OPEN] Begin the session now. Teach IB_BM_029 from the start.',
  result => {
    assert.equal(result, '', `expected empty string, got: ${JSON.stringify(result)}`);
  }
);

test('SESSION_OPEN stripped — no "[SESSION_OPEN]" bracket or lesson code remains',
  '[SESSION_OPEN] Begin the session now. Teach IB_ECON_2.6_L1 from the start.',
  result => {
    assert.doesNotMatch(result, /SESSION_OPEN/, 'SESSION_OPEN token leaked');
    assert.doesNotMatch(result, /IB_ECON_2\.6_L1/, 'lesson code from bootstrap leaked');
    assert.equal(result, '');
  }
);

test('idempotent — already-clean text unaffected',
  'This is clean teaching prose with no signals at all.',
  result => {
    assert.equal(result, 'This is clean teaching prose with no signals at all.');
    // Run again — must be identical
    assert.equal(stripSignals(result), result);
  }
);

// ── Runner ────────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
for (const { name, input, check } of tests) {
  try {
    const result = stripSignals(input);
    check(result);
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ✗ ${name}`);
    console.error(`    ${msg}`);
    failed++;
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
