// lib/acca/error-events.ts
// The ERROR half of the ACCA funnel vocabulary, and the ONE definition of what an error
// row means. Pure: no network, no DB, no env, no supabase-js import. The recorder that
// writes these rows is `lib/acca/error-recorder.ts`; THE CLAIM CEILING FOR THE WHOLE
// MECHANISM IS STATED VERBATIM IN THAT FILE'S HEADER and is deliberately not restated here,
// because a ceiling copied into two files drifts and the copy that is wrong is the one
// somebody reads.
//
// ── WHY THIS EXISTS ──────────────────────────────────────────────────────────
// Every 500 on an ACCA surface was, until now, a `console.error` at best and nothing at
// worst. Vercel's runtime logs are the only record, they are not queryable by student, and
// they roll off. So "a student's sit failed to mark" and "no student sat a paper" produced
// the same observation — an absence — which is the same blindness the surface-view events
// were built to end, one layer down. `npm run audit:unmarked-sits` was written as a
// point-in-time answer to exactly one instance of it.
//
// ── EXTENDS `acca_funnel_events`, DOES NOT ADD A TABLE (as diagnosed) ────────
// The table already holds every other thing worth knowing about an ACCA session, is already
// indexed on `event_type` and `created_at`, and already has a service-role-only RLS posture.
// A separate `acca_errors` table would need a migration file plus a manual SQL-Editor apply
// (there is no automated runner here), would need its own RLS and indexes, and would then
// have to be joined back against the funnel to answer any question worth asking — "did the
// student who opened this case then hit a 500". Two `event_type` strings cost none of that.
//
// The known cost is that this table's `event_type` is free text with no CHECK, so nothing at
// the DB level stops a typo. That is closed the way the surface events close it: the
// vocabulary is a closed list HERE, the builders below are the only sanctioned way to make a
// row, and the recorder writes the BUILDER'S output rather than a caller's object.
//
// ── SERVER-SIDE RECORDER, NOT A CLIENT EMITTER (as diagnosed) ───────────────
// The surface-view events are client-emitted because the facts they carry are facts only the
// browser has (a list rendered, a start screen shown). A 500 is the opposite: the server is
// the only party that knows the error happened AND the only party that knows what it was. A
// client emitter would report that a request failed, from the one process that cannot say
// why, and would be forgeable by any authed student with curl — which for a telemetry count
// is affordable and for an error rate is not, an error rate being the thing you would page on.
//
// There is therefore NO HTTP SINK for these two event types and no client module that can
// build one. `/api/acca/event` refuses the vocabulary explicitly; `/api/acca/surface-event`
// refuses it by construction (`parseSurfaceEvent` accepts only `SURFACE_EVENTS`).

/** The error event's `event_type`. ONE string for every surface — the surface itself lives
 *  in `metadata.surface`, so "all ACCA server errors" is one indexed equality and a
 *  per-surface breakdown is a GROUP BY on the jsonb key. The opposite shape (one event_type
 *  per surface) would put the vocabulary in an unconstrained text column and make the total
 *  an eleven-way IN list that goes stale the moment a surface is added. */
export const ERROR_EVENT_TYPE = 'server_error';

/** The heartbeat's `event_type`. See `buildHeartbeatEvent` for why it exists at all. */
export const HEARTBEAT_EVENT_TYPE = 'recorder_heartbeat';

// ── THE CLOSED SURFACE VOCABULARY ────────────────────────────────────────────
// One entry per INSTRUMENTED SITE. Not one per route, and not one per thing that could
// conceivably fail: a name in this list with no call site is a promise that a failure of
// that kind would be recorded, and an empty count against it would then read as "that never
// fails" rather than "nothing ever looks". Every entry is cited to its site below, and the
// fixture asserts there is no entry it cannot cite.
export const ERROR_SURFACES = [
  /** `auth.getUser()` failed for a reason that is NOT "no session" — see `isAuthOutage`.
   *  The only surface that is 1:many with routes; `metadata.route` disambiguates it. */
  'auth',
  /** The tutor's teaching engine threw — app/api/acca/tutor/route.ts, "Teaching engine error". */
  'tutor_turn',
  /** The tutor's model-answer generation threw — app/api/acca/tutor/route.ts. */
  'tutor_reveal',
  /** The case teaching engine threw — app/api/acca/case/turn/route.ts, "Teaching engine error". */
  'case_turn',
  /** Case model-answer generation threw — app/api/acca/case/turn/route.ts. */
  'case_reveal',
  /** The upsert of a student's recorded answer threw — app/api/acca/case/turn/route.ts.
   *  The one surface here where the student LOSES WRITTEN WORK, which is why it is named
   *  separately rather than folded into `case_turn`. */
  'case_answer_write',
  /** Case marking failed — app/api/acca/case/mark/route.ts. */
  'case_mark',
  /** The practice case list failed to load — app/api/acca/case/list/route.ts. */
  'case_list',
  /** Starting a sit attempt failed — app/api/acca/sit/route.ts. */
  'sit_start',
  /** Marking a SAT PAPER failed — app/api/acca/sit/results/route.ts. The highest-value entry
   *  in this list: marking has exactly one trigger (the client POSTing from the `done`
   *  phase), no queue and no server-side retry, so a failure here is a student's finished
   *  paper that nothing will ever come back for. */
  'sit_mark',
  /** Starting an APM mock attempt failed — app/api/acca/mock/route.ts. */
  'mock_start',
] as const;
export type ErrorSurface = (typeof ERROR_SURFACES)[number];

export function isErrorSurface(v: unknown): v is ErrorSurface {
  return typeof v === 'string' && (ERROR_SURFACES as readonly string[]).includes(v);
}

// ── THE CLOSED ROUTE VOCABULARY ──────────────────────────────────────────────
// Every route that can record. Mostly redundant with `surface` — the pairing is 1:1 for
// everything except `auth`, which fires from all twelve — and kept anyway because `auth` is
// the entry where it matters most: an outage shows up as a burst across many routes at once,
// and a burst confined to ONE route is a different diagnosis. A stored route string is also
// what makes a row greppable back to a line of code.
//
// ⚠️ NOT RUNTIME-VALIDATED, AND THAT IS A DELIBERATE DIFFERENCE FROM `parseSurfaceEvent`.
// That parser is strict in both directions because its input is an untrusted browser payload.
// Nothing untrusted reaches these builders: the only callers are server routes in this repo
// passing a literal, so a typo is a COMPILE error against the union below, and a runtime
// check would add a second, weaker guard against a hazard the type system has already removed.
export const ERROR_ROUTES = [
  'api/acca/access',
  'api/acca/areas',
  'api/acca/case',
  'api/acca/case/list',
  'api/acca/case/mark',
  'api/acca/case/turn',
  'api/acca/mock',
  'api/acca/next-drill',
  'api/acca/sit',
  'api/acca/sit/results',
  'api/acca/surface-event',
  'api/acca/tutor',
  'api/cron/trial-reminders',
] as const;
export type ErrorRoute = (typeof ERROR_ROUTES)[number];

// ── THE DETAIL BOUND ─────────────────────────────────────────────────────────
/** Characters kept from an error's own text, after its name. ~200, as diagnosed. */
export const DETAIL_MAX = 200;

/**
 * An error reduced to a stored string: its NAME, then as much of its own message as fits.
 *
 * ── WHAT MAY NEVER GO IN, AND WHAT THE BOUND ACTUALLY BUYS ──────────────────
 * NEVER a student's answer. NEVER model output. NEVER a prompt. Those are the three things
 * an error path on these surfaces has closest to hand — the tutor's catch block is holding
 * the student's message and the model's reply when it fires — and any of them in a funnel
 * table is a copy of student work living somewhere with no retention rule, readable with the
 * service key, for a purpose that never needed it.
 *
 * The mechanism that enforces that is the SIGNATURE, not this function's body:
 * `boundedDetail` takes the caught error and nothing else, so a call site has nowhere to put
 * the answer even if it wanted to. The 200-char bound is a bound on VOLUME, and it is worth
 * being exact about what it does not do — a driver-level message can quote a fragment of a
 * value it was handed (`invalid input syntax for type uuid: "..."`), so the bound limits how
 * much of such a fragment survives rather than guaranteeing none does. A call site must not
 * construct a message containing request content and pass that in; nothing here would catch it.
 *
 * Non-Error values are stringified and typed rather than trusted to render: `String({})` is
 * `[object Object]`, which as a stored error detail says precisely nothing.
 */
export function boundedDetail(err: unknown): string {
  const { name, message } = describe(err);
  const joined = message ? `${name}: ${message}` : name;
  // Collapse whitespace FIRST: a stack-shaped message would otherwise spend the whole budget
  // on indentation, and a single-line detail is what a SQL reader can actually scan.
  const flat = joined.replace(/\s+/g, ' ').trim();
  return flat.length <= DETAIL_MAX ? flat : `${flat.slice(0, DETAIL_MAX - 1)}…`;
}

function describe(err: unknown): { name: string; message: string } {
  if (err instanceof Error) {
    return { name: err.name || 'Error', message: err.message ?? '' };
  }
  // A Supabase/PostgREST error is a PLAIN OBJECT, not an Error — `{ message, code, details,
  // hint }` — and it is what every `if (error)` branch instrumented here is holding. Reading
  // its fields is the difference between a stored `23505: duplicate key…` and `[object Object]`.
  if (err !== null && typeof err === 'object') {
    const o = err as { name?: unknown; code?: unknown; message?: unknown };
    const name = typeof o.name === 'string' && o.name ? o.name
      : typeof o.code === 'string' && o.code ? o.code
      : 'ObjectError';
    const message = typeof o.message === 'string' ? o.message : '';
    return { name, message };
  }
  if (err === undefined) return { name: 'undefined', message: '' };
  if (err === null) return { name: 'null', message: '' };
  return { name: typeof err, message: String(err) };
}

// ── AUTH: AN OUTAGE IS NOT "NOT SIGNED IN" ───────────────────────────────────
/**
 * Should this `auth.getUser()` error be RECORDED as a failure?
 *
 * ⚠️ THIS IS THE LOAD-BEARING RULE OF THE AUTH FOLD-IN, AND THE NAIVE VERSION IS WORSE THAN
 * NO INSTRUMENTATION AT ALL. `getUser()` does not return a null error for a logged-out
 * request: with no access token it returns `AuthSessionMissingError` (auth-js
 * `GoTrueClient._getUser` — `return { data: { user: null }, error: new AuthSessionMissingError() }`),
 * so `if (authError) record(...)` would write a row on EVERY anonymous hit to every one of
 * these routes. The table would then be dominated by the one thing that is not an error, and
 * the signal the recorder exists to produce would be buried under it.
 *
 * The same goes for an EXPIRED or tampered cookie: GoTrue answers 401/403 and the honest
 * product answer really is "you are not signed in". That is a 4xx from a service that is up.
 *
 * What IS an outage:
 *   • `AuthRetryableFetchError` — the fetch to GoTrue failed (status 0). The auth service is
 *     unreachable and every student on the product is being told they are signed out. THIS IS
 *     THE CASE THE FOLD-IN EXISTS FOR.
 *   • any status >= 500 — GoTrue answered, badly.
 *   • anything unrecognised, including a non-Error value — unknown beats silent. A wrong row
 *     costs one row; a missed outage costs the diagnosis.
 *
 * Classified STRUCTURALLY, on `{ name, status }`, so this module imports nothing from
 * supabase-js and stays pure. The names are auth-js's own (`src/lib/errors.ts`), and the
 * fixture constructs the REAL classes to prove the structural rule still agrees with them —
 * if auth-js renames one, the fixture goes red rather than the rule going quietly wrong.
 */
export function isAuthOutage(err: unknown): boolean {
  if (!err) return false;
  const o = err as { name?: unknown; status?: unknown };
  const name = typeof o.name === 'string' ? o.name : '';
  const status = typeof o.status === 'number' ? o.status : null;

  // No session, and an invalid/expired one: the product's answer is correct as given.
  if (name === 'AuthSessionMissingError') return false;
  if (status !== null && status >= 400 && status < 500) return false;

  // Unreachable auth service. Its status is 0, so neither the 4xx test above nor the >=500
  // test below can see it; it is named explicitly for that reason.
  if (name === 'AuthRetryableFetchError') return true;
  if (status !== null && status >= 500) return true;

  // Unrecognised. Record it.
  return true;
}

// ── THE ROW SHAPE ────────────────────────────────────────────────────────────
/** What the recorder writes. `user_id` is NOT a field here — the recorder supplies it, the
 *  same discipline `SurfaceEvent` applies, for the same reason. */
export interface FunnelErrorEvent {
  event_type: typeof ERROR_EVENT_TYPE | typeof HEARTBEAT_EVENT_TYPE;
  metadata: Record<string, string>;
}

/**
 * Build the row for a failure. The ONLY sanctioned way to make one.
 *
 * `detail` is DERIVED here rather than accepted as a parameter, so a call site cannot pass a
 * hand-written string — which is how the student's answer would get in.
 */
export function buildErrorEvent(
  surface: ErrorSurface,
  route: ErrorRoute,
  err: unknown,
): FunnelErrorEvent {
  return {
    event_type: ERROR_EVENT_TYPE,
    metadata: { surface, route, detail: boundedDetail(err) },
  };
}

/**
 * ── THE HEARTBEAT, AND WHY IT IS NOT OPTIONAL ────────────────────────────────
 * Without it, THREE states are one observation:
 *   (a) the product ran and nothing failed;
 *   (b) the recorder is broken — a bad service key, a dropped table, an exception in the
 *       write path, a route that quietly stopped calling it;
 *   (c) nobody used the product at all.
 * All three read as zero rows, and nothing inside the system can tell them apart. That is
 * exactly what the retired `reveal_shown` string produced one layer up — a funnel query
 * returning zero while the feature was in fact being served, read as "unused" rather than
 * "the probe is unplugged" — and it matters more here, because the whole value of an error
 * recorder is what its silence means.
 *
 * One row on a schedule, written THROUGH THE SAME RECORDER as a real error, never through a
 * separate insert. A heartbeat that proves a different code path works proves nothing about
 * the one that matters. So:
 *   a heartbeat and no errors        → (a), the product is fine.
 *   no heartbeat                     → (b), do not trust a zero anywhere in this table.
 *   a heartbeat, and no funnel rows
 *     of any other kind              → (c), nobody used it.
 *
 * Carries the CRON PATH as `source` rather than a timestamp: the row's own `created_at` IS
 * the timestamp, and what a reader cannot otherwise recover is which schedule produced it.
 */
export function buildHeartbeatEvent(source: ErrorRoute): FunnelErrorEvent {
  return { event_type: HEARTBEAT_EVENT_TYPE, metadata: { source } };
}

/** Both event types, for the sinks that must refuse them. There is no HTTP door for either. */
export const RECORDER_EVENT_TYPES = [ERROR_EVENT_TYPE, HEARTBEAT_EVENT_TYPE] as const;

export function isRecorderEventType(v: unknown): boolean {
  return typeof v === 'string' && (RECORDER_EVENT_TYPES as readonly string[]).includes(v);
}
