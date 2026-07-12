// lib/acca/paper.ts
// The ACCA papers served from the shared acca_drills table. Product ACCESS is by
// entitlement (bundle — one ACCA entitlement covers all papers); but the drill FETCH
// must ALWAYS scope by paper_code for lo/area/default addressing, because AFM and APM
// LO codes collide exactly and paper_code is the only thing that separates them.
// (An id-addressed fetch needs no paper filter — the primary key is globally unique.)

export const ACCA_PAPERS = ['APM', 'AFM'] as const;
export type AccaPaper = (typeof ACCA_PAPERS)[number];

// Canonicalize an untrusted paper hint (a URL query param or request-body field) to a
// known paper. Unknown/absent → 'APM' (the established default; AFM must be named
// explicitly, so no existing APM entry point changes behaviour).
export function resolvePaper(raw: unknown): AccaPaper {
  return raw === 'AFM' ? 'AFM' : 'APM';
}
