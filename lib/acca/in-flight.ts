// lib/acca/in-flight.ts
// How long a model-backed operation may still plausibly be running. PURE — one constant.
//
// EXTRACTED from app/api/acca/sit/results/route.ts (2026-09-04), where it was a module-local
// const with one reader. It now has two, and the second one is the reason it moved: an
// orphaned tutor turn (a user row with no reply) is a FAILED turn only once enough time has
// passed that it cannot still be in flight — and that is the same judgement the marking claim
// already makes, on the same kind of operation, against the same model provider.
//
// ⚠️ ONE NUMBER, NOT TWO. A second threshold invented for turns would drift from this one and
// nothing would notice, because both are "how long before absence means failure" and neither
// has a test that would catch disagreement. Reused deliberately rather than re-derived.
//
// THE NAME IS KEPT. `CLAIM_STALE_MS` is marking-flavoured and the turn classifier is not
// marking — but renaming it would silently invalidate three comments in sit/results that name
// it, for no gain. The meaning is stated here once and both readers import it.
//
// Marking a case is two model calls, measured 15–25s; the tutor's slowest leg is a single
// Haiku call under a 1200-token ceiling. Five minutes is far beyond either, which is the
// direction to err: calling a live operation dead is worse than waiting.
export const CLAIM_STALE_MS = 5 * 60_000;
