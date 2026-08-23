// scripts/test-gap-verdict.ts — the gap labeller's steer as a FIELD, not a phrase.
// Pure: no DB, no model, no network. Run: npm run test:gap-verdict
//
// P-G3: every case names the defect it would catch, and the FALLBACK is exercised as hard as the
// happy path — a fallback that is never tested is the half that runs on the day the model changes.

import {
  parseGapVerdict, nothingEstablished, safeLabel, GAP_VERDICT_FORMAT,
} from '../lib/acca/gap-verdict';
import { guardLabel, unsubstantiatedLabel } from '../lib/acca/hint-opening';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

console.log('\ngap verdict — the steer is a field, not a phrase\n');

// ── 1. THE ORDINAL CONTRACT (P-M1) ───────────────────────────────────────────
// Break mode: the format asks for a WORD ("underived"/"asserted"), which is a string code — the
// exact failure this module exists to remove, one level down.
ok('format demands a NUMBER, 0 or 1', /"derived":\s*0 or 1/.test(GAP_VERDICT_FORMAT));
ok('format never asks for a word-coded verdict',
  !/"(underived|asserted|not_derived|none)"/i.test(GAP_VERDICT_FORMAT));
ok('format states the NUMBER carries the decision, not the prose',
  /NUMBER carries the decision/.test(GAP_VERDICT_FORMAT));
// THE DANGLING-REFERENCE DEFECT, pinned. The first version defined derived as "when the guard
// above applies" — and the arithmetic veto DELETES that guard block whenever the student showed
// working, i.e. on exactly the turns where the answer IS derived. A definition that evaporates on
// half the inputs is the string-dependency defect wearing a field's clothes.
ok('format does NOT define derived by pointing at the guard block (which the veto can delete)',
  !/guard above/i.test(GAP_VERDICT_FORMAT), GAP_VERDICT_FORMAT);
ok('format defines derived=0 self-containedly (asserts without deriving)',
  /ASSERTS a conclusion/.test(GAP_VERDICT_FORMAT) && /without deriving it/.test(GAP_VERDICT_FORMAT));
ok('format defines derived=1 self-containedly (working on the page)',
  /Set "derived" to 1 when there is actual working/.test(GAP_VERDICT_FORMAT));
ok('format carries the two disqualifiers the predicate turns on',
  /description of working, not working/.test(GAP_VERDICT_FORMAT)
  && /SCENARIO supplied/.test(GAP_VERDICT_FORMAT));

// ── 2. PARSING — happy paths ─────────────────────────────────────────────────
for (const [name, raw, derived, label] of [
  ['bare object', '{"derived": 0, "label": "asserts a conclusion without deriving it"}', 0,
    'asserts a conclusion without deriving it'],
  ['derived = 1', '{"derived":1,"label":"confuses contribution with gross margin"}', 1,
    'confuses contribution with gross margin'],
  ['leading prose (extractJsonBlock earns its keep)',
    'Here is the verdict:\n{"derived": 0, "label": "no working shown"}', 0, 'no working shown'],
  ['fenced', '```json\n{"derived": 1, "label": "wrong discount rate applied"}\n```', 1,
    'wrong discount rate applied'],
  ['key order reversed', '{"label":"states a figure only","derived":0}', 0, 'states a figure only'],
  ['label needing trim', '{"derived":0,"label":"  padded label  "}', 0, 'padded label'],
] as const) {
  const v = parseGapVerdict(raw);
  ok(`parses: ${name}`, v !== null && v.derived === derived && v.label === label,
    JSON.stringify(v));
}

// ── 3. PARSING — STRICT IN BOTH DIRECTIONS ───────────────────────────────────
// Break mode, and it is the dangerous one: a coerced value is a GUESS about what the model meant,
// and inferring a decision from something it merely happened to emit is the whole defect.
for (const [name, raw] of [
  ['a boolean is not 0/1', '{"derived": false, "label": "x"}'],
  ['a STRING "0" is not 0', '{"derived": "0", "label": "x"}'],
  ['out-of-range number', '{"derived": 2, "label": "x"}'],
  ['null derived', '{"derived": null, "label": "x"}'],
  ['missing derived', '{"label": "x"}'],
  ['missing label', '{"derived": 0}'],
  ['empty label', '{"derived": 0, "label": "   "}'],
  ['non-string label', '{"derived": 0, "label": 5}'],
  ['array, not object', '[{"derived":0,"label":"x"}]'],
  ['truncated body (the max_tokens failure mode)', '{"derived": 0, "label": "asserts a con'],
  ['not JSON at all', 'states a figure but shows no working — cannot be credited'],
  ['empty', ''],
] as const) {
  ok(`REFUSES: ${name}`, parseGapVerdict(raw) === null, JSON.stringify(parseGapVerdict(raw)));
}

// ── 4. THE DECISION, STRUCTURED FIRST ────────────────────────────────────────
ok('derived=0 means nothing was established', nothingEstablished({ derived: 0, label: 'x' }, ''));
ok('derived=1 means something was', !nothingEstablished({ derived: 1, label: 'x' }, ''));
// THE POINT OF THE WHOLE MODULE: the field wins over the prose, in BOTH directions, so a
// paraphrase can no longer disarm the branch and a stray sentinel can no longer arm it.
ok('a PARAPHRASED label no longer disarms the branch (the 55% echo defect, closed)',
  nothingEstablished({ derived: 0, label: 'states a conclusion without computing any figures' }, ''));
ok('"entirely unverified" — the real counterexample — now decides correctly',
  nothingEstablished({ derived: 0, label: 'EVA sign and magnitude are entirely unverified' }, ''));
ok('the field OVERRIDES a label that happens to contain the old sentinel',
  !nothingEstablished({ derived: 1, label: guardLabel('unverified') }, ''));

// ── 5. THE FALLBACK IS THE MEASURED FLOOR, NOT A NEW BEHAVIOUR ───────────────
// Break mode: an unparsed response silently becomes "something was established", which credits.
ok('no verdict → falls back to the substring match (canonical label)',
  nothingEstablished(null, guardLabel('unverified')));
ok('no verdict → falls back to the substring match (rewritten label)',
  nothingEstablished(null, unsubstantiatedLabel('unverified')));
ok('no verdict + paraphrase → false, exactly as production behaves today (floor, not worse)',
  !nothingEstablished(null, 'states a conclusion without computing any figures'));
ok('no verdict + a genuine gap label → false',
  !nothingEstablished(null, 'confuses contribution with gross margin'));

// ── 6. safeLabel — A JSON BLOB MUST NEVER REACH A STUDENT ────────────────────
// Break mode: parsing fails, the raw body is passed through as the gap, and `call3_hint` is handed
// `{"derived": 0, "label": ...}` to write a hint from — or the transcript persists it.
ok('parsed verdict yields its label', safeLabel({ derived: 0, label: 'the gap' }, 'ignored') === 'the gap');
ok('plain prose passes through unchanged',
  safeLabel(null, 'states a figure but shows no working') === 'states a figure but shows no working');
ok('unparsed JSON-shaped body: the label is RECOVERED, not passed through raw',
  safeLabel(null, '{"derived": 0, "label": "no working shown"') === 'no working shown');
ok('unrecoverable JSON-shaped body yields EMPTY, never a blob',
  safeLabel(null, '{"derived": 0, "gap": "no working"}') === '');
ok('an escaped quote inside a recovered label is unescaped',
  safeLabel(null, '{"label": "the \\"EVA\\" figure is unshown"') === 'the "EVA" figure is unshown');

// ── 7. THE WIRING, PINNED ────────────────────────────────────────────────────
// The unit tests prove the rule is right and cannot prove it is REACHED — the defect class this
// whole thread has been about. Same static sweep as test:paper-link-sweep.
{
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'app', 'api', 'acca', 'tutor', 'route.ts'), 'utf8');
  ok('route imports the verdict module', /from '@\/lib\/acca\/gap-verdict'/.test(src));
  ok('call2 throws parse so withParseRetry can retry',
    /if \(GAP_STRUCTURED && !verdict\) throw new Error\('parse'\)/.test(src));
  ok('the call site wraps call2 in withParseRetry',
    /withParseRetry\('diagnoseGapVerdict'/.test(src));
  ok('the opening branch reads the VERDICT, not the substring, as its first source',
    /nothingEstablished\(gapVerdict, diagnosis\)/.test(src));
  ok('the substring matcher is no longer the branch\'s decision point',
    !/gapEstablishesNothingCorrect\(diagnosis\) &&/.test(src));
  ok('max_tokens is raised when structured (a truncated body costs 4 calls, not a worse label)',
    /max_tokens: GAP_STRUCTURED \? 200 : 40/.test(src));
  ok('structured is ON by default and reversible by env',
    /TUTOR_GAP_STRUCTURED \?\? 'on'\) !== 'off'/.test(src));
  ok('the format block is APPENDED, so the off-variant keeps the pre-change bytes',
    /GAP_STRUCTURED \? ' ' \+ GAP_VERDICT_FORMAT : ''/.test(src));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} gap verdict: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
