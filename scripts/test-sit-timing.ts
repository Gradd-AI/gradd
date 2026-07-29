// scripts/test-sit-timing.ts
// Per-requirement SIT TIMING integrity. Read-only against the DB; writes nothing.
//   npm run test:sit-timing              — check the live AFM Mock 1 sit data
//   npm run test:sit-timing -- --selftest — prove the failure path fires (P-G3)
//
// ── WHAT IT GUARDS ───────────────────────────────────────────────────────────
// `submitted_at` is the ONLY column sit timing may be derived from.
//   • created_at is a DB DEFAULT — it lands when the ROW was inserted. A practice turn on the
//     same requirement inserts it early with a NULL final_answer, and the later sit submit
//     updates that row, so created_at can point at the practice turn rather than the
//     submission. THE SELFTEST PINS EXACTLY THIS CASE.
//   • updated_at is rewritten by the marking pass (app/api/acca/case/mark), so after marking
//     it is the marking time on every requirement.
// If anything ever derives an interval from either column, case 6 below fails.
//
// ── P-G1 / P-G2 / P-G3 ───────────────────────────────────────────────────────
// P-G1: a paper that has not been sat is reported NOT EVALUATED, distinguishably — never as
//       a pass. An unsat paper is a legitimate state, so it does not fail the run; it just
//       must never be mistaken for "timing verified".
// P-G2: the population (rows read, attempt found) is declared before any result.
// P-G3: the assertion logic is a PURE function and --selftest drives it over synthetic break
//       modes, so the failure branch is executed rather than assumed.

import { createClient } from '@supabase/supabase-js';
import { AFM_MOCK_PAPER_1 } from '../lib/acca/sit-preview';

const PAPER = AFM_MOCK_PAPER_1;

export interface TimedRow {
  case_id: string;
  requirement_id: string;
  paper_order: number;              // position in the paper, 1-based
  label: string | null;
  final_answer: string | null;
  submitted_at: string | null;      // THE record
  created_at: string | null;        // present ONLY so the selftest can prove it is ignored
}
export interface TimedAttempt {
  started_at: string | null;
  completed_at: string | null;
  completed: boolean | null;
}
export interface Interval { paper_order: number; label: string | null; minutes: number }

const ms = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const n = Date.parse(t);
  return Number.isFinite(n) ? n : null;
};

/**
 * PURE. Intervals from `submitted_at` ONLY — requirement 1 from the attempt start, each later
 * one from the previous SUBMISSION. Returns null when the inputs cannot support a derivation.
 */
export function deriveIntervals(rows: TimedRow[], attempt: TimedAttempt): Interval[] | null {
  const start = ms(attempt.started_at);
  if (start === null || rows.length === 0) return null;
  const ordered = [...rows].sort((a, b) => a.paper_order - b.paper_order);
  const out: Interval[] = [];
  let prev = start;
  for (const r of ordered) {
    const at = ms(r.submitted_at);
    if (at === null) return null;
    out.push({ paper_order: r.paper_order, label: r.label, minutes: (at - prev) / 60000 });
    prev = at;
  }
  return out;
}

/** PURE. Returns the number of failed checks; `emit` receives every line. */
export function evaluate(
  rows: TimedRow[],
  attempt: TimedAttempt,
  expectedRows: number,
  emit: (line: string) => void,
): number {
  let failures = 0;
  const ok = (name: string, cond: boolean, detail = '') => {
    if (!cond) failures++;
    emit(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
  };

  ok(`all ${expectedRows} submitted requirements present (a short read is a failure)`,
    rows.length === expectedRows, `got ${rows.length}`);
  ok('the attempt has a started_at', ms(attempt.started_at) !== null, String(attempt.started_at));

  const ordered = [...rows].sort((a, b) => a.paper_order - b.paper_order);

  for (const r of ordered) {
    const tag = `#${r.paper_order} ${r.label ?? r.requirement_id.slice(0, 8)}`;
    ok(`${tag} :: submitted_at is set`, ms(r.submitted_at) !== null,
      r.submitted_at === null ? 'NULL — this requirement has no timing record' : String(r.submitted_at));
    ok(`${tag} :: a submitted row has an answer recorded`, r.final_answer !== null);
  }

  // Monotonic: the sit is forward-only and immutable, so submissions occur in paper order.
  const stamps = ordered.map((r) => ms(r.submitted_at));
  const startMs = ms(attempt.started_at);
  if (startMs !== null && stamps.every((s) => s !== null)) {
    ok('every submission is at or after the attempt started',
      stamps.every((s) => (s as number) >= startMs),
      stamps.filter((s) => (s as number) < startMs).length + ' before start');
    let mono = true;
    for (let i = 1; i < stamps.length; i++) if ((stamps[i] as number) < (stamps[i - 1] as number)) mono = false;
    ok('submissions are non-decreasing in paper order (forward-only sit)', mono);
  }

  const intervals = deriveIntervals(ordered, attempt);
  ok('intervals are derivable from submitted_at alone', intervals !== null);
  if (intervals) {
    ok('every interval is non-negative', intervals.every((i) => i.minutes >= 0),
      intervals.filter((i) => i.minutes < 0).map((i) => `#${i.paper_order} ${i.minutes.toFixed(1)}m`).join(', '));

    // THE COLUMN-SOURCE PIN. If created_at disagrees with submitted_at on any row — which is
    // exactly what a practice turn before the sit produces — a derivation that used created_at
    // would give DIFFERENT intervals. Assert the two disagree there, so a regression that
    // switched columns cannot pass this suite.
    const divergent = ordered.filter((r) => ms(r.created_at) !== null && ms(r.created_at) !== ms(r.submitted_at));
    if (divergent.length > 0) {
      const viaCreated = deriveIntervals(
        ordered.map((r) => ({ ...r, submitted_at: r.created_at })), attempt);
      const differs = viaCreated !== null &&
        JSON.stringify(viaCreated.map((i) => i.minutes)) !== JSON.stringify(intervals.map((i) => i.minutes));
      ok(`created_at disagrees with submitted_at on ${divergent.length} row(s) — and the derivation IGNORES created_at`,
        differs, differs ? '' : 'a created_at-based derivation would give the SAME answer — the pin proves nothing here');
    } else {
      emit(`INFO :: created_at == submitted_at on every row (no practice turn preceded this sit) — column-source pin not exercised on live data; --selftest case 6 covers it`);
    }
  }

  // completed_at closes the last interval.
  if (attempt.completed === true) {
    ok('a completed attempt records completed_at', ms(attempt.completed_at) !== null, String(attempt.completed_at));
    const last = stamps.length ? stamps[stamps.length - 1] : null;
    const done = ms(attempt.completed_at);
    if (last !== null && done !== null) {
      ok('completed_at is at or after the final submission', done >= last);
    }
  } else {
    emit('INFO :: attempt is still open — completed_at not yet expected');
  }

  return failures;
}

// ── --selftest (P-G3): drive the pure evaluator over synthetic break modes ───
function selftest(): number {
  const T = (mins: number) => new Date(Date.UTC(2026, 6, 30, 9, 0, 0) + mins * 60000).toISOString();
  const START = T(0);
  const GOOD: TimedRow[] = [
    { case_id: 'a001', requirement_id: 'r1', paper_order: 1, label: '(i)',   final_answer: 'a', submitted_at: T(35),  created_at: T(35) },
    { case_id: 'a001', requirement_id: 'r2', paper_order: 2, label: '(ii)',  final_answer: 'a', submitted_at: T(80),  created_at: T(80) },
    { case_id: 'a001', requirement_id: 'r3', paper_order: 3, label: '(iii)', final_answer: 'a', submitted_at: T(105), created_at: T(105) },
    { case_id: 'b101', requirement_id: 'r4', paper_order: 4, label: '(iv)',  final_answer: 'a', submitted_at: T(140), created_at: T(140) },
  ];
  const ATT: TimedAttempt = { started_at: START, completed_at: T(150), completed: true };
  const swap = (i: number, patch: Partial<TimedRow>): TimedRow[] =>
    GOOD.map((r, n) => (n === i ? { ...r, ...patch } : r));

  const cases: Array<[string, TimedRow[], TimedAttempt, boolean]> = [
    ['a clean sit PASSES', GOOD, ATT, false],
    ['a NULL submitted_at FAILS', swap(2, { submitted_at: null }), ATT, true],
    ['a submission BEFORE the attempt start FAILS', swap(0, { submitted_at: T(-5) }), ATT, true],
    ['out-of-order submissions FAIL (forward-only violated)', swap(2, { submitted_at: T(60) }), ATT, true],
    ['a missing started_at FAILS (nothing to measure from)', GOOD, { ...ATT, started_at: null }, true],
    // THE PRACTICE-TURN CASE: created_at 40 minutes before the submission. Must NOT fail —
    // submitted_at is the record — and the pin must confirm created_at is ignored.
    ['practice-turn divergence PASSES and pins created_at as ignored',
      swap(1, { created_at: T(40) }), ATT, false],
    ['a submitted row with no answer FAILS', swap(3, { final_answer: null }), ATT, true],
    ['a completed attempt with NULL completed_at FAILS', GOOD, { ...ATT, completed_at: null }, true],
    ['completed_at BEFORE the last submission FAILS', GOOD, { ...ATT, completed_at: T(100) }, true],
    ['a short read FAILS (3 rows, not 4)', GOOD.slice(0, 3), ATT, true],
    ['an empty row set FAILS (never reads as "all fine")', [], ATT, true],
  ];

  let bad = 0;
  console.log('\n--selftest — proving the fence fires (synthetic rows, no DB)\n');
  for (const [name, rows, att, mustFail] of cases) {
    const lines: string[] = [];
    const f = evaluate(rows, att, 4, (l) => lines.push(l));
    const behaved = mustFail ? f > 0 : f === 0;
    if (!behaved) bad++;
    console.log(`${behaved ? 'PASS' : 'FAIL'} :: ${name}  — ${f} failed check(s)`);
    if (!behaved) for (const l of lines.filter((x) => x.startsWith('FAIL'))) console.log(`         ${l}`);
  }

  // Explicit, separate proof that the derivation is column-correct: the practice-turn row set
  // must yield intervals identical to the clean set (submitted_at is unchanged), and DIFFERENT
  // ones if created_at were used instead.
  const practice = swap(1, { created_at: T(40) });
  const viaSubmitted = deriveIntervals(practice, ATT)!.map((i) => i.minutes);
  const viaCreated = deriveIntervals(practice.map((r) => ({ ...r, submitted_at: r.created_at })), ATT)!.map((i) => i.minutes);
  const cleanIntervals = deriveIntervals(GOOD, ATT)!.map((i) => i.minutes);
  const a = JSON.stringify(viaSubmitted) === JSON.stringify(cleanIntervals);
  const b = JSON.stringify(viaCreated) !== JSON.stringify(cleanIntervals);
  if (!a || !b) bad++;
  console.log(`${a ? 'PASS' : 'FAIL'} :: practice-turn row set gives the SAME intervals as a clean sit  — [${viaSubmitted.join(', ')}]`);
  console.log(`${b ? 'PASS' : 'FAIL'} :: a created_at-based derivation would give DIFFERENT intervals  — [${viaCreated.join(', ')}] (would misreport #2 and #3)`);

  console.log(`\n${bad === 0 ? 'SELFTEST PASS — the fence fires on every break, stays quiet on a clean sit, and pins submitted_at as the source' : `SELFTEST FAILED — ${bad} case(s) misbehaved`}\n`);
  return bad;
}

async function main(): Promise<number> {
  if (process.argv.includes('--selftest')) return selftest();

  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  console.log('\nAFM Mock Paper 1 — per-requirement sit timing integrity\n');

  const { data: reqs, error: rErr } = await s
    .from('acca_case_requirements')
    .select('id, case_id, requirement_order, label')
    .in('case_id', PAPER.case_ids)
    .order('case_id').order('requirement_order');
  const { data: prog, error: pErr } = await s
    .from('acca_case_progress')
    .select('case_id, requirement_id, final_answer, submitted_at, created_at')
    .in('case_id', PAPER.case_ids);
  const { data: att, error: aErr } = await s
    .from('acca_mock_attempts')
    .select('started_at, completed_at, completed')
    .eq('mock_id', PAPER.id)
    .order('started_at', { ascending: false })
    .limit(1);

  if (rErr || pErr || aErr) {
    console.log(`FAIL :: could not read — ${(rErr ?? pErr ?? aErr)?.message}`);
    console.log('\nNOT EVALUATED — treat as FAILURE, not as a pass.\n');
    return 1;
  }

  // Paper order across the three cases, in the paper's own case sequence.
  const orderIndex = new Map<string, { order: number; label: string | null }>();
  let n = 0;
  for (const cid of PAPER.case_ids) {
    for (const r of (reqs ?? []).filter((x) => x.case_id === cid)) {
      orderIndex.set(r.id as string, { order: ++n, label: (r.label as string | null) ?? null });
    }
  }

  const submitted = (prog ?? []).filter((p) => p.final_answer !== null);
  console.log(`population : ${PAPER.case_ids.length} cases · ${orderIndex.size} requirements`);
  console.log(`rows read  : ${(prog ?? []).length} progress · ${submitted.length} submitted · ${(att ?? []).length} attempt(s)`);

  // P-G1: an unsat paper is NOT a pass and NOT a failure — it is nothing to measure.
  if (submitted.length === 0 || (att ?? []).length === 0) {
    console.log('\n' + '-'.repeat(78));
    console.log('NOT EVALUATED — the paper has not been sat yet (0 submitted requirements');
    console.log('and/or 0 attempts). This is NOT a pass: no timing has been verified.');
    console.log('Re-run after the first sit. --selftest proves the checks fire meanwhile.');
    console.log('-'.repeat(78) + '\n');
    return 0;
  }

  const rows: TimedRow[] = submitted.map((p) => ({
    case_id: p.case_id as string,
    requirement_id: p.requirement_id as string,
    paper_order: orderIndex.get(p.requirement_id as string)?.order ?? 0,
    label: orderIndex.get(p.requirement_id as string)?.label ?? null,
    final_answer: (p.final_answer as string | null),
    submitted_at: (p.submitted_at as string | null),
    created_at: (p.created_at as string | null),
  }));
  const attempt = att![0] as unknown as TimedAttempt;
  console.log(`attempt    : started ${attempt.started_at} · completed ${String(attempt.completed)} at ${attempt.completed_at ?? '—'}\n`);

  const failures = evaluate(rows, attempt, orderIndex.size, (l) => console.log(l));

  const intervals = deriveIntervals(rows, attempt);
  if (intervals) {
    console.log('\n  DERIVED INTERVALS (submitted_at only):');
    for (const i of intervals) console.log(`    #${i.paper_order} ${String(i.label ?? '').padEnd(8)} ${i.minutes.toFixed(1)} min`);
  }

  console.log(`\n${failures === 0 ? 'ALL SIT-TIMING CHECKS PASS' : `${failures} CHECK(S) FAILED`}\n`);
  return failures;
}

// P-G4: never process.exit() in a DB-touching script.
main()
  .then((failures) => { process.exitCode = failures === 0 ? 0 : 1; })
  .catch((e) => {
    console.error('NOT EVALUATED — treat as FAILURE:', e.message);
    process.exitCode = 1;
  });
