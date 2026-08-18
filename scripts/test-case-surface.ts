// scripts/test-case-surface.ts — fixtures for the per-paper exam-case surface.
// Pure: no DB, no model, no network. Run: npm run test:case-surface
//
// ── P-G6: THE INPUTS ARE THE SHAPES PRODUCTION BUILDS ───────────────────────────────────
// Every input below is the shape the route actually receives, not a tidied version of it:
//   • `paperFromRouteParam` is fed `string | string[] | undefined` — Next's declared type
//     for a `searchParams` value (see node_modules/next/dist/docs/…/page.md). The ARRAY
//     case is not decoration: `?paper=AFM&paper=AFM` produces one, and it is the shape the
//     obvious implementation gets wrong.
//   • `paperForCaseRow` is fed the `acca_cases.paper_code` column, INCLUDING the null and
//     malformed-id paths, because "the row was not found" is a live outcome of the lookup
//     the detail page performs, not an edge case.
//   • `caseSectionName` is fed `anchor_area` values COPIED FROM THE LIVE ROWS (queried
//     2026-08-11), empty strings and all — the 50-mark section-A cases really do store an
//     empty anchor_area, and a fixture that only ever passed 'B3' would prove nothing about
//     the cards that actually render blank.
//
// ── P-G3: EVERY FAILURE PATH IS PINNED ──────────────────────────────────────────────────
// The wrong implementations are asserted to FAIL. A green suite that the pre-fix code would
// also pass is not evidence, and each pin here is one plausible edit away from the shipped
// code: dropping the paper (THE defect), reading the param with `resolvePaper` (the obvious
// implementation), and one table serving both papers (the second literal).

import {
  paperFromRouteParam,
  paperForCaseRow,
  caseSectionName,
  caseListMetadata,
  caseDetailMetadata,
  CASE_SECTION_NAMES,
} from '../lib/acca/case-surface';
import { SERVED_PAPERS, DEFAULT_PAPER, resolvePaper, type AccaPaper } from '../lib/acca/paper';
import { paperHref } from '../lib/acca/paper-url';
import { SECTIONS as AFM_SECTIONS } from './afm-framework';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\ncase-surface — the exam-case surface resolves and labels ONE paper, from its route\n');

// ── BREAK MODE 0: THE PINS ───────────────────────────────────────────────────
// HARDCODED — what shipped: the surface answers 'APM' whatever it was handed. THE defect,
//   and the one every other assertion here is downstream of.
// NAIVE_PARAM — `resolvePaper` applied straight to a searchParams value. It is the function
//   a reviewer would reach for, it typechecks (`raw: unknown`), and it is wrong on two
//   shapes a real URL produces.
// ONE_TABLE — a single section table for both papers: the second literal, added by whoever
//   threads the prop and stops at the fetch.
console.log('  — pins: the implementations this suite must reject —');
const HARDCODED = (_raw: unknown): AccaPaper => 'APM';
const NAIVE_PARAM = (raw: string | string[] | undefined): AccaPaper => resolvePaper(raw);
const ONE_TABLE: Record<string, string> = CASE_SECTION_NAMES.APM;

ok('MUST-FAIL: a hardcoded paper is caught — AFM and APM give the same answer',
  HARDCODED('AFM') === HARDCODED('APM'));
ok('MUST-FAIL: resolvePaper on a REPEATED param is caught — ["AFM"] resolves to APM',
  NAIVE_PARAM(['AFM', 'AFM']) === 'APM');
ok('MUST-FAIL: resolvePaper on a lowercase param is caught — "afm" resolves to APM',
  NAIVE_PARAM('afm') === 'APM');
ok('MUST-FAIL: one section table for both papers is caught — AFM\'s live E2 anchor is blank',
  (ONE_TABLE['E'] ?? '') !== AFM_SECTIONS.E);
ok('and the real rules pass all four checks the pins fail',
  paperFromRouteParam('AFM') !== paperFromRouteParam('APM')
  && paperFromRouteParam(['AFM', 'AFM']) === 'AFM'
  && paperFromRouteParam('afm') === 'AFM'
  && caseSectionName('AFM', 'E2') === AFM_SECTIONS.E);

// ── paperFromRouteParam — the search param ───────────────────────────────────
console.log('\n  — the route param —');
ok('an absent param is the default paper', paperFromRouteParam(undefined) === DEFAULT_PAPER);
ok('an EMPTY param (?paper=) is the default paper', paperFromRouteParam('') === DEFAULT_PAPER);
ok('?paper=AFM is AFM', paperFromRouteParam('AFM') === 'AFM');
ok('?paper=APM is APM', paperFromRouteParam('APM') === 'APM');
ok('?paper=afm is AFM (a hand-typed param still names a paper)',
  paperFromRouteParam('afm') === 'AFM');
ok('?paper= AFM  (whitespace) is AFM', paperFromRouteParam('  AFM ') === 'AFM');
ok('?paper=AFM&paper=AFM (array) is AFM', paperFromRouteParam(['AFM', 'AFM']) === 'AFM');
ok('an array takes the FIRST value, not the last', paperFromRouteParam(['AFM', 'APM']) === 'AFM');
ok('an EMPTY array is the default paper', paperFromRouteParam([]) === DEFAULT_PAPER);
// Junk NAMES no paper and this is a RENDER decision, so it defaults rather than refusing —
// unlike /acca/subscribe, where naming a paper wrongly is a REFUSAL (resolveSubscribePaper)
// because the consequence there is selling the wrong product, not rendering the wrong header.
ok('junk falls back to the default paper (a render choice, never an entitlement one)',
  paperFromRouteParam('APM%20subscribe') === DEFAULT_PAPER
  && paperFromRouteParam('AFM subscribe') === DEFAULT_PAPER);

// ── THE ROUND TRIP: what paperHref writes, this reads ────────────────────────
// The dashboard card is built with paperHref and landed on by this parser. If the two ever
// disagree the card silently serves the other paper — the exact defect, one link along.
console.log('\n  — round trip with paperHref (the dashboard card writes, this page reads) —');
// SERVED papers: paperHref only builds links to surfaces that exist (its parameter is
// ServedPaper since 2026-08-18), and this surface renders one of those.
for (const p of SERVED_PAPERS) {
  const href = paperHref('/acca/cases', p);
  const query = href.includes('?') ? href.slice(href.indexOf('?') + 1) : '';
  const raw = new URLSearchParams(query).get('paper') ?? undefined;
  ok(`paperHref('/acca/cases','${p}') → "${href}" reads back as ${p}`,
    paperFromRouteParam(raw) === p);
}
ok('the APM card stays byte-identical to the bare link it already was',
  paperHref('/acca/cases', 'APM') === '/acca/cases');

// ── paperForCaseRow — the id-addressed detail page ───────────────────────────
console.log('\n  — the case row (id-addressed: the row owns the paper, not the URL) —');
ok('paper_code AFM is AFM', paperForCaseRow('AFM') === 'AFM');
ok('paper_code APM is APM', paperForCaseRow('APM') === 'APM');
ok('a MISSING row (null) is the default paper, not a throw',
  paperForCaseRow(null) === DEFAULT_PAPER);
ok('an undefined column is the default paper, not a throw',
  paperForCaseRow(undefined) === DEFAULT_PAPER);
ok('a non-string column is the default paper, not a throw',
  paperForCaseRow(42) === DEFAULT_PAPER && paperForCaseRow({}) === DEFAULT_PAPER);

// ── caseSectionName — anchor_area as the live rows store it ──────────────────
// Copied from `select paper_code, section, anchor_area from acca_cases` (2026-08-11).
console.log('\n  — section names, on live anchor_area values —');
const LIVE_AFM: [string | null, string][] = [
  ['B3', AFM_SECTIONS.B],  // Castlereagh Utilities plc  (exam section A, 50 marks)
  ['B5', AFM_SECTIONS.B],  // Kestrel Foods plc
  ['B1', AFM_SECTIONS.B],  // Halvard Marine ASA
  ['E2', AFM_SECTIONS.E],  // Lindqvist Instruments AB — the anchor APM's table cannot name
  ['B4', AFM_SECTIONS.B],  // Tamesis Diagnostics plc
];
for (const [anchor, expected] of LIVE_AFM) {
  ok(`AFM anchor_area "${anchor}" → "${expected}"`, caseSectionName('AFM', anchor) === expected);
}
ok('APM anchor_area "D2" → Data science and technology',
  caseSectionName('APM', 'D2') === 'Data science and technology');
ok('APM anchor_area "C1" → Performance reporting',
  caseSectionName('APM', 'C1') === 'Performance reporting');
ok('the SAME anchor letter names DIFFERENT things per paper (B, live on both)',
  caseSectionName('APM', 'B1') !== caseSectionName('AFM', 'B1')
  && caseSectionName('APM', 'B1') === 'Performance optimisation');
ok('an EMPTY anchor_area (the 50-mark section-A cases) is "", never "undefined"',
  caseSectionName('AFM', '') === '' && caseSectionName('APM', '') === '');
ok('a NULL anchor_area is ""', caseSectionName('AFM', null) === '' && caseSectionName('APM', null) === '');
ok('an unmapped letter is "", not a crash', caseSectionName('AFM', 'Z9') === '');
ok('a lowercase anchor still resolves', caseSectionName('AFM', 'e2') === AFM_SECTIONS.E);

// The AFM table is a COPY of an importable source. Assert it, so the copy cannot drift.
console.log('\n  — the AFM table agrees with scripts/afm-framework.ts (its stated source) —');
for (const key of ['A', 'B', 'C', 'D', 'E'] as const) {
  ok(`AFM section ${key} matches the syllabus extraction`,
    CASE_SECTION_NAMES.AFM[key] === AFM_SECTIONS[key],
    `${CASE_SECTION_NAMES.AFM[key]} !== ${AFM_SECTIONS[key]}`);
}
ok('F/G (skills, not content areas) are deliberately absent',
  CASE_SECTION_NAMES.AFM['F'] === undefined && CASE_SECTION_NAMES.AFM['G'] === undefined);

// ── Metadata ─────────────────────────────────────────────────────────────────
// The APM strings are pinned BYTE-IDENTICAL to what the static `metadata` exports held
// before this change. APM is live and must not move; only AFM is new.
console.log('\n  — page metadata (APM byte-identical, AFM new) —');
ok('the list title is unchanged for APM',
  caseListMetadata('APM').title === 'APM Exam Cases — Gradd AI');
ok('the list description is unchanged for APM',
  caseListMetadata('APM').description
  === 'Full APM exam cases — shared scenario, linked requirements, and professional-skills marking. Coached end-to-end by Ezra.');
ok('the detail title is unchanged for APM',
  caseDetailMetadata('APM').title === 'APM Exam Case — Ezra | Gradd');
ok('the detail description is unchanged for APM',
  caseDetailMetadata('APM').description
  === 'Work a full APM exam case with Ezra — shared scenario, linked requirements, and professional-skills marking on your whole answer.');
ok('the list title names AFM for AFM',
  caseListMetadata('AFM').title === 'AFM Exam Cases — Gradd AI');
ok('the detail title names AFM for AFM',
  caseDetailMetadata('AFM').title === 'AFM Exam Case — Ezra | Gradd');
ok('no metadata string says APM on an AFM page',
  !/APM/.test(caseListMetadata('AFM').title + caseListMetadata('AFM').description
    + caseDetailMetadata('AFM').title + caseDetailMetadata('AFM').description));

// ── The whole surface discriminates, for every paper ─────────────────────────
console.log('\n  — every paper is covered, and no output is paper-blind —');
// SERVED papers: paperHref only builds links to surfaces that exist (its parameter is
// ServedPaper since 2026-08-18), and this surface renders one of those.
for (const p of SERVED_PAPERS) {
  ok(`${p} has a section table with at least sections A–B`,
    Object.keys(CASE_SECTION_NAMES[p]).length >= 2);
  ok(`${p} metadata names ${p}`,
    caseListMetadata(p).title.startsWith(p) && caseDetailMetadata(p).title.startsWith(p));
}

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} case-surface: ${pass} passed, ${fail} failed\n`);
if (fail > 0) process.exitCode = 1;
