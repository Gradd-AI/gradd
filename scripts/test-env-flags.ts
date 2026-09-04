// scripts/test-env-flags.ts
// Fixtures for the two PURE halves of scripts/check-env-flags.ts — flag discovery and dotenv
// key parsing. No env, no DB, no network, no CLI. Run: npm run test:env-flags
//
// The reporter itself is I/O (it walks the tree and may shell out to the Vercel CLI). What is
// worth pinning is the pair of rules that decide WHICH names it reports, because a discovery
// regex that quietly stops matching turns this into a check that always says "all clear" — the
// P-G1 shape, on a tool built to end a recurring false trail.

import { discoverFlags, envKeys } from './check-env-flags';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

/** discoverFlags takes its reader as a parameter, so the fixture supplies sources inline
 *  rather than touching the filesystem. */
const from = (files: Record<string, string>) =>
  discoverFlags(Object.keys(files), (f) => files[f]);

console.log('\nenv-flags — which names does the check report, and which does it leave alone\n');

console.log('  flag discovery');
{
  const f = from({
    'a.ts': "const REVEAL_ENABLED = process.env.APM_EARNED_REVEAL === '1';",
    'b.ts': "const CASES = process.env.APM_CASES === '1';\nconst DUP = process.env.APM_CASES === '1';",
  });
  ok('finds the real shape', f.has('APM_EARNED_REVEAL') && f.has('APM_CASES'));
  ok('records every file that reads a flag, deduped',
    f.get('APM_CASES')!.length === 1 && f.get('APM_EARNED_REVEAL')!.length === 1);
  ok('two flags, not three', f.size === 2, `got ${f.size}`);
}
{
  ok("'true' and 'on' are flags too",
    from({ 'a.ts': "process.env.X === 'true'" }).has('X')
    && from({ 'a.ts': "process.env.Y === 'on'" }).has('Y'));
  ok('the negated form is a flag',
    from({ 'a.ts': "process.env.Z !== '0'" }).has('Z')
    && from({ 'a.ts': "process.env.W !== 'false'" }).has('W'));
}

// ── THE OTHER DIRECTION: CONFIGURATION IS NOT A FLAG ─────────────────────────
// P-G3(a). A discoverer that reported every `process.env.X` would list the Supabase URL, the
// service key and the Anthropic key on every dev start — noise that guarantees the real finding
// goes unread, which is the failure mode this tool exists to prevent, not cause.
console.log('\n  configuration is deliberately NOT reported');
{
  const f = from({
    'a.ts': "const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;\n"
          + "const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;\n"
          + "const N = Number(process.env.SOME_LIMIT ?? '5');\n"
          + "const S = process.env.STRIPE_SECRET_KEY ?? '';",
  });
  ok('a bare read is not a flag', f.size === 0, JSON.stringify([...f.keys()]));
  ok('...specifically: no key or URL name is ever printed',
    !f.has('SUPABASE_SERVICE_ROLE_KEY') && !f.has('NEXT_PUBLIC_SUPABASE_URL')
    && !f.has('STRIPE_SECRET_KEY'));
  // A flag and a config read in the SAME file: only the flag surfaces.
  const g = from({ 'a.ts': "const U = process.env.NEXT_PUBLIC_SUPABASE_URL!;\nconst F = process.env.APM_CASES === '1';" });
  ok('a flag beside config yields the flag alone',
    g.size === 1 && g.has('APM_CASES'));
}

console.log('\n  dotenv key parsing (KEYS ONLY — a value is never read)');
{
  const k = envKeys([
    'NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co',
    '  APM_CASES=1',
    'export TUTOR_SESSION_SECRET=abc123',
    '# APM_EARNED_REVEAL=1',
    '',
    'lowercase_ignored=1',
    'WITH_SPACES = 1',
  ].join('\n'));
  ok('reads a plain key', k.has('NEXT_PUBLIC_SUPABASE_URL'));
  ok('tolerates leading whitespace', k.has('APM_CASES'));
  ok('tolerates an export prefix', k.has('TUTOR_SESSION_SECRET'));
  ok('a COMMENTED key is not set — this is the one that matters',
    !k.has('APM_EARNED_REVEAL'),
    'a commented-out flag must read as absent, or the check silently clears the exact case it exists for');
  ok('tolerates spaces around =', k.has('WITH_SPACES'));
  ok('ignores a lowercase name', !k.has('lowercase_ignored'));
  ok('an empty file yields no keys', envKeys('').size === 0);
}

// ── THE LIVE CASE, PINNED ────────────────────────────────────────────────────
// The literal that has cost time six times. If the discovery regex ever stops matching this
// exact line, the tool goes quiet on the one flag it was built for.
console.log('\n  the flag this tool exists for');
{
  const f = from({ 'route.ts': "const REVEAL_ENABLED = process.env.APM_EARNED_REVEAL === '1';" });
  ok('APM_EARNED_REVEAL is discovered from the real line in app/api/acca/tutor/route.ts',
    f.has('APM_EARNED_REVEAL'));
  ok('...and an .env.local without it reports it ABSENT',
    !envKeys('NEXT_PUBLIC_SUPABASE_URL=x\nAPM_CASES=1').has('APM_EARNED_REVEAL'));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} env-flags: ${pass}/${pass + fail} checks\n`);
// P-G4: never process.exit() — let the runtime flush stdout first.
process.exitCode = fail === 0 ? 0 : 1;
