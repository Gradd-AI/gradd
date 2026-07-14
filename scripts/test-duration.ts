// scripts/test-duration.ts
// Fixtures for the bond-duration calculator (lib/acca/duration.ts). Pure — no env/DB/model.
// Per kind: self-consistency; all-correct; single-root-wrong carry; no-workings. Plus a
// DISTINCT-FACTOR seeded-OFR replication (the generator's buildOfrProof perturbs every root
// by a different factor so the scale-invariant Macaulay ratio does not cancel to 'correct').
// Numeric checks: modified = Macaulay/(1+y); zero-coupon Macaulay = maturity; compare ranking.

import { computeDuration, buildDurationSchema, type DurationInputs, type DurationKind } from '../lib/acca/duration';
import { verifyNumericAnswer, type AnswerSchema, type StudentSubmission, type Verdict } from '../lib/acca/numeric-verifier';
import { validateSchemaSelfConsistency } from '../lib/acca/validate-schema';

let failures = 0;
const near = (a: number, b: number, eps = 0.01) => Math.abs(a - b) < eps;

const INPUTS: Record<DurationKind, DurationInputs> = {
  standard: { bond: { face_value: 100, coupon_rate: 0.06, maturity: 5, ytm: 0.08, label: 'the bond' }, yield_shift: 0.01 },
  compare: { bond: { face_value: 100, coupon_rate: 0.05, maturity: 3, ytm: 0.07, label: 'the 3-year note' }, bond_b: { face_value: 100, coupon_rate: 0.05, maturity: 8, ytm: 0.07, label: 'the 8-year bond' } },
  zero_coupon: { bond: { face_value: 100, coupon_rate: 0, maturity: 5, ytm: 0.08, label: 'the zero-coupon note' }, coupon_ref: { face_value: 100, coupon_rate: 0.06, maturity: 5, ytm: 0.08, label: 'the 5-year coupon bond' } },
  limitations: { bond: { face_value: 100, coupon_rate: 0.04, maturity: 10, ytm: 0.06, label: 'the bond' }, yield_shift: 0.03 },
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
  for (const pc of res.per_component) { const want = expected[pc.component_id]; const pass = pc.verdict === want; if (!pass) ok = false; rows.push(`   ${pass ? 'PASS' : 'FAIL'} ${pc.component_id.padEnd(20)} ${pc.verdict.padEnd(11)}${pass ? '' : `(want ${want})`}`); }
  console.log(`${ok ? 'PASS' : 'FAIL'} :: ${name}`);
  if (!ok) { console.log(rows.join('\n')); failures++; }
}
// Distinct-factor OFR replication (mirrors scripts/generate-afm-drills.ts buildOfrProof).
function distinctFactorProof(schema: AnswerSchema) {
  const own = new Map<string, number>(); const comps: StudentSubmission['components'] = []; const exp: Record<string, Verdict> = {};
  let ri = 0;
  for (const c of schema.components) {
    const deps = c.depends_on ?? [];
    if (deps.length === 0 || !c.recompute) { const f = Math.max(0.30, 0.85 - ri * 0.06); ri++; const v = c.expected_value * f; own.set(c.component_id, v); comps.push({ component_id: c.component_id, value: v, workings: 'seed' }); exp[c.component_id] = 'incorrect'; }
    else { const dv: Record<string, number> = {}; for (const d of deps) dv[d] = own.get(d)!; const v = c.recompute(dv); own.set(c.component_id, v); comps.push({ component_id: c.component_id, value: v, workings: 'own' }); exp[c.component_id] = 'carried'; }
  }
  return { submission: { components: comps }, expected: exp };
}

for (const kind of Object.keys(INPUTS) as DurationKind[]) {
  console.log(`\n${'═'.repeat(60)}\nKIND: ${kind}`);
  const c = computeDuration(INPUTS[kind], kind);
  const { schema } = buildDurationSchema(INPUTS[kind], c, 'CLP', kind);
  const build = makeBuild(schema);
  const firstRoot = schema.components.find((x) => !x.depends_on?.length)!.component_id;
  const v = validateSchemaSelfConsistency(schema);
  console.log(`SELF-CONSISTENCY: ${v.ok ? 'PASS' : 'FAIL'}  (${schema.components.length} components, first root ${firstRoot})`);
  if (!v.ok) { failures++; for (const i of v.issues) console.log(`   ✗ [${i.gate}/${i.code}] ${i.component_id}: ${i.message}`); }

  const allCorrect: Record<string, Verdict> = {};
  for (const x of schema.components) allCorrect[x.component_id] = 'correct';
  run(`(1) ${kind} all correct`, schema, build({}), allCorrect);

  // (2) single first-root wrong (workings) → it incorrect; its chain carries.
  const root = schema.components.find((x) => x.component_id === firstRoot)!;
  const downstream = (id: string): string[] => schema.components.filter((x) => (x.depends_on ?? []).includes(id)).flatMap((x) => [x.component_id, ...downstream(x.component_id)]);
  const carry: Record<string, Verdict> = { ...allCorrect, [firstRoot]: 'incorrect' };
  for (const d of new Set(downstream(firstRoot))) carry[d] = 'carried';
  run(`(2) ${kind} ${firstRoot} wrong (workings) → chain carries`, schema, build({ [firstRoot]: { value: root.expected_value * 0.8, workings: true } }), carry);

  // (3) distinct-factor seeded-OFR proof — every root incorrect, EVERY dependent carried
  // (the Macaulay ratio does NOT cancel to 'correct').
  const { submission, expected } = distinctFactorProof(schema);
  const res = verifyNumericAnswer(schema, submission);
  let ofrOk = true;
  for (const pc of res.per_component) if (pc.verdict !== expected[pc.component_id]) ofrOk = false;
  const anyCarried = res.per_component.some((p) => p.verdict === 'carried');
  console.log(`${ofrOk && anyCarried ? 'PASS' : 'FAIL'} :: (3) ${kind} distinct-factor OFR — all roots incorrect, all dependents carried (anyCarried ${anyCarried})`);
  if (!ofrOk || !anyCarried) { failures++; for (const pc of res.per_component) if (pc.verdict !== expected[pc.component_id]) console.log(`   ✗ ${pc.component_id} ${pc.verdict} (want ${expected[pc.component_id]})`); }
}

// ── Numeric checks ──
console.log(`\n${'═'.repeat(60)}\nNUMERIC CHECKS`);
{
  const c = computeDuration(INPUTS.standard, 'standard');
  const p = c.primary;
  const ok = near(p.price, 92.014, 0.02) && near(p.macaulay, 4.439, 0.005) && near(p.modified, 4.111, 0.005) && near(c.price_sensitivity!, -4.11, 0.02) && near(p.modified, p.macaulay / 1.08, 1e-9);
  console.log(`${ok ? 'PASS' : 'FAIL'} :: standard — price 92.01 (got ${p.price.toFixed(3)}), Macaulay 4.439 (got ${p.macaulay.toFixed(3)}), modified 4.111 (got ${p.modified.toFixed(3)}) = Mac/(1+y), ΔP/P -4.11% (got ${c.price_sensitivity!.toFixed(2)})`);
  if (!ok) failures++;
}
{
  const c = computeDuration(INPUTS.zero_coupon, 'zero_coupon');
  const ok = near(c.primary.macaulay, 5.0, 1e-6) && c.zero_identity_ok === true && c.coupon_ref!.macaulay < 5 && near(c.coupon_ref!.macaulay, 4.439, 0.005);
  console.log(`${ok ? 'PASS' : 'FAIL'} :: zero_coupon — zero Macaulay = maturity 5.000 (got ${c.primary.macaulay.toFixed(4)}), coupon-ref ${c.coupon_ref!.macaulay.toFixed(3)} < 5`);
  if (!ok) failures++;
}
{
  const c = computeDuration(INPUTS.compare, 'compare');
  const ok = c.more_exposed === 'bond_b' && c.bond_b!.modified > c.primary.modified;
  console.log(`${ok ? 'PASS' : 'FAIL'} :: compare — 8-year (mod ${c.bond_b!.modified.toFixed(2)}) more exposed than 3-year (mod ${c.primary.modified.toFixed(2)}); more_exposed=${c.more_exposed}`);
  if (!ok) failures++;
}
{
  const c = computeDuration(INPUTS.limitations, 'limitations');
  const ok = near(c.price_sensitivity!, -c.primary.modified * 0.03 * 100, 1e-6) && c.primary.modified > 7;
  console.log(`${ok ? 'PASS' : 'FAIL'} :: limitations — modified ${c.primary.modified.toFixed(2)}y, large +300bp ΔP/P ${c.price_sensitivity!.toFixed(2)}% (linear estimate)`);
  if (!ok) failures++;
}

// ── Unscaled-face guard (FIX B) — a bond drill may NEVER render an unscaled face with an
// m-suffix. money() tags every figure "m" (millions), so a full-nominal face (500,000,000)
// would render "IDR 500000000.0m" (500 million million). computeDuration must reject it.
{
  let threw = false;
  try {
    computeDuration({ bond: { face_value: 500_000_000, coupon_rate: 0, maturity: 7, ytm: 0.095, label: 'unscaled zero' }, coupon_ref: { face_value: 500_000_000, coupon_rate: 0.08, maturity: 7, ytm: 0.095, label: 'unscaled ref' } }, 'zero_coupon');
  } catch { threw = true; }
  console.log(`${threw ? 'PASS' : 'FAIL'} :: unscaled-face guard — face 500,000,000 rejected (m-suffix would be dimensionally false)`);
  if (!threw) failures++;
  // And a correctly-scaled face (500 = IDR 500,000,000 in millions) must still compute.
  let scaledOk = false;
  try {
    const c = computeDuration({ bond: { face_value: 500, coupon_rate: 0, maturity: 7, ytm: 0.095, label: 'scaled zero' }, coupon_ref: { face_value: 500, coupon_rate: 0.08, maturity: 7, ytm: 0.095, label: 'scaled ref' } }, 'zero_coupon');
    scaledOk = near(c.primary.macaulay, 7.0, 1e-6);
  } catch { scaledOk = false; }
  console.log(`${scaledOk ? 'PASS' : 'FAIL'} :: scaled-face passes — face 500 (IDR 500m) computes, zero Macaulay = maturity`);
  if (!scaledOk) failures++;
}

console.log(`\n${'─'.repeat(56)}`);
console.log(failures === 0 ? 'ALL DURATION FIXTURES PASS' : `${failures} DURATION FIXTURE(S) FAILED`);
process.exit(failures === 0 ? 0 : 1);
