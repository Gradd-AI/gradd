// lib/acca/paper.ts
// The ACCA papers served from the shared acca_drills table. Product ACCESS is by
// entitlement (bundle — one ACCA entitlement covers all papers); but the drill FETCH
// must ALWAYS scope by paper_code for lo/area/default addressing, because AFM and APM
// LO codes collide exactly and paper_code is the only thing that separates them.
// (An id-addressed fetch needs no paper filter — the primary key is globally unique.)

export const ACCA_PAPERS = ['APM', 'AFM'] as const;
export type AccaPaper = (typeof ACCA_PAPERS)[number];

/**
 * The paper an unqualified ACCA URL means. APM, because every APM entry point predates the
 * paper param and its URLs stay clean.
 *
 * ⚠️ THIS CONSTANT EXISTS TO COUPLE TWO FUNCTIONS THAT MUST NEVER DISAGREE: `resolvePaper`
 * below (which READS an absent paper as this one) and `paperHref` in `paper-url.ts` (which
 * WRITES no param for this one). If they ever diverge, links stop round-tripping — a link
 * built for paper X resolves to paper Y — and nothing typechecks differently. Structural,
 * not instructed: change this and both sides move together.
 */
export const DEFAULT_PAPER: AccaPaper = 'APM';

// Canonicalize an untrusted paper hint (a URL query param or request-body field) to a
// known paper. Unknown/absent → 'APM' (the established default; AFM must be named
// explicitly, so no existing APM entry point changes behaviour).
//
// ⚠️ NEVER USE THIS FOR AN ENTITLEMENT DECISION. Its default is the whole problem: a
// request that omits the paper resolves to 'APM', so a gate built on it would ask "does
// this user hold APM?" for a request that named no paper at all — and answer yes for an
// APM holder reaching anything. Use `strictPaper` below, which refuses instead.
// This function remains correct for CONTENT SCOPING, which is what it was built for:
// there, defaulting to APM means "serve the APM row", and serving APM content to a
// request gated on APM is coherent.
export function resolvePaper(raw: unknown): AccaPaper {
  return raw === 'AFM' ? 'AFM' : DEFAULT_PAPER;
}

/**
 * Parse a paper hint with NO DEFAULT. Returns null for absent, empty, or unrecognised
 * input so the caller must decide what to do about it.
 *
 * This exists because per-paper entitlement made `resolvePaper`'s default dangerous in one
 * specific position — the authorisation gate. `lib/acca/sit-attempt.ts` already banked the
 * same lesson from the other direction: it takes the RAW query value rather than
 * `resolvePaper()`'s output precisely because "absent" and "explicitly APM" are different
 * facts, and collapsing them was a cross-paper content leak.
 *
 * Callers gating access MUST treat null as a refusal, never as a paper.
 */
export function strictPaper(raw: unknown): AccaPaper | null {
  if (typeof raw !== 'string') return null;
  const v = raw.trim().toUpperCase();
  return (ACCA_PAPERS as readonly string[]).includes(v) ? (v as AccaPaper) : null;
}

// DIRECT-LINK-ONLY areas: a lo_code that IS published (servable by direct link / ?area=) but must be
// EXCLUDED from every BROWSE / coverage surface — the area picker, the dashboard area list, the
// first-run default drill, and any public area count. Batch #10 HARD RULE (Grant, 2026-07-17): AFM
// Section A is not yet surfaced, so K4/A6a (multinational_dividend_capacity) serves by direct link only
// and never appears as a browsable B-tier/coverage area. Remove the AFM Section-A clause when Section A
// is intentionally launched. (Generalises the go-live "browsable-sections per paper" surfaced debt.)
export function isDirectLinkOnlyArea(paper: AccaPaper, loCode: string): boolean {
  return paper === 'AFM' && loCode.charAt(0) === 'A';
}
