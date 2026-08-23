// scripts/test-gap-verdict.ts — the gap labeller's steer as a FIELD, not a phrase.
// Pure: no DB, no model, no network. Run: npm run test:gap-verdict
//
// P-G3: every case names the defect it would catch, and the FALLBACK is exercised as hard as the
// happy path — a fallback that is never tested is the half that runs on the day the model changes.

import {
  parseGapVerdict, nothingEstablished, safeLabel, GAP_VERDICT_FORMAT,
  resolveNothingEstablished,
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
ok('format states the NUMBER(S) carry the decision, not the prose',
  /NUMBERS? carr(?:y|ies) the decisions?/.test(GAP_VERDICT_FORMAT));
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

// ── 5c. `creditable` — MEASUREMENT ONLY, AND IT MUST NOT BE ABLE TO BREAK `derived` ──
// Break mode, and it is the one that matters: a measurement field made REQUIRED, so a model that
// omits it fails the parse, burns four retries through withParseRetry, and degrades the live
// `derived` path in order to measure something that is wired to nothing.
{
  const noC = parseGapVerdict('{"derived": 0, "label": "asserts a conclusion"}');
  ok('absent creditable still parses (it can never break the wired path)',
    noC !== null && noC.derived === 0 && noC.creditable === undefined);
  for (const bad of ['"1"', 'true', '2', 'null', '"yes"']) {
    const v = parseGapVerdict(`{"derived":0,"label":"x","creditable":${bad}}`);
    ok(`malformed creditable (${bad}) is DROPPED, not coerced, and derived survives`,
      v !== null && v.derived === 0 && v.creditable === undefined);
  }
  for (const good of [0, 1] as const) {
    const v = parseGapVerdict(`{"derived":1,"label":"x","creditable":${good}}`);
    ok(`creditable=${good} is carried through`, v !== null && v.creditable === good);
  }
  // The ordinal contract holds for the second field too — a number, never a word.
  ok('format asks creditable as a NUMBER', /"creditable": 0 or 1/.test(GAP_VERDICT_FORMAT));
  // THE DEFINITION IS THE WHOLE EXPERIMENT: the measured failure was crediting a TRUE but
  // OFF-REQUIREMENT point 20/20. If the format does not name that distinction it tests nothing.
  ok('format names the true-vs-creditable conflation the prose was measured making',
    /not against whether a statement is\s*true in general/.test(GAP_VERDICT_FORMAT.replace(/\s+/g, ' '))
    || /true in general/.test(GAP_VERDICT_FORMAT));
  ok('format scores an unsupported conclusion 0', /conclusion with nothing behind it/.test(GAP_VERDICT_FORMAT));
  // ⚠️ NOT WIRED. Break mode: someone connects it to the opening before it has been measured,
  // which is exactly what P-V1(d) and three failed wording changes exist to prevent.
  {
    const src = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'app', 'api', 'acca', 'tutor', 'route.ts'), 'utf8');
    ok('hint grounding is DEFAULTED OFF (it was measured making fabrication worse)',
      /TUTOR_HINT_GROUNDING === 'on'/.test(src)
      && /HINT_GROUNDING \? renderAuthoredHint/.test(src));
    ok('creditable is NOT wired to the opening condition (measurement only, until measured)',
      !/creditable[\s\S]{0,80}hintOpeningInstruction/.test(src)
      && !/gapNothingEstablished[^\n]*creditable/.test(src));
  }
}

// ── 6b. PRECEDENCE: CODE > FIELD > PHRASE ────────────────────────────────────
// Break mode: code wins only when the model happens to agree, which is no precedence at all —
// the measured defect is precisely that the model says derived=1 on an underived answer.
{
  const disagree = { derived: 1 as const, label: 'computed NPV as negative when it is positive' };
  const r = resolveNothingEstablished(true, disagree, disagree.label);
  ok('CODE beats a FIELD that disagrees (the 9-of-10 case, overridden)',
    r.nothingEstablished === true && r.source === 'code');
  ok('CODE beats an unparsed response too',
    resolveNothingEstablished(true, null, 'anything at all').source === 'code');
  const f = resolveNothingEstablished(false, { derived: 0, label: 'x' }, 'x');
  ok('FIELD is used when code has no claim', f.nothingEstablished && f.source === 'field');
  ok('FIELD=1 with no code claim means something WAS established',
    !resolveNothingEstablished(false, { derived: 1, label: 'x' }, 'x').nothingEstablished);
  const p = resolveNothingEstablished(false, null, guardLabel('unverified'));
  ok('PHRASE is the last resort, unchanged from production', p.nothingEstablished && p.source === 'phrase');
  ok('PHRASE on a paraphrase → false, the measured floor',
    !resolveNothingEstablished(false, null, 'states a conclusion without computing figures').nothingEstablished);
  // ⚠️ THE ASYMMETRY IS THE SAFETY PROPERTY: code can only ever force UNDERIVED. There is no arm
  // that forces DERIVED, because "arithmetic present therefore something correct was established"
  // is a different and false claim. Asserted so nobody adds the symmetric arm for tidiness.
  ok('there is NO code arm that forces DERIVED — code only withholds credit, never grants it',
    resolveNothingEstablished(false, { derived: 0, label: 'x' }, 'x').nothingEstablished === true
    && resolveNothingEstablished(true, { derived: 1, label: 'x' }, 'x').nothingEstablished === true);
}

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
  // The resolution moved OUT of the hint leg to the call site, so the leg is told the answer
  // rather than deriving it from a label. Break mode: a future edit puts a label read back into
  // call3_hint and the precedence quietly stops applying there.
  ok('the branch is resolved CODE > FIELD > PHRASE at the call site',
    /resolveNothingEstablished\(codeOwnsUnderived, gapVerdict, diagnosis\)/.test(src));
  ok('call3_hint is TOLD the answer, it does not read a label to decide',
    /gapNothingEstablished: boolean,/.test(src)
    && !/nothingEstablished\(gapVerdict, diagnosis\)/.test(src));
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
