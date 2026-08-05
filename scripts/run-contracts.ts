// scripts/run-contracts.ts   —   npm run test:contracts   (wired as `prebuild`)
//
// THE CONTRACT GATE. Runs every PURE fixture in the repo and fails the build if any of
// them fails. This exists because on 2026-08-05 a survey found that 44 of 44 `test:*`
// scripts were reachable from NO automatic path — no CI, no git hooks, no npm lifecycle
// script, and `next build` never executes anything under `scripts/`. A fixture armed only
// by someone remembering to run it is not a guard. See GENERATOR_DOCTRINE.md (P-G5).
//
// ── IT DISCOVERS, IT DOES NOT LIST ────────────────────────────────────────────────────
// Every `scripts/test-*.ts` is IN the gate by default. A new fixture is therefore armed
// the moment it is written, with nobody remembering anything. Keeping one OUT requires
// adding it to EXCLUDED below WITH A REASON — a visible, reviewable act. The opposite
// design (an explicit include list) drifts silently the first time someone adds a fixture
// and forgets the list, which is the exact failure this gate was built to end.
//
// ── WHY ONLY THE PURE ONES ────────────────────────────────────────────────────────────
// A Vercel build has no `.env.local` and no database. A fixture needing either would fail
// every deploy, and a gate that blocks deploys for reasons unrelated to the change being
// deployed teaches people to bypass it. The exclusions below are not a wish-list; each one
// was VERIFIED to fail in a clean checkout with no `.env.local` and secrets scrubbed.
//
// ── PURITY IS VERIFIED BY RUNNING, NOT BY READING ─────────────────────────────────────
// 2026-08-05: all 48 fixture files were run twice — once in a clean git worktree with no
// `.env.local` and every secret-shaped var removed from the environment, and once with
// `.env.local` fully loaded (what Vercel's build environment actually looks like). 46
// passed IDENTICALLY in both directions; 2 failed without a database. Reading the files
// would have got this wrong: a grep for `process.env` / `supabase` flags SIX fixtures, and
// four of those six are genuinely pure (they use mock clients, or set a dummy key that is
// never used to make a request, or — `test-notify` — delete the keys themselves and assert
// the unset-config branch). Both directions matter: passing without env is not enough if
// the fixture behaves differently WITH env, because Vercel has env.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const SCRIPTS_DIR = path.join(__dirname);
const CONCURRENCY = 8;
/** tsx's real CLI entry — see the spawn() comment in runOne for why not the .bin shim. */
const TSX_CLI = require.resolve('tsx/cli');

/**
 * Fixtures kept OUT of the build gate, each with the reason it cannot run in one.
 *
 * ⚠️ IF A FIXTURE IN THE GATE STARTS FAILING INTERMITTENTLY, ADD IT HERE TODAY (P-G5(a)).
 * State the reason and name an owner. Do NOT work around it, do NOT comment the assertion out
 * where it lives, and do NOT loosen the assertion to make it pass — a green gate that guards
 * less is worse than the red one, which was at least telling the truth. Using this list is the
 * CORRECT response, not an admission: the entry is reviewed, and the runner prints every
 * exclusion into every build log including Vercel's. The two entries below are structural
 * (they need a database), not flaky, which is why they carry no owner.
 */
const EXCLUDED: Record<string, string> = {
  'test-exam-questions':
    'needs a live database (createClient on NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY). '
    + 'Verified: exits 1 in a clean checkout with no .env.local. RUN AGAINST THE LIVE DB 2026-08-05 — '
    + 'the fetch_exam_questions_tiered RPC still returns the tiers its header documents (1,1,2 / 1,2,2 / '
    + '3,3,3), so the exclusion is purely environmental, not rot. ⚠️ BUT IT ASSERTS NOTHING: it prints and '
    + 'exits 0 whatever comes back (an RPC error is console.error + continue, test-exam-questions.ts:71-74), '
    + 'so that verification was a HUMAN comparing output against the header comment. Adding it to the gate '
    + 'would need assertions first — as written it can only ever fail on a thrown fatal. '
    + 'Run manually: npm run test:exam-questions',
  'test-sit-timing':
    'needs a live database (createClient at test-sit-timing.ts:211). Verified: exits 1 in a clean '
    + 'checkout with no .env.local. Run manually: npm run test:sit-timing',
};

/** What this gate does NOT cover. Printed on EVERY run, including every Vercel build log. */
const UNCOVERED_NOTE = [
  'NOT COVERED BY THIS GATE — exactly two fixtures, both DB-gated. Run them by hand:',
  '  npm run test:exam-questions   live DB (createClient on NEXT_PUBLIC_SUPABASE_URL +',
  '                                SUPABASE_SERVICE_ROLE_KEY) — a Vercel build has neither',
  '  npm run test:sit-timing       live DB (test-sit-timing.ts:211) — same reason',
  '',
  'Nothing else is excluded. Every other fixture in scripts/test-*.ts ran above, and a NEW',
  'fixture joins this gate automatically — keeping one out means adding it to EXCLUDED in',
  'scripts/run-contracts.ts WITH A REASON, which is a reviewable act rather than an omission.',
  '',
  'Four fixtures had NO npm script at all until 2026-08-05 — invisible, not merely unarmed,',
  'since running them required knowing the file path: test-afm-prose, test-apm-framework,',
  'test-ib-bm-framework (all three pure, so all three now run in this gate) and',
  'test-exam-questions (DB-gated, listed above). All four now have npm scripts.',
].join('\n');

type Result = { name: string; ok: boolean; ms: number; output: string };

function runOne(file: string): Promise<Result> {
  const name = path.basename(file, '.ts');
  const started = Date.now();
  return new Promise((resolve) => {
    // Spawn node + tsx's own CLI entry, NOT the node_modules/.bin/tsx shim. On Windows that
    // shim is a .cmd, and Node >=20 refuses to spawn .cmd without `shell: true` (EINVAL) —
    // and `shell: true` would put every path through cmd.exe quoting. Resolving tsx's cli
    // is shell-free and identical on Windows (dev) and Linux (Vercel).
    const child = spawn(process.execPath, [TSX_CLI, file], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    let output = '';
    child.stdout.on('data', (d) => { output += d.toString(); });
    child.stderr.on('data', (d) => { output += d.toString(); });
    child.on('error', (e) => {
      resolve({ name, ok: false, ms: Date.now() - started, output: `${output}\nspawn failed: ${e.message}` });
    });
    child.on('close', (code) => {
      resolve({ name, ok: code === 0, ms: Date.now() - started, output });
    });
  });
}

async function main() {
  const all = fs.readdirSync(SCRIPTS_DIR)
    .filter((f) => /^test-.+\.ts$/.test(f))
    .sort();

  // An EXCLUDED entry naming a fixture that no longer exists is itself drift — say so.
  const missing = Object.keys(EXCLUDED).filter((n) => !all.includes(`${n}.ts`));

  const queue = all.filter((f) => !EXCLUDED[path.basename(f, '.ts')]);
  const skipped = all.length - queue.length;

  console.log(`\ncontract gate — ${queue.length} pure fixtures, ${skipped} excluded, concurrency ${CONCURRENCY}\n`);

  const started = Date.now();
  const results: Result[] = [];
  let next = 0;
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    for (;;) {
      const i = next++;
      if (i >= queue.length) return;
      results[i] = await runOne(path.join(SCRIPTS_DIR, queue[i]));
    }
  });
  await Promise.all(workers);
  const totalMs = Date.now() - started;

  // Ordered output regardless of completion order, so build logs are diffable run to run.
  for (const r of results) {
    console.log(`  ${r.ok ? 'ok  ' : 'FAIL'} ${r.name.padEnd(34)} ${String(r.ms).padStart(6)} ms`);
  }

  const failed = results.filter((r) => !r.ok);
  for (const r of failed) {
    console.log(`\n${'─'.repeat(72)}\nFAILED: ${r.name}\n${'─'.repeat(72)}\n${r.output.trim()}`);
  }

  console.log(`\n${'─'.repeat(72)}`);
  console.log(UNCOVERED_NOTE);
  console.log(`${'─'.repeat(72)}`);

  if (missing.length) {
    console.log(`\n⚠️  EXCLUDED names a fixture that no longer exists: ${missing.join(', ')}`);
    console.log('   Remove the stale entry — a dead exclusion hides nothing and misleads the next reader.');
  }

  const slowest = [...results].sort((a, b) => b.ms - a.ms)[0];
  console.log(
    `\n${failed.length === 0 ? 'PASS' : 'FAIL'} contract gate: ${results.length - failed.length}/${results.length} `
    + `in ${(totalMs / 1000).toFixed(1)}s wall clock (slowest ${slowest?.name} ${slowest?.ms}ms)`,
  );
  if (failed.length) {
    console.log(`\n${failed.length} fixture(s) failed — the build is blocked. Fix the fixture or the code it guards.`);
  }

  // P-G4: never process.exit() — let the runtime flush stdout first.
  process.exitCode = failed.length === 0 ? 0 : 1;
}

main();
