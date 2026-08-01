// scripts/authoring/assert-batch-corpus.ts
//
// BATCH-LEVEL CORPUS ASSERTION for a set of AFM case specs, run BEFORE any of them is authored.
//
// WHY THIS EXISTS SEPARATELY FROM THE PER-CASE INVARIANT. `author-afm-case.ts` checks the corpus
// invariant one case at a time, against what is ALREADY PUBLISHED plus the single candidate. Once
// one published case carries both letters — Kestrel does, B5b + E2a — every subsequent case passes
// that check trivially, whatever it contains. That is correct for the invariant's own purpose and
// useless as a check on a BATCH: a batch of four cases could be entirely section-B and still see
// four green per-case invariants.
//
// So this asserts the property over the batch ITSELF, independent of what is published:
//   • the union of the batch's requirement LO letters covers B AND E;
//   • which case closes each letter is NAMED, not merely counted;
//   • no numeric family arm is used more times than --max-per-family (default 2), because
//     stacking one calculator across a batch is how a "five-case library" ends up teaching one
//     technique.
//
// Run: npx tsx scripts/authoring/assert-batch-corpus.ts spec1.ts spec2.ts … [--max-per-family 2]

import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const argOf = (f: string) => { const i = process.argv.indexOf(f); return i >= 0 ? (process.argv[i + 1] ?? null) : null; };
const MAX_PER_FAMILY = Number(argOf('--max-per-family') ?? 2);
const specPaths = process.argv.slice(2).filter((a) => a.endsWith('.ts'));

interface Req { lo_code?: string; lo?: string; calc?: { lo?: string } }

async function main() {
  if (specPaths.length === 0) throw new Error('pass at least one spec path');
  console.log('='.repeat(96));
  console.log(`  BATCH CORPUS ASSERTION — ${specPaths.length} spec(s)`);
  console.log('='.repeat(96));

  const byLetter: Record<string, string[]> = {};
  const familyCount: Record<string, string[]> = {};
  let violations = 0;

  for (const p of specPaths) {
    const mod = await import(pathToFileURL(resolve(p)).href);
    // tsx's CJS/ESM interop can wrap the default export one level deeper (module.default.default),
    // so unwrap rather than assume — a spec silently read as `undefined` would make this assertion
    // report violations it never actually checked.
    const unwrap = (v: unknown): unknown =>
      v && typeof v === 'object' && 'default' in (v as object) && !('frame' in (v as object))
        ? unwrap((v as { default: unknown }).default) : v;
    const spec = unwrap(mod.default ?? mod.SPEC) as
      { frame?: { title?: string; section?: string }; numeric?: Req[]; narrative?: Req[] } | undefined;
    if (!spec?.frame) { console.log(`  ✗ ${p}: no AfmCaseSpec default export found`); violations++; continue; }

    const rr: Req[] = [...(spec.numeric ?? []), ...(spec.narrative ?? [])];
    const los = rr.map((r) => r.calc?.lo ?? r.lo ?? r.lo_code).filter(Boolean) as string[];
    const title = spec.frame.title ?? p;
    console.log(`\n  ${title}  (section ${spec.frame.section ?? '?'})`);
    console.log(`     LOs: ${los.join(', ') || '(none)'}`);
    for (const lo of los) {
      const letter = lo[0];
      (byLetter[letter] ??= []).push(title);
      // Only NUMERIC requirements consume a family arm.
      const isCalc = rr.some((r) => r.calc?.lo === lo);
      if (isCalc) (familyCount[lo] ??= []).push(title);
    }
  }

  console.log(`\n${'-'.repeat(96)}`);
  console.log('  LETTER COVERAGE — which case closes each');
  for (const letter of ['B', 'E']) {
    const who = [...new Set(byLetter[letter] ?? [])];
    const ok = who.length > 0;
    if (!ok) violations++;
    console.log(`     ${ok ? '✓' : '✗'} section ${letter}: ${ok ? `closed by ${who.join(' · ')}` : 'NOT REPRESENTED IN THE BATCH'}`);
  }
  for (const letter of Object.keys(byLetter).filter((l) => l !== 'B' && l !== 'E').sort()) {
    console.log(`       (also present: section ${letter} — ${[...new Set(byLetter[letter])].join(' · ')})`);
  }

  console.log(`\n  FAMILY-ARM SPREAD (max ${MAX_PER_FAMILY} per arm)`);
  for (const [lo, cases] of Object.entries(familyCount).sort()) {
    const over = cases.length > MAX_PER_FAMILY;
    if (over) violations++;
    console.log(`     ${over ? '✗' : '✓'} ${lo}: ${cases.length}×  ${cases.join(' · ')}`);
  }

  console.log(`\n${'='.repeat(96)}`);
  if (violations) { console.error(`  ✗ ${violations} VIOLATION(S) — do not author this batch as specified.\n`); process.exit(1); }
  console.log('  ✓ BATCH ASSERTION PASS — B and E both represented; no family arm stacked.\n');
}

main().catch((e) => { console.error('FAILED:', (e as Error).message); process.exit(1); });
