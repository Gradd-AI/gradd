// scripts/test-debrief.ts
// Fixtures for lib/acca/debrief.ts. PURE — no env, DB, model or network.
//   npm run test:debrief              — the full suite
//   npm run test:debrief -- --selftest — same walks (the module has no I/O, so every run is
//                                        already the P-G3 selftest; the flag keeps the idiom)
//
// P-G3: the computation is pure and separated from I/O by construction, and every walk carries
// a KNOWN EXPECTED DEBRIEF — including the shapes where the headline must CHANGE. A headline
// selector only ever observed picking one branch is untested.

import { computePacing, type PacingInputRequirement, type PacingInputAttempt } from '../lib/acca/pacing';
import { buildDebrief, type DebriefRequirementInput, type DebriefCaseInput, type DebriefReport } from '../lib/acca/debrief';

let failures = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}

const MARKS = [10, 16, 8, 6, 12, 8, 12, 8];
const LABELS = ['A(i)', 'A(ii)', 'A(iii)', 'A(iv)', 'B1(i)', 'B1(ii)', 'B2(i)', 'B2(ii)'];
const T = (m: number) => new Date(Date.UTC(2026, 6, 30, 9, 0, 0) + m * 60000).toISOString();

// Real-shaped marker reasoning: names the figure and the diverging step, as the technical
// marker actually produces. Carried through VERBATIM — the fixtures below prove that.
const FB = {
  exemplary: 'Correctly identifies 96 contracts, the sell direction, and reconciles the effective rate to 4.80% under both scenarios.',
  competent: 'The contract count (96) and the sell direction are right, but the 0.15 unexpired basis is omitted, so the lock-in is stated as 4.95% against a correct 4.80%.',
  weak: 'Names the hedge instrument but does not compute a contract count; the basis is not mentioned at all.',
  nothing: 'The answer addresses translation exposure, which this requirement does not ask about.',
};

function build(opts: {
  cumulative: Array<number | null>;
  bands: Array<string | null>;
  awarded: Array<number | null>;
  feedback: Array<string | null>;
  completedAt?: number | null;
  ps?: { awarded: number; available: number } | null;
}): DebriefReport {
  const pacingReqs: PacingInputRequirement[] = opts.cumulative.map((at, i) => ({
    requirement_id: `r${i + 1}`, paper_order: i + 1, label: LABELS[i], marks_available: MARKS[i],
    submitted_at: at === null ? null : T(at),
    final_answer: at === null ? null : 'an answer',
    band: opts.bands[i], marks_awarded: opts.awarded[i],
  }));
  const att: PacingInputAttempt = {
    started_at: T(0),
    completed_at: opts.completedAt === null ? null : T(opts.completedAt ?? 190),
    completed: opts.completedAt !== null,
  };
  const pacing = computePacing(pacingReqs, att);

  const reqs: DebriefRequirementInput[] = opts.cumulative.map((_, i) => ({
    requirement_id: `r${i + 1}`, paper_order: i + 1, label: LABELS[i],
    marks_available: MARKS[i], marks_awarded: opts.awarded[i], band: opts.bands[i],
    marker_feedback: opts.feedback[i],
  }));
  const cases: DebriefCaseInput[] = [{
    case_id: 'a001', title: 'Solenne Industries SA',
    professional_marks_awarded: opts.ps === null ? null : (opts.ps?.awarded ?? 8),
    professional_marks_available: opts.ps === null ? null : (opts.ps?.available ?? 10),
    per_skill: opts.ps === null ? [] : [
      { skill: 'analysis_and_evaluation', band: 'strong', feedback: 'Balances the costs and risks of the hedge before recommending it.' },
      { skill: 'communication', band: 'competent', feedback: 'The report format is right but the recommendation is buried in the third paragraph.' },
    ],
  }];
  return buildDebrief(reqs, cases, pacing);
}

const line = (d: DebriefReport, order: number) => d.requirements.find((r) => r.paper_order === order)!;

// ── W1 — a STRONG paper with ONE error ───────────────────────────────────────
console.log('\n-- W1: strong paper, one error --');
{
  const d = build({
    cumulative: [20, 51, 67, 79, 102, 118, 141, 157],
    bands:    ['exemplary', 'exemplary', 'strong', 'strong', 'exemplary', 'strong', 'competent', 'strong'],
    awarded:  [10, 16, 6, 5, 12, 6, 6, 6],
    feedback: [FB.exemplary, FB.exemplary, FB.exemplary, FB.exemplary, FB.exemplary, FB.exemplary, FB.competent, FB.exemplary],
    completedAt: 165,
  });
  ok('not_evaluated is null', d.not_evaluated === null);
  ok('EXPECTED headline: largest single loss (no collapse in this paper)', d.headline.code === 'largest_single_loss');
  ok('the headline names B2(i) and 6 of 12 marks',
    /6 of 12 marks on B2\(i\)/.test(d.headline.statement), d.headline.statement);
  ok('there is exactly ONE headline', typeof d.headline.statement === 'string' && d.headline.statement.length > 0);
  ok('the error requirement is verdict=partial', line(d, 7).verdict === 'partial');
  ok('its WHY is the marker\'s words VERBATIM', line(d, 7).why === FB.competent);
  ok('its next action comes from the band definition', line(d, 7).next_action_source === 'band_definition');
  ok('its action names closing one point and re-attempting',
    /Close that one point.*re-attempt/i.test(line(d, 7).next_action), line(d, 7).next_action);
  // Rule 5 — say so briefly and move on.
  ok('a strong requirement is acknowledged, not silently dropped', line(d, 1).verdict === 'strong');
  ok('a strong requirement gets a SHORT no-change action',
    /Nothing to change here/.test(line(d, 1).next_action) && line(d, 1).next_action.length < 120, line(d, 1).next_action);
  // 10+16+6+5+12+6+6+6 = 67 awarded; 10+16+8+6+12+8+12+8 = 80 available.
  ok('totals are reported as facts', d.totals.technical_awarded === 67 && d.totals.technical_available === 80,
    `${d.totals.technical_awarded}/${d.totals.technical_available}`);
  ok('PS is reported alongside, not merged', d.professional[0].awarded === 8 && d.professional[0].skills.length === 2);
  ok('PS reasoning is verbatim too',
    d.professional[0].skills[1].why === 'The report format is right but the recommendation is buried in the third paragraph.');
}

// ── W2 — a COLLAPSE paper ────────────────────────────────────────────────────
console.log('\n-- W2: collapse paper --');
{
  const d = build({
    cumulative: [25, 70, 95, 115, 150, 172, 176, 178],
    bands:    ['strong', 'competent', 'competent', 'strong', 'competent', 'weak', 'weak', 'nothing'],
    awarded:  [8, 8, 4, 5, 6, 2, 3, 0],
    feedback: [FB.exemplary, FB.competent, FB.competent, FB.exemplary, FB.competent, FB.weak, FB.weak, FB.nothing],
    completedAt: 180,
  });
  ok('EXPECTED headline: the collapse, NOT the largest single loss', d.headline.code === 'end_of_paper_collapse');
  ok('the headline is the pacing finding reused VERBATIM', /^End-of-paper collapse\./.test(d.headline.statement));
  ok('the headline is sourced to the pacing finding', d.headline.source === 'pacing_finding');
  // Losses here are 2,8,4,1,6,6,9,8 — the largest is 9 on B2(i). The collapse still outranks
  // it, which is the whole point of rule 2: the paper-level pattern leads.
  const biggest = d.requirements.reduce((a, b) => ((b.marks_lost ?? 0) > (a.marks_lost ?? 0) ? b : a));
  ok('a larger single loss exists and is deliberately NOT the headline',
    (biggest.marks_lost ?? 0) === 9 && d.headline.code !== 'largest_single_loss', String(biggest.marks_lost));
  ok('the nothing-band requirement is verdict=lost', line(d, 8).verdict === 'lost');
  ok('its action is re-work from the method up', /from the method up/.test(line(d, 8).next_action));
  ok('pacing note is SEPARATE from the marks line', line(d, 7).pacing_note !== null && line(d, 7).what_was_lost.indexOf('minutes') === -1);
  ok('the pacing note names both ends of the interval',
    /between submitting B1\(ii\) and submitting B2\(i\)/.test(line(d, 7).pacing_note!), line(d, 7).pacing_note!);
}

// ── W3 — an UNANSWERED-TAIL paper ────────────────────────────────────────────
console.log('\n-- W3: unanswered tail --');
{
  const d = build({
    cumulative: [25, 70, 95, 120, 150, 170, null, null],
    bands:    ['strong', 'competent', 'competent', 'strong', 'competent', 'weak', 'nothing', 'nothing'],
    awarded:  [8, 8, 4, 5, 6, 2, 0, 0],
    feedback: [FB.exemplary, FB.competent, FB.competent, FB.exemplary, FB.competent, FB.weak, null, null],
    completedAt: 195,
  });
  ok('EXPECTED headline: the collapse', d.headline.code === 'end_of_paper_collapse');
  ok('the headline names the closing run',
    /recorded no answer that could earn marks/.test(d.headline.statement), d.headline.statement);
  ok('an unreached requirement is verdict=not_reached', line(d, 7).verdict === 'not_reached');
  ok('what_was_lost states all marks were unavailable',
    /All 12 marks were unavailable/.test(line(d, 7).what_was_lost), line(d, 7).what_was_lost);
  ok('its action is to REACH it, sourced from the interval data',
    /Reach this requirement/.test(line(d, 7).next_action) && line(d, 7).next_action_source === 'computed_interval');
  ok('the action states the marks and the budget', /12 marks and a 23.4-minute budget/.test(line(d, 7).next_action));
  ok('NO why is invented where the marker gave none', line(d, 7).why === null && line(d, 7).why_source === null);
  ok('an unreached requirement carries no pacing note', line(d, 7).pacing_note === null);
}

// ── W4 — a paper with nothing lost ───────────────────────────────────────────
console.log('\n-- W4: nothing lost --');
{
  const d = build({
    cumulative: [20, 51, 67, 79, 102, 118, 141, 157],
    bands:    Array(8).fill('exemplary'),
    awarded:  [...MARKS],
    feedback: Array(8).fill(FB.exemplary),
    completedAt: 165,
  });
  ok('EXPECTED headline: no marks lost', d.headline.code === 'no_marks_lost');
  ok('every requirement is verdict=strong', d.requirements.every((r) => r.verdict === 'strong'));
  ok('totals reconcile to full marks', d.totals.technical_awarded === 80 && d.totals.technical_available === 80);
}

// ── W5 — not yet marked ──────────────────────────────────────────────────────
console.log('\n-- W5: not yet marked --');
{
  const d = build({
    cumulative: [20, 51, 67, 79, 102, 118, 141, 157],
    bands:    Array(8).fill(null),
    awarded:  Array(8).fill(null),
    feedback: Array(8).fill(null),
    completedAt: 165,
    ps: null,
  });
  ok('EXPECTED headline: pacing only', d.headline.code === 'pacing_only');
  ok('the limitation is STATED, not implied',
    d.limitations.some((l) => /has not been marked/.test(l)), d.limitations.join(' | '));
  ok('no action is invented for an unmarked requirement',
    /Not yet marked/.test(line(d, 3).next_action));
  ok('pacing notes are still produced', line(d, 3).pacing_note !== null);
  ok('totals report null rather than zero', d.totals.technical_awarded === null);
}

// ── W6 — degenerate input ────────────────────────────────────────────────────
console.log('\n-- W6: degenerate input --');
{
  const pacing = computePacing([], { started_at: null, completed_at: null });
  const d = buildDebrief([], [], pacing);
  ok('no requirements → not_evaluated', d.not_evaluated !== null);
}

// ── TRACEABILITY (rule 3) ────────────────────────────────────────────────────
console.log('\n-- traceability: every statement sourced, no invented diagnosis --');
{
  const walks = [
    build({ cumulative: [20, 51, 67, 79, 102, 118, 141, 157], bands: ['exemplary','exemplary','strong','strong','exemplary','strong','competent','strong'], awarded: [10,16,6,5,12,6,6,6], feedback: [FB.exemplary,FB.exemplary,FB.exemplary,FB.exemplary,FB.exemplary,FB.exemplary,FB.competent,FB.exemplary], completedAt: 165 }),
    build({ cumulative: [25, 70, 95, 115, 150, 172, 176, 178], bands: ['strong','competent','competent','strong','competent','weak','weak','nothing'], awarded: [8,8,4,5,6,2,3,0], feedback: [FB.exemplary,FB.competent,FB.competent,FB.exemplary,FB.competent,FB.weak,FB.weak,FB.nothing], completedAt: 180 }),
    build({ cumulative: [25, 70, 95, 120, 150, 170, null, null], bands: ['strong','competent','competent','strong','competent','weak','nothing','nothing'], awarded: [8,8,4,5,6,2,0,0], feedback: [FB.exemplary,FB.competent,FB.competent,FB.exemplary,FB.competent,FB.weak,null,null], completedAt: 195 }),
  ];
  const allWhy = walks.flatMap((d) => d.requirements.map((r) => r.why).filter((x): x is string => x !== null));
  const known = Object.values(FB);
  ok('EVERY "why" is verbatim marker output — no paraphrase anywhere',
    allWhy.every((w) => known.includes(w)), allWhy.find((w) => !known.includes(w)) ?? '');
  ok('every "why" carries the marker_verdict source',
    walks.every((d) => d.requirements.every((r) => (r.why === null) === (r.why_source === null))));
  ok('every next_action carries a source',
    walks.every((d) => d.requirements.every((r) => ['band_definition', 'computed_interval', 'computed_marks'].includes(r.next_action_source))));
  ok('every headline carries a source',
    walks.every((d) => ['marker_verdict', 'computed_marks', 'computed_interval', 'band_definition', 'pacing_finding'].includes(d.headline.source)));

  // No combined score field anywhere on a line.
  const keys = Object.keys(walks[0].requirements[0]);
  ok('NO combined marks+pacing score field exists',
    !keys.some((k) => /score|combined|overall|index|efficiency|grade/i.test(k)), keys.join(','));
  ok('marks and pacing are separate fields on every line',
    walks.every((d) => d.requirements.every((r) => 'marks_lost' in r && 'pacing_note' in r)));
}

// ── LANGUAGE CONSTRAINTS (rules 3 + 4, binding) ──────────────────────────────
console.log('\n-- language constraints --');
{
  const walks = [
    build({ cumulative: [20, 51, 67, 79, 102, 118, 141, 157], bands: ['exemplary','exemplary','strong','strong','exemplary','strong','competent','strong'], awarded: [10,16,6,5,12,6,6,6], feedback: [FB.exemplary,FB.exemplary,FB.exemplary,FB.exemplary,FB.exemplary,FB.exemplary,FB.competent,FB.exemplary], completedAt: 165 }),
    build({ cumulative: [25, 70, 95, 115, 150, 172, 176, 178], bands: ['strong','competent','competent','strong','competent','weak','weak','nothing'], awarded: [8,8,4,5,6,2,3,0], feedback: [FB.exemplary,FB.competent,FB.competent,FB.exemplary,FB.competent,FB.weak,FB.weak,FB.nothing], completedAt: 180 }),
    build({ cumulative: [25, 70, 95, 120, 150, 170, null, null], bands: ['strong','competent','competent','strong','competent','weak','nothing','nothing'], awarded: [8,8,4,5,6,2,0,0], feedback: [FB.exemplary,FB.competent,FB.competent,FB.exemplary,FB.competent,FB.weak,null,null], completedAt: 195 }),
  ];
  // MODULE-GENERATED prose only. Marker feedback is quoted third-party text and is not linted
  // here — rewriting it to satisfy a lint would break the verbatim guarantee above.
  const generated = walks.flatMap((d) => [
    d.headline.statement,
    ...d.requirements.flatMap((r) => [r.what_was_lost, r.next_action, r.pacing_note ?? '']),
    ...d.limitations,
  ]).filter((s) => s.length > 0);
  ok('statements were generated to lint', generated.length > 40, String(generated.length));

  const BANNED: Array<[RegExp, string]> = [
    [/time spent writing|spent writing|you wrote for/i, 'time-on-task claim'],
    [/cost you|which is why|because you|caused by|as a result of rushing/i, 'causal claim'],
    [/other candidates|average candidate|percentile|compared with others/i, 'cross-candidate comparison'],
    [/would have passed|would have failed|a pass|a fail|on track to pass|predicted (grade|mark)/i, 'predicted grade'],
    [/well done|great (job|effort)|keep it up|don't worry|unlucky|good luck/i, 'motivational filler'],
    [/you should have|too slow|too fast|obviously|simply needed/i, 'unsupported instruction'],
  ];
  for (const [re, why] of BANNED) {
    const hit = generated.find((s) => re.test(s));
    ok(`no generated statement contains a ${why}`, hit === undefined, hit ?? '');
  }
  // The constraint is "name BOTH ends of the interval from the approved vocabulary", not one
  // literal template. A collapse window legitimately closes at "finishing" rather than at a
  // submission, and requirement 1's window opens at "starting the paper". The first draft of
  // this lint demanded "… and submitting …" and rejected the collapse headline, which is
  // compliant — the lint was too narrow, not the statement.
  const BOTH_ENDS = /between (submitting .+|starting the paper) and (submitting .+|finishing)/i;
  const intervalStatements = generated.filter((s) => /minutes elapsed/.test(s));
  ok('every interval statement names BOTH ends from the approved vocabulary',
    intervalStatements.every((s) => BOTH_ENDS.test(s)),
    intervalStatements.filter((s) => !BOTH_ENDS.test(s)).join(' | '));
  ok('all three window shapes are exercised by these walks',
    intervalStatements.some((s) => /starting the paper and submitting/i.test(s)) &&
    intervalStatements.some((s) => /submitting .+ and submitting/i.test(s)) &&
    intervalStatements.some((s) => /and finishing/i.test(s)));
}

console.log(`\n${failures === 0 ? 'ALL DEBRIEF FIXTURES PASS' : `${failures} FIXTURE(S) FAILED`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
