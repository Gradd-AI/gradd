// scripts/test-case-marking-descriptors.ts
// Pure fixtures for the paper-keyed professional-skills descriptors in
// lib/acca/case-marking.ts. NO model call, NO DB, NO network. A dummy
// ANTHROPIC_API_KEY is set only so the module's import-time Anthropic client
// construction doesn't throw — no request is ever made (this test only reads the
// descriptor maps). Proves: the AFM set loads for an AFM case, and APM's wording
// is byte-for-byte unchanged by the paper-keying refactor.

process.env.ANTHROPIC_API_KEY ||= 'test-key-unused-no-request-made';

(async () => {
  const { getSkillDescriptors, SKILL_DESCRIPTORS_BY_PAPER } = await import('../lib/acca/case-marking');

  let failures = 0;
  function ok(name: string, cond: boolean) {
    if (!cond) failures++;
    console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
  }

  const SKILLS = ['communication', 'analysis_and_evaluation', 'scepticism', 'commercial_acumen'];

  const afm = getSkillDescriptors('AFM');
  const apm = getSkillDescriptors('APM');

  // ── Both sets are complete ──
  ok('AFM set has a non-empty descriptor for all 4 skills', SKILLS.every((s) => typeof afm[s] === 'string' && afm[s].length > 0));
  ok('APM set has a non-empty descriptor for all 4 skills', SKILLS.every((s) => typeof apm[s] === 'string' && apm[s].length > 0));

  // ── APM wording UNTOUCHED — pin the exact original phrases (regression on the refactor) ──
  ok('APM communication unchanged (opening verbatim)', apm.communication.startsWith('inform concisely, objectively and unambiguously in a suitable style and format'));
  ok('APM commercial_acumen unchanged (APM-only "measurement and management of objectives")', apm.commercial_acumen.includes('measurement and management of objectives'));
  ok('APM commercial_acumen unchanged (APM-only "behavioural, process and system-related")', apm.commercial_acumen.includes('behavioural, process and system-related'));
  ok('APM analysis_and_evaluation unchanged ("establish reasons and causes")', apm.analysis_and_evaluation.includes('establish') && apm.analysis_and_evaluation.includes('reasons and causes'));

  // ── AFM verbatim markers — phrases present in AFM §F and absent from APM's set ──
  ok('AFM communication carries "using appropriate technology"', afm.communication.includes('using appropriate technology'));
  ok('AFM A&E carries the 4th sub-point (d) "Appraise information objectively"', afm.analysis_and_evaluation.includes('Appraise information objectively'));
  ok('AFM A&E (d) "balancing the costs, risks, benefits and opportunities"', afm.analysis_and_evaluation.includes('balancing the costs, risks, benefits and opportunities'));
  ok('AFM scepticism carries "wider professional, ethical, organisational, or public interest"', afm.scepticism.includes('wider professional, ethical, organisational, or public interest'));
  ok('AFM commercial_acumen carries "financial management decisions of an organisation"', afm.commercial_acumen.includes('financial management decisions of an organisation'));
  ok('AFM commercial_acumen lead-in verbatim ("Demonstrate awareness of organisational and external factors")', afm.commercial_acumen.startsWith('Demonstrate awareness of organisational and external factors'));

  // ── AFM must NOT carry APM-only concepts (proves the sets are genuinely separate, not aliased) ──
  ok('AFM commercial_acumen does NOT contain APM-only "measurement and management of objectives"', !afm.commercial_acumen.includes('measurement and management of objectives'));
  ok('AFM commercial_acumen does NOT contain APM-only "behavioural, process and system-related"', !afm.commercial_acumen.includes('behavioural, process and system-related'));

  // ── The two sets differ for every skill ──
  ok('AFM and APM descriptors differ for every skill', SKILLS.every((s) => afm[s] !== apm[s]));

  // ── by-paper map exposes exactly APM + AFM ──
  ok('SKILL_DESCRIPTORS_BY_PAPER carries both APM and AFM', !!SKILL_DESCRIPTORS_BY_PAPER.APM && !!SKILL_DESCRIPTORS_BY_PAPER.AFM);
  ok('getSkillDescriptors(AFM) is the AFM map (identity)', getSkillDescriptors('AFM') === SKILL_DESCRIPTORS_BY_PAPER.AFM);
  ok('getSkillDescriptors(APM) is the APM map (identity)', getSkillDescriptors('APM') === SKILL_DESCRIPTORS_BY_PAPER.APM);

  console.log(failures === 0 ? '\nALL CASE-MARKING DESCRIPTOR FIXTURES PASS' : `\n${failures} FAILURE(S)`);
  process.exit(failures === 0 ? 0 : 1);
})();
