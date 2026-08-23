// scripts/test-teach-wiring.ts — the teaching loop's two surfaces must stay in step.
// Pure: no DB, no model, no network. Run: npm run test:teach-wiring
//
// ── WHY THIS EXISTS, AND WHY IT IS A SOURCE-LEVEL CHECK ──────────────────────
// `nextMoveContract` (lib/acca/teach-demand.ts) was built on 2026-08-03, fixtured thoroughly in
// test-teach-demand.ts, and wired into the DRILL route only. The CASE route imported its sibling
// `describeDemand` and nothing else. For four days the contract that stops a level-3 leg handing
// back a task the size of the original was live on drills and absent on cases — the surface with
// the longest requirements and the most to lose from it.
//
// NOTHING CAUGHT IT, and nothing was going to. test-teach-demand.ts asserts the FUNCTION is
// correct — it is, and it always was. The defect was that a second caller never called it. That
// is a wiring fact, and the only cheap way to assert a wiring fact without a live model call is
// to read the source.
//
// ── WHAT THIS CAN AND CANNOT SEE (stated, not implied) ───────────────────────
// It sees that an identifier is imported and referenced, and that a prompt fragment is
// concatenated into a leg. It does NOT see what the model does with it, and it cannot prove the
// resulting prose is better — that is a judgement, and it belongs to a reader and to the
// red-team probes. The property here is narrower and worth having on its own: NO TEACHING
// SURFACE IS SILENTLY MISSING THE CONTRACT.
//
// P-G3: every assertion names the defect it would catch.

import { readFileSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.join(__dirname, '..');
const read = (p: string) => readFileSync(path.join(ROOT, p), 'utf8');

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

const drillRoute = read('app/api/acca/tutor/route.ts');
const caseRoute  = read('app/api/acca/case/turn/route.ts');
const engine     = read('lib/acca/teach-engine.ts');

console.log('\nteach wiring — the level-3 contract reaches every teaching surface\n');

// ── 1. THE DEFECT ITSELF: a teaching surface that never calls the contract ───
// Break mode: someone adds a third teaching route, or reverts the case wiring, and level-3
// requirements quietly go back to being closed with a restatement of the whole task.
const SURFACES: ReadonlyArray<readonly [string, string]> = [
  ['drill route (app/api/acca/tutor/route.ts)', drillRoute],
  ['case route  (app/api/acca/case/turn/route.ts)', caseRoute],
];
for (const [label, src] of SURFACES) {
  ok(`${label} imports nextMoveContract`,
    /import\s*\{[^}]*\bnextMoveContract\b[^}]*\}\s*from\s*'@\/lib\/acca\/teach-demand'/s.test(src));
  ok(`${label} actually CALLS it (an unused import is not wiring)`,
    /\bnextMoveContract\s*\(/.test(src));
  ok(`${label} derives it from intellectual_level, not from a literal`,
    /nextMoveContract\(\s*(?:req|drill)\.intellectual_level/.test(src));
}

// ── 2. The engine must carry it into BOTH teaching legs ──────────────────────
// Break mode: the field is threaded into the input type and the hint leg, and someone forgets
// the teach leg — the exact leg a struggling student reaches. A type-level check cannot see
// this, because an unused destructured field compiles fine.
ok('engine: nextMove is a field of TeachTurnInput',
  /interface TeachTurnInput\b[\s\S]*?\bnextMove\?:\s*string/.test(engine));
ok('engine: BOTH teaching legs build a nextMoveLine (hint AND teach)',
  (engine.match(/const nextMoveLine = nextMove/g) ?? []).length === 2,
  `found ${(engine.match(/const nextMoveLine = nextMove/g) ?? []).length}, expected 2`);
ok('engine: BOTH legs concatenate it into the prompt body',
  (engine.match(/^\s*nextMoveLine \+$/gm) ?? []).length === 2,
  `found ${(engine.match(/^\s*nextMoveLine \+$/gm) ?? []).length}, expected 2`);
// ⚠️ WAS `/,\s*nextMove\)/` — anchored on nextMove being the LAST argument. That broke on
// 2026-08-23 when the legs gained a trailing `paper` for persona routing, reporting 0 of 3 while
// all three call sites still passed nextMove correctly. The intent is "every call site passes it",
// not "it is the final parameter", so the pin now allows a following argument. A pin that fails
// when a NEW parameter is added tests the signature's shape, not the wiring it exists to protect.
ok('engine: all THREE runTeachTurn call sites pass it (fast-teach, hint, second-miss teach)',
  (engine.match(/,\s*nextMove\s*[,)]/g) ?? []).length === 3,
  `found ${(engine.match(/,\s*nextMove\s*[,)]/g) ?? []).length}, expected 3`);
ok('engine: the case route hands it to runTeachTurn',
  /runTeachTurn\(\{[\s\S]*?\bnextMove,/.test(caseRoute));

// ── 3. Default-empty is what keeps every other caller byte-identical ─────────
// Break mode: the param is made REQUIRED, and a caller that has no level starts sending the
// literal "undefined" into a prompt, or the build breaks for an unrelated surface.
ok('engine: nextMove defaults to empty in both leg signatures',
  (engine.match(/nextMove = ''/g) ?? []).length >= 2);
ok('engine: an absent contract contributes NOTHING to the prompt (no stray blank block)',
  /nextMove \? `\$\{nextMove\}\\n\\n` : ''/.test(engine));

// ── 4. The taxonomy fence — the last header that named it ────────────────────
// Break mode: the retired header comes back, or is copied into a new leg. The VALUE was always
// safe (describeDemand output); it was the header wording that put "command verb" and
// "intellectual level" in a prompt upstream of student-facing prose.
// LIMIT: this asserts the retired literal is absent. It cannot prove a future author will not
// invent a new way to name the taxonomy — test-teach-demand.ts's isTaxonomyFree covers the
// VALUE, and this covers the one known-bad HEADER.
const RETIRED_HEADER = 'Command verb + intellectual level: ${verbLevel}';
for (const [label, src] of [...SURFACES, ['engine (lib/acca/teach-engine.ts)', engine] as const]) {
  ok(`${label} no longer carries the retired taxonomy header`,
    !src.includes(RETIRED_HEADER));
}

// ── 5. The self-assessment opener stands down once a student asks to be told ─
// Break mode: the `!plainAskedEver` term is dropped in a refactor and the tutor goes back to
// asking "which bit would you defend least?" of someone who wrote "just tell me" a turn earlier.
ok('drill route: selfAssess is gated on plainAskedEver',
  /const selfAssess = missCount >= 2 && !distressed && !plainAskedEver;/.test(drillRoute));
ok('drill route: the flag is STICKY — read from the sealed payload, not just this turn',
  /plainAskedBefore\s*=\s*payload\.plainAsked === true/.test(drillRoute));
ok('drill route: and sealed FORWARD as the sticky value, not the per-turn one',
  /sealPayload\(modelAnswer, newTeachThroughCounted, plainAskedEver\)/.test(drillRoute));
ok('drill route: suppression reads the bare phrase, NOT the paid/earned gate',
  /const plainAskedNow\s*=\s*isPlainAnswerRequest\(student_message\);/.test(drillRoute));

// ── 6. The opener-divider guard is applied, and ONLY where it is safe ────────
// Break mode: someone moves stripOpenerDivider into finishClean "for consistency", and it starts
// eating the legitimate `---` that separates sections of a reveal DOCUMENT.
ok('drill route: stripOpenerDivider is applied on the teach leg',
  /selfAssess \? stripOpenerDivider\(out\) : out/.test(drillRoute));
ok('drill route: it is NOT applied inside finishClean (that would reach the reveal)',
  !/function finishClean[\s\S]{0,400}stripOpenerDivider/.test(drillRoute));
ok('drill route: it fires only when the clause was actually asked for',
  !/stripOpenerDivider\(finishClean/.test(drillRoute));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} teach-wiring: ${pass} passed, ${fail} failed\n`);
process.exitCode = fail === 0 ? 0 : 1;
