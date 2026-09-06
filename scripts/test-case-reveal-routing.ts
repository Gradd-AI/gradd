// scripts/test-case-reveal-routing.ts — the CASE surface's earned reveal becomes paper-routed and
// stops being a second copy of a string that lives in tutor-personas.ts.
// Pure: no DB, no model, no network. Run: npm run test:case-reveal-routing
//
// ⚠️ THE CLAIM UNDER TEST IS A BYTE CLAIM. `shipped` must reproduce the literal that was deleted
// from teach-engine.ts, or the 9/40 baseline measured on 2026-08-25 describes a string that no
// longer exists and the arm is uninterpretable.
//
// ⚠️ THE SECOND CLAIM IS A SAFETY CLAIM, and it is the reason this is not `caseSystemFor(paper)`.
// The conversational persona would put "Never complete the student's answer." and NO_COMPUTED_
// OUTPUTS ("never STATE such a computed figure yourself") on the one leg whose entire purpose is
// to state the figures. These fixtures pin that neither reaches the reveal.

import {
  caseRevealSystemFor, CASE_REVEAL_CORE_APM, CASE_REVEAL_CORE_AFM,
  systemFor, NO_INVENTED_NUMBERS, NO_INVENTED_REVEAL_REFUSAL,
  RETRACTION_PROTOCOL, METHOD_FITS_THE_GIVEN_INPUTS,
  NO_COMPUTED_OUTPUTS, DIGNITY_ON_DISTRESS, GROUNDING_DISCIPLINE,
  CASE_REVEAL_GUARDRAILS_2P_FOR_TEST,
  CASE_REVEAL_CREDIT_CLAUSE_FOR_TEST, CASE_REVEAL_CONDITIONED_CLAUSE_FOR_TEST,
  assembleAfmReveal,
} from '../lib/acca/tutor-personas';
import { caseRevealSystem } from '../lib/acca/teach-engine';
// Imported, never transcribed: divergence #5's whole design argument is that the hint leg's (c)
// arm CANNOT be copied here, and a transcription of (c) would let it drift out of agreement with
// the string this fixture claims is wrong for the reveal.
import { hintOpeningInstruction } from '../lib/acca/hint-opening';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

const engine = require('fs').readFileSync(
  require('path').join(__dirname, '..', 'lib', 'acca', 'teach-engine.ts'), 'utf8');

console.log('\ncase reveal — paper routing, duplicate collapsed, withholding NOT re-imposed\n');

// ── 1. THE SHIPPED LITERAL, PINNED BYTE-IDENTICAL ────────────────────────────
// Transcribed from teach-engine.ts as it stood at f8ac756, the SHA the 9/40 baseline ran on.
const SHIPPED =
  'You are Ezra, an APM tutor. The student has genuinely attempted this drill and worked ' +
  'through hints and a teach-through — they have EARNED the full model now. Show them how a ' +
  'top-band answer is built: first credit, specifically, what they already had right, then ' +
  'walk the moves they were missing, INCLUDING the figures and the conclusion (withholding is ' +
  'over — this is the earned reveal). Warm and peer-to-peer, a sharp tutor laying it out, not a ' +
  'marked script. End by pointing them to apply the key move on a FRESH question. No empty praise.';

ok('shipped variant is byte-identical to the deleted literal (APM)',
  caseRevealSystem('shipped', 'APM') === SHIPPED);
ok('shipped variant IGNORES paper — that was the defect, and the baseline had it',
  caseRevealSystem('shipped', 'AFM') === SHIPPED);
ok('shipped is 542 chars, as measured', SHIPPED.length === 542, `len=${SHIPPED.length}`);

// ── 2. THE ROUTED VARIANT ACTUALLY ROUTES ────────────────────────────────────
const apm = caseRevealSystem('routed', 'APM');
const afm = caseRevealSystem('routed', 'AFM');
ok('routed APM !== routed AFM — the papers diverge', apm !== afm);
ok('routed APM names APM', /an APM tutor/.test(apm));
ok('routed AFM names AFM and NOT APM',
  /ACCA AFM tutor/.test(afm) && !/\bAPM\b/.test(afm),
  afm.slice(0, 120));
ok('routed AFM carries the established AFM reveal register',
  /board's senior financial adviser/.test(afm));
// The whole point: an AFM student must not be addressed by the APM persona.
ok('MUST-FAIL: the shipped variant addresses an AFM student as APM',
  /an APM tutor/.test(caseRevealSystem('shipped', 'AFM')));

// ── 3. THE UNIT NOUN — "drill" was the second logged defect ──────────────────
ok('routed drops "this drill" on BOTH papers',
  !/this drill/.test(apm) && !/this drill/.test(afm));
ok('routed says "this requirement" on BOTH papers',
  /this requirement/.test(apm) && /this requirement/.test(afm));
ok('MUST-FAIL: the shipped variant still says "this drill"', /this drill/.test(SHIPPED));

// ── 4. WITHHOLDING IS NOT RE-IMPOSED — the safety claim ─────────────────────
// This is the reason the fix is NOT caseSystemFor(paper). If either of these ever passes into the
// reveal, the leg has been handed a refusal instruction on the turn the student earned past it.
for (const [label, s] of [['APM', apm], ['AFM', afm]] as const) {
  ok(`${label}: does NOT carry "Never complete the student's answer"`,
    !/Never complete the student's answer/.test(s));
  ok(`${label}: does NOT carry NO_COMPUTED_OUTPUTS ("WITHHOLD COMPUTED OUTPUTS")`,
    !/WITHHOLD COMPUTED OUTPUTS/.test(s));
  ok(`${label}: still says withholding is OVER`,
    /withholding is\s+over — this is the earned reveal/.test(s.replace(/\s+/g, ' ')));
  ok(`${label}: still demands the figures and the conclusion`,
    /INCLUDING the figures and the conclusion/.test(s));
}
// Prove the conversational persona genuinely contains what we are excluding — otherwise the four
// assertions above are vacuous and would pass against any string (P-G3).
ok('POSITIVE CONTROL: the conversational persona DOES contain the withholding clause',
  /Never complete the student's answer/.test(systemFor('APM')) &&
  /Never complete the student's answer/.test(systemFor('AFM')));
ok('POSITIVE CONTROL: NO_COMPUTED_OUTPUTS really does forbid stating a computed figure',
  /WITHHOLD COMPUTED OUTPUTS/.test(NO_COMPUTED_OUTPUTS) &&
  /never STATE such a computed figure yourself/.test(NO_COMPUTED_OUTPUTS));

// ── 5. THE GUARDRAILS TAKEN, AND THE ONES DELIBERATELY NOT ──────────────────
for (const [label, s] of [['APM', apm], ['AFM', afm]] as const) {
  ok(`${label}: carries NO_INVENTED_NUMBERS`, s.includes(NO_INVENTED_NUMBERS));
  ok(`${label}: carries NO_INVENTED_REVEAL_REFUSAL`, s.includes(NO_INVENTED_REVEAL_REFUSAL));
  ok(`${label}: carries RETRACTION_PROTOCOL`, s.includes(RETRACTION_PROTOCOL));
  ok(`${label}: carries METHOD_FITS_THE_GIVEN_INPUTS`, s.includes(METHOD_FITS_THE_GIVEN_INPUTS));
  ok(`${label}: EXCLUDES DIGNITY_ON_DISTRESS (says "you never hand over the answer")`,
    !s.includes(DIGNITY_ON_DISTRESS));
  ok(`${label}: EXCLUDES GROUNDING_DISCIPLINE (antecedent always false on this leg)`,
    !s.includes(GROUNDING_DISCIPLINE));
  // METHOD_FITS_THE_GIVEN_INPUTS's own text says it is the last word for a reason.
  ok(`${label}: METHOD_FITS_THE_GIVEN_INPUTS is LAST (anchor position)`,
    s.trimEnd().endsWith(METHOD_FITS_THE_GIVEN_INPUTS.trimEnd()));
}
ok('the excluded blocks are non-empty strings — an empty block would make the exclusions vacuous',
  DIGNITY_ON_DISTRESS.length > 50 && GROUNDING_DISCIPLINE.length > 50 && NO_COMPUTED_OUTPUTS.length > 50);

// ── 6. THE DUPLICATE IS COLLAPSED ───────────────────────────────────────────
// The reveal core must be DEFINED in tutor-personas.ts and only REFERENCED here. A second literal
// in the engine is exactly the state this change exists to end — the one exception is the pinned
// `shipped` baseline, which must stay so the arm has a byte-accurate control.
ok('the engine no longer declares a local REVEAL_SYSTEM',
  !/^const REVEAL_SYSTEM =/m.test(engine));
ok('the engine imports the shared builder', /caseRevealSystemFor/.test(engine));
ok('exactly ONE literal remains in the engine, and it is the pinned baseline',
  (engine.match(/You are Ezra, an APM tutor\./g) || []).length === 1 &&
  /SHIPPED_CASE_REVEAL_SYSTEM/.test(engine));
ok('call4_reveal takes paper and defaults it to APM (byte-identical for legacy callers)',
  /paper = 'APM',/.test(engine));
// ⚠️ RE-ANCHORED 2026-08-28, NOT WEAKENED. Divergence #5 extracted `lastRealAttempt ??
// studentMessage` into `revealAttempt` so the fallback could be tested for null before the carried
// verdict is passed. The claim is unchanged — the real paper still reaches the leg — and the
// extracted expression is pinned on the next line so the fallback itself cannot drift.
ok('the orchestrator passes the real paper to call4_reveal',
  /call4_reveal\(question, context, revealAttempt, lastDiagnosis \?\? '', modelAnswer, paper,/.test(engine));
ok('the reveal attempt still falls back to studentMessage when no attempt is stored',
  /const revealAttempt = lastRealAttempt \?\? studentMessage;/.test(engine));
// Default flipped to routed_2p 2026-08-25 after the register arm, and SUPERSEDED 2026-08-28 by
// divergence #5's flip to routed_2p_conditioned. This check keeps its original job — the arm has
// its OWN env var, and the default cannot drift silently — while §5(g) pins the current value.
// ⚠️ THE 2P RECAST IS NOT UNDONE BY THE SUPERSESSION, which is the part worth asserting: the
// conditioned variant selects the SAME second-person guardrail set, so the register arm's bytes
// still ship. A flip that quietly reverted them would pass a bare "the default changed" check.
ok('the arm has its OWN env var, and the default names a 2P-carrying variant',
  /process\.env\.TUTOR_CASE_REVEAL \?\? 'routed_2p(_conditioned)?'/.test(engine));
ok('the shipped default still carries the SECOND-PERSON guardrail set (2026-08-25 survives)',
  caseRevealSystem('routed_2p_conditioned', 'APM').endsWith(CASE_REVEAL_GUARDRAILS_2P_FOR_TEST) &&
  caseRevealSystem('routed_2p_conditioned', 'AFM', true).endsWith(CASE_REVEAL_GUARDRAILS_2P_FOR_TEST));

// ── 7. THE CORES ARE SIBLINGS, NOT DIVERGENT REWRITES ───────────────────────
// Everything after the opening register must match clause for clause, or "AFM voice" has quietly
// become "a different reveal design" — which is a content change needing its own measurement.
const tailApm = CASE_REVEAL_CORE_APM.slice(CASE_REVEAL_CORE_APM.indexOf('Show them how a'));
const tailAfm = CASE_REVEAL_CORE_AFM.slice(CASE_REVEAL_CORE_AFM.indexOf('Show them how a'));
ok('APM and AFM cores are identical from "Show them how a" onward', tailApm === tailAfm);
ok('AFM does NOT adopt the drill route design "B" (no verbatim-append instruction)',
  !/appends it, VERBATIM/.test(CASE_REVEAL_CORE_AFM));


// ── 8. THE SECOND-PERSON ARM (2026-08-25) ────────────────────────────────────
// Tests the register hypothesis: guardrail prose written ABOUT the student primes output written
// about the student. The claim these fixtures defend is that the two block sets differ ONLY in
// referent — if anything else moved, the arm is measuring two things.
{
  const {
    CASE_REVEAL_GUARDRAILS_3P_FOR_TEST: G3,
    CASE_REVEAL_GUARDRAILS_2P_FOR_TEST: G2,
  } = require('../lib/acca/tutor-personas');

  ok('2P block set differs from 3P — the recast actually fired', G3 !== G2);

  // THE POINT OF THE ARM: no third-person student reference survives.
  const STUDENT_NOUN = /\bthe student\b|\ba student\b|\bstudent's\b/i;
  ok('3P set DOES refer to "the student" (positive control — else the next check is vacuous)',
    STUDENT_NOUN.test(G3), `3P hits: ${(G3.match(/student/gi) || []).length}`);
  ok('2P set contains NO student-noun reference at all',
    !STUDENT_NOUN.test(G2), (G2.match(/[^.]*student[^.]*/i) || [''])[0].slice(0, 120));

  // NO INSTRUCTION ABOUT REGISTER WAS ADDED — that would name the unwanted output and prime it
  // (P-M4), and would confound the arm with a second change.
  ok('2P set adds no instruction about register/person',
    !/third person|second person|address them directly|write to them/i.test(G2));
  ok('2P set is not merely LONGER — no clause was appended',
    G2.length < G3.length + 40);

  // EVERY ANCHOR PRESERVED. If a severity marker or example was lost, the arm is measuring a
  // weakened guardrail rather than a register change.
  for (const anchor of [
    'CODE OWNS EVERY NUMBER', 'RANGES and RULES OF THUMB', 'typically 8–12% of the underlying',
    'more volatility → more', 'Verified figures live only in the earned worked answer',
    'the earn-gate is a structural rule the system enforces', 'never\n', 'RETRACTION PROTOCOL',
    'CONCEDE PLAINLY AND IMMEDIATELY', 'well, technically',
    'FINALLY, AND HOLD THIS HARDEST', 'FITS THE', 'divide the share price and strike',
    'Pick ONE consistent basis',
  ]) {
    const a = anchor.replace('\n', '');
    if (!G3.includes(a)) continue; // skip anchors that were never there
    ok(`2P preserves anchor: ${JSON.stringify(a.slice(0, 44))}`, G2.includes(a));
  }

  // The recast must not have touched the model's own imperatives — those are what make "you"
  // unambiguous. A confound check, since "you" already means the MODEL in a system prompt.
  ok('2P keeps "never a figure you supply" (model-directed "you" intact)',
    G2.includes('never a figure you supply'));
  ok('2P keeps "do NOT invent your own reason for declining"',
    G2.includes('invent your own reason for declining'));

  // The conversational copies must be UNTOUCHED — four legs and both papers still send them.
  const { systemFor: sysFor } = require('../lib/acca/tutor-personas');
  for (const paper of ['APM', 'AFM']) {
    ok(`${paper}: the CONVERSATIONAL persona still carries the third-person blocks`,
      STUDENT_NOUN.test(sysFor(paper)));
  }
  // And the reveal must still be a reveal under the new variant.
  const r2apm = caseRevealSystem('routed_2p', 'APM');
  const r2afm = caseRevealSystem('routed_2p', 'AFM');
  for (const [label, s] of [['APM', r2apm], ['AFM', r2afm]] as const) {
    ok(`routed_2p ${label}: withholding still OVER`,
      /withholding is\s+over — this is the earned reveal/.test(s.replace(/\s+/g, ' ')));
    ok(`routed_2p ${label}: no "Never complete the student's answer"`,
      !/Never complete the student's answer/.test(s));
    ok(`routed_2p ${label}: no WITHHOLD COMPUTED OUTPUTS`, !/WITHHOLD COMPUTED OUTPUTS/.test(s));
  }
  ok('routed_2p AFM still names AFM and not APM', /ACCA AFM tutor/.test(r2afm) && !/\bAPM\b/.test(r2afm));
  ok('routed and routed_2p differ ONLY in the guardrail block set',
    caseRevealSystem('routed', 'APM').replace(G3, '') === r2apm.replace(G2, ''));
}

// ── 5. DIVERGENCE #5 — THE CONDITIONED OPENING (2026-08-28) ──────────────────
// The arm is `routed_2p_conditioned` against the SHIPPING `routed_2p`, so the control is
// production and the comparison is paired. The whole claim is that the only byte that moves is
// the opening clause, and only where the carried verdict says nothing earns credit.
{
  const CLAUSE = CASE_REVEAL_CREDIT_CLAUSE_FOR_TEST;
  const COND   = CASE_REVEAL_CONDITIONED_CLAUSE_FOR_TEST;

  // (a) THE CONTROL IS UNTOUCHED. With no verdict the conditioned variant must be byte-identical
  //     to routed_2p; and every OTHER variant must ignore the verdict outright, so merely wiring
  //     the carrier cannot move the arm it is measured against.
  for (const paper of ['APM', 'AFM'] as const) {
    ok(`#5 ${paper}: conditioned with NO verdict === routed_2p, byte-identical`,
      caseRevealSystem('routed_2p_conditioned', paper, false) === caseRevealSystem('routed_2p', paper));
    ok(`#5 ${paper}: every other variant IGNORES the verdict — the control cannot be moved by it`,
      caseRevealSystem('routed_2p', paper, true) === caseRevealSystem('routed_2p', paper) &&
      caseRevealSystem('routed', paper, true)    === caseRevealSystem('routed', paper) &&
      caseRevealSystem('shipped', paper, true)   === caseRevealSystem('shipped', paper));
  }

  // (b) THE SWAP HAPPENS, AND IT IS THE ONLY THING THAT HAPPENS.
  for (const paper of ['APM', 'AFM'] as const) {
    const ctl = caseRevealSystem('routed_2p', paper);
    const trt = caseRevealSystem('routed_2p_conditioned', paper, true);
    ok(`#5 ${paper}: the praise clause is GONE from the conditioned core`, !trt.includes(CLAUSE));
    ok(`#5 ${paper}: the praise clause IS present in the control`, ctl.includes(CLAUSE));
    ok(`#5 ${paper}: the conditioned clause is present`, trt.includes(COND));
    ok(`#5 ${paper}: ONE clause moved — the control with that clause swapped IS the treatment`,
      ctl.split(CLAUSE).join(COND) === trt);
  }

  // (c) NOTHING IS WITHHELD. This is the difference from the hint leg's (c) arm, and the reason
  //     (c) could not be copied: the reveal must still hand over the figures and the conclusion.
  for (const paper of ['APM', 'AFM'] as const) {
    const trt = caseRevealSystem('routed_2p_conditioned', paper, true);
    ok(`#5 ${paper}: withholding still OVER under the conditioned opening`,
      /INCLUDING the figures and the conclusion \(withholding is\s+over — this is the earned reveal\)/
        .test(trt.replace(/\s+/g, ' ')));
    ok(`#5 ${paper}: no "Never complete the student's answer"`,
      !/Never complete the student's answer/.test(trt));
    ok(`#5 ${paper}: no WITHHOLD COMPUTED OUTPUTS`, !/WITHHOLD COMPUTED OUTPUTS/.test(trt));
    ok(`#5 ${paper}: still closes on a FRESH question`, /FRESH question/.test(trt));
    ok(`#5 ${paper}: the 2P guardrail set is unchanged and still last`,
      trt.endsWith(CASE_REVEAL_GUARDRAILS_2P_FOR_TEST));
  }

  // (d) MUST-FAIL (P-G3) — the naive build is the hint leg's (c) text copied across. Each of
  //     these three clauses is FALSE on the reveal leg; pinning them proves this fixture would
  //     have caught the copy rather than blessing it.
  const HINT_C = hintOpeningInstruction('conditional', false, true);
  for (const paper of ['APM', 'AFM'] as const) {
    const trt = caseRevealSystem('routed_2p_conditioned', paper, true);
    ok(`#5 ${paper}: MUST-FAIL — (c) says "First miss"; the reveal fires at missCount >= 2`,
      /First miss/.test(HINT_C) && !/First miss/.test(trt));
    // ⚠️ RE-ANCHORED 2026-09-06. This clause used to be `"put on the page"`, which the credit
    // deletion removed from (c) along with the credit language around it. The claim is
    // unchanged — (c) is a first-miss HINT and the reveal core is not — so it is re-anchored on
    // a clause that still separates them rather than dropped.
    ok(`#5 ${paper}: MUST-FAIL — the reveal core authorises the answer; (c) never does`,
      /EARNED/.test(trt) && !/EARNED|worked answer|full model/i.test(HINT_C));
    ok(`#5 ${paper}: MUST-FAIL — (c) demands ONE gap; the reveal walks every move`,
      /just one, not a list/.test(HINT_C) && !/just one, not a list/.test(trt));
  }

  // (e) PURELY POSITIVE (P-T2/P-M4). The replacement must not name the output it displaces — a
  //     "do not praise" clause is the measured way to get more of it, not less.
  ok('#5 the conditioned clause adds no prohibition',
    !/\bdo not\b/i.test(COND) && !/\bnever\b/i.test(COND) && !/\bdon't\b/i.test(COND));
  ok('#5 the conditioned clause names no credit/praise/correctness',
    !/credit|praise|correct/i.test(COND));
  for (const paper of ['APM', 'AFM'] as const) {
    // "No empty praise." survives at the tail of BOTH arms — a constant, not a delta. Stated here
    // rather than silently kept: it is the one praise-referring token left in the treatment core.
    ok(`#5 ${paper}: "No empty praise." is in BOTH arms, so it is not part of the delta`,
      caseRevealSystem('routed_2p_conditioned', paper, true).includes('No empty praise.') &&
      caseRevealSystem('routed_2p', paper).includes('No empty praise.'));
  }

  // (f) PAPER ROUTING SURVIVES THE CONDITIONING — the defect 8157a7a closed must not reopen.
  ok('#5 conditioned AFM still names AFM and not APM',
    /ACCA AFM tutor/.test(caseRevealSystem('routed_2p_conditioned', 'AFM', true)) &&
    !/\bAPM\b/.test(caseRevealSystem('routed_2p_conditioned', 'AFM', true)));
  ok('#5 conditioned APM still names APM',
    /an APM tutor/.test(caseRevealSystem('routed_2p_conditioned', 'APM', true)));

  // (g) WIRING — the default must NOT move, and the carrier must be sealed, not plaintext.
  // Default flipped 2026-08-28 after the arm reported (7/60 -> 36/60, p = 4.0e-8, blind-classified,
  // same-session control, positive control 0/10). Pinned so it cannot drift back silently — the
  // whole reveal leg's opening hangs on this one literal.
  ok('#5 the default is routed_2p_conditioned (measured 2026-08-28)',
    /process\.env\.TUTOR_CASE_REVEAL \?\? 'routed_2p_conditioned'/.test(engine));
  ok('#5 the verdict is carried in the SEALED payload, not the plaintext session state',
    /everCreditable\?: boolean/.test(engine) &&
    /JSON\.stringify\(\{ answer, counted, everCreditable \}/.test(engine));
  // 🔴 SUPERSEDED BY DESIGN "B" (2026-09-06). These two pinned the carrier reaching the reveal.
  // It no longer does: `call4_reveal` serves the shared figure-free wrapper system, which has no
  // praise clause to condition. Inverted rather than deleted — a silent deletion would leave the
  // file asserting nothing about a wiring that used to be load-bearing, and the arm summary
  // (docs/redteam/summaries/2026-08-28-case-reveal-creditable.md) would still read as current.
  ok('#5 SUPERSEDED — the carried verdict no longer selects a reveal system',
    !/caseRevealSystem\(CASE_REVEAL/.test(engine));
  ok('#5 SUPERSEDED — the reveal call no longer passes the creditable carrier',
    !/lastRealAttempt != null && lastEverCreditable === false/.test(engine));
  ok('#5 the carrier itself SURVIVES (re-wiring it must not need the session state rebuilt)',
    /everCreditable\?: boolean/.test(engine) && /let newEverCreditable = lastEverCreditable;/.test(engine));
  ok('#5 the credit flag is STICKY, not last-write',
    /newEverCreditable = lastEverCreditable === true \? true : thisTurnCreditable/.test(engine));
  ok('#5 a correct answer and a completeness demotion both COUNT AS CREDIT',
    /const thisTurnCreditable = treatCorrect \|\| !!completenessGap \|\| !gapNothingCreditable/.test(engine));

  // ── DESIGN "B" ON THE CASE REVEAL (2026-09-06) ──────────────────────────────
  // The claim is STRUCTURAL, so the checks are structural: the model's output is a wrapper, the
  // figures come from the row, and code does the joining. A prompt-only check would pass on a
  // build that asked for a wrapper and still served whatever the model wrote.
  ok('B: the case reveal assembles code-side, verbatim, exactly once',
    (engine.match(/assembleAfmReveal\(/g) || []).length === 1 &&
    /const served = assembleAfmReveal\(finishClean\(res\), modelAnswer\);/.test(engine));
  ok('B: the wrapper runs under the SHARED wrapper system, paper- and path-routed',
    /system: revealWrapperSystemFor\(paper, reachedFrom\),/.test(engine));
  ok('B: the wrapper user prompt is the SHARED builder, not a local literal',
    /buildRevealWrapperUserPrompt\(\{/.test(engine));
  ok('B: MUST-FAIL — the model is no longer handed the answer to re-author',
    !/Build the worked walkthrough now/.test(engine) &&
    !/Verified model answer \(you MAY reveal this/.test(engine));
  ok('B: the cap is the wrapper cap, not the walkthrough cap (700 was for authored prose)',
    /max_tokens: 500, \/\/ wrapper only/.test(engine));
  ok('B: a truncated wrapper is trimmed to a whole sentence before assembly',
    /function finishClean\(res: unknown\)/.test(engine) && /trimToLastSentence\(text\)/.test(engine));
  ok('B: the figure audit is wired, and it can never block an EARNED reveal',
    /auditRevealFigures\(served, \{ context, modelAnswer, attempt \}\)/.test(engine) &&
    /catch \{ \/\* an audit must never break a reveal \*\/ \}/.test(engine));
  // ⚠️ The pre-normaliser form of this check compared a literal `\\n` (a backslash and an `n`, not
  // a newline), so it never exercised a real multi-line answer and would have passed on ANY
  // line handling. Rebuilt on real newlines, against the invariant the normaliser leaves standing:
  // the served body's CONTENT LINES end with the stored answer's, byte-for-byte, in order.
  {
    const STORED = '**1. Tax**\n| a | b |\n| 1 | 2 |\nThe rate is 26.5%.';
    const body = assembleAfmReveal('A framing wrapper.', STORED);
    const lines = (s: string) => s.split(/\r\n|\n/).filter(l => l.trim() !== '');
    const stored = lines(STORED), got = lines(body);
    ok('B: FUNCTIONAL — the served body ends with the stored answer\'s lines, byte-for-byte',
      got.slice(got.length - stored.length).every((l, i) => l === stored[i]));
    ok('B: FUNCTIONAL — the table survives (contiguous pipe rows keep their single newline)',
      body.includes('| a | b |\n| 1 | 2 |'));
    ok('B: FUNCTIONAL — a bare line after the table is its OWN paragraph, not a run-on',
      body.includes('| 1 | 2 |\n\nThe rate is 26.5%.'));
  }

  // ── THE POSITIVE CONTROL'S FINDING, PINNED (2026-08-28) ─────────────────────
  // The first build was LAST-WRITE and the 120-turn arm could not see the defect: every one of
  // its 246 attempt turns read `creditable: 0`, so sticky and last-write are indistinguishable
  // on that data. The positive-control target — a complete, correct answer followed by a
  // two-line EXTENSION — read `creditable: 1` then `0`, 10/10, and last-write would have opened
  // the earned reveal with "nothing here earns credit" at a student who had just produced all
  // four correct calculations. `call2_diagnose` sees ONE message, so the flag it produces is
  // scoped to a fragment; the reveal's referent is the REQUIREMENT.
  ok('#5 MUST-FAIL: the shipped-first LAST-WRITE form is gone from the engine',
    !/newNothingCreditable = !treatCorrect/.test(engine) &&
    !/lastRealAttempt != null && lastNothingCreditable\b/.test(engine));
  ok('#5 undefined is NOT collapsed to false when reading the blob',
    /typeof o\.everCreditable === 'boolean' \? o\.everCreditable : undefined/.test(engine));
  ok('#5 the reveal tests `=== false`, never a bare falsy check',
    !/lastRealAttempt != null && !lastEverCreditable\b/.test(engine));

  // (i) CASE SURFACE ONLY. The identical praise clause sits in THREE drill-route strings, and
  //     `REVEAL_AFM_WRAPPER_SYSTEM` is a live teaching surface with its own measurement owed.
  //     A future edit that "helpfully" conditioned them too would silently widen this arm from one
  //     surface to two and make the case measurement uninterpretable. Pinned present, unchanged.
  {
    const {
      REVEAL_SYSTEM, REVEAL_SYSTEM_SOLVED, REVEAL_AFM_WRAPPER_SYSTEM,
    } = require('../lib/acca/tutor-personas');
    ok('#5 drill route: REVEAL_SYSTEM still carries the praise clause (NOT conditioned)',
      REVEAL_SYSTEM.includes(CLAUSE) && !REVEAL_SYSTEM.includes(COND));
    ok('#5 drill route: REVEAL_AFM_WRAPPER_SYSTEM still opens on credit (NOT conditioned)',
      /first credit, specifically, what they already had right;/.test(REVEAL_AFM_WRAPPER_SYSTEM) &&
      !REVEAL_AFM_WRAPPER_SYSTEM.includes(COND));
    ok('#5 drill route: the SOLVED reveal is untouched',
      /first credit, specifically, what they did well/.test(REVEAL_SYSTEM_SOLVED) &&
      !REVEAL_SYSTEM_SOLVED.includes(COND));
    // The conditioned clause must exist in EXACTLY the two case cores and nowhere else.
    const personas = require('fs').readFileSync(
      require('path').join(__dirname, '..', 'lib', 'acca', 'tutor-personas.ts'), 'utf8');
    const code = personas
      .replace(/\/\*[\s\S]*?\*\//g, (m: string) => m.replace(/[^\n]/g, ' '))
      .replace(/^([^\n]*?)\/\/[^\n]*$/gm, (_m: string, keep: string) => keep);
    ok('#5 the conditioned clause is defined ONCE and applied to the two case cores only',
      (code.match(/open on the first move the answer turns on/g) || []).length === 1 &&
      (code.match(/CASE_REVEAL_CORE_(AFM|APM)_NC = mustRecast/g) || []).length === 2);
    // POSITIVE CONTROL (P-G3): prove the comment-blanking did not simply erase the file.
    //
    // ⚠️ NOT A LENGTH RATIO ANY MORE (corrected 2026-09-01). It was
    // `code.length > personas.length * 0.5`, and it sat at 0.508 on a file whose house style is
    // deliberately comment-heavy — 0.008 of headroom. A documentation-only edit to
    // tutor-personas.ts pushed it to 0.490 and went red while the blanking was working
    // perfectly. A control that fires on PROSE changes is measuring the wrong thing, and the
    // repair a red build invites is deleting comments, which is the opposite of what this
    // file wants. It now asserts what it actually means: real code SURVIVED the blanking, and
    // comment text DID NOT.
    ok('#5 POSITIVE CONTROL: blanking preserved the code it is scanning',
      /mustRecast/.test(code) &&
      /CASE_REVEAL_CORE_AFM_NC = mustRecast/.test(code) &&
      /export function isConfirmNumberProbe/.test(code) &&
      // ...and blanking genuinely removed comment prose (this phrase is comment-only).
      /FROZEN TEXT/.test(personas) && !/FROZEN TEXT/.test(code));
  }

  // (h) THE CARRIER ROUND-TRIPS, and an absent field reads as false — every session sealed before
  //     this shipped is in that state, and reading absent as true would suppress their praise.
  {
    process.env.TUTOR_SESSION_SECRET ||= 'fixture-only-secret-not-a-real-key';
    const { sealPayload, openPayload } = require('../lib/acca/teach-engine');
    ok('#5 carrier round-trips true',  openPayload(sealPayload('a', true,  true)).everCreditable === true);
    ok('#5 carrier round-trips false', openPayload(sealPayload('a', false, false)).everCreditable === false);
    ok('#5 answer/counted survive the added field',
      openPayload(sealPayload('the answer', true, true)).answer === 'the answer' &&
      openPayload(sealPayload('the answer', true, true)).counted === true);
    // THE THREE-STATE PROPERTY, which is the whole safety argument. undefined must survive the
    // round trip as undefined — if it collapsed to false, every legacy session would assert that
    // nothing the student wrote earned credit, and the conditioned opening would fire on all of
    // them. `in` is checked as well as the value: a key present with value undefined would
    // serialise differently and is not the state being claimed.
    ok('#5 an omitted third argument stays UNDEFINED, not false',
      openPayload(sealPayload('a', false)).everCreditable === undefined);
    ok('#5 a LEGACY blob (sealed before the field existed) reads UNDEFINED, not false',
      openPayload(sealPayload('x', true)).everCreditable === undefined);
    ok('#5 undefined is not written into the sealed JSON at all',
      !JSON.stringify({ answer: 'a', counted: true, everCreditable: undefined }).includes('everCreditable'));
    ok('#5 false IS written, so "adjudicated, nothing creditable" survives the round trip',
      JSON.stringify({ answer: 'a', counted: true, everCreditable: false }).includes('"everCreditable":false'));
  }
}

console.log(`
${fail ? 'FAIL' : 'PASS'} case reveal routing: ${pass} passed, ${fail} failed
`);
if (fail) process.exitCode = 1;
