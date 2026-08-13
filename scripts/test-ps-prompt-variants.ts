// scripts/test-ps-prompt-variants.ts — PURE. No DB, no model, no network.
//
// Pins `buildPsSystemPrompt`, the PS system prompt extracted into a variant-aware builder.
//
// THE LOAD-BEARING CHECK IS THE FIRST ONE: `shipped` must be BYTE-IDENTICAL to the prompt
// production has always sent. The builder exists so a calibration arm can run the real core
// with a candidate prompt instead of a transcription of it — and a refactor that quietly
// reworded the live prompt while enabling that would be the worst possible outcome, because
// every band recorded before it would silently stop being comparable. SHIPPED_VERBATIM below
// is a literal copy taken from the pre-refactor source; the builder is asserted equal to it.
//
// The variant checks then pin the two properties the 2026-08-13 calibration is testing:
//   · the LADDER stops defining bands in descriptor terms (5 of 9 mentions), and
//   · EVERY SEVERITY ANCHOR SURVIVES VERBATIM — band movement is what killed the previous
//     attempt (the judgement/feedback split moved `competent` from 7/92 to 17/92), so the
//     rewrite must change what a band is measured against and nothing about how severe it is.
//
// Run: npm run test:ps-prompt-variants

import { buildPsSystemPrompt } from '../lib/acca/case-marking';

let pass = 0;
const failures: string[] = [];
function check(name: string, cond: boolean) {
  if (cond) { pass++; console.log(`PASS :: ${name}`); }
  else { failures.push(name); console.log(`FAIL :: ${name}`); }
}

// ── The pre-refactor prompt, VERBATIM (git 86f9c82, lib/acca/case-marking.ts:394-455) ──
function SHIPPED_VERBATIM(paper: string): string {
  return `You are an experienced ACCA ${paper} marker judging the professional skills demonstrated in a ` +
    'whole exam question. You judge HOW the candidate wrote — their reasoning, judgement and ' +
    'communication across the whole answer — against the official ACCA professional-skills descriptor ' +
    'for each examined skill. Each descriptor IS the standard; judge against it, not against a model ' +
    'answer. ' +
    'For each examined skill, assign exactly one band describing how well the whole answer meets ' +
    'that skill\'s descriptor:\n' +
    '- "exemplary": meets the descriptor in full; a professional marker would find nothing ' +
    'material to fault.\n' +
    '- "strong": meets the descriptor well, with only minor and immaterial gaps.\n' +
    '- "competent": broadly meets the descriptor but with a material weakness in depth, register ' +
    'or format.\n' +
    '- "weak": a real attempt that falls short of the descriptor — superficial, poorly ' +
    'communicated, or missing the professional standard. There IS writing to judge here; it is ' +
    'not good enough.\n' +
    '- "nothing": earns no credit — there is nothing here to assess this skill on. The answer is ' +
    'absent, or so slight or off-topic that it gives no evidence of the skill either way.\n' +
    'The line between "weak" and "nothing" is whether there is writing to judge at all, not how ' +
    'bad it is. A short, wrong or badly argued answer is "weak". A blank, a stray character, or a ' +
    'few words with no bearing on the requirement is "nothing". ' +
    'Judge each skill on its ABSOLUTE quality against the descriptor. Do not grade on a curve, and ' +
    'do not assume the answer is good. ' +
    'THE `feedback` STRING IS SHOWN TO THE CANDIDATE. It is not a note to a moderator. Write it to ' +
    'these rules:\n' +
    '1. SECOND PERSON, addressed to them — "You structure the answer as a report…", never "The ' +
    'candidate…".\n' +
    '2. NEVER POINT AT ANYTHING THEY CANNOT SEE. This is a CLASS ban, not a list of banned words: ' +
    'no descriptor, standard, document, reference, model, scheme or "provided" text may be ' +
    'mentioned, HOWEVER NAMED. Say what their writing DID and, where the band is below exemplary, ' +
    'what would have raised it.\n' +
    '3. WRITE WHATEVER THE BAND NEEDS — no length target, floor or ceiling. Never pad, and never ' +
    'truncate a reason to hit a length.\n' +
    '4. Point to their OWN writing when you name evidence — quote a short phrase or name the ' +
    'section. No band without a named reason. WHERE THE BAND IS "nothing" there is nothing to ' +
    'quote, and this rule is met by stating plainly what is absent — STILL IN SECOND PERSON, as ' +
    'rule 1 requires: "you did not answer this part", "what you wrote here does not address the ' +
    'requirement". Rule 1 is NOT suspended for this band. Never write "no answer was given", ' +
    '"the submission contains" or "the text provided" — those address nobody, and a candidate ' +
    'reading their own result should not be described in the third person at the one moment the ' +
    'result is worst. Do not invent a quotation, do not stretch to find one, and do not choose a ' +
    'higher band merely because it would be easier to write feedback for.\n' +
    '5. No praise for its own sake, no encouragement, no grade prediction. ' +
    'Return ONLY a JSON array, no prose, no code fences, in exactly this shape: ' +
    '[{ "index": 1, "band": "exemplary|strong|competent|weak|nothing", "feedback": "..." }] — one ' +
    'object per examined skill, where index is the NUMBER of the skill in the list above. ' +
    'Use the numbers, never the skill names.';
}

console.log('\n=== PS PROMPT VARIANTS ===\n');

// ── 1. THE REFACTOR IS INERT ────────────────────────────────────────────────
for (const paper of ['AFM', 'APM'] as const) {
  const built = buildPsSystemPrompt(paper, 'shipped');
  const want = SHIPPED_VERBATIM(paper);
  check(`${paper}: shipped variant is BYTE-IDENTICAL to the pre-refactor prompt`, built === want);
  if (built !== want) {
    let i = 0; while (i < built.length && i < want.length && built[i] === want[i]) i++;
    console.log(`       first divergence at ${i}:\n       built: ${JSON.stringify(built.slice(i - 40, i + 60))}\n       want:  ${JSON.stringify(want.slice(i - 40, i + 60))}`);
  }
}
// PRODUCTION RUNS `ladder` since 2026-08-13 (calibrated: band-neutral, leak 12.9% -> 6.4%).
// `shipped` stays as the historical control for calibration, so both facts are pinned: the old
// prompt is preserved byte-exact, and the default is the new one.
check('ladder is the DEFAULT (production omits the argument)', buildPsSystemPrompt('AFM') === buildPsSystemPrompt('AFM', 'ladder'));
check('the default is NOT the old shipped prompt', buildPsSystemPrompt('AFM') !== buildPsSystemPrompt('AFM', 'shipped'));
check('the paper is named in the prompt', buildPsSystemPrompt('AFM').includes('ACCA AFM marker') && buildPsSystemPrompt('APM').includes('ACCA APM marker'));

// ── 2. THE LADDER REWRITE — five mentions out, and only those five ─────────
const shipped = buildPsSystemPrompt('AFM', 'shipped');
const ladder = buildPsSystemPrompt('AFM', 'ladder');
const pT2 = buildPsSystemPrompt('AFM', 'ladder_p_t2');
const count = (s: string, w: string) => (s.match(new RegExp(w, 'gi')) || []).length;

check('shipped carries 9 "descriptor" mentions (the measured baseline)', count(shipped, 'descriptor') === 9);
check('ladder drops exactly the 5 band-definition mentions (9 -> 4)', count(ladder, 'descriptor') === 4);
check('ladder_p_t2 drops rule 2\'s as well (9 -> 3)', count(pT2, 'descriptor') === 3);

// The band definitions must no longer name it...
for (const b of ['exemplary', 'strong', 'competent', 'weak']) {
  const line = ladder.split('\n').find((l) => l.startsWith(`- "${b}"`)) ?? '';
  check(`ladder: "${b}" definition names no descriptor`, line.length > 0 && !/descriptor/i.test(line));
}
check('ladder: the lead-in asks how well the answer DEMONSTRATES the skill', ladder.includes('how well the whole answer DEMONSTRATES that skill'));

// ...but the THREE instructions to judge against it MUST survive. Degrading the input moved
// bands twice on the technical pass; this rewrite fences the output only.
check('ladder KEEPS "against the official ACCA professional-skills descriptor"', ladder.includes('against the official ACCA professional-skills descriptor'));
check('ladder KEEPS "Each descriptor IS the standard"', ladder.includes('Each descriptor IS the standard'));
check('ladder KEEPS "ABSOLUTE quality against the descriptor"', ladder.includes('Judge each skill on its ABSOLUTE quality against the descriptor'));
check('ladder_p_t2 keeps all three too', ['against the official ACCA professional-skills descriptor', 'Each descriptor IS the standard', 'Judge each skill on its ABSOLUTE quality against the descriptor'].every((s) => pT2.includes(s)));

// ── 3. EVERY SEVERITY ANCHOR SURVIVES VERBATIM ─────────────────────────────
// This is the check that guards against a repeat of the split's failure. The rewrite may
// change what a band is measured AGAINST; it may not change how severe the band is.
const ANCHORS = [
  'a professional marker would find nothing material to fault',
  'only minor and immaterial gaps',
  'a material weakness in depth, register or format',
  'superficial, poorly',
  'There IS writing to judge here; it is not good enough',
  'earns no credit — there is nothing here to assess this skill on',
  'The line between "weak" and "nothing" is whether there is writing to judge at all, not how bad it is',
  'Do not grade on a curve, and do not assume the answer is good',
];
for (const a of ANCHORS) {
  const norm = (s: string) => s.replace(/\s+/g, ' ');
  check(`severity anchor preserved in BOTH variants: "${a.slice(0, 46)}…"`,
    norm(shipped).includes(norm(a)) && norm(ladder).includes(norm(a)) && norm(pT2).includes(norm(a)));
}
check('`nothing` band text is IDENTICAL across all three variants', (() => {
  const line = (s: string) => s.split('\n').find((l) => l.startsWith('- "nothing"'));
  return line(shipped) === line(ladder) && line(ladder) === line(pT2);
})());

// ── 4. THE P-T2 EDITS ──────────────────────────────────────────────────────
check('ladder does NOT carry the rule-2 restatement (it is the isolated arm)', !ladder.includes('THE ONLY THING `feedback` POINTS AT IS THEIR OWN WRITING'));
check('ladder KEEPS the shipped class ban at rule 2', ladder.includes('NEVER POINT AT ANYTHING THEY CANNOT SEE'));
check('ladder does NOT carry the exemplary carve-out', !ladder.includes('WHERE THE BAND IS "exemplary"'));
check('ladder_p_t2 carries the rule-2 restatement', pT2.includes('THE ONLY THING `feedback` POINTS AT IS THEIR OWN WRITING'));
check('ladder_p_t2 REPLACES the ban rather than stacking both (P-T2)', !pT2.includes('NEVER POINT AT ANYTHING THEY CANNOT SEE'));
check('ladder_p_t2 carries the exemplary carve-out', pT2.includes('WHERE THE BAND IS "exemplary" there is no shortfall to name'));
check('ladder_p_t2 keeps the below-exemplary instruction inside rule 2', pT2.includes('Where the band is below exemplary, say what would have raised it'));

// ── 5. INVARIANTS EVERY VARIANT MUST HOLD ──────────────────────────────────
for (const [name, p] of [['shipped', shipped], ['ladder', ladder], ['ladder_p_t2', pT2]] as const) {
  check(`${name}: all five bands are offered`, ['exemplary', 'strong', 'competent', 'weak', 'nothing'].every((b) => p.includes(`- "${b}"`)));
  check(`${name}: the nothing carve-out on rule 4 survives`, p.includes('WHERE THE BAND IS "nothing" there is nothing to'));
  check(`${name}: the ordinal contract survives`, p.includes('Use the numbers, never the skill names'));
  check(`${name}: the feedback-is-shown-to-the-candidate line survives`, p.includes('THE `feedback` STRING IS SHOWN TO THE CANDIDATE'));
  check(`${name}: rule 1 second person survives`, p.includes('1. SECOND PERSON, addressed to them'));
  check(`${name}: never mentions marks or the pool`, !/marks_guide|professional_skills_marks|out of \d+ marks/i.test(p));
  check(`${name}: rules 1-5 all present exactly once`, [1, 2, 3, 4, 5].every((i) => (p.match(new RegExp(`\\n${i}\\. `, 'g')) || []).length === 1));
}

// ── 6. MUST-FAIL: the shapes that would defeat the change (P-G3) ───────────
// An assertion suite that only ever sees good input proves nothing about what it would catch.
const WRONG_LADDER = shipped.replace('meets the descriptor in full', 'demonstrates the skill in full');
check('MUST-FAIL: rewriting ONE band definition does not satisfy the 9->4 count', count(WRONG_LADDER, 'descriptor') !== 4);
const WRONG_SOFTENED = ladder.replace('a material weakness in depth, register or format', 'a slight weakness');
check('MUST-FAIL: softening a severity anchor is caught by the anchor check', !WRONG_SOFTENED.includes('a material weakness in depth, register or format'));
const WRONG_STRIPPED = ladder.replace('Judge each skill on its ABSOLUTE quality against the descriptor', 'Judge each skill on its ABSOLUTE quality');
check('MUST-FAIL: degrading the INPUT instruction is caught', !WRONG_STRIPPED.includes('Judge each skill on its ABSOLUTE quality against the descriptor'));

console.log(`\n${failures.length === 0 ? `ALL PS PROMPT VARIANT FIXTURES PASS (${pass})` : `FAILURES (${failures.length}):\n  ${failures.join('\n  ')}`}\n`);
if (failures.length) process.exitCode = 1;
