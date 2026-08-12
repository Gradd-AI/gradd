// scripts/test-surface-events.ts — fixtures for the three case/mock surface-view events.
// Pure: no DB, no model, no network. Run: npm run test:surface-events
//
// ── P-G3: EVERY FAILURE PATH IS EXERCISED, AND THE WRONG IMPLEMENTATIONS ARE PINNED ──
// The defect class here is not "the parser throws on bad input" — it is a row that lands
// LOOKING FINE and means nothing: a `case_opened` with a typo'd metadata key, an
// `mock_intro_viewed` filed under the wrong paper, an event written with no user. None of
// those crash anything, and a suite that only checks the happy path would pass while the
// funnel filled up with holes. So the three plausible-but-wrong parsers below are pinned and
// asserted to FAIL, exactly as the hedging fixtures pin the superseded lock-in formula.
//
// ── P-G6: THE INPUTS ARE BUILT THE WAY PRODUCTION BUILDS THEM ────────────────
// Every accepted case goes through `JSON.parse(JSON.stringify(builder(...)))` — the round trip
// an emitter actually performs across `fetch` — and never a hand-written object literal. A
// literal would let the fixture and the emitter drift apart silently, which is the one thing
// the shared-module design exists to prevent. Rejected cases ARE literals, deliberately: they
// are shapes no builder can produce, and that is what makes them the interesting inputs.
//
// The mock lookup is the REAL `getMockPaper` from lib/acca/mocks.ts, not a stub. The injection
// point exists to keep that module out of the client bundle (see surface-events.ts), not to
// give the fixture a convenient fake — a stubbed registry would prove the parser calls a
// function, not that it agrees with the papers we actually serve.

import {
  SURFACE_EVENTS,
  isSurfaceEventType,
  caseListViewed,
  caseOpened,
  mockIntroViewed,
  parseSurfaceEvent,
  type SurfaceEvent,
} from '../lib/acca/surface-events';
import { getMockPaper, MOCK_PAPERS } from '../lib/acca/mocks';
import { ACCA_PAPERS } from '../lib/acca/paper';

let pass = 0, fail = 0;
const ok = (label: string, cond: boolean, detail = '') => {
  if (cond) { pass++; console.log(`  ok   ${label}`); }
  else { fail++; console.log(`  FAIL ${label}${detail ? ` — ${detail}` : ''}`); }
};

/** The wire trip an emitter performs: build → JSON → parse. P-G6. */
const overTheWire = (e: SurfaceEvent): unknown => JSON.parse(JSON.stringify(e));
const parse = (body: unknown) => parseSurfaceEvent(body, getMockPaper);

const A_CASE_ID = 'a5000000-0000-4000-8000-0000000000a1';   // a real published APM practice case
const APM_MOCK = 'paper-1';
const AFM_MOCK = 'afm-paper-1';

console.log('\nsurface-events — a view event must be attributable, canonical, and mean exactly what its name says\n');

// ── BREAK MODE 0: THE PINS ───────────────────────────────────────────────────
// Three parsers that a reasonable person would write, each of which stores a row that reads
// as fine and is not. They are asserted to accept what the real parser refuses.
//
//   LENIENT_KEYS  — checks that REQUIRED keys are present and ignores extras. This is the
//                   typo defect: `{paper, case_i}` has no case_id, so `case_id` is missing…
//                   except a parser that only checks presence-of-required on a payload that
//                   DOES carry the key under a typo'd name still drops the value. Pinned in
//                   the form that actually ships: extras tolerated, so `case_id` survives
//                   alongside junk and the junk is stored.
//   NO_CROSS      — validates mock_id and paper independently. Accepts
//                   {mock_id:'paper-1', paper:'AFM'} and files every APM intro under AFM.
//   ECHO          — returns the CALLER'S object rather than the builder's output, so whatever
//                   extra keys arrived get written into metadata verbatim.
const LENIENT_KEYS = (md: Record<string, unknown>) =>
  typeof md.paper === 'string' && typeof md.case_id === 'string';
const NO_CROSS = (mockId: string, paper: string) =>
  !!getMockPaper(mockId) && (ACCA_PAPERS as readonly string[]).includes(paper);
const ECHO = (md: Record<string, unknown>) => md;

ok('MUST-FAIL: a lenient parser accepts a payload carrying an unknown key beside a valid one',
  LENIENT_KEYS({ paper: 'APM', case_id: A_CASE_ID, csae_id: 'junk' }) === true);
ok('...and the real parser refuses it',
  parse({ event_type: 'case_opened', metadata: { paper: 'APM', case_id: A_CASE_ID, csae_id: 'junk' } }).ok === false);

ok('MUST-FAIL: independent validation accepts an APM mock_id declared as AFM',
  NO_CROSS(APM_MOCK, 'AFM') === true);
ok('...and the real parser refuses the contradiction',
  parse({ event_type: 'mock_intro_viewed', metadata: { paper: 'AFM', mock_id: APM_MOCK } }).ok === false);

ok('MUST-FAIL: an echoing parser would carry an extra key into the stored metadata',
  Object.keys(ECHO({ paper: 'APM', case_id: A_CASE_ID, tracking: 'x' })).includes('tracking'));
{
  // The real parser returns the BUILDER'S output, so even if a payload somehow validated,
  // what is stored is only ever a shape a builder can produce.
  const r = parse(overTheWire(caseOpened(A_CASE_ID, 'APM')));
  ok('...and the real parser returns canonical metadata with exactly the sanctioned keys',
    r.ok && JSON.stringify(Object.keys(r.event.metadata).sort()) === JSON.stringify(['case_id', 'paper']));
}

// ── THE VOCABULARY IS CLOSED, AND THE TWO SINKS REFUSE EACH OTHER ────────────
console.log('\n  the closed vocabulary');
ok('exactly three surface events, and no more crept in',
  SURFACE_EVENTS.length === 3
  && SURFACE_EVENTS.includes('case_list_viewed')
  && SURFACE_EVENTS.includes('case_opened')
  && SURFACE_EVENTS.includes('mock_intro_viewed'));

// The drill funnel's live vocabulary, from app/api/acca/event/route.ts. None of these may be
// accepted here — that is the reciprocal half of the guard the drill sink now applies.
const DRILL_EVENTS = [
  'drill_shown', 'area_selected', 'try_another_clicked', 'tutor_intent',
  'teach_through_delivered', 'drill_resolved', 'reveal_shown', 'try_tutor_clicked',
];
for (const t of DRILL_EVENTS) {
  ok(`drill event "${t}" is not a surface event, and the surface sink refuses it`,
    !isSurfaceEventType(t) && parse({ event_type: t, metadata: { paper: 'APM' } }).ok === false);
}
ok('an unknown event type is refused, and the reason names the vocabulary',
  (() => {
    const r = parse({ event_type: 'case_bounced', metadata: { paper: 'APM' } });
    return !r.ok && r.reason.includes('case_list_viewed') && r.reason.includes('/api/acca/event');
  })());

// ── THE ROUND TRIP: EVERY BUILDER'S OUTPUT SURVIVES THE WIRE UNCHANGED ───────
console.log('\n  round trip — what an emitter builds is what the sink stores');
for (const paper of ACCA_PAPERS) {
  {
    const r = parse(overTheWire(caseListViewed(paper)));
    ok(`case_list_viewed round-trips for ${paper}`,
      r.ok && r.event.event_type === 'case_list_viewed' && r.event.metadata.paper === paper
      && Object.keys(r.event.metadata).length === 1);
  }
  {
    const r = parse(overTheWire(caseOpened(A_CASE_ID, paper)));
    ok(`case_opened round-trips for ${paper}, carrying the case id`,
      r.ok && r.event.metadata.case_id === A_CASE_ID && r.event.metadata.paper === paper);
  }
}
for (const m of MOCK_PAPERS) {
  const r = parse(overTheWire(mockIntroViewed(m.id, m.paper)));
  ok(`mock_intro_viewed round-trips for the real registered paper ${m.id} (${m.paper})`,
    r.ok && r.event.metadata.mock_id === m.id && r.event.metadata.paper === m.paper);
}
ok('every registered mock paper is therefore reportable — no paper is unreachable by the sink',
  MOCK_PAPERS.every((m) => parse(overTheWire(mockIntroViewed(m.id, m.paper))).ok));

// ── EVERY REFUSAL PATH ───────────────────────────────────────────────────────
console.log('\n  refusals — each one is a row that would have read as fine');
const refusals: Array<[string, unknown]> = [
  ['a null body',                        null],
  ['a JSON array',                       [{ event_type: 'case_list_viewed' }]],
  ['a bare string',                      'case_list_viewed'],
  ['a missing event_type',               { metadata: { paper: 'APM' } }],
  ['a missing metadata object',          { event_type: 'case_list_viewed' }],
  ['metadata as an array',               { event_type: 'case_list_viewed', metadata: ['APM'] }],
  ['metadata as null',                   { event_type: 'case_list_viewed', metadata: null }],
  ['an absent paper',                    { event_type: 'case_list_viewed', metadata: {} }],
  ['an unknown paper',                   { event_type: 'case_list_viewed', metadata: { paper: 'SBL' } }],
  ['a lowercase paper (not canonical)',  { event_type: 'case_list_viewed', metadata: { paper: 'afm' } }],
  ['an empty-string paper',              { event_type: 'case_list_viewed', metadata: { paper: '' } }],
  ['a non-string paper',                 { event_type: 'case_list_viewed', metadata: { paper: 7 } }],
  ['case_list_viewed carrying a case_id',{ event_type: 'case_list_viewed', metadata: { paper: 'APM', case_id: A_CASE_ID } }],
  ['case_opened with no case_id',        { event_type: 'case_opened', metadata: { paper: 'APM' } }],
  ['case_opened with a non-uuid case_id',{ event_type: 'case_opened', metadata: { paper: 'APM', case_id: 'halworth-hotels' } }],
  ['case_opened with a truncated uuid',  { event_type: 'case_opened', metadata: { paper: 'APM', case_id: 'a5000000-0000-4000-8000-0000000000a' } }],
  ['case_opened carrying a mock_id',     { event_type: 'case_opened', metadata: { paper: 'APM', case_id: A_CASE_ID, mock_id: APM_MOCK } }],
  ['mock_intro_viewed with no mock_id',  { event_type: 'mock_intro_viewed', metadata: { paper: 'APM' } }],
  ['an unknown mock_id',                 { event_type: 'mock_intro_viewed', metadata: { paper: 'APM', mock_id: 'paper-9' } }],
  ['an APM mock declared as AFM',        { event_type: 'mock_intro_viewed', metadata: { paper: 'AFM', mock_id: APM_MOCK } }],
  ['an AFM mock declared as APM',        { event_type: 'mock_intro_viewed', metadata: { paper: 'APM', mock_id: AFM_MOCK } }],
  // The identity fields are not part of this type at all. A caller copying the older
  // `fireEvent` helper would send one, and it must be refused rather than silently ignored —
  // silently ignoring it is how someone concludes client-supplied identity is honoured here.
  ['a client-supplied user_id',           { event_type: 'case_list_viewed', metadata: { paper: 'APM', user_id: '00000000-0000-4000-8000-000000000001' } }],
  ['a client-supplied anon_id',           { event_type: 'case_list_viewed', metadata: { paper: 'APM', anon_id: 'anon-123' } }],
  ['a drill_lo smuggled into metadata',   { event_type: 'case_opened', metadata: { paper: 'APM', case_id: A_CASE_ID, drill_lo: 'B1a' } }],
];
for (const [label, body] of refusals) {
  const r = parse(body);
  ok(`refused: ${label}`, r.ok === false, r.ok ? 'ACCEPTED' : '');
}
ok('every refusal carries a non-empty reason a 400 can return',
  refusals.every(([, body]) => { const r = parse(body); return !r.ok && r.reason.trim().length > 0; }));

// ── WHITESPACE IS TRIMMED, NOT REFUSED, FOR THE ID FIELDS ────────────────────
// A trailing newline out of a template or a copied id is not a defect worth a 400, and the
// STORED value must be canonical either way.
{
  const r = parse({ event_type: 'case_opened', metadata: { paper: 'APM', case_id: `  ${A_CASE_ID}  ` } });
  ok('a padded case_id is accepted and stored trimmed', r.ok && r.event.metadata.case_id === A_CASE_ID);
}
{
  const r = parse({ event_type: 'mock_intro_viewed', metadata: { paper: 'AFM', mock_id: ` ${AFM_MOCK} ` } });
  ok('a padded mock_id is accepted and stored trimmed', r.ok && r.event.metadata.mock_id === AFM_MOCK);
}

// ── NO EVENT CAN BE BUILT WITHOUT A PAPER ────────────────────────────────────
// Not a style point: AFM and APM LO codes collide exactly, every other ACCA query is
// paper-scoped, and a funnel that cannot be split by paper cannot be read.
console.log('\n  the paper is mandatory on all three');
ok('all three builders emit a paper',
  [caseListViewed('APM'), caseOpened(A_CASE_ID, 'AFM'), mockIntroViewed(AFM_MOCK, 'AFM')]
    .every((e) => (ACCA_PAPERS as readonly string[]).includes(e.metadata.paper)));
ok('and every one of the three is refused without it',
  SURFACE_EVENTS.every((t) => parse({ event_type: t, metadata: {} }).ok === false));

console.log(`\n${fail === 0 ? 'PASS' : 'FAIL'} surface-events: ${pass}/${pass + fail} checks\n`);
// P-G4: never process.exit() — let the runtime flush stdout first.
process.exitCode = fail === 0 ? 0 : 1;
