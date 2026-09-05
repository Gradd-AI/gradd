// scripts/test-error-events.ts — fixtures for the ACCA error recorder.
// Pure: no DB, no model, no network. Run: npm run test:error-events
//
// ── WHAT THIS SUITE DEFENDS, AND WHAT IT CANNOT ──────────────────────────────
// Three claims, in descending order of how badly getting them wrong would hurt:
//
//   1. THE AUTH FILTER. `getUser()` returns an `AuthSessionMissingError` for a plain
//      logged-out request, so the naive `if (authError) record(...)` writes a row on every
//      anonymous hit to twelve routes. That version is WORSE THAN NO INSTRUMENTATION — the
//      table fills with the one thing that is not an error and buries the outage the fold-in
//      exists to see. Pinned as MUST-FAIL below, alongside the real rule.
//   2. THE DETAIL BOUND. A student's answer or a model's output in a funnel table is a copy
//      of student work living somewhere with no retention rule.
//   3. THE RECORDER'S OWN FAIL PATH. It runs inside catch blocks, so a recorder that threw
//      would replace the original error with its own — destroying the diagnosis it exists to
//      preserve. See the ceiling note on that section: it proves the SHAPE, not production.
//
// ── P-G6: THE AUTH INPUTS ARE THE REAL CLASSES ──────────────────────────────
// `isAuthOutage` classifies structurally on `{ name, status }` so that `error-events.ts`
// imports nothing from supabase-js and stays pure. That is exactly the kind of rule that can
// go quietly wrong when the library it describes changes underneath it, so the cases below
// are constructed from auth-js's OWN error classes rather than from hand-written literals. If
// `AuthSessionMissingError` is ever renamed, this fixture goes red instead of the product
// silently starting to record every logged-out request. Constructing an Error is pure — no
// client, no network, no env.

import {
  AuthApiError,
  AuthRetryableFetchError,
  AuthSessionMissingError,
} from '@supabase/auth-js';
import {
  DETAIL_MAX,
  ERROR_EVENT_TYPE,
  ERROR_ROUTES,
  ERROR_SURFACES,
  HEARTBEAT_EVENT_TYPE,
  RECORDER_EVENT_TYPES,
  boundedDetail,
  buildErrorEvent,
  buildHeartbeatEvent,
  isAuthOutage,
  isErrorSurface,
  isRecorderEventType,
  type ErrorRoute,
  type ErrorSurface,
} from '../lib/acca/error-events';
import { recordVia, type FunnelRow, type RecorderDeps } from '../lib/acca/error-recorder';
import { isSurfaceEventType, SURFACE_EVENTS } from '../lib/acca/surface-events';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

console.log('\nerror-events — an error row must mean a failure, and a silent table must mean something\n');

// ═════════════════════════════════════════════════════════════════════════════
// 1. THE AUTH FILTER — the load-bearing rule of the fold-in
// ═════════════════════════════════════════════════════════════════════════════
console.log('  the auth filter: an outage is not "not signed in"');

// THE PIN. This is the version a reasonable person writes, and every route already had the
// half of it that discards the error. Asserted to be WRONG on the case that matters most.
const NAIVE = (err: unknown) => !!err;

const noSession = new AuthSessionMissingError();
const expiredJwt = new AuthApiError('invalid claim: missing sub claim', 401, 'bad_jwt');
const forbidden = new AuthApiError('User not allowed', 403, 'not_admin');
const unreachable = new AuthRetryableFetchError('fetch failed', 0);
const gotrue500 = new AuthApiError('Internal Server Error', 500, undefined);
const gotrue503 = new AuthApiError('Service Unavailable', 503, undefined);

ok('MUST-FAIL: the naive filter treats a plain logged-out request as an error',
  NAIVE(noSession) === true);
ok('...and the real rule does not — this is the every-anonymous-hit flood',
  isAuthOutage(noSession) === false);
ok('the real class is what auth-js still returns for no session (name pinned)',
  noSession.name === 'AuthSessionMissingError');

ok('an expired/invalid JWT (401) is NOT an outage — "not signed in" is the honest answer',
  isAuthOutage(expiredJwt) === false);
ok('a 403 is NOT an outage', isAuthOutage(forbidden) === false);
ok('MUST-FAIL: the naive filter would record both of those too',
  NAIVE(expiredJwt) === true && NAIVE(forbidden) === true);

ok('an unreachable auth service IS an outage — the case the fold-in exists for',
  isAuthOutage(unreachable) === true);
ok('...and its status is 0, so no status-range test alone could have caught it',
  (unreachable as unknown as { status?: number }).status === 0);
ok('a 500 from GoTrue IS an outage', isAuthOutage(gotrue500) === true);
ok('a 503 from GoTrue IS an outage', isAuthOutage(gotrue503) === true);

ok('no error at all is not an outage', isAuthOutage(null) === false);
ok('undefined is not an outage', isAuthOutage(undefined) === false);
ok('an unrecognised error IS recorded — unknown beats silent',
  isAuthOutage(new Error('something else entirely')) === true);
ok('a non-Error value is recorded rather than dropped',
  isAuthOutage({ nonsense: true }) === true);

// The boundary itself, both sides. 499/500 is where "the service refused you" becomes
// "the service is broken", and an off-by-one here silently changes which outages are seen.
ok('status 499 is the last refusal', isAuthOutage({ status: 499 }) === false);
ok('status 500 is the first outage', isAuthOutage({ status: 500 }) === true);
ok('status 399 (not a refusal range) is recorded', isAuthOutage({ status: 399 }) === true);
// A session-missing error carries status 400 and would be filtered by the range test anyway;
// the NAME test exists so that a future auth-js giving it a different status still filters.
ok('session-missing is filtered by NAME, not only by its status',
  isAuthOutage({ name: 'AuthSessionMissingError' }) === false);

// ═════════════════════════════════════════════════════════════════════════════
// 2. THE DETAIL BOUND
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n  the detail bound: name plus ~200 chars, and never student work');

ok('an Error renders as name: message',
  boundedDetail(new TypeError('x is not a function')) === 'TypeError: x is not a function');

{
  // The shape of the thing this bound exists for: a model call that echoed a long body, or a
  // driver message quoting a value. 2,000 characters must not become a 2,000-character row.
  const long = new Error('E'.repeat(2000));
  const d = boundedDetail(long);
  ok('a 2000-char message is truncated', d.length === DETAIL_MAX, `got ${d.length}`);
  ok('...and is marked as truncated rather than silently cut', d.endsWith('…'));
  ok('DETAIL_MAX is the diagnosed ~200', DETAIL_MAX === 200);
}
{
  const d = boundedDetail(new Error('a'.repeat(DETAIL_MAX)));
  ok('a message at exactly the bound is not truncated past it', d.length === DETAIL_MAX);
}

// A Supabase/PostgREST error is a PLAIN OBJECT, not an Error, and it is what every
// instrumented `if (error)` branch is holding. Getting this wrong stores `[object Object]`.
{
  const pgErr = { code: '23505', message: 'duplicate key value violates unique constraint', details: null, hint: null };
  const d = boundedDetail(pgErr);
  ok('a PostgREST error keeps its code', d.startsWith('23505: '));
  ok('...and its message', d.includes('duplicate key value'));
  ok('MUST-FAIL: naive stringification of the same error says nothing',
    String(pgErr) === '[object Object]');
}
ok('an object with neither name nor code is still typed, not [object Object]',
  boundedDetail({ message: 'no name here' }) === 'ObjectError: no name here');
ok('a thrown string is kept', boundedDetail('boom') === 'string: boom');
ok('a thrown null is named', boundedDetail(null) === 'null');
ok('a thrown undefined is named', boundedDetail(undefined) === 'undefined');
ok('an Error with no message renders as the bare name',
  boundedDetail(new RangeError()) === 'RangeError');

{
  // A stack-shaped message would otherwise spend the whole budget on indentation.
  const d = boundedDetail(new Error('line one\n    at foo (/x.ts:1:1)\n    at bar (/y.ts:2:2)'));
  ok('newlines and runs of spaces collapse to single spaces', !/\s\s|\n/.test(d));
}

// ⚠️ THE SIGNATURE IS THE PRIVACY MECHANISM, NOT THE BOUND. `buildErrorEvent` takes the
// caught error and nothing else, so a call site has nowhere to put the student's answer.
// This asserts the shape of the stored row: exactly three keys, all derived.
{
  const e = buildErrorEvent('tutor_turn', 'api/acca/tutor', new Error('upstream timeout'));
  ok('an error row carries exactly surface, route and detail',
    JSON.stringify(Object.keys(e.metadata).sort()) === '["detail","route","surface"]');
  ok('...and no other field can be smuggled in, because none is accepted',
    e.metadata.surface === 'tutor_turn' && e.metadata.route === 'api/acca/tutor');
  ok('the event_type is the single error type', e.event_type === ERROR_EVENT_TYPE);
}

// ═════════════════════════════════════════════════════════════════════════════
// 3. THE VOCABULARIES ARE CLOSED, AND THE THREE SINKS ARE DISJOINT
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n  closed vocabularies, disjoint doors');

ok('every surface is recognised by its own guard',
  ERROR_SURFACES.every((s) => isErrorSurface(s)));
ok('an unknown surface is refused', isErrorSurface('tutor_turnn') === false);
ok('the surface list has no duplicates',
  new Set(ERROR_SURFACES).size === ERROR_SURFACES.length);
ok('the route list has no duplicates',
  new Set(ERROR_ROUTES).size === ERROR_ROUTES.length);

// The two event types must be refusable at the drill-funnel door, and must never collide
// with the surface-view vocabulary — three doors, three vocabularies, no overlap.
ok('both recorder types are recognised', RECORDER_EVENT_TYPES.every((t) => isRecorderEventType(t)));
ok('a surface-view type is NOT a recorder type',
  SURFACE_EVENTS.every((t) => isRecorderEventType(t) === false));
ok('a recorder type is NOT a surface-view type',
  RECORDER_EVENT_TYPES.every((t) => isSurfaceEventType(t) === false));
ok('the two recorder types differ from each other', ERROR_EVENT_TYPE !== HEARTBEAT_EVENT_TYPE);
ok('a drill-funnel type is neither',
  isRecorderEventType('drill_shown') === false && isSurfaceEventType('drill_shown') === false);

// ── EVERY SURFACE MUST CITE A CALL SITE ──────────────────────────────────────
// A name in ERROR_SURFACES with no instrumented site is a promise that a failure of that kind
// would be recorded, and an empty count against it then reads as "that never fails" rather
// than "nothing ever looks". This table is maintained by hand alongside the instrumentation;
// its job is to make ADDING a surface without wiring it a failing test rather than a comment
// nobody updates.
//
// ⚠️ CEILING: this proves each surface HAS a declared home and that the home is a real route.
// It does NOT read the routes, so it cannot prove the call is still there — that is what the
// live walk is for.
const SITES: Record<ErrorSurface, ErrorRoute> = {
  auth: 'api/acca/tutor',            // 1:many — fires from all twelve; this is one of them
  tutor_turn: 'api/acca/tutor',
  tutor_reveal: 'api/acca/tutor',
  case_turn: 'api/acca/case/turn',
  case_reveal: 'api/acca/case/turn',
  case_answer_write: 'api/acca/case/turn',
  case_mark: 'api/acca/case/mark',
  case_list: 'api/acca/case/list',
  sit_start: 'api/acca/sit',
  sit_mark: 'api/acca/sit/results',
  mock_start: 'api/acca/mock',
  // The only surface whose recording is paired with a re-throw — see its note in
  // ERROR_SURFACES. Its own both-arms control is scripts/test-stripe-webhook-errors.ts.
  stripe_webhook: 'api/webhooks/stripe',
};
ok('every declared surface names a call site',
  ERROR_SURFACES.every((s) => !!SITES[s]));
ok('...and every one of those sites is a declared route',
  ERROR_SURFACES.every((s) => (ERROR_ROUTES as readonly string[]).includes(SITES[s])));
ok('the cron is a declared route (the heartbeat needs one and is not a surface)',
  (ERROR_ROUTES as readonly string[]).includes('api/cron/trial-reminders'));

// ═════════════════════════════════════════════════════════════════════════════
// 4. THE HEARTBEAT
// ═════════════════════════════════════════════════════════════════════════════
console.log('\n  the heartbeat');

{
  const h = buildHeartbeatEvent('api/cron/trial-reminders');
  ok('the heartbeat is its own event_type', h.event_type === HEARTBEAT_EVENT_TYPE);
  ok('...distinguishable from an error row at a glance in SQL',
    h.event_type !== ERROR_EVENT_TYPE);
  ok('it carries only its source', JSON.stringify(Object.keys(h.metadata)) === '["source"]');
  ok('the source is the cron path', h.metadata.source === 'api/cron/trial-reminders');
  ok('it carries NO detail — there is no error to describe',
    h.metadata.detail === undefined);
}

// ═════════════════════════════════════════════════════════════════════════════
// 5. THE RECORDER'S OWN FAIL PATH
// ═════════════════════════════════════════════════════════════════════════════
// ⚠️ STATE THE CEILING BEFORE THE CHECKS, BECAUSE IT IS EASY TO OVERREAD THEM.
//
//   THESE CHECKS PROVE THE SHAPE, NOT PRODUCTION BEHAVIOUR.
//
// They drive `recordVia` with an INJECTED `insert` that throws, or returns an error, on
// demand — which proves that the recorder's own code swallows both, logs, and returns. They
// prove NOTHING about whether the production `insert` (a real supabase-js call against a real
// table with a real service key) fails in either of those two ways rather than in some third
// way: hanging until the function times out, for instance, which no shape test can reach and
// which this design does not defend against. The live walk is the only evidence about
// production, and it covers the success path, not this one.
//
// What they DO establish is the property that made the recorder safe to put inside a catch
// block at all: it cannot convert a handled 500 into an unhandled one, and it cannot replace
// the caller's original error with its own.
// tsx compiles these fixtures to CJS, where top-level await is unavailable. Everything from
// here down is async, so it runs inside one wrapper and the summary runs after it resolves.
async function failPathChecks(): Promise<void> {
console.log('\n  the recorder\'s own fail path (SHAPE ONLY — see the ceiling note in the file)');

/** A deps pair whose insert fails in the requested way, capturing what got logged. */
function failing(mode: 'throw' | 'returns-error' | 'ok'): {
  deps: RecorderDeps;
  logs: Array<{ message: string; detail: unknown }>;
  rows: FunnelRow[];
} {
  const logs: Array<{ message: string; detail: unknown }> = [];
  const rows: FunnelRow[] = [];
  const deps: RecorderDeps = {
    insert: async (row) => {
      rows.push(row);
      if (mode === 'throw') throw new Error('connect ECONNREFUSED 10.0.0.1:5432');
      if (mode === 'returns-error') return { error: { code: '42P01', message: 'relation "acca_funnel_events" does not exist' } };
      return;
    },
    log: (message, detail) => { logs.push({ message, detail }); },
  };
  return { deps, logs, rows };
}

{
  // (a) THE INSERT THROWS. The recorder must return, not throw.
  const { deps, logs } = failing('throw');
  let threw = false;
  let returned: unknown = 'not-set';
  try {
    returned = await recordVia(deps, buildErrorEvent('tutor_turn', 'api/acca/tutor', new Error('x')), 'u1');
  } catch { threw = true; }
  ok('a throwing insert does not propagate — the caller\'s catch block is undisturbed', threw === false);
  ok('...and the call resolves to undefined, so there is no error arm to forget to handle',
    returned === undefined);
  ok('...and the failure reaches the fallback channel', logs.length === 1);
  ok('...tagged so it is greppable in a runtime log',
    logs[0]?.message.startsWith('[error-recorder]') === true);
  ok('...carrying the underlying cause, not a swallowed blank',
    (logs[0]?.detail as Error)?.message?.includes('ECONNREFUSED') === true);
}
{
  // (b) THE INSERT RETURNS AN ERROR. supabase-js does not throw on a failed insert, it returns
  // `{ error }` — the older sink at /api/acca/event does not check it at all, which is how a
  // missing table was silent there. Treated identically to a throw.
  const { deps, logs } = failing('returns-error');
  await recordVia(deps, buildErrorEvent('sit_mark', 'api/acca/sit/results', new Error('x')), 'u1');
  ok('a returned error also reaches the fallback channel', logs.length === 1);
  ok('...with the driver\'s own code in it',
    JSON.stringify(logs[0]?.detail).includes('42P01'));
}
{
  // (c) THE CALLER'S RESPONSE IS UNCHANGED EITHER WAY. Modelled the way the routes are
  // written: the recorder is awaited on the failure path and the response is built after it.
  const original = new Error('Teaching engine error');
  const build = async (deps: RecorderDeps) => {
    await recordVia(deps, buildErrorEvent('tutor_turn', 'api/acca/tutor', original), 'u1');
    return { status: 500, body: { error: original.message } };
  };
  const failed = await build(failing('throw').deps);
  const worked = await build(failing('ok').deps);
  ok('a failed recording leaves the response byte-identical to a successful one',
    JSON.stringify(failed) === JSON.stringify(worked));
  ok('...and it is still the ORIGINAL error the student is told about, not the recorder\'s',
    failed.body.error === 'Teaching engine error');
}
{
  // (d) THE ROW SHAPE, and the one deliberate difference from the surface-event sink.
  const { deps, rows } = failing('ok');
  await recordVia(deps, buildErrorEvent('case_turn', 'api/acca/case/turn', new Error('x')), 'user-42');
  ok('the row carries the user when there is one', rows[0]?.user_id === 'user-42');
  ok('anon_id is always null — there is no anonymous ACCA surface left', rows[0]?.anon_id === null);
  ok('drill_lo is always null — it is drill-shaped and grouped on by existing queries',
    rows[0]?.drill_lo === null);
}
{
  // An `auth` row CANNOT carry a user id — that is the failure it is reporting. The
  // surface-event sink refuses a null identity on principle; this is the stated exception.
  const { deps, rows } = failing('ok');
  await recordVia(deps, buildErrorEvent('auth', 'api/acca/areas', unreachable), null);
  ok('an auth-outage row is stored with a null user, not refused', rows[0]?.user_id === null);
  ok('...and still says which route saw it', rows[0]?.metadata.route === 'api/acca/areas');
  ok('...and still names the cause',
    rows[0]?.metadata.detail.includes('AuthRetryableFetchError') === true);
}
{
  // The heartbeat goes through the SAME write path — that is the whole reason its presence is
  // evidence about the recorder rather than about the cron.
  const { deps, rows } = failing('ok');
  await recordVia(deps, buildHeartbeatEvent('api/cron/trial-reminders'), null);
  ok('the heartbeat is written by the same recorder as a real error',
    rows[0]?.event_type === HEARTBEAT_EVENT_TYPE && rows[0]?.anon_id === null);
}

// ── A recorded surface must survive the wire the way the row does ────────────
// The metadata lands in a jsonb column; every value must be a string, or the row that comes
// back is shaped differently from the one that went in.
{
  const every = ERROR_SURFACES.map((s: ErrorSurface) =>
    buildErrorEvent(s, 'api/acca/tutor', new Error('x')));
  ok('every surface builds a row whose metadata values are all strings',
    every.every((e) => Object.values(e.metadata).every((v) => typeof v === 'string')));
  ok('every surface survives a JSON round trip unchanged',
    every.every((e) => JSON.stringify(JSON.parse(JSON.stringify(e))) === JSON.stringify(e)));
}

}

void failPathChecks().then(() => {
  console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} error-events: ${pass}/${pass + fail} checks\n`);
  // P-G4: never process.exit() — let the runtime flush stdout first.
  process.exitCode = fail === 0 ? 0 : 1;
});
