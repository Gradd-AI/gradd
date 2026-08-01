// scripts/authoring/author-afm-mock-paper-1.ts
//
// ═══════════════════════════════════════════════════════════════════════════════
// THE REFERENCE CALLER OF runRequirementGateBarrier — COMMITTED DELIBERATELY
// ═══════════════════════════════════════════════════════════════════════════════
//
// WHAT IT IS. A ONE-OFF, HARDCODED authoring script. It authors AFM Mock Paper 1
// (1 Section A + 2 Section B, 8 requirements) through the LIVE calculators and the narrative
// rubric engine, runs ALL gates in-process, and (with --insert) writes acca_cases /
// acca_case_exhibits / acca_case_requirements as candidate/unpublished. NO figure is hand-typed.
// Dependency chain (Section A): (i) CAPM project WACC → (ii) NPV discount_rate → (iii) FX
// exposure = (ii) year-1 remittance.
//
// It is NOT a parameterised generator. Case ids, paper structure and every scenario, exhibit
// and requirement string are literals in this file. Do not mistake it for a pipeline.
//
// ── WHY IT IS COMMITTED, AND WHY THAT IS NOT OPTIONAL ────────────────────────
// It lived at `scripts/_author_mock_paper1.ts`, inside the gitignored `scripts/_*` namespace,
// and was therefore UNTRACKED — one machine failure from gone, on a two-machine project. It is
// the ONLY working AFM case-authoring path that exists.
//
// This has already happened once. `scripts/_author_irhedge_batch.ts` authored the four live
// E3a interest-rate-hedging drills the same way, was never committed, and **has been deleted**.
// The consequence is recorded in docs/AFM_SURFACED.md as a still-open item: the E3a one-leg
// schema defect cannot be fixed because "no supported re-authoring path exists today", and
// recovering the second leg's rate now means parsing rendered prose on four published rows.
// That hole is open BECAUSE a working authoring script was untracked. Do not repeat it.
//
// Standing rule, added to docs/GENERATOR_DOCTRINE.md with this commit: any script that WRITES
// CONTENT, or is the SOLE CALLER of a gate barrier, gets committed.
//
// ── ⚠ THIS IS A DESTRUCTIVE RE-AUTHOR, AND THE GUARD IS STRUCTURAL ──────────
// `insertAll` begins each case with `acca_cases.delete().eq('id', …)` — an IDEMPOTENT
// re-author that CASCADES to exhibits, requirements AND every student's acca_case_progress —
// and re-inserts with `status:'candidate', published:false`.
//
// AFM Mock Paper 1 is LIVE (all 3 cases approved/published since 2026-07-29) and is served by
// the sit surface at /acca/afm/mock and /acca/mock. Re-authoring it today would 404 that
// surface and destroy student progress.
//
// A header warning is instructed, not structural, so it is NOT what protects this.
// `assertSafeToOverwrite()` runs BEFORE any write and:
//   • REFUSES OUTRIGHT if any target case is `published = true` — no override flag exists;
//   • otherwise still requires `--i-will-delete-live-rows`, because the cascade destroys
//     student progress whatever the publish state;
//   • PRINTS exactly what would be deleted first — ids, titles, publish state, and the
//     dependent-row counts including student progress.
// So `--insert` alone cannot damage the live paper even if this header is never read.
//
// It is retained as the reference caller and as the recovery path. Before any re-author,
// re-read docs/GENERATOR_DOCTRINE.md P-DB1..3 and P-DB6 and treat it as a publish-flip-class
// change with a committed snapshot taken first.
//
// ── WHAT TO COPY FROM IT ─────────────────────────────────────────────────────
// The pattern, not the content: every requirement is built by a calculator or the narrative
// rubric engine, passed through `runRequirementGateBarrier` (lib/acca/case-authoring-gates.ts —
// the COMMITTED barrier, 37 gate lines), and the insert is refused unless every line passes.
// `runCaseGates` (lib/acca/case-gates.ts, C1–C4) additionally asserts WHOLE-PAPER shape and
// assumes 1×A + 2×B — a standalone practice case needs an adapted blueprint, not this call.
//
// Run:
//   PHASE=numeric npx tsx --env-file=.env.local scripts/authoring/author-afm-mock-paper-1.ts
//   PHASE=all     npx tsx --env-file=.env.local scripts/authoring/author-afm-mock-paper-1.ts [--insert] [--pack]

import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'fs';
import type { AnswerSchema } from '../../lib/acca/numeric-verifier';
import { lintMisconceptionLead } from '../../lib/acca/validate-afm-prose';
import { runRequirementGateBarrier, barrierPasses, type FamilyGateInput } from '../../lib/acca/case-authoring-gates';
import { computeCapm, buildCapmSchema, buildCapmModelAnswer } from '../../lib/acca/capm';
import { computeIntlNpv, buildIntlNpvSchema, buildIntlNpvModelAnswer, type IntlNpvInputs } from '../../lib/acca/international';
import { computeForwardMmhCompare, buildForwardMmhCompareSchema, buildForwardMmhCompareModelAnswer } from '../../lib/acca/fxhedge';
import { computeEnpv, buildEnpvSchema, buildEnpvModelAnswer } from '../../lib/acca/risk';
import { computeIrFutures, buildIrFuturesSchema, buildIrFuturesModelAnswer } from '../../lib/acca/irhedge';
import type { NarrativeRubric, FailureMode } from '../../lib/acca/narrative-marker';
import { checkScenarioAnchor, checkGenericCopy, checkCommittedVerdict, checkRubricCoverage, checkRule23 } from '../../lib/acca/narrative-marker';
import { makeAnthropicCriterionGrader } from '../../lib/acca/narrative-grader';
import { runCaseGates, type GatePaper, type MarkingKind } from '../../lib/acca/case-gates';

const PHASE = process.env.PHASE ?? 'all';
const DO_INSERT = process.argv.includes('--insert');
// The destructive-write flag. Separate from --insert on purpose: --insert is "write the rows",
// this is "and it is fine to delete what is already there, cascading to student progress".
const DO_DESTRUCTIVE = process.argv.includes('--i-will-delete-live-rows');
const DO_PACK = process.argv.includes('--pack');
const NARRATIVE_BANDS = [{ min: 0, label: 'fail' }, { min: 0.5, label: 'pass' }, { min: 0.7, label: 'good' }, { min: 0.85, label: 'excellent' }];
const DESIGNED_BAD: FailureMode[] = ['F1', 'F5', 'F4'];

interface GL { name: string; ok: boolean; detail?: string }
// gateNumeric — the ONLY call site into the durable barrier (lib/acca/case-authoring-gates.ts).
// GATE1–3, P4–P9, GATE 26, and the calc-family gates are all DEFINED there now, not here —
// a future mock-authoring script must call runRequirementGateBarrier the same way, or the
// fence silently stops applying to it.
function gateNumeric(liveSchema: AnswerSchema, f: { question: string; context: string; model_answer: string; hint: string; full_reveal: string; hasLoss: boolean; zeroAddlTax?: boolean; compare?: { selected: string; all: string[] }; computed?: unknown[] }, family?: FamilyGateInput): GL[] {
  return runRequirementGateBarrier(liveSchema, f, family);
}
function print(label: string, lines: GL[]): boolean {
  const ok = barrierPasses(lines);
  console.log(`\n── ${label} — ${ok ? 'ALL PASS' : 'FAIL'} ──`);
  for (const l of lines) console.log(`   ${l.status === 'pass' ? 'PASS ' : l.status === 'fail' ? 'FAIL ' : (l.blocking ? 'N/EVAL-BLOCK' : 'N/EVAL-exempt')}  ${l.name}${l.status === 'pass' ? '' : '  — ' + (l.exemption || l.detail || '')}`);
  return ok;
}

// ══════════════ CONTENT ══════════════
const CID = { A: 'aa000000-0000-4000-8000-00000000a001', B1: 'aa000000-0000-4000-8000-00000000b101', B2: 'aa000000-0000-4000-8000-00000000b201' };

// ── SECTION A — Solenne Industries SA (EUR) → Rio Verde bioethanol plant, Brazil (BRL) ──
const A_INTRO = "It is now 1 September 20X5. You are a financial adviser engaged by Solenne Industries SA (\"Solenne\"), a France-based specialty-chemicals group that reports in euros (EUR). Write a report to the board of Solenne responding to its instructions in the requirements below, using the information in the exhibits provided. Professional marks will be awarded for the demonstration of skill in communication, analysis and evaluation, scepticism and commercial acumen in your answer.";
const A_EX = [
  { title: 'Company background', body: "Solenne Industries SA (Solenne) manufactures specialty chemicals from four European subsidiaries and is evaluating its first venture in South America: a bioethanol plant, \"Rio Verde\", in Brazil. Solenne reports in euros; the Brazilian operation would transact and be taxed in Brazilian reais (BRL). The board wants a euro appraisal of Rio Verde, a view on how to manage the currency and treasury consequences, and a recommendation." },
  { title: 'Exhibit 1 — Rio Verde project data (in BRL)', body: "The Rio Verde plant requires an upfront capital outlay of BRL 480 million, paid at the start of the project, and would operate for four years. In a normal year it is expected to generate profit before interest and tax (PBIT) of BRL 320 million, with depreciation of BRL 80 million, capital reinvestment of BRL 60 million and an increase in working capital of BRL 20 million. The BRL-denominated cash flows are expected to grow by 3% a year. The Brazilian corporate tax rate is 34%. Dividends remitted to France suffer Brazilian withholding tax of 15%. The France–Brazil treaty provides relief from double taxation: relief is given for the Brazilian corporate tax of 34% suffered on those profits, credited against the French corporate tax of 25% that would otherwise be due on the same profits and capped at that French charge; the 15% Brazilian withholding tax is deducted separately as the profits are remitted. The current spot exchange rate is BRL 5.60 per EUR 1. Brazilian inflation is expected to run at 4.5% and eurozone inflation at 2.0% over the horizon." },
  { title: 'Exhibit 2 — Cost of capital data', body: "Solenne intends to appraise Rio Verde at a project-specific discount rate. A listed Brazilian bioethanol producer of comparable business risk has an equity beta of 1.35 and a capital structure of 60% equity and 40% debt by market value. Solenne's own capital structure is 70% equity and 30% debt by market value. The risk-free rate is 4.5%, the market risk premium is 6.0%, and Solenne's pre-tax cost of debt is 5.5%. Debt is assumed to carry a beta of zero. Solenne's treasury manual records that the Brazilian producer's own corporate tax rate of 34% is the rate carried into the ungearing of that company's equity beta, since the debt tax shield being removed is the Brazilian producer's; the French corporate tax rate of 25% is the rate Solenne applies when regearing the resulting asset beta to its own 70:30 structure and when weighting its post-tax cost of debt. Rio Verde's own operating cash flows are taxed in Brazil at the Brazilian corporate tax rate of 34%." },
  { title: 'Exhibit 3 — Managing the first remittance', body: "Rio Verde's first net remittance to France, expected to be BRL 179.5 million, is due in three months. The treasury team must decide how to fix the euro value of that receipt. The current spot rate is BRL 5.60 per EUR 1 and the three-month forward rate is BRL 5.66 per EUR 1. Annual money-market rates are: BRL deposit 10.0% and BRL borrowing 12.0%; EUR deposit 2.0% and EUR borrowing 3.5%. The board has asked which hedge secures the better guaranteed euro receipt." },
  { title: 'Exhibit 4 — Treasury organisation', body: "Solenne has never operated a central treasury. Each of its four European subsidiaries runs its own treasury desk, negotiating its own bank facilities and managing its own cash and currency positions locally; the head office in Lyon coordinates nothing beyond consolidated reporting. The finance director argues that the new Brazilian exposure is the moment to establish a group treasury function at Lyon. A non-executive director is sceptical, warning that a central function \"just adds a head-office layer that slows the subsidiaries down.\" The board wants an evaluation of the issues in establishing a group treasury and the likely impact on the existing subsidiary desks." },
];
const A_I_Q = "(i) Calculate the project-specific discount rate the board should use to appraise the Rio Verde project, and explain why this rate — rather than Solenne's own group cost of capital — is appropriate. (10 marks)";
const A_II_Q = "(ii) Using the project-specific discount rate from requirement (i), calculate the net present value of the Rio Verde project in euros and advise the board whether, on financial grounds, the project should proceed. (16 marks)";
const A_III_Q = "(iii) Evaluate whether a forward contract or a money-market hedge secures the better guaranteed euro value for the first BRL 179.5 million remittance, and recommend which Solenne should use. (8 marks)";
const A_IV_Q = "(iv) Evaluate the issues Solenne should consider in establishing a group treasury function at Lyon, and assess the likely impact on the existing subsidiary treasury desks. (6 marks)";

// ── SECTION B1 — Brecon Renewables plc (GBP) → Firth Array offshore wind ──
const B1_INTRO = "It is now 1 September 20X5. You are a financial adviser to Brecon Renewables plc (\"Brecon\"), a UK renewable-energy developer reporting in pounds sterling (GBP). Write a briefing note to the board responding to the requirements below, using the information in the exhibits. Professional marks will be awarded for the demonstration of skill in analysis and evaluation and scepticism in your answer.";
const B1_EX = [
  { title: 'Company background', body: "Brecon Renewables plc (Brecon) develops offshore wind farms in UK waters and is appraising the \"Firth Array\" project, which requires an upfront capital commitment of GBP 500 million and would run for four years before a planned refinancing. Electricity prices, turbine availability and construction costs are all uncertain, so the board has asked for both a scenario appraisal and an interpretation of a simulation the advisers have run." },
  { title: 'Exhibit 1 — Scenario analysis', body: "Brecon's advisers built three demand scenarios for Firth Array, each with its own four-year net cash-flow profile (GBP million), discounted at the project cost of capital of 10%. Strong demand (probability 0.30): 210, 230, 250, 270. Base case (probability 0.50): 150, 160, 170, 180. Weak demand (probability 0.20): 85, 90, 95, 100. The upfront outlay of GBP 500 million is common to all three scenarios." },
  { title: 'Exhibit 2 — Monte Carlo simulation output', body: "Separately, the advisers ran a Monte Carlo simulation of the same Firth Array project with 10,000 iterations, allowing electricity price, turbine availability and construction cost to vary continuously. The simulation produced a mean (expected) NPV of GBP 44 million, a standard deviation of NPV of GBP 60 million, a probability of a negative NPV of 22%, and a project Value-at-Risk of GBP 52 million at the 95% confidence level. The board must decide whether Firth Array's risk profile is acceptable before committing the GBP 500 million." },
];
const B1_I_Q = "(i) Calculate the expected net present value (ENPV) of the Firth Array project and the probability of a negative NPV from the scenario analysis, and advise the board what they indicate about the project. (12 marks)";
const B1_II_Q = "(ii) Interpret the Monte Carlo simulation output for Firth Array.\n\n(a) Explain what the results indicate about the likelihood of success and the overall risk profile of the project.\n(b) Explain what the Value-at-Risk figure means in this context and how the board should use it when deciding whether to commit the capital. (8 marks)";

// ── SECTION B2 — Aldebrino SpA (EUR) borrowing + exports ──
const B2_INTRO = "It is now 1 September 20X5. You are a financial adviser to Aldebrino SpA (\"Aldebrino\"), an Italy-based industrial exporter reporting in euros (EUR). Write a report to the board responding to the requirements below, using the information in the exhibits. Professional marks will be awarded for the demonstration of skill in analysis and evaluation, scepticism and commercial acumen in your answer.";
const B2_EX = [
  { title: 'Company background', body: "Aldebrino SpA (Aldebrino) manufactures in Italy, borrows at floating rates, and sells extensively to customers in the United States and the United Kingdom. It also owns a US sales subsidiary whose results are consolidated into Aldebrino's euro accounts. The board wants both its interest-rate exposure on a forthcoming loan and its foreign-exchange exposures addressed." },
  { title: 'Exhibit 1 — Interest-rate hedge on the new borrowing', body: "Aldebrino will draw a EUR 48 million loan in six months' time, for a six-month period, at the prevailing base rate plus a company margin of 0.5%. The current base rate is 4.0%. To hedge, the treasury will use three-month euro interest-rate futures, contract size EUR 1,000,000, currently priced at 95.55; the futures expire in nine months. The board wants the effective borrowing cost locked in, tested against a rate that rises to 5.0% and a rate that falls to 3.2%." },
  { title: 'Exhibit 2 — Foreign-exchange exposures', body: "Aldebrino invoices its US customers in US dollars and its UK customers in pounds sterling, and settles those receivables 60–90 days after sale — a transaction exposure. Its US subsidiary's dollar-denominated net assets are retranslated into euros at each year-end for the consolidated balance sheet — a translation exposure. Separately, a sustained strengthening of the euro against the dollar would make Aldebrino's euro-cost products less competitive against US-based rivals over the longer term, independent of any single invoice — an economic exposure. The board has asked the adviser to identify and distinguish these exposures and assess how each can be managed." },
];
const B2_I_Q = "(i) Using the interest-rate futures described in Exhibit 1, calculate the effective borrowing cost Aldebrino locks in on the EUR 48 million loan, showing that the same rate results whether the base rate rises to 5.0% or falls to 3.2%, and advise the treasury. (12 marks)";
const B2_II_Q = "(ii) Identify and distinguish the foreign-exchange exposures Aldebrino faces, and assess how each type can be managed. (8 marks)";

// full_reveal misconception leads (numeric) — P7. Short solved-path prose follows the calc model_answer.
function reveal(mis: string, body: string) { return `${mis}\n\n${body}`; }

async function main() {
  const grader = makeAnthropicCriterionGrader(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }));

  // ══ NUMERIC BUILDS ══
  // HOUSE CONVENTION HC1 (Grant ruling 25/07/2026, docs/GENERATOR_DOCTRINE.md): the Brazilian
  // peer's OWN 34% ungears its beta (the shield stripped is the peer's); Solenne's French 25%
  // regears to Solenne's structure and prices its post-tax debt. NOT examiner-sourced — no ACCA
  // source poses a two-rate ungear; see the ruling for the full evidence position.
  const capmIn = { rf: 4.5, mrp: 6.0, tax_rate: 25, peer_tax_rate: 34, kd: 5.5, peer_equity_beta: 1.35, peer_ve: 60, peer_vd: 40, own_ve: 70, own_vd: 30 };
  const capmC = computeCapm(capmIn, 'project_specific');
  const projectWacc = capmC.wacc!;
  const npvIn: IntlNpvInputs = { home_currency: 'EUR', foreign_currency: 'BRL', base_spot: 5.60, basis: 'ppp', rate_home: 2.0, rate_foreign: 4.5, discount_rate: projectWacc, foreign_build: { pbit: 320, tax_rate: 34, depreciation: 80, capex: 60, delta_working_capital: 20 }, foreign_growth: 3.0, years: 4, initial_outlay_foreign: 480, withholding_rate: 15, home_tax_rate: 25, wht_creditable: true };
  const npvC = computeIntlNpv(npvIn);
  const remit1 = npvC.years[0].foreign_remit_net;
  const fxIn = { currency_home: 'EUR', currency_foreign: 'BRL', exposure: Math.round(remit1 * 10) / 10, direction: 'receipt' as const, quote_direction: 'foreign_per_home' as const, forward_rate: 5.66, spot: 5.60, months: 3, rate_foreign_borrow: 12.0, rate_foreign_deposit: 10.0, rate_home_borrow: 3.5, rate_home_deposit: 2.0 };
  const fxC = computeForwardMmhCompare(fxIn);
  const enpvIn = { currency: 'GBP', outlay: 500, discount_rate: 10.0, hurdle: 0, scenarios: [{ label: 'Strong demand', probability: 0.30, cash_flows: [210, 230, 250, 270] }, { label: 'Base case', probability: 0.50, cash_flows: [150, 160, 170, 180] }, { label: 'Weak demand', probability: 0.20, cash_flows: [85, 90, 95, 100] }] };
  const enpvC = computeEnpv(enpvIn);
  const irIn = { currency: 'EUR', notional: 48_000_000, direction: 'borrower' as const, hedge_months: 6, contract_months: 3, contract_size: 1_000_000, spot_rate0: 4.0, futures0: 95.55, months_to_expiry: 9, months_to_transaction: 6, company_spread: 0.5, scenarios: [{ label: 'Rates rise', base_rate: 5.0 }, { label: 'Rates fall', base_rate: 3.2 }] };
  const irC = computeIrFutures(irIn);

  console.log(`CHAIN: CAPM WACC ${projectWacc.toFixed(2)}% → NPV EUR ${npvC.npv.toFixed(1)}m ${npvC.accept ? 'ACCEPT' : 'REJECT'} → FX exposure BRL ${remit1.toFixed(1)}m (best=${fxC.comparison.best.method})`);
  console.log(`B1 ENPV GBP ${enpvC.enpv.toFixed(1)}m P(neg) ${(enpvC.p_negative * 100).toFixed(0)}% | B2 IR locked ${irC.locked_effective_rate.toFixed(2)}% ${irC.contracts} contracts`);

  const aiSchema = buildCapmSchema(capmIn, capmC, 'project_specific');
  const aiMA = buildCapmModelAnswer(capmIn, capmC, "The board should discount the Rio Verde cash flows at this project-specific rate, which reflects the business risk of Brazilian bioethanol production; using Solenne's group cost of capital would misprice a venture whose business risk differs from the group's existing chemicals operations.", 'project_specific');
  const aiiSchema = buildIntlNpvSchema(npvIn, npvC);
  const aiiMA = buildIntlNpvModelAnswer(npvIn, npvC, `On the project-specific discount rate of ${projectWacc.toFixed(2)}%, the appraisal returns a positive net present value, so on financial grounds Rio Verde should proceed; the board should nonetheless stress-test the assumed BRL depreciation path and the remittance timing, since both materially affect the euro value.`);
  const aiiiSchema = buildForwardMmhCompareSchema(fxIn, fxC);
  const aiiiMA = buildForwardMmhCompareModelAnswer(fxIn, fxC, `The forward contract secures the higher guaranteed euro receipt, EUR 31.7m against EUR 31.3m — a modest margin of about EUR 0.4m on roughly EUR 31.7m. Solenne should therefore opt for the forward contract: on so slim a margin the qualitative factors decide it, and the forward wins on operational simplicity — a single dealt rate, with none of the borrow-and-deposit legs the alternative requires — while the board should weigh the counterparty credit exposure a forward carries and confirm the balance-sheet treatment before dealing.`);
  const b1iSchema = buildEnpvSchema(enpvIn, enpvC);
  const b1iMA = buildEnpvModelAnswer(enpvIn, enpvC, `The expected NPV is positive, but the ${(enpvC.p_negative * 100).toFixed(0)}% chance of a negative outcome means the board should not treat Firth Array as a safe bet; it should proceed only with measures that cut the weak-demand downside, or with a balance sheet able to absorb it.`);
  const b2iSchema = buildIrFuturesSchema(irIn, irC);
  const b2iMA = buildIrFuturesModelAnswer(irIn, irC, `The futures hedge locks Aldebrino's effective borrowing cost close to ${irC.locked_effective_rate.toFixed(2)}% across both the rising- and falling-rate scenarios; the small residual basis risk remains, and the treasury should confirm the contract count matches the six-month exposure before dealing.`);

  const Actx = [A_INTRO, ...A_EX.map((e) => e.title + '\n' + e.body)].join('\n\n');
  const B1ctx = [B1_INTRO, ...B1_EX.map((e) => e.title + '\n' + e.body)].join('\n\n');
  const B2ctx = [B2_INTRO, ...B2_EX.map((e) => e.title + '\n' + e.body)].join('\n\n');

  const numeric = [
    { key: 'A(i) B3e CAPM', lo: 'B3e', order: 1, marks: 10, ps: 'analysis_and_evaluation', schema: aiSchema, ma: aiMA, q: A_I_Q, ctx: Actx, hasLoss: false,
      hint: "Don't reach for Solenne's own group WACC — Rio Verde is a differently-risked business. Ungear the Brazilian peer's equity beta to strip out its financial risk, then regear to Solenne's own gearing before pricing the cost of equity and blending the WACC.",
      reveal: reveal("The dominant misconception here is using the group's own cost of capital as the project hurdle: candidates apply Solenne's average WACC to Rio Verde, ignoring that the Brazilian bioethanol business carries different business risk.", "The fix is the ungear-regear route: strip the peer's financial risk to an asset beta, regear to Solenne's 70:30 structure, price the cost of equity through CAPM, then blend the project WACC. That project-specific rate — not the group average — is the correct hurdle.") },
    { key: 'A(ii) B5b International NPV', lo: 'B5b', order: 2, marks: 16, ps: 'communication,analysis_and_evaluation', schema: aiiSchema, ma: aiiMA, q: A_II_Q, ctx: Actx, hasLoss: npvC.years.some((y) => y.taxable_profit < 0), zeroAddlTax: !npvC.has_additional_home_tax,
      hint: "Work in reais first, then convert. Build the project's free cash flow and apply Brazilian corporate tax; then get the double-tax rule right — because Brazil's 34% corporate rate is above France's 25%, the foreign-tax credit already covers the whole home liability, so no additional French tax arises and the 15% withholding is simply a net cost of remitting. Translate each year at the forward rate implied by the inflation differential, and discount at the project rate from (i) — don't discount reais at a euro rate.",
      reveal: reveal("The classic misconception here is discounting foreign-currency cash flows at the home-currency rate: candidates leave the reais cash flows undiscounted-for-currency, or convert at today's spot for every year, mismatching the cash flows and the discount rate.", "The fix is consistency: translate each year's remittance at the PPP-implied forward rate so the euro cash flows and the euro discount rate are on the same basis, and get the tax branch right. The double-tax rule has three cases: where the home rate exceeds the host rate, additional home tax is due on the differential; where the home rate is at or below the host rate — as here, France 25% against Brazil 34% — no additional home tax arises and the excess foreign credit is simply unusable; and the withholding tax on the remittance is a net cost regardless. So here the 15% withholding is a net remittance cost, not a recoverable credit. Only then discount. The resulting NPV is positive, so proceed on financial grounds.") },
    { key: 'A(iii) E2b FX forward/MMH', lo: 'E2b', order: 3, marks: 8, ps: 'scepticism', schema: aiiiSchema, ma: aiiiMA, q: A_III_Q, ctx: Actx, hasLoss: false, compare: { selected: fxC.comparison.selected_method, all: fxC.comparison.results.map((m) => m.method) },
      hint: "Price both hedges to a guaranteed euro figure and compare like with like. For the money-market hedge on a receipt, borrow reais now against the future receipt, convert at spot, and deposit euros — then set the two guaranteed euro amounts side by side and pick the higher.",
      reveal: reveal("The common misconception here is judging the hedge on the headline forward rate rather than the guaranteed euro outcome: candidates compare the forward rate to spot instead of computing the euro amount each hedge actually locks.", "The fix is to convert both routes to a guaranteed euro receipt and compare those figures directly; the forward secures the higher euro amount here, so it is preferred, though the margin is modest.") },
    { key: 'B1(i) B1a risk ENPV', lo: 'B1a', order: 1, marks: 12, ps: 'analysis_and_evaluation', schema: b1iSchema, ma: b1iMA, q: B1_I_Q, ctx: B1ctx, hasLoss: false,
      hint: "Compute each scenario's NPV first, then probability-weight them for the ENPV — and separately add up the probability of the scenarios whose NPV is negative. A positive ENPV alone doesn't tell the board how often the project loses money.",
      reveal: reveal("The frequent misconception here is treating a positive expected NPV as a safe decision: candidates report the ENPV and stop, ignoring how much probability sits on value-destroying outcomes.", "The fix is to report both the ENPV and the probability of a negative NPV, and to read them together — a positive average with a material downside probability calls for mitigation, not automatic approval.") },
    { key: 'B2(i) E3a IR futures', lo: 'E3a', order: 1, marks: 12, ps: 'analysis_and_evaluation', schema: b2iSchema, ma: b2iMA, q: B2_I_Q, ctx: B2ctx, hasLoss: false,
      hint: "Get the number of contracts right first: scale the notional by the ratio of the loan period to the contract period, or you will under-hedge. As a borrower, sell the futures; then reconcile the locked effective rate across both the rise and fall scenarios.",
      reveal: reveal("The signature misconception here is the contract count: candidates divide the notional by the contract size but forget to scale by the six-month loan over the three-month contract, and so hedge only half the exposure.", "The fix is contracts = (notional ÷ contract size) × (loan months ÷ contract months); as a borrower Aldebrino sells the futures, and the futures gain or loss offsets the cash-market move so the same effective rate is locked whether rates rise or fall.") },
  ];

  // GATE 27 engagement: the calculator's own input/result objects per requirement. Supplying
  // these ENGAGES derived-figure integrity (LOUD); omitting them makes it a silent no-op.
  // NOTE B3e is included even though it has no family gate — GATE 27 is keyed on the RESULT
  // OBJECT, not on whether a calc-family gate exists.
  const computedFor: Record<string, unknown[]> = {
    B3e: [capmIn, capmC], B5b: [npvIn, npvC], E2b: [fxIn, fxC], B1a: [enpvIn, enpvC], E3a: [irIn, irC],
  };

  // Calc-family gate INPUTS the paper's requirements need, keyed by lo_code — the gate
  // DEFINITIONS themselves live in lib/acca/case-authoring-gates.ts (runFamilyGates), so
  // this is just wiring this script's own computed values into that durable dispatch.
  const familyInputFor = (lo: string): FamilyGateInput | undefined => {
    if (lo === 'B5b') return { lo: 'B5b', npvIn, npvC, modelAnswer: aiiMA };
    if (lo === 'E2b') return { lo: 'E2b', fxIn, fxC };
    if (lo === 'B1a') return { lo: 'B1a', enpvIn, enpvC };
    if (lo === 'E3a') return { lo: 'E3a', irIn, irC, modelAnswer: b2iMA };
    return undefined;
  };

  let numericOk = true;
  if (PHASE === 'numeric' || PHASE === 'all') {
    for (const r of numeric) {
      const lines = gateNumeric(r.schema.schema, { question: r.q, context: r.ctx, model_answer: r.ma, hint: r.hint, full_reveal: r.reveal, hasLoss: r.hasLoss, zeroAddlTax: (r as { zeroAddlTax?: boolean }).zeroAddlTax, compare: (r as { compare?: { selected: string; all: string[] } }).compare, computed: computedFor[r.lo] }, familyInputFor(r.lo));
      numericOk = print(r.key, lines) && numericOk;
    }
    console.log(`\nNUMERIC: ${numericOk ? 'ALL GREEN' : 'FAILURES'}`);
  }

  // ══ NARRATIVE BUILDS ══
  const narratives: NarrItem[] = PHASE === 'numeric' ? [] : buildNarratives({ Actx, B1ctx, B2ctx });
  let narrativeOk = true;
  if (PHASE === 'narrative' || PHASE === 'all') {
    for (const n of narratives) {
      const g: GL[] = [];
      g.push({ name: 'N2 scenario-anchor', ...toGL(checkScenarioAnchor(n.rubric, n.scenario, n.reveal)) });
      g.push({ name: 'N3 generic/copy', ...toGL(checkGenericCopy(n.reveal, n.scenario)) });
      g.push({ name: 'N5 committed-verdict', ...toGL(checkCommittedVerdict(n.rubric, n.reveal)) });
      g.push({ name: 'P7 misconception-lead', ok: lintMisconceptionLead(n.full_reveal).length === 0 });
      if (g.every((x) => x.ok)) {
        g.push({ name: 'N1 rubric-coverage (grader)', ...toGL(await checkRubricCoverage(n.rubric, n.reveal, n.scenario, grader)) });
        g.push({ name: 'N4 Rule-23 GOOD/BAD (grader)', ...toGL(await checkRule23(n.rubric, n.scenario, n.reveal, n.golden_bad, DESIGNED_BAD, grader)) });
      } else {
        g.push({ name: 'N1/N4 (grader) — SKIPPED (deterministic failed)', ok: false });
      }
      narrativeOk = print(n.key, g) && narrativeOk;
    }
    console.log(`\nNARRATIVE: ${narrativeOk ? 'ALL GREEN' : 'FAILURES'}`);
  }

  // ══ CASE GATES C1–C4 ══
  let caseOk = true;
  if (PHASE === 'all') {
    const paper: GatePaper = { cases: [
      { section: 'A', anchor_area: null, total_marks: 50, professional_skills_marks: 10, requirements: [
        rq('B3e', 10, 'calc', ['analysis_and_evaluation']), rq('B5b', 16, 'calc', ['communication', 'analysis_and_evaluation']), rq('E2b', 8, 'calc', ['scepticism']), rq('E1a', 6, 'narrative', ['commercial_acumen']) ] },
      { section: 'B', anchor_area: 'B1', total_marks: 25, professional_skills_marks: 5, requirements: [ rq('B1a', 12, 'calc', ['analysis_and_evaluation']), rq('B1b', 8, 'narrative', ['scepticism']) ] },
      { section: 'B', anchor_area: 'E3', total_marks: 25, professional_skills_marks: 5, requirements: [ rq('E3a', 12, 'calc', ['analysis_and_evaluation']), rq('E2a', 8, 'narrative', ['scepticism', 'commercial_acumen']) ] },
    ] };
    const cg = runCaseGates(paper);
    caseOk = cg.pass;
    console.log(`\n── CASE GATES C1–C4 — ${cg.pass ? 'ALL PASS' : 'FAIL'} ──`);
    for (const [k, v] of Object.entries(cg.results)) console.log(`   ${v.pass ? 'PASS' : 'FAIL'}  ${k}${v.pass ? '' : ' — ' + JSON.stringify(v.violations)}`);
  }

  const allGreen = numericOk && narrativeOk && caseOk;
  console.log(`\n═══ OVERALL: ${allGreen ? 'ALL GATES GREEN' : 'NOT ALL GREEN — no insert'} ═══`);

  if (DO_INSERT && allGreen && PHASE === 'all') {
    await insertAll({ numeric, narratives, npvC, capmC, projectWacc, fxC, enpvC, irC });
  }
  if (DO_PACK) writePack({ numeric, narratives, npvC, capmC, projectWacc, fxC, enpvC, irC, remit1 });
}

function toGL(c: { ok: boolean; reason?: string }): { ok: boolean; detail?: string } { return { ok: c.ok, detail: c.reason }; }
function rq(lo_code: string, marks_guide: number, marking_kind: MarkingKind, tags: string[]) { return { lo_code, marks_guide, marking_kind, professional_skill_tags: tags }; }
interface NarrItem { key: string; lo: string; order: number; marks: number; ps: string; rubric: NarrativeRubric; scenario: string; reveal: string; golden_bad: string; full_reveal: string; hint: string; model_answer: string }

function buildNarratives(ctx: { Actx: string; B1ctx: string; B2ctx: string }): NarrItem[] {
  const out: NarrItem[] = [];

  // ── A(iv) E1a — group treasury (template EN1) ──
  {
    const parts = ['(a) issues in establishing a group treasury function at Lyon', '(b) impact on the existing subsidiary treasury desks'];
    const facts = [
      { id: 'f_lyon', key: 'Lyon', kind: 'entity' as const, text: 'the head office at Lyon that would host a group treasury' },
      { id: 'f_subs', key: 'four European subsidiaries', kind: 'entity' as const, text: 'the four European subsidiaries that each run their own treasury desk' },
      { id: 'f_central', key: 'central treasury', kind: 'constraint' as const, text: 'Solenne has never operated a central treasury' },
      { id: 'f_brazil', key: 'Brazilian exposure', kind: 'constraint' as const, text: 'the new Brazilian exposure the group treasury would manage' },
      { id: 'f_solenne', key: 'Solenne', kind: 'entity' as const, text: 'Solenne Industries SA' },
    ];
    const criteria = [
      { id: 'c1', requirement_part: parts[0], lo: 'E1a', marks: 2, anchor_facts: ['f_central', 'f_brazil'], disqualifiers: ['F1', 'F5', 'F6'] as FailureMode[], development_required: true, evidence_anchor: 'SD24 p.4 Northney — location/control of a group treasury rarely discussed', required_point: 'A central treasury pools expertise, scale and control — cheaper group funding, netting of intra-group balances and a single consistent FX and risk policy — which matters especially for the new Brazilian exposure, a currency and jurisdiction the local European desks have no experience of managing.' },
      { id: 'c2', requirement_part: parts[0], lo: 'E1a', marks: 2, anchor_facts: ['f_lyon', 'f_subs'], disqualifiers: ['F1', 'F5', 'F6'] as FailureMode[], development_required: true, evidence_anchor: 'F7 generic-centralisation-substitution is the cited marking basis here', required_point: 'Establishing it at Lyon carries real costs and risks that must be weighed, not asserted away: systems and staffing, and a loss of local responsiveness at the four European subsidiaries — so the non-executive director\'s "slows the subsidiaries down" concern has genuine substance and must be designed around rather than dismissed.' },
      { id: 'c3', requirement_part: parts[1], lo: 'E1a', marks: 2, anchor_facts: ['f_subs', 'f_central'], disqualifiers: ['F4', 'F5'] as FailureMode[], development_required: true, required_point: 'For the subsidiary desks the impact is a loss of autonomy over their own bank facilities and local cash and FX positions; the recommendation should commit to a hybrid — Lyon owning group funding, netting and FX/risk policy while the subsidiaries retain operational local cash management — so the central treasury adds control without removing responsiveness.' },
    ];
    const rubric: NarrativeRubric = { mode: 'narrative', requirement_parts: parts, scenario_facts: facts, criteria, total_marks: 6, bands: NARRATIVE_BANDS };
    const reveal = "Establishing a group treasury at Lyon is worth doing, but only if it is designed to add control without smothering the subsidiaries.\n\nThe case for it is strongest precisely because of the Brazilian exposure. A central treasury pools scarce expertise and scale: it can raise group funding more cheaply than four desks bidding separately, net intra-group balances rather than each subsidiary hedging in isolation, and impose one consistent FX and risk policy. Solenne has never operated a central treasury, so the local desks have built no capability in group risk management — and none of the four European subsidiaries has ever handled a Brazilian exposure. Concentrating that judgement in one place is the point.\n\nBut the cost and disruption are real and should not be waved away. A treasury at Lyon needs systems, dealing lines and skilled staff, and it strips the four European subsidiaries of decisions they currently make locally. The non-executive director's warning that it \"slows the subsidiaries down\" has genuine substance: a badly-configured central function that insists on approving every local payment would indeed add a head-office layer without adding value.\n\nFor the subsidiary desks the concrete impact is a loss of autonomy over their own bank facilities and their local cash and currency positions. The right answer is not all-or-nothing. Lyon should own group funding, intra-group netting and the FX and risk policy — including the new Brazilian remittances — while the subsidiaries keep operational local cash management within that policy. On balance, on that hybrid basis the board should establish the group treasury: it captures the control and scale benefits the Brazilian venture needs, while leaving the subsidiaries responsive to their own markets.";
    const golden_bad = "Solenne has never operated a central treasury. Each of its four European subsidiaries runs its own treasury desk, negotiating its own bank facilities and managing its own cash and currency positions locally; the head office in Lyon coordinates nothing beyond consolidated reporting.\n\nA group treasury function is a centralised department that manages an organisation's financing, cash and risk. Centralisation is generally regarded as beneficial because it creates economies of scale, improves control, and allows an organisation to manage its resources more efficiently. Many large multinational companies operate a central treasury for these reasons.\n\nThe advantages of centralisation include better cash management, access to cheaper finance, and more consistent policies across the group. The disadvantages include the cost of setting it up and a possible loss of local flexibility. Centralisation can improve efficiency but may reduce responsiveness.\n\nThere are arguments on both sides. On one hand a central treasury brings control and scale. On the other hand it adds a head-office layer and costs money. The board will need to weigh these considerations carefully against the company's circumstances and strategic objectives before deciding whether to proceed.";
    const mis = "The dominant misconception here is substituting a generic \"centralisation is good\" essay for an analysis of THIS group: candidates recite textbook treasury advantages and disadvantages without ever engaging with Solenne's four separate desks, the absent central function, or the specific new Brazilian exposure that prompts the question.";
    out.push({ key: 'A(iv) E1a treasury', lo: 'E1a', order: 4, marks: 6, ps: 'commercial_acumen', rubric, scenario: ctx.Actx, reveal, golden_bad, full_reveal: `${mis}\n\n${reveal}`, model_answer: reveal, hint: "Don't write a generic essay on the pros and cons of centralisation — anchor every point to Solenne: the four separate subsidiary desks, the absent central function, and above all the new Brazilian exposure none of them has handled. Then take the non-executive director's objection seriously and commit to a recommendation." });
  }

  // ── B1(ii) B1b — Monte Carlo interpretation (template D1) ──
  {
    const parts = ['(a) likelihood of success and overall risk profile', '(b) interpretation of the Value-at-Risk figure and its use in the capital decision'];
    const facts = [
      { id: 'f_mean', key: 'GBP 44 million', kind: 'figure' as const, text: 'mean (expected) NPV of GBP 44 million from the simulation' },
      { id: 'f_sd', key: 'GBP 60 million', kind: 'figure' as const, text: 'standard deviation of NPV of GBP 60 million' },
      { id: 'f_pneg', key: '22%', kind: 'figure' as const, text: 'probability of a negative NPV of 22%' },
      { id: 'f_var', key: 'GBP 52 million', kind: 'figure' as const, text: 'project Value-at-Risk of GBP 52 million' },
      { id: 'f_conf', key: '95%', kind: 'figure' as const, text: '95% confidence level for the VaR' },
      { id: 'f_capex', key: 'GBP 500 million', kind: 'figure' as const, text: 'upfront capital commitment of GBP 500 million' },
      { id: 'f_entity', key: 'Brecon', kind: 'entity' as const, text: 'the developer Brecon Renewables plc' },
    ];
    const criteria = [
      { id: 'c1', requirement_part: parts[0], lo: 'B1b', marks: 2, anchor_facts: ['f_mean', 'f_pneg'], disqualifiers: ['F1', 'F5', 'F6'] as FailureMode[], development_required: true, required_point: 'The mean NPV of GBP 44 million is positive, so the simulation\'s central outcome creates value for Brecon and supports a prima facie case to proceed — but the 22% probability of a negative NPV means more than one run in five destroys value, so the central case cannot be read on its own.' },
      { id: 'c2', requirement_part: parts[0], lo: 'B1b', marks: 2, anchor_facts: ['f_mean', 'f_sd'], disqualifiers: ['F1', 'F5', 'F6'] as FailureMode[], development_required: true, required_point: 'The standard deviation of GBP 60 million is larger than the mean of GBP 44 million (a coefficient of variation above 1), so outcomes are highly dispersed and the project is very uncertain; the positive mean alone is therefore a misleading guide to success.' },
      { id: 'c3', requirement_part: parts[1], lo: 'B1b', marks: 2, anchor_facts: ['f_var', 'f_conf'], disqualifiers: ['F1', 'F5', 'F6'] as FailureMode[], development_required: true, required_point: 'The project VaR of GBP 52 million at the 95% confidence level is the one-tail downside on the project over the period: there is a 5% chance that the downside loss will exceed GBP 52 million — it is a threshold, not a ceiling on the maximum possible loss, and it quantifies the tail, not the average.' },
      { id: 'c4', requirement_part: parts[1], lo: 'B1b', marks: 2, anchor_facts: ['f_var', 'f_capex', 'f_entity'], disqualifiers: ['F4', 'F5'] as FailureMode[], development_required: true, required_point: 'Set against the GBP 500 million commitment, the board should read the VaR as the tail exposure it must be able to absorb, and should commit only if Brecon can withstand that loss or first secures mitigations (phased build, revenue guarantees) that cut the 22% downside probability — a committed recommendation, not a fence-sit.' },
    ];
    const rubric: NarrativeRubric = { mode: 'narrative', requirement_parts: parts, scenario_facts: facts, criteria, total_marks: 8, bands: NARRATIVE_BANDS };
    const reveal = "The simulation gives the board a distribution, not a verdict, and it should be read as one.\n\nOn the central outcome, the expected NPV of GBP 44 million is positive, so the typical result of the simulation creates value and there is a prima facie case to build Firth Array. That reading cannot stand alone, though: a 22% probability of a negative NPV means more than one simulated run in five ends in value destruction, which is a materially high failure rate for a project of this scale.\n\nThe risk profile is dominated by dispersion. The standard deviation of GBP 60 million is actually larger than the mean of GBP 44 million — a coefficient of variation above one — so the range of possible outcomes is very wide and the project is highly uncertain. Reporting the positive mean without that context would badly mislead the board.\n\nThe Value-at-Risk figure sharpens the downside. A project VaR of GBP 52 million at the 95% confidence level is the one-tail downside on the project over the period: there is a 5% chance that the downside loss will exceed GBP 52 million. It is a threshold, not a ceiling on the maximum possible loss — it measures the tail, not the worst case that could ever occur. Set against the GBP 500 million Brecon must commit, the board should treat that GBP 52 million as the tail loss the balance sheet has to be able to absorb.\n\nOn balance, Brecon should approve Firth Array only if it can withstand that tail loss without distress, or should first require mitigations — phased construction, or contracted revenue floors — that pull the 22% probability of a negative NPV down to a level the board is willing to accept. A positive mean is a reason to consider the project, not a reason to commit GBP 500 million to it unconditionally.";
    const golden_bad = "The Monte Carlo simulation ran 10,000 iterations, allowing electricity price, turbine availability and construction cost to vary continuously. The simulation produced a mean (expected) NPV of GBP 44 million, a standard deviation of NPV of GBP 60 million, a probability of a negative NPV of 22%, and a project Value-at-Risk of GBP 52 million at the 95% confidence level.\n\nMonte Carlo simulation is a technique used to model uncertainty in investment decisions. It runs many iterations using randomly drawn values for uncertain variables and produces a distribution of possible outcomes rather than a single-point estimate. This is useful because it captures a range of scenarios.\n\nThe mean NPV is positive, which suggests the project may be worth pursuing. The standard deviation indicates there is variability around the mean, and a higher standard deviation generally means greater uncertainty. Value-at-Risk is a widely used risk metric that tells decision-makers about the potential downside at a given confidence level.\n\nThere are arguments on both sides. On one hand the mean NPV is positive and the project could create value. On the other hand there is uncertainty and the probability of a negative outcome is not negligible. The board will need to weigh these considerations carefully against its risk appetite and strategic objectives before making a final judgement.";
    const mis = "The classic misconception here is fence-sitting: candidates report the mean NPV, the standard deviation and the VaR figure accurately, then stop — leaving the board a table of numbers but no steer on the GBP 500 million decision. Reporting is not interpretation.";
    out.push({ key: 'B1(ii) B1b Monte Carlo', lo: 'B1b', order: 2, marks: 8, ps: 'scepticism', rubric, scenario: ctx.B1ctx, reveal, golden_bad, full_reveal: `${mis}\n\n${reveal}`, model_answer: reveal, hint: "Reporting the statistics correctly is only half the job — the board needs to know what they mean for the GBP 500 million decision. Translate the probability of a negative NPV and the VaR into an explicit recommendation on whether to commit, and on what conditions." });
  }

  // ── B2(ii) E2a — FX exposure types (template EN3) ──
  {
    const parts = ['(a) identify and distinguish the exposure types', '(b) assess how each exposure can be managed'];
    const facts = [
      { id: 'f_txn', key: 'transaction exposure', kind: 'constraint' as const, text: 'transaction exposure on the USD and GBP receivables' },
      { id: 'f_trans', key: 'translation exposure', kind: 'constraint' as const, text: 'translation exposure on the US subsidiary\'s net assets' },
      { id: 'f_econ', key: 'economic exposure', kind: 'constraint' as const, text: 'economic exposure from a sustained euro appreciation' },
      { id: 'f_sub', key: 'US subsidiary', kind: 'entity' as const, text: 'the US sales subsidiary consolidated into the euro accounts' },
      { id: 'f_entity', key: 'Aldebrino', kind: 'entity' as const, text: 'Aldebrino SpA' },
    ];
    const criteria = [
      { id: 'c1', requirement_part: parts[0], lo: 'E2a', marks: 2, anchor_facts: ['f_txn'], disqualifiers: ['F1', 'F5', 'F2'] as FailureMode[], development_required: true, evidence_anchor: 'F9 J16 p.5 — exposures named but not described (house-authored F2 marking basis)', required_point: 'Transaction exposure is the risk that the euro value of a known, contracted future cash flow changes before settlement — here the USD and GBP receivables settled 60–90 days after sale — and it is a real cash-flow risk, not an accounting one.' },
      { id: 'c2', requirement_part: parts[0], lo: 'E2a', marks: 2, anchor_facts: ['f_trans', 'f_sub'], disqualifiers: ['F1', 'F5', 'F2'] as FailureMode[], development_required: true, required_point: 'Translation exposure is the accounting effect of retranslating the US subsidiary\'s dollar net assets into euros at each year-end; it moves the consolidated balance sheet and gearing but does not, of itself, move cash — which is what distinguishes it from transaction exposure.' },
      { id: 'c3', requirement_part: parts[0], lo: 'E2a', marks: 2, anchor_facts: ['f_econ'], disqualifiers: ['F1', 'F5', 'F2'] as FailureMode[], development_required: true, required_point: 'Economic exposure is the longer-term effect of a sustained euro appreciation on Aldebrino\'s competitiveness against US-based rivals, independent of any single invoice; it is the broadest and hardest to quantify because it affects future, uncontracted cash flows.' },
      { id: 'c4', requirement_part: parts[1], lo: 'E2a', marks: 2, anchor_facts: ['f_txn', 'f_econ'], disqualifiers: ['F4', 'F5'] as FailureMode[], development_required: true, required_point: 'Management differs by type and the answer should commit to a priority: transaction exposure is hedged with forwards, money-market hedges or options; translation exposure is best matched (foreign borrowings against foreign assets) rather than derivative-hedged; economic exposure needs operational responses — sourcing, pricing and market diversification — so Aldebrino should hedge the transaction exposure first and treat the translation effect as second-order.' },
    ];
    const rubric: NarrativeRubric = { mode: 'narrative', requirement_parts: parts, scenario_facts: facts, criteria, total_marks: 8, bands: NARRATIVE_BANDS };
    const reveal = "Aldebrino faces three distinct kinds of currency risk, and separating them matters because each is managed differently.\n\nThe first is transaction exposure. Aldebrino sells to US and UK customers and collects those receivables 60 to 90 days after the sale, so between invoice and settlement the euro value of a known, contracted cash flow can move. This is a genuine cash-flow risk: if the dollar weakens before the customer pays, the euros actually received fall.\n\nThe second is translation exposure. Aldebrino's US subsidiary holds dollar net assets that are retranslated into euros at each year-end for the consolidated accounts. A weaker dollar reduces their reported euro value, which moves the consolidated balance sheet and gearing — but it does not, in itself, move any cash. That accounting-versus-cash distinction is exactly what separates it from transaction exposure.\n\nThe third is economic exposure. If the euro strengthens on a sustained basis, Aldebrino's euro-cost products become dearer relative to US-based competitors regardless of any single invoice, eroding future, uncontracted sales. It is the broadest of the three and the hardest to quantify because it bites on cash flows that have not yet arisen.\n\nManagement should follow the type. The transaction exposure is the one to hedge financially and first — forward contracts, money-market hedges or currency options fix the euro value of the receivables. Translation exposure is usually better matched than hedged: financing the US subsidiary with dollar borrowings offsets its dollar assets, so a derivative overlay is rarely worth the cost. Economic exposure cannot be hedged with a forward at all; it calls for operational answers — diversifying markets, sourcing some costs in dollars, or pricing flexibility. On balance, the board should hedge the transaction exposure as the priority, manage translation by matching, and treat the economic exposure as a strategic rather than a treasury problem.";
    const golden_bad = "Aldebrino invoices its US customers in US dollars and its UK customers in pounds sterling, and settles those receivables 60–90 days after sale. A sustained strengthening of the euro against the dollar would make Aldebrino's products less competitive.\n\nThere are three types of foreign exchange exposure: transaction exposure, translation exposure and economic exposure. Transaction exposure arises from transactions. Translation exposure arises from translation of foreign items. Economic exposure is a broader, longer-term type of exposure that affects the business economically.\n\nAll three types of exposure can be a risk to a company that operates internationally. Companies use various techniques to manage foreign exchange risk, including forward contracts, options and other hedging instruments. These are widely used in practice and can help reduce the impact of exchange rate movements.\n\nOverall, foreign exchange exposure is an important consideration for any international business. The board will need to consider the various types of exposure and the available management techniques carefully, taking into account the company's circumstances and risk appetite, before deciding how best to proceed.";
    const mis = "The signature misconception here is naming the exposures without describing them: candidates list transaction, translation and economic exposure as three labels, then explain \"transaction exposure arises from transactions,\" never distinguishing a cash-flow risk from an accounting one or matching each to the right management tool.";
    out.push({ key: 'B2(ii) E2a exposure types', lo: 'E2a', order: 2, marks: 8, ps: 'scepticism,commercial_acumen', rubric, scenario: ctx.B2ctx, reveal, golden_bad, full_reveal: `${mis}\n\n${reveal}`, model_answer: reveal, hint: "Naming the three exposures earns little — the marks are in distinguishing them (which is a cash-flow risk, which is only accounting) and matching each to the right tool. Say clearly which one Aldebrino should hedge first, and which cannot be hedged with a forward at all." });
  }

  return out;
}

// ── serialise a narrative rubric for the answer_schema column ──
function serialiseNarrative(n: NarrItem) {
  return { mode: 'narrative', rubric_version: 'narrative_v1', requirement_parts: n.rubric.requirement_parts, scenario_facts: n.rubric.scenario_facts, criteria: n.rubric.criteria, total_marks: n.rubric.total_marks, bands: n.rubric.bands, _authoring: { golden_bad: n.golden_bad, designed_bad_flags: DESIGNED_BAD, note: 'Rule-23 golden BAD + designed F-modes. NOT served. Golden GOOD is model_answer.' } };
}

/**
 * ── THE DESTRUCTIVE-WRITE GUARD (structural, not instructed — added 2026-08-01) ──
 *
 * `insertAll` deletes each target case before re-inserting it, and that delete CASCADES to
 * `acca_case_exhibits`, `acca_case_requirements` and every student's `acca_case_progress`
 * for those requirements. When this script was written, the three cases were unpublished
 * candidates and that was harmless. They are now LIVE and served by the sit surface.
 *
 * A header warning does not stop anything. This does:
 *
 *   1. It READS the live rows first and REFUSES outright if any target case is
 *      `published = true`. There is no flag that overrides this — a published case must be
 *      demoted deliberately, through the normal publish-flip discipline, before it can be
 *      re-authored. That is the whole point: the failure mode is someone running `--insert`
 *      without realising the paper went live, and a flag they can add is no protection.
 *   2. Even for unpublished rows, the delete additionally requires `--i-will-delete-live-rows`,
 *      because the cascade destroys student progress whatever the publish state.
 *   3. It PRINTS exactly what will be deleted — case ids, titles, publish state, and the
 *      counts of dependent rows including student progress — before doing anything.
 *
 * Ordered so the refusal happens BEFORE any write. P-DB2: show the write before it happens.
 */
async function assertSafeToOverwrite(
  // Structurally typed, like lib/acca/case-mark-run.ts: the generated SupabaseClient generics
  // do not unify across call sites and this guard needs none of them.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (t: string) => any },
  caseIds: string[],
): Promise<void> {
  const { data: rows, error } = await supabase
    .from('acca_cases')
    .select('id, title, status, published')
    .in('id', caseIds);
  if (error) throw new Error(`destructive-write guard could not read acca_cases: ${error.message}`);

  const existing = (rows ?? []) as Array<{ id: string; title: string | null; status: string; published: boolean }>;

  console.log('\n── DESTRUCTIVE WRITE — what --insert would DELETE ──');
  if (existing.length === 0) {
    console.log('   (no existing rows for these ids — this is a first author, nothing is deleted)');
    return;
  }

  let published = 0;
  for (const c of existing) {
    const [{ count: exhibits }, { count: reqs }] = await Promise.all([
      supabase.from('acca_case_exhibits').select('id', { count: 'exact', head: true }).eq('case_id', c.id),
      supabase.from('acca_case_requirements').select('id', { count: 'exact', head: true }).eq('case_id', c.id),
    ]);
    const { count: progress } = await supabase
      .from('acca_case_progress').select('user_id', { count: 'exact', head: true }).eq('case_id', c.id);
    if (c.published) published++;
    console.log(
      `   ${c.id}  ${String(c.title).padEnd(24)} status=${c.status} published=${c.published}` +
      `  → cascades: ${exhibits ?? 0} exhibits, ${reqs ?? 0} requirements, ${progress ?? 0} student progress rows`,
    );
  }

  if (published > 0) {
    throw new Error(
      `REFUSED: ${published} of ${existing.length} target case(s) are published=true. This script ` +
      'deletes and re-inserts as candidate/unpublished, which would take the live sit surface ' +
      'down and destroy student progress. Demote them deliberately first — there is no override flag.',
    );
  }
  if (!DO_DESTRUCTIVE) {
    throw new Error(
      'REFUSED: re-authoring deletes existing rows and cascades to student progress. Re-run with ' +
      '--i-will-delete-live-rows if that is genuinely intended.',
    );
  }
  console.log('   guard passed: no target case is published, and --i-will-delete-live-rows was given.\n');
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function insertAll(x: any): Promise<void> {
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  const { numeric, narratives } = x as { numeric: any[]; narratives: NarrItem[] };
  await assertSafeToOverwrite(supabase, [CID.A, CID.B1, CID.B2]);
  const cases = [
    { id: CID.A, section: 'A', anchor_area: null, title: 'Solenne Industries SA', intro: A_INTRO, ex: A_EX, total: 50, ps: 10 },
    { id: CID.B1, section: 'B', anchor_area: 'B1', title: 'Brecon Renewables plc', intro: B1_INTRO, ex: B1_EX, total: 25, ps: 5 },
    { id: CID.B2, section: 'B', anchor_area: 'E3', title: 'Aldebrino SpA', intro: B2_INTRO, ex: B2_EX, total: 25, ps: 5 },
  ];
  // Requirements grouped by case
  const reqByCase: Record<string, { order: number; label: string; question: string; lo: string; verb: string; level: number; marks: number; ps: string; model_answer: string; hint: string; full_reveal: string; answer_schema: unknown }[]> = { [CID.A]: [], [CID.B1]: [], [CID.B2]: [] };
  const labelFor = (lo: string, order: number, marks: number) => `(${['i', 'ii', 'iii', 'iv'][order - 1]}) ${lo} — ${marks} marks`;
  for (const r of numeric) {
    const caseId = r.lo.startsWith('B3') || r.lo.startsWith('B5') || r.lo === 'E2b' ? CID.A : (r.lo === 'B1a' ? CID.B1 : CID.B2);
    reqByCase[caseId].push({ order: r.order, label: labelFor(r.lo, r.order, r.marks), question: r.q, lo: r.lo, verb: 'calculate', level: 3, marks: r.marks, ps: r.ps, model_answer: r.ma, hint: r.hint, full_reveal: r.reveal, answer_schema: r.schema.serialized });
  }
  for (const n of narratives) {
    const caseId = n.lo === 'E1a' ? CID.A : (n.lo === 'B1b' ? CID.B1 : CID.B2);
    reqByCase[caseId].push({ order: n.order, label: labelFor(n.lo, n.order, n.marks), question: questionFor(n.lo), lo: n.lo, verb: 'evaluate', level: 3, marks: n.marks, ps: n.ps, model_answer: n.model_answer, hint: n.hint, full_reveal: n.full_reveal, answer_schema: serialiseNarrative(n) });
  }
  for (const c of cases) {
    await supabase.from('acca_cases').delete().eq('id', c.id); // idempotent re-author
    await supabase.from('acca_cases').insert({ id: c.id, exam_board: 'ACCA', paper_code: 'AFM', syllabus_cycle: 'S26-J27', section: c.section, anchor_area: c.anchor_area, title: c.title, scenario_intro: c.intro, response_format: c.section === 'A' ? 'report' : (c.id === CID.B1 ? 'briefing note' : 'report'), total_marks: c.total, professional_skills_marks: c.ps, status: 'candidate', published: false, mock_only: true });
    let eo = 1;
    for (const e of c.ex) { await supabase.from('acca_case_exhibits').insert({ case_id: c.id, exhibit_order: eo++, title: e.title, body: e.body }); }
    const reqs = reqByCase[c.id].sort((a, b) => a.order - b.order);
    for (const r of reqs) {
      await supabase.from('acca_case_requirements').insert({ case_id: c.id, requirement_order: r.order, label: r.label, question: r.question, lo_code: r.lo, command_verb: r.verb, intellectual_level: r.level, marks_guide: r.marks, professional_skill_tags: r.ps, model_answer: r.model_answer, hint: r.hint, full_reveal: r.full_reveal, answer_schema: r.answer_schema });
    }
    console.log(`inserted case ${c.title} (${reqs.length} requirements)`);
  }
  console.log('INSERT COMPLETE — 3 cases, 8 requirements, candidate/unpublished, mock_only=true');
}

function questionFor(lo: string): string { return lo === 'E1a' ? A_IV_Q : lo === 'B1b' ? B1_II_Q : B2_II_Q; }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function writePack(x: any): void {
  // pack generation appended after a green insert — see the --pack path (implemented separately)
  console.log('(pack generation runs after insert; see docs/reviews)');
  void x;
}

main().catch((e) => { console.error(e); process.exit(1); });
