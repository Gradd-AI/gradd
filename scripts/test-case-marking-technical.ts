// scripts/test-case-marking-technical.ts
// Fixtures for the technical band→apportion marking (lib/acca/case-marking.ts).
// The arithmetic core (apportionTechnicalMarks) and isBlankAnswer are PURE. A dummy
// ANTHROPIC_API_KEY is set only so the module's import-time client construction
// doesn't throw — the ONE async call here (judgeCaseMarking on a BLANK answer) takes
// the no-model short-circuit path, so NO network request is ever made.

import type { TechnicalBand } from '../lib/acca/case-marking';  // erased at compile time — no runtime module load

process.env.ANTHROPIC_API_KEY ||= 'test-key-unused-no-request-made';

(async () => {
  const { apportionTechnicalMarks, isBlankAnswer, judgeCaseMarking } = await import('../lib/acca/case-marking');
  const { markerLabel } = await import('../lib/acca/requirement-label');

  let failures = 0;
  function ok(name: string, cond: boolean) {
    if (!cond) failures++;
    console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
  }

  const req = (id: string, marks_guide: number, band: TechnicalBand) =>
    ({ requirement_id: id, marks_guide, band, feedback: '' });

  // ── isBlankAnswer ──
  ok('blank: empty string', isBlankAnswer('') === true);
  ok('blank: whitespace only', isBlankAnswer('   \n\t ') === true);
  ok('blank: a stray char', isBlankAnswer('-') === true);
  ok('blank: 2 alphanumerics (n/a)', isBlankAnswer('n/a') === true);
  ok('not blank: 3+ alphanumerics', isBlankAnswer('idk') === false);
  ok('not blank: a real answer', isBlankAnswer('The NPV is positive so accept.') === false);

  // ── basic apportionment (Section A pool 40, all four quality bands) ──
  // raw = [16×1, 10×.75, 8×.5, 6×.25] = [16, 7.5, 4, 1.5] = 29 → round 29;
  // floors [16,7,4,1]=28, surplus 1 → highest fractional (.5, first tie) → [16,8,4,1].
  {
    const r = apportionTechnicalMarks([req('a', 16, 'exemplary'), req('b', 10, 'strong'), req('c', 8, 'competent'), req('d', 6, 'weak')]);
    ok('basic: available = Σ marks_guide (40)', r.technical_marks_available === 40);
    ok('basic: awarded = 29', r.technical_marks_awarded === 29);
    ok('basic: per-req marks [16,8,4,1]', JSON.stringify(r.per_requirement.map((p) => p.mark_awarded)) === '[16,8,4,1]');
    ok('basic: per-req marks sum to awarded', r.per_requirement.reduce((a, p) => a + p.mark_awarded, 0) === r.technical_marks_awarded);
  }

  // ── 'nothing' band scores exactly 0 and never steals a surplus ──
  {
    const r = apportionTechnicalMarks([req('a', 16, 'exemplary'), req('b', 10, 'nothing'), req('c', 8, 'strong'), req('d', 6, 'competent')]);
    // raw = [16, 0, 6, 3] = 25, no surplus → [16,0,6,3]
    ok("nothing: the 'nothing' requirement awards 0", r.per_requirement.find((p) => p.requirement_id === 'b')!.mark_awarded === 0);
    ok('nothing: awarded = 25/40', r.technical_marks_awarded === 25 && r.technical_marks_available === 40);
  }
  // adversarial surplus: a 'nothing' item must NOT absorb a rounding surplus
  {
    // raw = [12×.75, 0, 8×.75] = [9, 0, 6] = 15 (integers, no surplus) — and a fractional variant:
    const r = apportionTechnicalMarks([req('a', 16, 'strong'), req('b', 10, 'nothing'), req('c', 6, 'strong')]);
    // raw = [12, 0, 4.5] = 16.5 → round 17 (Math.round half-up); floors [12,0,4]=16, surplus 1 → index2 (.5) → 5, NOT index1
    ok('surplus never lands on a nothing band', r.per_requirement.find((p) => p.requirement_id === 'b')!.mark_awarded === 0);
    ok('surplus lands on the positive-fraction item', r.per_requirement.find((p) => p.requirement_id === 'c')!.mark_awarded === 5);
    ok('adversarial: awarded = 17', r.technical_marks_awarded === 17);
  }

  // ── full-blank paper scores 0/100 (technical + PS) ──
  // Three cases: A pool 40 [16,10,8,6], B1 pool 20 [12,8], B2 pool 20 [12,8] — every
  // requirement 'nothing' (blank). Technical 0/80. PS pools 10+5+5 = 20; a blank whole
  // answer short-circuits judgeCaseMarking to 0 with NO model call. Total 0/100.
  {
    const secA = apportionTechnicalMarks([req('a1', 16, 'nothing'), req('a2', 10, 'nothing'), req('a3', 8, 'nothing'), req('a4', 6, 'nothing')]);
    const b1 = apportionTechnicalMarks([req('b1', 12, 'nothing'), req('b2', 8, 'nothing')]);
    const b2 = apportionTechnicalMarks([req('c1', 12, 'nothing'), req('c2', 8, 'nothing')]);
    const techAwarded = secA.technical_marks_awarded + b1.technical_marks_awarded + b2.technical_marks_awarded;
    const techAvailable = secA.technical_marks_available + b1.technical_marks_available + b2.technical_marks_available;
    ok('full-blank: technical awarded 0', techAwarded === 0);
    ok('full-blank: technical available 80', techAvailable === 80);

    // PS on a blank paper → 0 (no model call, blank short-circuit).
    //
    // ⚠️ `wholeAnswer` CARRIES THE REAL LABELLED JOIN, and `answersOnly` the empty answers.
    // These cases used to pass '' / '   ' / '-' as wholeAnswer with no labels at all, and
    // that is precisely why they stayed green through a live defect: production never builds
    // an unlabelled string. lib/acca/case-mark-run.ts joins `${label}\n${answer}` per
    // requirement, so a fully blank AFM sit reached the old guard as 22-46 alphanumerics of
    // requirement headings, sailed past isBlankAnswer's 3-char threshold, and was model-judged
    // 'weak' across the board — 5/20 on professional skills for an empty paper.
    //
    // ── AND THE LABELS ARE NOW STRIPPED (2026-08-13) ──────────────────────────
    // Production runs the stored label through `markerLabel` before the PS pass reads it, so
    // hardcoding the RAW string here would reintroduce exactly the unfaithfulness the note
    // above exists to prevent — a fixture asserting a join production stopped building.
    // `psJoin` therefore performs the SAME transformation with the SAME function over the
    // real stored labels, rather than pinning its output: if the strip changes, this moves
    // with it instead of quietly disagreeing.
    const psJoin = (rows: Array<[string, string]>, answers: string[]) =>
      rows.map(([label, lo], i) =>
        `${(markerLabel(label, lo) ?? '').trim() || `Requirement ${i + 1}`}\n${answers[i]}`).join('\n\n');

    ok('the stripped PS join really is shorter than the raw one it replaced',
      psJoin([['(i) B3e — 10 marks', 'B3e']], ['']).length < '(i) B3e — 10 marks\n'.length);
    ok('the stripped PS join carries NO syllabus code into the PS pass',
      !/\b[A-E][0-9]{1,2}[a-z]?\b/.test(psJoin([['(i) B3e — 10 marks', 'B3e'], ['(ii) B5b — 16 marks', 'B5b']], ['', ''])));
    ok('the stripped PS join carries NO technical mark allocation into the PS pass',
      !/marks?/i.test(psJoin([['(i) B3e — 10 marks', 'B3e'], ['(ii) B5b — 16 marks', 'B5b']], ['', ''])));

    // ⛔ THE `Requirement N` FALLBACK IS NOW REACHABLE, so it is exercised (P-G3). Before the
    // strip no stored label was ever empty, so this arm was dead code; a label that is ONLY a
    // code strips to null and lands here. Measured as 0 live rows today (every requirement has
    // a lo_code, and no label is code-only), which is why it is a guard and not the main path.
    ok('a code-only label falls back to "Requirement N", never to an empty heading',
      psJoin([['B3e', 'B3e']], ['answer text']) === 'Requirement 1\nanswer text');
    ok('a null label falls back the same way',
      psJoin([[null as unknown as string, 'B3e']], ['answer text']) === 'Requirement 1\nanswer text');
    ok('an APM descriptive label is NOT replaced by the fallback',
      psJoin([['(i) The benchmarking exercise', null as unknown as string]], ['x'])
        === '(i) The benchmarking exercise\nx');

    const psA = await judgeCaseMarking({
      paper: 'AFM', context: 'ctx',
      wholeAnswer: psJoin(
        [['(i) B3e — 10 marks', 'B3e'], ['(ii) B5b — 16 marks', 'B5b'], ['(iii) E2b — 8 marks', 'E2b'], ['(iv) E1a — 6 marks', 'E1a']],
        ['', '', '', '']),
      answersOnly: '\n\n\n\n\n\n',
      examinedSkills: ['communication', 'analysis_and_evaluation', 'scepticism', 'commercial_acumen'], professionalSkillsMarks: 10 });
    const psB1 = await judgeCaseMarking({
      paper: 'AFM', context: 'ctx',
      wholeAnswer: psJoin([['(i) B1a — 12 marks', 'B1a'], ['(ii) B1b — 8 marks', 'B1b']], ['', '']),
      answersOnly: '\n\n   ',
      examinedSkills: ['analysis_and_evaluation', 'scepticism'], professionalSkillsMarks: 5 });
    const psB2 = await judgeCaseMarking({
      paper: 'AFM', context: 'ctx',
      wholeAnswer: psJoin([['(i) E3a — 12 marks', 'E3a'], ['(ii) E2a — 8 marks', 'E2a']], ['', '']),
      answersOnly: '-\n\n',
      examinedSkills: ['scepticism', 'commercial_acumen'], professionalSkillsMarks: 5 });
    const psAwarded = psA.professional_marks_awarded + psB1.professional_marks_awarded + psB2.professional_marks_awarded;
    const psAvailable = psA.professional_marks_available + psB1.professional_marks_available + psB2.professional_marks_available;
    ok('full-blank: PS awarded 0 (blank short-circuit, no model call)', psAwarded === 0);
    ok('full-blank: PS bands all "nothing"', [psA, psB1, psB2].every((r) => r.per_skill.every((s) => s.band === 'nothing')));
    ok('full-blank: PS available 20', psAvailable === 20);

    ok('full-blank: PAPER = 0/100', (techAwarded + psAwarded) === 0 && (techAvailable + psAvailable) === 100);
  }

  // ── mixed paper sums correctly to /100 ──
  // Technical (computed): A [16,10,8,6] bands [exemplary,strong,competent,nothing]
  //   raw [16,7.5,4,0]=27.5→28 → [16,8,4,0] = 28/40
  // B1 [12,8] [strong,weak] raw [9,2]=11 → 11/20 ; B2 [12,8] [competent,exemplary] [6,8]=14 → 14/20
  // Technical 53/80. PS (representative awarded): 7/10 + 3/5 + 4/5 = 14/20. Paper 67/100.
  {
    const secA = apportionTechnicalMarks([req('a1', 16, 'exemplary'), req('a2', 10, 'strong'), req('a3', 8, 'competent'), req('a4', 6, 'nothing')]);
    const b1 = apportionTechnicalMarks([req('b1', 12, 'strong'), req('b2', 8, 'weak')]);
    const b2 = apportionTechnicalMarks([req('c1', 12, 'competent'), req('c2', 8, 'exemplary')]);
    ok('mixed: Section A technical = 28/40', secA.technical_marks_awarded === 28 && secA.technical_marks_available === 40);
    ok('mixed: Section B1 technical = 11/20', b1.technical_marks_awarded === 11 && b1.technical_marks_available === 20);
    ok('mixed: Section B2 technical = 14/20', b2.technical_marks_awarded === 14 && b2.technical_marks_available === 20);

    const techAwarded = secA.technical_marks_awarded + b1.technical_marks_awarded + b2.technical_marks_awarded;
    const techAvailable = secA.technical_marks_available + b1.technical_marks_available + b2.technical_marks_available;
    ok('mixed: technical 53/80', techAwarded === 53 && techAvailable === 80);

    // Representative PS results (PS band→marks arithmetic is proven elsewhere).
    const psAwarded = 7 + 3 + 4;
    const psAvailable = 10 + 5 + 5;
    ok('mixed: PAPER = 67/100', (techAwarded + psAwarded) === 67 && (techAvailable + psAvailable) === 100);
  }

  console.log(failures === 0 ? '\nALL CASE-MARKING TECHNICAL FIXTURES PASS' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})();
