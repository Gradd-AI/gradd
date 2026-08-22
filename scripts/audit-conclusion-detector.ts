#!/usr/bin/env tsx
/**
 * audit-conclusion-detector.ts — READ-ONLY. CHANGES NOTHING.
 *
 * WOULD WIDENING `hasConclusion` BREAK THE EXISTING AFM CORPUS?
 *
 * `hasConclusion` (lib/acca/narrative-marker.ts) is a CLOSED PHRASE TABLE. It decides three
 * things at authoring time: N5 (the golden GOOD must commit), N4's F4 fold-in (the golden BAD
 * must NOT commit), and the generator's N4-pre raiseability check. It is not on any live
 * student-marking path — the narrative marker is authoring-time only in v1.
 *
 * ⚠️ THE ASYMMETRY THAT MAKES WIDENING RISKY. Widening helps the GOOD (more ways to commit are
 * recognised) and HURTS THE BAD: a golden BAD designed to fail on F4 must contain NO accepted
 * phrase. Every phrase added is a new way for an existing BAD to be judged as committing, which
 * would flip F4 from raiseable to unraiseable and fail a drill that is currently fine.
 *
 * So this measures the direction that can break things: for every published AFM narrative row,
 * does its golden BAD stay F4-raiseable under a widened detector?
 *
 * Usage: npx tsx --env-file=.env.local scripts/audit-conclusion-detector.ts
 */

import { createClient } from '@supabase/supabase-js';

/** Byte-identical copy of the live detector. Duplicated so this audit cannot alter it. */
const CURRENT = /\b(recommend|conclude|in conclusion|the board should|we advise|should proceed|should not proceed|should adopt|should reject|on balance)\b/i;

/**
 * A CANDIDATE widening, written for SBL's document register — first-person advice to a named
 * recipient, and commitment expressed without the AFM boardroom's stock phrases. NOT PROPOSED,
 * NOT APPLIED: it exists here only to measure the blast radius on AFM.
 */
const WIDENED = new RegExp([
  CURRENT.source.slice(2, -2),                 // everything the current table accepts
  'recommend\\w*', 'conclud\\w*', 'conclusion',
  'advise|advice',
  'my (assessment|view|judgement|judgment) is',
  'i (would|will) (not )?(advise|recommend|support|proceed)',
  'the (right|better|appropriate|preferred) (course|approach|style|option) (is|would be)',
  '(should|must) (be )?(adopt|reject|proceed|extend|require|commit|decline|approve|refuse)\\w*',
].join('|'), 'i');

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing env'); process.exit(1); }
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from('acca_drills')
    .select('id, lo_code, paper_code, model_answer, answer_schema')
    .eq('paper_code', 'AFM').eq('published', true).eq('status', 'approved');
  if (error) { console.error(error.message); process.exit(1); }

  const rows = (data ?? []).filter((r) => (r.answer_schema as { mode?: string } | null)?.mode === 'narrative');

  console.log('='.repeat(90));
  console.log('WOULD A WIDENED hasConclusion BREAK AFM? — read-only, nothing changed');
  console.log('='.repeat(90));
  console.log(`DENOMINATOR: ${rows.length} published AFM narrative rows.\n`);

  let goodOk = 0, badBreaks = 0, badMissing = 0;
  for (const r of rows) {
    const short = String(r.id).slice(0, 8);
    const schema = r.answer_schema as { _authoring?: { golden_bad?: string; designed_bad_flags?: string[] } } | null;
    const bad = schema?._authoring?.golden_bad;
    const flags = schema?._authoring?.designed_bad_flags ?? [];
    const good = String(r.model_answer ?? '');

    if (CURRENT.test(good)) goodOk++;

    if (!bad) { badMissing++; console.log(`${short} ${String(r.lo_code).padEnd(5)} golden BAD not recorded — cannot test`); continue; }
    const nowCommits = CURRENT.test(bad);
    const thenCommits = WIDENED.test(bad);
    const designedF4 = flags.includes('F4');
    const breaks = designedF4 && !nowCommits && thenCommits;
    if (breaks) badBreaks++;
    const hit = thenCommits ? (bad.match(WIDENED) || [''])[0] : '';
    console.log(`${short} ${String(r.lo_code).padEnd(5)} F4-designed=${designedF4 ? 'y' : 'n'}  BAD commits now=${nowCommits ? 'y' : 'n'} widened=${thenCommits ? 'y' : 'n'}  ${breaks ? '<-- WOULD BREAK  first-hit="' + hit + '"' : ''}`);
  }

  // The GOODs the detector does NOT accept. A GOOD that passes only because N5's `wantsVerdict`
  // never fired is not a passing GOOD — it is an unasked question. Print enough to judge whether
  // the answer commits in words the table lacks, or genuinely does not commit at all.
  console.log('\n' + '='.repeat(90));
  console.log('GOLDEN GOODs THE CURRENT DETECTOR DOES NOT ACCEPT');
  console.log('='.repeat(90));
  for (const r of rows) {
    const good = String(r.model_answer ?? '');
    if (CURRENT.test(good)) continue;
    const schema = r.answer_schema as { requirement_parts?: string[]; criteria?: { required_point: string }[] } | null;
    const parts = schema?.requirement_parts ?? [];
    // checkCommittedVerdict's own trigger, reproduced so the report says WHY the gate stayed quiet.
    const wantsVerdict = parts.some((p) => /recommend|advise|conclude|evaluate|assess|should/i.test(p))
      || (schema?.criteria ?? []).some((c) => /recommend|verdict|conclusion/i.test(c.required_point));
    console.log(`\n${String(r.id).slice(0, 8)}  ${r.lo_code}   N5 wantsVerdict = ${wantsVerdict}  ${wantsVerdict ? '<-- N5 DID fire and the GOOD still lacks an accepted phrase' : '<-- N5 never fired; the GOOD was never asked to commit'}`);
    console.log(`  requirement_parts: ${JSON.stringify(parts)}`);
    console.log(`  --- closing 420 chars of the golden GOOD ---`);
    console.log('  ' + good.slice(-420).replace(/\n/g, '\n  '));
  }

  console.log('\n' + '-'.repeat(90));
  console.log(`golden GOODs the CURRENT detector already accepts : ${goodOk}/${rows.length}`);
  console.log(`golden BADs that a WIDENED detector would BREAK   : ${badBreaks}/${rows.length}`);
  console.log(`rows whose golden BAD is not recorded            : ${badMissing}/${rows.length}`);
  console.log('-'.repeat(90));
  console.log('\nA "break" = the row designed its BAD to fail on F4, the BAD contains no phrase the');
  console.log('current table accepts, and the widened table would accept one — so F4 would stop being');
  console.log('raiseable and N4-pre would fail a drill that passes today.');
  console.log('\n⚠️ This tests ONE candidate widening. A different phrase set has a different blast');
  console.log('   radius. Nothing here proposes or applies a change.');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
