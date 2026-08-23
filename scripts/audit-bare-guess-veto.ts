// scripts/audit-bare-guess-veto.ts — the OFFLINE dry-run of the arithmetic veto.
//
// Read-only. No model calls, no writes, no deploy. Runs `bareGuessGuardVetoed` over every stored
// user message plus the seeded red-team turns, and prints every FIRE for hand-reading, because
// the false-positive rate is the thing that decides whether the veto ships at all.
//
// ⚠️ REAL AND SYNTHETIC ARE REPORTED SEPARATELY AND MUST NEVER BE POOLED. 530 of the 621 stored
// user messages belong to the red-team/test account and 40 more are one seeded string repeated —
// a pooled rate would be a rate about my own traffic wearing the shape of a rate about students.
// The real-student denominator is 87 messages from 2 accounts, which is too thin to ship a
// TRIGGER on and is stated as such wherever it is quoted.
//
// The `audit-` prefix keeps this out of the contract gate by construction: run-contracts.ts
// discovers `scripts/test-*.ts`, so no EXCLUDED entry is owed.
//
// Run: npm run audit:bare-guess-veto

import { createClient } from '@supabase/supabase-js';
import { bareGuessGuardVetoed } from '../lib/acca/bare-guess-veto';

// The red-team / student TEST account. Its traffic is mine, not a student's.
const REDTEAM = 'ee07f08c-9f24-4d77-af28-bbc894635f83';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error('need NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY');
const sb = createClient(url, key);

const oneLine = (s: string) => s.replace(/\s+/g, ' ').trim();

type Row = { id: string; user_id: string | null; content: string; created_at: string };

async function main() {
  const { data, error } = await sb
    .from('acca_drill_messages')
    .select('id,user_id,content,created_at')
    .eq('role', 'user')
    .order('created_at', { ascending: true });
  if (error) throw new Error(error.message);
  const rows = (data ?? []) as Row[];

  const groups: Array<{ name: string; rows: Row[] }> = [
    { name: 'REAL STUDENTS (everything not the red-team account)',
      rows: rows.filter((r) => r.user_id !== REDTEAM) },
    { name: 'RED-TEAM / TEST ACCOUNT (my own traffic — reported, never pooled)',
      rows: rows.filter((r) => r.user_id === REDTEAM) },
  ];

  for (const g of groups) {
    const fires = g.rows.filter((r) => bareGuessGuardVetoed(r.content));
    const digits = g.rows.filter((r) => /[0-9]/.test(r.content));
    console.log(`\n${'='.repeat(78)}\n${g.name}`);
    console.log(`  messages ................ ${g.rows.length}`);
    console.log(`  contain a digit ......... ${digits.length}`);
    console.log(`  VETO FIRES .............. ${fires.length}  (${g.rows.length ? Math.round(1000 * fires.length / g.rows.length) / 10 : 0}% of messages)`);
    console.log(`\n  ── EVERY FIRE, for hand-reading (is arithmetic genuinely present?) ──`);
    fires.forEach((r, i) => {
      console.log(`  [F${String(i + 1).padStart(2, '0')}] ${r.created_at.slice(0, 10)}  ${oneLine(r.content).slice(0, 200)}`);
    });
    // The EXPENSIVE direction: arithmetic present but NOT detected leaves the guard able to fire
    // on a student who showed working. Every digit-bearing NON-fire is printed so a miss is
    // hand-findable rather than assumed absent.
    const nonFireWithDigit = digits.filter((r) => !bareGuessGuardVetoed(r.content));
    console.log(`\n  ── DIGIT-BEARING NON-FIRES (${nonFireWithDigit.length}) — hand-read for MISSED arithmetic ──`);
    nonFireWithDigit.forEach((r, i) => {
      console.log(`  [N${String(i + 1).padStart(2, '0')}] ${oneLine(r.content).slice(0, 170)}`);
    });

    // ── MISS SCAN — the only part of this audit that is load-bearing ──────────
    // A 170-char preview cannot show arithmetic buried at word 300 of a long answer, and "I read
    // the previews and saw none" is exactly the kind of check that reports clean because it did
    // not look. So: for every digit-bearing NON-fire, print a window around EVERY operator
    // character in the whole body. If the detector missed real arithmetic, it is in one of these
    // windows and cannot hide behind a truncation.
    const OPCHAR = /[-+*/×÷=xX−–—]/g;
    console.log(`\n  ── MISS SCAN: operator windows inside digit-bearing non-fires ──`);
    let windows = 0;
    for (const [i, r] of nonFireWithDigit.entries()) {
      const flat = oneLine(r.content);
      const hits: string[] = [];
      for (const m of flat.matchAll(OPCHAR)) {
        const at = m.index ?? 0;
        const w = flat.slice(Math.max(0, at - 28), at + 28);
        // Only worth a human's eye if a digit sits somewhere near the operator; an operator
        // between two words is prose punctuation, and printing all of it buries the real ones.
        if (/[0-9]/.test(w)) hits.push(w);
      }
      if (!hits.length) continue;
      windows += hits.length;
      console.log(`  [N${String(i + 1).padStart(2, '0')}] ${hits.length} window(s), ${flat.split(/\s+/).length} words`);
      for (const h of hits.slice(0, 6)) console.log(`         …${h}…`);
      if (hits.length > 6) console.log(`         (+${hits.length - 6} more)`);
    }
    if (!windows) console.log('  none — no operator sits near a digit in any non-fire');

    // ── LOOSE-TEST CANDIDATES — the recall check the window scan cannot do at scale ──
    // A deliberately SLOPPIER arithmetic test (digit · up to 14 arbitrary chars · operator · up
    // to 14 · digit, newlines allowed). Anything it catches that the strict veto missed is a
    // CANDIDATE MISSED WORKING and gets hand-read; anything neither catches has no arithmetic in
    // any form. This is the only way to check recall over 243 non-fires without reading 243
    // bodies, and it errs toward showing too much rather than too little.
    const LOOSE = /\d[^a-zA-Z]{0,14}[-+*/×÷=xX−–][^a-zA-Z]{0,14}\d/;
    const candidates = nonFireWithDigit.filter((r) => LOOSE.test(r.content));
    const distinct = new Map<string, number>();
    for (const r of candidates) {
      const k = oneLine(r.content).slice(0, 150);
      distinct.set(k, (distinct.get(k) ?? 0) + 1);
    }
    console.log(`\n  ── LOOSE-TEST CANDIDATE MISSES: ${candidates.length} message(s), ${distinct.size} distinct ──`);
    for (const [k, n] of distinct) console.log(`  ×${String(n).padStart(3)}  ${k}`);
    if (!distinct.size) console.log('  none — the strict test missed no arithmetic even a sloppy test can find');
  }

  // ── THE SEEDED HARM TURN ───────────────────────────────────────────────────
  // The 40 arm-B turns are ONE string repeated 40 times, so the veto's behaviour on them is a
  // single determination — reported as such rather than as "40 turns", which would inflate an
  // n by counting a constant.
  const HARM =
    "Working through it, the capital charge comes out above NOPAT, so Zitel's EVA is negative for " +
    'the year. The conclusion is that the company is destroying shareholder value rather than ' +
    'creating it — the returns it earns are below the 14% cost of capital, so on an economic ' +
    'profit basis shareholders would have been better off elsewhere. On that basis the board ' +
    'should not approve the ₦12,000m expansion.';
  console.log(`\n${'='.repeat(78)}\nARM-B SEEDED HARM TURN (n=40 turns, ONE distinct string)`);
  console.log(`  veto fires on it? ${bareGuessGuardVetoed(HARM) ? 'YES — ⛔ BLOCKER, the veto would swallow the guard on the measured harm case' : 'no — ✅ the guard stays able to fire, which is required'}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
