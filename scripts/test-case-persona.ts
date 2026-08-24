// scripts/test-case-persona.ts — the case tutor's persona: paper-routed (stage 5) and, as of
// stage 6, the SHARED persona with zero divergence from the drill surface.
// Pure: no DB, no model, no network. Run: npm run test:case-persona
//
// ⚠️ WHAT STAGE 5 FIXED (2026-08-23). `lib/acca/teach-engine.ts` contained the string `paper`
// ZERO times. Its one hardcoded persona opens "You are Ezra, an APM tutor who knows exactly how
// ACCA APM is marked", and it is the system prompt for EVERY conversational leg on the case
// surface. There are **20 published AFM case requirements**, so every one of them was tutored by
// a persona introducing itself as an APM tutor and carrying APM's diagnostic frame — which
// `EZRA_AFM_SYSTEM`'s own header states "does NOT transfer" and must be "replaced wholesale".
//
// ⚠️ WHAT STAGE 6 CHANGES (2026-08-24), AND IT IS NOT A BYTE-DIFF. Stage 5 deliberately held
// APM's case prompt byte-for-byte, because adopting the shared `EZRA_SYSTEM` also imports six
// guardrail blocks the case path never received. Those blocks are now adopted,
// `EZRA_APM_CASE_SYSTEM` is DELETED, and `caseSystemFor` delegates to `systemFor`.
// **APM's live case prompt MOVES.** AFM does not: it routed to `EZRA_AFM_SYSTEM` before and after.
//
// This file's job is now threefold: prove the adoption is COMPLETE (all seven blocks, both
// papers), prove it is by IMPORT rather than transcription (one definition, no drift), and prove
// AFM did not move while APM did.

import { caseSystemFor } from '../lib/acca/teach-engine';
import {
  systemFor, EZRA_SYSTEM, EZRA_AFM_SYSTEM,
  NO_INVENTED_NUMBERS, NO_COMPUTED_OUTPUTS, NO_INVENTED_REVEAL_REFUSAL,
  DIGNITY_ON_DISTRESS, GROUNDING_DISCIPLINE, RETRACTION_PROTOCOL,
  METHOD_FITS_THE_GIVEN_INPUTS,
} from '../lib/acca/tutor-personas';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

const engine = require('fs').readFileSync(
  require('path').join(__dirname, '..', 'lib', 'acca', 'teach-engine.ts'), 'utf8');

console.log('\ncase persona — stage 6: the shared persona, adopted by import\n');

// ── 1. ZERO DIVERGENCE FROM THE DRILL SURFACE ────────────────────────────────
// The central claim of stage 6. Break mode: a second copy of the persona is reintroduced and the
// two surfaces begin to drift about what they forbid — the exact condition stage 6 exists to end.
for (const p of ['APM', 'AFM'] as const) {
  ok(`${p} case persona IS the shared persona, byte-for-byte (one definition)`,
    caseSystemFor(p) === systemFor(p));
}
ok('APM case persona is now byte-identical to the shared EZRA_SYSTEM',
  caseSystemFor('APM') === EZRA_SYSTEM);
ok('AFM case persona is byte-identical to the shared EZRA_AFM_SYSTEM (unchanged by stage 6)',
  caseSystemFor('AFM') === EZRA_AFM_SYSTEM);

// ── 2. ALL SEVEN BLOCKS, BOTH PAPERS, BYTE-EXACT ─────────────────────────────
// Asserted against the IMPORTED constants, never against a hand-typed substring: a fixture that
// pins its own transcription of a prompt block passes while the real block drifts underneath it.
const BLOCKS: ReadonlyArray<readonly [string, string]> = [
  ['NO_INVENTED_NUMBERS', NO_INVENTED_NUMBERS],
  ['NO_COMPUTED_OUTPUTS', NO_COMPUTED_OUTPUTS],
  ['NO_INVENTED_REVEAL_REFUSAL', NO_INVENTED_REVEAL_REFUSAL],
  ['DIGNITY_ON_DISTRESS', DIGNITY_ON_DISTRESS],
  ['GROUNDING_DISCIPLINE', GROUNDING_DISCIPLINE],
  ['RETRACTION_PROTOCOL', RETRACTION_PROTOCOL],
  ['METHOD_FITS_THE_GIVEN_INPUTS', METHOD_FITS_THE_GIVEN_INPUTS],
];
for (const p of ['APM', 'AFM'] as const) {
  for (const [name, body] of BLOCKS) {
    ok(`${p} case prompt carries ${name}`, caseSystemFor(p).includes(body));
  }
}

// ── 2b. THE ANCHOR POSITION IS HELD ──────────────────────────────────────────
// METHOD_FITS_THE_GIVEN_INPUTS was deliberately moved to LAST ("most-recently-read wins") when it
// was written. Break mode: a later block is appended after it and the anchor silently stops being
// the anchor — invisible to every "contains" check above.
for (const p of ['APM', 'AFM'] as const) {
  ok(`${p} case prompt ENDS on the anchor block (METHOD_FITS_THE_GIVEN_INPUTS)`,
    caseSystemFor(p).endsWith(METHOD_FITS_THE_GIVEN_INPUTS));
}
// ⚠️ RECORDED DELIBERATELY: dignity is no longer the final block on APM. It was, for exactly one
// day (shipped alone 2026-08-23, appended last to the then-local constant). Adopting the shared
// composition moves it to mid-block, which is the shipped DRILL configuration — case now matches
// drill instead of diverging. Pinned so the move is a stated fact, not a silent side effect.
ok('APM no longer ends on the dignity block (it moved to the shared mid-block position)',
  !caseSystemFor('APM').endsWith(DIGNITY_ON_DISTRESS));

// ── 3. STAGE 6 REALLY MOVED APM — THE PRE-CHANGE VALUE, PINNED MUST-FAIL ─────
// P-G3: the shipped stage-5 string, reconstructed. If APM ever equals this again, stage 6 has
// been reverted — deliberately or by a bad merge — and the guardrails are off the case surface
// while every "contains" check above would still be reporting on AFM.
const APM_HEAD =
  'You are Ezra, an APM tutor who knows exactly how ACCA APM is marked. ' +
  'Register: peer-to-peer — the student is a competent professional failing for diagnosable, ' +
  'fixable reasons, not through lack of knowledge. ';
const APM_GUARDRAIL_TAIL =
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  "No generic praise. Never complete the student's answer. ";
const STAGE_5_APM = APM_HEAD +
  'Diagnostic frame: APM candidates know the models. They lose marks on APPLICATION ' +
  '(failing to deploy the model on the specific scenario facts) and EVALUATION ' +
  '(failing to give a supported professional judgement when the verb demands one), ' +
  'and by stopping at description when the requirement demanded judgement. ' +
  'Use what the requirement demands (supplied per turn) to orient the student on what the ' +
  'question is really asking — not to deliver a verdict on them. Never name an internal grading ' +
  'taxonomy to the student: no intellectual levels, no AO framing, no command-verb labels. ' +
  'Professional scepticism — questioning assumptions, naming commercial risks, ' +
  'identifying constraints the model surfaces — is a substantive analytical move ' +
  'you teach explicitly, not a soft add-on. ' +
  APM_GUARDRAIL_TAIL + DIGNITY_ON_DISTRESS;
ok('APM case prompt is NOT the stage-5 value any more (stage 6 actually shipped)',
  caseSystemFor('APM') !== STAGE_5_APM);
ok('the stage-5 reconstruction is faithful — it shares the real prompt head',
  caseSystemFor('APM').startsWith(APM_HEAD) && STAGE_5_APM.startsWith(APM_HEAD),
  'if this fails the MUST-FAIL pin above is vacuous — it would differ for the wrong reason');

// ── 4. THE BASE REGISTER SURVIVED THE ADOPTION ───────────────────────────────
// Break mode: "adopt the shared persona" is implemented by REPLACING rather than composing, and
// APM's register/diagnostic frame is silently rewritten inside a change advertised as additive.
ok('APM case prompt still starts with the pre-change head',
  caseSystemFor('APM').startsWith(APM_HEAD));
ok('APM case prompt still contains the pre-change GUARDRAIL line',
  caseSystemFor('APM').includes(APM_GUARDRAIL_TAIL));
ok('APM case prompt still carries the APM diagnostic frame',
  caseSystemFor('APM').includes('APM candidates know the models'));
ok('APM case prompt is strictly LONGER than the stage-5 value (blocks added, not swapped)',
  caseSystemFor('APM').length > STAGE_5_APM.length);

// ── 5. THE DIGNITY GUARANTEES, UNCHANGED BY THE REORDER ──────────────────────
// Shipped 2026-08-23 on its own. Break mode: the reorder drops it on one paper and a distressed
// student gets a commercial nudge again.
for (const p of ['APM', 'AFM'] as const) {
  ok(`${p} forbids a reveal offer to a distressed student`,
    /do NOT offer to reveal/.test(caseSystemFor(p)));
  ok(`${p} forbids a subscription nudge to a distressed student`,
    /do NOT nudge a subscription/.test(caseSystemFor(p)));
}

// ── 6. AFM STILL DIFFERS, AND STILL ROUTES CORRECTLY ─────────────────────────
// Break mode: stage 6 collapses both papers onto EZRA_SYSTEM and reinstates the stage-5 defect —
// 20 AFM requirements tutored by an APM persona — inside a change that looks like consolidation.
ok('AFM case prompt DIFFERS from APM', caseSystemFor('AFM') !== caseSystemFor('APM'));
ok('AFM prompt does not introduce Ezra as an APM tutor',
  !caseSystemFor('AFM').includes('an APM tutor'));
ok('AFM prompt does not carry the APM diagnostic frame',
  !caseSystemFor('AFM').includes('APM candidates know the models'));

// ── 7. THE DEFAULT IS APM, SO NO EXISTING CALLER MOVED ───────────────────────
// Break mode: an unknown or absent paper falls to the AFM persona, and an APM case is tutored as
// AFM — the original defect, mirrored.
for (const p of ['apm', '', 'SBL', 'AFM ', 'afm', 'nonsense'] as const) {
  ok(`"${p}" does NOT route to AFM (only an exact 'AFM' does)`,
    caseSystemFor(p) === EZRA_SYSTEM);
}

// ── 8. IMPORTED, NEVER TRANSCRIBED ───────────────────────────────────────────
// The user-facing claim of this stage: ONE definition, so drill and case cannot drift about what
// they forbid. Break mode: a future edit "fixes" a block on the case surface by pasting an
// adjusted copy into the engine, and the two surfaces begin to forbid different things while
// every equality check above still passes on the copy.
ok('the engine imports the shared selector rather than defining a persona',
  /import \{[^}]*\bsystemFor\b[^}]*\} from '\.\/tutor-personas'/.test(engine));
ok('the engine no longer defines a case-local persona constant',
  !/^export const EZRA_APM_CASE_SYSTEM\s*=/m.test(engine));
// Each block's opening words, searched for in the ENGINE source. Any hit means someone
// transcribed a block body into this module instead of importing it.
for (const [name, body] of BLOCKS) {
  ok(`${name} is not transcribed into the engine`, !engine.includes(body.slice(0, 40)));
}

// ── 9. THE WIRING, PINNED ────────────────────────────────────────────────────
// The unit checks prove the router is right and cannot prove it is REACHED — the defect class
// that produced every false green in this thread.
{
  const route = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'app', 'api', 'acca', 'case', 'turn', 'route.ts'), 'utf8');
  ok('every leg uses caseSystemFor(paper) — no leg left on a hardcoded persona',
    !/system:\s*EZRA_[A-Z_]*SYSTEM/.test(engine)
    && (engine.match(/system: caseSystemFor\(paper\)/g) ?? []).length === 4);
  ok('runTeachTurn accepts paper and defaults it to APM',
    /paper\?: string;/.test(engine) && /paper = 'APM',/.test(engine));
  // ⚠️ CRLF-TOLERANT ON PURPOSE. These files are CRLF on this machine, and an `\n`-anchored pin
  // fails on a line that is present and correct — a false RED, which wastes the same time a false
  // green does and teaches the next reader to distrust the suite.
  ok('the case route passes paper into runTeachTurn', /^\s*paper,\s*$/m.test(route));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} case persona: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
