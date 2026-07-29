// scripts/test-marking-json-extract.ts
// Fixtures for extractJsonBlock (lib/acca/case-marking.ts). PURE — no DB, no model, no network.
// Run: npm run test:marking-json-extract
//
// The strict parse this replaces required the response to BEGIN with JSON. Measured 2026-07-28
// on a per-requirement shape: the model prefaced valid JSON with its own reasoning on 20 of
// ~50 calls and every one was discarded. These fixtures pin the shapes we must survive AND the
// shapes that must still fail — a "repair anything" extractor would be worse than the bug.

import { extractJsonBlock } from '../lib/acca/case-marking';

let pass = 0, fail = 0;
function ok(label: string, cond: boolean, detail = '') {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ' — ' + detail : ''}`); }
}
const parses = (raw: string) => {
  const b = extractJsonBlock(raw);
  if (b === null) return null;
  try { return JSON.parse(b); } catch { return 'UNPARSEABLE'; }
};

const OBJ = '{ "index": 1, "band": "competent", "feedback": "Missed the unexpired basis." }';
const ARR = '[{ "index": 1, "band": "strong", "feedback": "Good." }, { "index": 2, "band": "weak", "feedback": "Thin." }]';

console.log('\n-- must SUCCEED --');
ok('bare object', JSON.stringify(parses(OBJ)) === JSON.stringify(JSON.parse(OBJ)));
ok('bare array', Array.isArray(parses(ARR)) && (parses(ARR) as unknown[]).length === 2);

// 1. leading prose — the measured production failure
const PROSE = `The candidate correctly identifies 96 contracts and the sell direction.\n\nHowever, the basis is omitted.\n\n${OBJ}`;
ok('leading prose then object', (parses(PROSE) as { band: string })?.band === 'competent');

// 2. fenced
ok('fenced object', (parses('```json\n' + OBJ + '\n```') as { band: string })?.band === 'competent');
ok('fenced array', Array.isArray(parses('```\n' + ARR + '\n```')));

// 3. fenced WITH leading prose
ok('prose then fenced object',
  (parses(`Here is my assessment.\n\n\`\`\`json\n${OBJ}\n\`\`\``) as { band: string })?.band === 'competent');

// 4. prose + trailing commentary
ok('prose, object, then trailing commentary',
  (parses(`Reasoning first.\n\n${OBJ}\n\nI hope this helps.`) as { band: string })?.band === 'competent');
ok('array with trailing commentary',
  Array.isArray(parses(`${ARR}\n\nLet me know if you need more detail.`)));

// 5. string-awareness — a brace INSIDE feedback must not close the object early
const BRACEY = '{ "index": 1, "band": "weak", "feedback": "They wrote {nonsense} and } stray braces." }';
ok('brace inside a string does not truncate the block',
  (parses(BRACEY) as { feedback: string })?.feedback === 'They wrote {nonsense} and } stray braces.');
const ESCAPED = '{ "index": 1, "band": "weak", "feedback": "He said \\"} done\\" mid-sentence." }';
ok('escaped quote inside a string is handled',
  (parses(ESCAPED) as { band: string })?.band === 'weak');

// 6. object nested inside the array element
const NESTED = '[{ "index": 1, "band": "strong", "feedback": "ok", "meta": { "a": { "b": 1 } } }]';
ok('nested objects inside an array element', Array.isArray(parses(NESTED)));

console.log('\n-- must STILL FAIL (no silent repair) --');
ok('no JSON at all → null', extractJsonBlock('I am unable to mark this requirement.') === null);
ok('empty string → null', extractJsonBlock('') === null);
// A max_tokens truncation: opens but never closes. Must NOT be "repaired".
ok('truncated / unbalanced → null',
  extractJsonBlock('[{ "index": 1, "band": "strong", "feedback": "cut off here') === null);
ok('prose then truncated block → null',
  extractJsonBlock('Reasoning.\n\n{ "index": 1, "band": "strong"') === null);
// Balanced but not valid JSON — extractor returns a block, JSON.parse must reject it.
ok('balanced but malformed JSON is returned then REJECTED by JSON.parse',
  parses('{ index: 1, band: strong }') === 'UNPARSEABLE');

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} marking-json-extract: ${pass} passed, ${fail} failed\n`);
process.exit(fail === 0 ? 0 : 1);
