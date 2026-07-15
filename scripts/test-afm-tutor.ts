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
  revealDecision,
  trimToLastSentence,
  REVEAL_FOOTER,
  BURN_CTA,
} from '../lib/acca/tutor-personas';
import { subAreaName } from '../components/org/orgTheme';

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

// ── (3) G4 label collision: AFM/APM prefixes collide, labels must diverge by paper ──
// Headline mislabel fix: pre-G4 an AFM 'B1' (DCF) rendered as APM's "Budgetary planning".
ok('subAreaName: AFM B1 = DCF (not APM budgeting)',
  subAreaName('AFM', 'B1') === 'Discounted cash flow techniques');
ok('subAreaName: APM B1 = budgeting (unchanged)',
  subAreaName('APM', 'B1') === 'Budgetary planning and control');
ok('subAreaName: same code, different label per paper',
  subAreaName('AFM', 'B1') !== subAreaName('APM', 'B1'));
ok('subAreaName: AFM E2 = forex hedging (AFM-only section)',
  subAreaName('AFM', 'E2') === 'Hedging foreign-exchange risk');
ok('subAreaName: unknown code falls back to the bare code',
  subAreaName('AFM', 'Z9') === 'Z9');

// ── (4) Access-aware earned-reveal gate (Bucket-B burn doctrine) ──────────────
// SOLVED → reveal for free & paid; STRUGGLE → reveal for paid, BURN for free; neither →
// earn_redirect; non-reveal → none. The artifact is gated, teaching stays free.
ok('gate: SOLVED + FREE → reveal (solved path free for all)',
  revealDecision({ wantsReveal: true, missCount: 0, resolved: true, paid: false }) === 'reveal');
ok('gate: SOLVED + PAID → reveal (unchanged)',
  revealDecision({ wantsReveal: true, missCount: 0, resolved: true, paid: true }) === 'reveal');
ok('gate: STRUGGLE + FREE → BURN (artifact gated)',
  revealDecision({ wantsReveal: true, missCount: 2, resolved: false, paid: false }) === 'burn');
ok('gate: STRUGGLE + PAID → reveal',
  revealDecision({ wantsReveal: true, missCount: 2, resolved: false, paid: true }) === 'reveal');
ok('gate: MOAT holds — unearned + unsolved refuses (missCount 0, free)',
  revealDecision({ wantsReveal: true, missCount: 0, resolved: false, paid: false }) === 'earn_redirect');
ok('gate: MOAT holds even for PAID — must attempt first (missCount 1, paid)',
  revealDecision({ wantsReveal: true, missCount: 1, resolved: false, paid: true }) === 'earn_redirect');
ok('gate: non-reveal message is never a reveal (even when resolved)',
  revealDecision({ wantsReveal: false, missCount: 5, resolved: true, paid: false }) === 'none');
// Reload-safety: durable `resolved` re-read while missCount may reset to 0 → still reveal, free.
ok('gate: resolved persists across reload (missCount 0, free → still reveal)',
  revealDecision({ wantsReveal: true, missCount: 0, resolved: true, paid: false }) === 'reveal');

// ── (4b) Burn body is figure-free + carries the CTA; reveal footer present ────
ok('burn: CTA contains no digits (no figures can leak from the static block)',
  !/[0-9]/.test(BURN_CTA));
ok('burn: CTA carries the /acca/subscribe upgrade link',
  BURN_CTA.includes('](/acca/subscribe)'));
ok('burn: CTA sells understanding ("sort of get it" → "got it")',
  BURN_CTA.includes('sort of get it') && BURN_CTA.includes('got it'));
ok('reveal footer: copyright line present + personal-prep wording',
  REVEAL_FOOTER.includes('© Gradd') && REVEAL_FOOTER.includes('personal exam preparation'));
ok('reveal footer: assembled reveal STILL ends with model_answer verbatim (footer in wrapper)',
  assembleAfmReveal(WRAPPER, MODEL_ANSWER).endsWith(MODEL_ANSWER) &&
  assembleAfmReveal(WRAPPER, MODEL_ANSWER).includes('© Gradd'));

// ── (5) Truncation guard — a capped (over-length) response serves sentence-complete ──
// finishClean() calls trimToLastSentence ONLY when stop_reason === 'max_tokens'; this tests
// the deterministic core: a mid-sentence cutoff is trimmed back to the last complete sentence,
// never shipped mid-word. Complete text is returned unchanged (idempotent).
ok('trim: over-length cutoff → serves sentence-complete (ends on ".", fragment dropped)',
  trimToLastSentence('Good instinct on APV. The financing side-effects matter here, and the subsidised loan chang') === 'Good instinct on APV.');
ok('trim: result never ends mid-word',
  /[.!?]["’”)\]*]*$/.test(trimToLastSentence('You nailed the plumbing. Now the discount rate is where it went sideway')));
ok('trim: complete text is returned unchanged (idempotent)',
  trimToLastSentence('All correct. Well done.') === 'All correct. Well done.');
ok('trim: keeps the closing markdown bold in the terminator',
  trimToLastSentence('**You nailed it.** The next mo') === '**You nailed it.**');
ok('trim: a decimal mid-number is NOT a sentence end',
  trimToLastSentence('The modified duration is 6.297 years, which is close to matur') === 'The modified duration is 6.297 years, which is close to matur');
ok('trim: ? and ! count as terminators',
  trimToLastSentence('Is APV right here? Yes — and the reason is that financ') === 'Is APV right here?');

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
