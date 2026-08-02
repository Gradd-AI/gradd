// scripts/test-narrative-marker.ts
// Fixtures for the narrative marker (lib/acca/narrative-marker.ts). Pure — no env/DB/model (the model
// layer is a deterministic MOCK grader here; live wiring is out of scope for v1). Proves: the
// deterministic detectors, the code-owned aggregation (partial credit + F1 hard-zero + F5 cap + band),
// and the N1–N5 gates incl. Rule-23 (golden GOOD scores in band, golden BAD below + raises its F-modes).
import {
  scenarioCopyOverlap, factUsed, hasConclusion, aggregate,
  checkRubricCoverage, checkScenarioAnchor, checkGenericCopy, checkRule23, checkCommittedVerdict,
  checkSkillDemand,
  type NarrativeRubric, type CriterionGrader, type CriterionVerdict, type FailureMode, type ScenarioFact,
} from '../lib/acca/narrative-marker';

let failures = 0;
function ok(name: string, cond: boolean) { if (!cond) failures++; console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`); }

// ── sample drill: sources of finance (B3a-shaped), 3 criteria / 6 marks ──
const scenario = "Verdano Ltd is a UK renewable-energy developer seeking finance for a €120m solar project. It has assumed 4% annual revenue growth over ten years. The board is risk-averse and wishes to avoid diluting the founders' 60% equity stake.";
const facts: ScenarioFact[] = [
  { id: 'f_amount', text: 'the €120m solar project', key: '€120m', kind: 'figure' },
  { id: 'f_growth', text: 'the 4% assumed revenue growth', key: '4%', kind: 'figure' },
  { id: 'f_dilution', text: "avoid diluting the founders' 60% stake", key: '60%', kind: 'constraint' },
];
const rubric: NarrativeRubric = {
  mode: 'narrative',
  requirement_parts: ['(i) assess sources', '(ii) recommend a source'],
  scenario_facts: facts,
  criteria: [
    { id: 'c1', requirement_part: '(i) assess sources', lo: 'B3a', required_point: 'assess debt finance given the asset-backed solar project and the wish to avoid dilution', marks: 2, anchor_facts: ['f_amount', 'f_dilution'], disqualifiers: ['F1', 'F5'], development_required: true },
    { id: 'c2', requirement_part: '(i) assess sources', lo: 'B3a', required_point: 'assess an equity source and why dilution makes it unattractive here', marks: 2, anchor_facts: ['f_dilution'], disqualifiers: ['F1', 'F5'], development_required: true },
    { id: 'c3', requirement_part: '(ii) recommend a source', lo: 'B3a', required_point: 'recommend a source and justify the recommendation', marks: 2, anchor_facts: ['f_amount'], disqualifiers: ['F4'], development_required: true },
  ],
  total_marks: 6,
  bands: [{ min: 0, label: 'fail' }, { min: 0.5, label: 'pass' }, { min: 0.7, label: 'good' }],
};

// the GOOD/reveal answer — uses every fact, develops each point, commits a recommendation, original phrasing
const good = "Debt finance suits Verdano because the €120m solar project is asset-backed, therefore lenders have security over the plant, and because debt avoids touching the founders' 60% stake it fits the board's dilution concern. New equity is unattractive here because it would dilute that 60% holding the board wishes to protect, so it works against a stated objective. On balance we recommend project-finance debt for the €120m, as it funds the asset while preserving control.";
// the BAD answer — copies the scenario intro (F1/restating), lists without developing (F2), ignores the
// 60% dilution fact (F5), and never recommends (F4). Designed F-modes: F2, F4, F5.
const bad = "Verdano Ltd is a UK renewable-energy developer seeking finance for a €120m solar project. It has assumed 4% annual revenue growth over ten years. Sources include debt, equity and leasing. Debt and equity are both options that could be considered by the company.";

// deterministic MOCK grader (stands in for the constrained model): developed → yes, mentioned-only → partial (F2), absent → no
const KW: Record<string, string> = { c1: 'debt', c2: 'equity', c3: 'recommend' };
const DEV = /because|therefore|so that|which means|unattractive|avoids|justif|on balance|preserv/i;
const mockGrader: CriterionGrader = (c, answer): CriterionVerdict => {
  const a = answer.toLowerCase(), kw = KW[c.id];
  const mentions = a.includes(kw);
  const met = !mentions ? 'no' : DEV.test(answer) ? 'yes' : 'partial';
  const flags: FailureMode[] = [];
  if (met === 'partial') flags.push('F2');
  if (c.id === 'c3' && !hasConclusion(answer)) flags.push('F4');
  const span = mentions ? (answer.split(/(?<=[.!?])\s+/).find((s) => s.toLowerCase().includes(kw)) ?? '') : '';
  return { criterion_id: c.id, met, evidence_span: span, failure_flags: flags };
};

// ── deterministic detectors ──
ok('scenarioCopyOverlap HIGH on a verbatim-copied answer', scenarioCopyOverlap(bad, scenario) > 0.15);
ok('scenarioCopyOverlap LOW on an original answer', scenarioCopyOverlap(good, scenario) < 0.05);
ok('factUsed: key present', factUsed(good, facts[2]) && factUsed(good, facts[0]));
ok('factUsed: key absent (BAD omits the 60% dilution fact)', !factUsed(bad, facts[2]));
ok('hasConclusion: GOOD commits, BAD does not', hasConclusion(good) && !hasConclusion(bad));

// ── aggregation (code-owned) ──
(async () => {
  const goodV = await Promise.all(rubric.criteria.map((c) => mockGrader(c, good, scenario)));
  const badV = await Promise.all(rubric.criteria.map((c) => mockGrader(c, bad, scenario)));
  const gRes = aggregate(rubric, goodV, scenario, good), bRes = aggregate(rubric, badV, scenario, bad);
  ok('GOOD aggregates to full marks (6/6) → band "good"', gRes.awarded === 6 && gRes.band === 'good');
  ok('BAD scores well below GOOD (missing anchors F5 cap + no recommendation F4)', bRes.awarded < 3 && bRes.fraction < gRes.fraction);
  ok('BAD raises its designed F-modes (F2 list, F4 fence-sit, F5 missing anchor)', ['F2', 'F4', 'F5'].every((f) => bRes.per_criterion.some((p) => p.flags.includes(f as FailureMode))));
  // F1 hard-zero: a verdict whose evidence span is copied from the scenario → criterion voided
  const copiedSpan = scenario.slice(0, 90);
  const f1Verdicts: CriterionVerdict[] = [{ criterion_id: 'c1', met: 'yes', evidence_span: copiedSpan, failure_flags: [] }, { criterion_id: 'c2', met: 'yes', evidence_span: 'original equity analysis', failure_flags: [] }, { criterion_id: 'c3', met: 'yes', evidence_span: 'on balance we recommend', failure_flags: [] }];
  const f1Res = aggregate(rubric, f1Verdicts, scenario, good);
  ok('F1 hard-zero: a criterion whose evidence span is copied scores 0 (voided)', f1Res.per_criterion.find((p) => p.criterion_id === 'c1')!.marks === 0 && f1Res.per_criterion.find((p) => p.criterion_id === 'c1')!.capped);

  // F12 in the union + evidence_anchor on a criterion (page-verified F-catalogue extension 2026-07-20)
  const f12Crit = { ...rubric.criteria[0], disqualifiers: ['F1', 'F12'] as FailureMode[], evidence_anchor: 'J24 p.14' };
  const f12Rubric = { ...rubric, criteria: [f12Crit, rubric.criteria[1], rubric.criteria[2]] };
  const f12Res = aggregate(f12Rubric, goodV, scenario, good);
  ok('F12 disqualifier + evidence_anchor: criterion still aggregates (F12 latent, not raised on a clean answer)', f12Res.per_criterion[0].marks === 2 && !f12Res.per_criterion[0].flags.includes('F12' as FailureMode));

  // FR1 (Grant 20/07/2026): a criterion marks RECOGNITION however expressed — an insight stated in WORDS,
  // using the scenario anchors but quoting NO ratio/statistic, scores in full. Marks are not gated on a number.
  const goodWords = "Debt suits Verdano because the €120m solar project is asset-backed, therefore lenders have security over the plant, and because debt avoids touching the founders' 60% stake it fits the board's dilution concern. New equity is unattractive here because it would dilute that 60% holding the board wishes to protect, so it works against a stated objective. On balance we recommend project-finance debt for the €120m, as it funds the asset while preserving control.";
  const wordsV = await Promise.all(rubric.criteria.map((c) => mockGrader(c, goodWords, scenario)));
  const wordsRes = aggregate(rubric, wordsV, scenario, goodWords);
  ok('FR1: insight-in-words (anchored, no quoted ratio/statistic) scores FULL marks', wordsRes.awarded === 6 && wordsRes.band === 'good');

  // ── N1–N5 gates ──
  ok('N1 rubric-coverage PASS (reveal all-yes; every part mapped)', (await checkRubricCoverage(rubric, good, scenario, mockGrader)).ok);
  const gap = { ...rubric, requirement_parts: [...rubric.requirement_parts, '(iii) discuss risk'] };
  ok('N1 FAILS when a requirement part has no criterion (F7)', !(await checkRubricCoverage(gap, good, scenario, mockGrader)).ok);

  ok('N2 scenario-anchor PASS (facts in scenario, used in reveal)', checkScenarioAnchor(rubric, scenario, good).ok);
  const badAnchor = { ...rubric, scenario_facts: [...facts, { id: 'f_ghost', text: 'a US listing', key: 'NASDAQ', kind: 'entity' as const }], criteria: rubric.criteria.map((c) => c.id === 'c1' ? { ...c, anchor_facts: [...c.anchor_facts, 'f_ghost'] } : c) };
  ok('N2 FAILS when an anchor fact is not in the scenario', !checkScenarioAnchor(badAnchor, scenario, good).ok);
  ok('N2 FAILS when the reveal does not use a required anchor', !checkScenarioAnchor(rubric, scenario, bad).ok);

  ok('N3 generic/copy PASS on the original reveal', checkGenericCopy(good, scenario).ok);
  ok('N3 FAILS on a scenario-restating reveal', !checkGenericCopy(bad, scenario).ok);

  ok('N4 Rule-23 PASS (GOOD in band, BAD below + designed flags raised)', (await checkRule23(rubric, scenario, good, bad, ['F2', 'F4', 'F5'], mockGrader)).ok);
  const blindGrader: CriterionGrader = (c) => ({ criterion_id: c.id, met: 'yes', evidence_span: 'x', failure_flags: [] });
  ok('N4 FAILS with a blind grader that cannot tell GOOD from BAD', !(await checkRule23(rubric, scenario, good, bad, ['F2', 'F4', 'F5'], blindGrader)).ok);

  ok('N5 committed-verdict PASS (reveal recommends)', checkCommittedVerdict(rubric, good).ok);
  ok('N5 FAILS when the reveal never commits (F4)', !checkCommittedVerdict(rubric, bad).ok);

  // ══════════════════════════════════════════════════════════════════════════════════════
  // N6 — skill-demand structure. EVERY FAILURE PATH IS EXERCISED (P-G3: a check that has never
  // failed is an untested branch, and the fail path is the only reason the gate exists).
  // ══════════════════════════════════════════════════════════════════════════════════════
  const scepScenario = 'Siam Axle PCL exports to three currency blocs. The Group Treasurer told the board: "We are fully hedged against currency risk under our rolling 90-day policy." Its cost base is entirely in Thai baht while all revenue is in USD.';
  const scepFacts: ScenarioFact[] = [
    { id: 'f_claim', text: 'the treasurer\'s claim', key: 'fully hedged', kind: 'entity' },
    { id: 'f_costbase', text: 'baht cost base', key: 'Thai baht', kind: 'constraint' },
    { id: 'f_blocs', text: 'three currency blocs', key: 'three currency blocs', kind: 'figure' },
  ];
  const scepCrit = (over: Partial<NarrativeRubric['criteria'][0]> = {}) => ({
    id: 'c1', requirement_part: 'p1', lo: 'E2a', required_point: 'shows the claim does not hold',
    marks: 6, anchor_facts: ['f_claim'], disqualifiers: ['F1', 'F10'] as FailureMode[], development_required: true, ...over,
  });
  const scepRubric = (crits: NarrativeRubric['criteria']): NarrativeRubric => ({
    mode: 'narrative', requirement_parts: ['p1'], scenario_facts: scepFacts, criteria: crits,
    total_marks: crits.reduce((a, c) => a + c.marks, 0), bands: [{ min: 0, label: 'fail' }, { min: 0.5, label: 'pass' }],
  });

  // ── the known-good set ──
  const scepGood = checkSkillDemand(scepRubric([scepCrit()]), scepScenario, 'scepticism');
  ok('N6 PASS on a well-formed scepticism rubric', scepGood.ok && scepGood.evaluatedAll);
  ok('N6 all three parts evaluated on scepticism (a/b/c)', scepGood.parts.length === 3 && scepGood.parts.every((p) => p.status === 'pass'));

  // ── N6a break modes ──
  ok('N6a FAILS when F10 carries under half the marks',
    !checkSkillDemand(scepRubric([scepCrit(), scepCrit({ id: 'c2', marks: 7, disqualifiers: ['F1'] })]), scepScenario, 'scepticism').ok);
  ok('N6a FAILS when NO criterion names F10 (the pre-2026-08-02 corpus shape)',
    !checkSkillDemand(scepRubric([scepCrit({ disqualifiers: ['F1', 'F5'] })]), scepScenario, 'scepticism').ok);
  ok('N6a is exactly-half-inclusive (a 50/50 split passes, not fails)',
    checkSkillDemand(scepRubric([scepCrit({ marks: 6 }), scepCrit({ id: 'c2', marks: 6, disqualifiers: ['F1'] })]), scepScenario, 'scepticism').parts[0].status === 'pass');
  ok('N6a uses the SUMMED criteria marks, not a total_marks that disagrees with them', (() => {
    const r = scepRubric([scepCrit({ marks: 6 }), scepCrit({ id: 'c2', marks: 6, disqualifiers: ['F1'] })]);
    r.total_marks = 100;  // drifted stated total — must not move the ratio
    return checkSkillDemand(r, scepScenario, 'scepticism').parts[0].status === 'pass';
  })());

  // ── N6b break modes ──
  ok('N6b FAILS for scepticism when the scenario asserts nothing (no quoted span)',
    !checkSkillDemand(scepRubric([scepCrit()]), 'Siam Axle PCL exports to three currency blocs and its cost base is in Thai baht.', 'scepticism').ok);
  ok('N6b FAILS for scepticism on a short quote (under 6 words — not a real assertion)',
    !checkSkillDemand(scepRubric([scepCrit()]), 'The treasurer said "fully hedged" last quarter.', 'scepticism').ok);
  ok('N6b accepts CURLY quotes as well as straight',
    checkSkillDemand(scepRubric([scepCrit()]), 'The Treasurer told the board: “We are fully hedged against currency risk here.”', 'scepticism').parts[1].status === 'pass');
  ok('N6b does not swallow the text on an UNPAIRED quote character',
    !checkSkillDemand(scepRubric([scepCrit()]), 'The treasurer said "we are fully hedged against all currency risk and more', 'scepticism').ok);
  ok('N6b FAILS for commercial_acumen with a figure but NO constraint (a price with no limit)',
    !checkSkillDemand({ ...scepRubric([scepCrit()]), scenario_facts: [{ id: 'f1', text: 'cost', key: 'USD 2.1m', kind: 'figure' }] }, scepScenario, 'commercial_acumen').ok);
  ok('N6b PASSES for commercial_acumen with both a figure and a constraint',
    checkSkillDemand({ ...scepRubric([scepCrit()]), scenario_facts: [{ id: 'f1', text: 'cost', key: 'USD 2.1m', kind: 'figure' }, { id: 'f2', text: 'threshold', key: '24 months', kind: 'constraint' }] }, scepScenario, 'commercial_acumen').ok);
  ok('N6b FAILS for analysis_and_evaluation with only ONE figure (nothing to weigh against)',
    !checkSkillDemand({ ...scepRubric([scepCrit()]), scenario_facts: [{ id: 'f1', text: 'mean', key: '480bn', kind: 'figure' }] }, scepScenario, 'analysis_and_evaluation').ok);

  // ── the deliberate not_evaluated paths — these must NOT read as green ──
  const commRes = checkSkillDemand(scepRubric([scepCrit()]), scepScenario, 'communication');
  ok('N6b communication is NOT_EVALUATED, never a silent pass (no phrase table)',
    commRes.parts[1].status === 'not_evaluated' && !commRes.evaluatedAll);
  ok('N6 with a communication skill still reports ok=true but evaluatedAll=false', commRes.ok && !commRes.evaluatedAll);
  const noSkill = checkSkillDemand(scepRubric([scepCrit()]), scepScenario, null);
  ok('N6 with NO declared skill is not_evaluated, and does not invent one', !noSkill.evaluatedAll && noSkill.parts.length === 1 && noSkill.parts[0].status === 'not_evaluated');
  ok('N6 with an EMPTY-STRING skill is also not_evaluated', !checkSkillDemand(scepRubric([scepCrit()]), scepScenario, '   ').evaluatedAll);
  ok('N6 with an UNREGISTERED skill is not_evaluated, never a pass',
    checkSkillDemand(scepRubric([scepCrit()]), scepScenario, 'time_management').parts[1].status === 'not_evaluated');
  ok('N6 on an EMPTY rubric is not_evaluated, not a vacuous pass',
    !checkSkillDemand(scepRubric([]), scepScenario, 'scepticism').evaluatedAll);
  ok('N6c is not_evaluated (structurally N/A) for commercial_acumen',
    checkSkillDemand({ ...scepRubric([scepCrit()]), scenario_facts: [{ id: 'f1', text: 'c', key: 'USD 2.1m', kind: 'figure' }, { id: 'f2', text: 't', key: '24 months', kind: 'constraint' }] }, scepScenario, 'commercial_acumen').parts[2].status === 'not_evaluated');

  // ── N6c break modes ──
  ok('N6c FAILS when an F10 criterion does not anchor on the asserted claim',
    !checkSkillDemand(scepRubric([scepCrit({ anchor_facts: ['f_costbase'] })]), scepScenario, 'scepticism').ok);
  ok('N6c FAILS when the quoted assertion contains NO scenario_fact key (claim unreachable as an anchor)',
    !checkSkillDemand(scepRubric([scepCrit()]), 'The Treasurer told the board: "Our position is entirely satisfactory this year." Costs are in Thai baht.', 'scepticism').ok);
  ok('N6c does NOT double-count: with no quoted assertion at all it is not_evaluated, not a second failure', (() => {
    const r = checkSkillDemand(scepRubric([scepCrit()]), 'Siam Axle exports widely and its cost base is in Thai baht.', 'scepticism');
    return r.parts[1].status === 'fail' && r.parts[2].status === 'not_evaluated';
  })());
  ok('N6c passes when EVERY F10 criterion anchors the claim, including a second one',
    checkSkillDemand(scepRubric([scepCrit(), scepCrit({ id: 'c2', anchor_facts: ['f_claim', 'f_costbase'] })]), scepScenario, 'scepticism').ok);

  console.log(failures === 0 ? '\nALL NARRATIVE-MARKER FIXTURES PASS' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})();
