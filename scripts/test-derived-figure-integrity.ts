// scripts/test-derived-figure-integrity.ts
// Fixtures for GATE 27 — DERIVED_FIGURE_INTEGRITY (lib/acca/derived-figure-integrity.ts).
// Pure — no env/DB/model. Exit 1 on any mismatch.
//
// GATE 27 is the REVERSE of GATE 2: GATE 2 asks "is every code figure in the prose?", this
// asks "does every figure in the prose trace back to code?". Derived intermediates — a
// comparison margin, a Σ, a post-tax Kd — are the exposed class.
import { runDerivedFigureIntegrity, findOrphanNumerics, buildAllowedRenderings } from '../lib/acca/derived-figure-integrity';

let failures = 0;
function check(name: string, got: unknown, want: unknown) {
  const ok = JSON.stringify(got) === JSON.stringify(want);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'} :: ${name}${ok ? '' : `  (got ${JSON.stringify(got)}, want ${JSON.stringify(want)})`}`);
}

const PROSE = (s: string) => ({ model_answer: s });

// ── (1) ENGAGEMENT RULE — LOUD when a result object is supplied, silent no-op otherwise ──
// The rule exists because the check is only sound when it can see the derived intermediates.
// Measured during FR3: the same 8 gate-green mock requirements yield 2 orphans WITH result
// objects and 29 WITHOUT — a 14.5x inflation on identical, correct content.
const orphanProse = PROSE('The margin is EUR 0.4m on roughly EUR 31.7m.');
check('ENGAGED (result object supplied) -> reports the orphan',
  runDerivedFigureIntegrity(orphanProse, [31.713780918727913], '', [{ margin: 999 }]).orphans.length, 1);
check('ENGAGED flag is true when a result object is supplied',
  runDerivedFigureIntegrity(orphanProse, [31.713780918727913], '', [{ margin: 999 }]).engaged, true);
check('NO-OP when computed is undefined -> zero orphans',
  runDerivedFigureIntegrity(orphanProse, [31.713780918727913], '', undefined).orphans.length, 0);
check('NO-OP when computed is an EMPTY array -> zero orphans',
  runDerivedFigureIntegrity(orphanProse, [31.713780918727913], '', []).orphans.length, 0);
check('NO-OP reports engaged=false',
  runDerivedFigureIntegrity(orphanProse, [31.713780918727913], '', undefined).engaged, false);
check('NO-OP carries a reason for the gate line',
  /not engaged/.test(runDerivedFigureIntegrity(orphanProse, [], '', undefined).reason ?? ''), true);
// the derived value becomes traceable once it IS on the result object
check('ENGAGED and clean once the derived value is exposed on the result object',
  runDerivedFigureIntegrity(orphanProse, [31.713780918727913], '', [{ margin: 0.43820879667520884 }]).orphans.length, 0);

// ── (2) E4 following-cue BLOCKLIST — quantities the answer asserts are NOT exempt ──
// A bare small integer is incidental prose counting; the same integer followed by a
// quantity noun is a computed position that must trace to code. The wrong contract count is
// the single most examiner-flagged error in the hedging families — it must not be exempt
// just because it happens to be <= 12.
for (const noun of ['contracts', 'contract', 'units', 'shares', 'tranches']) {
  check(`E4 blocklist POSITIVE: "4 ${noun}" is NOT exempt (orphan reported)`,
    findOrphanNumerics({ prose: PROSE(`The treasury sells 4 ${noun}.`), codeOwned: [], givens: '' }).length, 1);
  check(`E4 blocklist: "4 ${noun}" passes when 4 IS code-owned`,
    findOrphanNumerics({ prose: PROSE(`The treasury sells 4 ${noun}.`), codeOwned: [4], givens: '' }).length, 0);
}
check('E4 blocklist NEGATIVE: a bare small integer is still exempt',
  findOrphanNumerics({ prose: PROSE('The project runs for 4 years and has 3 scenarios.'), codeOwned: [], givens: '' }).length, 0);
check('E4 blocklist NEGATIVE: an unrelated following noun is still exempt',
  findOrphanNumerics({ prose: PROSE('There are 4 subsidiaries.'), codeOwned: [], givens: '' }).length, 0);
check('E4 ceiling still holds: 13+ is never exempt',
  findOrphanNumerics({ prose: PROSE('The board reviewed 47 items.'), codeOwned: [], givens: '' }).length, 1);

// ── (3) E2 was DROPPED — a mark allocation is no longer exempt on its own ──
check('E2 dropped: "10 marks" in scanned prose is NOT exempt any more',
  findOrphanNumerics({ prose: PROSE('This part carries 47 marks in total.'), codeOwned: [], givens: '' }).length, 1);

// ── (4) the core rule: code-owned, givens, and boundary renderings ──
check('a code-owned value passes',
  findOrphanNumerics({ prose: PROSE('The NPV is EUR 15.1m.'), codeOwned: [15.081], givens: '' }).length, 0);
check('a GIVEN from the scenario passes',
  findOrphanNumerics({ prose: PROSE('The outlay is BRL 480 million.'), codeOwned: [], givens: 'an upfront capital outlay of BRL 480 million' }).length, 0);
check('an invented figure is an orphan',
  findOrphanNumerics({ prose: PROSE('The NPV is EUR 99.9m.'), codeOwned: [15.081], givens: '' }).length, 1);
// FR3 interaction: the calculators render on-boundary values through fixedHalfUp, so the
// allowed-set must include that form or every boundary figure reads as an orphan.
const ASSET_BETA = 1.35 * 60 / (60 + 40 * (1 - 0.34));   // 0.9375 in arithmetic, 0.9374999999999999 as a double
check('the BOUNDARY-AWARE rendering of a code value is allowed (FR3 interaction)',
  findOrphanNumerics({ prose: PROSE('asset beta 0.938'), codeOwned: [ASSET_BETA], givens: '' }).length, 0);
check('the plain toFixed rendering of the same value is also allowed',
  findOrphanNumerics({ prose: PROSE('asset beta 0.937'), codeOwned: [ASSET_BETA], givens: '' }).length, 0);
check('buildAllowedRenderings carries both forms',
  [buildAllowedRenderings([ASSET_BETA]).has('0.937'), buildAllowedRenderings([ASSET_BETA]).has('0.938')], [true, true]);
// decimal-stored rate rendered as a percentage
check('a decimal-stored rate matches its percentage rendering',
  findOrphanNumerics({ prose: PROSE('taxed at 26.5%'), codeOwned: [0.265], givens: '' }).length, 0);

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL DERIVED-FIGURE-INTEGRITY FIXTURES PASS' : `${failures} DERIVED-FIGURE-INTEGRITY FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
