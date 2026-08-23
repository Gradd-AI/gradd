// scripts/test-hint-opening.ts — the guard label and the opening it feeds.
// Pure: no DB, no model, no network. Run: npm run test:hint-opening
//
// P-G3: every assertion names the defect it would catch, and the SHIPPED strings are pinned
// BYTE-IDENTICAL so the historical baseline (38/40 credited) survives the refactor and so a
// variant cannot silently reword the live prompt.

import {
  guardLabel, hintOpeningInstruction, gapEstablishesNothingCorrect, UNVERIFIED_MARKER,
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
  ] as const) {
    // Matches `process.env.<NAME>  ?? '<default>'` with any run of spaces, as the route aligns them.
    const m = src.match(new RegExp(`process\\.env\\.${envName}\\s*\\?\\?\\s*'([a-z]+)'`));
    ok(`route reads ${envName} from the env (rollback needs no deploy)`, m !== null);
    ok(`route's ${envName} default is the MEASURED arm '${expected}'`,
      m?.[1] === expected, `found ${JSON.stringify(m?.[1])}`);
  }
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} hint opening: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
