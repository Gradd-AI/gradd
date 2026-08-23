// scripts/test-hint-opening.ts — the guard label and the opening it feeds.
// Pure: no DB, no model, no network. Run: npm run test:hint-opening
//
// P-G3: every assertion names the defect it would catch, and the SHIPPED strings are pinned
// BYTE-IDENTICAL so the historical baseline (38/40 credited) survives the refactor and so a
// variant cannot silently reword the live prompt.

import {
  guardLabel, hintOpeningInstruction, gapEstablishesNothingCorrect, UNVERIFIED_MARKER,
  guardBlock, unsubstantiatedLabel,
} from '../lib/acca/hint-opening';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

console.log('\nhint opening — the label states what was NOT established\n');

// ── 1. SHIPPED IS PINNED BYTE-IDENTICAL ──────────────────────────────────────
// Break mode: a refactor "tidies" the live prompt while claiming to be variant-only, and the
// pooled 38/40 baseline stops describing anything that exists.
const SHIPPED_LABEL = 'states a figure but shows no working — cannot be credited';
const SHIPPED_OPENING =
  'First miss. Lead with the ONE specific thing they got right — name the real move, not ' +
  'vague praise — then name the single sharpest gap (just one, not a list) and one next ' +
  'move. ';
ok('shipped guard label is byte-identical to the pre-change string',
  guardLabel('shipped') === SHIPPED_LABEL, JSON.stringify(guardLabel('shipped')));
ok('shipped opening is byte-identical to the pre-change string',
  hintOpeningInstruction('shipped', false) === SHIPPED_OPENING);
ok('shipped opening is UNCHANGED even when nothing was established (variant, not condition)',
  hintOpeningInstruction('shipped', true) === SHIPPED_OPENING);

// ── 2. (a) THE LABEL NAMES THE SKIPPED DIMENSION ─────────────────────────────
// Break mode: the new label is silent about the figure, which is the whole defect.
{
  const l = guardLabel('unverified');
  ok('(a) new label still names the form problem', /shows no working/.test(l));
  ok('(a) new label NAMES THE FIGURE as unverified — the defect it exists to close',
    l.includes(UNVERIFIED_MARKER) && /figure/i.test(l));
  ok('(a) new label keeps "cannot be credited" (the part that was already true)',
    l.includes('cannot be credited'));
  ok('(a) new label does NOT state what the correct answer is (the moat holds)',
    !/positive|negative|correct answer|actually/i.test(l));
  ok('(a) the two labels differ', l !== SHIPPED_LABEL);
}

// ── 3. THE BRANCH IS CODE-SELECTED FROM THE LABEL ────────────────────────────
// Break mode: the marker drifts out of the label, the match silently never fires, and (b) is
// dead code that still reports as wired.
ok('the new label is detected by the matcher (label and matcher cannot drift apart)',
  gapEstablishesNothingCorrect(guardLabel('unverified')));
ok('the OLD label is not detected (it establishes nothing either, but says so nowhere)',
  !gapEstablishesNothingCorrect(guardLabel('shipped')));
for (const real of [
  'Student computed EVA as negative when it is actually positive, reaching the wrong conclusion.',
  'confuses contribution with gross margin in the divisional comparison',
  'answer correct — convention differs from model only',
  '',
]) {
  ok(`a genuine gap label does not trigger the branch: "${real.slice(0, 40)}…"`,
    !gapEstablishesNothingCorrect(real));
}

// ── 4. (b) THE REPLACEMENT IS POSITIVE, NOT A PROHIBITION ────────────────────
// Break mode, and it is the one that has ALREADY happened once in this codebase: a clause that
// NAMES the unwanted output primes it. P-M4 measured an added restatement DOUBLING the leak it
// was written to cut (z = −3.65). A first draft of this variant said "do NOT open by naming
// something they got right" and was rewritten for exactly that reason.
{
  const c = hintOpeningInstruction('conditional', true);
  ok('(b) replacement is actually different from shipped', c !== SHIPPED_OPENING);
  ok('(b) replacement NEVER mentions praise / what they got right (P-T2, P-M4)',
    !/got right|praise|correct(ly)?\b|well done|credit/i.test(c),
    c);
  ok('(b) replacement contains NO prohibition at all',
    !/\bdo not\b|\bdon't\b|\bnever\b|\bavoid\b/i.test(c), c);
  ok('(b) replacement gives a SATISFIABLE positive job (an opening it can actually write)',
    /open on/i.test(c));
  ok('(b) replacement still demands one gap and one next move (the rest of the leg is unchanged)',
    /single sharpest gap/.test(c) && /one next move/.test(c));
  ok('(b) is NOT applied when the gap established something (ordinary first miss is untouched)',
    hintOpeningInstruction('conditional', false) === SHIPPED_OPENING);
}

// ── 5. COMPOSITION — (b) cannot fire without (a) ─────────────────────────────
// Break mode: shipping (b) alone. The branch is keyed on (a)'s marker, so with the shipped label
// it can never trigger — worth asserting so nobody ships (b) expecting an effect.
ok('(b) alone is INERT: the shipped label never triggers the branch',
  hintOpeningInstruction('conditional', gapEstablishesNothingCorrect(guardLabel('shipped'))) === SHIPPED_OPENING);
ok('(a)+(b) together DO trigger it',
  hintOpeningInstruction('conditional', gapEstablishesNothingCorrect(guardLabel('unverified'))) !== SHIPPED_OPENING);
ok('(a) alone leaves the opening at shipped (so the arms are genuinely separable)',
  hintOpeningInstruction('shipped', gapEstablishesNothingCorrect(guardLabel('unverified'))) === SHIPPED_OPENING);

// ── 4b. (c) NOTHING CREDITABLE — the third state, and (b) keeps precedence ───
// Break modes: (c) silently re-words (b), whose 10%-credited rate is the only measured opening we
// have; or (c) reuses (b)'s numeric wording on a discursive drill, telling a candidate answering
// an "advise the board" requirement to put arithmetic on the page.
{
  const c = hintOpeningInstruction('conditional', false, true);
  ok('(c) fires when nothing is creditable and derived did NOT fire', c !== SHIPPED_OPENING);
  ok('(c) is a DISTINCT opening, not (b) reused',
    c !== hintOpeningInstruction('conditional', true, false));
  ok('(c) is SHAPE-NEUTRAL — no figure/arithmetic/working language (it serves discursive drills)',
    !/figure|arithmetic|working|checkable|compute/i.test(c), c);
  ok('(c) contains NO prohibition (P-T2/P-M4)',
    !/\bdo not\b|\bdon't\b|\bnever\b|\bavoid\b/i.test(c), c);
  ok('(c) never mentions praise or what they got right',
    !/got right|praise|well done/i.test(c), c);
  ok('(c) gives a SATISFIABLE positive job', /Open on the first thing that would/.test(c));
  ok('(c) still demands one gap and one next move',
    /single sharpest gap/.test(c) && /one next move/.test(c));
  // PRECEDENCE: (b) wins where it applies, so nothing measured changes shape.
  ok('(b) KEEPS PRECEDENCE when both conditions hold',
    hintOpeningInstruction('conditional', true, true) === hintOpeningInstruction('conditional', true, false));
  ok('neither condition → shipped opening, unchanged',
    hintOpeningInstruction('conditional', false, false) === SHIPPED_OPENING);
  ok('the shipped VARIANT ignores (c) entirely (env rollback is total)',
    hintOpeningInstruction('shipped', false, true) === SHIPPED_OPENING);
  // Default parameter: every pre-existing caller keeps its exact behaviour.
  ok('(c) defaults FALSE — an omitted argument changes nothing',
    hintOpeningInstruction('conditional', false) === SHIPPED_OPENING
    && hintOpeningInstruction('conditional', true) === hintOpeningInstruction('conditional', true, false));
}

// ── 5b. THE GUARD BLOCK: shipped scope pinned, rewritten scope characterised ─
// The whole guard block moved OUT of the route and into this module so the trigger and the label
// it emits cannot drift apart. `shipped` is transcribed here from the route's pre-move text and
// asserted byte-identical — that is what makes the move a refactor rather than a silent reword of
// a prompt whose behaviour is measured at 50%.
const SHIPPED_GUARD_HEAD =
  'BARE-GUESS GUARD (do this before the equivalence check) — NUMERIC drills only: if the message ' +
  'states ONLY a final answer VALUE or asks whether a value is right ("is it about 51 million?", ' +
  '"the answer is X, yes?", a lone number) with NO working, method, or reasoning shown, it is NOT ' +
  'a markable correct answer even if the value matches. This guard does NOT apply to a narrative/ ' +
  'discursive claim — a short but substantively correct interpretive statement (e.g. "VaR is a ' +
  'threshold, not a ceiling") is a genuine claim to equivalence-check, not a bare guess, even when ' +
  'terse; narrative claims carry no numeric "working" to show. When the bare-guess guard genuinely ' +
  'fires (a numeric value-only guess), output the gap label: ';
ok('shipped guard block is byte-identical to the route\'s pre-move text',
  guardBlock('shipped', 'unverified') ===
    `${SHIPPED_GUARD_HEAD}"${guardLabel('unverified')}" (NEVER the correct sentinel). `);
ok('shipped guard block still carries the shipped LABEL variant when asked for it',
  guardBlock('shipped', 'shipped').includes(guardLabel('shipped')));

// The rewritten trigger. Break mode: the rewrite quietly keeps the old predicate, or bolts the new
// one on beside it (P-T2 — an added instruction primes what it names; measured at z = −3.65).
{
  const g = guardBlock('unsubstantiated', 'unverified');
  ok('rewrite REPLACES the old scope — "a lone number" is gone, not fenced',
    !g.includes('a lone number') && !g.includes('states ONLY a final answer VALUE'));
  ok('rewrite names the predicate that matches the harm (assert without deriving)',
    /asserts a CONCLUSION/.test(g) && /without deriving it/.test(g));
  ok('rewrite names DESCRIBING a method as not working — the harm turn\'s exact move',
    /DESCRIPTION of working, not working/.test(g));
  ok('rewrite names scenario-supplied figures as not a derivation',
    /SCENARIO supplied/.test(g));
  ok('rewrite re-cuts the carve-out on REQUIREMENT kind, not on register',
    /REQUIREMENT\s*kind, not to the register/.test(g));
  ok('rewrite keeps the interpretive carve-out (it protects the discursive drills)',
    /INTERPRETATION rather than computation/.test(g) && /threshold, not a ceiling/.test(g));
  ok('rewrite emits the generalised label, not the figure-shaped one',
    g.includes(unsubstantiatedLabel('unverified')) && !g.includes(guardLabel('unverified')));
  ok('the two scopes differ', g !== guardBlock('shipped', 'unverified'));
}

// THE MARKER SURVIVES THE REWRITE. Break mode, and it is silent: the label generalises off
// "states a figure", the sentinel goes with it, `gapEstablishesNothingCorrect` stops matching, and
// the conditional opening becomes dead code that still reports as wired.
ok('rewritten label preserves UNVERIFIED_MARKER (the code-selected branch keeps working)',
  gapEstablishesNothingCorrect(unsubstantiatedLabel('unverified')));
ok('rewritten label at the SHIPPED label variant does NOT carry the marker (arms stay separable)',
  !gapEstablishesNothingCorrect(unsubstantiatedLabel('shipped')));
ok('rewritten label states no correct answer (the moat holds through the rewrite)',
  !/positive|negative|actually|correct answer/i.test(unsubstantiatedLabel('unverified')));
ok('rewritten label drops "states a figure" — the harm turn states none',
  !unsubstantiatedLabel('unverified').includes('states a figure'));

// ── 6. THE LIVE ARM IS PINNED, AND SO IS ITS REVERSIBILITY ───────────────────
// A STATIC SWEEP of the route, not a behavioural test — the unit checks above prove the two
// variants are RIGHT and cannot prove WHICH ONE IS SERVED, which is the only thing a reader of
// the 95% → 50% claim actually needs to know. Same reasoning as test:paper-link-sweep.
//
// Break modes, both of which have a real cost:
//   • the default is reverted (or drifts) while the doc and the commit still cite 50% — the
//     measured claim then describes an arm nobody is running;
//   • the env read is "tidied" into a hardcoded literal, and the stated rollback
//     (TUTOR_GUARD_LABEL=shipped, no deploy) silently stops working — which is exactly the
//     property that made shipping a measured-but-imperfect mitigation acceptable.
{
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'app', 'api', 'acca', 'tutor', 'route.ts'), 'utf8');
  for (const [envName, expected] of [
    ['TUTOR_GUARD_LABEL', 'unverified'],
    ['TUTOR_HINT_OPENING', 'conditional'],
    // Flipped 2026-08-23 on n=40 per arm: echo 55% → 100%, credited 45% → 10% (p < 0.001).
    ['TUTOR_GUARD_SCOPE', 'unsubstantiated'],
  ] as const) {
    // Matches `process.env.<NAME>  ?? '<default>'` with any run of spaces, as the route aligns them.
    const m = src.match(new RegExp(`process\\.env\\.${envName}\\s*\\?\\?\\s*'([a-z]+)'`));
    ok(`route reads ${envName} from the env (rollback needs no deploy)`, m !== null);
    ok(`route's ${envName} default is the decided arm '${expected}'`,
      m?.[1] === expected, `found ${JSON.stringify(m?.[1])}`);
  }
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} hint opening: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
