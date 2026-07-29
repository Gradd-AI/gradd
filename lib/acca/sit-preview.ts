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

// ── Paper config (code config, not a table — same pattern as lib/acca/mocks.ts) ──
export interface SitPaper {
  id: string;              // stable identifier, distinct from every MOCK_PAPERS id
  paper: 'AFM';
  title: string;
  case_ids: string[];      // sat in this order: Section A first, then the two Section B
}

// `id` is deliberately NOT 'paper-1' (which lib/acca/mocks.ts already uses for the APM
// paper). getMockPaper('afm-paper-1') returns null, so an attempt row written by this
// sit is ignored by the APM runner instead of being mistaken for an APM attempt.
//
// This stays a SEPARATE config from MOCK_PAPERS while the two runners are separate. The
// next change-set generalises SitRunner to serve both papers (Grant-ruled 2026-07-29);
// merging the two configs belongs to that step, not this one.
export const AFM_MOCK_PAPER_1: SitPaper = {
  id: 'afm-paper-1',
  paper: 'AFM',
  title: 'AFM Mock Paper 1',
  case_ids: [
    'aa000000-0000-4000-8000-00000000a001', // Solenne Industries SA — Section A (50 marks)
    'aa000000-0000-4000-8000-00000000b101', // Brecon Renewables plc — Section B (25 marks)
    'aa000000-0000-4000-8000-00000000b201', // Aldebrino SpA         — Section B (25 marks)
  ],
};

// ── The serving gate, as DATA ────────────────────────────────────────────────
// The gate used to be four inline `.eq()` calls in the route, which is exactly the shape
// that cannot be unit-tested: a fixture would have to re-state the conditions and would
// then be testing its own copy, not the route's. So the gate is declared ONCE here and
// the route builds its filters BY ITERATING THIS OBJECT. Editing it changes both the
// query and the fixtures together — there is no second copy to drift.
//
// This is the standard gate, not the retired inverted one. `published: true` and
// `status: 'approved'` are the two values whose inversion was the publish-flip trap; a
// fixture below pins the retired combination as one that must NOT pass.
export const SIT_CASE_GATE = {
  paper_code: AFM_MOCK_PAPER_1.paper,   // 'AFM' — one source, never re-typed
  mock_only:  true,                     // keeps these cases out of the practice library
  status:     'approved',
  published:  true,
} as const;

export type SitCaseGateRow = Partial<Record<keyof typeof SIT_CASE_GATE, unknown>>;

/** True only when a case row satisfies EVERY gate column. Same conditions the route's
 *  query applies, from the same object — this is a predicate over an already-fetched row,
 *  used by the fixtures and available to any caller that has the row in hand. */
export function isSittableCaseRow(row: SitCaseGateRow | null | undefined): boolean {
  if (!row) return false;
  return (Object.keys(SIT_CASE_GATE) as Array<keyof typeof SIT_CASE_GATE>)
    .every((k) => row[k] === SIT_CASE_GATE[k]);
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
// label — an AFM syllabus code is `<A-E><digit(s)><optional letter>`, a shape nothing
// else in a label ("(i)", "10 marks") can take.
const LO_CODE_SHAPE = /\b[A-E][0-9]{1,2}[a-z]?\b/g;

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
