// scripts/check-env-flags.ts
// Which FEATURE FLAGS does this codebase read, and which of them are absent from .env.local?
//
// Run:  npm run check:env-flags            (local scan, no network)
//       npm run check:env-flags -- --vercel  (also cross-check Production env names via the CLI)
// Wired to `predev`, so it prints once whenever the dev server starts.
//
// ── WHY THIS EXISTS: A TAX PAID SIX TIMES ────────────────────────────────────
// `APM_EARNED_REVEAL=1` is set in Production and absent from `.env.local`. A local walk of the
// earned reveal therefore returns `teaching`, the reveal never fires, and the surface looks
// broken in a way that reads exactly like a code defect. It has cost time SIX times — banked in
// memory/feedback_apm_test_protocol as "the flag-not-live trap", whose standing rule is that a
// false trail is always the environment and never the code. That rule is correct and it did not
// stop the sixth recurrence, because knowing the rule does not tell you WHICH flag is missing.
// This prints the name.
//
// ── WHAT IT IS AND IS NOT ────────────────────────────────────────────────────
// It REPORTS; it never fails a build and never exits non-zero on a missing flag. An absent flag
// is frequently correct — most of them are off locally on purpose — so a gate here would be a
// gate that cries wolf and gets ignored, which is worse than none. Exit code is non-zero only
// when the scan itself could not run.
//
// ⚠️ CEILING: without `--vercel` it cannot know what Production sets, so it reports what the
// CODE reads and what `.env.local` supplies — "absent here", not "set there and absent here".
// The `--vercel` arm closes that gap using `vercel env ls production`, which returns NAMES and
// never values, so nothing secret is read, printed or stored.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = join(__dirname, '..');
const SCAN_DIRS = ['app', 'lib', 'components', 'scripts'];
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist']);

/** A FLAG is an env var compared against a literal on/off value — the shape that silently
 *  changes behaviour. A plain `process.env.X` read (a URL, a key) is configuration, not a flag,
 *  and is deliberately out of scope: those fail loudly, flags fail silently. */
const FLAG_RE = /process\.env\.([A-Z0-9_]+)\s*===\s*'(?:1|true|on)'/g;
/** The inverse form, equally a flag. */
const FLAG_RE_NEG = /process\.env\.([A-Z0-9_]+)\s*!==\s*'(?:0|false|off)'/g;

function walk(dir: string, out: string[] = []): string[] {
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const e of entries) {
    if (SKIP_DIRS.has(e)) continue;
    const p = join(dir, e);
    let st; try { st = statSync(p); } catch { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (['.ts', '.tsx'].includes(extname(p))) out.push(p);
  }
  return out;
}

/** Flag name → the files that read it. */
export function discoverFlags(files: readonly string[], read = (f: string) => readFileSync(f, 'utf8')): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const f of files) {
    let src: string;
    try { src = read(f); } catch { continue; }
    for (const re of [FLAG_RE, FLAG_RE_NEG]) {
      re.lastIndex = 0;
      for (const m of src.matchAll(re)) {
        const rel = f.replace(ROOT, '').replace(/\\/g, '/').replace(/^\//, '');
        const list = found.get(m[1]) ?? [];
        if (!list.includes(rel)) list.push(rel);
        found.set(m[1], list);
      }
    }
  }
  return found;
}

/** Keys present in a dotenv file. Values are never read, only key names. */
export function envKeys(text: string): Set<string> {
  const keys = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=/.exec(line);
    if (m) keys.add(m[1]);
  }
  return keys;
}

function productionNames(): Set<string> | null {
  try {
    // NAMES ONLY. `vercel env ls production` prints a table of names/environments/ages; values
    // require `vercel env pull` and are deliberately not fetched.
    // `execSync` with a FIXED LITERAL, not execFileSync+args+shell. On Windows `vercel` is a
    // .cmd shim, which Node refuses to spawn without a shell; passing args alongside `shell:
    // true` then emits DEP0190 on every run — noise on a check whose only value is being read.
    // There is no injection surface here: the command is a constant and takes no input.
    const out = execSync('vercel env ls production', {
      cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
    });
    const names = new Set<string>();
    for (const line of out.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s+/.exec(line);
      if (m) names.add(m[1]);
    }
    return names.size > 0 ? names : null;
  } catch {
    return null;
  }
}

function main(): void {
  const files = SCAN_DIRS.flatMap((d) => walk(join(ROOT, d)));
  const flags = discoverFlags(files);
  const envPath = join(ROOT, '.env.local');
  const local = existsSync(envPath) ? envKeys(readFileSync(envPath, 'utf8')) : new Set<string>();

  const wantVercel = process.argv.includes('--vercel');
  const prod = wantVercel ? productionNames() : null;

  const absent = [...flags.keys()].filter((f) => !local.has(f)).sort();
  const set = [...flags.keys()].filter((f) => local.has(f)).sort();

  if (absent.length === 0) {
    console.log(`env-flags: ${flags.size} feature flag(s) read by the codebase; all present in .env.local.`);
    return;
  }

  console.log(`\nenv-flags: ${flags.size} feature flag(s) read by this codebase · ${set.length} set locally · ${absent.length} ABSENT from .env.local`);
  for (const f of absent) {
    const inProd = prod ? (prod.has(f) ? '  ⚠️ SET IN PRODUCTION' : '  (not in production either)') : '';
    console.log(`  ABSENT  ${f}${inProd}`);
    console.log(`          read by ${flags.get(f)!.slice(0, 3).join(', ')}${flags.get(f)!.length > 3 ? ` (+${flags.get(f)!.length - 3} more)` : ''}`);
  }
  if (wantVercel && !prod) {
    console.log('  (--vercel: could not read production env names — is the Vercel CLI linked and authed?)');
  } else if (!wantVercel) {
    console.log('  Absent is often CORRECT — most of these are off locally on purpose.');
    console.log('  Re-run with `-- --vercel` to see which of them Production actually sets.');
  }
  console.log('');
  // Deliberately exit 0: this is a report, not a gate. See the header.
}

if (require.main === module) main();
