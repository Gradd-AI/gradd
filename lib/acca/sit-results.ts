// lib/acca/sit-results.ts
// PURE assembly for the sit results screen. No DB, no model, no I/O — it takes rows the
// results route has already fetched and produces the two inputs the existing pure modules
// want: computePacing's requirement list and buildDebrief's requirement/case lists.
//
// It exists so the ONE thing the results route genuinely computes for itself — PAPER ORDER
// across three cases — is fixturable. Everything downstream of it (pacing, the debrief) is
// already pure and already has fixtures; this closes the last gap between "rows came back
// from Postgres" and "a debrief was built".
//
// ── PAPER ORDER IS THE PAPER'S ORDER, NOT THE DATABASE'S ─────────────────────
// `requirement_order` is scoped to its OWN case, so all three cases start at 1. Sorting the
// eight rows by that column alone interleaves the paper — Q1(i), Q2(i), Q3(i), Q1(ii)… —
// and every pacing interval computed from it would be measured between requirements the
// candidate never sat consecutively. The case sequence in MOCK_PAPERS is the authority for
// which case comes first; `requirement_order` orders within one case only. Rows whose
// case_id is not in the paper are DROPPED rather than appended: they are not part of this
// paper and would take a paper_order that shifts every interval after them.

import type { PacingInputRequirement } from '@/lib/acca/pacing';
import type { DebriefRequirementInput, DebriefCaseInput, DebriefSkillInput } from '@/lib/acca/debrief';

/** One requirement, as the results route reads it back: the authored side (label, marks)
 *  joined to this user's progress row (submission, marking output). */
export interface SitResultRow {
  requirement_id: string;
  case_id: string;
  requirement_order: number;
  label: string | null;
  lo_code: string | null;
  marks_guide: number | null;
  submitted_at: string | null;
  final_answer: string | null;
  band: string | null;
  technical_marks_awarded: number | null;
  technical_feedback: string | null;
}

export interface OrderedSitRow extends SitResultRow {
  paper_order: number;      // 1-based across the WHOLE paper
  case_position: number;    // 1-based, in paper order
}

/**
 * Put the paper in the order it was sat: case sequence first, `requirement_order` within
 * each case, numbered 1…N across the whole paper.
 */
export function orderPaper(
  caseIds: readonly string[],
  rows: readonly SitResultRow[],
): OrderedSitRow[] {
  const out: OrderedSitRow[] = [];
  let order = 0;
  caseIds.forEach((caseId, idx) => {
    const inCase = rows
      .filter((r) => r.case_id === caseId)
      .sort((a, b) => a.requirement_order - b.requirement_order);
    for (const r of inCase) {
      order += 1;
      out.push({ ...r, paper_order: order, case_position: idx + 1 });
    }
  });
  return out;
}

/** Marks a requirement is worth. Null `marks_guide` is 0 available, not "unknown": a
 *  requirement with no authored allocation cannot contribute marks to a total, and treating
 *  it as unknown would make every paper total null. */
const marksOf = (r: SitResultRow): number =>
  typeof r.marks_guide === 'number' && Number.isFinite(r.marks_guide) ? r.marks_guide : 0;

export function toPacingInputs(rows: readonly OrderedSitRow[]): PacingInputRequirement[] {
  return rows.map((r) => ({
    requirement_id: r.requirement_id,
    paper_order: r.paper_order,
    label: r.label,
    marks_available: marksOf(r),
    submitted_at: r.submitted_at,
    final_answer: r.final_answer,
    band: r.band,
    marks_awarded: r.technical_marks_awarded,
  }));
}

export function toDebriefRequirements(rows: readonly OrderedSitRow[]): DebriefRequirementInput[] {
  return rows.map((r) => ({
    requirement_id: r.requirement_id,
    case_id: r.case_id,
    paper_order: r.paper_order,
    label: r.label,
    marks_available: marksOf(r),
    // A requirement that was never marked reads back null, and the debrief says "not yet
    // marked" rather than scoring it 0. Do not coalesce this.
    marks_awarded: r.technical_marks_awarded,
    band: r.band,
    marker_feedback: r.technical_feedback,
  }));
}

/** The persisted PS half: one acca_case_marking row per case, whose `per_skill` jsonb
 *  carries {skill, band, feedback} (plus the apportioned mark, which is NOT surfaced). */
export interface SitCaseMarkingRow {
  case_id: string;
  professional_marks_awarded: number | null;
  professional_marks_available: number | null;
  per_skill: unknown;
}

/** Defensive read of the jsonb column. A row written by an older shape, or hand-edited,
 *  must degrade to "no skills reported" rather than throw inside a results render. */
export function readPerSkill(raw: unknown): DebriefSkillInput[] {
  if (!Array.isArray(raw)) return [];
  const out: DebriefSkillInput[] = [];
  for (const item of raw) {
    const o = item as { skill?: unknown; band?: unknown; feedback?: unknown };
    if (typeof o?.skill !== 'string' || typeof o?.band !== 'string') continue;
    out.push({
      skill: o.skill,
      band: o.band,
      feedback: typeof o.feedback === 'string' ? o.feedback : '',
    });
  }
  return out;
}

export function toDebriefCases(
  caseIds: readonly string[],
  titles: ReadonlyMap<string, string | null>,
  marking: readonly SitCaseMarkingRow[],
): DebriefCaseInput[] {
  const byCase = new Map(marking.map((m) => [m.case_id, m]));
  return caseIds.map((caseId) => {
    const m = byCase.get(caseId);
    return {
      case_id: caseId,
      title: titles.get(caseId) ?? null,
      professional_marks_awarded: m?.professional_marks_awarded ?? null,
      professional_marks_available: m?.professional_marks_available ?? null,
      per_skill: readPerSkill(m?.per_skill),
    };
  });
}

/**
 * Has this paper been sat to the end? Every requirement carries a recorded answer.
 *
 * `!= null` and not truthiness: a BLANK answer ('') is a final, zero-credit submission and
 * completes the paper exactly as a written one does. The same test the sit route and the
 * mark gate use, for the same reason.
 */
export function paperFullySubmitted(rows: readonly SitResultRow[]): boolean {
  return rows.length > 0 && rows.every((r) => r.final_answer != null);
}

/** Which cases still need marking. A case is marked when its acca_case_marking row exists
 *  AND carries a technical total — the PS half alone is a PRACTICE mark and does not
 *  produce the per-requirement bands a sit debrief is built from. */
export function casesNeedingMarking(
  caseIds: readonly string[],
  marking: readonly { case_id: string; technical_marks_available: number | null }[],
): string[] {
  const marked = new Set(
    marking.filter((m) => m.technical_marks_available != null).map((m) => m.case_id),
  );
  return caseIds.filter((id) => !marked.has(id));
}
