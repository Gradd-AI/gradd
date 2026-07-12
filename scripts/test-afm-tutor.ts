// scripts/test-afm-tutor.ts
// Fixtures for the G3 AFM teaching branch (lib/acca/tutor-personas.ts). Pure — no
// env/DB/model. Exit 1 on any mismatch. Two guarantees:
//  (1) PERSONA — systemFor swaps register by paper; the AFM persona carries the AFM
//      failure-class frame + the "code owns every number" conversational guardrail, and
//      does NOT adopt the APM describe-not-apply / intellectual-level diagnostic frame.
//  (2) REVEAL BYTE-EQUALITY — the served AFM reveal body ends with the authored
//      model_answer VERBATIM, so a refactor cannot reintroduce model-emitted tables
//      (the truncation/drift failure mode design "B" exists to prevent).
import {
  EZRA_SYSTEM,
  EZRA_AFM_SYSTEM,
  systemFor,
  AFM_REVEAL_SEPARATOR,
  assembleAfmReveal,
  sanitizeAfmWrapper,
} from '../lib/acca/tutor-personas';

let failures = 0;
function ok(name: string, cond: boolean) {
  if (!cond) failures++;
  console.log(`${cond ? 'PASS' : 'FAIL'} :: ${name}`);
}

// ── (1) systemFor swaps register by paper ────────────────────────────────────
ok('systemFor("AFM") returns the AFM persona', systemFor('AFM') === EZRA_AFM_SYSTEM);
ok('systemFor("APM") returns the APM persona', systemFor('APM') === EZRA_SYSTEM);
ok('systemFor("") defaults to APM',            systemFor('') === EZRA_SYSTEM);
ok('systemFor(unknown) defaults to APM',       systemFor('XYZ') === EZRA_SYSTEM);

// ── (1) AFM persona carries the AFM failure-class frame ──────────────────────
ok('AFM persona: board-adviser register',   EZRA_AFM_SYSTEM.includes('senior financial adviser to the board'));
ok('AFM persona: FENCE-SITTING class',      EZRA_AFM_SYSTEM.includes('FENCE-SITTING'));
ok('AFM persona: HEDGING-SPECIFICATION',    EZRA_AFM_SYSTEM.includes('HEDGING-SPECIFICATION'));
ok('AFM persona: VALUATION-PLUMBING',       EZRA_AFM_SYSTEM.includes('VALUATION-PLUMBING'));
ok('AFM persona: ABANDONED-AFTER-CALC',     EZRA_AFM_SYSTEM.includes('ABANDONED-AFTER-CALC'));

// ── (1) Conversational "code owns every number" guardrail is present in AFM persona ──
ok('AFM persona: code-owns-numbers guardrail present',
  EZRA_AFM_SYSTEM.includes('CODE OWNS EVERY NUMBER'));
ok('AFM persona: forbids inventing a figure mid-conversation',
  EZRA_AFM_SYSTEM.includes('never assert, invent, recompute, or correct a specific figure'));

// ── (1) AFM persona does NOT adopt the APM diagnostic frame ──────────────────
// (bare "APM" appears once, as the negation "never use APM describe-not-apply framing",
//  so assert on the APM-SPECIFIC diagnostic phrasings, not on the substring "APM".)
ok('AFM persona: no APM "candidates know the models" frame',
  !EZRA_AFM_SYSTEM.includes('APM candidates know the models'));
ok('AFM persona: no APM intellectual-level-2-vs-3 frame',
  !EZRA_AFM_SYSTEM.includes('stopping at intellectual level 2'));

// ── (2) Reveal byte-equality: served body ends with model_answer VERBATIM ─────
const MODEL_ANSWER = [
  '**Step 1 — Tax-allowable depreciation**',
  '',
  '| Year | WDA |',
  '|------|-----|',
  '| 1 | AUD 23.0m |',
  '| 2 | AUD 18.4m |',
  '',
  '**MIRR = 17.48%.** The project should be **accepted**.',
].join('\n');
const WRAPPER = 'Good call spotting MIRR is the sounder measure. The trap was inventing the hurdle rate — the worked answer below shows the real build. Try the next one.';

const served = assembleAfmReveal(WRAPPER, MODEL_ANSWER);
ok('reveal body ENDS WITH model_answer byte-for-byte', served.endsWith(MODEL_ANSWER));
ok('reveal body contains model_answer verbatim (tables intact)', served.includes('| 1 | AUD 23.0m |'));
ok('reveal body contains the separator', served.includes(AFM_REVEAL_SEPARATOR));
ok('reveal body preserves model_answer length exactly at the tail',
  served.slice(served.length - MODEL_ANSWER.length) === MODEL_ANSWER);

// Wrapper trailing whitespace must not perturb the invariant.
ok('trailing-whitespace wrapper still ends with model_answer',
  assembleAfmReveal(WRAPPER + '\n\n  ', MODEL_ANSWER).endsWith(MODEL_ANSWER));
// Empty wrapper degrades safely (still verbatim tail).
ok('empty wrapper still serves model_answer verbatim',
  assembleAfmReveal('', MODEL_ANSWER).endsWith(MODEL_ANSWER));

// ── (2b) sanitizeAfmWrapper cuts a stray divider / worked-answer stub ─────────
// Observed failure mode: the wrapper model starts its OWN "---" + "WORKED ANSWER … 1. Tax-"
// heading before its token cap, leaving a truncated stub above the real appended answer.
ok('sanitizer cuts at a stray horizontal rule',
  sanitizeAfmWrapper('Good instinct on MIRR. Try the next one.\n\n---\n\n**WORKED ANSWER**\n\n**1. Tax-')
    === 'Good instinct on MIRR. Try the next one.');
ok('sanitizer cuts at a "worked answer" heading with no divider',
  sanitizeAfmWrapper('Nicely spotted. Onward.\n\n**Worked answer — Karratha**\n\n**1. Tax')
    === 'Nicely spotted. Onward.');
ok('sanitizer cuts at an "investment appraisal" heading',
  sanitizeAfmWrapper('Solid start.\n\n**Investment appraisal — internal rate of return**\nAssumptions:')
    === 'Solid start.');
ok('sanitizer leaves clean prose (with an em-dash) untouched',
  sanitizeAfmWrapper('You had MIRR right — the trap was inventing the hurdle rate. Try a fresh one.')
    === 'You had MIRR right — the trap was inventing the hurdle rate. Try a fresh one.');
ok('assembled body stays verbatim-tailed even when the wrapper had a stray stub',
  assembleAfmReveal('Prose.\n\n---\n\n**WORKED ANSWER**\n**1. Tax-', MODEL_ANSWER).endsWith(MODEL_ANSWER));
ok('assembled body drops the stray stub (no double worked-answer heading)',
  !assembleAfmReveal('Prose.\n\n---\n\n**WORKED ANSWER**\n**1. Tax-', MODEL_ANSWER).includes('**WORKED ANSWER**'));

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
