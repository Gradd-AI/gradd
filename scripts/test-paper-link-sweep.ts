// scripts/test-paper-link-sweep.ts — THE SWEEP THAT STOPS THE NEXT ONE.
// Pure: reads source files off disk, no DB, no model, no network.
// Run: npm run test:paper-link-sweep
//
// ── WHY A STATIC SWEEP AND NOT MORE UNIT FIXTURES ───────────────────────────────────────
// `test-paper-url.ts` proves the RULE is right. It cannot prove the rule is USED — and every
// defect in this class was a correct rule that one link forgot to call. The mock link and the
// Exam-cases card sat three lines apart in one file; the first was fixed on 2026-08-01 and the
// second kept the identical bug for months, because nothing was looking at the population.
// P-G2: this check's denominator is every authed ACCA surface, not the ones we remembered.
//
// ── WHAT IT ASSERTS ─────────────────────────────────────────────────────────────────────
// In an authed ACCA surface, a hardcoded root-relative `/acca…` link literal must not appear.
// Paper-carrying links go through `paperHref`; the three exempt categories are listed below
// with a reason each, and anything else is a finding.
//
// ⚠️ CLAIM CEILING: this proves a link is not a BARE LITERAL. It cannot prove the paper handed
// to `paperHref` is the RIGHT one — that is a reader's job. A green sweep means "no link
// silently drops the paper", never "every link carries the correct paper".

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, relative, sep } from 'path';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

const ROOT = join(__dirname, '..');

// The authed ACCA surfaces — the six independently-styled page headers and the components
// they render. Landing/marketing pages are excluded: they are pre-auth, have no active paper,
// and legitimately hardcode a paper into their own CTAs.
const SURFACES = [
  'app/acca/ACCADashboard.tsx',
  'app/acca/AreaPicker.tsx',
  'app/acca/progress/page.tsx',
  'app/acca/tutor/TutorChat.tsx',
  'app/acca/subscribe/page.tsx',
  'app/acca/drill/page.tsx',
  'app/acca/cases/CaseList.tsx',
  'app/acca/cases/[id]/CaseSession.tsx',
  // The two case SERVER pages joined the population on 2026-08-11: they now build
  // paper-bearing links themselves (the auth redirect's next=), so leaving them out would
  // understate the denominator the moment they were the thing worth checking (P-G2).
  'app/acca/cases/page.tsx',
  'app/acca/cases/[id]/page.tsx',
  // The permanent results surface (2026-09-04). Same two-part shape as the case surface —
  // a paper-parameterised LIST and an ID-ADDRESSED detail page — so it joins the population
  // for the same reason those two did: both build paper-bearing links of their own.
  'app/acca/results/page.tsx',
  'app/acca/results/[attemptId]/page.tsx',
  'components/acca/SitRunner.tsx',
  'components/acca/ResitRunner.tsx',
];

// ── THE THREE EXEMPT CATEGORIES ─────────────────────────────────────────────
// Each is a link that is CORRECT bare, with the reason it is correct. Passing one of these
// through paperHref would be wrong, not merely redundant.
const EXEMPT: { pattern: RegExp; why: string }[] = [
  { pattern: /^\/acca\/auth(\?|$)/,        why: 'AUTH — the paper rides inside the encoded next=' },
  { pattern: /^\/acca\/cases\/\$\{/,       why: 'ID-ADDRESSED — a case id is globally unique' },
  { pattern: /^\/acca\/results\/\$\{/,     why: 'ID-ADDRESSED — an attempt row owns its own paper via mock_id' },
  { pattern: /\?drill_id=/,                why: 'ID-ADDRESSED — a drill id is globally unique' },
  { pattern: /^\/acca\/(afm\/)?mock$/,     why: 'PER-PAPER SURFACE — a distinct path, not a param' },
];

// Known-unresolved sites, each with the open item that owns it. An entry here is a REVIEWABLE
// ACT, not an omission — the same discipline run-contracts.ts applies to EXCLUDED. A waiver
// that no longer matches anything is itself a FAILURE: it outlived its bug and is now
// silently unguarding a line somebody fixed.
//
// A waiver WITHOUT `literal` covers the whole file, and is only correct where the entire
// surface is unresolved. Where one link in an otherwise-clean file is blocked, the waiver
// names that literal so the file's OTHER links stay guarded — waiving ACCADashboard whole
// for the sake of its cases card would unguard the five links just fixed in it.
//
// EMPTY as of 2026-08-11, and that is the point: the three entries this list shipped with
// were all defect (a) — the Exam-cases card and the two APM-hardcoded case surfaces it led
// to. All three are threaded, so all three waivers are gone. The mechanism stays for the
// next unresolved site, and because the list is empty its arms are now driven by synthetic
// findings below rather than by any real file (P-G3 — an unreachable branch is untested).
const WAIVED: { file: string; literal?: RegExp; why: string }[] = [];

/**
 * Blank every comment to spaces, preserving length and newlines so indices and line numbers
 * stay identical to the original.
 *
 * ⚠️ A LINE-PREFIX HEURISTIC IS NOT ENOUGH, and the first version of this file proved it by
 * reporting four false positives against its OWN doc comments. A `{/* … *\/}` JSX block does
 * not start with `/*`, and its continuation lines start with whatever prose is on them —
 * including, in these surfaces, the very URL literals the comment is explaining. Comments
 * that quote the bad string are exactly what a file documenting this defect class contains.
 */
function blankComments(src: string): string {
  const out = src.split('');
  let i = 0;
  while (i < src.length) {
    const two = src.slice(i, i + 2);
    if (two === '//') {
      while (i < src.length && src[i] !== '\n') { out[i] = ' '; i++; }
    } else if (two === '/*') {
      while (i < src.length && src.slice(i, i + 2) !== '*/') {
        if (src[i] !== '\n') out[i] = ' ';
        i++;
      }
      out[i] = ' '; out[i + 1] = ' '; i += 2;
    } else if (src[i] === '"' || src[i] === "'" || src[i] === '`') {
      // Skip string bodies so a `//` inside a URL literal is not read as a comment.
      const quote = src[i]; i++;
      while (i < src.length && src[i] !== quote) { if (src[i] === '\\') i++; i++; }
      i++;
    } else { i++; }
  }
  return out.join('');
}

/** Character spans of every `paperHref( … )` call, by balanced parens. */
function paperHrefSpans(src: string): { start: number; end: number }[] {
  const spans: { start: number; end: number }[] = [];
  for (const m of src.matchAll(/paperHref\s*\(/g)) {
    let depth = 1, i = m.index! + m[0].length;
    while (i < src.length && depth > 0) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') depth--;
      i++;
    }
    spans.push({ start: m.index!, end: i });
  }
  return spans;
}

/**
 * Every root-relative /acca link literal NOT inside a comment and NOT inside a paperHref call.
 * Multi-line calls count — `wrappedInPaperHref` checking one line at a time was the second
 * false-positive source (ResitRunner's call spans six lines).
 */
function accaLinkLiterals(src: string): { literal: string; line: number }[] {
  const blanked = blankComments(src);
  const spans = paperHrefSpans(blanked);
  const out: { literal: string; line: number }[] = [];
  for (const m of blanked.matchAll(/['"`](\/acca[^'"`]*)['"`]/g)) {
    const at = m.index!;
    if (spans.some((s) => at >= s.start && at < s.end)) continue;
    out.push({ literal: m[1], line: src.slice(0, at).split('\n').length });
  }
  return out;
}

type Finding = { literal: string; line: number };
type Waiver = { file: string; literal?: RegExp; why: string };
type Verdict =
  | { kind: 'file-waiver'; waiver: Waiver; earned: boolean }
  | { kind: 'checked'; literalWaivers: { waiver: Waiver; earned: boolean }[]; remaining: Finding[] };

/**
 * Apply a file's waivers to its findings. Extracted from the loop below so its arms can be
 * DRIVEN (P-G3): with WAIVED now empty, every branch in here is dead code on a real run, and
 * a dead branch is an untested one — the emptiness of the list must not quietly disarm the
 * mechanism that polices the next entry. The probes below exercise all four outcomes.
 */
function verdictFor(findings: Finding[], waivers: Waiver[]): Verdict {
  const fileWaiver = waivers.find((w) => !w.literal);
  // A whole-file waiver is EARNED only while the file still has something to waive.
  if (fileWaiver) return { kind: 'file-waiver', waiver: fileWaiver, earned: findings.length > 0 };
  const literalWaivers = waivers.filter((w) => w.literal);
  return {
    kind: 'checked',
    literalWaivers: literalWaivers.map((waiver) => ({
      waiver,
      earned: findings.some((f) => waiver.literal!.test(f.literal)),
    })),
    remaining: findings.filter((f) => !literalWaivers.some((w) => w.literal!.test(f.literal))),
  };
}

console.log('\npaper-link-sweep — no authed ACCA surface may hardcode a paper-bearing link\n');

// ── POSITIVE CONTROL (P-G3(a)) ───────────────────────────────────────────────
// A sweep that finds nothing because its matcher is broken looks exactly like a clean sweep.
// Prove the detector fires on a known-bad string and stays quiet on a known-good one BEFORE
// trusting any verdict below.
const PROBE_BAD = `<Link href="/acca/progress">x</Link>`;
const PROBE_GOOD = `<Link href={paperHref('/acca/progress', paper)}>x</Link>`;
const PROBE_MULTILINE = `href={paperHref(\n  cond\n    ? '/acca?area=B1'\n    : '/acca',\n  paper,\n)}`;
const PROBE_JSX_COMMENT = `{/* the literals '/acca' and\n    '/acca?paper=AFM' are the rule */}`;

ok('POSITIVE CONTROL: the detector finds a bare /acca literal',
  accaLinkLiterals(PROBE_BAD).length === 1);
ok('a literal wrapped in paperHref is not a finding',
  accaLinkLiterals(PROBE_GOOD).length === 0);
ok('a MULTI-LINE paperHref call is not a finding (both of its literals)',
  accaLinkLiterals(PROBE_MULTILINE).length === 0);
ok('a line-comment URL is not a finding',
  accaLinkLiterals(`  // see /acca/progress for the shape`).length === 0);
ok('a JSX block comment QUOTING the bad literals is not a finding',
  accaLinkLiterals(PROBE_JSX_COMMENT).length === 0);
ok('NEGATIVE CONTROL: blanking comments does not blind the detector to real code beside them',
  accaLinkLiterals(`{/* see '/acca' */}\n<Link href="/acca/progress">x</Link>`).length === 1);
ok('a "//" inside a URL string is not read as a comment',
  accaLinkLiterals(`const u = "https://gradd.ai/x"; <Link href="/acca/progress">x</Link>`).length === 1);

// ── THE WAIVER MECHANISM'S OWN FAILURE PATHS (P-G3) ──────────────────────────
// WAIVED is empty as of 2026-08-11 — every entry it shipped with is fixed. That makes each
// branch below unreachable on a real run, so it is driven here with synthetic findings. The
// arm that matters most is the one nobody thinks about: a waiver that has stopped matching
// is silently unguarding a line somebody already fixed, and it must go RED, not quiet.
console.log('\n  — the waiver mechanism itself —');
const F = (literal: string): Finding => ({ literal, line: 1 });
const W_FILE: Waiver = { file: 'x.tsx', why: 'whole surface' };
const W_LIT: Waiver = { file: 'x.tsx', literal: /^\/acca\/cases$/, why: 'one link' };

const vFileEarned = verdictFor([F('/acca/cases')], [W_FILE]);
ok('a whole-file waiver over a file that STILL has findings is earned',
  vFileEarned.kind === 'file-waiver' && vFileEarned.earned);
const vFileStale = verdictFor([], [W_FILE]);
ok('MUST GO RED: a whole-file waiver over a CLEAN file is not earned',
  vFileStale.kind === 'file-waiver' && !vFileStale.earned);
const vLitEarned = verdictFor([F('/acca/cases')], [W_LIT]);
ok('a per-literal waiver that still matches is earned, and suppresses only that literal',
  vLitEarned.kind === 'checked' && vLitEarned.literalWaivers[0].earned
  && vLitEarned.remaining.length === 0);
const vLitStale = verdictFor([F('/acca/progress')], [W_LIT]);
ok('MUST GO RED: a per-literal waiver matching nothing is not earned',
  vLitStale.kind === 'checked' && !vLitStale.literalWaivers[0].earned);
ok('  …and the file\'s OTHER links stay guarded by it',
  vLitStale.kind === 'checked' && vLitStale.remaining.length === 1
  && vLitStale.remaining[0].literal === '/acca/progress');
ok('no waivers → every finding is reported',
  (() => { const v = verdictFor([F('/acca'), F('/acca/progress')], []);
    return v.kind === 'checked' && v.remaining.length === 2; })());

console.log('\n  — the surfaces —');
for (const rel of SURFACES) {
  const abs = join(ROOT, ...rel.split('/'));
  let src: string;
  try { src = readFileSync(abs, 'utf-8'); }
  catch { ok(`${rel} exists`, false, 'file not found — did it move?'); continue; }

  const findings = accaLinkLiterals(src)
    .filter(({ literal }) => !EXEMPT.some((e) => e.pattern.test(literal)));
  const verdict = verdictFor(findings, WAIVED.filter((w) => w.file === rel));

  if (verdict.kind === 'file-waiver') {
    ok(`WAIVED ${rel} — ${verdict.waiver.why}`, verdict.earned,
      'no bare literals left; remove this waiver');
    continue;
  }

  // Every per-literal waiver must still MATCH something, or it is unguarding a fixed line.
  for (const { waiver, earned } of verdict.literalWaivers) {
    ok(`  waiver still earns its place: ${rel} ${waiver.literal} — ${waiver.why}`, earned,
      'nothing matches; remove this waiver');
  }

  ok(`${rel} — no bare paper-bearing link`, verdict.remaining.length === 0,
    verdict.remaining.map((f) => `:${f.line} ${f.literal}`).join('  '));
}

// ── THE COUPLING THAT MUST NOT DRIFT ─────────────────────────────────────────
// paperHref omits the param for DEFAULT_PAPER; resolvePaper reads an absent param as
// DEFAULT_PAPER. Both must read the same constant, not two literals that happen to agree.
console.log('\n  — the default-paper constant is shared, not restated —');
const paperSrc = readFileSync(join(ROOT, 'lib', 'acca', 'paper.ts'), 'utf-8');
const urlSrc = readFileSync(join(ROOT, 'lib', 'acca', 'paper-url.ts'), 'utf-8');
ok('paper.ts exports DEFAULT_PAPER', /export const DEFAULT_PAPER/.test(paperSrc));
ok('resolvePaper returns the constant, not a literal',
  /return raw === 'AFM' \? 'AFM' : DEFAULT_PAPER;/.test(paperSrc));
ok('paper-url.ts compares against the imported constant, not a literal',
  /paper !== DEFAULT_PAPER/.test(urlSrc) && /import \{[^}]*DEFAULT_PAPER/.test(urlSrc));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} paper-link-sweep: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;

// Keep the imports honest — `readdirSync`/`statSync`/`relative`/`sep` are reserved for the
// directory-walking version this becomes when ACCA grows a seventh surface.
void readdirSync; void statSync; void relative; void sep;
