// scripts/test-gap-verdict.ts — the gap labeller's steer as a FIELD, not a phrase.
// Pure: no DB, no model, no network. Run: npm run test:gap-verdict
//
// P-G3: every case names the defect it would catch, and the FALLBACK is exercised as hard as the
// happy path — a fallback that is never tested is the half that runs on the day the model changes.

import {
  parseGapVerdict, nothingEstablished, safeLabel, GAP_VERDICT_FORMAT,
  resolveNothingEstablished,
  CORRECT_VERDICT_FORMAT, correctVerdictMode, gapVerdictFormat, isCorrectVerdict, resolveCorrect,
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
    // WIRED 2026-08-23 on 60/60 agreement including a positive control. The previous version of
    // this pin asserted the OPPOSITE ("not wired") and, when the wiring landed, kept PASSING —
    // its two negative regexes both missed because the call spans lines. A pin that can only ever
    // pass is a false green in the fixture suite itself, which is the thing this suite exists to
    // catch. Both halves below are POSITIVE assertions for that reason.
    ok('creditable IS wired to the opening as its own independent arm',
      /const gapNothingCreditable = nothingCreditable\(gapVerdict\)/.test(src));
    ok('the two arms are passed SEPARATELY — derived\'s arm is untouched',
      /gapNothingEstablished && !bareGuessGuardVetoed\(attempt\),\s*\n\s*gapNothingCreditable,/.test(src));
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

// ── 6b. THE CORRECT VERDICT — THE FIELD, THE MODE, THE RESOLVER ──────────────
// P-G3: every case names the defect it would catch. The defect class here is the one P-V4 named
// five times — a check that keys on a PHRASE when the question is a JUDGEMENT.
{
  // ── THE MODE. Three states, and anything unrecognised is the state that changes nothing.
  ok('mode: "on" and "shadow" are recognised',
    correctVerdictMode('on') === 'on' && correctVerdictMode('shadow') === 'shadow');
  ok('mode: absent → off (the default is the pre-change behaviour)',
    correctVerdictMode(undefined) === 'off' && correctVerdictMode(null) === 'off');
  // Break mode: someone spells the flag like every OTHER flag in this repo (`=== '1'`) and gets a
  // silent `on`. Unrecognised must fail toward the state that changes nothing, never toward the
  // state that changes a verdict.
  for (const bad of ['1', 'ON', 'true', 'Shadow', '', 'off ', 'yes']) {
    ok(`mode: unrecognised ${JSON.stringify(bad)} → off`, correctVerdictMode(bad) === 'off');
  }

  // ── THE BYTES. `off` must be the pre-change prompt, exactly — this is the rollback property.
  ok('format: off is GAP_VERDICT_FORMAT byte-for-byte',
    gapVerdictFormat('off') === GAP_VERDICT_FORMAT);
  ok('format: off carries no mention of a correct field at all',
    !/"correct"/.test(gapVerdictFormat('off')));
  // ⚠️ SHADOW SENDS THE SAME BYTES AS ON. That is the whole reason it is a named state rather
  // than a boolean: it changes the prompt and does NOT change the decision, and a two-state flag
  // would have to lie about one of those halves.
  ok('format: shadow and on send IDENTICAL bytes',
    gapVerdictFormat('shadow') === gapVerdictFormat('on'));
  ok('format: on is off + the correct block, APPENDED not interleaved',
    gapVerdictFormat('on') === GAP_VERDICT_FORMAT + CORRECT_VERDICT_FORMAT
    && gapVerdictFormat('on').startsWith(GAP_VERDICT_FORMAT));
  // The ordinal contract (P-M1), one level down: a NUMBER, never a word.
  ok('correct block demands a NUMBER, 0 or 1', /"correct":\s*0 or 1/.test(CORRECT_VERDICT_FORMAT));
  ok('correct block never asks for a word-coded verdict',
    !/"(correct|incorrect|right|wrong|yes|no)"\s*(?:or|\/)/i.test(CORRECT_VERDICT_FORMAT));
  // The asymmetry IS the safety argument: 1 is a conjunction, 0 collects every doubt.
  ok('correct block scores 1 only on a conjunction of conditions',
    /Score 1 only when ALL of these hold/.test(CORRECT_VERDICT_FORMAT));
  ok('correct block sends the "true as far as it goes" case to 0 — the exact prose the six missed '
    + 'labels were arguing about',
    /true as far as it goes but leaves out part of what was asked/.test(CORRECT_VERDICT_FORMAT));
  ok('correct block breaks ties toward 0', /If you are unsure, score 0/.test(CORRECT_VERDICT_FORMAT));
  ok('correct block still exempts equivalent convention/wording (or it would fail every AFM '
    + 'sign-convention answer)',
    /equivalent\s+convention, wording, ordering or layout is still correct/.test(CORRECT_VERDICT_FORMAT));

  // ── THE PARSER. Optional, strict, never coerced, CANNOT fail the parse.
  for (const [name, raw, expected] of [
    ['correct: 1', '{"derived":1,"label":"x","correct":1}', 1],
    ['correct: 0', '{"derived":1,"label":"x","correct":0}', 0],
    ['absent → undefined', '{"derived":1,"label":"x"}', undefined],
    // Break mode: a coerced `true` would let the model's most natural JSON spelling decide the
    // one field that can tell a student they are done.
    ['true is NOT coerced to 1', '{"derived":1,"label":"x","correct":true}', undefined],
    ['"1" is NOT coerced to 1', '{"derived":1,"label":"x","correct":"1"}', undefined],
    ['2 is NOT coerced', '{"derived":1,"label":"x","correct":2}', undefined],
    ['null is NOT coerced', '{"derived":1,"label":"x","correct":null}', undefined],
  ] as const) {
    const v = parseGapVerdict(raw);
    ok(`correct parses: ${name}`, v !== null && v.correct === expected, JSON.stringify(v));
  }
  // ⚠️ THE LOAD-BEARING HALF: a malformed `correct` must never fail the parse, because `derived`
  // IS wired to production behaviour on the drill route and a failure there burns four calls
  // through withParseRetry and drops a live guard to measure a new one.
  ok('a malformed correct NEVER fails the parse — derived survives it',
    parseGapVerdict('{"derived":0,"label":"y","correct":"maybe"}')?.derived === 0);
  ok('correct and creditable are independent fields, both carried',
    (() => {
      const v = parseGapVerdict('{"derived":1,"label":"x","creditable":0,"correct":1}');
      return v?.creditable === 0 && v?.correct === 1;
    })());

  // ── THE RESOLVER.
  const SENTINEL = 'answer correct — convention differs from model only';
  const MISS     = 'confuses contribution with gross margin';
  // THE SIX MISSED LABELS, verbatim from docs/rollbacks/case_t34_vesla_n20_20260911.json. Every
  // one asserts the answer was correct; every one was scored a MISS by the shipped regex. They
  // are the true-positive class the field exists to reach, and they are pinned here as data so
  // the fixture states the defect rather than describing it.
  const MISSED_SIX = [
    'Answer is correct — convention and emphasis differ from model only',
    'Student covers all key points adequately; answer is substantively correct throughout',
    'Student correctly identified all key issues; no substantive error present here',
    'Answer is substantively correct and comprehensive across all required assessment points',
    "Student's rewritten paragraph correctly applied — no genuine error remains here",
    "Student's latest answer is substantively correct and addresses the requirement fully",
  ];
  ok('the six missed labels all FAIL the shipped regex — the defect, restated as data',
    MISSED_SIX.every((l) => !isCorrectVerdict(l)));
  // The word-boundary guard that the regex DOES get right, kept under test so the move between
  // files did not lose it.
  ok('regex: matches the sentinel', isCorrectVerdict(SENTINEL));
  ok('regex: does NOT match "answer correctly" inside a wrong-answer label',
    !isCorrectVerdict('computes the answer correctly but omits evaluation'));
  ok('regex: does NOT match bare "correct"', !isCorrectVerdict('the correct approach is different'));

  // off / shadow — the REGEX decides, whatever the field says. This is the rollback property and
  // the honesty property: shadow changes the bytes and must not change one decision.
  for (const mode of ['off', 'shadow'] as const) {
    ok(`${mode}: sentinel + no field → correct (today's behaviour)`,
      resolveCorrect(mode, { derived: 1, label: SENTINEL }, SENTINEL).correct === true);
    ok(`${mode}: a missed label + field 1 → still NOT correct (the field is inert)`,
      resolveCorrect(mode, { derived: 1, label: MISSED_SIX[0], correct: 1 }, MISSED_SIX[0]).correct === false);
    ok(`${mode}: sentinel + field 0 → still correct (the field is inert in BOTH directions)`,
      resolveCorrect(mode, { derived: 1, label: SENTINEL, correct: 0 }, SENTINEL).correct === true);
    ok(`${mode}: source is always phrase`,
      resolveCorrect(mode, { derived: 1, label: SENTINEL, correct: 0 }, SENTINEL).source === 'phrase');
  }
  // ⚠️ SHADOW STILL RECORDS THE DISAGREEMENT. A shadow that decided nothing AND observed nothing
  // would be an off with extra tokens; the point of the state is that the arm is readable offline.
  ok('shadow: the disagreement is still reported even though nothing moved',
    (() => {
      const r = resolveCorrect('shadow', { derived: 1, label: MISSED_SIX[0], correct: 1 }, MISSED_SIX[0]);
      return r.correct === false && r.field === 1 && r.phrase === false && r.disagreed === true;
    })());

  // on — THE FIELD DECIDES, IN BOTH DIRECTIONS.
  ok('on: a missed label + field 1 → CORRECT (the six are reached)',
    MISSED_SIX.every((l) => resolveCorrect('on', { derived: 1, label: l, correct: 1 }, l).correct === true));
  // ⚠️ THE DIRECTION THAT MATTERS. A field 0 beside a sentinel label must REFUSE, not fall back.
  // Break mode: an `||` implementation ("field says yes OR the regex says yes") is strictly more
  // permissive than the regex it replaces — talked into true by either channel and into false by
  // neither — which is the wrong direction for the failure that ends the teaching.
  ok('on: sentinel + field 0 → NOT correct (a disagreement to hand-read, NOT a fallback)',
    resolveCorrect('on', { derived: 1, label: SENTINEL, correct: 0 }, SENTINEL).correct === false);
  ok('on: that refusal is sourced to the FIELD and flagged as a disagreement',
    (() => {
      const r = resolveCorrect('on', { derived: 1, label: SENTINEL, correct: 0 }, SENTINEL);
      return r.source === 'field' && r.phrase === true && r.field === 0 && r.disagreed === true;
    })());
  // An ABSENT field is the measured floor, not a verdict. `undefined` means the model did not
  // answer, never that the answer was wrong.
  ok('on: field absent → falls back to the regex, both ways',
    resolveCorrect('on', { derived: 1, label: SENTINEL }, SENTINEL).correct === true
    && resolveCorrect('on', { derived: 1, label: MISS }, MISS).correct === false);
  ok('on: an UNPARSED envelope (verdict null) → the regex floor',
    resolveCorrect('on', null, SENTINEL).correct === true
    && resolveCorrect('on', null, MISS).correct === false
    && resolveCorrect('on', null, SENTINEL).source === 'phrase');
  ok('on: field 0 on a miss label → not correct, and NOT a disagreement',
    (() => {
      const r = resolveCorrect('on', { derived: 1, label: MISS, correct: 0 }, MISS);
      return r.correct === false && r.disagreed === false;
    })());
  // `correct` is not computed from either of the other two fields, and must never become so.
  ok('correct is INDEPENDENT of derived and creditable',
    resolveCorrect('on', { derived: 0, label: MISS, creditable: 0, correct: 1 }, MISS).correct === true
    && resolveCorrect('on', { derived: 1, label: SENTINEL, creditable: 1, correct: 0 }, SENTINEL).correct === false);
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
    /GAP_STRUCTURED \? ' ' \+ gapVerdictFormat\(CORRECT_MODE\) : ''/.test(src));

  // ── THE CORRECT VERDICT'S WIRING, ON BOTH SURFACES (2026-09-11) ────────────
  // The resolver being right is section 6b. THIS is the half every defect in this class has
  // actually been: is it REACHED, on BOTH surfaces, at EVERY call site?
  const engine = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'lib', 'acca', 'teach-engine.ts'), 'utf8');

  for (const [surface, s] of [['drill route', src], ['case engine', engine]] as const) {
    ok(`${surface}: imports the resolver from gap-verdict.ts`,
      /resolveCorrect/.test(s) && /correctVerdictMode/.test(s));
    // ⚠️ THE DUPLICATE IS GONE AND MUST STAY GONE. Two byte-identical copies of this predicate
    // lived in these two files; a local redefinition is how they drift again.
    ok(`${surface}: does NOT define its own isCorrectVerdict`,
      !/function isCorrectVerdict\s*\(/.test(s));
    ok(`${surface}: carries no transcribed copy of the regex`,
      !/\/\\banswer correct\\b\/i/.test(s));
    // BOTH call sites, the completeness trigger included — the ruling was explicit about it. A
    // gate reachable by one predicate and demoted by another is a gate nobody can state.
    ok(`${surface}: resolves ONCE and both call sites read that resolution`,
      /const correctRes = resolveCorrect\(CORRECT_MODE, gapVerdict, diagnosis\)/.test(s)
      && /COMPLETENESS_GATE_ENABLED && correctRes\.correct/.test(s)
      && /treatCorrect = correctRes\.correct && !completenessGap/.test(s));
    ok(`${surface}: reads the ONE env var, through the ONE pure resolver`,
      /correctVerdictMode\(process\.env\.APM_CORRECT_VERDICT\)/.test(s));
    // Break mode: a future edit spells the flag inline as `=== 'on'`, which silently drops the
    // shadow state and the unrecognised-value rule with it.
    ok(`${surface}: never tests the flag inline`,
      !/APM_CORRECT_VERDICT\s*===/.test(s));
    // The format goes through the mode-aware builder, so `off` sends the pre-change bytes.
    ok(`${surface}: builds the format through gapVerdictFormat(CORRECT_MODE)`,
      /gapVerdictFormat\(CORRECT_MODE\)/.test(s));
  }
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} gap verdict: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
