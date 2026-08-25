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
} from '../lib/acca/tutor-personas';
import { caseRevealSystem } from '../lib/acca/teach-engine';

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
ok('the orchestrator passes the real paper to call4_reveal',
  /call4_reveal\(question, context, lastRealAttempt \?\? studentMessage, lastDiagnosis \?\? '', modelAnswer, paper\)/.test(engine));
ok('the arm has its OWN env var, defaulting to routed',
  /process\.env\.TUTOR_CASE_REVEAL \?\? 'routed'/.test(engine));

// ── 7. THE CORES ARE SIBLINGS, NOT DIVERGENT REWRITES ───────────────────────
// Everything after the opening register must match clause for clause, or "AFM voice" has quietly
// become "a different reveal design" — which is a content change needing its own measurement.
const tailApm = CASE_REVEAL_CORE_APM.slice(CASE_REVEAL_CORE_APM.indexOf('Show them how a'));
const tailAfm = CASE_REVEAL_CORE_AFM.slice(CASE_REVEAL_CORE_AFM.indexOf('Show them how a'));
ok('APM and AFM cores are identical from "Show them how a" onward', tailApm === tailAfm);
ok('AFM does NOT adopt the drill route design "B" (no verbatim-append instruction)',
  !/appends it, VERBATIM/.test(CASE_REVEAL_CORE_AFM));

console.log(`\n${fail ? 'FAIL' : 'PASS'} case reveal routing: ${pass} passed, ${fail} failed\n`);
if (fail) process.exitCode = 1;
