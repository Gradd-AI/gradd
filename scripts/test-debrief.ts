// scripts/test-debrief.ts
// Fixtures for lib/acca/debrief.ts. PURE — no env, DB, model or network.
//   npm run test:debrief              — the full suite
//   npm run test:debrief -- --selftest — same walks (the module has no I/O, so every run is
//                                        already the P-G3 selftest; the flag keeps the idiom)
//
// P-G3: the computation is pure and separated from I/O by construction, and every walk carries
// a KNOWN EXPECTED DEBRIEF — including the shapes where the headline must CHANGE. A headline
// selector only ever observed picking one branch is untested. W7 and W8 exist specifically to
// drive the collapse selector's REJECT path: a collapse that fires but costs nothing must be
// demoted to `secondary`, and a selector never observed demoting is an untested branch.

import { computePacing, type PacingInputRequirement, type PacingInputAttempt } from '../lib/acca/pacing';
import { buildDebrief, type DebriefRequirementInput, type DebriefCaseInput, type DebriefReport } from '../lib/acca/debrief';

let failures = 0;
function ok(name: string, cond: boolean, detail = '') {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}${detail ? `  — ${detail}` : ''}`);
}

const MARKS = [10, 16, 8, 6, 12, 8, 12, 8];
const LABELS = ['A(i)', 'A(ii)', 'A(iii)', 'A(iv)', 'B1(i)', 'B1(ii)', 'B2(i)', 'B2(ii)'];
// Three cases, in paper order — the real Mock 1 shape (4 + 2 + 2).
const CASE_OF = ['a001', 'a001', 'a001', 'a001', 'b101', 'b101', 'b201', 'b201'];
// Real AFM Mock 1 LO codes. Used ONLY to derive practise_area — never rendered.
const LO_CODES = ['B3e', 'B5b', 'E2b', 'E1a', 'B1a', 'B1b', 'E3a', 'E2a'];
const CASE_TITLE: Record<string, string> = {
  a001: 'Solenne Industries SA', b101: 'Brecon Renewables plc', b201: 'Aldebrino SpA',
};
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
    requirement_id: `r${i + 1}`, case_id: CASE_OF[i], paper_order: i + 1, label: LABELS[i],
    marks_available: MARKS[i], marks_awarded: opts.awarded[i], band: opts.bands[i],
    marker_feedback: opts.feedback[i],
    // Routing only — becomes `practise_area` on weak/competent lines, never printed.
    lo_code: LO_CODES[i],
  }));
  const cases: DebriefCaseInput[] = ['a001', 'b101', 'b201'].map((id) => ({
    case_id: id, title: CASE_TITLE[id],
    professional_marks_awarded: opts.ps === null || id !== 'a001' ? null : (opts.ps?.awarded ?? 8),
    professional_marks_available: opts.ps === null || id !== 'a001' ? null : (opts.ps?.available ?? 10),
    per_skill: opts.ps === null || id !== 'a001' ? [] : [
      { skill: 'analysis_and_evaluation', band: 'strong', feedback: 'Balances the costs and risks of the hedge before recommending it.' },
      { skill: 'communication', band: 'competent', feedback: 'The report format is right but the recommendation is buried in the third paragraph.' },
    ],
  }));
  return buildDebrief(reqs, cases, pacing);
}

const line = (d: DebriefReport, order: number) => d.requirements.find((r) => r.paper_order === order)!;

const W1 = () => build({
  cumulative: [20, 51, 67, 79, 102, 118, 141, 157],
  bands:    ['exemplary', 'exemplary', 'strong', 'strong', 'exemplary', 'strong', 'competent', 'strong'],
  awarded:  [10, 16, 6, 5, 12, 6, 6, 6],
  feedback: [FB.exemplary, FB.exemplary, FB.exemplary, FB.exemplary, FB.exemplary, FB.exemplary, FB.competent, FB.exemplary],
  completedAt: 165,
});
const W2 = () => build({
  cumulative: [25, 70, 95, 115, 150, 172, 176, 178],
  bands:    ['strong', 'competent', 'competent', 'strong', 'competent', 'weak', 'weak', 'nothing'],
  awarded:  [8, 8, 4, 5, 6, 2, 3, 0],
  feedback: [FB.exemplary, FB.competent, FB.competent, FB.exemplary, FB.competent, FB.weak, FB.weak, FB.nothing],
  completedAt: 180,
});
const W3 = () => build({
  cumulative: [25, 70, 95, 120, 150, 170, null, null],
  bands:    ['strong', 'competent', 'competent', 'strong', 'competent', 'weak', 'nothing', 'nothing'],
  awarded:  [8, 8, 4, 5, 6, 2, 0, 0],
  feedback: [FB.exemplary, FB.competent, FB.competent, FB.exemplary, FB.competent, FB.weak, null, null],
  completedAt: 195,
});

// ── W1 — a STRONG paper with ONE error ───────────────────────────────────────
console.log('\n-- W1: strong paper, one error --');
{
  const d = W1();
  ok('not_evaluated is null', d.not_evaluated === null);
  ok('EXPECTED headline: largest single loss (no collapse in this paper)', d.headline.code === 'largest_single_loss');
  ok('the headline names the requirement by DISPLAY name and 6 of 12 marks',
    /6 of 12 marks on Q3 \(i\)/.test(d.headline.statement), d.headline.statement);
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

// ── W2 — a COLLAPSE paper that COSTS marks ───────────────────────────────────
console.log('\n-- W2: collapse paper (window costs marks) --');
{
  const d = W2();
  ok('EXPECTED headline: the collapse, NOT the largest single loss', d.headline.code === 'end_of_paper_collapse');
  ok('the headline opens with the collapse sentence', /^End-of-paper collapse\./.test(d.headline.statement));
  ok('the headline is sourced to the pacing finding', d.headline.source === 'pacing_finding');
  ok('the selector recorded WHY it led', d.headline.evidence.window_costs_marks === true);
  ok('nothing was demoted to secondary', d.secondary.length === 0);
  // Losses here are 2,8,4,1,6,6,9,8 — the largest is 9 on Q3 (i). The collapse still outranks
  // it, which is the whole point of rule 2: a CONSEQUENTIAL paper-level pattern leads.
  const biggest = d.requirements.reduce((a, b) => ((b.marks_lost ?? 0) > (a.marks_lost ?? 0) ? b : a));
  ok('a larger single loss exists and is deliberately NOT the headline',
    (biggest.marks_lost ?? 0) === 9 && d.headline.code !== 'largest_single_loss', String(biggest.marks_lost));
  ok('the nothing-band requirement is verdict=lost', line(d, 8).verdict === 'lost');
  ok('its action is re-work from the method up', /from the method up/.test(line(d, 8).next_action));
  ok('pacing note is SEPARATE from the marks line', line(d, 7).pacing_note !== null && line(d, 7).what_was_lost.indexOf('minutes') === -1);
  ok('the pacing note names both ends by DISPLAY name',
    /between submitting Q2 \(ii\) and submitting Q3 \(i\)/.test(line(d, 7).pacing_note!), line(d, 7).pacing_note!);
}

// ── W3 — an UNANSWERED-TAIL paper ────────────────────────────────────────────
console.log('\n-- W3: unanswered tail --');
{
  const d = W3();
  ok('EXPECTED headline: the collapse', d.headline.code === 'end_of_paper_collapse');
  ok('the headline names the closing run',
    /recorded no answer that could earn marks/.test(d.headline.statement), d.headline.statement);
  ok('the closing run is named by DISPLAY name, not raw ordinals',
    /\(Q3 \(i\), Q3 \(ii\)\)/.test(d.headline.statement), d.headline.statement);
  ok('an unreached requirement is verdict=not_reached', line(d, 7).verdict === 'not_reached');
  ok('what_was_lost states all marks were unavailable',
    /All 12 marks were unavailable/.test(line(d, 7).what_was_lost), line(d, 7).what_was_lost);
  ok('its action is to REACH it, sourced from the interval data',
    /Reach this requirement/.test(line(d, 7).next_action) && line(d, 7).next_action_source === 'computed_interval');
  // WHOLE MINUTES, ROUNDED DOWN (2026-08-01). Was "a 23.4-minute budget": 12 marks × 1.95 = 23.4,
  // floored to 23. The decimal was false precision on a rule-of-thumb benchmark, and flooring
  // keeps the per-requirement budgets summing under the paper clock rather than over it.
  ok('the action states the marks and the budget in whole minutes',
    /12 marks and a 23-minute budget/.test(line(d, 7).next_action), line(d, 7).next_action);
  ok('...and no duration anywhere in the action carries a decimal',
    !/\d+\.\d+\s*-?\s*minute/.test(line(d, 7).next_action), line(d, 7).next_action);
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
  ok('per-case subtotals report null rather than zero', d.cases.every((c) => c.technical_awarded === null));
}

// ── W6 — degenerate input ────────────────────────────────────────────────────
console.log('\n-- W6: degenerate input --');
{
  const pacing = computePacing([], { started_at: null, completed_at: null });
  const d = buildDebrief([], [], pacing);
  ok('no requirements → not_evaluated', d.not_evaluated !== null);
  ok('degenerate report still carries the new fields', Array.isArray(d.cases) && Array.isArray(d.secondary));
}

// ── W7 — a collapse that COSTS NOTHING must be DEMOTED (selector reject path) ─
console.log('\n-- W7: harmless collapse, nothing lost anywhere --');
{
  const d = build({
    cumulative: [25, 70, 95, 115, 150, 172, 176, 178],   // same fast tail as W2
    bands:    Array(8).fill('exemplary'),
    awarded:  [...MARKS],
    feedback: Array(8).fill(FB.exemplary),
    completedAt: 180,
  });
  ok('the collapse DID fire in pacing (precondition for this walk)',
    d.secondary.some((s) => s.code === 'end_of_paper_collapse') || d.headline.code === 'end_of_paper_collapse');
  ok('EXPECTED headline: NOT the collapse — its window cost nothing', d.headline.code === 'no_marks_lost', d.headline.code);
  ok('the collapse is reported SECONDARY, not dropped',
    d.secondary.length === 1 && d.secondary[0].code === 'end_of_paper_collapse');
  ok('the demoted finding records that its window cost nothing',
    d.secondary[0].evidence.window_costs_marks === false);
  ok('the demoted statement is still the full compliant sentence',
    /^End-of-paper collapse\./.test(d.secondary[0].statement), d.secondary[0].statement);
}

// ── W8 — collapse harmless, but marks lost EARLIER in the paper ──────────────
console.log('\n-- W8: harmless collapse, marks lost outside its window --');
{
  const d = build({
    cumulative: [25, 70, 95, 115, 150, 172, 176, 178],
    bands:    ['competent', 'competent', 'exemplary', 'exemplary', 'exemplary', 'exemplary', 'exemplary', 'exemplary'],
    awarded:  [4, 7, 8, 6, 12, 8, 12, 8],
    feedback: [FB.competent, FB.competent, FB.exemplary, FB.exemplary, FB.exemplary, FB.exemplary, FB.exemplary, FB.exemplary],
    completedAt: 180,
  });
  ok('EXPECTED headline: the largest single loss, NOT the collapse',
    d.headline.code === 'largest_single_loss', d.headline.code);
  ok('the headline names the earlier loss by display name',
    /9 of 16 marks on Q1 \(ii\)/.test(d.headline.statement), d.headline.statement);
  ok('the collapse is still reported, as secondary',
    d.secondary.length === 1 && d.secondary[0].code === 'end_of_paper_collapse');
}

// ── NAMING — no internal code, no marks, reaches every student-facing string ──
console.log('\n-- naming: no LO code and no marks count in any student-facing reference --');
{
  const walks = [W1(), W2(), W3()];
  const names = walks.flatMap((d) => d.requirements.map((r) => r.display_name));
  ok('every display_name is the "Q<n> (part)" shape',
    names.every((n) => /^Q\d+ \((?:i|ii|iii|iv|v|vi)\)$/.test(n)), names.find((n) => !/^Q\d+ \((?:i|ii|iii|iv|v|vi)\)$/.test(n)) ?? '');
  ok('the eight requirements map onto three questions, in paper order',
    walks[0].requirements.map((r) => r.display_name).join(' ') ===
    'Q1 (i) Q1 (ii) Q1 (iii) Q1 (iv) Q2 (i) Q2 (ii) Q3 (i) Q3 (ii)',
    walks[0].requirements.map((r) => r.display_name).join(' '));

  // The stored label is "(i) B3e — 10 marks". Neither half may reach the student.
  const facing = walks.flatMap((d) => [
    d.headline.statement,
    ...d.secondary.map((s) => s.statement),
    ...d.requirements.flatMap((r) => [r.display_name, r.what_was_lost, r.next_action, r.pacing_note ?? '']),
  ]).filter((s) => s.length > 0);
  const LO_CODE = /\b[ABCDE]\d[a-z]\b/;
  const hitCode = facing.find((s) => LO_CODE.test(s));
  ok('NO student-facing string contains an LO code', hitCode === undefined, hitCode ?? '');
  const hitLabelMarks = facing.find((s) => /\((?:i|ii|iii|iv)\)\s*[A-E]\d[a-z]?\s*—\s*\d+ marks/.test(s));
  ok('NO student-facing string reproduces the stored label', hitLabelMarks === undefined, hitLabelMarks ?? '');
  // Every requirement the headline or a pacing note names must be findable in the document.
  const known = new Set(walks[0].requirements.map((r) => r.display_name));
  const referenced = [...walks[0].headline.statement.matchAll(/Q\d+ \([ivx]+\)/g)].map((m) => m[0]);
  ok('every requirement the headline names exists in the body',
    referenced.length > 0 && referenced.every((n) => known.has(n)), referenced.join(','));
  const w3refs = [...W3().headline.statement.matchAll(/Q\d+ \([ivx]+\)/g)].map((m) => m[0]);
  ok('the collapse headline names requirements that exist in the body',
    w3refs.length > 0 && w3refs.every((n) => known.has(n)), w3refs.join(','));
}

// ── CASE GROUPING + SUBTOTALS ────────────────────────────────────────────────
console.log('\n-- case grouping and per-case subtotals --');
{
  const d = W1();
  ok('three case groups, in paper order', d.cases.length === 3 && d.cases.map((c) => c.display_name).join(' ') === 'Q1 Q2 Q3');
  ok('groups carry their titles', d.cases[0].title === 'Solenne Industries SA' && d.cases[2].title === 'Aldebrino SpA');
  ok('the 4/2/2 split is preserved', d.cases.map((c) => c.requirements.length).join('') === '422');
  // Q1 10+16+6+5 = 37/40 · Q2 12+6 = 18/20 · Q3 6+6 = 12/20
  ok('Q1 subtotal', d.cases[0].technical_awarded === 37 && d.cases[0].technical_available === 40,
    `${d.cases[0].technical_awarded}/${d.cases[0].technical_available}`);
  ok('Q2 subtotal', d.cases[1].technical_awarded === 18 && d.cases[1].technical_available === 20);
  ok('Q3 subtotal', d.cases[2].technical_awarded === 12 && d.cases[2].technical_available === 20);
  ok('subtotals sum to the paper total',
    d.cases.reduce((a, c) => a + (c.technical_awarded ?? 0), 0) === d.totals.technical_awarded &&
    d.cases.reduce((a, c) => a + c.technical_available, 0) === d.totals.technical_available);
  ok('every requirement appears in exactly one group',
    d.cases.flatMap((c) => c.requirements).length === d.requirements.length);
}

// ── LENGTH — collapse the justification, never truncate it ───────────────────
console.log('\n-- length: strong bands collapse the justification, losses stay open --');
{
  const d = W1();
  ok('a strong band that lost nothing is COLLAPSED', line(d, 1).why_display === 'collapsed');
  ok('a competent band that lost marks is EXPANDED', line(d, 7).why_display === 'expanded');
  // W1 line 3 is band=strong but lost 2 of 8 — there IS something to act on, so it stays open.
  ok('a strong band that STILL lost marks is EXPANDED', line(d, 3).band === 'strong' && (line(d, 3).marks_lost ?? 0) > 0 && line(d, 3).why_display === 'expanded');
  ok('collapsing NEVER shortens the text — why is byte-identical to the marker output',
    line(d, 1).why === FB.exemplary && line(d, 7).why === FB.competent);
  const all = [W1(), W2(), W3()].flatMap((x) => x.requirements);
  ok('every line with a why carries a display state',
    all.every((r) => (r.why === null ? true : r.why_display === 'expanded' || r.why_display === 'collapsed')));
  ok('a line with no why is never marked collapsed',
    all.every((r) => r.why !== null || r.why_display === 'expanded'));
}

// ── NO FORWARD REFERENCE ─────────────────────────────────────────────────────
console.log('\n-- no forward reference in any action --');
{
  const actions = [W1(), W2(), W3(), build({
    cumulative: [20, 51, 67, 79, 102, 118, 141, 157], bands: Array(8).fill('exemplary'),
    awarded: [...MARKS], feedback: Array(8).fill(FB.exemplary), completedAt: 165,
  })].flatMap((d) => d.requirements.map((r) => r.next_action));
  // What must not appear is a reference to ANOTHER REQUIREMENT by position — "the requirements
  // below" is false on the last one and false in any non-paper-order view. An intra-block
  // reference ("close that one point, named above") points at the diagnosis printed on the SAME
  // line, which is always there when the band is competent or worse, so it is not this defect.
  const FORWARD = /(requirements?|questions?|parts?)\s+(below|above|that follow|coming up|ahead)|(later|earlier|remaining|subsequent|following|next)\s+(requirements?|questions?|parts?)/i;
  const hit = actions.find((a) => FORWARD.test(a));
  ok('no action refers to another requirement by position', hit === undefined, hit ?? '');
  ok('the retired forward reference is gone for good',
    !actions.some((a) => /carry this approach into the requirements below/i.test(a)));
  ok('the exemplary action still says what to do',
    actions.some((a) => /this is the approach to repeat/i.test(a)));
  ok('an intra-block reference to the diagnosis is still allowed and still present',
    actions.some((a) => /named above/i.test(a)));
}

// ── TRACEABILITY (rule 3) ────────────────────────────────────────────────────
console.log('\n-- traceability: every statement sourced, no invented diagnosis --');
{
  const walks = [W1(), W2(), W3()];
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
  ok('every SECONDARY finding carries a source too',
    walks.every((d) => d.secondary.every((s) => s.source === 'pacing_finding')));

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
  const walks = [W1(), W2(), W3()];
  // MODULE-GENERATED prose only. Marker feedback is quoted third-party text and is not linted
  // here — rewriting it to satisfy a lint would break the verbatim guarantee above.
  const generated = walks.flatMap((d) => [
    d.headline.statement,
    ...d.secondary.map((s) => s.statement),
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

  // ── WHOLE MINUTES (2026-08-01) ──
  // Swept over every string the DEBRIEF composes, not just pacing's. composeCollapse and the
  // pacing notes are debrief's OWN prose — a separate code path from pacing.ts's statements —
  // so a rounding regression could land in one and not the other.
  const decimal = generated.find((s) => /\d+\.\d+\s*-?\s*minute/.test(s));
  ok('NO debrief string renders a decimal duration', decimal === undefined, decimal ?? '');
  const badArticle = generated.find((s) => /\ba (?:8|11|18|8\d)-minute/.test(s));
  ok('no debrief string reads "a 8-minute" where English needs "an"', badArticle === undefined, badArticle ?? '');
  const zeroMin = generated.find((s) => /\b0 minutes?\b/.test(s));
  ok('no debrief string reads "0 minutes" — a sub-minute interval says "under a minute"',
    zeroMin === undefined, zeroMin ?? '');
  // Sentence-initial durations are capitalised: the pacing note OPENS with the duration, and
  // "under a minute elapsed between …" mid-paragraph would read as a fragment.
  const lowerStart = generated.find((s) => /^(?:under a minute|\d+ minutes?) /.test(s) === false && /^under a minute/.test(s));
  ok('a sentence-initial duration is capitalised', lowerStart === undefined, lowerStart ?? '');
}

// ── PRACTISE ROUTING — the exit, and where it must NOT appear ────────────────
// The debrief decides this, not the renderer: a practise action exists only where the marker
// said something was missed. Same two bands that open a weakness-ledger row, so the exit and
// the steering agree by construction.
{
  console.log('\n-- practise routing --');
  const d = build({
    cumulative: [25, 70, 95, 120, 150, 172, 185, 190],
    bands:   ['exemplary', 'competent', 'weak', 'strong', 'exemplary', 'weak', 'competent', 'nothing'],
    awarded: [10, 8, 2, 6, 12, 2, 6, 0],
    feedback: Array(8).fill('The marker said something.'),
  });
  const areaOf = (order: number) => line(d, order).practise_area;

  ok('a WEAK band gets a practise area', areaOf(3) === 'E2' && areaOf(6) === 'B1', `${areaOf(3)}/${areaOf(6)}`);
  ok('a COMPETENT band gets a practise area', areaOf(2) === 'B5' && areaOf(7) === 'E3', `${areaOf(2)}/${areaOf(7)}`);
  // The load-bearing negatives: do not manufacture work on a requirement that scored.
  ok('an EXEMPLARY band gets NO practise area', areaOf(1) === null && areaOf(5) === null);
  ok('a STRONG band gets NO practise area', areaOf(4) === null);
  // 'nothing' is a blank/no-credit answer — a pacing finding, not evidence of a weak area, and
  // the same reason it opens no ledger row.
  ok("a 'nothing' band gets NO practise area", areaOf(8) === null, String(areaOf(8)));

  ok('the practise area is the 2-character sub-area, not the full LO',
    d.requirements.every((r) => r.practise_area === null || r.practise_area.length === 2),
    d.requirements.map((r) => r.practise_area).join(','));
  // It is a routing target, never display text — the whole point of display_name.
  const LO_SHAPE = /\b[A-E][0-9]{1,2}[a-z]?\b/;
  ok('no syllabus code leaks into any RENDERED debrief field',
    d.requirements.every((r) =>
      !LO_SHAPE.test(r.display_name) && !LO_SHAPE.test(r.what_was_lost) && !LO_SHAPE.test(r.next_action)),
    d.requirements.map((r) => r.display_name).join(' | '));

  // An unmarked requirement has no band, so it offers nothing to practise.
  const unmarked = build({
    cumulative: [25, 70, 95, 120, 150, 172, 185, 190],
    bands: Array(8).fill(null), awarded: Array(8).fill(null), feedback: Array(8).fill(null),
  });
  ok('an UNMARKED requirement gets no practise area',
    unmarked.requirements.every((r) => r.practise_area === null));
}

console.log(`\n${failures === 0 ? 'ALL DEBRIEF FIXTURES PASS' : `${failures} FIXTURE(S) FAILED`}\n`);
process.exitCode = failures === 0 ? 0 : 1;
