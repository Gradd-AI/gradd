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
// cross-candidate comparison. The approved interval VOCABULARY is reused exactly — "between
// {submitting X | starting the paper} and {submitting Y | finishing}", "minutes elapsed",
// "against a … budget" — so the statements cannot drift out of compliance.
//
// ── NAMING: THE STUDENT NEVER SEES AN INTERNAL CODE ──────────────────────────
// A requirement's stored `label` is "(i) B3e — 10 marks": it carries the LO code the sit route
// strips at the serve boundary, plus a marks count that duplicates the marks line. Printing it
// here would re-leak exactly what `sitDisplayLabel` removes. Every student-facing reference goes
// through `display_name` — "Q1 (i)": case position + part, no code, no marks. INCLUDING the
// headline, which previously reused the pacing finding's own "requirements 7–8" ordinals — a
// naming scheme used nowhere else in the document, so it referred to nothing the student could
// find. The collapse headline is therefore COMPOSED HERE from the finding's `evidence`, in the
// approved vocabulary, with display names. That is a re-render of the same finding, not a
// re-wording of it: no number and no relation changes.
//
// ── THE COLLAPSE HEADLINE IS SELECTED, NOT MERGED ────────────────────────────
// A collapse leads ONLY when its own window lost marks or contains a requirement that was never
// reached. Finishing the last two requirements quickly and scoring full marks on them is a fact
// about pacing, not the story of the paper — it is reported as `secondary`, never as the headline.
// This is a SELECTION rule: it reads the marks to decide WHICH finding leads, and still prints
// marks and pacing as separate statements. Nothing is combined into a score.

import type { PacingReport, PacingFlag, AnswerState } from '@/lib/acca/pacing';
// Durations reach the student through this module too, so they go through the SAME formatters
// pacing.ts uses — whole minutes, rounded down, "under a minute" at zero. A second rounding
// convention here would put two different renderings of the same interval on one screen.
import { fmtMinutes, fmtMinuteBudget } from '@/lib/acca/pacing';

/** Sentence-initial capitalisation. `fmtMinutes` returns lowercase because most of its call
 *  sites are mid-sentence; the pacing note is the one that opens with it. */
const sentenceCase = (s: string): string => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

export type DebriefVerdict = 'strong' | 'partial' | 'lost' | 'not_reached';

/** Where a statement came from. Every emitted line carries one — a debrief line with no
 *  traceable source is exactly the invented diagnosis this module exists to avoid. */
export type DebriefSource = 'marker_verdict' | 'computed_marks' | 'computed_interval' | 'band_definition';

export interface DebriefRequirementInput {
  requirement_id: string;
  case_id: string;                // REQUIRED — drives case grouping and the "Q<n>" display name
  paper_order: number;
  label: string | null;           // the STORED label; never printed — see `display_name`
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
  case_id: string;
  label: string | null;           // retained for traceability — NOT for display
  display_name: string;           // "Q1 (i)" — the ONLY safe student-facing reference
  verdict: DebriefVerdict;
  // ── marks ──
  marks_awarded: number | null;
  marks_available: number;
  marks_lost: number | null;
  band: string | null;
  what_was_lost: string;
  why: string | null;             // VERBATIM marker feedback, or null — ALWAYS the full string
  why_source: DebriefSource | null;
  /** Presentation only. 'collapsed' = render the justification behind an expand, because the band
   *  is strong/exemplary AND no marks were lost, so the short action carries the whole message.
   *  `why` is complete in BOTH states — this never truncates, elides or rewrites it. */
  why_display: 'expanded' | 'collapsed';
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

/** One case's requirements, grouped and subtotalled. Eight requirements printed flat put three
 *  lines beginning "(i)" next to each other with nothing to tell them apart; the paper is sat as
 *  three questions and is read back the same way. */
export interface DebriefCaseGroup {
  case_id: string;
  title: string | null;
  position: number;               // 1-based, in paper order
  display_name: string;           // "Q1"
  requirements: DebriefRequirementLine[];
  technical_awarded: number | null;
  technical_available: number;
}

export interface DebriefReport {
  not_evaluated: string | null;
  headline: DebriefHeadline;
  /** Findings that were true but did NOT earn the headline. A collapse whose window cost nothing
   *  lands here rather than leading. Same composer, same vocabulary — only the ranking differs. */
  secondary: DebriefHeadline[];
  requirements: DebriefRequirementLine[];
  cases: DebriefCaseGroup[];
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
// NO FORWARD REFERENCE. The exemplary action used to read "carry this approach into the
// requirements below", which is false on the last requirement of the paper and false again in any
// view that is not printed in paper order. The action must hold wherever the line is read.
const ACTION_BY_BAND: Record<string, string> = {
  exemplary: 'Nothing to change here — this is the approach to repeat.',
  strong:    'Nothing to change here — the gaps the marker noted are immaterial.',
  competent: 'The approach was right and a material point was missed. Close that one point, named above, and re-attempt this requirement.',
  weak:      'Re-work this requirement from the method up, against the point named above, before re-attempting it.',
  nothing:   'Re-work this requirement from the method up — the marker recorded nothing that could earn credit.',
};

const round1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * "Q1 (i)" — case position plus the part, and nothing else.
 *
 * The part is read from the stored label's leading roman-numeral bracket. That is the ONLY thing
 * taken from the label: the LO code and the "— N marks" suffix are discarded here rather than in
 * a renderer, so no caller can print them by accident. A label with no recognisable part falls
 * back to the paper ordinal, which is still code-free.
 */
function displayName(casePosition: number, label: string | null, paperOrder: number): string {
  const part = /\(([ivx]+)\)/i.exec(label ?? '')?.[1]?.toLowerCase();
  const q = casePosition > 0 ? `Q${casePosition}` : '';
  if (part) return q ? `${q} (${part})` : `(${part})`;
  return q ? `${q} requirement ${paperOrder}` : `requirement ${paperOrder}`;
}

/**
 * Re-render the end-of-paper-collapse finding using display names.
 *
 * NOT a re-wording. Every number, every relation and every phrase from the approved interval
 * vocabulary is preserved exactly as `pacing.ts` composes them — "between {…} and finishing",
 * "minutes elapsed across", "against a combined budget of", "recorded no answer that could earn
 * marks". The ONLY substitution is the requirement REFERENCE: pacing names the window by raw
 * paper ordinal ("requirements 7–8"), which appears nowhere else in the debrief and so points at
 * nothing the student can locate. Composing here from the same `evidence` is what lets the
 * headline agree with the lines beneath it.
 *
 * One correction of a latent pacing wording bug: where the window opens at requirement 1 there is
 * no previous requirement to have submitted, so the opening end is "starting the paper" — which is
 * in the approved vocabulary — rather than "the previous requirement".
 */
function composeCollapse(ev: Record<string, unknown>, nameOf: (order: number) => string): string {
  const triggers = Array.isArray(ev.triggers) ? (ev.triggers as string[]) : [];
  const parts: string[] = [];
  if (triggers.includes('time')) {
    const from = Number(ev.suffix_from);
    const to = Number(ev.suffix_to);
    const opens = from > 1 ? `submitting ${nameOf(from - 1)}` : 'starting the paper';
    const span = from === to ? nameOf(from) : `${nameOf(from)}–${nameOf(to)}`;
    parts.push(
      `Between ${opens} and finishing, ${fmtMinutes(Number(ev.suffix_actual_minutes))} elapsed across ` +
      `${span}, against a combined budget of ${fmtMinutes(Number(ev.suffix_budget_minutes))}.`,
    );
  }
  if (triggers.includes('no_credit_tail')) {
    const orders = Array.isArray(ev.closing_run_orders) ? (ev.closing_run_orders as number[]) : [];
    parts.push(
      `The final ${orders.length} requirement${orders.length === 1 ? '' : 's'} ` +
      `(${orders.map(nameOf).join(', ')}) recorded no answer that could earn marks.`,
    );
  }
  return `End-of-paper collapse. ${parts.join(' ')}`;
}

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
    secondary: [],
    requirements: [], cases: [], professional: [],
    totals: { technical_awarded: null, technical_available: 0, professional_awarded: null, professional_available: null },
    limitations,
  };

  if (requirements.length === 0) return { ...empty, not_evaluated: 'no requirements supplied' };
  if (pacing.not_evaluated) {
    limitations.push(`Pacing could not be computed (${pacing.not_evaluated}), so no interval is reported.`);
  }

  const ordered = [...requirements].sort((a, b) => a.paper_order - b.paper_order);
  const pacingByOrder = new Map(pacing.rows.map((r) => [r.paper_order, r]));

  // Case position = order of FIRST APPEARANCE in paper order, not the index in `cases`. A caller
  // may pass an incomplete `cases` array (it carries PS marks, which not every case has); the
  // student-facing numbering must not depend on that.
  const casePos = new Map<string, number>();
  for (const r of ordered) if (!casePos.has(r.case_id)) casePos.set(r.case_id, casePos.size + 1);
  const nameByOrder = new Map<number, string>(
    ordered.map((r) => [r.paper_order, displayName(casePos.get(r.case_id) ?? 0, r.label, r.paper_order)]),
  );
  const nameOf = (order: number): string => nameByOrder.get(order) ?? `requirement ${order}`;
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
      action = `Reach this requirement next time: it carries ${r.marks_available} marks and ${fmtMinuteBudget(budget)} budget.`;
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
    const self = nameOf(r.paper_order);
    if (p && p.interval_minutes !== null) {
      if (p.flag === 'no_ratio') {
        pacingNote = `${sentenceCase(fmtMinutes(p.interval_minutes))} elapsed between starting the paper and submitting ${self}. This interval includes reading the scenario and exhibits, so it carries no budget comparison.`;
      } else if (p.flag === 'over' || p.flag === 'under' || p.flag === 'on_budget') {
        const prev = ordered[ordered.findIndex((x) => x.paper_order === r.paper_order) - 1];
        const from = prev ? `submitting ${nameOf(prev.paper_order)}` : 'starting the paper';
        pacingNote = `${sentenceCase(fmtMinutes(p.interval_minutes))} elapsed between ${from} and submitting ${self}, against ${fmtMinuteBudget(p.budget_minutes)} budget.`;
      }
    }

    // Collapse the justification only where the short action already says everything: a
    // strong/exemplary band that lost nothing. A strong band that still dropped marks keeps the
    // full diagnosis open, because there is something in it to act on.
    const strongBand = r.band === 'strong' || r.band === 'exemplary';
    const whyDisplay: 'expanded' | 'collapsed' = why !== null && strongBand && lost === 0 ? 'collapsed' : 'expanded';

    return {
      paper_order: r.paper_order,
      requirement_id: r.requirement_id,
      case_id: r.case_id,
      label: r.label,
      display_name: self,
      verdict,
      marks_awarded: r.marks_awarded,
      marks_available: r.marks_available,
      marks_lost: lost,
      band: r.band,
      what_was_lost: what,
      why,
      why_source: why ? 'marker_verdict' : null,
      why_display: whyDisplay,
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
  // A paper-level PATTERN outranks any single requirement — but only a CONSEQUENTIAL one. A
  // collapse whose window neither lost marks nor left anything unanswered describes a finishing
  // speed, not a problem, and it is demoted to `secondary` so the real story leads.
  const collapse = pacing.findings.find((f) => f.code === 'end_of_paper_collapse');
  const marked = lines.filter((l) => l.marks_lost !== null);
  const biggest = marked.length
    ? marked.reduce((a, b) => ((b.marks_lost ?? 0) > (a.marks_lost ?? 0) ? b : a))
    : null;

  const secondary: DebriefHeadline[] = [];
  let collapseHeadline: DebriefHeadline | null = null;
  let collapseCosts = false;
  if (collapse) {
    const ev = collapse.evidence;
    const from = Number(ev.suffix_from ?? 0);
    const to = Number(ev.suffix_to ?? 0);
    const runOrders = Array.isArray(ev.closing_run_orders) ? (ev.closing_run_orders as number[]) : [];
    const window = new Set<number>(runOrders);
    if (from > 0 && to >= from) for (let i = from; i <= to; i++) window.add(i);

    // "Consequential" = inside the collapse's OWN window, marks were lost or an answer is missing.
    // An unmarked paper cannot be shown to be harmless, so a collapse still leads there.
    collapseCosts = lines.some((l) => window.has(l.paper_order) && (
      (l.marks_lost ?? 0) > 0 || l.marks_lost === null || l.answer_state === 'not_reached' || l.answer_state === 'blank'
    ));

    collapseHeadline = {
      code: 'end_of_paper_collapse',
      statement: composeCollapse(ev, nameOf),
      source: 'pacing_finding',
      evidence: { ...ev, window_costs_marks: collapseCosts },
    };
  }

  let headline: DebriefHeadline;
  if (collapseHeadline && collapseCosts) {
    headline = collapseHeadline;
  } else if (biggest && (biggest.marks_lost ?? 0) > 0) {
    if (collapseHeadline) secondary.push(collapseHeadline);
    headline = {
      code: 'largest_single_loss',
      statement: `The largest single loss was ${biggest.marks_lost} of ${biggest.marks_available} marks on ${biggest.display_name}.`,
      source: 'computed_marks',
      evidence: { paper_order: biggest.paper_order, marks_lost: biggest.marks_lost, marks_available: biggest.marks_available, band: biggest.band },
    };
  } else if (marked.length > 0) {
    if (collapseHeadline) secondary.push(collapseHeadline);
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

  // ── Case grouping + per-case subtotals ──
  // A subtotal is null when NOTHING in that case was marked; a case with a partly-marked set
  // subtotals what exists rather than reporting a total that silently counts unmarked work as 0.
  const titleById = new Map(cases.map((c) => [c.case_id, c.title]));
  const groups: DebriefCaseGroup[] = [...casePos.entries()]
    .sort((a, b) => a[1] - b[1])
    .map(([caseId, position]) => {
      const rows = lines.filter((l) => l.case_id === caseId);
      const scored = rows.filter((l) => l.marks_awarded !== null);
      return {
        case_id: caseId,
        title: titleById.get(caseId) ?? null,
        position,
        display_name: `Q${position}`,
        requirements: rows,
        technical_awarded: scored.length ? scored.reduce((a, l) => a + (l.marks_awarded ?? 0), 0) : null,
        technical_available: rows.reduce((a, l) => a + l.marks_available, 0),
      };
    });

  return {
    not_evaluated: null,
    headline,
    secondary,
    requirements: lines,
    cases: groups,
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
