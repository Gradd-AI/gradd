// scripts/test-capm.ts
// Fixtures for the CAPM / cost-of-capital calculator (lib/acca/capm.ts). Pure — no env/DB/model.
// Per kind: schema self-consistency; all-correct; first-root wrong (workings) → carry through the
// rate/beta chain; no-workings at source. Plus numeric checks (MM ungear/regear round-trip; the
// wrong_hurdle flip is code-owned).

import { computeCapm, buildCapmSchema, type CapmInputs, type CapmKind } from '../lib/acca/capm';
import { verifyNumericAnswer, type AnswerSchema, type StudentSubmission, type Verdict } from '../lib/acca/numeric-verifier';
import { validateSchemaSelfConsistency } from '../lib/acca/validate-schema';

let failures = 0;
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

const INPUTS: Record<CapmKind, CapmInputs> = {
  project_specific: { rf: 0.04, mrp: 0.06, tax_rate: 0.25, kd: 0.05, peer_equity_beta: 1.2, peer_ve: 100, peer_vd: 40, own_ve: 60, own_vd: 40 },
  org_wacc: { rf: 0.04, mrp: 0.06, tax_rate: 0.25, kd: 0.05, company_equity_beta: 1.1, company_ve: 80, company_vd: 20 },
  keu_for_apv: { rf: 0.035, mrp: 0.055, tax_rate: 0.25, peer_equity_beta: 1.3, peer_ve: 100, peer_vd: 50 },
  wrong_hurdle: { rf: 0.04, mrp: 0.06, tax_rate: 0.25, kd: 0.05, company_equity_beta: 0.9, company_ve: 70, company_vd: 30, peer_equity_beta: 1.5, peer_ve: 100, peer_vd: 20, project_return: 9.5 },
};

const TERMINALS: Record<CapmKind, string[]> = {
  project_specific: ['wacc_project'], org_wacc: ['wacc'], keu_for_apv: ['keu'], wrong_hurdle: ['company_wacc'],
};

function makeBuild(schema: AnswerSchema) {
  return function build(overrides: Record<string, { value: number; workings: boolean }>): StudentSubmission {
    const own = new Map<string, number>();
    const comps: StudentSubmission['components'] = [];
    for (const c of schema.components) {
      const ov = overrides[c.component_id];
      let value: number;
      if (ov) value = ov.value;
      else if (!c.depends_on?.length || !c.recompute) value = c.expected_value;
      else { const deps: Record<string, number> = {}; for (const d of c.depends_on) deps[d] = own.get(d)!; value = c.recompute(deps); }
      own.set(c.component_id, value);
      const showW = ov ? ov.workings : true;
      comps.push({ component_id: c.component_id, value, workings: showW ? c.working_steps?.[0] ?? 'shown' : '' });
    }
    return { components: comps };
  };
}
function run(name: string, schema: AnswerSchema, submission: StudentSubmission, expected: Record<string, Verdict>) {
  const res = verifyNumericAnswer(schema, submission);
  let ok = true; const rows: string[] = [];
  for (const pc of res.per_component) {
    const want = expected[pc.component_id]; const pass = pc.verdict === want;
    if (!pass) ok = false;
    rows.push(`   ${pass ? 'PASS' : 'FAIL'} ${pc.component_id.padEnd(20)} ${pc.verdict.padEnd(11)}${pass ? '' : `(want ${want})`}`);
  }
  console.log(`${ok ? 'PASS' : 'FAIL'} :: ${name}  awarded ${res.awarded}/${res.available}`);
  if (!ok) { console.log(rows.join('\n')); failures++; }
}

for (const kind of Object.keys(INPUTS) as CapmKind[]) {
  console.log(`\n${'═'.repeat(60)}\nKIND: ${kind}`);
  const c = computeCapm(INPUTS[kind], kind);
  const { schema } = buildCapmSchema(INPUTS[kind], c, kind);
  const build = makeBuild(schema);
  const firstRoot = schema.components.find((x) => !x.depends_on?.length)!.component_id;

  const v = validateSchemaSelfConsistency(schema);
  console.log(`SELF-CONSISTENCY: ${v.ok ? 'PASS' : 'FAIL'}  (first root: ${firstRoot})`);
  if (!v.ok) { failures++; for (const i of v.issues) console.log(`   ✗ [${i.gate}/${i.code}] ${i.component_id}: ${i.message}`); }

  const allCorrect: Record<string, Verdict> = {};
  for (const x of schema.components) allCorrect[x.component_id] = 'correct';
  run(`(1) ${kind} all correct`, schema, build({}), allCorrect);

  // (2) first root wrong (workings) → it incorrect; every component downstream of it carries.
  const root = schema.components.find((x) => x.component_id === firstRoot)!;
  const carry: Record<string, Verdict> = { ...allCorrect, [firstRoot]: 'incorrect' };
  const downstream = (id: string): string[] => schema.components.filter((x) => (x.depends_on ?? []).includes(id)).flatMap((x) => [x.component_id, ...downstream(x.component_id)]);
  for (const d of new Set(downstream(firstRoot))) carry[d] = 'carried';
  run(`(2) ${kind} ${firstRoot} wrong (workings) → chain carries`, schema, build({ [firstRoot]: { value: root.expected_value * 0.8, workings: true } }), carry);

  // (3) first root wrong, NO workings → no_workings at source; downstream still carry from own.
  const noWork: Record<string, Verdict> = { ...carry, [firstRoot]: 'no_workings' };
  run(`(3) ${kind} ${firstRoot} wrong (NO workings)`, schema, build({ [firstRoot]: { value: root.expected_value * 0.8, workings: false } }), noWork);
  void TERMINALS;
}

// ── Numeric checks ──
console.log(`\n${'═'.repeat(60)}\nNUMERIC CHECKS`);
{
  // MM with-tax: ungear then regear to the SAME gearing returns the original equity beta.
  const c = computeCapm(INPUTS.project_specific, 'project_specific');
  const ok = near(c.asset_beta!, 0.9231, 0.001) && near(c.regeared_beta!, 1.3846, 0.001) && near(c.ke!, 12.31, 0.02) && near(c.wacc!, 8.88, 0.02) && c.beta_direction === 'higher';
  console.log(`${ok ? 'PASS' : 'FAIL'} :: project_specific — asset β 0.9231 (got ${c.asset_beta!.toFixed(4)}), regeared 1.3846 (got ${c.regeared_beta!.toFixed(4)}), Ke 12.31% (got ${c.ke!.toFixed(2)}), WACC 8.88% (got ${c.wacc!.toFixed(2)}), regeared>peer`);
  if (!ok) failures++;
}
{
  const c = computeCapm(INPUTS.keu_for_apv, 'keu_for_apv');
  const ok = near(c.asset_beta!, 0.9455, 0.001) && near(c.keu!, 8.70, 0.02);
  console.log(`${ok ? 'PASS' : 'FAIL'} :: keu_for_apv — asset β 0.9455 (got ${c.asset_beta!.toFixed(4)}), Keu 8.70% (got ${c.keu!.toFixed(2)})`);
  if (!ok) failures++;
}
{
  const c = computeCapm(INPUTS.org_wacc, 'org_wacc');
  const ok = near(c.ke!, 10.60, 0.02) && near(c.wacc!, 9.23, 0.02);
  console.log(`${ok ? 'PASS' : 'FAIL'} :: org_wacc — Ke 10.60% (got ${c.ke!.toFixed(2)}), WACC 9.23% (got ${c.wacc!.toFixed(2)})`);
  if (!ok) failures++;
}
{
  // wrong_hurdle: code owns the flip. return 9.5% is above company WACC (~7.71) but below the
  // project rate (~11.16) → company hurdle wrongly ACCEPTS, project hurdle correctly REJECTS.
  const c = computeCapm(INPUTS.wrong_hurdle, 'wrong_hurdle');
  const ok = near(c.company_wacc!, 7.705, 0.02) && near(c.project_wacc!, 11.165, 0.03) && c.accept === false && c.would_accept_on_company === true && c.flips === true;
  console.log(`${ok ? 'PASS' : 'FAIL'} :: wrong_hurdle — company WACC ${c.company_wacc!.toFixed(2)} < return 9.5 < project WACC ${c.project_wacc!.toFixed(2)}; correct=REJECT, company-hurdle=accept, FLIPS=${c.flips}`);
  if (!ok) failures++;
}

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL CAPM FIXTURES PASS' : `${failures} CAPM FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
