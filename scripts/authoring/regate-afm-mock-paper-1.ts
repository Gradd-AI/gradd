// scripts/authoring/regate-afm-mock-paper-1.ts
//
// ═══════════════════════════════════════════════════════════════════════════════
// THE GATE-MATRIX HARNESS OVER THE LIVE PAPER — COMMITTED (P-DB6, 2026-08-01)
// ═══════════════════════════════════════════════════════════════════════════════
//
// PROPER re-gate of AFM Mock Paper 1: family gate inputs and `computed` supplied for every
// numeric requirement, the committed N1–N5 barrier for every narrative one, and a FULL MATRIX
// printed — every gate × every requirement, pass / fail / not_evaluated, no aggregation.
//
// It is the ONLY thing that re-proves all 37 gate lines against the rows that are actually
// live. Everything else either gates content at authoring time (and the paper is authored) or
// checks one property. Losing it would mean the live paper could never be re-verified as a
// whole without rebuilding this from scratch — which is why it is committed under P-DB6
// alongside the authoring script it partners.
//
// READ-ONLY. It SELECTs the live rows, runs the gates in memory, and prints. It writes
// nothing. Safe to run against production at any time; run it after any content patch that
// touches these three cases.
//
// ── THE BUG THIS FILE EXISTS TO PREVENT ──────────────────────────────────────
// The previous version called runRequirementGateBarrier WITHOUT the family argument and with a
// hardcoded `hasLoss: false`. It printed "ALL GATES GREEN" while 13 family-gate lines, GATE 26
// and GATE 27 never executed. That is what the pass/fail/not_evaluated model (P-G1) and the
// now-REQUIRED `family` parameter exist to make impossible. A green run from a harness that
// silently skipped a third of its gates is worse than no run.
//
// Calculator inputs are reconstructed from scripts/authoring/author-afm-mock-paper-1.ts
// VERBATIM — same literals, same order — so the family gates see exactly what authoring saw.
// Those literals are duplicated here on purpose: importing the authoring script would execute
// its main(). If the two ever diverge, scripts/verify-schema-discriminants.ts is what catches
// it — it rebuilds from these same inputs and diffs against the live rows.
//
// Needs ANTHROPIC_API_KEY: N1 and N4 are the grader-backed narrative gates and are the only
// non-deterministic lines in the matrix.
//
// Run: npx tsx --env-file=.env.local scripts/authoring/regate-afm-mock-paper-1.ts

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import {
  runRequirementGateBarrier, runNarrativeGateBarrier,
  type FamilyGateInput, type GateLine,
} from '../../lib/acca/case-authoring-gates';
import { makeAnthropicCriterionGrader } from '../../lib/acca/narrative-grader';
import { runCaseGates } from '../../lib/acca/case-gates';
import { hydrateAnswerSchema } from '../../lib/acca/recompute-registry';
import { computeCapm } from '../../lib/acca/capm';
import { computeIntlNpv, type IntlNpvInputs } from '../../lib/acca/international';
import { computeForwardMmhCompare } from '../../lib/acca/fxhedge';
import { computeEnpv } from '../../lib/acca/risk';
import { computeIrFutures } from '../../lib/acca/irhedge';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const CASES = [
  { id: 'aa000000-0000-4000-8000-00000000a001', tag: 'A' },
  { id: 'aa000000-0000-4000-8000-00000000b101', tag: 'B1' },
  { id: 'aa000000-0000-4000-8000-00000000b201', tag: 'B2' },
];

// ── Calculator inputs, verbatim from the authoring script ──
const capmIn = { rf: 4.5, mrp: 6.0, tax_rate: 25, peer_tax_rate: 34, kd: 5.5, peer_equity_beta: 1.35, peer_ve: 60, peer_vd: 40, own_ve: 70, own_vd: 30 };
const capmC = computeCapm(capmIn, 'project_specific');
const npvIn: IntlNpvInputs = { home_currency: 'EUR', foreign_currency: 'BRL', base_spot: 5.60, basis: 'ppp', rate_home: 2.0, rate_foreign: 4.5, discount_rate: capmC.wacc!, foreign_build: { pbit: 320, tax_rate: 34, depreciation: 80, capex: 60, delta_working_capital: 20 }, foreign_growth: 3.0, years: 4, initial_outlay_foreign: 480, withholding_rate: 15, home_tax_rate: 25, wht_creditable: true };
const npvC = computeIntlNpv(npvIn);
const fxIn = { currency_home: 'EUR', currency_foreign: 'BRL', exposure: Math.round(npvC.years[0].foreign_remit_net * 10) / 10, direction: 'receipt' as const, quote_direction: 'foreign_per_home' as const, forward_rate: 5.66, spot: 5.60, months: 3, rate_foreign_borrow: 12.0, rate_foreign_deposit: 10.0, rate_home_borrow: 3.5, rate_home_deposit: 2.0 };
const fxC = computeForwardMmhCompare(fxIn);
const enpvIn = { currency: 'GBP', outlay: 500, discount_rate: 10.0, hurdle: 0, scenarios: [{ label: 'Strong demand', probability: 0.30, cash_flows: [210, 230, 250, 270] }, { label: 'Base case', probability: 0.50, cash_flows: [150, 160, 170, 180] }, { label: 'Weak demand', probability: 0.20, cash_flows: [85, 90, 95, 100] }] };
const enpvC = computeEnpv(enpvIn);
const irIn = { currency: 'EUR', notional: 48_000_000, direction: 'borrower' as const, hedge_months: 6, contract_months: 3, contract_size: 1_000_000, spot_rate0: 4.0, futures0: 95.55, months_to_expiry: 9, months_to_transaction: 6, company_spread: 0.5, scenarios: [{ label: 'Rates rise', base_rate: 5.0 }, { label: 'Rates fall', base_rate: 3.2 }] };
const irC = computeIrFutures(irIn);

/** lo_code → family gate input. B3e has no registered family gates; that is STATED, not implied. */
function familyFor(lo: string, modelAnswer: string): FamilyGateInput {
  if (lo === 'B5b') return { lo: 'B5b', npvIn, npvC, modelAnswer };
  if (lo === 'E2b') return { lo: 'E2b', fxIn, fxC };
  if (lo === 'B1a') return { lo: 'B1a', enpvIn, enpvC };
  if (lo === 'E3a') return { lo: 'E3a', irIn, irC, modelAnswer };
  if (lo === 'B3e') return { lo: 'B3e', capmIn, capmC, capmKind: 'project_specific', modelAnswer };
  return { lo: 'NO_FAMILY_GATES', forLo: lo, reason: `no family-gate branch registered for lo_code "${lo}"` };
}
const computedFor: Record<string, unknown[]> = { B3e: [capmIn, capmC], B5b: [npvIn, npvC], E2b: [fxIn, fxC], B1a: [enpvIn, enpvC], E3a: [irIn, irC] };
function compareFor(lo: string): { selected: string; all: string[] } | undefined {
  if (lo === 'E2b') return { selected: fxC.comparison.selected_method, all: fxC.comparison.results.map((m) => m.method) };
  return undefined;
}
const zeroAddlTaxFor = (lo: string): boolean | undefined => (lo === 'B5b' ? !npvC.has_additional_home_tax : undefined);

const SYM: Record<string, string> = { pass: 'PASS  ', fail: 'FAIL  ', not_evaluated: 'N/EVAL' };
const rows: { req: string; gate: string; status: string; blocking: boolean; note: string }[] = [];

async function main() {
  const grader = makeAnthropicCriterionGrader(new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! }));
  console.log(`\n${'='.repeat(104)}\n  AFM MOCK PAPER 1 — FULL GATE MATRIX (family + computed supplied for every requirement)\n${'='.repeat(104)}`);

  const paperCases: unknown[] = [];

  for (const c of CASES) {
    const kase = (await supabase.from('acca_cases').select('title, scenario_intro, section, anchor_area, total_marks, professional_skills_marks').eq('id', c.id).single()).data!;
    const exh = (await supabase.from('acca_case_exhibits').select('title, body').eq('case_id', c.id).order('exhibit_order')).data ?? [];
    const reqs = (await supabase.from('acca_case_requirements').select('*').eq('case_id', c.id).order('requirement_order')).data ?? [];
    const ctx = [kase.scenario_intro, ...exh.map((e) => `${e.title}\n${e.body}`)].join('\n\n');
    const caseReqs: unknown[] = [];

    for (const r of reqs) {
      const sch = r.answer_schema as { components?: unknown[]; _authoring?: { golden_bad?: string; designed_bad_flags?: string[] } } | null;
      const isNumeric = !!sch?.components;
      const reqTag = `${c.tag} ${r.label.split(' ')[0]} ${r.lo_code}`;
      caseReqs.push({
        lo_code: r.lo_code, marks_guide: r.marks_guide, marking_kind: isNumeric ? 'calc' : 'narrative',
        professional_skill_tags: String(r.professional_skill_tags ?? '').split(',').map((x) => x.trim()).filter(Boolean),
      });

      let lines: GateLine[];
      if (isNumeric) {
        lines = runRequirementGateBarrier(hydrateAnswerSchema(r.answer_schema), {
          question: r.question, context: ctx, model_answer: r.model_answer,
          hint: r.hint, full_reveal: r.full_reveal,
          zeroAddlTax: zeroAddlTaxFor(r.lo_code),
          compare: compareFor(r.lo_code),
          computed: computedFor[r.lo_code],
        }, familyFor(r.lo_code, r.model_answer));
      } else {
        lines = await runNarrativeGateBarrier({
          rubric: r.answer_schema, scenario: ctx, reveal: r.model_answer,
          goldenBad: sch?._authoring?.golden_bad,
          designedBadFlags: sch?._authoring?.designed_bad_flags as never,
          grader,
        });
      }
      for (const l of lines) rows.push({ req: reqTag, gate: l.name, status: l.status, blocking: l.blocking, note: l.exemption ?? l.detail ?? '' });
    }
    paperCases.push({ section: kase.section, anchor_area: kase.anchor_area, total_marks: kase.total_marks, professional_skills_marks: kase.professional_skills_marks, requirements: caseReqs });
  }

  const cg = runCaseGates({ cases: paperCases } as never);
  for (const [k, v] of Object.entries(cg.results)) {
    rows.push({ req: 'PAPER', gate: k, status: v.pass ? 'pass' : 'fail', blocking: !v.pass, note: v.pass ? '' : JSON.stringify(v.violations) });
  }

  const wReq = Math.max(...rows.map((r) => r.req.length));
  const wGate = Math.max(...rows.map((r) => r.gate.length));
  let cur = '';
  for (const r of rows) {
    if (r.req !== cur) { console.log(''); cur = r.req; }
    const flag = r.status === 'not_evaluated' ? (r.blocking ? '  <= BLOCKING' : '  <= named exemption') : '';
    console.log(`  ${r.req.padEnd(wReq)}  ${r.gate.padEnd(wGate)}  ${SYM[r.status]}${flag}`);
    if (r.note && r.status !== 'pass') console.log(`  ${' '.repeat(wReq + wGate + 4)}  ${r.note.slice(0, 160)}`);
  }

  const fails = rows.filter((r) => r.status === 'fail');
  const blocking = rows.filter((r) => r.status === 'not_evaluated' && r.blocking);
  const exemptions = rows.filter((r) => r.status === 'not_evaluated' && !r.blocking);
  console.log(`\n${'='.repeat(104)}`);
  console.log(`  lines ${rows.length} · pass ${rows.filter((r) => r.status === 'pass').length} · fail ${fails.length} · not_evaluated ${blocking.length + exemptions.length} (BLOCKING ${blocking.length}, named exemption ${exemptions.length})`);
  if (fails.length) { console.log('\n  FAILURES:'); for (const r of fails) console.log(`    x ${r.req} · ${r.gate} — ${r.note.slice(0, 220)}`); }
  if (blocking.length) { console.log('\n  BLOCKING not_evaluated (coverage holes):'); for (const r of blocking) console.log(`    ! ${r.req} · ${r.gate} — ${r.note.slice(0, 220)}`); }
  if (exemptions.length) { console.log('\n  NAMED EXEMPTIONS (non-blocking, reason on the record):'); for (const r of exemptions) console.log(`    - ${r.req} · ${r.gate} — ${r.note.slice(0, 160)}`); }
  console.log(`\n  BARRIER: ${fails.length === 0 && blocking.length === 0 ? 'GREEN' : 'RED'}`);
  console.log(`${'='.repeat(104)}\n`);
}
main().catch((e) => { console.error(e); process.exit(1); });
