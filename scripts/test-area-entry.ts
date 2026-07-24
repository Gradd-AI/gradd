// scripts/test-area-entry.ts
// Fixtures for the deterministic entry-drill picker (lib/acca/area-entry.ts). Pure — no env/DB/model.
// Covers: (1) a zero-attempt serve resolves to the ENTRY kind of the area; (2) regenerating a drill
// (new id, new created_at, same code-generated heading) does NOT change which kind is the entry;
// (3) the pattern holds for every area, incl. B4 where a dual-tagged credit drill must NOT steal the
// entry from the valuation family; (4) an all-unknown-heading area returns null (caller falls back).
import { pickEntryDrill, entryRank } from '../lib/acca/area-entry';

let failures = 0;
function ok(name: string, cond: boolean) { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`); }

const H = {
  npv: '**Investment appraisal — net present value**',
  irr: '**Investment appraisal — internal rate of return**',
  bsop: '**Option valuation — Black-Scholes (BSOP)**',
  wacc: '**Cost of capital — CAPM / weighted average cost of capital**',
  ungeared: '**Cost of capital — CAPM / ungeared cost of equity**',
  apv: '**Investment appraisal — adjusted present value (APV)**',
  duration: '**Bond duration — interest-rate exposure**',
  credit: '**Credit risk — rating, spread and the cost of debt**',
  fcfe: '**Equity valuation (free cash flow to equity)**',
  fcff: '**Firm and equity valuation (FCFF, with the cost of capital derived)**',
  divcap: '**Dividend capacity and dividend policy**',
  compare: '**Valuation of the target — two methods and a range**',
  intlNpv: '**International investment appraisal — net present value to the parent**',
  intlSens: '**Impact of alternative exchange-rate assumptions on project value**',
  intlRemit: '**International appraisal with a remittance restriction**',
  irFutures: '**Interest-rate hedging — futures**',
  irOptions: '**Interest-rate hedging — options on futures**',
  irCollar: '**Interest-rate hedging — collar**',
  irSwap: '**Interest-rate hedging — swap (comparative advantage)**',
  fxForwardMmh: '**FX hedging — forward vs money-market hedge**',
  fxFutures: '**FX hedging — currency futures**',
  fxOptions: '**FX hedging — currency options**',
  fxSwap: '**FX hedging — currency swap**',
  enTreasuryEstablish: '**Treasury function — establishing a group treasury and its impact on existing functions**',
  enTreasuryContribution: '**Treasury function — how a dedicated treasury department makes a positive financial contribution**',
  enForexExposure: '**Foreign-exchange exposure — identifying, distinguishing and managing the three exposure types**',
};
// build a drill with a heading + trailing body (heading is the FIRST line, as in the real model_answer)
const drill = (id: string, lo_code: string, heading: string) => ({ id, lo_code, model_answer: `${heading}\n\nbody line\nmore` });

// ── B5 international — the live case that motivated the fix. Entry = K1 (home-currency NPV, B5b). ──
const b5 = [
  drill('499357f7', 'B5b', H.intlNpv),    // K1 — entry
  drill('fcf14ae8', 'B5a', H.intlSens),   // K2
  drill('eac98c43', 'B5b', H.intlRemit),  // K3 — hardest (the one wrongly served on the walk)
];
ok('B5 zero-attempt serve = K1 (home-currency NPV), not K2/K3', pickEntryDrill(b5)?.id === '499357f7');
ok('B5 entry is NOT the restricted-remittance drill (K3)', pickEntryDrill(b5)?.id !== 'eac98c43');
// shuffle order — selection is order-independent
ok('B5 entry stable under input reordering', pickEntryDrill([b5[2], b5[0], b5[1]])?.id === '499357f7');

// ── Regenerating a drill does not change the entry KIND ──
// (a) regenerate the ENTRY drill: new id + (notional) new created_at, SAME heading → still the entry kind.
const b5RegenEntry = [
  drill('99999999', 'B5b', H.intlNpv),    // K1 regenerated — brand-new id
  drill('fcf14ae8', 'B5a', H.intlSens),
  drill('eac98c43', 'B5b', H.intlRemit),
];
ok('regen of the entry drill (new id, same heading) → entry is still the NPV kind', entryRank(pickEntryDrill(b5RegenEntry)!.model_answer) === entryRank(H.intlNpv));
ok('regen of the entry drill → entry id follows the regenerated row', pickEntryDrill(b5RegenEntry)?.id === '99999999');
// (b) regenerate a NON-entry drill (K3): entry unchanged.
const b5RegenOther = [b5[0], b5[1], drill('aaaaaaaa', 'B5b', H.intlRemit)];
ok('regen of a non-entry drill does not change the entry', pickEntryDrill(b5RegenOther)?.id === '499357f7');

// ── B1 — NPV is the entry over IRR ──
const b1 = [
  drill('n1', 'B1a', H.npv), drill('n2', 'B1a', H.npv),
  drill('i1', 'B1c', H.irr), drill('i2', 'B1c', H.irr),
];
ok('B1 zero-attempt serve = an NPV drill (not IRR)', entryRank(pickEntryDrill(b1)!.model_answer) === entryRank(H.npv));

// ── B3 — spans 4 families; cost of capital (WACC) is the entry ──
const b3 = [
  drill('c1', 'B3d', H.wacc), drill('u1', 'B3e', H.ungeared),
  drill('a1', 'B3j', H.apv), drill('d1', 'B3f', H.duration), drill('cr1', 'B3h', H.credit),
];
ok('B3 zero-attempt serve = a CAPM/WACC drill (foundational entry across the 4 B3 families)', entryRank(pickEntryDrill(b3)!.model_answer) === entryRank(H.wacc));

// ── B4 — valuation family + a DUAL-TAGGED credit drill. Entry must be a valuation drill, NOT credit. ──
const b4 = [
  drill('v1', 'B4c', H.fcff), drill('v2', 'B4c', H.fcff),
  drill('v3', 'B4a', H.fcfe), drill('v4', 'B4a', H.divcap),
  drill('v5', 'B4b', H.compare),
  drill('cr2', 'B4a', H.credit), // a credit drill dual-tagged under B4 (must not become the entry)
];
ok('B4 zero-attempt serve = the FCFE valuation kind (entry), NOT the dual-tagged credit drill', pickEntryDrill(b4)?.id === 'v3');
ok('B4 entry is a valuation heading, not the credit heading', entryRank(pickEntryDrill(b4)!.model_answer) === entryRank(H.fcfe));

// ── E3 — interest-rate hedging (calc #12). Entry = K1 futures (a single locked rate). ──
const e3 = [
  drill('ir1', 'E3a', H.irFutures),  // K1 — entry
  drill('ir2', 'E3a', H.irOptions),  // K2
  drill('ir3', 'E3a', H.irCollar),   // K3
  drill('ir4', 'E3a', H.irSwap),     // K4
];
ok('E3 zero-attempt serve = K1 (interest-rate futures), not options/collar/swap', pickEntryDrill(e3)?.id === 'ir1');
ok('E3 entry stable under input reordering', pickEntryDrill([e3[3], e3[1], e3[0], e3[2]])?.id === 'ir1');
ok('E3 futures ranks below options, collar and swap', entryRank(H.irFutures) < entryRank(H.irOptions) && entryRank(H.irOptions) < entryRank(H.irCollar) && entryRank(H.irCollar) < entryRank(H.irSwap));
ok('E3 ranks sit entirely above E2 (own area, never overlaps FX hedging)', entryRank(H.irFutures) > entryRank('**FX hedging — currency swap**'));

// ── E2 — FX hedging (calc #11). Entry = K1 forward+MMH (the Step-0 entry). ──
const e2 = [
  drill('fx1', 'E2b', H.fxForwardMmh), // K1 — entry
  drill('fx2', 'E2b', H.fxFutures),    // K2
  drill('fx3', 'E2b', H.fxOptions),    // K3
  drill('fx4', 'E2b', H.fxSwap),       // K4
];
ok('E2 zero-attempt serve = K1 (forward+MMH), not futures/options/swap', pickEntryDrill(e2)?.id === 'fx1');
ok('E2 entry stable under input reordering', pickEntryDrill([e2[3], e2[1], e2[0], e2[2]])?.id === 'fx1');

// ── E-NARRATIVE ordering subtlety (GATE-P flip 2026-07-24) — the case this section exists to prove.
// EN3 (E2a) shares the E2 area BUCKET with fxhedge (E2b/E2c) via the 2-char lo_code prefix. A narrative
// drill must NEVER become an area's entry when a calculator exists there — proven here with REAL mixed
// data (fxhedge K1–K4 + the EN3 narrative drill all in one E2 area fetch), not just by rank inspection. ──
const e2WithNarrative = [...e2, drill('en3', 'E2a', H.enForexExposure)];
ok('E2 zero-attempt serve STILL = fxhedge K1 (51163dac-shaped) when EN3 (E2a) is mixed into the same area fetch — EN3 does NOT steal the entry', pickEntryDrill(e2WithNarrative)?.id === 'fx1');
ok('EN3 (E2a) ranks strictly above every fxhedge kind (K1–K4), not merely above K1', entryRank(H.enForexExposure) > entryRank(H.fxForwardMmh) && entryRank(H.enForexExposure) > entryRank(H.fxFutures) && entryRank(H.enForexExposure) > entryRank(H.fxOptions) && entryRank(H.enForexExposure) > entryRank(H.fxSwap));
// order-independence: EN3 first in the array, fxhedge K1 still wins
ok('E2+EN3 entry is order-independent (EN3 listed first)', pickEntryDrill([drill('en3', 'E2a', H.enForexExposure), ...e2])?.id === 'fx1');

// ── E1 — treasury narrative (EN1/EN2). NO calculator exists in E1 — narrative is the ONLY content,
// so it is the E1 entry by construction (not a "narrative beats a calculator" case, unlike E2 above).
// EN1 (establishing/relocating) ranks below EN2 (positive contribution) — EN1 is the entry. ──
const e1 = [
  drill('en1', 'E1a', H.enTreasuryEstablish),   // EN1 — entry
  drill('en2', 'E1a', H.enTreasuryContribution), // EN2
];
ok('E1 zero-attempt serve = EN1 (establishing a group treasury), not EN2', pickEntryDrill(e1)?.id === 'en1');
ok('E1 entry stable under input reordering', pickEntryDrill([e1[1], e1[0]])?.id === 'en1');
ok('EN1 ranks below EN2 (both E1a)', entryRank(H.enTreasuryEstablish) < entryRank(H.enTreasuryContribution));

// ── Unknown headings → null (caller falls back to the existing random pick) ──
ok('all-unknown-heading area returns null (safe fallback)', pickEntryDrill([drill('x1', 'Z9z', '**Some brand-new family heading**'), drill('x2', 'Z9z', '**Another new heading**')]) === null);
ok('a known entry still wins even when mixed with an unknown-heading sibling', pickEntryDrill([drill('x1', 'B5b', '**Unknown**'), b5[0]])?.id === '499357f7');

// ── every ranked heading is distinct-or-intentional: entry ranks are finite & ordered as documented ──
ok('NPV ranks below IRR', entryRank(H.npv) < entryRank(H.irr));
ok('credit ranks ABOVE valuation (cannot steal a valuation area entry)', entryRank(H.credit) > entryRank(H.compare));
ok('international NPV (K1) ranks below sensitivity (K2) and remittance (K3)', entryRank(H.intlNpv) < entryRank(H.intlSens) && entryRank(H.intlSens) < entryRank(H.intlRemit));

console.log(failures === 0 ? '\nALL AREA-ENTRY FIXTURES PASS' : `\n${failures} FAILURE(S)`);
process.exit(failures === 0 ? 0 : 1);
