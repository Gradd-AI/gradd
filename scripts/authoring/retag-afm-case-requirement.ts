// scripts/authoring/retag-afm-case-requirement.ts
// Change ONE case requirement's lo_code, with the full P-DB2/3/4 discipline.
//
// WHY THIS IS COMMITTED AND NOT A THROWAWAY (P-DB6). It writes PUBLISHED content — the row ships the
// moment this runs, independent of git — so the script is the durable record of what was written and
// why. It PRINTS the ruling before applying, exactly as `retag-afm-drill.ts` does.
//
// ── WHY THIS IS A SEPARATE SCRIPT FROM retag-afm-drill.ts ────────────────────
// A DRILL's re-tag moves ONE scalar. A REQUIREMENT's lo_code is DUPLICATED INSIDE
// `answer_schema` — every criterion carries its own `"lo"` — so moving the column alone leaves a
// rubric that still marks against the old code, and a P-DB4 check asserting "exactly one field
// moved" would PASS on that half-done state. Two fields must move together, and the schema diff
// must be confined to the `lo` values: this script asserts BOTH, and asserts that nothing else
// inside the schema (criteria ids, marks, required_points, anchor_facts, disqualifiers, bands,
// _authoring) shifted by so much as a character.
//
// WHAT IT GUARANTEES:
//   P-DB3  a rollback snapshot of the WHOLE row is written BEFORE the update.
//   P-DB4  `lo_code` and `answer_schema` are the ONLY fields that move, and within answer_schema
//          ONLY the criterion `lo` values change — proven by rewriting the BEFORE schema with the
//          new code and asserting it canonically equals the AFTER schema.
//   It refuses a no-op, refuses an lo_code the paper's framework does not contain, and refuses if
//   the row is not what the caller said it was.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/authoring/retag-afm-case-requirement.ts \
//     --id <uuid> --from <lo> --to <lo> [--apply]
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { SYLLABUS_MAP } from '../afm-framework';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const arg = (f: string) => { const i = process.argv.indexOf(f); return i !== -1 ? process.argv[i + 1] : undefined; };
const APPLY = process.argv.includes('--apply');
const ID = arg('--id');
const FROM = arg('--from');
const TO = arg('--to');

/** The RULING this script exists to apply. Printed in full before any write, keyed by requirement
 *  id so a future reader sees which reasoning belongs to which row. */
const RULINGS: Record<string, string> = {
  'aeea3db3-3290-408b-af87-239d569c93ca': `
RULING (Grant, 2026-08-18) — Castlereagh Utilities plc requirement (iv): lo_code A3a -> A1c

THE TAG NAMES ESG. THE RUBRIC AWARDS NO ESG MARKS.

The requirement:
  "(iv) Draft a short briefing note for the four board members who have no financial background,
   explaining in plain language why Brackwater is not appraised at Castlereagh's own cost of
   capital. (6 marks)"

AFM A3a is "Assess an organisation's commitment to ESG criteria when undertaking business,
financial and investment decisions, and discuss and recommend how conflicts between the criteria
may be resolved." The words ESG, environment, social, governance, stakeholder and ethics appear
NOWHERE in the question, the model answer, or either criterion.

WHAT THE RUBRIC ACTUALLY MARKS (answer_schema, 2 criteria x 3 marks):
  c_principle  a discount rate reflects the RISK OF THE ACTIVITY, not the risk of the company
               doing it -- cost-of-capital content.
  c_audience   written for a NON-FINANCIAL reader, plain language, no algebra -- the
               communication act.
So 3 of 6 marks are technical cost-of-capital content and 3 of 6 are communication. Zero are ESG.

A1c IS THE CODE THAT FITS, and it fits on BOTH halves:
  "Advise the board of directors or management of the organisation in setting the financial goals
   of the business and in its financial policy development with particular reference to:
   ... (ii) MINIMISING THE COST OF CAPITAL; ... (iv) COMMUNICATING FINANCIAL POLICY AND CORPORATE
   GOALS TO INTERNAL AND EXTERNAL STAKEHOLDERS ..."
Advise the board / on cost of capital / communicated to non-specialists. A1c is also in section A,
so the case's section span is unchanged (B3e, E3a, B3i, A1c -> still A, B, E).

THE PS TAG IS CORRECT AND DOES NOT MOVE. professional_skill_tags stays "communication".

WHY THE WRONG CODE WAS CHOSEN -- AND IT WAS NOT A TYPO. Castlereagh is a SECTION A case, and gate
C4 (gatePsSkillSet) requires a Section A case to examine ALL FOUR professional skills. Requirements
(i)(ii)(iii) carry analysis_and_evaluation / scepticism / commercial_acumen, so (iv) HAD to be the
communication requirement -- and a communication act still needs a technical lo_code to hang on.
The author reached into section A and landed on A3a. gateSectionASpan was already satisfied by
B3e + E3a, so span did not force it; C4's coverage demand did.

  => A GATE THAT REQUIRES COVERAGE THE CONTENT DOES NOT NATURALLY SUPPLY WILL MAKE AN AUTHOR REACH
     FOR A CODE, AND THE GATE CANNOT SEE THAT IT CAUSED IT. C4 passes either way: it reads
     professional_skill_tags and never looks at lo_code. Banked as its own finding.

WHY NOW. The window is free and will not stay free: AFM A3a has 0 published drills and this 1
requirement; A1c has 0 drills and 0 requirements; acca_weak_areas holds 0 rows on A3a. Nothing a
student holds moves. Once a drill or a sit lands on either code, it does.

WHAT IS NOT CLAIMED. This is a reader's judgement about which LO the rubric examines, not a
measurement. No gate distinguishes the two codes -- the case gates read section letters and PS
tags, and the numeric/narrative barriers never read lo_code at all. That is precisely why it
survived authoring.`,
};

function deepSort(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(deepSort);
  if (v && typeof v === 'object') {
    return Object.keys(v as Record<string, unknown>).sort()
      .reduce((a, k) => { a[k] = deepSort((v as Record<string, unknown>)[k]); return a; }, {} as Record<string, unknown>);
  }
  return v;
}
const canonical = (v: unknown) => JSON.stringify(deepSort(v));

/** Rewrite every `lo` inside an answer_schema that equals `from`, to `to`. Returns the new schema
 *  and how many it changed. Deliberately narrow: it touches ONLY keys literally named `lo` whose
 *  value is exactly `from`, so a criterion referring to some other LO is left alone. */
function rewriteSchemaLo(schema: unknown, from: string, to: string): { next: unknown; changed: number } {
  let changed = 0;
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
        if (k === 'lo' && val === from) { out[k] = to; changed++; } else { out[k] = walk(val); }
      }
      return out;
    }
    return v;
  };
  return { next: walk(schema), changed };
}

async function main(): Promise<number> {
  let problems = 0;
  const fail = (m: string) => { problems++; console.error(`  ✗ HARD STOP — ${m}`); };

  if (!ID || !FROM || !TO) { console.error('Usage: --id <uuid> --from <lo> --to <lo> [--apply]'); return 1; }
  if (!(TO in SYLLABUS_MAP)) { console.error(`unknown target lo_code "${TO}" — not in the AFM framework`); return 1; }
  if (FROM === TO) { console.error('--from and --to are the same; refusing a no-op'); return 1; }

  const { data, error } = await s.from('acca_case_requirements').select('*').eq('id', ID).single();
  if (error || !data) { console.error(`requirement ${ID} not found: ${error?.message}`); return 1; }
  const before = data as unknown as Record<string, any>;

  console.log('═'.repeat(96));
  console.log(RULINGS[ID] ?? '(no recorded ruling for this id — refusing)');
  console.log('═'.repeat(96));
  if (!RULINGS[ID]) return 1;

  // The parent case, for the published warning and the printed context.
  const { data: parent } = await s.from('acca_cases')
    .select('id, title, paper_code, section, status, published, mock_only').eq('id', before.case_id).single();

  console.log(`\nTARGET: ${ID}`);
  console.log(`  case: ${parent?.title} [${parent?.paper_code} section ${parent?.section}] status=${parent?.status}/${parent?.published} mock_only=${parent?.mock_only}`);
  console.log(`  requirement_order=${before.requirement_order} label=${JSON.stringify(before.label)} marks_guide=${before.marks_guide}`);
  console.log(`  professional_skill_tags=${JSON.stringify(before.professional_skill_tags)}  (NOT changed)`);
  console.log(`  lo_code: ${before.lo_code}  ->  ${TO}`);
  if (before.lo_code !== FROM) fail(`row's lo_code is "${before.lo_code}", caller said "${FROM}" — wrong target or already moved`);

  const { next: nextSchema, changed } = rewriteSchemaLo(before.answer_schema, FROM, TO);
  console.log(`  answer_schema: ${changed} criterion "lo" value(s) rewritten ${FROM} -> ${TO}`);
  if (before.answer_schema && changed === 0) {
    fail(`answer_schema carries no "lo":"${FROM}" — the rubric does not reference the code being moved, so this is not the row you think it is`);
  }
  if (parent?.published === true) console.log(`  ⚠️  THIS ROW IS ON A PUBLISHED CASE — the change ships the moment it is written (P-DB2).`);
  if (problems) { console.error(`\n${problems} HARD STOP(S) — no write attempted.`); return problems; }

  // P-DB3 — snapshot the WHOLE row BEFORE the write.
  const snap = `docs/rollbacks/AFM_retag_req_${String(ID).slice(0, 8)}_20260818.json`;
  writeFileSync(snap, JSON.stringify({
    ruling: RULINGS[ID], from: FROM, to: TO, case: parent, row_before: before,
  }, null, 2), 'utf8');
  console.log(`\nP-DB3 snapshot written: ${snap}`);

  // P-DB2 — show the exact write before making it.
  console.log('\nP-DB2 — the write, in full:');
  console.log(`  supabase.from('acca_case_requirements')`);
  console.log(`    .update({ lo_code: '${TO}', answer_schema: <schema with ${changed} "lo" value(s) rewritten> })`);
  console.log(`    .eq('id', '${ID}')`);

  if (!APPLY) { console.log('\n(dry run — pass --apply to write)'); return 0; }

  const { error: upErr } = await s.from('acca_case_requirements')
    .update({ lo_code: TO, answer_schema: nextSchema } as never).eq('id', ID);
  if (upErr) { console.error(`update failed: ${upErr.message}`); return 1; }
  console.log(`\n✓ written`);

  // P-DB4 — EXACTLY two fields moved, and the schema moved in EXACTLY the intended way.
  const { data: afterData } = await s.from('acca_case_requirements').select('*').eq('id', ID).single();
  const after = afterData as unknown as Record<string, any>;
  const moved = Object.keys(before).filter((k) => canonical(before[k]) !== canonical(after[k]));
  console.log(`\nP-DB4 post-verify — fields that moved: [${moved.join(', ')}]`);

  if (after.lo_code !== TO) fail(`lo_code is "${after.lo_code}", expected "${TO}"`);
  const expected = new Set(['lo_code', 'answer_schema']);
  if (moved.length !== expected.size || !moved.every((m) => expected.has(m))) {
    fail(`expected exactly [lo_code, answer_schema]; got [${moved.join(', ')}]`);
  } else {
    console.log(`  ✓ ${Object.keys(before).length - 2}/${Object.keys(before).length - 2} other fields byte-identical`);
  }
  // The schema check that matters: the AFTER schema must equal the BEFORE schema with ONLY the
  // `lo` values rewritten. Anything else inside it — a criterion's marks, required_point,
  // anchor_facts, disqualifiers, the bands, _authoring — is a defect this catches.
  if (canonical(after.answer_schema) !== canonical(nextSchema)) {
    fail('answer_schema differs from BEFORE-with-lo-rewritten — something other than the lo values moved');
  } else {
    console.log(`  ✓ answer_schema differs from before by EXACTLY the ${changed} "lo" value(s); every other key byte-identical`);
  }
  if (JSON.stringify(after.answer_schema).includes(`"${FROM}"`)) {
    fail(`answer_schema still references "${FROM}" somewhere — a stale reference survived`);
  }
  console.log(`  ✓ professional_skill_tags unchanged: ${JSON.stringify(after.professional_skill_tags)}`);

  console.log(problems === 0 ? '\n✅ RE-TAG COMPLETE.' : `\n❌ ${problems} problem(s).`);
  return problems;
}

// P-G4 — set exitCode, never process.exit(), in a DB-touching script.
main().then((p) => { process.exitCode = p === 0 ? 0 : 1; }).catch((e) => { console.error(e); process.exitCode = 1; });
