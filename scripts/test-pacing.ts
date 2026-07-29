// scripts/test-pacing.ts
// Fixtures for lib/acca/pacing.ts. PURE — no env, DB, model or network.
//   npm run test:pacing              — the full suite
//   npm run test:pacing -- --selftest — the same walks (the computation has no I/O, so every
//                                       run is already the P-G3 selftest; the flag is kept so
//                                       the idiom matches the other fences)
//
// P-G3: the computation is pure and separated from I/O by construction, and every walk below
// carries a KNOWN EXPECTED VERDICT in both directions — walks that must trigger the collapse
// detector and walks that must not. A detector only ever observed staying silent is untested.

import {
  computePacing,
  MINUTES_PER_MARK,
  PAPER_CLOCK_MINUTES,
  type PacingInputRequirement,
  type PacingInputAttempt,
  type PacingReport,
} from '../lib/acca/pacing';

let failures = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}

// AFM Mock Paper 1's real shape: 10+16+8+6 (A) · 12+8 (B1) · 12+8 (B2) = 80 technical marks.
const MARKS = [10, 16, 8, 6, 12, 8, 12, 8];
const LABELS = ['A(i)', 'A(ii)', 'A(iii)', 'A(iv)', 'B1(i)', 'B1(ii)', 'B2(i)', 'B2(ii)'];
const T = (mins: number) => new Date(Date.UTC(2026, 6, 30, 9, 0, 0) + mins * 60000).toISOString();

/** Build a walk from cumulative submission minutes. `null` = never reached. */
function walk(cumulative: Array<number | null>, opts: {
  blanks?: number[];              // paper_orders submitted BLANK
  completedAt?: number | null;    // minutes; null = attempt still open
  marks?: Array<number | null>;
} = {}): { reqs: PacingInputRequirement[]; att: PacingInputAttempt } {
  const reqs = cumulative.map((at, i) => ({
    requirement_id: `r${i + 1}`,
    paper_order: i + 1,
    label: LABELS[i],
    marks_available: MARKS[i],
    submitted_at: at === null ? null : T(at),
    final_answer: at === null ? null : (opts.blanks?.includes(i + 1) ? '' : 'an answer'),
    band: opts.marks ? (opts.marks[i] === null ? null : 'competent') : null,
    marks_awarded: opts.marks ? opts.marks[i] : null,
  }));
  const att: PacingInputAttempt = {
    started_at: T(0),
    completed_at: opts.completedAt === undefined ? T(190) : (opts.completedAt === null ? null : T(opts.completedAt)),
    completed: opts.completedAt === null ? false : true,
  };
  return { reqs, att };
}
const hasCollapse = (r: PacingReport) => r.findings.some((f) => f.code === 'end_of_paper_collapse');
const collapse = (r: PacingReport) => r.findings.find((f) => f.code === 'end_of_paper_collapse');
const flagOf = (r: PacingReport, order: number) => r.rows.find((x) => x.paper_order === order)!.flag;

console.log('\n-- benchmark --');
ok('minutes per mark is 1.95 (195 / 100)', MINUTES_PER_MARK === 1.95);
ok('paper clock is 195', PAPER_CLOCK_MINUTES === 195);

// ── W1 — even pacing, everything answered, finished inside the clock ──────────
// Budgets: 19.5 31.2 15.6 11.7 23.4 15.6 23.4 15.6 (Σ 156). Cumulative ≈ on budget.
console.log('\n-- W1: even pacing, all answered --');
{
  const cum = [20, 51, 67, 79, 102, 118, 141, 157];
  const r = computePacing(...Object.values(walk(cum, { completedAt: 165 })) as [PacingInputRequirement[], PacingInputAttempt]);
  ok('not_evaluated is null', r.not_evaluated === null);
  ok('requirement budget total is 156.0 (80 marks × 1.95)', r.requirement_budget_minutes === 156);
  ok('requirement 1 carries NO ratio', r.rows[0].ratio === null && r.rows[0].flag === 'no_ratio');
  ok('requirement 1 is reported as reading + first requirement', r.first_requirement?.minutes === 20);
  ok('no collapse on even pacing', !hasCollapse(r));
  ok('every requirement 2-8 is on budget', r.rows.slice(1).every((x) => x.flag === 'on_budget'),
    r.rows.slice(1).map((x) => `${x.label}:${x.flag}`).join(' '));
  ok('tail is separate and not folded into the last requirement', r.tail_minutes === 8);
  ok('the last requirement keeps its own interval', r.rows[7].interval_minutes === 16);
  ok('total elapsed is measured to completed_at', r.total_elapsed_minutes === 165);
  ok('finished_early is reported', r.findings.some((f) => f.code === 'finished_early'));
  ok('coverage is 8 answered', r.coverage.answered === 8 && r.coverage.not_reached === 0 && r.coverage.blank === 0);
}

// ── W2 — 55 minutes on a 25-mark requirement ─────────────────────────────────
// Budget 48.75 → ratio 1.13. EXPECTED VERDICT: on_budget. This pins that ±25% is not a
// hair-trigger — a modest overrun is NOT a finding, deliberately.
console.log('\n-- W2: 55 minutes on a 25-mark requirement --');
{
  const reqs: PacingInputRequirement[] = [
    { requirement_id: 'a', paper_order: 1, label: 'A(i)', marks_available: 10, submitted_at: T(20), final_answer: 'x' },
    { requirement_id: 'b', paper_order: 2, label: 'B(i)', marks_available: 25, submitted_at: T(75), final_answer: 'x' },
    { requirement_id: 'c', paper_order: 3, label: 'C(i)', marks_available: 25, submitted_at: T(124), final_answer: 'x' },
  ];
  const r = computePacing(reqs, { started_at: T(0), completed_at: T(130), completed: true });
  ok('budget for 25 marks is 48.8 minutes', r.rows[1].budget_minutes === 48.8);
  ok('55 minutes on 25 marks → ratio 1.13', r.rows[1].ratio === 1.13, String(r.rows[1].ratio));
  ok('EXPECTED on_budget — ±25% does not fire on a modest overrun', flagOf(r, 2) === 'on_budget');
  ok('no over-budget finding emitted', !r.findings.some((f) => f.code === 'requirement_over_budget'));
}

// ── W3 — 4 minutes on a 16-mark requirement ──────────────────────────────────
// Budget 31.2 → ratio 0.13. EXPECTED VERDICT: under.
console.log('\n-- W3: 4 minutes on a 16-mark requirement --');
{
  const cum = [20, 24, 45, 60, 90, 110, 140, 160];
  const r = computePacing(...Object.values(walk(cum, { completedAt: 170 })) as [PacingInputRequirement[], PacingInputAttempt]);
  ok('interval for A(ii) is 4 minutes', r.rows[1].interval_minutes === 4);
  ok('ratio is 0.13 against a 31.2-minute budget', r.rows[1].ratio === 0.13 && r.rows[1].budget_minutes === 31.2);
  ok('EXPECTED under', flagOf(r, 2) === 'under');
  ok('an under-budget finding is emitted', r.findings.some((f) => f.code === 'requirement_under_budget'));
  ok('the finding names both ends of the interval',
    r.findings.some((f) => f.code === 'requirement_under_budget' && /Between submitting A\(i\) and submitting A\(ii\)/.test(f.statement)));
}

// ── W4 — end-of-paper collapse, TIME trigger, everything still answered ──────
// Suffix by budget share: 20% of 156 = 31.2. Last two (B2(i) 23.4 + B2(ii) 15.6 = 39.0)
// clears it. Actual over those two = 6 min < 19.5 (50%). EXPECTED: collapse, trigger 'time'.
console.log('\n-- W4: end-of-paper collapse (time), all answered --');
{
  const cum = [25, 70, 95, 115, 150, 172, 176, 178];
  const r = computePacing(...Object.values(walk(cum, { completedAt: 180 })) as [PacingInputRequirement[], PacingInputAttempt]);
  ok('EXPECTED collapse detected', hasCollapse(r));
  ok('the time trigger fired', (collapse(r)!.evidence.triggers as string[]).includes('time'));
  ok('the no-credit trigger did NOT fire (everything was answered)',
    !(collapse(r)!.evidence.triggers as string[]).includes('no_credit_tail'));
  ok('severity is high — a stated finding, not an inference', collapse(r)!.severity === 'high');
  ok('the statement names the window and both totals',
    /requirements 7–8/.test(collapse(r)!.statement) && /against a combined budget of 39 minutes/.test(collapse(r)!.statement),
    collapse(r)!.statement);
  ok('coverage still reports 8 answered', r.coverage.answered === 8);
}

// ── W5 — unanswered tail (never reached) ─────────────────────────────────────
console.log('\n-- W5: unanswered tail --');
{
  const cum: Array<number | null> = [25, 70, 95, 120, 150, 170, null, null];
  const r = computePacing(...Object.values(walk(cum, { completedAt: 195 })) as [PacingInputRequirement[], PacingInputAttempt]);
  ok('EXPECTED collapse detected', hasCollapse(r));
  ok('the no-credit trigger fired', (collapse(r)!.evidence.triggers as string[]).includes('no_credit_tail'));
  ok('the closing run is 2 requirements', collapse(r)!.evidence.closing_run_length === 2);
  ok('not_reached rows carry no interval and no ratio',
    r.rows[6].interval_minutes === null && r.rows[6].ratio === null && r.rows[6].flag === 'not_reached');
  ok('coverage reports 2 not_reached at orders 7,8',
    r.coverage.not_reached === 2 && JSON.stringify(r.coverage.not_reached_orders) === '[7,8]');
  ok('no stray unanswered finding — the run IS the collapse',
    !r.findings.some((f) => f.code === 'unanswered_not_at_end'));
  ok('ran_to_the_wire reported at 195 minutes', r.findings.some((f) => f.code === 'ran_to_the_wire'));
}

// ── W6 — a BLANK tail (submitted, but empty) ─────────────────────────────────
console.log('\n-- W6: blank tail --');
{
  const cum = [25, 70, 95, 120, 150, 170, 178, 180];
  const r = computePacing(...Object.values(walk(cum, { blanks: [7, 8], completedAt: 185 })) as [PacingInputRequirement[], PacingInputAttempt]);
  ok('EXPECTED collapse detected (blank counts as no credit)', hasCollapse(r));
  ok('coverage separates blank from not_reached', r.coverage.blank === 2 && r.coverage.not_reached === 0);
  ok('blank rows still carry an interval (they WERE submitted)', r.rows[6].interval_minutes !== null);
}

// ── W7 — no-credit requirements NOT at the end → NOT a collapse ──────────────
// The closing pair MUST be properly paced here, or this walk tests two things at once. Last
// two budgets are 23.4 + 15.6 = 39.0; this walk spends 24 + 16 = 40 on them, so the time
// trigger cannot fire and the ONLY thing left to detect is the mid-paper blank.
// (The first draft of this walk closed on 13 + 5 = 18 minutes against that 39 — a real
// collapse — and the detector correctly flagged it. The fixture was wrong, not the rule.)
console.log('\n-- W7: unanswered mid-paper is a different finding --');
{
  const cum = [20, 51, 55, 67, 90, 106, 130, 146];
  const r = computePacing(...Object.values(walk(cum, { blanks: [3], completedAt: 150 })) as [PacingInputRequirement[], PacingInputAttempt]);
  ok('the closing pair is paced (40 min against a 39-min budget), so the time trigger cannot fire',
    (r.rows[6].interval_minutes ?? 0) + (r.rows[7].interval_minutes ?? 0) === 40);
  ok('EXPECTED no collapse — the gap is mid-paper, a skipping pattern', !hasCollapse(r));
  ok('reported as unanswered_not_at_end instead', r.findings.some((f) => f.code === 'unanswered_not_at_end'));
  ok('the statement says it is not at the end',
    /not at the end of the paper/.test(r.findings.find((f) => f.code === 'unanswered_not_at_end')!.statement));
}

// ── W8 — attempt still open ──────────────────────────────────────────────────
console.log('\n-- W8: attempt still open --');
{
  const cum: Array<number | null> = [20, 51, 67, 79, null, null, null, null];
  const r = computePacing(...Object.values(walk(cum, { completedAt: null })) as [PacingInputRequirement[], PacingInputAttempt]);
  ok('tail is null while the attempt is open', r.tail_minutes === null);
  ok('total elapsed is null while the attempt is open', r.total_elapsed_minutes === null);
  ok('no finished_early / ran_to_the_wire finding', !r.findings.some((f) => f.code === 'finished_early' || f.code === 'ran_to_the_wire'));
  ok('answered requirements still carry intervals', r.rows[1].interval_minutes === 31);
}

// ── W9 — marks SIDE BY SIDE, never merged ────────────────────────────────────
console.log('\n-- W9: pacing and marks side by side --');
{
  const cum = [25, 70, 95, 115, 150, 172, 176, 178];
  const r = computePacing(...Object.values(walk(cum, { completedAt: 180, marks: [8, 12, 6, 4, 9, 6, 2, 1] })) as [PacingInputRequirement[], PacingInputAttempt]);
  ok('every row carries its band AND its marks alongside the interval',
    r.rows.every((x) => x.band !== null && x.marks_awarded !== null && x.budget_minutes > 0));
  const keys = Object.keys(r.rows[0]);
  ok('NO combined pacing+marks score field exists',
    !keys.some((k) => /score|combined|overall|index|efficiency/i.test(k)), keys.join(','));
  ok('rushed-and-fine is distinguishable: B2(i) is rushed but scored 2/12',
    r.rows[6].flag === 'under' || r.rows[6].interval_minutes! < r.rows[6].budget_minutes);
  ok('not_marked_yet is NOT reported when marks are present', !r.findings.some((f) => f.code === 'not_marked_yet'));
}

// ── W10 — degenerate inputs ──────────────────────────────────────────────────
console.log('\n-- W10: degenerate inputs are refused, not guessed --');
{
  ok('no requirements → not_evaluated', computePacing([], { started_at: T(0), completed_at: T(10) }).not_evaluated !== null);
  const { reqs } = walk([20, 51, 67, 79, 102, 118, 141, 157]);
  ok('no started_at → not_evaluated',
    computePacing(reqs, { started_at: null, completed_at: T(10) }).not_evaluated !== null);
}

// ── W11 — mutation proof: the SAME walk with and without the collapse ────────
console.log('\n-- W11: mutation proof (the detector responds to the data) --');
{
  const slow = computePacing(...Object.values(walk([25, 70, 95, 115, 140, 158, 175, 190], { completedAt: 193 })) as [PacingInputRequirement[], PacingInputAttempt]);
  const fast = computePacing(...Object.values(walk([25, 70, 95, 115, 150, 172, 176, 178], { completedAt: 180 })) as [PacingInputRequirement[], PacingInputAttempt]);
  ok('a paced finish does NOT trigger the collapse', !hasCollapse(slow));
  ok('the same paper rushed at the end DOES trigger it', hasCollapse(fast));
  ok('the only difference is the closing timings, not the shape',
    slow.rows.length === fast.rows.length && slow.requirement_budget_minutes === fast.requirement_budget_minutes);
}

// ── LANGUAGE CONSTRAINTS (binding, from the spec) ────────────────────────────
console.log('\n-- language constraints --');
{
  const walks = [
    computePacing(...Object.values(walk([20, 24, 45, 60, 90, 110, 140, 160], { completedAt: 170 })) as [PacingInputRequirement[], PacingInputAttempt]),
    computePacing(...Object.values(walk([25, 70, 95, 115, 150, 172, 176, 178], { completedAt: 180 })) as [PacingInputRequirement[], PacingInputAttempt]),
    computePacing(...Object.values(walk([25, 70, 95, 120, 150, 170, null, null], { completedAt: 195 })) as [PacingInputRequirement[], PacingInputAttempt]),
    computePacing(...Object.values(walk([25, 70, 95, 120, 150, 172, 185, 190], { blanks: [3], completedAt: 193 })) as [PacingInputRequirement[], PacingInputAttempt]),
  ];
  const statements = walks.flatMap((r) => r.findings.map((f) => f.statement));
  ok('at least one statement was generated to lint', statements.length > 0, String(statements.length));

  const BANNED: Array<[RegExp, string]> = [
    [/time spent writing/i, 'time-on-task claim'],
    [/spent writing/i, 'time-on-task claim'],
    [/you wrote for/i, 'time-on-task claim'],
    [/cost you/i, 'causal claim'],
    [/which is why/i, 'causal claim'],
    [/caused|because you/i, 'causal claim'],
    [/other candidates|average candidate|percentile|compared with others/i, 'cross-candidate comparison'],
    [/too slow|too fast|you should have/i, 'unsupported instruction'],
  ];
  for (const [re, why] of BANNED) {
    const hit = statements.find((s) => re.test(s));
    ok(`no statement contains a ${why} (${re.source})`, hit === undefined, hit ?? '');
  }
  ok('interval statements are phrased "Between … and submitting …"',
    statements.filter((s) => /minutes elapsed/.test(s)).every((s) => /^Between /.test(s) || /Between submitting/.test(s)),
    statements.filter((s) => /minutes elapsed/.test(s)).join(' | '));
}

console.log(`\n${failures === 0 ? 'ALL PACING FIXTURES PASS' : `${failures} FIXTURE(S) FAILED`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
