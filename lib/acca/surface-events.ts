// lib/acca/surface-events.ts
// The three CASE/MOCK SURFACE-VIEW events, and the ONE definition of their payload.
// Pure: no network, no DB, no env. Both ends import this module — the browser BUILDS a
// payload with it and the route PARSES the payload with it — so the write shape and the
// read shape cannot drift. Same reason `paper-url.ts` holds both `paperHref` and
// `resolveSubscribePaper`: the round trip is the property that has to hold.
//
// ── WHAT THESE THREE ARE FOR ─────────────────────────────────────────────────
// Before them, nothing in the product wrote a row when a student OPENED a case or a mock.
// The first case row appears only after a real turn (practice) or a submit (sit); the first
// mock row appears only on the Start click. So "opened it and bounced" and "never opened it"
// were the same observation — an absence — and there is no pageview layer to fall back on
// (Vercel Web Analytics is not enabled for this project; there is no third-party analytics).
// These three convert that absence into a measured zero. NOTHING ELSE WAS ADDED: every other
// moment on these surfaces is reconstructable from a row already stored
// (acca_case_progress.created_at / submitted_at, acca_mock_attempts.started_at /
// completed / completed_at, acca_case_marking.marked_at, acca_weak_areas), and duplicating a
// durable row with an event is the `reveal_shown` mistake — two signals for one fact that can
// silently disagree, where the row is the one that survives a client that never fires.
//
// ── CASE IDENTITY: `metadata` JSONB, NOT `drill_lo`, NOT NEW COLUMNS (ruled 2026-08-12) ──
// `acca_funnel_events.drill_lo` is DRILL-SHAPED. Writing a case id into it would also poison
// every existing funnel query that groups by drill_lo — the column would stop meaning "an LO
// code" partway down the table, which is worse than having no column at all.
//
// New columns were the other candidate and were rejected on cost, not on taste: migrations
// here are a file PLUS a manual SQL-Editor apply with no automated runner, and two nullable
// columns buy nothing at this volume that a jsonb key does not. `metadata` is also the
// ESTABLISHED shape — `tutor_intent` already carries `{intent}` and `area_selected` carries
// `{area}`.
//
// The known cost of jsonb is that a typo'd key is INVISIBLE: `{case_i: …}` inserts happily and
// reads back as a row with no case. That cost is removed structurally rather than by
// convention — `parseSurfaceEvent` below is STRICT IN BOTH DIRECTIONS (every required key must
// be present AND every present key must be known), the route refuses anything it rejects, and
// the row that is stored is the BUILDER'S output, never the caller's object. So a hand-built
// payload with a typo'd key does not land as a bad row; it gets a 400 and lands as nothing.
//
// METADATA KEY VOCABULARY — fixed, and complete:
//   case_list_viewed    { paper }
//   case_opened         { paper, case_id }
//   mock_intro_viewed   { paper, mock_id }
//   mock_results_viewed { paper, mock_id, attempt_id }
// `paper` is on all four because AFM and APM LO codes collide exactly and every other
// ACCA query is paper-scoped; a funnel that cannot be split by paper cannot be read.
//
// ── THE FOURTH EVENT (2026-09-04) AND WHY IT IS NOT A DUPLICATED ROW ─────────
// `mock_results_viewed` fires on /acca/results/<attempt_id>, the permanent results page. It
// looks like it duplicates a durable row and does not: `acca_case_marking.marked_at` dates
// the FIRST view (marking and first debrief happen on the same request) and nothing dates
// any later one. Coming back to your own marked paper a week before the exam is exactly the
// behaviour the page exists to create, and it was the one moment on these surfaces that was
// unrecoverable from stored state — logged as open item #3 in docs/AFM_SURFACED.md until
// this event closed it. It carries `attempt_id` because a student may sit a paper more than
// once and "which sitting are they re-reading" is the question worth asking.

// SERVED, not declared: these events describe a surface a student reached. A declared-but-
// unserved paper (SBL) has no case list and no mock, so an event naming it is a mis-wired
// emitter, and this sink's whole job is to refuse those rather than store them.
import { SERVED_PAPERS, type ServedPaper } from './paper';

/**
 * How `parseSurfaceEvent` resolves a `mock_id`. INJECTED rather than imported, and the reason
 * is bundle scope, not testability: `./mocks` asserts its own id-uniqueness at MODULE LOAD, so
 * a bundler cannot tree-shake it out of a client chunk. Importing it here would ship the
 * reserved mock papers' case ids into the practice surfaces' bundles — harmless (the
 * id-addressed routes refuse mock content unconditionally) but a widening for no reason, and
 * these three emitters are all client components.
 *
 * The route passes the REAL `getMockPaper`, and so do the fixtures (P-G6) — this is not a seam
 * for a convenient stub.
 */
export type MockPaperLookup = (id: string) => { paper: ServedPaper } | null;

/** The closed vocabulary. A closed list is what makes the sink refuse an unknown event
 *  instead of storing a typo forever — `acca_funnel_events.event_type` is a free string at
 *  the DB level, and two of the eight strings already in that table are dead. */
export const SURFACE_EVENTS = [
  'case_list_viewed', 'case_opened', 'mock_intro_viewed', 'mock_results_viewed',
] as const;
export type SurfaceEventType = (typeof SURFACE_EVENTS)[number];

export function isSurfaceEventType(v: unknown): v is SurfaceEventType {
  return typeof v === 'string' && (SURFACE_EVENTS as readonly string[]).includes(v);
}

/** What an emitter sends and what the route stores. No `user_id` and no `anon_id` FIELD
 *  EXISTS on this type, deliberately: attribution is the server's to derive from the
 *  session, and a client-supplied identity is exactly the hole this design closes. */
export interface SurfaceEvent {
  event_type: SurfaceEventType;
  metadata: Record<string, string>;
}

/** Which metadata keys each event carries. Required AND exhaustive — see the strictness note. */
const KEYS: Record<SurfaceEventType, readonly string[]> = {
  case_list_viewed: ['paper'],
  case_opened: ['paper', 'case_id'],
  mock_intro_viewed: ['paper', 'mock_id'],
  mock_results_viewed: ['paper', 'mock_id', 'attempt_id'],
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ── BUILDERS ─────────────────────────────────────────────────────────────────
// The ONLY sanctioned way to construct a payload. They are trivial by design: the builder is
// dumb and the validator is strict, so a client cannot smuggle a shape past the server by
// calling a lenient helper.

export function caseListViewed(paper: ServedPaper): SurfaceEvent {
  return { event_type: 'case_list_viewed', metadata: { paper } };
}

export function caseOpened(caseId: string, paper: ServedPaper): SurfaceEvent {
  return { event_type: 'case_opened', metadata: { paper, case_id: caseId } };
}

export function mockIntroViewed(mockId: string, paper: ServedPaper): SurfaceEvent {
  return { event_type: 'mock_intro_viewed', metadata: { paper, mock_id: mockId } };
}

export function mockResultsViewed(
  attemptId: string,
  mockId: string,
  paper: ServedPaper,
): SurfaceEvent {
  return {
    event_type: 'mock_results_viewed',
    metadata: { paper, mock_id: mockId, attempt_id: attemptId },
  };
}

export type ParseResult =
  | { ok: true; event: SurfaceEvent }
  | { ok: false; reason: string };

/**
 * Parse an untrusted request body into a canonical SurfaceEvent, or refuse it with a reason.
 *
 * Returns the BUILDER'S output, not the caller's object, so what is stored is byte-identical
 * to what an in-repo emitter would have produced — an extra key cannot ride along even in
 * principle, and the stored row is always something the builders can produce.
 *
 * STRICT IN BOTH DIRECTIONS. A missing required key is a refusal (obviously) and so is an
 * UNKNOWN key (less obviously, and it is the half that matters): a typo'd `case_i` is caught
 * as an unknown key rather than silently stored as a case_opened row with no case. Rejecting
 * only the missing half would let the exact defect this module exists to prevent through.
 */
export function parseSurfaceEvent(body: unknown, lookupMock: MockPaperLookup): ParseResult {
  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return { ok: false, reason: 'body must be a JSON object' };
  }
  const { event_type: type, metadata } = body as { event_type?: unknown; metadata?: unknown };

  if (!isSurfaceEventType(type)) {
    // Names the vocabulary rather than saying "invalid": a caller sending a DRILL event type
    // here (drill_shown, tutor_intent, …) is not making a typo, it is using the wrong sink,
    // and the reason should say so.
    return {
      ok: false,
      reason: `event_type must be one of ${SURFACE_EVENTS.join(', ')} — drill funnel events belong to /api/acca/event`,
    };
  }
  if (metadata === null || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return { ok: false, reason: 'metadata must be a JSON object' };
  }

  const md = metadata as Record<string, unknown>;
  const expected = KEYS[type];
  for (const k of Object.keys(md)) {
    if (!expected.includes(k)) {
      return { ok: false, reason: `unknown metadata key "${k}" for ${type} (expected ${expected.join(', ')})` };
    }
  }
  for (const k of expected) {
    if (typeof md[k] !== 'string' || !(md[k] as string).trim()) {
      return { ok: false, reason: `metadata.${k} is required for ${type}` };
    }
  }

  const paper = md.paper as string;
  if (!(SERVED_PAPERS as readonly string[]).includes(paper)) {
    return { ok: false, reason: `metadata.paper must be one of ${SERVED_PAPERS.join(', ')}` };
  }

  if (type === 'case_list_viewed') {
    return { ok: true, event: caseListViewed(paper as ServedPaper) };
  }

  if (type === 'case_opened') {
    const caseId = (md.case_id as string).trim();
    // A case id is a uuid PRIMARY KEY. Shape-checking it here keeps a junk string out of a
    // column that will be joined against acca_cases — a row whose case_id joins to nothing
    // reads as "a case that was deleted" rather than "a client sent rubbish".
    if (!UUID.test(caseId)) return { ok: false, reason: 'metadata.case_id must be a uuid' };
    return { ok: true, event: caseOpened(caseId, paper as ServedPaper) };
  }

  // The two mock events share this resolution, so they cannot come to different conclusions
  // about the same `mock_id`. Validated against the REAL registry, not a regex: `mock_id` is
  // a hand-written text id ('paper-1', 'afm-paper-1'), so the only meaningful check is
  // whether it names a paper that exists.
  const mockId = (md.mock_id as string).trim();
  const mock = lookupMock(mockId);
  if (!mock) return { ok: false, reason: `metadata.mock_id "${mockId}" is not a known mock paper` };
  // CROSS-CHECK, and it is the one integrity rule here that a shape test would miss: the
  // registry already knows which paper a mock_id belongs to, so a payload claiming
  // {mock_id:'paper-1', paper:'AFM'} is internally inconsistent and is refused rather than
  // stored. Without this, one mis-wired emitter would file every APM intro under AFM and the
  // funnel would read as an AFM surface nobody starts.
  if (mock.paper !== paper) {
    return { ok: false, reason: `metadata.mock_id "${mockId}" is ${mock.paper}, not ${paper}` };
  }

  if (type === 'mock_intro_viewed') {
    return { ok: true, event: mockIntroViewed(mockId, mock.paper) };
  }

  // mock_results_viewed — the attempt is shape-checked and nothing more.
  //
  // ⚠️ CLAIM CEILING, and it is narrower than the `mock_id` check above. This module is
  // PURE, so it cannot ask whether the attempt exists or whose it is; `acca_mock_attempts`
  // is a table and this file touches no database. It does not need to: the sink takes
  // `user_id` from `auth.getUser()` and never from the body, so the worst a forged
  // attempt_id achieves is a mislabelled row inside that student's OWN funnel — the same
  // "WHO is trusted, WHETHER is not" ceiling all four of these carry, and affordable for the
  // same reason (nothing reads them at serve time). The uuid test keeps a junk string out of
  // a column that will be joined against acca_mock_attempts, so a row that joins to nothing
  // means "that attempt was deleted" rather than "a client sent rubbish".
  const attemptId = (md.attempt_id as string).trim();
  if (!UUID.test(attemptId)) return { ok: false, reason: 'metadata.attempt_id must be a uuid' };
  return { ok: true, event: mockResultsViewed(attemptId, mockId, mock.paper) };
}
