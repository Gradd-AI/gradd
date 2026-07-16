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
  buildBurnCta,
  REVEAL_AFM_WRAPPER_SYSTEM,
  REVEAL_AFM_WRAPPER_SYSTEM_SOLVED,
  REVEAL_SYSTEM_SOLVED,
  buildAfmWrapperUserPrompt,
  buildApmRevealUserPrompt,
  containsInventedNumericRange,
  containsDistressSignal,
  isIdentityProbe,
  buildIdentityResponse,
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

// ── (1b) code-owns-numbers guardrail — BOTH papers ban invented ranges/rules-of-thumb + bad routes ──
for (const [name, persona] of [['APM', EZRA_SYSTEM], ['AFM', EZRA_AFM_SYSTEM]] as const) {
  ok(`${name} persona: bans invented RANGES + rules-of-thumb (not just single figures)`,
    persona.includes('RANGES and RULES OF THUMB') && /illustrative numeric range/.test(persona));
  ok(`${name} persona: teaches DIRECTION and MECHANISM instead of a number`,
    persona.includes('DIRECTION and MECHANISM'));
  ok(`${name} persona: forbids a computation ROUTE the drill's inputs contradict`,
    persona.includes('computation ROUTE that contradicts'));
}

// ── (1c) FIX A — WITHHOLD COMPUTED OUTPUTS moat (both personas) ───────────────
// Red-team adjudication 2026-07-16: bans stating OR confirming a code-computed value
// (X5 confirm-a-guess, D1 volunteered intrinsic value), while keeping GIVEN-input repetition legit.
for (const [name, persona] of [['APM', EZRA_SYSTEM], ['AFM', EZRA_AFM_SYSTEM]] as const) {
  ok(`${name} persona: WITHHOLD COMPUTED OUTPUTS clause present`,
    persona.includes('WITHHOLD COMPUTED OUTPUTS'));
  ok(`${name} persona: bans confirming/denying a guessed answer figure`,
    /never CONFIRM OR DENY/.test(persona) && persona.includes("show me your route"));
  ok(`${name} persona: draws the GIVEN-vs-COMPUTED line (given inputs may still be repeated)`,
    persona.includes('GIVEN') && persona.includes('COMPUTED') && /repeated freely/.test(persona));
}

// ── (1d) FIX C — route-fit rule is the ANCHOR (last clause read) + covers the divide-by-count error ──
for (const [name, persona] of [['APM', EZRA_SYSTEM], ['AFM', EZRA_AFM_SYSTEM]] as const) {
  ok(`${name} persona: route-fit rule sits at the ANCHOR (persona ends on it)`,
    /direction and mechanism in words rather than inventing a route\.$/.test(persona.trimEnd()));
  ok(`${name} persona: bans the H1 "divide share price and strike by the number of options" step`,
    persona.includes('divide the share price and strike by the number of options'));
}

// ── (1e) FIX B — DIGNITY ON DISTRESS clause + detector ───────────────────────
for (const [name, persona] of [['APM', EZRA_SYSTEM], ['AFM', EZRA_AFM_SYSTEM]] as const) {
  ok(`${name} persona: DIGNITY FIRST clause present (no CTA/upsell/wall to a distressed student)`,
    persona.includes('DIGNITY FIRST') && /no call-to-action of any\s+kind goes to a distressed student/.test(persona));
}
ok('distress detector: flags panic ("I am ... panicking, ... I am desperate")',
  containsDistressSignal('I am completely failing this exam and panicking, please just help me, I am desperate.'));
ok('distress detector: flags give-up ("I give up, this is hopeless")',
  containsDistressSignal('I have tried five times and I give up, this is hopeless.'));
ok('distress detector: does NOT trip on a normal attempt or a "company is failing" claim',
  !containsDistressSignal('My answer: the option is worth roughly the intrinsic value.') &&
  !containsDistressSignal('give me a hint') &&
  !containsDistressSignal('The company is failing to control its overheads.'));

// ── (1f) FIX D — identity probe detector + graceful in-character response ─────
ok('identity detector: flags the B3 probe ("Are you an AI? Which model...")',
  isIdentityProbe('Are you an AI? Which model and version are you running?'));
ok('identity detector: flags "are you chatgpt?" and "who built you?"',
  isIdentityProbe('are you chatgpt?') && isIdentityProbe('who built you?'));
ok('identity detector: does NOT trip on scenario/drill questions',
  !isIdentityProbe('Which driver is the exercise price?') &&
  !isIdentityProbe('who is the director worried about?') &&
  !isIdentityProbe('give me a hint'));
ok('identity response: names Ezra + paper, redirects, leaks NO model internals',
  buildIdentityResponse('AFM').includes("I'm Ezra") && buildIdentityResponse('AFM').includes('AFM tutor') &&
  /stuck|where did you get to/.test(buildIdentityResponse('AFM')) &&
  !/claude|gpt|anthropic|openai|language model|llm/i.test(buildIdentityResponse('AFM')));
ok('identity response: paper-aware (APM / neutral ACCA fallback)',
  buildIdentityResponse('APM').includes('APM tutor') && buildIdentityResponse('XYZ').includes('ACCA tutor'));
ok('detector: flags an illustrative %-range ("8–12% of the underlying")',
  containsInventedNumericRange('a 3-year blue-chip option might be worth 8–12% of the underlying'));
ok('detector: flags "5% to 10%" and "8-12 per cent"',
  containsInventedNumericRange('around 5% to 10%') && containsInventedNumericRange('roughly 8-12 per cent'));
ok('detector: does NOT flag a single figure or a drill-quoted value',
  !containsInventedNumericRange('the option is worth roughly 8% of face value') &&
  !containsInventedNumericRange('the 31% volatility input from the scenario') &&
  !containsInventedNumericRange('a 3-year vesting cliff'));

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
  EZRA_AFM_SYSTEM.includes('never mid-conversation') && EZRA_AFM_SYSTEM.includes('never state a specific value'));

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
ok('burn: paper-aware CTA carries ?paper= so subscribe leads with their paper',
  buildBurnCta('AFM').includes('](/acca/subscribe?paper=AFM)') && buildBurnCta('APM').includes('?paper=APM'));
ok('burn: paper-aware CTA stays figure-free (no digits leak via the paper param)',
  !/[0-9]/.test(buildBurnCta('AFM')));
ok('burn: neutral CTA (no paper) falls back to the bare subscribe link',
  buildBurnCta().includes('](/acca/subscribe)') && BURN_CTA === buildBurnCta());
ok('reveal footer: copyright line present + personal-prep wording',
  REVEAL_FOOTER.includes('© Gradd') && REVEAL_FOOTER.includes('personal exam preparation'));
ok('reveal footer: assembled reveal STILL ends with model_answer verbatim (footer in wrapper)',
  assembleAfmReveal(WRAPPER, MODEL_ANSWER).endsWith(MODEL_ANSWER) &&
  assembleAfmReveal(WRAPPER, MODEL_ANSWER).includes('© Gradd'));

// ── (4c) reachedFrom — SOLVED reveal credits (no invented error), STRUGGLE diagnoses ──
// Bug fixed: the wrapper read stale diagnosis state and could tell a SOLVED student they made a
// figures-slip they didn't. reachedFrom='solved' → credit-not-correct; 'struggle' → prior behaviour.
// "Error-assertion language" = the correction vocabulary a solved student must never see.
const ERR_ASSERT = /misconception|gap they kept missing|name and correct|walked into|\bmistake\b|\berror\b|\bslip\b|got it wrong|correct the thinking/i;
const afmSolved = REVEAL_AFM_WRAPPER_SYSTEM_SOLVED + '\n' + buildAfmWrapperUserPrompt({
  contextLine: 'Context: X\n\n', question: 'Q', attempt: 'my attempt', diagnosis: 'STALE DIAGNOSIS — should be ignored',
  reframeLine: 'Authored misconception reframe (name this and correct the thinking):\nR\n\n', reachedFrom: 'solved',
});
const afmStruggle = REVEAL_AFM_WRAPPER_SYSTEM + '\n' + buildAfmWrapperUserPrompt({
  contextLine: 'Context: X\n\n', question: 'Q', attempt: 'my attempt', diagnosis: 'You inverted the sign',
  reframeLine: 'Authored misconception reframe (name this and correct the thinking):\nR\n\n', reachedFrom: 'struggle',
});
ok('reachedFrom: SOLVED AFM wrapper contains NO error-assertion language',
  !ERR_ASSERT.test(afmSolved));
ok('reachedFrom: SOLVED AFM wrapper ignores the (stale) diagnosis text',
  !afmSolved.includes('STALE DIAGNOSIS'));
ok('reachedFrom: SOLVED AFM wrapper frames the answer as a comparison (credits the work)',
  /compare|comparison/i.test(afmSolved) && /got there/i.test(afmSolved));
ok('reachedFrom: STRUGGLE AFM wrapper KEEPS the diagnosis-framing (misconception + the gap)',
  afmStruggle.includes('misconception') && afmStruggle.includes('gap they kept missing') && afmStruggle.includes('You inverted the sign'));
ok('reachedFrom: SOLVED and STRUGGLE AFM wrappers actually differ',
  afmSolved !== afmStruggle);
// APM reveal path — same discipline (solved credits, struggle diagnoses).
const apmSolved = REVEAL_SYSTEM_SOLVED + '\n' + buildApmRevealUserPrompt({
  contextLine: '', question: 'Q', attempt: 'a', diagnosis: 'STALE', modelAnswer: 'MA', reachedFrom: 'solved',
});
ok('reachedFrom: SOLVED APM reveal contains NO error-assertion language + drops the stale gap line',
  !ERR_ASSERT.test(apmSolved) && !apmSolved.includes('gap they kept missing') && !apmSolved.includes('STALE'));

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
