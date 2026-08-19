#!/usr/bin/env tsx
/**
 * rewrite-afm-reveal.ts — REWRITES THE TEACHING LEG OF A PUBLISHED DRILL. P-DB2/3/4/6.
 *
 * ⚠️ THIS WRITES PUBLISHED CONTENT. It reaches students the moment it runs, independent of git.
 * Per P-DB6 the script therefore carries the RULING as a literal and PRINTS it before applying;
 * an `--id` with no recorded ruling is REFUSED. There is no generic "rewrite any reveal" mode.
 *
 * WHY THIS EXISTS. `--narrative-update-from` refuses published rows by design, and
 * `--narrative-revise-reveal-from` operates on captured drafts, not on live rows. Neither can
 * touch a published drill — correctly. This is the narrow, ruled exception.
 *
 * WHAT IT CHANGES: `hint` and `full_reveal` only. P-DB4 asserts every other column is
 * byte-identical, including `status`, `published`, `answer_schema` and `model_answer`. A run that
 * would move anything else aborts before the write.
 *
 * THE DEFECT BEING FIXED (measured 2026-08-19, scripts/audit-reveal-misconception.ts):
 * three published AFM narrative rows headline UNDEVELOPED-ASSUMPTION (F3), a mode that appears on
 * NO criterion of any of them. The live tutor extracts that sentence via
 * `extractMisconceptionLead` and broadcasts it as the drill's failure mode, so a student is told
 * to fix something their answer was never marked on.
 *
 * Usage: npx tsx --env-file=.env.local scripts/authoring/rewrite-afm-reveal.ts --id <8-char> [--apply]
 * Without --apply it is a DRY RUN: it generates, gates and diffs, and writes nothing.
 */

import { createClient } from '@supabase/supabase-js';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import Anthropic from '@anthropic-ai/sdk';
import { draftReveal, FAILURE_MODE_TEACHING, type RevealInput } from '../generate-acca-drills';
import { lintJurisdiction, lintFrozenMarketFacts, lintMisconceptionLead } from '../../lib/acca/validate-afm-prose';

/**
 * THE RULING, per row. Grant-ruled 2026-08-19. An id absent from this table is refused — the
 * point of P-DB6 is that a published write cannot be performed on an id nobody authorised.
 *
 * `target` is the F-code the row's OWN rubric penalises, verified against its criteria before
 * this table was written. `why` is the reason the current headline is wrong, in one line.
 */
const RULINGS: Record<string, { lo: string; target: string; teaches: string; why: string }> = {
  f6426c06: {
    lo: 'B1b', target: 'F6',
    teaches:
      'superficial commentary on a given output — reading what the simulation reports and stopping '
      + 'there, without explaining the mechanism that makes each stated flaw corrupt THIS output and '
      + 'therefore this decision',
    why: 'headlines UNDEVELOPED-ASSUMPTION (F3), which is on no criterion. F6 is on 4 of its 5 '
       + 'criteria and is what the reveal already teaches — naming a flaw without explaining why it '
       + 'corrupts this output. A label defect: the teaching is on-rubric, the name is not.',
  },
  d413fbe7: {
    lo: 'B4d', target: 'F6',
    teaches:
      'superficial commentary on a given model — naming the structure and its inputs and stopping '
      + 'there, without explaining the causal logic that makes the analogy hold or what it implies '
      + 'for the credit decision in front of the syndicate',
    why: 'same shape — headlines F3, which is absent; F6 is on all five substantive criteria and is '
       + 'the failure the reveal describes (naming the structure without the causal logic).',
  },
  de0c2676: {
    lo: 'E3a', target: 'F10',
    // F10's generic map text ("never performing the skill") is NOT usable here: it names two
    // skills, and a dry run against it produced a reveal headlining FENCE-SITTING — the same
    // ambiguity that defeated SBL-A4. Stated explicitly, as `designed_bad.teaches` does.
    teaches:
      "accepting a named officer's claim without testing it — describing how the hedging technique "
      + "works instead of challenging whether the treasurer's specific assertions survive the "
      + "scenario's own facts",
    why: 'THE ONE THAT GENUINELY MISDIRECTS. All five criteria are scepticism (F10 on four of them) — '
       + "challenging the treasurer's 'fixed' and 'eliminated' claims, the undisclosed unhedged slice, "
       + 'the covenant he omitted. Headlining "undeveloped assumption" tells a student they failed to '
       + 'develop when their actual failure was accepting a named officer\'s claim unchallenged.',
  },
};

const IMMUTABLE = [
  'id', 'exam_board', 'paper_code', 'lo_code', 'topic', 'command_verb', 'intellectual_level',
  'professional_skill_tag', 'calculation_required', 'mode', 'marks_guide', 'question',
  'context_text', 'model_answer', 'answer_schema', 'status', 'published',
] as const;

async function main() {
  const argv = process.argv.slice(2);
  const idArg = argv[argv.indexOf('--id') + 1];
  const apply = argv.includes('--apply');
  if (!idArg || idArg.startsWith('--')) { console.error('Usage: --id <8-char id> [--apply]'); process.exit(1); }

  const ruling = RULINGS[idArg];
  if (!ruling) {
    console.error(`REFUSED: no recorded ruling for id "${idArg}".`);
    console.error(`This script writes PUBLISHED content and will not act on an unauthorised row.`);
    console.error(`Recorded ids: ${Object.keys(RULINGS).join(', ')}`);
    process.exit(1);
  }

  console.log('='.repeat(90));
  console.log(`RULING ON RECORD for ${idArg} (${ruling.lo}) — Grant, 2026-08-19`);
  console.log(`  re-headline the reveal to: ${ruling.target}`);
  console.log(`  ${ruling.teaches}`);
  console.log(`  WHY: ${ruling.why}`);
  console.log('='.repeat(90));

  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } });
  // `id` is uuid, so no LIKE. Fetch the paper's rows and resolve the 8-char prefix in JS —
  // and REFUSE on anything other than exactly one match, so a prefix collision cannot
  // silently write to the wrong published row.
  const { data: rows, error } = await db.from('acca_drills').select('*').eq('paper_code', 'AFM');
  if (error) { console.error(error.message); process.exit(1); }
  const matches = (rows ?? []).filter((r) => String(r.id).startsWith(idArg));
  if (matches.length !== 1) { console.error(`expected exactly 1 AFM row with id prefix ${idArg}, got ${matches.length}`); process.exit(1); }
  const before = matches[0] as Record<string, unknown>;

  if (before.published !== true) { console.error('REFUSED: row is not published — use the draft path'); process.exit(1); }
  if (before.paper_code !== 'AFM') { console.error(`REFUSED: paper_code is ${before.paper_code}, not AFM`); process.exit(1); }

  // P-DB3 — snapshot the WHOLE row before anything is generated, let alone written.
  const snapPath = join(__dirname, '..', '..', 'docs', 'rollbacks', `AFM_reveal_rewrite_${idArg}.json`);
  writeFileSync(snapPath, JSON.stringify({ ruling, captured_for: 'P-DB3 pre-write snapshot', row: before }, null, 2), 'utf8');
  console.log(`\nP-DB3 snapshot written: ${snapPath}`);

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  const spec: RevealInput = {
    lo_code: String(before.lo_code),
    topic: String(before.topic),
    command_verb: String(before.command_verb),
    intellectual_level: Number(before.intellectual_level) as 2 | 3,
    mode: String(before.mode),
    designed_failure: ruling.teaches,
  };

  let reveal: { hint: string; full_reveal: string } | null = null;
  for (let attempt = 1; attempt <= 3; attempt++) {
    let cand: { hint: string; full_reveal: string };
    try { cand = await draftReveal(anthropic, 'AFM', spec, String(before.question), String(before.model_answer)); }
    catch (e) { console.warn(`  ↻ attempt ${attempt}: ${(e as Error).message}`); continue; }
    const issues = [
      ...lintJurisdiction({ hint: cand.hint, full_reveal: cand.full_reveal }, { context: String(before.context_text) }),
      ...lintFrozenMarketFacts({ hint: cand.hint, full_reveal: cand.full_reveal }),
      ...lintMisconceptionLead(cand.full_reveal),
    ];
    // The whole point of the rewrite: the headline must stop naming F3. Verified, not assumed.
    const headline = (cand.full_reveal.match(/^.*?misconception[^:]*:/i) ?? [''])[0];
    const stillF3 = /undeveloped[- ]assumption/i.test(headline);
    // ⚠️ P7 only checks that a "…misconception…:" sentence EXISTS. It does not check that the
    // EXTRACTED span is a lead. `.` does not match newlines but does match everything else, so a
    // reveal that first says "misconception" in its third sentence yields a 100-word blob — and
    // that blob is what the live tutor broadcasts. A dry run produced exactly that. Cap it.
    const blob = headline.length > 220;
    if (issues.length || stillF3 || blob) {
      for (const i of issues) console.warn(`  ↻ attempt ${attempt} gate [${i.field}]: ${i.message.slice(0, 110)}`);
      if (stillF3) console.warn(`  ↻ attempt ${attempt}: headline still names UNDEVELOPED-ASSUMPTION`);
      if (blob) console.warn(`  ↻ attempt ${attempt}: extracted headline is ${headline.length} chars — the tutor would broadcast a paragraph, not a lead`);
      continue;
    }
    reveal = cand; break;
  }
  if (!reveal) { console.error('✗ no gate-clean reveal after 3 attempts — NOTHING WRITTEN'); process.exit(1); }

  console.log('\n--- OLD headline ---\n  ' + (String(before.full_reveal).match(/^.*?misconception[^:]*:/i) ?? ['(none)'])[0]);
  console.log('\n--- NEW headline ---\n  ' + (reveal.full_reveal.match(/^.*?misconception[^:]*:/i) ?? ['(none)'])[0]);
  console.log('\n--- NEW hint ---\n' + reveal.hint);
  console.log('\n--- NEW full_reveal ---\n' + reveal.full_reveal);

  if (!apply) { console.log('\n(DRY RUN — pass --apply to write. Nothing has changed.)'); return; }

  console.log(`\nTHE WRITE:\n  update acca_drills set hint = <new>, full_reveal = <new> where id = '${String(before.id)}';`);
  const { error: upErr } = await db.from('acca_drills')
    .update({ hint: reveal.hint, full_reveal: reveal.full_reveal })
    .eq('id', String(before.id))
    .eq('published', true);            // guarded: the row must still be the published row we read
  if (upErr) { console.error('UPDATE FAILED:', upErr.message); process.exit(1); }

  // P-DB4 — read back and assert ONLY the two teaching fields moved.
  const { data: afterRows } = await db.from('acca_drills').select('*').eq('id', String(before.id));
  const after = (afterRows ?? [])[0] as Record<string, unknown>;
  const moved: string[] = [];
  for (const f of IMMUTABLE) {
    if (JSON.stringify(before[f]) !== JSON.stringify(after[f])) moved.push(f);
  }
  console.log(`\nP-DB4: ${IMMUTABLE.length}/${IMMUTABLE.length} immutable fields byte-identical: ${moved.length === 0 ? 'YES' : 'NO — MOVED: ' + moved.join(', ')}`);
  console.log(`       hint changed:        ${String(before.hint) !== String(after.hint)}`);
  console.log(`       full_reveal changed: ${String(before.full_reveal) !== String(after.full_reveal)}`);
  if (moved.length) { console.error('⚠️ UNEXPECTED FIELD MOVEMENT — restore from the snapshot above.'); process.exit(1); }
  console.log(`\n✓ ${idArg} reveal re-headlined to ${ruling.target}. status/published untouched.`);
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
