// scripts/verify.ts — `npm run verify`, and the `prebuild` step. Doctrine P-G5(b).
//
// TWO CHECKS, IN THIS ORDER, BECAUSE THEY ANSWER DIFFERENT QUESTIONS:
//   1. `tsc --noEmit`      — DOES THE TREE COMPILE?
//   2. the contract gate   — DO THE FIXTURES PASS?
//
// On 2026-08-21 a `lib/` type error reached `origin` and killed a preview build, with both `tsx`
// and the contract gate green the whole way: tsx STRIPS types rather than checking them, and the
// gate runs fixtures, not `tsc`. A green `62/62` was answering a different question from the one
// being asked. See P-G5(b) in GENERATOR_DOCTRINE.md.
//
// ── WHY THE TYPECHECK IS SKIPPED ON VERCEL ───────────────────────────────────────────────
// `prebuild` runs on Vercel too, and `next build` ALREADY typechecks there — that is precisely how
// the 2026-08-21 error was caught ("Failed to type check." in the deploy log, MEASURED, not
// assumed). Running `tsc` again in `prebuild` would add ~13s of duplicate work to every deploy for
// no additional coverage. So the typecheck half is skipped when `VERCEL` is set, and the gate half
// always runs. Locally nothing is skipped: `npm run build` now fails in seconds on a type error
// instead of after a full compile.
//
// ⚠️ WHAT THIS DOES **NOT** DO, STATED PLAINLY. Nothing here runs on `git push` — this repo has no
// git hooks and no husky. Wiring it into `prebuild` arms it on every BUILD, not on every PUSH. The
// guarantee that a broken tree cannot ship green is still Vercel's own typecheck, which already
// existed and already worked. So P-G5's "armed only by memory" objection is REDUCED here, not
// eliminated, and a pre-push hook remains the only thing that would eliminate it.

import { spawnSync } from 'node:child_process';

const onVercel = Boolean(process.env.VERCEL);
const t0 = Date.now();

/** Run one step. Returns true on success. `shell: true` is required for the .cmd shims on Windows. */
function step(label: string, cmd: string): boolean {
  console.log(`\n▶ ${label}`);
  const r = spawnSync(cmd, { stdio: 'inherit', shell: true });
  if (r.error) {
    console.error(`  ✗ ${label} — could not start: ${r.error.message}`);
    return false;
  }
  if (r.status !== 0) {
    console.error(`  ✗ ${label} — exited ${r.status}`);
    return false;
  }
  return true;
}

const steps: { label: string; cmd: string }[] = [];

if (onVercel) {
  console.log('▶ typecheck — SKIPPED: VERCEL is set, and `next build` typechecks here anyway.');
  console.log('  (Skipped to avoid ~13s of duplicate work per deploy. It is NOT skipped locally.)');
} else {
  steps.push({ label: 'typecheck — does the tree compile?', cmd: 'tsc --noEmit -p tsconfig.json' });
}
steps.push({ label: 'contract gate — do the fixtures pass?', cmd: 'tsx scripts/run-contracts.ts' });

let ok = true;
for (const s of steps) {
  // Short-circuit deliberately: a tree that does not compile makes the fixture result uninteresting,
  // and running on regardless buries the real error under 62 lines of green.
  if (!ok) break;
  ok = step(s.label, s.cmd);
}

const secs = ((Date.now() - t0) / 1000).toFixed(1);
console.log(
  `\n${ok ? 'PASS' : 'FAIL'} verify — ${steps.length} step(s) in ${secs}s`
  + `${onVercel ? ' (typecheck skipped: VERCEL)' : ''}\n`,
);
// P-G4: never process.exit() — let the runtime flush stdout first.
process.exitCode = ok ? 0 : 1;
