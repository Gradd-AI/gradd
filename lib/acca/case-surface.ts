// lib/acca/case-surface.ts — WHAT THE EXAM-CASE SURFACE SAYS, PER PAPER.
//
// PURE. No I/O, no React, no next/navigation — callers hand in the raw values the route
// gives them (a search param, a DB column) and get back a paper or a label, so the whole
// rule is fixturable (`npm run test:case-surface`) against the SAME input shapes production
// builds (P-G6).
//
// ── THE DEFECT THIS EXISTS TO CLOSE ─────────────────────────────────────────────────────
// `/acca/cases` was built when ACCA meant APM, and it said so in FIVE independent places:
// the list fetch (`?paper=APM`), the load fetch, the turn/mark request bodies, the two
// breadcrumbs ("ACCA APM"), the two page titles ("APM Exam Cases"), and a `SECTION_NAME`
// table holding APM's four-section taxonomy. Five published AFM cases have been servable
// through `/api/acca/case/list?paper=AFM` the whole time — the API was paper-scoped from
// the day it was written — and NOTHING reached them, because one hardcoded literal in the
// client decided the question for the whole surface.
//
// Threading a `paper` prop fixes the fetch. It does not fix the LABELS, and the labels are
// where a second literal would have been quietly added: `SECTION_NAME['E']` is undefined in
// APM's table, and AFM's live cases anchor on E2 — so an AFM student would have reached the
// right cases under an APM heading with a blank section name. The prop and the labels are
// one fact about one surface, so they resolve from one module.
//
// ⚠️ CLAIM CEILING. Everything here is a LABEL or a DEFAULT. None of it is an entitlement
// decision: the routes gate on `strictPaper`, which REFUSES rather than defaulting, and
// must keep doing so. A function in this file that returns `DEFAULT_PAPER` for junk is
// correct for choosing what to render and would be a hole in an authorisation gate.

import { DEFAULT_PAPER, servedPaper, type AccaPaper, type ServedPaper } from './paper';

/**
 * Shared coercion: a SERVED paper, else the default. Never throws, never null.
 *
 * ⚠️ `servedPaper`, NOT `strictPaper` (corrected 2026-08-18 when SBL was declared). This
 * function decides what to RENDER, and `strictPaper` now returns 'SBL' — a paper with no cases,
 * no list and no titles. `?paper=SBL` would have rendered an SBL-headed page over an empty
 * fetch. Falling back to the default keeps the surface's existing "unrecognised → default"
 * posture, which is the whole contract of this module.
 */
function paperOrDefault(raw: unknown): ServedPaper {
  return servedPaper(raw) ?? DEFAULT_PAPER;
}

/**
 * The paper a `?paper=` search param names, for a surface that RENDERS one paper.
 *
 * ⚠️ WHY NOT `resolvePaper` DIRECTLY — the input shape is the point (P-G6). Next hands a
 * page `searchParams` as `{ [key: string]: string | string[] | undefined }`, and
 * `resolvePaper` tests `raw === 'AFM'` against that value, so TWO shapes a real URL
 * produces both resolve silently to APM:
 *   • `?paper=AFM&paper=AFM` → `['AFM','AFM']`, an ARRAY, never `=== 'AFM'`;
 *   • `?paper=afm` → a hand-typed lowercase param, also never `=== 'AFM'`.
 * Neither is hypothetical on a link a student can edit or a bookmark that got duplicated,
 * and both would render the AFM student an APM page with no error anywhere. `strictPaper`
 * already trims and upper-cases; this adds the array rule and the render-time default.
 *
 * `resolvePaper` stays correct where it is used — a request BODY field, machine-written by
 * our own client, where the value is always the exact string `paperHref` wrote.
 */
export function paperFromRouteParam(raw: string | string[] | undefined): ServedPaper {
  return paperOrDefault(Array.isArray(raw) ? raw[0] : raw);
}

/**
 * The paper an ID-ADDRESSED case belongs to, read off its own row.
 *
 * A case id is a globally-unique primary key, so `/acca/cases/<id>` carries no `?paper=`
 * and must not start carrying one (`lib/acca/paper-url.ts` lists ID-ADDRESSED as one of
 * the three categories that stay bare). The id therefore DETERMINES the paper, and the
 * only honest source is `acca_cases.paper_code`. A param would be a second source of truth
 * for a fact the row already owns — and a bare bookmark to an AFM case would resolve to
 * APM and 404 against `.eq('paper_code', …)`, which is the bug in a different costume.
 *
 * A missing/unreadable row (deleted, unpublished, malformed id) falls back to the default
 * rather than throwing: the page renders its normal shell and the case-load route returns
 * its normal 404, so refusal keeps the uniform posture it already had.
 */
export function paperForCaseRow(paperCode: unknown): ServedPaper {
  return paperOrDefault(paperCode);
}

/**
 * Syllabus-section names, per paper, keyed by the section letter.
 *
 * ⚠️ TWO DIFFERENT THINGS ARE CALLED "SECTION" ON A CASE CARD, and they are not the same
 * column. `acca_cases.section` is the EXAM section (A = the 50-mark compulsory case, B =
 * a 25-mark case) and is rendered as "Section A — 50 marks". `anchor_area` is the SYLLABUS
 * area ('B3', 'E2'), whose leading letter keys THIS table. Only the second is a taxonomy,
 * and only the second differs between papers.
 *
 * APM: mirrors AreaPicker's `APM_SECTIONS` (a client component, not importable here).
 * AFM: mirrors `scripts/afm-framework.ts` SECTIONS A–E, which is extracted from the ACCA
 * syllabus guide pp. 6–7 and is the canonical wording — `test-case-surface.ts` imports it
 * and asserts the two agree, so this copy cannot drift from it silently. F (professional
 * skills) and G (employability) are omitted deliberately: they are skills, not content
 * areas, and no case anchors on one.
 */
export const CASE_SECTION_NAMES: Record<AccaPaper, Record<string, string>> = {
  APM: {
    A: 'Strategic management and value creation',
    B: 'Performance optimisation',
    C: 'Performance reporting',
    D: 'Data science and technology',
    E: 'Professional skills',
  },
  AFM: {
    A: 'Role of the senior financial adviser in the multinational organisation',
    B: 'Advanced investment appraisal',
    C: 'Acquisitions and mergers',
    D: 'Corporate reconstruction and re-organisation',
    E: 'Treasury and advanced risk management techniques',
  },
  // SBL: mirrors `scripts/sbl-framework.ts` SECTIONS A–H, machine-parsed from the study guide.
  // `test-case-surface.ts` asserts the two agree, exactly as it does for AFM. Sections I
  // (professional skills) and J (employability and digital skills) are omitted on the same
  // principle as AFM's F/G: they are skills, not content areas, and no case anchors on one.
  //
  // ⚠️ EIGHT SECTIONS, NOT FIVE. Every other paper here stops at E. Nothing in this module
  // assumes five, but a reader who has only seen APM and AFM will, so it is said out loud.
  SBL: {
    A: 'Leadership',
    B: 'Governance and sustainability',
    C: 'Strategy',
    D: 'Risk',
    E: 'Technology and data analytics',
    F: 'Organisational control and audit',
    G: 'Finance in planning and decision-making',
    H: 'Enabling success, managing change and innovation',
  },
};

/**
 * The syllabus-section name behind a case's `anchor_area`, for the card's tooltip.
 *
 * Takes the column AS STORED — `string | null`, and empty on the 50-mark section-A cases,
 * which is what the live rows actually hold. Returns '' for absent/unknown rather than
 * throwing or rendering "undefined": the tooltip is decoration, and a missing one must
 * never be the thing that breaks a card.
 */
export function caseSectionName(paper: AccaPaper, anchorArea: string | null | undefined): string {
  const letter = (anchorArea ?? '').trim().charAt(0).toUpperCase();
  return CASE_SECTION_NAMES[paper][letter] ?? '';
}

/** `<title>`/description for the case LIST page. */
export function caseListMetadata(paper: AccaPaper): { title: string; description: string } {
  return {
    title: `${paper} Exam Cases — Gradd AI`,
    description:
      `Full ${paper} exam cases — shared scenario, linked requirements, and professional-skills `
      + 'marking. Coached end-to-end by Ezra.',
  };
}

/** `<title>`/description for a single case. */
export function caseDetailMetadata(paper: AccaPaper): { title: string; description: string } {
  return {
    title: `${paper} Exam Case — Ezra | Gradd`,
    description:
      `Work a full ${paper} exam case with Ezra — shared scenario, linked requirements, and `
      + 'professional-skills marking on your whole answer.',
  };
}
