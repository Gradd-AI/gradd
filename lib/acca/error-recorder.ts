// lib/acca/error-recorder.ts
// The server-side error recorder. Writes `server_error` and `recorder_heartbeat` rows into
// `acca_funnel_events`. The vocabulary, the detail bound and the auth-outage rule are all
// pure and live in `./error-events`; this file is the part that touches a database.
//
// ═════════════════════════════════════════════════════════════════════════════
// ── THE CLAIM CEILING ────────────────────────────────────────────────────────
//
//   a failure that reaches one of the instrumented catch blocks, on a request where the DB
//   is reachable, leaves a durable row
//
// That sentence is the whole claim, and it is deliberately narrower than "failures are
// recorded", which this mechanism does NOT do and must never be described as doing. Three
// gaps it leaves open on purpose, because naming them is what stops a zero being misread:
//
//   1. A FAILURE THAT NEVER REACHES AN INSTRUMENTED SITE IS NOT RECORDED. A process killed
//      by the runtime, an out-of-memory kill, a function timeout, a throw from framework
//      code above the route handler, a 500 rendered by Next itself — none of those run a
//      line of ours. Neither does any un-instrumented catch block, of which this repo has
//      many; `ERROR_SURFACES` is the exhaustive list of the ones that do.
//   2. IF THE DB IS THE THING THAT IS DOWN, NOTHING IS WRITTEN. The recorder writes to the
//      same Postgres every instrumented route was already talking to, so the correlated
//      failure — Supabase unreachable — is precisely the one it cannot record. The fallback
//      channel below is what covers that case, and it is a log line, not a row.
//   3. "INSTRUMENTED CATCH BLOCKS" IS READ TO INCLUDE the `if (error)` branches on a
//      Supabase result (`case_list`, `sit_start`, `mock_start`) and the `if (!run.ok)`
//      branch in the sit-results marker. They are the same event expressed with a returned
//      error instead of a thrown one. Every site, of either shape, is enumerated against its
//      surface in `ERROR_SURFACES`.
//
// The heartbeat is what converts a silent table from "no failures" into a claim you can
// stand behind — see `buildHeartbeatEvent` in ./error-events for the three-state argument.
// ═════════════════════════════════════════════════════════════════════════════
//
// ── THE RECORDER NEVER CHANGES WHAT THE CALLER RETURNS ──────────────────────
// Every call site is already on its failure path, holding a response it is about to send. A
// recorder that threw would convert a handled 500 into an unhandled one, and a recorder that
// threw *inside a catch block* would replace the original error with its own — destroying
// the very diagnosis it exists to preserve. So `record()` catches everything, logs, and
// returns. There is no error arm for a caller to handle and no return value to check.
//
// It is AWAITED at every call site rather than fired and forgotten. On a serverless runtime
// an un-awaited promise can be discarded when the response is returned, which for a row that
// only ever gets written on a rare path is the difference between a recorder and a coin flip.
// The cost is one insert on a path that is already failing.
//
// ── AND IT NEVER RECORDS ITS OWN FAILURE ────────────────────────────────────
// A write failure goes to `console.error` and stops there. Recording it would mean writing to
// the table that just refused a write; if that succeeded the first failure was transient and
// the row is misleading, and if it failed it would recurse. The fallback channel is Vercel's
// runtime log — worse than a row (not queryable, rolls off) and always available, which is
// the correct trade for exactly this one case.

import { createServiceClient } from '@/lib/supabase/server';
import {
  buildErrorEvent,
  buildHeartbeatEvent,
  isAuthOutage,
  type ErrorRoute,
  type ErrorSurface,
  type FunnelErrorEvent,
} from './error-events';

/** The two things the recorder needs from the outside world. Injected so the fixture can
 *  drive the failure path; production passes `PRODUCTION_DEPS` and nothing else does. */
export interface RecorderDeps {
  /** Writes the row. May throw or return an error — the recorder treats both identically. */
  insert: (row: FunnelRow) => Promise<{ error: unknown } | void>;
  /** The fallback channel. Production is `console.error`. */
  log: (message: string, detail: unknown) => void;
}

/** The row as the table has it. `anon_id` is always NULL: an error on an ACCA surface is
 *  either an identified student's or nobody's, and there is no anonymous ACCA surface left
 *  for it to belong to. `drill_lo` is always NULL — it is drill-shaped, and writing anything
 *  else into it would break every funnel query that groups by it. */
export interface FunnelRow {
  user_id: string | null;
  anon_id: null;
  event_type: string;
  drill_lo: null;
  metadata: Record<string, string>;
}

const PRODUCTION_DEPS: RecorderDeps = {
  insert: async (row) => {
    const supabase = createServiceClient();
    return await supabase.from('acca_funnel_events').insert(row);
  },
  log: (message, detail) => { console.error(message, detail); },
};

/**
 * The one write path. Everything below funnels through it.
 *
 * ── `user_id` MAY BE NULL HERE, UNLIKE THE SURFACE-EVENT SINK ───────────────
 * That sink refuses an unattributable row on principle, and is right to: a view event with
 * no user is a mis-wired emitter, and 87 historical rows with no identity are the standing
 * evidence of what tolerating one costs.
 *
 * An error row is the exception, and the `auth` surface is the reason. A failure whose entire
 * content is "we could not establish who this is" cannot carry a user id — refusing it would
 * discard precisely the outage the fold-in was built to see. So the rule is stated rather
 * than enforced: every surface except `auth` passes the session's user, `auth` passes null
 * because it has nothing else to pass, and a null on any other surface means the route was
 * unable to identify the student either.
 *
 * ⚠️ `acca_funnel_events.user_id` is `ON DELETE SET NULL`. Deleting a user silently converts
 * their error rows into unattributed ones rather than removing them — so a synthetic-account
 * teardown must delete the funnel rows FIRST, exactly as the surface events require.
 */
export async function recordVia(
  deps: RecorderDeps,
  event: FunnelErrorEvent,
  userId: string | null,
): Promise<void> {
  try {
    const result = await deps.insert({
      user_id: userId,
      anon_id: null,
      // The BUILDER'S output, never a caller's object — so what lands is always something
      // the builders in ./error-events can produce, and nothing can ride along.
      event_type: event.event_type,
      drill_lo: null,
      metadata: event.metadata,
    });
    if (result && result.error) {
      deps.log('[error-recorder] insert failed', result.error);
    }
  } catch (err) {
    // Includes the case where `createServiceClient` itself throws on a missing env var.
    deps.log('[error-recorder] threw', err);
  }
}

/**
 * Record a failure on an instrumented surface.
 *
 * `err` is the caught value, passed straight through — see `boundedDetail` for why the
 * signature takes the error and nothing else, and for what the 200-char bound does and does
 * not guarantee. Never construct a message from request content and pass it here.
 */
export async function recordServerError(
  surface: ErrorSurface,
  route: ErrorRoute,
  err: unknown,
  userId: string | null,
): Promise<void> {
  await recordVia(PRODUCTION_DEPS, buildErrorEvent(surface, route, err), userId);
}

/**
 * Record an `auth.getUser()` failure — but ONLY if it is an outage.
 *
 * The filter is the whole point and is not a caller's decision to make, which is why this
 * wrapper exists rather than twelve routes each remembering to call `isAuthOutage` first. A
 * logged-out request produces an `AuthSessionMissingError`, so an unfiltered version of this
 * would write a row on every anonymous hit to every ACCA route. See `isAuthOutage`.
 *
 * `user_id` is null by construction: if we could identify the student, this would not have
 * been called.
 */
export async function recordAuthFailure(route: ErrorRoute, err: unknown): Promise<void> {
  if (!isAuthOutage(err)) return;
  await recordVia(PRODUCTION_DEPS, buildErrorEvent('auth', route, err), null);
}

/**
 * Write the heartbeat row. Called from a cron, through the SAME write path as a real error,
 * which is the only thing that makes its presence evidence about the recorder rather than
 * about the cron. `user_id` is null: it is a fact about the system, not about a student.
 */
export async function recordHeartbeat(source: ErrorRoute): Promise<void> {
  await recordVia(PRODUCTION_DEPS, buildHeartbeatEvent(source), null);
}
