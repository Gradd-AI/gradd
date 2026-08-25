// scripts/test-case-divergences.ts — DIVERGENCES #3 and #4: the case teach engine's equivalence
// check and its confirm-leg convention endorsement.
// Pure: no DB, no model, no network. Run: npm run test:case-divergences
//
// ⚠️ WHAT THIS IS FOR. Both divergences are places where `lib/acca/teach-engine.ts` (the CASE
// surface) issues an instruction the DRILL route stopped issuing, and in both the shipped form
// has the shape today's doctrine names as the failure mode:
//
//   #3 asks whether the student's NUMERICAL RESULT is MATHEMATICALLY equivalent — on a surface
//      whose requirements are overwhelmingly discursive.
//      📐 MEASURED 2026-08-25: the predicted false-positive does NOT occur. 80 legs on two
//      zero-digit requirements, both arms emitted the correct-sentinel 40/40. #3 is a
//      CONVERGENCE, measured non-inferior — NOT a fix. These fixtures pin its SHAPE and its
//      byte-compatibility; they assert nothing about a benefit, because none was measured.
//   #4 demands the "equally valid" endorsement UNCONDITIONALLY, so an answer that reached the
//      right conclusion by an unsupported method is told the method is equally valid.
//
// ⚠️ THE CLAIM UNDER TEST IS A BYTE CLAIM, as with divergence #2: `shipped` must reproduce what
// this engine sent before the variants existed, or every number measured against it — before or
// after — describes a string that no longer exists.

import { caseEquivalenceCheck, caseConfirmConvention } from '../lib/acca/teach-engine';

let pass = 0, fail = 0;
function ok(name: string, cond: boolean, detail?: string) {
  if (cond) { pass++; console.log(`  ok   ${name}`); }
  else { fail++; console.log(`  FAIL ${name}${detail ? `\n       ${detail}` : ''}`); }
}

const engine = require('fs').readFileSync(
  require('path').join(__dirname, '..', 'lib', 'acca', 'teach-engine.ts'), 'utf8');

console.log('\ncase divergences #3 (equivalence scope) and #4 (confirm endorsement)\n');

// ── #3.1 THE SHIPPED EQUIVALENCE CHECK, PINNED BYTE-IDENTICAL ────────────────
// Transcribed from teach-engine.ts as it stood at 8e3646d, before the variant existed.
const SHIPPED_EQUIV =
  'EQUIVALENCE CHECK — do this before naming any error: ' +
  'The model answer and student answer may use different but equivalent sign conventions ' +
  '(standard−actual vs actual−standard), A/F labelling, table layouts, or arithmetic orderings. ' +
  "Check whether the student's numerical result is mathematically equivalent to the model's. " +
  'Only name an error if the answer is genuinely WRONG — not merely presented in a different convention. ' +
  'A correct answer in a different format is NOT an error and must NOT be flagged. ';

ok('#3 shipped is byte-identical to the pre-variant string',
  caseEquivalenceCheck('shipped') === SHIPPED_EQUIV,
  JSON.stringify(caseEquivalenceCheck('shipped')));

// ── #3.2 THE NARRATIVE ARM ACTUALLY WIDENS THE SCOPE ─────────────────────────
const narrative = caseEquivalenceCheck('narrative');
ok('#3 narrative arm differs from shipped', narrative !== SHIPPED_EQUIV);
ok('#3 narrative arm admits a NARRATIVE claim',
  /numerical OR narrative/.test(narrative));
ok('#3 narrative arm asks for SUBSTANTIVE equivalence, not mathematical',
  /substantively equivalent/.test(narrative) && !/mathematically equivalent/.test(narrative));
ok('#3 narrative arm protects differing WORDING, not just format',
  /convention or wording/.test(narrative) && /format or phrasing/.test(narrative));
// The shipped arm is the one that cannot be satisfied by a discursive answer — pin that it is the
// ONLY arm naming a numerical result, so a future edit cannot quietly reintroduce the narrowing.
ok('#3 ONLY the shipped arm demands a numerical result',
  /numerical result/.test(SHIPPED_EQUIV) && !/numerical result/.test(narrative));

// ── #3.3 THE SHARED HEAD IS UNCHANGED ────────────────────────────────────────
// The sign-convention/labelling/layout examples are the part that was always right. Break mode: a
// rewrite of the scope quietly drops the examples that make the check concrete.
for (const [label, s] of [['shipped', SHIPPED_EQUIV], ['narrative', narrative]] as const) {
  ok(`#3 ${label} keeps the concrete convention examples`,
    /standard−actual vs actual−standard/.test(s) && /A\/F labelling/.test(s));
  ok(`#3 ${label} still runs BEFORE any error is named`,
    /do this before naming any error/.test(s));
  ok(`#3 ${label} ends with a trailing space (it is concatenated mid-prompt)`,
    s.endsWith(' '));
}

// ── #3.4 THE GROUNDING CLAUSE IS DELIBERATELY ABSENT ─────────────────────────
// The drill route's version carries "when a GROUNDING block is supplied below". This engine's
// grounding channel is empty on 34 of 38 published requirements, so porting it would add an inert
// second moving part to the arm. Pinned so its absence reads as a decision, not an oversight.
ok('#3 the grounding clause is NOT ported into either arm',
  !/GROUNDING block/.test(narrative) && !/GROUNDING block/.test(SHIPPED_EQUIV));

// ── #4.1 THE SHIPPED CONFIRM ENDORSEMENT, PINNED BYTE-IDENTICAL ──────────────
const SHIPPED_CONFIRM = "If their convention differs from the usual model, say it's equally valid. ";
ok('#4 shipped is byte-identical to the pre-variant string',
  caseConfirmConvention('shipped') === SHIPPED_CONFIRM,
  JSON.stringify(caseConfirmConvention('shipped')));
ok('#4 the shipped arm demands the endorsement UNCONDITIONALLY — the defect',
  /If their convention differs/.test(SHIPPED_CONFIRM) && !/PRESENTATION/.test(SHIPPED_CONFIRM));

// ── #4.2 THE CONDITIONED ARM SPLITS THE DEMAND ───────────────────────────────
const conditioned = caseConfirmConvention('conditioned');
ok('#4 conditioned arm differs from shipped', conditioned !== SHIPPED_CONFIRM);
ok('#4 conditioned arm still GRANTS the endorsement for presentation',
  /PRESENTATION differs/.test(conditioned) && /equally valid/.test(conditioned));
ok('#4 conditioned arm names the alternative FIGURE or METHOD branch',
  /different FIGURE or a different METHOD/.test(conditioned));
ok('#4 the alternative branch demands a SATISFIABLE job, not silence',
  /say plainly\s+whether that alternative holds/.test(conditioned.replace(/\s+/g, ' ')));

// ── #4.3 DEMAND-FORM, NOT PROHIBITION-FORM (P-T2 / P-M4) ─────────────────────
// This is the load-bearing design claim and the reason the drill route's wording was NOT ported.
// A clause that names the unwanted output primes it; the fix is to stop issuing the demand on
// that branch, so there is nothing left to forbid.
ok('#4 conditioned arm contains NO prohibition',
  !/\bnever\b/i.test(conditioned) && !/\bdo not\b/i.test(conditioned) && !/\bdon't\b/i.test(conditioned));
ok('#4 conditioned arm does not name the unwanted output to forbid it',
  !/to protect their mood/.test(conditioned));
// P-G3: pin the prohibition-form port as MUST-FAIL, so a future "just copy the drill route"
// cannot land silently.
const PROHIBITION_FORM_PORT =
  "If their PRESENTATION differs from the usual model (layout/labelling only), say that is " +
  'equally valid — but if they also mention an ALTERNATIVE FIGURE or METHOD (not just ' +
  'presentation), check it against the CONVENTIONS above first and correct it plainly if it ' +
  'fails the required method; never call a wrong or unscaled form "equally valid" to protect ' +
  'their mood. ';
ok('#4 MUST-FAIL: the drill route\'s prohibition-form wording is not what ships here',
  conditioned !== PROHIBITION_FORM_PORT && /never call a wrong/.test(PROHIBITION_FORM_PORT));

for (const [label, s] of [['shipped', SHIPPED_CONFIRM], ['conditioned', conditioned]] as const) {
  ok(`#4 ${label} ends with a trailing space (it is concatenated mid-prompt)`, s.endsWith(' '));
}

// ── WIRING: the engine must actually USE these, and default correctly ────────
ok('#3 the engine calls the builder rather than inlining the check',
  /caseEquivalenceCheck\(CASE_EQUIV\)/.test(engine));
// The numeric-only sentence must survive ONLY inside the builder's `shipped` branch. If it also
// appears at the call site, the arm is measuring a string the prompt no longer assembles.
ok('#3 the numeric-only sentence exists ONLY inside the builder',
  (engine.match(/numerical result is mathematically equivalent/g) || []).length === 1);
ok('#3 the equivalence string is built in ONE place',
  (engine.match(/EQUIVALENCE CHECK — do this before naming any error/g) || []).length === 1);
ok('#4 the engine calls the builder rather than inlining the endorsement',
  /caseConfirmConvention\(CASE_CONFIRM\)/.test(engine));
// It legitimately appears TWICE inside the builder (once per branch). The property that matters is
// that it appears NOWHERE ELSE — an inlined copy at the call site would mean the confirm leg still
// sends the unconditional demand regardless of the variant.
// ⚠️ COMMENTS ARE BLANKED FIRST — same technique as test-paper-link-sweep.ts, and for the same
// reason: this file's OWN doc comments quote the shipped literal to explain the defect, and a raw
// scan reports those as inlined copies. Blanked to spaces so offsets are preserved.
{
  const code = engine
    .replace(/\/\*[\s\S]*?\*\//g, (m: string) => m.replace(/[^\n]/g, ' '))
    .replace(/^([^\n]*?)\/\/[^\n]*$/gm, (_m: string, keep: string) => keep);
  const [beforeBuilder, rest] = code.split('export function caseConfirmConvention');
  const afterBuilder = (rest ?? '').split('// ── CALL 3')[1] ?? (rest ?? '').split('async function call3_hint')[1] ?? '';
  const hit = /say it's equally valid/;
  ok('#4 the endorsement string appears ONLY inside the builder (comments blanked)',
    !hit.test(beforeBuilder) && !hit.test(afterBuilder),
    `before=${hit.test(beforeBuilder)} after=${hit.test(afterBuilder)}`);
  // Positive control (P-G3): an empty exclusion makes the assertion unfalsifiable, so prove the
  // blanking did not simply erase everything and that the detector still fires on a real inline.
  ok('#4 POSITIVE CONTROL: the detector finds an inlined copy when one exists',
    hit.test(`x = ${"'"}say it's equally valid${"'"};` ) && code.length > engine.length * 0.5);
}

ok('#3 has its OWN env var', /process\.env\.TUTOR_CASE_EQUIV/.test(engine));
ok('#4 has its OWN env var', /process\.env\.TUTOR_CASE_CONFIRM/.test(engine));
// ⚠️ SEPARATE VARS. The two changes hit DIFFERENT LEGS with different endpoints (#3 call2_diagnose,
// #4 call3_confirm), so they do not confound each other — but one shared var would move both
// whenever either is measured, which is the N-way unattributability P-T4 warns about.
ok('#3 and #4 do not share an env var',
  !/TUTOR_CASE_EQUIV_CONFIRM/.test(engine) &&
  /TUTOR_CASE_EQUIV \?\? 'narrative'/.test(engine) &&
  /TUTOR_CASE_CONFIRM \?\? 'conditioned'/.test(engine));
ok('#3 defaults to narrative', /TUTOR_CASE_EQUIV \?\? 'narrative'/.test(engine));
ok('#4 defaults to conditioned', /TUTOR_CASE_CONFIRM \?\? 'conditioned'/.test(engine));

console.log(`\n${fail ? 'FAIL' : 'PASS'} case divergences: ${pass} passed, ${fail} failed\n`);
if (fail) process.exitCode = 1;
