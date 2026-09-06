// scripts/test-afm-tutor.ts
// Fixtures for the G3 AFM teaching branch (lib/acca/tutor-personas.ts). Pure — no
// env/DB/model. Exit 1 on any mismatch. Two guarantees:
//  (1) PERSONA — systemFor swaps register by paper; the AFM persona carries the AFM
//      failure-class frame + the "code owns every number" conversational guardrail, and
//      does NOT adopt the APM describe-not-apply / intellectual-level diagnostic frame.
//  (2) REVEAL BYTE-EQUALITY — the served AFM reveal body ends with the authored
//      model_answer VERBATIM, so a refactor cannot reintroduce model-emitted tables
//      (the truncation/drift failure mode design "B" exists to prevent).
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const __dirname = dirname(fileURLToPath(import.meta.url));

import {
  EZRA_SYSTEM,
  EZRA_AFM_SYSTEM,
  systemFor,
  AFM_REVEAL_SEPARATOR,
  assembleAfmReveal,
  normaliseRevealArtefact,
  sanitizeAfmWrapper,
  revealDecision,
  trimToLastSentence,
  stripOpenerDivider,
  REVEAL_FOOTER,
  BURN_CTA,
  buildBurnCta,
  REVEAL_AFM_WRAPPER_SYSTEM,
  REVEAL_AFM_WRAPPER_SYSTEM_SOLVED,
  REVEAL_SYSTEM_SOLVED,
  buildRevealWrapperUserPrompt,
  revealWrapperSystemFor,
  buildApmRevealUserPrompt,
  containsInventedNumericRange,
  containsDistressSignal,
  isIdentityProbe,
  buildIdentityResponse,
  isConfirmNumberProbe,
  CONFIRM_NUMBER_REFUSAL,
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
    /never CONFIRM OR DENY/.test(persona) && persona.includes("show me the route"));
  ok(`${name} persona: draws the GIVEN-vs-COMPUTED line (given inputs may still be repeated)`,
    persona.includes('GIVEN') && persona.includes('COMPUTED') && /repeated freely/.test(persona));
  ok(`${name} persona: bans validating a guessed MAGNITUDE/ballpark (M1/M3)`,
    /right ballpark/.test(persona) && /makes commercial sense/.test(persona));
  ok(`${name} persona: bans volunteering the intrinsic-value floor (D1)`,
    persona.includes('DERIVED FLOOR') && persona.includes('intrinsic value'));
  ok(`${name} persona: refusal is strictly NEUTRAL — no proximity signals, standard "gets marked" line (X5)`,
    persona.includes('strictly NEUTRAL') && /right instinct/.test(persona) && persona.includes('the method gets marked'));
  ok(`${name} persona: withholds NUMBERS not TRUTH — mandatory figure-free conceptual correction (M4)`,
    persona.includes('withholds NUMBERS, never TRUTH') && /wrong DIRECTION/.test(persona) &&
    persona.includes('Withhold numbers, never correct understanding'));
}

// ── (1d) FIX C — route-fit rule is the ANCHOR (last clause read) + covers the divide-by-count error ──
for (const [name, persona] of [['APM', EZRA_SYSTEM], ['AFM', EZRA_AFM_SYSTEM]] as const) {
  ok(`${name} persona: route-fit rule sits at the ANCHOR (persona ends on it)`,
    /direction and mechanism in words rather than inventing a route\.$/.test(persona.trimEnd()));
  ok(`${name} persona: bans the H1 "divide share price and strike by the number of options" step`,
    persona.includes('divide the share price and strike by the number of options'));
  ok(`${name} persona: bans the X2 per-share rescale route when aggregates are supplied`,
    /rescale to per-share/.test(persona) && persona.includes('only consumes per-share'));
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

// ── (1g) X5 STRUCTURAL — deterministic confirm-a-number gate + frozen refusal ──
// The refusal is served without a model call, so it CANNOT carry a proximity/validation signal.
ok('confirm-number detector: fires on the X5 probe ("Is the answer about 51 million? Yes or no.")',
  isConfirmNumberProbe('Is the answer about 51 million? Yes or no.'));
ok('confirm-number detector: fires on a bare assertion ("The answer is 51 million.") + M1 rule-of-thumb',
  isConfirmNumberProbe('The answer is 51 million.') &&
  isConfirmNumberProbe('My answer: the call is 51m — I just took 25% of the underlying as a rule of thumb.'));
ok('confirm-number detector: does NOT fire when real working is shown (genuine attempt)',
  !isConfirmNumberProbe('d1 = 0.42 and d2 = -0.12, so N(d1)=0.66 and the call comes to 51m'));
ok('confirm-number detector: does NOT fire on restating a GIVEN driver or a non-numeric question',
  !isConfirmNumberProbe('The volatility is 31% as given in the scenario') &&
  !isConfirmNumberProbe('is it in the money?') &&
  !isConfirmNumberProbe('what is the exercise price?'));
ok('confirm-number REFUSAL: frozen text carries ZERO proximity/validation phrases',
  !/right ballpark|right instinct|you'?re close|magnitude|makes (commercial )?sense|about right|in the right|correct territory|good (instinct|sense)/i.test(CONFIRM_NUMBER_REFUSAL));
ok('confirm-number REFUSAL: neutral refuse + redirect-to-working, no digits',
  /won'?t confirm or deny/i.test(CONFIRM_NUMBER_REFUSAL) && /working chain/i.test(CONFIRM_NUMBER_REFUSAL) &&
  !/[0-9]/.test(CONFIRM_NUMBER_REFUSAL));
// ── (1g-bis) CONFIRM-NUMBER GATE — BOTH DIRECTIONS (2026-09-01) ───────────────
// P-G3(a): the fail path is exercised, not just the pass path. The OLD notation-only
// predicate is transcribed and pinned MUST-FAIL — if it ever passes the prose set, the fix
// was reverted.
//
// Transcribed as REGEX LITERALS, not new RegExp(string): the string form double-escapes, and
// a slipped backslash silently yields a regex matching NOTHING — which would make this pin
// vacuously green. The must-fire assertion below is what proves the transcription is live.
const LEGACY_WORKING = /d[₁₂12]\b|ln\s*\(|√|sqrt|N\s*\(\s*d|\bstep\s*\d|\bbecause\b|\btherefore\b|=[^=]*=/i;
const LEGACY_CONFIRM = /\b(is|are)\s+(it|that|the\s+(answer|value|result|call|figure|npv|price|option value))\b[^?]{0,40}\d|\b(the|my)\s+(answer|call|value|result|figure|npv|option value)\b[^.?!]{0,20}\b(is|was|=|:|comes?\s+to|of)\b[^.?!]{0,15}\d|\d[\d,.]*\s*(m|k|bn|billion|million|thousand)\b[^.?!]{0,25}\b(right|correct)\b/i;
const LEGACY_isConfirmNumberProbe = (t: string): boolean =>
  LEGACY_WORKING.test(t) ? false : (/\d/.test(t) && LEGACY_CONFIRM.test(t));

// The bare-confirmation shapes. X5/M3/M1 are Grant-ruled must-fires (X5 structural ruling).
const BARE_CONFIRMATIONS = [
  'Is the answer about 51 million? Yes or no.',                                          // X5
  'The answer is 51 million.',                                                           // M3
  'My answer: the call is 51m — I just took 25% of the underlying as a rule of thumb.',  // M1
  'My answer: the fair value is 481, which in kronor is 481 kronor.',
  'is it 26.7 right?',
  'Is that 26.7m correct?',
];
// Six prose answers WITH REASONING — genuine attempts an AFM candidate would write for an
// "advise the board" requirement. None carries a notation marker.
const PROSE_WITH_REASONING = [
  'I discounted the free cash flows at the company WACC of 9% over the five years and got a present value of about 148 million, then took off the initial investment of 120 million, so the NPV is roughly +28 million. That is positive so the board should go ahead.',
  'My answer is 26.7 million and I think the project should be accepted.',
  'The NPV comes to 26.7m so I would advise the board to proceed.',
  'Weighting each scenario by its probability, the expected NPV is 18 million, but two of the three scenarios are loss-making so I would not recommend a clean accept.',
  'Taking the present value of the four years of net operating cash flow and deducting the outlay, the answer is a negative 3 million, so I would advise the board against the order.',
  // ⚠️ THIS ONE PASSES FOR A DIFFERENT REASON THAN THE OTHER FIVE, and the next reader needs
  // to know: CONFIRM_NUM_RE never matches it ("the terminal value is" fails arm (b) because
  // "terminal" intervenes between "the" and the answer-noun), so the gate exits BEFORE the
  // stand-down is consulted. Its protection is therefore weaker than the rest — if
  // CONFIRM_NUM_RE were ever widened, this would fire, because it shows no arithmetic
  // (verified FALSE) and says "ballpark". Re-check this case if that regex changes.
  'I discounted the FCFs at 9% over five years to 148m, took off the 120m outlay, NPV +28m, though the terminal value is a ballpark.',
];

ok('confirm-number gate: still fires on every bare-confirmation shape (X5/M3/M1 ruling held)',
  BARE_CONFIRMATIONS.every(isConfirmNumberProbe));
ok('confirm-number gate: prose WITH REASONING reaches the model (all 6 stand down)',
  PROSE_WITH_REASONING.every((t) => !isConfirmNumberProbe(t)));

// ── THE FAIL PATH, EXERCISED ──
ok('P-G3: LEGACY transcription is LIVE (fires on all 6 bare confirmations) — pin is not vacuous',
  BARE_CONFIRMATIONS.every(LEGACY_isConfirmNumberProbe));
// MEASURED, not assumed: 4 of the 6 (not 3). The two survivors never matched CONFIRM_NUM_RE
// at all, so they were never the defect — an exact count keeps that distinction honest and
// stops the pin drifting.
ok('P-G3: LEGACY notation-only predicate is MUST-FAIL — it refused 4 of the 6 prose answers',
  PROSE_WITH_REASONING.filter(LEGACY_isConfirmNumberProbe).length === 4);

// STRONG evidence is NOT overridable by an admitted guess (Grant, 2026-09-01): a student who
// showed the arithmetic attempted, whatever they call their confidence in it.
ok('confirm-number gate: shown arithmetic beats an admitted guess (hedge is not a refusal)',
  !isConfirmNumberProbe('The answer is 148 - 120 = 28m, though the terminal value is a ballpark') &&
  !isConfirmNumberProbe('d1 = 0.42 so the call is 51m, admittedly a bit of a guess'));
// ...but a guess ADMITTED alongside a merely DESCRIBED method still fires — that is M1.
ok('confirm-number gate: an ADMITTED guess overrides DESCRIBED method/advice only',
  isConfirmNumberProbe('My answer is 51m, I worked it out as a rule of thumb from the underlying') &&
  isConfirmNumberProbe('The answer is 28 million, honestly just a ballpark, so I would proceed'));
// Direction lock: the widened stand-down must not resurrect the given-driver false positive
// the original gate was anchored against.
ok('confirm-number gate: unchanged on given-driver restatement and non-numeric questions',
  !isConfirmNumberProbe('The volatility is 31% as given in the scenario') &&
  !isConfirmNumberProbe('is it in the money?') &&
  !isConfirmNumberProbe('what is the exercise price?'));

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
ok('AFM persona: forbids inventing a figure',
  EZRA_AFM_SYSTEM.includes('never state a specific value'));

// ── THE CLOSING SENTENCE CONSTRAINS THE SOURCE, IT DOES NOT RELOCATE (2026-09-04) ──
// It used to read "Verified figures live only in the earned worked answer, never
// mid-conversation" — a RELOCATION rule. Injected into a reveal prompt (CASE_REVEAL_GUARDRAILS
// does this, and the ported APM drill reveal now does too) it reads as PERMISSION: the reveal
// IS the earned worked answer. It also asserted "Verified" for an APM artefact that was
// model-authored and verified by nothing. Both halves are pinned here.
ok('the relocation wording is GONE (it read as permission inside a reveal)',
  !EZRA_AFM_SYSTEM.includes('never mid-conversation')
  && !EZRA_AFM_SYSTEM.includes('Verified figures live only in the earned worked answer'));
ok('...replaced by a SOURCE constraint naming the three legitimate places',
  EZRA_AFM_SYSTEM.includes('must ALREADY EXIST in one of three places')
  && EZRA_AFM_SYSTEM.includes('There is no fourth source'));
ok('...and it explicitly binds the earned reveal too',
  EZRA_AFM_SYSTEM.includes('the reveal lifts WITHHOLDING, it does not licence INVENTION'));

// ── THE APM REVEAL IS STRUCTURAL: THE RETIRED PROMPT IS UNREACHABLE ──────────
// `REVEAL_SYSTEM` authorised "the figures" and named no source, and it invented one for a
// paying student (dd786100, APM B3b, 2026-08-07). It is retained ONLY as the control in
// test-case-reveal-routing; the serving path must not import it. A static sweep, because a
// unit test can prove the prompt is retired and cannot prove nobody wired it back.
{
  const route = readFileSync(join(__dirname, '..', 'app/api/acca/tutor/route.ts'), 'utf8');
  ok('the tutor route no longer imports REVEAL_SYSTEM / REVEAL_SYSTEM_SOLVED',
    !/^\s*REVEAL_SYSTEM(_SOLVED)?,\s*$/m.test(route));
  ok('the tutor route no longer imports buildApmRevealUserPrompt',
    !route.includes('buildApmRevealUserPrompt'));
  ok('the reveal is assembled by code, verbatim (assembleAfmReveal), on the ONE remaining path',
    (route.match(/assembleAfmReveal\(/g) ?? []).length === 1);
  ok('the wrapper system is paper-routed rather than branched at the call site',
    route.includes('revealWrapperSystemFor(paper, reachedFrom)'));
  ok('the served reveal is audited for unsourced figures',
    route.includes('auditRevealFigures('));
}

// Both papers get their own voice out of ONE body — the AFM bytes must not have moved.
ok('revealWrapperSystemFor returns the AFM constants byte-identical',
  revealWrapperSystemFor('AFM', 'struggle') === REVEAL_AFM_WRAPPER_SYSTEM
  && revealWrapperSystemFor('AFM', 'solved') === REVEAL_AFM_WRAPPER_SYSTEM_SOLVED);
ok('APM gets the APM persona, not the AFM adviser voice',
  revealWrapperSystemFor('APM', 'struggle').startsWith('You are Ezra, an APM tutor.')
  && !revealWrapperSystemFor('APM', 'struggle').includes('ACCA AFM tutor'));
ok('APM keeps the figure-free wrapper contract — only the opening differs',
  revealWrapperSystemFor('APM', 'struggle').includes('include NO figures, NO tables, NO calculations')
  && revealWrapperSystemFor('AFM', 'struggle').replace(
       "You are Ezra, an ACCA AFM tutor and the board's senior financial adviser.",
       'You are Ezra, an APM tutor.',
     ) === revealWrapperSystemFor('APM', 'struggle'));

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

// ⚠️ THE INVARIANT'S SHAPE CHANGED WITH THE PARAGRAPH NORMALISER (2026-09-06) AND THESE CHECKS
// ARE THE STATEMENT OF WHAT REPLACED IT. `served.endsWith(modelAnswer)` byte-for-byte cannot hold
// once blank lines are inserted between content lines. What is checked instead: the served body's
// CONTENT LINES end with the model_answer's content lines, byte-for-byte, in order, none altered
// and none dropped — which is the property the byte check existed to defend (the figures reach the
// student whole, and no refactor can reintroduce model-emitted tables).
const contentLines = (s: string): string[] =>
  s.split(/\r\n|\n/).map(l => l.trimEnd()).filter(l => l.trim() !== '');
const endsWithLines = (body: string, tail: string): boolean => {
  const b = contentLines(body), t = contentLines(tail);
  return t.length > 0 && b.length >= t.length &&
    b.slice(b.length - t.length).every((l, i) => l === t[i]);
};

const served = assembleAfmReveal(WRAPPER, MODEL_ANSWER);
ok('reveal body ENDS WITH model_answer\'s content lines, byte-for-byte, in order',
  endsWithLines(served, MODEL_ANSWER));
ok('reveal body contains model_answer verbatim (tables intact)', served.includes('| 1 | AUD 23.0m |'));
ok('reveal body contains the separator', served.includes(AFM_REVEAL_SEPARATOR));
ok('reveal body drops NO content line and invents none (tail line count is exact)',
  contentLines(served).length === contentLines(WRAPPER).length + contentLines(REVEAL_FOOTER).length
    + 1 /* the --- separator rule */ + contentLines(MODEL_ANSWER).length);

// Wrapper trailing whitespace must not perturb the invariant.
ok('trailing-whitespace wrapper still ends with the model_answer lines',
  endsWithLines(assembleAfmReveal(WRAPPER + '\n\n  ', MODEL_ANSWER), MODEL_ANSWER));
// Empty wrapper degrades safely (still verbatim tail).
ok('empty wrapper still serves the model_answer lines verbatim',
  endsWithLines(assembleAfmReveal('', MODEL_ANSWER), MODEL_ANSWER));

// ── (2a) THE PARAGRAPH NORMALISER — the floor, and its one structural exception ──
// The defect it closes: `MessageRenderer` joins consecutive non-blank lines with a SPACE, so a
// bare section label renders swallowed into the sentence below it. Live on 43/91 published APM
// drills and all 18 APM case model_answers.
const RUNON = 'The accuracy claim\r\nThe headline 94% accuracy should not be accepted.\r\n\r\nConclusion\r\nNot yet safe.';
ok('normaliser: a bare label followed by its body becomes its OWN paragraph',
  normaliseRevealArtefact(RUNON) ===
  'The accuracy claim\n\nThe headline 94% accuracy should not be accepted.\n\nConclusion\n\nNot yet safe.');
// P-G3: the SHIPPED behaviour pinned MUST-FAIL. `paras` mirrors `MessageRenderer`'s paragraph
// rule exactly — consecutive non-blank lines are joined with a SPACE — so this reproduces the
// defect rather than asserting a string shape.
const paras = (s: string): string[] =>
  s.split(/\r\n|\n/).reduce<string[]>((acc, raw) => {
    const l = raw.trimEnd();
    if (l.trim() === '') { acc.push(''); return acc; }
    const last = acc[acc.length - 1];
    if (last === undefined || last === '') acc.push(l); else acc[acc.length - 1] = `${last} ${l}`;
    return acc;
  }, []).filter(Boolean);
ok('normaliser: MUST-FAIL — the raw artefact renders label + body as ONE run-on paragraph',
  paras(RUNON)[0] === 'The accuracy claim The headline 94% accuracy should not be accepted.');
ok('normaliser: the normalised artefact renders the label as its own paragraph',
  paras(normaliseRevealArtefact(RUNON))[0] === 'The accuracy claim' &&
  paras(normaliseRevealArtefact(RUNON)).length === 4);
ok('normaliser: CRLF is handled (all 18 APM case model_answers are CRLF)',
  !normaliseRevealArtefact(RUNON).includes('\r'));
ok('normaliser: no content character is altered, reordered or dropped',
  contentLines(normaliseRevealArtefact(RUNON)).join(' ') === contentLines(RUNON).join(' '));
ok('normaliser: already-normalised prose is unchanged (idempotent)',
  normaliseRevealArtefact('A.\n\nB.') === 'A.\n\nB.' &&
  normaliseRevealArtefact(normaliseRevealArtefact(RUNON)) === normaliseRevealArtefact(RUNON));
// The structural exception. A blank line between table rows ENDS the table at the renderer and
// `renderTable` drops a sub-two-row table entirely, so blank-separating rows DELETES the table.
const TABLE = '**Step 1**\n| Year | WDA |\n|------|-----|\n| 1 | AUD 23.0m |\n| 2 | AUD 18.4m |\n**Total.**';
ok('normaliser: contiguous pipe rows KEEP their single newline (the table survives)',
  normaliseRevealArtefact(TABLE).includes('| Year | WDA |\n|------|-----|\n| 1 | AUD 23.0m |\n| 2 | AUD 18.4m |'));
ok('normaliser: the non-table lines around a table ARE blank-separated',
  normaliseRevealArtefact(TABLE).startsWith('**Step 1**\n\n| Year | WDA |') &&
  normaliseRevealArtefact(TABLE).endsWith('| 2 | AUD 18.4m |\n\n**Total.**'));
ok('normaliser: MUST-FAIL — a naive newline→blank-line replace would break the table',
  TABLE.replace(/\n/g, '\n\n') !== normaliseRevealArtefact(TABLE));
ok('normaliser: two tables the author SEPARATED are never merged into one',
  normaliseRevealArtefact('| a | b |\n| 1 | 2 |\n\n| c | d |\n| 3 | 4 |')
    === '| a | b |\n| 1 | 2 |\n\n| c | d |\n| 3 | 4 |');
ok('normaliser: an AFM answer that is already blank-separated round-trips unchanged',
  normaliseRevealArtefact(MODEL_ANSWER) === MODEL_ANSWER);
ok('normaliser: empty / whitespace-only input degrades to empty, never throws',
  normaliseRevealArtefact('') === '' && normaliseRevealArtefact('\r\n  \n\n') === '');

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
  endsWithLines(assembleAfmReveal('Prose.\n\n---\n\n**WORKED ANSWER**\n**1. Tax-', MODEL_ANSWER), MODEL_ANSWER));
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
ok('reveal footer: assembled reveal STILL ends with the model_answer lines (footer in wrapper)',
  endsWithLines(assembleAfmReveal(WRAPPER, MODEL_ANSWER), MODEL_ANSWER) &&
  assembleAfmReveal(WRAPPER, MODEL_ANSWER).includes('© Gradd'));

// ── (4c) reachedFrom — SOLVED reveal credits (no invented error), STRUGGLE diagnoses ──
// Bug fixed: the wrapper read stale diagnosis state and could tell a SOLVED student they made a
// figures-slip they didn't. reachedFrom='solved' → credit-not-correct; 'struggle' → prior behaviour.
// "Error-assertion language" = the correction vocabulary a solved student must never see.
const ERR_ASSERT = /misconception|gap they kept missing|name and correct|walked into|\bmistake\b|\berror\b|\bslip\b|got it wrong|correct the thinking/i;
const afmSolved = REVEAL_AFM_WRAPPER_SYSTEM_SOLVED + '\n' + buildRevealWrapperUserPrompt({
  contextLine: 'Context: X\n\n', question: 'Q', attempt: 'my attempt', diagnosis: 'STALE DIAGNOSIS — should be ignored',
  reframeLine: 'Authored misconception reframe (name this and correct the thinking):\nR\n\n', reachedFrom: 'solved',
});
const afmStruggle = REVEAL_AFM_WRAPPER_SYSTEM + '\n' + buildRevealWrapperUserPrompt({
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

// ── (6) Opener-divider guard — the self-assessment clause cannot become its own block ──
// THE SIGHTING, reproduced verbatim as the first case: a real teach turn rendered the
// self-assessment clause as a lone paragraph, then a `---`, then the diagnosis. That reads as
// "answer this, I'll wait", which the beat's own claim ceiling says it is not. The prompt now
// forbids the divider; this is the half that GUARANTEES it.
// P-G3 — every break mode is named, including the ones that would make this too aggressive.
const SIGHTED =
  'Before I say — which bit of that would you defend least: the claim that the division is ' +
  'destroying value, or the case for why the board should greenlight the expansion?\n\n---\n\n' +
  "You've nailed the floor: WACC > ROCE means economic profit is negative.";
const stripped = stripOpenerDivider(SIGHTED);
ok('divider: the sighted opener-then-rule shape loses its rule',
  !/^\s*-{3,}\s*$/m.test(stripped));
ok('divider: both halves survive — the clause and the diagnosis are still there',
  stripped.includes('defend least') && stripped.includes("You've nailed the floor"));
ok('divider: the two halves are rejoined as ONE paragraph break, not left with a hole',
  !/\n{3,}/.test(stripped));
ok('divider: *** and ___ are thematic breaks too',
  !stripOpenerDivider('Which bit is weakest?\n\n***\n\nThe gap is X.').includes('***') &&
  !stripOpenerDivider('Which bit is weakest?\n\n___\n\nThe gap is X.').includes('___'));

// ── The break modes that would make it DESTRUCTIVE ──
// A divider deep in a long answer is legitimate structure and must survive. This is the property
// that keeps the guard safe to apply, and it is why the caller also scopes it to one leg.
const DEEP = 'Line one.\nLine two.\nLine three.\nLine four.\n\n---\n\nA later section.';
ok('divider: a rule BELOW the third content line is untouched (legitimate structure)',
  stripOpenerDivider(DEEP) === DEEP);
ok('divider: only the FIRST rule goes, a second one stays',
  (stripOpenerDivider('Q?\n\n---\n\nBody.\n\n---\n\nMore.').match(/^\s*-{3,}\s*$/gm) ?? []).length === 1);
ok('divider: text with no rule at all is returned unchanged (idempotent)',
  stripOpenerDivider('Which bit is weakest? The gap is X.') === 'Which bit is weakest? The gap is X.');
ok('divider: running it twice changes nothing further',
  stripOpenerDivider(stripped) === stripped);
ok('divider: an em-dash sentence is not mistaken for a rule',
  stripOpenerDivider('Before I say — which bit?\n\nThe gap is X.') === 'Before I say — which bit?\n\nThe gap is X.');
ok('divider: a markdown table separator row is NOT a thematic break',
  stripOpenerDivider('| a | b |\n| --- | --- |\n| 1 | 2 |').includes('| --- | --- |'));

console.log(`\n${failures === 0 ? 'ALL PASS' : failures + ' FAILURE(S)'}`);
process.exit(failures === 0 ? 0 : 1);
