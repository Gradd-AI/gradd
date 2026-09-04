// scripts/test-turn-pairing.ts
// Fixtures for lib/acca/turn-pairing.ts — which student message does a reply belong to.
// PURE — no env, no DB, no model, no clock. Run: npm run test:turn-pairing
//
// ── WHY THIS SUITE EXISTS ────────────────────────────────────────────────────
// The rule it guards mispaired the production corpus for its entire life and nothing caught
// it, because the rule lived inside a script that could not be imported without env and was
// therefore unreachable to any fixture. The defect was invisible rather than subtle:
// `redteam-judge.ts --prod-sample` sorted `acca_drill_messages` by `created_at` and scanned
// BACKWARDS for the nearest student row — but the tutor route writes both rows of a turn in
// ONE insert, so every pair shares an identical timestamp and a tie has no defined order.
//
// P-G3(a) BOTH DIRECTIONS, and the wrong implementation is PINNED. A suite that only proved
// "correct pairs are found" passes against a matcher that pairs everything with everything.

import { pairTurns, type RawMsg } from '../lib/acca/turn-pairing';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

const U = 'user-1', D = 'drill-1';
const row = (o: Partial<RawMsg> & { role: string }): RawMsg => ({
  user_id: U, drill_id: D, content: 'c', call_type: null, created_at: '2026-08-01T00:00:00.000Z', ...o,
});

console.log('\nturn-pairing — a reply belongs to ONE student message, and identity says which\n');

// ── THE SHIPPED SHAPE: both rows share a timestamp ───────────────────────────
console.log('  legacy era — timestamp identity');
{
  const t1 = '2026-08-01T00:00:00.000Z', t2 = '2026-08-01T00:05:00.000Z';
  const rows: RawMsg[] = [
    row({ role: 'user', content: 'Q1', created_at: t1 }),
    row({ role: 'assistant', content: 'A1', created_at: t1, call_type: 'hint' }),
    row({ role: 'user', content: 'Q2', created_at: t2 }),
    row({ role: 'assistant', content: 'A2', created_at: t2, call_type: 'teaching' }),
  ];
  const r = pairTurns(rows);
  ok('two turns pair into two', r.pairs.length === 2);
  ok('Q1 is matched to A1, not to A2',
    r.pairs.some((p) => p.text.includes('Q1') && p.text.includes('A1') && !p.text.includes('A2')));
  ok('Q2 is matched to A2', r.pairs.some((p) => p.text.includes('Q2') && p.text.includes('A2')));
  ok('no orphans, nothing malformed', r.orphanUser === 0 && r.orphanAssistant === 0 && r.malformed === 0);

  // ⚠️ ORDER-INDEPENDENCE IS THE WHOLE POINT. The assistant row is placed FIRST here, which is
  // exactly what the old backwards scan could not survive: it would attach A1 to nothing and
  // A2 to Q1. Reversing the input must not change a single pair.
  const reversed = pairTurns([...rows].reverse());
  ok('reversing the input changes nothing',
    JSON.stringify(reversed.pairs.map((p) => p.text).sort())
      === JSON.stringify(r.pairs.map((p) => p.text).sort()));

  // MUST-FAIL: the deleted sort-and-scan, transcribed, on the assistant-first ordering.
  const scan = [...rows].reverse();
  let mispaired = 0, found = 0;
  for (let i = 1; i < scan.length; i++) {
    const a = scan[i]; if (a.role !== 'assistant') continue;
    const prev = [...scan.slice(0, i)].reverse()
      .find((x) => x.role === 'user' && x.user_id === a.user_id && x.drill_id === a.drill_id);
    if (!prev) continue;
    found++;
    if (prev.created_at !== a.created_at) mispaired++;
  }
  ok('MUST-FAIL: the sort-and-scan mispairs this exact input', found > 0 && mispaired > 0,
    `found ${found}, mispaired ${mispaired}`);
}

// ── DIFFERENT USERS / DRILLS SHARING A TIMESTAMP MUST NOT CROSS ──────────────
{
  const t = '2026-08-01T00:00:00.000Z';
  const r = pairTurns([
    row({ role: 'user', content: 'QA', created_at: t, user_id: 'user-A' }),
    row({ role: 'assistant', content: 'AA', created_at: t, user_id: 'user-A' }),
    row({ role: 'user', content: 'QB', created_at: t, user_id: 'user-B' }),
    row({ role: 'assistant', content: 'AB', created_at: t, user_id: 'user-B' }),
  ]);
  ok('two students at the same instant stay separate', r.pairs.length === 2 && r.malformed === 0);
  ok("...and neither answer crosses to the other's question",
    r.pairs.every((p) => (p.text.includes('QA') && p.text.includes('AA'))
                      || (p.text.includes('QB') && p.text.includes('AB'))));

  const rd = pairTurns([
    row({ role: 'user', content: 'Q-d1', created_at: t, drill_id: 'd1' }),
    row({ role: 'assistant', content: 'A-d1', created_at: t, drill_id: 'd1' }),
    row({ role: 'user', content: 'Q-d2', created_at: t, drill_id: 'd2' }),
    row({ role: 'assistant', content: 'A-d2', created_at: t, drill_id: 'd2' }),
  ]);
  ok('two drills at the same instant stay separate', rd.pairs.length === 2 && rd.malformed === 0);

  // A null drill_id must not collapse every no-drill turn of one user into one group.
  const rn = pairTurns([
    row({ role: 'user', content: 'Qn', created_at: t, drill_id: null }),
    row({ role: 'assistant', content: 'An', created_at: t, drill_id: null }),
  ]);
  ok('a null drill_id still pairs', rn.pairs.length === 1 && rn.malformed === 0);
}

// ── THE FAILED TURN — reported, never silently dropped ───────────────────────
console.log('\n  orphans are findings, not skips');
{
  const r = pairTurns([
    row({ role: 'user', content: 'lost 400 words', created_at: '2026-08-01T00:00:00.000Z' }),
    row({ role: 'user', content: 'Q2', created_at: '2026-08-01T00:05:00.000Z' }),
    row({ role: 'assistant', content: 'A2', created_at: '2026-08-01T00:05:00.000Z' }),
  ]);
  ok('the unpaired student row is COUNTED as a failed turn', r.orphanUser === 1);
  ok('...and is not emitted as a pair', r.pairs.length === 1);
  ok('...and does not steal the next turn\'s reply',
    r.pairs[0].text.includes('Q2') && !r.pairs[0].text.includes('lost 400 words'));

  const ra = pairTurns([row({ role: 'assistant', content: 'orphan reply' })]);
  ok('an unpaired reply is counted separately', ra.orphanAssistant === 1 && ra.pairs.length === 0);

  const rm = pairTurns([
    row({ role: 'user', content: 'a' }), row({ role: 'user', content: 'b' }),
    row({ role: 'assistant', content: 'c' }),
  ]);
  ok('an ambiguous group is malformed, never guessed at', rm.malformed === 1 && rm.pairs.length === 0);
}

// ── THE POST-SPLIT ERA: turn_id wins, and it has to ──────────────────────────
console.log('\n  post-split era — turn_id');
{
  // The split writes the student's row BEFORE the model call, so the two rows no longer share
  // a timestamp. This is the case timestamp identity CANNOT handle, and the reason the
  // preference order is turn_id first rather than a nicety.
  const withId: RawMsg[] = [
    row({ role: 'user', content: 'Q', created_at: '2026-09-05T00:00:00.000Z', turn_id: 'turn-1' }),
    row({ role: 'assistant', content: 'A', created_at: '2026-09-05T00:00:09.000Z', turn_id: 'turn-1' }),
  ];
  const r = pairTurns(withId);
  ok('turn_id pairs rows whose timestamps differ', r.pairs.length === 1 && r.orphanUser === 0);

  const withoutId = withId.map(({ turn_id, ...rest }) => rest as RawMsg);
  ok('MUST-FAIL: without turn_id the same rows do NOT pair (the split destroys timestamp identity)',
    pairTurns(withoutId).pairs.length === 0 && pairTurns(withoutId).orphanUser === 1);

  // Mixed eras in one window — the real shape of the first run after the split ships.
  const mixed = pairTurns([
    ...withId,
    row({ role: 'user', content: 'legacyQ', created_at: '2026-08-01T00:00:00.000Z' }),
    row({ role: 'assistant', content: 'legacyA', created_at: '2026-08-01T00:00:00.000Z' }),
  ]);
  ok('a mixed-era window pairs both', mixed.pairs.length === 2 && mixed.orphanUser === 0);

  // A turn_id must never merge two turns, even if timestamps coincide.
  const distinct = pairTurns([
    row({ role: 'user', content: 'Q1', turn_id: 't1' }),
    row({ role: 'assistant', content: 'A1', turn_id: 't1' }),
    row({ role: 'user', content: 'Q2', turn_id: 't2' }),
    row({ role: 'assistant', content: 'A2', turn_id: 't2' }),
  ]);
  ok('two turn_ids at one timestamp stay two turns', distinct.pairs.length === 2 && distinct.malformed === 0);
}

// ── EMPTY ──
ok('no rows yields no pairs rather than throwing', pairTurns([]).pairs.length === 0);

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} turn-pairing: ${pass}/${pass + fail} checks\n`);
// P-G4: never process.exit() — let the runtime flush stdout first.
process.exitCode = fail === 0 ? 0 : 1;
