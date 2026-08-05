#!/usr/bin/env tsx
// scripts/test-exam-questions-format.ts
//
// Fixtures for the PRODUCTION prompt builder: fetchExamQuestionsContext
// (lib/system-prompt.ts:195), which composes {{EXAM_QUESTIONS_CONTEXT}} for Mia at BOTH
// app/api/session/start and app/api/session/message, for BOTH IB Economics and IB Business.
//
// PURE — no env, no DB, no network, no model. The function takes its SupabaseClient as a
// PARAMETER, so a hand-written `{ rpc }` stub drives every branch. Runs in the contract gate;
// no EXCLUDED entry. (Purity established by RUNNING with no .env.local, per P-G5, not by
// reading the imports.)
//
// WHY THIS FILE EXISTS. Until 2026-08-05 nothing tested this function. `scripts/
// test-exam-questions.ts` has its own `formatContext`, which is a stale COPY that predates the
// 2026-06-12 migration and renders neither the [[SCHEME_INJECTED]] marker nor the scheme_data
// mark schemes — so the only thing resembling a check on this output previewed something Mia
// never receives, and the shipped mark-scheme injection had no check of any kind. The two
// drifted for seven weeks with no signal, because nothing compared them.
//
// ⚠️ TWO HONEST LIMITS ON WHAT A GREEN RUN HERE MEANS:
//
//   1. [[SCHEME_INJECTED]] HAS NO CONSUMER. Four occurrences repo-wide, two of them the emit
//      sites in lib/system-prompt.ts, and nothing anywhere parses it. It is an OBSERVABILITY
//      marker, so pinning it guards transcript inspection — being able to tell, reading a
//      prompt or a log, that injection happened — NOT a contract with a downstream reader.
//      Do not describe these checks as protecting an interface.
//
//   2. THE SUBJECT-KEY MAPPING IS NOT IN SCOPE HERE. IB Business passes the internal key
//      'IB_BUSINESS' while the DB column wants 'IB_BUSINESS_MANAGEMENT'; that translation
//      lives in the ROUTES (app/api/session/{start,message}/route.ts), not in this function,
//      which forwards p_subject verbatim. A green run here says nothing about it.
//
// Modes:
//   (no flag)     assert the production function through a stub
//   --self-test   prove every predicate below discriminates (P-G3), over synthetic strings

import type { SupabaseClient } from '@supabase/supabase-js';
import { fetchExamQuestionsContext } from '../lib/system-prompt';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
}

// ── The stub: records what production ASKED for, returns what we tell it ─────
type RpcCall = { name: string; params: Record<string, unknown> };

function stubClient(response: { data: unknown; error: unknown }, calls: RpcCall[] = []) {
  const client = {
    rpc: async (name: string, params: Record<string, unknown>) => {
      calls.push({ name, params });
      return response;
    },
  };
  return { client: client as unknown as SupabaseClient, calls };
}

/** A seed row with everything the formatter reads. Overridable per case. */
function row(over: Record<string, unknown> = {}) {
  return {
    id: 'aaaaaaaa-0000-4000-8000-000000000001',
    question_text: 'Explain the multiplier.',
    context_text: null,
    paper: 'P1',
    command_term: 'explain',
    marks: 10,
    ao_level: 'AO2',
    level: 'SL',
    tier: 1,
    scheme_data: null,
    ...over,
  };
}

const okData = (rows: unknown[]) => ({ data: rows, error: null });

// ── Predicates. Factored out so --self-test can prove each one DISCRIMINATES ──
const markerCount    = (s: string) => (s.match(/\[\[SCHEME_INJECTED\]\]/g) ?? []).length;
const separatorCount = (s: string) => (s.match(/\n---\n/g) ?? []).length;
const exampleNumbers = (s: string) => [...s.matchAll(/^EXAMPLE (\d+) —/gm)].map((m) => Number(m[1]));
const hasEmptyParens = (s: string) => /\(\s*\)/.test(s);
const hasLiteralNull = (s: string) => /\bnull\b/.test(s);

async function render(rows: unknown[], lessonCode = 'IB_ECON_007', examLevel = 'HL', subject = 'IB_ECONOMICS', unitCode?: string) {
  const { client } = stubClient(okData(rows));
  const { formatted } = await fetchExamQuestionsContext(client, lessonCode, examLevel, subject, unitCode);
  return formatted;
}

async function main() {
  // ══ THE SILENT-FALLBACK CONTRACT (lib/system-prompt.ts:211) ═══════════════
  //
  // PINNED AS CURRENT BEHAVIOUR, NOT ENDORSED. The line is:
  //     if (error || !data || data.length === 0) return { formatted: '' };
  //
  // ⚠️ STATED PLAINLY: A DEAD RPC IS INDISTINGUISHABLE FROM "NO SEED QUESTIONS FOR THIS
  // LESSON". Both produce an empty context, the prompt builds anyway, and Mia teaches on with
  // no exam anchors and no signal that anything failed — on the LIVE teaching path, for both
  // IB subjects. These three checks exist so that a future edit cannot make this WORSE
  // unnoticed; they do not make it right. Whether the function should distinguish the two is a
  // BEHAVIOUR decision, logged separately in docs/AFM_SURFACED.md — deliberately NOT changed
  // here, and a fixture is not the place to decide it.
  const errored = await (async () => {
    const { client } = stubClient({ data: null, error: { message: 'permission denied' } });
    return (await fetchExamQuestionsContext(client, 'IB_ECON_007', 'HL', 'IB_ECONOMICS')).formatted;
  })();
  ok('an RPC ERROR yields an empty context (current behaviour, pinned)', errored === '');

  const nulled = await (async () => {
    const { client } = stubClient({ data: null, error: null });
    return (await fetchExamQuestionsContext(client, 'IB_ECON_007', 'HL', 'IB_ECONOMICS')).formatted;
  })();
  ok('NULL data yields an empty context', nulled === '');

  ok('ZERO rows yields an empty context — same output as a dead RPC', (await render([])) === '');

  // ══ REQUEST SIDE — what production actually asks the database for ═════════
  {
    const { client, calls } = stubClient(okData([row()]));
    await fetchExamQuestionsContext(client, 'IB_ECON_007', 'HL', 'IB_ECONOMICS');
    ok('calls exactly one RPC', calls.length === 1);
    ok('calls fetch_exam_questions_tiered by name', calls[0]?.name === 'fetch_exam_questions_tiered');
    ok("HL widens the level filter to ['SL','HL'] — HL students see SL material",
      JSON.stringify(calls[0]?.params.p_levels) === JSON.stringify(['SL', 'HL']));
    ok('lesson code is forwarded verbatim', calls[0]?.params.p_lesson_code === 'IB_ECON_007');
    ok('subject is forwarded VERBATIM (the IB_BUSINESS mapping is the ROUTE\'s job, not this function\'s)',
      calls[0]?.params.p_subject === 'IB_ECONOMICS');
    ok('an omitted unitCode is threaded as NULL, never undefined', calls[0]?.params.p_unit_code === null);
  }
  {
    const { client, calls } = stubClient(okData([row()]));
    await fetchExamQuestionsContext(client, 'IB_ECON_055', 'SL', 'IB_ECONOMICS');
    ok("SL narrows the level filter to ['SL'] — an SL student never sees HL material",
      JSON.stringify(calls[0]?.params.p_levels) === JSON.stringify(['SL']));
  }
  {
    const { client, calls } = stubClient(okData([row()]));
    await fetchExamQuestionsContext(client, 'IB_ECON_055', 'SL', 'IB_ECONOMICS', 'UNIT_2');
    ok('a supplied unitCode is threaded through (skips the RPC\'s unit lookup)',
      calls[0]?.params.p_unit_code === 'UNIT_2');
  }
  {
    // Anything that is not exactly 'HL' narrows to SL. Pinned because it is a silent default.
    const { client, calls } = stubClient(okData([row()]));
    await fetchExamQuestionsContext(client, 'IB_ECON_055', '', 'IB_ECONOMICS');
    ok("an EMPTY exam level falls to ['SL'], it does not widen", JSON.stringify(calls[0]?.params.p_levels) === JSON.stringify(['SL']));
  }

  // ══ SCHEME BRANCH 1 — accepted_points, marking_rule DEFAULTED ═════════════
  {
    const s = await render([row({ scheme_data: { accepted_points: [{ point: 'Injection raises AD', marks: 1 }] } })]);
    ok('accepted_points emits the marker', markerCount(s) === 1);
    ok('a MISSING marking_rule defaults to "award per point"', s.includes('MARK SCHEME (award per point):'));
    ok('points are numbered from 1', s.includes('1. (1 mark) Injection raises AD'));
  }

  // ══ SCHEME BRANCH 2 — accepted_points with an EXPLICIT marking_rule ═══════
  {
    const s = await render([row({ scheme_data: { marking_rule: 'max 2 per side', accepted_points: [{ point: 'Alpha', marks: 2 }, { point: 'Beta', marks: 1 }] } })]);
    ok('an explicit marking_rule is used instead of the default', s.includes('MARK SCHEME (max 2 per side):'));
    ok('the default is NOT also emitted', !s.includes('award per point'));
    ok('every point is rendered, numbered in order',
      s.includes('1. (2 mark) Alpha') && s.includes('2. (1 mark) Beta'));
    // PINNED QUIRK, not endorsed: the unit is hardcoded singular, so a 2-mark point renders
    // "(2 mark)". Cosmetic, reaches the model, unchanged here deliberately.
    ok('a multi-mark point renders the SINGULAR "mark" (production quirk, pinned)', s.includes('(2 mark) Alpha'));
  }

  // ══ SCHEME BRANCH 3 — band descriptors ════════════════════════════════════
  {
    const s = await render([row({ scheme_data: { bands: [{ range: [1, 5], descriptor: 'Limited' }, { range: [6, 10], descriptor: 'Effective' }] } })]);
    ok('bands emit the marker', markerCount(s) === 1);
    ok('bands use the holistic header', s.includes('MARK SCHEME (BAND DESCRIPTORS — mark holistically, best-fit):'));
    ok('each band renders as "lo-hi marks: descriptor"',
      s.includes('1-5 marks: Limited') && s.includes('6-10 marks: Effective'));
    ok('the per-point numbering is NOT applied to bands', !/^1\. \(/m.test(s));
  }

  // ══ SCHEME BRANCH 4 — PRECEDENCE: accepted_points BEATS bands ═════════════
  {
    const s = await render([row({ scheme_data: { accepted_points: [{ point: 'Alpha', marks: 1 }], bands: [{ range: [1, 5], descriptor: 'Limited' }] } })]);
    ok('with BOTH present, accepted_points wins', s.includes('1. (1 mark) Alpha'));
    ok('with both present, the band descriptors are NOT rendered', !s.includes('1-5 marks: Limited'));
    ok('with both present, exactly ONE marker is emitted', markerCount(s) === 1);
  }
  {
    // The empty-array trap: `[]` is falsy on .length, so it must FALL THROUGH to bands.
    const s = await render([row({ scheme_data: { accepted_points: [], bands: [{ range: [1, 5], descriptor: 'Limited' }] } })]);
    ok('an EMPTY accepted_points falls through to bands rather than winning', s.includes('1-5 marks: Limited'));
    ok('the fall-through still emits exactly one marker', markerCount(s) === 1);
  }

  // ══ SCHEME BRANCH 5 — THE NEGATIVE. The most valuable assertion here. ═════
  //
  // If the marker ever leaked onto a question with no scheme, Mia would be told a mark scheme
  // follows and handed nothing — worse than no injection at all.
  {
    const s = await render([row({ scheme_data: null })]);
    ok('scheme_data NULL emits NO marker at all', markerCount(s) === 0);
    ok('scheme_data null emits no MARK SCHEME header either', !s.includes('MARK SCHEME'));
  }
  {
    const s = await render([row({ scheme_data: {} })]);
    ok('an EMPTY scheme_data object emits no marker', markerCount(s) === 0);
  }
  {
    const s = await render([row({ scheme_data: { accepted_points: [] } })]);
    ok('an empty accepted_points with NO bands emits no marker', markerCount(s) === 0);
  }
  {
    const s = await render([row({ scheme_data: { accepted_points: [], bands: [] } })]);
    ok('both arrays empty emits no marker', markerCount(s) === 0);
  }
  {
    // Mixed set: only the row that HAS a scheme may carry a marker.
    const s = await render([
      row({ question_text: 'Q1', scheme_data: { accepted_points: [{ point: 'Alpha', marks: 1 }] } }),
      row({ question_text: 'Q2', scheme_data: null }),
      row({ question_text: 'Q3', scheme_data: null }),
    ]);
    ok('in a mixed set, the marker appears ONCE — only on the scheme-bearing row', markerCount(s) === 1);
  }

  // ══ RENDERING ═════════════════════════════════════════════════════════════
  {
    const s = await render([row({ question_text: 'Q1' }), row({ question_text: 'Q2' }), row({ question_text: 'Q3' })]);
    ok('EXAMPLE numbering starts at 1 and increments',
      JSON.stringify(exampleNumbers(s)) === JSON.stringify([1, 2, 3]));
    ok('n rows produce n-1 separators', separatorCount(s) === 2);
    ok('a SINGLE row produces no separator', separatorCount(await render([row()])) === 0);
    ok('the header carries paper, marks and command term',
      s.includes('EXAMPLE 1 — Paper P1, 10 marks, "explain"'));
  }
  {
    const s = await render([row({ ao_level: null, context_text: null })]);
    ok('a null ao_level renders NO empty parens', !hasEmptyParens(s));
    ok('a null ao_level omits the AO segment entirely', !s.includes('(AO'));
    ok('a null context_text emits no literal "null"', !hasLiteralNull(s));
  }
  {
    const s = await render([row({ ao_level: 'AO2' })]);
    ok('a present ao_level is rendered in parens', s.includes('"explain" (AO2)'));
  }
  {
    const s = await render([row({ context_text: 'In a hypothetical economy...' })]);
    ok('context_text is rendered ABOVE the question text',
      s.indexOf('In a hypothetical economy...') < s.indexOf('Explain the multiplier.'));
  }

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} exam-questions-format: ${failures} failure(s)`);
  // P-G4: exitCode, never process.exit().
  process.exitCode = failures === 0 ? 0 : 1;
}

/**
 * P-G3 — prove every predicate above DISCRIMINATES, over synthetic strings.
 *
 * Not inverted: this mode passes when the predicates behave, exits 1 when they do not, exactly
 * like the main mode. (Today's sweep found a fixture whose harness inverted its own exit; an
 * inverted mode is a second way for a green line to mean nothing.)
 */
function selfTest(): void {
  const WITH_MARKER = 'EXAMPLE 1 — Paper P1\nQ\n[[SCHEME_INJECTED]]\nMARK SCHEME (award per point):\n1. (1 mark) A';
  const NO_MARKER   = 'EXAMPLE 1 — Paper P1\nQ';
  const TWO         = 'EXAMPLE 1 — Paper P1\nQ1\n---\nEXAMPLE 2 — Paper P1\nQ2';
  const THREE       = `${TWO}\n---\nEXAMPLE 3 — Paper P3\nQ3`;

  ok('[self] markerCount SEES a marker', markerCount(WITH_MARKER) === 1);
  ok('[self] markerCount reports 0 when absent', markerCount(NO_MARKER) === 0);
  ok('[self] markerCount counts BOTH when duplicated', markerCount(`${WITH_MARKER}\n${WITH_MARKER}`) === 2);

  ok('[self] separatorCount counts 1 between two examples', separatorCount(TWO) === 1);
  ok('[self] separatorCount counts 2 between three', separatorCount(THREE) === 2);
  ok('[self] separatorCount reports 0 for a single example', separatorCount(NO_MARKER) === 0);
  ok('[self] separatorCount ignores a bare --- that is not a separator', separatorCount('a --- b') === 0);

  ok('[self] exampleNumbers reads the sequence', JSON.stringify(exampleNumbers(THREE)) === JSON.stringify([1, 2, 3]));
  ok('[self] exampleNumbers CATCHES a numbering restart',
    JSON.stringify(exampleNumbers('EXAMPLE 1 — a\nEXAMPLE 1 — b')) === JSON.stringify([1, 1]));
  ok('[self] exampleNumbers CATCHES a skipped number',
    JSON.stringify(exampleNumbers('EXAMPLE 1 — a\nEXAMPLE 3 — b')) === JSON.stringify([1, 3]));
  ok('[self] exampleNumbers ignores the word mid-line', exampleNumbers('see EXAMPLE 1 — above').length === 0);

  ok('[self] hasEmptyParens CATCHES ()', hasEmptyParens('"explain" ()') === true);
  ok('[self] hasEmptyParens catches whitespace-only parens', hasEmptyParens('"explain" ( )') === true);
  ok('[self] hasEmptyParens is false on a filled pair', hasEmptyParens('"explain" (AO2)') === false);

  ok('[self] hasLiteralNull CATCHES a leaked null', hasLiteralNull('Q1\nnull\nQ2') === true);
  ok('[self] hasLiteralNull is false when absent', hasLiteralNull('Q1\nQ2') === false);
  ok('[self] hasLiteralNull does not fire on a substring', hasLiteralNull('nullify the effect') === false);

  console.log(`\n${failures === 0 ? 'PASS' : 'FAIL'} exam-questions-format self-test: ${failures} failure(s)`);
  process.exitCode = failures === 0 ? 0 : 1;
}

if (process.argv.slice(2).includes('--self-test')) {
  selfTest();
} else {
  main().catch((err) => {
    console.error('Fatal:', err);
    process.exitCode = 1;
  });
}
