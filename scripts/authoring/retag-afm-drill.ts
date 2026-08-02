// scripts/authoring/retag-afm-drill.ts
// Change ONE drill's professional_skill_tag, with the full P-DB2/3/4 discipline.
//
// WHY THIS IS COMMITTED AND NOT A THROWAWAY (P-DB6). It writes PUBLISHED content — the row ships the
// moment this runs, independent of git — so the script is the durable record of what was written and
// why. It PRINTS the ruling and the reasoning before applying, exactly as
// `tag-afm-narrative-skills.ts` does, so the justification lives with the write rather than only in a
// journal entry someone has to go and find.
//
// WHAT IT GUARANTEES:
//   P-DB3  a rollback snapshot of the WHOLE row is written BEFORE the update.
//   P-DB4  `professional_skill_tag` is the ONLY field that moves; every other field is asserted
//          byte-identical afterwards under key-order-insensitive canonicalisation (a raw stringify
//          reports phantom jsonb drift).
//   It refuses a no-op, refuses an unknown tag, and refuses if the row is not what the caller said.
//
// Usage:
//   npx tsx --env-file=.env.local scripts/authoring/retag-afm-drill.ts \
//     --id <uuid> --from <tag> --to <tag> [--apply]
import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { PROFESSIONAL_SKILLS } from '../afm-framework';

const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });

const arg = (f: string) => { const i = process.argv.indexOf(f); return i !== -1 ? process.argv[i + 1] : undefined; };
const APPLY = process.argv.includes('--apply');
const ID = arg('--id');
const FROM = arg('--from');
const TO = arg('--to');

/** The RULING this script exists to apply. Printed in full before any write. Keyed by drill id so a
 *  future reader sees which reasoning belongs to which row. */
const RULINGS: Record<string, string> = {
  '55181aa8-dcde-42cd-8c01-dbd0b392a734': `
RULING (Grant, 2026-08-02) — 55181aa8 E1a: commercial_acumen -> analysis_and_evaluation

THE VERB IS THE DISCRIMINATOR, NOT THE ARITHMETIC.

  * N5 does not engage on this rubric: neither requirement part nor any required_point carries
    verdict language, so the barrier itself classes it as having no verdict to commit to.
  * NO criterion carries F4. Fence-sitting is not penalised anywhere.
  * All four required_points open with the word "Discuss".
  => A candidate who discusses all four points and commits to nothing scores 8/8.

Commercial acumen's defining act — ACCA descriptor 2, "use judgement in PROPOSING AND RECOMMENDING
commercially viable solutions" — is therefore never required. What the rubric DOES demand
(investigating organisational implications; reflecting on how roles, authority and retention change)
is analysis_and_evaluation descriptors 2 and 3 almost verbatim.

THE SIBLING IS THE CONTROL. d0be009d is the same LO with the same tag and demands the opposite:
"Advise / Advise / Advise / COMMIT", with c4 carrying F4 and the CEO's income-or-cost test as a
stated hurdle. That is what a commercial_acumen rubric looks like on E1a.

CORRECTION RECORDED WITH THE RULING. The batch-1 pack and journal framed this row's problem as
partly "no priced decision - zero figure facts". That was WRONG, and d0be009d refutes it: it also
has zero figure facts and is a sound commercial_acumen drill. A commercial judgement can be
genuinely constrained without a number. The figures argument is not the discriminator and should not
have been leaned on.

WHAT IS NOT CLAIMED. N6 could not adjudicate this and did not - both rows fail it identically under
either tag. That is the claim ceiling behaving as documented: N6 measures LABELLING and the
scenario's OBJECT-SHAPE, neither of which distinguishes these two skills. The ruling is a reader's
judgement about the rubric, not a measurement.

THE COUNTER-CASE, RECORDED RATHER THAN SUPPRESSED. commercial_acumen descriptor 3 covers "wider
organisational matters", which c3/c4 squarely are; the golden GOOD does commit ("workable, but only
once..."); and the F7 generic-centralisation disqualifier is a commercial failure mode. Keeping the
tag was defensible - it is weaker only because the model answer's commitment is UNCREDITED by the
rubric.
`.trim(),
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

async function main(): Promise<number> {
  let problems = 0;
  const fail = (m: string) => { problems++; console.error(`  ✗ HARD STOP — ${m}`); };

  if (!ID || !FROM || !TO) { console.error('Usage: --id <uuid> --from <tag> --to <tag> [--apply]'); return 1; }
  if (!(TO in PROFESSIONAL_SKILLS)) { console.error(`unknown target tag "${TO}" — must be one of: ${Object.keys(PROFESSIONAL_SKILLS).join(', ')}`); return 1; }
  if (FROM === TO) { console.error('--from and --to are the same; refusing a no-op'); return 1; }

  const { data, error } = await s.from('acca_drills').select('*').eq('id', ID).single();
  if (error || !data) { console.error(`drill ${ID} not found: ${error?.message}`); return 1; }
  const before = data as unknown as Record<string, any>;

  console.log('═'.repeat(90));
  console.log(RULINGS[ID] ?? '(no recorded ruling for this id — refusing)');
  console.log('═'.repeat(90));
  if (!RULINGS[ID]) return 1;

  console.log(`\nTARGET: ${ID}`);
  console.log(`  lo_code=${before.lo_code} paper=${before.paper_code} marks=${before.marks_guide} mode=${before.mode}`);
  console.log(`  status=${before.status}/${before.published}`);
  console.log(`  professional_skill_tag: ${before.professional_skill_tag}  ->  ${TO}`);
  if (before.professional_skill_tag !== FROM) fail(`row's tag is "${before.professional_skill_tag}", caller said "${FROM}" — wrong target or already moved`);
  if (before.published === true) console.log(`  ⚠️  THIS ROW IS PUBLISHED — the change ships the moment it is written (P-DB2).`);
  if (problems) { console.error(`\n${problems} HARD STOP(S) — no write attempted.`); return problems; }

  // P-DB3 — snapshot the WHOLE row BEFORE the write.
  const snap = `docs/rollbacks/AFM_retag_${String(ID).slice(0, 8)}_20260802.json`;
  writeFileSync(snap, JSON.stringify({ ruling: RULINGS[ID], from: FROM, to: TO, row_before: before }, null, 2), 'utf8');
  console.log(`\nP-DB3 snapshot written: ${snap}`);

  if (!APPLY) { console.log('\n(dry run — pass --apply to write)'); return 0; }

  const { error: upErr } = await s.from('acca_drills').update({ professional_skill_tag: TO } as never).eq('id', ID);
  if (upErr) { console.error(`update failed: ${upErr.message}`); return 1; }
  console.log(`\n✓ written`);

  // P-DB4 — the tag is the ONLY field that moved.
  const { data: afterData } = await s.from('acca_drills').select('*').eq('id', ID).single();
  const after = afterData as unknown as Record<string, any>;
  const moved = Object.keys(before).filter((k) => canonical(before[k]) !== canonical(after[k]));
  console.log(`\nP-DB4 post-verify — fields that moved: [${moved.join(', ')}]`);
  if (after.professional_skill_tag !== TO) fail(`tag is "${after.professional_skill_tag}", expected "${TO}"`);
  if (moved.length !== 1 || moved[0] !== 'professional_skill_tag') fail(`expected exactly ONE moved field (professional_skill_tag); got [${moved.join(', ')}]`);
  else console.log(`  ✓ ${Object.keys(before).length - 1}/${Object.keys(before).length - 1} other fields byte-identical`);
  console.log(`  ✓ status/published unchanged: ${after.status}/${after.published}`);

  console.log(problems === 0 ? '\n✅ RE-TAG COMPLETE.' : `\n❌ ${problems} problem(s).`);
  return problems;
}

// P-G4 — set exitCode, never process.exit(), in a DB-touching script.
main().then((p) => { process.exitCode = p === 0 ? 0 : 1; }).catch((e) => { console.error(e); process.exitCode = 1; });
