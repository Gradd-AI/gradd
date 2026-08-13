// scripts/test-requirement-label.ts
// PURE: no DB, no network, no model. Run: npm run test:requirement-label
//
// Pins lib/acca/requirement-label.ts — the ONE strip both the serve boundary and the PS
// marker read a stored `label` through, and the `sweepCodeShape` asymmetry between them.
//
// ── WHAT THIS SUITE IS FOR ───────────────────────────────────────────────────
// Two properties, and the second is the one that is new:
//
//   1. The serve boundary's behaviour is UNCHANGED by the extraction. Every case here
//      that sets `sweepCodeShape: true` is also asserted through `sitDisplayLabel` itself,
//      so the delegation cannot drift from the function it replaced.
//
//   2. The MARKING form never over-deletes. `sweepCodeShape: false` exists because the
//      generic sweep is a SHAPE (`<A-E><digit(s)><letter?>`), not a code list, and an APM
//      label naming a division "B2" would have that token silently removed from what the
//      PS marker reads before it bands the candidate on the result. That is pinned as a
//      MUST-FAIL below (P-G3): the suite asserts the sweep WOULD eat it, and that marking
//      does not.
//
// ── MEASURED, NOT ASSUMED (2026-08-13) ───────────────────────────────────────
// Dropping the backstop in marking is only safe if every label that carries a code also
// carries a `lo_code` that the exact removal will match. Queried over the LIVE corpus:
//
//     38 requirement rows (APM 18 · AFM 20)
//     NULL/blank lo_code ......................... 0
//     labels containing a code SHAPE ............. 8
//       of those, lo_code absent or disagreeing .. 0
//
// So on today's content the two modes AGREE on every real row, and the sweep buys marking
// nothing. The `null`-lo_code divergence is still pinned below, because a future authored
// row could reintroduce it and the two readers must then differ in the direction we chose.

import { strippedLabel, markerLabel } from '../lib/acca/requirement-label';
import { sitDisplayLabel } from '../lib/acca/sit-preview';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (cond) console.log(`PASS :: ${name}`);
  else { console.log(`FAIL :: ${name}`); failures++; }
}

const serve = (l: string | null | undefined, lo?: string | null) =>
  strippedLabel(l, lo, { sweepCodeShape: true });

console.log('\n── requirement-label: the shared strip and its one asymmetry ──\n');

// ═══════════════════════════════════════════════════════════════════════════════
// 1. AFM SHAPE ONE — Mock Paper 1: ordinal + LO code + marks.
//    scripts/authoring/author-afm-mock-paper-1.ts:446
//      `(${roman}) ${lo} — ${marks} marks`
//    All eight live labels, verbatim. Both modes must agree: the code is removed by the
//    EXACT lo_code match, so the backstop is not what is doing the work.
// ═══════════════════════════════════════════════════════════════════════════════
const AFM_MOCK1: Array<[string, string, string]> = [
  ['(i) B3e — 10 marks',   'B3e', '(i)'],
  ['(ii) B5b — 16 marks',  'B5b', '(ii)'],
  ['(iii) E2b — 8 marks',  'E2b', '(iii)'],
  ['(iv) E1a — 6 marks',   'E1a', '(iv)'],
  ['(i) B1a — 12 marks',   'B1a', '(i)'],
  ['(ii) B1b — 8 marks',   'B1b', '(ii)'],
  ['(i) E3a — 12 marks',   'E3a', '(i)'],
  ['(ii) E2a — 8 marks',   'E2a', '(ii)'],
];
for (const [stored, lo, want] of AFM_MOCK1) {
  ok(`AFM mock1 "${stored}" → serve "${want}"`, serve(stored, lo) === want);
  ok(`AFM mock1 "${stored}" → marker "${want}" (same, via exact lo_code)`, markerLabel(stored, lo) === want);
  ok(`AFM mock1 "${stored}" → sitDisplayLabel unchanged by the extraction`, sitDisplayLabel(stored, lo) === want);
}
ok('no AFM mock1 label leaks a syllabus code to the MARKER',
  AFM_MOCK1.every(([s, lo]) => !/\b[A-E][0-9]{1,2}[a-z]?\b/.test(markerLabel(s, lo) ?? '')));
ok('no AFM mock1 label leaks a marks phrase to the MARKER',
  AFM_MOCK1.every(([s, lo]) => !/marks?/i.test(markerLabel(s, lo) ?? '')));

// ═══════════════════════════════════════════════════════════════════════════════
// 2. AFM SHAPE TWO — non-mock authored cases: ordinal + marks, NO code.
//    scripts/authoring/author-afm-case.ts:413
//      `(${roman}) — ${marks} marks`
//    The doctrine table in AFM_SURFACED.md shows only shape one, so this shape is pinned
//    explicitly: it reaches the PRACTICE marking path, which shape one does not.
// ═══════════════════════════════════════════════════════════════════════════════
const AFM_AUTHORED: Array<[string, string, string]> = [
  ['(i) — 12 marks',   'B1a', '(i)'],
  ['(ii) — 8 marks',   'B1b', '(ii)'],
  ['(iii) — 10 marks', 'E2b', '(iii)'],
  ['(iv) — 6 marks',   'E1a', '(iv)'],
  ['(v) — 4 marks',    'A2c', '(v)'],
];
for (const [stored, lo, want] of AFM_AUTHORED) {
  ok(`AFM authored "${stored}" → serve "${want}"`, serve(stored, lo) === want);
  ok(`AFM authored "${stored}" → marker "${want}"`, markerLabel(stored, lo) === want);
}
ok('the marks-only shape never leaves a dangling separator (marker)',
  AFM_AUTHORED.every(([s, lo]) => !/^[—–\-·:|]|[—–\-·:|]$/.test(markerLabel(s, lo) ?? '')));

// ═══════════════════════════════════════════════════════════════════════════════
// 3. APM — descriptive titles that CARRY MEANING. All 16 live labels, verbatim from
//    supabase/apm_questions/*.sql. Every one must pass through BYTE-IDENTICAL in BOTH
//    modes. This is the half of the doctrine that says "strip, do not remove": these
//    are genuine context the PS marker should keep reading.
//
//    The previous suite represented APM with '(a)' and '(b) Performance report' — two
//    stand-ins that any implementation would pass. These are the real rows.
// ═══════════════════════════════════════════════════════════════════════════════
const APM_LIVE: string[] = [
  '(i) Data silos and the systems proposal',
  '(i) The benchmarking exercise',
  '(i) The big data proposal',
  '(i) The charts and numerical presentation',
  '(i) The churn model output',
  '(i) The current board report',
  '(ii) Data and systems risks',
  '(ii) Ethical issues',
  '(ii) Narrative commentary',
  '(ii) The consultant',
  '(ii) The head-office measurement proposal',
  '(ii) The monthly reporting pack',
  '(ii) The narrative commentary',
  '(ii) The proposed dashboard',
  '(iii) The budgeting proposal',
  '(iii) The proposed reward scheme',
];
for (const stored of APM_LIVE) {
  ok(`APM live "${stored}" survives the MARKER strip byte-identical`, markerLabel(stored, null) === stored);
  ok(`APM live "${stored}" survives the SERVE strip byte-identical`, serve(stored, null) === stored);
}
ok('every live APM label is unchanged by both modes (aggregate)',
  APM_LIVE.every((s) => markerLabel(s, null) === s && serve(s, null) === s && sitDisplayLabel(s, null) === s));

// ═══════════════════════════════════════════════════════════════════════════════
// 4. ⛔ THE ASYMMETRY, AND WHY IT EXISTS — B2-IN-PROSE.
//    An APM label naming a division "B2" matches LO_CODE_SHAPE. The suite asserts BOTH
//    halves: that the backstop really would eat it (so this is a live hazard, not a
//    hypothetical), and that the marking form does not.
// ═══════════════════════════════════════════════════════════════════════════════
const B2_PROSE = '(ii) Division B2 performance';
ok('⛔ MUST-FAIL: the serve-boundary sweep DOES eat a division named "B2"',
  serve(B2_PROSE, null) === '(ii) Division performance');
ok('…and the MARKER keeps it, which is the whole point of sweepCodeShape:false',
  markerLabel(B2_PROSE, null) === B2_PROSE);
ok('the two modes genuinely DIVERGE on it (the asymmetry is real, not decorative)',
  serve(B2_PROSE, null) !== markerLabel(B2_PROSE, null));

const MORE_PROSE_HAZARDS: Array<[string, string]> = [
  ['(i) The C3 product line', '(i) The product line'],
  ['(iii) Site A1 and its overheads', '(iii) Site and its overheads'],
  ['(ii) The B12 divisional review', '(ii) The divisional review'],
];
for (const [stored, sweptTo] of MORE_PROSE_HAZARDS) {
  ok(`⛔ MUST-FAIL: sweep mangles "${stored}"`, serve(stored, null) === sweptTo);
  ok(`…marker preserves "${stored}"`, markerLabel(stored, null) === stored);
}

// The exact-lo_code removal is safe in BOTH modes — it deletes the row's own code and
// nothing else. That is why marking keeps it and drops only the shape sweep.
ok('marker still removes the row\'s OWN code by exact match',
  markerLabel('(i) B3e — 10 marks', 'B3e') === '(i)');
ok('marker removes the own-code match case-insensitively',
  markerLabel('(i) b3e — 10 marks', 'B3e') === '(i)');
ok('marker leaves a DIFFERENT code alone when it is not this row\'s',
  markerLabel('(ii) Division B2 performance', 'E3a') === '(ii) Division B2 performance');

// ═══════════════════════════════════════════════════════════════════════════════
// 5. WHERE THE MODES DIVERGE ON REAL-SHAPED DATA — a code with NO lo_code.
//    Measured as 0 rows today (see the header), but pinned because the divergence must
//    fall in the chosen direction if a future row reintroduces it: the candidate must
//    never see a code; the marker may, rather than risk losing a real word.
// ═══════════════════════════════════════════════════════════════════════════════
ok('serve: backstop strips a code when lo_code is ABSENT', serve('(i) B3e — 10 marks', null) === '(i)');
ok('serve: backstop strips a code when lo_code DISAGREES', serve('(i) B3e — 10 marks', 'C2a') === '(i)');
ok('marker: a code with no lo_code SURVIVES — accepted, and 0 such rows exist today',
  markerLabel('(i) B3e — 10 marks', null) === '(i) B3e');
ok('marker: a code whose lo_code disagrees SURVIVES',
  markerLabel('(i) B3e — 10 marks', 'C2a') === '(i) B3e');

// ═══════════════════════════════════════════════════════════════════════════════
// 6. THE NULL CONTRACT — both callers define their own fallback, so the function must
//    report "nothing left" rather than guess. Marking's fallback is `Requirement N`
//    (pinned in test-case-marking-technical.ts); the serve boundary renders no chip.
// ═══════════════════════════════════════════════════════════════════════════════
ok('null label → null (serve)', serve(null) === null);
ok('undefined label → null (serve)', serve(undefined) === null);
ok('null label → null (marker)', markerLabel(null, null) === null);
ok('undefined label → null (marker)', markerLabel(undefined, null) === null);
ok('a code-only label → null in both modes',
  serve('B3e', 'B3e') === null && markerLabel('B3e', 'B3e') === null);
ok('a marks-only label → null in both modes',
  serve('10 marks', null) === null && markerLabel('10 marks', null) === null);
ok('an all-separator remnant → null in both modes',
  serve('— B3e —', 'B3e') === null && markerLabel('— B3e —', 'B3e') === null);
ok('an empty string → null in both modes',
  serve('', null) === null && markerLabel('', null) === null);
ok('whitespace only → null in both modes',
  serve('   ', null) === null && markerLabel('   ', null) === null);
// A code-only label with NO lo_code is the one case where the modes disagree on nullness:
// the marker keeps the code rather than deleting the row's only content.
ok('code-only, no lo_code: serve → null, marker → the code',
  serve('B3e', null) === null && markerLabel('B3e', null) === 'B3e');

// ═══════════════════════════════════════════════════════════════════════════════
// 7. MARKS PHRASING — removed in BOTH modes, in every authored form in the corpus.
//    The marks phrase is not a shape hazard (a label naming "10 marks" in prose means
//    the marks), so both readers drop it.
// ═══════════════════════════════════════════════════════════════════════════════
const MARKS_FORMS: Array<[string, string]> = [
  ['(i) — 10 marks', '(i)'],
  ['(i) (10 marks)',  '(i)'],
  ['(i) — 1 mark',    '(i)'],
  ['(i) - 8 marks',   '(i)'],
  ['(i) [12 marks]',  '(i)'],
];
for (const [stored, want] of MARKS_FORMS) {
  ok(`marks form "${stored}" → "${want}" in both modes`,
    serve(stored, null) === want && markerLabel(stored, null) === want);
}

// ═══════════════════════════════════════════════════════════════════════════════
// 8. WHAT MUST NEVER BE MISTAKEN FOR A CODE, in either mode.
// ═══════════════════════════════════════════════════════════════════════════════
ok('roman numerals are never read as a code', serve('(iii) — 8 marks', null) === '(iii)');
ok('the mark NUMBER is never read as a code', serve('(i) — 10 marks', 'B3e') === '(i)');
ok('prose in a label survives the serve strip', serve('(i) Part one — 10 marks', null) === '(i) Part one');
ok('prose in a label survives the marker strip', markerLabel('(i) Part one — 10 marks', null) === '(i) Part one');

// ═══════════════════════════════════════════════════════════════════════════════
// 9. ⛔ MUST-FAIL: THE TWO IMPLEMENTATIONS THIS MODULE EXISTS TO PREVENT.
//    A green suite that a broken implementation would also pass is not evidence, so the
//    wrong answers are pinned as wrong (P-G3).
// ═══════════════════════════════════════════════════════════════════════════════
// (a) Marking reusing the serve-boundary behaviour verbatim — the coupling that was ruled
//     against. It is wrong ONLY on the shape hazard, which is exactly why it would have
//     shipped unnoticed: every AFM label agrees.
const WRONG_reuseServe = (l: string, lo: string | null) => strippedLabel(l, lo, { sweepCodeShape: true });
ok('⛔ MUST-FAIL: reusing the serve strip in marking loses the "B2" division',
  WRONG_reuseServe(B2_PROSE, null) !== B2_PROSE && markerLabel(B2_PROSE, null) === B2_PROSE);
ok('…and is INDISTINGUISHABLE from the right answer on all 8 AFM mock labels',
  AFM_MOCK1.every(([s, lo]) => WRONG_reuseServe(s, lo) === markerLabel(s, lo)));

// (b) Removing the label outright instead of stripping it — strips APM of real context to
//     fix an AFM-only problem. The doctrine's own words.
const WRONG_removeAll = (_l: string) => null;
ok('⛔ MUST-FAIL: removing labels outright discards live APM context',
  APM_LIVE.every((s) => WRONG_removeAll(s) === null) && markerLabel(APM_LIVE[0], null) === APM_LIVE[0]);

// (c) Dropping the exact-lo_code removal and relying on the shape sweep alone — passes on
//     AFM (the codes match the shape) and reintroduces the APM hazard.
const WRONG_shapeOnly = (l: string, _lo: string | null) => strippedLabel(l, null, { sweepCodeShape: true });
ok('⛔ MUST-FAIL: shape-sweep-only still strips AFM correctly, so AFM cannot detect it',
  AFM_MOCK1.every(([s, lo, want]) => WRONG_shapeOnly(s, lo) === want));
ok('…but mangles the APM division, which the real marker form does not',
  WRONG_shapeOnly(B2_PROSE, null) !== markerLabel(B2_PROSE, null));

console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} requirement-label: ${failures} failure(s)`);
process.exitCode = failures === 0 ? 0 : 1;
