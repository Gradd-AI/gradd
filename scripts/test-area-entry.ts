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
  // PS-cell batch (2026-08-02) — D6/D7 (E2) + D8 (B1b)
  psFxFullyHedged: '**Foreign-exchange exposure — testing a claim that the group is fully hedged**',
  psNetting: '**Netting and matching — whether a group netting arrangement earns its cost**',
  psMonteCarloChallenge: '**Monte Carlo simulation — challenging the assumptions behind the output**',
  d1MonteCarlo: '**Monte Carlo simulation — interpreting the simulation output**',
  // PS-cell batch 2 (2026-08-02) — D9 (B5c) · D10 (E3a) · D11 (A3c)
  psB5Comm: '**Exchange controls — briefing a local operating board on restricted remittance**',
  psE3Scep: '**Interest-rate hedging — testing a claim that the rate risk has been eliminated**',
  psA3Comm: '**Stakeholder management — communicating a remediation commitment to an affected community**',
  d5ExchangeControls: '**Exchange controls and international sources of finance**',
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

// ── PS-CELL BATCH (2026-08-02) — D6 (E2a, scepticism) + D7 (E2c, commercial_acumen).
// The SAME hazard EN3 proves, with one addition that is easy to get wrong: D7 is E2c, and E2c is an
// lo_code the fxhedge CALCULATOR also lives under in the study guide. It is still resolved through the
// 2-char E2 bucket, so being "the only drill on its LO" buys it nothing — it must clear the whole
// fxhedge span exactly as EN3 does. Proven on REAL mixed data (K1–K4 + EN3 + D6 + D7 in one fetch). ──
const e2WithPsCell = [
  ...e2,
  drill('en3', 'E2a', H.enForexExposure),
  drill('d6', 'E2a', H.psFxFullyHedged),
  drill('d7', 'E2c', H.psNetting),
];
ok('E2 zero-attempt serve STILL = fxhedge K1 with D6+D7+EN3 all mixed into the same area fetch', pickEntryDrill(e2WithPsCell)?.id === 'fx1');
ok('E2+D6+D7 entry is order-independent (both new drills listed first)', pickEntryDrill([drill('d7', 'E2c', H.psNetting), drill('d6', 'E2a', H.psFxFullyHedged), ...e2])?.id === 'fx1');
ok('D6 (E2a) ranks strictly above every fxhedge kind K1–K4', [H.fxForwardMmh, H.fxFutures, H.fxOptions, H.fxSwap].every((h) => entryRank(H.psFxFullyHedged) > entryRank(h)));
ok('D7 (E2c) ranks strictly above every fxhedge kind K1–K4', [H.fxForwardMmh, H.fxFutures, H.fxOptions, H.fxSwap].every((h) => entryRank(H.psNetting) > entryRank(h)));
// Both must also clear the irhedge span (74–77): the E-narrative band's stated bar is "above every
// E-calculator", not merely "above fxhedge" — a rank of 75 would pass the fxhedge check and still be
// wrong. Checked explicitly so the weaker test can never stand in for the real one.
ok('D6 and D7 clear the irhedge span too (above every E-calculator, not just fxhedge)', entryRank(H.psFxFullyHedged) > entryRank(H.irSwap) && entryRank(H.psNetting) > entryRank(H.irSwap));
ok('D6 and D7 rank above the existing E-narrative cluster (EN1–EN3), keeping the band ordered by arrival', entryRank(H.psFxFullyHedged) > entryRank(H.enForexExposure) && entryRank(H.psNetting) > entryRank(H.psFxFullyHedged));

// ── D8 (B1b, scepticism) — same LO as D1 (B1b, analysis_and_evaluation). The B1 hazard is different
// from E2's: every B-calculator is ≤53, so clearing them is automatic. What must be proven here is
// that adding a SECOND B1b narrative drill does not disturb NPV as the B1 entry, and that D8 sits
// below D1 within the narrative band (interpret before challenge). ──
const b1WithBothNarratives = [
  drill('npv1', 'B1a', H.npv),
  drill('irr1', 'B1c', H.irr),
  drill('d1', 'B1b', H.d1MonteCarlo),
  drill('d8', 'B1b', H.psMonteCarloChallenge),
];
ok('B1 zero-attempt serve = NPV with BOTH B1b narrative drills (D1 + D8) in the same area fetch', pickEntryDrill(b1WithBothNarratives)?.id === 'npv1');
ok('B1+D1+D8 entry is order-independent (both narrative drills listed first)', pickEntryDrill([drill('d8', 'B1b', H.psMonteCarloChallenge), drill('d1', 'B1b', H.d1MonteCarlo), drill('npv1', 'B1a', H.npv), drill('irr1', 'B1c', H.irr)])?.id === 'npv1');
ok('D8 ranks below D1 (interpret the output before challenging it), both above every B-calculator', entryRank(H.d1MonteCarlo) < entryRank(H.psMonteCarloChallenge) && entryRank(H.d1MonteCarlo) > entryRank(H.irr));
// The two B1b headings must be DISTINCT strings — a copy-paste collision would silently make one
// drill inherit the other's rank and go unranked in effect.
ok('D1 and D8 headings are distinct (no silent rank collision on the shared B1b LO)', H.d1MonteCarlo !== H.psMonteCarloChallenge && entryRank(H.d1MonteCarlo) !== entryRank(H.psMonteCarloChallenge));

// ── PS-CELL BATCH 2 (2026-08-02) — D9 (B5c) · D10 (E3a) · D11 (A3c).
// Each faces a DIFFERENT version of the hazard, which is why they are asserted separately rather
// than as one "all new ranks are high enough" check. ──

// D10 · E3a — E3's own bucket holds the irhedge calculators at 74–77. The E-band rule is "above the
// WHOLE E-calculator span", not "above this area's calculators", so 78 would satisfy E3 alone and
// still break the rule the E2 pair had to meet. Checked against both bars.
const e3WithNarrative = [...e3, drill('d10', 'E3a', H.psE3Scep)];
ok('E3 zero-attempt serve STILL = irhedge futures K1 with D10 mixed into the same area fetch', pickEntryDrill(e3WithNarrative)?.id === 'ir1');
ok('E3+D10 entry is order-independent (D10 listed first)', pickEntryDrill([drill('d10', 'E3a', H.psE3Scep), ...e3])?.id === 'ir1');
ok('D10 ranks above every irhedge kind K1–K4', [H.irFutures, H.irOptions, H.irCollar, H.irSwap].every((h) => entryRank(H.psE3Scep) > entryRank(h)));
ok('D10 also clears the fxhedge span (the E-band rule is the WHOLE E-calculator span, not just its own area)', [H.fxForwardMmh, H.fxFutures, H.fxOptions, H.fxSwap].every((h) => entryRank(H.psE3Scep) > entryRank(h)));

// D9 · B5c — B5's calculators are 50–53 (international family), so clearing them is automatic; what
// must be proven is that a SECOND B5 narrative drill does not disturb the international NPV entry
// and that it ranks after D5, the other B5c/d narrative.
const b5WithBothNarratives = [
  drill('intl1', 'B5a', H.intlNpv),
  drill('intl3', 'B5c', H.intlRemit),
  drill('d5', 'B5c', H.d5ExchangeControls),
  drill('d9', 'B5c', H.psB5Comm),
];
ok('B5 zero-attempt serve = international NPV with BOTH B5 narrative drills (D5 + D9) present', pickEntryDrill(b5WithBothNarratives)?.id === 'intl1');
ok('B5+D5+D9 entry is order-independent (both narrative drills listed first)', pickEntryDrill([drill('d9', 'B5c', H.psB5Comm), drill('d5', 'B5c', H.d5ExchangeControls), drill('intl1', 'B5a', H.intlNpv), drill('intl3', 'B5c', H.intlRemit)])?.id === 'intl1');
ok('D9 ranks after D5 (the older, broader B5c/d financing narrative stays the lower-ranked of the two)', entryRank(H.d5ExchangeControls) < entryRank(H.psB5Comm));
ok('D9 clears every B5 international calculator kind', [H.intlNpv, H.intlSens, H.intlRemit].every((h) => entryRank(H.psB5Comm) > entryRank(h)));

// D11 · A3c — A3 has NO calculator and no other drill of any kind, so D11 is the A3 entry BY
// CONSTRUCTION (the E1 situation, not the E2 one). The point to prove is that this is by absence of
// a competitor, not by a rank that would have beaten one.
const a3 = [drill('d11', 'A3c', H.psA3Comm)];
ok('A3 zero-attempt serve = D11, the only A3 drill (entry by construction, no calculator to protect)', pickEntryDrill(a3)?.id === 'd11');
ok('D11 would NOT have taken the entry from a calculator had one existed in A3', entryRank(H.psA3Comm) > entryRank(H.divcap) && entryRank(H.psA3Comm) > entryRank(H.npv));
ok('D11 is ranked at all (an unranked heading silently falls back to the random pick)', Number.isFinite(entryRank(H.psA3Comm)));

// All three new headings must be DISTINCT from each other and from every existing one — a
// copy-paste collision would silently give one drill another's rank.
ok('the three batch-2 headings are distinct and separately ranked', new Set([entryRank(H.psB5Comm), entryRank(H.psE3Scep), entryRank(H.psA3Comm)]).size === 3);

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
