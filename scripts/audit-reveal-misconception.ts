#!/usr/bin/env tsx
/**
 * audit-reveal-misconception.ts — READ-ONLY.
 *
 * DOES THE TEACHING LEG NAME THE FAILURE THE RUBRIC PENALISES?
 *
 * Opened by a measured collapse in SBL batch A (2026-08-19): 5 of 5 reveals headlined
 * "undeveloped points" — the first entry in the authoring persona's catalogue — when only ONE
 * drill was designed to teach it. The same pass-2 prompt authored AFM's published narrative
 * reveals, so this asks whether the same collapse is already sitting in live content.
 *
 * ⚠️ WHAT THIS CAN AND CANNOT SAY. `full_reveal` is prose; whether it "names the designed mode"
 * is a reading, not a shape. So this reports THREE things and keeps them separate:
 *   (a) the headline phrase extracted by the LIVE mechanism (`MISCONCEPTION_PATTERN`, copied
 *       byte-identically from validate-afm-prose.ts) — deterministic;
 *   (b) which F-codes the row's OWN rubric names as disqualifiers — deterministic;
 *   (c) whether the headline's vocabulary overlaps the designed mode's — A KEYWORD PROXY, and
 *       therefore reportable as a lower bound on agreement, never as a verdict on a given row.
 * (c) is a phrase table. It is used here because this is an AUDIT that a human then reads, not
 * a gate that decides anything — the ban in narrative-marker.ts is on gates, and the distinction
 * is the whole reason it is safe here.
 *
 * DENOMINATOR IS DECLARED AND PRINTED. Rows counted: paper_code='AFM', published=true,
 * status='approved', and `answer_schema->>'mode' = 'narrative'` — the narrative pipeline's own
 * marker, not `mode='discursive'`, which also matches pre-pipeline discursive drills that never
 * had a designed failure mode and could not be judged against one.
 *
 * Out of the contract gate by construction: the `audit-` prefix misses run-contracts.ts's
 * `test-*.ts` discovery, so no EXCLUDED entry is owed.
 *
 * Usage: npx tsx --env-file=.env.local scripts/audit-reveal-misconception.ts
 */

import { createClient } from '@supabase/supabase-js';

// Byte-identical copy of validate-afm-prose.ts's MISCONCEPTION_PATTERN, which is itself a copy of
// the live extractMisconceptionLead regex. Duplicated deliberately: this audit must not be able
// to alter the live path, and must fail the same way it does.
const MISCONCEPTION_PATTERN = /^.*?misconception[^:]*:/i;

/** Vocabulary a reveal would plausibly use for each designed mode. PROXY — see the header. */
const MODE_VOCAB: Record<string, RegExp> = {
  F1: /\b(copy|copied|copying|paste|verbatim|restat|reproduc|lift(ed|ing)?)\b/i,
  F2: /\b(undevelop|not develop|develop(ing|ment)?|identif\w+ and (then )?(stop|left)|one mark)\b/i,
  F4: /\b(fence|commit|committ|verdict|recommend|conclu|sit(s|ting)? on the fence|hedg)\b/i,
  F5: /\b(generic|unapplied|not applied|abstract|textbook|any organisation|scenario-free)\b/i,
  F6: /\b(superficial|state[sd]? the figure|figure-commentary)\b/i,
  F7: /\b(adjacent|wrong question|not the task|question asked|drift|reach(ed|ing)? for)\b/i,
  F9: /\b(own figure|given figures|not us\w+ the (figures|numbers))\b/i,
  F10: /\b(sceptic|challenge|challeng\w+|commercial acumen|accept\w* without)\b/i,
  F11: /\b(breadth|balance|no conclusion|one point)\b/i,
};

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) { console.error('Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY'); process.exit(1); }
  const db = createClient(url, key, { auth: { persistSession: false } });

  const { data, error } = await db
    .from('acca_drills')
    .select('id, lo_code, paper_code, professional_skill_tag, status, published, full_reveal, answer_schema')
    .eq('paper_code', 'AFM')
    .eq('published', true)
    .eq('status', 'approved');
  if (error) { console.error('query failed:', error.message); process.exit(1); }

  const all = data ?? [];
  const narrative = all.filter((r) => {
    const s = r.answer_schema as { mode?: string } | null;
    return s?.mode === 'narrative';
  });

  console.log('='.repeat(88));
  console.log('AFM PUBLISHED NARRATIVE REVEALS — does the headline name the designed mode?');
  console.log('='.repeat(88));
  console.log(`DENOMINATOR: ${narrative.length} rows.`);
  console.log(`  from ${all.length} AFM rows with published=true AND status='approved',`);
  console.log(`  filtered to answer_schema->>'mode' = 'narrative' (the narrative pipeline's own marker).`);
  console.log(`  ${all.length - narrative.length} published AFM rows are NOT narrative and are excluded —`);
  console.log(`  they are calculator drills with no designed failure mode to be judged against.\n`);

  let extractable = 0, noHeadline = 0;
  const rows: { id: string; lo: string; headline: string; modes: string[]; match: string[]; }[] = [];

  for (const r of narrative) {
    const fr = String(r.full_reveal ?? '');
    const m = fr.match(MISCONCEPTION_PATTERN);
    if (!m) { noHeadline++; }
    else { extractable++; }
    const headline = m ? m[0].replace(/\s+/g, ' ').trim() : '(NO "misconception…:" SENTENCE — live tutor falls back to the first sentence)';

    const schema = r.answer_schema as { criteria?: { disqualifiers?: string[] }[]; _authoring?: { designed_bad_flags?: string[] } } | null;
    // The row's DESIGNED modes: the golden BAD's flags where recorded, else the union of the
    // rubric's disqualifiers. Both are the row's own record of what it penalises.
    const designed = schema?._authoring?.designed_bad_flags?.length
      ? schema._authoring.designed_bad_flags
      : Array.from(new Set((schema?.criteria ?? []).flatMap((c) => c.disqualifiers ?? [])));

    const matched = designed.filter((f) => MODE_VOCAB[f]?.test(headline));
    rows.push({ id: String(r.id).slice(0, 8), lo: String(r.lo_code), headline, modes: designed, match: matched });
  }

  for (const r of rows) {
    console.log(`${r.id}  ${r.lo.padEnd(5)}  designed=[${r.modes.join(',')}]  headline-matches=[${r.match.join(',') || 'NONE'}]`);
    console.log(`          ${r.headline.slice(0, 150)}`);
  }

  // --detail <id,id,…> — the full record for named rows, so a human can judge whether the REVEAL
  // is wrong or the FLAGS are incomplete. Those are different defects with different fixes, and
  // no count above can tell them apart.
  const detailArg = process.argv.indexOf('--detail');
  if (detailArg !== -1 && process.argv[detailArg + 1]) {
    const want = process.argv[detailArg + 1].split(',').map((x) => x.trim());
    for (const r of narrative) {
      const short = String(r.id).slice(0, 8);
      if (!want.includes(short)) continue;
      const schema = r.answer_schema as {
        total_marks?: number;
        criteria?: { id: string; marks: number; disqualifiers?: string[]; development_required?: boolean; required_point: string }[];
        _authoring?: { designed_bad_flags?: string[]; golden_bad?: string };
      } | null;
      const crits = schema?.criteria ?? [];
      console.log('');
      console.log('='.repeat(88));
      console.log(`${short}  ${r.lo_code}  skill=${r.professional_skill_tag}  total=${schema?.total_marks}`);
      console.log('='.repeat(88));
      console.log('DESIGNED BAD FLAGS : ' + JSON.stringify(schema?._authoring?.designed_bad_flags ?? null));
      console.log('DISQUALIFIER UNION : ' + JSON.stringify(Array.from(new Set(crits.flatMap((c) => c.disqualifiers ?? [])))));
      console.log('F3 ON A CRITERION  : ' + (crits.some((c) => (c.disqualifiers ?? []).includes('F3')) ? 'YES' : 'NO'));
      console.log('');
      console.log('HEADLINE (verbatim, exactly as the live tutor extracts it):');
      console.log('  ' + (String(r.full_reveal).match(MISCONCEPTION_PATTERN) || ['(none)'])[0]);
      console.log('');
      console.log('CRITERIA:');
      for (const c of crits) {
        console.log(`  ${c.id} · ${c.marks}m · disq=[${(c.disqualifiers ?? []).join(',')}] · dev=${c.development_required}`);
        console.log(`     ${c.required_point}`);
      }
      console.log('');
      console.log('FULL_REVEAL (verbatim):');
      console.log(String(r.full_reveal));
      console.log('');
      console.log('GOLDEN BAD (what this drill actually penalises):');
      console.log(schema?._authoring?.golden_bad ? String(schema._authoring.golden_bad) : '(not recorded on this row)');
    }
    return;
  }

  const agree = rows.filter((r) => r.match.length > 0).length;
  const disagree = rows.filter((r) => r.match.length === 0 && !r.headline.startsWith('(NO')).length;

  console.log('\n' + '-'.repeat(88));
  console.log(`headline extractable by the live mechanism : ${extractable}/${narrative.length}`);
  console.log(`NO headline at all (live fallback path)     : ${noHeadline}/${narrative.length}`);
  console.log(`headline vocabulary overlaps a designed mode: ${agree}/${narrative.length}   <-- LOWER BOUND (proxy)`);
  console.log(`headline overlaps NONE of its designed modes: ${disagree}/${narrative.length}   <-- candidates for review`);
  console.log('-'.repeat(88));
  console.log('\n⚠️ The overlap figure is a KEYWORD PROXY and a LOWER BOUND. A reveal can name its');
  console.log('   designed failure in words this table does not carry. Every row above must be read');
  console.log('   before any of it is treated as a defect. Nothing here was changed.');
}

main().catch((e) => { console.error('Fatal:', e); process.exit(1); });
