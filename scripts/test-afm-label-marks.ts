// scripts/test-afm-label-marks.ts
// FENCE for a known, deferred fragility. Read-only against the DB; writes nothing; no
// behaviour change anywhere.
//   npm run test:afm-label-marks              — check the live rows
//   npm run test:afm-label-marks -- --selftest — prove the fence FAILS on a broken label
//
// ── WHAT THIS FENCES ─────────────────────────────────────────────────────────
// app/api/acca/sit does NOT serve `marks_guide`. AFM candidates still see marks per
// requirement ONLY because the stored labels carry them in prose — "(i) B3e — 10 marks",
// served as "(i) — 10 marks" once sitDisplayLabel strips the syllabus code.
//
// That is parity by ACCIDENT OF LABEL FORMATTING, not by rule. Nothing enforces it. Tidying
// a label to a cleaner "(i)" — exactly the kind of edit the LO-code strip invites — would
// SILENTLY remove marks-per-requirement from a LIVE SIT: no gate fires, no test fails, and
// the paper stops telling the candidate how to pace 3h15m.
//
// The proper fix is structural (marks from the COLUMN on both surfaces, label reduced to the
// part) and is deferred to the SitRunner-serves-both-papers change-set. THIS FIXTURE HOLDS
// THE LINE UNTIL THEN. **Retire it in that change-set** — once /api/acca/sit serves
// marks_guide and the runner composes the label, the prose marks stop being load-bearing and
// this file should be DELETED rather than left asserting a rule that has been replaced.
//
// ── WHY IT MUST READ THE DB ──────────────────────────────────────────────────
// scripts/test-sit-preview.ts already pins label behaviour, but against LITERAL strings — it
// tests sitDisplayLabel's logic, so it stays green no matter what the rows say. The
// fragility is a CONTENT edit, so only a check against the live rows can catch it.
//
// ── P-G1 / P-G2 ──────────────────────────────────────────────────────────────
// Declares its population before reporting. A row that cannot be evaluated (missing, query
// error, short read) is a FAILURE, never a silent absence — an empty result set must never
// read as "all labels fine". The assertion logic is a PURE function so --selftest can prove
// the failure path fires, rather than the fence merely claiming it would.

import { createClient } from '@supabase/supabase-js';
import { AFM_MOCK_PAPER_1, sitDisplayLabel } from '../lib/acca/sit-preview';

const EXPECTED_ROWS = 8;                 // AFM Mock Paper 1: 4 (Section A) + 2 + 2
const PAPER_TECHNICAL_TOTAL = 80;        // 100 less the 20 professional marks
const MARKS_IN_PROSE = /(\d+)\s*marks?\b/i;

interface LabelRow {
  case_id: string;
  label: string | null;
  lo_code: string | null;
  marks_guide: number | null;
}

/** PURE. Returns the number of failed checks; `emit` receives every line. */
function evaluate(rows: LabelRow[], expectedRows: number, emit: (line: string) => void): number {
  let failures = 0;
  const ok = (name: string, cond: boolean, detail = '') => {
    if (!cond) failures++;
    emit(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
  };

  ok(`all ${expectedRows} requirements were read (a short read is a failure, not a pass)`,
    rows.length === expectedRows, `got ${rows.length}`);

  for (const r of rows) {
    const stored = String(r.label ?? '');
    const tag = `${String(r.case_id).slice(-4)} ${stored || '(empty label)'}`;
    const served = sitDisplayLabel(stored, r.lo_code);
    const servedMatch = (served ?? '').match(MARKS_IN_PROSE);

    ok(`${tag} :: stored label states its marks`, MARKS_IN_PROSE.test(stored),
      MARKS_IN_PROSE.test(stored) ? '' : 'NO "N marks" IN THE LABEL — a live sit would show this requirement with no marks');

    // THE ONE THAT MATTERS: a label could carry marks that sitDisplayLabel then removes.
    ok(`${tag} :: SERVED label still states its marks (candidate-facing)`, servedMatch !== null,
      `served as "${served ?? 'null'}"`);

    // Drift: a label saying 10 marks on a 12-mark requirement is worse than none, because
    // the candidate believes it and paces to it.
    ok(`${tag} :: label marks match marks_guide (${String(r.marks_guide)})`,
      servedMatch !== null && Number(servedMatch[1]) === r.marks_guide,
      servedMatch ? `label says ${servedMatch[1]}, column says ${String(r.marks_guide)}` : 'no marks in the served label');
  }

  // Totals reconcile to the paper — a per-row pass with a wrong total means a row is missing.
  const labelTotal = rows.reduce((a, r) => {
    const m = (sitDisplayLabel(String(r.label ?? ''), r.lo_code) ?? '').match(MARKS_IN_PROSE);
    return a + (m ? Number(m[1]) : 0);
  }, 0);
  const guideTotal = rows.reduce((a, r) => a + (typeof r.marks_guide === 'number' ? r.marks_guide : 0), 0);
  ok('served label marks sum to the same total as marks_guide', labelTotal === guideTotal,
    `labels ${labelTotal} vs column ${guideTotal}`);
  ok(`paper technical total is ${PAPER_TECHNICAL_TOTAL}`, guideTotal === PAPER_TECHNICAL_TOTAL, String(guideTotal));

  return failures;
}

function brokenBanner(): void {
  console.log(`\n${'!'.repeat(78)}`);
  console.log('AFM LABEL FENCE BROKEN — a requirement label no longer carries its marks.');
  console.log('A live AFM sit would show that requirement with NO marks, because');
  console.log('/api/acca/sit does not serve marks_guide. Either restore the marks to the');
  console.log('label, or land the structural fix (serve marks_guide + reduce the label to');
  console.log('the part) and RETIRE this fixture. See docs/AFM_SURFACED.md.');
  console.log(`${'!'.repeat(78)}\n`);
}

// ── --selftest: prove the fence actually fires ───────────────────────────────
// Runs the SAME pure evaluator over synthetic rows. Touches no DB and asserts nothing about
// live content — it proves the mechanism, so "it would fail loudly" is demonstrated rather
// than claimed.
function selftest(): number {
  const GOOD: LabelRow[] = [
    { case_id: 'a001', label: '(i) B3e — 10 marks',  lo_code: 'B3e', marks_guide: 10 },
    { case_id: 'a001', label: '(ii) B5b — 16 marks', lo_code: 'B5b', marks_guide: 16 },
    { case_id: 'a001', label: '(iii) E2b — 8 marks', lo_code: 'E2b', marks_guide: 8 },
    { case_id: 'a001', label: '(iv) E1a — 6 marks',  lo_code: 'E1a', marks_guide: 6 },
    { case_id: 'b101', label: '(i) B1a — 12 marks',  lo_code: 'B1a', marks_guide: 12 },
    { case_id: 'b101', label: '(ii) B1b — 8 marks',  lo_code: 'B1b', marks_guide: 8 },
    { case_id: 'b201', label: '(i) E3a — 12 marks',  lo_code: 'E3a', marks_guide: 12 },
    { case_id: 'b201', label: '(ii) E2a — 8 marks',  lo_code: 'E2a', marks_guide: 8 },
  ];
  const swap = (i: number, patch: Partial<LabelRow>): LabelRow[] =>
    GOOD.map((r, n) => (n === i ? { ...r, ...patch } : r));

  const cases: Array<[string, LabelRow[], boolean]> = [
    ['the real label set PASSES', GOOD, false],
    ['a label tidied to just the part FAILS  ("(i) B3e")', swap(0, { label: '(i) B3e' }), true],
    ['a label with the marks removed FAILS  ("(i)")', swap(3, { label: '(i)' }), true],
    ['a label whose marks disagree with the column FAILS', swap(1, { label: '(ii) B5b — 14 marks' }), true],
    ['an empty label FAILS', swap(5, { label: '' }), true],
    ['a null label FAILS', swap(6, { label: null }), true],
    ['a short read FAILS (7 rows, not 8)', GOOD.slice(0, 7), true],
    ['an empty result set FAILS (never reads as "all fine")', [], true],
  ];

  let bad = 0;
  console.log('\n--selftest — proving the fence fires (synthetic rows, no DB)\n');
  for (const [name, rows, mustFail] of cases) {
    const lines: string[] = [];
    const f = evaluate(rows, EXPECTED_ROWS, (l) => lines.push(l));
    const behaved = mustFail ? f > 0 : f === 0;
    if (!behaved) bad++;
    console.log(`${behaved ? 'PASS' : 'FAIL'} :: ${name}  — ${f} failed check(s)`);
    if (!behaved) for (const l of lines.filter((x) => x.startsWith('FAIL'))) console.log(`         ${l}`);
  }
  console.log(`\n${bad === 0 ? 'SELFTEST PASS — the fence fires on every break and stays quiet on the real set' : `SELFTEST FAILED — ${bad} case(s) misbehaved`}\n`);
  return bad;
}

async function main(): Promise<number> {
  if (process.argv.includes('--selftest')) return selftest();

  const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
  console.log('\nAFM Mock Paper 1 — every requirement label must carry its marks in prose');
  console.log('(fence for the deferred marks_guide-on-the-sit-route fix)\n');

  const { data, error } = await s
    .from('acca_case_requirements')
    .select('case_id, requirement_order, label, lo_code, marks_guide')
    .in('case_id', AFM_MOCK_PAPER_1.case_ids)
    .order('case_id')
    .order('requirement_order');

  // A check that cannot evaluate must say so distinguishably (P-G1).
  if (error) {
    console.log(`FAIL :: could not read the requirements — ${error.message}`);
    console.log('\nNOT EVALUATED — treat as FAILURE, not as a pass.\n');
    return 1;
  }
  const rows = (data ?? []) as unknown as LabelRow[];

  // Denominator, declared before any result (P-G2).
  console.log(`population : ${AFM_MOCK_PAPER_1.case_ids.length} cases (${AFM_MOCK_PAPER_1.id})`);
  console.log(`rows read  : ${rows.length}  ·  expected ${EXPECTED_ROWS}`);
  console.log('evaluating : stored label · served label (post-sitDisplayLabel) · label marks vs marks_guide\n');

  const failures = evaluate(rows, EXPECTED_ROWS, (l) => console.log(l));
  if (failures > 0) brokenBanner();
  else console.log(`\nALL AFM LABEL-MARKS CHECKS PASS — ${rows.length}/${EXPECTED_ROWS} rows evaluated, 0 not_evaluated\n`);
  return failures;
}

// `process.exitCode` rather than `process.exit()`: an abrupt exit while the Supabase client
// still holds a handle trips a libuv assertion on Windows and REPLACES the exit code with a
// crash code — which would make this fence's pass/fail unreadable to whatever runs it.
main()
  .then((failures) => { process.exitCode = failures === 0 ? 0 : 1; })
  .catch((e) => {
    console.error('NOT EVALUATED — treat as FAILURE:', e.message);
    process.exitCode = 1;
  });
