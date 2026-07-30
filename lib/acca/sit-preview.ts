// lib/acca/sit-preview.ts
// Pure paper config + display/resume helpers for the AFM Mock Paper 1 SIT surface. No
// DB, no model, no I/O — the server page and the API route both import these, so the
// behaviour is testable in isolation and provably identical in both places.
//
// ── THE INVERTED GATE IS RETIRED (2026-07-29) ────────────────────────────────
// This module used to define the INVERSE of every other serving gate: a case was
// sit-servable only while it was UNPUBLISHED (`published=false AND status='candidate'`),
// and access was a one-entry email allowlist. That was correct while the paper was
// unadjudicated pre-release content, and it had a fatal end-state: flipping the three
// cases to `approved`/`published=true` would have made the gate stop matching and 404
// the surface. Publishing the paper would have BROKEN it. That was the publish-flip trap.
//
// Both halves are now gone. `app/api/acca/sit/route.ts` gates on the STANDARD
// `status='approved' AND published=true` like every other case route, behind the same
// APM_CASES flag and the same `hasActiveAPMAccess` entitlement, and the allowlist is
// deleted — the sit surface is the real product surface, reachable by any entitled
// student. Answer writes go through `app/api/acca/case/turn` (sitting:true), the same
// route the APM sit uses, so there is ONE write path and one immutability rule.
//
// CONSEQUENCE, deliberate and load-bearing: until the three cases are flipped to
// approved/published the surface serves NOTHING (404 "Paper not available"). The gate
// change and the content flip are separate steps by design — P-DB2 governs the flip and
// it is Grant's, taken after the end-to-end walk, not something this code performs.
//
// `mock_only=true` is still asserted. That was never the inverted part: it keeps the
// paper's cases out of the practice library (which lists `mock_only=false`) and keeps a
// non-paper case from being posted into the sit by id.

// ── Paper config lives in lib/acca/mocks.ts, not here (merged 2026-07-30) ────
// `AFM_MOCK_PAPER_1` and its `SitPaper` type are DELETED. SitRunner serves both papers,
// so a second registry would be a second place for a case id to be wrong. `MOCK_PAPERS`
// is the one list; this module keeps only the paper-AGNOSTIC sit helpers (the gate, the
// label derivation, resume, the clock). The import direction flipped with the merge —
// mocks.ts no longer imports this module, so there is no cycle.
import type { AccaPaper } from '@/lib/acca/paper';
export { getMockPaper as getSitPaper, getMockPapers as getSitPapers, type MockPaper as SitPaper } from '@/lib/acca/mocks';

// ── The serving gate, as DATA ────────────────────────────────────────────────
// The gate used to be four inline `.eq()` calls in the route, which is exactly the shape
// that cannot be unit-tested: a fixture would have to re-state the conditions and would
// then be testing its own copy, not the route's. So the gate is built ONCE here and the
// route builds its filters BY ITERATING IT. Editing this changes both the query and the
// fixtures together — there is no second copy to drift.
//
// NOW PAPER-SCOPED (2026-07-30). It was a frozen object carrying `paper_code: 'AFM'`,
// which is exactly the hardcoding that bound the sit route to one paper. It is a FUNCTION
// of the paper being sat, so serving APM cannot silently apply AFM's filter.
//
// This is the standard gate, not the retired inverted one. `published: true` and
// `status: 'approved'` are the two values whose inversion was the publish-flip trap; a
// fixture pins the retired combination as one that must NOT pass.
export function sitCaseGate(paper: AccaPaper) {
  return {
    paper_code: paper,
    mock_only:  true,                   // keeps these cases out of the practice library
    status:     'approved',
    published:  true,
  } as const;
}

export type SitCaseGate = ReturnType<typeof sitCaseGate>;
export type SitCaseGateRow = Partial<Record<keyof SitCaseGate, unknown>>;

/** True only when a case row satisfies EVERY gate column for that paper. Same conditions
 *  the route's query applies, from the same object — a predicate over an already-fetched
 *  row, used by the fixtures and available to any caller holding the row. */
export function isSittableCaseRow(
  row: SitCaseGateRow | null | undefined,
  paper: AccaPaper,
): boolean {
  if (!row) return false;
  const gate = sitCaseGate(paper);
  return (Object.keys(gate) as Array<keyof SitCaseGate>).every((k) => row[k] === gate[k]);
}

// ── Requirement label — candidate-facing form ────────────────────────────────
// Stored labels carry the internal syllabus code: "(i) B3e — 10 marks". A real ACCA
// paper never prints that — it states the part and its marks and nothing else. So the
// candidate must see "(i) — 10 marks".
//
// DISPLAY-DERIVATION ONLY. The stored `label` and `lo_code` columns are untouched, so
// marking and debrief still read the code straight off the row. This function is applied
// at the SERVE boundary (app/api/acca/sit/route.ts), not in the component, so the code
// never reaches the browser at all — stripping it in the UI would still ship it in the
// JSON payload, which is the same disclosure with an extra step.
//
// Removal is precise where possible: the row's own `lo_code` is removed by exact match.
// The generic sweep is a backstop for a row whose code is absent or disagrees with the
// label — an ACCA syllabus code is `<A-E><digit(s)><optional letter>` in BOTH papers, a
// shape nothing else in a label ("(i)", "10 marks") can take.
//
// ── THE MARKS COME OUT TOO NOW (2026-07-30) ──────────────────────────────────
// The label is reduced to THE PART ALONE — "(i)". Marks are served separately from the
// `marks_guide` COLUMN and the runner composes "(i) — 10 marks" for display.
//
// Why, given the marks are authentic and were already showing: they were showing only
// because AFM's stored labels happen to spell them in prose. APM's labels do not, so the
// same route served marks for one paper and not the other — parity by formatting accident,
// which breaks the moment a label is re-authored without its marks. Taking marks from the
// column makes both papers right for the same reason.
const LO_CODE_SHAPE = /\b[A-E][0-9]{1,2}[a-z]?\b/g;
// "— 10 marks", "- 1 mark", "(12 marks)" — the marks phrase in any authored form.
const MARKS_PHRASE = /[([]?\s*\d+\s*marks?\s*[)\]]?/gi;

function escapeForRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function sitDisplayLabel(
  label: string | null | undefined,
  loCode?: string | null,
): string | null {
  if (typeof label !== 'string') return null;

  let out = label;
  if (typeof loCode === 'string' && loCode.trim()) {
    out = out.replace(new RegExp(`\\b${escapeForRegExp(loCode.trim())}\\b`, 'gi'), '');
  }
  out = out.replace(LO_CODE_SHAPE, '');
  out = out.replace(MARKS_PHRASE, '');

  // Tidy what the removal left behind: doubled spaces, and a separator now dangling at
  // either end (a label of "B3e — 10 marks" would otherwise render as "— 10 marks").
  out = out.replace(/\s+/g, ' ').trim();
  out = out.replace(/^[—–\-·:|]+\s*/, '').trim();
  out = out.replace(/\s*[—–\-·:|]+$/, '').trim();

  // A label that was ONLY a code has nothing candidate-facing left to say — return null
  // so the UI renders no chip at all rather than an empty one.
  return out === '' ? null : out;
}

// ── Resume ───────────────────────────────────────────────────────────────────
// The sit is strictly forward-only, so "where am I?" is fully determined by which
// requirements already have a recorded answer. Returns the index of the first slot
// with no recorded answer, or `slots.length` when the whole paper is submitted.
//
// Scans from the START and stops at the first gap rather than counting submissions:
// the two agree in normal play, but if a write ever landed out of order, stopping at
// the gap re-presents the UNANSWERED requirement, whereas counting would skip it.
export function nextUnsubmittedIndex(
  slotRequirementIds: readonly string[],
  submitted: ReadonlySet<string>,
): number {
  for (let i = 0; i < slotRequirementIds.length; i++) {
    if (!submitted.has(slotRequirementIds[i])) return i;
  }
  return slotRequirementIds.length;
}

export function isPaperComplete(
  slotRequirementIds: readonly string[],
  submitted: ReadonlySet<string>,
): boolean {
  return (
    slotRequirementIds.length > 0 &&
    nextUnsubmittedIndex(slotRequirementIds, submitted) === slotRequirementIds.length
  );
}

// ── Elapsed clock ────────────────────────────────────────────────────────────
// H:MM:SS, counting UP from the recorded start. There is no countdown and no
// auto-submit by spec, so this never needs a remaining-time or expiry branch.
// Clamped at zero so clock skew can never render a negative elapsed time.
export function fmtElapsed(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${h}:${pad(m)}:${pad(s)}`;
}
