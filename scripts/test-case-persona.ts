// scripts/test-case-persona.ts — the case tutor's persona is now paper-routed.
// Pure: no DB, no model, no network. Run: npm run test:case-persona
//
// ⚠️ WHAT THIS FIXES. `lib/acca/teach-engine.ts` contained the string `paper` ZERO times. Its one
// hardcoded persona opens "You are Ezra, an APM tutor who knows exactly how ACCA APM is marked",
// and it is the system prompt for EVERY conversational leg on the case surface. There are **20
// published AFM case requirements**, so every one of them was tutored by a persona introducing
// itself as an APM tutor and carrying APM's diagnostic frame — which `EZRA_AFM_SYSTEM`'s own
// header states "does NOT transfer" and must be "replaced wholesale, never blended".
//
// STAGE 5 SCOPE, AND THE LINE IS DELIBERATE: AFM routes to the shared AFM persona; APM keeps the
// local string BYTE-FOR-BYTE. Adopting the shared `EZRA_SYSTEM` for APM would also import seven
// guardrail blocks the case path never received (NO_INVENTED_NUMBERS, NO_COMPUTED_OUTPUTS,
// NO_INVENTED_REVEAL_REFUSAL, DIGNITY_ON_DISTRESS, GROUNDING_DISCIPLINE, RETRACTION_PROTOCOL,
// METHOD_FITS_THE_GIVEN_INPUTS) — that CHANGES APM's live prompt and is stage 6, with its own
// measurement. This file's job is to prove stage 5 did not touch APM.

import { caseSystemFor, EZRA_APM_CASE_SYSTEM } from '../lib/acca/teach-engine';
import { EZRA_AFM_SYSTEM, EZRA_SYSTEM, DIGNITY_ON_DISTRESS } from '../lib/acca/tutor-personas';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

console.log('\ncase persona — paper-routed, APM byte-identical\n');

// ── 1. THE BYTE-DIFF THIS STAGE IS BARRED ON ─────────────────────────────────
// Transcribed from the pre-change constant. Break mode: the "rename, don't rewrite" claim is
// false and APM's live case prompt moved inside a change advertised as an AFM correctness fix.
const APM_HEAD =
  'You are Ezra, an APM tutor who knows exactly how ACCA APM is marked. ' +
  'Register: peer-to-peer — the student is a competent professional failing for diagnosable, ' +
  'fixable reasons, not through lack of knowledge. ';
const APM_TAIL =
  'GUARDRAIL: sharp about the work, never about the person. Never demoralising. ' +
  "No generic praise. Never complete the student's answer.";

ok('APM case prompt is UNCHANGED — starts with the pre-change head',
  caseSystemFor('APM').startsWith(APM_HEAD));
// ⚠️ UPDATED 2026-08-23 when DIGNITY_ON_DISTRESS shipped to APM on its own. The pre-change tail
// must still be PRESENT — nothing was rewritten — but it is no longer FINAL, because the dignity
// block is appended after it. Both halves are asserted so a future edit cannot quietly drop the
// original tail while the "ends with dignity" check still passes.
ok('APM case prompt still CONTAINS the pre-change tail (nothing was rewritten)',
  caseSystemFor('APM').includes(APM_TAIL));
ok('APM case prompt now ENDS with the dignity block',
  caseSystemFor('APM').endsWith(DIGNITY_ON_DISTRESS));
ok('APM routes to the LOCAL constant, byte-for-byte',
  caseSystemFor('APM') === EZRA_APM_CASE_SYSTEM);

// ⚠️ THE CENTRAL ASSERTION OF STAGE 5. If APM ever equals the shared EZRA_SYSTEM, stage 6 has
// happened — deliberately or by accident — and APM's live prompt has moved by seven guardrail
// blocks. That is a real change and it must not arrive inside this stage.
ok('APM does NOT silently adopt the shared EZRA_SYSTEM (that is stage 6, and it is measured)',
  caseSystemFor('APM') !== EZRA_SYSTEM);
// `distress` is DELIBERATELY NOT in this list any more — DIGNITY_ON_DISTRESS shipped alone on
// 2026-08-23, ahead of stage 6, because it is a WELLBEING gap and does not belong in a
// fabrication measurement. The remaining six blocks are still stage 6.
for (const block of [
  'never invent', 'retract', 'concede',
] as const) {
  ok(`APM case prompt still lacks the shared block containing "${block}" (stage 6 territory)`,
    !caseSystemFor('APM').toLowerCase().includes(block));
}

// ── 1b. THE DIGNITY BLOCK IS LIVE ON BOTH PAPERS ─────────────────────────────
// Break mode: it lands on one paper only and a distressed student on the other still gets a
// commercial nudge — which is exactly the state APM was in until this shipped.
for (const p of ['APM', 'AFM'] as const) {
  ok(`${p} case prompt carries the dignity block`,
    caseSystemFor(p).includes(DIGNITY_ON_DISTRESS));
  ok(`${p} forbids a reveal offer to a distressed student`,
    /do NOT offer to reveal/.test(caseSystemFor(p)));
  ok(`${p} forbids a subscription nudge to a distressed student`,
    /do NOT nudge a subscription/.test(caseSystemFor(p)));
}
// One definition, imported — not transcribed into the engine, so the two surfaces cannot drift
// about what counts as distress or what is forbidden on that turn.
{
  const eng = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'lib', 'acca', 'teach-engine.ts'), 'utf8');
  ok('the engine IMPORTS the block rather than transcribing it',
    /import \{[^}]*DIGNITY_ON_DISTRESS[^}]*\} from '\.\/tutor-personas'/.test(eng)
    && !/DIGNITY FIRST — if the student signals/.test(eng));
}

// ── 2. AFM NOW DIFFERS, AND ROUTES TO THE PAPER-CORRECT PERSONA ──────────────
// Break mode: the routing is added but AFM still lands on the APM persona — the whole defect,
// surviving a change that claims to fix it.
ok('AFM case prompt DIFFERS from APM', caseSystemFor('AFM') !== caseSystemFor('APM'));
ok('AFM routes to the shared AFM persona', caseSystemFor('AFM') === EZRA_AFM_SYSTEM);
ok('AFM prompt no longer introduces Ezra as an APM tutor',
  !caseSystemFor('AFM').includes('an APM tutor'));
ok('AFM prompt does not carry the APM diagnostic frame',
  !caseSystemFor('AFM').includes('APM candidates know the models'));

// ── 3. THE DEFAULT IS APM, SO NO EXISTING CALLER MOVED ───────────────────────
// Break mode: an unknown or absent paper falls to the AFM persona, and an APM case is tutored
// as AFM — the original defect, mirrored.
for (const p of ['APM', 'apm', '', 'SBL', 'AFM ', 'afm', 'nonsense'] as const) {
  if (p === 'APM') continue;
  ok(`"${p}" does NOT route to AFM (only an exact 'AFM' does)`,
    caseSystemFor(p) === EZRA_APM_CASE_SYSTEM);
}

// ── 4. THE WIRING, PINNED ────────────────────────────────────────────────────
// The unit checks prove the router is right and cannot prove it is REACHED — the defect class
// that produced every false green this week.
{
  const eng = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'lib', 'acca', 'teach-engine.ts'), 'utf8');
  const route = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'app', 'api', 'acca', 'case', 'turn', 'route.ts'), 'utf8');
  ok('every leg uses caseSystemFor(paper) — no leg left on a hardcoded persona',
    !/system:\s*EZRA_APM_CASE_SYSTEM/.test(eng)
    && (eng.match(/system: caseSystemFor\(paper\)/g) ?? []).length === 4);
  ok('runTeachTurn accepts paper and defaults it to APM',
    /paper\?: string;/.test(eng) && /paper = 'APM',/.test(eng));
  // ⚠️ CRLF-TOLERANT ON PURPOSE. These files are CRLF on this machine, and an `\n`-anchored
  // pin fails on a line that is present and correct — a false RED, which wastes the same time
  // a false green does and teaches the next reader to distrust the suite.
  ok('the case route passes paper into runTeachTurn', /^\s*paper,\s*$/m.test(route));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} case persona: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
