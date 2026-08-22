#!/usr/bin/env tsx
/**
 * test-narrative-paper-pins.ts
 *
 * THE BAR FOR GIVING THE GENERATOR A SECOND PAPER: AFM's output must be provably unchanged.
 *
 * `scripts/generate-afm-drills.ts` became `scripts/generate-acca-drills.ts` on 2026-08-19 and
 * its NARRATIVE half was parameterised by paper (SBL joined AFM). Every paper-coupled surface
 * in that half — the authoring persona, the authoring prompt, the professional-skill demand
 * table, the teaching-reveal persona and prompt, the draft filename, and the `paper_code`
 * written to the row — was previously an AFM literal. This file pins each of them.
 *
 * The claim being defended is narrow: FOR AFM, the model receives the same bytes it received
 * before, and the row built for an AFM narrative drill is byte-identical, so nothing authored
 * before the change would author differently after it. IF ANY PIN BELOW MOVES, that claim is
 * dead and the moved output has to be re-reviewed, not re-pinned.
 *
 * ── WHICH PINS ARE GENUINE PRE-CHANGE CAPTURES, AND WHICH ARE DERIVED ─────────────────────
 *
 * ALL of PIN1–PIN6 are TRUE PRE-CHANGE CAPTURES. PIN1–PIN5 were read off a copy of the
 * pre-change file: `head -3974 scripts/generate-afm-drills.ts` (the whole file bar its final
 * `main().catch(...)` invocation line, dropped only so the module could be imported at all)
 * plus an appended export block. No other edit. The values were then re-read from the changed
 * module and compared. PIN6 was read from `git show HEAD:lib/acca/narrative-grader.ts` before
 * that file's marker prompt was split per paper.
 *
 * PIN6 IS THE ONE ADDED IN ARREARS, and it is worth saying why. The grader's marker prompt was
 * NOT on the list of paper-coupled sites — it is a different module, and nothing about it is
 * typed or named per paper. It surfaced only when the SBL batch was actually RUN: an SBL drill
 * was being gated by a marker told it was marking Advanced Financial Management, against a
 * three-limb development test, while its rubric was written to ACCA's published four-limb one.
 * Reading the code found six coupled sites; running it found the seventh.
 *
 * PIN1 is the strongest of the five and deserves naming separately: the six committed drafts in
 * `docs/rollbacks/AFM_narrative_draft_D*.json` were written by the PRE-CHANGE generator, in git,
 * months before this refactor. Rebuilding each one through the CHANGED `buildNarrativeRow` and
 * getting the committed bytes back is a pin nothing in this session could have staged.
 *
 * TWO DIFFERENCES WERE FOUND AND ARE DECLARED, NOT PINNED AWAY:
 *   (a) `NarrativePlan` gained a required `paper` field; all eleven AFM plans now declare
 *       `paper: 'AFM'`. Verified to be the ONLY added key, with no other field touched.
 *   (b) The intermediate object handed to the teaching-reveal prompt changed shape
 *       (`AfmDrillSpec` → the five-field `RevealInput`). What matters is the PROMPT BYTES it
 *       produces, and those are pinned identical for all eleven plans — including D7 (E2c,
 *       AFM mode `mixed`) and D10 (E3a, AFM mode `quantitative`), the two plans that would have
 *       moved had the reveal's `mode` been hardcoded to the honest 'discursive'. See
 *       `loModeFor` for why the odd-looking value is preserved rather than corrected here.
 *
 * ⚠️ CLAIM CEILING. Green here means AFM's authoring INPUTS and its built ROW are unchanged. It
 * says nothing about what the model returns for either paper — that is what the N1–N6 barrier
 * and a human reading the pack are for. It also does not pin the CALCULATOR half, which never
 * became paper-aware (`NUMERIC_BATCH_PAPER`).
 *
 * Pure: no DB, no model, no env. Importing the generator is safe because it now carries a
 * main-module guard; before this change it ran `main()` on import, which is the reason the
 * pre-change capture had to be taken from a stripped copy.
 *
 * Usage: npx tsx scripts/test-narrative-paper-pins.ts
 */

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  buildNarrativeUserPrompt, buildNarrativeRow, narrativeDraftPath, draftToGateInput,
  serializeNarrativeSchema, buildRevealPromptAfm, buildRevealPromptSbl, REVEAL_PROMPT_BUILDER,
  NARRATIVE_AUTHOR_PERSONA, SKILL_DEMAND_BY_PAPER, skillDemandFor, NARRATIVE_PLAN,
  PAPER_FRAMEWORKS, frameworkFor, assertNarrativePlanIds, NUMERIC_BATCH_PAPER,
  type NarrativePlan,
} from './generate-acca-drills';
import { makeAnthropicCriterionGrader } from '../lib/acca/narrative-grader';
import { PROFESSIONAL_SKILLS as AFM_SKILLS } from './afm-framework';
import { PROFESSIONAL_SKILLS as SBL_SKILLS, SYLLABUS_MAP as SBL_SYLLABUS } from './sbl-framework';

let pass = 0;
const failures: string[] = [];
function check(name: string, ok: boolean, detail = ''): void {
  if (ok) { pass++; return; }
  failures.push(`${name}${detail ? ` — ${detail}` : ''}`);
}
function throws(name: string, fn: () => unknown, needle?: string): void {
  try { fn(); check(name, false, 'did not throw'); }
  catch (e) {
    const msg = (e as Error).message;
    check(name, !needle || msg.includes(needle), needle ? `threw "${msg}", expected to mention "${needle}"` : '');
  }
}

const sha = (s: string) => createHash('sha256').update(s, 'utf8').digest('hex').slice(0, 16);

// ─────────────────────────────────────────────────────────────────────────────
// PIN1 — THE BUILT ROW. Every committed AFM narrative draft, rebuilt and compared byte-for-byte.
// Pre-change artefacts, written by the pre-change generator and already in git.
// ─────────────────────────────────────────────────────────────────────────────
const DRAFT_DIR = join(__dirname, '..', 'docs', 'rollbacks');
const draftFiles = existsSync(DRAFT_DIR)
  ? readdirSync(DRAFT_DIR).filter((f) => /^AFM_narrative_draft_D\d+\.json$/.test(f)).sort()
  : [];

// A batch that silently found no drafts would report a clean green having compared nothing
// (P-G1). The six that exist are D6–D11; fewer means one was deleted and the pin weakened.
check('PIN1 the committed AFM draft corpus is present', draftFiles.length === 6,
  `found ${draftFiles.length} draft(s): ${draftFiles.join(', ') || 'none'}`);

for (const file of draftFiles) {
  const draft = JSON.parse(readFileSync(join(DRAFT_DIR, file), 'utf8')) as {
    plan_id: string; row: Record<string, unknown>;
  };
  const plan = NARRATIVE_PLAN.find((p: NarrativePlan) => p.id === draft.plan_id);
  if (!plan) { check(`PIN1 ${draft.plan_id} has a plan`, false, 'no plan with that id'); continue; }

  const { drill } = draftToGateInput(draft.row);
  const modelAnswer = `${plan.heading}\n\n${drill.reveal.trim()}`;
  const rebuilt = buildNarrativeRow(
    plan, draft.row.topic as string, drill, modelAnswer, serializeNarrativeSchema(drill),
    { hint: draft.row.hint as string, full_reveal: draft.row.full_reveal as string },
  );
  check(`PIN1 ${draft.plan_id} rebuilt row === committed draft bytes`,
    JSON.stringify(rebuilt) === JSON.stringify(draft.row));
  check(`PIN1 ${draft.plan_id} paper_code is AFM`, rebuilt.paper_code === 'AFM', String(rebuilt.paper_code));
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN2 — THE AUTHORING PROMPT, all eleven AFM plans, with and without the retry feedback arm.
// `__fb` is the second authoring attempt's prompt; a paper block appended in the wrong place
// would move one and not the other, so both are pinned.
// ─────────────────────────────────────────────────────────────────────────────
const PROMPT_PINS: Record<string, { sha: string; len: number }> = {
  'D1': { sha: 'fb160cbda0aa7a51', len: 6381 },
  'D1__fb': { sha: '5e95bd2591da5a0b', len: 6498 },
  'D2': { sha: '83f6c7fad1c71f1b', len: 6372 },
  'D2__fb': { sha: '2acec6472b5d32a2', len: 6489 },
  'D3': { sha: 'cfa8e61febecb23d', len: 6174 },
  'D3__fb': { sha: 'a0822ed7bf825e97', len: 6291 },
  'D4': { sha: '454cda5afcfe8e4f', len: 6015 },
  'D4__fb': { sha: '41d9d00635172472', len: 6132 },
  'D5': { sha: '75feb6b48e89bb2f', len: 6153 },
  'D5__fb': { sha: 'ac85a89bbc679c48', len: 6270 },
  'D6': { sha: '23fd40fbd7eed85d', len: 6407 },
  'D6__fb': { sha: 'cd6ade02ec2c7be9', len: 6524 },
  'D7': { sha: 'cf139fbe99f6dcd9', len: 7063 },
  'D7__fb': { sha: '4605ab6ec6a0f511', len: 7180 },
  'D8': { sha: '4bd9eaf37f411064', len: 6791 },
  'D8__fb': { sha: 'f3e6e5c087ec037c', len: 6908 },
  'D9': { sha: 'a665e0c2d50d1725', len: 6541 },
  'D9__fb': { sha: '0766851d2dcaf6e4', len: 6658 },
  'D10': { sha: '5b2b89febca4d690', len: 7079 },
  'D10__fb': { sha: '860d99f8a7e9a386', len: 7196 },
  'D11': { sha: '9ba0dae76dc124ce', len: 6429 },
  'D11__fb': { sha: '00c5444bddddc85f', len: 6546 },
};

const afmPlans = NARRATIVE_PLAN.filter((p: NarrativePlan) => p.paper === 'AFM');
check('PIN2 the eleven AFM plans are all still here', afmPlans.length === 11, `found ${afmPlans.length}`);

for (const plan of afmPlans) {
  const bare = buildNarrativeUserPrompt(plan);
  const withFb = buildNarrativeUserPrompt(plan, 'N2: sample feedback line');
  const pinBare = PROMPT_PINS[plan.id];
  const pinFb = PROMPT_PINS[`${plan.id}__fb`];
  check(`PIN2 ${plan.id} authoring prompt bytes unchanged`,
    !!pinBare && sha(bare) === pinBare.sha && bare.length === pinBare.len,
    `sha ${sha(bare)} len ${bare.length}`);
  check(`PIN2 ${plan.id} authoring prompt (retry arm) bytes unchanged`,
    !!pinFb && sha(withFb) === pinFb.sha && withFb.length === pinFb.len,
    `sha ${sha(withFb)} len ${withFb.length}`);
  // The AFM paper block is the empty string; anything else would show up above, but pin the
  // reason too so a future author cannot "helpfully" give AFM a block and only break a hash.
  check(`PIN2 ${plan.id} nothing is injected at the paper-block seam`,
    bare.includes('- total_marks = sum of criteria marks (aim 8–12).\n\nGOLDEN BAD'));
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN3 — THE TWO AFM PERSONAS AND THE AFM SKILL-DEMAND TABLE.
// ─────────────────────────────────────────────────────────────────────────────
check('PIN3 AFM authoring persona bytes unchanged',
  sha(NARRATIVE_AUTHOR_PERSONA.AFM) === 'b4e303063f633113' && NARRATIVE_AUTHOR_PERSONA.AFM.length === 1214,
  `sha ${sha(NARRATIVE_AUTHOR_PERSONA.AFM)} len ${NARRATIVE_AUTHOR_PERSONA.AFM.length}`);

const afmDemandJson = JSON.stringify(SKILL_DEMAND_BY_PAPER.AFM);
check('PIN3 AFM SKILL_DEMAND table unchanged',
  sha(afmDemandJson) === '57524263c6bb4d51' && afmDemandJson.length === 1999,
  `sha ${sha(afmDemandJson)} len ${afmDemandJson.length}`);

check('PIN3 AFM skill-demand keys are exactly AFM\'s four framework skills',
  JSON.stringify(Object.keys(SKILL_DEMAND_BY_PAPER.AFM).sort()) === JSON.stringify(Object.keys(AFM_SKILLS).sort()));

// ─────────────────────────────────────────────────────────────────────────────
// PIN4 — THE TEACHING-REVEAL PROMPT, all eleven AFM plans. The intermediate spec object changed
// shape; these are the bytes that reach the model, and they must not have.
// ─────────────────────────────────────────────────────────────────────────────
const REVEAL_PINS: Record<string, { sha: string; len: number }> = {
  'D1': { sha: '72c9c86ccb2f54f9', len: 2425 },
  'D2': { sha: 'd48eb97a15b7b140', len: 2465 },
  'D3': { sha: '70192b4443a0d8ed', len: 2465 },
  'D4': { sha: '55fba7bb84af53d1', len: 2434 },
  'D5': { sha: 'a41d402db908faad', len: 2442 },
  'D6': { sha: '0d15531d00d00a0f', len: 2454 },
  'D7': { sha: '258a1c48bf4581c0', len: 2449 },
  'D8': { sha: '72c9c86ccb2f54f9', len: 2425 },
  'D9': { sha: 'a41d402db908faad', len: 2442 },
  'D10': { sha: 'a6ba674c3acad213', len: 2464 },
  'D11': { sha: '523c34424df1ef0b', len: 2462 },
};

// The spec the batch builds, reproduced here field-for-field. If runNarrativeBatch's construction
// changes, this stops matching and PIN4 goes green on a spec production no longer builds — so the
// five fields are also asserted against the framework directly, below.
for (const plan of afmPlans) {
  const lo = frameworkFor(plan.paper).syllabus[plan.lo_code] as { topic: string; mode?: string };
  const spec = {
    lo_code: plan.lo_code,
    topic: lo.topic,
    command_verb: 'discuss',
    intellectual_level: plan.level,
    mode: lo.mode ?? 'discursive',
  };
  const built = buildRevealPromptAfm(spec, 'SAMPLE QUESTION', 'SAMPLE MODEL ANSWER');
  const pin = REVEAL_PINS[plan.id];
  check(`PIN4 ${plan.id} reveal prompt bytes unchanged`,
    !!pin && sha(built) === pin.sha && built.length === pin.len,
    `sha ${sha(built)} len ${built.length}`);
}

// The two plans whose LO mode is NOT discursive — the ones a hardcoded 'discursive' would have
// silently moved. Named explicitly so a future edit to loModeFor fails here with the reason.
check('PIN4 D7 sits on an LO whose AFM mode is `mixed` (preserved, not corrected)',
  (frameworkFor('AFM').syllabus['E2c'] as { mode?: string }).mode === 'mixed');
check('PIN4 D10 sits on an LO whose AFM mode is `quantitative` (preserved, not corrected)',
  (frameworkFor('AFM').syllabus['E3a'] as { mode?: string }).mode === 'quantitative');
check('PIN4 AFM reveal builder is the one the dispatcher returns for AFM',
  REVEAL_PROMPT_BUILDER.AFM === buildRevealPromptAfm);

// ─────────────────────────────────────────────────────────────────────────────
// PIN5 — THE DRAFT FILENAME. The path gained a paper argument; for AFM it must render the same
// name, because `--narrative-insert-from` is pointed at these by hand and six are in git.
// ─────────────────────────────────────────────────────────────────────────────
for (const plan of afmPlans) {
  const p = narrativeDraftPath('AFM', plan.id).replace(new RegExp(String.fromCharCode(92, 92), 'g'), '/');
  check(`PIN5 ${plan.id} draft filename unchanged`, p.endsWith(`/docs/rollbacks/AFM_narrative_draft_${plan.id}.json`), p);
}
check('PIN5 SBL drafts land under their own paper prefix',
  narrativeDraftPath('SBL', 'X1').replace(new RegExp(String.fromCharCode(92, 92), 'g'), '/')
    .endsWith('/docs/rollbacks/SBL_narrative_draft_X1.json'));

// ─────────────────────────────────────────────────────────────────────────────
// THE SBL SIDE — what the parameterisation added, and the ways it must refuse.
// ─────────────────────────────────────────────────────────────────────────────
check('SBL is registered as a generator paper', !!PAPER_FRAMEWORKS.SBL);
check('the calculator half is still AFM-only and says so', NUMERIC_BATCH_PAPER === 'AFM');

check('SBL skill-demand keys are exactly SBL\'s five framework skills',
  JSON.stringify(Object.keys(SKILL_DEMAND_BY_PAPER.SBL).sort()) === JSON.stringify(Object.keys(SBL_SKILLS).sort()),
  Object.keys(SKILL_DEMAND_BY_PAPER.SBL).sort().join(','));
check('SBL has five skills, AFM four', Object.keys(SKILL_DEMAND_BY_PAPER.SBL).length === 5 && Object.keys(SKILL_DEMAND_BY_PAPER.AFM).length === 4);

// ⚠️ THE VOCABULARY MUST NOT CROSS. SBL marks `analysis` and `evaluation` separately; AFM/APM
// carry one combined `analysis_and_evaluation`, and neither SBL skill is that skill halved.
check('SBL demand table never carries analysis_and_evaluation',
  !('analysis_and_evaluation' in SKILL_DEMAND_BY_PAPER.SBL));
check('AFM demand table never carries analysis', !('analysis' in SKILL_DEMAND_BY_PAPER.AFM));
check('AFM demand table never carries evaluation', !('evaluation' in SKILL_DEMAND_BY_PAPER.AFM));

// The three shared NAMES must still be shared names with different text behind them — a copied
// AFM entry would pass every check above and mis-author every SBL drill on that skill.
for (const shared of ['scepticism', 'commercial_acumen', 'communication']) {
  check(`SBL "${shared}" demand is authored for SBL, not copied from AFM`,
    JSON.stringify(SKILL_DEMAND_BY_PAPER.SBL[shared]) !== JSON.stringify(SKILL_DEMAND_BY_PAPER.AFM[shared]));
}
// SBL's commercial acumen is explicitly NOT price-shaped (its descriptor is about wider external
// factors and the management of conflict), which is the substantive half of the split above.
check('SBL commercial_acumen does not require a figure the way AFM\'s does',
  !SKILL_DEMAND_BY_PAPER.SBL.commercial_acumen.scenario.includes('a price on it'));

// A skill with no demand behind it must THROW, not fall back — the free-text skill-tag trap.
throws('skillDemandFor throws on an unregistered SBL skill',
  () => skillDemandFor('SBL', 'analysis_and_evaluation'), 'No SKILL_DEMAND registered');
throws('skillDemandFor throws on an unregistered AFM skill',
  () => skillDemandFor('AFM', 'evaluation'), 'No SKILL_DEMAND registered');
throws('skillDemandFor throws on a typo', () => skillDemandFor('SBL', 'sceptism'), 'known SBL skills');
throws('frameworkFor throws on an unregistered paper',
  () => frameworkFor('APM' as never), 'No framework registered');

// The SBL paper block must actually reach the prompt, and must carry the two rulings that are
// the whole reason this paper needed its own block.
const sblPlan: NarrativePlan = {
  paper: 'SBL', id: 'PIN-SBL', lo_code: 'A2b', covers: ['A2b'], level: 2,
  region: 'Chile', sector: 'a regional grocery chain',
  heading: '**pin**', brief: 'pin', skill: 'evaluation',
};
const sblPrompt = buildNarrativeUserPrompt(sblPlan);
check('SBL prompt says SBL, not AFM', sblPrompt.startsWith('Write one original ACCA SBL DISCURSIVE drill'));
check('SBL prompt carries the four-part development test', sblPrompt.includes('SBL DEVELOPMENT TEST'));
check('SBL prompt states all four development limbs',
  sblPrompt.includes('SIGNIFICANT') && sblPrompt.includes('THIS organisation')
  && sblPrompt.includes('CONSEQUENCES') && sblPrompt.includes('EXAMPLE'));
check('SBL prompt states the one-mark undeveloped tier',
  sblPrompt.includes('1 mark if identified but left undeveloped'));
check('SBL prompt bans a named model in the stem',
  sblPrompt.includes('NEVER NAME A THEORETICAL MODEL'));
check('SBL prompt bans the phrase "the pre-seen"', sblPrompt.includes('NEVER use the phrase "the pre-seen"'));
check('SBL prompt quotes the SBL LO descriptor, not an AFM one',
  sblPrompt.includes(SBL_SYLLABUS.A2b.descriptor));
check('SBL prompt quotes the SBL skill descriptors',
  sblPrompt.includes(SBL_SKILLS.evaluation.sub_descriptors[0]));
check('AFM prompt carries no SBL block', !buildNarrativeUserPrompt(afmPlans[0]).includes('SBL DEVELOPMENT TEST'));

check('SBL teaching reveal is not AFM\'s', REVEAL_PROMPT_BUILDER.SBL === buildRevealPromptSbl);
const sblReveal = buildRevealPromptSbl({ lo_code: 'A2b', topic: 't', command_verb: 'advise', intellectual_level: 2, mode: 'discursive' }, 'q', 'a');
check('SBL reveal teaches the two-mark rule', sblReveal.includes('THE TWO-MARK RULE'));
check('SBL reveal never mentions FCFF or WACC', !/FCFF|WACC/.test(sblReveal));
check('AFM reveal still teaches valuation plumbing',
  buildRevealPromptAfm({ lo_code: 'B4c', topic: 't', command_verb: 'discuss', intellectual_level: 3, mode: 'quantitative' }, 'q', 'a').includes('Valuation plumbing'));
check('SBL authoring persona is not AFM\'s', NARRATIVE_AUTHOR_PERSONA.SBL !== NARRATIVE_AUTHOR_PERSONA.AFM);
check('SBL persona names the paper', NARRATIVE_AUTHOR_PERSONA.SBL.includes('Strategic Business Leader (SBL)'));
check('SBL persona carries the published development test',
  NARRATIVE_AUTHOR_PERSONA.SBL.includes('developed by (i) evaluating how significant it is'));

// ─────────────────────────────────────────────────────────────────────────────
// THE PLAN LIST — every plan declares a registered paper, and the selectors refuse loudly.
// ─────────────────────────────────────────────────────────────────────────────
for (const plan of NARRATIVE_PLAN) {
  check(`plan ${plan.id} declares a registered paper`, !!PAPER_FRAMEWORKS[plan.paper], String(plan.paper));
  check(`plan ${plan.id}'s lo_code exists in its own paper's syllabus map`,
    !!frameworkFor(plan.paper).syllabus[plan.lo_code], `${plan.paper}/${plan.lo_code}`);
  check(`plan ${plan.id}'s skill has a demand entry for its own paper`,
    !!SKILL_DEMAND_BY_PAPER[plan.paper]?.[plan.skill], `${plan.paper}/${plan.skill}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// PIN6 — THE GRADER'S MARKER PROMPT. It is the model layer behind N1 and N4, so it decides
// whether a drill gates at all; it was a hardcoded AFM string until 2026-08-19. The AFM bytes
// are a GENUINE PRE-CHANGE CAPTURE, read from `git show HEAD:lib/acca/narrative-grader.ts`
// before the split. Captured by intercepting the constructed client, so the WIRING is pinned
// too and not just the constant — an unwired per-paper string would pass a constant check.
// ─────────────────────────────────────────────────────────────────────────────
function capturedSystemFor(paper?: string): string {
  let seen = '';
  const fake = {
    messages: {
      create: async (req: { system?: unknown }) => {
        const s = req.system;
        seen = typeof s === 'string' ? s
          : Array.isArray(s) ? (s as { text?: string }[]).map((b) => b.text ?? '').join('')
          : String(s ?? '');
        return { content: [{ type: 'tool_use', input: { met: 'no', evidence_span: '', failure_flags: [] } }] };
      },
    },
  };
  const grader = makeAnthropicCriterionGrader(fake as never, paper ? { paper } : {});
  // `seen` is set SYNCHRONOUSLY: an async function body runs to its first `await`, and the
  // grader's first await IS the messages.create call, so the system block is captured before
  // the returned promise is handed back. No draining needed, and no top-level await (this file
  // is CJS — __dirname above — where top-level await is a parse error, not a runtime one).
  void grader({ id: 'c1', requirement_part: 'p', lo: 'X', required_point: 'p', marks: 2, anchor_facts: [], disqualifiers: [], development_required: true }, 'answer', 'scenario');
  return seen;
}

const afmMarker = capturedSystemFor('AFM');
check('PIN6 AFM marker prompt bytes unchanged',
  sha(afmMarker) === '0726830e6782147e' && afmMarker.length === 1476,
  `sha ${sha(afmMarker)} len ${afmMarker.length}`);
check('PIN6 omitting paper still yields the AFM marker (every pre-change caller)',
  capturedSystemFor() === afmMarker);
check('PIN6 an unregistered paper falls back to the AFM marker rather than an empty system block',
  capturedSystemFor('APM') === afmMarker);

const sblMarker = capturedSystemFor('SBL');
check('PIN6 SBL gets its own marker', sblMarker !== afmMarker && sblMarker.length > 0);
check('PIN6 SBL marker names the paper', sblMarker.includes('Strategic Business Leader (SBL)'));
// ⚠️ The substantive half. AFM's rule (1) is claim -> because -> implication, a THREE-part test.
// SBL's rubric is written to the examiners' FOUR-limb one, and the limb the two disagree on is
// the example from the case — which carries marks on every SBL criterion.
check('PIN6 SBL marker judges on the four-limb development test',
  /SIGNIFICANCE/.test(sblMarker) && /THIS organisation/.test(sblMarker)
  && /CONSEQUENCES/.test(sblMarker) && /EXAMPLE from the case material/.test(sblMarker));
check('PIN6 SBL marker does NOT carry AFM\'s three-part development test',
  !sblMarker.includes('claim → because → implication'));
check('PIN6 AFM marker still carries its three-part test',
  afmMarker.includes('claim → because → implication'));
check('PIN6 SBL marker keeps the insight-not-arithmetic rule',
  sblMarker.includes('NEVER require a named statistic'));
check('PIN6 SBL marker keeps the evidence_span discipline',
  sblMarker.includes('SHORT VERBATIM quote'));

// ─────────────────────────────────────────────────────────────────────────────
// SBL BATCH A — the approved five. Spec of record: docs/SBL_BATCH_A_PLAN.md.
// ─────────────────────────────────────────────────────────────────────────────
const sblPlans = NARRATIVE_PLAN.filter((p: NarrativePlan) => p.paper === 'SBL');
// `flags` is the N4 CONTRACT (deterministic only); `evidenced` is the catalogue mode the BAD
// also commits and the rubric marks against, which N4 cannot verify. Grant-ruled 2026-08-19 (b).
const APPROVED: Record<string, { lo: string; skill: string; flags: string[]; evidenced?: string }> = {
  'SBL-A1': { lo: 'A2b', skill: 'analysis',   flags: ['F5'], evidenced: 'F7' },
  'SBL-A2': { lo: 'A2d', skill: 'analysis', flags: ['F5'] },
  'SBL-A3': { lo: 'A1a', skill: 'analysis',   flags: ['F4'], evidenced: 'F2' },
  'SBL-A4': { lo: 'A3d', skill: 'scepticism', flags: ['F4'], evidenced: 'F10' },
  'SBL-A5': { lo: 'A3a', skill: 'evaluation', flags: ['F1', 'F4'] },
};
const DETERMINISTIC = ['F1', 'F4', 'F5'];
check('SBL batch A is exactly the five approved plans',
  JSON.stringify(sblPlans.map((p: NarrativePlan) => p.id).sort()) === JSON.stringify(Object.keys(APPROVED).sort()),
  sblPlans.map((p: NarrativePlan) => p.id).join(','));

for (const [id, want] of Object.entries(APPROVED)) {
  const plan = sblPlans.find((p: NarrativePlan) => p.id === id);
  if (!plan) { check(`${id} exists`, false); continue; }
  check(`${id} is ${want.lo} · ${want.skill} as approved`, plan.lo_code === want.lo && plan.skill === want.skill,
    `${plan.lo_code} · ${plan.skill}`);
  check(`${id} declares its designed BAD modes ${want.flags.join('/')}`,
    JSON.stringify(plan.designed_bad?.flags) === JSON.stringify(want.flags),
    JSON.stringify(plan.designed_bad?.flags));
  check(`${id} carries its evidenced catalogue mode ${want.evidenced ?? '(none — its evidenced mode is deterministic)'}`,
    plan.designed_bad?.evidenced === want.evidenced, String(plan.designed_bad?.evidenced));
  // THE RULE THE WHOLE BATCH TURNED ON: N4 requires EVERY designed flag to be raised and can
  // raise only F1/F4/F5 unaided. A non-deterministic code here fails a drill that is fine.
  check(`${id} lists ONLY deterministic modes in the N4 contract`,
    (plan.designed_bad?.flags ?? []).every((f) => DETERMINISTIC.includes(f)),
    JSON.stringify(plan.designed_bad?.flags));
  // ⚠️ THE TWO EXCLUDED OUTCOMES. A3b and A1b return zero hits across all seven examiner reports,
  // so a golden BAD for them would have to be invented. Pinned so a later edit cannot quietly
  // re-add one without reading why it was left out.
  check(`${id} is not built on a zero-evidence outcome`, plan.lo_code !== 'A3b' && plan.lo_code !== 'A1b');
}

check('exactly one SBL drill is a scepticism drill — the only one N6 gates',
  sblPlans.filter((p: NarrativePlan) => p.skill === 'scepticism').length === 1);
check('SBL-A4 is that drill', sblPlans.find((p: NarrativePlan) => p.skill === 'scepticism')?.id === 'SBL-A4');

for (const plan of sblPlans) {
  const prompt = buildNarrativeUserPrompt(plan);
  // The golden BAD block must carry THIS plan's modes, not AFM's fixed backbone. A regression to
  // the shared block would author five drills against one failure and call them different.
  check(`${plan.id} prompt carries its own designed_bad_flags`,
    prompt.includes(`designed_bad_flags MUST be EXACTLY ${JSON.stringify(plan.designed_bad!.flags)}`));
  check(`${plan.id} prompt does NOT carry AFM's fixed backbone`,
    !prompt.includes('designed_bad_flags MUST be EXACTLY ["F1","F5","F4"] — no more, no fewer.')
    || JSON.stringify(plan.designed_bad!.flags) === JSON.stringify(['F1', 'F5', 'F4']));
  check(`${plan.id} prompt states what the BAD does`, prompt.includes('WHAT THE BAD DOES:'));
  check(`${plan.id} prompt carries mechanics for every declared flag`,
    plan.designed_bad!.flags.every((f) => new RegExp(`\\n- ${f}: `).test(prompt)));
  check(`${plan.id} brief forbids naming a model in the stem`, /must not name/i.test(plan.brief));
}
// SBL-A4 carries ONE golden BAD, and the aggressive pole is explicitly kept OUT of it.
const a4 = sblPlans.find((p: NarrativePlan) => p.id === 'SBL-A4')!;
check('SBL-A4 has ONE designed BAD, not two poles',
  !/aggressive|accusator/i.test(a4.designed_bad!.brief.split('DO NOT make')[0]));
check('SBL-A4 explicitly forbids the aggressive pole in the BAD',
  a4.designed_bad!.brief.includes('DO NOT make the bad answer aggressive'));
check('SBL-A4 scenario brief demands a quoted assertion long enough for N6b',
  /twelve words|double quotes/i.test(a4.brief));
check('SBL-A4 scenario brief demands a fact key inside the quote for N6c',
  a4.brief.includes('VERBATIM INSIDE the quoted'));

// An unregistered BAD flag must throw, never reach the model as a bare code.
throws('a designed_bad flag with no mechanics is refused',
  () => buildNarrativeUserPrompt({ ...a4, designed_bad: { flags: ['F99'], brief: 'x' } }),
  'no mechanics registered');

check('--narrative-paper AFM selects only AFM plans',
  assertNarrativePlanIds(NARRATIVE_PLAN, undefined, 'AFM').every((p: NarrativePlan) => p.paper === 'AFM'));
check('--narrative-paper AFM selects all eleven',
  assertNarrativePlanIds(NARRATIVE_PLAN, undefined, 'AFM').length === 11);
throws('--narrative-paper refuses an unknown paper rather than returning []',
  () => assertNarrativePlanIds(NARRATIVE_PLAN, undefined, 'APM'), 'matched no plan');
throws('--narrative-only refuses an unknown id', () => assertNarrativePlanIds(NARRATIVE_PLAN, 'D99'), 'matched no plan');
throws('a plan declaring an unregistered paper is refused',
  () => assertNarrativePlanIds([{ ...sblPlan, paper: 'APM' as never }]), 'PAPER_FRAMEWORKS');
throws('a duplicate plan id is still refused',
  () => assertNarrativePlanIds([sblPlan, { ...sblPlan }]), 'duplicate plan id');

// ─────────────────────────────────────────────────────────────────────────────
console.log(`\ntest-narrative-paper-pins: ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  for (const f of failures) console.error(`  ✗ ${f}`);
  process.exitCode = 1;
} else {
  console.log('  ✓ AFM authoring inputs and built rows are byte-identical across the parameterisation');
}
