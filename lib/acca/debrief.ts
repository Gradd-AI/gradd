// lib/acca/debrief.ts
// PURE coached-debrief computation for a completed sit. No DB, no model, no I/O — it takes
// marking output and a pacing report and returns a debrief. Wired into nothing, by instruction.
//
// ── THE ONE RULE THAT SHAPES EVERYTHING HERE ─────────────────────────────────
// IT DOES NOT RE-JUDGE THE ANSWER. The technical marker has already read the work and produced
// reasoning that names the figure and the diverging step; that reasoning is the "why", carried
// through VERBATIM. This module computes WHAT was lost (arithmetic), quotes WHY (the marker's
// own words), and derives ONE next action from the band's published definition. It never
// paraphrases a verdict, never infers a cause the marker did not state, and never invents a
// diagnosis of its own.
//
// Consequences, deliberate:
//   • `why` is either exactly the marker's feedback string or null. Never a rewrite.
//   • A requirement with no marker feedback gets no "why" — not a manufactured one.
//   • No predicted grade. Totals are reported because they are facts; "that's a pass" is not.
//   • No motivational filler. A debrief that says "great effort!" is not coaching, it is noise.
//
// ── MARKS AND PACING STAY SEPARATE ───────────────────────────────────────────
// As in lib/acca/pacing.ts: rushed-and-lost-marks and rushed-and-fine are different findings.
// Every line carries its marks and its pacing note as SEPARATE fields, and the pacing note is
// phrased adjacently ("Marks: … Pacing: …"), never causally. Nothing combines them into a score.
//
// ── PACING LANGUAGE CONSTRAINTS ARE BINDING HERE TOO ─────────────────────────
// Intervals are submission-to-submission, never "time spent writing". No causal claims, no
// cross-candidate comparison. Statements sourced from pacing are reused verbatim rather than
// re-worded, so they cannot drift out of compliance.

import type { PacingReport, PacingFlag, AnswerState } from '@/lib/acca/pacing';

export type DebriefVerdict = 'strong' | 'partial' | 'lost' | 'not_reached';

/** Where a statement came from. Every emitted line carries one — a debrief line with no
 *  traceable source is exactly the invented diagnosis this module exists to avoid. */
export type DebriefSource = 'marker_verdict' | 'computed_marks' | 'computed_interval' | 'band_definition';

export interface DebriefRequirementInput {
  requirement_id: string;
  paper_order: number;
  label: string | null;
  marks_available: number;
  marks_awarded: number | null;
  band: string | null;            // the technical band; null = not marked
  marker_feedback: string | null; // the marker's OWN reasoning — carried verbatim, never rewritten
}

export interface DebriefSkillInput {
  skill: string;
  band: string;
  feedback: string;               // the PS marker's own reasoning — carried verbatim
}

export interface DebriefCaseInput {
  case_id: string;
  title: string | null;
  professional_marks_awarded: number | null;
  professional_marks_available: number | null;
  per_skill: DebriefSkillInput[];
}

export interface DebriefRequirementLine {
  paper_order: number;
  requirement_id: string;
  label: string | null;
  verdict: DebriefVerdict;
  // ── marks ──
  marks_awarded: number | null;
  marks_available: number;
  marks_lost: number | null;
  band: string | null;
  what_was_lost: string;
  why: string | null;             // VERBATIM marker feedback, or null
  why_source: DebriefSource | null;
  next_action: string;
  next_action_source: DebriefSource;
  // ── pacing, side by side and never merged ──
  pacing_note: string | null;
  pacing_flag: PacingFlag | null;
  answer_state: AnswerState | null;
}

export interface DebriefSkillLine {
  skill: string;
  band: string;
  why: string;                    // VERBATIM
  why_source: DebriefSource;
}

export interface DebriefHeadline {
  code: 'end_of_paper_collapse' | 'largest_single_loss' | 'no_marks_lost' | 'pacing_only' | 'none';
  statement: string;
  source: DebriefSource | 'pacing_finding';
  evidence: Record<string, unknown>;
}

export interface DebriefReport {
  not_evaluated: string | null;
  headline: DebriefHeadline;
  requirements: DebriefRequirementLine[];
  professional: Array<{ case_id: string; title: string | null; awarded: number | null; available: number | null; skills: DebriefSkillLine[] }>;
  totals: {
    technical_awarded: number | null;
    technical_available: number;
    professional_awarded: number | null;
    professional_available: number | null;
  };
  limitations: string[];
}

// Band definitions, quoted from lib/acca/case-marking.ts's own marking prompt. The next action
// is derived from these rather than from any reading of the answer — that is what makes it
// traceable to `band_definition` instead of being an opinion about the work.
const ACTION_BY_BAND: Record<string, string> = {
  exemplary: 'Nothing to change here — carry this approach into the requirements below.',
  strong:    'Nothing to change here — the gaps the marker noted are immaterial.',
  competent: 'The approach was right and a material point was missed. Close that one point, named above, and re-attempt this requirement.',
  weak:      'Re-work this requirement from the method up, against the point named above, before re-attempting it.',
  nothing:   'Re-work this requirement from the method up — the marker recorded nothing that could earn credit.',
};

const round1 = (n: number): number => Math.round(n * 10) / 10;
const name = (r: { label: string | null; paper_order: number }): string =>
  r.label && r.label.trim() ? r.label.trim() : `requirement ${r.paper_order}`;

function verdictFor(band: string | null, state: AnswerState | null, lost: number | null): DebriefVerdict {
  if (state === 'not_reached') return 'not_reached';
  if (band === 'exemplary' || band === 'strong') return 'strong';
  if (band === 'nothing') return 'lost';
  if (lost !== null && lost === 0) return 'strong';
  return 'partial';
}

/**
 * PURE. Build the debrief.
 *
 * `pacing` is the report from computePacing. Marks come from the marking output. The two are
 * joined on paper_order and kept in separate fields throughout.
 */
export function buildDebrief(
  requirements: DebriefRequirementInput[],
  cases: DebriefCaseInput[],
  pacing: PacingReport,
): DebriefReport {
  const limitations: string[] = [];
  const empty: DebriefReport = {
    not_evaluated: null,
    headline: { code: 'none', statement: '', source: 'computed_marks', evidence: {} },
    requirements: [], professional: [],
    totals: { technical_awarded: null, technical_available: 0, professional_awarded: null, professional_available: null },
    limitations,
  };

  if (requirements.length === 0) return { ...empty, not_evaluated: 'no requirements supplied' };
  if (pacing.not_evaluated) {
    limitations.push(`Pacing could not be computed (${pacing.not_evaluated}), so no interval is reported.`);
  }

  const ordered = [...requirements].sort((a, b) => a.paper_order - b.paper_order);
  const pacingByOrder = new Map(pacing.rows.map((r) => [r.paper_order, r]));
  const anyMarked = ordered.some((r) => r.band !== null || r.marks_awarded !== null);
  if (!anyMarked) limitations.push('This attempt has not been marked, so the debrief reports pacing only.');

  // ── Per-requirement lines ──
  const lines: DebriefRequirementLine[] = ordered.map((r) => {
    const p = pacingByOrder.get(r.paper_order) ?? null;
    const state = p?.answer_state ?? null;
    const lost = r.marks_awarded === null ? null : r.marks_available - r.marks_awarded;
    const verdict = verdictFor(r.band, state, lost);

    // WHAT — arithmetic only.
    let what: string;
    if (state === 'not_reached') {
      what = `No answer was recorded. All ${r.marks_available} marks were unavailable.`;
    } else if (r.marks_awarded === null) {
      what = `${r.marks_available} marks available. Not yet marked.`;
    } else if (lost === 0) {
      what = `${r.marks_awarded} of ${r.marks_available} marks.`;
    } else {
      what = `${r.marks_awarded} of ${r.marks_available} marks — ${lost} lost.`;
    }

    // WHY — the marker's own words, verbatim, or nothing at all.
    const fb = r.marker_feedback?.trim();
    const why = fb && fb.length > 0 ? fb : null;

    // NEXT ACTION — from the band's published definition, or from the pacing data for a
    // requirement that was never reached. Never from a reading of the answer.
    let action: string;
    let actionSource: DebriefSource;
    if (state === 'not_reached') {
      const budget = p ? p.budget_minutes : round1(r.marks_available * 1.95);
      action = `Reach this requirement next time: it carries ${r.marks_available} marks and a ${budget}-minute budget.`;
      actionSource = 'computed_interval';
    } else if (r.band && ACTION_BY_BAND[r.band]) {
      action = ACTION_BY_BAND[r.band];
      actionSource = 'band_definition';
    } else {
      action = 'Not yet marked — no action can be set for this requirement.';
      actionSource = 'computed_marks';
    }

    // PACING — a separate, adjacent statement. Never causal, never "time spent writing".
    let pacingNote: string | null = null;
    if (p && p.interval_minutes !== null) {
      if (p.flag === 'no_ratio') {
        pacingNote = `${p.interval_minutes} minutes elapsed between starting the paper and submitting ${name(r)}. This interval includes reading the scenario and exhibits, so it carries no budget comparison.`;
      } else if (p.flag === 'over' || p.flag === 'under' || p.flag === 'on_budget') {
        const prev = ordered[ordered.findIndex((x) => x.paper_order === r.paper_order) - 1];
        const from = prev ? `submitting ${name(prev)}` : 'starting the paper';
        pacingNote = `${p.interval_minutes} minutes elapsed between ${from} and submitting ${name(r)}, against a ${p.budget_minutes}-minute budget.`;
      }
    }

    return {
      paper_order: r.paper_order,
      requirement_id: r.requirement_id,
      label: r.label,
      verdict,
      marks_awarded: r.marks_awarded,
      marks_available: r.marks_available,
      marks_lost: lost,
      band: r.band,
      what_was_lost: what,
      why,
      why_source: why ? 'marker_verdict' : null,
      next_action: action,
      next_action_source: actionSource,
      pacing_note: pacingNote,
      pacing_flag: p?.flag ?? null,
      answer_state: state,
    };
  });

  // ── Professional skills — the marker's own words, verbatim ──
  const professional = cases.map((c) => ({
    case_id: c.case_id,
    title: c.title,
    awarded: c.professional_marks_awarded,
    available: c.professional_marks_available,
    skills: c.per_skill.map((s) => ({
      skill: s.skill, band: s.band, why: s.feedback, why_source: 'marker_verdict' as DebriefSource,
    })),
  }));

  // ── THE HEADLINE — one, not eight ─────────────────────────────────────────
  // Priority: the paper-level PATTERN outranks any single requirement, because a collapse
  // explains a shape that eight separate ratios do not. Only when there is no such pattern
  // does the largest single mark loss lead.
  const collapse = pacing.findings.find((f) => f.code === 'end_of_paper_collapse');
  const marked = lines.filter((l) => l.marks_lost !== null);
  const biggest = marked.length
    ? marked.reduce((a, b) => ((b.marks_lost ?? 0) > (a.marks_lost ?? 0) ? b : a))
    : null;

  let headline: DebriefHeadline;
  if (collapse) {
    headline = {
      code: 'end_of_paper_collapse',
      statement: collapse.statement,          // reused VERBATIM — cannot drift out of compliance
      source: 'pacing_finding',
      evidence: collapse.evidence,
    };
  } else if (biggest && (biggest.marks_lost ?? 0) > 0) {
    headline = {
      code: 'largest_single_loss',
      statement: `The largest single loss was ${biggest.marks_lost} of ${biggest.marks_available} marks on ${name(biggest)}.`,
      source: 'computed_marks',
      evidence: { paper_order: biggest.paper_order, marks_lost: biggest.marks_lost, marks_available: biggest.marks_available, band: biggest.band },
    };
  } else if (marked.length > 0) {
    headline = {
      code: 'no_marks_lost',
      statement: 'No technical marks were lost on any requirement.',
      source: 'computed_marks',
      evidence: {},
    };
  } else {
    headline = {
      code: 'pacing_only',
      statement: 'This attempt has not been marked. Pacing is reported on its own.',
      source: 'computed_marks',
      evidence: {},
    };
  }

  // ── Totals — facts, not a grade ──
  const technicalAwarded = marked.length ? marked.reduce((a, l) => a + (l.marks_awarded ?? 0), 0) : null;
  const technicalAvailable = ordered.reduce((a, r) => a + r.marks_available, 0);
  const psAwarded = cases.some((c) => c.professional_marks_awarded !== null)
    ? cases.reduce((a, c) => a + (c.professional_marks_awarded ?? 0), 0) : null;
  const psAvailable = cases.some((c) => c.professional_marks_available !== null)
    ? cases.reduce((a, c) => a + (c.professional_marks_available ?? 0), 0) : null;

  if (lines.some((l) => l.why === null && l.answer_state !== 'not_reached' && l.band !== null)) {
    limitations.push('One or more marked requirements carry no marker reasoning, so no "why" is shown for them.');
  }

  return {
    not_evaluated: null,
    headline,
    requirements: lines,
    professional,
    totals: {
      technical_awarded: technicalAwarded,
      technical_available: technicalAvailable,
      professional_awarded: psAwarded,
      professional_available: psAvailable,
    },
    limitations,
  };
}
