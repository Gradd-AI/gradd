// lib/acca/sit-preview.ts
// Pure preview-gate + paper config for the AFM Mock Paper 1 SIT surface. No DB, no
// model, no I/O — the server page and the API route both import these, so the gate
// decision is testable in isolation and provably identical in both places.
//
// ── WHY THIS IS A SEPARATE SURFACE (not the APM mock runner) ──────────────────
// Every live serving route gates on `status='approved' AND published=true`. AFM Mock
// Paper 1 is `candidate` / `published=false` / `mock_only=true` by design — it has not
// been adjudicated — so NO live route can serve it, and none was modified to try.
//
// This module defines the INVERSE gate: a case is sit-servable only while it is
// UNPUBLISHED. The two sets are therefore disjoint by construction —
//   • this surface structurally cannot serve live published content;
//   • the live routes structurally cannot serve this mock.
// That is the whole reason the sit does not reuse app/api/acca/case/*: making those
// routes serve candidate rows would have put unpublished-content access into the code
// path that serves every paying student. Nothing here touches that path.
//
// The APM timed-mock runner is also deliberately untouched: it renders a COUNTDOWN,
// a results screen and per-case marking, all three of which this sit excludes by spec
// (elapsed timer only, no auto-submit, no marks, no feedback). `MOCK_SIT_MODE` in
// app/acca/mock/MockRunner.tsx stays FALSE — that flag belongs to the APM paper.

// ── Preview allowlist ────────────────────────────────────────────────────────
// Ruled by Grant 2026-07-25: the AFM sit preview is reachable by the student test
// account ONLY. Matches the repo's established gate idiom (the ADMIN_EMAIL constant
// in app/api/admin/questions/route.ts) rather than inventing an env var that would
// have to be set on Vercel before the surface could be reached at all.
//
// A non-allowlisted user gets 404, never 403: the surface is INVISIBLE, not merely
// forbidden. A 403 would confirm that an unpublished AFM paper exists at this path.
export const SIT_PREVIEW_EMAILS: readonly string[] = ['erasmoose@outlook.ie'];

export function canPreviewSit(email: string | null | undefined): boolean {
  if (typeof email !== 'string') return false;
  const normalised = email.trim().toLowerCase();
  if (!normalised) return false;
  return SIT_PREVIEW_EMAILS.some((allowed) => allowed.toLowerCase() === normalised);
}

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
