// lib/acca/pacing.ts
// PURE pacing computation for a completed (or in-progress) sit. No DB, no model, no I/O —
// it takes already-fetched rows and returns a report. Nothing here is wired into a route or
// a UI yet, by instruction.
//
// ── WHAT IT MEASURES, AND WHAT IT DOES NOT ───────────────────────────────────
// Every interval is SUBMISSION-TO-SUBMISSION, derived from `submitted_at` only. It is NOT
// time-on-task: reading, re-reading an exhibit, thinking, idling and a closed laptop all sit
// inside the interval. There is no pause in a sit, which matches exam conditions, but
// away-time is indistinguishable from work. Every statement this module emits is therefore
// phrased "between submitting X and submitting Y", never "time spent writing".
//
// REQUIREMENT 1 CARRIES NO RATIO. Its interval contains reading the whole Section A scenario
// and its exhibits, so comparing it to a marks-derived budget would be meaningless. It is
// reported as "reading + first requirement" with `ratio: null` and flag `no_ratio`.
//
// THE TAIL IS SEPARATE. Time between the final submission and finishing is review/idle, not
// work on the last requirement, and is never folded into it.
//
// NO CAUSAL CLAIMS, NO CROSS-CANDIDATE COMPARISON. This module states what happened and what
// the budget was. "You over-ran A(ii), which cost you B2(ii)" is an inference for a reader to
// draw, not a finding to assert, and with one sit there is no distribution to compare against.

// ── The benchmark ────────────────────────────────────────────────────────────
// ACCA's own arithmetic: a 195-minute paper worth 100 marks → 1.95 minutes per mark. Chosen
// because it is the PAPER'S OWN, not a house opinion — it needs no evidence base we do not
// have, and a candidate can check it.
export const MINUTES_PER_MARK = 195 / 100;      // 1.95
export const PAPER_CLOCK_MINUTES = 195;

// ±25%. Wide enough that ordinary variation does not trigger it — deliberately not tight,
// because a pacing flag that fires constantly is one a candidate learns to ignore.
export const RATIO_FLAG_BAND = 0.25;

// End-of-paper collapse thresholds — see detectCollapse for why these values.
export const COLLAPSE_SUFFIX_BUDGET_SHARE = 0.20;
export const COLLAPSE_ACTUAL_SHARE = 0.50;

export type AnswerState = 'answered' | 'blank' | 'not_reached';
export type PacingFlag = 'over' | 'on_budget' | 'under' | 'no_ratio' | 'not_reached';

export interface PacingInputRequirement {
  requirement_id: string;
  paper_order: number;               // 1-based, across the whole paper
  label: string | null;
  marks_available: number;           // marks_guide
  submitted_at: string | null;       // THE timing record; null = never submitted
  final_answer: string | null;       // '' = submitted blank; null = never submitted
  band?: string | null;              // marks side — optional, absent until marked
  marks_awarded?: number | null;
}

export interface PacingInputAttempt {
  started_at: string | null;
  completed_at: string | null;
  completed?: boolean | null;
}

/** One requirement. Pacing and MARKS sit side by side and are never combined into a score:
 *  rushed-and-lost-marks and rushed-and-fine are different findings, and a single number
 *  would hide which one happened. */
export interface PacingRow {
  paper_order: number;
  requirement_id: string;
  label: string | null;
  answer_state: AnswerState;
  is_first: boolean;
  // ── pacing ──
  marks_available: number;
  budget_minutes: number;
  interval_minutes: number | null;
  ratio: number | null;
  flag: PacingFlag;
  // ── marks, side by side ──
  band: string | null;
  marks_awarded: number | null;
}

export interface PacingFinding {
  code:
    | 'end_of_paper_collapse'
    | 'unanswered_not_at_end'
    | 'requirement_over_budget'
    | 'requirement_under_budget'
    | 'finished_early'
    | 'ran_to_the_wire'
    | 'not_marked_yet';
  severity: 'high' | 'medium' | 'info';
  statement: string;
  evidence: Record<string, unknown>;
}

export interface PacingReport {
  not_evaluated: string | null;      // non-null ⇒ nothing below is meaningful
  minutes_per_mark: number;
  paper_clock_minutes: number;
  requirement_budget_minutes: number; // Σ per-requirement budgets — see note below
  rows: PacingRow[];
  first_requirement: { paper_order: number; label: string | null; minutes: number } | null;
  tail_minutes: number | null;
  total_elapsed_minutes: number | null;
  coverage: {
    total: number;
    answered: number;
    blank: number;
    not_reached: number;
    blank_orders: number[];
    not_reached_orders: number[];
  };
  findings: PacingFinding[];
}

const ms = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const n = Date.parse(t);
  return Number.isFinite(n) ? n : null;
};
const round1 = (n: number): number => Math.round(n * 10) / 10;
const name = (r: { label: string | null; paper_order: number }): string =>
  r.label && r.label.trim() ? r.label.trim() : `requirement ${r.paper_order}`;

function answerState(r: PacingInputRequirement): AnswerState {
  if (r.submitted_at === null || r.final_answer === null) return 'not_reached';
  return r.final_answer.trim() === '' ? 'blank' : 'answered';
}

/**
 * END-OF-PAPER COLLAPSE — a STATED finding, not something a reader infers from eight ratios.
 *
 * TRIGGER A — time collapse over the closing segment.
 *   Take the SHORTEST SUFFIX of requirements (excluding requirement 1) whose combined budget
 *   is at least COLLAPSE_SUFFIX_BUDGET_SHARE of the paper's requirement budget. If the actual
 *   combined interval over that suffix is below COLLAPSE_ACTUAL_SHARE of its budget, that is a
 *   collapse.
 *   • The window is defined by BUDGET SHARE, not a fixed count. "The last three" is arbitrary
 *     on an eight-requirement paper and meaningless on a two-requirement one; a fifth of the
 *     paper's budget is comparable across any shape.
 *   • 50% because the per-requirement flag is already ±25%. A structural finding must be
 *     stronger than one requirement's ordinary variation, or it fires on noise and gets
 *     ignored. Half the budget across a fifth of the paper is not noise.
 *   • Requirement 1 is excluded because its interval contains scenario reading and has no
 *     comparable budget — including it would let a slow start mask a fast finish.
 *
 * TRIGGER B — a closing run that earned nothing.
 *   The final k requirements (k ≥ 1, contiguous to the end) are all `not_reached` or `blank`.
 *   In a forward-only sit a blank still RECORDS a submission, so a contiguous end-run of
 *   these is a running-out signal. The same requirements scattered mid-paper are a SKIPPING
 *   pattern — a different behaviour — and are reported separately as `unanswered_not_at_end`.
 *
 * Either trigger alone is enough; the finding names which fired.
 */
function detectCollapse(rows: PacingRow[], requirementBudget: number): PacingFinding | null {
  const eligible = rows.filter((r) => !r.is_first);
  const triggers: string[] = [];
  const evidence: Record<string, unknown> = {};

  // ── Trigger A ──
  if (eligible.length > 0 && requirementBudget > 0) {
    let budget = 0;
    let cut = eligible.length;
    for (let i = eligible.length - 1; i >= 0; i--) {
      budget += eligible[i].budget_minutes;
      if (budget >= requirementBudget * COLLAPSE_SUFFIX_BUDGET_SHARE) { cut = i; break; }
    }
    const suffix = eligible.slice(cut);
    const suffixBudget = suffix.reduce((a, r) => a + r.budget_minutes, 0);
    // not_reached contributes 0 actual time, which is correct: no time was spent on it.
    const suffixActual = suffix.reduce((a, r) => a + (r.interval_minutes ?? 0), 0);
    if (suffixBudget >= requirementBudget * COLLAPSE_SUFFIX_BUDGET_SHARE &&
        suffixActual < suffixBudget * COLLAPSE_ACTUAL_SHARE) {
      triggers.push('time');
      evidence.suffix_from = suffix[0].paper_order;
      evidence.suffix_to = suffix[suffix.length - 1].paper_order;
      evidence.suffix_actual_minutes = round1(suffixActual);
      evidence.suffix_budget_minutes = round1(suffixBudget);
    }
  }

  // ── Trigger B ──
  let k = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    if (rows[i].answer_state === 'not_reached' || rows[i].answer_state === 'blank') k++;
    else break;
  }
  if (k > 0) {
    triggers.push('no_credit_tail');
    evidence.closing_run_length = k;
    evidence.closing_run_orders = rows.slice(rows.length - k).map((r) => r.paper_order);
  }

  if (triggers.length === 0) return null;

  const parts: string[] = [];
  if (triggers.includes('time')) {
    parts.push(
      `Between submitting ${evidence.suffix_from === 1 ? 'the previous requirement' : `requirement ${Number(evidence.suffix_from) - 1}`} and finishing, ` +
      `${evidence.suffix_actual_minutes} minutes elapsed across requirements ${evidence.suffix_from}–${evidence.suffix_to}, ` +
      `against a combined budget of ${evidence.suffix_budget_minutes} minutes.`,
    );
  }
  if (triggers.includes('no_credit_tail')) {
    const orders = (evidence.closing_run_orders as number[]).join(', ');
    parts.push(`The final ${k} requirement${k === 1 ? '' : 's'} (${orders}) recorded no answer that could earn marks.`);
  }

  return {
    code: 'end_of_paper_collapse',
    severity: 'high',
    statement: `End-of-paper collapse. ${parts.join(' ')}`,
    evidence: { ...evidence, triggers },
  };
}

/** PURE. Compute the whole pacing report. */
export function computePacing(
  requirements: PacingInputRequirement[],
  attempt: PacingInputAttempt,
): PacingReport {
  const empty: PacingReport = {
    not_evaluated: null,
    minutes_per_mark: MINUTES_PER_MARK,
    paper_clock_minutes: PAPER_CLOCK_MINUTES,
    requirement_budget_minutes: 0,
    rows: [],
    first_requirement: null,
    tail_minutes: null,
    total_elapsed_minutes: null,
    coverage: { total: 0, answered: 0, blank: 0, not_reached: 0, blank_orders: [], not_reached_orders: [] },
    findings: [],
  };

  const start = ms(attempt.started_at);
  if (requirements.length === 0) return { ...empty, not_evaluated: 'no requirements supplied' };
  if (start === null) return { ...empty, not_evaluated: 'attempt has no started_at — nothing to measure from' };

  const ordered = [...requirements].sort((a, b) => a.paper_order - b.paper_order);
  const requirementBudget = ordered.reduce((a, r) => a + r.marks_available * MINUTES_PER_MARK, 0);

  // ── Rows ──
  // `prev` anchors on the last KNOWN submission, so a not_reached requirement never invents
  // an interval for the one after it.
  const rows: PacingRow[] = [];
  let prev = start;
  for (const r of ordered) {
    const state = answerState(r);
    const at = ms(r.submitted_at);
    const isFirst = r.paper_order === ordered[0].paper_order;
    const budget = r.marks_available * MINUTES_PER_MARK;
    const interval = at === null ? null : (at - prev) / 60000;
    if (at !== null) prev = at;

    let ratio: number | null = null;
    let flag: PacingFlag;
    if (state === 'not_reached') flag = 'not_reached';
    else if (isFirst) flag = 'no_ratio';                       // reading + first requirement
    else if (interval === null || budget <= 0) flag = 'no_ratio';
    else {
      ratio = interval / budget;
      flag = ratio > 1 + RATIO_FLAG_BAND ? 'over' : ratio < 1 - RATIO_FLAG_BAND ? 'under' : 'on_budget';
    }

    rows.push({
      paper_order: r.paper_order,
      requirement_id: r.requirement_id,
      label: r.label,
      answer_state: state,
      is_first: isFirst,
      marks_available: r.marks_available,
      budget_minutes: round1(budget),
      interval_minutes: interval === null ? null : round1(interval),
      ratio: ratio === null ? null : Math.round(ratio * 100) / 100,
      flag,
      band: r.band ?? null,
      marks_awarded: r.marks_awarded ?? null,
    });
  }

  // ── Tail + total ──
  const lastSubmitted = [...rows].reverse().find((r) => r.interval_minutes !== null);
  const lastStamp = lastSubmitted
    ? ms(ordered.find((r) => r.paper_order === lastSubmitted.paper_order)!.submitted_at)
    : null;
  const done = ms(attempt.completed_at);
  const tail = done !== null && lastStamp !== null ? round1((done - lastStamp) / 60000) : null;
  const total = done !== null ? round1((done - start) / 60000) : null;

  // ── Coverage ──
  const coverage = {
    total: rows.length,
    answered: rows.filter((r) => r.answer_state === 'answered').length,
    blank: rows.filter((r) => r.answer_state === 'blank').length,
    not_reached: rows.filter((r) => r.answer_state === 'not_reached').length,
    blank_orders: rows.filter((r) => r.answer_state === 'blank').map((r) => r.paper_order),
    not_reached_orders: rows.filter((r) => r.answer_state === 'not_reached').map((r) => r.paper_order),
  };

  // ── Findings ──
  const findings: PacingFinding[] = [];
  const collapse = detectCollapse(rows, requirementBudget);
  if (collapse) findings.push(collapse);

  // No-credit requirements that are NOT a closing run — a skipping pattern, not running out.
  const closing = new Set<number>((collapse?.evidence.closing_run_orders as number[] | undefined) ?? []);
  const strayNoCredit = rows.filter(
    (r) => (r.answer_state === 'not_reached' || r.answer_state === 'blank') && !closing.has(r.paper_order),
  );
  if (strayNoCredit.length > 0) {
    findings.push({
      code: 'unanswered_not_at_end',
      severity: 'medium',
      statement:
        `Requirement${strayNoCredit.length === 1 ? '' : 's'} ${strayNoCredit.map((r) => name(r)).join(', ')} ` +
        `recorded no answer that could earn marks, and ${strayNoCredit.length === 1 ? 'it is' : 'they are'} not at the end of the paper.`,
      evidence: { orders: strayNoCredit.map((r) => r.paper_order) },
    });
  }

  for (const r of rows) {
    if (r.flag !== 'over' && r.flag !== 'under') continue;
    const idx = rows.findIndex((x) => x.paper_order === r.paper_order);
    const from = idx > 0 ? `submitting ${name(rows[idx - 1])}` : 'starting the paper';
    findings.push({
      code: r.flag === 'over' ? 'requirement_over_budget' : 'requirement_under_budget',
      severity: 'medium',
      statement:
        `Between ${from} and submitting ${name(r)}, ${r.interval_minutes} minutes elapsed, ` +
        `against a ${r.budget_minutes}-minute budget for ${name(r)} (${r.marks_available} marks).`,
      evidence: { paper_order: r.paper_order, interval_minutes: r.interval_minutes, budget_minutes: r.budget_minutes, ratio: r.ratio },
    });
  }

  if (total !== null) {
    if (total >= PAPER_CLOCK_MINUTES) {
      findings.push({
        code: 'ran_to_the_wire', severity: 'info',
        statement: `The attempt ran ${round1(total)} minutes against a ${PAPER_CLOCK_MINUTES}-minute clock.`,
        evidence: { total_elapsed_minutes: total },
      });
    } else if (total <= PAPER_CLOCK_MINUTES - 10) {
      findings.push({
        code: 'finished_early', severity: 'info',
        statement: `The attempt finished ${round1(PAPER_CLOCK_MINUTES - total)} minutes inside the ${PAPER_CLOCK_MINUTES}-minute clock.`,
        evidence: { total_elapsed_minutes: total, minutes_remaining: round1(PAPER_CLOCK_MINUTES - total) },
      });
    }
  }

  if (rows.every((r) => r.band === null && r.marks_awarded === null)) {
    findings.push({
      code: 'not_marked_yet', severity: 'info',
      statement: 'Marks are not available for this attempt, so pacing is reported on its own.',
      evidence: {},
    });
  }

  const first = rows[0];
  return {
    not_evaluated: null,
    minutes_per_mark: MINUTES_PER_MARK,
    paper_clock_minutes: PAPER_CLOCK_MINUTES,
    requirement_budget_minutes: round1(requirementBudget),
    rows,
    first_requirement: first && first.interval_minutes !== null
      ? { paper_order: first.paper_order, label: first.label, minutes: first.interval_minutes }
      : null,
    tail_minutes: tail,
    total_elapsed_minutes: total,
    coverage,
    findings,
  };
}
