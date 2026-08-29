// scripts/test-case-envelope.ts — DIVERGENCE #2: the case surface gets the gap-verdict ENVELOPE,
// and `creditable` conditions the hint opening.
// Pure: no DB, no model, no network. Run: npm run test:case-envelope
//
// ⚠️ WHAT THIS IS FOR. P-T4 (2026-08-24): a guardrail changes the SHAPE of a fabrication; only the
// envelope changes whether one is DEMANDED. Stage 6 adopted six guardrail blocks onto the case
// tutor and the primary endpoint did not move — 40/40 openings still manufactured a credit —
// because `call3_hint`'s praise-first instruction ("Lead with the ONE specific thing they got
// right") is UNCONDITIONAL on 34 of 38 published requirements. This wires the one field that can
// condition it.
//
// ⚠️ THE CLAIM UNDER TEST IS NARROW AND IT IS A BYTE CLAIM: with `creditable` absent or 1, the
// assembled opening is byte-identical to what ships today, so anything the arm measures is
// attributable to the `creditable === 0` branch alone.

import { caseHintOpening } from '../lib/acca/teach-engine';
import { hintOpeningInstruction } from '../lib/acca/hint-opening';
import { parseGapVerdict, nothingCreditable, GAP_VERDICT_FORMAT } from '../lib/acca/gap-verdict';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

const engine = require('fs').readFileSync(
  require('path').join(__dirname, '..', 'lib', 'acca', 'teach-engine.ts'), 'utf8');

console.log('\ncase envelope — creditable conditions the hint opening\n');

// ── 1. THE SHIPPED OPENING, PINNED BYTE-IDENTICAL ────────────────────────────
// Transcribed from the pre-change constant in teach-engine.ts. Break mode: the refactor to a
// shared builder silently re-words the live case prompt, and every number measured against it —
// before or after — describes a string that no longer exists.
const SHIPPED_CASE_OPENING =
  'First miss. Lead with the ONE specific thing they got right — name the real move, ' +
  'not vague praise — then name the single sharpest gap (just one, not a list) and ' +
  'one next move.';

ok('no-contradiction + creditable UNKNOWN → byte-identical to the shipped opening',
  caseHintOpening('conditional', false, false) === SHIPPED_CASE_OPENING,
  JSON.stringify(caseHintOpening('conditional', false, false)));
ok('the `shipped` variant ignores creditable entirely',
  caseHintOpening('shipped', false, true) === SHIPPED_CASE_OPENING);
// ⚠️ THE DOUBLE-SPACE TRAP. The caller appends " Punchy and conversational…" WITH a leading
// space; every hintOpeningInstruction arm ends WITH a trailing space. Without the trim every case
// turn silently gains a double space — a one-character edit to a live prompt, made while
// measuring that prompt.
for (const [label, s] of [
  ['shipped', caseHintOpening('conditional', false, false)],
  ['creditable=0', caseHintOpening('conditional', false, true)],
  ['contradiction', caseHintOpening('conditional', true, false)],
] as const) {
  ok(`${label} arm does not end in whitespace (no double space when the tail is appended)`,
    s === s.trimEnd() && s.length > 0);
}

// ── 2. THE CONTRADICTION ARM KEEPS PRECEDENCE AND ITS BYTES ──────────────────
// It is the only arm on this surface with a measured baseline (4/20 → 12/20). Break mode: the new
// creditable arm is ordered first, and the one opening whose rate is known is silently replaced.
const CONTRADICTION_ARM =
  'First miss, and the answer is on the WRONG SIDE of a settled choice stated above. ' +
  'Do NOT open by crediting them with that choice — they did not make it. Say plainly ' +
  'which way round it actually goes and why, then give one next move. If something ' +
  'else in their work is genuinely right you may say so, but never the thing the ' +
  'contradiction names.';
ok('contradiction arm is byte-identical to the pre-change string',
  caseHintOpening('conditional', true, false) === CONTRADICTION_ARM);
ok('contradiction WINS over creditable=0 (code-owned finding outranks a model-reported field)',
  caseHintOpening('conditional', true, true) === CONTRADICTION_ARM);
ok('contradiction wins under the shipped variant too',
  caseHintOpening('shipped', true, true) === CONTRADICTION_ARM);

// ── 3. THE CREDITABLE ARM ACTUALLY FIRES, AND IS THE IMPORTED ONE ────────────
// Break mode: the arm is wired but returns the shipped string, so the measurement reports "no
// effect" from a branch that never changed anything.
const creditableArm = caseHintOpening('conditional', false, true);
ok('creditable=0 produces a DIFFERENT opening from shipped',
  creditableArm !== SHIPPED_CASE_OPENING);
ok('creditable=0 opening is hint-opening.ts (c), not a local copy',
  creditableArm === hintOpeningInstruction('conditional', false, true).trimEnd());
// The (c) arm's whole point (P-T2/P-M4/P-T4): it does not FORBID praise, it replaces the demand
// with a satisfiable one. Break mode: someone "strengthens" it into a prohibition, which is the
// form measured backfiring at z = −3.65.
ok('the creditable arm names no prohibition — it replaces the demand, it does not ban praise',
  !/do not|don't|never/i.test(creditableArm),
  creditableArm);
ok('the creditable arm demands something satisfiable on an answer with nothing to credit',
  /nothing in the answer yet earns credit/.test(creditableArm));

// ── 4. `derived` IS PARSED BUT NOT WIRED — THE ARM IS ONE VARIABLE ───────────
// Break mode: both envelope fields get wired at once and no movement is attributable to either,
// which is exactly the N-way unattributability P-T4 was banked to prevent.
{
  const derivedZero = parseGapVerdict('{"derived":0,"label":"asserts a conclusion with no working","creditable":1}');
  ok('derived=0 parses', derivedZero?.derived === 0);
  ok('derived=0 with creditable=1 → nothingCreditable false', nothingCreditable(derivedZero) === false);
  ok('derived=0 with creditable=1 → the SHIPPED opening (derived is not wired here)',
    caseHintOpening('conditional', false, nothingCreditable(derivedZero)) === SHIPPED_CASE_OPENING);
  ok('the engine passes hard-false for nothingEstablished, never a derived-derived value',
    /hintOpeningInstruction\(variant, false, nothingCreditableNow\)/.test(engine));
}

// ── 5. ABSENT MEANS NO CLAIM, NEVER "NOTHING CREDITABLE" ────────────────────
// Break mode: a missing or malformed field is coerced to 0, and a student who did good work is
// told there was nothing worth leading with — the one failure this arm must never produce.
for (const [label, raw] of [
  ['creditable absent', '{"derived":1,"label":"stops at description, no evaluation"}'],
  ['creditable null', '{"derived":1,"label":"x y z","creditable":null}'],
  ['creditable "0" as a string', '{"derived":1,"label":"x y z","creditable":"0"}'],
  ['creditable true', '{"derived":1,"label":"x y z","creditable":true}'],
  ['creditable 2', '{"derived":1,"label":"x y z","creditable":2}'],
] as const) {
  const v = parseGapVerdict(raw);
  ok(`${label} → nothingCreditable false → shipped opening`,
    nothingCreditable(v) === false
    && caseHintOpening('conditional', false, nothingCreditable(v)) === SHIPPED_CASE_OPENING);
}
ok('an unparseable body → null → shipped opening (degrades to today, never suppresses praise)',
  nothingCreditable(parseGapVerdict('not json at all')) === false
  && caseHintOpening('conditional', false, nothingCreditable(parseGapVerdict('not json at all'))) === SHIPPED_CASE_OPENING);
ok('creditable=0 is the ONLY value that arms the suppression',
  nothingCreditable(parseGapVerdict('{"derived":1,"label":"x y z","creditable":0}')) === true);

// ── 6. THE WIRING, PINNED ────────────────────────────────────────────────────
// The unit checks prove the builder is right and cannot prove it is REACHED — the defect class
// behind every false green in this thread.
{
  ok('call2_diagnose returns the envelope, not a bare string',
    /Promise<\{ label: string; verdict: GapVerdict \| null \}>/.test(engine));
  ok('the engine IMPORTS the format block rather than transcribing it',
    /import \{[\s\S]{0,200}GAP_VERDICT_FORMAT[\s\S]{0,200}\} from '\.\/gap-verdict'/.test(engine)
    && !engine.includes(GAP_VERDICT_FORMAT.slice(0, 60)));
  ok('the hint leg is called with the creditable flag',
    /completenessGap \? false : gapNothingCreditable/.test(engine));
  ok('max_tokens was raised off 40 — a JSON envelope cannot fit the old label cap',
    /max_tokens: 160,/.test(engine) && !/max_tokens: 40,/.test(engine));
  ok('the label reaching downstream is safeLabel(...), never the raw body',
    /return \{ label: safeLabel\(verdict, raw\), verdict \}/.test(engine));
  ok('the parse outcome is logged so a run can prove the envelope actually parsed',
    /at: 'case_gap_verdict'/.test(engine));
  ok('the case arm has its OWN env var, not the drill route\'s',
    /TUTOR_CASE_HINT_OPENING/.test(engine) && !/process\.env\.TUTOR_HINT_OPENING/.test(engine));
  ok('the case arm defaults to conditional',
    /process\.env\.TUTOR_CASE_HINT_OPENING \?\? 'conditional'/.test(engine));
}

// ── 7. THE COMPLETENESS-GATE INTERACTION ─────────────────────────────────────
// Break mode: call2 says CORRECT, the completeness gate demotes it for a missing component, and
// the opening announces "nothing here earns credit" about an answer just judged correct — using a
// creditable value computed BEFORE the demotion, about a different question.
ok('a completeness-gate demotion suppresses the creditable arm (falls back to shipped)',
  caseHintOpening('conditional', false, false) === SHIPPED_CASE_OPENING);
ok('...and the engine encodes that, rather than passing the stale flag through',
  /completenessGap \? false : gapNothingCreditable/.test(engine));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} case envelope: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
